-- Public trial data stays in the bundled read-only trials.db.
-- Patient-side match history stores immutable copies keyed by stable trial_key,
-- with no cross-database foreign keys to replaceable public rows.
PRAGMA user_version = 5;

CREATE TABLE match_assessment_v2 (
  id                    TEXT PRIMARY KEY,
  patient_id            TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  query_id              TEXT REFERENCES trial_query(id) ON DELETE SET NULL,
  trial_key             TEXT NOT NULL,
  trial_snapshot_json   TEXT NOT NULL,
  profile_revision      TEXT NOT NULL,
  generation_ids_json   TEXT NOT NULL DEFAULT '[]',
  rule_set_version      TEXT NOT NULL,
  evaluator_version     TEXT NOT NULL,
  inputs_frozen_json    TEXT NOT NULL,
  summary_json          TEXT NOT NULL DEFAULT '{}',
  status                TEXT NOT NULL DEFAULT 'current'
                        CHECK (status IN ('current','stale','superseded')),
  created_at            TEXT NOT NULL
);
CREATE INDEX ix_match_assessment_v2_patient ON match_assessment_v2(patient_id, created_at DESC);
CREATE INDEX ix_match_assessment_v2_trial ON match_assessment_v2(patient_id, trial_key, created_at DESC);

CREATE TABLE match_evaluation_v2 (
  id                    TEXT PRIMARY KEY,
  assessment_id         TEXT NOT NULL REFERENCES match_assessment_v2(id) ON DELETE RESTRICT,
  rule_key              TEXT NOT NULL,
  rule_version          TEXT NOT NULL,
  group_code            TEXT,
  rule_type             TEXT NOT NULL CHECK (rule_type IN ('inclusion','exclusion','other')),
  source_text           TEXT NOT NULL,
  result_code           TEXT NOT NULL CHECK (result_code IN ('met','not_met','unknown')),
  evidence_fact_ids_json TEXT NOT NULL DEFAULT '[]',
  needs_confirmation_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX ix_match_evaluation_v2_assessment ON match_evaluation_v2(assessment_id, group_code, result_code);

ALTER TABLE trial_local_bookmark
  ADD COLUMN match_assessment_id TEXT REFERENCES match_assessment_v2(id) ON DELETE SET NULL;
