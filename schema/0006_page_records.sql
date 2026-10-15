-- 基础页面记录所需的版本化心理感受条目定义；自由文本由用户主动填写后保存。
PRAGMA user_version = 6;
INSERT OR IGNORE INTO assessment_definition (code, version, domain_code, questions_json, scoring_json)
VALUES ('mood-checkin', '1', 'psychological', '[{"key":"mood","type":"single-choice"},{"key":"note","type":"optional-text"}]', '{}');
