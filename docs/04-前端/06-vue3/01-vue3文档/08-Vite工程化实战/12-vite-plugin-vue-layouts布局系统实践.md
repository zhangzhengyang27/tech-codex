---
title: vite-plugin-vue-layouts布局系统实践
description: "vite-plugin-vue-layouts 为文件系统路由提供布局系统支持，通过约定式目录将布局组件与页面组件解耦。页面可通过 <route> 块声明使用的布局，实现多布局切换而无需嵌套路由。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# vite-plugin-vue-layouts 布局系统实践

## 概述

vite-plugin-vue-layouts 为文件系统路由提供布局系统支持，通过约定式目录将布局组件与页面组件解耦。页面可通过 `<route>` 块声明使用的布局，实现多布局切换而无需嵌套路由。

## 学习目标

- 掌握 vite-plugin-vue-layouts 的安装与目录约定
- 理解布局与页面的组合机制
- 学会在页面中指定和切换布局

---

## 一、核心概念

### 1.1 布局的作用

布局是包裹页面的外壳结构（Header、Sidebar、Footer），不同页面可能使用不同布局：

| 布局 | 适用页面 |
|------|---------|
| default | 常规内容页 |
| auth | 登录/注册页（无导航栏） |
| admin | 后台管理页（侧边栏） |
| blank | 空白页（全屏展示） |

### 1.2 目录约定

```
src/
├── layouts/
│   ├── default.vue      # 默认布局
│   ├── auth.vue         # 认证布局
│   └── admin.vue        # 管理后台布局
└── pages/
    ├── index.vue        # 使用 default 布局
    ├── login.vue        # 使用 auth 布局
    └── dashboard.vue    # 使用 admin 布局
```

---

## 二、安装与配置

### 2.1 安装

```bash
pnpm add -D vite-plugin-vue-layouts
```

### 2.2 Vite 配置

```typescript
// vite.config.ts
import Layouts from 'vite-plugin-vue-layouts'

export default defineConfig({
  plugins: [
    vue(),
    Pages({ /* ... */ }),
    Layouts({
      layoutsDirs: 'src/layouts',
      defaultLayout: 'default',
    }),
  ],
})
```

### 2.3 入口配置

```typescript
// main.ts
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { setupLayouts } from 'virtual:generated-layouts'
import routes from '~pages'

const router = createRouter({
  history: createWebHistory(),
  routes: setupLayouts(routes),  // 将布局注入路由
})

createApp(App).use(router).mount('#app')
```

---

## 三、布局组件编写

### 3.1 默认布局

```vue
<!-- src/layouts/default.vue -->
<template>
  <div class="layout-default">
    <AppHeader />
    <main class="container mx-auto p-4">
      <router-view />
    </main>
    <AppFooter />
  </div>
</template>
```

### 3.2 认证布局

```vue
<!-- src/layouts/auth.vue -->
<template>
  <div class="layout-auth min-h-screen flex items-center justify-center">
    <router-view />
  </div>
</template>
```

---

## 四、页面指定布局

### 4.1 通过 `<route>` 块

```vue
<!-- src/pages/login.vue -->
<route lang="yaml">
meta:
  layout: auth
</route>

<template>
  <div class="login-form">
    <!-- 登录表单 -->
  </div>
</template>
```

### 4.2 默认布局

未指定 layout 的页面自动使用 `defaultLayout` 配置的布局（默认 `default`）。

### 4.3 禁用布局

```vue
<route lang="yaml">
meta:
  layout: false
</route>
```

---

## 常见问题

**Q: 布局切换时有过渡动画吗？**

可以通过在布局组件中包裹 `<Transition>` 实现。也可在 App.vue 的 `<router-view>` 外使用 `<Transition>` 配合路由 meta 实现页面级过渡。

**Q: 嵌套布局支持吗？**

不直接支持。如需嵌套布局，建议在布局组件内部手动引入子布局组件，或使用嵌套路由替代。

---

## 延伸阅读

- 上一篇：[UnoCSS 图标集成方案](11-UnoCSS图标集成方案.md) — 图标系统
- 下一篇：[Vue Macros 宏与语法糖扩展实践](13-Vue-Macros宏与语法糖扩展实践.md) — 语法扩展
- 官方仓库：[vite-plugin-vue-layouts](https://github.com/JohnCampionJr/vite-plugin-vue-layouts)
