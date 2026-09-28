---
title: 常用 SQL 标准
description: SQL 标准的演进与两个最重要的版本 SQL92 与 SQL99：笛卡尔积、等值/非等值连接、外连接（（+）方言与 LEFT/RIGHT/FULL JOIN）、自然连接、ON/USING 连接与自连接，以及不同 DBMS 使用连接的注意事项
keywords: [SQL标准, ANSI, SQL语法, 兼容性]
category: 数据库基础
tags: [SQL, 标准规范]
---

# 常用 SQL 标准

在数据库中表的组成是基于关系模型的，一个表就是一个关系。一个数据库中可以包括多个表，也就是存在多种数据之间的关系。

之所以能使用 SQL 语言对各个数据表进行复杂查询，核心就在于连接，可以用 SELECT 语句在多张表之间进行查询。关系型数据库的核心之一就是连接。

SQL 存在不同版本的标准规范，不同规范下的表连接操作是有区别的。

SQL 有两个主要的标准，分别是 SQL92 和 SQL99。SQL92 就是 92 年提出的标准规范。还存在 SQL-86、SQL-89、SQL:2003、SQL:2008、SQL:2011、SQL:2016 和 SQL:2023（截至审校时的最新标准）等其他的标准。

实际上最重要的 SQL 标准就是 SQL92 和 SQL99。一般来说 SQL92 的形式更简单，但写 SQL 语句会比较长，可读性较差。而 SQL99 相比于 SQL92 来说，语法更加复杂，但可读性更强。

SQL92 的标准有 500 页，而 SQL99 标准超过 1000 页。基本上从 SQL99 之后，只需掌握一些核心的功能，满足日常工作的需求即可。

## SQL92 连接

SQL92 中的 5 种连接方式，分别是笛卡尔积、等值连接、非等值连接、外连接（左连接、右连接）和自连接。

### 笛卡尔积

笛卡尔乘积是一个数学运算。假设有两个集合 X 和 Y，那么 X 和 Y 的笛卡尔积就是 X 和 Y 的所有可能组合。假定 player 表的数据是集合X、team 表的数据为集合 Y

```sql
SELECT * FROM player;

SELECT * FROM team;
```

查看两张表的笛卡尔积的结果，这是笛卡尔积的调用方式：

```sql
SELECT * FROM player, team
```

运行结果（一共37\*3=111条记录）：

![image-20240627170827296](/sql-images/202406271708667.png)

笛卡尔积也称为交叉连接，英文是 CROSS JOIN，它的作用就是可以把任意表进行连接，即使这两张表不相关。但通常进行连接还是需要筛选的，因此你需要在连接后面加上 WHERE 子句，也就是作为过滤条件对连接数据进行筛选

### 等值连接

两张表的等值连接就是用两张表中都存在的列进行连接。也可以对多张表进行等值连接。

针对 player 表和 team 表都存在 team\_id 这一列，可以用等值连接进行查询。

```sql
SELECT player_id, player.team_id, player_name, height, team_name FROM player, team WHERE player.team_id = team.team_id;
```

运行结果（一共37条记录）：

![](/sql-images/202406271710930.png)

在进行等值连接的时候，可以使用表的别名 让 SQL 语句更简洁：

```sql
SELECT player_id, a.team_id, player_name, height, team_name FROM player AS a, team AS b WHERE a.team_id = b.team_id
```

注意：如果使用了表的别名，在查询字段中就只能使用别名进行代替，不能使用原有的表名，比如下面的SQL查询就会报错：

```sql
SELECT player_id, player.team_id, player_name, height, team_name FROM player AS a, team AS b WHERE a.team_id = b.team_id
```

### 非等值连接

进行多表查询的时候，如果连接多个表的条件是等号时，就是等值连接，其他的运算符连接就是非等值查询。

player 表中有身高 height 字段，如果想要知道每个球员的身高的级别，可以采用非等值连接查询。

```sql
SELECT p.player_name, p.height, h.height_level FROM player AS p, height_grades AS h
WHERE p.height BETWEEN h.height_lowest AND h.height_highest;
```

运行结果（37条记录）：

<!-- 图片已失效 -->

### 外连接

两张表的外连接，会有一张是主表，另一张是从表。如果是多张表的外连接，那么第一张表是主表，即显示全部的行，而剩下的表则显示对应连接的信息。SQL92 标准引入了 LEFT/RIGHT/FULL OUTER JOIN 语法；不过在标准普及前后，Oracle 一直采用（+）代表从表所在的位置，用（+）只能实现左外连接和右外连接，无法实现全外连接。

左外连接，就是指左边的表是主表，需要显示左边表的全部行，而右侧的表是从表，（+）表示哪个是从表。

```sql
SELECT * FROM player, team where player.team_id = team.team_id(+);
```

相当于 SQL99 中的：

```sql
SELECT * FROM player LEFT JOIN team on player.team_id = team.team_id;
```

右外连接指的就是右边的表是主表，需要显示右边表的全部行，而左侧的表是从表

```sql
SELECT * FROM player, team where player.team_id(+) = team.team_id
```

相当于 SQL99 中的：

```sql
SELECT * FROM player RIGHT JOIN team on player.team_id = team.team_id;
```

LEFT JOIN 和 RIGHT JOIN 的显式语法在 SQL92 标准中就已定义，SQL99 沿用了这一语法；（+）只是 Oracle 早期版本对外连接的方言实现，并非标准语法。

### 自连接

自连接可以对多个表进行操作，也可以对同一个表进行操作。也就是说查询条件使用了当前表的字段。

查看比布雷克·格里芬高的球员都有谁，以及他们的对应身高：

```sql
SELECT b.player_name, b.height FROM player as a , player as b WHERE a.player_name = '布雷克-格里芬' and a.height < b.height;
```

运行结果（6条记录）：

<!-- 图片已失效 -->

如果不用自连接的话，需要采用两次 SQL 查询。首先需要查询布雷克·格里芬的身高，然后再查询比 2.08 高的球员都有谁，以及他们的对应身高

```sql
# 运行结果为 2.08
SELECT height FROM player WHERE player_name = '布雷克-格里芬';

SELECT player_name, height FROM player WHERE height > 2.08
```

表格中一共有 3 支球队，现在这 3 支球队需要进行比赛，请用一条 SQL 语句显示出所有可能的比赛组合

```sql
SELECT a.team_name, b.team_name FROM team as a, team as b WHERE a.team_name !=b.team_name;
```

> 说明：该查询会返回 6 行，A 对 B 与 B 对 A 各出现一次；若只要不区分主客场的组合，可以再加上 `a.team_id < b.team_id` 的条件，结果为 3 行。

## SQL99 连接

### 交叉连接

交叉连接实际上就是 SQL92 中的笛卡尔乘积，只是这里采用的是 CROSS JOIN。通过下面代码得到 player 和 team 这两张表的笛卡尔积的结果：

```sql
SELECT * FROM player CROSS JOIN team
```

如果多张表进行交叉连接，比如表t1，表t2，表t3 进行交叉连接，可以写成下面这样：

```sql
SELECT * FROM t1 CROSS JOIN t2 CROSS JOIN t3
```

### 自然连接

自然连接理解为 SQL92 中的等值连接，自动查询两张连接表中所有相同的字段，然后进行等值连接。想把 player 表和 team 表进行等值连接，相同的字段是 `team_id`。在 SQL92 标准中:

```sql
SELECT player_id, a.team_id, player_name, height, team_name FROM player as a, team as b WHERE a.team_id = b.team_id
```

SQL99 写成：

```sql
SELECT player_id, team_id, player_name, height, team_name FROM player NATURAL JOIN team;
```

在 SQL99 中用 NATURAL JOIN 替代了 `WHERE player.team_id = team.team_id`。

### ON 连接

ON 连接用来指定想要的连接条件，针对上面的例子同样可以实现自然连接的功能：

```sql
SELECT player_id, player.team_id, player_name, height, team_name FROM player JOIN team ON player.team_id = team.team_id
```

指定了连接条件是 `ON player.team_id = team.team_id`，相当于是用 ON 进行了 `team_id` 字段的等值连接。

也可以 ON 连接进行非等值连接，比如想要查询球员的身高等级，需要用 player 和 `height_grades` 两张表：

```sql
SELECT p.player_name, p.height, h.height_level FROM player as p JOIN height_grades as h ON height BETWEEN h.height_lowest AND h.height_highest
```

这个语句的运行结果和之前采用 SQL92 标准的查询结果一样。

```sql
SELECT p.player_name, p.height, h.height_level
FROM player AS p, height_grades AS h
WHERE p.height BETWEEN h.height_lowest AND h.height_highest
```

### USING 连接

进行连接的时候可以用 USING 指定数据表里的同名字段进行等值连接

```sql
SELECT player_id, team_id, player_name, height, team_name FROM player JOIN team USING(team_id);
```

与自然连接 NATURAL JOIN 不同的是，USING 指定了具体的相同的字段名称，需要在 USING 的括号()中填入要指定的同名字段。同时使用 JOIN USING 可以简化 JOIN ON 的等值连接，它与下面的SQL查询结果是相同的：

```sql
SELECT player_id, player.team_id, player_name, height, team_name FROM player JOIN team ON player.team_id = team.team_id;
```

### 外连接

SQL99 的外连接包括了三种形式：

1. 左外连接：LEFT JOIN 或 LEFT OUTER JOIN
2. 右外连接：RIGHT JOIN 或 RIGHT OUTER JOIN
3. 全外连接：FULL JOIN 或 FULL OUTER JOIN

我们在SQL92中讲解了左外连接、右外连接，在SQL99中还有全外连接。全外连接实际上就是左外连接和右外连接的结合。在这三种外连接中，一般省略 OUTER 不写

1. 左外连接

**SQL92**

```sql
SELECT * FROM player, team where player.team_id = team.team_id(+)
```

**SQL99**

```sql
SELECT * FROM player LEFT JOIN team ON player.team_id = team.team_id;
```

2. 右外连接

**SQL92**

```sql
SELECT * FROM player, team where player.team_id(+) = team.team_id;
```

**SQL99**

```sql
SELECT * FROM player RIGHT JOIN team ON player.team_id = team.team_id;
```

3. 全外连接

**SQL99**

```sql
SELECT * FROM player FULL JOIN team ON player.team_id = team.team_id
```

MySQL 不支持全外连接。全外连接会返回左表和右表中的所有行。当表之间有匹配的行，会显示内连接的结果。当某行在另一个表中没有匹配时，那么会把另一个表中选择的列显示为空值。也就是说，全外连接的结果=左右表匹配的数据+左表没有匹配到的数据+右表没有匹配到的数据。

### 自连接

自连接的原理在 SQL92 和 SQL99 中都是一样的，只是表述方式不同。

想要查看比布雷克·格里芬身高高的球员都有哪些，在两个 SQL 标准下的查询如下。

**SQL92**

```sql
SELECT b.player_name, b.height FROM player as a , player as b WHERE a.player_name = '布雷克-格里芬' and a.height < b.height
```

**SQL99**

```sql
SELECT b.player_name, b.height FROM player as a JOIN player as b ON a.player_name = '布雷克-格里芬' and a.height < b.height
```

## 不同 DBMS 中使用连接注意

SQL 连接具有通用性，但不同的 DBMS 在使用规范上会存在差异，在标准支持上也存在不同。在实际工作中，你需要参考你正在使用的DBMS文档，这里我整理了一些需要注意的常见的问题。

**1.不是所有的DBMS都支持全外连接**

虽然SQL99标准提供了全外连接，但不是所有的DBMS都支持。不仅MySQL不支持，Access、MariaDB等数据库软件也不支持；SQLite 自 3.39.0（2022 年）起才支持全外连接。不过在Oracle、DB2、SQL Server中是支持的。

**2.Oracle没有表别名AS**

为了让SQL查询语句更简洁，我们经常会使用表别名AS，不过在Oracle中是不存在AS的，使用表别名的时候，直接在表名后面写上表别名即可，比如player p，而不是player AS p。

**3.SQLite的外连接**

SQLite是一款轻量级的数据库软件，在 3.39.0（2022 年）之前只支持左连接，不支持右连接；3.39.0 起已经同时支持右连接和全外连接。在老版本中，如果想使用右连接的方式，比如 `table1 RIGHT JOIN table2`，可以写成 `table2 LEFT JOIN table1`，这样就可以得到相同的效果。

除了一些常见的语法问题，还有一些关于连接的性能问题需要你注意：

**1.控制连接表的数量**

多表连接就相当于嵌套for循环一样，非常消耗资源，会让SQL查询性能下降得很严重，因此不要连接不必要的表。在许多DBMS中，也都会有最大连接表的限制。

**2.在连接时不要忘记WHERE语句**

多表连接的目的不是为了做笛卡尔积，而是筛选符合条件的数据行，因此在多表连接的时候不要忘记了WHERE语句，这样可以过滤掉不必要的数据行返回。

**3.使用自连接而不是子查询**

我们在查看比布雷克·格里芬高的球员都有谁的时候，可以使用子查询，也可以使用自连接。一般情况建议你使用自连接，因为在许多DBMS的处理过程中，对于自连接的处理速度要比子查询快得多。你可以这样理解：子查询实际上是通过未知表进行查询后的条件判断，而自连接是通过已知的自身数据表进行条件判断，因此在大部分DBMS中都对自连接处理进行了优化
