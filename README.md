<div align="center">

# KatelyaTV CF

**基于 Cloudflare Pages + D1 的影视聚合播放器 · 重构版**

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Cloudflare D1](https://img.shields.io/badge/Cloudflare-D1-F38020?logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/d1/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

基于 [katelya77/KatelyaTV](https://github.com/katelya77/KatelyaTV)（MoonTV / LunaTV 系）二次开发，
**针对 Cloudflare 部署链路完全重构**：修复上游在 Workers 运行时无法部署的核心缺陷，
内置 54 个经存活实测的采集源（34 常规 + 20 成人），开箱即用。

</div>

---

## 特性

- **聚合搜索**：一次请求并发检索全部采集源，常规/成人结果分组展示
- **秒开播放**：ArtPlayer + HLS，自动优选测速、多源一键切换
- **观影体验**：断点续播、自动跳过片头片尾、画中画、网页全屏
- **数据同步**：收藏、播放记录、搜索历史基于 D1 跨设备同步
- **多用户**：站长（环境变量鉴权）+ 注册用户体系，角色区分 owner/user
- **成人内容分级**：`is_adult` 站点级标记 + 用户级过滤开关（默认开启）
- **TVBox 兼容**：`/tvbox` 输出 JSON / TXT / XML 订阅，配合 OrionTV 上电视
- **图片代理**：内置 `/api/image-proxy` 边缘代理，破解豆瓣防盗链，边缘缓存半年
- **PWA**：可安装到桌面/主屏，离线壳缓存

## 架构

```
Next.js 14 (App Router, TypeScript, Tailwind)
        │  @cloudflare/next-on-pages
        ▼
Cloudflare Pages Functions  ←─ nodejs_compat v2 (compatibility_date ≥ 2024-09-23)
        │
        ├── D1 (SQLite)        用户 / 收藏 / 播放记录 / 搜索历史 / 跳过配置 / 站点配置
        ├── /api/image-proxy   图片边缘代理
        └── Pages CDN          静态资源 + 边缘缓存
```

## 快速部署

### 前置要求

| 工具 | 版本 |
|---|---|
| Node.js | ≥ 18.12（推荐 20+） |
| pnpm | 10.x（corepack 会按 `packageManager` 字段自动对齐） |
| wrangler | 4.x |

### 1. 获取代码并安装依赖

```bash
git clone https://github.com/wooxi/KatelyaTV-CF.git
cd KatelyaTV-CF
pnpm install --frozen-lockfile
```

### 2. 登录 Cloudflare 并创建 D1

```bash
wrangler login
wrangler d1 create katelyatv-db
wrangler d1 execute katelyatv-db --remote --file=./scripts/d1-init.sql -y
```

将上一步输出的 `database_id` 填入 `wrangler.toml` 的 **三处** `d1_databases` 配置中。

### 3. 配置站点凭据（Pages Secrets）

```bash
wrangler pages project create katelyatv --production-branch main   # 首次部署前
echo 'admin'              | wrangler pages secret put USERNAME --project-name katelyatv
echo '<你的强密码>'        | wrangler pages secret put AUTH_PASSWORD --project-name katelyatv
```

> ⚠️ 不要使用 `PASSWORD` 作为变量名，它是 Cloudflare 保留绑定名（上游已知的坑）。

### 4. 构建与部署

```bash
export NEXT_PUBLIC_STORAGE_TYPE=d1
export NEXT_PUBLIC_SITE_NAME=KatelyaTV
export NEXT_PUBLIC_IMAGE_PROXY='/api/image-proxy?url='
export NEXTAUTH_URL='https://<你的-pages-子域>.pages.dev'

pnpm run pages:build          # 末尾会自动执行 Node 兼容性补丁（fix-worker-imports.js）
wrangler pages deploy .vercel/output/static --project-name katelyatv --branch main
```

### 5.（可选）GitHub Actions 自动部署

在仓库 Settings → Secrets 中配置：

| Secret | 说明 |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 需要 `Pages: Edit`、`D1: Edit` 权限 |
| `CLOUDFLARE_ACCOUNT_ID` | 账户 ID |

推送 `main` 即自动构建部署（见 [.github/workflows/deploy.yml](.github/workflows/deploy.yml)）。

## 环境变量

| 变量 | 生效阶段 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_STORAGE_TYPE` | 构建 | 存储后端，固定 `d1` |
| `NEXT_PUBLIC_IMAGE_PROXY` | 构建 + 运行 | 图片代理前缀，默认 `/api/image-proxy?url=` |
| `NEXT_PUBLIC_SITE_NAME` | 构建 | 站点名称 |
| `NEXT_PUBLIC_ENABLE_REGISTER` | 构建 | 是否开放注册（`true`/`false`） |
| `NEXTAUTH_URL` | 构建 + 运行 | 站点完整 URL |
| `USERNAME` | 运行（Secret） | 站长用户名 |
| `AUTH_PASSWORD` | 运行（Secret） | 站长密码 / 签名密钥 |

## 视频源配置

编辑 [`config.json`](config.json)（构建时经 `gen:runtime` 编译进产物）：

```json
{
  "cache_time": 7200,
  "api_site": {
    "dyttzyapi": {
      "api": "https://caiji.dyttzyapi.com/api.php/provide/vod",
      "name": "TV-电影天堂资源",
      "is_adult": false
    }
  }
}
```

- `api`：苹果 CMS v10 采集接口（`api.php/provide/vod`）
- `is_adult`：`true` 的源会被用户级成人过滤隔离到独立分组
- 改动源后需重新构建部署；站点级源清单以 **D1 `main_config` ∪ 文件新增项** 合并语义生效
- 本仓库自带 54 个源均为 2026-09 实测存活，源站失效属常态，按上述步骤增删即可

## 相对上游的修复

| # | 问题 | 根因 | 修复 |
|---|---|---|---|
| 1 | 部署后全站 500 | next-on-pages 产物含裸 `async_hooks` 导入，Workers 无法解析；且 `compatibility_date` 低于 nodejs_compat v2 门槛 | 新增构建后处理 `scripts/fix-worker-imports.js`（裸内置模块重写为 `node:` 前缀）；`compatibility_date` 提升至 `2025-04-01`；升级 `@cloudflare/next-on-pages` 1.13.16 |
| 2 | 图片代理不生效、豆瓣海报裂图 | `wrangler.toml` 配置了错误的变量名 `IMAGE_PROXY_ENABLED`，代码实际读取 `NEXT_PUBLIC_IMAGE_PROXY` | 变量名修正，三处 `[vars]` 块统一 |
| 3 | 无 Cookie 客户端（OrionTV 等）图片失败 | middleware 未放行 `/api/image-proxy` | 加入 `shouldSkipAuth` 白名单 |
| 4 | 设置页报「获取用户设置失败」 | `d1-init.sql` 的 `user_settings` 表结构与运行时代码（JSON 列 `settings`）不一致，查询报 no such column | 表结构按运行时代码重建，初始化脚本同步修正 |
| 5 | 站长账号保存设置报「用户不存在」 | 环境变量登录的站长不会写入 `users` 表，而设置写入强制查表 | `user/settings` 路由对 `process.env.USERNAME` 豁免存在性检查 |
| 6 | 内置采集源全部失效 | 上游随仓库的 5 个源域名已停摆 | 全量替换为实测存活的 54 个源，剔除全部死链 |

## 目录结构

```
├── config.json                 # 采集源配置（构建时编译）
├── wrangler.toml               # Cloudflare Pages / D1 绑定与环境变量
├── scripts/
│   ├── d1-init.sql             # D1 初始化（7 张表，与运行时代码严格一致）
│   ├── fix-worker-imports.js   # 构建后处理：Node 内置模块导入补丁
│   ├── convert-config.js       # config.json → src/lib/runtime.ts
│   └── generate-manifest.js    # PWA manifest 生成
├── src/
│   ├── app/                    # 页面与 API 路由（Edge Runtime）
│   ├── components/             # 播放器 / 设置 / 过滤器等组件
│   ├── lib/                    # 存储（D1）、鉴权、配置合并、工具
│   └── middleware.ts           # 认证中间件（含放行白名单）
└── .github/workflows/deploy.yml
```

## 常见问题

<details>
<summary>部署后全站 500 怎么排查？</summary>

执行 `wrangler pages deployment tail <deployment-id> --project-name katelyatv --format pretty` 后访问站点，
若出现 `No such module "__next-on-pages-dist__/.../async_hooks"`，说明构建后处理未执行——
请确认使用本仓库的 `pnpm run pages:build`（其中已串联 `fix-worker-imports.js`）。
</details>

<details>
<summary>绑定 D1 后接口仍报错？</summary>

`wrangler.toml` 必须保留 `pages_build_output_dir` 字段，`wrangler pages deploy` 才会把 `[[d1_databases]]`
绑定（binding 为 `DB`）一并提交。用 `wrangler d1 list` 核对 `database_id` 是否为本账号资源。
</details>

<details>
<summary>换个采集源要重新部署吗？</summary>

是。`config.json` 在构建时编译进产物；运行时新增的源优先走 `/admin` 后台，改文件的方式适合批量维护。
</details>

<details>
<summary>为什么搜索不到成人内容？</summary>

用户级「成人内容过滤」默认开启（`/settings` 可关）。开启时 `is_adult` 源不参与常规结果；关闭后以独立分组展示。
</details>

## 致谢

- [MoonTV](https://github.com/MoonTechLab/LunaTV) / [LunaTV](https://github.com/sjnhnp/LunaTV) — 原始项目
- [katelya77/KatelyaTV](https://github.com/katelya77/KatelyaTV) — 二次开发上游
- [senshinya/MoonTVplus](https://github.com/senshinya/MoonTVplus)、[OrionTV](https://github.com/zimplexing/OrionTV) — 生态参考

## 免责声明

本项目仅供个人学习与研究使用，不存储、不分发任何视频资源，所有内容均来自第三方公开站点。
使用者需自行承担使用行为的法律责任，请勿将部署实例公开传播。影视信息数据来源：豆瓣。

## License

[MIT](./LICENSE)
