---
title: TypeScript集成
description: "Vue 3 TypeScript 集成指南：create-vue 项目配置、defineProps/defineEmits 类型声明、泛型组件、组合式函数与 provide/inject 类型、useTemplateRef 模板引用类型，以及 Vue Loader 与 Webpack 的 SFC 编译配置与迁移实践。"
keywords: [TypeScript, Vue]
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# TypeScript 支持

> Vue 3 从设计之初就考虑了 TypeScript 支持，使用 TypeScript 编写，提供完整的类型推断和 IDE 支持。

## 概述

### Vue 3 的 TypeScript 优势

| 特性 | 说明 |
|------|------|
| **源码使用 TS 编写** | Vue 3 核心代码使用 TypeScript 编写 |
| **完整的类型定义** | 内置完整的类型声明文件 |
| **模板类型检查** | 支持模板中的类型检查（Volar） |
| **API 类型推断** | Composition API 完美的类型支持 |
| **编辑器支持** | VS Code + Volar 提供优秀的开发体验 |

### 类型系统架构

```
┌──────────────────────────────────────────────────────────┐
│                  Vue 3 类型系统                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   ┌─────────────┐    ┌─────────────┐    ┌────────────┐  │
│   │ Props 类型  │    │ Emits 类型  │    │ Ref 类型   │  │
│   └─────────────┘    └─────────────┘    └────────────┘  │
│                                                          │
│   ┌─────────────┐    ┌─────────────┐    ┌────────────┐  │
│   │ 组件实例    │    │ 模板引用    │    │ 组合式函数 │  │
│   └─────────────┘    └─────────────┘    └────────────┘  │
│                                                          │
│   ┌──────────────────────────────────────────────────┐  │
│   │              类型工具函数                         │  │
│   │  ExtractPropTypes | ExtractPublicPropTypes       │  │
│   │  ComponentPropsOptions | ComponentOptionsMixin   │  │
│   └──────────────────────────────────────────────────┘  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## 项目配置

### 创建 TypeScript 项目

```bash
# 使用 create-vue
npm create vue@latest
# 选择 TypeScript

# 或使用 Vite 模板
npm create vite@latest my-app -- --template vue-ts
```

### tsconfig.json 配置

```json
{
  "compilerOptions": {
    // 编译目标
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    
    // 类型检查
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    
    // 模块解析
    "resolveJsonModule": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    
    // 输出配置
    "jsx": "preserve",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "noEmit": true,
    
    // 路径映射
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    },
    
    // 类型定义
    "types": ["vite/client"]
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/**/*.vue"
  ],
  "exclude": ["node_modules"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### tsconfig.node.json

```json
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

### 环境声明文件

```ts
// src/env.d.ts
/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## 组件类型

### Props 类型定义

#### 基于类型的声明

```vue
<script setup lang="ts">
interface Props {
  title: string
  count?: number
  items: string[]
  user: {
    id: number
    name: string
  }
}

const props = defineProps<Props>()
</script>
```

#### 带默认值的声明

```vue
<script setup lang="ts">
interface Props {
  title: string
  count?: number
  items?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
  items: () => []
})
</script>
```

#### 运行时声明（复杂验证）

```vue
<script setup lang="ts">
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    default: 0,
    validator: (value: number) => value >= 0
  },
  items: {
    type: Array as PropType<string[]>,
    default: () => []
  }
})
</script>
```

### Emits 类型定义

#### 函数重载形式

```vue
<script setup lang="ts">
interface Emits {
  (e: 'change', id: number): void
  (e: 'update', value: string): void
  (e: 'submit', payload: { name: string; age: number }): void
}

const emit = defineEmits<Emits>()

// 使用
emit('change', 1)
emit('update', 'value')
emit('submit', { name: 'John', age: 25 })
</script>
```

#### 对象形式（Vue 3.3+）

```vue
<script setup lang="ts">
const emit = defineEmits<{
  change: [id: number]
  update: [value: string]
  submit: [payload: { name: string; age: number }]
}>()
</script>
```

### Ref 类型

```vue
<script setup lang="ts">
import { ref, Ref, ShallowRef, shallowRef } from 'vue'

// 自动推断
const count = ref(0)              // Ref<number>
const name = ref('hello')         // Ref<string>

// 显式类型
const user = ref<User | null>(null)

// 复杂类型
interface User {
  id: number
  name: string
}
const users: Ref<User[]> = ref([])

// 浅响应式（适合大对象）
const bigData: ShallowRef<BigData> = shallowRef({ /* 大量数据 */ })
</script>
```

### Reactive 类型

```vue
<script setup lang="ts">
import { reactive } from 'vue'

interface State {
  count: number
  name: string
  items: { id: number; text: string }[]
}

const state = reactive<State>({
  count: 0,
  name: '',
  items: []
})
</script>
```

```vue
<script setup lang="ts">
// 或者使用推断：类型由初始值推断
const inferred = reactive({
  count: 0,
  name: ''
})
// ⚠️ 不要对 reactive 的参数使用 as const：
// 它会把属性变成只读的字面量类型，导致后续无法修改 state.count
</script>
```

### Computed 类型

```vue
<script setup lang="ts">
import { ref, computed, ComputedRef } from 'vue'

const firstName = ref('John')
const lastName = ref('Doe')
const count = ref(0)

// 自动推断
const double = computed(() => count.value * 2)  // ComputedRef<number>

// 显式类型
const formatted = computed<string>(() => {
  return `Count: ${count.value}`
})

// 可写 computed
const fullName = computed({
  get: (): string => `${firstName.value} ${lastName.value}`,
  set: (value: string) => {
    const [first, last] = value.split(' ')
    firstName.value = first
    lastName.value = last
  }
})
</script>
```

## 泛型组件

### 定义泛型组件

```vue
<script setup lang="ts" generic="T">
interface Props {
  items: T[]
  selected?: T
}

const props = defineProps<Props>()
const emit = defineEmits<{
  select: [item: T]
}>()
</script>

<template>
  <ul>
    <li 
      v-for="item in items" 
      :key="item"
      @click="emit('select', item)"
    >
      {{ item }}
    </li>
  </ul>
</template>
```

### 多个泛型参数

```vue
<script setup lang="ts" generic="T, U">
interface Props {
  items: T[]
  transform: (item: T) => U
}

const props = defineProps<Props>()
</script>
```

### 泛型约束

```vue
<script setup lang="ts" generic="T extends { id: number }">
interface Props {
  items: T[]
  selectedId?: number
}

const props = defineProps<Props>()

const selected = computed(() => 
  props.items.find(item => item.id === props.selectedId)
)
</script>
```

### 使用泛型组件

```vue
<script setup lang="ts">
import List from './List.vue'

interface User {
  id: number
  name: string
}

const users: User[] = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]
</script>

<template>
  <!-- T 自动推断为 User -->
  <List :items="users" @select="handleSelect" />
  
  <!-- 显式指定泛型 -->
  <List<User> :items="users" />
</template>
```

## 组合式函数类型

### 定义返回类型

```ts
// useCounter.ts
import { ref, Ref, computed, ComputedRef } from 'vue'

interface UseCounterOptions {
  min?: number
  max?: number
}

interface UseCounterReturn {
  count: Ref<number>
  double: ComputedRef<number>
  increment: () => void
  decrement: () => void
  reset: () => void
}

export function useCounter(
  initialValue = 0,
  options: UseCounterOptions = {}
): UseCounterReturn {
  const { min = -Infinity, max = Infinity } = options
  
  const count = ref(initialValue)
  const double = computed(() => count.value * 2)
  
  const increment = () => {
    count.value = Math.min(count.value + 1, max)
  }
  
  const decrement = () => {
    count.value = Math.max(count.value - 1, min)
  }
  
  const reset = () => {
    count.value = initialValue
  }
  
  return { count, double, increment, decrement, reset }
}
```

### 异步组合式函数

```ts
// useFetch.ts
import { ref, Ref, watchEffect, toValue } from 'vue'

interface UseFetchReturn<T> {
  data: Ref<T | null>
  error: Ref<Error | null>
  isLoading: Ref<boolean>
  execute: () => Promise<void>
}

export function useFetch<T>(
  url: string | (() => string)
): UseFetchReturn<T> {
  const data = ref<T | null>(null) as Ref<T | null>
  const error = ref<Error | null>(null)
  const isLoading = ref(false)
  
  const execute = async () => {
    isLoading.value = true
    error.value = null
    
    try {
      const response = await fetch(toValue(url))
      data.value = await response.json()
    } catch (e) {
      error.value = e as Error
    } finally {
      isLoading.value = false
    }
  }
  
  watchEffect(() => {
    execute()
  })
  
  return { data, error, isLoading, execute }
}
```

## provide/inject 类型

### 使用 InjectionKey

```ts
// types.ts
import type { InjectionKey, Ref } from 'vue'

export interface Theme {
  name: Ref<string>
  toggle: () => void
}

export const ThemeKey: InjectionKey<Theme> = Symbol('theme')
```

```vue
<!-- Provider.vue -->
<script setup lang="ts">
import { provide, ref } from 'vue'
import { ThemeKey, type Theme } from './types'

const theme: Theme = {
  name: ref('light'),
  toggle: () => {
    theme.name.value = theme.name.value === 'light' ? 'dark' : 'light'
  }
}

provide(ThemeKey, theme)
</script>
```

```vue
<!-- Consumer.vue -->
<script setup lang="ts">
import { inject } from 'vue'
import { ThemeKey } from './types'

// 类型为 Theme | undefined
const theme = inject(ThemeKey)

// 提供默认值，类型为 Theme
const themeWithDefault = inject(ThemeKey, {
  name: ref('light'),
  toggle: () => {}
})

// 确定祖先组件一定提供时，可用非空断言跳过 undefined 类型
const themeOrFail = inject(ThemeKey)!
</script>
```

## 模板引用类型

### DOM 元素引用

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue'

const inputEl = ref<HTMLInputElement | null>(null)
const divEl = ref<HTMLDivElement | null>(null)

onMounted(() => {
  inputEl.value?.focus()
  console.log(divEl.value?.clientWidth)
})
</script>

<template>
  <input ref="inputEl" type="text" />
  <div ref="divEl">Content</div>
</template>
```

### 组件引用

```vue
<script setup lang="ts">
import { ref } from 'vue'
import MyComponent from './MyComponent.vue'

// 获取组件公开的属性/方法
const componentRef = ref<InstanceType<typeof MyComponent> | null>(null)
</script>
```

```vue
<script setup lang="ts">
import { ref } from 'vue'

// 或使用更精确的类型（配合 defineExpose 暴露的内容）
interface MyComponentExposed {
  count: number
  increment: () => void
}
const componentRef = ref<MyComponentExposed | null>(null)

const callComponentMethod = () => {
  componentRef.value?.increment()
}
</script>

<template>
  <MyComponent ref="componentRef" />
</template>
```

### 使用 useTemplateRef（Vue 3.5+）

```vue
<script setup lang="ts">
import { useTemplateRef, onMounted } from 'vue'

// 自动推断类型
const inputEl = useTemplateRef<HTMLInputElement>('input')

onMounted(() => {
  inputEl.value?.focus()
})
</script>

<template>
  <input ref="input" type="text" />
</template>
```

## 类型工具函数

### Vue 内置类型工具

```ts
import type {
  // 组件相关
  DefineComponent,
  ComponentPublicInstance,
  Component,
  
  // Props 相关
  PropType,
  ExtractPropTypes,
  ExtractPublicPropTypes,
  
  // 响应式相关
  Ref,
  UnwrapRef,
  ShallowRef,
  ComputedRef,
  WritableComputedRef,
  
  // 其他
  VNode,
  Slots,
  SetupContext,
  InjectionKey
} from 'vue'

// PropType 示例
const props = defineProps({
  items: Array as PropType<string[]>,
  callback: Function as PropType<(value: string) => void>,
  user: Object as PropType<{ id: number; name: string }>
})

// ExtractPropTypes - 提取 props 类型
type PropsType = ExtractPropTypes<typeof props>

// UnwrapRef - 解包 Ref
type Unwrapped = UnwrapRef<Ref<{ name: string }>>  // { name: string }
```

### 自定义类型工具

```ts
// 严格提取 props（必填项）
type StrictProps<T> = {
  [K in keyof T as T[K] extends { required: true } ? K : never]: T[K]
}

// 可选 props
type OptionalProps<T> = {
  [K in keyof T as T[K] extends { required: true } ? never : K]?: T[K]
}

// 组件实例类型
type ComponentInstance<T> = T extends new (...args: any) => infer R 
  ? R 
  : never

// 使用
type MyInstance = ComponentInstance<typeof MyComponent>
```

## 模板类型检查

### Volar 配置

```json
// tsconfig.json
{
  "vueCompilerOptions": {
    "target": 3.3,
    "strictTemplates": true
  }
}
```

### 模板中的类型检查

```vue
<script setup lang="ts">
interface User {
  id: number
  name: string
}

const props = defineProps<{
  user: User
}>()
</script>

<template>
  <!-- ✅ 正确 -->
  <div>{{ user.name }}</div>
  
  <!-- ❌ 错误：属性不存在 -->
  <div>{{ user.age }}</div>
  
  <!-- ❌ 错误：类型不匹配 -->
  <div :id="user.id.toString()">{{ user.name }}</div>
</template>
```

### JSX 类型支持

```tsx
// 安装 @vitejs/plugin-vue-jsx
import { defineComponent } from 'vue'

interface Props {
  title: string
  count?: number
}

export default defineComponent({
  props: {
    title: { type: String, required: true },
    count: { type: Number, default: 0 }
  },
  setup(props: Props) {
    return () => (
      <div>
        <h1>{props.title}</h1>
        <p>Count: {props.count}</p>
      </div>
    )
  }
})
```

## 常见类型错误

### 1. ref 解包问题

```ts
// ❌ 错误：直接使用 ref 会得到 Ref 类型
const count = ref(0)
const double: number = count // 类型错误

// ✅ 正确：使用 .value
const double: number = count.value

// ✅ 或使用类型工具
const unwrapped: number = unref(count)
```

### 2. 数组类型问题

```ts
// ❌ 错误
const props = defineProps({
  items: Array // 类型为 any[]
})

// ✅ 正确
const props = defineProps({
  items: Array as PropType<string[]>
})

// ✅ 或使用类型声明
interface Props {
  items: string[]
}
const props = defineProps<Props>()
```

### 3. 事件类型问题

```ts
// ❌ 错误：缺少类型
const emit = defineEmits(['change'])
emit('change', 'string') // 参数类型为 any

// ✅ 正确：使用类型声明
interface Emits {
  (e: 'change', value: number): void
}
const emit = defineEmits<Emits>()
emit('change', 123) // 类型安全
```

### 4. 组件类型问题

```ts
// ❌ 错误
import MyComponent from './MyComponent.vue'
const component: MyComponent = ref() // 不能直接使用

// ✅ 正确
const componentRef = ref<InstanceType<typeof MyComponent> | null>(null)
```

### 5. 异步组件类型

```ts
// ❌ 错误
const AsyncComponent = defineAsyncComponent(() => import('./MyComponent.vue'))
// 类型不完整

// ✅ 正确
import type { DefineComponent } from 'vue'
const AsyncComponent: DefineComponent = defineAsyncComponent(
  () => import('./MyComponent.vue')
)
```

### 6. 路由类型扩展

```ts
// src/types/router.d.ts
import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    title?: string
    roles?: string[]
  }
}

// 使用
router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    // ...
  }
})
```

## 最佳实践

### 1. 优先使用类型声明

```vue
<!-- ✅ 推荐 -->
<script setup lang="ts">
interface Props {
  title: string
  count?: number
}
const props = defineProps<Props>()
</script>

<!-- ❌ 不推荐 -->
<script setup>
const props = defineProps({
  title: String,
  count: Number
})
</script>
```

### 2. 为组合式函数添加类型

```ts
// ✅ 导出清晰的类型接口
export interface UseFetchReturn<T> {
  data: Ref<T | null>
  error: Ref<Error | null>
  isLoading: Ref<boolean>
}

export function useFetch<T>(url: string): UseFetchReturn<T> {
  // ...
}
```

### 3. 使用类型守卫

```vue
<script setup lang="ts">
import { isRef, unref, type Ref } from 'vue'

const value: Ref<string> | string = Math.random() > 0.5 ? ref('hello') : 'world'

if (isRef(value)) {
  console.log(value.value)
} else {
  console.log(value)
}

// 或使用 unref
console.log(unref(value))
</script>
```

### 4. 保持类型文件独立

```
src/
├── types/
│   ├── global.d.ts      # 全局类型
│   ├── api.ts           # API 响应类型
│   ├── store.ts         # Store 状态类型
│   └── components.ts    # 组件共享类型
```

## 相关资源

- [Vue TypeScript 官方文档](https://vuejs.org/guide/typescript/overview.html)
- [TypeScript 官方文档](https://www.typescriptlang.org/)
- [Vue + TypeScript 最佳实践](https://vuejs.org/guide/typescript/overview.html#recommended-configuration)


---

## Vue Loader 与 Webpack 集成


> Vue Loader 是 Webpack 的加载器，用于解析和编译 Vue 单文件组件（`.vue` 文件）。

## 概述

### 什么是 Vue Loader？

Vue Loader 是一个 Webpack loader，它允许你以一种名为单文件组件（SFC）的格式撰写 Vue 组件。

```
┌─────────────────────────────────────────────────────────┐
│                    Vue Loader 工作流程                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   MyComponent.vue                                       │
│        │                                                │
│        ▼                                                │
│   vue-loader (解析 SFC)                                 │
│        │                                                │
│        ├── <template> → vue-template-loader            │
│        │                                                │
│        ├── <script> → babel-loader                     │
│        │                                                │
│        └── <style> → vue-style-loader + css-loader     │
│                                                         │
│        ▼                                                │
│   Vue Component (JavaScript 模块)                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Vue Loader vs @vitejs/plugin-vue

| 特性 | Vue Loader (Webpack) | @vitejs/plugin-vue (Vite) |
|------|---------------------|---------------------------|
| 构建工具 | Webpack | Vite |
| 配置复杂度 | 较复杂 | 简单 |
| 开发速度 | 较慢 | 极快 |
| 生态成熟度 | 非常成熟 | 快速发展 |
| 适用场景 | 复杂项目、Vue 2 项目 | 新项目、Vue 3 项目 |

## 安装与配置

### 安装

```bash
npm install -D vue-loader vue-template-compiler  # Vue 2
npm install -D vue-loader @vue/compiler-sfc      # Vue 3
```

### 基础配置

```js
// webpack.config.js
const { VueLoaderPlugin } = require('vue-loader')
const { resolve } = require('path')

module.exports = {
  mode: 'development',
  entry: './src/main.js',
  output: {
    path: resolve(__dirname, 'dist'),
    filename: 'bundle.js'
  },
  
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      {
        test: /\.js$/,
        loader: 'babel-loader'
      },
      {
        test: /\.css$/,
        use: ['vue-style-loader', 'css-loader']
      }
    ]
  },
  
  plugins: [
    new VueLoaderPlugin()
  ],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'vue$': 'vue/dist/vue.esm-bundler.js'
    },
    extensions: ['.js', '.vue', '.json']
  }
}
```

### Vue 3 完整配置

```js
// webpack.config.js
const { VueLoaderPlugin } = require('vue-loader')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { resolve } = require('path')

module.exports = (env) => ({
  mode: env.production ? 'production' : 'development',
  entry: './src/main.ts',
  
  output: {
    path: resolve(__dirname, 'dist'),
    filename: 'js/[name].[contenthash:8].js',
    clean: true
  },
  
  module: {
    rules: [
      // Vue SFC
      {
        test: /\.vue$/,
        loader: 'vue-loader'
      },
      
      // TypeScript
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          appendTsSuffixTo: [/\.vue$/],
          transpileOnly: true
        }
      },
      
      // JavaScript
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      
      // CSS
      {
        test: /\.css$/,
        use: ['vue-style-loader', 'css-loader', 'postcss-loader']
      },
      
      // SCSS
      {
        test: /\.scss$/,
        use: [
          'vue-style-loader',
          'css-loader',
          'postcss-loader',
          'sass-loader'
        ]
      },
      
      // Less
      {
        test: /\.less$/,
        use: [
          'vue-style-loader',
          'css-loader',
          'postcss-loader',
          'less-loader'
        ]
      },
      
      // 静态资源
      {
        test: /\.(png|jpe?g|gif|svg|webp)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024  // 8KB
          }
        },
        generator: {
          filename: 'images/[name].[hash:6][ext]'
        }
      },
      
      // 字体
      {
        test: /\.(woff2?|eot|ttf|otf)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'fonts/[name].[hash:6][ext]'
        }
      }
    ]
  },
  
  plugins: [
    new VueLoaderPlugin(),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: 'index.html'
    })
  ],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      'vue': '@vue/runtime-dom'
    },
    extensions: ['.ts', '.js', '.vue', '.json']
  },
  
  devServer: {
    static: {
      directory: resolve(__dirname, 'public')
    },
    hot: true,
    open: true,
    port: 3000,
    historyApiFallback: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  
  devtool: env.production ? false : 'eval-source-map'
})
```

## 工作原理

### 编译流程

```
┌─────────────────────────────────────────────────────────────┐
│                    SFC 编译过程                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. 解析阶段                                                 │
│     .vue 文件                                               │
│         │                                                   │
│         ▼                                                   │
│     @vue/compiler-sfc.parse()                               │
│         │                                                   │
│         ├── descriptor.template                             │
│         ├── descriptor.script                               │
│         ├── descriptor.styles[]                             │
│         └── descriptor.customBlocks[]                       │
│                                                             │
│  2. 转换阶段                                                 │
│     各块内容 → 对应 loader 处理                              │
│                                                             │
│  3. 组装阶段                                                 │
│     各块处理结果 → 组装成 Vue 组件                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 模块导出

Vue Loader 将 `.vue` 文件编译为导出 Vue 组件选项对象的 JavaScript 模块：

```js
// 编译后的模块大致结构
import { render } from './MyComponent.vue?vue&type=template'
import script from './MyComponent.vue?vue&type=script'

// 合并选项
export default {
  ...script,
  render
}

// 样式注入
import './MyComponent.vue?vue&type=style&index=0'
```

### 资源管道

每个语言块可以通过 `lang` 属性指定不同的 loader：

```vue
<template lang="pug">
  div.container
    h1 {{ title }}
</template>

<script lang="ts">
import { ref } from 'vue'
const title = ref<string>('Hello')
</script>

<style lang="scss" scoped>
.container {
  padding: 20px;
}
</style>
```

## 功能特性

### scoped 样式

```vue
<style scoped>
.container {
  color: red;
}

/* 深度选择器 */
::v-deep .child {
  color: blue;
}

/* Vue 3 推荐语法 */
:deep(.child) {
  color: blue;
}
</style>
```

编译后：

```css
.container[data-v-abc123] {
  color: red;
}

.child[data-v-abc123] {
  color: blue;
}
```

### CSS Modules

```vue
<template>
  <div :class="$style.container">
    <p :class="$style.text">Hello</p>
  </div>
</template>

<style module>
.container { padding: 20px; }
.text { color: blue; }
</style>
```

### 自定义块

```vue
<template>
  <div>{{ t('hello') }}</div>
</template>

<script>
export default {
  // ...
}
</script>

<i18n>
{
  "en": { "hello": "Hello World" },
  "zh": { "hello": "你好世界" }
}
</i18n>
```

配置自定义块 loader：

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          compilerOptions: {
            // Vue 3 编译器选项
          }
        }
      },
      
      // 自定义块 loader
      {
        resourceQuery: /blockType=i18n/,
        loader: 'json-loader'
      }
    ]
  }
}
```

## 高级配置

### 编译器选项

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          // Vue 3 编译器选项
          compilerOptions: {
            // 是否是生产环境
            isCustomElement: (tag) => tag.startsWith('custom-'),
            
            // 空白处理
            whitespace: 'condense',
            
            // 其他选项
            comments: false
          },
          
          // 热重载
          hotReload: true,
          
          // 暴露 SFC descriptor
          exposeFilename: true
        }
      }
    ]
  }
}
```

### CSS 预处理器配置

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      // SCSS 全局变量
      {
        test: /\.scss$/,
        use: [
          'vue-style-loader',
          {
            loader: 'css-loader',
            options: {
              esModule: false
            }
          },
          {
            loader: 'sass-loader',
            options: {
              additionalData: `
                @import "@/styles/variables.scss";
                @import "@/styles/mixins.scss";
              `
            }
          }
        ]
      }
    ]
  }
}
```

### 资源处理

```js
// webpack.config.js
module.exports = {
  module: {
    rules: [
      // 图片处理
      {
        test: /\.(png|jpe?g|gif|webp|svg)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024
          }
        }
      },
      
      // 在 Vue 模板中使用图片
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          transformAssetUrls: {
            // 自定义资源 URL 转换
            video: ['src', 'poster'],
            source: 'src',
            img: 'src',
            image: ['xlink:href', 'href'],
            use: ['xlink:href', 'href']
          }
        }
      }
    ]
  }
}
```

## 热重载配置

### 启用热重载

```js
// webpack.config.js
const webpack = require('webpack')

module.exports = {
  devServer: {
    hot: true,  // 启用 HMR
    static: {
      directory: resolve(__dirname, 'public')
    }
  },
  
  plugins: [
    new webpack.HotModuleReplacementPlugin()
  ]
}
```

### 热重载原理

```
┌──────────────────────────────────────────────────────────┐
│                    HMR 流程                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  1. 文件变化                                              │
│     MyComponent.vue 修改                                 │
│          │                                               │
│          ▼                                               │
│  2. Webpack 重新编译                                     │
│     vue-loader 重新处理                                  │
│          │                                               │
│          ▼                                               │
│  3. 通知客户端                                           │
│     WebSocket 发送更新消息                               │
│          │                                               │
│          ▼                                               │
│  4. HMR Runtime                                          │
│     vue-loader 内置热更新逻辑                            │
│          │                                               │
│          ▼                                               │
│  5. 组件热更新                                           │
│     不刷新页面，仅更新组件                               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 禁用热重载

```js
module.exports = {
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          hotReload: false  // 禁用热重载
        }
      }
    ]
  }
}
```

## Vue 2 vs Vue 3 差异

### 编译器差异

| Vue 2 | Vue 3 |
|-------|-------|
| `vue-template-compiler` | `@vue/compiler-sfc` |
| 独立包 | Vue 包的一部分 |
| 不支持 `<script setup>` | 支持 `<script setup>` |
| 不支持多根节点 | 支持多根节点片段 |

### 配置差异

```js
// Vue 2
const VueLoaderPlugin = require('vue-loader/lib/plugin')
const compiler = require('vue-template-compiler')

// Vue 3
const { VueLoaderPlugin } = require('vue-loader')
// 编译器已内置在 Vue 3 中
```

### 新特性支持

```vue
<!-- Vue 3 特性 -->
<template>
  <!-- 多根节点 -->
  <header>Header</header>
  <main>Content</main>
  <footer>Footer</footer>
</template>

<script setup>
// script setup 语法
import { ref } from 'vue'
const count = ref(0)
</script>

<style>
/* CSS v-bind */
.text {
  color: v-bind(color);
}
</style>
```

## 常见问题

### 1. 编译错误

**问题**：`You are using the runtime-only build of Vue...`

```js
// 解决：配置别名
module.exports = {
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm-bundler.js'  // Vue 3
      // 'vue$': 'vue/dist/vue.esm.js'       // Vue 2
    }
  }
}
```

### 2. scoped 样式穿透

**问题**：scoped 样式无法影响子组件

```vue
<style scoped>
/* ❌ 不起作用 */
.el-input {
  width: 100%;
}

/* ✅ 使用深度选择器 */
:deep(.el-input) {
  width: 100%;
}

/* 或使用 ::v-deep（Vue 2 风格） */
::v-deep .el-input {
  width: 100%;
}
</style>
```

### 3. TypeScript 集成

**问题**：`.vue` 文件类型检查错误

```ts
// src/shims-vue.d.ts
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
```

> 注意：该 shim 主要面向未配置 Volar/vue-tsc 的环境。如果项目使用 `vue-tsc` 做类型检查，则**不要**添加此 shim——它会让所有 `.vue` 导入退化为宽泛的 `DefineComponent<{}, {}, any>` 类型，反而丢失模板与 props 的类型检查能力。

### 4. 热重载不工作

检查配置：

```js
// webpack.config.js
module.exports = {
  devServer: {
    hot: true  // 必须启用
  }
}

// 确保 vue-loader 版本与 Vue 版本匹配
// vue-loader 15.x 对应 Vue 2，16+/17.x 对应 Vue 3
```

### 5. CSS 顺序问题

**问题**：样式覆盖顺序错误

```js
// 使用 mini-css-extract-plugin 生产环境提取 CSS
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          process.env.NODE_ENV === 'production'
            ? MiniCssExtractPlugin.loader
            : 'vue-style-loader',
          'css-loader'
        ]
      }
    ]
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: 'css/[name].[contenthash:8].css'
    })
  ]
}
```

### 6. 自定义块未处理

**问题**：自定义块被忽略

```js
// 添加自定义块 loader
module.exports = {
  module: {
    rules: [
      {
        resourceQuery: /blockType=docs/,
        loader: 'markdown-loader'
      }
    ]
  }
}
```

## 迁移到 Vite

对于 Vue 3 项目，推荐迁移到 Vite：

### 对比配置

```js
// webpack.config.js (Vue Loader)
module.exports = {
  module: {
    rules: [
      { test: /\.vue$/, loader: 'vue-loader' },
      { test: /\.js$/, loader: 'babel-loader' },
      { test: /\.css$/, use: ['vue-style-loader', 'css-loader'] },
      { test: /\.scss$/, use: ['vue-style-loader', 'css-loader', 'sass-loader'] }
    ]
  },
  plugins: [new VueLoaderPlugin()]
}
```

```js
// vite.config.js (Vite)
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  }
})
```

### 迁移步骤

1. **移除 Webpack 依赖**

```bash
npm uninstall webpack webpack-cli webpack-dev-server vue-loader
```

2. **安装 Vite**

```bash
npm install -D vite @vitejs/plugin-vue
```

3. **创建 vite.config.js**

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()]
})
```

4. **移动 index.html**

将 `public/index.html` 移到项目根目录，修改 script 引用：

```html
<script type="module" src="/src/main.js"></script>
```

5. **更新 package.json**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

## 相关资源

- [Vue Loader 官方文档](https://vue-loader.vuejs.org/)
- [Webpack 官方文档](https://webpack.js.org/)
- [Vue 3 编译器文档](https://vuejs.org/api/sfc-spec.html)
- [Vite 迁移指南](https://vitejs.dev/guide/migration.html)
