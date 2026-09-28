---
title: MySQL管理操作
description: MySQL 管理操作入门：客户端/服务器连接方式、数据库与表管理（DDL）、REPLACE / ON DUPLICATE KEY / INSERT IGNORE 插入技巧、用户与权限管理、常用 SHOW 管理命令与图形化工具
keywords: [MySQL, 数据库, 连接管理]
category: MySQL
tags: [SQL, MySQL]
---

# MySQL管理操作

安装完 MySQL 后，除了 MySQL Server（真正的 MySQL 服务器），还附赠一个 MySQL Client 程序。MySQL Client 是一个命令行客户端，可以通过它登录 MySQL，然后输入 SQL 语句并执行。

## 客户端与服务端

### 架构关系

```text
┌──────────────┐  SQL   ┌──────────────┐
│ MySQL Client │───────>│ MySQL Server │
└──────────────┘  TCP   └──────────────┘
```

**连接过程**：
1. MySQL Client 通过 TCP 连接发送 SQL 语句到 MySQL Server
2. 默认端口号是 3306
3. 本机连接地址为 `127.0.0.1:3306`

### 连接方式

```bash
# 连接本地 MySQL
mysql -u root -p

# 连接远程 MySQL
mysql -h 10.0.1.99 -P 3306 -u root -p

# 指定数据库连接
mysql -u root -p -D test
```

**参数说明**：

| 参数 | 说明 | 示例 |
|:---|:---|:---|
| -h | 主机地址 | `-h 192.168.1.100` |
| -P | 端口号 | `-P 3306` |
| -u | 用户名 | `-u root` |
| -p | 密码 | `-p`（交互式输入） |
| -D | 指定数据库 | `-D test` |

## 数据库管理

### 查看数据库

```sql
-- 列出所有数据库
SHOW DATABASES;
```

**输出示例**（MySQL 8.0 默认只有 4 个系统库）：
```
+--------------------+
| Database           |
+--------------------+
| information_schema |
| mysql              |
| performance_schema |
| sys                |
+--------------------+
```

**系统库说明**：

| 数据库 | 说明 |
|:---|:---|
| information_schema | 元数据信息 |
| mysql | 用户权限信息 |
| performance_schema | 性能监控数据 |
| sys | 系统视图 |

> **注意**：不要修改系统库，它们是 MySQL 正常运行的基础。

### 创建数据库

```sql
-- 创建数据库
CREATE DATABASE test;

-- 创建数据库并指定字符集
CREATE DATABASE test 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 如果不存在则创建
CREATE DATABASE IF NOT EXISTS test;
```

### 删除数据库

```sql
-- 删除数据库
DROP DATABASE test;

-- 如果存在则删除
DROP DATABASE IF EXISTS test;
```

> **警告**：删除数据库将导致该数据库的所有表被删除，操作不可逆！

### 切换数据库

```sql
-- 切换到指定数据库
USE test;

-- 查看当前使用的数据库
SELECT DATABASE();
```

## 表管理

### 查看表

```sql
-- 列出当前数据库的所有表
SHOW TABLES;

-- 查看表结构
DESC students;

-- 查看创建表的 SQL 语句
SHOW CREATE TABLE students;
```

**DESC 输出示例**（MySQL 8.0 起整型不再显示宽度，写作 `bigint`/`int` 而非 `bigint(20)`/`int(11)`）：
```
+----------+--------------+------+-----+---------+----------------+
| Field    | Type         | Null | Key | Default | Extra          |
+----------+--------------+------+-----+---------+----------------+
| id       | bigint       | NO   | PRI | NULL    | auto_increment |
| class_id | bigint       | NO   |     | NULL    |                |
| name     | varchar(100) | NO   |     | NULL    |                |
| gender   | varchar(1)   | NO   |     | NULL    |                |
| score    | int          | NO   |     | NULL    |                |
+----------+--------------+------+-----+---------+----------------+
```

**字段说明**：

| 字段 | 说明 |
|:---|:---|
| Field | 字段名 |
| Type | 数据类型 |
| Null | 是否允许为空 |
| Key | 键类型（PRI=主键，MUL=普通索引） |
| Default | 默认值 |
| Extra | 额外属性（如 auto_increment） |

### 创建表

```sql
CREATE TABLE students (
    id BIGINT NOT NULL AUTO_INCREMENT,
    class_id BIGINT NOT NULL,
    name VARCHAR(100) NOT NULL,
    gender VARCHAR(1) NOT NULL,
    score INT NOT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 修改表

```sql
-- 添加列
ALTER TABLE students ADD COLUMN birth VARCHAR(10) NOT NULL;

-- 修改列名和类型
ALTER TABLE students CHANGE COLUMN birth birthday VARCHAR(20) NOT NULL;

-- 仅修改类型
ALTER TABLE students MODIFY COLUMN birthday DATE NOT NULL;

-- 删除列
ALTER TABLE students DROP COLUMN birthday;

-- 添加索引
ALTER TABLE students ADD INDEX idx_score (score);

-- 添加唯一索引
ALTER TABLE students ADD UNIQUE INDEX uni_name (name);

-- 删除索引
ALTER TABLE students DROP INDEX idx_score;
```

### 删除表

```sql
-- 删除表
DROP TABLE students;

-- 如果存在则删除
DROP TABLE IF EXISTS students;

-- 清空表数据（保留表结构）
TRUNCATE TABLE students;
```

**TRUNCATE vs DELETE**：

| 操作 | TRUNCATE | DELETE |
|:---|:---|:---|
| 速度 | 快 | 慢 |
| 可回滚 | 否 | 是 |
| 重置自增 | 是 | 否 |
| 触发器 | 不触发 | 触发 |

## 实用 SQL 语句

### 插入或替换（REPLACE）

如果记录存在则删除后插入，不存在则直接插入：

```sql
-- 如果 id=1 存在，先删除再插入；不存在则直接插入
REPLACE INTO students (id, class_id, name, gender, score) 
VALUES (1, 1, '小明', 'M', 99);
```

**执行逻辑**：
1. 尝试插入记录
2. 如果主键冲突，删除原记录
3. 插入新记录

### 插入或更新（INSERT ... ON DUPLICATE KEY UPDATE）

如果记录存在则更新，不存在则插入：

```sql
INSERT INTO students (id, class_id, name, gender, score) 
VALUES (1, 1, '小明', 'M', 99) 
ON DUPLICATE KEY UPDATE 
    name = '小明', 
    gender = 'M', 
    score = 99;
```

**执行逻辑**：
1. 尝试插入记录
2. 如果主键冲突，执行 UPDATE 部分
3. 不影响其他字段

### 插入或忽略（INSERT IGNORE）

如果记录存在则忽略，不存在则插入：

```sql
INSERT IGNORE INTO students (id, class_id, name, gender, score) 
VALUES (1, 1, '小明', 'M', 99);
```

**执行逻辑**：
1. 尝试插入记录
2. 如果主键冲突，忽略本次操作
3. 不会报错

### 三种方式对比

| 方式 | 存在时行为 | 不存在时行为 |
|:---|:---|:---|
| REPLACE | 删除后插入 | 插入 |
| INSERT ON DUPLICATE KEY UPDATE | 更新 | 插入 |
| INSERT IGNORE | 忽略 | 插入 |

### 表快照

复制表结构和数据到新表：

```sql
-- 复制整个表
CREATE TABLE students_backup SELECT * FROM students;

-- 复制部分数据
CREATE TABLE students_of_class1 
SELECT * FROM students WHERE class_id = 1;

-- 仅复制表结构
CREATE TABLE students_copy LIKE students;
```

### 写入查询结果

将查询结果插入到另一个表：

```sql
-- 创建统计表
CREATE TABLE statistics (
    id BIGINT NOT NULL AUTO_INCREMENT,
    class_id BIGINT NOT NULL,
    average DOUBLE NOT NULL,
    PRIMARY KEY (id)
);

-- 将查询结果写入统计表
INSERT INTO statistics (class_id, average) 
SELECT class_id, AVG(score) 
FROM students 
GROUP BY class_id;
```

**查询结果**：
```
+----+----------+--------------+
| id | class_id | average      |
+----+----------+--------------+
|  1 |        1 |         86.5 |
|  2 |        2 | 73.666666666 |
|  3 |        3 | 88.333333333 |
+----+----------+--------------+
```

### 强制使用索引

当优化器选择不合适的索引时，可以强制使用指定索引：

```sql
-- 强制使用 idx_class_id 索引
SELECT * FROM students 
FORCE INDEX (idx_class_id) 
WHERE class_id = 1 
ORDER BY id DESC;
```

**使用场景**：
- 优化器选择了低效的索引
- 数据分布不均匀导致统计信息不准确
- 需要测试不同索引的性能

## 用户管理

### 创建用户

```sql
-- 创建用户
CREATE USER 'user1'@'localhost' IDENTIFIED BY 'password123';

-- 创建允许远程访问的用户
CREATE USER 'user2'@'%' IDENTIFIED BY 'password123';
```

### 授权

```sql
-- 授予所有权限
GRANT ALL PRIVILEGES ON *.* TO 'user1'@'localhost';

-- 授予特定数据库的所有权限
GRANT ALL PRIVILEGES ON test.* TO 'user1'@'localhost';

-- 授予特定权限
GRANT SELECT, INSERT, UPDATE ON test.* TO 'user1'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;
```

### 查看权限

```sql
-- 查看用户权限
SHOW GRANTS FOR 'user1'@'localhost';
```

### 撤销权限

```sql
-- 撤销权限
REVOKE INSERT, UPDATE ON test.* FROM 'user1'@'localhost';
```

### 删除用户

```sql
-- 删除用户
DROP USER 'user1'@'localhost';
```

### 修改密码

```sql
-- MySQL 5.7.6+（8.0 推荐写法）
ALTER USER 'user1'@'localhost' IDENTIFIED BY 'new_password';

-- MySQL 5.7.5 及以下（PASSWORD() 函数在 8.0 中已被移除）
SET PASSWORD FOR 'user1'@'localhost' = PASSWORD('new_password');
```

## 常用管理命令

### 查看状态

```sql
-- 查看服务器状态
SHOW STATUS;

-- 查看特定状态
SHOW STATUS LIKE 'Threads%';

-- 查看变量
SHOW VARIABLES;

-- 查看特定变量
SHOW VARIABLES LIKE 'max_connections';
```

### 查看进程

```sql
-- 查看当前连接
SHOW PROCESSLIST;

-- 查看完整信息
SHOW FULL PROCESSLIST;
```

**输出示例**：
```
+----+------+-----------------+------+---------+------+----------+------------------+
| Id | User | Host            | db   | Command | Time | State    | Info             |
+----+------+-----------------+------+---------+------+----------+------------------+
|  5 | root | localhost       | test | Query   |    0 | starting | SHOW PROCESSLIST |
+----+------+-----------------+------+---------+------+----------+------------------+
```

### 终止进程

```sql
-- 终止指定连接
KILL 5;

-- 终止查询但保持连接
KILL QUERY 5;
```

## 图形化管理工具

### MySQL Workbench

MySQL Workbench 是 MySQL 官方提供的可视化工具：

**主要功能**：
- 数据库设计（ER 图）
- SQL 开发和调试
- 数据库管理
- 数据迁移
- 性能监控

**下载地址**：
```
https://dev.mysql.com/downloads/workbench/
```

### 其他推荐工具

| 工具 | 平台 | 特点 |
|:---|:---|:---|
| Navicat | 跨平台 | 功能强大，支持多种数据库 |
| DBeaver | 跨平台 | 开源免费，支持多种数据库 |
| DataGrip | 跨平台 | JetBrains 出品，智能提示 |
| phpMyAdmin | Web | Web 界面，适合服务器部署 |

> **注意**：无论使用哪种图形工具，本质上都是发送 SQL 语句执行。掌握 SQL 命令是基础。

## 退出 MySQL

```sql
-- 方式一
EXIT;

-- 方式二
QUIT;

-- 方式三
\q
```

> **注意**：EXIT 只是断开客户端与服务器的连接，MySQL 服务器仍然在后台运行。

## 总结

### 数据库操作

| 操作 | 命令 |
|:---|:---|
| 查看数据库 | `SHOW DATABASES;` |
| 创建数据库 | `CREATE DATABASE db_name;` |
| 删除数据库 | `DROP DATABASE db_name;` |
| 切换数据库 | `USE db_name;` |

### 表操作

| 操作 | 命令 |
|:---|:---|
| 查看表 | `SHOW TABLES;` |
| 查看表结构 | `DESC table_name;` |
| 创建表 | `CREATE TABLE ...` |
| 修改表 | `ALTER TABLE ...` |
| 删除表 | `DROP TABLE ...` |

### 插入数据技巧

| 场景 | 命令 |
|:---|:---|
| 存在则替换 | `REPLACE INTO ...` |
| 存在则更新 | `INSERT ... ON DUPLICATE KEY UPDATE ...` |
| 存在则忽略 | `INSERT IGNORE INTO ...` |
