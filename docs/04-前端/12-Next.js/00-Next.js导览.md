---
title: Next.js 导览
description: Next.js 模块导览：版本口径声明、目录分组索引（基础与入门 / 实战与部署 / 生态与集成 / 面试）与 App Router vs Pages Router 说明
version: 1.0
author: 文档维护组
created: 2026-11-14
updated: 2026-11-14
status: 正式
category: Next.js
---

# Next.js 导览

本模块收录 Next.js 系统教程共 48 篇，覆盖核心概念、渲染机制、工程配置、全栈实战、生态集成与面试进阶。原为平铺目录，现已按内容重组为 4 个子目录，篇目编号保持原有顺序不变，便于按学习路径阅读。

## 版本口径声明

> **本系列以 Next.js 14（App Router）为主要版本口径撰写。**

- 教程主体基于 Next.js 13.4+ 稳定后的 App Router 体系编写，示例代码以 Next.js 14 为准（含 React 18 Server Components、Server Actions、Partial Prerendering 讨论等）。
- Pages Router 相关内容仅在对照说明与迁移场景中出现，不再作为主线展开。
- Next.js 15 / React 19 的变化（如 `async` 请求 API、Turbopack 默认化、缓存语义调整）暂不纳入本系列，阅读时请以官方当前版本文档为准校对新 API。
- 阅读建议：如你使用的是 Next.js 15 及以上版本，注意文中 `cookies`、`headers`、`searchParams`、`params` 等同步用法在新版本中已变为异步，需自行对照官方迁移指南调整。

## 目录分组索引

### 01-基础与入门（30 篇）

CLI、App Router 路由体系、渲染与数据获取、样式方案、Metadata、组件模型与常用配置，是整个系列的地基。

| 篇目 | 主题 |
| --- | --- |
| 01-Next.js CLI | 命令行工具 |
| 02-App Router | App Router 总览 |
| 03-链接与导航 | Link 与路由跳转 |
| 04-动态路由、路由组、平行路由和拦截路由 | 路由进阶约定 |
| 05-路由处理程序 | Route Handlers |
| 06-中间件 | Middleware |
| 07-从 CSR、SSR、SSG、ISR 开始说起 | 渲染策略概念 |
| 08-React Server Component 与 SSR | RSC 与 SSR |
| 09-Suspense 与 Streaming | 流式渲染 |
| 10-服务端组件和客户端组件 | 组件模型 |
| 11-服务端渲染策略 | 渲染策略选型 |
| 12-数据获取、缓存与重新验证 | fetch 数据层 |
| 13-Caching缓存机制 | 四层缓存 |
| 14-Server-Actions | 服务端操作 |
| 15-Tailwind CSS、CSS-in-JS 与 Sass | 样式方案 |
| 16-环境变量、路径别名与 src 目录 | 工程目录 |
| 17-路由段配置项 | Segment Config |
| 18-Images | 图片优化 |
| 19-Font | 字体优化 |
| 20-Link 和 Script | 资源组件 |
| 21-基于配置 | Metadata（配置式） |
| 22-基于文件 | Metadata（文件约定） |
| 23-懒加载 | Lazy Loading |
| 24-Edge Runtime | Edge 运行时 |
| 25-国际化 | App Router i18n |
| 26-TypeScript 和 ESLint | 类型与规范 |
| 27-MDX | MDX 支持 |
| 28-草稿模式和内容安全策略 | Draft Mode 与 CSP |
| 30-next.config.js配置详解 | 配置文件 |
| 31-常用函数与方法 | API 速查 |

### 02-实战与部署（4 篇）

完整项目实战与部署交付相关内容。

| 篇目 | 主题 |
| --- | --- |
| 29-静态导出 | Static Export 与部署形态 |
| 32-React-Notes全栈项目实战 | 全栈项目（增删改查 + 数据库） |
| 33-博客项目开发 | MDX 博客实战 |
| 34-最佳实践总览 | 项目结构与工程最佳实践 |

### 03-生态与集成（12 篇）

Tailwind 深入、认证、本地化、UI 组件库、数据校验与 T3 全栈栈组合实战。

| 篇目 | 主题 |
| --- | --- |
| 35-如何系统学习 Tailwind CSS | Tailwind 学习路径 |
| 36-Clerk 与登录注册 | 认证服务 |
| 37-Crowdin 与本地化 | 本地化平台 |
| 38-Storybook 与 UI 开发 | 组件工作台 |
| 39-Zod 与数据校验 | Schema 校验 |
| 40-Shadcn UI 与组件库 | 组件方案 |
| 41-React Hook From 与表单处理 | 表单方案 |
| 42-tRPC 与类型安全 | 端到端类型 |
| 43-create-t3-app 与项目初始化 | T3 脚手架 |
| 44-t3-app 实战  身份认证与主题切换 | T3 实战一 |
| 45-t3-app 实战  创建清单 | T3 实战二 |
| 46-t3-app 实战  创建任务 | T3 实战三 |

### 04-面试（2 篇）

原理深挖与面试题解析，适合作为学完前三个分组后的自测与复习。

| 篇目 | 主题 |
| --- | --- |
| 47-手写渲染原理 | 手写 React SSR/SSG/RSC 原理 |
| 48-常见面试题解析 | Next.js 高频面试题 |

> 注：各子目录内文件名沿用原编号（如 `02-实战与部署/29-静态导出.md`），编号即原系列阅读顺序，编号不连续处为分组调整所致（29 归入实战与部署）。

## App Router vs Pages Router

Next.js 存在两套路由与渲染体系，本系列全部以 **App Router** 为主线，这里给出两者对照，便于阅读旧资料时定位概念。

| 维度 | App Router（本系列主线） | Pages Router |
| --- | --- | --- |
| 目录约定 | `app/` 目录，文件夹即路由 | `pages/` 目录，文件即路由 |
| 组件模型 | 默认 Server Components，按需 `"use client"` | 默认客户端组件，按需 `getServerSideProps` |
| 数据获取 | `fetch` + `cache`/`revalidate`、Server Actions | `getStaticProps` / `getServerSideProps` / `getInitialProps` |
| 渲染策略 | 静态渲染、动态渲染、流式渲染（Suspense + Streaming） | SSG / SSR / ISR |
| 布局 | `layout.js` 嵌套布局、`template.js`、`loading.js`、`error.js` | `_app.js` / `_document.js` 手工组织 |
| 路由进阶 | 路由组、平行路由、拦截路由 | 单层文件路由 |
| 元数据 | `metadata` 导出与文件约定 | `next/head` |
| API 层 | Route Handlers（`route.js`） | `pages/api/*` |

选型说明：

- **新项目一律使用 App Router**：它是官方主推方向，RSC、Streaming、Server Actions 等能力只在 App Router 下完整可用。
- **存量 Pages Router 项目**：可以继续维护，官方长期支持两套体系共存；迁移可逐路由渐进进行，两种路由可在同一项目中共存。
- **阅读旧文章/旧仓库时**：凡出现 `getServerSideProps`、`_app.js`、`next/head` 等，均属 Pages Router 概念，需对照上表换算为 App Router 的对应物。

### 常见概念换算速查

阅读 Pages Router 时代的资料时，可用下表快速换算到 App Router 心智模型：

| Pages Router 写法 | App Router 对应 |
| --- | --- |
| `getStaticProps` + `revalidate` | `fetch(url, { next: { revalidate: N } })` |
| `getServerSideProps` | 路由段配置 `export const dynamic = 'force-dynamic'` + 直接 fetch |
| `getStaticPaths` | `generateStaticParams` |
| `pages/api/xxx.js` | `app/xxx/route.js`（Route Handler） |
| `next/head` | `layout.js` / `page.js` 中导出 `metadata` |
| `_app.js` 全局样式 | `app/layout.js` 中引入全局 CSS |
| `next/link` 子组件用法 | 直接 `<Link href="...">`（不再需要 `<a>` 子元素） |
| `router.query` | 页面组件接收 `params` / `searchProps`（15+ 为异步 Promise） |

### 迁移注意事项

- 两套路由可以在同一个项目中并存（`pages/` 与 `app/` 共存），`app/` 优先级更高，适合渐进式迁移；
- Context Provider、浏览器 API、事件监听等只能出现在 `"use client"` 组件中，迁移时最常见的报错都源于此；
- Server Components 中不能使用 `useState`、`useEffect`、`onClick` 等，需要交互的部分拆成子组件并标记 `"use client"`；
- `getServerSideProps` 的请求级数据，在 App Router 中默认就是动态渲染 + 不缓存，注意与 `fetch` 默认缓存语义区分。

## 学习路径建议

1. 先读 01-基础与入门（01 → 31 顺序），建立 App Router 完整心智模型；
2. 用 02-实战与部署中的项目实战把概念落地，并了解静态导出等部署形态；
3. 按需选读 03-生态与集成，围绕自己项目的认证、表单、UI、类型安全方案补齐生态；
4. 最后用 04-面试做原理复盘与自测。
