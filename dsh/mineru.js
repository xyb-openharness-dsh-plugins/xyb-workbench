/**
 * MinerU 云端解析客户端（小胰宝 · 解析接入层）。
 *
 * 2026-10-22 从「本机 CLI 包装」改为「HTTP API v4」，原因是实测出来的：
 * CLI 靠 `execFile('mineru-open-api')` 按 PATH 找二进制，而桌面端 GUI 进程的 PATH
 * 通常只有 `/usr/bin:/bin:/usr/sbin:/sbin`（实测 ENOENT）；市场分发的用户机器上更是
 * 根本没有这个二进制。也就是说抽取层修得再对，解析这一步起不来，用户还是看不到候选。
 * HTTP 只需要网络，不需要用户机器上有任何额外程序。
 *
 * 协议四步（https://mineru.net/doc/docs）：
 *   ① `POST /file-urls/batch` 申请上传链接
 *   ② `PUT <file_urls[0]>` 上传原件（**不设 Content-Type**，设了会被拒）
 *   ③ 轮询 `GET /extract-results/batch/{id}` 到 done/failed
 *   ④ 下载 `full_zip_url`，从 zip 里取 `full.md`
 *
 * 三条边界：
 * 1. **Token 不进日志、不进错误消息**，错误里只给状态码；
 * 2. **不猜解析结果**：拿不到 `full.md` 就是失败，不返回半份数据当成功；
 * 3. **文件本身失败不换模型重试**——那只是多花一次额度，结论还是失败。
 *    只有接口明确拒绝模型参数时才换另一个模型。
 */
import { readZip } from '../lib/zip.js'

export const MINERU_BASE_URL = 'https://mineru.net/api/v4'
export const MINERU_MODEL_DEFAULT = 'pipeline'
export const MINERU_MODEL_FALLBACK = 'vlm'
/**
 * Token 申请 / 重置页。
 *
 * 这个地址同时是"这是一类 Token 问题"的约定标记：客户端只认错误消息里有没有它
 * （见 lib/client.js 的 mineruAlert），不另造一套状态码，避免前后端各猜一套。
 */
export const MINERU_TOKEN_URL = 'https://mineru.net/apiManage/token'

// 2026-10-22 实测：v4 批量接口拒收 HTML（`model_version 'vlm'/'pipeline' cannot process html files`，-10002），
// 所以白名单里不再放 `.html`。留着它等于承诺一个一定失败的入口。
const supported = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'])
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export class MineruError extends Error {
  constructor(code, message, detail = null) {
    super(message)
    this.name = 'MineruError'
    this.code = code
    this.detail = detail
  }
}

/**
 * 接口是否"明确不接受这个模型参数"。
 *
 * 为什么只对这一类错误换模型：默认 `pipeline`（2026-10-22 跨工作台统一口径），个别账号/版本会拒；
 * 压平表格用 `vlm` 还原更稳，调用方可显式传 `model: 'vlm'`。
 * **文件本身解析失败不换模型重试**——那只会多花一次额度，结论还是失败。
 */
export function modelFallbackWorthy(error) {
  if (!error) return false
  if (!['API_ERROR', 'BAD_INPUT'].includes(error.code)) return false
  return /model|模型|version|版本|参数|param|unsupported|not supported|不支持|invalid/iu.test(String(error.message ?? ''))
}

function authRejected(error) {
  return error?.code === 'UNAUTHORIZED'
}

/**
 * 系统是否配了代理。
 *
 * Node 内置 `fetch` **不走 `HTTP_PROXY`/`HTTPS_PROXY`**（这点和 curl/CLI 不同）。
 * 所以代理环境下网络失败时，要直接说清是代理没被支持，而不是丢一句"无法连接"——
 * 那会让人去查网络、查 Token，查半天都不是原因。
 */
function proxyEnvHint() {
  const keys = ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy']
  const hit = keys.find((key) => String(process.env[key] || '').trim())
  return hit ? `系统设置了 ${hit}，当前版本的内置请求不走系统代理；可先关闭代理或改用直连网络重试。` : ''
}

/** 只用于错误提示，不落库、不进日志。 */
function safeDetail(error) {
  return String(error?.message || '').slice(0, 260)
}

async function requestJson(fetchImpl, url, { method = 'GET', token, tokenSource = '', body = null, timeoutMs = 60000 } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== null) headers['Content-Type'] = 'application/json'

  let response
  try {
    response = await fetchImpl(url, {
      method,
      headers,
      body: body === null ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw new MineruError('TIMEOUT', 'MinerU 请求超时；原件仍保存在本机，可稍后重试。', { url })
    }
    const hint = proxyEnvHint()
    throw new MineruError('NETWORK', `无法连接 MinerU：${error?.message || error}${hint ? `（${hint}）` : ''}`, { url })
  }

  if (response.status === 401 || response.status === 403) {
    // 把 MinerU 自己的报文读出来：`user token expired` 和 `invalid token` 是两种处理，
    // 只报“401”会让用户以为是网络或代码问题（实际是换了 Token 没生效）。
    let apiMessage = ''
    try {
      const text = await response.text()
      apiMessage = String(JSON.parse(text)?.msg || '').trim()
    } catch { /* 报文不是 JSON 就只按状态码说 */ }
    const reason = /expired|过期/iu.test(apiMessage)
      ? 'Token 已过期'
      : /invalid|无效/iu.test(apiMessage) ? 'Token 无效' : apiMessage
    const from = tokenSource === 'secret-file'
      ? '本次使用的是你在设置里保存的 Token'
      : tokenSource === 'environment'
        ? '本次使用的是环境变量 MINERU_TOKEN（它会盖过设置里未保存的值；如已换新 Token 仍报错，检查是否存在这条环境变量）'
        : tokenSource === 'bundled-community'
          ? '本次使用的是随包公益 Token'
          : ''
    throw new MineruError(
      'UNAUTHORIZED',
      `MinerU 拒绝了这个 Token（HTTP ${response.status}${reason ? `，${reason}` : ''}）。${from}可在设置中替换 Token，或到 ${MINERU_TOKEN_URL} 申请 / 重置。`,
      { status: response.status, apiMessage },
    )
  }

  let json = null
  try {
    json = await response.json()
  } catch {
    throw new MineruError('BAD_RESPONSE', `MinerU 返回的不是 JSON（HTTP ${response.status}）`, { url })
  }
  if (json?.code !== 0) {
    const message = String(json?.msg ?? '未知错误')
    const code = /token|auth|权限|登录/iu.test(message) ? 'UNAUTHORIZED' : 'API_ERROR'
    throw new MineruError(code, `MinerU 接口报错（code=${json?.code}）：${message}`, { apiCode: json?.code })
  }
  return json
}

/** ① 申请上传链接；返回 batchId 与 PUT 地址。 */
async function createUploadBatch(fetchImpl, baseUrl, token, tokenSource, { name, modelVersion, language, timeoutMs }) {
  const body = { enable_formula: true, enable_table: true, language, files: [{ name }] }
  if (modelVersion) body.model_version = modelVersion
  const json = await requestJson(fetchImpl, `${baseUrl}/file-urls/batch`, { method: 'POST', token, tokenSource, body, timeoutMs })
  const batchId = json?.data?.batch_id
  const urls = json?.data?.file_urls
  if (!batchId || !Array.isArray(urls) || urls.length !== 1) {
    throw new MineruError('BAD_RESPONSE', '申请上传链接的返回不完整（缺 batch_id 或 file_urls 数量对不上）')
  }
  return { batchId, uploadUrl: urls[0] }
}

/** ② 上传原件。MinerU 要求不设 Content-Type，所以这里只带 Authorization。 */
async function uploadFile(fetchImpl, uploadUrl, bytes, timeoutMs) {
  let response
  try {
    response = await fetchImpl(uploadUrl, { method: 'PUT', headers: {}, body: bytes, signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    throw new MineruError('UPLOAD_FAILED', `上传原件失败：${error?.message || error}`)
  }
  if (!response.ok) throw new MineruError('UPLOAD_FAILED', `上传原件失败：HTTP ${response.status}`)
}

/** ③ 轮询到结束。 */
async function waitForBatch(fetchImpl, baseUrl, token, tokenSource, batchId, { intervalMs, timeoutMs }) {
  const startedAt = Date.now()
  for (;;) {
    const json = await requestJson(fetchImpl, `${baseUrl}/extract-results/batch/${batchId}`, { token, tokenSource, timeoutMs: 30000 })
    const results = json?.data?.extract_result
    if (!Array.isArray(results)) throw new MineruError('BAD_RESPONSE', '批次结果里没有 extract_result 数组')
    const pending = results.filter((r) => r.state !== 'done' && r.state !== 'failed')
    if (pending.length === 0) return results[0]
    if (Date.now() - startedAt > timeoutMs) {
      throw new MineruError(
        'TIMEOUT',
        `等了 ${Math.round(timeoutMs / 1000)} 秒还没解析完（仍在 ${[...new Set(pending.map((p) => p.state))].join('/')}）`,
      )
    }
    await sleep(intervalMs)
  }
}

/** ④ 下载并取出 full.md。 */
async function downloadMarkdown(fetchImpl, zipUrl, timeoutMs) {
  let response
  try {
    response = await fetchImpl(zipUrl, { signal: AbortSignal.timeout(timeoutMs) })
  } catch (error) {
    throw new MineruError('NETWORK', `下载解析结果失败：${error?.message || error}`)
  }
  if (!response.ok) throw new MineruError('DOWNLOAD_FAILED', `下载解析结果失败：HTTP ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  let zip
  try {
    zip = readZip(buffer)
  } catch (error) {
    throw new MineruError('BAD_ZIP', `解析结果不是可读的 ZIP：${error.message}`)
  }
  if (!zip.has('full.md')) {
    throw new MineruError('NO_MARKDOWN', `解析结果里没有 full.md（实际条目：${zip.names.slice(0, 8).join(', ')}）`)
  }
  return zip.text('full.md')
}

/**
 * 解析一份文件，返回 markdown 与引擎标识。
 *
 * @param {Buffer|Uint8Array} bytes
 * @param {string} extension 含点，如 `.pdf`
 * @param {object} opts
 * @param {string} opts.token     MinerU Token（不传就抛，不走匿名请求）
 * @param {string} [opts.model]   `pipeline`（默认）或 `vlm`
 * @param {Function} [opts.fetchImpl] 注入用（单测不联网）
 * @returns {Promise<{markdown: string, engine: string, message?: string}>}
 */
export async function extractWithMineru(bytes, extension, {
  token = '',
  tokenSource = '',
  model = MINERU_MODEL_DEFAULT,
  fetchImpl = null,
  baseUrl = MINERU_BASE_URL,
  language = 'ch',
  intervalMs = 3000,
  timeoutMs = 300000,
  requestTimeoutMs = 60000,
} = {}) {
  if (!supported.has(extension)) throw new Error('MinerU 当前不支持此文件类型；可保留原件并手工录入。')
  if (!bytes || bytes.byteLength === 0) throw new Error('文件内容为空，不提交解析。')
  if (bytes.byteLength > 200 * 1024 * 1024) throw new Error('单份资料超过 MinerU 支持的 200 MB 上限。')
  if (!String(token || '').trim()) {
    throw new Error(`没有可用的 MinerU Token：请在设置中填写，或到 ${MINERU_TOKEN_URL} 申请后重试。`)
  }

  const useFetch = fetchImpl ?? globalThis.fetch
  const entry = String(token).trim()
  const preferred = model === MINERU_MODEL_FALLBACK ? MINERU_MODEL_FALLBACK : MINERU_MODEL_DEFAULT
  const attempts = preferred === MINERU_MODEL_FALLBACK ? [MINERU_MODEL_FALLBACK] : [MINERU_MODEL_DEFAULT, MINERU_MODEL_FALLBACK]

  let lastError = null
  for (const modelVersion of attempts) {
    try {
      const name = `source${extension}`
      const { batchId, uploadUrl } = await createUploadBatch(useFetch, baseUrl, entry, tokenSource, { name, modelVersion, language, timeoutMs: requestTimeoutMs })
      await uploadFile(useFetch, uploadUrl, bytes, Math.max(requestTimeoutMs, 300000))
      const result = await waitForBatch(useFetch, baseUrl, entry, tokenSource, batchId, { intervalMs, timeoutMs })

      if (result.state !== 'done') {
        // 文件本身失败：不换模型重试，直接报
        throw new MineruError('TASK_FAILED', `MinerU 解析失败：${result.err_msg || result.state}`, { batchId, state: result.state })
      }
      if (!result.full_zip_url) throw new MineruError('BAD_RESPONSE', '解析完成但没有返回 full_zip_url', { batchId })

      const markdown = String(await downloadMarkdown(useFetch, result.full_zip_url, Math.max(requestTimeoutMs, 120000)) || '').trim()
      if (!markdown) throw new MineruError('NO_MARKDOWN', 'MinerU 没有返回可读取的文本')

      const engine = `mineru-api-${modelVersion}`
      const message = modelVersion !== preferred
        ? `当前账号不支持 ${preferred} 模型，已改用 ${modelVersion} 解析。结果排版可能不同，核对时留意串位。`
        : ''
      return { markdown, engine, ...(message ? { message } : {}) }
    } catch (error) {
      lastError = error
      if (authRejected(error)) throw error
      // 只有"接口不接受这个模型"才换下一个模型，其余错误直接抛
      if (modelVersion === MINERU_MODEL_DEFAULT && modelFallbackWorthy(error)) continue
      throw error
    }
  }
  throw lastError ?? new MineruError('UNKNOWN', 'MinerU 解析未能完成')
}

/** 统一成用户能看懂的一句话；不再出现 ENOENT 这类机器痕迹。 */
export function describeMineruFailure(error) {
  if (error instanceof MineruError) {
    if (error.code === 'UNAUTHORIZED') return error.message
    if (error.code === 'TIMEOUT') return 'MinerU 解析超时；原件仍保存在本机，可稍后重试。'
    return `MinerU 解析失败：${safeDetail(error)}`
  }
  return `MinerU 解析失败：${error?.message || error}`
}
