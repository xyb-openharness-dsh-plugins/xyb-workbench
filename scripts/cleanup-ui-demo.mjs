// Release preparation: delete only observation records listed in an external demo manifest.
// Usage: node scripts/cleanup-ui-demo.mjs <path-to-xyb.db> <path-to-demo-manifest.json>
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'

const [dbPath, manifestPath] = process.argv.slice(2)
if (!dbPath || !manifestPath) throw new Error('Usage: node scripts/cleanup-ui-demo.mjs <path-to-xyb.db> <path-to-demo-manifest.json>')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
if (manifest.kind !== 'ui-demo-seed' || !Array.isArray(manifest.observationIds) || !manifest.observationIds.length) throw new Error('Refusing to delete: invalid demo manifest')
const db = new DatabaseSync(dbPath)
db.exec('PRAGMA foreign_keys = ON')
const find = db.prepare("SELECT patient_id AS patientId, summary FROM clinical_fact WHERE id = ? AND fact_type = 'observation'")
const removeObservation = db.prepare('DELETE FROM observation WHERE fact_id = ?')
const removeFact = db.prepare("DELETE FROM clinical_fact WHERE id = ? AND fact_type = 'observation' AND summary LIKE '[UI DEMO] %'")
const findEvent = db.prepare('SELECT patient_id AS patientId, line_id AS lineId FROM treatment_event WHERE id = ?')
const removeEvent = db.prepare('DELETE FROM treatment_event WHERE id = ?')
const findLine = db.prepare('SELECT patient_id AS patientId, regimen FROM treatment_line WHERE id = ?')
const removeLine = db.prepare("DELETE FROM treatment_line WHERE id = ? AND regimen LIKE '[UI DEMO] %'")
db.exec('BEGIN IMMEDIATE')
try {
  let removed = 0
  for (const id of manifest.observationIds) {
    const fact = find.get(id)
    if (!fact) continue
    if (fact.patientId !== manifest.patientId || !fact.summary?.startsWith('[UI DEMO] ')) throw new Error('Refusing to delete an unmarked or unrelated record')
    removeObservation.run(id)
    removed += Number(removeFact.run(id).changes)
  }
  let removedEvents = 0
  for (const id of manifest.treatmentEventIds || []) {
    const event = findEvent.get(id)
    if (!event) continue
    if (event.patientId !== manifest.patientId || !(manifest.treatmentLineIds || []).includes(event.lineId)) throw new Error('Refusing to delete an unmarked or unrelated treatment event')
    removedEvents += Number(removeEvent.run(id).changes)
  }
  let removedLines = 0
  for (const id of manifest.treatmentLineIds || []) {
    const line = findLine.get(id)
    if (!line) continue
    if (line.patientId !== manifest.patientId || !line.regimen?.startsWith('[UI DEMO] ')) throw new Error('Refusing to delete an unmarked or unrelated treatment line')
    removedLines += Number(removeLine.run(id).changes)
  }
  db.exec('COMMIT')
  console.log(`Removed ${removed} marked UI demo observations, ${removedEvents} treatment events, and ${removedLines} treatment lines.`)
} catch (error) {
  db.exec('ROLLBACK')
  throw error
} finally { db.close() }
