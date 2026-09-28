---
title: "MySQL"
description: "MySQL 是一个开源的关系型数据库管理系统(RDBMS),由瑞典 MySQL AB 公司开发,现属于 Oracle 公司。它使用 SQL(结构化查询语言)进行数据管理,是最流行的关系型数据库之一。"
keywords: [MySQL]
category: "Java"
tags: [Java, 数据库]
---


# MySQL

MySQL 是主流关系型数据库管理系统之一,在 Java 后端项目中极为常见。学习 MySQL 的重点不只是语法,而是数据建模、事务、索引和执行性能。

## 概念定义

### 什么是 MySQL

MySQL 是一个开源的关系型数据库管理系统(RDBMS),由瑞典 MySQL AB 公司开发,现属于 Oracle 公司。它使用 SQL(结构化查询语言)进行数据管理,是最流行的关系型数据库之一。

**核心特点**:
- **开源免费**:社区版免费使用,降低企业成本
- **跨平台**:支持 Windows、Linux、macOS 等操作系统
- **高性能**:优化的存储引擎和查询优化器
- **高可靠**:支持事务、主从复制、高可用架构
- **易使用**:SQL 语法简单,学习成本低

### MySQL 与其他数据库对比

| 数据库 | 特点 | 适用场景 |
|--------|------|----------|
| **MySQL** | 开源、高性能、生态完善 | Web 应用、中小型企业系统 |
| **PostgreSQL** | 功能强大、标准支持好 | 复杂查询、GIS 应用 |
| **Oracle** | 功能最完善、企业级支持 | 大型企业、金融系统 |
| **SQL Server** | 与 Windows 深度集成 | .NET 技术栈项目 |
| **SQLite** | 轻量级、无服务器 | 嵌入式应用、移动端 |

## 当前推荐基线

### 版本选择

- **生产环境**:优先使用 MySQL 8.x
- **维护项目**:MySQL 5.7 仍在广泛使用

**MySQL 8.x 的主要优势**:
- 性能提升:更快的读写性能
- 新特性:窗口函数、CTE(公共表表达式)、JSON 增强
- 安全性:默认使用 caching_sha2_password 认证
- 事务性数据字典:不再使用 .frm 文件

### 存储引擎

- **默认引擎**:InnoDB
- **字符集**:utf8mb4
- **排序规则**:utf8mb4_unicode_ci 或 utf8mb4_0900_ai_ci(MySQL 8.x)

### 排障方式

- EXPLAIN 分析执行计划
- 慢查询日志定位问题 SQL
- 监控指标追踪数据库性能
- information_schema 查询元数据
- performance_schema 性能监控

## 核心原理

### 架构分层

MySQL 可以理解为四层架构:

```
┌─────────────────────────────────────┐
│         连接层(Connection Layer)      │
│  - 连接管理、认证授权、线程池           │
│  - 处理客户端连接请求                  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│         服务层(Server Layer)          │
│  - SQL 解析器(Parser)                │
│  - 查询优化器(Optimizer)              │
│  - 查询缓存(Query Cache,8.0已移除)    │
│  - 执行器(Executor)                  │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│      存储引擎层(Storage Engine)       │
│  - InnoDB(默认)                      │
│  - MyISAM                           │
│  - Memory                           │
│  - 其他插件式引擎                     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│        存储层(Storage Layer)          │
│  - 数据文件(.ibd, .frm)              │
│  - 日志文件(redo log, undo log)      │
│  - 配置文件(my.cnf/my.ini)           │
└─────────────────────────────────────┘
```

**各层职责**:

| 层级 | 职责 | 说明 |
|------|------|------|
| **连接层** | 连接管理、认证授权 | 处理客户端连接,验证身份,管理连接池 |
| **服务层** | SQL 解析、优化、执行 | 解析 SQL 语句,生成执行计划,执行查询 |
| **存储引擎层** | 数据读写、索引组织 | 负责实际的数据存储和检索 |
| **存储层** | 数据持久化 | 数据文件、日志文件的存储 |

### 为什么默认优先 InnoDB

现代业务系统默认优先 InnoDB,原因很直接:

| 特性 | InnoDB | MyISAM | 说明 |
|------|--------|--------|------|
| **事务支持** | √ 支持 | × 不支持 | InnoDB 支持事务,保证数据一致性 |
| **锁粒度** | 行级锁 | 表级锁 | InnoDB 并发性能更好 |
| **外键** | √ 支持 | × 不支持 | InnoDB 支持外键约束 |
| **崩溃恢复** | √ 支持 | × 不支持 | InnoDB 自动恢复数据 |
| **MVCC** | √ 支持 | × 不支持 | 多版本并发控制,提升并发性能 |
| **全文索引** | √ 5.6+ 支持 | √ 支持 | 都支持,但 MyISAM 更早支持 |

**MyISAM 适用场景**:
- 只读或读多写少的场景
- 不需要事务的简单应用
- 历史数据归档

**InnoDB 适用场景**:
- 需要事务的业务系统
- 高并发读写场景
- 需要外键约束的系统

**注意事项**:
- MyISAM 更多是历史知识点,不应再作为现代业务库默认选型
- MySQL 8.x 已将 MyISAM 相关功能逐步弱化

## 安装与配置

### Linux 环境安装

#### 方式一:使用包管理器安装

```bash
# CentOS/RHEL
sudo yum install mysql-server

# Ubuntu/Debian
sudo apt-get update
sudo apt-get install mysql-server

# 启动 MySQL 服务
sudo systemctl start mysqld
sudo systemctl enable mysqld

# 获取临时密码(MySQL 5.7+)
sudo grep 'temporary password' /var/log/mysqld.log

# 登录 MySQL
mysql -u root -p
```

#### 方式二:使用官方 Yum 源安装(MySQL 8.x)

```bash
# 下载 MySQL 官方 Yum 源
wget https://dev.mysql.com/get/mysql80-community-release-el7-3.noarch.rpm

# 安装 Yum 源
sudo rpm -ivh mysql80-community-release-el7-3.noarch.rpm

# 安装 MySQL
sudo yum install mysql-server

# 启动 MySQL
sudo systemctl start mysqld
sudo systemctl enable mysqld

# 查看初始密码
sudo grep 'temporary password' /var/log/mysqld.log

# 修改 root 密码
mysql -u root -p
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewPassword123!';
```

### Windows 环境安装

1. **下载安装包**:访问 MySQL 官网下载 Windows 安装包
2. **运行安装程序**:选择"Developer Default"或"Server only"
3. **配置实例**:
   - 设置 root 密码
   - 选择字符集(utf8mb4)
   - 配置为 Windows 服务
4. **验证安装**:
   ```cmd
   mysql -u root -p
   ```

### macOS 环境安装

```bash
# 使用 Homebrew 安装
brew install mysql

# 启动 MySQL 服务
brew services start mysql

# 初始化安全设置
mysql_secure_installation

# 登录 MySQL
mysql -u root -p
```

### 基础配置文件

**Linux 配置文件路径**:`/etc/my.cnf` 或 `/etc/mysql/my.cnf`

**Windows 配置文件路径**:`C:\ProgramData\MySQL\MySQL Server 8.0\my.ini`

**推荐配置示例**:

```ini
[mysqld]
# 基础配置
user = mysql
port = 3306
basedir = /usr/local/mysql
datadir = /usr/local/mysql/data
socket = /tmp/mysql.sock

# 字符集配置
character-set-server = utf8mb4
collation-server = utf8mb4_unicode_ci

# 存储引擎
default-storage-engine = InnoDB

# 连接配置
max_connections = 200
max_connect_errors = 100

# 缓冲池配置(InnoDB)
innodb_buffer_pool_size = 1G
innodb_buffer_pool_instances = 4

# 日志配置
log_error = /var/log/mysql/error.log
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# 二进制日志(主从复制)
log_bin = mysql-bin
binlog_format = ROW
expire_logs_days = 7  # 8.0 推荐改用 binlog_expire_logs_seconds = 604800

[client]
default-character-set = utf8mb4
port = 3306
socket = /tmp/mysql.sock

[mysql]
default-character-set = utf8mb4
```

## 基本使用

### 数据库操作

#### 创建数据库

```sql
-- 创建数据库(指定字符集和排序规则)
CREATE DATABASE shop
DEFAULT CHARACTER SET utf8mb4
DEFAULT COLLATE utf8mb4_unicode_ci;

-- 查看数据库
SHOW DATABASES;

-- 查看数据库创建语句
SHOW CREATE DATABASE shop;

-- 选择数据库
USE shop;

-- 删除数据库
DROP DATABASE IF EXISTS shop;
```

#### 创建表

```sql
-- 创建用户表
CREATE TABLE user_account (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    username VARCHAR(64) NOT NULL COMMENT '用户名',
    email VARCHAR(128) NOT NULL COMMENT '邮箱',
    phone VARCHAR(20) COMMENT '手机号',
    status TINYINT NOT NULL DEFAULT 1 COMMENT '状态:1正常,0禁用',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 唯一约束
    UNIQUE KEY uk_email (email),
    UNIQUE KEY uk_phone (phone),
    -- 索引
    KEY idx_status_created_at (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户账户表';

-- 查看表结构
DESC user_account;

-- 查看表创建语句
SHOW CREATE TABLE user_account;

-- 查看表索引
SHOW INDEX FROM user_account;

-- 删除表
DROP TABLE IF EXISTS user_account;
```

### 数据操作

#### 插入数据

```sql
-- 插入单条数据
INSERT INTO user_account (username, email, phone, status)
VALUES ('zhangsan', 'zhangsan@example.com', '13800138000', 1);

-- 插入多条数据
INSERT INTO user_account (username, email, phone, status) VALUES
('lisi', 'lisi@example.com', '13900139000', 1),
('wangwu', 'wangwu@example.com', '13700137000', 1);

-- 从查询结果插入
INSERT INTO user_account_backup (username, email, phone)
SELECT username, email, phone FROM user_account WHERE status = 1;
```

#### 查询数据

```sql
-- 查询所有数据
SELECT * FROM user_account;

-- 查询指定字段
SELECT id, username, email FROM user_account;

-- 条件查询
SELECT * FROM user_account WHERE status = 1;

-- 排序查询
SELECT * FROM user_account ORDER BY created_at DESC;

-- 分页查询
SELECT * FROM user_account LIMIT 0, 10;  -- 跳过0条,取10条
SELECT * FROM user_account LIMIT 10 OFFSET 0;  -- 等价写法(所有版本均支持)

-- 聚合查询
SELECT status, COUNT(*) as count FROM user_account GROUP BY status;

-- 连接查询
SELECT u.username, o.order_no
FROM user_account u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.status = 1;
```

#### 更新数据

```sql
-- 更新单个字段
UPDATE user_account SET status = 0 WHERE id = 1;

-- 更新多个字段
UPDATE user_account
SET status = 0, updated_at = NOW()
WHERE id = 1;

-- 条件更新
UPDATE user_account
SET status = 0
WHERE created_at < '2020-01-01' AND status = 1;
```

#### 删除数据

```sql
-- 删除指定数据
DELETE FROM user_account WHERE id = 1;

-- 条件删除
DELETE FROM user_account WHERE status = 0;

-- 删除所有数据(保留表结构)
DELETE FROM user_account;

-- 清空表(重置自增ID)
TRUNCATE TABLE user_account;
```

### 用户与权限管理

#### 创建用户

```sql
-- 创建用户
CREATE USER 'appuser'@'%' IDENTIFIED BY 'Password123!';

-- 创建用户并指定认证插件
CREATE USER 'appuser'@'%' IDENTIFIED WITH mysql_native_password BY 'Password123!';

-- 修改用户密码
ALTER USER 'appuser'@'%' IDENTIFIED BY 'NewPassword456!';

-- 删除用户
DROP USER 'appuser'@'%';
```

#### 授权与回收权限

```sql
-- 授权
GRANT ALL PRIVILEGES ON shop.* TO 'appuser'@'%';

-- 授予特定权限
GRANT SELECT, INSERT, UPDATE ON shop.* TO 'appuser'@'%';

-- 授予所有数据库权限
GRANT ALL PRIVILEGES ON *.* TO 'admin'@'%' WITH GRANT OPTION;

-- 刷新权限
FLUSH PRIVILEGES;

-- 查看用户权限
SHOW GRANTS FOR 'appuser'@'%';

-- 回收权限
REVOKE INSERT, UPDATE ON shop.* FROM 'appuser'@'%';

-- 回收所有权限
REVOKE ALL PRIVILEGES ON shop.* FROM 'appuser'@'%';
```

**常用权限**:

| 权限 | 说明 |
|------|------|
| ALL PRIVILEGES | 所有权限 |
| SELECT | 查询权限 |
| INSERT | 插入权限 |
| UPDATE | 更新权限 |
| DELETE | 删除权限 |
| CREATE | 创建表/库权限 |
| DROP | 删除表/库权限 |
| ALTER | 修改表结构权限 |
| INDEX | 创建/删除索引权限 |
| GRANT OPTION | 授权权限 |

## 使用场景

### 典型应用场景

#### 1. 订单、用户、库存等强事务业务

**特点**:
- 需要事务保证数据一致性
- 高并发读写
- 需要外键约束

**解决方案**:
- 使用 InnoDB 引擎
- 合理设计索引
- 控制事务边界

#### 2. 管理后台

**特点**:
- 读多写少
- 复杂查询、报表统计
- 需要事务保证

**解决方案**:
- 使用索引优化查询
- 使用视图简化复杂查询
- 合理使用存储过程

#### 3. 业务核心主库

**特点**:
- 数据量大
- 需要高可用
- 需要备份恢复

**解决方案**:
- 主从复制实现读写分离
- 定期备份
- 监控告警

#### 4. 需要复杂 SQL 查询和事务一致性的系统

**特点**:
- 复杂业务逻辑
- 多表关联查询
- 需要事务保证

**解决方案**:
- 合理设计表结构
- 使用联合索引优化多表查询
- 控制事务范围

## 必须掌握的几个主题

### 1. 事务

事务的核心是 ACID:

| 特性 | 英文 | 含义 |
|------|------|------|
| **原子性** | Atomicity | 事务是不可分割的工作单位,要么都做,要么都不做 |
| **一致性** | Consistency | 事务执行前后数据库状态一致 |
| **隔离性** | Isolation | 多个事务并发执行时互不干扰 |
| **持久性** | Durability | 事务提交后永久生效 |

**业务里最常见的问题不是背定义,而是**:
- 为什么会出现脏读、不可重复读、幻读
- 为什么事务范围过大容易拖慢系统
- 为什么事务和锁几乎总是一起讨论

**深入理解**:
- 事务的隔离级别(READ UNCOMMITTED、READ COMMITTED、REPEATABLE READ、SERIALIZABLE)
- MVCC(多版本并发控制)
- 事务日志(redo log、undo log)

### 2. 索引

索引的作用是减少扫描范围,提高查询效率,但不是"加得越多越好"。

**需要重点掌握**:

| 索引类型 | 说明 | 适用场景 |
|----------|------|----------|
| **主键索引** | 自动创建,聚簇索引 | 主键字段 |
| **唯一索引** | 列值唯一 | 唯一字段(邮箱、手机号) |
| **普通索引** | 最基本的索引 | 经常查询的字段 |
| **联合索引** | 多列组合 | 多条件查询 |
| **全文索引** | 文本搜索 | 文章内容搜索 |

**索引原理**:
- B+Tree 数据结构
- 聚簇索引与非聚簇索引
- 回表与覆盖索引
- 最左前缀原则
- 索引失效场景

### 3. 执行计划

写完 SQL 之后,要学会用 EXPLAIN 看:

```sql
EXPLAIN SELECT * FROM user_account WHERE status = 1;
```

**关键字段**:

| 字段 | 说明 | 关注点 |
|------|------|--------|
| **type** | 访问类型 | 是否出现 ALL(全表扫描) |
| **possible_keys** | 理论可选索引 | 有哪些索引可用 |
| **key** | 实际使用的索引 | 用了哪个索引 |
| **rows** | 预计扫描行数 | 扫描成本 |
| **Extra** | 额外信息 | Using filesort、Using temporary |

**type 类型(从好到坏)**:
- system > const > eq_ref > ref > range > index > ALL
- 避免出现 ALL(全表扫描)

## 性能优化基础

### 查询优化原则

1. **避免 SELECT ***:只查询需要的字段
2. **使用索引**:确保查询条件命中索引
3. **避免函数操作**:不要在索引列上使用函数
4. **合理使用 LIMIT**:避免大结果集
5. **避免隐式转换**:字段类型与查询值类型一致

### 索引优化原则

1. **选择性高的列优先**:区分度高的字段适合建索引
2. **最左前缀原则**:联合索引要从最左列开始匹配
3. **覆盖索引**:查询字段全部在索引中,避免回表
4. **避免冗余索引**:不建重复或包含关系的索引

### 表设计优化原则

1. **选择合适的字段类型**:能用 TINYINT 不用 INT
2. **合理的范式化**:适度冗余提升查询性能
3. **避免过度NULL**:NULL 值影响索引效率
4. **合理使用分区表**:大表考虑分区

## 常见误区

### 误区一:会增删改查就算会 MySQL

**错误认知**:能写 CRUD 语句就算掌握了 MySQL。

**正确理解**:
真正区分水平的,是能不能把 SQL 和索引、事务、锁、执行计划关联起来看。需要掌握:
- 索引原理和优化
- 事务隔离级别和 MVCC
- 锁机制和死锁排查
- 执行计划分析
- 性能调优

### 误区二:默认字符集无所谓

**错误认知**:字符集不重要,默认就行。

**正确理解**:
现代项目建议明确使用 utf8mb4,否则在表情符号、多语言字符场景容易踩坑。

**问题示例**:
- utf8 只支持最多 3 字节字符,无法存储 emoji
- utf8mb4 支持 4 字节字符,可以存储 emoji 和特殊字符

```sql
-- × 不推荐:utf8 可能导致 emoji 存储失败
CREATE TABLE user (name VARCHAR(100)) CHARSET=utf8;

-- √ 推荐:使用 utf8mb4
CREATE TABLE user (name VARCHAR(100)) CHARSET=utf8mb4;
```

### 误区三:所有查询都交给 ORM

**错误认知**:ORM 框架会自动优化 SQL,不需要关心数据库。

**正确理解**:
ORM 只是开发提效工具,不会自动替你设计好索引和高质量 SQL。

**常见问题**:
- N+1 查询问题
- 不合理的关联查询
- 索引失效
- 大结果集查询

**解决方案**:
- 理解 ORM 生成的 SQL
- 使用 EXPLAIN 分析查询
- 必要时手写 SQL

### 误区四:索引越多越好

**错误认知**:索引能提升查询性能,多建几个没问题。

**正确理解**:
索引不是越多越好,索引越多,写入成本越高。

**索引的代价**:
- 占用磁盘空间
- 插入、更新、删除时需要维护索引
- 可能导致查询优化器选择错误索引

**建议**:
- 根据查询场景建索引
- 定期清理无用索引
- 使用组合索引替代多个单列索引

### 误区五:MySQL 配置不需要优化

**错误认知**:默认配置就够用了。

**正确理解**:
默认配置是通用配置,针对具体场景需要优化。

**常见优化项**:
- `innodb_buffer_pool_size`:建议设置为物理内存的 70-80%
- `max_connections`:根据并发量调整
- `innodb_log_file_size`:大事务场景适当增大
- `slow_query_log`:开启慢查询日志

## MySQL 管理工具

### 命令行工具

```bash
# 登录 MySQL
mysql -u root -p

# 指定主机和端口登录
mysql -h 192.168.1.100 -P 3306 -u root -p

# 执行 SQL 文件
mysql -u root -p < backup.sql

# 导出数据库
mysqldump -u root -p shop > shop_backup.sql

# 导出表
mysqldump -u root -p shop user_account > user_account.sql

# 导入数据库
mysql -u root -p shop < shop_backup.sql
```

### 图形化工具

| 工具 | 特点 | 适用场景 |
|------|------|----------|
| **MySQL Workbench** | 官方工具,功能完善 | 数据库设计、管理、开发 |
| **Navicat** | 功能强大,易使用 | 数据库管理、数据迁移 |
| **DBeaver** | 开源免费,支持多种数据库 | 多数据库统一管理 |
| **phpMyAdmin** | Web 界面 | 远程管理 |

### 监控工具

| 工具 | 说明 |
|------|------|
| **MySQL Enterprise Monitor** | MySQL 官方监控工具 |
| **Percona Monitoring and Management(PMM)** | 开源监控平台 |
| **Prometheus + Grafana** | 时序数据库 + 可视化 |
| **Zabbix** | 企业级监控平台 |

## 面试或实践补充

### 常见面试题

#### 1. InnoDB 和 MyISAM 的核心区别是什么?

**回答要点**:
- 事务支持:InnoDB 支持,MyISAM 不支持
- 锁粒度:InnoDB 行级锁,MyISAM 表级锁
- 恢复能力:InnoDB 支持崩溃恢复,MyISAM 不支持
- 外键:InnoDB 支持,MyISAM 不支持
- 适用场景:InnoDB 适合业务系统,MyISAM 适合只读场景

#### 2. 为什么联合索引要关注列顺序?

**回答要点**:
- 因为索引匹配和过滤效率依赖最左前缀原则
- 联合索引 (a, b, c) 可以支持 a、(a,b)、(a,b,c) 的查询
- 不支持 b、c、(b,c) 的查询
- 选择性高的列放在前面,可以快速过滤数据

#### 3. 为什么慢 SQL 不一定是数据库本身的问题?

**回答要点**:
- 可能是业务设计问题:表结构设计不合理
- 可能是分页方式问题:大偏移量分页
- 可能是连接池问题:连接数不足
- 可能是事务边界问题:长事务占用锁
- 可能是索引设计问题:缺少索引或索引失效

#### 4. 如何优化慢查询?

**回答要点**:
1. 使用 EXPLAIN 分析执行计划
2. 确认是否命中索引
3. 检查扫描行数是否过大
4. 避免 SELECT *
5. 优化 WHERE 条件,避免索引失效
6. 考虑使用覆盖索引
7. 大表分页优化

#### 5. 什么是 MVCC?

**回答要点**:
- MVCC(Multi-Version Concurrency Control):多版本并发控制
- 用于解决读写并发冲突
- 通过 undo log 保存数据的历史版本
- Read View 实现一致性读
- 不同隔离级别下 MVCC 的实现不同

### 实践建议

1. **动手实践**:在本地搭建 MySQL 环境,实际操作
2. **分析案例**:分析生产环境的慢查询日志
3. **性能测试**:使用 sysbench 等工具进行性能测试
4. **深入学习**:阅读 MySQL 官方文档

## 后续学习路径

1. **基础操作**:掌握 SQL 语法和基本操作
2. **表设计**:学习表结构设计和范式理论
3. **索引优化**:深入理解索引原理和优化方法
4. **事务与锁**:掌握事务隔离级别和锁机制
5. **性能调优**:学习慢查询优化和配置调优
6. **高可用**:学习主从复制、分库分表

---

MySQL 是 Java 后端开发的核心技能,扎实的 MySQL 基础能帮助你设计出高性能、高可用的系统。不要停留在"会写 SQL"的层面,深入理解数据库原理,才能真正成为优秀的后端工程师。

## 版本差异(MySQL 5.7 → 8.0/8.4)

| 特性 | 旧版（本文编写时，MySQL 5.7） | 当前（MySQL 8.0/8.4 LTS） |
|------|-----------------------------|--------------------------|
| 默认字符集 | utf8（需显式配置 utf8mb4） | utf8mb4（MySQL 8.0 起默认） |
| 索引 | 普通 B+Tree | 降序索引、隐藏索引、函数索引（8.0+） |
| SQL 能力 | 常规查询 | 递归 CTE、窗口函数（8.0+） |
| 版本策略 | 5.7 | 8.0（主流）/ 8.4 LTS / 9.x（创新版） |
| Java 驱动 | mysql-connector-java 5.x/8.0 | mysql-connector-j 8.x/9.x |

> 本文基于 MySQL 5.7 编写，核心概念（索引、事务、锁、MVCC、InnoDB）在 8.0/8.4 中依然适用；8.0 的默认字符集、隐藏索引与 SQL 增强（CTE/窗口函数）是升级后的主要差异。
