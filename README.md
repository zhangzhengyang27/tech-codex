# Tech Codex

开发者技术知识库站点，基于 Next.js 16（App Router）+ React 19 + Tailwind CSS 4 构建。

内容源已切换为「MySQL 唯一真相」：Spring Boot 通过 `/content/index`、`/content/doc`、`/content/category` 提供只读内容，`src/lib/docs-config.ts` 负责分类 slug/目录映射，`src/lib/docs-reader.ts` 从公开 API 拉取索引与正文，驱动首页、分类页、侧边栏、sitemap、RSS 与 llms。`docs/` 已从仓库移除；历史文章里的相对图片迁移到 `public/docs-assets/`，由 `src/lib/doc-asset-url.ts` 在渲染时改写为站内静态地址。

## 本地开发

```bash
pnpm install
pnpm dev          # 启动开发服务器，端口 4200（需后端 /content API 可用）
```

打开 http://localhost:4200 查看。

## 常用命令

```bash
pnpm dev          # 开发（端口 4200）
pnpm build        # 生产构建
pnpm start        # 启动生产服务器
pnpm typecheck    # TypeScript 类型检查
pnpm lint         # ESLint 检查
```

## 目录结构

- `docs/`：已移除；历史 Markdown 只保留在数据库，导入源备份在仓库外的 `backups/`
- `public/docs-assets/`：从历史 `docs/` 迁移出来的正文相对图片（按原目录结构存放）
- `src/app`：页面路由（首页、`/docs/[category]` 分类页、`/docs/[category]/[...slug]` 文档详情页）
- `src/lib/doc-asset-url.ts`：把正文相对图片映射到 `/docs-assets/**`
- `src/lib`：内容 API 客户端与索引缓存、TOC 提取、VitePress 容器解析等
- `src/components`：导航、侧边栏、目录、代码卡片、HTML/Vue/Mermaid 预览等 UI
- `public/`：静态资源与各课程图片、`vue.esm-browser.js`（Vue 预览运行时）
