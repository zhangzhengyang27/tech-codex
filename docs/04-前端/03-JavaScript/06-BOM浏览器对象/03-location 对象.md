---
title: location 对象
description: "location 对象是浏览器对象模型（BOM）中的核心对象之一，提供当前窗口中加载文档的信息以及导航功能。它既是 window 对象的属性，也是 document 对象的属性，"
keywords: [location, 对象]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---


# location 对象

## 概述

`location` 对象是浏览器对象模型（BOM）中的核心对象之一，提供当前窗口中加载文档的信息以及导航功能。它既是 `window` 对象的属性，也是 `document` 对象的属性，即 `window.location` 和 `document.location` 引用同一个对象。

### 在 BOM 中的位置

```
window
  ├── document
  │    └── location ──┐
  ├── location ───────┼──> Location 对象
  ├── history         │
  ├── navigator       │
  └── screen          │
                      │
Location 对象         │
  ├── 属性（URL 信息）│
  │    ├── href       │
  │    ├── protocol   │
  │    ├── host       │
  │    ├── hostname   │
  │    ├── port       │
  │    ├── pathname   │
  │    ├── search     │
  │    ├── hash       │
  │    └── origin     │
  └── 方法（导航功能）│
       ├── assign()   │
       ├── replace()  │
       ├── reload()   │
       └── toString() │
```

### 核心功能

- **URL 解析**：将 URL 分解为独立的片段，便于访问各部分
- **页面导航**：提供多种导航方式（跳转、替换、刷新）
- **查询参数处理**：配合 `URLSearchParams` 处理查询字符串
- **路由管理**：支持单页应用（SPA）的 hash 路由

## URL 结构图解

一个完整的 URL 示例：

```
https://www.example.com:8080/path/to/page?key=value&name=test#section
│      │                │    │            │                   │       │
│      │                │    │            │                   │       └─ hash
│      │                │    │            │                   └─ search（查询字符串）
│      │                │    │            └─ pathname（路径）
│      │                │    └─ port（端口）
│      │                └─ hostname（主机名）
│      └─ host（主机名:端口）
└─ protocol（协议）

完整 URL：href
源地址：origin = protocol + "//" + host
```

## location 对象属性

### 属性列表

| 属性名      | 只读 | 说明                                           | 示例值                           |
| ----------- | ---- | ---------------------------------------------- | -------------------------------- |
| `href`      | 否   | 完整的 URL，修改会触发页面跳转                  | `https://example.com:8080/path`  |
| `origin`    | 是   | URL 的源地址（协议+域名+端口）                 | `https://example.com:8080`       |
| `protocol`  | 否   | 协议名称（包含冒号）                           | `https:`                         |
| `host`      | 否   | 主机名和端口号                                 | `example.com:8080`               |
| `hostname`  | 否   | 主机名（不含端口）                             | `example.com`                    |
| `port`      | 否   | 端口号，空字符串表示默认端口                   | `8080` 或 `""`                   |
| `pathname`  | 否   | 路径部分（以 `/` 开头）                        | `/path/to/page`                  |
| `search`    | 否   | 查询字符串（以 `?` 开头）                      | `?key=value&name=test`           |
| `hash`      | 否   | URL 片段标识符（以 `#` 开头），修改不刷新页面  | `#section`                       |

### 属性详解

#### href

`href` 是最常用的属性，返回或设置完整的 URL：

```javascript
// 获取完整 URL
console.log(location.href)
// "https://www.example.com:8080/path/to/page?key=value#section"

// 设置 URL（触发页面跳转）
location.href = "https://www.example.com/new-page"

// 等价于
location.assign("https://www.example.com/new-page")
```

#### origin（只读）

`origin` 返回 URL 的源地址，由协议、主机名和端口组成：

```javascript
console.log(location.origin)
// "https://www.example.com:8080"

// 用于判断是否同源
if (urlObj.origin === location.origin) {
  console.log("同源请求")
}
```

#### protocol

返回或设置 URL 的协议部分：

```javascript
console.log(location.protocol) // "https:" 或 "http:"

// 判断是否安全连接
if (location.protocol === "https:") {
  console.log("安全连接")
}
```

#### host 和 hostname

- `host`：包含端口号的主机信息
- `hostname`：仅主机名

```javascript
// URL: https://example.com:8080/path
console.log(location.host)     // "example.com:8080"
console.log(location.hostname) // "example.com"

// URL: https://example.com/path (默认端口 443)
console.log(location.host)     // "example.com"
console.log(location.hostname) // "example.com"
console.log(location.port)     // "" (空字符串)
```

#### port

返回端口号，如果使用默认端口（http:80, https:443）则返回空字符串：

```javascript
// URL: https://example.com:8080/path
console.log(location.port) // "8080"

// URL: https://example.com/path
console.log(location.port) // ""

// 判断是否使用非标准端口
const isNonStandardPort = location.port !== ""
```

#### pathname

返回 URL 的路径部分：

```javascript
// URL: https://example.com/path/to/page.html
console.log(location.pathname) // "/path/to/page.html"

// 修改路径（会刷新页面）
location.pathname = "/new-path"
```

#### search

返回查询字符串（包含 `?`）：

```javascript
// URL: https://example.com/page?key=value&name=test
console.log(location.search) // "?key=value&name=test"

// 修改查询参数（会刷新页面）
location.search = "?page=1&limit=10"
```

#### hash

返回 URL 的片段标识符，修改此属性不会刷新页面：

```javascript
// URL: https://example.com/page#section
console.log(location.hash) // "#section"

// 修改 hash（不会刷新页面，但会触发 hashchange 事件）
location.hash = "#new-section"

// 移除 hash
location.hash = ""
```

### 属性修改对页面的影响

```javascript
// ⚠️ 会刷新页面的属性修改
location.href = "/new-page"
location.protocol = "https:"
location.host = "newdomain.com"
location.hostname = "newdomain.com"
location.port = "8080"
location.pathname = "/new-path"
location.search = "?key=value"

// ✅ 不会刷新页面的属性修改
location.hash = "#section"
```

## 查询字符串处理

### 传统方法：自定义解析函数

虽然 `location.search` 返回查询字符串，但无法直接访问单个参数。传统做法是自定义解析函数：

```javascript
/**
 * 解析查询字符串
 * @returns {Object} 包含所有查询参数的对象
 */
function getQueryStringArgs() {
  // 获取查询字符串（去掉开头的 ?）
  const qs = location.search.length > 0 ? location.search.substring(1) : ""
  const args = {}

  // 解析参数
  for (let item of qs.split("&").map((kv) => kv.split("="))) {
    const name = decodeURIComponent(item[0])
    const value = decodeURIComponent(item[1] || "")
    if (name.length) {
      args[name] = value
    }
  }

  return args
}

// 使用示例
// URL: ?q=javascript&num=10
const args = getQueryStringArgs()
console.log(args["q"])   // "javascript"
console.log(args["num"]) // "10"
```

### 现代方法：URLSearchParams API

`URLSearchParams` 是现代浏览器提供的标准 API，专门用于处理查询字符串，更简洁高效。

#### 构造方法

```javascript
// 方式 1：从查询字符串创建
const params1 = new URLSearchParams("?key=value&name=test")

// 方式 2：从 location.search 创建
const params2 = new URLSearchParams(location.search)

// 方式 3：从对象创建
const params3 = new URLSearchParams({ key: "value", name: "test" })

// 方式 4：从序列化字符串创建
const params4 = new URLSearchParams("key=value&name=test")
```

#### API 方法详解

| 方法                    | 说明                               | 返回值              |
| ----------------------- | ---------------------------------- | ------------------- |
| `get(name)`             | 获取指定参数的第一个值             | 字符串或 `null`     |
| `getAll(name)`          | 获取指定参数的所有值（同名参数）   | 数组                |
| `has(name)`             | 检查是否存在指定参数               | 布尔值              |
| `set(name, value)`      | 设置参数值（覆盖所有同名参数）     | `undefined`         |
| `append(name, value)`   | 追加参数值（不覆盖同名参数）       | `undefined`         |
| `delete(name)`          | 删除指定参数的所有值               | `undefined`         |
| `toString()`            | 返回序列化的查询字符串             | 字符串              |
| `keys()`                | 返回所有参数名的迭代器             | Iterator            |
| `values()`              | 返回所有参数值的迭代器             | Iterator            |
| `entries()`             | 返回所有键值对的迭代器             | Iterator            |
| `forEach(callback)`     | 遍历所有参数                       | `undefined`         |
| `sort()`                | 按参数名排序                       | `undefined`         |
| `size`                  | 返回参数的数量                     | 数值                |

#### 基本用法示例

```javascript
const qs = "?q=javascript&num=10&page=1&page=2"
const params = new URLSearchParams(qs)

// 获取参数
console.log(params.get("q"))        // "javascript"
console.log(params.get("num"))      // "10"
console.log(params.get("unknown"))  // null

// 获取同名参数的所有值
console.log(params.getAll("page"))  // ["1", "2"]

// 检查参数是否存在
console.log(params.has("q"))        // true
console.log(params.has("unknown"))  // false

// 获取参数数量
console.log(params.size)            // 4
```

#### 修改参数示例

```javascript
const params = new URLSearchParams("?name=John&age=30")

// 设置参数（覆盖）
params.set("age", "31")
console.log(params.toString()) // "name=John&age=31"

// 追加参数
params.append("hobby", "reading")
params.append("hobby", "coding")
console.log(params.toString()) // "name=John&age=31&hobby=reading&hobby=coding"

// 删除参数
params.delete("age")
console.log(params.toString()) // "name=John&hobby=reading&hobby=coding"

// 排序参数
params.sort()
console.log(params.toString()) // "hobby=reading&hobby=coding&name=John"
```

#### 迭代器使用

```javascript
const params = new URLSearchParams("?q=javascript&num=10")

// 方式 1：直接迭代（返回键值对数组）
for (const [key, value] of params) {
  console.log(`${key}: ${value}`)
}
// 输出:
// q: javascript
// num: 10

// 方式 2：使用 keys()
for (const key of params.keys()) {
  console.log(key)
}
// q
// num

// 方式 3：使用 values()
for (const value of params.values()) {
  console.log(value)
}
// javascript
// 10

// 方式 4：使用 entries()
for (const [key, value] of params.entries()) {
  console.log(key, value)
}
// q javascript
// num 10

// 方式 5：使用 forEach()
params.forEach((value, key) => {
  console.log(`${key}: ${value}`)
})
```

#### 转换为对象

```javascript
const params = new URLSearchParams("?name=John&age=30&hobby=reading&hobby=coding")

// 方式 1：Object.fromEntries（同名参数只保留最后一个）
const obj = Object.fromEntries(params)
console.log(obj)
// { name: "John", age: "30", hobby: "coding" }

// 方式 2：手动处理同名参数
function paramsToObject(params) {
  const result = {}
  for (const [key, value] of params) {
    if (key in result) {
      if (Array.isArray(result[key])) {
        result[key].push(value)
      } else {
        result[key] = [result[key], value]
      }
    } else {
      result[key] = value
    }
  }
  return result
}

console.log(paramsToObject(params))
// { name: "John", age: "30", hobby: ["reading", "coding"] }
```

#### 与 location 对象结合

```javascript
// 解析当前 URL 的查询参数
const params = new URLSearchParams(location.search)

// 获取参数
const page = params.get("page") || "1"
const limit = params.get("limit") || "10"

// 修改并更新 URL
params.set("page", "2")
location.search = params.toString() // 页面会刷新
```

## location 对象方法

### 方法概览

| 方法                     | 说明                                       | 是否产生历史记录 |
| ------------------------ | ------------------------------------------ | ---------------- |
| `assign(url)`            | 加载新文档                                 | 是               |
| `replace(url)`           | 替换当前文档                               | 否               |
| `reload(forceReload?)`   | 重新加载当前页面                           | -                |
| `toString()`             | 返回完整 URL，等同于 `location.href`       | -                |

### assign(url)

加载指定的 URL，并在浏览器历史记录中添加新记录。

```javascript
// 基本用法
location.assign("https://www.example.com")

// 以下三种方式效果相同
location.assign("https://www.example.com")
location.href = "https://www.example.com"
window.location = "https://www.example.com"
```

**使用场景**：
- 正常的页面跳转
- 需要保留浏览器后退功能

### replace(url)

替换当前文档，不会在历史记录中生成新记录，用户无法通过"后退"按钮返回。

```javascript
// 替换当前页面
location.replace("https://www.example.com")
```

**使用场景**：
- 登录成功后跳转，防止用户返回登录页
- 页面重定向
- 防止表单重复提交

#### 示例：登录后重定向

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>登录页面</title>
</head>
<body>
  <form id="loginForm">
    <input type="text" name="username" placeholder="用户名" required>
    <input type="password" name="password" placeholder="密码" required>
    <button type="submit">登录</button>
  </form>

  <script>
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault()
      
      // 执行登录逻辑
      const success = await login()
      
      if (success) {
        // 使用 replace 防止返回登录页
        location.replace("/dashboard")
      }
    })
  </script>
</body>
</html>
```

### reload(forceReload?)

重新加载当前页面。

**参数说明**：
- `forceReload`（可选）：
  - `true`：强制从服务器重新加载
  - `false` 或不传参：优先从缓存加载（如果页面未修改）

> ⚠️ 注意：`forceReload` 参数并非标准——现代规范中 `location.reload()` 不接受参数，Chrome/Safari 等浏览器会忽略它（历史上仅 Firefox 支持）。需要控制缓存行为时应使用缓存控制响应头（见文末 FAQ Q6）。

```javascript
// 从缓存重新加载（推荐）
location.reload()

// 强制从服务器重新加载
location.reload(true)

// 注意：reload() 后的代码可能不会执行
location.reload()
console.log("这行代码可能不会执行") // ⚠️ 警告
```

> ⚠️ **注意事项**
> - `reload()` 之后的代码可能不会执行
> - 建议将 `reload()` 放在代码最后
> - 频繁使用 `reload(true)` 会增加服务器负担

#### 示例：条件刷新

```javascript
// 根据条件决定是否刷新
function refreshIfModified() {
  fetch("/api/check-update")
    .then(res => res.json())
    .then(data => {
      if (data.modified) {
        location.reload()
      }
    })
}

// 定时刷新（慎用）
let refreshInterval = setInterval(() => {
  if (document.visibilityState === "visible") {
    location.reload()
  }
}, 60000) // 每分钟刷新一次

// 清除定时刷新
clearInterval(refreshInterval)
```

### toString()

返回完整的 URL 字符串，等同于 `location.href`。

```javascript
console.log(location.toString())
// 等同于
console.log(location.href)
```

## URL 对象

`URL` 是现代浏览器提供的标准 API，用于解析和构建 URL。与 `location` 对象相比，修改 `URL` 对象的属性不会触发页面导航。

### 创建 URL 对象

```javascript
// 从完整 URL 创建
const url1 = new URL("https://www.example.com:8080/path?key=value#section")

// 从相对 URL 创建（需要基础 URL）
const url2 = new URL("/path", "https://www.example.com")

// 从 location 创建
const url3 = new URL(window.location.href)
```

### URL 对象属性

```javascript
const url = new URL("https://www.example.com:8080/path/to/page?key=value#section")

console.log(url.href)      // 完整 URL
console.log(url.origin)    // "https://www.example.com:8080"
console.log(url.protocol)  // "https:"
console.log(url.host)      // "www.example.com:8080"
console.log(url.hostname)  // "www.example.com"
console.log(url.port)      // "8080"
console.log(url.pathname)  // "/path/to/page"
console.log(url.search)    // "?key=value"
console.log(url.hash)      // "#section"

// searchParams 是 URLSearchParams 实例
console.log(url.searchParams.get("key")) // "value"
```

### URL 对象与 location 对象对比

| 特性         | location 对象                | URL 对象                         |
| ------------ | ---------------------------- | -------------------------------- |
| 创建方式     | 浏览器内置，直接访问         | 需要 `new URL()` 构造            |
| 修改属性     | 触发页面导航                 | 仅修改对象，不触发导航           |
| 查询参数     | 需要配合 `URLSearchParams`   | 内置 `searchParams` 属性         |
| 使用场景     | 页面导航、获取当前页面信息   | URL 解析、构建、测试             |
| 跨域支持     | 受同源策略限制               | 可解析任意 URL                   |
| 环境支持     | 仅浏览器环境                 | 浏览器 + Node.js                 |

### 使用示例

```javascript
// 解析和修改 URL（不触发导航）
const url = new URL(window.location.href)
url.pathname = "/new-path"
url.searchParams.set("page", "2")

// 输出修改后的 URL（页面不会刷新）
console.log(url.toString())

// 需要导航时再赋值给 location
location.href = url.toString()
```

## 实际应用场景

### 1. 获取和解析 URL 信息

```javascript
/**
 * 获取当前页面的完整 URL 信息
 * @returns {Object} URL 信息对象
 */
function getCurrentPageInfo() {
  return {
    fullUrl: location.href,
    protocol: location.protocol.replace(":", ""),
    isSecure: location.protocol === "https:",
    host: location.host,
    hostname: location.hostname,
    port: location.port || (location.protocol === "https:" ? "443" : "80"),
    path: location.pathname,
    query: location.search,
    params: Object.fromEntries(new URLSearchParams(location.search)),
    hash: location.hash.slice(1),
    origin: location.origin
  }
}

// 使用示例
console.log(getCurrentPageInfo())
```

### 2. 构建 URL

```javascript
/**
 * 构建带参数的 URL
 * @param {string} baseUrl - 基础 URL
 * @param {Object} params - 参数对象
 * @returns {string} 完整 URL
 */
function buildURL(baseUrl, params = {}) {
  const url = new URL(baseUrl)
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // 数组值：每个元素作为一个同名参数
        value.forEach((v) => url.searchParams.append(key, v))
      } else {
        url.searchParams.set(key, value)
      }
    }
  })

  return url.toString()
}

// 使用示例
const apiUrl = buildURL("https://api.example.com/users", {
  page: 1,
  limit: 20,
  sort: "name",
  tags: ["js", "ts"]
})
console.log(apiUrl)
// "https://api.example.com/users?page=1&limit=20&sort=name&tags=js&tags=ts"
```

### 3. 单页应用（SPA）路由

```javascript
/**
 * 简单的 hash 路由实现
 */
class HashRouter {
  constructor() {
    this.routes = {}
    this.init()
  }

  init() {
    // 监听 hash 变化
    window.addEventListener("hashchange", () => this.handleRoute())
    // 首次加载也执行一次路由匹配
    window.addEventListener("load", () => this.handleRoute())
  }

  // 注册路由
  route(path, handler) {
    this.routes[path] = handler
    return this
  }

  // 执行路由匹配
  handleRoute() {
    const hash = location.hash.slice(1) || "/"
    const handler = this.routes[hash] || this.routes["*"]
    handler && handler()
  }

  // 导航到指定路径
  navigate(path) {
    location.hash = path
  }
}

const router = new HashRouter()
router
  .route("/", () => renderHomePage())
  .route("/about", () => renderAboutPage())
  .route("*", () => render404Page())

// 导航
router.navigate("/about")
```

### 4. 条件重定向

```javascript
/**
 * 根据条件执行重定向
 * @param {Object} rules - 重定向规则
 */
function conditionalRedirect(rules) {
  const currentPath = location.pathname
  const currentSearch = location.search
  
  for (const [pattern, target] of Object.entries(rules)) {
    if (typeof pattern === "string" && currentPath === pattern) {
      location.replace(target)
      return
    }
    
    if (pattern instanceof RegExp && pattern.test(currentPath)) {
      const newUrl = currentPath.replace(pattern, target)
      location.replace(newUrl)
      return
    }
  }
}

// 使用示例
conditionalRedirect({
  "/old-page": "/new-page",
  "/legacy/.*": "/modern", // 正则匹配
})
```

### 5. 查询参数管理

```javascript
/**
 * 查询参数管理类
 */
class QueryParams {
  constructor() {
    this.params = new URLSearchParams(location.search)
  }

  /**
   * 获取参数值
   * @param {string} key - 参数名
   * @param {*} defaultValue - 默认值
   * @returns {string|null}
   */
  get(key, defaultValue = null) {
    return this.params.get(key) ?? defaultValue
  }

  /**
   * 获取数字类型的参数值
   */
  getNumber(key, defaultValue = 0) {
    const value = Number(this.params.get(key))
    return Number.isNaN(value) ? defaultValue : value
  }

  /**
   * 链式设置参数
   */
  set(key, value) {
    this.params.set(key, value)
    return this
  }

  toString() {
    return this.params.toString()
  }
}

// 使用示例
const query = new QueryParams()
const page = query.getNumber("page", 1)
query.set("page", 2).set("sort", "date")
```

### 6. 页面刷新策略

```javascript
/**
 * 智能刷新策略
 */
class RefreshManager {
  constructor() {
    this.lastRefreshTime = 0
    this.minInterval = 5000 // 最小刷新间隔 5 秒
  }

  /**
   * 刷新页面（带节流）
   * @param {boolean} force - 是否强制从服务器刷新
   */
  refresh(force = false) {
    const now = Date.now()
    if (now - this.lastRefreshTime < this.minInterval) {
      console.warn("刷新过于频繁，已忽略本次操作")
      return
    }
    this.lastRefreshTime = now
    location.reload(force)
  }
}

// 使用示例
const refreshManager = new RefreshManager()
refreshManager.refresh()
```

## 事件监听

### hashchange 事件

当 URL 的 hash 部分发生变化时触发。

```javascript
// 监听 hash 变化
window.addEventListener("hashchange", (event) => {
  console.log("旧 URL:", event.oldURL)
  console.log("新 URL:", event.newURL)
  console.log("当前 hash:", location.hash)
  
  // 根据 hash 执行操作
  const hash = location.hash.slice(1)
  renderContent(hash)
})

// 触发 hash 变化（不会刷新页面）
location.hash = "#section1"
```

### popstate 事件

当用户点击浏览器前进/后退按钮时触发（需要配合 History API）。

```javascript
// 监听历史记录变化
window.addEventListener("popstate", (event) => {
  console.log("状态对象:", event.state)
  console.log("当前路径:", location.pathname)
  
  // 根据状态更新页面
  if (event.state && event.state.page) {
    renderPage(event.state.page)
  }
})

// 使用 pushState 添加历史记录
history.pushState({ page: "home" }, "Home", "/home")
```

### 完整的路由监听示例

```javascript
/**
 * 支持多种路由模式的路由器
 */
class Router {
  constructor(options = {}) {
    this.mode = options.mode || "hash" // hash | history
    this.routes = []
    this.currentRoute = null
    this.init()
  }

  init() {
    if (this.mode === "hash") {
      window.addEventListener("hashchange", () => this.handleRoute())
      window.addEventListener("load", () => this.handleRoute())
    } else {
      window.addEventListener("popstate", () => this.handleRoute())
    }
  }

  // 注册路由（支持 /user/:id 形式的路径参数）
  on(path, handler) {
    const keys = []
    const pattern =
      path === "*"
        ? /^.*$/
        : new RegExp(
            "^" +
              path.replace(/:(\w+)/g, (_, key) => {
                keys.push(key)
                return "([^/]+)"
              }) +
              "$"
          )
    this.routes.push({ path, pattern, keys, handler })
    return this
  }

  // 执行路由匹配
  handleRoute() {
    const path = this.mode === "hash" ? location.hash.slice(1) || "/" : location.pathname
    for (const route of this.routes) {
      const match = path.match(route.pattern)
      if (match) {
        const params = {}
        route.keys.forEach((key, i) => (params[key] = match[i + 1]))
        route.handler(params)
        return
      }
    }
  }

  // 导航
  navigate(path) {
    if (this.mode === "hash") {
      location.hash = path
    } else {
      history.pushState({}, "", path)
      this.handleRoute()
    }
  }
}

const router = new Router({ mode: "history" })
router
  .on("/", () => console.log("首页"))
  .on("/about", () => console.log("关于页面"))
  .on("/user/:id", (params) => console.log("用户页面:", params.id))
  .on("*", () => console.log("404 页面"))

router.navigate("/user/123")
```

## 安全最佳实践

### 1. 防止开放重定向漏洞

开放重定向是一种常见的安全漏洞，攻击者可能利用它进行钓鱼攻击。

```javascript
/**
 * ❌ 不安全：直接使用用户输入进行重定向
 */
function unsafeRedirect(url) {
  location.href = url // 危险！可能被利用进行钓鱼攻击
}

/**
 * ✅ 安全：验证 URL 后再重定向
 */
function safeRedirect(url) {
  try {
    const urlObj = new URL(url, location.origin)

    // 只允许同源 URL 或白名单域名的重定向
    const allowedOrigins = [location.origin, "https://www.example.com"]
    if (!allowedOrigins.includes(urlObj.origin)) {
      return "/"
    }

    return urlObj.toString()
  } catch {
    // 如果验证失败，重定向到安全页面
    return "/"
  }
}
```

### 2. 验证和清理 URL 参数

```javascript
/**
 * URL 参数验证器
 */
class URLParamValidator {
  constructor(rules) {
    this.rules = rules
    this.params = new URLSearchParams(location.search)
  }

  /**
   * 验证所有参数
   * @returns {{ valid: boolean, params: Object, errors: string[] }}
   */
  validate() {
    const result = { valid: true, params: {}, errors: [] }

    for (const [key, rule] of Object.entries(this.rules)) {
      const value = this.params.get(key)

      if (value === null) {
        if (rule.required) {
          result.valid = false
          result.errors.push(`缺少参数: ${key}`)
        }
        continue
      }

      if (rule.pattern && !rule.pattern.test(value)) {
        result.valid = false
        result.errors.push(`参数 ${key} 格式不正确`)
        continue
      }

      result.params[key] = value
    }

    return result
  }
}

// 使用示例
const validator = new URLParamValidator({
  page: { required: false, pattern: /^\d+$/ },
  q: { required: true, pattern: /^[\w\s-]{1,50}$/ }
})

const result = validator.validate()
if (result.valid) {
  console.log("验证通过的参数:", result.params)
} else {
  console.error("参数验证错误:", result.errors)
}
```

### 3. XSS 防护

```javascript
/**
 * 安全的 URL 参数处理
 */
function safeGetParam(key) {
  const params = new URLSearchParams(location.search)
  const value = params.get(key)
  
  if (value === null) return null
  
  // 移除潜在的恶意脚本
  return value
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
}

/**
 * 安全地将参数插入 DOM
 */
function safeDisplayParam(key, element) {
  const value = safeGetParam(key)
  if (value) {
    element.textContent = value // 使用 textContent 而非 innerHTML
  }
}
```

## 性能优化建议

### 1. 避免频繁操作 URL

```javascript
/**
 * ❌ 不好的做法：频繁修改 URL
 */
location.search = "?page=1"
location.search = "?page=2"
location.search = "?page=3"

/**
 * ✅ 好的做法：批量更新
 */
const params = new URLSearchParams(location.search)
params.set("page", "1")
params.set("limit", "10")
params.set("sort", "date")
location.search = params.toString()
```

### 2. 使用 History API 代替页面刷新

```javascript
/**
 * ❌ 不好的做法：刷新整个页面
 */
function updatePage(page) {
  location.search = `?page=${page}` // 页面完全刷新
}

/**
 * ✅ 好的做法：使用 History API
 */
function updatePage(page) {
  const url = new URL(location.href)
  url.searchParams.set("page", page)
  
  history.pushState({ page }, "", url)
  updateContent(page) // 只更新内容，不刷新页面
}
```

### 3. 缓存 URL 解析结果

```javascript
/**
 * URL 信息缓存
 */
const URLCache = {
  _data: null,
  _timestamp: 0,
  _ttl: 1000, // 缓存 1 秒

  get() {
    const now = Date.now()
    if (this._data && now - this._timestamp < this._ttl) {
      return this._data
    }
    
    this._data = {
      href: location.href,
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
      params: Object.fromEntries(new URLSearchParams(location.search))
    }
    this._timestamp = now
    return this._data
  },

  invalidate() {
    this._data = null
    this._timestamp = 0
  }
}
```

## 浏览器兼容性

### URLSearchParams 兼容性

| 特性                          | Chrome | Firefox | Safari | Edge |
| ----------------------------- | ------ | ------- | ------ | ---- |
| URLSearchParams               | 49+    | 29+     | 10.1+  | 17+  |
| URLSearchParams.has()         | 49+    | 29+     | 10.1+  | 17+  |
| URLSearchParams.sort()        | 61+    | 54+     | 11+    | 17+  |
| URLSearchParams.forEach()     | 49+    | 29+     | 10.1+  | 17+  |
| URLSearchParams.values()      | 49+    | 44+     | 10.1+  | 17+  |
| URLSearchParams.keys()        | 49+    | 44+     | 10.1+  | 17+  |
| URLSearchParams.entries()     | 49+    | 44+     | 10.1+  | 17+  |

### URL 对象兼容性

| 特性            | Chrome | Firefox | Safari | Edge |
| --------------- | ------ | ------- | ------ | ---- |
| URL 构造函数    | 19+    | 26+     | 6.1+   | 12+  |
| URL.searchParams | 51+   | 52+     | 11+    | 17+  |
| URL.toJSON()    | 71+    | 63+     | 14+    | 17+  |

### Polyfill 方案

```javascript
// URLSearchParams Polyfill（简单实现）
if (typeof URLSearchParams === "undefined") {
  window.URLSearchParams = function(init) {
    this.params = {}
    
    if (typeof init === "string") {
      init = init.replace(/^\?/, "")
      init.split("&").forEach(pair => {
        const [key, value = ""] = pair.split("=").map(decodeURIComponent)
        if (key) {
          if (this.params[key]) {
            if (Array.isArray(this.params[key])) {
              this.params[key].push(value)
            } else {
              this.params[key] = [this.params[key], value]
            }
          } else {
            this.params[key] = value
          }
        }
      })
    }
  }

  window.URLSearchParams.prototype.get = function (key) {
    const value = this.params[key]
    return Array.isArray(value) ? value[0] : value !== undefined ? value : null
  }

  window.URLSearchParams.prototype.getAll = function (key) {
    const value = this.params[key]
    return Array.isArray(value) ? value : value !== undefined ? [value] : []
  }

  window.URLSearchParams.prototype.toString = function () {
    return Object.keys(this.params)
      .map((key) => {
        const values = Array.isArray(this.params[key]) ? this.params[key] : [this.params[key]]
        return values.map((value) => {
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
      })
      })
      .reduce((acc, cur) => acc.concat(cur), [])
      .join("&")
  }
}
```

## 常见问题（FAQ）

### Q1: location.assign() 和 location.replace() 的区别？

**A**: 主要区别在于历史记录：

- `assign()`: 会在历史记录中添加新记录，用户可以点击"后退"返回
- `replace()`: 替换当前记录，用户无法通过"后退"返回

```javascript
// 场景 1：正常页面跳转
location.assign("/home") // 用户可以后退

// 场景 2：登录后跳转
location.replace("/dashboard") // 用户不应该返回登录页
```

### Q2: 为什么修改 location.hash 不会刷新页面？

**A**: `hash` 的设计初衷是实现页面内的锚点导航，浏览器将其视为同一页面的不同位置，因此不会重新加载页面。这使得 `hash` 成为单页应用（SPA）路由的理想选择。

### Q3: URLSearchParams 返回的值为什么都是字符串？

**A**: URL 查询字符串本质上就是文本格式，`URLSearchParams` 保持原始格式，不做类型转换。需要时需手动转换：

```javascript
const params = new URLSearchParams("?page=1&active=true")

// 手动类型转换
const page = parseInt(params.get("page"), 10) // 1 (number)
const active = params.get("active") === "true" // true (boolean)
```

### Q4: 如何处理同名参数？

**A**: 使用 `getAll()` 方法获取所有值：

```javascript
const params = new URLSearchParams("?tag=js&tag=ts&tag=react")

// ❌ get() 只返回第一个值
console.log(params.get("tag")) // "js"

// ✅ getAll() 返回所有值
console.log(params.getAll("tag")) // ["js", "ts", "react"]
```

### Q5: 如何判断当前是否使用 HTTPS？

```javascript
// 方式 1：检查 protocol
const isHTTPS = location.protocol === "https:"

// 方式 2：检查 origin
const isHTTPS = location.origin.startsWith("https://")

// 方式 3：使用 URL 对象
const url = new URL(location.href)
const isHTTPS = url.protocol === "https:"
```

### Q6: location.reload(true) 是否已被废弃？

**A**: 是的，`location.reload(true)` 参数在现代浏览器中已不推荐使用。现代浏览器会自动判断是否需要从服务器重新加载。建议直接使用 `location.reload()`，如有需要可通过设置缓存控制头来控制刷新行为。

### Q7: 如何在不刷新页面的情况下修改 URL？

**A**: 使用 History API：

```javascript
// 添加历史记录
history.pushState({ page: 1 }, "", "/page/1")

// 替换当前历史记录
history.replaceState({ page: 2 }, "", "/page/2")

// 配合 popstate 事件监听
window.addEventListener("popstate", (event) => {
  console.log("导航到:", location.pathname)
})
```

### Q8: 如何获取当前页面所在域名的根域名？

```javascript
/**
 * 获取根域名
 */
function getRootDomain() {
  const hostname = location.hostname
  const parts = hostname.split(".")
  
  // 简单处理（不适用于所有情况）
  if (parts.length >= 2) {
    return parts.slice(-2).join(".")
  }
  
  return hostname
}

// 示例
// location.hostname = "sub.example.com"
console.log(getRootDomain()) // "example.com"
```

## 常见错误和注意事项

### 1. 修改属性导致页面重新加载

```javascript
// ❌ 错误：这些属性的修改会触发页面重新加载
location.hostname = "newdomain.com" // 页面会重新加载
location.pathname = "/new-path"     // 页面会重新加载
location.port = "8080"              // 页面会重新加载
location.search = "?key=value"      // 页面会重新加载

// ✅ 正确：只有 hash 不会导致重新加载
location.hash = "#section"          // 不会重新加载页面

// ✅ 如果需要修改多个部分但不刷新页面，使用 History API
history.pushState(null, "", "/new-path?key=value#section")
```

### 2. reload() 后的代码可能不执行

```javascript
// ❌ 错误：reload 后的代码可能不会执行
location.reload()
console.log("这行代码可能不会执行")
doSomething()

// ✅ 正确：将 reload 放在最后
console.log("这行代码会执行")
doSomething()
location.reload() // 放在最后
```

### 3. URLSearchParams 的值都是字符串

```javascript
// URLSearchParams 返回的值都是字符串
const params = new URLSearchParams("?page=1&limit=10")
console.log(typeof params.get("page")) // "string"

// ✅ 需要时进行类型转换
const page = parseInt(params.get("page"), 10) || 1
const limit = parseInt(params.get("limit"), 10) || 10
```

### 4. 处理多个同名参数

```javascript
// URLSearchParams 的 get() 只返回第一个值
const params = new URLSearchParams("?tag=js&tag=ts")
console.log(params.get("tag")) // "js"

// ✅ 使用 getAll() 获取所有值
console.log(params.getAll("tag")) // ["js", "ts"]
```

### 5. 相对路径和绝对路径

```javascript
// 相对路径
location.href = "/new-page"     // 相对于当前域名
location.href = "new-page"      // 相对于当前路径

// 绝对路径
location.href = "https://example.com/new-page" // 完整 URL

// ✅ 使用 URL 对象处理相对路径
const baseUrl = location.origin
const newUrl = new URL("/new-page", baseUrl)
location.href = newUrl.toString()
```

### 6. 跨域限制

```javascript
// ❌ 错误：无法访问跨域页面的 location
const iframe = document.querySelector("iframe")
console.log(iframe.contentWindow.location.href) // 可能抛出安全错误

// ✅ 正确：使用 postMessage 进行跨域通信
iframe.contentWindow.postMessage({ type: "getLocation" }, "*")

window.addEventListener("message", (event) => {
  if (event.data.type === "locationResponse") {
    console.log("iframe URL:", event.data.url)
  }
})
```

### 7. 处理特殊字符

```javascript
// URL 中的特殊字符需要编码
const searchTerm = "hello world & more"
const params = new URLSearchParams({ q: searchTerm })
console.log(params.toString()) // "q=hello+world+%26+more"

// ✅ 使用 URLSearchParams 自动处理编码
const params2 = new URLSearchParams()
params2.set("q", "hello world & more")
console.log(params2.toString()) // "q=hello+world+%26+more"

// 手动编码和解码
const encoded = encodeURIComponent("hello world")
const decoded = decodeURIComponent(encoded)
```

## 相关 API

### History API

`History API` 与 `location` 对象密切相关，用于操作浏览器历史记录：

```javascript
// 前进/后退
history.back()      // 后退一页
history.forward()   // 前进一页
history.go(-2)      // 后退两页

// 添加历史记录（不刷新页面）
history.pushState({ page: 1 }, "Title", "/page/1")

// 替换当前历史记录
history.replaceState({ page: 2 }, "Title", "/page/2")

// 获取历史记录数量
console.log(history.length)
```

### Navigator API

获取浏览器信息：

```javascript
// 用户代理字符串
console.log(navigator.userAgent)

// 浏览器语言
console.log(navigator.language)

// 是否在线
console.log(navigator.onLine)

// 地理位置
navigator.geolocation.getCurrentPosition((position) => {
  console.log(position.coords.latitude, position.coords.longitude)
})
```

### Window API

```javascript
// 打开新窗口
window.open("https://example.com", "_blank")

// 关闭当前窗口（只能关闭由脚本打开的窗口）
window.close()

// 页面加载完成后执行
window.onload = function() { }

// 页面卸载前执行
window.onbeforeunload = function(e) {
  return "确定要离开吗？"
}
```

## 总结

`location` 对象是 Web 开发中非常重要的 API，主要用途包括：

1. **获取页面信息**：通过属性获取当前页面的完整 URL 信息
2. **页面导航**：使用 `assign()`、`replace()`、`reload()` 进行页面跳转
3. **查询参数处理**：配合 `URLSearchParams` 解析和构建查询字符串
4. **路由管理**：结合 History API 实现单页应用路由
5. **条件重定向**：根据业务逻辑进行页面重定向

### 最佳实践建议

1. **优先使用现代 API**：`URLSearchParams` 和 `URL` 对象提供了更标准的 URL 处理方式
2. **注意安全性**：验证重定向 URL，防止开放重定向漏洞
3. **避免不必要的刷新**：使用 History API 实现无刷新导航
4. **正确处理参数类型**：`URLSearchParams` 的值都是字符串，需要手动类型转换
5. **注意跨域限制**：无法直接访问跨域 iframe 的 location 对象

### 选择合适的方法

| 需求                     | 推荐方法                                   |
| ------------------------ | ------------------------------------------ |
| 获取当前页面 URL         | `location.href` 或 `location.toString()`   |
| 页面跳转（保留历史）     | `location.assign()` 或 `location.href =`   |
| 页面跳转（不保留历史）   | `location.replace()`                       |
| 刷新页面                 | `location.reload()`                        |
| 解析查询参数             | `new URLSearchParams(location.search)`     |
| 无刷新修改 URL           | `history.pushState()` / `history.replaceState()` |
| SPA 路由                 | `location.hash` + `hashchange` 事件        |
