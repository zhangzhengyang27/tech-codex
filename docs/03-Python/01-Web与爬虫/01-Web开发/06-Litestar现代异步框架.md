---
title: Litestar 现代异步框架
description: Litestar 上手与进阶：路由与依赖注入、DTO 与数据校验、守卫与字段级权限、内置 OpenAPI，以及与 FastAPI 的差异对照。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# Litestar 现代异步框架

> **本篇做什么**：讲清 Litestar 的定位与核心机制——路由、依赖注入、DTO 数据层、守卫与权限控制，最后对照 FastAPI 给出差异点清单。
> **产出**：一个带 DTO 校验、依赖注入与路由级守卫的 Litestar 服务骨架。
> **前置篇**：[00-Web 框架对比与选型](/docs/python/01-Web与爬虫/01-Web开发/00-Web框架对比与选型)（定位背景）、[FastAPI 入门与路由依赖](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/01-FastAPI入门与路由依赖)（有 FastAPI 的 `Depends` 概念更易对照）。事件循环基础不在本篇展开，见 [asyncio 基础](/docs/python/09-进阶核心/02-异步编程/01-asyncio基础)。

## 概念说明

Litestar 是一个与 FastAPI 同代的类型驱动 ASGI 框架。两者共享同一条设计主线：**用类型标注声明接口，框架据此完成参数解析、校验与文档生成**。差异在工程取舍上——FastAPI 选择"核心精简 + Pydantic 深度绑定"，Litestar 选择"更多能力内置"：

- **DTO 抽象**：请求/响应数据层的转换与过滤由框架统一管理，且不绑死 Pydantic（支持 Pydantic、attrs、msgspec）。
- **守卫（Guards）**：授权检查是一等机制，可挂在应用、路由组、单条路由任意层级。
- **内置 OpenAPI**：文档生成是框架内核的一部分，不依赖第三方插件。
- **分层路由**：`Router`/`Controller` 面向"资源组"组织代码，而非纯装饰器平铺。

::: tip 心智模型
把 Litestar 理解为"FastAPI 的工程化完整版"：同样的类型驱动，但 DTO、守卫、权限、OpenAPI 这些在 FastAPI 里要靠约定与扩展拼出来的东西，Litestar 直接内置并给了统一写法。代价是概念数量更多、社区更小。
:::

## 安装与最小应用

```bash
pip install litestar uvicorn
# 数据校验层（Pydantic 集成）
pip install "litestar[pydantic]"
```

创建 `main.py`：

```python
from litestar import Litestar, get


@get("/health")
async def health() -> dict:
    return {"status": "ok"}


app = Litestar([health])
```

启动开发服务器：

```bash
uvicorn main:app --reload
```

与 FastAPI 的一个直观差异立刻出现：**路由不是挂在 `app` 对象上的方法**（`@app.get`），而是独立的处理函数装饰器（`@get`），再注册进 `Litestar` 实例。这让路由函数不依赖任何全局对象，测试与复用更干净。

启动后访问 `http://127.0.0.1:8000/schema` 可查看内置 OpenAPI 文档（默认启用）。

## 路由与 Controller

Litestar 的路由组织分三层：散装处理函数、`Router`（路由组）、`Controller`（资源类）。

```python
from litestar import Controller, Router, get, post


class UserController(Controller):
    """面向"资源"的路由组织：路径前缀与共享选项收敛在类上"""

    path = "/users"

    @get("/{user_id:int}")
    async def get_user(self, user_id: int) -> dict:
        return {"id": user_id, "name": "示例用户"}

    @post()
    async def create_user(self, data: dict) -> dict:
        return {"created": data}


users_router = Router(path="/api/v1", route_handlers=[UserController])
```

要点：

- 路径参数用 `{user_id:int}` 声明转换器，等价于 FastAPI 的 `item_id: int`。
- `Controller.path` 作为前缀，方法装饰器里的相对路径拼接其上。
- `Router` 再包一层，实现 `/api/v1` 这种版本前缀，替代 FastAPI 的 `APIRouter(prefix=...)`。

## 依赖注入

Litestar 的依赖注入用 `Dependency` / `Provide` 声明，依赖同样支持嵌套与每请求缓存：

```python
from litestar import get
from litestar.params import Dependency
from litestar.di import Provide


async def get_db_session() -> "AsyncSession":
    """伪代码：从引擎获取一个异步会话，请求结束自动关闭"""
    async with SessionLocal() as session:
        yield session


async def pagination(skip: int = 0, limit: int = 10) -> dict:
    return {"skip": skip, "limit": limit}


@get(
    "/items",
    dependencies={
        "session": Provide(get_db_session),
        "page": Provide(pagination),
    },
)
async def list_items(
    session: "AsyncSession",
    page: dict = Dependency(),
) -> dict:
    # page 由依赖注入填充；session 同理
    return {"page": page, "data": []}
```

对照 FastAPI 的写法：FastAPI 用 `Annotated[dict, Depends(pagination)]` 内联声明，Litestar 把"依赖名 → 提供者"的映射收敛到路由的 `dependencies` 参数，路由组与应用层也可以统一挂载。

- `Provide(get_db_session)` 传入"提供者函数"，Litestar 负责调用与生命周期。
- 生成器依赖（`yield`）的清理语义与 FastAPI 一致：请求结束后执行生成器收尾。
- 依赖默认在**同一请求内缓存**，多个路由参数引用同名依赖时只执行一次。

::: tip 全局依赖
`Litestar(dependencies={"session": Provide(get_db_session)})` 挂在应用级，所有路由自动可用——这是数据库会话注入的推荐姿势，避免每条路由重复声明。
:::

## DTO 与数据校验

FastAPI 直接把 Pydantic 模型放进函数签名；Litestar 引入了一层 **DTO 抽象**：数据模型通过 `DTOData` 或类型标注声明，序列化、过滤、文档生成由 DTO 层统一处理。

### 方式一：直接用 Pydantic 模型

安装 `litestar[pydantic]` 后，Pydantic 模型可以直接作为请求体类型：

```python
from litestar import post
from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str


@post("/users")
async def create_user(data: UserCreate) -> dict:
    # data 已通过校验
    return {"id": 1, "name": data.name, "email": data.email}
```

### 方式二：DTO 声明输入/输出分离

Litestar 的 `DataclassDTO` / `PydanticDTO` 可以基于**同一个模型**派生"写模型"与"读模型"，实现 FastAPI 中 `UserIn`/`UserOut` 双模型的同等效果：

```python
from dataclasses import dataclass, field
from litestar import get, post
from litestar.dto import DataclassDTO, DTOConfig, DTOData


@dataclass
class User:
    id: int
    name: str
    password: str
    email: str


class UserWriteDTO(DataclassDTO[User]):
    """写模型：只接收 name/password/email，id 由服务端生成"""

    config = DTOConfig(exclude={"id"})


class UserReadDTO(DataclassDTO[User]):
    """读模型：永不输出 password"""

    config = DTOConfig(exclude={"password"})


@post("/users", dto=UserWriteDTO, return_dto=UserReadDTO)
async def create_user(data: DTOData[User]) -> User:
    user = data.create_instance(id=1)  # 用 DTO 校验后的数据构造实例
    return user  # 响应经过 UserReadDTO，password 被过滤
```

::: warning 响应过滤不是可选项
"输入模型 ≠ 输出模型"在 Litestar 里由 DTO 层强制：`return_dto` 的 `exclude` 字段**一定不会**出现在响应中。这比"记得手写过滤"可靠得多，与 FastAPI `response_model` 的防御价值相同——防止密码哈希、内部字段泄漏到 API。
:::

## 守卫与字段级权限

守卫（Guard）是 Litestar 的授权机制：一个返回布尔值的函数，挂载在应用、路由组或单条路由上，不满足时抛 403。

```python
from litestar import Litestar, get
from litestar.connection import ASGIConnection
from litestar.exceptions import PermissionDeniedException
from litestar.handlers import get, post
from litestar.types import Guard


async def admin_guard(connection: ASGIConnection) -> None:
    """守卫：不满足条件直接抛 403"""
    user = connection.user
    if not getattr(user, "is_admin", False):
        raise PermissionDeniedException("需要管理员权限")


@post("/settings", guards=[admin_guard])
async def update_settings(data: dict) -> dict:
    return {"updated": data}
```

在守卫之上，Litestar 还提供**字段级权限**（`fields` 级别的读写控制）：DTO 配置可按"用户角色"声明哪些字段可见/可写，实现同一接口对不同角色返回不同字段集，这在 FastAPI 中通常要手写多个响应模型再加条件逻辑。

```python
class UserReadDTO(DataclassDTO[User]):
    config = DTOConfig(
        exclude={"password"},
        # 字段级权限：非管理员不可见 email（示意）
        # 具体策略函数签名随版本演进，以官方文档为准
    )
```

::: warning 认证 ≠ 授权
守卫解决的是**授权**（这个用户能不能做这件事）。**认证**（这个用户是谁）通常在中间件或认证后端完成，解析 Token、填充 `connection.user`。两者的通识（会话固定、Token 存储、密码哈希）见 [认证与 JWT](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/04-认证与JWT) 与 [密码存储与认证安全](/docs/python/01-Web与爬虫/01-Web开发/05-Web安全/02-密码存储与认证安全)。
:::

## 内置生态速览

Litestar 把一批"FastAPI 里靠扩展"的能力收进了内核：

| 能力 | Litestar 内置形态 | FastAPI 常见做法 |
|---|---|---|
| OpenAPI 文档 | 内置生成，`/schema` 可视化 | 自动生成 Swagger/ReDoc（同样内置） |
| DTO 输入输出分离 | `DataclassDTO`/`PydanticDTO` + `DTOConfig` | 手写 In/Out 双模型 + `response_model` |
| 授权 | 守卫 + 字段级权限 | 依赖函数里手动抛 403 |
| 依赖注入 | `Provide` + 应用级全局依赖 | `Depends` + `dependencies=[...]` |
| 消息订阅 | 原生 WebSocket/SSE 支持与生命周期管理 | Starlette WebSocket + 自行管理 |
| ORM 集成 | 官方 advanced-alchemy（可选） | 自行组装 SQLAlchemy 异步会话 |
| 数据库迁移 | advanced-alchemy + Alembic 集成 | Alembic 手动接入 |

说明两点：

- **advanced-alchemy** 是 Litestar 官方维护的 SQLAlchemy 扩展层，提供仓库模式与会话管理；不用它、直接接 SQLAlchemy 2.0 异步会话也完全可行，接入模式与 [异步数据库与 SQLAlchemy](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/03-异步数据库与SQLAlchemy) 中的一致。
- **OpenAPI 内置**不等于 FastAPI 没有文档能力，两者都能开箱生成文档；差别在于 Litestar 的文档生成与 DTO 层联动更深，自定义空间（schema 名称、响应过滤联动）更大。

## 中间件与异常处理

中间件与 FastAPI/Starlette 的概念一致，签名风格略有不同：

```python
import time
from litestar import Litestar, Request, get
from litestar.middleware import AbstractMiddleware


class TimingMiddleware(AbstractMiddleware):
    async def call(self, scope, receive, send) -> None:
        start = time.perf_counter()
        await self.app(scope, receive, send)
        elapsed = time.perf_counter() - start
        print(f"{scope['path']} 耗时 {elapsed:.3f}s")


@get("/ping")
async def ping() -> dict:
    return {"pong": True}


app = Litestar([ping], middleware=[TimingMiddleware])
```

异常统一映射为响应：

```python
from litestar import Litestar, get
from litestar.exceptions import NotFoundException
from litestar.status_codes import HTTP_404_NOT_FOUND


@get("/items/{item_id:int}")
async def get_item(item_id: int) -> dict:
    if item_id != 1:
        raise NotFoundException("Item not found")
    return {"id": item_id}
```

::: tip 异常即文档
Litestar 的异常体系与 OpenAPI 联动：路由声明中可通过 `raises`/`status_codes` 把"可能抛出的异常"写进接口契约，文档会列出对应的错误响应——把错误处理从"口口相传"变成"接口签名的一部分"。
:::

## 与 FastAPI 的差异点

两边都在活跃演进，以下按**稳定的架构差异**归纳，具体 API 细节以各自官方文档为准：

| 维度 | FastAPI | Litestar |
|---|---|---|
| 数据层绑定 | Pydantic 深度绑定 | DTO 抽象，Pydantic/attrs/msgspec 可选 |
| 路由组织 | `@app.get` / `APIRouter` 装饰器平铺 | 散装函数 + `Router` + `Controller` 分层 |
| 依赖声明 | `Depends` / `Annotated` 内联 | `Provide` + `dependencies` 映射，路由组收敛 |
| 授权 | 依赖函数内手写检查 | 守卫机制 + 字段级权限内置 |
| 上下文注入 | 无直接等价物 | `connection.context` 应用级共享状态 |
| 生态规模 | 最大，第三方集成丰富 | 较小，官方包（advanced-alchemy 等）补齐 |
| 中文资料 | 丰富（官方中文文档） | 较少，主要读英文文档 |

**怎么选**：

- 团队要"社区最大、资料最多、招聘容易"→ FastAPI。
- 团队重视"开箱即用的工程能力、更少的自研胶水"，且不介意读英文文档 → Litestar。
- 两者都是 ASGI + 类型驱动，核心技能（Pydantic、SQLAlchemy 异步、Uvicorn 部署、安全通识）完全互通，切换成本远低于同步/异步框架之间迁移。

## 常见陷阱

| 陷阱 | 现象 | 正确做法 |
|---|---|---|
| 忘装 `litestar[pydantic]` | Pydantic 模型校验不生效或报类型解析错误 | 明确安装对应数据层 extras |
| 把业务判断写进中间件 | 403/404 语义混乱，文档不含错误信息 | 授权用守卫，业务异常用异常类 |
| `exclude` 之外随手返回 ORM 对象 | 字段泄漏或序列化报错 | 响应统一过 `return_dto` |
| 依赖写成调用 `Provide(fn())` | 传了结果而不是提供者 | 传函数本体 `Provide(fn)` |
| 生成器依赖忘 `yield` 清理 | 会话/连接泄漏 | 资源类依赖一律 `try/finally` 或 `async with` |
| 照搬 FastAPI 教程 API | 概念对不上（`Depends` vs `Provide`） | 以 Litestar 官方文档为准，本篇对照表做映射 |

## 小结

- Litestar = 类型驱动 ASGI 框架 + 内置 DTO/守卫/权限/OpenAPI 的工程化全集。
- 路由分三层（散装函数 → Router → Controller），依赖用 `Provide` 声明、支持应用级全局挂载。
- DTO 层强制输入/输出分离，`exclude` 的字段不进响应，`DTOData` 支持"部分创建"语义。
- 守卫把授权变成声明式配置，与文档联动；字段级权限覆盖"按角色裁剪字段"的场景。
- 与 FastAPI 的差异是工程取舍而非优劣：生态规模 vs 内置完整度，核心技能互通。

## 延伸阅读

- [00-Web 框架对比与选型](/docs/python/01-Web与爬虫/01-Web开发/00-Web框架对比与选型) —— Litestar 在八框架生态中的位置
- [FastAPI 入门与路由依赖](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/01-FastAPI入门与路由依赖) —— 同主线框架的对照阅读
- [异步数据库与 SQLAlchemy](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/03-异步数据库与SQLAlchemy) —— Litestar 中接入异步会话的同一套模式
- Litestar 官方文档：https://docs.litestar.dev/
- Litestar GitHub 仓库：https://github.com/litestar-org/litestar

> 🧭 本系列其余篇目与 Python 学习路线统一维护在 [导航总览](/docs/python/02-基础与入门/00-导航总览)。
