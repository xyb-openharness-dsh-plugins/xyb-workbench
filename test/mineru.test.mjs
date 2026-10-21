/* MinerU HTTP 客户端：协议顺序、错误语义、模型回退、Token 不外泄。
   全部离线：fetchImpl 注入假的，ZIP 用 stored（method 0）手搓，不需要联网或外部工具。 */

import test from 'node:test'
import assert from 'node:assert/strict'
import { extractWithMineru, MineruError } from '../dsh/mineru.js'

/* ---------- 最小的 stored ZIP 生成器（只为拼 MinerU 返回包） ---------- */
function storedZip(files) {
  const locals = []
  const centrals = []
  let offset = 0
  for (const [name, content] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf8')
    const data = Buffer.from(content, 'utf8')
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 8) // method 0 = stored
    local.writeUInt32LE(0, 14)
    local.writeUInt32LE(data.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(nameBuf.length, 26)
    locals.push(local, nameBuf, data)

    const cd = Buffer.alloc(46)
    cd.writeUInt32LE(0x02014b50, 0)
    cd.writeUInt16LE(20, 4)
    cd.writeUInt16LE(20, 6)
    cd.writeUInt32LE(data.length, 20)
    cd.writeUInt32LE(data.length, 24)
    cd.writeUInt16LE(nameBuf.length, 28)
    cd.writeUInt32LE(offset, 42)
    centrals.push(cd, nameBuf)
    offset += 30 + nameBuf.length + data.length
  }
  const cdBuf = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(Object.keys(files).length, 8)
  eocd.writeUInt16LE(Object.keys(files).length, 10)
  eocd.writeUInt32LE(cdBuf.length, 12)
  eocd.writeUInt32LE(offset, 16)
  return Buffer.concat([...locals, cdBuf, eocd])
}

const ZIP_OK = storedZip({ 'full.md': '# 解析结果\n| 项目 | 值 |\n| HGB | 104 |\n' })

const json = (body, status = 200) => ({ ok: status < 400, status, json: async () => body })
const ok200 = { ok: true, status: 200 }

/** 按 URL 分派；记录每次请求，便于断言"调了几次、带没带 Content-Type"。 */
function harness({ batch = null, poll = null, upload = null, download = null } = {}) {
  const calls = []
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, method: init.method || 'GET', headers: init.headers || {}, body: init.body })
    if (url.endsWith('/file-urls/batch')) {
      return batch ? batch() : json({ code: 0, data: { batch_id: 'b-1', file_urls: ['https://upload.invalid/put-1'] } })
    }
    if (url.startsWith('https://upload.invalid/')) return upload ? upload() : ok200
    if (url.includes('/extract-results/batch/')) {
      return poll ? poll(calls.filter((c) => c.url.includes('/extract-results/'))) : json({
        code: 0,
        data: { extract_result: [{ state: 'done', full_zip_url: 'https://zip.invalid/r.zip' }] },
      })
    }
    if (url.startsWith('https://zip.invalid/')) {
      return download ? download() : { ok: true, status: 200, arrayBuffer: async () => ZIP_OK }
    }
    throw new Error(`测试没准备这个请求：${init.method || 'GET'} ${url}`)
  }
  return { fetchImpl, calls }
}

const run = (opts, extra = {}) => extractWithMineru(Buffer.from('%PDF-1.4 synthetic'), '.pdf', { token: 'test-token', intervalMs: 1, timeoutMs: 5000, ...opts, ...extra })

test('按 v4 四步走：申请 → 上传 → 轮询 → 解 zip 取 full.md', async () => {
  const { fetchImpl, calls } = harness()
  const result = await run({ fetchImpl })
  assert.deepEqual(calls.map((c) => c.method), ['POST', 'PUT', 'GET', 'GET'])
  assert.ok(calls[0].url.endsWith('/api/v4/file-urls/batch'))
  assert.equal(calls[1].url, 'https://upload.invalid/put-1')
  assert.ok(calls[2].url.includes('/api/v4/extract-results/batch/b-1'))
  assert.equal(calls[3].url, 'https://zip.invalid/r.zip')
  assert.match(result.markdown, /HGB \| 104/u)
  assert.equal(result.engine, 'mineru-api-vlm')
  assert.equal(result.message, undefined)
})

test('上传原件不带 Content-Type，Token 只走 Authorization 头', async () => {
  const { fetchImpl, calls } = harness()
  await run({ fetchImpl })
  const put = calls.find((c) => c.method === 'PUT')
  assert.equal(put.headers['Content-Type'], undefined)
  assert.equal(put.headers.Authorization, undefined)
  const post = calls.find((c) => c.method === 'POST')
  assert.equal(post.headers.Authorization, 'Bearer test-token')
  assert.equal(JSON.parse(post.body).files[0].name, 'source.pdf')
})

test('Token 被拒（401）时报 UNAUTHORIZED，且不重试', async () => {
  const { fetchImpl, calls } = harness({ batch: () => ({ ok: false, status: 401, json: async () => ({}), text: async () => '{}' }) })
  await assert.rejects(() => run({ fetchImpl }), (error) => {
    assert.equal(error.code, 'UNAUTHORIZED')
    assert.match(error.message, /拒绝了这个 Token/u)
    assert.match(error.message, /设置中替换/u)
    return true
  })
  assert.equal(calls.filter((c) => c.method === 'POST').length, 1)
})

test('401 报文里的 user token expired 要翻译出来，并写明这次用的是哪把 Token', async () => {
  const { fetchImpl } = harness({
    batch: () => ({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => JSON.stringify({ msgCode: 'A0211', msg: 'user token expired', success: false }),
    }),
  })
  await assert.rejects(
    () => run({ fetchImpl, tokenSource: 'environment' }),
    (error) => {
      assert.equal(error.code, 'UNAUTHORIZED')
      assert.match(error.message, /Token 已过期/u)
      assert.match(error.message, /环境变量 MINERU_TOKEN/u)
      // 不能把 Token 本身写进错误消息
      assert.equal(error.message.includes('test-token'), false)
      return true
    },
  )
})

test('默认 vlm：batch 请求里带 model_version=vlm', async () => {
  const { fetchImpl, calls } = harness()
  await run({ fetchImpl })
  assert.equal(JSON.parse(calls[0].body).model_version, 'vlm')
})

test('接口明确拒绝 vlm 时回退 pipeline，并说明表格质量可能下降', async () => {
  let attempts = 0
  const { fetchImpl, calls } = harness({
    batch: () => {
      attempts += 1
      if (attempts === 1) return json({ code: -1, msg: 'model vlm is not supported' })
      return json({ code: 0, data: { batch_id: 'b-2', file_urls: ['https://upload.invalid/put-2'] } })
    },
  })
  const result = await run({ fetchImpl })
  assert.deepEqual(calls.filter((c) => c.method === 'POST').map((c) => JSON.parse(c.body).model_version), ['vlm', 'pipeline'])
  assert.equal(result.engine, 'mineru-api-pipeline')
  assert.match(result.message, /不支持 vlm 模型/u)
})

test('文件本身解析失败不换模型重试（不多花一次额度）', async () => {
  const { fetchImpl, calls } = harness({
    poll: () => json({ code: 0, data: { extract_result: [{ state: 'failed', err_msg: 'conversion failed' }] } }),
  })
  await assert.rejects(() => run({ fetchImpl }), (error) => {
    assert.equal(error.code, 'TASK_FAILED')
    assert.match(error.message, /conversion failed/u)
    return true
  })
  assert.equal(calls.filter((c) => c.method === 'POST').length, 1)
})

test('zip 里没有 full.md 就报错，不返回半份结果', async () => {
  const { fetchImpl } = harness({
    download: () => ({ ok: true, status: 200, arrayBuffer: async () => storedZip({ 'layout.json': '{}' }) }),
  })
  await assert.rejects(() => run({ fetchImpl }), (error) => {
    assert.equal(error.code, 'NO_MARKDOWN')
    assert.match(error.message, /没有 full\.md/u)
    return true
  })
})

test('一直 pending 会轮询多次，不会一次就放弃', async () => {
  let polls = 0
  const { fetchImpl } = harness({
    poll: () => {
      polls += 1
      if (polls < 3) return json({ code: 0, data: { extract_result: [{ state: 'running' }] } })
      return json({ code: 0, data: { extract_result: [{ state: 'done', full_zip_url: 'https://zip.invalid/r.zip' }] } })
    },
  })
  const result = await run({ fetchImpl })
  assert.equal(polls, 3)
  assert.match(result.markdown, /解析结果/u)
})

test('没有 Token 时直接报错，不发匿名请求', async () => {
  const { fetchImpl, calls } = harness()
  await assert.rejects(
    () => extractWithMineru(Buffer.from('%PDF-1.4 synthetic'), '.pdf', { token: '', fetchImpl }),
    /没有可用的 MinerU Token/u,
  )
  assert.equal(calls.length, 0)
})

test('不支持的文件类型在发请求之前就拒绝', async () => {
  const { fetchImpl, calls } = harness()
  await assert.rejects(() => extractWithMineru(Buffer.from('x'), '.exe', { token: 'test-token', fetchImpl }), /不支持此文件类型/u)
  assert.equal(calls.length, 0)
})

test('代理环境下连接失败要说明"内置请求不走系统代理"', async () => {
  const previous = process.env.HTTPS_PROXY
  process.env.HTTPS_PROXY = 'http://127.0.0.1:9999'
  try {
    const fetchImpl = async () => { throw new Error('fetch failed') }
    await assert.rejects(
      () => extractWithMineru(Buffer.from('%PDF-1.4 synthetic'), '.pdf', { token: 'test-token', fetchImpl }),
      (error) => {
        assert.equal(error.code, 'NETWORK')
        assert.match(error.message, /HTTPS_PROXY/u)
        assert.match(error.message, /不走系统代理/u)
        return true
      },
    )
  } finally {
    if (previous === undefined) delete process.env.HTTPS_PROXY
    else process.env.HTTPS_PROXY = previous
  }
})

test('错误对象里有 code，便于调用方区分授权与文件问题', async () => {
  const { fetchImpl } = harness({ batch: () => json({ code: -60012, msg: '参数错误' }) })
  await assert.rejects(() => run({ fetchImpl }), (error) => {
    assert.ok(error instanceof MineruError)
    assert.equal(error.code, 'API_ERROR')
    assert.match(error.message, /code=-60012/u)
    return true
  })
})
