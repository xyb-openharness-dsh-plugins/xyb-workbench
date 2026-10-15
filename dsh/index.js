import Schema from '@deepseek-ai/schemastery'
import { mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { openStore } from './store.js'
import { readSettings, setDataRoot } from './settings.js'
import { searchTrials, trialDetail, trialMetadata } from './trial-store.js'

export const name = 'xyb-workbench-main'
export const inject = ['webServer', 'connection']
export const Config = Schema.object({ root: Schema.string().required() })
const packageMetadata = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(body))
}

async function readJson(req) {
  let raw = ''
  for await (const chunk of req) {
    raw += chunk
    if (raw.length > 64 * 1024) throw new Error('请求内容过大')
  }
  try { return raw ? JSON.parse(raw) : {} } catch { throw new Error('请求不是有效 JSON') }
}

async function readBytes(req) {
  const chunks = []; let length = 0
  for await (const chunk of req) {
    length += chunk.length
    if (length > 100 * 1024 * 1024) throw new Error('单份资料不能超过 100 MB')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

async function configuredStoreRoot(config) {
  // `root` belongs to the package service. Patient data is only stored below
  // a directory explicitly selected in the Desktop client, never guessed.
  const settings = await readSettings(config.root)
  return settings.dataRoot || process.env.XYB_WORKBENCH_STORE_ROOT || ''
}

async function handleApi(req, res, config) {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/api/xyb-workbench/health') {
    const root = await configuredStoreRoot(config)
    return json(res, 200, { ok: true, version: packageMetadata.version, storeConfigured: Boolean(root), dataRoot: root || null, apiVersion: 'v1' })
  }
  if (url.pathname === '/api/xyb-workbench/settings/data-root' && req.method === 'POST') {
    const payload = await readJson(req)
    return json(res, 200, { settings: await setDataRoot(config.root, payload.dataRoot) })
  }
  if (url.pathname === '/api/xyb-workbench/trials/meta' && req.method === 'GET') return json(res, 200, { metadata: trialMetadata() })
  if (url.pathname === '/api/xyb-workbench/trials/search' && req.method === 'GET') return json(res, 200, { trials: searchTrials(url.searchParams.get('q'), 30, { source: url.searchParams.get('source') || '', recruitment: url.searchParams.get('recruitment') || '' }) })
  if (url.pathname === '/api/xyb-workbench/trials/detail' && req.method === 'GET') return json(res, 200, { trial: trialDetail(url.searchParams.get('trialKey')) })
  const root = await configuredStoreRoot(config)
  if (!root) return json(res, 409, { error: '尚未选择患者资料根目录', code: 'store_not_configured' })
  const store = await openStore(root)
  try {
    if (url.pathname === '/api/xyb-workbench/support-resources' && req.method === 'GET') {
      return json(res, 200, { resources: store.listSupportResources(url.searchParams.get('domain') || 'palliative_care') })
    }
    if (url.pathname === '/api/xyb-workbench/patients' && req.method === 'GET') return json(res, 200, { patients: store.listPatients() })
    if (url.pathname === '/api/xyb-workbench/patients' && req.method === 'POST') return json(res, 201, { patient: store.createPatient(await readJson(req)) })
    if (url.pathname === '/api/xyb-workbench/observations' && req.method === 'POST') return json(res, 201, { observation: store.addObservation(await readJson(req)) })
    if (url.pathname === '/api/xyb-workbench/molecular-results' && req.method === 'POST') return json(res, 201, { result: store.addMolecularResult(await readJson(req)) })
    if (url.pathname === '/api/xyb-workbench/molecular-results' && req.method === 'GET') {
      const patientId = url.searchParams.get('patientId')
      if (!patientId) return json(res, 400, { error: '缺少 patientId' })
      return json(res, 200, { results: store.listMolecularResults(patientId) })
    }
    if (url.pathname === '/api/xyb-workbench/observations/history' && req.method === 'GET') {
      const patientId = url.searchParams.get('patientId')
      if (!patientId) return json(res, 400, { error: '缺少 patientId' })
      return json(res, 200, { observations: store.observationHistory(patientId) })
    }
    if (url.pathname === '/api/xyb-workbench/appointments' && req.method === 'POST') return json(res, 201, { appointment: store.addAppointment(await readJson(req)) })
    if (url.pathname === '/api/xyb-workbench/appointments' && req.method === 'PATCH') {
      const payload = await readJson(req)
      return json(res, 200, { appointment: payload.status
        ? store.updateAppointmentStatus(payload.appointmentId, payload.status)
        : store.updateAppointment(payload) })
    }
    if (url.pathname === '/api/xyb-workbench/reminders' && req.method === 'PATCH') return json(res, 200, { reminder: store.updateReminder(await readJson(req)) })
    if (url.pathname === '/api/xyb-workbench/symptoms' && req.method === 'POST') return json(res, 201, { symptom: store.addSymptomRecord(await readJson(req)) })
    if (url.pathname === '/api/xyb-workbench/symptoms' && req.method === 'GET') {
      const patientId = url.searchParams.get('patientId')
      if (!patientId) return json(res, 400, { error: '缺少 patientId' })
      return json(res, 200, { symptoms: store.listSymptomRecords(patientId) })
    }
    if (url.pathname === '/api/xyb-workbench/mood-checkins' && req.method === 'POST') return json(res, 201, { checkin: store.addMoodCheckin(await readJson(req)) })
    if (url.pathname === '/api/xyb-workbench/mood-checkins' && req.method === 'GET') {
      const patientId = url.searchParams.get('patientId')
      if (!patientId) return json(res, 400, { error: '缺少 patientId' })
      return json(res, 200, { checkins: store.listMoodCheckins(patientId) })
    }
    if (url.pathname === '/api/xyb-workbench/care-records' && req.method === 'POST') return json(res, 201, { record: store.addCareRecord(await readJson(req)) })
    if (url.pathname === '/api/xyb-workbench/care-records' && req.method === 'GET') {
      const patientId = url.searchParams.get('patientId')
      if (!patientId) return json(res, 400, { error: '缺少 patientId' })
      return json(res, 200, { records: store.listCareRecords(patientId) })
    }
    if (url.pathname === '/api/xyb-workbench/nutrition/pei' && req.method === 'POST') return json(res, 201, { record: store.addPeiRecord(await readJson(req)) })
    if (url.pathname === '/api/xyb-workbench/treatment-cycles' && req.method === 'POST') return json(res, 201, { plan: store.createTreatmentCyclePlan(await readJson(req)) })
    if (url.pathname === '/api/xyb-workbench/treatment-cycles' && req.method === 'GET') {
      const patientId = url.searchParams.get('patientId')
      if (!patientId) return json(res, 400, { error: '缺少 patientId' })
      return json(res, 200, { plans: store.listTreatmentCyclePlans(patientId) })
    }
    if (url.pathname === '/api/xyb-workbench/nutrition/entries' && req.method === 'POST') return json(res, 201, { entry: store.addNutritionEntry(await readJson(req)) })
    if (url.pathname === '/api/xyb-workbench/nutrition/products' && req.method === 'POST') return json(res, 201, { usage: store.addNutritionProductUsage(await readJson(req)) })
    if (url.pathname === '/api/xyb-workbench/nutrition' && req.method === 'GET') {
      const patientId = url.searchParams.get('patientId')
      if (!patientId) return json(res, 400, { error: '缺少 patientId' })
      return json(res, 200, { nutrition: store.nutritionSummary(patientId) })
    }
    if (url.pathname === '/api/xyb-workbench/trial-bookmarks' && req.method === 'GET') {
      const patientId = url.searchParams.get('patientId')
      if (!patientId) return json(res, 400, { error: '缺少 patientId' })
      return json(res, 200, { bookmarks: store.listTrialBookmarks(patientId) })
    }
    if (url.pathname === '/api/xyb-workbench/trial-bookmarks' && req.method === 'POST') return json(res, 201, { bookmark: store.saveTrialBookmark(await readJson(req)) })
    if (url.pathname === '/api/xyb-workbench/trial-subscriptions' && req.method === 'GET') {
      const patientId = url.searchParams.get('patientId')
      if (!patientId) return json(res, 400, { error: '缺少 patientId' })
      return json(res, 200, { subscriptions: store.listTrialSubscriptions(patientId) })
    }
    if (url.pathname === '/api/xyb-workbench/trial-subscriptions' && req.method === 'POST') return json(res, 201, { subscription: store.createTrialSubscription(await readJson(req)) })
    if (url.pathname === '/api/xyb-workbench/agent-tasks' && req.method === 'POST') return json(res, 201, { task: store.createAgentTask(await readJson(req)) })
    if (url.pathname === '/api/xyb-workbench/review-items' && req.method === 'GET') {
      const patientId = url.searchParams.get('patientId')
      if (!patientId) return json(res, 400, { error: '缺少 patientId' })
      return json(res, 200, store.listReviewItems(patientId))
    }
    if (url.pathname === '/api/xyb-workbench/agent-workspaces' && req.method === 'GET') {
      const patientId = String(url.searchParams.get('patientId') || '').trim()
      if (!store.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) return json(res, 404, { error: '未找到患者' })
      const folder = join(config.root, 'agent-workspaces', patientId)
      await mkdir(folder, { recursive: true })
      return json(res, 200, { folder, sessionRef: store.latestAgentTaskSession(patientId) })
    }
    if (url.pathname === '/api/xyb-workbench/agent-tasks/session' && req.method === 'POST') {
      const { taskId, sessionRef } = await readJson(req)
      return json(res, 200, { task: store.attachAgentTaskSession(taskId, sessionRef) })
    }
    if (url.pathname === '/api/xyb-workbench/documents' && req.method === 'POST') {
      return json(res, 201, { document: await store.importDocument({
        patientId: url.searchParams.get('patientId'), title: url.searchParams.get('title'), kindCode: url.searchParams.get('kindCode'),
        reportedAt: url.searchParams.get('reportedAt'), fileName: req.headers['x-xyb-file-name'],
      }, await readBytes(req)) })
    }
    if (url.pathname === '/api/xyb-workbench/documents' && req.method === 'GET') {
      const patientId = url.searchParams.get('patientId')
      if (!patientId) return json(res, 400, { error: '缺少 patientId' })
      return json(res, 200, { documents: store.listDocuments(patientId) })
    }
    if (url.pathname === '/api/xyb-workbench/documents/content' && req.method === 'GET') {
      const documentId = url.searchParams.get('documentId')
      if (!documentId) return json(res, 400, { error: '缺少 documentId' })
      const document = await store.readDocument(documentId)
      const contentTypes = { '.pdf': 'application/pdf', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }
      const contentType = contentTypes[document.extension] || 'application/octet-stream'
      const disposition = contentType === 'application/octet-stream' ? 'attachment' : 'inline'
      res.writeHead(200, {
        'content-type': contentType,
        'content-length': document.bytes.length,
        'content-disposition': `${disposition}; filename="document${document.extension.replace(/[^.a-z0-9]/g, '')}"`,
        'x-content-type-options': 'nosniff',
        'cache-control': 'no-store',
      })
      return res.end(document.bytes)
    }
    if (url.pathname === '/api/xyb-workbench/documents/parse' && req.method === 'POST') {
      const { documentId } = await readJson(req)
      return json(res, 200, { parse: await store.parseDocument(documentId) })
    }
    if (url.pathname === '/api/xyb-workbench/candidates' && req.method === 'GET') {
      const patientId = url.searchParams.get('patientId')
      if (!patientId) return json(res, 400, { error: '缺少 patientId' })
      return json(res, 200, { candidates: store.listCandidates(patientId, url.searchParams.get('documentId')) })
    }
    if (url.pathname === '/api/xyb-workbench/candidates/confirm' && req.method === 'POST') {
      const { candidateId, confirmedBy } = await readJson(req)
      return json(res, 200, { confirmed: store.confirmCandidate(candidateId, confirmedBy) })
    }
    if (url.pathname === '/api/xyb-workbench/candidates/reject' && req.method === 'POST') {
      const { candidateId } = await readJson(req)
      return json(res, 200, { rejected: store.rejectCandidate(candidateId) })
    }
    if (url.pathname === '/api/xyb-workbench/dashboard' && req.method === 'GET') {
      const patientId = url.searchParams.get('patientId')
      if (!patientId) return json(res, 400, { error: '缺少 patientId' })
      return json(res, 200, { dashboard: store.dashboard(patientId) })
    }
    if (url.pathname === '/api/xyb-workbench/reports/export' && req.method === 'POST') {
      const { patientId, formatCode = 'html' } = await readJson(req)
      return json(res, 201, { artifact: await store.exportPatientReport(patientId, formatCode) })
    }
    if (url.pathname === '/api/xyb-workbench/reports/jpeg' && req.method === 'POST') {
      const { patientId, imageData } = await readJson(req)
      return json(res, 201, { artifact: await store.saveJpegReport(patientId, imageData) })
    }
    if (url.pathname === '/api/xyb-workbench/reports/artifact' && req.method === 'GET') {
      const artifact = await store.readArtifact(url.searchParams.get('artifactId'))
      const types = { html: 'text/html; charset=utf-8', md: 'text/markdown; charset=utf-8', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', jpeg: 'image/jpeg' }
      res.writeHead(200, { 'content-type': types[artifact.formatCode] || 'application/octet-stream', 'content-disposition': 'inline', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'" })
      return res.end(artifact.bytes)
    }
    return json(res, 404, { error: 'not found' })
  } finally { store.close() }
}

export function apply(ctx, config) {
  for (const path of ['/api/xyb-workbench/health', '/api/xyb-workbench/settings/data-root', '/api/xyb-workbench/trials/meta', '/api/xyb-workbench/trials/search', '/api/xyb-workbench/trials/detail', '/api/xyb-workbench/patients', '/api/xyb-workbench/observations', '/api/xyb-workbench/observations/history', '/api/xyb-workbench/molecular-results', '/api/xyb-workbench/appointments', '/api/xyb-workbench/reminders', '/api/xyb-workbench/symptoms', '/api/xyb-workbench/care-records', '/api/xyb-workbench/mood-checkins', '/api/xyb-workbench/support-resources', '/api/xyb-workbench/treatment-cycles', '/api/xyb-workbench/nutrition', '/api/xyb-workbench/nutrition/entries', '/api/xyb-workbench/nutrition/products', '/api/xyb-workbench/nutrition/pei', '/api/xyb-workbench/trial-bookmarks', '/api/xyb-workbench/trial-subscriptions', '/api/xyb-workbench/agent-tasks', '/api/xyb-workbench/review-items', '/api/xyb-workbench/agent-tasks/session', '/api/xyb-workbench/agent-workspaces', '/api/xyb-workbench/documents', '/api/xyb-workbench/documents/content', '/api/xyb-workbench/documents/parse', '/api/xyb-workbench/candidates', '/api/xyb-workbench/candidates/confirm', '/api/xyb-workbench/candidates/reject', '/api/xyb-workbench/dashboard', '/api/xyb-workbench/reports/export', '/api/xyb-workbench/reports/jpeg', '/api/xyb-workbench/reports/artifact']) {
    ctx.effect(() => ctx.webServer.register({
      kind: 'exact', path,
      handler: (req, res) => {
        const rejection = ctx.connection?.requestRejection?.(req)
        if (!ctx.connection?.requestRejection || rejection !== undefined) return json(res, rejection || 403, { error: 'Authentication required' })
        return handleApi(req, res, config).catch(error => json(res, 500, { error: error instanceof Error ? error.message : String(error) }))
      },
    }), `xyb-workbench: ${path}`)
  }
}
