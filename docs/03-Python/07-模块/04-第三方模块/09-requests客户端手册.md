---
title: requests — HTTP 客户端手册
description: requests 的生产级用法：Session 连接复用、超时必设、urllib3 Retry 指数退避、证书与代理配置、流式下载，以及与 HTTP 基础知识的对应关系。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# requests — HTTP 客户端手册

## 概念说明

`requests` 是 Python 生态使用最广泛的同步 HTTP 客户端，口号"HTTP for Humans"。它把 `urllib` 的底层细节（连接管理、编码、重定向、Cookie）收敛成一套直观 API，本篇定位是**速查 + 生产级最佳实践**，不重复 HTTP 协议本身——方法语义、状态码、Cookie 与代理的原理见[爬虫概览与 HTTP 基础](/docs/python/01-Web与爬虫/02-爬虫/01-爬虫概览与HTTP基础)。

```python
import requests

resp = requests.get("https://httpbin.org/get", timeout=5)
resp.raise_for_status()
print(resp.status_code, resp.json())
```

::: tip 选型速断
同步脚本、内部工具、绝大多数爬虫与 API 调用 → requests。需要 HTTP/2、异步或与 httpx 统一技术栈 → httpx（对比见 HTTP 基础篇）。本篇所有原则（超时、重试、Session 复用）对 httpx 同样适用。
:::

## 核心要点

- **超时必须显式设置**。requests 默认不超时，一个慢端点能让整个进程挂死——这是 requests 最著名的坑。
- **生产代码用 Session 而非顶层函数**。Session 复用 TCP 连接池，性能与 Cookie 管理都更好。
- 重试交给 urllib3 的 `Retry`：连接错误、502/503 等瞬态故障自动退避重试，不要手写 for 循环重试。
- 证书校验默认开启且**永远不要关闭**；自签名证书用 `verify="路径"` 指定私有 CA，而不是 `verify=False`。
- 代理配置走 `proxies` 或环境变量 `HTTP_PROXY/HTTPS_PROXY`；代理凭据同样是环境变量的事。
- 大文件用 `stream=True` 分块下载，避免把整个响应读进内存。
- ⚠️ 常见误区：`resp.json()` 前不检查状态码；非 2xx 响应体可能是 HTML 错误页，直接 `json()` 会抛难以定位的异常。
- ⚠️ 常见误区：Session 每次请求新建。顶层 `requests.get()` 每次新建连接，高并发下延迟与端口消耗都显著增加。
- ⚠️ 常见误区：异常只捕 `Exception`。requests 的异常层次精确，按 `requests.Timeout` / `requests.HTTPError` 分别处理才能做出正确的退避与告警。

## 快速上手与响应对象

```python
import requests

resp = requests.get(
    "https://httpbin.org/get",
    params={"q": "python", "page": 1},          # 查询参数，自动 URL 编码
    headers={"User-Agent": "myapp/1.0"},
    timeout=(3.05, 10),                          # (连接超时, 读取超时)
)

resp.raise_for_status()        # 非 2xx 抛 HTTPError；缺省时 requests 不抛！
print(resp.status_code)        # 200
print(resp.url)                # 最终 URL（重定向后）
print(resp.headers["Content-Type"])
print(resp.json())             # JSON 响应体
print(resp.text)               # 文本响应体（按编码解码）
print(resp.content)            # 二进制响应体
```

POST 与其他方法：

```python
# JSON 体（最常用，自动序列化并设置 Content-Type）
resp = requests.post("https://httpbin.org/post", json={"name": "alpha"}, timeout=5)

# 表单体
resp = requests.post("https://httpbin.org/post", data={"user": "a", "pass": "b"}, timeout=5)

# 文件上传
with open("report.pdf", "rb") as f:
    resp = requests.post("https://httpbin.org/post", files={"file": f}, timeout=30)

# PUT / DELETE / HEAD / PATCH 同理：requests.put / delete / head / patch
```

::: warning 不设超时 = 永远等待
`requests.get(url)` 不传 `timeout` 时，连接和读取都可能无限期阻塞。生产代码必须每次请求都带 `timeout`，推荐二元组 `(connect, read)`：连接超时设小（3 秒左右，快速失败），读取超时按接口 SLA 设定。
:::

## Session：连接复用与会话状态

### 为什么必须用 Session

- **连接池复用**：同主机的多次请求复用 TCP/TLS 连接，省去每次握手（TLS 握手可达几十毫秒）。
- **会话状态**：Cookie 自动维护，登录一次后续请求自动携带。
- **统一配置**：headers、认证、代理在 Session 上设一次，全程生效。

```python
import os

import requests

with requests.Session() as session:
    session.headers.update({
        "User-Agent": "myapp/1.0",
        "Accept": "application/json",
    })
    session.timeout = 10  # 注意：Session 属性不会自动生效，见下方 warning

    # 登录后 Cookie 存在 session 中，后续请求自动携带
    session.post("https://example.com/login", json={
        "username": "ops",
        "password": os.environ["APP_PASSWORD"],   # 凭据一律环境变量
    }, timeout=5)
    resp = session.get("https://example.com/dashboard", timeout=5)
    print(resp.status_code)
```

::: warning Session.timeout 属性不生效
`session.timeout = 10` 是无效的——每个请求方法不会读这个属性，超时仍需逐请求传参，或用 HTTPAdapter 全局兜底（见下节）。这是 Session 使用中排行第一的误用。
:::

## 重试与退避：urllib3 Retry

手写重试循环容易忽略幂等性、退避节奏与"哪些状态码值得重试"。正确做法是把 `urllib3.util.Retry` 挂载到 Session 的适配器上：

```python
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def build_session(max_retries: int = 3) -> requests.Session:
    retry = Retry(
        total=max_retries,                  # 总重试上限
        connect=max_retries,                # 连接阶段重试次数
        read=max_retries,                   # 读阶段重试次数
        status=max_retries,                 # 状态码重试次数
        backoff_factor=0.5,                 # 退避：0.5s, 1s, 2s...（指数增长）
        status_forcelist=[429, 500, 502, 503, 504],  # 这些瞬态状态码触发重试
        allowed_methods=["GET", "PUT", "DELETE", "HEAD", "OPTIONS"],  # 只重试幂等方法
        respect_retry_after_header=True,    # 尊重服务端的 Retry-After
    )
    adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=10)
    session = requests.Session()
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session
```

::: warning 不要重试非幂等请求
`POST` 不在 `allowed_methods` 默认集合里是有意为之：对下单、支付类接口盲目重试可能造成重复提交。确需重试的 POST，先让服务端支持幂等键（Idempotency-Key），再自行加入 `allowed_methods`。
:::

退避间隔的算法：`backoff_factor * (2 ** (retry次序 - 1))`。`backoff_factor=0.5` 时依次约 0.5s、1s、2s（首次重试通常立即或半个 factor，取决于 urllib3 版本实现），叠加 `Retry-After` 头时以后者为准。这段配置能让瞬态故障（网络抖动、上游重启）在无感知下自愈，同时用指数退避保护故障中的服务端。

## 证书与代理

### 证书

```python
# 默认：校验系统 CA 证书，永远保持开启
requests.get("https://api.example.com", timeout=5)

# 内网自签名服务：指定私有 CA 包（文件路径），仍然做完整校验
requests.get("https://internal.example.com",
             verify="/etc/ssl/certs/internal-ca.pem", timeout=5)

# 客户端证书（双向 TLS）
requests.get("https://mtls.example.com",
             cert=("/path/client.pem", "/path/client.key"), timeout=5)
```

::: danger 永远不要 verify=False
`verify=False` 关闭的不只是"这个自签名证书的校验"，而是**全部中间人防护**——任何能介入网络的攻击者都可以劫持这条连接、窃取凭据。正确解法只有两个：把私有 CA 装进信任链，或 `verify=` 指向 CA 文件。排查证书问题时可临时设 `REQUESTS_CA_BUNDLE` 环境变量，而不是关校验。
:::

### 代理

```python
import os

# 方式一：逐请求配置（凭据从环境变量读，不写进代码）
proxies = {
    "http": os.environ["HTTP_PROXY"],
    "https": os.environ["HTTPS_PROXY"],
}
resp = requests.get("https://example.com", proxies=proxies, timeout=10)

# 方式二：requests 原生尊重环境变量 HTTP_PROXY / HTTPS_PROXY / NO_PROXY，
# 不传 proxies 时自动读取——CI 与容器环境的推荐方式。

# Session 上统一配置
with requests.Session() as s:
    s.proxies.update(proxies)
    s.get("https://example.com", timeout=10)
```

SOCKS 代理需要额外安装 `pip install requests[socks]`，然后 `"https": "socks5://user:pass@host:port"`。爬虫场景的代理池轮换、反爬对抗等深度话题见[爬虫概览与 HTTP 基础](/docs/python/01-Web与爬虫/02-爬虫/01-爬虫概览与HTTP基础)。

## 流式下载与异常处理

### 大文件分块下载

```python
import os
from pathlib import Path

def download(url: str, dest: Path, chunk_size: int = 1 << 20) -> None:
    """流式下载：内存占用恒定为 chunk_size，不随文件大小增长。"""
    dest.parent.mkdir(parents=True, exist_ok=True)
    with requests.get(url, stream=True, timeout=(3, 30)) as resp:
        resp.raise_for_status()
        with open(dest, "wb") as f:
            for chunk in resp.iter_content(chunk_size=chunk_size):
                f.write(chunk)          # chunk 是 bytes；iter_lines() 则适合行协议
    print(f"下载完成: {dest} ({dest.stat().st_size / 1e6:.1f} MB)")


# 上传侧对称的方案是分块/生成器，multipart 大文件同样不该一次性读入内存
```

关键点：`stream=True` 只表示"响应体延迟下载"，**连接释放靠 `with` 语句**——不关闭的流式响应会占住连接池。

### 异常体系

```python
import requests

try:
    resp = requests.get("https://api.example.com/data", timeout=(3, 10))
    resp.raise_for_status()
    data = resp.json()
except requests.exceptions.Timeout:
    ...  # 连接或读取超时 → 告警 + 重试
except requests.exceptions.ConnectionError:
    ...  # DNS 失败 / 拒绝连接 → 检查网络与端点
except requests.exceptions.HTTPError as e:
    code = e.response.status_code
    ...  # 4xx 客户端错误 → 修请求；5xx 服务端错误 → 重试或熔断
except requests.exceptions.RequestException as e:
    ...  # requests 异常树的根，兜底日志

# 响应体 JSON 解析失败单独处理：resp.json() 抛 requests.exceptions.JSONDecodeError
```

::: tip 异常层次速记
所有 requests 异常继承自 `RequestException`；`HTTPError`（raise_for_status 抛出）、`Timeout`（含 `ConnectTimeout`/`ReadTimeout`）、`ConnectionError`、`TooManyRedirects` 是它的直接子类。捕获顺序从具体到笼统，兜底用 `RequestException`。
:::

## 常见陷阱

| 陷阱 | 后果 | 正确做法 |
|---|---|---|
| 不设 timeout | 请求无限期挂起，拖垮调用方 | 每次请求显式 `timeout=(3, 10)` |
| 顶层函数高频调用 | 每请求新建 TLS 连接，延迟与端口开销大 | 全局/应用级复用 Session |
| `session.timeout = x` 以为生效 | 实际无效，仍可能挂死 | 逐请求传参或封装请求方法强制注入 |
| `resp.json()` 不看状态码 | HTML 错误页解析异常，报错难定位 | 先 `raise_for_status()` 再解析 |
| `verify=False` 图省事 | 中间人风险，密钥可被截获 | 配置私有 CA（`verify=` 或 `REQUESTS_CA_BUNDLE`） |
| 手写 for 循环重试 POST | 重复下单等副作用 | Retry 只挂幂等方法；POST 靠幂等键 |
| 流式响应不关闭 | 连接池耗尽，后续请求排队 | `with requests.get(...) as resp:` |
| 密钥写在 URL 或 header 常量里 | 进日志、进 Git | 环境变量注入，日志脱敏 |

## 最佳实践

1. **封装一个 `get_session()`**：统一注入超时、Retry、默认 headers、代理与 CA，全项目共享一个工厂函数，杜绝各处裸调 `requests.get`。
2. **超时与重试是两道独立防线**：超时防单请求挂死，Retry 防瞬态故障；配合熔断（连续失败后快速失败）形成完整弹性链路。
3. **日志记录"请求元数据"而非"密钥"**：记录 method、URL（去 query 中的 token）、状态码、耗时；headers 里的 Authorization 永不落日志。
4. **限速是美德**：对第三方 API 按 `Retry-After` 与令牌桶控制 QPS，429 多了会被封。
5. **响应模型化**：接口返回先过 Pydantic 模型（见 [Pydantic 数据校验](/docs/python/07-模块/04-第三方模块/04-pydantic)），把"响应结构变更"提前到解析期暴露。
6. **长驻进程监控连接池**：`pool_maxsize` 要匹配并发度；出现 `Connection pool is full` 告警即扩容。

## 延伸阅读

- [requests 官方文档](https://requests.readthedocs.io/) — API 与高级用法（认证、hook、事件）权威参考
- [urllib3 Retry 文档](https://urllib3.readthedocs.io/en/stable/reference/urllib3.util/#urllib3.util.Retry) — 重试策略全部参数语义
- [爬虫概览与 HTTP 基础](/docs/python/01-Web与爬虫/02-爬虫/01-爬虫概览与HTTP基础) — HTTP 协议、Cookie、代理与反爬的系统讲解
- [Pydantic — 运行时数据校验与序列化](/docs/python/07-模块/04-第三方模块/04-pydantic) — 把 HTTP 响应收敛为类型安全模型
- [配置管理](/docs/python/03-工程化与运维/01-工程化/07-配置管理) — 代理、凭据等外部配置的注入规范
