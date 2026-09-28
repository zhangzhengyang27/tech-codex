---
title: Koa 基础
description: Koa 是由 Express 原班人马打造的下一代 Node.js Web 框架。它以其轻量级、模块化和强大的中间件机制而备受青睐，致力于成为 Web 应用和 API 开发领域中的一个更小、更富有表现力、更健壮的基石。本文涵盖快速上手、核心概念、洋葱模型、路由系统与常用中间件。
keywords: [Node.js, Web框架, Koa]
category: Node.js
tags: [Node.js, Web框架]
---







# Koa 基础

## 介绍

Koa 是由 Express 原班人马打造的下一代 Node.js Web 框架。它以其轻量级、模块化和强大的中间件机制而备受青睐，致力于成为 Web 应用和 API 开发领域中的一个更小、更富有表现力、更健壮的基石。

### 设计理念

> Express 集成大量内置功能（如路由、模板引擎），虽然提高开发效率，但也导致框架变得臃肿且扩展性不足。为了解决这些问题，Koa 应运而生。它选择一条极简主义的道路，不再内置任何中间件，而是提供一个优雅、可扩展的核心，让开发者可以按需自由组合功能。

Koa 2 全面拥抱 `async/await`，使得异步代码的书写如同步般自然流畅，彻底告别了回调地狱。

### 核心特点

| 特性 | 描述 |
|------|------|
| **轻量高效** | 核心代码仅约 2000 行，不捆绑任何中间件，保持极高的性能和灵活性 |
| **异步友好** | 基于 `async/await`，提供了业界领先的异步流程控制方案 |
| **洋葱模型** | 独特的中间件执行模型，允许在请求和响应阶段进行双向处理 |
| **Context 对象** | 封装 Node.js 的 `request` 和 `response`，提供大量便捷 API |
| **错误处理** | 通过 `try/catch` 机制，轻松实现全局统一的错误管理 |

### Koa vs Express 对比

| 对比项 | Koa | Express |
|--------|-----|---------|
| 核心大小 | ~2000 行 | ~5000+ 行 |
| 内置中间件 | 无 | 路由、静态文件等 |
| 异步支持 | async/await | 回调/Promise |
| Context 对象 | 统一的 ctx | 分离的 req/res |
| 错误处理 | try/catch | 中间件捕获 |
| 学习曲线 | 较平缓 | 较平缓 |
| 生态系统 | 丰富（需组合） | 丰富（开箱即用） |

### 资源链接

- **官网**：[koajs.com](https://koajs.com/)
- **GitHub**：[github.com/koajs/koa](https://github.com/koajs/koa)
- **中文文档**：[koa.bootcss.com](https://koa.bootcss.com/)
- **精选资源 (Awesome Koa)**：[github.com/ellerbrock/awesome-koa](https://github.com/ellerbrock/awesome-koa)

## 快速上手

### 环境要求

Koa 依赖以下环境：

- **Node.js**：Koa 2 需 v7.6.0+，Koa 3 需 v18+（建议使用 LTS 版本）
- **ES2015**：支持 async/await 语法
- **npm/yarn/pnpm**：包管理工具

### 安装

```bash
# 使用 npm
npm install koa

# 使用 yarn
yarn add koa

# 使用 pnpm
pnpm add koa
```

### Hello World

创建一个基础的 Koa 应用非常简单：

```javascript
const Koa = require("koa")
const app = new Koa()

// 中间件
app.use(async (ctx) => {
  ctx.body = "Hello Koa"
})

app.listen(3000, () => {
  console.log("Server is running at http://localhost:3000")
})
```

访问 `http://localhost:3000`，你将看到 "Hello Koa"。

### 应用结构

一个典型的生产级 Koa 应用结构：

```
project/
├── app.js              # 应用入口
├── config/             # 配置文件
│   ├── index.js
│   └── database.js
├── controllers/        # 控制器
│   └── user.js
├── middlewares/        # 自定义中间件
│   ├── logger.js
│   └── error.js
├── models/             # 数据模型
│   └── user.js
├── routes/             # 路由定义
│   └── user.js
├── services/           # 业务逻辑
│   └── user.js
├── utils/              # 工具函数
│   └── helper.js
└── package.json
```

### 完整示例

一个包含错误处理、日志记录和路由的完整示例：

```javascript
const Koa = require("koa")
const app = new Koa()

// 1. 错误处理中间件
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.status = err.status || 500
    ctx.body = { 
      error: err.message,
      code: err.code || 'INTERNAL_ERROR'
    }
    // 触发应用级错误事件
    ctx.app.emit("error", err, ctx)
  }
})

// 2. 日志中间件
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

// 3. 响应中间件
app.use(async (ctx) => {
  ctx.body = { 
    message: "Hello World",
    timestamp: Date.now()
  }
})

// 错误事件监听
app.on("error", (err, ctx) => {
  console.error("Server Error:", err)
})

app.listen(3000)
```

## 核心概念

### Application 对象

Application 对象是 Koa 的核心，代表一个 Koa 应用程序。

#### 创建应用

```javascript
const Koa = require("koa")
const app = new Koa()
```

#### 主要属性

| 属性 | 类型 | 描述 |
|------|------|------|
| `app.env` | String | 环境变量，默认为 `process.env.NODE_ENV` 或 `development` |
| `app.proxy` | Boolean | 是否信任代理头字段，默认 `false` |
| `app.subdomainOffset` | Number | 子域名偏移量，默认 `2` |
| `app.keys` | Array | 签名 cookie 的密钥数组 |

#### 主要方法

| 方法 | 描述 |
|------|------|
| `app.use(fn)` | 注册中间件 |
| `app.listen(port, callback)` | 启动服务器 |
| `app.callback()` | 返回适合作为 HTTP 服务器回调的函数 |
| `app.on(event, fn)` | 注册事件监听器 |

#### 示例：配置应用属性

```javascript
const Koa = require("koa")
const app = new Koa()

// 配置属性
app.keys = ["secret-key-1", "secret-key-2"]
app.proxy = true  // 启用代理支持
app.subdomainOffset = 2  // 子域名偏移

// 使用 callback() 创建服务器
const http = require("http")
const server = http.createServer(app.callback())
server.listen(3000)
```

### Context 对象

Context 对象（通常命名为 `ctx`）是 Koa 中最重要的概念，它封装了 Node.js 的 `request` 和 `response` 对象，提供了一个统一的 API 接口。

#### 结构示意

```
Context (ctx)
├── request (Koa Request 对象)
├── response (Koa Response 对象)
├── state (跨中间件共享数据)
├── app (Application 实例)
└── 原生 Node.js 对象
    ├── req (Node.js request 对象)
    └── res (Node.js response 对象)
```

#### 常用属性

| 属性 | 描述 |
|------|------|
| `ctx.request` | Koa Request 对象 |
| `ctx.response` | Koa Response 对象 |
| `ctx.state` | 推荐的命名空间，用于跨中间件传递信息 |
| `ctx.app` | Application 实例引用 |
| `ctx.req` | Node.js 原生 request 对象 |
| `ctx.res` | Node.js 原生 response 对象 |

#### 常用别名

为方便使用，Context 提供了多个 Request/Response 的别名属性：

| 别名 | 等价于 |
|------|--------|
| `ctx.header` | `ctx.request.header` |
| `ctx.method` | `ctx.request.method` |
| `ctx.url` | `ctx.request.url` |
| `ctx.path` | `ctx.request.path` |
| `ctx.query` | `ctx.request.query` |
| `ctx.body` | `ctx.response.body` |
| `ctx.status` | `ctx.response.status` |
| `ctx.type` | `ctx.response.type` |

#### 示例：Context 使用

```javascript
app.use(async (ctx) => {
  // 获取请求信息
  console.log("Method:", ctx.method)      // GET, POST, etc.
  console.log("URL:", ctx.url)            // /users?id=123
  console.log("Path:", ctx.path)          // /users
  console.log("Query:", ctx.query)        // { id: '123' }
  console.log("Headers:", ctx.header)     // 所有请求头

  // 获取客户端信息
  console.log("IP:", ctx.ip)              // 客户端 IP
  
  // 设置响应
  ctx.status = 200
  ctx.type = "application/json"
  ctx.body = {
    message: "Success",
    data: { id: 123 }
  }
  
  // 设置响应头
  ctx.set("X-Custom-Header", "value")
})
```

### Request 对象

Koa Request 对象是对 Node.js 原生 request 对象的封装，提供了更友好的 API。

#### 常用属性

| 属性 | 描述 |
|------|------|
| `request.header` | 请求头对象 |
| `request.method` | 请求方法 |
| `request.url` | 请求 URL |
| `request.path` | 请求路径 |
| `request.query` | 解析后的查询字符串对象 |
| `request.querystring` | 原始查询字符串 |
| `request.host` | 主机名 |
| `request.hostname` | 主机名（不含端口） |
| `request.protocol` | 协议（http/https） |
| `request.secure` | 是否为 HTTPS |
| `request.ip` | 客户端 IP 地址 |
| `request.length` | Content-Length |
| `request.type` | Content-Type |

#### 常用方法

```javascript
app.use(async (ctx) => {
  // 获取请求头
  const userAgent = ctx.request.get("User-Agent")
  
  // 检查请求类型
  if (ctx.request.is("json")) {
    // 处理 JSON 请求
  }
  
  // 检查接受类型
  if (ctx.request.accepts("json")) {
    ctx.type = "json"
    ctx.body = { message: "Hello" }
  }
  
  // 获取查询参数
  const page = ctx.query.page || 1
  const limit = ctx.query.limit || 10
})
```

### Response 对象

Koa Response 对象是对 Node.js 原生 response 对象的封装。

#### 常用属性

| 属性 | 描述 |
|------|------|
| `response.status` | HTTP 状态码 |
| `response.message` | 状态消息 |
| `response.body` | 响应体 |
| `response.header` | 响应头对象 |
| `response.length` | Content-Length |
| `response.type` | Content-Type |
| `response.lastModified` | Last-Modified |
| `response.etag` | ETag |

#### 常用方法

```javascript
app.use(async (ctx) => {
  // 设置状态码
  ctx.response.status = 200
  
  // 设置响应体
  ctx.response.body = { message: "Hello" }
  
  // 设置响应头
  ctx.response.set("X-Custom", "value")
  
  // 设置 Content-Type
  ctx.response.type = "json"  // 自动转换为 application/json
  
  // 重定向
  ctx.response.redirect("/login")
  
  // 附加内容
  ctx.response.attachment("filename.txt")
})
```

## 中间件机制

Koa 的核心就是中间件。中间件是一个函数，它可以访问请求对象（`ctx`）、响应对象（`ctx.response`）和应用程序请求-响应循环中的下一个中间件函数。

### 洋葱模型

Koa 中间件采用"洋葱模型"，请求依次穿过各个中间件，响应则反向穿出。

```
请求 ──────────────────────────────────────▶
  │                                           │
  │   ┌─────────────────────────────────┐    │
  │   │        中间件 1                  │    │
  │   │  ┌───────────────────────────┐  │    │
  │   │  │      中间件 2              │  │    │
  │   │  │  ┌─────────────────────┐  │  │    │
  │   │  │  │    中间件 3          │  │  │    │
  │   │  │  │                     │  │  │    │
  │   │  │  │    await next()     │  │  │    │
  │   │  │  │                     │  │  │    │
  │   │  │  └─────────────────────┘  │  │    │
  │   │  │         响应               │  │    │
  │   │  └───────────────────────────┘  │    │
  │   └─────────────────────────────────┘    │  │
◀─────────────────────────────────────────────
                        响应
```

#### 执行顺序示例

```javascript
app.use(async (ctx, next) => {
  console.log(">> 中间件 1 - 请求")
  await next()
  console.log("<< 中间件 1 - 响应")
})

app.use(async (ctx, next) => {
  console.log(">> 中间件 2 - 请求")
  await next()
  console.log("<< 中间件 2 - 响应")
})

app.use(async (ctx) => {
  console.log(">> 中间件 3 - 处理")
  ctx.body = "Hello Koa"
})

// 执行顺序:
// >> 中间件 1 - 请求
// >> 中间件 2 - 请求
// >> 中间件 3 - 处理
// << 中间件 2 - 响应
// << 中间件 1 - 响应
```

### async/await

Koa 完全支持 async/await，让异步代码更清晰：

```javascript
// 使用 async/await
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  ctx.set("X-Response-Time", `${ms}ms`)
})

// 等价的 Promise 写法
app.use((ctx, next) => {
  const start = Date.now()
  return next().then(() => {
    const ms = Date.now() - start
    ctx.set("X-Response-Time", `${ms}ms`)
  })
})
```

### 中间件注册

```javascript
// 注册单个中间件
app.use(async (ctx, next) => {
  await next()
})

// 注册多个中间件
const middleware1 = async (ctx, next) => {
  console.log("Middleware 1")
  await next()
}

const middleware2 = async (ctx, next) => {
  console.log("Middleware 2")
  await next()
}

app.use(middleware1)
app.use(middleware2)
```

### 常用中间件模式

#### 认证中间件

```javascript
const authMiddleware = async (ctx, next) => {
  const token = ctx.header.authorization
  
  if (!token) {
    ctx.throw(401, "No token provided")
  }
  
  try {
    const decoded = verifyToken(token)
    ctx.state.user = decoded
    await next()
  } catch (err) {
    ctx.throw(401, "Invalid token")
  }
}

app.use(authMiddleware)
```

#### 日志中间件

```javascript
const loggerMiddleware = async (ctx, next) => {
  const start = Date.now()
  
  await next()
  
  const ms = Date.now() - start
  const logMessage = `${ctx.method} ${ctx.url} ${ctx.status} - ${ms}ms`
  
  if (ctx.status >= 400) {
    console.error(logMessage)
  } else {
    console.log(logMessage)
  }
}

app.use(loggerMiddleware)
```

#### CORS 中间件

```javascript
const corsMiddleware = async (ctx, next) => {
  ctx.set("Access-Control-Allow-Origin", "*")
  ctx.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  ctx.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  
  if (ctx.method === "OPTIONS") {
    ctx.status = 204
    return
  }
  
  await next()
}

app.use(corsMiddleware)
```

## 路由系统

Koa 本身不包含路由功能，需要使用路由中间件。官方推荐使用 `@koa/router`。

### 安装路由

```bash
# 使用 npm
npm install @koa/router

# 使用 yarn
yarn add @koa/router

# 使用 pnpm
pnpm add @koa/router
```

### 基本使用

```javascript
const Koa = require("koa")
const Router = require("@koa/router")
const app = new Koa()
const router = new Router()

// 定义路由
router.get("/", (ctx) => {
  ctx.body = "Home Page"
})

router.get("/users/:id", (ctx) => {
  ctx.body = `User ID: ${ctx.params.id}`
})

router.post("/users", (ctx) => {
  ctx.body = { message: "User created" }
})

// 注册路由
app.use(router.routes()).use(router.allowedMethods())

app.listen(3000)
```

### 路由方法

`@koa/router` 支持所有 HTTP 方法：

```javascript
// GET 请求
router.get("/users", (ctx) => {})

// POST 请求
router.post("/users", (ctx) => {})

// PUT 请求
router.put("/users/:id", (ctx) => {})

// DELETE 请求
router.delete("/users/:id", (ctx) => {})

// PATCH 请求
router.patch("/users/:id", (ctx) => {})

// 多个方法
router.all("/api/*", (ctx) => {})  // 匹配所有方法
```

### 路由参数

#### 路径参数

```javascript
// 单个参数
router.get("/users/:id", (ctx) => {
  ctx.body = { id: ctx.params.id }
})

// 多个参数
router.get("/users/:userId/posts/:postId", (ctx) => {
  const { userId, postId } = ctx.params
  ctx.body = { userId, postId }
})

// 可选参数
router.get("/books/:category?", (ctx) => {
  const category = ctx.params.category || "all"
  ctx.body = { category }
})

// 正则表达式
router.get("/files/:file(.*)", (ctx) => {
  ctx.body = { file: ctx.params.file }
})
```

> **版本提示**：可选参数 `:param?` 与内嵌正则 `:param(...)` 写法在 @koa/router 12 及以下（path-to-regexp 6）可用；@koa/router 13+（path-to-regexp 8）改为可选组 `{/:param}` 语法，且不再支持参数内嵌正则。

#### 查询参数

```javascript
router.get("/search", (ctx) => {
  const { q, page, limit } = ctx.query
  ctx.body = {
    query: q,
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10
  }
})

// 访问 /search?q=koa&page=2&limit=20
// 响应: { query: "koa", page: 2, limit: 20 }
```

### 路由分组

使用路由分组组织相关路由：

```javascript
const Router = require("@koa/router")

const router = new Router()
const usersRouter = new Router({ prefix: "/users" })

// 用户相关路由
usersRouter.get("/", (ctx) => {
  ctx.body = "用户列表"
})

usersRouter.get("/:id", (ctx) => {
  ctx.body = `用户详情: ${ctx.params.id}`
})

usersRouter.post("/", (ctx) => {
  ctx.body = "创建用户"
})

// 注册分组路由
app.use(usersRouter.routes())
```

### 路由中间件

可以为单个路由添加中间件：

```javascript
// 路由级中间件
const authMiddleware = async (ctx, next) => {
  if (!ctx.header.authorization) {
    ctx.throw(401, "Unauthorized")
  }
  await next()
}

// 应用到特定路由
router.get("/profile", authMiddleware, (ctx) => {
  ctx.body = { user: ctx.state.user }
})

// 应用到多个路由
router.put("/users/:id", authMiddleware, (ctx) => {
  ctx.body = { message: "Updated" }
})
```

### 路由重定向

```javascript
router.get("/old-path", (ctx) => {
  ctx.redirect("/new-path")
})

router.get("/old-path", (ctx) => {
  ctx.redirect("back")  // 重定向到来源页
})
```

## 常用功能

### 静态文件服务

使用 `koa-static` 中间件提供静态文件服务：

```bash
npm install koa-static
```

#### 基本配置

```javascript
const Koa = require("koa")
const serve = require("koa-static")
const app = new Koa()

// 托管 public 目录
app.use(serve("./public"))

app.listen(3000)
```

#### 高级配置

```javascript
const serve = require("koa-static")
const path = require("path")

app.use(serve(path.join(__dirname, "public"), {
  maxage: 86400000,      // 缓存时间（毫秒）
  gzip: true,            // 启用 gzip
  brotli: true,          // 启用 brotli
  index: "index.html",   // 默认文件
  defer: true            // 允许下游中间件先响应
}))
```

#### 多目录托管

```javascript
// 托管多个静态目录（按顺序查找）
app.use(serve("./public"))
app.use(serve("./static"))
app.use(serve("./uploads"))
```

### 请求体解析

使用 `koa-bodyparser` 解析请求体：

```bash
npm install koa-bodyparser
```

#### 基本使用

```javascript
const Koa = require("koa")
const bodyParser = require("koa-bodyparser")
const app = new Koa()

app.use(bodyParser())

app.post("/login", async (ctx) => {
  const { username, password } = ctx.request.body
  ctx.body = { username, password }
})

app.listen(3000)
```

#### 配置选项

```javascript
app.use(bodyParser({
  enableTypes: ["json", "form"],  // 解析的类型
  encoding: "utf-8",               // 编码
  formLimit: "56kb",               // 表单大小限制
  jsonLimit: "1mb",                // JSON 大小限制
  strict: true,                    // 严格模式
  detectJSON: (ctx) => {           // 自定义 JSON 检测
    return ctx.path.endsWith(".json")
  }
}))
```

### 文件上传

使用 `@koa/multer` 处理文件上传：

```bash
npm install @koa/multer multer
```

#### 单文件上传

```javascript
const Koa = require("koa")
const Router = require("@koa/router")
const multer = require("@koa/multer")
const app = new Koa()
const router = new Router()

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/")
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + "-" + file.originalname)
  }
})

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }  // 5MB
})

// 单文件上传
router.post("/upload", upload.single("file"), (ctx) => {
  ctx.body = {
    message: "File uploaded",
    file: ctx.file
  }
})

app.use(router.routes())
```

#### 多文件上传

```javascript
// 多个同名文件
router.post("/photos", upload.array("photos", 12), (ctx) => {
  ctx.body = {
    message: "Files uploaded",
    files: ctx.files
  }
})

// 多个不同字段
router.post("/gallery", upload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "photos", maxCount: 8 }
]), (ctx) => {
  ctx.body = {
    message: "Files uploaded",
    files: ctx.files
  }
})
```

### Session 管理

使用 `koa-session` 管理会话：

```bash
npm install koa-session
```

```javascript
const Koa = require("koa")
const session = require("koa-session")
const app = new Koa()

// 配置 session
app.keys = ["secret-key"]

const CONFIG = {
  key: "koa.sess",           // cookie 键名
  maxAge: 86400000,          // 过期时间（毫秒）
  autoCommit: true,          // 自动提交
  overwrite: true,           // 覆盖
  httpOnly: true,            // 仅 HTTP
  signed: true,              // 签名
  rolling: false,            // 滚动更新
  renew: false,              // 自动续期
  secure: false,             // 仅 HTTPS
  sameSite: null             // SameSite 策略
}

app.use(session(CONFIG, app))

app.use(async (ctx) => {
  // 设置 session
  ctx.session.views = (ctx.session.views || 0) + 1
  
  ctx.body = `Views: ${ctx.session.views}`
})

app.listen(3000)
```

### Cookie 操作

```javascript
app.use(async (ctx) => {
  // 设置 cookie
  ctx.cookies.set("name", "value", {
    domain: "localhost",     // 域名
    path: "/",               // 路径
    maxAge: 24 * 60 * 60 * 1000,  // 过期时间（毫秒）
    expires: new Date(),     // 过期日期
    httpOnly: true,          // 仅 HTTP
    secure: false,           // 仅 HTTPS
    sameSite: "strict",      // SameSite 策略
    signed: true             // 签名
  })
  
  // 读取 cookie
  const name = ctx.cookies.get("name")
  
  ctx.body = { name }
})
```

### 模板渲染

使用 `koa-views` 渲染模板：

```bash
npm install koa-views ejs
```

```javascript
const Koa = require("koa")
const views = require("koa-views")
const path = require("path")
const app = new Koa()

// 配置模板引擎
app.use(views(path.join(__dirname, "views"), {
  extension: "ejs",
  map: { html: "ejs" }
}))

app.use(async (ctx) => {
  await ctx.render("index", {
    title: "Koa App",
    message: "Hello World"
  })
})

app.listen(3000)
```

## API 参考

### Application API

#### app.listen(port, [callback])

启动 HTTP 服务器：

```javascript
app.listen(3000, () => {
  console.log("Server running on port 3000")
})
```

#### app.use(function)

注册中间件：

```javascript
app.use(async (ctx, next) => {
  await next()
})
```

#### app.callback

返回适用于 `http.createServer()` 的回调函数：

```javascript
const http = require("http")
const server = http.createServer(app.callback())
server.listen(3000)
```

#### app.on(event, listener)

注册事件监听器：

```javascript
// 错误事件
app.on("error", (err, ctx) => {
  console.error("Server error:", err)
})
```

### Context API

#### ctx.throw([status], [msg], [properties])

抛出 HTTP 错误：

```javascript
ctx.throw(400, "Invalid parameter")
ctx.throw(401, "Unauthorized")
ctx.throw(404, "Not found")
ctx.throw(500, "Internal error")
```

#### ctx.assert(value, status, [msg], [properties])

断言，失败时抛出错误：

```javascript
ctx.assert(ctx.state.user, 401, "User not found")
// 等价于
if (!ctx.state.user) ctx.throw(401, "User not found")
```

### Request API

#### request.header

获取/设置请求头：

```javascript
const userAgent = ctx.request.header["user-agent"]
```

#### request.query

解析查询字符串：

```javascript
// GET /search?q=koa&page=1
const { q, page } = ctx.request.query
// q = "koa", page = "1"
```

#### request.body

请求体（需要 `koa-bodyparser`）：

```javascript
const { username, password } = ctx.request.body
```

### Response API

#### response.body

设置响应体：

```javascript
// 字符串
ctx.body = "Hello World"

// 对象（自动转为 JSON）
ctx.body = { message: "Success" }

// Buffer
ctx.body = Buffer.from("Hello")

// Stream
const fs = require("fs")
ctx.body = fs.createReadStream("./file.txt")
```

#### response.status

设置状态码：

```javascript
ctx.status = 200  // OK
ctx.status = 201  // Created
ctx.status = 400  // Bad Request
ctx.status = 404  // Not Found
ctx.status = 500  // Internal Server Error
```

#### response.set(field, value)

设置响应头：

```javascript
ctx.set("Cache-Control", "no-cache")
ctx.set("X-Custom-Header", "value")

// 批量设置
ctx.set({
  "Cache-Control": "no-cache",
  "X-Custom-Header": "value"
})
```

#### response.redirect(url)

重定向：

```javascript
ctx.redirect("/login")
ctx.redirect("back")  // 返回上一页
ctx.redirect("https://example.com")
```

## 常见问题

### Q1: Koa 和 Express 有什么区别？

**主要区别**：

| 方面 | Koa | Express |
|------|-----|---------|
| 设计理念 | 极简主义，按需组合 | 全功能，开箱即用 |
| 中间件模型 | 洋葱模型 | 线性模型 |
| 异步支持 | async/await | 回调/Promise |
| Context | 统一的 ctx 对象 | 分离的 req/res |

**选择建议**：
- 选择 **Koa**：追求轻量、现代化、可控性高的项目
- 选择 **Express**：快速原型开发、需要丰富内置功能的场景

### Q2: 为什么访问路由返回 404？

**常见原因**：

1. **未注册路由中间件**
   ```javascript
   // 错误
   router.get("/", (ctx) => {})
   
   // 正确
   router.get("/", (ctx) => {})
   app.use(router.routes())
   ```

2. **中间件顺序错误**
   ```javascript
   // 错误：错误处理在最后
   app.use(router.routes())
   app.use(errorHandler)
   
   // 正确：错误处理在前
   app.use(errorHandler)
   app.use(router.routes())
   ```

3. **未调用 next()**
   ```javascript
   // 可能导致后续中间件不执行
   app.use(async (ctx, next) => {
     // 忘记调用 await next()
   })
   ```

### Q3: 如何处理全局错误？

**推荐方案**：

```javascript
// 方案 1：try/catch
app.use(async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    ctx.status = err.status || 500
    ctx.body = { error: err.message }
    ctx.app.emit("error", err, ctx)
  }
})

// 方案 2：错误事件
app.on("error", (err, ctx) => {
  console.error("Global error:", err)
  
  // 发送错误通知
  // sendErrorNotification(err)
})

// 方案 3：404 处理
app.use(async (ctx, next) => {
  await next()
  
  if (ctx.status === 404 && !ctx.body) {
    ctx.status = 404
    ctx.body = { error: "Not Found" }
  }
})
```

### Q4: 如何解析 POST 请求体？

**解决方案**：

```javascript
const bodyParser = require("koa-bodyparser")
app.use(bodyParser())

// JSON 请求
app.post("/api/data", (ctx) => {
  const data = ctx.request.body
  ctx.body = { received: data }
})
```

### Q5: 如何实现跨域（CORS）？

**方案 1：手动设置**

```javascript
app.use(async (ctx, next) => {
  ctx.set("Access-Control-Allow-Origin", "*")
  ctx.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE")
  ctx.set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  
  if (ctx.method === "OPTIONS") {
    ctx.status = 204
    return
  }
  
  await next()
})
```

**方案 2：使用 @koa/cors**

```bash
npm install @koa/cors
```

```javascript
const cors = require("@koa/cors")
app.use(cors({
  origin: "*",  // 或指定域名
  allowMethods: ["GET", "POST", "PUT", "DELETE"],
  allowHeaders: ["Content-Type", "Authorization"]
}))
```

### Q6: 如何获取客户端真实 IP？

**解决方案**：

```javascript
// 启用代理支持
app.proxy = true

app.use(async (ctx) => {
  const ip = ctx.ip  // 客户端 IP
  
  // 如果有多层代理，可能需要查看 X-Forwarded-For
  const forwardedFor = ctx.header["x-forwarded-for"]
  
  console.log("Client IP:", ip)
  console.log("X-Forwarded-For:", forwardedFor)
})
```

## 最佳实践

### 项目结构

```
project/
├── src/
│   ├── app.js              # 应用入口
│   ├── config/             # 配置
│   │   ├── index.js
│   │   └── database.js
│   ├── controllers/        # 控制器
│   │   ├── user.js
│   │   └── auth.js
│   ├── middlewares/        # 中间件
│   │   ├── error.js
│   │   ├── logger.js
│   │   └── auth.js
│   ├── models/             # 数据模型
│   │   └── user.js
│   ├── routes/             # 路由
│   │   ├── index.js
│   │   ├── user.js
│   │   └── auth.js
│   ├── services/           # 业务逻辑
│   │   └── user.js
│   └── utils/              # 工具函数
│       └── helper.js
├── public/                 # 静态文件
├── tests/                  # 测试文件
├── .env                    # 环境变量
├── package.json
└── README.md
```

### 错误处理

```javascript
// middlewares/error.js
class AppError extends Error {
  constructor(message, code, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

const errorHandler = async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    // 已知错误
    if (err instanceof AppError) {
      ctx.status = err.status
      ctx.body = {
        code: err.code,
        message: err.message
      }
      return
    }
    
    // 未知错误
    ctx.status = 500
    ctx.body = {
      code: "INTERNAL_ERROR",
      message: "Internal Server Error"
    }
    
    // 记录错误日志
    console.error("Error:", err)
    ctx.app.emit("error", err, ctx)
  }
}

module.exports = { errorHandler, AppError }
```

### 环境配置

```javascript
// config/index.js
const dotenv = require("dotenv")
dotenv.config()

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || "development",
  database: {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || "app",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || ""
  },
  jwt: {
    secret: process.env.JWT_SECRET || "secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  }
}
```

### 路由组织

```javascript
// routes/index.js
const Router = require("@koa/router")
const userRoutes = require("./user")
const authRoutes = require("./auth")

const router = new Router()

// 健康检查
router.get("/health", (ctx) => {
  ctx.body = { status: "ok", timestamp: Date.now() }
})

// 注册子路由
router.use("/users", userRoutes.routes())
router.use("/auth", authRoutes.routes())

module.exports = router
```

### 日志记录

```javascript
// middlewares/logger.js
const logger = async (ctx, next) => {
  const start = Date.now()
  
  await next()
  
  const duration = Date.now() - start
  const log = {
    timestamp: new Date().toISOString(),
    method: ctx.method,
    url: ctx.url,
    status: ctx.status,
    duration: `${duration}ms`,
    ip: ctx.ip,
    userAgent: ctx.header["user-agent"]
  }
  
  // 根据状态码选择日志级别
  if (ctx.status >= 500) {
    console.error(JSON.stringify(log))
  } else if (ctx.status >= 400) {
    console.warn(JSON.stringify(log))
  } else {
    console.log(JSON.stringify(log))
  }
}

module.exports = logger
```

### 响应格式化

```javascript
// middlewares/response.js
const responseFormatter = async (ctx, next) => {
  await next()
  
  // 格式化成功响应
  if (ctx.status >= 200 && ctx.status < 300 && ctx.body !== undefined) {
    ctx.body = {
      success: true,
      data: ctx.body,
      timestamp: Date.now()
    }
  }
}

module.exports = responseFormatter
```

### 安全建议

```javascript
// 安全配置
const helmet = require("koa-helmet")
const rateLimit = require("koa-ratelimit")

// 1. 使用 helmet 设置安全头
app.use(helmet())

// 2. 限流
app.use(rateLimit({
  db: new Map(),  // 生产环境使用 Redis
  duration: 60000,  // 60 秒
  max: 100,  // 最大请求数
  id: (ctx) => ctx.ip
}))

// 3. 禁用 x-powered-by
app.use(async (ctx, next) => {
  ctx.remove("X-Powered-By")
  await next()
})
```

## 总结

### 核心要点回顾

1. **轻量级设计**：Koa 核心极简，不内置任何中间件，通过组合实现功能
2. **洋葱模型**：中间件采用独特的洋葱模型，请求和响应双向处理
3. **async/await**：全面支持 async/await，异步代码如同步般自然
4. **Context 对象**：统一的 ctx 对象，简化请求和响应操作
5. **模块化生态**：丰富的第三方中间件，按需组合使用

### 快速参考

```javascript
// 创建应用
const Koa = require("koa")
const app = new Koa()

// 中间件
app.use(async (ctx, next) => {
  await next()
})

// 路由
const Router = require("@koa/router")
const router = new Router()
router.get("/", (ctx) => { ctx.body = "Hello" })
app.use(router.routes())

// 启动
app.listen(3000)
```

### 学习路径

```
Koa 基础
    │
    ├── 上下文对象 ────── 深入理解 Context
    │
    ├── 中间件机制 ────── 掌握洋葱模型
    │
    ├── 源码解析 ──────── 理解内部实现
    │
    └── 实战项目 ──────── 巩固所学知识
```

## 下一步学习

掌握 Koa 基础后，建议继续学习：

- **[上下文对象](02-上下文对象.md)**：深入了解 Koa 的 Context 对象，掌握请求和响应的各种操作
- **[中间件机制](03-中间件机制.md)**：学习 Koa 中间件的实现原理和常用第三方中间件
- **[Koa源码解析](04-Koa源码解析.md)**：理解 Koa 的内部实现原理，提升架构能力
- **[Koa实战](05-Koa实战.md)**：通过实战项目巩固所学知识，构建生产级应用

## 推荐资源

### 官方资源

- [Koa 官方文档](https://koajs.com/)
- [Koa GitHub 仓库](https://github.com/koajs/koa)
- [Koa 中文文档](https://koa.bootcss.com/)

### 中间件列表

- **路由**：[@koa/router](https://github.com/koajs/router)
- **Body 解析**：[koa-bodyparser](https://github.com/koajs/bodyparser)
- **静态文件**：[koa-static](https://github.com/koajs/static)
- **Session**：[koa-session](https://github.com/koajs/session)
- **CORS**：[@koa/cors](https://github.com/koajs/cors)
- **安全**：[koa-helmet](https://github.com/venables/koa-helmet)
- **压缩**：[koa-compress](https://github.com/koajs/compress)
- **日志**：[koa-logger](https://github.com/koajs/logger)

### 学习教程

- [Koa 官方示例](https://github.com/koajs/koa/tree/master/docs)
- [Awesome Koa](https://github.com/ellerbrock/awesome-koa)
- [Koa Wiki](https://github.com/koajs/koa/wiki)

---

> 最后更新：2026年2月
