import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readSettings, readWorkbenchSettings, resolveMineruToken, saveWorkbenchSettings, setDataRoot } from '../dsh/settings.js'

test('only persists an accessible data root selected by the user', async () => {
  const serviceRoot = await mkdtemp(join(tmpdir(), 'xyb-service-'))
  const dataRoot = join(serviceRoot, 'patient-data')
  await mkdir(dataRoot)
  assert.deepEqual(await readSettings(serviceRoot), { dataRoot: '', parseMode: 'local_mineru', mineruModel: 'vlm', mineruCloudConsent: false })
  assert.deepEqual(await setDataRoot(serviceRoot, dataRoot), { dataRoot })
  assert.deepEqual(await readSettings(serviceRoot), { dataRoot, parseMode: 'local_mineru', mineruModel: 'vlm', mineruCloudConsent: false })
  await assert.rejects(() => setDataRoot(serviceRoot, join(serviceRoot, 'missing')), /不可访问/)
})

test('stores MinerU consent and token locally without returning the secret', async () => {
  const serviceRoot = await mkdtemp(join(tmpdir(), 'xyb-service-settings-'))
  const userHome = join(serviceRoot, 'mock-home')
  await mkdir(userHome)
  const saved = await saveWorkbenchSettings(serviceRoot, { parseMode: 'local_mineru', mineruCloudConsent: true, mineruModel: 'vlm', mineruToken: 'demo-token_12345678' }, { userHome })
  assert.equal(saved.mineruTokenConfigured, true)
  assert.equal(saved.mineruModel, 'vlm', '默认用 vlm：它能把空格分列的表格还原成多列，pipeline 会把整表压成一格（见 docs/design/EXTRACTION-SPEC.md）')
  assert.equal(JSON.stringify(saved).includes('demo-token_12345678'), false)
  const config = await readFile(join(userHome, '.mineru', 'config.yaml'), 'utf8')
  assert.match(config, /^token: demo-token_12345678$/mu)
  const info = await stat(join(userHome, '.mineru', 'config.yaml'))
  assert.equal(info.mode & 0o777, 0o600)
  await assert.rejects(() => saveWorkbenchSettings(serviceRoot, { parseMode: 'local_mineru', mineruCloudConsent: false }, { userHome }), /确认云端解析/u)
  // 用户显式选 pipeline 时要尊重（贴原文、不做版式推断）
  const pinned = await saveWorkbenchSettings(serviceRoot, { parseMode: 'local_mineru', mineruCloudConsent: true, mineruModel: 'pipeline' }, { userHome })
  assert.equal(pinned.mineruModel, 'pipeline')
  // 非法值回落到默认
  const fallback = await saveWorkbenchSettings(serviceRoot, { parseMode: 'local_mineru', mineruCloudConsent: true, mineruModel: 'turbo' }, { userHome })
  assert.equal(fallback.mineruModel, 'vlm')
})

test('uses the bundled community MinerU credential when no local override exists', async () => {
  const serviceRoot = await mkdtemp(join(tmpdir(), 'xyb-service-bundled-token-'))
  const userHome = join(serviceRoot, 'empty-home')
  await mkdir(userHome)
  const settings = await readWorkbenchSettings(serviceRoot, { userHome, tokenFromEnv: '' })
  assert.equal(settings.mineruTokenConfigured, true)
  assert.equal(settings.mineruTokenSource, 'bundled-community')
  assert.equal(JSON.stringify(settings).includes('sk-'), false)
  const resolved = await resolveMineruToken({ userHome, tokenFromEnv: '' })
  assert.equal(resolved.source, 'bundled-community')
  assert.ok(resolved.token.startsWith('sk-'))
})
