---
title: Nuxt3自动导入与Mock-Server配置实践
description: "Nuxt3 内置组件、组合式函数和 Vue API 的自动导入能力，并通过 Nitro Server API 替代传统 Mock 方案。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Nuxt3 自动导入与 Mock Server 配置实践

## 概述

Nuxt3 内置组件、组合式函数和 Vue API 的自动导入能力，并通过 Nitro Server API 替代传统 Mock 方案。本文讲解自动导入的扩展配置（Pinia / VueUse）和 server/api 目录的 Mock 数据实践。

## 学习目标

- 理解 Nuxt3 自动导入的工作机制与内置范围
- 掌握 Pinia、VueUse 的自动导入配置
- 学会使用 server/api 目录编写 Mock 接口
- 对比 Nuxt3 与纯 Vite 项目的工程化差异

---

## 一、Nuxt3 内置集成清单

| 功能 | Nuxt3 | 纯 Vite 项目 |
|------|-------|-------------|
| 组件自动导入 | 内置（components/ 目录） | 需 unplugin-vue-components |
| 文件路由 | 内置（pages/ 目录） | 需 unplugin-vue-router |
| 布局系统 | 内置（layouts/ 目录） | 需 vite-plugin-vue-layouts |
| Vue API 自动导入 | 内置（ref/computed 等） | 需 unplugin-auto-import |
| Mock Server | 内置 Server API | 需 vite-plugin-mock |
| Sass | 安装即用 | 安装即用 |

---

## 二、自动导入扩展配置

### 2.1 Pinia 自动导入

安装 `@pinia/nuxt` 模块后，配置 Store 自动导入：

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@pinia/nuxt'],
  imports: {
    dirs: ['stores'],   // stores 目录下的导出自动可用
  },
})
```

```typescript
// stores/user.ts — 无需手动导入 defineStore
export const useUserStore = defineStore('user', () => {
  const name = ref('John')
  const isLoggedIn = computed(() => !!name.value)
  return { name, isLoggedIn }
})
```

```vue
<!-- 页面中直接使用，无需 import -->
<script setup lang="ts">
const userStore = useUserStore()
</script>
```

### 2.2 VueUse 集成

```bash
pnpm add @vueuse/nuxt @vueuse/core
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@vueuse/nuxt'],
})
```

```vue
<script setup lang="ts">
// useMouse、useStorage 等自动可用
const { x, y } = useMouse()
const saved = useStorage('my-key', 'default')
</script>
```

### 2.3 自定义组合式函数

`composables/` 目录下的导出自动注册：

```typescript
// composables/useGreeting.ts
export function useGreeting(name: string) {
  return computed(() => `你好，${name}`)
}
```

```vue
<script setup lang="ts">
// 直接使用，无需 import
const greeting = useGreeting('Nuxt')
</script>
```

---

## 三、Server API Mock 数据

### 3.1 创建 Mock 接口

```typescript
// server/api/users.get.ts
export default defineEventHandler(() => {
  return [
    { id: 1, name: '张三', role: 'admin' },
    { id: 2, name: '李四', role: 'user' },
    { id: 3, name: '王五', role: 'user' },
  ]
})
```

```typescript
// server/api/users/[id].get.ts
export default defineEventHandler((event) => {
  const id = getRouterParam(event, 'id')
  return { id: Number(id), name: '张三', role: 'admin' }
})
```

```typescript
// server/api/login.post.ts
export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (body.username === 'admin' && body.password === '123456') {
    return { token: 'mock-jwt-token', user: { name: 'admin' } }
  }
  throw createError({ statusCode: 401, message: '认证失败' })
})
```

### 3.2 页面中消费

```vue
<script setup lang="ts">
// useFetch 自动处理 SSR 数据预取 + 客户端复用
const { data: users } = await useFetch('/api/users')

async function handleLogin() {
  const res = await $fetch('/api/login', {
    method: 'POST',
    body: { username: 'admin', password: '123456' },
  })
}
</script>
```

### 3.3 文件命名约定

| 文件名 | 方法 | 路径 |
|--------|------|------|
| `users.get.ts` | GET | /api/users |
| `users.post.ts` | POST | /api/users |
| `users/[id].get.ts` | GET | /api/users/:id |
| `login.post.ts` | POST | /api/login |

### 3.4 对比 vite-plugin-mock

| 维度 | Nuxt Server API | vite-plugin-mock |
|------|-----------------|------------------|
| 运行环境 | Nitro（可独立部署） | 仅 Vite Dev Server |
| 生产可用 | 可直接作为真实 API | 仅开发环境 |
| 类型安全 | 完整 TypeScript | 需手动声明 |
| 迁移成本 | Mock → 真实 API 无缝切换 | 需重写 |

---

## 四、PWA 验证

配置 `@vite-pwa/nuxt` 后的验证步骤：

1. 打开 DevTools → Application 面板
2. Service Workers：确认 sw.js 已激活
3. Cache Storage：确认缓存文件存在
4. Manifest：确认应用清单正确加载

---

## 常见问题

**Q: 自动导入会影响 Tree Shaking 吗？**

不会。Nuxt 的自动导入在构建时静态分析，未使用的导入不会进入最终 bundle。`.nuxt/imports.d.ts` 提供完整类型声明。

**Q: components 目录下的组件名如何生成？**

默认使用路径拼接的 PascalCase 名称：`components/base/Button.vue` → `<BaseButton />`。可通过 `pathPrefix: false` 关闭路径前缀。

**Q: server/api 的 Mock 数据如何按环境切换？**

结合 runtimeConfig 环境变量：开发环境返回 Mock 数据，生产环境调用真实服务。或利用 Nitro 的 `routeRules` 按环境代理到不同后端。

---

## 延伸阅读

- 上一篇：[Nuxt DevTools 开发工具详解](04-Nuxt-DevTools开发工具详解.md) — 开发工具
- 下一篇：[Nuxt3 环境变量与 Runtime 配置实践](06-Nuxt3环境变量与Runtime配置实践.md) — 环境配置
- 相关：[vite-plugin-mock 数据模拟实践](../08-Vite工程化实战/16-vite-plugin-mock数据模拟实践.md) — Vite Mock 方案
