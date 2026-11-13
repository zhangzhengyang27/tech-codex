---
title: Sanic 轻量异步框架
description: Sanic 上手实战：类 Flask API 的异步框架——路由、中间件与蓝图、流式响应与 WebSocket，以及何时不如 FastAPI/Litestar 的适用边界。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# Sanic 轻量异步框架

> **本篇做什么**：讲清 Sanic 的定位与核心用法——路由、请求响应对象、中间件、蓝图、流式响应，最后给出"什么时候该选它、什么时候不如 FastAPI/Litestar"的边界判断。
> **产出**：一个含蓝图拆分、中间件链与流式响应的 Sanic 服务示例。
> **前置篇**：[00-Web 框架对比与选型](/docs/python/01-Web与爬虫/01-Web开发/00-Web框架对比与选型)（定位背景）。事件循环、协程基础不在本篇展开，见 [asyncio 基础](/docs/python/09-进阶核心/02-异步编程/01-asyncio基础)。

## 概念说明

Sanic 是一个异步原生的轻量 Web 框架，设计目标可以概括为一句话：**让会 Flask 的人无成本迁移到异步**。它保留了 Flask 风格的 API——装饰器路由、Blueprint、上下文对象——底层换成 ASGI，并自带一个生产可用的 HTTP 服务器（通常不需要额外装 Uvicorn/Gunicorn）。

它与类型驱动框架（FastAPI/Litestar）走的是不同路线：Sanic **不把类型注解当接口契约**，没有内置的参数校验体系和自动 OpenAPI 文档。换来的是概念数量少、心智负担轻、上手快。

| 特性 | Sanic 的处理方式 |
|---|---|
| 路由 | `@app.route` / `@app.get` 等装饰器，Flask 风格 |
| 蓝图 | `Blueprint`，与 Flask 概念同名同义 |
| 请求体解析 | `request.json` / `request.form` 手动获取 |
| 校验 | 不内置，自行接 Pydantic/其他库 |
| API 文档 | 不内置，自行接扩展或手写 OpenAPI |
| 服务器 | 自带生产级服务器，也可跑在 Uvicorn 下 |
| 流式响应 | `StreamingHTTPResponse` 原生支持 |

::: tip 定位一句话
Sanic 适合"我要一个异步的 Flask"——不想引入依赖注入与 DTO 那套体系，想要代码直白、部署链路短的场景。它是轻量工具，不是全家桶。
:::

## 安装与最小应用

```bash
pip install sanic
```

创建 `main.py`：

```python
from sanic import Sanic
from sanic.response import json

app = Sanic("demo")


@app.get("/health")
async def health(request):
    return json({"status": "ok"})


@app.post("/echo")
async def echo(request):
    # 请求体手动解析，框架不做校验
    data = request.json or {}
    return json({"received": data})
```

启动开发服务器：

```bash
sanic main.app --dev
```

- `main.app` 表示 `main.py` 中的 `app` 对象，写法类似 Uvicorn 的 `main:app`。
- `--dev` 开启自动重载与调试信息，**只用于开发**。
- 生产启动直接 `sanic main.app --host 0.0.0.0 --port 8000 --workers 4`，服务器是内置的。

## 路由与请求对象

路由装饰器与 Flask 几乎一致，支持多方法、动态参数与转换器：

```python
from sanic import Sanic
from sanic.response import json, text
from sanic.exceptions import NotFound

app = Sanic("demo")


@app.get("/items/<item_id:int>")
async def get_item(request, item_id: int):
    # <item_id:int> 是路径转换器，匹配失败走 404
    return json({"id": item_id})


@app.route("/files", methods=["GET", "POST"])
async def files(request):
    if request.method == "POST":
        return json({"created": True})
    return text("文件列表")


@app.get("/users/<name>")
async def get_user(request, name: str):
    if name != "admin":
        raise NotFound("用户不存在")
    return json({"name": name})
```

`request` 对象是唯一的入口参数（对比 FastAPI 把参数拆进函数签名），常用属性：

```python
async def inspect_request(request):
    request.args          # 查询参数，类似 dict，request.args.get("page")
    request.json          # JSON 请求体（自动解析）
    request.form          # 表单数据
    request.files         # 上传文件
    request.headers       # 请求头
    request.cookies       # Cookie
    request.ip            # 客户端 IP
    request.path          # 路径
    ctx                   # request.ctx，本请求内的自由挂载点
```

`request.ctx` 是中间件与视图之间传数据的惯用法：中间件解析出的用户信息、请求 ID 都挂在上面，视图直接取用。这与 Flask 的 `g` 对象、FastAPI 依赖注入是三种解决同一问题的方案——**Sanic 选了"共享上下文对象"而不是"依赖注入"**。

## 中间件与蓝图

### 中间件

Sanic 的中间件分 `request` 与 `response` 两类，按注册顺序形成链：

```python
import time
import uuid

from sanic import Sanic
from sanic.response import json

app = Sanic("demo")


@app.middleware("request")
async def add_request_id(request):
    # 请求阶段：自上而下执行
    request.ctx.request_id = uuid.uuid4().hex
    request.ctx.start_time = time.perf_counter()


@app.middleware("response")
async def add_headers(request, response):
    # 响应阶段：自下而上执行
    response.headers["X-Request-ID"] = request.ctx.request_id
    elapsed = time.perf_counter() - request.ctx.start_time
    response.headers["X-Duration"] = f"{elapsed:.3f}"


@app.on_request
async def log_path(request):
    # on_request 是 @middleware("request") 的别名写法
    print(f"[{request.ctx.request_id}] {request.method} {request.path}")
```

::: warning 执行顺序要背下来
`request` 中间件按**注册顺序**执行，`response` 中间件按**注册逆序**执行——像洋葱一样包住请求处理。把"耗时统计的起点"写在 request 阶段、"终点"写在 response 阶段，顺序错了数据就是错的。
:::

### 蓝图

蓝图（Blueprint）是 Sanic 组织中大型项目的标准方式，语义与 Flask 一致：

```python
from sanic import Blueprint
from sanic.response import json

api_v1 = Blueprint("api_v1", url_prefix="/api/v1")


@api_v1.get("/users")
async def list_users(request):
    return json({"users": []})


@api_v1.post("/users")
async def create_user(request):
    return json({"id": 1}, status=201)


# 主应用注册蓝图
app = Sanic("demo")
app.blueprint(api_v1)
```

蓝图支持分组嵌套、注册自己的中间件与监听器（`@api_v1.listener("before_server_start")` 等），大项目按"业务域拆蓝图"即可获得与 FastAPI 路由组、Litestar Controller 同级的模块化能力。

## 流式响应

流式响应是 Sanic 的招牌能力之一：不把整个响应攒在内存里，而是边生成边发送，适合大文件、AI 生成内容（LLM 逐 token 输出）、日志推送等场景。

```python
import asyncio

from sanic import Sanic
from sanic.response import stream, file_stream

app = Sanic("demo")


@app.get("/events")
async def events(request):
    async def gen(response):
        # 通过 response.write 边算边发
        for i in range(5):
            await asyncio.sleep(1)
            response.write(f"event-{i}\n")
        # 生成器返回后连接自动结束

    return stream(gen, content_type="text/plain; charset=utf-8")


@app.get("/download")
async def download(request):
    # 大文件同样流式发送，不占用整块内存
    return await file_stream("/data/export.csv", filename="export.csv")
```

LLM 接口的典型应用——把模型逐段输出转发给客户端：

```python
@app.post("/chat")
async def chat(request):
    prompt = (request.json or {}).get("prompt", "")

    async def gen(response):
        response.headers["Content-Type"] = "text/event-stream"
        async for chunk in fake_llm_stream(prompt):   # 异步迭代模型输出
            response.write(f"data: {chunk}\n\n")

    return stream(gen, content_type="text/event-stream")
```

::: tip 流式与普通响应的选择标准
响应体能否在"生成完成前"就开始发送？能——用流式（感知延迟低、内存占用小）；不能（需要整体校验/压缩/签名）——用普通响应。流式响应的 `Content-Length` 不可知，会改用 chunked 传输，部分网关/代理需要额外配置缓冲策略。
:::

Sanic 同样原生支持 WebSocket：

```python
@app.websocket("/ws")
async def ws_handler(request, ws):
    async for message in ws:
        await ws.send(f"echo: {message}")
```

## 适用边界

### 什么时候 Sanic 是好选择

- **从 Flask 迁移到异步**：API 形状高度相似，团队迁移成本低（也考虑 [Quart](/docs/python/01-Web与爬虫/01-Web开发/09-Quart异步Flask)，它兼容得更彻底）。
- **流式与推送密集**：SSE、逐 token 的 LLM 网关、大文件分发，流式 API 顺手。
- **想要短部署链路**：自带服务器，`sanic app --workers N` 一条命令起多 worker，少一层 Uvicorn/Gunicorn 的组合决策。
- **内部服务/网关/代理**：参数校验与文档自己有一套约定，或根本不需要对外文档。

### 什么时候不如 FastAPI/Litestar

| 场景 | 更合适的选择 | 原因 |
|---|---|---|
| 对外 API，需要自动文档与交互式调试 | FastAPI | Sanic 无内置 OpenAPI，手写文档长期是负担 |
| 复杂参数校验、响应过滤 | FastAPI/Litestar | 类型驱动的校验是这两个框架的核心能力，Sanic 要自行拼 Pydantic |
| 希望框架内置 DTO/守卫/权限 | Litestar | Sanic 的哲学是把这些都交给应用层 |
| 团队新人多，需要"签名即契约"防错 | FastAPI | Sanic 的手动解析容易漏校验，靠 review 兜底成本高 |

::: warning 客观比较
"不如"仅指上述场景的**工具匹配度**，不是性能或质量高下。在流式吞吐、轻量部署这些维度上 Sanic 自有优势；多框架共存时（如 API 用 FastAPI、网关用 Sanic），核心的 SQLAlchemy 异步用法、部署运维、安全通识完全互通，见 [异步数据库与 SQLAlchemy](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/03-异步数据库与SQLAlchemy) 与 [部署与运行](/docs/python/03-工程化与运维/02-运维/03-部署与运行)。
:::

## 常见陷阱

| 陷阱 | 现象 | 正确做法 |
|---|---|---|
| 用 `json=` 而不是 `request.json` 取请求体 | `AttributeError` 或取到 None | `request.json or {}` 防空兜底 |
| 校验逻辑散落在每个视图里 | 同一字段多处校验、规则漂移 | 统一封装解析函数或接 Pydantic，再赋给 `request.ctx` |
| request/response 中间件顺序想当然 | 耗时统计、请求 ID 时序错乱 | 记住"洋葱模型"：response 逆序执行 |
| 生产环境用 `--dev` | 自动重载、调试页暴露 | 生产用 `sanic app --workers N` 或容器化 |
| 流式响应前做了整体聚合 | 流式的延迟与内存优势归零 | 让数据一到达就 `response.write` |
| 在中间件里执行同步阻塞调用 | 阻塞整个 worker 事件循环 | 全链路异步库，或把阻塞任务丢线程池，见 [asyncio 基础](/docs/python/09-进阶核心/02-异步编程/01-asyncio基础) |

## 小结

- Sanic = Flask 的心智模型 + 原生异步 + 自带服务器，概念少、上手快、部署链路短。
- `request` 是唯一入口，跨层传数据用 `request.ctx`，与 Flask 的 `g`、FastAPI 的依赖注入是同一问题的不同答案。
- 中间件是洋葱模型（request 正序、response 逆序），蓝图负责按业务域拆分项目。
- 流式响应（`stream`/`file_stream`）与 WebSocket 是原生一等能力，适合推送与 LLM 网关场景。
- 边界清晰：无内置校验与文档体系，对外 API、复杂契约场景优先 FastAPI/Litestar。

## 延伸阅读

- [00-Web 框架对比与选型](/docs/python/01-Web与爬虫/01-Web开发/00-Web框架对比与选型) —— Sanic 在八框架中的定位
- [09-Quart 异步 Flask](/docs/python/01-Web与爬虫/01-Web开发/09-Quart异步Flask) —— Flask 迁移的另一条兼容度更高的路线
- [08-aiohttp 框架](/docs/python/01-Web与爬虫/01-Web开发/08-aiohttp框架) —— 更底层的异步服务端与 WebSocket 写法对照
- Sanic 官方文档：https://sanic.dev/zh/
- Sanic GitHub 仓库：https://github.com/sanic-org/sanic

> 🧭 本系列其余篇目与 Python 学习路线统一维护在 [导航总览](/docs/python/02-基础与入门/00-导航总览)。
