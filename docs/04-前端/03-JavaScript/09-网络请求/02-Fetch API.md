---
title: Fetch API
description: "Fetch API 是现代浏览器提供的网络请求接口,能够执行 XMLHttpRequest 对象的所有任务,但更容易使用,接口也更现代化,能够在 Web 工作线程等现代 Web 工具中使用。"
keywords: [Fetch, API]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---


# Fetch API

Fetch API 是现代浏览器提供的网络请求接口,能够执行 XMLHttpRequest 对象的所有任务,但更容易使用,接口也更现代化,能够在 Web 工作线程等现代 Web 工具中使用。XMLHttpRequest 可以选择异步,而 Fetch API 则必须是异步。

Fetch API 本身是使用 JavaScript 请求资源的优秀工具,同时这个 API 也能够应用在服务线程 (service worker) 中,提供拦截、重定向和修改通过 `fetch()` 生成的请求接口。

## 快速认识

- **统一的 Promise 化接口**：所有请求都会返回 `Promise<Response>`
- **更丰富的配置**：通过 `init` 参数控制请求方法、头部、模式等
- **原生支持流式处理**：Response/Request 的 body 是 `ReadableStream`
- **与 Service Worker、Cache Storage 等现代 Web 能力协同工作**
- **需要针对旧浏览器（如 IE）准备 polyfill**

## 浏览器兼容性

### 原生支持情况

Fetch API 在现代浏览器中有良好的支持:

| 浏览器            | 最低版本 | 说明           |
| ----------------- | -------- | -------------- |
| Chrome            | 42+      | 完整支持       |
| Firefox           | 39+      | 完整支持       |
| Safari            | 10.1+    | 完整支持       |
| Edge              | 14+      | 完整支持       |
| Internet Explorer | 不支持   | 需要 polyfill  |
| Node.js           | 18+      | 原生支持       |

### Polyfill 方案

对于不支持 Fetch API 的浏览器,可以使用以下 polyfill:

```bash
# 安装 polyfill
npm install whatwg-fetch --save
```

在项目中引入:

```js
// 在入口文件中引入
import 'whatwg-fetch'

// 或者有条件地引入
if (!window.fetch) {
  require('whatwg-fetch')
}
```

### 检测支持

```js
// 检测浏览器是否支持 Fetch API
if (window.fetch) {
  // 支持 Fetch API
  fetch('/api/data')
    .then(response => response.json())
    .then(data => console.log(data))
} else {
  // 降级使用 XMLHttpRequest 或其他方案
  console.log('浏览器不支持 Fetch API,请使用 polyfill 或降级方案')
}
```

## 与 XMLHttpRequest 对比

### 功能对比表

| 特性                | Fetch API                          | XMLHttpRequest              |
| ------------------- | ---------------------------------- | --------------------------- |
| 接口风格            | Promise 化,现代化                  | 基于事件,传统              |
| 语法                | 简洁,易于链式调用                  | 复杂,需要回调函数          |
| 流式处理            | 原生支持 ReadableStream            | 不支持                      |
| 请求取消            | AbortController                    | abort() 方法                |
| 进度监控            | 下载支持,上传不原生支持            | 都支持                      |
| 超时控制            | 需手动实现                         | timeout 属性                |
| 错误处理            | 网络错误才 reject                  | 有多种错误状态              |
| HTTP 状态码处理     | 404/500 也会 resolve               | 通过 status 判断            |
| 跨域                | 通过 mode 配置                     | 需要设置 withCredentials    |
| Service Worker 支持 | 原生支持                           | 不支持                      |
| 工作线程支持        | 支持(Worker/Service Worker)        | 有限支持                    |

### 迁移示例

**XMLHttpRequest 方式:**

```js
const xhr = new XMLHttpRequest()
xhr.open('GET', '/api/data', true)
xhr.onreadystatechange = function() {
  if (xhr.readyState === 4) {
    if (xhr.status === 200) {
      const data = JSON.parse(xhr.responseText)
      console.log(data)
    } else {
      console.error('请求失败:', xhr.status)
    }
  }
}
xhr.onerror = function() {
  console.error('网络错误')
}
xhr.send()
```

**Fetch API 方式:**

```js
fetch('/api/data')
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    return response.json()
  })
  .then(data => console.log(data))
  .catch(error => console.error('请求失败:', error))
```

**Fetch API async/await 方式:**

```js
async function fetchData() {
  try {
    const response = await fetch('/api/data')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    console.log(data)
  } catch (error) {
    console.error('请求失败:', error)
  }
}
```

## 与第三方库对比

### Fetch vs Axios

| 特性                | Fetch API                          | Axios                              |
| ------------------- | ---------------------------------- | ---------------------------------- |
| 浏览器原生支持      | 是                                 | 否,需要安装                        |
| 体积                | 0KB(原生)                          | ~13KB(gzip)                        |
| 语法                | Promise 链式调用                   | Promise 链式调用                   |
| 响应数据转换        | 需手动调用 json()等                | 自动转换 JSON                      |
| 错误处理            | 404/500 也 resolve                 | 404/500 会 reject                  |

**选择建议：优先使用 Fetch API 的场景：**

- 项目需要保持轻量、无额外依赖
- 只做简单的 GET/POST 请求
- 希望使用浏览器原生能力，易于维护

**选择 Axios 的场景：**

- 需要进度监控(上传和下载)
- 需要自动的请求/响应转换
- 团队已经熟悉 Axios

### Fetch 封装实现 Axios 功能

```
// 实现 Axios 风格的 fetch 封装
class FetchClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || ''
    this.timeout = config.timeout || 0
    this.headers = config.headers || {}
    this.interceptors = {
      request: [],
      response: []
    }
  }
  
  // 拦截器
  useRequestInterceptor(onFulfilled, onRejected) {
    this.interceptors.request.push({ onFulfilled, onRejected })
  }
  
  useResponseInterceptor(onFulfilled, onRejected) {
    this.interceptors.response.push({ onFulfilled, onRejected })
  }
  
  // 核心请求方法
  async request(config) {
    // 合并配置
    let newConfig = {
      ...config,
      baseURL: config.baseURL || this.baseURL,
      timeout: config.timeout || this.timeout,
      headers: { ...this.headers, ...config.headers }
    }
    
    // 执行请求拦截器
    for (const interceptor of this.interceptors.request) {
      newConfig = await interceptor.onFulfilled(newConfig)
    }
    
    // 构建 URL
    const url = newConfig.baseURL + newConfig.url
    
    // 发起请求
    let response
    try {
      response = await fetch(url, {
        method: newConfig.method,
        headers: newConfig.headers,
        body: newConfig.data ? JSON.stringify(newConfig.data) : undefined
      })
    } catch (error) {
      // 网络错误
      for (const interceptor of this.interceptors.response) {
        if (interceptor.onRejected) await interceptor.onRejected(error)
      }
      throw error
    }
    
    // 处理响应
    const data = await response.json().catch(() => null)
    const result = { data, status: response.status, headers: response.headers }
    
    // 执行响应拦截器
    for (const interceptor of this.interceptors.response) {
      await interceptor.onFulfilled(result)
    }
    
    return data
  }
  
  get(url, config = {}) {
    return this.request({ ...config, url, method: 'GET' })
  }
  
  post(url, data, config = {}) {
    return this.request({ ...config, url, method: 'POST', data })
  }
}


// 使用
const client = new FetchClient({ baseURL: 'https://api.example.com' })
client.useRequestInterceptor((config) => {
  config.headers.Authorization = 'Bearer token'
  return config
})

async function getUsers() {
  try {
    const data = await client.get('/users')
    console.log(data)
  } catch (error) {
    console.error(error)
  }
}
```

## 基本方法

fetch() 方法是暴露在全局作用域中的，包括主页面执行线程、模块和工作线程。调用这个方法，浏览器就会向给定 URL 发送请求。

fetch() 只有一个必需的参数 input。多数情况下，这个参数是要获取资源的 URL。这个方法返回 Promise。

```js
let r = fetch("/bar")

console.log(r) // Promise <pending>
```

URL 的格式（相对路径、绝对路径等）的解释与 XHR 对象一样。请求完成、资源可用时，期约会解决为一个 Response 对象。这个对象是 API 的封装，可以通过它取得相应资源。获取资源要使用这个对象的属性和方法，据此掌握响应的情况并将负载转换为有用的形式。

```js
fetch("bar.txt").then((response) => {
  console.log(response)
})

// Response { type: "basic", url: ... }
```

读取响应内容的最简单方式是取得纯文本格式的内容，这要用到 text() 方法。这个方法返回一个 Promise，会解决为取得资源的完整内容：

```js
fetch("bar.txt").then((response) => {
  response.text().then((data) => {
    console.log(data) // bar.txt 的内容
  })
})
```

内容的结构通常是打平的：

```js
fetch("bar.txt")
  .then((response) => response.text())
  .then((data) => console.log(data))
```

### 处理状态码和请求失败

Fetch API 支持通过 Response 的 status（状态码）和 statusText（状态文本）属性检查响应状态。成功获取响应的请求通常会产生值为 200 的状态码，如下所示：

```js
fetch("/bar").then((response) => {
  console.log(response.status) // 200
  console.log(response.statusText) // OK
})
```

请求不存在的资源通常会产生值为 404 的状态码：

```js
fetch("/does-not-exist").then((response) => {
  console.log(response.status) // 404
  console.log(response.statusText) // Not Found
})
```

请求的 URL 如果抛出服务器错误会产生值为 500 的状态码：

```js
fetch("/throw-server-error").then((response) => {
  console.log(response.status) // 500
  console.log(response.statusText) // Internal Server Error
})
```

可以显式地设置 fetch() 在遇到重定向时的行为（本章后面会介绍），不过默认行为是跟随重定向并返回状态码不是 300~399 的响应。跟随重定向时，响应对象的 redirected 属性会被设置为 true，而状态码仍然是 200：

```js
fetch("/permanent-redirect").then((response) => {
  // 默认行为是跟随重定向直到最终 URL
  // 这个例子会出现至少两轮网络请求
  // <origin url>/permanent-redirect -> <redirect url>

  console.log(response.status) // 200
  console.log(response.statusText) // OK
  console.log(response.redirected) // true
})
```

事实上，只要服务器返回了响应，fetch() 期约都会解决。这个行为是合理的：系统级网络协议已经成功完成消息的一次往返传输。至于真正的“成功”请求，则需要在处理响应时再定义。

通常状态码为 200 时就会被认为成功了，其他情况可以被认为未成功。为区分这两种情况，可以在状态码非 200~299 时检查 Response 对象的 ok 属性：

```js
fetch("/bar").then((response) => {
  console.log(response.status) // 200
  console.log(response.ok) // true
})

fetch("/does-not-exist").then((response) => {
  console.log(response.status) // 404
  console.log(response.ok) // false
})
```

因为服务器没有响应而导致浏览器超时，这样真正的 fetch()失败会导致期约被拒绝：

```js
fetch("/hangs-forever").then(
  (response) => {
    console.log(response)
  },
  (err) => {
    console.log(err)
  }
)

//（浏览器超时后）
// TypeError: "NetworkError when attempting to fetch resource."
```

违反 CORS、无网络连接、HTTPS 错配及其他浏览器/网络策略问题都会导致期约被拒绝。

可以通过 url 属性检查通过 fetch()发送请求时使用的完整 URL：

```js
// foo.com/bar/baz 发送的请求
console.log(window.location.href) // https://foo.com/bar/baz

fetch("qux").then((response) => console.log(response.url))
// https://foo.com/bar/qux

fetch("/qux").then((response) => console.log(response.url))
// https://foo.com/qux

fetch("//qux.com").then((response) => console.log(response.url))
// https://qux.com

fetch("https://qux.com").then((response) => console.log(response.url))
// https://qux.com
```

### Response.type 属性

Response 对象的 type 属性表示响应的类型,可能的值包括:

| 类型       | 说明                                             | 示例场景                           |
| ---------- | ------------------------------------------------ | ---------------------------------- |
| `basic`    | 同源响应,所有头部都可用                         | 同源请求                           |
| `cors`     | 跨源响应,部分头部受限                           | 成功的 CORS 跨域请求               |
| `opaque`   | 跨源响应,完全不透明                              | `mode: "no-cors"` 的跨域请求       |
| `opaqueredirect` | 重定向响应,不透明                          | `redirect: "manual"` 的重定向响应  |
| `error`    | 网络错误响应                                     | 网络故障或 CORS 错误               |

```js
// 同源请求
fetch('/api/data')
  .then(response => console.log(response.type)) // "basic"

// CORS 跨域请求
fetch('https://api.example.com/data')
  .then(response => console.log(response.type)) // "cors"

// no-cors 模式
fetch('https://api.example.com/data', { mode: 'no-cors' })
  .then(response => console.log(response.type)) // "opaque"

// 检查响应类型
fetch('/api/data')
  .then(response => {
    if (response.type === 'basic' || response.type === 'cors') {
      // 可以读取响应内容
      return response.json()
    } else if (response.type === 'opaque') {
      // 无法读取响应内容
      console.log('Opaque response - cannot read content')
    }
  })
```

### 自定义选项

只使用 URL 时，fetch() 会发送 GET 请求，只包含最低限度的请求头。要进一步配置如何发送请求，需要传入可选的第二个参数 init 对象。常见配置如下：

| 选项             | 类型                 | 含义及常用取值                                                                                                                                 |
| ---------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `method`         | `string`             | HTTP 方法，如 `GET`、`POST`、`PUT`、`DELETE` 等                                                                                                |
| `headers`        | `Headers` / `Object` | 自定义请求头，同 `Headers` 对象章节                                                                                                            |
| `body`           | `BodyInit`           | 请求体，支持字符串、`FormData`、`Blob`、`ReadableStream` 等                                                                                    |
| `mode`           | `string`             | 请求模式：`cors`、`same-origin`、`no-cors`、`navigate`                                                                                         |
| `credentials`    | `string`             | 认证信息策略：`omit`、`same-origin`、`include`。跨域时带 cookie 需要设置为 `include` 并确保服务端返回 `Access-Control-Allow-Credentials: true` |
| `cache`          | `string`             | 缓存策略：`default`、`no-store`、`reload`、`no-cache`、`force-cache`、`only-if-cached` |
| `redirect`       | `string`             | 重定向策略：`follow`（默认）、`error`、`manual` |
| `referrer`       | `string`             | referrer 策略：`no-referrer`、`client`、或具体 URL |
| `referrerPolicy` | `string`             | referrer 发送策略，如 `no-referrer-when-downgrade`、`same-origin` 等 |
| `signal`         | `AbortSignal`        | 用于取消请求的 AbortController 信号 |
| `keepalive`      | `boolean`            | 是否在页面卸载时保持请求进行，用于埋点等场景 |

与 XMLHttpRequest 一样，fetch() 既可以发送数据也可以接收数据。使用 init 对象参数，可以配置 fetch() 在请求体中发送各种序列化的数据

### 发送 JSON 数据

可以像下面这样发送简单 JSON 字符串：

```
let payload = JSON.stringify({
  foo: "bar"
})

let jsonHeaders = new Headers({
  "Content-Type": "application/json"
})

fetch("/send-me-json", {
  method: "POST", // 发送请求体时必须使用一种 HTTP 方法
  body: payload,
  headers: jsonHeaders
})
```

### 在请求体中发送参数

因为请求体支持任意字符串值，所以可以通过它发送请求参数：

```js
let payload = "foo=bar&baz=qux"

let paramHeaders = new Headers({
  "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
})

fetch("/send-me-params", {
  method: "POST", // 发送请求体时必须使用一种 HTTP 方法
  body: payload,
  headers: paramHeaders
})
```

### 发送文件

因为请求体支持 FormData 实现，所以 fetch() 也可以序列化并发送文件字段中的文件：

```js
let imageFormData = new FormData()
let imageInput = document.querySelector("input[type='file']")

imageFormData.append("image", imageInput.files[0])

fetch("/img-upload", {
  method: "POST",
  body: imageFormData
})
```

### 发送 JSON 并处理响应

```js
async function postJSON(url, data) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`请求失败：${response.status} ${message}`)
  }

  return response.json()
}
```

这个 fetch() 实现可以支持多个文件：

```js
let imageFormData = new FormData()

let imageInput = document.querySelector("input[type='file'][multiple]")

for (let i = 0; i < imageInput.files.length; ++i) {
  imageFormData.append("image", imageInput.files[i])
}

fetch("/img-upload", {
  method: "POST",
  body: imageFormData
})
```

### 加载 **Blob** 文件

Fetch API 也能提供 Blob 类型的响应，而 Blob 又可以兼容多种浏览器 API。一种常见的做法是明确将图片文件加载到内存，然后将其添加到 HTML 图片元素。为此，可以使用响应对象上暴露的 blob()方法。

这个方法返回一个期约，解决为一个 Blob 的实例。然后，可以将这个实例传给 URL.createObjectUrl() 以生成可以添加给图片元素 src 属性的值：

```js
const imageElement = document.querySelector("img")

fetch("my-image.png")
  .then((response) => response.blob())
  .then((blob) => {
    imageElement.src = URL.createObjectURL(blob)
  })
```

### 发送跨源请求

从不同的源请求资源，响应要包含 CORS 头部才能保证浏览器收到响应。没有这些头部，跨源请求会失败并抛出错误。

```js
fetch("//cross-origin.com")

// TypeError: Failed to fetch
// No 'Access-Control-Allow-Origin' header is present on the requested resource
```

如果代码不需要访问响应，也可以发送 no-cors 请求。此时响应的 type 属性值为 opaque，因此无法读取响应内容。这种方式适合发送探测请求或者将响应缓存起来供以后使用。

```js
fetch("//cross-origin.com", { mode: "no-cors" }).then((response) => console.log(response.type))

// opaque
```

### 下载并追踪进度（ReadableStream）

浏览器原生 `fetch` 暂不支持直接监听上传进度。一个常见方案是通过 Service Worker 或者使用 `XMLHttpRequest`。如果需要在 `fetch` 中实现下载进度，可以组合 `ReadableStream`：

```js
async function downloadWithProgress(url, onProgress) {
  const response = await fetch(url)
  if (!response.body) throw new Error("ReadableStream 不可用")

  const reader = response.body.getReader()
  const contentLength = Number(response.headers.get("Content-Length") ?? 0)
  let received = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.length
    onProgress?.(received, contentLength)
  }
}
```

### 中断请求

Fetch API 支持通过 AbortController/AbortSignal 对中断请求。调用 AbortController.abort()会中断所有网络传输，特别适合希望停止传输大型负载的情况。中断进行中的 fetch() 请求会导致包含错误的拒绝。

```js
let abortController = new AbortController()

fetch("wikipedia.zip", { signal: abortController.signal }).catch(() => console.log("aborted!"))

// 10 毫秒后中断请求
setTimeout(() => abortController.abort(), 10)

// 已经中断
```

## Headers 对象

Headers 对象是所有外发请求和入站响应头部的容器。每个外发的 Request 实例都包含一个空的 Headers 实例，可以通过 Request.prototype.headers 访问，每个入站 Response 实例也可以通过 Response.prototype.headers 访问包含着响应头部的 Headers 对象。这两个属性都是可修改属性

另外，使用 new Headers()也可以创建一个新实例。

### Headers 与 Map 的相似之处

Headers 对象与 Map 对象极为相似。这是合理的，因为 HTTP 头部本质上是序列化后的键/值对，它们的 JavaScript 表示则是中间接口。Headers 与 Map 类型都有 get()、set()、has() 和 delete()

等实例方法，如下面的代码所示：

```js
let h = new Headers()
let m = new Map()

// 设置键
h.set("foo", "bar")
m.set("foo", "bar")

// 检查键
console.log(h.has("foo")) // true
console.log(m.has("foo")) // true
console.log(h.has("qux")) // false
console.log(m.has("qux")) // false

// size 属性（Headers 没有 size 属性，Map 有）
console.log(h.size) // undefined
console.log(m.size) // 1

// 获取值
console.log(h.get("foo")) // "bar"
console.log(m.get("foo")) // "bar"

h.delete("foo")
m.delete("foo")

// 确定值已经删除（Headers.get() 返回 null，Map.get() 返回 undefined）
console.log(h.get("foo")) // null
console.log(m.get("foo")) // undefined
```

Headers 和 Map 都可以使用一个可迭代对象来初始化，比如：

```js
let seed = [["foo", "bar"]]
let h = new Headers(seed)
let m = new Map(seed)
console.log(h.get("foo")) // bar
console.log(m.get("foo")) // bar
```

而且，它们也都有相同的 keys()、values()和 entries()迭代器接口：

```js
let seed = [
  ["foo", "bar"],
  ["baz", "qux"]
]
let h = new Headers(seed)
let m = new Map(seed)

console.log(...h.keys()) // foo, baz
console.log(...m.keys()) // foo, baz

console.log(...h.values()) // bar, qux
console.log(...m.values()) // bar, qux

console.log(...h.entries()) // ['foo', 'bar'], ['baz', 'qux']
console.log(...m.entries()) // ['foo', 'bar'], ['baz', 'qux']
```

### Headers 独有的特性

Headers 并不是与 Map 处处都一样。在初始化 Headers 对象时，也可以使用键/值对形式的对象，而 Map 则不可以：

```js
let seed = { foo: "bar" }
let h = new Headers(seed)

console.log(h.get("foo")) // bar

let m = new Map(seed)
// TypeError: object is not iterable
```

一个 HTTP 头部字段可以有多个值，而 Headers 对象通过 append()方法支持添加多个值。在 Headers 实例中还不存在的头部上调用 append() 方法相当于调用 set()。后续调用会以逗号为分隔符拼接多个值：

```js
let h = new Headers()

h.append("foo", "bar")
console.log(h.get("foo")) // "bar"

h.append("foo", "baz")
console.log(h.get("foo")) // "bar, baz"
```

### 头部护卫

某些情况下，并非所有 HTTP 头部都可以被客户端修改，而 Headers 对象使用护卫来防止不被允许的修改。不同的护卫设置会改变 set()、append()和 delete()的行为。违反护卫限制会抛出 TypeError。

Headers 实例会因来源不同而展现不同的行为，它们的行为由护卫来控制。JavaScript 可以决定 Headers 实例的护卫设置。下表列出了不同的护卫设置和每种设置对应的行为

| 护卫            | 适用情形                                                         | 限制                                                                                  |
| --------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| none            | 在通过构造函数创建 Headers 实例时激活                            | 无                                                                                    |
| request         | 在通过构造函数初始化 Request 对象，且 mode 值为非 no-cors 时激活 | 不允许修改禁止修改的头部（参见 MDN 文档中的 forbidden header name 词条）              |
| request-no-cors | 在通过构造函数初始化 Request 对象，且 mode 值为 no-cors 时激活   | 不允许修改非简单头部（参见 MDN 文档中的 simple header 词条）                          |
| response        | 在通过构造函数初始化 Response 对象时激活                         | 不允许修改禁止修改的响应头部（参见 MDN 文档中的 forbidden response header name 词条） |
| immutable       | 在通过 error()或 redirect()静态方法初始化 Response 对象时激活    | 不允许修改任何头部                                                                    |

## Request 对象

Request 对象是获取资源请求的接口。这个接口暴露了请求的相关信息，也暴露了使用请求体的不同方式。

### 创建 request 对象

可以通过构造函数初始化 Request 对象。为此需要传入一个 input 参数，一般是 URL：

```js
let r = new Request("https://foo.com")
console.log(r)
// Request {...}
```

Request 构造函数也接收第二个参数——一个 init 对象。这个 init 对象与前面介绍的 fetch() 的 init 对象一样。没有在 init 对象中涉及的值则会使用默认值：

```js
// 用所有默认值创建 Request 对象
console.log(new Request(""))
// Request {
// bodyUsed: false
// cache: "default"
// credentials: "same-origin"
// destination: ""
// headers: Headers {}
// integrity: ""
// keepalive: false
// method: "GET"
// mode: "cors"
// redirect: "follow"
// referrer: "about:client"
// referrerPolicy: ""
// signal: AbortSignal {aborted: false, onabort: null}
// url: "https://foo.com/"
// }
```

### 克隆 Request 对象

Fetch API 提供了两种不太一样的方式用于创建 Request 对象的副本：使用 Request 构造函数和使用 clone() 方法

将 Request 实例作为 input 参数传给 Request 构造函数，会得到该请求的一个副本：

```js
let r1 = new Request("https://foo.com")
let r2 = new Request(r1)
console.log(r2.url) // https://foo.com/
```

如果再传入 init 对象，则 init 对象的值会覆盖源对象中同名的值：

```js
let r1 = new Request("https://foo.com")

let r2 = new Request(r1, { method: "POST" })

console.log(r1.method) // GET
console.log(r2.method) // POST
```

这种克隆方式并不总能得到一模一样的副本。最明显的是，第一个请求的请求体会被标记为“已使用”：

```js
let r1 = new Request("https://foo.com", { method: "POST", body: "foobar" })

let r2 = new Request(r1)

console.log(r1.bodyUsed) // true
console.log(r2.bodyUsed) // false
```

如果源对象与创建的新对象不同源，则 referrer 属性会被清除。此外，如果源对象的 mode 为 navigate，则会被转换为 same-origin。

第二种克隆 Request 对象的方式是使用 clone()方法，这个方法会创建一模一样的副本，任何值都不会被覆盖。与第一种方式不同，这种方法不会将任何请求的请求体标记为“已使用”：

```js
let r1 = new Request("https://foo.com", { method: "POST", body: "foobar" })
let r2 = r1.clone()

console.log(r1.url) // https://foo.com/
console.log(r2.url) // https://foo.com/

console.log(r1.bodyUsed) // false
console.log(r2.bodyUsed) // false
```

如果请求对象的 bodyUsed 属性为 true（即请求体已被读取），那么上述任何一种方式都不能用来创建这个对象的副本。在请求体被读取之后再克隆会导致抛出 TypeError。

```js
let r = new Request('https://foo.com');
r.clone();
new Request(r);

// 没有错误

r.text(); // 设置 bodyUsed 为 true

r.clone();

// TypeError: Failed to execute 'clone' on 'Request': Request body is already used
new Request(r);

// TypeError: Failed to construct 'Request': Cannot construct a Request with a
// Request object that has already been used.
```

### 在 fetch() 中使用 Request 对象

fetch() 和 Request 构造函数拥有相同的函数签名并不是巧合。在调用 fetch()时，可以传入已经创建好的 Request 实例而不是 URL。与 Request 构造函数一样，传给 fetch()的 init 对象会覆盖传入请求对象的值：

```js
let r = new Request("https://foo.com")
// 向 foo.com 发送 GET 请求
fetch(r)

// 向 foo.com 发送 POST 请求
fetch(r, { method: "POST" })
```

fetch() 会在内部克隆传入的 Request 对象。与克隆 Request 一样，fetch() 也不能拿请求体已经用过的 Request 对象来发送请求：

```js
let r = new Request("https://foo.com", { method: "POST", body: "foobar" })
r.text()

fetch(r)
// TypeError: Cannot construct a Request with a Request object that has already been used.
```

关键在于，通过 fetch 使用 Request 会将请求体标记为已使用。也就是说，有请求体的 Request 只能在一次 fetch 中使用。（不包含请求体的请求不受此限制。）演示如下：

```js
let r = new Request("https://foo.com", { method: "POST", body: "foobar" })

fetch(r)
fetch(r)
// TypeError: Cannot construct a Request with a Request object that has already been used.
```

要想基于包含请求体的相同 Request 对象多次调用 fetch()，必须在第一次发送 fetch() 请求前调用 clone()：

```js
let r = new Request("https://foo.com", { method: "POST", body: "foobar" })

// 3 个都会成功
fetch(r.clone())
fetch(r.clone())
fetch(r)
```

## 错误处理与超时控制

fetch 期约只在网络层面失败时才会 reject（如断网、CORS 失败），对于非 2xx 状态码默认仍然 resolve。因此需要结合业务逻辑手动判断：

```js
async function safeFetch(url, options) {
  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      const message = await response.text()
      throw new Error(`HTTP ${response.status}: ${message}`)
    }
    return response
  } catch (error) {
    console.error("请求失败", error)
    throw error
  }
}
```

### 人为设置超时

Fetch 没有原生超时选项，可以通过 `AbortController` 实现：

```js
function fetchWithTimeout(resource, options = {}) {
  const { timeout = 8000, ...rest } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  return fetch(resource, { ...rest, signal: controller.signal }).finally(() => {
    clearTimeout(timer)
  })
}
```

### 并发控制与重试

根据业务可以封装重试机制、指数退避、并发池等。例如：

```js
async function retryFetch(url, options = {}, retries = 3) {
  try {
    return await fetch(url, options)
  } catch (error) {
    if (retries <= 0) throw error
    await new Promise((resolve) => setTimeout(resolve, 2 ** (3 - retries) * 100))
    return retryFetch(url, options, retries - 1)
  }
}
```

## Response 对象

顾名思义，Response 对象是获取资源响应的接口。这个接口暴露了响应的相关信息，也暴露了使用响应体的不同方式

### 创建 Response 对象

可以通过构造函数初始化 Response 对象且不需要参数。此时响应实例的属性均为默认值，因为它并不代表实际的 HTTP 响应：

```js
let r = new Response()
console.log(r)

// Response {
// body: (...)
// bodyUsed: false
// headers: Headers {}
// ok: true
// redirected: false
// status: 200
// statusText: "OK"
// type: "default"
// url: ""
// }
```

Response 构造函数接收一个可选的 body 参数。这个 body 可以是 null，等同于 fetch() 参数 init 中的 body。还可以接收一个可选的 init 对象，这个对象可以包含下表所列的键和值

- headers 必须是 Headers 对象实例或包含字符串键/值对的常规对象实例 默认为没有键/值对的 Headers 对象
- status 表示 HTTP 响应状态码的整数，默认为 200
- statusText 表示 HTTP 响应状态的字符串，默认为空字符串

可以像下面这样使用 body 和 init 来构建 Response 对象：

```js
let r = new Response("foobar", {
  status: 418,
  statusText: "I'm a teapot"
})

console.log(r)

// Response {
// body: (...)
// bodyUsed: false
// headers: Headers {}
// ok: false
// redirected: false
// status: 418
// statusText: "I'm a teapot"
// type: "default"
// url: ""
// }
```

大多数情况下，产生 Response 对象的主要方式是调用 fetch()，它返回一个最后会解决为 Response 对象的期约，这个 Response 对象代表实际的 HTTP 响应。下面的代码展示了这样得到的 Response 对象：

```js
fetch("https://foo.com").then((response) => {
  console.log(response)
})

// Response {
// body: (...)
// bodyUsed: false
// headers: Headers {}
// ok: true
// redirected: false
// status: 200
// statusText: "OK"
// type: "basic"
// url: "https://foo.com/"
// }
```

Response 类还有两个用于生成 Response 对象的静态方法：Response.redirect() 和 Response.error()。前者接收一个 URL 和一个重定向状态码（301、302、303、307 或 308），返回重定向的 Response 对象：

```js
console.log(Response.redirect("https://foo.com", 301))

// Response {
// body: (...)
// bodyUsed: false
// headers: Headers {}
// ok: false
// redirected: false
// status: 301
// statusText: ""
// type: "default"
// url: ""
// }
```

提供的状态码必须对应重定向，否则会抛出错误：

```js
Response.redirect("https://foo.com", 200)
// RangeError: Failed to execute 'redirect' on 'Response': Invalid status code
```

另一个静态方法 Response.error()用于产生表示网络错误的 Response 对象（网络错误会导致 fetch() 期约被拒绝）

```js
console.log(Response.error())

// Response {
// body: (...)
// bodyUsed: false
// headers: Headers {}
// ok: false
// redirected: false
// status: 0
// statusText: ""
// type: "error"
// url: ""
// }
```

### 克隆 Response 对象

克隆 Response 对象的主要方式是使用 clone()方法，这个方法会创建一个一模一样的副本，不会覆盖任何值。这样不会将响应体标记为已使用：

```js
let r1 = new Response("foobar")
let r2 = r1.clone()
console.log(r1.bodyUsed) // false
console.log(r2.bodyUsed) // false
```

如果响应对象的 bodyUsed 属性为 true（即响应体已被读取），则不能再创建这个对象的副本。在响应体被读取之后再克隆会导致抛出 TypeError

```js
let r = new Response("foobar")
r.clone()
// 没有错误
r.text() // 设置 bodyUsed 为 true
r.clone()
// TypeError: Failed to execute 'clone' on 'Response': Response body is already used
```

有响应体的 Response 对象只能读取一次。（不包含响应体的 Response 对象不受此限制。）比如：

```js
let r = new Response("foobar")

r.text().then(console.log) // foobar
r.text().then(console.log)

// TypeError: Failed to execute 'text' on 'Response': body stream is locked
```

要多次读取包含响应体的同一个 Response 对象，必须在第一次读取前调用 clone()：

```js
let r = new Response("foobar")

r.clone().text().then(console.log) // foobar
r.clone().text().then(console.log) // foobar
r.text().then(console.log) // foobar
```

此外，通过创建带有原始响应体的 Response 实例，可以执行伪克隆操作。关键是这样不会把第一个 Response 实例标记为已读，而是会在两个响应之间共享：

```js
let r1 = new Response("foobar")

let r2 = new Response(r1.body)

console.log(r1.bodyUsed) // false
console.log(r2.bodyUsed) // false

r2.text().then(console.log) // foobar
r1.text().then(console.log)

// TypeError: Failed to execute 'text' on 'Response': body stream is locked
```

## Request、Response 及 Body 混入

Request 和 Response 都使用了 Fetch API 的 Body 混入，以实现两者承担有效载荷的能力。这个混入为两个类型提供了只读的 body 属性（实现为 ReadableStream）、只读的 bodyUsed 布尔值（表示 body 流是否已被读取）和一组方法，用于从流中读取内容并将结果转换为某种 JavaScript 对象类型。

通常，将 Request 和 Response 主体作为流来使用主要有两个原因。一个原因是有效载荷的大小可能会导致网络延迟，另一个原因是流 API 本身在处理有效载荷方面是有优势的。除此之外，最好是一次性获取资源主体。

Body 混入提供了 5 个方法，用于将 ReadableStream 转存到缓冲区的内存里，将缓冲区转换为某种 JavaScript 对象类型，以及通过期约来产生结果。在解决之前，期约会等待主体流报告完成及缓冲被解析。这意味着客户端必须等待响应的资源完全加载才能访问其内容。

### Body.text()

Body.text() 方法返回 Promise，解决为将缓冲区转存得到的 UTF-8 格式字符串

```js
fetch("https://foo.com")
  .then((response) => response.text())
  .then(console.log)

// <!doctype html><html lang="en">
// <head>
// <meta charset="utf-8">
// ...
```

以下代码展示了在 Request 对象上使用 Body.text()：

```js
let request = new Request("https://foo.com", { method: "POST", body: "barbazqux" })

request.text().then(console.log)
// barbazqux
```

### Body.json()

Body.json()方法返回期约，解决为将缓冲区转存得到的 JSON。下面的代码展示了在 Response 对象上使用 Body.json()

```js
fetch("https://foo.com/foo.json")
  .then((response) => response.json())
  .then(console.log)
// {"foo": "bar"}
```

以下代码展示了在 Request 对象上使用 Body.json()

```js
let request = new Request("https://foo.com", { method: "POST", body: JSON.stringify({ bar: "baz" }) })

request.json().then(console.log)
// {bar: 'baz'}
```

### Body.formData()

浏览器可以将 FormData 对象序列化/反序列化为主体。例如，下面这个 FormData 实例：

```js
let myFormData = new FormData()
myFormData.append("foo", "bar")
```

在通过 HTTP 传送时，WebKit 浏览器会将其序列化为下列内容：

```js
------WebKitFormBoundarydR9Q2kOzE6nbN7eR
Content-Disposition: form-data; name="foo"
bar
------WebKitFormBoundarydR9Q2kOzE6nbN7eR--
```

Body.formData() 方法返回 Promise，解决为将缓冲区转存得到的 FormData 实例。下面的代码展示了在 Response 对象上使用 Body.formData()

```js
fetch('https://foo.com/form-data')
 .then((response) => response.formData())
 .then((formData) => console.log(formData.get('foo')));
// bar
```

以下代码展示了在 Request 对象上使用 Body.formData()：

```js
let myFormData = new FormData();

myFormData.append('foo', 'bar');

let request = new Request('https://foo.com', { method:'POST', body: myFormData });

request.formData().then((formData) => console.log(formData.get('foo'))); // bar
```

### Body.arrayBuffer()

有时候，可能需要以原始二进制格式查看和修改主体。为此，可以使用 Body.arrayBuffer() 将主体内容转换为 ArrayBuffer 实例 Body.arrayBuffer()方法返回期约，解决为将缓冲区转存得到的 ArrayBuffer 实例。下面的代码展示了在 Response 对象上使用 Body.arrayBuffer()：

```js
fetch("https://foo.com")
  .then((response) => response.arrayBuffer())
  .then(console.log)
// ArrayBuffer(...) {}
```

以下代码展示了在 Request 对象上使用 Body.arrayBuffer()：

```js
let request = new Request("https://foo.com", { method: "POST", body: "abcdefg" })

// 以整数形式打印二进制编码的字符串
request.arrayBuffer().then((buf) => console.log(new Int8Array(buf)))
// Int8Array(7) [97, 98, 99, 100, 101, 102, 103]
```

### Body.blob()

有时候，可能需要以原始二进制格式使用主体，不用查看和修改。为此，可以使用 Body.blob() 将主体内容转换为 Blob 实例。Body.blob() 方法返回 Promise，解决为将缓冲区转存得到的 Blob 实例。

下面的代码展示了在 Response 对象上使用 Body.blob()：

```js
fetch("https://foo.com")
  .then((response) => response.blob())
  .then(console.log)
// Blob(...) {size:..., type: "..."}
```

以下代码展示了在 Request 对象上使用 Body.blob()

```js
let request = new Request("https://foo.com", { method: "POST", body: "abcdefg" })

request.blob().then(console.log)
// Blob(7) {size: 7, type: "text/plain;charset=utf-8"}
```

### 一次性流

因为 Body 混入是构建在 ReadableStream 之上的，所以主体流只能使用一次。这意味着所有主体混入方法都只能调用一次，再次调用就会抛出错误

```js
fetch("https://foo.com").then((response) => response.blob().then(() => response.blob()))

// TypeError: Failed to execute 'blob' on 'Response': body stream is locked
let request = new Request("https://foo.com", { method: "POST", body: "foobar" })
request.blob().then(() => request.blob())

// TypeError: Failed to execute 'blob' on 'Request': body stream is locked
```

即使是在读取流的过程中，所有这些方法也会在它们被调用时给 ReadableStream 加锁，以阻止其他读取器访问：

```js
fetch("https://foo.com").then((response) => {
  response.blob() // 第一次调用给流加锁
  response.blob() // 第二次调用再次加锁会失败
})

// TypeError: Failed to execute 'blob' on 'Response': body stream is locked

let request = new Request("https://foo.com", { method: "POST", body: "foobar" })

request.blob() // 第一次调用给流加锁

request.blob() // 第二次调用再次加锁会失败

// TypeError: Failed to execute 'blob' on 'Request': body stream is locked
```

作为 Body 混入的一部分，bodyUsed 布尔值属性表示 ReadableStream 是否已被读取（disturbed），意思是读取器是否已经在流上加了锁。这不一定表示流已经被完全读取。下面的代码演示了这个属性：

```js
let request = new Request("https://foo.com", { method: "POST", body: "foobar" })

let response = new Response("foobar")

console.log(request.bodyUsed) // false
console.log(response.bodyUsed) // false

request.text().then(console.log) // foobar
response.text().then(console.log) // foobar

console.log(request.bodyUsed) // true
console.log(response.bodyUsed) // true
```

### 使用 ReadableStream 主体

JavaScript 编程逻辑很多时候会将访问网络作为原子操作，比如请求是同时创建和发送的，响应数据也是以统一的格式一次性暴露出来的。这种约定隐藏了底层的混乱，让涉及网络的代码变得很清晰。

从 TCP/IP 角度来看，传输的数据是以分块形式抵达端点的，而且速度受到网速的限制。接收端点会为此分配内存，并将收到的块写入内存。Fetch API 通过 ReadableStream 支持在这些块到达时就实时读取和操作这些数据

正如 Stream API 所定义的，ReadableStream 暴露了 getReader()方法，用于产生 ReadableStream DefaultReader，这个读取器可以用于在数据到达时异步获取数据块。数据流的格式是 Uint8Array

下面的代码调用了读取器的 read()方法，把最早可用的块打印了出来：

```js
fetch("https://fetch.spec.whatwg.org/")
  .then((response) => response.body)
  .then((body) => {
    let reader = body.getReader()
    console.log(reader) // ReadableStreamDefaultReader {}
    reader.read().then(console.log)
  })

// { value: Uint8Array{}, done: false }
```

在随着数据流的到来取得整个有效载荷，可以像下面这样递归调用 read() 方法：

```js
fetch("https://fetch.spec.whatwg.org/")
  .then((response) => response.body)
  .then((body) => {
    let reader = body.getReader()
    function processNextChunk({ value, done }) {
      if (done) {
        return
      }
      console.log(value)
      return reader.read().then(processNextChunk)
    }
    return reader.read().then(processNextChunk)
  })
// { value: Uint8Array{}, done: false }
// { value: Uint8Array{}, done: false }
// { value: Uint8Array{}, done: false }
// ...
```

异步函数非常适合这样的 fetch() 操作。可以通过使用 async/await 将上面的递归调用打平

```js
fetch("https://fetch.spec.whatwg.org/")
  .then((response) => response.body)
  .then(async function (body) {
    let reader = body.getReader()
    while (true) {
      let { value, done } = await reader.read()
      if (done) {
        break
      }
      console.log(value)
    }
  })
// { value: Uint8Array{}, done: false }
// { value: Uint8Array{}, done: false }
// { value: Uint8Array{}, done: false }
// ...
```

## 性能优化

### 缓存策略

Fetch API 提供了灵活的缓存控制,通过 `cache` 选项可以优化请求性能:

```js
// 默认缓存策略(遵循 HTTP 缓存头)
fetch('/api/data', { cache: 'default' })

// 强制缓存(使用缓存,即使过期也不验证)
fetch('/api/data', { cache: 'force-cache' })

// 不使用缓存,每次都从网络获取
fetch('/api/data', { cache: 'no-store' })

// 强制从网络获取最新资源,并更新缓存
fetch('/api/data', { cache: 'reload' })

// 使用缓存前必须先向服务器验证(协商缓存,304 时复用)
fetch('/api/data', { cache: 'no-cache' })

// 只使用缓存,不发起网络请求
fetch('/api/data', { cache: 'only-if-cached' })
```

### 流式处理优化

对于大文件或实时数据,使用流式处理可以显著提升性能:

```js
// 流式下载大文件
async function streamDownload(url) {
  const response = await fetch(url)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    // 可以在这里处理每个 chunk,实现渐进式展示
    console.log('收到数据块:', value)
    fullText += decoder.decode(value, { stream: true })
  }
  fullText += decoder.decode()

  // 完整读取后拼接并解析
  try {
    const data = JSON.parse(fullText)
    console.log('完整数据:', data)
  } catch (e) {
    console.error('JSON 解析错误:', e)
  }
}

// 使用
async function streamJSON(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('请求失败')
  await processStream(response.body)
}
```

### 请求取消优化

合理使用请求取消可以避免不必要的网络传输和资源消耗:

```js
// 场景:搜索框输入时取消上一次请求
let abortController = null

async function search(keyword) {
  // 取消上一次请求
  if (abortController) {
    abortController.abort()
  }
  
  abortController = new AbortController()
  
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`, {
      signal: abortController.signal
    })
    const results = await response.json()
    renderResults(results)
  } catch (error) {
    // 忽略 AbortError（请求被主动取消）
    if (error.name === 'AbortError') {
      console.log('请求已取消')
      return
    }
    console.error('搜索失败:', error)
  }
}

// 维护所有请求控制器,以便统一取消
const controllers = new Set()
function trackRequest(controller) {
  controllers.add(controller)
  return controller.signal
}

// 页面卸载时取消所有请求
window.addEventListener('beforeunload', () => {
  controllers.forEach(controller => controller.abort())
  controllers.clear()
})
```

### 并发请求优化

控制并发请求数量,避免浏览器连接数限制:

```js
// 并发请求池
class RequestPool {
  constructor(maxConcurrent = 6) {
    this.maxConcurrent = maxConcurrent
    this.current = 0
    this.queue = []
  }
  
  async request(url, options) {
    if (this.current >= this.maxConcurrent) {
      await new Promise(resolve => this.queue.push(resolve))
    }
    
    // 获取执行权限
    this.current++
    try {
      const response = await fetch(url, options)
      return await response.json()
    } finally {
      this.current--
      // 唤醒队列中的下一个请求
      if (this.queue.length > 0) {
        const next = this.queue.shift()
        next()
      }
    }
  }
}

// 使用示例
const pool = new RequestPool(3) // 最多 3 个并发请求

const urls = ['/api/1', '/api/2', '/api/3', '/api/4', '/api/5']
const promises = urls.map(url => pool.request(url))
const results = await Promise.all(promises)
```

### 预加载和预连接

```js
// DNS 预解析和预连接
function preconnect(url) {
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = url
  document.head.appendChild(link)
}

// 预加载资源
function prefetch(url) {
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = url
  document.head.appendChild(link)
}

// 预获取数据
async function preloadData(url) {
  const response = await fetch(url)
  const data = await response.json()
  // 缓存到内存或 localStorage
  sessionStorage.setItem(`preload_${url}`, JSON.stringify(data))
  return data
}
```

## 安全性最佳实践

### CORS 安全配置

```js
// 安全的跨域请求配置
fetch('https://api.example.com/data', {
  mode: 'cors', // 明确指定 CORS 模式
  credentials: 'include', // 携带 cookie
  headers: {
    'Content-Type': 'application/json'
  }
})
  .then(response => {
    // 检查响应来源
    const allowedOrigins = ['https://api.example.com']
    const responseOrigin = response.headers.get('Access-Control-Allow-Origin')
    
    if (!allowedOrigins.includes(responseOrigin)) {
      throw new Error('非法的响应来源')
    }
    
    return response.json()
  })
```

### CSRF 防护

```js
// 添加 CSRF token
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]')
  return meta ? meta.getAttribute('content') : ''
}

fetch('/api/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCsrfToken()
  },
  body: JSON.stringify({ data: 'example' })
})
```

### XSS 防护

```js
// 安全地处理响应数据
async function safeFetch(url) {
  const response = await fetch(url)
  const text = await response.text()
  
  // 对用户输入进行转义
  function escapeHtml(unsafe) {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }
  
  // 安全解析响应
  async function parseJsonResponse(response) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    try {
      return await response.json()
    } catch (error) {
      throw new Error('JSON 解析失败')
    }
  }
}
```

### 敏感数据处理

```js
// 不要在 URL 中传递敏感信息
// ❌ 错误示例
fetch('/api/user?password=123456')

// ✅ 正确示例:使用 POST 请求体
fetch('/api/user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ password: '123456' })
})

// 清理敏感数据的日志
function sanitizeForLog(data) {
  const sensitive = ['password', 'token', 'secret', 'key']
  const sanitized = { ...data }
  
  for (const key of sensitive) {
    if (sanitized[key]) {
      sanitized[key] = '***REDACTED***'
    }
  }
  
  return sanitized
}

console.log('请求数据:', sanitizeForLog(requestData))
```

## TypeScript 支持

### 基础类型定义

```typescript
// fetch 函数类型
declare function fetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response>

// RequestInit 类型
interface RequestInit {
  method?: string
  headers?: HeadersInit
  body?: BodyInit | null
  mode?: RequestMode
  credentials?: RequestCredentials
  cache?: RequestCache
  redirect?: RequestRedirect
  referrer?: string
  referrerPolicy?: ReferrerPolicy
  integrity?: string
  keepalive?: boolean
  signal?: AbortSignal | null
  window?: any
}

// Response 类型
interface Response {
  readonly headers: Headers
  readonly ok: boolean
  readonly redirected: boolean
  readonly status: number
  readonly statusText: string
  readonly type: ResponseType
  readonly url: string
  clone(): Response
}
```

### 泛型封装示例

```typescript
// 通用的请求响应类型
interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 封装 fetch 函数
async function request<T>(
  url: string,
  options?: RequestInit & { timeout?: number }
): Promise<ApiResponse<T>> {
  // 超时控制
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options?.timeout || 10000)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    return await response.json() as ApiResponse<T>
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('请求超时')
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
```

## 项目封装实践

### 基础请求封装

```js
// request.js - 统一请求封装
class HttpClient {
  constructor(config = {}) {
    this.baseURL = config.baseURL || ''
    this.timeout = config.timeout || 10000
    this.headers = config.headers || {}
  }
  
  // 请求拦截器
  interceptors = {
    request: [],
    response: []
  }
  
  // 注册拦截器
  useRequestInterceptor(handler) {
    this.interceptors.request.push(handler)
  }
  useResponseInterceptor(handler) {
    this.interceptors.response.push(handler)
  }
  
  // 核心请求方法
  async request({ url, method = 'GET', params, data, headers = {}, timeout }) {
    const fullUrl = this.baseURL + url
    let config = { url: fullUrl, method, params, data, headers: { ...this.headers, ...headers } }
    
    // 执行请求拦截器
    for (const interceptor of this.interceptors.request) {
      config = await interceptor(config) || config
    }
    
    // 构建请求 URL（处理 params）
    let requestUrl = fullUrl
    if (params) {
      requestUrl += '?' + new URLSearchParams(params).toString()
    }
    
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout || this.timeout)
    
    try {
      const response = await fetch(requestUrl, {
        method,
        headers: config.headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      let result = await response.json()
      // 执行响应拦截器
      for (const interceptor of this.interceptors.response) {
        result = await interceptor(result) || result
      }
      return result
    } finally {
      clearTimeout(timer)
    }
  }
  
  get(url, params) {
    return this.request({ url, method: 'GET', params })
  }
  post(url, data) {
    return this.request({ url, method: 'POST', data })
  }
}

// 创建默认实例
const http = new HttpClient({ baseURL: '/api' })
http.useResponseInterceptor((response) => {
  // 统一处理业务码
  if (response && response.code !== 0) {
    throw new Error(`HTTP ${response.status}: ${response.message}`)
  }
  return response
})

export default http
```

### 使用示例

```js
// api.js - API 接口定义
import http from './request'

export const userApi = {
  // 获取用户列表
  getList(params) {
    return http.get('/users', params)
  },
  
  // 获取用户详情
  getDetail(id) {
    return http.get(`/users/${id}`)
  },
  
  // 创建用户
  create(data) {
    return http.post('/users', data)
  },
  
  // 更新用户
  update(id, data) {
    return http.request({ url: `/users/${id}`, method: 'PUT', data })
  },
  
  // 删除用户
  remove(id) {
    return http.request({ url: `/users/${id}`, method: 'DELETE' })
  }
}

// 使用示例
async function loadUserList() {
  try {
    const result = await userApi.getList({ page: 1, size: 10 })
    console.log('用户列表:', result)
  } catch (error) {
    console.error('加载失败:', error)
  }
}
```

## 调试技巧

### 浏览器 DevTools 使用

**1. Network 面板**

```
打开方式: F12 -> Network 标签

查看内容:
- 请求 URL 和方法
- 请求头和响应头
- 请求体和响应体
- 时间线(DNS、连接、等待、下载)
- Cookie 和 Storage
- 请求大小和耗时
```

**2. Console 调试**

```js
// 打印请求详情
fetch('/api/data')
  .then(response => {
    console.log('Response:', response)
    console.log('Status:', response.status)
    console.log('Headers:', [...response.headers.entries()])
    
    // 克隆响应以便多次读取
    const clonedResponse = response.clone()
    
    // 打印响应体
    response.text().then(text => {
      console.log('Body:', text)
    })
  })

fetch(url, options)
  .then(response => response.json())
  .then(data => console.log('Response:', data))
  .catch(error => console.error('Error:', error))
```

**3. 请求拦截调试**

```js
// 全局 fetch 拦截器
const originalFetch = window.fetch
window.fetch = function(...args) {
  console.log('Fetch called with:', args)
  
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('Fetch response:', response)
      return response
    })
    .catch(error => {
      console.error('Fetch error:', error)
      throw error
    })
}
```

### 性能分析

```js
// 测量请求耗时
async function measureRequest(url) {
  const start = performance.now()
  
  const response = await fetch(url)
  
  const end = performance.now()
  const duration = end - start
  
  console.log(`请求耗时: ${duration.toFixed(2)}ms`)
  console.log(`请求 URL: ${url}`)
  console.log(`响应状态: ${response.status}`)
  
  return { url, duration, status: response.status }
}

// 批量性能测试
async function benchmark(urls) {
  const results = []
  for (const url of urls) {
    const result = await measureRequest(url)
    results.push(result)
  }
  
  console.table(results)
  return results
}
```

### 错误追踪

```js
// 增强的错误处理
class FetchError extends Error {
  constructor(message, response) {
    super(message)
    this.name = 'FetchError'
    this.response = response
    this.status = response?.status
    this.url = response?.url
  }
}

async function fetchWithErrorTracking(url, options = {}) {
  const start = performance.now()
  try {
    const response = await fetch(url, options)
    if (!response.ok) {
      throw new FetchError(`HTTP ${response.status}`, response)
    }
    return await response.json()
  } catch (error) {
    // 构造错误信息
    const errorInfo = {
      name: error.name,
      message: error.message,
      url,
      method: options.method || 'GET',
      status: error.response?.status,
      duration: performance.now() - start,
      timestamp: new Date().toISOString()
    }
    
    // 发送到错误监控系统
    console.error('Error tracked:', errorInfo)
    
    // 也可以发送到服务器
    // navigator.sendBeacon('/api/errors', JSON.stringify(errorInfo))
    throw error
  }
}
```

## 最佳实践

### 代码组织

- **优雅降级**：在老旧环境(如 IE、部分 IoT 浏览器)需要通过 `whatwg-fetch` 或其他 polyfill 提供 fetch 能力
- **统一封装**：项目中推荐封装一层请求工具,统一处理 baseURL、通用 headers、错误处理、登录态、缓存策略等
- **模块化设计**：将 API 接口按业务模块组织,便于维护和复用

### 性能优化

- **善用缓存**：合理设置 `cache`、`etag`、`Last-Modified`,结合 Service Worker 缓存静态或可脱机资源
- **流式处理**：大文件使用 ReadableStream 进行流式处理,避免内存溢出
- **并发控制**：控制并发请求数量,避免浏览器连接数限制
- **请求取消**：合理使用 AbortController 取消不必要的请求

### 安全性

- **CORS 配置**：跨域请求时确认服务端 CORS 配置,避免泄露敏感信息
- **CSRF 防护**：在请求头中附带 CSRF token
- **XSS 防护**：对用户输入进行转义,验证响应内容
- **敏感数据**：不要在 URL 中传递敏感信息,使用 POST 请求体

### 调试工具

- **浏览器 DevTools**：使用 Network 面板查看请求详情
- **console.log**：使用 response.clone() 克隆响应以便多次读取
- **错误追踪**：实现错误上报机制,便于问题定位

## 常见问题排查

### CORS 错误

**问题表现:**
```
Access to fetch at 'https://api.example.com/data' from origin 'https://example.com' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present 
on the requested resource.
```

**解决方案:**
1. 检查请求是否跨源
2. 确认服务端返回 `Access-Control-Allow-Origin` 头部
3. 检查是否允许携带凭证(credentials: 'include')
4. 确认预检请求(OPTIONS)是否正确处理

```js
// 服务端设置示例(Node.js/Express)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://example.com')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.header('Access-Control-Allow-Credentials', 'true')
  next()
})
```

### 二进制响应乱码

**问题原因:** 使用了错误的响应格式

**解决方案:**

```js
// ❌ 错误:将二进制当作文本处理
fetch('/api/image.png')
  .then(response => response.text())
  .then(text => console.log(text)) // 乱码

// ✅ 正确:使用 blob 或 arrayBuffer
fetch('/api/image.png')
  .then(response => response.blob())
  .then(blob => {
    const url = URL.createObjectURL(blob)
    document.querySelector('img').src = url
  })

// 或使用 arrayBuffer 处理二进制数据
fetch('/api/data.bin')
  .then(response => response.arrayBuffer())
  .then(buffer => {
    const view = new DataView(buffer)
    // 处理二进制数据
  })
```

### 多次读取 body 报错

**问题表现:**
```
TypeError: Failed to execute 'text' on 'Response': body stream is locked
```

**原因:** 请求或响应流只能读取一次

**解决方案:**

```js
// ❌ 错误:多次读取
fetch('/api/data')
  .then(response => {
    response.json() // 第一次读取
    response.text() // 第二次读取会报错
  })

// ✅ 正确:使用 clone()
fetch('/api/data')
  .then(response => {
    const clone1 = response.clone()
    const clone2 = response.clone()
    // clone1 和 clone2 可以分别读取
    return clone1.json()
  })
  .then(data => {
    // 多次使用 data
    console.log(data)
    processData(data)
    saveData(data)
  })
```

### 上传大文件失败

**问题原因:** 
- 请求超时
- 服务器限制文件大小
- 网络中断

**解决方案:**

```js
// 1. 分片上传
async function uploadFileInChunks(file, chunkSize = 1024 * 1024) {
  const totalChunks = Math.ceil(file.size / chunkSize)
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize
    const end = Math.min(start + chunkSize, file.size)
    const chunk = file.slice(start, end)
    
    const formData = new FormData()
    formData.append('chunk', chunk)
    formData.append('index', i)
    formData.append('totalChunks', totalChunks)
    formData.append('filename', file.name)
    
    try {
      await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      // 更新上传进度
      console.log(`上传进度: ${((i + 1) / totalChunks * 100).toFixed(0)}%`)
    } catch (error) {
      // 上传失败,保存进度
      saveUploadProgress(fileId, i)
      throw error
    }
  }
}
```

### 页面卸载丢请求

**问题:** 用户关闭页面或跳转时,未完成的请求被中断

**解决方案:**

```js
// 1. 使用 keepalive(适用于小数据)
window.addEventListener('beforeunload', () => {
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({ action: 'leave' }),
    keepalive: true // 注意:body 大小不能超过 64KB
  })
})

// 2. 使用 sendBeacon(推荐)
window.addEventListener('beforeunload', () => {
  const data = JSON.stringify({ action: 'leave', timestamp: Date.now() })
  navigator.sendBeacon('/api/analytics', data)
})

// 3. 使用 visibilitychange 事件
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    // 页面隐藏时发送数据
    const data = JSON.stringify({ action: 'hide' })
    navigator.sendBeacon('/api/analytics', data)
  }
})
```

### 内存泄漏

**问题:** 未取消的请求或未清理的定时器导致内存泄漏

**解决方案:**

```js
// 使用 AbortController 管理请求生命周期
class FetchManager {
  constructor() {
    this.controllers = new Map()
  }
  
  fetch(id, url, options = {}) {
    // 取消之前的请求
    this.abort(id)
    
    const controller = new AbortController()
    this.controllers.set(id, controller)
    
    return fetch(url, { ...options, signal: controller.signal })
      .then(response => {
        // 请求完成后移除控制器
        this.controllers.delete(id)
        return response.json()
      })
      .catch(error => {
        this.controllers.delete(id)
        if (error.name !== 'AbortError') throw error
      })
  }
  
  // 取消单个请求
  abort(id) {
    const controller = this.controllers.get(id)
    if (controller) {
      controller.abort()
      this.controllers.delete(id)
    }
  }
  
  // 取消所有请求
  abortAll() {
    this.controllers.forEach(controller => controller.abort())
    this.controllers.clear()
  }
}

const fetchManager = new FetchManager()

// 页面卸载时清理
window.addEventListener('beforeunload', () => {
  fetchManager.abortAll()
})
```
