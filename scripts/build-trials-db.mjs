import { DatabaseSync } from 'node:sqlite'
import { mkdir, readdir, readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, values) => index % 2 === 0 ? [...pairs, [value.replace(/^--/, ''), values[index + 1]]] : pairs, []))
if (!args.source || !args.out) throw new Error('用法：node scripts/build-trials-db.mjs --source <CDE JSON 目录> --out <trials.db>')
const source = resolve(args.source), out = resolve(args.out)
await mkdir(dirname(out), { recursive: true })
const db = new DatabaseSync(out)
db.exec(`PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF;
CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS trial (trial_key TEXT PRIMARY KEY, source TEXT NOT NULL, title TEXT NOT NULL, status TEXT, phase TEXT, indication TEXT, drugs TEXT, sponsor TEXT, detail_url TEXT, eligibility_text TEXT, raw_json TEXT NOT NULL, updated_at TEXT);
CREATE INDEX IF NOT EXISTS ix_trial_status ON trial(status);
CREATE INDEX IF NOT EXISTS ix_trial_title ON trial(title); DELETE FROM trial; DELETE FROM metadata;`)
const files = (await readdir(source)).filter((file) => /^CTR\d+\.json$/u.test(file)).sort()
const insert = db.prepare('INSERT INTO trial VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
db.exec('BEGIN')
for (const file of files) {
  const item = JSON.parse(await readFile(`${source}/${file}`, 'utf8'))
  const details = item.details || {}, list = item.list_info || {}
  const title = details['试验通俗题目'] || details['试验专业题目'] || list.title || item.reg_no
  insert.run(item.reg_no, item.source?.platform || item.source || 'chinadrugtrials', title, details['试验状态'] || list.state || null, details['试验分期'] || null, details['适应症'] || list.indication || null, details['药物名称'] || list.drug_name || null, details['申请人名称'] || null, item.source?.detail_url || null, `入选标准：${details['入选标准'] || ''}\n排除标准：${details['排除标准'] || ''}`, JSON.stringify(item), item.scrape_time || null)
}
db.prepare('INSERT INTO metadata VALUES (?, ?)').run('source', 'chinadrugtrials pancreatic snapshot')
db.prepare('INSERT INTO metadata VALUES (?, ?)').run('record_count', String(files.length))
db.prepare('INSERT INTO metadata VALUES (?, ?)').run('built_at', new Date().toISOString())
db.exec('COMMIT; VACUUM;')
db.close()
console.log(`built ${out}: ${files.length} trials`)
