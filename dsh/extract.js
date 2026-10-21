/**
 * 小胰宝工作台 · 文档 markdown → 候选指标
 *
 * 职责边界：**只抄写，不判断**。这里不产生任何结论、不做趋势判断、不写"是否复发"，
 * 只把报告原文里的「项目 / 结果 / 单位 / 日期」抄成候选，等用户逐条核对。
 *
 * 三个必须守住的规则：
 *   1. **先转竖线表，再对齐**。MinerU 的 full.md 里表格是 `<table><tr><td>` HTML，
 *      不是 markdown 管道表。若先 `replace(/<[^>]+>/g, '')` 剥标签，整张表会被压成
 *      一行连续文本（`项目结果单位CA19-938U/mL…`），于是"指标名后取第一个数"跨表串位：
 *      看着不报错，数值全错。详见 htmlTablesToPipes()。
 *   2. **按位置对齐**。第 i 个项目配第 i 个结果/单位；项目数与数值数不一致就整行放弃。
 *      宁可漏一条让用户手填，也不能把 8 个项目写成同一个数。
 *   3. **参考区间不是结果**。`3.5-9.5` 这类范围、`阴性/阳性` 这类定性词都不产候选；
 *      `＜0.5` 保留不等号、不改写成 0.5——折成具体值就是替用户下结论。
 */

/** 常见上标，避免把 10^9/L 写成 10*9/L */
const SUPERSCRIPT = { 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', 12: '¹²' }

const ENTITIES = { '&lt;': '<', '&gt;': '>', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }

/** HTML 实体要还原：MinerU 会把 `<0.5` 写成 `&lt;0.5`，不还原就认不出不等号 */
function decodeEntities(text) {
  return String(text).replace(/&(?:lt|gt|amp|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity)
}

/**
 * 把 markdown 里的 HTML 表格转成竖线表，并补一条 `| --- |` 分隔行。
 *
 * 为什么必须做：见文件头第 1 条。`colspan="2"` 要补一个空单元格占位（不复制内容），
 * 否则后面所有列都会左移一列——这个 bug 只表现为"少一列"，不报错。
 *
 * 正则必须写 `["']?`。写成 `"?'` 会被解析成「可选双引号 + 字面单引号」，
 * `colspan="2"` 完全匹配不上，现象同样是静默少一列。
 */
export function htmlTablesToPipes(markdown) {
  const source = String(markdown ?? '')
  if (!/<table/i.test(source)) return source
  return source.replace(/<table[\s\S]*?<\/table>/gi, (table) => {
    const rows = table.match(/<tr[\s\S]*?<\/tr>/gi) || []
    const lines = []
    for (const row of rows) {
      const cells = row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || []
      const out = []
      for (const cell of cells) {
        const openTag = (cell.match(/^<t[dh][^>]*>/i) || [''])[0]
        const span = Number((openTag.match(/colspan\s*=\s*["']?(\d+)/i) || [])[1] || 1)
        const text = cell
          .replace(/^<t[dh][^>]*>/i, '')
          .replace(/<\/t[dh]>$/i, '')
          .replace(/<[^>]+>/g, '')
          .replace(/\|/g, '/')
          .replace(/\s+/g, ' ')
          .trim()
        out.push(decodeEntities(text), ...Array(Math.max(0, span - 1)).fill(''))
      }
      if (out.length) lines.push(`| ${out.join(' | ')} |`)
    }
    if (!lines.length) return ''
    const columns = lines[0].split('|').length - 2
    const separator = `| ${Array.from({ length: columns }, () => '---').join(' | ')} |`
    return `\n${lines[0]}\n${separator}\n${lines.slice(1).join('\n')}\n`
  })
}

/**
 * 指标词表：只认这些，认不出就留空让用户手编。
 *
 * 顺序有意义——**更具体的别名必须排在前面**：
 *   · 「糖化血红蛋白」要排在「血红蛋白」之前，否则 HbA1c 会被读成 HGB；
 *   · 「前白蛋白」要排在「白蛋白」之前，否则 PA 会被读成 ALB。
 * 代码与 lib/client.js 的 categoryFor() 保持同一套代号，界面才能自动归类。
 */
export const METRIC_ALIASES = [
  /* 肿瘤标志物 */
  [/(?:糖类抗原\s*19[-－]?\s*9|CA\s*19[-－]?\s*9|CA199)/iu, 'CA19-9'],
  [/(?:癌胚抗原|\bCEA\b)/iu, 'CEA'],
  [/(?:糖类抗原\s*125|CA\s*125|CA125)/iu, 'CA125'],
  [/(?:糖类抗原\s*72[-－]?\s*4|CA\s*72[-－]?\s*4|CA724)/iu, 'CA72-4'],
  [/(?:甲胎蛋白|\bAFP\b)/iu, 'AFP'],

  /* 血常规（HbA1c 必须先于 HGB） */
  [/(?:糖化血红蛋白|\bHbA1c\b)/iu, 'HbA1c'],
  [/(?:白细胞(?:计数)?|\bWBC\b)/iu, 'WBC'],
  [/(?:血红蛋白|\bHGB\b|\bHb\b)/iu, 'HGB'],
  [/(?:血小板(?:计数)?|\bPLT\b)/iu, 'PLT'],
  [/(?:中性粒细胞(?:计数|绝对值)?|\bNEUT\b|\bNEU\b|\bANC\b)/iu, 'NEUT'],
  [/(?:淋巴细胞(?:计数|绝对值)?|\bLYM\b)/iu, 'LYM'],
  [/(?:红细胞(?:计数)?|\bRBC\b)/iu, 'RBC'],

  /* 肝功能（前白蛋白必须先于白蛋白） */
  [/(?:丙氨酸氨基转移酶|谷丙转氨酶|\bALT\b)/iu, 'ALT'],
  [/(?:天门冬氨酸氨基转移酶|谷草转氨酶|\bAST\b)/iu, 'AST'],
  [/(?:碱性磷酸酶|\bALP\b)/iu, 'ALP'],
  [/(?:γ[-－]?谷氨酰(?:基)?转移酶|谷氨酰转肽酶|\bGGT\b)/iu, 'GGT'],
  [/(?:总胆红素|\bTBIL\b|\bTBil\b)/iu, 'TBIL'],
  [/(?:直接胆红素|\bDBIL\b)/iu, 'DBIL'],
  [/(?:前白蛋白|\bPA\b)/iu, 'PA'],
  [/(?:白蛋白|\bALB\b)/iu, 'ALB'],

  /* 感染与炎症 */
  [/(?:超敏\s*C\s*反应蛋白|C\s*反应蛋白|\bhs-?CRP\b|\bCRP\b)/iu, 'CRP'],
  [/(?:降钙素原|\bPCT\b)/iu, 'PCT'],
  [/(?:红细胞沉降率|血沉|\bESR\b)/iu, 'ESR'],

  /* 肾功能 */
  [/(?:血肌酐|肌酐|\bCREA\b|\bCREAT\b|\bScr\b)/iu, 'CREA'],
  [/(?:尿素氮|尿素|\bBUN\b)/iu, 'BUN'],
  [/(?:尿酸|\bUA\b)/iu, 'UA'],

  /* 代谢与营养 */
  [/(?:空腹血糖|血糖|\bGLU\b|\bFPG\b)/iu, 'GLU'],
  [/(?:甘油三酯|\bTG\b)/iu, 'TG'],
  [/(?:总胆固醇|\bCHOL\b|\bTC\b)/iu, 'CHOL'],

  /* 凝血功能 */
  [/(?:凝血酶原时间|\bPT\b)/iu, 'PT'],
  [/(?:国际标准化比值|\bINR\b)/iu, 'INR'],
  [/(?:活化部分凝血活酶时间|\bAPTT\b)/iu, 'APTT'],
  [/(?:纤维蛋白原|\bFIB\b)/iu, 'FIB'],
]

const COMPARATORS = {
  '>=': '>=', '<=': '<=', '≥': '>=', '≤': '<=', '＞=': '>=', '＜=': '<=',
  '>': '>', '<': '<', '＞': '>', '＜': '<',
}

/** 单位归一：只处理确定无歧义的写法，认不出就原样留着 */
export function normalizeUnit(raw) {
  const unit = String(raw ?? '').replace(/[（）()]/g, '').replace(/\s+/g, '').trim()
  if (!unit) return null
  return unit
    .replace(/^10\s*[\^*×]?\s*(2|3|4|5|6|7|8|9|12)\s*\/\s*L$/u, (_, power) => `10${SUPERSCRIPT[power]}/L`)
    .replace(/^[uμ]mol\/L$/u, 'μmol/L')
    .replace(/^[uμ]g\/L$/u, 'μg/L')
    .replace(/^[uμ]\/L$/u, 'U/L')
    .replace(/^mmol\/l$/u, 'mmol/L')
}

/**
 * 解析一个"结果"单元格。
 * 返回 null 表示这不是一个可用结果：参考区间、定性词（阳性/阴性）、纯文字。
 */
export function parseResultCell(cell) {
  const text = String(cell ?? '').replace(/\s+/g, ' ').trim()
  if (!text) return null
  // 参考区间/范围不是结果
  if (/^\d+(?:\.\d+)?\s*[-~～至]\s*\d+(?:\.\d+)?$/u.test(text)) return null
  if (/^(?:阴性|阳性|未查|未做|见报告|无)$/u.test(text)) return null
  const matched = text.match(/^(>=|<=|≥|≤|＞=|＜=|>|<|＞|＜)?\s*(\d+(?:\.\d+)?)\s*(.*)$/u)
  if (!matched) return null
  const comparator = COMPARATORS[matched[1]] || '='
  const number = Number(matched[2])
  if (!Number.isFinite(number)) return null
  const rest = matched[3].trim()
  return {
    comparator,
    valueNum: number,
    valueRaw: `${comparator === '=' ? '' : comparator}${matched[2]}`,
    unitFromCell: rest ? normalizeUnit(rest) : null,
  }
}

/** 2026-02-31 这种不认 */
function validDate(text) {
  if (!text) return null
  const raw = String(text).replaceAll('/', '-').replaceAll('.', '-')
  const matched = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/u)
  if (!matched) return null
  const [, year, month, day] = matched
  const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  if (date.getUTCMonth() + 1 !== Number(month) || date.getUTCDate() !== Number(day)) return null
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function findReportDate(text, fallback) {
  const labeled = text.match(/(?:报告|检查|检验|检测|采样|采集|出具)\s*日\s*期[：:\s]*(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/u)
  const labeledDate = validDate(labeled?.[1])
  if (labeledDate) return labeledDate
  const head = text.split('\n').slice(0, 40).join('\n')
  for (const hit of head.matchAll(/\b(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\b/gu)) {
    const date = validDate(hit[1])
    if (date) return date
  }
  // 文档自带日期可能是完整时间戳，只取日期部分
  return validDate(String(fallback ?? '').slice(0, 10))
}

const isTableLine = (line) => /^\s*\|/.test(line)
const isSeparatorRow = (line) => /^\s*\|?[\s:|-]+\|[\s:|-]*$/u.test(line) && line.includes('-')
const splitRow = (line) => line.trim().replace(/^\|/u, '').replace(/\|$/u, '').split('|').map((cell) => cell.trim())

const HEADER_COLUMNS = {
  metric: /项目|指标|名称|试验|检测项目|检查项目/u,
  value: /结果|数值|测定值|检测值/u,
  unit: /单位/u,
  date: /日期|时间/u,
}

function columnIndexes(header) {
  const indexes = { metric: -1, value: -1, unit: -1, date: -1 }
  header.forEach((cell, index) => {
    for (const [key, pattern] of Object.entries(HEADER_COLUMNS)) {
      if (indexes[key] === -1 && pattern.test(cell)) indexes[key] = index
    }
  })
  return indexes
}

/**
 * 从竖线表里按位置对齐地抄指标。
 * 规则：项目数与数值数对不上就整行放弃（第 2 条）。
 */
function extractFromTables(lines, reportDate) {
  const found = []
  let block = []
  const flush = () => {
    if (block.length) {
      const header = splitRow(block[0].line)
      const indexes = columnIndexes(header)
      const dataRows = block.slice(isSeparatorRow(block[1]?.line ?? '') ? 2 : 1)
      for (const row of dataRows) {
        const cells = splitRow(row.line)
        const metricIndex = indexes.metric >= 0 ? indexes.metric : 0
        const valueIndex = indexes.value >= 0 ? indexes.value : 1
        if (cells.length < 2) continue
        const metricText = cells[metricIndex] ?? ''
        const alias = METRIC_ALIASES.find(([pattern]) => pattern.test(metricText))
        if (!alias) continue
        const parsed = parseResultCell(cells[valueIndex])
        if (!parsed) continue
        const unitCell = indexes.unit >= 0 ? cells[indexes.unit] : null
        const dateCell = indexes.date >= 0 ? cells[indexes.date] : null
        const occurredAt = validDate(dateCell) || reportDate
        if (!occurredAt) continue
        found.push({
          sourceLocator: `table:${row.number}`,
          confidence: 0.92,
          payload: {
            metricCode: alias[1],
            valueNum: parsed.valueNum,
            valueRaw: parsed.valueRaw,
            comparator: parsed.comparator,
            unitRaw: normalizeUnit(unitCell) || parsed.unitFromCell,
            occurredAt,
            sourceLocator: `table:${row.number}`,
            sourceText: row.line.trim(),
          },
        })
      }
    }
    block = []
  }
  for (const { line, number } of lines) {
    if (isTableLine(line)) block.push({ line, number })
    else flush()
  }
  flush()
  return found
}

/**
 * CSV 路径：本机解析 TXT/MD/CSV 时会走到这里（不经过 MinerU）。
 * 表头按关键词定位列，定位不到就放弃——不猜列序。
 */
function extractFromCsv(raw, reportDate) {
  const rows = raw.split(/\r?\n/u).filter((line) => line.trim())
  if (rows.length < 2 || !rows[0].includes(',')) return []
  const cells = (line) => line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/u).map((cell) => cell.trim().replace(/^"|"$/gu, '').replaceAll('""', '"'))
  const header = cells(rows[0])
  const pick = (patterns) => header.findIndex((cell) => patterns.some((pattern) => pattern.test(cell)))
  const dateColumn = pick([/date|日期|时间/u])
  const metricColumn = pick([/metric|指标|项目|名称/u])
  const valueColumn = pick([/value|result|数值|结果/u])
  const unitColumn = pick([/unit|单位/u])
  if (metricColumn < 0 || valueColumn < 0) return []
  const found = []
  rows.slice(1).forEach((line, index) => {
    const row = cells(line)
    const metricText = row[metricColumn] ?? ''
    const alias = METRIC_ALIASES.find(([pattern]) => pattern.test(metricText))
    if (!alias) return
    const parsed = parseResultCell(row[valueColumn])
    if (!parsed) return
    const occurredAt = validDate((dateColumn >= 0 ? row[dateColumn] : '')?.slice(0, 10)) || reportDate
    if (!occurredAt) return
    found.push({
      sourceLocator: `row:${index + 2}`,
      confidence: 0.92,
      payload: {
        metricCode: alias[1],
        valueNum: parsed.valueNum,
        valueRaw: parsed.valueRaw,
        comparator: parsed.comparator,
        unitRaw: normalizeUnit(unitColumn >= 0 ? row[unitColumn] : null) || parsed.unitFromCell,
        occurredAt,
        sourceLocator: `row:${index + 2}`,
        sourceText: line.trim(),
      },
    })
  })
  return found
}

/** 纯文本行（`CA19-9：38 U/mL`）的兜底路径 */
function extractFromLines(lines, reportDate) {
  const found = []
  for (const { line, number } of lines) {
    if (!line.trim() || isTableLine(line)) continue
    const hit = METRIC_ALIASES
      .map(([pattern, metricCode]) => ({ matched: pattern.exec(line), metricCode }))
      .find((entry) => entry.matched)
    if (!hit) continue
    const tail = line.slice(hit.matched.index + hit.matched[0].length)
    const value = tail.match(/^(?:\s*[|:：=]\s*|\s+)(>=|<=|≥|≤|＞|＜|>|<)?\s*(\d+(?:\.\d+)?)(?:\s*([A-Za-zμµ%][A-Za-zμµ0-9^/*.]*))?/u)
    if (!value) continue
    const comparator = COMPARATORS[value[1]] || '='
    found.push({
      sourceLocator: `line:${number}`,
      confidence: 0.9,
      payload: {
        metricCode: hit.metricCode,
        valueNum: Number(value[2]),
        valueRaw: `${comparator === '=' ? '' : comparator}${value[2]}`,
        comparator,
        unitRaw: normalizeUnit(value[3]),
        occurredAt: reportDate,
        sourceLocator: `line:${number}`,
        sourceText: line.trim(),
      },
    })
  }
  return found
}

/** 同一指标同一天同一值只留一条（表格与纯文本两条路径可能撞车） */
function dedupe(items) {
  const seen = new Set()
  return items.filter((item) => {
    const key = `${item.payload.metricCode}|${item.payload.occurredAt}|${item.payload.valueRaw}|${item.payload.unitRaw ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * 主入口：markdown → 候选指标。
 * @param {string} source MinerU 返回的 markdown（可能是 HTML 表格）
 * @param {string} reportedAt 文档自带的报告日期，作为兜底
 * @returns {Array<{sourceLocator: string, confidence: number, payload: object}>}
 */
export function extractObservationCandidates(source, reportedAt) {
  const raw = String(source ?? '')
  if (!raw.trim()) return []
  const reportDate = findReportDate(raw, reportedAt)
  if (!reportDate) return []
  // 本机解析的 CSV 走列名对齐，优先级最高：它已经有明确列头，不需要再猜
  const fromCsv = extractFromCsv(raw, reportDate)
  if (fromCsv.length) return fromCsv
  const converted = htmlTablesToPipes(raw)
  const lines = converted.split(/\r?\n/u).map((line, index) => ({ line, number: index + 1 }))
  return dedupe([...extractFromTables(lines, reportDate), ...extractFromLines(lines, reportDate)])
}
