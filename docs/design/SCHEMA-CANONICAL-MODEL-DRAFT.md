# 规范化实体清单（草稿）

日期：2026-10-13 · 状态：**用于消除两份 schema 文档冲突的收敛稿，未替代已冻结的领域规格**
上游：`SCHEMA-REVIEW-2026-10-13.md`、`DATA-SCHEMA-DESIGN.md`、`SCHEMA-SPEC.md`、`SPEC-v0.4.md`
目的：在建库前统一**实体命名、关系、状态枚举与时间语义**。本稿不提供完整 DDL；类型、索引与约束在 DDL 阶段落地。

---

## 0. 使用原则

- 领域模型是权威，界面是证据来源（`SCHEMA-SPEC.md:25–57`）。
- v2/v3 功能不一致是常态：领域事实少变，页面形态多变；页面简化不得删减领域字段。
- 改用统一规则：改「数据是什么」动 schema，改「数据怎么看」只动界面与读模型。

---

## 1. 全局约定

| 约定 | 规则 |
|---|---|
| 主键 | 文本 UUID/ULID；不使用文件名、数组下标、标题 |
| 患者隔离 | 业务表带 `patient_id`；所有访问按患者限定 |
| 时间语义 | `occurred_at` 临床发生、`reported_at` 报告日期、`recorded_at` 写入时间，三者不可互换 |
| 确认状态 | `candidate` / `confirmed` / `rejected` / `superseded`；当前展示与导出默认仅取 `confirmed` |
| 医学空值 | `not_tested` / `negative` / `unknown` / 未记录 分列，禁止用 null 统摄 |
| 修订 | 用 `supersedes_id` 保留前后关系，不覆盖旧值 |
| 版本 | 可编辑实体带 `revision`；格式与结构版本独立记录 |
| 证据 | 来源类型 + 文档 + 页码 + 页内定位 + 确认人 + 确认时间；手工录入允许无文档，但必须记录来源类型 |

---

## 2. 核心实体

### 2.1 工作区与患者

| 实体 | 关键字段 | 说明 |
|---|---|---|
| `workspace` | `id`, `name`, `schema_version`, `settings_json` | 本机容器，首版可单实例 |
| `patient` | `id`, `workspace_id`, `display_name`, `birth_date`, `sex_at_birth`, `height_cm`, `status` | 患者主档 |
| `patient_contact` | `patient_id`, `kind`, `name`, `phone`, `relationship`, `is_primary` | 患者、家属、医生、研究中心联系人 |
| `care_team_member` | `patient_id`, `role_code`, `organization`, `name`, `contact_id` | 照护团队 |

### 2.2 资料、分页与候选

| 实体 | 关键字段 | 说明 |
|---|---|---|
| `document` | `patient_id`, `kind_code`, `title`, `file_rel_path`, `sha256`, `reported_at`, `page_count`, `parse_status`, `status` | 原件不入库，库内仅存路径与校验值 |
| `document_page` | `document_id`, `page_no`, `content_type`, `parse_method`, `parse_status`, `image_rel_path`, `ocr_text`, `page_hash` | 解析方式按页判定，不按文件判定 |
| `extraction_run` | `document_id`, `engine`, `engine_version`, `input_hash`, `status`, `started_at` | 一次解析/抽取运行 |
| `extraction_candidate` | `run_id`, `fact_type`, `payload_json`, `source_page_id`, `source_locator`, `confidence`, `status` | 候选不参与正式展示与判定 |
| `document_comparison` | `patient_id`, `left_document_id`, `right_document_id`, `comparison_kind`, `result_json` | 跨页/跨报告比对，仅辅助核对 |

### 2.3 事实锚点与领域结果

| 实体 | 关键字段 | 说明 |
|---|---|---|
| `clinical_fact` | `id`, `patient_id`, `fact_type`, `status`, `occurred_from`, `occurred_to`, `recorded_at`, `source_*`, `confirmed_by`, `confirmed_at`, `supersedes_id`, `revision` | 统一审计锚点 |
| `diagnosis` | `fact_id`, `disease_code`, `primary_site_code`, `stage_code`, `diagnosis_basis`, `is_primary` | 诊断 |
| `observation` | `fact_id`, `metric_code`, `value_num`, `value_raw`, `comparator`, `unit_raw`, `unit_std`, `unit_std_factor`, `ref_low`, `ref_high`, `abnormal_flag`, `specimen_code`, `status` | 指标：保留原文与比较符；单位不可换算时不得连线 |
| `pathology_report` | `fact_id`, `specimen_site`, `histology_code`, `grade_code`, `tumor_cellularity_pct`, `summary_json` | 病理报告 |
| `molecular_result` | `fact_id`, `assay_type`, `marker_code`, `gene_code`, `result_type`, `variant_hgvs`, `alteration_code`, `vaf_pct`, `tmb`, `intensity`, `positive_pct`, `cps`, `score_text`, `classification_code`, `test_method`, `status` | 基因与 IHC 共用，以 `assay_type` 区分；每条结果自带证据 |
| `imaging_finding` | `fact_id`, `modality_code`, `body_site_code`, `lesion_summary`, `response_code`, `structured_json` | 影像 |
| `symptom_record` | `fact_id`, `symptom_code`, `severity`, `onset_at`, `resolved_at`, `note` | 症状 |

### 2.4 治疗与照护

| 实体 | 关键字段 | 说明 |
|---|---|---|
| `treatment_line` | `id`, `patient_id`, `fact_id`, `line_no`, `regimen`, `intent_code`, `status`, `started_at`, `ended_at`, `efficacy`, `stop_reason`, `revision` | 病情整理、一图秀、临床匹配共用同一来源 |
| `treatment_line_drug` | `line_id`, `drug_raw`, `drug_std`, `normalized`, `route_code`, `dose_text` | 药物明细为子表；未归一导致「无法判定」 |
| `treatment_event` | `fact_id`, `line_id`, `event_type`, `cycle_no`, `day_no`, `scheduled_at`, `completed_at`, `dose_json`, `status` | 治疗事件 |
| `medication_record` | `patient_id`, `drug_code`, `purpose_code`, `dose_text`, `route_code`, `started_at`, `ended_at`, `status` | 长期用药 |
| `toxicity_record` | `fact_id`, `toxicity_code`, `ctae_grade`, `related_treatment_event_id`, `onset_at`, `resolved_at`, `outcome_code`, `status` | 毒性与 CTCAE 分级 |
| `comorbidity_status` | `fact_id`, `comorbidity_code`, `state`, `severity`, `source_ref` | 并发症；与管路等来源只存一份，另一处引用 |
| `catheter_record` | `id`, `patient_id`, `fact_id`, `type_code`, `implant_date`, `site`, `status`, `brand`, `model`, `hospital`, `doctor` | 带管与血管通路共用 |
| `catheter_maintenance` | `catheter_id`, `date`, `action`, `performer`, `abnormal`, `note`, `next_planned_date` | 维护历史独立子表 |
| `appointment` / `reminder` | `patient_id`, `kind_code`, `scheduled_at`/`due_at`, `organization`, `rule_code`, `status`, `payload_json` | 预约与提醒 |

### 2.5 营养、心理与时间轴

| 实体 | 关键字段 | 说明 |
|---|---|---|
| `nutrition_profile` | `patient_id`, `energy_target_kcal`, `protein_min_g`, `protein_max_g`, `calculation_basis_json`, `basis_version` | 目标与计算依据 |
| `nutrition_entry` | `patient_id`, `occurred_at`, `weight_kg`, `intake_pct`, `appetite_code`, `digestive_symptoms_json`, `note` | 摄入与体重 |
| `pei_record` | `patient_id`, `occurred_at`, `medication_record_id`, `with_meal`, `dose_text`, `stool_change_code`, `note` | 胰酶替代记录 |
| `assessment_definition` | `code`, `version`, `domain_code`, `questions_json`, `scoring_json` | 量表定义，回答必须带版本 |
| `assessment_response` | `patient_id`, `definition_code`, `definition_version`, `occurred_at`, `answers_json`, `score_json`, `status` | 量表回答 |
| `support_resource` / `resource_bookmark` | `domain_code`, `title`, `content_json`, `source_url`, `region_code`, `verified_at` / `patient_id`, `resource_id`, `note`, `status` | 外部资源与收藏，带核实日期 |
| `timeline_annotation` | `id`, `patient_id`, `anchor_date`, `text`, `offset_x`, `offset_y`, `source_kind`, `source_ref` | 一图秀标注 |
| `timeline_dataset` | `id`, `patient_id`, `kind_code`, `import_source`, `imported_at`, `row_count`, `corrections_json`, `export_records_json` | CSV 导入血缘、修正与导出记录 |

### 2.6 试验、匹配与报告

| 实体 | 关键字段 | 说明 |
|---|---|---|
| `trial_record`（公共只读） | `trial_key`, `source_id`, `record_id`, `generation`, `registry_id`, `title`, `phase`, `recruitment_status`, `last_verified_at` | 可被数据包整体替换；用稳定键关联 |
| `trial_location` / `trial_eligibility_rule` | `trial_key`, … / `rule_id`, `trial_key`, `rule_version`, `source_text`, `rule_type`, `condition_json`, `confirmation_status`, `confirmed_by`, `confirmed_at` | 规则原文、版本与确认状态 |
| `trial_query` | `patient_id`, `requested_by`, `query_json`, `generation_ids_json`, `agent_task_id`, `created_at` | 一次检索 |
| `match_assessment` | `id`, `patient_id`, `trial_key`, `query_id`, `profile_revision`, `rule_set_version`, `generation_ids_json`, `evaluator_version`, `inputs_frozen_json`, `summary_json`, `status`, `created_at` | 冻结输入与规则，可复现 |
| `match_evaluation` | `assessment_id`, `rule_id`, `rule_version`, `result_code`, `evidence_fact_ids_json`, `needs_confirmation_json` | 逐条判定；仅 `met`/`not_met`/`unknown` |
| `trial_bookmark` / `trial_note` / `trial_contact_log` | `patient_id`, `trial_key`, `snapshot_id`, `note`, `status`, `channel_code`, `contacted_at` | 用户内容独立于公共数据与某次评估 |
| `data_channel` | `id`, `name`, `type_code`, `enabled`, `status`, `coverage_json`, `last_checked_at`, `last_success_at`, `failure_reason` | 渠道状态 |
| `agent_task` / `agent_result` | `patient_id`, `task_type`, `input_snapshot_json`, `prompt_template_version`, `status` / `task_id`, `result_json`, `citations_json`, `review_state` | 外部结果，确认后才入档案 |
| `report_snapshot` / `export_artifact` | `patient_id`, `scope_code`, `facts_json`, `document_refs_json`, `template_version`, `created_at` / `snapshot_id`, `format_code`, `file_rel_path`, `sha256` | 报告冻结快照与产物 |

---

## 3. 状态与枚举（收敛点）

| 域 | 取值 | 说明 |
|---|---|---|
| 确认 | `candidate` / `confirmed` / `rejected` / `superseded` | 仅 `confirmed` 进入展示、趋势、匹配与报告 |
| 结果 | `measured` / `not_tested` / `negative` / `unknown` | 「未检测」与「阴性」不可合并 |
| 分子结果 | `negative` / `positive` / `percentage` / `score` / `cps` / `protein_expression` / `not_tested` / `unknown` | IHC 六种表达须可解析 |
| 判定 | `met` / `not_met` / `unknown` | 缺失一律流向 `unknown`，不得流向 `met` |
| 并发症 | 活动 / 既往 / 无 / 未知 | 未知不得显示为无 |
| 渠道 | `ready` / `partial` / `needs-setup` / `failed` / `disabled` / `updating` | 未就绪不得显示成「没有试验」 |

---

## 4. 计算与快照边界

| 类别 | 处理方式 |
|---|---|
| 当前事实 | 读取时计算，不存当前状态副本 |
| 确定性派生（间隔天数、趋势、分级输入） | 读取时计算 |
| 结论（匹配评估、报告快照） | 冻结输入与规则，保留旧结果；变更时提示重新评估，不静默重算 |
| 历史看板 | 仅用户主动保存时冻结，不用于渲染当前状态 |

---

## 5. 变更判定

| 变更 | 动作 |
|---|---|
| 改布局、排序、Tab、文案 | 只改界面 |
| v3 以简化形态展示 v2 已有能力 | 只改界面；领域字段保留 |
| 新增需筛选/排序/画趋势的字段 | 升为正式列并建索引 |
| 真实病历出现模型存不下的字段 | 补领域模型 |
| 新页面暴露模型缺实体 | 补领域模型 |

## 6. 未决项

- 基因与 IHC 共用表（`assay_type` 区分）是否最终确认。
- 公共试验数据：独立库 + ATTACH 还是同库分表。
- 字段级加密列清单。
- 读模型旧契约保留时长与下线流程。
