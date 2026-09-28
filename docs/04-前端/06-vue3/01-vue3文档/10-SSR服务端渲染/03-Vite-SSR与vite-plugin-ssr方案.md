---
title: Vite-SSR与vite-plugin-ssr方案
description: "Vite 提供原生 SSR 支持（双入口 + ssrLoadModule），但需要自行实现路由、数据获取和状态传递。vite-plugin-ssr（现更名 Vike）在 Vite 之上提供类 Next.js 的约定式架构，补齐这些能力。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Vite SSR 与 vite-plugin-ssr 方案

## 概述

Vite 提供原生 SSR 支持（双入口 + ssrLoadModule），但需要自行实现路由、数据获取和状态传递。vite-plugin-ssr（现更名 Vike）在 Vite 之上提供类 Next.js 的约定式架构，补齐这些能力。本文对比两种方案的架构与适用场景。

## 学习目标

- 理解 Vite SSR 的双入口架构（entry-client / entry-server）
- 掌握 vite-plugin-ssr 的约定式文件结构与核心概念
- 理解 data() / render() / passToClient 的协作机制
- 能够在 Vite SSR、vite-plugin-ssr、Nuxt3 之间做出选型

---

## 一、Vite SSR 原生方案

### 1.1 双入口架构

```
src/
├── entry-client.ts    # 客户端入口：Hydration
├── entry-server.ts    # 服务端入口：renderToString
├── App.vue
├── router.ts
└── pages/
```

```typescript
// src/entry-client.ts
import { createApp } from './main'

const { app, router } = createApp()

router.isReady().then(() => {
  app.mount('#app')   // Hydration
})
```

```typescript
// src/entry-server.ts
import { renderToString } from 'vue/server-renderer'
import { createApp } from './main'

export async function render(url: string) {
  const { app, router } = createApp()
  await router.push(url)
  await router.isReady()

  const html = await renderToString(app)
  return { html }
}
```

### 1.2 开发服务器

```javascript
// server.js
import fs from 'fs'
import path from 'path'
import express from 'express'
import { createServer as createViteServer } from 'vite'

async function createServer() {
  const app = express()

  // Vite 中间件模式
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  })
  app.use(vite.middlewares)

  app.use('*', async (req, res) => {
    const template = fs.readFileSync('index.html', 'utf-8')

    // 开发环境：通过 Vite 加载服务端入口（支持 HMR）
    const { render } = await vite.ssrLoadModule('/src/entry-server.ts')

    const { html: appHtml } = await render(req.originalUrl)
    const finalHtml = template.replace('<!--app-html-->', appHtml)

    res.status(200).set({ 'Content-Type': 'text/html' }).end(finalHtml)
  })

  app.listen(5173)
}
```

### 1.3 Vite SSR 的局限

| 需自行实现 | 说明 |
|-----------|------|
| 服务端路由匹配 | 手动将 URL 映射到页面组件 |
| 数据获取约定 | 无统一的数据预取机制 |
| 状态序列化 | 手动实现 passToClient 逻辑 |
| 构建产物处理 | 需分别构建客户端和服务端 bundle |
| 页面级代码分割 | 需自行设计 lazy loading 策略 |

适合：学习 SSR 原理、需要高度定制的框架级项目。

---

## 二、vite-plugin-ssr（Vike）方案

### 2.1 核心理念

vite-plugin-ssr 是构建在 Vite 之上的 SSR/SSG 插件，理念是"只做渲染层，不锁定框架"：

- 支持 Vue、React、Solid 等多框架
- 约定大于配置，文件即路由
- 保留 Vite 的完整插件生态
- 不引入独立 CLI，与 Vite 命令无缝集成

### 2.2 文件约定

```
renderer/
├── _default.page.server.js   # 服务端渲染逻辑（render）
├── _default.page.client.js   # 客户端 Hydration 逻辑
└── app.ts                    # 应用工厂
pages/
├── index.page.vue            # → /
├── about.page.vue            # → /about
└── users/
    └── @id.page.vue          # → /users/:id（动态路由）
```

### 2.3 数据获取：data() 导出

```typescript
// pages/users/@id.page.server.ts
export { data }

async function data(pageContext: { routeParams: { id: string } }) {
  const { id } = pageContext.routeParams
  const user = await fetchUser(id)   // 服务端执行
  return { user }
}
```

```vue
<!-- pages/users/@id.page.vue -->
<script setup lang="ts">
defineProps(['user'])   // data() 返回值作为 props 注入
</script>

<template>
  <h1>{{ user.name }}</h1>
</template>
```

### 2.4 渲染逻辑：render() 导出

```javascript
// renderer/_default.page.server.js
import { renderToString } from 'vue/server-renderer'
import { escapeInject } from 'vite-plugin-ssr/server'
import { createApp } from './app'

export { render, passToClient }

const passToClient = ['pageProps', 'initialState']

async function render(pageContext) {
  const { Page, pageProps } = pageContext
  const app = createApp(Page, pageProps)

  const pageHtml = await renderToString(app)

  return escapeInject`<!DOCTYPE html>
    <html>
      <body>
        <div id="app">${pageHtml}</div>
      </body>
    </html>`
}
```

### 2.5 客户端 Hydration

```javascript
// renderer/_default.page.client.js
import { createApp } from './app'

export { onRenderClient }

async function onRenderClient(pageContext) {
  const { Page, pageProps } = pageContext
  const app = createApp(Page, pageProps)
  app.mount('#app')
}
```

---

## 三、方案对比

| 维度 | Vite SSR | vite-plugin-ssr | Nuxt3 |
|------|----------|-----------------|-------|
| 定位 | 底层能力 | 渲染层插件 | 全功能框架 |
| 路由 | 自行实现 | 文件约定 | 文件约定 |
| 数据获取 | 自行设计 | data() 约定 | useAsyncData |
| 状态管理 | 自行序列化 | passToClient | 内置 useState |
| 框架绑定 | 无 | 无（多框架） | Vue 专属 |
| 学习成本 | 高 | 中 | 低 |
| 灵活度 | 最高 | 高 | 中 |
| 生态 | Vite 生态 | Vite 生态 | Nuxt 模块生态 |

### 选型建议

- **学习原理 / 造轮子** → Vite SSR
- **多框架团队 / 需要灵活控制** → vite-plugin-ssr (Vike)
- **Vue 项目快速落地** → Nuxt3

---

## 常见问题

**Q: vite-plugin-ssr 为什么改名为 Vike？**

项目于 2023 年更名为 Vike，npm 包为 `vike`。旧名 `vite-plugin-ssr` 仍可使用但不再更新，新项目应直接使用 Vike。

**Q: passToClient 的作用是什么？**

出于安全考虑，vite-plugin-ssr 默认不会将服务端数据发送到客户端。只有在 `passToClient` 数组中声明的 pageContext 属性才会被序列化注入到 HTML 中，防止敏感数据（如数据库密钥）泄漏。

**Q: 已有 Vite SPA 项目如何迁移到 SSR？**

推荐渐进式迁移：先引入 Vike，将现有页面逐步移入 `pages/` 目录，利用其 `.page.client.js` 和 `.page.server.js` 分离机制，逐页开启 SSR。

---

## 延伸阅读

- 上一篇：[SSR 工作原理代码实现](02-SSR工作原理代码实现.md) — 手写 SSR
- 下一篇：[vite-plugin-ssr 实战集成](04-vite-plugin-ssr实战集成.md) — Pinia 集成
- 官方文档：[Vike](https://vike.dev/)
