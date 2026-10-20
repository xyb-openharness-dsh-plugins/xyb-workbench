# 冻结契约（freeze-contract）

配套：task-4。依据 `SCHEMA-REVIEW-2026-10-13.md` §3「匹配结论不足以复现」。
目标：把 `match_assessment.inputs_frozen_json` 与 `report_snapshot.facts_json` 从「任意 JSON blob」升级为**带可执行校验 schema 的结构**，使任意一次评估/报告在数据集、规则、判定器更新后仍能解释与复算。

> 本文件与 `contracts/` 下的 JSON Schema 为唯一权威；`0001_initial.sql` 不改动（按 task-4 约束）。

## 1. 为什么需要冻结（§3 的三个缺口）

| §3 缺口 | 本契约的落点 |
|---|---|
| 未锁定稳定试验键、来源代次、规则原文及版本 | `frozen_rule_set[].trial_key` + `rule_version` + `source_text`（**原文与版本同步冻结**，不只 `rule_id`） |
| 公共库与患者收藏/笔记边界未落表 | 用户侧只存 `trial_key`；本契约冻结的是当时快照的取值，不依赖公共库当前行 |
| 跟进记录依附某次评估 | `match_assessment` 冻结输入与逐条结果；`trial_contact_log`/`trial_note` 独立可跨评估延续（已在 0001 中） |

## 2. match_assessment.inputs_frozen_json 契约

冻结内容（全部在生成评估时一次性写入，之后只读）：

1. **输入档案版本与取值**（`profile`）：患者档案 revision、参与判定的事实取值快照（含医学空值四态，不静默填 `unknown`）。
2. **规则集版本与原文**（`frozen_rule_set`）：每条规则 `rule_id` + `rule_version` + `source_text` + `rule_type`（含 `exclusion` 反面清单）。**原文与版本必须共存**。
3. **来源与数据代次**（`generation_ids`）：公共试验数据包代次，用于数据包替换后回溯。
4. **判定器版本**（`evaluator_version`）。
5. **逐条结果与缺失项**（`evaluations`）：`result_code ∈ {met, not_met, unknown}`，缺失一律 `unknown`；`needs_confirmation` 列出待人工确认项。

> 注：0001 的 `match_assessment` 已有列 `profile_revision`/`rule_set_version`/`generation_ids_json`/`evaluator_version`/`inputs_frozen_json`；本契约规定 `inputs_frozen_json` 的具体结构（把原文与逐条结果一并封入），`match_evaluation` 表仍存 `rule_id`+`rule_version` 作为可索引副本，二者以本契约对齐。

## 3. report_snapshot.facts_json 契约

冻结内容：报告生成时的 `scope_code`、被纳入的事实清单（每个事实的 `fact_id`、类型、`occurred_at`、`status`、取值摘要）、文档引用、模板版本。保证「汇总与明细一致、导出用同一冻结快照」。

## 4. 校验方式

- `contracts/match_assessment.schema.json`：JSON Schema（draft-07）描述 `inputs_frozen_json`。
- `contracts/report_snapshot.schema.json`：JSON Schema 描述 `facts_json`。
- `contracts/validate.mjs`：**无外部依赖**的可执行校验器，用 `node` 运行，对示例与（可选）实际库行做校验，输出 PASS/FAIL 与具体违规项。

## 5. 复现保证

- 数据集或规则更新 → 旧 `match_assessment` 行的 `inputs_frozen_json` 不变，用户看到的结果仍可解释。
- 系统检测到 `rule_set_version` 或 `generation_ids` 与当前不符 → 标记 `status='stale'`，提示重新评估，**不静默重算**。
- 任何写入 `inputs_frozen_json` 的环节必须先过 `validate.mjs` 的等价校验（应用层）。
