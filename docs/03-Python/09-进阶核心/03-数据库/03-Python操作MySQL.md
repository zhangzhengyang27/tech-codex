---
title: Python操作MySQL
description: Python 操作 MySQL 实战：mysql-connector-python 原生驱动（连接/CURD/参数化查询/事务）与 SQLAlchemy ORM（模型定义/查询/事务/连接池），以及防 SQL 注入等最佳实践
keywords: [Python, MySQL, pymysql, ORM]
category: MySQL
tags: [Python, MySQL, SQL]
---

# Python操作MySQL

Python 可以通过多种方式连接和操作 MySQL 数据库。本章介绍使用原生驱动和 ORM 框架两种方式。

## Python DB API 规范

Python DB API 是 Python 访问数据库的统一接口规范，定义了数据库操作的通用模式。

### 操作流程

```
引入 API 模块 → 建立数据库连接 → 执行 SQL 语句 → 关闭数据库连接
```

### 核心对象

| 对象 | 说明 |
|:---|:---|
| Connection | 数据库连接对象 |
| Cursor | 游标对象，执行 SQL 和获取结果 |
| Error | 异常类 |

## 使用 mysql-connector

mysql-connector 是 MySQL 官方提供的 Python 驱动。

### 安装

```bash
pip install mysql-connector-python
```

### 建立连接

```python
import mysql.connector

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="your_password",
    database="test",
    port=3306
)

cursor = db.cursor()

cursor.execute("SELECT VERSION()")
data = cursor.fetchone()
print(f"MySQL 版本: {data}")

cursor.close()
db.close()
```

### Connection 对象方法

| 方法 | 说明 |
|:---|:---|:---|
| `cursor()` | 创建游标对象 |
| `commit()` | 提交事务 |
| `rollback()` | 回滚事务 |
| `close()` | 关闭连接 |
| `begin()` | 开始事务 |

### Cursor 对象方法

| 方法 | 说明 |
|:---|:---|:---|
| `execute(sql, params)` | 执行单条 SQL |
| `executemany(sql, params)` | 批量执行 SQL |
| `fetchone()` | 获取一条记录 |
| `fetchall()` | 获取所有记录 |
| `fetchmany(n)` | 获取 n 条记录 |
| `rowcount` | 影响的行数 |
| `close()` | 关闭游标 |

## CRUD 操作

### 插入数据

```python
import mysql.connector

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="your_password",
    database="test"
)

cursor = db.cursor()

sql = "INSERT INTO player (team_id, player_name, height) VALUES (%s, %s, %s)"
val = (1003, "约翰-科林斯", 2.08)

cursor.execute(sql, val)
db.commit()

print(f"{cursor.rowcount} 条记录插入成功")

cursor.close()
db.close()
```

### 批量插入

```python
sql = "INSERT INTO player (team_id, player_name, height) VALUES (%s, %s, %s)"
vals = [
    (1001, "球员A", 2.05),
    (1002, "球员B", 2.10),
    (1003, "球员C", 2.08)
]

cursor.executemany(sql, vals)
db.commit()
print(f"{cursor.rowcount} 条记录插入成功")
```

### 查询数据

```python
sql = "SELECT player_id, player_name, height FROM player WHERE height >= 2.08"

cursor.execute(sql)
results = cursor.fetchall()

for row in results:
    print(f"ID: {row[0]}, 姓名: {row[1]}, 身高: {row[2]}m")
```

### 使用字典游标

```python
cursor = db.cursor(dictionary=True)

cursor.execute("SELECT * FROM player WHERE height >= 2.08")
results = cursor.fetchall()

for row in results:
    print(f"{row['player_name']}: {row['height']}m")
```

### 更新数据

```python
sql = "UPDATE player SET height = %s WHERE player_name = %s"
val = (2.09, "约翰-科林斯")

cursor.execute(sql, val)
db.commit()

print(f"{cursor.rowcount} 条记录被修改")
```

### 删除数据

```python
sql = "DELETE FROM player WHERE player_name = %s"
val = ("约翰-科林斯",)

cursor.execute(sql, val)
db.commit()

print(f"{cursor.rowcount} 条记录被删除")
```

## 事务处理

```python
import mysql.connector
import traceback

db = mysql.connector.connect(
    host="localhost",
    user="root",
    password="your_password",
    database="test"
)

cursor = db.cursor()

try:
    db.start_transaction()
    
    cursor.execute("UPDATE accounts SET balance = balance - 100 WHERE id = 1")
    cursor.execute("UPDATE accounts SET balance = balance + 100 WHERE id = 2")
    
    db.commit()
    print("转账成功")
    
except Exception as e:
    db.rollback()
    print("转账失败，已回滚")
    traceback.print_exc()
    
finally:
    cursor.close()
    db.close()
```

## 防止 SQL 注入

使用参数化查询防止 SQL 注入：

```python
user_input = "'; DROP TABLE player; --"

sql = "SELECT * FROM player WHERE player_name = %s"
cursor.execute(sql, (user_input,))

results = cursor.fetchall()
```

> **注意**：永远不要使用字符串拼接方式构建 SQL 语句！

## ORM 框架操作 MySQL

ORM（Object-Relational Mapping）将数据库表映射为 Python 对象，提供面向对象的数据库操作方式。

### ORM 的优点

| 优点 | 说明 |
|:---|:---|
| 面向对象 | 用对象操作代替 SQL |
| 可移植性 | 支持多种数据库 |
| 安全性 | 自动防止 SQL 注入 |
| 可维护性 | 代码更易读易维护 |

### ORM 的缺点

| 缺点 | 说明 |
|:---|:---|
| 性能开销 | 复杂查询效率较低 |
| 学习成本 | 需要学习 ORM 语法 |
| 灵活性 | 复杂 SQL 难以实现 |

### Python 主流 ORM 框架

| 框架 | 特点 |
|:---|:---|
| SQLAlchemy | 功能强大，灵活度高 |
| Django ORM | Django 内置，简单易用 |
| Peewee | 轻量级，适合小型项目 |

## SQLAlchemy 操作

### 安装

```bash
pip install sqlalchemy
pip install pymysql
```

### 初始化连接

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy import Column, Integer, String, Float
from sqlalchemy.orm import sessionmaker

engine = create_engine('mysql+pymysql://root:password@localhost:3306/test')

Base = declarative_base()

Session = sessionmaker(bind=engine)
session = Session()
```

> **说明**：SQLAlchemy 2.0 起 `declarative_base` 推荐从 `sqlalchemy.orm` 导入（旧路径 `sqlalchemy.ext.declarative` 仍兼容但已弃用）；本文示例使用经典的 `session.query()` 接口（2.0 中仍可用），新代码也可改用 2.0 推荐的 `select()` 风格。

### 定义模型

```python
class Player(Base):
    __tablename__ = 'player'
    
    player_id = Column(Integer, primary_key=True, autoincrement=True)
    team_id = Column(Integer)
    player_name = Column(String(255))
    height = Column(Float)
    
    def to_dict(self):
        return {
            'player_id': self.player_id,
            'team_id': self.team_id,
            'player_name': self.player_name,
            'height': self.height
        }
```

### 常用数据类型

| SQLAlchemy 类型 | MySQL 类型 |
|:---|:---|
| Integer | INT |
| String(n) | VARCHAR(n) |
| Text | TEXT |
| Float | FLOAT |
| Boolean | BOOLEAN |
| Date | DATE |
| DateTime | DATETIME |

### 常用字段参数

| 参数 | 说明 |
|:---|:---|
| primary_key | 主键 |
| autoincrement | 自增 |
| nullable | 是否允许空值 |
| default | 默认值 |
| unique | 唯一约束 |
| index | 创建索引 |

### 插入数据

```python
new_player = Player(
    team_id=1003,
    player_name="约翰-科林斯",
    height=2.08
)

session.add(new_player)
session.commit()

print(f"插入成功，ID: {new_player.player_id}")
```

### 批量插入

```python
players = [
    Player(team_id=1001, player_name="球员A", height=2.05),
    Player(team_id=1002, player_name="球员B", height=2.10),
    Player(team_id=1003, player_name="球员C", height=2.08)
]

session.add_all(players)
session.commit()
```

### 查询数据

```python
from sqlalchemy import or_

rows = session.query(Player).filter(Player.height >= 2.08).all()

for row in rows:
    print(row.to_dict())

rows = session.query(Player).filter(
    Player.height >= 2.08,
    Player.height <= 2.10
).all()

rows = session.query(Player).filter(
    or_(Player.height >= 2.08, Player.height <= 2.00)
).all()
```

### 排序与分页

```python
rows = session.query(Player).order_by(Player.height.desc()).all()

rows = session.query(Player).order_by(Player.height.desc()).limit(10).all()

rows = session.query(Player).order_by(Player.height.desc()).offset(10).limit(10).all()
```

### 聚合查询

```python
from sqlalchemy import func

result = session.query(
    Player.team_id,
    func.count(Player.player_id).label('count')
).group_by(
    Player.team_id
).having(
    func.count(Player.player_id) > 5
).order_by(
    func.count(Player.player_id).desc()
).all()

for row in result:
    print(f"队伍 {row.team_id}: {row.count} 人")
```

### 更新数据

```python
player = session.query(Player).filter(
    Player.player_name == "约翰-科林斯"
).first()

if player:
    player.height = 2.09
    session.commit()
    print("更新成功")
```

### 删除数据

```python
player = session.query(Player).filter(
    Player.player_name == "约翰-科林斯"
).first()

if player:
    session.delete(player)
    session.commit()
    print("删除成功")
```

### 事务处理

```python
from sqlalchemy.exc import SQLAlchemyError

try:
    player1 = session.query(Player).filter(Player.player_id == 1).first()
    player2 = session.query(Player).filter(Player.player_id == 2).first()
    
    player1.team_id = 1001
    player2.team_id = 1002
    
    session.commit()
except SQLAlchemyError as e:
    session.rollback()
    print(f"操作失败: {e}")
```

## 连接池配置

```python
from sqlalchemy import create_engine

engine = create_engine(
    'mysql+pymysql://root:password@localhost:3306/test',
    pool_size=10,
    max_overflow=20,
    pool_timeout=30,
    pool_recycle=3600
)
```

| 参数 | 说明 |
|:---|:---|
| pool_size | 连接池大小 |
| max_overflow | 最大溢出连接数 |
| pool_timeout | 获取连接超时时间 |
| pool_recycle | 连接回收时间 |

## 最佳实践

### 1. 使用上下文管理器

```python
from contextlib import contextmanager

@contextmanager
def get_session():
    session = Session()
    try:
        yield session
        session.commit()
    except:
        session.rollback()
        raise
    finally:
        session.close()

with get_session() as session:
    player = Player(team_id=1001, player_name="新球员", height=2.05)
    session.add(player)
```

### 2. 异常处理

```python
import mysql.connector
from mysql.connector import Error

db = None
cursor = None
try:
    db = mysql.connector.connect(
        host="localhost",
        user="root",
        password="password",
        database="test"
    )
    
    if db.is_connected():
        cursor = db.cursor()
        cursor.execute("SELECT VERSION()")
        print(cursor.fetchone())
        
except Error as e:
    print(f"数据库错误: {e}")
    
finally:
    if cursor is not None:
        cursor.close()
    if db is not None and db.is_connected():
        db.close()
```

### 3. 连接配置管理

```python
import configparser

config = configparser.ConfigParser()
config.read('config.ini')

db_config = {
    'host': config['mysql']['host'],
    'user': config['mysql']['user'],
    'password': config['mysql']['password'],
    'database': config['mysql']['database']
}

db = mysql.connector.connect(**db_config)
```

## 总结

### 原生驱动 vs ORM

| 特性 | 原生驱动 | ORM |
|:---|:---|:---|
| 性能 | 高 | 中等 |
| 灵活性 | 高 | 中等 |
| 学习成本 | 低 | 中等 |
| 代码量 | 多 | 少 |
| 可移植性 | 低 | 高 |

### 选择建议

**使用原生驱动**：
- 性能要求高的场景
- 复杂 SQL 查询
- 数据库迁移脚本
- 学习 SQL 基础

**使用 ORM**：
- 快速开发
- 需要数据库可移植性
- 团队协作项目
- 业务逻辑复杂

### 最佳实践

1. **防止 SQL 注入**：使用参数化查询
2. **事务管理**：重要操作使用事务
3. **连接池**：生产环境使用连接池
4. **异常处理**：捕获并处理数据库异常
5. **资源释放**：及时关闭连接和游标
