# 读模型契约 · 版本策略与兼容规则

日期：2026-10-13 · 状态：**task-5 交付（待评审）**
适用范围：`docs/xyb-workbench/schema/` 下的 16 个读模型契约
上游依据：`SCHEMA-FUNCTION-TRACEABILITY-DRAFT.md` §2（契约名与实体映射）、`SCHEMA-REVIEW-2026-10-13.md` §5.3/§6.1、`STORAGE-SPEC.md`

> 本文件不修改任何 DDL（`0001_initial.sql`）或探测脚本（`probe/`）。只定义「前端/导出层读取数据时遵守的契约」。

---

## 0. 16 个读模型契约清单（来源：追溯矩阵 §2）

| 契约名 | 一级页 / 子功能 | 主要来源实体 |
|---|---|---|
| `dashboard.summary.v1` | 看板 8 维度 / 当前状态 | `observation`、`treatment_line`、`comorbidity_status`、`toxicity_record`、`nutrition_*`、`assessment_response`、`match_assessment` |
| `records.library.v1` | 病情整理 资料库 | `document`、`document_page`、`extraction_run` |
| `records.review.v1` | 病情整理 报告核对 | `document_page`、`extraction_candidate`、`clinical_fact` |
| `records.trends.v1` | 病情整理 指标趋势 | `observation`（含单位与比较符） |
| `records.assessment.v1` | 病情整理 病情评估 | `pathology_report`、`molecular_result`、`treatment_line`、`nutrition_*` |
| `records.summary.v1` | 病情整理 病情汇总 | 跨实体聚合 + `report_snapshot` |
| `timeline.series.v1` | 一图秀 趋势 / 用药轴 / 标注 | `observation`、`timeline_dataset`、`treatment_line(_drug/_event)`、`timeline_annotation` |
| `timeline.import.v1` | 一图秀 导入导出 | `timeline_dataset` |
| `trials.profile.v1` | 临床匹配 入组档案 | `patient`、`molecular_result`、`comorbidity_status`、`treatment_line`、`observation` |
| `trials.search.v1` | 临床匹配 试验检索 | `trial_record`、`data_channel`、`trial_query` |
| `trials.workspace.v1` | 临床匹配 匹配分析 / 收藏跟进 | `match_assessment`、`match_evaluation`、`trial_eligibility_rule`、`trial_bookmark`、`trial_note`、`trial_contact_log` |
| `trials.channels.v1` | 临床匹配 渠道配置 | `data_channel` |
| `nutrition.overview.v1` | 营养 能量链路 / PEI | `nutrition_profile`、`nutrition_entry`、`observation`（体重）、`pei_record`、`medication_record` |
| `mind.overview.v1` | 心理 量表 / 资源与危机 | `assessment_definition`、`assessment_response`、`support_resource`、`resource_bookmark` |
| `care.plan.v1` | 全程管理 毒性/并发症 / 带管/通路 | `toxicity_record`、`comorbidity_status`、`catheter_record`、`catheter_maintenance` |
| `workspace.settings.v1` | 设置 数据源版本 / 备份 / 渠道 | `workspace`、`data_channel`、备份元数据 |

---

## 1. 两条独立的版本轴（核心约束）

| 维度 | 是什么 | 谁管 | 怎么变 |
|---|---|---|---|
| **数据库 schema 版本** | 物理表结构（`0001_initial.sql` + 迁移脚本）的整数版本 | `migrate.mjs` 通过 `PRAGMA user_version` / `xyb-store.json` 记录 | 仅 DDL 增删改时递增；迁移「扩展 → 双读/双写或转换 → 切换 → 延后收缩」（`SCHEMA-REVIEW` §5.3） |
| **读模型契约版本** | 前端/导出消费的数据形状（本文件 16 个），形如 `name.major.minor` | 本契约文件 + 各消费者实现 | 仅因「读取形状」变化而递增；**与 DB schema 解耦** |

**关键结论**：
- DB schema 升版本**不必然**导致读模型升版本（加一列但不读它 = 读模型不动）。
- 读模型升版本**不必然**导致 DB schema 升版本（展示层重组聚合、不改表）。
- 两者各自的兼容规则**独立适用**，互不为前提。界面只消费读模型，不直接碰表（`SCHEMA-REVIEW` §6.1 界面行）。

> 契约当前统一为 `.v1`（major=1）。后续 major 仅在本文件「版本策略」触发时产生。

---

## 2. 版本策略：加字段 / 改字段语义 / 删字段

约定：契约号 `name.MAJOR.MINOR`。`MAJOR` 破坏兼容，`MINOR` 向后兼容。

### 2.1 加字段（add field）→ MINOR +1
- 新字段**必须 optional + nullable**（不要求旧消费者提供）。
- 契约文档须写明：字段缺省/缺失时的语义（见 §4 缺失即缺失），不得用空值冒充业务零值。
- 旧消费者行为：忽略未知字段即可，无需改动。
- 例：`care.plan.v1` → 新增 `catheter_maintenance` 维护事实子结构时升 `care.plan.v1.1`。

### 2.2 改字段语义（change field semantics）→ 新 MAJOR 版本
- 语义变化（单位、枚举范围、是否必填、含义重定义）**视为破坏兼容**，**禁止在原字段就地改义**。
- 必须发新 major：`dashboard.summary.v1` → `dashboard.summary.v2`，保留 `.v1` 继续服务至 §3 下线窗口。
- 同时更新追溯矩阵 §2「读模型（建议）」列与验收用例。
- 跨 major 的同名异义字段，消费者**不得**混用；旧客户端锁读旧 major。

### 2.3 删字段（remove field）→ 仅在新 MAJOR，且先标记 deprecated
- 不能在 MINOR 删。
- 流程：`v(N-1)` 将该字段标 `deprecated: true`（仍输出，文档注明计划移除版本）→ `vN` 不再输出。
- 移除前须确认所有已知消费者已迁离该字段（见 §3 兼容测试）。
- 被删字段若曾承载「缺失即缺失」语义，其移除不得让下游把「字段不在」误读为「正常/阴性」。

### 2.4 新增整张契约 / 下线整张契约
- 新增契约：直接 `name.v1`，登记进 §0 清单与追溯矩阵。
- 下线契约：走 §3 deprecation 窗口；窗口内保留只读，窗口后从本文件移除并通知所有消费者。

---

## 3. 兼容规则（来自 SCHEMA-REVIEW §6.1）

> §6.1 原文要求：**「版本化，容忍未知字段，旧契约延后下线」**。下面是把这条落成可执行规则。

1. **消费者容忍未知字段**：任何读模型消费者遇到契约未声明的字段，必须**忽略且保留**（不报错、不丢弃、可原样回写）。契约不保证字段集合封闭。
2. **消费者不得假设字段必在**：读取每个字段前判空；缺失按 §4 处理，不回退到「0/空串/正常」等假值。
3. **旧契约延后下线**：
   - 发新 major 后，**旧 major 至少保留 2 个读模型版本周期**或显式 deprecation 窗口（以较长者为准）；桌面可能长期离线，「两个发布周期」不能保证旧客户端可读（§5.3 已指出），故采用「保留 ≥2 个 RM 版本 + 显式 `@deprecated` 标记 + 大版本才删」三道保险。
   - 旧契约在窗口内**只读可用**，新写入仍走新 major；旧客户端升级前不被强制断。
   - 下线触发：本文件标注 `@deprecated` 且所有已知消费者已迁离 → 下个大版本移除。
4. **兼容测试必覆盖**（对应 §5.3「分别测试新程序读旧库与旧程序遇新库」）：
   - 新程序读旧库：旧 DB schema + 旧读模型契约，新前端能渲染（未知字段容忍）。
   - 旧程序遇新库：新 DB schema 下，锁读旧 major 契约的客户端不出错。
   - 备份恢复一致性：备份同时含数据库与原件（`STORAGE-SPEC`）后再恢复，读模型结果一致。

---

## 4. 「缺失即缺失」落到契约层（强制）

每个字段在契约中标注 `required / optional / absent_semantics`。

- **`null` / 字段缺失 = 未记录 / 未评估**，绝不可渲染为 `0`、`阴性`、`正常`、`无症状`、`无`。
- 缺数据的正确 UI 表达：**隐藏该卡** 或 **显示「未记录 / 未评估」**；不得用占位零值或空图表冒充已支持。
- 跨实体聚合时（如 `records.summary.v1`、`trials.profile.v1`）：缺失字段逐条列出「缺什么」，且**缺失不阻断分析**（追溯矩阵：trials.profile 验收「缺失字段列出；缺失不阻断分析」）。
- 比较符字段（如 `observation` 的 `>1000`、`<`）：缺失或「未确认值」**不进趋势线 / 不连线**（`records.trends.v1`、`timeline.series.v1` 验收）。

字段级示例（写入各契约时照此标注）：
```
observation.value:
  type: number | null
  required: false
  absent_semantics: 未检测或未录入 → 显示「未记录」，禁止按 0 渲染
observation.comparator:
  type: enum['>','<','>=','<=','=',''] | null
  absent_semantics: 无比较符（精确值）；缺失 ≠ 正常
```

---

## 5. 能力开关：未开放 / 待补齐 ≠ 空数据（强制）

- 当某子功能**一期未实现**（如 `nutrition.overview.v1` 的 PEI 明细、`mind.overview.v1` 的量表未对齐、`trials.workspace.v1` 收藏跟进空状态），契约暴露 `capability` 标志位：
  - `capability.enabled: false` → 消费者显示 **「未开放 / 待补齐」**，不允许用空列表/空卡伪装成「已支持且暂无数据」。
  - `capability.enabled: true` 但数据为空 → 显示「暂无记录」（这是真实空，区别于未开放）。
- 渠道类（`trials.channels.v1`、`trials.search.v1`）：单渠道失败/未就绪 → 显示该渠道「未就绪 / 失败」，**不**概括为「没有试验」（追溯矩阵：trials.search「渠道未就绪不显示为『没有试验』」；trials.channels「单渠道失败不影响其他渠道结果」）。
- 资源类（`mind.overview.v1` 的 `support_resource`）：带 `verified_on` 核实日期；过期/未核实显示「待核实」，不承诺可用性。

---

## 6. 逐契约要点（版本 / 缺失 / 能力）

> 每条只写与本文件规则相关的约束；字段全集见各自 SPEC。

- **`dashboard.summary.v1`**：实时计算、不持久化（`DATA-FLOW-SPEC` 已定）；`report_snapshot` 仅用户主动保存时冻结。8 维度任一项缺失 → 该格「未评估」，不填中性值。历史快照不被录入改写（验收：档案变更提示重评不改旧结论）。
- **`records.library.v1`**：导入按 `hash` 去重；`document_page.status` 独立持久化。缺页状态不伪装为「已核对」。
- **`records.review.v1`**：候选确认后成单一事实；拒绝项不进首页与报告。字段缺失=未核对，不显示为「正常」。
- **`records.trends.v1`**：同名不同单位不连线；`>1000` 不按 1000 画；未确认值不进趋势线。
- **`records.assessment.v1`**：每项可回原件页码；病理/IHC/分子子结构缺失逐条列「缺」。
- **`records.summary.v1`**：汇总与明细一致；导出用同一冻结 `report_snapshot`；缺字段汇总时标注「部分缺」。
- **`timeline.series.v1`**：不同量表/不同单位不画同一条线；导入保留原偏移并记录修正；标注导出写回。
- **`timeline.import.v1`**：CSV 日期尾引号修正留记录；**不改写用户原文件**。
- **`trials.profile.v1`**：缺失字段列出、缺失不阻断分析；加密列（U5 定稿后）按脱敏规则输出。
- **`trials.search.v1`**：渠道未就绪 → 「未就绪」，非「没有试验」。
- **`trials.workspace.v1`**：匹配四组判定；缺失流向「无法判定」；未确认规则不计入统计；收藏快照数据包更新后不断、旧快照不被自动改写。
- **`trials.channels.v1`**：单渠道失败不影响其他；状态 `ready/failed/retrying` 直显。
- **`nutrition.overview.v1`**：体重不重复录入；只显示差距不给处方；PEI 明细若一期未实现 → `capability.pei_detail=false` 显示「待补齐」。`nutrition_entry` 缺失 → 「未记录」。
- **`mind.overview.v1`**：不同量表不画同一条线；分级用官方分界；心理数据完全不发模型（`PSYCH-CARE-SPEC`）；心理维度不用红绿灯；量表未对齐时 `capability.scale_aligned=false` 显示「待补齐」；资源带核实日期。
- **`care.plan.v1`**：CTCAE 分级可记录；并发症与匹配共用同一份；带管维护事实缺失 → 「未记录」中性表述；维护超期用黄色提示（非红色客观异常）。
- **`workspace.settings.v1`**：备份同时含数据库与原件；数据源版本直显；渠道状态直显。

---

## 7. 交付检查清单（评审用）

- [ ] 16 契约名与追溯矩阵 §2 一致 ✅（见 §0）
- [ ] 两条版本轴独立说明 ✅（§1）
- [ ] 加/改义/删 三策略可执行 ✅（§2）
- [ ] 容忍未知字段 + 旧契约延后下线 ✅（§3，依据 §6.1）
- [ ] 缺失即缺失字段级语义 ✅（§4）
- [ ] 能力开关 未开放/待补齐 ✅（§5）
- [ ] 未改 `0001_initial.sql` / `probe/` ✅
