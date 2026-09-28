---
title: Express 基础
description: Express.js 是基于 Node.js 平台，快速、开放、极简的 Web 开发框架。它封装了创建 Web 服务器和处理 HTTP 请求的底层细节，提供了一系列强大的特性来帮助开发者高效地构建 Web 应用和 API。本文涵盖核心对象与 API、路由与中间件基础、模板引擎与静态文件、错误处理与应用配置。
keywords: [Node.js, Web框架, Express]
category: Node.js
tags: [Node.js, Web框架]
---







# Express 基础

Express.js 是基于 Node.js 平台，快速、开放、极简的 Web 开发框架。它封装了创建 Web 服务器和处理 HTTP 请求的底层细节，提供了一系列强大的特性来帮助开发者高效地构建 Web 应用和 API。

## 核心特性

| 特性 | 说明 |
|------|------|
| **强大的路由系统** | 提供简洁直观的方式定义 URL 路由，轻松处理不同路径和 HTTP 方法的请求 |
| **灵活的中间件架构** | 请求和响应经过一系列可插拔的中间件，适合日志记录、认证、数据解析等任务 |
| **高性能** | 保持轻量和高效，为应用提供坚实的性能基础 |
| **成熟的生态系统** | 拥有海量的第三方中间件和扩展库，几乎满足任何开发需求 |
| **极简主义** | 只提供 Web 开发的核心功能，不强制任何特定的开发模式或库 |

## 适用场景

- **Web 网站**：构建从简单的静态网站到复杂的动态网站
- **RESTful API**：为单页应用（SPA）、移动应用或第三方服务提供健壮的 API
- **服务端渲染（SSR）**：作为渲染中间层，与模板引擎结合生成 HTML 页面
- **微服务**：构建轻量级的微服务架构
- **开发工具**：许多开发工具如 `webpack-dev-server`、`json-server` 都基于 Express

## 与其他框架对比

| 框架 | 特点 | 适用场景 |
|------|------|----------|
| **Express** | 轻量灵活、生态丰富、学习曲线低 | 中小型项目、API 服务、快速原型开发 |
| **Koa** | 更现代、async/await 原生支持、中间件模型更优雅 | 新项目、需要更好异步处理的场景 |
| **NestJS** | 企业级、TypeScript 原生支持、依赖注入、模块化 | 大型企业应用、团队协作项目 |
| **Fastify** | 高性能、JSON Schema 验证、插件系统 | 高并发 API 服务、性能敏感场景 |

---

## 系统架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         Express 应用                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ 路由层  │  │  中间件层   │  │      业务处理层         │  │
│  ├─────────┤  ├─────────────┤  ├─────────────────────────┤  │
│  │ Router  │→ │ Middleware  │→ │ Route Handlers          │  │
│  │ 路由匹配 │  │ 请求预处理  │  │ 业务逻辑 & 响应生成      │  │
│  └─────────┘  └─────────────┘  └─────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                      Node.js HTTP 模块                       │
└─────────────────────────────────────────────────────────────┘
```

### 请求处理流程

```
客户端请求
    │
    ▼
┌──────────────────┐
│  Node.js HTTP    │  接收 HTTP 请求
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Express App     │  创建 req/res 对象
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  中间件链        │  依次执行：日志 → 解析 → 认证 → ...
│  (Middleware)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  路由匹配        │  匹配对应的路由处理函数
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  业务逻辑        │  执行具体业务，生成响应
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  发送响应        │  返回 HTTP 响应给客户端
└──────────────────┘
```

### 核心概念

| 概念 | 说明 |
|------|------|
| **Application (app)** | Express 应用实例，管理整个应用的配置、路由和中间件 |
| **Request (req)** | 封装 HTTP 请求信息，包含参数、请求体、头部等 |
| **Response (res)** | 封装 HTTP 响应操作，提供发送响应的各种方法 |
| **Router** | 模块化路由管理器，可挂载到 app 的特定路径前缀 |
| **Middleware** | 处理请求-响应循环的函数，可访问 req、res 和 next |

---

## 快速上手

### 环境准备

确保已安装 Node.js（推荐 v18.0.0 或更高版本；Node 14 已于 2023-04 停止维护）：

```bash
# 检查 Node.js 版本
node -v

# 检查 npm 版本
npm -v
```

### 安装与初始化

```bash
# 创建项目目录
mkdir my-express-app
cd my-express-app

# 初始化项目（生成 package.json）
npm init -y

# 安装 Express
npm install express@4
```

> **版本说明**：`@4` 表示安装 Express 4.x 版本，它是使用最广泛的经典版本（本文以 Express 4 语义讲解）。Express 5 已于 2024-09 正式发布，新特性与升级方法见 [Express5 新特性与升级](09-Express5新特性与升级.md)。

### 第一个 Express 应用

创建 `app.js` 文件：

```javascript
// 1. 引入 express 模块
const express = require("express")

// 2. 创建 express 应用实例
const app = express()

// 3. 定义路由
app.get("/", (req, res) => {
  res.send("Hello, Express!")
})

// 4. 启动服务器
const PORT = 3000
app.listen(PORT, () => {
  console.log(`服务器已启动: http://localhost:${PORT}`)
})
```

**运行应用**：

```bash
node app.js
```

访问 `http://localhost:3000`，页面显示 "Hello, Express!"。

### 代码解析

| 步骤 | 代码 | 说明 |
|------|------|------|
| 1 | `require('express')` | 加载 Express 模块 |
| 2 | `express()` | 创建 Express 应用实例 |
| 3 | `app.get('/', ...)` | 定义 GET 请求的路由处理函数 |
| 4 | `app.listen(3000, ...)` | 启动 HTTP 服务器，监听 3000 端口 |

### 推荐项目结构

```
my-express-app/
├── app.js              # 应用入口
├── package.json        # 项目配置
├── config/             # 配置文件
│   └── index.js
├── routes/             # 路由模块
│   ├── index.js        # 路由入口
│   ├── users.js        # 用户路由
│   └── products.js     # 产品路由
├── controllers/        # 控制器（业务逻辑）
│   └── userController.js
├── middleware/         # 自定义中间件
│   ├── auth.js         # 认证中间件
│   └── errorHandler.js # 错误处理
├── models/             # 数据模型
│   └── User.js
├── public/             # 静态资源
│   ├── css/
│   ├── js/
│   └── images/
└── views/              # 模板文件（如使用模板引擎）
    └── index.html
```

---

## 核心对象与 API

### Application 对象

`app` 对象是 Express 应用的核心，常用的方法包括：

| 方法 | 说明 |
|------|------|
| `app.get(name)` | 获取应用配置项 |
| `app.set(name, value)` | 设置应用配置项 |
| `app.use([path,] middleware)` | 挂载中间件 |
| `app.METHOD(path, handler)` | 定义路由（METHOD 为 get/post/put/delete 等） |
| `app.route(path)` | 创建链式路由 |
| `app.listen(port, callback)` | 启动服务器 |
| `app.engine(ext, callback)` | 注册模板引擎 |
| `app.locals` | 应用级本地变量 |

**常用配置**：

```javascript
// 设置运行环境
app.set("env", "development") // development | production | test

// 设置模板引擎
app.set("view engine", "ejs")

// 设置模板目录
app.set("views", "./views")

// 设置严格路由匹配
app.set("strict routing", true)

// 获取配置
console.log(app.get("env"))
```

### Request 对象

`req` 对象封装了 HTTP 请求信息：

| 属性/方法 | 类型 | 说明 |
|-----------|------|------|
| `req.params` | Object | 路由参数，如 `/users/:id` 中的 `id` |
| `req.query` | Object | 查询字符串参数，如 `?name=tom&age=18` |
| `req.body` | Object | 请求体数据（需要解析中间件） |
| `req.headers` | Object | 所有 HTTP 请求头 |
| `req.header(name)` | Function | 获取指定请求头 |
| `req.method` | String | HTTP 方法（GET/POST/PUT/DELETE 等） |
| `req.path` | String | URL 路径 |
| `req.url` | String | 完整 URL |
| `req.protocol` | String | 协议（http/https） |
| `req.ip` | String | 客户端 IP 地址 |
| `req.cookies` | Object | Cookie（需要 cookie-parser 中间件） |
| `req.session` | Object | 会话数据（需要 express-session 中间件） |

### Response 对象

`res` 对象用于发送 HTTP 响应：

| 方法 | 说明 |
|------|------|
| `res.send(body)` | 发送响应（自动设置 Content-Type） |
| `res.json(obj)` | 发送 JSON 响应 |
| `res.status(code)` | 设置状态码，返回 res 支持链式调用 |
| `res.sendStatus(code)` | 发送状态码及对应文本 |
| `res.redirect([status,] path)` | 重定向到指定 URL |
| `res.render(view, [locals])` | 渲染模板并发送 HTML |
| `res.sendFile(path)` | 发送文件 |
| `res.cookie(name, value, [options])` | 设置 Cookie |
| `res.clearCookie(name)` | 清除 Cookie |
| `res.set(field, value)` | 设置响应头 |
| `res.type(type)` | 设置 Content-Type |
| `res.end()` | 结束响应 |

### 综合示例

```javascript
const express = require("express")
const app = express()

// 解析 JSON 请求体
app.use(express.json())

// 解析 URL 编码的请求体
app.use(express.urlencoded({ extended: true }))

// 获取路由参数和查询字符串
app.get("/users/:id", (req, res) => {
  const { id } = req.params           // 路由参数
  const { fields } = req.query        // 查询字符串
  const userAgent = req.header("user-agent")

  res.json({
    userId: id,
    fields,
    userAgent,
    timestamp: new Date().toISOString()
  })
})

// 处理 POST 请求
app.post("/users", (req, res) => {
  const { name, email } = req.body    // 请求体

  if (!name || !email) {
    return res.status(400).json({
      error: "name 和 email 为必填字段"
    })
  }

  res.status(201).json({
    message: "用户创建成功",
    user: { name, email }
  })
})

// 重定向
app.get("/old-page", (req, res) => {
  res.redirect(301, "/new-page")      // 永久重定向
})

app.get("/new-page", (req, res) => {
  res.send("这是新页面")
})

// 下载文件
app.get("/download", (req, res) => {
  res.download("./files/report.pdf")
})

app.listen(3000)
```

**测试命令**：

```bash
# GET 请求
curl http://localhost:3000/users/123?fields=name,email

# POST 请求
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'

# 重定向测试
curl -I http://localhost:3000/old-page
```

---

## 路由基础

路由决定应用程序如何响应客户端对特定端点的请求。一个路由由 **URI 路径**、**HTTP 方法** 和 **处理函数** 组成。

### 基本路由定义

```javascript
// 基本语法
app.METHOD(PATH, HANDLER)

// 示例
app.get("/", (req, res) => res.send("GET 请求"))
app.post("/users", (req, res) => res.send("POST 请求"))
app.put("/users/:id", (req, res) => res.send("PUT 请求"))
app.delete("/users/:id", (req, res) => res.send("DELETE 请求"))

// 匹配所有 HTTP 方法
app.all("/secret", (req, res) => {
  res.send(`收到 ${req.method} 请求`)
})
```

### 路由参数

```javascript
// 必需参数
app.get("/users/:id", (req, res) => {
  res.json({ userId: req.params.id })
})

// 多个参数
app.get("/users/:userId/books/:bookId", (req, res) => {
  res.json(req.params)  // { userId: "123", bookId: "456" }
})

// 参数正则约束
app.get("/users/:id(\\d+)", (req, res) => {
  res.send(`数字 ID: ${req.params.id}`)  // 只匹配数字
})

// 可选参数
app.get("/books/:year?/:month?", (req, res) => {
  res.json(req.params)  // year 和 month 都是可选的
})
```

> **更多路由内容**：路由路径模式、正则表达式、链式路由、模块化路由等高级用法，请参阅 [路由系统](02-路由系统.md) 章节。

---

## 中间件基础

中间件是 Express 的核心机制。它是处理请求-响应循环的函数，可以访问 `req`、`res` 和 `next`。

### 中间件执行流程

```
请求 → 中间件1 → 中间件2 → 中间件3 → 路由处理 → 响应
         │          │          │
         ▼          ▼          ▼
       next()     next()     next()
```

### 中间件分类

| 类型 | 说明 | 挂载方式 |
|------|------|----------|
| 应用级中间件 | 绑定到 app，对所有请求生效 | `app.use()` |
| 路由级中间件 | 绑定到 Router，只对特定路由生效 | `router.use()` |
| 错误处理中间件 | 专门处理错误 | 四个参数 `(err, req, res, next)` |
| 内置中间件 | Express 自带 | `express.json()` 等 |
| 第三方中间件 | 社区开发 | 如 `morgan`、`cors` |

### 内置中间件

```javascript
const express = require("express")
const app = express()

// 解析 JSON 请求体
app.use(express.json())

// 解析 URL 编码请求体
app.use(express.urlencoded({ extended: true }))

// 托管静态文件
app.use(express.static("public"))
// 访问 http://localhost:3000/images/logo.png
```

### 自定义中间件示例

```javascript
// 日志中间件
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
  next()
})

// 认证中间件（针对特定路径）
app.use("/admin", (req, res, next) => {
  const token = req.header("Authorization")
  if (!token) {
    return res.status(401).json({ error: "未授权" })
  }
  next()
})
```

> **更多中间件内容**：路由级中间件、第三方中间件、中间件开发等，请参阅 [中间件](03-中间件.md) 章节。

---

## 模板引擎与静态文件

### 模板引擎支持

Express 支持多种模板引擎，如 EJS、Pug、Handlebars 等。

**使用 EJS 模板引擎**：

```bash
npm install ejs
```

```javascript
const express = require("express")
const app = express()

// 设置模板引擎
app.set("view engine", "ejs")
app.set("views", "./views")

// 渲染模板
app.get("/", (req, res) => {
  res.render("index", {
    title: "Express App",
    users: [
      { name: "Alice", age: 25 },
      { name: "Bob", age: 30 }
    ]
  })
})
```

**views/index.ejs**：

```html
<!DOCTYPE html>
<html>
<head>
  <title><%= title %></title>
</head>
<body>
  <h1><%= title %></h1>
  <ul>
    <% users.forEach(user => { %>
      <li><%= user.name %> - <%= user.age %>岁</li>
    <% }) %>
  </ul>
</body>
</html>
```

### 静态文件服务

使用 `express.static` 托管静态资源：

```javascript
// 托管 public 目录
app.use(express.static("public"))

// 指定虚拟路径前缀
app.use("/static", express.static("public"))

// 使用绝对路径
const path = require("path")
app.use("/static", express.static(path.join(__dirname, "public")))
```

**访问方式**：

| 挂载方式 | 文件位置 | 访问 URL |
|----------|----------|----------|
| `express.static("public")` | `public/images/logo.png` | `/images/logo.png` |
| `app.use("/static", ...)` | `public/images/logo.png` | `/static/images/logo.png` |

**静态文件缓存配置**：

```javascript
app.use(express.static("public", {
  maxAge: "1d",           // 缓存时间
  etag: true,             // 启用 ETag
  lastModified: true,     // 启用 Last-Modified
  setHeaders: (res, path) => {
    if (path.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-cache")
    }
  }
}))
```

---

## 错误处理基础

Express 提供了统一的错误处理机制。

### 同步错误与异步错误

```javascript
// 同步错误 - Express 自动捕获
app.get("/sync-error", (req, res) => {
  throw new Error("同步错误")
})

// 异步错误 - 需要 next(err) 传递
app.get("/async-error", async (req, res, next) => {
  try {
    const data = await someAsyncOperation()
    res.json(data)
  } catch (error) {
    next(error)
  }
})
```

### 错误处理中间件

```javascript
// 404 处理（在所有路由之后）
app.use((req, res, next) => {
  res.status(404).json({ error: "资源未找到" })
})

// 全局错误处理（必须在最后）
app.use((err, req, res, next) => {
  console.error(err.stack)
  
  res.status(err.status || 500).json({
    error: {
      message: err.message || "服务器内部错误",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    }
  })
})
```

> **更多错误处理内容**：自定义错误类、统一错误处理方案、错误日志记录等，请参阅 [错误处理](04-错误处理.md) 章节。

---

## 应用配置

### 环境变量管理

使用 `dotenv` 管理环境变量：

```bash
npm install dotenv
```

**创建 `.env` 文件**：

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=27017
DB_NAME=myapp
JWT_SECRET=your-secret-key
```

**在应用中使用**：

```javascript
require("dotenv").config()

const express = require("express")
const app = express()

const PORT = process.env.PORT || 3000
const NODE_ENV = process.env.NODE_ENV || "development"

app.listen(PORT, () => {
  console.log(`服务器运行在 ${NODE_ENV} 模式，端口 ${PORT}`)
})
```

### 配置文件组织

**config/index.js**：

```javascript
const config = {
  development: {
    port: 3000,
    db: {
      host: "localhost",
      port: 27017,
      name: "myapp_dev"
    },
    jwt: {
      secret: "dev-secret",
      expiresIn: "7d"
    }
  },
  production: {
    port: process.env.PORT,
    db: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      name: process.env.DB_NAME
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: "1d"
    }
  }
}

const env = process.env.NODE_ENV || "development"
module.exports = config[env]
```

**使用配置**：

```javascript
const config = require("./config")

app.listen(config.port, () => {
  console.log(`服务器运行在端口 ${config.port}`)
})
```

### 安全配置清单

```javascript
const express = require("express")
const helmet = require("helmet")
const cors = require("cors")
const rateLimit = require("express-rate-limit")

const app = express()

// 1. 安全 HTTP 头
app.use(helmet())

// 2. CORS 配置
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(","),
  credentials: true
}))

// 3. 请求限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 分钟
  max: 100,                   // 最多 100 个请求
  message: { error: "请求过于频繁，请稍后再试" }
})
app.use("/api", limiter)

// 4. 禁用敏感头
app.disable("x-powered-by")

// 5. 请求体大小限制
app.use(express.json({ limit: "10kb" }))

// 6. 参数污染防护
const hpp = require("hpp")
app.use(hpp())
```

---

## express-generator 脚手架

`express-generator` 是官方提供的项目生成器，可快速创建标准项目结构。

### 安装与使用

```bash
# 使用 npx 运行（推荐）
npx express-generator myapp

# 或全局安装
npm install -g express-generator
express myapp
```

### 命令选项

| 选项 | 说明 |
|------|------|
| `-e, --ejs` | 使用 EJS 模板引擎 |
| `--pug` | 使用 Pug 模板引擎 |
| `--hbs` | 使用 Handlebars 模板引擎 |
| `-v, --view <engine>` | 指定模板引擎（ejs/pug/hbs/jade 等） |
| `--no-view` | 不使用模板引擎 |
| `-c, --css <engine>` | CSS 预处理器（less/sass/stylus/compass） |
| `--git` | 添加 .gitignore 文件 |
| `-f, --force` | 强制在非空目录创建 |

### 生成的项目结构

```bash
express --view=ejs myapp
cd myapp
npm install
```

```
myapp/
├── app.js              # 应用入口
├── package.json
├── bin/
│   └── www             # 启动脚本
├── public/             # 静态资源
│   ├── images/
│   ├── javascripts/
│   └── stylesheets/
├── routes/             # 路由
│   ├── index.js
│   └── users.js
└── views/              # 模板
    ├── index.ejs
    └── error.ejs
```

**启动项目**：

```bash
# 开发环境
npm start

# 或使用 nodemon 热重载
npm install -D nodemon
# 在 package.json 添加 script: "dev": "nodemon ./bin/www"
npm run dev
```

---

## 最佳实践

### 1. 中间件加载顺序

```javascript
// 推荐顺序
const express = require("express")
const app = express()

// 1. 安全相关
app.use(helmet())

// 2. 日志
app.use(morgan("dev"))

// 3. 请求体解析
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 4. Cookie 和 Session
app.use(cookieParser())
// app.use(session({ ... }))

// 5. 静态文件
app.use(express.static("public"))

// 6. CORS
app.use(cors())

// 7. 限流
app.use("/api", rateLimiter)

// 8. 路由
app.use("/api/users", usersRouter)
app.use("/api/products", productsRouter)

// 9. 404 处理
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" })
})

// 10. 错误处理（最后）
app.use(errorHandler)
```

### 2. 异步路由处理

```javascript
// 方案一：async/await + try-catch
app.get("/users/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ error: "用户不存在" })
    res.json(user)
  } catch (err) {
    next(err)
  }
})

// 方案二：包装函数
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next)

app.get("/users/:id", asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
  if (!user) return res.status(404).json({ error: "用户不存在" })
  res.json(user)
}))
```

### 3. 响应格式统一

```javascript
// 成功响应
res.json({
  success: true,
  data: { ... },
  message: "操作成功"
})

// 分页响应
res.json({
  success: true,
  data: [...],
  pagination: {
    page: 1,
    limit: 10,
    total: 100,
    totalPages: 10
  }
})

// 错误响应
res.status(400).json({
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "验证失败",
    details: [...]
  }
})
```

### 4. 生产环境检查清单

- [ ] 设置 `NODE_ENV=production`
- [ ] 使用 HTTPS
- [ ] 实现优雅关闭
- [ ] 配置日志系统（Winston/Pino）
- [ ] 使用进程管理器（PM2）
- [ ] 配置反向代理（Nginx）
- [ ] 启用 Gzip 压缩
- [ ] 配置健康检查端点
- [ ] 实现请求限流
- [ ] 配置错误监控（Sentry）

---

## 常见问题

### Q1: req.body 为 undefined？

**原因**：未使用请求体解析中间件。

**解决**：

```javascript
// 添加 JSON 解析中间件
app.use(express.json())

// 如果是表单数据
app.use(express.urlencoded({ extended: true }))
```

### Q2: 如何处理跨域请求？

**方案一**：使用 cors 中间件

```javascript
const cors = require("cors")
app.use(cors())
```

**方案二**：手动设置响应头

```javascript
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE")
  res.header("Access-Control-Allow-Headers", "Content-Type,Authorization")
  next()
})
```

### Q3: 异步错误没有被捕获？

**原因**：Express 4.x 不会自动捕获 Promise 拒绝。

**解决**：

```javascript
// Express 5.0+ 已自动支持
// Express 4.x 需要手动处理
app.get("/async", async (req, res, next) => {
  try {
    const data = await asyncOperation()
    res.json(data)
  } catch (err) {
    next(err)
  }
})
```

### Q4: 如何获取客户端真实 IP？

```javascript
app.set("trust proxy", true)

app.get("/ip", (req, res) => {
  const ip = req.ip
  res.json({ ip })
})
```

### Q5: 如何实现文件上传？

使用 multer 中间件：

```javascript
const multer = require("multer")
const upload = multer({ dest: "uploads/" })

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({ file: req.file })
})
```

---

## 参考资源

- [Express 官方文档](https://expressjs.com/)
- [Express 中文文档](http://www.expressjs.com.cn/)
- [Express GitHub 仓库](https://github.com/expressjs/express)
- [Awesome Express](https://github.com/rajikaimal/awesome-express)
