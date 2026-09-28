---
title: SQL-存储过程
description: MySQL 存储过程详解：创建与 CALL 调用、DELIMITER 定界符、IN/OUT/INOUT 参数、IF/CASE/WHILE/REPEAT/LOOP 流程控制、错误处理 HANDLER、游标与实战案例及适用场景
keywords: [存储过程, 游标, 触发器, 批量处理]
category: MySQL
tags: [SQL, 存储过程]
---

# SQL-存储过程

存储过程（Stored Procedure）是一组预编译的 SQL 语句集合，存储在数据库中，可以通过名称调用执行。存储过程可以接收参数、返回结果，是实现业务逻辑封装的重要手段。

## 存储过程概述

### 什么是存储过程

存储过程是 SQL 语句和流程控制语句的预编译集合，存储在数据库服务器上，用户通过指定存储过程名称并给出参数来执行。

### 存储过程 vs 视图

| 特性 | 存储过程 | 视图 |
|:---|:---|:---|
| 本质 | 程序化的 SQL 代码块 | 虚拟表 |
| 操作 | 直接操作底层数据表 | 通常只读查询 |
| 参数 | 支持输入/输出参数 | 不支持参数 |
| 返回 | 可返回多个结果集 | 返回单一结果集 |
| 复杂度 | 可包含复杂逻辑 | 主要是 SELECT 语句 |

### 存储过程的优点

| 优点 | 说明 |
|:---|:---|
| 性能优化 | 预编译执行，减少解析时间 |
| 代码复用 | 封装业务逻辑，一次编写多次调用 |
| 安全性 | 可控制执行权限，隐藏表结构 |
| 减少网络流量 | 只需传输调用语句，而非大量 SQL |
| 事务控制 | 可在存储过程中管理事务 |

### 存储过程的缺点

| 缺点 | 说明 |
|:---|:---|
| 可移植性差 | 不同数据库语法差异大 |
| 调试困难 | 缺乏完善的调试工具 |
| 版本管理 | 难以进行版本控制 |
| 扩展性差 | 不适合高并发分布式场景 |

## 创建存储过程

### 基本语法

```sql
CREATE PROCEDURE 存储过程名称([参数列表])
BEGIN
    SQL 语句
END;
```

### DELIMITER 定界符

MySQL 默认使用 `;` 作为语句结束符。存储过程内部包含多条 SQL 语句，需要临时更改结束符：

```sql
DELIMITER //

CREATE PROCEDURE 存储过程名称()
BEGIN
    -- SQL 语句
END //

DELIMITER ;
```

> **说明**：Navicat 等工具会自动处理定界符，MySQL 命令行需要手动设置。

### 简单示例

```sql
DELIMITER //

CREATE PROCEDURE get_all_students()
BEGIN
    SELECT * FROM students;
END //

DELIMITER ;

-- 调用存储过程
CALL get_all_students();
```

## 参数类型

存储过程支持三种参数类型：

| 参数类型 | 关键字 | 说明 |
|:---|:---|:---|
| 输入参数 | IN | 调用时传入，存储过程内部可修改但不返回 |
| 输出参数 | OUT | 存储过程设置值并返回给调用者 |
| 输入输出参数 | INOUT | 既是输入参数，也是输出参数 |

### IN 参数示例

```sql
DELIMITER //

CREATE PROCEDURE get_students_by_score(IN min_score INT)
BEGIN
    SELECT * FROM students WHERE score >= min_score;
END //

DELIMITER ;

-- 调用
CALL get_students_by_score(80);
```

### OUT 参数示例

```sql
DELIMITER //

CREATE PROCEDURE get_score_stats(
    OUT max_score INT,
    OUT min_score INT,
    OUT avg_score FLOAT
)
BEGIN
    SELECT MAX(score) INTO max_score FROM students;
    SELECT MIN(score) INTO min_score FROM students;
    SELECT AVG(score) INTO avg_score FROM students;
END //

DELIMITER ;

-- 调用
CALL get_score_stats(@max, @min, @avg);
SELECT @max, @min, @avg;
```

### INOUT 参数示例

```sql
DELIMITER //

CREATE PROCEDURE double_value(INOUT num INT)
BEGIN
    SET num = num * 2;
END //

DELIMITER ;

-- 调用
SET @value = 10;
CALL double_value(@value);
SELECT @value;  -- 结果为 20
```

### 多参数综合示例

```sql
DELIMITER //

CREATE PROCEDURE get_hero_scores(
    OUT max_hp FLOAT,
    OUT min_mp FLOAT,
    OUT avg_attack FLOAT,
    IN role_type VARCHAR(255)
)
BEGIN
    SELECT MAX(hp_max) INTO max_hp FROM heros WHERE role_main = role_type;
    SELECT MIN(mp_max) INTO min_mp FROM heros WHERE role_main = role_type;
    SELECT AVG(attack_max) INTO avg_attack FROM heros WHERE role_main = role_type;
END //

DELIMITER ;

-- 调用
CALL get_hero_scores(@max_hp, @min_mp, @avg_attack, '战士');
SELECT @max_hp, @min_mp, @avg_attack;
```

## 流程控制语句

### 变量声明与赋值

```sql
-- 声明变量
DECLARE 变量名 数据类型 [DEFAULT 默认值];

-- 赋值
SET 变量名 = 值;

-- SELECT INTO 赋值
SELECT 列名 INTO 变量名 FROM 表名 WHERE 条件;
```

### BEGIN...END 语句块

```sql
BEGIN
    -- 多条 SQL 语句
    DECLARE i INT DEFAULT 1;
    DECLARE sum INT DEFAULT 0;
    
    WHILE i <= 10 DO
        SET sum = sum + i;
        SET i = i + 1;
    END WHILE;
    
    SELECT sum;
END;
```

### IF 条件判断

```sql
IF 条件 THEN
    语句;
ELSEIF 条件 THEN
    语句;
ELSE
    语句;
END IF;
```

示例：

```sql
DELIMITER //

CREATE PROCEDURE get_grade(IN score INT, OUT grade CHAR(1))
BEGIN
    IF score >= 90 THEN
        SET grade = 'A';
    ELSEIF score >= 80 THEN
        SET grade = 'B';
    ELSEIF score >= 70 THEN
        SET grade = 'C';
    ELSEIF score >= 60 THEN
        SET grade = 'D';
    ELSE
        SET grade = 'F';
    END IF;
END //

DELIMITER ;
```

### CASE 语句

```sql
CASE
    WHEN 条件1 THEN 语句1
    WHEN 条件2 THEN 语句2
    ELSE 语句3
END CASE;
```

示例：

```sql
DELIMITER //

CREATE PROCEDURE get_level(IN score INT, OUT level VARCHAR(20))
BEGIN
    CASE
        WHEN score >= 90 THEN SET level = '优秀';
        WHEN score >= 80 THEN SET level = '良好';
        WHEN score >= 60 THEN SET level = '及格';
        ELSE SET level = '不及格';
    END CASE;
END //

DELIMITER ;
```

### WHILE 循环

```sql
WHILE 条件 DO
    语句;
END WHILE;
```

示例：计算 1 到 n 的累加和

```sql
DELIMITER //

CREATE PROCEDURE add_num(IN n INT)
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE sum INT DEFAULT 0;
    
    WHILE i <= n DO
        SET sum = sum + i;
        SET i = i + 1;
    END WHILE;
    
    SELECT sum;
END //

DELIMITER ;

-- 调用
CALL add_num(100);  -- 结果：5050
```

### REPEAT 循环

```sql
REPEAT
    语句;
UNTIL 条件 END REPEAT;
```

示例：

```sql
DELIMITER //

CREATE PROCEDURE add_num_repeat(IN n INT)
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE sum INT DEFAULT 0;
    
    REPEAT
        SET sum = sum + i;
        SET i = i + 1;
    UNTIL i > n END REPEAT;
    
    SELECT sum;
END //

DELIMITER ;
```

### LOOP 循环

```sql
循环标签: LOOP
    语句;
    IF 退出条件 THEN
        LEAVE 循环标签;
    END IF;
END LOOP 循环标签;
```

示例：

```sql
DELIMITER //

CREATE PROCEDURE add_num_loop(IN n INT)
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE sum INT DEFAULT 0;
    
    add_loop: LOOP
        SET sum = sum + i;
        SET i = i + 1;
        
        IF i > n THEN
            LEAVE add_loop;
        END IF;
    END LOOP add_loop;
    
    SELECT sum;
END //

DELIMITER ;
```

### ITERATE 继续循环

ITERATE 类似于其他语言的 continue，跳过本次循环继续下一次：

```sql
DELIMITER //

CREATE PROCEDURE sum_even(IN n INT)
BEGIN
    DECLARE i INT DEFAULT 0;
    DECLARE sum INT DEFAULT 0;
    
    even_loop: LOOP
        SET i = i + 1;
        
        IF i > n THEN
            LEAVE even_loop;
        END IF;
        
        -- 跳过奇数
        IF i % 2 = 1 THEN
            ITERATE even_loop;
        END IF;
        
        SET sum = sum + i;
    END LOOP even_loop;
    
    SELECT sum;
END //

DELIMITER ;
```

## 管理存储过程

### 查看存储过程

```sql
-- 查看存储过程状态
SHOW PROCEDURE STATUS WHERE Db = '数据库名';

-- 查看存储过程定义
SHOW CREATE PROCEDURE 存储过程名;

-- 从 information_schema 查询
SELECT * FROM information_schema.ROUTINES 
WHERE ROUTINE_TYPE = 'PROCEDURE' AND ROUTINE_SCHEMA = '数据库名';
```

### 修改存储过程

```sql
ALTER PROCEDURE 存储过程名 
COMMENT '新的注释';
```

> **注意**：ALTER PROCEDURE 只能修改存储过程的特征，不能修改存储过程体。如需修改过程体，需要删除后重新创建。

### 删除存储过程

```sql
DROP PROCEDURE 存储过程名;

-- 如果存在则删除
DROP PROCEDURE IF EXISTS 存储过程名;
```

## 错误处理

### DECLARE HANDLER

```sql
DECLARE 处理方式 HANDLER FOR 错误类型 处理语句;
```

- **处理方式**：CONTINUE（继续执行）或 EXIT（退出）
- **错误类型**：SQLSTATE 值、错误码或条件名

### 错误处理示例

```sql
DELIMITER //

CREATE PROCEDURE safe_transfer(
    IN from_id INT,
    IN to_id INT,
    IN amount DECIMAL(10,2),
    OUT result VARCHAR(100)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET result = '转账失败，已回滚';
    END;
    
    START TRANSACTION;
    
    UPDATE accounts SET balance = balance - amount WHERE id = from_id;
    UPDATE accounts SET balance = balance + amount WHERE id = to_id;
    
    COMMIT;
    SET result = '转账成功';
END //

DELIMITER ;
```

## 实战案例

### 案例 1：批量处理

```sql
DELIMITER //

CREATE PROCEDURE batch_update_scores()
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE student_id INT;
    DECLARE cur CURSOR FOR SELECT id FROM students WHERE score < 60;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
    
    OPEN cur;
    
    read_loop: LOOP
        FETCH cur INTO student_id;
        IF done THEN
            LEAVE read_loop;
        END IF;
        
        UPDATE students SET score = 60 WHERE id = student_id;
    END LOOP;
    
    CLOSE cur;
    
    SELECT '批量更新完成' AS result;
END //

DELIMITER ;
```

### 案例 2：统计汇总

```sql
DELIMITER //

CREATE PROCEDURE get_sum_score(
    IN r_main VARCHAR(255),
    OUT total_hp FLOAT
)
BEGIN
    SELECT SUM(hp_max) INTO total_hp 
    FROM heros 
    WHERE role_main = r_main;
END //

DELIMITER ;

-- 调用
CALL get_sum_score('坦克', @total);
SELECT @total;
```

> **注意**：存储过程的参数名不要与表中的字段名相同。如果参数也叫 `role_main`，`WHERE role_main = role_main` 会被解析成"列与列比较"，恒为 TRUE，统计到的将是全表数据而非指定角色的数据。

### 案例 3：分页查询

```sql
DELIMITER //

CREATE PROCEDURE get_students_page(
    IN page_num INT,
    IN page_size INT
)
BEGIN
    DECLARE offset_val INT;
    SET offset_val = (page_num - 1) * page_size;
    
    SELECT * FROM students 
    ORDER BY id 
    LIMIT offset_val, page_size;
END //

DELIMITER ;

-- 调用：获取第 2 页，每页 10 条
CALL get_students_page(2, 10);
```

## 存储过程最佳实践

### 1. 何时使用存储过程

**适合使用**：
- 复杂的数据处理逻辑
- 需要事务控制的操作
- 频繁执行的固定业务
- 对性能要求较高的场景

**不适合使用**：
- 简单的 CRUD 操作
- 需要跨数据库移植的项目
- 高并发分布式系统
- 业务逻辑经常变化的场景

### 2. 命名规范

```sql
-- 推荐命名方式
sp_表名_操作    -- 如：sp_student_insert
proc_功能描述   -- 如：proc_calculate_score
```

### 3. 注释规范

```sql
DELIMITER //

CREATE PROCEDURE sp_transfer_funds(
    -- 从账户 A 转账到账户 B
    IN from_account INT,      -- 转出账户ID
    IN to_account INT,        -- 转入账户ID
    IN transfer_amount DECIMAL(10,2),  -- 转账金额
    OUT result_msg VARCHAR(100)        -- 结果消息
)
BEGIN
    -- 实现逻辑
END //

DELIMITER ;
```

## 总结

### 存储过程操作

| 操作 | 语法 |
|:---|:---|
| 创建 | `CREATE PROCEDURE 名称([参数]) BEGIN...END` |
| 调用 | `CALL 名称([参数])` |
| 查看 | `SHOW CREATE PROCEDURE 名称` |
| 删除 | `DROP PROCEDURE 名称` |

### 参数类型

| 类型 | 说明 |
|:---|:---|
| IN | 输入参数 |
| OUT | 输出参数 |
| INOUT | 输入输出参数 |

### 最佳实践

1. **合理使用**：复杂逻辑用存储过程，简单操作用 SQL
2. **事务控制**：重要操作放在事务中
3. **错误处理**：使用 DECLARE HANDLER 处理异常
4. **命名规范**：使用统一的前缀和命名规则
5. **注释完善**：添加清晰的注释说明
