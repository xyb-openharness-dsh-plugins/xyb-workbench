# 使用 Codex 开发并部署 DSH Desktop Workbench

本文是小胰宝 / 小x宝社区自有的 Workbench 开发脚手架说明，适用于在本机使用 Codex 开发、验证并安装 DSH Desktop 工作台。它补充社区项目流程；包字段、宿主注入点和 API 仍以 [DSH Desktop 官方开发规范](https://dshdesktop.com/workbench/docs/development.md) 及正在使用的 Desktop 版本为准。

## 1. 工作台是什么

Workbench 是 DSH Desktop 的插件包，其中包含服务端插件和客户端业务面板，由 Desktop 原生宿主加载。它不是一个单独启动的网页，也不是把整个 DSH Desktop 仓库复制进业务项目。宿主继续负责公共导航、设置、模式切换、权限、模型/工具选择及原生 Agent 会话；工作台负责业务流程、数据模型、业务 UI 和与原生会话的衔接。

小胰宝默认保留右侧唯一的 Desktop 原生 Agent 会话，业务内容放在左侧工作区；默认目标比例约为 65/35，最终尺寸应遵循当前宿主提供的 API 与容器行为。插件不要重建一套侧边栏、Agent 聊天框或桌面全局导航。

## 2. 依赖条件

### 开发机

- Git、可用 shell、Node.js `>=22.5`（本项目使用 `node:sqlite`）。
- npm；若仓库是 pnpm workspace，则使用与仓库/目标 Desktop 匹配的 pnpm 版本。
- DSH Desktop 已安装并可运行，且能够访问其本地工作台/插件管理能力。
- 本项目使用的源码、原型和本地测试资料。不要把患者真实资料复制进仓库或提交到 Git。

核验示例：

```bash
git --version
node --version
npm --version
```

### 宿主依赖

服务端通常使用宿主提供的 Cordis、DSH connection/webserver 和 Schemastery peer dependencies。将它们声明为 `peerDependencies`，不要把另一份宿主 runtime 私自打进包。开发时可以把 schema 等编译依赖列为 `devDependencies`。安装时出现 peer warning 应单独记录：它不等于成功加载，也不必然等于加载失败；继续看宿主日志和实际 UI。

本项目的检查命令是：

```bash
npm install
npm run check
npm run pack:check
```

## 3. Codex 开发流程

按以下顺序推进，减少返工：

1. **明确业务目标**：确认服务对象、具体业务场景、入口、核心任务步骤和完成结果。目标不明确时只询问一个合并问题：“这个工作台要服务谁、解决什么业务场景？用户从进入到完成任务的核心步骤是什么？”答复前可只读检查仓库，不写业务代码或打包。
2. **盘点仓库**：检查 `AGENTS.md`、`README.md`、官方规范、设计文档、页面原型、schema/迁移、已有代码、测试和未提交变更。先看 `git status`，不能覆盖用户改动。
3. **建立功能树与差异表**：从高保真原型整理“一级页面 → 二级页面 → 内容区 → 字段/状态 → 点击动作 → 空/错误/加载态”；逐项标注已有、缺失、与宿主能力有关的部分。原型页面不可因 UI 代码组织方便而丢失或合并。
4. **界定最小闭环**：每个可操作页面至少明确输入/来源、确认或执行动作、可视化结果，以及结果回顾/导出/交给 Agent 的方式。避免只做静态卡片。
5. **先后端与数据契约，后 UI**：对业务实体、关系、SQLite 表、迁移、读写 API 和错误返回达成一致；前端按 API/schema 显示状态。字段扩展应向前兼容，迁移只新增或明确迁移，不丢弃已有记录。
6. **实现适配层**：在 DSH 官方支持范围内接入服务端、客户端注入、文件/会话能力和设置。把业务功能放进面板，不接管宿主公共 UI。
7. **按页面树核对**：逐页比对原型和实现；重点检查字体、分组、信息层级、交互反馈、窄屏布局、键盘操作、反转卡片状态是否独立且持续、图表尺寸是否响应式，以及空数据/失败状态。
8. **检查并打包**：运行项目检查，检查包内容、元数据、版本号和 tarball 文件清单。对每个变化记录检查结果。
9. **安装到目标 Desktop 并实测**：查清当前 Desktop 实际 profile 与当前版本安装入口；本地安装生成的 `.tgz`，打开业务页、原生 Agent 会话、患者选择、主要页面和代表性交互。
10. **如实报告**：分别写明代码检查、包检查、安装状态、UI 实际加载状态、未能验证项目及需要用户操作的事项。不能把“命令安装完成”写成“界面已验证”。

可把任务拆为数据/API、页面实现、原型核对等相互独立部分，但所有改动仍须集成回同一功能树并统一验证；不要同时改写同一入口或 schema 文件。

## 4. 包结构和关键字段

一个 npm 包只装一个工作台。以下是精简结构示例，值应按当前项目替换：

```text
my-workbench/
├── package.json
├── cordis.patch.yml
├── dsh/
│   └── index.js          # 服务端插件入口
├── lib/
│   └── client.js         # Desktop web 客户端 bundle/入口
├── schema/               # SQLite schema 与递增迁移
├── assets/               # 运行时必须随包携带的只读资源
└── docs/
```

关键 `package.json` 字段示例：

```json
{
  "name": "@community/my-workbench",
  "version": "0.1.0",
  "type": "module",
  "main": "./dsh/index.js",
  "exports": {
    ".": "./dsh/index.js",
    "./client": "./lib/client.js",
    "./package.json": "./package.json",
    "./cordis.patch.yml": "./cordis.patch.yml"
  },
  "files": ["dsh", "lib", "schema", "assets", "cordis.patch.yml"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "inject": ["dsh-desktop-workbenches"]
    }
  }
}
```

注意：实际 manifest 还应按服务端实现声明正确的 `peerDependencies` 和所有运行时依赖。`main`、`exports["."]`、patch 中的包名、客户端 loader ID 和 GitHub repository URL 必须相互一致。不要照抄未被官方规范支持的字段（例如未经规范确认的 `dsh.client.inline`）。`files` 白名单容易漏掉 schema、字体、图标或 SQL 文件，打包后必须查看 tarball 清单。

### `cordis.patch.yml`

用数组向 Desktop 的插件配置增加本工作台，例如：

```yaml
- insert:
    - id: my-workbench-main
      name: '@community/my-workbench'
      config:
        root: !!js dshHomePath('my-workbench')
```

`name` 必须精确对应 npm 包名；`id` 是该宿主实例的稳定唯一 ID。patch 对配置的合并/替换语义要按官方规则处理：配置可能整体被替换，不能假设是深合并；避免覆盖其他插件。没有 patch 项时写合法空列表 `[]`，不要留下半截 YAML。

## 5. 服务端、客户端与 Desktop 对接

### 服务端

- 默认导出符合宿主 Cordis 约定的插件入口；配置使用 Schemastery schema，而不是只依赖未校验的普通对象。
- API 使用项目专属前缀，例如 `/api/xyb-workbench/...`，不要抢占通用路径。
- API 对输入做校验，返回稳定结构和可理解的错误；写库操作与迁移要可重复执行。
- 不从全局状态猜测当前患者、用户或会话归属；明确传递并校验资源 ID 和权限上下文。
- 用户明确选择数据根目录后，数据库和文件写入该目录。卸载插件不应删除患者数据。

本项目入口为 `dsh/index.js`，数据层在 `dsh/store.js`，服务 API 通过 `/api/xyb-workbench/...` 提供。SQLite 文件与迁移路径以设置中确认的数据目录为准。

### 客户端工作台注册

官方模式是通过 Desktop 提供的客户端 injector 注册业务面板，典型形态如下（以规范当前代码样例和宿主类型为准）：

```js
ctx.inject('dsh-desktop-workbenches', (workbenches) => {
  workbenches.register({
    title: '小胰宝工作台',
    repository: 'https://github.com/OWNER/REPO',
    description: '本机病程整理与照护记录'
    // 按规范提供工作台组件及默认业务/会话布局
  })
  return () => { /* 清理注册副作用 */ }
})
```

客户端通常通过 `window.__ModuleLoader__.load({ id: packageName, factory })` 加载，用宿主共享 React（例如 `require('react')`），并导出 `apply` 及 `inject: ['desktopWorkbenches']`。注册项不要擅自加宿主未定义的 `id`；用 `ctx.effect` 或规范要求的 disposer 清理事件/注册。不要把 React 重复打入 bundle。`dsh.client.external` 只用于确需宿主外部提供的依赖，并须与 loader 约定一致。

Desktop 应继续创建并维护原生 Agent 会话。工作台的“给我建议”、临床试验“询问”或报告总结动作，传递页面已确认的摘要和明确提示任务到当前原生会话；Agent 模式、模型、工具、权限由宿主控制。结果文件和重要结果需回存工作台的回顾列表/本地输出目录，使查找、执行、查看、回顾形成闭环。

### 界面适配

- 业务区默认和宿主 Agent 会话并列。若目标 Desktop 支持布局参数，按官方接口声明业务侧和宽度；小胰宝目标左侧约 65%，允许折叠。
- 不覆盖宿主侧边栏、设置、模型/模式切换、公共导航或原生聊天面板。
- 适配容器宽度：检查 65% 与折叠状态、较窄窗口、放大字体、滚动区、弹窗层级；避免 `100vw`、硬编码超宽图表和固定高度导致横向溢出。
- 所有信息状态要有空态、加载态、错误态；重要动作需回显结果。

## 6. 本机数据、模拟数据和扩展

- 模拟数据必须显著标记“模拟/演示”，不要让读者误认为真实检测结果。demo seed 应绑定明确 demo patient 和 manifest；cleanup 只删除 manifest 明确登记的 demo IDs。
- 真实文件保存在用户选定的数据目录，忽略该目录本身，不将其中内容纳入 npm 包、日志或 Git。
- SQLite 表结构应以业务主体和关系建模，加入稳定主键、来源文档、确认状态、创建/修改时间与必要索引。动态检测项适合由指标定义表和观测值表表达，避免每新增一个指标都改表列。
- schema 更新采用编号递增迁移（如 `schema/0009_*.sql`），在事务中记录迁移版本。已有数据要可读；migration 应有空库和旧库验证。
- 文件输入/输出可按用户资料目录分 `input/`、`output/`，按事件时间分类登记数据库元数据；默认保留原件。路径应规范化并限制在配置的数据根目录以内。
- 云解析/联网功能要清楚标出传输对象、服务和确认动作；凭据只从本机设置/安全存储读取，文档仅用假值，例如 `MINERU_API_KEY=your-key-here`。

## 7. 检查、打包、安装与加载验收

### 代码检查和包检查

```bash
npm run check
npm run pack:check
npm pack
tar -tzf ./community-my-workbench-0.1.0.tgz | head -c 4000
```

本项目还使用 `schema/contracts/validate.mjs` 和测试文件；运行 `npm run check` 应包含服务端/客户端语法、测试、schema 合约。每次改包文件都提升版本。打包后检查文件是否实际进入 `.tgz`，尤其是 `cordis.patch.yml`、客户端、迁移和运行时 assets。

### 探测安装能力

先在目标机检查支持的 DSH CLI 和参数，不猜命令：

```bash
dsh --help
dsh plugin --help
dsh plugin add --help
```

如果该版本提供 Desktop 内的“本地插件/工作台安装”界面，按界面安装生成的 `.tgz`。命令行可用时按当前 CLI 帮助使用本地 tgz 路径。确认目标 profile 属于正在使用的 Desktop 应用；shell 中另一套 `~/.dsh`、另一个环境或另一个 Desktop profile 可能完全不同。安装后检查已安装清单、包版本、plugin 日志和实际工作台入口。

示意命令（仅当当前 CLI help 明确支持该参数时才使用）：

```bash
dsh plugin add /absolute/path/community-my-workbench-0.1.0.tgz
```

Workbench 是 pnpm workspace 依赖时，安装命令可能需要 `-w`；Desktop 内置 pnpm 与系统 pnpm 也可能版本不同、store 不兼容。应以该 Desktop 的诊断/安装文档为准，避免随意清理 store 或直接编辑 profile 锁文件。

### 实际加载验收

逐项观察并记录证据：

1. 包清单和 `package.json` 版本正确，Desktop 当前 profile 显示相同版本。
2. 已安装的工作台列表中出现工作台，左侧入口可见。
3. 点击入口后业务面板成功加载，版本号可见；没有 loading 常驻、空白面板或“业务面板加载失败”。
4. 选择/创建项目或患者，业务 API、SQLite 初始化和主要页面均成功。
5. 右侧是 Desktop 唯一原生 Agent 会话，可正常发送请求；工作台没有重复聊天入口。
6. 页面树和核心动作对照原型完整；检查窄布局、键盘操作、卡片独立翻转、日历/弹窗和文件导出等项目实际功能。
7. 明确区分“测试通过”“包已安装”“宿主页面实际加载”和“用户数据端到端流程已验证”。没有看到的 UI 不能标记通过。

**同机重启约束：** 若 Codex 当前就在待测 DSH Desktop 内运行，自动化代理不得关闭或重启该宿主，也不得用进程扫描/杀进程来规避限制。安装完成后请用户完全退出并重开 Desktop，再继续 GUI 验收。重启前只能报告包已安装或安装命令成功；不能宣称新版本已被宿主加载。

## 8. 常见坑与诊断

| 表现 | 常见原因 | 排查方法 |
| --- | --- | --- |
| 工作台未出现在列表 | 安装到错误 profile；`dsh.bundle.patch`、patch 插件 `name` 或 exports 路径不对 | 对照当前 Desktop profile、包清单和启动日志；验证 `name` 完全匹配包名 |
| 左侧入口有，但面板白屏/加载失败 | 客户端文件未打包；`exports["./client"]` 路径错；loader ID、inject 名称或共享 React 用法错误；客户端运行时异常 | `tar -tzf` 查看包；看 Desktop devtools/日志；逐项核对包名、导出和 `dsh-desktop-workbenches` |
| 改了代码但界面旧 | 版本号未升、装错 tarball、装错 profile、宿主仍持有旧模块缓存 | 查看 tarball 版本/hash 和 Desktop 实际 profile；全退出重开后再次检查版本 |
| `ERR_PNPM_STORE_VERSION` 或 peer 警告 | 使用的 pnpm 与该 Desktop/workspace 不匹配，或宿主 peers 未在本机开发环境安装 | 使用当前 Desktop 支持的安装器/版本；区分 peer 警告和实际加载错误，检查后端启动日志 |
| 创建患者时报错 | 数据库迁移遗漏、schema 与 API 字段不一致、空值/日期处理不同 | 用旧库和空库执行迁移，检查 API 请求/返回和对应测试，避免直接删库 |
| SQLite 文件或上传文件跑到意外目录 | 配置根目录未确认、相对路径基于进程 cwd | 记录解析后的绝对数据根路径；路径规范化后确认仍位于根目录中 |
| 页面和原型明显不一致 | 只按大 Tab 实现，遗漏二级页/弹窗/折叠区；测试只覆盖接口 | 先做原型功能树和逐页差异表，把二级页面、设置窗、文档查看/解析、空态和状态保留纳入 UI 验收 |
| 翻转卡片复位或叠字 | React 状态以索引共享、CSS grid 背面占位撑高或 transform 破坏容器 | 每项用稳定 ID 保存状态；正反面绝对定位于同一容器；测试连续翻转多个卡片 |
| 趋势图挤在一起/变形 | SVG viewBox 与容器纵横比不匹配、标签超出、宽度硬编码 | 限制图表在卡片内，使用响应式 viewBox/测量容器，缩窄宽度与字体放大均需截图核对 |
| CSV/PDF 能打开但没有解析数据 | MIME/扩展名未路由、解析返回尚未确认、候选字段直接丢弃 | 按类型测试本地解析与云解析；原件查看、解析、字段核对分开；只把确认字段写入正式记录 |
| 云解析失败或密钥泄露 | API 过期/网络错误/代理问题；把 key 写进 bundle、仓库或终端输出 | 设置有效期与用户可替换路径；错误可读并提供本地/替代方案；key 用假值示例且不打印请求头 |
| 包内缺失资源 | `files` 白名单没有包括迁移、字体、数据库或图片 | npm pack 后查看清单，并在干净 profile 做安装测试 |

排查时先保留现场：记录包版本、profile、错误原文和相关日志的有限片段；日志可能包含本地路径或凭据，分享前需脱敏。

## 9. 小胰宝仓库入口

| 内容 | 路径 |
| --- | --- |
| 项目开发规则 | `AGENTS.md` |
| 高保真 UI 参照 | `docs/xyb-workbench/prototype-v3.html`（以仓库实际文件为准） |
| DSH 服务端入口 | `dsh/index.js` |
| SQLite 存储层 | `dsh/store.js`、`schema/` |
| 客户端 UI | `lib/client.js` |
| 插件注入 patch | `cordis.patch.yml` |
| 包元数据 | `package.json` |

每次完成一个可审阅的功能切片，更新测试/迁移/开发文档并记录真实验证范围。不要为了“通过”而删除旧数据或降低原型一致性标准。
