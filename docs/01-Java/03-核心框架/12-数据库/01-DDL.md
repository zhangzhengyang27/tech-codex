---
title: "DDL"
description: "DDL(Data Definition Language,数据定义语言) 是SQL语言的重要组成部分,用于定义和管理数据库对象的结构。与DML(数据操作语言)不同,DDL不涉及具体数据的增删改查,而是专注于数据库架构的创建、修改和删除。"
keywords: [DDL]
category: "Java"
tags: [Java, 数据库]
---


# DDL 操作

## 概述

**DDL(Data Definition Language,数据定义语言)** 是SQL语言的重要组成部分,用于定义和管理数据库对象的结构。与DML(数据操作语言)不同,DDL不涉及具体数据的增删改查,而是专注于数据库架构的创建、修改和删除。

**DDL的核心作用:**
- 定义数据库的逻辑结构和物理结构
- 创建、修改、删除数据库对象(数据库、表、索引、视图等)
- 定义数据完整性约束
- 管理数据库对象的元数据

**DDL的主要语句:**

| 语句 | 作用 | 说明 |
|------|------|------|
| `CREATE` | 创建对象 | 创建数据库、表、索引、视图等 |
| `ALTER` | 修改对象 | 修改表结构、添加/删除列、修改约束等 |
| `DROP` | 删除对象 | 删除数据库、表、索引等,结构和数据都删除 |
| `TRUNCATE` | 清空表数据 | 删除表中所有数据,但保留表结构 |
| `RENAME` | 重命名对象 | 重命名表(MySQL部分支持) |

**DDL vs DML vs DCL:**

- **DDL(数据定义语言)**: CREATE, ALTER, DROP, TRUNCATE - 定义结构
- **DML(数据操作语言)**: SELECT, INSERT, UPDATE, DELETE - 操作数据
- **DCL(数据控制语言)**: GRANT, REVOKE - 控制权限

## 数据库级别的 DDL 操作

### 创建数据库

**语法:**

```sql
CREATE DATABASE [IF NOT EXISTS] 数据库名
[CHARACTER SET 字符集]
[COLLATE 排序规则];
```

**参数说明:**
- `IF NOT EXISTS`: 可选,如果数据库不存在时才创建,避免报错
- `CHARACTER SET`: 指定数据库的字符集,推荐使用 `utf8mb4`(支持emoji等4字节字符)
- `COLLATE`: 指定数据库的排序规则,常用 `utf8mb4_unicode_ci` 或 `utf8mb4_general_ci`

**示例:**

```sql
-- 基本创建
CREATE DATABASE testdb;

-- 完整创建(推荐)
CREATE DATABASE IF NOT EXISTS testdb 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 查看创建语句
SHOW CREATE DATABASE testdb;
```

**字符集和排序规则的选择:**

| 字符集 | 排序规则 | 说明 |
|--------|----------|------|
| `utf8mb4` | `utf8mb4_unicode_ci` | 推荐使用,支持所有Unicode字符(包括emoji),排序规则更符合国际化标准 |
| `utf8mb4` | `utf8mb4_general_ci` | 性能稍快,但排序准确性略低 |
| `utf8` | `utf8_general_ci` | MySQL的"utf8"实际上是"utf8mb3",不支持4字节字符,不推荐 |

> **注意:** 强烈推荐使用 `utf8mb4` 而不是 `utf8`,因为MySQL的 `utf8` 编码最多只支持3字节字符,无法存储emoji表情等4字节字符。

### 查看数据库

```sql
-- 查看所有数据库
SHOW DATABASES;

-- 查看匹配模式的数据库
SHOW DATABASES LIKE 'test%';

-- 查看当前使用的数据库
SELECT DATABASE();
```

### 使用数据库

```sql
USE 数据库名;

-- 示例
USE testdb;
```

### 修改数据库

```sql
ALTER DATABASE 数据库名
[CHARACTER SET 字符集]
[COLLATE 排序规则];

-- 示例:修改字符集和排序规则
ALTER DATABASE testdb 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

> **注意:** 修改数据库字符集不会自动转换已有表的字符集,需要单独修改表或列。

### 删除数据库

```sql
DROP DATABASE [IF EXISTS] 数据库名;

-- 示例
DROP DATABASE IF EXISTS testdb;
```

> **警告:** 删除数据库会删除该数据库下的所有表和数据,操作不可逆,生产环境务必谨慎!

## 数据类型详解

数据类型是DDL中最重要的概念之一,选择合适的数据类型对性能、存储空间和数据完整性都有重大影响。

### 数值类型

#### 整数类型

| 类型 | 字节 | 有符号范围 | 无符号范围 | 说明 |
|------|------|-----------|-----------|------|
| `TINYINT` | 1 | -128 ~ 127 | 0 ~ 255 | 小整数 |
| `SMALLINT` | 2 | -32768 ~ 32767 | 0 ~ 65535 | 中小整数 |
| `MEDIUMINT` | 3 | -8388608 ~ 8388607 | 0 ~ 16777215 | 中等整数 |
| `INT` | 4 | -2147483648 ~ 2147483647 | 0 ~ 4294967295 | 常用整数 |
| `BIGINT` | 8 | -9223372036854775808 ~ 9223372036854775807 | 0 ~ 18446744073709551615 | 大整数 |

**示例:**

```sql
CREATE TABLE example_numbers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    age TINYINT UNSIGNED COMMENT '年龄(0-255)',
    user_id BIGINT UNSIGNED COMMENT '用户ID',
    score SMALLINT COMMENT '分数(-32768~32767)',
    status TINYINT DEFAULT 0 COMMENT '状态: 0-禁用, 1-启用'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**最佳实践:**
1. 根据实际数据范围选择合适的类型,避免过度使用BIGINT
2. 对于非负数,使用 `UNSIGNED` 可以扩大正数范围
3. 主键ID推荐使用 `INT UNSIGNED` 或 `BIGINT UNSIGNED`
4. 显示宽度(如 `INT(11)`)不影响存储范围,已不推荐使用

#### 小数类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `FLOAT` | 单精度浮点数,4字节,精度约7位 | `FLOAT` 或 `FLOAT(10,2)` |
| `DOUBLE` | 双精度浮点数,8字节,精度约15位 | `DOUBLE` 或 `DOUBLE(10,2)` |
| `DECIMAL(M,D)` | 定点数,精确计算,M总位数,D小数位数 | `DECIMAL(10,2)` |

**示例:**

```sql
CREATE TABLE example_decimal (
    id INT PRIMARY KEY,
    price DECIMAL(10,2) COMMENT '价格(最大99999999.99)',
    weight FLOAT COMMENT '重量(近似值)',
    rate DOUBLE COMMENT '比率(高精度)',
    amount DECIMAL(20,4) COMMENT '金额(精确计算)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**使用建议:**
- **金额必须使用DECIMAL**,避免精度丢失
- 科学计算可以使用FLOAT或DOUBLE
- DECIMAL(M,D)中,M最大65,D最大30
- DECIMAL按每9位十进制数字占4字节存储,整数部分与小数部分分别计算,不足9位的余数按位数占1~4字节(如DECIMAL(10,2)整数部分8位占4字节,小数部分2位占1字节,共5字节)

#### BIT类型

```sql
-- BIT类型用于存储位字段
CREATE TABLE example_bit (
    id INT PRIMARY KEY,
    flags BIT(8) COMMENT '8位标志位',
    gender BIT(1) COMMENT '性别: 0-女, 1-男'
);

-- 插入数据
INSERT INTO example_bit VALUES (1, b'00000111', b'1');

-- 查询(默认显示为二进制)
SELECT id, flags, flags+0 AS flags_value FROM example_bit;
```

### 字符串类型

#### 常用字符串类型

| 类型 | 说明 | 最大长度 | 使用场景 |
|------|------|----------|----------|
| `CHAR(N)` | 定长字符串 | 255字符 | 手机号、身份证号、状态码等固定长度 |
| `VARCHAR(N)` | 变长字符串 | 65535字节 | 用户名、邮箱、地址等可变长度 |
| `TEXT` | 长文本 | 65535字节 | 文章内容、描述等 |
| `MEDIUMTEXT` | 中等长度文本 | 16MB | 长文章、JSON数据 |
| `LONGTEXT` | 长文本 | 4GB | 大文档、日志 |
| `ENUM` | 枚举类型 | 最多65535个值 | 状态、类型等有限选项 |
| `SET` | 集合类型 | 最多64个成员 | 标签、权限等 |

**示例:**

```sql
CREATE TABLE example_string (
    id INT PRIMARY KEY,
    phone CHAR(11) COMMENT '手机号(固定11位)',
    id_card CHAR(18) COMMENT '身份证号(固定18位)',
    username VARCHAR(50) COMMENT '用户名(最多50字符)',
    email VARCHAR(100) COMMENT '邮箱(最多100字符)',
    intro TEXT COMMENT '个人简介',
    content MEDIUMTEXT COMMENT '文章内容',
    status ENUM('active', 'inactive', 'deleted') DEFAULT 'active' COMMENT '状态',
    tags SET('tech', 'life', 'travel') COMMENT '标签'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**VARCHAR vs CHAR:**

```sql
-- CHAR定长,不足补空格
phone CHAR(11)  -- 存储'13800138000',占用11字节

-- VARCHAR变长,按实际长度存储
username VARCHAR(50) -- 存储'tom',占用4字节(3字符+1长度字节)

-- 性能对比:
-- CHAR: 访问快,但可能浪费空间
-- VARCHAR: 节省空间,但访问稍慢(需计算长度)
```

**VARCHAR长度选择建议:**
1. UTF8MB4编码下,每个字符最多4字节
2. VARCHAR最大65535字节,UTF8MB4下约16383字符
3. 一行记录总长度不能超过65535字节
4. 设置合理的N值,过大会影响排序缓冲区

#### ENUM和SET

```sql
-- ENUM: 单选
CREATE TABLE users (
    id INT PRIMARY KEY,
    gender ENUM('male', 'female', 'other') COMMENT '性别',
    level ENUM('vip', 'svip', 'admin') DEFAULT 'vip' COMMENT '会员等级'
);

-- 插入ENUM
INSERT INTO users VALUES (1, 'male', 'vip');

-- SET: 多选
CREATE TABLE articles (
    id INT PRIMARY KEY,
    tags SET('tech', 'java', 'database', 'web') COMMENT '标签'
);

-- 插入SET
INSERT INTO articles VALUES (1, 'tech,java,database');

-- 查询SET
SELECT * FROM articles WHERE FIND_IN_SET('java', tags) > 0;
```

> **注意:** ENUM和SET在MySQL中存储为整数,查询效率高,但修改枚举值需要ALTER TABLE,不适合频繁变化的选项。

### 日期时间类型

| 类型 | 格式 | 范围 | 说明 |
|------|------|------|------|
| `DATE` | YYYY-MM-DD | 1000-01-01 ~ 9999-12-31 | 日期 |
| `TIME` | HH:MM:SS | -838:59:59 ~ 838:59:59 | 时间 |
| `DATETIME` | YYYY-MM-DD HH:MM:SS | 1000-01-01 00:00:00 ~ 9999-12-31 23:59:59 | 日期时间 |
| `TIMESTAMP` | YYYY-MM-DD HH:MM:SS | 1970-01-01 00:00:01 ~ 2038-01-19 03:14:07 | 时间戳(自动转换时区) |
| `YEAR` | YYYY | 1901 ~ 2155 | 年份 |

**示例:**

```sql
CREATE TABLE example_datetime (
    id INT PRIMARY KEY,
    birth_date DATE COMMENT '出生日期',
    work_time TIME COMMENT '工作时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间(自动更新)',
    publish_year YEAR COMMENT '发布年份'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**DATETIME vs TIMESTAMP:**

| 对比项 | DATETIME | TIMESTAMP |
|--------|----------|-----------|
| 存储空间 | 5字节(不含小数秒,MySQL 5.6.4 起;旧资料常写8字节) | 4字节 |
| 时间范围 | 1000~9999年 | 1970~2038年 |
| 时区处理 | 不转换 | 自动转换为当前时区 |
| 默认值 | 可设置为CURRENT_TIMESTAMP | 可设置为CURRENT_TIMESTAMP |
| 自动更新 | 支持ON UPDATE CURRENT_TIMESTAMP(5.6.5+) | 支持ON UPDATE CURRENT_TIMESTAMP |

**使用建议:**
1. 跨时区应用使用TIMESTAMP
2. 需要存储2038年以后的时间使用DATETIME
3. 创建时间和更新时间推荐使用TIMESTAMP
4. 生日等历史日期使用DATE

### 二进制类型

| 类型 | 最大长度 | 说明 |
|------|----------|------|
| `BINARY(N)` | 255字节 | 定长二进制 |
| `VARBINARY(N)` | 65535字节 | 变长二进制 |
| `BLOB` | 64KB | 小二进制对象 |
| `MEDIUMBLOB` | 16MB | 中等二进制对象 |
| `LONGBLOB` | 4GB | 大二进制对象 |

```sql
CREATE TABLE example_binary (
    id INT PRIMARY KEY,
    avatar BLOB COMMENT '头像图片',
    file_data MEDIUMBLOB COMMENT '文件数据'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

> **注意:** 不推荐在数据库中存储大文件,建议存储文件路径或使用对象存储(OSS)。

### JSON类型

MySQL 5.7.8+支持JSON类型,提供原生JSON存储和查询能力。

```sql
CREATE TABLE example_json (
    id INT PRIMARY KEY,
    user_info JSON COMMENT '用户信息JSON',
    preferences JSON COMMENT '用户偏好设置'
);

-- 插入JSON数据
INSERT INTO example_json VALUES (
    1, 
    '{"name": "张三", "age": 25, "skills": ["Java", "MySQL"]}',
    '{"theme": "dark", "language": "zh-CN"}'
);

-- 查询JSON字段
SELECT 
    id,
    user_info->>'$.name' AS name,
    user_info->>'$.age' AS age,
    preferences->>'$.theme' AS theme
FROM example_json;

-- JSON函数示例
SELECT 
    JSON_EXTRACT(user_info, '$.name') AS name,
    JSON_UNQUOTE(JSON_EXTRACT(user_info, '$.name')) AS name_unquoted,
    user_info->'$.skills[0]' AS first_skill
FROM example_json;

-- 更新JSON字段
UPDATE example_json 
SET user_info = JSON_SET(user_info, '$.age', 26)
WHERE id = 1;
```

**JSON类型优势:**
1. 自动验证JSON格式
2. 优化存储格式,比TEXT存储JSON效率高
3. 支持丰富的JSON函数查询和修改
4. 可创建虚拟列和索引

## 约束详解

约束是保证数据完整性和一致性的重要机制。

### 主键约束(PRIMARY KEY)

**作用:** 唯一标识表中的每一行记录,不能为NULL,一个表只能有一个主键。

```sql
-- 创建表时定义主键
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL
);

-- 或使用表级约束
CREATE TABLE users (
    user_id INT AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    PRIMARY KEY (user_id)
);

-- 复合主键(不推荐,建议使用单列主键+唯一索引)
CREATE TABLE user_roles (
    user_id INT,
    role_id INT,
    PRIMARY KEY (user_id, role_id)
);
```

**主键设计原则:**
1. 推荐使用单列主键,避免复合主键
2. 推荐使用自增整数或雪花算法等趋势递增的分布式ID(随机UUID作主键会降低索引写入效率)
3. 主键值不应该修改
4. 主键列不应该包含业务含义(避免业务变化导致主键变化)

### 外键约束(FOREIGN KEY)

**作用:** 保证表之间的引用完整性,确保子表的值在父表中存在。

```sql
CREATE TABLE departments (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_name VARCHAR(50) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE employees (
    emp_id INT AUTO_INCREMENT PRIMARY KEY,
    emp_name VARCHAR(50) NOT NULL,
    dept_id INT,
    -- 外键约束
    CONSTRAINT fk_dept 
        FOREIGN KEY (dept_id) 
        REFERENCES departments(dept_id)
        ON DELETE CASCADE        -- 父表删除时级联删除
        ON UPDATE CASCADE        -- 父表更新时级联更新
) ENGINE=InnoDB;
```

**外键级联操作:**

| 选项 | 说明 |
|------|------|
| `CASCADE` | 父表删除/更新时,子表自动删除/更新 |
| `SET NULL` | 父表删除/更新时,子表外键列设为NULL |
| `RESTRICT` | 拒绝父表的删除/更新操作(默认) |
| `NO ACTION` | 同RESTRICT |

**外键使用建议:**
1. 外键会影响性能,高并发场景需谨慎使用
2. 大型互联网应用通常在应用层实现约束,不使用外键
3. 使用外键时,务必创建索引(MySQL会自动创建)
4. 生产环境删除外键前需确认数据完整性

### 唯一约束(UNIQUE)

**作用:** 确保列中的值唯一,但允许NULL(可以有多个NULL)。

```sql
-- 列级唯一约束
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(100) UNIQUE
);

-- 表级唯一约束(可命名)
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    CONSTRAINT uk_username UNIQUE (username),
    CONSTRAINT uk_email UNIQUE (email)
);

-- 复合唯一约束
CREATE TABLE user_roles (
    user_id INT,
    role_id INT,
    UNIQUE KEY uk_user_role (user_id, role_id)
);
```

### 非空约束(NOT NULL)

**作用:** 确保列不能为NULL。

```sql
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20)  -- 允许NULL
);
```

**最佳实践:**
1. 尽可能使用NOT NULL,NULL值会影响索引效率
2. 对于必须有的字段(如用户名、邮箱),设置为NOT NULL
3. 对于可选字段,可以使用DEFAULT提供默认值代替NULL

### 检查约束(CHECK)

MySQL 8.0.16+支持CHECK约束。

```sql
CREATE TABLE products (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INT DEFAULT 0,
    -- 检查约束
    CONSTRAINT chk_price CHECK (price > 0),
    CONSTRAINT chk_stock CHECK (stock >= 0)
);

-- 插入数据时会检查约束
INSERT INTO products VALUES (1, 'iPhone', -100, 10);  -- 错误:price必须大于0
```

### 默认值约束(DEFAULT)

```sql
CREATE TABLE users (
    user_id INT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    status TINYINT DEFAULT 1 COMMENT '1-正常,0-禁用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 约束总结

| 约束 | 作用 | 允许NULL | 数量限制 |
|------|------|----------|----------|
| PRIMARY KEY | 唯一标识 | 否 | 一个表一个 |
| FOREIGN KEY | 引用完整性 | 是 | 多个 |
| UNIQUE | 唯一性 | 是(多个NULL) | 多个 |
| NOT NULL | 非空 | 否 | 多个 |
| CHECK | 条件检查 | - | 多个 |
| DEFAULT | 默认值 | - | 多个 |

## 表级别的 DDL 操作

### 创建表

**完整语法:**

```sql
CREATE TABLE [IF NOT EXISTS] 表名 (
    列定义1 [列约束],
    列定义2 [列约束],
    ...
    [表约束]
) ENGINE=存储引擎 
  DEFAULT CHARSET=字符集 
  COLLATE=排序规则
  COMMENT='表注释';
```

**列定义:**

```sql
列名 数据类型 
    [NOT NULL | NULL] 
    [DEFAULT 默认值] 
    [AUTO_INCREMENT] 
    [UNIQUE | PRIMARY KEY] 
    [COMMENT '列注释']
```

**完整建表示例:**

```sql
CREATE TABLE IF NOT EXISTS users (
    -- 主键
    user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID',
    
    -- 基本信息
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    email VARCHAR(100) NOT NULL COMMENT '邮箱',
    phone CHAR(11) COMMENT '手机号',
    
    -- 个人信息
    nickname VARCHAR(50) COMMENT '昵称',
    avatar VARCHAR(255) DEFAULT '/default/avatar.png' COMMENT '头像URL',
    gender ENUM('male', 'female', 'other') DEFAULT 'other' COMMENT '性别',
    birthday DATE COMMENT '生日',
    
    -- 状态信息
    status TINYINT UNSIGNED DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常, 2-冻结',
    level TINYINT UNSIGNED DEFAULT 1 COMMENT '会员等级: 1-普通, 2-VIP, 3-SVIP',
    
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    
    -- 唯一约束
    UNIQUE KEY uk_username (username),
    UNIQUE KEY uk_email (email),
    UNIQUE KEY uk_phone (phone)
    
) ENGINE=InnoDB 
  DEFAULT CHARSET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci
  COMMENT='用户表';
```

### 查看表结构

```sql
-- 查看当前数据库的所有表
SHOW TABLES;

-- 查看匹配的表
SHOW TABLES LIKE 'user%';

-- 查看表结构(简洁)
DESC users;
-- 或
DESCRIBE users;

-- 查看表创建语句(完整)
SHOW CREATE TABLE users\G

-- 查看表详细信息
SHOW TABLE STATUS LIKE 'users'\G

-- 查看列详细信息
SHOW FULL COLUMNS FROM users;
```

### 修改表(ALTER TABLE)

**ALTER TABLE支持的操作:**

| 操作 | 语法 |
|------|------|
| 添加列 | `ADD COLUMN 列定义 [AFTER 列名 | FIRST]` |
| 删除列 | `DROP COLUMN 列名` |
| 修改列 | `MODIFY COLUMN 列定义` 或 `CHANGE COLUMN 旧列名 新列名 列定义` |
| 添加索引 | `ADD INDEX 索引名(列名)` |
| 删除索引 | `DROP INDEX 索引名` |
| 添加主键 | `ADD PRIMARY KEY(列名)` |
| 删除主键 | `DROP PRIMARY KEY` |
| 添加外键 | `ADD FOREIGN KEY(列名) REFERENCES 父表(列名)` |
| 删除外键 | `DROP FOREIGN KEY 外键名` |
| 修改引擎 | `ENGINE=存储引擎` |
| 修改字符集 | `CONVERT TO CHARACTER SET 字符集` |
| 重命名表 | `RENAME TO 新表名` |

#### 添加列

```sql
-- 添加单列
ALTER TABLE users ADD COLUMN age TINYINT UNSIGNED COMMENT '年龄';

-- 指定位置
ALTER TABLE users ADD COLUMN age TINYINT UNSIGNED AFTER username COMMENT '年龄';
ALTER TABLE users ADD COLUMN id_card CHAR(18) FIRST COMMENT '身份证号';

-- 添加多列
ALTER TABLE users 
    ADD COLUMN age TINYINT UNSIGNED COMMENT '年龄',
    ADD COLUMN address VARCHAR(200) COMMENT '地址';
```

#### 删除列

```sql
ALTER TABLE users DROP COLUMN age;

-- 删除多列
ALTER TABLE users 
    DROP COLUMN age,
    DROP COLUMN address;
```

> **警告:** 删除列会删除该列的所有数据,操作不可逆!

#### 修改列

**MODIFY vs CHANGE:**

```sql
-- MODIFY: 只修改列定义,不改变列名
ALTER TABLE users MODIFY COLUMN email VARCHAR(150) NOT NULL COMMENT '邮箱地址';

-- CHANGE: 可以修改列名和列定义
ALTER TABLE users CHANGE COLUMN email user_email VARCHAR(150) NOT NULL COMMENT '邮箱地址';

-- 修改列的位置
ALTER TABLE users MODIFY COLUMN age TINYINT AFTER username;
```

**修改列的注意事项:**
1. 修改数据类型可能导致数据丢失(如VARCHAR(100)改为VARCHAR(50))
2. 添加NOT NULL约束时,需确保现有数据没有NULL
3. 大表修改列可能锁表较长时间,建议使用pt-online-schema-change等工具

#### 添加和删除约束

```sql
-- 添加主键
ALTER TABLE users ADD PRIMARY KEY (user_id);

-- 删除主键
ALTER TABLE users DROP PRIMARY KEY;

-- 添加唯一约束
ALTER TABLE users ADD UNIQUE KEY uk_email (email);

-- 删除唯一约束
ALTER TABLE users DROP INDEX uk_email;

-- 添加外键
ALTER TABLE orders 
ADD CONSTRAINT fk_user 
FOREIGN KEY (user_id) REFERENCES users(user_id) 
ON DELETE CASCADE;

-- 删除外键
ALTER TABLE orders DROP FOREIGN KEY fk_user;
```

#### 修改表属性

```sql
-- 修改存储引擎
ALTER TABLE users ENGINE=InnoDB;

-- 修改字符集
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 修改表注释
ALTER TABLE users COMMENT='用户信息表';

-- 重命名表
ALTER TABLE users RENAME TO sys_users;
-- 或
RENAME TABLE users TO sys_users;
```

### 删除表

```sql
-- 删除表
DROP TABLE users;

-- 如果存在才删除
DROP TABLE IF EXISTS users;

-- 删除多个表
DROP TABLE table1, table2, table3;
```

> **警告:** DROP TABLE会删除表结构和所有数据,操作不可逆!

### 清空表(TRUNCATE)

```sql
TRUNCATE TABLE users;
```

**TRUNCATE vs DELETE:**

| 对比项 | TRUNCATE | DELETE |
|--------|----------|--------|
| 类型 | DDL | DML |
| 速度 | 快(不记录每行删除) | 慢(逐行删除) |
| 回滚 | 不支持 | 支持(事务中) |
| WHERE | 不支持 | 支持 |
| 自增ID | 重置 | 不重置 |
| 触发器 | 不触发 | 触发 |
| 外键约束 | 不能清空有外键引用的表 | 可以(受约束限制) |

**使用场景:**
- **TRUNCATE**: 清空全表数据,重置自增ID
- **DELETE**: 删除部分数据,需要事务或触发器

## 索引详解

索引是提高查询性能的重要手段,但不当的索引会影响写入性能。

### 索引类型

| 索引类型 | 说明 | 使用场景 |
|----------|------|----------|
| 普通索引 | 最基本的索引,无限制 | 加速查询 |
| 唯一索引 | 列值必须唯一 | 保证数据唯一性 |
| 主键索引 | 特殊的唯一索引,不能为NULL | 主键 |
| 复合索引 | 多列组合索引 | 多条件查询 |
| 全文索引 | 用于全文搜索 | 文本搜索(MySQL 5.6+) |
| 空间索引 | 用于地理数据 | GIS应用 |

### 创建索引

**创建表时定义索引:**

```sql
CREATE TABLE articles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    author_id INT NOT NULL,
    publish_time DATETIME,
    
    -- 普通索引
    INDEX idx_author (author_id),
    -- 复合索引
    INDEX idx_author_time (author_id, publish_time),
    -- 唯一索引
    UNIQUE KEY uk_title (title),
    -- 全文索引
    FULLTEXT INDEX ft_content (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**使用CREATE INDEX:**

```sql
-- 创建普通索引
CREATE INDEX idx_author ON articles(author_id);

-- 创建复合索引
CREATE INDEX idx_author_time ON articles(author_id, publish_time);

-- 创建唯一索引
CREATE UNIQUE INDEX uk_title ON articles(title);

-- 创建全文索引
CREATE FULLTEXT INDEX ft_content ON articles(content);
```

**使用ALTER TABLE添加索引:**

```sql
-- 添加普通索引
ALTER TABLE articles ADD INDEX idx_author (author_id);

-- 添加复合索引
ALTER TABLE articles ADD INDEX idx_author_time (author_id, publish_time);

-- 添加唯一索引
ALTER TABLE articles ADD UNIQUE KEY uk_title (title);

-- 添加全文索引
ALTER TABLE articles ADD FULLTEXT INDEX ft_content (content);
```

### 查看索引

```sql
-- 查看表的索引
SHOW INDEX FROM articles;

-- 查看索引信息
SHOW INDEX FROM articles\G

-- 查看表状态
SHOW TABLE STATUS LIKE 'articles'\G
```

### 删除索引

```sql
-- 使用DROP INDEX
DROP INDEX idx_author ON articles;

-- 使用ALTER TABLE
ALTER TABLE articles DROP INDEX idx_author;

-- 删除主键
ALTER TABLE articles DROP PRIMARY KEY;
```

### 索引设计原则

**索引的最佳实践:**

1. **为WHERE、JOIN、ORDER BY、GROUP BY的列创建索引**

```sql
-- 经常查询的列
SELECT * FROM users WHERE username = 'tom';
CREATE INDEX idx_username ON users(username);

-- 经常排序的列
SELECT * FROM articles ORDER BY publish_time DESC;
CREATE INDEX idx_publish_time ON articles(publish_time);
```

2. **使用复合索引遵循最左前缀原则**

```sql
-- 复合索引
CREATE INDEX idx_name_age_city ON users(name, age, city);

-- 可以使用索引的查询
WHERE name = 'tom'
WHERE name = 'tom' AND age = 25
WHERE name = 'tom' AND age = 25 AND city = '北京'

-- 无法使用索引的查询
WHERE age = 25
WHERE city = '北京'
WHERE name = 'tom' AND city = '北京'  -- 跳过了age,只能用到name部分
```

3. **避免在低选择性列创建索引**

```sql
-- 性别列只有2个值,选择性低,不适合单独建索引
SELECT * FROM users WHERE gender = 'male';  -- 全表扫描更快

-- 如果经常按性别和年龄查询,可以建复合索引
CREATE INDEX idx_gender_age ON users(gender, age);
```

4. **避免在区分度低的列创建索引**

```sql
-- 区分度计算
SELECT COUNT(DISTINCT column_name) / COUNT(*) FROM table_name;

-- 区分度接近1适合建索引,接近0不适合
```

5. **索引列尽量设置为NOT NULL**

```sql
-- NULL值会影响索引效率
-- 推荐设置默认值代替NULL
ALTER TABLE users MODIFY COLUMN nickname VARCHAR(50) NOT NULL DEFAULT '';
```

6. **避免过度索引**

```sql
-- 索引过多会影响INSERT、UPDATE、DELETE性能
-- 建议单表索引数量不超过5个
```

7. **使用前缀索引节省空间**

```sql
-- 对长字符串列,使用前缀索引
CREATE INDEX idx_email ON users(email(20));

-- 确定前缀长度
SELECT 
    COUNT(DISTINCT LEFT(email, 10)) / COUNT(*) AS prefix_10,
    COUNT(DISTINCT LEFT(email, 15)) / COUNT(*) AS prefix_15,
    COUNT(DISTINCT LEFT(email, 20)) / COUNT(*) AS prefix_20
FROM users;
-- 选择区分度接近1的最小长度
```

8. **使用覆盖索引减少回表**

```sql
-- 覆盖索引:查询的列都在索引中,无需回表
CREATE INDEX idx_username_email ON users(username, email);

-- 使用覆盖索引
SELECT username, email FROM users WHERE username = 'tom';  -- 无需回表

-- 使用EXPLAIN查看
EXPLAIN SELECT username, email FROM users WHERE username = 'tom';
-- Extra列显示: Using index
```

### 索引失效场景

```sql
-- 1. 在索引列上使用函数
SELECT * FROM users WHERE DATE(created_at) = '2024-01-01';  -- 索引失效
-- 优化:
SELECT * FROM users WHERE created_at >= '2024-01-01' AND created_at < '2024-01-02';

-- 2. 使用OR连接非索引列
SELECT * FROM users WHERE username = 'tom' OR age = 25;  -- 如果age无索引,全部失效
-- 优化: 使用UNION
SELECT * FROM users WHERE username = 'tom'
UNION
SELECT * FROM users WHERE age = 25;

-- 3. LIKE以通配符开头
SELECT * FROM users WHERE username LIKE '%tom%';  -- 索引失效
-- 优化:
SELECT * FROM users WHERE username LIKE 'tom%';  -- 索引有效

-- 4. 隐式类型转换
SELECT * FROM users WHERE phone = 13800138000;  -- phone是VARCHAR,索引失效
-- 优化:
SELECT * FROM users WHERE phone = '13800138000';

-- 5. 使用!=或<>
SELECT * FROM users WHERE status != 0;  -- 索引可能失效(取决于数据分布)

-- 6. 使用NOT IN
SELECT * FROM users WHERE status NOT IN (0, 1);  -- 索引失效

-- 7. 复合索引不满足最左前缀
-- 索引: idx_name_age_city(name, age, city)
SELECT * FROM users WHERE age = 25;  -- 索引失效
```

## 实战案例:完整的数据库设计

### 案例1:电商系统核心表设计

```sql
-- 1. 用户表
CREATE TABLE users (
    user_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID',
    username VARCHAR(50) NOT NULL COMMENT '用户名',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    email VARCHAR(100) NOT NULL COMMENT '邮箱',
    phone CHAR(11) COMMENT '手机号',
    nickname VARCHAR(50) COMMENT '昵称',
    avatar VARCHAR(255) DEFAULT '/default/avatar.png' COMMENT '头像URL',
    gender ENUM('male', 'female', 'other') DEFAULT 'other' COMMENT '性别',
    birthday DATE COMMENT '生日',
    status TINYINT UNSIGNED DEFAULT 1 COMMENT '状态: 0-禁用, 1-正常, 2-冻结',
    level TINYINT UNSIGNED DEFAULT 1 COMMENT '会员等级',
    balance DECIMAL(10,2) UNSIGNED DEFAULT 0.00 COMMENT '账户余额',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    last_login_ip VARCHAR(45) COMMENT '最后登录IP',
    
    UNIQUE KEY uk_username (username),
    UNIQUE KEY uk_email (email),
    UNIQUE KEY uk_phone (phone),
    INDEX idx_created_at (created_at),
    INDEX idx_status_level (status, level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 2. 商品分类表
CREATE TABLE categories (
    category_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '分类ID',
    parent_id INT UNSIGNED DEFAULT 0 COMMENT '父分类ID, 0表示顶级分类',
    category_name VARCHAR(50) NOT NULL COMMENT '分类名称',
    level TINYINT UNSIGNED NOT NULL COMMENT '分类层级: 1-一级, 2-二级, 3-三级',
    sort_order INT UNSIGNED DEFAULT 0 COMMENT '排序序号',
    icon VARCHAR(255) COMMENT '分类图标',
    status TINYINT UNSIGNED DEFAULT 1 COMMENT '状态: 0-禁用, 1-启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_parent_id (parent_id),
    INDEX idx_level_sort (level, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品分类表';

-- 3. 商品表
CREATE TABLE products (
    product_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '商品ID',
    category_id INT UNSIGNED NOT NULL COMMENT '分类ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称',
    subtitle VARCHAR(255) COMMENT '商品副标题',
    main_image VARCHAR(255) COMMENT '主图URL',
    sub_images TEXT COMMENT '子图URL列表(JSON数组)',
    detail TEXT COMMENT '商品详情(HTML)',
    price DECIMAL(10,2) UNSIGNED NOT NULL COMMENT '销售价',
    original_price DECIMAL(10,2) UNSIGNED COMMENT '原价',
    stock INT UNSIGNED DEFAULT 0 COMMENT '库存',
    sales INT UNSIGNED DEFAULT 0 COMMENT '销量',
    status TINYINT UNSIGNED DEFAULT 1 COMMENT '状态: 0-下架, 1-上架, 2-删除',
    weight DECIMAL(10,2) COMMENT '重量(kg)',
    is_hot TINYINT UNSIGNED DEFAULT 0 COMMENT '是否热销: 0-否, 1-是',
    is_new TINYINT UNSIGNED DEFAULT 0 COMMENT '是否新品: 0-否, 1-是',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_category (category_id),
    INDEX idx_price (price),
    INDEX idx_sales (sales),
    INDEX idx_status_hot_new (status, is_hot, is_new),
    FULLTEXT INDEX ft_name (product_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='商品表';

-- 4. 订单表
CREATE TABLE orders (
    order_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '订单ID',
    order_no VARCHAR(64) NOT NULL COMMENT '订单号',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    
    -- 收货信息
    receiver_name VARCHAR(50) NOT NULL COMMENT '收货人姓名',
    receiver_phone CHAR(11) NOT NULL COMMENT '收货人手机号',
    receiver_province VARCHAR(50) NOT NULL COMMENT '省',
    receiver_city VARCHAR(50) NOT NULL COMMENT '市',
    receiver_district VARCHAR(50) NOT NULL COMMENT '区',
    receiver_address VARCHAR(255) NOT NULL COMMENT '详细地址',
    
    -- 金额信息
    total_amount DECIMAL(10,2) UNSIGNED NOT NULL COMMENT '商品总金额',
    freight_amount DECIMAL(10,2) UNSIGNED DEFAULT 0.00 COMMENT '运费',
    discount_amount DECIMAL(10,2) UNSIGNED DEFAULT 0.00 COMMENT '优惠金额',
    pay_amount DECIMAL(10,2) UNSIGNED NOT NULL COMMENT '实付金额',
    
    -- 状态信息
    status TINYINT UNSIGNED DEFAULT 0 COMMENT '状态: 0-待付款, 1-待发货, 2-已发货, 3-已完成, 4-已取消, 5-售后中',
    payment_type TINYINT UNSIGNED COMMENT '支付方式: 1-支付宝, 2-微信, 3-银行卡',
    payment_time TIMESTAMP NULL COMMENT '支付时间',
    delivery_time TIMESTAMP NULL COMMENT '发货时间',
    receive_time TIMESTAMP NULL COMMENT '收货时间',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_order_no (order_no),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单表';

-- 5. 订单商品表
CREATE TABLE order_items (
    item_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '订单商品ID',
    order_id BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
    product_id BIGINT UNSIGNED NOT NULL COMMENT '商品ID',
    product_name VARCHAR(200) NOT NULL COMMENT '商品名称(冗余)',
    main_image VARCHAR(255) COMMENT '商品主图(冗余)',
    price DECIMAL(10,2) UNSIGNED NOT NULL COMMENT '商品单价',
    quantity INT UNSIGNED NOT NULL COMMENT '购买数量',
    total_amount DECIMAL(10,2) UNSIGNED NOT NULL COMMENT '小计金额',
    
    INDEX idx_order_id (order_id),
    INDEX idx_product_id (product_id),
    
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单商品表';

-- 6. 地址表
CREATE TABLE addresses (
    address_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '地址ID',
    user_id BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
    receiver_name VARCHAR(50) NOT NULL COMMENT '收货人姓名',
    receiver_phone CHAR(11) NOT NULL COMMENT '收货人手机号',
    province VARCHAR(50) NOT NULL COMMENT '省',
    city VARCHAR(50) NOT NULL COMMENT '市',
    district VARCHAR(50) NOT NULL COMMENT '区',
    address VARCHAR(255) NOT NULL COMMENT '详细地址',
    is_default TINYINT UNSIGNED DEFAULT 0 COMMENT '是否默认: 0-否, 1-是',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='收货地址表';
```

### 案例2:博客系统核心表设计

```sql
-- 1. 用户表
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nickname VARCHAR(50),
    avatar VARCHAR(255) DEFAULT '/default/avatar.png',
    bio TEXT COMMENT '个人简介',
    website VARCHAR(255) COMMENT '个人网站',
    github VARCHAR(100) COMMENT 'GitHub用户名',
    role ENUM('user', 'author', 'admin') DEFAULT 'user' COMMENT '角色',
    status TINYINT DEFAULT 1 COMMENT '0-禁用, 1-正常',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 2. 文章表
CREATE TABLE articles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL COMMENT '作者ID',
    title VARCHAR(200) NOT NULL COMMENT '标题',
    slug VARCHAR(200) NOT NULL COMMENT 'URL友好标题',
    summary VARCHAR(500) COMMENT '摘要',
    content LONGTEXT COMMENT '文章内容',
    cover_image VARCHAR(255) COMMENT '封面图',
    view_count INT UNSIGNED DEFAULT 0 COMMENT '浏览量',
    like_count INT UNSIGNED DEFAULT 0 COMMENT '点赞数',
    comment_count INT UNSIGNED DEFAULT 0 COMMENT '评论数',
    status ENUM('draft', 'published', 'archived') DEFAULT 'draft' COMMENT '状态',
    is_top TINYINT DEFAULT 0 COMMENT '是否置顶',
    allow_comment TINYINT DEFAULT 1 COMMENT '是否允许评论',
    published_at TIMESTAMP NULL COMMENT '发布时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_slug (slug),
    INDEX idx_user_id (user_id),
    INDEX idx_status_published (status, published_at),
    INDEX idx_view_count (view_count),
    INDEX idx_like_count (like_count),
    FULLTEXT INDEX ft_title_content (title, content),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章表';

-- 3. 分类表
CREATE TABLE categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    parent_id INT UNSIGNED DEFAULT 0,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分类表';

-- 4. 标签表
CREATE TABLE tags (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    article_count INT UNSIGNED DEFAULT 0 COMMENT '文章数量',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='标签表';

-- 5. 文章分类关联表
CREATE TABLE article_category (
    article_id BIGINT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (article_id, category_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章分类关联表';

-- 6. 文章标签关联表
CREATE TABLE article_tag (
    article_id BIGINT UNSIGNED NOT NULL,
    tag_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (article_id, tag_id),
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章标签关联表';

-- 7. 评论表
CREATE TABLE comments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    article_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    parent_id BIGINT UNSIGNED DEFAULT 0 COMMENT '父评论ID, 0表示顶级评论',
    reply_to_user_id BIGINT UNSIGNED COMMENT '回复用户ID',
    content TEXT NOT NULL,
    like_count INT UNSIGNED DEFAULT 0,
    status TINYINT DEFAULT 1 COMMENT '0-待审核, 1-已审核, 2-已删除',
    ip VARCHAR(45) COMMENT '评论IP',
    user_agent VARCHAR(255) COMMENT '浏览器信息',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_article_id (article_id),
    INDEX idx_user_id (user_id),
    INDEX idx_parent_id (parent_id),
    
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论表';
```

## 分库分表的 DDL 考虑

### 分库分表策略

**垂直分表:**

```sql
-- 原用户表(字段过多)
CREATE TABLE users (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(50),
    password_hash VARCHAR(255),
    email VARCHAR(100),
    phone CHAR(11),
    nickname VARCHAR(50),
    avatar VARCHAR(255),
    gender ENUM('male', 'female'),
    birthday DATE,
    bio TEXT,
    interests JSON,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- 垂直拆分后

-- 用户基础信息表(频繁访问)
CREATE TABLE users_base (
    user_id BIGINT PRIMARY KEY,
    username VARCHAR(50),
    password_hash VARCHAR(255),
    email VARCHAR(100),
    phone CHAR(11),
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户详细信息表(较少访问)
CREATE TABLE users_profile (
    user_id BIGINT PRIMARY KEY,
    nickname VARCHAR(50),
    avatar VARCHAR(255),
    gender ENUM('male', 'female'),
    birthday DATE,
    bio TEXT,
    interests JSON,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users_base(user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**水平分表(按时间):**

```sql
-- 订单表按月分表
CREATE TABLE orders_202401 (
    order_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(64) NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TINYINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uk_order_no (order_no),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders_202402 (
    -- 结构相同
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**水平分表(按ID取模):**

```sql
-- 订单表按user_id分4张表
CREATE TABLE orders_0 (
    order_id BIGINT UNSIGNED PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    -- ...
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE orders_1 (
    -- ...
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 应用层路由: table_name = 'orders_' + (user_id % 4)
```

### 分库分表DDL注意事项

1. **全局唯一ID设计**

```sql
-- 使用雪花算法生成全局唯一ID
-- 或使用数据库序列
CREATE TABLE sequence (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    stub CHAR(1) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- 获取ID
REPLACE INTO sequence (stub) VALUES ('a');
SELECT LAST_INSERT_ID();
```

2. **避免跨库JOIN**

```sql
-- 不推荐:跨库JOIN
SELECT o.*, u.username 
FROM db1.orders o 
JOIN db2.users u ON o.user_id = u.id;

-- 推荐:应用层组装
-- 1. 查询订单
-- 2. 提取user_id列表
-- 3. 批量查询用户
-- 4. 应用层合并数据
```

3. **冗余字段设计**

```sql
-- 订单表冗余用户信息
CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    username VARCHAR(50) NOT NULL,  -- 冗余字段
    user_phone CHAR(11),            -- 冗余字段
    -- ...
);

-- 优点:避免跨库查询
-- 缺点:数据一致性问题,需应用层同步
```

4. **避免外键约束**

```sql
-- 分库分表场景不使用外键
CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,  -- 无外键约束
    -- ...
);
```

## 表设计最佳实践

### 命名规范

```sql
-- 表名:小写,下划线分隔,复数形式
users, orders, order_items, product_categories

-- 列名:小写,下划线分隔
user_id, created_at, is_deleted

-- 主键:id 或 表名单数_id
id, user_id, order_id

-- 外键:关联表名_id
user_id, product_id, category_id

-- 布尔列:is_xxx, has_xxx
is_deleted, is_active, has_paid

-- 时间列:xxx_at
created_at, updated_at, deleted_at, paid_at

-- 索引:idx_列名, uk_列名(唯一索引), fk_表名(外键)
idx_user_id, uk_email, fk_order

-- 约束:chk_列名, fk_表名
chk_age, fk_user
```

### 主键设计

```sql
-- 单机应用:自增ID
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    -- ...
);

-- 分布式应用:雪花算法ID或UUID
CREATE TABLE users (
    id BIGINT UNSIGNED PRIMARY KEY COMMENT '雪花算法ID',
    -- ...
);

-- 或使用UUID(不推荐,索引效率低)
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY COMMENT 'UUID',
    -- ...
);
```

### 字段设计

```sql
CREATE TABLE example_design (
    -- 1. 主键
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    
    -- 2. 外键(尽量使用BIGINT UNSIGNED)
    user_id BIGINT UNSIGNED NOT NULL,
    
    -- 3. 业务字段
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    
    -- 4. 状态字段(使用TINYINT + COMMENT,避免直接使用ENUM)
    status TINYINT UNSIGNED DEFAULT 1 COMMENT '1-正常, 0-禁用, 2-冻结',
    
    -- 5. 金额字段(必须使用DECIMAL)
    amount DECIMAL(10,2) UNSIGNED DEFAULT 0.00,
    
    -- 6. 标志位(BOOLEAN只是TINYINT(1)的别名)
    is_deleted TINYINT(1) UNSIGNED DEFAULT 0,
    
    -- 7. 时间戳(必须包含created_at和updated_at)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- 8. 软删除时间(可选)
    deleted_at TIMESTAMP NULL,
    
    -- 索引
    INDEX idx_user_id (user_id),
    UNIQUE KEY uk_username (username),
    UNIQUE KEY uk_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='示例表';
```

### 性能优化建议

1. **选择合适的存储引擎**

| 引擎 | 特点 | 使用场景 |
|------|------|----------|
| InnoDB | 支持事务、行锁、外键 | 绝大多数业务场景 |
| MyISAM | 不支持事务、表锁 | 只读或读多写少、全文索引(MySQL 5.6前) |
| Memory | 内存存储 | 临时表、缓存 |

2. **避免过度范式化**

```sql
-- 完全范式化(需要JOIN,性能差)
SELECT o.*, u.username, c.category_name
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN categories c ON o.category_id = c.id;

-- 适度反范式化(冗余字段,减少JOIN)
CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    username VARCHAR(50) NOT NULL,  -- 冗余
    category_id INT NOT NULL,
    category_name VARCHAR(50),      -- 冗余
    -- ...
);
```

3. **大表DDL优化**

```sql
-- 大表修改列可能锁表数小时
-- 使用pt-online-schema-change等工具在线修改

-- 或使用gh-ost工具
gh-ost --user=root --password=xxx --host=localhost \
       --database=testdb --table=users \
       --alter="ADD COLUMN age TINYINT" \
       --execute
```

## 常见误区与性能陷阱

### 误区1:过度使用VARCHAR(255)

```sql
-- 错误:所有字符串都设为VARCHAR(255)
CREATE TABLE users (
    username VARCHAR(255),  -- 过长
    email VARCHAR(255),     -- 过长
    phone VARCHAR(255)      -- 应该是CHAR(11)
);

-- 正确:根据实际需求设置长度
CREATE TABLE users (
    username VARCHAR(50),   -- 用户名通常不超过50字符
    email VARCHAR(100),     -- 邮箱通常不超过100字符
    phone CHAR(11)          -- 手机号固定11位
);
```

**问题:** VARCHAR(N)的N值过大,虽然不影响存储空间,但会影响:
- 内存排序缓冲区大小
- 临时表大小
- 索引大小

### 误区2:滥用NULL

```sql
-- 错误:大量NULL
CREATE TABLE users (
    username VARCHAR(50),     -- 允许NULL
    email VARCHAR(100),       -- 允许NULL
    phone VARCHAR(20)         -- 允许NULL
);

-- 正确:明确NOT NULL和DEFAULT
CREATE TABLE users (
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) DEFAULT '' COMMENT '默认为空字符串'
);
```

**问题:** NULL值会:
- 影响索引效率
- 增加查询复杂度(需处理IS NULL/IS NOT NULL)
- 占用额外存储空间

### 误区3:索引越多越好

```sql
-- 错误:过多索引
CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY,
    user_id BIGINT,
    product_id BIGINT,
    amount DECIMAL(10,2),
    status TINYINT,
    created_at TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_product_id (product_id),
    INDEX idx_amount (amount),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_user_product (user_id, product_id),
    INDEX idx_user_status (user_id, status)
    -- ... 索引过多
);

-- 正确:合理索引
CREATE TABLE orders (
    -- ...
    
    INDEX idx_user_id (user_id),        -- 高频查询
    INDEX idx_product_id (product_id),  -- 高频查询
    INDEX idx_user_status_time (user_id, status, created_at)  -- 复合索引
);
```

**问题:** 过多索引会:
- 降低INSERT、UPDATE、DELETE性能
- 占用大量磁盘空间
- 增加维护成本

### 误区4:忽略字符集和排序规则

```sql
-- 错误:使用默认字符集(可能是latin1)
CREATE TABLE users (
    id INT PRIMARY KEY,
    username VARCHAR(50)
);

-- 正确:明确指定字符集
CREATE TABLE users (
    id INT PRIMARY KEY,
    username VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

**问题:** 字符集不正确会导致:
- 中文乱码
- emoji无法存储
- 排序结果不正确

### 误区5:大表直接ALTER

```sql
-- 错误:直接ALTER大表
ALTER TABLE users ADD COLUMN age TINYINT;  -- 可能锁表数小时

-- 正确:使用在线DDL工具
-- 1. 使用pt-online-schema-change
-- 2. 使用gh-ost
-- 3. 使用MySQL 8.0的即时DDL(INSTANT ADD COLUMN)
```

## DDL与事务的关系

### DDL的隐式提交

**重要:** 在MySQL中,DDL语句会**隐式提交**当前事务,无法回滚。

```sql
START TRANSACTION;

INSERT INTO users (username) VALUES ('tom');  -- DML,可以回滚

CREATE TABLE test_table (id INT);  -- DDL,隐式提交,无法回滚

ROLLBACK;  -- 只能回滚INSERT,CREATE TABLE已提交
```

### DDL与锁

```sql
-- DDL操作会锁定表
-- 在DDL执行期间,表被锁定,其他会话无法读写

-- 大表DDL可能导致长时间锁表
ALTER TABLE big_table ADD COLUMN new_col INT;  -- 可能锁表数小时

-- 使用在线DDL(MySQL 5.6+)
ALTER TABLE big_table ADD COLUMN new_col INT, ALGORITHM=INPLACE, LOCK=NONE;
```

**ALGORITHM选项:**
- `COPY`: 创建临时表复制数据,锁表
- `INPLACE`: 原地修改,不锁表(部分操作支持)
- `INSTANT`: 即时修改,仅修改元数据(MySQL 8.0+)

**LOCK选项:**
- `EXCLUSIVE`: 排他锁,阻止所有读写
- `SHARED`: 共享锁,允许读,阻止写
- `NONE`: 无锁,允许读写(部分操作支持)

```sql
-- 查看DDL正在执行的语句与状态
SHOW PROCESSLIST;

-- DDL进度详情:需开启 performance_schema 的 stage 监测点,
-- 再查询 events_statements_current / events_statements_history_long,
-- 其中 WORK_COMPLETED / WORK_ESTIMATED 列即为进度
```

## 面试要点总结

### 基础问题

1. **DDL、DML、DCL的区别?**
   - DDL: 数据定义语言,定义结构(CREATE, ALTER, DROP)
   - DML: 数据操作语言,操作数据(SELECT, INSERT, UPDATE, DELETE)
   - DCL: 数据控制语言,控制权限(GRANT, REVOKE)

2. **TRUNCATE和DELETE的区别?**
   - TRUNCATE是DDL,DELETE是DML
   - TRUNCATE更快(不记录每行删除),DELETE逐行删除
   - TRUNCATE不支持WHERE,DELETE支持
   - TRUNCATE重置自增ID,DELETE不重置
   - TRUNCATE不支持事务回滚,DELETE支持

3. **VARCHAR和CHAR的区别?**
   - CHAR定长,不足补空格,VARCHAR变长
   - CHAR最大255字符,VARCHAR最大65535字节
   - CHAR访问快,可能浪费空间;VARCHAR节省空间,访问稍慢
   - CHAR适合固定长度数据(手机号、身份证号),VARCHAR适合可变长度数据(用户名、邮箱)

4. **DATETIME和TIMESTAMP的区别?**
   - 存储空间: DATETIME 5字节(不含小数秒,5.6.4起;旧资料常写8字节), TIMESTAMP 4字节
   - 时间范围: DATETIME 1000~9999年, TIMESTAMP 1970~2038年
   - 时区: DATETIME不转换, TIMESTAMP自动转换时区
   - 自动更新: 两者都支持ON UPDATE CURRENT_TIMESTAMP(DATETIME需5.6.5+)

5. **主键和唯一索引的区别?**
   - 主键一个表只能有一个,唯一索引可以有多个
   - 主键不允许NULL,唯一索引允许NULL(可以有多个NULL)
   - 主键默认聚簇索引,唯一索引默认非聚簇索引
   - 主键是逻辑概念,唯一索引是物理概念

### 进阶问题

6. **什么是复合索引的最左前缀原则?**

索引: `idx_name_age_city(name, age, city)`

可以使用索引的查询:
```sql
WHERE name = 'tom'
WHERE name = 'tom' AND age = 25
WHERE name = 'tom' AND age = 25 AND city = '北京'
```

无法使用索引的查询:
```sql
WHERE age = 25              -- 跳过了name
WHERE city = '北京'         -- 跳过了name和age
WHERE name = 'tom' AND city = '北京'  -- 跳过了age,只能用到name
```

7. **索引什么时候会失效?**
   - 在索引列上使用函数: `WHERE DATE(created_at) = '2024-01-01'`
   - 隐式类型转换: `WHERE phone = 13800138000` (phone是VARCHAR)
   - LIKE以通配符开头: `WHERE name LIKE '%tom%'`
   - 使用OR连接非索引列: `WHERE name = 'tom' OR age = 25`
   - 使用!=或<>: `WHERE status != 0`
   - 使用NOT IN: `WHERE status NOT IN (0, 1)`
   - 复合索引不满足最左前缀

8. **如何设计合理的索引?**
   - 为WHERE、JOIN、ORDER BY、GROUP BY的列创建索引
   - 使用复合索引遵循最左前缀原则
   - 避免在低选择性列创建索引
   - 索引列尽量设置为NOT NULL
   - 避免过度索引(单表不超过5个)
   - 使用前缀索引节省空间
   - 使用覆盖索引减少回表

9. **分库分表如何处理跨库JOIN?**
   - 应用层组装: 分别查询多个表,应用层合并数据
   - 冗余字段: 在订单表冗余用户名字段
   - 全局表: 将基础数据(如地区表)同步到所有库
   - 数据同步: 使用Canal等工具同步到ES或其他存储,从ES查询

10. **大表DDL如何优化?**
    - 使用在线DDL: `ALGORITHM=INPLACE, LOCK=NONE`
    - 使用工具: pt-online-schema-change, gh-ost
    - 低峰期执行
    - 分批执行DDL
    - MySQL 8.0使用INSTANT DDL

### 实战问题

11. **如何优化表结构设计?**
    - 选择合适的数据类型(不要过度使用BIGINT、VARCHAR(255))
    - 合理使用NOT NULL和DEFAULT
    - 适度反范式化,减少JOIN
    - 使用冗余字段提高查询性能
    - 建立合理的索引
    - 使用覆盖索引减少回表

12. **如何处理字符集问题?**
    - 统一使用utf8mb4字符集
    - 排序规则使用utf8mb4_unicode_ci
    - 修改数据库字符集不会自动转换已有表
    - 使用`CONVERT TO CHARACTER SET`转换表的字符集

13. **如何设计电商系统的订单表?**
    - 使用BIGINT UNSIGNED作为主键(订单量大)
    - 订单号单独字段(order_no),建立唯一索引
    - 冗余用户信息(username, phone)避免跨库查询
    - 金额使用DECIMAL(10,2)
    - 状态使用TINYINT + COMMENT
    - 创建时间和更新时间必须包含
    - 按时间或用户ID分表
    - 不使用外键约束(分库分表)

14. **如何避免DDL导致的锁表问题?**
    - 大表DDL使用在线DDL或工具
    - 低峰期执行DDL
    - 使用ALGORITHM=INPLACE, LOCK=NONE
    - 监控DDL进度,及时发现问题
    - 使用MySQL 8.0的INSTANT DDL

15. **如何理解索引的B+树结构?**
    - B+树是多路平衡查找树
    - 非叶子节点存储键值和指针,不存储数据
    - 叶子节点存储键值和数据(聚簇索引)或主键(非聚簇索引)
    - 叶子节点通过双向链表连接,便于范围查询
    - 树高度通常3-4层,最多3-4次IO即可找到数据
    - 索引高度=⌈log(N)⌉,N为阶数,通常1000+

## 总结

DDL是数据库设计的基础,良好的表结构设计对系统性能和可维护性至关重要。关键要点:

1. **数据类型选择**: 根据实际需求选择合适的数据类型,避免过度使用
2. **约束设计**: 合理使用主键、外键、唯一、非空等约束保证数据完整性
3. **索引优化**: 理解索引原理,创建合理的索引,避免索引失效
4. **性能考虑**: 考虑查询性能和写入性能的平衡,适度反范式化
5. **分库分表**: 大数据量场景需考虑分库分表策略
6. **最佳实践**: 遵循命名规范,使用标准设计模式
7. **避免误区**: 理解常见误区,避免性能陷阱

掌握DDL,是成为优秀数据库设计师和后端工程师的必备技能!

## 版本差异(MySQL 5.7 → 8.0/8.4)

| 特性 | 旧版（本文编写时，MySQL 5.7） | 当前（MySQL 8.0/8.4 LTS） |
|------|-----------------------------|--------------------------|
| 默认字符集 | utf8（需显式配置 utf8mb4） | utf8mb4（MySQL 8.0 起默认） |
| 索引 | 普通 B+Tree | 降序索引、隐藏索引、函数索引（8.0+） |
| SQL 能力 | 常规查询 | 递归 CTE、窗口函数（8.0+） |
| 版本策略 | 5.7 | 8.0（主流）/ 8.4 LTS / 9.x（创新版） |
| Java 驱动 | mysql-connector-java 5.x/8.0 | mysql-connector-j 8.x/9.x |

> 本文基于 MySQL 5.7 编写，核心概念（索引、事务、锁、MVCC、InnoDB）在 8.0/8.4 中依然适用；8.0 的默认字符集、隐藏索引与 SQL 增强（CTE/窗口函数）是升级后的主要差异。
