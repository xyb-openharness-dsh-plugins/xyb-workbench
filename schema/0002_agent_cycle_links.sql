-- 小胰宝工作台 · 迁移 0002
-- 冻结 v1 的 Agent 上下文与治疗周期关联。0001 已用于真实建库后不得回写。

PRAGMA user_version = 2;

-- “给我建议”需要保留页面摘要、实际渲染的提示词和可选的 DSH 会话引用，
-- 以便结果可复核、可重新执行，并且不会把 Agent 输出直接当作业务事实。
ALTER TABLE agent_task ADD COLUMN page_code TEXT;
ALTER TABLE agent_task ADD COLUMN agent_role_code TEXT;
ALTER TABLE agent_task ADD COLUMN prompt_template_id TEXT;
ALTER TABLE agent_task ADD COLUMN prompt_rendered TEXT;
ALTER TABLE agent_task ADD COLUMN session_ref TEXT;
ALTER TABLE agent_task ADD COLUMN input_snapshot_hash TEXT;
ALTER TABLE agent_task ADD COLUMN requested_by TEXT;
CREATE INDEX ix_agent_task_session ON agent_task(session_ref, created_at);

ALTER TABLE agent_result ADD COLUMN summary TEXT;
ALTER TABLE agent_result ADD COLUMN output_rel_path TEXT;

-- 预约、检查与提醒可精确关联某次治疗，而不只关联整条治疗线。
ALTER TABLE appointment ADD COLUMN related_treatment_event_id TEXT REFERENCES treatment_event(id) ON DELETE SET NULL;
ALTER TABLE reminder ADD COLUMN related_treatment_event_id TEXT REFERENCES treatment_event(id) ON DELETE SET NULL;
CREATE INDEX ix_appointment_treatment_event ON appointment(related_treatment_event_id, scheduled_at);
CREATE INDEX ix_reminder_treatment_event ON reminder(related_treatment_event_id, due_at);
