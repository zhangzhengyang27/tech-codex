---
title: "DML"
description: "DML（Data Manipulation Language，数据操作语言） 是 SQL 语言的重要组成部分，用于对数据库表中的数据进行增删改查操作。"
keywords: [DML]
category: "Java"
tags: [Java, 数据库]
---


# DML 数据操作语言

## 一、DML 核心概念

### 1.1 什么是 DML

**DML（Data Manipulation Language，数据操作语言）** 是 SQL 语言的重要组成部分，用于对数据库表中的**数据进行增删改查操作**。

```
SQL 语言分类
├── DDL (数据定义语言) - CREATE, ALTER, DROP, TRUNCATE
├── DML (数据操作语言) - INSERT, UPDATE, DELETE, SELECT  ← 本章重点
├── DCL (数据控制语言) - GRANT, REVOKE
└── TCL (事务控制语言) - COMMIT, ROLLBACK, SAVEPOINT
```

### 1.2 DML 操作分类

| 操作 | 关键字 | 功能说明 | 影响行数 |
|------|--------|----------|----------|
| 插入 | INSERT | 向表中添加新数据 | 可插入单行或多行 |
| 更新 | UPDATE | 修改表中已有数据 | 可更新一行或多行 |
| 删除 | DELETE | 删除表中数据 | 可删除一行或多行 |
| 查询 | SELECT | 检索表中数据（DQL） | 返回结果集 |

::: warning 注意
虽然 SELECT 属于 DQL（数据查询语言），但通常也归类在 DML 中讨论，因为它是数据操作最常用的语句。
:::

### 1.3 DML 与 DDL 的区别

| 特性 | DML | DDL |
|------|-----|-----|
| 操作对象 | 表中的**数据** | 表的**结构** |
| 关键字 | INSERT, UPDATE, DELETE, SELECT | CREATE, ALTER, DROP, TRUNCATE |
| 是否需要提交 | 需要 COMMIT（自动或手动） | 自动提交，无需 COMMIT |
| 是否可回滚 | 可以（提交前） | 不可以 |
| 触发器 | 触发 DML 触发器 | 触发 DDL 触发器 |

---

## 二、INSERT 插入数据

### 2.1 基本语法

```sql
-- 标准语法
INSERT INTO 表名 (列1, 列2, 列3, ...)
VALUES (值1, 值2, 值3, ...);

-- 插入所有列（按表定义顺序）
INSERT INTO 表名
VALUES (值1, 值2, 值3, ...);
```

### 2.2 插入单条记录

**示例表结构：**

```sql
CREATE TABLE employees (
    employee_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    hire_date DATE,
    salary DECIMAL(10,2),
    department_id INT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**插入一条员工记录：**

```sql
-- 指定列名插入（推荐）
INSERT INTO employees (first_name, last_name, email, hire_date, salary, department_id)
VALUES ('张', '三', 'zhangsan@example.com', '2023-10-01', 7500.00, 1);

-- 插入所有列（不推荐，列顺序必须完全匹配）
INSERT INTO employees
VALUES (NULL, '李', '四', 'lisi@example.com', '2023-10-02', 8000.00, 2);
-- AUTO_INCREMENT 列传 NULL 或 0，MySQL 自动分配值
```

::: tip 最佳实践
**推荐使用指定列名的方式**：
1. 代码可读性更好
2. 不依赖表的列顺序
3. 可以省略有默认值的列
:::

### 2.3 插入多条记录

```sql
INSERT INTO employees (first_name, last_name, email, hire_date, salary, department_id)
VALUES 
    ('王', '五', 'wangwu@example.com', '2023-10-03', 7000.00, 1),
    ('赵', '六', 'zhaoliu@example.com', '2023-10-04', 7200.00, 2),
    ('孙', '七', 'sunqi@example.com', '2023-10-05', 7800.00, 3);
```

**性能优势：**
- 多条 VALUES 合并成一条 INSERT 语句
- 减少网络传输次数
- 减少事务日志写入
- 比循环单条插入效率高 10-100 倍

### 2.4 插入查询结果

将查询结果直接插入到表中：

```sql
-- 从临时表导入数据
INSERT INTO employees (first_name, last_name, email, hire_date, salary, department_id)
SELECT first_name, last_name, email, hire_date, salary, department_id
FROM temp_employees
WHERE salary > 7500;

-- 创建表的备份
CREATE TABLE employees_backup AS SELECT * FROM employees WHERE 1=0;  -- 只复制结构
INSERT INTO employees_backup SELECT * FROM employees;
```

### 2.5 INSERT 的高级用法

#### INSERT IGNORE（忽略重复）

```sql
-- 如果主键/唯一键冲突，忽略该条记录，不报错
INSERT IGNORE INTO employees (employee_id, first_name, last_name, email)
VALUES (1, '张', '三', 'zhangsan@example.com');
-- Query OK, 0 rows affected (如果 employee_id=1 已存在)
```

#### INSERT ... ON DUPLICATE KEY UPDATE（存在则更新）

```sql
-- 如果主键/唯一键冲突，则执行更新
INSERT INTO employees (employee_id, first_name, last_name, email, salary)
VALUES (1, '张', '三', 'newemail@example.com', 8000.00)
ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    salary = VALUES(salary);
-- 如果 employee_id=1 存在，更新 email 和 salary
-- 如果不存在，插入新记录
```

#### REPLACE INTO（替换插入）

```sql
-- 如果主键/唯一键冲突，先删除再插入
REPLACE INTO employees (employee_id, first_name, last_name, email, salary)
VALUES (1, '张', '三', 'newemail@example.com', 8000.00);
-- 相当于 DELETE + INSERT，自增ID会变化
```

**三种方式对比：**

| 方式 | 冲突处理 | AUTO_INCREMENT | 触发器触发 |
|------|----------|----------------|------------|
| INSERT IGNORE | 忽略，不插入 | 不变 | 不触发 |
| ON DUPLICATE KEY UPDATE | 更新已有记录 | 不变 | UPDATE 触发器 |
| REPLACE INTO | 删除后重新插入 | **会变化** | DELETE + INSERT 触发器 |

---

## 三、UPDATE 更新数据

### 3.1 基本语法

```sql
UPDATE 表名
SET 列1 = 值1, 列2 = 值2, ...
[WHERE 条件]
[ORDER BY ...]
[LIMIT 行数];
```

::: danger 重要警告
**永远不要忘记 WHERE 子句！** 如果省略 WHERE，将更新表中**所有记录**！
:::

### 3.2 更新单个字段

```sql
-- 将员工 ID 为 1 的工资增加 500
UPDATE employees 
SET salary = salary + 500 
WHERE employee_id = 1;

-- 将研发部所有员工工资增加 10%
UPDATE employees 
SET salary = salary * 1.10 
WHERE department_id = 2;
```

### 3.3 更新多个字段

```sql
-- 更新员工的姓氏和工资
UPDATE employees 
SET last_name = '李', salary = 8500 
WHERE employee_id = 2;
```

### 3.4 使用表达式更新

```sql
-- 使用 CASE 表达式批量更新不同条件的数据
UPDATE employees
SET salary = CASE
    WHEN salary < 7000 THEN salary * 1.15   -- 工资低于7000的涨15%
    WHEN salary BETWEEN 7000 AND 9000 THEN salary * 1.10  -- 7000-9000涨10%
    ELSE salary * 1.05  -- 其他涨5%
END
WHERE department_id = 1;
```

### 3.5 使用子查询更新

```sql
-- 将工资低于平均工资的员工工资涨到平均水平
-- 注意：UPDATE/DELETE 的子查询不能直接引用目标表（ERROR 1093），
-- 需要用派生表（物化临时表）包装一层
UPDATE employees 
SET salary = (SELECT avg_sal FROM (SELECT AVG(salary) AS avg_sal FROM employees) t)
WHERE salary < (SELECT avg_sal FROM (SELECT AVG(salary) AS avg_sal FROM employees) t);

-- 根据另一个表的数据更新
UPDATE employees e
JOIN departments d ON e.department_id = d.department_id
SET e.salary = e.salary * 1.10
WHERE d.department_name = '研发部';
```

### 3.6 多表关联更新

```sql
-- 更新员工表中的部门名称字段
ALTER TABLE employees ADD COLUMN department_name VARCHAR(100);

UPDATE employees e
JOIN departments d ON e.department_id = d.department_id
SET e.department_name = d.department_name;

-- 左连接更新（包括没有部门的员工）
UPDATE employees e
LEFT JOIN departments d ON e.department_id = d.department_id
SET e.department_name = IFNULL(d.department_name, '未分配');
```

### 3.7 UPDATE 安全技巧

```sql
-- 技巧1：先用 SELECT 验证条件
SELECT * FROM employees WHERE department_id = 2;  -- 先查看要更新的数据
-- 确认无误后再执行 UPDATE
UPDATE employees SET salary = salary * 1.10 WHERE department_id = 2;

-- 技巧2：使用 LIMIT 限制影响行数
UPDATE employees 
SET salary = salary * 1.10 
WHERE department_id = 2
LIMIT 100;  -- 最多更新100条

-- 技巧3：使用事务
START TRANSACTION;
UPDATE employees SET salary = salary * 1.10 WHERE department_id = 2;
SELECT * FROM employees WHERE department_id = 2;  -- 检查结果
-- 确认无误后提交
COMMIT;
-- 或回滚
-- ROLLBACK;
```

---

## 四、DELETE 删除数据

### 4.1 基本语法

```sql
DELETE FROM 表名
[WHERE 条件]
[ORDER BY ...]
[LIMIT 行数];
```

::: danger 重要警告
**永远不要忘记 WHERE 子句！** 如果省略 WHERE，将删除表中**所有数据**！
:::

### 4.2 删除单条记录

```sql
-- 删除员工 ID 为 3 的员工
DELETE FROM employees WHERE employee_id = 3;
```

### 4.3 删除多条记录

```sql
-- 删除所有工资低于 7000 的员工
DELETE FROM employees WHERE salary < 7000;

-- 删除 2023 年 10 月 1 日之后入职的员工
DELETE FROM employees WHERE hire_date > '2023-10-01';
```

### 4.4 使用子查询删除

```sql
-- 删除工资低于平均工资的员工
-- 同样不能直接引用目标表（ERROR 1093），用派生表包装
DELETE FROM employees 
WHERE salary < (SELECT avg_sal FROM (SELECT AVG(salary) AS avg_sal FROM employees) t);

-- 删除没有订单的客户
DELETE FROM customers 
WHERE customer_id NOT IN (SELECT DISTINCT customer_id FROM orders);
```

### 4.5 多表关联删除

```sql
-- 删除研发部的所有员工
DELETE e
FROM employees e
JOIN departments d ON e.department_id = d.department_id
WHERE d.department_name = '研发部';

-- 删除没有部门关联的员工
DELETE e
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
WHERE d.department_id IS NULL;
```

### 4.6 DELETE vs TRUNCATE

| 特性 | DELETE | TRUNCATE |
|------|--------|----------|
| 类型 | DML | DDL |
| WHERE 条件 | 支持 | 不支持 |
| 删除速度 | 逐行删除，较慢 | 整表清空，极快 |
| 回滚 | 可以回滚 | 不能回滚 |
| 自增ID | 保持不变 | 重置为初始值 |
| 触发器 | 触发 DELETE 触发器 | 不触发 |
| 外键约束 | 受外键约束影响 | 有外键时无法执行 |
| 空间释放 | 不释放表空间 | 释放表空间 |

```sql
-- DELETE：删除所有数据，但保留表结构和自增值
DELETE FROM employees;  -- employee_id 下次从原值继续

-- TRUNCATE：快速清空表，重置自增值
TRUNCATE TABLE employees;  -- employee_id 从 1 开始
```

### 4.7 DELETE 安全技巧

```sql
-- 技巧1：先用 SELECT 验证
SELECT * FROM employees WHERE department_id = 3;  -- 先查看
DELETE FROM employees WHERE department_id = 3;     -- 确认后删除

-- 技巧2：使用 LIMIT 限制删除数量
DELETE FROM employees WHERE salary < 7000 LIMIT 100;

-- 技巧3：使用事务
START TRANSACTION;
DELETE FROM employees WHERE department_id = 3;
SELECT COUNT(*) FROM employees WHERE department_id = 3;  -- 验证
-- 确认后提交
COMMIT;
-- 或回滚
-- ROLLBACK;

-- 技巧4：软删除（推荐生产环境使用）
ALTER TABLE employees ADD COLUMN is_deleted TINYINT DEFAULT 0;
UPDATE employees SET is_deleted = 1 WHERE employee_id = 3;  -- 标记删除
SELECT * FROM employees WHERE is_deleted = 0;  -- 查询时过滤
```

---

## 五、SELECT 查询数据详解

### 5.1 基本语法

```sql
SELECT [DISTINCT] 列1, 列2, ...
FROM 表名
[WHERE 条件]
[GROUP BY 列名 [HAVING 条件]]
[ORDER BY 列名 [ASC|DESC]]
[LIMIT 偏移量, 行数];
```

**执行顺序：**

```
FROM → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT
```

### 5.2 基本查询

```sql
-- 查询所有列（不推荐生产使用）
SELECT * FROM employees;

-- 查询指定列（推荐）
SELECT first_name, last_name, salary FROM employees;

-- 使用别名
SELECT 
    first_name AS 名,
    last_name AS 姓,
    salary AS 工资,
    salary * 12 AS 年薪
FROM employees;

-- 去重查询
SELECT DISTINCT department_id FROM employees;
```

### 5.3 WHERE 条件过滤

#### 比较运算符

| 运算符 | 说明 | 示例 |
|--------|------|------|
| = | 等于 | `WHERE salary = 7500` |
| != 或 <> | 不等于 | `WHERE salary != 7500` |
| > | 大于 | `WHERE salary > 7500` |
| < | 小于 | `WHERE salary < 7500` |
| >= | 大于等于 | `WHERE salary >= 7500` |
| <= | 小于等于 | `WHERE salary <= 7500` |

#### 逻辑运算符

```sql
-- AND：多个条件同时满足
SELECT * FROM employees 
WHERE department_id = 1 AND salary > 7000;

-- OR：任一条件满足
SELECT * FROM employees 
WHERE department_id = 1 OR salary > 8000;

-- NOT：条件取反
SELECT * FROM employees 
WHERE NOT (department_id = 1);

-- 优先级：NOT > AND > OR，建议使用括号明确优先级
SELECT * FROM employees 
WHERE (department_id = 1 OR department_id = 2) AND salary > 7000;
```

#### 范围查询

```sql
-- BETWEEN...AND：闭区间范围
SELECT * FROM employees 
WHERE salary BETWEEN 7000 AND 9000;
-- 等价于：WHERE salary >= 7000 AND salary <= 9000

-- NOT BETWEEN：不在范围内
SELECT * FROM employees 
WHERE salary NOT BETWEEN 7000 AND 9000;

-- IN：在指定值列表中
SELECT * FROM employees 
WHERE department_id IN (1, 2, 3);
-- 等价于：WHERE department_id = 1 OR department_id = 2 OR department_id = 3

-- NOT IN：不在指定值列表中
SELECT * FROM employees 
WHERE department_id NOT IN (1, 2, 3);
```

#### 模糊查询

```sql
-- LIKE：模糊匹配
-- % 匹配任意多个字符
-- _ 匹配单个字符

-- 查询姓"张"的员工
SELECT * FROM employees WHERE last_name LIKE '张%';

-- 查询名字以"三"结尾的员工
SELECT * FROM employees WHERE first_name LIKE '%三';

-- 查询名字包含"小"的员工
SELECT * FROM employees WHERE first_name LIKE '%小%';

-- 查询姓"张"且名字为两个字的员工
SELECT * FROM employees WHERE last_name = '张' AND first_name LIKE '_';

-- NOT LIKE：不匹配
SELECT * FROM employees WHERE email NOT LIKE '%@gmail.com';

-- 转义特殊字符
SELECT * FROM employees WHERE name LIKE '%\%%';  -- 查询包含 % 的名字
SELECT * FROM employees WHERE name LIKE '%\_%';  -- 查询包含 _ 的名字
```

#### NULL 值处理

```sql
-- IS NULL：判断为空
SELECT * FROM employees WHERE department_id IS NULL;

-- IS NOT NULL：判断非空
SELECT * FROM employees WHERE email IS NOT NULL;

-- 注意：NULL 与任何值比较都返回 NULL（不是 TRUE 也不是 FALSE）
SELECT * FROM employees WHERE salary = NULL;   -- 错误，不会返回任何结果
SELECT * FROM employees WHERE salary IS NULL;  -- 正确

-- IFNULL / COALESCE：处理 NULL 值
SELECT 
    first_name,
    IFNULL(bonus, 0) AS 奖金,        -- 如果 bonus 为 NULL，返回 0
    COALESCE(bonus, salary * 0.1, 0) AS 奖金  -- 返回第一个非 NULL 值
FROM employees;
```

### 5.4 ORDER BY 排序

```sql
-- 升序排序（ASC，默认）
SELECT * FROM employees ORDER BY salary ASC;
SELECT * FROM employees ORDER BY salary;  -- 等价

-- 降序排序（DESC）
SELECT * FROM employees ORDER BY salary DESC;

-- 多列排序
SELECT * FROM employees 
ORDER BY department_id ASC, salary DESC;
-- 先按部门升序，同部门按工资降序

-- 按表达式排序
SELECT first_name, salary, salary * 12 AS annual_salary
FROM employees
ORDER BY annual_salary DESC;  -- 可以使用别名

-- 按字段位置排序
SELECT first_name, salary FROM employees ORDER BY 2 DESC;  -- 按第二列排序
```

### 5.5 LIMIT 分页

```sql
-- MySQL 分页语法
-- LIMIT 偏移量, 行数  或  LIMIT 行数 OFFSET 偏移量

-- 查询前 5 条记录
SELECT * FROM employees LIMIT 5;
SELECT * FROM employees LIMIT 0, 5;  -- 等价
SELECT * FROM employees LIMIT 5 OFFSET 0;  -- 等价

-- 分页查询：每页 10 条，第 2 页
SELECT * FROM employees LIMIT 10, 10;  -- 偏移量 = (页码-1) * 每页条数
SELECT * FROM employees LIMIT 10 OFFSET 10;  -- 等价

-- 分页公式
-- LIMIT (pageNo - 1) * pageSize, pageSize

-- 与 ORDER BY 配合使用
SELECT * FROM employees 
ORDER BY salary DESC 
LIMIT 5;  -- 工资最高的 5 名员工

-- 深分页问题优化
-- 偏移量大时性能差：LIMIT 100000, 10
-- 优化方案：使用子查询先获取起始 ID
SELECT * FROM employees 
WHERE employee_id >= (
    SELECT employee_id FROM employees ORDER BY employee_id LIMIT 100000, 1
)
LIMIT 10;
```

### 5.6 GROUP BY 分组查询

```sql
-- 基本分组
SELECT department_id, COUNT(*) AS 人数
FROM employees
GROUP BY department_id;

-- 分组统计
SELECT 
    department_id,
    COUNT(*) AS 人数,
    AVG(salary) AS 平均工资,
    MAX(salary) AS 最高工资,
    MIN(salary) AS 最低工资,
    SUM(salary) AS 工资总和
FROM employees
GROUP BY department_id;

-- 多列分组
SELECT 
    department_id,
    job_id,
    COUNT(*) AS 人数,
    AVG(salary) AS 平均工资
FROM employees
GROUP BY department_id, job_id;

-- GROUP BY + ORDER BY
SELECT 
    department_id,
    AVG(salary) AS avg_salary
FROM employees
GROUP BY department_id
ORDER BY avg_salary DESC;

-- WITH ROLLUP：分组汇总
SELECT 
    department_id,
    COUNT(*) AS 人数,
    SUM(salary) AS 工资总和
FROM employees
GROUP BY department_id WITH ROLLUP;
-- 会在最后显示所有部门的汇总行
```

### 5.7 HAVING 分组过滤

```sql
-- HAVING：对分组结果进行过滤（WHERE 是对原始行过滤）

-- 查询平均工资大于 7500 的部门
SELECT 
    department_id,
    AVG(salary) AS avg_salary
FROM employees
GROUP BY department_id
HAVING AVG(salary) > 7500;
-- 或 HAVING avg_salary > 7500（MySQL 支持别名）

-- HAVING 与 WHERE 的区别
SELECT 
    department_id,
    AVG(salary) AS avg_salary
FROM employees
WHERE salary > 5000  -- 先过滤掉工资 <= 5000 的员工
GROUP BY department_id
HAVING AVG(salary) > 7500;  -- 再过滤平均工资 <= 7500 的部门

-- 多条件 HAVING
SELECT 
    department_id,
    COUNT(*) AS 人数,
    AVG(salary) AS 平均工资
FROM employees
GROUP BY department_id
HAVING COUNT(*) >= 3 AND AVG(salary) > 7000;
```

**WHERE 与 HAVING 对比：**

| 特性 | WHERE | HAVING |
|------|-------|--------|
| 过滤时机 | 分组前 | 分组后 |
| 过滤对象 | 原始行 | 分组结果 |
| 能否用聚合函数 | 不能 | 可以 |
| 能否用别名 | 不能 | MySQL 可以 |

### 5.8 聚合函数详解

| 函数 | 说明 | 示例 |
|------|------|------|
| COUNT(*) | 统计所有行数 | `SELECT COUNT(*) FROM employees;` |
| COUNT(列名) | 统计非 NULL 值的行数 | `SELECT COUNT(bonus) FROM employees;` |
| COUNT(DISTINCT 列名) | 统计不重复的非 NULL 值行数 | `SELECT COUNT(DISTINCT department_id);` |
| SUM(列名) | 求和 | `SELECT SUM(salary) FROM employees;` |
| AVG(列名) | 平均值 | `SELECT AVG(salary) FROM employees;` |
| MAX(列名) | 最大值 | `SELECT MAX(salary) FROM employees;` |
| MIN(列名) | 最小值 | `SELECT MIN(salary) FROM employees;` |
| GROUP_CONCAT(列名) | 分组拼接字符串 | `SELECT GROUP_CONCAT(name) FROM employees;` |

```sql
-- 综合统计示例
SELECT 
    department_id,
    COUNT(*) AS 总人数,
    COUNT(bonus) AS 有奖金人数,
    COUNT(DISTINCT job_id) AS 岗位种类,
    SUM(salary) AS 工资总和,
    AVG(salary) AS 平均工资,
    MAX(salary) AS 最高工资,
    MIN(salary) AS 最低工资,
    GROUP_CONCAT(first_name SEPARATOR ',') AS 员工名单
FROM employees
GROUP BY department_id;
```

---

## 六、多表查询

### 6.1 连接查询概述

```
连接查询分类
├── 内连接 (INNER JOIN)：只返回匹配的记录
├── 外连接 (OUTER JOIN)：返回匹配记录 + 不匹配的记录
│   ├── 左外连接 (LEFT JOIN)：左表全部 + 右表匹配
│   ├── 右外连接 (RIGHT JOIN)：右表全部 + 左表匹配
│   └── 全外连接 (FULL JOIN)：两边全部（MySQL 不支持）
├── 自连接 (SELF JOIN)：表与自身连接
└── 交叉连接 (CROSS JOIN)：笛卡尔积
```

### 6.2 内连接（INNER JOIN）

**内连接只返回两个表中都有匹配的记录。**

```sql
-- 隐式内连接（WHERE 子句）
SELECT e.first_name, e.salary, d.department_name
FROM employees e, departments d
WHERE e.department_id = d.department_id;

-- 显式内连接（INNER JOIN，推荐）
SELECT e.first_name, e.salary, d.department_name
FROM employees e
INNER JOIN departments d ON e.department_id = d.department_id;

-- INNER 可以省略
SELECT e.first_name, e.salary, d.department_name
FROM employees e
JOIN departments d ON e.department_id = d.department_id;

-- 多表内连接
SELECT 
    e.first_name,
    d.department_name,
    j.job_title
FROM employees e
JOIN departments d ON e.department_id = d.department_id
JOIN jobs j ON e.job_id = j.job_id;
```

### 6.3 外连接（OUTER JOIN）

#### 左外连接（LEFT JOIN）

**返回左表所有记录，右表没有匹配则显示 NULL。**

```sql
-- 查询所有员工及其部门信息（包括没有部门的员工）
SELECT 
    e.first_name,
    e.salary,
    d.department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id;

-- 找出没有部门的员工
SELECT e.first_name, e.salary
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
WHERE d.department_id IS NULL;
```

#### 右外连接（RIGHT JOIN）

**返回右表所有记录，左表没有匹配则显示 NULL。**

```sql
-- 查询所有部门及其员工信息（包括没有员工的部门）
SELECT 
    e.first_name,
    d.department_name
FROM employees e
RIGHT JOIN departments d ON e.department_id = d.department_id;

-- 找出没有员工的部门
SELECT d.department_name
FROM employees e
RIGHT JOIN departments d ON e.department_id = d.department_id
WHERE e.employee_id IS NULL;
```

#### 全外连接（MySQL 不支持）

```sql
-- MySQL 不支持 FULL JOIN，可用 UNION 模拟
SELECT e.first_name, d.department_name
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id

UNION

SELECT e.first_name, d.department_name
FROM employees e
RIGHT JOIN departments d ON e.department_id = d.department_id;
```

### 6.4 自连接

**表与自身连接，常用于层级结构查询。**

```sql
-- 示例：员工表中包含 manager_id，查询员工及其经理名称
SELECT 
    e.first_name AS 员工,
    m.first_name AS 经理
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.employee_id;

-- 查询同一部门工资相近的员工对
SELECT 
    e1.first_name AS 员工1,
    e2.first_name AS 员工2,
    e1.salary AS 工资1,
    e2.salary AS 工资2
FROM employees e1
JOIN employees e2 ON e1.department_id = e2.department_id
WHERE e1.employee_id < e2.employee_id  -- 避免重复和自比较
AND ABS(e1.salary - e2.salary) < 500;
```

### 6.5 交叉连接（CROSS JOIN）

**返回笛卡尔积，每行组合。**

```sql
-- 显式交叉连接
SELECT e.first_name, d.department_name
FROM employees e
CROSS JOIN departments d;

-- 隐式交叉连接（不推荐）
SELECT e.first_name, d.department_name
FROM employees e, departments d;

-- 使用场景：生成所有可能的组合
-- 例如：每个员工每个日期的考勤记录模板
SELECT e.employee_id, d.date
FROM employees e
CROSS JOIN date_range d;
```

### 6.6 子查询

#### 子查询位置

```sql
-- 1. WHERE 子句中的子查询

-- 单行子查询（使用 =, >, <, >=, <=, <>）
SELECT * FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);

-- 多行子查询（使用 IN, ANY, ALL）
-- IN：在列表中
SELECT * FROM employees
WHERE department_id IN (SELECT department_id FROM departments WHERE location = '北京');

-- ANY：满足任一条件
SELECT * FROM employees
WHERE salary > ANY (SELECT salary FROM employees WHERE department_id = 1);
-- 大于子查询结果中的任意一个（即大于最小值）

-- ALL：满足所有条件
SELECT * FROM employees
WHERE salary > ALL (SELECT salary FROM employees WHERE department_id = 1);
-- 大于子查询结果中的所有值（即大于最大值）

-- EXISTS：判断子查询是否有结果
SELECT * FROM employees e
WHERE EXISTS (
    SELECT 1 FROM departments d 
    WHERE d.department_id = e.department_id AND d.location = '北京'
);

-- NOT EXISTS
SELECT * FROM departments d
WHERE NOT EXISTS (
    SELECT 1 FROM employees e WHERE e.department_id = d.department_id
);
-- 查询没有员工的部门
```

```sql
-- 2. FROM 子句中的子查询（派生表）
SELECT dept_avg.department_id, dept_avg.avg_salary
FROM (
    SELECT department_id, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY department_id
) AS dept_avg
WHERE dept_avg.avg_salary > 7500;
```

```sql
-- 3. SELECT 子句中的子查询（相关子查询）
SELECT 
    e.first_name,
    e.salary,
    (SELECT AVG(salary) FROM employees WHERE department_id = e.department_id) AS dept_avg_salary,
    e.salary - (SELECT AVG(salary) FROM employees WHERE department_id = e.department_id) AS 差额
FROM employees e;
```

```sql
-- 4. HAVING 子句中的子查询
SELECT 
    department_id,
    AVG(salary) AS avg_salary
FROM employees
GROUP BY department_id
HAVING AVG(salary) > (
    SELECT AVG(salary) FROM employees
);
```

#### 关联子查询 vs 非关联子查询

```sql
-- 非关联子查询：子查询独立执行，只执行一次
SELECT * FROM employees
WHERE salary > (SELECT AVG(salary) FROM employees);
-- 先执行子查询得到平均值，再执行主查询

-- 关联子查询：子查询引用外层查询，每行执行一次
SELECT * FROM employees e1
WHERE salary > (
    SELECT AVG(salary) 
    FROM employees e2 
    WHERE e2.department_id = e1.department_id
);
-- 对每个员工，计算其部门的平均工资，性能较低
```

### 6.7 连接 vs 子查询选择

| 场景 | 推荐 | 原因 |
|------|------|------|
| 需要多个表的列 | JOIN | 一次查询获取所有数据 |
| 只需要判断存在性 | EXISTS | 性能更好 |
| 需要聚合后再筛选 | 子查询 | 更直观 |
| 多表统计对比 | JOIN | 代码更清晰 |
| 单值比较 | 子查询 | 语义清晰 |

```sql
-- 示例：查询工资高于部门平均的员工

-- 方式1：使用关联子查询（可读性好，性能稍差）
SELECT e.first_name, e.salary, e.department_id
FROM employees e
WHERE e.salary > (
    SELECT AVG(salary) FROM employees WHERE department_id = e.department_id
);

-- 方式2：使用 JOIN + 子查询（性能更好）
SELECT e.first_name, e.salary, e.department_id
FROM employees e
JOIN (
    SELECT department_id, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY department_id
) AS dept_avg ON e.department_id = dept_avg.department_id
WHERE e.salary > dept_avg.avg_salary;
```

---

## 七、SQL 注入防护

### 7.1 什么是 SQL 注入

**SQL 注入**是一种安全漏洞，攻击者通过在输入中插入恶意 SQL 代码，篡改原始 SQL 语句，从而获取、修改或删除数据。

```sql
-- 正常的登录查询
SELECT * FROM users WHERE username = 'admin' AND password = '123456';

-- SQL 注入攻击
-- 输入 username: admin'-- （-- 后必须跟空格才是 MySQL 的注释符）
-- 输入 password: xxx
-- 实际执行的 SQL：
SELECT * FROM users WHERE username = 'admin'-- ' AND password = 'xxx';
-- -- 之后的密码验证被注释掉了，直接以 admin 登录

-- 更危险的注入
-- 输入 username: admin' OR '1'='1' -- （注意结尾的注释符，让密码条件失效）
-- 实际执行的 SQL：
SELECT * FROM users WHERE username = 'admin' OR '1'='1' -- ' AND password = 'xxx';
-- OR '1'='1' 恒为真且密码条件被注释，返回所有用户
-- （若不拼注释符，由于 AND 优先级高于 OR，条件会变成
--   username='admin' OR ('1'='1' AND password='xxx')，并非返回所有行）
```

### 7.2 Java 防护方案

#### 使用 PreparedStatement（预编译语句）

```java
// 错误方式：字符串拼接（存在 SQL 注入风险）
public User login(String username, String password) {
    String sql = "SELECT * FROM users WHERE username = '" + username 
               + "' AND password = '" + password + "'";
    // 如果 username 输入: admin' OR '1'='1
    // SQL 变成: SELECT * FROM users WHERE username = 'admin' OR '1'='1' AND password = 'xxx'
    return jdbcTemplate.queryForObject(sql, User.class);
}

// 正确方式：使用 PreparedStatement
public User login(String username, String password) {
    String sql = "SELECT * FROM users WHERE username = ? AND password = ?";
    return jdbcTemplate.queryForObject(
        sql, 
        new Object[]{username, password},  // 参数自动转义
        new BeanPropertyRowMapper<>(User.class)
    );
}
```

#### 使用 MyBatis 参数绑定

```xml
<!-- 错误方式：使用 ${}（字符串拼接，存在注入风险） -->
<select id="getUserByName" resultType="User">
    SELECT * FROM users WHERE username = '${username}'
    <!-- 如果 username = "admin' OR '1'='1" -->
    <!-- SQL 变成: SELECT * FROM users WHERE username = 'admin' OR '1'='1' -->
</select>

<!-- 正确方式：使用 #{}（预编译参数，安全） -->
<select id="getUserByName" resultType="User">
    SELECT * FROM users WHERE username = #{username}
    <!-- 生成预编译 SQL: SELECT * FROM users WHERE username = ? -->
</select>

<!-- ${} 的正确使用场景：动态表名、列名 -->
<select id="getByOrder" resultType="User">
    SELECT * FROM users ORDER BY ${orderColumn} ${orderType}
    <!-- 表名和列名不能用预编译，但必须严格校验输入 -->
</select>
```

### 7.3 防护最佳实践

```java
// 1. 始终使用参数化查询
// 2. 对用户输入进行严格校验
// 3. 使用最小权限原则，数据库用户只授予必要权限
// 4. 不在数据库中存储明文密码
// 5. 使用 ORM 框架（如 MyBatis、Hibernate）自动处理
// 6. 对错误信息进行脱敏，不要暴露数据库结构

// 输入校验示例
public boolean isValidUsername(String username) {
    // 只允许字母、数字、下划线，长度 4-20
    return username != null && username.matches("^[a-zA-Z0-9_]{4,20}$");
}

// 错误处理示例
try {
    User user = userDao.login(username, password);
    return user;
} catch (Exception e) {
    log.error("登录失败", e);  // 记录详细日志
    // 不要返回详细错误信息给用户
    throw new BusinessException("用户名或密码错误");  // 模糊提示
}
```

### 7.4 ${} 和 #{} 的区别（MyBatis）

| 特性 | #{ } | ${ } |
|------|------|------|
| 解析方式 | 预编译参数 | 字符串替换 |
| SQL 注入 | 安全 | 不安全 |
| 使用场景 | 参数值 | 表名、列名、排序字段 |
| 生成的 SQL | `WHERE name = ?` | `WHERE name = 'value'` |

```xml
<!-- 安全：#{ } 用于参数值 -->
<select id="getBySalary" resultType="User">
    SELECT * FROM users WHERE salary > #{minSalary}
</select>

<!-- 需要谨慎校验：${ } 用于动态表名/列名 -->
<select id="getUsers" resultType="User">
    SELECT * FROM ${tableName} ORDER BY ${orderColumn}
</select>

<!-- Java 端必须校验白名单 -->
public List<User> getUsers(String tableName, String orderColumn) {
    // 白名单校验
    if (!Arrays.asList("users", "employees").contains(tableName)) {
        throw new IllegalArgumentException("非法表名");
    }
    if (!Arrays.asList("id", "name", "create_time").contains(orderColumn)) {
        throw new IllegalArgumentException("非法排序列");
    }
    return userMapper.getUsers(tableName, orderColumn);
}
```

---

## 八、性能优化建议

### 8.1 索引优化

```sql
-- 1. WHERE 条件列建立索引
CREATE INDEX idx_department_id ON employees(department_id);
SELECT * FROM employees WHERE department_id = 1;  -- 使用索引

-- 2. 联合索引（最左前缀原则）
CREATE INDEX idx_dept_salary ON employees(department_id, salary);
SELECT * FROM employees WHERE department_id = 1;               -- 使用索引
SELECT * FROM employees WHERE department_id = 1 AND salary > 5000;  -- 使用索引
SELECT * FROM employees WHERE salary > 5000;                   -- 不使用索引

-- 3. 覆盖索引（查询列都在索引中）
CREATE INDEX idx_cover ON employees(department_id, salary);
SELECT department_id, salary FROM employees WHERE department_id = 1;  -- 覆盖索引

-- 4. 避免 SELECT *
SELECT first_name, salary FROM employees WHERE department_id = 1;  -- 好
SELECT * FROM employees WHERE department_id = 1;  -- 差，无法使用覆盖索引

-- 5. 查看执行计划
EXPLAIN SELECT * FROM employees WHERE department_id = 1;
-- 关注 type（ALL 表示全表扫描）、key（使用的索引）、rows（扫描行数）
```

### 8.2 查询优化

```sql
-- 1. 避免在 WHERE 中对列进行函数操作
-- 差：索引失效
SELECT * FROM employees WHERE YEAR(hire_date) = 2023;
-- 好：使用范围查询
SELECT * FROM employees WHERE hire_date >= '2023-01-01' AND hire_date < '2024-01-01';

-- 2. 避免隐式类型转换
-- 差：字符串与数字比较，索引失效
SELECT * FROM employees WHERE employee_id = '1';  -- employee_id 是 INT
-- 好：类型匹配
SELECT * FROM employees WHERE employee_id = 1;

-- 3. != / <> 并非必然失效，能否走索引取决于数据分布
-- （与 > x OR < x 语义等价，优化器可拆成两个范围扫描；不匹配行占比小时可能用索引）
SELECT * FROM employees WHERE department_id != 1;

-- 4. LIKE 查询优化
-- 差：前缀模糊，索引失效
SELECT * FROM employees WHERE first_name LIKE '%三%';
-- 好：后缀模糊可以使用索引
SELECT * FROM employees WHERE first_name LIKE '张%';

-- 5. OR 条件优化
-- 差：OR 两侧列都有索引才可能走 index_merge，否则全表扫描
SELECT * FROM employees WHERE department_id = 1 OR salary > 8000;
-- 好：改写为 UNION（两条件可能同时满足，用 UNION ALL 会产生重复行）
SELECT * FROM employees WHERE department_id = 1
UNION
SELECT * FROM employees WHERE salary > 8000;

-- 6. 分页优化
-- 差：大偏移量
SELECT * FROM employees LIMIT 100000, 10;
-- 好：使用子查询定位
SELECT * FROM employees e
JOIN (SELECT employee_id FROM employees ORDER BY employee_id LIMIT 100000, 10) t
ON e.employee_id = t.employee_id;

-- 7. EXISTS vs IN
-- 当子查询表大时，EXISTS 通常更快
-- 差：IN 子查询
SELECT * FROM employees WHERE department_id IN (SELECT department_id FROM departments WHERE location = '北京');
-- 好：EXISTS
SELECT * FROM employees e WHERE EXISTS (
    SELECT 1 FROM departments d WHERE d.department_id = e.department_id AND d.location = '北京'
);
```

### 8.3 批量操作优化

```sql
-- 1. 批量插入替代循环单条插入
-- 差：循环执行 1000 次
INSERT INTO employees (...) VALUES (...);
-- 好：一次执行
INSERT INTO employees (...) VALUES (...), (...), (...);  -- 1000 条

-- 2. 大事务拆分
-- 差：一个大事务
START TRANSACTION;
-- 插入 10 万条数据
COMMIT;

-- 好：分批提交
START TRANSACTION;
-- 插入 1000 条
COMMIT;
START TRANSACTION;
-- 插入 1000 条
COMMIT;
-- ...

-- 3. 使用 LOAD DATA INFILE 导入大量数据
LOAD DATA INFILE '/path/to/data.csv'
INTO TABLE employees
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
(first_name, last_name, email, hire_date, salary);
-- 比 INSERT 快 20-100 倍

-- 4. 大表删除优化
-- 差：一次性删除大量数据
DELETE FROM logs WHERE create_date < '2020-01-01';  -- 可能有数百万行
-- 好：分批删除
DELETE FROM logs WHERE create_date < '2020-01-01' LIMIT 1000;
-- 循环执行，直到影响行数为 0
```

### 8.4 UPDATE/DELETE 优化

```sql
-- 1. 确保 WHERE 条件有索引
UPDATE employees SET salary = salary * 1.1 WHERE department_id = 1;
-- department_id 应该有索引

-- 2. 避免全表更新
-- 差
UPDATE employees SET salary = salary * 1.1;  -- 全表锁定
-- 好：分批更新
UPDATE employees SET salary = salary * 1.1 WHERE department_id = 1 LIMIT 1000;

-- 3. 使用 LIMIT 限制影响行数
DELETE FROM logs WHERE create_date < '2020-01-01' LIMIT 1000;

-- 4. 大表更新考虑使用 pt-online-schema-change 工具
```

### 8.5 慢查询分析与优化

```sql
-- 1. 开启慢查询日志
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- 超过 1 秒的查询

-- 2. 查看慢查询
SHOW VARIABLES LIKE 'slow_query%';

-- 3. 使用 EXPLAIN 分析
EXPLAIN SELECT * FROM employees WHERE department_id = 1;

-- 4. 使用 EXPLAIN ANALYZE（MySQL 8.0.18+）
EXPLAIN ANALYZE SELECT * FROM employees WHERE department_id = 1;
-- 显示实际执行时间

-- 5. 查看 SQL 执行统计
SELECT * FROM sys.statements_with_runtime_errors;
SELECT * FROM sys.statements_with_sorting;
SELECT * FROM sys.statements_with_full_table_scans;
```

---

## 九、综合实战案例

### 9.1 电商系统订单管理

**业务场景：** 用户下单、取消订单、库存管理

```sql
-- 表结构
CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    product_name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING'
) ENGINE=InnoDB;

CREATE TABLE order_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
) ENGINE=InnoDB;
```

**下单操作（事务保证）：**

```sql
-- 下单：创建订单、扣减库存、更新订单金额
DELIMITER //
CREATE PROCEDURE create_order(
    IN p_user_id INT,
    IN p_product_id INT,
    IN p_quantity INT
)
BEGIN
    DECLARE v_stock INT;
    DECLARE v_price DECIMAL(10,2);
    DECLARE v_order_id INT;
    
    START TRANSACTION;
    
    -- 1. 检查库存
    SELECT stock, price INTO v_stock, v_price
    FROM products WHERE product_id = p_product_id FOR UPDATE;
    
    IF v_stock < p_quantity THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '库存不足';
    END IF;
    
    -- 2. 创建订单
    INSERT INTO orders (user_id, total_amount, status)
    VALUES (p_user_id, v_price * p_quantity, 'PAID');
    
    SET v_order_id = LAST_INSERT_ID();
    
    -- 3. 创建订单项
    INSERT INTO order_items (order_id, product_id, quantity, price)
    VALUES (v_order_id, p_product_id, p_quantity, v_price);
    
    -- 4. 扣减库存
    UPDATE products 
    SET stock = stock - p_quantity 
    WHERE product_id = p_product_id;
    
    COMMIT;
    
    SELECT v_order_id AS order_id;
END //
DELIMITER ;

-- 调用存储过程
CALL create_order(1, 101, 2);
```

**取消订单（恢复库存）：**

```sql
DELIMITER //
CREATE PROCEDURE cancel_order(IN p_order_id INT)
BEGIN
    START TRANSACTION;
    
    -- 1. 检查订单状态
    IF (SELECT status FROM orders WHERE order_id = p_order_id) != 'PENDING' THEN
        ROLLBACK;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '订单状态不可取消';
    END IF;
    
    -- 2. 恢复库存
    UPDATE products p
    JOIN order_items oi ON p.product_id = oi.product_id
    SET p.stock = p.stock + oi.quantity
    WHERE oi.order_id = p_order_id;
    
    -- 3. 更新订单状态
    UPDATE orders SET status = 'CANCELLED' WHERE order_id = p_order_id;
    
    COMMIT;
END //
DELIMITER ;
```

**查询统计：**

```sql
-- 查询用户订单详情
SELECT 
    o.order_id,
    o.order_date,
    o.total_amount,
    o.status,
    GROUP_CONCAT(CONCAT(p.product_name, ' x ', oi.quantity) SEPARATOR ', ') AS 订单商品
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
WHERE o.user_id = 1
GROUP BY o.order_id
ORDER BY o.order_date DESC;

-- 统计商品销量排行
SELECT 
    p.product_id,
    p.product_name,
    SUM(oi.quantity) AS 总销量,
    SUM(oi.quantity * oi.price) AS 总销售额
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status = 'PAID'
GROUP BY p.product_id, p.product_name
ORDER BY 总销量 DESC
LIMIT 10;
```

### 9.2 员工管理系统

**业务场景：** 员工信息管理、部门统计、薪资调整

```sql
-- 查询每个部门的薪资统计
SELECT 
    d.department_name,
    COUNT(e.employee_id) AS 员工数,
    ROUND(AVG(e.salary), 2) AS 平均工资,
    MIN(e.salary) AS 最低工资,
    MAX(e.salary) AS 最高工资,
    SUM(e.salary) AS 工资总和
FROM departments d
LEFT JOIN employees e ON d.department_id = e.department_id
GROUP BY d.department_id, d.department_name
ORDER BY 平均工资 DESC;

-- 查询工资高于部门平均的员工
SELECT 
    e.first_name,
    e.salary,
    d.department_name,
    dept_avg.avg_salary AS 部门平均工资,
    ROUND(e.salary - dept_avg.avg_salary, 2) AS 高出金额
FROM employees e
JOIN departments d ON e.department_id = d.department_id
JOIN (
    SELECT department_id, AVG(salary) AS avg_salary
    FROM employees
    GROUP BY department_id
) dept_avg ON e.department_id = dept_avg.department_id
WHERE e.salary > dept_avg.avg_salary
ORDER BY 高出金额 DESC;

-- 分页查询员工列表（含部门名称）
SELECT 
    e.employee_id,
    CONCAT(e.first_name, e.last_name) AS 姓名,
    e.salary,
    d.department_name,
    e.hire_date
FROM employees e
LEFT JOIN departments d ON e.department_id = d.department_id
ORDER BY e.employee_id
LIMIT 0, 10;

-- 按年份统计入职人数
SELECT 
    YEAR(hire_date) AS 入职年份,
    COUNT(*) AS 入职人数
FROM employees
GROUP BY YEAR(hire_date)
ORDER BY 入职年份;

-- 批量调薪（基于绩效）
-- 绩效表
CREATE TABLE performance (
    employee_id INT PRIMARY KEY,
    year INT,
    score DECIMAL(3,1),  -- 0-5 分
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
);

-- 根据绩效批量调薪
UPDATE employees e
JOIN performance p ON e.employee_id = p.employee_id
SET e.salary = CASE
    WHEN p.score >= 4.5 THEN e.salary * 1.20   -- A级涨20%
    WHEN p.score >= 3.5 THEN e.salary * 1.10   -- B级涨10%
    WHEN p.score >= 2.5 THEN e.salary * 1.05   -- C级涨5%
    ELSE e.salary                               -- D级不涨
END
WHERE p.year = 2023;
```

---

## 十、面试要点

### 10.1 DML 基础问题

**Q1：DML 和 DDL 有什么区别？**

- DML 操作数据（INSERT、UPDATE、DELETE、SELECT）
- DDL 操作结构（CREATE、ALTER、DROP）
- DML 可以回滚，DDL 自动提交不可回滚
- DML 触发 DML 触发器，DDL 触发 DDL 触发器

**Q2：DELETE、TRUNCATE、DROP 的区别？**

| 操作 | 删除内容 | 是否可回滚 | 是否释放空间 | 速度 |
|------|----------|------------|--------------|------|
| DELETE | 表中数据 | 可以 | 不释放 | 慢 |
| TRUNCATE | 表中数据 | 不可以 | 释放 | 快 |
| DROP | 表结构+数据 | 不可以 | 释放 | 最快 |

**Q3：什么是 SQL 注入？如何防护？**

- SQL 注入是通过在输入中插入恶意 SQL 代码篡改原 SQL 语句
- 防护措施：
  1. 使用 PreparedStatement 参数化查询
  2. MyBatis 使用 #{ } 而非 ${ }
  3. 对用户输入进行严格校验
  4. 使用最小权限原则
  5. 错误信息脱敏

### 10.2 查询优化问题

**Q4：如何优化慢查询？**

1. 使用 EXPLAIN 分析执行计划
2. 确保 WHERE 条件列有索引
3. 避免 SELECT *，只查询需要的列
4. 避免在 WHERE 中对列使用函数
5. 避免隐式类型转换
6. 优化 LIKE 查询，避免前缀模糊
7. 大偏移量分页使用子查询优化
8. 选择合适的 JOIN 方式

**Q5：什么情况下索引会失效？**

1. WHERE 条件中使用函数：`WHERE YEAR(date_col) = 2023`
2. 隐式类型转换：字符串与数字比较
3. LIKE 前缀模糊：`LIKE '%abc'`
4. 使用 != 或 <>（有时失效）
5. OR 条件中部分列无索引
6. 联合索引不符合最左前缀
7. 索引列参与计算：`WHERE id + 1 = 10`

**Q6：COUNT(*)、COUNT(列名)、COUNT(1) 有什么区别？**

- `COUNT(*)`：统计所有行数，包括 NULL 值
- `COUNT(列名)`：统计该列非 NULL 值的行数
- `COUNT(1)`：与 COUNT(*) 等价
- 现代优化器下，COUNT(*) 和 COUNT(1) 性能无差异

### 10.3 高级问题

**Q7：INNER JOIN 和 LEFT JOIN 的区别？**

- INNER JOIN：只返回两表都有匹配的记录
- LEFT JOIN：返回左表所有记录，右表无匹配则为 NULL
- 选择原则：需要全部数据用 LEFT JOIN，只需匹配数据用 INNER JOIN

**Q8：WHERE 和 HAVING 的区别？**

| 特性 | WHERE | HAVING |
|------|-------|--------|
| 过滤时机 | 分组前 | 分组后 |
| 能否使用聚合函数 | 不能 | 能 |
| 执行顺序 | 先执行 | 后执行 |

**Q9：什么是覆盖索引？**

- 查询的所有列都在索引中，无需回表查询
- 例如：索引 (department_id, salary)，查询 `SELECT department_id, salary FROM employees WHERE department_id = 1`
- 优点：减少 I/O，提高查询速度

**Q10：如何实现大批量数据删除？**

```sql
-- 方式1：分批删除
DELETE FROM logs WHERE create_date < '2020-01-01' LIMIT 1000;
-- 循环执行

-- 方式2：创建新表替换
CREATE TABLE logs_new AS SELECT * FROM logs WHERE create_date >= '2020-01-01';
DROP TABLE logs;
RENAME TABLE logs_new TO logs;

-- 方式3：使用 TRUNCATE（清空整表）
TRUNCATE TABLE logs;
```

---

## 十一、总结

### 核心知识点

```
DML 核心操作
├── INSERT：单行插入、批量插入、插入查询结果、ON DUPLICATE KEY UPDATE
├── UPDATE：单列更新、多列更新、表达式更新、子查询更新、多表关联更新
├── DELETE：单行删除、批量删除、子查询删除、多表关联删除
└── SELECT：WHERE、ORDER BY、GROUP BY、HAVING、LIMIT、聚合函数

多表查询
├── 内连接：INNER JOIN
├── 外连接：LEFT JOIN、RIGHT JOIN、FULL JOIN
├── 自连接：表与自身连接
└── 子查询：WHERE、FROM、SELECT、HAVING

性能优化
├── 索引优化：合理创建索引、最左前缀、覆盖索引
├── 查询优化：避免 SELECT *、避免函数操作、优化分页
├── 批量操作：批量 INSERT、分批 DELETE/UPDATE
└── 执行计划：EXPLAIN 分析

安全防护
├── SQL 注入防护：PreparedStatement、#{ } 参数绑定
├── 输入校验：白名单校验
└── 权限控制：最小权限原则
```

### 最佳实践

1. **插入数据**：批量插入优于单条循环
2. **更新数据**：必须带 WHERE 条件，使用事务验证
3. **删除数据**：生产环境推荐软删除
4. **查询数据**：避免 SELECT *，合理使用索引
5. **多表查询**：理解 JOIN 类型，选择合适的方式
6. **分页查询**：大偏移量使用子查询优化
7. **安全防护**：永远使用参数化查询，防止 SQL 注入
8. **性能监控**：开启慢查询日志，定期分析优化

## 版本差异(MySQL 5.7 → 8.0/8.4)

| 特性 | 旧版（本文编写时，MySQL 5.7） | 当前（MySQL 8.0/8.4 LTS） |
|------|-----------------------------|--------------------------|
| 默认字符集 | utf8（需显式配置 utf8mb4） | utf8mb4（MySQL 8.0 起默认） |
| 索引 | 普通 B+Tree | 降序索引、隐藏索引、函数索引（8.0+） |
| SQL 能力 | 常规查询 | 递归 CTE、窗口函数（8.0+） |
| 版本策略 | 5.7 | 8.0（主流）/ 8.4 LTS / 9.x（创新版） |
| Java 驱动 | mysql-connector-java 5.x/8.0 | mysql-connector-j 8.x/9.x |

> 本文基于 MySQL 5.7 编写，核心概念（索引、事务、锁、MVCC、InnoDB）在 8.0/8.4 中依然适用；8.0 的默认字符集、隐藏索引与 SQL 增强（CTE/窗口函数）是升级后的主要差异。
