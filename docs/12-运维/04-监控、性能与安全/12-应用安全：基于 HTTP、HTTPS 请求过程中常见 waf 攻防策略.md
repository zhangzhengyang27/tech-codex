---
title: 应用安全：基于 HTTP、HTTPS 请求过程中常见 waf 攻防策略
description: HTTP/HTTPS 请求过程中的 7 层安全攻防：暴力破解、内容劫持、CSRF、SQL 注入的原理与运维侧（Nginx 限流、白名单、WAF）防护策略
keywords: [运维, 应用安全, HTTP, HTTPS, WAF, CSRF, SQL 注入]
category: 部署与运维实践
tags: [DevOps, 运维]
---
# 应用安全：基于 HTTP、HTTPS 请求过程中常见 waf 攻防策略

iptables 安全主要覆盖 4 层协议规则。除 4 层安全外，7 层的安全攻击同样是运维必须掌握的内容。本文基于 HTTP、HTTPS 请求过程中常见的安全防护问题，讲解 7 层应用安全。

## 一、7 层安全攻击的运维难点

对于 7 层安全攻击行为，运维工程师通常面临两个痛点：

- **难以定位代码层问题**：这类攻击更多贴合代码或业务逻辑漏洞，运维通常不了解代码逻辑，很难定位到代码层次的具体问题。
- **攻击行为多样**：7 层的攻击行为非常多样，运维需要提前储备多种防护技能。

## 二、常见 HTTP、HTTPS 攻击行为

HTTP、HTTPS 协议的常见攻击种类如下：

- 暴力破解：主要针对弱口令漏洞进行攻击；
- HTTP 内容劫持；
- CSRF 跨站请求伪造；
- SQL 注入；
- XSS 跨站脚本攻击，等等。

以下重点讲解其中几类攻击的原理与运维侧的防范方法。

## 三、暴力破解及其防护策略

常见的暴力破解工具有 hydra、htpwdScan、Payload 等，其原理都是通过海量用户密码不断尝试后台访问。防范这种攻击有两个维度：

**运维工程师维度**：对用户后台（常见的既有用户名密码的管理后台或后台登录接口）添加安全策略：

- 基于访问控制添加白名单，只允许某一个 IP 地址（或网段）进行访问，大大减少后台接口直接暴露给公网的访问隐患；
- 限制访问频率，不允许频繁尝试登录后台，对攻击过程做频次限制。

以 Nginx 作为代理网关为例，防范策略具体包含管理后台的白名单控制与限流配置：

```nginx
limit_req_zone $binary_remote_addr zone=limiter:10m rate=20r/s;
server {
    # ...（其他配置）
    location /admin {
      proxy_pass http://127.0.0.1:8080;
      limit_req zone=limiter burst=1 nodelay;
    }
    location / {
      proxy_pass http://127.0.0.1:9090;
    }
}

```

前一段配置是 Nginx 的限流配置，使用 `limit_req_zone $binary_remote_addr zone=limiter` 限流配置模块：基于客户端源 IP 地址形式限流，限制速率为每秒 20 个请求（20r/s）。客户端访问后台 `URL+/admin` 路径时，单个用户 IP 每秒最多允许 20 次访问，超出即开启限频，避免被频繁恶意访问。

第二种方式是基于访问控制的白名单限制，只允许符合条件的 IP 访问，其他一概拒绝：

```nginx
server {
    # ...（其他配置）
    location /admin {
      allow 10.1.1.0/16;
      deny  all;
      proxy_pass http://127.0.0.1:8080;
    }
    location / {
      proxy_pass http://127.0.0.1:9090;
    }
}

```

`allow` 允许内网 `10.1.1.0/16` 网段访问 `/admin` 路径，其余客户端 IP 访问一律拒绝（`deny all`）。

**值得注意的一点是，这种模式都是基于客户端的 4 层 IP，即基于直接访问的客户端 IP 地址进行限制的。** 4 层限制与 7 层限制存在差异：要做到更高层次、更精确的用户行为限制，需要结合 HTTP 请求里的特殊头信息（如 X-Forwarded-For），或 cookie 及其他自定义变量来设计实现。

**开发人员维度**：

1. 把管理后台的密码设置得更复杂：大小写字母加特殊字符加数字多种组合，密码长度更长，破解所需的时间周期更长。
2. 设置密码校验失败的策略：同一个 IP 在单位时间内限定校验次数，超出次数后限制基于该 IP 或相关信息的后续访问，在后台程序里实现。
3. 不使用单一的用户密码校验，加入更复杂的校验方式，如电子口令卡、动态密码等，避免整个后台沦落到攻击者手中。

## 四、HTTP 内容劫持及防护策略

HTTP 内容劫持指用户正常发起 HTTP 请求访问时，服务端返回的内容被第三方（通常是运营商）劫持，并修改了 HTTP 返回的数据，导致用户收不到预期的返回结果。用户受到这类攻击时，正常访问会受到影响，还可能导致用户数据发生泄漏甚至更严重的安全影响。

![](/ops-course-images/27-应用安全_基于_HTTP_HTTPS_请求过程中常见_waf_攻防策略__Ciqc1F7Q6YiASMiTAAB4a-LuU8A861.png)

解决方法是使用 HTTPS 协议代替 HTTP。HTTPS 在 HTTP 协议的基础上增加一层 TLS 防护，对传输的数据进行加密，劫持端无法分析和篡改内容：

![](/ops-course-images/27-应用安全_基于_HTTP_HTTPS_请求过程中常见_waf_攻防策略__Ciqc1F7Q6Z6AEwfFAAD8F-GMrW4529.png)

值得特殊注意的是：HTTPS 无法解决域名劫持问题。针对基于域名的劫持行为，还需要考虑其他访问策略。

## 五、CSRF 跨站请求伪造及其防护策略

CSRF（Cross-Site Request Forgery，跨站请求伪造）的攻击过程如下图所示：

![](/ops-course-images/27-应用安全_基于_HTTP_HTTPS_请求过程中常见_waf_攻防策略__CgqCHl7Q6f-AQensAAE6SboBoZM422.png)

图左边是客户端，右上方是受信任的网站 A（www.example.com），下方是危害网站 B（www.evil.example）。攻击过程分五步：

1. **Step1**：用户通过浏览器访问其信任的站点 A；
2. **Step2**：登录站点 A 通过验证；由于它是受信任的站点，浏览器通常保留这个 cookie 信息。用户下次再访问站点 A，就直接通过传递 cookie 的方式访问站点里的数据和其他页面内容；
3. **Step3**：黑客给用户发送一个引导链接（钓鱼网站链接），用户主动打开并访问站点 B；
4. **Step4**：用户本地已保存站点 A 的 cookie 信息且在生效周期之内，此时访问有危害的网站 B；
5. **Step5**：网站 B 返回的页面内容里带有让用户请求网站 A 的恶意代码——用户以为在访问网站 B，实际发出的却是针对受信任站点 A 的恶意请求。

由于站点 A 已验证用户 cookie 数据且仍在有效期，用户便通过了站点 A 的 cookie 信息校验，在不知不觉的情况下成功请求了网站 A。假设网站 A 是控制现金流水流的银行后台网站，网站 B 就能利用 A 网站登录留存的认证信息访问 A 网站中受信任的数据，甚至利用用户的权限执行危害操作。这就是跨站请求伪造：看似请求了网站 B，实际上请求了受信任站点 A，导致 A 被攻击。

防范 CSRF 攻击的策略：

1. **验证 HTTP Referer 字段**。HTTP Referer 记录了用户本次访问 URL 的上一个来源地址，可以溯源上一级来源。在网站 A 里添加 Referer 头的控制。以 Nginx 为例：

```nginx
valid_referers none blocked server_names www.example.com;
if ($invalid_referer) {
    return 403;
}

```

`valid_referers` 定义可信的 Referer 头，包含正常网站域名（www.example.com）等；不满足 Referer 头信息或域名非指定则返回 403。通过用户请求的 Referer 头信息，可有效控制跨站请求行为。

2. **在请求地址中添加 token 并验证**，增加验证的安全机制。
3. **用户端浏览器安全加固**：如 Chrome 浏览器对 SameSite cookie 属性默认启用 Lax 策略（服务端也可显式设置），避免跨站安全攻击的产生。

## 六、SQL 注入及其防护策略

SQL 注入是通过将恶意的 SQL 查询或添加语句插入到网站应用的输入参数之中，一旦输入参数匹配成功，后台就会执行这样的 SQL，并返回本不该返回的数据内容。以下面的页面代码为例：

```bash
$query = "SELECT first_name, last_name FROM users WHERE user_id = '$id'";

```

这段页面代码发起一个查询：查询 user 表，基于 user_id 进行查询，user_id 拿到的是变量 `$id`——通常来自页面输入框中用户填入的内容。正常情况下，id 需要传输用户 id 的数值类数据；黑客加以篡改，把 id 信息传入特殊字符：

```bash
1' union select database(),user()#

```

实际执行效果就完全不一样了，执行语句变成：

```bash
SELECT first_name, last_name FROM users WHERE user_id = '1' union select database(),user()#

```

SQL 中执行这段语句时，`#` 后面的内容会被注释掉、不执行。屏蔽这段内容后，实际执行的是 `SELECT first_name, last_name FROM users WHERE user_id = '1' union select database(),user()`：联合查询 `select database(),user()` 的结果——当前数据库名、数据库用户等敏感信息会被整体取出，执行成功后返回给客户端。

防范 SQL 注入的策略分两个层面：

**研发层面**（重点）：加强代码安全逻辑，对参数严格检查；使用更安全的开发框架与机制，如 ORM（对象关系映射）——查询接口被封装在 ORM 机制内部，不直接拼接 SQL，而是通过它转化成 SQL 语句的方式进行查询。

**运维层面**：使用安全类产品，如购买应用类的安全防火墙服务 WAF（Web Application Firewall，Web 应用防火墙），包含硬件、软件类型；或直接自建一套基于 SQL 敏感词过滤的入口网关系统，例如 Nginx 结合 Lua 自行开发，把 SQL 在 HTTP 协议请求里的关键词进行过滤，如 `select`、`from`、`information_schema`、`tables` 等。这些关键词恰恰是正常网站请求里很少会携带的字符参数，可基于这些字符做整体屏蔽：请求过程中发现此类关键词，直接在入口网关层拒绝并返回 403。通过自建的敏感词入口网关防火墙服务，即可防止后台网站被 SQL 攻击。

## 七、小结

- 7 层攻击贴合代码与业务逻辑漏洞，运维侧的难点是难以定位代码问题、攻击行为多样，防护需与研发协同。
- 暴力破解：运维侧用 Nginx 白名单（`allow/deny`）与限流（`limit_req_zone` + `limit_req`）收缩后台入口；开发侧用复杂口令、失败次数限制、多因素校验。
- 内容劫持：HTTPS（TLS 加密）可解决内容篡改，但不解决域名劫持。
- CSRF：验证 Referer、请求 token、SameSite cookie 等策略阻断伪造请求。
- SQL 注入：研发侧参数校验与 ORM 参数化查询为主，运维侧可用 WAF 或 Nginx+Lua 敏感词过滤网关（select/from/information_schema/tables 等关键词直接 403）。
