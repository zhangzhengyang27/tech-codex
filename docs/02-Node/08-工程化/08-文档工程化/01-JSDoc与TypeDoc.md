---
title: JSDoc 与 TypeDoc
description: 用 JSDoc 注释与 TypeDoc 生成可维护的 API 文档
keywords: [Node.js, 构建, 脚手架, JSDoc, TypeDoc]
category: Node.js
tags: [Node.js, 工程化]
---







# JSDoc 与 TypeDoc

## 概述

JSDoc 和 TypeDoc 是 JavaScript/TypeScript 生态中最主流的文档生成工具。它们通过解析代码中的注释，自动生成结构化的 API 文档，显著提升代码可维护性和团队协作效率。

### 工作原理

```
源代码 (包含注释) 
    ↓
解析器提取注释和类型信息
    ↓
生成中间数据结构
    ↓
应用模板渲染
    ↓
输出 HTML/Markdown 文档
```

### 工具对比

| 特性 | JSDoc | TypeDoc |
|------|-------|---------|
| 适用语言 | JavaScript | TypeScript |
| 类型推断 | 需手动标注 | 自动从 TS 类型推断 |
| 配置复杂度 | 中等 | 较低 |
| 插件生态 | 丰富 | 较丰富 |
| 学习曲线 | 平缓 | 平缓 |
| IDE 支持 | 广泛 | 广泛 |
| 输出格式 | HTML (可扩展) | HTML/Markdown |

---

## JSDoc

### 介绍

JSDoc 是 JavaScript 的标准文档注释规范，用于生成 API 文档和提供 IDE 智能提示。它通过特殊的注释格式（`/** ... */`）为代码添加元信息，支持类型标注、参数说明、返回值描述等功能。

### 安装

```bash
# 使用 pnpm
pnpm add jsdoc -D

# 使用 npm
npm install jsdoc --save-dev

# 使用 yarn
yarn add jsdoc --dev
```

### 核心概念

#### 注释块

JSDoc 注释以 `/**` 开始，以 `*/` 结束，支持多行：

```javascript
/**
 * 这是单行描述
 */

/**
 * 这是多行描述
 * 第二行描述
 * 第三行描述
 */
```

#### 标签（Tags）

标签以 `@` 开头，用于标注特定信息：

```javascript
/**
 * @param {string} name - 参数说明
 * @returns {boolean} 返回值说明
 * @throws {Error} 异常说明
 */
```

### 基础注释

```javascript
/**
 * 计算两个数的和
 * @param {number} a - 第一个数字
 * @param {number} b - 第二个数字
 * @returns {number} 两数之和
 */
function add(a, b) {
  return a + b
}

/**
 * 用户类
 * @class
 * @example
 * const user = new User('John', 'john@example.com')
 */
class User {
  /**
   * 创建用户
   * @param {string} name - 用户名
   * @param {string} email - 邮箱
   */
  constructor(name, email) {
    this.name = name
    this.email = email
  }

  /**
   * 获取用户信息
   * @returns {Object} 用户信息对象
   * @property {string} name - 用户名
   * @property {string} email - 邮箱
   */
  getInfo() {
    return { name: this.name, email: this.email }
  }
}
```

### 常用标签详解

#### 函数相关标签

| 标签 | 说明 | 示例 |
|------|------|------|
| `@param` | 参数说明 | `@param {string} name - 用户名` |
| `@returns` | 返回值说明 | `@returns {boolean} 是否成功` |
| `@throws` | 抛出异常说明 | `@throws {Error} 参数错误` |
| `@async` | 标记异步函数 | `@async` |
| `@function` | 函数声明 | `@function myFunc` |
| `@callback` | 回调类型定义 | `@callback RequestCallback` |

#### 类型相关标签

| 标签 | 说明 | 示例 |
|------|------|------|
| `@typedef` | 自定义类型 | `@typedef {Object} User` |
| `@type` | 变量类型 | `@type {string}` |
| `@enum` | 枚举类型 | `@enum {string}` |
| `@interface` | 接口定义 | `@interface IConfig` |
| `@implements` | 实现接口 | `@implements {IUser}` |

#### 类相关标签

| 标签 | 说明 | 示例 |
|------|------|------|
| `@class` | 类定义 | `@class` |
| `@extends` | 继承关系 | `@extends {BaseClass}` |
| `@constructor` | 构造函数 | `@constructor` |
| `@memberof` | 所属类 | `@memberof User` |
| `@instance` | 实例成员 | `@instance` |
| `@static` | 静态成员 | `@static` |

#### 文档相关标签

| 标签 | 说明 | 示例 |
|------|------|------|
| `@description` | 详细描述 | `@description 这是一个工具函数` |
| `@example` | 示例代码 | `@example add(1, 2)` |
| `@see` | 参考链接 | `@see https://example.com` |
| `@since` | 版本引入 | `@since 1.0.0` |
| `@deprecated` | 已弃用 | `@deprecated 使用 newFunc 替代` |
| `@version` | 版本号 | `@version 2.0.0` |
| `@author` | 作者 | `@author John Doe` |
| `@license` | 许可证 | `@license MIT` |

#### 模块相关标签

| 标签 | 说明 | 示例 |
|------|------|------|
| `@module` | 模块声明 | `@module utils/string` |
| `@exports` | 导出成员 | `@exports addUser` |
| `@namespace` | 命名空间 | `@namespace Utils` |
| `@member` | 模块成员 | `@member {string} version` |

### 标签使用示例

#### 参数类型标注

```javascript
/**
 * 基础类型参数
 * @param {string} name - 字符串类型
 * @param {number} age - 数字类型
 * @param {boolean} isActive - 布尔类型
 */
function setUser(name, age, isActive) {}

/**
 * 数组和对象类型
 * @param {Array<string>} tags - 字符串数组
 * @param {Object} config - 配置对象
 * @param {Object<string, number>} scores - 键值对对象
 */
function init(tags, config, scores) {}

/**
 * 可选参数与默认值
 * @param {string} [name] - 可选参数
 * @param {number} [age=18] - 带默认值的可选参数
 */
function create(name, age) {}

/**
 * 联合类型
 * @param {string|number} id - 字符串或数字
 * @param {'admin'|'user'|'guest'} role - 字面量联合类型
 */
function setRole(id, role) {}

/**
 * 可空类型
 * @param {?string} value - 可为 null 的字符串
 * @param {!string} required - 非空字符串
 */
function process(value, required) {}
```

#### 函数与回调

```javascript
/**
 * 回调函数类型定义
 * @callback RequestCallback
 * @param {Error|null} error - 错误对象，成功时为 null
 * @param {Object} [data] - 返回数据
 * @param {number} [statusCode] - HTTP 状态码
 */

/**
 * 发起请求
 * @param {string} url - 请求地址
 * @param {RequestCallback} callback - 回调函数
 * @returns {void}
 */
function request(url, callback) {}

/**
 * 高阶函数
 * @param {Function} handler - 处理函数
 * @param {function(string, number): boolean} validator - 带类型签名的函数
 */
function register(handler, validator) {}
```

#### 泛型与复杂类型

```javascript
/**
 * 泛型类型定义
 * @template T
 * @typedef {Object} Result<T>
 * @property {boolean} success - 是否成功
 * @property {T} data - 返回数据
 * @property {string} [message] - 提示消息
 */

/**
 * 泛型函数
 * @template T
 * @param {T[]} items - 数组
 * @returns {T} 第一个元素
 */
function first(items) {
  return items[0]
}

/**
 * 多个泛型参数
 * @template T, U
 * @param {T} input - 输入值
 * @param {function(T): U} transformer - 转换函数
 * @returns {U} 转换结果
 */
function transform(input, transformer) {
  return transformer(input)
}
```

### 类型定义

#### 基础类型定义

```javascript
/**
 * 用户对象
 * @typedef {Object} UserObject
 * @property {string} id - 用户ID
 * @property {string} name - 用户名
 * @property {string} [email] - 邮箱（可选）
 * @property {'admin'|'user'} [role='user'] - 角色，默认为 'user'
 */

/**
 * 回调函数类型
 * @callback ResultCallback
 * @param {Error|null} error - 错误对象
 * @param {UserObject} [user] - 用户对象
 */

/**
 * 查找用户
 * @param {string} id - 用户ID
 * @param {ResultCallback} callback - 回调函数
 */
function findUser(id, callback) {
  // ...
}
```

#### 复杂类型定义

```javascript
/**
 * 分页参数
 * @typedef {Object} PaginationOptions
 * @property {number} [page=1] - 当前页码
 * @property {number} [pageSize=10] - 每页数量
 * @property {string} [sortBy] - 排序字段
 * @property {'asc'|'desc'} [order='asc'] - 排序方向
 */

/**
 * API 响应结构
 * @typedef {Object} ApiResponse<T>
 * @property {number} code - 状态码
 * @property {string} message - 提示信息
 * @property {T} [data] - 返回数据
 * @property {PaginationOptions} [pagination] - 分页信息
 */

/**
 * 查询用户列表
 * @param {PaginationOptions} options - 分页选项
 * @returns {Promise<ApiResponse<UserObject[]>>} 用户列表响应
 */
async function queryUsers(options) {
  // ...
}
```

#### 枚举与常量

```javascript
/**
 * 用户状态枚举
 * @readonly
 * @enum {string}
 */
const UserStatus = {
  /** 活跃 */
  ACTIVE: 'active',
  /** 禁用 */
  DISABLED: 'disabled',
  /** 待验证 */
  PENDING: 'pending'
}

/**
 * 配置常量
 * @constant {Object}
 * @property {number} MAX_SIZE - 最大尺寸
 * @property {string} DEFAULT_LOCALE - 默认语言
 */
const CONFIG = {
  MAX_SIZE: 100,
  DEFAULT_LOCALE: 'zh-CN'
}
```

#### 接口定义

```javascript
/**
 * 数据库接口
 * @interface IDatabase
 */
class IDatabase {
  /**
   * 连接数据库
   * @param {string} connectionString - 连接字符串
   * @returns {Promise<void>}
   * @abstract
   */
  async connect(connectionString) {}

  /**
   * 查询数据
   * @param {string} query - 查询语句
   * @returns {Promise<Object[]>}
   * @abstract
   */
  async query(query) {}
}

/**
 * MySQL 数据库实现
 * @implements {IDatabase}
 */
class MySQLDatabase extends IDatabase {
  // 实现细节...
}
```

### 异步函数

```javascript
/**
 * 异步获取用户数据
 * @async
 * @param {string} id - 用户ID
 * @returns {Promise<UserObject>} 用户对象
 * @throws {Error} 用户不存在
 * @example
 * try {
 *   const user = await getUser('123')
 *   console.log(user.name)
 * } catch (error) {
 *   console.error(error.message)
 * }
 */
async function getUser(id) {
  const user = await db.find(id)
  if (!user) {
    throw new Error('User not found')
  }
  return user
}

/**
 * 批量获取用户
 * @async
 * @param {string[]} ids - 用户ID数组
 * @returns {Promise<UserObject[]>} 用户数组
 */
async function getUsers(ids) {
  return Promise.all(ids.map(id => getUser(id)))
}

/**
 * 带超时的请求
 * @async
 * @param {string} url - 请求地址
 * @param {number} [timeout=5000] - 超时时间（毫秒）
 * @returns {Promise<Response>} 响应对象
 * @throws {TimeoutError} 请求超时
 */
async function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, { signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeoutId)
  }
}
```

### 文档生成

#### 命令行使用

```bash
# 基础生成（指定源码目录和输出目录）
npx jsdoc src -d docs

# 生成到默认目录（./out/）
npx jsdoc src

# 使用配置文件
npx jsdoc -c jsdoc.json

# 指定多个源文件
npx jsdoc src/index.js src/utils.js -d docs

# 递归处理子目录
npx jsdoc -r src -d docs

# 包含 README 文件
npx jsdoc src -d docs -R README.md

# 指定模板
npx jsdoc src -d docs -t node_modules/docdash

# 开启详细日志
npx jsdoc src -d docs --verbose

# 实时监听：jsdoc 无内置 --watch，可用 nodemon 监听文件变化
npx nodemon --watch src --ext js --exec "jsdoc -c jsdoc.json"
```

#### package.json 脚本配置

```json
{
  "scripts": {
    "docs": "jsdoc -c jsdoc.json",
    "docs:clean": "rm -rf docs && jsdoc -c jsdoc.json"
  }
}
```

### 配置文件详解

#### 完整配置示例

```json
{
  "source": {
    "include": ["src", "lib"],
    "exclude": ["node_modules", "src/tests", "src/**/*.test.js"],
    "includePattern": ".+\\.js(doc)?$",
    "excludePattern": "(^|\\/|\\\\)_"
  },
  "opts": {
    "destination": "./docs/",
    "recurse": true,
    "template": "node_modules/docdash",
    "readme": "./README.md",
    "tutorials": "./tutorials",
    "encoding": "utf8",
    "verbose": true
  },
  "plugins": [
    "plugins/markdown",
    "plugins/summarize"
  ],
  "templates": {
    "cleverLinks": true,
    "monospaceLinks": true,
    "default": {
      "outputSourceFiles": true,
      "includeDate": true,
      "useLongnameInNav": true
    }
  },
  "markdown": {
    "hardwrap": true,
    "idInHeadings": true
  }
}
```

#### 配置项说明

| 配置项 | 类型 | 说明 |
|--------|------|------|
| `source.include` | `string[]` | 要包含的文件或目录 |
| `source.exclude` | `string[]` | 要排除的文件或目录 |
| `source.includePattern` | `string` | 包含文件的匹配模式（正则） |
| `source.excludePattern` | `string` | 排除文件的匹配模式（正则） |
| `opts.destination` | `string` | 输出目录 |
| `opts.recurse` | `boolean` | 递归处理子目录 |
| `opts.template` | `string` | 模板路径 |
| `opts.readme` | `string` | README 文件路径 |
| `opts.tutorials` | `string` | 教程目录路径 |
| `opts.encoding` | `string` | 文件编码，默认 utf8 |
| `opts.verbose` | `boolean` | 显示详细日志 |
| `plugins` | `string[]` | 插件列表 |
| `templates.cleverLinks` | `boolean` | 智能链接处理 |
| `templates.monospaceLinks` | `boolean` | 链接使用等宽字体 |

### 主题与插件

#### 流行主题

**1. Docdash（推荐）**

现代化的文档主题，适合开源项目。

```bash
pnpm add docdash -D
```

```json
{
  "opts": {
    "template": "node_modules/docdash"
  },
  "templates": {
    "docdash": {
      "static": true,
      "sort": true,
      "collapse": true,
      "search": true
    }
  }
}
```

**2. Better Docs**

支持组件示例和 React 文档。

```bash
pnpm add better-docs -D
```

```json
{
  "opts": {
    "template": "node_modules/better-docs"
  }
}
```

**3. TUI Doc**

简洁的文档主题。

```bash
pnpm add tui-jsdoc-template -D
```

#### 常用插件

**1. Markdown 插件**

支持 Markdown 语法。

```json
{
  "plugins": ["plugins/markdown"],
  "markdown": {
    "hardwrap": true,
    "idInHeadings": true
  }
}
```

**2. Summarize 插件**

自动生成文档摘要。

```json
{
  "plugins": ["plugins/summarize"]
}
```

**3. TypeScript 支持**

```bash
pnpm add @jsdoc/plugin-typescript -D
```

```json
{
  "plugins": ["node_modules/@jsdoc/plugin-typescript"]
}
```

**4. 社区插件**

```bash
# Vue 组件支持
pnpm add jsdoc-vuejs -D

# 自动生成 Markdown API 文档
pnpm add jsdoc-to-markdown -D
```

---

## TypeDoc

### 介绍

TypeDoc 是 TypeScript 的文档生成器，能够自动从 TypeScript 类型定义生成 API 文档。与 JSDoc 不同，TypeDoc 可以自动推断类型信息，无需手动标注类型，大大降低了文档维护成本。

### 核心优势

- **自动类型推断**：直接从 TypeScript 类型定义生成文档
- **TypeScript 原生支持**：完美支持接口、类型别名、泛型等 TS 特性
- **零配置使用**：开箱即用，配置简单
- **丰富的输出格式**：支持 HTML、Markdown 等多种格式
- **插件生态**：丰富的插件扩展功能

### 安装

```bash
# 使用 pnpm
pnpm add typedoc -D

# 使用 npm
npm install typedoc --save-dev

# 使用 yarn
yarn add typedoc --dev
```

### 基础使用

#### 命令行使用

```bash
# 基础生成（单个文件）
npx typedoc src/index.ts

# 指定输出目录
npx typedoc src/index.ts --out docs

# 处理多个入口文件
npx typedoc src/index.ts src/utils.ts --out docs

# 使用配置文件
npx typedoc

# 指定配置文件
npx typedoc --options typedoc.json

# 生成 Markdown 格式
npx typedoc src/index.ts --plugin typedoc-plugin-markdown

# 监听模式
npx typedoc --watch

# 指定 TypeScript 配置
npx typedoc --tsconfig tsconfig.json
```

#### package.json 脚本配置

```json
{
  "scripts": {
    "docs": "typedoc",
    "docs:watch": "typedoc --watch",
    "docs:json": "typedoc --json docs/api.json"
  }
}
```

### 配置文件详解

#### 完整配置示例

创建 `typedoc.json`：

```json
{
  "entryPoints": ["src/index.ts"],
  "entryPointStrategy": "resolve",
  "out": "docs",
  "tsconfig": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "**/*.test.ts"],
  "excludePrivate": true,
  "excludeProtected": false,
  "excludeInternal": true,
  "excludeExternals": true,
  "externalPattern": ["**/node_modules/**"],
  "includeVersion": true,
  "readme": "./README.md",
  "githubPages": true,
  "plugin": ["typedoc-plugin-markdown"],
  "theme": "default",
  "name": "My Project",
  "categoryOrder": ["Core", "Utils", "*"],
  "defaultCategory": "Other",
  "sort": ["source-order", "visibility", "alphabetical"],
  "visibilityFilters": {
    "protected": true,
    "private": false,
    "inherited": true,
    "external": false
  },
  "toc": ["Classes", "Interfaces", "Functions"]
}
```

#### 配置项说明

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `entryPoints` | `string[]` | - | 入口文件列表 |
| `entryPointStrategy` | `string` | `"resolve"` | 入口解析策略 |
| `out` | `string` | `"./docs"` | 输出目录 |
| `tsconfig` | `string` | - | TypeScript 配置文件路径 |
| `exclude` | `string[]` | - | 排除的文件/目录 |
| `excludePrivate` | `boolean` | `true` | 排除私有成员 |
| `excludeProtected` | `boolean` | `false` | 排除受保护成员 |
| `excludeInternal` | `boolean` | `true` | 排除内部成员（@internal） |
| `excludeExternals` | `boolean` | `false` | 排除外部类型 |
| `includeVersion` | `boolean` | `false` | 包含版本号 |
| `readme` | `string` | - | README 文件路径 |
| `githubPages` | `boolean` | `true` | 生成 .nojekyll 文件 |
| `plugin` | `string[]` | - | 插件列表 |
| `theme` | `string` | `"default"` | 主题名称 |
| `name` | `string` | - | 项目名称 |
| `sort` | `string[]` | - | 排序规则 |
| `visibilityFilters` | `object` | - | 可见性过滤器 |

#### 在 TypeScript 配置中使用

也可以在 `tsconfig.json` 中配置：

```json
{
  "compilerOptions": {
    // ...
  },
  "typedocOptions": {
    "entryPoints": ["src/index.ts"],
    "out": "docs"
  }
}
```

### TypeScript 文档注释

#### 基础类型注释

```typescript
/**
 * 用户接口
 * @description 定义用户的基本信息结构
 */
interface User {
  /** 用户唯一标识 */
  id: string
  /** 用户名 */
  name: string
  /** 邮箱地址 */
  email?: string
  /** 用户角色 */
  role?: 'admin' | 'user' | 'guest'
  /** 创建时间 */
  createdAt: Date
}

/**
 * 用户配置选项
 */
interface UserOptions {
  /** 是否启用通知 */
  enableNotifications?: boolean
  /** 语言设置 */
  locale?: 'zh-CN' | 'en-US' | 'ja-JP'
  /** 主题 */
  theme?: 'light' | 'dark' | 'auto'
}
```

#### 类与装饰器注释

```typescript
/**
 * 用户服务类
 * @description 提供用户相关的增删改查操作
 * 
 * @example
 * ```ts
 * const service = new UserService()
 * const user = await service.findById('123')
 * console.log(user.name)
 * ```
 */
@Injectable()
class UserService {
  private repository: UserRepository

  /**
   * 创建用户服务实例
   * @param repository - 用户数据仓库
   */
  constructor(repository: UserRepository) {
    this.repository = repository
  }

  /**
   * 根据ID查找用户
   * @param id - 用户ID
   * @returns 用户对象
   * @throws {NotFoundError} 用户不存在时抛出
   * 
   * @example
   * ```ts
   * try {
   *   const user = await service.findById('123')
   * } catch (error) {
   *   if (error instanceof NotFoundError) {
   *     console.log('用户不存在')
   *   }
   * }
   * ```
   */
  async findById(id: string): Promise<User> {
    const user = await this.repository.find(id)
    if (!user) {
      throw new NotFoundError(`User ${id} not found`)
    }
    return user
  }

  /**
   * 创建新用户
   * @param data - 用户数据（不含ID）
   * @returns 创建的用户对象
   * 
   * @example
   * ```ts
   * const newUser = await service.create({
   *   name: 'John Doe',
   *   email: 'john@example.com'
   * })
   * ```
   */
  async create(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    return this.repository.create({
      ...data,
      id: generateId(),
      createdAt: new Date()
    })
  }

  /**
   * 更新用户信息
   * @param id - 用户ID
   * @param updates - 要更新的字段
   * @returns 更新后的用户对象
   */
  async update(id: string, updates: Partial<User>): Promise<User> {
    return this.repository.update(id, updates)
  }

  /**
   * 删除用户
   * @param id - 用户ID
   * @returns 是否删除成功
   */
  async delete(id: string): Promise<boolean> {
    return this.repository.delete(id)
  }
}
```

#### 泛型注释

```typescript
/**
 * 分页结果
 * @template T - 数据项类型
 */
interface PaginatedResult<T> {
  /** 数据列表 */
  items: T[]
  /** 总数量 */
  total: number
  /** 当前页码 */
  page: number
  /** 每页数量 */
  pageSize: number
  /** 总页数 */
  totalPages: number
}

/**
 * 仓库接口
 * @template T - 实体类型
 */
interface Repository<T> {
  /**
   * 根据ID查找
   * @param id - 实体ID
   * @returns 实体对象或 null
   */
  findById(id: string): Promise<T | null>

  /**
   * 查找所有
   * @returns 所有实体数组
   */
  findAll(): Promise<T[]>

  /**
   * 创建实体
   * @param entity - 实体数据
   * @returns 创建的实体
   */
  create(entity: Omit<T, 'id'>): Promise<T>

  /**
   * 分页查询
   * @param options - 分页选项
   * @returns 分页结果
   */
  paginate(options: PaginationOptions): Promise<PaginatedResult<T>>
}
```

#### 函数与工具类型

```typescript
/**
 * 深拷贝对象
 * @template T - 对象类型
 * @param obj - 要拷贝的对象
 * @returns 深拷贝后的对象
 * 
 * @example
 * ```ts
 * const original = { a: { b: 1 } }
 * const copied = deepClone(original)
 * copied.a.b = 2
 * console.log(original.a.b) // 1
 * ```
 */
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * 防抖函数
 * @template T - 函数类型
 * @param fn - 要防抖的函数
 * @param delay - 延迟时间（毫秒）
 * @returns 防抖后的函数
 * 
 * @example
 * ```ts
 * const debouncedSearch = debounce((query: string) => {
 *   console.log('Searching:', query)
 * }, 300)
 * 
 * debouncedSearch('test')
 * ```
 */
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}
```

### 模块与导出

#### 模块文档

```typescript
/**
 * @module utils/string
 * @description 字符串处理工具函数
 * @author Your Name
 * @version 1.0.0
 * @license MIT
 * 
 * @example
 * ```ts
 * import { capitalize, truncate } from 'utils/string'
 * 
 * capitalize('hello') // 'Hello'
 * truncate('Long text', 5) // 'Lo...'
 * ```
 */

/**
 * 首字母大写
 * @param str - 输入字符串
 * @returns 首字母大写的字符串
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * 截断字符串
 * @param str - 输入字符串
 * @param maxLength - 最大长度
 * @param suffix - 后缀，默认 '...'
 * @returns 截断后的字符串
 */
export function truncate(
  str: string,
  maxLength: number,
  suffix = '...'
): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - suffix.length) + suffix
}
```

#### 分组与分类

```typescript
/**
 * @category Core
 */
export class CoreService {}

/**
 * @category Utils
 */
export function helper() {}

/**
 * @category Internal
 * @internal
 */
export function internalHelper() {}
```

### TypeDoc 插件

#### 官方插件

**1. typedoc-plugin-markdown**

生成 Markdown 格式文档。

```bash
pnpm add typedoc-plugin-markdown -D
```

```json
{
  "plugin": ["typedoc-plugin-markdown"],
  "out": "docs",
  "entryPoints": ["src/index.ts"]
}
```

**2. typedoc-plugin-merge-modules**

合并模块文档。

```bash
pnpm add typedoc-plugin-merge-modules -D
```

**3. typedoc-plugin-pages**

添加自定义页面。

```bash
pnpm add typedoc-plugin-pages -D
```

```json
{
  "plugin": ["typedoc-plugin-pages"],
  "pages": {
    "pages": [
      {
        "title": "Getting Started",
        "source": "./docs/getting-started.md"
      }
    ]
  }
}
```

#### 社区插件

```bash
# 为类型链接补充 MDN 文档
pnpm add typedoc-plugin-mdn-links -D

# 解析未导出的依赖类型
pnpm add typedoc-plugin-missing-exports -D

# 导出 JSON
pnpm add typedoc-plugin-json -D

# 集成 VitePress 主题
pnpm add typedoc-vitepress-theme -D
```

---

## JSDoc 与 TypeScript 配合

### 在 TypeScript 中使用 JSDoc

在 TypeScript 项目中，JSDoc 注释可以补充类型信息，提供更详细的文档说明。

```typescript
/**
 * 计算两数之和
 * @description 返回两个数字的相加结果
 * @param a - 第一个数
 * @param b - 第二个数
 * @returns 和
 * 
 * @example
 * ```ts
 * const result = add(1, 2) // 3
 * const negative = add(-1, 5) // 4
 * ```
 * 
 * @see {@link https://example.com/docs/add|API 文档}
 */
export function add(a: number, b: number): number {
  return a + b
}
```

### 在 JavaScript 中模拟 TypeScript 类型

JSDoc 可以在纯 JavaScript 项目中实现类似 TypeScript 的类型检查。

#### 类型导入

```javascript
/**
 * @param {import('./types').User} user - 用户对象
 * @returns {import('./types').UserInfo} 用户信息
 */
function getUserInfo(user) {
  return {
    id: user.id,
    name: user.name,
    displayName: `${user.name} (${user.email})`
  }
}

/**
 * 导入类型并复用
 * @typedef {import('./types').Config} Config
 * @typedef {import('./types').Options} Options
 */

/**
 * @param {Config} config - 配置对象
 * @param {Options} [options] - 可选选项
 */
function init(config, options) {
  // IDE 会提供完整的类型提示
  console.log(config.host, config.port)
}
```

#### 类型断言

```javascript
/**
 * @type {import('./types').Config}
 */
const config = {
  host: 'localhost',
  port: 3000,
  database: {
    name: 'mydb',
    user: 'admin'
  }
}

/**
 * 类型断言和转换
 * @type {string[]}
 */
const names = /** @type {string[]} */ (data.map(item => item.name))

/**
 * 对象类型断言
 * @type {{ id: string, name: string }}
 */
const result = JSON.parse(jsonString)
```

#### 泛型模拟

```javascript
/**
 * @template T
 * @param {T[]} items - 数组
 * @param {function(T): boolean} predicate - 判断函数
 * @returns {T[]}
 */
function filter(items, predicate) {
  return items.filter(predicate)
}

/**
 * 多泛型参数
 * @template T, U
 * @param {T} input - 输入值
 * @param {function(T): U} converter - 转换函数
 * @returns {U}
 */
function convert(input, converter) {
  return converter(input)
}
```

#### 类和接口

```javascript
/**
 * @implements {import('./types').IUserService}
 */
class UserService {
  /**
   * @type {Map<string, import('./types').User>}
   */
  #users = new Map

  /**
   * @param {string} id - 用户ID
   * @returns {Promise<import('./types').User>}
   * @throws {Error} 用户不存在
   */
  async findById(id) {
    const user = this.#users.get(id)
    if (!user) throw new Error('User not found')
    return user
  }
}
```

### 类型检查配置

在 `tsconfig.json` 中启用 JSDoc 类型检查：

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "strict": true,
    "target": "ES2020",
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

在 JavaScript 文件中控制检查：

```javascript
// @ts-check - 启用类型检查
// @ts-nocheck - 禁用类型检查
// @ts-ignore - 忽略下一行错误

// @ts-check
/**
 * @param {string} name
 */
function greet(name) {
  console.log(`Hello, ${name}`)
}
```

---

## 最佳实践

### 1. 注释原则

#### 保持简洁

```typescript
// ❌ 冗余啰嗦
/**
 * 这个函数用于计算两个数字的和，接受两个数字作为参数，
 * 并返回它们的相加结果
 */
function add(a: number, b: number): number

// ✅ 简洁明了
/**
 * 计算两数之和
 */
function add(a: number, b: number): number
```

#### 避免重复类型信息

```typescript
// ❌ 重复类型（TypeScript 已有类型定义）
/**
 * @param {number} a - 数字类型的参数 a
 * @returns {number} 返回数字类型的结果
 */
function add(a: number, b: number): number

// ✅ 只补充必要信息
/**
 * @param a - 第一个加数
 * @param b - 第二个加数
 * @returns 两数之和
 */
function add(a: number, b: number): number
```

### 2. 提供有价值的示例

```typescript
// ❌ 无意义的示例
/**
 * @example
 * formatDate(date)
 */

// ✅ 具体的示例
/**
 * 格式化日期
 * @param date - 日期对象或时间戳
 * @param format - 格式字符串
 * @returns 格式化的日期字符串
 * 
 * @example
 * ```ts
 * // 基础用法
 * formatDate(new Date(), 'YYYY-MM-DD') // '2024-01-15'
 * 
 * // 时间戳
 * formatDate(1705286400000, 'YYYY-MM-DD HH:mm:ss')
 * // '2024-01-15 00:00:00'
 * 
 * // 自定义格式
 * formatDate(new Date(), 'YYYY年MM月DD日') // '2024年01月15日'
 * ```
 */
function formatDate(date: Date | number, format: string): string
```

### 3. 文档化异常和边界情况

```typescript
/**
 * 删除文件
 * @param path - 文件路径
 * @throws {FileNotFoundError} 文件不存在
 * @throws {PermissionError} 没有删除权限
 * @throws {DirectoryError} 不能删除目录（需使用 removeDir）
 * 
 * @example
 * ```ts
 * try {
 *   await deleteFile('/path/to/file.txt')
 *   console.log('删除成功')
 * } catch (error) {
 *   if (error instanceof FileNotFoundError) {
 *     console.log('文件不存在')
 *   } else if (error instanceof PermissionError) {
 *     console.log('权限不足')
 *   }
 * }
 * ```
 */
async function deleteFile(path: string): Promise<void>
```

### 4. 版本管理和弃用标记

```typescript
/**
 * @deprecated 使用 `fetchUsers` 替代
 * @version 2.0.0 开始弃用
 * @see fetchUsers
 * @example
 * ```ts
 * // 旧方法（已弃用）
 * const users = await getUsers()
 * 
 * // 新方法
 * const { items } = await fetchUsers({ page: 1 })
 * ```
 */
function getUsers(): Promise<User[]>

/**
 * @since 2.0.0
 */
function fetchUsers(options: FetchOptions): Promise<PaginatedResult<User>>
```

### 5. 模块级别文档

```typescript
/**
 * @module utils/string
 * @description 字符串处理工具函数集合
 * @author Your Team
 * @version 2.1.0
 * @license MIT
 * 
 * @example
 * ```ts
 * import { capitalize, truncate, slugify } from 'utils/string'
 * 
 * capitalize('hello') // 'Hello'
 * truncate('Long text', 5) // 'Lo...'
 * slugify('Hello World') // 'hello-world'
 * ```
 * 
 * @see {@link https://example.com/docs/string|完整文档}
 */
```

### 6. 使用有意义的参数名

```typescript
// ❌ 模糊的参数名
/**
 * @param {string} p1 - 参数1
 * @param {string} p2 - 参数2
 */
function search(p1, p2) {}

// ✅ 清晰的参数名
/**
 * @param query - 搜索关键词
 * @param options - 搜索选项
 */
function search(query: string, options: SearchOptions) {}
```

### 7. 组织复杂类型

```typescript
/**
 * API 请求配置
 * 
 * @property {string} baseURL - 基础 URL
 * @property {number} [timeout=5000] - 超时时间（毫秒）
 * @property {Object} [headers] - 请求头
 * @property {string} [headers.contentType='application/json'] - 内容类型
 * 
 * @example
 * ```ts
 * const config: RequestConfig = {
 *   baseURL: 'https://api.example.com',
 *   timeout: 10000,
 *   headers: {
 *     'Authorization': 'Bearer token'
 *   }
 * }
 * ```
 */
interface RequestConfig {
  baseURL: string
  timeout?: number
  headers?: Record<string, string>
}
```

### 8. 添加参考链接

```typescript
/**
 * 创建哈希值
 * @param data - 要哈希的数据
 * @param algorithm - 哈希算法
 * @returns 哈希值（十六进制字符串）
 * 
 * @see {@link https://nodejs.org/api/crypto.html|Node.js Crypto 文档}
 * @see {@link createHmac} 相关方法：创建 HMAC 哈希
 */
function createHash(data: string, algorithm: 'md5' | 'sha256'): string
```

---

## 完整项目示例

### TypeScript + TypeDoc 项目结构

```
my-project/
├── src/
│   ├── index.ts              # 主入口
│   ├── types/
│   │   ├── index.ts
│   │   ├── user.ts
│   │   └── config.ts
│   ├── services/
│   │   ├── index.ts
│   │   └── user.service.ts
│   ├── utils/
│   │   ├── index.ts
│   │   ├── string.ts
│   │   └── date.ts
│   └── constants.ts
├── docs/                      # 生成的文档
├── typedoc.json
├── tsconfig.json
└── package.json
```

### 完整配置文件

**tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "typedocOptions": {
    "entryPoints": ["src/index.ts"],
    "out": "docs",
    "excludePrivate": true,
    "excludeInternal": true,
    "includeVersion": true,
    "readme": "./README.md",
    "name": "My Project API",
    "sort": ["source-order"],
    "plugin": ["typedoc-plugin-markdown"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**package.json**

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc",
    "docs": "typedoc",
    "docs:watch": "typedoc --watch",
    "docs:clean": "rm -rf docs && typedoc",
    "docs:json": "typedoc --json docs/api.json",
    "docs:serve": "npx serve docs"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "typedoc": "^0.25.0",
    "typedoc-plugin-markdown": "^3.17.0"
  }
}
```

### 示例代码文件

**src/types/user.ts**

```typescript
/**
 * 用户状态枚举
 * @readonly
 * @enum {string}
 */
export const UserStatus = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
  PENDING: 'pending'
} as const

/**
 * 用户信息
 * @description 定义用户的基本信息结构
 */
export interface User {
  /** 用户唯一标识 */
  id: string
  /** 用户名 */
  name: string
  /** 邮箱地址 */
  email: string
  /** 用户状态 */
  status: typeof UserStatus[keyof typeof UserStatus]
  /** 创建时间 */
  createdAt: Date
  /** 更新时间 */
  updatedAt?: Date
}

/**
 * 创建用户参数
 */
export interface CreateUserDTO {
  name: string
  email: string
}

/**
 * 更新用户参数
 */
export interface UpdateUserDTO {
  name?: string
  email?: string
  status?: typeof UserStatus[keyof typeof UserStatus]
}
```

**src/services/user.service.ts**

```typescript
import type { User, CreateUserDTO, UpdateUserDTO } from '../types/user'
import { UserStatus } from '../types/user'

/**
 * 用户服务
 * @description 提供用户的增删改查操作
 * @category Services
 * 
 * @example
 * ```ts
 * const service = new UserService()
 * 
 * // 创建用户
 * const user = await service.create({
 *   name: 'John Doe',
 *   email: 'john@example.com'
 * })
 * 
 * // 查找用户
 * const found = await service.findById(user.id)
 * console.log(found.name)
 * ```
 */
export class UserService {
  private users: Map<string, User> = new Map()

  /**
   * 创建用户
   * @param data - 用户数据
   * @returns 创建的用户对象
   * 
   * @example
   * ```ts
   * const user = await service.create({
   *   name: 'Jane Doe',
   *   email: 'jane@example.com'
   * })
   * ```
   */
  async create(data: CreateUserDTO): Promise<User> {
    const id = crypto.randomUUID()
    const now = new Date()
    
    const user: User = {
      id,
      ...data,
      status: UserStatus.PENDING,
      createdAt: now
    }
    
    this.users.set(id, user)
    return user
  }

  /**
   * 根据ID查找用户
   * @param id - 用户ID
   * @returns 用户对象，不存在则返回 null
   */
  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null
  }

  /**
   * 获取所有用户
   * @returns 用户数组
   */
  async findAll(): Promise<User[]> {
    return Array.from(this.users.values())
  }

  /**
   * 更新用户信息
   * @param id - 用户ID
   * @param data - 更新数据
   * @returns 更新后的用户对象
   * @throws {Error} 用户不存在
   */
  async update(id: string, data: UpdateUserDTO): Promise<User> {
    const user = this.users.get(id)
    if (!user) {
      throw new Error(`User ${id} not found`)
    }

    const updated: User = {
      ...user,
      ...data,
      updatedAt: new Date()
    }

    this.users.set(id, updated)
    return updated
  }

  /**
   * 删除用户
   * @param id - 用户ID
   * @returns 是否删除成功
   */
  async delete(id: string): Promise<boolean> {
    return this.users.delete(id)
  }
}
```

**src/index.ts**

```typescript
/**
 * @packageDocumentation
 * @module my-project
 * @description My Project - 一个示例 TypeScript 项目
 * @author Your Name
 * @version 1.0.0
 * @license MIT
 * 
 * @example
 * ```ts
 * import { UserService } from 'my-project'
 * 
 * const service = new UserService()
 * const user = await service.create({
 *   name: 'John',
 *   email: 'john@example.com'
 * })
 * ```
 */

// 导出类型
export * from './types/user'

// 导出服务
export * from './services/user.service'

// 导出工具函数
export * from './utils/string'
export * from './utils/date'

// 导出常量
export * from './constants'
```

---

## CI/CD 集成

### GitHub Actions

创建 `.github/workflows/docs.yml`：

```yaml
name: Generate Documentation

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  docs:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Generate documentation
        run: pnpm docs

      - name: Deploy to GitHub Pages
        if: github.event_name == 'push' && github.ref == 'refs/heads/main'
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs
```

### GitLab CI

创建 `.gitlab-ci.yml`：

```yaml
stages:
  - build
  - deploy

generate-docs:
  stage: build
  image: node:20
  before_script:
    - npm install -g pnpm
    - pnpm install
  script:
    - pnpm docs
  artifacts:
    paths:
      - docs/
    expire_in: 1 week

pages:
  stage: deploy
  needs:
    - generate-docs
  script:
    - mv docs public
  artifacts:
    paths:
      - public
  only:
    - main
```

### 自动化发布脚本

创建 `scripts/docs-release.sh`：

```bash
#!/bin/bash

# 文档发布脚本
set -e

echo "📝 Generating documentation..."
pnpm docs:clean

echo "📦 Creating documentation archive..."
tar -czf docs.tar.gz -C docs .

echo "📤 Uploading to documentation server..."
# 自定义上传逻辑
# scp docs.tar.gz user@server:/path/to/docs/

echo "✅ Documentation published successfully!"
```

---

## 与其他工具集成

### ESLint 集成

安装相关插件：

```bash
pnpm add eslint-plugin-jsdoc -D
```

`.eslintrc.json` 配置：

```json
{
  "plugins": ["jsdoc"],
  "rules": {
    "jsdoc/check-alignment": "warn",
    "jsdoc/check-param-names": "warn",
    "jsdoc/check-tag-names": "warn",
    "jsdoc/check-types": "warn",
    "jsdoc/require-description": "warn",
    "jsdoc/require-jsdoc": [
      "warn",
      {
        "require": {
          "FunctionDeclaration": true,
          "MethodDefinition": true,
          "ClassDeclaration": true,
          "ArrowFunctionExpression": false
        }
      }
    ],
    "jsdoc/require-param": "warn",
    "jsdoc/require-param-description": "warn",
    "jsdoc/require-returns": "warn",
    "jsdoc/require-returns-description": "warn"
  }
}
```

### VSCode 集成

`.vscode/settings.json`：

```json
{
  "editor.quickSuggestions": {
    "other": true,
    "comments": true,
    "strings": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.suggest.completeJSDocs": true,
  "javascript.suggest.completeJSDocs": true
}
```

创建代码片段 `.vscode/jsdoc.code-snippets`：

```json
{
  "JSDoc Function": {
    "prefix": "/**",
    "body": [
      "/**",
      " * ${1:Description}",
      " * @param {${2:Type}} ${3:param} - ${4:Description}",
      " * @returns {${5:Type}} ${6:Description}",
      " */"
    ]
  },
  "JSDoc Class": {
    "prefix": "/*c",
    "body": [
      "/**",
      " * ${1:Description}",
      " * @class",
      " * @example",
      " * ```ts",
      " * const instance = new ${2:ClassName}()",
      " * ```",
      " */"
    ]
  }
}
```

### VitePress 集成

将 TypeDoc 生成的 Markdown 集成到 VitePress：

**docs/.vitepress/config.ts**

```typescript
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'My Project',
  description: 'API Documentation',
  
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' }
    ],
    sidebar: {
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Classes', link: '/api/classes/' },
            { text: 'Interfaces', link: '/api/interfaces/' },
            { text: 'Functions', link: '/api/modules/' }
          ]
        }
      ]
    }
  }
})
```

### Storybook 集成

在 Storybook 中展示组件文档：

```typescript
// Button.stories.ts
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

/**
 * 按钮组件
 * @description 用于触发操作或提交表单
 * 
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 */
const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger'],
      description: '按钮样式变体'
    }
  }
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button'
  }
}
```

---

## 性能优化

### 大型项目优化策略

**1. 分模块生成**

```json
{
  "entryPoints": [
    "src/core/index.ts",
    "src/services/index.ts",
    "src/utils/index.ts"
  ],
  "entryPointStrategy": "packages"
}
```

**2. 增量生成**

```bash
# 只生成变更模块
npx typedoc src/changed-module --out docs/modules/changed-module
```

**3. 缓存策略**

TypeDoc 没有内置的缓存或增量生成选项（无法通过配置跳过未变更模块），可结合上文「分模块生成」与排除无关文件来降低单次生成开销；在 CI 中缓存 `node_modules` 可避免每次重新安装依赖。

**4. 并行处理**

使用多进程处理大型项目（各模块输出到独立目录，避免相互覆盖）：

```json
{
  "scripts": {
    "docs:parallel": "concurrently \"typedoc src/core --out docs/core\" \"typedoc src/services --out docs/services\" \"typedoc src/utils --out docs/utils\""
  }
}
```

### 减少输出体积

```json
{
  "excludePrivate": true,
  "excludeProtected": true,
  "excludeInternal": true,
  "excludeExternals": true,
  "externalPattern": ["**/node_modules/**"],
  "disableSources": true
}
```

---

## 常见问题解答 (FAQ)

### Q1: JSDoc 和 TypeDoc 应该选择哪个？

**A:** 根据项目类型选择：

- **TypeScript 项目**：推荐使用 TypeDoc
  - 自动从类型定义生成文档
  - 无需手动标注类型
  - 更好的类型推断

- **JavaScript 项目**：推荐使用 JSDoc
  - 提供类型信息
  - IDE 支持良好
  - 更灵活的注释方式

- **混合项目**：两者配合使用
  - TypeScript 文件使用 TypeDoc
  - JavaScript 文件使用 JSDoc

### Q2: 如何在生成的文档中隐藏某些成员？

**A:** 使用以下标签：

```typescript
/**
 * @private - 标记为私有（不显示）
 */
function internalHelper() {}

/**
 * @internal - 标记为内部使用（可配置是否显示）
 */
export function internalAPI() {}

/**
 * @ignore - 完全忽略
 */
function deprecatedFunction() {}
```

### Q3: 如何处理循环引用？

**A:** 使用 `@link` 而不是内联类型：

```typescript
// ❌ 可能导致循环引用
interface User {
  posts: Post[]
}

interface Post {
  author: User
}

// ✅ 使用引用链接
/**
 * @typedef {Object} User
 * @property {Post[]} posts - 用户文章
 */

/**
 * @typedef {Object} Post
 * @property {User} author - 作者
 * @see User
 */
```

### Q4: 文档生成速度太慢怎么办？

**A:** 优化建议：

1. 排除不必要的文件
   ```json
   {
     "exclude": ["**/*.test.ts", "**/*.spec.ts", "node_modules"]
   }
   ```

2. 使用增量编译
   ```bash
   typedoc --tsconfig tsconfig.json
   ```

3. 分模块生成文档
4. 禁用源码映射
   ```json
   {
     "disableSources": true
   }
   ```

### Q5: 如何自定义文档主题？

**A:** 两种方式：

**1. 使用现有主题**

```bash
pnpm add typedoc-theme-hierarchy -D
```

```json
{
  "theme": "hierarchy"
}
```

**2. 创建自定义主题**

```
custom-theme/
├── index.ts
├── layouts/
├── partials/
└── assets/
```

```typescript
// custom-theme/index.ts
import { DefaultTheme } from 'typedoc'

export class CustomTheme extends DefaultTheme {
  // 自定义渲染逻辑
}
```

### Q6: 如何处理外部类型引用？

**A:** 使用 `@external` 或配置排除：

```typescript
/**
 * @external axios
 * @see {@link https://axios-http.com/|Axios 文档}
 */

/**
 * @param {external:axios.AxiosRequestConfig} config
 */
function request(config) {}
```

```json
{
  "externalPattern": ["**/node_modules/**"],
  "excludeExternals": true
}
```

### Q7: 如何在文档中添加图表？

**A:** 使用 Mermaid 或 PlantUML：

```typescript
/**
 * 用户流程
 * 
 * ```mermaid
 * graph TD
 *   A[用户登录] --> B{验证成功?}
 *   B -->|是| C[进入主页]
 *   B -->|否| D[显示错误]
 *   D --> A
 * ```
 */
```

安装 Mermaid 插件：

```bash
pnpm add typedoc-plugin-mermaid -D
```

### Q8: 如何支持多语言文档？

**A:** 使用 i18n 插件或手动管理：

```typescript
/**
 * 创建用户
 * @description
 * - zh-CN: 创建新用户账号
 * - en-US: Create a new user account
 */
function createUser() {}
```

或使用 `typedoc-plugin-i18n`：

```bash
pnpm add typedoc-plugin-i18n -D
```

---

## 进阶技巧

### 自动生成 CHANGELOG

结合 `conventional-changelog`：

```bash
pnpm add conventional-changelog-cli -D
```

```json
{
  "scripts": {
    "changelog": "conventional-changelog -p angular -i CHANGELOG.md -s",
    "docs": "typedoc && npm run changelog"
  }
}
```

### 文档版本管理

使用 `semantic-release`：

```bash
pnpm add semantic-release -D
```

`.releaserc.json`：

```json
{
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/github",
    [
      "@semantic-release/exec",
      {
        "prepareCmd": "pnpm docs"
      }
    ]
  ]
}
```

### 测试文档示例

使用 `tsdoc` 注释并配合测试框架：

```typescript
/**
 * @example
 * ```ts
 * // @test
 * const result = add(1, 2)
 * assert.strictEqual(result, 3)
 * ```
 */
export function add(a: number, b: number): number {
  return a + b
}
```

---

## 参考资源

### 官方文档

- [JSDoc 官方文档](https://jsdoc.app/)
- [TypeDoc 官方文档](https://typedoc.org/)
- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)

### 相关工具

- [TSDoc](https://tsdoc.org/) - TypeScript 文档注释标准
- [ESLint JSDoc 插件](https://github.com/gajus/eslint-plugin-jsdoc)
- [jsdoc-to-markdown](https://github.com/jsdoc2md/jsdoc-to-markdown)

### 示例项目

- [TypeDoc 示例项目](https://github.com/TypeStrong/typedoc/tree/master/example)
- [优秀开源项目文档案例](https://github.com/sindresorhus/type-fest)
