-- Add the local document formats supported by the report export workflow.
PRAGMA user_version = 8;

CREATE TABLE export_artifact_v8 (
  id               TEXT PRIMARY KEY,
  snapshot_id      TEXT NOT NULL REFERENCES report_snapshot(id) ON DELETE RESTRICT,
  format_code      TEXT NOT NULL CHECK (format_code IN ('html','pdf','jpeg','md','docx')),
  file_rel_path    TEXT NOT NULL,
  sha256           TEXT NOT NULL,
  template_version TEXT NOT NULL,
  created_at       TEXT NOT NULL,
  UNIQUE (snapshot_id, format_code)
);
INSERT INTO export_artifact_v8 (id, snapshot_id, format_code, file_rel_path, sha256, template_version, created_at)
  SELECT id, snapshot_id, format_code, file_rel_path, sha256, template_version, created_at FROM export_artifact;
DROP TABLE export_artifact;
ALTER TABLE export_artifact_v8 RENAME TO export_artifact;
