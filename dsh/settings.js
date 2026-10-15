import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

const settingsFileName = 'xyb-workbench-settings.json'

function settingsFile(serviceRoot) {
  if (!serviceRoot) throw new Error('工作台服务目录未配置')
  return join(resolve(serviceRoot), settingsFileName)
}

export async function readSettings(serviceRoot) {
  try {
    const parsed = JSON.parse(await readFile(settingsFile(serviceRoot), 'utf8'))
    return { dataRoot: typeof parsed.dataRoot === 'string' ? parsed.dataRoot : '' }
  } catch (error) {
    if (error && error.code === 'ENOENT') return { dataRoot: '' }
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
  await writeFile(temporary, JSON.stringify({ dataRoot }, null, 2), { mode: 0o600 })
  await rename(temporary, target)
  return { dataRoot }
}
