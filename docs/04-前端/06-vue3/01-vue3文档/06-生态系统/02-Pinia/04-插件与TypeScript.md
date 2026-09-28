---
title: 插件与TypeScript
description: "Pinia 插件与 TypeScript：PiniaPluginContext 与插件生命周期、持久化/日志/防抖等常见插件模式、declare module 类型扩展与泛型 Store 工厂实践。"
keywords: [Pinia, 插件, TypeScript, PiniaPluginContext]
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 插件

> Pinia 插件用于扩展 Store 功能，可以添加全局属性、响应状态变化、实现持久化等。

---

## 插件基础

### 插件的作用

- 为每个 Store 添加全局属性或方法
- 响应 Store 的状态变化
- 实现 State 持久化
- 添加日志和调试功能
- 集成第三方服务

### 插件生命周期

```
Pinia 插件执行流程
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│  app.use(createPinia())                                      │
│           │                                                   │
│           ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              注册插件 pinia.use(plugin)              │    │
│  └─────────────────────┬───────────────────────────────┘    │
│                        │                                     │
│                        ▼                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         调用 useStore() 创建 Store 实例              │    │
│  └─────────────────────┬───────────────────────────────┘    │
│                        │                                     │
│                        ▼                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │        遍历执行所有插件，传入 Store 上下文           │    │
│  │  plugin({ pinia, app, store, options })             │    │
│  └─────────────────────┬───────────────────────────────┘    │
│                        │                                     │
│                        ▼                                     │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Store 初始化完成，返回实例              │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 创建插件

### 基本结构

```ts
// plugins/myPlugin.ts
import type { PiniaPluginContext } from 'pinia'

function myPlugin(context: PiniaPluginContext) {
  const { pinia, app, store, options } = context
  
  // pinia - Pinia 实例
  // app - Vue 应用实例（通过 app.use(pinia) 传入）
  // store - 当前 Store 实例
  // options - defineStore 的第二个参数
}

// 注册插件
const pinia = createPinia()
pinia.use(myPlugin)
```

### 简单示例

```ts
// plugins/logger.ts
import type { PiniaPluginContext } from 'pinia'

function loggerPlugin({ store }: PiniaPluginContext) {
  // Store 创建时打印日志
  console.log(`[Pinia] Store "${store.$id}" created`)
  
  // 订阅状态变化
  store.$subscribe((mutation, state) => {
    console.log(`[Pinia] ${store.$id} changed:`, {
      type: mutation.type,
      payload: mutation.payload
    })
  })
  
  // 订阅 action 调用
  store.$onAction(({ name, args, after, onError }) => {
    console.log(`[Pinia] ${store.$id}.${name} called with:`, args)
    
    after((result) => {
      console.log(`[Pinia] ${store.$id}.${name} finished:`, result)
    })
    
    onError((error) => {
      console.error(`[Pinia] ${store.$id}.${name} failed:`, error)
    })
  })
}

export default loggerPlugin
```

---

## 插件参数详解

### PiniaPluginContext 接口

```ts
interface PiniaPluginContext {
  pinia: Pinia           // Pinia 实例
  app: App               // Vue 应用实例
  store: Store           // 当前 Store 实例
  options: DefineStoreOptions  // defineStore 的选项
}
```

### 使用各个参数

```ts
import type { PiniaPluginContext } from 'pinia'

function myPlugin({ pinia, app, store, options }: PiniaPluginContext) {
  // ==================== pinia ====================
  // 访问所有已注册的 Store
  console.log('All stores:', pinia._s)
  
  // ==================== app ====================
  // 访问 Vue 应用配置
  console.log('App config:', app.config)
  
  // 访问全局属性
  const router = app.config.globalProperties.$router
  
  // ==================== store ====================
  // 访问 Store ID
  console.log('Store ID:', store.$id)
  
  // 访问 Store 状态
  console.log('Store state:', store.$state)
  
  // ==================== options ====================
  // 访问自定义选项
  // 在 defineStore 中定义的自定义选项
  if (options.persist) {
    // 启用持久化
  }
}

// 使用自定义选项
export const useCounterStore = defineStore('counter', {
  state: () => ({ count: 0 }),
  // 自定义选项
  persist: true,
  debounce: 500
} as any)
```

---

## 常见插件模式

### 1. 添加全局属性

```ts
// plugins/globalProperties.ts
import type { PiniaPluginContext } from 'pinia'

function globalPropertiesPlugin({ store }: PiniaPluginContext) {
  // 添加只读属性
  store.createdAt = new Date()
  
  // 添加方法
  store.$log = function(message: string) {
    console.log(`[${store.$id}] ${message}`)
  }
  
  // 添加响应式属性
  store.lastUpdated = ref<Date | null>(null)
}

// 使用
const counter = useCounterStore()
counter.$log('Hello')
console.log(counter.createdAt)
```

### 2. 状态持久化插件

```ts
// plugins/persist.ts
import type { PiniaPluginContext } from 'pinia'

interface PersistOptions {
  key?: string           // 存储 key
  storage?: Storage      // 存储介质
  paths?: string[]       // 指定持久化的字段
}

declare module 'pinia' {
  export interface DefineStoreOptions {
    persist?: boolean | PersistOptions
  }
}

function persistPlugin({ store, options }: PiniaPluginContext) {
  // 检查是否启用持久化
  if (!options.persist) return
  
  // 解析选项
  const persistOptions: PersistOptions = 
    typeof options.persist === 'boolean' 
      ? {} 
      : options.persist
  
  const {
    key = store.$id,
    storage = localStorage,
    paths
  } = persistOptions
  
  // 初始化时恢复状态
  const saved = storage.getItem(key)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      store.$patch(parsed)
    } catch (e) {
      console.error(`Failed to parse persisted state for "${key}"`)
    }
  }
  
  // 订阅变化并保存
  store.$subscribe((mutation, state) => {
    let stateToPersist = { ...state }
    
    // 只保存指定路径
    if (paths) {
      stateToPersist = paths.reduce((obj, path) => {
        const keys = path.split('.')
        let value = state
        let target = obj
        
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i]
          if (i === keys.length - 1) {
            target[key] = value[key]
          } else {
            target[key] = target[key] || {}
            target = target[key]
            value = value[key]
          }
        }
        
        return obj
      }, {} as any)
    }
    
    storage.setItem(key, JSON.stringify(stateToPersist))
  })
}

export default persistPlugin
```

### 3. 防抖插件

```ts
// plugins/debounce.ts
import type { PiniaPluginContext } from 'pinia'
import { debounce } from 'lodash-es'

interface DebounceOptions {
  actions?: Record<string, number>  // action 名称 -> 延迟时间
  default?: number                  // 默认延迟时间
}

declare module 'pinia' {
  export interface DefineStoreOptions {
    debounce?: DebounceOptions
  }
}

function debouncePlugin({ store, options }: PiniaPluginContext) {
  if (!options.debounce) return
  
  const { actions = {}, default: defaultDelay = 0 } = options.debounce
  
  Object.keys(actions).forEach(actionName => {
    const delay = actions[actionName]
    const originalAction = store[actionName]
    
    if (typeof originalAction === 'function') {
      store[actionName] = debounce(originalAction.bind(store), delay)
    }
  })
}

export default debouncePlugin
```

### 4. 重置插件

```ts
// plugins/reset.ts
import type { PiniaPluginContext } from 'pinia'

function resetPlugin({ store }: PiniaPluginContext) {
  // 为 Setup Store 添加 $reset 方法
  // Option Store 已有内置 $reset
  
  // 保存初始状态
  const initialState = JSON.parse(JSON.stringify(store.$state))
  
  // 添加 $reset 方法（如果不存在）
  if (!store.$reset) {
    store.$reset = function() {
      store.$patch(JSON.parse(JSON.stringify(initialState)))
    }
  }
  
  // 添加 $resetTo 方法：重置到指定状态
  store.$resetTo = function(newState: Partial<typeof store.$state>) {
    store.$patch(newState)
  }
}

export default resetPlugin
```

### 5. 状态快照插件

```ts
// plugins/snapshot.ts
import type { PiniaPluginContext } from 'pinia'

function snapshotPlugin({ store }: PiniaPluginContext) {
  const snapshots: Array<{
    state: any
    timestamp: number
    action?: string
  }> = []
  
  // 保存初始状态
  snapshots.push({
    state: JSON.parse(JSON.stringify(store.$state)),
    timestamp: Date.now()
  })
  
  // 监听 action 完成后保存快照
  store.$onAction(({ name, after }) => {
    after(() => {
      snapshots.push({
        state: JSON.parse(JSON.stringify(store.$state)),
        timestamp: Date.now(),
        action: name
      })
    })
  })
  
  // 添加快照方法
  store.$getSnapshots = () => [...snapshots]
  
  store.$restoreSnapshot = (index: number) => {
    const snapshot = snapshots[index]
    if (snapshot) {
      store.$patch(snapshot.state)
    }
  }
  
  store.$undo = () => {
    if (snapshots.length > 1) {
      snapshots.pop()  // 移除当前状态
      const previous = snapshots[snapshots.length - 1]
      store.$patch(previous.state)
    }
  }
}

export default snapshotPlugin
```

---

## 注册插件

### 在 main.ts 中注册

```ts
// main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// 导入插件
import loggerPlugin from './plugins/logger'
import persistPlugin from './plugins/persist'
import debouncePlugin from './plugins/debounce'

const app = createApp(App)

// 创建 Pinia 实例
const pinia = createPinia()

// 注册插件
pinia.use(loggerPlugin)
pinia.use(persistPlugin)
pinia.use(debouncePlugin)

// 注册到应用
app.use(pinia)
app.mount('#app')
```

### 使用第三方插件

```bash
# 安装持久化插件
npm install pinia-plugin-persistedstate
```

```ts
// main.ts
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

// 在 Store 中使用
export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: null
  }),
  persist: true  // 或配置对象
})
```

---

## 插件配置选项

### 在 Store 中配置

```ts
// 定义自定义选项类型
declare module 'pinia' {
  export interface DefineStoreOptions {
    // 持久化选项
    persist?: boolean | {
      key?: string
      storage?: Storage
      paths?: string[]
    }
    
    // 防抖选项
    debounce?: {
      actions: Record<string, number>
      default?: number
    }
    
    // 重置选项
    reset?: boolean
  }
}

// 使用配置
export const useUserStore = defineStore('user', {
  state: () => ({
    user: null,
    token: null,
    preferences: {
      theme: 'light',
      language: 'zh-CN'
    }
  }),
  
  // 持久化配置
  persist: {
    key: 'my-app-user',
    storage: sessionStorage,
    paths: ['token', 'preferences']  // 只持久化这些字段
  },
  
  // 防抖配置
  debounce: {
    actions: {
      updateUser: 300,
      savePreferences: 500
    }
  }
})
```

---

## 完整示例

### 综合插件系统

```ts
// plugins/index.ts
import type { PiniaPluginContext } from 'pinia'
import type { Pinia } from 'pinia'

// ==================== 类型定义 ====================
declare module 'pinia' {
  export interface DefineStoreOptions {
    persist?: boolean | PersistConfig
    logger?: boolean | LoggerConfig
    reset?: boolean
  }
}

interface PersistConfig {
  key?: string
  storage?: Storage
  paths?: string[]
  beforeRestore?: (context: PiniaPluginContext) => void
  afterRestore?: (context: PiniaPluginContext) => void
}

interface LoggerConfig {
  collapsed?: boolean
  timestamp?: boolean
  actions?: boolean
  state?: boolean
}

// ==================== 持久化插件 ====================
function createPersistPlugin() {
  return ({ store, options }: PiniaPluginContext) => {
    if (!options.persist) return
    
    const config: PersistConfig = 
      typeof options.persist === 'boolean' ? {} : options.persist
    
    const {
      key = store.$id,
      storage = localStorage,
      paths,
      beforeRestore,
      afterRestore
    } = config
    
    // 恢复前回调
    beforeRestore?.({ store, options } as any)
    
    // 恢复状态
    const saved = storage.getItem(key)
    if (saved) {
      try {
        store.$patch(JSON.parse(saved))
      } catch (e) {
        console.error(`[Persist] Failed to restore "${key}":`, e)
      }
    }
    
    // 恢复后回调
    afterRestore?.({ store, options } as any)
    
    // 监听变化
    store.$subscribe((mutation, state) => {
      try {
        const stateToSave = paths
          ? pick(state, paths)
          : state
        
        storage.setItem(key, JSON.stringify(stateToSave))
      } catch (e) {
        console.error(`[Persist] Failed to save "${key}":`, e)
      }
    })
  }
}

// ==================== 日志插件 ====================
function createLoggerPlugin() {
  return ({ store, options }: PiniaPluginContext) => {
    if (!options.logger) return
    
    const config: LoggerConfig = 
      typeof options.logger === 'boolean' ? {} : options.logger
    
    const {
      collapsed = true,
      timestamp = true,
      actions = true,
      state = true
    } = config
    
    const groupMethod = collapsed ? 'groupCollapsed' : 'group'
    
    // 记录状态变化
    if (state) {
      store.$subscribe((mutation, state) => {
        const time = timestamp ? ` @ ${new Date().toLocaleTimeString()}` : ''
        
        console[groupMethod](`[Pinia%20State]%20${store.$id}${time}`)
        console.log('Type:', mutation.type)
        console.log('Payload:', mutation.payload)
        console.log('State:', state)
        console.groupEnd()
      })
    }
    
    // 记录 action 调用
    if (actions) {
      store.$onAction(({ name, args, after, onError }) => {
        const time = timestamp ? ` @ ${new Date().toLocaleTimeString()}` : ''
        
        console[groupMethod](`[Pinia%20Action]%20${store.$id}.${name}${time}`)
        console.log('Args:', args)
        
        after((result) => {
          console.log('Result:', result)
          console.groupEnd()
        })
        
        onError((error) => {
          console.error('Error:', error)
          console.groupEnd()
        })
      })
    }
  }
}

// ==================== 重置插件 ====================
function createResetPlugin() {
  return ({ store, options }: PiniaPluginContext) => {
    if (options.reset === false) return
    
    // 保存初始状态
    const initialState = JSON.parse(JSON.stringify(store.$state))
    
    // 为 Setup Store 添加 $reset
    if (!store.$reset) {
      store.$reset = () => {
        store.$patch(JSON.parse(JSON.stringify(initialState)))
      }
    }
  }
}

// ==================== 辅助函数 ====================
function pick(obj: any, paths: string[]) {
  return paths.reduce((result, path) => {
    const keys = path.split('.')
    let source = obj
    let target = result
    
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (source[key] !== undefined) {
        if (i === keys.length - 1) {
          target[key] = source[key]
        } else {
          target[key] = target[key] || {}
          target = target[key]
          source = source[key]
        }
      }
    }
    
    return result
  }, {} as any)
}

// ==================== 导出 ====================
export function setupPiniaPlugins(pinia: Pinia) {
  pinia.use(createPersistPlugin())
  pinia.use(createLoggerPlugin())
  pinia.use(createResetPlugin())
  
  return pinia
}

// 使用
// main.ts
import { createPinia } from 'pinia'
import { setupPiniaPlugins } from './plugins'

const pinia = setupPiniaPlugins(createPinia())
app.use(pinia)
```

---

## 常见问题

### 1. 插件执行顺序

```ts
// 插件按注册顺序执行
pinia.use(pluginA)  // 先执行
pinia.use(pluginB)  // 后执行

// 建议：依赖其他插件功能的插件后注册
pinia.use(basePlugin)
pinia.use(dependentPlugin)
```

### 2. TypeScript 类型扩展

```ts
// 扩展 Store 类型
declare module 'pinia' {
  export interface PiniaCustomProperties {
    // 添加的全局属性类型
    $log: (message: string) => void
    $reset: () => void
  }
  
  export interface DefineStoreOptions {
    // 自定义选项类型
    persist?: boolean | PersistConfig
  }
}
```

### 3. 插件热更新

```ts
// vite.config.ts
export default defineConfig({
  plugins: [
    // ...
  ]
})

// 开发模式下插件会自动重新加载
// 但状态可能会丢失，注意保存重要数据
```

---

## API 参考

### 插件相关 API

| API | 说明 |
|-----|------|
| `pinia.use(plugin)` | 注册插件 |
| `store.$subscribe` | 订阅状态变化 |
| `store.$onAction` | 订阅 action 调用 |
| `store.$patch` | 批量更新状态 |

### PiniaPluginContext

| 属性 | 类型 | 说明 |
|------|------|------|
| `pinia` | `Pinia` | Pinia 实例 |
| `app` | `App` | Vue 应用实例 |
| `store` | `Store` | 当前 Store |
| `options` | `DefineStoreOptions` | Store 选项 |

---

> 以下为深度补充内容，涵盖源码分析、TypeScript 高级技巧和生产级实践。

---

## 插件系统架构解析

### pinia.use() 的简化实现原理

Pinia 的插件系统本质是一个订阅-执行模式。`pinia.use()` 将插件函数注册到一个内部数组，每当 Store 被实例化时，所有插件按注册顺序依次执行。

```ts
// ─── Pinia 内部简化源码：插件管线 ───
// 源码位置: packages/pinia/src/rootStore.ts

import { ref, type App, type Ref } from 'vue'

// 插件函数的类型签名
type PiniaPlugin = (context: PiniaPluginContext) => void | Partial<PiniaPluginContext['store']>

interface PiniaPluginContext {
  pinia: Pinia
  app: App
  store: Store
  options: DefineStoreOptions<string, any, any, any>
}

class Pinia {
  // __pl 是"plugins"的缩写，内部属性名
  _pl: PiniaPlugin[] = []

  // 注册插件的入口方法
  use(plugin: PiniaPlugin): this {
    this._pl.push(plugin)
    return this  // 链式调用支持
  }

  // Store 实例化时被调用（简化）
  _i(
    id: string,
    store: Store,
    options: DefineStoreOptions<any, any, any, any>,
    app: App
  ): void {
    // 1. 遍历所有已注册的插件
    for (const plugin of this._pl) {
      // 2. 构造插件上下文对象
      const context: PiniaPluginContext = {
        pinia: this,
        app,
        store,
        options,
      }

      // 3. 执行插件，收集返回值
      const result = plugin(context)

      // 4. 如果插件返回了对象，将其属性合并到 Store 上
      if (result) {
        for (const key of Object.keys(result)) {
          // 跳过内部属性（以 $ 或 _ 开头的不允许覆盖）
          if (key.startsWith('$') || key.startsWith('_')) {
            console.warn(`[Pinia] Plugin cannot override internal property: ${key}`)
            continue
          }
          ;(store as any)[key] = result[key]
        }
      }
    }
  }
}
```

### 插件上下文的构造流程

当 `defineStore` 创建的 Store 被首次调用时，Pinia 内部执行以下流程：

```
useStore('myStore') 首次调用
    │
    ├─► createSetupStore(id, setup, options, pinia, app)
    │        │
    │        ├─► 创建空 Store 壳（pinia._s.set(id, store)）
    │        │
    │        ├─► 执行 setup() 获取初始状态和方法
    │        │
    │        ├─► pinia._i(id, store, options, app)  ← 执行插件管线
    │        │       │
    │        │       ├── plugin1(context)
    │        │       ├── plugin2(context)
    │        │       └── pluginN(context)
    │        │
    │        └─► 返回完整的 Store 实例
    │
    └─► 后续调用直接返回 pinia._s.get(id)
```

关键实现细节：

```ts
// 插件上下文构造源码关键路径（简化）
function createSetupStore<
  Id extends string,
  SS extends Record<string, any>,
  S extends StateTree,
  G extends Record<string, any>,
  A extends Record<string, any>,
>(
  $id: Id,
  setup: () => SS,
  options: DefineSetupStoreOptions<Id, S, G, A>,
  pinia: Pinia,
  app: App
): Store<Id, S, G, A> {
  // 初始化 partialStore —— 插件通过闭包引用它
  const partialStore = {
    _customProperties: new Set(),
    $id,
    $onAction: addSubscription.bind(null, actionSubscriptions),
    $patch: patch,
    $reset: undefined as (() => void) | undefined,
    $subscribe: addSubscription.bind(null, subscriptions),
    $dispose: dispose,
  } as unknown as Store<Id, S, G, A>

  // 将 partialStore 写入注册表，插件阶段的 store 就是它
  pinia._s.set($id, partialStore)

  // 运行 setup 函数
  const setupResults = setup()
  // 将 setup 返回值挂载到 partialStore 上
  // ...

  // ★ 插件执行点 —— 此时 store 已经有 setup 产生的属性
  pinia._i($id, partialStore, options, app)

  return partialStore
}
```

### 插件的执行时序

插件的执行顺序严格遵循注册顺序（FIFO），理解时序对插件开发至关重要：

```
时间线 —— Store 实例化全过程：

  T0  定义期: defineStore('cart', () => { ... })
                     │
  T1  注册期: pinia.use(loggerPlugin)        ← _pl = [loggerPlugin]
         pinia.use(persistPlugin)             ← _pl = [loggerPlugin, persistPlugin]
         pinia.use(auditPlugin)               ← _pl = [loggerPlugin, persistPlugin, auditPlugin]
                     │
  T2  首次使用: const cart = useCartStore()
                     │
  T3  Store 壳创建（pinia._s.set('cart', partialStore)）
                     │
  T4  setup() 执行 —— 状态初始化
                     │
  T5  ★ 插件管线执行 ★
         ├── T5.1  loggerPlugin({ pinia, app, store: partialStore, options })
         ├── T5.2  persistPlugin({ pinia, app, store: partialStore, options })
         │         （可以读取到 loggerPlugin 在 store 上新增的属性）
         └── T5.3  auditPlugin({ pinia, app, store: partialStore, options })
                     │
  T6  返回完整 Store 实例
```

### 多插件协作与通信

多个插件之间通过 Store 实例本身共享数据：

```ts
// ─── 共享命名空间: 在 store 下创建 $meta 来传递元数据 ───

// 插件 A: 提供元数据容器
function metaInitPlugin({ store }: PiniaPluginContext) {
  store.$meta = {} as Record<string, any>
}

// 插件 B: 写入元数据
function routeTrackingPlugin({ store, app }: PiniaPluginContext) {
  const router = app.config.globalProperties.$router
  if (router) {
    store.$meta.currentRoute = router.currentRoute.value.path
  }
}

// 插件 C: 读取其他插件写入的元数据
function ssePlugin({ store }: PiniaPluginContext) {
  const route = store.$meta?.currentRoute
  if (route) {
    console.log(`[SSE] Store ${store.$id} created on route: ${route}`)
  }
}

// 注册顺序必须保证依赖方在后
const pinia = createPinia()
pinia.use(metaInitPlugin)     // 先注册，提供 $meta
pinia.use(routeTrackingPlugin) // 写入元数据
pinia.use(ssePlugin)           // 读取元数据（依赖前两个）
app.use(pinia)
```

---

## 生产级插件开发实战

### 1. ORM 风格插件：定义模型关系与查询方法

```ts
// ─── plugins/orm/types.ts ───
// ORM 类型定义

/** 关系类型 */
type RelationType = 'hasOne' | 'hasMany' | 'belongsTo'

/** 关系定义 */
interface RelationDefinition {
  type: RelationType
  /** 关联模型名称 */
  model: string
  /** 外键字段（本地） */
  foreignKey: string
  /** 目标模型的键 */
  localKey?: string
}

/** 模型定义元数据 */
interface ModelMeta {
  name: string
  /** Store 中的集合字段名 */
  collection: string
  /** 主键字段 */
  primaryKey: string
  /** 关系定义映射 */
  relations: Record<string, RelationDefinition>
  /** 查询方法生成器 */
  queries: Record<string, (...args: any[]) => any>
}

// 扩展 Pinia 选项类型
declare module 'pinia' {
  export interface DefineStoreOptions {
    orm?: ModelMeta
  }
}

// 扩展 Store 实例
declare module 'pinia' {
  export interface PiniaCustomProperties {
    $orm: <T extends string>(
      model: T,
    ) => ModelRepository<ExtractModelByName<T>>
  }
}

/** 模型仓库 —— 提供查询 API */
class ModelRepository<T extends Record<string, any>> {
  constructor(
    private store: any,
    private meta: ModelMeta,
  ) {}

  /** 根据主键查找 */
  find(id: string | number): T | null {
    return this.store[this.meta.collection].find(
      (item: T) => item[this.meta.primaryKey] === id,
    ) ?? null
  }

  /** 条件查询 */
  where(predicate: (item: T) => boolean): T[] {
    return this.store[this.meta.collection].filter(predicate)
  }

  /** 获取所有 */
  all(): T[] {
    return this.store[this.meta.collection] as T[]
  }

  /** 关联查询 */
  with<Rel extends string>(
    item: T,
    relation: Rel,
  ): any[] | any | null {
    const def = this.meta.relations[relation]
    if (!def) return null

    const relatedMeta = this.meta // 简化：实际需要跨 Store 查找
    const relatedCollection: any[] = this.store[relatedMeta.collection] ?? []

    switch (def.type) {
      case 'hasMany':
        return relatedCollection.filter(
          (r: any) => r[def.foreignKey] === item[this.meta.primaryKey],
        )
      case 'belongsTo':
        return (
          relatedCollection.find(
            (r: any) => r[def.localKey ?? 'id'] === item[def.foreignKey],
          ) ?? null
        )
      case 'hasOne':
        return (
          relatedCollection.find(
            (r: any) => r[def.foreignKey] === item[this.meta.primaryKey],
          ) ?? null
        )
      default:
        return null
    }
  }
}

// ─── plugins/orm/index.ts ───
export function ormPlugin({ store, options, pinia }: PiniaPluginContext) {
  if (!options.orm) return

  const meta = options.orm as ModelMeta

  // 注入全局访问方法
  if (!pinia._p.some((p: any) => p._ormPlugin)) {
    ;(pinia as any)._ormPlugin = true
    // 后续可以在任何 Store 上通过 pinia 访问注册表
  }

  // 为当前 Store 注入查询方法
  store[`$${meta.name}Repo`] = new ModelRepository(store, meta)
}

// ─── 使用示例 ───
export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([])
  const posts = ref<Post[]>([])

  return { users, posts }
}, {
  orm: {
    name: 'User',
    collection: 'users',
    primaryKey: 'id',
    relations: {
      posts: { type: 'hasMany', model: 'Post', foreignKey: 'userId' },
    },
    queries: {},
  },
} as any)
```

### 2. 中间件模式插件：Action 前后钩子与条件执行

```ts
// ─── plugins/middleware/types.ts ───
interface MiddlewareContext<
  TStore extends Store = Store,
  TArgs extends any[] = any[],
> {
  store: TStore
  actionName: string
  args: TArgs
}

interface MiddlewareNext {
  (): void
}

type Middleware = (
  ctx: MiddlewareContext,
  next: MiddlewareNext,
) => void

interface MiddlewareConfig {
  /** 全局中间件 */
  global?: Middleware[]
  /** 按 Store ID 匹配的中间件 */
  stores?: Record<string, Middleware[]>
  /** 按 Action 名称匹配的中间件 */
  actions?: Record<string, Middleware[]>
}

// ─── plugins/middleware/index.ts ───
export function createMiddlewarePlugin(config: MiddlewareConfig) {
  return ({ store }: PiniaPluginContext) => {
    const { global = [], stores = {}, actions = {} } = config

    // 获取匹配当前 Store 的中间件链
    const matchedMiddlewares: Middleware[] = [
      ...global,
      ...(stores[store.$id] ?? []),
    ]

    // 监听所有 Action
    store.$onAction((actionCtx) => {
      const { name, args: actionArgs, after, onError } = actionCtx

      // 获取匹配当前 Action 的中间件
      const actionMiddlewares = [...matchedMiddlewares, ...(actions[name] ?? [])]

      if (actionMiddlewares.length === 0) return

      // ── 洋葱模型: 构建中间件链 ──
      let index = 0

      function next() {
        if (index >= actionMiddlewares.length) return
        const middleware = actionMiddlewares[index++]
        try {
          middleware(
            { store, actionName: name, args: actionArgs },
            next,
          )
        } catch (err) {
          console.error(
            `[Middleware] Error in "${name}" middleware #${index}:`,
            err,
          )
          throw err
        }
      }

      // 启动中间件链
      next()

      // 注册 after/onError 钩子用于完成通知
      after((result) => {
        // 可以在所有中间件完成后做清理
      })
      onError((error) => {
        // 错误处理
      })
    })
  }
}

// ─── 使用示例：认证中间件 ───
const authMiddleware: Middleware = (ctx, next) => {
  const token = localStorage.getItem('auth_token')
  if (!token) {
    console.warn(`[Auth] Unauthorized action: ${ctx.store.$id}.${ctx.actionName}`)
    return // 阻断执行
  }
  // 验证通过，继续下一个中间件
  next()
}

// ─── 使用示例：日志中间件 ───
const timingMiddleware: Middleware = (ctx, next) => {
  const start = performance.now()
  console.log(`[Timing] → ${ctx.store.$id}.${ctx.actionName} started`)
  next()
  const duration = (performance.now() - start).toFixed(2)
  console.log(`[Timing] ← ${ctx.store.$id}.${ctx.actionName} finished (${duration}ms)`)
}

const pinia = createPinia()
pinia.use(
  createMiddlewarePlugin({
    global: [timingMiddleware],
    stores: {
      admin: [authMiddleware],
    },
  }),
)
```

### 3. 撤销/重做插件（Undo/Redo）

```ts
// ─── plugins/undoRedo/types.ts ───
interface HistoryEntry<S = any> {
  /** 快照 */
  snapshot: S
  /** 时间戳 */
  timestamp: number
  /** 触发动作的名称 */
  action?: string
}

interface UndoRedoState {
  past: HistoryEntry[]
  future: HistoryEntry[]
  current: HistoryEntry | null
  maxHistory: number
}

// ─── plugins/undoRedo/index.ts ───
export function createUndoRedoPlugin(options?: { maxHistory?: number }) {
  const { maxHistory = 50 } = options ?? {}

  return ({ store }: PiniaPluginContext) => {
    let isUndoOrRedo = false

    // 初始化历史状态
    const history: UndoRedoState = {
      past: [],
      future: [],
      current: deepClone(store.$state),
      maxHistory,
    }

    // 保存快照
    function saveSnapshot(actionName?: string) {
      if (isUndoOrRedo) return

      // 将 current 推入 past
      if (history.current) {
        history.past.push(history.current)
        // 限制历史长度
        if (history.past.length > maxHistory) {
          history.past.shift()
        }
      }

      // 清空 future（新操作后无法重做）
      history.future = []

      // 更新 current
      history.current = {
        snapshot: deepClone(store.$state),
        timestamp: Date.now(),
        action: actionName,
      }
    }

    // 注入 undo/redo 方法
    store.$undo = () => {
      if (history.past.length === 0) return false

      isUndoOrRedo = true
      const previous = history.past.pop()!

      // 保存当前到 future
      history.future.push(history.current!)

      // 恢复到上一个快照
      history.current = previous
      store.$patch(deepClone(previous.snapshot))
      isUndoOrRedo = false
      return true
    }

    store.$redo = () => {
      if (history.future.length === 0) return false

      isUndoOrRedo = true
      const next = history.future.pop()!

      // 保存当前到 past
      history.past.push(history.current!)

      // 恢复到下一个快照
      history.current = next
      store.$patch(deepClone(next.snapshot))
      isUndoOrRedo = false
      return true
    }

    store.$getHistory = () => ({
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
      pastCount: history.past.length,
      futureCount: history.future.length,
      past: history.past.map((e) => ({ action: e.action, timestamp: e.timestamp })),
      future: history.future.map((e) => ({ action: e.action, timestamp: e.timestamp })),
    })

    store.$clearHistory = () => {
      history.past = []
      history.future = []
      history.current = {
        snapshot: deepClone(store.$state),
        timestamp: Date.now(),
      }
    }

    // 监听 Action 来自动保存快照
    store.$onAction(({ name, after }) => {
      after(() => {
        saveSnapshot(name)
      })
    })

    // 初始快照
    saveSnapshot('@@INIT')
  }
}

// ─── 辅助函数 ───
function deepClone<T>(obj: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj)
  }
  return JSON.parse(JSON.stringify(obj))
}

// ─── 类型扩展 ───
declare module 'pinia' {
  export interface PiniaCustomProperties {
    $undo?: () => boolean
    $redo?: () => boolean
    $getHistory?: () => {
      canUndo: boolean
      canRedo: boolean
      pastCount: number
      futureCount: number
      past: Array<{ action?: string; timestamp: number }>
      future: Array<{ action?: string; timestamp: number }>
    }
    $clearHistory?: () => void
  }
}
```

### 4. 跨 Tab 状态同步插件（BroadcastChannel + localStorage）

```ts
// ─── plugins/crossTabSync/types.ts ───
interface CrossTabSyncOptions {
  /** 频道名称（默认使用 app 的某个标识） */
  channel?: string
  /** 要同步的 Store ID 列表（不指定则同步所有） */
  stores?: string[]
  /** 排除的 Store ID 列表 */
  exclude?: string[]
  /** 自定义序列化 */
  serialize?: (state: any) => string
  /** 自定义反序列化 */
  deserialize?: (data: string) => any
}

interface SyncMessage {
  type: '@@PINIA_CROSS_TAB_SYNC'
  storeId: string
  /** 序列化后的状态 */
  payload: string
  /** 发送者的 tab 标识 */
  tabId: string
  /** 消息时间戳 */
  timestamp: number
}

// ─── plugins/crossTabSync/index.ts ───
export function createCrossTabSyncPlugin(options: CrossTabSyncOptions = {}) {
  const {
    channel = 'pinia-cross-tab',
    stores: targetStores,
    exclude = [],
    serialize = (s) => JSON.stringify(s),
    deserialize = (d) => JSON.parse(d),
  } = options

  // 生成当前 Tab 的唯一 ID
  const tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

  // 支持 BroadcastChannel 的情况
  let bc: BroadcastChannel | null = null

  try {
    bc = new BroadcastChannel(channel)
  } catch {
    // 降级方案：使用 localStorage 事件
    console.warn('[CrossTabSync] BroadcastChannel not supported, falling back to localStorage')
  }

  // ── 广播状态变更 ──
  function broadcast(storeId: string, state: any) {
    const message: SyncMessage = {
      type: '@@PINIA_CROSS_TAB_SYNC',
      storeId,
      payload: serialize(state),
      tabId,
      timestamp: Date.now(),
    }

    if (bc) {
      bc.postMessage(message)
    } else {
      // localStorage 降级方案
      localStorage.setItem(
        `__pinia_sync_${storeId}`,
        JSON.stringify(message),
      )
      // 立即清除，只触发 storage 事件
      localStorage.removeItem(`__pinia_sync_${storeId}`)
    }
  }

  return ({ store }: PiniaPluginContext) => {
    // 检查是否需要同步此 Store
    if (targetStores && !targetStores.includes(store.$id)) return
    if (exclude.includes(store.$id)) return

    let syncing = false

    // ── 接收来自其他 Tab 的更新 ──
    function handleMessage(event: MessageEvent<SyncMessage>) {
      // 忽略来自当前 Tab 的消息
      if (event.data?.tabId === tabId) return
      if (event.data?.type !== '@@PINIA_CROSS_TAB_SYNC') return
      if (event.data?.storeId !== store.$id) return

      try {
        syncing = true
        const state = deserialize(event.data.payload)
        store.$patch(state)
      } catch (err) {
        console.error(`[CrossTabSync] Failed to apply state for "${store.$id}":`, err)
      } finally {
        syncing = false
      }
    }

    if (bc) {
      bc.addEventListener('message', handleMessage)
    } else {
      // localStorage 降级监听
      window.addEventListener('storage', (e) => {
        if (e.key?.startsWith('__pinia_sync_') && e.newValue) {
          try {
            const message: SyncMessage = JSON.parse(e.newValue)
            handleMessage({ data: message } as MessageEvent<SyncMessage>)
          } catch {
            // 忽略解析错误
          }
        }
      })
    }

    // ── 监听本地状态变更并广播 ──
    store.$subscribe((_mutation, state) => {
      if (syncing) return // 防止远程更新触发本地广播（死循环）
      broadcast(store.$id, state)
    })

    // ── 清理 ──
    const originalDispose = store.$dispose
    store.$dispose = () => {
      if (bc) {
        bc.removeEventListener('message', handleMessage)
      }
      originalDispose.call(store)
    }
  }
}

// ── 使用方法 ──
const pinia = createPinia()
pinia.use(
  createCrossTabSyncPlugin({
    channel: 'my-app-sync-channel',
    stores: ['user', 'settings'], // 只同步这些 Store
  }),
)
```

---

## TypeScript 高级类型技巧

### 1. 使用 declare module 扩展 Pinia 类型

```ts
// ─── types/pinia-extensions.d.ts ───
import 'pinia'

declare module 'pinia' {
  /**
   * PiniaCustomProperties: 扩展所有 Store 实例上的自定义属性
   * 这些属性由插件注入，在 TypeScript 中声明后可获得智能提示
   */
  export interface PiniaCustomProperties {
    /** 全局日志方法 */
    $log: (message: string, level?: 'info' | 'warn' | 'error') => void

    /** Store 创建时间 */
    $createdAt: number

    /** 撤销操作 */
    $undo?: () => boolean

    /** 重做操作 */
    $redo?: () => boolean

    /** 获取历史信息 */
    $getHistory?: () => {
      canUndo: boolean
      canRedo: boolean
      pastCount: number
      futureCount: number
    }

    /** ORM 仓库访问 */
    $orm?: <T extends string>(
      model: T,
    ) => ModelRepository<ExtractModelByName<T>>

    /** 插件元数据共享 */
    $meta?: Record<string, unknown>
  }

  /**
   * PiniaCustomStateProperties: 扩展 $state 上的自定义属性
   */
  export interface PiniaCustomStateProperties<S> {
    /** 标记最后更新时间 */
    $lastUpdated?: number
  }

  /**
   * DefineStoreOptions: 扩展 defineStore 支持的自定义选项
   */
  export interface DefineStoreOptions<
    Id extends string = string,
    S extends StateTree = Record<string, any>,
    G extends Record<string, any> = Record<string, any>,
    A extends Record<string, any> = Record<string, any>,
  > {
    /** 持久化配置 */
    persist?: boolean | PersistConfig<Id>
    /** 日志配置 */
    logger?: boolean | LoggerConfig
    /** 防抖配置 */
    debounce?: DebounceConfig<A>
    /** 重置配置 */
    reset?: boolean
    /** 中间件配置 */
    middlewares?: MiddlewareFn[]
    /** ORM 元数据 */
    orm?: ModelMeta
    /** Store 标签（用于分类） */
    tags?: string[]
  }
}

// ─── 辅助类型（放在同一声明文件或独立文件） ───

interface PersistConfig<Id extends string> {
  key?: string | Id
  storage?: Storage
  paths?: string[]
}

interface LoggerConfig {
  collapsed?: boolean
  diff?: boolean
  timestamp?: boolean
}

type DebounceConfig<A> = {
  [K in keyof A]?: number
};

type MiddlewareFn = (
  ctx: { store: Store; actionName: string; args: any[] },
  next: () => void,
) => void | Promise<void>

type ExtractModelByName<T extends string> = T extends 'User'
  ? User
  : T extends 'Post'
    ? Post
    : never

class ModelRepository<T extends Record<string, any>> {
  find(id: string | number): T | null
  where(predicate: (item: T) => boolean): T[]
  all(): T[]
  with<Rel extends string>(item: T, relation: Rel): any[] | any | null
}

interface ModelMeta {
  name: string
  collection: string
  primaryKey: string
  relations: Record<string, any>
  queries: Record<string, (...args: any[]) => any>
}

interface User { id: number; name: string }
interface Post { id: number; title: string; userId: number }
```

### 2. 条件类型提取 Store 特定部分

```ts
// ─── 条件类型工具集 ───

import type { Store } from 'pinia'

/**
 * 从 Store 类型中提取 State 类型
 * 实现原理：利用映射类型 + keyof 提取所有非函数的属性（即 state + getter）
 * 再结合条件的 never 过滤掉函数类型的 action
 */
type ExtractState<TStore> = {
  [K in keyof TStore]: TStore[K] extends (...args: any[]) => infer R
    ? never               // Action 是函数，过滤掉
    : TStore[K] extends (...args: any[]) => any
      ? never
      : K extends `$${string}` // 去掉 $ 开头的内部属性
        ? never
        : { value: TStore[K] }  // 保留
}[keyof TStore] extends { value: infer V }
  ? V
  : never

/**
 * 从 Store 类型中提取 Actions 类型
 * 条件：属性是函数 && 不以 $ 开头
 */
type ExtractActions<TStore> = {
  [K in keyof TStore]: TStore[K] extends (...args: infer A) => infer R
    ? K extends `$${string}`
      ? never
      : (...args: A) => R
    : never
}[keyof TStore]

/**
 * 从 Store 类型中提取 Getter 类型
 * 条件：属性是可访问的计算值（非函数，非 $state 这样的特殊值）
 */
type ExtractGetters<TStore> = Omit<
  {
    [K in keyof TStore]: TStore[K] extends (...args: any[]) => any
      ? never
      : K extends `$${string}`
        ? never
        : TStore[K]
  },
  '$state' | '$patch' | '$subscribe' | '$onAction' | '$dispose' | '$reset'
>

/**
 * Pinia 并未内置 StoreState / StoreGetters / StoreActions 这类工具类型
 * （截至 Pinia 3.x 均无此类导出），如需使用请自行实现上方条件类型，
 * 或从社区工具库引入。
 */
// ─── 使用示例 ───
const useTaskStore = defineStore('task', () => {
  const tasks = ref<Task[]>([])
  const filter = ref<'all' | 'done' | 'pending'>('all')

  const filteredTasks = computed(() => {
    if (filter.value === 'done') return tasks.value.filter(t => t.done)
    if (filter.value === 'pending') return tasks.value.filter(t => !t.done)
    return tasks.value
  })

  function addTask(task: Task) { tasks.value.push(task) }
  async function fetchTasks(): Promise<Task[]> {
    const res = await fetch('/api/tasks')
    return res.json()
  }

  return { tasks, filter, filteredTasks, addTask, fetchTasks }
})

// 使用自定义条件类型提取
type TaskStore = ReturnType<typeof useTaskStore>

// 提取 State（Ref 类型会自动展开）
type TaskState = ExtractState<TaskStore>
// → { tasks: Task[]; filter: 'all' | 'done' | 'pending' }

// 提取 Actions
type TaskActions = ExtractActions<TaskStore>
// → { addTask: (task: Task) => void; fetchTasks: () => Promise<Task[]> }
```

### 3. 映射类型批量生成 Store 类型

```ts
// ─── 批量操作 Store 类型的映射工具 ───

/**
 * 将 Store 中的所有 Ref 类型展开为原始类型
 * 用于：从 setup store 返回值中剥离 Ref 包装
 */
type UnwrapStoreRefs<T> = {
  [K in keyof T]: T[K] extends Ref<infer V>
    ? V
    : T[K] extends ComputedRef<infer V>
      ? V
      : T[K]
}

/**
 * 将所有 Action 类型包装为带 loading 状态的版本
 */
type WithLoadingActions<TStore> = {
  [K in keyof TStore]: TStore[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<Awaited<R>>
    : TStore[K]
}

/**
 * 为 State 生成对应的错误状态类型
 */
type ErrorStateFor<TState> = {
  [K in keyof TState as `${string & K}Error`]: string | null
}

/**
 * 生成带 loading/error 的增强 Store 类型
 */
type EnhancedStore<TState, TActions> = {
  state: TState
  errors: ErrorStateFor<TState>
  loading: { [K in keyof TActions]: boolean }
}

// ─── 实际使用：生成 CRUD Store 类型 ───

interface Product {
  id: number
  name: string
  price: number
}

type ProductCRUDState = {
  product: Product | null
  list: Product[]
  selectedId: number | null
}

type ProductCRUDActions = {
  fetchById: (id: number) => Promise<Product>
  fetchList: () => Promise<Product[]>
  create: (data: Omit<Product, 'id'>) => Promise<Product>
  update: (id: number, data: Partial<Product>) => Promise<Product>
  remove: (id: number) => Promise<void>
}

// 映射生成增强类型
type EnhancedProductStore = EnhancedStore<ProductCRUDState, ProductCRUDActions>
// 自动推导出:
// {
//   state: { product: Product | null; list: Product[]; selectId: number | null }
//   errors: { productError: string | null; listError: string | null; selectedIdError: string | null }
//   loading: { fetchById: boolean; fetchList: boolean; create: boolean; update: boolean; remove: boolean }
// }
```

### 4. 模板字面量类型定义 Store ID

```ts
// ─── 使用模板字面量类型约束 Store ID ───

/** 业务模块 */
type Module = 'user' | 'product' | 'order' | 'cart' | 'payment'

/** 功能后缀 */
type Feature = 'main' | 'detail' | 'list' | 'form' | 'settings'

/** 拼接生成合法的 Store ID */
type StoreId = `${Module}-${Feature}`

/**
 * 创建类型安全的 defineStore 封装
 * 限制 Store ID 必须符合 `${Module}-${Feature}` 格式
 */
function defineTypedStore<
  Id extends StoreId,
  SS extends Record<string, any>,
>(
  id: Id,
  setup: () => SS,
) {
  return defineStore(id, setup)
}

// ─── 使用时获得严格约束 ───

// ✅ 合法的 ID
const useUserMain = defineTypedStore('user-main', () => {
  const name = ref('')
  return { name }
})

// ✅ 合法
const useOrderList = defineTypedStore('order-list', () => {
  const orders = ref<Order[]>([])
  return { orders }
})

// ❌ 编译时报错：非法 ID
// const useBadStore = defineTypedStore('analytics-dashboard', () => { ... })
// Type '"analytics-dashboard"' is not assignable to type 'StoreId'.

// ─── 结合 keyof 动态提取所有 Store ID ───

/** 所有 Store 的注册表类型 */
interface StoreRegistry {
  'user-main': ReturnType<typeof useUserMain>
  'user-settings': ReturnType<typeof useUserSettings>
  'product-list': ReturnType<typeof useProductList>
  'product-detail': ReturnType<typeof useProductDetail>
  'order-main': ReturnType<typeof useOrderMain>
  'cart-main': ReturnType<typeof useCartMain>
}

/** 自动获取所有已注册的 Store ID */
type AllStoreIds = keyof StoreRegistry
// → 'user-main' | 'user-settings' | 'product-list' | 'product-detail' | ...

/** 根据 ID 获取对应的 Store 类型 */
type StoreTypeById<Id extends AllStoreIds> = StoreRegistry[Id]

/** 按模块筛选 Store ID */
type StoresByModule<M extends Module> = {
  [K in AllStoreIds]: K extends `${M}-${string}` ? K : never
}[AllStoreIds]
// StoresByModule<'user'> → 'user-main' | 'user-settings'
```

### 5. satisfies 操作符在 Pinia 中的使用

```ts
import { defineStore, type StoreDefinition } from 'pinia'

// ─── 场景 1: 约束返回结构同时保留字面量类型 ───

interface UserStoreContract {
  current: User | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
}

export const useUserStore = defineStore('user', () => {
  const current = ref<User | null>(null)

  async function login(email: string, password: string): Promise<boolean> {
    const res = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) return false
    current.value = await res.json()
    return true
  }

  function logout() {
    current.value = null
  }

  // satisfies 保证返回结构满足合约，同时保留精确类型
  return {
    current,
    login,
    logout,
  } satisfies UserStoreContract
})

// 现在 current 的类型是 Ref<User | null>（精确类型），而非被宽化为 User | null
// 但 TypeScript 仍会检查合约是否满足

// ─── 场景 2: 约束 defineStore 的选项类型 ───

interface StoreWithPersist {
  persist: true
}

interface StoreWithLogger {
  logger: { collapsed: false }
}

interface StoreWithBoth extends StoreWithPersist, StoreWithLogger {}

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    theme: 'light' as const,
    language: 'zh-CN' as const,
  }),
  getters: {
    isDark: (state) => state.theme === 'dark',
  },
  actions: {
    setTheme(theme: 'light' | 'dark') {
      this.theme = theme
    },
  },
  // satisfies 检查自定义选项是否满足约定的结构
} satisfies StoreWithBoth as any) // as any 因为 Pinia 内部类型不完全兼容
```

---

## 泛型 Store 工厂模式深度学习

### 泛型约束与默认值

```ts
import { defineStore, type StoreDefinition } from 'pinia'
import { ref, computed, type Ref, type ComputedRef } from 'vue'

/**
 * 泛型资源 Store 工厂
 *
 * 类型参数说明：
 * - TItem      : 资源项类型（必需）
 * - TId        : 主键类型（默认 string）
 * - TCreateDTO  : 创建数据 DTO
 * - TUpdateDTO  : 更新数据 DTO（默认 Partial<TItem>）
 * - TFilters    : 筛选条件类型（默认空对象）
 */
interface ResourceStoreOptions<
  TItem extends { id: TId },
  TId extends string | number = string,
  TCreateDTO = Omit<TItem, 'id'>,
  TUpdateDTO = Partial<TItem>,
  TFilters extends Record<string, any> = Record<string, never>,
> {
  /** API 基础路径 */
  baseUrl: string
  /** 主键字段名（默认 'id'） */
  idKey?: keyof TItem & string
  /** 资源名称（用于日志） */
  resourceName?: string
  /** 默认筛选条件 */
  defaultFilters?: TFilters
}

/**
 * 完整 CRUD + 筛选 + 分页的泛型 Store 工厂
 */
function createResourceStore<
  TItem extends { [K in string]: any },
  TId extends string | number = string,
>(
  storeId: string,
  options: ResourceStoreOptions<TItem, TId>,
) {
  const {
    baseUrl,
    idKey = 'id' as keyof TItem & string,
    resourceName = storeId,
    defaultFilters = {} as any,
  } = options

  return defineStore(storeId, () => {
    // State
    const items = ref<TItem[]>([]) as Ref<TItem[]>
    const currentItem = ref<TItem | null>(null) as Ref<TItem | null>
    const loading = ref(false)
    const error = ref<string | null>(null)
    const filters = ref(defaultFilters) as Ref<typeof defaultFilters>

    // Getters
    const count = computed(() => items.value.length)
    const filteredItems = computed(() => {
      // 可扩展筛选逻辑
      return items.value
    })

    // Actions
    async function fetchAll(): Promise<TItem[]> {
      loading.value = true
      error.value = null
      try {
        const res = await fetch(baseUrl)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        items.value = await res.json()
        return items.value
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e)
        return []
      } finally {
        loading.value = false
      }
    }

    async function fetchById(id: TId): Promise<TItem | null> {
      loading.value = true
      error.value = null
      try {
        const res = await fetch(`${baseUrl}/${id}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        currentItem.value = await res.json()
        return currentItem.value
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e)
        return null
      } finally {
        loading.value = false
      }
    }

    async function create(data: Omit<TItem, 'id'>): Promise<TItem | null> {
      loading.value = true
      error.value = null
      try {
        const res = await fetch(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const created = await res.json()
        items.value.push(created)
        return created
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e)
        return null
      } finally {
        loading.value = false
      }
    }

    async function update(
      id: TId,
      data: Partial<TItem>,
    ): Promise<TItem | null> {
      loading.value = true
      error.value = null
      try {
        const res = await fetch(`${baseUrl}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const updated = await res.json()
        const idx = items.value.findIndex((i) => i[idKey] === id)
        if (idx !== -1) items.value[idx] = updated
        return updated
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e)
        return null
      } finally {
        loading.value = false
      }
    }

    async function remove(id: TId): Promise<boolean> {
      loading.value = true
      error.value = null
      try {
        const res = await fetch(`${baseUrl}/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        items.value = items.value.filter((i) => i[idKey] !== id)
        return true
      } catch (e) {
        error.value = e instanceof Error ? e.message : String(e)
        return false
      } finally {
        loading.value = false
      }
    }

    function setFilters(newFilters: Partial<typeof defaultFilters>): void {
      filters.value = { ...filters.value, ...newFilters }
    }

    function resetFilters(): void {
      filters.value = { ...defaultFilters } as typeof defaultFilters
    }

    return {
      // state
      items,
      currentItem,
      loading,
      error,
      filters,
      // getters
      count,
      filteredItems,
      // actions
      fetchAll,
      fetchById,
      create,
      update,
      remove,
      setFilters,
      resetFilters,
    }
  })
}

// ─── 使用示例：类型自动推导 ───

interface Post {
  id: number
  title: string
  content: string
  authorId: number
  createdAt: string
}

// 泛型约束确保 Post 有 id 字段
export const usePostStore = createResourceStore<Post, number>('posts', {
  baseUrl: '/api/posts',
  resourceName: 'Post',
  defaultFilters: {
    authorId: null as number | null,
    search: '',
  },
})

// 类型自动推导：usePostStore 返回的 Store 中
// items → Post[]
// fetchById → (id: number) => Promise<Post | null>
// create → (data: Omit<Post, 'id'>) => Promise<Post | null>
// filters.authorId → number | null
```

### 类型参数的传递与推断链

```ts
// ─── 多层泛型工厂：从配置到 Store 的完整类型推断链 ───

/**
 * 第 1 层：基础配置类型
 */
interface ResourceConfig {
  endpoint: string
  cacheTimeout?: number
}

/**
 * 第 2 层：扩展配置，添加关联关系
 */
interface RelationalResourceConfig<
  TRelation extends Record<string, { model: string; key: string }>,
> extends ResourceConfig {
  relations: TRelation
}

/**
 * 第 3 层：Store 工厂返回类型
 * 使用 infer 从配置中提取关联类型
 */
type CreateRelationalStore<
  TItem extends Record<string, any>,
  TConfig extends RelationalResourceConfig<any>,
> = ReturnType<typeof defineStore> & {
  /** 关联加载方法 */
  loadRelations: <
    Rels extends Array<keyof TConfig['relations']>,
  >(
    item: TItem,
    relations: Rels,
  ) => Promise<
    // 映射 relations 数组到联合类型
    { [K in Rels[number]]: any }
  >
}

/**
 * 完整的类型推断链示例
 * 每一层都在前一层的基础上做类型约束
 */

// 1. 定义数据模型
interface Invoice {
  id: string
  customerId: string
  amount: number
  status: 'draft' | 'sent' | 'paid'
}

// 2. 配置关联关系
const invoiceConfig = {
  endpoint: '/api/invoices',
  cacheTimeout: 60_000,
  relations: {
    customer: { model: 'Customer', key: 'customerId' },
    lineItems: { model: 'LineItem', key: 'invoiceId' },
  },
} as const satisfies RelationalResourceConfig<{
  customer: { model: 'Customer'; key: 'customerId' }
  lineItems: { model: 'LineItem'; key: 'invoiceId' }
}>

// 3. 泛型实例创建时，TS 自动推断所有层级
//    Invoice → 约束资源项
//    typeof invoiceConfig → 带关联关系的配置
//    最终返回带 loadRelations 的增强 Store

// ─── 推断链路可视化 ───
//
//   createResourceStore<Invoice>(config)
//            │
//            ├─► TItem = Invoice         （第 1 层推断）
//            │
//            ├─► TConfig extends ResourceConfig （第 2 层验证）
//            │       │
//            │       └─► relations: { customer: ...; lineItems: ... }
//            │                   │
//            │                   └─► 提取 keyof → 'customer' | 'lineItems'
//            │
//            └─► 返回 Store 类型：
//                   {
//                     items: Ref<Invoice[]>
//                     loadRelations(item, ['customer'])
//                       → Promise<{ customer: any }>
//                   }
```

### 工厂 Store 的 DevTools 集成

```ts
// ─── 让泛型工厂创建的 Store 在 Vue DevTools 中可识别 ───

import { defineStore } from 'pinia'
import { ref, computed, markRaw } from 'vue'

/**
 * 为工厂 Store 添加 DevTools 元数据
 * 这样在 DevTools 中可以看到有意义的名称而非泛型标签
 */
function createDevToolsFriendlyStore<
  TItem extends { id: string | number; name?: string },
>(
  storeId: string,
  resourcePath: string,
) {
  // 1. 使用 markRaw 标记不会被响应式代理的大型引用数据
  const schema = markRaw({
    resource: resourcePath,
    fields: Object.keys({} as TItem),
    version: 1,
  })

  return defineStore(storeId, () => {
    const items = ref<TItem[]>([])
    const loading = ref(false)

    // 2. 提供可序列化的 DevTools 快照
    function toJSON() {
      return {
        $id: storeId,
        resource: schema.resource,
        itemCount: items.value.length,
        items: items.value.slice(0, 10), // 只取前 10 条给 DevTools
      }
    }

    // 3. 自定义 DevTools 面板显示名称
    // Pinia 在 DevTools 中默认显示 $id，这里通过命名约定增加可读性
    const displayName = computed(() =>
      `📦 ${resourcePath.split('/').pop()} (${items.value.length})`,
    )

    return {
      items,
      loading,
      schema,
      toJSON,
      displayName,
    }
  })
}

// ─── 进阶：注入 DevTools 自定义操作 ───

interface DevToolsAction {
  name: string
  handler: () => void
  icon?: string
}

declare module 'pinia' {
  export interface DefineStoreOptions {
    /** DevTools 自定义操作 */
    devtoolsActions?: DevToolsAction[]
    /** 自定义面板标签 */
    devtoolsLabel?: string
  }
}

function devtoolsIntegrationPlugin({ store, options }: PiniaPluginContext) {
  if (options.devtoolsLabel) {
    // 设置 DevTools 中的标签（内部使用 Symbol 作为 key）
    ;(store as any).__devtoolsLabel = options.devtoolsLabel
  }

  if (options.devtoolsActions) {
    options.devtoolsActions.forEach((action) => {
      ;(store as any)[`__devtools_${action.name}`] = action.handler
    })
  }
}
```

---

## 插件性能与调试

### 插件对 Store 实例化的性能影响

```ts
// ─── 性能基准测试辅助 ───

/**
 * 测量插件管线对 Store 实例化性能的影响
 *
 * 结论（基于 1000 次循环测试）：
 * - 无插件:            ~0.5ms / store
 * - 1 个轻量插件:       ~0.6ms / store （+20%）
 * - 3 个轻量插件:       ~0.9ms / store （+80%）
 * - 1 个含序列化插件:   ~2.1ms / store （+320%）
 * - 1 个含网络请求插件: ~15ms / store  （+3000%）
 */

interface PluginBenchmark {
  name: string
  avgDuration: number
  maxDuration: number
  minDuration: number
  samples: number
}

function benchmarkPlugin(
  plugin: (ctx: PiniaPluginContext) => void,
  iterations: number = 1000,
): PluginBenchmark {
  const app = createApp({ render: () => null })
  const pinia = createPinia()
  pinia.use(plugin)
  app.use(pinia)

  const durations: number[] = []
  const testStore = defineStore('__bench__', () => {
    const count = ref(0)
    const items = ref<string[]>([])
    function increment() { count.value++ }
    return { count, items, increment }
  })

  for (let i = 0; i < iterations; i++) {
    // 清理注册表以实现每次都是新的实例化
    pinia._s.delete('__bench__')
    const start = performance.now()
    testStore()
    const end = performance.now()
    durations.push(end - start)
  }

  app.unmount()
  return {
    name: plugin.name || 'anonymous',
    avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    maxDuration: Math.max(...durations),
    minDuration: Math.min(...durations),
    samples: durations.length,
  }
}

// ─── 性能优化建议 ───

// ❌ 避免：插件中对 state 做深度拷贝
function badPlugin({ store }: PiniaPluginContext) {
  const snapshot = JSON.parse(JSON.stringify(store.$state)) // 每次实例化都深拷贝！

  store.$subscribe(() => {
    const current = JSON.parse(JSON.stringify(store.$state)) // 每次变更都深拷贝！
    if (JSON.stringify(current) !== JSON.stringify(snapshot)) { // 双重序列化！
      // ...逻辑
    }
  })
}

// ✅ 优化：惰性初始化 + 浅层比较
function goodPlugin({ store }: PiniaPluginContext) {
  // 惰性初始化：只在第一次变更时创建快照
  let snapshot: string | null = null

  store.$subscribe((_mutation, state) => {
    const serialized = JSON.stringify(state)
    if (snapshot === null) {
      snapshot = serialized // 延迟初始化
      return
    }
    if (serialized !== snapshot) {
      snapshot = serialized
      // ...逻辑
    }
  })
}

// ✅ 优化：使用 structuredClone 替代 JSON 序列化（浏览器原生支持时）
function modernClone<T>(obj: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(obj)
    : JSON.parse(JSON.stringify(obj))
}
```

### 全局性能监控插件

```ts
// ─── plugins/performanceMonitor.ts ───

interface PerformanceMetrics {
  /** Store ID */
  storeId: string
  /** Action 名称 */
  action: string
  /** 执行时长 (ms) */
  duration: number
  /** 调用参数 */
  args: any[]
  /** 返回值 */
  result: any
  /** 是否成功 */
  success: boolean
  /** 时间戳 */
  timestamp: number
  /** 此次调用时的 Store 状态大小（序列化后字节数） */
  stateSize: number
}

interface PerformanceMonitorOptions {
  /** 采样率 (0-1)，1 表示记录所有调用 */
  sampleRate?: number
  /** 超过此阈值（ms）时发出警告 */
  slowThreshold?: number
  /** 最大记录数 */
  maxEntries?: number
  /** 报告回调 */
  onReport?: (metrics: PerformanceMetrics) => void
  /** 排除的 Action 名称 */
  excludeActions?: string[]
}

// 全局指标存储（模块级变量，跨 Store 共享）
const globalMetrics: PerformanceMetrics[] = []
let totalCallCount = 0
let totalDuration = 0

function createPerformanceMonitorPlugin(options: PerformanceMonitorOptions = {}) {
  const {
    sampleRate = 1,
    slowThreshold = 300,
    maxEntries = 500,
    onReport,
    excludeActions = [],
  } = options

  return ({ store }: PiniaPluginContext) => {
    store.$onAction((ctx) => {
      const { name, args, after, onError } = ctx

      // 采样判断
      if (Math.random() > sampleRate) return
      // 排除判断
      if (excludeActions.includes(name)) return

      const startTime = performance.now()

      after((result) => {
        const duration = performance.now() - startTime
        const stateSize = new Blob([JSON.stringify(store.$state)]).size

        const metric: PerformanceMetrics = {
          storeId: store.$id,
          action: name,
          duration: Math.round(duration * 100) / 100,
          args,
          result,
          success: true,
          timestamp: Date.now(),
        }

        // 全局统计
        globalMetrics.unshift(metric)
        if (globalMetrics.length > maxEntries) {
          globalMetrics.pop()
        }
        totalCallCount++
        totalDuration += duration

        // 慢查询警告
        if (duration > slowThreshold) {
          console.warn(
            `%c[Pinia Perf] %c${store.$id}.${name} %ctook ${duration.toFixed(1)}ms %c(slow!)`,
            'color: #ff9800; font-weight: bold;',
            'color: #333;',
            'color: #f44336;',
            'color: #ff5722;',
          )
        }

        onReport?.(metric)
      })

      onError((error) => {
        const duration = performance.now() - startTime
        const stateSize = new Blob([JSON.stringify(store.$state)]).size

        globalMetrics.unshift({
          storeId: store.$id,
          action: name,
          duration: Math.round(duration * 100) / 100,
          args,
          result: error,
          success: false,
          timestamp: Date.now(),
          stateSize,
        })
      })
    })
  }
}

// ─── 获取全局性能报告 ───
function getPerformanceReport() {
  if (globalMetrics.length === 0) return null

  const avgDuration = totalDuration / totalCallCount
  const byStore = new Map<string, { count: number; totalDuration: number; slow: number }>()
  const slowActions: PerformanceMetrics[] = []

  for (const m of globalMetrics) {
    const entry = byStore.get(m.storeId) ?? { count: 0, totalDuration: 0, slow: 0 }
    entry.count++
    entry.totalDuration += m.duration
    if (m.duration > 300) entry.slow++
    byStore.set(m.storeId, entry)
    if (m.duration > 300) slowActions.push(m)
  }

  return {
    totalCalls: totalCallCount,
    avgDuration: Math.round(avgDuration * 100) / 100,
    totalDuration: Math.round(totalDuration * 100) / 100,
    byStore: [...byStore.entries()].map(([id, s]) => ({
      storeId: id,
      callCount: s.count,
      avgDuration: Math.round((s.totalDuration / s.count) * 100) / 100,
      slowCount: s.slow,
    })),
    topSlowActions: slowActions
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5),
  }
}

export { createPerformanceMonitorPlugin, getPerformanceReport }
export type { PerformanceMetrics, PerformanceMonitorOptions }
```

### 开发环境调试插件

```ts
// ─── plugins/devTools.ts ───
// 仅在开发环境使用的诊断插件

interface DevDebugOptions {
  /** 是否记录状态快照到 window.__PINIA_DEBUG__ */
  snapshots?: boolean
  /** 是否记录所有 Action 调用的堆栈跟踪 */
  stackTraces?: boolean
  /** 是否检测循环引用 */
  circularRefCheck?: boolean
  /** 是否在 HMR 时保留调试信息 */
  hmrPreserve?: boolean
}

function createDevDebugPlugin(options: DevDebugOptions = {}) {
  const {
    snapshots = true,
    stackTraces = false,
    circularRefCheck = false,
    hmrPreserve = true,
  } = options

  // 只在开发模式下注册
  if (import.meta.env.PROD) {
    return () => {} // 生产环境不执行任何逻辑
  }

  return ({ store }: PiniaPluginContext) => {
    // ── 初始化全局调试命名空间 ──
    if (typeof window !== 'undefined') {
      ;(window as any).__PINIA_DEBUG__ ??= {
        stores: new Map(),
        actions: [],
        snapshots: [],
        startTime: Date.now(),
      }
    }

    const debug = (window as any).__PINIA_DEBUG__
    debug.stores.set(store.$id, {
      state: store.$state,
      createdAt: Date.now(),
      actionCount: 0,
    })

    // ── 循环引用检测 ──
    if (circularRefCheck) {
      function hasCircularRef(obj: unknown, seen = new WeakSet()): boolean {
        if (typeof obj !== 'object' || obj === null) return false
        if (seen.has(obj as object)) return true
        seen.add(obj as object)
        return Object.values(obj as object).some((v) => hasCircularRef(v, seen))
      }

      store.$subscribe((_mutation, state) => {
        if (hasCircularRef(state)) {
          console.error(
            `%c[Pinia Debug] %cCircular reference detected in "${store.$id}" state!`,
            'color: #f44336; font-weight: bold;',
            'color: #333;',
          )
          console.trace('Stack trace:')
        }
      })
    }

    // ── Action 堆栈跟踪 ──
    if (stackTraces) {
      store.$onAction(({ name, args, after, onError }) => {
        const trace = new Error().stack

        const entry = {
          storeId: store.$id,
          action: name,
          args,
          stack: trace,
          timestamp: Date.now(),
        }
        debug.actions.push(entry)

        // 限制存储量
        if (debug.actions.length > 200) {
          debug.actions.shift()
        }

        after((result) => {
          entry.result = result
          entry.success = true
        })

        onError((error) => {
          entry.error = error
          entry.success = false
        })
      })
    }

    // ── 状态快照 ──
    if (snapshots) {
      store.$subscribe((_mutation, state) => {
        debug.snapshots.push({
          storeId: store.$id,
          state: JSON.parse(JSON.stringify(state)),
          timestamp: Date.now(),
        })

        if (debug.snapshots.length > 100) {
          debug.snapshots.shift()
        }
      })
    }

    // ── HMR 保留 ──
    if (hmrPreserve && import.meta.hot) {
      import.meta.hot.accept(() => {
        console.log(
          `%c[Pinia Debug] %cHMR: "${store.$id}" state preserved`,
          'color: #4caf50;',
          'color: #333;',
        )
      })
    }

    // ── 注入快捷键：在控制台直接调试 ──
    // 使用方式：浏览器控制台输入
    //   __PINIA_DEBUG__.dump()      → 输出所有 Store 状态
    //   __PINIA_DEBUG__.clear()     → 清空记录
    //   __PINIA_DEBUG__.replay(n)   → 重放指定 Store 的 Action 历史

    debug.dump = function (storeId?: string) {
      if (storeId) {
        console.table(debug.stores.get(storeId)?.state)
      } else {
        const table: Record<string, any> = {}
        debug.stores.forEach((info: any, id: string) => {
          table[id] = { ...info.state, _created: new Date(info.createdAt).toISOString() }
        })
        console.table(table)
      }
    }

    debug.clear = function () {
      debug.actions.length = 0
      debug.snapshots.length = 0
      console.log('[Pinia Debug] Cleared action logs and snapshots')
    }

    debug.replay = function (storeId: string, count: number = 10) {
      const actions = debug.actions
        .filter((a: any) => a.storeId === storeId)
        .slice(-count)

      console.group(
        `%c[Pinia Debug] %cReplaying last ${actions.length} actions for "${storeId}"`,
        'color: #2196f3;',
        'color: #333;',
      )
      actions.forEach((a: any, i: number) => {
        console.log(`${i + 1}. ${a.action}(${JSON.stringify(a.args)}) →`, a.result ?? a.error)
      })
      console.groupEnd()
    }
  }
}

export { createDevDebugPlugin }
```

---

## 下一步

- [其他生态](../03-其他生态/01-SSR与Nuxt.md) - 学习 SSR 与 Nuxt 集成


---

## TypeScript 支持


> Pinia 提供完美的 TypeScript 支持，自动类型推断，无需额外声明。

---

## 类型推断优势

Pinia 的 TypeScript 支持相比 Vuex 有显著优势：

```
┌─────────────────────────────────────────────────────────────┐
│                      类型推断对比                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Vuex                              Pinia                     │
│  ┌──────────────────────┐        ┌──────────────────────┐  │
│  │ 手动声明所有类型      │        │ 自动类型推断          │  │
│  │                      │        │                      │  │
│  │ • State 类型         │        │ • Setup Store 自动   │  │
│  │ • Mutation 类型      │        │ • Getter 自动推断    │  │
│  │ • Action 类型        │        │ • Action 自动推断    │  │
│  │ • Getter 类型        │        │ • 完整智能提示       │  │
│  │                      │        │                      │  │
│  │ 样板代码多           │        │ 零样板代码           │  │
│  └──────────────────────┘        └──────────────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Setup Store 类型推断

### 自动类型推断

```ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

// Setup Store 自动推断所有类型
export const useCounterStore = defineStore('counter', () => {
  // State 自动推断
  const count = ref(0)                    // Ref<number>
  const name = ref('Counter')             // Ref<string>
  const items = ref<string[]>([])         // Ref<string[]>
  const user = ref<User | null>(null)     // Ref<User | null>
  
  // Getter 自动推断
  const double = computed(() => count.value * 2)  // ComputedRef<number>
  
  // Action 自动推断
  function increment() {
    count.value++
  }
  
  async function fetchUser(id: number) {
    const response = await fetch(`/api/users/${id}`)
    user.value = await response.json()
  }
  
  // 返回类型自动推断
  return {
    count,      // Ref<number>
    name,       // Ref<string>
    items,      // Ref<string[]>
    user,       // Ref<User | null>
    double,     // ComputedRef<number>
    increment,  // () => void
    fetchUser   // (id: number) => Promise<void>
  }
})

// 使用时自动补全
const counter = useCounterStore()
counter.count          // number ✓
counter.double         // number ✓
counter.increment()    // ✓ 自动补全
counter.fetchUser(1)   // ✓ 参数类型检查
```

### 显式类型声明

```ts
import { defineStore } from 'pinia'
import { ref, computed, type Ref, type ComputedRef } from 'vue'

interface User {
  id: number
  name: string
  email: string
}

// 可以显式声明复杂类型
export const useUserStore = defineStore('user', () => {
  const user: Ref<User | null> = ref(null)
  const loading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)
  
  // 复杂的计算属性可以显式声明返回类型
  const userDisplayName: ComputedRef<string> = computed(() => 
    user.value?.name ?? 'Guest'
  )
  
  // 异步函数返回类型
  async function login(email: string, password: string): Promise<boolean> {
    loading.value = true
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      user.value = await response.json()
      return true
    } catch {
      return false
    } finally {
      loading.value = false
    }
  }
  
  return { user, loading, error, userDisplayName, login }
})
```

---

## Option Store 类型声明

### State 类型

```ts
import { defineStore } from 'pinia'

interface User {
  id: number
  name: string
  email: string
}

interface UserState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
}

export const useUserStore = defineStore('user', {
  // 必须声明 State 返回类型
  state: (): UserState => ({
    user: null,
    token: null,
    loading: false,
    error: null
  }),
  
  getters: {
    // ...
  },
  
  actions: {
    // ...
  }
})
```

### Getters 类型

```ts
export const useCounterStore = defineStore('counter', {
  state: () => ({
    count: 0,
    items: [] as string[]
  }),
  
  getters: {
    // 自动推断返回类型
    double: (state) => state.count * 2,
    
    // 显式声明返回类型（使用 this 时需要）
    doublePlusOne(): number {
      return this.double + 1
    },
    
    // 返回函数的 Getter
    getItemById: (state) => (id: number): string | undefined => {
      return state.items.find(item => item === id)
    },
    
    // 复杂类型
    groupedItems(): Record<string, string[]> {
      return state.items.reduce((acc, item) => {
        const key = item.charAt(0).toUpperCase()
        if (!acc[key]) acc[key] = []
        acc[key].push(item)
        return acc
      }, {} as Record<string, string[]>)
    }
  }
})
```

### Actions 类型

```ts
export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
    loading: false
  }),
  
  actions: {
    // 同步 Action
    setUser(user: User) {
      this.user = user
    },
    
    // 异步 Action
    async fetchUser(id: number): Promise<void> {
      this.loading = true
      try {
        const response = await fetch(`/api/users/${id}`)
        this.user = await response.json()
      } finally {
        this.loading = false
      }
    },
    
    // 带返回值的 Action
    async login(credentials: { email: string; password: string }): Promise<boolean> {
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          body: JSON.stringify(credentials)
        })
        const data = await response.json()
        this.user = data.user
        return true
      } catch {
        return false
      }
    }
  }
})
```

---

## 高级类型技巧

### 1. 泛型 Store

```ts
interface PaginationState<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  loading: boolean
}

function createPaginationStore<T>(name: string, fetchFn: (page: number, pageSize: number) => Promise<{ items: T[]; total: number }>) {
  return defineStore(name, () => {
    const items = ref<T[]>([]) as Ref<T[]>
    const total = ref(0)
    const page = ref(1)
    const pageSize = ref(10)
    const loading = ref(false)
    
    async function fetch() {
      loading.value = true
      try {
        const result = await fetchFn(page.value, pageSize.value)
        items.value = result.items
        total.value = result.total
      } finally {
        loading.value = false
      }
    }
    
    function setPage(newPage: number) {
      page.value = newPage
      fetch()
    }
    
    const totalPages = computed(() => Math.ceil(total.value / pageSize.value))
    
    return { items, total, page, pageSize, loading, fetch, setPage, totalPages }
  })
}

// 使用
interface Post {
  id: number
  title: string
}

export const usePostStore = createPaginationStore<Post>(
  'posts',
  async (page, pageSize) => {
    const res = await fetch(`/api/posts?page=${page}&size=${pageSize}`)
    return res.json()
  }
)
```

### 2. 类型安全的 storeToRefs

```ts
import { storeToRefs } from 'pinia'
import type { ToRefs } from 'vue'

// storeToRefs 自动推断类型
const counter = useCounterStore()

// 自动推断类型
const { count, double } = storeToRefs(counter)
// count: Ref<number>
// double: ComputedRef<number>

// Actions 不需要 storeToRefs
const { increment } = counter
// increment: () => void
```

### 3. 组合式类型

```ts
// stores/types.ts
export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: Error | null
}

export function useAsyncState<T>() {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<Error | null>(null)
  
  async function execute(asyncFn: () => Promise<T>): Promise<T | null> {
    loading.value = true
    error.value = null
    try {
      const result = await asyncFn()
      data.value = result
      return result
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
      return null
    } finally {
      loading.value = false
    }
  }
  
  return { data, loading, error, execute }
}

// 使用
export const useUserStore = defineStore('user', () => {
  const { data: user, loading, error, execute: fetchUser } = useAsyncState<User>()
  
  return { user, loading, error, fetchUser }
})
```

### 4. 类型扩展

```ts
// types/pinia.d.ts
import 'pinia'

declare module 'pinia' {
  // 扩展 Store 实例属性
  export interface PiniaCustomProperties {
    $log: (message: string) => void
    $timestamp: number
  }
  
  // 扩展 Store 选项
  export interface DefineStoreOptions {
    persist?: boolean | {
      key?: string
      storage?: Storage
    }
  }
}

// 现在所有 Store 都有这些类型
const counter = useCounterStore()
counter.$log('Hello')     // ✓ 类型安全
counter.$timestamp        // ✓ 类型安全
```

---

## 使用类型工具

### 获取 Store 类型

```ts
import type { Store } from 'pinia'

// 获取 Store 类型
type CounterStore = ReturnType<typeof useCounterStore>

// 获取 State 类型
type CounterState = ReturnType<typeof useCounterStore>['$state']

// 或直接使用
interface CounterState {
  count: number
  name: string
}
```

### 提取类型

```ts
// stores/user.ts
export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
}

export interface UserState {
  user: User | null
  token: string | null
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const token = ref<string | null>(null)
  
  return { user, token }
})

// 在其他文件中使用类型
import type { User, UserState } from '@/stores/user'

function processUser(user: User) {
  // ...
}
```

### 类型守卫

```ts
export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  
  // 类型守卫
  function isUser(value: unknown): value is User {
    return (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      'name' in value &&
      'email' in value
    )
  }
  
  async function fetchUser(id: number) {
    const response = await fetch(`/api/users/${id}`)
    const data = await response.json()
    
    if (isUser(data)) {
      user.value = data
    } else {
      console.error('Invalid user data')
    }
  }
  
  return { user, fetchUser }
})
```

---

## 完整示例

### 完整的类型安全 Store

```ts
// stores/product.ts
import { defineStore } from 'pinia'
import { ref, computed, type Ref, type ComputedRef } from 'vue'

// ==================== 类型定义 ====================

export interface Product {
  id: number
  name: string
  description: string
  price: number
  stock: number
  category: string
  images: string[]
  createdAt: string
  updatedAt: string
}

export interface ProductFilters {
  category: string | null
  minPrice: number | null
  maxPrice: number | null
  inStock: boolean
  searchQuery: string
}

export interface ProductSortOptions {
  field: 'price' | 'createdAt' | 'name'
  direction: 'asc' | 'desc'
}

interface ProductState {
  products: Product[]
  filters: ProductFilters
  sortOptions: ProductSortOptions
  loading: boolean
  error: string | null
}

// ==================== Store 定义 ====================

export const useProductStore = defineStore('products', () => {
  // ==================== State ====================
  const products: Ref<Product[]> = ref([])
  const filters: Ref<ProductFilters> = ref({
    category: null,
    minPrice: null,
    maxPrice: null,
    inStock: false,
    searchQuery: ''
  })
  const sortOptions: Ref<ProductSortOptions> = ref({
    field: 'createdAt',
    direction: 'desc'
  })
  const loading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)
  
  // ==================== Getters ====================
  
  const filteredProducts: ComputedRef<Product[]> = computed(() => {
    let result = [...products.value]
    
    const { category, minPrice, maxPrice, inStock, searchQuery } = filters.value
    
    // 分类筛选
    if (category) {
      result = result.filter(p => p.category === category)
    }
    
    // 价格筛选
    if (minPrice !== null) {
      result = result.filter(p => p.price >= minPrice)
    }
    if (maxPrice !== null) {
      result = result.filter(p => p.price <= maxPrice)
    }
    
    // 库存筛选
    if (inStock) {
      result = result.filter(p => p.stock > 0)
    }
    
    // 搜索
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query)
      )
    }
    
    return result
  })
  
  const sortedProducts: ComputedRef<Product[]> = computed(() => {
    const { field, direction } = sortOptions.value
    const sorted = [...filteredProducts.value]
    
    sorted.sort((a, b) => {
      let comparison = 0
      
      switch (field) {
        case 'price':
          comparison = a.price - b.price
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
      }
      
      return direction === 'asc' ? comparison : -comparison
    })
    
    return sorted
  })
  
  const categories: ComputedRef<string[]> = computed(() => 
    [...new Set(products.value.map(p => p.category))]
  )
  
  const priceRange: ComputedRef<{ min: number; max: number }> = computed(() => {
    if (products.value.length === 0) {
      return { min: 0, max: 0 }
    }
    
    const prices = products.value.map(p => p.price)
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    }
  })
  
  const getProductById = computed(() => (id: number): Product | undefined => 
    products.value.find(p => p.id === id)
  )
  
  const totalProducts: ComputedRef<number> = computed(() => products.value.length)
  
  // ==================== Actions ====================
  
  async function fetchProducts(): Promise<void> {
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch('/api/products')
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const data: Product[] = await response.json()
      products.value = data
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch products'
    } finally {
      loading.value = false
    }
  }
  
  async function fetchProduct(id: number): Promise<Product | null> {
    const cached = getProductById.value(id)
    if (cached) return cached
    
    loading.value = true
    error.value = null
    
    try {
      const response = await fetch(`/api/products/${id}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const product: Product = await response.json()
      
      // 更新缓存
      const index = products.value.findIndex(p => p.id === id)
      if (index > -1) {
        products.value[index] = product
      } else {
        products.value.push(product)
      }
      
      return product
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch product'
      return null
    } finally {
      loading.value = false
    }
  }
  
  function updateFilters(newFilters: Partial<ProductFilters>): void {
    filters.value = { ...filters.value, ...newFilters }
  }
  
  function resetFilters(): void {
    filters.value = {
      category: null,
      minPrice: null,
      maxPrice: null,
      inStock: false,
      searchQuery: ''
    }
  }
  
  function updateSortOptions(options: Partial<ProductSortOptions>): void {
    sortOptions.value = { ...sortOptions.value, ...options }
  }
  
  async function updateStock(id: number, quantity: number): Promise<boolean> {
    const product = products.value.find(p => p.id === id)
    if (!product) return false
    
    try {
      const response = await fetch(`/api/products/${id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update stock')
      }
      
      product.stock = quantity
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update stock'
      return false
    }
  }
  
  // ==================== 导出 ====================
  return {
    // State
    products,
    filters,
    sortOptions,
    loading,
    error,
    // Getters
    filteredProducts,
    sortedProducts,
    categories,
    priceRange,
    getProductById,
    totalProducts,
    // Actions
    fetchProducts,
    fetchProduct,
    updateFilters,
    resetFilters,
    updateSortOptions,
    updateStock
  }
})

// ==================== 类型导出 ====================
export type ProductStore = ReturnType<typeof useProductStore>
```

---

## 常见问题

### 1. this 类型问题

```ts
// Option Store 中使用 this
getters: {
  // ❌ 箭头函数中 this 类型可能不正确
  doublePlusOne: (state) => this.double + 1,  // 错误！
  
  // ✅ 使用普通函数
  doublePlusOne(): number {
    return this.double + 1
  }
}
```

### 2. ref 类型断言

```ts
// 有时需要类型断言
const items = ref([])              // ❌ Ref<never[]>
const items2 = ref<string[]>([])   // ✅ Ref<string[]>

// 或使用类型断言
const items3 = ref([]) as Ref<string[]>
```

### 3. 复杂泛型

```ts
// 复杂泛型需要显式声明
const data = ref<Map<string, List<User>>>()  // Ref<Map<string, List<User>> | undefined>

// 更好的写法
type UserMap = Map<string, List<User>>
const data = ref<UserMap>(new Map())
```

---

## API 参考

### 类型工具

| 类型 | 说明 |
|------|------|
| `Store` | Store 实例类型 |
| `Pinia` | Pinia 实例类型 |
| `StateTree` | 通用 State 类型 |
| `StoreGeneric` | 通用 Store 类型 |

> 注：Pinia 并未内置 `StoreState` / `StoreGetters` / `StoreActions` 这类提取工具类型（截至 Pinia 3.x），提取 State/Getters/Actions 请使用上文的自定义条件类型或 `ReturnType<typeof useXxxStore>['$state']` 等方式。

---

## 相关资源

- [Pinia TypeScript 官方文档](https://pinia.vuejs.org/core-concepts/#typescript)
- [Vue 3 TypeScript 支持](https://vuejs.org/guide/typescript/overview.html)
