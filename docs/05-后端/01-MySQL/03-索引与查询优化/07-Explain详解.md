---
title: 查询性能优化（一）：EXPLAIN 详解
description: EXPLAIN 执行计划全解：核心列（id/select_type/type/key/rows/Extra）、访问方法 type 的等级、Extra 额外信息、JSON 格式与成本、optimizer trace 配合；含查询优化实战
keywords: [EXPLAIN, 执行计划, type, Extra, JSON, 优化器, 查询优化]
category: MySQL
tags: [MySQL, 查询优化, 性能分析]
---

# 查询性能优化（一）：EXPLAIN 详解

一条查询语句在经过 `MySQL` 查询优化器的各种基于成本和规则的优化之后，会生成一个所谓的 `执行计划`。这个执行计划展示了接下来具体执行查询的方式，比如多表连接的顺序是什么、对于每个表采用什么访问方法来具体执行查询等。设计 `MySQL` 的工程师贴心地提供了 `EXPLAIN` 语句来帮助我们查看某个查询语句的具体执行计划。本章帮助看懂 `EXPLAIN` 语句的各个输出项，从而有针对性地提升查询语句的性能。

如果想看看某个查询的执行计划，可以在具体的查询语句前边加一个 `EXPLAIN`：

```sql
mysql> EXPLAIN SELECT 1;
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+----------------+
| id | select_type | table | partitions | type | possible_keys | key  | key_len | ref  | rows | filtered | Extra          |
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+----------------+
|  1 | SIMPLE      | NULL  | NULL       | NULL | NULL          | NULL | NULL    | NULL | NULL |     NULL | No tables used |
+----+-------------+-------+------------+------+---------------+------+---------+------+------+----------+----------------+
1 row in set, 1 warning (0.01 sec)
```

`EXPLAIN` 语句输出的各个列的作用大致如下：

| 列名 | 描述 |
|:--:|:--|
| `id` | 在一个大的查询语句中每个 `SELECT` 关键字都对应一个唯一的 `id` |
| `select_type` | `SELECT` 关键字对应的那个查询的类型 |
| `table` | 表名 |
| `partitions` | 匹配的分区信息 |
| `type` | 针对单表的访问方法 |
| `possible_keys` | 可能用到的索引 |
| `key` | 实际上使用的索引 |
| `key_len` | 实际使用到的索引长度 |
| `ref` | 当使用索引列等值查询时，与索引列进行等值匹配的对象信息 |
| `rows` | 预估的需要读取的记录条数 |
| `filtered` | 某个表经过搜索条件过滤后剩余记录条数的百分比 |
| `Extra` | 一些额外的信息 |

## 执行计划输出中各列详解

### table

不论查询语句有多复杂，里边包含多少个表，到最后也是需要对每个表进行单表访问的，所以**EXPLAIN 语句输出的每条记录都对应着某个单表的访问方法，该条记录的 table 列代表着该表的表名**。

### id

查询语句中每出现一个 `SELECT` 关键字，设计 `MySQL` 的工程师就会为它分配一个唯一的 `id` 值。需要注意：

- **在连接查询的执行计划中，每个表都会对应一条记录，这些记录的 id 列的值是相同的**，出现在前边的表表示驱动表，出现在后边的表表示被驱动表。
- 对于包含子查询的查询语句来说，就可能涉及多个 `SELECT` 关键字，每个 `SELECT` 关键字都会对应一个唯一的 `id` 值。
- **查询优化器可能对涉及子查询的查询语句进行重写，从而转换为连接查询**。如果执行计划中所有记录的 `id` 值相同，就表明查询优化器将子查询转换为了连接查询。
- 对于包含 `UNION` 子句的查询语句，最后一个 `UNION RESULT` 记录比较特殊：`id` 值是 `NULL`，且 `table` 列显示 `<union1,2>`，表明是合并两个查询结果集并去重的内部临时表。

### select_type

设计 `MySQL` 的工程师为每一个 `SELECT` 关键字代表的小查询都定义了一个称之为 `select_type` 的属性。只要知道了某个小查询的 `select_type` 属性，就知道了这个小查询在整个大查询中扮演了一个什么角色。常用的值：

| 名称 | 描述 |
|:--:|:--|
| `SIMPLE` | 查询语句中不包含 `UNION` 或者子查询 |
| `PRIMARY` | 对于包含 `UNION`、`UNION ALL` 或者子查询的大查询，其中最左边的查询 |
| `UNION` | 包含 `UNION` 或 `UNION ALL` 的大查询中，除了最左边的那个小查询以外其余的小查询 |
| `UNION RESULT` | `MySQL` 选择使用临时表来完成 `UNION` 查询的去重工作，针对该临时表的查询 |
| `SUBQUERY` | 包含子查询的查询语句不能转为 `semi-join`，且该子查询是不相关子查询，采用物化方案执行 |
| `DEPENDENT SUBQUERY` | 不能转为 `semi-join`，且该子查询是相关子查询（**可能被执行多次**） |
| `DEPENDENT UNION` | 在包含 `UNION` 或 `UNION ALL` 的大查询中，各个小查询都依赖于外层查询时，除最左边以外的其余小查询 |
| `DERIVED` | 采用物化的方式执行的包含派生表的查询，该派生表对应的子查询 |
| `MATERIALIZED` | 查询优化器选择将子查询物化之后与外层查询进行连接查询，该子查询对应的属性 |
| `UNCACHEABLE SUBQUERY` | 结果不能被缓存、必须为外层查询的每一行重新评估的子查询（不常用） |

### partitions

由于本书没有介绍过分区，这个输出列不多介绍，一般情况下查询语句的执行计划的 `partitions` 列的值都是 `NULL`。

### type

执行计划的一条记录就代表着 `MySQL` 对某个表执行查询时的访问方法，其中的 `type` 列就表明了这个访问方法是什么。完整的访问方法如下（性能依次变差）：

| type | 说明 |
|:--:|:--|
| `system` | 表中只有一条记录，且该表使用的存储引擎的统计数据是精确的（如 MyISAM、Memory） |
| `const` | 根据主键或者唯一二级索引列与常数进行等值匹配 |
| `eq_ref` | 连接查询时，被驱动表通过主键或唯一二级索引列等值匹配访问 |
| `ref` | 通过普通二级索引列与常量进行等值匹配 |
| `fulltext` | 全文索引 |
| `ref_or_null` | 对普通二级索引进行等值匹配，且索引列的值也可以是 `NULL` |
| `index_merge` | 使用 Intersection、Union、Sort-Union 索引合并方式执行 |
| `unique_subquery` | 将 `IN` 子查询转换为 `EXISTS` 子查询，且子查询可以使用到主键进行等值匹配 |
| `index_subquery` | 与 `unique_subquery` 类似，但访问子查询中的表时使用的是普通索引 |
| `range` | 使用索引获取某些 `范围区间` 的记录 |
| `index` | 可以使用索引覆盖，但需要扫描全部的索引记录 |
| `ALL` | 全表扫描 |

一般来说，这些访问方法按照介绍它们的顺序性能依次变差。其中除了 `ALL` 这个访问方法外，其余的访问方法都能用到索引；除了 `index_merge` 访问方法外，其余的访问方法都最多只能用到一个索引。

### possible_keys和key

在 `EXPLAIN` 语句输出的执行计划中，`possible_keys` 列表示在某个查询语句中对某个表执行单表查询时可能用到的索引有哪些，`key` 列表示实际用到的索引有哪些。需要注意：**possible_keys 列中的值并不是越多越好，可能使用的索引越多，查询优化器计算查询成本时就不得不花费更长时间**。

### key_len

`key_len` 列表示当优化器决定使用某个索引执行查询时，该索引记录的最大长度，它由下面三个部分构成：

- 对于使用固定长度类型的索引列来说，它实际占用的存储空间的最大长度就是该固定值；对于指定字符集的变长类型的索引列来说，按字符集编码的最大字节数计算；
- 如果该索引列可以存储 `NULL` 值，则 `key_len` 比不可以存储 `NULL` 值时多 1 个字节；
- 对于变长字段来说，都会有 2 个字节的空间来存储该变长列的实际长度。

`key_len` 列主要用于**区分某个使用联合索引的查询具体用了几个索引列**。比如联合索引 `(key_part1, key_part2, key_part3)`，`key_len=303` 说明只用了 1 个索引列，`key_len=606` 说明用了 2 个索引列（按 `utf8` 即 utf8mb3 计算：`100×3=300` 字节 + 2 字节变长长度 + 1 字节 NULL 标记 = 303）。若字符集为 `utf8mb4`，每字符按 4 字节计算：`utf8mb4 VARCHAR(100) NOT NULL` 的 `key_len` 为 `402`（400+2），允许 NULL 再加 1 为 `403`。

### ref

当使用索引列等值匹配的条件去执行查询时，也就是在访问方法是 `const`、`eq_ref`、`ref`、`ref_or_null`、`unique_subquery`、`index_subquery` 其中之一时，`ref` 列展示的就是与索引列作等值匹配的对象是什么，比如只是一个常数（`const`）、某个列（如 `xiaohaizi.s1.id`），或者是一个函数（`func`）。

### rows

如果查询优化器决定使用全表扫描的方式对某个表执行查询，执行计划的 `rows` 列就代表预计需要扫描的行数；如果使用索引来执行查询，执行计划的 `rows` 列就代表预计扫描的索引记录行数。

### filtered

`filtered` 列代表查询优化器预测在某次查询中，满足除使用到对应索引的搜索条件外的其他搜索条件的记录占 `rows` 的百分比。对于单表查询来说，`filtered` 列的值意义不大，更关注在连接查询中驱动表对应的执行计划记录的 `filtered` 值，它用于计算驱动表的扇出值（扇出值 = rows × filtered）。

### Extra

`Extra` 列是用来说明一些额外信息的，通过这些额外信息可以更准确地理解 `MySQL` 到底将如何执行给定的查询语句。常用的额外信息：

| Extra 值 | 含义 |
|:--|:--|
| `No tables used` | 查询语句没有 `FROM` 子句 |
| `Impossible WHERE` | `WHERE` 子句永远为 `FALSE` |
| `No matching min/max row` | 查询列表有 `MIN`/`MAX` 聚集函数，但无符合 `WHERE` 的记录 |
| `Using index` | 使用索引覆盖，不需要回表 |
| `Using index condition` | 使用了索引条件下推（ICP） |
| `Using where` | 使用全表扫描且 `WHERE` 有针对该表的条件；或使用索引但 `WHERE` 有索引列之外的搜索条件 |
| `Using join buffer (Block Nested Loop)` / `Using join buffer (hash join)` | 被驱动表不能有效利用索引，使用 `join buffer` 加快查询（8.0.18 起 hash join 取代 BNL，8.0.46 实测无索引等值连接显示 `Using join buffer (hash join)`） |
| `Not exists` | 左（外）连接中，被驱动表某列等于 `NULL` 且该列不允许为 `NULL` |
| `Using intersect(...)` / `Using union(...)` / `Using sort_union(...)` | 使用索引合并方式执行 |
| `Zero limit` | `LIMIT` 子句的参数为 0 |
| `Using filesort` | 需要使用文件排序方式排序（在内存或磁盘上） |
| `Using temporary` | 查询中使用了内部临时表（如去重、排序、分组） |
| `Start temporary` / `End temporary` | 使用 `DuplicateWeedout` 执行策略的半连接 |
| `LooseScan` | 使用 `LooseScan` 执行策略的半连接 |
| `FirstMatch(tbl_name)` | 使用 `FirstMatch` 执行策略的半连接 |

**注意 `Using filesort` 与 `Using temporary`**：如果查询中需要使用 `filesort` 方式进行排序的记录非常多，这个过程很耗费性能，最好想办法将使用 `文件排序` 的执行方式改为使用索引进行排序。执行计划中出现 `Using temporary` 也不是一个好的征兆，因为建立与维护临时表要付出很大成本，所以最好能使用索引来替代临时表。

## JSON格式的执行计划

上面介绍的 `EXPLAIN` 语句输出中缺少了一个衡量执行计划好坏的重要属性——**成本**。设计 `MySQL` 的工程师提供了一种查看某个执行计划花费成本的方式：

- 在 `EXPLAIN` 单词和真正的查询语句中间加上 `FORMAT=JSON`。

这样就能得到一个 `json` 格式的执行计划，里边包含该计划花费的成本，比如这样：

```sql
mysql> EXPLAIN FORMAT=JSON SELECT * FROM s1 INNER JOIN s2 ON s1.key1 = s2.key2 WHERE s1.common_field = 'a'\G
*************************** 1. row ***************************
EXPLAIN: {
  "query_block": {
    "select_id": 1,
    "cost_info": {
      "query_cost": "3197.16"   # 整个查询的执行成本预计为3197.16
    },
    "nested_loop": [
      {
        "table": {
          "table_name": "s1",   # s1表是驱动表
          "access_type": "ALL",     # 访问方法为ALL，全表扫描
          "possible_keys": ["idx_key1"],
          "rows_examined_per_scan": 9688,
          "rows_produced_per_join": 968,
          "filtered": "10.00",
          "cost_info": {
            "read_cost": "1840.84",
            "eval_cost": "193.76",
            "prefix_cost": "2034.60",   # 单次查询s1表总共的成本
            "data_read_per_join": "1M"
          }
        }
      },
      {
        "table": {
          "table_name": "s2",   # s2表是被驱动表
          "access_type": "ref",     # 访问方法为ref
          "possible_keys": ["idx_key2"],
          "key": "idx_key2",
          "used_key_parts": ["key2"],
          "key_length": "5",
          "ref": ["xiaohaizi.s1.key1"],
          "rows_examined_per_scan": 1,
          "filtered": "100.00",
          "cost_info": {
            "read_cost": "968.80",
            "eval_cost": "193.76",
            "prefix_cost": "3197.16",   # 整个连接查询预计的成本
            "data_read_per_join": "1M"
          }
        }
      }
    ]
  }
}
```

其中 `"cost_info"` 里的成本计算：

- `read_cost` 由两部分组成：`IO` 成本、检测 `rows × (1 - filter)` 条记录的 `CPU` 成本；
- `eval_cost` 这样计算：检测 `rows × filter` 条记录的成本；
- `prefix_cost` 就是单次查询该表的成本，也就是 `read_cost + eval_cost`；
- 对于被驱动表，`prefix_cost` 代表整个连接查询预计的成本（单次查询驱动表 + 多次查询被驱动表的成本之和）。

::: tip 小贴士
其实没必要关注 MySQL 为什么使用这么古怪的方式计算出 read_cost 和 eval_cost，关注 prefix_cost 是查询某表的成本即可。
:::

## Extended Explain

在使用 `EXPLAIN` 语句查看了某个查询的执行计划后，还可以使用 `SHOW WARNINGS` 语句查看与这个查询的执行计划有关的一些扩展信息：

```sql
mysql> EXPLAIN SELECT s1.key1, s2.key1 FROM s1 LEFT JOIN s2 ON s1.key1 = s2.key1 WHERE s2.common_field IS NOT NULL;
...
2 rows in set, 1 warning (0.00 sec)

mysql> SHOW WARNINGS\G
*************************** 1. row ***************************
  Level: Note
   Code: 1003
Message: /* select#1 */ select `xiaohaizi`.`s1`.`key1` AS `key1`,`xiaohaizi`.`s2`.`key1` AS `key1` from `xiaohaizi`.`s1` join `xiaohaizi`.`s2` where ((`xiaohaizi`.`s1`.`key1` = `xiaohaizi`.`s2`.`key1`) and (`xiaohaizi`.`s2`.`common_field` is not null))
```

`SHOW WARNINGS` 展示出来的信息有三个字段：`Level`、`Code`、`Message`。最常见的是 `Code` 为 `1003` 的信息，此时 `Message` 字段展示的信息**类似于**查询优化器将查询语句重写后的语句。比如上面的查询本来是一个左（外）连接查询，但有一个 `s2.common_field IS NOT NULL` 的条件，会导致查询优化器把左（外）连接查询优化为内连接查询，从 `Message` 字段也可以看出来，原本的 `LEFT JOIN` 已经变成了 `JOIN`。

需要注意，`Message` 字段展示的信息**类似于**查询优化器将查询语句重写后的语句，并不完全等价，在很多情况下不能直接放到命令行中运行。

## 配合 optimizer trace

如果对使用 `EXPLAIN` 语句展示出的某个查询的执行计划很不理解，可以尝试使用 `optimizer trace` 功能来详细了解每一种执行方案对应的成本（开启方式：`SET optimizer_trace="enabled=on";`，然后查询 `information_schema.OPTIMIZER_TRACE` 表）。优化过程大致分为 `prepare` 阶段、`optimize` 阶段、`execute` 阶段，其中基于成本的优化主要集中在 `optimize` 阶段。通过 `optimizer trace` 可以了解优化器为什么选择了某个执行计划，而不是其他方案。

## 小结

1. `EXPLAIN` 用于查看查询的执行计划，每个输出列都有明确含义，核心是 `type`（访问方法）与 `key`（实际使用索引）。
2. `type` 从 `system`/`const` 到 `ALL` 性能依次变差，`ALL` 是全表扫描。
3. `Extra` 列包含丰富额外信息，`Using filesort`、`Using temporary` 是需要重点优化的信号。
4. `EXPLAIN FORMAT=JSON` 可查看执行计划成本，`SHOW WARNINGS` 可查看优化器重写后的语句，`optimizer trace` 可深入分析优化决策。

## 第二部分：查询优化实战

理解 `EXPLAIN` 各列之后，本节聚焦**怎么用**：给出完整的"三步分析法"与高频场景优化方案，并附真实 Bad SQL 案例与慢查询治理闭环。查询性能优化的本质是**减少 IO（磁盘/网络）与计算量**，一条 SQL 的优化路径是固定的：先看执行计划（EXPLAIN），再针对瓶颈环节（访问类型、扫描行数、排序、临时表）精准改造。

### SELECT 的执行过程回顾

一条 `SELECT` 在 Server 层经历：连接 → 解析 → 预处理 → **优化器生成执行计划** → 执行引擎按计划取数 → 排序/分组/投影 → 返回。**优化器是"黑盒"**，但我们可以通过 `EXPLAIN` 观察到它"看到了什么、选择了什么"，并可通过 `optimizer trace` 深入其决策过程。

```sql
-- 查看优化器详细决策（8.0）
SET optimizer_trace = "enabled=on";
SELECT ...;
SELECT * FROM information_schema.OPTIMIZER_TRACE\G
```

### EXPLAIN 执行计划"三步曲"

拿到一条慢 SQL，按三步读 `EXPLAIN`：

```sql
EXPLAIN SELECT o.id, u.name FROM user_order o
  JOIN user u ON o.user_id = u.id
  WHERE o.created_at >= '2026-01-01' AND o.status = 1
  ORDER BY o.created_at DESC LIMIT 20;
```

#### 第一步：看 type（访问类型）——最核心

| type | 含义 | 性能 |
|------|------|:----:|
| system | 系统表，仅一行 | 🟢 极优 |
| const | 主键/唯一键等值查询，最多一行 | 🟢 极优 |
| eq_ref | JOIN 时被驱动表按主键/唯一键等值匹配 | 🟢 优 |
| ref | 非唯一索引等值匹配 | 🟡 良 |
| range | 索引范围扫描（>、<、BETWEEN、IN） | 🟡 良 |
| index | 全索引扫描（索引树遍历） | 🟠 中 |
| **ALL** | **全表扫描** | 🔴 **差，必须优化** |

**优化目标**：把 `ALL` 提升到 `range` 及以上。`ALL` 出现在大表上意味着扫描所有数据页，是慢查询的第一信号。

#### 第二步：看 key 与 rows（用到的索引与估算行数）

- `key`：实际使用的索引（空 = 没走索引）；
- `rows`：优化器估算的扫描行数（**估算**，8.0 基于持久化统计信息；`EXPLAIN ANALYZE`（8.0.18+）给出**实际**执行数据）；
- 对比 `rows` 与表实际行数：偏差大说明统计信息过期（`ANALYZE TABLE` 修复）。

#### 第三步：看 Extra（附加信息）——揭示隐藏问题

| Extra | 含义 | 处理 |
|-------|------|------|
| Using index | 覆盖索引，零回表 | ✅ 理想 |
| Using index condition | ICP 索引下推生效 | ✅ 良好 |
| Using where | 存储引擎返回后 Server 层再过滤 | 检查是否可下推到索引 |
| **Using filesort** | 文件排序（不是磁盘文件，是内存/磁盘排序） | ⚠️ 优化 ORDER BY 走索引 |
| **Using temporary** | 使用临时表（GROUP BY/DISTINCT 常见） | ⚠️ 改索引或改写 SQL |
| Using join buffer | JOIN 时被驱动表无法用索引，用缓冲 | 🔴 给被驱动表连接列加索引 |
| **Using index for group-by** | 松散索引扫描 | ✅ 良好 |

> **EXPLAIN ANALYZE（8.0.18+）**：`EXPLAIN ANALYZE SELECT ...` 真实执行并输出每个节点的实际行数、耗时与循环次数，比传统 EXPLAIN 的估算值可靠得多，是 8.0 排障利器。

### 高频场景优化

#### ORDER BY 优化

```sql
-- ❌ Using filesort：排序无法利用索引
SELECT * FROM t WHERE a=1 ORDER BY b;
-- ✅ 联合索引 (a,b)：a 过滤 + b 天然有序，零 filesort
CREATE INDEX idx_a_b ON t(a, b);
```

- 排序方向要一致：`(a ASC, b DESC)` 需要 8.0 降序索引配合；
- 大结果集排序：`ORDER BY` 走索引优先；否则 `max_sort_length`/`sort_buffer_size` 调优，或分页限制返回量。

#### GROUP BY 优化

```sql
-- ❌ Using temporary + filesort：先临时表分组再排序
SELECT status, COUNT(*) FROM t GROUP BY status;
-- ✅ 建 (status) 索引：松散索引扫描，避免临时表
```

- GROUP BY 的列尽量来自**同一索引的最左前缀**；
- 只关心分组无需排序：`GROUP BY status ORDER BY NULL`（8.0.13 起 `GROUP BY` 已不再隐式排序，此技巧已无必要）。

#### COUNT 优化

| 需求 | 最佳方案 |
|------|---------|
| `COUNT(*)` 精确总数 | InnoDB 必须扫索引（无捷径）；大表用近似值或缓存 |
| `COUNT(1)` | 与 COUNT(*) 等价（不数 NULL） |
| `COUNT(col)` | 只统计非 NULL，明确语义 |
| 条件计数 | 覆盖索引：`SELECT COUNT(*) FROM t WHERE status=1` 配 (status) 索引走覆盖扫描 |

> **误区**：`COUNT(*)` 比 `COUNT(1)` 慢？在 InnoDB 中两者完全等价，优化器都走最小索引扫描。真正昂贵的是**大表全量计数**——高频场景用 Redis 计数或汇总表。

#### JOIN 优化

```sql
-- ❌ 小表驱动大表被忽略：被驱动表连接列无索引 → Using join buffer
SELECT * FROM big b JOIN small s ON b.user_id = s.user_id;
-- ✅ 被驱动表 b.user_id 建索引：驱动表（小表）取其值做 eq_ref/ref 查询
```

- **被驱动表的连接列必须有索引**（JOIN 优化的第一原则）；
- 驱动表选择：优化器按估算行数选（`straight_join` 可强制，但先确认优化器判断）；
- 超过 3 张表 JOIN 警惕：拆分为多次查询在应用层合并，或物化中间结果。

#### 分页优化

```sql
-- ❌ 深分页：OFFSET 1000000 仍要扫描并丢弃前 100 万行
SELECT * FROM t ORDER BY id LIMIT 1000000, 20;
-- ✅ 延迟关联/游标分页：只在索引上定位，再回表取 20 行
SELECT * FROM t JOIN (SELECT id FROM t ORDER BY id LIMIT 1000000, 20) tmp
  ON t.id = tmp.id;
-- ✅ 或者基于上一页游标（业务允许时最佳）
SELECT * FROM t WHERE id > 1000000 ORDER BY id LIMIT 20;
```

### Bad SQL 案例集

| 案例 | 问题 | 优化 |
|------|------|------|
| `WHERE DATE(created_at)='2026-01-01'` | 函数包裹索引列，索引失效 | 范围条件 `created_at >= '2026-01-01 00:00:00' AND < '2026-01-02'` 或函数索引 |
| `WHERE phone=13800138000` | 隐式类型转换，索引失效 | 字符串加引号 |
| `LIKE '%keyword%'` | 前导通配符 | 全文索引（8.0 支持中文 ngram 分词）/ES |
| `SELECT *` 大字段 | 回表取大字段拖慢 | 只查必要列（覆盖索引） |
| `OR` 多条件 | 优化器可能全表扫描 | `UNION ALL` 或确保每分支可走索引 |
| `IN (大列表)` | 列表过大退化为全扫 | 分批查询或 JOIN 临时表 |
| 无索引外键列 JOIN | Using join buffer | 连接列建索引 |
| `SELECT DISTINCT` 大表 | 临时表 + 排序 | 聚合下推或物化 |

### 慢查询治理闭环

```text
慢查询日志（long_query_time=1s）→ 定时采集 → 按频率/耗时排序
→ EXPLAIN 分析 → 索引/改写/架构方案 → 上线验证（对比执行计划与前/后耗时）
→ 沉淀规则（禁止 SELECT *、禁止无索引 UPDATE 等）
```

```sql
-- 8.0 慢查询相关配置
SET GLOBAL slow_query_log = ON;
SET GLOBAL long_query_time = 1;            -- 阈值 1 秒
SET GLOBAL log_queries_not_using_indexes = ON;  -- 记录未走索引的查询
-- 查询慢日志
SELECT * FROM mysql.slow_log \G   -- 或文件版：mysqldumpslow /var/log/mysql/slow.log
```

### 应用层性能优化

数据库优化有天花板，应用层配合才能"治本"：

1. **缓存**：热点数据 Redis 缓存（注意一致性：先更新库再删缓存）；
2. **读写分离**：读多写少场景，主库写、从库读；
3. **批量替代循环**：`INSERT ... VALUES (...),(...)` 代替循环单条（减少网络往返）；
4. **连接池**：控制连接数，避免连接风暴拖垮数据库；
5. **限流与降级**：保护数据库不被突发流量击穿。

## 小结（二）：查询优化实战

- 三步读 EXPLAIN：**type（访问类型）→ key/rows（索引与行数）→ Extra（隐藏问题）**，8.0 用 `EXPLAIN ANALYZE` 拿到真实执行数据；
- 四大高频优化：ORDER BY 走索引避免 filesort、GROUP BY 松散扫描避免临时表、COUNT 用覆盖索引、JOIN 给被驱动表加索引；
- 深分页用游标/延迟关联，Bad SQL 的核心病根是"索引失效"与"不必要的全表扫描"；
- 慢查询治理要形成"采集→分析→优化→验证→沉淀"闭环，配合应用层缓存与读写分离。
