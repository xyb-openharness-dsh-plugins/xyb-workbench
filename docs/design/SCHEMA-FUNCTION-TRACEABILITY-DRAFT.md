# 功能 → 实体 → 读模型 追溯矩阵（草稿）

日期：2026-10-13 · 状态：**收敛用草稿**
上游：`SCHEMA-REVIEW-2026-10-13.md`、`SCHEMA-CANONICAL-MODEL-DRAFT.md`、`V2-V3-PARITY-AUDIT.md`
用途：证明 v2 已有能力与 v3 当前形态都能由同一套领域模型支撑；v3 简化展示不得导致领域字段被删除。

---

## 1. 追溯口径

每行回答四个问题：v2 要什么、v3 现在长什么样、需要哪些实体、靠什么读契约与验收用例证明。
「模型要求」列用于反向检查：`SCHEMA-CANONICAL-MODEL-DRAFT.md` 必须能承载该行所有字段，否则视为模型缺口。

---

## 2. 矩阵

| 一级页 / 子功能 | v2 能力 | v3 当前形态 | 所需实体 | 读模型（建议） | 验收用例 |
|---|---|---|---|---|---|
| 看板 8 维度 | 可追溯摘要、每格口径与来源 | 有入口，状态来源待对齐 | `observation`、`treatment_line`、`comorbidity_status`、`toxicity_record`、`nutrition_*`、`assessment_response`、`match_assessment` | `dashboard.summary.v1` | 无数据显示未评估；每格可点开来源；档案变更提示重评不改旧结论 |
| 看板 当前状态 | 读取时计算 | 同 | 同上 | 同上 | 录入化验值后当前看板变化；历史快照不被改写 |
| 病情整理 资料库 | 清单、来源、状态、筛选 | 基础清单 | `document`、`document_page`、`extraction_run` | `records.library.v1` | 导入重复文件按 hash 去重；页状态独立持久化 |
| 病情整理 报告核对 | 逐页原文、候选、确认、跳过、跨页比对 | 仅待核对列表 | `document_page`、`extraction_candidate`、`clinical_fact` | `records.review.v1` | 候选可逐项确认/拒绝；确认后成为单一事实；拒绝项不进入首页与报告 |
| 病情整理 指标趋势 | 分类、状态卡、小倍数图 | 类别与动态分析，缺完整目录 | `observation`（含单位与比较符） | `records.trends.v1` | 同名不同单位不连线；`>1000` 不按 1000 画 |
| 病情整理 病情评估 | 病理、IHC、分子、治疗、营养与来源 | 仅两条摘要 | `pathology_report`、`molecular_result`、`treatment_line`、`nutrition_*` | `records.assessment.v1` | 每项可回到原件页码 |
| 病情整理 病情汇总 | 带来源的时间线汇总 | 仅导出入口 | 跨实体聚合 + `report_snapshot` | `records.summary.v1` | 汇总与明细一致；导出使用同一冻结快照 |
| 一图秀 趋势 | 多选、时间范围、关键点、变化率、按单位分组 | 已恢复多选、范围、关键点、变化率；缺搜索与单位分组 | `observation`、`timeline_dataset` | `timeline.series.v1` | 打开即有图；按单位分组；未确认值不进趋势线 |
| 一图秀 用药轴 | 方案色块与联动 | 已恢复治疗轴联动 | `treatment_line`、`treatment_line_drug`、`treatment_event` | `timeline.series.v1` | 与病情整理共用同一治疗数据 |
| 一图秀 标注 | 竖线标注与偏移 | 有事件线 | `timeline_annotation` | `timeline.series.v1` | 导入保留原偏移并记录修正；导出写回 |
| 一图秀 导入导出 | CSV 导入与导出、错误行 | 原型提示 | `timeline_dataset` | `timeline.import.v1` | 日期尾引号修正留记录；不改写用户原文件 |
| 临床匹配 入组档案 | 完整度、基因、IHC、并发症、线数、体能 | 仅说明文字 | `patient`、`molecular_result`、`comorbidity_status`、`treatment_line`、`observation` | `trials.profile.v1` | 缺失字段列出；缺失不阻断分析 |
| 临床匹配 试验检索 | 关键词、病种、地区、状态、来源状态 | 基础搜索页 | `trial_record`、`data_channel`、`trial_query` | `trials.search.v1` | 渠道未就绪不显示为「没有试验」 |
| 临床匹配 匹配分析 | 四组判定与依据 | 三行摘要 | `match_assessment`、`match_evaluation`、`trial_eligibility_rule` | `trials.workspace.v1` | 缺失流向无法判定；未确认规则不计入统计 |
| 临床匹配 收藏跟进 | 快照、备注、跟进、来源更新比较 | 空状态 | `trial_bookmark`、`trial_note`、`trial_contact_log` | `trials.workspace.v1` | 数据包更新后收藏不断；旧快照不被自动改写 |
| 临床匹配 渠道配置 | 就绪、失败、重试、更新状态 | 三项简略状态 | `data_channel` | `trials.channels.v1` | 单渠道失败不影响其他渠道结果 |
| 营养 能量链路 | 体重→目标→摄入→差距、蛋白范围 | 仅体重与能量入口 | `nutrition_profile`、`nutrition_entry`、`observation`（体重） | `nutrition.overview.v1` | 体重不重复录入；只显示差距不给处方 |
| 营养 PEI | 胰酶记录可编辑 | 有入口未恢复明细 | `pei_record`、`medication_record` | `nutrition.overview.v1` | 记录随餐与剂量；缺失显示未记录 |
| 心理 量表 | DT/GAD-7/PHQ-9/HADS、分界、趋势、历史 | 未对齐 | `assessment_definition`、`assessment_response` | `mind.overview.v1` | 不同量表不画同一条线；分级用官方分界 |
| 心理 资源与危机 | 缓解资源、安宁疗护、哀伤、常驻危机提示 | 安宁、哀伤、危机已补回 | `support_resource`、`resource_bookmark` | `mind.overview.v1` | 资源带核实日期；不承诺可用性 |
| 全程管理 毒性/并发症 | 分级记录与状态跟踪 | 四个入口，缺字段 | `toxicity_record`、`comorbidity_status` | `care.plan.v1` | CTCAE 分级可记录；并发症与匹配共用同一份 |
| 全程管理 带管/通路 | 置入、维护历史、距上次维护天数 | 有入口，缺维护事实 | `catheter_record`、`catheter_maintenance` | `care.plan.v1` | 取最近维护；记录历史趋势；中性表述 |
| 设置 | 数据源版本、备份、渠道 | 本机设置入口 | `workspace`、`data_channel`、备份元数据 | `workspace.settings.v1` | 备份同时含数据库与原件 |

---

## 3. 模型缺口判定

| 现象 | 判定 |
|---|---|
| v3 未实现某功能，但实体已存在 | 界面缺口，不改模型 |
| v2 有功能，实体缺失 | 模型缺口，补实体 |
| 同一事实在两处显示不同 | 未共用事实或派生未统一，修复读取路径 |
| 简化页面隐藏字段 | 允许；但字段仍须存在于模型 |

## 4. 下一步

1. 用本矩阵逐行补齐 `SCHEMA-CANONICAL-MODEL-DRAFT.md` 缺口。
2. 为每行确定读模型契约名与版本策略。
3. 将「验收用例」列转为可执行测试：旧数据、待确认数据、纯手工录入数据三类分别验证。
