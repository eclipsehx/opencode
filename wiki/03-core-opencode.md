# 03 核心包 packages/opencode 详解

核心包目录：[packages/opencode/src](../packages/opencode/src)。入口 [index.ts](../packages/opencode/src/index.ts)，包清单 [package.json](../packages/opencode/package.json)（`bin: opencode`，`exports: "./*" -> "./src/*.ts"`，版本 1.1.51）。

## 1. CLI 入口与命令

[index.ts](../packages/opencode/src/index.ts) 用 yargs 注册命令，全局中间件负责 `Log.init`、设置 `AGENT=1/OPENCODE=1`、错误格式化（`FormatError` + `NamedError.toObject()`）。

| 命令 | 实现文件 | 说明 |
| --- | --- | --- |
| `run` | cli/cmd/run.ts | 非交互式执行一条 prompt（脚本/CI 用） |
| `serve` | cli/cmd/serve.ts | 启动无头 API 服务器 |
| `web` | cli/cmd/web.ts | 服务器 + Web 界面 |
| `attach` | cli/cmd/tui/attach.ts | TUI 远程接入服务器 |
| `auth` | cli/cmd/auth.ts | 提供商登录/凭据管理 |
| `agent` | cli/cmd/agent.ts | agent 创建/管理 |
| `models` | cli/cmd/models.ts | 浏览可用模型 |
| `github` | cli/cmd/github.ts | GitHub 集成（安装 Action/agent 等） |
| `pr` / `session` / `export` / `import` | 同目录 | PR 流程、会话管理/导入导出 |
| `acp` | cli/cmd/acp.ts | Agent Client Protocol 模式（Zed 等） |
| `mcp` | cli/cmd/mcp.ts | MCP 服务器管理 |
| `stats` / `upgrade` / `uninstall` / `generate` / `debug` | 同目录 | 统计、自升级、卸载、OpenAPI 生成、调试子命令 |
| （默认 TUI） | cli/cmd/tui/thread.ts + worker.ts | 见 [04-tui.md](04-tui.md) |
| `debug *` | cli/cmd/debug/* | agent/config/file/lsp/ripgrep/skill/snapshot 内部诊断工具 |

## 2. Server（HTTP API 层）

[server/server.ts](../packages/opencode/src/server/server.ts)：Hono 应用，全局中间件依次为错误处理（`NamedError` → 状态码映射）、可选 BasicAuth、请求日志、CORS 白名单。

- **OpenAPI**：hono-openapi 的 `describeRoute` + `validator`（Zod）+ `resolver` 声明每个端点；`opencode generate` 导出完整规范供 SDK 生成。
- **事件**：`/event` 端点用 `streamSSE` 推送 Bus 事件；PTY 走 WebSocket。
- **路由分组**（[server/routes/](../packages/opencode/src/server/routes/)）：

| 路由组 | 文件 | 职责 |
| --- | --- | --- |
| `/global` | global.ts | 全局事件、安装信息等 |
| `/auth/:providerID` | server.ts 内联 | 设置提供商凭据 |
| `/project` | project.ts | 项目列表/当前实例 |
| `/session/*` | session.ts | 会话 CRUD、消息、prompt、命令、revert、share、子会话等（最大路由组） |
| `/permission` | permission.ts | 权限回复（approve/deny） |
| `/question` | question.ts | 问答交互（Question 工具） |
| `/provider` | provider.ts | 提供商/模型列表、认证状态 |
| `/file` | file.ts | 文件读取/状态（含 LSP 诊断） |
| `/config` | config.ts | 配置读写 |
| `/mcp` | mcp.ts | MCP 服务器操作 |
| `/tui` | tui.ts | 供外部控制 TUI（打开对话框、提交 prompt、toast 等） |
| `/pty` | pty.ts | 终端会话创建/IO（配合桌面/Web 终端） |
| `/experimental` | experimental.ts | 实验性能力开关 |

辅助：[server/error.ts](../packages/opencode/src/server/error.ts)（标准化错误响应）、[server/event.ts](../packages/opencode/src/server/event.ts)（SSE 事件封装）、[server/mdns.ts](../packages/opencode/src/server/mdns.ts)（局域网发现）。

## 3. Session 模块

[session/](../packages/opencode/src/session/) —— 会话与消息循环：

| 文件 | 关键导出 | 说明 |
| --- | --- | --- |
| index.ts | `Session` | `Session.Info` schema、create/remove/list/fork/abort/update 等生命周期；子会话（parentID）由 Task 工具创建 |
| prompt.ts | `SessionPrompt` | 接收用户输入/命令 → 建消息 → 驱动 processor；处理自定义命令模板 |
| processor.ts | `SessionProcessor` | 主循环：反复 `LLM.stream()`，把 assistant 分片入库、执行工具调用，直到 stop 原因 |
| llm.ts | `LLM` | 组装模型实例、系统提示、工具集、provider transform，调用 AI SDK |
| message-v2.ts / message.ts | `MessageV2` | User/Assistant 消息与 Part（text/tool/reasoning/snapshot…）模型 |
| system.ts | `SystemPrompt` | 按提供商选择提示词文件并注入环境、AGENTS.md 规则、自定义 instructions |
| compaction.ts | `SessionCompaction` | 上下文压缩：阈值判断 + 总结 prompt（`agent/prompt/compaction.txt`） |
| revert.ts | `SessionRevert` | 结合 Snapshot 将文件恢复到指定消息前 |
| summary.ts / todo.ts / retry.ts / status.ts | — | 摘要、todo 清单存储、重试策略、状态事件 |
| instruction.ts | `Instruction` | 收集 AGENTS.md / 配置 instructions 文件内容 |
| prompt/*.txt | — | 各提供商系统提示模板（anthropic、codex、gemini、qwen、copilot-gpt-5、beast 等） |

## 4. Tool 模块（工具链）

[tool/](../packages/opencode/src/tool/)：

- **`Tool.define()`**（[tool.ts](../packages/opencode/src/tool/tool.ts)）：统一工具契约 —— id、`init(ctx) => { parameters(Zod), description, execute(args, ctx) }`，执行结果带 `title/output/metadata`，统一经 `Truncate.output` 截断超大输出（写入临时文件并在 metadata 标注）。
- **`ToolRegistry`**（[registry.ts](../packages/opencode/src/tool/registry.ts)）：
  - 从配置目录扫描自定义工具：`{tool,tools}/*.{js,ts}`（文件名即工具名，导出 `ToolDefinition`）；
  - 合并插件导出的 `plugin.tool`；
  - `tools(model, agent)` 按模型/agent 过滤并实例化最终工具集（如 `gpt-*` 用 `apply_patch` 替代 `edit/write`；`websearch/codesearch` 仅 Zen 提供商或 `OPENCODE_ENABLE_EXA` 时可用；实验开关控制 `lsp`、`batch`、`plan` 工具；`question` 仅 App/CLI/Desktop 客户端可用）。

内置工具一览（`*.txt` 为给模型的工具描述）：

| 工具 | 文件 | 说明 |
| --- | --- | --- |
| bash | bash.ts | 受权限控制的 shell 执行 |
| read / write / edit | read.ts / write.ts / edit.ts | 读文件（含图片）、写文件、精确字符串替换编辑 |
| apply_patch | apply_patch.ts | Codex 风格补丁编辑（GPT 系模型自动启用） |
| glob / grep / ls | glob.ts / grep.ts / ls.ts | 文件名/内容（ripgrep）/目录列举 |
| codesearch / websearch | codesearch.ts / websearch.ts | Exa 搜索（代码/网页） |
| webfetch | webfetch.ts | 抓取 URL → markdown（turndown） |
| task | task.ts | 生成子会话运行 subagent（general/explore 或自定义） |
| todowrite | todo.ts | 任务清单维护 |
| skill | skill.ts | 按需加载 SKILL.md 技能 |
| question | question.ts | 向用户提出选择题/确认 |
| lsp | lsp.ts | 实验性 LSP 查询（诊断/hover/定义等） |
| batch | batch.ts | 实验性并行工具批处理 |
| plan_enter / plan_exit | plan.ts | 实验性计划模式切换 |
| invalid | invalid.ts | 兜底：模型调用不存在工具时的占位 |

## 5. Agent 模块

[agent/agent.ts](../packages/opencode/src/agent/agent.ts)：

- **`Agent.Info` schema**：name、description、`mode: primary | subagent | all`、`permission`（PermissionNext 规则集）、可选 `model`、`temperature/topP`、`prompt`、`options`、`steps`（步数上限）、`hidden/color/variant`。
- **内置 Agent**：
  - `build`：默认主 agent，全能力，权限默认放行 + 用户配置叠加；
  - `plan`：只读规划模式，拒绝编辑类工具（仅允许写计划文件），`plan_exit` 后切回 build；
  - `general`：subagent，多步研究/并行任务（`@general`）；
  - `explore`：只读搜索型 subagent（grep/glob/list/bash/webfetch）。
- 用户自定义：`.opencode/agent/*.md`（frontmatter + 正文 prompt）与配置 `agent` 字段合并。
- 附带生成型提示词：`generate.txt`、`prompt/{compaction,explore,summary,title}.txt`。

## 6. Project / Instance / VCS

- [project/instance.ts](../packages/opencode/src/project/instance.ts)：`Instance.state(init, dispose?)` —— 全仓库核心状态原语；`Instance.directory`（运行目录）、`Instance.worktree`（git 根）。
- [project/project.ts](../packages/opencode/src/project/project.ts)：项目发现/注册（根提交 ID 为 projectID）。
- [project/state.ts](../packages/opencode/src/project/state.ts)：`App`/实例级状态辅助。
- [project/vcs.ts](../packages/opencode/src/project/vcs.ts)：git 查询（分支、状态）。
- [project/bootstrap.ts](../packages/opencode/src/project/bootstrap.ts)：实例启动引导（LSP 连接、watcher、忽略规则等）。

## 7. Config / Auth / Flag / Global / Env

- [config/config.ts](../packages/opencode/src/config/config.ts)：见架构文档第 6 节；[config/markdown.ts](../packages/opencode/src/config/markdown.ts) 解析 markdown（frontmatter）配置（agent/命令）。
- [auth/index.ts](../packages/opencode/src/auth/index.ts)：`Auth.Info`（api-key / oauth / wellknown），持久化到全局 data。
- [flag/flag.ts](../packages/opencode/src/flag/flag.ts)：全部 `OPENCODE_*` 环境变量开关集中定义（如 `OPENCODE_SERVER_PASSWORD`、`OPENCODE_ENABLE_EXA`、`OPENCODE_EXPERIMENTAL_*`、`OPENCODE_CLIENT`）。
- [global/index.ts](../packages/opencode/src/global/index.ts)：XDG 路径常量与目录初始化、缓存版本清理。
- [env/index.ts](../packages/opencode/src/env/index.ts)：运行环境探测。

## 8. 集成层

| 模块 | 文件 | 说明 |
| --- | --- | --- |
| LSP | [lsp/](../packages/opencode/src/lsp/)（client.ts / server.ts / language.ts / index.ts） | 按文件类型自动拉起 LSP 服务器（ts/py/go/rust…），维护诊断、hover、定义、符号；诊断通过 Bus 事件暴露给客户端与工具 |
| MCP | [mcp/](../packages/opencode/src/mcp/)（index.ts、auth.ts、oauth-*.ts） | 配置驱动的 MCP 客户端（本地 stdio / 远程 HTTP），远程服务器支持 OAuth 授权回调 |
| ACP | [acp/](../packages/opencode/src/acp/)（agent.ts / session.ts） | 基于 `@agentclientprotocol/sdk` 把 OpenCode 暴露为 ACP agent，供 Zed 等编辑器驱动（见 [acp/README.md](../packages/opencode/src/acp/README.md)） |
| Formatter | [format/](../packages/opencode/src/format/) | 编辑后自动格式化（可配置 formatter） |
| File | [file/](../packages/opencode/src/file/)（index.ts、watcher.ts、ripgrep.ts、ignore.ts、time.ts） | 文件读写/时间戳（防止基于过期内容编辑）、`@parcel/watcher` 监听、ripgrep 封装、gitignore 感知 |
| Snapshot | [snapshot/](../packages/opencode/src/snapshot/) | git 快照 + 文件 diff 计算（支撑 revert 与会话改动统计） |
| Share | [share/](../packages/opencode/src/share/)（share.ts、share-next.ts） | 会话公开分享（`session.share.url`，依赖 Zen 云端） |
| Shell | [shell/](../packages/opencode/src/shell/) | bash 工具的 shell 执行细节 |
| Pty | [pty/](../packages/opencode/src/pty/) | `bun-pty` 封装，供 `/pty` WebSocket 路由与终端组件使用 |
| Question | [question/](../packages/opencode/src/question/) | 用户问答交互状态机（question 工具背后的服务） |
| Scheduler | [scheduler/](../packages/opencode/src/scheduler/) | 延迟/周期任务调度 |
| IDE | [ide/](../packages/opencode/src/ide/) | IDE 集成辅助（如 VS Code 环境探测） |
| Worktree | [worktree/](../packages/opencode/src/worktree/) | git worktree 创建/管理（并行会话隔离） |
| Patch | [patch/](../packages/opencode/src/patch/) | patch 应用（apply_patch 工具底层） |
| Bun | [bun/](../packages/opencode/src/bun/)（index.ts、registry.ts） | `BunProc` 运行 `bunx`、`PackageRegistry` 解析 npm 包（插件安装用） |
| Id | [id/id.ts](../packages/opencode/src/id/id.ts) | 带前缀的 ULID（`ses_`、`msg_`、`part_` …） |
| Util | [util/](../packages/opencode/src/util/) | log（文件日志）、lock、lazy、queue、wildcard、timeout、abort、token、keybind、color、archive、proxied、rpc 等 |
| Installation | [installation/index.ts](../packages/opencode/src/installation/index.ts) | 版本/渠道（latest/preview/local）、升级检查（Bus 事件 `installation.update-available`） |

## 9. 插件加载

[plugin/index.ts](../packages/opencode/src/plugin/index.ts)：

- 来源：配置 `plugin: ["npm包名", "./local.ts"]`；npm 包经 `BunProc`/`PackageRegistry` 安装后动态 import。
- 内置插件：[plugin/codex.ts](../packages/opencode/src/plugin/codex.ts)（ChatGPT/Codex OAuth）、[plugin/copilot.ts](../packages/opencode/src/plugin/copilot.ts)（GitHub Copilot 设备码授权）——为对应提供商自动登录。
- 插件可导出 hooks（见 [05-clients.md](05-clients.md) 插件 API 一节）。

## 10. Skill 与 Command

- [skill/skill.ts](../packages/opencode/src/skill/skill.ts)：发现 skill 目录（全局/项目 `.opencode/skill/<name>/SKILL.md` 等），`skill` 工具按名称加载正文进上下文。
- [command/index.ts](../packages/opencode/src/command/index.ts)：markdown 模板注册会话命令（内置 `template/initialize.txt`、`template/review.txt`；用户放 `.opencode/command/*.md`），支持 `$ARGUMENTS`、`@文件` 占位。
