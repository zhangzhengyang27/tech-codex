---
title: aiohttp 框架（服务端）
description: aiohttp 服务端开发：应用与路由、请求响应对象、中间件与信号、WebSocket 服务端，以及并发控制与背压处理。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# aiohttp 框架（服务端）

> **本篇做什么**：聚焦 aiohttp 的**服务端**角色——应用与路由组织、请求/响应对象、中间件与信号机制、WebSocket 服务端实现，以及高并发下的并发控制与背压处理。
> **产出**：一个含中间件、信号监听与 WebSocket 端点的 aiohttp 服务骨架。
> **前置篇**：[00-Web 框架对比与选型](/docs/python/01-Web与爬虫/01-Web开发/00-Web框架对比与选型)。aiohttp 的**客户端**用法（爬虫场景）已散见爬虫系列，见 [反爬对抗策略](/docs/python/01-Web与爬虫/02-爬虫/04-反爬对抗策略)；事件循环基础见 [asyncio 基础](/docs/python/09-进阶核心/02-异步编程/01-asyncio基础)。

## 概念说明

aiohttp 的特殊之处在于它是一个库而非框架家族：**同一个包提供异步 HTTP 客户端与服务端**。客户端一侧在爬虫与采集系统中应用极广；服务端一侧则定位偏底层——提供路由、请求响应对象、中间件等 HTTP 基建，但**没有**依赖注入、参数校验、API 文档这些"框架层"能力，业务代码要自己组织。

这个定位决定了它的适用面：

- **客户端 + 服务端同栈的系统**：采集系统（客户端抓取）+ 回写服务（服务端接收），共用一个依赖、一套连接池管理、一种编程模型。
- **代理、网关、转发服务**：读上游（客户端）→ 写下游（服务端）的管道型代码，aiohttp 两端 API 同构，代码最直。
- **极简内部服务**：端点少、契约简单，不需要 OpenAPI 文档的场景。

::: tip 心智模型
aiohttp 服务端 ≈ "Flask 的路由手感 + Starlette 的底层自由度，但什么都不替你决定"。它给你 HTTP 协议的完整控制权，代价是每个工程化能力（校验、分层、鉴权）都要自己搭。选它通常不是因为"框架功能多"，而是因为"两端同库 + 控制力强"。
:::

## 安装与最小应用

```bash
pip install aiohttp
```

```python
from aiohttp import web


async def health(request: web.Request) -> web.Response:
    return web.json_response({"status": "ok"})


app = web.Application()
app.router.add_get("/health", health)

web.run_app(app, host="127.0.0.1", port=8080)
```

- `web.run_app` 适合脚本与开发环境；生产环境可用 `gunicorn -k aiohttp.GunicornWebWorker` 或容器内直接运行。
- 与 Flask 的差异：路由是**显式注册**（`app.router.add_get`），装饰器写法为 `routes.get` 路由表 + `add_routes` 批量挂载，见下节。

## 路由组织

aiohttp 提供两种注册风格，推荐项目统一用 `RouteTableDef`（声明式路由表）：

```python
from aiohttp import web

routes = web.RouteTableDef()


@routes.get("/items/{item_id}")
async def get_item(request: web.Request) -> web.Response:
    item_id = request.match_info["item_id"]  # 路径参数从 match_info 取
    return web.json_response({"id": item_id})


@routes.post("/items")
async def create_item(request: web.Request) -> web.Response:
    data = await request.json()
    return web.json_response({"created": data}, status=201)


@routes.view("/ws")  # WebSocket 用 routes.view + WebSocketResponse
class WSHandler(web.View):
    """类视图：一个类组织一个资源的多个方法"""

    async def get(self) -> web.WebSocketResponse:
        ...


app = web.Application()
app.add_routes(routes)
```

要点：

- **路径参数**通过 `request.match_info` 字典获取，没有类型转换器——`/items/abc` 也会匹配，类型校验自己做。
- **`web.View` 类视图**把同一 URL 的 GET/POST/DELETE 收进一个类，方法名即 HTTP 方法，是 aiohttp 版的"资源分组"。
- 大项目按业务域拆多个 `routes` 表再 `add_routes` 合并，等价于 Flask 蓝图 / FastAPI 路由组的作用。

## 请求与响应对象

### Request

```python
async def inspect_request(request: web.Request) -> web.Response:
    request.method           # "GET" / "POST" ...
    request.path             # 路径
    request.query            # 查询参数 MultiDict，request.query.get("page")
    request.headers          # 请求头 CIMultiDict，大小写不敏感
    request.cookies          # Cookie 字典
    request.match_info       # 路径参数
    request.remote           # 客户端地址

    body = await request.json()        # JSON 请求体（异步读取）
    form = await request.post()        # 表单与文件上传
    raw  = await request.read()        # 原始字节

    ctx = request.config_dict          # 访问 app 级配置（见下文依赖注入替代法）
    return web.json_response({})
```

### Response

```python
web.json_response({"ok": True})                     # JSON
web.json_response(data, status=201)                 # 指定状态码
web.Response(text="hello", content_type="text/plain")
web.Response(body=b"...", content_type="application/octet-stream")
web.StreamResponse()                                # 流式响应（见背压一节）
web.FileResponse("/data/report.pdf")                # 文件响应
web.HTTPNotFound(text="not found")                  # 异常型响应
```

::: warning 请求体必须显式读取且只读一次
`await request.json()` 是一次性的流式读取，重复调用会抛错，且没有自动校验——`request.json()` 对非法 JSON 直接抛 `json.JSONDecodeError`。生产代码必须包 try/except 并返回 400，而不是让它变成 500。这也是 aiohttp 与类型驱动框架最大的日常差异：**所有输入解析与校验都是你的代码**。
:::

## 中间件与信号

### 中间件

aiohttp 的中间件是"包装处理函数"的函数，签名固定为 `(request, handler)`：

```python
import time
import uuid

from aiohttp import web


@web.middleware
async def request_middleware(request: web.Request, handler):
    # handler 是"下一层"：调用它 = 继续执行路由函数
    request_id = uuid.uuid4().hex
    start = time.perf_counter()

    # 把数据传给视图：aiohttp 没有 request.ctx，用 request 自定义属性
    request["request_id"] = request_id

    try:
        response = await handler(request)
    except web.HTTPException:
        raise
    except Exception:
        # 未捕获异常统一转 500，避免堆栈泄漏给客户端
        return web.json_response({"error": "internal error"}, status=500)
    finally:
        elapsed = time.perf_counter() - start
        print(f"[{request_id}] {elapsed:.3f}s")

    response.headers["X-Request-ID"] = request_id
    return response


app = web.Application(middlewares=[request_middleware])
```

与 Sanic/FastAPI 中间件的可对照点：

- aiohttp 是**单层函数包装**模型（没有 request/response 两阶段回调），请求前后逻辑写在 `await handler(request)` 语句的两侧。
- 数据传递用 `request["key"]`（Request 对象支持字典式存取），等价于 Sanic 的 `request.ctx`。
- 多个中间件按 `middlewares` 列表顺序嵌套。

### 信号（Signals）

信号是 aiohttp 请求生命周期的钩子机制，比中间件更"旁观"：只订阅事件、不改写请求响应流程，适合打点、审计：

```python
app = web.Application()


async def on_prepare(request: web.Request, response: web.StreamResponse):
    """每个响应发出前触发：统一的响应头注入"""
    response.headers.setdefault("X-Content-Type-Options", "nosniff")


async def on_cleanup(app: web.Application):
    """应用关闭时触发：释放连接池等资源"""
    ...


app.on_response_prepare.append(on_prepare)
app.on_cleanup.append(on_cleanup)
```

常用应用级信号：`on_startup`（启动时初始化资源）、`on_cleanup`（关闭时释放）、`on_response_prepare`（响应头统一处理）。**应用级资源（数据库连接池、HTTP 客户端会话）的初始化与释放应挂在信号上**，而不是中间件里——中间件是每请求的，信号是每应用的。

::: tip aiohttp 版"应用状态"
Flask 有 `app.config`，FastAPI 有 `app.state`，aiohttp 的惯例是把资源挂在 `app` 上（`app["db_pool"] = ...`），视图里通过 `request.app["db_pool"]` 取用。启动/关闭生命周期由 `on_startup`/`on_cleanup` 信号保证。
:::

## WebSocket 服务端

aiohttp 的 WebSocket 服务端写法直接，适合实现推送、协作、聊天类端点：

```python
from aiohttp import WSMsgType, web

routes = web.RouteTableDef()


@routes.get("/ws")
async def websocket_handler(request: web.Request) -> web.WebSocketResponse:
    ws = web.WebSocketResponse(heartbeat=30)  # 心跳保活，生产必配
    await ws.prepare(request)                 # 完成 HTTP → WS 升级握手

    async for msg in ws:
        if msg.type == WSMsgType.TEXT:
            await ws.send_str(f"echo: {msg.data}")
        elif msg.type == WSMsgType.ERROR:
            break  # 连接异常，async for 自动结束

    return ws  # 返回 ws 而不是普通 Response


app = web.Application()
app.add_routes(routes)
```

一个"连接池 + 广播"的房间示例——所有连接登记进集合，任一客户端消息广播给全体：

```python
connections: set[web.WebSocketResponse] = set()


@routes.get("/room")
async def room(request: web.Request) -> web.WebSocketResponse:
    ws = web.WebSocketResponse(heartbeat=30)
    await ws.prepare(request)
    connections.add(ws)
    try:
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                dead = []
                for conn in connections:
                    try:
                        await conn.send_str(msg.data)
                    except ConnectionResetError:
                        dead.append(conn)
                for conn in dead:
                    connections.discard(conn)
    finally:
        connections.discard(ws)  # 无论正常断开还是异常，都要清理
    return ws
```

::: warning 连接生命周期必须成对管理
`prepare` 成功后连接即建立，`async for` 结束（客户端断开或出错）后必须清理注册表。漏写清理会导致 `connections` 集合无限膨胀——长连接服务的典型内存泄漏。客户端异常断开不一定立刻触发服务端感知，`heartbeat` 参数让服务端定期探测死连接。
:::

## 并发与背压

aiohttp 服务端默认全并发：每个连接一个 task，单进程即可挂起成千上万个连接。这对 I/O 密集是优势，但也意味着**不加控制的下游压力会指数放大**。

### 限流：限制同时处理的请求

```python
import asyncio

from aiohttp import web


class ConcurrencyLimiter:
    """基于信号量的全局限流中间件"""

    def __init__(self, max_concurrency: int):
        self.semaphore = asyncio.Semaphore(max_concurrency)

    @web.middleware
    async def __call__(self, request: web.Request, handler):
        async with self.semaphore:  # 超过上限的请求排队等待
            return await handler(request)


app = web.Application(middlewares=[ConcurrencyLimiter(200).__call__])
```

### 背压：流式转发时读 ≠ 写

代理/转发服务的经典错误——把上游响应整体读入内存再返回：

```python
@routes.get("/proxy")
async def proxy(request: web.Request) -> web.StreamResponse:
    async with request.app["client_session"].get(
        "https://upstream.example.com/large-file"
    ) as upstream:
        response = web.StreamResponse(
            status=upstream.status,
            headers={"Content-Type": upstream.content_type},
        )
        await response.prepare(request)

        # 逐块转发：读一块写一块，内存占用恒定
        async for chunk in upstream.content.iter_chunked(64 * 1024):
            await response.write(chunk)  # 写入会等待客户端消化，天然背压

        await response.write_eof()
        return response
```

`response.write()` 在 TCP 发送缓冲区满时会挂起，上游读取随之暂停——**这就是 aiohttp 内建的背压传导**。反例是 `iter_any()` 不限速读入 `bytearray` 再一次性返回，大文件场景直接打爆内存。

### 请求体限长：防止恶意大包

```python
app = web.Application(client_max_size=2 * 1024 * 1024)  # 默认 1MB，可按需调整
```

::: warning 并发 ≠ 并行，更 ≠ 无限
异步并发解决的是"等待时让出"，不放大 CPU 能力。CPU 密集型路由（图片压缩、数据计算）在 `async def` 里会卡住整个 worker，应交给进程池或独立服务。异步并发也解决不了下游容量：对数据库、第三方 API 的调用要自建信号量/连接池上限，否则限流形同虚设。并发控制的通用原理见 [asyncio 基础](/docs/python/09-进阶核心/02-异步编程/01-asyncio基础)。
:::

## 常见陷阱

| 陷阱 | 现象 | 正确做法 |
|---|---|---|
| `request.json()` 不捕获异常 | 非法 JSON 直接 500 | try/except 后返回 400 |
| 路径参数当 int 用 | `/items/abc` 触发业务层报错 | `match_info` 取值后手动校验类型 |
| 资源初始化写在中间件 | 每请求重建连接，池化失效 | 挂 `on_startup`/`on_cleanup` 信号，存 `app[...]` |
| WebSocket 忘配 `heartbeat` | 死连接长期占用资源 | `WebSocketResponse(heartbeat=30)` |
| 断开连接不清理集合 | 广播列表膨胀、内存泄漏 | `try/finally` 中 `discard` |
| 代理服务整体读入再转发 | 大文件打爆内存 | `StreamResponse` + `iter_chunked` 逐块转发 |
| 忘设 `client_max_size` | 恶意大包吃满内存 | 按接口实际需要显式设置 |
| CPU 密集任务写在路由里 | 整个 worker 卡顿 | 丢进程池或拆独立服务 |

## 小结

- aiohttp = 客户端 + 服务端一体的异步 HTTP 库，服务端定位是"基建齐全、框架能力自建"。
- 路由用 `RouteTableDef` 声明式组织，路径参数在 `match_info`，类视图 `web.View` 承担资源分组。
- 中间件是 `(request, handler)` 包装函数，数据传递用 `request[...]`；应用级资源的生命周期挂在信号上。
- WebSocket 用 `WebSocketResponse` + `prepare`，连接注册表必须在 `finally` 清理，`heartbeat` 生产必配。
- 并发与背压：信号量限流、`StreamResponse` 逐块转发的天然背压、`client_max_size` 防大包，三者共同构成抗压底线。

## 延伸阅读

- [00-Web 框架对比与选型](/docs/python/01-Web与爬虫/01-Web开发/00-Web框架对比与选型) —— aiohttp 在八框架中的定位
- [07-Sanic 轻量异步框架](/docs/python/01-Web与爬虫/01-Web开发/07-Sanic轻量异步框架) —— 同为轻量异步路线的框架化对照
- [04-反爬对抗策略](/docs/python/01-Web与爬虫/02-爬虫/04-反爬对抗策略) —— aiohttp 客户端一侧在爬虫中的实战
- aiohttp 官方文档（服务端）：https://docs.aiohttp.org/en/stable/web.html
- aiohttp Web 高级用法参考：https://docs.aiohttp.org/en/stable/web_advanced.html

> 🧭 本系列其余篇目与 Python 学习路线统一维护在 [导航总览](/docs/python/02-基础与入门/00-导航总览)。
