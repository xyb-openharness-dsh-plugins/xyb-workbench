#!/usr/bin/env node
// 冻结契约可执行校验器（无外部依赖，自实现 JSON Schema draft-07 子集）。
// 用法：
//   node validate.mjs                          # 跑内置示例（PASS + 反例 FAIL 演示）
//   node validate.mjs --file some.json --kind match_assessment
//   node validate.mjs --dir /path/xyb.db       # 抽查业务库已有的 inputs_frozen_json / facts_json
import { readFileSync, existsSync } from 'fs';
import { DatabaseSync } from 'node:sqlite';

// ---- 极简 JSON Schema 校验（覆盖本契约用到的关键字） ----
function validate(schema, data, path = '$') {
  const errs = [];
  const typeOf = (v) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v);
  const expectType = (t) => {
    if (t === 'integer') return typeOf(data) === 'number' && Number.isInteger(data);
    if (Array.isArray(t)) return t.some((x) => x === 'integer'
      ? (typeOf(data) === 'number' && Number.isInteger(data))
      : typeOf(data) === x);
    return typeOf(data) === t;
  };
  if (schema.type && !expectType(schema.type)) { errs.push(`${path}: 期望类型 ${schema.type}，实际 ${typeOf(data)}`); return errs; }
  if (schema.const !== undefined && data !== schema.const) errs.push(`${path}: 必须为常量 ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(data)) errs.push(`${path}: 不在枚举 ${JSON.stringify(schema.enum)}`);
  if (schema.minLength !== undefined && typeof data === 'string' && data.length < schema.minLength)
    errs.push(`${path}: 长度需 >= ${schema.minLength}`);
  if (schema.minItems !== undefined && Array.isArray(data) && data.length < schema.minItems)
    errs.push(`${path}: 数组长度需 >= ${schema.minItems}`);
  if (schema.type === 'object' && data && typeof data === 'object') {
    const required = schema.required || [];
    for (const k of required) if (!(k in data)) errs.push(`${path}.${k}: 必填缺失`);
    if (schema.additionalProperties === false) {
      for (const k of Object.keys(data)) if (!(k in (schema.properties || {}))) errs.push(`${path}.${k}: 不允许的额外字段`);
    }
    if (schema.properties) for (const k of Object.keys(schema.properties))
      if (k in data) errs.push(...validate(schema.properties[k], data[k], `${path}.${k}`));
  }
  if (schema.type === 'array' && Array.isArray(data) && schema.items)
    data.forEach((it, i) => errs.push(...validate(schema.items, it, `${path}[${i}]`)));
  return errs;
}

const schemas = {
  match_assessment: JSON.parse(readFileSync(new URL('./match_assessment.schema.json', import.meta.url), 'utf8')),
  report_snapshot: JSON.parse(readFileSync(new URL('./report_snapshot.schema.json', import.meta.url), 'utf8')),
};

function check(kind, obj) {
  const errs = validate(schemas[kind], obj);
  // §3 强化：frozen_rule_set 中每条 rule_version 与 source_text 必须同时存在（不为空）
  if (kind === 'match_assessment' && obj.frozen_rule_set) {
    for (const r of obj.frozen_rule_set) {
      if (!r.rule_version || !r.source_text) errs.push(`frozen_rule_set: rule_id=${r.rule_id} 必须同时冻结 rule_version 与 source_text（不能只存 rule_id）`);
    }
    const ids = new Set(obj.frozen_rule_set.map(r => r.rule_id));
    if (obj.evaluations && obj.evaluations.some(e => !ids.has(e.rule_id)))
      errs.push('evaluations 引用了 frozen_rule_set 中不存在的 rule_id');
  }
  return errs;
}

const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
const dirIdx = args.indexOf('--dir');
const kindIdx = args.indexOf('--kind');

if (fileIdx >= 0) {
  const kind = args[kindIdx + 1] || 'match_assessment';
  const obj = JSON.parse(readFileSync(args[fileIdx], 'utf8'));
  const errs = check(kind, obj);
  console.log(errs.length ? `FAIL ${args[fileIdx]}\n - ` + errs.join('\n - ') : `PASS ${args[fileIdx]}`);
  process.exit(errs.length ? 1 : 0);
}
if (dirIdx >= 0) {
  const db = new DatabaseSync(args[dirIdx + 1], { readOnly: true });
  let total = 0, bad = 0;
  for (const row of db.prepare('SELECT id, inputs_frozen_json FROM match_assessment').all()) {
    total++; if (check('match_assessment', JSON.parse(row.inputs_frozen_json)).length) { bad++; console.log('BAD match_assessment', row.id); }
  }
  for (const row of db.prepare('SELECT id, facts_json FROM report_snapshot').all()) {
    total++; if (check('report_snapshot', JSON.parse(row.facts_json)).length) { bad++; console.log('BAD report_snapshot', row.id); }
  }
  console.log(`抽查 ${args[dirIdx + 1]}: ${total} 行, ${bad} 违规`);
  process.exit(0);
}

// 内置示例
const goodMA = {
  schema_version: 'freeze/v1', patient_id: 'p1', trial_key: 'ctgov:NCT123',
  profile: { profile_revision: 'rev3', facts: [{ fact_id: 'f1', fact_type: 'observation', value_state: 'measured', value_raw: '>1000', value_num: 1200, comparator: '>', occurred_at: '2026-01-01' }] },
  frozen_rule_set: [{ rule_id: 'r1', rule_version: 'v2', source_text: '-organ involved...', rule_type: 'exclusion' }],
  generation_ids: ['gen2026q4'], evaluator_version: 'eval1.4',
  evaluations: [{ rule_id: 'r1', rule_version: 'v2', result_code: 'unknown', needs_confirmation: ['r1'] }]
};
const goodRS = {
  schema_version: 'freeze/v1', scope_code: 'summary', template_version: 'tpl2',
  facts: [{ fact_id: 'f1', fact_type: 'observation', value_state: 'measured', value_raw: '>1000', value_num: 1200, comparator: '>', occurred_at: '2026-01-01', source_kind: 'document' }],
  document_refs: [{ document_id: 'd1', page_no: 3, source_locator: 'pg3' }]
};
const badNoSourceText = JSON.parse(JSON.stringify(goodMA));
badNoSourceText.frozen_rule_set[0].source_text = ''; // 违反 §3：只存 rule_version 未冻结原文

console.log('示例 match_assessment (good):', check('match_assessment', goodMA).length ? 'FAIL' : 'PASS');
console.log('示例 report_snapshot (good):', check('report_snapshot', goodRS).length ? 'FAIL' : 'PASS');
const e = check('match_assessment', badNoSourceText);
console.log('反例（缺 source_text 冻结）:', e.length ? 'FAIL 正确拦截 -> ' + e.join('; ') : 'PASS（错误！）');
