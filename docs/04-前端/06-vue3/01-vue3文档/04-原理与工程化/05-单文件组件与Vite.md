---
title: 单文件组件与Vite
description: "Vue 3 单文件组件（SFC）语法全解：template/script setup/style 三块结构、编译器宏（defineProps/defineModel/defineOptions 等）、scoped 样式与 v-bind in CSS，以及 Vite 构建工具的配置详解、插件生态、环境变量与常见问题。"
keywords: [单文件组件与Vite]
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 单文件组件与Vite

> 单文件组件 (Single-File Component，简称 SFC) 是 Vue 的标志性特性，将模板、脚本和样式封装在一个 `.vue` 文件中。

## 概述

### 什么是 SFC？

单文件组件将一个组件的完整定义封装在一个文件中：

```
┌─────────────────────────────────────┐
│          MyComponent.vue           │
├─────────────────────────────────────┤
│  <template>                        │
│    <!-- HTML 模板 -->               │
│  </template>                        │
│                                     │
│  <script setup>                    │
│    // JavaScript 逻辑               │
│  </script>                          │
│                                     │
│  <style scoped>                    │
│    /* CSS 样式 */                   │
│  </style>                           │
└─────────────────────────────────────┘
```

### SFC 的优势

| 优势 | 说明 |
|------|------|
| **完整语法高亮** | IDE 对模板、脚本、样式分别提供高亮 |
| **模块化** | 组件逻辑、样式天然封装，避免冲突 |
| **预处理器支持** | 支持 Sass、Less、TypeScript 等 |
| **作用域样式** | scoped 样式避免全局污染 |
| **模板编译优化** | 静态提升、Tree-shaking |
| **更好的 IDE 支持** | 自动补全、类型检查 |

## 基本结构

```vue
<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <button @click="count++">{{ count }}</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const title = ref('Hello Vue')
const count = ref(0)
</script>

<style scoped>
.container {
  padding: 20px;
}

h1 {
  color: #42b983;
}
</style>
```

## `<template>` 模板块

### 基本规则

- 每个 `.vue` 文件最多包含一个 `<template>` 块
- 内容会被提取并传递给 Vue 模板编译器
- 支持 Vue 模板语法（指令、插值等）

### 多根节点（Vue 3 新特性）

```vue
<template>
  <header>标题</header>
  <main>内容</main>
  <footer>页脚</footer>
</template>
```

::: warning
Vue 2 要求模板必须有单一根节点，Vue 3 支持多根节点（片段）
:::

## `<script setup>` 脚本块

### 基本用法

```vue
<script setup>
import { ref } from 'vue'
import MyComponent from './MyComponent.vue'

// 导入的组件直接使用
const count = ref(0)

// 定义 props
const props = defineProps({
  title: String
})

// 定义 emits
const emit = defineEmits(['update'])

// 定义暴露
defineExpose({
  count
})
</script>

<template>
  <div>{{ title }}</div>
  <MyComponent />
</template>
```

### 编译器宏

编译器宏是在 `<script setup>` 中可用的特殊函数，它们在编译时被转换，不需要显式导入。

#### defineProps

定义组件的 props：

```vue
<script setup>
// 运行时声明
const props = defineProps({
  title: String,
  count: {
    type: Number,
    default: 0
  }
})

// TypeScript 类型声明
interface Props {
  title: string
  count?: number
}
const props = defineProps<Props>()

// 带默认值的类型声明
const props = withDefaults(defineProps<Props>(), {
  count: 0
})
</script>
```

#### defineEmits

定义组件可触发的事件：

```vue
<script setup>
// 运行时声明
const emit = defineEmits(['change', 'update'])

emit('change', value)

// TypeScript 类型声明
interface Emits {
  (e: 'change', id: number): void
  (e: 'update', value: string): void
}
const emit = defineEmits<Emits>()
</script>
```

#### defineExpose

显式暴露组件内部属性：

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)
const increment = () => count.value++

// 暴露给父组件通过 ref 访问
defineExpose({
  count,
  increment
})
</script>
```

```vue
<!-- 父组件 -->
<script setup>
import { ref } from 'vue'
import Child from './Child.vue'

const childRef = ref()

const callChild = () => {
  console.log(childRef.value.count)
  childRef.value.increment()
}
</script>

<template>
  <Child ref="childRef" />
</template>
```

#### defineOptions（Vue 3.3+）

定义组件选项：

```vue
<script setup>
defineOptions({
  name: 'MyComponent',
  inheritAttrs: false
})
</script>
```

#### defineModel（Vue 3.4+）

简化 v-model 绑定：

```vue
<script setup>
// 定义单个 v-model
const modelValue = defineModel()

// 带选项的 v-model
const title = defineModel('title', { default: '默认标题' })

// 多个 v-model
const firstName = defineModel('firstName')
const lastName = defineModel('lastName')
</script>

<template>
  <input v-model="modelValue" />
  <input v-model="title" />
</template>
```

#### defineSlots（Vue 3.3+）

为插槽提供类型提示：

```vue
<script setup lang="ts">
defineSlots<{
  default(props: { msg: string }): any
  header(): any
}>()
</script>

<template>
  <slot :msg="message" />
  <slot name="header" />
</template>
```

### 宏函数对比表

| 宏函数 | 用途 | 返回值 |
|--------|------|--------|
| `defineProps` | 定义 props | props 对象 |
| `defineEmits` | 定义事件 | emit 函数 |
| `defineExpose` | 暴露属性 | 无 |
| `defineOptions` | 组件选项 | 无 |
| `defineModel` | 双向绑定 | ref |
| `defineSlots` | 插槽类型 | 无 |
| `withDefaults` | 设置默认值 | props 对象 |

### 与 Options API 对比

```vue
<!-- <script setup> 写法 -->
<script setup>
import { ref } from 'vue'

const count = ref(0)
function increment() {
  count.value++
}
</script>

<!-- Options API 写法 -->
<script>
export default {
  data() {
    return { count: 0 }
  },
  methods: {
    increment() {
      this.count++
    }
  }
}
</script>
```

**`<script setup>` 优势**：

- 更少的样板代码
- 更好的 TypeScript 支持
- 更好的运行时性能（编译优化）
- 更自然的代码组织

### 同时使用两种脚本

```vue
<script>
// 命名导出
export const name = 'MyComponent'
</script>

<script setup>
// 组合式 API 逻辑
import { ref } from 'vue'
const count = ref(0)
</script>
```

## `<style>` 样式块

### scoped 样式

```vue
<style scoped>
/* 样式只作用于当前组件 */
.container {
  color: red;
}

/* 深度选择器：影响子组件 */
:deep(.child-class) {
  color: blue;
}

/* 插槽选择器：影响插槽内容 */
:slotted(.slot-class) {
  color: green;
}

/* 全局选择器：影响全局 */
:global(.global-class) {
  color: purple;
}
</style>
```

### 深度选择器语法

Vue 3 推荐使用 `:deep()`：

```vue
<!-- Vue 3 语法（推荐） -->
<style scoped>
:deep(.el-input) {
  width: 100%;
}
</style>

<!-- 旧语法（仍支持但不推荐） -->
<style scoped>
::v-deep .el-input {
  width: 100%;
}
/deep/ .el-input {
  width: 100%;
}
>>> .el-input {
  width: 100%;
}
</style>
```

### CSS Modules

```vue
<template>
  <div :class="$style.container">
    <p :class="$style.text">Hello</p>
  </div>
</template>

<style module>
.container {
  padding: 20px;
}
.text {
  color: blue;
}
</style>
```

自定义模块名：

```vue
<template>
  <div :class="classes.container"></div>
</template>

<style module="classes">
.container { padding: 20px; }
</style>
```

### v-bind in CSS

在 CSS 中使用 JavaScript 变量：

```vue
<template>
  <div class="box">Hello</div>
</template>

<script setup>
import { ref } from 'vue'
const color = ref('red')
const size = ref('16px')
</script>

<style scoped>
.box {
  color: v-bind(color);
  font-size: v-bind(size);
}

/* 对象语法 */
.box {
  color: v-bind('color');
}
</style>
```

### CSS 预处理器

#### Sass/SCSS

```bash
npm install -D sass
```

```vue
<style lang="scss" scoped>
$primary-color: #42b983;

.container {
  padding: 20px;
  
  .title {
    color: $primary-color;
  }
}

// 导入外部文件
@import '@/styles/variables.scss';
</style>
```

全局变量注入：

```js
// vite.config.js
export default {
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  }
}
```

#### Less

```bash
npm install -D less
```

```vue
<style lang="less" scoped>
@primary-color: #42b983;

.container {
  padding: 20px;
  
  .title {
    color: @primary-color;
  }
}
</style>
```

#### Stylus

```bash
npm install -D stylus
```

```vue
<style lang="stylus" scoped>
primary-color = #42b983

.container
  padding 20px
  
  .title
    color primary-color
</style>
```

### PostCSS

Vite 自动应用 PostCSS，创建 `postcss.config.js`：

```js
// postcss.config.js
export default {
  plugins: [
    require('autoprefixer'),
    require('postcss-preset-env')({
      stage: 3
    })
  ]
}
```

## 自定义块

SFC 支持自定义块，用于扩展功能：

```vue
<template>
  <div>{{ t('message') }}</div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
</script>

<style scoped>
div { color: red; }
</style>

<!-- i18n 自定义块 -->
<i18n>
{
  "en": {
    "message": "Hello"
  },
  "zh": {
    "message": "你好"
  }
}
</i18n>

<!-- 自定义配置块 -->
<docs>
这是一个示例组件，用于演示自定义块。
</docs>
```

配置自定义块加载器：

```js
// vite.config.js
export default {
  vue: {
    customBlocks: ['i18n', 'docs']
  }
}
```

## 工作原理

### 编译流程

```
┌──────────────────────────────────────────────────────────┐
│                    SFC 编译流程                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│   .vue 文件                                              │
│       ↓                                                  │
│   @vue/compiler-sfc (解析)                               │
│       ├── descriptor (各块描述)                          │
│       └── 生成组件代码                                   │
│           ↓                                              │
│   模板编译                                                │
│       ├── 模板 → render 函数                             │
│       └── 静态提升优化                                   │
│           ↓                                              │
│   script 编译                                            │
│       ├── script setup 转换                              │
│       └── 宏展开                                         │
│           ↓                                              │
│   style 处理                                             │
│       ├── scoped 属性添加                                │
│       └── CSS 预处理                                     │
│           ↓                                              │
│   JavaScript 模块                                        │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 编译产物示例

```vue
<!-- 源码 -->
<template>
  <div>{{ count }}</div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>
```

编译后：

```js
import { ref } from 'vue'

export default {
  setup() {
    const count = ref(0)
    return { count }
  },
  render(_ctx) {
    return h('div', _ctx.count)
  }
}
```

### 静态提升

模板中的静态节点会被提升到组件外：

```vue
<template>
  <div>
    <p class="static">静态内容</p>  <!-- 静态提升 -->
    <p>{{ dynamic }}</p>
  </div>
</template>
```

编译后：

```js
// 静态节点提升到 render 外
const _hoisted_1 = h('p', { class: 'static' }, '静态内容')

function render() {
  return h('div', [
    _hoisted_1,  // 复用静态节点
    h('p', dynamic)
  ])
}
```

## 命名约定

### 组件命名

```
推荐: PascalCase（帕斯卡命名）
例如: MyComponent.vue, UserList.vue, SearchInput.vue
```

### 文件组织

```
src/
├── components/          # 通用组件
│   ├── BaseButton.vue
│   └── BaseInput.vue
├── features/            # 功能组件
│   └── auth/
│       ├── LoginForm.vue
│       └── RegisterForm.vue
└── views/              # 页面组件
    ├── Home.vue
    └── About.vue
```

## 常见问题

### 1. scoped 样式不生效？

检查以下情况：

```vue
<style scoped>
/* ❌ 无法影响子组件 */
.child { color: red; }

/* ✅ 使用深度选择器 */
:deep(.child) { color: red; }
</style>
```

### 2. 如何使用全局样式？

```vue
<!-- 方式一：不加 scoped -->
<style>
.global-class { color: red; }
</style>

<!-- 方式二：:global() -->
<style scoped>
:global(.global-class) { color: red; }
</style>

<!-- 方式三：导入全局样式文件 -->
<style src="@/styles/global.css"></style>
```

### 3. 如何动态切换样式？

```vue
<script setup>
import { ref } from 'vue'
const isDark = ref(false)
</script>

<template>
  <div :class="{ dark: isDark }">内容</div>
</template>

<style scoped>
.dark {
  background: #333;
  color: #fff;
}
</style>
```

### 4. defineProps 和 defineEmits 需要导入吗？

不需要，它们是编译器宏：

```vue
<script setup>
// ❌ 不需要导入
// import { defineProps } from 'vue'

// ✅ 直接使用
const props = defineProps({ title: String })
</script>
```

### 5. 如何获取组件实例？

```vue
<script setup>
import { getCurrentInstance } from 'vue'

const instance = getCurrentInstance()
console.log(instance.proxy) // 组件代理
</script>
```

::: warning
推荐使用更明确的方式（props、emits、expose）而非直接访问组件实例
:::

### 6. script setup 中如何使用 name 属性？

```vue
<script setup>
// Vue 3.3+ 使用 defineOptions
defineOptions({
  name: 'MyComponent'
})
</script>

<!-- 或者使用两个 script -->
<script>
export default {
  name: 'MyComponent'
}
</script>

<script setup>
// 组合式逻辑
</script>
```

## 最佳实践

### 1. 组件拆分

```vue
<!-- ❌ 过大的组件 -->
<template>
  <!-- 500+ 行模板 -->
</template>

<!-- ✅ 合理拆分 -->
<template>
  <Header />
  <Main />
  <Footer />
</template>
```

### 2. 样式隔离

```vue
<!-- ✅ 使用 scoped -->
<style scoped>
.container { /* ... */ }
</style>

<!-- ✅ 或使用 CSS Modules -->
<style module>
.container { /* ... */ }
</style>
```

### 3. Props 验证

```vue
<script setup>
// ✅ 完整的 props 定义
const props = defineProps({
  title: {
    type: String,
    required: true
  },
  count: {
    type: Number,
    default: 0,
    validator: (v) => v >= 0
  }
})
</script>
```

### 4. 事件命名

```vue
<script setup>
// ✅ 使用 kebab-case
const emit = defineEmits(['update:model-value', 'item-click'])

emit('update:model-value', value)
emit('item-click', item)
</script>
```

## 相关文档

- [Vue 官方 SFC 文档](https://vuejs.org/api/sfc-spec.html)
- [SFC 语法规范](https://vuejs.org/api/sfc-spec.html)
- [script setup RFC](https://github.com/vuejs/rfcs/blob/master/active-rfcs/0040-script-setup.md)


---

## Vite 构建工具深度配置


> Vite 是 Vue 3 官方推荐的下一代前端构建工具，提供极速的开发体验和优化的生产构建。

## 概述

### 为什么选择 Vite

#### 传统构建工具的痛点

```
传统打包流程（Webpack）:
┌─────────────────────────────────────────────────────┐
│  启动开发服务器                                       │
│       ↓                                             │
│  打包所有代码（入口 → 依赖图 → Bundle）              │
│       ↓                                             │
│  启动服务器                                          │
│       ↓                                             │
│  ⏳ 等待很长时间（项目越大越慢）                      │
└─────────────────────────────────────────────────────┘
```

#### Vite 的解决方案

```
Vite 开发流程:
┌─────────────────────────────────────────────────────┐
│  启动开发服务器                                       │
│       ↓                                             │
│  即时启动（毫秒级）                                   │
│       ↓                                             │
│  按需编译（浏览器请求时编译）                         │
│       ↓                                             │
│  ⚡ 极速 HMR                                         │
└─────────────────────────────────────────────────────┘
```

### 核心原理

#### 1. 原生 ESM 开发服务器

Vite 利用浏览器原生 ESM 能力，直接提供源文件：

```html
<!-- index.html -->
<script type="module" src="/src/main.js"></script>
```

```
浏览器请求              Vite 处理
    │                      │
    │  /src/main.js        │
    │ ──────────────────▶  │
    │                      │  解析 import
    │                      │  按需编译
    │  返回 ESM 模块        │
    │ ◀──────────────────  │
```

#### 2. 依赖预构建

对 CommonJS/UMD 模块预先转换为 ESM：

```
node_modules/
    └── lodash/          (CommonJS)
           ↓
    预构建转换为 ESM
           ↓
node_modules/.vite/
    └── lodash.js        (ESM)
```

**预构建的好处**：

- 将 CommonJS 转换为 ESM
- 减少网络请求（合并小模块）
- 缓存优化

#### 3. 生产环境使用 Rollup

开发环境用原生 ESM，生产环境用 Rollup 打包，获得：

- 代码分割
- Tree-shaking
- 压缩优化
- 懒加载

### Vite vs Webpack

| 特性 | Vite | Webpack |
|------|------|---------|
| 开发服务器启动 | 毫秒级 | 随项目增大变慢 |
| HMR 速度 | 极快 | 较慢 |
| 配置复杂度 | 简单 | 复杂 |
| 生态成熟度 | 快速发展 | 非常成熟 |
| 生产构建 | Rollup | Webpack |
| TypeScript | 原生支持 | 需配置 |
| CSS 预处理 | 原生支持 | 需配置 loader |

## 创建项目

### 官方脚手架

```bash
# 创建 Vue 项目（推荐）
npm create vue@latest

# 或使用 Vite 模板
npm create vite@latest my-app -- --template vue
npm create vite@latest my-app -- --template vue-ts

# 其他框架模板
--template react
--template react-ts
--template svelte
--template vanilla
```

### create-vue vs create-vite

| 工具 | 说明 |
|------|------|
| `create-vue` | Vue 官方脚手架，预配置更多功能 |
| `create-vite` | Vite 官方脚手架，更轻量 |

`create-vue` 提供的可选配置：

- TypeScript
- JSX
- Vue Router
- Pinia
- Vitest
- E2E Testing
- ESLint + Prettier

### 项目结构

```
my-app/
├── .vscode/
│   └── extensions.json    # VS Code 插件推荐
├── node_modules/
├── public/                # 静态资源（不经过处理）
│   └── favicon.ico
├── src/
│   ├── assets/            # 资源文件（会被处理）
│   ├── components/        # 组件
│   ├── App.vue           # 根组件
│   └── main.ts           # 入口文件
├── index.html            # HTML 入口
├── package.json
├── tsconfig.json         # TS 配置
├── tsconfig.node.json    # Node 脚本 TS 配置
└── vite.config.ts        # Vite 配置
```

## 配置文件

### 基础配置

```js
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  // 插件配置
  plugins: [vue()],
  
  // 路径别名
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@components': resolve(__dirname, 'src/components'),
      '@assets': resolve(__dirname, 'src/assets')
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json', '.vue']
  },
  
  // 开发服务器配置
  server: {
    host: '0.0.0.0',  // 监听所有地址
    port: 3000,        // 端口
    open: true,        // 自动打开浏览器
    cors: true,        // 启用 CORS
    
    // 代理配置
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  
  // 构建配置
  build: {
    outDir: 'dist',          // 输出目录
    assetsDir: 'assets',     // 资源目录
    sourcemap: true,         // 生成 sourcemap
    minify: 'esbuild',       // 压缩方式: 'esbuild' | 'terser'
    
    // 代码分割
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          utils: ['lodash', 'axios']
        }
      }
    }
  }
})
```

### 环境特定配置

```js
// vite.config.ts
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd())
  
  return {
    // 根据环境变量配置
    server: {
      port: parseInt(env.VITE_PORT) || 3000
    },
    
    // 生产环境特定配置
    build: {
      minify: mode === 'production' ? 'terser' : 'esbuild'
    }
  }
})
```

### 配置文件拆分

```js
// vite.config.base.ts - 基础配置
export const baseConfig = {
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') }
  }
}

// vite.config.dev.ts - 开发配置
export const devConfig = {
  server: {
    port: 3000
  }
}

// vite.config.ts - 合并配置
import { defineConfig, mergeConfig } from 'vite'
import { baseConfig } from './vite.config.base'
import { devConfig } from './vite.config.dev'

export default defineConfig(mergeConfig(baseConfig, devConfig))
```

## 开发服务器

### 启动命令

```bash
npm run dev

# 指定端口
npm run dev -- --port 4000

# 指定 host
npm run dev -- --host 0.0.0.0

# 开启 HTTPS
npm run dev -- --https
```

### 配置详解

```js
export default defineConfig({
  server: {
    // 服务器主机名
    host: '0.0.0.0',  // 允许局域网访问
    
    // 端口号
    port: 3000,
    
    // 端口被占用时自动尝试下一个
    strictPort: false,  // true 表示端口被占用时报错
    
    // 自动打开浏览器（也可传路径打开特定页面，如 open: '/docs/index.html'）
    open: true,
    
    // 启用 CORS
    cors: true,
    
    // HTTPS 配置（传 true 自动生成证书，或传 { key, cert } 对象）
    https: true,
    
    // 代理配置
    proxy: {
      // 简单代理
      '/api': 'http://localhost:8080',
      
      // 完整配置
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        headers: {
          'X-Custom-Header': 'value'
        },
        configure: (proxy, options) => {
          // 自定义代理配置
        }
      },
      
      // WebSocket 代理
      '/socket': {
        target: 'ws://localhost:8080',
        ws: true
      }
    },
    
    // 监听文件变化
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**']
    },
    
    // 热更新配置
    hmr: {
      overlay: true  // 显示错误覆盖层
    }
  }
})
```

### HMR 热更新

Vite 提供原生 HMR 支持：

```js
// 手动处理 HMR
if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    // 处理模块更新
  })
  
  import.meta.hot.dispose(() => {
    // 清理副作用
  })
  
  import.meta.hot.invalidate()  // 强制刷新页面
}
```

## 插件生态

### 官方插件

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'           // Vue 3 支持
import vueJsx from '@vitejs/plugin-vue-jsx'    // JSX 支持
import legacy from '@vitejs/plugin-legacy'     // 旧浏览器支持

export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    legacy({
      targets: ['ie >= 11']
    })
  ]
})
```

### 自动导入插件

```bash
npm install -D unplugin-auto-import unplugin-vue-components
```

```js
import { defineConfig } from 'vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default defineConfig({
  plugins: [
    // 自动导入 Vue API
    AutoImport({
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/auto-imports.d.ts',  // 生成类型声明文件
      resolvers: [ElementPlusResolver()]
    }),
    
    // 自动导入组件
    Components({
      dirs: ['src/components'],
      extensions: ['vue'],
      dts: 'src/components.d.ts',
      resolvers: [ElementPlusResolver()]
    })
  ]
})
```

配置后可直接使用：

```vue
<script setup>
// 无需导入 ref、computed 等
const count = ref(0)
const double = computed(() => count.value * 2)
</script>

<template>
  <!-- 无需导入组件 -->
  <ElButton>按钮</ElButton>
</template>
```

### 常用插件列表

| 插件 | 用途 |
|------|------|
| `@vitejs/plugin-vue` | Vue 3 单文件组件支持 |
| `@vitejs/plugin-vue-jsx` | Vue 3 JSX 支持 |
| `@vitejs/plugin-legacy` | 旧浏览器兼容 |
| `vite-plugin-md` | Markdown 作为组件 |
| `vite-plugin-svg-icons` | SVG 图标方案 |
| `vite-plugin-compression` | Gzip/Brotli 压缩 |
| `vite-plugin-pwa` | PWA 支持 |
| `vite-plugin-html` | HTML 模板处理 |
| `vite-plugin-imagemin` | 图片压缩 |
| `unplugin-auto-import` | API 自动导入 |
| `unplugin-vue-components` | 组件自动导入 |

### SVG 图标插件配置

```bash
npm install -D vite-plugin-svg-icons
```

```js
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'
import path from 'path'

export default defineConfig({
  plugins: [
    createSvgIconsPlugin({
      iconDirs: [path.resolve(process.cwd(), 'src/icons')],
      symbolId: 'icon-[dir]-[name]',
      inject: 'body-last',
      customDomId: '__svg__icons__dom__'
    })
  ]
})
```

使用方式：

```vue
<template>
  <svg aria-hidden="true">
    <use href="#icon-user" />
  </svg>
</template>
```

## 环境变量

### 环境文件

```bash
# .env                - 所有环境
VITE_APP_TITLE=My App

# .env.development     - 开发环境
VITE_API_URL=http://localhost:3000
VITE_API_URL_DEV=http://localhost:3000

# .env.staging         - 预发布环境
VITE_API_URL=https://staging.example.com

# .env.production      - 生产环境
VITE_API_URL=https://api.example.com

# .env.local           - 本地覆盖（不提交 git）
VITE_API_URL=http://192.168.1.100:3000
```

### 使用环境变量

```js
// 必须以 VITE_ 开头才能暴露给客户端
const apiUrl = import.meta.env.VITE_API_URL

// 内置环境变量
console.log(import.meta.env.MODE)        // 'development' | 'production'
console.log(import.meta.env.DEV)         // 是否开发环境
console.log(import.meta.env.PROD)        // 是否生产环境
console.log(import.meta.env.BASE_URL)    // 基础路径
console.log(import.meta.env.SSR)         // 是否 SSR

// 获取所有环境变量
console.log(import.meta.env)
```

### 类型定义

```ts
// src/env.d.ts
interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_API_URL: string
  readonly VITE_API_URL_DEV?: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

### 动态环境变量

```js
// vite.config.ts
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
})
```

```js
// 使用
console.log(__APP_VERSION__)  // '1.0.0'
console.log(__BUILD_TIME__)   // '2024-01-01T00:00:00.000Z'
```

## 构建优化

### 构建命令

```bash
# 生产构建
npm run build

# 构建并分析
npm run build -- --mode staging

# 预览构建结果
npm run preview

# 指定配置文件
vite build --config vite.config.prod.ts
```

### 构建配置详解

```js
export default defineConfig({
  build: {
    // 输出目录
    outDir: 'dist',
    
    // 静态资源目录
    assetsDir: 'assets',
    
    // 资源文件名格式
    assetsInlineLimit: 4096,  // 小于 4KB 的资源内联为 base64
    
    // chunk 文件名
    chunkFileNames: 'assets/js/[name]-[hash].js',
    entryFileNames: 'assets/js/[name]-[hash].js',
    assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
    
    // sourcemap
    sourcemap: false,  // true | 'inline' | 'hidden'
    
    // 压缩
    minify: 'esbuild',  // 'esbuild' | 'terser'
    terserOptions: {    // 仅在 minify: 'terser' 时生效
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    
    // 代码分割策略
    rollupOptions: {
      output: {
        // 分包策略
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('element-plus')) {
              return 'element-plus'
            }
            if (id.includes('lodash')) {
              return 'lodash'
            }
            return 'vendor'
          }
        },
        
        // 或使用对象形式
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          elementPlus: ['element-plus'],
          utils: ['lodash', 'axios', 'dayjs']
        }
      }
    },
    
    // chunk 大小警告阈值 (KB)
    chunkSizeWarningLimit: 500,
    
    // 清空输出目录
    emptyOutDir: true,
    
    // 复制 public 目录
    copyPublicDir: true,
    
    // CSS 代码分割
    cssCodeSplit: true,
    
    // 库模式配置
    lib: {
      entry: 'src/index.ts',
      name: 'MyLib',
      fileName: (format) => `my-lib.${format}.js`
    }
  }
})
```

### 分析打包结果

```bash
npm install -D rollup-plugin-visualizer
```

```js
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    visualizer({
      open: true,           // 自动打开分析页面
      filename: 'stats.html', // 分析结果文件名
      gzipSize: true,       // 显示 gzip 大小
      brotliSize: true      // 显示 brotli 大小
    })
  ]
})
```

### 压缩配置

```js
import viteCompression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    // Gzip 压缩
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240  // 大于 10KB 才压缩
    }),
    
    // Brotli 压缩
    viteCompression({
      algorithm: 'brotliCompress',
      ext: '.br'
    })
  ]
})
```

## 常见问题

### 1. 依赖预构建问题

**问题**：依赖包更新后没有生效

```bash
# 清除缓存重新预构建
rm -rf node_modules/.vite
npm run dev
```

**问题**：CommonJS 依赖报错

```js
// vite.config.ts
export default defineConfig({
  optimizeDeps: {
    include: ['some-cjs-package'],
    exclude: ['your-esm-package']
  }
})
```

### 2. 路径别名问题

```js
// vite.config.ts
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### 3. 跨域问题

开发环境使用代理：

```js
export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
```

### 4. 静态资源 404

```js
// 根据部署路径检查 base 配置：'/' 为根路径部署，'/app/' 为子路径部署
export default defineConfig({
  base: '/app/',
})
```

### 5. TypeScript 类型错误

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["vite/client"]
  }
}
```

```ts
// src/vite-env.d.ts
/// <reference types="vite/client" />
```

### 6. 生产构建白屏

检查：
1. `base` 配置是否正确
2. 路由是否使用 history 模式（需要服务器配置）
3. 静态资源路径是否正确

### 7. 内存溢出

```bash
# 增加 Node 内存限制
NODE_OPTIONS=--max_old_space_size=4096 npm run build
```

## 迁移指南

### 从 Vue CLI 迁移

1. **移除 Vue CLI 依赖**

```bash
npm uninstall @vue/cli-service @vue/cli-plugin-babel @vue/cli-plugin-eslint
```

2. **安装 Vite**

```bash
npm install -D vite @vitejs/plugin-vue
```

3. **配置文件转换**

```js
// vue.config.js → vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()]
})
```

4. **入口文件**

```html
<!-- 将 public/index.html 移到根目录 -->
<!-- 修改 script 引用 -->
<script type="module" src="/src/main.js"></script>
```

5. **环境变量**

```bash
# VUE_APP_ → VITE_
VITE_API_URL=xxx
```

### 从 Webpack 迁移

主要变更：

| Webpack | Vite |
|---------|------|
| `webpack.config.js` | `vite.config.ts` |
| `require()` | `import` |
| `process.env.NODE_ENV` | `import.meta.env` |
| `process.env.VUE_APP_*` | `import.meta.env.VITE_*` |
| loaders | 插件/原生支持 |
| plugins | plugins |

## 相关资源

- [Vite 官方文档](https://vitejs.dev/)
- [Vite 插件](https://vitejs.dev/plugins/)
- [Awesome Vite](https://github.com/vitejs/awesome-vite)
- [Vue 官方文档](https://vuejs.org/guide/scaling-up/tooling.html#vite)
