---
title: Router3 API 参考
description: Vue Router 3.x 完整 API 速查：router-link/router-view 属性、路由对象、构造选项与实例方法
keywords: [Vue Router, API 参考, router-link, router-view, 路由对象, 导航故障]
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---

# Router3 API 参考

本篇是 Vue Router 3.x 的 **API 速查手册**，面向「已经了解用法、需要确认签名与默认值」的场景。

概念讲解与实战请见同组的 [路由基础](01-路由基础.md)、[路由进阶](02-路由进阶/01-路由参数与动态匹配.md)、[路由守卫](04-路由守卫.md)。

> **版本说明**：本篇对应 Vue Router 3.x（配套 Vue 2）。Vue 3 项目请使用 Vue Router 4，部分 API 已变更（如 `addRoutes` 移除、`mode` 改为 `history` 选项）。

## router-link

`<router-link>` 支持用户在具有路由功能的应用中导航。`to` 属性指定目标地址，默认渲染成带正确链接的 `<a>` 标签。当目标路由成功激活时，链接元素会自动设置表示激活的 CSS 类名。

相比写死的 `<a href="...">`，它的优势是：

- 无论 HTML5 history 模式还是 hash 模式，表现行为一致，切换模式无须改动
- 在 history 模式下会守卫点击事件，让浏览器不再重新加载页面
- 在 history 模式下使用 `base` 选项后，所有 `to` 属性都不需要写基路径

### Props

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `to` | `string \| Location` | — | **必填**。目标路由链接，内部传给 `router.push()` |
| `replace` | `boolean` | `false` | 点击时调用 `router.replace()`，不留下 history 记录 |
| `append` | `boolean` | `false` | 在当前相对路径前添加基路径 |
| `tag` | `string` | `"a"` | 渲染成指定标签，仍然监听点击触发导航 |
| `active-class` | `string` | `"router-link-active"` | 链接激活时的 CSS 类名，可由 `linkActiveClass` 全局配置 |
| `exact` | `boolean` | `false` | 使用精确匹配模式，而非默认的包含匹配 |
| `event` | `string \| Array<string>` | `'click'` | 声明可触发导航的事件 |
| `exact-active-class` | `string` | `"router-link-exact-active"` | 精确匹配时激活的 class，可由 `linkExactActiveClass` 全局配置 |
| `aria-current-value` | `'page' \| 'step' \| 'location' \| 'date' \| 'time' \| 'true' \| 'false'` | `"page"` | 精确匹配激活时 `aria-current` 的值 |

#### to 的多种写法

```html
<!-- 字符串 -->
<router-link to="home">Home</router-link>
<!-- 渲染结果：<a href="home">Home</a> -->

<!-- 使用 v-bind 的 JS 表达式 -->
<router-link :to="'home'">Home</router-link>

<!-- 对象形式 -->
<router-link :to="{ path: 'home' }">Home</router-link>

<!-- 命名的路由 -->
<router-link :to="{ name: 'user', params: { userId: 123 }}">User</router-link>

<!-- 带查询参数，结果为 /register?plan=private -->
<router-link :to="{ path: 'register', query: { plan: 'private' }}">Register</router-link>
```

#### exact 的作用

「是否激活」默认依据是**包含匹配**。如果当前路径以 `/a` 开头，`<router-link to="/a">` 就会被设置激活类名。按这个规则，每个路由都会激活 `<router-link to="/">`：

```html
<!-- 这个链接只会在地址为 / 的时候被激活 -->
<router-link to="/" exact></router-link>
```

### v-slot（3.1.0 新增）

`router-link` 通过作用域插槽暴露底层定制能力，主要面向库作者，常用于封装 `NavLink` 这类自定义组件。

> **注意**：使用 `v-slot` API 时需要向 `router-link` 传入**单独一个子元素**，否则会把子元素包裹在 `span` 内。

```html
<router-link to="/about" custom v-slot="{ href, route, navigate, isActive, isExactActive }">
  <NavLink :active="isActive" :href="href" @click="navigate">{{ route.fullPath }}</NavLink>
</router-link>
```

插槽参数：

- `href`：解析后的 URL，作为 `a` 元素的 `href` attribute
- `route`：解析后的规范化地址
- `navigate`：触发导航的函数，会在必要时自动阻止事件
- `isActive`：需要应用激活 class 时为 `true`
- `isExactActive`：需要应用精确激活 class 时为 `true`

把激活 class 应用到外层元素而非 `<a>` 标签本身：

```html
<router-link
  to="/foo"
  v-slot="{ href, route, navigate, isActive, isExactActive }"
  custom
>
  <li :class="[isActive && 'router-link-active', isExactActive && 'router-link-exact-active']">
    <a :href="href" @click="navigate">{{ route.fullPath }}</a>
  </li>
</router-link>
```

> 在 `<a>` 元素上添加 `target="_blank"` 时，`@click="navigate"` 处理器会被忽略。

## router-view

`<router-view>` 是一个 functional 组件，渲染路径匹配到的视图组件。它渲染的组件还可以内嵌自己的 `<router-view>`，据此实现嵌套路由。

其他非 `router-view` 使用的属性都会直接传给渲染的组件。

| 属性 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `name` | `string` | `"default"` | 设置名称后渲染对应路由配置中 `components` 下的相应组件 |

配合 `<transition>` 和 `<keep-alive>` 使用时，要确保 `<keep-alive>` 在内层：

```html
<transition>
  <keep-alive>
    <router-view></router-view>
  </keep-alive>
</transition>
```

## 路由对象

**路由对象（route object）** 表示当前激活路由的状态信息，包含当前 URL 解析得到的信息以及匹配到的**路由记录（route records）**。

路由对象是不可变（immutable）的，每次成功导航后都会产生一个新对象。它出现在以下位置：

- 组件内的 `this.$route`
- `$route` 观察者回调内
- `router.match(location)` 的返回值
- 导航守卫的参数（`to` / `from`）
- `scrollBehavior` 方法的参数

### 路由对象属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `$route.path` | `string` | 当前路由路径，总是解析为绝对路径，如 `/foo/bar` |
| `$route.params` | `Object` | 包含动态片段和全匹配片段的 key/value 对象，无参数时为空对象 |
| `$route.query` | `Object` | URL 查询参数。`/foo?user=1` 对应 `$route.query.user === '1'` |
| `$route.hash` | `string` | 当前路由的 hash 值（带 `#`），无 hash 时为空字符串 |
| `$route.fullPath` | `string` | 完成解析后的 URL，包含查询参数和 hash |
| `$route.matched` | `Array<RouteRecord>` | 包含当前路由所有嵌套路径片段的路由记录 |
| `$route.name` | `string` | 当前路由的名称（如果有） |
| `$route.redirectedFrom` | `string` | 存在重定向时，重定向来源位置的 fullPath 字符串（v4 中为路由对象） |

关于 `$route.matched`——路由记录就是 `routes` 配置数组中的对象副本（也包括 `children` 数组中的）：

```javascript
const router = new VueRouter({
  routes: [
    // 下面的对象就是路由记录
    {
      path: '/foo',
      component: Foo,
      children: [
        // 这也是个路由记录
        { path: 'bar', component: Bar }
      ]
    }
  ]
})
```

当 URL 为 `/foo/bar` 时，`$route.matched` 是包含从上到下所有记录副本的数组。这也是[路由元信息](04-路由守卫.md)中遍历 `to.matched` 检查 `meta` 的原理。

### 组件注入

在 Vue 根实例传入 `router` 配置后，下列成员会被注入到每个子组件：

- `this.$router`：router 实例
- `this.$route`：当前激活的路由信息对象。**只读**，内部属性不可变，但可以 watch

同时增加了三个组件配置选项：`beforeRouteEnter`、`beforeRouteUpdate`、`beforeRouteLeave`。

## Router 构造选项

### routes

- 类型：`Array<RouteConfig>`

```typescript
declare type RouteConfig = {
  path: string,
  component?: Component,
  name?: string,                // 命名路由
  components?: { [name: string]: Component }, // 命名视图组件
  redirect?: string | Location | Function,
  props?: boolean | Object | Function,
  alias?: string | Array<string>,
  children?: Array<RouteConfig>, // 嵌套路由
  beforeEnter?: (to: Route, from: Route, next: Function) => void,
  meta?: any,

  // 2.6.0+
  caseSensitive?: boolean,       // 匹配规则是否大小写敏感，默认 false
  pathToRegexpOptions?: Object   // 编译正则的选项
}
```

### mode

- 类型：`string`
- 默认值：`"hash"`（浏览器端）/ `"abstract"`（Node.js 环境）
- 可选值：`"hash"` | `"history"` | `"abstract"`

配置路由模式：

- `hash`：使用 URL hash 值来作路由，支持所有浏览器，包括不支持 HTML5 History Api 的浏览器
- `history`：依赖 HTML5 History API 和服务器配置
- `abstract`：支持所有 JavaScript 运行环境，如 Node.js 服务器端。**如果发现没有浏览器 API，路由会自动强制进入这个模式**

### base

- 类型：`string`
- 默认值：`"/"`

应用的基路径。例如整个单页应用服务在 `/app/` 下，则 `base` 应设为 `"/app/"`。

### linkActiveClass / linkExactActiveClass

- 类型：`string`
- 默认值：`"router-link-active"` / `"router-link-exact-active"`

全局配置 `<router-link>` 默认的激活 class 与精确激活 class。

### scrollBehavior

- 类型：`Function`

```typescript
type PositionDescriptor = { x: number, y: number } | { selector: string } | void

type scrollBehaviorHandler = (
  to: Route,
  from: Route,
  savedPosition?: { x: number, y: number }
) => PositionDescriptor | Promise<PositionDescriptor>
```

用法详见本篇「滚动行为」小节。

### parseQuery / stringifyQuery

- 类型：`Function`

提供自定义查询字符串的解析/反解析函数，覆盖默认行为。

### fallback

- 类型：`boolean`
- 默认值：`true`

当浏览器不支持 `history.pushState` 时，控制路由是否应该回退到 `hash` 模式。

在 IE9 中设置为 `false` 会使每个 `router-link` 导航都触发整页刷新。它可用于工作在 IE9 下的服务端渲染应用，因为 hash 模式的 URL 并不支持服务端渲染。

## Router 实例属性

| 属性 | 类型 | 说明 |
| --- | --- | --- |
| `router.app` | `Vue instance` | 配置了 `router` 的 Vue 根实例 |
| `router.mode` | `string` | 路由使用的模式 |
| `router.currentRoute` | `Route` | 当前路由对应的路由信息对象 |
| `router.START_LOCATION` | `Route` | 初始路由地址，可用在导航守卫中区分初始导航 |

```javascript
import VueRouter from 'vue-router'

const router = new VueRouter({
  // ...
})

router.beforeEach((to, from) => {
  if (from === VueRouter.START_LOCATION) {
    // 初始导航
  }
})
```

## Router 实例方法

### 导航守卫注册

```javascript
router.beforeEach((to, from, next) => {
  /* 必须调用 `next` */
})

router.beforeResolve((to, from, next) => {
  /* 必须调用 `next` */
})

router.afterEach((to, from) => {})
```

在 2.5.0+ 这三个方法都返回一个「移除已注册守卫/钩子」的函数。

### 编程式导航

```javascript
router.push(location, onComplete?, onAbort?)
router.push(location).then(onComplete).catch(onAbort)
router.replace(location, onComplete?, onAbort?)
router.replace(location).then(onComplete).catch(onAbort)
router.go(n)
router.back()
router.forward()
```

### router.getMatchedComponents

```javascript
const matchedComponents: Array<Component> = router.getMatchedComponents(location?)
```

返回目标位置或当前路由匹配的组件数组（是定义/构造类，不是实例）。通常在服务端渲染的数据预加载时使用。

### router.resolve

```javascript
const resolved: {
  location: Location;
  route: Route;
  href: string;
} = router.resolve(location, current?, append?)
```

解析目标位置（格式和 `<router-link>` 的 `to` prop 一样）。

- `current`：当前默认的路由（通常不需要改变）
- `append`：允许在 `current` 路由上附加路径

### 动态路由

```typescript
// 添加一条新路由规则。若 name 已存在则覆盖
addRoute(route: RouteConfig): () => void

// 添加一条新路由作为现有路由的子路由
addRoute(parentName: string, route: RouteConfig): () => void

// 获取所有活跃的路由记录列表
getRoutes(): RouteRecord[]
```

> `router.addRoutes(routes)`（复数）**已废弃**，请使用 `router.addRoute()`。
>
> 关于 `getRoutes()`：只有文档中记录的 property 才被视为公共 API，避免使用 `regex` 等其它 property，因为它在 Vue Router 4 中不存在。

### router.onReady

```javascript
router.onReady(callback, [errorCallback])
```

把一个回调排队，在路由完成初始导航时调用——这意味着它可以解析所有异步进入钩子和路由初始化相关联的异步组件，可有效确保服务端渲染时服务端与客户端输出一致。

第二个参数 `errorCallback` 只在 2.4+ 支持，会在初始化路由解析出错（比如解析异步组件失败）时调用。

### router.onError

```javascript
router.onError(callback)
```

注册一个在路由导航出错时调用的回调。被调用的错误必须是下列情形之一：

- 错误在一个路由守卫函数中被同步抛出
- 错误在一个路由守卫函数中通过调用 `next(err)` 的方式异步捕获并处理
- 渲染路由过程中尝试解析异步组件时发生错误

## 高级匹配模式

vue-router 使用 [path-to-regexp](https://github.com/pillarjs/path-to-regexp/tree/v1.7.0) 作为路径匹配引擎，支持可选参数、零个或多个、自定义正则等模式：

```javascript
const router = new VueRouter({
  mode: 'history',
  routes: [
    { path: '/' },
    // 参数用冒号表示
    { path: '/params/:foo/:bar' },
    // 参数后加 ? 表示可选
    { path: '/optional-params/:foo?' },
    // 参数后可跟正则，只有 id 全为数字时才匹配
    { path: '/params-with-regex/:id(\\d+)' },
    // 星号匹配任意内容
    { path: '/asterisk/*' },
    // 用括号包裹并加 ? 使部分路径可选
    { path: '/optional-group/(foo/)?bar' }
  ]
})
```

### 通配符与 pathMatch

使用通配符 `*` 时，`$route.params` 内会自动添加一个 `pathMatch` 参数，包含 URL 被通配符匹配的部分：

```javascript
// 给出一个路由 { path: '/user-*' }
this.$router.push('/user-admin')
this.$route.params.pathMatch // 'admin'

// 给出一个路由 { path: '*' }
this.$router.push('/non-existing')
this.$route.params.pathMatch // '/non-existing'
```

> 含通配符的路由应放在最后。`{ path: '*' }` 通常用于客户端 404。

### 匹配优先级

同一个路径可以匹配多个路由时，**优先级按照路由的定义顺序**：定义得越早，优先级越高。

## 滚动行为

> 这个功能只在支持 `history.pushState` 的浏览器中可用。

创建 Router 实例时提供 `scrollBehavior` 方法：

```javascript
const router = new VueRouter({
  routes: [...],
  scrollBehavior (to, from, savedPosition) {
    // return 期望滚动到的位置
  }
})
```

第三个参数 `savedPosition` 当且仅当 `popstate` 导航（浏览器前进/后退按钮触发）时才可用。返回值可以是：

- `{ x: number, y: number }`
- `{ selector: string, offset?: { x: number, y: number } }`（`offset` 需 2.6.0+）

返回 falsy 值或空对象则不发生滚动。

```javascript
// 所有路由导航都滚动到顶部
scrollBehavior (to, from, savedPosition) {
  return { x: 0, y: 0 }
}

// 模拟浏览器原生的前进/后退表现
scrollBehavior (to, from, savedPosition) {
  if (savedPosition) {
    return savedPosition
  }
  return { x: 0, y: 0 }
}

// 模拟"滚动到锚点"
scrollBehavior (to, from, savedPosition) {
  if (to.hash) {
    return { selector: to.hash }
  }
}
```

### 异步滚动（2.8.0 新增）

返回一个 Promise 来得出预期的位置描述：

```javascript
scrollBehavior (to, from, savedPosition) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ x: 0, y: 0 })
    }, 500)
  })
}
```

### 平滑滚动

将 `behavior` 选项添加到返回对象中，即可为支持的浏览器启用原生平滑滚动：

```javascript
scrollBehavior (to, from, savedPosition) {
  if (to.hash) {
    return {
      selector: to.hash,
      behavior: 'smooth',
    }
  }
}
```

## 路由懒加载

结合 Vue 的异步组件和 Webpack 的代码分割功能，可以把不同路由对应的组件分割成不同代码块，在路由被访问时才加载：

```javascript
const Foo = () => import('./Foo.vue')

const router = new VueRouter({
  routes: [{ path: '/foo', component: Foo }]
})
```

> 如果使用 Babel，需要添加 `syntax-dynamic-import` 插件才能正确解析该语法。

### 把组件按组分块

使用命名 chunk（需要 Webpack > 2.4）把某个路由下的所有组件打包进同一个异步块：

```javascript
const Foo = () => import(/* webpackChunkName: "group-foo" */ './Foo.vue')
const Bar = () => import(/* webpackChunkName: "group-foo" */ './Bar.vue')
const Baz = () => import(/* webpackChunkName: "group-foo" */ './Baz.vue')
```

Webpack 会将相同块名称的异步模块组合到同一个异步块中。

## 导航故障（3.4.0 新增）

*导航故障*（navigation failures）表示一次失败的导航。以下情况用户会留在同一页面：

- 用户已经位于他们正在尝试导航到的页面
- 导航守卫通过调用 `next(false)` 中断了这次导航
- 导航守卫抛出了错误，或者调用了 `next(new Error())`

使用 `router-link` 时这些失败不会打印错误；但使用 `router.push` / `router.replace` 时，可能在控制台看到 `Uncaught (in promise) Error`。

> 从 3.1.0 开始，`router.push` 和 `router.replace` 在没有提供 `onComplete`/`onAbort` 回调时会返回一个 Promise，其 resolve/reject 分别代替这两个回调。

### 检测导航故障

导航故障是一个附带额外属性的 `Error` 实例，用 `isNavigationFailure` 检查：

```javascript
import VueRouter from 'vue-router'
const { isNavigationFailure, NavigationFailureType } = VueRouter

router.push('/admin').catch(failure => {
  if (isNavigationFailure(failure, NavigationFailureType.redirected)) {
    showToast('Login in order to access the admin panel')
  }
})
```

忽略第二个参数时，只检查这个错误是不是一个导航故障。

### NavigationFailureType

| 类型 | 触发条件 |
| --- | --- |
| `redirected` | 在导航守卫中调用了 `next(newLocation)` 重定向到其他地方 |
| `aborted` | 在导航守卫中调用了 `next(false)` 中断了本次导航 |
| `cancelled` | 当前导航还没完成之前又有了一个新的导航 |
| `duplicated` | 导航被阻止，因为已经在目标位置了 |

### 导航故障的属性

所有导航故障都有 `to` 和 `from` 属性，分别表达这次失败导航的目标位置和当前位置（都是规范化的路由位置）：

```javascript
router.push('/admin').catch(failure => {
  if (isNavigationFailure(failure, NavigationFailureType.redirected)) {
    failure.to.path   // '/admin'
    failure.from.path // '/'
  }
})
```

## 相关阅读

- [路由基础](01-路由基础.md)：安装、基本配置、路由模式与出口
- [路由进阶](02-路由进阶/01-路由参数与动态匹配.md)：动态路由匹配、嵌套路由、命名视图
- [路由守卫](04-路由守卫.md)：守卫分类、完整导航解析流程、路由元信息
