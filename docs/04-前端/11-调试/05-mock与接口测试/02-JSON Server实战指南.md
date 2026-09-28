---
title: JSON Server 实战指南
description: "介绍 JSON Server 的安装启动与 RESTful 查询语法(过滤/分页/排序/关联),以及自定义中间件、白名单代理与静态资源服务的实战用法。"
keywords: [mock与接口测试, JSON, Server]
category: 调试
tags: [JSON Server, Mock, RESTful API]
---

# JSON Server 实战指南

## 一、JSON Server概述 

### 1.1 为什么需要JSON Server?

####  Mock.js的局限性

| 场景 | Mock.js的问题 |
|------|---------------|
| **网络测试** | 只拦截XHR,不发起真实HTTP请求 |
| **弱网测试** | 无法模拟真实网络延迟、超时 |
| **数据持久化** | 删除/新增数据无法真实保存 |
| **团队协作** | 本地配置,无法共享 |

---

####  JSON Server的价值

```
Mock.js: 拦截请求 → 返回假数据
JSON Server: 真实服务器 → 真实HTTP → 数据持久化
```

**核心优势**:
-  真实HTTP服务,可测试网络环境
-  数据持久化,增删改查真实有效
-  RESTful API规范,零配置启动
-  支持团队协作,可部署共享

---

### 1.2 JSON Server vs Mock.js

| 特性 | Mock.js | JSON Server |
|------|---------|-------------|
| **原理** | 拦截XHR请求 | 真实HTTP服务器 |
| **网络请求** |  无真实请求 |  真实HTTP请求 |
| **弱网测试** |  不支持 |  支持(浏览器DevTools) |
| **数据持久化** |  仅内存 |  JSON文件存储 |
| **增删改查** |  模拟 |  真实操作 |
| **学习成本** |  |  |

---

## 二、快速上手 

> **版本说明（重要）**：截至 2026-09，npm 上 `latest` 标签指向 1.0.0-beta.15（v1.0 正式版尚未发布，0.17.4 为最后的稳定版本），v1 beta 相对 v0.17 有多个 Breaking Changes：
> - **ID 改为字符串**：`id` 始终为字符串，未提供时自动生成（`"1"`、`"5b2e"` 等）
> - **`--watch` 参数移除**：v1 写入 db.json 自动保存，无需手动监听
> - **查询语法重写**：操作符从 `_gte`/`_like` 改为 `field:operator=value` 形式
> - **分页参数变更**：`_limit` 改为 `_per_page`，分页信息从响应头移至响应体
> - **`_expand` 移除**：关系查询统一使用 `_embed`
> - **`--delay` 移除**：模拟延迟请用 DevTools Network 节流
> - **纯 ESM**：模块方式引用需使用 `import`。

### 2.1 安装

```bash
# 全局安装(推荐)
npm install -g json-server

# 项目本地安装
npm install json-server --save-dev
```

---

### 2.2 创建数据文件

```json
{
  "posts": [
    { "id": "1", "title": "学习Vue3", "author": "张三", "views": 100 },
    { "id": "2", "title": "深入React", "author": "李四", "views": 200 }
  ],
  "users": [
    { "id": "1", "name": "张三", "email": "zhang@example.com" }
  ]
}
```

**重要说明（v1）**:
- 每个顶层数组会自动生成REST API
- **`id` 必须是字符串**：v1 中 id 始终为字符串，未提供时自动生成
- 写入 db.json 自动保存，无需 `--watch`
- 支持 `db.json5` 格式（无引号、注释、尾逗号）

---

### 2.3 启动服务

```bash
# 基本启动(默认端口3000)
json-server db.json

# 或使用 npx 免安装启动
npx json-server db.json

# 指定端口
json-server db.json --port 3001

# 指定静态目录(可多次添加)
json-server db.json -s ./static
```

**启动输出（v1）**:

```
JSON Server started on PORT :3000
http://localhost:3000
```

> **注意**：v1 已移除 `--watch`（文件修改自动保存）、`--delay`（改由浏览器 DevTools 网络节流模拟）。

## 三、RESTful API详解 

### 3.1 查询接口 (GET)

####  基本查询

```bash
# 获取所有资源
GET /posts

# 获取单个资源
GET /posts/1

# 获取嵌套资源
GET /posts/1/comments
```

---

####  过滤查询

```bash
# 精确过滤
GET /posts?author=张三

# 多字段过滤
GET /posts?author=张三&title=学习Vue3

# 访问嵌套属性
GET /posts?author.name=张三
```

---

####  分页查询(v1)

```bash
# 使用 _page 和 _per_page(v1 中 _limit 已废弃)
GET /posts?_page=1&_per_page=10
```

**响应格式(v1 改为响应体携带分页信息)**:

```json
{
  "first": 1,
  "prev": null,
  "next": 2,
  "last": 4,
  "pages": 4,
  "items": 100,
  "data": [
    { "id": "1", "title": "学习Vue3", "views": 100 },
    { "id": "2", "title": "深入React", "views": 200 }
  ]
}
```

- `_per_page` 默认为 10，非法值自动归一化
- v0 中的 `X-Total-Count`/`Link` 响应头已不再使用

####  排序(v1)

```bash
# 单字段升序
GET /posts?_sort=id

# 单字段降序(字段前加负号)
GET /posts?_sort=-views

# 多字段排序(逗号分隔,可分别指定方向)
GET /posts?_sort=author.name,-views
```

---

####  操作符(v1: field:operator=value)

```bash
# 大于 (gt)
GET /posts?views:gt=100

# 小于等于 (lte)
GET /posts?views:lte=200

# 不等于 (ne)
GET /posts?id:ne=1

# 包含在列表 (in)
GET /posts?id:in=1,2,3

# 字符串包含 (contains, 不区分大小写)
GET /posts?title:contains=Vue

# 字符串开头/结尾
GET /posts?title:startsWith=Hello
GET /posts?title:endsWith=world
```

> **运算符速查**：无操作符=相等(eq)；`eq` 等于、`ne` 不等、`lt`/`lte` 小于(等于)、`gt`/`gte` 大于(等于)、`in` 列表包含、`contains`/`startsWith`/`endsWith` 字符串匹配。

---

####  模糊搜索(v1)

```bash
# v1 中使用 contains 操作符(不区分大小写),旧 `q` 参数已移除
GET /posts?title:contains=Vue

# 复杂条件查询(_where, 支持 or/and 嵌套)
GET /posts?_where={"or":[{"views":{"gt":100}},{"author":{"name":{"lt":"m"}}}]}
```

---

####  关联查询(v1)

```bash
# 嵌入子资源 (_embed)
GET /posts?_embed=comments

# 返回结果
[
  {
    "id": "1",
    "title": "学习Vue3",
    "comments": [
      { "id": "1", "body": "好文章!", "postId": "1" }
    ]
  }
]

# v1 中 _expand 已移除: 反查父资源同样使用 _embed
# 旧: GET /comments?_expand=post  →  新: GET /comments?_embed=post

# 删除资源时级联删除子资源
DELETE /posts/1?_dependent=comments
```

---



### 3.2 新增接口 (POST)

> **v1 注意**：`id` 可以不传，由服务器自动生成字符串 ID。

```bash
# 新增文章
POST /posts
Content-Type: application/json

{
  "title": "学习TypeScript",
  "author": "赵六"
}

# 响应结果(自动生成字符串ID)
{
  "title": "学习TypeScript",
  "author": "赵六",
  "id": "3"
}
```

**db.json文件会自动更新!**

---

### 3.3 修改接口 (PUT / PATCH)

####  PUT(完整替换)

```bash
# PUT会替换整个资源
PUT /posts/1
Content-Type: application/json

{
  "title": "Vue3完全指南",
  "author": "张三"
}

# 响应结果(原有数据被完全替换)
{
  "title": "Vue3完全指南",
  "author": "张三",
  "id": "1"
}

# 原有的其他属性会被删除!
```

---

####  PATCH(部分更新)

```bash
# PATCH只更新指定字段
PATCH /posts/1
Content-Type: application/json

{
  "title": "Vue3完全指南"
}

# 响应结果(只更新title,保留其他字段)
{
  "id": "1",
  "title": "Vue3完全指南",  # 已更新
  "author": "张三"          # 保留
}
```

---

### 3.4 删除接口 (DELETE)

```bash
# 删除文章
DELETE /posts/1

# 响应结果
{}  # 空对象表示删除成功

# db.json文件会自动更新,数据被真实删除
```

---

### 3.5 对象 vs 数组 

**重要区别**:

| 数据类型 | 结构 | 支持的操作 |
|---------|------|-----------|
| **对象** | `"hello": {...}` | 支持GET、PUT、PATCH(整体替换/部分更新) |
| **数组** | `"users": [...]` | 支持完整的CRUD操作 |

```json
{
  "hello": {
    "message": "Hello World"
  },
  "users": [
    { "id": "1", "name": "张三" }
  ]
}
```

**POST对象只能更新,不能新增!**

---

## 四、前端集成 

### 4.1 项目结构

```
project/
├── db.json              # 数据文件
├── package.json
└── src/
    ├── api/
    │   └── index.ts     # API封装
    └── main.ts
```

---

### 4.2 配置package.json

```json
{
  "scripts": {
    "mock": "json-server db.json --port 3001",
    "dev": "concurrently \"vite\" \"npm run mock\""
  },
  "devDependencies": {
    "json-server": "^1.0.0-beta.15",
    "concurrently": "^8.2.0"
  }
}
```

---

### 4.3 封装API请求

```typescript
import axios from 'axios';

const request = axios.create({
  baseURL: 'http://localhost:3001',
  timeout: 10000
});

// 用户相关API
export const userAPI = {
  getList: (params?: any) => request.get('/users', { params }),
  getDetail: (id: number) => request.get(`/users/${id}`),
  create: (data: any) => request.post('/users', data),
  update: (id: number, data: any) => request.put(`/users/${id}`, data),
  delete: (id: number) => request.delete(`/users/${id}`)
};
```

---

### 4.4 在组件中使用

```vue
<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { userAPI } from './api';

const users = ref([]);

onMounted(async () => {
  const data = await userAPI.getList({ _page: 1, _per_page: 10 });
  // v1 分页响应体: { first, prev, next, last, pages, items, data }
  users.value = data.data;
});
</script>
```

---

## 五、自定义中间件 

### 5.1 为什么需要自定义中间件?

**问题**: JSON Server内置参数与项目规范不一致

```bash
# JSON Server内置参数
GET /users?_page=1&_per_page=10

# 项目常用参数
GET /users?page=1&size=10      不生效!
```

**解决方案**: 自定义中间件转换参数!

---



### 5.2 创建自定义服务器

> **版本注意**：本节的 `jsonServer.create()/router()/defaults()` 程序化 API 属于 v0.17（基于 Express），后文「白名单代理」「完整项目示例」中的程序化代码同样基于 v0.17；v1 beta 已改用 tinyhttp 重写并移除了这套程序化 API，需要自定义中间件时请安装 0.17.4（`npm i json-server@0.17.4`）。v0.17 为 CommonJS 包，ESM 项目中 `require` 需改为 `import`，脚本建议使用 `.mjs` 或在 `package.json` 中声明 `"type": "module"`。

```javascript
// server.mjs
import jsonServer from 'json-server';

const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// 应用默认中间件
server.use(middlewares);

// 自定义中间件: 参数转换
server.use((req, res, next) => {
  if (req.method === 'GET') {
    const { page, size } = req.query;
    
    if (page && size) {
      req.query._page = parseInt(page);
      req.query._per_page = parseInt(size);
    }
  }
  
  next();
});

// 应用路由
server.use(router);

server.listen(3000, () => {
  console.log('JSON Server is running');
});
```

---

### 5.3 使用nodemon自动重启

```bash
# 安装
pnpm add -D nodemon

# package.json
{
  "scripts": {
    "dev": "nodemon server.js"
  }
}

# 启动
npm run dev
```

---

### 5.4 高级中间件应用

####  日志中间件

```javascript
server.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});
```

---

####  CORS跨域处理

```javascript
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});
```

---

####  请求延迟模拟

```javascript
server.use((req, res, next) => {
  const delay = Math.random() * 400 + 200;
  setTimeout(next, delay);
});
```

---

####  统一响应格式

```javascript
router.render = (req, res) => {
  res.jsonp({
    code: 200,
    message: 'success',
    data: res.locals.data,
    timestamp: Date.now()
  });
};
```

---

####  认证中间件

```javascript
server.use((req, res, next) => {
  const whiteList = ['/login', '/register'];
  
  if (whiteList.includes(req.path)) {
    return next();
  }
  
  const token = req.headers.authorization;
  
  if (!token) {
    return res.status(401).json({
      code: 401,
      message: '未登录'
    });
  }
  
  next();
});
```

---

## 六、白名单代理 

### 6.1 为什么需要白名单?

**应用场景**:
- 部分接口已完成,需要调用真实后端
- Mock数据与真实接口混合使用
- 渐进式从Mock迁移到真实接口

---

### 6.2 白名单工作原理

```
前端请求
    ↓
JSON Server (localhost:3000)
    ↓
检查白名单
    ↓
┌─────────────┬─────────────┐
│   在白名单   │  不在白名单  │
└─────────────┴─────────────┘
    ↓                ↓
真实服务器          Mock数据
(localhost:3030)    (db.json)
```

---



### 6.3 实现白名单代理

####  安装依赖

```bash
pnpm add http-proxy-middleware
```

---

####  完整实现

```javascript
// server.mjs
import jsonServer from 'json-server';
import { createProxyMiddleware } from 'http-proxy-middleware';

const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// 真实服务器地址
const REAL_SERVER = 'http://localhost:3030';

// 应用中间件
server.use(middlewares);

// 路径重写
server.use(jsonServer.rewriter({
  '/api/*': '/$1'
}));

// 获取白名单
const getWhiteList = () => {
  const db = router.db;
  return db.get('whitelist').value() || [];
};

// 白名单检查
const checkWhiteList = (req) => {
  const whiteList = getWhiteList();
  
  return whiteList.some(item => {
    const methodMatch = req.method.toLowerCase() === item.method.toLowerCase();
    const urlMatch = req.url === item.url || 
                     req.url.replace('/api', '') === item.url;
    
    return methodMatch && urlMatch;
  });
};

// 白名单代理中间件
server.use((req, res, next) => {
  const isWhiteListed = checkWhiteList(req);
  
  if (isWhiteListed) {
    console.log(`[代理] ${req.method} ${req.url} → ${REAL_SERVER}`);
    
    const proxyMiddleware = createProxyMiddleware({
      target: REAL_SERVER,
      changeOrigin: true,
      pathRewrite: { '^/api': '/api' }
    });
    
    proxyMiddleware(req, res, next);
  } else {
    console.log('[Mock]', req.method, req.url);
    next();
  }
});

// 应用路由
server.use(router);

server.listen(3000, () => {
  console.log('JSON Server is running');
});
```

---

### 6.4 动态管理白名单

####  db.json配置

```json
{
  "whitelist": [
    {
      "id": "1",
      "url": "/api/home",
      "method": "get"
    }
  ]
}
```

---

####  通过接口管理

```bash
# 查询白名单
GET /whitelist

# 添加白名单
POST /whitelist
{
  "url": "/api/test",
  "method": "get"
}

# 删除白名单
DELETE /whitelist/1
```

---

### 6.5 测试白名单效果

**场景1: 接口在白名单中**

```bash
# 1. 添加到白名单
POST /whitelist
{
  "id": "1",
  "url": "/api/home",
  "method": "get"
}

# 2. 请求接口
GET /api/home

# 3. 响应结果(来自真实服务器 localhost:3030)
{
  "message": "Message from localhost:3030"
}
```

**场景2: 接口不在白名单中**

```bash
# 1. 从白名单删除
DELETE /whitelist/1

# 2. 请求接口
GET /api/home

# 3. 响应结果(来自Mock数据 localhost:3000)
{
  "message": "Hello from localhost:3000"
}
```

---

## 七、静态资源服务器 

### 7.1 创建静态资源目录

```
project/
├── static/
│   ├── index.html
│   ├── css/
│   └── images/
└── db.json
```

---



### 7.2 启动静态资源服务器

```bash
# 启动命令(v1 使用 -s)
json-server db.json -s ./static
# 也可自动服务 ./public 目录(无需配置)

# 访问静态资源
http://localhost:3000/           # index.html
http://localhost:3000/images/logo.png
```

---

### 7.3 静态资源与API共存

```
优先级:
1. 文件后缀 → 静态资源
2. 无后缀 → API接口

示例:
GET /users       → API接口(JSON数据)
GET /users.html  → 静态资源(HTML文件)
```

**不会冲突!**

---

## 八、应用场景分析 

### 8.1 适用场景

| 场景 | 说明 |
|------|------|
| **示例站点** | 前端Demo展示,数据真实可操作 |
| **教学演示** | 快速搭建API,专注前端教学 |
| **原型开发** | 快速验证想法,无需后端支持 |
| **测试环境** | 单元测试、集成测试的数据源 |
| **弱网测试** | 测试真实网络环境下的表现 |
| **前后端并行开发** | 前端不依赖后端接口 |

---

### 8.2 不适用场景

| 场景 | 原因 |
|------|------|
| **生产环境** | 性能、安全性、稳定性不足 |
| **高并发场景** | JSON文件读写性能瓶颈 |
| **数据安全要求高** | 无认证、加密、权限控制 |
| **需要分布式** | 单机存储,无法扩展 |
| **需要事务支持** | 不支持ACID事务 |

---

### 8.3 技术架构限制

```
JSON Server架构:

Express服务器
    ↓
LowDB (JSON文件存储)
    ↓
文件系统读写

问题:
1. 性能瓶颈: 文件I/O操作慢,无法支持高并发
2. 数据安全: JSON文件明文存储,无加密
3. 稳定性差: 单进程,无容错机制
4. 扩展性差: 无法分布式部署
5. 无事务: 不支持ACID特性
```

---

## 九、常见问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| POST对象数据无法新增 | 对象类型只支持更新 | 改用数组结构 |
| 自定义参数不生效 | 未配置中间件转换 | 添加中间件转换参数 |
| 文件修改后未生效 | v1 已移除 `--watch` | 无需处理,写入自动保存 |
| 分页数据拿不到 | 使用旧 `_limit` 参数 | 改用 `_per_page`,分页信息读响应体 |
| 查询过滤不生效 | 使用旧 `id_gte` 语法 | 改用 `views:gt=100` 操作符语法 |
| 中文乱码 | 编码问题 | 确保db.json使用UTF-8编码 |
| 跨域问题 | CORS限制 | 添加CORS中间件 |
| 代理不生效 | 中间件顺序错误 | 确保代理中间件在router之前 |
| 白名单不读取 | db未初始化 | 使用router.db获取数据 |

---

## 十、完整项目示例 

### 10.1 目录结构

```
json-server-demo/
├── db.json              # 数据文件
├── db1.json             # 测试服务器数据
├── server.js            # 主服务器
├── server1.js           # 测试服务器
├── static/              # 静态资源
└── package.json
```

---

### 10.2 package.json

```json
{
  "name": "json-server-demo",
  "type": "module",
  "scripts": {
    "start": "json-server db.json",
    "dev": "nodemon server.mjs",
    "dev:server1": "nodemon server1.mjs",
    "static": "json-server db.json -s ./static",
    "start:all": "concurrently \"npm run dev\" \"npm run dev:server1\""
  },
  "dependencies": {
    "json-server": "^0.17.4",
    "http-proxy-middleware": "^3.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "concurrently": "^8.2.0"
  }
}
```

---



### 10.3 生产级server.mjs

```javascript
// server.mjs
import jsonServer from 'json-server';
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'node:path';

const server = jsonServer.create();
const router = jsonServer.router(path.join(process.cwd(), 'db.json'));
const middlewares = jsonServer.defaults();

const PORT = process.env.PORT || 3000;
const REAL_SERVER = process.env.REAL_SERVER || 'http://localhost:3030';

// 1. 默认中间件
server.use(middlewares);

// 2. 日志中间件
server.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 3. CORS中间件
server.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 4. 路径重写
server.use(jsonServer.rewriter({
  '/api/*': '/$1'
}));

// 5. 参数转换中间件
server.use((req, res, next) => {
  if (req.method === 'GET') {
    const { page, size } = req.query;
    
    if (page && size) {
      req.query._page = parseInt(page);
      req.query._per_page = parseInt(size);
    }
  }
  next();
});

// 6. 白名单代理中间件
const getWhiteList = () => {
  try {
    return router.db.get('whitelist').value() || [];
  } catch (error) {
    return [];
  }
};

server.use((req, res, next) => {
  const whiteList = getWhiteList();
  const isWhiteListed = whiteList.some(item => {
    const methodMatch = req.method.toLowerCase() === item.method.toLowerCase();
    const urlMatch = req.url === item.url || req.url.replace('/api', '') === item.url;
    return methodMatch && urlMatch;
  });
  
  if (isWhiteListed) {
    console.log(`[代理] ${req.method} ${req.url} → ${REAL_SERVER}`);
    
    const proxyMiddleware = createProxyMiddleware({
      target: REAL_SERVER,
      changeOrigin: true,
      pathRewrite: { '^/api': '/api' },
      onError: (err, req, res) => {
        console.error('[代理错误]', err);
        res.status(500).json({ code: 500, message: '代理服务器错误' });
      }
    });
    
    proxyMiddleware(req, res, next);
  } else {
    console.log('[Mock]', req.method, req.url);
    next();
  }
});

// 7. 应用路由
server.use(router);

// 8. 统一响应格式
router.render = (req, res) => {
  const data = res.locals.data;
  
  if (Array.isArray(data) && req.query._page) {
    res.jsonp({
      code: 200,
      message: 'success',
      data: {
        list: data,
        page: parseInt(req.query._page),
        per_page: parseInt(req.query._per_page || 10),
        total: res.locals.data.items || 0
      }
    });
  } else {
    res.jsonp({
      code: 200,
      message: 'success',
      data
    });
  }
};

// 9. 错误处理
server.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    code: 500,
    message: '服务器错误',
    error: err.message
  });
});

// 10. 启动服务器
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   JSON Server is running             ║
║                                      ║
║   Mock Server:  http://localhost:${PORT}  ║
║   Real Server:  ${REAL_SERVER}         ║
║                                      ║
║   白名单管理:                          ║
║   POST /whitelist  - 添加白名单       ║
║   GET  /whitelist  - 查询白名单       ║
║   DELETE /whitelist/:id - 删除白名单  ║
╚══════════════════════════════════════╝
  `);
});

export default server;
```

---

## 十一、延伸学习资源

### 官方文档
- [JSON Server GitHub](https://github.com/typicode/json-server)
- [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware)
- [LowDB GitHub](https://github.com/typicode/lowdb)

### 相关工具
- [JSON Server Auth](https://github.com/jeremyben/json-server-auth) - 认证中间件
- [Postman](https://www.postman.com/) - API测试工具

### 练习建议
1. 使用JSON Server创建一个博客API(用户、文章、评论,注意 v1 的字符串 ID 与 `_embed` 关联)
2. 实现完整的CRUD操作和前端界面
3. 配置白名单代理,实现Mock与真实接口切换
4. 添加认证中间件,实现权限控制
5. 用 `_where` 实现复杂条件查询,并对比 v0 与 v1 的查询语法差异

---


