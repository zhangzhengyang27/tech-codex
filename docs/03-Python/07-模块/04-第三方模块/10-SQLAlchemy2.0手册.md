---
title: SQLAlchemy 2.0 — ORM 客户端手册
description: SQLAlchemy 2.0 风格速查：声明式模型、Session 事务边界、select 查询构造、relationship 加载策略与异步用法，深度理论链接关系型数据库专篇。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# SQLAlchemy 2.0 — ORM 客户端手册

## 概念说明

SQLAlchemy 是 Python 事实上的 ORM 标准，分为两层：**Core**（SQL 表达式语言与连接管理）与 **ORM**（对象关系映射）。SQLAlchemy 2.0 统一了 1.x 时代并行的两套查询 API：`Query` 对象与 `select()` 表达式合并为一套以 `select()` 为核心的风格，`execute()` 的返回值统一为 `Result`，事务显式化为 `Session.begin()` 块。**新项目一律使用 2.0 风格**，本篇即 2.0 风格速查。

本篇定位是**客户端速查 + 最佳实践**：SQL 语法、事务隔离、索引与锁、连接池参数调优等理论见[关系型数据库](/docs/python/09-进阶核心/03-数据库/01-关系型数据库)；asyncpg/aiomysql 等裸驱动与异步全景见[异步数据库与任务队列](/docs/python/09-进阶核心/02-异步编程/04-异步数据库与任务队列)。

::: tip 版本口径
本文按大版本 "SQLAlchemy 2.0" 编写（2.0 风格 API）。1.4 已提供过渡 API，但新代码不必兼容旧写法：`Query`、`session.query()` 与 `declarative_base()` 旧函数均为遗留风格，迁移时统一替换。
:::

## 核心要点

- 安装：`pip install "sqlalchemy>=2.0"`；异步驱动另需 `pip install asyncpg`（PostgreSQL）或 `aiomysql`（MySQL）。
- 连接串永远来自环境变量，不要把密码写进代码或提交进仓库。
- 模型定义：`DeclarativeBase` 子类 + `Mapped`/`mapped_column`，类型注解与列定义一体化。
- 事务边界显式化：`with Session.begin() as session:` 块结束自动 commit/rollback，杜绝手写 `commit()` 遗漏。
- 查询一律 `select()`：`session.scalars(select(User).where(...))` 取对象，`session.execute(...)` 取行。
- **懒加载是 N+1 的根源**：列表查询用 `selectinload`/`joinedload` 预加载关系。
- 异步用法与同步 API 镜像：`create_async_engine` + `AsyncSession`，注意懒加载在异步下默认不可用。
- ⚠️ 常见误区：全局共享一个 Session。Session 不是线程安全的，也不代表"连接"——它是**工作单元**，请求级创建、用完即弃。
- ⚠️ 常见误区：循环里逐条 `session.add()` + `commit()`。批量写入用 `bulk` 操作或单个事务一次提交。
- ⚠️ 常见误区：`filter_by(键值对)` 与 `where()` 混用导致条件难以审读；统一用 `where(User.col == x)` 的表达式风格。

## 引擎与连接串

```python
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# 连接串从环境变量读取；不同数据库换驱动前缀即可
# postgresql+psycopg://user:pass@host:5432/dbname
# mysql+pymysql://user:pass@host:3306/dbname?charset=utf8mb4
# sqlite:///./local.db
DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(
    DATABASE_URL,
    echo=False,            # True 时打印 SQL，调试用，生产关闭
    pool_size=10,          # 常驻连接数
    max_overflow=20,       # 突发时临时连接上限（pool_size + max_overflow）
    pool_pre_ping=True,    # 取连接前探活，防 MySQL "server has gone away"
    pool_recycle=1800,     # 连接最长存活时间，早于数据库/代理的空闲超时
)

# Session 工厂：应用里只传这个工厂，不传裸 engine
SessionFactory = sessionmaker(bind=engine, expire_on_commit=False)
```

::: warning 连接串即密钥
`DATABASE_URL` 内嵌用户名密码，属于敏感配置：从环境变量或密钥管理服务注入（见[配置管理](/docs/python/03-工程化与运维/01-工程化/07-配置管理)），`.env` 不进 Git，日志中打印连接串前先脱敏。密码含特殊字符时用 `URL.create()` 结构化构造，避免手工拼接转义出错。
:::

## 声明式模型

```python
from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """全部模型的公共基类，可在此挂公共声明（如 naming_convention）"""


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(64), index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    status: Mapped[str] = mapped_column(String(16), default="active")
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    # 一对多：一个用户多条订单
    orders: Mapped[list["Order"]] = relationship(back_populates="user")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    amount: Mapped[float]
    note: Mapped[str | None]          # 可空列：注解为 Optional 即可，无需显式 nullable

    user: Mapped["User"] = relationship(back_populates="orders")


# 建表（生产环境用 Alembic 迁移，create_all 只适合原型与测试）
Base.metadata.create_all(engine)
```

`Mapped[X]` 注解驱动类型推断：`Mapped[int]` → 非 NULL 整数列，`Mapped[str | None]` → 可空列，`Mapped[datetime]` → DATETIME。字符串长度、索引等细节用 `mapped_column()` 补充。

::: tip 为什么要 back_populates
`back_populates` 让双向关系显式配对，两侧导航一致。单向关系用 `lazy="selectin"` 等参数也合法，但团队项目建议双向显式声明，避免"从哪一侧能导航到哪一侧"靠猜。
:::

## Session 与事务边界

SQLAlchemy 2.0 推荐把事务写成显式上下文块，块内工作、块边界提交：

```python
from sqlalchemy import select
from sqlalchemy.orm import Session


def create_order(user_id: int, amount: float) -> int:
    with Session(engine) as session:          # 请求级/操作级 Session
        with session.begin():                 # 显式事务：正常退出 commit，异常自动 rollback
            user = session.get(User, user_id)  # 主键查询，无结果返回 None
            if user is None:
                raise ValueError(f"user {user_id} not found")

            order = Order(user_id=user_id, amount=amount)
            session.add(order)
            session.flush()                    # 拿到自增 id，但尚未提交
            return order.id
    # with 块结束：commit 已自动完成
```

日常增删改查速查：

```python
from sqlalchemy import delete, select, update

with Session(engine) as session:
    # --- Create ---
    session.add(User(name="alice", email="alice@example.com"))
    session.add_all([User(name="bob", email="bob@example.com")])
    session.commit()

    # --- Read（2.0 风格：select + scalars） ---
    stmt = select(User).where(User.status == "active").order_by(User.id).limit(10)
    users = session.scalars(stmt).all()          # list[User]

    user = session.scalar(select(User).where(User.email == "alice@example.com"))  # 单对象或 None
    count = session.scalar(select(func.count()).select_from(User))                # 标量

    # --- Update：查到对象改属性，commit 时生成 UPDATE ---
    user = session.scalar(select(User).where(User.name == "alice"))
    user.status = "inactive"
    session.commit()

    # 批量 UPDATE（不逐条加载对象，一条 SQL 完成）
    session.execute(
        update(User).where(User.status == "pending").values(status="inactive")
    )
    session.commit()

    # --- Delete ---
    victim = session.scalar(select(User).where(User.name == "bob"))
    session.delete(victim)
    session.commit()

    session.execute(delete(Order).where(Order.amount < 1.0))   # 批量 DELETE
    session.commit()
```

::: warning Session 生命周期三原则
1. **短事务**：Session 越短越好，"一个请求/一个任务"一个 Session，绝不做成长期全局单例。
2. **尽早提交**：事务块里不做 HTTP 调用、不做重计算，避免长时间持锁。
3. **异常即回滚**：任何异常退出 `begin()` 块自动 rollback；不要捕获异常后继续在脏 Session 上操作。
:::

## select 查询构造速查

```python
from sqlalchemy import func, or_, select, text

# 条件组合：列表达式直接用运算符，Python 逻辑用 and_/or_（不是 and/or 关键字）
stmt = select(User).where(
    User.status == "active",
    or_(User.name.like("a%"), User.email.contains("@corp")),
)

# 聚合与分组
stmt = select(User.status, func.count()).group_by(User.status)

# JOIN：显式 join + 别名
stmt = (
    select(Order, User)
    .join(Order.user)              # 按 relationship JOIN，免写字符串条件
    .where(User.status == "active")
)
for order, user in session.execute(stmt):   # 多实体结果逐行解包
    ...

# 子查询与 EXISTS
sub = select(Order.user_id).where(Order.amount > 100).scalar_subquery()
stmt = select(User).where(User.id.in_(sub))

# 原生 SQL 逃生舱：复杂报表 SQL 直接执行，参数绑定防注入
rows = session.execute(
    text("SELECT date_trunc('day', created_at) AS d, count(*) FROM orders GROUP BY d"),
).all()
```

### 关系加载策略：消灭 N+1

```python
from sqlalchemy.orm import joinedload, selectinload

# ❌ N+1：每个 user.orders 触发一条 SQL
users = session.scalars(select(User)).all()
for u in users:
    for o in u.orders:      # 第 1 个用户触发 1 条 SQL，第 2 个再触发 1 条...
        print(o.amount)

# ✅ selectinload：两条 SQL（先 users，再 IN (...) 批量取 orders），适合一对多列表
stmt = select(User).options(selectinload(User.orders))

# ✅ joinedload：单条 SQL LEFT JOIN，适合多对一/详情页
stmt = select(Order).options(joinedload(Order.user))

# 集合关系默认 lazy="select"（访问时加载）；模型上可改默认值
orders: Mapped[list["Order"]] = relationship(back_populates="user", lazy="selectin")
```

| 策略 | SQL 形态 | 适用场景 |
|---|---|---|
| `lazy="select"`（默认） | 访问属性时逐条发 SQL | 单对象详情，绝不用于循环 |
| `selectinload` | 2 条 SQL，`IN` 批量 | 一对多列表页（默认推荐） |
| `joinedload` | 1 条 SQL JOIN | 多对一、单对象带关系 |
| `raiseload` | 访问即抛错 | 强约束：禁止意外懒加载 |

## 异步用法速查

异步 ORM 与同步 API 逐字对应，把 `create_engine`/`Session` 换成 async 前缀，操作加 `await`：

```python
import asyncio
import os

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# 驱动前缀换成异步实现：postgresql+asyncpg / mysql+aiomysql / sqlite+aiosqlite
ASYNC_URL = os.environ["DATABASE_URL"].replace("postgresql://", "postgresql+asyncpg://")

async_engine = create_async_engine(ASYNC_URL, pool_pre_ping=True, pool_size=10)
AsyncSessionFactory = async_sessionmaker(async_engine, expire_on_commit=False)


async def list_active_users() -> list[User]:
    async with AsyncSessionFactory() as session:
        stmt = select(User).where(User.status == "active").options(selectinload(User.orders))
        result = await session.scalars(stmt)
        return list(result)


async def create_user(name: str, email: str) -> int:
    async with AsyncSessionFactory() as session:
        async with session.begin():               # 异步事务块，语义与同步一致
            user = User(name=name, email=email)
            session.add(user)
            await session.flush()
            return user.id


asyncio.run(create_user("carol", "carol@example.com"))
```

::: warning 异步下没有"隐式懒加载"
访问未加载的关系属性时，同步 Session 会隐式发 SQL，异步 Session 无法在 `await` 之外发 IO——直接抛 `MissingGreenlet` 类错误。因此**异步代码必须在查询时用 `options()` 声明全部所需关系**，或显式 `await session.refresh(obj, ["orders"])`。这反而是好事：加载策略被迫显式化。
:::

## 常见陷阱

| 陷阱 | 后果 | 正确做法 |
|---|---|---|
| 密码硬编码在连接串里 | 泄漏进 Git 与日志 | 环境变量注入 `DATABASE_URL` |
| 全局唯一 Session 跨线程共享 | 并发下状态错乱、连接竞争 | Session 工厂 + 请求级/任务级实例 |
| 事务块内调用外部 HTTP | 连接池被占满，锁等待堆积 | 先查库、再出网、最后短事务写回 |
| 循环里逐条 commit | 每条一个事务，慢且不一致 | 一个事务批量写入，或 bulk insert |
| 列表查询不做预加载 | N+1，接口延迟随数据量线性恶化 | `selectinload` / 模型默认 `lazy="selectin"` |
| 用字符串拼接 WHERE | SQL 注入风险 | 永远用表达式/绑定参数，原生 SQL 走 `text()` + 参数 |
| `expire_on_commit=True` 下 commit 后访问属性 | 触发隐式查询（异步直接报错） | 工厂设 `expire_on_commit=False`，或 commit 前 `flush` 取值 |
| 不用迁移手工同步表结构 | 各环境 schema 漂移 | Alembic 管理迁移，`create_all` 仅限原型 |

## 最佳实践

1. **一个请求一个 Session**：Web 框架里在依赖注入/中间件层创建并关闭 Session；Celery 任务里每个任务一个。
2. **模型与迁移配套**：模型即 schema 的单一事实来源，Alembic 从模型自动生成迁移脚本，人工审阅后执行。
3. **查询封装到仓储层**：业务代码不直接拼 `select`，调用 `repo.get_active_users()`；查询可测试、可复用。
4. **默认安全加载**：团队约定模型关系默认 `lazy="selectin"`，配合 `raiseload` 渐进消灭隐式 IO。
5. **异步项目全链路异步**：`async_sessionmaker` + 显式 `options()`，绝不混用同步 ORM 于事件循环线程。
6. **连接池参数进配置**：`pool_size`、`pool_recycle` 随部署环境变化，走环境变量与[配置管理](/docs/python/03-工程化与运维/01-工程化/07-配置管理)体系，不写死在代码里。

## 延伸阅读

- [SQLAlchemy 2.0 官方文档](https://docs.sqlalchemy.org/en/20/) — ORM 与 Core 全部语义的权威参考
- [关系型数据库](/docs/python/09-进阶核心/03-数据库/01-关系型数据库) — SQL、事务、索引与裸驱动的系统讲解
- [异步数据库与任务队列](/docs/python/09-进阶核心/02-异步编程/04-异步数据库与任务队列) — asyncpg/aiomysql 与 asyncio 全景
- [Pydantic — 运行时数据校验与序列化](/docs/python/07-模块/04-第三方模块/04-pydantic) — ORM 模型与 API 层模型的双向转换
- [配置管理](/docs/python/03-工程化与运维/01-工程化/07-配置管理) — 连接串等敏感配置的注入与校验
