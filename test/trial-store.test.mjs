import test from 'node:test'
import assert from 'node:assert/strict'
import { searchTrials, trialMetadata } from '../dsh/trial-store.js'

test('searches the bundled pancreatic trial snapshot offline', () => {
  assert.equal(trialMetadata().record_count, '139')
  const results = searchTrials('胰腺癌')
  assert.ok(results.length > 0)
  assert.match(results[0].trialKey, /^CTR\d+$/u)
  const recruiting = searchTrials('', 30, { source: 'cnctr', recruitment: 'recruiting' })
  assert.ok(recruiting.length > 0)
  assert.ok(recruiting.every((item) => /进行中|招募/u.test(item.status) && /中国药物临床试验登记/u.test(item.sourceCode)))
})
