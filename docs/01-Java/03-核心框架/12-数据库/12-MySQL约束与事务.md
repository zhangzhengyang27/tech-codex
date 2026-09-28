---
title: "MySQL约束与事务"
description: "约束(Constraint)是对表中数据进行进一步限制的规则,从而保证数据的正确性、有效性和完整性。违反约束的不正确数据,将无法插入到表中。"
keywords: [MySQL约束与事务]
category: "Java"
tags: [Java, 数据库]
---


# MySQL 约束与事务

约束和事务是关系型数据库保证数据完整性和一致性的两大核心机制。约束保证数据的合法性,事务保证操作的原子性和一致性。

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

## 事务概述

### 什么是事务

事务(Transaction)是一个整体,由一条或者多条 SQL 语句组成。这些 SQL 语句要么都执行成功,要么都执行失败。只要有一条 SQL 出现异常,整个操作就会回滚,整个业务执行失败。

**事务的特点**:
- 事务是数据库操作的基本单位
- 事务中的操作要么全部成功,要么全部失败
- 事务保证数据的一致性和完整性

### 事务的应用场景

**场景一:银行转账**

```sql
-- 张三向李四转账 500 元
-- 事务开始
START TRANSACTION;

-- 张三账户扣款 500 元
UPDATE account SET money = money - 500 WHERE name = '张三';

-- 李四账户存款 500 元
UPDATE account SET money = money + 500 WHERE name = '李四';

-- 提交事务
COMMIT;

-- 如果中间出现异常,执行回滚
-- ROLLBACK;
```

**场景二:订单创建**

```java
// Java 代码示例(Spring 事务管理)
@Transactional
public void createOrder(OrderDTO orderDTO) {
    // 1. 创建订单
    orderMapper.insert(order);
    
    // 2. 扣减库存
    productMapper.decreaseStock(orderDTO.getProductId(), orderDTO.getQuantity());
    
    // 3. 扣减用户余额
    accountMapper.decreaseBalance(orderDTO.getUserId(), orderDTO.getAmount());
    
    // 如果任何一步失败,整个事务回滚
}
```

## MySQL 事务操作

### 手动提交事务

#### 事务控制语句

| 语句 | 作用 |
|------|------|
| **START TRANSACTION** 或 **BEGIN** | 开启事务 |
| **COMMIT** | 提交事务 |
| **ROLLBACK** | 回滚事务 |
| **SAVEPOINT** | 设置保存点 |
| **ROLLBACK TO SAVEPOINT** | 回滚到保存点 |

#### 事务操作示例

**示例一:正常提交**

```sql
-- 创建账户表
CREATE TABLE account (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(10),
    money DOUBLE
);

-- 插入测试数据
INSERT INTO account (name, money) VALUES ('张三', 1000), ('李四', 1000);

-- 开启事务
START TRANSACTION;

-- 张三账户扣款 500 元
UPDATE account SET money = money - 500 WHERE name = '张三';

-- 李四账户存款 500 元
UPDATE account SET money = money + 500 WHERE name = '李四';

-- 提交事务
COMMIT;

-- 查询结果
SELECT * FROM account;
-- 张三:500, 李四:1500
```

**示例二:异常回滚**

```sql
-- 开启事务
START TRANSACTION;

-- 插入数据
INSERT INTO account VALUES(NULL, '王五', 3000);
INSERT INTO account VALUES(NULL, '赵六', 3500);

-- 发现错误,执行回滚
ROLLBACK;

-- 查询结果(数据未插入)
SELECT * FROM account;
```

**示例三:保存点**

```sql
-- 开启事务
START TRANSACTION;

-- 插入数据
INSERT INTO account VALUES(NULL, '孙七', 4000);

-- 设置保存点
SAVEPOINT sp1;

-- 插入更多数据
INSERT INTO account VALUES(NULL, '周八', 4500);

-- 回滚到保存点
ROLLBACK TO SAVEPOINT sp1;

-- 提交事务
COMMIT;

-- 查询结果
SELECT * FROM account;
-- 只有孙七的数据,周八的数据已回滚
```

### 自动提交事务

#### MySQL 默认行为

MySQL 默认每一条 DML(增删改)语句都是一个单独的事务,每条语句都会自动开启一个事务,语句执行完毕自动提交事务。

#### 查看自动提交状态

```sql
-- 查看自动提交状态
SHOW VARIABLES LIKE 'autocommit';
-- 结果:ON 表示自动提交,OFF 表示手动提交
```

#### 设置自动提交

```sql
-- 关闭自动提交(改为手动提交)
SET @@autocommit = OFF;

-- 开启自动提交
SET @@autocommit = ON;
```

**示例**:

```sql
-- 关闭自动提交
SET @@autocommit = OFF;

-- 更新数据
UPDATE account SET money = money - 500 WHERE name = '李四';

-- 此时数据未提交,其他会话查询不到最新数据

-- 手动提交
COMMIT;

-- 现在数据已提交,其他会话可以查询到最新数据
```

## 事务的四大特性(ACID)

### 原子性(Atomicity)

**定义**:事务是不可分割的工作单位,事务中的操作要么都做,要么都不做。

**实现机制**:
- undo log(回滚日志):记录事务的反向操作,用于回滚
- 如果事务执行失败,使用 undo log 回滚到事务开始前的状态

**示例**:
```sql
-- 转账事务
START TRANSACTION;
UPDATE account SET money = money - 500 WHERE name = '张三';  -- 操作1
UPDATE account SET money = money + 500 WHERE name = '李四';  -- 操作2
COMMIT;

-- 如果操作1成功、操作2失败,整个事务回滚,操作1也会撤销
```

### 一致性(Consistency)

**定义**:事务执行前后数据库状态一致,从一个一致性状态转换到另一个一致性状态。

**实现机制**:
- 数据库约束(主键、外键、唯一约束等)
- 业务逻辑保证

**示例**:
```sql
-- 转账前后,总金额不变
-- 转账前:张三 1000 + 李四 1000 = 2000
-- 转账后:张三 500 + 李四 1500 = 2000
-- 总金额保持一致
```

### 隔离性(Isolation)

**定义**:多个事务并发执行时互不干扰,一个事务的执行不应影响其他事务的执行。

**实现机制**:
- 锁机制:共享锁、排他锁、行锁、表锁
- MVCC(多版本并发控制)

**隔离级别**:
- READ UNCOMMITTED:读未提交
- READ COMMITTED:读已提交
- REPEATABLE READ:可重复读(MySQL 默认)
- SERIALIZABLE:串行化

### 持久性(Durability)

**定义**:事务提交后,对数据库的修改是永久的,即使数据库崩溃也不会丢失。

**实现机制**:
- redo log(重做日志):记录事务的修改操作,用于崩溃恢复
- 数据库崩溃后,使用 redo log 恢复已提交的事务

**示例**:
```sql
-- 事务提交后,即使数据库崩溃,数据也不会丢失
START TRANSACTION;
UPDATE account SET money = 500 WHERE name = '张三';
COMMIT;

-- 即使此时数据库崩溃,重启后张三的账户余额仍然是 500
```

## MySQL 事务隔离级别

### 数据并发访问问题

一个数据库可能拥有多个访问客户端,这些客户端都可以并发方式访问数据库。数据库的相同数据可能被多个事务同时访问,如果不采取隔离措施,就会导致各种问题。

#### 脏读(Dirty Read)

**定义**:一个事务读取到了另一个事务中尚未提交的数据。

**示例**:
```
时间  | 事务A                          | 事务B
-----|--------------------------------|------------------------
1    | START TRANSACTION;             |
2    |                                | START TRANSACTION;
3    | UPDATE account SET money=500   |
     |   WHERE name='张三';           |
4    |                                | SELECT money FROM account
     |                                |   WHERE name='张三';  -- 读到500
5    | ROLLBACK;  -- 回滚              |
6    |                                | -- 事务B读到的500是脏数据
```

**后果**:事务B读到的数据是不存在的,可能导致业务逻辑错误。

#### 不可重复读(Unrepeatable Read)

**定义**:同一个事务中,进行查询操作,但是每次读取的数据内容是不一样的。

**示例**:
```
时间  | 事务A                          | 事务B
-----|--------------------------------|------------------------
1    | START TRANSACTION;             |
2    | SELECT money FROM account      |
     |   WHERE name='张三'; -- 1000   |
3    |                                | UPDATE account SET money=500
4    |                                |   WHERE name='张三';
5    |                                | COMMIT;
6    | SELECT money FROM account      |
     |   WHERE name='张三'; -- 500    |
7    | -- 两次查询结果不一致           |
```

**后果**:同一个事务中,两次查询结果不一致,可能导致业务逻辑混乱。

#### 幻读(Phantom Read)

**定义**:一个事务读取到了另一个事务已提交的新增数据,导致两次查询结果行数不同。

**示例**:
```
时间  | 事务A                          | 事务B
-----|--------------------------------|------------------------
1    | START TRANSACTION;             |
2    | SELECT * FROM account          |
     |   WHERE money>800; -- 2行      |
3    |                                | INSERT INTO account VALUES
     |                                |   (NULL, '王五', 2000);
4    |                                | COMMIT;
5    | SELECT * FROM account          |
     |   WHERE money>800; -- 3行      |
6    | -- 两次查询结果行数不一致       |
```

**后果**:同一个事务中,两次查询结果行数不一致,就像出现幻觉一样。

**不可重复读 vs 幻读**:
- 不可重复读:针对数据修改,两次读取数据内容不同
- 幻读:针对数据新增/删除,两次读取结果行数不同

### 四种隔离级别

MySQL 数据库有四种隔离级别,从低到高:

| 隔离级别 | 英文 | 脏读 | 不可重复读 | 幻读 | 性能 |
|----------|------|------|-----------|------|------|
| 读未提交 | READ UNCOMMITTED | √ 可能 | √ 可能 | √ 可能 | 最高 |
| 读已提交 | READ COMMITTED | × 不可能 | √ 可能 | √ 可能 | 较高 |
| 可重复读 | REPEATABLE READ | × 不可能 | × 不可能 | √ 可能 | 中等 |
| 串行化 | SERIALIZABLE | × 不可能 | × 不可能 | × 不可能 | 最低 |

**MySQL 默认隔离级别**:REPEATABLE READ(可重复读)

**说明**:
- √ 表示可能出现该问题
- × 表示不可能出现该问题
- MySQL 的 REPEATABLE READ 通过 MVCC 和 Next-Key Lock 在很大程度上避免了幻读

### 查看和设置隔离级别

#### 查看隔离级别

```sql
-- MySQL 5.7
SELECT @@tx_isolation;

-- MySQL 8.0+
SELECT @@transaction_isolation;

-- 查看全局隔离级别
SELECT @@global.transaction_isolation;

-- 查看会话隔离级别
SELECT @@session.transaction_isolation;
```

#### 设置隔离级别

```sql
-- 设置全局隔离级别(影响所有新会话)
SET GLOBAL TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 设置会话隔离级别(仅影响当前会话)
SET SESSION TRANSACTION ISOLATION LEVEL READ COMMITTED;

-- 设置下一个事务的隔离级别
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

**注意**:修改全局隔离级别后,需要退出 MySQL 再重新登录才能看到变化。

### 隔离级别详解

#### READ UNCOMMITTED(读未提交)

**特点**:
- 最低的隔离级别
- 允许读取未提交的数据
- 可能出现脏读、不可重复读、幻读

**适用场景**:
- 对数据一致性要求不高的场景
- 统计分析类应用

#### READ COMMITTED(读已提交)

**特点**:
- 只能读取已提交的数据
- 避免脏读
- 可能出现不可重复读、幻读

**适用场景**:
- Oracle 默认隔离级别
- 对并发性能要求高的场景

#### REPEATABLE READ(可重复读)

**特点**:
- 保证同一事务中多次读取数据一致
- 避免脏读、不可重复读
- MySQL 通过 MVCC 和 Next-Key Lock 在很大程度上避免幻读

**适用场景**:
- MySQL 默认隔离级别
- 大多数业务场景

#### SERIALIZABLE(串行化)

**特点**:
- 最高的隔离级别
- 强制事务串行执行
- 避免脏读、不可重复读、幻读
- 性能最差

**适用场景**:
- 对数据一致性要求极高的场景
- 金融交易系统

### 隔离问题演示

#### 脏读演示

**步骤一**:设置隔离级别为 READ UNCOMMITTED

```sql
-- 窗口A和窗口B都执行
SET GLOBAL TRANSACTION ISOLATION LEVEL READ UNCOMMITTED;
```

**步骤二**:关闭窗口,重新登录 MySQL

**步骤三**:窗口A开启事务并修改数据

```sql
-- 窗口A
START TRANSACTION;
UPDATE account SET money = money - 500 WHERE name = '张三';
-- 不提交
```

**步骤四**:窗口B查询数据

```sql
-- 窗口B
START TRANSACTION;
SELECT * FROM account;
-- 读到张三的 money 已经减少 500(脏读)
```

**步骤五**:窗口A回滚

```sql
-- 窗口A
ROLLBACK;
```

**步骤六**:窗口B再次查询

```sql
-- 窗口B
SELECT * FROM account;
-- 张三的 money 恢复原值,之前的读取是脏读
```

**解决方案**:将隔离级别提升为 READ COMMITTED。

#### 不可重复读演示

**步骤一**:设置隔离级别为 READ COMMITTED

```sql
SET GLOBAL TRANSACTION ISOLATION LEVEL READ COMMITTED;
```

**步骤二**:重新登录 MySQL

**步骤三**:窗口B查询数据

```sql
-- 窗口B
START TRANSACTION;
SELECT * FROM account WHERE name = '张三';
-- money = 1000
```

**步骤四**:窗口A修改数据并提交

```sql
-- 窗口A
START TRANSACTION;
UPDATE account SET money = money + 500 WHERE name = '张三';
COMMIT;
```

**步骤五**:窗口B再次查询

```sql
-- 窗口B
SELECT * FROM account WHERE name = '张三';
-- money = 1500(不可重复读)
```

**解决方案**:将隔离级别提升为 REPEATABLE READ。

#### 幻读演示

**步骤一**:设置隔离级别为 REPEATABLE READ

```sql
SET GLOBAL TRANSACTION ISOLATION LEVEL REPEATABLE READ;
```

**步骤二**:重新登录 MySQL

**步骤三**:窗口A查询数据

```sql
-- 窗口A
START TRANSACTION;
SELECT * FROM account WHERE money > 800;
-- 2行数据
```

**步骤四**:窗口B插入数据并提交

```sql
-- 窗口B
START TRANSACTION;
INSERT INTO account VALUES(NULL, '王五', 2000);
COMMIT;
```

**步骤五**:窗口A再次查询

```sql
-- 窗口A
SELECT * FROM account WHERE money > 800;
-- 仍然是2行数据(REPEATABLE READ避免了幻读)
```

**步骤六**:窗口A插入数据

```sql
-- 窗口A
INSERT INTO account VALUES(3, '赵六', 3000);
-- 错误:Duplicate entry '3' for key 'PRIMARY'
-- 虽然查询不到 id=3 的王五,但插入同主键时报错,说明数据已存在(幻读的一种表现)
```

**解决方案**:将隔离级别提升为 SERIALIZABLE。

## 事务最佳实践

### 1. 事务尽量简短

**问题**:长事务会占用锁和数据库连接资源,影响并发性能。

**建议**:
- 避免在事务中进行远程调用、文件IO等耗时操作
- 尽量缩小事务范围
- 只把必要的数据库操作放在事务中

```java
// × 不推荐:事务中包含远程调用
@Transactional
public void createOrder(OrderDTO dto) {
    // 数据库操作
    orderMapper.insert(order);
    
    // 远程调用(不要放在事务中)
    paymentService.callThirdParty(order);
    
    // 数据库操作
    orderMapper.updateStatus(order.getId(), Status.PAID);
}

// √ 推荐:缩小事务范围
public void createOrder(OrderDTO dto) {
    // 远程调用(事务外)
    paymentService.callThirdParty(order);
    
    // 数据库操作(事务内)
    orderService.createOrderInTransaction(order);
}

@Transactional
public void createOrderInTransaction(Order order) {
    orderMapper.insert(order);
    orderMapper.updateStatus(order.getId(), Status.PAID);
}
```

### 2. 合理设置隔离级别

**建议**:
- 大多数场景使用默认的 REPEATABLE READ
- 对一致性要求不高的场景可以使用 READ COMMITTED 提升性能
- 避免使用 SERIALIZABLE(性能太差)

### 3. 避免锁等待

**建议**:
- 合理设计索引,避免全表扫描导致的表锁
- 避免长事务持有锁时间过长
- 使用乐观锁替代悲观锁

### 4. 异常处理

**建议**:
- 事务中发生异常要及时回滚
- Java 中使用 `@Transactional(rollbackFor = Exception.class)` 确保所有异常都回滚

```java
// √ 推荐:指定回滚异常类型
@Transactional(rollbackFor = Exception.class)
public void createOrder(OrderDTO dto) {
    // 业务逻辑
}

// × 不推荐:默认只回滚 RuntimeException 和 Error
@Transactional
public void createOrder(OrderDTO dto) throws IOException {
    // 抛出 IOException 不会回滚
}
```

## 常见误区

### 误区一:约束越多越好

**错误认知**:多加约束可以保证数据质量。

**正确理解**:
- 约束会影响插入和更新性能
- 过多的约束可能导致业务逻辑复杂
- 应根据实际需求合理使用约束

### 误区二:事务范围越大越好

**错误认知**:事务范围大可以保证数据一致性。

**正确理解**:
- 长事务会占用锁和连接资源
- 长事务增加死锁概率
- 应尽量缩小事务范围

### 误区三:隔离级别越高越好

**错误认知**:高隔离级别可以避免所有并发问题。

**正确理解**:
- 高隔离级别影响并发性能
- SERIALIZABLE 性能最差,几乎不使用
- 应根据业务需求选择合适的隔离级别

### 误区四:外键约束一定要用

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

### 2. 事务的 ACID 特性?

**回答要点**:
- 原子性:事务不可分割,要么都做要么都不做
- 一致性:事务执行前后数据库状态一致
- 隔离性:多个事务并发执行互不干扰
- 持久性:事务提交后永久生效

### 3. 脏读、不可重复读、幻读的区别?

**回答要点**:
- 脏读:读到未提交的数据
- 不可重复读:两次读取数据内容不同(针对修改)
- 幻读:两次读取结果行数不同(针对新增/删除)

### 4. MySQL 的默认隔离级别?

**回答要点**:
- MySQL 默认隔离级别是 REPEATABLE READ(可重复读)
- 该隔离级别通过 MVCC 和 Next-Key Lock 在很大程度上避免了幻读

### 5. 什么时候使用外键约束?

**回答要点**:
- 传统企业应用:数据量小、并发低,可以使用外键约束
- 互联网应用:数据量大、并发高,通常不使用外键约束,通过应用层保证

---

约束和事务是 MySQL 保证数据完整性和一致性的核心机制。理解约束的用法和事务的特性,才能设计出高质量、高性能的数据库系统。

## 版本差异(MySQL 5.7 → 8.0/8.4)

| 特性 | 旧版（本文编写时，MySQL 5.7） | 当前（MySQL 8.0/8.4 LTS） |
|------|-----------------------------|--------------------------|
| 默认字符集 | utf8（需显式配置 utf8mb4） | utf8mb4（MySQL 8.0 起默认） |
| 索引 | 普通 B+Tree | 降序索引、隐藏索引、函数索引（8.0+） |
| SQL 能力 | 常规查询 | 递归 CTE、窗口函数（8.0+） |
| 版本策略 | 5.7 | 8.0（主流）/ 8.4 LTS / 9.x（创新版） |
| Java 驱动 | mysql-connector-java 5.x/8.0 | mysql-connector-j 8.x/9.x |

> 本文基于 MySQL 5.7 编写，核心概念（索引、事务、锁、MVCC、InnoDB）在 8.0/8.4 中依然适用；8.0 的默认字符集、隐藏索引与 SQL 增强（CTE/窗口函数）是升级后的主要差异。
