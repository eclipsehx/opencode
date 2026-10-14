# 08 构建与运行

## 1. 环境要求

- **必须**：Bun 1.3+（仓库锁定 1.3.5）。
- 可选：Rust 工具链 + Tauri 前置依赖（仅桌面端）、ripgrep（核心运行时搜索）、Docker（镜像）、SST/Cloudflare 凭据（仅部署云栈）。

## 2. 常用命令速查

| 场景 | 命令（仓库根目录执行） | 说明 |
| --- | --- | --- |
| 安装依赖 | `bun install` | 全 workspace 安装 |
| 开发 TUI/CLI | `bun dev` | 等价于生产 `opencode` 命令（`--conditions=browser`） |
| 指定目录运行 | `bun dev <目录>` / `bun dev .` | 在目标目录/仓库根打开会话 |
| 无头服务器 | `bun dev serve`（`--port 8080`） | 默认端口 4096 |
| 服务器 + Web | `bun dev web` | |
| Web 前端开发 | `bun run --cwd packages/app dev` | http://localhost:5173，需先 `bun dev serve` |
| 桌面端开发 | `bun run --cwd packages/desktop tauri dev` | http://localhost:1420 + 原生窗口；仅 Web 壳用 `bun run --cwd packages/desktop dev` |
| 桌面端构建 | `bun run --cwd packages/desktop tauri build` | 自动执行前端 build |
| 类型检查 | `bun turbo typecheck` | Turborepo 编排全部包（核心用 `tsgo --noEmit`） |
| 核心单测 | `cd packages/opencode && bun test` | 单文件：`bun test test/tool/tool.test.ts` |
| App e2e | `bun turbo run test --filter=@opencode-ai/app` | Playwright（依赖 `^build`） |
| 构建可执行文件 | `./packages/opencode/script/build.ts --single` | 产物 `packages/opencode/dist/opencode-<platform>/bin/opencode`（"localcode"） |
| 重新生成 SDK | `./script/generate.ts` | **改服务器 API 后必须执行**；亦可 `./packages/sdk/js/script/build.ts` |
| 容器镜像 | `bun run --cwd packages/containers build` | [containers/script/build.ts](../packages/containers/script/build.ts) |

> 根目录 `bun test` 被故意禁用（提示 "do not run tests from root"），测试需进入对应包执行。

## 3. 开发约定（摘要自 AGENTS.md / CONTRIBUTING.md）

- **代码风格**：优先 `const`、避免 `else`（早返回）、避免 `try/catch`（用 `.catch()`）、避免 `any`、单一词命名、点号取值而非解构、优先 Bun API（`Bun.file()`）、Drizzle 字段 snake_case。
- **架构模式**：命名空间模块（`Tool.define()` / `Session.create()`）；Zod 校验一切输入；`Log.create({ service })` 日志；`Storage` 持久化；`Instance.state` 实例状态。
- **测试**：尽量不用 mock，直接测真实实现。
- **Git**：默认分支 `dev`；Conventional Commits（`feat/fix/docs/chore/refactor/test` + 可选 scope）；所有 PR 必须关联 issue；UI 改动附截图；pre-push 钩子做校验。

## 4. 调试

```bash
# 方式一：inspect 启动后附加调试器
bun run --inspect=ws://localhost:6499/ --cwd packages/opencode ./src/index.ts serve --port 4096
opencode attach http://localhost:4096   # 另一终端接 TUI

# TUI 调试
bun run --inspect=ws://localhost:6499/ --cwd packages/opencode --conditions=browser ./src/index.ts

# 若断点不生效，用 bun dev spawn 让服务器脱离 worker 线程
bun dev spawn
```

- `export BUN_OPTIONS=--inspect=ws://localhost:6499/` 可免每次敲参数；VSCode 配置模板见 `.vscode/settings.example.json`、`.vscode/launch.example.json`。
- 日志写入 `~/.local/share/opencode/log/`，CLI 加 `--print-logs --log-level DEBUG` 直接输出。

## 5. SDK 再生成流程（API 变更必做）

1. 修改 `packages/opencode/src/server/server.ts` 或 `server/routes/*`（Zod schema 即文档）。
2. 运行 `./script/generate.ts`：内部执行 `bun dev generate` 导出 OpenAPI → `packages/sdk/openapi.json` → `@hey-api/openapi-ts` 重建 `src/v2/gen` → 编译。
3. 客户端按新 SDK 类型修调用点；CI 的 `generate.yml` 会校验生成物未漂移。

## 6. 发布与版本

- 版本号在 [packages/opencode/package.json](../packages/opencode/package.json)（当前 1.1.51），脚本 `script/version.ts` / `script/changelog.ts` / `script/publish.ts`（根 [script/](../script/)）驱动 npm 发布（`opencode-ai`，latest/preview 渠道）、桌面产物、GitHub Release。
- 安装脚本 `install`（curl | bash）支持 `OPENCODE_INSTALL_DIR`/`XDG_BIN_DIR` 自定义路径。
- Nix 打包：`flake.nix` + `nix/opencode.nix`、`nix/desktop.nix`，哈希由 `nix-hashes.yml` 维护（[nix/hashes.json](../nix/hashes.json)）。
- 桌面应用发布走 `.github/workflows/publish.yml` + `containers.yml`（tauri-linux 镜像内构建）。

## 7. CI 流水线一览（.github/workflows）

| Workflow | 触发/作用 |
| --- | --- |
| test.yml / typecheck.yml | PR 门禁：测试 + 类型检查 |
| generate.yml | 校验 SDK/生成物与服务器规范一致 |
| publish.yml / beta.yml | 正式/预览渠道发布 |
| deploy.yml | SST 部署网站与云栈 |
| containers.yml | Docker 镜像构建发布 |
| publish-vscode.yml / publish-github-action.yml / release-github-action.yml | VS Code 扩展与 GitHub Action 发布 |
| docs-update.yml | 文档站同步 |
| review.yml / opencode.yml / triage.yml / pr-management.yml / duplicate-issues.yml / close-stale-prs.yml / stale-issues.yml | AI 审查、issue 分诊、重复/过期管理 |
| stats.yml | 生成 STATS.md 统计 |
| nix-hashes.yml | Nix 哈希更新 |
| sync-zed-extension.yml | 同步 Zed 扩展 |

## 8. 新人上手路径建议

1. `bun install && bun dev .` 在本仓库根体验 TUI。
2. 读 [02-architecture.md](02-architecture.md) + [03-core-opencode.md](03-core-opencode.md) 理解 server/session/tool 三层。
3. 从 `debug` 子命令（`bun dev debug config/lsp/snapshot`）观察内部状态。
4. 改一个 server 路由 → `./script/generate.ts` → 在 TUI/App 验证 → 补 `bun test` 用例 → 按规范提 PR。
