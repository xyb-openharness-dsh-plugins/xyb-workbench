# DSH 原生 Agent 面板设计记录

更新：2026-10-20；实现包版本：0.1.29。

## 目标与版式决策

小胰宝主要用于整理患者资料、照护记录和回顾已确认的信息；AI 会话用于用户需要时继续讨论。因此采用 DSH Desktop 官方 `customFrame: true`，默认先呈现工作台业务区，用户点击顶栏「打开 AI 对话」后再显示 Desktop 提供的原生 `conversation` 节点。工作台不绘制仿聊天界面，也不在首次打开时静默创建会话。

业务区在左，原生会话位于最右侧。会话展开时默认宽度 35%，拖动或键盘调整范围 25%–45%；宽度保存在当前浏览器本机 `localStorage`。隐藏只移除视图，不主动结束会话。根级语义 header 按 DSH macOS 避让要求作为 customFrame 首个子元素，并使用 `--dsh-frame-leading-clearance`。

## 交互与状态

- 顶栏显示小胰宝品牌、服务端 health 接口提供的包版本，以及打开/收起操作。
- 已展开时提供独立 × 收起按钮，说明收起不会结束会话。
- 分隔条支持指针拖动、方向键微调、Home/End 边界跳转，并暴露 `separator` 的 ARIA 当前值。
- 未提供 conversation 节点时显示明确的宿主能力缺失提示，不伪装成已经连接。
- 原有页面工具栏保留本机资料状态、字号切换和设置入口。

## 依据与验证边界

设计稿：[prototype-v4.html](prototype-v4.html)；既有业务页面继续以 [prototype-v3.html](prototype-v3.html) 为准。按需会话和 `customFrame` 的选择符合 [DSH Desktop 官方开发规范](https://dshdesktop.com/workbench/docs/development-en/) §3.5、§4。官方规范说明宿主会提供原生 conversation 节点，但目标 Desktop 版本、实际节点渲染、会话切换/草稿保留、分隔条实机行为尚未在目标 Desktop 安装验收，不能视为已验证。

隐藏状态在每次工作台组件新建时默认关闭；宽度跨工作台组件重建保存在本机浏览器偏好中。当前工作台没有把该偏好放入患者 SQLite 资料。
