---
title: SQL-DDL与表结构
description: SQL DDL 详解：数据库与表的定义语法、字段定义与数据类型、主键与索引、表选项（引擎/字符集/行格式）、ALTER 修改表结构、六类约束与建表设计原则、外键使用争议
keywords: [DDL, CREATE TABLE, 建表语句]
category: MySQL
tags: [SQL, MySQL, DDL]
---

# SQL-DDL与表结构

DDL（Data Definition Language）是 DBMS 的核心组件，也是 SQL 的重要组成部分。面对同一个需求，不同的开发人员创建出来的数据库和数据表可能千差万别。

## DDL 基础语法

DDL 中常用的功能是增删改，分别对应的命令是 CREATE、DROP 和 ALTER。在执行 DDL 的时候不需要 COMMIT。

### 数据库操作

```sql
-- 创建数据库
CREATE DATABASE nba;

-- 创建数据库并指定字符集
CREATE DATABASE nba 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

-- 删除数据库
DROP DATABASE nba;

-- 如果存在则删除
DROP DATABASE IF EXISTS nba;
```

### 数据表操作

```sql
-- 创建表的基本语法
CREATE TABLE table_name (
    字段名 数据类型 约束条件,
    字段名 数据类型 约束条件,
    ...
);
```

## 创建表结构

### 基本示例

创建一个球员表 player，包含两个字段：

```sql
CREATE TABLE player (
    player_id INT(11) NOT NULL AUTO_INCREMENT,
    player_name VARCHAR(255) NOT NULL,
    PRIMARY KEY (player_id)
);
```

**语法要点**：
- 字段定义用逗号分隔
- 最后一个字段后不加逗号
- 语句以分号结束

### 完整示例

创建一个完整的球员表，包含更多字段和约束：

```sql
CREATE TABLE player (
    player_id INT(11) NOT NULL AUTO_INCREMENT COMMENT '球员ID',
    team_id INT(11) NOT NULL COMMENT '球队ID',
    player_name VARCHAR(255) NOT NULL COMMENT '球员姓名',
    height FLOAT(3, 2) DEFAULT 0.00 COMMENT '身高（米）',
    PRIMARY KEY (player_id) USING BTREE,
    UNIQUE INDEX uk_player_name (player_name) USING BTREE
) ENGINE=InnoDB 
  CHARACTER SET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  COMMENT='球员信息表';
```

### 字段定义详解

| 部分 | 说明 | 示例 |
|:---|:---|:---|
| 字段名 | 列名称 | `player_id` |
| 数据类型 | 列的数据类型 | `INT(11)`、`VARCHAR(255)` |
| NOT NULL | 不允许为空 | `NOT NULL` |
| DEFAULT | 默认值 | `DEFAULT 0.00` |
| AUTO_INCREMENT | 自动递增 | `AUTO_INCREMENT` |
| COMMENT | 字段注释 | `COMMENT '球员ID'` |

### 数据类型说明

**INT(11)**：
- `INT` 表示整数类型
- `(11)` 表示最大显示宽度，不影响数值范围；**注意：显示宽度自 MySQL 8.0.17 起已废弃，不建议再写 `INT(11)`，直接写 `INT` 即可**
- 范围：-2147483648 到 2147483647

**VARCHAR(255)**：
- 可变长度字符串
- 最大长度 255 个字符
- 实际占用空间 = 实际长度 + 1~2 字节

**FLOAT(3,2)**：
- 浮点数类型
- `(3,2)` 表示总共 3 位，其中 2 位小数
- 范围：-9.99 到 9.99
- **注意：`FLOAT(M,D)`/`DOUBLE(M,D)` 这种带精度声明的写法自 8.0.17 起已废弃，精度建议在应用层或用 DECIMAL 控制**

## 主键和索引

### 主键定义

```sql
-- 单列主键
CREATE TABLE player (
    player_id INT PRIMARY KEY,
    player_name VARCHAR(255)
);

-- 联合主键
CREATE TABLE player_team (
    player_id INT,
    team_id INT,
    PRIMARY KEY (player_id, team_id)
);

-- 自增主键
CREATE TABLE player (
    player_id INT AUTO_INCREMENT PRIMARY KEY,
    player_name VARCHAR(255)
);
```

### 索引类型

```sql
CREATE TABLE player (
    player_id INT PRIMARY KEY,
    player_name VARCHAR(255),
    team_id INT,
    
    -- 唯一索引
    UNIQUE INDEX uk_player_name (player_name),
    
    -- 普通索引
    INDEX idx_team_id (team_id)
);
```

**索引类型对比**：

| 索引类型 | 关键字 | 特点 |
|:---|:---|:---|
| 主键索引 | PRIMARY KEY | 唯一且非空，每表只能有一个 |
| 唯一索引 | UNIQUE INDEX | 唯一但可以为空 |
| 普通索引 | INDEX | 无唯一性约束 |
| 全文索引 | FULLTEXT | 用于全文搜索 |

### 索引方法

```sql
-- BTREE 索引（默认）
INDEX idx_name (column) USING BTREE

-- HASH 索引（Memory 引擎）
INDEX idx_name (column) USING HASH
```

**BTREE vs HASH**：

| 特性 | BTREE | HASH |
|:---|:---|:---|
| 范围查询 | ✅ 支持 | ❌ 不支持 |
| 排序 | ✅ 支持 | ❌ 不支持 |
| 等值查询 | 快 | 更快 |
| 适用引擎 | InnoDB、MyISAM | Memory |

## 表选项

### 存储引擎

```sql
CREATE TABLE player (
    id INT PRIMARY KEY
) ENGINE=InnoDB;
```

**常用引擎**：

| 引擎 | 特点 | 适用场景 |
|:---|:---|:---|
| InnoDB | 支持事务、行锁、外键 | 大部分应用 |
| MyISAM | 不支持事务、表锁 | 只读应用 |
| Memory | 数据存储在内存 | 临时表、缓存 |

### 字符集和排序规则

```sql
CREATE TABLE player (
    id INT PRIMARY KEY,
    name VARCHAR(255)
) CHARACTER SET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci;
```

**常用字符集**：

| 字符集 | 说明 | 推荐场景 |
|:---|:---|:---|
| utf8mb4 | 完整 UTF-8，支持 Emoji | 推荐 |
| utf8 | 不完整 UTF-8，不支持 Emoji | 不推荐 |
| latin1 | 西欧字符 | 不推荐 |

**常用排序规则**：

| 排序规则 | 说明 |
|:---|:---|
| utf8mb4_0900_ai_ci | **MySQL 8.0 默认**，基于 Unicode 9.0，速度与准确性兼顾 |
| utf8mb4_general_ci | 不区分大小写，速度快 |
| utf8mb4_unicode_ci | 不区分大小写，更准确 |
| utf8mb4_bin | 区分大小写 |

### 行格式

```sql
CREATE TABLE player (
    id INT PRIMARY KEY
) ROW_FORMAT=DYNAMIC;
```

**行格式类型**：

| 格式 | 说明 |
|:---|:---|
| COMPACT | 紧凑格式 |
| DYNAMIC | 动态格式（默认） |
| COMPRESSED | 压缩格式 |

## 修改表结构

### 添加字段

```sql
-- 添加单个字段
ALTER TABLE player ADD COLUMN age INT(11);

-- 添加字段并指定位置
ALTER TABLE player ADD COLUMN age INT(11) AFTER player_name;
ALTER TABLE player ADD COLUMN age INT(11) FIRST;
```

### 修改字段

```sql
-- 修改字段名
ALTER TABLE player RENAME COLUMN age TO player_age;

-- 修改字段类型
ALTER TABLE player MODIFY COLUMN player_age FLOAT(3,1);

-- 修改字段名和类型
ALTER TABLE player CHANGE COLUMN player_age age INT(11);
```

**MODIFY vs CHANGE**：

| 命令 | 修改字段名 | 修改类型 |
|:---|:---|:---|
| MODIFY | ❌ 不能 | ✅ 能 |
| CHANGE | ✅ 能 | ✅ 能 |

### 删除字段

```sql
ALTER TABLE player DROP COLUMN age;
```

### 添加/删除索引

```sql
-- 添加索引
ALTER TABLE player ADD INDEX idx_team_id (team_id);

-- 添加唯一索引
ALTER TABLE player ADD UNIQUE INDEX uk_name (player_name);

-- 删除索引
ALTER TABLE player DROP INDEX idx_team_id;
```

## 数据表约束

约束用于保证 RDBMS 中数据的准确性和一致性。

### 主键约束

```sql
CREATE TABLE player (
    player_id INT PRIMARY KEY,
    player_name VARCHAR(255)
);
```

**特点**：
- 唯一标识一条记录
- 不能重复，不能为空
- 相当于 UNIQUE + NOT NULL
- 每个表只能有一个主键

### 外键约束

```sql
CREATE TABLE player (
    player_id INT PRIMARY KEY,
    team_id INT,
    FOREIGN KEY (team_id) REFERENCES team(team_id)
);
```

**特点**：
- 确保表与表之间引用的完整性
- 外键对应另一张表的主键
- 可以重复，可以为空

### 唯一性约束

```sql
CREATE TABLE player (
    player_id INT PRIMARY KEY,
    player_name VARCHAR(255) UNIQUE
);
```

**唯一索引 vs 普通索引**：

| 特性 | 唯一索引 | 普通索引 |
|:---|:---|:---|
| 唯一性约束 | ✅ 有 | ❌ 无 |
| 查询速度 | 快 | 快 |
| 插入速度 | 稍慢 | 稍慢 |

### NOT NULL 约束

```sql
CREATE TABLE player (
    player_id INT PRIMARY KEY,
    player_name VARCHAR(255) NOT NULL
);
```

**作用**：字段不能为空，必须有取值。

### DEFAULT 约束

```sql
CREATE TABLE player (
    player_id INT PRIMARY KEY,
    height FLOAT(3,2) DEFAULT 0.00
);
```

**作用**：插入数据时如果未指定值，则使用默认值。

### CHECK 约束

```sql
CREATE TABLE player (
    player_id INT PRIMARY KEY,
    height FLOAT(3,2),
    CHECK (height >= 0 AND height < 3)
);
```

**作用**：检查字段取值范围的有效性，CHECK 约束的结果不能为 FALSE（MySQL 8.0.16 起 CHECK 约束才真正强制生效，之前版本仅解析不执行）。

## 设计数据表原则

### 核心原则

| 原则 | 说明 |
|:---|:---|
| 表个数越少越好 | 实体和联系设计简洁 |
| 字段个数越少越好 | 减少数据冗余 |
| 联合主键字段越少越好 | 降低索引空间，提高效率 |
| 主键和外键越多越好 | 降低冗余度，提升关联使用率 |

### 设计考量

设计数据表时需要考虑：

1. **用户需求**：用户需要什么数据？需要保存哪些数据？
2. **访问频率**：哪些数据是经常访问的？如何提升检索效率？
3. **数据一致性**：插入、删除、更新时如何保证数据正确性？
4. **数据冗余**：如何降低数据冗余度？
5. **可维护性**：如何让数据库维护更方便？

## 外键使用争议

### 使用外键的优点

1. **强一致性**：数据库层面保证数据完整性和一致性
2. **自动校验**：无需应用层额外检查
3. **级联操作**：支持级联更新和删除

### 使用外键的缺点

1. **性能开销**：每次更新需要检查关联表
2. **锁表风险**：高并发时可能导致死锁
3. **分库分表困难**：跨库无法使用外键

### 最佳实践

| 场景 | 建议 |
|:---|:---|
| 学习阶段 | 使用外键，建立规范意识 |
| 小型项目 | 使用外键，保证数据一致性 |
| 大型互联网项目 | 不使用外键，业务层实现 |
| 分库分表场景 | 不使用外键 |

**替代方案**：设置冗余字段代替外键，在业务层保证一致性。

## 使用可视化工具

实际开发中很少手写 DDL 语句，推荐使用可视化工具：

### Navicat

Navicat 是一个跨平台的数据库管理和设计工具，支持 MySQL、Oracle、MariaDB 等。

**创建表的步骤**：
1. 连接数据库
2. 右键 → 新建表
3. 设计字段和约束
4. 保存表

**导出 DDL**：
1. 右键选中表
2. 选择"转储 SQL 文件" → "仅结构"

### 导出的 DDL 示例

```sql
DROP TABLE IF EXISTS `player`;

CREATE TABLE `player` (
    `player_id` INT(11) NOT NULL AUTO_INCREMENT,
    `team_id` INT(11) NOT NULL,
    `player_name` VARCHAR(255) NOT NULL,
    `height` FLOAT(3,2) DEFAULT 0.00,
    PRIMARY KEY (`player_id`) USING BTREE,
    UNIQUE INDEX `uk_player_name` (`player_name`) USING BTREE
) ENGINE=InnoDB 
  CHARACTER SET=utf8mb4 
  COLLATE=utf8mb4_unicode_ci 
  ROW_FORMAT=DYNAMIC;
```

## 总结

### DDL 核心命令

| 操作 | 命令 |
|:---|:---|
| 创建数据库 | `CREATE DATABASE` |
| 删除数据库 | `DROP DATABASE` |
| 创建表 | `CREATE TABLE` |
| 修改表 | `ALTER TABLE` |
| 删除表 | `DROP TABLE` |

### 约束类型

| 约束 | 关键字 | 说明 |
|:---|:---|:---|
| 主键约束 | PRIMARY KEY | 唯一标识，非空 |
| 外键约束 | FOREIGN KEY | 引用完整性 |
| 唯一约束 | UNIQUE | 值唯一 |
| 非空约束 | NOT NULL | 不允许为空 |
| 默认约束 | DEFAULT | 默认值 |
| 检查约束 | CHECK | 取值范围 |

### 设计原则

1. **简洁性**：表和字段数量适度
2. **规范性**：使用合适的约束
3. **可扩展性**：预留扩展空间
4. **性能考虑**：合理使用索引和外键
