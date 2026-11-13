---
title: Quart 异步 Flask
description: Quart 上手与 Flask 迁移：API 兼容的异步框架——对比代码看差异、async 视图与上下文、Flask 扩展生态的异步替代，以及适用边界。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# Quart 异步 Flask

> **本篇做什么**：讲清 Quart 的定位——"Flask API 兼容的异步框架"，用对比代码展示从 Flask 迁移的真实改动量，覆盖 async 视图、上下文对象的异步语义、Flask 扩展生态的替代方案，最后划定适用边界。
> **产出**：一份"Flask → Quart"迁移对照清单，以及一个含异步数据库调用的 Quart 示例应用。
> **前置篇**：[Flask 入门指南](/docs/python/01-Web与爬虫/01-Web开发/03-Flask/01-flask入门指南)（强烈建议先读，本篇大量对照 Flask 写法）。事件循环基础见 [asyncio 基础](/docs/python/09-进阶核心/02-异步编程/01-asyncio基础)。

## 概念说明

Quart 的定位在 Python Web 框架里独一无二：**复刻 Flask 的 API，把底层从 WSGI 换成 ASGI**。路由装饰器、请求响应对象、蓝图、上下文对象（`g`、`current_app`、`request`）的名字和语义都与 Flask 一致，核心变化只有一条——视图函数写成 `async def`，I/O 调用改成 `await`。

它解决一个真实痛点：**大量存量项目构建在 Flask 上，同步模型在高并发 I/O 场景下要靠进程/线程堆资源**。全部重写到 FastAPI 意味着换掉整个编程模型；迁移到 Quart 则可以渐进进行——先换框架壳，再逐个视图异步化。

| 维度 | Flask | Quart |
|---|---|---|
| 协议 | WSGI | ASGI |
| 视图签名 | `def view()` | `async def view()` |
| I/O 调用 | 同步库 | `await` 异步库 |
| 上下文对象 | `request`/`g`/`current_app` | 同名同义（异步安全版） |
| 蓝图 | `Blueprint` | `Blueprint` |
| 扩展生态 | 丰富 | 部分兼容，异步需求需替代品 |
| 模板/Jinja2 | 同步渲染 | 支持异步渲染（`await render_template`） |
| WebSocket | 需 Flask-Sock 等扩展 | 原生支持 |

::: tip 一句话判断要不要用它
存量 Flask 项目 + 异步 I/O 痛点（外部 API 调用多、数据库等待长、高并发）→ Quart 是改动量最小的路径。新项目 → 先考虑 FastAPI/Litestar 的类型驱动体系，除非团队坚持 Flask 风格。
:::

## 安装与最小应用

```bash
pip install quart
```

```python
from quart import Quart

app = Quart(__name__)


@app.get("/health")
async def health():
    return {"status": "ok"}
```

启动开发服务器：

```bash
hypercorn main:app --reload
```

- Quart 使用 **Hypercorn** 作为标准 ASGI 服务器（同一团队出品），Uvicorn 也能运行。
- `--reload` 只用于开发；生产用 `hypercorn main:app --workers 4`。

对照 Flask 的最小应用，差异只有两处：`Flask` → `Quart`，`def` → `async def`。

## Flask 迁移对照：对比代码

### 视图与请求解析

**Flask 写法：**

```python
from flask import Flask, jsonify, request

app = Flask(__name__)


@app.route("/items/<int:item_id>", methods=["GET"])
def get_item(item_id):
    keyword = request.args.get("keyword", "")
    return jsonify({"id": item_id, "keyword": keyword})


@app.route("/items", methods=["POST"])
def create_item():
    data = request.get_json()
    return jsonify({"created": data}), 201
```

**Quart 写法：**

```python
from quart import Quart, jsonify, request

app = Quart(__name__)


@app.route("/items/<int:item_id>", methods=["GET"])
async def get_item(item_id):
    keyword = request.args.get("keyword", "")
    return jsonify({"id": item_id, "keyword": keyword})


@app.route("/items", methods=["POST"])
async def create_item():
    data = await request.get_json()   # 请求体读取变成 await
    return jsonify({"created": data}), 201
```

改动量一目了然：**视图加 `async`，阻塞性 I/O 调用加 `await`，其余不动**。Quart 保留了 `@app.route`、`jsonify`、`request.args` 全套 API。

### 上下文对象

```python
from quart import g, current_app, render_template


@app.route("/profile")
async def profile():
    # g 对象在请求生命周期内共享数据，语义与 Flask 一致
    if "db" not in g:
        g.db = await current_app.config["DB_POOL"].acquire()
    user = await g.db.fetchrow("SELECT * FROM users WHERE id = $1", 1)
    # 模板渲染也是异步的
    return await render_template("profile.html", user=user)
```

::: warning 上下文对象的异步安全语义
Flask 的 `g`/`current_app` 依赖"每线程一个上下文"；Quart 的实现基于 `contextvars`，保证**每个异步任务看到自己的上下文**——并发请求不会串数据。这正是异步框架必须重写上下文机制的原因，也是直接在 Flask 里混用 async 视图做不到的隔离性。不要在多个并发协程间共享同一个请求的 `request`/`g` 引用之外，再做跨请求共享。
:::

### before/after 请求钩子

```python
import time
import uuid

from quart import Quart, g, request

app = Quart(__name__)


@app.before_request
async def before():
    g.request_id = uuid.uuid4().hex
    g.start = time.perf_counter()


@app.after_request
async def after(response):
    elapsed = time.perf_counter() - g.start
    response.headers["X-Request-ID"] = g.request_id
    response.headers["X-Duration"] = f"{elapsed:.3f}"
    return response
```

钩子 API 与 Flask 同名同义，唯一区别是钩子函数本身 `async`。

### 蓝图

```python
from quart import Blueprint, jsonify

api = Blueprint("api", __name__, url_prefix="/api/v1")


@api.get("/users")
async def list_users():
    return jsonify({"users": []})


app.register_blueprint(api)
```

蓝图完全同构，存量 Flask 项目的模块划分可以原样搬过来。

## 异步视图与真实 I/O

Quart 的收益来自把**整条 I/O 链**异步化。一个接入异步数据库的完整示例：

```python
import asyncpg
from quart import Quart, jsonify

app = Quart(__name__)


@app.before_serving          # 服务启动前初始化连接池
async def init_pool():
    app.pool = await asyncpg.create_pool(
        dsn="postgresql://user:pass@localhost/mydb",
        min_size=2,
        max_size=10,
    )


@app.after_serving           # 服务关闭时释放
async def close_pool():
    await app.pool.close()


@app.get("/users/<int:user_id>")
async def get_user(user_id: int):
    async with app.pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, name, email FROM users WHERE id = $1", user_id
        )
    if row is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(dict(row))
```

要点：

- `before_serving` / `after_serving` 是 Quart 的应用级生命周期钩子，等价于 aiohttp 的 `on_startup`/`on_cleanup` 信号。
- 异步数据库驱动（asyncpg/aiomysql）与 SQLAlchemy 2.0 异步会话的完整模式，见 [异步数据库与 SQLAlchemy](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/03-异步数据库与SQLAlchemy)——Quart 中的接入方式完全同构。
- **最关键的迁移纪律**：`async def` 视图里绝不能残留同步阻塞调用（`requests`、同步驱动、`time.sleep`），否则一个请求卡住整个 worker。残留的同步库要么换异步版，要么用 `asyncio.to_thread` 临时包裹。取舍原理见 [asyncio 基础](/docs/python/09-进阶核心/02-异步编程/01-asyncio基础)。

Quart 也原生支持 WebSocket 与 SSE：

```python
from quart import websocket


@app.websocket("/ws")
async def ws():
    while True:
        message = await websocket.receive()
        await websocket.send(f"echo: {message}")
```

对比 Flask 需要 Flask-Sock 扩展 + 线程模型，Quart 的 WebSocket 是一等公民且天然异步。

## 扩展生态兼容性

Flask 的价值一半在扩展生态，迁移 Quart 的核心问题是：**这些扩展还能用吗？**

| Flask 扩展 | Quart 下的替代方案 | 说明 |
|---|---|---|
| flask-sqlalchemy | 直接用 SQLAlchemy 2.0 异步引擎自行集成 | 官方扩展是同步设计，异步需求走原生 SQLAlchemy |
| flask-login | quart-auth / 自行实现 | 会话管理语义相近，需要适配异步调用 |
| flask-cors | quart-cors | API 基本一致的移植版 |
| flask-jwt-extended | 直接用 PyJWT/自实现 | Token 逻辑本就与框架无关，见 [认证与 JWT](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/04-认证与JWT) |
| flask-migrate | Alembic 直接接入 | 迁移工具不依赖框架 |
| flask-caching | quart-cache | 异步版缓存封装 |
| flask-wtf | 不建议平移 | 表单 CSRF 可用中间件/手写方案，API 项目通常不需要 |
| OpenAPI（flask-smorest 等） | 需另行选择（如接 OpenAPI 生成库） | Quart 无对应的成熟全家桶，这是明显短板 |

::: warning 兼容性的真实边界
Quart 官方维护了一份扩展兼容列表，**纯计算类扩展多数直接可用，涉及 I/O 的扩展（数据库、缓存、会话）必须换异步实现**——它们内部调用同步 I/O，在 Quart 的 async 视图里就是阻塞点。迁移评估时把"项目用了哪些扩展"列成清单逐个判断，比记住任何通用规则都可靠。常用扩展应通过依赖管理锁定版本，见 [依赖管理](/docs/python/03-工程化与运维/01-工程化/04-依赖管理)。
:::

## 适用边界

### 什么时候选 Quart

- **存量 Flask 项目渐进异步化**：改动量最小的迁移路径，业务代码逐文件推进，新旧风格可共存过渡。
- **团队 Flask 经验深厚**：保持既有心智模型与代码风格，学习成本接近零。
- **需要 WebSocket/SSE 但不想换框架**：相比 Flask + 扩展 + 线程模型的组合，Quart 原生且异步。

### 什么时候不选

| 场景 | 更合适的选择 | 原因 |
|---|---|---|
| 全新 API 项目，需要类型驱动校验与自动文档 | FastAPI | Quart 无内置校验/文档体系，从零开始时优势只剩"风格熟悉" |
| 希望框架内置 DTO/守卫等工程能力 | Litestar | Quart 继承 Flask 微核哲学，工程能力全靠自建 |
| 极致轻量的流式/推送网关 | Sanic | 两者定位相近，Sanic 自带服务器且流式 API 更顺手 |
| 同步 I/O 为主、并发量低的内部工具 | 留在 Flask | 没有异步收益，就不承担迁移与异步心智成本 |

::: tip 迁移决策的最小实验
拿项目里"调用外部 API 最多的一个接口"先在 Quart 里跑通异步版本，压测对比单实例吞吐。**收益看得见再全量迁移**；如果瓶颈在 CPU 或同步 ORM 的复杂查询上，换框架解决不了问题，先优化查询与缓存更有效。压测与容量规划见 [部署与运行](/docs/python/03-工程化与运维/02-运维/03-部署与运行)。
:::

## 常见陷阱

| 陷阱 | 现象 | 正确做法 |
|---|---|---|
| 迁移后残留同步 I/O 库 | async 视图里 `requests`/同步驱动，worker 被卡死 | 逐个替换为异步库或 `asyncio.to_thread` 包裹 |
| 以为 flask-sqlalchemy 能直接用 | 扩展内部同步 I/O，异步收益归零 | 改用 SQLAlchemy 原生异步引擎 |
| 在普通 `def` 里写 `await` | 语法错误 | 上下文里的钩子、CLI 命令、视图全部声明为 `async` |
| 跨请求共享 request/g 引用 | 并发请求数据串扰 | 上下文对象只在当前请求任务内使用 |
| 生产环境继续用 `app.run()` | 单进程、无并发参数 | Hypercorn/Uvicorn 多 worker 部署 |
| 迁移只改框架不改数据库驱动 | 高并发下连接池耗尽或阻塞 | 连接池与驱动一起换异步版本 |
| 全量迁移不做灰度 | 新框架问题在生产集中爆发 | 按蓝图/模块渐进迁移，压测验证后再推进 |

## 小结

- Quart = Flask API + ASGI 底层，迁移改动量是"加 async/await"，装饰器、蓝图、上下文对象全部同名同义。
- 请求体读取、模板渲染、钩子函数全面异步化；上下文基于 `contextvars` 实现异步安全的请求隔离。
- 生命周期用 `before_serving`/`after_serving` 管理连接池；WebSocket 是原生一等能力。
- 扩展生态是最大短板：I/O 类扩展必须换异步实现，数据库场景直接用 SQLAlchemy 原生异步集成。
- 边界清晰：它是**存量 Flask 项目的渐进迁移工具**，不是新 API 项目的最优起点。

## 延伸阅读

- [Flask 入门指南](/docs/python/01-Web与爬虫/01-Web开发/03-Flask/01-flask入门指南) —— 本篇所有对照写法的同步版出处
- [00-Web 框架对比与选型](/docs/python/01-Web与爬虫/01-Web开发/00-Web框架对比与选型) —— Quart 与其他七框架的横向定位
- [异步数据库与 SQLAlchemy](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/03-异步数据库与SQLAlchemy) —— 迁移中最关键的一环：异步数据层
- Quart 官方文档：https://quart.palletsprojects.com/
- Hypercorn 官方文档：https://hypercorn.readthedocs.io/

> 🧭 本系列其余篇目与 Python 学习路线统一维护在 [导航总览](/docs/python/02-基础与入门/00-导航总览)。
