# 变更记录

## 2026-10-22 · 修 Token 优先级与设置弹窗（包版本 0.1.32）

- **「换了新 Token 还是 401」是代码 bug，不是 Token 问题**。`resolveMineruToken` 原来把环境变量 `MINERU_TOKEN` 排在第一位：本机环境里留着一条早已过期的 Key，用户在设置界面换成新 Token 也只写进 `~/.mineru/config.yaml`，请求始终用环境里那把，云端返回 401 `user token expired`。
  - 实测三把 Key：环境变量 → **401 expired**；`config.yaml`（界面换的新 Key）→ 有效；随包公益 Key → 有效。
  - 改为 **设置里保存的 > 环境变量 > 随包公益**：界面里显式保存是最明确的意图，应当盖过环境变量。
- 401 报文不再只报"401"：解析云端返回的 `msg`，`user token expired` 会翻译成「Token 已过期」，并写明本次用的是哪一把（设置中的 / 环境变量 / 随包公益）。Token 本身不进错误消息。
- 设置里「当前生效」来源可见，避免再出现"我改了但它没用"的困惑。
- **设置弹窗保存后自动关闭**（原来保存成功仍要手动点关闭）。
- **解析模型下拉原来写死 `value="pipeline"`**：界面上只有一个选项、选什么都存 pipeline，0.1.30 改的默认 vlm 在 UI 侧被吃掉。现改为 vlm / pipeline 两项受控选择。
- 文案去掉已不存在的「Flash 免费解析」承诺（该兜底在 0.1.31 随 CLI 一起移除）。
- 验证：`npm run check` 34/34 全绿；新增「设置里的 Token 优先于环境变量」「保存返回来源」「401 expired 翻译」等 4 项测试。

## 2026-10-22 · 解析改走 HTTP API（包版本 0.1.31）

- **换的是传输层，起因是实测**：`dsh/mineru.js` 原来 `execFile('mineru-open-api')` 按 PATH 找 CLI 二进制。装机后用 GUI 典型 PATH（`/usr/bin:/bin:/usr/sbin:/sbin`）实测 **ENOENT**——桌面端从 Finder 启动拿不到 shell 的 PATH，市场分发的用户机器更是没有这个二进制。抽取层修得再对，解析起不来用户还是看不到候选。
- 改为 MinerU **HTTP API v4** 四步：`POST /file-urls/batch` 申请链接 → `PUT` 上传（不设 `Content-Type`）→ 轮询 `GET /extract-results/batch/{id}` → 下载 `full_zip_url` 解出 `full.md`。用户机器上不再需要任何额外程序，只需要网络。
- 新增 `lib/zip.js`（最小 ZIP 读取器，无第三方依赖），与 GIST/乳腺/淋巴瘤三仓同一份（md5 `948a08e3…`）。**这笔是复制债**：四个仓库各存一份，应沉到脚手架 `project-template/`，本轮先保证可用。
- `engine_version` 从写死的 `'cli'` 改为 `'v4'`；`engine` 仍是 `mineru-api-vlm` / `mineru-api-pipeline`，`store.js` 里按 `mineru-` 前缀判断解析结果的逻辑不受影响。
- **去掉 CLI 的 flash 免鉴权兜底**：那条路径本身依赖本机二进制（桌面端本就不可用），且 HTTP 侧没有等价能力。Token 失效时改为明确提示"到设置里替换 Token 或到 mineru.net 申请"，不再静默降级成另一套质量口径的解析。
- **代理是已知缺口**：CLI 时代 curl 会认 `HTTP_PROXY`，Node 内置 `fetch` 不认。连接失败时若检测到代理变量，错误里直接写明"当前版本的内置请求不走系统代理"，避免用户去查网络或 Token。真正的代理支持需要引入 `undici` 的 ProxyAgent，本轮未做、不要假装有。
- 错误语义细化：`UNAUTHORIZED`（401/403，不重试）/ `TASK_FAILED`（文件本身失败，不换模型）/ `TIMEOUT` / `NO_MARKDOWN`（zip 里没有 `full.md` 就失败，不返回半份结果）/ `NO_TOKEN`（不发匿名请求）。
- 验证：`npm run check` 通过；tests=31, pass=31, fail=0（MinerU 客户端 11 项离线测试：四步顺序、上传不带 Content-Type、401 不重试、vlm 默认、拒 vlm 回退 pipeline、文件失败不换模型、缺 full.md 报错、多次轮询、无 Token 不发请求）。**尚未联网实测真实文件**——离线测试证明的是协议与错误路径，不是云端真实返回。

## 2026-10-21 · 文档解析修复（包版本 0.1.30）

- **修的是"抽不出指标"，不是传输层**：MinerU 的 `full.md` 表格是 `<table><tr><td>` HTML，原抽取器按行读文本，整表被压成一行 → 传一份表格化验单 PDF 抽出 0 条。现改为先 `htmlTablesToPipes()` 转竖线表（含 `colspan` 补位、HTML 实体还原），再按位置对齐；项目数与数值数不一致整行放弃。
- 抽取逻辑从 `dsh/store.js` 拆到 `dsh/extract.js`，可单独测试；`store.js` 只保留编排与落库。
- 指标词表从 3 项（CA19-9 / CEA / CA125）扩到 30 余项：肿瘤标志物、血常规、肝功能、感染与炎症、肾功能、代谢与营养、凝血。更具体的别名排在前面（糖化血红蛋白先于血红蛋白、前白蛋白先于白蛋白），避免误配。
- 默认模型由 `pipeline` 改为 `vlm`（pipeline 会把空格分列的表格压成一格）；接口明确拒绝 vlm 时自动回退 pipeline 并提示"表格质量可能下降"，文件本身解析失败不换模型重试。`dsh/settings.js` 此前把 `mineruModel` 写死且读回时忽略存储值，现已尊重用户选择。
- 界面指标分类补「凝血功能」，PT/INR/APTT/FIB 不再落到「其他指标」。
- 验证：`npm run check` 通过；tests=26, pass=26, fail=0（新增 11 项抽取测试 + 4 项模型/回退测试）。同一份合成化验单夹具：修复前 0 条 → 修复后 12 条，值与单位全对。

## 2026-10-20 · 开发快照（包版本 0.1.27）

- 文档解析改为后台入队并提供任务查询接口、状态通知和错误记录；新增0010迁移与SQLite忙等待；纳入设计规格、原型和来源素材归档。
- `npm run check`：通过（退出码0）；tests=11, pass=11, fail=0。
- 详细范围见 [Git同步记录](docs/GIT-SYNC-2026-10-20.md)；本次未创建正式发布tag。
