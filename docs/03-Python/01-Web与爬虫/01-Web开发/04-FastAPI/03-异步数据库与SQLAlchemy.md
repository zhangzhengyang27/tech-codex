---
title: 异步数据库与 SQLAlchemy
description: SQLAlchemy 2.0 异步栈实战：async 引擎与 AsyncSession、DeclarativeBase 声明式模型、异步下的关系加载策略、Alembic 迁移与连接池调优。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# 异步数据库与 SQLAlchemy

> **本篇做什么**：用 SQLAlchemy 2.0 风格搭建 FastAPI 的异步数据访问层——async 引擎与 `AsyncSession`、声明式模型、异步环境下的关系加载（`selectinload` / `lazy="selectin"`）、Alembic 迁移与连接池配置。
> **产出**：一个可复用的 `database.py` + `models.py` + 异步 CRUD 路由，以及一套迁移工作流。
> **前置篇**：[01-FastAPI 入门与路由依赖](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/01-FastAPI入门与路由依赖)（`Depends` 与 `yield` 依赖）、[02-Pydantic 数据校验](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/02-Pydantic数据校验)（`from_attributes`）。

## 异步栈总览

```mermaid
flowchart LR
    A["FastAPI 路由"] -->|"Depends(get_session)"| B["AsyncSession"]
    B --> C["create_async_engine"]
    C --> D["连接池"]
    D --> E["asyncpg 驱动"]
    E --> F[("PostgreSQL")]
```

各层职责：

- **驱动**：`asyncpg`（PostgreSQL 事实标准）、`aiosqlite`（SQLite 异步封装）、`asyncmy`（MySQL）。连接 URL 里以 `postgresql+asyncpg://` 形式指定。
- **Engine**：`create_async_engine` 持有连接池，全局唯一，随应用生命周期创建销毁。
- **AsyncSession**：工作单元（Unit of Work），管理事务与对象状态，**每个请求一个**，通过 `yield` 依赖注入。
- **ORM 模型**：2.0 声明式风格，`Mapped` + `mapped_column`，类型即文档。

::: warning 异步是 I/O 并发，不是 I/O 加速
异步数据库不会让单条 SQL 变快，它让"等待数据库响应"的时间能被别的请求复用。I/O 密集的 API 服务收益巨大；CPU 密集的复杂查询该优化 SQL 还是要优化 SQL。
:::

## 安装

```bash
pip install "sqlalchemy[asyncio]" asyncpg alembic
# 开发/单测可用 SQLite：pip install aiosqlite
```

## 模型定义：2.0 声明式风格

```python
# models.py
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """所有模型的公共基类，Alembic 也以它为迁移目标"""
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # 一对多：一个用户多篇文章
    # lazy="selectin" —— 异步环境的推荐默认，见后文"关系与惰性加载"
    posts: Mapped[list["Post"]] = relationship(
        back_populates="author",
        lazy="selectin",
    )


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str]
    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), index=True
    )
    author: Mapped["User"] = relationship(back_populates="posts")
```

`Mapped[int]` / `Mapped[str | None]` 直接表达"列类型 + 可空性"，`mapped_column` 补充索引、外键、默认值等物理属性。

## 引擎与会话工厂

```python
# database.py
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

DATABASE_URL = "postgresql+asyncpg://postgres:secret@localhost:5432/app"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,           # True 时打印 SQL，开发排查用
    pool_size=10,         # 常驻连接数
    max_overflow=20,      # 高峰期可临时多开的连接数
    pool_pre_ping=True,   # 取连接前探测，防止拿到已被服务端断开的死连接
    pool_recycle=1800,    # 连接最长存活 30 分钟，防止被防火墙/数据库掐断
)

# expire_on_commit=False：commit 后不把对象全部过期，
# 否则访问已提交对象的属性会再次触发隐式 IO（异步下直接报错）
SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)
```

::: tip expire_on_commit=False 是异步栈的必修配置
同步 ORM 中 commit 后访问属性会自动重新 SELECT（隐式懒加载）；异步下这种隐式 IO 会抛 `MissingGreenlet` 异常。设 `expire_on_commit=False` 让 commit 后对象属性仍可安全读取。代价是"对象状态可能与库不同步"，长生命周期会话要注意。
:::

## 接入 FastAPI：yield 依赖

```python
# deps.py
from collections.abc import AsyncIterator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import SessionLocal


async def get_session() -> AsyncIterator[AsyncSession]:
    """每个请求一个会话：进入时创建，响应后自动关闭"""
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


SessionDep = Annotated[AsyncSession, Depends(get_session)]
```

会话的生命周期严格对齐请求：异常时回滚，结束时归还连接到池。

## CRUD 实战

2.0 风格统一用 `select()` / `session.execute()`，不再有 `session.query()`：

```python
# routers/posts.py
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/posts", tags=["posts"])


class PostCreate(BaseModel):
    title: str
    content: str
    author_id: int


class PostRead(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    title: str
    content: str
    author_id: int


@router.get("/", response_model=list[PostRead])
async def list_posts(
    skip: int = 0,
    limit: int = 20,
    session: Annotated[AsyncSession, Depends(get_session)] = None,
):
    stmt = select(Post).order_by(Post.id.desc()).offset(skip).limit(limit)
    result = await session.execute(stmt)
    return result.scalars().all()


@router.get("/{post_id}", response_model=PostRead)
async def get_post(post_id: int, session: Annotated[AsyncSession, Depends(get_session)]):
    post = await session.get(Post, post_id)   # 主键查询的快捷方式
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.post("/", response_model=PostRead, status_code=201)
async def create_post(payload: PostCreate, session: Annotated[AsyncSession, Depends(get_session)]):
    post = Post(**payload.model_dump())
    session.add(post)
    await session.commit()          # 异步 ORM 中必须显式 commit
    await session.refresh(post)     # 回读服务端生成的 id / 默认值
    return post


@router.delete("/{post_id}", status_code=204)
async def delete_post(post_id: int, session: Annotated[AsyncSession, Depends(get_session)]):
    post = await session.get(Post, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    await session.delete(post)
    await session.commit()
```

批量写入用 `session.execute(insert(Post), rows)` 的 executemany 形式，比逐条 `add` 快一个量级。

## 关系与惰性加载：异步下的头号坑

同步 ORM 默认 `lazy="select"`：访问 `user.posts` 时**自动**发一条 SQL。异步下没有"自动"——隐式 IO 会直接抛 `MissingGreenlet`：

```python
user = await session.get(User, 1)
print(user.posts)          # 异步下报错！MissingGreenlet
```

对策有三个层次：

**方案一：查询时显式预加载（最明确）**

```python
from sqlalchemy.orm import selectinload

stmt = (
    select(User)
    .options(selectinload(User.posts))     # 主查询后自动补一条 IN 查询
    .where(User.id == 1)
)
user = (await session.execute(stmt)).scalar_one()
print(user.posts)                          # 安全，已加载
```

`selectinload` 发两条独立 SQL（适合一对多）；`joinedload` 用 LEFT JOIN 一次取回（适合多对一）。列级懒加载细节与 N+1 的量化对比见本站 SQLAlchemy 系列专题。

**方案二：模型侧声明默认策略（最省心）**

```python
posts: Mapped[list["Post"]] = relationship(
    back_populates="author",
    lazy="selectin",   # 该关系加载时永远自动用 selectin，无需每次写 options
)
```

**方案三：lazy="raise" 防呆（最严格）**

```python
posts: Mapped[list["Post"]] = relationship(lazy="raise")
# 访问未预加载的 user.posts 会直接抛 InvalidRequestError，
# 把"忘写 selectinload"从线上事故变成开发期报错
```

::: tip 推荐组合
对外 API 关系用 `lazy="selectin"` 保证可用性；内部易踩坑的关系用 `lazy="raise"` 强迫显式预加载。唯一不推荐的选项恰恰是默认值 `lazy="select"`——它把错误从开发期推迟到运行期。
:::

## Alembic 迁移

模型变更必须走迁移，禁止"启动时 `create_all` 建表"。Alembic 初始化：

```bash
alembic init migrations
```

异步项目需要改两处配置：

```python
# migrations/env.py 关键改动
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from alembic import context

from database import DATABASE_URL          # 复用应用的连接配置
from models import Base                    # 导入全部模型，确保元数据完整

config.set_main_option("sqlalchemy.url", DATABASE_URL)
target_metadata = Base.metadata


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations():
    engine = create_async_engine(DATABASE_URL, poolclass=NullPool)
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)   # 在绿色let里跑同步迁移逻辑
    await engine.dispose()


def run_migrations_online():
    asyncio.run(run_async_migrations())
```

日常工作流：

```bash
# 1. 改完 models.py 后生成迁移脚本（审查后再用，autogenerate 会漏/多报）
alembic revision --autogenerate -m "add posts table"

# 2. 检查生成的脚本，应用到数据库
alembic upgrade head

# 3. 回滚一步
alembic downgrade -1
```

::: warning 迁移要向后兼容
滚动发布时新旧两版代码会同时跑在新表结构上。原则：**先加列（可空/带默认）→ 发新版 → 再删旧列**，绝不在发版同一瞬间改列语义。细节见[部署与运行](/docs/python/03-工程化与运维/02-运维/03-部署与运行)。
:::

## 连接池配置与调优

`create_async_engine` 的连接池参数决定服务在流量高峰的稳定性：

| 参数 | 含义 | 经验值 |
|---|---|---|
| `pool_size` | 常驻连接数 | 5-20，按实例数 × 该值 ≤ 数据库 `max_connections` 的 70% |
| `max_overflow` | 超出 pool_size 的临时连接上限 | pool_size 的 1-2 倍 |
| `pool_timeout` | 从池中拿连接的最长等待（秒） | 30，超时抛 `TimeoutError` |
| `pool_pre_ping` | 取连接前发探活查询 | 生产必开 |
| `pool_recycle` | 连接最大复用秒数 | 1800，低于数据库/中间件的空闲断开阈值 |
| `poolclass=NullPool` | 每次直连不缓存 | 脚本、测试、Alembic 环境用 |

计算公式要记住：**总连接数上限 = 实例数 × (pool_size + max_overflow)**。4 个 uvicorn worker 各自持有独立连接池，`pool_size=10` 就是 40 条常驻连接起。多实例部署时先和 DBA 对齐这个数。

::: danger 连接泄漏的表现与排查
现象：运行一段时间后请求全部卡在 `pool_timeout`。根因几乎总是"会话没关"——比如自建了 `SessionLocal()` 却没有走 `yield` 依赖的关闭路径。排查：打开 `echo_pool=True` 观察连接的 checkout/checkin 日志；代码上坚持只用依赖注入获取会话，不在业务代码里手动创建。
:::

## 常见陷阱

| 陷阱 | 现象 | 正确做法 |
|---|---|---|
| 异步下访问未预加载关系 | `MissingGreenlet` 异常 | `selectinload` / `lazy="selectin"` |
| commit 后读属性报错 | 隐式刷新触发的 IO | `expire_on_commit=False` |
| 每个函数自建 engine | 连接数暴涨、句柄耗尽 | 全局唯一 engine + 依赖注入 session |
| 启动时 `create_all` 建表 | 多实例竞争、无版本记录 | Alembic 管理迁移 |
| `autogenerate` 直接上线 | 漏检约束变更、误删列 | 人工审查脚本后再 upgrade |
| 池参数 × 实例数超数据库上限 | 高峰期连接被拒 | 总量核算，压测验证 |
| 在 `async def` 里跑同步驱动 | 阻塞事件循环 | 全链路异步驱动 |

## 小结

- 异步栈四件套：驱动（asyncpg）、`create_async_engine`、`async_sessionmaker`、`yield` 依赖，各司其职。
- 模型用 2.0 声明式（`DeclarativeBase` + `Mapped`），查询统一 `select()` + `await session.execute()`。
- 异步下关系加载必须显式：查询级 `selectinload`，模型级 `lazy="selectin"`，防呆用 `lazy="raise"`。
- 迁移用 Alembic，脚本人工审查，变更保持向后兼容。
- 连接池按"实例数 × 池上限"核算，`pool_pre_ping` 与 `pool_recycle` 生产必配。

## 延伸阅读

- [02-Pydantic 数据校验](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/02-Pydantic数据校验) —— ORM 对象与 Pydantic 模型的转换边界
- [04-认证与 JWT](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/04-认证与JWT) —— 在会话依赖之上实现 `get_current_user`
- [07-部署与生产实践](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/07-部署与生产实践) —— 连接池与多 worker 部署的联动
- SQLAlchemy 官方异步文档：https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- Alembic 官方文档：https://alembic.sqlalchemy.org/
