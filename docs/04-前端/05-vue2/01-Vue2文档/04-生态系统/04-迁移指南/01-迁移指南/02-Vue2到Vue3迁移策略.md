---
title: Vue 2 到 Vue 3 迁移策略
description: "Vue 2 到 Vue 3 迁移策略：主要差异清单、@vue/compat 兼容构建配置、分阶段迁移计划、常见问题与迁移检查清单。"
keywords: [Vue, Vue 2 到 Vue 3 迁移策略]
category: Vue
tags: [Vue]
---
# Vue 2 到 Vue 3 迁移策略

## 概述

Vue 3 带来了更好的性能、更小的打包体积、更好的 TypeScript 支持和组合式 API 等重大改进。本指南将帮助你理解 Vue 2 到 Vue 3 的主要变化，并制定合理的迁移策略，降低迁移风险。

### 迁移价值

```mermaid
graph TB
    subgraph "Vue 3 核心优势"
        A[性能提升<br/>初始化 +55% | 更新 +133%]
        B[体积优化<br/>Tree-shaking 支持 | 体积 -41%]
        C[更好的 TS 支持<br/>源码使用 TypeScript 编写]
        D[组合式 API<br/>更灵活的代码组织方式]
        E[新特性<br/>Teleport | Fragments | Suspense]
        F[更好的开发体验<br/>改进的 DevTools 和错误提示]
    end
```

---

## 主要差异

### 1. 全局 API 变更

#### Vue 2 写法

```javascript
// main.js - Vue 2
import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

// 全局配置
Vue.config.productionTip = false
Vue.prototype.$http = myHttpLib

// 全局组件
Vue.component('MyButton', MyButton)

// 全局指令
Vue.directive('focus', {
  inserted: el => el.focus()
})

// 全局过滤器
Vue.filter('capitalize', value => {
  if (!value) return ''
  return value.charAt(0).toUpperCase() + value.slice(1)
})

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
```

#### Vue 3 写法

```javascript
// main.js - Vue 3
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

const app = createApp(App)

// 使用插件
app.use(router)
app.use(createPinia())

// 全局配置
app.config.errorHandler = (err) => {
  console.error(err)
}

// 全局属性（替代 Vue.prototype）
app.config.globalProperties.$http = myHttpLib

// 全局组件
app.component('MyButton', MyButton)

// 全局指令
app.directive('focus', {
  mounted: el => el.focus() // 钩子名称改变
})

// ❌ Vue 3 移除了过滤器
// 使用计算属性或方法替代

app.mount('#app')
```

### 2. 生命周期钩子变更

| Vue 2 | Vue 3 | 说明 |
|-------|-------|------|
| beforeCreate | beforeCreate | - |
| created | created | - |
| beforeMount | beforeMount | - |
| mounted | mounted | - |
| beforeUpdate | beforeUpdate | - |
| updated | updated | - |
| **beforeDestroy** | **beforeUnmount** | ⚠️ 更名 |
| **destroyed** | **unmounted** | ⚠️ 更名 |
| errorCaptured | errorCaptured | - |

```javascript
// Vue 2
export default {
  beforeDestroy() {
    console.log('组件即将销毁')
  },
  destroyed() {
    console.log('组件已销毁')
  }
}

// Vue 3
export default {
  beforeUnmount() {
    console.log('组件即将卸载')
  },
  unmounted() {
    console.log('组件已卸载')
  }
}
```

### 3. 自定义指令变更

```javascript
// Vue 2 指令钩子
Vue.directive('focus', {
  bind(el, binding, vnode) {
    // 指令首次绑定到元素时
  },
  inserted(el, binding, vnode) {
    // 元素插入父节点时
    el.focus()
  },
  update(el, binding, vnode, oldVnode) {
    // VNode 更新时
  },
  componentUpdated(el, binding, vnode, oldVnode) {
    // VNode 及其子 VNode 全部更新后
  },
  unbind(el, binding, vnode) {
    // 指令与元素解绑时
  }
})

// Vue 3 指令钩子（命名更统一）
app.directive('focus', {
  created(el, binding, vnode, prevVnode) {
    // 新增：元素创建后、属性绑定前
  },
  beforeMount(el, binding, vnode, prevVnode) {
    // 新增：元素挂载前
  },
  mounted(el, binding, vnode, prevVnode) {
    // 替代 inserted
    el.focus()
  },
  beforeUpdate(el, binding, vnode, prevVnode) {
    // 新增：元素更新前
  },
  updated(el, binding, vnode, prevVnode) {
    // 替代 componentUpdated
  },
  beforeUnmount(el, binding, vnode, prevVnode) {
    // 新增：元素卸载前
  },
  unmounted(el, binding, vnode, prevVnode) {
    // 替代 unbind
  }
})
```

### 4. v-model 变更

#### Vue 2

```vue
<!-- Vue 2: v-model 默认使用 value prop 和 input 事件 -->
<CustomInput v-model="value" />

<!-- 等价于 -->
<CustomInput :value="value" @input="value = $event" />

<!-- Vue 2: 多个 v-model 使用 .sync -->
<CustomInput :value.sync="value" :title.sync="title" />
```

```vue
<!-- 子组件 Vue 2 -->
<template>
  <input :value="value" @input="$emit('input', $event.target.value)" />
</template>

<script>
export default {
  props: ['value']
}
</script>
```

#### Vue 3

```vue
<!-- Vue 3: v-model 默认使用 modelValue prop 和 update:modelValue 事件 -->
<CustomInput v-model="value" />

<!-- 等价于 -->
<CustomInput 
  :modelValue="value" 
  @update:modelValue="value = $event" 
/>

<!-- Vue 3: 多个 v-model 更简洁 -->
<CustomInput v-model:value="value" v-model:title="title" />
```

```vue
<!-- 子组件 Vue 3 -->
<template>
  <input 
    :value="modelValue" 
    @input="$emit('update:modelValue', $event.target.value)" 
  />
</template>

<script>
export default {
  props: ['modelValue'],
  emits: ['update:modelValue']
}
</script>
```

### 5. 移除的特性

#### 5.1 过滤器（Filters）

```javascript
// ❌ Vue 2 写法 - Vue 3 已移除
<template>
  <div>{{ message | capitalize }}</div>
</template>

<script>
export default {
  filters: {
    capitalize(value) {
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
}
</script>

// ✅ Vue 3 替代方案 1: 计算属性
<template>
  <div>{{ capitalizedMessage }}</div>
</template>

<script>
export default {
  computed: {
    capitalizedMessage() {
      return this.message.charAt(0).toUpperCase() + this.message.slice(1)
    }
  }
}
</script>

// ✅ Vue 3 替代方案 2: 方法
<template>
  <div>{{ capitalize(message) }}</div>
</template>

<script>
export default {
  methods: {
    capitalize(value) {
      return value.charAt(0).toUpperCase() + value.slice(1)
    }
  }
}
</script>
```

#### 5.2 $on、$off、$once 实例方法

```javascript
// ❌ Vue 2 写法 - Vue 3 已移除
this.$on('event', handler)
this.$off('event', handler)
this.$once('event', handler)

// ✅ Vue 3 替代方案：使用外部库 mitt 或 tiny-emitter
import mitt from 'mitt'
const emitter = mitt()

emitter.on('event', handler)
emitter.off('event', handler)
emitter.emit('event', payload)
```

#### 5.3 内联模板

```vue
<!-- ❌ Vue 2 写法 - Vue 3 已移除 -->
<MyComponent inline-template>
  <div>
    <p>这些内容将被视为组件模板</p>
  </div>
</MyComponent>

<!-- ✅ Vue 3 替代方案：使用插槽 -->
<MyComponent>
  <template #default>
    <div>
      <p>这些内容将被视为插槽内容</p>
    </div>
  </template>
</MyComponent>
```

### 6. 响应式系统差异

```javascript
// Vue 2 响应式限制
export default {
  data() {
    return {
      user: { name: 'Alice' },
      items: [1, 2, 3]
    }
  },
  methods: {
    // ❌ Vue 2 无法检测新属性添加
    addProperty() {
      this.user.age = 25 // 非响应式
    },
    
    // ❌ Vue 2 无法检测属性删除
    removeProperty() {
      delete this.user.name // 非响应式
    },
    
    // ❌ Vue 2 无法检测数组索引赋值
    updateItem() {
      this.items[0] = 10 // 非响应式
    },
    
    // ✅ Vue 2 正确写法
    addPropertyCorrect() {
      this.$set(this.user, 'age', 25) // 或 Vue.set
    },
    
    updateItemCorrect() {
      this.$set(this.items, 0, 10) // 或 Vue.set
    }
  }
}

// Vue 3 响应式优势（基于 Proxy）
export default {
  data() {
    return {
      user: { name: 'Alice' },
      items: [1, 2, 3]
    }
  },
  methods: {
    // ✅ Vue 3 可以检测新属性添加
    addProperty() {
      this.user.age = 25 // 响应式
    },
    
    // ✅ Vue 3 可以检测属性删除
    removeProperty() {
      delete this.user.name // 响应式
    },
    
    // ✅ Vue 3 可以检测数组索引赋值
    updateItem() {
      this.items[0] = 10 // 响应式
    }
  }
}
```

### 7. 组件其他重要变更

#### 函数式组件

```vue
<!-- Vue 2 函数式组件 -->
<template functional>
  <div>{{ props.message }}</div>
</template>

<script>
export default {
  props: ['message']
}
</script>

<!-- Vue 3：函数式组件只能以纯函数形式创建 -->
<!-- （functional 选项与 <template functional> 写法已移除） -->
<script>
import { h } from 'vue'

export default function FunctionalMessage(props, context) {
  return h('div', props.message)
}

FunctionalMessage.props = ['message']
</script>
```

#### v-if 与 v-for 优先级

```vue
<!-- Vue 2：v-for 优先级高于 v-if，可以在同一元素上用 v-for 的变量做条件 -->
<li v-for="user in users" v-if="user.active" :key="user.id">{{ user.name }}</li>

<!-- Vue 3：v-if 优先级更高，v-if 无法访问 v-for 作用域内的变量，上例会报错 -->
<!-- ✅ Vue 3 正确写法：外层 template 包一层 v-for -->
<template v-for="user in users" :key="user.id">
  <li v-if="user.active">{{ user.name }}</li>
</template>

<!-- 或在 computed 中先过滤 -->
```

#### key 用法变更

```vue
<!-- Vue 2：<template v-for> 的 key 要放在子元素上 -->
<template v-for="item in list">
  <div :key="item.id">{{ item.name }}</div>
</template>

<!-- Vue 3：key 应放在 template 上 -->
<template v-for="item in list" :key="item.id">
  <div>{{ item.name }}</div>
</template>

<!-- 另外：v-if/v-else 分支在 Vue 3 中不再需要手动添加 key -->
<!-- Vue 3 会为分支自动生成唯一 key -->
```

#### Transition 类名变更

```css
/* Vue 2 */
.v-enter,
.v-leave-to {
  opacity: 0;
}

/* Vue 3：v-enter → v-enter-from，v-leave → v-leave-from */
/* v-enter-active / v-enter-to / v-leave-active / v-leave-to 不变 */
.v-enter-from,
.v-leave-to {
  opacity: 0;
}
```

#### 异步组件

```javascript
// Vue 2
const AsyncComponent = () => import('./AsyncComponent.vue')

// 或带配置
const AsyncComponent = () => ({
  component: import('./AsyncComponent.vue'),
  loading: LoadingComponent,
  error: ErrorComponent,
  delay: 200,
  timeout: 3000
})

// Vue 3
import { defineAsyncComponent } from 'vue'

const AsyncComponent = defineAsyncComponent(() => 
  import('./AsyncComponent.vue')
)

// 或带配置
const AsyncComponent = defineAsyncComponent({
  loader: () => import('./AsyncComponent.vue'),
  loadingComponent: LoadingComponent,
  errorComponent: ErrorComponent,
  delay: 200,
  timeout: 3000
})
```

---

## 兼容性构建

Vue 3 提供了 `@vue/compat` 迁移构建版本，允许 Vue 2 代码在 Vue 3 中运行，同时发出迁移警告。

### 安装配置

```bash
# 安装 Vue 3 和兼容性构建
npm install vue@3 @vue/compat@3

# 安装迁移构建工具
npm install -D @vue/compiler-sfc@3
```

### 配置 vue.config.js

```javascript
// vue.config.js
const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  chainWebpack: config => {
    config.resolve.alias.set('vue', '@vue/compat')
    
    config.module
      .rule('vue')
      .use('vue-loader')
      .tap(options => {
        return {
          ...options,
          compilerOptions: {
            compatConfig: {
              MODE: 2
            }
          }
        }
      })
  }
})
```

### 配置 Vite

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {
          compatConfig: {
            MODE: 2
          }
        }
      }
    })
  ],
  resolve: {
    alias: {
      vue: '@vue/compat'
    }
  }
})
```

### 配置项说明

```javascript
// main.js
import { createApp, configureCompat } from 'vue'
import App from './App.vue'

// 全局配置兼容性行为
configureCompat({
  // MODE: 2 启用 Vue 2 行为
  MODE: 2,
  
  // 可针对特定特性配置
  // 'OPTIONS_BEFORE_CREATE': false, // 禁用某个兼容行为
  
  // 全局配置
  GLOBAL_MOUNT: false,
  GLOBAL_EXTEND: false
})

const app = createApp(App)
app.mount('#app')
```

### 常见编译器选项

| 特性标志 | 说明 |
|---------|------|
| MODE | 兼容模式：2 (Vue 2) 或 3 (Vue 3) |
| GLOBAL_MOUNT | 允许 `new Vue().$mount()` |
| GLOBAL_EXTEND | 允许 `Vue.extend()` |
| GLOBAL_PROTOTYPE | 允许 `Vue.prototype` |
| CONFIG_OPTION_MERGE_STRATS | 允许 `Vue.config.optionMergeStrategies` |
| CONFIG_SILENT | 允许 `Vue.config.silent` |
| CONFIG_DEVTOOLS | 允许 `Vue.config.devtools` |

### 迁移警告示例

```javascript
// 运行时会输出警告
[Vue warn]: (deprecation ATTR_FALSE_VALUE) 
Attribute "disabled" with v-bind value 'false' will render 
disabled="" instead of removing it in Vue 3. 
For detailed usage, check: https://v3-migration.vuejs.org/breaking-changes/attribute-coercion.html
```

---

## 迁移策略

### 策略概览

```mermaid
flowchart TD
    A[项目规模判断] --> B{项目规模?}
    B -->|小项目<br/>小于 10k LOC| C[直接升级到 Vue 3]
    B -->|中项目<br/>10k - 50k LOC| D[使用 @vue/compat<br/>迁移构建]
    B -->|大项目<br/>大于 50k LOC| E[先升级到 Vue 2.7<br/>再迁移到 Vue 3]
    B -->|有严格业务约束| F[保持 Vue 2.7<br/>新项目使用 Vue 3]
```

### 阶段一：准备工作（1-2 周）

#### 1. 评估迁移成本

```bash
# 官方没有一键评估工具，常用做法是静态搜索 + 运行时警告：

# 1) 全局搜索已移除/更名的 API 用法
grep -rn "Vue\.filter\|Vue\.directive\|Vue\.component\|\$on(\|\$off(\|\$once(\|beforeDestroy\|destroyed\|inline-template" src/

# 2) 升级到 @vue/compat 迁移构建后运行项目，统计控制台输出的弃用警告
npm run serve

# 控制台输出示例
# [Vue warn]: (deprecation FILTERS) ...
# [Vue warn]: (deprecation ATTR_FALSE_VALUE) ...
```

#### 2. 更新依赖项

```bash
# 检查依赖兼容性
npm outdated

# 查看 Vue 3 兼容的替代库
# Vue Router 3 -> Vue Router 4
# Vuex 3 -> Vuex 4 或 Pinia
# Element UI -> Element Plus
# Vuetify 2 -> Vuetify 3
```

#### 3. 创建迁移分支

```bash
# 创建迁移分支
git checkout -b vue3-migration

# 备份当前版本
git tag vue2-backup
```

### 阶段二：代码迁移（2-4 周）

#### 1. 全局 API 迁移

```javascript
// 步骤 1: 更新 main.js
// Vue 2
import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

Vue.config.productionTip = false
new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')

// Vue 3
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'

const app = createApp(App)
app.use(router)
app.use(createPinia())
app.mount('#app')
```

#### 2. 路由迁移

```javascript
// Vue Router 3
import VueRouter from 'vue-router'
Vue.use(VueRouter)

const router = new VueRouter({
  routes: [...]
})

// Vue Router 4
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [...]
})

// 路由守卫变更
// Vue Router 3
router.beforeEach((to, from, next) => {
  next()
})

// Vue Router 4
router.beforeEach((to, from) => {
  // return false 取消导航
  // return '/redirect' 重定向
  // 不返回或返回 true 继续导航
})
```

#### 3. 状态管理迁移

```javascript
// Vuex 3
import Vuex from 'vuex'
Vue.use(Vuex)

const store = new Vuex.Store({
  state: { count: 0 },
  mutations: {
    increment(state) {
      state.count++
    }
  }
})

// Vuex 4
import { createStore } from 'vuex'

const store = createStore({
  state: { count: 0 },
  mutations: {
    increment(state) {
      state.count++
    }
  }
})

// Pinia (推荐)
import { createPinia, defineStore } from 'pinia'

const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  actions: {
    increment() {
      this.count++
    }
  }
})

// 在组件中使用
const counter = useCounterStore()
counter.increment()
```

#### 4. 组件迁移清单

```markdown
[ ] 更新自定义指令钩子名称
[ ] 移除过滤器，使用计算属性或方法替代
[ ] 更新 v-model 绑定（value -> modelValue）
[ ] 更新生命周期钩子（beforeDestroy -> beforeUnmount）
[ ] 检查函数式组件写法
[ ] 更新异步组件导入方式
[ ] 移除 $on/$off/$once，使用外部事件库
[ ] 检查并修复响应式限制问题
```

#### 5. 使用迁移构建逐步修复

```javascript
// 步骤 1: 启用迁移构建
// package.json
{
  "dependencies": {
    "vue": "^3.1.0",
    "@vue/compat": "^3.1.0"
  }
}

// 步骤 2: 运行项目，查看警告
npm run serve

// 步骤 3: 逐个修复警告
// 例如修复过滤器
// ❌
<div>{{ message | capitalize }}</div>

// ✅
<div>{{ capitalize(message) }}</div>

// 步骤 4: 修复完所有警告后，移除 @vue/compat
npm uninstall @vue/compat
```

### 阶段三：测试与验证（1-2 周）

#### 1. 单元测试更新

```javascript
// Vue Test Utils v1 (Vue 2)
import { mount } from '@vue/test-utils'
import Component from './Component.vue'

test('renders correctly', () => {
  const wrapper = mount(Component)
  expect(wrapper.text()).toContain('Hello')
})

// Vue Test Utils v2 (Vue 3)
import { mount } from '@vue/test-utils'
import Component from './Component.vue'

test('renders correctly', () => {
  const wrapper = mount(Component)
  expect(wrapper.text()).toContain('Hello')
})

// 主要变更：一些 API 方法名变化
// wrapper.vm.$emit() -> wrapper.vm.$emit() (相同)
// wrapper.find() -> 仍支持
// wrapper.findAll() -> 返回数组而非对象
```

#### 2. E2E 测试验证

```javascript
// Cypress 测试示例
describe('Vue 3 Migration', () => {
  it('should render app correctly', () => {
    cy.visit('/')
    cy.get('.app').should('exist')
  })
  
  it('should handle user interactions', () => {
    cy.get('button').click()
    cy.get('.count').should('contain', '1')
  })
})
```

#### 3. 性能对比

```javascript
// 使用 Chrome DevTools Performance 进行对比
// 或使用 lighthouse
npx lighthouse http://localhost:8080 --view

// 记录关键指标
// - First Contentful Paint (FCP)
// - Largest Contentful Paint (LCP)
// - Total Blocking Time (TBT)
```

### 阶段四：部署上线（1 周）

#### 1. 灰度发布策略

```yaml
# 11-Nginx基础概述 配置示例
upstream vue2_backend {
  server 127.0.0.1:8080;
}

upstream vue3_backend {
  server 127.0.0.1:8081;
}

server {
  listen 80;
  server_name example.com;
  
  # 10% 流量到 Vue 3 版本
  split_clients "${remote_addr}" $backend {
    10%    vue3_backend;
    *      vue2_backend;
  }
  
  location / {
    proxy_pass http://$backend;
  }
}
```

#### 2. 监控与回滚

```javascript
// 添加错误监控
app.config.errorHandler = (err, vm, info) => {
  // 发送到错误监控系统
  trackError({
    message: err.message,
    stack: err.stack,
    info,
    vueVersion: 3
  })
}

// 准备回滚方案
// 1. 保留 Vue 2 版本代码
// 2. 准备快速回滚脚本
// 3. 监控关键业务指标
```

---

## 常见问题

### Q1: 迁移到 Vue 3 后，打包体积会变大吗？

**A:** 不会，反而会更小。Vue 3 支持 Tree-shaking，未使用的 API 不会被打包。以下为示意数据，具体收益因项目依赖而异：

```bash
# Vue 2 打包示意
dist/js/app.123abc.js  150kb

# Vue 3 打包示意
dist/js/app.456def.js   90kb  # 减少约 40%（示意）
```

### Q2: Element UI 项目如何迁移？

**A:** Element UI 需要升级到 Element Plus：

```bash
# 安装 Element Plus
npm install element-plus

# main.js
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

app.use(ElementPlus, { locale: zhCn })
```

**注意事项：**
- 部分组件 API 有变化，需参考迁移指南
- 自定义主题方式改变
- 图标使用方式改变

### Q3: TypeScript 项目迁移复杂吗？

**A:** Vue 3 对 TypeScript 支持更好，迁移后类型会更准确：

```typescript
// Vue 2 + TypeScript
import { Vue, Component } from 'vue-property-decorator'

@Component({
  props: {
    title: String
  }
})
export default class MyComponent extends Vue {
  title!: string
  count = 0
  
  increment() {
    this.count++
  }
}

// Vue 3 + TypeScript (更简洁)
<script setup lang="ts">
interface Props {
  title: string
}

const props = defineProps<Props>()
const count = ref(0)

function increment() {
  count.value++
}
</script>
```

### Q4: 如何处理第三方库不兼容问题？

**A:** 分情况处理：

1. **有 Vue 3 版本**：直接升级
2. **无 Vue 3 版本但活跃维护**：提 Issue 或 PR
3. **不再维护**：寻找替代库或自行 fork

```javascript
// 临时方案：使用兼容层
import { createApp } from 'vue'
import LegacyPlugin from 'legacy-vue2-plugin'

// 包装为 Vue 3 插件
const compatPlugin = {
  install(app) {
    // 模拟 Vue 2 API
    app.config.globalProperties.$legacy = LegacyPlugin
  }
}

app.use(compatPlugin)
```

### Q5: 迁移过程中如何保持团队协作？

**A:** 建议采用以下策略：

1. **分支策略**：
```bash
main (Vue 2)
  └── vue3-migration (Vue 3 迁移)
        ├── feature/update-router
        ├── feature/update-store
        └── fix/component-issues
```

2. **文档同步**：
```markdown
# 迁移进度跟踪

## 已完成
- [x] 全局 API 迁移
- [x] 路由升级到 Vue Router 4

## 进行中
- [ ] Vuex 迁移到 Pinia

## 待开始
- [ ] 组件库升级
```

3. **定期同步会议**：
   - 每日站会同步进度
   - 每周总结迁移遇到的问题
   - 共享最佳实践

### Q6: Vue 2.7 和 Vue 3 可以共存吗？

**A:** 不可以，一个项目只能使用一个版本。但可以：

1. **微前端架构**：不同子应用使用不同版本
2. **新功能使用 Vue 3**：老项目保持 Vue 2.7
3. **渐进式迁移**：使用 @vue/compat 过渡

### Q7: 如何处理大型项目的迁移？

**A:** 对于大型项目（> 50k LOC），建议：

```javascript
// 1. 模块化迁移
// 将项目拆分为独立模块
const modules = {
  'user-center': Vue 3,
  'order-system': Vue 2.7,  // 保持
  'product-catalog': Vue 3
}

// 2. 微前端方案
// 使用 qiankun 或 single-spa
import { registerMicroApps, start } from 'qiankun'

registerMicroApps([
  {
    name: 'vue2-app',
    entry: '//localhost:8081',
    container: '#vue2-container',
    activeRule: '/vue2'
  },
  {
    name: 'vue3-app',
    entry: '//localhost:8082',
    container: '#vue3-container',
    activeRule: '/vue3'
  }
])

start()
```

### Q8: 迁移后性能提升明显吗？

**A:** Vue 3 官方基准显示渲染/更新性能与内存占用均有明显提升，以下为示意数据，实际收益因项目而异：

```mermaid
graph LR
    subgraph "Vue 2"
        V2_Init["初始化<br/>120ms"]
        V2_Render["列表渲染 1K<br/>850ms"]
        V2_Mem["内存占用<br/>45MB"]
        V2_Bundle["打包体积<br/>180KB"]
    end
    subgraph "Vue 3"
        V3_Init["初始化<br/>80ms (-33%)"]
        V3_Render["列表渲染 1K<br/>350ms (-59%)"]
        V3_Mem["内存占用<br/>25MB (-44%)"]
        V3_Bundle["打包体积<br/>105KB (-42%)"]
    end
    V2_Init -.-> V3_Init
    V2_Render -.-> V3_Render
    V2_Mem -.-> V3_Mem
    V2_Bundle -.-> V3_Bundle
```

### Q9: 如何确保迁移后功能完整？

**A:** 建议建立完善的测试体系：

```javascript
// 1. 单元测试覆盖率检查
npm run test:unit -- --coverage

// 2. E2E 测试覆盖核心流程
describe('核心业务流程', () => {
  it('用户登录', () => { /* ... */ })
  it('下单流程', () => { /* ... */ })
  it('支付流程', () => { /* ... */ })
})

// 3. 视觉回归测试
// 使用 Percy、BackstopJS 等工具
```

### Q10: 迁移时机如何选择？

**A:** 建议根据项目阶段选择：

✅ **适合迁移的时机：**
- 项目处于维护期，无重大功能开发
- 团队有充足时间进行迁移和测试
- 依赖库已有 Vue 3 兼容版本
- 需要更好的 TypeScript 支持

❌ **不适合迁移的时机：**
- 项目处于紧急开发期
- 重大业务变更期间
- 团队人员流动较大
- 依赖库大量不兼容

---

## 迁移检查清单

### 迁移前检查

```markdown
[ ] 评估项目规模和复杂度
[ ] 检查所有依赖的 Vue 3 兼容性
[ ] 确认团队时间和资源充足
[ ] 创建完整的测试用例
[ ] 备份当前代码
[ ] 制定详细的迁移计划
```

### 代码迁移检查

```markdown
[ ] 更新 main.js 入口文件
[ ] 迁移路由到 Vue Router 4
[ ] 迁移状态管理（Vuex 4 或 Pinia）
[ ] 更新自定义指令
[ ] 移除过滤器
[ ] 更新 v-model 绑定
[ ] 更新生命周期钩子名称
[ ] 检查函数式组件
[ ] 更新异步组件写法
[ ] 替换 $on/$off/$once
[ ] 检查响应式代码
[ ] 更新单元测试
```

### 迁移后验证

```markdown
[ ] 所有单元测试通过
[ ] E2E 测试通过
[ ] 性能指标符合预期
[ ] 浏览器兼容性测试
[ ] 移动端测试（如适用）
[ ] 错误监控正常
[ ] 生产环境灰度测试
[ ] 文档更新完成
```

---

## 总结

Vue 2 到 Vue 3 的迁移是一项系统工程，需要充分准备和规划：

### 核心要点

1. **充分准备**：评估成本、检查依赖、制定计划
2. **渐进迁移**：先升级到 Vue 2.7，再迁移到 Vue 3
3. **利用工具**：使用 @vue/compat 迁移构建降低风险
4. **完善测试**：单元测试、E2E 测试、性能测试缺一不可
5. **团队协作**：保持沟通，共享经验，同步进度

### 迁移收益

- 🚀 更好的性能表现
- 📦 更小的打包体积
- 🎯 更好的 TypeScript 支持
- 🧩 更灵活的代码组织（Composition API）
- 🔧 更强大的工具链支持
- 🎨 更多新特性（Teleport、Fragments、Suspense）

### 建议

- **小型项目**：直接迁移到 Vue 3
- **中型项目**：使用迁移构建逐步迁移
- **大型项目**：先升级到 Vue 2.7，再分模块迁移
