# 小胰宝工作台 · 数据库 Schema 规格

日期：2026-10-13 · 状态：**设计建议稿。回答「SQLite 是否需要设计 schema 配合各 Tab 与指标」。**

上级文档：[STORAGE-SPEC.md](./STORAGE-SPEC.md)（持久层选型，已冻结） · [SPEC-v0.4.md §6](./SPEC-v0.4.md)（实体清单） · [UI-DESIGN.md](./UI-DESIGN.md)（7 个一级 Tab）。

---

## 1. 直接回答

**需要，而且现在的规格里还没有。**

现状盘点：`STORAGE-SPEC.md` 已冻结「用 `node:sqlite`」，`SPEC-v0.4.md §6` 列了 **34 个实体**（v0.3 的 15 个 + v0.4 新增 19 个）——但**全部是散文式描述**，只有字段名列表，没有表、没有类型、没有主外键、没有索引、没有约束。

```
现状：  「TreatmentLine | lineId、patientId、线数序号、方案名、药物列表…」
目标：  CREATE TABLE treatment_line ( line_id TEXT PRIMARY KEY, ... )
        + 外键 + CHECK 约束 + 索引 + 索引策略
```

**为什么不能直接从散文描述开始写代码**：散文描述无法回答实现时必须回答的问题——`药物列表`是一个字段还是子表？`未检测`和`阴性`怎么在库里区分？同一指标多次测量怎么建索引？这些不定，写出来的表结构会返工。

---

## 2. Schema 的权威是领域模型，Tab 只是证据

**先澄清一处容易误读的表述**（本章初稿写成「schema 由 Tab 反推」，是错的，已修正）。

如果 schema 跟着 Tab 走，Tab 一变 schema 就变——这是典型的**违反数据库设计原则**：存储层被展示层绑架。Tab 是最易变的东西（本工作台的一级 Tab 已从 3 个改成 5 个、再改成 7 个），而存储层一旦有数据就不能随便改。

**正确的关系**：

| 角色 | 地位 | 能否决定表结构 |
|---|---|---|
| **领域模型**（患者、治疗线、指标、基因、并发症…） | **权威** | ✅ 能 |
| **Tab / 界面** | **证据来源** | ❌ 不能 |
| 索引 | 由查询模式决定 | — |

**Tab 的作用是两件事，都不是「决定表结构」**：

1. **校验领域模型有没有缺漏**——某个 Tab 要显示的东西在模型里没有对应实体，说明模型漏了（例如我上一轮发现 `CatheterRecord` 没地方存品牌型号，那是**模型缺字段**，不是「为了这个 Tab 加字段」）
2. **推导索引**——索引本来就是查询驱动的，这里 Tab 是合法输入

**判断标准**：一个字段该不该进表，问「**它与界面无关地存在吗**」？

| 该进 | 不该进 |
|---|---|
| 置管品牌、型号（器械的客观属性） | 卡片展开/折叠状态 |
| 指标的单位、参考范围（化验单的事实） | 列表排序方式、每页条数 |
| 维护记录（发生的客观事件） | 当前选中的 Tab、滚动位置 |
| 「未检测」与「阴性」的区别（医学事实） | 界面上哪个分组默认折叠 |

后者属于**界面状态**，应存在客户端内存或 `localStorage`，**不进业务库**。本草案的表结构已按此检查过：无任何 Tab 字面量、无页面状态列。

**结论**：Tab 变了，schema **不需要变**——只要变的是「怎么展示」。Tab 变了 schema 也要变，只有一种情况：**新的 Tab 暴露了领域模型真的缺了东西**，那时改的是模型，Tab 只是发现问题的途径。

**下面的 §2.1 因此要按「查询需求清单」读，不是「表结构依据」。**

### 2.1 查询需求清单（用于推导索引，不用于决定表结构）

**再次强调**：下表是「界面需要什么查询」，用途是**推导索引**与**校验模型完整性**，**不是**表结构的依据。表结构依据领域模型（见 §3）。

| # | 一级 Tab | 需要读 | 需要写 | 关键查询 |
|---|---|---|---|---|
| 1 | **看板** | 全部维度源数据 | `DashboardSnapshot`（可选） | 聚合读，多个维度各一次 |
| 2 | **病情整理** | `ClinicalFact`、`GenomicAlteration`、`TreatmentLine`、`Observation`、`Document` | 同上 + `CandidateFact` | 按类型分组、按日期排序 |
| 3 | **病情一图秀** | `Observation`、`TreatmentLine`、`TimelineAnnotation`、`TimelineDataset` | 标注 | **按指标代码 + 日期范围取时间序列** |
| 4 | **临床匹配** | `GenomicAlteration`、`ComorbidityStatus`、`TreatmentLine`、`TrialEligibilityRule`、`DataChannel` | `MatchAssessment` | 规则与档案比对 |
| 5 | **营养管理** | `NutritionAssessment`、`Observation`（体重/白蛋白） | `NutritionAssessment` | 按日期取最近 N 次 |
| 6 | **心理支持** | `PsychAssessment` | `PsychAssessment` | 按量表类型取历史 |
| 7 | **全程管理** | `CatheterRecord`、`ToxicityRecord`、`ComorbidityStatus` | `CatheterRecord.maintenances` | 「距上次维护 N 天」→ **取最近一条** |

**从这张表能直接看出两个索引需求**——注意这里得到的是**索引**，不是表结构：

- 「按指标代码 + 日期范围取时序」→ `observation` 需要 `(patient_id, indicator_code, report_date)` 复合索引。缺了它，一图秀每次渲染都全表扫。
- 「取最近一条维护」→ `maintenance` 需要 `(catheter_id, date DESC)`。

**反例（说明为什么表格不是表结构依据）**：假设明天砍掉「营养管理」Tab，`nutrition_assessment` 表**不能删**——用户已经录的营养数据是既成事实，且它属于领域模型（营养评估是客观存在的临床记录）。同理，如果新增一个「康复随访」Tab，只要它显示的仍是既有实体，**一张表都不用加**。

只有一种情况要动表：新 Tab 暴露了**领域模型真的缺实体**。例如若上线「疼痛管理」Tab 发现现有模型没有 `PainAssessment`，那是模型漏了——**即便没有这个 Tab，疼痛评估本身也该能记录**，这才是判断依据。

### 2.2 哪些实体是「支撑 Tab」，哪些是「管线中间态」

不是所有实体都该有同等地位：

| 类别 | 实体 | 说明 |
|---|---|---|
| **用户可见业务表** | `Patient`、`ClinicalFact`、`GenomicAlteration`、`TreatmentLine`、`Observation`、`ComorbidityStatus`、`CatheterRecord`、`NutritionAssessment`、`PsychAssessment`、`ToxicityRecord` | 直接渲染到界面 |
| **管线中间态** | `Document`、`Evidence`、`ExtractionRun`、`CandidateFact` | 只在抽取/核对链路里流转，不直接显示为「病情」 |
| **试验公共数据（只读）** | `TrialRecord`、`TrialSnapshot`、`DatasetGeneration`、`TrialEligibilityRule` | 来自数据包，**患者库中不存权威副本** |
| **用户内容** | `TrialBookmark`、`TrialNote`、`TimelineAnnotation` | 必须与公共数据升级解耦 |
| **结论快照** | `MatchAssessment`、`DashboardSnapshot`、`Summary` | 只存引用与当时取值 |
| **系统** | `SessionBinding`、`Job`、`DataChannel` | 不由用户直接编辑 |

**关键边界**：公共试验数据与患者关联**不能放进同一个只读数据包**（[SPEC-v0.4](./SPEC-v0.4.md) 已定）。落到 schema 上就是——`trial_record` 可被数据包整体替换，而 `trial_bookmark` 必须独立存活，且用**稳定试验键**而非自增 ID 关联，否则换数据包后收藏全断。

---

## 3. 表设计要点（举关键例子，不逐表罗列）

### 3.1 `observation`：指标表是 schema 的核心难点

Tab 3（一图秀）和看板的指标维度都压在这张表上。三个必须处理的问题：

**问题一：`>1000` 不是 1000。** v0.3 已指出，落到 schema：

```sql
value_num     REAL,          -- 可用于画图/比较的数值（可为 NULL）
comparator    TEXT,          -- '=', '>', '<', '>=', '<=' （默认 '='）
value_raw     TEXT NOT NULL, -- 原文「>1000」，永不丢失
```

**画图只能读 `value_num`，且 `comparator != '='` 的点必须可区分**——不能把「>1000」当「1000」画在曲线上，这是医学数据完整性要求（[TIMELINE-SPEC](./TIMELINE-SPEC.md) 的「不得插值」同理）。

**问题二：单位不一致不连线。** [TIMELINE-SPEC.md](./TIMELINE-SPEC.md) 要求「单位不一致不连线」，所以单位必须结构化存储，不能是自由文本：

```sql
unit_raw      TEXT,   -- 原始单位（如 U/mL）
unit_std      TEXT,   -- 标准化单位
unit_std_factor REAL, -- 换算系数，NULL 表示无法换算
```

**`unit_std_factor IS NULL` 的行在该曲线上必须断线**——这是把规格里的原则固化成可查询条件。

**问题三：未检测 ≠ 阴性。** 这条对 `observation` 和 `genomic_alteration` 都适用：

```sql
-- 禁止用 NULL 表示「未检测」和「阴性」，两者语义不同且都会显示
status TEXT NOT NULL CHECK (status IN ('measured','not_tested','negative','unknown'))
```

**用 NULL 表示这四种状态是常见错误**：`NULL` 既可能是「没测」也可能是「忘了填」。必须显式枚举——**依据是医学事实本身**：`not_tested` 表示「医生没开这个检查」，`negative` 表示「查了，是阴性」，两者的临床含义和历史记录价值完全不同。（附带效果：界面上这两组能分别计数，但那是模型正确后的自然结果，不是建模原因。）

### 3.2 `treatment_line`：唯一权威表

[SPEC-v0.4 §6.2](./SPEC-v0.4.md) 定「病情整理、一图秀、临床匹配共用此实体」。落到 schema：

```sql
CREATE TABLE treatment_line (
  line_id     TEXT PRIMARY KEY,
  patient_id  TEXT NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
  line_no     INTEGER,          -- 线数序号，允许 NULL（人工待定）
  regimen     TEXT,
  start_date  TEXT,             -- ISO 8601 含时区；无法确认存 'unknown'
  end_date    TEXT,
  efficacy    TEXT,
  stop_reason TEXT CHECK (stop_reason IN ('progress','toxicity','patient_choice','completed','unknown')),
  revision    INTEGER NOT NULL DEFAULT 1,
  ...
);

CREATE TABLE treatment_line_drug (     -- 药物列表是子表，不是字符串
  line_id     TEXT NOT NULL REFERENCES treatment_line(line_id) ON DELETE CASCADE,
  drug_raw    TEXT NOT NULL,           -- 原文药名
  drug_std    TEXT,                    -- 标准通用名
  normalized  INTEGER NOT NULL DEFAULT 0,  -- 是否已归一
  PRIMARY KEY (line_id, drug_raw)
);
```

**药物列表必须是子表**，理由是**模型本身的**，与界面无关：

1. 一个治疗线**客观上有多个药物**，这是领域事实，不是展示选择。存成字符串就是**违反第一范式**：同一列存多个值，且无法对单个药物建约束
2. `drug_std IS NULL` 表示「未归一」，这是**记录自身的数据质量问题**——未归一必须导致匹配「无法判定」（[MATCHING-SPEC](./MATCHING-SPEC.md)），需要能查询「哪些药未归一」
3. 实测发现 `medication.csv` 的 `DRUG_NAME` 是**方案名不是药物明细**，说明方案与药物明细是**两个不同的实体**，本来就该分开存
4. 存成逗号分隔字符串后，按药物查询只能 `LIKE '%药名%'`——`'吉西他滨'` 会匹配到 `'吉西他滨脂质体'`，这是**正确性缺陷**而非性能问题

**线数序号允许 NULL**：[SPEC-v0.4](./SPEC-v0.4.md) 写「线数允许人工调整」，说明系统算出的线数可能不确知。用 NULL 表示「待人工确认」，不要默认填 1。

### 3.3 `catheter_record` + `maintenance`：接上一篇 DATA-FLOW

[DATA-FLOW-SPEC §4](./DATA-FLOW-SPEC.md) 已论证 `maintenances` 必须是数组。落到 schema：

```sql
CREATE TABLE catheter_record (
  catheter_id  TEXT PRIMARY KEY,
  patient_id   TEXT NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('PTCD','手术置管','Port','PICC')),
  implant_date TEXT,
  site         TEXT,
  status       TEXT,
  brand        TEXT,     -- 新增：器械品牌（如 法国布朗）
  model        TEXT,     -- 新增：型号（如 BL2012）
  hospital     TEXT,     -- 新增：置入医院
  doctor       TEXT,     -- 新增：置入医生
  ...
);

CREATE TABLE catheter_maintenance (
  maintenance_id TEXT PRIMARY KEY,
  catheter_id    TEXT NOT NULL REFERENCES catheter_record(catheter_id) ON DELETE CASCADE,
  date           TEXT NOT NULL,
  action         TEXT,
  performer      TEXT,
  abnormal       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX ix_cath_maint ON catheter_maintenance(catheter_id, date DESC);  -- 「取最近一条」
```

`brand`/`model`/`hospital`/`doctor` 是我上一轮加输液港演示数据时暴露的——散文描述里只有「位置、状态」，没地方存这些。

### 3.4 `genomic_alteration`：基因与病理共用一张表

[TARGET-PANEL-SPEC §1](./TARGET-PANEL-SPEC.md) 明确「基因与病理是两件事」。但**两者字段高度重合**（都有：名称、结果、检测方法、报告日期、证据），且 [§4.1](./TARGET-PANEL-SPEC.md) 要求「单一事实来源」供匹配复用。

**建议共用一张表，用 `assay_type` 区分**（v0.4 已倾向此设计：`IHC marker → 归入 GenomicAlteration，用 assayType='IHC'`）：

| `assay_type` | 覆盖 | 专属字段 |
|---|---|---|
| `NGS` / `PCR` | KRAS、TP53、BRCA1/2、CDKN2A… | `vaf`、`tmb`、`tumor_cell_pct`、`exon` |
| `IHC` | EGFR、HER2、PD-L1、CLDN18.2… | `intensity`、`positive_pct`、`cps`、`result_type` |

**不建两张表的理由**（措辞已从「因为匹配要 UNION」修正为模型依据）：基因与病理在**领域上同属「分子检测结果」**——都是「对某个标志物做了一次检测，得到结果」，共用同一组属性（标志物名、结果、方法、标本、报告日期、证据）。按领域建模它们本就该是一类实体，`assay_type` 是**实体的判别属性**，不是为迁就查询而加的分组列。共用一张表还天然保证「同一患者同一标志物的多次检测」能一起排序（如 HER2 先后两次 IHC）——这是**数据完整性**要求，与界面无关。

**`result_type` 必须枚举**（[CASE-TEMPLATE-SPEC](./CASE-TEMPLATE-SPEC.md) 归纳出 IHC 有六种表达）：

```sql
CHECK (result_type IN ('negative','positive','percentage','score','cps','protein_expression','not_tested','unknown'))
```

因为实测三份真实病历里出现了 `HER2(0)` / `CK7(+)` / `Ki67(平均约60%+)` / `Claudin18.2(约20%+,弱-中等)` / `PD-L1(22C3)(CPS<1)` / `MLH1(蛋白表达)` **六种不同形态**，用单一 `result TEXT` 存会导致匹配规则无法解析。

---

## 4. 索引设计：由查询反推

**索引是 schema 的一部分**，不是后补的优化。按 §2.1 的查询需求反推：

| 索引 | 支撑 | 理由 |
|---|---|---|
| `observation(patient_id, indicator_code, report_date)` | Tab 3 一图秀 | 时序查询，最高频 |
| `observation(patient_id, report_date)` | 看板指标维度 | 按时间取最近值 |
| `maintenance(catheter_id, date DESC)` | Tab 7 全程管理 | 取最近维护 |
| `genomic_alteration(patient_id, gene_name)` | Tab 4 匹配 | 规则比对 |
| `treatment_line(patient_id, line_no)` | 三处共用 | 线数排序 |
| `evidence(document_id)` | 核对链路 | 按文档取证据 |
| `candidate_fact(status)` | 复核队列 | 筛 pending |

**FTS5 索引**：中文全文检索需 trigram 分词器（[STORAGE-SPEC §2.5](./STORAGE-SPEC.md) 已标注此项**未实测**）。

```sql
CREATE VIRTUAL TABLE document_fts USING fts5(
  text, content='', tokenize='trigram'
);
```

**这是当前唯一没有实测证据的存储环节**，建议实机验证后再定稿。

---

## 5. 数据包与患者库的物理分离

[INTEGRATION-DESIGN.md](./INTEGRATION-DESIGN.md) 已有语料挂载设计。落到 schema 要澄清**一个容易混淆的点**：

| 数据 | 存哪 | 可被数据包替换 |
|---|---|---|
| `trial_record`、`trial_eligibility_rule` | **独立只读库**（或 ATTACH） | ✅ 整体替换 |
| `trial_bookmark`、`trial_note` | **患者库** | ❌ 永不 |
| `dataset_generation` | 患者库（记录装了哪版） | ❌ |

**关联键必须是稳定试验键**（来源 + 来源记录 ID），不能用自增主键——否则用户更新数据包后收藏全断。这是「公共只读数据与患者关联不能混放」的落地方式。

---

## 6. 迁移与版本

- `xyb-store.json` 存**格式版本号**；数据库另用 `PRAGMA user_version` 记 schema 版本。
- 迁移必须**单向、可重放、先备份**。迁移前自动备份，失败可回滚。
- **禁止破坏性迁移**：删列/改类型前先建新表复制数据。
- 用户可编辑实体带 `revision`，**迁移不改 revision 语义**。

---

## 7. 待用户确认

| # | 问题 | 影响 |
|---|---|---|
| 1 | 基因与病理**共用一张表**（`assay_type` 区分）是否认可？ | 表数量与匹配查询复杂度 |
| 2 | `Observation` 与 `GenomicAlteration` 是否合并？ | 见下 |
| 3 | 公共试验数据用**独立库 + ATTACH** 还是同库分表？ | 数据包替换方式 |
| 4 | 病历原件路径存库（`documents/` 相对路径）是否足够，还是要存 SHA256 校验？ | 原件完整性 |
| 5 | `DashboardSnapshot` 是否真需要持久化？还是每次实时算、只在用户主动「保存当前状态」时存？ | 表是否必要 |

**第 2 条单独说明**：`Observation`（化验指标）与 `GenomicAlteration`（基因/病理）**都**「有名称、有结果、有日期、有方法、有证据」，形式上可合并。但**建议不合并**，依据是**领域差异**而非界面差异：

- 指标有**单位与参考范围**，基因没有（基因结果的语义是「有/无变异」，不需要单位换算）
- 指标是**同项多次重复测量**（CA19-9 每月一次，是持续监测），基因通常是**一次性或少次检测**（分型定了就不变）
- 两者的**生命周期不同**：指标值会变，基因分型不会变
- 合并会得到一张宽表，一半字段对另一半永远为 NULL——这是**实体混淆**的典型症状

合并的诱惑来自「都是键值对」，但领域语义和生命周期完全不同，强行合并会两边都不好查。

---

## 8. Schema 变更的判断清单（给后续维护者）

Tab 或界面要改时，**先用这张表判断该动哪一层**：

| 变更 | 该改哪层 | 依据 |
|---|---|---|
| 新增一个 Tab，显示已有实体的新组合 | **只改界面** | 数据没变，只是换个看法 |
| 新增一个 Tab，需要模型里没有的实体 | **改领域模型**（加表） | 但这说明模型原本就漏了，与 Tab 无关 |
| 卡片改折叠/展开、排序、分页 | **只改界面**（状态进 localStorage） | 界面状态不是业务事实 |
| 需要按新维度查询 | **加索引**，通常不加表 | 索引是查询驱动的 |
| 真实病历里出现模型存不下的字段 | **改领域模型**（加列） | 如 §3.3 的品牌型号 |
| 指标需要新单位换算 | **加配置**，不改表 | 单位是数据不是结构 |

**一句话判断**：**这个变更改变的是「数据是什么」还是「数据怎么看」**？前者改 schema，后者只改界面。

**反面清单**（出现这些字段说明建模错了）：

- ❌ `display_order` / `sort_index`（排序是视图的事）
- ❌ `is_expanded` / `is_collapsed`（界面状态）
- ❌ `color` / `icon`（展示属性，除非是用户可为实体指定的业务标签）
- ❌ `tab_name` / `page_id`（界面结构进库 = 直接把存储层绑死在展示层）
- ⚠️ `current_*` 前缀字段（「当前状态」常可用查询派生，不必冗余存）
