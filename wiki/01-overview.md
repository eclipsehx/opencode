# 01 项目概览

## 1. 项目定位

OpenCode（仓库内 npm 名 `opencode`，发布名 `opencode-ai`，当前版本 1.1.51）是一个 **100% 开源的 AI 编程代理**，能力对标 Claude Code，关键差异点：

- **不绑定模型提供商**：通过 Vercel AI SDK 接入 Anthropic、OpenAI、Google、Amazon Bedrock、Azure、Groq、Mistral、xAI、OpenRouter、GitHub Copilot、GitLab 等 20+ 提供商，也支持本地模型。
- **客户端 / 服务器架构**：核心引擎是无头 HTTP 服务器（默认端口 4096），任何客户端（TUI / Web / 桌面 / 移动端）都通过同一套 OpenAPI + SSE 事件流驱动它。
- **开箱即用的 LSP 支持**：内置 LSP 客户端，诊断信息回流给模型。
- **TUI 优先**：终端界面基于自研 OpenTUI 框架（SolidJS 渲染到终端）。
- **可扩展**：插件（npm 包或本地文件）、自定义工具、自定义 Agent、Skill、MCP 服务器、自定义命令。

## 2. 仓库总体布局

这是一个 **Bun + Turborepo 单仓（monorepo）**，工作区包括 `packages/*`、`packages/console/*`、`packages/sdk/js`、`packages/slack`。

| 路径 | 说明 |
| --- | --- |
| `packages/opencode` | **核心包**：CLI、API 服务器、会话引擎、工具链、TUI（约占仓库代码量大头） |
| `packages/sdk/js` | `@opencode-ai/sdk`：由服务器 OpenAPI 规范自动生成的 TypeScript 客户端 |
| `packages/plugin` | `@opencode-ai/plugin`：面向插件作者的公开 API（hooks、自定义工具类型） |
| `packages/ui` | `@opencode-ai/ui`：SolidJS 共享组件库（diff 渲染、markdown、主题系统、i18n） |
| `packages/app` | `@opencode-ai/app`：Web 客户端（SolidJS + Vite），也是桌面端的前端 |
| `packages/desktop` | Tauri 2 桌面应用（Rust 壳 + `packages/app`） |
| `packages/web` | Astro 官网（含 LLM 友好的 markdown 文档输出路由） |
| `packages/docs` | Mintlify 用户文档站（docs.json + mdx） |
| `packages/console` | 云控制台：`core`（数据模型/业务）、`function`（API Worker）、`app`（前端）、`mail`（邮件模板）、`resource`（资源绑定） |
| `packages/enterprise` | SolidStart 企业版站点（部署到 Cloudflare + R2） |
| `packages/function` | 独立 serverless 函数（`src/api.ts`） |
| `packages/util` | `@opencode-ai/util`：基础工具库（NamedError、Slug、Lazy、retry 等） |
| `packages/script` | 构建发布共享脚本 |
| `packages/slack` | Slack Bot 集成 |
| `packages/containers` | Docker 镜像定义（base / bun-node / rust / publish / tauri-linux） |
| `sdks/vscode` | VS Code 扩展（esbuild 打包） |
| `github/` | 官方 GitHub Action：用 OpenCode 代理处理 issue / PR |
| `infra/` | SST 基础设施定义（Cloudflare 栈） |
| `nix/` + `flake.nix` | Nix 打包（opencode / desktop / node_modules 规范化） |
| `script/` | 仓库级脚本（generate、publish、version、changelog、format、stats 等） |
| `specs/` | 性能优化 / 重构专题的设计规格文档 |
| `.github/workflows` | CI/CD（测试、类型检查、发布、部署、容器、AI 审查等） |
| `themes/` | TUI 彩蛋主题（undertale / deltarune） |
| `patches/` | 依赖补丁（`ghostty-web@0.3.0`） |

## 3. 技术栈总览

| 层次 | 技术 |
| --- | --- |
| 运行时 / 语言 | Bun 1.3+、TypeScript（ESM）、类型检查用 `tsgo`（TypeScript 原生预览版） |
| 核心 AI | Vercel AI SDK v5（`ai` + `@ai-sdk/*` 系列提供商包） |
| API 服务器 | Hono + hono-openapi（OpenAPI 规范生成）+ SSE / WebSocket |
| 数据校验 | Zod v4（Schema 同时用于运行时校验和 OpenAPI/JSON Schema 生成） |
| CLI | yargs |
| TUI | `@opentui/core` + `@opentui/solid`（SolidJS 终端渲染）、opentui-spinner |
| Web 前端 | SolidJS 1.9 + Vite 7 + Tailwind CSS 4 + Kobalte、`virtua` 虚拟列表 |
| 终端模拟（Web） | `ghostty-web`（带本地补丁），PTY 经 WebSocket 接入 `bun-pty` |
| 桌面端 | Tauri 2（Rust） |
| 代码解析 | tree-sitter / web-tree-sitter（bash 解析） |
| 文件监听 | `@parcel/watcher` + chokidar；搜索用 ripgrep（外部二进制） |
| MCP / ACP | `@modelcontextprotocol/sdk`、`@agentclientprotocol/sdk` |
| 持久化 | 无数据库：全局目录下 JSON 文件 + 自研迁移；云端用 Drizzle ORM + PlanetScale(MySQL) |
| 基础设施 | SST v3 → Cloudflare（Worker、R2、KV、D1/Bucket、Durable Object）、Stripe、PlanetScale |
| 工程 | Turborepo、husky（pre-push）、Prettier、Playwright（e2e）、Nix、GitHub Actions |
| 多语言 | 应用与 UI 内置 15 种语言包（en/zh/zht/ja/ko/de/fr/es/…） |

## 4. 运行形态与发布

| 形态 | 入口 |
| --- | --- |
| CLI / TUI | `opencode`（`packages/opencode/bin/opencode`） |
| 无头服务器 | `opencode serve`（默认 4096，支持 mDNS 局域网发现） |
| Web 模式 | `opencode web`（服务器 + 打开 Web 界面） |
| 桌面应用 | Tauri 打包（dmg / exe / deb / rpm / AppImage） |
| 编辑器 | VS Code 扩展、Zed 扩展（经 ACP）、`opencode attach <url>` 远程接入 |
| 自动化 | GitHub Action（PR 审查/处理）、Slack Bot |

发布渠道由构建期常量 `OPENCODE_CHANNEL` 控制（`latest` / `preview` / `local`），见 [installation/index.ts](../packages/opencode/src/installation/index.ts)；升级由 `UpgradeCommand` 与 `Installation` 命名空间负责。

## 5. 核心设计原则（来自源码与 AGENTS.md）

- **模块 = 命名空间**：核心逻辑以 `namespace X {}` 组织（`Session`、`Tool`、`Provider`、`Config`…），每个模块文件顶部 `Log.create({ service: "x" })`。
- **每目录单例状态**：`Instance.state(fn)` 提供按工作目录缓存的惰性单例，是全仓库最核心的状态模式（详见 [02-architecture.md](02-architecture.md)）。
- **Schema 即契约**：Zod schema 通过 `.meta({ ref })` 进入 OpenAPI，SDK、客户端类型全部由其派生。
- **事件驱动**：内部 `Bus` 发布/订阅 → 服务器 `/event` SSE → 所有客户端实时同步。
