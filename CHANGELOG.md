# Changelog

本仓库自 katelya77/KatelyaTV 分叉后针对 Cloudflare 部署链路完全重构。以下仅记录本仓库自身的变更。

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
