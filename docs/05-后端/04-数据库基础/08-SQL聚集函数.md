---
title: SQL 聚集函数
description: SQL 五大聚集函数 COUNT/SUM/AVG/MAX/MIN：COUNT(*) 与 COUNT(列) 的区别、NULL 处理规则、DISTINCT 组合、GROUP BY 分组与 HAVING 过滤、子句书写与执行顺序，以及聚集查询的优化要点
keywords: [聚集函数, COUNT, SUM, AVG, GROUP BY]
category: 数据库基础
tags: [SQL, 聚集函数, 聚合查询]
---

# SQL 聚集函数

聚集函数（Aggregate Functions）用于对一组数据进行汇总计算，输入是一组数据的集合，输出是单个汇总值。常用于统计分析和报表生成。

## 聚集函数概述

### 五大聚集函数

| 函数 | 说明 | 适用类型 |
|:---|:---|:---|
| COUNT() | 统计行数 | 所有类型 |
| SUM() | 求和 | 数值类型 |
| AVG() | 平均值 | 数值类型 |
| MAX() | 最大值 | 所有类型 |
| MIN() | 最小值 | 所有类型 |

### 基本语法

```sql
SELECT 聚集函数(列名) FROM 表名 [WHERE 条件];
```

## COUNT 函数

### COUNT(*) vs COUNT(column)

```sql
-- COUNT(*)：统计所有行，包括 NULL
SELECT COUNT(*) FROM heros;
-- 结果：69（所有英雄）

-- COUNT(column)：统计非 NULL 行
SELECT COUNT(role_assist) FROM heros;
-- 结果：29（有次要定位的英雄）

-- COUNT(DISTINCT column)：统计不同值的数量
SELECT COUNT(DISTINCT role_main) FROM heros;
-- 结果：6（6 种主要定位）
```

### 带条件的 COUNT

```sql
-- 统计最大生命值大于 6000 的英雄数量
SELECT COUNT(*) FROM heros WHERE hp_max > 6000;

-- 统计最大生命值大于 6000 且有次要定位的英雄
SELECT COUNT(role_assist) FROM heros WHERE hp_max > 6000;
```

## SUM 和 AVG 函数

### 求和与平均值

```sql
-- 计算所有英雄的总生命值
SELECT SUM(hp_max) FROM heros;

-- 计算所有英雄的平均生命值
SELECT AVG(hp_max) FROM heros;

-- 保留小数位数
SELECT ROUND(AVG(hp_max), 2) AS avg_hp FROM heros;
```

### 组合使用

```sql
-- 计算射手英雄的统计信息
SELECT 
    COUNT(*) AS hero_count,
    SUM(hp_max) AS total_hp,
    ROUND(AVG(hp_max), 2) AS avg_hp
FROM heros 
WHERE role_main = '射手' OR role_assist = '射手';
```

### DISTINCT 与聚集函数

```sql
-- 计算不同生命值的平均值
SELECT ROUND(AVG(DISTINCT hp_max), 2) FROM heros;
-- 结果：6653.84（61 个不同的生命值）

-- 统计不同生命值的数量
SELECT COUNT(DISTINCT hp_max) FROM heros;
-- 结果：61（69 个英雄中有 61 个不同的生命值）
```

## MAX 和 MIN 函数

### 数值类型

```sql
-- 查询最大生命值的最大值和最小值
SELECT MAX(hp_max), MIN(hp_max) FROM heros;

-- 查询射手的最大生命值
SELECT MAX(hp_max) FROM heros 
WHERE role_main = '射手' OR role_assist = '射手';
```

### 字符串类型

MAX 和 MIN 也可用于字符串：

```sql
-- 按拼音排序，找出名字最小和最大的英雄
SELECT 
    MIN(CONVERT(name USING gbk)) AS min_name,
    MAX(CONVERT(name USING gbk)) AS max_name
FROM heros;
```

### 日期类型

```sql
-- 查询最早和最晚的上线日期
SELECT 
    MIN(birthdate) AS first_release,
    MAX(birthdate) AS latest_release
FROM heros
WHERE birthdate IS NOT NULL;
```

## 聚集函数与 NULL

### NULL 值处理规则

| 函数 | NULL 处理方式 |
|:---|:---|
| COUNT(*) | 计算所有行，包括 NULL |
| COUNT(column) | 忽略 NULL 值 |
| SUM() | 忽略 NULL 值 |
| AVG() | 忽略 NULL 值 |
| MAX() | 忽略 NULL 值 |
| MIN() | 忽略 NULL 值 |

### 示例

```sql
-- 如果所有值都是 NULL
SELECT COUNT(NULL);  -- 结果：0
SELECT SUM(NULL);    -- 结果：NULL
SELECT AVG(NULL);    -- 结果：NULL
SELECT MAX(NULL);    -- 结果：NULL
```

## GROUP BY 分组

### 基本分组

```sql
-- 按主要定位分组统计英雄数量
SELECT role_main, COUNT(*) AS hero_count
FROM heros
GROUP BY role_main;
```

### 多列分组

```sql
-- 按主要定位和次要定位分组
SELECT 
    role_main, 
    role_assist, 
    COUNT(*) AS hero_count
FROM heros
GROUP BY role_main, role_assist
ORDER BY hero_count DESC;
```

### 分组与聚集函数

```sql
-- 按主要定位统计平均生命值
SELECT 
    role_main,
    COUNT(*) AS hero_count,
    ROUND(AVG(hp_max), 2) AS avg_hp,
    MAX(hp_max) AS max_hp,
    MIN(hp_max) AS min_hp
FROM heros
GROUP BY role_main
ORDER BY avg_hp DESC;
```

### NULL 值分组

```sql
-- NULL 值也会被分为一组
SELECT role_assist, COUNT(*) AS count
FROM heros
GROUP BY role_assist;
-- 结果中包含 role_assist 为 NULL 的分组
```

## HAVING 过滤分组

### HAVING vs WHERE

| 子句 | 作用对象 | 执行时机 |
|:---|:---|:---|
| WHERE | 行 | 分组前 |
| HAVING | 分组 | 分组后 |

### 基本用法

```sql
-- 筛选英雄数量大于 5 的分组
SELECT 
    role_main, 
    role_assist, 
    COUNT(*) AS hero_count
FROM heros
GROUP BY role_main, role_assist
HAVING COUNT(*) > 5
ORDER BY hero_count DESC;
```

### WHERE + GROUP BY + HAVING

```sql
-- 筛选最大生命值 > 6000 的英雄
-- 按定位分组
-- 筛选英雄数量 > 5 的分组
SELECT 
    role_main, 
    role_assist, 
    COUNT(*) AS hero_count,
    ROUND(AVG(hp_max), 2) AS avg_hp
FROM heros
WHERE hp_max > 6000
GROUP BY role_main, role_assist
HAVING COUNT(*) > 5
ORDER BY hero_count DESC;
```

## SELECT 子句顺序

SQL 语句中子句的顺序是固定的：

```sql
SELECT 列名
FROM 表名
WHERE 行条件
GROUP BY 分组列
HAVING 分组条件
ORDER BY 排序列
LIMIT 限制;
```

### 执行顺序

```
1. FROM：确定数据源
2. WHERE：过滤行
3. GROUP BY：分组
4. HAVING：过滤分组
5. SELECT：选择列
6. DISTINCT：去重
7. ORDER BY：排序
8. LIMIT：限制结果
```

## 综合示例

### 示例 1：英雄统计

```sql
-- 统计射手的各项指标
SELECT 
    COUNT(*) AS hero_count,
    ROUND(AVG(hp_max), 2) AS avg_hp,
    ROUND(AVG(mp_max), 2) AS avg_mp,
    MAX(attack_max) AS max_attack,
    MIN(attack_max) AS min_attack,
    SUM(defense_max) AS total_defense
FROM heros
WHERE role_main = '射手' OR role_assist = '射手';
```

### 示例 2：分组统计

```sql
-- 按攻击范围分组统计
SELECT 
    attack_range,
    COUNT(*) AS hero_count,
    ROUND(AVG(hp_max + mp_max), 2) AS avg_total,
    ROUND(MAX(hp_max + mp_max), 2) AS max_total,
    ROUND(MIN(hp_max + mp_max), 2) AS min_total
FROM heros
WHERE hp_max + mp_max > 7000
GROUP BY attack_range
ORDER BY hero_count DESC;
```

### 示例 3：复杂统计

```sql
-- 统计各定位的英雄数量和平均属性
SELECT 
    role_main,
    COUNT(*) AS hero_count,
    ROUND(AVG(hp_max), 0) AS avg_hp,
    ROUND(AVG(mp_max), 0) AS avg_mp,
    ROUND(AVG(attack_max), 0) AS avg_attack,
    ROUND(AVG(defense_max), 0) AS avg_defense
FROM heros
GROUP BY role_main
HAVING COUNT(*) >= 5
ORDER BY hero_count DESC;
```

### 示例 4：年度统计

```sql
-- 按年份统计上线英雄
SELECT 
    YEAR(birthdate) AS year,
    COUNT(*) AS hero_count,
    ROUND(AVG(hp_max), 0) AS avg_hp
FROM heros
WHERE birthdate IS NOT NULL
GROUP BY YEAR(birthdate)
ORDER BY year;
```

## 聚集函数优化

### 1. 使用索引

```sql
-- 好：在索引列上使用聚集函数
SELECT COUNT(*) FROM heros WHERE role_main = '战士';

-- 差：无索引列
SELECT COUNT(*) FROM heros WHERE hp_max > 6000;
```

### 2. 避免全表扫描

```sql
-- 使用近似值（大数据量时）
SELECT TABLE_ROWS FROM information_schema.TABLES 
WHERE TABLE_NAME = 'heros';
```

### 3. 合理使用 DISTINCT

```sql
-- MAX/MIN 不需要 DISTINCT
SELECT MAX(hp_max) FROM heros;
SELECT MAX(DISTINCT hp_max) FROM heros;  -- 结果相同

-- COUNT/AVG/SUM 可能需要 DISTINCT
SELECT COUNT(DISTINCT role_main) FROM heros;
```

## 总结

### 聚集函数速查

| 函数 | 作用 | 示例 |
|:---|:---|:---|
| COUNT(*) | 统计所有行 | `COUNT(*)` |
| COUNT(col) | 统计非 NULL 行 | `COUNT(role_assist)` |
| COUNT(DISTINCT) | 统计不同值 | `COUNT(DISTINCT role_main)` |
| SUM() | 求和 | `SUM(hp_max)` |
| AVG() | 平均值 | `AVG(hp_max)` |
| MAX() | 最大值 | `MAX(hp_max)` |
| MIN() | 最小值 | `MIN(hp_max)` |

### 子句顺序

```
SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT
```

### 关键点

1. **COUNT(*) vs COUNT(col)**：前者统计所有行，后者忽略 NULL
2. **WHERE vs HAVING**：前者过滤行，后者过滤分组
3. **NULL 处理**：除 COUNT(*) 外，聚集函数都忽略 NULL
4. **DISTINCT**：可与聚集函数组合使用
5. **字符串和日期**：MAX/MIN 也可用于这些类型
