-- Public trial records live in the separately bundled read-only database.
-- These patient-specific records intentionally keep only its stable trial_key.
PRAGMA user_version = 4;

CREATE TABLE trial_local_bookmark (
  id          TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  trial_key   TEXT NOT NULL,
  state       TEXT NOT NULL DEFAULT 'saved' CHECK (state IN ('saved','contacted','archived')),
  note        TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  UNIQUE (patient_id, trial_key)
);
CREATE INDEX ix_trial_local_bookmark_patient ON trial_local_bookmark(patient_id, updated_at DESC);

CREATE TABLE trial_subscription (
  id                TEXT PRIMARY KEY,
  patient_id        TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  query_text        TEXT NOT NULL,
  target_terms_json TEXT NOT NULL DEFAULT '[]',
  schedule_code     TEXT NOT NULL DEFAULT 'weekly',
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused')),
  last_checked_at   TEXT,
  last_task_id      TEXT REFERENCES agent_task(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);
CREATE INDEX ix_trial_subscription_patient ON trial_subscription(patient_id, status, updated_at DESC);
