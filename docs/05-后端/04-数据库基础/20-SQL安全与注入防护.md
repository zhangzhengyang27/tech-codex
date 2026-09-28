---
title: SQL 安全与注入防护
description: SQL 注入是最严重的 Web 安全威胁之一。系统讲解 SQL 注入的原理与类型（联合/布尔/时间盲注）、危险函数、防护措施（参数化查询/白名单/最小权限），以及数据库其他安全实践
keywords: [SQL注入, 注入防护, 参数化查询, 预编译, 最小权限, 数据库安全]
category: 数据库基础
tags: [SQL, 安全, 注入防护]
---

# SQL 安全与注入防护

SQL 注入（SQL Injection）是通过在输入中**构造恶意 SQL**，让数据库执行非预期命令的攻击方式，长期位居 OWASP Top 10。本文讲解注入原理、常见类型、危险函数，以及根本性的防护手段（参数化查询、最小权限、输入校验）。

## SQL 注入原理

### 为什么会产生注入

当 SQL 语句用**字符串拼接**方式把用户输入直接拼进查询时，攻击者可通过输入闭合/改写 SQL 结构，改变原意。

```python
# 危险写法：字符串拼接
username = request.form['username']     # 用户可控
sql = "SELECT * FROM users WHERE name = '" + username + "'"
```

若用户输入 `' OR '1'='1`，拼接后变成：

```sql
SELECT * FROM users WHERE name = '' OR '1'='1'
```

`'1'='1'` 恒真，`WHERE` 失效，**返回所有用户数据**（绕过登录）。

### 注入的本质

> 输入数据被当作 **SQL 代码** 执行，而不是当作**数据**。防护的核心就是让数据永远是数据、绝不成为代码。

## 常见注入类型

### 1. 联合查询注入（UNION）

利用 `UNION` 合并攻击者的查询，直接窃取数据：

```sql
-- 原查询
SELECT id, name FROM products WHERE id = '1'
-- 输入 1' UNION SELECT username, password FROM users --
-- 变成
SELECT id, name FROM products WHERE id = '1'
UNION SELECT username, password FROM users --'
```

### 2. 布尔盲注

当页面无回显时，通过 `TRUE/FALSE` 条件判断逐步推断数据：

```sql
-- 若 id=1 且第一个字符是'a'，页面正常；否则异常
SELECT ... WHERE id = 1 AND SUBSTRING(database(), 1, 1) = 'a'
```

### 3. 时间盲注

通过 `SLEEP()` 制造时间差判断条件是否成立：

```sql
-- 若条件成立则延迟 5 秒，通过响应时间判断
SELECT ... WHERE id = 1 AND IF(SUBSTRING(user(),1,1)='r', SLEEP(5), 0)
```

### 4. 堆叠查询注入

通过 `;` 分隔执行多条语句（需数据库支持多语句）：

```sql
SELECT ...; DROP TABLE users; --   -- 极危险
```

## 危险函数与接口

| 语言/数据库 | 危险用法 | 安全用法 |
|------------|---------|---------|
| Python (sqlite3) | `f"...{input}..."` 拼接 | `?` 占位符 |
| Python (PyMySQL) | `f"...{input}..."` | `%s` 参数化 |
| Java (JDBC) | `Statement` | `PreparedStatement` |
| Node (mysql2) | 模板字符串拼接 | `?` 占位符 |
| PHP (mysqli) | `mysqli_query` 拼接 | `mysqli_prepare` 预处理 |
| 存储过程 | 拼接动态 SQL（`EXEC`） | 参数化/白名单校验 |

> **绝对禁止**：把用户输入直接拼接进 SQL；**推荐**：使用参数化查询/预编译语句。

## 防护措施

### 1. 参数化查询（根本防护）

用**占位符**替代拼接，数据库把输入当作"数据值"而非"SQL 代码"，注入即失效：

**Python + PyMySQL**：

```python
# ✅ 安全：参数化
cur.execute(
    "SELECT * FROM users WHERE name = %s AND pwd = %s",
    (username, password)
)

# ❌ 危险：拼接
cur.execute(f"SELECT * FROM users WHERE name = '{username}'")
```

**Java JDBC**：

```java
// ✅ 安全：PreparedStatement 预编译
String sql = "SELECT * FROM users WHERE name = ? AND pwd = ?";
PreparedStatement ps = conn.prepareStatement(sql);
ps.setString(1, username);
ps.setString(2, password);
```

**Node mysql2**：

```javascript
// ✅ 安全：? 占位符
await conn.query(
  'SELECT * FROM users WHERE name = ? AND pwd = ?',
  [username, password]
);
```

**PHP PDO**：

```php
// ✅ 安全：PDO 预处理
$stmt = $pdo->prepare('SELECT * FROM users WHERE name = :name');
$stmt->execute([':name' => $username]);
```

### 2. 输入校验与白名单

参数化不是万能的——**动态标识符（表名/列名/排序方向）无法参数化**，必须白名单校验：

```python
# ✅ 排序字段白名单
ALLOWED_ORDER = {'name', 'hp_max', 'created_at', 'id'}
order_col = request.args.get('sort', 'id')
if order_col not in ALLOWED_ORDER:
    order_col = 'id'          # 不在白名单就用默认

# ✅ 排序方向
ALLOWED_DIR = {'ASC', 'DESC'}
direction = request.args.get('dir', 'ASC').upper()
direction = direction if direction in ALLOWED_DIR else 'ASC'
```

**其他校验**：

- 数值类型强校验（`int()`）、枚举白名单、正则格式校验；
- 字符串转义：虽然参数化为主，对无法参数化的场景用数据库转义函数（如 `mysqli_real_escape_string`；旧的 `mysql_real_escape_string` 已随 PHP 7 移除）。

### 3. 最小权限原则

数据库账号只给完成任务所需的最小权限：

```sql
-- 只读账号：只能 SELECT
CREATE USER 'readonly'@'%' IDENTIFIED BY '密码';
GRANT SELECT ON app_db.* TO 'readonly'@'%';

-- 应用账号：不授予 DDL/DROP 等
GRANT SELECT, INSERT, UPDATE, DELETE ON app_db.* TO 'app_user'@'%';

-- 不授予 FILE、SUPER、PROCESS 等高危权限
REVOKE FILE, SUPER ON *.* FROM 'app_user'@'%';
```

> 即使被注入，最小权限也能把危害限制在"能读到的表"范围，无法 `DROP`/读系统库/读文件。

### 4. 纵深防御

| 层 | 措施 |
|----|------|
| 输入层 | 参数化查询、白名单校验、转义 |
| 代码层 | 禁止拼接、代码审计、ORM 框架 |
| 数据层 | 最小权限、视图暴露受控数据 |
| 网络层 | WAF、数据库不对外网开放、防火墙白名单 |
| 运行层 | 关闭错误回显（避免泄露 SQL 结构）、慢查询/异常监控 |

### 5. 数据库安全基线

```sql
-- 关闭错误详情回显（应用层隐藏数据库报错）
-- 修改默认端口、禁用远程 root 登录
ALTER USER 'root'@'localhost' IDENTIFIED WITH caching_sha2_password BY '强密码';
-- 删除匿名用户、清空默认测试库
DROP DATABASE IF EXISTS test;
-- 定期审计权限与慢查询
```

## 其他 SQL 安全风险

### 存储过程/动态 SQL 注入

存储过程内若用 `EXEC` 拼接动态 SQL，同样有注入风险：

```sql
-- ❌ 危险：动态拼接表名
SET @sql = CONCAT('SELECT * FROM ', @table);
PREPARE stmt FROM @sql;
EXECUTE stmt;

-- ✅ 安全：表名白名单 + 参数占位
SET @sql = 'SELECT * FROM orders WHERE user_id = ?';
PREPARE stmt FROM @sql;
EXECUTE stmt USING @uid;
```

### ORM 安全

ORM（如 MyBatis、Hibernate、JPA）能规避大部分拼接，但仍需注意：

```xml
<!-- MyBatis：优先 #{}（预编译），避免 ${}（字符串替换） -->
<!-- ✅ 安全：#{} 会预编译成 ? -->
SELECT * FROM users WHERE name = #{name}

<!-- ❌ 危险：${} 直接拼接，与注入等价 -->
SELECT * FROM users WHERE name = '${name}'
```

> `${}` 仅可用于无法参数化的动态标识符（表名/列名），且必须白名单校验。

### 敏感数据保护

- **密码**：绝不明文存储，用 bcrypt/argon2 等加盐哈希；
- **SQL 日志**：日志不打印完整 SQL 或敏感参数；
- **连接串**：数据库密码存配置中心/密钥管理，不进代码库。

## 总结

### 防护清单

| 措施 | 关键动作 |
|------|---------|
| 参数化查询 | 所有用户输入用占位符，杜绝字符串拼接 |
| 白名单校验 | 动态标识符（表名/列/排序）白名单限定 |
| 最小权限 | 账号权限收敛，禁止高危权限 |
| 纵深防御 | 输入+代码+数据+网络+运行多层防护 |
| ORM 安全 | 用 `#{}` 预编译，避免 `${}` 拼接 |
| 敏感保护 | 密码加盐哈希、日志脱敏、密钥管理 |

### 关键点

1. **注入根因**：输入被当作 SQL 代码而非数据；**防护核心**：让数据永远是数据；
2. 常见注入：联合查询、布尔盲注、时间盲注、堆叠查询——都源于拼接；
3. **参数化查询是最根本的防护**，配合白名单处理无法参数化的动态标识符；
4. 最小权限让注入危害最小化；纵深防御把单点防护失效的风险降到最低；
5. 存储过程动态 SQL、ORM 的 `${}` 同样有注入风险，需同样约束。
