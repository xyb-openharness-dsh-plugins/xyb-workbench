# 多病人支持 · 影响面评估

日期：2026-10-13 · 状态：**task-5 衍生分析（待评审）**
触发：用户拍板 U1 = **支持多病人**（推翻 DECISION-QUEUE.md 原「单病人一期」建议），与 SPEC-v0.4 §3.3 非目标冲突
上游：U1 反转；`schema/0001_initial.sql`（52 表）；`read-model-contracts.md`（16 契约）；SPEC-v0.4 §3.3
范围：只新增本文件。不动 `read-model-contracts.md`、`0001_initial.sql`（DDL 变更走新迁移文件，见 §2）。

---

## 0. 结论先行

1. **数据模型层基本已就绪**：52 张表中 **31 张**已直接带 `patient_id` 且 `REFERENCES patient(id)`；**9 张**是真正全局/参考表（本就不该有 patient_id）；**12 张单跳子表**经 FK 链一次 JOIN 可达 `patient_id` 但缺直列（详见 §1.2）。多病人 (a) 不需要重写模型，只需一个补丁迁移给这 12 张单跳子表加 `patient_id` 直列（或先走单跳 JOIN）。
2. **读模型层是真正要改的面**：刚写的 16 个契约全部隐式假设「当前单病人」，没有任何 `patient` 作用域参数。**13 个契约必须加 `scope.patient_id`（必填），3 个全局契约（搜索/渠道/设置）只需 `patient_id` 作为可选上下文**。这是最主要的回归量。
3. **界面层低成本**：7 个一级 Tab 全是患者级视图，只需在应用外壳放**一个全局病人切换器** + 一个 `current_patient` 状态，不需要每个 Tab 各做一套。
4. **(a) 切换查看 与 (b) 横向对比/队列 工作量差一个量级**：建议 (a) 进本期，(b) 维持非目标并单独立项评估。SPEC-v0.4 §3.3 应改为「保留单病人假设删除；明确 v1 不做跨病人对比/队列」。
5. **净增量可控**：模型补丁小、读模型加参数是机械改动、UI 一个切换器。整体约等于「一个聚焦里程碑」，不是重构。

---

## 1. 数据模型层（52 表逐表）

### 1.1 已直接带 `patient_id` 的 31 张（无需改）
`patient_contact`、`care_team_member`、`document`、`extraction_candidate`、`document_comparison`、`clinical_fact`、`observation`、`molecular_result`、`treatment_line`、`treatment_event`、`medication_record`、`toxicity_record`、`comorbidity_status`、`catheter_record`、`appointment`、`reminder`、`nutrition_profile`、`nutrition_entry`、`pei_record`、`assessment_response`、`resource_bookmark`、`timeline_annotation`、`timeline_dataset`、`trial_query`、`match_assessment`、`trial_bookmark`、`trial_note`、`trial_contact_log`、`agent_task`、`report_snapshot`、`dashboard_snapshot`

> 注 1：Chief 在问里点名的 `appointment`、`nutrition_profile` **实际已有 `patient_id`**，并非全局单例——原「隐式单例」假设在这两张上不成立。
> 注 2：`diagnosis` 与 `match_evaluation` 不在此列——它们虽靠 FK 可达，但属单跳子表（见 §1.2），需要补直列。

### 1.2 缺 `patient_id` 的 12 张单跳子表（1 FK hop，建议补直列）
> **术语修正（2026-10-13 22:56）**：原文「孙表/grandchild」有误。实测这 12 张**全是单跳子表**——一次 JOIN 就能把病人限定住（路径均为 `child → parent(patient_id)`，无双跳）。不是孙表，不要按「需双 JOIN」去高估补列必要性。

| 表 | 单跳可达路径（child → parent.patient_id） |
|---|---|
| `agent_result` | agent_result → agent_task(patient_id) |
| `catheter_maintenance` | catheter_maintenance → catheter_record(patient_id) |
| `diagnosis` | diagnosis → clinical_fact(patient_id) |
| `document_page` | document_page → document(patient_id) |
| `export_artifact` | export_artifact → report_snapshot(patient_id) |
| `extraction_run` | extraction_run → document(patient_id) |
| `fact_value` | fact_value → clinical_fact(patient_id) |
| `imaging_finding` | imaging_finding → clinical_fact(patient_id) |
| `match_evaluation` | match_evaluation → match_assessment(patient_id) |
| `pathology_report` | pathology_report → clinical_fact(patient_id) |
| `symptom_record` | symptom_record → clinical_fact(patient_id) |
| `treatment_line_drug` | treatment_line_drug → treatment_line(patient_id) |

- **为什么加直列（关键，改准确）**：这 12 张靠 FK JOIN **能正确限定病人**（链完整，不会查错病人）。所以加直列**不是为了正确性，是为了性能和索引**——避免多病人下高频读模型查询每次多跳一层 JOIN，并让 `patient_id` 能直接进索引（`ix_<t>_patient`）加速 `WHERE patient_id = ?`。**优先级判定因此变化：不加直列 = 慢，不是错**；Dev 不应把「不加会查错病人」当作补列理由。
- **做法**：新增迁移文件（如 `0002_multi_patient_scope.sql`，**不碰 0001**），对上表 `ADD COLUMN patient_id TEXT REFERENCES patient(id)`，并 `UPDATE ... FROM` 沿父表回填；建索引 `ix_<t>_patient`。
- **替代做法（零 DDL，但可接受）**：所有读取走单跳 JOIN 到父表。它**正确性无损**，只是每次查询多一层 JOIN、无法对 `patient_id` 直接建索引。若一期性能压力小，可先靠 JOIN 上线，后续再补直列——这不是「不推荐」，是「先正确后优化」的可选项。

### 1.2.1 加直列后的一致性方案（冗余列如何保证不漂移）
直列 `child.patient_id` 与 FK 链顶端父表 `patient_id` 理论可能不一致（例如 `document_page.patient_id` 被写成与所属 `document.patient_id` 不同的值）。两种保证策略：

1. **CHECK 约束（推荐，轻量）**：对每张补列子表加
   ```sql
   CHECK (patient_id = (SELECT patient_id FROM <parent> WHERE <parent>.id = <child>.<fk_col>))
   ```
   缺点：SQLite 的 CHECK 子查询在写入时不强制求值（SQLite 只在校验 PRAGMA 时检查，且子查询 CHECK 实际不被执行）——**此路在 SQLite 下行不通**，不采用。
2. **触发器（推荐，真正生效）**：`AFTER INSERT OR UPDATE ON <child>` 校验/回填
   - 写入时由触发器从父表取 `patient_id` **自动填入**子表直列（不信任应用层传入的值），或
   - 校验 `NEW.patient_id` 与父表一致，不一致则 `RAISE(ABORT)`。
   推荐前者（触发器回填），彻底消除应用层误传；迁移回填脚本一次性对齐存量。
3. **应用层纪律（兜底，不单用）**：所有写路径经过统一仓储层，由层内强制按 FK 取父 `patient_id`。仅作兜底，不能替代 2。

> **建议**：迁移文件内对 12 张子表各建一个 `AFTER INSERT OR UPDATE` 触发器自动从父表回填 `patient_id`（RAISE 校验作为可选项），并在 `0002` 迁移里 `UPDATE` 存量对齐。这样直列是「派生冗余列」，源头仍唯一，绝不会与 FK 链分歧。

### 1.2.2 触发器方案已实测（2026-10-13，node:sqlite v24.17.0）
在真实 `node:sqlite` 环境跑最小复现：`patient` ← `parent(patient_id)` ← `child(parent_id)`，`child` 带 `AFTER INSERT/UPDATE` 触发器从 `parent` 回填 `patient_id`；`PRAGMA foreign_keys=ON; PRAGMA recursive_triggers=OFF;`。

实测输出（关键三行）：
```
after insert (no app value):       {"id":"c1","parent_id":"par1","patient_id":"p1"}
after insert+wrong-update overwrite:{"id":"c2","parent_id":"par1","patient_id":"p1"}
update parent_id keeps backfill:   {"id":"c1","patient_id":"p1"}
TRIGGER TEST PASSED (no recursion / no error)
```
- 应用层**不传** `patient_id` → 触发器从父表自动填对 ✅
- 应用层**传错** `patient_id` → 触发器覆盖为正确值 ✅（不信任应用层）
- **无递归触发**（触发器内 `UPDATE child` 不二次触发自身）：`recursive_triggers=OFF` 下验证通过，exit=0 无报错 ✅
- `foreign_keys=ON` 下触发器 UPDATE 顺序无坑 ✅

> 结论：触发器回填方案在目标运行时（node:sqlite）实测可用，迁移 `0002` 可直接采用，无需退化到「仅应用层纪律」。

### 1.3 真正全局/参考表（正确无 `patient_id`，不动）
`workspace`（工作区）、`patient`（病人注册表本身）、`trial_record`、`trial_location`、`trial_eligibility_rule`（公共试验库，U2 独立库+ATTACH）、`data_channel`（渠道全局）、`assessment_definition`（量表定义模板）、`support_resource`（资源库）、`field_definition`（扩展字段 schema）。
> 这些跨病人共享，多病人不影响。

### 1.4 `patient` 注册表已支持多病人
`patient` 表已有 `workspace_id`、`status(active/archived)`、`display_name`。切换器显示 active，archived 可恢复。无需改结构。

### 1.5 真分区键？
`patient_id` 是租户键（`WHERE patient_id = ?`），非组合唯一分区键。对 (a) 足够；对 (b) 需 `GROUP BY patient_id` 跨病人聚合，可行但需逐病人「缺失即缺失」对齐。

---

## 2. 读模型层（16 契约逐条）

> 当前 `read-model-contracts.md` 16 契约**全部无 `patient` 作用域**，等于默认单病人。下面给出每契约的处理。本文件不直接改 read-model-contracts.md，改动以「建议补丁」列出，待批。

| 契约 | 患者级？ | 处理 |
|---|---|---|
| `dashboard.summary.v1` | 是 | 加 `scope: {patient_id: required}` |
| `records.library.v1` | 是 | 加 `required` |
| `records.review.v1` | 是 | 加 `required` |
| `records.trends.v1` | 是 | 加 `required` |
| `records.assessment.v1` | 是 | 加 `required` |
| `records.summary.v1` | 是 | 加 `required` |
| `timeline.series.v1` | 是 | 加 `required` |
| `timeline.import.v1` | 是 | 加 `required` |
| `trials.profile.v1` | 是（入组档案） | 加 `required` |
| `trials.search.v1` | **否（全局检索）** | `scope: {patient_id: context}`——检索本身不过滤病人，但结果用 current patient 算 eligibility |
| `trials.workspace.v1` | 是（匹配/收藏） | 加 `required` |
| `trials.channels.v1` | **否（全局渠道）** | `scope: {patient_id: context}`——渠道状态非病人维度 |
| `nutrition.overview.v1` | 是 | 加 `required` |
| `mind.overview.v1` | 是 | 加 `required` |
| `care.plan.v1` | 是 | 加 `required` |
| `workspace.settings.v1` | **否（工作区级）** | 不加 patient 作用域（设置本就全局） |

**统计**：13 个必填 `patient_id` 作用域；3 个（`trials.search.v1`/`trials.channels.v1`/`workspace.settings.v1`）仅把 `patient_id` 当可选上下文。

**建议对 read-model-contracts.md 的补丁（待批，不擅自改）**：
- §0 清单每契约加 `scope` 列。
- §1 补一条：「所有 per-patient 读模型必须携带 `patient_id` 作用域；缺失作用域的调用在读取层拒绝（fail-closed），防止误读成全局/他人数据。」
- §6 逐契约要点补 `scope` 标注（13 个 required / 3 个 context）。
- 版本影响：加 `scope` 参数属**向后兼容的 MINOR**（见 read-model-contracts §2.1），不触发 major；但旧客户端若不传 patient_id 将被读取层拒绝——需在 §3 兼容规则补「缺 scope 视为调用错误，非默认单病人」。

---

## 3. 界面层（7 一级 Tab + 设置）

| 一级 Tab | 患者级视图？ | 是否需要切换器 | 说明 |
|---|---|---|---|
| 看板 Dashboard | 是（8 维度=单病人综合状态） | 需要 | 切换即换整屏状态 |
| 病情整理 Records | 是（文档/指标/评估都属病人） | 需要 | 文档库按病人隔离 |
| 一图秀 Timeline | 是（时间轴=单病人） | 需要 | 切病人换轴 |
| 临床匹配 Trials | 是（入组档案/匹配/收藏属病人） | 需要 | 但「试验检索」「渠道配置」子页全局，切换器不影响它们 |
| 营养 Nutrition | 是 | 需要 | |
| 心理 Mind | 是 | 需要 | |
| 全程管理 Care | 是 | 需要 | |
| 设置 Settings | 否（工作区级） | 不需要 | 切换器不出现，或置灰 |

**低成本做法**：在应用外壳（app shell）放**一个全局病人切换器**（顶部或侧栏），维护 `current_patient` 全局状态；7 个患者级 Tab 进入时从 `current_patient` 取作用域，无需每 Tab 各做。设置页无切换器。

**隐含单例要清的点**：原各 Tab 若缓存了「当前病人」为模块级单例，需改为读全局 `current_patient`；切换病人时清空/重拉各 Tab 的读模型缓存（与 read-model-contracts §6 `dashboard.summary.v1`「历史快照不被改写」不冲突——快照本就带 patient_id）。

---

## 4. 范围层：(a) 切换查看 vs (b) 横向对比/队列

用户 U1 = 「支持多病人」最低为 (a)。建议：

- **(a) 多病人切换查看**：本期做。模型补丁（§1.2）+ 13 契约加 scope（§2）+ 外壳切换器（§3）。工作量聚焦。
- **(b) 跨病人横向对比/队列分析**：**维持非目标**，但单独立项评估代价（见 §5）。SPEC-v0.4 §3.3 原句「不做多个病人的横向对比或队列分析」保留为 (b) 非目标；但其隐含的「单病人」前提删除——改为「v1 支持多病人切换查看，但不做跨病人对比/队列」。

> 冲突澄清：U1 反转的是「是否多病人」这个前提，(b) 的「不对比」仍可成立。两者不矛盾：能切换看 A、看 B，不等于把 A、B 放一起比。

---

## 5. 代价评估

### 5.1 多病人 (a) 增量（本期）
| 层 | 工作量 | 风险 |
|---|---|---|
| 模型 | 1 迁移（+12 单跳子表直列 + 回填 + 触发器 + 索引） | 低（纯加列，不动现有表语义） |
| 模型-可选 | 若一期先不补直列：仅改读路径走单跳 JOIN，正确性无损，仅牺牲索引/性能 | 低 |
| 读模型 | 13 契约加 `scope.patient_id` 参数 + 读取层 fail-closed 校验 | 中（机械但面广，需回归 16 契约的所有消费者） |
| 界面 | 1 个全局切换器 + `current_patient` 状态 + 7 Tab 取作用域 + 切换清缓存 | 中（UX 一处，但各 Tab 入口要接） |
| 测试 | 新程序读旧库/旧程序遇新库（read-model-contracts §3.4）扩展为「多病人 isolation」用例 | 低 |
| **合计** | **约等于一个聚焦里程碑**，非重构 | — |

### 5.2 多病人 (b) 横向对比/队列（维持非目标，代价供用户定）
| 项 | 代价 |
|---|---|
| 新读模型 | 需 `cohort.*.v1` 类聚合契约（跨 patient_id 分组、逐病人缺失对齐） |
| 缺失即缺失对齐 | 不同病人指标集不同，对比前须逐维度标注「哪些病人有/无」，否则误导 |
| 隐私 | 多病人同屏对比需明确「仅本人/授权家属」边界，避免串病人 |
| 界面 | 新增对比视图/队列筛选器，独立于 7 Tab |
| **合计** | **另一个量级的里程碑**，建议单独立项，不在 v1 |

### 5.3 低成本兼容做法总结
- **不要重写模型**：靠已有的 `patient_id` 租户键 + 1 个补丁迁移即可。
- **scope 参数走 MINOR**：不触发读模型 major，旧客户端需补齐传参（fail-closed 防串数据）。
- **切换器集中放外壳**：避免 7 Tab 各做一套。
- **(b) 坚决隔离**：不在 v1 混进对比逻辑，防止范围蔓延。

---

## 6. 给 Chief / 用户的决策点

1. 确认 (a) 进本期、(b) 维持非目标的划分（影响里程碑范围）。
2. 确认模型补丁用「12 单跳子表加直列（触发器保证一致性）」还是「先单跳 JOIN 上线、后续补直列」（两者正确性等价，后者先正确后优化）。
3. 是否批准我对 `read-model-contracts.md` 的 §0/§1/§6 补丁（加 scope 列 + fail-closed 规则）。
4. 切换器放外壳顶部还是侧栏（UX 细节，交 Pixel，不在此定）。

### 6.1 待批项：直列一致性策略（§1.2.1 落地）
- 待 Dev 确认：12 张子表采用「触发器自动从父表回填 `patient_id`」方案（推荐），还是「CHECK 子查询」（SQLite 下行不通，不采用），还是仅应用层纪律。
- 待 Dev 确认：迁移 `0002` 是否一次性 `UPDATE` 存量对齐 + 建触发器；索引 `ix_<t>_patient` 是否随迁移建立。

---

## 7. 交付检查
- [ ] 52 表逐表归类（31 直带 / 12 单跳子表 / 9 全局）✅（术语已改：孙表→单跳子表）
- [ ] 12 单跳子表补全 `diagnosis`、`match_evaluation`（原漏 2 张）✅
- [ ] 「加直列只为性能/索引、JOIN 正确性无损」理由修正 ✅
- [ ] 直列一致性方案（触发器回填）已补 ✅
- [ ] 16 契约逐条 scope 判定（13 required / 3 context）✅
- [ ] 7 Tab + 设置切换器结论 ✅
- [ ] (a)/(b) 范围与代价分离 ✅
- [ ] 未改 read-model-contracts.md / 0001_initial.sql ✅（DDL 走新迁移建议）
- [ ] DECISION-QUEUE.md U1 已更新、U1–U5 标记已定（见同仓 DECISION-QUEUE.md 编辑）
