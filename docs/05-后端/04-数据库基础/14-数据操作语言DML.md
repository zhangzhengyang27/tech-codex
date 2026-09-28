---
title: 数据操作语言 DML
description: DML（Data Manipulation Language）用于操作表中的数据：INSERT 插入、UPDATE 修改、DELETE 删除、REPLACE 替换。系统讲解语法、多行插入、关联更新、安全删除与性能
keywords: [DML, INSERT, UPDATE, DELETE, REPLACE, 增删改, 数据操作]
category: 数据库基础
tags: [SQL, DML, 数据操作]
---

# 数据操作语言 DML

DML（Data Manipulation Language，数据操作语言）用于**操作表中的数据**，即增、删、改。与 DDL 操作"结构"不同，DML 操作"数据"，通常**在事务内可回滚**。本文系统讲解 `INSERT`、`UPDATE`、`DELETE`、`REPLACE` 四大语句及进阶用法。

## INSERT：插入数据

### 基本语法

```sql
INSERT INTO 表名 (列1, 列2, ...) VALUES (值1, 值2, ...);
```

### 插入单行

```sql
-- 指定列（推荐：明确、可省略可空列）
INSERT INTO heros (name, hp_max, role_main) VALUES ('新英雄', 6500, '战士');

-- 省略列名（必须按表结构顺序给全所有列；自增列可传 NULL 让其自动生成，不推荐）
INSERT INTO heros VALUES (100, '新英雄', 6500, 500, 300, 100, '战士', NULL, '2026-08-01');
```

> **最佳实践**：显式列出列名，避免表结构变化导致插入错位。

### 插入多行

```sql
INSERT INTO heros (name, hp_max, role_main) VALUES
  ('英雄A', 6500, '战士'),
  ('英雄B', 5000, '法师'),
  ('英雄C', 4800, '射手');
```

> 多行插入比逐条 `INSERT` 快得多（减少网络往返与日志开销），是批量导入的推荐方式。

### 插入查询结果

```sql
-- 把高生命英雄复制到新表
INSERT INTO heros_backup (name, hp_max, role_main)
SELECT name, hp_max, role_main FROM heros WHERE hp_max > 7000;
```

### INSERT ... ON DUPLICATE KEY UPDATE

主键或唯一键冲突时执行更新（MySQL 语法，常用于"存在则更新，否则插入"）：

```sql
-- 若 id=1 已存在，则更新 hp_max；否则插入
INSERT INTO heros (id, name, hp_max) VALUES (1, '英雄A', 7000)
ON DUPLICATE KEY UPDATE hp_max = 7000, name = '英雄A';
```

## UPDATE：修改数据

### 基本语法

```sql
UPDATE 表名
SET 列1 = 值1, 列2 = 值2, ...
[WHERE 条件];
```

### 更新示例

```sql
-- 给所有法师英雄加 100 生命
UPDATE heros SET hp_max = hp_max + 100 WHERE role_main = '法师';

-- 多列更新
UPDATE heros
SET attack_max = 400, defense_max = 200
WHERE name = '英雄A';
```

### 关联更新（多表 UPDATE）

```sql
-- 根据另一张表的数据更新（MySQL 语法）
UPDATE heros h
JOIN role_bonus r ON h.role_main = r.role_name
SET h.hp_max = h.hp_max + r.bonus_hp;
```

### 使用子查询更新

```sql
UPDATE heros
SET attack_max = (SELECT AVG(attack_max) FROM heros)
WHERE attack_max < (SELECT AVG(attack_max) FROM heros);
```

### ⚠️ 更新安全

```sql
-- ❌ 不带 WHERE：更新全表（极危险！）
UPDATE heros SET hp_max = 0;

-- ✅ 带 WHERE
UPDATE heros SET hp_max = 0 WHERE name = '英雄A';

-- ✅ 更新前先用 SELECT 验证条件命中范围
SELECT COUNT(*) FROM heros WHERE name = '英雄A';
```

> **铁律**：`UPDATE` 必须写 `WHERE`，且 WHERE 最好走索引，否则会锁全表（尤其大表），既是性能问题也是安全风险。

## DELETE：删除数据

### 基本语法

```sql
DELETE FROM 表名 [WHERE 条件];
```

### 删除示例

```sql
-- 删除指定英雄
DELETE FROM heros WHERE name = '英雄A';

-- 删除满足条件的多行
DELETE FROM heros WHERE role_main = '法师' AND hp_max < 4000;

-- 限制删除条数（MySQL）
DELETE FROM heros WHERE role_main = '战士' LIMIT 10;
```

### ⚠️ 删除安全

```sql
-- ❌ 不带 WHERE：清空全表数据（但保留结构）
DELETE FROM heros;

-- ✅ 先 SELECT 确认
SELECT * FROM heros WHERE name = '英雄A';
DELETE FROM heros WHERE name = '英雄A';
```

### 多表删除（MySQL）

```sql
-- 删除主表 + 关联表记录
DELETE h, b FROM heros h
JOIN heros_bak b ON h.id = b.id
WHERE h.role_main = '法师';
```

### DELETE 与事务

DELETE 是 DML，**可在事务内回滚**（区别于 TRUNCATE）：

```sql
BEGIN;
DELETE FROM heros WHERE role_main = '法师';
-- 误删了？回滚！
ROLLBACK;
```

## REPLACE：替换（MySQL）

`REPLACE` 是 MySQL 特有：若主键/唯一键冲突则**先删除再插入**（不等同于 ON DUPLICATE KEY UPDATE 的"更新"）。

```sql
-- 存在 id=1 则删除后重插（相当于删+插，非原地更新）
REPLACE INTO heros (id, name, hp_max) VALUES (1, '英雄A', 7000);
```

| 操作 | 冲突行为 | 副作用 |
|------|---------|--------|
| `INSERT` | 报错 | - |
| `INSERT ... ON DUPLICATE KEY UPDATE` | 更新 | 未 SET 的列保持原值 |
| `REPLACE` | 删旧插新 | **删除触发器会触发**、自增可能变化 |

> 需要"有则更新、无则插入"且希望保留原行其余字段时用 `ON DUPLICATE KEY UPDATE`；能接受"重建行"时用 `REPLACE`。

## DML 的性能与安全

### 批量操作优化

```sql
-- ✅ 多行 INSERT（推荐）
INSERT INTO heros (name, hp_max) VALUES (...), (...), (...);

-- ❌ 循环逐条 INSERT（慢，网络/日志开销大）
-- 每行一次 INSERT

-- 大批量导入用 LOAD DATA
LOAD DATA INFILE 'heros.csv' INTO TABLE heros
FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n'
(name, hp_max, role_main);
```

### WHERE 使用索引

```sql
-- ✅ 走主键/索引：快速定位，锁最小范围
UPDATE heros SET hp_max = 7000 WHERE id = 1;

-- ❌ 无索引条件：全表扫描，锁全表
UPDATE heros SET hp_max = 7000 WHERE name = '英雄A';  -- name 若未建索引则危险
```

### 事务与一致性

```sql
-- 转账：两条 DML 放在一个事务里，要么都成功要么都失败
BEGIN;
UPDATE accounts SET balance = balance - 100 WHERE id = 1;
UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;
```

### DML 最佳实践

1. **UPDATE/DELETE 必带 WHERE**，且用 SELECT 先验证影响范围；
2. **WHERE 走索引**，避免大表全表扫描与全表锁；
3. **批量用多行 INSERT / LOAD DATA**，避免逐条执行；
4. **关键写操作包事务**，保证原子性；DML 可回滚，误操作及时 ROLLBACK；
5. **先备份**：涉及大范围更新的生产操作，备份或限制影响行数。

## 总结

### DML 语句速查

| 语句 | 作用 | 关键点 |
|------|------|--------|
| `INSERT INTO ... VALUES` | 插入行 | 可多行、可插入查询结果 |
| `INSERT ... ON DUPLICATE KEY UPDATE` | 冲突则更新 | 无副作用，保留原行 |
| `UPDATE ... SET ... WHERE` | 修改行 | 必须带 WHERE、走索引 |
| `DELETE FROM ... WHERE` | 删除行 | 必须带 WHERE，可事务回滚 |
| `REPLACE INTO` | 删旧插新 | MySQL 特有，触发删除触发器 |

### 关键点

1. **DML 操作数据、可回滚**；DDL 操作结构、不可回滚；
2. `INSERT` 显式列名最安全，多行插入性能最优；
3. `UPDATE`/`DELETE` 不带 WHERE = 全表操作，是最常见的事故来源；
4. WHERE 走索引既能提速又能缩小锁范围；
5. `ON DUPLICATE KEY UPDATE`（更新）与 `REPLACE`（删+插）语义不同，按需选择。
