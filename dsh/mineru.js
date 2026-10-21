import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const execFileAsync = promisify(execFile)
const supported = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.html'])

function authRejected(error) {
  return /\b401\b|\b403\b|unauthori[sz]ed|token.{0,30}(expired|invalid|expire)|(?:expired|invalid).{0,30}token/iu.test(`${error?.stderr || ''} ${error?.message || ''}`)
}

/**
 * 接口是否"明确不接受这个模型参数"。
 *
 * 为什么只对这一类错误换模型：`vlm` 是默认（表格还原明显更好），但个别账号/版本会拒。
 * **文件本身解析失败不换模型重试**——那只会多花一次额度，结论还是失败。
 */
export function modelFallbackWorthy(error) {
  if (authRejected(error)) return false
  const detail = `${error?.stderr || ''} ${error?.message || ''}`
  return /\bmodel\b|vlm|not supported|unsupported|不支持|invalid (?:param|argument|option)/iu.test(detail)
}

function safeDetail(error, token = '') {
  return String(error?.stderr || error?.message || '')
    .replace(/token[:= ]+\S+/giu, 'token=[已隐藏]')
    .replace(token, token ? '[已隐藏]' : '')
    .slice(0, 300)
}

async function run(args, token = '', { bypassProxy = false } = {}) {
  const env = { ...process.env }
  if (token) env.MINERU_TOKEN = token
  else delete env.MINERU_TOKEN
  if (bypassProxy) {
    for (const key of ['HTTP_PROXY', 'http_proxy', 'HTTPS_PROXY', 'https_proxy', 'ALL_PROXY', 'all_proxy']) delete env[key]
  }
  return execFileAsync('mineru-open-api', args, { timeout: 300_000, maxBuffer: 16 * 1024 * 1024, windowsHide: true, env })
}

export async function extractWithMineru(bytes, extension, { token = '', tokenConfigured = false, model = 'vlm', runner = run } = {}) {
  if (!supported.has(extension)) throw new Error('MinerU 当前不支持此文件类型；可保留原件并手工录入。')
  if (bytes.byteLength > 200 * 1024 * 1024) throw new Error('单份资料超过 MinerU 支持的 200 MB 上限。')
  const useApi = Boolean(token || tokenConfigured)
  const tempRoot = await mkdtemp(join(tmpdir(), 'xyb-mineru-'))
  const filePath = join(tempRoot, `source${extension}`)
  try {
    await writeFile(filePath, bytes, { mode: 0o600 })
    const preferred = model === 'pipeline' ? 'pipeline' : 'vlm'
    const attempts = preferred === 'pipeline' ? ['pipeline'] : ['vlm', 'pipeline']
    let stdout = ''
    let selectedEngine = useApi ? `mineru-api-${preferred}` : 'mineru-flash'
    let fallbackMessage = ''
    if (useApi) {
      let settled = false
      for (const modelVersion of attempts) {
        const args = ['extract', filePath, '--model', modelVersion, '--format', 'md', '--ocr']
        try {
          try {
            ({ stdout } = await runner(args, token))
          } catch (error) {
            const transient = /\bEOF\b|connection reset|unexpected eof/iu.test(`${error?.stderr || ''} ${error?.message || ''}`)
            const hasProxy = ['HTTP_PROXY', 'http_proxy', 'HTTPS_PROXY', 'https_proxy', 'ALL_PROXY', 'all_proxy'].some((key) => Boolean(process.env[key]))
            if (authRejected(error) || !transient) throw error
            await delay(800)
            ;({ stdout } = await runner(args, token, { bypassProxy: hasProxy }))
          }
          selectedEngine = `mineru-api-${modelVersion}`
          if (modelVersion !== preferred) fallbackMessage = `当前账号不支持 ${preferred} 模型，已改用 ${modelVersion} 解析。表格还原效果可能下降，核对时留意串位。`
          settled = true
          break
        } catch (error) {
          if (authRejected(error)) {
            try { ({ stdout } = await runner(['flash-extract', filePath, '--ocr'])) } catch (flashError) {
              const detail = safeDetail(flashError, token).slice(0, 220)
              throw new Error(`内置 MinerU 公益 Token 可能已过期或失效；Flash 免费解析也未成功${detail ? `：${detail}` : ''}。可在 MinerU 申请新 Token 后到设置中替换。`)
            }
            selectedEngine = 'mineru-flash-fallback'
            fallbackMessage = '公益 API Token 已失效或过期，已切换到 MinerU Flash 免费解析。可申请新 Token 后在设置中替换。'
            settled = true
            break
          }
          // 只有"接口不接受这个模型"才换下一个模型，其余错误直接抛
          if (modelVersion === 'vlm' && modelFallbackWorthy(error)) continue
          throw error
        }
      }
      if (!settled) throw new Error('MinerU 解析未能完成')
    } else ({ stdout } = await runner(['flash-extract', filePath, '--ocr']))
    const markdown = String(stdout || '').trim()
    if (!markdown) throw new Error('MinerU 没有返回可读取的文本')
    return { markdown, engine: selectedEngine, ...(fallbackMessage ? { message: fallbackMessage } : {}) }
  } catch (error) {
    if (error?.code === 'ENOENT') throw new Error('没有找到 mineru-open-api。请安装 MinerU CLI，或先使用 TXT、MD、CSV 本地解析。')
    if (error?.killed || error?.code === 'ETIMEDOUT') throw new Error('MinerU 解析超时；原件仍保存在本机，可稍后重试。')
    const detail = safeDetail(error, token)
    throw new Error(`MinerU 解析失败${detail ? `：${detail}` : ''}`)
  } finally { await rm(tempRoot, { recursive: true, force: true }) }
}
