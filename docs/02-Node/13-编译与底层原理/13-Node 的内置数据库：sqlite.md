---
title: Node.js 内置 SQLite 数据库完整指南
description: v22 实验性 node:sqlite 模块的同步 API、事务与在零依赖场景下的应用
keywords: [Node.js, AST, 编译, Node, sqlite]
category: Node.js
tags: [Node.js, 编译与底层原理]
---







# Node.js 内置 SQLite 数据库完整指南

## 目录

1. [概述](#概述)
2. [环境准备与安装配置](#环境准备与安装配置)
3. [Node.js 内置 SQLite 模块](#nodejs-内置-sqlite-模块)
4. [第三方 SQLite 包对比](#第三方-sqlite-包对比)
5. [核心 API 详解](#核心-api-详解)
6. [高级用法与最佳实践](#高级用法与最佳实践)
7. [性能优化建议](#性能优化建议)
8. [常见问题与排错指南](#常见问题与排错指南)
9. [实际应用案例](#实际应用案例)
10. [最佳实践速查表](#最佳实践速查表)
11. [总结与展望](#总结与展望)

## 概述

在 Node.js 开发中，数据持久化是一个常见需求。对于简单的数据，可以使用 JSON 文件存储，但当面临复杂的数据关系时（如一对一、一对多、多对多关系），就需要使用关系型数据库。

SQLite 是一个轻量级、嵌入式的关系型数据库，特别适合 Node.js 工具开发，因为它：

- **零配置**：无需安装独立的数据库服务器
- **便携性**：整个数据库存储在单个文件中
- **性能优秀**：对于中小型应用性能表现出色
- **跨平台**：支持各种操作系统
- **广泛应用**：被众多移动应用和桌面应用采用

Node.js 22 版本开始内置了 SQLite 模块，让可以直接使用而无需额外安装依赖。

### SQLite 在 Node.js 应用中的架构

```text
┌─────────────────────────────────────────────────────────┐
│                    Node.js 应用                        │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐              │
│  │   业务逻辑层     │  │    API 层       │              │
│  │   (Services)    │  │  (Controllers)  │              │
│  └────────┬────────┘  └────────┬────────┘              │
│           │                     │                        │
│  ┌────────▼─────────────────────▼────────┐             │
│  │        数据访问层 (DAL)                │             │
│  │  ┌─────────────────────────────────┐  │             │
│  │  │     SQLite 数据库操作封装          │  │             │
│  │  │  (Connection, Models, Queries)   │  │             │
│  │  └────────┬──────────────────────┬────┘  │             │
│  └───────────┼──────────────────────┼───────┘             │
│             │                      │                      │
│  ┌──────────▼──────────┐  ┌─────▼──────┐               │
│  │  Node.js SQLite API   │  │  第三方包   │               │
│  │  (实验性，需启用)    │  │ (推荐方案)  │               │
│  └──────────┬──────────┘  └─────┬────────┘               │
└─────────────┼───────────────────┼──────────────────────────┘
              │                   │
              │                   │
┌─────────────▼───────────────────▼─────────────────────────┐
│              SQLite 数据库引擎 (C 语言实现)                │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  SQL 解析器  │  │  查询优化器   │  │  存储引擎     │   │
│  └─────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│                   数据库文件 (*.db)                      │
└─────────────────────────────────────────────────────────┘
```

### 使用场景对比

| 场景       | SQLite      | MySQL/PostgreSQL |
| ---------- | ----------- | ---------------- |
| 桌面应用   | ✅ 完美适配 | ❌ 需要服务器    |
| 移动应用   | ✅ 内置支持 | ❌ 不适合        |
| 小型网站   | ✅ 快速开发 | ⚠️ 可以但复杂    |
| 高并发网站 | ❌ 不适合   | ✅ 专业支持      |
| 数据分析   | ✅ 轻量级   | ✅ 更强大        |
| 原型开发   | ✅ 零配置   | ⚠️ 需要设置      |

### 选择合适的工具链

```bash
工具链选择建议：

新手入门 → sqlite 包 (Promise API)
           ↓
生产环境 → sqlite 包 + 连接池
           ↓
性能优化 → 索引优化 + WAL 模式
           ↓
企业应用 → 考虑 MySQL/PostgreSQL
```

## 快速开始指南

如果你是第一次使用 Node.js SQLite，这里有一个简单的入门示例，帮助你快速上手：

### 5 分钟快速入门

```bash
# 1. 创建项目目录
mkdir sqlite-demo && cd sqlite-demo

# 2. 初始化项目
npm init -y

# 3. 安装 SQLite 包（推荐 Promise 版本）
npm install sqlite

# 4. 创建示例文件
cat > app.js << 'EOF'
import sqlite3 from 'sqlite3'
import { open } from 'sqlite'

async function main() {
  // 打开数据库连接
  const db = await open({
    filename: 'demo.db',
    driver: sqlite3.Database
  })

  // 创建表
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE
    )
  `)

  // 插入数据
  await db.run('INSERT INTO users (name, email) VALUES (?, ?)',
              ['张三', 'zhangsan@example.com'])

  // 查询数据
  const users = await db.all('SELECT * FROM users')
  console.log('用户列表:', users)

  // 关闭连接
  await db.close()
}

main().catch(console.error)
EOF

# 5. 运行示例
node app.js
```

**预期输出**：

```bash
用户列表: [ { id: 1, name: '张三', email: 'zhangsan@example.com' } ]
```

恭喜！你已经成功创建了你的第一个 Node.js SQLite 应用。接下来可以深入学习更多高级特性。

## 环境准备与安装配置

### Node.js 版本要求

```bash
# 检查 Node.js 版本
node --version

# 建议使用 Node.js 22.12.0 LTS 或更高版本
# 如果版本过低，请升级到最新 LTS 版本

# 使用 nvm 升级 Node.js（推荐）
nvm install 22.12.0
nvm use 22.12.0
nvm alias default 22.12.0
```

### 内置 SQLite 模块启用

Node.js 内置的 SQLite 模块目前仍处于实验阶段，Node 22.5~22.12 需要添加 `--experimental-sqlite` 标志启用（Node 23.4、22.13 及更高版本已默认启用，无需该 flag）：

```bash
# 运行启用 SQLite 的脚本
node --experimental-sqlite your-script.js

# 或者在 package.json 中配置
{
  "scripts": {
    "start": "node --experimental-sqlite src/index.js",
    "dev": "node --experimental-sqlite --watch src/index.js"
  }
}

# TypeScript 项目配置
{
  "scripts": {
    "build": "tsc",
    "start": "node --experimental-sqlite dist/index.js",
    "dev": "tsx --experimental-sqlite src/index.ts"
  }
}
```

### 第三方包安装（推荐）

由于内置模块尚不稳定，生产环境建议使用成熟的第三方包：

```bash
# 安装 sqlite3（基础驱动）
npm install sqlite3

# 安装 sqlite（Promise 封装版本，推荐）
npm install sqlite

# 或者同时安装两者
npm install sqlite3 sqlite

# 开发环境依赖
npm install --save-dev @types/sqlite3  # TypeScript 类型支持
```

### 开发环境配置

#### 1. 项目初始化

```bash
# 创建项目目录
mkdir sqlite-project
cd sqlite-project

# 初始化 npm 项目
npm init -y

# 创建源代码目录
mkdir src
touch src/index.js
```

#### 2. 数据库文件管理

```javascript
// src/config/database.js
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const databaseConfig = {
  // 开发环境数据库文件
  development: path.join(__dirname, "../data/dev.db"),

  // 测试环境数据库文件
  test: path.join(__dirname, "../data/test.db"),

  // 生产环境数据库文件
  production: path.join(__dirname, "../data/prod.db"),

  // 内存数据库（用于单元测试）
  memory: ":memory:"
}

export const getDatabasePath = (env = process.env.NODE_ENV || "development") => {
  return databaseConfig[env] || databaseConfig.development
}
```

#### 3. 环境变量配置

```bash
# .env 文件
NODE_ENV=development
DATABASE_URL=./data/app.db
DATABASE_TIMEOUT=5000
DATABASE_BUSY_TIMEOUT=3000
```

```javascript
// src/config/env.js
import dotenv from "dotenv"
import path from "path"

// 加载环境变量
dotenv.config({ path: path.join(process.cwd(), ".env") })

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  DATABASE_URL: process.env.DATABASE_URL || "./data/app.db",
  DATABASE_TIMEOUT: parseInt(process.env.DATABASE_TIMEOUT) || 5000,
  DATABASE_BUSY_TIMEOUT: parseInt(process.env.DATABASE_BUSY_TIMEOUT) || 3000
}
```

#### 4. 数据库连接工具

```javascript
// src/utils/database.js
import sqlite3 from "sqlite3"
import { open } from "sqlite"
import { env } from "../config/env.js"

let dbInstance = null

export async function getDatabase() {
  if (dbInstance) {
    return dbInstance
  }

  dbInstance = await open({
    filename: env.DATABASE_URL,
    driver: sqlite3.Database,
    mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE
  })

  // 配置数据库参数
  await dbInstance.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA cache_size = -64000;
    PRAGMA temp_store = MEMORY;
    PRAGMA mmap_size = 30000000;
    PRAGMA busy_timeout = ${env.DATABASE_BUSY_TIMEOUT};
  `)

  return dbInstance
}

export async function closeDatabase() {
  if (dbInstance) {
    await dbInstance.close()
    dbInstance = null
  }
}

// 优雅关闭
process.on("SIGINT", async () => {
  console.log("正在关闭数据库连接...")
  await closeDatabase()
  process.exit(0)
})

process.on("SIGTERM", async () => {
  console.log("正在关闭数据库连接...")
  await closeDatabase()
  process.exit(0)
})
```

### GUI 工具推荐

#### 1. DB Browser for SQLite

跨平台的 SQLite 数据库管理工具：

```bash
# macOS (使用 Homebrew)
brew install --cask db-browser-for-sqlite

# Windows (使用 Chocolatey)
choco install sqlitebrowser

# Ubuntu/Debian
sudo apt install sqlitebrowser
```

#### 2. SQLiteStudio

功能强大的 SQLite 管理工具：

```bash
# 下载地址
# https://sqlitestudio.pl/
```

#### 3. VS Code 插件

```bash
# SQLite Viewer
# SQLite Explorer
# SQLTools + SQLTools SQLite Driver
```

## Node.js 内置 SQLite 模块

### 基础使用示例

```javascript
// 导入内置 SQLite 模块
import { DatabaseSync } from "node:sqlite"

// 创建数据库连接（文件存储）
const database = new DatabaseSync("data.db")

// 创建表结构
database.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) STRICT
`)

// 插入数据
const insertStmt = database.prepare(
  "INSERT INTO students (name, age, email) VALUES (?, ?, ?)"
)
insertStmt.run("张三", 20, "zhangsan@example.com")
insertStmt.run("李四", 21, "lisi@example.com")
insertStmt.run("王五", 22, "wangwu@example.com")

// 查询数据
const queryStmt = database.prepare("SELECT * FROM students ORDER BY id")
const results = queryStmt.all()
console.log("查询结果:", results)

// 关闭数据库连接
database.close()
```

### 事务处理

```javascript
import { DatabaseSync } from "node:sqlite"

const db = new DatabaseSync("data.db")

try {
  // 开始事务
  db.exec("BEGIN TRANSACTION")

  // 执行多个操作
  const stmt1 = db.prepare("INSERT INTO students (name, age) VALUES (?, ?)")
  stmt1.run("赵六", 23)

  const stmt2 = db.prepare("UPDATE students SET age = ? WHERE name = ?")
  stmt2.run(24, "张三")

  // 提交事务
  db.exec("COMMIT")
  console.log("事务提交成功")
} catch (error) {
  // 回滚事务
  db.exec("ROLLBACK")
  console.error("事务回滚:", error)
} finally {
  db.close()
}
```

### 内存数据库

内存数据库是一种特殊的数据库类型，数据只存在于程序运行期间，程序结束后数据会自动消失。这种数据库特别适合以下场景：

- **单元测试**：避免测试数据污染实际数据库
- **临时数据处理**：需要快速处理大量临时数据
- **原型开发**：快速验证数据结构和查询逻辑
- **缓存机制**：作为高速缓存存储热点数据

```javascript
import { DatabaseSync } from "node:sqlite"

// 创建内存数据库（数据只在程序运行期间存在）
const db = new DatabaseSync(":memory:")

// 内存数据库适合测试和临时数据处理
// 注意：程序退出后数据会完全消失
```

**使用建议**：

- 在测试环境中优先使用内存数据库
- 对于需要持久化的数据，请使用文件数据库
- 内存数据库的访问速度通常比文件数据库更快

```javascript
// 创建内存数据库示例
const db = new DatabaseSync(":memory:")

db.exec(`CREATE TABLE temp_data (
  id INTEGER PRIMARY KEY,
  value TEXT
)`)

// 使用内存数据库...
// 程序结束时自动释放
```


## 第三方 SQLite 包对比

### sqlite3 包（回调风格）

```javascript
import sqlite3 from "sqlite3"
import { Database } from "sqlite3"

// 创建数据库连接
const db = new Database("data.db")

// 序列化执行（确保操作顺序）
db.serialize(() => {
  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL,
      stock INTEGER DEFAULT 0
    )
  `)

  // 插入数据
  const stmt = db.prepare(
    "INSERT INTO products (name, price, stock) VALUES (?, ?, ?)"
  )
  stmt.run("iPhone 15", 7999.0, 100)
  stmt.run("MacBook Pro", 15999.0, 50)
  stmt.finalize()

  // 查询数据
  db.each("SELECT * FROM products", (err, row) => {
    if (err) {
      console.error("查询错误:", err)
      return
    }
    console.log(`产品: ${row.name}, 价格: ¥${row.price}, 库存: ${row.stock}`)
  })
})

// 关闭数据库
db.close()
```

**sqlite3 包特点**：
- **回调风格**：所有操作都通过回调函数处理结果
- **成熟稳定**：经过长期生产环境验证
- **功能完整**：支持 SQLite 的所有高级特性
- **性能优秀**：直接调用 SQLite C 接口

**使用建议**：
- 适合熟悉回调风格的开发者
- 对于复杂的异步流程控制可能需要额外的工具
- 在性能要求极高的场景下表现优异

### sqlite 包（Promise/Async 风格）

```javascript
import sqlite3 from "sqlite3"
import { open } from "sqlite"

async function main() {
  // 打开数据库连接
  const db = await open({
    filename: "data.db",
    driver: sqlite3.Database
  })

  try {
    // 创建表
    await db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        total_amount REAL,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 插入订单数据
    const insertStmt = await db.prepare(
      "INSERT INTO orders (customer_name, total_amount) VALUES (?, ?)"
    )
    await insertStmt.run("客户A", 2999.99)
    await insertStmt.run("客户B", 5999.99)
    await insertStmt.finalize()

    // 查询特定订单
    const specificOrder = await db.get(
      "SELECT * FROM orders WHERE customer_name = ?",
      ["客户A"]
    )
    console.log("特定订单:", specificOrder)

    // 查询所有订单
    const allOrders = await db.all("SELECT * FROM orders ORDER BY created_at DESC")
    console.log("所有订单:", allOrders)

    // 更新订单状态
    await db.run("UPDATE orders SET status = ? WHERE id = ?", ["completed", 1])

    // 统计订单数量和总金额
    const stats = await db.get(`
      SELECT
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_amount
      FROM orders
    `)
    console.log("订单统计:", stats)
  } catch (error) {
    console.error("数据库操作错误:", error)
  } finally {
    await db.close()
  }
}

main()
```

## 核心 API 详解

### 数据库连接管理

```javascript
// 连接选项
const db = await open({
  filename: "data.db", // 数据库文件路径
  driver: sqlite3.Database, // 驱动程序
  mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, // 打开模式
  verbose: true // 启用详细日志
})

// 关闭连接
await db.close()
```

### 表操作

```javascript
// 创建表
await db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'user',
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

// 修改表结构
await db.exec("ALTER TABLE users ADD COLUMN phone TEXT")
await db.exec("CREATE INDEX idx_users_email ON users(email)")
await db.exec("CREATE INDEX idx_users_username ON users(username)")

// 删除表（谨慎使用）
// await db.exec('DROP TABLE IF EXISTS users');
```

### 数据操作

```javascript
// 插入数据
const insertUser = await db.prepare(
  "INSERT INTO users (username, password, email) VALUES (?, ?, ?)"
)
const result = await insertUser.run(
  "john_doe",
  "hashed_password",
  "john@example.com"
)
console.log("新用户ID:", result.lastID)
await insertUser.finalize()

// 批量插入
const insertMany = await db.prepare(
  "INSERT INTO users (username, email) VALUES (?, ?)"
)
const users = [
  ["alice", "alice@example.com"],
  ["bob", "bob@example.com"],
  ["charlie", "charlie@example.com"]
]

for (const user of users) {
  await insertMany.run(...user)
}
await insertMany.finalize()

// 更新数据
const updateUser = await db.prepare(
  "UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP WHERE username = ?"
)
await updateUser.run("new_email@example.com", "john_doe")
await updateUser.finalize()

// 删除数据
const deleteUser = await db.prepare("DELETE FROM users WHERE username = ?")
await deleteUser.run("john_doe")
await deleteUser.finalize()
```

### 查询操作

```javascript
// 查询单条记录
const user = await db.get("SELECT * FROM users WHERE username = ?", ["alice"])
console.log("用户信息:", user)

// 查询多条记录
const allUsers = await db.all(
  "SELECT * FROM users ORDER BY created_at DESC LIMIT 10"
)
console.log("用户列表:", allUsers)

// 条件查询
const activeUsers = await db.all(
  `
  SELECT username, email, created_at
  FROM users
  WHERE is_active = 1 AND role = ?
  ORDER BY username
`,
  ["user"]
)

// 聚合查询
const userStats = await db.get(`
  SELECT
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_users,
    MIN(created_at) as first_user,
    MAX(created_at) as latest_user
  FROM users
`)
console.log("用户统计:", userStats)

// 分页查询
const page = 1
const pageSize = 10
const offset = (page - 1) * pageSize
const paginatedUsers = await db.all(
  `
  SELECT * FROM users
  ORDER BY created_at DESC
  LIMIT ? OFFSET ?
`,
  [pageSize, offset]
)
```

### 事务处理

```javascript
async function transferMoney(fromUser, toUser, amount) {
  const db = await open({
    filename: "bank.db",
    driver: sqlite3.Database
  })

  try {
    // 开始事务
    await db.exec("BEGIN TRANSACTION")

    // 检查余额
    const fromBalance = await db.get(
      "SELECT balance FROM accounts WHERE user_id = ?",
      [fromUser]
    )
    if (fromBalance.balance < amount) {
      throw new Error("余额不足")
    }

    // 扣款
    await db.run("UPDATE accounts SET balance = balance - ? WHERE user_id = ?", [
      amount,
      fromUser
    ])

    // 收款
    await db.run("UPDATE accounts SET balance = balance + ? WHERE user_id = ?", [
      amount,
      toUser
    ])

    // 记录交易
    await db.run(
      `
      INSERT INTO transactions (from_user, to_user, amount, type, created_at)
      VALUES (?, ?, ?, 'transfer', CURRENT_TIMESTAMP)
    `,
      [fromUser, toUser, amount]
    )

    // 提交事务
    await db.exec("COMMIT")
    console.log("转账成功")
  } catch (error) {
    // 回滚事务
    await db.exec("ROLLBACK")
    console.error("转账失败:", error)
    throw error
  } finally {
    await db.close()
  }
}
```

## 高级用法与最佳实践

### 数据库设计最佳实践

```javascript
// 1. 使用外键约束
await db.exec(`
  CREATE TABLE IF NOT EXISTS departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

await db.exec(`
  CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    department_id INTEGER,
    salary REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
  )
`)

// 启用外键约束（重要！）
await db.exec("PRAGMA foreign_keys = ON")

// 2. 使用视图简化复杂查询
await db.exec(`
  CREATE VIEW IF NOT EXISTS employee_details AS
  SELECT
    e.id,
    e.name as employee_name,
    d.name as department_name,
    e.salary,
    e.created_at
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.id
`)

// 使用视图查询
const employeeDetails = await db.all(
  "SELECT * FROM employee_details WHERE department_name = ?",
  ["技术部"]
)
```

### 错误处理与日志记录

```javascript
import winston from "winston"

// 配置日志
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "database-error.log", level: "error" }),
    new winston.transports.File({ filename: "database-combined.log" })
  ]
})

class DatabaseManager {
  constructor(dbPath) {
    this.dbPath = dbPath
    this.db = null
  }

  async connect() {
    try {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database,
        verbose: process.env.NODE_ENV === "development" ? console.log : null
      })

      // 启用外键约束
      await this.db.exec("PRAGMA foreign_keys = ON")

      logger.info("数据库连接成功", { dbPath: this.dbPath })
      return this.db
    } catch (error) {
      logger.error("数据库连接失败", { error: error.message, dbPath: this.dbPath })
      throw error
    }
  }

  async executeWithRetry(sql, params = [], retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        return await this.db.get(sql, params)
      } catch (error) {
        logger.warn(`数据库操作失败，重试 ${i + 1}/${retries}`, {
          error: error.message,
          sql,
          params
        })

        if (i === retries - 1) {
          logger.error("数据库操作最终失败", { error: error.message, sql, params })
          throw error
        }

        // 等待一段时间后重试
        await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)))
      }
    }
  }

  async close() {
    if (this.db) {
      await this.db.close()
      logger.info("数据库连接关闭")
    }
  }
}
```

### 数据验证与清理

```javascript
class UserRepository {
  constructor(db) {
    this.db = db
  }

  // 数据验证
  validateUser(userData) {
    const errors = []

    if (!userData.username || userData.username.length < 3) {
      errors.push("用户名至少需要3个字符")
    }

    if (!userData.email || !this.isValidEmail(userData.email)) {
      errors.push("邮箱格式不正确")
    }

    if (userData.age && (userData.age < 0 || userData.age > 150)) {
      errors.push("年龄必须在0-150之间")
    }

    if (errors.length > 0) {
      throw new Error(`数据验证失败: ${errors.join(", ")}`)
    }
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // 清理输入数据
  sanitizeInput(data) {
    const sanitized = {}

    Object.keys(data).forEach((key) => {
      if (typeof data[key] === "string") {
        sanitized[key] = data[key].trim()
      } else {
        sanitized[key] = data[key]
      }
    })

    return sanitized
  }

  async createUser(userData) {
    // 清理和验证数据
    const sanitized = this.sanitizeInput(userData)
    this.validateUser(sanitized)

    // 检查用户名是否已存在
    const existingUser = await this.db.get(
      "SELECT id FROM users WHERE username = ?",
      [sanitized.username]
    )
    if (existingUser) {
      throw new Error("用户名已存在")
    }

    // 插入数据
    const result = await this.db.run(
      `
      INSERT INTO users (username, email, age, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `,
      [sanitized.username, sanitized.email, sanitized.age]
    )

    return result.lastID
  }
}
```

## 性能优化建议

### 索引优化

```javascript
// 1. 为经常查询的列创建索引
await db.exec("CREATE INDEX idx_users_email ON users(email)")
await db.exec("CREATE INDEX idx_users_username ON users(username)")

// 2. 复合索引
await db.exec("CREATE INDEX idx_orders_user_status ON orders(user_id, status)")

// 3. 部分索引（只为满足条件的行创建索引）
await db.exec(`
  CREATE INDEX idx_active_users ON users(created_at)
  WHERE is_active = 1
`)

// 4. 查看查询计划
const queryPlan = await db.all(
  "EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = ?",
  ["test@example.com"]
)
console.log("查询计划:", queryPlan)
```

### 批量操作优化

```javascript
// 低效的逐条插入
async function inefficientInsert(users) {
  for (const user of users) {
    await db.run("INSERT INTO users (username, email) VALUES (?, ?)", [
      user.username,
      user.email
    ])
  }
}

// 高效的批量插入
async function efficientInsert(users) {
  const db = await open({ filename: "data.db", driver: sqlite3.Database })

  try {
    await db.exec("BEGIN TRANSACTION")

    const stmt = await db.prepare(
      "INSERT INTO users (username, email) VALUES (?, ?)"
    )

    for (const user of users) {
      await stmt.run(user.username, user.email)
    }

    await stmt.finalize()
    await db.exec("COMMIT")
  } catch (error) {
    await db.exec("ROLLBACK")
    throw error
  } finally {
    await db.close()
  }
}

// 使用 UNION ALL 进行批量插入（适用于大量数据）
async function bulkInsertWithUnion(users) {
  if (users.length === 0) return

  const values = users
    .map(
      (user, index) =>
        `SELECT $username${index} as username, $email${index} as email`
    )
    .join(" UNION ALL ")

  const sql = `INSERT INTO users (username, email) ${values}`

  const params = {}
  users.forEach((user, index) => {
    params[`$username${index}`] = user.username
    params[`$email${index}`] = user.email
  })

  await db.run(sql, params)
}
```

### 查询优化

```javascript
// 1. 使用 LIMIT 限制结果集大小
const recentUsers = await db.all(`
  SELECT username, email, created_at
  FROM users
  ORDER BY created_at DESC
  LIMIT 20
`)

// 2. 只查询需要的列，避免 SELECT *
const userEmails = await db.all("SELECT email FROM users WHERE is_active = 1")

// 3. 使用 JOIN 而不是多次查询
const userWithDepartment = await db.get(
  `
  SELECT
    u.username,
    u.email,
    d.name as department_name
  FROM users u
  LEFT JOIN departments d ON u.department_id = d.id
  WHERE u.id = ?
`,
  [userId]
)

// 4. 使用 EXISTS 而不是 IN（对于大表）
const hasActiveUsers = await db.get(
  `
  SELECT EXISTS(
    SELECT 1 FROM users
    WHERE department_id = ? AND is_active = 1
  ) as has_active
`,
  [departmentId]
)
```

### 性能优化效果对比

以下是不同优化措施的典型性能提升效果（数量级示意，非严格实测基准，具体数值取决于数据规模与硬件）：

| 优化措施 | 优化前 | 优化后 | 提升倍数 | 说明 |
|----------|--------|--------|----------|------|
| 添加索引 | 1200ms | 15ms | 80x | 为 WHERE 条件列添加索引 |
| 使用 LIMIT | 850ms | 25ms | 34x | 限制结果集大小 |
| 批量插入 | 5000ms | 150ms | 33x | 使用事务批量处理 |
| 预处理语句 | 300ms | 45ms | 6.7x | 复用编译后的 SQL |
| WAL 模式 | 200ms | 120ms | 1.7x | 提高并发写入性能 |
| 缓存调优 | 180ms | 95ms | 1.9x | 增加缓存页面数 |

### 查询优化决策树

```sql
查询慢？
├─ 是否使用了索引？
│  ├─ 是 → 检查索引是否生效（EXPLAIN QUERY PLAN）
│  └─ 否 → 为 WHERE/JOIN/ORDER BY 列创建索引
├─ 是否查询了不必要的数据？
│  ├─ 是 → 只查询需要的列，添加 LIMIT
│  └─ 否 → 继续下一步
├─ 是否可以优化查询结构？
│  ├─ 是 → 使用 EXISTS 替代 IN，优化 JOIN
│  └─ 否 → 考虑其他方案
└─ 是否可以缓存结果？
   ├─ 是 → 实施查询结果缓存
   └─ 否 → 考虑数据库升级
```

### 连接池配置

```javascript
import sqlite3 from "sqlite3"

// 虽然 SQLite 本身不支持连接池，但可以通过以下方式优化
class SQLitePool {
  constructor(dbPath, maxConnections = 5) {
    this.dbPath = dbPath
    this.maxConnections = maxConnections
    this.connections = []
    this.available = []
  }

  async getConnection() {
    if (this.available.length > 0) {
      return this.available.pop()
    }

    if (this.connections.length < this.maxConnections) {
      const db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      })

      this.connections.push(db)
      return db
    }

    // 等待可用连接
    return new Promise((resolve) => {
      const checkAvailable = () => {
        if (this.available.length > 0) {
          resolve(this.available.pop())
        } else {
          setTimeout(checkAvailable, 10)
        }
      }
      checkAvailable()
    })
  }

  releaseConnection(db) {
    this.available.push(db)
  }

  async closeAll() {
    await Promise.all(this.connections.map((db) => db.close()))
    this.connections = []
    this.available = []
  }
}
```

## 常见问题与排错指南

### 1. 数据库锁定问题

**问题描述**：`SQLITE_BUSY: database is locked`

**解决方案**：

```javascript
// 设置超时时间
await db.exec("PRAGMA busy_timeout = 5000") // 5秒超时

// 使用 WAL 模式（Write-Ahead Logging）
await db.exec("PRAGMA journal_mode = WAL")

// 避免长事务
async function shortTransaction() {
  await db.exec("BEGIN IMMEDIATE") // 立即开始事务
  try {
    // 快速执行操作
    await db.run("UPDATE accounts SET balance = balance + 100 WHERE id = 1")
    await db.exec("COMMIT")
  } catch (error) {
    await db.exec("ROLLBACK")
    throw error
  }
}
```

### 2. 内存数据库数据丢失

**问题描述**：内存数据库在程序重启后数据丢失

**解决方案**：

```javascript
// 定期备份内存数据库到文件
async function backupMemoryDB() {
  const memoryDB = new DatabaseSync(":memory:")
  const backupDB = new DatabaseSync("backup.db")

  // 执行备份
  memoryDB.exec(`
    ATTACH DATABASE 'backup.db' AS backup;
    CREATE TABLE backup.users AS SELECT * FROM main.users;
    DETACH DATABASE backup;
  `)
}

// 或者使用临时文件数据库
const tempDB = new DatabaseSync("temp.db")
// 程序退出时删除临时文件
process.on("exit", () => {
  fs.unlinkSync("temp.db")
})
```

### 3. 数据类型错误

**问题描述**：插入数据时类型不匹配

**解决方案**：

```javascript
// 使用 STRICT 表模式
await db.exec(`
  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL CHECK(price >= 0),
    stock INTEGER CHECK(stock >= 0),
    is_available BOOLEAN
  ) STRICT
`)

// 数据类型转换
function sanitizeProductData(product) {
  return {
    name: String(product.name).trim(),
    price: parseFloat(product.price) || 0,
    stock: parseInt(product.stock) || 0,
    is_available: Boolean(product.is_available)
  }
}
```

### 4. 性能缓慢问题

**问题描述**：查询或插入操作执行缓慢

**解决方案**：

```javascript
// 性能诊断
async function diagnosePerformance() {
  // 检查数据库大小
  const dbSize = await db.get(
    "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()"
  )
  console.log("数据库大小:", dbSize.size, "字节")

  // 检查索引使用情况
  const indexUsage = await db.all(`
    SELECT name, stat
    FROM sqlite_stat1
    ORDER BY stat DESC
  `)
  console.log("索引统计:", indexUsage)

  // 启用查询性能分析
  await db.exec("PRAGMA optimize")
}

// 优化配置
await db.exec("PRAGMA cache_size = 10000") // 增加缓存大小
await db.exec("PRAGMA temp_store = MEMORY") // 使用内存临时存储
await db.exec("PRAGMA mmap_size = 30000000") // 启用内存映射
```

### 5. 并发访问问题

**问题描述**：多个进程/线程同时访问数据库

**解决方案**：

```javascript
// 使用文件锁
import fs from "fs"
import path from "path"

class DatabaseLock {
  constructor(dbPath) {
    this.dbPath = dbPath
    this.lockPath = `${dbPath}.lock`
  }

  async acquireLock(timeout = 5000) {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      try {
        // 尝试创建锁文件
        fs.writeFileSync(this.lockPath, process.pid.toString(), { flag: "wx" })
        return true
      } catch (error) {
        // 如果锁文件已存在，等待一段时间后重试
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    throw new Error("无法获取数据库锁")
  }

  releaseLock() {
    try {
      fs.unlinkSync(this.lockPath)
    } catch (error) {
      // 锁文件可能已被其他进程删除
    }
  }
}

// 使用示例
async function safeDatabaseOperation() {
  const lock = new DatabaseLock("data.db")

  try {
    await lock.acquireLock()

    // 执行数据库操作
    const db = await open({ filename: "data.db", driver: sqlite3.Database })
    await db.run("UPDATE users SET last_access = CURRENT_TIMESTAMP WHERE id = 1")
    await db.close()
  } finally {
    lock.releaseLock()
  }
}
```

## 实际应用案例

### 1. 待办事项管理应用

```javascript
import sqlite3 from "sqlite3"
import { open } from "sqlite"

class TodoApp {
  constructor(dbPath) {
    this.dbPath = dbPath
    this.db = null
  }

  async initialize() {
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    })

    // 创建表结构
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        priority INTEGER DEFAULT 1,
        status TEXT DEFAULT 'pending',
        due_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建索引
    await this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status)"
    )
    await this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_todos_priority ON todos(priority)"
    )
    await this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_todos_due_date ON todos(due_date)"
    )
  }

  async addTodo(title, description = "", priority = 1, dueDate = null) {
    const result = await this.db.run(
      `
      INSERT INTO todos (title, description, priority, due_date)
      VALUES (?, ?, ?, ?)
    `,
      [title, description, priority, dueDate]
    )

    return result.lastID
  }

  async getTodos(status = null, priority = null) {
    let sql = "SELECT * FROM todos WHERE 1=1"
    const params = []

    if (status) {
      sql += " AND status = ?"
      params.push(status)
    }

    if (priority) {
      sql += " AND priority = ?"
      params.push(priority)
    }

    sql += " ORDER BY priority DESC, due_date ASC, created_at DESC"

    return await this.db.all(sql, params)
  }

  async updateTodoStatus(id, status) {
    const result = await this.db.run(
      `
      UPDATE todos
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
      [status, id]
    )

    return result.changes > 0
  }

  async deleteTodo(id) {
    const result = await this.db.run("DELETE FROM todos WHERE id = ?", [id])
    return result.changes > 0
  }

  async getOverdueTodos() {
    return await this.db.all(`
      SELECT * FROM todos
      WHERE status != 'completed'
      AND due_date < DATE('now')
      ORDER BY due_date ASC
    `)
  }

  async getStatistics() {
    return await this.db.get(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status != 'completed' AND due_date < DATE('now') THEN 1 END) as overdue,
        AVG(priority) as avg_priority
      FROM todos
    `)
  }

  async close() {
    if (this.db) {
      await this.db.close()
    }
  }
}

// 使用示例
async function main() {
  const todoApp = new TodoApp("todos.db")
  await todoApp.initialize()

  try {
    // 添加待办事项
    const todo1 = await todoApp.addTodo(
      "学习 Node.js",
      "完成 SQLite 教程",
      2,
      "2024-12-31"
    )
    const todo2 = await todoApp.addTodo(
      "编写代码",
      "实现用户管理功能",
      1,
      "2024-12-15"
    )

    console.log("添加的待办事项ID:", todo1, todo2)

    // 获取所有待办事项
    const allTodos = await todoApp.getTodos()
    console.log("所有待办事项:", allTodos)

    // 获取高优先级待办事项
    const highPriorityTodos = await todoApp.getTodos(null, 1)
    console.log("高优先级待办事项:", highPriorityTodos)

    // 更新状态
    await todoApp.updateTodoStatus(todo1, "completed")

    // 获取统计信息
    const stats = await todoApp.getStatistics()
    console.log("统计信息:", stats)

    // 获取过期待办事项
    const overdueTodos = await todoApp.getOverdueTodos()
    console.log("过期待办事项:", overdueTodos)
  } finally {
    await todoApp.close()
  }
}

main().catch(console.error)
```

### 2. 简单博客系统

```javascript
import sqlite3 from "sqlite3"
import { open } from "sqlite"

class BlogSystem {
  constructor(dbPath) {
    this.dbPath = dbPath
    this.db = null
  }

  async initialize() {
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    })

    // 创建用户表
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS authors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        bio TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建文章表
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        author_id INTEGER,
        status TEXT DEFAULT 'draft',
        views INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
      )
    `)

    // 创建标签表
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // 创建文章标签关联表
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS post_tags (
        post_id INTEGER,
        tag_id INTEGER,
        PRIMARY KEY (post_id, tag_id),
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `)

    // 创建评论表
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER,
        author_name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
      )
    `)

    // 创建索引
    await this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id)"
    )
    await this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status)"
    )
    await this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at)"
    )
    await this.db.exec(
      "CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id)"
    )
  }

  async createAuthor(username, email, password, bio = "") {
    const result = await this.db.run(
      `
      INSERT INTO authors (username, email, password, bio)
      VALUES (?, ?, ?, ?)
    `,
      [username, email, password, bio]
    )

    return result.lastID
  }

  async createPost(authorId, title, content, status = "draft", tagNames = []) {
    const result = await this.db.run(
      `
      INSERT INTO posts (author_id, title, content, status)
      VALUES (?, ?, ?, ?)
    `,
      [authorId, title, content, status]
    )

    const postId = result.lastID

    // 处理标签
    if (tagNames.length > 0) {
      for (const tagName of tagNames) {
        // 获取或创建标签
        let tag = await this.db.get("SELECT id FROM tags WHERE name = ?", [tagName])

        if (!tag) {
          const tagResult = await this.db.run("INSERT INTO tags (name) VALUES (?)", [
            tagName
          ])
          tag = { id: tagResult.lastID }
        }

        // 建立关联
        await this.db.run("INSERT INTO post_tags (post_id, tag_id) VALUES (?, ?)", [
          postId,
          tag.id
        ])
      }
    }

    return postId
  }

  async getPosts(status = null, tag = null, limit = 10, offset = 0) {
    let sql = `
      SELECT
        p.*,
        a.username as author_name,
        GROUP_CONCAT(t.name) as tags
      FROM posts p
      JOIN authors a ON p.author_id = a.id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE 1=1
    `

    const params = []

    if (status) {
      sql += " AND p.status = ?"
      params.push(status)
    }

    if (tag) {
      sql += " AND t.name = ?"
      params.push(tag)
    }

    sql += " GROUP BY p.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?"
    params.push(limit, offset)

    return await this.db.all(sql, params)
  }

  async getPostById(postId) {
    const post = await this.db.get(
      `
      SELECT
        p.*,
        a.username as author_name,
        a.bio as author_bio
      FROM posts p
      JOIN authors a ON p.author_id = a.id
      WHERE p.id = ?
    `,
      [postId]
    )

    if (!post) return null

    // 获取标签
    const tags = await this.db.all(
      `
      SELECT t.name
      FROM post_tags pt
      JOIN tags t ON pt.tag_id = t.id
      WHERE pt.post_id = ?
    `,
      [postId]
    )

    // 获取评论
    const comments = await this.db.all(
      `
      SELECT * FROM comments
      WHERE post_id = ?
      ORDER BY created_at DESC
    `,
      [postId]
    )

    return {
      ...post,
      tags: tags.map((t) => t.name),
      comments
    }
  }

  async addComment(postId, authorName, content) {
    const result = await this.db.run(
      `
      INSERT INTO comments (post_id, author_name, content)
      VALUES (?, ?, ?)
    `,
      [postId, authorName, content]
    )

    return result.lastID
  }

  async incrementPostViews(postId) {
    await this.db.run(
      `
      UPDATE posts
      SET views = views + 1
      WHERE id = ?
    `,
      [postId]
    )
  }

  async getStatistics() {
    const stats = await this.db.get(`
      SELECT
        (SELECT COUNT(*) FROM authors) as total_authors,
        (SELECT COUNT(*) FROM posts WHERE status = 'published') as published_posts,
        (SELECT COUNT(*) FROM posts WHERE status = 'draft') as draft_posts,
        (SELECT COUNT(*) FROM comments) as total_comments,
        (SELECT SUM(views) FROM posts) as total_views
    `)

    return stats
  }

  async close() {
    if (this.db) {
      await this.db.close()
    }
  }
}

// 使用示例
async function main() {
  const blog = new BlogSystem("blog.db")
  await blog.initialize()

  try {
    // 创建作者
    const authorId = await blog.createAuthor(
      "john_doe",
      "john@example.com",
      "password123",
      "A passionate writer"
    )

    // 创建文章
    const postId = await blog.createPost(
      authorId,
      "Node.js SQLite 教程",
      "这是一篇关于如何在 Node.js 中使用 SQLite 的详细教程...",
      "published",
      ["Node.js", "SQLite", "数据库"]
    )

    // 获取文章列表
    const posts = await blog.getPosts("published", null, 5, 0)
    console.log("文章列表:", posts)

    // 获取单篇文章详情
    const postDetail = await blog.getPostById(postId)
    console.log("文章详情:", postDetail)

    // 添加评论
    await blog.addComment(postId, "读者A", "很棒的文章，学到了很多！")

    // 增加浏览量
    await blog.incrementPostViews(postId)

    // 获取统计信息
    const stats = await blog.getStatistics()
    console.log("博客统计:", stats)
  } finally {
    await blog.close()
  }
}

main().catch(console.error)
```

## 最佳实践速查表

### 🔧 开发前准备

1. **选择合适的包**：
   - 新项目推荐使用 `sqlite` 包（Promise 版本）
   - 老项目维护可继续使用 `sqlite3` 包
   - 实验性项目可尝试 Node.js 内置 SQLite 模块

2. **项目结构建议**：
```text
project/
├── src/
│   ├── database/
│   │   ├── connection.js    # 数据库连接配置
│   │   ├── models/          # 数据模型
│   │   └── migrations/      # 数据库迁移
│   ├── services/            # 业务逻辑
│   └── app.js              # 应用入口
├── data/                   # 数据库文件
└── tests/                  # 测试文件
```

### 🚀 编码最佳实践

1. **连接管理**：
   ```javascript
   // ✅ 好的做法：使用连接池和自动重连
   const db = await open({
     filename: 'app.db',
     driver: sqlite3.Database,
     mode: sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE
   })

   // ❌ 避免：频繁打开关闭连接
   // 每个操作都创建新连接会降低性能
   ```

2. **查询安全**：
   ```javascript
   // ✅ 使用参数化查询防止 SQL 注入
   const user = await db.get(
     'SELECT * FROM users WHERE email = ? AND status = ?',
     [email, 'active']
   )

   // ❌ 永远不要拼接 SQL 字符串
   // const user = await db.get(`SELECT * FROM users WHERE email = '${email}'`)
   ```

3. **错误处理**：
   ```javascript
   // ✅ 完整的错误处理
   try {
     await db.exec('BEGIN TRANSACTION')
     // ... 数据库操作
     await db.exec('COMMIT')
   } catch (error) {
     await db.exec('ROLLBACK')
     console.error('数据库操作失败:', error)
     throw error // 向上传递错误
   }
   ```

### 📊 性能优化清单

1. **索引优化**：
   - 为 WHERE 子句中使用的列创建索引
   - 为 JOIN 操作中的连接列创建索引
   - 为 ORDER BY 子句中的列创建索引
   - 避免在频繁更新的列上创建过多索引

2. **查询优化**：
   - 只查询需要的列，避免 SELECT *
   - 使用 LIMIT 限制结果集大小
   - 合理使用 JOIN，避免不必要的连接
   - 使用 EXISTS 替代 IN 进行子查询优化

3. **批量操作**：
   ```javascript
   // ✅ 使用事务和预处理语句进行批量操作
   await db.exec('BEGIN TRANSACTION')
   const stmt = await db.prepare('INSERT INTO products (name, price) VALUES (?, ?)')

   for (const product of products) {
     await stmt.run(product.name, product.price)
   }

   await stmt.finalize()
   await db.exec('COMMIT')
   ```

### 🛡️ 安全建议

1. **数据验证**：
   ```javascript
   // 在插入数据库前验证数据
   function validateUser(userData) {
     if (!userData.email || !userData.email.includes('@')) {
       throw new Error('无效的邮箱地址')
     }
     if (!userData.name || userData.name.length < 2) {
       throw new Error('姓名长度不能少于2个字符')
     }
     return true
   }
   ```

2. **敏感数据处理**：
   - 密码必须加密存储，使用 bcrypt 等加密库
   - 个人身份信息 (PII) 需要特殊保护
   - 定期备份数据库文件
   - 限制数据库文件的文件系统权限

### 📋 调试和监控

1. **日志记录**：
   ```javascript
   // 记录慢查询
   const startTime = Date.now()
   const result = await db.all('SELECT * FROM large_table')
   const queryTime = Date.now() - startTime

   if (queryTime > 1000) { // 超过1秒的查询
     console.warn(`慢查询警告: ${queryTime}ms`)
   }
   ```

2. **数据库健康检查**：
   ```javascript
   // 定期检查数据库完整性
   async function checkDatabaseHealth(db) {
     try {
       await db.get('PRAGMA integrity_check')
       const stats = await db.get('PRAGMA stats')
       console.log('数据库健康状态:', stats)
     } catch (error) {
       console.error('数据库健康检查失败:', error)
     }
   }
   ```

### 🎯 常见陷阱和解决方案

| 问题 | 症状 | 解决方案 |
|------|------|----------|
| 数据库锁定 | "database is locked" 错误 | 减少并发写入，使用 WAL 模式，增加超时时间 |
| 内存泄漏 | 应用内存使用持续增长 | 及时关闭预处理语句和数据库连接 |
| 性能下降 | 查询越来越慢 | 定期执行 VACUUM，优化索引，检查查询计划 |
| 数据损坏 | 查询返回异常结果 | 启用完整性检查，定期备份，使用事务 |

## 总结与展望

### 核心要点回顾

1. **环境配置**：Node.js 22+ 内置 SQLite 模块，但生产环境建议使用稳定的第三方包
2. **API 选择**：`sqlite` 包提供 Promise/Async API，更适合现代 Node.js 开发
3. **最佳实践**：
   - 使用参数化查询防止 SQL 注入
   - 合理使用事务保证数据一致性
   - 创建适当的索引提高查询性能
   - 实施数据验证和错误处理
   - 使用连接池和适当的并发控制

### 性能优化要点

1. **索引策略**：为经常查询的列创建索引，使用复合索引优化多列查询
2. **批量操作**：使用事务和预处理语句进行批量插入/更新
3. **查询优化**：避免 SELECT \*，使用 LIMIT 限制结果集，合理使用 JOIN
4. **配置调优**：调整缓存大小、启用 WAL 模式、设置适当的超时时间

### 未来发展趋势

1. **Node.js 内置模块**：随着 Node.js 内置 SQLite 模块的稳定，可能会成为首选方案
2. **TypeScript 支持**：更多 SQLite 包将提供更好的 TypeScript 类型支持
3. **ORM 框架**：更完善的 SQLite ORM 框架，简化数据库操作
4. **云原生支持**：更好的容器化和云部署支持

### 学习建议

1. **循序渐进**：从基础 CRUD 操作开始，逐步学习高级特性
2. **实践导向**：通过实际项目练习，加深理解和掌握
3. **性能意识**：始终关注性能优化，养成良好的数据库设计习惯
4. **安全优先**：重视数据安全和错误处理，避免常见安全漏洞

SQLite 作为轻量级数据库，在 Node.js 工具开发中具有重要地位。掌握其核心用法和最佳实践，将极大提升开发效率和数据处理能力。

---

## 参考资料

- [Node.js 官方 SQLite 文档](https://nodejs.org/docs/latest/api/sqlite.html)
- [SQLite 官方网站](https://www.sqlite.org/)
- [sqlite3 npm 包](https://www.npmjs.com/package/sqlite3)
- [sqlite npm 包](https://www.npmjs.com/package/sqlite)
- [DB Browser for SQLite](https://sqlitebrowser.org/)

## 相关工具推荐

- **DB Browser for SQLite**：图形化数据库管理工具
- **SQLiteStudio**：跨平台 SQLite 管理工具
- **DataGrip**：JetBrains 出品的多数据库管理工具
- **Prisma**：现代 Node.js ORM，支持 SQLite
