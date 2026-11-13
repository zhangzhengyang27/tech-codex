---
title: FastAPI 入门与路由依赖
description: FastAPI 快速上手：最小应用、路径与查询参数、Pydantic 模型与响应过滤、依赖注入 Depends 基础，以及自动交互式文档。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# FastAPI 入门与路由依赖

> **本篇做什么**：讲清 FastAPI 的定位与心智模型，从最小可运行应用出发，依次覆盖路径参数、查询参数、请求体与响应模型、依赖注入 `Depends` 的基础用法。
> **产出**：一个带自动交互式文档的示例服务，包含类型安全的参数声明和可复用的分页依赖。
> **前置篇**：无（系列首篇）。有 Flask 经验可直接对照阅读，参见 [Flask 入门指南](/docs/python/01-Web与爬虫/01-Web开发/03-Flask/01-flask入门指南)。

## FastAPI 是什么

FastAPI 是构建在 **Starlette**（高性能 ASGI 工具箱）之上的现代 Python Web 框架，数据层则基于 **Pydantic**。理解这个分层是理解 FastAPI 的关键：

- **Starlette** 负责 HTTP 层：路由、请求响应对象、中间件、WebSocket。
- **Pydantic** 负责数据层：类型标注驱动的参数校验、序列化与反序列化。
- **FastAPI** 在两者之上提供胶水层：把"函数签名"翻译成"参数解析 + 校验 + 文档"。

它的三个核心卖点都源于这个设计：

1. **类型即校验**：你用 Python 类型标注声明参数，框架自动完成校验和错误响应（422）。
2. **原生异步**：基于 ASGI，`async def` 视图可以直接 `await` 异步 I/O，单进程即可扛高并发 I/O 密集型流量。
3. **文档免费**：函数签名 + Pydantic 模型自动生成 OpenAPI 规范，附带可交互的 Swagger UI。

| 维度 | Flask | Django | FastAPI |
|---|---|---|---|
| 协议 | WSGI | WSGI（ASGI 可选） | ASGI 原生 |
| 参数校验 | 手动/扩展 | Form/Serializer | Pydantic 自动 |
| API 文档 | 需扩展（drf-spectacular 等） | 需 DRF + 扩展 | 内置 Swagger/ReDoc |
| 异步支持 | 有限 | 渐进支持 | 原生一等公民 |
| 适合场景 | 通用 Web、中小项目 | 全栈、带 ORM/Admin 的重项目 | API 服务、微服务、AI 推理接口 |

::: tip 心智模型
在 Flask 里，你写"接收什么、怎么处理"靠约定；在 FastAPI 里，**函数签名就是接口契约**——路径在哪、参数叫什么、什么类型、如何校验、返回什么，全部由签名和类型标注声明。
:::

## 安装与最小应用

```bash
pip install "fastapi[standard]" uvicorn
```

创建 `main.py`：

```python
from fastapi import FastAPI

app = FastAPI(
    title="示例服务",
    description="FastAPI 系列第 1 篇示例",
    version="0.1.0",
)


@app.get("/")
async def root():
    return {"message": "Hello FastAPI"}


@app.get("/health")
async def health():
    return {"status": "ok"}
```

启动开发服务器：

```bash
uvicorn main:app --reload
```

- `main:app` 表示 `main.py` 中的 `app` 对象。
- `--reload` 监听代码变更自动重启，**只用于开发**。
- 访问 `http://127.0.0.1:8000/` 得到 JSON 响应；访问 `http://127.0.0.1:8000/docs` 打开交互式文档。

::: warning 关于 async 与 def
路径函数用 `async def` 还是普通 `def` 都可以。`async def` 中如果执行了同步阻塞调用（如 `time.sleep`、同步数据库驱动），会**阻塞整个事件循环**。不确定时可以写普通 `def`，FastAPI 会把它放进线程池执行，同样不阻塞。异步取舍详见本系列第 3 篇。
:::

## 路径参数

路径参数通过 URL 中的 `{}` 占位符声明，**类型标注决定解析与校验行为**：

```python
from enum import Enum

from fastapi import FastAPI, HTTPException

app = FastAPI()


class Category(str, Enum):
    """继承 str 的枚举可以直接参与 JSON 序列化"""

    electronics = "electronics"
    books = "books"


@app.get("/items/{item_id}")
async def read_item(item_id: int):
    # item_id: int —— 请求 /items/abc 会直接返回 422，函数体根本不会执行
    return {"item_id": item_id}


@app.get("/items/category/{category}")
async def read_category(category: Category):
    # 请求 /items/category/food 返回 422，并提示合法取值
    return {"category": category}


@app.get("/files/{file_path:path}")
async def read_file(file_path: str):
    # :path 转换器允许路径中包含斜杠，如 /files/a/b/c.txt
    return {"file_path": file_path}
```

注意路由匹配顺序：**先注册的先匹配**。`/items/me` 这类固定路径要注册在 `/items/{item_id}` 之前，否则会被参数路由吞掉。

业务级的"资源不存在"用 `HTTPException` 表达：

```python
fake_db = {1: "foo", 2: "bar"}


@app.get("/items/{item_id}")
async def get_item(item_id: int):
    if item_id not in fake_db:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"item": fake_db[item_id]}
```

## 查询参数

函数签名中**不在路径里**的参数，FastAPI 自动识别为查询参数：

```python
from typing import Annotated

from fastapi import FastAPI, Query

app = FastAPI()


@app.get("/items/")
async def list_items(
    skip: int = 0,                        # ?skip=20，有默认值即可选
    limit: int = 10,                      # ?limit=5
    keyword: str | None = None,           # ?keyword=python，可省略
    featured: bool = False,               # ?featured=true（1/yes/on/true 均可解析）
    q: Annotated[str | None, Query(min_length=2, max_length=50)] = None,
):
    # Query() 为查询参数附加校验约束
    return {"skip": skip, "limit": limit, "keyword": keyword,
            "featured": featured, "q": q}
```

要点：

- `q: str`（无默认值）表示**必填**查询参数，缺失时返回 422；`q: str | None = None` 表示可选。
- `bool` 类型解析很宽松：`true`、`True`、`1`、`yes`、`on` 都算真。
- 同名参数可以声明为 `list[str]`，接收 `?tag=a&tag=b`。

```python
@app.get("/search/")
async def search(tags: list[str] = Query(default=[])):
    return {"tags": tags}  # /search/?tags=python&tags=web
```

## 请求体与 Pydantic 模型

POST/PUT 的 JSON 请求体用 Pydantic 模型声明，校验完全自动：

```python
from fastapi import FastAPI, status
from pydantic import BaseModel, EmailStr, Field

app = FastAPI()


class ItemCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    price: float = Field(gt=0, description="单价，必须大于 0")
    tags: list[str] = []
    owner_email: EmailStr  # 需要 pip install "pydantic[email]"


@app.post("/items/", status_code=status.HTTP_201_CREATED)
async def create_item(item: ItemCreate):
    # 走到这里时，item 一定已经通过校验
    saved = {"id": 1, **item.model_dump()}
    return saved
```

请求体校验失败时，FastAPI 返回结构化的 422 响应，指出**哪个字段、什么原因**：

```json
{
  "detail": [
    {"type": "greater_than", "loc": ["body", "price"], "msg": "Input should be greater than 0"}
  ]
}
```

Pydantic 的校验能力远不止于此——字段约束、嵌套模型、自定义校验器、严格模式等在[第 2 篇：Pydantic 数据校验](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/02-Pydantic数据校验)中系统展开。

## 响应模型：response_model

**输入模型 ≠ 输出模型**。用 `response_model` 声明返回结构，框架会过滤掉多余字段——这是防止敏感信息（密码哈希、内部状态）泄漏到 API 的第一道闸门：

```python
from fastapi import FastAPI
from pydantic import BaseModel, EmailStr

app = FastAPI()


class UserIn(BaseModel):
    username: str
    email: EmailStr
    password: str          # 入参需要


class UserOut(BaseModel):
    id: int
    username: str
    email: EmailStr        # 出参绝不含 password


fake_db: dict[int, UserOut] = {}


@app.post("/users/", response_model=UserOut)
async def create_user(user: UserIn):
    saved = UserOut(id=1, username=user.username, email=user.email)
    fake_db[saved.id] = saved
    return saved  # 即使返回的对象带 password 字段，响应中也会被过滤
```

常用配套声明：

```python
from fastapi import status

@app.get("/users/{user_id}",
         response_model=UserOut,
         status_code=status.HTTP_200_OK,
         summary="查询单个用户",
         response_description="用户公开信息",
         tags=["users"])
async def get_user(user_id: int) -> UserOut:
    ...
```

这些元信息（`summary`、`tags`、`response_model`）不是装饰品，它们直接决定自动文档的质量。

## 依赖注入：Depends 基础

`Depends` 是 FastAPI 的骨架机制：**把"准备数据/校验权限/获取资源"从路径函数里抽出去，声明成可复用、可组合的依赖**。

### 最简依赖：公共查询参数

分页参数几乎每个列表接口都要，抽成一个依赖：

```python
from typing import Annotated

from fastapi import Depends, FastAPI, Query

app = FastAPI()


async def pagination(
    skip: int = 0,
    limit: Annotated[int, Query(le=100)] = 10,
) -> dict:
    """分页参数依赖：多个路由共享，改一处全局生效"""
    return {"skip": skip, "limit": limit}


PageDep = Annotated[dict, Depends(pagination)]


@app.get("/items/")
async def list_items(page: PageDep):
    return {"page": page, "data": [...]}


@app.get("/users/")
async def list_users(page: PageDep):
    return {"page": page, "data": [...]}
```

### 依赖可以嵌套

依赖本身还可以依赖别的依赖，FastAPI 会自动解析整棵依赖树并缓存结果（同一请求内同一个依赖只执行一次）：

```python
async def current_tenant(page: PageDep) -> dict:
    """依赖 pagination —— 链式复用"""
    return {"tenant": "acme", **page}


@app.get("/tenant-items/")
async def tenant_items(tenant: Annotated[dict, Depends(current_tenant)]):
    return tenant
```

### yield 依赖：带清理逻辑的资源

用 `yield` 声明"获取资源 → 使用 → 清理"的生命周期，是数据库会话管理的标准姿势：

```python
async def get_session():
    session = SessionLocal()          # 请求进入：创建会话
    try:
        yield session                 # 请求期间：交给路径函数
    finally:
        await session.close()         # 请求结束：无论成败都执行
```

数据库会话的完整异步实现（`async_sessionmaker`、连接池、`expire_on_commit` 取舍）见[第 3 篇：异步数据库与 SQLAlchemy](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/03-异步数据库与SQLAlchemy)；类依赖、依赖缓存开关、全局依赖等进阶用法见[第 5 篇：中间件与依赖注入进阶](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/05-中间件与依赖注入进阶)。

## 自动文档

启动应用后，两个文档站点开箱即用：

| 地址 | 内容 |
|---|---|
| `/docs` | Swagger UI——可交互，能直接填参数发请求 |
| `/redoc` | ReDoc——排版更适合阅读和导出 |
| `/openapi.json` | 原始 OpenAPI 规范，供代码生成、网关导入 |

文档质量的下限取决于函数签名的完备程度。提升文档可读性的三个手段：

```python
from pydantic import BaseModel, Field


class ItemCreate(BaseModel):
    name: str = Field(..., description="商品名", examples=["机械键盘"])
    price: float = Field(..., gt=0, description="单价")


@app.post(
    "/items/",
    response_model=dict,
    summary="创建商品",
    description="创建商品并返回完整记录。价格必须大于 0。",
    tags=["商品管理"],
)
async def create_item(item: ItemCreate):
    """这个 docstring 也会出现在 Swagger 文档中"""
    return {"id": 1, **item.model_dump()}
```

::: tip 文档即测试
`/docs` 的价值不止于展示——联调时前后端可以直接在 Swagger UI 里发起真实请求，参数结构、必填项、错误响应一目了然，能省掉大量"接口文档对不上"的沟通成本。
:::

## 常见陷阱

| 陷阱 | 现象 | 正确做法 |
|---|---|---|
| `async def` 里调用同步阻塞库 | 整个服务卡顿、并发能力归零 | 换异步驱动，或把视图改成 `def` 交给线程池 |
| 固定路径注册在参数路径之后 | `/items/me` 被 `/items/{item_id}` 截胡 | 更具体的路由先注册 |
| 直接返回 ORM 对象 | 序列化报错或泄漏字段 | 声明 `response_model`，配合 `from_attributes` |
| 依赖写成函数调用 `pagination()` | 参数不被 FastAPI 解析 | 写 `Depends(pagination)` |
| 在 `response_model` 之外随手塞敏感字段 | 密码、内部 ID 泄漏到响应 | 输入输出模型分离，响应永远过 `response_model` |
| 生产环境开 `--reload` | 性能差、行为不可预测 | reload 只用于开发 |

## 小结

- FastAPI = Starlette（ASGI HTTP 层）+ Pydantic（数据校验层），函数签名就是接口契约。
- 路径参数、查询参数、请求体全部由类型标注驱动，校验失败统一 422。
- `response_model` 负责输出过滤，输入输出模型分离是 API 安全的基本功。
- `Depends` 把横切逻辑（分页、会话、鉴权）变成可组合的声明式单元。
- `/docs` 与 `/redoc` 免费获得，质量取决于签名与模型元信息的完备程度。

## 延伸阅读

- [02-Pydantic 数据校验](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/02-Pydantic数据校验) —— 字段约束、嵌套模型与校验器，把 `Field(...)` 用透
- [03-异步数据库与 SQLAlchemy](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/03-异步数据库与SQLAlchemy) —— 把 `yield` 依赖落到真实的异步会话管理
- [05-中间件与依赖注入进阶](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/05-中间件与依赖注入进阶) —— 类依赖、全局依赖与依赖缓存语义
- [Flask 入门指南](/docs/python/01-Web与爬虫/01-Web开发/03-Flask/01-flask入门指南) —— 有 Flask 背景可对照迁移
- FastAPI 官方文档（中文）：https://fastapi.tiangolo.com/zh/
- Starlette 官方文档：https://www.starlette.io/

> 🧭 本系列其余篇目与 Python 学习路线统一维护在 [导航总览](/docs/python/02-基础与入门/00-导航总览)。
