---
title: InnoDB统计数据
description: InnoDB 统计数据（表/索引统计）的收集方式：磁盘永久统计与内存统计，及其对优化器选路的影响
keywords: [统计数据, 统计信息, 优化器, analyze table, 采样]
category: MySQL
tags: [MySQL, InnoDB, 查询优化]
---

# InnoDB统计数据

前面讲查询成本时经常用到一些统计数据：通过 `SHOW TABLE STATUS` 可以看到关于表的统计数据，通过 `SHOW INDEX` 可以看到关于索引的统计数据。那么这些统计数据是怎么来的？以什么方式收集的？本章聚焦 `InnoDB` 存储引擎的统计数据收集策略，看完本章就会明白为什么 `InnoDB` 的统计信息是不精确的估计值（这里不介绍 `MyISAM` 存储引擎统计数据的收集和存储方式，有兴趣可以查看文档）。

## 两种不同的统计数据存储方式

`InnoDB` 提供了两种存储统计数据的方式：

- 永久性的统计数据

  这种统计数据存储在磁盘上，服务器重启之后这些统计数据还在。

- 非永久性的统计数据

  这种统计数据存储在内存中，服务器关闭时这些统计数据被清除掉。服务器重启之后，在某些适当场景下才会重新收集这些统计数据。

设计者提供了系统变量 `innodb_stats_persistent` 控制采用哪种方式存储统计数据。在 `MySQL 5.6.6` 之前，`innodb_stats_persistent` 的值默认是 `OFF`，即 `InnoDB` 的统计数据默认存储到内存；之后的版本中 `innodb_stats_persistent` 的值默认是 `ON`，即统计数据默认存储到磁盘。

不过 `InnoDB` 默认是**以表为单位来收集和存储统计数据的**，可以把某些表的统计数据（以及该表的索引统计数据）存储在磁盘上，把另一些表的统计数据存储在内存中。怎么做？可以在创建和修改表时通过指定 `STATS_PERSISTENT` 属性指明该表的统计数据存储方式：

```sql
CREATE TABLE 表名 (...) Engine=InnoDB, STATS_PERSISTENT = (1|0);

ALTER TABLE 表名 Engine=InnoDB, STATS_PERSISTENT = (1|0);
```

当 `STATS_PERSISTENT=1` 时，表明想把该表的统计数据永久存储到磁盘上；当 `STATS_PERSISTENT=0` 时，表明想把该表的统计数据临时存储到内存中。如果在创建表时未指定 `STATS_PERSISTENT` 属性，默认采用系统变量 `innodb_stats_persistent` 的值作为该属性的值。

## 基于磁盘的永久性统计数据

当选择把某个表以及该表索引的统计数据存放到磁盘上时，这些统计数据存储到了两个表里：

```text
mysql> SHOW TABLES FROM mysql LIKE 'innodb%';
+---------------------------+
| Tables_in_mysql (innodb%) |
+---------------------------+
| innodb_index_stats        |
| innodb_table_stats        |
+---------------------------+
2 rows in set (0.01 sec)
```

这两个表都位于 `mysql` 系统数据库下边，其中：

- `innodb_table_stats` 存储了关于表的统计数据，每一条记录对应一个表的统计数据；
- `innodb_index_stats` 存储了关于索引的统计数据，每一条记录对应一个索引的一个统计项的统计数据。

下面看这两个表里有什么以及表里的数据如何生成。

### innodb_table_stats

先看 `innodb_table_stats` 表中的各个列：

| 字段名 | 描述 |
|:--:|:--|
| `database_name` | 数据库名 |
| `table_name` | 表名 |
| `last_update` | 本条记录最后更新时间 |
| `n_rows` | 表中记录的条数 |
| `clustered_index_size` | 表的聚簇索引占用的页面数量 |
| `sum_of_other_index_sizes` | 表的其他索引占用的页面数量 |

注意这个表的主键是 `(database_name,table_name)`，也就是 **innodb_table_stats 表的每条记录代表着一个表的统计信息**。直接看这个表里的内容：

```text
mysql> SELECT * FROM mysql.innodb_table_stats;
+---------------+---------------+---------------------+--------+----------------------+--------------------------+
| database_name | table_name    | last_update         | n_rows | clustered_index_size | sum_of_other_index_sizes |
+---------------+---------------+---------------------+--------+----------------------+--------------------------+
| mysql         | gtid_executed | 2018-07-10 23:51:36 |      0 |                    1 |                        0 |
| sys           | sys_config    | 2018-07-10 23:51:38 |      5 |                    1 |                        0 |
| xiaohaizi     | single_table  | 2018-12-10 17:03:13 |   9693 |                   97 |                      175 |
+---------------+---------------+---------------------+--------+----------------------+--------------------------+
3 rows in set (0.01 sec)
```

熟悉的 `single_table` 表的统计信息对应 `mysql.innodb_table_stats` 的第三条记录。几个重要统计信息项的值：

- `n_rows` 的值是 `9693`，表明 `single_table` 表中大约有 9693 条记录，这个数据是估计值；
- `clustered_index_size` 的值是 `97`，表明 `single_table` 表的聚簇索引占用 97 个页面，这个值也是估计值；
- `sum_of_other_index_sizes` 的值是 `175`，表明 `single_table` 表的其他索引一共占用 175 个页面，这个值也是估计值。

#### n_rows统计项的收集

为什么老强调 `n_rows` 这个统计项的值是估计值？`InnoDB` 统计一个表中有多少行记录的思路如下：

- 按照一定算法（并不是纯粹随机）选取几个叶子节点页面，计算每个页面中主键值记录数量，然后计算平均一个页面中主键值的记录数量，再乘以全部叶子节点的数量，就算是该表的 `n_rows` 值。

::: tip 小贴士
真实的计算过程比这个稍微复杂一些，不过大致上就是这样。
:::

可以看出，`n_rows` 值精确与否取决于统计时采样的页面数量。设计者准备了一个名为 `innodb_stats_persistent_sample_pages` 的系统变量，来控制**使用永久性统计数据时，计算统计数据采样的页面数量**。该值设置越大，统计出的 `n_rows` 值越精确，但统计耗时越久；设置越小，`n_rows` 值越不精确，但统计耗时特别少。实际使用时需要权衡利弊，该系统变量的默认值是 `20`。

`InnoDB` 默认是**以表为单位来收集和存储统计数据的**，也可以单独设置某个表的采样页面数量，设置方式是在创建或修改表时通过指定 `STATS_SAMPLE_PAGES` 属性：

```sql
CREATE TABLE 表名 (...) Engine=InnoDB, STATS_SAMPLE_PAGES = 具体的采样页面数量;

ALTER TABLE 表名 Engine=InnoDB, STATS_SAMPLE_PAGES = 具体的采样页面数量;
```

如果创建表语句中没有指定 `STATS_SAMPLE_PAGES` 属性，默认使用系统变量 `innodb_stats_persistent_sample_pages` 的值作为该属性的值。

#### clustered_index_size和sum_of_other_index_sizes统计项的收集

统计这两个数据需要用到之前介绍的 `InnoDB` 表空间知识。**如果没有看那一章，下面的计算过程可能难以理解**。如果看过了，会发现 `InnoDB` 表空间的知识很有用。

这两个统计项的收集过程如下：

- 从数据字典里找到表的各个索引对应的根页面位置

  系统表 `SYS_INDEXES` 里存储了各个索引对应的根页面信息（这是 5.7 时代的内部系统表，MySQL 8.0 起由数据字典表承担这一职责）。

- 从根页面的 `Page Header` 里找到叶子节点段和非叶子节点段对应的 `Segment Header`

  在每个索引的根页面的 `Page Header` 部分有两个字段：
  - `PAGE_BTR_SEG_LEAF`：表示 B+ 树叶子段的 `Segment Header` 信息；
  - `PAGE_BTR_SEG_TOP`：表示 B+ 树非叶子段的 `Segment Header` 信息。

- 从叶子节点段和非叶子节点段的 `Segment Header` 中找到这两个段对应的 `INODE Entry` 结构

  `Segment Header` 结构如下：

```mermaid
block-beta
    columns 3
    a["Space ID of the INODE Entry<br/>4字节"]
    b["Page Number of the INODE Entry<br/>4字节"]
    c["Byte Offset of the INODE Entry<br/>2字节"]
```

- 从对应的 `INODE Entry` 结构中找到该段对应所有零散的页面地址以及 `FREE`、`NOT_FULL`、`FULL` 链表的基节点

  `INODE Entry` 结构如下：

```mermaid
block-beta
    columns 5
    a["Segment ID"]
    b["NOT_FULL_N_USED"]
    c["3个 List Base Node<br/>(FREE/NOT_FULL/FULL)"]
    d["Magic Number"]
    e["Fragment Array Entry × 32"]
```

- 直接统计零散的页面有多少个，然后从那三个链表的 `List Length` 字段中读出该段占用的区的大小，每个区占用 `64` 个页，就可以统计出整个段占用的页面

  链表基节点的示意图：

```mermaid
block-beta
    columns 5
    a["List Length"]
    b["First Node Page Number"]
    c["First Node Offset"]
    d["Last Node Page Number"]
    e["Last Node Offset"]
```

- 分别计算聚簇索引的叶子节点段和非叶子节点段占用的页面数，它们的和就是 `clustered_index_size` 的值；按同样套路把其余索引占用的页面数都算出来，加起来就是 `sum_of_other_index_sizes` 的值。

需要注意一个问题：一个段的数据非常多时（超过 32 个页面），会以 `区` 为单位申请空间。以区为单位申请的空间中**有一些页可能并没有使用**，但在统计 `clustered_index_size` 和 `sum_of_other_index_sizes` 时都把它们算进去了，所以说聚簇索引和其他的索引占用的页面数可能比这两个值小一些。

### innodb_index_stats

先看 `innodb_index_stats` 表中的各个列：

| 字段名 | 描述 |
|:--:|:--|
| `database_name` | 数据库名 |
| `table_name` | 表名 |
| `index_name` | 索引名 |
| `last_update` | 本条记录最后更新时间 |
| `stat_name` | 统计项的名称 |
| `stat_value` | 对应的统计项的值 |
| `sample_size` | 为生成统计数据而采样的页面数量 |
| `stat_description` | 对应的统计项的描述 |

注意这个表的主键是 `(database_name,table_name,index_name,stat_name)`，其中的 `stat_name` 指统计项的名称，也就是说 **innodb_index_stats 表的每条记录代表着一个索引的一个统计项**。直接看一下 `single_table` 表的索引统计数据：

```text
mysql> SELECT * FROM mysql.innodb_index_stats WHERE table_name = 'single_table';
+---------------+--------------+--------------+---------------------+--------------+------------+-------------+-----------------------------------+
| database_name | table_name   | index_name   | last_update         | stat_name    | stat_value | sample_size | stat_description                  |
+---------------+--------------+--------------+---------------------+--------------+------------+-------------+-----------------------------------+
| xiaohaizi     | single_table | PRIMARY      | 2018-12-14 14:24:46 | n_diff_pfx01 |       9693 |          20 | id                                |
| xiaohaizi     | single_table | PRIMARY      | 2018-12-14 14:24:46 | n_leaf_pages |         91 |        NULL | Number of leaf pages in the index |
| xiaohaizi     | single_table | PRIMARY      | 2018-12-14 14:24:46 | size         |         97 |        NULL | Number of pages in the index      |
| xiaohaizi     | single_table | idx_key1     | 2018-12-14 14:24:46 | n_diff_pfx01 |        968 |          28 | key1                              |
| xiaohaizi     | single_table | idx_key1     | 2018-12-14 14:24:46 | n_diff_pfx02 |      10000 |          28 | key1,id                           |
| xiaohaizi     | single_table | idx_key1     | 2018-12-14 14:24:46 | n_leaf_pages |         28 |        NULL | Number of leaf pages in the index |
| xiaohaizi     | single_table | idx_key1     | 2018-12-14 14:24:46 | size         |         29 |        NULL | Number of pages in the index      |
| xiaohaizi     | single_table | idx_key2     | 2018-12-14 14:24:46 | n_diff_pfx01 |      10000 |          16 | key2                              |
| xiaohaizi     | single_table | idx_key2     | 2018-12-14 14:24:46 | n_leaf_pages |         16 |        NULL | Number of leaf pages in the index |
| xiaohaizi     | single_table | idx_key2     | 2018-12-14 14:24:46 | size         |         17 |        NULL | Number of pages in the index      |
| xiaohaizi     | single_table | idx_key3     | 2018-12-14 14:24:46 | n_diff_pfx01 |        799 |          31 | key3                              |
| xiaohaizi     | single_table | idx_key3     | 2018-12-14 14:24:46 | n_diff_pfx02 |      10000 |          31 | key3,id                           |
| xiaohaizi     | single_table | idx_key3     | 2018-12-14 14:24:46 | n_leaf_pages |         31 |        NULL | Number of leaf pages in the index |
| xiaohaizi     | single_table | idx_key3     | 2018-12-14 14:24:46 | size         |         32 |        NULL | Number of pages in the index      |
| xiaohaizi     | single_table | idx_key_part | 2018-12-14 14:24:46 | n_diff_pfx01 |       9673 |          64 | key_part1                         |
| xiaohaizi     | single_table | idx_key_part | 2018-12-14 14:24:46 | n_diff_pfx02 |       9999 |          64 | key_part1,key_part2               |
| xiaohaizi     | single_table | idx_key_part | 2018-12-14 14:24:46 | n_diff_pfx03 |      10000 |          64 | key_part1,key_part2,key_part3     |
| xiaohaizi     | single_table | idx_key_part | 2018-12-14 14:24:46 | n_diff_pfx04 |      10000 |          64 | key_part1,key_part2,key_part3,id  |
| xiaohaizi     | single_table | idx_key_part | 2018-12-14 14:24:46 | n_leaf_pages |         64 |        NULL | Number of leaf pages in the index |
| xiaohaizi     | single_table | idx_key_part | 2018-12-14 14:24:46 | size         |         97 |        NULL | Number of pages in the index      |
+---------------+--------------+--------------+---------------------+--------------+------------+-------------+-----------------------------------+
20 rows in set (0.03 sec)
```

结果有点多，正确查看结果的方式：

- 先查看 `index_name` 列，这个列说明该记录是哪个索引的统计信息。从结果中可以看出，`PRIMARY` 索引（主键）占了 3 条记录，`idx_key_part` 索引占了 6 条记录。
- 针对 `index_name` 列相同的记录，`stat_name` 表示针对该索引的统计项名称，`stat_value` 展示该索引在该统计项上的值，`stat_description` 描述该统计项的含义。具体看一个索引有哪些统计项：

  - `n_leaf_pages`：表示该索引的叶子节点占用多少页面；
  - `size`：表示该索引共占用多少页面；
  - `n_diff_pfxNN`：表示对应的索引列不重复的值有多少。其中 `NN` 可以被替换为 `01`、`02`、`03`... 这样的数字。例如对 `idx_key_part`：
    - `n_diff_pfx01` 表示统计 `key_part1` 这一个列不重复的值有多少；
    - `n_diff_pfx02` 表示统计 `key_part1、key_part2` 这两个列组合起来不重复的值有多少；
    - `n_diff_pfx03` 表示统计 `key_part1、key_part2、key_part3` 这三个列组合起来不重复的值有多少；
    - `n_diff_pfx04` 表示统计 `key_part1、key_part2、key_part3、id` 这四个列组合起来不重复的值有多少。

    ::: tip 小贴士
    对于普通的二级索引，并不能保证索引列值是唯一的，比如对 idx_key1 来说，key1 列就可能有很多值重复的记录。此时只有在索引列上加上主键值才可以区分两条索引列值相同的二级索引记录。对主键和唯一二级索引则没有这个问题，它们本身就可以保证索引列值不重复，所以不需要再统计在索引列后加上主键值的不重复值有多少。比如上面的 idx_key1 有 n_diff_pfx01、n_diff_pfx02 两个统计项，而 idx_key2 却只有 n_diff_pfx01 一个统计项。
    :::

- 在计算某些索引列中包含多少不重复值时，需要对一些叶子节点页面采样，`sample_size` 列就表明了采样的页面数量。

  ::: tip 小贴士
  对多列的联合索引来说，采样的页面数量是：innodb_stats_persistent_sample_pages × 索引列的个数。当需要采样的页面数量大于该索引的叶子节点数量，就直接采用全表扫描来统计索引列的不重复值数量。所以可以在查询结果中看到不同索引对应的 sample_size 列的值可能不同。
  :::

### 定期更新统计数据

随着不断对表进行增删改操作，表中的数据一直在变化，`innodb_table_stats` 和 `innodb_index_stats` 表里的统计数据也应该跟着变化。如果不变，`MySQL` 查询优化器计算的成本会相差很远。设计者提供了两种更新统计数据的方式：

- 开启 `innodb_stats_auto_recalc`

  系统变量 `innodb_stats_auto_recalc` 决定服务器是否自动重新计算统计数据，默认值是 `ON`，该功能默认开启。每个表都维护了一个变量，记录对该表进行增删改的记录条数。如果发生变动的记录数量超过了表大小的 `10%`，并且自动重新计算统计数据的功能打开，服务器会重新进行一次统计数据的计算，并更新 `innodb_table_stats` 和 `innodb_index_stats` 表。不过**自动重新计算统计数据的过程是异步发生的**，即使表中变动的记录数超过了 `10%`，自动重新计算统计数据也不会立即发生，可能延迟几秒。

  再次强调，`InnoDB` 默认是**以表为单位来收集和存储统计数据的**，也可以单独为某个表设置是否自动重新计算统计数据的属性，设置方式是在创建或修改表时指定 `STATS_AUTO_RECALC` 属性：

```sql
CREATE TABLE 表名 (...) Engine=InnoDB, STATS_AUTO_RECALC = (1|0);

ALTER TABLE 表名 Engine=InnoDB, STATS_AUTO_RECALC = (1|0);
```

  当 `STATS_AUTO_RECALC=1` 时，表明想让该表自动重新计算统计数据；当 `STATS_AUTO_RECALC=0` 时，表明不想让该表自动重新计算统计数据。如果创建表时未指定 `STATS_AUTO_RECALC` 属性，默认采用系统变量 `innodb_stats_auto_recalc` 的值作为该属性的值。

- 手动调用 `ANALYZE TABLE` 语句更新统计信息

  如果 `innodb_stats_auto_recalc` 系统变量的值为 `OFF`，也可以手动调用 `ANALYZE TABLE` 语句重新计算统计数据。例如更新关于 `single_table` 表的统计数据：

```text
mysql> ANALYZE TABLE single_table;
+------------------------+---------+----------+----------+
| Table                  | Op      | Msg_type | Msg_text |
+------------------------+---------+----------+----------+
| xiaohaizi.single_table | analyze | status   | OK       |
+------------------------+---------+----------+----------+
1 row in set (0.08 sec)
```

  需要注意：**ANALYZE TABLE 语句会立即重新计算统计数据，这个过程是同步的**。在表中索引多或采样页面特别多时，这个过程可能特别慢，请不要频繁运行 `ANALYZE TABLE` 语句，最好在业务不是很繁忙时再运行。

### 手动更新innodb_table_stats和innodb_index_stats表

`innodb_table_stats` 和 `innodb_index_stats` 表相当于普通表一样，可以对它们做增删改查操作，这也意味着可以**手动更新某个表或索引的统计数据**。例如想把 `single_table` 表关于行数的统计数据更改一下：

- 步骤一：更新 `innodb_table_stats` 表

```sql
UPDATE innodb_table_stats
    SET n_rows = 1
    WHERE table_name = 'single_table';
```

- 步骤二：让 `MySQL` 查询优化器重新加载更改过的数据

  更新完 `innodb_table_stats` 只是单纯修改了一个表的数据，需要让 `MySQL` 查询优化器重新加载更改过的数据，运行下面的命令：

```sql
FLUSH TABLE single_table;
```

之后使用 `SHOW TABLE STATUS` 语句查看表的统计数据，就会看到 `Rows` 行变为 `1`。

## 基于内存的非永久性统计数据

当把系统变量 `innodb_stats_persistent` 的值设置为 `OFF` 时，之后创建的表的统计数据默认都是非永久性的；或者直接在创建表或修改表时设置 `STATS_PERSISTENT` 属性的值为 `0`，那么该表的统计数据就是非永久性的。

与永久性统计数据不同，非永久性统计数据采样的页面数量由 `innodb_stats_transient_sample_pages` 控制，这个系统变量的默认值是 `8`。

另外，由于非永久性统计数据经常更新，所以 `MySQL` 查询优化器计算查询成本时依赖经常变化的统计数据，也就会**生成经常变化的执行计划**。最近的 `MySQL` 版本都不太使用这种基于内存的非永久性统计数据了，这里不再深入介绍。

## innodb_stats_method的使用

`索引列不重复的值的数量` 这个统计数据对 `MySQL` 查询优化器十分重要，因为通过它可以计算出索引列中平均一个值重复多少行。它的应用场景主要有两个：

- 单表查询中单点区间太多，例如：

```sql
SELECT * FROM tbl_name WHERE key IN ('xx1', 'xx2', ..., 'xxn');
```

  当 `IN` 里的参数数量过多时，用 `index dive` 的方式直接访问 `B+` 树索引统计每个单点区间对应的记录数量太耗费性能，所以直接依赖统计数据中的平均一个值重复多少行来计算单点区间对应的记录数量。

- 连接查询时，如果有涉及两个表的等值匹配连接条件，该连接条件对应的被驱动表中的列又拥有索引，则可以使用 `ref` 访问方法对被驱动表查询，例如：

```sql
SELECT * FROM t1 JOIN t2 ON t1.column = t2.key WHERE ...;
```

  在真正执行对 `t2` 表的查询前，`t1.column` 的值是不确定的，所以不能通过 `index dive` 的方式直接访问 `B+` 树索引统计每个单点区间对应的记录数量，也只能依赖统计数据中的平均一个值重复多少行来计算单点区间对应的记录数量。

在统计索引列不重复的值的数量时，有一个问题：索引列中出现 `NULL` 值怎么办？例如某个索引列的内容是这样：

```text
+------+
| col  |
+------+
|    1 |
|    2 |
| NULL |
| NULL |
+------+
```

此时计算这个 `col` 列中不重复的值的数量有几种分歧：

- 有的人认为 `NULL` 值代表一个未确定的值，所以设计者才认为任何和 `NULL` 值做比较的表达式的值都为 `NULL`：

```text
mysql> SELECT 1 = NULL;
+----------+
| 1 = NULL |
+----------+
|     NULL |
+----------+
1 row in set (0.00 sec)

mysql> SELECT 1 != NULL;
+-----------+
| 1 != NULL |
+-----------+
|      NULL |
+-----------+
1 row in set (0.00 sec)

mysql> SELECT NULL = NULL;
+-------------+
| NULL = NULL |
+-------------+
|        NULL |
+-------------+
1 row in set (0.00 sec)

mysql> SELECT NULL != NULL;
+--------------+
| NULL != NULL |
+--------------+
|         NULL |
+--------------+
1 row in set (0.00 sec)
```

  所以每一个 `NULL` 值都是独一无二的，统计索引列不重复的值的数量时应该把 `NULL` 值当作独立的值，`col` 列不重复的值的数量就是 `4`（分别是 1、2、NULL、NULL 这四个值）。

- 有的人认为 `NULL` 值在业务上就是代表没有，所有 `NULL` 值代表的意义一样，所以 `col` 列不重复的值的数量是 `3`（分别是 1、2、NULL 这三个值）。

- 有的人认为 `NULL` 完全没有意义，统计索引列不重复的值的数量时不能把它们算进来，所以 `col` 列不重复的值的数量是 `2`（分别是 1、2 这两个值）。

设计者提供了一个名为 `innodb_stats_method` 的系统变量，把"计算某个索引列不重复值的数量时如何对待 `NULL` 值"这个选择交给用户。这个系统变量有三个候选值：

- `nulls_equal`：认为所有 `NULL` 值都是相等的，这也是 `innodb_stats_method` 的默认值。如果某个索引列中 `NULL` 值特别多，这种统计方式会让优化器认为某列中平均一个值重复次数特别多，所以倾向于不使用索引访问。
- `nulls_unequal`：认为所有 `NULL` 值都是不相等的。如果某个索引列中 `NULL` 值特别多，这种统计方式会让优化器认为某列中平均一个值重复次数特别少，所以倾向于使用索引访问。
- `nulls_ignored`：直接把 `NULL` 值忽略掉。

选定了 `innodb_stats_method` 值之后，即使优化器选择了不是最优的执行计划，也跟设计者没关系了。对使用者来说，**最好不在索引列中存放 NULL 值**才是正解。

## 总结

- `InnoDB` 以表为单位收集统计数据，这些统计数据可以是基于磁盘的永久性统计数据，也可以是基于内存的非永久性统计数据。
- `innodb_stats_persistent` 控制使用永久性统计数据还是非永久性统计数据；`innodb_stats_persistent_sample_pages` 控制永久性统计数据的采样页面数量；`innodb_stats_transient_sample_pages` 控制非永久性统计数据的采样页面数量；`innodb_stats_auto_recalc` 控制是否自动重新计算统计数据。
- 可以针对某个具体的表，在创建和修改表时通过指定 `STATS_PERSISTENT`、`STATS_AUTO_RECALC`、`STATS_SAMPLE_PAGES` 的值来控制相关统计数据属性。
- `innodb_stats_method` 决定在统计某个索引列不重复值的数量时如何对待 `NULL` 值。
