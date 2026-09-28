---
title: 风格指南与FAQ
description: "Vue 3 官方风格指南要点（组件/文件/Props/事件/插槽命名、模板与脚本规范、目录结构）与常见问题解答：响应式、组件通信、路由、Pinia、生命周期、性能与调试。"
keywords: [风格指南与FAQ]
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 风格指南与FAQ

> 遵循官方风格指南可以编写更规范、可维护的代码。本章节涵盖 Vue 3 开发的编码规范和最佳实践。

## 命名规范

### 组件命名

```vue
<!-- ✅ 推荐：PascalCase -->
<MyComponent />
<UserProfile />
<NavigationBar />

<!-- ❌ 不推荐：kebab-case（仅在不支持 PascalCase 的 DOM 模板中使用） -->
<my-component />
```

**命名规则：**

| 类型 | 规范 | 示例 |
|------|------|------|
| 基础组件 | `Base` + 名词 | `BaseButton`, `BaseInput` |
| 单例组件 | `The` + 名词 | `TheHeader`, `TheFooter` |
| 业务组件 | 功能描述 | `UserAvatar`, `ProductCard` |
| 高阶组件 | `with` + 功能 | `withLoading`, `withAuth` |

### 文件命名

```
components/
├── Base/
│   ├── BaseButton.vue        # 单文件组件使用 PascalCase
│   ├── BaseInput.vue
│   └── index.ts              # 导出文件
├── User/
│   ├── UserAvatar.vue
│   ├── UserProfile.vue
│   └── UserSettings.vue
└── index.ts
```

### Props 命名

```vue
<script setup>
// ✅ 在 JavaScript 中使用 camelCase
defineProps({
  greetingMessage: String,
  isActive: Boolean,
  itemData: Object
})
</script>

<template>
  <!-- 在模板中使用 kebab-case -->
  <MyComponent 
    greeting-message="hello"
    :is-active="true"
    :item-data="data"
  />
</template>
```

### 事件命名

```js
// ✅ 推荐：kebab-case（符合 DOM 事件命名习惯）
defineEmits(['close-dialog', 'update-user', 'submit-form'])

// ❌ 不推荐：camelCase
defineEmits(['closeDialog', 'updateUser'])
```

**事件命名约定：**

| 场景 | 命名格式 | 示例 |
|------|----------|------|
| 更新数据 | `update:` + 属性名 | `update:modelValue` |
| 触发动作 | 动词 + 名词 | `submit-form`, `delete-item` |
| 状态变化 | `on` + 状态 | `on-open`, `on-close` |

### 插槽命名

```vue
<!-- ✅ 推荐：kebab-case -->
<template>
  <slot name="header-content" />
  <slot name="footer-actions" />
  
  <!-- 作用域插槽 -->
  <slot name="item" :data="item" />
</template>

<!-- 使用时 -->
<MyComponent>
  <template #header-content>
    <h1>标题</h1>
  </template>
</MyComponent>
```

---

## 组件设计原则

### 单一职责原则

```vue
<!-- ✅ 推荐：职责单一 -->
<!-- UserAvatar.vue - 只负责显示头像 -->
<template>
  <img :src="avatarUrl" :alt="alt" class="avatar" />
</template>

<!-- UserCard.vue - 组合多个组件 -->
<template>
  <div class="user-card">
    <UserAvatar :url="user.avatar" />
    <UserInfo :user="user" />
    <UserActions @edit="handleEdit" />
  </div>
</template>

<!-- ❌ 不推荐：组件职责过多 -->
<template>
  <div class="user-card">
    <img :src="user.avatar" />
    <span>{{ user.name }}</span>
    <button @click="edit">编辑</button>
    <button @click="delete">删除</button>
    <form v-if="isEditing">...</form>
  </div>
</template>
```

### 组件通信设计

```
┌─────────────────────────────────────────────────────────────┐
│                     组件通信方式                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   父 ─────▶ 子      Props                                   │
│                    defineProps                              │
│                                                             │
│   子 ─────▶ 父      Emits                                   │
│                    defineEmits                              │
│                                                             │
│   父 ◀────▶ 子      v-model                                 │
│                    双向绑定                                  │
│                                                             │
│   跨层级            provide/inject                          │
│                    依赖注入                                  │
│                                                             │
│   全局状态          Pinia                                    │
│                    状态管理                                  │
│                                                             │
│   兄弟组件          事件总线 / 共同父组件                     │
│                    mitt / props + emits                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Props 定义规范

```js
// ✅ 推荐：详细定义
defineProps({
  // 基础类型检查
  title: String,
  
  // 多个可能的类型
  id: [String, Number],
  
  // 必填字段
  status: {
    type: String,
    required: true,
    validator: value => ['active', 'inactive', 'pending'].includes(value)
  },
  
  // 带默认值
  size: {
    type: String,
    default: 'medium',
    validator: value => ['small', 'medium', 'large'].includes(value)
  },
  
  // 对象/数组默认值使用工厂函数
  items: {
    type: Array,
    default: () => []
  },
  
  config: {
    type: Object,
    default: () => ({})
  }
})

// ❌ 不推荐：简单数组（无类型检查）
defineProps(['status', 'size', 'items'])
```

---

## 模板规范

### 指令简写统一

```vue
<!-- ✅ 推荐：统一风格 -->
<input 
  :value="value" 
  @input="handleInput" 
  :disabled="isDisabled"
/>

<!-- 或者全部使用完整形式（团队统一即可） -->
<input 
  v-bind:value="value" 
  v-on:input="handleInput"
  v-bind:disabled="isDisabled"
/>

<!-- ❌ 不推荐：混用风格 -->
<input v-bind:value="value" @input="handleInput" :disabled="isDisabled" v-on:focus="onFocus" />
```

### v-for 与 key

```vue
<!-- ✅ 推荐：使用唯一 id -->
<li v-for="item in items" :key="item.id">
  {{ item.name }}
</li>

<!-- ❌ 不推荐：使用索引（可能导致渲染问题） -->
<li v-for="(item, index) in items" :key="index">
  {{ item.name }}
</li>

<!-- ✅ 嵌套 v-for 使用复合 key -->
<div v-for="category in categories" :key="category.id">
  <div v-for="item in category.items" :key="`${category.id}-${item.id}`">
    {{ item.name }}
  </div>
</div>
```

### 避免 v-if 与 v-for 同时使用

```vue
<!-- ❌ 不推荐：v-if 和 v-for 同级 -->
<li v-for="item in items" v-if="item.active" :key="item.id">
  {{ item.name }}
</li>

<!-- ✅ 推荐：使用计算属性 -->
<script setup>
const activeItems = computed(() => items.filter(item => item.active))
</script>

<template>
  <li v-for="item in activeItems" :key="item.id">
    {{ item.name }}
  </li>
</template>

<!-- ✅ 或者使用 template 包裹 -->
<template v-for="item in items" :key="item.id">
  <li v-if="item.active">
    {{ item.name }}
  </li>
</template>
```

### 属性顺序

```vue
<!-- 推荐的属性顺序 -->
<MyComponent
  <!-- 1. is -->
  is="custom-component"
  
  <!-- 2. v-for -->
  v-for="item in items"
  :key="item.id"
  
  <!-- 3. v-if / v-else-if / v-else / v-show -->
  v-if="isVisible"
  
  <!-- 4. id -->
  id="unique-id"
  
  <!-- 5. ref -->
  ref="componentRef"
  
  <!-- 6. 其他 Props -->
  :data="itemData"
  :config="config"
  
  <!-- 7. v-model -->
  v-model="value"
  
  <!-- 8. v-on -->
  @click="handleClick"
  @change="handleChange"
  
  <!-- 9. v-html / v-text -->
  v-html="content"
  
  <!-- 10. class -->
  class="custom-class"
  
  <!-- 11. style -->
  :style="{ color: textColor }"
/>
```

---

## 脚本规范

### 使用 `<script setup>`

```vue
<!-- ✅ 推荐：使用 <script setup> -->
<script setup>
import { ref, computed } from 'vue'

// Props 和 Emits
const props = defineProps({
  modelValue: String
})

const emit = defineEmits(['update:modelValue'])

// 响应式状态
const count = ref(0)
const doubled = computed(() => count.value * 2)

// 方法
function increment() {
  count.value++
}

// 暴露给父组件
defineExpose({ count, increment })
</script>

<!-- ❌ 不推荐：Options API（除非迁移项目） -->
<script>
export default {
  data() {
    return {
      count: 0
    }
  },
  methods: {
    increment() {
      this.count++
    }
  }
}
</script>
```

### 响应式数据命名

```js
// ✅ 推荐：明确的命名
const isLoading = ref(false)
const hasError = ref(false)
const userList = ref([])
const totalCount = ref(0)

// ✅ 响应式对象使用语义化命名
const formData = reactive({
  username: '',
  password: ''
})

// ❌ 不推荐：模糊命名
const flag = ref(false)
const data = ref([])
const temp = ref(null)
```

### 组合式函数规范

```ts
// composables/useUser.ts
import { ref, type Ref } from 'vue'

// 导出类型
export interface User {
  id: number
  name: string
  email: string
}

export interface UseUserReturn {
  user: Ref<User | null>
  loading: Ref<boolean>
  error: Ref<Error | null>
  fetchUser: (id: number) => Promise<void>
  updateUser: (data: Partial<User>) => Promise<void>
}

// 以 use 开头命名
export function useUser(): UseUserReturn {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function fetchUser(id: number) {
    loading.value = true
    error.value = null
    try {
      user.value = await api.fetchUser(id)
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  async function updateUser(data: Partial<User>) {
    // ...
  }

  // 返回响应式引用和方法
  return {
    user,
    loading,
    error,
    fetchUser,
    updateUser
  }
}
```

---

## 样式规范

### Scoped 样式

```vue
<template>
  <div class="user-card">
    <img class="avatar" :src="avatarUrl" />
    <span class="name">{{ name }}</span>
  </div>
</template>

<style scoped>
/* ✅ 推荐：使用 class 而非标签选择器 */
.user-card {
  display: flex;
  align-items: center;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.name {
  margin-left: 8px;
}

/* 需要修改子组件样式时使用 :deep() */
:deep(.child-component-class) {
  color: red;
}
</style>
```

### CSS 变量使用

```vue
<style>
/* 全局变量定义 */
:root {
  --primary-color: #42b883;
  --text-color: #2c3e50;
  --border-radius: 4px;
}
</style>

<style scoped>
/* 组件内使用变量 */
.button {
  background-color: var(--primary-color);
  color: var(--text-color);
  border-radius: var(--border-radius);
}
</style>
```

---

## 代码组织

### 目录结构

```
src/
├── components/           # 组件
│   ├── Base/            # 基础组件
│   ├── common/          # 通用组件
│   └── features/        # 业务组件
├── composables/         # 组合式函数
├── directives/          # 自定义指令
├── hooks/               # 钩子函数
├── stores/              # Pinia 状态管理
├── api/                 # API 接口
├── utils/               # 工具函数
├── types/               # TypeScript 类型定义
├── assets/              # 静态资源
├── router/              # 路由配置
├── views/               # 页面组件
└── App.vue              # 根组件
```

### 单文件组件结构

```vue
<!-- 1. 模板 -->
<template>
  <div class="component-name">
    <!-- 内容 -->
  </div>
</template>

<!-- 2. 脚本 -->
<script setup lang="ts">
// 2.1 导入
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { User } from '@/types'

// 2.2 Props 定义
const props = defineProps<{
  userId: number
}>()

// 2.3 Emits 定义
const emit = defineEmits<{
  (e: 'update', user: User): void
}>()

// 2.4 响应式状态
const loading = ref(false)
const user = ref<User | null>(null)

// 2.5 计算属性
const displayName = computed(() => user.value?.name ?? 'Unknown')

// 2.6 方法
async function fetchUser() {
  loading.value = true
  // ...
}

// 2.7 生命周期
onMounted(() => {
  fetchUser()
})

// 2.8 暴露
defineExpose({ fetchUser })
</script>

<!-- 3. 样式 -->
<style scoped>
.component-name {
  /* 样式 */
}
</style>
```

---

## 检查清单

### 组件开发检查

- [ ] 组件使用 PascalCase 命名
- [ ] Props 使用对象语法定义类型和默认值
- [ ] 事件使用 kebab-case 命名
- [ ] v-for 必须绑定唯一 key
- [ ] 避免 v-if 和 v-for 同级使用
- [ ] 使用 `<script setup>` 语法
- [ ] 样式使用 scoped 限制作用域

### 代码质量检查

- [ ] 无 console.log 等调试代码
- [ ] 注释清晰说明复杂逻辑
- [ ] 遵循 ESLint 规则
- [ ] TypeScript 类型完整
- [ ] 无 any 类型（除非必要）

---

## 下一步

- [性能优化](03-性能优化.md) - 学习性能优化技巧，提升应用性能
- [TypeScript最佳实践](04-安全与TypeScript实践.md) - 掌握 TypeScript 与 Vue 3 的最佳结合方式

## 参考资源

- [Vue 官方风格指南](https://vuejs.org/style-guide/)
- [Vue 3 文档 - 最佳实践](https://vuejs.org/guide/best-practices/production-deployment.html)


---

## 常见问题解答


> Vue 3 开发中的常见问题及解决方案，涵盖响应式、组件通信、生命周期、性能优化等方面。

## 响应式问题

### 为什么 ref 需要 .value？

```ts
import { ref } from 'vue'

// ref 包装基本类型，需要 .value 访问
const count = ref(0)
count.value++

// ref 包装对象
const user = ref({ name: 'Vue' })
user.value.name = 'Vue 3'  // ✅ 可以直接修改
user.value = { name: 'New' } // ✅ 替换整个对象
```

**原因：** JavaScript 基本类型是值传递，无法被追踪。ref 通过包装成对象，使用 `.value` 属性来追踪变化。

**模板中自动解包：**
```vue
<template>
  <!-- 不需要 .value -->
  <div>{{ count }}</div>
  <div>{{ user.name }}</div>
</template>
```

### ref vs reactive 如何选择？

```ts
// ref 适用场景
const count = ref(0)           // 基本类型
const user = ref<User | null>(null) // 需要整体替换
const list = ref<Item[]>([])   // 需要替换整个数组

// reactive 适用场景
const state = reactive({
  loading: false,
  data: [] as Data[],
  error: null as Error | null
})
// 不需要整体替换的对象

// 选择建议
```

| 特性 | ref | reactive |
|------|-----|----------|
| 基本类型 | ✅ 支持 | ❌ 不支持 |
| 对象整体替换 | ✅ 支持 | ❌ 不支持 |
| 解构 | ✅ 保持响应式 | ❌ 需 toRefs |
| 模板解包 | ✅ 自动 | ✅ 自动 |
| 适用场景 | 单值、可空对象 | 复杂状态对象 |

### 为什么 reactive 解构后失去响应式？

```ts
const state = reactive({ count: 0, name: 'Vue' })

// ❌ 直接解构失去响应式
const { count, name } = state

// ✅ 使用 toRefs 保持响应式
import { toRefs } from 'vue'
const { count, name } = toRefs(state)

// ✅ 使用 toRef 获取单个属性
import { toRef } from 'vue'
const countRef = toRef(state, 'count')
```

**解决方案对比：**

```ts
// toRefs - 解构所有属性
const { count, name } = toRefs(state)
count.value++  // ✅ 响应式

// toRef - 获取单个属性
const countRef = toRef(state, 'count')

// computed - 创建派生响应式
const doubled = computed(() => state.count * 2)
```

### 为什么数组/对象修改不触发更新？

```ts
// Vue 2 时代需要 Vue.set 的操作，Vue 3 基于 Proxy 已全部原生支持：
const list = ref([1, 2, 3])
list.value[0] = 10   // ✅ 索引修改是响应式的

list.value.length = 0  // ✅ 修改长度同样是响应式的

// 但某些情况仍需注意
const state = reactive({ list: [1, 2, 3] })
state.list = [...state.list, 4]  // ✅ 推荐方式

// 对于 reactive 的数组
const arr = reactive([1, 2, 3])
arr.push(4)        // ✅ 响应式
arr.splice(0, 1)   // ✅ 响应式
arr.length = 0     // ✅ Vue 3 支持响应式

// 添加对象属性
const obj = reactive({ a: 1 })
obj.b = 2  // ✅ Vue 3 支持响应式添加
```

### shallowRef 如何触发更新？

```ts
import { shallowRef, triggerRef } from 'vue'

const state = shallowRef({ count: 0 })

// ❌ 深层修改不会触发更新
state.value.count = 1

// ✅ 方式一：替换整个对象
state.value = { count: 1 }

// ✅ 方式二：使用 triggerRef
state.value.count = 1
triggerRef(state)

// ✅ 方式三：对于数组
const list = shallowRef([1, 2, 3])
list.value.push(4)
triggerRef(list)
```

---

## 组件问题

### 如何访问子组件方法？

```vue
<!-- Parent.vue -->
<script setup lang="ts">
import { ref } from 'vue'
import Child from './Child.vue'

const childRef = ref<InstanceType<typeof Child> | null>(null)

function callChildMethod() {
  childRef.value?.doSomething()
}
</script>

<template>
  <button @click="callChildMethod">调用子组件方法</button>
  <Child ref="childRef" />
</template>

<!-- Child.vue -->
<script setup lang="ts">
function doSomething() {
  console.log('Child method called')
}

// 必须使用 defineExpose 暴露
defineExpose({
  doSomething
})
</script>
```

### 父子组件如何双向绑定？

```vue
<!-- 方式一：v-model -->
<!-- Parent.vue -->
<template>
  <Child v-model="value" />
</template>

<!-- Child.vue -->
<script setup lang="ts">
const model = defineModel<string>()

// 或使用完整的 props/emits
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>

<!-- 方式二：多个 v-model -->
<template>
  <UserForm 
    v-model:username="username"
    v-model:email="email"
  />
</template>
```

### 组件如何透传属性？

```vue
<!-- 父组件传入多个属性 -->
<MyButton class="large" disabled data-testid="submit-btn" />

<!-- MyButton.vue -->
<template>
  <!-- 使用 $attrs 透传 -->
  <button v-bind="$attrs">
    <slot />
  </button>
</template>

<script setup lang="ts">
// 禁用自动透传
defineOptions({
  inheritAttrs: false
})

// 手动控制透传
import { useAttrs } from 'vue'
const attrs = useAttrs()
</script>

<template>
  <div class="button-wrapper">
    <button v-bind="attrs">
      <slot />
    </button>
  </div>
</template>
```

### 如何动态组件传参？

```vue
<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'

const components = {
  UserTab: defineAsyncComponent(() => import('./UserTab.vue')),
  AdminTab: defineAsyncComponent(() => import('./AdminTab.vue'))
}

const currentTab = ref('UserTab')
const currentComponent = computed(() => components[currentTab.value])

const tabProps = {
  UserTab: { userId: 1 },
  AdminTab: { role: 'admin' }
}
</script>

<template>
  <component 
    :is="currentComponent" 
    v-bind="tabProps[currentTab]"
  />
</template>
```

---

## 路由问题

### 如何获取路由参数？

```vue
<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 获取动态路由参数
const userId = computed(() => route.params.id)

// 获取查询参数
const query = computed(() => route.query)

// 编程式导航
function navigate() {
  router.push({ name: 'User', params: { id: 1 } })
  router.push({ path: '/user/1' })
  router.replace('/home')
}
</script>
```

### 如何监听路由变化？

```vue
<script setup lang="ts">
import { watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

// 监听参数变化
watch(
  () => route.params.id,
  (newId, oldId) => {
    console.log('ID changed:', oldId, '->', newId)
    fetchData(newId)
  },
  { immediate: true }
)

// 监听查询参数
watch(
  () => route.query,
  (query) => {
    console.log('Query changed:', query)
  }
)

// 监听完整路由
watch(
  () => route,
  (to, from) => {
    console.log('Route changed:', from.path, '->', to.path)
  },
  { deep: true }
)
</script>
```

### 如何实现路由守卫？

```ts
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [...]
})

// 全局前置守卫
router.beforeEach((to, from, next) => {
  // 权限检查
  if (to.meta.requiresAuth && !isAuthenticated()) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

// 全局后置守卫
router.afterEach((to, from) => {
  // 页面标题
  document.title = to.meta.title || 'My App'
})
```

### 路由懒加载报错如何处理？

```ts
// 方式一：带错误处理
const UserView = () => import('./views/UserView.vue').catch(() => {
  // 处理加载错误
  return import('./views/ErrorView.vue')
})

// 方式二：使用 defineAsyncComponent
import { defineAsyncComponent } from 'vue'

const UserView = defineAsyncComponent({
  loader: () => import('./views/UserView.vue'),
  loadingComponent: LoadingSpinner,
  errorComponent: ErrorComponent,
  delay: 200,
  timeout: 10000
})

// 方式三：路由配置
const routes = [
  {
    path: '/user/:id',
    component: () => import('./views/UserView.vue'),
    meta: { onError: 'handleLoadError' }
  }
]
```

---

## 状态管理问题

### Pinia vs Vuex 如何选择？

| 特性 | Pinia | Vuex |
|------|-------|------|
| Vue 版本 | Vue 2/3 | Vue 2/3 |
| TypeScript | ✅ 原生支持 | ⚠️ 需要额外配置 |
| 模块化 | ✅ 天然支持 | 需要配置 modules |
| Mutations | ❌ 不需要 | ✅ 必须使用 |
| 开发工具 | ✅ Vue DevTools | ✅ Vue DevTools |
| 学习曲线 | 低 | 中 |

**推荐：** Vue 3 项目使用 Pinia。

### Pinia 基本使用

```ts
// stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Setup Store（推荐）
export const useUserStore = defineStore('user', () => {
  // state
  const user = ref<User | null>(null)
  const loading = ref(false)
  
  // getters
  const isLoggedIn = computed(() => user.value !== null)
  
  // actions
  async function login(credentials: LoginCredentials) {
    loading.value = true
    try {
      user.value = await authApi.login(credentials)
    } finally {
      loading.value = false
    }
  }
  
  function logout() {
    user.value = null
  }
  
  return { user, loading, isLoggedIn, login, logout }
})

// Options Store（传统方式，与上面的 Setup Store 二选一）
export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
    loading: false
  }),
  getters: {
    isLoggedIn: (state) => state.user !== null
  },
  actions: {
    async login(credentials: LoginCredentials) {
      this.loading = true
      this.user = await authApi.login(credentials)
      this.loading = false
    }
  }
})
```

### 如何持久化 Pinia 状态？

```ts
// 使用 pinia-plugin-persistedstate
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// 在 store 中配置
export const useUserStore = defineStore('user', () => {
  // ...
}, {
  persist: {
    key: 'user-store',
    storage: localStorage,
    pick: ['user', 'preferences']  // 只持久化特定字段（v3 版本选项名为 paths）
  }
})

// 或手动实现
export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  
  // 初始化时读取
  const saved = localStorage.getItem('user')
  if (saved) {
    user.value = JSON.parse(saved)
  }
  
  // 监听变化保存
  watch(user, (value) => {
    localStorage.setItem('user', JSON.stringify(value))
  }, { deep: true })
  
  return { user }
})
```

---

## 生命周期问题

### 生命周期钩子顺序？

```
组件创建
    │
    ▼
┌─────────────────┐
│ setup()         │ ◀── Composition API 入口
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ onBeforeMount   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ onMounted       │ ◀── DOM 可访问
└────────┬────────┘
         │
         │  ◀── 组件更新循环 ─┐
         │                    │
         ▼                    │
┌─────────────────┐           │
│ onBeforeUpdate  │           │
└────────┬────────┘           │
         │                    │
         ▼                    │
┌─────────────────┐           │
│ onUpdated       │ ──────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ onBeforeUnmount │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ onUnmounted     │ ◀── 清理副作用
└─────────────────┘
```

### onMounted 中获取 DOM 元素？

```vue
<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'

const containerRef = ref<HTMLDivElement | null>(null)

onMounted(() => {
  // DOM 已挂载，可以访问
  console.log(containerRef.value) // <div>
  
  // 获取尺寸
  const rect = containerRef.value?.getBoundingClientRect()
})

// 如果需要等待 DOM 更新完成
async function handleClick() {
  // 修改数据
  state.value = newValue
  
  // 等待 DOM 更新
  await nextTick()
  
  // 现在可以访问更新后的 DOM
  console.log(containerRef.value?.textContent)
}
</script>

<template>
  <div ref="containerRef">
    {{ state }}
  </div>
</template>
```

### 如何正确清理副作用？

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, watch, watchEffect } from 'vue'

// 定时器
let timer: number | undefined

onMounted(() => {
  timer = setInterval(() => {
    console.log('tick')
  }, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
})

// watch 自动清理
watch(source, (value, oldValue, onCleanup) => {
  const controller = new AbortController()
  
  fetch(`/api/data/${value}`, { signal: controller.signal })
  
  // 下次执行前调用
  onCleanup(() => {
    controller.abort()
  })
})

// watchEffect 自动清理
watchEffect((onCleanup) => {
  const timer = setInterval(doSomething, 1000)
  
  onCleanup(() => {
    clearInterval(timer)
  })
})

// 事件监听
onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

// 组合式函数模式
function useEventListener(target: EventTarget, event: string, callback: EventListener) {
  onMounted(() => target.addEventListener(event, callback))
  onUnmounted(() => target.removeEventListener(event, callback))
}

// 使用
useEventListener(window, 'resize', handleResize)
</script>
```

---

## 性能问题

### 为什么组件频繁重新渲染？

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

// 问题 1：Props 对象每次创建新引用
// ❌ 父组件模板中直接写字面量，每次渲染都创建新对象：
// <Child :options="{ a: 1, b: 2 }" />
// ✅ 使用 computed 或 ref 传入稳定引用
const options = computed(() => ({ a: 1, b: 2 }))

// 问题 2：内联函数
// ❌ 每次渲染创建新函数：
// <Child @click="() => doSomething()" />
// ✅ 使用稳定引用
function handleClick() {
  doSomething()
}

// 问题 3：计算属性依赖频繁变化时，仍会生成新数组并触发子组件更新
// ✅ 对列表项使用 v-memo 减少不必要的更新
const items = ref([])
</script>

<template>
  <Child :options="options" @click="handleClick" />

  <div v-for="item in items" :key="item.id" v-memo="[item.active]">
    {{ item.name }}
  </div>
</template>
```

### 如何优化大列表渲染？

```vue
<script setup lang="ts">
import { useVirtualList } from '@vueuse/core'

const items = ref(Array.from({ length: 10000 }, (_, i) => ({
  id: i,
  text: `Item ${i}`
})))

// 虚拟列表
const { list, containerProps, wrapperProps } = useVirtualList(
  items,
  { itemHeight: 50 }
)

// 或使用第三方库：vue-virtual-scroller
</script>

<template>
  <!-- 方式一：useVirtualList -->
  <div v-bind="containerProps" style="height: 500px; overflow-y: auto;">
    <div v-bind="wrapperProps">
      <div 
        v-for="{ data, index } in list" 
        :key="data.id"
        style="height: 50px;"
      >
        {{ index }}: {{ data.text }}
      </div>
    </div>
  </div>

  <!-- 方式二：使用 v-memo -->
  <div 
    v-for="item in items" 
    :key="item.id"
    v-memo="[item.selected]"
  >
    {{ item.text }}
  </div>

  <!-- 方式三：分页加载 -->
  <div v-for="item in visibleItems" :key="item.id">
    {{ item.text }}
  </div>
  <button @click="loadMore">加载更多</button>
</template>
```

### 如何分析性能瓶颈？

```ts
// 1. 使用 Vue DevTools 性能分析
// 安装 Vue DevTools 浏览器扩展

// 2. 开启性能追踪
if (import.meta.env.DEV) {
  app.config.performance = true
}

// 3. 使用 Performance API
function measureRender(componentName: string) {
  const start = `${componentName}-start`
  const end = `${componentName}-end`
  
  performance.mark(start)
  
  return () => {
    performance.mark(end)
    performance.measure(componentName, start, end)
    const measure = performance.getEntriesByName(componentName)[0]
    console.log(`${componentName}: ${measure.duration}ms`)
  }
}

// 4. 使用 Chrome DevTools
// Performance 面板录制分析
```

---

## TypeScript 问题

### defineProps 类型推断不生效？

```vue
<script setup lang="ts">
// ❌ 使用运行时声明，无类型推断
defineProps({
  title: String,
  count: Number
})

// ✅ 使用类型声明
interface Props {
  title: string
  count: number
}
defineProps<Props>()

// ✅ 带默认值
interface Props {
  title: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  count: 0
})

// ✅ 从其他文件导入类型
import type { UserProps } from '@/types'
defineProps<UserProps>()
</script>
```

### ref 类型如何定义？

```ts
import { ref, type Ref } from 'vue'

// 基本类型
const count = ref<number>(0)

// 对象类型
interface User {
  id: number
  name: string
}
const user = ref<User | null>(null)

// 数组类型
const list = ref<User[]>([])

// DOM 元素
const inputEl = ref<HTMLInputElement | null>(null)

// 组件实例
import ChildComponent from './Child.vue'
const childRef = ref<InstanceType<typeof ChildComponent> | null>(null)
```

### 如何扩展组件类型？

```ts
// 扩展全局属性
declare module 'vue' {
  interface ComponentCustomProperties {
    $http: typeof axios
  }
}

// 扩展组件选项
declare module 'vue' {
  interface ComponentCustomOptions {
    middleware?: string[]
  }
}

// 使用
export default defineComponent({
  middleware: ['auth'],
  // ...
})
```

---

## 调试技巧

### Vue DevTools 使用

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Vue DevTools 功能                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  组件树           查看组件层级、props、events、slots               │
│  Pinia           查看状态管理、时间旅行调试                         │
│  路由            查看当前路由、历史记录                             │
│  Timeline        性能时间线、事件追踪                               │
│  性能分析        组件渲染时间分析                                   │
│                                                                     │
│  快捷键：                                                          │
│  • Ctrl/Cmd + Shift + C  定位组件                                  │
│  • $vm0                    在控制台访问选中组件                     │
│  • $refs                   在控制台访问 refs                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 控制台调试技巧

```ts
// 在模板中访问组件实例
// DevTools 选中组件后，使用 $vm0

// 获取组件 props
$vm0.$props

// 获取组件 state
$vm0.$data

// 调用组件方法
$vm0.someMethod()

// 添加全局调试方法
if (import.meta.env.DEV) {
  window.__debug__ = {
    logReactive: (obj: any) => {
      return toRaw(obj)
    },
    measureTime: async (fn: () => Promise<any>, label: string) => {
      console.time(label)
      await fn()
      console.timeEnd(label)
    }
  }
}
```

### 响应式调试

```ts
import { watchEffect, watch, triggerRef } from 'vue'

// watchEffect 调试响应式依赖
watchEffect((onCleanup) => {
  console.log('依赖变化:', count.value)
  // 可以看到所有被追踪的依赖
})

// watch 调试特定值
watch(
  () => state.count,
  (newVal, oldVal) => {
    console.log('count changed:', oldVal, '->', newVal)
    console.trace() // 打印调用栈
  },
  { flush: 'sync' } // 同步执行，便于调试
)

// 自定义调试钩子
function useDebugRef<T>(value: T, label: string) {
  const ref = shallowRef(value)
  
  watch(ref, (newVal, oldVal) => {
    console.log(`[${label}]`, oldVal, '->', newVal)
  }, { flush: 'sync' })
  
  return ref
}
```

### 常见错误排查

```ts
// 错误 1：Cannot read property 'xxx' of undefined
// 原因：访问了 null/undefined 的属性
// 解决：使用可选链
user.value?.name
list.value?.[0]?.id

// 错误 2：Maximum recursive updates exceeded
// 原因：watch/computed 中修改了自己依赖的值
// 解决：检查循环依赖，使用 flush: 'sync' 或 nextTick

watch(count, (newVal) => {
  count.value = newVal + 1 // ❌ 循环更新
})

// 错误 3：Hydration mismatch
// 原因：服务端渲染与客户端渲染不一致
// 解决：检查 Date.now()、Math.random() 等在 SSR 中的使用

// 错误 4：v-model 不能直接修改 props
// 原因：单向数据流
// 解决：使用 computed 或 defineModel
const model = defineModel<string>()
```

---

## 问题排查流程

```
遇到问题
    │
    ▼
┌─────────────────┐
│ 控制台有错误？  │──── 否 ───▶ 检查网络请求
└────────┬────────┘              │
         │ 是                     │
         ▼                        ▼
┌─────────────────┐     ┌─────────────────┐
│ 阅读错误信息    │     │ DevTools 组件树  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌─────────────────┐
│ 检查相关代码    │     │ 检查 Props/State │
└────────┬────────┘     └────────┬────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────┐
│              搜索/文档查询               │
└────────────────────┬────────────────────┘
                     │
                     ▼
         ┌─────────────────┐
         │     解决问题     │
         └─────────────────┘
```

---

## 下一步

- [响应式系统原理](../04-原理与工程化/01-响应式系统原理.md) - 深入理解响应式与渲染原理

## 参考资源

- [Vue 3 FAQ](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)
- [Vue GitHub Discussions](https://github.com/vuejs/core/discussions)
- [Stack Overflow Vue.js](https://stackoverflow.com/questions/tagged/vue.js)
