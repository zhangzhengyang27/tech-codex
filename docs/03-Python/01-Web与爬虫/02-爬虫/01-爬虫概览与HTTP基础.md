---
title: 01-爬虫概览与HTTP基础
version: 3.0
author: 文档维护组
created: 2026-02-23
updated: 2026-08-12
status: 正式
order: 1
category: Python

---

# 01 爬虫概览与 HTTP 基础

网络爬虫是 Python 生态中最具实战价值的应用方向之一。本章将爬虫的全景概念与 HTTP 协议基础合并讲解 —— 因为每一个爬虫动作本质上都是一次 HTTP 请求与响应的交互：理解 HTTP 是编写爬虫的前提，而理解爬虫工作原理才能把 HTTP 知识真正落地。

::: tip 阅读建议
本章是爬虫专题的入口篇，建议按顺序通读。如果你已有 HTTP 基础，可跳过 2.1-2.3 节直接进入爬虫基本原理部分，但仍建议浏览 Mermaid 图表以建立整体框架。
:::

---

## 一、爬虫基本概念

### 1.1 什么是网络爬虫

网络爬虫（Web Crawler），也叫网络蜘蛛（Web Spider），是一种按照特定规则自动抓取万维网信息的程序或脚本。如果把互联网比作一张大网，爬虫便是在网上爬行的蜘蛛 —— 网页是节点，超链接是节点间的连线，爬虫从一个节点出发，顺着连线不断爬行，将整张网的数据抓取下来。

爬虫包含四个核心环节：

1. **获取网页**：向服务器发送 HTTP 请求，获取网页源代码
2. **提取信息**：从源代码中解析并提取目标数据
3. **保存数据**：将提取的数据持久化到文件或数据库
4. **自动化运行**：异常处理、错误重试、调度管理，确保持续高效运行

```mermaid
flowchart TD
    A[种子 URL 队列] --> B[调度器选取 URL]
    B --> C[发送 HTTP 请求]
    C --> D{响应状态码}
    D -- 200 OK --> E[下载页面内容]
    D -- 301/302 --> F[跟随重定向]
    F --> C
    D -- 403/封禁 --> G[反爬应对策略]
    G --> C
    D -- 404 --> H[记录并跳过]
    D -- 5xx --> I[重试 / 退避]
    I --> C
    E --> J[解析页面内容]
    J --> K[提取目标数据]
    J --> L[发现新 URL]
    L --> M{URL 去重}
    M -- 未抓取过 --> A
    M -- 已抓取过 --> N[跳过]
    K --> O[数据清洗与格式化]
    O --> P[持久化存储]

```

爬虫工作流程可概括为六步循环：**种子URL -> 发送请求 -> 获取响应 -> 解析内容 -> 数据存储 -> 发现新URL（去重后回到起点）**，直至满足终止条件。

### 1.2 为什么需要爬虫

| 场景 | 说明 | 典型案例 |
|------|------|---------|
| 搜索引擎索引 | 自动发现并索引全网页面 | Googlebot、Baiduspider |
| 数据采集 | 从公开网站批量获取结构化数据 | 商品比价、招聘信息聚合 |
| 舆情监控 | 实时追踪特定话题的网络讨论 | 社交媒体舆情分析 |
| 竞品分析 | 监控竞争对手的产品与定价变化 | 电商价格追踪 |
| 学术研究 | 大规模采集语料与实验数据 | NLP 训练语料收集 |
| 自动化测试 | 模拟用户操作验证页面功能 | Selenium E2E 测试 |

根本原因在于：人工收集数据效率极低，爬虫可以 7x24 小时自动化运行，且在数据量巨大时只有程序化方式才能在合理时间内完成。

### 1.3 爬虫分类

根据爬取策略和目的，爬虫可分为以下几类：

```mermaid
flowchart TD
    Root[网络爬虫] --> General[通用爬虫]
    Root --> Focused[聚焦爬虫]
    Root --> Incremental[增量爬虫]
    Root --> Deep[深层爬虫]

    General --> G1[爬取范围广、数量大]
    General --> G2[主要用于搜索引擎]
    General --> G3[如 Googlebot、Baiduspider]

    Focused --> F1[只爬取特定主题页面]
    Focused --> F2[按预设规则筛选]
    Focused --> F3[节省带宽和存储]

    Incremental --> I1[只爬取新增/更新内容]
    Incremental --> I2[通过时间戳/哈希判断]
    Incremental --> I3[避免重复爬取]

    Deep --> D1[爬取深层网页]
    Deep --> D2[需要表单提交/登录]
    Deep --> D3[搜索引擎无法索引]

```

| 类型 | 爬取范围 | URL 筛选机制 | 适用场景 | 典型工具 |
|------|----------|-------------|----------|----------|
| 通用爬虫 | 全网或大范围 | 广度优先策略 | 搜索引擎索引 | Nutch, Heritrix |
| 聚焦爬虫 | 按主题筛选 | 链接与内容相关性分析 | 垂直领域数据采集 | Scrapy + 自定义规则 |
| 增量爬虫 | 仅更新部分 | 时间戳 / ETag / 内容哈希 | 新闻监控、价格追踪 | 自定义时间判断逻辑 |
| 深层爬虫 | 暗网/登录后页面 | 表单提交、模拟登录 | 学术数据库、企业内网 | Selenium + Session |

### 1.4 静态爬虫 vs 动态爬虫

| 维度 | 静态爬虫 | 动态爬虫 |
|------|---------|---------|
| **原理** | 直接请求 HTML 源码 | 驱动浏览器渲染页面 |
| **工具** | requests + BeautifulSoup | Selenium / Playwright |
| **速度** | 快（毫秒级） | 慢（秒级，需启动浏览器） |
| **资源占用** | 低 | 高（浏览器进程） |
| **适用页面** | 服务端渲染（SSR）页面 | 客户端渲染（SPA）页面 |
| **数据获取** | HTML 源码中直接提取 | 需等待 JS 执行后提取 |
| **反爬难度** | 较易被检测 | 较难被检测 |
| **推荐优先级** | 优先尝试 | 静态方案不可行时使用 |

::: tip 核心原则
始终先尝试静态方式（requests + 解析库），因为效率高、资源消耗低。优先级：**requests > Ajax 接口 > Playwright > Selenium**。只有当静态方式无法获取数据时，才考虑动态方式。
:::

---

## 二、HTTP 协议基础

### 2.1 HTTP 是什么

HTTP（HyperText Transfer Protocol，超文本传输协议）是互联网上应用最广泛的网络协议，是爬虫与服务器之间通信的基础。理解 HTTP 是编写爬虫的前提——每一个爬虫动作本质上都是一次 HTTP 请求与响应的交互。

理解 HTTP 对爬虫至关重要，因为：

- **请求构造**：你需要知道如何构造正确的请求（方法、Header、Body）
- **响应解读**：状态码和 Header 告诉你请求是否成功、是否需要重试
- **反爬对抗**：许多反爬机制基于 HTTP 特征检测（User-Agent、Cookie、Referer）
- **接口逆向**：动态页面的数据接口本质上是 HTTP API

### 2.2 HTTP 请求/响应模型

HTTP 采用严格的 **请求-响应** 模型：客户端发送请求，服务器处理并返回响应。

```mermaid
sequenceDiagram
    participant C as 爬虫客户端
    participant DNS as DNS 服务器
    participant S as 目标服务器

    C->>DNS: 1. DNS 解析：查询域名 IP 地址
    DNS-->>C: 2. 返回 IP 地址
    C->>S: 3. TCP 三次握手 → 建立连接
    C->>S: 4. TLS 握手（HTTPS）
    C->>S: 5. 发送 HTTP 请求报文
    Note right of C: GET /api/data HTTP/1.1<br/>Host: example.com<br/>User-Agent: Mozilla/5.0<br/>Cookie: session=abc123

    S-->>C: 6. 返回 HTTP 响应报文
    Note left of S: HTTP/1.1 200 OK<br/>Content-Type: text/html<br/>Set-Cookie: token=xyz<br/>&lt;html&gt;...&lt;/html&gt;

    C->>C: 7. 解析响应内容
    C->>C: 8. 提取数据 + 发现新 URL
    C->>S: 9. 发送下一个请求...
```

整个流程从 DNS 解析开始，经过 TCP 三次握手和 TLS 握手（HTTPS 场景），然后进入 HTTP 请求/响应环节。

### 2.3 HTTP vs HTTPS

**HTTP** 是明文传输协议，数据在网络上以原始形式传输。**HTTPS**（HTTP over SSL/TLS）在 HTTP 层下加入了 SSL/TLS 加密层，具有两个核心作用：

1. **建立信息安全通道**：保证数据传输安全，防止中间人攻击
2. **确认网站真实性**：通过 CA 证书验证网站身份

```mermaid
flowchart LR
    subgraph HTTP_["HTTP — 明文传输"]
        A1[客户端] -->|"明文传输<br/>不安全"| A2[服务器]
    end
    subgraph HTTPS_["HTTPS — SSL/TLS 加密"]
        B1[客户端] -->|"SSL/TLS 加密<br/>安全传输"| B2[服务器]
    end

```

HTTP 协议版本对比：

| 特性 | HTTP/1.1 | HTTP/2 | HTTP/3 |
|------|----------|--------|--------|
| **传输层** | TCP | TCP | UDP (QUIC) |
| **连接方式** | 持久连接/管道化 | 多路复用 | 多路复用 + QUIC |
| **头部压缩** | 无 | HPACK | QPACK |
| **队头阻塞** | 存在 | 存在（TCP 层） | 无（QUIC 解决） |
| **爬虫影响** | 基础方式，兼容性最好 | httpx 支持，效率更高 | 较新，部分库尚未支持 |

::: warning 注意
某些网站虽然使用了 HTTPS 但仍被浏览器提示不安全（如使用自签名证书），爬取这类站点时需要在 requests 中设置 `verify=False` 忽略证书验证，否则会报 SSL 错误。但生产环境不建议全局忽略证书验证。
:::

### 2.4 URI 和 URL

URI（Uniform Resource Identifier，统一资源标识符）是标识互联网资源的字符串。URL（Uniform Resource Locator）是 URI 的子集，不仅标识资源，还指明了如何定位它。

```mermaid
flowchart TB
    URI_["URI — 统一资源标识符"]
    URL_["URL — 统一资源定位符<br/>如: https://github.com/favicon.ico"]
    URN_["URN — 统一资源名称<br/>如: urn:isbn:0451450523"]

    URI_ --> URL_
    URI_ --> URN_

```

在目前的互联网中，URN 使用较少，几乎所有的 URI 都是 URL。URL 标准格式如下：

```
scheme://host:port/path?query#fragment
```

| 组成部分 | 说明 | 示例 |
|----------|------|------|
| scheme | 协议类型 | `https` |
| host | 主机名/IP | `www.example.com` |
| port | 端口号（可省略，默认 80/443） | `443` |
| path | 资源路径 | `/api/users` |
| query | 查询参数（`?` 开始，`&` 分隔） | `?page=1&size=10` |
| fragment | 页面内锚点（`#` 开始，不发送到服务器） | `#section2` |

#### URL 编码

URL 只允许 ASCII 字符。非 ASCII 字符（如中文）和特殊字符需要经过百分号编码（Percent-Encoding）才能传输。Python 中可使用 `urllib.parse` 模块处理：

```python
from urllib.parse import quote, unquote, urlencode

# 编码中文
encoded = quote('爬虫')  # '%E7%88%AC%E8%99%AB'
decoded = unquote(encoded)  # '爬虫'

# 编码查询参数
params = {'q': 'Python爬虫', 'page': 1}
query_string = urlencode(params)  # 'q=Python%E7%88%AC%E8%99%AB&page=1'
```

::: tip 爬虫实践
在构造请求 URL 时，始终确保参数经过正确编码。requests 库的 `params` 参数会自动进行 URL 编码，无需手动调用 `urlencode`。
:::

### 2.5 请求方法

HTTP 定义了多种请求方法，爬虫中最常用的是 GET 和 POST：

| 特性 | GET | POST | PUT | DELETE |
|------|-----|------|-----|--------|
| **语义** | 获取资源 | 创建/提交数据 | 更新/替换资源 | 删除资源 |
| **幂等性** | 是 | 否 | 是 | 是 |
| **参数位置** | URL 查询字符串 `?key=val` | 请求体 Body | 请求体 Body | URL 路径 |
| **数据量限制** | URL 长度受限（约 2KB-8KB） | 无限制 | 无限制 | 无限制 |
| **缓存** | 可被浏览器缓存 | 默认不缓存 | 默认不缓存 | 不缓存 |
| **爬虫频率** | 极高（页面访问、API 查询） | 高（登录、表单提交） | 低 | 极低 |

其他方法：HEAD（只返回响应头）、OPTIONS（查询支持的方法）、PATCH（部分修改）。

### 2.6 状态码

服务器返回的状态码是判断请求结果的第一个信号。状态码按首位数字分为五类：

| 类别 | 范围 | 含义 | 爬虫常见状态码 |
|------|------|------|---------------|
| 1xx | 100-199 | 信息性响应 | 100 Continue |
| 2xx | 200-299 | 成功 | **200 OK**、201 Created、204 No Content |
| 3xx | 300-399 | 重定向 | **301 永久重定向**、**302 临时重定向**、304 Not Modified |
| 4xx | 400-499 | 客户端错误 | **403 Forbidden**、**404 Not Found**、429 Too Many Requests |
| 5xx | 500-599 | 服务器错误 | **500 Internal Server Error**、502 Bad Gateway、503 Service Unavailable |

常见状态码的爬虫处理策略：

| 状态码 | 说明 | 爬虫处理策略 |
|--------|------|--------------|
| 200 | 成功 | 正常解析响应体 |
| 301 | 永久重定向 | 更新 URL，使用新地址 |
| 302 | 临时重定向 | 跟随重定向，注意 Cookie 保持 |
| 304 | 未修改 | 使用缓存数据 |
| 400 | 错误请求 | 检查请求参数格式 |
| 401 | 未授权 | 需要登录或添加认证信息 |
| 403 | 禁止访问 | 可能被反爬，检查 UA/Cookie/频率 |
| 404 | 未找到 | URL 无效，跳过 |
| 429 | 请求过多 | 降低频率，使用代理 |
| 500/502/503 | 服务器错误/不可用 | 可重试，间隔递增 |

::: tip 最佳实践
不要用 `response.status_code == 200` 判断成功，使用 `response.ok`（涵盖所有 2xx）或 `response.raise_for_status()`（非 2xx 抛出异常）。
:::

### 2.7 HTTP Headers

Headers 是 HTTP 请求和响应中传递的元数据，爬虫中最需要关注的：

| Header | 方向 | 说明 | 爬虫用途 |
|--------|------|------|---------|
| User-Agent | 请求 | 客户端浏览器标识 | 模拟浏览器，避免被识别为爬虫（**极高重要**） |
| Cookie | 请求 | 客户端存储的会话信息 | 维持登录状态（**极高重要**） |
| Referer | 请求 | 请求来源页面 URL | 模拟站内跳转，绕过防盗链 |
| Content-Type | 请求/响应 | 内容类型（MIME） | 判断响应格式，选择解析方式；POST 时必须正确设置 |
| Accept | 请求 | 客户端可接受的响应类型 | 模拟浏览器行为 |
| Authorization | 请求 | 认证凭据 | 访问需要 Token 认证的 API |
| Set-Cookie | 响应 | 服务器设置 Cookie | 提取并保存会话信息 |
| Location | 响应 | 重定向目标 URL | 处理 301/302 重定向 |
| Last-Modified | 响应 | 资源最后修改时间 | 增量爬取判断 |

#### Content-Type 与 POST 数据提交方式

| Content-Type | 提交方式 | 典型场景 |
|--------------|----------|----------|
| `application/x-www-form-urlencoded` | 表单数据 | 登录表单、搜索提交 |
| `multipart/form-data` | 表单文件上传 | 上传图片、文件 |
| `application/json` | JSON 数据 | API 接口调用 |
| `text/xml` | XML 数据 | SOAP Web Service |

::: warning 注意
在爬虫中构造 POST 请求时，必须使用正确的 Content-Type，否则服务器可能无法正确解析请求数据，导致 400 或 415 错误。
:::

---

## 三、Web 网页基础

### 3.1 网页的组成

网页由三大部分组成：如果把网页比作一个人，HTML 是骨架，CSS 是皮肤和衣着，JavaScript 是肌肉和神经。

```mermaid
flowchart TB
    subgraph WebPage["网页三大组成部分"]
        direction TB
        HTML["HTML<br/>骨架 — 结构<br/>定义内容和语义"]
        CSS["CSS<br/>皮肤 — 样式<br/>定义布局和外观"]
        JS["JavaScript<br/>肌肉 — 行为<br/>定义交互和动态效果"]
    end

    HTML --> |"引入"| CSS
    HTML --> |"引入"| JS
    HTML --> |"构成"| Page["完整网页"]
    CSS --> |"美化"| Page
    JS --> |"驱动"| Page

```

#### HTML —— 骨架

HTML（超文本标记语言）描述网页的结构和内容。常见标签：

| 标签 | 用途 | 示例 |
|------|------|------|
| `<div>` | 区块容器 | `<div id="main">...</div>` |
| `<p>` | 段落 | `<p class="text">内容</p>` |
| `<a>` | 超链接 | `<a href="url">链接文字</a>` |
| `<img>` | 图片 | `<img src="pic.jpg" alt="描述">` |
| `<h1>`~`<h6>` | 标题 | `<h2 class="title">标题</h2>` |
| `<ul>`/`<ol>` | 列表 | `<ul><li>项目</li></ul>` |
| `<table>` | 表格 | `<table><tr><td>数据</td></tr></table>` |
| `<form>` | 表单 | `<form action="/submit">...</form>` |
| `<input>` | 输入控件 | `<input type="text" name="q">` |

HTML 文档的标准结构：

```html
<!DOCTYPE html>                    <!-- 文档类型声明：HTML5 -->
<html lang="zh-CN">                <!-- 根元素 -->
<head>                             <!-- 头部：配置和引用 -->
    <meta charset="UTF-8">         <!-- 字符编码 -->
    <title>页面标题</title>         <!-- 网页标题 -->
    <link rel="stylesheet" href="style.css">  <!-- 引入外部 CSS -->
    <script src="app.js"></script>             <!-- 引入外部 JS -->
</head>
<body>                             <!-- 主体：显示的内容 -->
    <div id="container">
        <div class="wrapper">
            <h2 class="title">Hello World</h2>
            <p class="text">Hello, this is a paragraph.</p>
        </div>
    </div>
</body>
</html>
```

#### CSS —— 皮肤

CSS（层叠样式表）定义网页的视觉呈现。"层叠"指当多个样式规则冲突时，浏览器按优先级处理（行内样式 > 内部样式表 > 外部样式表）。

CSS 在爬虫中的核心价值是**选择器**——它提供了定位 HTML 元素的语法规则，也是 BeautifulSoup 和 pyquery 等解析库的核心机制。

#### JavaScript —— 肌肉

JavaScript 赋予网页交互能力。**对于爬虫而言，JavaScript 是最大的挑战**：许多现代网站的内容由 JS 动态生成，使用 requests 获取的 HTML 可能是空壳，必须用 Playwright/Selenium 模拟浏览器或分析 Ajax 接口才能获取真实数据。

### 3.2 DOM 树结构

DOM（Document Object Model，文档对象模型）是 W3C 标准，定义了访问和操作 HTML/XML 文档的接口。HTML 文档中的所有内容都是节点，构成一棵树：

```mermaid
flowchart TB
    Doc["Document<br/>文档节点"] --> Html_["html<br/>根元素节点"]
    Html_ --> Head_["head"]
    Html_ --> Body_["body"]
    Head_ --> Meta_["meta<br/>属性节点: charset=UTF-8"]
    Head_ --> Title_["title<br/>文本节点: This is a Demo"]
    Body_ --> Div1["div#container"]
    Div1 --> Div2["div.wrapper"]
    Div2 --> H2_["h2.title<br/>文本节点: Hello World"]
    Div2 --> P_["p.text<br/>文本节点: Hello, this is a paragraph."]

```

理解 DOM 树对爬虫至关重要：BeautifulSoup、lxml 等解析库都是基于 DOM 树模型工作的。节点间的关系（父子、兄弟、祖先、后代）直接影响选择器的写法。

### 3.3 CSS 选择器与 XPath

选择器是爬虫数据提取的核心技能。两种主流方案：

#### CSS 选择器常用类型

| 选择器 | 语法 | 示例 | 含义 | 使用频率 |
|--------|------|------|------|----------|
| ID 选择器 | `#id` | `#container` | id 为 container 的元素 | 高 |
| 类选择器 | `.class` | `.wrapper` | class 为 wrapper 的元素 | 极高 |
| 标签选择器 | `element` | `p` | 所有 p 元素 | 高 |
| 后代选择器 | `A B` | `div p` | div 内所有 p 元素 | 极高 |
| 子选择器 | `A > B` | `div > p` | div 直接子元素中的 p | 中 |
| 属性选择器 | `[attr=val]` | `[type="text"]` | type 为 text 的元素 | 高 |
| 伪类选择器 | `:nth-child(n)` | `tr:nth-child(2)` | 第 2 个 tr 子元素 | 中 |

#### CSS 选择器 vs XPath

| 特性 | CSS 选择器 | XPath |
|------|-----------|-------|
| **语法简洁度** | 简洁直观 | 相对复杂 |
| **方向性** | 只能从父到子 | 支持向上查找父节点 |
| **文本匹配** | 不支持直接文本匹配 | 支持 `contains(text(), 'xxx')` |
| **Python 库** | BeautifulSoup, pyquery | lxml, Scrapy |
| **推荐场景** | 简单页面结构 | 复杂结构、需要文本匹配 |

```python
# CSS 选择器示例（BeautifulSoup）
from bs4 import BeautifulSoup

soup = BeautifulSoup(html, 'lxml')
title = soup.select_one('h2.title')          # 标签.类名
container = soup.select_one('#container')     # ID 选择器
items = soup.select('ul.list li')            # 后代选择器
all_divs = soup.find_all('div')              # find_all 方法

# XPath 示例（lxml）
from lxml import etree

tree = etree.HTML(html)
title = tree.xpath('//title/text()')                         # 基本路径
h2 = tree.xpath('//h2[@class="title"]/text()')               # 属性选择
link = tree.xpath('//a[@class="link"]/@href')                # 获取属性值
para = tree.xpath('//p[contains(text(), "paragraph")]')      # 文本匹配（CSS 做不到）
```

---

## 四、爬虫基本原理

### 4.1 核心工作流程

爬虫从初始 URL 出发，不断发现新链接、抓取页面、提取数据，直到满足终止条件。其完整工作流程如下：

```mermaid
flowchart TD
    A[初始 URL 种子] --> B[URL 调度器]
    B --> C{URL 队列<br/>是否为空?}
    C -- 否 --> D[取出 URL]
    D --> E[DNS 解析]
    E --> F[发起 HTTP 请求]
    F --> G{响应状态}
    G -- 200 OK --> H[解析页面内容]
    G -- 3xx 重定向 --> I[跟随重定向]
    I --> F
    G -- 4xx/5xx 错误 --> J[错误处理/重试]
    J --> B

    H --> K[提取目标数据]
    H --> L[提取新 URL]
    K --> M[数据清洗]
    M --> N[数据存储]
    L --> O[URL 去重<br/>布隆过滤器/集合]
    O --> B

    C -- 是 --> P[爬取完成]

```

### 4.2 爬取策略

当存在大量待爬取 URL 时，需要策略来决定爬取顺序：

| 策略 | 原理 | 数据结构 | 优点 | 缺点 | 适用场景 |
|------|------|----------|------|------|----------|
| **广度优先 (BFS)** | 先爬取同层页面再深入 | 队列 (Queue) | 覆盖面广、实现简单 | 需要较大内存 | 通用爬虫、搜索引擎 |
| **深度优先 (DFS)** | 沿一条路径深入到底 | 栈 (Stack) | 内存占用小 | 可能陷入深层链接 | 目标在深层页面时 |
| **优先级队列** | 按重要性排序爬取 | 优先队列 (heapq) | 重要页面优先 | 需要设计评分函数 | 聚焦爬虫、垂直采集 |

```python
from collections import deque
import heapq

# ===== 广度优先 (BFS) 调度器 =====
class BFSScheduler:
    """使用队列实现广度优先爬取"""
    def __init__(self):
        self.queue: deque[str] = deque()
        self.visited: set[str] = set()

    def add_url(self, url: str) -> None:
        if url not in self.visited:
            self.queue.append(url)

    def next_url(self) -> str | None:
        if not self.queue:
            return None
        url = self.queue.popleft()
        self.visited.add(url)
        return url

# ===== 优先级队列调度器 =====
class PriorityScheduler:
    """使用优先队列，优先级高的先爬取"""
    def __init__(self):
        self.queue: list[tuple[int, str]] = []
        self.visited: set[str] = set()

    def add_url(self, url: str, priority: int = 1) -> None:
        if url not in self.visited:
            # heapq 是最小堆，取负值使高优先级先出
            heapq.heappush(self.queue, (-priority, url))

    def next_url(self) -> str | None:
        if not self.queue:
            return None
        _, url = heapq.heappop(self.queue)
        self.visited.add(url)
        return url
```

### 4.3 URL 去重机制

避免重复爬取是爬虫效率的关键：

| 方案 | 适用规模 | 内存占用 | 准确率 | 实现难度 |
|------|----------|----------|--------|----------|
| Python set | 万级以下 | 高 | 100% | 极低 |
| 数据库 UNIQUE 索引 | 百万级 | 中 | 100% | 低 |
| Redis Set | 千万级 | 中 | 100% | 低 |
| 布隆过滤器（Bloom Filter） | 亿级以上 | 极低 | 约 99%（可配置） | 中 |
| URL 规范化 + 哈希 | 不限 | 取决于方案 | 取决于方案 | 取决于方案 |

对于大多数爬虫项目，使用 Python 的 `set` 集合或 Redis Set 即可满足需求。

### 4.4 可抓取的数据类型

只要是基于 HTTP/HTTPS 协议、在浏览器中可以访问到的数据，爬虫都可以抓取：

| 数据类型 | 格式 | 抓取方式 | 提取难度 |
|----------|------|----------|----------|
| HTML 网页 | HTML | requests 直接请求 | 中（需解析 HTML） |
| JSON 数据 | JSON | 请求 API 接口 | 低（直接 JSON 解析） |
| 图片 | JPEG/PNG/WebP | 请求二进制数据 | 低（直接保存） |
| 视频/音频 | MP4/MP3 | 请求二进制数据 | 低（直接保存） |
| CSS/JS 文件 | 文本 | 请求文本/二进制 | 低 |
| PDF 文档 | PDF | 请求二进制数据 | 中（需 PDF 解析库） |

---

## 五、会话与 Cookie 机制

### 5.1 无状态 HTTP 与会话保持

HTTP 是**无状态**协议，每次请求都是独立的，服务器不会记录前后状态的变化。这意味着用户登录后，后续请求需要重新证明身份。

为了解决这个问题，出现了两种互补的技术：

- **Cookie**：存储在**客户端**的小段数据，每次请求自动携带
- **Session（会话）**：存储在**服务端**的用户会话信息

两者配合工作：客户端首次请求时，服务端创建 Session 并返回 Session ID（通过 Set-Cookie 响应头），客户端保存 Cookie 后，后续请求自动携带，服务端通过 Session ID 识别用户身份。

```mermaid
sequenceDiagram
    participant Client as 客户端（浏览器/爬虫）
    participant Server as 服务器

    Note over Client,Server: 第一次请求（未登录）
    Client->>Server: 1. GET /login<br/>（无 Cookie）
    Server-->>Client: 2. 200 OK<br/>返回登录页面

    Note over Client,Server: 提交登录表单
    Client->>Server: 3. POST /login<br/>username=admin&password=123
    Server->>Server: 4. 验证身份，创建 Session<br/>Session ID = abc123
    Server-->>Client: 5. 302 Redirect<br/>Set-Cookie: session_id=abc123

    Note over Client,Server: 后续请求（已登录）
    Client->>Server: 6. GET /dashboard<br/>Cookie: session_id=abc123
    Server->>Server: 7. 查找 Session abc123 ✓
    Server-->>Client: 8. 200 OK<br/>返回用户数据

    Note over Client,Server: Cookie 过期后
    Client->>Server: 9. GET /dashboard<br/>Cookie: session_id=abc123
    Server->>Server: 10. Session 已过期 ✗
    Server-->>Client: 11. 302 Redirect → 登录页
```

### 5.2 Cookie 的核心属性

| 属性 | 说明 | 爬虫注意事项 |
|------|------|--------------|
| Name / Value | Cookie 名称和值 | Value 中可能包含 Session ID |
| Max Age | 有效时间（秒），负数表示会话 Cookie | 判断 Cookie 是否需要刷新 |
| Expires | 过期时间（绝对时间） | 同 Max Age，优先级更低 |
| Domain / Path | 可访问该 Cookie 的域名和路径 | 跨域 Cookie 需注意 |
| HttpOnly | 是否只能通过 HTTP 头访问（JS 不可读） | 爬虫不受影响，始终通过 HTTP 头传递 |
| Secure | 是否仅通过 HTTPS 传输 | 爬取 HTTPS 站点时需注意 |
| SameSite | 跨站请求是否携带 | 爬虫跨站请求时需关注 |

### 5.3 Cookie vs Token (JWT) 认证

| 特性 | Cookie + Session | JWT Token |
|------|-----------------|-----------|
| **存储位置** | Cookie 在客户端，Session 在服务端 | 客户端（localStorage/Header） |
| **扩展性** | 差（分布式需共享 Session） | 好（无状态验证） |
| **爬虫使用** | 模拟登录获取 Cookie | 登录获取 Token，放入 Authorization 头 |
| **典型场景** | 传统 Web 登录 | API 认证、SPA、移动端 |

```python
import requests

# ===== 方式1：使用 Session 模拟登录（推荐） =====
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
                  'AppleWebKit/537.36 (KHTML, like Gecko) '
                  'Chrome/120.0.0.0 Safari/537.36',
})

# 发送登录请求，Session 自动保存 Set-Cookie
login_response = session.post(
    'https://example.com/login',
    data={'username': 'user', 'password': 'pass'},
    timeout=10
)

# 后续请求自动携带 Cookie
profile = session.get('https://example.com/profile', timeout=10)

# ===== 方式2：直接使用 Cookie 字符串 =====
cookie_str = 'session_id=abc123; token=xyz789'
cookies = dict(pair.split('=', 1) for pair in cookie_str.split('; '))
response = requests.get(
    'https://example.com/profile',
    cookies=cookies,
    timeout=10
)

# ===== 方式3：JWT Token 认证 =====
response = requests.get(
    'https://api.example.com/data',
    headers={'Authorization': 'Bearer eyJhbGciOi...'},
    timeout=10
)
```

::: tip Session 是爬虫最佳实践
使用 `requests.Session` 管理会话，它会自动保存服务器返回的 Set-Cookie，并在后续请求中自动携带。比手动管理 Cookie 更可靠、更简洁。
:::

---

## 六、代理基本原理

### 6.1 为什么需要代理

在爬虫过程中，服务器检测某个 IP 在单位时间内的请求次数，超过阈值就拒绝服务（封 IP）。代理（Proxy）就是网络信息的中转站：客户端不直接请求目标服务器，而是通过代理服务器转发请求，使目标服务器只能看到代理 IP，无法定位真实 IP。

```mermaid
sequenceDiagram
    participant Client as 客户端（爬虫）<br/>真实 IP: 192.168.1.100
    participant Proxy as 代理服务器<br/>IP: 10.0.0.1
    participant Target as 目标服务器

    Note over Client,Target: 不使用代理 → IP 被封
    Client->>Target: 1. 直接请求，来源 IP: 192.168.1.100
    Target-->>Client: 2. 返回响应
    Target->>Target: 3. 检测到高频请求 → 封禁 192.168.1.100 ✗

    Note over Client,Target: 使用代理 → 隐藏真实 IP
    Client->>Proxy: 4. 请求发送到代理
    Proxy->>Target: 5. 代理转发，来源 IP: 10.0.0.1
    Target-->>Proxy: 6. 返回响应（记录 IP: 10.0.0.1）
    Proxy-->>Client: 7. 转发响应
    Target->>Target: 8. 只看到代理 IP → 无法定位真实 IP ✓
```

### 6.2 代理类型分类

#### 按协议分类

| 类型 | 支持协议 | 端口 | 特点 | 爬虫推荐 |
|------|----------|------|------|----------|
| HTTP 代理 | 仅 HTTP | 80/8080 | 可解析/缓存 HTTP 内容 | 基础场景 |
| HTTPS 代理 | HTTP + HTTPS | 443 | CONNECT 隧道转发 | HTTPS 站点 |
| SOCKS4 代理 | TCP | 1080 | 不支持认证和 UDP | 较少使用 |
| SOCKS5 代理 | TCP + UDP | 1080 | 支持认证、域名解析，最通用 | **通用推荐** |

#### 按匿名程度分类

| 类型 | 隐藏真实 IP | 暴露代理身份 | 爬虫适用性 |
|------|------------|-------------|------------|
| 高度匿名代理 | 是 | 否 | **首选** |
| 普通匿名代理 | 是 | 是（HTTP_VIA 头） | 可用 |
| 透明代理 | 否 | 是 | 不适用（暴露 IP） |
| 间谍代理 | 否 | 是 | 避免（窃取数据） |

#### 免费代理 vs 付费代理

| 特性 | 免费代理 | 付费代理 |
|------|----------|----------|
| **可用率** | 1%-10% | 90%+ |
| **速度** | 慢且不稳定 | 快且稳定 |
| **安全性** | 无保障 | 有保障 |
| **适用场景** | 学习测试 | **生产环境（推荐）** |

### 6.3 代理使用示例

```python
import requests
import random

# ===== 基本代理使用 =====
proxies = {
    'http': 'http://10.10.10.10:8080',
    'https': 'http://10.10.10.10:8080',
}
response = requests.get('https://httpbin.org/ip', proxies=proxies, timeout=10)
print(f"代理 IP: {response.json()['origin']}")

# ===== 带认证的代理 =====
proxies_auth = {
    'http': 'http://user:password@10.10.10.10:8080',
    'https': 'http://user:password@10.10.10.10:8080',
}

# ===== 代理池随机切换 =====
proxy_pool = [
    'http://10.10.10.1:8080',
    'http://10.10.10.2:8080',
    'http://10.10.10.3:8080',
]

def get_random_proxy() -> dict[str, str]:
    proxy = random.choice(proxy_pool)
    return {'http': proxy, 'https': proxy}

def crawl_with_proxy_retry(url: str, max_retries: int = 3) -> str | None:
    """使用代理池爬取，失败自动切换代理重试"""
    for attempt in range(max_retries):
        try:
            proxy = get_random_proxy()
            response = requests.get(url, proxies=proxy, timeout=10)
            response.raise_for_status()
            return response.text
        except requests.RequestException:
            # 失败后换代理重试
            continue
    return None

# ===== 检测代理可用性 =====
def check_proxy(proxy_url: str, timeout: int = 5) -> bool:
    """检测代理是否可用"""
    proxies = {'http': proxy_url, 'https': proxy_url}
    try:
        response = requests.get(
            'https://httpbin.org/ip',
            proxies=proxies,
            timeout=timeout
        )
        return response.status_code == 200
    except requests.RequestException:
        return False
```

---

## 七、urllib 标准库完全教程

urllib 是 Python 标准库中处理 URL 的核心模块集合，无需安装即可使用。虽然第三方库 `requests` 更流行，但 urllib 是所有上层 HTTP 库的底层基础——理解 urllib 是理解 requests 工作原理的前提，也是在无法安装第三方库的环境中（如服务器、Docker 最小镜像）的唯一选择。

### 7.1 urllib 模块体系

urllib 由四个子模块组成，各司其职：

```mermaid
flowchart TB
    URLLIB["urllib 包"] --> REQUEST["urllib.request<br/>发起 HTTP 请求"]
    URLLIB --> ERROR["urllib.error<br/>异常处理"]
    URLLIB --> PARSE["urllib.parse<br/>URL 解析与编码"]
    URLLIB --> ROBOT["urllib.robotparser<br/>robots.txt 解析"]

```

| 子模块 | 核心类/函数 | 用途 |
|--------|------------|------|
| `urllib.request` | `urlopen()`, `Request`, `OpenerDirector` | 构造和发送 HTTP 请求 |
| `urllib.error` | `URLError`, `HTTPError` | 处理请求异常 |
| `urllib.parse` | `urlencode()`, `quote()`, `urlparse()` | URL 解析、编码、拼接 |
| `urllib.robotparser` | `RobotFileParser` | 解析 robots.txt |

### 7.2 发送 GET 请求

```python
from urllib.request import urlopen

# 最简单的 GET 请求
response = urlopen('https://www.example.com')
print(type(response))   # <class 'http.client.HTTPResponse'>

# 读取响应内容
html = response.read()              # 返回 bytes
html_str = html.decode('utf-8')     # 解码为字符串

# 查看响应信息
print(response.status)              # 200
print(response.getheaders())        # [('Content-Type', 'text/html'), ...]
print(response.getheader('Server')) # ECS (dcb/7F84)

# 始终记得关闭响应
response.close()

# 推荐使用 with 语句（自动关闭）
with urlopen('https://www.example.com') as response:
    html = response.read().decode('utf-8')
```

::: warning 编码问题
`response.read()` 返回的是 `bytes` 类型，必须用 `.decode()` 转为字符串。如果不确定编码，可以用 `chardet` 检测：
```python
import chardet
raw = response.read()
encoding = chardet.detect(raw)['encoding']  # 如 'utf-8', 'gbk'
html = raw.decode(encoding or 'utf-8')
```
:::

### 7.3 发送 POST 请求

POST 请求需要将参数编码为 bytes 后放入 `data` 参数：

```python
from urllib.request import Request, urlopen
from urllib.parse import urlencode

# 表单数据 POST
form_data = {
    'username': 'admin',
    'password': '123456',
}
# urlencode 将字典转为 application/x-www-form-urlencoded 格式
encoded_data = urlencode(form_data).encode('utf-8')  # bytes

with urlopen('https://example.com/login', data=encoded_data) as response:
    result = response.read().decode('utf-8')

# JSON 数据 POST
import json

json_data = json.dumps({'key': 'value'}).encode('utf-8')
req = Request(
    'https://api.example.com/data',
    data=json_data,
    headers={'Content-Type': 'application/json'},
)
with urlopen(req) as response:
    result = json.loads(response.read().decode('utf-8'))
```

### 7.4 Request 对象：自定义请求头

`urlopen()` 只能发送最简单的请求。需要添加 Headers、修改 Method 时，必须使用 `Request` 对象：

```python
from urllib.request import Request, urlopen

# 构造带自定义 Headers 的请求
req = Request(
    url='https://example.com/api/data',
    headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        'Accept': 'application/json',
        'Referer': 'https://example.com/',
    },
)

with urlopen(req) as response:
    data = response.read().decode('utf-8')
```

::: tip 爬虫关键点
**不设置 User-Agent 是新手最常见的错误。** urllib 默认的 UA 是 `Python-urllib/3.x`，绝大多数网站会直接拒绝这个 UA。因此爬虫中必须使用 `Request` 对象设置合法的 User-Agent。
:::

### 7.5 异常处理

urllib 的异常体系：

```mermaid
classDiagram
    class URLError {
        +reason: str
    }
    class HTTPError {
        +code: int
        +reason: str
        +headers: dict
    }
    URLError <|-- HTTPError
```

- **`URLError`**：网络层错误（DNS 解析失败、连接超时、拒绝连接等）
- **`HTTPError`**：HTTP 层错误（403、404、500 等），是 `URLError` 的子类

```python
from urllib.request import urlopen
from urllib.error import URLError, HTTPError

try:
    with urlopen('https://example.com/api', timeout=10) as response:
        data = response.read().decode('utf-8')
except HTTPError as e:
    # HTTP 错误（4xx / 5xx）
    print(f'HTTP 错误: {e.code} {e.reason}')
    if e.code == 403:
        print('可能被反爬拦截，检查 UA/Cookie')
    elif e.code == 404:
        print('URL 不存在，跳过')
except URLError as e:
    # 网络层错误
    print(f'网络错误: {e.reason}')
except Exception as e:
    print(f'其他异常: {e}')
```

::: danger 捕获顺序
`HTTPError` 必须在 `URLError` 之前捕获，因为 `HTTPError` 是 `URLError` 的子类。如果反过来，所有 HTTP 错误都会被 `URLError` 拦截，无法区分 403 和 DNS 解析失败。
:::

### 7.6 Opener 与 Handler：高级请求定制

urllib 通过 Handler + Opener 机制实现各种高级功能：

```mermaid
flowchart LR
    H1["ProxyHandler<br/>代理设置"] --> O["OpenerDirector<br/>自定义开启器"]
    H2["HTTPCookieProcessor<br/>Cookie 管理"] --> O
    H3["HTTPBasicAuthHandler<br/>认证处理"] --> O
    H4["HTTPRedirectHandler<br/>重定向控制"] --> O

    O -->|"urlopen()"| R["发送请求"]

```

**代理设置**：

```python
from urllib.request import ProxyHandler, build_opener, install_opener

# 配置代理
proxy_handler = ProxyHandler({
    'http': 'http://127.0.0.1:8888',
    'https': 'https://127.0.0.1:8888',
})
opener = build_opener(proxy_handler)

# 方式1：使用 opener 直接请求
response = opener.open('https://httpbin.org/ip')
print(response.read().decode('utf-8'))

# 方式2：安装为全局 opener（后续 urlopen 也会使用代理）
install_opener(opener)
response = urlopen('https://httpbin.org/ip')
```

**Cookie 管理**：

```python
from urllib.request import build_opener, HTTPCookieProcessor
from urllib.parse import urlencode
from http.cookiejar import CookieJar, MozillaCookieJar

# 内存 Cookie（不持久化）
cookie_jar = CookieJar()
cookie_handler = HTTPCookieProcessor(cookie_jar)
opener = build_opener(cookie_handler)

# 登录（Cookie 自动保存到 cookie_jar）
login_data = urlencode({'user': 'admin', 'pass': '123'}).encode('utf-8')
opener.open('https://example.com/login', data=login_data)

# 后续请求自动携带 Cookie
response = opener.open('https://example.com/dashboard')

# 文件 Cookie（持久化到磁盘）
file_cookie_jar = MozillaCookieJar('cookies.txt')
file_cookie_jar.save()   # 保存到文件
file_cookie_jar.load()   # 从文件加载
```

### 7.7 URL 解析与编码

`urllib.parse` 提供了完整的 URL 处理工具：

```python
from urllib.parse import urlparse, urlunparse, urlencode, quote, unquote

# === URL 解析 ===
result = urlparse('https://www.example.com:8080/path/page?q=python&page=1#section')
print(result)
# ParseResult(scheme='https', netloc='www.example.com:8080',
#             path='/path/page', params='', query='q=python&page=1', fragment='section')

print(result.scheme)    # 'https'
print(result.netloc)    # 'www.example.com:8080'
print(result.query)     # 'q=python&page=1'

# === URL 拼接 ===
components = ('https', 'www.example.com', '/api/data', '', 'key=value', '')
full_url = urlunparse(components)  # 'https://www.example.com/api/data?key=value'

# === URL 编码 ===
# 中文和特殊字符需要编码才能放入 URL
encoded = quote('Python爬虫')       # 'Python%E7%88%AC%E8%99%AB'
decoded = unquote(encoded)          # 'Python爬虫'

# === 查询参数编码 ===
params = {'q': 'Python爬虫', 'page': 1, 'lang': 'zh-CN'}
query_string = urlencode(params)    # 'q=Python%E7%88%AC%E8%99%AB&page=1&lang=zh-CN'
full_url = f'https://example.com/search?{query_string}'
```

### 7.8 urllib vs requests 对比

| 特性 | urllib | requests |
|------|--------|---------|
| 安装 | 标准库，无需安装 | `pip install requests` |
| 代码量 | 多（需手动编码、构建 Request） | 少（API 简洁直观） |
| Cookie 管理 | 需要 CookieJar + Handler | 内置 `Session` 自动管理 |
| JSON 处理 | 手动 `json.loads()` | `response.json()` |
| 编码处理 | 手动 `.decode()` | 自动检测编码 |
| 超时设置 | `urlopen(url, timeout=10)` | `requests.get(url, timeout=10)` |
| 会话管理 | 需要 Opener + CookieJar | `Session` 一行搞定 |
| 代理设置 | ProxyHandler + build_opener | `proxies={'http': '...'}` |
| 适用场景 | 无第三方库环境、理解底层原理 | **生产环境首选** |

::: tip 学习建议
**先学 urllib 理解原理，再用 requests 提升效率。** requests 底层就是封装了 urllib3（urllib 的第三方增强版）。理解了 urllib 的 Handler/Opener 机制，你就能理解 requests 的 Session、Adapter 是怎么工作的。
:::

---

## 八、httpx：新一代 HTTP 客户端

httpx 是 Python HTTP 客户端生态的后起之秀，由 requests 的核心贡献者开发，被誉为"下一代 requests"。它最大的特点是**同步/异步双模**——同一套 API 既支持同步调用（像 requests），也支持异步调用（像 aiohttp），且原生支持 HTTP/2。

### 8.1 为什么需要 httpx

```mermaid
flowchart TD
    Q{"你需要什么？"} -->|"最简单的 HTTP 请求"| R["requests<br/>同步之王"]
    Q -->|"高并发异步爬虫"| A["aiohttp<br/>异步专用"]
    Q -->|"同一个项目<br/>既需要同步又需要异步"| H["httpx<br/>双模合一"]
    Q -->|"需要 HTTP/2"| H

```

| 特性 | requests | httpx | aiohttp |
|------|----------|-------|---------|
| 同步请求 | ✅ | ✅ | ❌ |
| 异步请求 | ❌ | ✅ | ✅ |
| HTTP/2 | ❌ | ✅ | ❌ |
| API 风格 | requests 风格 | **与 requests 几乎一致** | aiohttp 风格 |
| 连接池 | ✅ | ✅ | ✅ |
| 超时控制 | ✅ | ✅（更精细） | ✅ |
| 学习成本 | 低 | **极低（会 requests 就会用）** | 中 |

### 8.2 安装与基础用法

```bash
# 基础安装（仅 HTTP/1.1）
pip install httpx

# 安装 HTTP/2 支持
pip install httpx[http2]
```

```python
import httpx

# 同步 GET 请求（与 requests 几乎一致）
response = httpx.get('https://www.example.com')
print(response.status_code)     # 200
print(response.text)            # HTML 内容
print(response.headers)         # 响应头
print(response.encoding)        # 编码

# POST 请求
response = httpx.post(
    'https://api.example.com/data',
    data={'key': 'value'},        # 表单数据
    # json={'key': 'value'},      # JSON 数据
)

# 带参数的 GET
response = httpx.get(
    'https://api.example.com/search',
    params={'q': 'python', 'page': 1},
)

# 设置超时
response = httpx.get('https://example.com', timeout=10.0)

# 自定义 Headers
response = httpx.get(
    'https://example.com',
    headers={'User-Agent': 'Mozilla/5.0 ...'},
)
```

### 8.3 Client 会话管理

与 requests 的 `Session` 类似，httpx 的 `Client` 提供了连接池复用、Cookie 自动管理和统一配置：

```python
import httpx

# 使用 Client（推荐，性能更好）
with httpx.Client(
    headers={'User-Agent': 'Mozilla/5.0 ...'},
    timeout=15.0,
    follow_redirects=True,
) as client:
    # 所有请求共享连接池和配置
    resp1 = client.get('https://example.com/page1')
    resp2 = client.get('https://example.com/page2')

    # Cookie 自动管理
    client.post('https://example.com/login', data={'user': 'admin', 'pass': '123'})
    # 后续请求自动携带登录 Cookie
    resp3 = client.get('https://example.com/dashboard')
```

::: tip httpx.Client vs requests.Session
两者功能几乎一致，但 httpx.Client 有两个额外优势：
1. **连接池更智能**：httpx 默认使用 HTTP/1.1 连接池，自动复用 Keep-Alive 连接
2. **支持 HTTP/2 多路复用**：安装 `httpx[http2]` 后，同一连接上可并发多个请求
:::

### 8.4 异步模式：async + await

httpx 的杀手锏——同一套 API，加个 `Async` 前缀就是异步版本：

```python
import httpx
import asyncio

async def crawl_pages(urls: list[str]) -> list[str]:
    """异步并发爬取多个页面"""
    async with httpx.AsyncClient(
        headers={'User-Agent': 'Mozilla/5.0 ...'},
        timeout=15.0,
    ) as client:
        # 并发发送所有请求
        tasks = [client.get(url) for url in urls]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        results = []
        for resp in responses:
            if isinstance(resp, Exception):
                print(f'请求失败: {resp}')
                continue
            results.append(resp.text)
        return results

# 运行
urls = [f'https://example.com/page/{i}' for i in range(1, 11)]
results = asyncio.run(crawl_pages(urls))
print(f'成功爬取 {len(results)} 个页面')
```

### 8.5 高级特性

**HTTP/2 支持**：

```python
# 启用 HTTP/2（需要 pip install httpx[http2]）
with httpx.Client(http2=True) as client:
    response = client.get('https://www.google.com')
    print(response.http_version)  # 'HTTP/2'
```

**代理设置**：

```python
# HTTP 代理
with httpx.Client(proxy='http://127.0.0.1:8888') as client:
    response = client.get('https://httpbin.org/ip')

# SOCKS5 代理（需要 pip install httpx[socks]）
with httpx.Client(proxy='socks5://user:pass@127.0.0.1:1080') as client:
    response = client.get('https://httpbin.org/ip')

# 认证代理
with httpx.Client(proxy='http://user:password@proxy.example.com:8080') as client:
    response = client.get('https://example.com')
```

**精细超时控制**：

```python
# 不同阶段设置不同超时
timeout = httpx.Timeout(
    connect=5.0,     # 连接超时
    read=10.0,       # 读取超时
    write=10.0,      # 写入超时
    pool=5.0,        # 连接池等待超时
)

with httpx.Client(timeout=timeout) as client:
    response = client.get('https://example.com')
```

**流式响应（大文件下载）**：

```python
# 同步流式下载
with httpx.Client() as client:
    with client.stream('GET', 'https://example.com/large-file.zip') as response:
        with open('large-file.zip', 'wb') as f:
            for chunk in response.iter_bytes(chunk_size=8192):
                f.write(chunk)

# 异步流式下载
async def download_file(url: str, filepath: str) -> None:
    async with httpx.AsyncClient() as client:
        async with client.stream('GET', url) as response:
            with open(filepath, 'wb') as f:
                async for chunk in response.aiter_bytes(chunk_size=8192):
                    f.write(chunk)
```

### 8.6 httpx vs requests vs aiohttp 选型决策

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| 简单脚本、快速验证 | requests | 生态最成熟，踩坑最少 |
| 新项目、需要同步+异步 | **httpx** | 一套 API 双模切换，面向未来 |
| 纯异步高并发爬虫 | aiohttp 或 httpx AsyncClient | aiohttp 更轻量，httpx 更统一 |
| 需要 HTTP/2 | **httpx** | 唯一支持 HTTP/2 的 Python HTTP 客户端 |
| 处理大文件下载 | httpx | 流式 API 设计优秀 |
| 已有 requests 项目 | 继续用 requests | 迁移成本不值得，除非需要异步 |

::: tip 迁移成本极低
httpx 的 API 与 requests 几乎 100% 兼容。大多数情况下，只需将 `import requests` 改为 `import httpx`，将 `requests.get` 改为 `httpx.get` 即可。唯一需要注意的是 httpx 的响应对象没有 `response.ok` 属性，需要用 `response.is_success` 代替。
:::

---

## 九、反爬策略与应对

网站为了防止被爬取，会设置各种反爬机制。理解反爬策略的层次结构有助于制定应对方案：

```mermaid
mindmap
  root((反爬策略层次))
    请求层面
      User-Agent 检测
      Referer 检测
      请求频率限制
      IP 封禁
    认证层面
      Cookie 验证
      登录验证
      Token 验证
      验证码
    内容层面
      JavaScript 渲染
      字体反爬
      CSS 偏移
      动态 class 名
    行为层面
      鼠标轨迹检测
      滑动验证
      浏览器指纹
    架构层面
      Cloudflare 防护
      WAF 防火墙
      分布式限流
```

常见反爬策略及应对方案：

| 反爬策略 | 原理 | 应对方案 | 难度 |
|----------|------|----------|------|
| User-Agent 检测 | 检查 UA 是否为浏览器 | 设置真实浏览器 UA，维护 UA 池随机选择 | 低 |
| IP 封禁 | 封锁高频请求 IP | 使用代理 IP 池轮换 | 中 |
| 验证码 | 人机验证 | OCR 识别 / 打码平台 / 降低触发频率 | 中-高 |
| 动态 Token | JS 生成动态令牌 | 逆向 JS 逻辑或用浏览器自动化 | 高 |
| 频率限制 | 请求间隔过短触发限流 | 随机延迟 + 指数退避 | 低 |
| 字体反爬 | 自定义字体映射 | 分析字体文件还原映射表 | 高 |
| CSS 偏移 | 元素位置与显示不一致 | 解析 CSS 计算真实位置 | 中 |
| JS 加密 | 数据经 JS 加密后传输 | 逆向加密算法 | 高 |

---

## 十、爬虫技术栈概览

```mermaid
graph TB
    subgraph 爬虫框架层["爬虫框架层"]
        Scrapy["Scrapy<br/>完整爬虫框架"]
    end

    subgraph 浏览器自动化层["浏览器自动化层"]
        Selenium_["Selenium"]
        Playwright_["Playwright"]
    end

    subgraph 解析层["数据解析层"]
        BS4_["BeautifulSoup<br/>容错解析"]
        lxml_["lxml / XPath<br/>高性能解析"]
        Regex["正则表达式<br/>通用文本匹配"]
    end

    subgraph 请求层["HTTP 请求层"]
        requests_["requests<br/>同步 HTTP"]
        aiohttp_["aiohttp<br/>异步 HTTP"]
        httpx_["httpx<br/>同步+异步"]
    end

    subgraph 存储层["数据存储层"]
        CSV_JSON["CSV / JSON"]
        MySQL_["MySQL"]
        MongoDB_["MongoDB"]
        Redis_["Redis<br/>缓存与队列"]
    end

    爬虫框架层 --> 解析层
    爬虫框架层 --> 请求层
    浏览器自动化层 --> 请求层
    解析层 --> 存储层
    请求层 --> 解析层

```

### 方案选择决策

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| 简单静态页面 | requests + BeautifulSoup | 快速开发，性能足够 |
| 大规模结构化数据 | Scrapy | 内置调度、管道、中间件 |
| 动态渲染页面 | Playwright | 新一代浏览器自动化 |
| 高并发 API 抓取 | aiohttp + asyncio | 异步 IO 高性能 |
| 需要登录的网站 | requests.Session | 自动管理 Cookie |
| 反爬严格的网站 | Playwright + 代理池 | 模拟真实浏览器行为 |

---

## 十一、常见陷阱

| # | 陷阱 | 后果 | 正确做法 |
|---|------|------|---------|
| 1 | 不设置 User-Agent | 请求直接被拒绝（403） | 始终在 Headers 中添加合法 UA |
| 2 | 忽略编码问题 | 中文乱码 | 使用 `response.encoding = response.apparent_encoding` 或 chardet 检测 |
| 3 | 无延迟高频请求 | IP 被封禁 | 添加随机延迟 `time.sleep(random.uniform(1, 3))` |
| 4 | 不做异常处理 | 程序崩溃中断 | 使用 `try-except` 包裹网络请求，实现重试机制 |
| 5 | 忽略 robots.txt | 法律风险 | 爬取前检查目标网站 robots.txt |
| 6 | Selenium 不关闭浏览器 | 资源泄漏 | 使用 `try-finally` 确保调用 `driver.quit()` |
| 7 | JS 渲染空壳 | requests 获取空 HTML | 分析 Ajax 接口或使用 Playwright |
| 8 | 不做数据去重 | 存储大量重复数据 | 维护 URL 集合或用布隆过滤器去重 |
| 9 | 硬编码 URL 和参数 | 网站改版后全部失效 | 提取为配置变量，便于维护 |
| 10 | 不设 timeout | 请求卡死导致程序挂起 | 始终设置 `timeout` 参数 |

---

## 十二、FAQ

**Q1：为什么 requests 获取的页面和浏览器看到的不一样？**

最常见的原因是页面由 JavaScript 动态渲染。requests 只能获取原始 HTML，不会执行 JS。解决方案：1) 分析 Ajax 接口直接请求数据 API；2) 使用 Playwright/Selenium 模拟浏览器渲染。

**Q2：如何判断页面是否需要 JS 渲染？**

在浏览器中右键查看页面源码（Ctrl+U），搜索目标数据。如果源码中有目标数据，说明是服务端渲染；如果源码中没有但页面正常显示，说明是客户端渲染。也可在浏览器中禁用 JS 后刷新页面来验证。

**Q3：爬虫应该先尝试静态方式还是动态方式？**

始终先尝试静态方式（requests + 解析库）。优先级：**requests > Ajax 接口 > Playwright > Selenium**。静态方式效率高、资源消耗低，只有静态方式无效时才考虑动态方式。

**Q4：爬虫被发现了会有什么后果？**

- 轻则：IP 被临时封禁，请求返回 403/429
- 中则：账号被封禁，Cookie/Token 失效
- 重则：面临法律诉讼（违反相关法规或 GDPR）
- 预防：遵守 robots.txt、控制频率、不爬取敏感数据

**Q5：如何提高爬虫的抓取速度？**

1) 使用异步请求（aiohttp/httpx）；2) 多线程/多进程并发；3) 分布式爬取（Scrapy-Redis）；4) 使用连接池（requests.Session）；5) 缓存已爬取内容避免重复请求。注意：效率提升不能以牺牲对方服务器稳定性为代价。

**Q6：代理池需要多少个代理 IP 才够用？**

取决于爬取频率和目标网站的反爬严格程度。一般规则：每分钟请求次数 / 每 IP 每分钟安全频率 = 所需代理数。例如，目标网站每 IP 每分钟允许 10 次请求，你每分钟需要 100 次请求，则至少需要 10 个代理 IP。建议留 2-3 倍余量。

**Q7：BeautifulSoup 的解析器怎么选择？**

| 解析器 | 速度 | 容错 | 安装 | 建议 |
|--------|------|------|------|------|
| `html.parser` | 中 | 一般 | 标准库自带 | 小型项目、无依赖要求 |
| `lxml` | 快 | 好 | `pip install lxml` | 生产环境首选 |
| `html5lib` | 慢 | 最好 | `pip install html5lib` | 极度不规范的 HTML |

---

## 十三、术语表

| 术语 | 英文 | 解释 |
|------|------|------|
| 爬虫 | Web Crawler / Spider | 按规则自动抓取网页信息的程序 |
| HTTP | HyperText Transfer Protocol | 超文本传输协议，客户端与服务器通信的基础 |
| HTTPS | HTTP over SSL/TLS | 加密的 HTTP 协议 |
| URL | Uniform Resource Locator | 统一资源定位符，指定资源位置和访问方式 |
| URI | Uniform Resource Identifier | 统一资源标识符，URL 是其子集 |
| DNS | Domain Name System | 域名系统，将域名解析为 IP 地址 |
| Cookie | HTTP Cookie | 客户端存储的小段数据，用于会话跟踪 |
| Session | Session | 服务端存储的用户会话信息 |
| JWT | JSON Web Token | 基于 JSON 的开放标准令牌 |
| User-Agent | User-Agent | HTTP 头字段，标识客户端身份信息 |
| 状态码 | Status Code | HTTP 响应中标识处理结果的数字代码 |
| DOM | Document Object Model | 文档对象模型，HTML 的树形结构表示 |
| CSS 选择器 | CSS Selector | 定位 HTML 元素的语法规则 |
| XPath | XML Path Language | XML 路径语言，定位 XML/HTML 元素 |
| AJAX | Asynchronous JavaScript and XML | 异步 JS 请求技术，实现页面局部更新 |
| SPA | Single Page Application | 单页应用，页面内容由 JS 动态渲染 |
| 代理 | Proxy | 中间服务器，用于隐藏真实 IP 地址 |
| 反爬 | Anti-Crawling | 服务器检测并阻止自动化访问的机制 |
| 增量爬取 | Incremental Crawling | 仅抓取上次采集后更新的内容 |
| 布隆过滤器 | Bloom Filter | 概率型数据结构，用于高效 URL 去重 |
| 种子 URL | Seed URL | 爬虫起始抓取的初始 URL 列表 |
| urllib | urllib | Python 标准库 HTTP 客户端模块集合 |
| httpx | httpx | 新一代 HTTP 客户端，同步/异步双模，支持 HTTP/2 |
| Handler | Handler | urllib 中处理特定功能（代理、Cookie、认证）的处理器 |
| Opener | OpenerDirector | urllib 中由 Handler 组合而成的请求开启器 |
| CookieJar | CookieJar | urllib 中管理 Cookie 的容器类 |
| HTTP/2 | HTTP/2 | HTTP 协议第二版，支持多路复用、头部压缩 |

---

## 十四、延伸阅读

### 站内链接

- 网络数据采集索引 — 本专题完整目录
- urllib 模块 — Python 标准库 HTTP 客户端
- requests 模块 — 最流行的 HTTP 第三方库
- 正则表达式 — 文本匹配与提取
- lxml 模块 — 高性能 XML/HTML 解析
- BeautifulSoup 库 — 容错 HTML 解析
- 基础库使用 — HTTP 库深入用法
- 数据解析和提取 — 解析技术详解
- 动态渲染页面爬取 — 动态页面攻略
- 异步爬虫 — 高并发抓取

### 外部链接

- [MDN — HTTP 协议文档](https://developer.mozilla.org/zh-CN/docs/Web/HTTP) — HTTP 协议权威参考
- [MDN — HTML](https://developer.mozilla.org/zh-CN/docs/Web/HTML) — MDN HTML 教程
- [MDN — CSS 选择器](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Selectors) — CSS 选择器参考
- [RFC 7231 — HTTP/1.1 Semantics](https://datatracker.ietf.org/doc/html/rfc7231) — HTTP 协议规范原文
- [Requests 官方文档](https://docs.python-requests.org/) — requests 库完整文档
- [BeautifulSoup 文档](https://www.crummy.com/software/BeautifulSoup/bs4/doc/) — BS4 解析库文档
- [Scrapy 官方文档](https://docs.scrapy.org/) — Scrapy 框架参考
- [Playwright 官方文档](https://playwright.dev/python/) — 浏览器自动化工具
- [《Python3 网络爬虫开发实战》](https://germey.gitbook.io/python3webspider) — 崔庆才著
---

## 爬虫并发：多线程与多进程

爬虫在向服务器发起请求后，往往需要等待响应返回，属于典型的 IO 密集型任务。如果采用单线程，处理器在等待期间处于闲置；采用多线程或多进程，处理器便可以在等待期间处理其他任务，从而大幅提升整体爬取效率。

### 多线程与多进程的概念

- **进程（Process）**：是具有一定独立功能的程序关于某个数据集合上的一次运行活动，是操作系统进行资源分配和调度的一个独立单位。打开一个浏览器即开启一个浏览器进程，打开一个文本编辑器即开启一个文本编辑器进程。
- **线程（Thread）**：是操作系统进行运算调度的最小单位，是进程中的一个最小运行单元。一个进程由一个或多个线程构成，进程就是线程的集合。例如浏览器进程中，播放音乐是一个线程，播放视频是另一个线程，它们并发或并行执行，使浏览器能同时处理多个任务。
- **多线程**：在一个进程中同时执行多个线程。
- **多进程**：启用多个进程同时运行。由于进程由线程构成，多进程运行意味着有大于或等于进程数量的线程在运行。

#### 并发与并行

- **并发（Concurrency）**：同一时刻只能有一条指令执行，但多个线程的指令被快速轮换地执行。由于处理器执行和切换的速度极快，宏观上看起来多个线程在同时运行，但微观上同一时刻只有一个线程在执行。
- **并行（Parallelism）**：同一时刻有多条指令在多个处理器上同时执行，必须依赖多处理器。并行只能在多处理器系统中存在；并发在单处理器和多处理器系统中都可以存在。

#### 适用场景

- **IO 密集型任务**：执行过程中大量时间在等待（如等待网络响应、数据库查询），启用多线程可让处理器在等待期间处理其他任务，提高整体效率。网络爬虫正是典型场景。
- **计算密集型任务（CPU 密集型）**：任务运行一直需要处理器参与，启用多线程不会节省总体时间（计算总量不变），线程过多反而因切换增加开销，效率降低。此类任务更适合多进程。

### Python 多线程实现

Python 使用 `threading` 模块实现多线程。

#### Thread 直接创建子线程

通过 `Thread` 类创建线程，`target` 指定运行方法，`args` 传入参数：

```python
import threading
import time

def target(second):
    print(f'Threading {threading.current_thread().name} is running')
    print(f'Threading {threading.current_thread().name} sleep {second}s')
    time.sleep(second)
    print(f'Threading {threading.current_thread().name} is ended')

print(f'Threading {threading.current_thread().name} is running')
for i in [1, 5]:
    thread = threading.Thread(target=target, args=[i])
    thread.start()
print(f'Threading {threading.current_thread().name} is ended')
```

这里一共产生三个线程：主线程 `MainThread` 和两个子线程 `Thread-1`、`Thread-2`。主线程并不等待子线程运行完毕即退出。若希望主线程等待子线程全部结束，需为每个子线程调用 `join()`：

```python
threads = []
for i in [1, 5]:
    thread = threading.Thread(target=target, args=[i])
    threads.append(thread)
    thread.start()
for thread in threads:
    thread.join()
```

#### 继承 Thread 类创建子线程

通过继承 `Thread` 类创建线程，将执行逻辑写在 `run` 方法中，效果与直接创建相同：

```python
class MyThread(threading.Thread):
    def __init__(self, second):
        threading.Thread.__init__(self)
        self.second = second
    def run(self):
        time.sleep(self.second)
        print(f'Threading {threading.current_thread().name} sleep {self.second}s is ended')
```

#### 守护线程

通过 `setDaemon(True)` 将线程设置为守护线程。主线程结束时，未运行完的守护线程会被强制结束。若让所有线程都调用 `join()`，主线程会等待所有子线程（含守护线程）执行完毕。

#### 互斥锁

多个线程共享同一进程内资源。若多个线程同时读取/修改同一数据，会产生不可预料的结果。通过 `threading.Lock` 加锁保护，确保同一时间只有一个线程操作数据：

```python
lock = threading.Lock()
# 在操作共享数据前加锁，修改完成后释放
lock.acquire()
# ... 操作共享数据 ...
lock.release()
```

### GIL 与多线程的局限

Python 中存在全局解释器锁（GIL，Global Interpreter Lock），其最初设计出于数据安全考虑。在 Python 多线程下，每个线程执行须先获取 GIL，而一个 Python 进程只有一个 GIL，因此即使是多核条件下，同一时刻也只能执行一个线程。

对于爬虫这类 IO 密集型任务，GIL 影响不大；对于计算密集型任务，由于 GIL 的存在，多线程总体效率反而可能低于单线程。

### Python 多进程实现

Python 使用 `multiprocessing` 库实现多进程。它提供 `Process`、`Queue`、`Semaphore`、`Pipe`、`Lock`、`Pool` 等组件。

**多进程的优势**：每个进程有属于自己的 GIL，在多核处理器下不受 GIL 影响，能更好地发挥多核优势。但进程间数据无法直接共享，需要借助队列、管道等机制。

#### 直接使用 Process 类

```python
import multiprocessing

def process(index):
    print(f'Process: {index}')

if __name__ == '__main__':
    for i in range(5):
        p = multiprocessing.Process(target=process, args=(i,))
        p.start()
```

注意 `args` 必须是元组，单个参数也要在元素后加逗号。通过 `cpu_count()` 获取 CPU 核心数，`active_children()` 获取当前运行中的进程。

#### 继承 Process 类

通过继承 `Process` 类创建进程，将执行逻辑写在 `run` 方法中，启动时调用 `start()`。

#### 守护进程、进程等待与终止

- **守护进程**：设置 `p.daemon = True`，父进程结束时子进程自动终止。
- **进程等待**：调用 `join()` 等待子进程执行完毕；可传超时参数 `join(seconds)` 限制最长等待时间。
- **终止进程**：`terminate()` 终止进程，之后应调用 `join()` 以更新进程状态。

#### 进程互斥锁

多个进程并行执行时可能同时抢占临界区资源（如同时输出导致换行错乱）。使用 `multiprocessing.Lock` 保证同一时刻只有一个进程访问共享资源：

```python
from multiprocessing import Process, Lock

class MyProcess(Process):
    def __init__(self, loop, lock):
        Process.__init__(self)
        self.loop = loop
        self.lock = lock
    def run(self):
        for count in range(self.loop):
            self.lock.acquire()
            print(f'Pid: {self.pid} LoopCount: {count}')
            self.lock.release()
```

#### 信号量

当需要允许多个进程同时访问共享资源、但限制并发数量时，使用 `multiprocessing.Semaphore`。经典的生产者-消费者问题即可通过信号量（`empty`/`full`）+ 锁 + 队列实现。

#### 队列与管道

- **Queue（队列）**：用于进程间共享数据。进程 A 通过 `put()` 放入数据，进程 B 通过 `get()` 取出数据。普通全局变量在进程间无效，因为进程资源不共享。
- **Pipe（管道）**：进程间直接通信的通道，支持单向（half-duplex）和双向（duplex）。默认双向，单向需传 `duplex=False`。

#### 进程池

`multiprocessing.Pool` 提供指定数量的进程供调用，可控制并发数量。使用 `apply_async` 提交任务，或更简洁的 `map` 方法批量执行。例如用 3 个进程并行抓取多个 URL：

```python
from multiprocessing import Pool

def scrape(url):
    # 请求并解析 url
    ...

if __name__ == '__main__':
    pool = Pool(processes=3)
    urls = ['https://www.example.com', 'https://www.example.org', 'https://www.example.net']
    pool.map(scrape, urls)
    pool.close()
```

进程池非常适合爬虫中"大量 URL 并行抓取"的场景，既能控制并发量避免 CPU 过载，又能显著提升抓取效率。


## 版本差异（爬虫技术栈 → 当前版本）

| 库 | 本文编写时 | 当前稳定版 |
|----|-----------|-----------|
| `requests` | 2.28/2.31 | 2.32.x |
| `Scrapy` | 1.x/2.0 | 2.13.x（API 稳定，截至 2026-09） |
| `httpx` | 0.24 | 0.28.x |
| `Playwright` | 1.3x | 1.6x（Python 版） |
| `lxml`/`BeautifulSoup` | 旧版 | 保持稳定 |
| Python | 3.8-3.12 | 3.14（推荐） |

> 本文讲解的爬虫原理（HTTP、解析、反爬、存储）与核心 API 在最新版本中成立；注意 Python 3.9 及以下已 EOL，新项目使用 3.13/3.14。
