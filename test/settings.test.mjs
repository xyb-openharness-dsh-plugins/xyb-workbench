import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readSettings, readWorkbenchSettings, resolveMineruToken, saveWorkbenchSettings, setDataRoot } from '../dsh/settings.js'

test('only persists an accessible data root selected by the user', async () => {
  const serviceRoot = await mkdtemp(join(tmpdir(), 'xyb-service-'))
  const dataRoot = join(serviceRoot, 'patient-data')
  await mkdir(dataRoot)
  assert.deepEqual(await readSettings(serviceRoot), { dataRoot: '', parseMode: 'local_mineru', mineruModel: 'pipeline', mineruCloudConsent: false })
  assert.deepEqual(await setDataRoot(serviceRoot, dataRoot), { dataRoot })
  assert.deepEqual(await readSettings(serviceRoot), { dataRoot, parseMode: 'local_mineru', mineruModel: 'pipeline', mineruCloudConsent: false })
  await assert.rejects(() => setDataRoot(serviceRoot, join(serviceRoot, 'missing')), /不可访问/)
})

test('Token 写进 .secrets/mineru.json（唯一密钥文件），接口不回显原文', async () => {
  const serviceRoot = await mkdtemp(join(tmpdir(), 'xyb-service-settings-'))
  const tokenFile = join(serviceRoot, '.secrets', 'mineru.json')
  const saved = await saveWorkbenchSettings(serviceRoot, { parseMode: 'local_mineru', mineruCloudConsent: true, mineruModel: 'pipeline', mineruToken: 'demo-token_12345678' }, { tokenFile })
  assert.equal(saved.mineruTokenConfigured, true)
  assert.equal(saved.mineruModel, 'pipeline', '默认 pipeline（2026-10-22 跨工作台统一口径）')
  assert.equal(JSON.stringify(saved).includes('demo-token_12345678'), false)
  const secret = JSON.parse(await readFile(tokenFile, 'utf8'))
  assert.equal(secret.token, 'demo-token_12345678')
  const info = await stat(tokenFile)
  assert.equal(info.mode & 0o777, 0o600)
  // 不再往 ~/.mineru/config.yaml 写任何东西
  await assert.rejects(() => stat(join(serviceRoot, '.mineru', 'config.yaml')), /ENOENT/u)
  await assert.rejects(() => saveWorkbenchSettings(serviceRoot, { parseMode: 'local_mineru', mineruCloudConsent: false }, { tokenFile }), /确认云端解析/u)
  // 显式选 vlm 要尊重（压平表格用 vlm 还原更稳）
  const pinned = await saveWorkbenchSettings(serviceRoot, { parseMode: 'local_mineru', mineruCloudConsent: true, mineruModel: 'vlm' }, { tokenFile })
  assert.equal(pinned.mineruModel, 'vlm')
  // 非法值回落到默认
  const fallback = await saveWorkbenchSettings(serviceRoot, { parseMode: 'local_mineru', mineruCloudConsent: true, mineruModel: 'turbo' }, { tokenFile })
  assert.equal(fallback.mineruModel, 'pipeline')
})

test('没有本地覆盖时用随包公益 Token', async () => {
  const serviceRoot = await mkdtemp(join(tmpdir(), 'xyb-service-bundled-token-'))
  const tokenFile = join(serviceRoot, 'missing-secrets', 'mineru.json')
  const settings = await readWorkbenchSettings(serviceRoot, { tokenFile, tokenFromEnv: '' })
  assert.equal(settings.mineruTokenConfigured, true)
  assert.equal(settings.mineruTokenSource, 'bundled-community')
  assert.equal(JSON.stringify(settings).includes('sk-'), false)
  const resolved = await resolveMineruToken({ tokenFile, tokenFromEnv: '' })
  assert.equal(resolved.source, 'bundled-community')
  assert.ok(resolved.token.startsWith('sk-'))
})

test('.secrets/mineru.json 优先于环境变量；没有文件才轮到 env', async () => {
  const serviceRoot = await mkdtemp(join(tmpdir(), 'xyb-service-token-priority-'))
  const tokenFile = join(serviceRoot, '.secrets', 'mineru.json')
  await mkdir(join(serviceRoot, '.secrets'), { recursive: true })
  await writeFile(tokenFile, JSON.stringify({ token: 'sk-savedinui-0001' }), { mode: 0o600 })

  // 环境变量里是一把失效的旧 Key —— 这正是用户遇到 401 的真实场景
  const resolved = await resolveMineruToken({ tokenFile, tokenFromEnv: 'sk-stale-env-9999' })
  assert.equal(resolved.source, 'secret-file')
  assert.equal(resolved.token, 'sk-savedinui-0001')

  // 没有密钥文件时才轮到环境变量
  const fromEnv = await resolveMineruToken({ tokenFile: join(serviceRoot, 'nope', 'mineru.json'), tokenFromEnv: 'sk-env-only-0002' })
  assert.equal(fromEnv.source, 'environment')
  assert.equal(fromEnv.token, 'sk-env-only-0002')
})

test('保存后返回 Token 来源，界面才能显示"当前生效"是哪一把', async () => {
  const serviceRoot = await mkdtemp(join(tmpdir(), 'xyb-service-token-source-'))
  const tokenFile = join(serviceRoot, '.secrets', 'mineru.json')
  const saved = await saveWorkbenchSettings(
    serviceRoot,
    { parseMode: 'local_mineru', mineruCloudConsent: true, mineruToken: 'sk-bran-0003' },
    { tokenFile },
  )
  assert.equal(saved.mineruTokenConfigured, true)
  assert.equal(saved.mineruTokenSource, 'secret-file')
  assert.equal(JSON.stringify(saved).includes('sk-bran-0003'), false)
})

