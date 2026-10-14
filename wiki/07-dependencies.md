# 07 依赖关系

## 1. 工作区内部依赖图

箭头方向 = "依赖"（`workspace:*`）。

```mermaid
flowchart TD
    subgraph 核心
        OC[packages/opencode]
        SDK[packages/sdk/js<br/>@opencode-ai/sdk]
        PLUGIN[packages/plugin<br/>@opencode-ai/plugin]
        UTIL[packages/util<br/>@opencode-ai/util]
        SCRIPT[packages/script]
    end

    subgraph 前端
        UI[packages/ui]
        APP[packages/app]
        DESK[packages/desktop]
        ENT[packages/enterprise]
        CAPP[packages/console/app]
    end

    subgraph 云
        CORE[packages/console/core]
        CFUNC[packages/console/function]
        CMAIL[packages/console/mail]
        CRES[packages/console/resource]
    end

    subgraph 其他
        WEB[packages/web]
        DOCS[packages/docs]
        SLACK[packages/slack]
        FUNC[packages/function]
        VSC[sdks/vscode]
        GHA[github]
    end

    OC --> SDK & PLUGIN & UTIL & SCRIPT
    APP --> UI & SDK
    DESK --> APP
    CFUNC & CAPP & CMAIL --> CORE & CRES
    SLACK --> SDK
    VSC --> SDK
    GHA --> OC
    ROOT[opencode 根包] --> SDK & PLUGIN & SCRIPT
```

要点：

- **SDK 是枢纽**：由服务器 OpenAPI 生成，被 TUI（opencode 内部）、app、slack、vscode 及第三方消费；核心包自身也依赖它（生成与 TUI）。
- **UI 是前端底座**：app/desktop 共享组件、主题、i18n；desktop 只是把 app 装进 Tauri 壳。
- **console 内部单向依赖**：function/app/mail → core + resource。
- **`@opencode-ai/util`** 是最底层纯工具包（`NamedError`、`Slug`、`fn`、`lazy`、`retry`…），核心与前端共用。
- 根 `packages/opencode` 的 `exports: "./*": "./src/*.ts"` 允许 monorepo 内直接按路径导入内部模块（如 `@/bus`、`@/permission/next`，见 `tsconfig.json` 的路径别名）。

## 2. 核心包关键外部依赖（packages/opencode）

| 类别 | 依赖 | 用途 |
| --- | --- | --- |
| LLM | `ai`（Vercel AI SDK v5）、`@ai-sdk/{anthropic,openai,azure,amazon-bedrock,google,google-vertex,groq,mistral,cohere,cerebras,perplexity,xai,deepinfra,togetherai,gateway,openai-compatible,vercel}`、`@openrouter/ai-sdk-provider`、`@gitlab/gitlab-ai-provider`、`ai-gateway-provider` | 全部模型接入 |
| 服务器 | `hono`、`hono-openapi`、`@hono/zod-validator`、`@hono/standard-validator`、`bonjour-service` | HTTP API / OpenAPI / mDNS |
| 协议 | `@modelcontextprotocol/sdk`（MCP）、`@agentclientprotocol/sdk`（ACP）、`vscode-jsonrpc`（LSP JSON-RPC） | 编辑器/工具协议 |
| CLI | `yargs`、`@clack/prompts` | 命令行解析与交互 |
| TUI | `@opentui/core`、`@opentui/solid`、`solid-js`、`@solid-primitives/*`、`opentui-spinner` | 终端界面 |
| 文件/解析 | `@parcel/watcher`、`chokidar`、`ignore`、`web-tree-sitter` + `tree-sitter-bash`、`turndown`（HTML→MD）、`gray-matter`（frontmatter）、`partial-json` | 文件监听/内容处理 |
| 终端 | `bun-pty`、`ghostty-web`（补丁版，web/桌面终端） | PTY |
| 其他 | `zod`（v4）、`ulid`（ID）、`decimal.js`（token 费用精度）、`remeda`（函数式工具）、`diff`、`fuzzysort`（模糊搜索）、`jsonc-parser`、`minimatch`、`xdg-basedir`、`@zip.js/zip.js`、`@octokit/*`（GitHub 集成）、`@openauthjs/openauth`、`clipboardy`、`open` | 通用 |

## 3. 前端关键依赖

| 包 | 依赖 |
| --- | --- |
| ui / app | `solid-js`、`@kobalte/core`（无头组件）、`tailwindcss` v4 + `@tailwindcss/vite`、`virtua`（虚拟列表）、`marked` + `marked-shiki` + `shiki`、`@pierre/diffs`（diff 引擎）、`@solidjs/router`、`@solidjs/meta`、`dompurify`、`fuzzysort` |
| app 专属 | `ghostty-web`（浏览器终端，带 `patches/ghostty-web@0.3.0.patch`）、`@playwright/test`（e2e） |
| desktop | `@tauri-apps/*` + Rust 侧 `tauri 2` |
| web | `astro` |
| enterprise | `@solidjs/start`（SolidStart） |

## 4. 版本目录（Catalog）

根 [package.json](../package.json) 的 `workspaces.catalog` 集中管理跨包版本（如 `zod 4.1.8`、`hono 4.10.7`、`solid-js 1.9.10`、`vite 7.1.4`、`tailwindcss 4.1.11`、`ai 5.0.124`、`typescript 5.8.2` + `@typescript/native-preview`），子包用 `"zod": "catalog:"` 引用 —— 升级只需改根目录一处。另有根级 `overrides`（锁 `@types/bun`、`@types/node`）与 `patchedDependencies`（ghostty-web）。

## 5. 工具链依赖

| 工具 | 版本/来源 | 用途 |
| --- | --- | --- |
| Bun | 1.3.5（`packageManager` 固定） | 运行时、包管理、测试、单文件打包 |
| Turborepo | 2.5.6 | `typecheck`/`build`/`test` 任务编排（[turbo.json](../turbo.json)） |
| TypeScript | 5.8.2 + `@typescript/native-preview`（`tsgo`） | 类型检查 |
| SST | 3.17.23 | 基础设施即代码 |
| Prettier | 3.6.2（`semi: false`、`printWidth: 120`） | 格式化 |
| husky | 9 | pre-push 钩子（[.husky/pre-push](../.husky/pre-push)） |
| Playwright | 1.51.0 | App e2e |
| Nix | flake.nix | 可复现打包（node_modules 规范化脚本在 [nix/scripts/](../nix/scripts/)） |
| @hey-api/openapi-ts | 0.90.10 | SDK 生成 |
