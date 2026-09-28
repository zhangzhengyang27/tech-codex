---
title: SQL 注入
description: SQL 注入产生原因（数据当代码解析）与万能密码原理、数字型/字符型分类、sqlmap 六大注入技术（布尔盲注/报错/联合查询/堆叠/时间盲注/内联查询）与靶场实例
keywords: [SQL注入, 万能密码, 布尔盲注, 报错注入, 联合查询, 堆叠注入, sqlmap]
category: 安全
tags: [Web安全, SQL注入, 漏洞利用]
---

# SQL 注入

## 0. 引言

十几年前流传着"可登录任意网站后台的万能密码"——在用户名和密码中都输入 `'or'1'='1` 即可登录。SQL 注入是 Web 漏洞中非常常见的一类，本节以 sqli-labs 靶场为例，讲解其产生原理、分类与六大测试技术。环境建议：PHP + MySQL + Docker 安装 sqli-labs。

## 1. 产生原因：将数据当代码解析

### 1.1 万能密码原理

以 sqli-labs 第 11 题（后台登录）为例，源码中用户输入未经过滤直接拼接 SQL：

```php
@$sql = "SELECT username, password FROM users
         WHERE username='$uname' and password='$passwd' LIMIT 0,1";
$result = mysql_query($sql);
```

输入 `'or'1'='1` 后语句变为：

```sql
SELECT username, password FROM users
WHERE username=''or'1'='1' and password=''or'1'='1' LIMIT 0,1
```

`'1'='1'` 恒为真，整个 WHERE 条件必然成立——查询到数据即登录成功，这就是万能密码的原理。**SQL 注入的本质：未对用户输入（GET/POST 参数、Cookie、HTTP 头等）进行有效过滤直接带入 SQL 解析，本应作为参数数据的内容被当作代码执行**。

## 2. SQL 注入的分类

| 类型 | 特征 | 语句原型 | 判断方法 |
|------|------|----------|----------|
| **数字/整数型** | 参数为整数、两边无引号 | `SELECT * FROM table WHERE id=1` | 用 `1+1` 与 `3-1` 对比响应是否一致 |
| **字符型** | 参数为字符串、两边含引号 | `SELECT * FROM table WHERE name='test'` | 输入单引号看是否报错 |

搜索型注入本质属于字符型（以 `%` 为关键字闭合语句）。区分最简单的方法是**看是否存在引号**。

## 3. SQL 注入测试技术（sqlmap 六大技术）

sqlmap 是 SQL 注入利用的"王者"级工具，其六大注入技术参数为 `BEUSTQ`：

| 参数 | 技术 | 原理与适用场景 |
|------|------|----------------|
| B | 布尔型盲注 | 对比真假请求（`and 1=1` vs `and 1=2`）响应差异，无错误回显时使用 |
| E | 报错型注入 | 构造错误 SQL 语法触发错误回显，有报错时最易发现 |
| U | 联合查询注入 | `union select` 另起查询，获取敏感信息，需配合错误回显 |
| S | 多语句堆叠注入 | 分号间隔多条语句（`mysqli_multi_query`），可执行任意语句 |
| T | 基于时间延迟盲注 | `SLEEP/BENCHMARK` 延时判断，无回显也可用 |
| Q | 内联/嵌套查询注入 | 在查询中嵌入子查询（子查询注入），用于窃取敏感信息 |

### 3.1 布尔盲注：闭合与注释

以 sqli-labs 第 8 题为例（`WHERE id='$id'`，字符型、无错误回显）：

- 直接注入 `id=1'and+1=1` 失败——单引号未闭合导致语法错误；
- 用 `--` **注释**掉多余部分（URL 中 `+` 代表空格）：`id=1'and+1=1--+`；
- 对比 `1=1`（有 "You are in"）与 `1=2`（无）的响应差异，确认注入存在。

### 3.2 报错注入与联合查询

报错注入：构造无法闭合的字符（单引号、双引号、括号、宽字符、IF/SELECT 关键词）触发语法错误。

联合查询（sqli-labs 第 2 题，整数型）：

```sql
http://localhost/Less-2/?id=0 union select 1,2,3     -- 逐步加字段数直到不报错
http://localhost/Less-2/?id=0 union select 1,database(),version()   -- 爆库名与版本
```

> 注意 `id=0`（不存在）是为了让页面显示 union 查询结果。

### 3.3 堆叠注入与时间盲注

```sql
-- 堆叠注入：创建表（需 mysqli_multi_query 支持）
http://localhost/Less-38?id=1';create table sqli like users;

-- 时间盲注：响应延迟 5 秒即存在注入
http://localhost/Less-2/?id=1 and sleep(5)--+
```

MySQL 常用延时函数：`SLEEP(seconds)`、`BENCHMARK(count,expr)`（重复计算制造耗时）、`REPEAT` + `RLIKE` 正则回溯。

> **注意**：线上测试避免长时间延时——能延时注入基本代表可实施拒绝服务攻击。

### 3.4 内联查询

```sql
http://localhost/Less-2/?id=0 union select 1,
  (SELECT username from users where id=2),
  (SELECT password from users where id=2)
```

在一句语句中嵌入查询，常用于敏感信息窃取。

## 4. 小结

- **原理**：用户输入未过滤直接拼接 SQL，数据被当代码解析；
- **分类**：数字型（无引号）与字符型（有引号），区分看引号；
- **六大技术**：布尔盲注、报错注入、联合查询、堆叠注入、时间盲注、内联查询（sqlmap 参数 BEUSTQ）；
- **实战要点**：无回显用盲注（布尔/时间）、有回显用报错/联合查询、`--` 注释闭合、URL 编码（`+` 表空格）；
- 防御方案（参数化查询、预编译等）详见《07-SQL 注入的检测与防御》。

下一章讲解 SQL 注入的检测与防御。