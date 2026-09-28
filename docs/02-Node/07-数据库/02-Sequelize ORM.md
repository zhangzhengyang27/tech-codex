---
title: Sequelize ORM
description: Sequelize 的模型定义、关联、事务与迁移，含查询优化
keywords: [Node.js, MySQL, Sequelize, ORM]
category: Node.js
tags: [Node.js, 数据库]
---

# Sequelize ORM

Sequelize 是一个功能强大的、基于 Promise 的 Node.js 对象关系映射（ORM）工具，适用于 PostgreSQL、MySQL、MariaDB、SQLite 和 Microsoft SQL Server 等多种关系型数据库。它提供了丰富的抽象层，让开发者可以使用面向对象的方式操作数据库。

## 系统架构

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                    Node.js 应用层                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   业务逻辑代码                        │  │
│  │         Models • Controllers • Services              │  │
│  └────────────────────────┬─────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Sequelize ORM 层                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                 Model Layer (模型层)                  │  │
│  │  User Model  │  Post Model  │  Comment Model         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Query Interface (查询接口)               │  │
│  │  • 查询构建器                                        │  │
│  │  • 关联加载                                          │  │
│  │  • 作用域                                            │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Connection Pool (连接池管理)                │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Schema Management (Schema 管理)              │  │
│  │  • 迁移 (Migrations)                                 │  │
│  │  • 同步 (Sync)                                       │  │
│  │  • 种子数据 (Seeders)                                │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              数据库驱动层 (Dialect Drivers)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  MySQL   │ │PostgreSQL│ │  SQLite  │ │ MSSQL    │      │
│  │  mysql2  │ │   pg     │ │ sqlite3  │ │ tedious  │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└───────────────────────────┼─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     数据库服务器                             │
│  MySQL • PostgreSQL • MariaDB • SQLite • SQL Server        │
└─────────────────────────────────────────────────────────────┘
```

### 核心模块

| 模块 | 说明 | 主要功能 |
|------|------|---------|
| **Sequelize** | 主类实例 | 连接管理、模型定义、查询执行 |
| **Model** | 模型基类 | 数据映射、验证、钩子、作用域 |
| **QueryInterface** | 查询接口 | Schema 操作、表结构管理 |
| **DataTypes** | 数据类型 | 字段类型定义 |
| **Op** | 操作符 | 查询条件操作符 |
| **Transaction** | 事务 | ACID 保证 |

---

## 核心特性

### 1. 跨数据库支持

支持多种主流关系型数据库：

```
┌─────────────────────────────────────────────┐
│         Sequelize 支持的数据库              │
├─────────────────────────────────────────────┤
│  MySQL 5.7+          │  PostgreSQL 9.5+     │
│  MariaDB 10.2+       │  SQLite 3.8.8+       │
│  SQL Server 2012+    │                      │
└─────────────────────────────────────────────┘
```

### 2. 强大的模型系统

- **模型定义**：将数据库表映射为 JavaScript 类
- **数据验证**：内置验证器，保证数据完整性
- **钩子函数**：生命周期钩子，实现业务逻辑
- **作用域**：定义可复用的查询条件

### 3. 丰富的关联关系

```
┌──────────────────────────────────────────────────┐
│                 关联关系类型                      │
├──────────────────────────────────────────────────┤
│  HasOne        一对一（主表拥有一个从表记录）     │
│  BelongsTo     一对一（从表属于主表）             │
│  HasMany       一对多（主表拥有多个从表记录）     │
│  BelongsToMany 多对多（通过中间表关联）           │
└──────────────────────────────────────────────────┘
```

### 4. 数据库迁移

版本化管理数据库 Schema：

```
Migration 1: 创建 users 表
     ↓
Migration 2: 添加 email 字段
     ↓
Migration 3: 创建 posts 表
     ↓
Migration 4: 添加外键关联
```

### 5. Promise 支持

完全基于 Promise，支持 async/await：

```javascript
// 创建用户
const user = await User.create({ name: 'Alice' })

// 查询用户
const users = await User.findAll({ where: { age: { [Op.gt]: 18 } } })
```

---

## 安装与配置

### 安装

```bash
# 安装 Sequelize CLI（开发依赖）
npm install --save-dev sequelize-cli

# 安装 Sequelize 和数据库驱动
# MySQL
npm install sequelize mysql2

# PostgreSQL
npm install sequelize pg pg-hstore

# SQLite
npm install sequelize sqlite3

# SQL Server
npm install sequelize tedious
```

### 初始化项目

```bash
npx sequelize-cli init
```

这将创建以下目录结构：

```
project/
├── config/
│   └── config.json        # 数据库配置
├── models/
│   └── index.js           # 模型入口文件
├── migrations/            # 迁移文件
└── seeders/               # 种子数据文件
```

### 配置文件

#### 方式一：JSON 配置 (`config/config.json`)

```json
{
  "development": {
    "username": "root",
    "password": "password",
    "database": "myapp_dev",
    "host": "127.0.0.1",
    "dialect": "mysql",
    "define": {
      "underscored": true,
      "timestamps": true,
      "createdAt": "created_at",
      "updatedAt": "updated_at",
      "deletedAt": "deleted_at",
      "paranoid": true
    },
    "pool": {
      "max": 5,
      "min": 0,
      "acquire": 30000,
      "idle": 10000
    }
  },
  "test": {
    "username": "root",
    "password": null,
    "database": "myapp_test",
    "host": "127.0.0.1",
    "dialect": "mysql"
  },
  "production": {
    "use_env_variable": "DATABASE_URL",
    "dialect": "mysql",
    "dialectOptions": {
      "ssl": {
        "require": true,
        "rejectUnauthorized": false
      }
    }
  }
}
```

#### 方式二：JavaScript 配置 (`config/config.js`)

```javascript
require('dotenv').config()

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'myapp_dev',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: console.log,
    define: {
      underscored: true,
      timestamps: true,
      paranoid: true
    },
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    username: 'root',
    password: null,
    database: 'myapp_test',
    host: '127.0.0.1',
    dialect: 'mysql',
    logging: false
  },
  production: {
    use_env_variable: 'DATABASE_URL',
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000
    }
  }
}
```

### 连接数据库

```javascript
const { Sequelize } = require('sequelize')

// 方式一：直接传入参数
const sequelize = new Sequelize('database', 'username', 'password', {
  host: 'localhost',
  dialect: 'mysql'  // 还支持 'postgres'、'sqlite'、'mariadb'、'mssql'
})

// 方式二：使用连接字符串
const sequelize = new Sequelize('mysql://user:pass@example.com:3306/dbname')

// 方式三：SQLite
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: 'path/to/database.sqlite'
})

// 测试连接
async function testConnection() {
  try {
    await sequelize.authenticate()
    console.log('数据库连接成功')
  } catch (error) {
    console.error('数据库连接失败:', error)
  }
}
```

### 配置参数详解

| 参数 | 类型 | 说明 | 默认值 |
|------|------|------|--------|
| `host` | String | 数据库主机 | 'localhost' |
| `port` | Number | 数据库端口 | 3306 (MySQL) |
| `username` | String | 用户名 | null |
| `password` | String | 密码 | null |
| `database` | String | 数据库名 | null |
| `dialect` | String | 数据库类型 | 'mysql' |
| `logging` | Boolean/Function | SQL 日志 | console.log |
| `timezone` | String | 时区 | '+00:00' |
| `define` | Object | 模型默认配置 | {} |
| `pool.max` | Number | 最大连接数 | 5 |
| `pool.min` | Number | 最小连接数 | 0 |
| `pool.idle` | Number | 空闲超时(ms) | 10000 |
| `pool.acquire` | Number | 获取连接超时(ms) | 30000 |

---

## 核心概念

### Sequelize 实例

```javascript
const { Sequelize, DataTypes } = require('sequelize')

// 创建实例
const sequelize = new Sequelize(/* config */)

// 主要方法
await sequelize.authenticate()     // 测试连接
await sequelize.close()            // 关闭连接
await sequelize.sync()             // 同步模型到数据库
await sequelize.drop()             // 删除所有表
await sequelize.query(sql)         // 执行原始 SQL
await sequelize.transaction()      // 创建事务
```

### 模型定义方式

#### 方式一：define 方式

```javascript
const User = sequelize.define('User', {
  // 属性定义
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING
  }
}, {
  // 模型选项
  tableName: 'users',
  timestamps: true
})
```

#### 方式二：Model 类继承（推荐）

```javascript
const { Model, DataTypes } = require('sequelize')

class User extends Model {}

User.init({
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING
  }
}, {
  sequelize,
  modelName: 'User',
  tableName: 'users'
})
```

---

## 模型定义

### 数据类型

```javascript
const { DataTypes } = require('sequelize')

// 字符串类型
DataTypes.STRING              // VARCHAR(255)
DataTypes.STRING(100)         // VARCHAR(100)
DataTypes.TEXT                // TEXT
DataTypes.TEXT('tiny')        // TINYTEXT
DataTypes.TEXT('medium')      // MEDIUMTEXT
DataTypes.TEXT('long')        // LONGTEXT
DataTypes.CHAR(10)            // CHAR(10)

// 数字类型
DataTypes.INTEGER             // INTEGER
DataTypes.INTEGER.UNSIGNED    // INTEGER UNSIGNED
DataTypes.BIGINT              // BIGINT
DataTypes.FLOAT               // FLOAT
DataTypes.DOUBLE              // DOUBLE
DataTypes.DECIMAL(10, 2)      // DECIMAL(10,2)

// 布尔类型
DataTypes.BOOLEAN             // TINYINT(1)

// 日期类型
DataTypes.DATE                // DATETIME
DataTypes.DATE(6)             // DATETIME(6)
DataTypes.DATEONLY            // DATE

// JSON 类型
DataTypes.JSON                // JSON

// 二进制类型
DataTypes.BLOB                // BLOB
DataTypes.BLOB('tiny')        // TINYBLOB
DataTypes.BLOB('medium')      // MEDIUMBLOB
DataTypes.BLOB('long')        // LONGBLOB

// 枚举类型
DataTypes.ENUM('active', 'pending', 'inactive')

// UUID 类型
DataTypes.UUID                // CHAR(36)
DataTypes.UUIDV4              // 自动生成 UUID v4

// 其他类型
DataTypes.VIRTUAL             // 虚拟字段（不存储）
```

### 字段属性

```javascript
User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,          // 主键
    autoIncrement: true,       // 自增
    allowNull: false
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,          // 不允许为空
    unique: true,              // 唯一键
    validate: {
      isEmail: true,           // 验证是否为邮箱
      notNull: {
        msg: '邮箱不能为空'
      }
    },
    comment: '用户邮箱'        // 字段注释
  },
  age: {
    type: DataTypes.INTEGER,
    defaultValue: 18,          // 默认值
    validate: {
      min: 0,
      max: 150
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  },
  uuid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',       // 映射到数据库字段名
    defaultValue: DataTypes.NOW
  }
}, { sequelize })
```

### 验证器

```javascript
User.init({
  username: {
    type: DataTypes.STRING,
    validate: {
      // 内置验证器
      notEmpty: true,          // 不能为空字符串
      len: [3, 20],            // 长度在 3-20 之间
      is: /^[a-z]+$/i,         // 正则验证
      notIn: [['admin', 'root']], // 不在列表中
      isIn: [['user', 'moderator', 'admin']], // 在列表中
      
      // 自定义验证器
      isAlphaNumeric(value) {
        if (!/^[a-zA-Z0-9]+$/.test(value)) {
          throw new Error('只能包含字母和数字')
        }
      }
    }
  },
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: {
        msg: '请输入有效的邮箱地址'
      }
    }
  },
  age: {
    type: DataTypes.INTEGER,
    validate: {
      isInt: true,
      min: {
        args: [0],
        msg: '年龄不能为负数'
      },
      max: 150
    }
  },
  startDate: {
    type: DataTypes.DATE,
    validate: {
      isDate: true,
      isAfter: '2020-01-01'
    }
  },
  endDate: {
    type: DataTypes.DATE,
    validate: {
      isBefore: '2030-01-01'
    }
  }
}, { sequelize })
```

### 模型选项

```javascript
User.init({
  // 字段定义...
}, {
  sequelize,
  
  // 表名配置
  modelName: 'User',           // 模型名称
  tableName: 'users',          // 表名
  freezeTableName: true,       // 禁止自动复数化表名
  
  // 时间戳配置
  timestamps: true,            // 启用时间戳
  createdAt: 'created_at',     // 创建时间字段名
  updatedAt: 'updated_at',     // 更新时间字段名
  
  // 软删除
  paranoid: true,              // 启用软删除
  deletedAt: 'deleted_at',     // 删除时间字段名
  
  // 字段命名
  underscored: true,           // 使用下划线命名（created_at）
  
  // 索引
  indexes: [
    {
      unique: true,
      fields: ['email']
    },
    {
      name: 'idx_username',
      fields: ['username']
    }
  ],
  
  // 钩子
  hooks: {
    beforeCreate: (user, options) => {
      user.password = hashPassword(user.password)
    }
  },
  
  // 作用域
  scopes: {
    active: {
      where: { status: 'active' }
    },
    admin: {
      where: { role: 'admin' }
    }
  },
  
  // 其他选项
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci',
  comment: '用户表'
})
```

---

## CRUD 操作

### 创建记录

```javascript
// 1. create() - 创建并保存到数据库
const user = await User.create({
  firstName: 'Alice',
  lastName: 'Smith',
  email: 'alice@example.com',
  age: 25
})
console.log(user.id) // 自动生成的 ID

// 2. build() + save() - 分两步创建
const user = User.build({
  firstName: 'Bob',
  email: 'bob@example.com'
})
await user.save()

// 3. 批量创建
const users = await User.bulkCreate([
  { firstName: 'Alice', lastName: 'A' },
  { firstName: 'Bob', lastName: 'B' },
  { firstName: 'Charlie', lastName: 'C' }
])

// 4. findOrCreate() - 查找或创建
const [user, created] = await User.findOrCreate({
  where: { email: 'alice@example.com' },
  defaults: {
    firstName: 'Alice',
    lastName: 'Smith'
  }
})
console.log(created ? '新建用户' : '用户已存在')

// 5. findCreateFind() - 类似 findOrCreate，但不会抛出唯一键冲突错误
const user = await User.findCreateFind({
  where: { email: 'test@example.com' },
  defaults: { firstName: 'Test' }
})
```

### 查询记录

```javascript
// 1. 查询所有
const users = await User.findAll()
console.log(users.every(user => user instanceof User)) // true

// 2. 查询特定字段
const users = await User.findAll({
  attributes: ['firstName', 'lastName']
})

// 3. 重命名字段
const users = await User.findAll({
  attributes: [
    'firstName',
    ['lastName', 'surName']  // AS 别名
  ]
})

// 4. 条件查询
const user = await User.findOne({
  where: { email: 'alice@example.com' }
})

// 5. 主键查询
const user = await User.findByPk(1)

// 6. 查询单个字段
const names = await User.findAll({
  attributes: ['firstName'],
  raw: true  // 返回原始数据对象
})
// [{ firstName: 'Alice' }, { firstName: 'Bob' }]

// 7. 聚合函数
// 计数
const count = await User.count()
const activeCount = await User.count({
  where: { status: 'active' }
})

// 求和
const totalAge = await User.sum('age')

// 分组统计
const ageGroups = await User.findAll({
  attributes: [
    'age',
    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
  ],
  group: ['age']
})
```

### 更新记录

```javascript
// 1. 更新单个记录
const user = await User.findByPk(1)
user.firstName = 'New Name'
await user.save()

// 2. update() 方法更新字段
const user = await User.findByPk(1)
await user.update({ firstName: 'New Name', age: 30 })

// 3. 批量更新
await User.update(
  { status: 'inactive' },
  { where: { age: { [Op.lt]: 18 } } }
)

// 4. 更改特定字段（跳过验证）
const user = await User.findByPk(1)
user.changed('firstName', true)  // 标记字段已更改
await user.save({ fields: ['firstName'] })

// 5. 自增/自减
await User.increment('age', { by: 1, where: { id: 1 } })
await User.decrement('age', { by: 1, where: { id: 1 } })
```

### 删除记录

```javascript
// 1. 删除单个记录
const user = await User.findByPk(1)
await user.destroy()

// 2. 批量删除
await User.destroy({
  where: { status: 'inactive' }
})

// 3. 硬删除（永久删除，即使是 paranoid 模型）
await User.destroy({
  where: {},
  force: true
})

// 4. 恢复软删除的记录
const user = await User.findByPk(1, { paranoid: false })
await user.restore()

// 5. 批量恢复
await User.restore({
  where: { status: 'inactive' }
})

// 6. 截断表（删除所有记录并重置自增 ID）
await User.truncate()
```

---

## 查询构建器

### WHERE 子句

```javascript
const { Op } = require('sequelize')

// 基础条件
await User.findAll({
  where: { firstName: 'Alice' }
})

// AND 条件
await User.findAll({
  where: {
    firstName: 'Alice',
    lastName: 'Smith'
  }
})

// OR 条件
await User.findAll({
  where: {
    [Op.or]: [
      { firstName: 'Alice' },
      { firstName: 'Bob' }
    ]
  }
})

// 比较操作符
await User.findAll({
  where: {
    age: {
      [Op.eq]: 25,           // = 25
      [Op.ne]: 30,           // != 30
      [Op.gt]: 18,           // > 18
      [Op.gte]: 18,          // >= 18
      [Op.lt]: 60,           // < 60
      [Op.lte]: 60,          // <= 60
      [Op.between]: [20, 40], // BETWEEN 20 AND 40
      [Op.notBetween]: [20, 40] // NOT BETWEEN
    }
  }
})

// IN 操作
await User.findAll({
  where: {
    role: {
      [Op.in]: ['admin', 'moderator']
    }
  }
})

// LIKE 操作
await User.findAll({
  where: {
    firstName: {
      [Op.like]: '%Alice%'   // LIKE '%Alice%'
    }
  }
})

// NULL 检查
await User.findAll({
  where: {
    lastName: {
      [Op.is]: null          // IS NULL
    }
  }
})

// 复杂组合
await User.findAll({
  where: {
    [Op.and]: [
      { status: 'active' },
      {
        [Op.or]: [
          { age: { [Op.gt]: 60 } },
          { role: 'admin' }
        ]
      }
    ]
  }
})
```

### 排序、分页和限制

```javascript
// 排序
await User.findAll({
  order: [
    ['createdAt', 'DESC'],
    ['firstName', 'ASC']
  ]
})

// 分页
const page = 2
const limit = 10
const offset = (page - 1) * limit

const users = await User.findAll({
  offset,
  limit
})

// 使用 findAndCountAll 获取总数
const { count, rows } = await User.findAndCountAll({
  offset,
  limit
})
console.log(`总数: ${count}, 当前页数据:`, rows)

// 限制数量
await User.findAll({
  limit: 5
})

// 分组
await User.findAll({
  attributes: [
    'role',
    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
  ],
  group: ['role'],
  having: sequelize.literal('COUNT(id) > 5')
})
```

### 聚合查询

```javascript
const { fn, col, literal } = require('sequelize')

// COUNT
const count = await User.count()
const countByRole = await User.count({
  group: ['role']
})

// SUM
const totalAge = await User.sum('age')
const totalByRole = await User.sum('age', {
  group: ['role']
})

// AVG
const avgAge = await User.avg('age')

// MIN / MAX
const minAge = await User.min('age')
const maxAge = await User.max('age')

// 复杂聚合
const stats = await User.findAll({
  attributes: [
    'role',
    [fn('COUNT', col('id')), 'total'],
    [fn('AVG', col('age')), 'avgAge'],
    [fn('MIN', col('age')), 'minAge'],
    [fn('MAX', col('age')), 'maxAge']
  ],
  group: ['role']
})
```

---

## 关联关系

### 一对一关系 (HasOne & BelongsTo)

```
┌─────────────┐       ┌─────────────┐
│    User     │       │   Profile   │
├─────────────┤       ├─────────────┤
│ id          │───┐   │ id          │
│ name        │   │   │ bio         │
│ email       │   └──>│ userId (FK) │
└─────────────┘       └─────────────┘
```

```javascript
// 定义模型
const User = sequelize.define('User', {
  name: DataTypes.STRING
})

const Profile = sequelize.define('Profile', {
  bio: DataTypes.TEXT
})

// 建立关联
User.hasOne(Profile, {
  foreignKey: 'userId',
  as: 'profile'
})
Profile.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
})

// 查询
const user = await User.findOne({
  include: [{
    model: Profile,
    as: 'profile'
  }]
})
console.log(user.profile.bio)
```

### 一对多关系 (HasMany & BelongsTo)

```
┌─────────────┐       ┌─────────────┐
│    User     │       │    Post     │
├─────────────┤       ├─────────────┤
│ id          │───┐   │ id          │
│ name        │   │   │ title       │
│ email       │   └──>│ userId (FK) │
└─────────────┘       │ content     │
                      └─────────────┘
```

```javascript
const User = sequelize.define('User', { name: DataTypes.STRING })
const Post = sequelize.define('Post', { title: DataTypes.STRING })

// 建立关联
User.hasMany(Post, {
  foreignKey: 'userId',
  as: 'posts'
})
Post.belongsTo(User, {
  foreignKey: 'userId',
  as: 'author'
})

// 查询用户及其文章
const user = await User.findOne({
  include: [{
    model: Post,
    as: 'posts'
  }]
})
console.log(user.posts) // 文章数组

// 创建用户并创建文章
const user = await User.create(
  { 
    name: 'Alice',
    posts: [
      { title: 'First Post' },
      { title: 'Second Post' }
    ]
  },
  {
    include: [{
      model: Post,
      as: 'posts'
    }]
  }
)
```

### 多对多关系 (BelongsToMany)

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    Post     │       │  PostTag    │       │     Tag     │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id          │───┐   │ postId (FK) │   ┌───│ id          │
│ title       │   └──>│ tagId (FK)  │<──┘   │ name        │
│ content     │       └─────────────┘       └─────────────┘
└─────────────┘
```

```javascript
const Post = sequelize.define('Post', {
  title: DataTypes.STRING
})

const Tag = sequelize.define('Tag', {
  name: DataTypes.STRING
})

const PostTag = sequelize.define('PostTag', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  }
})

// 建立多对多关联
Post.belongsToMany(Tag, {
  through: PostTag,
  foreignKey: 'postId',
  otherKey: 'tagId',
  as: 'tags'
})

Tag.belongsToMany(Post, {
  through: PostTag,
  foreignKey: 'tagId',
  otherKey: 'postId',
  as: 'posts'
})

// 查询文章及其标签
const post = await Post.findOne({
  include: [{
    model: Tag,
    as: 'tags',
    through: { attributes: [] } // 不包含中间表字段
  }]
})

// 添加标签到文章
const post = await Post.findByPk(1)
const tag = await Tag.findByPk(1)
await post.addTag(tag)

// 批量添加标签
await post.addTags([tag1, tag2])

// 创建文章并添加标签
const post = await Post.create(
  {
    title: 'New Post',
    tags: [
      { name: 'Node.js' },
      { name: 'JavaScript' }
    ]
  },
  {
    include: [{
      model: Tag,
      as: 'tags'
    }]
  }
)

// 移除标签
await post.removeTag(tag)
await post.removeTags([tag1, tag2])
await post.setTags([tag1, tag2]) // 设置文章的标签（替换原有）
```

### 关联查询选项

```javascript
// 1. Eager Loading（预加载）
const users = await User.findAll({
  include: [
    {
      model: Post,
      as: 'posts',
      where: { status: 'published' },  // 过滤条件
      required: true,  // INNER JOIN（只返回有关联数据的用户）
      separate: true,  // 分开查询（适用于 hasMany）
      limit: 5
    },
    {
      model: Profile,
      as: 'profile'
    }
  ]
})

// 2. Lazy Loading（延迟加载）
const user = await User.findByPk(1)
const posts = await user.getPosts({
  where: { status: 'published' },
  limit: 5
})

// 3. 嵌套预加载
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    include: [{
      model: Comment,
      as: 'comments'
    }]
  }]
})

// 4. 包含所有关联
const users = await User.findAll({
  include: [{ all: true }]
})

// 5. 排除关联
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    attributes: { exclude: ['content'] }
  }]
})
```

---

## 事务管理

### 自动事务

```javascript
const { sequelize } = require('./models')

try {
  const result = await sequelize.transaction(async (t) => {
    // 在此回调中的所有操作都会在同一个事务中执行
    
    const user = await User.create({
      firstName: 'Alice'
    }, { transaction: t })
    
    await Post.create({
      title: 'First Post',
      userId: user.id
    }, { transaction: t })
    
    return user
  })
  
  // 事务自动提交
  console.log('事务成功:', result)
} catch (error) {
  // 事务自动回滚
  console.error('事务失败:', error)
}
```

### 手动事务

```javascript
const t = await sequelize.transaction()

try {
  const user = await User.create({
    firstName: 'Alice'
  }, { transaction: t })
  
  await Post.create({
    title: 'First Post',
    userId: user.id
  }, { transaction: t })
  
  await t.commit()
  console.log('事务提交成功')
} catch (error) {
  await t.rollback()
  console.error('事务回滚:', error)
}
```

### 事务选项

```javascript
// 隔离级别
const { Transaction } = require('sequelize')

const t = await sequelize.transaction({
  isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
  autocommit: false
})

// 隔离级别取值（Transaction.ISOLATION_LEVELS）：
// READ_UNCOMMITTED / READ_COMMITTED / REPEATABLE_READ / SERIALIZABLE

// 锁定
const user = await User.findOne({
  where: { id: 1 },
  lock: true,  // SELECT ... FOR UPDATE
  transaction: t
})

// 共享锁
const user = await User.findOne({
  where: { id: 1 },
  lock: Transaction.LOCK.SHARE,  // SELECT ... LOCK IN SHARE MODE
  transaction: t
})

// 跳过锁定
const user = await User.findOne({
  where: { id: 1 },
  lock: true,
  skipLocked: true,  // SELECT ... FOR UPDATE SKIP LOCKED
  transaction: t
})
```

### 事务传播

```javascript
// CLS（连续本地存储）自动传递事务
const cls = require('cls-hooked')
const namespace = cls.createNamespace('my-namespace')

const Sequelize = require('sequelize')
Sequelize.useCLS(namespace)

const sequelize = new Sequelize(/* config */)

// 现在 Sequelize 会自动使用 CLS 中的事务
sequelize.transaction(async (t) => {
  // User.create 会自动使用这个事务
  await User.create({ firstName: 'Alice' })
})
```

---

## 数据库迁移

### 创建迁移文件

```bash
# 创建迁移
npx sequelize-cli migration:generate --name create-users-table

# 创建模型（自动生成迁移）
npx sequelize-cli model:generate --name User --attributes firstName:string,lastName:string,email:string
```

### 迁移文件结构

```javascript
// migrations/20240101000000-create-users-table.js
'use strict'

module.exports = {
  // 执行迁移（up）
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      firstName: {
        type: Sequelize.STRING
      },
      lastName: {
        type: Sequelize.STRING
      },
      email: {
        type: Sequelize.STRING,
        unique: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    })
    
    // 添加索引
    await queryInterface.addIndex('Users', ['email'])
  },

  // 回滚迁移（down）
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Users')
  }
}
```

### 常用迁移操作

```javascript
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. 添加列
    await queryInterface.addColumn('Users', 'age', {
      type: Sequelize.INTEGER,
      defaultValue: 0
    })
    
    // 2. 删除列
    await queryInterface.removeColumn('Users', 'age')
    
    // 3. 修改列
    await queryInterface.changeColumn('Users', 'email', {
      type: Sequelize.STRING(500),
      allowNull: true
    })
    
    // 4. 重命名列
    await queryInterface.renameColumn('Users', 'firstName', 'first_name')
    
    // 5. 添加索引
    await queryInterface.addIndex('Users', ['email'], {
      name: 'idx_email',
      unique: true
    })
    
    // 6. 删除索引
    await queryInterface.removeIndex('Users', 'idx_email')
    
    // 7. 添加外键
    await queryInterface.addConstraint('Posts', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'fk_posts_userId',
      references: {
        table: 'Users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    })
    
    // 8. 删除外键
    await queryInterface.removeConstraint('Posts', 'fk_posts_userId')
    
    // 9. 执行原始 SQL
    await queryInterface.sequelize.query(
      'UPDATE Users SET status = ? WHERE age > ?',
      { replacements: ['active', 18] }
    )
  },

  async down(queryInterface, Sequelize) {
    // 回滚操作...
  }
}
```

### 迁移命令

```bash
# 执行所有未执行的迁移
npx sequelize-cli db:migrate

# 回滚最近一次迁移
npx sequelize-cli db:migrate:undo

# 回滚所有迁移
npx sequelize-cli db:migrate:undo:all

# 回滚到指定迁移
npx sequelize-cli db:migrate:undo:all --to 20240101000000-create-users-table.js

# 查看迁移状态
npx sequelize-cli db:migrate:status
```

### 种子数据

```bash
# 创建种子文件
npx sequelize-cli seed:generate --name demo-users

# 执行所有种子文件
npx sequelize-cli db:seed:all

# 执行指定种子文件
npx sequelize-cli db:seed --seed 20240101000000-demo-users.js

# 回滚所有种子
npx sequelize-cli db:seed:undo:all
```

```javascript
// seeders/20240101000000-demo-users.js
'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Users', [
      {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        firstName: 'Bob',
        lastName: 'Jones',
        email: 'bob@example.com',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {})
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {})
  }
}
```

---

## 高级特性

### 钩子函数 (Hooks)

```javascript
const { Model } = require('sequelize')

class User extends Model {}

User.init({
  /* 字段定义 */
}, {
  sequelize,
  hooks: {
    // 创建前
    beforeCreate: async (user, options) => {
      user.password = await hashPassword(user.password)
    },
    
    // 创建后
    afterCreate: async (user, options) => {
      await sendWelcomeEmail(user.email)
    },
    
    // 更新前
    beforeUpdate: async (user, options) => {
      if (user.changed('password')) {
        user.password = await hashPassword(user.password)
      }
    },
    
    // 保存前
    beforeSave: async (user, options) => {
      user.email = user.email.toLowerCase()
    },
    
    // 删除前
    beforeDestroy: async (user, options) => {
      await cleanupUserRelations(user.id)
    },
    
    // 查询后
    afterFind: async (result, options) => {
      if (Array.isArray(result)) {
        result.forEach(user => {
          user.dataValues.fullName = `${user.firstName} ${user.lastName}`
        })
      }
    }
  }
})

// 动态添加钩子
User.addHook('beforeCreate', 'customHook', async (user, options) => {
  // 自定义逻辑
})

// 移除钩子
User.removeHook('beforeCreate', 'customHook')
```

### 作用域 (Scopes)

```javascript
const User = sequelize.define('User', {
  /* 字段 */
}, {
  scopes: {
    // 默认作用域
    defaultScope: {
      where: { status: 'active' }
    },
    
    // 命名作用域
    active: {
      where: { status: 'active' }
    },
    
    inactive: {
      where: { status: 'inactive' }
    },
    
    // 带参数的作用域
    byAge: (minAge) => ({
      where: { age: { [Op.gte]: minAge } }
    }),
    
    // 包含关联
    withPosts: {
      include: [{
        model: Post,
        as: 'posts'
      }]
    },
    
    // 组合作用域
    recentActive: {
      where: { status: 'active' },
      order: [['createdAt', 'DESC']],
      limit: 10
    }
  }
})

// 使用作用域
const activeUsers = await User.scope('active').findAll()
const adults = await User.scope({ method: ['byAge', 18] }).findAll()
const usersWithPosts = await User.scope('withPosts').findAll()

// 组合多个作用域
const users = await User.scope('active', 'withPosts').findAll()

// 取消默认作用域
const allUsers = await User.unscoped().findAll()
```

### 虚拟字段

```javascript
const User = sequelize.define('User', {
  firstName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  
  // 虚拟字段（不存储在数据库）
  fullName: {
    type: DataTypes.VIRTUAL,
    get() {
      return `${this.firstName} ${this.lastName}`
    },
    set(value) {
      throw new Error('不要尝试设置 fullName 的值!')
    }
  },
  
  // 虚拟字段，可用于查询
  fullNameForQuery: {
    type: DataTypes.VIRTUAL,
    get() {
      return `${this.firstName} ${this.lastName}`
    }
  }
}, {
  indexes: [
    // 为虚拟字段创建函数索引（PostgreSQL）
    // {
    //   name: 'idx_fullName',
    //   using: 'BTREE',
    //   fields: [sequelize.literal('LOWER(CONCAT(firstName, " ", lastName))')]
    // }
  ]
})
```

### 原始查询

```javascript
const { QueryTypes } = require('sequelize')

// 1. SELECT 查询
const users = await sequelize.query(
  'SELECT * FROM Users WHERE age > :age',
  {
    replacements: { age: 18 },
    type: QueryTypes.SELECT
  }
)

// 2. 插入查询
const [results, metadata] = await sequelize.query(
  'INSERT INTO Users (firstName, lastName) VALUES (?, ?)',
  {
    replacements: ['Alice', 'Smith'],
    type: QueryTypes.INSERT
  }
)

// 3. 更新查询
const [results, metadata] = await sequelize.query(
  'UPDATE Users SET status = ? WHERE age < ?',
  {
    replacements: ['inactive', 18],
    type: QueryTypes.UPDATE
  }
)

// 4. 映射到模型
const users = await sequelize.query(
  'SELECT * FROM Users',
  {
    model: User,
    mapToModel: true
  }
)

// 5. 存储过程
await sequelize.query('CALL your_stored_procedure(:param)', {
  replacements: { param: 'value' }
})
```

---

## 性能优化

### 查询优化

```javascript
// 1. 只查询需要的字段
const users = await User.findAll({
  attributes: ['id', 'firstName', 'lastName']  // 不要使用 SELECT *
})

// 2. 使用索引
await User.findAll({
  where: {
    email: 'alice@example.com'  // 确保 email 字段有索引
  }
})

// 3. 分页查询
const { count, rows } = await User.findAndCountAll({
  offset: (page - 1) * limit,
  limit: limit
})

// 4. 批量操作
await User.bulkCreate([...users], {
  validate: true,
  ignoreDuplicates: true
})

// 5. 使用事务批量插入
await sequelize.transaction(async (t) => {
  for (const user of users) {
    await User.create(user, { transaction: t })
  }
})
```

### 连接池优化

```javascript
const sequelize = new Sequelize(/* config */, {
  pool: {
    max: 20,          // 最大连接数
    min: 5,           // 最小连接数
    acquire: 60000,   // 获取连接超时时间（ms）
    idle: 10000       // 空闲连接超时时间（ms）
  }
})
```

### 预加载优化

```javascript
// ❌ N+1 查询问题
const users = await User.findAll()
for (const user of users) {
  const posts = await Post.findAll({ where: { userId: user.id } })
  // 每个用户都执行一次查询
}

// ✅ 使用 Eager Loading
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts'
  }]
})
// 只执行 2 次查询（1 次查用户，1 次查所有文章）

// ✅ 分开查询（适用于大数据集）
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    separate: true,  // 分开查询
    limit: 5
  }]
})
```

---

## 测试与调试

### 单元测试

```javascript
const { sequelize, User } = require('./models')

describe('User Model', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true })
  })

  afterAll(async () => {
    await sequelize.close()
  })

  beforeEach(async () => {
    await User.destroy({ truncate: true })
  })

  test('创建用户', async () => {
    const user = await User.create({
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com'
    })
    
    expect(user.firstName).toBe('Alice')
    expect(user.email).toBe('alice@example.com')
  })

  test('邮箱验证', async () => {
    await expect(User.create({
      firstName: 'Alice',
      email: 'invalid-email'
    })).rejects.toThrow()
  })

  test('唯一邮箱约束', async () => {
    await User.create({
      firstName: 'Alice',
      email: 'alice@example.com'
    })
    
    await expect(User.create({
      firstName: 'Bob',
      email: 'alice@example.com'
    })).rejects.toThrow()
  })
})
```

### 调试技巧

```javascript
// 1. 启用 SQL 日志
const sequelize = new Sequelize(/* config */, {
  logging: console.log  // 或自定义函数
})

// 2. 查看生成的 SQL
// Sequelize 没有 Knex 那样的 toSQL()，打印 SQL 依赖 logging 选项：
const sequelize = new Sequelize(/* config */, {
  logging: (sql) => console.log('SQL:', sql)
})

// 3. 分析查询性能
const sequelize = new Sequelize(/* config */, {
  logging: (sql, timing) => {
    if (timing > 500) {
      console.warn(`慢查询 (${timing}ms):`, sql)
    }
  },
  benchmark: true
})
```

---

## 实战应用

### Express.js REST API

```javascript
const express = require('express')
const { Sequelize, DataTypes } = require('sequelize')

// 初始化 Sequelize
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite',
  logging: false
})

// 定义模型
const User = sequelize.define('User', {
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active'
  }
})

const app = express()
app.use(express.json())

// 获取用户列表
app.get('/users', async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query
    const where = {}
    if (status) where.status = status
    
    const { count, rows } = await User.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    })
    
    res.json({
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 获取单个用户
app.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 创建用户
app.post('/users', async (req, res) => {
  try {
    const user = await User.create(req.body)
    res.status(201).json(user)
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: '验证失败',
        details: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      })
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: '邮箱已被注册' })
    }
    res.status(500).json({ error: error.message })
  }
})

// 更新用户
app.put('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }
    await user.update(req.body)
    res.json(user)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 删除用户
app.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }
    await user.destroy()
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// 启动服务器
const PORT = process.env.PORT || 3000

async function start() {
  try {
    await sequelize.sync()
    app.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`)
    })
  } catch (error) {
    console.error('启动失败:', error)
  }
}

start()
```

---

## 常见问题解答

### Q1: 如何关闭 Sequelize 的日志？

```javascript
const sequelize = new Sequelize(/* config */, {
  logging: false
})
```

### Q2: 如何处理软删除？

```javascript
// 定义模型时启用 paranoid
const User = sequelize.define('User', {
  // ...
}, {
  paranoid: true
})

// 查询时包含软删除记录
const users = await User.findAll({
  paranoid: false
})

// 恢复软删除记录
const user = await User.findByPk(id, { paranoid: false })
await user.restore()
```

### Q3: 如何使用自定义表名？

```javascript
const User = sequelize.define('User', {
  // ...
}, {
  tableName: 'my_custom_users',
  freezeTableName: true  // 禁止自动复数化
})
```

### Q4: 如何执行关联查询并过滤？

```javascript
const users = await User.findAll({
  include: [{
    model: Post,
    as: 'posts',
    where: { status: 'published' },
    required: false  // LEFT JOIN（包含没有文章的用户）
  }]
})
```

### Q5: 如何批量更新？

```javascript
await User.update(
  { status: 'inactive' },
  { where: { lastLoginAt: { [Op.lt]: new Date(Date.now() - 90*24*60*60*1000) } } }
)
```

### Q6: 如何处理并发更新？

```javascript
// 使用乐观锁
const User = sequelize.define('User', {
  // ...
  version: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  version: true  // 启用版本控制
})

// 更新时会自动检查版本
const user = await User.findByPk(1)
await user.update({ name: 'New Name' })  // 如果版本不匹配会抛出错误
```

### Q7: 如何自定义验证错误消息？

```javascript
User.init({
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: {
        msg: '请输入有效的邮箱地址'
      },
      notNull: {
        msg: '邮箱不能为空'
      }
    }
  }
}, { sequelize })
```

---

## 选择建议

### Sequelize vs 原生 SQL

| 特性 | Sequelize (ORM) | 原生 SQL (mysql2) |
|------|-----------------|-------------------|
| **抽象层次** | 高。面向对象操作 | 低。直接编写 SQL |
| **开发效率** | 高。自动生成 CRUD | 较低。手动编写 |
| **学习曲线** | 较高。需学习 ORM API | 低。熟悉 SQL 即可 |
| **性能** | 中等。有抽象层开销 | 高。无中间层 |
| **控制力** | 中等。自动生成 SQL | 高。完全控制 |
| **迁移管理** | 内置支持 | 需额外工具 |
| **类型安全** | 自动生成类型 | 需手动定义 |

### 适用场景

**选择 Sequelize 当：**
- ✅ 项目业务逻辑复杂
- ✅ 需要快速开发和迭代
- ✅ 需要数据库迁移功能
- ✅ 希望代码与数据库解耦
- ✅ 团队更熟悉 OOP

**选择原生 SQL 当：**
- ✅ 追求极致性能
- ✅ 需要完全控制 SQL
- ✅ 项目较简单
- ✅ 有复杂的 SQL 查询
- ✅ 团队精通 SQL

---

## 参考资料

- [Sequelize 官方文档](https://sequelize.org/)
- [Sequelize v6 API 文档](https://sequelize.org/docs/v6/)
- [Sequelize GitHub 仓库](https://github.com/sequelize/sequelize)
- [Sequelize CLI 文档](https://github.com/sequelize/cli)
- [Sequelize TypeScript 指南](https://sequelize.org/docs/v6/other-topics/typescript/)
