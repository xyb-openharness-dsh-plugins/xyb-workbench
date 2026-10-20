-- 小胰宝工作台 · 初始 schema（迁移 0001）
-- 目标：node:sqlite（SQLite 3.53+）。每次连接必须执行 PRAGMA foreign_keys = ON。
-- 依据：SCHEMA-CANONICAL-MODEL-DRAFT.md、SCHEMA-SPEC.md、DATA-SCHEMA-DESIGN.md
-- 状态：可建库骨架。业务枚举以字典表为准，字典未覆盖时先扩展字典，不直接放宽约束。

PRAGMA user_version = 1;

-- ========== 工作区与患者 ==========

CREATE TABLE workspace (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  settings_json  TEXT NOT NULL DEFAULT '{}',
  created_at     TEXT NOT NULL,
  updated_at     TEXT NOT NULL
);

CREATE TABLE patient (
  id           TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspace(id) ON DELETE RESTRICT,
  display_name TEXT NOT NULL,
  birth_date   TEXT,
  sex_at_birth TEXT,
  height_cm    REAL,
  status       TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','archived')),
  revision     INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL
);
CREATE INDEX ix_patient_workspace ON patient(workspace_id);

CREATE TABLE patient_contact (
  id           TEXT PRIMARY KEY,
  patient_id   TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  kind         TEXT NOT NULL,
  name         TEXT,
  phone_enc    TEXT,
  relationship TEXT,
  is_primary   INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);
CREATE INDEX ix_contact_patient ON patient_contact(patient_id);

CREATE TABLE care_team_member (
  id           TEXT PRIMARY KEY,
  patient_id   TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  role_code    TEXT NOT NULL,
  organization TEXT,
  name         TEXT,
  contact_id   TEXT REFERENCES patient_contact(id) ON DELETE SET NULL
);
CREATE INDEX ix_careteam_patient ON care_team_member(patient_id);

-- ========== 资料、分页、抽取候选 ==========

CREATE TABLE document (
  id            TEXT PRIMARY KEY,
  patient_id    TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  kind_code     TEXT NOT NULL,
  title         TEXT NOT NULL,
  file_rel_path TEXT NOT NULL,
  sha256        TEXT NOT NULL,
  reported_at   TEXT,
  page_count    INTEGER,
  parse_status  TEXT NOT NULL DEFAULT 'pending'
                 CHECK (parse_status IN ('pending','parsing','partial','parsed','failed')),
  status        TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','superseded')),
  created_at    TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_document_hash ON document(patient_id, sha256);
CREATE INDEX ix_document_patient ON document(patient_id, reported_at);

CREATE TABLE document_page (
  id            TEXT PRIMARY KEY,
  document_id   TEXT NOT NULL REFERENCES document(id) ON DELETE RESTRICT,
  page_no       INTEGER NOT NULL,
  content_type  TEXT NOT NULL
                 CHECK (content_type IN ('text','table-image','table-text','image-only','blank')),
  parse_method  TEXT,
  parse_status  TEXT NOT NULL DEFAULT 'pending'
                 CHECK (parse_status IN ('pending','parsing','parsed','failed','skipped')),
  image_rel_path TEXT,
  ocr_text      TEXT,
  page_hash     TEXT,
  UNIQUE (document_id, page_no)
);
CREATE INDEX ix_page_document ON document_page(document_id, page_no);

CREATE TABLE extraction_run (
  id             TEXT PRIMARY KEY,
  document_id    TEXT NOT NULL REFERENCES document(id) ON DELETE RESTRICT,
  engine         TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  input_hash     TEXT NOT NULL,
  status         TEXT NOT NULL
                  CHECK (status IN ('queued','running','succeeded','failed','cancelled')),
  started_at     TEXT NOT NULL,
  finished_at    TEXT
);
CREATE INDEX ix_run_document ON extraction_run(document_id, started_at);

CREATE TABLE extraction_candidate (
  id             TEXT PRIMARY KEY,
  run_id         TEXT NOT NULL REFERENCES extraction_run(id) ON DELETE RESTRICT,
  patient_id     TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  fact_type      TEXT NOT NULL,
  payload_json   TEXT NOT NULL,
  source_page_id TEXT REFERENCES document_page(id) ON DELETE SET NULL,
  source_locator TEXT,
  confidence     REAL,
  status         TEXT NOT NULL DEFAULT 'candidate'
                  CHECK (status IN ('candidate','confirmed','rejected','superseded')),
  created_at     TEXT NOT NULL
);
CREATE INDEX ix_candidate_patient_status ON extraction_candidate(patient_id, status);
CREATE INDEX ix_candidate_run ON extraction_candidate(run_id);

CREATE TABLE document_comparison (
  id               TEXT PRIMARY KEY,
  patient_id       TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  left_document_id TEXT REFERENCES document(id) ON DELETE SET NULL,
  right_document_id TEXT REFERENCES document(id) ON DELETE SET NULL,
  comparison_kind  TEXT NOT NULL,
  result_json      TEXT NOT NULL,
  created_at       TEXT NOT NULL
);
CREATE INDEX ix_comparison_patient ON document_comparison(patient_id, created_at);

-- ========== 事实锚点 ==========

CREATE TABLE clinical_fact (
  id            TEXT PRIMARY KEY,
  patient_id    TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  fact_type     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'confirmed'
                 CHECK (status IN ('candidate','confirmed','rejected','superseded')),
  occurred_from TEXT,
  occurred_to   TEXT,
  recorded_at   TEXT NOT NULL,
  source_kind   TEXT NOT NULL
                 CHECK (source_kind IN ('document','manual','agent_result','import')),  -- 来源类型；manual 允许无文档，必须有 confirmed_by
  source_document_id TEXT REFERENCES document(id) ON DELETE SET NULL,
  source_page_id     TEXT REFERENCES document_page(id) ON DELETE SET NULL,
  source_locator     TEXT,
  confirmed_by       TEXT,
  confirmed_at       TEXT,
  supersedes_id      TEXT REFERENCES clinical_fact(id) ON DELETE SET NULL,
  summary            TEXT,
  revision           INTEGER NOT NULL DEFAULT 1,
  CHECK (source_kind <> 'document' OR source_document_id IS NOT NULL)
);
CREATE INDEX ix_fact_patient_type ON clinical_fact(patient_id, fact_type, occurred_from);
CREATE INDEX ix_fact_patient_time ON clinical_fact(patient_id, occurred_from);
CREATE INDEX ix_fact_status ON clinical_fact(status);

-- ========== 领域结果 ==========

CREATE TABLE diagnosis (
  fact_id          TEXT PRIMARY KEY REFERENCES clinical_fact(id) ON DELETE RESTRICT,
  disease_code     TEXT NOT NULL,
  primary_site_code TEXT,
  stage_code       TEXT,
  diagnosis_basis  TEXT,
  is_primary       INTEGER NOT NULL DEFAULT 0
);

-- patient_id 与 occurred_at 为派生冗余列，与 clinical_fact 同事务写入；
-- 权威值是 clinical_fact.patient_id / occurred_from，冗余仅用于索引与时序查询。
CREATE TABLE observation (
  fact_id        TEXT PRIMARY KEY REFERENCES clinical_fact(id) ON DELETE RESTRICT,
  patient_id     TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  occurred_at    TEXT,
  metric_code    TEXT NOT NULL,
  value_num      REAL,
  value_raw      TEXT NOT NULL,
  comparator     TEXT NOT NULL DEFAULT '=' CHECK (comparator IN ('=','>','<','>=','<=')),
  unit_raw       TEXT,
  unit_std       TEXT,
  unit_std_factor REAL,
  ref_low        REAL,
  ref_high       REAL,
  abnormal_flag  TEXT,
  specimen_code  TEXT,
  status         TEXT NOT NULL
                  CHECK (status IN ('measured','not_tested','negative','unknown')),
  CHECK (status <> 'measured' OR value_raw <> '')
);
CREATE INDEX ix_obs_metric_date ON observation(patient_id, metric_code, occurred_at);
CREATE INDEX ix_obs_patient_date ON observation(patient_id, occurred_at);
CREATE INDEX ix_obs_unit ON observation(patient_id, metric_code, unit_std);

CREATE TABLE pathology_report (
  fact_id              TEXT PRIMARY KEY REFERENCES clinical_fact(id) ON DELETE RESTRICT,
  specimen_site        TEXT,
  histology_code       TEXT,
  grade_code           TEXT,
  tumor_cellularity_pct REAL,
  summary_json         TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE molecular_result (
  id                TEXT PRIMARY KEY,
  patient_id        TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  fact_id           TEXT NOT NULL REFERENCES clinical_fact(id) ON DELETE RESTRICT,
  pathology_report_id TEXT REFERENCES pathology_report(fact_id) ON DELETE SET NULL,
  assay_type        TEXT NOT NULL CHECK (assay_type IN ('NGS','PCR','IHC','FISH','other')),
  marker_code       TEXT NOT NULL,
  gene_code         TEXT,
  result_type       TEXT NOT NULL
                     CHECK (result_type IN ('negative','positive','percentage','score','cps','protein_expression','not_tested','unknown')),
  result_raw        TEXT NOT NULL,
  variant_hgvs      TEXT,
  alteration_code   TEXT,
  vaf_pct           REAL,
  tmb               REAL,
  intensity         TEXT,
  positive_pct      REAL,
  cps               REAL,
  score_text        TEXT,
  classification_code TEXT,
  test_method       TEXT,
  status            TEXT NOT NULL
                     CHECK (status IN ('measured','not_tested','negative','unknown')),
  occurred_at       TEXT
);
CREATE INDEX ix_molecular_patient_marker ON molecular_result(patient_id, marker_code, occurred_at);
CREATE INDEX ix_molecular_assay ON molecular_result(patient_id, assay_type);

CREATE TABLE imaging_finding (
  fact_id        TEXT PRIMARY KEY REFERENCES clinical_fact(id) ON DELETE RESTRICT,
  modality_code  TEXT NOT NULL,
  body_site_code TEXT,
  lesion_summary TEXT,
  response_code  TEXT,
  structured_json TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE symptom_record (
  fact_id    TEXT PRIMARY KEY REFERENCES clinical_fact(id) ON DELETE RESTRICT,
  symptom_code TEXT NOT NULL,
  severity   TEXT,
  onset_at   TEXT,
  resolved_at TEXT,
  note       TEXT
);

-- ========== 治疗与照护 ==========

CREATE TABLE treatment_line (
  id         TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  fact_id    TEXT REFERENCES clinical_fact(id) ON DELETE SET NULL,
  line_no    INTEGER,
  regimen    TEXT,
  intent_code TEXT,
  status     TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('planned','active','completed','stopped','unknown')),
  started_at TEXT,
  ended_at   TEXT,
  efficacy   TEXT,
  stop_reason TEXT CHECK (stop_reason IN ('progress','toxicity','patient_choice','completed','unknown')),
  revision   INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX ix_treatmentline_patient ON treatment_line(patient_id, line_no);

CREATE TABLE treatment_line_drug (
  line_id    TEXT NOT NULL REFERENCES treatment_line(id) ON DELETE RESTRICT,
  drug_raw   TEXT NOT NULL,
  drug_std   TEXT,
  normalized INTEGER NOT NULL DEFAULT 0,
  route_code TEXT,
  dose_text  TEXT,
  PRIMARY KEY (line_id, drug_raw)
);
CREATE INDEX ix_drug_std ON treatment_line_drug(drug_std);

CREATE TABLE treatment_event (
  id           TEXT PRIMARY KEY,
  patient_id   TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  fact_id      TEXT REFERENCES clinical_fact(id) ON DELETE SET NULL,
  line_id      TEXT REFERENCES treatment_line(id) ON DELETE SET NULL,
  event_type   TEXT NOT NULL,
  cycle_no     INTEGER,
  day_no       INTEGER,
  scheduled_at TEXT,
  completed_at TEXT,
  dose_json    TEXT NOT NULL DEFAULT '{}',
  status       TEXT NOT NULL DEFAULT 'planned'
                CHECK (status IN ('planned','completed','skipped','stopped'))
);
CREATE INDEX ix_treatment_event_line ON treatment_event(line_id, scheduled_at);

CREATE TABLE medication_record (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  drug_code   TEXT NOT NULL,
  purpose_code TEXT,
  dose_text   TEXT,
  route_code  TEXT,
  started_at  TEXT,
  ended_at    TEXT,
  status      TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','stopped','unknown')),
  revision    INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX ix_medication_patient ON medication_record(patient_id, status);

CREATE TABLE toxicity_record (
  id        TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  fact_id   TEXT REFERENCES clinical_fact(id) ON DELETE SET NULL,
  toxicity_code TEXT NOT NULL,
  ctcae_grade TEXT,
  related_treatment_event_id TEXT REFERENCES treatment_event(id) ON DELETE SET NULL,
  onset_at  TEXT,
  resolved_at TEXT,
  outcome_code TEXT,
  status    TEXT NOT NULL DEFAULT 'unknown'
             CHECK (status IN ('active','resolved','unknown')),
  revision  INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX ix_toxicity_patient ON toxicity_record(patient_id, onset_at);

CREATE TABLE comorbidity_status (
  id        TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  fact_id   TEXT REFERENCES clinical_fact(id) ON DELETE SET NULL,
  comorbidity_code TEXT NOT NULL,
  state     TEXT NOT NULL CHECK (state IN ('active','past','none','unknown')),
  severity  TEXT,
  source_ref_json TEXT NOT NULL DEFAULT '{}',
  occurred_at TEXT,
  revision  INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX ix_comorbidity_patient ON comorbidity_status(patient_id, comorbidity_code, occurred_at);

CREATE TABLE catheter_record (
  id           TEXT PRIMARY KEY,
  patient_id   TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  fact_id      TEXT REFERENCES clinical_fact(id) ON DELETE SET NULL,
  type_code    TEXT NOT NULL CHECK (type_code IN ('PTCD','surgical','Port','PICC','other')),
  implant_date TEXT,
  site         TEXT,
  status       TEXT NOT NULL DEFAULT 'unknown'
                CHECK (status IN ('in_place','removed','unknown')),
  brand        TEXT,
  model        TEXT,
  hospital     TEXT,
  doctor       TEXT,
  revision     INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX ix_catheter_patient ON catheter_record(patient_id, implant_date);

CREATE TABLE catheter_maintenance (
  id            TEXT PRIMARY KEY,
  catheter_id   TEXT NOT NULL REFERENCES catheter_record(id) ON DELETE RESTRICT,
  date          TEXT NOT NULL,
  action        TEXT,
  performer     TEXT,
  abnormal      INTEGER NOT NULL DEFAULT 0,
  next_planned_date TEXT,
  note          TEXT
);
CREATE INDEX ix_cath_maint ON catheter_maintenance(catheter_id, date DESC);

CREATE TABLE appointment (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  kind_code   TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  organization TEXT,
  status      TEXT NOT NULL DEFAULT 'scheduled'
               CHECK (status IN ('scheduled','completed','cancelled','unknown')),
  related_plan_id TEXT REFERENCES treatment_line(id) ON DELETE SET NULL,
  note        TEXT,
  revision    INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX ix_appointment_patient ON appointment(patient_id, scheduled_at);

CREATE TABLE reminder (
  id           TEXT PRIMARY KEY,
  patient_id   TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  appointment_id TEXT REFERENCES appointment(id) ON DELETE SET NULL,
  rule_code    TEXT NOT NULL,
  due_at       TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','completed','cancelled')),
  payload_json TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX ix_reminder_patient ON reminder(patient_id, status, due_at);

-- ========== 营养、心理、时间轴 ==========

CREATE TABLE nutrition_profile (
  id                  TEXT PRIMARY KEY,
  patient_id          TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  energy_target_kcal  REAL,
  protein_min_g       REAL,
  protein_max_g       REAL,
  calculation_basis_json TEXT NOT NULL DEFAULT '{}',
  basis_version       TEXT NOT NULL DEFAULT 'v1',
  updated_at          TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_nutrition_profile ON nutrition_profile(patient_id);

CREATE TABLE nutrition_entry (
  id            TEXT PRIMARY KEY,
  patient_id    TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  occurred_at   TEXT NOT NULL,  -- 摄入/体重记录时间（非写入时间）
  weight_kg     REAL,
  intake_pct    REAL,
  appetite_code TEXT,
  digestive_symptoms_json TEXT NOT NULL DEFAULT '{}',
  note          TEXT
);
CREATE INDEX ix_nutrition_entry ON nutrition_entry(patient_id, occurred_at);

CREATE TABLE pei_record (
  id                 TEXT PRIMARY KEY,
  patient_id         TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  occurred_at        TEXT NOT NULL,
  medication_record_id TEXT REFERENCES medication_record(id) ON DELETE SET NULL,
  with_meal          INTEGER,
  dose_text          TEXT,
  stool_change_code  TEXT,
  note               TEXT
);
CREATE INDEX ix_pei_patient ON pei_record(patient_id, occurred_at);

CREATE TABLE assessment_definition (
  code        TEXT NOT NULL,
  version     TEXT NOT NULL,
  domain_code TEXT NOT NULL,
  questions_json TEXT NOT NULL DEFAULT '[]',
  scoring_json   TEXT NOT NULL DEFAULT '{}',
  PRIMARY KEY (code, version)
);

CREATE TABLE assessment_response (
  id                TEXT PRIMARY KEY,
  patient_id        TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  definition_code   TEXT NOT NULL,
  definition_version TEXT NOT NULL,
  occurred_at       TEXT NOT NULL,
  answers_json      TEXT NOT NULL DEFAULT '{}',
  score_json        TEXT NOT NULL DEFAULT '{}',
  status            TEXT NOT NULL DEFAULT 'confirmed'
                     CHECK (status IN ('candidate','confirmed','rejected','superseded')),
  FOREIGN KEY (definition_code, definition_version)
    REFERENCES assessment_definition(code, version) ON DELETE RESTRICT
);
CREATE INDEX ix_assessment_patient ON assessment_response(patient_id, definition_code, occurred_at);

CREATE TABLE support_resource (
  id          TEXT PRIMARY KEY,
  domain_code TEXT NOT NULL,
  title       TEXT NOT NULL,
  content_json TEXT NOT NULL DEFAULT '{}',
  source_url  TEXT,
  region_code TEXT,
  verified_at TEXT,
  updated_at  TEXT NOT NULL
);
CREATE INDEX ix_resource_domain ON support_resource(domain_code, verified_at);

CREATE TABLE resource_bookmark (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  resource_id TEXT NOT NULL REFERENCES support_resource(id) ON DELETE RESTRICT,
  note        TEXT,
  status      TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('active','removed')),
  created_at  TEXT NOT NULL
);
CREATE UNIQUE INDEX ux_bookmark ON resource_bookmark(patient_id, resource_id);

CREATE TABLE timeline_annotation (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  anchor_date TEXT NOT NULL,
  text        TEXT NOT NULL,
  offset_x    REAL NOT NULL DEFAULT 0,
  offset_y    REAL NOT NULL DEFAULT 0,
  source_kind TEXT NOT NULL,
  source_ref_json TEXT NOT NULL DEFAULT '{}',
  revision    INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX ix_annotation_patient ON timeline_annotation(patient_id, anchor_date);

CREATE TABLE timeline_dataset (
  id            TEXT PRIMARY KEY,
  patient_id    TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  kind_code     TEXT NOT NULL,
  import_source TEXT NOT NULL,
  imported_at   TEXT NOT NULL,
  row_count     INTEGER,
  corrections_json TEXT NOT NULL DEFAULT '[]',
  export_records_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX ix_dataset_patient ON timeline_dataset(patient_id, imported_at);

-- ========== 试验、匹配、报告 ==========
-- 说明：trial_record 为公共只读数据，可整体替换；用户内容一律用 trial_key 关联，不用自增键。

CREATE TABLE trial_record (
  trial_key         TEXT NOT NULL,
  source_id         TEXT NOT NULL,
  record_id         TEXT NOT NULL,
  generation        TEXT NOT NULL,
  registry_id       TEXT,
  title             TEXT NOT NULL,
  condition_json    TEXT NOT NULL DEFAULT '{}',
  phase             TEXT,
  recruitment_status TEXT,
  last_verified_at  TEXT,
  PRIMARY KEY (trial_key),
  UNIQUE (source_id, record_id, generation)
);
CREATE INDEX ix_trial_generation ON trial_record(generation);

CREATE TABLE trial_location (
  id         TEXT PRIMARY KEY,
  trial_key  TEXT NOT NULL REFERENCES trial_record(trial_key) ON DELETE RESTRICT,
  country_code TEXT,
  province   TEXT,
  city       TEXT,
  organization TEXT,
  contact_json TEXT NOT NULL DEFAULT '{}',
  status     TEXT NOT NULL DEFAULT 'unknown'
              CHECK (status IN ('active','unknown','inactive'))
);
CREATE INDEX ix_location_trial ON trial_location(trial_key);

CREATE TABLE trial_eligibility_rule (
  id                 TEXT PRIMARY KEY,
  trial_key          TEXT NOT NULL REFERENCES trial_record(trial_key) ON DELETE RESTRICT,
  rule_version       TEXT NOT NULL,
  group_code         TEXT,
  source_text        TEXT NOT NULL,
  rule_type          TEXT NOT NULL,
  condition_json     TEXT NOT NULL DEFAULT '{}',
  confirmation_status TEXT NOT NULL DEFAULT 'pending'
                       CHECK (confirmation_status IN ('pending','confirmed','rejected')),
  confirmed_by       TEXT,
  confirmed_at       TEXT,
  UNIQUE (trial_key, source_text, rule_version)
);
CREATE INDEX ix_rule_trial ON trial_eligibility_rule(trial_key, confirmation_status);

CREATE TABLE trial_query (
  id                TEXT PRIMARY KEY,
  patient_id        TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  requested_by      TEXT,
  query_json        TEXT NOT NULL DEFAULT '{}',
  generation_ids_json TEXT NOT NULL DEFAULT '[]',
  agent_task_id     TEXT,
  created_at        TEXT NOT NULL
);
CREATE INDEX ix_query_patient ON trial_query(patient_id, created_at);

CREATE TABLE match_assessment (
  id               TEXT PRIMARY KEY,
  patient_id       TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  trial_key        TEXT NOT NULL REFERENCES trial_record(trial_key) ON DELETE RESTRICT,
  query_id         TEXT REFERENCES trial_query(id) ON DELETE SET NULL,
  profile_revision TEXT NOT NULL,
  rule_set_version TEXT NOT NULL,
  generation_ids_json TEXT NOT NULL DEFAULT '[]',
  evaluator_version TEXT NOT NULL,
  inputs_frozen_json TEXT NOT NULL DEFAULT '{}',
  summary_json     TEXT NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'current'
                    CHECK (status IN ('current','stale','superseded')),
  created_at       TEXT NOT NULL
);
CREATE INDEX ix_assessment_patient_trial ON match_assessment(patient_id, trial_key, created_at);

CREATE TABLE match_evaluation (
  id                  TEXT PRIMARY KEY,
  assessment_id       TEXT NOT NULL REFERENCES match_assessment(id) ON DELETE RESTRICT,
  rule_id             TEXT NOT NULL REFERENCES trial_eligibility_rule(id) ON DELETE RESTRICT,
  rule_version        TEXT NOT NULL,
  result_code         TEXT NOT NULL CHECK (result_code IN ('met','not_met','unknown')),
  evidence_fact_ids_json TEXT NOT NULL DEFAULT '[]',
  needs_confirmation_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX ix_evaluation_assessment ON match_evaluation(assessment_id, result_code);

CREATE TABLE trial_bookmark (
  id         TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  trial_key  TEXT NOT NULL,
  snapshot_id TEXT REFERENCES match_assessment(id) ON DELETE SET NULL,
  status     TEXT NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','removed')),
  created_at TEXT NOT NULL,
  UNIQUE (patient_id, trial_key)
);
CREATE INDEX ix_bookmark_patient ON trial_bookmark(patient_id, created_at);

CREATE TABLE trial_note (
  id         TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  trial_key  TEXT NOT NULL,
  body       TEXT NOT NULL,
  revision   INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);
CREATE INDEX ix_note_patient_trial ON trial_note(patient_id, trial_key, created_at);

CREATE TABLE trial_contact_log (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  trial_key   TEXT NOT NULL,
  location_id TEXT REFERENCES trial_location(id) ON DELETE SET NULL,
  snapshot_id TEXT REFERENCES match_assessment(id) ON DELETE SET NULL,
  contacted_at TEXT NOT NULL,
  channel_code TEXT,
  status      TEXT NOT NULL DEFAULT 'contacted'
               CHECK (status IN ('contacted','pending','declined','unknown')),
  note        TEXT
);
CREATE INDEX ix_contactlog_patient ON trial_contact_log(patient_id, trial_key, contacted_at);

CREATE TABLE data_channel (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  type_code       TEXT NOT NULL CHECK (type_code IN ('skill','database')),
  enabled         INTEGER NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'needs-setup'
                   CHECK (status IN ('ready','partial','needs-setup','failed','disabled','updating')),
  coverage_json   TEXT NOT NULL DEFAULT '{}',
  last_checked_at TEXT,
  last_success_at TEXT,
  failure_reason  TEXT
);

-- ========== Agent 与报告 ==========

CREATE TABLE agent_task (
  id                  TEXT PRIMARY KEY,
  patient_id          TEXT REFERENCES patient(id) ON DELETE RESTRICT,
  task_type           TEXT NOT NULL,
  input_snapshot_json TEXT NOT NULL DEFAULT '{}',
  prompt_template_version TEXT,
  skill_refs_json     TEXT NOT NULL DEFAULT '[]',
  status              TEXT NOT NULL DEFAULT 'queued'
                       CHECK (status IN ('queued','running','succeeded','failed','cancelled','interrupted')),
  created_at          TEXT NOT NULL
);
CREATE INDEX ix_agent_task_patient ON agent_task(patient_id, created_at);

CREATE TABLE agent_result (
  id           TEXT PRIMARY KEY,
  task_id      TEXT NOT NULL REFERENCES agent_task(id) ON DELETE RESTRICT,
  result_json  TEXT NOT NULL DEFAULT '{}',
  citations_json TEXT NOT NULL DEFAULT '[]',
  status       TEXT NOT NULL DEFAULT 'succeeded'
                CHECK (status IN ('succeeded','failed','partial')),
  review_state TEXT NOT NULL DEFAULT 'unreviewed'
                CHECK (review_state IN ('unreviewed','imported','dismissed')),
  created_at   TEXT NOT NULL
);
CREATE INDEX ix_agent_result_task ON agent_result(task_id);

CREATE TABLE report_snapshot (
  id                TEXT PRIMARY KEY,
  patient_id        TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  scope_code        TEXT NOT NULL,
  facts_json        TEXT NOT NULL DEFAULT '{}',
  document_refs_json TEXT NOT NULL DEFAULT '[]',
  template_version  TEXT NOT NULL,
  created_at        TEXT NOT NULL,
  created_by        TEXT
);
CREATE INDEX ix_report_patient ON report_snapshot(patient_id, created_at);

CREATE TABLE export_artifact (
  id              TEXT PRIMARY KEY,
  snapshot_id     TEXT NOT NULL REFERENCES report_snapshot(id) ON DELETE RESTRICT,
  format_code     TEXT NOT NULL CHECK (format_code IN ('html','pdf','jpeg')),
  file_rel_path   TEXT NOT NULL,
  sha256          TEXT NOT NULL,
  template_version TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  UNIQUE (snapshot_id, format_code)
);

-- ========== 扩展字段与迁移记录 ==========

CREATE TABLE field_definition (
  id             TEXT PRIMARY KEY,
  namespace      TEXT NOT NULL,
  field_key      TEXT NOT NULL,
  version        TEXT NOT NULL,
  value_type     TEXT NOT NULL,
  unit_family    TEXT,
  validation_json TEXT NOT NULL DEFAULT '{}',
  display_json   TEXT NOT NULL DEFAULT '{}',
  applies_to_type TEXT,
  UNIQUE (namespace, field_key, version)
);

CREATE TABLE fact_value (
  id                 TEXT PRIMARY KEY,
  fact_id            TEXT NOT NULL REFERENCES clinical_fact(id) ON DELETE RESTRICT,
  field_definition_id TEXT NOT NULL REFERENCES field_definition(id) ON DELETE RESTRICT,
  value_json         TEXT,
  value_num          REAL,
  value_code         TEXT,
  unit_code          TEXT,
  UNIQUE (fact_id, field_definition_id)
);
CREATE INDEX ix_factvalue_def ON fact_value(field_definition_id);

-- schema_migration 由迁移执行器创建（migrate.mjs），不在本迁移内重复建表。

CREATE TABLE dashboard_snapshot (
  id              TEXT PRIMARY KEY,
  patient_id      TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  dimensions_json TEXT NOT NULL DEFAULT '{}',
  data_version_ref TEXT,
  created_at      TEXT NOT NULL,
  created_by      TEXT
);
CREATE INDEX ix_dashboard_snapshot ON dashboard_snapshot(patient_id, created_at);

-- ========== 提示 ==========
-- 1. FTS5（中文 trigram 分词）未实测，不在本迁移内；验证后再加单独迁移。
-- 2. 加密列（如心理评估）以字段级加密实现，表结构保持明文列，密钥管理另行设计。
