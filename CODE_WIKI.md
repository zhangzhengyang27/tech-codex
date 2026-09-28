# Tech Codex 代码导览

> 2026-09-28 重写。旧版(2026-08-12)描述的 zustand/store、`scripts/*.cjs`、旧目录路径均已失效,
> 如需查阅历史版本请翻 git 记录。

开发者技术知识库站点:文档浏览 + RAG 智能问答 + 个人知识库 + 管理后台。
后端为同级 `rag-backend`(Spring Boot + LangChain4j),见其 README/DEPLOY。

## 技术栈

Next.js 16(App Router)· React 19 · Tailwind CSS 4 · TypeScript,包管理 pnpm(无 UI 库/无全局状态库)。
端口 4200;常用命令 `pnpm dev / build / typecheck / lint / test`(vitest,`src/lib` 纯函数单测)。

## 目录结构

```
docs/                    # 全站 Markdown 语料(约 4000 篇,12 个编号分类),SSR/SSG 直接读文件系统
redirects/               # 2026-09 文档重组的 904 条文件级重定向(启动时载入,见下)
src/app/                 # 路由(见下表)
src/lib/                 # 三层:内容层 / KB 客户端层 / hooks(见下)
src/components/          # 按 ui / docs / ai / kb / admin / home 分域
public/                  # 静态资源;vue.esm-browser.js 为本地化的 Vue SFC 预览运行时
```

## 路由地图

| 路由 | 渲染 | 说明 |
|---|---|---|
| `/` | 客户端为主 | 分组卡片导航、双模式搜索(本地标题过滤 / 智能搜索调后端混合检索)、git 驱动的最近更新 |
| `/docs/[category]` | SSG | 分类落地页(`generateStaticParams`),带侧边栏 |
| `/docs/[category]/[...slug]` | SSR | 文档详情:TOC、Shiki 懒高亮、Mermaid、VitePress 容器、代码卡片(HTML/Vue 预览)、相关文档、「问这篇文档」内嵌 RAG 面板(`components/docs/doc-ask`) |
| `/ai` | 客户端 | RAG 对话主页:SSE 流式问答、会话管理、点赞反馈、检索范围切换、来源溯源(经 doc-url 反查站内链接) |
| `/login` | 客户端 | 登录/注册二合一,open-redirect 防护(`safeFrom`) |
| `/my/kb*` | 客户端 | 个人知识库:配额、文档列表、拖拽上传 |
| `/admin*` | 客户端 | 管理后台 10 页:仪表盘/文档/traces/config/quotas/usage/feedback/audit/users/eval |
| `/api/docs/url` | Route Handler | docPath → 站内 URL 反查(全站唯一 API Route) |

## src/lib 三层

- **内容层**(不依赖后端):`docs-reader.ts` 单遍扫描 `docs/` 建索引(驱动首页/分类/侧边栏/路由);
  `docs-config.ts` 静态定义 17 组 68 分类(25 个 hidden 仅作侧边栏);`toc.ts` 提取目录(id 与
  rehype-slug 同规则);`remark-vitepress-containers.ts` / `remark-doc-links.ts` 自定义 remark 插件;
  `shiki-highlighter.ts` 懒高亮;`recent-updates.ts` 用 `git log -- docs/` 生成最近更新(**依赖 git 仓库**)。
- **KB 客户端层**(代理后端):`auth/kb/documents/users/config/ops/audit/usage/traces.ts` 全部以相对路径
  `fetch` `/kb-auth|/kb-api|/kb-admin/**`;`paged.ts` 通用分页;`format.ts` 展示格式化;`doc-url.ts` 纯函数反查。
- **hooks**:`use-hydrated.ts`(SSR 水合安全)、`use-paged-list.ts`(分页加载通用状态)。

## 与后端的契约(重要)

`next.config.ts` 的 `rewrites()` 把 `/kb-auth/:path*` `/kb-api/:path*` `/kb-admin/:path*`
代理到 `KB_BACKEND_ORIGIN`(默认 `http://localhost:8081`)。

**rewrites 在 `next build` 时烘焙进 routes-manifest,运行期改环境变量无效**——
Docker 构建镜像时必须注入 `KB_BACKEND_ORIGIN=http://rag-backend:8081`(见 Dockerfile 注释)。

鉴权:JWT 存 localStorage(`techcodex_token`),`AuthContext` 提供登录态;admin 判定是纯客户端
UI 展示逻辑,真正的权限由后端 `/admin/**` 强制(无 middleware.ts)。

## 重定向体系

`next.config.ts` 启动时读入 `redirects/file-renumber-*.json`(904 条)+ 内联表(2026-09 大重组遗留),
全部 `permanent: true` 保旧链路/SEO。**新增重定向请一律放 JSON 文件**,不要再往 next.config.ts 内联
(该文件已超 185KB,是历史债务)。

## 已知边界 / 待办

- SEO:仅根 layout 一条静态 metadata;详情页无 `generateMetadata`,无 sitemap/robots/RSS(计划中)。
- 暗色模式:样式变量已预留,未开放切换。
- Vue SFC 预览:运行时已本地化,编译器仍依赖 esm.sh CDN,离线不可用。
- 无 i18n;`lang="zh-CN"` 单语。
- 测试覆盖:`src/lib` 纯函数已有 vitest 单测;组件级测试未引入。
