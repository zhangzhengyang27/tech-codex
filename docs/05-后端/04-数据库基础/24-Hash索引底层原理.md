---
title: Hash 索引底层原理
description: Hash 索引底层原理：哈希函数与 Hash 冲突（链表法）、Hash 索引与 B+ 树索引的功能/原理对比（范围查询、排序、模糊匹配、最左前缀），Memory 引擎默认 Hash 索引与 InnoDB 自适应哈希索引（AHI），以及适用场景选择
keywords: [Hash索引, 哈希表, 内存索引, 冲突处理]
category: 数据库基础
tags: [SQL, 索引, 性能优化]
---

# Hash 索引底层原理

Hash 索引是一种基于哈希表的索引结构，对于等值查询效率极高。本章介绍 Hash 索引的原理、特点和使用场景。

## Hash 函数基础

### 什么是 Hash

Hash（散列）是一种将任意长度输入转换为固定长度输出的函数。

```
输入 → Hash 函数 → 固定长度输出（Hash 值）

特点：
1. 相同输入 → 相同输出
2. 不同输入 → 不同输出（理想情况）
3. 输出长度固定
```

### 常见 Hash 函数

| Hash 函数 | 输出长度 | 特点 |
|:---|:---|:---|
| MD5 | 128 位 | 已不安全，不推荐用于加密 |
| SHA-1 | 160 位 | 已不安全 |
| SHA-256 | 256 位 | 安全，广泛使用 |
| SHA-3 | 可变长度 | 最新标准 |

### Hash 检索效率对比

```python
import time

# 数组检索（全表扫描）
result = []
for i in range(10000):
    result.append(i)

time_start = time.time()
for i in range(10000):
    temp = result.index(i)
time_end = time.time()
print('检索时间:', time_end - time_start)  # 1.24 秒

# Hash 检索（字典）
result = {}
for i in range(1000000):
    result[i] = i

time_start = time.time()
for i in range(10000):
    temp = result[i]
time_end = time.time()
print('检索时间:', time_end - time_start)  # 0.002 秒
```

**结论**：Hash 检索时间复杂度 O(1)，数组检索时间复杂度 O(n)。（示例中的具体耗时为量级示意，实际因环境而异）

## MySQL Hash 索引

### Hash 索引结构

```
┌─────────────────────────────────────────────┐
│              Hash 索引结构                    │
├─────────────────────────────────────────────┤
│                                             │
│    键值 Key → Hash 函数 → 桶 Bucket          │
│                                             │
│    ┌─────┐                                  │
│    │ Key │──→ Hash() ──→ Bucket #n          │
│    └─────┘                   │              │
│                              ↓              │
│                         ┌─────────┐         │
│                         │ 数据行1 │         │
│                         │ 数据行2 │         │
│                         │  ...    │         │
│                         └─────────┘         │
└─────────────────────────────────────────────┘
```

### Hash 索引工作原理

```sql
-- 查询 name = '张三'
SELECT * FROM users WHERE name = '张三';

-- Hash 索引查找过程：
-- 1. 计算 '张三' 的 Hash 值
-- 2. 定位到对应的桶（Bucket）
-- 3. 在桶中查找数据
```

### Hash 冲突

当不同的 Key 映射到同一个桶时，产生 Hash 冲突。

```
解决方式：链表法

Bucket #5:
┌──────────────────┐
│ Hash('张三')=5   │ → [张三的数据]
│ Hash('李四')=5   │ → [李四的数据]
│ Hash('王五')=5   │ → [王五的数据]
└──────────────────┘
```

### Hash 索引示例

```
模拟 Hash 索引：

关键字    内部编码    平方值    Hash值（第8-11位）
A         01         0001      0001
B         02         0004      0004
C         03         0009      0009
...
Z         26         0676      0067

查找 'M'：
1. 计算 Hash('M') = 169 → 取第8-11位 → Hash值
2. 定位到对应桶
3. 在桶中查找
```

## Hash 索引 vs B+ 树索引

### 功能对比

| 功能 | Hash 索引 | B+ 树索引 |
|:---|:---|:---|
| 等值查询 | ✓ 极快 | ✓ 快 |
| 范围查询 | ✗ 不支持 | ✓ 支持 |
| 排序 | ✗ 不支持 | ✓ 支持 |
| 模糊查询 | ✗ 不支持 | ✓ 部分支持 |
| 联合索引最左原则 | ✗ 不支持 | ✓ 支持 |

### 原理对比

| 方面 | Hash 索引 | B+ 树索引 |
|:---|:---|:---|
| 数据结构 | 哈希表 | B+ 树 |
| 数据顺序 | 无序 | 有序 |
| 查找方式 | 一次定位 | 自顶向下查找 |
| 空间利用率 | 取决于冲突率 | 较高 |

### Hash 索引的限制

**1. 不支持范围查询**

```sql
-- Hash 索引无法使用
SELECT * FROM users WHERE id BETWEEN 10 AND 100;

-- B+ 树索引可以高效执行
```

**2. 不支持排序**

```sql
-- Hash 索引无法使用
SELECT * FROM users ORDER BY name;

-- B+ 树索引可以利用有序性
```

**3. 不支持模糊查询**

```sql
-- Hash 索引无法使用
SELECT * FROM users WHERE name LIKE '张%';

-- B+ 树索引可以使用
```

**4. 不支持联合索引最左原则**

```sql
-- 联合索引 (a, b)
-- Hash 索引将 a 和 b 一起计算 Hash 值
-- 无法单独使用 a 或 b 进行查询

-- B+ 树索引支持最左匹配
WHERE a = 1           -- 可以使用索引
WHERE a = 1 AND b = 2 -- 可以使用索引
```

## Hash 索引适用场景

### 适合使用 Hash 索引

| 场景 | 说明 |
|:---|:---|
| 键值数据库 | Redis 等键值存储 |
| 等值查询为主 | 精确匹配场景 |
| 内存数据库 | 内存中 Hash 查询极快 |
| 高性能缓存 | 缓存层使用 |

### 不适合使用 Hash 索引

| 场景 | 说明 |
|:---|:---|
| 范围查询 | Hash 无序 |
| 排序查询 | Hash 无序 |
| 模糊查询 | 不支持 LIKE |
| 重复值多 | 冲突率高，效率低 |

## MySQL 中的 Hash 索引

### Memory 存储引擎

```sql
-- Memory 引擎默认使用 Hash 索引
CREATE TABLE cache_table (
    id INT PRIMARY KEY,
    name VARCHAR(100)
) ENGINE = Memory;

-- 可以指定使用 B+ 树索引
CREATE TABLE cache_table (
    id INT PRIMARY KEY,
    name VARCHAR(100),
    INDEX USING BTREE (name)
) ENGINE = Memory;
```

### InnoDB 自适应 Hash

InnoDB 存储引擎有自适应 Hash 索引功能：

```sql
-- 查看自适应 Hash 状态
SHOW VARIABLES LIKE 'innodb_adaptive_hash_index';

-- 启用/禁用
SET GLOBAL innodb_adaptive_hash_index = ON;
```

**工作原理**：

1. InnoDB 监控索引使用情况
2. 对频繁访问的索引页自动创建 Hash 索引
3. 无需手动干预

## 总结

### Hash 索引特点

| 特点 | 说明 |
|:---|:---|
| 查询速度 | 等值查询 O(1)，极快 |
| 数据顺序 | 无序 |
| 空间占用 | 取决于冲突率 |
| 适用场景 | 等值查询、键值存储 |

### Hash vs B+ 树选择

| 场景 | 推荐索引 |
|:---|:---|
| 等值查询为主 | Hash 索引 |
| 范围查询 | B+ 树索引 |
| 排序查询 | B+ 树索引 |
| 模糊查询 | B+ 树索引 |
| 综合场景 | B+ 树索引（默认选择） |

### 最佳实践

1. **默认使用 B+ 树索引**：MySQL InnoDB 默认使用 B+ 树
2. **键值存储用 Hash**：如 Redis
3. **利用自适应 Hash**：InnoDB 自动优化
4. **避免高冲突场景**：重复值多的字段不适合 Hash
