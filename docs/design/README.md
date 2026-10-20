# xyb-workbench

肿瘤患者照护工作台（暂定名）—— 设计与规范文档集中目录。

本目录是这条产品线的**单一事实来源**：需求、设计、规范、开发计划、验收记录都放这里。
代码不在本目录，代码是 DSH Desktop 工作台包（一个 npm 包 = 一个工作台）。

---

## 目录内容

### 设计文档（我们自己产出的）

| 文件 | 说明 | 状态 |
|---|---|---|
| [SPEC-v0.4.md](./SPEC-v0.4.md) | **当前范围底稿**。定位从「资料整理工具」重排为「病人状态总控台」：全局看板 + 一期三模块（病情整理 / 病情一图秀 / 临床匹配）+ 照护管理六 Tab 占位。含已确认决策、数据模型、治疗线数三处同步规则、分期路线与验收要点 | **待用户确认** |
| [DASHBOARD-SPEC.md](./DASHBOARD-SPEC.md) | **全局看板规格**。**v2 分层信息架构（概要→关注项→可折叠维度行→全程管理）**、对齐基线、降噪规则、标题序号规则、五级红绿灯语义、文案规范 | 待讨论 |
| [CALENDAR-SPEC.md](./CALENDAR-SPEC.md) | **首页两周日历**。14 天待办、按日查看、新增与编辑事件、本机存储、医疗计划改期边界和验收标准 | 实现基线 |
| [INDICATOR-CATALOG.md](./INDICATOR-CATALOG.md) | **指标目录**。六大类 34 项指标（含 CEA/CA125/CA724/CA50/AFP、血常规全套）、参考范围与危险值、**HGB<100 与消化道出血联动**、多指标趋势呈现方案 | 待确认 |
| [TIMELINE-SPEC.md](./TIMELINE-SPEC.md) | **动态病情一图秀规格**。三个 CSV 数据模型、页面设计、看板集成可行性与必须补的安全性设计 | 待讨论 |
| [CASE-TEMPLATE-SPEC.md](./CASE-TEMPLATE-SPEC.md) | **病情档案字段规格**。从 3 份真实脱敏模版归纳的字段级映射、IHC 六种结果类型、抽取器规则 | **待确认（原硬阻塞已解除）** |
| [TARGET-PANEL-SPEC.md](./TARGET-PANEL-SPEC.md) | **基因与病理靶点面板规格**。KRAS 分型与 19 个基因、14 个 IHC 靶点（NCCN 2025.V1 补充）、卡片状态色、**未突变/未检测折叠**、**基因科普弹层**、与临床匹配的复用规则 | 待确认 |
| [CARE-MANAGEMENT-SPEC.md](./CARE-MANAGEMENT-SPEC.md) | **全程管理与营养管理**。导航变更理由、**能量公式（中国肿瘤营养治疗指南2020）**、当前→目标→实际→差距流程、**箭头颜色按指标方向判定**、全程管理四子页 | 待讨论 |
| [PSYCH-CARE-SPEC.md](./PSYCH-CARE-SPEC.md) | **心理支持**。情绪量表、小馨宝社群、安宁疗护查询、哀伤支持；含危机提示与隐私边界 | 待讨论 |
| [STORAGE-SPEC.md](./STORAGE-SPEC.md) | **存储、安全与数据出境规格**。持久层选型（`node:sqlite`，本机实测）、启动口令（访问控制非加密）、字段级加密、原件不入库、Remotion 用途与数据出境原则 | **已确认（存储/口令/原件）；加密列清单待确认** |
| [SETTINGS-SPEC.md](./SETTINGS-SPEC.md) | **统一设置页**。顶栏齿轮入口、三组配置、**MinerU Token 申请与填入**、**复用 CLI 配置（已定，含写入规则）**、密钥安全规则 | Token 存放已定 |
| [IMPLEMENTATION-QUEUE.md](./IMPLEMENTATION-QUEUE.md) | **顺序开发清单**。临床匹配、设置与 MinerU、资料解析、营养动态卡片、首页进度环的实现与验收状态 | 实施中 |
| [REVIEW-SPEC.md](./REVIEW-SPEC.md) | **报告核对（多文档·多页面）**。文档来源 list、页导航、**页级内容类型分流（文本/表格图片/…）**、按页 OCR、跨页比对、页内批量确认 | 待讨论 |
| [EXTRACTION-SPEC.md](./EXTRACTION-SPEC.md) | **文档抽取与报告核对**。五段式抽取链路、本地/云端取文分支、**多文件核对三模式（按报告/按指标/仅看待处理）**、冲突与去重、失败降级矩阵 | 待讨论 |
| [RESOURCE-DEPENDENCIES.md](./RESOURCE-DEPENDENCIES.md) | **依赖资源总册**。MinerU（已实测）、本地提取、AI 模型、检索服务、语料、图表库；含隐私决策与体积预算 | 待决策 |
| [MATCHING-SPEC.md](./MATCHING-SPEC.md) | **临床匹配规格**。患者入组档案、入排规则库结构、匹配度三档算法、药物归一、数据渠道配置 | 待讨论 |
| [UI-DESIGN.md](./UI-DESIGN.md) | 界面设计（v0.4）。**七 Tab 导航（带序号）**、品牌色板（取自官方 logo）+ 红绿灯五级状态色、各模块布局、状态矩阵 | 待确认 |
| [prototype-v2.html](./prototype-v2.html) | **可点击高保真原型**（7 个一级 Tab 全部可点）。看板 v2 分层折叠、官方 logo、红绿灯状态点、基因/病理卡片、营养管理、心理支持四子页、全程管理 | 已渲染验证 35/35 + 响应式 16/16 + 回归 43/43 |
| [INTEGRATION-DESIGN.md](./INTEGRATION-DESIGN.md) | 集成、数据与交付设计。检索服务、数据更新、四层打包、宿主接缝与验收矩阵 | 设计建议 |
| [DESKTOP-ADAPTATION-1.2.2.md](./DESKTOP-ADAPTATION-1.2.2.md) | **DSH Desktop 工作台适配**。左侧 65% 业务区、右侧唯一原生 Agent 会话、患者/会话映射、建会话流程与 1.2.2 实机验收 | 设计基线；适配尚未完成 |
| [V3-REBUILD-PARITY-STATUS.md](./V3-REBUILD-PARITY-STATUS.md) | v3 高保真原型逐 Tab 对照和当前实现差异；区分已实现、未实现和宿主实测项 | 持续更新 |
| [SPEC-v0.3.md](./SPEC-v0.3.md) | 历史版本：三 Tab（总览/病情资料/临床试验）范围 | 历史 |
| [SPEC-v0.2.md](./SPEC-v0.2.md) | 历史版本 | 历史 |
| [prototype.html](./prototype.html) | 历史原型（v0.3 三 Tab 结构） | 历史 |

### 资源

| 路径 | 说明 |
|---|---|
| `assets/xyb-logo.png` | 官方 logo 处理版（128px，已裁掉四周留白），用于界面引用 |
| `assets/xyb-logo-original.png` | 官方 logo 原档（512×512） |

### 外部参考资料（不在本目录）

| 位置 | 说明 |
|---|---|
| `~/Downloads/ca199_toolbox/index.html` | CA199 指标管理独立工具（ECharts + PapaParse，已本地 vendored）。一图秀的参考实现 |
| `~/Downloads/ca199_toolbox/data.csv` | 指标记录：665 行，长表格式 `testTime,indicatorName,indicatorValue` |
| `~/Downloads/ca199_toolbox/medication.csv` | 用药方案：5 行，`PATIENT_ID,START_DATE,END_DATE,DRUG_NAME,TAG` |
| `~/Downloads/ca199_toolbox/remarksline_update.csv` | 时间轴标注：4 行，`REMARKS_DATE,REMARKS,OFFSETX,OFFSETY`（日期有尾引号格式问题） |
| 赵军营病历.pdf / 李菊病历.pdf / 病历记录(1).pdf | 病情模版样本，字段规格来源 |

### 开发规范（上游 `docs/` 的副本，只读参照）

这几份是 DSH Desktop 官方规范，**原件在 `docs/` 根目录**，这里放副本是为了让本目录自包含。
**规范以上游原件为准**，上游更新后请重新同步（见下方「同步方法」）。

| 文件 | 上游原件 | 说明 |
|---|---|---|
| [workbench-standard.zh.md](./workbench-standard.zh.md) | `docs/workbench-standard.zh.md` | **《工作台开发规范》全文**（版本 2026-09-29）。需求确认闸门、包格式、三个标识、服务端/客户端入口、构建与本地安装、界面边界、工作台与会话/工作区关系、本机自测清单、失败交付口径。**开发必读第一份** |
| [workbench-quickstart.zh.md](./workbench-quickstart.zh.md) | `docs/workbench-quickstart.zh.md` | 六步速览。先看这个建立整体印象，再读标准全文 |
| [workbenches.md](./workbenches.md) | `docs/workbenches.md` | 工作台市场机制。市场目录协议、安装/卸载 API、状态记录文件、上架投稿流程、焦点测试命令 |
| [workbench-market-acceptance.zh.md](./workbench-market-acceptance.zh.md) | `docs/workbench-market-acceptance.zh.md` | 市场验收规范。本机自测通过即可自用；**上架市场是另一套更严的验收**，第 1 期不涉及 |

英文版同在 `docs/` 根目录：`workbench-standard.en.md`、`workbench-quickstart.en.md`、`workbench-market-acceptance.en.md`。

### 上游其他相关规范

| 文件 | 说明 |
|---|---|
| `docs/code-standards.md` | 仓库代码规范 |
| `docs/development.md` | 本仓库开发上手 |
| `docs/architecture.md` | Desktop 整体架构 |
| `docs/patch-plugin-contract.md` | 插件 patch 契约 |
| `docs/source-build-contract.md` | 源码构建契约 |
| `packages/dsh-desktop-workbenches/package.json` | **工作台宿主运行时包**，写工作台包时的骨架参照物 |

---

## 开发底本

本仓库即开发底本：

- 路径：`~/Downloads/dsh-desktop`（完整克隆，非 shallow，286M）
- 分支：`xyb-dsh-workbench`
- 基线 HEAD：`115a0b4`（2026-10-09，`Merge pull request #671 from dataelement/feat/workbench-default-on`）
- remote：`git@github.com:dataelement/dsh-desktop.git`

**注意**：这是上游官方仓库，我们做的是**自己的独立工作台包**，不应向上游 push 业务代码。
分支用于承载设计文档与本地产物；工作台包本身将来要落在**用户自己的 GitHub 仓库**里
（工作台身份 = `owner/repo`，身份由仓库 URL 解析，必须有独立仓库）。

---

## 同步方法

上游规范更新后，重新同步本目录的规范副本：

```bash
cd ~/Downloads/dsh-desktop
git fetch origin main
git checkout origin/main -- docs/workbench-standard.zh.md \
  docs/workbench-quickstart.zh.md docs/workbenches.md \
  docs/workbench-market-acceptance.zh.md
cp docs/workbench-standard.zh.md docs/workbench-quickstart.zh.md \
   docs/workbenches.md docs/workbench-market-acceptance.zh.md \
   docs/xyb-workbench/
```

---

## 关键硬约束速查

摘自《工作台开发规范》，犯一条就要返工：

1. **一个 npm 包只能放一个工作台**。五个业务模块 ≠ 五个包（第 1 期）。
2. **每个工作台必须有自己的 GitHub 仓库**；工作台身份 = 小写 `owner/repository`，由 `register()` 的 `repository` 字段解析。写错会硬报 `Client package ... is not attributed to a market repository.`
3. `package.json` 必须声明 `dsh.bundle.patch`，否则包只会被当普通依赖。
4. `dsh.client.inject` 必须包含 `dsh-desktop-workbenches`；声明了 `dsh.client` 就必须有 `exports["./client"]`。
5. 客户端入口必须是**已构建的单文件模块**，Desktop 不会替你构建。
6. **不得自建聊天界面**，必须用宿主提供的 `conversation` 节点。
7. **不得静默创建目录**，保存文件前必须调用宿主目录选择器。
8. 无会话、无工作区时，业务面板也必须立即可用。
9. 不得复制、遮挡、替换宿主的模式切换器和「工作台管理」入口。
10. `cordis.patch.yml` 为空或只有注释会导致启动失败，无内容要写 `[]`。
11. 卸载不得删除用户数据。
12. 本机自测未通过就如实标注「未实测」，不得宣称验收通过。

### 本机安装链路（已实测确认）

```bash
pnpm pack                                      # 产出 .tgz
dsh plugin add --profile desktop <生成的.tgz>   # 本地 .tgz 安装（CLI 已确认支持）
# 然后把包名加进 /Users/qinxiaoqiang/.dsh/profiles/desktop/package.json 的 dsh.profile.bundles
# 再重启 Desktop —— 刷新页面无效
# 验收证据 = 「已安装的工作台」看到条目 + 从左侧入口真的点开
```

三个已确认的坑：

- 装完**还要登记**（写进 `dsh.profile.bundles`），漏了就是「文件都在、重启后侧栏空的」。
- **必须重启**，刷新页面没用。
- `dsh --profile web --dump-config` 出现插件层**不能**替代 UI 加载证据。

已排除的死路：官方市场安装接口 `/api/desktop-workbenches/market-install` 只接受已上架 Awesome 目录的 identity，`installWorkbenchGeneration` 内部 `kind` 硬编码为 `'registry'`（`packages/dsh-desktop-market-installer/index.js:687`），本地 `.tgz` **只能**走 CLI 或 Desktop 插件安装界面。

---

## 待办

**硬阻塞（不解决无法开工）**

- [x] ~~用户提供：现有的病情/治疗汇总模板~~ → 已收到 3 份真实模版，字段规格见 [CASE-TEMPLATE-SPEC.md](./CASE-TEMPLATE-SPEC.md)，**待用户确认**
- [ ] 用户确认：CASE-TEMPLATE-SPEC §7 的 7 个问题（字段是否完整、姓名匿名策略、是否要联系方式、线数推导、IHC 分类、导出格式、能否再给 3–5 份样本）

**范围确认**

- [ ] 确认 SPEC-v0.4 的「全局看板 + 一期三模块」是否符合预期
- [ ] **心理支持**：[PSYCH-CARE-SPEC §9](./PSYCH-CARE-SPEC.md) 的 8 个问题（**小馨宝官方文案与入群方式**、量表选择、安宁疗护机构库来源与授权、哀伤入口措辞、心理数据是否完全不发模型、心理维度不用红绿灯、热线地区覆盖、自助内容责任）
- [ ] **全程管理与营养**：[CARE-MANAGEMENT-SPEC §5](./CARE-MANAGEMENT-SPEC.md) 的 7 个问题（命名、营养评估范围、胰酶记录、能量目标来源、维护时间提示、子页顺序、是否加疼痛管理）
- [x] ~~Token 存放~~ **已定：复用 `~/.mineru/config.yaml`**
- [x] **设置入口**：顶栏打开设置弹窗，MinerU 为默认解析选项；首次云端解析需明确同意。细节见 [IMPLEMENTATION-QUEUE.md](./IMPLEMENTATION-QUEUE.md)
- [ ] **抽取与依赖**：是否接受病历上传 MinerU 云端解析？token 谁提供？CLI 随包还是自装？（[RESOURCE-DEPENDENCIES §9](./RESOURCE-DEPENDENCIES.md)）
- [ ] **指标目录**：六类清单是否完整、**多指标默认用小倍数图**是否认可、危险值阈值、HGB 自动关联消化道出血是否会造成过度紧张（[INDICATOR-CATALOG §8](./INDICATOR-CATALOG.md)）
- [ ] **核对交互**：页级状态点是否太细、按「待核对数」排序、**按页上传是否认可**、表格页本页内批量确认、默认显示原件还是解析文本（[REVIEW-SPEC §8](./REVIEW-SPEC.md)）
- [ ] **靶点面板**：[TARGET-PANEL-SPEC §6](./TARGET-PANEL-SPEC.md) 的 8 个问题（**SLN 确切全称**、未检测占位卡、BRAF V600E 显示、病理补充项、阳性分档粒度、可关注提示、导出、未检测是否进需关注项）
- [ ] 一图秀：[TIMELINE-SPEC §7](./TIMELINE-SPEC.md) 的 7 个问题（Tab 命名、665 条数据迁移与核对、历史方案药物明细补录、标注偏移方案、导出图片、多患者对比、ECharts 构建方式）
- [ ] 看板：[DASHBOARD-SPEC §7](./DASHBOARD-SPEC.md) 的 7 个问题（ECOG vs KPS、完整度是否显示、需关注项排序、并发症覆盖项、是否放复查日程、一期占位写法、是否需导出打印）
- [ ] 匹配：[MATCHING-SPEC §8](./MATCHING-SPEC.md) 的 8 个问题（规则库初始来源、AI 抽取范围、药物归一表来源、三档顺序、导出报告、器官功能基准、自定义规则、待确认规则处理）
- [ ] 用户确认：是否同时管理多个病人（决定数据模型与目录结构，骨架阶段锁死）
- [ ] 用户确认：GitHub 账号 owner（工作台身份必需，`repository` 为必填）
- [ ] 用户确认：Desktop「工作台管理」是否有本地安装按钮（没有也不影响，走 CLI）

**后续**

- [ ] 拿到上述确认后细化 SPEC（v0.5）
- [ ] Dev 落包骨架（等「是否多病人」确认后，同时锁包名与 `root`）
