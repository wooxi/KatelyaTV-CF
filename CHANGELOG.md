# Changelog

本仓库自 katelya77/KatelyaTV 分叉后针对 Cloudflare 部署链路完全重构。以下仅记录本仓库自身的变更。

## [1.1.1] - 2026-09-06

### 修复

- **站点配置支持后台编辑**：解除 `/admin` 站点配置在 D1 / Upstash 模式下的整体禁用；站点名称、公告、图片代理、豆瓣代理保存至存储后端即时生效，环境变量降级为初始回退值。
- **站点公告去除上游推广尾巴**（`Link Me TG：@katelya77`）：默认文案清理，且公告改为后台可编辑。

### 变更

- 移除 GitHub Actions 部署工作流：Cloudflare Git 集成已在推送时自动构建部署，双流水线冗余且需额外维护 API Token secrets。

## [1.1.0] - 2026-09-06

### 变更

- **源配置与代码分离**：仓库 `config.json` 的 `api_site` 置空，运行时源清单存于 D1 `main_config`，通过 `/admin` 后台上传或 D1 直写维护；公开仓库不再携带任何影视源。
- **敏感凭据全部迁移至 Cloudflare Dashboard 环境变量**（`USERNAME` / `AUTH_PASSWORD` 以 Secret 类型添加），代码与 CI 中零凭据。
- README 同步更新：新增「导入视频源」步骤、Git 集成自动部署指引（构建设置与 Dashboard 变量清单）、源管理语义说明。

## [1.0.0] - 2026-09-06

### 修复（相对上游）

- **修复 Cloudflare Pages 部署后全站 500**：`@cloudflare/next-on-pages` 产物将 Node 内置模块编译为裸标识符（如 `import "async_hooks"`），Workers 运行时无法解析。新增构建后处理脚本 `scripts/fix-worker-imports.js` 统一重写为 `node:` 前缀，并串联进 `pages:build`；`compatibility_date` 提升至 `2025-04-01` 以启用 nodejs_compat v2；`@cloudflare/next-on-pages` 升级至 1.13.16。
- **修复图片代理不生效（豆瓣海报裂图）**：`wrangler.toml` 使用了错误变量名 `IMAGE_PROXY_ENABLED`，代码实际读取 `NEXT_PUBLIC_IMAGE_PROXY`，已统一修正并注入构建环境。
- **修复无 Cookie 客户端图片加载失败**：middleware 放行白名单加入 `/api/image-proxy`。
- **修复设置页「获取用户设置失败」**：`scripts/d1-init.sql` 的 `user_settings` 表结构与运行时代码不一致（缺 `settings` JSON 列），按运行时代码重建表结构并修正初始化脚本。
- **修复站长账号保存设置报「用户不存在」**：`/api/user/settings` 的 PATCH/PUT 对 `process.env.USERNAME` 豁免 users 表存在性检查（与登录鉴权语义对齐）。
- **替换全部失效采集源**：上游自带 5 个源域名已停摆，替换为 54 个实测存活源（34 常规 + 20 成人，`is_adult` 正确标记）。

### 变更

- 移除 Docker / Kvrocks 部署链路及其文档，聚焦 Cloudflare Pages + D1 单一形态。
- 新增 GitHub Actions 自动部署工作流（`CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` secrets 触发）。
- 重写 README 与配置文档。
