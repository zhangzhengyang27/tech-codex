---
title: 数据定义语言 DDL
description: DDL（Data Definition Language）用于定义和修改数据库结构：CREATE 创建库/表/索引、ALTER 修改表结构、DROP 删除、TRUNCATE 清空、RENAME 重命名。系统讲解各语句语法、约束、数据类型与执行代价
keywords: [DDL, CREATE, ALTER, DROP, TRUNCATE, 建表, 数据库, 表结构]
category: 数据库基础
tags: [SQL, DDL, 表结构]
---

# 数据定义语言 DDL

DDL（Data Definition Language，数据定义语言）用于**定义和修改数据库的结构**，包括数据库、表、索引、视图、触发器、存储过程等对象。DDL 操作会**隐式提交事务**（MySQL、Oracle 等对 DDL 采取自动提交，不可回滚；PostgreSQL 例外，支持事务性 DDL），因此执行前务必确认。本文系统讲解最常用的三类对象：库、表、索引。

## 数据库管理

### 创建数据库

```sql
CREATE DATABASE db_name
  [DEFAULT CHARACTER SET utf8mb4]   -- 字符集
  [DEFAULT COLLATE utf8mb4_unicode_ci];  -- 排序规则
```

**示例**：

```sql
CREATE DATABASE school;
CREATE DATABASE IF NOT EXISTS school
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_0900_ai_ci;
```

> **IF NOT EXISTS**：若库已存在则跳过，避免报错。适合脚本重复执行场景。

### 查看与选择数据库

```sql
SHOW DATABASES;                    -- 列出所有数据库
SHOW CREATE DATABASE school;       -- 查看建库语句
USE school;                        -- 选择当前数据库
SELECT DATABASE();                 -- 查看当前所在库
```

### 修改数据库

```sql
ALTER DATABASE school
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

### 删除数据库

```sql
DROP DATABASE school;
DROP DATABASE IF EXISTS school;    -- 不存在则不报错
```

> ⚠️ `DROP DATABASE` **不可恢复**，会删除库内所有表和数据。生产环境务必先备份。

## 表的创建（CREATE TABLE）

### 基本语法

```sql
CREATE TABLE [IF NOT EXISTS] 表名 (
    列名 数据类型 [列级约束] [DEFAULT 默认值] [COMMENT '注释'],
    ...,
    [表级约束],
    [索引定义]
) [ENGINE=存储引擎] [CHARSET=字符集] [COMMENT='表注释'];
```

### 完整建表示例

以王者荣耀英雄表为例：

```sql
CREATE TABLE heros (
    id            INT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '英雄ID',
    name          VARCHAR(20) NOT NULL COMMENT '英雄名称',
    hp_max        INT NOT NULL DEFAULT 0 COMMENT '最大生命',
    mp_max        INT NOT NULL DEFAULT 0 COMMENT '最大法力',
    attack_max    INT NOT NULL DEFAULT 0 COMMENT '物理攻击',
    defense_max   INT NOT NULL DEFAULT 0 COMMENT '物理防御',
    role_main     VARCHAR(20) COMMENT '主要定位',
    role_assist   VARCHAR(20) COMMENT '次要定位',
    birthdate     DATE COMMENT '上线日期',
    PRIMARY KEY (id),                       -- 主键约束
    UNIQUE KEY uk_name (name),              -- 唯一约束 + 索引
    KEY idx_role (role_main, role_assist),  -- 联合索引
    CONSTRAINT chk_hp CHECK (hp_max >= 0)   -- 检查约束
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='英雄属性表';
```

### 常用数据类型速查

| 类型 | 说明 | 典型示例 |
|------|------|---------|
| `INT` / `BIGINT` | 整数 | `INT UNSIGNED` |
| `DECIMAL(p,s)` | 精确小数 | `DECIMAL(10,2)` 金额 |
| `VARCHAR(n)` | 变长字符串 | `VARCHAR(50)` |
| `CHAR(n)` | 定长字符串 | `CHAR(11)` 固定编码 |
| `DATE` | 日期 | `'2026-01-01'` |
| `DATETIME` | 日期时间 | `'2026-01-01 10:30:00'` |
| `TIMESTAMP` | 时间戳（有时区） | 自动更新 |
| `TEXT` | 长文本 | 大段描述 |
| `JSON` | JSON 文档 | 灵活结构 |

> **列定义要素**：数据类型必填；`NOT NULL`/`DEFAULT`/`AUTO_INCREMENT`/`COMMENT` 为常用选项。建表后结构变更代价高，**设计先行**。

### 基于已有表创建

```sql
-- 复制表结构（不含数据）
CREATE TABLE heros_bak LIKE heros;

-- 复制表结构 + 数据（通过查询创建）
CREATE TABLE heros_high_hp AS
SELECT * FROM heros WHERE hp_max > 7000;
```

## 修改表结构（ALTER TABLE）

### 添加列

```sql
-- 在表末尾添加列
ALTER TABLE heros ADD COLUMN speed INT DEFAULT 0 COMMENT '移速';

-- 在指定列后添加
ALTER TABLE heros ADD COLUMN speed INT AFTER role_assist;

-- 在表首添加
ALTER TABLE heros ADD COLUMN id0 INT FIRST;

-- 添加多列
ALTER TABLE heros
  ADD COLUMN speed INT,
  ADD COLUMN crit_rate DECIMAL(4,2);
```

### 修改列

```sql
-- 修改列数据类型
ALTER TABLE heros MODIFY COLUMN hp_max BIGINT;

-- 修改列名 + 类型
ALTER TABLE heros CHANGE COLUMN hp_max hp_max_val BIGINT;

-- 修改列默认值
ALTER TABLE heros ALTER COLUMN role_main SET DEFAULT '战士';
ALTER TABLE heros ALTER COLUMN role_main DROP DEFAULT;
```

> **MODIFY vs CHANGE**：`MODIFY` 只改类型/属性，不改列名；`CHANGE` 可同时改列名与类型。

### 删除列

```sql
ALTER TABLE heros DROP COLUMN speed;
```

### 表重命名

```sql
RENAME TABLE heros TO heros_old;
ALTER TABLE heros_old RENAME TO heros;
```

### 修改表选项

```sql
ALTER TABLE heros ENGINE = InnoDB;              -- 修改存储引擎
ALTER TABLE heros DEFAULT CHARACTER SET utf8mb4; -- 修改字符集
ALTER TABLE heros COMMENT = '英雄属性表V2';      -- 修改表注释
```

## 索引管理

### 添加索引

```sql
-- 普通索引
ALTER TABLE heros ADD INDEX idx_name (name);
CREATE INDEX idx_name ON heros (name);

-- 唯一索引
ALTER TABLE heros ADD UNIQUE INDEX uk_name (name);
CREATE UNIQUE INDEX uk_name ON heros (name);

-- 联合索引
ALTER TABLE heros ADD INDEX idx_role (role_main, role_assist);

-- 前缀索引（字符串前 n 个字符）
CREATE INDEX idx_name_prefix ON heros (name(5));
```

### 删除索引

```sql
ALTER TABLE heros DROP INDEX idx_name;
DROP INDEX idx_name ON heros;
```

> 索引能加速查询，但会拖慢写入、占用存储。**索引不是越多越好**，具体取舍见《索引》篇。

## 删除与清空表

### DROP：删除表

```sql
DROP TABLE heros;
DROP TABLE IF EXISTS heros, heros_bak;   -- 一次删多张
```

### TRUNCATE：清空表

```sql
TRUNCATE TABLE heros;
```

### DROP / TRUNCATE / DELETE 对比

| 操作 | 作用 | 是否可回滚 | 保留表结构 | 重置自增 | 触发删除触发器 | 性能 |
|------|------|:---:|:---:|:---:|:---:|:---:|
| `DELETE` | 按条件删行 | ✅（事务内） | ✅ | ❌ | ✅ | 慢（逐行） |
| `TRUNCATE` | 清空全部数据 | ❌（隐式提交） | ✅ | ✅ | ❌ | 快（DDL 级） |
| `DROP` | 删除整个表 | ❌ | ❌ | - | - | 最快 |

```sql
-- DELETE：可带 WHERE，可回滚
BEGIN;
DELETE FROM heros WHERE role_main = '法师';
ROLLBACK;   -- 可以恢复

-- TRUNCATE：清空，不可回滚，自增重置
TRUNCATE TABLE heros;

-- DROP：连结构带数据一起删
DROP TABLE heros;
```

## 视图 / 存储过程 / 触发器的 DDL

这三类对象也由 DDL 管理，详见各自专题，这里列出 DDL 骨架：

```sql
-- 视图
CREATE VIEW v_hero_attack AS
  SELECT name, attack_max FROM heros WHERE attack_max > 300;
DROP VIEW v_hero_attack;

-- 存储过程
CREATE PROCEDURE sp_hello()
BEGIN
  SELECT 'Hello';
END;
DROP PROCEDURE sp_hello;

-- 触发器
CREATE TRIGGER trg_after_insert AFTER INSERT ON heros
FOR EACH ROW
BEGIN
  -- 触发逻辑
END;
DROP TRIGGER trg_after_insert;
```

## 约束的 DDL 写法

约束既可在建表时定义（见前面的建表示例），也可事后 `ALTER TABLE` 添加或删除。六类约束（主键/唯一/非空/默认/检查/外键）的完整语法、规则与最佳实践见《15-数据约束》，这里只列 DDL 骨架：

```sql
-- 建表后添加约束
ALTER TABLE heros ADD PRIMARY KEY (id);
ALTER TABLE heros ADD UNIQUE KEY uk_name (name);
ALTER TABLE heros ADD CONSTRAINT chk_hp CHECK (hp_max >= 0);
ALTER TABLE heros ADD FOREIGN KEY (team_id) REFERENCES team(id);

-- 删除约束
ALTER TABLE heros DROP PRIMARY KEY;
ALTER TABLE heros DROP INDEX uk_name;
ALTER TABLE heros DROP CHECK chk_hp;
ALTER TABLE heros DROP FOREIGN KEY fk_team;
```

> 约束的完整讲解（语义、NULL 规则、级联动作、使用争议）见《15-数据约束》与《21-数据库外键》。

## DDL 的执行代价与注意事项

### 为什么 DDL 要谨慎

- **不可回滚**：DDL 大多隐式提交，误操作无法通过事务回滚；
- **锁表风险**：部分 DDL（尤其 MySQL 5.7 及以下）会锁表，阻塞线上 DML；
- **耗时**：大表加列/改类型可能耗时数分钟，需评估窗口期。

### 在线 DDL 思路

以 MySQL 8.0 为例，多数 DDL 支持 `ALGORITHM=INPLACE`（在线、不阻塞 DML）：

```sql
-- 8.0 支持 INSTANT：仅改元数据，秒级完成
ALTER TABLE heros ADD COLUMN speed INT, ALGORITHM=INSTANT;

-- 指定 INPLACE（可并发 DML）
ALTER TABLE heros ADD INDEX idx_hp (hp_max), ALGORITHM=INPLACE, LOCK=NONE;
```

| ALGORITHM | 说明 | 是否阻塞 DML |
|-----------|------|:---:|
| INSTANT | 仅改元数据，最快 | 不阻塞 |
| INPLACE | 原地重建表 | 通常不阻塞 |
| COPY | 拷贝整表 | 阻塞 |

### DDL 最佳实践

1. **先设计后建表**：结构变更代价高，前期充分建模（见《关系模型》《范式设计》）；
2. **生产 DDL 走审核**：大表变更选低峰期，配合在线 DDL；
3. **善用 IF EXISTS / IF NOT EXISTS**：脚本幂等，避免重复执行报错；
4. **备份先行**：`DROP`/`TRUNCATE` 前确认有备份；
5. **字符集统一**：库、表、列字符集保持一致（推荐 utf8mb4），避免乱码与排序异常。

## 总结

### DDL 语句速查

| 对象 | 创建 | 修改 | 删除 |
|------|------|------|------|
| 数据库 | `CREATE DATABASE` | `ALTER DATABASE` | `DROP DATABASE` |
| 表 | `CREATE TABLE` | `ALTER TABLE` | `DROP TABLE` / `TRUNCATE` |
| 索引 | `CREATE INDEX` / `ADD INDEX` | `ALTER TABLE ...` | `DROP INDEX` |
| 视图 | `CREATE VIEW` | `CREATE OR REPLACE VIEW` | `DROP VIEW` |
| 存储过程 | `CREATE PROCEDURE` | `ALTER PROCEDURE` | `DROP PROCEDURE` |
| 触发器 | `CREATE TRIGGER` | - | `DROP TRIGGER` |

### 关键点

1. **DDL 隐式提交、不可回滚**，执行前需确认与备份；
2. **CREATE** 定义结构，**ALTER** 增删改列/索引/约束，**DROP** 整体删除，**TRUNCATE** 快速清空数据；
3. **DELETE/TRUNCATE/DROP** 三者的可回滚性、保留结构、重置自增、性能各不相同；
4. 大表 DDL 优先在线算法（INSTANT/INPLACE），避免锁表阻塞业务；
5. 约束、索引、字符集在建表时一并设计好，避免反复 ALTER。
