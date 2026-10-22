# 变更记录

## 2026-10-22 · MinerU 跨工作台统一口径（包版本 0.1.34）

用户给了四条口径并逐条拍板：「默认 precision / 可选 flash；precision 走 API v4 四步；token 必需且 `.secrets/mineru.json` 唯一；flash 免 token 只回 markdown」。本轮把能落地的两条落到代码，把落不了的一条改成如实标注。

- **默认解析模型改回 `pipeline`**（`dsh/mineru.js` 的 `MINERU_MODEL_DEFAULT`，回退 `vlm`）。设置弹窗下拉的两个选项说明与默认态同步改写，`|| 'vlm'` 的兜底表达式改 `'pipeline'`。代价写在注释里：空格分列的检验单 PDF 用 pipeline 可能丢列。
- **`.secrets/mineru.json` 成为唯一密钥文件**：`dsh/settings.js` 删掉 `mineruConfigFile()`、删掉所有往 `~/.mineru/config.yaml` 读写 YAML 的分支，改为 `mineruSecretFile()` + `readSecretToken` / `writeSecretToken`（JSON、0600、原子改名、解析失败不覆盖）。`tokenSource` 的 `config-file` 改名 `secret-file`。
- **env 保留为兜底，不删**：`MINERU_TOKEN` 仍在，但排在文件之后（本仓 0.1.32 起就是这个顺序，本轮与其余五仓对齐）。设置页文案改为「唯一本地密钥文件 + env 只作临时覆盖」，不再暗示 CLI 共用。
- **测试重写**：`test/settings.test.mjs` 5 条改为 `tokenFile` 注入（临时目录），断言 `source === 'secret-file'`、mode 0600、`~/.mineru/config.yaml` 不存在；`test/mineru.test.mjs` 3 条反转（默认 pipeline、拒 pipeline 才回退 vlm）。`npm run check` 34/34 全绿。
- **文档**：`docs/design/SETTINGS-SPEC.md` §3.5 整节重写（原「与 CLI 共用 config.yaml」决策作废）、§3.2 / §4 / 决策表同步；`RESOURCE-DEPENDENCIES.md`、`IMPLEMENTATION-QUEUE.md`、`docs/design/README.md`、`docs/design/prototype-v2.html` 文案一并改。
- **未做、已在文档标注**：① Flash 通道（`POST /api/v1/agent/parse/file`）全家族 0 处实现，「轻量模式，结果可能不准」无落点；② `.gitignore` 补 `.secrets/`（此前漏了，测试时曾让假 Token 落进工作区）。

## 2026-10-22 · Token 过期后给出路（包版本 0.1.33）

用户原话：「**如果过期了，让AI提醒患者更新key，给用户发mineru的申请链接**」。这轮把"解析失败"从一句报错变成三个可执行动作。

- **Token 失效 → 界面留一条独立提醒**（不随下一句话消失）：一句话说清影响范围（只有扫描件/照片的自动识别受影响，原件在本机、已确认指标不受影响），并给三个动作：① 打开 `https://mineru.net/apiManage/token` 申请/重置 ② 「填入新 Token」直接开设置 ③ 「让 Agent 提醒我怎么更新」。
- **让 Agent 说人话**：点 ③ 会把一段提示词放进右侧原生会话输入框（患者自己按发送，不代替患者发言）。提示词包含分步操作（申请 → 复制 → 设置里粘贴 → 保存弹窗自动关 → 回到资料库重新解析），并要求提醒 **不要把 Token 发到对话或病友群里**、可退到 TXT/MD/CSV 本机解析或手工录入，同时不许把它说成病情变化。
- **顺带让 Agent 主动提**：Token 失效期间，任一页面的「给我建议」提示词都会附一句「本机提示：Token 失效，请在末尾用一两句提醒患者更新并说明入口，不要写成病情变化」。患者不会主动翻设置，这条才让它有被看见的机会。
- **判定不新增状态码**：后端错误消息里含该申请地址，前端即视为 Token 问题（`lib/client.js` 的 `mineruAlert`）。一处约定、两处引用，避免前后端各猜一套。
- **错误文案顺带修正**：`store.js` 原来给所有失败都加「本地解析失败：」，而解析可能走云端；界面又加一层「解析失败：」，叠成「解析失败：本地解析失败：…」。现只保留界面那一层。
- **`.html` 从支持列表移除**：v4 批量接口实测拒收（`model_version 'vlm'/'pipeline' cannot process html files`，-10002）。留着白名单等于承诺一个一定失败的入口。
- **LaTeX 单位归一**：真实 `full.md` 的单位是 `$10^9/L$`、`10^{9}/L`，本地夹具写的是纯文本 `10^9/L`，所以离线用例一直绿、装到桌面端单位列却原样显示 `$10^9/L$`。`normalizeUnit` 现在先剥 `$`、`\(…\)`、`\[…\]`、`\mu`、花括号，再做归一；认不出的只剥壳、不推断。
- 验证：`npm run check` 38/38 全绿（新增 4 项：LaTeX 单位归一、HTML 拒收且不花额度、Token 失效提醒含申请链接且非 Token 故障时不弹、以及一条走真实 401 报文经 `parseDocument` 落库的集成测试——确认落库消息里带申请地址、不带 Token 本身、也不再写「本地解析失败」）。

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
