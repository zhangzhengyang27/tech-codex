---
title: Koa 实战应用
description: 基于 Koa 的完整实战案例，展示企业级项目结构、控制器分层与中间件组合的落地实现。
keywords: [Node.js, Web框架, Koa]
category: Node.js
tags: [Node.js, Web框架]
---







# Koa 实战应用

## 项目架构设计

### 企业级项目结构

```
koa-project/
├── app.js                  # 应用入口
├── config/                 # 配置文件
│   ├── index.js           # 主配置
│   ├── database.js        # 数据库配置
│   └── redis.js           # Redis配置
├── controllers/           # 控制器层
│   ├── user.controller.js
│   └── goods.controller.js
├── middlewares/           # 中间件
│   ├── auth.js           # 鉴权中间件
│   ├── errorHandler.js   # 错误处理
│   └── logger.js         # 日志中间件
├── models/               # 数据模型
│   ├── user.model.js
│   └── goods.model.js
├── routers/              # 路由层
│   ├── index.js
│   ├── user.js
│   └── goods.js
├── services/             # 业务逻辑层
│   ├── user.service.js
│   └── goods.service.js
├── utils/                # 工具函数
│   ├── response.js
│   └── validator.js
├── validators/           # 参数验证器
│   └── user.validator.js
├── logs/                 # 日志目录
├── public/               # 静态资源
└── tests/                # 测试文件
```

### 分层架构图

```
┌─────────────────────────────────────────────────────────┐
│                      客户端请求                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   中间件层 (Middleware)                  │
│  ┌──────────┬──────────┬──────────┬──────────┐         │
│  │  Logger  │  Error   │   Auth   │  Parser  │         │
│  └──────────┴──────────┴──────────┴──────────┘         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                     路由层 (Router)                      │
│          定义API端点和HTTP方法映射                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  控制器层 (Controller)                   │
│        处理请求参数、调用业务逻辑、返回响应               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  业务逻辑层 (Service)                    │
│          实现核心业务逻辑、事务管理                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  数据访问层 (Model/DAO)                  │
│            数据库操作、ORM映射、缓存访问                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                     数据存储层                           │
│       ┌──────────┬──────────┬──────────┐               │
│       │  MySQL   │  Redis   │ MongoDB  │               │
│       └──────────┴──────────┴──────────┘               │
└─────────────────────────────────────────────────────────┘
```

---

## 路由管理

### 基础路由使用

`@koa/router` 路由基本使用：

```javascript
const Koa = require("koa")
const app = new Koa()
const Router = require("@koa/router")
const router = new Router()

router.get("/goods/getInfo", async (ctx) => {
  ctx.body = "this is koa book."
})

router.get("/user/getInfo", async (ctx) => {
  ctx.body = "my name is liujianghong."
})

app.use(router.routes()).use(router.allowedMethods())
app.listen(4000, () => {
  console.log("server is running, port is 4000")
})
```

上述写法有一个弊端，在实际项目中，Node 层的接口可能会很多，所有的路由都放在一个文件里，最终会变得越来越难维护。

### 路由分割

路由分割就是把所有路由按照类别进行划分，并分别维护在不同的文件里。

:::: code-group

```js [goods.js]
// routers/goods.js
const Router = require("@koa/router")
const router = new Router()

// 设置路由前缀
router.prefix("/goods")

router.get("/getInfo", (ctx, next) => {
  ctx.body = "this is koa book."
})

router.get("/:id", (ctx) => {
  const { id } = ctx.params
  ctx.body = { id, name: `商品${id}` }
})

router.post("/create", (ctx) => {
  ctx.body = { message: "创建成功" }
})

module.exports = router
```

```js [user.js]
// routers/user.js
const Router = require("@koa/router")
const router = new Router()

router.prefix("/user")

router.get("/getInfo", (ctx, next) => {
  ctx.body = "my name is liujianghong."
})

router.post("/login", (ctx) => {
  ctx.body = { token: "xxx" }
})

module.exports = router
```

::::

每个路由文件中都使用一个路由前缀，这样方便分类。每个文件封装不同类型的路由，接下来要做的就是对这些路由进行整合。路由的合并会用到 `koa-compose` 包来实现：

```javascript
// routers/index.js
const compose = require("koa-compose")
const glob = require("glob")
const { resolve } = require("path")

const registerRouter = () => {
  let routers = []
  
  // 递归式获取当前文件夹下所有的.js文件，排除 index.js文件
  glob
    .sync(resolve(__dirname, "./", "**/*.js"))
    .filter((value) => value.indexOf("index.js") === -1)
    .forEach((router) => {
      routers.push(require(router).routes())
      routers.push(require(router).allowedMethods())
    })
  
  return compose(routers)
}

module.exports = registerRouter
```

这里可以使用 `koa-compose` 对 `@koa/router` 进行整合，这是因为 `@koa/router` 里面的 `routes` 方法和 `allowedMethods` 方法和平时用的中间件回调方法是一样的。

```javascript
// app.js
const Koa = require("koa")
const registerRouter = require("./routers")
const app = new Koa()

app.use(registerRouter())

app.listen(4000, () => {
  console.log("server is running, port is 4000")
})
```

### 文件路由

根据文件路径来匹配路由，也是在实际项目中可能采取的一种方式。

**第一步**：定义路由文件

```javascript
// actions/goods/getInfo.js
module.exports = {
  method: "GET",
  handler: (ctx) => {
    ctx.body = "this is koa book."
  }
}

// actions/user/getInfo.js
module.exports = {
  method: "GET",
  handler: (ctx) => {
    ctx.body = "my name is liujianghong."
  }
}

// actions/user/create.js
module.exports = {
  method: "POST",
  handler: (ctx) => {
    ctx.body = { message: "用户创建成功" }
  }
}
```

**第二步**：实现文件路由映射

```javascript
const glob = require("glob")
const path = require("path")
const Koa = require("koa")
const app = new Koa()

// actions的绝对路径
const basePath = path.resolve(__dirname, "./actions")
// 获取 actions 目录下所有的.js文件, 并返回其绝对路径
const filesList = glob.sync(path.resolve(__dirname, "./actions", "**/*.js"))

// 文件路由映射表
let routerMap = {}

filesList.forEach((item) => {
  // 解构的方式获取当前文件导出对象中的 method 属性和 handler 属性
  const { method, handler } = require(item)
  // 获取和actions目录的相对路径, 例如：goods/getInfo.js
  const relative = path.relative(basePath, item)
  // 获取文件后缀.js
  const extname = path.extname(item)
  // 剔除后缀.js, 并在前面加一个"/", 例如：/goods/getInfo
  const fileRouter = "/" + relative.split(extname)[0]
  // 连接 method, 形成一个唯一请求, 例如: _GET_/goods/getInfo
  const key = "_" + method + "_" + fileRouter
  // 保存在路由表里
  routerMap[key] = handler
})

app.use(async (ctx, next) => {
  const { path, method } = ctx
  // 构建和文件路由匹配的形式为_GET_路由
  const key = "_" + method + "_" + path
  // 如果匹配到, 就执行对应到 handler 方法
  if (routerMap[key]) {
    routerMap[key](ctx)
  } else {
    ctx.body = "no this router"
  }
})

app.listen(4000, () => {
  console.log("server is running, port is 4000")
})
```

文件路由书写起来比较优雅，可以做到高度可配置，这样可以对每个请求实行个性化定制。

### RESTful API 设计

#### 设计原则

| HTTP 方法 | 操作 | 路径示例 | 说明 |
|-----------|------|----------|------|
| GET | 查询 | `/api/users` | 获取用户列表 |
| GET | 查询 | `/api/users/:id` | 获取单个用户 |
| POST | 创建 | `/api/users` | 创建新用户 |
| PUT | 完整更新 | `/api/users/:id` | 更新用户全部信息 |
| PATCH | 部分更新 | `/api/users/:id` | 更新用户部分信息 |
| DELETE | 删除 | `/api/users/:id` | 删除用户 |

#### RESTful 路由实现

```javascript
// routers/user.js
const Router = require("@koa/router")
const UserController = require("../controllers/user.controller")
const router = new Router({ prefix: "/api/users" })

// 获取用户列表
router.get("/", UserController.list)

// 获取单个用户
router.get("/:id", UserController.getById)

// 创建用户
router.post("/", UserController.create)

// 更新用户（完整）
router.put("/:id", UserController.update)

// 更新用户（部分）
router.patch("/:id", UserController.patch)

// 删除用户
router.delete("/:id", UserController.delete)

module.exports = router
```

```javascript
// controllers/user.controller.js
class UserController {
  // 获取用户列表
  static async list(ctx) {
    const { page = 1, pageSize = 10 } = ctx.query
    ctx.body = {
      code: 0,
      data: {
        list: [],
        total: 0,
        page: Number(page),
        pageSize: Number(pageSize)
      }
    }
  }

  // 获取单个用户
  static async getById(ctx) {
    const { id } = ctx.params
    ctx.body = {
      code: 0,
      data: { id, name: "用户" + id }
    }
  }

  // 创建用户
  static async create(ctx) {
    const data = ctx.request.body
    ctx.status = 201
    ctx.body = {
      code: 0,
      message: "创建成功",
      data
    }
  }

  // 更新用户（完整）
  static async update(ctx) {
    const { id } = ctx.params
    const data = ctx.request.body
    ctx.body = {
      code: 0,
      message: "更新成功",
      data: { id, ...data }
    }
  }

  // 更新用户（部分）
  static async patch(ctx) {
    const { id } = ctx.params
    const data = ctx.request.body
    ctx.body = {
      code: 0,
      message: "部分更新成功",
      data: { id, ...data }
    }
  }

  // 删除用户
  static async delete(ctx) {
    const { id } = ctx.params
    ctx.status = 204
  }
}

module.exports = UserController
```

### 路由参数验证

使用 `koa-joi-router` 进行参数验证：

```javascript
const Koa = require("koa")
const Router = require("koa-joi-router")
const { Joi } = Router
const app = new Koa()
const router = Router()

router.route({
  method: "post",
  path: "/api/users",
  validate: {
    body: {
      username: Joi.string().alphanum().min(3).max(30).required(),
      password: Joi.string().pattern(new RegExp("^[a-zA-Z0-9]{3,30}$")).required(),
      email: Joi.string().email({ minDomainSegments: 2 }).required(),
      age: Joi.number().integer().min(0).max(120)
    },
    type: "json",
    output: {
      201: {
        body: {
          code: Joi.number(),
          message: Joi.string(),
          data: Joi.object()
        }
      }
    }
  },
  handler: async (ctx) => {
    const user = ctx.request.body
    // 处理创建逻辑
    ctx.status = 201
    ctx.body = {
      code: 0,
      message: "创建成功",
      data: user
    }
  }
})

app.use(router.middleware())
app.listen(4000)
```

#### 路由对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| 路由分割 | 结构清晰、易于维护、团队协作友好 | 需要额外的整合逻辑 | 中大型项目 |
| 文件路由 | 高度可配置、自动化程度高 | 路径固定、灵活性稍低 | API数量多的项目 |
| 路由装饰器 | 代码优雅、类型安全 | 需要TypeScript支持 | TS项目 |

---

## 用户鉴权机制

所有前端项目的鉴权方式都是基于 Cookie 实现的，而普通的 Session 方式虽然也能实现一些鉴权功能，但在企业级项目中，考虑到安全问题，会采用一些业界比较安全且通用的鉴权方案。

### Session 鉴权

#### 基本原理

```
┌──────────┐                  ┌──────────┐                  ┌──────────┐
│  Client  │                  │  Server  │                  │  Session │
└────┬─────┘                  └────┬─────┘                  │  Store   │
     │                             │                        └────┬─────┘
     │  1. POST /login             │                             │
     │  {username, password}       │                             │
     │────────────────────────────>│                             │
     │                             │  2. 验证用户                 │
     │                             │  创建Session                 │
     │                             │─────────────────────────────>│
     │                             │                             │
     │  3. Set-Cookie:             │                             │
     │  sessionId=xxx              │                             │
     │<────────────────────────────│                             │
     │                             │                             │
     │  4. GET /api/user           │                             │
     │  Cookie: sessionId=xxx      │                             │
     │────────────────────────────>│                             │
     │                             │  5. 查询Session              │
     │                             │<─────────────────────────────│
     │                             │                             │
     │  6. 返回用户数据             │                             │
     │<────────────────────────────│                             │
```

#### 实现代码

```javascript
const Koa = require("koa")
const Router = require("@koa/router")
const session = require("koa-session")
const app = new Koa()
const router = new Router()

// Session配置
app.keys = ["some secret key"]
const CONFIG = {
  key: "koa:sess",
  maxAge: 86400000,      // 24小时
  overwrite: true,
  httpOnly: true,        // 防止XSS攻击
  signed: true,          // 签名防止篡改
  rolling: false,
  renew: false,
  secure: false,         // 生产环境设为true，仅HTTPS
  sameSite: "strict"     // 防止CSRF攻击
}

app.use(session(CONFIG, app))

// 登录接口
router.post("/login", async (ctx) => {
  const { username, password } = ctx.request.body
  
  // 验证用户名密码
  if (username === "admin" && password === "123456") {
    // 保存用户信息到Session
    ctx.session.user = {
      id: 1,
      username,
      role: "admin"
    }
    ctx.body = {
      code: 0,
      message: "登录成功"
    }
  } else {
    ctx.status = 401
    ctx.body = {
      code: -1,
      message: "用户名或密码错误"
    }
  }
})

// 获取用户信息
router.get("/api/user", async (ctx) => {
  if (ctx.session.user) {
    ctx.body = {
      code: 0,
      data: ctx.session.user
    }
  } else {
    ctx.status = 401
    ctx.body = {
      code: -1,
      message: "未登录"
    }
  }
})

// 登出
router.post("/logout", async (ctx) => {
  ctx.session = null
  ctx.body = {
    code: 0,
    message: "登出成功"
  }
})

app.use(router.routes())
app.listen(4000)
```

### JWT 鉴权

JWT（JSON Web Token）是一种为了在网络应用环境之间传递声明而执行的基于 JSON 的开放标准，JWT 在鉴权场景中有着非常广泛的应用。

#### JWT 结构

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJ1c2VybmFtZSI6ImxpdWppYW5naG9uZyIsImlhdCI6MTYzMDcyNTU0NiwiZXhwIjoxNjMwNzI5MTQ2fQ.
tCZobphzBo0atE5cXLVI-9NxE-PUbs9dY1gPSrty5pw
```

这段字符串按照小圆点分割成三部分：

**Header（头部）**

```json
{ "alg": "HS256", "typ": "JWT" }
```

- `alg`：加密算法
- `typ`：令牌类型

**Payload（负载）**

JWT 标准声明字段：

| 字段 | 说明 |
|------|------|
| iss | JWT 签发者 |
| sub | JWT 所面向的用户 |
| aud | 接收 JWT 的一方 |
| exp | JWT 的过期时间，必须大于签发时间 |
| nbf | 定义在什么时间之前，该 JWT 都是不可用的 |
| iat | JWT 的签发时间 |
| jti | JWT 的唯一身份标识，用于回避重放攻击 |

**Signature（签名）**

由 Base64 编码后的 header 和 payload 通过小圆点连接，再通过加密算法（需要一个 secret）生成。

#### JWT 实现代码

:::: code-group

```html [index.html]
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>JWT Demo</title>
  </head>
  <body>
    <button onclick="welcome()">进入系统欢迎页面</button>
    <button onclick="login()">登录</button>
    <button onclick="refreshToken()">刷新Token</button>
    <p></p>
  </body>
  <script>
    function welcome() {
      const token = localStorage.getItem("token")
      fetch("/welcome", {
        method: "GET",
        headers: {
          authorization: "Bearer " + token,
          "content-type": "application/json"
        }
      })
        .then((response) => {
          if (response.status === 401) {
            alert("无权限！需要先登录")
          } else {
            return response.json()
          }
        })
        .then((json) => {
          document.querySelector("p").innerHTML = JSON.stringify(json)
        })
    }

    function login() {
      fetch("/login", {
        method: "POST",
        body: JSON.stringify({
          userName: "liujianghong"
        }),
        headers: {
          "Content-Type": "application/json"
        }
      })
        .then((response) => response.json())
        .then((json) => {
          if (json.token) {
            localStorage.setItem("token", json.token)
            localStorage.setItem("refreshToken", json.refreshToken)
            alert("登录成功")
          }
        })
    }

    function refreshToken() {
      const refreshToken = localStorage.getItem("refreshToken")
      fetch("/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ refreshToken })
      })
        .then((response) => response.json())
        .then((json) => {
          if (json.token) {
            localStorage.setItem("token", json.token)
            alert("Token已刷新")
          }
        })
    }
  </script>
</html>
```

```js [app.js]
const Koa = require("koa")
const bodyParser = require("koa-bodyparser")
const Router = require("@koa/router")
const static = require("koa-static")
const path = require("path")
const jwt = require("jsonwebtoken")

const app = new Koa()
const router = new Router()

const SECRET = "my_secret_key"
const REFRESH_SECRET = "my_refresh_secret"

// 中间件
app.use(bodyParser())
app.use(static(path.join(__dirname, "/static")))

// 登录接口
router.post("/login", async (ctx) => {
  const { userName } = ctx.request.body
  
  if (userName) {
    // 生成访问Token（短期）
    const token = jwt.sign({ userName }, SECRET, { expiresIn: "1h" })
    // 生成刷新Token（长期）
    const refreshToken = jwt.sign({ userName }, REFRESH_SECRET, { expiresIn: "7d" })
    
    ctx.body = {
      message: "登录成功",
      code: 0,
      token,
      refreshToken
    }
  } else {
    ctx.body = {
      message: "参数错误",
      code: -1
    }
  }
})

// 刷新Token接口
router.post("/refresh", async (ctx) => {
  const { refreshToken } = ctx.request.body
  
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET)
    const token = jwt.sign({ userName: decoded.userName }, SECRET, { expiresIn: "1h" })
    
    ctx.body = {
      code: 0,
      message: "Token刷新成功",
      token
    }
  } catch (err) {
    ctx.status = 401
    ctx.body = {
      code: -1,
      message: "刷新Token无效或已过期"
    }
  }
})

// JWT验证中间件
const authMiddleware = async (ctx, next) => {
  const authorization = ctx.header.authorization
  
  if (!authorization) {
    ctx.status = 401
    ctx.body = { code: -1, message: "未提供Token" }
    return
  }
  
  const token = authorization.replace("Bearer ", "")
  
  try {
    const decoded = jwt.verify(token, SECRET)
    ctx.state.user = decoded
    await next()
  } catch (err) {
    ctx.status = 401
    ctx.body = { code: -1, message: "Token无效或已过期" }
  }
}

// 受保护的路由
router.get("/welcome", authMiddleware, async (ctx) => {
  ctx.body = {
    message: "Welcome!",
    user: ctx.state.user
  }
})

app.use(router.routes()).use(router.allowedMethods())

app.listen(4000, () => {
  console.log("server is running, port is 4000")
})
```

::::

#### JWT vs Session 对比

| 特性 | JWT | Session |
|------|-----|---------|
| 存储位置 | 客户端 | 服务端 |
| 扩展性 | 好（无状态） | 差（需共享Session） |
| 安全性 | 一般（可被解码） | 较好 |
| 性能 | 好（无需查询） | 一般（需查询Session） |
| 注销 | 困难（需额外逻辑） | 简单 |
| 跨域 | 友好 | 需要特殊处理 |

### 单点登录 SSO

在互联网公司工作，一定遇到过这样的场景：公司内部有很多平台系统，新用户第一次登录 A 系统时，会跳转到公司内部的一个登录平台，需要输入用户名和密码，或者手机扫码进行登录。成功登录 A 系统之后，在访问 B 系统时，发现不用再到登录平台进行验证操作了，可以直接访问 B 系统。这种设计就是单点登录（Single Sign On，SSO）。

实现单点登录的方式有：同域 SSO、同父域 SSO 以及跨域 SSO。

#### 同域 SSO

同域 SSO 指的是相同域名下的 App：

```
app.example.com/app1
app.example.com/app2
app.example.com/app3
```

3 个 App 的域名都是 `app.example.com`，只是后面跟的路径不一样。用户登录 App1 后，服务端将返回一个 token 并种在 `app.example.com` 域下面。当用户访问 App2 时，请求会自动带上 `app.example.com` 域下面的 Cookie，因为该 Cookie 是登录成功后颁发的，所以鉴权肯定是通过的，进而做到了单点登录。

多数情况下，同域 App 就是一个产品，当然也有一些情况虽然是同域，但是可以划分成不同的产品，比如微前端方式。

#### 同父域 SSO

同父域 SSO 指的是 App 本身域名不一样，父级域名一样。这种方式也可以实现单点登录，因为浏览器发起请求的时候，会自动带上父级域名的 Cookie。

```
app1.example.com
app2.example.com
app3.example.com
```

设置 Cookie 时指定 `domain: .example.com` 即可共享 Cookie。

#### 跨域 SSO（CAS 架构）

如果 App 之间的同级域不一样，父域也不一样，在 Cookie 不共享的情况下，该如何做到单点登录呢？集中式认证服务（Central Authentication Service，CAS）架构可以解决这样的问题。目前业界做 SSO 鉴权的方案多数是采用 CAS 架构。

**CAS 架构组成**：

- **CAS 客户端**：受保护的应用，即需要鉴权的系统
- **CAS 服务端**：负责鉴权工作，通常是一个 SSO 统一平台

**CAS 认证流程**：

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  用户    │         │  App服务 │         │CAS服务端 │
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │ 1. 访问App         │                    │
     │───────────────────>│                    │
     │                    │                    │
     │ 2. 重定向到CAS登录页 │                    │
     │<───────────────────│                    │
     │                    │                    │
     │ 3. 请求CAS登录页    │                    │
     │────────────────────────────────────────>│
     │                    │                    │
     │ 4. 返回登录表单     │                    │
     │<────────────────────────────────────────│
     │                    │                    │
     │ 5. 提交用户名密码   │                    │
     │────────────────────────────────────────>│
     │                    │                    │
     │                    │ 6. 验证成功，生成Ticket
     │                    │                    │
     │ 7. 重定向回App（带Ticket）                │
     │<────────────────────────────────────────│
     │                    │                    │
     │ 8. 请求App（带Ticket）                   │
     │───────────────────>│                    │
     │                    │                    │
     │                    │ 9. 验证Ticket      │
     │                    │───────────────────>│
     │                    │                    │
     │                    │ 10. 返回用户信息   │
     │                    │<───────────────────│
     │                    │                    │
     │ 11. 设置Cookie，返回资源                   │
     │<───────────────────│                    │
```

**流程详解**：

1. 用户第一次访问 App，App 经过验证发现该用户没有登录过，于是浏览器跳转到 CAS 服务端的登录页面进行认证，此时 URL 的 query 参数中带有访问 App 的 URL
2. CAS 服务端发现该浏览器之前没有建立过 Session，跳转到 CAS 服务端的登录页面
3. 用户填写用户名和密码
4. CAS 服务端验证该用户名和密码的有效性，经过验证该用户是有效用户，CAS 服务端会创建一个 Session，并且颁发一个通行证（Ticket）。SessionID 和 Ticket 会通过响应头返回给浏览器
5. 浏览器发起请求访问 App Server
6. App Server 带着刚刚 CAS 服务颁发的 Ticket，向 CAS 服务端索要用户的相关信息
7. CAS 服务端验证 App Server 带来的这个 Ticket 是有效的，于是通过 XML 形式把用户相关信息交给了 App Server
8. 用户信息包含着一个重要的数据 JSESSIONID，浏览器会将其种到 Cookie 中，并告诉浏览器重定向第一步中访问 App 的 URL
9. App Server 在收到请求后，发现带过来的 Cookie 是有效的，于是将接口数据返回给浏览器
10. 当用户再次访问 App 时，由于已经在 Cookie 里种了 token，请求会自动带上 Cookie 在 App 服务端进行验证，如果验证通过，则直接返回结果

### OAuth 2.0 授权

OAuth 2.0 标准目前广泛应用于第三方平台授权场景，如微信登录、GitHub 登录等。

#### 授权流程

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│   用户   │         │  客户端  │         │授权服务器│
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │ 1. 请求授权        │                    │
     │───────────────────>│                    │
     │                    │                    │
     │ 2. 重定向到授权页面 │                    │
     │<───────────────────│                    │
     │                    │                    │
     │ 3. 用户同意授权     │                    │
     │────────────────────────────────────────>│
     │                    │                    │
     │ 4. 返回授权码Code   │                    │
     │<────────────────────────────────────────│
     │                    │                    │
     │ 5. 提交Code        │                    │
     │───────────────────>│                    │
     │                    │                    │
     │                    │ 6. 用Code换取Token │
     │                    │───────────────────>│
     │                    │                    │
     │                    │ 7. 返回Access Token│
     │                    │<───────────────────│
     │                    │                    │
     │ 8. 登录成功         │                    │
     │<───────────────────│                    │
```

#### 实现代码

```javascript
// GitHub OAuth 登录示例
const Koa = require("koa")
const Router = require("@koa/router")
const axios = require("axios")
const app = new Koa()
const router = new Router()

const config = {
  client_id: "your_github_client_id",
  client_secret: "your_github_client_secret",
  redirect_uri: "http://localhost:4000/oauth/callback"
}

// 发起授权请求
router.get("/oauth/github", (ctx) => {
  const url = `https://github.com/login/oauth/authorize?client_id=${config.client_id}&redirect_uri=${config.redirect_uri}`
  ctx.redirect(url)
})

// 授权回调
router.get("/oauth/callback", async (ctx) => {
  const { code } = ctx.query
  
  // 用授权码换取Token
  const tokenResponse = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: config.client_id,
      client_secret: config.client_secret,
      code: code,
      redirect_uri: config.redirect_uri
    },
    {
      headers: { Accept: "application/json" }
    }
  )
  
  const accessToken = tokenResponse.data.access_token
  
  // 获取用户信息
  const userResponse = await axios.get("https://api.github.com/user", {
    headers: { Authorization: `token ${accessToken}` }
  })
  
  ctx.body = {
    code: 0,
    message: "登录成功",
    user: userResponse.data
  }
})

app.use(router.routes())
app.listen(4000)
```

### 权限控制 RBAC

基于角色的访问控制（Role-Based Access Control）是企业级应用常用的权限管理方案。

#### RBAC 模型

```
┌─────────────────────────────────────────────────────┐
│                      用户 (User)                     │
│              admin, user1, user2, ...               │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ 拥有
                      ▼
┌─────────────────────────────────────────────────────┐
│                    角色 (Role)                       │
│          管理员, 编辑, 普通用户, 访客, ...           │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ 拥有
                      ▼
┌─────────────────────────────────────────────────────┐
│                   权限 (Permission)                  │
│      用户创建, 用户删除, 文章编辑, 文章发布, ...     │
└─────────────────────┬───────────────────────────────┘
                      │
                      │ 对应
                      ▼
┌─────────────────────────────────────────────────────┐
│                    资源 (Resource)                   │
│          /api/users, /api/articles, ...             │
└─────────────────────────────────────────────────────┘
```

#### 实现代码

```javascript
// middlewares/rbac.js
const rbacMiddleware = (requiredPermissions) => {
  return async (ctx, next) => {
    const user = ctx.state.user
    
    if (!user) {
      ctx.status = 401
      ctx.body = { code: -1, message: "未登录" }
      return
    }
    
    // 获取用户角色
    const roles = user.roles || []
    
    // 获取角色的权限
    const permissions = getPermissionsByRoles(roles)
    
    // 检查是否有所需权限
    const hasPermission = requiredPermissions.every((p) =>
      permissions.includes(p)
    )
    
    if (!hasPermission) {
      ctx.status = 403
      ctx.body = { code: -1, message: "权限不足" }
      return
    }
    
    await next()
  }
}

// 角色权限映射
const rolePermissions = {
  admin: ["user:create", "user:read", "user:update", "user:delete"],
  editor: ["article:create", "article:read", "article:update"],
  user: ["article:read"]
}

function getPermissionsByRoles(roles) {
  const permissions = new Set()
  roles.forEach((role) => {
    const perms = rolePermissions[role] || []
    perms.forEach((p) => permissions.add(p))
  })
  return Array.from(permissions)
}

module.exports = rbacMiddleware
```

```javascript
// 使用示例
const Router = require("@koa/router")
const rbacMiddleware = require("../middlewares/rbac")
const authMiddleware = require("../middlewares/auth")
const router = new Router({ prefix: "/api/users" })

// 创建用户（需要 user:create 权限）
router.post(
  "/",
  authMiddleware,
  rbacMiddleware(["user:create"]),
  async (ctx) => {
    ctx.body = { message: "创建用户成功" }
  }
)

// 删除用户（需要 user:delete 权限）
router.delete(
  "/:id",
  authMiddleware,
  rbacMiddleware(["user:delete"]),
  async (ctx) => {
    ctx.body = { message: "删除用户成功" }
  }
)

module.exports = router
```

---

## 数据存储

### MySQL 数据库

#### 基础使用

安装依赖：

```bash
npm install mysql2
```

#### 连接池配置

```javascript
// config/database.js
const mysql = require("mysql2/promise")

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "123456",
  database: process.env.DB_NAME || "koadb",
  waitForConnections: true,
  connectionLimit: 10,      // 连接池大小
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
})

module.exports = pool
```

#### 基础操作

```javascript
// models/user.model.js
const pool = require("../config/database")

class UserModel {
  // 创建用户
  static async create(userData) {
    const { username, nickname, email } = userData
    const [result] = await pool.execute(
      "INSERT INTO tbl_users (username, nickname, email) VALUES (?, ?, ?)",
      [username, nickname, email]
    )
    return result.insertId
  }

  // 查询用户列表
  static async findAll(page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize
    const [rows] = await pool.execute(
      "SELECT * FROM tbl_users LIMIT ? OFFSET ?",
      [pageSize, offset]
    )
    const [countRows] = await pool.execute(
      "SELECT COUNT(*) as total FROM tbl_users"
    )
    return {
      list: rows,
      total: countRows[0].total
    }
  }

  // 根据ID查询
  static async findById(id) {
    const [rows] = await pool.execute(
      "SELECT * FROM tbl_users WHERE id = ?",
      [id]
    )
    return rows[0]
  }

  // 更新用户
  static async update(id, userData) {
    const fields = []
    const values = []
    
    Object.keys(userData).forEach((key) => {
      fields.push(`${key} = ?`)
      values.push(userData[key])
    })
    
    values.push(id)
    
    const [result] = await pool.execute(
      `UPDATE tbl_users SET ${fields.join(", ")} WHERE id = ?`,
      values
    )
    return result.affectedRows > 0
  }

  // 删除用户
  static async delete(id) {
    const [result] = await pool.execute(
      "DELETE FROM tbl_users WHERE id = ?",
      [id]
    )
    return result.affectedRows > 0
  }
}

module.exports = UserModel
```

#### 事务处理

```javascript
// services/order.service.js
const pool = require("../config/database")

class OrderService {
  static async createOrder(orderData) {
    const connection = await pool.getConnection()
    
    try {
      await connection.beginTransaction()
      
      // 1. 创建订单
      const [orderResult] = await connection.execute(
        "INSERT INTO orders (user_id, total_amount) VALUES (?, ?)",
        [orderData.userId, orderData.totalAmount]
      )
      const orderId = orderResult.insertId
      
      // 2. 扣减库存
      for (const item of orderData.items) {
        const [stockResult] = await connection.execute(
          "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?",
          [item.quantity, item.productId, item.quantity]
        )
        
        if (stockResult.affectedRows === 0) {
          throw new Error("库存不足")
        }
        
        // 3. 创建订单项
        await connection.execute(
          "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)",
          [orderId, item.productId, item.quantity, item.price]
        )
      }
      
      await connection.commit()
      return { orderId, success: true }
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  }
}

module.exports = OrderService
```

#### ORM（Sequelize）

```javascript
// models/user.model.js
const { Sequelize, DataTypes } = require("sequelize")

const sequelize = new Sequelize("koadb", "root", "123456", {
  host: "localhost",
  dialect: "mysql",
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: false
})

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    nickname: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING(100),
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    status: {
      type: DataTypes.TINYINT,
      defaultValue: 1,
      comment: "1-正常 0-禁用"
    }
  },
  {
    tableName: "tbl_users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
)

// 同步模型到数据库
User.sync({ alter: true })

module.exports = User
```

```javascript
// 使用示例
const User = require("../models/user.model")

// 创建
const user = await User.create({
  username: "zhangsan",
  nickname: "张三",
  email: "zhangsan@example.com",
  password: "hashed_password"
})

// 查询
const users = await User.findAll({
  where: { status: 1 },
  attributes: ["id", "username", "nickname"],
  order: [["created_at", "DESC"]],
  limit: 10,
  offset: 0
})

// 更新
await User.update(
  { nickname: "李四" },
  { where: { id: 1 } }
)

// 删除
await User.destroy({ where: { id: 1 } })
```

### Redis 缓存

#### 安装与连接

```bash
npm install redis
```

```javascript
// config/redis.js
const redis = require("redis")

const client = redis.createClient({
  url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`
})

client.on("error", (err) => console.error("Redis Error:", err))
client.on("connect", () => console.log("Redis Connected"))

client.connect().catch(console.error)

module.exports = client
```

#### 缓存工具类

```javascript
// utils/cache.js
const redisClient = require("../config/redis")

class CacheUtil {
  // 设置缓存
  static async set(key, value, expireSeconds = 3600) {
    const data = JSON.stringify(value)
    await redisClient.setEx(key, expireSeconds, data)
  }

  // 获取缓存
  static async get(key) {
    const data = await redisClient.get(key)
    return data ? JSON.parse(data) : null
  }

  // 删除缓存
  static async del(key) {
    await redisClient.del(key)
  }

  // 设置哈希
  static async hSet(key, field, value) {
    await redisClient.hSet(key, field, JSON.stringify(value))
  }

  // 获取哈希
  static async hGet(key, field) {
    const data = await redisClient.hGet(key, field)
    return data ? JSON.parse(data) : null
  }

  // 判断key是否存在
  static async exists(key) {
    const result = await redisClient.exists(key)
    return result === 1
  }

  // 设置过期时间
  static async expire(key, seconds) {
    await redisClient.expire(key, seconds)
  }
}

module.exports = CacheUtil
```

#### 缓存中间件

```javascript
// middlewares/cache.js
const CacheUtil = require("../utils/cache")

const cacheMiddleware = (expireSeconds = 3600) => {
  return async (ctx, next) => {
    const cacheKey = `cache:${ctx.method}:${ctx.url}`
    
    // 尝试获取缓存
    const cachedData = await CacheUtil.get(cacheKey)
    
    if (cachedData) {
      ctx.set("X-Cache", "HIT")
      ctx.body = cachedData
      return
    }
    
    ctx.set("X-Cache", "MISS")
    await next()
    
    // 响应成功后缓存数据
    if (ctx.status === 200 && ctx.body) {
      await CacheUtil.set(cacheKey, ctx.body, expireSeconds)
    }
  }
}

module.exports = cacheMiddleware
```

#### 使用示例

```javascript
const Router = require("@koa/router")
const cacheMiddleware = require("../middlewares/cache")
const User = require("../models/user.model")
const router = new Router({ prefix: "/api/users" })

// 获取用户列表（缓存10分钟）
router.get("/", cacheMiddleware(600), async (ctx) => {
  const { page = 1, pageSize = 10 } = ctx.query
  const users = await User.findAndCountAll({
    limit: Number(pageSize),
    offset: (Number(page) - 1) * Number(pageSize)
  })
  ctx.body = { code: 0, data: users }
})

// 更新用户后清除缓存
router.put("/:id", async (ctx) => {
  const { id } = ctx.params
  await User.update(ctx.request.body, { where: { id } })
  
  // 清除相关缓存
  const CacheUtil = require("../utils/cache")
  await CacheUtil.del(`cache:GET:/api/users/${id}`)
  await CacheUtil.del("cache:GET:/api/users")
  
  ctx.body = { code: 0, message: "更新成功" }
})

module.exports = router
```

### MongoDB 数据库

#### 安装与连接

```bash
npm install mongoose
```

```javascript
// config/mongodb.js
const mongoose = require("mongoose")

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/koa-app")
    console.log("MongoDB Connected")
  } catch (error) {
    console.error("MongoDB Connection Error:", error)
    process.exit(1)
  }
}

module.exports = connectDB
```

#### 定义模型

```javascript
// models/article.model.js
const mongoose = require("mongoose")
const Schema = mongoose.Schema

const ArticleSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    tags: [
      {
        type: String
      }
    ],
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft"
    },
    viewCount: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
)

// 添加索引
ArticleSchema.index({ title: "text", content: "text" })

// 添加实例方法
ArticleSchema.methods.incrementViewCount = function () {
  this.viewCount += 1
  return this.save()
}

// 添加静态方法
ArticleSchema.statics.findPublished = function () {
  return this.find({ status: "published" })
}

module.exports = mongoose.model("Article", ArticleSchema)
```

#### 使用示例

```javascript
// controllers/article.controller.js
const Article = require("../models/article.model")

class ArticleController {
  // 创建文章
  static async create(ctx) {
    const article = new Article({
      ...ctx.request.body,
      author: ctx.state.user.id
    })
    await article.save()
    
    ctx.status = 201
    ctx.body = {
      code: 0,
      message: "创建成功",
      data: article
    }
  }

  // 获取文章列表
  static async list(ctx) {
    const { page = 1, pageSize = 10, status } = ctx.query
    
    const query = {}
    if (status) query.status = status
    
    const articles = await Article.find(query)
      .populate("author", "username nickname")
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(pageSize))
      .limit(Number(pageSize))
    
    const total = await Article.countDocuments(query)
    
    ctx.body = {
      code: 0,
      data: {
        list: articles,
        total
      }
    }
  }

  // 获取文章详情
  static async getById(ctx) {
    const { id } = ctx.params
    const article = await Article.findById(id)
      .populate("author", "username nickname")
    
    if (!article) {
      ctx.status = 404
      ctx.body = { code: -1, message: "文章不存在" }
      return
    }
    
    await article.incrementViewCount()
    
    ctx.body = {
      code: 0,
      data: article
    }
  }

  // 更新文章
  static async update(ctx) {
    const { id } = ctx.params
    const article = await Article.findByIdAndUpdate(
      id,
      { $set: ctx.request.body },
      { new: true }
    )
    
    ctx.body = {
      code: 0,
      message: "更新成功",
      data: article
    }
  }

  // 删除文章
  static async delete(ctx) {
    const { id } = ctx.params
    await Article.findByIdAndDelete(id)
    
    ctx.status = 204
  }
}

module.exports = ArticleController
```

---

## 文件上传处理

### 使用 koa-body

```bash
npm install @koa/body
```

```javascript
// app.js
const Koa = require("koa")
const { koaBody } = require("@koa/body")
const path = require("path")
const fs = require("fs")

const app = new Koa()

// 文件上传配置
app.use(
  koaBody({
    multipart: true,
    formidable: {
      uploadDir: path.join(__dirname, "/uploads"),
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      onFileBegin: (name, file) => {
        // 自定义文件名
        const ext = path.extname(file.originalFilename)
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
        file.filepath = path.join(__dirname, "/uploads", filename)
        file.newFilename = filename
      }
    }
  })
)

// 上传接口
router.post("/upload", async (ctx) => {
  const file = ctx.request.files.file
  
  if (!file) {
    ctx.body = { code: -1, message: "请选择文件" }
    return
  }
  
  ctx.body = {
    code: 0,
    message: "上传成功",
    data: {
      filename: file.newFilename,
      originalname: file.originalFilename,
      size: file.size,
      mimetype: file.mimetype,
      url: `/uploads/${file.newFilename}`
    }
  }
})

// 多文件上传
router.post("/upload/multiple", async (ctx) => {
  const files = ctx.request.files.files
  const fileList = Array.isArray(files) ? files : [files]
  
  const results = fileList.map((file) => ({
    filename: file.newFilename,
    originalname: file.originalFilename,
    size: file.size,
    url: `/uploads/${file.newFilename}`
  }))
  
  ctx.body = {
    code: 0,
    message: "上传成功",
    data: results
  }
})
```

### 文件类型验证

```javascript
// middlewares/file-validator.js
const path = require("path")

const allowedTypes = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]
}

const fileValidator = (allowedMimeTypes) => {
  return async (ctx, next) => {
    const files = ctx.request.files
    
    if (!files) {
      await next()
      return
    }
    
    const fileArray = Array.isArray(files.files) ? files.files : [files.files]
    
    for (const file of fileArray) {
      if (!allowedMimeTypes.includes(file.mimetype)) {
        ctx.status = 400
        ctx.body = {
          code: -1,
          message: `不支持的文件类型: ${file.mimetype}`
        }
        return
      }
    }
    
    await next()
  }
}

module.exports = fileValidator
```

---

## 日志管理

### 使用 log4js

```bash
npm install log4js
```

```javascript
// utils/logger.js
const log4js = require("log4js")

log4js.configure({
  appenders: {
    console: {
      type: "console"
    },
    file: {
      type: "dateFile",
      filename: "logs/app.log",
      pattern: "yyyy-MM-dd",
      alwaysIncludePattern: true,
      maxLogSize: 10485760, // 10MB
      backups: 30
    },
    error: {
      type: "dateFile",
      filename: "logs/error.log",
      pattern: "yyyy-MM-dd",
      alwaysIncludePattern: true,
      maxLogSize: 10485760,
      backups: 30
    }
  },
  categories: {
    default: {
      appenders: ["console", "file"],
      level: "info"
    },
    error: {
      appenders: ["console", "error"],
      level: "error"
    }
  }
})

const logger = log4js.getLogger()
const errorLogger = log4js.getLogger("error")

module.exports = {
  info: (message) => logger.info(message),
  error: (message) => errorLogger.error(message),
  warn: (message) => logger.warn(message),
  debug: (message) => logger.debug(message)
}
```

### 日志中间件

```javascript
// middlewares/logger.js
const { info } = require("../utils/logger")

const loggerMiddleware = async (ctx, next) => {
  const start = Date.now()
  
  await next()
  
  const responseTime = Date.now() - start
  
  info({
    method: ctx.method,
    url: ctx.url,
    status: ctx.status,
    responseTime: `${responseTime}ms`,
    ip: ctx.ip,
    userAgent: ctx.header["user-agent"]
  })
}

module.exports = loggerMiddleware
```

---

## 错误处理机制

### 全局错误处理

```javascript
// middlewares/error-handler.js
const { error } = require("../utils/logger")

const errorHandler = async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    // 记录错误日志
    error({
      message: err.message,
      stack: err.stack,
      url: ctx.url,
      method: ctx.method,
      body: ctx.request.body
    })
    
    // 设置响应状态码
    ctx.status = err.status || err.statusCode || 500
    
    // 开发环境返回详细错误信息
    const isDev = process.env.NODE_ENV === "development"
    
    ctx.body = {
      code: err.code || -1,
      message: err.message || "服务器内部错误",
      ...(isDev && {
        stack: err.stack,
        details: err.details
      })
    }
  }
}

// 自定义错误类
class AppError extends Error {
  constructor(message, code = -1, status = 400) {
    super(message)
    this.code = code
    this.status = status
  }
}

class ValidationError extends AppError {
  constructor(message, details = []) {
    super(message, -1, 400)
    this.details = details
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "未授权") {
    super(message, 401, 401)
  }
}

class ForbiddenError extends AppError {
  constructor(message = "禁止访问") {
    super(message, 403, 403)
  }
}

class NotFoundError extends AppError {
  constructor(message = "资源不存在") {
    super(message, 404, 404)
  }
}

module.exports = {
  errorHandler,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError
}
```

### 使用示例

```javascript
// app.js
const Koa = require("koa")
const { errorHandler, NotFoundError } = require("./middlewares/error-handler")

const app = new Koa()

// 注册错误处理中间件（放在最前面）
app.use(errorHandler)

// 业务路由
router.get("/api/user/:id", async (ctx) => {
  const user = await User.findById(ctx.params.id)
  
  if (!user) {
    throw new NotFoundError("用户不存在")
  }
  
  ctx.body = { code: 0, data: user }
})

// 404处理
app.use(async (ctx) => {
  ctx.status = 404
  ctx.body = { code: 404, message: "接口不存在" }
})
```

---

## API 文档生成

### 使用 Swagger

```bash
npm install koa2-swagger-ui
```

```javascript
// config/swagger.js
module.exports = {
  swaggerOptions: {
    url: "/api-docs"
  }
}
```

```javascript
// app.js
const Koa = require("koa")
const Router = require("@koa/router")
const swaggerUI = require("koa2-swagger-ui").koaSwagger
const yamljs = require("yamljs")

const app = new Koa()
const router = new Router()

// API文档路由
router.get("/api-docs", (ctx) => {
  ctx.body = yamljs.load("./docs/swagger.yaml")
})

// Swagger UI
app.use(
  swaggerUI({
    routePrefix: "/swagger",
    swaggerOptions: {
      url: "/api-docs"
    }
  })
)

app.use(router.routes())
```

---

## 性能优化

### 压缩响应

```bash
npm install koa-compress
```

```javascript
const compress = require("koa-compress")

app.use(
  compress({
    filter: (contentType) => {
      return /text|json|javascript|css/i.test(contentType)
    },
    threshold: 1024,
    gzip: {
      flush: require("zlib").constants.Z_SYNC_FLUSH
    }
  })
)
```

### 静态资源缓存

```javascript
const static = require("koa-static")

app.use(
  static(path.join(__dirname, "public"), {
    maxage: 30 * 24 * 60 * 60 * 1000, // 30天
    gzip: true
  })
)
```

### 响应时间优化

```javascript
// 添加响应时间头
app.use(async (ctx, next) => {
  const start = Date.now()
  await next()
  const ms = Date.now() - start
  ctx.set("X-Response-Time", `${ms}ms`)
})
```

---

## 部署方案

### PM2 部署

```bash
npm install -g pm2
```

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: "koa-app",
      script: "./app.js",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 4000
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 4000
      }
    }
  ]
}
```

```bash
# 启动
pm2 start ecosystem.config.js

# 重启
pm2 restart koa-app

# 停止
pm2 stop koa-app

# 查看日志
pm2 logs koa-app

# 监控
pm2 monit
```

### Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 4000

CMD ["node", "app.js"]
```

```yaml
# docker-compose.yml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
      - REDIS_HOST=redis
    depends_on:
      - mysql
      - redis

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: 123456
      MYSQL_DATABASE: koadb
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:alpine
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

---

## 埋点搜集服务器实战

埋点（Tracking/Analytics）是前端监控系统的重要组成部分，用于采集用户行为数据（如页面访问、按钮点击等）。以下通过一个简易的埋点收集服务器，展示 Koa + koa-router + lowdb 的组合实战。

### 安装依赖

```bash
# lowdb 需固定为 v1（v3+ 已改为 ESM 且 API 不同，下例使用 v1 API）
npm i koa koa-router lowdb@1 -S
```

### 完整实现

```javascript
// server.js
const Koa = require('koa')
const path = require('path')
const Router = require('koa-router')
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')

// 创建 Koa 服务实例
const app = new Koa()
// 创建路由实例
const router = new Router()
// 创建数据库实例（lowdb 以 JSON 文件模拟数据库）
const adapter = new FileSync(path.resolve(__dirname, './db.json'))
const db = low(adapter)

// 初始化数据库结构
db.defaults({ visits: [], count: 0 }).write()

// 埋点收集路由
router.get('/', async (ctx, next) => {
  const ip = ctx.header['x-real-ip'] || ''
  const { user, page, action } = ctx.query

  // 更新数据库
  db.get('visits').push({ ip, user, page, action }).write()
  db.update('count', n => n + 1).write()

  // 返回更新后的统计数据
  ctx.body = { success: 1, visits: db.get('count').value() }
})

// 注册路由中间件
app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(7000)
```

### 启动与验证

启动服务后，可通过浏览器或 curl 发送请求：

```bash
# 启动服务
node server.js

# 发送埋点请求
curl http://localhost:7000/?user=a&page=1&action=click

# 多次请求后，db.json 数据示例：
# {
#   "visits": [
#     { "ip": "", "user": "a", "page": "1", "action": "click" },
#     { "ip": "", "user": "a", "page": "1", "action": "click" }
#   ],
#   "count": 2
# }
```

### 技术要点解析

| 要点 | 说明 |
|------|------|
| **路由中间件** | 使用 koa-router 定义 GET 路由处理埋点请求，`ctx.query` 解析查询参数 |
| **数据存储** | lowdb 以 JSON 文件模拟数据库，适合开发与原型验证，生产环境应替换为 MongoDB/MySQL |
| **IP 获取** | 通过 `ctx.header['x-real-ip']` 获取客户端真实 IP（需反向代理配合） |
| **响应格式** | 统一返回 `{ success, visits }` JSON 结构，便于前端解析 |

### 生产环境演进建议

上述示例使用 lowdb 仅适合开发与演示。在生产环境中，需要从以下方面进行演进：

1. **数据存储替换**：将 lowdb 替换为 MongoDB 或 MySQL，支持高并发写入和持久化
2. **请求方式优化**：将 GET 改为 POST，支持更丰富的埋点数据结构，避免 URL 长度限制
3. **请求体解析**：引入 koa-bodyparser 解析 JSON 请求体
4. **集群化部署**：结合 Node.js cluster 模块提升负载能力
5. **数据清洗与聚合**：在存储前对埋点数据进行去重、清洗和聚合处理

---

## 常见问题解答

### 1. 如何处理跨域问题？

使用 `@koa/cors` 中间件：

```javascript
const cors = require("@koa/cors")

app.use(
  cors({
    origin: (ctx) => {
      const allowedOrigins = ["https://example.com", "http://localhost:3000"]
      const requestOrigin = ctx.header.origin
      
      if (allowedOrigins.includes(requestOrigin)) {
        return requestOrigin
      }
      return false
    },
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowHeaders: ["Content-Type", "Authorization"]
  })
)
```

### 2. 如何实现请求限流？

```javascript
// middlewares/rate-limit.js
const CacheUtil = require("../utils/cache")

const rateLimit = (limit = 100, windowMs = 60000) => {
  return async (ctx, next) => {
    const key = `rate-limit:${ctx.ip}`
    const requests = await CacheUtil.get(key)
    
    if (requests && requests >= limit) {
      ctx.status = 429
      ctx.body = { code: -1, message: "请求过于频繁，请稍后再试" }
      return
    }
    
    if (requests) {
      await CacheUtil.set(key, requests + 1)
    } else {
      await CacheUtil.set(key, 1, Math.floor(windowMs / 1000))
    }
    
    await next()
  }
}

module.exports = rateLimit
```

### 3. 如何优雅关闭服务？

```javascript
const Koa = require("koa")
const app = new Koa()

const server = app.listen(4000)

// 优雅关闭
process.on("SIGTERM", () => {
  console.log("收到 SIGTERM 信号，开始优雅关闭...")
  
  server.close(() => {
    console.log("服务器已关闭")
    process.exit(0)
  })
  
  // 强制关闭超时
  setTimeout(() => {
    console.error("强制关闭")
    process.exit(1)
  }, 10000)
})
```

### 4. 如何实现统一的响应格式？

```javascript
// utils/response.js
class Response {
  static success(ctx, data = null, message = "操作成功") {
    ctx.body = {
      code: 0,
      message,
      data,
      timestamp: Date.now()
    }
  }

  static error(ctx, message = "操作失败", code = -1, status = 400) {
    ctx.status = status
    ctx.body = {
      code,
      message,
      data: null,
      timestamp: Date.now()
    }
  }

  static paginate(ctx, list, total, page, pageSize) {
    ctx.body = {
      code: 0,
      message: "查询成功",
      data: {
        list,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / pageSize)
      },
      timestamp: Date.now()
    }
  }
}

module.exports = Response
```

### 5. 如何防止 SQL 注入？

- 使用参数化查询（推荐）
- 使用 ORM 框架
- 对用户输入进行验证和过滤

```javascript
// 正确做法：参数化查询
const [rows] = await pool.execute(
  "SELECT * FROM users WHERE id = ?",
  [userId]
)

// 错误做法：字符串拼接（有注入风险）
const [rows] = await pool.execute(
  `SELECT * FROM users WHERE id = ${userId}`
)
```

### 6. 如何处理大文件上传？

```javascript
// 使用流式上传
const fs = require("fs")
const path = require("path")

router.post("/upload/large", async (ctx) => {
  const file = ctx.request.files.file
  const reader = fs.createReadStream(file.filepath)
  const writer = fs.createWriteStream(
    path.join(__dirname, "uploads", file.newFilename)
  )
  
  reader.pipe(writer)
  
  ctx.body = {
    code: 0,
    message: "上传成功"
  }
})
```

### 7. 如何实现 WebSocket？

```bash
npm install ws
```

```javascript
const WebSocket = require("ws")
const http = require("http")
const Koa = require("koa")

const app = new Koa()
const server = http.createServer(app.callback())
const wss = new WebSocket.Server({ server })

wss.on("connection", (ws) => {
  console.log("客户端已连接")
  
  ws.on("message", (message) => {
    console.log("收到消息:", message)
    ws.send(`服务器收到: ${message}`)
  })
  
  ws.on("close", () => {
    console.log("客户端已断开")
  })
})

server.listen(4000)
```

---

## 最佳实践总结

| 类别 | 建议 |
|------|------|
| 项目结构 | 采用分层架构，职责分离清晰 |
| 路由管理 | 按业务模块分割，使用 RESTful 规范 |
| 参数验证 | 入口统一验证，防止非法参数 |
| 错误处理 | 全局捕获，分类处理，记录日志 |
| 鉴权安全 | 使用成熟方案（JWT/OAuth2），敏感数据加密 |
| 数据库 | 使用连接池，事务处理，防注入 |
| 缓存策略 | 热点数据缓存，合理设置过期时间 |
| 日志管理 | 分级记录，便于排查问题 |
| 性能优化 | 开启压缩，静态资源缓存，响应时间监控 |
| 部署运维 | 使用 PM2 集群模式，Docker 容器化，健康检查 |

---

## 相关资源

- [Koa 官方文档](https://koajs.com/)
- [@koa/router 文档](https://github.com/koajs/router)
- [Sequelize ORM](https://sequelize.org/)
- [Mongoose 文档](https://mongoosejs.com/)
- [JWT 官网](https://jwt.io/)
