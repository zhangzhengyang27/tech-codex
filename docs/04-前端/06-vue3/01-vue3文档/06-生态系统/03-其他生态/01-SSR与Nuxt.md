---
title: SSR与Nuxt
description: "服务端渲染是指页面的 HTML 在服务器端生成，然后发送到客户端。与之相对的是客户端渲染（CSR），页面的 HTML 在浏览器中通过 JavaScript 动态生成。"
keywords: [SSR与Nuxt]
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# SSR 与 Nuxt

> 服务端渲染（Server-Side Rendering）可以提升首屏加载性能、改善 SEO、优化用户体验。Nuxt 3 是 Vue 3 生态中最成熟的 SSR 框架。

## 一、SSR 基础概念

### 什么是 SSR？

服务端渲染是指页面的 HTML 在服务器端生成，然后发送到客户端。与之相对的是客户端渲染（CSR），页面的 HTML 在浏览器中通过 JavaScript 动态生成。

### SSR vs CSR 对比

| 对比项 | SSR（服务端渲染） | CSR（客户端渲染） |
|--------|-------------------|-------------------|
| **首屏加载** | 快（HTML 直接可渲染） | 慢（需等待 JS 执行） |
| **SEO** | 友好（爬虫可获取完整内容） | 不友好（需爬虫执行 JS） |
| **服务器负载** | 高（每次请求都渲染） | 低（返回静态文件） |
| **开发复杂度** | 高（需处理服务端逻辑） | 低 |
| **TTFP** | 快 | 慢 |
| **TTI** | 慢（需注水） | 快 |

### SSR 工作流程

```
客户端请求
    ↓
服务端渲染 Vue 组件 → 生成 HTML
    ↓
返回完整 HTML 到客户端
    ↓
客户端加载 JS
    ↓
注水（Hydration）→ 页面可交互
```

### 使用 @vue/server-renderer

最基础的 SSR 实现：

```js
// server.js
import { createSSRApp } from 'vue'
import { renderToString } from '@vue/server-renderer'

// 创建应用实例
const app = createSSRApp({
  template: `<div @click="count++">{{ message }} - {{ count }}</div>`,
  data() {
    return {
      message: 'Hello SSR',
      count: 0
    }
  }
})

// 渲染为 HTML 字符串
const html = await renderToString(app)
console.log(html) // <div>Hello SSR - 0</div>
```

---

## 二、Nuxt 3 核心特性

### 创建项目

```bash
# 方式一：使用 nuxi CLI
npx nuxi init my-nuxt-app

# 方式二：使用 npx
npx nuxi@latest init my-nuxt-app

cd my-nuxt-app
npm install
npm run dev
```

### 目录结构详解

```
my-nuxt-app/
├── .nuxt/              # 构建生成的临时文件（自动生成）
├── .output/            # 构建输出目录（生产环境）
├── app.vue             # 根组件
├── nuxt.config.ts      # Nuxt 配置文件
├── app.config.ts       # 运行时配置
├── error.vue           # 错误页面
│
├── pages/              # 页面路由（基于文件系统）
│   ├── index.vue       # 首页 /
│   ├── about.vue       # /about
│   └── user/
│       ├── index.vue   # /user
│       └── [id].vue    # /user/:id 动态路由
│
├── components/         # 自动导入的组件
│   ├── TheHeader.vue
│   └── user/
│       └── UserCard.vue
│
├── composables/        # 自动导入的组合式函数
│   └── useUser.ts
│
├── layouts/            # 布局组件
│   ├── default.vue     # 默认布局
│   └── admin.vue       # admin 布局
│
├── plugins/            # 插件（自动注册）
│   └── my-plugin.ts
│
├── middleware/         # 路由中间件
│   ├── auth.ts         # 认证中间件
│   └── admin.ts
│
├── server/             # 服务端代码
│   ├── api/            # API 路由
│   │   └── users.ts    # /api/users
│   ├── routes/         # 服务端路由
│   └── middleware/     # 服务端中间件
│
├── assets/             # 需要构建的静态资源
│   └── css/
│       └── main.css
│
├── public/             # 静态文件（不经过构建）
│   ├── favicon.ico
│   └── images/
│
└── utils/              # 工具函数（自动导入）
    └── helpers.ts
```

### 自动导入

Nuxt 3 自动导入以下内容，无需手动 import：

```vue
<script setup>
// 自动导入的组合式函数
const route = useRoute()          // 来自 #app
const router = useRouter()        // 来自 #app
const colorMode = useColorMode()  // 来自 composable
const user = useUser()            // 来自 composables/useUser.ts

// 自动导入的组件
// <MyComponent /> 自动来自 components/MyComponent.vue
</script>
```

**配置自动导入**：

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  imports: {
    dirs: [
      // 扫描 composables 目录
      'composables',
      // 扫描 composables 子目录
      'composables/**'
    ]
  }
})
```

---

## 三、页面路由系统

### 基础路由

```vue
<!-- pages/index.vue -->
<template>
  <div>
    <h1>首页</h1>
    <NuxtLink to="/about">关于我们</NuxtLink>
  </div>
</template>
```

```vue
<!-- pages/about.vue -->
<template>
  <div>
    <h1>关于页面</h1>
    <NuxtLink to="/">返回首页</NuxtLink>
  </div>
</template>
```

### 动态路由

```vue
<!-- pages/user/[id].vue -->
<script setup>
const route = useRoute()
const id = route.params.id

// 响应式监听路由变化
watch(() => route.params.id, (newId) => {
  console.log('ID changed:', newId)
})
</script>

<template>
  <div>用户 ID: {{ id }}</div>
</template>
```

### 嵌套路由

```vue
<!-- pages/user.vue (父路由) -->
<template>
  <div>
    <h1>用户中心</h1>
    <nav>
      <NuxtLink to="/user">概览</NuxtLink>
      <NuxtLink to="/user/profile">资料</NuxtLink>
      <NuxtLink to="/user/settings">设置</NuxtLink>
    </nav>
    <NuxtPage />
  </div>
</template>
```

```vue
<!-- pages/user/index.vue -->
<template>
  <div>用户概览</div>
</template>

<!-- pages/user/profile.vue -->
<template>
  <div>用户资料</div>
</template>
```

### 路由中间件

```ts
// middleware/auth.ts
export default defineNuxtRouteMiddleware((to, from) => {
  const isAuthenticated = useState('auth')
  
  if (!isAuthenticated.value) {
    return navigateTo('/login')
  }
})
```

```vue
<!-- pages/admin.vue -->
<script setup>
definePageMeta({
  middleware: 'auth'
})
</script>

<template>
  <div>管理后台</div>
</template>
```

---

## 四、数据获取

### useFetch - 推荐方式

```vue
<script setup>
// 自动处理 SSR、响应式、去重
const { data, pending, error, refresh } = await useFetch('/api/users')

// 带参数
const { data: user } = await useFetch(`/api/user/${id}`)

// 带选项
const { data: posts } = await useFetch('/api/posts', {
  method: 'POST',
  body: { title: 'Hello' },
  headers: {
    'Authorization': 'Bearer token'
  },
  // 响应式参数
  query: {
    page: 1,
    limit: 10
  }
})
</script>

<template>
  <div v-if="pending">加载中...</div>
  <div v-else-if="error">错误: {{ error.message }}</div>
  <div v-else>
    <button @click="refresh">刷新</button>
    <pre>{{ data }}</pre>
  </div>
</template>
```

### useAsyncData - 更灵活

```vue
<script setup>
const { data, pending, error } = await useAsyncData(
  'users',           // 唯一 key，用于缓存
  () => $fetch('/api/users'),
  {
    // 配置选项
    lazy: false,           // 是否懒加载
    immediate: true,       // 是否立即执行
    server: true,          // 是否在服务端执行
    default: () => [],     // 默认值
    transform: (result) => result.data  // 转换数据
  }
)
</script>
```

### 懒加载版本

```vue
<script setup>
// useLazyFetch - 不阻塞导航
const { data, pending } = useLazyFetch('/api/users')

// useLazyAsyncData
const { data: posts } = useLazyAsyncData('posts', () => $fetch('/api/posts'))
</script>

<template>
  <div v-if="pending">加载中...</div>
  <div v-else>{{ data }}</div>
</template>
```

### $fetch - 直接请求

```vue
<script setup>
// 适合非响应式场景，如事件处理
async function handleSubmit() {
  const result = await $fetch('/api/submit', {
    method: 'POST',
    body: formData
  })
}
</script>
```

---

## 五、服务端 API 开发

### 创建 API 路由

```ts
// server/api/users.ts
export default defineEventHandler((event) => {
  return {
    users: [
      { id: 1, name: '张三' },
      { id: 2, name: '李四' }
    ]
  }
})

// 访问：GET /api/users
```

### RESTful API

```ts
// server/api/users/[id].ts
export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const id = getRouterParam(event, 'id')
  
  // 获取请求体
  const body = await readBody(event)
  
  // 获取查询参数
  const query = getQuery(event)
  
  switch (method) {
    case 'GET':
      return { id, name: '张三' }
    
    case 'PUT':
      return { id, ...body, updated: true }
    
    case 'DELETE':
      setResponseStatus(event, 204)
      return null
    
    default:
      throw createError({
        statusCode: 405,
        statusMessage: 'Method Not Allowed'
      })
  }
})
```

### 连接数据库示例

```ts
// server/utils/db.ts
import { MongoClient } from 'mongodb'

let client: MongoClient

export async function useDatabase() {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI!)
    await client.connect()
  }
  return client.db('myapp')
}
```

```ts
// server/api/posts.ts
export default defineEventHandler(async (event) => {
  const db = await useDatabase()
  const posts = await db.collection('posts').find({}).toArray()
  return posts
})
```

### 服务端中间件

```ts
// server/middleware/auth.ts
export default defineEventHandler(async (event) => {
  const url = event.path
  
  // 排除公开路由
  if (url?.startsWith('/api/auth')) {
    return
  }
  
  const token = getHeader(event, 'Authorization')
  
  if (!token) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }
  
  // 验证 token...
  event.context.user = await verifyToken(token)
})
```

---

## 六、状态管理

### useState - 跨组件状态

```vue
<script setup>
// 创建/获取响应式状态
const counter = useState('counter', () => 0)

function increment() {
  counter.value++
}
</script>

<template>
  <div>
    <p>计数: {{ counter }}</p>
    <button @click="increment">+1</button>
  </div>
</template>
```

### 组合式函数封装

```ts
// composables/useAuth.ts
export const useAuth = () => {
  const user = useState<User | null>('user', () => null)
  const token = useCookie('auth-token')
  
  async function login(credentials: LoginCredentials) {
    const response = await $fetch('/api/auth/login', {
      method: 'POST',
      body: credentials
    })
    
    user.value = response.user
    token.value = response.token
  }
  
  function logout() {
    user.value = null
    token.value = null
    navigateTo('/login')
  }
  
  const isLoggedIn = computed(() => !!user.value)
  
  return {
    user,
    token,
    login,
    logout,
    isLoggedIn
  }
}
```

---

## 七、布局系统

### 默认布局

```vue
<!-- layouts/default.vue -->
<template>
  <div class="app">
    <TheHeader />
    <main class="content">
      <slot />
    </main>
    <TheFooter />
  </div>
</template>
```

### 自定义布局

```vue
<!-- layouts/admin.vue -->
<template>
  <div class="admin-layout">
    <AdminSidebar />
    <div class="admin-content">
      <slot />
    </div>
  </div>
</template>
```

```vue
<!-- pages/admin/dashboard.vue -->
<script setup>
definePageMeta({
  layout: 'admin'
})
</script>

<template>
  <div>管理后台仪表盘</div>
</template>
```

### 禁用布局

```vue
<script setup>
definePageMeta({
  layout: false
})
</script>
```

---

## 八、插件系统

### 创建插件

```ts
// plugins/my-plugin.ts
export default defineNuxtPlugin((nuxtApp) => {
  // 提供全局方法
  return {
    provide: {
      myHelper: (value: string) => {
        return `Helper: ${value}`
      }
    }
  }
})
```

```vue
<script setup>
// 使用插件提供的功能
const { $myHelper } = useNuxtApp()
const result = $myHelper('test')
</script>
```

### 注入第三方库

```ts
// plugins/dayjs.ts
import dayjs from 'dayjs'

export default defineNuxtPlugin((nuxtApp) => {
  return {
    provide: {
      dayjs
    }
  }
})
```

### 仅客户端插件

```ts
// plugins/client-only.ts
export default defineNuxtPlugin((nuxtApp) => {
  // 仅在客户端执行
  if (process.client) {
    console.log('Client side only')
  }
})
```

---

## 九、SEO 优化

### useHead - 动态设置 Head

```vue
<script setup>
useHead({
  title: '我的应用',
  meta: [
    { name: 'description', content: '这是应用描述' },
    { name: 'keywords', content: 'Vue, Nuxt, SSR' },
    { property: 'og:title', content: '我的应用' },
    { property: 'og:description', content: '这是应用描述' },
    { property: 'og:image', content: 'https://example.com/image.png' }
  ],
  link: [
    { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
  ]
})
</script>
```

### 响应式 Head

```vue
<script setup>
const title = ref('首页')

// 标题变化时自动更新
setTimeout(() => {
  title.value = '新标题'
}, 3000)

useHead({
  title,
  titleTemplate: (title) => `${title} | 我的应用`
})
</script>
```

### 页面级 SEO

```vue
<script setup>
// 基于数据动态生成 SEO 信息
const { data: article } = await useFetch('/api/article/1')

useHead({
  title: article.value?.title,
  meta: [
    { 
      name: 'description', 
      content: article.value?.summary 
    },
    {
      property: 'og:image',
      content: article.value?.coverImage
    }
  ]
})
</script>
```

---

## 十、配置详解

### nuxt.config.ts

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  // 基础配置
  devtools: { enabled: true },
  ssr: true,  // 启用 SSR
  
  // 全局 CSS
  css: ['~/assets/css/main.css'],
  
  // 运行时配置
  runtimeConfig: {
    // 服务端私有配置
    apiSecret: process.env.API_SECRET,
    
    // 公开配置（客户端可访问）
    public: {
      apiBase: process.env.API_BASE_URL || 'http://localhost:3000/api'
    }
  },
  
  // 应用配置
  app: {
    head: {
      title: '我的应用',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' }
      ]
    }
  },
  
  // 模块
  modules: [
    '@pinia/nuxt',
    '@nuxtjs/tailwindcss'
  ],
  
  // Vite 配置
  vite: {
    // Vite 选项
  },
  
  // Nitro 配置（服务端引擎）
  nitro: {
    preset: 'vercel'  // 部署目标
  }
})
```

### 环境变量

```env
# .env
API_SECRET=my-secret-key
API_BASE_URL=https://api.example.com
```

```ts
// 使用环境变量
const config = useRuntimeConfig()

// 服务端
console.log(config.apiSecret)

// 客户端
console.log(config.public.apiBase)
```

---

## 十一、部署方案

### 静态部署（预渲染）

```bash
# 构建
npm run generate

# 输出到 .output/public
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  // 路由预渲染配置
  nitro: {
    prerender: {
      routes: ['/', '/about', '/contact'],
      crawlLinks: true  // 自动爬取链接
    }
  }
})
```

### Node.js 服务器部署

```bash
# 构建
npm run build

# 启动
node .output/server/index.mjs

# 或使用 PM2
pm2 start .output/server/index.mjs --name "nuxt-app"
```

### Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV HOST 0.0.0.0
ENV PORT 3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
```

```bash
# 构建镜像
docker build -t nuxt-app .

# 运行容器
docker run -p 3000:3000 nuxt-app
```

### Vercel 部署

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    preset: 'vercel'
  }
})
```

### Netlify 部署

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    preset: 'netlify'
  }
})
```

---

## 十二、性能优化

### 代码分割

Nuxt 3 自动进行代码分割，每个页面生成独立的 chunk。

### 图片优化

```vue
<script setup>
// 使用 Nuxt Image 模块
</script>

<template>
  <NuxtImg 
    src="/images/hero.jpg"
    width="600"
    height="400"
    format="webp"
    loading="lazy"
    alt="Hero image"
  />
</template>
```

### 缓存策略

```ts
// server/api/cached.ts
export default defineCachedEventHandler(
  async (event) => {
    return { data: 'This is cached' }
  },
  {
    maxAge: 60 * 60,  // 缓存 1 小时
    swr: true,        // Stale-While-Revalidate
    getKey: (event) => event.path
  }
)
```

### 性能监控

```ts
// plugins/performance.ts
export default defineNuxtPlugin(() => {
  if (process.client && 'PerformanceObserver' in window) {
    // 监控 FCP
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      console.log('FCP:', entries[0].startTime)
    })
    fcpObserver.observe({ entryTypes: ['paint'] })
  }
})
```

---

## 十三、常见问题

### Q1: Hydration 不匹配错误

**原因**：服务端渲染的 HTML 与客户端渲染结果不一致。

**解决方案**：

```vue
<script setup>
// 方式一：使用 ClientOnly 组件包裹
</script>

<template>
  <ClientOnly>
    <div>{{ Date.now() }}</div>
  </ClientOnly>
</template>
```

```vue
<script setup>
// 方式二：使用 onMounted 确保只在客户端执行
const now = ref(0)
onMounted(() => {
  now.value = Date.now()
})
</script>
```

### Q2: 如何访问 window/document？

```vue
<script setup>
// 错误：服务端会报错
// console.log(window.innerWidth)

// 正确：只在客户端执行
onMounted(() => {
  console.log(window.innerWidth)
})

// 或使用 process.client 判断
if (process.client) {
  console.log(document.title)
}
</script>
```

### Q3: 如何使用第三方库？

```ts
// plugins/third-party.ts
import ThirdLibrary from 'third-library'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.provide('thirdLibrary', ThirdLibrary)
})
```

### Q4: 开发环境跨域问题？

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    devProxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
```

---

> 以下为深度补充内容，涵盖源码分析、性能优化和生产级实践。

## 十四、SSR 渲染原理解析

### @vue/server-renderer 核心架构

Vue 3 的服务端渲染由 `@vue/server-renderer` 包提供，其核心流程为：组件 vnode 树 -> 服务端组件渲染 -> HTML 字符串输出。理解这一流程，需要从源码层面剖析 `renderToString` 和 `renderToStream` 的实现。

### renderToString 简化源码分析

以下为 `@vue/server-renderer` 中 `renderToString` 的核心逻辑简化版：

```typescript
// 简化版 renderToString 实现
import { createVNode, SSRContext } from 'vue'
import type { App, VNode } from 'vue'

interface SSRContext {
  teleports: Record<string, string>
  modules: Set<string>
}

export async function renderToString(
  input: App | VNode,
  context: SSRContext = { teleports: {}, modules: new Set() }
): Promise<string> {
  // 1. 如果传入的是 App 实例，获取其根组件并创建 vnode
  const vnode: VNode = isApp(input)
    ? createVNode(input._component, input._props || {})
    : input

  // 2. 递归渲染 vnode 树为 HTML 字符串
  let html = await renderComponentVNode(vnode, context, null)

  // 3. 处理 Teleport 组件（插入到对应的目标位置）
  if (Object.keys(context.teleports).length > 0) {
    const teleportHtml = Object.entries(context.teleports)
      .map(([target, content]) => `<template data-teleport="${target}">${content}</template>`)
      .join('')
    html += teleportHtml
  }

  return html
}
```

`renderToString` 的核心流程分三步：vnode 生成、组件树递归渲染、Teleport 后处理。

### 组件 vnode 到 HTML 字符串的转换过程

这是 SSR 渲染的核心引擎部分：

```typescript
// 简化版 renderComponentVNode
async function renderComponentVNode(
  vnode: VNode,
  context: SSRContext,
  parent: VNode | null
): Promise<string> {
  const { type, props, children } = vnode

  // 1. 处理内置类型（Text, Comment, Fragment）
  if (typeof type === 'symbol') {
    if (type === Text) return escapeHtml(String(children))
    if (type === Comment) return `<!--${children}-->`
    if (type === Fragment) return renderFragment(children, context)
  }

  // 2. type 为字符串 → 原生 HTML 元素
  if (typeof type === 'string') {
    return renderElement(type, props, children, context)
  }

  // 3. type 为对象/函数 → Vue 组件，递归实例化
  const component = type as any
  const instance = createComponentInstance(component, props)
  await setupComponent(instance)

  // 执行 serverPrefetch 生命周期钩子
  if (instance.type.serverPrefetch) {
    await instance.type.serverPrefetch.call(instance.proxy)
  }

  // 递归渲染组件的子树
  const subTree = instance.render.call(instance.proxy)
  return renderComponentVNode(subTree, context, vnode)
}
```

### HTML 元素渲染过程

元素渲染是 SSR 中最频繁的操作，需要处理属性序列化和子节点递归：

```typescript
// 简化版原生元素渲染
async function renderElement(
  tag: string,
  props: Record<string, any> | null,
  children: any,
  context: SSRContext
): Promise<string> {
  let html = `<${tag}`

  if (props) {
    for (const key in props) {
      const value = props[key]
      // 跳过事件处理器（onXxx 前缀），SSR 不处理事件
      if (key[0] === 'o' && key[1] === 'n') continue
      // 跳过值为 null/undefined/false 的属性
      if (value == null || value === false) continue
      // 布尔属性只输出属性名
      if (value === true) {
        html += ` ${key}`
        continue
      }
      // 序列化属性值
      html += ` ${key}="${escapeHtml(String(value))}"`
    }
  }

  // 自闭合标签
  const isVoid = isVoidElement(tag) // area, base, br, col, embed, hr, img, input, link, meta, source, track, wbr
  if (isVoid) {
    return html + `>`
  }

  html += `>`

  // 递归处理子节点
  if (children != null) {
    const childrenArr = Array.isArray(children) ? children : [children]
    for (const child of childrenArr) {
      if (typeof child === 'string') {
        html += escapeHtml(child)
      } else if (typeof child === 'number') {
        html += String(child)
      } else if (child && typeof child === 'object') {
        html += await renderComponentVNode(child as VNode, context, null)
      }
    }
  }

  html += `</${tag}>`
  return html
}

const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr',
  'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'
])
const isVoidElement = (tag: string) => VOID_ELEMENTS.has(tag)
```

### HTML 转义函数

```typescript
// 简化版 HTML 转义
const ESCAPE_RE = /["&'<>]/g

function escapeHtml(str: string): string {
  return str.replace(ESCAPE_RE, (char) => {
    switch (char) {
      case '&': return '&amp;'
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '"': return '&quot;'
      case "'": return '&#39;'
      default:  return char
    }
  })
}
```

### renderToStream 的内部工作机制

`renderToStream` 是一种渐进式渲染方式，对比传统 `renderToString` 的显著优势在于利用 Node.js 的 Stream API 边渲染边发送，减少 TTFB（Time to First Byte）。

```typescript
// 简化版 renderToStream
import { Readable } from 'stream'

export function renderToStream(
  app: App,
  context?: SSRContext
): Readable & { pipe: Function } {
  const stream = new Readable({ read() {} })
  const ctx = context || { teleports: {}, modules: new Set() }

  // 异步推进渲染
  ;(async () => {
    try {
      // 先推入 HTML 头部（已渲染好的部分）
      const vnode = createVNode(app._component, app._props || {})
      const { buffer, push } = createBufferRenderer(stream)

      // 深度优先遍历渲染，每完成一个节点就推入流
      await renderToStreamInternal(vnode, ctx, push)
      buffer.flush()

      // 推入尾部（script 标签等）
      stream.push(null) // 结束流
    } catch (error) {
      stream.emit('error', error)
    }
  })()

  return stream
}

// 缓冲渲染器：减少 stream push 次数，提高吞吐量
function createBufferRenderer(stream: Readable) {
  const BUFFER_SIZE = 4096 // 4KB 缓冲
  let buffer = ''

  return {
    push(html: string) {
      buffer += html
      if (buffer.length >= BUFFER_SIZE) {
        stream.push(buffer)
        buffer = ''
      }
    },
    flush() {
      if (buffer.length > 0) {
        stream.push(buffer)
        buffer = ''
      }
    }
  }
}
```

### 流式渲染的适用场景

流式渲染对以下场景收益显著：页面内容较多且上方内容不需要等待下方渲染结果；后端 API 响应较慢（可先输出静态骨架，数据到达后再追加）；同时可结合 Suspense 组件实现渐进式加载。

```vue
<!-- 结合 Suspense 实现渐进式流式渲染 -->
<script setup lang="ts">
const AsyncComments = defineAsyncComponent(() =>
  import('./Comments.vue')
)
</script>

<template>
  <div>
    <h1>文章标题</h1>
    <p>文章正文内容……</p>

    <!-- Suspense 包裹的异步组件会触发流中断，等待 resolve 后继续 -->
    <Suspense>
      <template #default>
        <AsyncComments />
      </template>
      <template #fallback>
        <p>评论加载中...</p>
      </template>
    </Suspense>
  </div>
</template>
```

当 `AsyncComments` 仍在解析时，上方的文章标题和正文已经作为 HTML 流向客户端推送；`Suspense` 回退内容成为流中的一个缓冲块；当 `AsyncComments` 的异步组件 resolve 后，Vue SSR 继续渲染并推送剩余的 HTML。最终客户端 Hydration 将替换回退内容为实际评论组件。

### 静态提升

Vue 3 的编译优化在 SSR 中同样生效。编译器会将不会随数据变化的静态 DOM 结构提升到 render 函数之外，SSR 渲染时直接复用字符串，避免重复计算：

```typescript
// 编译前的模板
// <div><p class="title">Hello</p><span>{{ count }}</span></div>

// Vue 3 编译器会将 <p> 节点静态提升
const _hoisted_1 = /*#__PURE__*/ '<p class="title">Hello</p>'

// SSR 渲染时直接拼接静态字符串
function ssrRender(_ctx, _push, _parent, _attrs) {
  _push(`<div${_attrs}>${_hoisted_1}<span>${_ctx.count}</span></div>`)
}
```

静态提升带来的优化：减少每次渲染时的字符串构建开销；降低 vnode 树的遍历深度；对于大量静态内容的页面，SSR 吞吐量可提升 20-40%。

### vnode hook 机制

`@vue/server-renderer` 提供了 `ssrRender` 组件的 directive hook，允许组件自定义 SSR 输出：

```typescript
// 自定义指令示例：ssr 渲染时转化为自定义属性
const vHighlight = {
  // 客户端调用
  mounted(el: HTMLElement, binding: any) {
    el.style.backgroundColor = binding.value
  },
  // SSR 专用 hook，注入内联样式
  getSSRProps(binding: any) {
    return {
      style: `background-color: ${binding.value}`
    }
  }
}

// 组件选项中的 ssrRender
export default {
  ssrRender(ctx: any, push: (html: string) => void, parent: any) {
    push(`<div class="special" data-count="${ctx.count}">`)
    push(escapeHtml(ctx.content))
    push(`</div>`)
  }
}
```

`getSSRProps` 在 SSR 编译阶段被调用，将指令逻辑转化为静态 HTML 属性，确保首屏样式正确呈现；客户端 Hydration 之后再由 `mounted` 接管真实的 DOM 操作。

---

## 十五、Hydration（注水）原理与不匹配处理

### Vue 3 的 Hydration 算法简析

Hydration 是将服务端渲染的静态 HTML 转化为动态响应式 DOM 的过程。Vue 3 的 hydration 核心策略是基于 DOM 树和 vnode 树的**同步遍历对比**，而不是重新渲染。

```typescript
// 简化版 hydration 算法
function hydrate(
  container: Element,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null = null
): void {
  // 1. 判断 hydration 模式：从已有 DOM 节点开始匹配
  if (!isSameVNodeType(vnode, container.firstChild as Element)) {
    // mismatch: 重新创建 DOM 并替换
    mount(vnode, container, null, parentComponent)
    return
  }

  // 2. 复用已有的 DOM 元素
  const el = (vnode.el = container.firstChild as Element)

  if (vnode.shapeFlag & ShapeFlags.ELEMENT) {
    // 原生元素：检查属性，添加事件监听器
    hydrateElement(el, vnode, parentComponent)
  } else if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
    // 组件：创建一个 component instance，复用 DOM
    hydrateComponent(vnode, parentComponent)
  }

  // 3. 递归 hydration 子节点
  if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // 子节点为数组：跳过 comment anchor，逐个匹配
    let childNode = el.firstChild
    for (const childVNode of vnode.children as VNode[]) {
      // 跳过文本节点
      while (childNode && childNode.nodeType === 3) {
        childNode = childNode.nextSibling as Element
      }
      if (!childNode) break
      hydrate(childNode.parentElement!, childVNode, parentComponent)
      childNode = childNode.nextSibling as Element
    }
  }
}
```

hydration 的核心优势：复用了已有的 DOM，不执行组件的 render 函数；快速绑定事件监听器；保持用户已填写的表单状态。

### Hydration 匹配的关键函数

```typescript
// 判断 vnode 类型和 DOM 元素是否匹配
function isSameVNodeType(n1: VNode, n2: Element): boolean {
  if (!n2) return false

  // Fragment 对比
  if (n1.type === Fragment) return true

  // 组件对比
  if (typeof n1.type === 'object') {
    return true // 组件类型对比需要更详细的判断
  }

  // HTML 元素对比：标签名一致且 key 相同
  return (
    n1.type === n2.nodeName.toLowerCase() &&
    n1.props?.key === (n2.getAttribute?.('data-key') ?? undefined)
  )
}
```

### Hydration Mismatch 的产生原因和检测机制

Hydration mismatch 发生在服务端渲染的 HTML 与客户端 hydration 时产生的 vnode 树不一致的情况下。Vue 3 内部在运行时检查 mismatches 并在开发环境产生警告。

**具体检测流程**：

```typescript
// Vue 3 内部的 mismatch 检测机制
let hasMismatch = false

function checkMismatch(expected: string, actual: string): void {
  if (__DEV__ && expected !== actual) {
    hasMismatch = true
    console.warn(
      `Hydration node mismatch:\n` +
      `  - expected: ${expected}\n` +
      `  - actual:   ${actual}\n` +
      `This can be caused by:` +
      `\n  1. Invalid HTML nesting (nested <p> inside <p>, <div> inside <p>)` +
      `\n  2. Server/client differing content (Date.now(), Math.random())` +
      `\n  3. Browser extensions modifying DOM\n` +
      `\n  Check the Vue docs for more details.`
    )
  }
}
```

### 常见的 Mismatch 场景及解决方案

```vue
<!-- 场景 1：浏览器扩展修改 DOM -->
<!-- 解决方案：生产环境忽略，开发环境识别工具标记 -->

<!-- 场景 2：嵌套标签错误 -->
<!-- 错误：<p> 内嵌套 <div>，浏览器会自动修复 DOM 结构 -->
<!-- <p><div>text</div></p> 会被浏览器拆为 <p></p><div>text</div><p></p> -->

<!-- 场景 3：随机值 / 时间相关 -->
<script setup lang="ts">
import { ref, onMounted } from 'vue'

// 错误：SSR 和客户端生成不同值
// const randomId = Math.random().toString(36).slice(2)
// const serverId = `id-${crypto.randomUUID?.() ?? Date.now()}` // ❌ 两侧各生成一次，必然 mismatch

// 正确：使用与内容绑定的稳定值（如从路由参数派生），SSR 与客户端一致
const route = useRoute()
const serverId = computed(() => `item-${route.params.id ?? 'root'}`)

// 客户端专属值：初始为空（SSR 输出空占位），挂载后再赋值
const clientTimestamp = ref('')

onMounted(() => {
  clientTimestamp.value = Date.now().toString()
})
</script>

<template>
  <div>
    <!-- 服务端生成的值，不会 mismatch -->
    <p>ID: {{ serverId }}</p>

    <!-- 客户端特有值，使用 v-if 避免 mismatch -->
    <p v-if="clientTimestamp">客户端时间: {{ clientTimestamp }}</p>
    <p v-else>加载中...</p>
  </div>
</template>
```

### 生产环境中的 Hydration 策略

#### 策略一：ClientOnly 组件

Nuxt 内置的 `<ClientOnly>` 组件，服务端渲染时输出占位符，客户端接管后渲染真实内容。

```vue
<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

const ChartComponent = defineAsyncComponent(() =>
  import('./ChartComponent.vue')
)
</script>

<template>
  <div>
    <h1>数据看板</h1>

    <!-- ClientOnly：包裹 SSR 不兼容的组件 -->
    <ClientOnly>
      <ChartComponent />
      <!-- fallback 插槽可选，显示骨架 -->
      <template #fallback>
        <div class="chart-skeleton">图表加载中...</div>
      </template>
    </ClientOnly>
  </div>
</template>
```

#### 策略二：v-if + onMounted 控制渲染

利用 `onMounted` 确保组件只在客户端挂载后才渲染，完全避免 Hydration 冲突：

```typescript
// composables/useClientOnly.ts
export function useClientOnly() {
  const mounted = ref(false)

  onMounted(() => {
    mounted.value = true
  })

  return { mounted }
}
```

```vue
<script setup lang="ts">
const { mounted } = useClientOnly()
</script>

<template>
  <div>
    <p>这段内容 SSR 和客户端都渲染</p>

    <template v-if="mounted">
      <!-- 仅在客户端渲染，无 Hydration 风险 -->
      <canvas ref="canvasRef" width="600" height="400"></canvas>
      <p>窗口尺寸: {{ window.innerWidth }} x {{ window.innerHeight }}</p>
    </template>
    <template v-else>
      <!-- SSR 时显示占位 -->
      <div class="canvas-placeholder">图表区域</div>
    </template>
  </div>
</template>
```

#### 策略三：SuppressHydrationWarning（Vue 3.4+）

```vue
<template>
  <!-- data-allow-mismatch 属性告知 Vue 忽略该节点的 mismatch -->
  <div data-allow-mismatch="text">
    {{ Date.now() }}
  </div>
</template>
```

### 第三方库 SSR 兼容处理

对于不支持 SSR 的第三方库，需要使用动态导入和客户端专用插件：

```typescript
// plugins/third-party-client.ts
// 文件名带 .client 后缀 → Nuxt 自动只在客户端加载
export default defineNuxtPlugin((nuxtApp) => {
  // 此时确保在浏览器环境执行
  import('chart.js').then(({ Chart }) => {
    nuxtApp.provide('chart', Chart)
  })
})
```

```typescript
// 对于必须在 SSR 阶段使用的库（如 dayjs），确保通用性
// plugins/dayjs.ts
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'

export default defineNuxtPlugin(() => {
  // dayjs 是纯 JS 日期库，SSR 和客户端均可使用
  dayjs.locale('zh-cn')
  return {
    provide: { dayjs }
  }
})
```

```typescript
// 优雅降级封装：根据环境回退
export function createSSRSafeStorage(): Storage {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage
  }
  // SSR 降级：内存存储
  const store = new Map<string, string>()
  return {
    getItem(key: string) { return store.get(key) ?? null },
    setItem(key: string, value: string) { store.set(key, value) },
    removeItem(key: string) { store.delete(key) },
    clear() { store.clear() },
    get length() { return store.size },
    key(index: number) { return [...store.keys()][index] ?? null }
  }
}
```

---

## 十六、性能优化策略

### serverPrefetch 生命周期实战

`serverPrefetch` 是 SSR 专用的组件生命周期钩子，在服务端渲染时调用，用于预取数据并注入组件实例。它在 `setup()` 之后、render 之前执行，且 `asyncData` 数据作为组件实例属性保存，这样 Hydration 时可直接复用。

```vue
<!-- components/ProductDetail.vue -->
<script setup lang="ts">
import { ref, onServerPrefetch } from 'vue'

interface Product {
  id: number
  name: string
  price: number
  inventory: number
}

const product = ref<Product | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// serverPrefetch 只能在 <script setup> 中使用
onServerPrefetch(async () => {
  try {
    const response = await fetch(`https://api.example.com/products/${productId}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    product.value = await response.json()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
})

// 接收外部传入的 productId
const props = defineProps<{ productId: string }>()
</script>

<template>
  <div v-if="loading">加载商品信息...</div>
  <div v-else-if="error">错误: {{ error }}</div>
  <div v-else>
    <h2>{{ product?.name }}</h2>
    <p>价格: ¥{{ product?.price }}</p>
    <p>库存: {{ product?.inventory }}</p>
  </div>
</template>
```

### useAsyncData 与 serverPrefetch 的关系

Nuxt 3 中的 `useAsyncData` 实际上就是在内部使用了 `onServerPrefetch` 机制，并将结果序列化传递到客户端。自建方案同样可以实现类似的模式：

```typescript
// composables/useServerFetch.ts 自建版本
import { ref, onServerPrefetch, type Ref } from 'vue'

// 服务端环境判断（Vite/Nuxt 均注入 import.meta.env.SSR；
// 注意 Vue 本身并未导出 isServer 这样的 API）
const isServer = import.meta.env.SSR

interface FetchState<T> {
  data: Ref<T | null>
  pending: Ref<boolean>
  error: Ref<string | null>
}

export function useServerFetch<T>(
  fetcher: () => Promise<T>,
  key: string
): FetchState<T> {
  const data = ref<T | null>(null) as Ref<T | null>
  const pending = ref(true)
  const error = ref<string | null>(null)

  // 服务端：通过 serverPrefetch 预取
  if (isServer) {
    onServerPrefetch(async () => {
      try {
        data.value = await fetcher()
      } catch (e) {
        error.value = (e as Error).message
      } finally {
        pending.value = false
      }
    })
  } else {
    // 客户端：检查 window.__INITIAL_STATE__ 是否存在服务端传递的数据
    const state = (window as any).__INITIAL_STATE__
    if (state && state[key]) {
      data.value = state[key]
      pending.value = false
    } else {
      // 不存在则客户端重新获取
      fetcher()
        .then((res) => { data.value = res })
        .catch((e) => { error.value = (e as Error).message })
        .finally(() => { pending.value = false })
    }
  }

  return { data, pending, error }
}
```

### 缓存策略

#### 页面级 LRU 缓存

页面级缓存是 SSR 性能优化的核心手段之一，使用 LRU 淘汰策略可以平衡内存使用与缓存命中率。

```typescript
// server/middleware/pageCache.ts
import { LRUCache } from 'lru-cache'

interface CacheEntry {
  html: string
  timestamp: number
}

const pageCache = new LRUCache<string, CacheEntry>({
  max: 500,              // 最多缓存 500 个页面
  maxSize: 50 * 1024 * 1024, // 最大 50MB
  sizeCalculation: (value) => value.html.length,
  ttl: 1000 * 60 * 5,   // 默认 5 分钟过期
})

// 路由级 TTL 配置
const routeTTL: Record<string, number> = {
  '/': 1000 * 60 * 10,           // 首页 10 分钟
  '/products': 1000 * 60 * 5,    // 商品列表 5 分钟
  '/products/:id': 1000 * 60 * 30, // 商品详情 30 分钟
  '/about': 1000 * 60 * 60,      // 关于页 1 小时
}

function getTTL(url: string): number {
  for (const [pattern, ttl] of Object.entries(routeTTL)) {
    const regex = new RegExp('^' + pattern.replace(/:\w+/g, '\\w+') + '$')
    if (regex.test(url)) return ttl
  }
  return 1000 * 60 * 5 // 默认 5 分钟
}

// 中间件函数：缓存命中的页面直接返回
export async function cachedRender(
  url: string,
  renderFn: () => Promise<string>
): Promise<{ html: string; fromCache: boolean }> {
  const cached = pageCache.get(url)

  if (cached && Date.now() - cached.timestamp < getTTL(url)) {
    return { html: cached.html, fromCache: true }
  }

  const html = await renderFn()
  pageCache.set(url, { html, timestamp: Date.now() })
  return { html, fromCache: false }
}

// 缓存失效函数（供 CMS/webhook 调用）
export function invalidateCache(pattern?: string): number {
  let count = 0
  if (pattern) {
    const regex = new RegExp(pattern)
    for (const key of pageCache.keys()) {
      if (regex.test(key)) {
        pageCache.delete(key)
        count++
      }
    }
  } else {
    count = pageCache.size
    pageCache.clear()
  }
  return count
}
```

#### 组件级缓存

对于页面中稳定的组件（如页头、页脚、侧边栏），可以使用组件级缓存减少渲染开销：

```typescript
// composables/useComponentCache.ts
interface ComponentCacheConfig {
  key: string
  ttl: number        // 毫秒
  maxEntries?: number // 最大条目数，默认 100
}

const componentCaches = new Map<string, LRUCache<string, { html: string; ts: number }>>()

function getCache(config: ComponentCacheConfig) {
  if (!componentCaches.has(config.key)) {
    componentCaches.set(
      config.key,
      new LRUCache({
        max: config.maxEntries ?? 100,
        ttl: config.ttl,
      })
    )
  }
  return componentCaches.get(config.key)!
}

export function useComponentCache(config: ComponentCacheConfig) {
  const cache = getCache(config)

  return {
    get(cacheKey: string): string | undefined {
      return cache.get(cacheKey)?.html
    },
    set(cacheKey: string, html: string): void {
      cache.set(cacheKey, { html, ts: Date.now() })
    },
    invalidate(): void {
      cache.clear()
    },
    getStats() {
      return {
        size: cache.size,
        calculatedSize: cache.calculatedSize,
      }
    }
  }
}
```

### 流式渲染（Streaming SSR）的使用场景和实现

流式渲染特别适合内容型网站，使用 Node.js Stream + Vue 的 `renderToStream` API：

```typescript
// server/streaming-handler.ts
import { Readable } from 'stream'
import { createSSRApp } from 'vue'
import { renderToStream } from '@vue/server-renderer'

export async function handleStreamingRequest(
  req: Request,
  url: string,
  App: any
): Promise<Response> {
  const app = createSSRApp(App)
  const stream = renderToStream(app)

  // 包装为 Web ReadableStream（兼容 Edge Runtime）
  const webStream = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk: string) => {
        controller.enqueue(new TextEncoder().encode(chunk))
      })
      stream.on('end', () => {
        controller.close()
      })
      stream.on('error', (err: Error) => {
        controller.error(err)
      })
    }
  })

  return new Response(webStream, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache', // 流式响应不缓存中间状态
    }
  })
}
```

### ISR（增量静态再生成）方案

ISR 结合了 SSG 的性能优势和 SSR 的动态能力。页面首次请求时渲染并缓存，后续请求直接返回缓存，定期在后台重新生成。

```typescript
// server/isr-manager.ts
import fs from 'fs/promises'
import path from 'path'

interface ISROptions {
  revalidate: number  // 重新验证间隔（秒）
  storagePath: string // 缓存存储路径
}

class ISRManager {
  private cache = new Map<string, { html: string; timestamp: number }>()
  private pending = new Map<string, Promise<string>>()

  constructor(private options: ISROptions) {}

  // 获取页面，缓存过期时重新生成
  async get(url: string, renderFn: () => Promise<string>): Promise<string> {
    const cached = this.cache.get(url)
    const now = Date.now()

    // 缓存有效
    if (cached && (now - cached.timestamp) < this.options.revalidate * 1000) {
      return cached.html
    }

    // 缓存过期但有旧数据：先返回旧数据，后台重新生成（SWR 策略）
    if (cached) {
      if (!this.pending.has(url)) {
        this.pending.set(url, this.regenerate(url, renderFn))
      }
      return cached.html
    }

    // 无缓存：必须等待渲染
    return this.regenerate(url, renderFn)
  }

  private async regenerate(url: string, renderFn: () => Promise<string>): Promise<string> {
    try {
      const html = await renderFn()
      this.cache.set(url, { html, timestamp: Date.now() })
      this.pending.delete(url)

      // 持久化到磁盘
      await this.persist(url, html)
      return html
    } finally {
      this.pending.delete(url)
    }
  }

  private async persist(url: string, html: string): Promise<void> {
    const filePath = this.getFilePath(url)
    await fs.mkdir(path.dirname(filePath), { recursive: true })
    await fs.writeFile(filePath, html, 'utf-8')
  }

  async loadFromDisk(url: string): Promise<string | null> {
    try {
      const filePath = this.getFilePath(url)
      const stat = await fs.stat(filePath)
      if (Date.now() - stat.mtimeMs > this.options.revalidate * 1000) {
        return null // 磁盘缓存过期
      }
      const html = await fs.readFile(filePath, 'utf-8')
      this.cache.set(url, { html, timestamp: stat.mtimeMs })
      return html
    } catch {
      return null
    }
  }

  private getFilePath(url: string): string {
    const sanitized = url.replace(/[^a-zA-Z0-9-_]/g, '_') || 'index'
    return path.join(this.options.storagePath, `${sanitized}.html`)
  }

  // webhook 触发指定页面重新生成
  async revalidate(urls: string[]): Promise<void> {
    for (const url of urls) {
      this.cache.delete(url)
      const filePath = this.getFilePath(url)
      await fs.unlink(filePath).catch(() => {})
    }
  }
}

// 初始化
export const isr = new ISRManager({
  revalidate: 60, // 60 秒后重新验证
  storagePath: path.join(process.cwd(), '.isr-cache'),
})
```

---

## 十七、生产级部署方案

### Node.js 集群 + PM2 部署

利用 Node.js Cluster 模块充分利用多核 CPU，PM2 负责进程管理和自动重启。

#### 集群模式入口文件

```typescript
// server/cluster.ts
import cluster from 'cluster'
import os from 'os'
import { createServer } from './app'

const PORT = process.env.PORT || 3000
const cpus = os.cpus().length

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running with ${cpus} workers`)

  // Fork workers - 每个 CPU 核心一个 Worker
  for (let i = 0; i < cpus; i++) {
    cluster.fork()
  }

  // Worker 异常退出自动重启
  cluster.on('exit', (worker, code, signal) => {
    console.warn(`Worker ${worker.process.pid} died (${signal || code}). Restarting...`)
    cluster.fork()
  })

  // 优雅关闭
  process.on('SIGTERM', () => {
    console.log('Primary received SIGTERM, forwarding to workers...')
    for (const id in cluster.workers) {
      cluster.workers[id]?.kill('SIGTERM')
    }
    process.exit(0)
  })
} else {
  // Worker 进程：启动 HTTP 服务器
  const server = createServer()

  server.listen(PORT, () => {
    console.log(`Worker ${process.pid} started on port ${PORT}`)
  })

  process.on('SIGTERM', () => {
    console.log(`Worker ${process.pid} shutting down gracefully...`)
    server.close(() => {
      process.exit(0)
    })
    // 强制退出超时
    setTimeout(() => {
      console.error(`Worker ${process.pid} forced shutdown`)
      process.exit(1)
    }, 10000)
  })
}
```

#### PM2 配置文件

```javascript
// ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'vue-ssr-app',
      script: './server/cluster.ts',
      // 如果不需要手动 cluster，让 PM2 管理进程
      instances: 'max',     // 自动根据 CPU 核心数
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '512M',
      kill_timeout: 10000,
      // 滚动更新配置
      wait_ready: true,
      listen_timeout: 10000,
      shutdown_with_message: true,
    },
  ],
}
```

```bash
# 启动
pm2 start ecosystem.config.cjs

# 滚动重启（零停机）
pm2 reload vue-ssr-app

# 查看状态
pm2 status
pm2 monit

# 查看日志
pm2 logs vue-ssr-app

# 保存当前运行列表，重启后自动恢复
pm2 save
pm2 startup
```

### CDN 缓存策略配置

合理的 CDN 缓存配置可以大幅降低源服务器压力，同时加速用户访问。

```typescript
// server/cache-headers.ts
import type { IncomingMessage, ServerResponse } from 'http'

type CacheStrategy = 'static' | 'dynamic' | 'api'

interface CacheConfig {
  maxAge: number
  sMaxAge: number
  staleWhileRevalidate: number
  staleIfError: number
}

const CACHE_CONFIGS: Record<CacheStrategy, CacheConfig> = {
  static: {
    maxAge: 31536000,        // 1 年（带 hash 的静态资源）
    sMaxAge: 31536000,
    staleWhileRevalidate: 86400,
    staleIfError: 86400,
  },
  dynamic: {
    maxAge: 0,               // 客户端不缓存
    sMaxAge: 600,            // CDN 缓存 10 分钟
    staleWhileRevalidate: 300,
    staleIfError: 86400,
  },
  api: {
    maxAge: 0,
    sMaxAge: 60,             // API 响应 CDN 缓存 1 分钟
    staleWhileRevalidate: 30,
    staleIfError: 300,
  },
}

export function setCacheHeaders(
  res: ServerResponse,
  strategy: CacheStrategy
): void {
  const config = CACHE_CONFIGS[strategy]
  const cacheControl = [
    `public`,
    `max-age=${config.maxAge}`,
    `s-maxage=${config.sMaxAge}`,
    `stale-while-revalidate=${config.staleWhileRevalidate}`,
    `stale-if-error=${config.staleIfError}`,
  ].join(', ')

  res.setHeader('Cache-Control', cacheControl)
  res.setHeader('Vary', 'Accept-Encoding, Cookie')

  if (strategy === 'dynamic') {
    // 动态页面添加 ETag 用于条件请求
    res.setHeader('Surrogate-Control', `max-age=${config.sMaxAge}`)
  }
}

// 内容类型自动选择缓存策略
export function autoSetCacheHeaders(
  req: IncomingMessage,
  res: ServerResponse,
  contentType: string
): void {
  const url = req.url || ''

  // API 路由
  if (url.startsWith('/api/')) {
    setCacheHeaders(res, 'api')
    return
  }

  // 静态资源
  if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|webp)$/.test(url)) {
    setCacheHeaders(res, 'static')
    return
  }

  // HTML 页面（动态内容）
  setCacheHeaders(res, 'dynamic')
}
```

### Docker 多阶段构建优化

使用多阶段构建来优化 Docker 镜像大小和构建时间：

```dockerfile
# Dockerfile
# ==================== 构建阶段 ====================
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件（独立层，便于缓存）
COPY package.json package-lock.json ./

# 安装依赖
RUN npm ci --omit=optional

# 复制源代码
COPY . .

# 构建
ENV NODE_ENV=production
RUN npm run build

# ==================== 生产阶段 ====================
FROM node:20-alpine AS production

# 安全：以非 root 用户运行
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# 从构建阶段复制产物
COPY --from=builder --chown=nodejs:nodejs /app/.output ./.output
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# 暴露端口
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

USER nodejs

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", ".output/server/index.mjs"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    restart: always
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '1'
    healthcheck:
      test: ['CMD', 'wget', '--spider', 'http://localhost:3000/health']
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: always

volumes:
  redis_data:
```

### 滚动更新和优雅关闭

零停机部署的关键在于优雅关闭（Graceful Shutdown）和滚动更新：

```typescript
// server/graceful-shutdown.ts
import { Server } from 'http'

interface GracefulShutdownOptions {
  server: Server
  timeoutMs: number
  healthCheckPath?: string
}

export function setupGracefulShutdown(options: GracefulShutdownOptions): void {
  const { server, timeoutMs, healthCheckPath } = options
  let isShuttingDown = false

  // 标记正在关闭，新请求路由到其他实例（负载均衡器检查）
  server.on('request', (req, res) => {
    if (isShuttingDown && healthCheckPath) {
      if (req.url === healthCheckPath) {
        // 健康检查返回 503 告知 LB 该实例不可用
        res.writeHead(503, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ status: 'shutting_down' }))
        return
      }
    }
  })

  async function shutdown(signal: string) {
    if (isShuttingDown) return
    isShuttingDown = true
    console.log(`Received ${signal}. Starting graceful shutdown...`)

    // 1. 等待 LB 将该实例移除（健康检查失败后 LB 会停止转发流量）
    const LB_DRAIN_TIME = 5000 // 5 秒等待 LB 探测到并移除
    console.log(`Waiting ${LB_DRAIN_TIME}ms for load balancer to drain...`)
    await new Promise((resolve) => setTimeout(resolve, LB_DRAIN_TIME))

    // 2. 停止接受新连接，但继续处理已有请求
    server.close(async () => {
      console.log('All connections closed. Exiting.')
      process.exit(0)
    })

    // 3. 超时强制退出
    setTimeout(() => {
      console.error(`Graceful shutdown timeout (${timeoutMs}ms). Forcing exit.`)
      process.exit(1)
    }, timeoutMs)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}
```

```yaml
# k8s 部署片段 Kubernetes Deployment 配置
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vue-ssr-app
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1          # 滚动时最多多一个 Pod
      maxUnavailable: 0    # 保证可用 Pod 数量不变
  template:
    spec:
      containers:
        - name: app
          image: vue-ssr-app:latest
          ports:
            - containerPort: 3000
          lifecycle:
            preStop:
              exec:
                command: ['sleep', '5']  # 给 LB 时间摘除本 Pod
          readinessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 15
            periodSeconds: 10
```

---

## 十八、Nuxt 3 vs Vue SSR 自建方案对比

### 功能对比表

| 对比维度 | Nuxt 3 | Vue SSR 自建方案 |
|----------|--------|------------------|
| **上手成本** | 低，约定大于配置 | 高，需要自行搭建所有基础设施 |
| **路由系统** | 文件系统路由，自动生成 | 需自行集成 vue-router |
| **数据获取** | useFetch/useAsyncData 开箱即用 | 需自行实现 serverPrefetch 序列化 |
| **状态管理** | useState 内置 SSR 安全共享 | 需自行处理状态序列化和注水 |
| **API 开发** | Nitro Server Engine，文件系统 API 路由 | 需自行集成 Express/Koa/Fastify |
| **SEO** | useHead、useSeoMeta 内置 | 需 vue-meta 或自行实现 |
| **模块生态** | 丰富的社区模块市场 | 需自行集成或开发 |
| **代码分割** | 自动页面级分割 | 需手动配置 vite/webpack |
| **开发体验** | HMR、DevTools、类型提示 | 基本工具链，自行配置 |
| **部署支持** | 多平台 preset（Vercel、Netlify、Cloudflare 等） | 仅 Node.js 环境 |
| **构建产物** | .output 统一输出，自动优化 | 自行配置构建流程 |
| **TypeScript** | 原生支持 | 需要手动配置 |
| **中间件** | 路由级 + 服务端中间件 | 自行实现 |
| **错误处理** | 内置错误页面和边界 | 需自行实现 |

### 性能对比

以下数据为示意性参考（用于说明量级差异方向），并非在固定环境实测的精确数值，实际结果依项目规模与部署环境而异：

| 指标 | Nuxt 3 | 自建 Vue SSR | 差异 |
|------|--------|-------------|------|
| **冷启动时间** | ~2.5s | ~1.2s | Nuxt 多 ~1.3s（模块加载） |
| **单页面 SSR 渲染 (QPS)** | ~380 req/s | ~520 req/s | 自建方案高 ~37% |
| **构建后包大小** | ~8.5MB | ~3.2MB | Nuxt 多 ~165% |
| **首屏 HTML 大小** | ~45KB | ~42KB | 接近 |
| **TTFB (P50)** | ~85ms | ~55ms | 自建方案快 ~35% |
| **TTFB (P99)** | ~250ms | ~180ms | 自建方案快 ~28% |
| **内存占用（空载）** | ~120MB | ~80MB | Nuxt 多 ~50% |
| **Hydration 时间** | ~120ms | ~110ms | 接近 |

> 说明：上表为示意数据，请以实际项目压测为准。自建方案由于没有额外的框架层抽象，在纯渲染性能上通常占优；但实际项目中 Nuxt 的内置优化（如图片优化、自动代码分割）可弥补差距。

### 选型建议

**选择 Nuxt 3 的场景**：
- 团队需要快速落地、减少决策成本
- 项目需要全方位功能（路由、中间件、API、SEO）
- 中小型团队，不具备深入定制能力
- 计划多平台部署（Edge、Serverless）
- 需要利用社区模块（Auth、Content、Image 等）

**选择自建 Vue SSR 的场景**：
- 对性能有极高要求，需要极致优化每一毫秒
- 团队有 Node.js 服务端开发经验和运维能力
- 需要深度定制渲染流程（自定义缓存、流控、A/B 测试分流）
- 已有成熟的后端基础设施，仅需 SSR 渲染层
- 打包体积敏感（如嵌入设备、边缘节点部署）

**混合方案（推荐）**：
使用 Nuxt 3 的 Nitro engine 作为服务端基础，对关键渲染路径自行优化（如缓存中间件替换 Nuxt 默认的、自定义 `renderer` 替代默认 SSR）。这兼顾了框架的便利性和深度定制的灵活性。

```typescript
// nuxt.config.ts 混合方案配置
export default defineNuxtConfig({
  ssr: true,
  nitro: {
    // 使用自定义 prerender 或替换默认渲染
  },
  hooks: {
    // 注入自定义 SSR 中间件
    'nitro:config'(nitroConfig) {
      // 在 Nitro 配置层面注入缓存层
    },
    'render:response'(response, { event }) {
      // 自定义响应处理：注入 CDN 头、日志、修改 HTML
    }
  }
})
```

---

## 十九、常见坑点与解决方案

### 内存泄漏：Store 未清理

SSR 场景中最危险的内存泄漏来源是单例 store 在所有请求间共享状态，导致用户数据交叉污染和内存无限增长。

```typescript
// 错误示例：模块级单例
// const store = reactive({ users: [] }) // 所有请求共享！

// 正确示例：每个请求创建独立的 store 实例
// store/index.ts
import { createPinia } from 'pinia'

// Pinia 示例：Nuxt 中每个请求自动创建新实例
// 自建方案需在 createSSRApp 时创建新实例
export function createStore() {
  return createPinia()
}

// 对非 Pinia 方案：使用工厂函数代替单例
export function createAppStore() {
  return {
    state: reactive({
      users: [] as User[],
      session: null as Session | null,
    }),
    actions: {
      async fetchUsers() {
        this.state.users = await api.getUsers()
      },
      setSession(session: Session) {
        this.state.session = session
      },
      // 请求结束时清理
      reset() {
        this.state.users = []
        this.state.session = null
      }
    }
  }
}
```

```typescript
// server/app.ts - 每个请求创建新的 store 实例
import { createSSRApp } from 'vue'
import { createAppStore } from './store'

export function createApp() {
  const app = createSSRApp(App)
  const store = createAppStore()

  // provide 到全局
  app.provide('store', store)

  // 请求结束后清理 store（关键）
  // 可通过 onServerPrefetch 或中间件在响应结束时调用
  return { app, store }
}
```

### SSR 中无法使用 window/document 的兼容写法

在 SSR 环境中访问浏览器 API 会直接报错，需要确保这些 API 只在客户端环境中调用。

```typescript
// composables/useBrowserAPI.ts
// 安全的浏览器 API 访问封装

export function useWindowSize() {
  const width = ref(0)
  const height = ref(0)

  if (import.meta.client) {
    // Vite 环境变量判断
    width.value = window.innerWidth
    height.value = window.innerHeight
  }

  onMounted(() => {
    const handleResize = () => {
      width.value = window.innerWidth
      height.value = window.innerHeight
    }
    window.addEventListener('resize', handleResize)
    handleResize()

    onBeforeUnmount(() => {
      window.removeEventListener('resize', handleResize)
    })
  })

  return { width, height }
}

export function useMatchMedia(query: string) {
  const matches = ref(false)

  onMounted(() => {
    const mql = window.matchMedia(query)
    matches.value = mql.matches

    const handler = (e: MediaQueryListEvent) => {
      matches.value = e.matches
    }
    mql.addEventListener('change', handler)

    onBeforeUnmount(() => {
      mql.removeEventListener('change', handler)
    })
  })

  return { matches }
}

export function useIntersectionObserver(target: Ref<Element | null>) {
  const isIntersecting = ref(false)

  onMounted(() => {
    if (!target.value) return
    const observer = new IntersectionObserver(([entry]) => {
      isIntersecting.value = entry.isIntersecting
    })
    observer.observe(target.value)

    onBeforeUnmount(() => {
      observer.disconnect()
    })
  })

  return { isIntersecting }
}
```

### 第三方库 SSR 报错处理

使用 `defineAsyncComponent` 实现仅在客户端加载第三方库，避免 SSR 阶段因缺少 DOM API 报错：

```typescript
// composables/useClientLibrary.ts
export function createClientOnlyComponent(
  importFn: () => Promise<any>,
  options?: {
    loadingComponent?: Component
    delay?: number
    timeout?: number
  }
) {
  return defineAsyncComponent({
    loader: async () => {
      // 在 SSR 时返回空的占位组件
      if (typeof window === 'undefined') {
        return {
          render() {
            return null // SSR 不渲染
          }
        }
      }
      const mod = await importFn()
      return mod.default ?? mod
    },
    loadingComponent: options?.loadingComponent,
    delay: options?.delay ?? 200,
    timeout: options?.timeout ?? 10000,
  })
}

// 使用示例：打包 Chart.js，SSR 安全
const SafeChart = createClientOnlyComponent(
  () => import('./components/RealChart.vue'),
  {
    loadingComponent: defineComponent({
      template: '<div class="chart-skeleton">图表加载中...</div>'
    })
  }
)
```

```typescript
// 对于必须在 SSR 中使用的库，进行错误包装
export function safeImport<T>(
  moduleName: string,
  importFn: () => Promise<T>
): T | null {
  try {
    // 同步加载尝试（用于已安装但 SSR 环境可能不兼容的包）
    return null // 将在 onMounted 中异步加载
  } catch {
    return null
  }
}

export function useSafeLibrary<T>(
  importFn: () => Promise<{ default: T }>,
  fallback: T
): { instance: Ref<T>; loading: Ref<boolean> } {
  const instance = ref<T>(fallback) as Ref<T>
  const loading = ref(true)

  onMounted(async () => {
    try {
      const mod = await importFn()
      instance.value = mod.default ?? mod
    } catch (e) {
      console.error(`Failed to load library:`, e)
    } finally {
      loading.value = false
    }
  })

  return { instance, loading }
}
```

### 动态导入库的 SSR fallback

对于大型第三方库（如编辑器、可视化图表），使用动态导入降低初始 bundle 大小并提供 SSR fallback：

```typescript
// 方案：条件动态导入 + 交互触发加载
export function useLazyLibrary(
  importFn: () => Promise<any>,
  options?: { ssrFallback?: string }
) {
  const loaded = ref(false)
  const error = ref<string | null>(null)
  let libInstance: any = null

  // 仅在客户端按需加载
  async function load(): Promise<any> {
    if (libInstance) return libInstance
    try {
      libInstance = await importFn()
      loaded.value = true
      return libInstance
    } catch (e) {
      error.value = (e as Error).message
      throw e
    }
  }

  // SSR 安全的 placeholder 文本
  const fallbackText = options?.ssrFallback ?? '组件正在加载...'

  return { loaded, error, load, fallbackText }
}
```

```vue
<!-- 编辑器组件的 SSR 安全加载示例 -->
<script setup lang="ts">
import { useLazyLibrary } from '~/composables/useLazyLibrary'
import { useClientOnly } from '~/composables/useClientOnly'

const { mounted } = useClientOnly()
const editorEl = ref<HTMLElement>()

// Monaco Editor 在交互时才加载
const editor = useLazyLibrary(
  () => import('monaco-editor'),
  { ssrFallback: '代码编辑器加载中...' }
)

async function initEditor() {
  await editor.load()
  if (editorEl.value) {
    const monaco = (await import('monaco-editor')).editor
    monaco.create(editorEl.value, {
      value: '// 开始编写代码\n',
      language: 'javascript',
      theme: 'vs-dark',
    })
  }
}
</script>

<template>
  <div>
    <div
      v-if="mounted"
      ref="editorEl"
      class="editor-container"
      @vue:mounted="initEditor"
    ></div>
    <div v-else class="editor-placeholder">
      {{ editor.fallbackText }}
    </div>
    <div v-if="editor.error" class="error">
      加载编辑器失败: {{ editor.error }}
    </div>
  </div>
</template>

<style scoped>
.editor-container {
  width: 100%;
  height: 400px;
  border: 1px solid #ddd;
}
.editor-placeholder {
  width: 100%;
  height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  color: #999;
  font-size: 14px;
}
.error {
  color: #e53e3e;
  padding: 8px;
  background: #fff5f5;
  border-radius: 4px;
}
</style>
```

### 步步为营：部署检查清单

以下清单涵盖常见的 SSR 生产部署问题项：

| 检查项 | 说明 | 风险等级 |
|--------|------|---------|
| 拦截所有 `window`/`document` 引用 | 确保无 SSR 环境直接引用 | 高 |
| Pinia store 按请求隔离 | 避免请求间状态泄漏 | 高 |
| 无模块级可变状态 | `let/const` 模块变量在多请求间共享 | 高 |
| `onServerPrefetch` 中的错误处理 | 预取失败不阻塞页面渲染 | 中 |
| 第三方库使用动态导入 | 大体积库不在首屏加载 | 中 |
| 对照 Node.js 内存 limit | SSR 进程内存不超过 limit 的 70% | 中 |
| CDN 配置 page/asset/api 分层 | 不同资源不同缓存策略 | 中 |
| `Transfer-Encoding: chunked` 配置 | 流式渲染必须使用分块传输 | 中 |
| WebSocket 连接仅客户端建立 | 服务端不尝试建立 WS 连接 | 低 |
| `v-html` 内容 XSS 过滤 | 用户生成内容的 SSR 需要转义 | 中 |

---

## 下一步

- [axios集成](02-axios集成.md) - 学习 axios 集成与最佳实践
- [Nuxt 3 官方文档](https://nuxt.com/) - 深入学习更多特性
