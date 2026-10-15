-- Keep the source record that the patient saw when saving a trial.
ALTER TABLE trial_local_bookmark
  ADD COLUMN snapshot_json TEXT NOT NULL DEFAULT '{}';

PRAGMA user_version = 9;
