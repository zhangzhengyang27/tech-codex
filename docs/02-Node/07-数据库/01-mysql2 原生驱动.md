---
title: mysql2 原生驱动
description: mysql2 的连接池、预处理语句与流式结果集，对比 mysql 驱动的优势
keywords: [Node.js, MySQL, mysql2, 连接池]
category: Node.js
tags: [Node.js, 数据库]
---

# mysql2 原生驱动

mysql2 是一个为 Node.js 设计的现代化 MySQL 客户端库，以其卓越的性能和开发者友好性而著称。作为广受欢迎的 mysql 库的直接替代品和精神续作，它提供了显著的速度提升和一系列高级功能。

## 系统架构

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        Node.js 应用                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      mysql2 驱动层                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Connection Pool (连接池)                 │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐            │  │
│  │  │Connection│ │Connection│ │Connection│  ...       │  │
│  │  │    1     │ │    2     │ │    3     │            │  │
│  │  └──────────┘ └──────────┘ └──────────┘            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Protocol Parser (协议解析器)                 │  │
│  │  • MySQL 协议编解码                                   │  │
│  │  • 预处理语句管理                                     │  │
│  │  • 结果集流式处理                                     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MySQL 数据库服务器                        │
│  • 数据存储与管理                                            │
│  • 查询解析与执行                                            │
│  • 事务处理                                                  │
└─────────────────────────────────────────────────────────────┘
```

### 核心模块

| 模块 | 说明 | 主要功能 |
|------|------|---------|
| **连接池 (Connection Pool)** | 管理数据库连接的生命周期 | 连接复用、负载均衡、连接泄漏检测 |
| **连接 (Connection)** | 单个数据库连接实例 | 执行查询、事务管理 |
| **预处理语句 (Prepared Statement)** | SQL 模板与参数分离 | 防止 SQL 注入、提升性能 |
| **流式查询 (Stream Query)** | 大数据集分批处理 | 降低内存消耗、实时数据处理 |
| **Promise 支持** | 异步操作封装 | async/await 语法支持 |

---

## 核心特性

### 1. 卓越的性能

mysql2 的协议解析器是从头开始编写的，其性能远超原始的 mysql 库：

- **快速解析**：优化的二进制协议解析器
- **批量操作**：支持批量插入和更新
- **连接复用**：高效的连接池管理

### 2. 预处理语句 (Prepared Statements)

这是 mysql2 最重要的安全特性：

```
┌──────────────┐        ┌──────────────┐
│  SQL 模板    │───────>│  MySQL 服务器 │
│  SELECT *    │        │  1. 解析      │
│  FROM users  │        │  2. 编译      │
│  WHERE id=?  │        │  3. 缓存      │
└──────────────┘        └──────────────┘
                              ▲
                              │
┌──────────────┐              │
│  参数值      │──────────────┘
│  [123]       │        执行（可重复）
└──────────────┘
```

**优势：**
- ✅ **防止 SQL 注入**：从根本上杜绝注入攻击
- ✅ **提升性能**：重复查询只需编译一次
- ✅ **类型安全**：自动处理参数类型转换

### 3. Promise 与 Async/Await

现代化的异步编程支持：

```javascript
// 传统回调方式
pool.query('SELECT * FROM users', (err, results) => {
  // ...
})

// Promise 方式
const [results] = await pool.execute('SELECT * FROM users')
```

### 4. 流式查询

处理大数据集的利器：

```
大数据集查询 (100万行)
    │
    ├─ 传统方式：一次性加载到内存 → ❌ 内存溢出风险
    │
    └─ 流式查询：逐行处理 → ✅ 恒定内存占用
```

### 5. TypeScript 支持

开箱即用的类型定义，提供良好的开发体验。

---

## 安装与配置

### 安装

```bash
# 安装 mysql2
npm install mysql2

# 可选：安装环境变量管理
npm install dotenv
```

### 配置参数详解

#### 基础连接参数

```javascript
const mysql = require('mysql2')

const connection = mysql.createConnection({
  // 必需参数
  host: 'localhost',           // 数据库主机地址
  user: 'root',                // 数据库用户名
  password: 'password',        // 数据库密码
  database: 'mydb',            // 数据库名称
  
  // 可选参数
  port: 3306,                  // 端口号，默认 3306
  charset: 'utf8mb4',          // 字符集，默认 utf8mb4
  timezone: '+08:00',          // 时区设置
  connectTimeout: 10000,       // 连接超时时间（毫秒）
  
  // SSL 配置
  ssl: {
    ca: fs.readFileSync('/path/to/ca.pem'),
    cert: fs.readFileSync('/path/to/client-cert.pem'),
    key: fs.readFileSync('/path/to/client-key.pem')
  }
})
```

#### 连接池参数

```javascript
const pool = mysql.createPool({
  // 基础参数
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'mydb',
  
  // 连接池配置
  connectionLimit: 10,         // 最大连接数（默认 10）
  waitForConnections: true,    // 连接池满时是否等待（默认 true）
  queueLimit: 0,               // 等待队列最大长度（0 表示无限制）
  
  // 连接生命周期管理
  maxIdle: 10,                 // 最大空闲连接数
  idleTimeout: 60000,          // 空闲连接超时时间（毫秒）
  
  // 连接保活
  enableKeepAlive: true,       // 启用 TCP Keep-Alive
  keepAliveInitialDelay: 0,    // Keep-Alive 初始延迟
  
  // 性能优化
  multipleStatements: false,   // 禁用多语句（安全考虑）
  namedPlaceholders: false,    // 命名占位符（默认关闭）
})
```

**参数最佳实践：**

| 参数 | 推荐值 | 说明 |
|------|--------|------|
| `connectionLimit` | 10-20 | 根据 CPU 核心数和数据库配置调整 |
| `queueLimit` | 0 | 无限制等待，配合应用层超时控制 |
| `waitForConnections` | true | 避免连接池满时立即失败 |
| `idleTimeout` | 30000-60000 | 及时释放空闲连接 |
| `multipleStatements` | false | 安全考虑，禁用多语句执行 |

### 环境变量配置

**创建 `.env` 文件：**

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=myapp_database

# 连接池配置
DB_CONNECTION_LIMIT=10
DB_QUEUE_LIMIT=0

# SSL 配置（生产环境）
DB_SSL_ENABLED=true
DB_SSL_CA=/path/to/ca.pem
```

**加载配置：**

```javascript
require('dotenv').config()

const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0
})

module.exports = pool
```

---

## 快速入门

### 基础连接示例

```javascript
const mysql = require('mysql2')

// 创建连接
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'testdb'
})

// 执行查询
connection.query('SELECT * FROM users LIMIT 5', (err, results, fields) => {
  if (err) {
    console.error('查询错误:', err.message)
    return
  }
  console.log('查询结果:', results)
  console.log('字段信息:', fields.map(f => f.name))
})

// 关闭连接
connection.end()
```

### 使用连接池（推荐）

```javascript
const mysql = require('mysql2')
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'testdb',
  connectionLimit: 10
})

// 直接使用 pool.query（自动管理连接）
pool.query('SELECT * FROM products', (err, results) => {
  if (err) throw err
  console.log('产品列表:', results)
})

// 关闭连接池
pool.end(err => {
  if (err) console.error('关闭连接池失败:', err)
  console.log('连接池已关闭')
})
```

### Promise 版本（推荐）

```javascript
const mysql = require('mysql2/promise')

async function main() {
  // 创建连接池
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'password',
    database: 'testdb'
  })

  try {
    // 执行查询
    const [rows, fields] = await pool.execute(
      'SELECT * FROM users WHERE age > ?',
      [18]
    )
    console.log('成年用户:', rows)
  } catch (error) {
    console.error('查询失败:', error)
  } finally {
    await pool.end()
  }
}

main()
```

---

## 核心概念

### 连接 vs 连接池

```
┌─────────────────────────────────────────────────────────────┐
│                    单连接模式                                │
│  ┌────────┐      ┌──────────┐      ┌──────────┐           │
│  │ 请求 1 │─────>│ 等待连接 │─────>│ 执行查询 │           │
│  └────────┘      └──────────┘      └──────────┘           │
│  ┌────────┐                        ┌──────────┐           │
│  │ 请求 2 │───────────────────────>│   阻塞   │ ❌        │
│  └────────┘                        └──────────┘           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    连接池模式                                │
│  ┌────────┐      ┌──────────────────────┐                  │
│  │ 请求 1 │─────>│ 从池中获取连接       │──┐               │
│  └────────┘      └──────────────────────┘  │               │
│  ┌────────┐      ┌──────────────────────┐  │  ┌─────────┐ │
│  │ 请求 2 │─────>│ 从池中获取另一个连接 │──┼─>│ 并发执行│ ✅│
│  └────────┘      └──────────────────────┘  │  └─────────┘ │
│  ┌────────┐      ┌──────────────────────┐  │               │
│  │ 请求 3 │─────>│ 从池中获取连接       │──┘               │
│  └────────┘      └──────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

**对比表：**

| 特性 | 单连接 | 连接池 |
|------|--------|--------|
| **并发能力** | ❌ 低（串行执行） | ✅ 高（并行执行） |
| **连接开销** | ❌ 高（频繁创建销毁） | ✅ 低（连接复用） |
| **资源管理** | ❌ 手动管理 | ✅ 自动管理 |
| **适用场景** | 脚本、简单应用 | Web 服务、生产环境 |

### query vs execute

| 方法 | 工作原理 | 安全性 | 性能 | 适用场景 |
|------|---------|--------|------|---------|
| `query()` | 客户端拼接 SQL 后发送 | ⚠️ 需手动防注入 | 中等 | 流式查询、一次性查询 |
| `execute()` | 先发送模板，再发送参数 | ✅ 自动防注入 | 高（可缓存） | 参数化查询、重复查询 |

**示例对比：**

```javascript
// ❌ 危险：直接拼接 SQL（SQL 注入风险）
const userId = "1 OR 1=1"
pool.query(`SELECT * FROM users WHERE id = ${userId}`)

// ⚠️ 使用 query + 参数（安全但无预处理优势）
pool.query('SELECT * FROM users WHERE id = ?', [userId])

// ✅ 推荐：使用 execute（预处理语句）
pool.execute('SELECT * FROM users WHERE id = ?', [userId])
```

### 结果集结构

```javascript
const [rows, fields] = await pool.execute('SELECT id, name FROM users')

// rows: 结果数据数组
[
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' }
]

// fields: 字段元数据数组
[
  {
    name: 'id',
    type: 'LONG',
    length: 11,
    db: 'mydb',
    table: 'users',
    ...
  },
  {
    name: 'name',
    type: 'VAR_STRING',
    length: 255,
    ...
  }
]
```

---

## API 接口说明

### 连接池 API

#### `pool.execute(sql, [values])`

执行预处理语句（推荐）。

```javascript
// 查询
const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [1])

// 插入
const [result] = await pool.execute(
  'INSERT INTO users (name, email) VALUES (?, ?)',
  ['Alice', 'alice@example.com']
)
console.log('插入ID:', result.insertId)

// 更新
const [result] = await pool.execute(
  'UPDATE users SET name = ? WHERE id = ?',
  ['Bob', 1]
)
console.log('影响行数:', result.affectedRows)

// 删除
const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [1])
console.log('删除行数:', result.affectedRows)
```

#### `pool.query(sql, [values])`

执行普通查询。

```javascript
const [rows] = await pool.query('SELECT NOW() as now')
```

#### `pool.getConnection`

从连接池获取连接（用于事务）。

```javascript
const connection = await pool.getConnection()
try {
  await connection.beginTransaction()
  // ... 执行多个操作
  await connection.commit()
} catch (error) {
  await connection.rollback()
  throw error
} finally {
  connection.release() // 归还连接
}
```

#### `pool.end`

关闭连接池。

```javascript
await pool.end()
```

### 连接 API

#### `connection.beginTransaction`

开始事务。

#### `connection.commit`

提交事务。

#### `connection.rollback`

回滚事务。

#### `connection.release`

释放连接回连接池。

### 结果对象属性

#### INSERT 操作结果

```javascript
{
  affectedRows: 1,      // 影响的行数
  insertId: 123,        // 插入的自增 ID
  warningStatus: 0      // 警告状态
}
```

#### UPDATE/DELETE 操作结果

```javascript
{
  affectedRows: 2,      // 影响的行数
  changedRows: 2,       // 实际修改的行数
  warningStatus: 0
}
```

#### SELECT 操作结果

```javascript
// 返回数组，每行一个对象
[
  { id: 1, name: 'Alice', email: 'alice@example.com' },
  { id: 2, name: 'Bob', email: 'bob@example.com' }
]
```

---

## 高级特性

### 1. 流式查询

处理大数据集时，避免内存溢出：

```javascript
const fs = require('fs')
const pool = require('./database')

async function exportLargeDataset() {
  return new Promise((resolve, reject) => {
    const writeStream = fs.createWriteStream('export.csv')
    const queryStream = pool
      .query('SELECT id, name, email FROM users')
      .stream()

    writeStream.write('id,name,email\n')

    queryStream.on('data', (row) => {
      // 每行数据处理
      writeStream.write(`${row.id},"${row.name}","${row.email}"\n`)
    })

    queryStream.on('end', () => {
      writeStream.end()
      console.log('导出完成')
      resolve()
    })

    queryStream.on('error', (err) => {
      writeStream.end()
      reject(err)
    })
  })
}
```

### 2. 事务处理

完整的事务处理示例：

```javascript
async function transferMoney(fromId, toId, amount) {
  const connection = await pool.getConnection()
  
  try {
    await connection.beginTransaction()

    // 检查余额
    const [accounts] = await connection.execute(
      'SELECT balance FROM accounts WHERE id = ? FOR UPDATE',
      [fromId]
    )
    
    if (accounts.length === 0) {
      throw new Error('源账户不存在')
    }
    
    if (accounts[0].balance < amount) {
      throw new Error('余额不足')
    }

    // 扣款
    await connection.execute(
      'UPDATE accounts SET balance = balance - ? WHERE id = ?',
      [amount, fromId]
    )

    // 加款
    await connection.execute(
      'UPDATE accounts SET balance = balance + ? WHERE id = ?',
      [amount, toId]
    )

    // 记录交易
    await connection.execute(
      'INSERT INTO transactions (from_id, to_id, amount) VALUES (?, ?, ?)',
      [fromId, toId, amount]
    )

    await connection.commit()
    return { success: true, message: '转账成功' }
    
  } catch (error) {
    await connection.rollback()
    return { success: false, error: error.message }
  } finally {
    connection.release()
  }
}
```

### 3. 批量操作

```javascript
// 批量插入
async function batchInsertUsers(users) {
  const sql = 'INSERT INTO users (name, email, age) VALUES ?'
  const values = users.map(u => [u.name, u.email, u.age])
  
  const [result] = await pool.query(sql, [values])
  console.log(`成功插入 ${result.affectedRows} 条记录`)
  return result
}

// 使用示例
await batchInsertUsers([
  { name: 'Alice', email: 'alice@example.com', age: 25 },
  { name: 'Bob', email: 'bob@example.com', age: 30 },
  { name: 'Charlie', email: 'charlie@example.com', age: 28 }
])
```

### 4. TypeScript 支持

```typescript
import { RowDataPacket, ResultSetHeader, Pool } from 'mysql2/promise'

// 定义数据类型
interface User extends RowDataPacket {
  id: number
  name: string
  email: string
  age: number
  createdAt: Date
}

// 类型安全的查询
async function getUserById(pool: Pool, id: number): Promise<User | null> {
  const [rows] = await pool.execute<User[]>(
    'SELECT * FROM users WHERE id = ?',
    [id]
  )
  return rows.length > 0 ? rows[0] : null
}

// 类型安全的插入
async function createUser(
  pool: Pool, 
  user: Omit<User, 'id' | 'createdAt'>
): Promise<number> {
  const [result] = await pool.execute<ResultSetHeader>(
    'INSERT INTO users (name, email, age) VALUES (?, ?, ?)',
    [user.name, user.email, user.age]
  )
  return result.insertId
}
```

### 5. 命名占位符

```javascript
const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'testdb',
  namedPlaceholders: true  // 启用命名占位符
})

// 使用命名参数
const [rows] = await pool.execute(
  'SELECT * FROM users WHERE age > :minAge AND city = :city',
  { minAge: 18, city: 'Beijing' }
)
```

---

## 性能优化

### 1. 连接池优化

**优化策略：**

```javascript
// 根据 CPU 核心数动态调整
const os = require('os')
const cpuCount = os.cpus().length

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'testdb',
  
  // 连接数 = CPU 核心数 * 2 + 1
  connectionLimit: cpuCount * 2 + 1,
  
  // 空闲连接管理
  maxIdle: cpuCount,
  idleTimeout: 30000,
  
  // 等待队列
  waitForConnections: true,
  queueLimit: 100
})
```

**监控连接池状态：**

```javascript
// 定期监控
setInterval(() => {
  console.log({
    totalConnections: pool.pool._allConnections.length,
    freeConnections: pool.pool._freeConnections.length,
    waitingForConnection: pool.pool._connectionQueue.length
  })
}, 5000)
```

### 2. 查询缓存

使用 Redis 缓存热点数据：

```javascript
const redis = require('redis')
const redisClient = redis.createClient({ url: process.env.REDIS_URL })
await redisClient.connect()

async function getProductWithCache(productId) {
  const cacheKey = `product:${productId}`
  
  // 1. 检查缓存
  const cached = await redisClient.get(cacheKey)
  if (cached) {
    return JSON.parse(cached)
  }
  
  // 2. 查询数据库
  const [rows] = await pool.execute(
    'SELECT * FROM products WHERE id = ?',
    [productId]
  )
  const product = rows[0]
  
  // 3. 写入缓存
  if (product) {
    await redisClient.setEx(cacheKey, 300, JSON.stringify(product))
  }
  
  return product
}
```

### 3. 慢查询监控

```javascript
// 慢查询监控中间件
async function executeWithMonitoring(sql, params, threshold = 500) {
  const start = Date.now()
  
  try {
    const result = await pool.execute(sql, params)
    return result
  } finally {
    const duration = Date.now() - start
    
    if (duration > threshold) {
      console.warn({
        type: 'SLOW_QUERY',
        duration: `${duration}ms`,
        sql,
        params,
        timestamp: new Date().toISOString()
      })
    }
  }
}
```

### 4. 批量操作优化

```javascript
// 批量插入优化
async function batchInsertOptimized(items) {
  const BATCH_SIZE = 1000
  const results = []
  
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)
    const values = batch.map(item => [item.name, item.email])
    
    const sql = 'INSERT INTO users (name, email) VALUES ?'
    const [result] = await pool.query(sql, [values])
    results.push(result)
  }
  
  return results
}
```

---

## 安全最佳实践

### 1. 防止 SQL 注入

```javascript
// ❌ 错误：直接拼接 SQL
const userId = req.params.id
pool.query(`SELECT * FROM users WHERE id = ${userId}`)  // 危险！

// ✅ 正确：使用预处理语句
pool.execute('SELECT * FROM users WHERE id = ?', [userId])

// ✅ 正确：使用命名占位符
pool.execute('SELECT * FROM users WHERE id = :id', { id: userId })
```

### 2. 敏感信息管理

```javascript
// ❌ 错误：硬编码密码
const pool = mysql.createPool({
  password: 'my_password_123'  // 危险！
})

// ✅ 正确：使用环境变量
const pool = mysql.createPool({
  password: process.env.DB_PASSWORD
})
```

### 3. 最小权限原则

```sql
-- 创建应用专用用户
CREATE USER 'app_user'@'%' IDENTIFIED BY 'secure_password';

-- 只授予必要的权限
GRANT SELECT, INSERT, UPDATE ON myapp.users TO 'app_user'@'%';
GRANT SELECT ON myapp.products TO 'app_user'@'%';

-- 禁止危险操作
REVOKE DELETE ON myapp.* FROM 'app_user'@'%';

FLUSH PRIVILEGES;
```

### 4. SSL/TLS 加密

```javascript
const fs = require('fs')

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  
  ssl: {
    ca: fs.readFileSync('/path/to/ca.pem'),
    cert: fs.readFileSync('/path/to/client-cert.pem'),
    key: fs.readFileSync('/path/to/client-key.pem'),
    rejectUnauthorized: true  // 严格验证证书
  }
})
```

### 5. 禁用多语句执行

```javascript
// ❌ 危险：启用多语句
const pool = mysql.createPool({
  multipleStatements: true  // 允许执行多条 SQL，增加注入风险
})

// ✅ 安全：禁用多语句（默认值）
const pool = mysql.createPool({
  multipleStatements: false
})
```

---

## 错误处理与调试

### 常见错误代码

| 错误代码 | 说明 | 解决方案 |
|---------|------|---------|
| `ECONNREFUSED` | 无法连接数据库 | 检查数据库服务是否启动 |
| `ER_ACCESS_DENIED_ERROR` | 访问被拒绝 | 检查用户名密码 |
| `ER_DUP_ENTRY` | 唯一键冲突 | 检查数据是否重复 |
| `ER_NO_REFERENCED_ROW_2` | 外键约束失败 | 检查关联数据是否存在 |
| `ER_PARSE_ERROR` | SQL 语法错误 | 检查 SQL 语法 |
| `PROTOCOL_CONNECTION_LOST` | 连接丢失 | 实现重连机制 |
| `ER_LOCK_DEADLOCK` | 死锁 | 实现重试机制 |

### 错误处理示例

```javascript
class DatabaseError extends Error {
  constructor(message, code, sql = '') {
    super(message)
    this.name = 'DatabaseError'
    this.code = code
    this.sql = sql
  }
}

async function safeQuery(sql, params) {
  try {
    return await pool.execute(sql, params)
  } catch (error) {
    // 记录详细错误信息
    console.error({
      message: error.message,
      code: error.code,
      sql: error.sql,
      params,
      timestamp: new Date().toISOString()
    })
    
    // 转换为应用错误
    switch (error.code) {
      case 'ER_DUP_ENTRY':
        throw new DatabaseError('数据已存在', 'DUPLICATE_ENTRY', sql)
      case 'ER_NO_REFERENCED_ROW_2':
        throw new DatabaseError('关联数据不存在', 'INVALID_REFERENCE', sql)
      default:
        throw new DatabaseError('数据库操作失败', 'DATABASE_ERROR', sql)
    }
  }
}
```

### 自动重试机制

```javascript
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 100,
    shouldRetry = (err) => ['ER_LOCK_DEADLOCK', 'PROTOCOL_CONNECTION_LOST'].includes(err.code)
  } = options
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error
      }
      
      const delay = initialDelay * Math.pow(2, attempt - 1)
      console.warn(`尝试 ${attempt}/${maxRetries} 失败，${delay}ms 后重试...`)
      await sleep(delay)
    }
  }
}

// 使用示例
const result = await withRetry(
  () => pool.execute('UPDATE accounts SET balance = balance - ? WHERE id = ?', [100, 1]),
  { maxRetries: 3 }
)
```

---

## 实战应用

### Express.js REST API 完整示例

**项目结构：**

```
project/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   └── user.model.js
│   ├── controllers/
│   │   └── user.controller.js
│   ├── routes/
│   │   └── user.routes.js
│   ├── middleware/
│   │   └── errorHandler.js
│   └── app.js
├── .env
└── package.json
```

**数据库配置 (`src/config/database.js`)：**

```javascript
require('dotenv').config()
const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
})

// 监听连接池事件
pool.on('acquire', (connection) => {
  console.log(`连接 ${connection.threadId} 被获取`)
})

pool.on('release', (connection) => {
  console.log(`连接 ${connection.threadId} 被释放`)
})

pool.on('enqueue', () => {
  console.warn('连接池已满，请求正在排队')
})

module.exports = pool
```

**用户模型 (`src/models/user.model.js`)：**

```javascript
const pool = require('../config/database')

class UserModel {
  async findAll(options = {}) {
    const { page = 1, limit = 10 } = options
    const offset = (page - 1) * limit
    
    const [rows] = await pool.execute(
      'SELECT id, name, email, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
      // execute 走服务端预处理语句，LIMIT/OFFSET 需传数字（字符串会报 Incorrect arguments）
      [Number(limit), Number(offset)]
    )
    
    const [countRows] = await pool.execute('SELECT COUNT(*) as total FROM users')
    
    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: countRows[0].total,
        totalPages: Math.ceil(countRows[0].total / limit)
      }
    }
  }

  async findById(id) {
    const [rows] = await pool.execute(
      'SELECT id, name, email, created_at FROM users WHERE id = ?',
      [id]
    )
    return rows[0] || null
  }

  async create(userData) {
    const { name, email, password } = userData
    
    const [result] = await pool.execute(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, password]
    )
    
    return this.findById(result.insertId)
  }

  async update(id, userData) {
    const fields = []
    const values = []
    
    if (userData.name) {
      fields.push('name = ?')
      values.push(userData.name)
    }
    if (userData.email) {
      fields.push('email = ?')
      values.push(userData.email)
    }
    
    if (fields.length === 0) {
      return this.findById(id)
    }
    
    values.push(id)
    
    await pool.execute(
      `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      values
    )
    
    return this.findById(id)
  }

  async delete(id) {
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [id])
    return result.affectedRows > 0
  }
}

module.exports = new UserModel()
```

**用户控制器 (`src/controllers/user.controller.js`)：**

```javascript
const userModel = require('../models/user.model')

class UserController {
  async getUsers(req, res, next) {
    try {
      const result = await userModel.findAll(req.query)
      res.json(result)
    } catch (error) {
      next(error)
    }
  }

  async getUser(req, res, next) {
    try {
      const user = await userModel.findById(req.params.id)
      if (!user) {
        return res.status(404).json({ error: '用户不存在' })
      }
      res.json(user)
    } catch (error) {
      next(error)
    }
  }

  async createUser(req, res, next) {
    try {
      const user = await userModel.create(req.body)
      res.status(201).json(user)
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: '邮箱已被注册' })
      }
      next(error)
    }
  }

  async updateUser(req, res, next) {
    try {
      const user = await userModel.update(req.params.id, req.body)
      if (!user) {
        return res.status(404).json({ error: '用户不存在' })
      }
      res.json(user)
    } catch (error) {
      next(error)
    }
  }

  async deleteUser(req, res, next) {
    try {
      const deleted = await userModel.delete(req.params.id)
      if (!deleted) {
        return res.status(404).json({ error: '用户不存在' })
      }
      res.status(204).send()
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new UserController()
```

**路由定义 (`src/routes/user.routes.js`)：**

```javascript
const express = require('express')
const userController = require('../controllers/user.controller')

const router = express.Router()

router.get('/', userController.getUsers)
router.get('/:id', userController.getUser)
router.post('/', userController.createUser)
router.put('/:id', userController.updateUser)
router.delete('/:id', userController.deleteUser)

module.exports = router
```

**错误处理中间件 (`src/middleware/errorHandler.js`)：**

```javascript
function errorHandler(err, req, res, next) {
  console.error('错误:', err)

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: '数据重复' })
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ error: '关联数据不存在' })
  }

  if (err.name === 'DatabaseError') {
    return res.status(500).json({ error: '数据库操作失败' })
  }

  res.status(500).json({ error: '服务器内部错误' })
}

module.exports = errorHandler
```

**应用入口 (`src/app.js`)：**

```javascript
require('dotenv').config()
const express = require('express')
const userRoutes = require('./routes/user.routes')
const errorHandler = require('./middleware/errorHandler')

const app = express()

// 中间件
app.use(express.json())

// 路由
app.use('/api/users', userRoutes)

// 错误处理
app.use(errorHandler)

// 启动服务器
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`)
})
```

---

## 常见问题解答

### Q1: 连接池应该设置多少个连接？

**A:** 推荐公式：`连接数 = CPU 核心数 × 2 + 1`

```javascript
const os = require('os')
const connectionLimit = os.cpus().length * 2 + 1
```

实际应用中需要通过压力测试调整最优值。

### Q2: query 和 execute 该用哪个？

**A:** 推荐使用 `execute`：
- ✅ 自动防止 SQL 注入
- ✅ 重复查询性能更好（预处理语句缓存）
- ✅ 类型安全

只有在需要流式查询时才使用 `query`。

### Q3: 如何处理数据库连接丢失？

**A:** 实现自动重连和重试机制：

```javascript
const pool = mysql.createPool({
  // ... 其他配置
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000  // 首次 Keep-Alive 探测前的延迟
})
```

### Q4: 如何调试 SQL 查询？

**A:** 启用查询日志：

```javascript
// 开发环境启用查询日志
if (process.env.NODE_ENV === 'development') {
  const originalExecute = pool.execute.bind(pool)
  pool.execute = async function(sql, params) {
    console.log('SQL:', sql)
    console.log('参数:', params)
    const start = Date.now()
    const result = await originalExecute(sql, params)
    console.log(`执行时间: ${Date.now() - start}ms`)
    return result
  }
}
```

### Q5: 如何处理大结果集？

**A:** 使用流式查询：

```javascript
const stream = pool.query('SELECT * FROM large_table').stream()

stream.on('data', (row) => {
  // 逐行处理
})

stream.on('end', () => {
  console.log('处理完成')
})
```

### Q6: 如何实现数据库迁移？

**A:** 建议使用专门的迁移工具：
- [Knex.js](https://knexjs.org/) - 支持 migrations
- [Umzug](https://github.com/sequelize/umzug) - 通用的迁移工具

### Q7: 如何测试数据库代码？

**A:** 使用测试数据库和事务回滚：

```javascript
describe('UserService', () => {
  let connection
  
  beforeAll(async () => {
    connection = await pool.getConnection()
  })
  
  afterAll(async () => {
    connection.release()
  })
  
  beforeEach(async () => {
    await connection.beginTransaction()
  })
  
  afterEach(async () => {
    await connection.rollback()
  })
  
  test('创建用户', async () => {
    const user = await createUser({ name: 'Test' })
    expect(user.name).toBe('Test')
  })
})
```

---

## 选择建议

### mysql2 vs ORM

| 特性 | mysql2 (原生驱动) | ORM (如 Sequelize) |
|------|------------------|-------------------|
| **抽象层次** | 低。直接编写 SQL | 高。面向对象操作 |
| **控制力** | 极高。完全控制 SQL | 中等。自动生成 SQL |
| **开发速度** | 较慢。手动编写 SQL | 快。内置 CRUD |
| **学习曲线** | 低。熟悉 SQL 即可 | 较高。需学习 ORM API |
| **性能** | 通常更高。无中间层 | 可能较低。SQL 不是最优 |
| **类型安全** | 需手动定义 | 自动生成类型 |

### 适用场景

**选择 mysql2 当：**
- ✅ 追求极致性能
- ✅ 需要完全控制 SQL
- ✅ 项目较简单
- ✅ 团队熟悉 SQL

**选择 ORM 当：**
- ✅ 复杂的业务模型
- ✅ 需要快速开发
- ✅ 需要数据库迁移功能
- ✅ 希望代码与数据库解耦

---

## 参考资料

- [mysql2 NPM 主页](https://www.npmjs.com/package/mysql2)
- [mysql2 GitHub 仓库](https://github.com/sidorares/node-mysql2)
- [MySQL 官方文档](https://dev.mysql.com/doc/)
- [OWASP SQL 注入防护指南](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)
- [Node.js 最佳实践](https://github.com/goldbergyoni/nodebestpractices)
