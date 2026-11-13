---
title: "MySQL约束与事务"
description: "约束(Constraint)是对表中数据进行进一步限制的规则,从而保证数据的正确性、有效性和完整性。违反约束的不正确数据,将无法插入到表中。"
keywords: [MySQL约束与事务]
category: "Java"
tags: [Java, 数据库]
---


# MySQL 约束与事务

约束(Constraint)是关系型数据库保证数据完整性和一致性的核心机制之一,它保证数据的合法性。本篇聚焦约束体系:主键、非空、唯一、默认值、外键与检查约束。事务相关内容(操作语法、ACID、隔离级别)已移至 [05-后端/数据库基础/事务](/docs/sql/19-事务),其原理剖析见本目录的索引、锁与 MVCC 各篇。

## 约束概述

### 什么是约束

约束(Constraint)是对表中数据进行进一步限制的规则,从而保证数据的正确性、有效性和完整性。违反约束的不正确数据,将无法插入到表中。

**约束的作用**:
- 保证数据完整性:确保数据符合业务规则
- 保证数据一致性:避免脏数据和逻辑错误
- 减少应用层校验:数据库层面保证数据质量

### 常见的约束类型

| 约束名 | 关键字 | 作用 |
|--------|--------|------|
| **主键约束** | PRIMARY KEY | 唯一标识一行,不可重复、非空 |
| **唯一约束** | UNIQUE | 列值唯一,可以为 NULL |
| **非空约束** | NOT NULL | 列值不能为 NULL |
| **外键约束** | FOREIGN KEY | 保证引用完整性 |
| **检查约束** | CHECK | 保证列值满足指定条件(MySQL 8.0+) |
| **默认值** | DEFAULT | 列的默认值 |

## 主键约束

### 主键约束的特点

主键约束(Primary Key)是最重要的约束,具有以下特点:
- **唯一性**:主键值不能重复
- **非空性**:主键值不能为 NULL
- **单一性**:一个表只能有一个主键(可以是单列或多列)

### 添加主键约束

#### 方式一:字段级别添加

```sql
-- 创建表时直接在字段后添加主键约束
CREATE TABLE emp (
    eid INT PRIMARY KEY AUTO_INCREMENT COMMENT '员工ID',
    ename VARCHAR(20) COMMENT '员工姓名',
    sex CHAR(1) COMMENT '性别'
) COMMENT='员工表';

-- 查看表结构
DESC emp;
```

**执行结果**:
```
+-------+-------------+------+-----+---------+----------------+
| Field | Type        | Null | Key | Default | Extra          |
+-------+-------------+------+-----+---------+----------------+
| eid   | int         | NO   | PRI | NULL    | auto_increment |
| ename | varchar(20) | YES  |     | NULL    |                |
| sex   | char(1)     | YES  |     | NULL    |                |
+-------+-------------+------+-----+---------+----------------+
```

**说明**:
- Key 列显示 PRI,表示主键
- Extra 列显示 auto_increment,表示自增

#### 方式二:表级别添加

```sql
-- 删除表
DROP TABLE IF EXISTS emp;

-- 创建表时在最后指定主键
CREATE TABLE emp (
    eid INT COMMENT '员工ID',
    ename VARCHAR(20) COMMENT '员工姓名',
    sex CHAR(1) COMMENT '性别',
    PRIMARY KEY(eid)  -- 指定主键
) COMMENT='员工表';
```

#### 方式三:修改表添加主键

```sql
-- 创建表时不指定主键
CREATE TABLE emp (
    eid INT COMMENT '员工ID',
    ename VARCHAR(20) COMMENT '员工姓名',
    sex CHAR(1) COMMENT '性别'
) COMMENT='员工表';

-- 使用 ALTER TABLE 添加主键
ALTER TABLE emp ADD PRIMARY KEY(eid);

-- 查看表结构
DESC emp;
```

### 测试主键的唯一性和非空性

```sql
-- 正常插入数据
INSERT INTO emp (eid, ename, sex) VALUES(1, '张三', '男');

-- 测试非空性:主键为 NULL
INSERT INTO emp (eid, ename, sex) VALUES(NULL, '李四', '男');
-- 错误:Column 'eid' cannot be null

-- 测试唯一性:主键重复
INSERT INTO emp (eid, ename, sex) VALUES(1, '王五', '男');
-- 错误:Duplicate entry '1' for key 'emp.PRIMARY'
```

**错误说明**:
- `Column 'eid' cannot be null`:主键不能为 NULL
- `Duplicate entry '1' for key 'emp.PRIMARY'`:主键值 1 已存在,不能重复

### 主键的选择原则

**哪些字段可以作为主键**:
- **业务主键**:使用业务字段作为主键(如身份证号、员工编号)
- **代理主键**:使用无业务含义的字段作为主键(如自增 ID、UUID)

**推荐做法**:
- 通常使用代理主键(自增 ID 或雪花算法生成的 ID)
- 主键是给数据库和程序使用的,与最终客户无关
- 主键应保证不重复,最好单调递增(有利于索引性能)

```sql
-- 推荐:使用自增主键
CREATE TABLE user_account (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    username VARCHAR(64) NOT NULL COMMENT '用户名'
) COMMENT='用户账户表';

-- 或使用业务主键
CREATE TABLE id_card (
    id_card_number VARCHAR(18) PRIMARY KEY COMMENT '身份证号',
    name VARCHAR(20) COMMENT '姓名'
) COMMENT='身份证表';
```

### 删除主键约束

```sql
-- 删除主键约束
ALTER TABLE emp DROP PRIMARY KEY;

-- 查看表结构
DESC emp;
```

**说明**:删除主键后,Key 列不再显示 PRI。

### 主键的自增

#### AUTO_INCREMENT 关键字

主键如果让我们自己添加很有可能重复,我们通常希望在每次插入新记录时,数据库自动生成主键字段的值。

**语法**:
```sql
字段名 字段类型 PRIMARY KEY AUTO_INCREMENT
```

**注意事项**:
- AUTO_INCREMENT 只能用于整数类型字段
- 一个表只能有一个 AUTO_INCREMENT 字段
- 该字段必须建立索引(通常是主键)

```sql
-- 创建主键自增的表
CREATE TABLE emp (
    eid INT PRIMARY KEY AUTO_INCREMENT COMMENT '员工ID',
    ename VARCHAR(20) COMMENT '员工姓名',
    sex CHAR(1) COMMENT '性别'
) COMMENT='员工表';

-- 插入数据,不指定主键
INSERT INTO emp (ename, sex) VALUES('张三', '男');
INSERT INTO emp (ename, sex) VALUES('李四', '男');

-- 插入数据,指定主键为 NULL(自动生成)
INSERT INTO emp (eid, ename, sex) VALUES(NULL, '王五', '男');

-- 查询数据
SELECT * FROM emp;
```

**查询结果**:
```
+-----+-------+------+
| eid | ename | sex  |
+-----+-------+------+
|   1 | 张三  | 男   |
|   2 | 李四  | 男   |
|   3 | 王五  | 男   |
+-----+-------+------+
```

#### 修改自增起始值

默认 AUTO_INCREMENT 的起始值是 1,可以通过以下方式修改:

```sql
-- 方式一:创建表时指定起始值
CREATE TABLE emp (
    eid INT PRIMARY KEY AUTO_INCREMENT,
    ename VARCHAR(20),
    sex CHAR(1)
) AUTO_INCREMENT=100;  -- 起始值为 100

-- 方式二:修改表的自增起始值
ALTER TABLE emp AUTO_INCREMENT=1000;
```

**示例**:
```sql
-- 创建表,自增起始值为 100
CREATE TABLE emp (
    eid INT PRIMARY KEY AUTO_INCREMENT,
    ename VARCHAR(20),
    sex CHAR(1)
) AUTO_INCREMENT=100;

-- 插入数据,观察主键值
INSERT INTO emp (ename, sex) VALUES('张百万', '男');
INSERT INTO emp (ename, sex) VALUES('艳秋', '女');

SELECT * FROM emp;
```

**查询结果**:
```
+-----+-----------+------+
| eid | ename     | sex  |
+-----+-----------+------+
| 100 | 张百万    | 男   |
| 101 | 艳秋      | 女   |
+-----+-----------+------+
```

#### DELETE 与 TRUNCATE 对自增的影响

删除表中所有数据有两种方式,对自增的影响不同:

| 操作 | 说明 | 对自增的影响 |
|------|------|--------------|
| **DELETE** | 逐行删除数据 | 自增值继续递增,不会重置 |
| **TRUNCATE** | 删除表并重新创建 | 自增值重置为初始值 |

```sql
-- 创建测试表
CREATE TABLE test_auto_inc (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(20)
);

-- 插入数据
INSERT INTO test_auto_inc (name) VALUES('A'), ('B'), ('C');

SELECT * FROM test_auto_inc;
-- id: 1, 2, 3

-- 使用 DELETE 删除所有数据
DELETE FROM test_auto_inc;

-- 插入新数据
INSERT INTO test_auto_inc (name) VALUES('D');
SELECT * FROM test_auto_inc;
-- id: 4 (自增未重置)

-- 使用 TRUNCATE 清空表
TRUNCATE TABLE test_auto_inc;

-- 插入新数据
INSERT INTO test_auto_inc (name) VALUES('E');
SELECT * FROM test_auto_inc;
-- id: 1 (自增已重置)
```

## 非空约束

### 非空约束的特点

非空约束(NOT NULL)要求列值不能为 NULL,必须提供具体值。

**语法**:
```sql
字段名 字段类型 NOT NULL
```

### 添加非空约束

```sql
-- 创建表时添加非空约束
CREATE TABLE emp (
    eid INT PRIMARY KEY AUTO_INCREMENT COMMENT '员工ID',
    ename VARCHAR(20) NOT NULL COMMENT '员工姓名(不能为空)',
    sex CHAR(1) COMMENT '性别'
) COMMENT='员工表';

-- 查看表结构
DESC emp;
```

**执行结果**:
```
+-------+-------------+------+-----+---------+----------------+
| Field | Type        | Null | Key | Default | Extra          |
+-------+-------------+------+-----+---------+----------------+
| eid   | int         | NO   | PRI | NULL    | auto_increment |
| ename | varchar(20) | NO   |     | NULL    |                |
| sex   | char(1)     | YES  |     | NULL    |                |
+-------+-------------+------+-----+---------+----------------+
```

**说明**:ename 字段的 Null 列显示 NO,表示不能为 NULL。

### 测试非空约束

```sql
-- 正常插入数据
INSERT INTO emp (ename, sex) VALUES('张三', '男');

-- 插入 NULL 值
INSERT INTO emp (ename, sex) VALUES(NULL, '女');
-- 错误:Column 'ename' cannot be null

-- 不指定 ename 字段(相当于 NULL)
INSERT INTO emp (sex) VALUES('女');
-- 错误:Column 'ename' cannot be null
```

### 修改表添加/删除非空约束

```sql
-- 添加非空约束
ALTER TABLE emp MODIFY ename VARCHAR(20) NOT NULL;

-- 删除非空约束
ALTER TABLE emp MODIFY ename VARCHAR(20) NULL;
```

## 唯一约束

### 唯一约束的特点

唯一约束(UNIQUE)要求列值唯一,不能重复,但可以为 NULL。

**主键约束 vs 唯一约束**:

| 特性 | 主键约束 | 唯一约束 |
|------|----------|----------|
| **唯一性** | √ 唯一 | √ 唯一 |
| **非空性** | √ 不能为 NULL | × 可以为 NULL |
| **数量限制** | 一个表只能有一个主键 | 一个表可以有多个唯一约束 |
| **用途** | 标识一行 | 保证字段值唯一 |

### 添加唯一约束

```sql
-- 创建表时添加唯一约束
CREATE TABLE emp (
    eid INT PRIMARY KEY AUTO_INCREMENT COMMENT '员工ID',
    ename VARCHAR(20) UNIQUE COMMENT '员工姓名(唯一)',
    phone VARCHAR(20) UNIQUE COMMENT '手机号(唯一)',
    sex CHAR(1) COMMENT '性别'
) COMMENT='员工表';

-- 查看表结构
DESC emp;
```

**执行结果**:
```
+-------+-------------+------+-----+---------+----------------+
| Field | Type        | Null | Key | Default | Extra          |
+-------+-------------+------+-----+---------+----------------+
| eid   | int         | NO   | PRI | NULL    | auto_increment |
| ename | varchar(20) | YES  | UNI | NULL    |                |
| phone | varchar(20) | YES  | UNI | NULL    |                |
| sex   | char(1)     | YES  |     | NULL    |                |
+-------+-------------+------+-----+---------+----------------+
```

**说明**:Key 列显示 UNI,表示唯一约束。

### 测试唯一约束

```sql
-- 插入数据
INSERT INTO emp (ename, phone, sex) VALUES('张三', '13800138000', '男');

-- 测试唯一性:ename 重复
INSERT INTO emp (ename, phone, sex) VALUES('张三', '13900139000', '女');
-- 错误:Duplicate entry '张三' for key 'emp.ename'

-- 测试唯一性:phone 重复
INSERT INTO emp (ename, phone, sex) VALUES('李四', '13800138000', '女');
-- 错误:Duplicate entry '13800138000' for key 'emp.phone'

-- 测试 NULL 值:唯一约束允许 NULL
INSERT INTO emp (ename, phone, sex) VALUES('王五', NULL, '男');
INSERT INTO emp (ename, phone, sex) VALUES('赵六', NULL, '女');
-- 成功:唯一约束允许多个 NULL 值
```

**重要提示**:
- 唯一约束允许 NULL 值
- MySQL 中唯一约束允许多个 NULL 值(NULL 不等于 NULL)

### 修改表添加/删除唯一约束

```sql
-- 添加唯一约束
ALTER TABLE emp ADD UNIQUE(ename);

-- 或指定约束名
ALTER TABLE emp ADD CONSTRAINT uk_ename UNIQUE(ename);

-- 删除唯一约束
ALTER TABLE emp DROP INDEX ename;

-- 或使用约束名
ALTER TABLE emp DROP INDEX uk_ename;
```

## 默认值约束

### 默认值约束的特点

默认值(DEFAULT)用于指定列的默认值,当插入数据时不指定该字段,则使用默认值。

**语法**:
```sql
字段名 字段类型 DEFAULT 默认值
```

### 添加默认值约束

```sql
-- 创建表时添加默认值
CREATE TABLE emp (
    eid INT PRIMARY KEY AUTO_INCREMENT COMMENT '员工ID',
    ename VARCHAR(20) COMMENT '员工姓名',
    sex CHAR(1) DEFAULT '男' COMMENT '性别(默认男)'
) COMMENT='员工表';

-- 查看表结构
DESC emp;
```

**执行结果**:
```
+-------+-------------+------+-----+---------+----------------+
| Field | Type        | Null | Key | Default | Extra          |
+-------+-------------+------+-----+---------+----------------+
| eid   | int         | NO   | PRI | NULL    | auto_increment |
| ename | varchar(20) | YES  |     | NULL    |                |
| sex   | char(1)     | YES  |     | 男      |                |
+-------+-------------+------+-----+---------+----------------+
```

**说明**:Default 列显示"男",表示默认值。

### 测试默认值

```sql
-- 不指定 sex 字段,使用默认值
INSERT INTO emp (ename) VALUES('张三');
SELECT * FROM emp;
-- sex 为 '男'(默认值)

-- 使用 DEFAULT 关键字
INSERT INTO emp (ename, sex) VALUES('李四', DEFAULT);
SELECT * FROM emp;
-- sex 为 '男'(默认值)

-- 指定具体值,覆盖默认值
INSERT INTO emp (ename, sex) VALUES('王五', '女');
SELECT * FROM emp;
-- sex 为 '女'(覆盖默认值)
```

### 修改表添加/删除默认值

```sql
-- 添加默认值
ALTER TABLE emp MODIFY sex CHAR(1) DEFAULT '女';

-- 删除默认值
ALTER TABLE emp MODIFY sex CHAR(1);
```

## 外键约束

### 外键约束的特点

外键约束(FOREIGN KEY)用于保证表与表之间的引用完整性,确保从表的外键值在主表中存在。

**相关概念**:
- **主表**:被引用的表,通常是"一对多"关系中的"一"方
- **从表**:引用其他表的表,通常是"一对多"关系中的"多"方
- **外键**:从表中引用主表主键的字段

**语法**:
```sql
[CONSTRAINT 外键约束名] FOREIGN KEY(外键字段) REFERENCES 主表(主键字段)
```

### 添加外键约束

```sql
-- 创建部门表(主表)
CREATE TABLE department (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT '部门ID',
    dep_name VARCHAR(30) COMMENT '部门名称',
    dep_location VARCHAR(30) COMMENT '部门地点'
) COMMENT='部门表';

-- 创建员工表(从表),添加外键约束
CREATE TABLE employee (
    eid INT PRIMARY KEY AUTO_INCREMENT COMMENT '员工ID',
    ename VARCHAR(20) COMMENT '员工姓名',
    age INT COMMENT '年龄',
    dept_id INT COMMENT '部门ID',
    -- 添加外键约束
    CONSTRAINT fk_emp_dept FOREIGN KEY(dept_id) REFERENCES department(id)
) COMMENT='员工表';

-- 插入部门数据
INSERT INTO department (dep_name, dep_location) VALUES
('研发部', '广州'),
('销售部', '深圳');

-- 插入员工数据(正常)
INSERT INTO employee (ename, age, dept_id) VALUES
('张三', 20, 1),
('李四', 21, 1),
('王五', 20, 2);

-- 测试外键约束:插入不存在的部门ID
INSERT INTO employee (ename, age, dept_id) VALUES('赵六', 22, 3);
-- 错误:Cannot add or update a child row: a foreign key constraint fails
-- 原因:部门ID为3的记录在department表中不存在
```

### 外键约束的操作

#### 添加外键约束

```sql
-- 创建表时添加外键约束
CREATE TABLE employee (
    eid INT PRIMARY KEY AUTO_INCREMENT,
    ename VARCHAR(20),
    dept_id INT,
    CONSTRAINT fk_emp_dept FOREIGN KEY(dept_id) REFERENCES department(id)
);

-- 修改表添加外键约束
ALTER TABLE employee 
ADD CONSTRAINT fk_emp_dept 
FOREIGN KEY(dept_id) REFERENCES department(id);

-- 省略约束名(系统自动生成)
ALTER TABLE employee 
ADD FOREIGN KEY(dept_id) REFERENCES department(id);
```

#### 删除外键约束

```sql
-- 删除外键约束
ALTER TABLE employee DROP FOREIGN KEY fk_emp_dept;

-- 查看外键约束名
SHOW CREATE TABLE employee;
```

### 外键约束的注意事项

#### 1. 数据类型必须一致

从表外键类型必须与主表主键类型一致,否则创建失败。

```sql
-- × 错误示例:类型不一致
CREATE TABLE department (id INT PRIMARY KEY);
CREATE TABLE employee (dept_id BIGINT, FOREIGN KEY(dept_id) REFERENCES department(id));
-- 错误:数据类型不一致
```

#### 2. 插入数据顺序

添加数据时,应该先添加主表数据,再添加从表数据。

```sql
-- √ 正确顺序
-- 1. 先添加部门
INSERT INTO department (dep_name, dep_location) VALUES('市场部', '北京');

-- 2. 再添加员工
INSERT INTO employee (ename, age, dept_id) VALUES('老胡', 24, 3);
```

#### 3. 删除数据顺序

删除数据时,应该先删除从表数据,再删除主表数据。

```sql
-- × 错误示例:直接删除主表数据
DELETE FROM department WHERE id = 3;
-- 错误:Cannot delete or update a parent row: a foreign key constraint fails
-- 原因:从表employee中有引用该部门的数据

-- √ 正确顺序
-- 1. 先删除从表数据
DELETE FROM employee WHERE dept_id = 3;

-- 2. 再删除主表数据
DELETE FROM department WHERE id = 3;
```

### 级联操作

外键约束支持级联操作,当主表数据被修改或删除时,自动更新或删除从表数据。

#### 级联删除(ON DELETE CASCADE)

```sql
-- 创建表时指定级联删除
CREATE TABLE employee (
    eid INT PRIMARY KEY AUTO_INCREMENT,
    ename VARCHAR(20),
    dept_id INT,
    CONSTRAINT fk_emp_dept FOREIGN KEY(dept_id) REFERENCES department(id)
    ON DELETE CASCADE  -- 级联删除
);

-- 测试级联删除
-- 删除部门时,该部门的所有员工也会被自动删除
DELETE FROM department WHERE id = 2;
-- employee 表中 dept_id=2 的记录也会被删除
```

#### 级联更新(ON UPDATE CASCADE)

```sql
-- 创建表时指定级联更新
CREATE TABLE employee (
    eid INT PRIMARY KEY AUTO_INCREMENT,
    ename VARCHAR(20),
    dept_id INT,
    CONSTRAINT fk_emp_dept FOREIGN KEY(dept_id) REFERENCES department(id)
    ON UPDATE CASCADE  -- 级联更新
);

-- 测试级联更新
-- 更新部门ID时,员工表的dept_id也会自动更新
UPDATE department SET id = 10 WHERE id = 2;
-- employee 表中 dept_id=2 的记录会自动更新为 dept_id=10
```

#### 设置 NULL(ON DELETE SET NULL)

```sql
-- 创建表时指定删除时设置为 NULL
CREATE TABLE employee (
    eid INT PRIMARY KEY AUTO_INCREMENT,
    ename VARCHAR(20),
    dept_id INT,
    CONSTRAINT fk_emp_dept FOREIGN KEY(dept_id) REFERENCES department(id)
    ON DELETE SET NULL  -- 删除时设置为 NULL
);

-- 测试设置 NULL
-- 删除部门时,该部门的员工不会被删除,但dept_id会被设置为NULL
DELETE FROM department WHERE id = 2;
-- employee 表中 dept_id=2 的记录的 dept_id 会被设置为 NULL
```

## 检查约束(MySQL 8.0+)

### 检查约束的特点

检查约束(CHECK)用于限制列中的值范围,保证列值满足指定条件。MySQL 8.0.16+ 版本支持检查约束。

**语法**:
```sql
字段名 字段类型 CHECK(条件)
```

### 添加检查约束

```sql
-- 创建表时添加检查约束
CREATE TABLE product (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL,
    
    -- 检查约束:价格必须大于0
    CHECK (price > 0),
    -- 检查约束:库存不能为负
    CHECK (stock >= 0)
);

-- 测试检查约束
INSERT INTO product (name, price, stock) VALUES('手机', 2999.00, 100);
-- 成功

INSERT INTO product (name, price, stock) VALUES('电脑', -100, 50);
-- 错误:Check constraint 'product_chk_1' is violated.
-- 原因:price 必须大于 0

INSERT INTO product (name, price, stock) VALUES('平板', 1999.00, -10);
-- 错误:Check constraint 'product_chk_2' is violated.
-- 原因:stock 必须 >= 0
```

::: info 事务内容已迁移
本篇原为「约束与事务」两合一。其中事务部分（事务操作、ACID、隔离级别、事务最佳实践）与 [05-后端/数据库基础/事务](/docs/sql/19-事务) 及 [05-后端/MySQL](/docs/mysql/04-事务与高可用/03-锁、MVCC与undo日志) 重复，已整体移出本篇；隔离级别与 MVCC/锁的深入剖析另见本目录 [03-索引与事务排障](03-索引与事务排障.md)、[04-锁冲突与死锁案例](04-锁冲突与死锁案例.md)、[05-MVCC与事务隔离级别](05-MVCC与事务隔离级别.md)。
:::

## 常见误区

### 误区一:约束越多越好

**错误认知**:多加约束可以保证数据质量。

**正确理解**:
- 约束会影响插入和更新性能
- 过多的约束可能导致业务逻辑复杂
- 应根据实际需求合理使用约束

### 误区二:外键约束一定要用

**错误认知**:外键约束可以保证数据完整性,必须使用。

**正确理解**:
- 外键约束影响性能
- 高并发场景通常不使用外键约束
- 通过应用层逻辑保证数据完整性

**建议**:
- 传统企业应用:可以使用外键约束
- 互联网高并发应用:不使用外键约束,通过应用层保证

## 面试要点

### 1. 主键约束和唯一约束的区别?

**回答要点**:
- 主键约束:唯一且不能为 NULL,一个表只能有一个主键
- 唯一约束:唯一但可以为 NULL,一个表可以有多个唯一约束

### 2. 什么时候使用外键约束?

**回答要点**:
- 传统企业应用:数据量小、并发低,可以使用外键约束
- 互联网应用:数据量大、并发高,通常不使用外键约束,通过应用层保证

---

约束是 MySQL 保证数据完整性和一致性的核心机制。理解各约束的适用场景与代价,才能设计出高质量、高性能的数据库表结构。

## 版本差异(MySQL 5.7 → 8.0/8.4)

| 特性 | 旧版（本文编写时，MySQL 5.7） | 当前（MySQL 8.0/8.4 LTS） |
|------|-----------------------------|--------------------------|
| 默认字符集 | utf8（需显式配置 utf8mb4） | utf8mb4（MySQL 8.0 起默认） |
| 索引 | 普通 B+Tree | 降序索引、隐藏索引、函数索引（8.0+） |
| SQL 能力 | 常规查询 | 递归 CTE、窗口函数（8.0+） |
| 版本策略 | 5.7 | 8.0（主流）/ 8.4 LTS / 9.x（创新版） |
| Java 驱动 | mysql-connector-java 5.x/8.0 | mysql-connector-j 8.x/9.x |

> 本文基于 MySQL 5.7 编写，核心概念（索引、事务、锁、MVCC、InnoDB）在 8.0/8.4 中依然适用；8.0 的默认字符集、隐藏索引与 SQL 增强（CTE/窗口函数）是升级后的主要差异。
