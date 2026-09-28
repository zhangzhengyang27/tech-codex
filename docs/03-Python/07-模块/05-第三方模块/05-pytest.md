---
title: pytest — Python 测试框架
version: 2.0
author: 文档维护组
created: 2026-06-05
updated: 2026-08-12
status: 正式
category: Python

---
# pytest — Python 测试框架

> **一句话概括**：pytest 是 Python 生态中最流行的测试框架，用简洁的 `assert` 语句替代繁琐的 `self.assertEqual()`，通过强大的 fixture 机制和丰富的插件体系，让编写测试从"负担"变为"享受"。

---

## 是什么 → 为什么 → 怎么做

| 层次 | 内容 |
|------|------|
| **是什么** | 一个基于 Python 标准库 `unittest` 理念但完全重写的第三方测试框架，无需继承 `TestCase`，无需 `setUp/tearDown`，用纯函数即可编写测试 |
| **为什么** | `unittest` 从 Java 的 JUnit 移植而来，写法冗长（`self.assertEqual(a, b)` 而非 `assert a == b`）、夹具机制笨重（`setUp/tearDown` 无法灵活共享）、参数化测试需要手动循环；pytest 解决了所有这些痛点，同时保持与 `unittest` 的兼容 |
| **怎么做** | `pip install pytest`，编写 `test_*.py` 文件，函数名以 `test_` 开头，用 `assert` 断言，运行 `pytest` 即可 |

---

## pytest 与 unittest 对比

```mermaid
graph TB
    subgraph unittest["unittest 风格"]
        U1["继承 TestCase"]
        U2["self.assertEqual(a, b)"]
        U3["setUp() / tearDown()"]
        U4["需手动 for 循环做参数化"]
        U5["加载器 + 运行器 分离"]
        U1 --> U2 & U3 & U4 & U5
    end

    subgraph pytest["pytest 风格"]
        P1["纯函数，无需继承"]
        P2["assert a == b"]
        P3["fixture 注入"]
        P4["@parametrize 装饰器"]
        P5["一行命令自动发现"]
        P1 --> P2 & P3 & P4 & P5
    end

    unittest -->|"兼容但更简洁"| pytest

```

pytest 能够直接运行 `unittest` 风格的测试用例，因此迁移成本为零——你可以在已有项目中新增 pytest 风格的测试，老测试原封不动继续运行。

---

## 安装与基本使用

```bash
# 安装
pip install pytest

# 运行当前目录下所有测试
pytest

# 指定文件
pytest test_calculator.py

# 指定目录
pytest tests/

# 显示详细输出
pytest -v

# 遇到第一个失败就停止
pytest -x

# 只运行匹配关键字的测试
pytest -k "api"

# 只运行被标记为 slow 的测试
pytest -m slow
```

---

## 测试发现规则

pytest 遵循约定优于配置的原则，自动发现测试文件、类和函数：

| 规则 | 说明 |
|------|------|
| **文件命名** | `test_*.py` 或 `*_test.py` |
| **函数命名** | `test_` 开头 |
| **类命名** | `Test` 开头（不含 `__init__` 方法） |
| **方法命名** | `test_` 开头 |
| **目录** | 从当前目录递归搜索，遵循 `norecursedirs` 配置 |

```
project/
  tests/
    __init__.py          # 可为空
    test_models.py       # 自动发现
    test_views.py        # 自动发现
    conftest.py          # 共享 fixture
    helpers/
      test_utils.py      # 自动发现
    integration/
      test_api.py        # 自动发现
```

---

## 基本断言

pytest 最显著的改进是：**直接使用 Python 原生 `assert` 语句**，断言失败时自动展示详细的上下文对比。

::: code-group

```python [pytest 风格]
# test_math.py — 需要 Python 3.10+
import pytest

def test_addition():
    assert 1 + 1 == 2

def test_float_division():
    result = 3 / 2
    assert result == 1.5

def test_string_contains():
    text = "Hello, pytest!"
    assert "pytest" in text
    assert text.startswith("Hello")

def test_list_operations():
    items = [1, 2, 3]
    items.append(4)
    assert len(items) == 4
    assert 3 in items

def test_dict_lookup():
    user = {"name": "Alice", "role": "admin"}
    assert user["name"] == "Alice"
    assert user.get("age") is None
```

```python [unittest 风格（对比）]
# 等价的 unittest 写法——代码量明显更多
import unittest

class TestMath(unittest.TestCase):
    def test_addition(self):
        self.assertEqual(1 + 1, 2)

    def test_float_division(self):
        result = 3 / 2
        self.assertEqual(result, 1.5)

    def test_string_contains(self):
        text = "Hello, pytest!"
        self.assertIn("pytest", text)
        self.assertTrue(text.startswith("Hello"))

    def test_list_operations(self):
        items = [1, 2, 3]
        items.append(4)
        self.assertEqual(len(items), 4)
        self.assertIn(3, items)

    def test_dict_lookup(self):
        user = {"name": "Alice", "role": "admin"}
        self.assertEqual(user["name"], "Alice")
        self.assertIsNone(user.get("age"))
```

:::

pytest 内置了断言内省（assertion introspection）重写机制，当 `assert a == b` 失败时，它不仅告诉你"失败了"，还会清晰地展示 `a` 和 `b` 各自的值，以及 `a == b` 这个表达式本身的结果。

---

## fixture 机制深入

fixture 是 pytest 最核心的概念，它替代了 `unittest` 的 `setUp/tearDown`，并在此基础上提供了注入、共享、参数化等强大能力。

### fixture 生命周期时序图

```mermaid
sequenceDiagram
    participant T as 测试函数
    participant F as fixture
    participant R as 资源

    Note over T,R: scope="function"（默认）——每个测试函数独立

    T->>F: 请求 fixture
    activate F
    F->>R: 创建资源（setup）
    R-->>F: 资源就绪
    F-->>T: 注入 fixture 值
    deactivate F

    T->>T: 执行测试逻辑

    T->>F: 测试结束
    activate F
    F->>R: 清理资源（teardown/yield 之后）
    R-->>F: 清理完成
    deactivate F

    Note over T,R: scope="class"——同一测试类内共享
    Note over T,R: scope="module"——同一 .py 文件内共享
    Note over T,R: scope="session"——整个测试会话共享一次
```

### 创建与注入 fixture

```python
# test_fixture_basic.py — 需要 Python 3.10+
import pytest


# 定义一个 fixture
@pytest.fixture
def sample_user() -> dict:
    """返回一个标准测试用户，供多个测试复用"""
    return {
        "id": 1,
        "name": "Alice",
        "email": "alice@example.com",
        "role": "admin",
    }


# 测试函数通过参数名注入 fixture
def test_user_name(sample_user: dict):
    assert sample_user["name"] == "Alice"


def test_user_role(sample_user: dict):
    assert sample_user["role"] == "admin"


def test_user_id(sample_user: dict):
    assert sample_user["id"] == 1
```

### scope 参数控制生命周期

fixture 的 `scope` 参数决定了 fixture 的创建和销毁时机：

| scope | 创建时机 | 销毁时机 | 典型场景 |
|-------|---------|---------|---------|
| `function`（默认） | 每个测试函数前 | 每个测试函数后 | 测试数据隔离 |
| `class` | 每个测试类前 | 每个测试类后 | 类内共享的数据库连接 |
| `module` | 每个 `.py` 文件前 | 每个 `.py` 文件后 | 模块级配置 |
| `package` | 每个包（`__init__.py`）前 | 每个包后 | 包级资源 |
| `session` | 整个测试会话前 | 整个测试会话后 | 全局数据库连接、缓存预热 |

```python
# test_scope.py — 需要 Python 3.10+
import pytest


@pytest.fixture(scope="function")
def function_fixture():
    """每个测试函数都会调用一次"""
    print("\n  [setup] function_fixture")
    yield {"data": "function-level"}
    print("\n  [teardown] function_fixture")


@pytest.fixture(scope="module")
def module_fixture():
    """同一个 .py 文件内只调用一次"""
    print("\n  [setup] module_fixture")
    yield {"data": "module-level"}
    print("\n  [teardown] module_fixture")


@pytest.fixture(scope="session")
def session_fixture():
    """整个测试运行期间只调用一次"""
    print("\n  [setup] session_fixture")
    yield {"data": "session-level"}
    print("\n  [teardown] session_fixture")


def test_a(function_fixture, module_fixture, session_fixture):
    assert function_fixture["data"] == "function-level"


def test_b(function_fixture, module_fixture, session_fixture):
    # module_fixture 和 session_fixture 的实例与 test_a 相同
    # function_fixture 是全新创建的
    assert module_fixture["data"] == "module-level"
```

### yield fixture：setup/teardown 模式

使用 `yield` 代替 `return`，`yield` 之前的代码是 setup，之后的代码是 teardown。

```python
# test_yield_fixture.py — 需要 Python 3.10+
import pytest
from pathlib import Path
import tempfile
import os


@pytest.fixture
def temp_file():
    """创建临时文件，测试结束后自动删除"""
    fd, path = tempfile.mkstemp(suffix=".txt")
    filepath = Path(path)
    # ===== setup 阶段 =====
    filepath.write_text("temp content")
    print(f"\n  [setup] 临时文件已创建: {filepath}")

    yield filepath  # 将路径注入测试函数

    # ===== teardown 阶段 =====
    os.close(fd)
    filepath.unlink(missing_ok=True)
    print(f"\n  [teardown] 临时文件已删除: {filepath}")


def test_read_temp_file(temp_file: Path):
    assert temp_file.read_text() == "temp content"
    # 测试结束后，temp_file 自动被清理
```

### conftest.py 共享 fixture

`conftest.py` 文件是 pytest 的插件机制之一，放在某个目录下，该目录及其所有子目录中的测试都能自动使用其中定义的 fixture。

```
project/
  tests/
    conftest.py              # 全局 fixture，所有测试可用
    unit/
      conftest.py            # 仅 unit/ 目录下可见
      test_models.py
    integration/
      conftest.py            # 仅 integration/ 目录下可见
      test_api.py
```

```python
# tests/conftest.py — 需要 Python 3.10+
import pytest
from typing import Generator


@pytest.fixture(scope="session")
def db_url() -> str:
    """全局数据库连接字符串"""
    return "postgresql://test:test@localhost:5432/testdb"


@pytest.fixture
def sample_users() -> list[dict]:
    """可复用的用户列表"""
    return [
        {"id": 1, "name": "Alice", "active": True},
        {"id": 2, "name": "Bob", "active": False},
        {"id": 3, "name": "Charlie", "active": True},
    ]
```

子目录的 `conftest.py` 可以覆盖父级 fixture（遵循就近原则），也可以使用父级 fixture 来构建自己的 fixture。

### fixture 参数化

fixture 本身也可以被参数化，让一个 fixture 产出多组数据，所有依赖它的测试都会自动执行多次。

```python
# test_fixture_param.py — 需要 Python 3.10+
import pytest


@pytest.fixture(params=["mysql", "postgresql", "sqlite"])
def db_backend(request):
    """fixture 参数化：依次测试三种数据库后端"""
    print(f"\n  [setup] 初始化 {request.param} 连接")
    # 实际项目中这里会建立真正的数据库连接
    yield request.param
    print(f"\n  [teardown] 关闭 {request.param} 连接")


def test_db_ping(db_backend: str):
    """这个测试会运行 3 次，分别对应 mysql/postgresql/sqlite"""
    assert db_backend in ("mysql", "postgresql", "sqlite")
    print(f"  测试 {db_backend} 连接成功")
```

---

## 参数化测试

`@pytest.mark.parametrize` 是 pytest 中最常用的标记之一，它让一个测试函数自动运行多组数据。

```python
# test_parametrize.py — 需要 Python 3.10+
import pytest


# 基础用法：逐个指定参数值
@pytest.mark.parametrize("a, b, expected", [
    (1, 2, 3),
    (0, 0, 0),
    (-1, 1, 0),
    (100, 200, 300),
])
def test_addition(a: int, b: int, expected: int):
    assert a + b == expected


# 使用 ids 参数给每组测试命名
@pytest.mark.parametrize("username, is_valid", [
    ("alice", True),
    ("a" * 100, False),      # 太长
    ("", False),              # 空字符串
    ("user@name", True),
], ids=["正常用户名", "超长用户名", "空用户名", "含特殊字符"])
def test_username_validation(username: str, is_valid: bool):
    result = (0 < len(username) <= 50)
    assert result == is_valid
```

### 参数组合流程图

```mermaid
flowchart LR
    subgraph 输入["参数定义"]
        A1["a: 1, 2"]
        A2["b: 10, 20"]
        A3["op: add, sub"]
    end

    subgraph 展开["参数展开（笛卡尔积）"]
        B1["(1, 10, add)"]
        B2["(1, 10, sub)"]
        B3["(1, 20, add)"]
        B4["(1, 20, sub)"]
        B5["(2, 10, add)"]
        B6["(2, 10, sub)"]
        B7["(2, 20, add)"]
        B8["(2, 20, sub)"]
    end

    subgraph 执行["测试执行"]
        C1["test_math(1, 10, add)"]
        C2["test_math(1, 10, sub)"]
        C3["test_math(1, 20, add)"]
        C4["test_math(1, 20, sub)"]
        C5["test_math(2, 10, add)"]
        C6["test_math(2, 10, sub)"]
        C7["test_math(2, 20, add)"]
        C8["test_math(2, 20, sub)"]
    end

    A1 & A2 & A3 --> B1 & B2 & B3 & B4 & B5 & B6 & B7 & B8
    B1 --> C1
    B2 --> C2
    B3 --> C3
    B4 --> C4
    B5 --> C5
    B6 --> C6
    B7 --> C7
    B8 --> C8

```

当多个 `@parametrize` 装饰器叠加时，参数会自动生成笛卡尔积组合。对于 2x2x2=8 种组合来说还算可控，但如果参数维度过多，测试数量会指数爆炸，这种情况下应使用 fixture 参数化或手动选择代表性组合。

```python
# 多个 parametrize 装饰器叠加 = 笛卡尔积
@pytest.mark.parametrize("a", [1, 2])
@pytest.mark.parametrize("b", [10, 20])
@pytest.mark.parametrize("op", ["add", "sub"])
def test_math(a: int, b: int, op: str):
    """此测试运行 2 x 2 x 2 = 8 次"""
    if op == "add":
        assert a + b == a + b  # 简化为示例
    elif op == "sub":
        assert a - b == a - b
```

---

## 异常测试

pytest 提供了 `pytest.raises()` 和 `pytest.warns()` 来优雅地测试异常和警告。

```python
# test_exceptions.py — 需要 Python 3.10+
import pytest


def divide(a: float, b: float) -> float:
    if b == 0:
        raise ValueError("除数不能为零")
    return a / b


def test_divide_by_zero():
    # 验证抛出了指定异常
    with pytest.raises(ValueError, match="除数不能为零"):
        divide(10, 0)


def test_divide_success():
    assert divide(10, 2) == 5.0


def test_raises_captures_exception_info():
    """捕获异常对象，进一步验证异常属性"""
    with pytest.raises(ValueError) as exc_info:
        divide(10, 0)

    # 验证异常信息
    assert "除数不能为零" in str(exc_info.value)
    # exc_info.type 是异常类型
    assert exc_info.type is ValueError


def test_no_exception():
    """pytest.raises 的 '利器' 用法：验证某段代码不抛出异常"""
    # 如果不抛出异常，测试通过
    result = divide(10, 2)
    assert result == 5.0


# ========== 警告测试 ==========
import warnings


def deprecated_function():
    warnings.warn("此函数已废弃，请使用 new_function()", DeprecationWarning)
    return "result"


def test_deprecated_warning():
    with pytest.warns(DeprecationWarning, match="已废弃"):
        result = deprecated_function()
    assert result == "result"


def test_no_warning():
    """验证代码不产生警告"""
    with warnings.catch_warnings():
        warnings.simplefilter("error")  # 将警告转为异常
        result = divide(10, 2)
        assert result == 5.0
```

---

## Mock 与 Monkeypatch

在单元测试中，需要隔离外部依赖（网络请求、数据库、环境变量、文件系统等）。pytest 提供了两种方式：内置的 `monkeypatch` fixture 和标准库 `unittest.mock` 的集成。

### monkeypatch 修改环境变量、属性、字典

```python
# test_monkeypatch.py — 需要 Python 3.10+
import pytest
import os
from pathlib import Path


# ========== 修改环境变量 ==========
def test_env_variable(monkeypatch):
    # 设置临时环境变量
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("DEBUG", "true")

    assert os.environ["DATABASE_URL"] == "sqlite:///:memory:"
    # 测试结束后环境变量自动恢复


# ========== 修改对象属性 ==========
class Config:
    base_url = "https://api.prod.example.com"
    timeout = 30


def test_config_override(monkeypatch):
    monkeypatch.setattr(Config, "base_url", "https://api.test.example.com")
    monkeypatch.setattr(Config, "timeout", 5)

    assert Config.base_url == "https://api.test.example.com"
    assert Config.timeout == 5
    # 测试结束后 Config 的属性自动恢复


# ========== 修改字典 ==========
def test_dict_override(monkeypatch):
    data = {"api_key": "real-key", "version": "1.0"}

    monkeypatch.setitem(data, "api_key", "test-key")
    monkeypatch.setitem(data, "version", "2.0-test")

    assert data["api_key"] == "test-key"
    # 测试结束后字典自动恢复


# ========== 替换函数 ==========
def call_external_api(url: str) -> dict:
    """实际的外部 API 调用（测试中需要 mock）"""
    import requests
    return requests.get(url).json()


def test_mock_api_call(monkeypatch):
    """用 monkeypatch 替换函数，避免真实网络请求"""

    def mock_get(url: str) -> dict:
        return {"status": "ok", "data": "mocked"}

    monkeypatch.setattr(
        "test_monkeypatch.call_external_api",  # 注意：要用模块路径
        mock_get,
    )

    result = call_external_api("https://api.example.com")
    assert result == {"status": "ok", "data": "mocked"}
```

### unittest.mock 集成

对于更复杂的 mock 场景（验证调用次数、调用参数、返回值序列等），`unittest.mock` 提供了 `Mock`、`MagicMock`、`patch` 等工具。

```python
# test_mock.py — 需要 Python 3.10+
from unittest.mock import Mock, patch, MagicMock
import pytest


# ========== Mock 对象基础 ==========
def test_mock_basic():
    mock = Mock(return_value=42)
    assert mock() == 42
    assert mock(1, 2, key="value") == 42

    # 验证调用
    mock.assert_called()          # 至少被调用一次
    assert mock.call_count == 2   # 被调用了 2 次
    mock.assert_called_with(1, 2, key="value")  # 最后一次调用参数


# ========== 验证调用顺序和参数 ==========
def test_mock_call_tracking():
    service = Mock()
    service.connect("db1")
    service.connect("db2")
    service.query("SELECT 1")

    assert service.connect.call_count == 2
    service.connect.assert_any_call("db1")
    service.connect.assert_any_call("db2")

    # 获取所有调用参数
    calls = service.connect.call_args_list
    assert calls[0].args == ("db1",)
    assert calls[1].args == ("db2",)


# ========== side_effect：模拟异常 ==========
def test_mock_side_effect():
    mock = Mock(side_effect=ConnectionError("连接超时"))

    with pytest.raises(ConnectionError, match="连接超时"):
        mock()


# ========== side_effect：序列返回值 ==========
def test_mock_side_effect_sequence():
    mock = Mock(side_effect=[1, 2, 3])

    assert mock() == 1
    assert mock() == 2
    assert mock() == 3
    # 第四次调用会抛出 StopIteration


# ========== patch 装饰器 ==========
class UserService:
    @staticmethod
    def get_user_count() -> int:
        """实际查询数据库获取用户数"""
        import random
        return random.randint(1, 1000)


@patch("test_mock.UserService.get_user_count", return_value=42)
def test_user_count_with_patch(mock_get_count):
    """使用 patch 装饰器替换方法"""
    assert UserService.get_user_count() == 42
    mock_get_count.assert_called_once()
```

---

## 测试覆盖率（pytest-cov）

`pytest-cov` 是 `coverage.py` 的 pytest 插件，在执行测试的同时收集代码覆盖率数据。

```bash
# 安装
pip install pytest-cov

# 运行测试并生成覆盖率报告
pytest --cov=myapp tests/

# 生成终端报告（显示未覆盖的行）
pytest --cov=myapp --cov-report=term-missing tests/

# 生成 HTML 报告
pytest --cov=myapp --cov-report=html tests/
# 报告生成在 htmlcov/index.html
```

```ini
# pyproject.toml 中配置覆盖率
[tool.coverage.run]
source = ["myapp"]
omit = [
    "*/migrations/*",
    "*/tests/*",
    "*/__init__.py",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if __name__ == .__main__.:",
    "raise NotImplementedError",
]
```

::: tip 覆盖率不是银弹
100% 覆盖率不代表没 bug。覆盖率只能告诉你"哪些代码没被执行"，不能告诉你"执行结果对不对"。目标应该是 80%-90% 的覆盖率，重点覆盖核心业务逻辑和边界条件。
:::

---

## 常用插件

pytest 的强大很大程度上来自其插件生态。以下是最常用的几个插件：

| 插件 | 用途 | 安装命令 | 关键特性 |
|------|------|----------|---------|
| **pytest-xdist** | 并行执行测试 | `pip install pytest-xdist` | 多 CPU 核心并行，大幅缩短测试时间 |
| **pytest-timeout** | 测试超时控制 | `pip install pytest-timeout` | 自动终止卡死的测试 |
| **pytest-mock** | mock 增强 | `pip install pytest-mock` | 提供 `mocker` fixture，简化 mock 使用 |
| **pytest-cov** | 覆盖率 | `pip install pytest-cov` | 与 coverage.py 无缝集成 |
| **pytest-asyncio** | 异步测试 | `pip install pytest-asyncio` | 测试 async/await 代码 |
| **pytest-django** | Django 集成 | `pip install pytest-django` | 为 Django 提供专用 fixture |
| **pytest-sugar** | 美化输出 | `pip install pytest-sugar` | 彩色进度条，更直观的输出 |
| **pytest-rerunfailures** | 失败重试 | `pip install pytest-rerunfailures` | 自动重试不稳定的测试 |

### pytest-xdist：并行执行

```bash
# 自动检测 CPU 核心数，并行执行测试
pytest -n auto

# 指定 4 个 worker 并行
pytest -n 4

# 按文件分发（每个 worker 执行一个文件，推荐）
pytest -n auto --dist loadfile
```

::: warning 并行测试注意事项
使用 `-n auto` 时，确保测试之间完全独立（无共享状态）。如果 fixture 使用了 `scope="session"` 且操作了共享资源（如数据库），并行执行可能导致冲突。此时应使用 `--dist loadscope` 将同 scope 的测试分到同一个 worker。
:::

### pytest-timeout：超时控制

```bash
# 全局设置超时时间（秒）
pytest --timeout=30

# 或者通过装饰器对单个测试设置
```

```python
import pytest


@pytest.mark.timeout(5)
def test_slow_operation():
    """此测试必须在 5 秒内完成，否则失败"""
    import time
    time.sleep(2)  # 模拟耗时操作
    assert True
```

### pytest-mock：更简洁的 mock

```python
# test_with_pytest_mock.py — 需要 Python 3.10+
import pytest
import os


class Database:
    def connect(self, url: str) -> bool:
        # 真实连接数据库
        return True


def test_mocker_fixture(mocker):
    """pytest-mock 提供的 mocker fixture 比 unittest.mock 更便捷"""
    # mocker.patch 自动在测试结束后撤销
    mock_connect = mocker.patch.object(Database, "connect", return_value=True)

    db = Database()
    result = db.connect("postgresql://...")

    assert result is True
    mock_connect.assert_called_once()

    # mocker 还提供了 spy 功能
    mocker.spy(os, "getenv")
    os.getenv("PATH")
    assert os.getenv.call_count == 1
```

---

## fixture 生命周期：setup 与 teardown 时序图

```mermaid
sequenceDiagram
    participant S as session fixture
    participant M as module fixture
    participant C as class fixture
    participant F as function fixture
    participant T as test_1
    participant T2 as test_2

    Note over S,T2: ====== 测试会话开始 ======

    activate S
    S->>S: setup（创建数据库连接池）

    Note over S,T2: ====== 进入模块 ======

    activate M
    M->>M: setup（加载模块级配置）

    Note over S,T2: ====== 进入测试类 ======

    activate C
    C->>C: setup（初始化类级资源）

    Note over S,T2: ====== test_1 开始 ======

    activate F
    F->>F: setup（创建临时文件）
    F-->>T: 注入 fixture
    T->>T: 执行测试断言
    deactivate F
    F->>F: teardown（删除临时文件）

    Note over S,T2: ====== test_2 开始（function fixture 重新创建）======

    activate F
    F->>F: setup（创建新的临时文件）
    F-->>T2: 注入 fixture
    T2->>T2: 执行测试断言
    deactivate F
    F->>F: teardown（删除临时文件）

    Note over S,T2: ====== 测试类结束 ======

    deactivate C
    C->>C: teardown（清理类级资源）

    Note over S,T2: ====== 模块结束 ======

    deactivate M
    M->>M: teardown（卸载模块级配置）

    Note over S,T2: ====== 会话结束 ======

    deactivate S
    S->>S: teardown（关闭数据库连接池）
```

fixture 的销毁顺序与创建顺序严格相反（LIFO），确保资源依赖关系正确。`session` fixture 最先创建、最后销毁；`function` fixture 最后创建、最先销毁。

---

## 常见陷阱

| 陷阱 | 问题描述 | 错误示例 | 正确做法 |
|------|---------|---------|---------|
| **fixture 作用域混淆** | 将 `scope="session"` 的 fixture 用于依赖独立数据的测试，导致测试间互相影响 | 多个测试修改同一个 session 级 fixture 的返回值 | 需要独立数据时使用 `scope="function"`（默认值） |
| **mock 过度使用** | 把被测函数的所有依赖都 mock 掉，导致测试什么都没验证 | `mocker.patch("mymodule.everything")` | 只 mock 外部依赖（网络、数据库、文件系统），保留核心逻辑的真实执行 |
| **测试间状态污染** | 一个测试修改了全局状态（模块级变量、环境变量），影响后续测试 | 测试 A 修改了 `os.environ["KEY"]`，测试 B 依赖该环境变量 | 使用 `monkeypatch` fixture 自动恢复；或使用 `scope="function"` 的 fixture 隔离 |
| **参数化过多组合** | 使用多个 `@parametrize` 装饰器导致笛卡尔积爆炸，测试数量指数增长 | `@parametrize("a", range(100))` + `@parametrize("b", range(100))` = 10000 次测试 | 使用 fixture 参数化，或手动选择代表性组合 |
| **fixture 依赖链过深** | fixture 嵌套依赖层级过多，导致调试困难、测试启动慢 | A 依赖 B，B 依赖 C，C 依赖 D... | 保持 fixture 依赖链不超过 2-3 层；优先使用 `conftest.py` 就近原则 |
| **忽略 teardown** | yield fixture 中没有写 teardown 代码，导致资源泄漏 | 创建了数据库连接但 yield 后没有关闭 | 总是在 yield 之后写清理代码；使用 `try/finally` 确保清理一定执行 |
| **在 fixture 中做复杂断言** | fixture 应该是"准备环境"，不应该包含测试逻辑 | fixture 中写了 `assert data["count"] > 0` | 将断言放在测试函数中，fixture 只负责准备数据 |
| **测试函数名不以 test_ 开头** | 虽然写了测试函数，但 pytest 不会自动发现它 | `def my_test():` | `def test_my_test():` |

---

## 最佳实践

### 测试命名规范

| 规范 | 示例 | 说明 |
|------|------|------|
| 函数名以 `test_` 开头 | `test_user_login_success` | pytest 自动发现 |
| 描述被测对象和场景 | `test_order_total_with_discount` | 一看就知道在测什么 |
| 使用下划线分隔 | `test_empty_list_returns_zero` | 符合 Python 命名惯例 |
| 避免模糊命名 | ~~`test_1`~~、~~`test_stuff`~~ | 未来你看不懂 |

### AAA 模式（Arrange-Act-Assert）

每个测试函数应该清晰地分为三部分：

```python
# test_aaa_pattern.py — 需要 Python 3.10+
import pytest


class ShoppingCart:
    def __init__(self):
        self._items: list[dict] = []

    def add_item(self, name: str, price: float, quantity: int = 1):
        self._items.append({"name": name, "price": price, "quantity": quantity})

    def total(self) -> float:
        return sum(item["price"] * item["quantity"] for item in self._items)

    def clear(self):
        self._items.clear()


def test_cart_total_with_multiple_items():
    # ===== Arrange（准备）=====
    cart = ShoppingCart()
    cart.add_item("Python 编程", 59.0, 2)
    cart.add_item("数据结构", 45.0, 1)

    # ===== Act（执行）=====
    result = cart.total()

    # ===== Assert（断言）=====
    assert result == 163.0


def test_cart_total_empty():
    # Arrange
    cart = ShoppingCart()

    # Act
    result = cart.total()

    # Assert
    assert result == 0.0
```

### 一个测试只测一件事

```python
# ❌ 不好：一个测试验证多个概念
def test_user_service():
    service = UserService()
    service.create_user("alice", "alice@example.com")
    user = service.get_user("alice")
    assert user.name == "alice"
    assert user.email == "alice@example.com"
    service.delete_user("alice")
    assert service.get_user("alice") is None
    # 这个测试同时验证了创建、查询、删除——任何一个失败都不好定位

# ✅ 好：拆分为独立的测试
def test_create_user():
    service = UserService()
    service.create_user("alice", "alice@example.com")
    user = service.get_user("alice")
    assert user.name == "alice"

def test_get_user_email():
    service = UserService()
    service.create_user("alice", "alice@example.com")
    user = service.get_user("alice")
    assert user.email == "alice@example.com"

def test_delete_user():
    service = UserService()
    service.create_user("alice", "alice@example.com")
    service.delete_user("alice")
    assert service.get_user("alice") is None
```

### 测试文件组织

```
tests/
  conftest.py              # 全局 fixture
  unit/                    # 单元测试
    test_models.py
    test_services.py
    test_utils.py
  integration/             # 集成测试
    test_api.py
    test_database.py
  e2e/                     # 端到端测试
    test_user_flow.py
  fixtures/                # 测试用的静态数据
    users.json
    sample_data.csv
```

### 标记（mark）分类

```python
# 使用自定义标记对测试分类
@pytest.mark.slow
def test_large_dataset_processing():
    ...

@pytest.mark.integration
def test_full_pipeline():
    ...

@pytest.mark.smoke
def test_health_check():
    ...
```

```ini
# pyproject.toml 中注册自定义标记
[tool.pytest.ini_options]
markers = [
    "slow: 慢速测试（耗时长）",
    "integration: 集成测试（需要外部服务）",
    "smoke: 冒烟测试（核心功能快速验证）",
]
```

```bash
# 只运行冒烟测试
pytest -m smoke

# 跳过慢速测试
pytest -m "not slow"

# 运行集成测试但跳过慢速的
pytest -m "integration and not slow"
```

---

## 完整实战示例

```python
# test_calculator.py — 需要 Python 3.10+
# 一个完整的测试文件，涵盖所有核心概念
import pytest
from typing import Any


# ========== 被测代码 ==========
class Calculator:
    """一个简单的计算器类"""

    def add(self, a: float, b: float) -> float:
        return a + b

    def subtract(self, a: float, b: float) -> float:
        return a - b

    def multiply(self, a: float, b: float) -> float:
        return a * b

    def divide(self, a: float, b: float) -> float:
        if b == 0:
            raise ValueError("除数不能为零")
        return a / b

    def power(self, base: float, exponent: float) -> float:
        return base ** exponent


# ========== Fixture ==========
@pytest.fixture
def calc() -> Calculator:
    """每个测试获得一个全新的 Calculator 实例"""
    return Calculator()


@pytest.fixture
def large_numbers() -> list[tuple[float, float]]:
    """提供大数测试数据"""
    return [(1e10, 1e10), (1e100, 1e100)]


# ========== 基本断言 ==========
def test_add(calc: Calculator):
    assert calc.add(1, 2) == 3
    assert calc.add(-1, 1) == 0
    assert calc.add(0.1, 0.2) == pytest.approx(0.3)  # 浮点数比较


# ========== 参数化测试 ==========
@pytest.mark.parametrize("a, b, expected", [
    (10, 2, 5),
    (9, 3, 3),
    (0, 5, 0),
    (-10, 2, -5),
    (-10, -2, 5),
], ids=["正数除正数", "整除", "零除正数", "负数除正数", "负数除负数"])
def test_divide(calc: Calculator, a: float, b: float, expected: float):
    assert calc.divide(a, b) == expected


# ========== 异常测试 ==========
def test_divide_by_zero_raises(calc: Calculator):
    with pytest.raises(ValueError, match="除数不能为零"):
        calc.divide(10, 0)


# ========== 使用 monkeypatch ==========
def test_with_env_config(calc: Calculator, monkeypatch):
    """模拟环境变量影响计算精度"""
    monkeypatch.setenv("CALC_PRECISION", "2")

    # 如果项目中有精度配置逻辑，这里可以验证
    assert calc.add(1.234, 5.678) == pytest.approx(6.912, abs=0.001)


# ========== 跳过测试 ==========
@pytest.mark.skip(reason="指数运算待实现")
def test_power(calc: Calculator):
    assert calc.power(2, 3) == 8


@pytest.mark.skipif(
    "sys.version_info < (3, 11)",
    reason="需要 Python 3.11+ 的数学库特性",
)
def test_python311_feature(calc: Calculator):
    # 该测试仅在 Python 3.11+ 上运行
    assert calc.add(1, 1) == 2
```

---

## 术语表

| 术语 | 英文 | 含义 |
|------|------|------|
| **fixture** | Fixture | 测试夹具，为测试准备环境和数据，测试结束后自动清理 |
| **conftest** | Configuration Test | pytest 的配置和插件文件，用于共享 fixture 和钩子 |
| **parametrize** | Parametrize | 参数化测试，让一个测试函数运行多组数据 |
| **monkeypatch** | Monkeypatch | pytest 内置的 fixture，用于临时修改模块/类/环境变量 |
| **mock** | Mock | 模拟对象，用于替代真实依赖，验证调用行为 |
| **scope** | Scope | fixture 的生命周期范围：function/class/module/package/session |
| **yield fixture** | Yield Fixture | 使用 `yield` 实现 setup/teardown 模式的 fixture |
| **assert introspection** | Assert Introspection | pytest 对 assert 语句的重写，失败时展示详细对比信息 |
| **coverage** | Coverage | 代码覆盖率，衡量测试执行了多少代码 |
| **AAA** | Arrange-Act-Assert | 测试函数的三段式结构：准备、执行、断言 |
| **smoke test** | Smoke Test | 冒烟测试，验证核心功能是否正常 |
| **regression test** | Regression Test | 回归测试，确保新代码不破坏已有功能 |
| **side effect** | Side Effect | Mock 对象的副作用，如抛出异常或返回序列值 |
| **teardown** | Teardown | 测试后清理，释放资源，恢复环境 |
| **笛卡尔积** | Cartesian Product | 多个参数化装饰器叠加时，参数组合的总数 = 各维度乘积 |

---

## 延伸阅读

| 资源 | 说明 |
|------|------|
| [pytest 官方文档](https://docs.pytest.org/) | 最权威的完整参考，包含所有 API 和插件说明 |
| [pytest 中文文档](https://pytest.org.cn/) | 官方文档的中文翻译版本 |
| [Python Testing with pytest](https://pragprog.com/titles/bopytest2/) | Brian Okken 的 pytest 实战书籍，推荐阅读 |
| [pytest-cov 文档](https://pytest-cov.readthedocs.io/) | 覆盖率插件的详细配置说明 |
| [pytest-xdist 文档](https://github.com/pytest-dev/pytest-xdist) | 并行测试执行和分布式测试 |
| [unittest.mock 官方文档](https://docs.python.org/3/library/unittest.mock.html) | Python 标准库 mock 模块的完整参考 |
| [pytest 插件列表](https://docs.pytest.org/en/stable/reference/plugin_list.html) | 官方收录的 pytest 插件清单 |
| [Real Python - pytest 教程](https://realpython.com/pytest-python-testing/) | 面向初学者的 pytest 入门教程 |
| [pytest-mock 文档](https://pytest-mock.readthedocs.io/) | pytest-mock 插件的官方文档 |

## 版本差异（第三方库 → 当前稳定版）

| 库 | 本文编写时 | 当前稳定版 |
|----|-----------|-----------|
| `pydantic` | 1.x | 2.x（V2 核心重写，API 兼容层 `v1` 可选） |
| `pytest` | 7.x | 8.x（`pytest 8` 移除部分旧插件兼容） |
| `Pillow` | 9.x/10.x | 11.x |
| `psutil` | 5.x | 6.x/7.x |
| `chardet` | 4.x | 5.x（纯 Python；如需更高性能可选用 `charset-normalizer` 或维护中的 `faust-cchardet`） |

> 本文示例多为概念讲解，API 基本稳定；升级第三方库时以官方 changelog 为准。
