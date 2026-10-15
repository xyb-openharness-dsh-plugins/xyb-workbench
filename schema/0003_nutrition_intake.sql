-- 小胰宝工作台 · 迁移 0003
-- 营养趋势需要记录实际能量、蛋白质与营养制剂，不能从 UI 临时状态推断。

PRAGMA user_version = 3;

ALTER TABLE nutrition_entry ADD COLUMN intake_kcal REAL;
ALTER TABLE nutrition_entry ADD COLUMN protein_g REAL;

CREATE TABLE nutrition_product_usage (
  id            TEXT PRIMARY KEY,
  patient_id    TEXT NOT NULL REFERENCES patient(id) ON DELETE RESTRICT,
  occurred_at   TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  product_type  TEXT,
  volume_ml     REAL,
  energy_kcal   REAL,
  protein_g     REAL,
  note          TEXT,
  created_at    TEXT NOT NULL
);
CREATE INDEX ix_nutrition_product_usage_patient ON nutrition_product_usage(patient_id, occurred_at);
