# 小胰宝工作台数据 Schema 设计

版本：0.1 · 2026-10-13  
状态：实现导向的关系与演进设计；不替代已存在的 [SCHEMA-SPEC.md](./SCHEMA-SPEC.md) 领域模型和 [DATA-FLOW-SPEC.md](./DATA-FLOW-SPEC.md) 更新语义。  
范围：本机 DSH Desktop 工作台。首版服务单患者工作区，也保留患者隔离能力。  
依据：prototype-v2.html、prototype-v3.html 的资料整理、病情一图秀、临床匹配、营养、心理支持、全程管理和治疗日历。

### 与已有规格的术语对齐

本文使用较细的实现名称；实际建表时以下表以 SCHEMA-SPEC 的名称和约束为权威：Measurement 对应 Observation；Pathology Report、Gene Finding 和 IHC Result 对应 GenomicAlteration 及其 assay_type；Treatment Plan 和 Treatment Event 对应 TreatmentLine 及其事件明细；Care Event 对应 ToxicityRecord、ComorbidityStatus、CatheterRecord 等领域实体；Trial Match Snapshot 对应 MatchAssessment 的可复现快照。本文补充逐页证据、读模型契约、Agent 导入和字段演进，不能形成第二套并行患者库。

## 1. 设计目标

### 业务目标

- 原始报告能逐页核对；一次提取可以产生多个待确认候选信息。
- 一个已确认的数值、治疗记录或病理结论只保存一次，首页、趋势、试验匹配和导出报告共同读取。
- 每个事实可追到文件、页码、页内位置、确认人和确认时间。
- Agent、技能、离线试验数据只产生查询任务、候选结果或报告草稿；不会自动写入患者档案。
- 前端每周改布局、Tab、卡片、文案时，历史数据不需要迁移。
- 可以加入新的指标、基因、病理字段、问卷、试验来源和导出模板。

### 三层数据流

原始资料 Document → 待确认提取 Candidate → 已确认临床事实 Clinical Fact → 页面读模型 Read Model

这条链是唯一事实来源。页面不能各存一份“首页数据”“趋势数据”或“试验档案”。

## 2. 关键决定

### ADR-001：本机 SQLite 是患者工作区的事实库

DSH 服务端入口维护本机 SQLite；附件保存在受控目录，数据库仅保存相对路径、摘要、大小和 SHA-256。SQLite 支持事务、索引、迁移和本机备份，适合离线开箱即用。以后需要同步时，可按工作区导出或迁移，不影响当前 Schema。

### ADR-002：原始资料、候选、确认事实严格分层

原始文件不可由解析程序修改。OCR、结构化提取和 Agent 结果写入 Candidate；只有用户确认或明确手工录入才产生 Confirmed Fact。被新资料更正的内容标记 Superseded，不删除旧记录。

### ADR-003：高频事实规范化，变化字段版本化

指标、治疗、病理、预约等高频查询对象使用关系表。医院自定义字段和将来新增字段由 Field Definition 定义，再写入 Fact Value。不能把全部业务数据放进无约束 JSON，也不需要为每个罕见字段立刻建列。

### ADR-004：前端只读版本化读模型

客户端只调用 dashboard.summary.v1、timeline.series.v1 等稳定契约，不能直接拼接 SQL 表。读模型默认按当前事实实时生成，不保存为当前状态副本；仅用户主动保存的历史快照才持久化。布局调整只改组件；业务字段演进通过读模型新增版本完成。

## 3. 全局规则

| 规则 | 约定 |
| --- | --- |
| 主键 | UUID 或 ULID 字符串；文件名、数组下标、标题不能作为 ID。 |
| 患者隔离 | 绝大多数表带 patient_id；每次 Repository 查询必须按 patient_id 限定。 |
| 时间 | occurred_at 是临床发生时间；reported_at 是报告日期；recorded_at 是写入时间，三者不能互换。 |
| 状态 | candidate、confirmed、rejected、superseded。趋势、首页、试验档案和导出默认仅取 confirmed。 |
| 稳定编码 | 使用 lab.ca19_9、gene.KRAS、treatment.chemotherapy 这类 code；中文名称由字典提供。 |
| 来源 | 每个确认事实记录 source_kind、source_document_id、source_page_id、source_locator、confirmed_by、confirmed_at。 |
| 修订 | 使用 supersedes_fact_id 保留前后关系；不可用“最新值覆盖旧值”。 |

上传资料时，只在界面提示用户自行确认分享对象和文件内容。数据保留在本机，并不改变来源追溯和确认要求。

## 4. 关系总图

    WORKSPACE 1 ── N PATIENT 1 ── N DOCUMENT 1 ── N DOCUMENT_PAGE
                                 │              └── N EXTRACTION_RUN ── N EXTRACTION_CANDIDATE
                                 └── N CLINICAL_FACT
                                           ├── 1 MEASUREMENT
                                           ├── 1 DIAGNOSIS
                                           ├── 1 PATHOLOGY_REPORT ── N GENE_FINDING / IHC_RESULT
                                           ├── 1 IMAGING_FINDING
                                           └── 1 SYMPTOM_RECORD

    PATIENT 1 ── N TREATMENT_PLAN 1 ── N TREATMENT_EVENT
            ├── N CARE_EVENT / APPOINTMENT / REMINDER
            ├── N NUTRITION_ENTRY / PEI_RECORD / ASSESSMENT_RESPONSE
            ├── N TRIAL_QUERY ── N TRIAL_MATCH_SNAPSHOT ── N ELIGIBILITY_EVALUATION
            ├── N AGENT_TASK ── N AGENT_RESULT
            └── N REPORT_SNAPSHOT ── N EXPORT_ARTIFACT

## 5. 核心实体

### 5.1 工作区与患者

| 表 | 关键字段 | 作用 |
| --- | --- | --- |
| workspace | id, name, schema_version, settings_json | 本机工作台容器；首版可只有一个。 |
| patient | id, workspace_id, display_name, birth_date, sex_at_birth, height_cm, status | 患者主档；display_name 可用昵称。 |
| patient_contact | patient_id, kind, name, phone, relationship, is_primary | 患者、家属、医生、研究中心联系人。 |
| care_team_member | patient_id, role_code, organization, name, contact_id | 医院、科室和照护团队。 |

### 5.2 原始资料、逐页核对与跨页比对

| 表 | 关键字段 | 作用 |
| --- | --- | --- |
| document | patient_id, kind_code, title, file_rel_path, sha256, reported_at, status | PDF、图片、DOCX、CSV 等原件。哈希用于去重。 |
| document_page | document_id, page_no, image_rel_path, ocr_text, page_hash | 支持逐页查看、逐页标注和重新解析。 |
| extraction_run | document_id, engine, engine_version, input_hash, status, started_at | 一次 OCR、结构化提取或 Agent 分析的运行记录。 |
| extraction_candidate | run_id, fact_type, payload_json, source_page_id, source_locator, confidence, status | 待核对候选项；可逐项确认、拒绝或合并。 |
| document_comparison | patient_id, left_document_id, right_document_id, comparison_kind, result_json | 跨页、跨报告差异，结果只辅助核对。 |

### 5.3 统一临床事实锚点

Clinical Fact 是所有确认记录的共同审计锚点：

| 字段 | 用途 |
| --- | --- |
| id, patient_id, fact_type, status | 身份、患者范围、类型、确认状态。 |
| occurred_from, occurred_to, recorded_at | 发生区间与系统写入时间。 |
| source_kind | document、manual、agent_result、import。 |
| source_document_id, source_page_id, source_locator | 资料、页码和页内定位。 |
| confirmed_by, confirmed_at | 用户或录入者确认信息。 |
| supersedes_fact_id | 修订链。 |
| summary | 面向列表的简短摘要，不替代结构化字段。 |

所有领域专属表均用 fact_id 一对一关联 Clinical Fact：

| 专属表 | 关键字段 |
| --- | --- |
| diagnosis | disease_code, primary_site_code, stage_code, diagnosis_basis, is_primary |
| measurement | metric_code, value_num, value_text, unit_code, ref_low, ref_high, abnormal_flag, specimen_code |
| pathology_report | specimen_site, histology_code, grade_code, tumor_cellularity_pct, summary_json |
| imaging_finding | modality_code, body_site_code, lesion_summary, response_code, structured_json |
| symptom_record | symptom_code, severity, onset_at, resolved_at, note |

病理报告下有 Gene Finding 和 IHC Result：

| 表 | 关键字段 |
| --- | --- |
| gene_finding | pathology_report_id, gene_code, variant_hgvs, alteration_code, vaf_pct, classification_code, test_method |
| ihc_result | pathology_report_id, marker_code, result_code, score_text, positive_pct, interpretation |

基因、免疫组化和组织学使用可维护字典。首批字典可覆盖 KRAS、TP53、CDKN2A、SMAD4、BRCA1/2、PALB2、ATM、MSI/MMR、TMB、HER2、NTRK 等；字典中存在不表示患者已有该结果。

### 5.4 治疗、并发症、预约和提醒

| 表 | 关键字段 | 原型用途 |
| --- | --- | --- |
| treatment_plan | patient_id, name, intent_code, status, started_at, ended_at, regimen_json | 化疗方案和治疗经过。 |
| treatment_event | fact_id, plan_id, event_type, cycle_no, day_no, scheduled_at, completed_at, dose_json, status | 化疗、手术、放疗、输液、停药。 |
| medication_record | patient_id, drug_code, purpose_code, dose_text, route_code, started_at, ended_at, status | 胰酶、止痛、止吐等长期用药。 |
| care_event | fact_id, care_type, severity, related_treatment_event_id, status, detail_json | 毒副反应、并发症、管路、症状。 |
| appointment | patient_id, kind_code, scheduled_at, organization, status, related_plan_id, note | 门诊、开化疗、检查预约。 |
| reminder | patient_id, appointment_id, rule_code, due_at, status, payload_json | 两周待办、化疗前血常规、增强 CT 节奏。 |

reminder 的 rule_code 例如 before_chemo_lab.v1 与 ct_followup_3m.v1。调整治疗计划或预约后，只重新生成未完成提醒；已完成事项不被静默改写。

### 5.5 营养、PEI、心理和支持资源

| 表 | 关键字段 |
| --- | --- |
| nutrition_profile | patient_id, energy_target_kcal, protein_min_g, protein_max_g, calculation_basis_json |
| nutrition_entry | patient_id, occurred_at, weight_kg, intake_pct, appetite_code, digestive_symptoms_json, note |
| pei_record | patient_id, occurred_at, medication_record_id, with_meal, dose_text, stool_change_code, note |
| assessment_definition | code, version, domain_code, questions_json, scoring_json |
| assessment_response | patient_id, definition_code, definition_version, occurred_at, answers_json, score_json, status |
| support_resource | domain_code, title, content_json, source_url, region_code, updated_at |
| resource_bookmark | patient_id, resource_id, note, status |

量表回答必须带 definition_version，使趋势可解释。安宁疗护、哀伤管理、心理缓解资源应有来源 URL、适用地区和更新时间，不可暗示当前预约或床位状态。

### 5.6 临床试验与离线数据

离线临床数据是参考数据，患者工作区数据是个人记录，二者不能混表。

| 表 | 关键字段 |
| --- | --- |
| trial_dataset_version | source_code, version, published_at, imported_at, source_hash, status |
| trial | dataset_version_id, registry_id, title, condition_json, phase, recruitment_status, last_verified_at |
| trial_location | trial_id, country_code, province, city, organization, contact_json, status |
| trial_eligibility_rule | trial_id, group_code, rule_text, rule_structured_json |
| trial_query | patient_id, requested_by, query_json, dataset_version_ids_json, agent_task_id, created_at |
| trial_match_snapshot | trial_query_id, trial_id, match_state, reason_json, source_status, saved_at |
| eligibility_evaluation | snapshot_id, rule_id, result_code, evidence_fact_ids_json, needs_confirmation_json |
| trial_contact_log | snapshot_id, location_id, contacted_at, channel_code, status, note |

Eligibility Evaluation 只允许 met、not_met、unknown。unknown 必须列出缺失信息。临床匹配页面以 Snapshot 为中心显示，避免数据集更新后用户当时看到的结果消失。

### 5.7 Agent、查询和报告导出

| 表 | 关键字段 |
| --- | --- |
| agent_task | patient_id, task_type, input_snapshot_json, prompt_template_version, skill_refs_json, status |
| agent_result | task_id, result_json, citations_json, status, review_state |
| report_snapshot | patient_id, scope_code, facts_json, document_refs_json, created_at, created_by |
| export_artifact | snapshot_id, format_code, file_rel_path, sha256, template_version, created_at |

Agent 结果先保存为外部结果。用户选择“加入工作台”后，才转成 Candidate 或 Manual Fact。报告技能只读取冻结的 Report Snapshot；PDF、HTML 和 JPEG 作为同一次导出的 Artifact 保存。

## 6. 字段扩展机制

| 表 | 关键字段 | 作用 |
| --- | --- | --- |
| field_definition | namespace, field_key, version, value_type, unit_family, validation_json, display_json, applies_to_type | 定义新增字段的格式、验证和展示信息。 |
| fact_value | fact_id, field_definition_id, value_json, value_num, value_code, unit_code | 保存可扩展字段实际值。 |

约束：

1. 新增字段先新增 Field Definition，不能修改旧版本的语义。
2. 修改单位、选项含义或计算规则时增加 version，并提供双读或迁移。
3. 需要筛选、排序、画趋势的字段应提取专属列并建索引，不能长期仅放在 JSON。
4. 自定义字段命名空间为 custom.机构或 custom.技能，不能覆盖标准 code。
5. display_json 只是展示元数据，不能成为临床值的唯一来源。

## 7. 页面读模型与写入命令

| 页面 | 稳定读模型 | 数据来源 |
| --- | --- | --- |
| 首页 | dashboard.summary.v1 | 待核对数量、近期指标、计划、提醒、收藏。 |
| 病情整理 | records.library.v1、records.review.v1 | 文件、页面、候选项、确认事实。 |
| 病情一图秀 | timeline.series.v1 | 指标、治疗事件、照护事件、影像。 |
| 临床匹配 | trials.workspace.v1 | 查询、快照、规则分析、收藏、渠道。 |
| 营养 | nutrition.overview.v1 | 营养档案、体重、饮食、PEI。 |
| 心理 | mind.overview.v1 | 量表、趋势、资源、收藏。 |
| 全程管理 | care.plan.v1 | 治疗、并发症、管路、预约、提醒。 |
| 设置 | workspace.settings.v1 | 工作区、字典、备份、数据源版本。 |

读模型统一返回 schema_version、generated_at、data、provenance_summary、warnings。未知字段由客户端忽略；旧读模型至少保留两个发布周期。

写入只接受意图明确的命令：document.import、candidate.confirm、candidate.reject、fact.create_manual、fact.supersede、measurement.record、treatment_event.schedule、reminder.reschedule、trial_query.run、trial_match.save、assessment.submit、agent_result.import_as_candidate、report_snapshot.create、report_export.render。

每条命令带 command_id、expected_revision 和 actor_kind。服务端事务完成后返回受影响读模型的版本。

## 8. 每周前端迭代流程

1. 先确认卡片使用哪个读模型；只改布局、排序、Tab 或文案时不改 Schema。
2. 需要新字段时，先定义字段类型、单位、来源、确认状态和为空时的展示。
3. 新字段为空时显示未记录或隐藏卡片；空值不能解释为正常、阴性或无症状。
4. 用匿名演示患者分别验证旧数据、待确认数据和纯手工录入数据。
5. 迁移必须可重试；UI 版本可回滚；原始资料与确认事实不能因发布删除。

建议代码目录：

    workbench/schema/migrations/       数据库迁移
    workbench/schema/dictionaries/     指标、基因、字段字典
    workbench/server/repositories/     关系表访问
    workbench/server/commands/         事务、校验、审计
    workbench/server/read-models/      dashboard.summary.v1 等
    workbench/client/data-contracts/   TypeScript 或 Zod 契约
    workbench/client/features/         仅调用读模型与命令

## 9. 最小实施顺序

1. 工作区、患者、资料、页码、提取候选、Clinical Fact 和审计字段。
2. 指标、诊断、病理、基因、组化，先支撑 v2/v3 的资料核对和趋势。
3. 治疗计划、治疗事件、照护事件、预约、提醒，接通首页两周日历。
4. 营养、PEI、心理量表和资源收藏。
5. 离线试验数据版本、查询快照、规则分组分析、收藏和渠道状态。
6. Agent 任务、结果确认及 PDF、HTML、JPEG 的报告快照导出。

## 10. 验收条件

- 确认一条 CA19-9 后，资料整理、首页、趋势图和报告使用同一数值、日期、单位、来源页。
- 修订指标保留旧记录，并按临床发生时间显示。
- 每个试验匹配可看到数据集版本、规则原文、支持事实和待确认项。
- 被拒绝的提取错误不出现在首页、匹配或报告中。
- 调整 v3 卡片布局不需要迁移患者数据；新增一个病理字段不破坏旧报告。
- 删除前端缓存、重启 DSH Desktop 后，本机数据库和附件索引能恢复。
