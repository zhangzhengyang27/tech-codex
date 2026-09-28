---
title: Axios中文文档
description: "Axios 是一个基于 promise 的 HTTP 库，可以用在浏览器和 node.js 中。在浏览器中创建 XMLHttpRequests，在 node.js 创建 http 请求。"
keywords: [Axios中文文档]
category: tools
tags: [Axios, HTTP, 请求库]
---


# Axios 中文文档

Axios 是一个基于 promise 的 HTTP 库，可以用在浏览器和 node.js 中。在浏览器中创建 [XMLHttpRequests](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest)，在 node.js 创建 [http](http://nodejs.org/api/http.html) 请求。

## 特性

- ✅ 支持 [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) API
- ✅ 拦截请求和响应
- ✅ 转换请求数据和响应数据
- ✅ 取消请求（支持 CancelToken 和 AbortController）
- ✅ 自动转换 JSON 数据
- ✅ 客户端支持防御 [XSRF](http://en.wikipedia.org/wiki/Cross-site_request_forgery)
- ✅ 支持上传/下载进度监控
- ✅ 支持请求/响应超时设置
- ✅ 支持 TypeScript

## 兼容性

axios 依赖原生的 ES6 Promise 实现而[被支持](http://caniuse.com/promises)。如果你的环境不支持 ES6 Promise，你可以使用 [polyfill](https://github.com/jakearchibald/es6-promise)。

## 安装使用

### 安装

```shell
# 使用 npm
npm install axios

# 使用 yarn
yarn add axios

# 使用 pnpm
pnpm add axios

# 使用 CDN
<script src="https://unpkg.com/axios/dist/axios.min.js"></script>
```

### 引入

```javascript
// ES6 模块
import axios from "axios"

// CommonJS
const axios = require("axios")

// 浏览器环境（通过 CDN）
// axios 会自动挂载到 window 对象上
```

## 基本用法

### GET 请求

使用 Axios 执行 GET 请求有多种方式：

```javascript
// 方式 1: 使用 URL 参数
axios
  .get("/user?ID=12345")
  .then(function (response) {
    console.log(response.data)
  })
  .catch(function (error) {
    console.log(error)
  })

// 方式 2: 使用 params 配置（推荐）
axios
  .get("/user", {
    params: {
      ID: 12345
    }
  })
  .then(function (response) {
    console.log(response.data)
  })
  .catch(function (error) {
    console.log(error)
  })

// 方式 3: 使用 async/await（推荐）
async function getUser() {
  try {
    const response = await axios.get("/user", {
      params: { ID: 12345 }
    })
    console.log(response.data)
  } catch (error) {
    console.error(error)
  }
}
```

### POST 请求

```javascript
// 方式 1: 使用 Promise
axios
  .post("/user", {
    firstName: "Fred",
    lastName: "Flintstone"
  })
  .then(function (response) {
    console.log(response.data)
  })
  .catch(function (error) {
    console.log(error)
  })

// 方式 2: 使用 async/await（推荐）
async function createUser() {
  try {
    const response = await axios.post("/user", {
      firstName: "Fred",
      lastName: "Flintstone"
    })
    console.log(response.data)
  } catch (error) {
    console.error(error)
  }
}
```

### PUT、PATCH、DELETE 请求

```javascript
// PUT 请求 - 更新整个资源
axios.put("/user/12345", {
  firstName: "Fred",
  lastName: "Flintstone"
})

// PATCH 请求 - 部分更新资源
axios.patch("/user/12345", {
  firstName: "Fred"
})

// DELETE 请求
axios.delete("/user/12345")
```

### 并发请求

执行多个并发请求可以使用 `Promise.all` 或 `axios.all`：

```javascript
// 方式 1: 使用 Promise.all（推荐）
async function getMultipleData() {
  try {
    const [userResponse, permissionsResponse] = await Promise.all([axios.get("/user/12345"), axios.get("/user/12345/permissions")])
    console.log(userResponse.data)
    console.log(permissionsResponse.data)
  } catch (error) {
    console.error(error)
  }
}

// 方式 2: 使用 axios.all（不推荐，建议使用 Promise.all）
function getUserAccount() {
  return axios.get("/user/12345")
}

function getUserPermissions() {
  return axios.get("/user/12345/permissions")
}

axios.all([getUserAccount(), getUserPermissions()]).then(
  axios.spread(function (acct, perms) {
    // 两个请求现在都执行完成
    console.log(acct.data)
    console.log(perms.data)
  })
)
```

## axios API

可以通过向 axios 传递相关配置来创建请求

```javascript
// 发送 POST 请求
axios({
  method: "post",
  url: "/user/12345",
  data: {
    firstName: "Fred",
    lastName: "Flintstone"
  }
})

// 获取远端图片
axios({
  method: "get",
  url: "http://bit.ly/2mTM3nY",
  responseType: "stream"
}).then(function (response) {
  response.data.pipe(fs.createWriteStream("ada_lovelace.jpg"))
})

// 发送 GET 请求（默认的方法）
axios("/user/12345")
```

### 请求方法的别名

为方便起见，为所有支持的请求方法提供了别名

- axios.request(config)

- axios.get(url[, config])

- axios.delete(url[, config])

- axios.head(url[, config])

- axios.options(url[, config])

- axios.post(url[, data[, config]])

- axios.put(url[, data[, config]])

- axios.patch(url[, data[, config]])

在使用别名方法时 `url`、`method`、`data` 这些属性都不必在配置中指定

### 并发

处理并发请求的助手函数

- axios.all(iterable)

- axios.spread(callback)

```javascript
// 引入axios库
const axios = require("axios")

// 定义两个请求
const request1 = axios.get("https://api.example.com/user?ID=12345")
const request2 = axios.get("https://api.example.com/user?ID=67890")

// 使用 axios.all 发送请求
axios
  .all([request1, request2])
  .then(
    axios.spread((response1, response2) => {
      // response1 和 response2 是两个请求的响应对象
      console.log(response1.data)
      console.log(response2.data)
    })
  )
  .catch((error) => {
    // 捕获并处理错误
    console.error(error)
  })
```

### axios.create([config])

可以使用自定义配置新建一个 axios 实例

```javascript
const instance = axios.create({
  baseURL: "https://some-domain.com/api/",
  timeout: 1000,
  headers: { "X-Custom-Header": "foobar" }
})
```

## 请求配置

创建请求时可以用的配置选项。只有 url 是必需的。如果没有指定 method，请求将默认使用 get 方法

```javascript
{
  url: '/user',
  method: 'get', // default

  // baseURL 将自动加在 url 前面，除非 url 是一个绝对 URL。
  baseURL: 'https://some-domain.com/api/',

  // transformRequest 允许在向服务器发送前，修改请求数据
  // 只能用在 'PUT', 'POST' 和 'PATCH' 这几个请求方法
  // 后面数组中的函数必须返回一个字符串，或 ArrayBuffer，或 Stream
  transformRequest: [function (data, headers) {
    // 对 data 进行任意转换处理
    return data;
  }],

  // transformResponse 在传递给 then/catch 前，允许修改响应数据
  transformResponse: [function (data) {
    // 对 data 进行任意转换处理
    return data;
  }],

  // headers 是即将被发送的自定义请求头
  headers: {'X-Requested-With': 'XMLHttpRequest'},

  // params 是即将与请求一起发送的 URL 参数，必须是一个无格式对象(plain object)或 URLSearchParams 对象
  params: {
    ID: 12345
  },

   // paramsSerializer 是一个负责 params 序列化的函数
  // (e.g. https://www.npmjs.com/package/qs, http://api.jquery.com/jquery.param/)
  paramsSerializer: function(params) {
    return Qs.stringify(params, {arrayFormat: 'brackets'})
  },

  // data 是作为请求主体被发送的数据，只适用于这些请求方法 'PUT', 'POST', 和 'PATCH'
  // 在没有设置 transformRequest 时，必须是以下类型之一：
  // - string, plain object, ArrayBuffer, ArrayBufferView, URLSearchParams
  // - 浏览器专属：FormData, File, Blob
  // - Node 专属： Stream
  data: {
    firstName: 'Fred'
  },

  // timeout 指定请求超时的毫秒数(0 表示无超时时间)，如果请求花费了超过 `timeout` 的时间，请求将被中断
  timeout: 1000,

   // withCredentials 表示跨域请求时是否需要使用凭证
  withCredentials: false, // default

  // adapter 允许自定义处理请求，以使测试更轻松
  // 返回一个 promise 并应用一个有效的响应 (查阅 [response docs](#response-api)).
  adapter: function (config) {
    /* ... */
  },

  // auth 表示应该使用 HTTP 基础验证，并提供凭据
  // 这将设置一个 Authorization 头，覆写掉现有的任意使用 headers 设置的自定义 Authorization 头
  auth: {
    username: 'janedoe',
    password: 's00pers3cret'
  },

   // responseType 表示服务器响应的数据类型，可以是 'arraybuffer', 'blob', 'document', 'json', 'text', 'stream'
  responseType: 'json', // default

  // `responseEncoding` indicates encoding to use for decoding responses
  // Note: Ignored for `responseType` of 'stream' or client-side requests
  responseEncoding: 'utf8', // default

   // xsrfCookieName 是用作 xsrf token 的值的 cookie 的名称
  xsrfCookieName: 'XSRF-TOKEN', // default

  // xsrfHeaderName is the name of the http header that carries the xsrf token value
  xsrfHeaderName: 'X-XSRF-TOKEN', // default

   // onUploadProgress 允许为上传处理进度事件
  onUploadProgress: function (progressEvent) {
    // Do whatever you want with the native progress event
  },

  // onDownloadProgress 允许为下载处理进度事件
  onDownloadProgress: function (progressEvent) {
    // 对原生进度事件的处理
  },

  // maxContentLength 定义允许的响应内容的最大尺寸
  maxContentLength: 2000,

  // validateStatus 定义对于给定的HTTP 响应状态码是 resolve 或 reject  promise 。
  // 如果 validateStatus 返回 true (或者设置为 null 或 undefined)，promise 将被 resolve;
  // 否则，promise 将被 rejected
  validateStatus: function (status) {
    return status >= 200 && status < 300; // default
  },

  // maxRedirects 定义在 node.js 中 follow 的最大重定向数目
  // 如果设置为0，将不会 follow 任何重定向
  maxRedirects: 5, // default

  // `socketPath` defines a UNIX Socket to be used in node.js.
  // e.g. '/var/run/docker.sock' to send requests to the docker daemon.
  // Only either `socketPath` or `proxy` can be specified.
  // If both are specified, `socketPath` is used.
  socketPath: null, // default

  // httpAgent 和 httpsAgent 分别在 node.js 中用于定义在执行 http 和 https 时使用的自定义代理。
  // 允许像这样配置选项：
  // keepAlive 默认没有启用
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),

  // proxy 定义代理服务器的主机名称和端口
  // auth 表示 HTTP 基础验证应当用于连接代理，并提供凭据
  // 这将会设置一个 Proxy-Authorization 头，覆写掉已有的通过使用 header
  // 设置的自定义 Proxy-Authorization 头。
  proxy: {
    host: '127.0.0.1',
    port: 9000,
    auth: {
      username: 'mikeymike',
      password: 'rapunz3l'
    }
  },

  // cancelToken 指定用于取消请求的 cancel token（已废弃，建议改用 signal）
  // 查看后面的「取消请求」一节了解更多
  cancelToken: new CancelToken(function (cancel) {
  })
}
```

## 响应结构

某个请求的响应包含以下信息

```javascript
{
  data: {},   // data 由服务器提供的响应

  status: 200,   // status 来自服务器响应的 HTTP 状态码

  statusText: 'OK',   // statusText 来自服务器响应的 HTTP 状态信息

  headers: {},   // headers 服务器响应的头

  // config 是为请求提供的配置信息
  config: {},
  // `request` is the request that generated this response
  // It is the last ClientRequest instance in node.js (in redirects)
  // and an XMLHttpRequest instance the browser
  request: {}
}
```

使用 `then` 时，你将接收下面这样的响应 :

```javascript
axios.get("/user/12345").then(function (response) {
  console.log(response.data)
  console.log(response.status)
  console.log(response.statusText)
  console.log(response.headers)
  console.log(response.config)
})
```

## 配置默认值

全局的 axios 默认值

```javascript
axios.defaults.baseURL = "https://api.example.com"
axios.defaults.headers.common["Authorization"] = AUTH_TOKEN
axios.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded"
```

自定义实例默认值

```javascript
const instance = axios.create({
  baseURL: "https://api.example.com"
})

// Alter defaults after instance has been created
instance.defaults.headers.common["Authorization"] = AUTH_TOKEN
```

### 配置的优先顺序

配置会以一个优先顺序进行合并。这个顺序是：在 `lib/defaults.js` 找到的库的默认值，然后是实例的 `defaults` 属性，最后是请求的 `config` 参数。后者将优先于前者

```javascript
// 使用由库提供的配置的默认值来创建实例，此时超时配置的默认值是 `0`
var instance = axios.create()

// 覆写库的超时默认值。现在在超时前，所有请求都会等待 2.5 秒
instance.defaults.timeout = 2500

// 为已知需要花费很长时间的请求覆写超时设置
instance.get("/longRequest", {
  timeout: 5000
})
```

## 拦截器

在请求或响应被 `then` 或 `catch` 处理前拦截它们。拦截器是 Axios 非常强大的功能，常用于添加认证 token、统一处理错误、添加 loading 状态等。

### 拦截器基本用法

```javascript
// 添加请求拦截器
axios.interceptors.request.use(
  function (config) {
    // 在发送请求之前做些什么
    return config
  },
  function (error) {
    // 对请求错误做些什么
    return Promise.reject(error)
  }
)

// 添加响应拦截器
axios.interceptors.response.use(
  function (response) {
    // 对响应数据做点什么
    return response
  },
  function (error) {
    // 对响应错误做点什么
    return Promise.reject(error)
  }
)
```

### 实际应用场景

#### 1. 添加认证 Token

```javascript
// 请求拦截器：添加 token
axios.interceptors.request.use(
  function (config) {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  function (error) {
    return Promise.reject(error)
  }
)
```

#### 2. 统一处理响应数据

```javascript
// 响应拦截器：统一处理响应格式
axios.interceptors.response.use(
  function (response) {
    // 假设后端返回格式为 { code: 200, data: {}, message: '' }
    const { code, data, message } = response.data

    if (code === 200) {
      return data // 直接返回 data 部分
    } else {
      return Promise.reject(new Error(message || "请求失败"))
    }
  },
  function (error) {
    return Promise.reject(error)
  }
)
```

#### 3. 统一错误处理

```javascript
// 响应拦截器：统一错误处理
axios.interceptors.response.use(
  function (response) {
    return response
  },
  function (error) {
    if (error.response) {
      // 服务器返回了错误状态码
      switch (error.response.status) {
        case 401:
          // 未授权，跳转到登录页
          window.location.href = "/login"
          break
        case 403:
          console.error("没有权限访问")
          break
        case 404:
          console.error("请求的资源不存在")
          break
        case 500:
          console.error("服务器错误")
          break
        default:
          console.error("请求失败")
      }
    } else if (error.request) {
      // 请求已发出，但没有收到响应
      console.error("网络错误，请检查网络连接")
    } else {
      // 在设置请求时发生了错误
      console.error("请求配置错误", error.message)
    }
    return Promise.reject(error)
  }
)
```

#### 4. 添加 Loading 状态

```javascript
let loadingCount = 0

// 请求拦截器：显示 loading
axios.interceptors.request.use(
  function (config) {
    loadingCount++
    if (loadingCount === 1) {
      // 显示 loading
      showLoading()
    }
    return config
  },
  function (error) {
    loadingCount--
    if (loadingCount === 0) {
      hideLoading()
    }
    return Promise.reject(error)
  }
)

// 响应拦截器：隐藏 loading
axios.interceptors.response.use(
  function (response) {
    loadingCount--
    if (loadingCount === 0) {
      hideLoading()
    }
    return response
  },
  function (error) {
    loadingCount--
    if (loadingCount === 0) {
      hideLoading()
    }
    return Promise.reject(error)
  }
)
```

#### 5. 请求重试

```javascript
axios.interceptors.response.use(
  function (response) {
    return response
  },
  async function (error) {
    const config = error.config

    // 如果已经重试过，直接拒绝
    if (config.__retryCount >= 3) {
      return Promise.reject(error)
    }

    // 设置重试次数
    config.__retryCount = config.__retryCount || 0
    config.__retryCount++

    // 等待一段时间后重试
    await new Promise((resolve) => setTimeout(resolve, 1000))

    return axios(config)
  }
)
```

### 移除拦截器

如果你想在稍后移除拦截器，可以这样：

```javascript
const myInterceptor = axios.interceptors.request.use(function () {
  /*...*/
})

// 移除拦截器
axios.interceptors.request.eject(myInterceptor)
```

### 为自定义实例添加拦截器

```javascript
const instance = axios.create({
  baseURL: "https://api.example.com"
})

instance.interceptors.request.use(function (config) {
  // 自定义实例的请求拦截器
  return config
})

instance.interceptors.response.use(function (response) {
  // 自定义实例的响应拦截器
  return response
})
```

## 错误处理

```javascript
axios.get("/user/12345").catch(function (error) {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.log(error.response.data)
    console.log(error.response.status)
    console.log(error.response.headers)
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    console.log(error.request)
  } else {
    // Something happened in setting up the request that triggered an Error
    console.log("Error", error.message)
  }
  console.log(error.config)
})
```

可以使用 `validateStatus` 配置选项定义一个自定义 HTTP 状态码的错误范围

```javascript
axios.get("/user/12345", {
  validateStatus: function (status) {
    return status < 500 // Reject only if the status code is greater than or equal to 500
  }
})
```

## 取消请求

Axios 支持两种方式取消请求：

1. **CancelToken**（已废弃，但仍可使用）
2. **AbortController**（推荐，现代浏览器和 Node.js 18+ 支持）

### 使用 AbortController（推荐）

`AbortController` 是现代浏览器和 Node.js 18+ 原生支持的标准 API，推荐使用：

```javascript
// 创建 AbortController
const controller = new AbortController()

// 发送请求
axios
  .get("/user/12345", {
    signal: controller.signal
  })
  .then(function (response) {
    console.log(response.data)
  })
  .catch(function (error) {
    if (axios.isCancel(error)) {
      console.log("请求已取消", error.message)
    } else {
      console.error("请求错误", error)
    }
  })

// 取消请求
controller.abort("操作被用户取消")
```

### 使用 CancelToken（已废弃）

虽然已废弃，但在旧版本中仍可使用：

```javascript
const CancelToken = axios.CancelToken
const source = CancelToken.source()

axios
  .get("/user/12345", {
    cancelToken: source.token
  })
  .catch(function (thrown) {
    if (axios.isCancel(thrown)) {
      console.log("请求已取消", thrown.message)
    } else {
      // 处理错误
    }
  })

// 取消请求（message 参数是可选的）
source.cancel("操作被用户取消")
```

还可以通过传递一个 executor 函数到 `CancelToken` 的构造函数来创建 cancel token：

```javascript
const CancelToken = axios.CancelToken
let cancel

axios.get("/user/12345", {
  cancelToken: new CancelToken(function executor(c) {
    // executor 函数接收一个 cancel 函数作为参数
    cancel = c
  })
})

// 取消请求
cancel("操作被用户取消")
```

### 取消请求的实际应用场景

#### 1. 取消重复请求

```javascript
const pendingRequests = new Map()

function requestWithCancel(url, config = {}) {
  // 如果存在相同的请求，先取消
  if (pendingRequests.has(url)) {
    pendingRequests.get(url).abort()
  }

  const controller = new AbortController()
  pendingRequests.set(url, controller)

  return axios
    .get(url, {
      ...config,
      signal: controller.signal
    })
    .finally(() => {
      pendingRequests.delete(url)
    })
}
```

#### 2. 组件卸载时取消请求

```javascript
// React 示例
import { useEffect, useRef } from "react"

function UserProfile({ userId }) {
  const controllerRef = useRef(null)

  useEffect(() => {
    controllerRef.current = new AbortController()

    axios
      .get(`/user/${userId}`, {
        signal: controllerRef.current.signal
      })
      .then((response) => {
        // 处理响应
      })

    // 组件卸载时取消请求
    return () => {
      controllerRef.current?.abort()
    }
  }, [userId])

  return <div>...</div>
}
```

#### 3. 取消多个请求

```javascript
const controller = new AbortController()

// 使用同一个 controller 可以取消多个请求
Promise.all([
  axios.get("/user/12345", { signal: controller.signal }),
  axios.get("/user/12345/permissions", { signal: controller.signal }),
  axios.get("/user/12345/settings", { signal: controller.signal })
]).catch((error) => {
  if (axios.isCancel(error)) {
    console.log("所有请求已取消")
  }
})

// 取消所有请求
controller.abort()
```

**注意**: 可以使用同一个 cancel token 或 AbortController 取消多个请求

## 文件上传/下载

### 文件上传

#### 1. 单文件上传

```javascript
// 方式 1: 使用 FormData
const formData = new FormData()
const fileInput = document.querySelector('input[type="file"]')
formData.append("file", fileInput.files[0])

axios.post("/upload", formData, {
  headers: {
    "Content-Type": "multipart/form-data"
  },
  onUploadProgress: function (progressEvent) {
    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
    console.log(`上传进度: ${percentCompleted}%`)
  }
})
```

#### 2. 多文件上传

```javascript
const formData = new FormData()
const files = document.querySelector('input[type="file"]').files

for (let i = 0; i < files.length; i++) {
  formData.append("files", files[i])
}

axios.post("/upload/multiple", formData, {
  headers: {
    "Content-Type": "multipart/form-data"
  },
  onUploadProgress: function (progressEvent) {
    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
    console.log(`上传进度: ${percentCompleted}%`)
  }
})
```

#### 3. 带其他数据的文件上传

```javascript
const formData = new FormData()
formData.append("file", fileInput.files[0])
formData.append("userId", "12345")
formData.append("description", "文件描述")

axios.post("/upload", formData, {
  headers: {
    "Content-Type": "multipart/form-data"
  }
})
```

#### 4. 使用 async/await

```javascript
async function uploadFile(file) {
  const formData = new FormData()
  formData.append("file", file)

  try {
    const response = await axios.post("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
        console.log(`上传进度: ${percentCompleted}%`)
      }
    })
    console.log("上传成功", response.data)
  } catch (error) {
    console.error("上传失败", error)
  }
}
```

### 文件下载

#### 1. 下载文件（浏览器）

```javascript
// 方式 1: 使用 blob
axios
  .get("/download/file.pdf", {
    responseType: "blob"
  })
  .then((response) => {
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "file.pdf")
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  })

// 方式 2: 使用 arraybuffer
axios
  .get("/download/file.pdf", {
    responseType: "arraybuffer",
    onDownloadProgress: function (progressEvent) {
      const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
      console.log(`下载进度: ${percentCompleted}%`)
    }
  })
  .then((response) => {
    const blob = new Blob([response.data], { type: "application/pdf" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", "file.pdf")
    document.body.appendChild(link)
    link.click()
  })
```

#### 2. 下载文件（Node.js）

```javascript
const fs = require("fs")
const axios = require("axios")

axios({
  method: "get",
  url: "http://example.com/file.pdf",
  responseType: "stream"
}).then((response) => {
  response.data.pipe(fs.createWriteStream("file.pdf"))
})
```

## 使用 application/x-www-form-urlencoded 格式

默认情况下 axios 将 JavaScript 对象序列化为 JSON。但是要以 application/x-www-form-urlencoded 格式发送数据，可以使用以下选项之一

### 浏览器

在浏览器中可以使用 URLSearchParams API，以 application/x-www-form-urlencoded 格式发送数据

```javascript
const params = new URLSearchParams()
params.append("param1", "value1")
params.append("param2", "value2")
axios.post("/foo", params)
```

请注意，并非所有浏览器都支持 URLSearchParams（请参阅 caniuse.com），但可以使用 polyfill（确保填充全局环境）

或者，使用 qs 库编码数据

```javascript
const qs = require("qs")
axios.post("/foo", qs.stringify({ bar: 123 }))
```

或者使用 ES6 模块的方式

```javascript
import qs from "qs"
const data = { bar: 123 }
const options = {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  data: qs.stringify(data),
  url
}
axios(options)
```

### Node.js

可以使用 querystring 模块，也可以使用 qs 库

```javascript
const querystring = require("querystring")
axios.post("http://something.com/", querystring.stringify({ foo: "bar" }))
```

## TypeScript

axios 内置了完整的 TypeScript 类型定义，提供了良好的类型支持。

### 基本使用

```typescript
import axios from "axios"

// 基本请求
axios.get("/user?ID=12345")

// 带类型推断
interface User {
  id: number
  name: string
  email: string
}

axios.get<User>("/user/12345").then((response) => {
  // response.data 的类型是 User
  console.log(response.data.name)
})
```

### 定义响应类型

```typescript
interface ApiResponse<T> {
  code: number
  data: T
  message: string
}

interface User {
  id: number
  name: string
  email: string
}

// 使用泛型定义响应类型
axios.get<ApiResponse<User>>("/user/12345").then((response) => {
  // response.data 的类型是 ApiResponse<User>
  const user = response.data.data
  console.log(user.name)
})
```

### 自定义请求配置类型

```typescript
import axios, { AxiosRequestConfig, AxiosResponse } from "axios"

interface CustomRequestConfig extends AxiosRequestConfig {
  showLoading?: boolean
  retry?: number
}

const customConfig: CustomRequestConfig = {
  url: "/user/12345",
  method: "get",
  showLoading: true,
  retry: 3
}

axios(customConfig)
```

### 扩展 Axios 实例类型

```typescript
import axios, { AxiosInstance, AxiosRequestConfig } from "axios"

interface CustomConfig extends AxiosRequestConfig {
  showLoading?: boolean
}

interface CustomInstance extends AxiosInstance {
  get<T = any>(url: string, config?: CustomConfig): Promise<T>
  post<T = any>(url: string, data?: any, config?: CustomConfig): Promise<T>
}

const instance: CustomInstance = axios.create({
  baseURL: "https://api.example.com"
}) as CustomInstance

// 使用
instance.get<User>("/user/12345", { showLoading: true })
```

### 拦截器类型

```typescript
import axios, { AxiosRequestConfig, AxiosResponse, AxiosError } from "axios"

// 请求拦截器
axios.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    // 添加 token
    const token = localStorage.getItem("token")
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
axios.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: AxiosError) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          // 处理未授权
          break
        case 500:
          // 处理服务器错误
          break
      }
    }
    return Promise.reject(error)
  }
)
```

### 错误处理类型

```typescript
import axios, { AxiosError } from "axios"

axios.get("/user/12345").catch((error: AxiosError) => {
  if (error.response) {
    // 服务器返回了错误状态码
    console.error("响应错误:", error.response.status)
    console.error("错误数据:", error.response.data)
  } else if (error.request) {
    // 请求已发出，但没有收到响应
    console.error("请求错误:", error.request)
  } else {
    // 在设置请求时发生了错误
    console.error("错误:", error.message)
  }
})
```

## 最佳实践

### 1. 创建 Axios 实例

为不同的 API 创建不同的实例，避免全局配置污染：

```javascript
// api.js
import axios from "axios"

// 创建主 API 实例
const api = axios.create({
  baseURL: "https://api.example.com",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json"
  }
})

// 创建文件上传实例
const uploadApi = axios.create({
  baseURL: "https://api.example.com",
  timeout: 30000,
  headers: {
    "Content-Type": "multipart/form-data"
  }
})

export { api, uploadApi }
```

### 2. 统一错误处理

```javascript
// 响应拦截器统一处理错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 统一错误处理逻辑
    const message = error.response?.data?.message || error.message || "请求失败"

    // 可以在这里统一显示错误提示
    // showToast(message)

    return Promise.reject(error)
  }
)
```

### 3. 使用环境变量

```javascript
// config.js
const API_BASE_URL = process.env.VUE_APP_API_BASE_URL || "https://api.example.com"

const api = axios.create({
  baseURL: API_BASE_URL
})
```

### 4. 封装请求方法

```javascript
// request.js
import axios from "axios"

const request = {
  get(url, params, config = {}) {
    return axios.get(url, { params, ...config })
  },

  post(url, data, config = {}) {
    return axios.post(url, data, config)
  },

  put(url, data, config = {}) {
    return axios.put(url, data, config)
  },

  delete(url, config = {}) {
    return axios.delete(url, config)
  }
}

export default request
```

### 5. 请求和响应数据转换

```javascript
// 请求拦截器：转换请求数据
api.interceptors.request.use((config) => {
  // 可以在这里对请求数据进行转换
  if (config.data && typeof config.data === "object") {
    // 例如：添加时间戳
    config.data.timestamp = Date.now()
  }
  return config
})

// 响应拦截器：转换响应数据
api.interceptors.response.use((response) => {
  // 统一处理响应数据格式
  if (response.data.code === 200) {
    return response.data.data
  } else {
    return Promise.reject(new Error(response.data.message))
  }
})
```

### 6. 避免内存泄漏

在组件卸载时取消请求：

```javascript
// React 示例
useEffect(() => {
  const controller = new AbortController()

  api.get("/data", { signal: controller.signal }).then((response) => {
    // 处理响应
  })

  return () => {
    controller.abort()
  }
}, [])
```

## 常见问题

### 1. CORS 跨域问题

**问题**: 浏览器报 CORS 错误

**解决方案**:

- 后端需要设置正确的 CORS 头
- 开发环境可以使用代理
- 生产环境需要后端支持 CORS

```javascript
// 开发环境代理配置（Vue CLI）
// vue.config.js
module.exports = {
  devServer: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        pathRewrite: {
          "^/api": ""
        }
      }
    }
  }
}
```

### 2. 请求参数为数组时的序列化

**问题**: 数组参数序列化格式不符合后端要求

**解决方案**: 使用 `paramsSerializer`

```javascript
import qs from "qs"

axios.get("/api/users", {
  params: {
    ids: [1, 2, 3]
  },
  paramsSerializer: (params) => {
    return qs.stringify(params, { arrayFormat: "brackets" })
  }
})
```

### 3. 请求超时处理

**问题**: 请求超时后如何处理

**解决方案**: 设置合理的超时时间并处理超时错误

```javascript
const api = axios.create({
  timeout: 10000
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === "ECONNABORTED") {
      console.error("请求超时")
      // 可以在这里显示超时提示
    }
    return Promise.reject(error)
  }
)
```

### 4. 重复请求问题

**解决方案**: 使用防抖或取消重复请求（完整实现见上文「取消请求的实际应用场景 > 1. 取消重复请求」，通过 Map 记录进行中的请求并取消旧的重复请求）。

### 5. 文件上传时 Content-Type 问题

**问题**: 手动设置 `Content-Type: multipart/form-data` 可能导致边界丢失

**解决方案**: 让浏览器自动设置 Content-Type

```javascript
// ❌ 错误：手动设置 Content-Type
axios.post("/upload", formData, {
  headers: {
    "Content-Type": "multipart/form-data" // 不要手动设置
  }
})

// ✅ 正确：让浏览器自动设置
axios.post("/upload", formData)
// 或者只设置其他头部
axios.post("/upload", formData, {
  headers: {
    Authorization: "Bearer token"
  }
})
```

### 6. 响应数据不是 JSON 格式

**问题**: 后端返回的不是 JSON，导致解析失败

**解决方案**: 设置正确的 `responseType`

```javascript
// 文本响应
axios.get("/api/data", {
  responseType: "text"
})

// Blob 响应
axios.get("/api/file", {
  responseType: "blob"
})

// ArrayBuffer 响应
axios.get("/api/binary", {
  responseType: "arraybuffer"
})
```

### 7. 请求拦截器中异步操作

**问题**: 在请求拦截器中使用异步操作

**解决方案**: 返回 Promise

```javascript
axios.interceptors.request.use(async (config) => {
  // 异步获取 token
  const token = await getToken()
  config.headers.Authorization = `Bearer ${token}`
  return config
})
```

### 8. 取消请求的判断

**问题**: 如何判断请求是否被取消

**解决方案**: 使用 `axios.isCancel()`

```javascript
axios
  .get("/api/data", {
    signal: controller.signal
  })
  .catch((error) => {
    if (axios.isCancel(error)) {
      console.log("请求已取消")
    } else {
      console.error("请求错误", error)
    }
  })
```
