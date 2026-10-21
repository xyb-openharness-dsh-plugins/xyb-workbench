import { DatabaseSync } from 'node:sqlite'
import { createHash, randomUUID } from 'node:crypto'
import { access, mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { applyMigrations } from './migrate.js'
import { extractObservationCandidates } from './extract.js'
import { Document, HeadingLevel, Packer, Paragraph } from 'docx'

const schemaDirectory = fileURLToPath(new URL('../schema/', import.meta.url))

export async function storeExists(root) {
  try { await access(join(root, 'xyb.db')); return true } catch { return false }
}

export async function openStore(root) {
  if (!root) throw new Error('尚未选择患者资料根目录')
  const safeRoot = resolve(root)
  await mkdir(safeRoot, { recursive: true })
  const dbPath = join(safeRoot, 'xyb.db')
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('PRAGMA journal_mode = WAL')
  // Background parse jobs open their own connection while a request may still
  // hold one; wait instead of failing with SQLITE_BUSY.
  db.exec('PRAGMA busy_timeout = 5000')
  await applyMigrations(db, schemaDirectory)
  return new XybStore(db, safeRoot)
}

export class XybStore {
  constructor(db, root) { this.db = db; this.root = root }
  close() { this.db.close() }
  listPatients() {
    return this.db.prepare(`SELECT id, display_name AS displayName, birth_date AS birthDate,
      sex_at_birth AS sexAtBirth, height_cm AS heightCm, status FROM patient ORDER BY display_name`).all()
  }
  createPatient(input) {
    const displayName = String(input?.displayName || '').trim()
    if (!displayName) throw new Error('请填写患者显示名称')
    const workspace = this.db.prepare('SELECT id FROM workspace ORDER BY rowid LIMIT 1').get()
    const workspaceId = workspace?.id || randomUUID()
    const id = randomUUID(), now = new Date().toISOString()
    this.db.exec('BEGIN')
    try {
      if (!workspace) this.db.prepare('INSERT INTO workspace (id, name, schema_version, settings_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
        .run(workspaceId, '小胰宝本机资料库', String(this.db.prepare('PRAGMA user_version').get().user_version), '{}', now, now)
      this.db.prepare(`INSERT INTO patient (id, workspace_id, display_name, birth_date, sex_at_birth, height_cm, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`).run(id, workspaceId, displayName, input.birthDate || null, input.sexAtBirth || null, input.heightCm || null, now, now)
      this.db.exec('COMMIT')
      return { id, displayName, createdAt: now }
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
  }
  addObservation(input) {
    const patientId = String(input?.patientId || '').trim()
    const metricCode = String(input?.metricCode || '').trim()
    const valueRaw = String(input?.valueRaw ?? '').trim()
    const valueNum = Number(input?.valueNum)
    const occurredAt = String(input?.occurredAt || '').trim()
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    if (!metricCode || !valueRaw || !occurredAt) throw new Error('请填写检测项目、数值和日期')
    if (!Number.isFinite(valueNum)) throw new Error('检测数值应为数字')
    const id = randomUUID(), now = new Date().toISOString()
    this.db.exec('BEGIN')
    try {
      this.db.prepare(`INSERT INTO clinical_fact (id, patient_id, fact_type, status, occurred_from, recorded_at, source_kind, confirmed_by, confirmed_at, summary)
        VALUES (?, ?, 'observation', 'confirmed', ?, ?, 'manual', 'patient', ?, ?)`)
        .run(id, patientId, occurredAt, now, now, `${metricCode}: ${valueRaw}`)
      this.db.prepare(`INSERT INTO observation (fact_id, patient_id, occurred_at, metric_code, value_num, value_raw, unit_raw, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'measured')`)
        .run(id, patientId, occurredAt, metricCode, valueNum, valueRaw, String(input?.unitRaw || '').trim() || null)
      this.db.exec('COMMIT')
      return { id, patientId, metricCode, valueNum, valueRaw, occurredAt }
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
  }
  async importDocument(input, bytes) {
    const patientId = String(input?.patientId || '').trim()
    const title = String(input?.title || '').trim()
    const kindCode = String(input?.kindCode || 'other').trim()
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    if (!title || !Buffer.isBuffer(bytes) || bytes.length === 0) throw new Error('请选择要导入的资料文件')
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const duplicate = this.db.prepare('SELECT id FROM document WHERE patient_id = ? AND sha256 = ?').get(patientId, sha256)
    if (duplicate) throw new Error('这份资料已经导入过')
    const suffix = String(input?.fileName || '').split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || 'bin'
    const relative = join('input', 'documents', patientId, `${randomUUID()}.${suffix}`)
    const fullPath = join(this.root, relative)
    await mkdir(dirname(fullPath), { recursive: true })
    await writeFile(fullPath, bytes, { flag: 'wx', mode: 0o600 })
    const id = randomUUID(), now = new Date().toISOString()
    try {
      this.db.prepare(`INSERT INTO document (id, patient_id, kind_code, title, file_rel_path, sha256, reported_at, parse_status, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 'active', ?)`)
        .run(id, patientId, kindCode, title, relative, sha256, String(input?.reportedAt || '').trim() || null, now)
      return { id, patientId, title, kindCode, parseStatus: 'pending', fileRelPath: relative }
    } catch (error) { await unlink(fullPath).catch(() => {}); throw error }
  }
  listDocuments(patientId) {
    return this.db.prepare(`SELECT d.id, d.title, d.kind_code AS kindCode, d.reported_at AS reportedAt, d.parse_status AS parseStatus,
      d.created_at AS createdAt, COUNT(c.id) AS candidateCount,
      SUM(CASE WHEN c.status = 'candidate' THEN 1 ELSE 0 END) AS pendingCandidateCount
      FROM document d LEFT JOIN extraction_run r ON r.document_id = d.id
      LEFT JOIN extraction_candidate c ON c.run_id = r.id
      WHERE d.patient_id = ? GROUP BY d.id ORDER BY d.reported_at DESC, d.created_at DESC`).all(patientId)
  }
  async readDocument(documentId) {
    const document = this.db.prepare(`SELECT id, title, file_rel_path AS fileRelPath FROM document WHERE id = ? AND status = 'active'`).get(documentId)
    if (!document) throw new Error('未找到资料')
    const fullPath = resolve(this.root, document.fileRelPath)
    const pathFromRoot = relative(this.root, fullPath)
    if (!pathFromRoot || pathFromRoot.startsWith('..') || pathFromRoot.includes(`..${process.platform === 'win32' ? '\\' : '/'}`)) throw new Error('资料路径无效')
    return { ...document, extension: extname(document.fileRelPath).toLowerCase(), bytes: await readFile(fullPath) }
  }
  async parseDocument(documentId, { mineru = null, runId: queuedRunId = null } = {}) {
    const document = this.db.prepare('SELECT id, patient_id AS patientId, file_rel_path AS fileRelPath, sha256, reported_at AS reportedAt FROM document WHERE id = ?').get(documentId)
    if (!document) throw new Error('未找到资料')
    const runId = queuedRunId || randomUUID(), now = new Date().toISOString()
    const engineName = 'local-regex'
    if (queuedRunId) this.db.prepare("UPDATE extraction_run SET engine = ?, status = 'running', started_at = ?, finished_at = NULL, error_message = NULL WHERE id = ?").run(engineName, now, runId)
    else this.db.prepare(`INSERT INTO extraction_run (id, document_id, engine, engine_version, input_hash, status, started_at)
      VALUES (?, ?, ?, 'v1', ?, 'running', ?)`).run(runId, document.id, engineName, document.sha256, now)
    this.db.prepare("UPDATE document SET parse_status = 'parsing' WHERE id = ?").run(document.id)
    try {
      const extension = extname(document.fileRelPath).toLowerCase()
      if (!['.txt', '.md', '.csv'].includes(extension) && !mineru) {
        this.db.prepare("UPDATE extraction_run SET status = 'succeeded', finished_at = ? WHERE id = ?").run(new Date().toISOString(), runId)
        this.db.prepare("UPDATE document SET parse_status = 'partial' WHERE id = ?").run(document.id)
        return { documentId, runId, status: 'partial', engine: engineName, candidateCount: 0, message: '当前本地规则解析仅支持 TXT、MD、CSV；文件已归档，可手动录入或等待后续解析器。' }
      }
      let source, extractionMessage = '', usedEngine = engineName
      if (mineru && !['.txt', '.md', '.csv'].includes(extension)) {
        const extracted = await mineru(await this.readDocument(documentId), extension)
        source = extracted.markdown
        extractionMessage = extracted.message || ''
        usedEngine = extracted.engine
        this.db.prepare('UPDATE extraction_run SET engine = ?, engine_version = ? WHERE id = ?').run(extracted.engine, 'cli', runId)
        const outputDirectory = join(this.root, 'output', 'extractions', document.patientId)
        await mkdir(outputDirectory, { recursive: true, mode: 0o700 })
        await writeFile(join(outputDirectory, `${runId}.md`), source, { mode: 0o600 })
      } else source = await readFile(join(this.root, document.fileRelPath), 'utf8')
      const candidates = extractObservationCandidates(source, document.reportedAt)
      this.db.exec('BEGIN')
      try {
        const insert = this.db.prepare(`INSERT INTO extraction_candidate (id, run_id, patient_id, fact_type, payload_json, source_locator, confidence, status, created_at)
          VALUES (?, ?, ?, 'observation', ?, ?, ?, 'candidate', ?)`)
        for (const candidate of candidates) insert.run(randomUUID(), runId, document.patientId, JSON.stringify(candidate.payload), candidate.sourceLocator, candidate.confidence, now)
        this.db.prepare("UPDATE extraction_run SET status = 'succeeded', finished_at = ? WHERE id = ?").run(new Date().toISOString(), runId)
        this.db.prepare("UPDATE document SET parse_status = 'parsed' WHERE id = ?").run(document.id)
        this.db.exec('COMMIT')
      } catch (error) { this.db.exec('ROLLBACK'); throw error }
      return { documentId, runId, status: 'parsed', engine: usedEngine, candidateCount: candidates.length, ...(extractionMessage ? { message: extractionMessage } : {}) }
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      this.db.prepare("UPDATE extraction_run SET status = 'failed', finished_at = ?, error_message = ? WHERE id = ?").run(new Date().toISOString(), detail.slice(0, 1000), runId)
      this.db.prepare("UPDATE document SET parse_status = 'failed' WHERE id = ?").run(document.id)
      throw new Error(`本地解析失败：${detail}`)
    }
  }
  queueParse(documentId, { mineru = null } = {}) {
    const document = this.db.prepare('SELECT id, patient_id AS patientId, file_rel_path AS fileRelPath, sha256 FROM document WHERE id = ?').get(documentId)
    if (!document) throw new Error('未找到资料')
    for (const active of this.listParseJobs(document.patientId)) if (active.documentId === document.id) return active
    const runId = randomUUID(), now = new Date().toISOString()
    this.db.prepare(`INSERT INTO extraction_run (id, document_id, engine, engine_version, input_hash, status, started_at)
      VALUES (?, ?, ?, 'v1', ?, 'queued', ?)`).run(runId, document.id, 'local-regex', document.sha256, now)
    this.db.prepare("UPDATE document SET parse_status = 'parsing' WHERE id = ?").run(document.id)
    const job = { documentId, runId }
    // The request that enqueues the job closes its own connection when it
    // returns, so the worker runs on a connection of its own.
    ;(async () => {
      let worker = null
      try {
        worker = await openStore(this.root)
        await worker.parseDocument(documentId, { mineru, runId })
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error)
        try { const recovery = await openStore(this.root); recovery.markParseFailed(runId, detail); recovery.close() } catch { /* nothing else we can record */ }
      } finally { worker?.close() }
    })()
    return job
  }
  markParseFailed(runId, detail) {
    this.db.prepare("UPDATE extraction_run SET status = 'failed', finished_at = ?, error_message = ? WHERE id = ?").run(new Date().toISOString(), String(detail).slice(0, 1000), runId)
    const document = this.db.prepare('SELECT document_id AS documentId FROM extraction_run WHERE id = ?').get(runId)
    if (document) this.db.prepare("UPDATE document SET parse_status = 'failed' WHERE id = ?").run(document.documentId)
  }
  listParseJobs(patientId) {
    return this.db.prepare(`SELECT r.id AS runId, r.document_id AS documentId, d.title, r.status, r.engine,
      COALESCE(NULLIF(r.error_message, ''), NULL) AS errorMessage, r.started_at AS startedAt, r.finished_at AS finishedAt,
      (SELECT COUNT(*) FROM extraction_candidate c WHERE c.run_id = r.id) AS candidateCount
      FROM extraction_run r JOIN document d ON d.id = r.document_id
      WHERE d.patient_id = ? AND r.status IN ('queued', 'running') ORDER BY r.started_at DESC`).all(patientId)
  }
  readParseJob(runId) {
    return this.db.prepare(`SELECT r.id AS runId, r.document_id AS documentId, d.title, d.patient_id AS patientId, r.status, r.engine,
      COALESCE(NULLIF(r.error_message, ''), NULL) AS errorMessage, r.started_at AS startedAt, r.finished_at AS finishedAt,
      (SELECT COUNT(*) FROM extraction_candidate c WHERE c.run_id = r.id) AS candidateCount
      FROM extraction_run r JOIN document d ON d.id = r.document_id WHERE r.id = ?`).get(runId) || null
  }
  async readExtractionResult(documentId) {
    const run = this.db.prepare(`SELECT r.id, r.engine, d.patient_id AS patientId, d.file_rel_path AS fileRelPath FROM extraction_run r
      JOIN document d ON d.id = r.document_id WHERE r.document_id = ? AND r.status = 'succeeded'
      ORDER BY r.started_at DESC LIMIT 1`).get(documentId)
    if (!run) throw new Error('此资料没有已完成的解析结果')
    if (run.engine.startsWith('mineru-')) {
      const resultPath = join(this.root, 'output', 'extractions', run.patientId, `${run.id}.md`)
      return { documentId, engine: run.engine, markdown: await readFile(resultPath, 'utf8') }
    }
    if (extname(run.fileRelPath).toLowerCase() === '.csv') return { documentId, engine: 'local-csv', markdown: await readFile(join(this.root, run.fileRelPath), 'utf8') }
    throw new Error('此资料没有可查看的文本解析结果')
  }
  listCandidates(patientId, documentId) {
    return this.db.prepare(`SELECT c.id, c.fact_type AS factType, c.payload_json AS payloadJson, c.source_locator AS sourceLocator,
      c.confidence, c.status, c.created_at AS createdAt, r.document_id AS documentId, d.title AS documentTitle
      FROM extraction_candidate c JOIN extraction_run r ON r.id = c.run_id JOIN document d ON d.id = r.document_id
      WHERE c.patient_id = ? ${documentId ? 'AND r.document_id = ?' : ''} ORDER BY c.created_at, c.id`).all(...(documentId ? [patientId, documentId] : [patientId]))
      .map((row) => ({ ...row, payload: JSON.parse(row.payloadJson) }))
  }
  confirmCandidate(candidateId, confirmedBy = 'patient') {
    const candidate = this.db.prepare(`SELECT c.id, c.patient_id AS patientId, c.fact_type AS factType, c.payload_json AS payloadJson,
      r.document_id AS documentId FROM extraction_candidate c JOIN extraction_run r ON r.id = c.run_id WHERE c.id = ?`).get(candidateId)
    if (!candidate) throw new Error('未找到候选字段')
    if (candidate.factType !== 'observation') throw new Error('当前仅支持确认检测指标候选')
    if (this.db.prepare("SELECT 1 FROM extraction_candidate WHERE id = ? AND status = 'confirmed'").get(candidateId)) throw new Error('此候选字段已确认')
    const payload = JSON.parse(candidate.payloadJson)
    if (!payload.metricCode || !Number.isFinite(payload.valueNum) || !payload.valueRaw || !payload.occurredAt) throw new Error('候选字段信息不完整')
    const factId = randomUUID(), now = new Date().toISOString()
    this.db.exec('BEGIN')
    try {
      this.db.prepare(`INSERT INTO clinical_fact (id, patient_id, fact_type, status, occurred_from, recorded_at, source_kind, source_document_id, source_locator, confirmed_by, confirmed_at, summary)
        VALUES (?, ?, 'observation', 'confirmed', ?, ?, 'document', ?, ?, ?, ?, ?)`)
        .run(factId, candidate.patientId, payload.occurredAt, now, candidate.documentId, payload.sourceLocator || null, confirmedBy, now, `${payload.metricCode}: ${payload.valueRaw}`)
      this.db.prepare(`INSERT INTO observation (fact_id, patient_id, occurred_at, metric_code, value_num, value_raw, comparator, unit_raw, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'measured')`)
        .run(factId, candidate.patientId, payload.occurredAt, payload.metricCode, payload.valueNum, payload.valueRaw, payload.comparator || '=', payload.unitRaw || null)
      this.db.prepare("UPDATE extraction_candidate SET status = 'confirmed' WHERE id = ?").run(candidateId)
      this.db.exec('COMMIT')
      return { candidateId, factId, metricCode: payload.metricCode }
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
  }
  rejectCandidate(candidateId) {
    const result = this.db.prepare("UPDATE extraction_candidate SET status = 'rejected' WHERE id = ? AND status = 'candidate'").run(candidateId)
    if (!result.changes) throw new Error('候选字段不能再被排除')
    return { candidateId, status: 'rejected' }
  }
  addAppointment(input) {
    const patientId = String(input?.patientId || '').trim()
    const kindCode = String(input?.kindCode || '').trim()
    const scheduledAt = String(input?.scheduledAt || '').trim()
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    if (!kindCode || !scheduledAt) throw new Error('请填写事项类型和计划时间')
    const id = randomUUID()
    this.db.prepare(`INSERT INTO appointment (id, patient_id, kind_code, scheduled_at, organization, status, note)
      VALUES (?, ?, ?, ?, ?, 'scheduled', ?)`)
      .run(id, patientId, kindCode, scheduledAt, String(input?.organization || '').trim() || null, String(input?.note || '').trim() || null)
    return { id, patientId, kindCode, scheduledAt }
  }
  updateAppointmentStatus(appointmentId, status) {
    if (!['scheduled', 'completed', 'cancelled'].includes(status)) throw new Error('预约状态无效')
    const result = this.db.prepare('UPDATE appointment SET status = ?, revision = revision + 1 WHERE id = ?').run(status, appointmentId)
    if (!result.changes) throw new Error('未找到预约')
    const reminderStatus = status === 'scheduled' ? 'pending' : status
    this.db.prepare('UPDATE reminder SET status = ? WHERE appointment_id = ? AND status IN (?, ?, ?)').run(reminderStatus, appointmentId, 'pending', 'completed', 'cancelled')
    return this.db.prepare('SELECT id, patient_id AS patientId, kind_code AS kindCode, scheduled_at AS scheduledAt, status, revision FROM appointment WHERE id = ?').get(appointmentId)
  }
  updateAppointment(input) {
    const appointmentId = String(input?.appointmentId || '').trim()
    const scheduledAt = String(input?.scheduledAt || '').trim()
    if (!appointmentId || !isScheduledDate(scheduledAt)) throw new Error('请填写有效的预约时间')
    const current = this.db.prepare('SELECT id, patient_id AS patientId, kind_code AS kindCode, scheduled_at AS scheduledAt, note, related_treatment_event_id AS eventId FROM appointment WHERE id = ?').get(appointmentId)
    if (!current) throw new Error('未找到预约')
    const note = String(input?.note ?? current.note ?? '').trim() || null
    const delta = new Date(scheduledAt).getTime() - new Date(current.scheduledAt).getTime()
    this.db.exec('BEGIN')
    try {
      this.db.prepare('UPDATE appointment SET scheduled_at = ?, note = ?, revision = revision + 1 WHERE id = ?').run(scheduledAt, note, appointmentId)
      if (current.kindCode === 'chemotherapy' && current.eventId && delta !== 0) {
        this.db.prepare('UPDATE treatment_event SET scheduled_at = ? WHERE id = ?').run(scheduledAt, current.eventId)
        const siblings = this.db.prepare("SELECT id, scheduled_at AS scheduledAt FROM appointment WHERE related_treatment_event_id = ? AND id <> ? AND status = 'scheduled'").all(current.eventId, appointmentId)
        for (const sibling of siblings) {
          const siblingDate = shiftSchedule(sibling.scheduledAt, delta)
          this.db.prepare('UPDATE appointment SET scheduled_at = ?, revision = revision + 1 WHERE id = ?').run(siblingDate, sibling.id)
          const reminders = this.db.prepare("SELECT id, due_at AS dueAt FROM reminder WHERE appointment_id = ? AND status = 'pending'").all(sibling.id)
          for (const reminder of reminders) {
            const dueAt = shiftSchedule(reminder.dueAt, delta)
            this.db.prepare('UPDATE reminder SET due_at = ? WHERE id = ?').run(dueAt, reminder.id)
          }
        }
      }
      const reminders = this.db.prepare("SELECT id, due_at AS dueAt FROM reminder WHERE appointment_id = ? AND status = 'pending'").all(appointmentId)
      for (const reminder of reminders) {
        const dueAt = shiftSchedule(reminder.dueAt, delta)
        this.db.prepare('UPDATE reminder SET due_at = ? WHERE id = ?').run(dueAt, reminder.id)
      }
      this.db.exec('COMMIT')
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
    return this.db.prepare('SELECT id, patient_id AS patientId, kind_code AS kindCode, scheduled_at AS scheduledAt, organization, note, status, revision FROM appointment WHERE id = ?').get(appointmentId)
  }
  updateReminder(input) {
    const reminderId = String(input?.reminderId || '').trim(), dueAt = String(input?.dueAt || '').trim()
    if (!reminderId || !isScheduledDate(dueAt)) throw new Error('请填写有效的提醒时间')
    const result = this.db.prepare("UPDATE reminder SET due_at = ? WHERE id = ? AND status = 'pending'").run(dueAt, reminderId)
    if (!result.changes) throw new Error('提醒不存在或已处理')
    return this.db.prepare('SELECT id, patient_id AS patientId, appointment_id AS appointmentId, rule_code AS ruleCode, due_at AS dueAt, status FROM reminder WHERE id = ?').get(reminderId)
  }
  addSymptomRecord(input) {
    const patientId = String(input?.patientId || '').trim()
    const symptomCode = String(input?.symptomCode || '').trim()
    const severity = String(input?.severity || '').trim()
    const onsetAt = String(input?.onsetAt || '').trim()
    const note = String(input?.note || '').trim()
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    if (!symptomCode || !onsetAt || !['轻微', '中等', '明显', '未知'].includes(severity)) throw new Error('请填写症状、日期和程度')
    const id = randomUUID(), factId = randomUUID(), now = new Date().toISOString()
    this.db.exec('BEGIN')
    try {
      this.db.prepare(`INSERT INTO clinical_fact (id, patient_id, fact_type, status, occurred_from, recorded_at, source_kind, confirmed_by, confirmed_at, summary)
        VALUES (?, ?, 'symptom', 'confirmed', ?, ?, 'manual', 'patient', ?, ?)`)
        .run(factId, patientId, onsetAt, now, now, `${symptomCode} · ${severity}`)
      this.db.prepare(`INSERT INTO symptom_record (fact_id, symptom_code, severity, onset_at, note) VALUES (?, ?, ?, ?, ?)`)
        .run(factId, symptomCode, severity, onsetAt, note || null)
      this.db.exec('COMMIT')
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
    return { id: factId, patientId, symptomCode, severity, onsetAt, note }
  }
  listSymptomRecords(patientId) {
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    return this.db.prepare(`SELECT f.id, s.symptom_code AS symptomCode, s.severity, s.onset_at AS onsetAt, s.resolved_at AS resolvedAt, s.note
      FROM symptom_record s JOIN clinical_fact f ON f.id = s.fact_id
      WHERE f.patient_id = ? AND f.status = 'confirmed' ORDER BY s.onset_at DESC, f.recorded_at DESC`).all(patientId)
  }
  addCareRecord(input) {
    const patientId = String(input?.patientId || '').trim(), type = String(input?.type || '')
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    const id = randomUUID()
    if (type === 'toxicity') {
      const toxicityCode = String(input?.toxicityCode || '').trim(), onsetAt = String(input?.onsetAt || '').trim()
      const status = ['active', 'resolved', 'unknown'].includes(input?.status) ? input.status : 'unknown'
      if (!toxicityCode || !/^\d{4}-\d{2}-\d{2}$/.test(onsetAt)) throw new Error('请填写不适名称和发生日期')
      this.db.prepare(`INSERT INTO toxicity_record (id, patient_id, toxicity_code, ctcae_grade, onset_at, status)
        VALUES (?, ?, ?, ?, ?, ?)`).run(id, patientId, toxicityCode, String(input?.ctcaeGrade || '').trim() || null, onsetAt, status)
      return { id, type, patientId, toxicityCode, onsetAt, status }
    }
    if (type === 'comorbidity') {
      const comorbidityCode = String(input?.comorbidityCode || '').trim(), state = ['active', 'past', 'none', 'unknown'].includes(input?.state) ? input.state : ''
      if (!comorbidityCode || !state) throw new Error('请填写并发症名称和当前状态')
      const occurredAt = String(input?.occurredAt || '').trim()
      this.db.prepare(`INSERT INTO comorbidity_status (id, patient_id, comorbidity_code, state, severity, occurred_at)
        VALUES (?, ?, ?, ?, ?, ?)`).run(id, patientId, comorbidityCode, state, String(input?.severity || '').trim() || null, occurredAt || null)
      return { id, type, patientId, comorbidityCode, state, occurredAt: occurredAt || null }
    }
    if (type === 'medication') {
      const drugCode = String(input?.drugCode || '').trim(), startedAt = String(input?.startedAt || '').trim()
      if (!drugCode) throw new Error('请填写药物名称')
      const status = ['active', 'stopped', 'unknown'].includes(input?.status) ? input.status : 'active'
      this.db.prepare(`INSERT INTO medication_record (id, patient_id, drug_code, purpose_code, dose_text, route_code, started_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, patientId, drugCode, String(input?.purposeCode || '').trim() || null, String(input?.doseText || '').trim() || null, String(input?.routeCode || '').trim() || null, startedAt || null, status)
      return { id, type, patientId, drugCode, startedAt, status }
    }
    if (type === 'catheter') {
      const typeCode = ['PTCD', 'surgical', 'Port', 'PICC', 'other'].includes(input?.typeCode) ? input.typeCode : ''
      if (!typeCode) throw new Error('请选择管路类型')
      const status = ['in_place', 'removed', 'unknown'].includes(input?.status) ? input.status : 'unknown'
      this.db.prepare(`INSERT INTO catheter_record (id, patient_id, type_code, implant_date, site, status, hospital)
        VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, patientId, typeCode, String(input?.implantDate || '').trim() || null, String(input?.site || '').trim() || null, status, String(input?.hospital || '').trim() || null)
      return { id, type, patientId, typeCode, status }
    }
    if (type === 'catheter-maintenance') {
      const catheterId = String(input?.catheterId || '').trim(), date = String(input?.date || '').trim()
      if (!date || !this.db.prepare('SELECT 1 FROM catheter_record WHERE id = ? AND patient_id = ?').get(catheterId, patientId)) throw new Error('请选择当前患者的管路并填写维护日期')
      this.db.prepare(`INSERT INTO catheter_maintenance (id, catheter_id, date, action, performer, abnormal, next_planned_date, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, catheterId, date, String(input?.action || '').trim() || null, String(input?.performer || '').trim() || null, input?.abnormal === true || input?.abnormal === 'true' ? 1 : 0, String(input?.nextPlannedDate || '').trim() || null, String(input?.note || '').trim() || null)
      return { id, type, patientId, catheterId, date }
    }
    if (type === 'medication-status') {
      const medicationId = String(input?.medicationId || '').trim(), status = ['active', 'stopped', 'unknown'].includes(input?.status) ? input.status : ''
      if (!status || !this.db.prepare('SELECT 1 FROM medication_record WHERE id = ? AND patient_id = ?').get(medicationId, patientId)) throw new Error('药物记录或状态无效')
      this.db.prepare('UPDATE medication_record SET status = ?, ended_at = CASE WHEN ? = \'stopped\' THEN COALESCE(ended_at, ?) ELSE NULL END, revision = revision + 1 WHERE id = ? AND patient_id = ?')
        .run(status, status, new Date().toISOString().slice(0, 10), medicationId, patientId)
      return { id: medicationId, type, patientId, status }
    }
    throw new Error('不支持的照护记录类型')
  }
  listCareRecords(patientId) {
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    return {
      comorbidities: this.db.prepare(`SELECT id, comorbidity_code AS comorbidityCode, state, severity, occurred_at AS occurredAt FROM comorbidity_status WHERE patient_id = ? ORDER BY occurred_at DESC`).all(patientId),
      toxicities: this.db.prepare(`SELECT id, toxicity_code AS toxicityCode, ctcae_grade AS ctcaeGrade, onset_at AS onsetAt, resolved_at AS resolvedAt, status FROM toxicity_record WHERE patient_id = ? ORDER BY onset_at DESC`).all(patientId),
      medications: this.db.prepare(`SELECT id, drug_code AS drugCode, purpose_code AS purposeCode, dose_text AS doseText, route_code AS routeCode, started_at AS startedAt, ended_at AS endedAt, status FROM medication_record WHERE patient_id = ? ORDER BY started_at DESC`).all(patientId),
      catheters: this.db.prepare(`SELECT id, type_code AS typeCode, implant_date AS implantDate, site, status, hospital FROM catheter_record WHERE patient_id = ? ORDER BY implant_date DESC`).all(patientId).map((catheter) => ({ ...catheter, maintenance: this.db.prepare(`SELECT id, date, action, performer, abnormal, next_planned_date AS nextPlannedDate, note FROM catheter_maintenance WHERE catheter_id = ? ORDER BY date DESC`).all(catheter.id) })),
    }
  }
  addMolecularResult(input) {
    const patientId = String(input?.patientId || '').trim()
    const assayType = ['NGS', 'PCR', 'IHC', 'FISH', 'other'].includes(input?.assayType) ? input.assayType : ''
    const markerCode = String(input?.markerCode || '').trim()
    const resultType = ['negative', 'positive', 'percentage', 'score', 'cps', 'protein_expression', 'not_tested', 'unknown'].includes(input?.resultType) ? input.resultType : ''
    const resultRaw = String(input?.resultRaw || '').trim()
    const occurredAt = String(input?.occurredAt || '').trim()
    const parsePercent = (value) => value === '' || value == null ? null : Number(value)
    const vafPct = parsePercent(input?.vafPct), positivePct = parsePercent(input?.positivePct)
    const cps = input?.cps == null || input.cps === '' ? null : Number(input.cps)
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    if (!assayType || !markerCode || !resultType || !resultRaw || !occurredAt) throw new Error('请填写检测方法、靶点/标记、结果和检测日期')
    if ([vafPct, positivePct].some((value) => value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) || (cps !== null && (!Number.isFinite(cps) || cps < 0))) throw new Error('丰度和阳性比例需为 0–100；CPS 需为有效非负数')
    const sourceDocumentId = String(input?.sourceDocumentId || '').trim() || null
    if (sourceDocumentId && !this.db.prepare("SELECT 1 FROM document WHERE id = ? AND patient_id = ? AND status = 'active'").get(sourceDocumentId, patientId)) throw new Error('来源报告不属于当前患者')
    const factId = randomUUID(), id = randomUUID(), now = new Date().toISOString()
    const sourceKind = sourceDocumentId ? 'document' : 'manual'
    const resultStatus = resultType === 'negative' ? 'negative' : resultType === 'not_tested' ? 'not_tested' : resultType === 'unknown' ? 'unknown' : 'measured'
    this.db.exec('BEGIN')
    try {
      this.db.prepare(`INSERT INTO clinical_fact (id, patient_id, fact_type, status, occurred_from, recorded_at, source_kind, source_document_id, source_locator, confirmed_by, confirmed_at, summary)
        VALUES (?, ?, 'molecular_result', 'confirmed', ?, ?, ?, ?, ?, 'patient', ?, ?)`)
        .run(factId, patientId, occurredAt, now, sourceKind, sourceDocumentId, String(input?.sourceLocator || '').trim() || null, now, `${markerCode}: ${resultRaw}`)
      this.db.prepare(`INSERT INTO molecular_result (id, patient_id, fact_id, assay_type, marker_code, gene_code, result_type, result_raw, variant_hgvs, alteration_code, vaf_pct, intensity, positive_pct, cps, score_text, classification_code, test_method, status, occurred_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, patientId, factId, assayType, markerCode, String(input?.geneCode || '').trim() || null, resultType, resultRaw, String(input?.variantHgvs || '').trim() || null, String(input?.alterationCode || '').trim() || null, vafPct, String(input?.intensity || '').trim() || null, positivePct, cps, String(input?.scoreText || '').trim() || null, String(input?.classificationCode || '').trim() || null, String(input?.testMethod || '').trim() || null, resultStatus, occurredAt)
      this.db.exec('COMMIT')
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
    return { id, patientId, factId, assayType, markerCode, geneCode: input?.geneCode || null, resultType, resultRaw, vafPct, occurredAt, sourceDocumentId }
  }
  listMolecularResults(patientId) {
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    return this.db.prepare(`SELECT m.id, m.fact_id AS factId, m.assay_type AS assayType, m.marker_code AS markerCode, m.gene_code AS geneCode,
      m.result_type AS resultType, m.result_raw AS resultRaw, m.variant_hgvs AS variantHgvs, m.alteration_code AS alterationCode,
      m.vaf_pct AS vafPct, m.intensity, m.positive_pct AS positivePct, m.cps, m.score_text AS scoreText,
      m.classification_code AS classificationCode, m.test_method AS testMethod, m.occurred_at AS occurredAt,
      f.source_kind AS sourceKind, f.source_locator AS sourceLocator, f.source_document_id AS sourceDocumentId,
      d.title AS sourceDocumentTitle
      FROM molecular_result m JOIN clinical_fact f ON f.id = m.fact_id
      LEFT JOIN document d ON d.id = f.source_document_id
      WHERE m.patient_id = ? AND f.status = 'confirmed' ORDER BY m.occurred_at DESC, f.recorded_at DESC`).all(patientId)
  }
  addMoodCheckin(input) {
    const patientId = String(input?.patientId || '').trim()
    const mood = String(input?.mood || '').trim()
    const note = String(input?.note || '').trim()
    const occurredAt = String(input?.occurredAt || new Date().toISOString().slice(0, 10)).trim()
    const allowed = ['还不错', '有些担心', '很疲惫', '想找人聊聊']
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    if (!allowed.includes(mood) || !/^\d{4}-\d{2}-\d{2}$/.test(occurredAt)) throw new Error('请选择一种感受并核对记录日期')
    const definition = this.db.prepare("SELECT 1 FROM assessment_definition WHERE code = 'mood-checkin' AND version = '1'").get()
    if (!definition) throw new Error('心理感受记录定义尚未初始化')
    const id = randomUUID()
    this.db.prepare(`INSERT INTO assessment_response (id, patient_id, definition_code, definition_version, occurred_at, answers_json, score_json, status)
      VALUES (?, ?, 'mood-checkin', '1', ?, ?, '{}', 'confirmed')`)
      .run(id, patientId, occurredAt, JSON.stringify({ mood, note: note || null }))
    return { id, patientId, occurredAt, mood, note: note || null }
  }
  listMoodCheckins(patientId) {
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    return this.db.prepare(`SELECT id, occurred_at AS occurredAt, answers_json AS answersJson FROM assessment_response
      WHERE patient_id = ? AND definition_code = 'mood-checkin' AND status = 'confirmed' ORDER BY occurred_at DESC LIMIT 30`)
      .all(patientId).map((row) => ({ id: row.id, occurredAt: row.occurredAt, ...JSON.parse(row.answersJson) }))
  }
  listSupportResources(domainCode = 'palliative_care') {
    const rows = this.db.prepare(`SELECT id, domain_code AS domainCode, title, content_json AS contentJson,
      source_url AS sourceUrl, region_code AS regionCode, verified_at AS verifiedAt, updated_at AS updatedAt
      FROM support_resource WHERE domain_code = ? ORDER BY region_code, title`).all(domainCode)
    return rows.map((row) => ({ ...row, content: JSON.parse(row.contentJson) }))
  }
  createTreatmentCyclePlan(input) {
    const patientId = String(input?.patientId || '').trim(), regimen = String(input?.regimen || '').trim(), firstAt = String(input?.firstAt || '').trim()
    const cycleDays = Number(input?.cycleDays), cycleCount = Number(input?.cycleCount)
    const bloodTestLeadDays = input?.bloodTestLeadDays === '' || input?.bloodTestLeadDays == null ? 3 : Number(input.bloodTestLeadDays)
    const ctIntervalDays = input?.ctIntervalDays === '' || input?.ctIntervalDays == null ? 90 : Number(input.ctIntervalDays)
    const ctCount = input?.ctCount === '' || input?.ctCount == null ? 1 : Number(input.ctCount)
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    if (!regimen || !isScheduledDate(firstAt)) throw new Error('请填写化疗方案和首次计划时间')
    if (![cycleDays, cycleCount, bloodTestLeadDays, ctIntervalDays, ctCount].every(Number.isInteger) || cycleDays < 1 || cycleCount < 1 || cycleCount > 24 || bloodTestLeadDays < 0 || bloodTestLeadDays > 30 || ctIntervalDays < 30 || ctCount < 0 || ctCount > 8) throw new Error('请填写合理的周期、次数和提醒天数')
    const now = new Date().toISOString(), lineId = randomUUID()
    const nextLine = this.db.prepare('SELECT COALESCE(MAX(line_no), 0) + 1 AS lineNo FROM treatment_line WHERE patient_id = ?').get(patientId).lineNo
    const appointments = []
    this.db.exec('BEGIN')
    try {
      this.db.prepare(`INSERT INTO treatment_line (id, patient_id, line_no, regimen, status, started_at)
        VALUES (?, ?, ?, ?, 'planned', ?)`).run(lineId, patientId, nextLine, regimen, firstAt)
      const eventInsert = this.db.prepare(`INSERT INTO treatment_event (id, patient_id, line_id, event_type, cycle_no, day_no, scheduled_at, status)
        VALUES (?, ?, ?, 'chemotherapy', ?, 1, ?, 'planned')`)
      const appointmentInsert = this.db.prepare(`INSERT INTO appointment (id, patient_id, kind_code, scheduled_at, status, related_plan_id, related_treatment_event_id, note)
        VALUES (?, ?, ?, ?, 'scheduled', ?, ?, ?)`)
      const reminderInsert = this.db.prepare(`INSERT INTO reminder (id, patient_id, appointment_id, rule_code, due_at, status, payload_json)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)`)
      for (let index = 0; index < cycleCount; index += 1) {
        const scheduledAt = addDays(firstAt, index * cycleDays)
        const eventId = randomUUID()
        eventInsert.run(eventId, patientId, lineId, index + 1, scheduledAt)
        const chemoAppointmentId = randomUUID()
        appointmentInsert.run(chemoAppointmentId, patientId, 'chemotherapy', scheduledAt, lineId, eventId, `${regimen} · 第 ${index + 1} 次计划`)
        appointments.push({ id: chemoAppointmentId, kindCode: 'chemotherapy', scheduledAt })
        const bloodAt = addDays(scheduledAt, -bloodTestLeadDays)
        const bloodAppointmentId = randomUUID()
        appointmentInsert.run(bloodAppointmentId, patientId, 'blood-test', bloodAt, lineId, eventId, `化疗前血常规 · 第 ${index + 1} 次计划`)
        reminderInsert.run(randomUUID(), patientId, bloodAppointmentId, 'blood-test-before-chemotherapy', bloodAt, JSON.stringify({ treatmentLineId: lineId, cycleNo: index + 1 }))
        appointments.push({ id: bloodAppointmentId, kindCode: 'blood-test', scheduledAt: bloodAt })
      }
      for (let index = 1; index <= ctCount; index += 1) {
        const scheduledAt = addDays(firstAt, index * ctIntervalDays)
        const appointmentId = randomUUID()
        appointmentInsert.run(appointmentId, patientId, 'contrast-ct', scheduledAt, lineId, null, `增强 CT · 第 ${index} 次计划`)
        reminderInsert.run(randomUUID(), patientId, appointmentId, 'contrast-ct-follow-up', scheduledAt, JSON.stringify({ treatmentLineId: lineId, sequence: index }))
        appointments.push({ id: appointmentId, kindCode: 'contrast-ct', scheduledAt })
      }
      this.db.exec('COMMIT')
    } catch (error) { this.db.exec('ROLLBACK'); throw error }
    return { id: lineId, patientId, lineNo: nextLine, regimen, firstAt, cycleDays, cycleCount, appointments, createdAt: now }
  }
  listTreatmentCyclePlans(patientId) {
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    return this.db.prepare(`SELECT id, line_no AS lineNo, regimen, status, started_at AS startedAt, ended_at AS endedAt
      FROM treatment_line WHERE patient_id = ? ORDER BY started_at DESC, line_no DESC`).all(patientId).map((line) => ({
      ...line,
      events: this.db.prepare(`SELECT id, event_type AS eventType, cycle_no AS cycleNo, scheduled_at AS scheduledAt, status
        FROM treatment_event WHERE line_id = ? ORDER BY scheduled_at`).all(line.id),
    }))
  }
  addNutritionEntry(input) {
    const patientId = String(input?.patientId || '').trim()
    const occurredAt = String(input?.occurredAt || '').trim()
    const asNumber = (value) => value === '' || value === null || value === undefined ? null : Number(value)
    const weightKg = asNumber(input?.weightKg), intakeKcal = asNumber(input?.intakeKcal), proteinG = asNumber(input?.proteinG)
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    if (!occurredAt || [weightKg, intakeKcal, proteinG].some((value) => value !== null && !Number.isFinite(value))) throw new Error('请填写有效日期和数值')
    if (weightKg === null && intakeKcal === null && proteinG === null) throw new Error('请至少记录体重、能量或蛋白质中的一项')
    const id = randomUUID()
    this.db.prepare(`INSERT INTO nutrition_entry (id, patient_id, occurred_at, weight_kg, intake_kcal, protein_g, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, patientId, occurredAt, weightKg, intakeKcal, proteinG, String(input?.note || '').trim() || null)
    return { id, patientId, occurredAt, weightKg, intakeKcal, proteinG }
  }
  addNutritionProductUsage(input) {
    const patientId = String(input?.patientId || '').trim(), productName = String(input?.productName || '').trim(), occurredAt = String(input?.occurredAt || '').trim()
    const asNumber = (value) => value === '' || value === null || value === undefined ? null : Number(value)
    const volumeMl = asNumber(input?.volumeMl), energyKcal = asNumber(input?.energyKcal), proteinG = asNumber(input?.proteinG)
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    if (!productName || !occurredAt || [volumeMl, energyKcal, proteinG].some((value) => value !== null && !Number.isFinite(value))) throw new Error('请填写制剂名称、日期和有效数值')
    const id = randomUUID(), now = new Date().toISOString()
    this.db.prepare(`INSERT INTO nutrition_product_usage (id, patient_id, occurred_at, product_name, product_type, volume_ml, energy_kcal, protein_g, note, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(id, patientId, occurredAt, productName, String(input?.productType || '').trim() || null, volumeMl, energyKcal, proteinG, String(input?.note || '').trim() || null, now)
    return { id, patientId, occurredAt, productName, volumeMl, energyKcal, proteinG }
  }
  addPeiRecord(input) {
    const patientId = String(input?.patientId || '').trim(), occurredAt = String(input?.occurredAt || '').trim()
    const medicationRecordId = String(input?.medicationRecordId || '').trim() || null
    const withMeal = input?.withMeal === 'yes' || input?.withMeal === true ? 1 : input?.withMeal === 'no' || input?.withMeal === false ? 0 : null
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredAt)) throw new Error('请填写有效日期')
    if (medicationRecordId && !this.db.prepare('SELECT 1 FROM medication_record WHERE id = ? AND patient_id = ?').get(medicationRecordId, patientId)) throw new Error('所选用药记录不属于当前患者')
    const id = randomUUID()
    this.db.prepare(`INSERT INTO pei_record (id, patient_id, occurred_at, medication_record_id, with_meal, dose_text, stool_change_code, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, patientId, occurredAt, medicationRecordId, withMeal, String(input?.doseText || '').trim() || null, String(input?.stoolChangeCode || '').trim() || null, String(input?.note || '').trim() || null)
    return { id, patientId, occurredAt, medicationRecordId, withMeal, doseText: input?.doseText || null, stoolChangeCode: input?.stoolChangeCode || null, note: input?.note || null }
  }
  nutritionSummary(patientId) {
    const patient = this.db.prepare('SELECT height_cm AS heightCm FROM patient WHERE id = ?').get(patientId)
    if (!patient) throw new Error('未找到患者')
    const entries = this.db.prepare(`SELECT occurred_at AS occurredAt, weight_kg AS weightKg, intake_kcal AS intakeKcal, protein_g AS proteinG, note
      FROM nutrition_entry WHERE patient_id = ? ORDER BY occurred_at DESC LIMIT 20`).all(patientId)
    const products = this.db.prepare(`SELECT id, occurred_at AS occurredAt, product_name AS productName, product_type AS productType, volume_ml AS volumeMl,
      energy_kcal AS energyKcal, protein_g AS proteinG, note FROM nutrition_product_usage WHERE patient_id = ? ORDER BY occurred_at DESC LIMIT 20`).all(patientId)
    const peiRecords = this.db.prepare(`SELECT p.id, p.occurred_at AS occurredAt, p.medication_record_id AS medicationRecordId, m.drug_code AS medicationName,
      p.with_meal AS withMeal, p.dose_text AS doseText, p.stool_change_code AS stoolChangeCode, p.note
      FROM pei_record p LEFT JOIN medication_record m ON m.id = p.medication_record_id WHERE p.patient_id = ? ORDER BY p.occurred_at DESC LIMIT 30`).all(patientId)
    const latest = entries[0] || null
    const bmi = latest?.weightKg && patient.heightCm ? Number((latest.weightKg / ((patient.heightCm / 100) ** 2)).toFixed(1)) : null
    return { entries, products, peiRecords, latest: latest ? { ...latest, bmi } : null }
  }
  saveTrialBookmark(input) {
    const patientId = String(input?.patientId || '').trim(), trialKey = String(input?.trialKey || '').trim()
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    if (!trialKey) throw new Error('缺少试验登记号')
    const now = new Date().toISOString(), state = ['saved', 'contacted', 'archived'].includes(input?.state) ? input.state : 'saved'
    const trial = input?.snapshot && typeof input.snapshot === 'object' ? input.snapshot : {}
    const snapshot = JSON.stringify(Object.fromEntries(['trialKey', 'sourceCode', 'title', 'status', 'phase', 'indication', 'drugs', 'sponsor', 'detailUrl', 'eligibilityText', 'updatedAt'].filter((key) => trial[key] != null).map((key) => [key, String(trial[key]).slice(0, key === 'eligibilityText' ? 24000 : 4000)])))
    const existing = this.db.prepare('SELECT id, note, snapshot_json AS snapshotJson FROM trial_local_bookmark WHERE patient_id = ? AND trial_key = ?').get(patientId, trialKey)
    if (existing) {
      const note = input?.note == null ? existing.note : String(input.note).trim() || null
      const frozen = existing.snapshotJson && existing.snapshotJson !== '{}' ? existing.snapshotJson : snapshot
      this.db.prepare('UPDATE trial_local_bookmark SET state = ?, note = ?, snapshot_json = ?, updated_at = ? WHERE id = ?').run(state, note, frozen, now, existing.id)
      return { id: existing.id, patientId, trialKey, state, note, snapshot: JSON.parse(frozen || '{}'), updatedAt: now }
    }
    const id = randomUUID()
    const note = String(input?.note || '').trim() || null
    this.db.prepare(`INSERT INTO trial_local_bookmark (id, patient_id, trial_key, state, note, created_at, updated_at, snapshot_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, patientId, trialKey, state, note, now, now, snapshot)
    return { id, patientId, trialKey, state, note, snapshot: JSON.parse(snapshot), createdAt: now }
  }
  listTrialBookmarks(patientId) {
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    return this.db.prepare(`SELECT id, trial_key AS trialKey, state, note, snapshot_json AS snapshotJson, created_at AS createdAt, updated_at AS updatedAt
      FROM trial_local_bookmark WHERE patient_id = ? ORDER BY updated_at DESC`).all(patientId).map(({ snapshotJson, ...item }) => ({ ...item, snapshot: JSON.parse(snapshotJson || '{}') }))
  }
  createTrialSubscription(input) {
    const patientId = String(input?.patientId || '').trim(), queryText = String(input?.queryText || '').trim()
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    if (!queryText) throw new Error('请填写关注的靶点、药物或试验名称')
    const terms = Array.isArray(input?.targetTerms) ? input.targetTerms.map((item) => String(item).trim()).filter(Boolean).slice(0, 20) : []
    const id = randomUUID(), now = new Date().toISOString()
    this.db.prepare(`INSERT INTO trial_subscription (id, patient_id, query_text, target_terms_json, schedule_code, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'weekly', 'active', ?, ?)`).run(id, patientId, queryText, JSON.stringify(terms), now, now)
    return { id, patientId, queryText, targetTerms: terms, scheduleCode: 'weekly', status: 'active', createdAt: now }
  }
  listTrialSubscriptions(patientId) {
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    return this.db.prepare(`SELECT id, query_text AS queryText, target_terms_json AS targetTermsJson, schedule_code AS scheduleCode,
      status, last_checked_at AS lastCheckedAt, created_at AS createdAt, updated_at AS updatedAt
      FROM trial_subscription WHERE patient_id = ? ORDER BY updated_at DESC`).all(patientId).map((row) => ({ ...row, targetTerms: JSON.parse(row.targetTermsJson) }))
  }
  createAgentTask(input) {
    const patientId = String(input?.patientId || '').trim()
    const taskType = String(input?.taskType || 'page_advice').trim()
    const pageCode = String(input?.pageCode || '').trim()
    const agentRoleCode = String(input?.agentRoleCode || '').trim()
    const promptRendered = String(input?.promptRendered || '').trim()
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    if (!pageCode || !agentRoleCode || !promptRendered) throw new Error('建议任务缺少页面、角色或提示词')
    const id = randomUUID(), now = new Date().toISOString()
    const snapshot = JSON.stringify(input.inputSnapshot || {})
    const snapshotHash = createHash('sha256').update(snapshot).digest('hex')
    this.db.prepare(`INSERT INTO agent_task (id, patient_id, task_type, input_snapshot_json, prompt_template_version, skill_refs_json, status, created_at,
      page_code, agent_role_code, prompt_template_id, prompt_rendered, input_snapshot_hash, requested_by)
      VALUES (?, ?, ?, ?, 'v1', '[]', 'queued', ?, ?, ?, ?, ?, ?, 'patient')`)
      .run(id, patientId, taskType, snapshot, now, pageCode, agentRoleCode, `${pageCode}:v1`, promptRendered, snapshotHash)
    return { id, patientId, status: 'queued', pageCode, agentRoleCode, promptRendered }
  }
  attachAgentTaskSession(taskId, sessionRef) {
    const result = this.db.prepare("UPDATE agent_task SET session_ref = ? WHERE id = ? AND status = 'queued'").run(String(sessionRef || '').trim() || null, taskId)
    if (!result.changes) throw new Error('建议任务未找到或状态已变化')
    return { taskId, sessionRef: String(sessionRef || '').trim() || null }
  }
  listReviewItems(patientId) {
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    const tasks = this.db.prepare(`SELECT id, task_type AS taskType, page_code AS pageCode, agent_role_code AS agentRoleCode,
      status, prompt_rendered AS promptRendered, input_snapshot_json AS inputSnapshotJson, session_ref AS sessionRef, created_at AS createdAt
      FROM agent_task WHERE patient_id = ? ORDER BY created_at DESC LIMIT 100`).all(patientId).map(({ inputSnapshotJson, ...task }) => {
        const snapshot = JSON.parse(inputSnapshotJson || '{}')
        const trial = snapshot.trial && typeof snapshot.trial === 'object' ? snapshot.trial : null
        return { ...task, relatedTrial: trial ? { trialKey: trial.trialKey || trial.no || '', title: trial.title || '', sourceCode: trial.sourceCode || '' } : null }
      })
    const artifacts = this.db.prepare(`SELECT a.id, a.format_code AS formatCode, a.file_rel_path AS fileRelPath,
      a.created_at AS createdAt, s.scope_code AS scopeCode FROM export_artifact a
      JOIN report_snapshot s ON s.id = a.snapshot_id WHERE s.patient_id = ? ORDER BY a.created_at DESC LIMIT 100`).all(patientId)
    return { tasks, artifacts }
  }
  async readArtifact(artifactId) {
    const artifact = this.db.prepare(`SELECT a.file_rel_path AS fileRelPath, a.format_code AS formatCode
      FROM export_artifact a JOIN report_snapshot s ON s.id = a.snapshot_id WHERE a.id = ?`).get(String(artifactId || ''))
    if (!artifact) throw new Error('未找到导出文件')
    const absolute = resolve(this.root, artifact.fileRelPath)
    const pathFromRoot = relative(this.root, absolute)
    if (!pathFromRoot || pathFromRoot.startsWith('..') || pathFromRoot.startsWith('/')) throw new Error('导出文件路径无效')
    return { formatCode: artifact.formatCode, bytes: await readFile(absolute) }
  }
  async saveVisualReport(patientId, dataUrl, formatCode = 'jpeg') {
    const dashboard = this.dashboard(patientId)
    if (!['jpeg', 'pdf'].includes(formatCode)) throw new Error('图片报告只支持 JPEG 或 PDF')
    const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/]+=*)$/u.exec(String(dataUrl || ''))
    if (!match) throw new Error(`${formatCode.toUpperCase()} 报告图像数据格式无效`)
    const jpegBytes = Buffer.from(match[1], 'base64')
    if (!jpegBytes.length || jpegBytes.length > 8 * 1024 * 1024) throw new Error('报告图像大小需在 8 MiB 以内')
    if (jpegBytes.length < 4 || jpegBytes[0] !== 0xff || jpegBytes[1] !== 0xd8 || jpegBytes.at(-2) !== 0xff || jpegBytes.at(-1) !== 0xd9) throw new Error('报告图像内容不完整')
    const bytes = formatCode === 'pdf' ? jpegToPdf(jpegBytes) : jpegBytes
    const snapshotId = randomUUID(), artifactId = randomUUID(), now = new Date().toISOString()
    const relativePath = join('output', 'reports', patientId, `${snapshotId}.${formatCode}`), absolute = join(this.root, relativePath)
    await mkdir(dirname(absolute), { recursive: true }); await writeFile(absolute, bytes, { flag: 'wx', mode: 0o600 })
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    try {
      this.db.exec('BEGIN')
      this.db.prepare(`INSERT INTO report_snapshot (id, patient_id, scope_code, facts_json, document_refs_json, template_version, created_at, created_by)
        VALUES (?, ?, 'patient_summary', ?, '[]', 'v1', ?, 'patient')`).run(snapshotId, patientId, JSON.stringify(dashboard), now)
      this.db.prepare(`INSERT INTO export_artifact (id, snapshot_id, format_code, file_rel_path, sha256, template_version, created_at)
        VALUES (?, ?, ?, ?, ?, 'v1', ?)`).run(artifactId, snapshotId, formatCode, relativePath, sha256, now)
      this.db.exec('COMMIT')
    } catch (error) { this.db.exec('ROLLBACK'); await unlink(absolute).catch(() => {}); throw error }
    return { id: artifactId, snapshotId, formatCode, fileRelPath: relativePath, createdAt: now }
  }
  async saveJpegReport(patientId, dataUrl) { return this.saveVisualReport(patientId, dataUrl, 'jpeg') }
  latestAgentTaskSession(patientId) {
    return this.db.prepare(`SELECT session_ref AS sessionRef FROM agent_task
      WHERE patient_id = ? AND session_ref IS NOT NULL ORDER BY created_at DESC LIMIT 1`).get(patientId)?.sessionRef || null
  }
  dashboard(patientId) {
    const patient = this.db.prepare('SELECT id, display_name AS displayName, height_cm AS heightCm FROM patient WHERE id = ?').get(patientId)
    if (!patient) throw new Error('未找到患者')
    const latest = this.db.prepare(`WITH ranked AS (
        SELECT o.metric_code AS metricCode, o.value_num AS valueNum, o.value_raw AS valueRaw, o.unit_raw AS unitRaw, o.occurred_at AS occurredAt,
          ROW_NUMBER() OVER (PARTITION BY o.metric_code ORDER BY o.occurred_at DESC, f.recorded_at DESC) AS number
        FROM observation o JOIN clinical_fact f ON f.id = o.fact_id
        WHERE o.patient_id = ? AND f.status = 'confirmed'
      ) SELECT current.metricCode, current.valueNum, current.valueRaw, current.unitRaw, current.occurredAt,
        previous.valueNum AS previousValueNum, (current.valueNum - previous.valueNum) AS delta
      FROM ranked current LEFT JOIN ranked previous ON previous.metricCode = current.metricCode AND previous.number = 2
      WHERE current.number = 1 ORDER BY current.occurredAt DESC`).all(patientId)
    const upcoming = this.db.prepare(`SELECT id, kind_code AS kindCode, scheduled_at AS scheduledAt, organization, note, status
      FROM appointment WHERE patient_id = ? AND status = 'scheduled' ORDER BY scheduled_at LIMIT 100`).all(patientId)
    const reminders = this.db.prepare(`SELECT r.id, r.rule_code AS ruleCode, r.due_at AS dueAt, r.status, r.payload_json AS payloadJson,
        a.id AS appointmentId, a.kind_code AS kindCode, a.scheduled_at AS scheduledAt, a.note
      FROM reminder r LEFT JOIN appointment a ON a.id = r.appointment_id
      WHERE r.patient_id = ? AND r.status = 'pending' ORDER BY r.due_at LIMIT 20`).all(patientId)
      .map(({ payloadJson, ...item }) => ({ ...item, payload: JSON.parse(payloadJson || '{}') }))
    return { patient, latestObservations: latest, upcomingAppointments: upcoming, reminders, generatedAt: new Date().toISOString() }
  }
  observationHistory(patientId) {
    if (!this.db.prepare('SELECT 1 FROM patient WHERE id = ?').get(patientId)) throw new Error('未找到患者')
    return this.db.prepare(`WITH ranked AS (
        SELECT o.metric_code AS metricCode, o.value_num AS valueNum, o.value_raw AS valueRaw, o.unit_raw AS unitRaw,
          o.occurred_at AS occurredAt, ROW_NUMBER() OVER (
            PARTITION BY o.metric_code ORDER BY o.occurred_at DESC, f.recorded_at DESC
          ) AS number
        FROM observation o JOIN clinical_fact f ON f.id = o.fact_id
        WHERE o.patient_id = ? AND f.status = 'confirmed' AND o.value_num IS NOT NULL
      ) SELECT metricCode, valueNum, valueRaw, unitRaw, occurredAt
      FROM ranked WHERE number <= 5 ORDER BY metricCode, occurredAt`).all(patientId)
  }
  async exportPatientReport(patientId, formatCode = 'html') {
    const dashboard = this.dashboard(patientId)
    const snapshotId = randomUUID(), artifactId = randomUUID(), now = new Date().toISOString()
    const metrics = dashboard.latestObservations.map((metric) => `<tr><td>${escapeHtml(metric.metricCode)}</td><td>${escapeHtml(metric.valueRaw)} ${escapeHtml(metric.unitRaw || '')}</td><td>${escapeHtml(metric.occurredAt)}</td><td>${metric.delta == null ? '首次记录' : `较前次 ${metric.delta > 0 ? '+' : ''}${escapeHtml(metric.delta)}`}</td></tr>`).join('') || '<tr><td colspan="4">尚无已确认指标</td></tr>'
    const appointments = dashboard.upcomingAppointments.map((item) => `<li><strong>${escapeHtml(item.kindCode)}</strong>　${escapeHtml(item.scheduledAt)}${item.organization ? `　${escapeHtml(item.organization)}` : ''}</li>`).join('') || '<li>未来暂无已记录安排</li>'
    const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${escapeHtml(dashboard.patient.displayName)} · 病情报告</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#30423a;max-width:800px;margin:40px auto;padding:0 24px;line-height:1.6}h1{color:#d86f3d}table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #dfe8e1;padding:10px;text-align:left}small{color:#697a71}</style><h1>小胰宝 · 病情报告</h1><p><strong>患者：</strong>${escapeHtml(dashboard.patient.displayName)}　<strong>生成时间：</strong>${escapeHtml(now)}</p><p><small>本报告汇总已确认的本机记录，用于整理和与医生讨论；不包含诊断或治疗结论。</small></p><h2>当前指标</h2><table><thead><tr><th>项目</th><th>最近结果</th><th>日期</th><th>与前次比较</th></tr></thead><tbody>${metrics}</tbody></table><h2>未来安排</h2><ul>${appointments}</ul></html>`
    const markdown = [`# 小胰宝 · 病情报告`, '', `- 患者：${dashboard.patient.displayName}`, `- 生成时间：${now}`, '', '> 本报告汇总已确认的本机记录，用于整理和与医生讨论；不包含诊断或治疗结论。', '', '## 当前指标', '', '| 项目 | 最近结果 | 日期 | 与前次比较 |', '| --- | --- | --- | --- |', ...dashboard.latestObservations.map((metric) => `| ${metric.metricCode} | ${metric.valueRaw} ${metric.unitRaw || ''} | ${metric.occurredAt} | ${metric.delta == null ? '首次记录' : `${metric.delta > 0 ? '+' : ''}${metric.delta}`} |`), '', '## 未来安排', '', ...(dashboard.upcomingAppointments.map((item) => `- ${item.kindCode} · ${item.scheduledAt}${item.organization ? ` · ${item.organization}` : ''}`) || ['- 未来暂无已记录安排']), ''].join('\n')
    let bytes, extension = formatCode
    if (formatCode === 'html') bytes = Buffer.from(html)
    else if (formatCode === 'md') bytes = Buffer.from(markdown)
    else if (formatCode === 'docx') {
      const doc = new Document({ sections: [{ children: [
        new Paragraph({ text: '小胰宝 · 病情报告', heading: HeadingLevel.TITLE }),
        new Paragraph(`患者：${dashboard.patient.displayName}`), new Paragraph(`生成时间：${now}`),
        new Paragraph('本报告汇总已确认的本机记录，用于整理和与医生讨论；不包含诊断或治疗结论。'),
        new Paragraph({ text: '当前指标', heading: HeadingLevel.HEADING_1 }),
        ...dashboard.latestObservations.map((metric) => new Paragraph(`${metric.metricCode}：${metric.valueRaw} ${metric.unitRaw || ''}；日期 ${metric.occurredAt}；${metric.delta == null ? '首次记录' : `较前次 ${metric.delta > 0 ? '+' : ''}${metric.delta}`}`)),
        new Paragraph({ text: '未来安排', heading: HeadingLevel.HEADING_1 }),
        ...(dashboard.upcomingAppointments.map((item) => new Paragraph(`${item.kindCode} · ${item.scheduledAt}${item.organization ? ` · ${item.organization}` : ''}`)).length ? dashboard.upcomingAppointments.map((item) => new Paragraph(`${item.kindCode} · ${item.scheduledAt}${item.organization ? ` · ${item.organization}` : ''}`)) : [new Paragraph('未来暂无已记录安排')]),
      ] }] })
      bytes = await Packer.toBuffer(doc)
    } else throw new Error('目前支持 PDF、HTML、MD 和 DOCX 格式')
    const relative = join('output', 'reports', patientId, `${snapshotId}.${extension}`)
    const absolute = join(this.root, relative)
    await mkdir(dirname(absolute), { recursive: true })
    await writeFile(absolute, bytes, { flag: 'wx', mode: 0o600 })
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    try {
      this.db.exec('BEGIN')
      this.db.prepare(`INSERT INTO report_snapshot (id, patient_id, scope_code, facts_json, document_refs_json, template_version, created_at, created_by)
        VALUES (?, ?, 'patient_summary', ?, '[]', 'v1', ?, 'patient')`).run(snapshotId, patientId, JSON.stringify(dashboard), now)
      this.db.prepare(`INSERT INTO export_artifact (id, snapshot_id, format_code, file_rel_path, sha256, template_version, created_at)
        VALUES (?, ?, ?, ?, ?, 'v1', ?)`).run(artifactId, snapshotId, formatCode, relative, sha256, now)
      this.db.exec('COMMIT')
    } catch (error) { this.db.exec('ROLLBACK'); await unlink(absolute).catch(() => {}); throw error }
    return { id: artifactId, snapshotId, formatCode, fileRelPath: relative, createdAt: now }
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
}

export function jpegToPdf(jpeg) {
  let width, height
  for (let offset = 2; offset + 9 < jpeg.length;) {
    if (jpeg[offset] !== 0xff) { offset++; continue }
    const marker = jpeg[offset + 1]
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) { offset += 2; continue }
    const length = jpeg.readUInt16BE(offset + 2)
    if (length < 2 || offset + 2 + length > jpeg.length) break
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      height = jpeg.readUInt16BE(offset + 5); width = jpeg.readUInt16BE(offset + 7); break
    }
    offset += 2 + length
  }
  if (!width || !height) throw new Error('无法读取报告图像尺寸，未生成 PDF')
  const pageWidth = 595.28, pageHeight = Math.max(100, pageWidth * height / width)
  const content = Buffer.from(`q\n${pageWidth.toFixed(2)} 0 0 ${pageHeight.toFixed(2)} 0 0 cm\n/Im0 Do\nQ\n`)
  const objects = [
    Buffer.from('<< /Type /Catalog /Pages 2 0 R >>'),
    Buffer.from('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    Buffer.from(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),
    Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), jpeg, Buffer.from('\nendstream')]),
    Buffer.concat([Buffer.from(`<< /Length ${content.length} >>\nstream\n`), content, Buffer.from('endstream')]),
  ]
  const parts = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n')], offsets = [0]
  let position = parts[0].length
  objects.forEach((object, index) => {
    offsets.push(position)
    const wrapped = Buffer.concat([Buffer.from(`${index + 1} 0 obj\n`), object, Buffer.from('\nendobj\n')])
    parts.push(wrapped); position += wrapped.length
  })
  const xrefOffset = position
  const xref = [`xref\n0 ${objects.length + 1}\n`, '0000000000 65535 f \n', ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`)].join('')
  parts.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`))
  return Buffer.concat(parts)
}

function isScheduledDate(value) {
  return Number.isFinite(Date.parse(value))
}

function addDays(value, days) {
  const date = new Date(value)
  date.setDate(date.getDate() + days)
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function shiftSchedule(value, deltaMs) {
  const date = new Date(new Date(value).getTime() + deltaMs)
  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

