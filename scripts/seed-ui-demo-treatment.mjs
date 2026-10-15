// Add clearly marked treatment events for local timeline rendering checks.
// Usage: node scripts/seed-ui-demo-treatment.mjs <path-to-xyb.db> <path-to-demo-manifest.json>
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'

const [dbPath, manifestPath] = process.argv.slice(2)
if (!dbPath || !manifestPath) throw new Error('Usage: node scripts/seed-ui-demo-treatment.mjs <path-to-xyb.db> <path-to-demo-manifest.json>')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
if (manifest.kind !== 'ui-demo-seed' || !manifest.patientId) throw new Error('Refusing to seed: invalid UI demo manifest')
manifest.treatmentLineIds ||= []
manifest.treatmentEventIds ||= []
const stableId = (label) => {
  const hex = createHash('sha256').update(`xyb-ui-demo:${manifest.patientId}:${label}`).digest('hex').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}
const lineId = stableId('treatment-line')
const eventIds = Array.from({ length: 8 }, (_, index) => stableId(`treatment-event-${index + 1}`))
const db = new DatabaseSync(dbPath)
db.exec('PRAGMA foreign_keys = ON')
db.exec('BEGIN IMMEDIATE')
try {
  if (!db.prepare('SELECT 1 FROM patient WHERE id = ?').get(manifest.patientId)) throw new Error('UI demo patient does not exist')
  const existing = db.prepare('SELECT id FROM treatment_line WHERE id = ?').get(lineId)
  if (!existing) {
    const lineNo = db.prepare('SELECT COALESCE(MAX(line_no), 0) + 1 AS n FROM treatment_line WHERE patient_id = ?').get(manifest.patientId).n
    db.prepare(`INSERT INTO treatment_line (id, patient_id, line_no, regimen, status, started_at)
      VALUES (?, ?, ?, '[UI DEMO] 周期治疗方案（界面演示）', 'active', '2026-07-18')`).run(lineId, manifest.patientId, lineNo)
    const insertEvent = db.prepare(`INSERT INTO treatment_event
      (id, patient_id, line_id, event_type, cycle_no, day_no, scheduled_at, completed_at, status)
      VALUES (?, ?, ?, 'chemotherapy', ?, 1, ?, ?, ?)`)
    const dates = ['2026-07-18','2026-08-01','2026-08-15','2026-08-29','2026-09-12','2026-09-26','2026-10-10','2026-10-24']
    dates.forEach((date, index) => {
      const completed = index < 7
      insertEvent.run(eventIds[index], manifest.patientId, lineId, index + 1, date, completed ? date : null, completed ? 'completed' : 'planned')
    })
  }
  db.exec('COMMIT')
} catch (error) {
  db.exec('ROLLBACK')
  throw error
} finally { db.close() }
manifest.treatmentLineIds = [...new Set([...manifest.treatmentLineIds, lineId])]
manifest.treatmentEventIds = [...new Set([...manifest.treatmentEventIds, ...eventIds])]
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 })
console.log('Seeded 8 marked treatment events for UI timeline checks.')
