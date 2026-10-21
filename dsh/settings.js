import { access, chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
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
      mineruModel: ['vlm', 'pipeline'].includes(parsed.mineruModel) ? parsed.mineruModel : 'vlm',
      mineruCloudConsent: parsed.mineruCloudConsent === true,
    }
  } catch (error) {
    if (error && error.code === 'ENOENT') return { dataRoot: '', parseMode: 'local_mineru', mineruModel: 'vlm', mineruCloudConsent: false }
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

function mineruConfigFile(userHome) { return join(userHome, '.mineru', 'config.yaml') }

export async function resolveMineruToken({ userHome = homedir(), tokenFromEnv = process.env.MINERU_TOKEN } = {}) {
  const envToken = String(tokenFromEnv || '').trim()
  if (envToken) return { token: envToken, source: 'environment' }
  try {
    const text = await readFile(mineruConfigFile(userHome), 'utf8')
    const match = text.match(/^token:\s*["']?([^\s"']+)["']?\s*$/m)
    if (match?.[1]) return { token: match[1], source: 'config-file' }
  } catch (error) { if (error?.code !== 'ENOENT') throw new Error('无法读取 MinerU 配置') }
  return communityMineruToken ? { token: communityMineruToken, source: 'bundled-community' } : { token: '', source: '' }
}

export async function readWorkbenchSettings(serviceRoot, options = {}) {
  const { userHome = homedir() } = options
  const settings = await readSettings(serviceRoot)
  const token = await resolveMineruToken(options)
  return { ...settings, mineruTokenConfigured: Boolean(token.token), mineruTokenSource: token.source }
}

export async function saveWorkbenchSettings(serviceRoot, input, { userHome = homedir() } = {}) {
  const parseMode = input?.parseMode === 'local' ? 'local' : 'local_mineru'
  const mineruModel = ['vlm', 'pipeline'].includes(input?.mineruModel) ? input.mineruModel : 'vlm'
  const mineruCloudConsent = input?.mineruCloudConsent === true
  const token = String(input?.mineruToken || '').trim()
  if (parseMode === 'local_mineru' && !mineruCloudConsent) throw new Error('启用 MinerU 前请先确认云端解析说明')
  if (token && (!/^[A-Za-z0-9._-]{8,1024}$/.test(token))) throw new Error('MinerU Token 格式不正确')
  if (token) {
    const configPath = mineruConfigFile(userHome)
    await mkdir(dirname(configPath), { recursive: true })
    let original = ''
    try { original = await readFile(configPath, 'utf8') } catch (error) { if (error?.code !== 'ENOENT') throw new Error('无法读取 MinerU 配置') }
    const lines = original.split(/\r?\n/).filter((line) => !/^\s*token\s*:/u.test(line))
    while (lines.length && !lines.at(-1)) lines.pop()
    lines.push(`token: ${token}`)
    const temporary = `${configPath}.${randomUUID()}.tmp`
    await writeFile(temporary, `${lines.join('\n')}\n`, { mode: 0o600 })
    await chmod(temporary, 0o600)
    await rename(temporary, configPath)
  }
  const settings = await writeSettings(serviceRoot, { parseMode, mineruModel, mineruCloudConsent })
  const saved = await readWorkbenchSettings(serviceRoot, { userHome })
  return { ...settings, mineruTokenConfigured: saved.mineruTokenConfigured, mineruTokenSource: saved.mineruTokenSource }
}
