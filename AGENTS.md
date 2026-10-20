# 小胰宝社区 Workbench 开发脚手架

本仓库用于开发、验证并在本机安装 DSH Desktop 工作台。工作台是 DSH 插件包；开发流程由小胰宝 / 小x宝社区维护，遵循 DSH 官方包与运行约定。

## 开发前

- 先确认目标用户、业务场景和用户从进入到完成任务的核心流程。目录名、示例代码和现有界面不能代替需求确认。
- 阅读 [Codex Workbench 开发与部署指南](docs/WORKBENCH-DEVELOPMENT-WITH-CODEX.md) 和 [DSH 官方开发规范](https://dshdesktop.com/workbench/docs/development.md)。
- 阅读 `README.md`、相关 schema、当前高精度原型（小胰宝既有业务页以 `docs/design/prototype-v3.html` 为准；AI 对话框架以 `docs/design/prototype-v4.html` 为准），并检查 `git status`。保留用户已有未提交更改。
- 先从原型整理页面树、关键字段、状态、交互和闭环，再与现有实现逐页比较；未开发页面按原型实现，已有页面按差异补齐。没有特别原因，不得擅自简化或合并原型页面。

## 实现约定

- DSH 包由 `package.json` 的 `dsh` 元数据、`cordis.patch.yml`、`dsh/index.js` 服务端入口和 `lib/client.js` 客户端入口组成。改动后检查四者及客户端导出、服务端路由是否一致。
- 业务面板应适配原生工作台容器；保留 Desktop 的公共导航、设置、模式切换和原生 Agent 会话，不覆盖宿主入口。
- 患者与社区业务数据保存在用户明确指定的本地资料目录。SQLite schema 变更使用递增迁移；不得通过重置数据库丢弃用户记录。
- 演示数据必须明确标注为模拟数据；种子与清理脚本只作用于明确的演示记录，不读取或清理真实用户记录。
- 病情内容用于资料整理和医患沟通，不生成诊断或治疗结论。云端解析前清楚告知文件会发送到相应服务；禁止把可用 API 密钥写入文档、日志、测试输出或仓库示例。
- Agent 跳转须使用 DSH Desktop 原生会话与权限。把当前业务页已确认的摘要、明确任务和来源传入会话，并在工作台保留可回顾的结果/文件记录。

## 检查与打包

在仓库根目录运行：

```bash
npm run check
npm run pack:check
npm pack
```

检查包内是否包含 `package.json`、`cordis.patch.yml`、服务端/客户端入口、运行时 schema 和所需 assets；确认导出路径、插件名、版本号及注入 ID 一致。改代码后递增 semver 版本再打包，避免 Desktop 装到旧版本。

安装方式必须以目标 DSH Desktop 版本支持的 CLI/界面为准。先看安装帮助，不猜测命令；确认目标 profile 是当前桌面应用正在使用的 profile，再安装绝对路径 `.tgz`。安装完成要报告包版本和 profile。

若 Codex 正运行在目标 DSH Desktop 内，禁止从自动化流程关闭或重启该 Desktop/Harness。按官方规范告知用户完全退出并重开，再检查已安装列表、左侧工作台入口、业务页面和右侧原生 Agent 会话。尚未实际看到的状态必须标为未验证。

## 完整开发指南

需求澄清流程、包结构示例、开发/本地安装步骤、Desktop 对接方式、检查清单和常见故障见 [docs/WORKBENCH-DEVELOPMENT-WITH-CODEX.md](docs/WORKBENCH-DEVELOPMENT-WITH-CODEX.md)。
