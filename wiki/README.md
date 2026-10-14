# OpenCode Code Wiki

> 本 Wiki 由对仓库源码的静态分析生成，面向需要在 OpenCode 仓库中进行开发、二次开发或架构调研的工程师。

**OpenCode** 是一个开源 AI 编程代理（The open source AI coding agent，npm 包 `opencode-ai`），采用 **客户端 / 服务器架构**：核心引擎以内置 HTTP(S) API 服务器形式运行，TUI、Web 应用、桌面端、VS Code 插件、Zed（ACP 协议）、Slack Bot、GitHub Action 等都是它的客户端。它与具体模型提供商解耦，通过 Vercel AI SDK 接入 20+ 家模型服务商。

## 文档目录

| 文档 | 内容 |
| --- | --- |
| [01-overview.md](01-overview.md) | 项目定位、核心特性、仓库总体布局、技术栈总览 |
| [02-architecture.md](02-architecture.md) | 整体架构：C/S 模型、会话引擎、事件总线、持久化、配置与权限体系 |
| [03-core-opencode.md](03-core-opencode.md) | 核心包 `packages/opencode` 全模块详解：CLI、Server、Session、Tool、Provider、Agent 等 |
| [04-tui.md](04-tui.md) | 终端界面（TUI）：OpenTUI + SolidJS 架构、路由、主题、键位系统 |
| [05-clients.md](05-clients.md) | 客户端与生态：JS SDK、Web App、桌面端、VS Code、GitHub Action、插件系统 |
| [06-cloud-console.md](06-cloud-console.md) | 云平台：opencode Zen / Black、Console、SST 基础设施 |
| [07-dependencies.md](07-dependencies.md) | 依赖关系：工作区内部依赖图、关键外部依赖、版本目录与工具链 |
| [08-development.md](08-development.md) | 构建与运行：环境要求、开发调试命令、测试、构建、CI/CD 与发布流程 |

## 快速上手

```bash
# 环境要求：Bun 1.3+
bun install

# 启动 TUI（等价于生产环境的 opencode 命令）
bun dev

# 启动 headless API 服务器（默认端口 4096）
bun dev serve

# 启动 Web 客户端开发服务器（需先启动 API 服务器）
bun run --cwd packages/app dev

# 类型检查
bun turbo typecheck
```

## 推荐阅读路径

- **了解全局**：01 → 02 → 07
- **改核心逻辑**（session / tool / provider）：02 → 03 → 08
- **改界面**（TUI / Web / 桌面）：04 → 05 → 08
- **部署或云相关**：06 → 08
- 修改了 `server/server.ts` 中的 API 后，务必重新生成 SDK（见 [08-development.md](08-development.md)）。

## 仓库约定速览

- 默认分支为 `dev`；PR 标题遵循 Conventional Commits（`feat:` / `fix:` / `docs:` …）。
- 代码风格见根目录 [AGENTS.md](../AGENTS.md)（避免 `else`、优先 `const`、单一词命名、优先 Bun API 等）。
- 所有输入用 Zod 校验；模块采用命名空间组织（如 `Tool.define()`、`Session.create()`）；日志用 `Log.create({ service })`。
