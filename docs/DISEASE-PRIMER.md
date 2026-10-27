# 疾病概要 · 胰腺癌

> 本项目实例文件，由 `xyb-workbench-starter` 的 `templates/DISEASE-PRIMER.md` 复制而来。
> 规范：`docs/36-DISEASE-PRIMER.md`。四段固定、顺序不变，缺段不合格；填不了的写「本台尚未整理」，**不许删段**。

- 项目 / 品牌：小胰宝工作台（xyb-workbench，胰腺癌母版）
- 病种：胰腺癌（Pancreatic Cancer），默认指胰腺导管腺癌（PDAC）
- 最后更新：2026-10-25
- 数据文件：`docs/design/primer-data.js`（`window.DISEASE_PRIMER`）；模块 `docs/design/primer.js` / `primer.css`，挂载页 `docs/design/prototype-v3.html`
- 装机版：`lib/client.js` 内联同一份四段数据，顶栏 `.xyb-top-actions` 有「疾病概要 ?」入口；`public/index.html` 是原型静态副本，由 `dsh/index.js` 挂到 `/api/xyb-workbench/ui/`
- README 对应段：`## 疾病概要`

## 0 原件状态（本项目的前提）

| 文件 | 状态 |
|---|---|
| NCCN 胰腺癌指南 2025.V1 | 只见于 `docs/design/TARGET-PANEL-SPEC.md`（2026-10-13）的**二次引用**，**原件未取得**，更新日与生效日待核；可点去向：<https://www.nccn.org/guidelines/guidelines-detail?category=1&id=1455>（官网指南详情页，已实测） |
| 《中国肿瘤营养治疗指南》2020 版（胰腺癌章节） | 只见于 `docs/design/CARE-MANAGEMENT-SPEC.md` 的**二次引用**，**原件未取得**，出版信息待核；无公开 PDF，数据里标 `nolink` + 原因 |
| CSCO 胰腺癌指南 | 项目 docs **未记录版本**，一律「版本未核实」；官网订购页/官方 App 发布，需登录，未取得公开 PDF |
| WHO 消化系统肿瘤分类 | 第 5 版（2019），**未取得全书**；可点去向：<https://publications.iarc.fr/Book-And-Report-Series/Who-Classification-Of-Tumours/Digestive-System-Tumours-2019>（IARC 出版方页面，已实测） |

所以：页码「页码待核」，来源栏统一「未取得原件，据二次来源」。**没看到原件，不许假装看到了。**

## 1 定义（`definition`）

胰腺癌通常指起源于胰腺外分泌腺上皮的恶性肿瘤，最常见的是**胰腺导管腺癌（PDAC）**。胰腺还有起源于内分泌细胞的神经内分泌肿瘤等类型，**与导管腺癌不是同一种病**，本项目不把它们混在同一套路径里叙述。

- **部位**：胰头、胰体、胰尾。胰头病变更常牵涉胆道梗阻——这是本台把黄疸、胆道处理与胰酶替代单列记录的原因。
- **可切除性**：可切除 / 交界可切除 / 不可切除，是影像（如增强 CT）加血管受累情况做出的判断。**这是医生的判断，本台只记原话与评估日期**，不根据肿瘤大小、标志物或症状去推。
- **本台的记录口径**：病理、影像、分子检测原文照抄并标「未核对 / 已核对」；不解释报告含义、不给分期结论。
- 术语上沿用 2026-10-13 设计稿的写法（`docs/design/TARGET-PANEL-SPEC.md`），不混用旧名。

**来源**：NCCN · NCCN Guidelines · Pancreatic Adenocarcinoma · 2025.V1（据 `docs/design/TARGET-PANEL-SPEC.md` 二次引用；更新日与生效日待核）· 未取得原件，据二次来源 · 页码待核 ｜ 本项目 `docs/design/TARGET-PANEL-SPEC.md`（2026-10-13 设计建议稿）· 一手项目文件

## 2 医学资料规范和指南情况（`evidence`）

| 机构 | 文件 | 版本 / 年份 | 原件 | 本台的用途 |
|---|---|---|---|---|
| NCCN | NCCN Guidelines · Pancreatic Adenocarcinoma | 2025.V1（二次引用，更新日与生效日待核） | 未取得原件 | 靶点面板清单与治疗路径的版本依据；不引具体条目 |
| 中国抗癌协会等（编发机构待核） | 《中国肿瘤营养治疗指南》胰腺癌章节 | 2020 版 | 未取得原件 | 能量与营养目标公式的依据（`CARE-MANAGEMENT-SPEC.md`） |
| CSCO | 胰腺癌诊疗指南 | 版本未核实（项目 docs 未记录） | 未取得原件 | 国内可及性与实践差异；核实前**不作引用依据** |
| WHO | 消化系统肿瘤分类 | 版本未核实 | 未取得原件 | 病理命名口径（导管腺癌与神经内分泌肿瘤的区分） |

- 一台一表，不合并；未取得原件的必须标出来。
- 靶点面板的清单来自 NCCN 2025.V1 的二次引用，**不等于**本项目已核对过指南原文的靶点章节；面板上线前须逐条回原件（`TARGET-PANEL-SPEC.md` 状态为「设计建议稿，待用户确认」）。

**来源**：见上表逐行。

## 3 目前治疗全景概要（`landscape`）

按期别与治疗目的分组，只列**手段类别**，不含剂量、疗程与选择条件。

### 3.1 可切除

- 手术：胰头部位多为胰十二指肠切除，胰体尾为远端胰腺切除。
- 术后辅助化疗类别。
- 新辅助治疗：在部分情形下被讨论。

### 3.2 交界可切除

- 先做新辅助治疗（化疗或放化疗类别），之后重新评估能否手术；评估结论由医生下，本台不代判。

### 3.3 局部进展、不可切除

- 系统治疗类别。
- 放化疗类别。
- 针对梗阻的处理：胆道引流或支架、胃肠吻合等。

### 3.4 转移性

- 联合化疗方案类别。
- 特定分子背景下被列出的靶向类别（如 BRCA1/2 或 HRD 相关）。
- MSI-H / dMMR 情形下的免疫治疗类别。
- 国内获批状态与可及性**需单独核实**。

### 3.5 贯穿全程

- 疼痛管理、营养与体重、胆道梗阻处理、胰腺外分泌功能不足的胰酶替代。
- 本台只记医嘱原文与实际执行情况（吃了没有、体重多少、疼痛自评），不给建议、不调整方案。

**固定出口（原话照抄）**：

> 以上是文献与指南里列出的手段，按病期与线序排列，不代表任何一项适合你。选哪一个，这一句需要问你的医生。

**来源**：NCCN · NCCN Guidelines · Pancreatic Adenocarcinoma（2025.V1，二次引用）· 未取得原件 · 页码待核 ｜ CSCO · 胰腺癌诊疗指南（版本未核实）· 未取得原件 · 页码待核

## 4 发展趋势（`trend`）

只写已发生的事实，每条带日期或版本号。

1. 2025：NCCN 胰腺癌指南版本记录为 **2025.V1**（据 `docs/design/TARGET-PANEL-SPEC.md`，2026-10-13 记录；更新日与生效日待核，原件未取得）。
2. 2020：《中国肿瘤营养治疗指南》2020 版发布，其中胰腺癌章节被本项目用作能量与营养目标的依据（据 `docs/design/CARE-MANAGEMENT-SPEC.md`；出版信息待核，原件未取得）。
3. 临床研究登记数量与阶段分布、国内监管批件、分类体系更新：**本台尚未整理**——项目 docs 没有检索日期与检索式，不填数字、不写批件号。

**来源**：本项目 `docs/design/TARGET-PANEL-SPEC.md`（2026-10-13）与 `docs/design/CARE-MANAGEMENT-SPEC.md`（2026-10-13）· 一手项目文件 ｜ 其余条目本台尚未整理

## 5 落地清单

- [x] `docs/design/primer.css`（从 `assets/patterns/disease-primer.css` 复制，不改结构）
- [x] `docs/design/primer.js`（从 `assets/patterns/disease-primer.js` 复制，不改逻辑）
- [x] `docs/design/primer-data.js`（本文件四段转成 `window.DISEASE_PRIMER`）
- [x] `prototype-v3.html` 三处引用：`<link rel="stylesheet" href="primer.css">` / `<script src="primer-data.js">` / `<script src="primer.js">`
- [x] 顶栏出现「?」（`.top-actions` 内手写 `[data-primer-open]`，模块接管并补 a11y）
- [x] `public/` 恢复：`index.html` + `小胰宝 · 工作台原型 v3_files/` + `assets/` + primer 三件套，经 `/api/xyb-workbench/ui/` 访问
- [x] `lib/client.js` 顶栏「疾病概要 ?」入口与四段浮窗（返回/关闭/Esc），数据内联自 `primer-data.js`
- [x] README 的 `## 疾病概要` 四段正文写好，小标题与数据文件一致
- [x] 用 starter 探针（临时复制到 `scripts/` 运行，跑完删除）打 `http://127.0.0.1:8183/docs/design/prototype-v3.html`，全绿（10/10）

## 6 验收（P1–P9）

本项目原型在 `docs/design/`、未迁移到 `prototypes/`；primer 三件套与顶栏入口已落到 `docs/design/`，2026-10-27 实测如下。

| 编号 | 判据 | 结果 |
|---|---|---|
| P1 | 顶栏有可点「?」，aria-label 说明四段 | PASS |
| P2 | 整页面板，四段齐全且顺序为 定义 → 指南 → 治疗全景 → 趋势 | PASS |
| P3 | 面板宽高 ≥ 视口 90% | PASS |
| P4 | 打开压一条 history，`history.back()` 收起 | PASS |
| P5 | 「返回」「关闭」两个独立入口 | PASS |
| P6 | 关闭后焦点回触发按钮、滚动位置不变 | PASS |
| P7 | Esc 只退一层 | PASS |
| P8 | 四段齐全、每段有来源、趋势段无禁止词 | PASS |
| P9 | 排版对齐（1440/900/390 三档，文本右极差 ≤2px） | PASS |

`node scripts/check-primer-links.mjs`：14 项断言全过（2 条唯一 OK 链接、7 个链接声明位、7 处 `nolink` + note）。

## 7 本项目教训

- **可切除性不许自己判**。初稿在定义段写过「肿瘤包绕血管超过 180 度即为交界可切除」，撤掉了：那是指南原文的细节，本项目手上只有二次引用，而且这条判断属于医生。现在只写「评估是医生的判断，本台记原话与日期」。
- **NCCN 2025.V1 是二次引用，不是原件**。项目里它出现在 `TARGET-PANEL-SPEC.md` 的靶点清单来源，本文件照实写「据二次引用、原件未取得」，并注明面板上线前需回原件逐条核。
- **胰腺神经内分泌肿瘤不能并进导管腺癌的路径写**。定义段单列一句，治疗全景段不混排——两者病理与治疗框架不同。
