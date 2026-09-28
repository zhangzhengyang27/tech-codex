---
title: SQL 函数
description: SQL 常用内置函数速查：算术函数（ABS/ROUND/MOD 等）、字符串函数（CONCAT/LENGTH/CHAR_LENGTH/SUBSTRING 等）、日期函数（NOW/DATE_FORMAT/DATE_ADD/DATEDIFF 等）与转换函数（CAST/COALESCE/IFNULL/NULLIF），以及可移植性、索引与 NULL 处理注意事项
keywords: [SQL函数, 字符串函数, 日期函数, 聚合函数]
category: 数据库基础
tags: [SQL, 函数]
---

# SQL 函数

SQL 提供了丰富的内置函数，用于对检索出来的数据进行处理和转换。本章介绍常用的 SQL 函数及其使用方法。

## 函数分类

SQL 内置函数主要分为以下几类：

| 类型 | 说明 | 示例函数 |
|:---|:---|:---|
| 算术函数 | 数值计算 | ABS、ROUND、MOD |
| 字符串函数 | 字符串处理 | CONCAT、LENGTH、SUBSTRING |
| 日期函数 | 日期时间处理 | DATE、YEAR、MONTH |
| 转换函数 | 类型转换 | CAST、COALESCE |

## 算术函数

### 常用算术函数

| 函数 | 说明 | 示例 |
|:---|:---|:---|
| ABS(num) | 绝对值 | `ABS(-2)` → 2 |
| MOD(num, divisor) | 取余 | `MOD(101, 3)` → 2 |
| ROUND(num, decimals) | 四舍五入 | `ROUND(37.25, 1)` → 37.3 |
| CEIL(num) | 向上取整 | `CEIL(37.25)` → 38 |
| FLOOR(num) | 向下取整 | `FLOOR(37.25)` → 37 |
| POWER(num, n) | 幂运算 | `POWER(2, 3)` → 8 |
| SQRT(num) | 平方根 | `SQRT(16)` → 4 |

### 使用示例

```sql
-- 查询英雄物攻成长，精确到小数点后一位
SELECT name, ROUND(attack_growth, 1) AS attack_growth
FROM heros;

-- 计算英雄的最大生命值与最大法力值之和
SELECT name, hp_max + mp_max AS total
FROM heros;

-- 计算英雄物攻成长的绝对值
SELECT name, ABS(attack_growth) AS abs_growth
FROM heros;
```

## 字符串函数

### 常用字符串函数

| 函数 | 说明 | 示例 |
|:---|:---|:---|
| CONCAT(str1, str2, ...) | 字符串拼接 | `CONCAT('abc', '123')` → 'abc123' |
| LENGTH(str) | 字节长度 | `LENGTH('你好')` → 6 |
| CHAR_LENGTH(str) | 字符长度 | `CHAR_LENGTH('你好')` → 2 |
| LOWER(str) | 转小写 | `LOWER('ABC')` → 'abc' |
| UPPER(str) | 转大写 | `UPPER('abc')` → 'ABC' |
| REPLACE(str, old, new) | 替换 | `REPLACE('fabcd', 'abc', '123')` → 'f123d' |
| SUBSTRING(str, pos, len) | 截取 | `SUBSTRING('fabcd', 1, 3)` → 'fab' |
| TRIM(str) | 去除首尾空格 | `TRIM(' abc ')` → 'abc' |
| LEFT(str, len) | 左截取 | `LEFT('abcdef', 3)` → 'abc' |
| RIGHT(str, len) | 右截取 | `RIGHT('abcdef', 3)` → 'def' |
| INSTR(str, substr) | 查找位置 | `INSTR('abcdef', 'cd')` → 3 |
| LPAD(str, len, pad) | 左填充 | `LPAD('abc', 5, 'x')` → 'xxabc' |
| RPAD(str, len, pad) | 右填充 | `RPAD('abc', 5, 'x')` → 'abcxx' |

### LENGTH vs CHAR_LENGTH

```sql
-- LENGTH：返回字节数（UTF-8 编码下，中文占 3 字节）
SELECT LENGTH('你好');      -- 结果：6
SELECT LENGTH('Hello');     -- 结果：5

-- CHAR_LENGTH：返回字符数
SELECT CHAR_LENGTH('你好');  -- 结果：2
SELECT CHAR_LENGTH('Hello'); -- 结果：5
```

### 使用示例

```sql
-- 查询英雄名字及其字符长度
SELECT name, CHAR_LENGTH(name) AS name_length
FROM heros;

-- 拼接英雄名称和主要定位
SELECT CONCAT(name, ' - ', role_main) AS hero_info
FROM heros;

-- 查询名字以"张"开头的英雄
SELECT name FROM heros WHERE LEFT(name, 1) = '张';

-- 替换英雄名称中的特定字符
SELECT REPLACE(name, '·', '-') AS name
FROM heros;
```

## 日期函数

### 常用日期函数

| 函数 | 说明 | 示例 |
|:---|:---|:---|
| CURRENT_DATE() | 当前日期 | `CURRENT_DATE()` → '2024-01-15' |
| CURRENT_TIME() | 当前时间 | `CURRENT_TIME()` → '14:30:00' |
| NOW() | 当前日期时间 | `NOW()` → '2024-01-15 14:30:00' |
| DATE(datetime) | 提取日期 | `DATE('2024-01-15 14:30:00')` → '2024-01-15' |
| TIME(datetime) | 提取时间 | `TIME('2024-01-15 14:30:00')` → '14:30:00' |
| YEAR(date) | 提取年份 | `YEAR('2024-01-15')` → 2024 |
| MONTH(date) | 提取月份 | `MONTH('2024-01-15')` → 1 |
| DAY(date) | 提取日 | `DAY('2024-01-15')` → 15 |
| HOUR(time) | 提取小时 | `HOUR('14:30:00')` → 14 |
| MINUTE(time) | 提取分钟 | `MINUTE('14:30:00')` → 30 |
| SECOND(time) | 提取秒 | `SECOND('14:30:00')` → 0 |
| EXTRACT(unit FROM date) | 提取指定部分 | `EXTRACT(YEAR FROM '2024-01-15')` → 2024 |
| DATE_FORMAT(date, format) | 格式化日期 | `DATE_FORMAT(NOW(), '%Y-%m')` → '2024-01' |
| DATE_ADD(date, INTERVAL n unit) | 日期加 | `DATE_ADD(NOW(), INTERVAL 1 DAY)` |
| DATE_SUB(date, INTERVAL n unit) | 日期减 | `DATE_SUB(NOW(), INTERVAL 1 MONTH)` |
| DATEDIFF(date1, date2) | 日期差 | `DATEDIFF('2024-01-20', '2024-01-15')` → 5 |

### EXTRACT 单位

| 单位 | 说明 |
|:---|:---|
| YEAR | 年 |
| MONTH | 月 |
| DAY | 日 |
| HOUR | 时 |
| MINUTE | 分 |
| SECOND | 秒 |

### 使用示例

```sql
-- 查询英雄上线年份
SELECT name, YEAR(birthdate) AS birth_year
FROM heros
WHERE birthdate IS NOT NULL;

-- 使用 EXTRACT 提取年份
SELECT name, EXTRACT(YEAR FROM birthdate) AS birth_year
FROM heros
WHERE birthdate IS NOT NULL;

-- 查询 2016 年 10 月 1 日之后上线的英雄
SELECT name, birthdate
FROM heros
WHERE DATE(birthdate) > '2016-10-01';

-- 查询最近 30 天的数据
SELECT * FROM orders
WHERE order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY);

-- 计算两个日期之间的天数
SELECT DATEDIFF('2024-12-31', '2024-01-01') AS days;
```

### 日期比较注意事项

```sql
-- 推荐：使用 DATE 函数确保只比较日期部分（birth_date 为 DATETIME 时尤其重要）
SELECT * FROM heros WHERE DATE(birthdate) > '2016-10-01';

-- 不推荐：直接比较可能包含时间部分
SELECT * FROM heros WHERE birthdate > '2016-10-01';
```

> 注意：`DATE(birthdate)` 是为了保证比较结果的正确性；若该查询高频且追求索引利用率，应改写为下面的范围查询写法（见下文"性能考虑"）。

## 转换函数

### CAST 函数

```sql
-- 语法
CAST(expression AS type)

-- 转换为整数：MySQL 的 CAST 不支持 AS INT（直接报语法错误），应使用 SIGNED；
-- 且小数会被直接截断而不是四舍五入
SELECT CAST(123.123 AS SIGNED);  -- 结果：123

-- 转换为指定精度的小数
SELECT CAST(123.456 AS DECIMAL(8, 2));  -- 结果：123.46

-- 转换为字符串
SELECT CAST(123 AS CHAR);  -- 结果：'123'

-- 转换为日期
SELECT CAST('2024-01-15' AS DATE);  -- 结果：2024-01-15
```

### 支持的类型

| 类型 | 说明 |
|:---|:---|
| BINARY | 二进制 |
| CHAR | 字符串 |
| DATE | 日期 |
| DATETIME | 日期时间 |
| DECIMAL | 定点数 |
| SIGNED | 有符号整数 |
| UNSIGNED | 无符号整数 |

### COALESCE 函数

返回第一个非 NULL 值：

```sql
-- 返回第一个非空值
SELECT COALESCE(NULL, NULL, 1, 2);  -- 结果：1
SELECT COALESCE(NULL, 'default');   -- 结果：'default'

-- 为 NULL 值提供默认值
SELECT name, COALESCE(role_assist, '无') AS assist
FROM heros;
```

### 其他转换函数

```sql
-- IFNULL：MySQL 特有
SELECT IFNULL(role_assist, '无') FROM heros;

-- NULLIF：如果相等返回 NULL
SELECT NULLIF(10, 10);  -- 结果：NULL
SELECT NULLIF(10, 20);  -- 结果：10

-- CONVERT：类型转换
SELECT CONVERT('2024-01-15', DATE);
```

## 综合示例

### 示例 1：数据处理

```sql
-- 查询英雄信息，格式化显示
SELECT 
    name,
    UPPER(LEFT(name, 1)) AS first_char,
    CHAR_LENGTH(name) AS name_len,
    ROUND(hp_max / 1000, 2) AS hp_k,
    COALESCE(role_assist, '无') AS assist
FROM heros
WHERE birthdate IS NOT NULL;
```

### 示例 2：日期统计

```sql
-- 按年份统计英雄上线数量
SELECT 
    YEAR(birthdate) AS year,
    COUNT(*) AS hero_count
FROM heros
WHERE birthdate IS NOT NULL
GROUP BY YEAR(birthdate)
ORDER BY year;
```

### 示例 3：字符串处理

```sql
-- 查询名字长度大于 3 的英雄
SELECT name, CHAR_LENGTH(name) AS len
FROM heros
WHERE CHAR_LENGTH(name) > 3
ORDER BY len DESC;
```

### 示例 4：计算统计

```sql
-- 计算英雄属性总和与平均值
SELECT 
    name,
    hp_max + mp_max AS total,
    ROUND((hp_max + mp_max) / 2, 2) AS average,
    ROUND(hp_max / mp_max, 2) AS ratio
FROM heros
WHERE mp_max > 0;
```

## 函数使用注意事项

### 1. 可移植性问题

不同数据库的函数可能有差异：

| 功能 | MySQL | SQL Server | Oracle |
|:---|:---|:---|:---|
| 字符串拼接 | CONCAT() | + | \|\| |
| 当前日期 | NOW() | GETDATE() | SYSDATE |
| 字符串长度 | LENGTH() | LEN() | LENGTH() |

### 2. 性能考虑

```sql
-- 不推荐：在 WHERE 中使用函数（索引失效）
SELECT * FROM heros WHERE YEAR(birthdate) = 2016;

-- 推荐：使用范围查询
SELECT * FROM heros 
WHERE birthdate >= '2016-01-01' 
AND birthdate < '2017-01-01';
```

### 3. NULL 值处理

```sql
-- 任何函数与 NULL 运算结果都是 NULL
SELECT NULL + 1;           -- 结果：NULL
SELECT CONCAT('abc', NULL); -- 结果：NULL

-- 使用 COALESCE 处理 NULL
SELECT COALESCE(NULL, 0) + 1;  -- 结果：1
```

## 总结

### 函数分类速查

| 类型 | 常用函数 |
|:---|:---|
| 算术 | ABS、ROUND、CEIL、FLOOR、MOD |
| 字符串 | CONCAT、LENGTH、SUBSTRING、REPLACE、TRIM |
| 日期 | NOW、DATE、YEAR、MONTH、DATE_ADD、DATEDIFF |
| 转换 | CAST、COALESCE、IFNULL |

### 最佳实践

1. **注意可移植性**：不同数据库函数语法可能不同
2. **避免在 WHERE 中使用函数**：会导致索引失效
3. **处理 NULL 值**：使用 COALESCE 或 IFNULL
4. **日期比较**：使用 DATE 函数确保只比较日期部分
