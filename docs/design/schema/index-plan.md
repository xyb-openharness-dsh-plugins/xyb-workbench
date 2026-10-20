# 索引方案（index-plan）

配套：`schema/0001_initial.sql`（业务库，患者数据）。公共试验库索引见 `schema/trials/0001_public.sql`（物理分离后的只读库，U2）。本文件是 task-1 三份交付物之一，逐索引给出**查询场景依据**，防止无依据单列索引。

> 多病人（U1）已确认：所有约 90% 查询按 `patient_id` 限定，`patient_id` 作为复合索引最左列是默认策略。本文已按多病人基线给出。

## 索引设计原则

1. **患者隔离优先**：业务表带 `patient_id`，复合索引以它最左。
2. **时间语义分列**：趋势/看板/时间轴用真实临床时间列（`occurred_at`/`reported_at`/`scheduled_at`/`anchor_date`/`implant_date`/`onset_at`），与写入时间 `recorded_at`/`created_at` 严格区分。
3. **低选择性单列不索引**：`status`/`confirmation_status` 等枚举仅在组合时进索引。
4. **唯一索引承担去重与约束**：文档 hash、单患者营养档案、书签、导出格式、字段定义版本。
5. **FTS5 不在本方案内**：全文检索走独立虚拟表，待 `schema/probe/` 实测中文分词结论后单独建迁移（你要求先别定死）。

## 工作区与患者

| 索引 | 表（列） | 查询场景依据 |
|---|---|---|
| `ix_patient_workspace` | `patient(workspace_id)` | 单工作区列举患者清单（多病人切换查看 U1） |
| `ix_contact_patient` | `patient_contact(patient_id)` | 某患者全部联系人（家属/医生/中心） |
| `ix_careteam_patient` | `care_team_member(patient_id)` | 某患者照护团队成员 |

## 资料、分页、抽取候选

| 索引 | 表（列） | 查询场景依据 |
|---|---|---|
| `ux_document_hash` | `document(patient_id, sha256)` UNIQUE | 导入重复原件按 hash 去重（资料库验收用例） |
| `ix_document_patient` | `document(patient_id, reported_at)` | 按患者列举资料并按报告日期排序 |
| `ix_page_document` | `document_page(document_id, page_no)` | 逐页原文与跨页比对 |
| `ix_run_document` | `extraction_run(document_id, started_at)` | 某资料历史抽取运行时间线 |
| `ix_candidate_patient_status` | `extraction_candidate(patient_id, status)` | 待核对候选列表 + 已确认/拒绝统计 |
| `ix_candidate_run` | `extraction_candidate(run_id)` | 一次运行产出全部候选 |
| `ix_comparison_patient` | `document_comparison(patient_id, created_at)` | 跨报告比对记录时间线 |

## 事实锚点与领域结果

| 索引 | 表（列） | 查询场景依据 |
|---|---|---|
| `ix_fact_patient_type` | `clinical_fact(patient_id, fact_type, occurred_from)` | 按类型+发生时间拉事实 |
| `ix_fact_patient_time` | `clinical_fact(patient_id, occurred_from)` | 时间轴/趋势全局排序 |
| `ix_fact_status` | `clinical_fact(status)` | 仅 `confirmed` 进展示/导出/匹配 |
| `ix_obs_metric_date` | `observation(patient_id, metric_code, occurred_at)` | 单指标趋势线 |
| `ix_obs_patient_date` | `observation(patient_id, occurred_at)` | 某时点全部指标快照 |
| `ix_obs_unit` | `observation(patient_id, metric_code, unit_std)` | 单位分组，避免同名不同单位连线 |
| `ix_molecular_patient_marker` | `molecular_result(patient_id, marker_code, occurred_at)` | 标志物历史；匹配入组档案 |
| `ix_molecular_assay` | `molecular_result(patient_id, assay_type)` | NGS/IHC/PCR 分面（U3 共用表） |

## 治疗与照护

| 索引 | 表（列） | 查询场景依据 |
|---|---|---|
| `ix_treatmentline_patient` | `treatment_line(patient_id, line_no)` | 治疗线顺序；一图秀用药轴 |
| `ix_drug_std` | `treatment_line_drug(drug_std)` | 归一药物跨患者检索（药物明细子表） |
| `ix_treatment_event_line` | `treatment_event(line_id, scheduled_at)` | 某线周期/日程事件 |
| `ix_medication_patient` | `medication_record(patient_id, status)` | 长期用药活动清单 |
| `ix_toxicity_patient` | `toxicity_record(patient_id, onset_at)` | 毒性时间线；全程管理毒性子页 |
| `ix_comorbidity_patient` | `comorbidity_status(patient_id, comorbidity_code, occurred_at)` | 并发症状态；匹配复用同一份 |
| `ix_catheter_patient` | `catheter_record(patient_id, implant_date)` | 带管/通路按置入日期 |
| `ix_cath_maint` | `catheter_maintenance(catheter_id, date DESC)` | 「距上次维护 N 天」、维护趋势 |
| `ix_appointment_patient` | `appointment(patient_id, scheduled_at)` | 预约日程 |
| `ix_reminder_patient` | `reminder(patient_id, status, due_at)` | 待办提醒按到期日 |

## 营养、心理、时间轴

| 索引 | 表（列） | 查询场景依据 |
|---|---|---|
| `ux_nutrition_profile` | `nutrition_profile(patient_id)` UNIQUE | 单患者唯一营养目标档案 |
| `ix_nutrition_entry` | `nutrition_entry(patient_id, occurred_at)` | 体重/摄入趋势 |
| `ix_pei_patient` | `pei_record(patient_id, occurred_at)` | 胰酶替代记录 |
| `ix_assessment_patient` | `assessment_response(patient_id, definition_code, occurred_at)` | 量表历史；不同量表不画同线 |
| `ix_resource_domain` | `support_resource(domain_code, verified_at)` | 按领域+核实日期筛资源 |
| `ux_bookmark` | `resource_bookmark(patient_id, resource_id)` UNIQUE | 同资源不重复收藏 |
| `ix_annotation_patient` | `timeline_annotation(patient_id, anchor_date)` | 一图秀竖线标注 |
| `ix_dataset_patient` | `timeline_dataset(patient_id, imported_at)` | CSV 导入血缘 |

## 试验、匹配、报告（用户侧内容）

> 公共试验库索引随物理分离迁移定义（`schema/trials/0001_public.sql`）。下列为本业务库内用户侧索引，均用稳定 `trial_key` 关联，无跨库 FK。

| 索引 | 表（列） | 查询场景依据 |
|---|---|---|
| `ix_query_patient` | `trial_query(patient_id, created_at)` | 检索历史 |
| `ix_assessment_patient_trial` | `match_assessment(patient_id, trial_key, created_at)` | 某患者某试验评估历史（冻结快照） |
| `ix_evaluation_assessment` | `match_evaluation(assessment_id, result_code)` | 逐条判定；缺失流向 `unknown` 统计 |
| `ix_bookmark_patient` | `trial_bookmark(patient_id, created_at)` | 收藏列表 |
| `ix_note_patient_trial` | `trial_note(patient_id, trial_key, created_at)` | 备注按试验时间线（跨评估延续） |
| `ix_contactlog_patient` | `trial_contact_log(patient_id, trial_key, contacted_at)` | 跟进按试验时间线（独立于某次评估） |
| `ix_agent_task_patient` | `agent_task(patient_id, created_at)` | agent 任务时间线 |
| `ix_agent_result_task` | `agent_result(task_id)` | 任务结果 |
| `ix_report_patient` | `report_snapshot(patient_id, created_at)` | 报告冻结快照历史 |
| `ux_export_artifact` | `export_artifact(snapshot_id, format_code)` UNIQUE | 同快照同格式仅一份产物 |

## 扩展字段与快照

| 索引 | 表（列） | 查询场景依据 |
|---|---|---|
| `ix_factvalue_def` | `fact_value(field_definition_id)` | 按扩展字段反查取值 |
| `ix_dashboard_snapshot` | `dashboard_snapshot(patient_id, created_at)` | 用户主动保存的历史看板（冻结，非当前状态） |

## 待定（不在本迁移）

- **FTS5 虚拟表索引**：文档 OCR 全文检索，待 `schema/probe/` 中文分词结论（unicode61 vs trigram）后单独迁移。
- **公共试验库索引**：随 U2 物理分离一并定义。
