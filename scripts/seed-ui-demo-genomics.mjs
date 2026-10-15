// Populate the SAM UI demo patient with explicitly labeled V3 sample genomics/IHC.
// Usage: node scripts/seed-ui-demo-genomics.mjs <patient-data-root> <patient-id>
import { openStore } from '../dsh/store.js'
import { readFile, writeFile } from 'node:fs/promises'

const [root, patientId, manifestPath] = process.argv.slice(2)
if (!root || !patientId || !manifestPath) throw new Error('Usage: node scripts/seed-ui-demo-genomics.mjs <patient-data-root> <patient-id> <demo-manifest.json>')
let manifest
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')) } catch { manifest = { kind: 'ui-demo-seed', patientId, observationIds: [], treatmentLineIds: [], treatmentEventIds: [], molecularResultIds: [] } }
if (manifest.kind !== 'ui-demo-seed' || manifest.patientId !== patientId) throw new Error('Refusing to seed: demo manifest must name the same patient')
manifest.molecularResultIds ||= []
manifest.nutritionEntryIds ||= []

const sourceLocator = '模拟数据 · prototype-v3 · 仅用于界面演示，请勿作为真实检测结果'
const dateGene = '2026-08-02'
const dateIhc = '2026-07-20'
const genes = [
  ['NGS','KRAS','KRAS','positive','G12D','错义变异',24.86,'p.G12D'],
  ['NGS','TP53','TP53','positive','c.818G>A','错义变异',27.16,'c.818G>A'],
  ['NGS','ARID1A','ARID1A','positive','p.S1085 变异','变异',1.29,'p.S1085'],
  ['NGS','STK11','STK11','positive','p.L50*','截断变异',null,'p.L50*'],
  ['NGS','CDKN2A','CDKN2A','negative','未检出','',null,''],
  ['NGS','SMAD4','SMAD4','negative','未检出','',null,''],
  ['NGS','BRCA1/2','BRCA1/2','negative','未检出致病突变','',null,''],
  ['NGS','PALB2','PALB2','negative','未检出','',null,''],
  ['NGS','ATM','ATM','negative','未检出','',null,''],
  ['NGS','BRAF','BRAF','negative','V600E 未检出','',null,''],
  ['NGS','ERBB2 (HER2)','ERBB2','negative','扩增未检出','',null,''],
  ['NGS','ERBB3','ERBB3','negative','未检出','',null,''],
  ['NGS','VEGF','VEGF','negative','未检出','',null,''],
  ['PCR','MSI / dMMR','MSI','positive','MSS（稳定）','微卫星稳定',null,''],
  ['NGS','TMB','TMB','score','3.0 mut/Mb','低于 TMB-H 阈值',null,''],
  ['NGS','NTRK 融合','NTRK','not_tested','未检测','报告未包含融合分析',null,''],
  ['NGS','NRG1 融合','NRG1','not_tested','未检测','报告未包含融合分析',null,''],
  ['NGS','FGFR 改变','FGFR','not_tested','未检测','报告未包含',null,''],
  ['other','胚系变异','Germline','not_tested','未检测','未做胚系检测',null,''],
]
const ihc = [
  ['CLDN18.2','阳性 · 20%','positive','弱—中等强度',null,20],
  ['B7-H3','阳性 · 2+ · 60%','positive','2+',null,60],
  ['C-MET','阳性 · 80%','positive','弱—中等强度（O-met）',null,80],
  ['TROP2','阳性 · 50%','positive','',null,50],
  ['EGFR','阳性 · 40%','positive','',null,40],
  ['Ki-67','约 60%+','percentage','增殖指数',null,60],
  ['MLH1','表达保留','protein_expression','保留',null,null],
  ['MSH2','表达保留','protein_expression','保留',null,null],
  ['MSH6','表达保留','protein_expression','保留',null,null],
  ['PMS2','表达保留','protein_expression','保留',null,null],
  ['CK7','阳性','positive','',null,null],
  ['P40 / P63','部分阳性','positive','',null,null],
  ['S100P','部分阳性','positive','',null,null],
  ['P53','强弱不等','score','强弱不等',null,null],
  ['HER2','0（阴性）','negative','0',null,null],
  ['DPC4 (SMAD4)','阴性 / 蛋白缺失','negative','阴性',null,null],
  ['PD-L1','未检测','not_tested','报告未包含',null,null],
  ['PD-1','未检测','not_tested','报告未包含',null,null],
  ['TF','未检测','not_tested','未做',null,null],
  ['Nectin-4','未检测','not_tested','未做',null,null],
  ['pan-TRK','未检测','not_tested','未做',null,null],
  ['CDH17','未检测','not_tested','未做',null,null],
  ['MTAP','未检测','not_tested','未做',null,null],
  ['CEACAM5','未检测','not_tested','未做',null,null],
]

const store = await openStore(root)
try {
  const demoPatient = store.listPatients().find((patient) => patient.id === patientId)
  if (!demoPatient) throw new Error('患者档案不存在')
  if (demoPatient.displayName.toLowerCase() === 'sam' && !demoPatient.heightCm) {
    store.db.prepare('UPDATE patient SET height_cm = 170, updated_at = ? WHERE id = ? AND height_cm IS NULL').run(new Date().toISOString(), patientId)
    manifest.demoHeightWasSet = true
  }
  const existing = store.listMolecularResults(patientId)
  const existingDemoKeys = new Set(existing.filter((item) => item.sourceLocator === sourceLocator).map((item) => `${item.assayType}:${item.markerCode}`))
  let inserted = 0
  for (const [assayType, markerCode, geneCode, resultType, resultRaw, alterationCode, vafPct, variantHgvs] of genes) {
    if (existingDemoKeys.has(`${assayType}:${markerCode}`)) continue
    const result = store.addMolecularResult({ patientId, assayType, markerCode, geneCode, resultType, resultRaw, alterationCode, vafPct, variantHgvs, testMethod: assayType, occurredAt: dateGene, sourceLocator, classificationCode: 'SIMULATED_V3' })
    manifest.molecularResultIds.push(result.id)
    inserted++
  }
  for (const [markerCode, resultRaw, resultType, intensity, _unused, positivePct] of ihc) {
    if (existingDemoKeys.has(`IHC:${markerCode}`)) continue
    const result = store.addMolecularResult({ patientId, assayType: 'IHC', markerCode, resultType, resultRaw, intensity, positivePct, testMethod: 'IHC', occurredAt: dateIhc, sourceLocator, classificationCode: 'SIMULATED_V3' })
    manifest.molecularResultIds.push(result.id)
    inserted++
  }
  const nutrition = [
    ['2026-04-12',57.0,1760,68], ['2026-05-06',56.6,1680,66], ['2026-05-29',55.6,1590,64],
    ['2026-06-18',54.7,1500,62], ['2026-07-11',53.2,1430,59], ['2026-08-02',53.0,1380,58],
    ['2026-08-20',52.7,1320,56], ['2026-09-05',52.4,1290,54], ['2026-09-18',52.1,1250,52],
    ['2026-10-01',51.8,1220,49], ['2026-10-12',51.4,1200,47],
  ]
  const sampleNote = '[UI DEMO] prototype-v3 模拟营养记录；不是患者真实测量值。'
  const existingNutrition = store.nutritionSummary(patientId).entries.some((entry) => entry.note?.startsWith('[UI DEMO] prototype-v3 模拟营养记录'))
  let nutritionInserted = 0
  if (!existingNutrition) for (const [occurredAt, weightKg, intakeKcal, proteinG] of nutrition) {
    const record = store.addNutritionEntry({ patientId, occurredAt, weightKg, intakeKcal, proteinG, note: sampleNote })
    manifest.nutritionEntryIds.push(record.id)
    nutritionInserted++
  }
  console.log(`Added ${inserted} sample molecular/IHC and ${nutritionInserted} nutrition records for patient ${patientId}; demo data is visibly labeled.`)
} finally { store.close() }
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 })
