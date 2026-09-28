# Tech Codex

开发者技术知识库站点，基于 Next.js 16（App Router）+ React 19 + Tailwind CSS 4 构建。

`docs/` 下收录全站 Markdown 文档，按分类（前端 / 后端 / Java / Python / 测试 / 架构等）组织；`src/lib/docs-config.ts` 负责分类与目录映射，`src/lib/docs-reader.ts` 单遍扫描 `docs/` 生成索引并驱动首页、分类页、侧边栏与静态化路由。

## 本地开发

```bash
pnpm install
pnpm dev          # 启动开发服务器，端口 4200
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

- `docs/`：全站 Markdown 文档与更新记录
- `src/app`：页面路由（首页、`/docs/[category]` 分类页、`/docs/[category]/[...slug]` 文档详情页）
- `src/lib`：文档扫描/索引、TOC 提取、VitePress 容器解析等
- `src/components`：导航、侧边栏、目录、代码卡片、HTML/Vue/Mermaid 预览等 UI
- `public/`：静态资源与各课程图片、`vue.esm-browser.js`（Vue 预览运行时）
