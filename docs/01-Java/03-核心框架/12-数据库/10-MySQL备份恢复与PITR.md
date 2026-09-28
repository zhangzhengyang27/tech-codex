---
title: "MySQL 备份恢复与 PITR 实战"
description: "MySQL 备份恢复实战：逻辑备份 mysqldump 与物理备份 xtrabackup、全量/增量备份策略、binlog 与 PITR 时间点恢复、恢复演练流程与最佳实践"
keywords: [MySQL备份, 恢复, mysqldump, xtrabackup, PITR, binlog]
category: "Java"
tags: [Java, MySQL, 备份, 恢复, PITR]
---

# MySQL 备份恢复与 PITR 实战

备份是数据库运维的最后一道防线。**没有备份的数据库，数据丢失时只能认栽。** 本文系统讲解 MySQL 的备份方案（逻辑备份 vs 物理备份）、备份策略、以及基于 binlog 的 **PITR（时间点恢复）**，并给出完整的恢复演练流程。

## 一、备份的核心概念

### 1.1 备份的目的

- **灾难恢复**：机房故障、磁盘损坏时快速恢复。
- **误操作恢复**：误删数据、误 UPDATE/DROP，可用备份找回。
- **数据迁移**：迁移到新实例、新环境。
- **合规审计**：满足数据保留要求。

### 1.2 备份的分类

| 分类 | 说明 | 工具 |
|------|------|------|
| **逻辑备份** | 导出 SQL/数据文件，跨版本可移植 | `mysqldump` |
| **物理备份** | 直接复制数据文件，恢复快 | `xtrabackup`（Percona） |
| **全量备份** | 备份全部数据 | 两者都支持 |
| **增量备份** | 只备份上次备份以来的变化 | 物理增量 + binlog |
| **在线备份** | 不停服务备份（热备） | xtrabackup |
| **离线备份** | 停服备份（冷备） | 停库复制文件 |

## 二、逻辑备份：mysqldump

### 2.1 全量备份

```bash
# 导出整个数据库（含结构 + 数据）
mysqldump -uroot -p --single-transaction --master-data=2 mydb > mydb.sql

# 导出单表
mysqldump -uroot -p mydb users > users.sql

# 只导出结构（不导出数据）
mysqldump -uroot -p --no-data mydb > mydb_schema.sql
```

**关键参数**：
- `--single-transaction`：在事务内备份，保证一致性快照（InnoDB），避免锁表。**在线备份必备**。
- `--master-data=2`：在备份文件中记录 binlog 位置，**做增量/PITR 必需**。
- `--routines --triggers`：同时导出存储过程、触发器。

### 2.2 恢复

```bash
mysql -uroot -p mydb < mydb.sql
```

**逻辑备份特点**：
- 优点是**跨版本可移植**、可指定表恢复、体积可控（可压缩）。
- 缺点是**大数据量下慢**、恢复慢（逐条执行 SQL）。

## 三、物理备份：xtrabackup

`xtrabackup`（Percona XtraBackup）是**在线物理备份**的主流工具，直接复制数据文件，恢复速度快，适合大数据量。

### 3.1 全量备份

```bash
# 全量备份
xtrabackup --backup --target-dir=/backup/full --host=localhost --user=root --password=xxx

# 应用日志（使备份一致）
xtrabackup --prepare --target-dir=/backup/full
```

### 3.2 增量备份

```bash
# 基于全量做增量1
xtrabackup --backup --target-dir=/backup/inc1 --incremental-basedir=/backup/full

# 基于增量1做增量2
xtrabackup --backup --target-dir=/backup/inc2 --incremental-basedir=/backup/inc1

# 恢复时：先 prepare 全量，再 apply 各增量
xtrabackup --prepare --target-dir=/backup/full --apply-log-only
xtrabackup --prepare --target-dir=/backup/full --incremental-dir=/backup/inc1
xtrabackup --prepare --target-dir=/backup/full --incremental-dir=/backup/inc2
```

### 3.3 恢复（冷恢复）

```bash
# 停止 MySQL
systemctl stop mysql

# 清空数据目录，拷回备份文件
rm -rf /var/lib/mysql/*
cp -r /backup/full/* /var/lib/mysql/
chown -R mysql:mysql /var/lib/mysql

# 启动
systemctl start mysql
```

**物理备份特点**：
- 优点：**备份/恢复快**（文件级复制）、在线热备。
- 缺点：**跨版本/跨平台可移植性差**（依赖数据文件格式）。

## 四、基于 binlog 的 PITR（时间点恢复）

### 4.1 原理

只恢复全量备份，会丢失备份之后的所有变更。**PITR** 通过**全量备份 + binlog** 恢复到**任意时间点**：

```text
时间线：
  A(全量备份点) ----binlog----> B(误删时刻) ---- 恢复到B之前
```

思路：
1. 恢复最近一次全量备份。
2. 用备份的 `--master-data=2` 记录的 binlog 位置，回放该位置之后、误删时刻之前的 binlog。

### 4.2 前提

- 必须开启 binlog：`log_bin=ON`。
- 全量备份时用 `--master-data=2` 记录 binlog 坐标。
- **binlog 文件要保留足够时长**（可做 binlog 备份/归档）。

### 4.3 恢复步骤

```bash
# 1. 恢复全量备份
mysql -uroot -p mydb < mydb.sql

# 2. 确认全量备份的 binlog 位置（mydb.sql 头部的 CHANGE MASTER 语句）
#    例: MASTER_LOG_POS=100, MASTER_LOG_FILE='mysql-bin.000003'

# 3. 将 binlog 转为 SQL
mysqlbinlog --start-position=100 --stop-datetime='2026-08-07 10:00:00' \
    mysql-bin.000003 > pitr.sql

# 4. 应用增量 SQL
mysql -uroot -p < pitr.sql
```

**`mysqlbinlog` 关键参数**：
- `--start-position` / `--stop-position`：按位置截取。
- `--start-datetime` / `--stop-datetime`：按时间截取（恢复"误删前一刻"）。
- `--database=mydb`：只恢复指定库。

>  **恢复误删建议**：先恢复到误删**之前**的时间点，且建议在**临时实例**上演练，确认无误再切换。

## 五、备份策略与最佳实践

### 5.1 备份策略

```text
推荐组合策略：
- 每日全量备份（物理 xtrabackup，凌晨低峰）
- 每小时/每 N 分钟备份 binlog（或开启 binlog 归档）
- 全量备份保留 N 天，binlog 保留足够时长
```

### 5.2 最佳实践

1. **3-2-1 原则**：3 份数据、2 种介质、1 份异地（异地容灾）。
2. **定期恢复演练**：**备份能恢复才是有效备份**。定期在测试环境演练恢复流程。
3. **监控备份状态**：备份任务要有监控、告警，备份失败要能及时发现。
4. **加密与访问控制**：备份文件包含敏感数据，要加密存储、控制访问。
5. **主从库配合**：可在**从库**上做备份（xtrabackup 支持 `--slave-info`），减少对主库压力。
6. **记录 binlog 位置**：全量备份必须记录 binlog 坐标，否则无法做 PITR。

## 小结

- **逻辑备份（mysqldump）**：跨版本、可指定表，适合中小库；**物理备份（xtrabackup）**：快，适合大数据量。
- **PITR** = 全量备份 + binlog 回放，可恢复到任意时间点，是误删/故障恢复的关键。
- 核心原则：**备份必须验证可恢复**（定期演练），遵循 **3-2-1 备份原则**，binlog 与全量备份都要保留足够时长。

## 版本差异(MySQL 5.7 → 8.0/8.4)

| 特性 | 旧版（本文编写时，MySQL 5.7） | 当前（MySQL 8.0/8.4 LTS） |
|------|-----------------------------|--------------------------|
| 默认字符集 | utf8（需显式配置 utf8mb4） | utf8mb4（MySQL 8.0 起默认） |
| 索引 | 普通 B+Tree | 降序索引、隐藏索引、函数索引（8.0+） |
| SQL 能力 | 常规查询 | 递归 CTE、窗口函数（8.0+） |
| 版本策略 | 5.7 | 8.0（主流）/ 8.4 LTS / 9.x（创新版） |
| Java 驱动 | mysql-connector-java 5.x/8.0 | mysql-connector-j 8.x/9.x |

> 本文基于 MySQL 5.7 编写，核心概念（索引、事务、锁、MVCC、InnoDB）在 8.0/8.4 中依然适用；8.0 的默认字符集、隐藏索引与 SQL 增强（CTE/窗口函数）是升级后的主要差异。
