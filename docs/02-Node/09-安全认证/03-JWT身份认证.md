---
title: 基于 JWT 的身份认证
description: JSON Web Token（JWT）是一种开放标准（RFC 7519），用于在各方之间安全地传输信息作为 JSON 对象。本文介绍 JWT 的数据结构与认证流程，演示 jsonwebtoken 在 Express、koa-jwt 在 Koa 中的签发与校验，并给出双 Token 刷新机制与安全最佳实践。
keywords: [Node.js, 安全认证, JWT]
category: Node.js
tags: [Node.js, 安全认证]
---







# 基于 JWT 的身份认证

## 概述

JSON Web Token（JWT）是一种开放标准（RFC 7519），用于在各方之间安全地传输信息作为 JSON 对象。JWT 广泛应用于身份认证和信息交换场景，特别适合分布式系统和微服务架构。

### JWT 的核心优势

- **无状态**：服务器不需要存储 session 数据，便于水平扩展
- **跨域友好**：天然支持分布式系统和跨域认证
- **自包含**：Token 本身携带用户信息，减少数据库查询
- **多端通用**：适用于 Web、移动端、小程序等多种客户端

---

## 跨域认证的问题

### 传统 Session 方案

互联网服务离不开用户认证，传统流程如下：

```
用户 → 发送用户名密码 → 服务器验证 → 保存 Session 数据 → 返回 session_id
                                    ↓
用户 ← 后续请求携带 session_id ← 服务器根据 session_id 查询用户信息
```

**具体流程：**

1. 用户向服务器发送用户名和密码
2. 服务器验证通过后，在当前对话（session）里面保存相关数据（用户角色、登录时间等）
3. 服务器向用户返回一个 session_id，写入用户的 Cookie
4. 用户随后的每一次请求，都会通过 Cookie 将 session_id 传回服务器
5. 服务器收到 session_id，找到前期保存的数据，由此得知用户的身份

### Session 方案的局限性

这种模式在**扩展性（scaling）**方面存在问题：

| 场景 | 问题 |
|------|------|
| 服务器集群 | 需要 session 数据共享，每台服务器都能读取 session |
| 跨域服务 | 不同域名之间 Cookie 无法共享 |
| 移动端应用 | 原生 App 对 Cookie 支持不佳 |

**举例：** A 网站和 B 网站是同一家公司的关联服务，要求用户在其中一个网站登录后，访问另一个网站自动登录。

### 解决方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| Session 持久化 | 架构清晰 | 工程量大，持久层单点失败风险 |
| JWT 方案 | 无状态，易扩展 | Token 无法主动失效 |

JWT 是"服务器不保存 session 数据"方案的代表，所有数据保存在客户端，每次请求发回服务器。

---

## JWT 原理

JWT 的核心原理：**服务器认证后生成一个签名的 JSON 对象发回给用户，后续通信中用户发回该对象，服务器通过签名验证数据完整性。**

```json
{
  "姓名": "张三",
  "角色": "管理员",
  "到期时间": "2024年7月1日0点0分"
}
```

**关键特点：**

- 服务器不保存任何 session 数据，实现无状态
- 使用签名防止数据篡改
- 便于实现服务扩展和负载均衡

### JWT 认证流程图

```
┌─────────┐                                    ┌─────────┐
│  客户端  │                                    │  服务器  │
└────┬────┘                                    └────┬────┘
     │                                              │
     │  1. 发送用户名和密码                          │
     │ ─────────────────────────────────────────────>
     │                                              │
     │  2. 验证成功，生成 JWT Token                  │
     │ <─────────────────────────────────────────────
     │                                              │
     │  3. 存储 Token（localStorage/Cookie）         │
     │                                              │
     │  4. 请求时携带 Token（Authorization Header）   │
     │ ─────────────────────────────────────────────>
     │                                              │
     │  5. 验证 Token 签名，解析用户信息              │
     │ <─────────────────────────────────────────────
     │                                              │
```

---

## JWT 的数据结构

JWT 是一个长字符串，使用点（`.`）分隔成三个部分：

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MzE1NmQxZmM4NDhiYjg4OWRkNjUzMDUiLCJpYXQiOjE2NjIzNTE1OTQsImV4cCI6MTY2MjQzNzk5NH0.qglM5Xjz79o62GmENbQnGnXMDAKClJn8kOAYRvRJJuw
```

**结构示意：**

```
Header.Payload.Signature
```

### 1. Header（头部）

Header 是一个 JSON 对象，描述 JWT 的元数据：

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

| 字段 | 说明 | 常见值 |
|------|------|--------|
| `alg` | 签名算法 | HS256、RS256、ES256 |
| `typ` | 令牌类型 | 固定为 JWT |

**常用签名算法：**

- `HS256`：HMAC SHA-256（对称密钥签名，性能好）
- `RS256`：RSA SHA-256（非对称签名，更安全）
- `ES256`：ECDSA SHA-256（非对称签名，性能更好）

### 2. Payload（负载）

Payload 是一个 JSON 对象，存放实际需要传递的数据。

**官方注册字段（可选）：**

| 字段 | 全称 | 说明 |
|------|------|------|
| `iss` | Issuer | 签发人 |
| `exp` | Expiration Time | 过期时间 |
| `sub` | Subject | 主题 |
| `aud` | Audience | 受众 |
| `nbf` | Not Before | 生效时间 |
| `iat` | Issued At | 签发时间 |
| `jti` | JWT ID | 编号 |

**自定义字段示例：**

```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "admin": true,
  "userId": "63156d1fc848bb889dd65305",
  "iat": 1662351594,
  "exp": 1662437994
}
```

> ⚠️ **安全提示**：JWT 默认不加密，任何人都可以读取。**切勿**将敏感信息（如密码、身份证号）放入 Payload。

### 3. Signature（签名）

Signature 用于验证消息在传递过程中是否被篡改。

**生成过程：**

```js
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

**签名验证流程：**

```
1. 接收 Token
2. 分离 Header、Payload、Signature
3. 用相同算法和密钥重新计算签名
4. 对比签名是否一致
```

> ⚠️ **重要**：签名保证数据不被篡改，但**不提供加密功能**。消息体是透明的，任何人都可以解码查看。

### 4. Base64URL 编码

Header 和 Payload 使用 Base64URL 算法编码，与标准 Base64 的区别：

| Base64 | Base64URL | 说明 |
|--------|-----------|------|
| `+` | `-` | 避免在 URL 中被转义 |
| `/` | `_` | 避免在 URL 中被转义 |
| `=` | 省略 | 减少传输字符 |

**原因：** JWT 可能放在 URL 中（如 `api.example.com/?token=xxx`），需要避免特殊字符。

---

## JWT 的使用方式

### 存储方式

| 存储位置 | 优点 | 缺点 | 适用场景 |
|----------|------|------|----------|
| localStorage | 容易读取，跨页面共享 | 容易受 XSS 攻击 | 同源应用 |
| Cookie（HttpOnly） | 防止 XSS | 需要配置 CORS | 传统 Web 应用 |
| sessionStorage | 关闭标签页自动清除 | 无法跨标签页共享 | 单页面临时认证 |

### 传输方式

**方式一：Authorization Header（推荐）**

```http
GET /api/user/profile HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**方式二：POST 请求体**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**方式三：URL 参数（不推荐）**

```
https://api.example.com/user?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **注意**：URL 参数方式可能导致 Token 被日志记录，存在安全风险。

### 前端使用示例

**存储 Token：**

```js
// 登录成功后存储
function handleLogin(response) {
  const { token } = response.data;
  localStorage.setItem('access_token', token);
}

// 退出登录时清除
function handleLogout() {
  localStorage.removeItem('access_token');
}
```

**请求拦截器（Axios 示例）：**

```js
import axios from 'axios';

// 创建 axios 实例
const api = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 10000
});

// 请求拦截器：自动添加 Token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// 响应拦截器：处理 Token 过期
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token 过期或无效，跳转登录
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Node.js 实践

### 安装与配置

使用 [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) 库：

```bash
npm install jsonwebtoken
```

### 基础 API

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `jwt.sign()` | 生成 Token | Token 字符串 |
| `jwt.verify()` | 验证并解码 Token | Payload 对象 |
| `jwt.decode()` | 仅解码 Token（不验证） | Payload 对象 |

### 生成 Token

```js
const jwt = require('jsonwebtoken');

// 密钥（生产环境应从环境变量读取）
const SECRET_KEY = 'your-secret-key';

// 基础用法
const token = jwt.sign({ userId: '12345' }, SECRET_KEY);
console.log(token);
// 输出: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

// 设置过期时间
const tokenWithExp = jwt.sign(
  { userId: '12345', role: 'admin' },
  SECRET_KEY,
  { expiresIn: '2h' } // 2小时后过期
);

// 设置更多选项
const tokenWithOptions = jwt.sign(
  { userId: '12345' },
  SECRET_KEY,
  {
    expiresIn: '7d',           // 7天后过期
    issuer: 'my-app',          // 签发者
    audience: 'my-users',      // 受众
    subject: 'user-auth'       // 主题
  }
);
```

**过期时间格式：**

| 格式 | 示例 | 说明 |
|------|------|------|
| 秒数 | `3600` | 1小时后 |
| 字符串 | `'2h'` | 2小时后 |
| 字符串 | `'7d'` | 7天后 |
| 字符串 | `'30m'` | 30分钟后 |

### 验证 Token

```js
const jwt = require('jsonwebtoken');

const SECRET_KEY = 'your-secret-key';
// token：从请求 Authorization 头中解析出的令牌字符串
// const token = authHeader.split(' ')[1]

// 基础验证
try {
  const decoded = jwt.verify(token, SECRET_KEY);
  console.log(decoded);
  // { userId: '12345', iat: 1662351594 }
} catch (err) {
  console.error('Token 无效:', err.message);
}

// 带选项验证
try {
  const decoded = jwt.verify(token, SECRET_KEY, {
    issuer: 'my-app',      // 验证签发者
    audience: 'my-users'   // 验证受众
  });
} catch (err) {
  // Token 过期或无效
}

// 错误类型处理
try {
  const decoded = jwt.verify(token, SECRET_KEY);
} catch (err) {
  if (err.name === 'TokenExpiredError') {
    console.log('Token 已过期');
  } else if (err.name === 'JsonWebTokenError') {
    console.log('Token 无效');
  } else if (err.name === 'NotBeforeError') {
    console.log('Token 尚未生效');
  }
}
```

### 解码 Token（不验证）

```js
const jwt = require('jsonwebtoken');

// 仅解码，不验证签名（用于调试）
const decoded = jwt.decode(token);
console.log(decoded);
// { userId: '12345', iat: 1662351594, exp: 1662437994 }

// 获取完整信息
const decodedFull = jwt.decode(token, { complete: true });
console.log(decodedFull);
// {
//   header: { alg: 'HS256', typ: 'JWT' },
//   payload: { userId: '12345', ... },
//   signature: 'qglM5Xjz79o62Gm...'
// }
```

### Express 中间件示例

```js
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const SECRET_KEY = 'your-secret-key';

// 认证中间件
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;  // 将用户信息附加到请求对象
    next();
  } catch (err) {
    return res.status(401).json({ 
      error: '令牌无效或已过期',
      code: 'TOKEN_INVALID'
    });
  }
}

// 登录接口
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // 验证用户（示例）
  if (username === 'admin' && password === 'password') {
    const token = jwt.sign(
      { userId: 1, username, role: 'admin' },
      SECRET_KEY,
      { expiresIn: '2h' }
    );
    res.json({ token, expiresIn: 7200 });
  } else {
    res.status(401).json({ error: '用户名或密码错误' });
  }
});

// 受保护的路由
app.get('/profile', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

## Koa 框架实战（koa-jwt）

在 Koa 生态中，可使用 [`koa-jwt`](https://github.com/koajs/jwt) 中间件完成 Token 的签发与校验，配合 `koa-body` 处理请求体。下面以一个用户注册 / 登录 / 鉴权接口为例。

### 依赖安装

```bash
npm install koa koa-router koa-jwt koa-body jsonwebtoken bcryptjs
```

### 用户模型与注册

```js
// models/user.js
const bcrypt = require('bcryptjs');
const users = []; // 示例：实际项目应落地数据库

async function register(username, password) {
  const exists = users.find(u => u.username === username);
  if (exists) throw new Error('用户已存在');
  // 使用 bcrypt 哈希存储密码
  const hashed = await bcrypt.hash(password, 10);
  const user = { id: users.length + 1, username, password: hashed };
  users.push(user);
  return user;
}

function findByUsername(username) {
  return users.find(u => u.username === username);
}

module.exports = { register, findByUsername };
```

### 登录签发 Token

```js
// routes/auth.js
const Router = require('koa-router');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { register, findByUsername } = require('../models/user');

const router = new Router({ prefix: '/api' });
const SECRET = process.env.JWT_SECRET;

router.post('/register', async ctx => {
  const { username, password } = ctx.request.body;
  const user = await register(username, password);
  ctx.status = 201;
  ctx.body = { id: user.id, username: user.username };
});

router.post('/login', async ctx => {
  const { username, password } = ctx.request.body;
  const user = findByUsername(username);
  if (!user) {
    ctx.status = 401;
    ctx.body = { error: '用户不存在' };
    return;
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    ctx.status = 401;
    ctx.body = { error: '密码错误' };
    return;
  }
  const token = jwt.sign({ userId: user.id, username }, SECRET, { expiresIn: '2h' });
  ctx.body = { token, expiresIn: 7200 };
});
```

### 使用 koa-jwt 保护路由

```js
// app.js
const Koa = require('koa');
const Router = require('koa-router');
const jwt = require('koa-jwt');
const koaBody = require('koa-body');
const authRoutes = require('./routes/auth');

const app = new Koa();
const router = new Router();
const SECRET = process.env.JWT_SECRET;

// 统一错误处理：必须注册在最前面，才能捕获其后所有中间件（含 koa-jwt）抛出的错误
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    if (err.status === 401) {
      ctx.status = 401;
      ctx.body = { error: 'Token 无效或已过期' };
    } else {
      throw err;
    }
  }
});

// 解析请求体
app.use(koaBody());

// 受保护路由：校验失败抛出 401
app.use(jwt({ secret: SECRET }).unless({ path: [/^\/api\/login/, /^\/api\/register/] }));

app.use(authRoutes.routes());

router.get('/api/profile', ctx => {
  // 通过 koa-jwt 后，ctx.state.user 已挂载解码后的 Payload
  ctx.body = { user: ctx.state.user };
});

app.use(router.routes());
app.listen(3000);
```

> 要点：`koa-jwt` 把解析出的 Payload 挂载在 `ctx.state.user` 上；用 `.unless()` 放行登录、注册等免鉴权接口；校验失败会抛出 401，因此错误处理中间件要注册在最前面才能统一接管。

---

## JWT 与 Session 对比

### 功能对比

| 特性 | JWT | Session |
|------|-----|---------|
| 存储位置 | 客户端 | 服务器端 |
| 状态 | 无状态 | 有状态 |
| 扩展性 | 容易水平扩展 | 需要 Session 共享 |
| 跨域支持 | 天然支持 | 需要额外配置 |
| 安全性 | Token 泄露风险 | Session 劫持风险 |
| 主动失效 | 困难（需要额外机制） | 容易（删除 Session） |
| 服务器压力 | 低 | 高（需要存储） |
| 数据大小 | 受 URL/Header 限制 | 无限制 |

### 适用场景

**JWT 适用场景：**

- 分布式系统、微服务架构
- 移动端 App、小程序
- 单点登录（SSO）
- 无状态 RESTful API
- 对服务器资源敏感的应用

**Session 适用场景：**

- 传统单体 Web 应用
- 需要主动控制会话失效
- 需要存储大量用户状态
- 对安全性要求极高的系统

---

## Token 刷新机制

JWT 一旦签发，在过期前无法主动失效。为解决此问题，可采用 **Access Token + Refresh Token** 双 Token 机制。

### 双 Token 机制原理

```
┌─────────────┐                          ┌─────────────┐
│   客户端     │                          │   服务器     │
└──────┬──────┘                          └──────┬──────┘
       │                                        │
       │  1. 登录请求                            │
       │ ───────────────────────────────────────>
       │                                        │
       │  2. 返回 Access Token（短期）            │
       │     + Refresh Token（长期）             │
       │ <───────────────────────────────────────
       │                                        │
       │  3. 携带 Access Token 访问资源           │
       │ ───────────────────────────────────────>
       │                                        │
       │  4. Access Token 过期，返回 401          │
       │ <───────────────────────────────────────
       │                                        │
       │  5. 携带 Refresh Token 刷新             │
       │ ───────────────────────────────────────>
       │                                        │
       │  6. 返回新的 Access Token               │
       │ <───────────────────────────────────────
       │                                        │
```

### Node.js 实现示例

```js
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());

const SECRET_KEY = 'your-secret-key';
const REFRESH_SECRET = 'your-refresh-secret';

// 存储 Refresh Token（生产环境应使用 Redis）
const refreshTokens = new Set();

// 登录接口
app.post('/login', (req, res) => {
  const { username } = req.body;
  
  // Access Token：短期有效（15分钟）
  const accessToken = jwt.sign(
    { username },
    SECRET_KEY,
    { expiresIn: '15m' }
  );
  
  // Refresh Token：长期有效（7天）
  const refreshToken = jwt.sign(
    { username },
    REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  refreshTokens.add(refreshToken);
  
  res.json({
    accessToken,
    refreshToken,
    expiresIn: 900 // 秒
  });
});

// 刷新 Token 接口
app.post('/refresh', (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken || !refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: '无效的刷新令牌' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    
    // 生成新的 Access Token
    const accessToken = jwt.sign(
      { username: decoded.username },
      SECRET_KEY,
      { expiresIn: '15m' }
    );
    
    res.json({ accessToken, expiresIn: 900 });
  } catch (err) {
    refreshTokens.delete(refreshToken);
    res.status(401).json({ error: '刷新令牌已过期，请重新登录' });
  }
});

// 退出登录（撤销 Refresh Token）
app.post('/logout', (req, res) => {
  const { refreshToken } = req.body;
  refreshTokens.delete(refreshToken);
  res.json({ message: '已退出登录' });
});

app.listen(3000);
```

### Token 有效期建议

| Token 类型 | 建议有效期 | 说明 |
|------------|------------|------|
| Access Token | 15分钟 ~ 2小时 | 短期有效，降低泄露风险 |
| Refresh Token | 7天 ~ 30天 | 长期有效，用于刷新 Access Token |

---

## 安全最佳实践

### 1. 有效期设置

- **Access Token 有效期应设置较短**（15分钟 ~ 2小时）
- 敏感操作（如修改密码、支付）需要二次验证
- 使用 Refresh Token 延长会话

### 2. 存储安全

```js
// ❌ 不安全：存储在 localStorage，容易受 XSS 攻击
localStorage.setItem('token', token);

// ✅ 安全：存储在 HttpOnly Cookie
res.cookie('token', token, {
  httpOnly: true,    // 防止 JavaScript 读取
  secure: true,      // 仅 HTTPS 传输
  sameSite: 'strict', // 防止 CSRF 攻击
  maxAge: 7200000    // 2小时
});
```

### 3. 传输安全

- **必须使用 HTTPS** 协议传输
- 避免在 URL 参数中传递 Token
- 使用 `Authorization: Bearer <token>` 标准格式

### 4. 密钥管理

```js
const fs = require('fs');

// ❌ 不安全：硬编码密钥
const SECRET = 'my-secret-key';

// ✅ 安全：从环境变量读取
const SECRET = process.env.JWT_SECRET;

// ✅ 更安全：使用非对称签名（RS256）
const privateKey = fs.readFileSync('private.key');
const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
```

### 5. Token 黑名单机制

对于需要主动失效的场景，可维护 Token 黑名单：

```js
const blacklistedTokens = new Set();

// 添加到黑名单（如用户修改密码后）
function revokeToken(token) {
  blacklistedTokens.add(token);
}

// 认证中间件中检查
function authMiddleware(req, res, next) {
  const token = getTokenFromRequest(req);
  
  if (blacklistedTokens.has(token)) {
    return res.status(401).json({ error: '令牌已失效' });
  }
  
  // 验证 Token...
}
```

> **注意**：黑名单机制会引入状态管理，增加服务器负担。生产环境建议使用 Redis 等缓存服务。

---

## JWT 的特点总结

### 优点

- ✅ 无状态，服务器不需要存储 session 数据
- ✅ 容易实现水平扩展
- ✅ 天然支持跨域认证
- ✅ 支持多端（Web、移动端、小程序）
- ✅ 可用于信息交换，减少数据库查询

### 缺点

- ❌ Token 签发后无法主动失效（过期前始终有效）
- ❌ Token 泄露后风险较高
- ❌ Payload 不加密，不能存储敏感信息
- ❌ Token 体积较大，每次请求都需要传输

### 注意事项

- JWT 默认不加密，敏感信息需要额外处理
- Token 泄露后，攻击者可获得所有权限
- 有效期设置应较短，重要操作需二次验证
- 必须使用 HTTPS 传输

---

## 常见问题解答

### Q1：JWT Token 被盗用怎么办？

**解决方案：**

1. 设置较短的过期时间
2. 使用 HTTPS 防止中间人攻击
3. 实现 Token 黑名单机制
4. 敏感操作进行二次验证
5. 监控异常登录行为

### Q2：如何实现 JWT 的主动失效？

**方案一：短有效期 + Refresh Token**

Access Token 有效期很短（如15分钟），失效后通过 Refresh Token 获取新 Token。需要使某用户下线时，删除其 Refresh Token。

**方案二：Token 黑名单**

维护一个失效 Token 列表（使用 Redis），每次验证时检查 Token 是否在黑名单中。

### Q3：JWT 存储在哪里更安全？

| 存储位置 | XSS 风险 | CSRF 风险 | 推荐度 |
|----------|----------|-----------|--------|
| localStorage | 高 | 无 | ⭐⭐ |
| HttpOnly Cookie | 低 | 高 | ⭐⭐⭐ |
| HttpOnly Cookie + SameSite | 低 | 低 | ⭐⭐⭐⭐⭐ |

**推荐配置：**

```js
res.cookie('token', token, {
  httpOnly: true,      // 防止 XSS
  secure: true,        // 仅 HTTPS
  sameSite: 'strict'   // 防止 CSRF
});
```

### Q4：JWT 和 OAuth 2.0 是什么关系？

- **JWT** 是一种 Token 格式标准
- **OAuth 2.0** 是一种授权框架
- OAuth 2.0 可以使用 JWT 作为 Access Token 格式

### Q5：为什么 JWT 不适合存储敏感信息？

JWT 的 Payload 只经过 Base64 编码，**任何人都可以解码查看**。如果存储密码、身份证号等敏感信息，等同于明文传输。

**解决方案：**

- 敏感信息在服务端存储，JWT 只存储用户 ID
- 如需传输敏感信息，使用 JWE（JSON Web Encryption）进行加密

### Q6：如何调试 JWT？

**在线工具：**

- [jwt.io](https://jwt.io/) - JWT 解码和调试

**代码调试：**

```js
// 解码 Token（不验证）
const decoded = jwt.decode(token, { complete: true });
console.log('Header:', decoded.header);
console.log('Payload:', decoded.payload);
```

---

## 参考链接

- [RFC 7519 - JSON Web Token (JWT)](https://tools.ietf.org/html/rfc7519)
- [JSON Web Token 入门教程 - 阮一峰](https://www.ruanyifeng.com/blog/2018/07/json_web_token-tutorial.html)
- [jwt.io - JWT 官方网站](https://jwt.io/)
- [Node.js jsonwebtoken 库](https://github.com/auth0/node-jsonwebtoken)
- [JWT、JWS、JWE 区别详解](https://www.cnkirito.moe/jwt-learn-3/)
