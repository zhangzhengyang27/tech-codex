---
title: CTE 公用表表达式
description: CTE（Common Table Expression，公用表表达式）用 WITH 子句定义命名的临时结果集，让 SQL 更清晰、可复用，并支持递归查询。系统讲解 WITH 语法、非递归/递归 CTE、与子查询/视图的对比
keywords: [CTE, WITH, 公用表表达式, 递归查询, 临时结果集]
category: 数据库基础
tags: [SQL, CTE, 查询]
---

# CTE 公用表表达式

CTE（Common Table Expression，公用表表达式）通过 `WITH` 子句定义**命名的临时结果集**，可在后续查询中多次引用。它让复杂 SQL 更清晰、可复用，并支持**递归查询**（树/层级结构）。MySQL 8.0、PostgreSQL、SQL Server、Oracle 均支持。

## 为什么需要 CTE

### 子查询可读性差

嵌套子查询让 SQL 难以阅读和维护：

```sql
-- 多层嵌套子查询，逻辑被"倒着"写
SELECT role_main, AVG(hp) AS avg_hp
FROM (
    SELECT role_main, hp_max AS hp,
           ROW_NUMBER() OVER (PARTITION BY role_main ORDER BY hp_max DESC) AS rn
    FROM heros
) t
WHERE t.rn <= 3
GROUP BY role_main;
```

### CTE 让逻辑清晰

```sql
WITH top_heroes AS (
    SELECT role_main, hp_max,
           ROW_NUMBER() OVER (PARTITION BY role_main ORDER BY hp_max DESC) AS rn
    FROM heros
)
SELECT role_main, AVG(hp_max) AS avg_hp
FROM top_heroes
WHERE rn <= 3
GROUP BY role_main;
```

## CTE 基本语法

```sql
WITH cte_name AS (
    SELECT ...   -- 定义 CTE 的查询
)
SELECT ... FROM cte_name;   -- 使用 CTE
```

### 基本示例

```sql
WITH high_hp AS (
    SELECT name, hp_max FROM heros WHERE hp_max > 7000
)
SELECT * FROM high_hp ORDER BY hp_max DESC;
```

### 多个 CTE（逗号分隔）

```sql
WITH
    mage AS (SELECT name, hp_max FROM heros WHERE role_main = '法师'),
    warrior AS (SELECT name, hp_max FROM heros WHERE role_main = '战士')
SELECT * FROM mage
UNION ALL
SELECT * FROM warrior;
```

### CTE 可被多次引用

```sql
WITH high_hp AS (
    SELECT name, hp_max FROM heros WHERE hp_max > 7000
)
-- 同一个 CTE 用两次
SELECT 'max' AS kind, MAX(hp_max) AS val FROM high_hp
UNION ALL
SELECT 'count', COUNT(*) FROM high_hp;
```

> 子查询被多次使用时，CTE 能避免重复编写，且部分数据库会物化 CTE 避免重复计算。

## 递归 CTE（RECURSIVE）

递归 CTE 用于处理**树状/层级**数据（组织架构、评论回复、分类树、无限层级菜单）。

### 语法结构

```sql
WITH RECURSIVE cte_name AS (
    -- 锚点成员（初始行）
    SELECT 初始值...
    UNION ALL
    -- 递归成员（引用 cte_name 自身）
    SELECT 递归逻辑... FROM cte_name WHERE 终止条件
)
SELECT * FROM cte_name;
```

### 示例 1：生成数字序列

```sql
-- 生成 1~10 的数字
WITH RECURSIVE seq AS (
    SELECT 1 AS n
    UNION ALL
    SELECT n + 1 FROM seq WHERE n < 10
)
SELECT * FROM seq;
```

### 示例 2：组织架构树

假设有员工表，含 `id` 和 `manager_id`（上级）：

```sql
CREATE TABLE employee (
    id INT PRIMARY KEY,
    name VARCHAR(50),
    manager_id INT   -- 上级 id，顶级为 NULL
);
INSERT INTO employee VALUES
  (1, 'CEO',   NULL),
  (2, 'CTO',   1),
  (3, 'CFO',   1),
  (4, '架构师', 2),
  (5, '工程师', 4),
  (6, '测试',   2);

-- 递归找出 CEO 下的所有下级（含层级深度）
WITH RECURSIVE org AS (
    -- 锚点：顶级
    SELECT id, name, manager_id, 0 AS depth
    FROM employee
    WHERE manager_id IS NULL
    UNION ALL
    -- 递归：找下级
    SELECT e.id, e.name, e.manager_id, o.depth + 1
    FROM employee e
    JOIN org o ON e.manager_id = o.id
)
SELECT * FROM org ORDER BY depth, id;
```

| 结果 | 说明 |
|------|------|
| CEO depth=0 | 顶级 |
| CTO、CFO depth=1 | CEO 的直接下级 |
| 架构师、测试 depth=2 | 再下一级 |
| 工程师 depth=3 | 最深层 |

### 示例 3：无限级分类（如商品类目）

```sql
WITH RECURSIVE category_tree AS (
    SELECT id, name, parent_id, CAST(name AS CHAR(200)) AS path, 0 AS depth
    FROM category WHERE parent_id IS NULL
    UNION ALL
    SELECT c.id, c.name, c.parent_id, CONCAT(t.path, ' > ', c.name), t.depth + 1
    FROM category c
    JOIN category_tree t ON c.parent_id = t.id
)
SELECT * FROM category_tree ORDER BY depth;
```

### ⚠️ 递归 CTE 注意事项

1. **必须用 `WITH RECURSIVE`**（MySQL、PostgreSQL、SQLite 需显式 RECURSIVE 关键字；SQL Server 例外，只写 `WITH`，自引用即递归）；
2. **必须有终止条件**，否则无限循环；MySQL 默认限制最大递归深度 `cte_max_recursion_depth = 1000`；
3. 递归成员之间用 `UNION ALL`（保留重复）或 `UNION`（去重），注意选择；
4. 递归 CTE 在 MySQL 8.0+ 才支持。

## CTE vs 子查询 vs 视图

| 特性 | 子查询 | CTE | 视图 |
|------|:---:|:---:|:---:|
| 生命周期 | 单条语句内 | 单条语句内 | 持久存在 |
| 可读性 | 嵌套深、难读 | 清晰、可命名 | 清晰 |
| 可复用（同语句多次） | ❌ | ✅ | ✅ |
| 递归支持 | ❌ | ✅（RECURSIVE） | ❌ |
| 是否存库 | 否 | 否 | 是（需 DDL） |
| 适用 | 简单子查询 | 复杂逻辑、递归 | 跨查询复用 |

### 如何选择

- **简单**：直接用子查询或 JOIN；
- **复杂/多次引用/递归**：用 CTE，可读性与维护性最好；
- **多个查询都要用**：建视图。

## CTE 典型应用

### 结合窗口函数（Top-N）

```sql
-- 每个定位生命前 3 的英雄
WITH ranked AS (
    SELECT name, role_main, hp_max,
           RANK() OVER (PARTITION BY role_main ORDER BY hp_max DESC) AS rk
    FROM heros
)
SELECT * FROM ranked WHERE rk <= 3;
```

### 多级聚合

```sql
-- 先按定位聚合，再统计定位数量
WITH role_stats AS (
    SELECT role_main, COUNT(*) AS cnt, AVG(hp_max) AS avg_hp
    FROM heros GROUP BY role_main
)
SELECT COUNT(*) AS role_cnt, AVG(avg_hp) AS overall_avg_hp FROM role_stats;
```

### 递归：查询某节点的所有祖先/后代

```sql
-- 查 id=5 的所有上级（向上递归）
WITH RECURSIVE up_tree AS (
    SELECT id, name, manager_id FROM employee WHERE id = 5
    UNION ALL
    SELECT e.id, e.name, e.manager_id
    FROM employee e
    JOIN up_tree u ON e.id = u.manager_id
)
SELECT * FROM up_tree;
```

## 总结

### 关键点

1. **CTE = 命名的临时结果集**，用 `WITH name AS (查询)` 定义，一条语句内可复用；
2. **非递归 CTE** 让复杂查询清晰、避免多层嵌套子查询；
3. **递归 CTE**（`WITH RECURSIVE`）处理树/层级数据，由"锚点成员 + 递归成员"组成，必须有终止条件；
4. 多个 CTE 用逗号分隔；CTE 可结合窗口函数、聚合完成复杂分析；
5. 对比：子查询单次简单使用、CTE 复杂/递归/多次引用、视图跨查询持久复用；
6. MySQL 8.0+ 支持，递归深度受 `cte_max_recursion_depth` 限制。
