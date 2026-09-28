---
title: SQL-DML与数据修改
description: SQL DML 数据修改详解：INSERT（单条/批量/插入查询结果/IGNORE/ON DUPLICATE KEY/REPLACE）、UPDATE（表达式/CASE/多表更新/返回值）、DELETE 与 TRUNCATE 对比、多表删除与安全操作建议
keywords: [INSERT, UPDATE, DELETE, 数据变更]
category: MySQL
tags: [SQL, 数据操作]
---

# SQL-DML与数据修改

关系数据库的基本操作是增删改查（CRUD）：Create、Retrieve、Update、Delete。本章详细介绍 INSERT、UPDATE、DELETE 三种数据修改操作。

## INSERT 插入数据

### 基本语法

```sql
INSERT INTO 表名 (字段1, 字段2, ...) VALUES (值1, 值2, ...);
```

### 插入单条记录

```sql
-- 插入一条新记录
INSERT INTO students (class_id, name, gender, score) 
VALUES (2, '大牛', 'M', 80);

-- 查询验证
SELECT * FROM students;
```

**注意事项**：
- 自增主键（如 `id`）可以省略，由数据库自动生成
- 有默认值的字段可以省略
- 字段顺序不必与表定义一致，但值的顺序必须与字段顺序一致

### 插入多条记录

```sql
-- 一次性插入多条记录
INSERT INTO students (class_id, name, gender, score) VALUES
    (1, '大宝', 'M', 87),
    (2, '二宝', 'M', 81),
    (3, '三宝', 'F', 92);
```

### 插入查询结果

```sql
-- 从另一个表插入数据
INSERT INTO students_backup (name, gender, score)
SELECT name, gender, score FROM students WHERE score > 80;

-- 创建表并插入数据
CREATE TABLE students_top AS 
SELECT * FROM students WHERE score >= 90;
```

### INSERT IGNORE

忽略重复键错误：

```sql
-- 如果主键冲突则忽略
INSERT IGNORE INTO students (id, name, gender, score) 
VALUES (1, '新名字', 'M', 100);
```

### INSERT ... ON DUPLICATE KEY UPDATE

主键冲突时更新：

```sql
-- 如果 id=1 存在则更新，不存在则插入
INSERT INTO students (id, name, gender, score) 
VALUES (1, '大牛', 'M', 95)
ON DUPLICATE KEY UPDATE 
    name = '大牛', 
    score = 95;
```

### REPLACE

替换已存在的记录：

```sql
-- 如果主键存在则删除后插入，不存在则直接插入
REPLACE INTO students (id, name, gender, score) 
VALUES (1, '大牛', 'M', 95);
```

## UPDATE 更新数据

### 基本语法

```sql
UPDATE 表名 SET 字段1=值1, 字段2=值2, ... WHERE 条件;
```

### 更新单条记录

```sql
-- 更新 id=1 的记录
UPDATE students SET name = '大牛', score = 66 WHERE id = 1;

-- 查询验证
SELECT * FROM students WHERE id = 1;
```

### 更新多条记录

```sql
-- 更新 id 在 5-7 之间的记录
UPDATE students SET name = '小牛', score = 77 
WHERE id >= 5 AND id <= 7;

-- 更新所有分数低于 60 的记录
UPDATE students SET score = 60 WHERE score < 60;
```

### 使用表达式更新

```sql
-- 所有分数加 10 分
UPDATE students SET score = score + 10 WHERE score < 80;

-- 根据条件更新不同值
UPDATE students SET 
    score = CASE 
        WHEN score < 60 THEN 60 
        WHEN score > 95 THEN 95 
        ELSE score 
    END;
```

### 多表更新

```sql
-- 关联更新
UPDATE students s
JOIN classes c ON s.class_id = c.id
SET s.class_name = c.name
WHERE c.name = '一班';
```

### UPDATE 返回值

MySQL 会返回更新的行数：

```sql
mysql> UPDATE students SET name = '大宝' WHERE id = 1;
Query OK, 1 row affected (0.00 sec)
Rows matched: 1  Changed: 1  Warnings: 0

mysql> UPDATE students SET name = '大宝' WHERE id = 999;
Query OK, 0 rows affected (0.00 sec)
Rows matched: 0  Changed: 0  Warnings: 0
```

### 注意事项

```sql
-- 危险！没有 WHERE 条件会更新所有记录
UPDATE students SET score = 60;

-- 安全做法：先用 SELECT 验证
SELECT * FROM students WHERE score < 60;
-- 确认无误后再执行 UPDATE
UPDATE students SET score = 60 WHERE score < 60;
```

## DELETE 删除数据

### 基本语法

```sql
DELETE FROM 表名 WHERE 条件;
```

### 删除单条记录

```sql
-- 删除 id=1 的记录
DELETE FROM students WHERE id = 1;
```

### 删除多条记录

```sql
-- 删除 id 在 5-7 之间的记录
DELETE FROM students WHERE id >= 5 AND id <= 7;

-- 删除所有分数低于 60 的记录
DELETE FROM students WHERE score < 60;
```

### 删除所有记录

```sql
-- 危险！删除所有记录（保留表结构）
DELETE FROM students;

-- 更高效的方式：TRUNCATE（重置自增ID）
TRUNCATE TABLE students;
```

### DELETE vs TRUNCATE

| 操作 | DELETE | TRUNCATE |
|:---|:---|:---|
| 速度 | 较慢（逐行删除） | 很快（直接清空） |
| WHERE 条件 | 支持 | 不支持 |
| 自增 ID | 不重置 | 重置为初始值 |
| 回滚 | 支持（事务内） | 不支持 |
| 触发器 | 触发 | 不触发 |

### 多表删除

```sql
-- 关联删除
DELETE s FROM students s
JOIN classes c ON s.class_id = c.id
WHERE c.name = '已删除班级';

-- 删除多个表的数据
DELETE s, c FROM students s
JOIN classes c ON s.class_id = c.id
WHERE c.id = 999;
```

### DELETE 返回值

```sql
mysql> DELETE FROM students WHERE id = 1;
Query OK, 1 row affected (0.01 sec)

mysql> DELETE FROM students WHERE id = 999;
Query OK, 0 rows affected (0.01 sec)
```

## 安全操作建议

### 1. 先查询后操作

```sql
-- 先查询确认
SELECT * FROM students WHERE score < 60;

-- 确认无误后再执行
DELETE FROM students WHERE score < 60;
```

### 2. 使用事务

```sql
BEGIN;
DELETE FROM students WHERE score < 60;
-- 检查结果
SELECT * FROM students;
-- 确认无误后提交
COMMIT;
-- 或者回滚
ROLLBACK;
```

### 3. 使用 LIMIT 限制

```sql
-- 只删除前 10 条符合条件的记录
DELETE FROM students WHERE score < 60 LIMIT 10;

-- 只更新前 100 条记录
UPDATE students SET score = 60 WHERE score < 60 LIMIT 100;
```

### 4. 备份数据

```sql
-- 删除前备份
CREATE TABLE students_backup AS SELECT * FROM students WHERE score < 60;

-- 确认备份后再删除
DELETE FROM students WHERE score < 60;
```

## 实战示例

### 示例 1：批量更新

```sql
-- 批量更新学生班级
UPDATE students SET class_id = 2 WHERE id IN (1, 2, 3, 4, 5);
```

### 示例 2：条件插入

```sql
-- 只插入不存在的记录
INSERT INTO students (name, gender, score)
SELECT '新学生', 'M', 80
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM students WHERE name = '新学生'
);
```

### 示例 3：级联更新

```sql
-- 更新学生成绩，同时更新班级平均分
BEGIN;
UPDATE students SET score = 95 WHERE id = 1;
UPDATE classes SET avg_score = (
    SELECT AVG(score) FROM students WHERE class_id = 1
) WHERE id = 1;
COMMIT;
```

## 总结

### 操作对比

| 操作 | 语法 | 说明 |
|:---|:---|:---|
| INSERT | `INSERT INTO 表名 (...) VALUES (...)` | 插入数据 |
| UPDATE | `UPDATE 表名 SET ... WHERE ...` | 更新数据 |
| DELETE | `DELETE FROM 表名 WHERE ...` | 删除数据 |
| TRUNCATE | `TRUNCATE TABLE 表名` | 清空表 |

### 最佳实践

1. **始终使用 WHERE 条件**：避免误操作全表
2. **先查询后操作**：确认影响范围
3. **使用事务**：重要操作放在事务中
4. **备份数据**：删除前先备份
5. **使用 LIMIT**：限制影响行数
