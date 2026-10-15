import test from 'node:test'
import assert from 'node:assert/strict'
import { extractWithMineru } from '../dsh/mineru.js'

test('falls back to MinerU Flash and returns an expiry notice after API authentication rejection', async () => {
  const calls = []
  const runner = async (args, token) => {
    calls.push({ args, token })
    if (args[0] === 'extract') {
      const error = new Error('HTTP 401 unauthorized: token expired')
      error.stderr = 'HTTP 401 unauthorized: token expired'
      throw error
    }
    return { stdout: '# Synthetic local test result' }
  }
  const result = await extractWithMineru(Buffer.from('%PDF-1.4 synthetic'), '.pdf', { token: 'test-token', runner })
  assert.equal(result.engine, 'mineru-flash-fallback')
  assert.match(result.message, /Token 已失效或过期/u)
  assert.match(result.markdown, /Synthetic local test result/u)
  assert.equal(calls.length, 2)
  assert.equal(calls[1].args[0], 'flash-extract')
  assert.equal(calls[1].token, undefined)
})

test('retries a transient CDN EOF once without a configured proxy', async () => {
  const calls = []
  const previous = process.env.HTTPS_PROXY
  process.env.HTTPS_PROXY = 'http://synthetic-proxy.invalid'
  const runner = async (args, token, options) => {
    calls.push({ command: args[0], token, options })
    if (calls.length === 1) {
      const error = new Error('download zip: EOF')
      error.stderr = 'download zip: EOF'
      throw error
    }
    return { stdout: '# Synthetic MinerU result' }
  }
  try {
    const result = await extractWithMineru(Buffer.from('%PDF-1.4 synthetic'), '.pdf', { token: 'test-token', runner })
    assert.match(result.markdown, /Synthetic MinerU result/u)
    assert.deepEqual(calls.map(({ command }) => command), ['extract', 'extract'])
    assert.equal(calls[1].options.bypassProxy, true)
    assert.equal(calls[1].token, 'test-token')
  } finally {
    if (previous === undefined) delete process.env.HTTPS_PROXY
    else process.env.HTTPS_PROXY = previous
  }
})

test('does not retry unrelated MinerU API failures', async () => {
  const calls = []
  const runner = async (args) => {
    calls.push(args[0])
    const error = new Error('HTTP 500 service unavailable')
    error.stderr = 'HTTP 500 service unavailable'
    throw error
  }
  await assert.rejects(() => extractWithMineru(Buffer.from('%PDF-1.4 synthetic'), '.pdf', { token: 'test-token', runner }), /MinerU 解析失败/u)
  assert.deepEqual(calls, ['extract'])
})
