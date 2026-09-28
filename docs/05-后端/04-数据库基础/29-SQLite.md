---
title: SQLite
description: SQLite 入门：嵌入式/单文件/零配置特性与局限、语法差异（|| 拼接、JOIN 与视图限制）、Python sqlite3 模块完整操作（参数化查询防注入）、微信聊天记录分析实战、PRAGMA 性能优化与 MySQL/PostgreSQL 对比
keywords: [SQLite, 嵌入式数据库, 轻量级, 文件存储]
category: 数据库基础
tags: [数据库, DBMS, SQLite]
---

# SQLite

## SQLite简介

SQLite是一个嵌入式开源数据库引擎，采用C语言编写，整个数据库引擎大小仅约3MB。与传统的客户端/服务器架构不同，SQLite可以直接嵌入到应用程序中。

### SQLite的特点

| 特点 | 说明 |
|-----|------|
| **轻量级** | 整个引擎仅约3MB |
| **嵌入式** | 无需独立服务器进程 |
| **零配置** | 无需安装和配置 |
| **跨平台** | 支持多种操作系统 |
| **单文件** | 整个数据库存储在单个文件中 |
| **类型亲和性** | 列类型只是"建议"（动态类型），实际按类型亲和性规则存储 |

### SQLite的优势与局限

**优势**：

| 优势 | 说明 |
|-----|------|
| 轻便高效 | 存储和查询效率高 |
| 易于迁移 | 单文件即可完成迁移 |
| 无需服务器 | 减少服务器压力 |
| 约束少 | 操作简单方便 |

**局限**：

| 局限 | 说明 |
|-----|------|
| 并发限制 | 同一时间只允许一个写操作 |
| 不适合高并发 | 吞吐量有限 |
| 无用户管理 | 没有用户权限系统 |
| 网络访问 | 不支持直接网络访问 |

### SQLite适用场景

| 场景 | 说明 |
|-----|------|
| **移动应用** | 微信聊天记录、手机应用本地存储 |
| **桌面应用** | 浏览器、邮件客户端本地存储 |
| **嵌入式设备** | 物联网设备、智能硬件 |
| **中小型网站** | 访问量不大的网站 |
| **测试开发** | 单元测试、原型开发 |

## SQLite语法特点

### 字符串拼接

SQLite使用 `||` 操作符拼接字符串：

```sql
-- SQLite、PostgreSQL、Oracle、DB2使用||
SELECT MesLocalID || Message FROM "Chat_1234"

-- MySQL使用CONCAT函数
SELECT CONCAT(MesLocalID, Message) FROM Chat_1234
```

### JOIN语法差异

SQLite 在 3.39.0（2022 年）之前不支持 RIGHT JOIN，需要转换为 LEFT JOIN；3.39.0 起已支持 RIGHT/FULL JOIN（老版本仍需转换写法）：

```sql
-- 老版本（3.39.0 之前）不支持
SELECT * FROM team RIGHT JOIN player ON player.team_id = team.team_id;

-- 转换为LEFT JOIN
SELECT * FROM player LEFT JOIN team ON player.team_id = team.team_id;
```

### 视图限制

SQLite仅支持只读视图：

```sql
-- 可以创建视图
CREATE VIEW user_summary AS
SELECT user_id, user_name FROM user;

-- 只能读取，不能修改
SELECT * FROM user_summary;

-- 以下操作不支持
-- INSERT INTO user_summary VALUES (1, 'test');
-- UPDATE user_summary SET user_name = 'new' WHERE user_id = 1;
```

## Python操作SQLite

Python内置了sqlite3模块，可以直接使用。

### 基本操作流程

```
操作流程：
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1. 导入模块                                        │
│     import sqlite3                                  │
│           │                                         │
│           ▼                                         │
│  2. 创建连接                                        │
│     conn = sqlite3.connect('test.db')              │
│           │                                         │
│           ▼                                         │
│  3. 获取游标                                        │
│     cur = conn.cursor()                            │
│           │                                         │
│           ▼                                         │
│  4. 执行SQL                                         │
│     cur.execute('SQL语句')                          │
│           │                                         │
│           ▼                                         │
│  5. 提交事务                                        │
│     conn.commit()                                  │
│           │                                         │
│           ▼                                         │
│  6. 关闭连接                                        │
│     cur.close()                                    │
│     conn.close()                                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 完整示例代码

```python
import sqlite3

# 1. 创建数据库连接（文件不存在会自动创建）
conn = sqlite3.connect("wucai.db")

# 2. 获取游标
cur = conn.cursor()

# 3. 创建数据表
cur.execute("""
    CREATE TABLE IF NOT EXISTS heros (
        id INT PRIMARY KEY,
        name TEXT,
        hp_max REAL,
        mp_max REAL,
        role_main TEXT
    )
""")

# 4. 插入单条数据
cur.execute(
    'INSERT INTO heros VALUES (?, ?, ?, ?, ?)',
    (10000, '夏侯惇', 7350, 1746, '坦克')
)

# 5. 批量插入数据
cur.executemany(
    'INSERT INTO heros VALUES (?, ?, ?, ?, ?)',
    (
        (10000, '夏侯惇', 7350, 1746, '坦克'),
        (10001, '钟无艳', 7000, 1760, '战士'),
        (10002, '张飞', 8341, 100, '坦克'),
        (10003, '牛魔', 8476, 1926, '坦克'),
        (10004, '吕布', 7344, 0, '战士')
    )
)

# 6. 查询数据
cur.execute("SELECT id, name, hp_max, mp_max, role_main FROM heros")
result = cur.fetchall()
print(result)

# 7. 提交事务
conn.commit()

# 8. 关闭游标和连接
cur.close()
conn.close()
```

### 查询数据的方法

```python
# 执行查询
cur.execute("SELECT * FROM heros")

# 获取一条记录
row = cur.fetchone()
print(row)  # (10000, '夏侯惇', 7350.0, 1746.0, '坦克')

# 获取n条记录
rows = cur.fetchmany(3)
print(rows)  # [(...), (...), ...]

# 获取所有记录
all_rows = cur.fetchall()
print(all_rows)
```

### 使用上下文管理器

```python
import sqlite3

# 使用with语句自动管理连接
with sqlite3.connect("wucai.db") as conn:
    cur = conn.cursor()
    cur.execute("SELECT * FROM heros")
    for row in cur.fetchall():
        print(row)
    # 自动提交事务和关闭连接
```

### 参数化查询

```python
# 使用?占位符（推荐）
cur.execute("SELECT * FROM heros WHERE id = ?", (10000,))

# 使用命名参数
cur.execute("SELECT * FROM heros WHERE name = :name", {'name': '张飞'})

# 防止SQL注入
user_input = "张飞'; DROP TABLE heros; --"
cur.execute("SELECT * FROM heros WHERE name = ?", (user_input,))  # 安全
```

## 实战：查询微信聊天记录

微信使用SQLite存储本地聊天记录，我们可以通过以下步骤查看。

### iPhone端操作步骤

**步骤1：使用iTunes备份iPhone**

将iPhone连接电脑，使用iTunes进行完整备份。

**步骤2：定位备份文件**

- Windows: `C:\Users\用户名\AppData\Roaming\Apple Computer\MobileSync\Backup`
- macOS: `~/Library/Application Support/MobileSync/Backup/`

**步骤3：查找Manifest.db**

备份文件夹中的Manifest.db文件记录了所有备份文件的位置。

**步骤4：查找MM.sqlite**

```sql
-- 在Manifest.db中查询微信数据库位置
SELECT * FROM Files WHERE relativePath LIKE '%MM.sqlite'
```

**步骤5：分析聊天记录**

找到MM.sqlite文件后，使用SQLite工具打开：

```sql
-- 查看所有聊天表
SELECT name FROM sqlite_master 
WHERE type = 'table' AND name LIKE 'Chat\_%' ESCAPE '\';

-- 查看特定聊天的记录
SELECT MesLocalID, Message, Status 
FROM "Chat_1234" 
ORDER BY MesLocalID DESC 
LIMIT 100;
```

### 聊天记录表结构

| 字段 | 说明 |
|-----|------|
| MesLocalID | 消息本地ID |
| Message | 消息内容 |
| Status | 消息状态 |
| CreateTime | 创建时间 |
| Type | 消息类型 |

### Python脚本示例

```python
import sqlite3

def analyze_wechat_db(db_path):
    """分析微信数据库"""
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    # 获取所有聊天表（用 r"" 原始字符串，避免 Python 把 \' 当转义）
    cur.execute(r"""
        SELECT name FROM sqlite_master 
        WHERE type = 'table' AND name LIKE 'Chat\_%' ESCAPE '\'
    """)
    tables = cur.fetchall()
    print(f"共有 {len(tables)} 个聊天")
    
    # 查看第一个聊天的记录数
    if tables:
        table_name = tables[0][0]
        cur.execute(f"SELECT COUNT(*) FROM \"{table_name}\"")
        count = cur.fetchone()[0]
        print(f"聊天 {table_name} 共有 {count} 条记录")
    
    conn.close()

# 使用示例
analyze_wechat_db('MM.sqlite')
```

## SQLite管理工具

### 常用GUI工具

| 工具 | 特点 | 平台 |
|-----|------|------|
| **DB Browser for SQLite** | 免费开源，功能全面 | 跨平台 |
| **SQLite Expert** | 功能强大，专业版收费 | Windows |
| **Navicat for SQLite** | 商业软件，功能完善 | 跨平台 |
| **DBeaver** | 免费开源，支持多种数据库 | 跨平台 |

### 命令行工具

```bash
# 打开数据库
sqlite3 test.db

# 常用命令
.databases          # 显示数据库
.tables             # 显示所有表
.schema table_name  # 显示表结构
.headers on         # 显示列名
.mode column        # 列模式显示
.quit               # 退出

# 执行SQL文件
sqlite3 test.db < script.sql

# 导出数据
sqlite3 test.db ".dump" > backup.sql

# 导入数据
sqlite3 test.db < backup.sql
```

## SQLite性能优化

### 索引优化

```sql
-- 创建索引
CREATE INDEX idx_name ON heros(name);

-- 创建唯一索引
CREATE UNIQUE INDEX idx_id ON heros(id);

-- 查看索引
SELECT * FROM sqlite_master WHERE type = 'index';

-- 分析查询计划
EXPLAIN QUERY PLAN SELECT * FROM heros WHERE name = '张飞';
```

### 批量操作优化

```python
import sqlite3

conn = sqlite3.connect('test.db')
cur = conn.cursor()

# 关闭自动提交，批量操作更快
cur.execute("BEGIN TRANSACTION")

for i in range(10000):
    cur.execute("INSERT INTO heros VALUES (?, ?, ?, ?, ?)", 
                (i, f'hero_{i}', 1000, 100, '战士'))

# 一次性提交
conn.commit()

conn.close()
```

### PRAGMA优化

```sql
-- 设置缓存大小（页数，每页约4KB）
PRAGMA cache_size = 10000;

-- 设置同步模式
PRAGMA synchronous = NORMAL;  -- OFF/NORMAL/FULL

-- 设置日志模式
PRAGMA journal_mode = WAL;  -- DELETE/TRUNCATE/PERSIST/MEMORY/WAL/OFF

-- 设置临时存储位置
PRAGMA temp_store = MEMORY;  -- DEFAULT/FILE/MEMORY
```

## SQLite与其他数据库对比

| 特性 | SQLite | MySQL | PostgreSQL |
|-----|--------|-------|------------|
| **架构** | 嵌入式 | 客户端/服务器 | 客户端/服务器 |
| **安装** | 无需安装 | 需要安装配置 | 需要安装配置 |
| **并发** | 单写多读 | 高并发 | 高并发 |
| **用户管理** | 无 | 完善 | 完善 |
| **网络访问** | 不支持 | 支持 | 支持 |
| **适用场景** | 本地存储、移动应用 | Web应用、企业应用 | 复杂应用、数据分析 |

## 总结

SQLite作为嵌入式数据库，核心要点如下：

| 方面 | 说明 |
|-----|------|
| **核心特点** | 轻量级、嵌入式、零配置 |
| **主要优势** | 简单易用、无需服务器、迁移方便 |
| **主要局限** | 并发能力有限、无用户管理 |
| **典型应用** | 移动应用、桌面应用、嵌入式设备 |
| **Python支持** | 内置sqlite3模块，开箱即用 |

**使用建议**：
1. 适合本地数据存储和中小型应用
2. 不适合高并发写入场景
3. 注意定期备份数据库文件
4. 使用参数化查询防止SQL注入
