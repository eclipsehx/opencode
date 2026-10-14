# 06 云平台与基础设施（Console / Zen / SST）

OpenCode 的商业面（模型网关 **opencode Zen**、订阅 **OpenCode Black**、会话分享、控制台）由 `packages/console` + `infra/` 提供，全部部署在 **Cloudflare** 生态（SST v3 编排，`sst.config.ts` 中 `home: "cloudflare"`）。

## 1. 域名与 Stage

[infra/stage.ts](../infra/stage.ts)：生产 `opencode.ai`，开发 `dev.opencode.ai`，短域名 `opncd.ai`（分享链接等）。

## 2. SST Stacks

| 文件 | 内容 |
| --- | --- |
| [sst.config.ts](../sst.config.ts) | SST 应用入口，加载 app/console/enterprise 栈 |
| [infra/app.ts](../infra/app.ts) | 主平台栈：API Worker（function）、Astro 文档站（web）、静态 WebApp；Cloudflare Bucket、Secrets、Durable Object、Worker 迁移配置 |
| [infra/console.ts](../infra/console.ts) | 控制台栈：**PlanetScale 数据库**、Cloudflare **KV**（openauth 认证存储，绑定 `auth.<domain>`）、**Stripe** 产品/价格（Black 订阅）、`ZEN_MODELS1..10` 模型清单 Secrets、Gateway KV |
| [infra/enterprise.ts](../infra/enterprise.ts) | 企业栈：**R2** 存储适配器 + 部署 `packages/enterprise` |
| [infra/secret.ts](../infra/secret.ts) / [infra/console.ts](../infra/console.ts) | 敏感配置注入 |

## 3. packages/console/core（云数据模型与业务）

- **ORM**：Drizzle，迁移位于 [migrations/](../packages/console/core/migrations/)（56 个 SQL 迁移），配置 [drizzle.config.ts](../packages/console/core/drizzle.config.ts)。
- **模块**（[src/](../packages/console/core/src/)）：

| 模块 | 职责 |
| --- | --- |
| [model.ts](../packages/console/core/src/model.ts) | Zen 模型目录：从 `Resource.ZEN_MODELS1..10` 合并解析 provider/model 列表（模型网关的目录源） |
| [black.ts](../packages/console/core/src/black.ts) | OpenCode Black 订阅：从 `ZEN_BLACK_LIMITS` / `ZEN_BLACK_PRICE` 解析套餐、价格、限额 |
| [billing.ts](../packages/console/core/src/billing.ts) | 计费/Stripe 集成 |
| [account.ts](../packages/console/core/src/account.ts) / [user.ts](../packages/console/core/src/user.ts) | 账号与用户 |
| [workspace.ts](../packages/console/core/src/workspace.ts) | 工作区（多人协作单元） |
| [key.ts](../packages/console/core/src/key.ts) | Zen API Key 管理 |
| [provider.ts](../packages/console/core/src/provider.ts) | 云端 provider 配置 |
| [actor.ts](../packages/console/core/src/actor.ts) / [context.ts](../packages/console/core/src/context.ts) | 请求身份与上下文（openauth 会话） |
| [aws.ts](../packages/console/core/src/aws.ts) / [identifier.ts](../packages/console/core/src/identifier.ts) | 基础辅助 |

- **管理脚本**（[script/](../packages/console/core/script/)）：`update-models.ts`（拉取/更新模型目录）、`pull-models.ts`、`promote-models.ts`、`promote-black.ts` / `update-black.ts` / `black-*.ts`（Black 运营）、`credit-workspace.ts`（发放额度）、`lookup-user.ts`、`reset-db.ts`。

## 4. Console 其余子包

| 子包 | 说明 |
| --- | --- |
| [console/function](../packages/console/function) | 控制台 API Worker（部署为 Cloudflare Worker，SST 绑定数据库/KV/Stripe） |
| [console/app](../packages/console/app) | 控制台前端（Vite 应用，管理工作区/Key/订阅） |
| [console/mail](../packages/console/mail) | 事务邮件模板（[emails/](../packages/console/mail/emails/) components + styles） |
| [console/resource](../packages/console/resource) | `Resource` 绑定层：[resource.cloudflare.ts](../packages/console/resource/resource.cloudflare.ts)（Worker 侧：R2/KV/Secrets）/ [resource.node.ts](../packages/console/resource/resource.node.ts)（Node 侧），核心包通过 `Resource.ZEN_MODELS1` 等访问注入值 |

## 5. Zen 与核心包的关系

- 核心包中 `providerID === "opencode"` 即 Zen 网关：`tool/registry.ts` 对该提供商开放 `websearch/codesearch`（Exa）工具；`provider/provider.ts` 将其映射到 Vercel AI Gateway/自建网关。
- Zen 用户的 API Key 存于核心包全局 `auth.json`（`Auth` 模块，type `wellknown` 时还会触发远端 `.well-known/opencode` 配置拉取）。
- 会话分享（`session/share/`）把会话快照发布到云端，生成短链（`opncd.ai`）。

## 6. CI/CD 中的云相关流水线

| Workflow | 说明 |
| --- | --- |
| deploy.yml | SST 部署（`bun sst deploy`，按 stage） |
| publish.yml / beta.yml | npm 发布（`opencode-ai` latest/preview 渠道） |
| containers.yml | 构建发布 Docker 镜像 |
| publish-vscode.yml / publish-github-action.yml / release-github-action.yml | 编辑器扩展与 Action 发布 |
| nix-hashes.yml | 维护 Nix 打包哈希 |
| docs-update.yml | 文档站更新 |
| generate.yml | 校验/更新生成物（SDK、schema） |
| stats.yml | 仓库统计（STATS.md） |
| review.yml / opencode.yml / triage.yml / pr-management.yml | AI 辅助的 PR 审查与 issue 分诊（用 OpenCode 自身） |
| test.yml / typecheck.yml | 测试与类型检查门禁 |

## 7. 本地开发注意

云栈通常无需本地运行；贡献核心功能时 Zen 相关能力（websearch/codesearch、分享）可经环境开关绕过（`OPENCODE_ENABLE_EXA`、`OPENCODE_DISABLE_SHARE`，后者已登记在 `turbo.json` 的 `globalEnv`）。
