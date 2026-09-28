---
title: Fastify Schema 校验与响应序列化
description: 基于 JSON Schema 的入参校验、类型强制转换与 fast-json-stringify 响应序列化机制
keywords: [Node.js, Web框架, Fastify, Schema, 校验, 序列化]
category: Node.js
tags: [Node.js, Web框架]
---


# Fastify Schema 校验与响应序列化

区别于 Express/Koa 需要额外引入 `joi/zod` 等校验库，Fastify 把 **JSON Schema 校验**与**预编译响应序列化**内建到路由系统里。它不仅是运行时安全校验，更是 Fastify 高性能的核心来源之一。

> **前置知识**：先阅读 [Fastify 路由与 Handler](02-Fastify路由与Handler.md)。

## 一、为什么需要 Schema

| 能力 | 说明 |
|------|------|
| 入参校验 | 对 `params`/`query`/`body`/`headers` 做类型与结构校验 |
| 类型强制 | 通过 `coerceTypes` 将字符串自动转为目标类型 |
| 响应序列化 | 用 `fast-json-stringify` 预编译序列化函数，跳过运行时反射 |
| 文档化 | 校验规则本身可作为 OpenAPI 文档来源（配合 `@fastify/swagger`） |

> 接入 Schema 后，序列化函数被提前编译为专用代码，通常能带来明显的吞吐提升（具体幅度取决于负载特征，建议以自身压测为准）。

## 二、在路由上声明 Schema

```js
app.post('/users', {
  schema: {
    // 请求体校验
    body: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string', minLength: 2, maxLength: 20 },
        age: { type: 'integer', minimum: 0, maximum: 120 },
      },
      additionalProperties: false,
    },
    // 查询参数
    querystring: {
      type: 'object',
      properties: { page: { type: 'integer', default: 1 } },
    },
    // 路径参数
    params: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
    // 响应序列化（key 是状态码）
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
        },
        required: ['id', 'name'],
      },
      4xx: {
        type: 'object',
        properties: { message: { type: 'string' } },
      },
    },
  },
  handler: async (req) => {
    return { id: Date.now(), name: req.body.name };
  },
});
```

校验失败时，Fastify 自动返回 `400`，响应体形如：

```json
{
  "statusCode": 400,
  "code": "FST_ERR_VALIDATION",
  "error": "Bad Request",
  "message": "body/name must NOT have fewer than 2 characters"
}
```

## 三、AJV 配置与类型强制

Fastify 内置 AJV，可在创建实例时配置：

```js
import Fastify from 'fastify';
import Ajv from 'ajv'; // 可选：自定义实例
import addFormats from 'ajv-formats';

const app = Fastify({
  ajv: {
    customOptions: {
      coerceTypes: true,   // 字符串自动转类型
      removeAdditional: true, // 删除未声明字段
      allErrors: true,     // 收集所有错误而非只报第一个
    },
    plugins: [addFormats], // 启用 format 校验（email/date-time 等）
  },
});
```

### 3.1 使用 `format` 校验

启用 `ajv-formats` 后可在 schema 中使用格式约束：

```js
schema: {
  body: {
    type: 'object',
    required: ['email', 'birthday'],
    properties: {
      email: { type: 'string', format: 'email' },
      birthday: { type: 'string', format: 'date-time' },
    },
  },
}
```

### 3.2 `coerceTypes` 示例

```js
// 请求 /users?page=3 → req.query.page 自动为数字 3
querystring: {
  type: 'object',
  properties: { page: { type: 'integer' } },
}
```

---

## 四、响应序列化原理

当声明了 `schema.response[statusCode]`，Fastify 会把该 schema 交给 `fast-json-stringify` **编译成专用序列化函数**，缓存复用；没有声明的路由则走通用序列化。这意味着：

- 有多少个不同响应 schema，就编译多少个专用序列化器；
- 序列化结果稳定、无动态反射开销。

### 4.1 多个状态码

```js
response: {
  200: { type: 'object', properties: { id: { type: 'integer' } } },
  201: { type: 'object', properties: { id: { type: 'integer' } } },
  default: { type: 'object', properties: { message: { type: 'string' } } },
}
```

`default` 兜底所有未显式声明的状态码。若匹配不到也非 `default`，则退回通用序列化。

### 4.2 自定义序列化器（Serializer）

每个路由可单独指定序列化逻辑：

```js
app.get('/user', {
  schema: { response: { 200: { type: 'object' } } },
  serializerCompiler: ({ schema }) => {
    // 返回一个序列化函数
    return (data) => JSON.stringify(data);
  },
  handler: async () => ({ id: 1, name: 'A', secret: 'x' }),
});
```

### 4.3 隐藏不需要返回的字段

序列化 schema 只列出要返回的字段即可实现「字段裁剪」，例如隐藏内部字段：

```js
response: {
  200: {
    type: 'object',
    properties: { id: { type: 'integer' }, name: { type: 'string' } },
  },
}
// 即使 handler 返回 { id, name, passwordHash }，passwordHash 也不会出现在响应中
```

---

## 五、Schema 与 Fastify 实例的编译缓存

- 相同结构的 schema 会被复用；
- 可用 `app.addSchema()` 全局注册复用片段，配合 `$ref` 引用，减少重复声明：

```js
app.addSchema({
  $id: 'User',
  type: 'object',
  properties: { id: { type: 'integer' }, name: { type: 'string' } },
});

app.get('/users/:id', {
  schema: {
    params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    response: { 200: { $ref: 'User#' } },
  },
  handler: async (req) => ({ id: Number(req.params.id), name: 'Alice' }),
});
```

---

## 六、传入自定义校验函数

有时需要业务化的条件校验，可在 `body` 等 schema 上用 `$data` 关键字，或直接在校验器中写函数：

```js
const app = Fastify({
  schemaErrorFormatter(errors, dataVar) {
    return new Error(`校验失败 ${dataVar}: ${errors[0].message}`);
  },
});
```

更常见的是在 Handler 前的 `preValidation` 钩子里做自定义逻辑（见 [钩子篇](05-钩子Hooks与生命周期.md)）。

---

## 七、Schema 校验在大型项目中的落地

### 7.1 集中管理 schema 文件

```
src/
├── schemas/
│   ├── user.schema.js
│   ├── order.schema.js
│   └── common.js        # 公共 $id 定义
```

### 7.2 用 TS 推断类型增强类型安全

可结合 `json-schema-to-ts` 从 schema 推断出 TypeScript 类型，保证请求体类型与校验规则一致：

```ts
import type { FromSchema } from 'json-schema-to-ts';

const createUserSchema = {
  type: 'object',
  properties: { name: { type: 'string' } },
} as const;

type CreateUserBody = FromSchema<typeof createUserSchema>;
// type CreateUserBody = { name?: string }
```

### 7.3 与 OpenAPI/Swagger 集成

`@fastify/swagger` 会读取每个路由的 `schema` 自动生成 OpenAPI 文档，实现「一处定义、校验与文档共用」。

---

## 八、常见问题

### Q1: 为什么我的 `additionalProperties` 被保留在请求体里？

需在 `ajv.customOptions` 中开启 `removeAdditional: true`，否则只是「忽略」而非「删除」。想直接拒绝额外字段，则保留默认并依靠校验错误提示。

### Q2: `req.query.page` 为什么是字符串？

未开启 `coerceTypes: true`。开启后声明 `type: 'integer'` 即可自动转换。

### Q3: 校验失败想自定义错误格式？

覆盖实例级 `schemaErrorFormatter`，或写成统一错误处理中介（见 [日志与错误处理篇](06-日志、错误处理与生产实践.md)）。

---

## 下一步学习

- [插件与封装机制](04-插件与封装机制.md)：把 Schema 与路由打包成可复用插件
- [钩子 Hooks 与生命周期](05-钩子Hooks与生命周期.md)：在解析/序列化前后插入处理逻辑