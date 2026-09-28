---
title: Fastify 钩子 Hooks 与生命周期
description: 请求生命周期中 onRequest、preHandler、preParsing、preValidation、onSend、onError 等钩子的执行顺序与用法
keywords: [Node.js, Web框架, Fastify, Hooks, 生命周期]
category: Node.js
tags: [Node.js, Web框架]
---


# Fastify 钩子 Hooks 与生命周期

Fastify 的生命周期以钩子（Hooks）形式暴露，让开发者能在请求的不同阶段插入逻辑。与 Koa 的洋葱模型「全局统一」不同，Fastify 的钩子既可以是**全局**的，也可以是**路由级**或**封装级**的，粒度更细。

> **前置知识**：先阅读 [Fastify 路由与 Handler](02-Fastify路由与Handler.md) 与 [插件与封装机制](04-插件与封装机制.md)。

## 一、请求生命周期全景

```
客户端请求
   │
   ▼
① onRequest ──────────────▶ 最先执行，可提前拒绝
   │
   ▼
② preParsing ─────────────▶ 解析请求体之前（可替换流）
   │
   ▼
③ preValidation ──────────▶ Schema 校验之前，可改写 body/query
   │
   ▼
④ [请求体解析 / Schema 校验]
   │
   ▼
⑤ preHandler ─────────────▶ 进入 Handler 前的最后一步（鉴权常用）
   │
   ▼
⑥ Handler ────────────────▶ 业务处理
   │
   ▼
⑦ preSerialization ───────▶ 序列化响应之前，可改写返回数据
   │
   ▼
⑧ onSend ─────────────────▶ 响应发送前，可改 header/body
   │
   ▼
⑨ onResponse ─────────────▶ 响应已发送，仅清理、统计
   │
   ▼
     响应返回客户端
```

异常路径：任何一步抛出错误都会进入 `onError`（和全局错误处理），随后视恢复情况继续后续的 `onSend`。

## 二、全局钩子与局部钩子

钩子可通过 `app.addHook('name', fn)`（全局）、`app.register` 作用域内（封装级）、路由选项内（路由级）三种方式挂载。

```js
// 全局：对所有请求生效
app.addHook('onRequest', async (req, reply) => {
  req.log.info({ url: req.url }, 'incoming');
});

// 封装级：仅对其内注册的路由生效
await app.register(async (scope) => {
  scope.addHook('preHandler', auth);
  scope.get('/private', () => ({ sec: true }));
});

// 路由级：仅对单条路由生效
app.get('/special', {
  preHandler: [auth],
  handler: () => ({ special: true }),
});
```

## 三、常用钩子详解

### 3.1 `onRequest`：入口拦截

在请求被处理前执行，适合做粗粒度拦截（IP 黑白名单、全局统计）：

```js
app.addHook('onRequest', async (req, reply) => {
  const allowed = ['127.0.0.1'];
  if (!allowed.includes(req.ip)) {
    reply.code(403).send({ code: 'FORBIDDEN' });
  }
});
```

### 3.2 `preValidation` / `preHandler`：鉴权与预处理

`preValidation` 在 Schema 校验**之前**执行（可在此改写即将被校验的 body/query），`preHandler` 在校验之后、进入 Handler 前执行——两者都是常见的鉴权位置：

```js
app.decorate('authenticate', async (req, reply) => {
  try { await req.jwtVerify(); }
  catch { reply.code(401).send({ code: 'UNAUTHORIZED' }); }
});

app.get('/profile', {
  preHandler: [app.authenticate],  // 路由级数组写法
  handler: async (req) => req.user,
});
```

> `preHandler` 数组里的钩子按顺序执行；任一 `reply.send()` 后后续钩子不再运行。

### 3.3 `onSend`：统一改写响应

在响应序列化后、真正发送前执行，适合统一加响应头、脱敏或压缩：

```js
app.addHook('onSend', async (req, reply, payload) => {
  reply.header('X-Powered-By', 'Fastify');
  // payload 是已序列化的字符串/对象，可改写后返回
  return payload;
});

// 自定义 Content-Type 时的序列化改写
app.addHook('onSend', async (req, reply, payload) => {
  if (reply.getHeader('content-type') === 'text/plain') {
    return `<custom>${payload}</custom>`;
  }
  return payload;
});
```

### 3.4 `onError`：错误兜底与日志

错误进入统一处理前可在此捕获：

```js
app.addHook('onError', async (req, reply, error) => {
  req.log.error({ error }, 'request error');
  // 若在此 reply.send() 则覆盖默认错误响应
});
```

### 3.5 `preParsing`：请求体前处理

可用于压缩流或自定义解析前逻辑：

```js
app.addHook('preParsing', async (req, reply, payload) => {
  req.log.info('about to parse body');
  return payload; // 返回被替换的请求体流（如有需要）
});
```

### 3.6 生命周期钩子（非请求链路）

| 钩子 | 触发时机 | 典型用途 |
|------|----------|----------|
| `onReady` | 所有插件注册完成、服务开始监听前 | 连接数据库、预热缓存 |
| `onListen` | 服务开始监听后 | 打印运行时信息 |
| `onClose` | 服务关闭时 | 释放连接、清空队列 |
| `onError` | 请求出错时 | 错误上报 |

```js
app.addHook('onReady', async () => {
  await db.connect();
  await cache.warmup();
});

app.addHook('onClose', async () => {
  await db.disconnect();
});
```

## 四、钩子的执行顺序与属性

### 4.1 顺序叠加

多个同类型全局钩子按注册顺序执行；路由级钩子数组按数组顺序执行。全局钩子先于路由级钩子在对应阶段执行。

### 4.2 钩子内部读取上下文

请求级钩子的 `this` 指向当前封装的 `app`（或用闭包捕获），可访问 `req`/`reply`/`app`（如 `req.log`、`reply.code`）。

```js
app.addHook('preHandler', async function (req, reply) {
  // 用普通函数以保留 this === app
  console.log(this.config); // 当前封装实例
});
```

## 五、基于钩子实现一个「日志 + 鉴权 + 响应包裹」的组装示例

```js
import Fastify from 'fastify';

const app = Fastify({ logger: true });

// 1) 日志（全局 onRequest）
app.addHook('onRequest', async (req) => {
  req.log.info({ method: req.method, url: req.url });
});

// 2) 统一响应包裹（onSend 改写 payload）
app.addHook('onSend', async (req, reply, payload) => {
  if (typeof payload === 'string' && payload.startsWith('{')) {
    return JSON.stringify({ ok: true, code: 0, data: JSON.parse(payload) });
  }
  return payload;
});

// 3) 鉴权（路由级 preHandler）
app.decorate('authed', async (req, reply) => {
  if (!req.headers['x-token']) {
    reply.code(401).send({ ok: false, message: 'missing token' });
  }
});

app.get('/', { preHandler: [app.authed] }, async () => ({ hello: 'world' }));

await app.listen({ port: 3000 });
```

---

## 常见问题

### Q1: 钩子里 `reply.send()` 后 next 钩子还会执行吗？

不会。`reply.send()` 之后，同一阶段的后续普通钩子被短路，请求直接进入发送流程。

### Q2: `preHandler` 数组和单独注册的区别？

数组是路由级的、只在当前路由生效；`addHook('preHandler')` 是全局生效。推荐在封装插件里用 `addHook` 统一管理。

### Q3: 如何区分「全局统一处理」与「单路由特殊处理」？

全局放 `addHook`，特殊逻辑放路由选项的 `preHandler/preValidation` 数组，二者组合即可覆盖绝大多数场景。

---

## 下一步学习

- [日志、错误处理与生产实践](06-日志、错误处理与生产实践.md)：把钩子与日志、错误处理、优雅关闭结合部署
- [实战项目](07-Fastify实战项目.md)：在一个真实 API 中综合运用生命周期钩子