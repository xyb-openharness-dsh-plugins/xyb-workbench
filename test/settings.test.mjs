import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readSettings, setDataRoot } from '../dsh/settings.js'

test('only persists an accessible data root selected by the user', async () => {
  const serviceRoot = await mkdtemp(join(tmpdir(), 'xyb-service-'))
  const dataRoot = join(serviceRoot, 'patient-data')
  await mkdir(dataRoot)
  assert.deepEqual(await readSettings(serviceRoot), { dataRoot: '' })
  assert.deepEqual(await setDataRoot(serviceRoot, dataRoot), { dataRoot })
  assert.deepEqual(await readSettings(serviceRoot), { dataRoot })
  await assert.rejects(() => setDataRoot(serviceRoot, join(serviceRoot, 'missing')), /不可访问/)
})
