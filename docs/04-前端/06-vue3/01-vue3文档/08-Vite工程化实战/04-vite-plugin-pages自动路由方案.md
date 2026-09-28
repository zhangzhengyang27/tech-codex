---
title: vite-plugin-pages自动路由方案
description: "vite-plugin-pages 是基于文件系统自动生成路由的 Vite 插件，通过扫描指定目录下的 .vue 文件，自动映射为路由配置，消除手动维护路由表的重复工作。本文讲解其目录映射规则、重定向配置和路由扩展机制。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# vite-plugin-pages 自动路由方案

## 概述

vite-plugin-pages 是基于文件系统自动生成路由的 Vite 插件，通过扫描指定目录下的 `.vue` 文件，自动映射为路由配置，消除手动维护路由表的重复工作。本文讲解其目录映射规则、重定向配置和路由扩展机制。

## 学习目标

- 掌握 vite-plugin-pages 的安装配置与目录映射规则
- 熟练使用多种路由重定向方案
- 理解 extendRoute 扩展路由元信息的方式

---

## 一、插件概述

### 1.1 工作原理

```mermaid
flowchart LR
    A[扫描 pages 目录] --> B[解析文件路径]
    B --> C[生成路由配置]
    C --> D[注入 Vue Router]
```

### 1.2 安装与配置

```bash
pnpm add -D vite-plugin-pages
```

```typescript
// vite.config.ts
import Pages from 'vite-plugin-pages'

export default defineConfig({
  plugins: [
    vue(),
    Pages({
      dirs: ['src/pages'],
      extensions: ['vue'],
      exclude: ['**/components/**'],
    })
  ]
})
```

### 1.3 目录与路由映射

```
src/pages/
├── index.vue            →  { path: '/' }
├── about.vue            →  { path: '/about' }
├── user/
│   ├── index.vue        →  { path: '/user' }
│   ├── profile.vue      →  { path: '/user/profile' }
│   └── [id].vue         →  { path: '/user/:id' }
└── [...path].vue        →  { path: '/:pathMatch(.*)*' }  (404)
```

映射规则：

| 文件命名 | 路由路径 | 说明 |
|---------|---------|------|
| `index.vue` | `/` 或父路径 | 目录默认页 |
| `about.vue` | `/about` | 普通页面 |
| `[id].vue` | `/:id` | 动态参数 |
| `[...path].vue` | `/:path(.*)*` | 通配符（404） |

---

## 二、路由重定向方案

### 2.1 方案对比

| 方案 | 配置位置 | 特点 |
|------|---------|------|
| 编程式导航 | 组件内 `onMounted` | 通用、速度快 |
| `<route>` SFC 块 | 组件内自定义块 | 逻辑清晰 |
| `<route>` JSON | 组件内 JSON 块 | 纯声明式 |
| 入口文件逻辑 | main.ts | 全局统一处理 |
| extendRoute | vite.config.ts | 配置文件级扩展 |

### 2.2 编程式导航（推荐）

```vue
<!-- src/pages/home.vue -->
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
onMounted(() => router.push('/'))
</script>
```

### 2.3 `<route>` 自定义块

```vue
<!-- src/pages/home.vue -->
<route lang="yaml">
redirect: '/'
</route>

<template>
  <div>正在跳转...</div>
</template>
```

### 2.4 extendRoute 配置级扩展

```typescript
// vite.config.ts
Pages({
  extendRoute(route) {
    if (route.path === '/home') {
      return { ...route, redirect: '/' }
    }
    return route
  }
})
```

---

## 三、路由元信息

### 3.1 通过 `<route>` 块设置 meta

```vue
<route lang="yaml">
meta:
  requiresAuth: true
  title: 用户中心
</route>
```

### 3.2 通过 extendRoute 设置

```typescript
Pages({
  extendRoute(route) {
    return {
      ...route,
      meta: {
        ...route.meta,
        title: route.name,
      }
    }
  }
})
```

---

## 四、使用生成的路由

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router'
import routes from '~pages'  // 插件提供的虚拟模块

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
```

`~pages` 是插件注册的虚拟模块，编译时替换为自动生成的路由数组。

---

## 常见问题

**Q: 如何排除某些文件不生成路由？**

使用 `exclude` 配置项，支持 glob 模式：`exclude: ['**/components/**', '**/_*.vue']`。以下划线开头的文件通常作为布局组件而非页面。

**Q: 嵌套路由如何生成？**

目录嵌套自动映射为嵌套路由。`user/profile.vue` 生成 `/user/profile`；如需父布局路由，应在与 `user/` 目录同级放置同名 `user.vue` 作为父路由组件包裹子路由（vite-plugin-pages 没有 `_layout.vue` 布局约定，`_` 前缀仅在 `routeStyle: 'nuxt'` 下表示动态参数）。

---

## 延伸阅读

- 上一篇：[Vue Router 基础回顾与改造思考](03-Vue-Router基础回顾与改造思考.md) — 路由基础
- 下一篇：[unplugin-vue-router 类型安全路由方案](05-unplugin-vue-router类型安全路由方案.md) — 类型安全路由
- 官方仓库：[vite-plugin-pages](https://github.com/hannoeru/vite-plugin-pages)
