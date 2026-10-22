import { access, chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { communityMineruToken } from './community-token.js'

const settingsFileName = 'xyb-workbench-settings.json'

function settingsFile(serviceRoot) {
  if (!serviceRoot) throw new Error('工作台服务目录未配置')
  return join(resolve(serviceRoot), settingsFileName)
}

export async function readSettings(serviceRoot) {
  try {
    const parsed = JSON.parse(await readFile(settingsFile(serviceRoot), 'utf8'))
    return {
      dataRoot: typeof parsed.dataRoot === 'string' ? parsed.dataRoot : '',
      parseMode: parsed.parseMode === 'local' ? 'local' : 'local_mineru',
      // 用户显式选过的模型要读回来（此前这里写死，设置项存了也不生效）
      // 默认 pipeline（2026-10-22 跨工作台统一口径）
      mineruModel: ['vlm', 'pipeline'].includes(parsed.mineruModel) ? parsed.mineruModel : 'pipeline',
      mineruCloudConsent: parsed.mineruCloudConsent === true,
    }
  } catch (error) {
    if (error && error.code === 'ENOENT') return { dataRoot: '', parseMode: 'local_mineru', mineruModel: 'pipeline', mineruCloudConsent: false }
    throw new Error('无法读取工作台设置')
  }
}

export async function setDataRoot(serviceRoot, selectedRoot) {
  const dataRoot = resolve(String(selectedRoot || '').trim())
  if (!dataRoot || dataRoot === '/') throw new Error('请选择一个具体的资料文件夹')
  try { await access(dataRoot) } catch { throw new Error('所选资料文件夹不可访问') }
  const target = settingsFile(serviceRoot)
  await mkdir(dirname(target), { recursive: true })
  const temporary = `${target}.${randomUUID()}.tmp`
  const current = await readSettings(serviceRoot)
  await writeFile(temporary, JSON.stringify({ ...current, dataRoot }, null, 2), { mode: 0o600 })
  await rename(temporary, target)
  return { dataRoot }
}

async function writeSettings(serviceRoot, patch) {
  const target = settingsFile(serviceRoot)
  await mkdir(dirname(target), { recursive: true })
  const current = await readSettings(serviceRoot)
  const temporary = `${target}.${randomUUID()}.tmp`
  await writeFile(temporary, JSON.stringify({ ...current, ...patch }, null, 2), { mode: 0o600 })
  await rename(temporary, target)
  return await readSettings(serviceRoot)
}

/**
 * 唯一的本地密钥文件：仓库内的 `.secrets/mineru.json`（`{"token":"sk-..."}`，mode 600，已在 .gitignore）。
 * 2026-10-22 统一口径：**不再读/写 `~/.mineru/config.yaml`**——那是 CLI 时代的路径，
 * 现在本机只认这一个文件；环境变量 `MINERU_TOKEN` 只作临时覆盖。
 */
export function mineruSecretFile() {
  return fileURLToPath(new URL('../.secrets/mineru.json', import.meta.url))
}

async function readSecretToken(file = mineruSecretFile()) {
  try {
    const parsed = JSON.parse(await readFile(file, 'utf8'))
    const token = typeof parsed?.token === 'string' ? parsed.token.trim() : ''
    return token
  } catch (error) {
    if (error?.code === 'ENOENT') return ''
    if (error instanceof SyntaxError) throw new Error('.secrets/mineru.json 不是合法 JSON（应为 {"token":"sk-..."}）')
    throw new Error('无法读取 .secrets/mineru.json')
  }
}

async function writeSecretToken(token, target = mineruSecretFile()) {
  await mkdir(dirname(target), { recursive: true })
  let current = {}
  try { current = JSON.parse(await readFile(target, 'utf8')) } catch (error) { if (error?.code !== 'ENOENT') throw new Error('无法读取 .secrets/mineru.json') }
  const temporary = `${target}.${randomUUID()}.tmp`
  await writeFile(temporary, `${JSON.stringify({ ...current, token }, null, 2)}\n`, { mode: 0o600 })
  await chmod(temporary, 0o600)
  await rename(temporary, target)
}

/**
 * Token 解析优先级：**`.secrets/mineru.json`（唯一持久来源）> 环境变量（临时覆盖）> 随包公益 Token**。
 *
 * 2026-10-22 统一口径：设置界面保存的 Token 就写进 `.secrets/mineru.json`；
 * 不再读写 `~/.mineru/config.yaml`。环境变量仍可临时盖过文件（用于排查），
 * 但用户换新 Token 时优先看文件——所以界面要如实显示来源，避免"换了也不生效"的困惑。
 */
export async function resolveMineruToken({ tokenFromEnv = process.env.MINERU_TOKEN, tokenFile = mineruSecretFile() } = {}) {
  const fileToken = await readSecretToken(tokenFile)
  if (fileToken) return { token: fileToken, source: 'secret-file' }
  const envToken = String(tokenFromEnv || '').trim()
  if (envToken) return { token: envToken, source: 'environment' }
  return communityMineruToken ? { token: communityMineruToken, source: 'bundled-community' } : { token: '', source: '' }
}

export async function readWorkbenchSettings(serviceRoot, options = {}) {
  const settings = await readSettings(serviceRoot)
  const token = await resolveMineruToken(options)
  return { ...settings, mineruTokenConfigured: Boolean(token.token), mineruTokenSource: token.source }
}

export async function saveWorkbenchSettings(serviceRoot, input, { tokenFile = mineruSecretFile() } = {}) {
  const parseMode = input?.parseMode === 'local' ? 'local' : 'local_mineru'
  const mineruModel = ['vlm', 'pipeline'].includes(input?.mineruModel) ? input.mineruModel : 'pipeline'
  const mineruCloudConsent = input?.mineruCloudConsent === true
  const token = String(input?.mineruToken || '').trim()
  if (parseMode === 'local_mineru' && !mineruCloudConsent) throw new Error('启用 MinerU 前请先确认云端解析说明')
  if (token && (!/^[A-Za-z0-9._-]{8,1024}$/.test(token))) throw new Error('MinerU Token 格式不正确')
  if (token) await writeSecretToken(token, tokenFile)
  const settings = await writeSettings(serviceRoot, { parseMode, mineruModel, mineruCloudConsent })
  const saved = await readWorkbenchSettings(serviceRoot, { tokenFile })
  return { ...settings, mineruTokenConfigured: saved.mineruTokenConfigured, mineruTokenSource: saved.mineruTokenSource }
}
