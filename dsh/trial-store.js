import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const trialDbPath = fileURLToPath(new URL('../assets/trials.db', import.meta.url))
let database

function db() { return database ||= new DatabaseSync(trialDbPath, { readOnly: true }) }

export function trialMetadata() {
  return Object.fromEntries(db().prepare('SELECT key, value FROM metadata').all().map((row) => [row.key, row.value]))
}
export function searchTrials(query, limit = 30, filters = {}) {
  const term = String(query || '').trim()
  const queryLimit = Math.max(limit, 500)
  const rows = term
    ? db().prepare(`SELECT trial_key AS trialKey, source AS sourceCode, title, status, phase, indication, drugs, sponsor, updated_at AS updatedAt FROM trial
      WHERE title LIKE ? OR indication LIKE ? OR drugs LIKE ? OR eligibility_text LIKE ? ORDER BY updated_at DESC LIMIT ?`).all(...Array(4).fill(`%${term}%`), queryLimit)
    : db().prepare('SELECT trial_key AS trialKey, source AS sourceCode, title, status, phase, indication, drugs, sponsor, updated_at AS updatedAt FROM trial ORDER BY updated_at DESC LIMIT ?').all(queryLimit)
  return rows.filter((row) => {
    if (filters.source === 'cnctr' && !/中国药物临床试验登记|ChiCTR/i.test(row.sourceCode || '')) return false
    if (filters.recruitment === 'recruiting' && !/招募|进行中/u.test(row.status || '')) return false
    return true
  }).slice(0, limit)
}
export function trialDetail(trialKey) {
  const row = db().prepare('SELECT trial_key AS trialKey, source AS sourceCode, title, status, phase, indication, drugs, sponsor, detail_url AS detailUrl, eligibility_text AS eligibilityText, updated_at AS updatedAt FROM trial WHERE trial_key = ?').get(trialKey)
  if (!row) throw new Error('未找到试验')
  return row
}
