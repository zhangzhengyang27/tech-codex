---
title: FastAPI 测试
description: FastAPI 测试体系：pytest 与 httpx AsyncClient、dependency_overrides 依赖覆盖、测试数据库隔离（事务回滚/独立库）、fixture 分层设计与覆盖率配置。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# FastAPI 测试

> **本篇做什么**：为 FastAPI 应用搭建完整的测试体系——`httpx.AsyncClient` 直测 ASGI 应用、`dependency_overrides` 替换依赖、测试数据库隔离的两种方案、分层 fixture 设计与覆盖率门禁。
> **产出**：一套可直接复用的 `conftest.py`（client/db/auth fixture），和覆盖认证流、数据库隔离、覆盖率门禁的测试工程配置。
> **前置篇**：[03-异步数据库与 SQLAlchemy](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/03-异步数据库与SQLAlchemy)（会话依赖）、[04-认证与 JWT](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/04-认证与JWT)（被覆盖的认证依赖）。

## 测试的层次

一个 FastAPI 项目的测试金字塔：

```mermaid
flowchart TD
    A["端到端测试<br/>AsyncClient 走完整 HTTP 栈"] --> B["接口测试<br/>依赖覆盖 + 测试数据库"]
    B --> C["单元测试<br/>纯函数、校验器、服务层"]
    C --> D["数量占比：单元最多，端到端最少"]
```

- **单元测试**：测 Pydantic 校验器、业务函数，不起应用，跑得最快。
- **接口测试**：本文重点。用 `httpx.AsyncClient` 把请求打进 ASGI 应用，覆盖依赖、数据库、中间件的真实行为。
- **端到端测试**：起完整服务（甚至 docker compose），验证部署后的真实链路，属于部署验收而非日常迭代。

::: tip 为什么不用 unittest.TestClient 起服务
FastAPI 的 `TestClient`（基于 httpx）是同步接口，内部有线程与事件循环的转接，在异步 fixture 中嵌套使用容易踩坑。既然应用本体是 ASGI 异步应用，**测试也保持异步，用 `httpx.AsyncClient` + `ASGITransport` 直接把请求送进应用**，模型统一、没有线程边界。
:::

## 基础设施：pytest + httpx

```bash
pip install pytest pytest-asyncio httpx pytest-cov
```

配置 `pyproject.toml`，让 pytest 自动识别异步测试函数（免写 `@pytest.mark.asyncio`）：

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

第一个接口测试：

```python
# tests/test_items.py
from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_create_item():
    transport = ASGITransport(app=app)          # 不真正监听端口，进程内直连
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/items/", json={"name": "键盘", "price": 299.0})

    assert resp.status_code == 201
    body = resp.json()
    assert body["name"] == "键盘"


async def test_price_must_be_positive():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/items/", json={"name": "键盘", "price": -1})

    assert resp.status_code == 422
    assert resp.json()["detail"][0]["loc"] == ["body", "price"]
```

断言风格建议：先断状态码，再断业务字段。422 的 `loc` 断言能同时验证"错误在哪个字段"，防止校验规则悄悄漂移。

## conftest.py：fixture 设计

fixture 是测试的依赖注入，和 FastAPI 的 `Depends` 思想一致：**声明需要什么，不关心怎么构造**。推荐按生命周期分层：

```python
# tests/conftest.py
import pytest
from httpx import ASGITransport, AsyncClient

from app.database import engine
from app.models import Base
from app.main import app


@pytest.fixture(scope="session")
async def _engine():
    """整个测试会话共用一个引擎（scope=session 只建一次）"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)   # 建表
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)     # 清库
    await engine.dispose()


@pytest.fixture
async def db_session(_engine):
    """每个测试一个会话，测试结束后回滚，保证互不污染"""
    connection = await _engine.connect()
    transaction = await connection.begin()
    session = AsyncSession(bind=connection, expire_on_commit=False)
    try:
        yield session
    finally:
        await session.close()
        await transaction.rollback()      # 无论测试成败，全部回滚
        await connection.close()


@pytest.fixture
async def client():
    """每个测试一个 HTTP 客户端"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.fixture
async def auth_headers(client) -> dict:
    """已登录用户的认证头：走真实注册/登录流程获取 Token"""
    await client.post("/users/", json={
        "username": "alice", "email": "a@ex.com", "password": "passw0rd1",
    })
    resp = await client.post("/auth/login", data={
        "username": "alice", "password": "passw0rd1",   # OAuth2 表单格式
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

使用时按需声明即可：

```python
async def test_read_me(client, auth_headers):
    resp = await client.get("/users/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["username"] == "alice"


async def test_me_requires_auth(client):
    resp = await client.get("/users/me")
    assert resp.status_code == 401
```

::: tip fixture 只做"装配"，不做"业务"
`auth_headers` 走真实注册登录而不是手工拼 Token，因为登录链路（哈希校验、Token 签发）本身就要被测试覆盖。工厂式的造数 fixture（`make_user(**kwargs)`）适合需要批量变体的场景，配合 `factory-boy` 或手写默认参数均可。
:::

## 依赖覆盖：dependency_overrides

`dependency_overrides` 是 FastAPI 测试的核心开关：**键为原依赖函数，值为替代函数**，应用内所有引用该依赖的请求都会被替换：

```python
# 场景一：绕过认证，直接注入假用户 —— 测业务逻辑时不测登录
from app.deps import get_current_user
from app.models import User

async def fake_user() -> User:
    user = User(id=1, username="tester", is_active=True, is_admin=False)
    return user


@pytest.fixture
def override_current_user():
    app.dependency_overrides[get_current_user] = fake_user
    yield
    app.dependency_overrides.clear()    # 测试完必须清掉，防止污染其他测试


async def test_admin_endpoint_forbidden(client, override_current_user):
    resp = await client.get("/admin/stats")
    assert resp.status_code == 403      # 普通用户访问管理端点


# 场景二：替换数据库会话，指向测试库
from app.deps import get_session

async def override_session():
    async with TestSessionLocal() as session:
        yield session

app.dependency_overrides[get_session] = override_session
```

要点：

- 覆盖是**全局**的（应用对象级别），必须在 fixture 里 `clear()` 收尾，否则顺序敏感的测试会互相污染。
- 替代函数的签名要与原依赖兼容（FastAPI 照常解析它的参数），返回类型一致更利于类型检查。
- 不要用 override 去"绕过"你要测的东西：测权限就用真 Token，测数据库就用真数据库。

## 测试数据库隔离

接口测试碰数据库，核心诉求是**测试之间互不影响、跑完不留垃圾数据**。两种主流方案：

### 方案一：独立测试库 + 每测试回滚（推荐）

用与开发库隔离的测试数据库（CI 中每次流水线新建），配合上面 `db_session` fixture 的事务回滚：

```python
# app/config.py 中区分环境
import os

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:secret@localhost:5432/app")
TEST_DATABASE_URL = "postgresql+asyncpg://postgres:secret@localhost:5432/app_test"
```

```bash
# CI 流水线中：先建空测试库，再跑测试
createdb app_test && pytest
```

### 方案二：事务回滚（SAVEPOINT 模式）

更彻底的隔离是"每个测试包在一个大事务里，结束时整体回滚"，连建表都不重复。异步 SQLAlchemy 需要配合 SAVEPOINT，因为业务代码会自己 `commit`：

```python
import sqlalchemy as sa


@pytest.fixture
async def db_session_rollback(_engine):
    connection = await _engine.connect()
    outer = await connection.begin()                    # 外层大事务
    session = AsyncSession(bind=connection, expire_on_commit=False)

    nested = await connection.begin_nested()            # SAVEPOINT

    # 业务代码 commit 时会"结束"SAVEPOINT，这里自动重启一个
    @sa.event.listens_for(session.sync_session, "after_transaction_end")
    def restart_savepoint(sync_session, trans):
        nonlocal nested
        if trans.nested and not trans._parent.nested:
            nested = connection.sync_connection.begin_nested()

    yield session

    await session.close()
    await outer.rollback()                              # 测试做的所有改动一起消失
    await connection.close()
```

两种方案对比：

| 维度 | 独立测试库 + 回滚 | 纯事务回滚（SAVEPOINT） |
|---|---|---|
| 实现复杂度 | 低 | 中（要理解事件监听） |
| 与生产行为一致性 | 高（真实 commit） | 低（commit 被 SAVEPOINT 吸收） |
| 速度 | 快（truncate/回滚级） | 更快 |
| 迁移真实表结构 | 是（走 Alembic） | 否（常配 create_all） |
| 建议 | 常规项目默认选它 | 追求极致速度、大测试量时再上 |

::: warning 不要用生产库跑测试
哪怕"只读"的测试也可能写数据。测试库连接串必须来自独立环境变量，CI 与本地均如此；更保险的做法是在测试 fixture 里断言连接 URL 含 `test` 字样，防止环境变量配错时误伤生产。
:::

## 测试认证流

完整走一遍"注册 → 登录 → 访问受保护资源"，覆盖第 4 篇的整条链路：

```python
async def test_auth_flow(client):
    # 1. 注册
    resp = await client.post("/users/", json={
        "username": "bob", "email": "b@ex.com", "password": "passw0rd1",
    })
    assert resp.status_code == 201

    # 2. 登录（OAuth2 表单格式）
    resp = await client.post("/auth/login", data={
        "username": "bob", "password": "passw0rd1",
    })
    assert resp.status_code == 200
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. 访问受保护资源
    resp = await client.get("/users/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["username"] == "bob"

    # 4. 伪造 Token 必须被拒
    resp = await client.get("/users/me",
                            headers={"Authorization": "Bearer fake.token.here"})
    assert resp.status_code == 401
```

纯权限逻辑（`require_admin` 的判断分支）不值得每次走登录链路，用 `dependency_overrides` 注入 `is_admin=True/False` 的假用户，把用例矩阵跑全。

## 覆盖率：pytest-cov

```bash
pytest --cov=app --cov-report=term-missing --cov-fail-under=80
```

在 `pyproject.toml` 中固化配置：

```toml
[tool.coverage.run]
source = ["app"]
omit = ["app/tests/*", "*/migrations/*"]

[tool.coverage.report]
fail_under = 80
show_missing = true
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
]
```

- `fail_under` 把覆盖率变成 CI 门禁，跌破即构建失败。
- `term-missing` 列出未覆盖行号，配合 `--cov-report=html` 生成可视化报告。
- `exclude_lines` 排除类型存根、防御性代码等"测了没意义"的行。

::: tip 覆盖率是仪表，不是目标
80% 的行覆盖不等于 80% 的正确性——它测不出"漏掉的场景"。提升覆盖率的正确姿势是先补**边界用例**（空列表、超长输入、并发提交），覆盖率上升只是副产品。为数字刷行覆盖（比如给简单属性写断言）是负资产。
:::

## 常见陷阱

| 陷阱 | 现象 | 正确做法 |
|---|---|---|
| override 后忘记 clear | 测试顺序敏感、时好时坏 | fixture 中 yield 后 `dependency_overrides.clear()` |
| 测试连开发/生产库 | 测试数据混进业务库 | 独立测试库 + URL 断言含 test |
| 同步 TestClient 嵌异步 fixture | 事件循环冲突报错 | 全链路 `AsyncClient` + `ASGITransport` |
| 每个测试都重新建表 | 测试变慢一个量级 | 引擎 `scope="session"`，事务回滚隔离 |
| mock 掉被测的依赖 | 测试通过但功能是坏的 | 只 override 边界依赖（认证、外部服务） |
| 只断言状态码不断言体 | 接口悄悄改坏没人发现 | 断言关键字段与错误 `loc` |

## 小结

- 测试保持异步：`httpx.AsyncClient` + `ASGITransport` 进程内直测 ASGI 应用，与生产同构。
- `dependency_overrides` 替换边界依赖，用完必清；被测逻辑本身不要 mock。
- 数据库隔离优先"独立测试库 + 事务回滚"，SAVEPOINT 模式留给大批量测试场景。
- fixture 分层：session 级引擎、测试级会话与客户端、业务级认证头与造数工厂。
- 覆盖率设 `fail_under` 门禁防退化，但真正的质量来自边界用例设计。

## 延伸阅读

- [01-FastAPI 入门与路由依赖](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/01-FastAPI入门与路由依赖) —— 依赖注入模型是 override 的基础
- [03-异步数据库与 SQLAlchemy](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/03-异步数据库与SQLAlchemy) —— 测试库会话与事务的来源
- [04-认证与 JWT](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/04-认证与JWT) —— 本篇认证流测试的被测对象
- [07-部署与生产实践](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/07-部署与生产实践) —— 测试通过后如何走向上线
- FastAPI 测试文档（中文）：https://fastapi.tiangolo.com/zh/tutorial/testing/
- pytest 官方文档：https://docs.pytest.org/
