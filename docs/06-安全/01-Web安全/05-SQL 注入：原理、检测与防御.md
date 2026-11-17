---
title: SQL 注入：原理、检测与防御
description: SQL 注入产生原因（数据当代码解析）与万能密码原理、数字型/字符型分类、sqlmap 六大注入技术（布尔盲注/报错/联合查询/堆叠/时间盲注/内联查询）,以及检测技术（SAST/DAST/IAST）与防御方案（参数化查询、白名单校验、最小权限、WAF 与 RASP）
keywords: [SQL注入, 万能密码, 布尔盲注, 报错注入, 联合查询, 堆叠注入, sqlmap, 参数化查询, WAF, RASP]
category: 安全
tags: [Web安全, SQL注入, 漏洞利用, 防御]
---

# SQL 注入：原理、检测与防御


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
- 防御方案（参数化查询、预编译等）详见下文「防御 SQL 注入」章节。

# SQL 注入的检测与防御

前文介绍了 SQL 注入的产生原因、分类与六大测试技术，本节介绍如何检测和防御 SQL 注入。

## 自动化检测 SQL 注入

如果开发者想尽早发现 SQL 注入问题，需要主动对自己写的程序做安全检测。下面介绍如何自动化地检测 SQL 注入漏洞。

目前检测 Web 漏洞的方式共有 3 种：SAST（静态应用安全测试）、DAST（动态应用安全测试）和 IAST（交互式应用安全测试）。

### SAST（静态应用安全测试）

SAST（Static Application Security Testing，静态应用安全测试）是通过分析应用程序源代码以提早发现安全漏洞，也包括二进制文件的静态逆向分析。在产品形式上，主要体现为代码审计系统等。

PHP 代码的商业 SAST 产品有 RIPS、Checkmarx 等，其中以 RIPS 审计能力最强，当时几乎没有比它更优秀的 PHP 代码审计产品。RIPS 早期有开源的社区版，后来走商业化路线，2019 年已被 SonarSource 收购，联合其他语言的代码审计功能打包出售。

SAST 分析比较全面，漏洞发现率高，哪怕是当前未能执行到的代码，也可能被发现到漏洞，但是对于它最大的挑战是如何降低误报率。

代码审计本质上是在误报率与发现率之间相互协调，直到在可接受的范围内找到一个平衡的过程。如果发现率很高，但其中包含过多的误报，告警量多到无法运营的程度，那也等同于没发现。就像外面反馈一个网站存在漏洞，在排查代码审计系统之前的审计结果时，发现有过告警，但由于同一时期的告警量太多导致无法及时跟进，发现了却未修复，就和没发现一样。

现在企业基本采用多种方式结合来测试，而不是单一地采用 SAST 方法。

### DAST（动态应用安全测试）

DAST（Dynamic Application Security Testing，动态应用安全测试）是对应用程序进行黑盒分析，通常在测试或运行阶段分析应用程序的动态运行状态，通过模拟黑客行为对应用程序进行动态攻击，分析应用程序的反应，从而确定是否存在漏洞。

DAST 在产品形式上主要体现为漏洞扫描器，著名的商业产品有 Acunetix Web Vulnerability Scanner（AWVS，不过近来的版本误报很多）、AppScan，还有国内长亭出品的 Xray，这些都是许多“白帽子”喜欢用的扫描器。

DAST 通过动态发送 payload 来测试漏洞，所以准确率相对较高，而且检测出来后就直接有现成的 PoC（Proof of Concept，概念验证）可以验证。但如果有些代码未执行，就无法发现。因此，跟 SAST 结合使用是最好的方式。

### IAST（交互式应用安全测试）

IAST（Interactive Application Security Testing，交互式应用安全测试）是近几年兴起的一种应用安全测试新技术，曾被 Gartner 咨询公司列为网络安全领域的 Top 10 技术之一。IAST 融合了 DAST 和 SAST 的优势，漏洞检出率极高、误报率极低，同时可以定位到 API 接口和代码片段。

IAST 主要有代理和插桩两种模式，其他的 VPN 或流量镜像都是类似代理的流量采集方式。

以往的 DAST 漏洞扫描时，如果爬虫不到位、URL 收集不全就无法扫描到，IAST 的流量采集可以解决此类问题。同时，IAST 会借助 Hook 收集应用执行信息，比如 SQL 语句的执行函数。通过检查真正执行的语句，判断其是否包含攻击性或专用测试标记的 payload，IAST 可以非常精确地识别出漏洞。

比较著名的 IAST 产品有百度的 OpenRASP-IAST，它是在 OpenRASP 的基础上引入了 DAST 扫描器，组合成完整的 IAST。除此之外，AWVS AcuSensor 和 AppScan 也都引入 IAST 技术，支持在服务端部署 Agent 去监控程序并采集信息，再提供给扫描器进行进一步的扫描。

既然聊到了 RASP，就顺便说明一下 RASP 与 IAST 的区别。

RASP（Runtime Application Self-Protection）是一项运行时应用程序自保护的安全技术，通过搜集和分析应用运行时的相关信息来检测和阻止针对应用本身的攻击。RASP 和 IAST 使用相同的 Agent 技术，不同之处在于 RASP 更偏向于拦截防御，而 IAST 更偏向于安全测试，若将 RASP 结合 DAST 共用的话，就可以达到 IAST 的效果了。

## 防御 SQL 注入

检测到 SQL 注入漏洞，或者外部报告过来，那么又该如何修复漏洞，防止被 SQL 注入攻击呢？通常防御 SQL 注入的方法有白名单、参数化查询、WAF、RASP 等方法，下面就简单介绍一下。

### 白名单

如果请求参数有特定值的约束，比如参数是固定整数值，那么就只允许接收整数；还有就是常量值限制，比如特定的字符串、整数值等。这个时候，最好采用白名单的方式。不建议使用黑名单的方式，比如过滤单引号、SQL 关键词，虽然有部分效果，但在某些场景下仍会被如整数型注入、二次注入、新增的 SQL 关键词等方式绕过。

### 参数化查询

参数化查询是预编译 SQL 语句的一种处理方式，所以也叫预编译查询，它可以将输入数据插入到 SQL 语句中的“参数”（即变量）中，防止数据被当作 SQL 语句执行，从而防止 SQL 注入漏洞的产生。

比如在下列语句中，设置 $pwd 变量值为 1 and 1=1 时：

```sql
select password from users where id=1;
```

一般情况下，SQL 语句都会经过 SQL 解析器编译并执行，这意味着 and 语句也会被编译执行，造成 SQL 注入。

开启参数化查询时，原 SQL 语言会先进行预编译处理，为用户输入的每个参数预留占位符，将编译结果缓存起来。当用户输入恶意构造的 and 语句时，不做编译处理，按原语句模板将输入值带入到对应的占位符中，此处即 id 参数，也就是说 1 and 1=1 仅为参数值带入，不作为 SQL 语句编译，那么 and 语句就不会被执行，从而防止 SQL 注入。

不同的开发平台和数据库会有不同的参数化查询方式，本节主要以 PHP+MySQL 环境为例，有 mysqli 和 PDO（PHP 数据对象）两种扩展使用方式。这里推荐使用 PDO 扩展，因为它与关系数据库类型无关，无论是使用 MySQL，还是 SQL Server、Oracle。

下面是使用 PDO 扩展实现参数化查询的示例代码，通过创建 PDO 对象，直接调用其方法 prepare 和 bindParam 就可以实现预编译处理，将用户输入数据绑定到特定参数，避免输入数据被当作 SQL 关键词来解析。

```php
$pdo = new PDO("mysql:host=localhost;dbname=database", "dbusername", "dbpassword");
$query = "SELECT * FROM users WHERE (name = :username) and (password = :password)";

$statement = $pdo->prepare($query, array(PDO::ATTR_CURSOR => PDO::CURSOR_FWDONLY));
$statement->bindParam(":username", $username, PDO::PARAM_STR, 10);
$statement->bindParam(":password", $password, PDO::PARAM_STR, 12);
$statement->execute();
$statement->closeCursor();
$pdo = null;
```

在使用参数化查询时应注意以下 3 点：

1. 在每个数据库查询中都使用参数化查询，避免被二次注入；

2. 插入查询中的每一个输入参数都应进行参数化查询，避免部分参数被注入；

3. 参数名不能使用指定查询中的表和字段名，避免被误操作。

### WAF

WAF（Web 防火墙）能够抵挡住大部分的攻击，几乎是当前各网站必备的安全产品。但它也不是无懈可击的，难免会被绕过。不过安全本身就是为了不断提高攻击成本而设立的，并不是为了完全、绝对地解决入侵问题。这也是很难实现的。

业界主流的 WAF 产品，可以参考 Gartner 发布的 Web 应用防火墙魔力象限（如 2019 年的报告）。其领导者产品是 Imperva 和 Akamai，但这两款在国内的知名度并不高。国内的产品只有阿里云入榜了。其他国内常用产品有腾讯云、长亭雷池、华为云。结合云平台服务能力直接部署 WAF 是最简便的方式。基于此前个人的 WAF 测试，国内 WAF 产品排名如下：

```text
阿里云 WAF > 腾讯云 WAF > 华为云 WAF > 长亭雷池
```

### RASP

前面已经介绍过 RASP，以及它与 IAST 的区别。RASP 技术是当前安全防御技术领域的一大趋势，很多国内厂商都在做，联合 IAST 一块，毕竟核心技术是共用的。

WAF 无法感知应用程序的上下文，也无法输出漏洞攻击链，对定位漏洞代码的帮助也相当有限。RASP 不用考虑网络请求中的各种复杂的数据处理过程，只需要在对应的漏洞触发函数进行 Hook 插桩检测等操作，同时 RASP 能够给出漏洞触发的程序上下文，帮助开发人员和安全人员快速定位漏洞代码，并实现漏洞的检测、告警和阻断。

RASP 与 WAF 是互补的两种技术实现，而非以新换旧。利用 RASP 对 WAF 进行有效的补充，可以构建更加完善的安全防御体系。

