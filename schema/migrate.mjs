#!/usr/bin/env node
// 小胰宝工作台 · SQLite 迁移执行器
// 运行：node migrate.mjs --db /path/xyb.db --dir . [--backup-dir /path/backups] [--check]
// 要求：node:sqlite（Node 22.5+，实验性 API，升级 Node 主版本后须复测）。
// 策略：先备份 → 事务内执行 → 校验 → WAL checkpoint。失败则整体回滚，不留下半成品。

import { DatabaseSync } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { readdir, readFile, copyFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 2) out[argv[i].replace(/^--/, '')] = argv[i + 1];
  return out;
}

const args = parseArgs(process.argv);
if (!args.db) {
  console.error('缺少参数：--db <xyb.db 路径> [--dir <迁移目录>] [--backup-dir <备份目录>] [--check]');
  process.exit(2);
}
const dbPath = path.resolve(args.db);
const dir = path.resolve(args.dir || '.');
const backupDir = args['backup-dir'] ? path.resolve(args['backup-dir']) : null;
const checkOnly = 'check' in args;

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function nowIso() {
  return new Date().toISOString();
}

async function listMigrations() {
  const files = (await readdir(dir)).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
  const out = [];
  for (const f of files) {
    const sql = await readFile(path.join(dir, f), 'utf8');
    const version = Number(f.slice(0, 4));
    const m = sql.match(/PRAGMA\s+user_version\s*=\s*(\d+)/i);
    if (!m) throw new Error(`${f} 缺少 PRAGMA user_version`);
    if (Number(m[1]) !== version) throw new Error(`${f} 文件名版本 ${version} 与 PRAGMA user_version ${m[1]} 不一致`);
    out.push({ version, name: f, sql, checksum: sha256(sql) });
  }
  return out;
}

async function backup(dbPath) {
  if (!backupDir) return null;
  await mkdir(backupDir, { recursive: true });
  const stamp = nowIso().replace(/[:.]/g, '-');
  const base = path.basename(dbPath, '.db');
  const target = path.join(backupDir, `${base}-${stamp}.db`);
  // 先 checkpoint，再复制，避免复制到未合并的 WAL 内容
  const ck = new DatabaseSync(dbPath);
  ck.exec('PRAGMA journal_mode = WAL');
  ck.exec('PRAGMA wal_checkpoint(TRUNCATE)');
  ck.close();
  await copyFile(dbPath, target);
  for (const suffix of ['-wal', '-shm']) {
    try {
      await access(dbPath + suffix);
      await copyFile(dbPath + suffix, target + suffix);
    } catch {
      // 无 WAL/SHM 文件属正常情况
    }
  }
  return target;
}

const migrations = await listMigrations();

if (checkOnly) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migration (
    version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL, checksum TEXT NOT NULL)`);
  const applied = db.prepare('SELECT version, name, checksum FROM schema_migration ORDER BY version').all();
  let bad = 0;
  for (const a of applied) {
    const m = migrations.find((x) => x.version === a.version);
    if (!m) { console.error(`版本 ${a.version} 已应用但文件缺失`); bad++; continue; }
    if (m.checksum !== a.checksum) { console.error(`${m.name} 校验和不匹配（已应用版本被改动）`); bad++; }
  }
  const pending = migrations.filter((m) => !applied.some((a) => a.version === m.version));
  console.log(`已应用 ${applied.length} · 待应用 ${pending.map((p) => p.name).join(', ') || '无'}`);
  db.close();
  process.exit(bad ? 1 : 0);
}

const backupPath = await backup(dbPath);
if (backupPath) console.log(`已备份：${backupPath}`);

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS schema_migration (
  version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL, checksum TEXT NOT NULL)`);

const appliedRows = db.prepare('SELECT version, checksum FROM schema_migration').all();
const appliedMap = new Map(appliedRows.map((r) => [r.version, r.checksum]));

let applied = 0;
for (const m of migrations) {
  if (appliedMap.has(m.version)) {
    if (appliedMap.get(m.version) !== m.checksum) {
      db.close();
      throw new Error(`迁移 ${m.name} 已应用但文件被修改，拒绝继续`);
    }
    continue;
  }
  const body = m.sql.replace(/PRAGMA\s+user_version\s*=\s*\d+\s*;/i, '');
  try {
    db.exec('BEGIN');
    db.exec(body);
    db.prepare('INSERT INTO schema_migration (version, name, applied_at, checksum) VALUES (?, ?, ?, ?)')
      .run(m.version, m.name, nowIso(), m.checksum);
    db.exec(`PRAGMA user_version = ${m.version}`);
    db.exec('COMMIT');
    applied++;
    console.log(`已应用 ${m.name}`);
  } catch (err) {
    db.exec('ROLLBACK');
    db.close();
    console.error(`迁移 ${m.name} 失败并已回滚：${err.message}`);
    process.exit(1);
  }
}

const fk = db.prepare('PRAGMA foreign_key_check').all();
if (fk.length) { console.error('外键检查未通过', fk); db.close(); process.exit(1); }
const ic = db.prepare('PRAGMA integrity_check').get();
if (ic.integrity_check !== 'ok') { console.error('完整性检查未通过', ic); db.close(); process.exit(1); }
db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
const uv = db.prepare('PRAGMA user_version').get();
console.log(`完成：新增 ${applied} 个迁移，user_version=${uv.user_version}`);
db.close();
