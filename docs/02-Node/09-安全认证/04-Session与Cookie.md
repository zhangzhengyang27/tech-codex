---
title: Session与Cookie
description: 在 Web 应用中，Session 和 Cookie 是实现用户会话管理的两种主要方式。理解它们的工作原理和安全配置对于构建安全的认证系统至关重要。
keywords: [Node.js, 安全认证, Session, Cookie]
category: Node.js
tags: [Node.js, 安全认证]
---
# Session与Cookie








## Session 与 Cookie 会话管理

在 Web 应用中，Session 和 Cookie 是实现用户会话管理的两种主要方式。理解它们的工作原理和安全配置对于构建安全的认证系统至关重要。

### 会话管理架构

#### 整体架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                            客户端（浏览器）                           │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      Cookie 存储                               │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │  │
│  │  │ Session ID  │  │  用户偏好   │  │  访问令牌   │           │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘           │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                          HTTP 请求携带 Cookie
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            服务端（Node.js）                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    会话中间件层                                 │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │  │
│  │  │ Cookie 解析 │→│ Session 验证│→│ 权限检查    │           │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘           │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                    │                                 │
│                                    ▼                                 │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Session 存储层                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │  │
│  │  │   Redis     │  │   MySQL     │  │  MongoDB    │           │  │
│  │  │  (推荐)     │  │             │  │             │           │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘           │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

#### 认证流程图

```
┌────────┐                                           ┌────────┐
│ 客户端 │                                           │ 服务端 │
└───┬────┘                                           └───┬────┘
    │                                                     │
    │  1. POST /login (username, password)                │
    │────────────────────────────────────────────────────>│
    │                                                     │
    │                                         2. 验证用户凭证
    │                                         3. 创建 Session
    │                                         4. 生成 Session ID
    │                                                     │
    │  5. Set-Cookie: sessionId=xxx; HttpOnly; Secure     │
    │<────────────────────────────────────────────────────│
    │                                                     │
    │  6. GET /profile                                    │
    │     Cookie: sessionId=xxx                           │
    │────────────────────────────────────────────────────>│
    │                                                     │
    │                                         7. 验证 Session ID
    │                                         8. 获取 Session 数据
    │                                                     │
    │  9. 返回用户信息                                     │
    │<────────────────────────────────────────────────────│
    │                                                     │
    │  10. POST /logout                                   │
    │────────────────────────────────────────────────────>│
    │                                                     │
    │                                         11. 销毁 Session
    │                                         12. 清除 Cookie
    │                                                     │
    │  13. Set-Cookie: sessionId=; Max-Age=0              │
    │<────────────────────────────────────────────────────│
    │                                                     │
```

### Cookie 基础

#### 什么是 Cookie

Cookie 是服务器发送到用户浏览器并保存在本地的小型数据片段。浏览器会在后续请求中自动携带 Cookie，从而实现状态的保持。

**Cookie 的特点：**
- 大小限制：单个 Cookie 通常不超过 4KB
- 数量限制：每个域名通常不超过 20-50 个 Cookie
- 自动携带：浏览器自动在同域请求中携带 Cookie
- 可配置属性：支持多种安全和功能属性

#### Cookie 属性详解

| 属性 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `name`/`value` | string | Cookie 名称和值 | `sessionId=abc123` |
| `maxAge` | number | 过期时间（毫秒），优先于 expires | `maxAge: 86400000` |
| `expires` | Date | 过期日期 | `expires: new Date('2024-12-31')` |
| `httpOnly` | boolean | 仅 HTTP 访问，防止 XSS 窃取 | `httpOnly: true` |
| `secure` | boolean | 仅 HTTPS 传输 | `secure: true` |
| `sameSite` | string | CSRF 防护，控制跨站发送 | `sameSite: 'strict'` |
| `domain` | string | 作用域名 | `domain: '.example.com'` |
| `path` | string | 作用路径 | `path: '/admin'` |
| `signed` | boolean | Cookie 签名防篡改 | `signed: true` |
| `priority` | string | Cookie 优先级（Chrome） | `priority: 'high'` |

#### Cookie 操作 API

```javascript
const express = require('express')
const cookieParser = require('cookie-parser')

const app = express()

// Cookie 解析中间件
app.use(cookieParser(process.env.COOKIE_SECRET))

// ==================== 设置 Cookie ====================

// 基本设置
app.get('/set-cookie', (req, res) => {
  res.cookie('name', 'value', {
    maxAge: 900000,        // 15分钟过期
    httpOnly: true,        // 防止 JavaScript 访问
    secure: true,          // 仅 HTTPS
    sameSite: 'strict'     // 严格的 CSRF 防护
  })
  res.send('Cookie 已设置')
})

// 不同类型的 Cookie 设置
app.get('/set-cookies', (req, res) => {
  // 会话 Cookie（浏览器关闭后删除）
  res.cookie('sessionToken', 'temp-token')
  
  // 持久化 Cookie（指定过期时间）
  res.cookie('preferences', JSON.stringify({ theme: 'dark' }), {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30天
    httpOnly: false // 允许 JavaScript 读取
  })
  
  // 签名 Cookie（防篡改）
  res.cookie('userId', '12345', {
    signed: true,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  })
  
  // 跨子域名 Cookie
  res.cookie('sharedData', 'value', {
    domain: '.example.com', // 所有子域名共享
    path: '/'
  })
  
  res.json({ success: true })
})

// ==================== 读取 Cookie ====================

app.get('/get-cookie', (req, res) => {
  // 读取普通 Cookie
  const name = req.cookies.name
  
  // 读取签名 Cookie（自动验证签名）
  const userId = req.signedCookies.userId
  
  // 检查 Cookie 是否存在
  if (!req.signedCookies.userId) {
    return res.status(400).json({ error: '无效的 Cookie' })
  }
  
  res.json({
    name,
    userId,
    allCookies: req.cookies,
    allSignedCookies: req.signedCookies
  })
})

// ==================== 删除 Cookie ====================

app.get('/clear-cookie', (req, res) => {
  // 删除单个 Cookie
  res.clearCookie('name')
  
  // 删除时需要匹配 domain 和 path
  res.clearCookie('sharedData', {
    domain: '.example.com',
    path: '/'
  })
  
  res.json({ success: true })
})

// ==================== Cookie 工具函数 ====================

// 安全设置 Cookie 的封装函数
function setAuthCookie(res, name, value, options = {}) {
  const defaultOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    ...options
  }
  
  res.cookie(name, value, defaultOptions)
}

// 设置刷新令牌（长期有效）
function setRefreshTokenCookie(res, token) {
  setAuthCookie(res, 'refreshToken', token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    path: '/auth/refresh' // 仅在刷新接口发送
  })
}

// 设置访问令牌（短期有效）
function setAccessTokenCookie(res, token) {
  setAuthCookie(res, 'accessToken', token, {
    maxAge: 15 * 60 * 1000 // 15分钟
  })
}
```

#### Cookie 安全威胁与防护

**1. XSS 窃取 Cookie**

```javascript
// ❌ 危险：未设置 httpOnly
res.cookie('sessionId', 'xxx', {
  httpOnly: false // JavaScript 可以通过 document.cookie 读取
})

// ✅ 安全：设置 httpOnly
res.cookie('sessionId', 'xxx', {
  httpOnly: true // 防止 XSS 窃取
})
```

**2. 中间人攻击**

```javascript
// ❌ 危险：未加密传输
res.cookie('sessionId', 'xxx', {
  secure: false // HTTP 明文传输，可被窃听
})

// ✅ 安全：强制 HTTPS
res.cookie('sessionId', 'xxx', {
  secure: true // 仅 HTTPS 传输
})
```

**3. CSRF 攻击**

```javascript
// ❌ 危险：无 CSRF 防护
res.cookie('sessionId', 'xxx')

// ✅ 安全：SameSite 属性
res.cookie('sessionId', 'xxx', {
  sameSite: 'strict' // 完全禁止跨站发送
})

// sameSite 值对比
// 'strict' - 完全禁止跨站发送（最安全，可能影响用户体验）
// 'lax'    - 允许顶级导航的 GET 请求携带（推荐）
// 'none'   - 允许跨站发送（需配合 secure: true）
```

**4. Cookie 篡改**

```javascript
// ❌ 危险：未签名的 Cookie
res.cookie('userId', '12345') // 可被用户篡改

// ✅ 安全：签名 Cookie
app.use(cookieParser(process.env.COOKIE_SECRET))
res.cookie('userId', '12345', { signed: true })

// 读取时自动验证签名
const userId = req.signedCookies.userId // 篡改后返回 false
```

### Session 基础

#### 什么是 Session

Session 是服务器端存储的会话数据，通过 Session ID 与客户端关联。Session ID 通常通过 Cookie 传递给客户端。

**Session 与 Cookie 的关系：**

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Cookie: sessionId = "abc123def456"                 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                    HTTP 请求携带 Cookie
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        服务端                                │
│  ┌────────────────────┐    ┌────────────────────────────┐  │
│  │ Session Store      │    │ Session Data               │  │
│  │ (Redis/Memory/DB)  │    │ {                          │  │
│  │                    │    │   userId: "12345",         │  │
│  │ sessionId → Data   │    │   username: "john",        │  │
│  │                    │    │   role: "admin",           │  │
│  │ abc123 → {...}     │    │   createdAt: "2024-01-01"  │  │
│  │ def456 → {...}     │    │ }                          │  │
│  └────────────────────┘    └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

#### Session 工作流程

```
1. 客户端首次访问
   ↓
2. 服务器创建 Session，生成 Session ID
   ↓
3. 服务器通过 Set-Cookie 返回 Session ID
   ↓
4. 客户端保存 Session ID 到 Cookie
   ↓
5. 后续请求自动携带 Session ID
   ↓
6. 服务器根据 Session ID 查找 Session 数据
```

### Session 存储方案

#### 存储方案对比

| 存储方案 | 优点 | 缺点 | 适用场景 |
|---------|------|------|---------|
| 内存存储 | 简单、快速 | 重启丢失、无法扩展 | 开发环境 |
| Redis | 高性能、分布式、持久化 | 需要额外部署 | **生产环境推荐** |
| MySQL | 数据持久化、易管理 | 性能较低 | 中小型应用 |
| MongoDB | 灵活、高性能 | 需要 MongoDB | 已有 MongoDB 的项目 |

#### 1. 内存存储

适合开发环境，不适合生产环境（重启丢失、无法多进程共享）。

```javascript
const session = require('express-session')

// 基本配置
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 开发环境
    maxAge: 24 * 60 * 60 * 1000
  }
}))

// 完整示例
app.get('/login', (req, res) => {
  req.session.userId = '12345'
  req.session.username = 'john'
  req.session.role = 'admin'
  res.send('登录成功')
})

app.get('/profile', (req, res) => {
  if (req.session.userId) {
    res.json({
      userId: req.session.userId,
      username: req.session.username,
      role: req.session.role
    })
  } else {
    res.status(401).send('未登录')
  }
})

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('登出失败')
    }
    res.clearCookie('connect.sid')
    res.send('登出成功')
  })
})
```

#### 2. Redis 存储（推荐）

生产环境推荐，支持分布式、持久化。

```javascript
const session = require('express-session')
const RedisStore = require('connect-redis').default
const redis = require('redis')

// ==================== Redis 客户端配置 ====================

// 创建 Redis 客户端
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    reconnectStrategy: (retries) => {
      // 重连策略
      if (retries > 10) {
        console.error('Redis 连接失败次数过多')
        return new Error('Redis 连接失败')
      }
      return Math.min(retries * 100, 3000) // 重连延迟
    }
  },
  password: process.env.REDIS_PASSWORD,
  database: process.env.REDIS_DB || 0
})

redisClient.on('error', err => {
  console.error('Redis 错误:', err)
})

redisClient.on('connect', () => {
  console.log('Redis 已连接')
})

// 连接 Redis
redisClient.connect().catch(console.error)

// ==================== Session 配置 ====================

app.use(session({
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:',           // Session 键前缀
    ttl: 24 * 60 * 60,         // 过期时间（秒）
    disableTouch: false        // 允许刷新过期时间
  }),
  secret: process.env.SESSION_SECRET,
  name: 'sessionId',          // 自定义 Cookie 名称
  resave: false,              // 不强制重新保存
  saveUninitialized: false,   // 不保存未初始化的 Session
  rolling: true,              // 每次请求刷新过期时间
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000, // 24小时
    domain: process.env.COOKIE_DOMAIN
  }
}))

// ==================== Session 操作 ====================

// 登录
app.post('/login', async (req, res) => {
  const { username, password } = req.body
  
  // 验证用户
  const user = await verifyUser(username, password)
  
  if (user) {
    // 登录后重新生成 Session ID（防止固定攻击）
    req.session.regenerate(err => {
      if (err) {
        return res.status(500).json({ error: '登录失败' })
      }
      
      req.session.userId = user.id
      req.session.username = user.username
      req.session.role = user.role
      req.session.loginTime = new Date().toISOString()
      req.session.ipAddress = req.ip
      
      res.json({ 
        success: true, 
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      })
    })
  } else {
    res.status(401).json({ error: '用户名或密码错误' })
  }
})

// 获取 Session 信息
app.get('/session-info', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '未登录' })
  }
  
  res.json({
    userId: req.session.userId,
    username: req.session.username,
    role: req.session.role,
    loginTime: req.session.loginTime,
    sessionId: req.sessionID
  })
})

// 更新 Session 数据
app.put('/session', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: '未登录' })
  }
  
  // 更新部分数据
  if (req.body.preferences) {
    req.session.preferences = req.body.preferences
  }
  
  res.json({ success: true })
})

// 登出
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: '登出失败' })
    }
    res.clearCookie('sessionId')
    res.json({ success: true, message: '登出成功' })
  })
})

// 优雅关闭
process.on('SIGTERM', async () => {
  await redisClient.quit()
  process.exit(0)
})
```

#### 3. 数据库存储

使用 MySQL 或 MongoDB 存储 Session。

```javascript
// ==================== MongoDB 存储 ====================

const MongoStore = require('connect-mongo')

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,           // 过期时间（秒）
    autoRemove: 'native',         // 自动删除过期 Session
    autoRemoveInterval: 10,       // 清理间隔（分钟）
    touchAfter: 24 * 3600         // 更新间隔（秒）
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}))

// ==================== MySQL 存储 ====================

const MySQLStore = require('express-mysql-session')(session)

const options = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  clearExpired: true,           // 自动清理过期 Session
  checkExpirationInterval: 900000, // 检查间隔（毫秒）
  expiration: 86400000,          // 过期时间（毫秒）
  createDatabaseTable: true,     // 自动创建表
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
}

const sessionStore = new MySQLStore(options)

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}))
```

### Session API 接口说明

#### 完整认证 API 示例

```javascript
const express = require('express')
const session = require('express-session')
const bcrypt = require('bcrypt')
const { body, validationResult } = require('express-validator')

const app = express()
app.use(express.json())

// Session 中间件（示例使用默认 MemoryStore，生产环境请参考上文换用 Redis）
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'strict' }
}))

// ==================== 用户模型 ====================

// 模拟用户数据库
const users = new Map()

// ==================== 验证中间件 ====================

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ 
      error: '未授权',
      code: 'UNAUTHORIZED'
    })
  }
  next()
}

// ==================== 认证接口 ====================

/**
 * @route   POST /api/auth/register
 * @desc    用户注册
 * @access  Public
 */
app.post('/api/auth/register',
  [
    body('username').trim().isLength({ min: 3, max: 30 }),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 })
  ],
  validate,
  async (req, res) => {
    const { username, email, password } = req.body
    
    // 检查用户是否存在
    if (users.has(email)) {
      return res.status(409).json({ error: '用户已存在' })
    }
    
    // 创建用户
    const hashedPassword = await bcrypt.hash(password, 12)
    const user = {
      id: Date.now().toString(),
      username,
      email,
      password: hashedPassword,
      createdAt: new Date()
    }
    
    users.set(email, user)
    
    res.status(201).json({
      success: true,
      message: '注册成功'
    })
  }
)

/**
 * @route   POST /api/auth/login
 * @desc    用户登录
 * @access  Public
 */
app.post('/api/auth/login',
  [
    body('email').isEmail(),
    body('password').notEmpty()
  ],
  validate,
  async (req, res) => {
    const { email, password } = req.body
    
    const user = users.get(email)
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: '邮箱或密码错误' })
    }
    
    // 重新生成 Session ID
    req.session.regenerate(err => {
      if (err) {
        return res.status(500).json({ error: '登录失败' })
      }
      
      req.session.userId = user.id
      req.session.username = user.username
      req.session.email = user.email
      
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      })
    })
  }
)

/**
 * @route   GET /api/auth/me
 * @desc    获取当前用户信息
 * @access  Private
 */
app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    user: {
      id: req.session.userId,
      username: req.session.username,
      email: req.session.email
    }
  })
})

/**
 * @route   POST /api/auth/logout
 * @desc    用户登出
 * @access  Private
 */
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: '登出失败' })
    }
    res.clearCookie('sessionId')
    res.json({ success: true })
  })
})

/**
 * @route   POST /api/auth/logout-all
 * @desc    登出所有设备
 * @access  Private
 */
app.post('/api/auth/logout-all', requireAuth, async (req, res) => {
  // express-session 的 MemoryStore 无法按用户枚举 Session；
  // 生产环境应在 Redis 中维护 user → sessions 索引并逐一删除，
  // 可参考上文"多设备登录控制"一节。这里销毁当前 Session 作为兜底。
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: '操作失败' })
    }
    res.clearCookie('sessionId')
    res.json({ success: true, message: '已登出所有设备' })
  })
})
```

### Session 配置参数详解

#### express-session 完整配置

```javascript
const session = require('express-session')

app.use(session({
  // ==================== 核心参数 ====================
  
  // 签名密钥（必须配置）
  // 支持数组形式，用于密钥轮换
  secret: process.env.SESSION_SECRET || ['key1', 'key2'],
  
  // Session ID Cookie 名称（默认: connect.sid）
  // 建议修改以隐藏技术栈
  name: 'sessionId',
  
  // ==================== 存储相关 ====================
  
  // Session 存储实例（默认: MemoryStore）
  store: new RedisStore({ client: redisClient }),
  
  // Session ID 生成函数
  genid: (req) => {
    return require('crypto').randomUUID()
  },
  
  // ==================== 行为控制 ====================
  
  // 是否在每次请求时强制保存 Session
  // 建议 false，避免不必要的存储操作
  resave: false,
  
  // 是否保存未初始化的 Session
  // 建议 false，减少存储空间
  saveUninitialized: false,
  
  // 是否在每次请求时重置 Cookie 过期时间
  // 实现"滑动过期"
  rolling: true,
  
  // req.session 被置空时的行为：
  // 'destroy' 删除并重新生成，'keep' 保留（默认 'keep'）
  unset: 'destroy',
  
  // ==================== 安全相关 ====================
  
  // 代理设置（用于反向代理）
  proxy: true,
  
  // Cookie 配置
  cookie: {
    // 是否仅 HTTPS（生产环境必须 true）
    secure: process.env.NODE_ENV === 'production',
    
    // 是否仅 HTTP（防止 XSS）
    httpOnly: true,
    
    // 同站策略（防止 CSRF）
    sameSite: 'strict', // 或 'lax', 'none'
    
    // 过期时间（毫秒）
    maxAge: 24 * 60 * 60 * 1000, // 24小时
    
    // 作用域名
    domain: process.env.COOKIE_DOMAIN,
    
    // 作用路径
    path: '/',
    
    // 过期日期（优先级低于 maxAge）
    // expires: new Date(Date.now() + 86400000)
  }
}))
```

#### 配置参数说明表

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `secret` | string/string[] | 必填 | Session 签名密钥 |
| `name` | string | 'connect.sid' | Cookie 名称 |
| `store` | Store | MemoryStore | Session 存储实例 |
| `genid` | function | uid-safe | Session ID 生成函数 |
| `resave` | boolean | true | 强制保存 Session |
| `saveUninitialized` | boolean | true | 保存未初始化 Session |
| `rolling` | boolean | false | 重置 Cookie 过期时间 |
| `unset` | string | 'keep' | Session 删除行为 |
| `proxy` | boolean | - | 信任反向代理 |
| `cookie` | object | 见下表 | Cookie 配置 |

#### Cookie 配置说明表

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `maxAge` | number | null | 过期时间（毫秒） |
| `expires` | Date | null | 过期日期 |
| `secure` | boolean | false | 仅 HTTPS |
| `httpOnly` | boolean | true | 仅 HTTP 访问 |
| `sameSite` | boolean/string | false | 同站策略 |
| `domain` | string | null | 作用域名 |
| `path` | string | '/' | 作用路径 |

### Session 安全配置

#### 1. Session ID 安全生成

```javascript
const crypto = require('crypto')

app.use(session({
  secret: process.env.SESSION_SECRET,
  // 使用加密安全的随机 ID
  genid: (req) => {
    // 方案1: UUID v4
    return crypto.randomUUID()
    
    // 方案2: 随机字节
    // return crypto.randomBytes(32).toString('hex')
    
    // 方案3: 基于时间戳 + 随机数
    // return `${Date.now()}-${crypto.randomBytes(16).toString('hex')}`
  },
  // ...
}))
```

#### 2. Session 固定攻击防护

Session 固定攻击是攻击者获取 Session ID 后，诱导受害者使用该 ID 登录。

```javascript
// 登录时必须重新生成 Session ID
app.post('/login', async (req, res) => {
  const { username, password } = req.body
  const user = await verifyUser(username, password)
  
  if (user) {
    // ✅ 登录后重新生成 Session ID
    req.session.regenerate(err => {
      if (err) {
        return res.status(500).json({ error: '登录失败' })
      }
      
      // 设置用户数据
      req.session.userId = user.id
      req.session.username = user.username
      
      res.json({ success: true })
    })
  } else {
    res.status(401).json({ error: '认证失败' })
  }
})

// 权限升级时也要重新生成
app.post('/admin/upgrade', requireAuth, (req, res) => {
  // 权限变更时重新生成 Session ID（regenerate 会清空旧数据，需先取出再回填）
  const userId = req.session.userId
  req.session.regenerate(err => {
    if (err) {
      return res.status(500).json({ error: '操作失败' })
    }
    
    req.session.userId = userId
    req.session.role = 'admin'
    
    res.json({ success: true })
  })
})
```

#### 3. Session 过期管理

```javascript
// ==================== 滑动过期 ====================

app.use(session({
  secret: process.env.SESSION_SECRET,
  rolling: true, // 每次请求刷新 Cookie 过期时间
  cookie: {
    maxAge: 30 * 60 * 1000, // 30 分钟
    secure: true,
    httpOnly: true
  }
}))

// ==================== 绝对过期 ====================

app.use((req, res, next) => {
  if (req.session) {
    const now = Date.now()
    const createdAt = req.session.createdAt || now
    const absoluteTimeout = 8 * 60 * 60 * 1000 // 8小时绝对过期
    
    if (now - createdAt > absoluteTimeout) {
      return req.session.destroy(() => {
        res.status(401).json({ 
          error: 'Session 已过期，请重新登录',
          code: 'SESSION_EXPIRED'
        })
      })
    }
    
    // 记录创建时间
    if (!req.session.createdAt) {
      req.session.createdAt = now
    }
  }
  next()
})

// ==================== 空闲超时 ====================

app.use((req, res, next) => {
  if (req.session) {
    const now = Date.now()
    const lastActivity = req.session.lastActivity || now
    const inactiveTimeout = 30 * 60 * 1000 // 30分钟无活动
    
    if (now - lastActivity > inactiveTimeout) {
      return req.session.destroy(() => {
        res.status(401).json({ 
          error: '长时间未活动，请重新登录',
          code: 'INACTIVE_TIMEOUT'
        })
      })
    }
    
    req.session.lastActivity = now
  }
  next()
})
```

#### 4. 多设备登录控制

```javascript
const redis = require('redis')
const client = redis.createClient()

// ==================== 单设备登录 ====================

app.post('/login', async (req, res) => {
  const { username, password } = req.body
  const user = await verifyUser(username, password)
  
  if (user) {
    // 检查是否已有登录 Session
    const existingSessionId = await client.get(`user:${user.id}:session`)
    
    if (existingSessionId) {
      // 删除旧 Session
      await client.del(`sess:${existingSessionId}`)
    }
    
    req.session.regenerate(async err => {
      if (err) {
        return res.status(500).json({ error: '登录失败' })
      }
      
      req.session.userId = user.id
      req.session.username = user.username
      
      // 保存 Session 映射（node-redis v4 需用对象形式传过期选项）
      await client.set(
        `user:${user.id}:session`,
        req.sessionID,
        { EX: 24 * 60 * 60 }
      )
      
      res.json({ success: true })
    })
  } else {
    res.status(401).json({ error: '认证失败' })
  }
})

// ==================== 多设备管理 ====================

// 获取所有登录设备
app.get('/sessions', requireAuth, async (req, res) => {
  const userId = req.session.userId
  
  // 获取用户的所有 Session
  const sessionIds = await client.sMembers(`user:${userId}:sessions`)
  const sessions = []
  
  for (const sid of sessionIds) {
    const data = await client.get(`sess:${sid}`)
    if (data) {
      const session = JSON.parse(data)
      sessions.push({
        sessionId: sid.substring(0, 8) + '...',
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        lastActivity: session.lastActivity,
        current: sid === req.sessionID
      })
    }
  }
  
  res.json({ sessions })
})

// 登出指定设备
app.delete('/sessions/:sessionId', requireAuth, async (req, res) => {
  const { sessionId } = req.params
  const userId = req.session.userId
  
  // 验证 Session 属于当前用户
  const isMember = await client.sIsMember(`user:${userId}:sessions`, sessionId)
  
  if (!isMember) {
    return res.status(404).json({ error: 'Session 不存在' })
  }
  
  // 删除 Session
  await client.del(`sess:${sessionId}`)
  await client.sRem(`user:${userId}:sessions`, sessionId)
  
  res.json({ success: true })
})

// 登录时记录设备信息
app.post('/login', async (req, res) => {
  const user = await verifyUser(req.body.username, req.body.password)
  
  if (user) {
    req.session.regenerate(async err => {
      if (err) return res.status(500).json({ error: '登录失败' })
      
      req.session.userId = user.id
      req.session.username = user.username
      req.session.userAgent = req.get('User-Agent')
      req.session.ipAddress = req.ip
      req.session.lastActivity = Date.now()
      
      // 记录到用户的 Session 列表
      await client.sAdd(`user:${user.id}:sessions`, req.sessionID)
      await client.expire(`user:${user.id}:sessions`, 24 * 60 * 60)
      
      res.json({ success: true })
    })
  }
})
```

### 分布式 Session 方案

#### 多服务器架构

```
┌───────────┐     ┌───────────┐     ┌───────────┐
│ Server 1  │     │ Server 2  │     │ Server 3  │
│ Node.js   │     │ Node.js   │     │ Node.js   │
└─────┬─────┘     └─────┬─────┘     └─────┬─────┘
      │                 │                 │
      └────────────────┬┴─────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │     Redis      │
              │  Session Store │
              │   (共享存储)   │
              └────────────────┘
```

```javascript
// 所有服务器使用相同的 Redis 配置
const session = require('express-session')
const RedisStore = require('connect-redis').default
const redis = require('redis')

// 统一的 Redis 配置
const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST, // Redis 服务器地址
    port: process.env.REDIS_PORT
  },
  password: process.env.REDIS_PASSWORD
})

redisClient.connect()

// 所有实例使用相同的 Session 配置
app.use(session({
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:'
  }),
  secret: process.env.SESSION_SECRET, // 所有实例使用相同密钥
  name: 'sessionId',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
    domain: '.example.com' // 跨子域名共享
  }
}))
```

### 性能优化

#### 1. Session 数据优化

```javascript
// ❌ 避免在 Session 中存储大量数据
req.session.user = {
  id: '123',
  // ❌ 不要存储完整用户信息
  profile: largeUserData,
  posts: allUserPosts
}

// ✅ 只存储必要信息
req.session.userId = user.id
req.session.role = user.role

// 需要时从数据库获取完整信息
app.get('/profile', async (req, res) => {
  const user = await User.findById(req.session.userId)
  res.json(user)
})
```

#### 2. 缓存策略

```javascript
// 使用 Redis 缓存用户数据
async function getUserWithCache(userId) {
  // 先查缓存
  const cached = await redisClient.get(`user:${userId}`)
  if (cached) {
    return JSON.parse(cached)
  }
  
  // 查数据库
  const user = await User.findById(userId)
  
  // 写入缓存
  await redisClient.setEx(
    `user:${userId}`,
    3600, // 1小时
    JSON.stringify(user)
  )
  
  return user
}
```

#### 3. 连接池配置

```javascript
// Redis 连接池
const { Redis } = require('ioredis')

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  db: 0,
  // 连接池配置
  enableReadyCheck: true,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  lazyConnect: true,
  keepAlive: 10000
})
```

### Session vs JWT 对比

| 特性 | Session | JWT |
|------|---------|-----|
| 存储位置 | 服务器端 | 客户端 |
| 扩展性 | 需要共享存储 | 无状态，易扩展 |
| 安全性 | 较高（数据在服务器） | 一般（数据在客户端） |
| 性能 | 需查询存储 | 无需查询，验证签名 |
| 注销 | 立即生效 | 需额外机制（黑名单） |
| 跨域 | 需要特殊处理 | 天然支持 |
| 数据大小 | 无限制 | 受 Cookie/Header 大小限制 |
| 续期 | 简单（rolling） | 需要刷新令牌机制 |

**选择建议：**

- **使用 Session**：单体应用、传统 Web 应用、需要即时注销、敏感操作
- **使用 JWT**：微服务架构、移动应用、跨域场景、无状态 API

### 最佳实践

#### 完整配置示例

```javascript
const express = require('express')
const session = require('express-session')
const RedisStore = require('connect-redis').default
const redis = require('redis')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const crypto = require('crypto')

const app = express()

// ==================== 安全中间件 ====================

app.use(helmet())

// 速率限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: '登录尝试次数过多，请稍后重试' }
})

// ==================== Redis 连接 ====================

const redisClient = redis.createClient({
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  },
  password: process.env.REDIS_PASSWORD
})

redisClient.connect().catch(console.error)

// ==================== Session 配置 ====================

app.use(session({
  store: new RedisStore({
    client: redisClient,
    prefix: 'sess:',
    ttl: 24 * 60 * 60
  }),
  secret: process.env.SESSION_SECRET,
  name: 'sessionId',
  genid: () => crypto.randomUUID(),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
    domain: process.env.COOKIE_DOMAIN
  }
}))

// ==================== 认证中间件 ====================

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: '请先登录' })
  }
  next()
}

// ==================== 路由 ====================

app.post('/login', loginLimiter, async (req, res) => {
  // 登录逻辑
})

app.get('/protected', requireAuth, (req, res) => {
  res.json({ message: '受保护的内容' })
})

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: '登出失败' })
    res.clearCookie('sessionId')
    res.json({ success: true })
  })
})
```

### 常见问题解答

#### Q1: Session 丢失或无法保持登录状态？

**原因分析：**
1. Session 存储配置问题
2. Cookie 设置问题
3. 跨域配置问题
4. HTTPS 配置问题

**解决方案：**

```javascript
// 1. 检查 Session 存储
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false, // 确保设置为 false
  cookie: {
    // 2. 开发环境允许非 HTTPS
    secure: process.env.NODE_ENV === 'production' ? true : false,
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}))

// 3. 跨域配置
app.use(cors({
  origin: 'https://yourdomain.com',
  credentials: true // 允许携带 Cookie
}))

// 4. 代理配置（如果使用反向代理）
app.set('trust proxy', 1)
```

#### Q2: 如何实现"记住我"功能？

```javascript
app.post('/login', async (req, res) => {
  const { username, password, rememberMe } = req.body
  const user = await verifyUser(username, password)
  
  if (user) {
    req.session.regenerate(err => {
      if (err) return res.status(500).json({ error: '登录失败' })
      
      req.session.userId = user.id
      
      // 根据选择设置过期时间
      const maxAge = rememberMe 
        ? 30 * 24 * 60 * 60 * 1000  // 30天
        : 24 * 60 * 60 * 1000       // 24小时
      
      req.session.cookie.maxAge = maxAge
      
      res.json({ success: true })
    })
  }
})
```

#### Q3: 如何在集群环境中共享 Session？

```javascript
// 使用 Redis 作为共享存储
const { Redis } = require('ioredis')
const RedisStore = require('connect-redis').default

// 所有服务器实例连接到同一个 Redis
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD
})

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET, // 所有实例使用相同密钥
  cookie: {
    domain: '.example.com' // 同域名下共享 Cookie
  }
}))
```

#### Q4: 如何防止 Session 劫持？

```javascript
// 1. 绑定客户端特征
app.use((req, res, next) => {
  if (req.session.userId) {
    const fingerprint = {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    }
    
    // 首次登录记录
    if (!req.session.fingerprint) {
      req.session.fingerprint = fingerprint
    } else {
      // 验证是否一致
      if (
        req.session.fingerprint.ip !== fingerprint.ip ||
        req.session.fingerprint.userAgent !== fingerprint.userAgent
      ) {
        // 检测到异常，销毁 Session
        return req.session.destroy(() => {
          res.status(401).json({ 
            error: '检测到异常登录，请重新登录',
            code: 'SESSION_HIJACKED'
          })
        })
      }
    }
  }
  next()
})

// 2. 定期轮换 Session ID
// 注意：Session ID 无法在服务端"批量重新生成"——新 ID 需要客户端重新携带，
// 因此实际做法是在登录、提权等关键操作时调用 req.session.regenerate()，而非定时器轮询

// 3. 使用 HTTPS 和安全 Cookie
app.use(session({
  cookie: {
    secure: true,    // 仅 HTTPS
    httpOnly: true,  // 防止 JavaScript 访问
    sameSite: 'strict' // 防止跨站发送
  }
}))
```

#### Q5: Session 存储数据过大怎么办？

```javascript
// ❌ 避免存储大量数据
req.session.cart = {
  items: largeCartData, // 可能有几百KB
  history: allHistory
}

// ✅ 优化方案

// 方案1: 只存储 ID，数据存数据库
req.session.cartId = cartId

// 方案2: 使用 Redis 缓存大数据
async function getCart(sessionId) {
  // Session 只存 ID
  const cartId = await redisClient.get(`session:${sessionId}:cartId`)
  
  // 大数据单独存储
  const cart = await redisClient.get(`cart:${cartId}`)
  return JSON.parse(cart)
}

// 方案3: 分离 Session 数据
// 核心 Session 数据（小）
app.use(session({
  name: 'coreSession',
  store: new RedisStore({ client: redisClient, prefix: 'core:' }),
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}))

// 购物车 Session（大）
app.use(session({
  name: 'cartSession',
  store: new RedisStore({ client: redisClient, prefix: 'cart:' }),
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 更长过期时间
}))
```

### 参考资源

#### 官方文档

- [express-session 文档](https://www.npmjs.com/package/express-session)
- [connect-redis](https://www.npmjs.com/package/connect-redis)
- [OWASP Session Management](https://owasp.org/www-community/vulnerabilities/Improper_Session_Management)
- [MDN HTTP Cookies](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Cookies)

#### 安全指南

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [RFC 6265 - HTTP State Management Mechanism](https://datatracker.ietf.org/doc/html/rfc6265)
- [SameSite Cookies Explained](https://web.dev/samesite-cookies-explained/)

#### 相关工具

- **Session 存储**: [connect-redis](https://github.com/tj/connect-redis)、[connect-mongo](https://github.com/jdesboeufs/connect-mongo)
- **安全中间件**: [helmet](https://helmetjs.github.io/)、[csurf](https://github.com/expressjs/csurf)（已停止维护）
- **速率限制**: [express-rate-limit](https://github.com/nfriedly/express-rate-limit)
