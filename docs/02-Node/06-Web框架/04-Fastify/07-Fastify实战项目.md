---
title: Fastify 实战：搭建一个带 JWT 鉴权的用户管理 API
description: 综合运用路由、Schema 校验、插件封装、生命周期钩子与错误处理构建一个生产级用户管理 API
keywords: [Node.js, Web框架, Fastify, JWT, 实战, 鉴权]
category: Node.js
tags: [Node.js, Web框架]
---


# Fastify 实战：搭建一个带 JWT 鉴权的用户管理 API

本实战把本系列前面的知识点串起来，构建一个带 **JWT 鉴权** 的用户管理 RESTful API，结构上采用「插件封装 + 分层」的最佳实践，可直接作为项目脚手架。

> **前置知识**：建议先按顺序阅读本系列的 [路由与 Handler](02-Fastify路由与Handler.md)、[Schema 校验](03-Schema校验与响应序列化.md)、[插件与封装](04-插件与封装机制.md)、[钩子](05-钩子Hooks与生命周期.md)、[生产实践](06-日志、错误处理与生产实践.md)。

## 一、项目结构

```
fastify-user-api/
├── package.json
├── src/
│   ├── app.js                # 组装应用入口
│   ├── server.js             # 启动 + 优雅关闭
│   ├── config.js             # 环境配置
│   ├── plugins/
│   │   ├── support.js        # 公共工具（fastify-plugin）
│   │   ├── jwt.js            # JWT 鉴权插件
│   │   └── db.js             # 内存数据库插件（演示）
│   ├── routes/
│   │   ├── auth.js           # 登录/注册
│   │   ├── users.js          # 用户 CRUD（需鉴权）
│   │   └── root.js           # 健康检查
│   └── services/
│       └── userService.js    # 业务逻辑
```

## 二、环境配置 `src/config.js`

```js
export default {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
```

## 三、公共插件（`fastify-plugin` 提升为全局）

```js
// src/plugins/support.js
import fp from 'fastify-plugin';

export default fp(async function supportPlugin(app, opts) {
  // 给 reply 增加统一业务错误方法
  app.decorateReply('fail', function (code, message, statusCode = 400) {
    return this.code(statusCode).send({ ok: false, code, message });
  });
  // 给 req 增加成功包装读法（序列化阶段再加，见 onSend）
}, { name: 'support' });
```

## 四、数据库插件 `src/plugins/db.js`

用内存 Map 模拟持久化，便于专注框架能力：

```js
import fp from 'fastify-plugin';

export default fp(async function dbPlugin(app) {
  const users = new Map();
  let seq = 0;

  app.decorate('db', {
    async createUser({ name, password }) {
      const id = String(++seq);
      const user = { id, name, password, createdAt: Date.now() };
      users.set(id, user);
      return user;
    },
    async findUserById(id) {
      return users.get(id);
    },
    async findUserByName(name) {
      return [...users.values()].find(u => u.name === name);
    },
    async deleteUser(id) {
      return users.delete(id);
    },
  });

  app.addHook('onClose', async () => {
    app.log.info('db closed');
  });
}, { name: 'db' });
```

## 五、JWT 鉴权插件 `src/plugins/jwt.js`

```js
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';

export default fp(async function jwtPlugin(app, opts) {
  await app.register(jwt, { secret: app.config.JWT_SECRET });

  // 解析 Bearer token 并注入 req.user
  app.decorate('authenticate', async (req, reply) => {
    try {
      await req.jwtVerify();
    } catch (err) {
      if (err.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
        return reply.fail('AUTH_MISSING', '缺少登录凭证', 401);
      }
      return reply.fail('AUTH_INVALID', '登录已失效，请重新登录', 401);
    }
  });
}, { name: 'jwt' });
```

## 六、用户业务层 `src/services/userService.js`

```js
export class UserService {
  constructor(db) {
    this.db = db;
  }

  async register({ name, password }) {
    if (await this.db.findUserByName(name)) {
      const err = new Error(`用户名 ${name} 已存在`);
      err.code = 'USER_EXISTS';
      err.statusCode = 409;
      throw err;
    }
    // 演示：生产请用 bcrypt 哈希后存储
    return this.db.createUser({ name, password });
  }

  async login({ name, password }) {
    const user = await this.db.findUserByName(name);
    if (!user || user.password !== password) {
      const err = new Error('用户名或密码错误');
      err.code = 'BAD_CREDENTIALS';
      err.statusCode = 401;
      throw err;
    }
    return user;
  }
}
```

## 七、注册健康检查路由 `src/routes/root.js`

```js
export default async function rootRoutes(app) {
  app.get('/', async () => ({
    name: 'fastify-user-api',
    version: '1.0.0',
    status: 'ok',
    uptime: process.uptime(),
  }));
}
```

## 八、认证路由 `src/routes/auth.js`

```js
export default async function authRoutes(app) {
  const svc = new UserService(app.db);

  const replySchema = {
    type: 'object',
    properties: {
      ok: { type: 'boolean' },
      token: { type: 'string' },
      user: {
        type: 'object',
        properties: { id: { type: 'string' }, name: { type: 'string' } },
      },
    },
  };

  app.post('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'password'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 20 },
          password: { type: 'string', minLength: 6 },
        },
      },
      response: { '2xx': replySchema },
    },
    handler: async (req) => {
      const user = await svc.register(req.body);
      const token = app.jwt.sign({ sub: user.id, name: user.name });
      return { ok: true, token, user: { id: user.id, name: user.name } };
    },
  });

  app.post('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'password'],
        properties: { name: { type: 'string' }, password: { type: 'string' } },
      },
      response: { '2xx': replySchema },
    },
    handler: async (req) => {
      const user = await svc.login(req.body);
      const token = app.jwt.sign({ sub: user.id, name: user.name });
      return { ok: true, token, user: { id: user.id, name: user.name } };
    },
  });
}
```

## 九、受保护的用户路由 `src/routes/users.js`

```js
export default async function userRoutes(app) {
  const svc = new UserService(app.db);

  // 本路由下所有接口都需鉴权
  app.addHook('preHandler', app.authenticate);

  app.get('/me', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            createdAt: { type: 'number' },
          },
        },
      },
    },
    handler: async (req) => {
      const user = await app.db.findUserById(req.user.sub);
      if (!user) throw Object.assign(new Error('用户不存在'), { statusCode: 404 });
      return user;
    },
  });

  app.delete('/me', {
    schema: {
      response: {
        200: { type: 'object', properties: { ok: { type: 'boolean' } } },
      },
    },
    handler: async (req) => {
      await app.db.deleteUser(req.user.sub);
      return { ok: true };
    },
  });
}
```

## 十、组装应用 `src/app.js`

```js
import Fastify from 'fastify';
import cors from '@fastify/cors';
import config from './config.js';

export async function buildApp(opts = {}) {
  const app = Fastify({ logger: { level: config.LOG_LEVEL }, ...opts });
  app.decorate('config', config);

  // 全局错误处理
  app.setErrorHandler((err, req, reply) => {
    const statusCode = err.statusCode || 500;
    req.log.error({ err }, 'error');
    if (statusCode >= 500) {
      return reply.code(statusCode).send({
        ok: false,
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'development' ? err.message : '服务器内部错误',
      });
    }
    return reply.code(statusCode).send({
      ok: false,
      code: err.code || 'ERROR',
      message: err.message,
    });
  });

  // 插件（顺序依赖：support → db → jwt）
  await app.register(import('./plugins/support.js'));
  await app.register(import('./plugins/db.js'));
  await app.register(import('./plugins/jwt.js'));

  // 路由
  await app.register(import('./routes/root.js'));
  await app.register(import('./routes/auth.js'), { prefix: '/api/auth' });
  await app.register(import('./routes/users.js'), { prefix: '/api/users' });

  return app;
}
```

## 十一、启动入口 `src/server.js`

```js
import { buildApp } from './app.js';

const app = await buildApp();

await app.listen({ port: app.config.PORT, host: '0.0.0.0' });
app.log.info(`listening on ${app.config.PORT}`);

async function shutdown(signal) {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

## 十二、启动与验证

```bash
node src/server.js
```

```bash
# 注册
curl -X POST localhost:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"alice","password":"123456"}'

# 登录获取 token
curl -X POST localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"name":"alice","password":"123456"}'

# 带 token 访问受保护接口
curl localhost:3000/api/users/me \
  -H 'Authorization: Bearer <token>'

# 不带 token → 401 AUTH_MISSING
curl localhost:3000/api/users/me
```

## 十三、项目要点回顾

| 能力 | 用到的知识点 |
|------|--------------|
| 路由注册与前缀 | `app.register(routes, { prefix })` + Radix Tree 路由 |
| 入参/出参约束 | 路由 `schema` 校验 + 响应序列化（Schema 篇） |
| 组件复用与隔离 | `fastify-plugin` + `decorate`（插件篇） |
| 鉴权拦截 | `preHandler` 钩子 + `@fastify/jwt`（钩子篇） |
| 日志与错误 | Pino + `setErrorHandler`（生产篇） |
| 优雅关闭 | `SIGINT/SIGTERM` → `app.close()` |

如需扩展为真实后端，可将 `db` 插件换成 PostgreSQL/MySQL/MongoDB，并把 `password` 存储改为 `bcrypt`/`argon2` 哈希。至此，Fastify 全系列覆盖完成。