# Tech Codex · Code Wiki

> 本文档是对 `tech-codex` 仓库的结构化代码导览，覆盖项目整体架构、主要模块职责、关键类与函数、依赖关系与运行方式。

---

## 一、项目概览

### 1.1 项目定位

`tech-codex` 是一个基于 **Next.js 16 (App Router)** 构建的开发者技术知识库站点。它将仓库 `docs/` 目录下的海量 Markdown 笔记（涵盖前端、Java、Python、数据库、分布式、DevOps、安全、AI 等技术方向）渲染为一个可浏览、可搜索、可交互运行的文档网站。

项目本身**不存储知识内容**，知识内容全部以 Markdown 文件形式存放在 `docs/` 目录；项目代码负责"读取 → 解析 → 渲染 → 交互"这一条流水线。

### 1.2 核心特性

| 特性 | 实现 |
| --- | --- |
| 配置驱动的目录映射 | `src/lib/docs-config.ts` 将 URL slug 映射到 `docs/` 子目录 |
| 文件系统读取 + Frontmatter 解析 | `gray-matter` 提取标题等元数据 |
| Markdown 增强渲染 | `react-markdown` + `remark-gfm` + `rehype-pretty-code` (Shiki) + `rehype-slug` |
| VitePress 容器语法兼容 | 自定义 remark 插件 `remarkVitepressContainers` 支持 `::: tip / warning / danger` 等 |
| 代码块交互 | 复制、JS 即时运行（`new Function`）、HTML/Vue SFC iframe 预览 |
| Mermaid 图表渲染 | `mermaid` v11 客户端渲染，失败回退源码 |
| 代码组（Tabs） | `::: code-group` 标签页切换，Shiki 单例懒加载高亮 |
| 全站索引首页 | 文档统计 + 分组卡片 + 搜索过滤 + 最近更新流 |
| 文档侧边栏与目录 | 嵌套章节树 + IntersectionObserver 高亮当前标题 |
| 旧链接迁移 | `next.config.ts` 内置数百条永久重定向，承接目录重组 |

### 1.3 技术栈

- **框架**：Next.js 16.2.12（App Router、RSC、Server Components）
- **UI**：React 19.2.4 + Tailwind CSS v4（`@tailwindcss/postcss`）
- **状态**：zustand 5（轻量全局 store）
- **图标**：lucide-react
- **Markdown 工具链**：`react-markdown`、`remark-gfm`、`rehype-pretty-code`、`rehype-slug`、`shiki`、`gray-matter`、`highlight.js`
- **图表**：`mermaid` 11
- **类型系统**：TypeScript 5（`strict: true`）
- **包管理**：pnpm（`pnpm-workspace.yaml` 仅用于忽略 `sharp` / `unrs-resolver` 构建依赖）
- **测试工具**：playwright（已声明为 devDependency，仓库内未发现测试用例）

---

## 二、项目整体架构

### 2.1 分层架构图

```
┌──────────────────────────────────────────────────────────────────┐
│                       浏览器（Client）                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐  │
│  │  TopNav    │  │ DocsSidebar│  │   TOC      │  │ HomeExplorer│ │
│  │ (导航)     │  │ (侧边栏)   │  │ (目录高亮) │  │ (首页索引) │  │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │       交互式代码组件（'use client'）                        │  │
│  │  CodeCard │ HtmlPreview │ VuePreview │ MermaidBlock │ CodeGroup│
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              ▲ hydration / props
┌──────────────────────────────────────────────────────────────────┐
│                  Next.js Server Components                        │
│  app/layout.tsx         ─ 全局字体 + TopNav                       │
│  app/page.tsx           ─ 首页：统计 + 分组 + 最近更新            │
│  app/docs/[category]/layout.tsx  ─ 分类侧边栏布局                │
│  app/docs/[category]/page.tsx    ─ 分类章节列表                  │
│  app/docs/[category]/[...slug]/page.tsx ─ 文档正文渲染           │
└──────────────────────────────────────────────────────────────────┘
                              ▲ 调用
┌──────────────────────────────────────────────────────────────────┐
│                     数据层（src/lib）                             │
│  docs-config.ts    ─ 分类配置（slug ↔ 目录映射）                  │
│  docs-reader.ts    ─ 文件系统读取、章节树构建、统计               │
│  recent-updates.ts ─ 解析 docs/文档更新记录.md                    │
│  toc.ts            ─ 从 Markdown 提取 H2~H4                       │
│  remark-vitepress-containers.ts ─ VitePress ::: 容器插件          │
│  utils.ts          ─ cn() (clsx 包装)                            │
└──────────────────────────────────────────────────────────────────┘
                              ▲ 读取
┌──────────────────────────────────────────────────────────────────┐
│                     内容层（docs/ 目录）                          │
│  Markdown 文件（含 frontmatter）+ public/ 静态图片                │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 三层数据流

1. **配置层**：[docs-config.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/lib/docs-config.ts) 维护一份 `DocGroup[]` 树，把 URL slug（如 `java`、`vue3`）映射到 `docs/` 下的物理目录（如 `Java/01-语言基础`、`前端/06-vue3`）。`hidden: true` 的分类仅出现在导航/侧边栏，不显示首页卡片（用于拉勾专栏等子分类）。
2. **读取层**：[docs-reader.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/lib/docs-reader.ts) 在服务端通过 `node:fs` 同步读取磁盘，递归构建 `DocSection` 嵌套树，解析 frontmatter 拿到 `title`。
3. **渲染层**：App Router 页面把数据以 props 透传给 RSC + 客户端组件。Markdown 渲染只在文档详情页（`app/docs/[category]/[...slug]/page.tsx`）发生，使用 `MarkdownAsync` 异步组件。

### 2.3 路由设计

| 路径 | 文件 | 说明 |
| --- | --- | --- |
| `/` | [src/app/page.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/page.tsx) | 首页：全量索引 + 搜索 + 最近更新 |
| `/docs/[category]` | [src/app/docs/[category]/page.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/docs/[category]/page.tsx) | 分类落地页：递归渲染章节与文件链接 |
| `/docs/[category]/[...slug]` | [src/app/docs/[category]/[...slug]/page.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/docs/[category]/[...slug]/page.tsx) | 文档详情页：渲染 Markdown 正文 + TOC |
| Layout | [src/app/docs/[category]/layout.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/docs/[category]/layout.tsx) | 分类页与详情页共享的侧边栏布局 |

> 注意：详情页未使用 `generateStaticParams`，依赖 Next.js 动态渲染。分类落地页 `page.tsx` 使用 `generateStaticParams` 预生成所有分类路径。

---

## 三、目录结构

```
tech-codex/
├── docs/                          # 内容根目录（Markdown 笔记）
│   ├── 前端/                       # HTML/CSS/JS/TS/Vue/React/Next.js/Taro...
│   ├── 后端/                       # Node/NestJS/MySQL/Redis/分布式/DevOps...
│   ├── Java/                       # Java 语言基础/JVM/框架/工程/实战...
│   ├── Python/                     # Python 全栈
│   ├── 操作系统/ 安全/ 测试/ 数据/...
│   └── 文档更新记录.md             # 最近更新流的解析源
├── public/                         # 静态资源（各专题的 -images/ 子目录）
├── src/
│   ├── app/                        # Next.js App Router 路由
│   │   ├── layout.tsx              # 根布局：字体 + TopNav
│   │   ├── page.tsx                # 首页
│   │   ├── globals.css             # 全局样式 + prose-doc 排版
│   │   └── docs/[category]/
│   │       ├── layout.tsx          # 侧边栏 + 主内容区
│   │       ├── page.tsx            # 分类章节列表
│   │       └── [...slug]/page.tsx  # 文档详情（Markdown 渲染）
│   ├── components/
│   │   ├── home/
│   │   │   └── home-explorer.tsx   # 首页主组件（搜索 + 卡片 + 更新流）
│   │   └── ui/
│   │       ├── top-nav.tsx         # 顶部导航（响应式下拉 + 移动抽屉）
│   │       ├── docs-sidebar.tsx    # 文档侧边栏（可折叠嵌套树）
│   │       ├── toc.tsx             # 文档目录（IntersectionObserver）
│   │       ├── code-card.tsx       # 代码块卡片（复制 + JS 运行）
│   │       ├── html-preview.tsx    # HTML iframe 实时预览
│   │       ├── vue-preview.tsx     # Vue SFC iframe 预览
│   │       ├── mermaid-block.tsx   # Mermaid 图表渲染
│   │       ├── code-group.tsx      # 代码组标签页（Shiki 高亮）
│   │       └── vp-container.tsx    # VitePress ::: 容器渲染
│   ├── lib/
│   │   ├── docs-config.ts          # 分类配置（slug ↔ dir 映射）
│   │   ├── docs-reader.ts          # 文件系统读取 + 章节树
│   │   ├── recent-updates.ts       # 解析更新记录
│   │   ├── toc.ts                  # TOC 提取
│   │   ├── remark-vitepress-containers.ts  # remark 自定义插件
│   │   └── utils.ts                # cn() 工具
│   └── store/
│       └── use-app-store.ts        # zustand 全局 store（theme）
├── scripts/                        # 运维与迁移脚本
│   ├── clean-merge.mjs             # 内容迁移（分布式数据库合并清理）
│   ├── merge-ddb.mjs               # 内容迁移（分布式数据库合并）
│   ├── check-images.cjs            # 图片引用统计
│   ├── check-images2.cjs           # 图片引用统计（变体）
│   ├── clean-orphan-images.cjs     # 孤儿图片清理
│   ├── do-clean.cjs                # 清理执行
│   ├── final-verify.cjs            # 最终核验
│   ├── gen-restore-list.cjs        # 生成恢复清单
│   └── verify-deleted.cjs          # 删除结果校验
├── next.config.ts                  # Next.js 配置 + 重定向表
├── tsconfig.json                   # TS 配置（@/* → ./src/*）
├── postcss.config.mjs              # Tailwind v4 PostCSS
├── eslint.config.mjs
├── package.json
└── pnpm-workspace.yaml
```

---

## 四、主要模块职责

### 4.1 路由与页面层（`src/app`）

| 文件 | 职责 |
| --- | --- |
| [layout.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/layout.tsx) | 加载 Google 字体 `Space_Grotesk` + `JetBrains_Mono`，设置 `lang="zh-CN"`，全局挂载 `<TopNav />`，注入 `--font-display` / `--font-mono` CSS 变量。 |
| [page.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/page.tsx) | 首页服务端组件：调用 `getDocsStats()`、`getRecentUpdates(12)`、`docGroups`，把每个分类的 `getCategoryFiles()` 一并注入到 `<HomeExplorer>`。 |
| [docs/[category]/layout.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/docs/[category]/layout.tsx) | 异步 layout：解析 `params.category`，校验分类存在性（`notFound()` 兜底），构建章节树 `getSections()`，左侧 `lg:` 以上显示 `<DocsSidebar>`。 |
| [docs/[category]/page.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/docs/[category]/page.tsx) | 分类落地页：`generateStaticParams` 预生成所有分类 slug；递归 `<SectionBlock>` 渲染章节标题与文件链接，按 depth 应用不同标题样式。 |
| [docs/[category]/[...slug]/page.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/docs/[category]/[...slug]/page.tsx) | 文档详情页：解析 slug → 文件相对路径 → `getDocContent()` → `extractToc()`，使用 `MarkdownAsync` 渲染，配置 remark/rehype 插件链，通过 `markdownComponents` 自定义 `pre`/`code`/`vpcontainer`/`vpcodegroup` 的渲染。 |

### 4.2 数据与配置层（`src/lib`）

#### [docs-config.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/lib/docs-config.ts)

**职责**：单一可信源（Single Source of Truth）—— 维护全站分类配置。

- 导出接口：`DocCategory`、`DocGroup`
- 导出常量：`docGroups: DocGroup[]`（18 个分组，含前端基础、框架与语言、工程化与后端、Python、Java、数据库、分布式、DevOps、可视化、架构与工程、技术管理、测试、数据分析、产品、工具、AI、职业与成长、操作系统、安全、运维、经济学、大数据、杂谈博客）
- 派生导出：`allCategories`（`flatMap` 拍平所有分类）
- 工具函数：`getCategoryBySlug(slug)` —— O(n) 查找

**关键字段**：
- `slug`：URL 路径段，如 `vue3`、`java-jvm`
- `dir`：相对 `docs/` 的物理目录，如 `前端/06-vue3`
- `hidden`：是否在首页卡片中隐藏（拉勾专栏场景）
- `icon`：emoji 图标，用于导航与卡片

#### [docs-reader.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/lib/docs-reader.ts)

**职责**：封装所有文件系统读取逻辑，构建章节树与统计信息。

| 函数 | 签名 | 说明 |
| --- | --- | --- |
| `getSections(categorySlug)` | `(slug: string) => DocSection[]` | 递归构建分类下的嵌套章节树；根目录 `.md` 归入 `_root` 概述章节；目录标题优先取 `index.md`/`README.md` 的 frontmatter `title`，否则回退到目录名（去序号前缀） |
| `buildSection(absDir, relDir, relSlug)` | 内部递归 | 单章节构建器；既无文件又无子节点的目录返回 `null` 被跳过 |
| `getDocContent(relativePath)` | `(path: string) => {title, content} \| null` | 读取单篇 Markdown，用 `gray-matter` 拆出 frontmatter `title` 与正文 |
| `getAllDocPaths(categorySlug)` | `(slug: string) => string[]` | 扁平化收集分类下所有 `.md` 路径，供 `generateStaticParams` 使用（当前详情页未调用） |
| `getDocsStats()` | `() => DocsStats` | 遍历全站统计 `.md` 总数；按 `DocCategory.dir` 索引各分类文档数 |
| `getCategoryFiles(categorySlug)` | `(slug: string) => CategoryFileItem[]` | 首页索引用的扁平文件列表，递归子目录，按序号排序 |

**关键设计**：
- `INDEX_FILES = new Set(['index.md'])`：仅排除 `index.md`，**不排除 `README.md`**（因为全站多处把 `README.md` 用作真实正文）
- 排序函数 `sortByName`：先按文件名开头数字，再按中文 localeCompare
- 章节标题来源优先级：`index.md` frontmatter `title` > `README.md` frontmatter `title` > 目录名（去序号）

#### [recent-updates.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/lib/recent-updates.ts)

**职责**：解析 `docs/文档更新记录.md` 中的"修改的文档"与"新建的文档"两张 Markdown 表格，产出最近更新流。

- 通过 `## 修改的文档` / `## 新建的文档` 切换 `mode`
- 通过 `### xxx模块` 切换 `moduleLabel`
- 用正则 `/\`docs\/[^`]+\.md\`/` 抽取文件路径，配合 `allCategories` 反查 `category.dir → slug`，构造可跳转的 `href`
- 排序：`type === 'new'` 优先，按出现顺序截取 `limit` 条

#### [toc.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/lib/toc.ts)

**职责**：从 Markdown 原文提取 H2~H4 标题。

- 跟踪代码围栏（``` / ~~~）状态，跳过代码块内的 `#`
- 用正则模拟 `github-slugger` 的 id 生成规则（小写、去除标点、空格转 `-`），与 `rehype-slug` 生成的 id 对齐
- 输出 `TocItem[]`：`{ id, text, level }`

#### [remark-vitepress-containers.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/lib/remark-vitepress-containers.ts)

**职责**：让 Markdown 支持 VitePress 风格的 `::: tip / warning / danger / info / note / important / caution / details / code-group / v-pre` 容器语法。

**两个导出**：

1. **`normalizeVitepressContainers(md: string): string`** —— 预处理文本：在 `:::` 边界行前后补空行，让 remark 把标记行解析为独立段落。跟踪代码围栏状态，避免误改代码块内的 `:::` 示例。
2. **`remarkVitepressContainers()`** —— remark 插件：遍历 mdast，识别 `:::type title` 起始标记 + 闭合 `:::` 围栏，把内部 children 重组为自定义节点 `vpContainer`（提示容器）或 `vpCodeGroup`（代码组）。支持嵌套容器；`v-pre` 类型仅脱壳透传。

**节点序列化技巧**：复杂数据（如 CodeGroup 的 items 数组）用 `JSON.stringify` 经 `data-*` 属性传递（hast 会把数组/对象属性序列化为字符串）。

#### [utils.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/lib/utils.ts)

仅导出 `cn(...inputs: ClassValue[])` —— 对 `clsx` 的薄包装，用于条件类名拼接。

### 4.3 组件层（`src/components`）

#### 4.3.1 顶部导航 [top-nav.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/top-nav.tsx)

- `'use client'` 客户端组件，挂载在根 layout
- **桌面端**：hover 触发下拉面板（`DropdownPanel`），120ms 延迟关闭防止误触；当前路由匹配项显示底部蓝色下划线
- **移动端**：汉堡按钮展开抽屉，下拉项可二级展开
- 路由变化时（`useEffect` 监听 `pathname`）自动关闭所有菜单
- `navItems` 数组定义在文件内：首页、前端（下拉）、Java、Python、DevOps、安全、操作系统、更多（下拉）

#### 4.3.2 文档侧边栏 [docs-sidebar.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/docs-sidebar.tsx)

- `'use client'`，接收服务端注入的 `sections: DocSection[]`
- 递归 `renderSection(section, depth)`：默认展开包含当前页面的章节；顶层章节数量 ≤ 6 时默认全部展开
- 每个章节显示文件总数（`countFiles` 递归统计）
- 链接构造规则：`section.slug === '_root'` 时省略章节前缀（直接挂到分类根）

#### 4.3.3 文档目录 [toc.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/toc.tsx)

- `'use client'`，`IntersectionObserver` 监听所有标题元素，进入视口时设置 `activeId`
- `rootMargin: '-80px 0px -70% 0px'` 让顶部导航不遮挡锚点，且只在标题位于视口上 30% 区域时激活
- 点击目录项 `scrollIntoView({ behavior: 'smooth' })` 并立即设置 `activeId`（避免滚动期间闪烁）

#### 4.3.4 代码块卡片 [code-card.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/code-card.tsx)

- `'use client'`，深色卡片样式（`#0d1117` 背景 + `#30363d` 边框，对标 GitHub Dark）
- 右上角悬浮控件：语言标识 + 复制按钮（`navigator.clipboard.writeText`）+ 运行按钮（仅 `js`/`javascript`）
- **JS 运行机制**：用 `new Function('console', code)(fakeConsole)` 在闭包内执行，劫持 `console.log/info/warn/error` 收集输出，渲染到代码块底部的 Console 面板
- `formatArg`：string 原样返回，其他尝试 `JSON.stringify`，失败回退 `String()`

#### 4.3.5 HTML 预览 [html-preview.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/html-preview.tsx)

- `'use client'`，弹窗式预览（`createPortal` 到 `document.body`）
- `buildSrcDoc(code)`：自动判断是片段还是完整文档，注入 `:where()` 兜底样式（0 specificity，不覆盖用户样式），并插入高度自适应脚本
- **iframe 高度自适应**：iframe 内 `ResizeObserver` 监听 `document.body`，通过 `postMessage` 上报高度，父组件监听 `message` 事件更新 `height`（上限 800px）
- ESC 关闭 + 锁定背景滚动

#### 4.3.6 Vue SFC 预览 [vue-preview.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/vue-preview.tsx)

- `'use client'`，最复杂的预览组件
- `parseSfc(source)`：正则切分 `<template>` / `<script>` / `<style>` 三段，识别 `<script setup>`
- **三种编译路径**：
  - `isVue2Style`（`new Vue({...})` 风格）→ `buildVue2SrcDoc`：提取 `new Vue()` 参数 + 全局 `Vue.component()` 注册，迁移到 `createApp`
  - `<script setup>` → `buildSetupFromScriptSetup`：剥离 `vue` import，匹配顶层 `const/let/var/function` 声明名作为 setup 返回值
  - `export default {...}` → `buildSetupFromOptions`：简易提取 setup 函数或 data/methods/computed
- 运行时从 `/vue.esm-browser.js` 加载 Vue，从 `https://esm.sh/@vue/compiler-dom@3.5.13?bundle-deps` 动态加载模板编译器
- 模板编译用 `mode: 'function'`，通过 `new Function(compiled.code)()` 生成 render 函数
- `onIframeLoad` 读取 `contentDocument.body.scrollHeight` 自适应高度（160~720px）

#### 4.3.7 Mermaid 图表 [mermaid-block.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/mermaid-block.tsx)

- `'use client'`，`mermaid.initialize({ startOnLoad: false, theme: 'neutral' })`
- `sanitizeMermaid(code)`：把含 `()` 的 `[...]` 节点标签用双引号包裹（v11 兼容写法）
- 三态渲染：loading（占位）/ success（`dangerouslySetInnerHTML` 注入 SVG）/ error（回退显示源码）
- 每个实例独立 `useRef` id（`mermaid-${++uid}`），避免 mermaid 内部 id 冲突
- `useEffect` 清理函数设置 `cancelled` 标志，防止 unmount 后 setState

#### 4.3.8 代码组 [code-group.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/code-group.tsx)

- `'use client'`，处理 `::: code-group` 标签页
- Shiki highlighter 单例懒加载（`createHighlighter`），预加载 14 种语言
- `data-items` 属性经 `JSON.parse` 还原 `CodeGroupItem[]`
- 切换标签或首次渲染时异步高亮当前代码，未加载的语言回退为转义纯文本
- 复制按钮复制当前激活 tab 的代码

#### 4.3.9 VitePress 容器 [vp-container.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/vp-container.tsx)

- 服务端组件（无 `'use client'`，纯展示）
- `CONFIG` 映射 8 种容器类型到边框色、背景色、图标、默认标签（`tip`/`warning`/`danger`/`info`/`note`/`important`/`caution`/`details`）
- `details` 类型用 `<details><summary>` 渲染为可折叠
- 类名硬编码（不用 `cn` 拼接），确保 Tailwind 编译器能扫描到

#### 4.3.10 首页 [home-explorer.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/home/home-explorer.tsx)

- `'use client'`，首页唯一组件，约 380 行
- **Hero 区**：徽章 + 渐变标题 + 全站统计（文档总数、技术方向、分类、拉勾专栏）+ 搜索框
- **搜索过滤**：`useMemo` 计算匹配分组/分类/文档标题的结果；分类匹配时（`catMatch`）展开全部文件，否则只展示匹配文件
- **分类卡片**：`CategoryCard` 可点击展开/折叠，显示文件列表；支持"全部展开/全部折叠"工具条
- **最近更新流**：渲染 `RecentUpdate[]`，`new` 显示蓝色 NEW 徽章，`modified` 显示灰色"修订"徽章

### 4.4 状态层（`src/store`）

#### [use-app-store.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/store/use-app-store.ts)

- zustand store，仅持有 `theme: 'light' | 'dark'` 与 `toggleTheme`
- **注意**：当前代码中未观察到 `useAppStore` 被实际消费，`globals.css` 中虽定义了 `.dark` 变量，但根 `<html>` 未切换 `dark` class。可视为预留接口

---

## 五、关键类与函数说明

### 5.1 类型定义

```typescript
// src/lib/docs-config.ts
interface DocCategory {
  slug: string;        // URL 路径段
  title: string;       // 显示名
  description: string; // 卡片描述
  icon: string;        // emoji
  dir: string;         // 相对 docs/ 的物理目录
  hidden?: boolean;    // 首页卡片隐藏（仅导航/侧边栏可见）
}

interface DocGroup {
  id: string;
  title: string;
  description: string;
  categories: DocCategory[];
}

// src/lib/docs-reader.ts
interface DocSection {
  title: string;
  slug: string;
  files: DocFile[];
  children: DocSection[];  // 任意深度嵌套
}

interface DocFile {
  title: string;
  slug: string;
  path: string;
}

interface DocsStats {
  total: number;                    // 全站 .md 总数
  byDir: Record<string, number>;    // 按分类目录索引
}

interface CategoryFileItem {
  title: string;
  slug: string;  // 含子目录前缀，去 .md 后缀
}

// src/lib/toc.ts
interface TocItem {
  id: string;
  text: string;
  level: number;  // 2/3/4
}

// src/lib/recent-updates.ts
interface RecentUpdate {
  type: 'new' | 'modified';
  module: string;
  title: string;
  description: string;
  href?: string;
}
```

### 5.2 核心函数索引

| 函数 | 文件 | 用途 |
| --- | --- | --- |
| `getCategoryBySlug(slug)` | docs-config.ts | slug → DocCategory |
| `getSections(categorySlug)` | docs-reader.ts | 分类 → 嵌套章节树 |
| `getDocContent(relativePath)` | docs-reader.ts | 相对路径 → {title, content} |
| `getDocsStats()` | docs-reader.ts | 全站文档统计 |
| `getCategoryFiles(categorySlug)` | docs-reader.ts | 分类 → 扁平文件列表（首页索引） |
| `getRecentUpdates(limit)` | recent-updates.ts | 解析更新记录 → RecentUpdate[] |
| `extractToc(markdown)` | toc.ts | Markdown → TocItem[] |
| `normalizeVitepressContainers(md)` | remark-vitepress-containers.ts | 预处理 `:::` 边界空行 |
| `remarkVitepressContainers()` | remark-vitepress-containers.ts | remark 插件：重组 `:::` 容器 |
| `cn(...inputs)` | utils.ts | clsx 包装 |
| `buildSrcDoc(code)` | html-preview.tsx / vue-preview.tsx | 构造 iframe srcDoc |
| `sanitizeMermaid(code)` | mermaid-block.tsx | mermaid 标签转义 |

### 5.3 详情页 Markdown 渲染管线

[详情页 page.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/docs/[category]/[...slug]/page.tsx) 的渲染管线：

```typescript
<ReactMarkdown
  remarkPlugins={[remarkGfm, remarkVitepressContainers]}
  rehypePlugins={[
    [rehypePrettyCode, { theme: 'github-dark', keepBackground: false, defaultLang: 'plaintext' }],
    rehypeSlug,
  ]}
  components={markdownComponents}
>
  {normalizeVitepressContainers(doc.content)}
</ReactMarkdown>
```

**`markdownComponents` 自定义渲染**：

| 节点 | 处理逻辑 |
| --- | --- |
| `pre` | 脱壳取子 `code` 的语言：`html`/`vue` 直接透传（让 `code` 处理器接管）；`mermaid` 渲染为 `<MermaidBlock>`；其他包装为 `<CodeCard>` |
| `code` | `html` → `<HtmlPreview>`；`vue` → `<VuePreview>`；其他原样输出 |
| `vpcontainer` | `<VpContainer>`（由 remark 插件生成的自定义节点） |
| `vpcodegroup` | `<CodeGroup>`（items 经 `data-items` JSON 传递） |

辅助函数 `extractText(children)`：递归提取 React 节点的纯文本（rehype-highlight 会把代码转成高亮 span，需要拿到原始文本供复制/运行）。

---

## 六、依赖关系

### 6.1 运行时依赖（package.json `dependencies`）

| 依赖 | 版本 | 用途 |
| --- | --- | --- |
| `next` | 16.2.12 | App Router 框架 |
| `react` / `react-dom` | 19.2.4 | UI 库 |
| `react-markdown` | ^10.1.0 | Markdown 渲染（`MarkdownAsync` 异步组件） |
| `remark-gfm` | ^4.0.1 | GitHub Flavored Markdown（表格、删除线、任务列表） |
| `rehype-pretty-code` | ^0.14.5 | 基于 Shiki 的代码高亮 |
| `rehype-slug` | ^6.0.0 | 为标题生成 id |
| `shiki` | ^4.4.2 | 代码高亮引擎（CodeGroup 单独使用） |
| `highlight.js` | ^11.11.1 | 代码高亮（依赖项，实际通过 rehype-pretty-code 间接使用） |
| `gray-matter` | ^4.0.3 | Frontmatter 解析 |
| `mermaid` | ^11.16.0 | 图表渲染 |
| `zustand` | ^5.0.14 | 全局状态 |
| `clsx` | ^2.1.1 | 条件类名 |
| `lucide-react` | ^1.28.0 | 图标库 |

### 6.2 开发依赖（devDependencies）

| 依赖 | 用途 |
| --- | --- |
| `tailwindcss` ^4 + `@tailwindcss/postcss` | CSS 框架（v4 PostCSS 插件模式） |
| `typescript` ^5 | 类型系统 |
| `eslint` ^9 + `eslint-config-next` | 代码规范 |
| `@types/*` | Node / React / mdast 类型 |
| `playwright` ^1.62.1 | 浏览器测试（声明但未发现用例） |

### 6.3 模块间依赖图

```
app/page.tsx
  ├─ lib/docs-config (docGroups)
  ├─ lib/docs-reader (getDocsStats, getCategoryFiles)
  ├─ lib/recent-updates (getRecentUpdates)
  └─ components/home/home-explorer

app/docs/[category]/layout.tsx
  ├─ lib/docs-config (getCategoryBySlug)
  ├─ lib/docs-reader (getSections)
  └─ components/ui/docs-sidebar

app/docs/[category]/page.tsx
  ├─ lib/docs-config (getCategoryBySlug, allCategories)
  ├─ lib/docs-reader (getSections)
  └─ (递归渲染 SectionBlock)

app/docs/[category]/[...slug]/page.tsx
  ├─ lib/docs-config (getCategoryBySlug)
  ├─ lib/docs-reader (getDocContent)
  ├─ lib/toc (extractToc)
  ├─ lib/remark-vitepress-containers (normalizeVitepressContainers, remarkVitepressContainers)
  ├─ components/ui/toc
  ├─ components/ui/html-preview
  ├─ components/ui/vue-preview
  ├─ components/ui/code-card
  ├─ components/ui/mermaid-block
  ├─ components/ui/vp-container
  └─ components/ui/code-group
```

### 6.4 内容与代码的契约

| 契约点 | 说明 |
| --- | --- |
| `docs/<DocCategory.dir>/**/*.md` | 文件必须放在配置目录下才会被扫描 |
| `index.md` | 作为章节说明页，不计入侧边栏文件列表；其 frontmatter `title` 优先作为章节标题 |
| `README.md` | **不**被排除，作为真实正文参与渲染 |
| frontmatter `title` | 单篇文档标题来源（无则取文件名） |
| 文件名序号前缀 | `01-xxx.md` 用于排序，标题展示时**保留**序号 |
| 目录名序号前缀 | `0-基础入门` → 章节标题 `基础入门`（去除前缀） |
| `::: tip/warning/danger/info/note/important/caution/details` | VitePress 容器语法 |
| `::: code-group` + 多个代码块（含 `[label]` meta） | 代码组标签页 |
| ` ```mermaid ` | 渲染为 Mermaid 图表 |
| ` ```html ` | 渲染为可预览的 HTML 代码块 |
| ` ```vue ` | 渲染为可预览的 Vue SFC |
| ` ```js ` / ` ```javascript ` | 代码块带"运行"按钮 |

---

## 七、项目运行方式

### 7.1 环境要求

- Node.js（Next.js 16 推荐 18.18+ 或 20+）
- pnpm（仓库提供 `pnpm-lock.yaml` 与 `pnpm-workspace.yaml`）

### 7.2 安装依赖

```bash
pnpm install
```

> `pnpm-workspace.yaml` 中通过 `ignoredBuiltDependencies` 忽略了 `sharp` 与 `unrs-resolver` 的原生构建步骤。

### 7.3 开发模式

```bash
pnpm dev
# 实际命令：next dev -p 4200
```

开发服务器监听 **http://localhost:4200**（注意：非默认 3000，端口在 `package.json` scripts 中硬编码为 4200）。

### 7.4 生产构建与启动

```bash
pnpm build      # next build
pnpm start      # next start（默认 3000 端口）
```

### 7.5 类型检查与 Lint

```bash
pnpm typecheck  # tsc --noEmit
pnpm lint       # eslint .
```

ESLint 配置（[eslint.config.mjs](file:///Users/xiaoye/Desktop/20260810/tech-codex/eslint.config.mjs)）继承 `eslint-config-next` 的 `core-web-vitals` 与 `typescript` 预设，并将 `@typescript-eslint/no-explicit-any` 放宽为 `warn`。

### 7.6 常见开发场景

#### 新增一个分类

1. 在 `docs/` 下创建物理目录并放入 `.md` 文件
2. 编辑 [src/lib/docs-config.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/lib/docs-config.ts) 的 `docGroups`，添加 `DocCategory` 条目（指定 `slug`、`dir`、`title`、`icon`、`description`）
3. 若需要在顶部导航暴露，编辑 [top-nav.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/top-nav.tsx) 的 `navItems`

#### 新增一篇文档

直接在对应分类目录下创建 `.md` 文件，文件名建议带数字序号前缀（如 `12-新主题.md`）。可选写入 frontmatter：

```yaml
---
title: 新主题标题
---
```

#### 添加 VitePress 容器

```markdown
::: tip 提示标题
内容支持 **Markdown** 与 `code`。
:::

::: code-group
```js [hello.js]
console.log('hello')
```
```ts [hello.ts]
console.log('hello')
```
:::
```

---

## 八、配置与构建

### 8.1 [next.config.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/next.config.ts)

唯一职责：**配置 `redirects()`**，承接历史目录重组。

四组重定向规则：

1. `PYTHON_LEGACY_MAP`：旧 Python 子分类 slug（如 `python-basics`）→ 新的 `python/<子路径>`
2. `PYTHON_DIR_RENAME`：分类内目录重命名（如 `%E5%8F%82%E8%80%83` → `归档`）
3. `DATA_SCIENCE_REDIRECT`：数据科学目录融合（130+ 条规则，把旧四目录路径重定向到新分层路径）
4. `REFACTOR_REDIRECT`：专题重构（`web-security` → `security`、`os-course` → `os`、`career/前端进阶` → `frontend-advanced` 等）

所有重定向均为 `permanent: true`（HTTP 308）。

### 8.2 [tsconfig.json](file:///Users/xiaoye/Desktop/20260810/tech-codex/tsconfig.json)

- `target: ES2017`，`module: esnext`，`moduleResolution: bundler`
- `strict: true`，`isolatedModules: true`，`incremental: true`
- 路径别名：`@/*` → `./src/*`
- 启用 Next.js 插件

### 8.3 [postcss.config.mjs](file:///Users/xiaoye/Desktop/20260810/tech-codex/postcss.config.mjs)

仅注册 `@tailwindcss/postcss`（Tailwind v4 的 PostCSS 集成方式）。

### 8.4 [globals.css](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/globals.css)

- `@import "tailwindcss"` 启动 Tailwind v4
- 定义 `:root` 与 `.dark` CSS 变量（`--background`、`--foreground`、`--muted`、`--border`、`--accent`）
- `@theme inline` 把 CSS 变量映射为 Tailwind 主题 token（`--color-background` 等）
- `.prose-doc` 类：Markdown 正文排版样式（h1~h4、p、ul/ol、code、pre、blockquote、table 等）

---

## 九、辅助脚本

### 9.1 图片治理脚本（`scripts/*.cjs`）

历史上有大量从拉勾课程迁移过来的图片资源，`scripts/` 目录下提供一组 CommonJS 脚本用于清理孤儿图片：

| 脚本 | 用途 |
| --- | --- |
| [scripts/check-images.cjs](file:///Users/xiaoye/Desktop/20260810/tech-codex/scripts/check-images.cjs) | 扫描 `public/*-images/` 与 `docs/**/*.md`，统计每个图片文件夹的引用率，输出"完全未用 / 部分未用 / 全被引用"分布 |
| [scripts/check-images2.cjs](file:///Users/xiaoye/Desktop/20260810/tech-codex/scripts/check-images2.cjs) | check-images 的变体（差异未深入对比） |
| [scripts/clean-orphan-images.cjs](file:///Users/xiaoye/Desktop/20260810/tech-codex/scripts/clean-orphan-images.cjs) | 针对 `TARGETS` 数组中指定的 9 个图片目录，物理删除未被任何 `.md` 引用的图片（按文件名精确匹配） |
| [scripts/do-clean.cjs](file:///Users/xiaoye/Desktop/20260810/tech-codex/scripts/do-clean.cjs) | 实际执行清理动作 |
| [scripts/gen-restore-list.cjs](file:///Users/xiaoye/Desktop/20260810/tech-codex/scripts/gen-restore-list.cjs) | 生成可恢复列表 |
| [scripts/verify-deleted.cjs](file:///Users/xiaoye/Desktop/20260810/tech-codex/scripts/verify-deleted.cjs) | 校验删除结果 |
| [scripts/final-verify.cjs](file:///Users/xiaoye/Desktop/20260810/tech-codex/scripts/final-verify.cjs) | 最终核验 |
| `deleted-images-log.txt` / `restore-list.txt` | 删除日志与恢复清单（约 80KB / 7KB，仍位于仓库根目录） |

> 这些脚本属于一次性运维工具，不参与构建流程。脚本内使用 `'public'` / `'docs'` 等相对路径，需在项目根目录运行，例如：`node scripts/check-images.cjs`。

### 9.2 内容迁移脚本（`scripts/*.mjs`）

| 脚本 | 用途 |
| --- | --- |
| [scripts/merge-ddb.mjs](file:///Users/xiaoye/Desktop/20260810/tech-codex/scripts/merge-ddb.mjs) | 把 `docs/后端/04-分布式数据库` 下 26 篇旧文章合并为 8 篇新文章，并重写内部链接（`/docs/distributed-db/<数字>-...` → 新 slug） |
| [scripts/clean-merge.mjs](file:///Users/xiaoye/Desktop/20260810/tech-codex/scripts/clean-merge.mjs) | 清理合并后文章中残留的导语段落（15 个 pattern） |

均使用 ESM（`.mjs`），属一次性迁移脚本。

### 9.3 `.workbuddy/` 目录

仓库内有一份 `.workbuddy/` 工作目录（已被 `.gitignore` 部分忽略），含若干 Python 脚本（`assesssource.py`、`scan_module06.py`、`split_compliant.py`、`verify_compliance.py`）与中文文档（`任务进度-文档整合项目.md`、`评估-前端高级工程师迁移方案.md`），以及 `memory/` 子目录的日志。这些是历史文档整合项目的工作产物，**不参与 Next.js 应用运行**。

---

## 十、关键设计决策与注意事项

### 10.1 服务端 vs 客户端组件边界

- **服务端（默认）**：所有 `app/` 下的 page/layout、`lib/` 下的读取函数、`vp-container` 组件
- **客户端（`'use client'`）**：所有带交互的 UI 组件（导航、侧边栏、TOC、代码块、预览、首页搜索）

原因：文件系统读取只能在服务端进行（`node:fs`），而交互（hover、点击、iframe、IntersectionObserver、clipboard）必须在客户端。

### 10.2 Markdown 渲染为什么用 `MarkdownAsync`

[next-env.d.ts 与 react-markdown v10]：`react-markdown` v10 推荐使用 `MarkdownAsync` 异步组件以支持 RSC，避免在服务端组件中阻塞。本项目的 `markdownComponents` 仍作为同步函数定义，但通过 `MarkdownAsync` 入口渲染。

### 10.3 Vue 预览的运行时取舍

不打包 Vue 编译器到主 bundle，而是在 iframe 内通过 `https://esm.sh/@vue/compiler-dom@3.5.13?bundle-deps` 动态加载。这样：

- 主站 bundle 不膨胀
- iframe 沙箱隔离，编译错误不影响主页面
- 但**依赖网络**（esm.sh），离线场景不可用

### 10.4 `index.md` vs `README.md` 的差异化处理

[docs-reader.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/lib/docs-reader.ts) 中 `INDEX_FILES` 仅包含 `index.md`：

```typescript
const INDEX_FILES = new Set(['index.md']);
```

注释明确说明：`README.md` 在全站多被用作真实正文文件名，不可排除。这是一个看似简单但很关键的不对称设计。

### 10.5 重定向表的规模

[next.config.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/next.config.ts) 包含约 130 条 `DATA_SCIENCE_REDIRECT` 规则，全部用 URL 编码的中文路径。这反映了项目经历了大规模的内容重组（数据科学四目录融合、Python 子分类合并、安全/操作系统/运维 slug 变更等），重定向表是历史链接兼容性的保障。

### 10.6 zustand store 当前未启用暗色模式

[use-app-store.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/store/use-app-store.ts) 定义了 `theme` 与 `toggleTheme`，`globals.css` 也定义了 `.dark` 变量，但根 `<html>` 上没有切换 `dark` class 的逻辑。当前站点实际只渲染亮色主题。这是预留的扩展点。

### 10.7 `generateStaticParams` 的不完整使用

- 分类落地页 [page.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/docs/[category]/page.tsx) 使用了 `generateStaticParams` 预生成所有分类
- 详情页 [\[...slug\]/page.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/docs/[category]/[...slug]/page.tsx) **未使用** `generateStaticParams`，依赖 Next.js 的动态渲染

`docs-reader.ts` 中提供了 `getAllDocPaths(categorySlug)` 工具函数，可供后续切换到全静态预渲染。

---

## 十一、扩展指南

### 11.1 新增交互式代码语言

在 [code-card.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/code-card.tsx) 的 `RUNNABLE` Set 中添加语言标识，并在 `handleRun` 中实现运行逻辑（当前仅 JS 通过 `new Function` 执行）。

### 11.2 新增 VitePress 容器类型

1. 在 [remark-vitepress-containers.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/lib/remark-vitepress-containers.ts) 的 `buildContainer` 中识别新类型
2. 在 [vp-container.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/vp-container.tsx) 的 `CONFIG` 中添加样式映射（类名必须硬编码以被 Tailwind 扫描）

### 11.3 切换代码高亮主题

- 详情页：修改 [\[...slug\]/page.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/docs/[category]/[...slug]/page.tsx) 中 `rehypePrettyCode` 的 `theme` 选项（当前 `github-dark`）
- CodeGroup：修改 [code-group.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/code-group.tsx) 中 `createHighlighter` 的 `themes` 与 `codeToHtml` 的 `theme`

### 11.4 启用暗色模式

1. 在 [layout.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/layout.tsx) 或 [top-nav.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/top-nav.tsx) 中读取/切换 `useAppStore` 的 `theme`，并把 `dark` class 应用到 `<html>`
2. 为避免 FOUC，建议在 `<head>` 注入一段内联脚本，从 `localStorage` 读取主题并预先设置 class

---

## 十二、附录：关键文件速查表

| 关注点 | 文件 |
| --- | --- |
| 全站分类配置 | [src/lib/docs-config.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/lib/docs-config.ts) |
| 文件系统读取 | [src/lib/docs-reader.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/lib/docs-reader.ts) |
| Markdown 渲染入口 | [src/app/docs/[category]/[...slug]/page.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/docs/[category]/[...slug]/page.tsx) |
| VitePress 容器插件 | [src/lib/remark-vitepress-containers.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/lib/remark-vitepress-containers.ts) |
| Vue SFC 预览 | [src/components/ui/vue-preview.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/vue-preview.tsx) |
| HTML 预览 | [src/components/ui/html-preview.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/html-preview.tsx) |
| 代码块交互 | [src/components/ui/code-card.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/code-card.tsx) |
| 首页 | [src/components/home/home-explorer.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/home/home-explorer.tsx) |
| 顶部导航 | [src/components/ui/top-nav.tsx](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/components/ui/top-nav.tsx) |
| 重定向配置 | [next.config.ts](file:///Users/xiaoye/Desktop/20260810/tech-codex/next.config.ts) |
| 全局样式 | [src/app/globals.css](file:///Users/xiaoye/Desktop/20260810/tech-codex/src/app/globals.css) |
| 包配置 | [package.json](file:///Users/xiaoye/Desktop/20260810/tech-codex/package.json) |

---

*本文档基于仓库当前状态生成，最后更新：2026-08-12。*
