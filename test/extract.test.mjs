import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { extractObservationCandidates, htmlTablesToPipes, normalizeUnit, parseResultCell } from '../dsh/extract.js'

const fixture = await readFile(fileURLToPath(new URL('./fixtures/mineru-lab-report-html.md', import.meta.url)), 'utf8')
const byCode = (items) => Object.fromEntries(items.map((item) => [item.payload.metricCode, item.payload]))

test('MinerU 的 HTML 表格：按位置对齐，值与单位全部正确', () => {
  const items = extractObservationCandidates(fixture, null)
  const found = byCode(items)
  assert.equal(items.length, 12)
  assert.deepEqual(
    { value: found['CA19-9'].valueRaw, unit: found['CA19-9'].unitRaw },
    { value: '38', unit: 'U/mL' },
  )
  assert.equal(found.CEA.valueRaw, '5.2')
  assert.equal(found.WBC.valueRaw, '4.2')
  assert.equal(found.WBC.unitRaw, '10⁹/L', '10^9/L 应归一成 10⁹/L')
  assert.equal(found.HGB.valueRaw, '104')
  assert.equal(found.PLT.valueRaw, '210')
  assert.equal(found.ALT.valueRaw, '28')
  assert.equal(found.TBIL.unitRaw, 'μmol/L', 'umol/L 应归一成 μmol/L')
  assert.equal(found.CREA.valueRaw, '62')
  for (const item of items) assert.equal(item.payload.occurredAt, '2026-10-20')
})

test('前白蛋白不会被读成白蛋白，糖化血红蛋白不会被读成血红蛋白', () => {
  const found = byCode(extractObservationCandidates(fixture, null))
  assert.equal(found.PA.valueRaw, '0.21')
  assert.equal(found.ALB.valueRaw, '38.6')
  assert.equal(found.HbA1c.valueRaw, '6.1')
  assert.equal(found.HGB.valueRaw, '104')
})

test('不等式保留原样：＜0.5 不折成 0.5', () => {
  const found = byCode(extractObservationCandidates(fixture, null))
  assert.equal(found.CRP.comparator, '<')
  assert.equal(found.CRP.valueNum, 0.5)
  assert.equal(found.CRP.valueRaw, '<0.5')
})

test('参考区间不是结果：范围单元格不产候选', () => {
  assert.equal(parseResultCell('3.5-9.5'), null)
  assert.equal(parseResultCell('阴性'), null)
  assert.deepEqual(parseResultCell('104 g/L'), { comparator: '=', valueNum: 104, valueRaw: '104', unitFromCell: 'g/L' })
})

test('colspan 补齐占位：竖表不会因为少一列而串位', () => {
  const vertical = [
    '报告日期：2026-09-18',
    '<table><tr><td>项目</td><td>结果</td></tr><tr><td>血红蛋白</td><td colspan="2">104</td></tr><tr><td>白细胞</td><td colspan="2">4.2</td></tr></table>',
  ].join('\n')
  const items = extractObservationCandidates(vertical, null)
  const found = byCode(items)
  assert.equal(items.length, 2)
  assert.equal(found.HGB.valueRaw, '104')
  assert.equal(found.WBC.valueRaw, '4.2')
})

test('反例：先剥标签会把整表压成一行，一条指标也抽不出来', () => {
  // 这条测试锁住"转竖线表必须在剥标签之前"的顺序，防止后来人把清洗顺序调回去
  const stripped = fixture.replace(/<[^>]+>/g, '')
  assert.equal(extractObservationCandidates(stripped, null).length, 0)
  assert.ok(htmlTablesToPipes(fixture).includes('| 糖类抗原 19-9 | 38 |'), '转换后应是逐行竖线表')
})

test('纯文本行仍可抽（本机 TXT/MD 路径）', () => {
  const text = ['报告日期：2026-10-20', 'CA19-9：38 U/mL', 'CEA 5.2 ng/mL', '血红蛋白 104 g/L'].join('\n')
  const found = byCode(extractObservationCandidates(text, null))
  assert.equal(found['CA19-9'].valueRaw, '38')
  assert.equal(found['CA19-9'].unitRaw, 'U/mL')
  assert.equal(found.CEA.valueRaw, '5.2')
  assert.equal(found.HGB.valueRaw, '104')
})

test('CSV 按列名对齐，列序不同也能对上', () => {
  const csv = ['单位,项目,结果,日期', 'g/L,血红蛋白,104,2026-10-19', 'U/mL,CA19-9,38,2026-10-19'].join('\n')
  const found = byCode(extractObservationCandidates(csv, null))
  assert.equal(found.HGB.valueRaw, '104')
  assert.equal(found.HGB.unitRaw, 'g/L')
  assert.equal(found['CA19-9'].valueRaw, '38')
  assert.equal(found.HGB.occurredAt, '2026-10-19')
})

test('日期不合法就不产候选（2026-02-31）', () => {
  const text = ['报告日期：2026-02-31', '<table><tr><td>项目</td><td>结果</td></tr><tr><td>血红蛋白</td><td>104</td></tr></table>'].join('\n')
  assert.equal(extractObservationCandidates(text, null).length, 0)
})

test('抽不到任何指标时返回空数组，不抛错', () => {
  assert.deepEqual(extractObservationCandidates('# 一份没有指标的说明\n\n今天复查，一切按计划。', '2026-10-20'), [])
  assert.deepEqual(extractObservationCandidates('', null), [])
})

test('单位归一：只处理确定无歧义的写法', () => {
  assert.equal(normalizeUnit('10^9/L'), '10⁹/L')
  assert.equal(normalizeUnit('10*12/L'), '10¹²/L')
  assert.equal(normalizeUnit('umol/L'), 'μmol/L')
  assert.equal(normalizeUnit('（g/L）'), 'g/L')
  assert.equal(normalizeUnit(''), null)
})
