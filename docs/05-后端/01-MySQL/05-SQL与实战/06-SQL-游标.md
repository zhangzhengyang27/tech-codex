---
title: SQL-游标
description: MySQL 游标详解：DECLARE/OPEN/FETCH/CLOSE 四步用法、与 NOT FOUND 处理程序配合的三种循环、实战案例（条件更新/数据迁移/排名计算）与游标性能优化建议
keywords: [游标, 逐行处理, 存储过程, FETCH]
category: MySQL
tags: [SQL, 游标]
---

# SQL-游标

游标（Cursor）是一种数据库对象，用于遍历查询结果集中的数据行。游标让 SQL 这种面向集合的语言具备了面向过程的处理能力，可以逐行处理数据。

## 游标概述

### 什么是游标

游标是指向查询结果集中某一行的指针。通过游标，可以从结果集中逐行提取数据进行处理。

### 面向集合 vs 面向过程

| 方式 | 特点 | 适用场景 |
|:---|:---|:---|
| 面向集合 | 一次性操作多行数据 | 批量更新、统计汇总 |
| 面向过程 | 逐行处理数据 | 复杂行级计算、条件处理 |

### 游标的用途

- 逐行处理复杂逻辑
- 根据每行数据执行不同操作
- 在存储过程中遍历结果集
- 实现复杂的数据转换

## 使用游标的步骤

使用游标需要经历五个步骤：

### 1. 定义游标

```sql
-- MySQL、SQL Server、DB2、MariaDB 语法
DECLARE 游标名 CURSOR FOR SELECT 语句;

-- Oracle 语法（PostgreSQL 与 MySQL 一样用 CURSOR FOR）
DECLARE 游标名 CURSOR IS SELECT 语句;
```

示例：

```sql
DECLARE cur_hero CURSOR FOR 
    SELECT hp_max FROM heros;
```

### 2. 打开游标

```sql
OPEN 游标名;
```

打开游标时，SELECT 语句被执行，结果集被加载到游标工作区。

### 3. 获取数据

```sql
FETCH 游标名 INTO 变量名 [, 变量名...];
```

FETCH 语句将当前行的数据读取到变量中，并将游标指针移动到下一行。

### 4. 关闭游标

```sql
CLOSE 游标名;
```

关闭游标后，无法再从结果集中获取数据，如需再次使用需要重新打开。

### 5. 释放游标

```sql
DEALLOCATE 游标名;
```

释放游标占用的内存资源。**注意：`DEALLOCATE` 是 SQL Server 等数据库的语法；MySQL 中没有针对游标的 DEALLOCATE 语句（8.0.46 实测报语法错误），`CLOSE` 关闭游标时即完成资源释放**。另外 `DEALLOCATE PREPARE` 是用于释放预处理语句的另一个语法，与游标无关。

> **注意**：MySQL 中游标只需 OPEN / FETCH / CLOSE 三步即可完整使用，关闭即释放。

## 游标基本示例

### 简单累加示例

```sql
DELIMITER //

CREATE PROCEDURE calc_hp_max()
BEGIN
    DECLARE hp INT;
    DECLARE hp_sum INT DEFAULT 0;
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE cur_hero CURSOR FOR SELECT hp_max FROM heros;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur_hero;
    
    read_loop: LOOP
        FETCH cur_hero INTO hp;
        
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        SET hp_sum = hp_sum + hp;
    END LOOP;
    
    CLOSE cur_hero;
    
    SELECT hp_sum;
END //

DELIMITER ;
```

### 关键点说明

1. **DECLARE 顺序**：变量声明必须在游标声明之前，处理程序必须在游标声明之后
2. **CONTINUE HANDLER**：处理游标遍历结束的情况
3. **done 标志**：用于判断游标是否已遍历完所有数据

## 游标循环方式

### LOOP 循环

```sql
DELIMITER //

CREATE PROCEDURE cursor_loop_example()
BEGIN
    DECLARE val INT;
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur CURSOR FOR SELECT id FROM students;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    my_loop: LOOP
        FETCH cur INTO val;
        
        IF done THEN
            LEAVE my_loop;
        END IF;
        
        -- 处理逻辑
    END LOOP my_loop;
    
    CLOSE cur;
END //

DELIMITER ;
```

### REPEAT 循环

```sql
DELIMITER //

CREATE PROCEDURE cursor_repeat_example()
BEGIN
    DECLARE val INT;
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur CURSOR FOR SELECT id FROM students;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    REPEAT
        FETCH cur INTO val;
        
        IF NOT done THEN
            -- 处理逻辑
        END IF;
    UNTIL done END REPEAT;
    
    CLOSE cur;
END //

DELIMITER ;
```

### WHILE 循环

```sql
DELIMITER //

CREATE PROCEDURE cursor_while_example()
BEGIN
    DECLARE val INT;
    DECLARE done INT DEFAULT FALSE;
    DECLARE cur CURSOR FOR SELECT id FROM students;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    FETCH cur INTO val;
    
    WHILE NOT done DO
        -- 处理逻辑
        FETCH cur INTO val;
    END WHILE;
    
    CLOSE cur;
END //

DELIMITER ;
```

## 游标实战案例

### 案例 1：条件更新

根据不同条件更新英雄的物攻成长值：

```sql
DELIMITER //

CREATE PROCEDURE alter_attack_growth()
BEGIN
    DECLARE temp_id INT;
    DECLARE temp_growth, temp_max, temp_start, temp_diff FLOAT;
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE cur_hero CURSOR FOR 
        SELECT id, attack_growth, attack_max, attack_start 
        FROM heros;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur_hero;
    FETCH cur_hero INTO temp_id, temp_growth, temp_max, temp_start;
    
    REPEAT
        IF NOT done THEN
            SET temp_diff = temp_max - temp_start;
            
            IF temp_growth < 5 THEN
                IF temp_diff > 200 THEN
                    SET temp_growth = temp_growth * 1.1;
                ELSEIF temp_diff >= 150 AND temp_diff <= 200 THEN
                    SET temp_growth = temp_growth * 1.08;
                ELSEIF temp_diff < 150 THEN
                    SET temp_growth = temp_growth * 1.07;
                END IF;
            ELSEIF temp_growth >= 5 AND temp_growth <= 10 THEN
                SET temp_growth = temp_growth * 1.05;
            END IF;
            
            UPDATE heros 
            SET attack_growth = ROUND(temp_growth, 3) 
            WHERE id = temp_id;
        END IF;
        
        FETCH cur_hero INTO temp_id, temp_growth, temp_max, temp_start;
    UNTIL done END REPEAT;
    
    CLOSE cur_hero;
END //

DELIMITER ;
```

### 案例 2：数据迁移

```sql
DELIMITER //

CREATE PROCEDURE migrate_data()
BEGIN
    DECLARE v_id INT;
    DECLARE v_name VARCHAR(100);
    DECLARE v_score INT;
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE cur_data CURSOR FOR 
        SELECT id, name, score FROM source_table;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur_data;
    
    migrate_loop: LOOP
        FETCH cur_data INTO v_id, v_name, v_score;
        
        IF done THEN
            LEAVE migrate_loop;
        END IF;
        
        INSERT INTO target_table (id, name, score, create_time)
        VALUES (v_id, v_name, v_score, NOW());
    END LOOP;
    
    CLOSE cur_data;
END //

DELIMITER ;
```

### 案例 3：批量计算

```sql
DELIMITER //

CREATE PROCEDURE calculate_student_rank()
BEGIN
    DECLARE v_id INT;
    DECLARE v_score INT;
    DECLARE v_rank INT DEFAULT 0;
    DECLARE v_prev_score INT DEFAULT -1;
    DECLARE done INT DEFAULT FALSE;
    
    DECLARE cur_student CURSOR FOR 
        SELECT id, score FROM students ORDER BY score DESC;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur_student;
    
    rank_loop: LOOP
        FETCH cur_student INTO v_id, v_score;
        
        IF done THEN
            LEAVE rank_loop;
        END IF;
        
        IF v_score != v_prev_score THEN
            SET v_rank = v_rank + 1;
        END IF;
        
        UPDATE students SET score_rank = v_rank WHERE id = v_id;
        SET v_prev_score = v_score;
    END LOOP;
    
    CLOSE cur_student;
END //

DELIMITER ;
```

> **注意**：`rank` 是 MySQL 8.0 新增窗口函数后引入的保留字，不能直接用作列名（8.0.46 实测 `CREATE TABLE t(rank INT)` 报语法错误，需加反引号），示例中使用 `score_rank` 作为列名。

## 游标属性

### MySQL 游标属性

MySQL 游标相对简单，主要通过 NOT FOUND 处理程序来判断游标状态。

### SQL Server 游标属性

```sql
-- 检查游标状态
@@CURSOR_ROWS    -- 结果集行数
@@FETCH_STATUS   -- FETCH 状态（0=成功，-1=超出范围，-2=行不存在）
```

### Oracle 游标属性

```sql
cursor_name%FOUND      -- 是否找到数据
cursor_name%NOTFOUND   -- 是否未找到数据
cursor_name%ROWCOUNT   -- 已处理的行数
cursor_name%ISOPEN     -- 游标是否打开
```

## 游标性能优化

### 1. 优先使用集合操作

```sql
-- 差：使用游标逐行更新
DECLARE cur CURSOR FOR SELECT id FROM students WHERE score < 60;
-- ...逐行更新...

-- 好：使用集合操作
UPDATE students SET score = 60 WHERE score < 60;
```

### 2. 减少游标内的操作

```sql
-- 差：游标内执行复杂操作
LOOP
    FETCH cur INTO v_id;
    -- 复杂计算
    -- 多次查询
    -- 多次更新
END LOOP;

-- 好：简化游标内操作
LOOP
    FETCH cur INTO v_id;
    -- 简单处理
END LOOP;
```

### 3. 使用合适的游标类型

| 游标类型 | 特点 | 适用场景 |
|:---|:---|:---|
| 静态游标 | 结果集快照 | 只读遍历 |
| 动态游标 | 实时反映变化 | 需要最新数据 |
| 只进游标 | 只能向前移动 | 单向遍历 |
| 可滚动游标 | 可任意移动 | 需要回溯 |

### 4. 及时关闭游标

```sql
-- 始终确保游标被关闭
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        IF cur_is_open THEN
            CLOSE cur;
        END IF;
    END;
    
    OPEN cur;
    -- 处理逻辑
    CLOSE cur;
END;
```

## 游标 vs 集合操作

### 对比分析

| 特性 | 游标 | 集合操作 |
|:---|:---|:---|
| 性能 | 较慢（逐行处理） | 快（批量处理） |
| 内存 | 占用较多 | 占用较少 |
| 复杂度 | 可处理复杂逻辑 | 适合简单逻辑 |
| 灵活性 | 高 | 低 |
| 代码量 | 多 | 少 |

### 选择建议

**使用游标**：
- 每行需要不同的处理逻辑
- 需要根据前一行数据决定当前行处理
- 复杂的数据转换和计算
- 需要调用外部程序或存储过程

**使用集合操作**：
- 简单的批量更新
- 统计汇总
- 数据迁移
- 性能要求高的场景

## 最佳实践

### 1. 声明顺序

```sql
-- 正确的声明顺序
BEGIN
    -- 1. 局部变量
    DECLARE v_id INT;
    DECLARE v_name VARCHAR(100);
    
    -- 2. 游标
    DECLARE cur CURSOR FOR SELECT id, name FROM table;
    
    -- 3. 处理程序
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    -- 4. 业务逻辑
    OPEN cur;
    -- ...
END;
```

### 2. 错误处理

```sql
DELIMITER //

CREATE PROCEDURE safe_cursor_example()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_id INT;
    DECLARE cur CURSOR FOR SELECT id FROM students;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        CLOSE cur;
        RESIGNAL;
    END;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO v_id;
        IF done THEN LEAVE read_loop; END IF;
        -- 处理逻辑
    END LOOP;
    
    CLOSE cur;
END //

DELIMITER ;
```

### 3. 使用标签

```sql
-- 使用标签提高可读性
process_loop: LOOP
    FETCH cur INTO v_data;
    
    IF done THEN
        LEAVE process_loop;
    END IF;
    
    -- 处理逻辑
END LOOP process_loop;
```

## 总结

### 游标使用步骤

| 步骤 | 语法 |
|:---|:---|
| 定义 | `DECLARE 游标名 CURSOR FOR SELECT ...` |
| 打开 | `OPEN 游标名` |
| 获取 | `FETCH 游标名 INTO 变量` |
| 关闭 | `CLOSE 游标名` |

### 游标特点

| 特点 | 说明 |
|:---|:---|
| 逐行处理 | 面向过程的处理方式 |
| 灵活性高 | 可根据每行数据执行不同操作 |
| 性能较低 | 相比集合操作效率较低 |
| 资源占用 | 需要正确关闭释放 |

### 最佳实践

1. **优先使用集合操作**：能用 SQL 批量处理的就不用游标
2. **正确声明顺序**：变量 → 游标 → 处理程序
3. **处理游标结束**：使用 NOT FOUND 处理程序
4. **及时关闭游标**：避免资源泄漏
5. **简化游标内操作**：减少每行的处理复杂度
