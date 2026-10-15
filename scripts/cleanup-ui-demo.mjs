// Release preparation: delete only observation records listed in an external demo manifest.
// Usage: node scripts/cleanup-ui-demo.mjs <path-to-xyb.db> <path-to-demo-manifest.json>
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'

const [dbPath, manifestPath] = process.argv.slice(2)
if (!dbPath || !manifestPath) throw new Error('Usage: node scripts/cleanup-ui-demo.mjs <path-to-xyb.db> <path-to-demo-manifest.json>')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
if (manifest.kind !== 'ui-demo-seed' || !manifest.patientId || !['observationIds','molecularResultIds','nutritionEntryIds','treatmentEventIds','treatmentLineIds'].some((key) => Array.isArray(manifest[key]) && manifest[key].length)) throw new Error('Refusing to delete: invalid demo manifest')
const db = new DatabaseSync(dbPath)
db.exec('PRAGMA foreign_keys = ON')
const find = db.prepare("SELECT patient_id AS patientId, summary FROM clinical_fact WHERE id = ? AND fact_type = 'observation'")
const removeObservation = db.prepare('DELETE FROM observation WHERE fact_id = ?')
const removeFact = db.prepare("DELETE FROM clinical_fact WHERE id = ? AND fact_type = 'observation' AND summary LIKE '[UI DEMO] %'")
const findEvent = db.prepare('SELECT patient_id AS patientId, line_id AS lineId FROM treatment_event WHERE id = ?')
const removeEvent = db.prepare('DELETE FROM treatment_event WHERE id = ?')
const findLine = db.prepare('SELECT patient_id AS patientId, regimen FROM treatment_line WHERE id = ?')
const removeLine = db.prepare("DELETE FROM treatment_line WHERE id = ? AND regimen LIKE '[UI DEMO] %'")
const findMolecular = db.prepare(`SELECT m.patient_id AS patientId, m.fact_id AS factId, f.source_locator AS sourceLocator
  FROM molecular_result m JOIN clinical_fact f ON f.id = m.fact_id WHERE m.id = ?`)
const removeMolecular = db.prepare('DELETE FROM molecular_result WHERE id = ?')
const removeMolecularFact = db.prepare("DELETE FROM clinical_fact WHERE id = ? AND fact_type = 'molecular_result'")
const findNutrition = db.prepare('SELECT patient_id AS patientId, note FROM nutrition_entry WHERE id = ?')
const removeNutrition = db.prepare("DELETE FROM nutrition_entry WHERE id = ? AND note LIKE '[UI DEMO] prototype-v3 模拟营养记录%'")
db.exec('BEGIN IMMEDIATE')
try {
  let removed = 0
  for (const id of manifest.observationIds || []) {
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
  let removedMolecular = 0
  for (const id of manifest.molecularResultIds || []) {
    const fact = findMolecular.get(id)
    if (!fact) continue
    if (fact.patientId !== manifest.patientId || fact.sourceLocator !== '模拟数据 · prototype-v3 · 仅用于界面演示，请勿作为真实检测结果') throw new Error('Refusing to delete an unmarked or unrelated molecular result')
    removeMolecular.run(id)
    removedMolecular += Number(removeMolecularFact.run(fact.factId).changes)
  }
  let removedNutrition = 0
  for (const id of manifest.nutritionEntryIds || []) {
    const record = findNutrition.get(id)
    if (!record) continue
    if (record.patientId !== manifest.patientId || !record.note?.startsWith('[UI DEMO] prototype-v3 模拟营养记录')) throw new Error('Refusing to delete an unmarked or unrelated nutrition record')
    removedNutrition += Number(removeNutrition.run(id).changes)
  }
  if (manifest.demoHeightWasSet) db.prepare('UPDATE patient SET height_cm = NULL, updated_at = ? WHERE id = ? AND height_cm = 170').run(new Date().toISOString(), manifest.patientId)
  db.exec('COMMIT')
  console.log(`Removed ${removed} marked UI demo observations, ${removedNutrition} nutrition records, ${removedEvents} treatment events, ${removedLines} treatment lines, and ${removedMolecular} simulated molecular/IHC results.`)
} catch (error) {
  db.exec('ROLLBACK')
  throw error
} finally { db.close() }
