# 05 客户端与生态

## 1. @opencode-ai/sdk（[packages/sdk/js](../packages/sdk/js)）

**自动生成的 TypeScript 客户端**，是所有官方客户端访问服务器的唯一通道。

- 生成流程（[script/build.ts](../packages/sdk/js/script/build.ts)）：
  1. `bun dev generate`（核心包 GenerateCommand）→ 导出服务器 OpenAPI 规范；
  2. `@hey-api/openapi-ts` 生成 `src/v2/gen` 客户端代码；
  3. 格式化、tsc 编译，发布 `dist`。
- 导出入口：`.`、`./client`、`./server`、`./v2`、`./v2/client`、`./v2/server`。
- 关键能力：`createOpencodeClient` 创建客户端；内置 SSE 支持（[src/gen/core/serverSentEvents.gen.ts](../packages/sdk/js/src/gen/core/serverSentEvents.gen.ts)，维护 `Last-Event-ID`、自动重试）；流式响应直接透传 `response.body`。
- **约定：修改 `server/server.ts` 的任何 API 后必须重新生成 SDK**（`./script/generate.ts` 或 `./packages/sdk/js/script/build.ts`）。

## 2. @opencode-ai/plugin（[packages/plugin](../packages/plugin)）

面向插件作者的公开类型包（核心包依赖它来加载插件）。

- `PluginInput`：插件运行时上下文 —— `client`（SDK）、`project`、`directory`、`worktree`、`server`（URL）、`$`（shell）等（[src/index.ts](../packages/plugin/src/index.ts)）。
- 主要 hooks：`tool`（注册自定义工具）、`auth`（提供商认证流程）、`chat.message`、`chat.params`、`permission.ask`、`command.execute.before`、`tool.execute.before/after`、`event` 等。
- `ToolDefinition`：自定义工具的 `args(Zod) + description + execute()`。
- `src/shell.ts`、`src/tool.ts` 提供辅助类型；`src/example.ts` 是插件示例。

## 3. @opencode-ai/ui（[packages/ui](../packages/ui)）

SolidJS 共享组件库，被 `app` 与 `desktop` 消费。

- **组件**（[src/components/](../packages/ui/src/components/)）：会话渲染核心 `session-turn` / `message-part`（分片渲染：文本、工具调用、reasoning）、diff 渲染 `diff` / `diff-changes`（基于 `@pierre/diffs`，支持 unified/split）、`markdown`（marked + shiki 高亮）、`line-comment`、`file-icon`、`provider-icon`、`keybind`、`toast`、`tabs`、`select`、`text-field`、`typewriter` 等全套基础件。
- **主题系统**（[src/theme/](../packages/ui/src/theme/)）：`color.ts`（hex/oklch 色阶生成）、`resolve.ts`（seed colors → CSS tokens）、`loader.ts`（注入样式、light/dark 切换）、`desktop-theme.schema.json`（桌面端用户自定义主题 schema）。
- **Context**（[src/context/](../packages/ui/src/context/)）：`i18n.tsx`（15 语言）、`worker-pool.tsx`（diff Web Worker 池）、`marked.tsx`、`diff.tsx`、`dialog.tsx`。
- **pierre/**：`@pierre/diffs` 的 worker 封装（`worker.ts` 创建 `WorkerPoolManager`）。

## 4. Web App（[packages/app](../packages/app)）

`@opencode-ai/app` —— SolidJS + Vite 的 Web 客户端，也是桌面端前端。

- **入口**：[src/app.tsx](../packages/app/src/app.tsx) / [src/entry.tsx](../packages/app/src/entry.tsx)；[vite.config.ts](../packages/app/vite.config.ts)（Solid + Tailwind 插件）。
- **Context 体系**（[src/context/](../packages/app/src/context/)）：`sdk.tsx`（client + 事件转发）、`sync.tsx` / `global-sync.tsx`（拉取并同步 session/message/part 数据，SSE 驱动增量更新）、`layout.tsx`、`permission.tsx`、`prompt.tsx`、`models.tsx`、`settings.tsx`、`terminal.tsx`、`command.tsx`（命令面板）、`file.tsx`、`local.tsx`、`platform.tsx`、`notification.tsx`、`language.tsx` 等。
- **页面**（[src/pages/](../packages/app/src/pages/)）：`home.tsx`（项目/服务器选择）、`session.tsx`（会话界面）、`directory-layout.tsx`、`layout.tsx`、`error.tsx`。
- **关键组件**（[src/components/](../packages/app/src/components/)）：`prompt-input.tsx`（输入区）、`terminal.tsx`（**ghostty-web** 终端，WebSocket 连接 `/pty`）、`file-tree.tsx`、`titlebar.tsx`、会话内嵌 diff/review、对话框矩阵：`dialog-select-model/provider/server/file/directory/mcp`、`dialog-settings`、`dialog-fork`、`dialog-manage-models`、`status-popover`、`session-context-usage` 等。
- **设置页**：`settings-general/providers/models/mcp/permissions/keybinds/commands/agents`。
- **i18n**：[src/i18n/](../packages/app/src/i18n/) 15 语言包。
- **E2E**：[e2e/](../packages/app/e2e/) Playwright 测试（app/files/models/projects/prompt/session/settings/sidebar/status/terminal 十余组用例 + `selectors.ts`/`fixtures.ts`），配置 [playwright.config.ts](../packages/app/playwright.config.ts)。

## 5. 桌面端（[packages/desktop](../packages/desktop)）

Tauri 2 应用，Rust 壳 + `packages/app` 前端（开发端口 1420）。

- **TS 侧**（[src/](../packages/desktop/src/)）：`index.tsx` 入口、`bindings.ts`（Tauri command 绑定）、`menu.ts`（原生菜单）、`updater.ts`（应用自更新）、`webview-zoom.ts`、`cli.ts`、i18n 多语言。
- **Rust 侧**（[src-tauri/src/](../packages/desktop/src-tauri/src/)）：
  - `main.rs` / `lib.rs`：启动、Wayland/X11、代理环境处理；
  - `cli.rs`：桌面端内嵌 CLI 透传；
  - `markdown.rs`：markdown 帮助渲染；
  - `window_customizer.rs`：窗口外观自定义；
  - `job_object.rs`：Windows Job Object（确保子进程随应用退出）。
- 打包配置：[tauri.conf.json](../packages/desktop/src-tauri/tauri.conf.json) / `tauri.prod.conf.json`；构建脚本 `scripts/`（prepare、predev、copy-bundles）。

## 6. 官网与文档

- [packages/web](../packages/web)：Astro 营销官网。特殊路由 `[...slug].md.ts`：把 docs 内容以 `text/plain` markdown 输出 —— **LLM 友好文档**（`opencode.ai/docs/*.md`）。
- [packages/docs](../packages/docs)：Mintlify 用户文档站（`docs.json` 导航 + `essentials/`、`ai-tools/` 等 mdx）。
- [packages/enterprise](../packages/enterprise)：SolidStart 企业版站点（SSR：entry-server/entry-client），SST 部署到 Cloudflare 并绑定 R2。

## 7. 自动化集成

| 包/目录 | 说明 |
| --- | --- |
| [sdks/vscode](../sdks/vscode) | VS Code 扩展（[src/extension.ts](../sdks/vscode/src/extension.ts)，esbuild 打包，发布走 `.github/workflows/publish-vscode.yml`） |
| [packages/slack](../packages/slack) | Slack Bot：监听提及并通过 SDK 驱动 OpenCode |
| [github/](../github) | 官方 GitHub Action（`action.yml` + [index.ts](../github/index.ts)）：在 issue/PR 上以 OpenCode 代理身份响应 |
| [packages/function](../packages/function) | 独立 serverless API（[src/api.ts](../packages/function/src/api.ts)），SST 部署 |
| [packages/containers](../packages/containers) | 镜像：`base`（运行基础）、`bun-node`、`rust`（构建）、`publish`（发布流水线）、`tauri-linux`（桌面打包），[script/build.ts](../packages/containers/script/build.ts) 统一构建 |

## 8. 客户端与核心的对接方式（汇总）

```mermaid
flowchart TD
    CORE[OpenCode Server<br/>OpenAPI + SSE] -->|生成| SDK[@opencode-ai/sdk]
    SDK --> TUI[TUI]
    SDK --> APP[Web App]
    APP --> DESK[Desktop Tauri]
    SDK --> VSC[VS Code]
    SDK --> SLACK[Slack]
    SDK --> GHA[GitHub Action]
    CORE -->|ACP 协议| ZED[Zed 等 ACP 编辑器]
    CORE -->|webview 嵌入| OTHER[任意第三方 Web 客户端<br/>CORS 白名单 + SDK]
```
