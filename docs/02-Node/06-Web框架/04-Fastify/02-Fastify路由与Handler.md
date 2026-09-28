---
title: Fastify 路由与 Handler 详解
description: Fastify 基于 Radix Tree 的路由注册、参数解析、重定向与错误标准化处理机制
keywords: [Node.js, Web框架, Fastify, 路由]
category: Node.js
tags: [Node.js, Web框架]
---


# Fastify 路由与 Handler 详解

Fastify 的路由层与 Express/Koa 有本质差异：前者基于 **Radix Tree（基数树）** 进行路由匹配，后者多为顺序遍历或简单的对象查找。Radix Tree 让路由查找复杂度接近 O(log n)，路由定义较多时仍能保持稳定的性能。

> **前置知识**：建议先阅读 [Fastify 概述](01-Fastify概述.md)，了解其核心架构设计。

## 一、路由注册方式

Fastify 通过 `app.get/post/put/delete/patch/options/head/all` 等方法注册路由，也支持统一的 `app.route()` 声明式方式。

### 1.1 方法式注册

```js
import Fastify from 'fastify';

const app = Fastify();

app.get('/users', async () => ({ list: [] }));
app.post('/users', async (req, reply) => ({ id: Date.now(), ...req.body }));
app.put('/users/:id', async (req) => ({ id: req.params.id }));
app.delete('/users/:id', async () => ({ success: true }));

await app.listen({ port: 3000 });
```

### 1.2 声明式 `app.route()`

`app.route()` 把路由的所有配置收敛在一个对象里，更利于大规模应用维护：

```js
app.route({
  method: 'GET',
  url: '/users/:id',
  // 命中前的钩子（数组形式）
  preHandler: [authenticate],
  schema: {
    params: { type: 'object', properties: { id: { type: 'string' } } },
    response: {
      200: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } },
      },
    },
  },
  handler: async (req, reply) => {
    return { id: req.params.id, name: 'Fastify User' };
  },
});
```

### 1.3 全方法匹配 `app.all()`

```js
app.all('/secret', async (req) => {
  return { method: req.method, path: req.url };
});
```

---

## 二、路由参数与查询参数

### 2.1 路径参数（Path Params）

```js
// 必选参数
app.get('/users/:id', async (req) => {
  return { id: req.params.id };
});

// 多个参数
app.get('/orgs/:orgId/repos/:repoId', async (req) => {
  return { org: req.params.orgId, repo: req.params.repoId };
});

// 通配符路由（捕获剩余路径）
app.get('/files/*', async (req) => {
  return { file: req.params['*'] };
});
```

### 2.2 查询参数（Query）

Fastify 把查询字符串解析到 `req.query`：

```js
app.get('/search', async (req) => {
  // /search?q=fastify&page=2&size=20
  const { q, page = 1, size = 20 } = req.query;
  return { q, page: Number(page), size: Number(size) };
});
```

> **注意**：`req.query` 里的值默认都是字符串，需要时用 `Number()` 转换。可通过 JSON Schema 的 `coerceTypes` 自动转换（见系列 [Schema 校验篇](03-Schema校验与响应序列化.md)）。

### 2.3 请求体（Body）

一旦注入了 JSON 解析，即可在自定义解析器或 `schema.body` 校验后读取 `req.body`：

```js
app.post('/users', async (req) => {
  const { name } = req.body;
  return { created: { name } };
});
```

---

## 三、Handler 与 Reply 对象

Fastify 的 `handler(req, reply)` 有两个核心对象：

- **`req`**：`FastifyRequest`，封装请求的 params/query/body/headers/url/ip 等，还带有 `req.log`（链路感知的 logger）。
- **`reply`**：`FastifyReply`，用于控制响应状态、头、序列化、发送。

### 3.1 三种返回响应方式

方式一：**直接返回值（推荐）**——Fastify 自动序列化并发送：

```js
app.get('/data', async () => ({ status: 'ok' }));
```

方式二：**使用 reply**——适合需要精细控制状态码/响应头的场景：

```js
app.get('/created', async (req, reply) => {
  return reply.code(201).header('X-Custom', 'v').send({ id: 1 });
});
```

方式三：**原生 Stream / Buffer**——用于大文件或流式输出：

```js
import { createReadStream } from 'node:fs';

app.get('/download', async (req, reply) => {
  return reply.type('application/octet-stream').send(createReadStream('./big.bin'));
});
```

### 3.2 常用 Reply API

| 方法 | 作用 |
|------|------|
| `reply.code(status)` | 设置 HTTP 状态码（链式） |
| `reply.status(status)` | `code` 的别名 |
| `reply.header(name, value)` | 设置响应头 |
| `reply.type(mediaType)` | 便捷设置 `Content-Type` |
| `reply.send(payload)` | 发送响应正文（可自动序列化） |
| `reply.redirect(url)` | 重定向 |
| `reply.code(204).send()` | 发送空响应 |

### 3.3 异步 Handler 的异常自动处理

Handler 可以是 `async`，其中抛出的异常会被 Fastify 捕获并交给错误处理流程，无需手动 `try/catch`：

```js
app.get('/users/:id', async (req) => {
  const user = await db.find(req.params.id);
  if (!user) {
    // 抛出一个带 statusCode 的错误，最终返回 404 + 错误体
    const err = new Error('User not found');
    err.statusCode = 404;
    throw err;
  }
  return user;
});
```

---

## 四、路由状态码与响应头

### 4.1 默认状态码

- Fastify 对所有 HTTP 方法一视同仁：handler 正常返回对象/字符串 → 默认 `200`（**不会**因 POST 自动给 201）
- 需要 `201 Created` 等 RESTful 语义时，请显式 `reply.code(201).send(...)`

### 4.2 显式设置

```js
app.post('/users', async (req, reply) => {
  return reply.code(201).send({ id: 1 });
});
```

---

## 五、重定向

### 5.1 简单重定向

```js
app.get('/old', async (req, reply) => reply.redirect('/new'));

// 带状态码（默认 302；Fastify 5 起签名改为 redirect(url, code)，v4 为 redirect(code, url)）
app.get('/gone', async (req, reply) => reply.redirect('/moved', 301));
```

> 也可以通过 `reply.header('location', url)` 手动设置跳转地址后调用 `reply.send()`。

### 5.2 自定义重定向（schema 驱动）

重定向本身没有响应体；若希望对重定向结果做约束，可在 handler 中显式控制状态码与 `location` 头：

```js
app.get('/legacy', {
  schema: {
    response: {
      302: { type: 'null' },
    },
  },
  handler: async (req, reply) => {
    reply.code(302).header('location', '/home').send();
  },
});
```

---

## 六、路由前缀与参数

### 6.1 实例级前缀

使用 `prefix` 快速为整组路由添加前缀：

```js
const app = Fastify();

app.register(adminRoutes, { prefix: '/admin' });

async function adminRoutes(scope) {
  scope.get('/dashboard', async () => ({ page: 'admin dashboard' }));
  // 最终路径：/admin/dashboard
}
```

### 6.2 在 Handler 中读取前缀

```js
scope.get('/me', async (req) => {
  return { routerPath: req.routeOptions.url, prefix: req.routeOptions.prefix };
});
```

---

## 七、路由冲突与匹配优先级

路由表是静态的（Fastify 4.x/5.x 均不允许同一 URL 重复定义冲突路由），动态参数与静态路径并存时遵循规则：

```js
// 静态路径优先于动态参数
app.get('/users/me', async () => ({ who: 'me', type: 'static' }));
app.get('/users/:id', async (req) => ({ who: req.params.id, type: 'dynamic' }));
```

匹配 `/users/me` 时命中静态路由；`/users/123` 命中动态路由。

---

## 八、404 处理

未匹配的路由默认返回 Fastify 的内置 404。可用 `app.setNotFoundHandler()` 定制：

```js
app.setNotFoundHandler(async (req, reply) => {
  reply.code(404).send({ code: 'NOT_FOUND', path: req.url });
});

// 仅对特定前缀生效
app.setNotFoundHandler({ prefix: '/api' }, async (req, reply) => {
  reply.code(404).send({ code: 'API_NOT_FOUND' });
});
```

---

## 九、路由组织与最佳实践

### 9.1 按资源拆分模块

```
src/
├── routes/
│   ├── index.js        # 统一注册各资源路由
│   ├── users.js
│   └── orders.js
├── plugins/            # 可复用插件
└── app.js              # Fastify 实例
```

### 9.2 统一注册入口

```js
// routes/index.js
export default async function registerRoutes(app) {
  await app.register(import('./users.js'), { prefix: '/api/users' });
  await app.register(import('./orders.js'), { prefix: '/api/orders' });
}
```

### 9.3 Handler 只做编排

推荐把业务逻辑下沉到独立 service，Handler 保持薄层：

```js
import { createUser } from '../services/userService.js';

app.post('/users', async (req) => {
  const user = await createUser(req.body);
  return user;
});
```

---

## 十、常见问题

### Q1: `req.params` 中文/特殊字符编码问题？

Fastify 默认按 URL 解码。若需保留原始编码，可在 `req.params` 之外用 `req.url`/`req.raw` 自行处理。

### Q2: 为什么 POST 返回了 200 而不是 201？

Fastify 对所有方法正常返回时的默认状态码都是 200，不会因 POST 自动设 201。需要 201 时显式调用 `reply.code(201).send(...)`。

### Q3: 如何同时支持 JSON 和表单提交？

需要注册对应的解析器（`@fastify/formbody` 或 `@fastify/multipart`），再在 Handler 中读取 `req.body`。见 [Schema 校验与序列化篇](03-Schema校验与响应序列化.md)。

### Q4: `app.all('*')` 生效顺序？

它是最低优先级的兜底路由。若要统一处理未知路径，推荐使用 `setNotFoundHandler` 而非 `app.all('*')`。

---

## 下一步学习

- [Schema 校验与响应序列化](03-Schema校验与响应序列化.md)：为路由接入类型安全的入参校验与高性能序列化
- [插件与封装机制](04-插件与封装机制.md)：用 `register` + 前缀构建可复用的路由模块
- [钩子 Hooks 与生命周期](05-钩子Hooks与生命周期.md)：理解路由在请求-响应中经历的各阶段