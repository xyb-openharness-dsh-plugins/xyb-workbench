import test from 'node:test'
import assert from 'node:assert/strict'

function loadClient(overrides = {}) {
  let moduleDefinition
  let hookIndex = 0
  const react = {
    Fragment: 'fragment',
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState: (initial) => {
      const index = hookIndex++
      const value = Object.hasOwn(overrides, index) ? overrides[index] : initial
      return [value, (next) => { overrides[index] = typeof next === 'function' ? next(value) : next }]
    },
    useCallback: (value) => value,
    useEffect: () => {},
  }
  globalThis.window = { __ModuleLoader__: { load: (definition) => { moduleDefinition = definition } } }
  return import(`../lib/client.js?test=${Date.now()}-${Math.random()}`).then(() => ({
    moduleDefinition,
    resetHooks: () => { hookIndex = 0 },
    runtime: moduleDefinition.factory((name) => {
      if (name === 'react') return react
      throw new Error(`unexpected client dependency ${name}`)
    }),
  }))
}

function collectText(node, output = []) {
  if (Array.isArray(node)) { node.forEach((child) => collectText(child, output)); return output }
  if (node == null || typeof node === 'boolean') return output
  if (typeof node === 'string' || typeof node === 'number') { output.push(String(node)); return output }
  if (node.children) collectText(node.children, output)
  return output
}

function collectNodes(node, predicate, output = []) {
  if (Array.isArray(node)) { node.forEach((child) => collectNodes(child, predicate, output)); return output }
  if (!node || typeof node !== 'object') return output
  if (predicate(node)) output.push(node)
  if (node.children) collectNodes(node.children, predicate, output)
  return output
}

function renderWorkbenchPanel(runtime, tab, resetHooks) {
  let Panel
  runtime.apply({
    effect: (effect) => effect(),
    desktopWorkbenches: { register: (_descriptor, component) => { Panel = component; return () => {} } },
    uiWorkspace: {}, sessions: {}, conversation: {},
  })
  resetHooks()
  return Panel()
}

test('registers one canonical DSH workbench provider', async () => {
  const { moduleDefinition, runtime, resetHooks } = await loadClient()
  assert.equal(moduleDefinition.id, '@xyb-openharness-dsh-plugins/xyb-workbench')
  assert.deepEqual(runtime.inject, ['desktopWorkbenches', 'uiWorkspace', 'sessions', 'conversation'])
  const tree = renderWorkbenchPanel(runtime, 'dashboard', resetHooks)
  const text = collectText(tree).join(' ')
  assert.match(text, /选择资料文件夹/u)
})

test('renders each business tab structure for a local patient', async () => {
  const patient = { id: 'p-test', displayName: '测试患者', heightCm: 165 }
  const overrides = {
    0: true,
    1: [patient],
    2: patient,
    3: { patient, latestObservations: [], upcomingAppointments: [], reminders: [{ id: 'reminder-1', kindCode: 'blood-test', ruleCode: 'blood-test-before-chemotherapy', dueAt: '2026-10-18T08:00', note: '化疗前血常规' }] },
    19: 'dashboard',
  }
  const { runtime, resetHooks } = await loadClient(overrides)
  const checks = [
    ['dashboard', /各方面的近况/u], ['records', /资料库/u], ['one-page', /病程时间轴/u],
    ['trials', /入组档案/u], ['nutrition', /营养指标趋势/u], ['mind', /今天的你，感觉怎么样/u],
    ['care', /症状与不适记录/u],
  ]
  for (const [tab, expected] of checks) {
    overrides[19] = tab
    let tree = renderWorkbenchPanel(runtime, tab, resetHooks)
    const text = collectText(tree).join(' ')
    assert.match(text, expected, `tab ${tab} should render its page structure`)
    if (tab === 'dashboard') {
      assert.match(text, /PDF（默认）/u)
      assert.match(text, /JPEG/u)
      assert.match(text, /DOCX/u)
      const days = collectNodes(tree, (node) => typeof node.props.className === 'string' && node.props.className.includes('xyb-calendar-day'))
      assert.equal(days.length, 14, 'dashboard shows exactly the next fourteen local calendar days')
      assert.match(text, /添加事件/u, 'calendar lets the patient add an appointment from the dashboard')
      assert.equal((text.match(/资料整理进度/gu) || []).length, 1, 'dashboard completion ring is separated from the welcome hero and shown once')
      const addEvent = collectNodes(tree, (node) => node.type === 'button' && node.children.flat(Infinity).includes('＋ 添加事件'))[0]
      assert.ok(addEvent?.props.onClick)
      addEvent.props.onClick()
      tree = renderWorkbenchPanel(runtime, tab, resetHooks)
      assert.match(collectText(tree).join(' '), /保存到本机日历/u, 'adding an event opens an inline form with local persistence')
    }
  }
  overrides[19] = 'records'
  let tree = renderWorkbenchPanel(runtime, 'records', resetHooks)
  const recordsText = collectText(tree).join(' ')
  for (const section of ['资料库', '报告核对', '指标趋势', '病情评估', '病情汇总']) assert.match(recordsText, new RegExp(section, 'u'))
  overrides[19] = 'care'
  tree = renderWorkbenchPanel(runtime, 'care', resetHooks)
  const careText = collectText(tree).join(' ')
  for (const section of ['毒性管理', '并发症', '带管管理', '血管通路']) assert.match(careText, new RegExp(section, 'u'))
  overrides[19] = 'trials'
  overrides[28] = '入组档案'
  overrides[14] = [
    { id: 'mol-kras', assayType: 'NGS', markerCode: 'KRAS', geneCode: 'KRAS', alterationCode: '错义变异', variantHgvs: 'p.G12D', resultType: 'positive', resultRaw: 'G12D', vafPct: 24.9, testMethod: 'NGS', occurredAt: '2026-08-02', sourceLocator: '模拟报告 · 第 2 页' },
    { id: 'mol-egfr', assayType: 'IHC', markerCode: 'EGFR', resultType: 'positive', resultRaw: '阳性 · 40%', intensity: '2+', positivePct: 40, testMethod: 'IHC', occurredAt: '2026-07-20', sourceLocator: '模拟病理报告 · 第 3 页' },
    { id: 'mol-ntrk', assayType: 'NGS', markerCode: 'NTRK 融合', geneCode: 'NTRK', resultType: 'not_tested', resultRaw: '未检测', alterationCode: '报告未包含融合分析', testMethod: 'NGS', occurredAt: '2026-08-02', sourceLocator: '模拟报告 · 第 2 页' },
  ]
  tree = renderWorkbenchPanel(runtime, 'trials', resetHooks)
  const clinicalProfileText = collectText(tree).join(' ')
  assert.match(clinicalProfileText, /基因检测（分子特征）/u, 'clinical matching opens the structured patient profile by default')
  assert.match(clinicalProfileText, /靶点 \/ 检测项/u)
  assert.match(clinicalProfileText, /VAF 24.9%/u)
  assert.match(clinicalProfileText, /EGFR/u)
  assert.match(clinicalProfileText, /展开未检出 \/ 未检测（0 项未检出 · 1 项未检测）/u, 'negative and untested details are retained in a separate disclosure like v2')
  overrides[19] = 'care'
  overrides[21] = { comorbidities: [], toxicities: [], medications: [], catheters: [{ id: 'c1', typeCode: 'Port', site: '胸前', status: 'in_place', maintenance: [] }] }
  overrides[23] = '管路照护'
  tree = renderWorkbenchPanel(runtime, 'care', resetHooks)
  assert.match(collectText(tree).join(' '), /保存维护记录/u, 'care page provides a maintenance form for an existing catheter')
  assert.match(collectText(tree).join(' '), /本机提醒/u, 'care page shows locally scheduled reminders')
  overrides[19] = 'records'
  overrides[6] = { id: 'doc1', title: 'report.pdf', kindCode: 'pathology', reportedAt: '2026-10-14', parseStatus: 'pending' }
  overrides[7] = [{ id: 'candidate1', documentId: 'doc1', factType: 'observation', status: 'candidate', payload: { metricCode: 'CA19-9', valueRaw: '40', unitRaw: 'U/mL', occurredAt: '2026-10-14' } }]
  tree = renderWorkbenchPanel(runtime, 'records', resetHooks)
  assert.match(collectText(tree).join(' '), /识别与核对/u, 'document preview places extraction review beside the original')
  assert.match(collectText(tree).join(' '), /核对并确认/u)
  overrides[19] = 'mind'
  overrides[35] = '支持资源'
  overrides[22] = [{ id: 'resource1', title: '来源报告', regionCode: '北京', verifiedAt: '2026-10-15', content: { kind: '项目报告', summary: '来源摘要', caveat: '联系前请核实' }, sourceUrl: 'https://example.org/report' }]
  tree = renderWorkbenchPanel(runtime, 'mind', resetHooks)
  assert.match(collectText(tree).join(' '), /来源报告/u, 'mind page lists locally bundled source cards')
  const mindText = collectText(tree).join(' ')
  for (const section of ['情绪自评', '心理缓解', '安宁疗护', '哀伤支持']) assert.match(mindText, new RegExp(section, 'u'))
  overrides[19] = 'review'
  tree = renderWorkbenchPanel(runtime, 'review', resetHooks)
  assert.match(collectText(tree).join(' '), /Agent 建议与重要对话/u)
  overrides[19] = 'settings'
  tree = renderWorkbenchPanel(runtime, 'settings', resetHooks)
  assert.match(collectText(tree).join(' '), /工作台信息/u)
  overrides[19] = 'one-page'
  overrides[3] = { patient, latestObservations: [
    { metricCode: 'CA19-9', valueNum: 91, valueRaw: '91', unitRaw: 'U/mL', occurredAt: '2026-10-10', delta: -9 },
    { metricCode: 'CEA', valueNum: 4.1, valueRaw: '4.1', unitRaw: 'ng/mL', occurredAt: '2026-10-10', delta: 0.2 },
  ], upcomingAppointments: [], reminders: [] }
  overrides[4] = []
  tree = renderWorkbenchPanel(runtime, 'one-page', resetHooks)
  let metricButtons = collectNodes(tree, (node) => node.props?.className === 'xyb-metric-card')
  assert.equal(metricButtons.length, 2)
  metricButtons[0].props.onClick()
  tree = renderWorkbenchPanel(runtime, 'one-page', resetHooks)
  metricButtons = collectNodes(tree, (node) => node.props?.className === 'xyb-metric-card')
  assert.equal(metricButtons[0].props['aria-pressed'], true, 'a flipped metric remains flipped after rerender')
  metricButtons[1].props.onClick()
  tree = renderWorkbenchPanel(runtime, 'one-page', resetHooks)
  metricButtons = collectNodes(tree, (node) => node.props?.className === 'xyb-metric-card')
  assert.deepEqual(metricButtons.map((node) => node.props['aria-pressed']), [true, true], 'flipping another card preserves the first card state')
  overrides[19] = 'trials'
  overrides[9] = [{ trialKey: 'CTR-DEMO', title: '本机示例试验', status: '招募中', phase: 'II期', sourceCode: 'ChiCTR' }]
  overrides[34] = '试验检索'
  tree = renderWorkbenchPanel(runtime, 'trials', resetHooks)
  assert.match(collectText(tree).join(' '), /打开详情/u)
  assert.match(collectText(tree).join(' '), /查看条件对照/u)
  assert.match(collectText(tree).join(' '), /我的关注/u)
  overrides[19] = 'nutrition'
  overrides[8] = {
    latest: { occurredAt: '2026-10-12', weightKg: 51.4, bmi: 17.8, intakeKcal: 1200, proteinG: 47 },
    entries: [
      { occurredAt: '2026-10-12', weightKg: 51.4, intakeKcal: 1200, proteinG: 47, note: '[UI DEMO] prototype-v3 模拟营养记录；不是患者真实测量值。' },
      { occurredAt: '2026-10-01', weightKg: 51.8, intakeKcal: 1220, proteinG: 49, note: '[UI DEMO] prototype-v3 模拟营养记录；不是患者真实测量值。' },
      { occurredAt: '2026-09-18', weightKg: 52.1, intakeKcal: 1250, proteinG: 52 },
      { occurredAt: '2026-09-05', weightKg: 52.4, intakeKcal: 1290, proteinG: 54 },
      { occurredAt: '2026-08-20', weightKg: 52.7, intakeKcal: 1320, proteinG: 56 },
    ], products: [], peiRecords: [],
  }
  tree = renderWorkbenchPanel(runtime, 'nutrition', resetHooks)
  const nutritionText = collectText(tree).join(' ')
  assert.match(nutritionText, /界面演示数据/u)
  assert.match(nutritionText, /51\.4 kg/u)
  assert.match(nutritionText, /营养指标趋势/u)
  let nutritionCards = collectNodes(tree, (node) => node.props?.className === 'xyb-metric-card')
  assert.equal(nutritionCards.length, 3, 'nutrition shows the three flip cards for weight, BMI, and energy')
  nutritionCards[0].props.onClick()
  tree = renderWorkbenchPanel(runtime, 'nutrition', resetHooks)
  nutritionCards = collectNodes(tree, (node) => node.props?.className === 'xyb-metric-card')
  assert.equal(nutritionCards[0].props['aria-pressed'], true, 'nutrition flip remains active after rerender')
  assert.match(collectText(nutritionCards[0]).join(' '), /最近 5 次/u, 'nutrition flip back shows recent measurements and sparkline label')
  nutritionCards[1].props.onClick()
  tree = renderWorkbenchPanel(runtime, 'nutrition', resetHooks)
  nutritionCards = collectNodes(tree, (node) => node.props?.className === 'xyb-metric-card')
  assert.deepEqual(nutritionCards.map((node) => node.props['aria-pressed']), [true, true, false], 'each nutrition card retains its own flipped state')
})
