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

export async function extractWithMineru(bytes, extension, { token = '', tokenConfigured = false, model = 'pipeline', runner = run } = {}) {
  if (!supported.has(extension)) throw new Error('MinerU 当前不支持此文件类型；可保留原件并手工录入。')
  if (bytes.byteLength > 200 * 1024 * 1024) throw new Error('单份资料超过 MinerU 支持的 200 MB 上限。')
  const useApi = Boolean(token || tokenConfigured)
  const tempRoot = await mkdtemp(join(tmpdir(), 'xyb-mineru-'))
  const filePath = join(tempRoot, `source${extension}`)
  try {
    await writeFile(filePath, bytes, { mode: 0o600 })
    const args = useApi
      ? ['extract', filePath, '--model', model === 'vlm' ? 'vlm' : 'pipeline', '--format', 'md', '--ocr']
      : ['flash-extract', filePath, '--ocr']
    let stdout = ''
    let selectedEngine = useApi ? `mineru-api-${model === 'vlm' ? 'vlm' : 'pipeline'}` : 'mineru-flash'
    let fallbackMessage = ''
    if (useApi) {
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
      } catch (error) {
        if (!authRejected(error)) throw error
        try { ({ stdout } = await runner(['flash-extract', filePath, '--ocr'])) } catch (flashError) {
          const detail = safeDetail(flashError, token).slice(0, 220)
          throw new Error(`内置 MinerU 公益 Token 可能已过期或失效；Flash 免费解析也未成功${detail ? `：${detail}` : ''}。可在 MinerU 申请新 Token 后到设置中替换。`)
        }
        selectedEngine = 'mineru-flash-fallback'
        fallbackMessage = '公益 API Token 已失效或过期，已切换到 MinerU Flash 免费解析。可申请新 Token 后在设置中替换。'
      }
    } else ({ stdout } = await runner(args))
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
