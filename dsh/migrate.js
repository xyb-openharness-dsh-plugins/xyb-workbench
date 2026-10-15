import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

function checksum(value) { return createHash('sha256').update(value).digest('hex') }

export async function applyMigrations(db, directory) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migration (
    version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL, checksum TEXT NOT NULL
  )`)
  const names = (await readdir(directory)).filter((name) => /^\d{4}_.*\.sql$/.test(name)).sort()
  const applied = new Map(db.prepare('SELECT version, checksum FROM schema_migration').all().map((row) => [row.version, row.checksum]))
  for (const name of names) {
    const version = Number(name.slice(0, 4))
    const sql = await readFile(join(directory, name), 'utf8')
    const expected = checksum(sql)
    const marker = sql.match(/PRAGMA\s+user_version\s*=\s*(\d+)\s*;/i)
    if (!marker || Number(marker[1]) !== version) throw new Error(`${name} 的 user_version 无效`)
    if (applied.has(version)) {
      if (applied.get(version) !== expected) throw new Error(`迁移 ${name} 已应用但文件被修改`)
      continue
    }
    db.exec('BEGIN')
    try {
      db.exec(sql.replace(/PRAGMA\s+user_version\s*=\s*\d+\s*;/i, ''))
      db.prepare('INSERT INTO schema_migration (version, name, applied_at, checksum) VALUES (?, ?, ?, ?)')
        .run(version, name, new Date().toISOString(), expected)
      db.exec(`PRAGMA user_version = ${version}`)
      db.exec('COMMIT')
    } catch (error) { db.exec('ROLLBACK'); throw error }
  }
  const violations = db.prepare('PRAGMA foreign_key_check').all()
  if (violations.length) throw new Error('数据库外键检查失败')
}
