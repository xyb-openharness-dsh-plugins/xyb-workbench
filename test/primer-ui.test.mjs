import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, stat } from 'node:fs/promises'
import { apply } from '../dsh/index.js'

const clientSource = await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')

test('装机版客户端有疾病概要入口、四段顺序与关闭方式', () => {
  assert.match(clientSource, /data-primer-open/, '顶栏缺少 data-primer-open 入口')
  assert.match(clientSource, /疾病概要/, '入口文案缺少「疾病概要」')
  assert.match(clientSource, /定义、医学资料与指南情况、治疗全景、发展趋势/, 'aria-label 没写全四段')
  const positions = ["id: 'definition'", "id: 'evidence'", "id: 'landscape'", "id: 'trend'"].map((needle) => clientSource.indexOf(needle))
  assert.ok(positions.every((position) => position >= 0), '四段数据缺少 definition/evidence/landscape/trend')
  assert.deepEqual([...positions].sort((a, b) => a - b), positions, '四段顺序必须是 definition → evidence → landscape → trend')
  assert.match(clientSource, /data-primer-close/, '缺少返回/关闭入口标记')
  assert.match(clientSource, /event\.key === 'Escape'/, '缺少 Esc 关闭')
  assert.match(clientSource, /https:\/\/www\.nccn\.org\/guidelines\/guidelines-detail\?category=1&id=1455/, '指南表缺少 NCCN 可点链接')
  assert.match(clientSource, /未取得原件/, '缺链接行缺少「未取得原件」标注')
})

function fakeHost(rejection = () => undefined) {
  const routes = []
  apply({
    effect: (effect) => effect(),
    webServer: { register: (route) => { routes.push(route); return () => {} } },
    connection: { requestRejection: rejection },
  }, { root: process.cwd() })
  return routes
}

function callRoute(route, path) {
  return new Promise((resolve, reject) => {
    const req = { url: path, method: 'GET', headers: {} }
    const chunks = []
    const res = {
      status: 0,
      headers: {},
      writeHead(status, headers = {}) { this.status = status; this.headers = headers },
      end(chunk) {
        if (chunk) chunks.push(Buffer.from(chunk))
        resolve({ status: this.status, headers: this.headers, body: Buffer.concat(chunks).toString('utf8') })
      },
    }
    try { route.handler(req, res) } catch (error) { reject(error) }
  })
}

test('public/ 原型页与资源已恢复', async () => {
  for (const file of ['index.html', 'primer-data.js', 'primer.js', 'primer.css', '小胰宝 · 工作台原型 v3_files/echarts.min.js']) {
    assert.ok((await stat(new URL(`../public/${file}`, import.meta.url))).isFile(), `public/${file} 不存在`)
  }
  const index = await readFile(new URL('../public/index.html', import.meta.url), 'utf8')
  assert.match(index, /href="primer\.css"/)
  assert.match(index, /src="primer-data\.js"/)
  assert.match(index, /src="primer\.js"/)
  assert.match(index, /data-primer-open/)
})

test('静态路由挂到 /api/xyb-workbench/ui/ 且复用 connection 鉴权', async () => {
  const routes = fakeHost()
  const staticRoute = routes.find((route) => route.kind === 'prefix' && route.path === '/api/xyb-workbench/ui')
  assert.ok(staticRoute, '缺少 /api/xyb-workbench/ui 前缀路由')
  assert.equal(staticRoute.kind, 'prefix')

  const index = await callRoute(staticRoute, '/api/xyb-workbench/ui/')
  assert.equal(index.status, 200)
  assert.match(index.headers['content-type'], /text\/html/)
  assert.match(index.body, /primer-data\.js/)

  const script = await callRoute(staticRoute, '/api/xyb-workbench/ui/primer-data.js')
  assert.equal(script.status, 200)
  assert.match(script.headers['content-type'], /javascript/)

  const traversal = await callRoute(staticRoute, '/api/xyb-workbench/ui/..%2fpackage.json')
  assert.equal(traversal.status, 403)

  const missing = await callRoute(staticRoute, '/api/xyb-workbench/ui/missing-file.html')
  assert.equal(missing.status, 404)

  const redirect = routes.find((route) => route.kind === 'exact' && route.path === '/api/xyb-workbench/ui')
  assert.ok(redirect, '缺少无斜杠入口的 302 路由')
  const moved = await callRoute(redirect, '/api/xyb-workbench/ui')
  assert.equal(moved.status, 302)
  assert.equal(moved.headers.location, '/api/xyb-workbench/ui/')

  const guardedRoutes = fakeHost(() => 401)
  const guarded = guardedRoutes.find((route) => route.kind === 'prefix' && route.path === '/api/xyb-workbench/ui')
  const denied = await callRoute(guarded, '/api/xyb-workbench/ui/')
  assert.equal(denied.status, 401)
})
