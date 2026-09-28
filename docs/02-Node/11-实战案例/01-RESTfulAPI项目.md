---
title: RESTful API 项目
description: 本文档详细介绍如何使用 Node.js 和 Express 构建一个完整的用户管理 RESTful API 系统。该系统提供了标准的 CRUD（创建、读取、更新、删除）操作，遵循 REST 架构风格设计。
keywords: [Node.js, 实战案例, RESTfulAPI]
category: Node.js
tags: [Node.js, 实战案例]
---







# RESTful API 项目

本文档详细介绍如何使用 Node.js 和 Express 构建一个完整的用户管理 RESTful API 系统。该系统提供了标准的 CRUD（创建、读取、更新、删除）操作，遵循 REST 架构风格设计。

## 项目概述

### 功能特性

- **用户管理**：完整的用户 CRUD 操作
- **统一响应格式**：标准化的 JSON 响应结构
- **错误处理**：全局错误捕获与处理机制
- **数据验证**：请求数据有效性校验
- **可扩展架构**：清晰的分层设计，便于功能扩展

### 技术栈

- **运行环境**：Node.js >= 14.0.0
- **Web 框架**：Express.js
- **数据存储**：支持内存存储/数据库（可扩展）
- **数据格式**：JSON

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端请求                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Express 服务器                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              中间件层 (Middleware)                    │    │
│  │  • JSON 解析                                         │    │
│  │  • 请求日志                                           │    │
│  │  • 错误处理                                           │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              路由层 (Routes)                          │    │
│  │  • 路由定义                                           │    │
│  │  • 路径参数解析                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │            控制器层 (Controllers)                     │    │
│  │  • 业务逻辑处理                                       │    │
│  │  • 请求参数验证                                       │    │
│  │  • 响应数据封装                                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              模型层 (Models)                          │    │
│  │  • 数据结构定义                                       │    │
│  │  • 数据操作方法                                       │    │
│  │  • 数据持久化                                         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      数据存储层                              │
│              (内存/文件/数据库)                               │
└─────────────────────────────────────────────────────────────┘
```

### 架构分层说明

| 层级 | 职责 | 文件位置 |
|------|------|----------|
| 中间件层 | 处理跨切面关注点（日志、错误、验证） | `src/middleware/` |
| 路由层 | 定义 API 端点和 HTTP 方法映射 | `src/routes/` |
| 控制器层 | 实现业务逻辑和请求处理 | `src/controllers/` |
| 模型层 | 定义数据结构和数据操作 | `src/models/` |

## 项目结构

```
user-api/
├── src/
│   ├── controllers/
│   │   └── userController.js    # 用户控制器
│   ├── models/
│   │   └── User.js              # 用户模型
│   ├── routes/
│   │   └── userRoutes.js        # 用户路由定义
│   ├── middleware/
│   │   └── errorHandler.js      # 全局错误处理
│   └── app.js                   # 应用入口
├── package.json                 # 项目配置
└── README.md                    # 项目文档
```

## 核心模块实现

### 1. 应用入口 (app.js)

应用的主入口文件，负责初始化 Express 服务器、配置中间件和挂载路由。

```javascript
const express = require('express');
const userRoutes = require('./routes/userRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// 中间件配置
app.use(express.json());              // 解析 JSON 请求体
app.use(express.urlencoded({ extended: true })); // 解析 URL 编码的请求体

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 挂载路由
app.use('/api/users', userRoutes);

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '请求的资源不存在'
  });
});

// 全局错误处理中间件
app.use(errorHandler);

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`API 文档地址 http://localhost:${PORT}/api/users`);
});

module.exports = app;
```

**配置参数说明：**

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `PORT` | Number | 3000 | 服务器监听端口，可通过环境变量配置 |
| `express.json()` | Middleware | - | 解析 Content-Type 为 application/json 的请求体 |
| `express.urlencoded()` | Middleware | - | 解析 URL 编码的请求体 |

### 2. 路由层 (routes/userRoutes.js)

定义用户相关的 API 路由端点，遵循 RESTful 设计规范。

```javascript
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/users - 获取所有用户列表
router.get('/', userController.getAllUsers);

// GET /api/users/:id - 获取指定用户详情
router.get('/:id', userController.getUserById);

// POST /api/users - 创建新用户
router.post('/', userController.createUser);

// PUT /api/users/:id - 更新用户信息（完整更新）
router.put('/:id', userController.updateUser);

// PATCH /api/users/:id - 部分更新用户信息
router.patch('/:id', userController.patchUser);

// DELETE /api/users/:id - 删除用户
router.delete('/:id', userController.deleteUser);

module.exports = router;
```

**路由设计说明：**

| HTTP 方法 | 路径 | 功能 | 是否幂等 |
|-----------|------|------|----------|
| GET | `/api/users` | 获取用户列表 | 是 |
| GET | `/api/users/:id` | 获取单个用户 | 是 |
| POST | `/api/users` | 创建用户 | 否 |
| PUT | `/api/users/:id` | 完整更新用户 | 是 |
| PATCH | `/api/users/:id` | 部分更新用户 | 否 |
| DELETE | `/api/users/:id` | 删除用户 | 是 |

### 3. 控制器层 (controllers/userController.js)

实现具体的业务逻辑，处理请求参数验证和数据操作。

```javascript
const User = require('../models/User');

/**
 * 获取所有用户
 * @route GET /api/users
 * @returns {Object} 用户列表
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const users = await User.findAll({ page, limit });
    
    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取单个用户
 * @route GET /api/users/:id
 * @param {string} id - 用户ID
 * @returns {Object} 用户详情
 */
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 创建用户
 * @route POST /api/users
 * @body {string} name - 用户名
 * @body {string} email - 邮箱地址
 * @returns {Object} 新创建的用户
 */
exports.createUser = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    
    // 参数验证
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: '姓名和邮箱为必填项',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '邮箱格式不正确',
        code: 'INVALID_EMAIL_FORMAT'
      });
    }
    
    const user = await User.create({ name, email });
    res.status(201).json({
      success: true,
      message: '用户创建成功',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新用户（完整更新）
 * @route PUT /api/users/:id
 * @param {string} id - 用户ID
 * @body {string} name - 用户名
 * @body {string} email - 邮箱地址
 * @returns {Object} 更新后的用户
 */
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: '姓名和邮箱为必填项',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    const user = await User.update(req.params.id, { name, email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }
    res.json({
      success: true,
      message: '用户更新成功',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 部分更新用户
 * @route PATCH /api/users/:id
 * @param {string} id - 用户ID
 * @body {string} [name] - 用户名
 * @body {string} [email] - 邮箱地址
 * @returns {Object} 更新后的用户
 */
exports.patchUser = async (req, res, next) => {
  try {
    const user = await User.update(req.params.id, req.body);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }
    res.json({
      success: true,
      message: '用户更新成功',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 删除用户
 * @route DELETE /api/users/:id
 * @param {string} id - 用户ID
 * @returns {Object} 删除结果
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const result = await User.delete(req.params.id);
    if (!result) {
      return res.status(404).json({
        success: false,
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
    }
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
```

**响应状态码说明：**

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 OK | 请求成功 | GET、PUT、PATCH 成功 |
| 201 Created | 资源创建成功 | POST 成功 |
| 204 No Content | 无内容返回 | DELETE 成功 |
| 400 Bad Request | 请求参数错误 | 参数验证失败 |
| 404 Not Found | 资源不存在 | 用户不存在 |
| 500 Internal Server Error | 服务器错误 | 系统异常 |

### 4. 模型层 (models/User.js)

定义用户数据结构和数据操作方法。

```javascript
// 内存存储示例（生产环境建议使用数据库）
let users = [
  { id: 1, name: 'Alice', email: 'alice@example.com', createdAt: new Date() },
  { id: 2, name: 'Bob', email: 'bob@example.com', createdAt: new Date() }
];
let nextId = 3;

class User {
  /**
   * 查找所有用户
   * @param {Object} options - 查询选项
   * @returns {Array} 用户列表
   */
  static async findAll({ page = 1, limit = 10 }) {
    const start = (page - 1) * limit;
    const end = start + limit;
    return users.slice(start, end);
  }

  /**
   * 根据ID查找用户
   * @param {number} id - 用户ID
   * @returns {Object|null} 用户对象
   */
  static async findById(id) {
    return users.find(u => u.id === parseInt(id)) || null;
  }

  /**
   * 创建用户
   * @param {Object} userData - 用户数据
   * @returns {Object} 新创建的用户
   */
  static async create({ name, email }) {
    const newUser = {
      id: nextId++,
      name,
      email,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    users.push(newUser);
    return newUser;
  }

  /**
   * 更新用户
   * @param {number} id - 用户ID
   * @param {Object} userData - 更新数据
   * @returns {Object|null} 更新后的用户
   */
  static async update(id, userData) {
    const index = users.findIndex(u => u.id === parseInt(id));
    if (index === -1) return null;
    
    users[index] = {
      ...users[index],
      ...userData,
      updatedAt: new Date()
    };
    return users[index];
  }

  /**
   * 删除用户
   * @param {number} id - 用户ID
   * @returns {boolean} 是否删除成功
   */
  static async delete(id) {
    const index = users.findIndex(u => u.id === parseInt(id));
    if (index === -1) return false;
    
    users.splice(index, 1);
    return true;
  }
}

module.exports = User;
```

**用户数据模型：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | Number | 是 | 用户唯一标识（自动生成） |
| `name` | String | 是 | 用户姓名 |
| `email` | String | 是 | 邮箱地址 |
| `createdAt` | Date | 是 | 创建时间（自动生成） |
| `updatedAt` | Date | 否 | 更新时间（自动维护） |

### 5. 错误处理中间件 (middleware/errorHandler.js)

全局错误处理中间件，捕获并统一处理应用中的所有错误。

```javascript
/**
 * 全局错误处理中间件
 * @param {Error} err - 错误对象
 * @param {Request} req - 请求对象
 * @param {Response} res - 响应对象
 * @param {Function} next - 下一个中间件
 */
module.exports = (err, req, res, next) => {
  // 记录错误日志
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // 确定状态码
  const statusCode = err.status || err.statusCode || 500;
  
  // 构建错误响应
  const errorResponse = {
    success: false,
    message: err.message || '服务器内部错误',
    code: err.code || 'INTERNAL_SERVER_ERROR'
  };

  // 开发环境下返回错误堆栈
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details || null;
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * 自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR') {
    super(message);
    this.status = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

// 导出自定义错误类
module.exports.AppError = AppError;
```

**错误类型定义：**

| 错误码 | HTTP 状态码 | 说明 |
|--------|-------------|------|
| `USER_NOT_FOUND` | 404 | 用户不存在 |
| `MISSING_REQUIRED_FIELDS` | 400 | 缺少必填字段 |
| `INVALID_EMAIL_FORMAT` | 400 | 邮箱格式错误 |
| `VALIDATION_ERROR` | 400 | 数据验证失败 |
| `INTERNAL_SERVER_ERROR` | 500 | 服务器内部错误 |

## API 接口文档

### 接口总览

| 方法 | 路径 | 功能 | 请求体 | 响应状态码 |
|------|------|------|--------|------------|
| GET | `/api/users` | 获取用户列表 | - | 200 |
| GET | `/api/users/:id` | 获取单个用户 | - | 200, 404 |
| POST | `/api/users` | 创建用户 | User 对象 | 201, 400 |
| PUT | `/api/users/:id` | 完整更新用户 | User 对象 | 200, 400, 404 |
| PATCH | `/api/users/:id` | 部分更新用户 | 部分字段 | 200, 404 |
| DELETE | `/api/users/:id` | 删除用户 | - | 204, 404 |

### 统一响应格式

**成功响应：**
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

**失败响应：**
```json
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE"
}
```

### 接口详情

#### 1. 获取用户列表

```http
GET /api/users?page=1&limit=10
```

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 10 | 每页数量 |

**响应示例：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Alice",
      "email": "alice@example.com",
      "createdAt": "2024-01-15T08:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1
  }
}
```

#### 2. 获取单个用户

```http
GET /api/users/1
```

**路径参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 用户ID |

**成功响应（200）：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Alice",
    "email": "alice@example.com",
    "createdAt": "2024-01-15T08:30:00.000Z",
    "updatedAt": "2024-01-15T08:30:00.000Z"
  }
}
```

**失败响应（404）：**
```json
{
  "success": false,
  "message": "用户不存在",
  "code": "USER_NOT_FOUND"
}
```

#### 3. 创建用户

```http
POST /api/users
Content-Type: application/json

{
  "name": "Alice",
  "email": "alice@example.com"
}
```

**请求体参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 用户姓名 |
| email | string | 是 | 邮箱地址 |

**成功响应（201）：**
```json
{
  "success": true,
  "message": "用户创建成功",
  "data": {
    "id": 3,
    "name": "Alice",
    "email": "alice@example.com",
    "createdAt": "2024-01-15T09:00:00.000Z"
  }
}
```

**失败响应（400）：**
```json
{
  "success": false,
  "message": "姓名和邮箱为必填项",
  "code": "MISSING_REQUIRED_FIELDS"
}
```

#### 4. 更新用户

```http
PUT /api/users/1
Content-Type: application/json

{
  "name": "Alice Updated",
  "email": "alice.updated@example.com"
}
```

**成功响应（200）：**
```json
{
  "success": true,
  "message": "用户更新成功",
  "data": {
    "id": 1,
    "name": "Alice Updated",
    "email": "alice.updated@example.com",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

#### 5. 删除用户

```http
DELETE /api/users/1
```

**成功响应（204）：**
无内容返回

**失败响应（404）：**
```json
{
  "success": false,
  "message": "用户不存在",
  "code": "USER_NOT_FOUND"
}
```

## 使用示例

### cURL 命令

```bash
# 获取所有用户
curl -X GET http://localhost:3000/api/users

# 获取单个用户
curl -X GET http://localhost:3000/api/users/1

# 创建用户
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'

# 更新用户
curl -X PUT http://localhost:3000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Updated", "email": "alice.updated@example.com"}'

# 删除用户
curl -X DELETE http://localhost:3000/api/users/1
```

### JavaScript (Fetch API)

```javascript
// 获取用户列表
const response = await fetch('http://localhost:3000/api/users');
const users = await response.json();
console.log(users);

// 创建用户
const createResponse = await fetch('http://localhost:3000/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' })
});
const newUser = await createResponse.json();
console.log(newUser);
```

### Axios 示例

```javascript
const axios = require('axios');
const API_URL = 'http://localhost:3000/api';

// 获取用户列表
const users = await axios.get(`${API_URL}/users`);

// 创建用户
const newUser = await axios.post(`${API_URL}/users`, {
  name: 'Alice',
  email: 'alice@example.com'
});

// 更新用户
const updatedUser = await axios.put(`${API_URL}/users/1`, {
  name: 'Alice Updated',
  email: 'alice.updated@example.com'
});

// 删除用户
await axios.delete(`${API_URL}/users/1`);
```

## 最佳实践

### 1. 统一响应格式

所有 API 响应应遵循统一的格式结构，便于客户端处理：

```text
// 成功响应
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}

// 失败响应
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE"
}

// 分页响应
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

### 2. 输入验证

在控制器层实现参数验证，确保数据有效性：

```javascript
// 使用 Joi 或 express-validator 进行验证
const Joi = require('joi');

const userSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required()
});

// 验证中间件
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message,
      code: 'VALIDATION_ERROR'
    });
  }
  next();
};
```

### 3. 错误处理

实现全局错误处理机制，区分不同类型的错误：

```javascript
// 业务错误
throw new AppError('用户不存在', 404, 'USER_NOT_FOUND');

// 验证错误
throw new AppError('参数验证失败', 400, 'VALIDATION_ERROR');

// 系统错误
throw new AppError('数据库连接失败', 500, 'DATABASE_ERROR');
```

### 4. 日志记录

使用专业日志库记录应用运行信息：

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// 使用
logger.info('用户创建成功', { userId: user.id });
logger.error('数据库错误', { error: err.message });
```

### 5. API 文档

使用 Swagger/OpenAPI 自动生成 API 文档：

```javascript
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: { title: 'User API', version: '1.0.0' }
  },
  apis: ['./src/routes/*.js']
};

const specs = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
```

### 6. 单元测试

编写全面的单元测试和集成测试：

```javascript
const request = require('supertest');
const app = require('../app');

describe('User API', () => {
  test('GET /api/users 返回用户列表', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/users 创建新用户', async () => {
    const res = await request(app)
      .post('/api/users')
      .send({ name: 'Test', email: 'test@test.com' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Test');
  });
});
```

### 7. 版本控制

通过 URL 路径实现 API 版本管理：

```javascript
// v1 版本
app.use('/api/v1/users', userRoutesV1);

// v2 版本
app.use('/api/v2/users', userRoutesV2);
```

### 8. 安全措施

实现基本的安全防护：

```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

// 安全头
app.use(helmet());

// CORS 配置
app.use(cors({ origin: process.env.ALLOWED_ORIGINS }));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100 // 每个 IP 最多 100 次请求
});
app.use(limiter);
```

## 项目部署

### 安装依赖

```bash
# 初始化项目
npm init -y

# 安装生产依赖
npm install express

# 安装开发依赖
npm install --save-dev nodemon jest
```

### 环境变量配置

创建 `.env` 文件：

```bash
# .env
NODE_ENV=development
PORT=3000
LOG_LEVEL=info
```

### 启动命令

```bash
# 开发环境
npm run dev

# 生产环境
npm start

# 运行测试
npm test
```

### package.json 配置

```json
{
  "name": "user-api",
  "version": "1.0.0",
  "scripts": {
    "start": "node src/app.js",
    "dev": "nodemon src/app.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "jest": "^29.5.0",
    "nodemon": "^3.0.1"
  }
}
```

## 常见问题解答

### Q1: 如何处理大量数据的分页？

使用数据库的分页功能，避免内存中处理：

```javascript
// MongoDB 示例
const users = await User.find()
  .skip((page - 1) * limit)
  .limit(limit);
```

### Q2: 如何实现用户认证？

使用 JWT 进行用户认证：

```javascript
const jwt = require('jsonwebtoken');

// 生成令牌
const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
  expiresIn: '7d'
});

// 验证中间件
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: '未授权' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: '令牌无效' });
  }
};
```

### Q3: 如何实现文件上传？

使用 multer 中间件处理文件上传：

```javascript
const multer = require('multer');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });
app.post('/api/users/:id/avatar', upload.single('avatar'), controller.uploadAvatar);
```

### Q4: 如何优化 API 性能？

1. 使用缓存（Redis）
2. 数据库索引优化
3. 响应压缩
4. 连接池管理

```javascript
const compression = require('compression');

// 启用压缩
app.use(compression());
```

### Q5: 如何处理并发请求？

使用集群模式充分利用多核 CPU：

```javascript
const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
} else {
  // 启动服务器
  app.listen(PORT);
}
```

## 扩展功能建议

1. **数据库集成**：集成 MongoDB、MySQL 或 PostgreSQL
2. **认证授权**：实现 JWT 认证和权限控制
3. **缓存机制**：使用 Redis 提升性能
4. **消息队列**：集成 RabbitMQ 处理异步任务
5. **监控系统**：添加性能监控和告警
6. **容器化部署**：使用 Docker 进行容器化
7. **CI/CD 流程**：自动化测试和部署流程

## 参考资料

- [Express.js 官方文档](https://expressjs.com/)
- [RESTful API 设计指南](https://restfulapi.net/)
- [Node.js 最佳实践](https://github.com/goldbergyoni/nodebestpractices)
- [Swagger/OpenAPI 规范](https://swagger.io/specification/)
