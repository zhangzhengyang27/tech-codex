---
title: RESTful API 设计规范
description: 本文档定义了 RESTful API 的设计规范和最佳实践，涵盖协议与域名、版本管理、资源路径命名、HTTP 方法与状态码、查询参数、响应与错误格式、认证与 CORS 等，旨在帮助开发者设计出结构清晰、易于理解、便于维护的 API 接口。
keywords: [Node.js, 网络编程, RESTfulAPI]
category: Node.js
tags: [Node.js, 网络编程]
---







# RESTful API 设计规范

## 文档概述

本规范从协议、域名、版本、路径命名等基础约定出发，逐项规定 HTTP 方法的语义与幂等性、查询参数（分页/排序/过滤）、统一响应与错误格式、状态码使用流程、JWT/OAuth/API Key 认证以及 CORS 跨域处理，并以用户管理 API 为例给出完整设计与实现示例。遵循这些规范可以确保 API 的一致性、可预测性和可用性。

### 适用范围

- Web API 接口设计
- 微服务间通信
- 前后端数据交互
- 第三方开放平台接口

## RESTful 架构简介

REST（Representational State Transfer，表述性状态转移）是一种软件架构风格，用于设计网络应用程序。RESTful API 是符合 REST 架构约束的 Web API。

### 核心特性

| 特性 | 说明 |
|------|------|
| **无状态** | 每个请求包含所有必要信息，服务器不保存客户端上下文 |
| **统一接口** | 使用标准的 HTTP 方法和状态码，接口设计一致 |
| **资源导向** | URL 表示资源，通过 HTTP 方法操作资源 |
| **分层系统** | 客户端无需知道连接的是最终服务器还是中间层 |
| **可缓存** | 响应数据可被缓存以提高性能 |

### RESTful 与传统 API 对比

```
传统 API:
GET  /getUsers
POST /createUser
POST /deleteUser?id=123

RESTful API:
GET    /users        # 获取用户列表
POST   /users        # 创建新用户
DELETE /users/123    # 删除指定用户
```

## 基础规范

### 1. 协议

API 与客户端的通信协议应始终使用 **HTTPS**，确保数据传输安全。

```
✅ 推荐: https://api.example.com
❌ 避免: http://api.example.com
```

### 2. 域名设计

#### 专用域名（推荐）

将 API 部署在专用子域名下，便于管理和扩展：

```
https://api.example.com
```

#### 主域名子路径

对于简单的 API，可放在主域名下：

```
https://example.org/api/
```

#### 多版本共存

```
https://api.example.com/v1/
https://api.example.com/v2/
```

### 3. 版本管理

#### URL 版本控制（推荐）

将版本号放入 URL 中，直观明了：

```
https://api.example.com/v1/users
https://api.example.com/v2/users
```

#### 请求头版本控制

通过 HTTP Header 指定版本：

```http
GET /users HTTP/1.1
Host: api.example.com
Accept: application/vnd.example.v1+json
```

#### 版本策略建议

| 场景 | 策略 |
|------|------|
| 新功能添加 | 原版本兼容，无需升级 |
| 接口修改 | 发布新版本，保留旧版本 |
| 接口废弃 | 提前通知，设置过渡期 |

### 4. 路径设计

#### 基本原则

- 使用**名词**表示资源，避免动词
- 使用**复数**形式
- 使用**小写字母**和连字符
- 避免深层嵌套（建议不超过3层）

#### 路径规范示例

```
✅ 正确示例:
GET    /zoos              # 动物园集合
GET    /zoos/123          # 特定动物园
GET    /zoos/123/animals  # 特定动物园的动物集合
GET    /animals?zoo_id=123 # 通过查询参数筛选

❌ 错误示例:
GET    /getZoos           # 不应包含动词
GET    /zoo               # 应使用复数形式
GET    /Zoos              # 应使用小写
GET    /zoos/123/animals/456/keepers  # 嵌套过深
```

#### 资源关系表达

```
# 一对多关系
GET    /zoos/123/animals          # 获取动物园123的所有动物
POST   /zoos/123/animals          # 在动物园123中添加动物

# 多对多关系
GET    /students/123/courses      # 获取学生123的所有课程
GET    /courses/456/students      # 获取课程456的所有学生
```

## HTTP 方法详解

### 标准方法

| HTTP 方法 | 对应 SQL | 操作类型 | 幂等性 | 安全性 | 说明 |
|-----------|----------|----------|--------|--------|------|
| **GET** | SELECT | 读取 | 是 | 是 | 获取资源，不应修改服务器状态 |
| **POST** | INSERT | 创建 | 否 | 否 | 新建资源，非幂等 |
| **PUT** | UPDATE | 完整更新 | 是 | 否 | 更新资源的全部属性 |
| **PATCH** | UPDATE | 部分更新 | 否 | 否 | 更新资源的部分属性 |
| **DELETE** | DELETE | 删除 | 是 | 否 | 删除资源 |

### 扩展方法

| HTTP 方法 | 说明 |
|-----------|------|
| **HEAD** | 获取资源元数据（不返回响应体） |
| **OPTIONS** | 获取资源支持的 HTTP 方法 |

### 使用示例

```
# 资源集合操作
GET    /zoos              # 列出所有动物园
POST   /zoos              # 新建一个动物园

# 单个资源操作
GET    /zoos/123          # 获取ID为123的动物园信息
PUT    /zoos/123          # 更新ID为123的动物园（完整更新）
PATCH  /zoos/123          # 更新ID为123的动物园（部分更新）
DELETE /zoos/123          # 删除ID为123的动物园

# 子资源操作
GET    /zoos/123/animals  # 获取动物园123的所有动物
POST   /zoos/123/animals  # 在动物园123中创建新动物
DELETE /zoos/123/animals/456  # 删除动物园123中ID为456的动物

# 条件查询
GET    /animals?zoo_id=123&species=tiger  # 查询特定动物园的老虎
```

## 查询参数规范

### 分页参数

```
GET /users?page=2&per_page=20
GET /users?offset=20&limit=20
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` | integer | 当前页码（从1开始） |
| `per_page` | integer | 每页记录数 |
| `offset` | integer | 偏移量（从0开始） |
| `limit` | integer | 返回记录数量 |

### 排序参数

```
GET /users?sortby=created_at&order=desc
GET /users?sort=+name,-created_at  # 多字段排序
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `sortby` | string | 排序字段 |
| `order` | string | 排序方向（asc/desc） |
| `sort` | string | 组合排序（+升序，-降序） |

### 过滤参数

```
GET /animals?species=tiger&age_gte=3
GET /users?status=active&role=admin
```

| 操作符 | 说明 | 示例 |
|--------|------|------|
| `_eq` | 等于 | `age_eq=18` |
| `_ne` | 不等于 | `status_ne=deleted` |
| `_gt` | 大于 | `price_gt=100` |
| `_gte` | 大于等于 | `age_gte=18` |
| `_lt` | 小于 | `price_lt=1000` |
| `_lte` | 小于等于 | `age_lte=60` |
| `_like` | 模糊匹配 | `name_like=john` |
| `_in` | 包含于 | `id_in=1,2,3` |

### 字段选择

```
GET /users?fields=id,name,email
```

### 搜索参数

```
GET /users?q=john
GET /products?search=phone&fields=name,description
```

## 响应格式规范

### 响应头设置

```http
Content-Type: application/json; charset=utf-8
```

### 成功响应格式

#### 单个资源

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 123,
    "name": "北京动物园",
    "location": "北京市西城区",
    "created_at": "2024-01-15T08:30:00Z"
  }
}
```

#### 资源列表

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 123,
      "name": "北京动物园"
    },
    {
      "id": 124,
      "name": "上海动物园"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}
```

#### 创建资源响应

```json
HTTP/1.1 201 Created
Location: https://api.example.com/v1/zoos/125

{
  "code": 201,
  "message": "created",
  "data": {
    "id": 125,
    "name": "新动物园",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

#### 删除资源响应

```json
HTTP/1.1 204 No Content
```

### 操作响应规范总结

| 操作 | HTTP 状态码 | 响应体 |
|------|-------------|--------|
| GET /collection | 200 OK | 资源列表 + 分页信息 |
| GET /collection/:id | 200 OK | 单个资源对象 |
| POST /collection | 201 Created | 新创建的资源对象 |
| PUT /collection/:id | 200 OK | 更新后的完整资源对象 |
| PATCH /collection/:id | 200 OK | 更新后的完整资源对象 |
| DELETE /collection/:id | 204 No Content | 无响应体 |

## HTTP 状态码规范

### 2xx 成功状态码

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| **200 OK** | 请求成功 | GET、PUT、PATCH 成功 |
| **201 Created** | 创建成功 | POST 创建资源成功 |
| **202 Accepted** | 已接受请求 | 异步处理任务 |
| **204 No Content** | 无内容 | DELETE 成功 |

### 3xx 重定向状态码

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| **301 Moved Permanently** | 永久重定向 | 资源 URL 变更 |
| **302 Found** | 临时重定向 | 临时资源转移 |
| **304 Not Modified** | 未修改 | 缓存有效 |

### 4xx 客户端错误

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| **400 Bad Request** | 请求参数错误 | 参数格式不正确 |
| **401 Unauthorized** | 未认证 | 缺少或无效的身份认证 |
| **403 Forbidden** | 禁止访问 | 无权限访问该资源 |
| **404 Not Found** | 资源不存在 | 请求的资源未找到 |
| **405 Method Not Allowed** | 方法不允许 | 不支持的 HTTP 方法 |
| **406 Not Acceptable** | 不可接受 | 请求格式不支持 |
| **409 Conflict** | 冲突 | 资源状态冲突 |
| **410 Gone** | 已删除 | 资源已被永久删除 |
| **415 Unsupported Media Type** | 媒体类型不支持 | Content-Type 不支持 |
| **422 Unprocessable Entity** | 无法处理 | 语义错误 |
| **429 Too Many Requests** | 请求过多 | 触发限流 |

### 5xx 服务器错误

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| **500 Internal Server Error** | 服务器内部错误 | 未知的服务器错误 |
| **502 Bad Gateway** | 网关错误 | 上游服务不可用 |
| **503 Service Unavailable** | 服务不可用 | 服务维护或过载 |
| **504 Gateway Timeout** | 网关超时 | 上游服务响应超时 |

### 状态码使用流程图

```
请求 → 认证检查 → 权限检查 → 参数验证 → 业务处理 → 响应
        ↓           ↓           ↓           ↓
      401         403         400/422      200/201/204
                                          或 500
```

## 错误处理规范

### 错误响应格式

```json
{
  "code": 400,
  "message": "请求参数错误",
  "error": "INVALID_PARAMETER",
  "details": [
    {
      "field": "email",
      "message": "邮箱格式不正确"
    },
    {
      "field": "password",
      "message": "密码长度至少8位"
    }
  ],
  "request_id": "req_abc123xyz",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 错误响应示例

#### 参数验证错误

```json
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "code": 400,
  "message": "请求参数验证失败",
  "error": "VALIDATION_ERROR",
  "details": [
    {
      "field": "name",
      "message": "名称不能为空",
      "value": ""
    }
  ]
}
```

#### 认证失败

```json
HTTP/1.1 401 Unauthorized
Content-Type: application/json
WWW-Authenticate: Bearer realm="api"

{
  "code": 401,
  "message": "认证失败",
  "error": "AUTHENTICATION_FAILED",
  "details": "Token 已过期，请重新登录"
}
```

#### 权限不足

```json
HTTP/1.1 403 Forbidden
Content-Type: application/json

{
  "code": 403,
  "message": "权限不足",
  "error": "PERMISSION_DENIED",
  "details": "您没有权限执行此操作"
}
```

#### 资源不存在

```json
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "code": 404,
  "message": "资源不存在",
  "error": "RESOURCE_NOT_FOUND",
  "details": "动物园 ID 999 不存在"
}
```

#### 业务逻辑错误

```json
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{
  "code": 422,
  "message": "无法处理请求",
  "error": "BUSINESS_ERROR",
  "details": "该动物园仍有动物，无法删除"
}
```

### 错误码定义表

| 错误码 | 错误类型 | 说明 |
|--------|----------|------|
| `VALIDATION_ERROR` | 验证错误 | 请求参数验证失败 |
| `AUTHENTICATION_FAILED` | 认证失败 | 身份认证失败 |
| `TOKEN_EXPIRED` | Token过期 | 访问令牌已过期 |
| `PERMISSION_DENIED` | 权限拒绝 | 无操作权限 |
| `RESOURCE_NOT_FOUND` | 资源不存在 | 请求的资源未找到 |
| `RESOURCE_CONFLICT` | 资源冲突 | 资源状态冲突 |
| `RATE_LIMIT_EXCEEDED` | 限流 | 请求频率超限 |
| `INTERNAL_ERROR` | 内部错误 | 服务器内部错误 |

## 身份认证

### JWT 认证方式

#### 请求格式

```http
GET /users HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Token 结构

JWT Token 由三部分组成：

```
Header.Payload.Signature
```

| 部分 | 说明 |
|------|------|
| Header | 令牌类型和签名算法 |
| Payload | 用户信息和元数据 |
| Signature | 签名，用于验证令牌完整性 |

### OAuth 2.0 认证

```
# 获取授权码
GET /oauth/authorize?
    response_type=code&
    client_id=CLIENT_ID&
    redirect_uri=REDIRECT_URI&
    scope=read

# 获取访问令牌
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTHORIZATION_CODE&
client_id=CLIENT_ID&
client_secret=CLIENT_SECRET
```

### API Key 认证

```http
GET /api/v1/users HTTP/1.1
Host: api.example.com
X-API-Key: your-api-key-here
```

## 跨域处理（CORS）

### CORS 响应头设置

```http
Access-Control-Allow-Origin: https://example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 86400
```

### Node.js Express CORS 配置示例

```javascript
const cors = require('cors');

app.use(cors({
  origin: ['https://example.com', 'https://admin.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
}));
```

### 预检请求处理

```http
OPTIONS /api/v1/users HTTP/1.1
Host: api.example.com
Origin: https://example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```

## 完整示例

### 用户管理 API 设计

#### API 端点列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/users` | 获取用户列表 |
| GET | `/users/:id` | 获取用户详情 |
| POST | `/users` | 创建用户 |
| PUT | `/users/:id` | 完整更新用户 |
| PATCH | `/users/:id` | 部分更新用户 |
| DELETE | `/users/:id` | 删除用户 |

#### 示例请求与响应

**1. 获取用户列表**

```http
GET /v1/users?page=1&per_page=20&status=active&sortby=created_at&order=desc HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

响应：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "username": "zhang_san",
      "email": "zhangsan@example.com",
      "status": "active",
      "created_at": "2024-01-10T08:00:00Z"
    },
    {
      "id": 2,
      "username": "li_si",
      "email": "lisi@example.com",
      "status": "active",
      "created_at": "2024-01-09T10:30:00Z"
    }
  ],
  "meta": {
    "total": 100,
    "page": 1,
    "per_page": 20,
    "total_pages": 5
  }
}
```

**2. 创建用户**

```http
POST /v1/users HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "username": "wang_wu",
  "email": "wangwu@example.com",
  "password": "SecurePass123!",
  "role": "user"
}
```

响应：

```json
HTTP/1.1 201 Created
Location: https://api.example.com/v1/users/3

{
  "code": 201,
  "message": "created",
  "data": {
    "id": 3,
    "username": "wang_wu",
    "email": "wangwu@example.com",
    "role": "user",
    "status": "active",
    "created_at": "2024-01-15T10:00:00Z"
  }
}
```

**3. 部分更新用户**

```http
PATCH /v1/users/3 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "email": "newemail@example.com"
}
```

响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 3,
    "username": "wang_wu",
    "email": "newemail@example.com",
    "role": "user",
    "status": "active",
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

**4. 删除用户**

```http
DELETE /v1/users/3 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

响应：

```json
HTTP/1.1 204 No Content
```

## 最佳实践

### 1. API 命名规范

```
✅ 推荐:
/users                    # 小写复数名词
/user-profiles            # 多词用连字符
/orders/123/items         # 清晰的层级关系

❌ 避免:
/Users                    # 大写
/user                     # 单数
/userProfiles             # 驼峰命名
/getUsers                 # 包含动词
```

### 2. 使用名词而非动词

```
✅ RESTful 风格:
GET    /users            # 获取用户列表
POST   /users            # 创建用户
DELETE /users/123        # 删除用户

❌ RPC 风格:
GET    /getUsers
POST   /createUser
POST   /deleteUser?id=123
```

### 3. 合理使用 HTTP 状态码

```javascript
// ✅ 正确做法：使用语义化的状态码
res.status(201).json(newResource);  // 创建成功
res.status(204).send();              // 删除成功，无返回内容

// ❌ 错误做法：所有响应都返回 200
res.status(200).json({ code: 201, data: newResource });
res.status(200).json({ code: 404, error: 'Not found' });
```

### 4. 版本兼容性

```javascript
// 保持向后兼容的策略
// v1 版本响应
{
  "id": 123,
  "name": "张三"
}

// v2 版本响应（添加新字段，保持旧字段）
{
  "id": 123,
  "name": "张三",
  "full_name": "张三",
  "nickname": "小张"
}
```

### 5. 分页与性能优化

```javascript
// ✅ 推荐：使用游标分页（大数据量场景）
GET /messages?cursor=abc123&limit=20

// ✅ 推荐：限制单页数量
GET /users?per_page=20  // 最大不超过100

// ❌ 避免：深度分页
GET /users?page=10000  // 性能问题
```

### 6. HATEOAS（超媒体作为应用状态引擎）

```json
{
  "data": {
    "id": 123,
    "name": "北京动物园"
  },
  "links": {
    "self": "/zoos/123",
    "animals": "/zoos/123/animals",
    "employees": "/zoos/123/employees"
  }
}
```

### 7. 缓存策略

```http
# 响应头设置缓存
Cache-Control: public, max-age=3600
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Last-Modified: Wed, 15 Jan 2024 10:00:00 GMT

# 条件请求
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"
```

### 8. 限流策略

```http
# 响应头包含限流信息
X-RateLimit-Limit: 100        # 时间窗口内最大请求数
X-RateLimit-Remaining: 95     # 剩余请求数
X-RateLimit-Reset: 1642234567 # 重置时间戳

# 超限时返回 429
HTTP/1.1 429 Too Many Requests
Retry-After: 60
```

## 常见问题（FAQ）

### Q1: PUT 和 PATCH 有什么区别？

| 方法 | 说明 | 示例 |
|------|------|------|
| **PUT** | 完整更新，需提供所有字段 | `{"name":"新名称","age":25,"email":"..."}` |
| **PATCH** | 部分更新，只提供修改字段 | `{"name":"新名称"}` |

### Q2: 如何处理批量操作？

```http
# 方式1：POST 请求体包含数组
POST /users/batch
Content-Type: application/json

{
  "users": [
    {"name": "用户1"},
    {"name": "用户2"}
  ]
}

# 方式2：使用查询参数
POST /users/activate?ids=1,2,3
```

### Q3: 如何处理文件上传？

```http
POST /upload HTTP/1.1
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="example.jpg"
Content-Type: image/jpeg

[binary data]
------WebKitFormBoundary--
```

响应：

```json
{
  "code": 201,
  "data": {
    "url": "https://cdn.example.com/files/abc123.jpg",
    "filename": "example.jpg",
    "size": 102400,
    "mime_type": "image/jpeg"
  }
}
```

### Q4: 如何处理长时间操作？

```http
# 创建异步任务
POST /exports
Content-Type: application/json

{
  "type": "users",
  "format": "xlsx"
}

# 响应返回任务ID
HTTP/1.1 202 Accepted
Location: /tasks/abc123

{
  "code": 202,
  "data": {
    "task_id": "abc123",
    "status": "pending",
    "estimated_time": 300
  }
}

# 轮询任务状态
GET /tasks/abc123

{
  "code": 200,
  "data": {
    "task_id": "abc123",
    "status": "completed",
    "progress": 100,
    "result_url": "/downloads/export_abc123.xlsx"
  }
}
```

### Q5: 如何设计搜索 API？

```http
# 简单搜索
GET /users?q=zhang

# 高级搜索
GET /users?filter=name:like:zhang;age:gte:18;status:eq:active
      &sort=-created_at
      &fields=id,name,email
```

### Q6: 如何处理软删除？

```http
# 删除时添加 deleted_at 标记
DELETE /users/123

# 响应
HTTP/1.1 204 No Content

# 获取已删除记录
GET /users?include_deleted=true

# 永久删除
DELETE /users/123?force=true
```

### Q7: 如何处理关联资源？

```http
# 获取用户的所有订单
GET /users/123/orders

# 创建订单并关联用户
POST /users/123/orders
Content-Type: application/json

{
  "product_id": 456,
  "quantity": 2
}

# 更新关联关系
PUT /users/123/roles
Content-Type: application/json

{
  "role_ids": [1, 2, 3]
}
```

## 参考资料

### 官方文档

- [RESTful Web Services](https://restfulapi.net/)
- [HTTP/1.1 Semantics and Content (RFC 7231)](https://tools.ietf.org/html/rfc7231)
- [JSON API Specification](https://jsonapi.org/)

### 相关工具

- [Swagger/OpenAPI](https://swagger.io/) - API 文档生成
- [Postman](https://www.postman.com/) - API 测试工具
- [JWT.io](https://jwt.io/) - JWT Token 调试

### 相关文档

- [CORS 跨域资源共享](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS)

---

## Node.js 22+ RESTful API 新特性

### 原生 fetch 简化 API 测试

Node.js 22+ 内置 `fetch`，可直接在脚本中测试 API：

```javascript
// 测试 RESTful API
const BASE_URL = 'http://localhost:3000/api'

// GET 请求
const users = await fetch(`${BASE_URL}/users`).then(r => r.json())

// POST 请求
const newUser = await fetch(`${BASE_URL}/users`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' })
}).then(r => r.json())

// PUT 请求
const updated = await fetch(`${BASE_URL}/users/1`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice Updated' })
}).then(r => r.json())

// DELETE 请求
await fetch(`${BASE_URL}/users/1`, { method: 'DELETE' })
```

### node:test 测试 API

```javascript
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

describe('用户 API', () => {
  it('GET /users 返回用户列表', async () => {
    const response = await fetch('http://localhost:3000/api/users')
    assert.strictEqual(response.status, 200)
    const data = await response.json()
    assert.ok(Array.isArray(data))
  })

  it('POST /users 创建用户', async () => {
    const response = await fetch('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User' })
    })
    assert.strictEqual(response.status, 201)
  })
})
```
