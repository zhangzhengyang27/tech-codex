---
title: TypeScript 支持
description: Vue 2 项目中 TypeScript 的核心概念、用法与实践要点
keywords: [Vue, TypeScript 支持]
category: Vue
tags: [Vue]
---
# TypeScript 支持

## 为什么在 Vue 中使用 TypeScript

在 Vue 项目中使用 TypeScript 有以下优势：

| 优势             | 说明                                       |
| ---------------- | ------------------------------------------ |
| **类型安全**     | 在编译时捕获潜在错误，减少运行时异常       |
| **智能提示**     | IDE 可以提供更好的代码补全和导航功能       |
| **代码可维护性** | 类型定义即文档，便于团队协作和代码维护     |
| **重构信心**     | 修改代码时编译器会帮助检查所有受影响的地方 |
| **接口契约**     | 明确定义组件之间的数据传递格式             |

## 推荐配置

### 基础 tsconfig.json 配置

```json
{
  "compilerOptions": {
    "target": "es5",
    "strict": true,
    "module": "es2015",
    "moduleResolution": "node",
    "jsx": "preserve",
    "jsxFactory": "h",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    },
    "lib": ["esnext", "dom", "dom.iterable", "scripthost"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue", "tests/**/*.ts", "tests/**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### 配置参数详解

| 参数                           | 值         | 说明                                      |
| ------------------------------ | ---------- | ----------------------------------------- |
| `target`                       | `es5`      | 编译目标版本，与 Vue 的浏览器支持保持一致 |
| `strict`                       | `true`     | 启用所有严格类型检查选项                  |
| `module`                       | `es2015`   | 生成模块代码方式，支持 tree-shaking       |
| `moduleResolution`             | `node`     | 模块解析策略                              |
| `jsx`                          | `preserve` | JSX 代码生成方式                          |
| `allowSyntheticDefaultImports` | `true`     | 允许从没有默认导出的模块中导入            |
| `esModuleInterop`              | `true`     | 启用 CommonJS/AMD 模块互操作性            |
| `sourceMap`                    | `true`     | 生成对应的 sourceMap 文件                 |
| `baseUrl`                      | `.`        | 模块解析的基础路径                        |
| `paths`                        | -          | 路径别名映射                              |

::: warning 重要提示
需要引入 `strict: true` (或者至少 `noImplicitThis: true`，这是 `strict` 模式的一部分) 以利用组件方法中 `this` 的类型检查，否则它会始终被看作 `any` 类型。
:::

## 开发工具链

### 使用 Vue CLI 创建项目

[Vue CLI 3](https://github.com/vuejs/vue-cli) 可以使用 TypeScript 生成新工程。创建方式：

```bash
# 1. 如果没有安装 Vue CLI 就先安装
npm install --global @vue/cli

# 2. 创建一个新工程，并选择 "Manually select features (手动选择特性)" 选项
vue create my-project-name
```

创建过程中的选项配置：

```
? Please pick a preset:
  default (babel, eslint)
❯ Manually select features

? Check the features needed for your project:
 ◉ Babel
 ◉ TypeScript
 ◯ Progressive Web App (PWA) Support
 ◯ Router
 ◯ Vuex
 ◯ CSS Pre-processors
 ◉ Linter / Formatter
 ◯ Unit Testing
 ◯ E2E Testing
```

### IDE 推荐配置

#### Visual Studio Code

强烈推荐使用 [Visual Studio Code](https://code.visualstudio.com/)，它为 TypeScript 提供了极好的"开箱即用"支持。

推荐安装的扩展：

| 扩展名称                                                                                                              | 用途                                     |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [Vetur](https://github.com/vuejs/vetur)（已停止维护，存量 Vue 2 项目仍可用）                                       | Vue 单文件组件语法高亮、智能提示、格式化 |
| [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) | Vue 3 + TypeScript 支持                  |

VS Code settings.json 推荐配置：

```json
{
  "vetur.validation.template": true,
  "vetur.validation.script": true,
  "vetur.validation.style": true,
  "vetur.format.defaultFormatter.html": "prettyhtml",
  "vetur.format.defaultFormatter.js": "prettier",
  "vetur.format.defaultFormatter.ts": "prettier"
}
```

#### WebStorm

[WebStorm](https://www.jetbrains.com/webstorm/) 同样为 TypeScript 和 Vue 提供了"开箱即用"的支持，无需额外配置。

## 基本用法

### 使用 Vue.extend 定义组件

要让 TypeScript 正确推断 Vue 组件选项中的类型，需要使用 `Vue.component` 或 `Vue.extend` 定义组件：

```typescript
import Vue from "vue"

const Component = Vue.extend({
  data() {
    return {
      message: "Hello TypeScript!"
    }
  },
  methods: {
    greet(): string {
      return this.message
    }
  }
})
```

::: warning 注意
直接使用对象字面量定义组件不会获得类型推断：

```typescript
const Component = {
  data() {
    return {
      message: "Hello"
    }
  }
}
```

TypeScript 无法确认这是 Vue 组件的选项，因此不会有类型推断。
:::

### 完整组件示例

```typescript
import Vue from "vue"

interface User {
  id: number
  name: string
  email: string
}

export default Vue.extend({
  name: "UserList",

  data() {
    return {
      users: [] as User[],
      loading: false as boolean,
      error: null as string | null
    }
  },

  computed: {
    userCount(): number {
      return this.users.length
    },
    hasError(): boolean {
      return this.error !== null
    }
  },

  methods: {
    async fetchUsers(): Promise<void> {
      this.loading = true
      this.error = null
      try {
        const response = await fetch("/api/users")
        this.users = await response.json()
      } catch (e) {
        this.error = "Failed to fetch users"
      } finally {
        this.loading = false
      }
    },

    getUserById(id: number): User | undefined {
      return this.users.find((user) => user.id === id)
    }
  },

  mounted() {
    this.fetchUsers()
  }
})
```

## 基于类的 Vue 组件

### 使用 vue-class-component

如果在声明组件时更喜欢基于类的 API，可以使用官方维护的 [vue-class-component](https://github.com/vuejs/vue-class-component) 装饰器。

#### 安装

```bash
npm install vue-class-component
# 或
yarn add vue-class-component
```

#### 基本用法

```typescript
import Vue from "vue"
import Component from "vue-class-component"

@Component({
  template: '<button @click="onClick">Click!</button>'
})
export default class MyComponent extends Vue {
  message: string = "Hello!"

  onClick(): void {
    window.alert(this.message)
  }
}
```

### 使用 vue-property-decorator

[vue-property-decorator](https://github.com/kaorun343/vue-property-decorator) 在 vue-class-component 基础上提供了更多装饰器。

#### 安装

```bash
npm install vue-property-decorator
# 或
yarn add vue-property-decorator
```

#### 完整示例

```typescript
import { Vue, Component, Prop, Emit, Watch, Ref } from "vue-property-decorator"

interface TodoItem {
  id: number
  title: string
  completed: boolean
}

@Component
export default class TodoList extends Vue {
  @Prop({ type: String, required: true })
  title!: string

  @Prop({ type: Array, default: () => [] })
  todos!: TodoItem[]

  @Ref("inputField")
  readonly inputRef!: HTMLInputElement

  newTodoText: string = ""

  get incompleteCount(): number {
    return this.todos.filter((todo) => !todo.completed).length
  }

  @Watch("todos", { deep: true })
  onTodosChanged(val: TodoItem[], oldVal: TodoItem[]): void {
    console.log("Todos changed:", val.length)
  }

  @Emit("add")
  addTodo(): TodoItem | null {
    if (!this.newTodoText.trim()) return null

    const newTodo: TodoItem = {
      id: Date.now(),
      title: this.newTodoText,
      completed: false
    }

    this.newTodoText = ""
    return newTodo
  }

  @Emit("toggle")
  toggleTodo(todo: TodoItem): TodoItem {
    return { ...todo, completed: !todo.completed }
  }

  mounted(): void {
    this.inputRef.focus()
  }
}
```

### 装饰器说明

| 装饰器                 | 用途            | 示例                                                        |
| ---------------------- | --------------- | ----------------------------------------------------------- |
| `@Component`           | 定义组件        | `@Component({ template: '...' })`                           |
| `@Prop`                | 声明 props      | `@Prop({ type: String }) name!: string`                     |
| `@PropSync`            | 双向绑定的 prop | `@PropSync('value', { type: String }) syncedValue!: string` |
| `@Model`               | 自定义 v-model  | `@Model('change', { type: Boolean }) checked!: boolean`     |
| `@Watch`               | 监听数据变化    | `@Watch('value') onValueChanged(val: string) {}`            |
| `@Emit`                | 触发事件        | `@Emit('submit') submit() { return this.form }`             |
| `@Ref`                 | 模板引用        | `@Ref('input') inputRef!: HTMLInputElement`                 |
| `@Provide` / `@Inject` | 依赖注入        | `@Provide() foo = 'bar'`                                    |

### 装饰器实现原理

`vue-class-component` 通过装饰器将 ES6 类语法转换为 Vue 2 的 Options API：

**核心转换流程：**

```javascript
// @Component 装饰器的内部实现（简化）
function Component(options) {
  return function (Target) {
    // 1. 从类原型提取 methods
    const methods = {}
    Object.getOwnPropertyNames(Target.prototype).forEach(key => {
      if (key !== 'constructor') {
        methods[key] = Target.prototype[key]
      }
    })

    // 2. 从类实例提取 data（通过 new 实例化获取初始值）
    const instance = new Target()
    const data = {}
    Object.keys(instance).forEach(key => {
      data[key] = instance[key]
    })

    // 3. 合并装饰器选项（@Prop、@Watch 等通过 Reflect.metadata 存储）
    // @Prop 装饰器 → 收集到 props 数组
    // @Watch 装饰器 → 收集到 watch 对象

    // 4. 返回 Vue 组件选项对象
    return {
      ...options,        // @Component 传入的选项
      data() { return data },
      methods,
      // props、watch 等从装饰器元数据中收集
    }
  }
}
```

> **关键**：`@Component` 类本质上是一个语法糖，最终仍然转换为 Vue 2 的 Options API 对象。这意味着所有 Vue 2 的响应式原理、生命周期、依赖追踪完全不变——类型装饰器只是在编译/运行时做了转换。

## 增强类型以配合插件使用

插件可以增加 Vue 的全局/实例 property 和组件选项。在这些情况下，在 TypeScript 中制作插件需要类型声明。庆幸的是，TypeScript 有一个特性来补充现有的类型，叫做[模块补充 (module augmentation)](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation)。

### 添加实例属性

例如声明一个 `string` 类型的实例 property `$myProperty`：

```typescript
import Vue from "vue"

declare module "vue/types/vue" {
  interface Vue {
    $myProperty: string
  }
}
```

在项目中包含了上述作为声明文件的代码之后 (像 `my-property.d.ts`)，你就可以在 Vue 实例上使用 `$myProperty` 了。

```typescript
var vm = new Vue()
console.log(vm.$myProperty)
```

### 添加全局属性和组件选项

```typescript
import Vue from "vue"

declare module "vue/types/vue" {
  interface VueConstructor {
    $myGlobal: string
  }
}

declare module "vue/types/options" {
  interface ComponentOptions<V extends Vue> {
    myOption?: string
  }
}
```

上述的声明允许下面的代码顺利编译通过：

```typescript
console.log(Vue.$myGlobal)

var vm = new Vue({
  myOption: "Hello"
})
```

### 实际案例：为自定义插件添加类型

```typescript
import Vue from "vue"

declare module "vue/types/vue" {
  interface Vue {
    $http: {
      get<T>(url: string): Promise<T>
      post<T>(url: string, data: unknown): Promise<T>
      put<T>(url: string, data: unknown): Promise<T>
      delete<T>(url: string): Promise<T>
    }

    $notify: {
      success(message: string): void
      error(message: string): void
      warning(message: string): void
      info(message: string): void
    }
  }
}
```

## 标注返回值

因为 Vue 的声明文件天生就具有循环性，TypeScript 可能在推断某个方法的类型的时候存在困难。因此可能需要在 `render` 或 `computed` 里的方法上标注返回值。

```typescript
import Vue, { VNode } from "vue"

const Component = Vue.extend({
  data() {
    return {
      msg: "Hello"
    }
  },
  methods: {
    greet(): string {
      return this.msg + " world"
    }
  },
  computed: {
    greeting(): string {
      return this.greet() + "!"
    }
  },
  render(createElement): VNode {
    return createElement("div", this.greeting)
  }
})
```

::: tip 提示
如果发现类型推导或成员补齐不工作了，标注某个方法也许可以帮助你解决这个问题。使用 `--noImplicitAny` 选项将会帮助你找到这些未标注的方法。
:::

## 标注 Prop

### 基本用法

```typescript
import Vue, { PropType } from "vue"

interface ComplexMessage {
  title: string
  okMessage: string
  cancelMessage: string
}

const Component = Vue.extend({
  props: {
    name: String,
    success: { type: String },
    callback: {
      type: Function as PropType<() => void>
    },
    message: {
      type: Object as PropType<ComplexMessage>,
      required: true,
      validator(message: ComplexMessage) {
        return !!message.title
      }
    }
  }
})
```

### 完整的 Prop 类型定义示例

```typescript
import Vue, { PropType } from "vue"

interface User {
  id: number
  name: string
  avatar?: string
}

type Status = "active" | "inactive" | "pending"

export default Vue.extend({
  props: {
    user: {
      type: Object as PropType<User>,
      required: true
    },

    users: {
      type: Array as PropType<User[]>,
      default: () => []
    },

    status: {
      type: String as PropType<Status>,
      default: "active",
      validator(value: Status): boolean {
        return ["active", "inactive", "pending"].includes(value)
      }
    },

    callback: {
      type: Function as PropType<(user: User) => void>,
      required: true
    },

    asyncCallback: {
      type: Function as PropType<(id: number) => Promise<User>>
    },

    config: {
      type: Object as PropType<{
        apiUrl: string
        timeout: number
        headers: Record<string, string>
      }>,
      default: () => ({
        apiUrl: "/api",
        timeout: 5000,
        headers: {}
      })
    }
  },

  methods: {
    handleClick(): void {
      this.callback(this.user)
    }
  }
})
```

### 常用 PropType 工具类型

```typescript
import { PropType } from "vue"

type ArrayProp<T> = PropType<T[]>
type ObjectProp<T> = PropType<T>
type FunctionProp<T extends (...args: any[]) => any> = PropType<T>
type UnionProp<T> = PropType<T>
```

## 在单文件组件中使用 TypeScript

### 基本 SFC 结构

```vue
<template>
  <div class="user-card">
    <h2>{{ user.name }}</h2>
    <p>{{ user.email }}</p>
    <button @click="handleClick">Edit</button>
  </div>
</template>

<script lang="ts">
  import Vue, { PropType } from "vue"

  interface User {
    id: number
    name: string
    email: string
  }

  export default Vue.extend({
    name: "UserCard",

    props: {
      user: {
        type: Object as PropType<User>,
        required: true
      }
    },

    methods: {
      handleClick(): void {
        this.$emit("edit", this.user.id)
      }
    }
  })
</script>

<style scoped>
  .user-card {
    padding: 16px;
    border: 1px solid #ddd;
    border-radius: 8px;
  }
</style>
```

### 使用 vue-property-decorator 的 SFC

```vue
<template>
  <div class="todo-item">
    <input type="checkbox" :checked="completed" @change="toggle" />
    <span :class="{ completed }">{{ text }}</span>
    <button @click="remove">×</button>
  </div>
</template>

<script lang="ts">
  import { Vue, Component, Prop, Emit } from "vue-property-decorator"

  @Component
  export default class TodoItem extends Vue {
    @Prop({ type: Number, required: true })
    id!: number

    @Prop({ type: String, required: true })
    text!: string

    @Prop({ type: Boolean, default: false })
    completed!: boolean

    @Emit("toggle")
    toggle(): number {
      return this.id
    }

    @Emit("remove")
    remove(): number {
      return this.id
    }
  }
</script>

<style scoped>
  .completed {
    text-decoration: line-through;
    color: #999;
  }
</style>
```

## Vuex 与 TypeScript

### 定义类型化的 Store

```typescript
import Vue from "vue"
import Vuex, { Store, ActionContext } from "vuex"

Vue.use(Vuex)

interface State {
  count: number
  user: {
    id: number
    name: string
  } | null
}

interface RootState {
  moduleA: State
}

const moduleA = {
  namespaced: true,

  state: (): State => ({
    count: 0,
    user: null
  }),

  getters: {
    doubleCount(state: State): number {
      return state.count * 2
    },

    isLoggedIn(state: State): boolean {
      return state.user !== null
    }
  },

  mutations: {
    increment(state: State): void {
      state.count++
    },

    setUser(state: State, user: State["user"]): void {
      state.user = user
    }
  },

  actions: {
    async fetchUser(context: ActionContext<State, RootState>, userId: number): Promise<void> {
      const response = await fetch(`/api/users/${userId}`)
      const user = await response.json()
      context.commit("setUser", user)
    }
  }
}

const store = new Vuex.Store({
  modules: {
    moduleA
  }
})

export default store
```

### 在组件中使用类型化的 Store

```typescript
import Vue from "vue"
import { mapState, mapGetters, mapActions } from "vuex"

export default Vue.extend({
  computed: {
    ...mapState("moduleA", {
      count: (state) => state.count,
      user: (state) => state.user
    }),
    ...mapGetters("moduleA", ["doubleCount", "isLoggedIn"] as const)
  },

  methods: {
    ...mapActions("moduleA", ["fetchUser"] as const),

    async loadUser(): Promise<void> {
      await this.fetchUser(1)
    }
  }
})
```

## 最佳实践

### 1. 始终使用 Vue.extend 或 vue-class-component

```typescript
import Vue from "vue"

export default Vue.extend({})
```

### 2. 为复杂的数据结构定义接口

```typescript
interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

interface User {
  id: number
  name: string
  email: string
  role: "admin" | "user" | "guest"
}
```

### 3. 使用类型断言处理 Prop

```typescript
props: {
  items: {
    type: Array as PropType<User[]>,
    default: () => []
  }
}
```

### 4. 避免使用 any，使用 unknown 替代

```typescript
async fetchData(): Promise<void> {
  try {
    const response = await fetch('/api/data')
    const data: unknown = await response.json()

    if (this.isValidData(data)) {
      this.data = data
    }
  } catch (error) {
    console.error('Fetch failed:', error)
  }
}

isValidData(data: unknown): data is User[] {
  return Array.isArray(data) &&
    data.every(item =>
      typeof item.id === 'number' &&
      typeof item.name === 'string'
    )
}
```

### 5. 组织类型定义文件

推荐的项目结构：

```
src/
├── types/
│   ├── index.ts
│   ├── api.ts
│   ├── models/
│   │   ├── user.ts
│   │   └── product.ts
│   └── vue-shim.d.ts
├── components/
│   └── ...
└── store/
    └── ...
```

### 6. 使用工具类型简化代码

> 提示：以下工具类型自 TypeScript 2.8/3.5 起已内建于标准库（`Readonly`/`Partial`/`Pick`/`Omit`），可直接使用，无需自行定义；此处列出仅供理解其实现原理。

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P]
}

type Partial<T> = {
  [P in keyof T]?: T[P]
}

type Pick<T, K extends keyof T> = {
  [P in K]: T[P]
}

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>
```

## 常见问题解答

### Q1: 为什么我的组件没有类型提示？

**A:** 确保使用 `Vue.extend()` 或 `vue-class-component` 定义组件，而不是普通对象。同时检查 `tsconfig.json` 中是否启用了 `strict` 模式。

### Q2: 如何为 .vue 文件添加类型声明？

**A:** 创建 `vue-shim.d.ts` 文件：

```typescript
declare module "*.vue" {
  import Vue from "vue"
  export default Vue
}
```

### Q3: 如何处理第三方库没有类型定义的情况？

**A:** 在项目根目录创建 `declarations.d.ts`：

```typescript
declare module "some-library"
```

或者创建更详细的类型定义：

```typescript
declare module "some-library" {
  export function someFunction(param: string): number
  export const someConstant: string
}
```

### Q4: computed 属性的类型推断不正确怎么办？

**A:** 显式标注返回值类型：

```typescript
computed: {
  fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }
}
```

### Q5: 如何在 TypeScript 中使用 mixin？

**A:** 使用 `extends` 选项或创建可复用的 mixin 函数：

```typescript
const myMixin = Vue.extend({
  data() {
    return {
      mixinData: "from mixin"
    }
  },
  methods: {
    mixinMethod(): string {
      return this.mixinData
    }
  }
})

export default Vue.extend({
  extends: myMixin,

  mounted() {
    console.log(this.mixinMethod())
  }
})
```

### Q6: 如何解决 "Property 'xxx' does not exist on type 'Vue'" 错误？

**A:** 这个错误通常发生在访问自定义属性时。需要通过模块补充来扩展 Vue 类型：

```typescript
declare module "vue/types/vue" {
  interface Vue {
    $customProperty: string
  }
}
```

### Q7: Vue 2 的 TypeScript 支持和 Vue 3 有什么区别？

**A:** 主要区别如下：

| 特性       | Vue 2                      | Vue 3                              |
| ---------- | -------------------------- | ---------------------------------- |
| 类型推断   | 需要 `Vue.extend` 或装饰器 | 原生支持，更完善                   |
| 组件定义   | Options API                | Composition API + `<script setup>` |
| 响应式类型 | 基于对象                   | 基于 Proxy，类型更精确             |
| 官方推荐   | vue-class-component        | 无需额外库                         |
