---
title: "Router 构建选项"
description: "vue-router 3（Vue 2）Router 构建选项、实例属性与实例方法参考：routes/mode/base、动态路由 addRoute、导航守卫、onReady 与 onError。"
category: 前端

---

# Router 构建选项

> 本目录为 Vue 2 时代的 vue-router 3.x 官方文档资料（Vue Router 3.x 对应 Vue 2；Vue Router 4.x 对应 Vue 3，Vue Router 3.x 已停止新特性开发）。

## Router 构建选项

### routes

类型: `Array<RouteConfig>`

```typescript
interface RouteConfig = {
  path: string,
  component?: Component,
  name?: string, // 命名路由
  components?: { [name: string]: Component }, // 命名视图组件
  redirect?: string | Location | Function,
  props?: boolean | Object | Function,
  alias?: string | Array<string>,
  children?: Array<RouteConfig>, // 嵌套路由
  beforeEnter?: (to: Route, from: Route, next: Function) => void,
  meta?: any,

  // 2.6.0+
  caseSensitive?: boolean, // 匹配规则是否大小写敏感？(默认值：false)
  pathToRegexpOptions?: Object // 编译正则的选项
}
```

### mode

-  默认值: `"hash" (浏览器环境) | "abstract" (Node.js 环境)` 
-  可选值: `"hash" | "history" | "abstract"`
  配置路由模式: 

-  `hash`: 使用 URL hash 值来作路由。支持所有浏览器，包括不支持 HTML5 History Api 的浏览器。 
-  `history`: 依赖 HTML5 History API 和服务器配置。查看 [HTML5 History 模式](https://router.vuejs.org/zh/guide/essentials/history-mode.html)。 
-  `abstract`: 支持所有 JavaScript 运行环境，如 Node.js 服务器端。**如果发现没有浏览器的 API，路由会自动强制进入这个模式**

### base

-  默认值: `"/"`
  应用的基路径。例如，如果整个单页应用服务在 `/app/` 下，然后 `base` 就应该设为 `"/app/"`。 

### linkActiveClass

-  类型: `string` 
-  默认值: `"router-link-active"`
  全局配置 `<router-link>` 默认的激活的 class

### linkExactActiveClass

-  类型: `string` 
-  默认值: `"router-link-exact-active"`
  全局配置 `<router-link>` 默认的精确激活的 class

### scrollBehavior

类型: `Function`，更多详情参考 [滚动行为](https://router.vuejs.org/zh/guide/advanced/scroll-behavior.html)

```typescript
type PositionDescriptor ={ x: number, y: number } |{ selector: string } | void

type scrollBehaviorHandler = (
  to: Route,
  from: Route,
  savedPosition?: { x: number, y: number }
) => PositionDescriptor | Promise<PositionDescriptor>
```

### parseQuery / stringifyQuery

-  类型: `Function`
  提供自定义查询字符串的解析/反解析函数。覆盖默认行为

### fallback

当浏览器不支持 `history.pushState` 控制路由是否应该回退到 `hash` 模式。默认值为 `true`
在 IE9 中，设置为 `false` 会使得每个 `router-link` 导航都触发整页刷新。它可用于工作在 IE9 下的服务端渲染应用，因为一个 hash 模式的 URL 并不支持服务端渲染

-  类型: `boolean` 
-  默认值: `true`

## Router 实例属性

### router.app

配置了`router`的 Vue 根实例

-  类型: `Vue instance`

### router.mode

路由使用的[模式](https://router.vuejs.org/zh/guide/essentials/history-mode.html)

-  类型: `string`

### router.currentRoute

当前路由对应的[路由信息对象](https://router.vuejs.org/zh/api/)

-  类型: `Route`

### router.START_LOCATION

以[路由信息对象](https://router.vuejs.org/zh/api/)的格式展示初始路由地址，即路由开始的地方。可用在导航守卫中以区分初始导航。 

-  类型：`Route`

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

### router.beforeEach

### router.beforeResolve

### router.afterEach

```javascript
router.beforeEach((to, from, next) => {
  /* 必须调用 `next` */
})

router.beforeResolve((to, from, next) => {
  /* 必须调用 `next` */
})

router.afterEach((to, from) => {})
```

增加全局的导航守卫。参考[导航守卫](https://router.vuejs.org/zh/guide/advanced/navigation-guards.html)。

在 2.5.0+ 这三个方法都返回一个移除已注册的守卫/钩子的函数

### router.push

### router.replace

### router.go

### router.back

### router.forward

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

函数签名：

```javascript
const matchedComponents: Array<Component> = router.getMatchedComponents(location?)
```

返回目标位置或是当前路由匹配的组件数组 (是数组的定义/构造类，不是实例)。通常在服务端渲染的数据预加载时使用。

### router.resolve

函数签名：

```javascript
const resolved: {
  location: Location;
  route: Route;
  href: string;
} = router.resolve(location, current?, append?)
```

解析目标位置 (格式和 `<router-link>` 的 `to` prop 一样)。

- `current` 是当前默认的路由 (通常你不需要改变它)
- `append` 允许你在 `current` 路由上附加路径 (如同 `router-link`)

### router.addRoutes

*已废弃*：使用 `router.addRoute()` 代替

函数签名：

```javascript
router.addRoutes(routes: Array<RouteConfig>)
```

动态添加更多的路由规则。参数必须是一个符合 `routes` 选项要求的数组。

### router.addRoute

添加一条新路由规则。如果该路由规则有 `name`，并且已经存在一个与之相同的名字，则会覆盖它

函数签名:

```typescript
addRoute(route: RouteConfig): () => void
```

### router.addRoute（作为子路由添加）

添加一条新的路由规则记录作为现有路由的子路由。如果该路由规则有 `name`，并且已经存在一个与之相同的名字，则会覆盖它

函数签名:

```typescript
addRoute(parentName: string, route: RouteConfig): () => void
```

### router.getRoutes

获取所有活跃的路由记录列表。**注意只有文档中记录下来的 property 才被视为公共 API**，避免使用任何其它 property，例如`regex`，因为它在 Vue Router 4 中不存在

函数签名:

```typescript
getRoutes(): RouteRecord[]
```

### router.onReady

函数签名：

```javascript
router.onReady(callback, [errorCallback])
```

该方法把一个回调排队，在路由完成初始导航时调用，这意味着它可以解析所有的异步进入钩子和路由初始化相关联的异步组件。

这可以有效确保服务端渲染时服务端和客户端输出的一致。

第二个参数 `errorCallback` 只在 2.4+ 支持。它会在初始化路由解析运行出错 (比如解析一个异步组件失败) 时被调用。

### router.onError

```javascript
router.onError(callback)
```

注册一个回调，该回调会在路由导航过程中出错时被调用。注意被调用的错误必须是下列情形中的一种

-  错误在一个路由守卫函数中被同步抛出
-  错误在一个路由守卫函数中通过调用 `next(err)` 的方式异步捕获并处理
-  渲染一个路由的过程中，需要尝试解析一个异步组件时发生错误

 