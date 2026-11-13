---
title: 常见 Web 漏洞与防护
description: 从 OWASP Top 10 出发，系统讲解 SQL 注入、XSS、CSRF、SSRF、路径穿越五大常见 Web 漏洞的成因，并以"漏洞代码 vs 防护代码"对照的方式给出可直接落地的 Python 防护实践。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# 常见 Web 漏洞与防护

## 概念说明

绝大多数 Web 漏洞不是玄学，而是同一个错误的反复出现：**不可信数据未经隔离，就进入了某个"解释器"的上下文**。用户提交的表单、URL 参数、请求头、JSON 请求体都属于"边界之外"的数据；当它们被拼进 SQL 语句、渲染进 HTML、变成服务器要访问的 URL 或文件路径时，"数据"就越权变成了"指令"，漏洞由此产生。

::: tip 防御视角声明
本文是**防御向**教学文档：所有"漏洞代码"只展示最简模式，帮助你在代码评审中一眼识别同类问题，不包含任何利用工具或绕过技巧。理解成因的唯一目的，是让防护代码有的放矢。
:::

## 核心要点

- 注入类漏洞共享同一句话的成因：**数据被当成了代码**。防护的通用思路是让两者永远不混在一起。
- 永远不要用字符串拼接构造 SQL、HTML、Shell 命令、文件路径——框架都提供了参数化或转义机制，绕过它们必须有明确理由。
- 框架默认防护（模板自动转义、ORM 参数化、CSRF 中间件）是最可靠的第一道防线；关闭它们（`|safe`、`mark_safe`）应被视为一次安全决策。
- 校验一律用**白名单**（"只允许这些"），不用黑名单（"禁止那些"）——黑名单永远列不全。
- 防护要纵深：输入校验 → 输出编码 → Cookie 属性/CSP → 最小权限，任何一层失效都不应全线失守。
- ⚠️ 常见误区："内网应用不需要防护"。内网反而意味着横向移动成本更低。
- ⚠️ 常见误区："前端已经校验过了"。前端校验只是体验优化，服务端必须重新校验一切，鉴权必须显式执行。

## OWASP Top 10 概览

OWASP 定期发布的 Top 10 是业界引用最广的漏洞分类。以下以当前社区普遍引用的 2021 版为例，并给出与本系列的对应关系：

| 编号 | 类别 | 一句话说明 | 对应章节 |
|---|---|---|---|
| A01 | 失效的访问控制 | 未授权用户能访问不该访问的资源 | 本篇"路径穿越"；姊妹篇认证篇 |
| A02 | 加密机制失效 | 明文存储密码、弱哈希、传输不加密 | 姊妹篇《密码存储与认证安全》 |
| A03 | 注入 | SQL/XSS 等不可信数据进入解释器 | 本篇 SQL 注入、XSS |
| A04 | 不安全的设计 | 设计阶段缺少威胁建模 | 全系列通用原则 |
| A05 | 安全配置错误 | DEBUG 开着、默认口令、报错外泄 | 姊妹篇《依赖与运行时安全》 |
| A06 | 易受攻击的过时组件 | 依赖库存在已知漏洞 | 姊妹篇"依赖审计" |
| A07 | 身份识别与认证失败 | 弱口令、可爆破登录、失效会话 | 姊妹篇"限流与登录防爆破" |
| A08 | 软件和数据完整性故障 | 供应链投毒、反序列化不可信数据 | 姊妹篇"供应链风险" |
| A09 | 安全日志与监控失败 | 出事无记录可查 | 姊妹篇"日志脱敏" |
| A10 | 服务端请求伪造（SSRF） | 诱使服务器访问任意地址 | 本篇 SSRF |

> Top 10 的分类会随版本演进调整，但"注入、访问控制、认证失败、过时组件"长期稳定在榜——掌握类别**思想**比记编号更重要。

## SQL 注入：最经典的注入类漏洞

**成因**：把用户输入用字符串拼接进 SQL，输入中的引号、注释符会改变语句结构，使"数据"变成"语句的一部分"，后果通常是绕过认证与数据泄露。

::: danger 教学警示：以下为漏洞模式，禁止照搬
下面展示"字符串拼接构造 SQL"这一**漏洞模式**，仅用于训练代码评审时的识别能力。真实项目出现这种写法属于必须立即修复的缺陷；本节不提供任何利用 payload 或工具细节。
:::

```python
# ❌ 漏洞代码：用户输入直接拼进 SQL
@app.route("/login", methods=["POST"])
def login_vulnerable():
    username = request.form.get("username", "")
    password = request.form.get("password", "")

    # 危险：输入内容决定了这条语句的"语义"，而不只是作为两个值出现
    sql = f"SELECT id FROM users WHERE name = '{username}' AND pwd = '{password}'"
    row = db.execute(sql).fetchone()

    if row is None:
        return "用户名或密码错误", 401
    return "登录成功"
```

**防护**：参数化查询把 SQL 结构与数据彻底分离——语句结构固定，输入只能作为"值"绑定进去，由数据库驱动负责安全转义。

```python
# ✅ 防护代码：参数化查询（占位符风格因驱动而异：? 或 %s）
@app.route("/login", methods=["POST"])
def login_safe():
    username = request.form.get("username", "")
    password = request.form.get("password", "")

    sql = "SELECT id FROM users WHERE name = ? AND pwd = ?"
    row = db.execute(sql, (username, password)).fetchone()

    if row is None:
        return "用户名或密码错误", 401
    return "登录成功"
```

使用 ORM（Django ORM、SQLAlchemy）时，模型查询默认就是参数化的，同样是安全起点。

::: warning 无法参数化的部分怎么办
表名、列名、`ORDER BY` 方向等语法元素**不能**用占位符，必须来自代码内的**白名单映射**，绝不直接接受用户输入。例如排序字段先在 `{"created_at", "score"}` 中查找，找不到就返回 400。
:::

更多 DB-API 层面的参数化细节（占位符差异、事务配合），见站内专文：[Python 关系型数据库 · SQL 注入与参数化查询](/docs/python/09-进阶核心/03-数据库/01-关系型数据库#sql-注入与参数化查询)。

## XSS：不可信输入进入页面

**成因**：XSS 的本质与 SQL 注入相同，只是"解释器"换成了浏览器 HTML 解析器——用户提交的内容未经转义就被渲染进页面，浏览器把它当作页面自身的一部分执行。攻击目标是**其他访问者的浏览器**：窃取会话、伪造操作、篡改页面。

::: danger 教学警示：以下为漏洞模式，禁止照搬
下面展示"用户内容未经转义直接渲染"这一**漏洞模式**。真实系统的修复方式见下方防护代码，这里不展示任何脚本注入片段。
:::

```python
# ❌ 漏洞代码：把用户输入当作 HTML 直接渲染
@app.route("/profile")
def profile_vulnerable():
    # nickname 是用户自由输入，被直接嵌入响应体
    nickname = request.args.get("nickname", "guest")
    return f"<h1>欢迎，{nickname}</h1>"
```

**防护一：输出转义（第一道防线）**——模板自动转义是默认行为，永远不要绕过它。

```python
# ✅ 防护代码：使用模板自动转义（Jinja2 默认开启）
@app.route("/profile")
def profile_safe():
    nickname = request.args.get("nickname", "guest")
    return render_template("profile.html", nickname=nickname)  # {{ nickname }} 自动转义

# profile.html 中 {{ nickname }} 已被自动转义
# 若确需在纯字符串场景拼接，用显式转义：
from markupsafe import escape

html = f"<h1>欢迎，{escape(nickname)}</h1>"
```

Django 模板同样默认自动转义；`|safe` 与 `mark_safe()` 会关掉这层保护，使用前必须确认内容来源可信。

**防护二：HttpOnly Cookie + 防护三：CSP**——Cookie 让脚本拿不到会话凭证；CSP 是浏览器层面的兜底，策略之外的脚本不会执行。

```python
# ✅ Cookie 三件套：HttpOnly / Secure / SameSite
resp = make_response("登录成功")
resp.set_cookie(
    "session_id", sid,
    httponly=True,    # JS 无法通过 document.cookie 读取
    secure=True,      # 仅 HTTPS 传输
    samesite="Lax",   # 同时缓解 CSRF，见下节
)

# ✅ 通过响应头声明 CSP
@app.after_request
def set_security_headers(response):
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self'; "
        "object-src 'none'; frame-ancestors 'none'"
    )
    return response
```

::: tip CSP 的定位
`script-src 'self'` 禁止外站与内联脚本执行。CSP 是纵深防御的最后一层，**不能替代转义**，但能显著压缩漏洞的实际破坏面。
:::

## CSRF：利用浏览器自动携带的凭证

**成因**：CSRF 利用的不是代码缺陷，而是浏览器的既定行为——**跨站发起的请求会自动携带目标站点的 Cookie**。用户在站点 A 保持登录时被诱导访问恶意页面，该页面悄悄向 A 发起写操作，服务器看到的是"携带合法会话的请求"。

::: danger 教学警示：以下为漏洞模式，禁止照搬
下面展示"写操作仅依赖 Cookie 鉴权、无任何来源校验"这一**漏洞模式**——它默认了"带 Cookie 的请求都是用户本意"。
:::

```python
# ❌ 漏洞代码：仅凭会话 Cookie 就执行转账
@app.route("/transfer", methods=["POST"])
def transfer_vulnerable():
    if "session_id" not in request.cookies:
        return "未登录", 401
    do_transfer(request.form["to"], amount=request.form["amount"])
    return "转账成功"
```

**防护**：SameSite Cookie 与 CSRF Token 两道防线叠加。

```python
# ✅ 防护 1：Cookie 设置 SameSite，跨站请求不携带凭证
# Lax：跨站 POST 不带 Cookie；Strict：跨站一律不带（更严格，体验有代价）
resp.set_cookie("session_id", sid, httponly=True, secure=True, samesite="Lax")

# ✅ 防护 2：服务端校验 CSRF Token（表单隐藏字段 + 会话留存比对）
import secrets

def get_csrf_token() -> str:
    if "_csrf" not in session:
        session["_csrf"] = secrets.token_hex(32)
    return session["_csrf"]

@app.route("/transfer", methods=["POST"])
def transfer_safe():
    token = request.form.get("csrf_token", "")
    # 恒定时间比较，防止逐字节探测（见姊妹篇"恒定时间比较"）
    if not secrets.compare_digest(token, session.get("_csrf", "")):
        return "请求无效", 403

    do_transfer(request.form["to"], amount=request.form["amount"])
    return "转账成功"
```

::: warning 三条配套纪律
1. 所有写操作用 POST/PUT/DELETE，不要用 GET 改状态——GET 会被链接、图片、预取触发。
2. Token 与会话绑定，一次会话一份；纯 API（Token 放 Authorization 头）风险较低，但仍应校验 `Origin` 头。
:::

Django 用户可直接使用框架内置 CSRF 中间件与模板标签，原理与本节一致。

## SSRF：让服务器替你发请求

**成因**：SSRF 出现在"服务器根据用户输入发起 HTTP 请求"的场景：导入远程图片、调用 Webhook、预览链接等。攻击者把 URL 换成内网或云元数据地址，让**拥有内网身份的服务器**替他访问从外部够不到的目标。攻击面不在页面，而在服务器"身后"的内网。

::: danger 教学警示：以下为漏洞模式，禁止照搬
下面展示"用户输入未经任何限制就被服务器请求"这一**漏洞模式**。修复思路是白名单 + 出网校验，这里不展开任何内网探测手法。
:::

```python
# ❌ 漏洞代码：服务器按用户给定的 URL 发起请求
@app.route("/import-avatar", methods=["POST"])
def import_avatar_vulnerable():
    url = request.json["url"]
    # 用户完全控制了服务器即将访问的目标
    resp = httpx.get(url, timeout=5.0)
    return {"size": len(resp.content)}
```

**防护**：协议与目标双白名单，并拒绝解析到内网的地址。

```python
import ipaddress
import socket
from urllib.parse import urlparse

ALLOWED_HOSTS = {"static.partner-example.com"}   # 只允许拉取已知第三方源

def assert_safe_url(url: str) -> None:
    """校验失败直接抛异常，请求终止。"""
    parsed = urlparse(url)

    # 1) 协议白名单：只允许 HTTPS
    if parsed.scheme != "https":
        raise ValueError("仅允许 HTTPS 协议")

    # 2) 目标域名白名单
    if parsed.hostname not in ALLOWED_HOSTS:
        raise ValueError("目标不在允许列表内")

    # 3) 解析结果不得指向内网/回环/链路本地地址
    for _, _, _, _, sockaddr in socket.getaddrinfo(parsed.hostname, None):
        ip = ipaddress.ip_address(sockaddr[0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved:
            raise ValueError("目标地址不允许")

@app.route("/import-avatar", methods=["POST"])
def import_avatar_safe():
    url = request.json["url"]
    assert_safe_url(url)
    # 4) 禁止自动重定向，或对每一跳重新校验
    resp = httpx.get(url, timeout=5.0, follow_redirects=False)
    return {"size": len(resp.content)}
```

::: warning 两个容易漏掉的点
1. **重定向会绕过校验**：第一跳合法不等于第二跳合法，必须禁用自动重定向或逐跳校验。
2. **校验与请求之间 DNS 可能变化**。高安全要求场景应在连接层固定已校验的 IP，而不是只校验一次域名。
:::

## 路径穿越：逃出数据目录

**成因**：用户输入被用作文件路径的一部分时，路径分隔符与相对路径片段可以让最终路径逃出预定数据目录，读取或覆盖目录之外的文件——同时是信息泄露与写文件类漏洞的入口。

::: danger 教学警示：以下为漏洞模式，禁止照搬
下面展示"路径未收敛就拼接文件名"这一**漏洞模式**。修复核心只有一个词：包含（containment）。
:::

```python
# ❌ 漏洞代码：用户输入直接参与路径拼接
@app.route("/files/<filename>")
def download_vulnerable(filename):
    base = Path("/var/app/user_files")
    # filename 中的相对路径片段会把最终路径带出 base 之外
    target = base / filename
    return FileResponse(target)
```

**防护**：resolve 解析出真实路径后，校验仍在基准目录之内。

```python
# ✅ 防护代码：resolve + 包含性校验
from pathlib import Path

BASE_DIR = Path("/var/app/user_files").resolve()

@app.route("/files/<filename>")
def download_safe(filename):
    # 1) 白名单优先：文件名只允许安全形式
    if not filename or "/" in filename or "\\" in filename or ".." in filename:
        return "非法文件名", 400

    target = (BASE_DIR / filename).resolve()
    # 2) 包含性校验：resolve 后仍必须在基准目录内
    if not target.is_relative_to(BASE_DIR):   # Python 3.9+
        return "非法路径", 400
    if not target.is_file():
        return "文件不存在", 404

    return FileResponse(target)
```

::: tip 为什么必须先 resolve
`base / filename` 只是字符串层面的拼接结果；只有 `resolve()` 解析掉相对路径片段与符号链接之后，得到的才是文件系统真正会访问的路径，包含性校验才有意义。
:::

## 常见陷阱

| 陷阱 | 后果 | 正确做法 |
|---|---|---|
| 用 f-string/% 拼接 SQL（含 ORM 项目里的原生 SQL） | 输入改变语句语义，认证与数据防线失效 | 一律参数化查询；语法元素用白名单 |
| 模板用 `\|safe` / `mark_safe` 包用户内容 | 关闭自动转义，XSS 直达浏览器 | 只对服务端可信内容使用 |
| Cookie 不设 HttpOnly/Secure/SameSite | 脚本可读会话、明文传输、跨站携带 | set_cookie 三件套默认全开 |
| 请求用户给的 URL 不做白名单 | SSRF 打穿内网边界 | 协议/域名白名单 + 拒绝内网 IP + 控制重定向 |
| 拼接路径不做 resolve 校验 | 路径穿越读写任意文件 | resolve + `is_relative_to` 包含性校验 |

## 最佳实践

1. **把"不可信输入"标注出来**：评审时先问三个问题——值从哪来？将进入什么上下文（SQL/HTML/URL/路径）？进入前经过了什么处理？
2. **默认走框架的安全路径**：自动转义、参数化、CSRF 中间件默认全开，任何关闭动作都要在评审中被追问。
3. **白名单思维贯穿始终**：允许的协议、域名、文件名字符集、排序字段，全部显式列出。
4. **纵深防御**：转义 + HttpOnly + CSP 三层叠加，目标是"另一层失效时不至于全盘崩溃"。
5. **维护一份最小化安全评审清单**（本文五类漏洞即五个条目），合入前逐条过一遍。

## 版本说明

- **Python 3.9+**：`pathlib.Path.is_relative_to` 可用，路径包含性校验建议直接使用。
- **Flask / Jinja2 / markupsafe**：模板默认自动转义，`escape` 为通用转义工具；本文以 Flask 风格书写，Django 均有等价内置方案。
- **httpx**：SSRF 示例以 httpx 风格书写，参数名以所用库官方文档为准；OWASP Top 10 以 2021 版为参照。

## 延伸阅读

- → [密码存储与认证安全](02-密码存储与认证安全) —— 认证侧安全：弱哈希、JWT 陷阱与登录防爆破
- → [依赖与运行时安全](03-依赖与运行时安全) —— 把防线延伸到依赖、配置与运行环境
- → [Django 表单认证与生产部署](../02-Django表单认证与生产部署) —— Django 内置 CSRF 防护、ORM 参数化与认证体系
- → [Flask 入门指南](../03-Flask/01-flask入门指南) —— 本文防护代码所用 Flask 写法的基础；OWASP Top 10 中文版见 <https://owasp.org/Top10/zh_CN/>

> 🧭 工程化工具链与 Python 版本演进速览统一维护在 [导航总览 · 工程化工具链演进速览](/docs/python/02-基础与入门/00-导航总览#六工程化工具链演进速览)。
