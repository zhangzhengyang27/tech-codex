---
title: 安全与TypeScript实践
description: "Vue 3 安全防护（XSS/CSRF/点击劫持、DOMPurify、CSP、敏感数据与依赖安全）与 TypeScript 最佳实践：defineProps/withDefaults 类型定义、泛型组件、组合式函数返回值类型与常用类型工具。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 安全与TypeScript实践

> 前端安全是应用开发的重要环节。本章节涵盖 Vue 3 应用中常见的安全风险及其防护措施。

## 安全威胁概览

```
┌─────────────────────────────────────────────────────────────────────┐
│                      前端安全威胁类型                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────┐                                                 │
│  │     XSS      │  跨站脚本攻击                                     │
│  │ 跨站脚本攻击  │  注入恶意脚本，窃取用户信息                        │
│  └───────────────┘                                                 │
│         │                                                          │
│         ▼                                                          │
│  ┌───────────────┐                                                 │
│  │     CSRF     │  跨站请求伪造                                     │
│  │ 跨站请求伪造  │  伪造用户请求执行恶意操作                          │
│  └───────────────┘                                                 │
│         │                                                          │
│         ▼                                                          │
│  ┌───────────────┐                                                 │
│  │  点击劫持     │  透明 iframe 覆盖                                 │
│  │ Clickjacking │  诱导用户点击隐藏按钮                              │
│  └───────────────┘                                                 │
│         │                                                          │
│         ▼                                                          │
│  ┌───────────────┐                                                 │
│  │  数据泄露     │  敏感信息暴露                                     │
│  │ Data Leak    │  Token/密码存储不当                               │
│  └───────────────┘                                                 │
│         │                                                          │
│         ▼                                                          │
│  ┌───────────────┐                                                 │
│  │  供应链攻击   │  第三方库漏洞                                     │
│  │ Supply Chain │  依赖包安全风险                                   │
│  └───────────────┘                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## XSS 防护

### 什么是 XSS

跨站脚本攻击（Cross-Site Scripting）是指攻击者向 Web 页面注入恶意脚本，在用户浏览器中执行。

**XSS 类型：**

| 类型 | 描述 | 危险等级 |
|------|------|----------|
| 存储型 XSS | 恶意脚本存储在服务器，每次访问都会执行 | 🔴 高 |
| 反射型 XSS | 恶意脚本通过 URL 参数传入，服务器返回时执行 | 🟠 中 |
| DOM 型 XSS | 通过修改 DOM 环境执行恶意脚本 | 🟠 中 |

### Vue 的默认防护

Vue 自动转义插值表达式中的内容：

```vue
<template>
  <!-- ✅ 安全：Vue 会自动转义 -->
  <div>{{ userContent }}</div>
  
  <!-- 如果 userContent 包含 <script>alert('xss')</script> -->
  <!-- 渲染结果：&lt;script&gt;alert('xss')&lt;/script&gt; -->
</template>
```

### 避免 v-html 直接渲染用户内容

```vue
<script setup>
import { ref } from 'vue'

const userContent = ref('')
</script>

<template>
  <!-- ❌ 危险：直接渲染用户内容 -->
  <div v-html="userContent"></div>
  
  <!-- ✅ 安全：使用文本插值 -->
  <div>{{ userContent }}</div>
</template>
```

### 使用 DOMPurify 消毒

```ts
import DOMPurify from 'dompurify'

// 基础使用
const cleanHtml = DOMPurify.sanitize(userInput)

// 配置选项（白名单）
const strictCleanHtml = DOMPurify.sanitize(userInput, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  ALLOWED_ATTR: ['href', 'title', 'target'],
  ALLOW_DATA_ATTR: false
})

// 自定义钩子
DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  // 移除 javascript: 协议
  if (data.attrName === 'href' && data.attrValue.startsWith('javascript:')) {
    data.attrValue = ''
  }
})

// Vue 组合式函数
function useSanitize() {
  const sanitize = (html: string, options?: DOMPurify.Config) => {
    return DOMPurify.sanitize(html, options)
  }
  
  return { sanitize }
}
```

### URL 安全处理

```ts
// 检查 URL 是否安全
function isSafeUrl(url: string): boolean {
  const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:']
  
  try {
    const parsedUrl = new URL(url, window.location.origin)
    return allowedProtocols.includes(parsedUrl.protocol)
  } catch {
    return false
  }
}

// 使用
const userUrl = 'javascript:alert(1)'
if (isSafeUrl(userUrl)) {
  window.open(userUrl)
} else {
  console.warn('Unsafe URL blocked')
}

// Vue 组件中使用
const safeUrl = computed(() => {
  return isSafeUrl(props.url) ? props.url : '#'
})
```

### 防止 JSON 注入

```ts
// ❌ 危险：直接使用 JSON.parse
const data = JSON.parse(untrustedString)

// ✅ 安全：验证后再使用
function safeJsonParse<T>(
  jsonString: string, 
  validator: (data: unknown) => data is T
): T | null {
  try {
    const data = JSON.parse(jsonString)
    if (validator(data)) {
      return data
    }
    return null
  } catch {
    return null
  }
}

// 类型守卫示例
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data &&
    typeof (data as User).id === 'number' &&
    typeof (data as User).name === 'string'
  )
}

const user = safeJsonParse(response, isUser)
```

---

## CSRF 防护

### 什么是 CSRF

跨站请求伪造（Cross-Site Request Forgery）是攻击者诱导用户在已登录网站上执行非预期操作。

**攻击流程：**

```
用户登录银行网站 ──▶ 获取有效 Cookie
        │
        ▼
用户访问恶意网站 ──▶ 恶意网站发起请求到银行网站
        │                    │
        ▼                    ▼
   浏览器自动携带 Cookie ──▶ 银行服务器执行请求
```

### CSRF Token 方案

```ts
// 前端配置
import axios from 'axios'

// 从 meta 标签获取 CSRF token
const csrfToken = document.querySelector(
  'meta[name="csrf-token"]'
)?.getAttribute('content')

// 配置 axios
axios.defaults.headers.common['X-CSRF-Token'] = csrfToken

// 或使用拦截器
axios.interceptors.request.use(config => {
  config.headers['X-CSRF-Token'] = getCsrfToken()
  return config
})
```

```html
<!-- 后端渲染的 CSRF Token -->
<meta name="csrf-token" content="{{ csrfToken }}">
```

### SameSite Cookie

```http
// 服务器设置 Cookie
Set-Cookie: sessionId=abc123; SameSite=Strict; Secure; HttpOnly

// SameSite 选项说明：
// Strict: 完全禁止跨站发送 Cookie
// Lax: 允许安全的跨站请求（GET 链接）
// None: 允许跨站发送（需要 Secure）
```

### 双重 Cookie 验证

```ts
// 前端实现双重 Cookie 验证
function getCsrfFromCookie(): string {
  const match = document.cookie.match(/csrfToken=([^;]+)/)
  return match ? match[1] : ''
}

// 请求时通过 Header 与请求体同时携带 Token，供服务端与 Cookie 比对
function submitWithCsrf(url: string, data: Record<string, unknown>) {
  const token = getCsrfFromCookie()
  return axios.post(url, { ...data, _csrf: token }, {
    headers: {
      'X-CSRF-Token': token
    }
  })
}
```

### Vue Router 守卫

```ts
// router/index.ts
import axios from 'axios'

router.beforeEach(async (to, from, next) => {
  // 确保 CSRF Token 存在
  if (!axios.defaults.headers.common['X-CSRF-Token']) {
    try {
      const { data } = await axios.get('/api/csrf-token')
      axios.defaults.headers.common['X-CSRF-Token'] = data.token
    } catch {
      // 处理错误
    }
  }
  next()
})
```

---

## 点击劫持防护

### X-Frame-Options

```http
// 服务器响应头
X-Frame-Options: DENY           // 禁止所有 iframe 嵌入
X-Frame-Options: SAMEORIGIN     // 只允许同源嵌入
```

### CSP frame-ancestors

```http
// 更现代的方式
Content-Security-Policy: frame-ancestors 'self' https://trusted-site.com
```

### JavaScript 防护

```ts
// 检测是否被嵌入 iframe
if (window.self !== window.top) {
  // 阻止页面加载
  document.body.innerHTML = ''
  
  // 或重定向
  window.top.location.href = window.self.location.href
}

// Vue 组件中检测
onMounted(() => {
  if (window.self !== window.top) {
    console.warn('Page is being framed')
    // 可以采取保护措施
  }
})
```

---

## 敏感数据处理

### 存储安全

```ts
// ❌ 危险：明文存储敏感信息
localStorage.setItem('token', authToken)
localStorage.setItem('password', userPassword)
sessionStorage.setItem('creditCard', cardNumber)

// ✅ 安全：使用 httpOnly Cookie
// 由服务器设置：
// Set-Cookie: token=xxx; HttpOnly; Secure; SameSite=Strict

// ✅ 如果必须前端存储，加密后存储
import CryptoJS from 'crypto-js'

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY

function encryptData(data: string): string {
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString()
}

function decryptData(encrypted: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

// 使用
const encryptedToken = encryptData(authToken)
localStorage.setItem('token', encryptedToken)
```

### 敏感信息脱敏

```ts
// 数据脱敏函数
function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  const maskedLocal = local[0] + '***' + local.slice(-1)
  return `${maskedLocal}@${domain}`
}

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}

function maskIdCard(idCard: string): string {
  return idCard.replace(/(\d{4})\d{10}(\d{4})/, '$1**********$2')
}

// 使用
maskEmail('user@example.com')    // u***r@example.com
maskPhone('13812345678')         // 138****5678
maskIdCard('110101199001011234') // 1101**********1234
```

### 避免敏感信息泄露

```vue
<script setup>
// ❌ 危险：敏感信息暴露在前端代码
const API_KEY = 'sk-xxx-xxx-xxx'
const DB_PASSWORD = 'password123'

// ✅ 安全：使用环境变量（仍然要注意）
const API_KEY = import.meta.env.VITE_API_KEY

// ✅ 最佳：敏感操作放在后端
</script>

<!-- ❌ 危险：敏感信息在模板中 -->
<template>
  <div>API Key: {{ apiKey }}</div>
  <input v-model="password" />
</template>

<!-- ✅ 安全：使用 type="password" -->
<template>
  <input type="password" v-model="password" />
</template>
```

### Console 信息清理

```ts
// vite.config.ts - 生产环境移除 console
export default defineConfig({
  esbuild: {
    drop: ['console', 'debugger']
  }
})

// 或使用 terser
export default defineConfig({
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  }
})
```

---

## 内容安全策略

### CSP 配置

```html
<!-- 在 index.html 中配置 -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'self';
">
```

### CSP 指令说明

| 指令 | 说明 | 示例 |
|------|------|------|
| `default-src` | 默认资源来源 | `'self'` |
| `script-src` | JavaScript 来源 | `'self' 'unsafe-inline'` |
| `style-src` | CSS 来源 | `'self' 'unsafe-inline'` |
| `img-src` | 图片来源 | `'self' data: https:` |
| `connect-src` | 请求目标 | `'self' https://api.example.com` |
| `font-src` | 字体来源 | `'self' https://fonts.gstatic.com` |
| `frame-ancestors` | 允许嵌入的来源 | `'self'` |

### Vue 与 CSP

```ts
// Vue 3 的 CSP 兼容配置
// vite.config.ts
export default defineConfig({
  define: {
    // 禁用 Vue 的模板编译器（需要预编译模板）
    __VUE_PROD_DEVTOOLS__: false
  }
})
```

```html
<!-- 对于需要内联脚本的场景，使用 nonce -->
<script nonce="{{ nonce }}">
  // 代码
</script>

<!-- CSP 配置 -->
<meta http-equiv="Content-Security-Policy" 
      content="script-src 'self' 'nonce-{{ nonce }}'">
```

---

## 依赖安全

### 定期检查依赖

```bash
# npm
npm audit
npm audit fix

# pnpm
pnpm audit

# yarn
yarn audit
yarn audit fix
```

### 检查过时依赖

```bash
# 检查过时的包
npm outdated

# 使用 ncu 更新
npx npm-check-updates -u
```

### 使用安全配置

```json
// package.json
{
  "scripts": {
    "audit": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix"
  }
}
```

### CI/CD 安全检查

```yaml
# .github/workflows/security.yml
name: Security Audit
on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm audit --audit-level=high
```

---

## 安全检查清单

### 开发阶段

- [ ] 不使用 `v-html` 渲染用户内容
- [ ] 用户输入进行验证和消毒
- [ ] URL 使用白名单验证
- [ ] 敏感操作需要二次确认
- [ ] 不在前端存储敏感信息

### 构建阶段

- [ ] 配置 CSP 策略
- [ ] 移除生产环境 console
- [ ] 检查依赖安全漏洞
- [ ] 配置安全响应头

### 部署阶段

- [ ] 配置 HTTPS
- [ ] 设置安全 Cookie 属性
- [ ] 配置 X-Frame-Options
- [ ] 启用 HSTS

### 代码审查清单

| 检查项 | 说明 | 状态 |
|--------|------|------|
| XSS | 检查 v-html 使用 | ☐ |
| CSRF | 检查 Token 配置 | ☐ |
| 敏感数据 | 检查存储方式 | ☐ |
| 依赖安全 | 检查漏洞报告 | ☐ |
| CSP | 检查策略配置 | ☐ |

---

## 下一步

- [TypeScript最佳实践](04-安全与TypeScript实践.md) - 学习类型安全开发
- [常见问题解答](05-风格指南与FAQ.md) - 查看安全相关常见问题

## 参考资源

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Vue 安全指南](https://vuejs.org/guide/best-practices/security.html)
- [MDN CSP 指南](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [DOMPurify 文档](https://github.com/cure53/DOMPurify)


---

## TypeScript 最佳实践


> Vue 3 与 TypeScript 的最佳结合方式。本章节涵盖类型定义、泛型组件、类型工具使用等内容。

## 类型系统概述

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Vue 3 + TypeScript 类型体系                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐        │
│   │  组件类型      │   │  API 类型     │   │  工具类型     │        │
│   ├───────────────┤   ├───────────────┤   ├───────────────┤        │
│   │ • Props      │   │ • ref        │   │ • ExtractPropTypes│     │
│   │ • Emits      │   │ • reactive   │   │ • ComponentProps │     │
│   │ • Slots      │   │ • computed   │   │ • VNode          │     │
│   │ • Expose     │   │ • watch      │   │ • CSSProperties  │     │
│   └───────────────┘   └───────────────┘   └───────────────┘        │
│           │                   │                   │                │
│           └───────────────────┼───────────────────┘                │
│                               ▼                                    │
│                    ┌───────────────────┐                           │
│                    │    类型推断       │                           │
│                    │ • 模板类型推断    │                           │
│                    │ • 返回值推断      │                           │
│                    │ • 泛型约束        │                           │
│                    └───────────────────┘                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 组件类型定义

### Props 类型定义

```vue
<script setup lang="ts">
// 方式一：使用接口定义
interface Props {
  id: number
  name: string
  email?: string  // 可选属性
}

const props = defineProps<Props>()
</script>
```

```vue
<script setup lang="ts">
// 方式二：带默认值（withDefaults）
interface Props {
  title: string
  count?: number
  size?: 'small' | 'medium' | 'large'  // 字面量类型
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
  size: 'medium'
})
</script>
```

```vue
<script setup lang="ts">
// 方式三：使用 PropType（复杂类型）
import type { PropType } from 'vue'

interface User {
  id: number
  name: string
}

defineProps({
  user: {
    type: Object as PropType<User>,
    required: true
  },
  users: {
    type: Array as PropType<User[]>,
    default: () => []
  },
  callback: {
    type: Function as PropType<(value: string) => void>,
    required: true
  }
})
</script>
```

### Emits 类型定义

```vue
<script setup lang="ts">
// 方式一：类型字面量（call-signature 语法）
interface Emits {
  (e: 'update', value: string): void
  (e: 'delete', id: number): void
  (e: 'change', event: Event): void
}

const emit = defineEmits<Emits>()

// 使用
emit('update', 'new value')
emit('delete', 123)
</script>
```

```vue
<script setup lang="ts">
// 方式二：具名元组语法（Vue 3.3+，更简洁）
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'submit': []
}>()
</script>
```

```vue
<script setup lang="ts">
// 方式三：运行时声明（可对 payload 做校验，返回 false 时告警）
defineEmits({
  submit: (payload: { email: string; password: string }) => {
    return payload.email.length > 0
  }
})
</script>
```

### Slots 类型定义

```vue
<script setup lang="ts">
// 定义插槽类型
interface SlotProps {
  item: { id: number; name: string }
  index: number
  selected: boolean
}

// 使用 defineSlots (Vue 3.3+)
const slots = defineSlots<{
  default(props: SlotProps): any
  header(): any
  footer(): any
}>()
</script>

<template>
  <div>
    <slot name="header" />
    
    <div v-for="(item, index) in items" :key="item.id">
      <slot 
        :item="item" 
        :index="index" 
        :selected="selectedId === item.id"
      />
    </div>
    
    <slot name="footer" />
  </div>
</template>
```

### Ref 模板引用类型

```vue
<script setup lang="ts">
import { ref, onMounted, useTemplateRef } from 'vue'
import type { ComponentPublicInstance } from 'vue'

// DOM 元素引用
const inputRef = ref<HTMLInputElement | null>(null)
const divRef = ref<HTMLDivElement | null>(null)

// 组件引用
interface ChildComponentExpose {
  doSomething: () => void
  count: number
}

const childRef = ref<ComponentPublicInstance & ChildComponentExpose | null>(null)

// 使用模板引用函数（Vue 3.5+）
const inputEl = useTemplateRef<HTMLInputElement>('input')

onMounted(() => {
  inputEl.value?.focus()
})
</script>

<template>
  <input ref="input" type="text" />
  <div ref="divRef">Content</div>
  <ChildComponent ref="childRef" />
</template>
```

---

## 组合式函数类型

### 返回值类型定义

```ts
// composables/useUser.ts
import { ref, computed, type Ref, type ComputedRef } from 'vue'

// 定义返回值接口
interface User {
  id: number
  name: string
  email: string
}

interface UseUserReturn {
  // 响应式状态
  user: Ref<User | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  
  // 计算属性
  isLoggedIn: ComputedRef<boolean>
  
  // 方法
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchUser: (id: number) => Promise<void>
}

// 组合式函数
export function useUser(): UseUserReturn {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)
  
  const isLoggedIn = computed(() => user.value !== null)
  
  async function login(email: string, password: string) {
    loading.value = true
    error.value = null
    try {
      user.value = await authApi.login(email, password)
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }
  
  function logout() {
    user.value = null
  }
  
  async function fetchUser(id: number) {
    loading.value = true
    try {
      user.value = await api.fetchUser(id)
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }
  
  return {
    user,
    loading,
    error,
    isLoggedIn,
    login,
    logout,
    fetchUser
  }
}
```

### 带参数的组合式函数

```ts
// composables/useFetch.ts
import { ref, watchEffect, type Ref } from 'vue'

interface UseFetchOptions<T> {
  immediate?: boolean
  initialValue?: T
  transform?: (data: any) => T
}

interface UseFetchReturn<T> {
  data: Ref<T | undefined>
  error: Ref<Error | null>
  loading: Ref<boolean>
  execute: () => Promise<void>
}

export function useFetch<T>(
  url: string | Ref<string>,
  options: UseFetchOptions<T> = {}
): UseFetchReturn<T> {
  const { immediate = true, initialValue, transform } = options
  
  const data = ref<T | undefined>(initialValue) as Ref<T | undefined>
  const error = ref<Error | null>(null)
  const loading = ref(false)
  
  async function execute() {
    const resolvedUrl = typeof url === 'string' ? url : url.value
    
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(resolvedUrl)
      const result = await response.json()
      data.value = transform ? transform(result) : result
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }
  
  if (immediate) {
    execute()
  }
  
  // 响应式 URL 变化
  if (typeof url !== 'string') {
    watchEffect(() => {
      execute()
    })
  }
  
  return { data, error, loading, execute }
}
```

### 提供者/注入者模式类型

```ts
// composables/useTheme.ts
import { inject, provide, ref, type Ref, type InjectionKey } from 'vue'

// 定义类型和 key
interface ThemeContext {
  theme: Ref<'light' | 'dark'>
  toggleTheme: () => void
}

const ThemeKey: InjectionKey<ThemeContext> = Symbol('theme')

// 提供者
export function provideTheme() {
  const theme = ref<'light' | 'dark'>('light')
  
  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }
  
  const context: ThemeContext = {
    theme,
    toggleTheme
  }
  
  provide(ThemeKey, context)
  
  return context
}

// 注入者
export function useTheme() {
  const context = inject(ThemeKey)
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  
  return context
}
```

---

## 泛型组件

### 基础泛型组件

```vue
<!-- GenericList.vue -->
<script setup lang="ts" generic="T extends { id: number }">
import { ref, computed } from 'vue'

interface Props {
  items: T[]
  selectedId?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', item: T): void
}>()

const selectedItem = computed(() => 
  props.items.find(item => item.id === props.selectedId)
)

function handleSelect(item: T) {
  emit('select', item)
}
</script>

<template>
  <ul>
    <li 
      v-for="item in items" 
      :key="item.id"
      :class="{ selected: item.id === selectedId }"
      @click="handleSelect(item)"
    >
      <slot :item="item" :selected="item.id === selectedId">
        {{ item }}
      </slot>
    </li>
  </ul>
</template>
```

### 使用泛型组件

```vue
<script setup lang="ts">
import GenericList from './GenericList.vue'

interface User {
  id: number
  name: string
  email: string
}

interface Product {
  id: number
  title: string
  price: number
}

const users: User[] = [
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
]

const products: Product[] = [
  { id: 1, title: 'Product A', price: 100 },
  { id: 2, title: 'Product B', price: 200 }
]

function handleUserSelect(user: User) {
  console.log('Selected user:', user.name)
}

function handleProductSelect(product: Product) {
  console.log('Selected product:', product.title)
}
</script>

<template>
  <!-- 自动推断类型为 User[] -->
  <GenericList 
    :items="users" 
    @select="handleUserSelect"
  >
    <template #default="{ item }">
      {{ item.name }} - {{ item.email }}
    </template>
  </GenericList>
  
  <!-- 自动推断类型为 Product[] -->
  <GenericList 
    :items="products" 
    @select="handleProductSelect"
  >
    <template #default="{ item }">
      {{ item.title }} - ${{ item.price }}
    </template>
  </GenericList>
</template>
```

### 多泛型参数组件

```vue
<script setup lang="ts" generic="T, K extends keyof T">
interface Props {
  data: T[]
  keyField: K
  displayField: K
  sortField?: K
}

const props = defineProps<Props>()

const sortedData = computed(() => {
  if (!props.sortField) return props.data
  
  return [...props.data].sort((a, b) => {
    const aVal = a[props.sortField!]
    const bVal = b[props.sortField!]
    return aVal > bVal ? 1 : -1
  })
})
</script>

<template>
  <div v-for="item in sortedData" :key="item[keyField]">
    {{ item[displayField] }}
  </div>
</template>
```

---

## 类型工具使用

### Vue 工具类型

```ts
import type { 
  Ref, 
  ComputedRef, 
  WritableComputedRef,
  ShallowRef,
  MaybeRef,
  MaybeRefOrGetter,
  ExtractPropTypes,
  ComponentInstance,
  VNode,
  CSSProperties
} from 'vue'

// 提取组件 Props/Slots 类型需使用 vue-component-type-helpers 包
import type { ComponentProps, ComponentSlots } from 'vue-component-type-helpers'

// Ref 类型
const count: Ref<number> = ref(0)
const user: Ref<User | null> = ref(null)

// ComputedRef 类型
const doubled: ComputedRef<number> = computed(() => count.value * 2)

// MaybeRef - 可能是 Ref 或普通值
function processValue(value: MaybeRef<string>) {
  return unref(value)
}

// MaybeRefOrGetter - 可能是 Ref、getter 或普通值
function processGetter(value: MaybeRefOrGetter<string>) {
  return toValue(value)
}

// CSSProperties - 样式类型
const style: CSSProperties = {
  color: 'red',
  fontSize: '14px'
}
```

### 类型提取工具

```ts
// 从运行时 Props 选项提取类型（需先单独声明选项对象）
import type { ExtractPropTypes } from 'vue'

const propsOptions = {
  title: String,
  count: { type: Number, default: 0 },
  active: Boolean
} as const

type PropsType = ExtractPropTypes<typeof propsOptions>
// { title?: string; count: number; active?: boolean }

const props = defineProps(propsOptions)

// 组件 Props/Slots 类型（vue-component-type-helpers）
import type { ComponentProps, ComponentSlots } from 'vue-component-type-helpers'
import MyComponent from './MyComponent.vue'

type MyComponentProps = ComponentProps<typeof MyComponent>
type MyComponentSlots = ComponentSlots<typeof MyComponent>
```

### 通用类型工具

```ts
// 类型守卫
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data
  )
}

// 使用类型守卫
function processData(data: unknown) {
  if (isUser(data)) {
    console.log(data.name) // 类型为 User
  }
}

// 断言函数
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('Value is not a string')
  }
}

// 类型谓词
function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

// 过滤 null/undefined
const filtered = array.filter(isDefined)
```

### 类型导入

```ts
// ✅ 推荐：使用 type 关键字导入类型
import type { Ref, ComputedRef } from 'vue'
import type { User, Product } from '@/types'
import type { PropType } from 'vue'

// ✅ 混合导入
import { ref, computed, type Ref, type ComputedRef } from 'vue'

// ✅ 类型重导出
export type { User, Product } from '@/types'
```

---

## 类型声明文件

### 全局类型声明

```ts
// env.d.ts
/// <reference types="vite/client" />

// 环境变量类型
interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_DEBUG: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// 全局组件声明
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
```

### 模块扩展

```ts
// 扩展 Vue 全局属性
declare module 'vue' {
  interface ComponentCustomProperties {
    $http: typeof import('axios').default
    $translate: (key: string) => string
  }
}

// 扩展组件选项
declare module 'vue' {
  interface ComponentCustomOptions {
    auth?: boolean
  }
}

// 使用
const app = createApp(App)
app.config.globalProperties.$http = axios

// 在组件中使用
import { getCurrentInstance } from 'vue'

const instance = getCurrentInstance()
const http = instance?.appContext.config.globalProperties.$http
```

### 类型组织

```
src/
├── types/
│   ├── index.ts          # 统一导出
│   ├── user.ts           # 用户相关类型
│   ├── product.ts        # 产品相关类型
│   ├── api.ts            # API 响应类型
│   └── components.ts     # 组件通用类型
```

```ts
// types/user.ts
export interface User {
  id: number
  name: string
  email: string
  role: UserRole
}

export type UserRole = 'admin' | 'user' | 'guest'

export interface UserForm {
  name: string
  email: string
  password: string
}

// types/index.ts
export * from './user'
export * from './product'
export * from './api'
export * from './components'
```

---

## 常见类型问题

### any vs unknown

```ts
// ❌ 避免 any
function parseJson(data: any) {
  return JSON.parse(data)
}

// ✅ 使用 unknown
function parseJsonSafe(data: unknown) {
  if (typeof data !== 'string') {
    throw new Error('Data must be a string')
  }
  return JSON.parse(data)
}

// 类型断言谨慎使用
const value = data as User  // ❌ 不安全

// ✅ 使用类型守卫
function isUser(data: unknown): data is User {
  // 进行运行时检查
  return true
}
```

### 响应式类型丢失

```ts
// ❌ 解构失去响应式
const state = reactive({ count: 0 })
const { count } = state  // 失去响应式

// ✅ 使用 toRefs
const { count } = toRefs(state)

// ❌ 直接赋值失去响应式
let list = ref([])
list = newList  // 失去响应式

// ✅ 修改 .value
list.value = newList

// ❌ 数组方法可能失去类型
const filtered = reactiveList.filter(Boolean)

// ✅ 使用类型守卫
const filtered = reactiveList.filter((item): item is Item => item !== null)
```

### 组件实例类型

```ts
import { ref } from 'vue'
import ChildComponent from './ChildComponent.vue'
import type { ComponentInstance } from 'vue'

// ✅ 获取组件实例类型
type ChildInstance = ComponentInstance<typeof ChildComponent>

const childRef = ref<ChildInstance | null>(null)

// 或使用 InstanceType
type ChildInstance2 = InstanceType<typeof ChildComponent>
```

---

## 类型检查清单

### 开发配置

- [ ] 启用 `strict` 模式
- [ ] 启用 `noImplicitAny`
- [ ] 启用 `strictNullChecks`
- [ ] 配置路径别名 (`@/*`)

### 代码规范

- [ ] Props 使用类型定义
- [ ] Emits 使用类型定义
- [ ] 组合式函数定义返回值类型
- [ ] 使用 `type` 关键字导入类型
- [ ] 避免使用 `any`，优先 `unknown`

### 类型组织

- [ ] 类型集中管理 (`types/` 目录)
- [ ] 通用类型复用
- [ ] 模块导出类型

---

## 下一步

- [常见问题解答](05-风格指南与FAQ.md) - 查看 TypeScript 相关常见问题

## 参考资源

- [Vue 3 TypeScript 支持](https://vuejs.org/guide/typescript/overview.html)
- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [Vue TSC](https://github.com/vuejs/language-tools)
