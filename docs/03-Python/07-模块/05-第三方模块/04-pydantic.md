---
title: Pydantic — 运行时数据校验与序列化
version: 2.0
author: 文档维护组
created: 2026-06-05
updated: 2026-08-12
status: 正式
category: Python

---
# Pydantic — 运行时数据校验与序列化

> **一句话概括**：Pydantic 是 Python 领域最强大的数据校验与序列化库，通过类型注解驱动模型定义，在运行时自动完成类型转换、校验和序列化，让你的数据模型"写一次，处处安全"。

---

## 是什么 → 为什么 → 怎么做

| 层次 | 内容 |
|------|------|
| **是什么** | 一个基于 Python 类型注解的运行时数据校验与序列化库。定义模型类时声明字段类型，Pydantic 自动处理类型转换、校验和 JSON 序列化 |
| **为什么** | 传统方式用 `dict` 传数据，类型不安全、校验靠手写 `if/else`、序列化要手动转换；Pydantic 将校验逻辑从代码中剥离，类型注解即校验规则，一个模型定义同时满足结构化、校验和序列化需求 |
| **怎么做** | `pip install pydantic`，继承 `BaseModel`，用类型注解定义字段，实例化时自动校验，`.model_dump()` 和 `.model_dump_json()` 完成序列化 |

---

## 技术选型对比

Pydantic 并非唯一的数据建模方案。在 Python 生态中，`dataclass`、`TypedDict`、`attrs` 各自在不同场景下发光发热。理解它们的差异，才能做出正确的技术选型。

| 维度 | Pydantic v2 | dataclass | TypedDict | attrs |
|------|-------------|-----------|-----------|-------|
| **运行时校验** | 自动类型转换 + 校验 | 无（仅注解） | 无（仅类型提示） | 可选（`@define` 配合 validator） |
| **JSON 序列化** | `.model_dump()` / `.model_dump_json()` | 需 `dataclasses.asdict()` | 需手动转换 | 需 `attrs.asdict()` |
| **嵌套模型** | 原生支持，自动递归校验 | 需手动处理 | 不支持嵌套结构 | 需手动处理 |
| **字段约束** | `Field(gt=0, le=100)` | 无 | 无 | 有限支持 |
| **自定义校验** | `@field_validator` / `@model_validator` | 需 `__post_init__` | 不支持 | 通过 `@define` 的 validator |
| **性能（v2）** | 极快（Rust 核心 `pydantic-core`） | 快（纯 Python） | 快（零开销） | 快（纯 Python） |
| **配置选项** | `model_config` 丰富（frozen / extra / ...） | `frozen=True` | 无 | 丰富的选项 |
| **生态集成** | FastAPI / SQLModel / LangChain | 标准库 | 标准库 | Django / SQLAlchemy 等 |
| **Python 版本** | 3.8+（v2 推荐 3.10+） | 3.7+（标准库） | 3.8+（标准库） | 3.7+ |
| **适用场景** | API 数据校验、配置管理、数据管道 | 纯数据容器、内部状态 | 函数签名类型提示 | 需要灵活度的数据类 |

> **选型建议**：与外部数据打交道的场景（API 请求/响应、配置文件、数据库 ORM）首选 Pydantic；纯内部数据容器用 `dataclass` 即可；函数参数类型提示用 `TypedDict`；需要 attrs 特有功能（如 `__hash__` 自动生成）时用 attrs。

### 技术选型决策流程

```mermaid
flowchart TD
    START["需要定义数据结构"] --> Q1{"数据来源？"}
    Q1 -->|"外部数据<br/>（API/配置/数据库）"| Q2{"需要运行时校验？"}
    Q1 -->|"纯内部数据" | Q3{"需要方法/继承？"}

    Q2 -->|"是"| PY["Pydantic ✅<br/>类型注解 = 校验规则"]
    Q2 -->|"否"| TD["TypedDict<br/>仅类型提示"]

    Q3 -->|"是"| DC["@dataclass ✅<br/>保留完整 class 能力"]
    Q3 -->|"否"| Q4{"需要不可变？"}
    Q4 -->|"是"| DC2["@dataclass(frozen=True)"]
    Q4 -->|"否"| Q5{"字段多/结构复杂？"}
    Q5 -->|"是"| PY2["Pydantic ✅<br/>字段约束 + 序列化"]
    Q5 -->|"否"| DC3["@dataclass ✅"]

```

---

## 校验流程架构

Pydantic v2 的底层校验引擎由 Rust 编写的 `pydantic-core` 驱动，Python 层负责模型定义，校验逻辑在 Rust 层高效执行。

```mermaid
graph TB
    subgraph Python["Python 层"]
        BM["BaseModel 定义<br/>类型注解 + Field() + validator"]
        INST["实例化<br/>User(name='alice', age=30)"]
    end

    subgraph Rust["pydantic-core（Rust）"]
        PARSE["字段解析<br/>识别类型与约束"]
        COERCE["类型强制转换<br/>str→int, str→datetime 等"]
        VALIDATE["约束校验<br/>gt/lt/min_length/regex 等"]
        CUSTOM["自定义校验器<br/>@field_validator<br/>@model_validator"]
    end

    subgraph Output["输出"]
        OK["校验通过<br/>返回完整模型实例"]
        ERR["校验失败<br/>抛出 ValidationError"]
    end

    BM --> INST
    INST --> PARSE
    PARSE --> COERCE
    COERCE --> VALIDATE
    VALIDATE --> CUSTOM
    CUSTOM --> OK
    CUSTOM --> ERR

```

**校验执行顺序**：类型强制转换（coerce）先于约束校验，自定义 `@field_validator` 在字段级约束之后执行，`@model_validator` 在所有字段校验完成后执行。

---

## BaseModel 基础

### 第一个模型

```python
# Python 3.10+
from pydantic import BaseModel, ValidationError
from datetime import datetime


class User(BaseModel):
    """用户模型"""
    id: int
    name: str
    email: str
    age: int = 18                         # 带默认值的字段
    created_at: datetime = datetime.now()  # 默认值可以是动态值


# 正常实例化 — 自动类型转换
user = User(id=1, name="Alice", email="alice@example.com", age="25")
print(user)          # id=1 name='Alice' email='alice@example.com' age=25
print(user.age)      # 25（str "25" 自动转为 int）

# 类型校验失败
try:
    User(id="not_a_number", name="Bob", email="bob@example.com")
except ValidationError as e:
    # 错误信息结构化，包含位置和原因
    print(e.errors())
    # [{'type': 'int_parsing', 'loc': ('id',), 'msg': '...', 'input': 'not_a_number'}]

# 缺失必填字段
try:
    User(name="Charlie", email="charlie@example.com")
except ValidationError as e:
    print(f"缺失字段: {e.errors()[0]['loc']}")  # 缺失字段: ('id',)
```

### JSON 序列化（v2 API）

Pydantic v2 提供了完整的序列化/反序列化数据流：

```mermaid
flowchart LR
    subgraph "反序列化（输入）"
        JSON_IN["JSON 字符串<br/>model_validate_json()"]
        DICT_IN["dict<br/>model_validate()"]
        KW_IN["关键字参数<br/>User(**data)"]
    end

    subgraph "Pydantic 模型"
        MODEL["BaseModel 实例<br/>类型安全 + 属性访问"]
    end

    subgraph "序列化（输出）"
        DICT_OUT["dict<br/>model_dump()"]
        JSON_OUT["JSON 字符串<br/>model_dump_json()"]
    end

    JSON_IN --> MODEL
    DICT_IN --> MODEL
    KW_IN --> MODEL
    MODEL --> DICT_OUT
    MODEL --> JSON_OUT

```

```python
# Python 3.10+
from pydantic import BaseModel
from datetime import datetime


class Post(BaseModel):
    id: int
    title: str
    content: str
    published_at: datetime


post = Post(
    id=1,
    title="Hello Pydantic",
    content="Pydantic makes data validation easy.",
    published_at="2026-06-05T10:00:00"
)

# 序列化为 dict（v2 新 API）
print(post.model_dump())
# {'id': 1, 'title': 'Hello Pydantic', 'content': '...', 'published_at': datetime(...)}

# 序列化为 JSON 字符串
print(post.model_dump_json(indent=2))
# {
#   "id": 1,
#   "title": "Hello Pydantic",
#   "content": "Pydantic makes data validation easy.",
#   "published_at": "2026-06-05T10:00:00"
# }

# 从 JSON 反序列化
json_data = '{"id": 2, "title": "JSON input", "content": "From JSON", "published_at": "2026-06-05T12:00:00"}'
post2 = Post.model_validate_json(json_data)
print(post2.title)  # JSON input
```

::: warning v1 vs v2 API 差异
Pydantic v2 中序列化方法已重命名：`dict()` 改为 `model_dump()`，`json()` 改为 `model_dump_json()`，`parse_raw()` 改为 `model_validate_json()`。v1 方法在 v2 中仍可用但已弃用，新项目应使用 v2 API。
:::

---

## 字段类型与校验器

### Field() 约束

`Field()` 是 Pydantic 中最常用的工具，用于在字段级别声明约束条件和元数据。

```python
# Python 3.10+
from pydantic import BaseModel, Field
from typing import Optional


class Product(BaseModel):
    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="产品名称",
        examples=["iPhone 15"]
    )
    price: float = Field(gt=0, le=999999, description="价格，单位：元")
    quantity: int = Field(ge=0, default=0, description="库存数量")
    tags: list[str] = Field(default_factory=list, description="标签列表")
    description: Optional[str] = Field(
        default=None,
        max_length=1000,
        description="产品描述（可选）"
    )


# 正常实例化
product = Product(name="MacBook Pro", price=14999.0, quantity=50)
print(product.model_dump())

# 校验失败示例
try:
    Product(name="", price=-100, quantity=10)
except ValidationError as e:
    for err in e.errors():
        print(f"字段 {err['loc']}: {err['msg']}")
```

**Field() 常用约束参数**：

| 参数 | 适用类型 | 说明 |
|------|---------|------|
| `default` / `default_factory` | 所有 | 默认值 / 默认值工厂函数 |
| `gt` / `ge` / `lt` / `le` | `int` / `float` / `Decimal` | 大于 / 大于等于 / 小于 / 小于等于 |
| `min_length` / `max_length` | `str` / `list` / `bytes` | 最小 / 最大长度 |
| `pattern` | `str` | 正则表达式校验 |
| `min_items` / `max_items` | `list` / `set` | 最小 / 最大元素数 |
| `multiple_of` | `int` / `float` | 倍数约束 |
| `description` | 所有 | 字段描述（用于 JSON Schema 生成） |
| `examples` | 所有 | 示例值列表 |

### @field_validator 字段级校验

当 `Field()` 内置约束不够用时，使用 `@field_validator` 编写自定义校验逻辑。

```python
# Python 3.10+
from pydantic import BaseModel, Field, field_validator
from typing import ClassVar


class UserRegistration(BaseModel):
    username: str = Field(min_length=3, max_length=20)
    password: str = Field(min_length=8)
    password_confirm: str
    email: str

    # 禁止的用户名黑名单
    FORBIDDEN_USERNAMES: ClassVar[set[str]] = {"admin", "root", "system"}

    @field_validator("username")
    @classmethod
    def username_must_be_valid(cls, v: str) -> str:
        """校验用户名不在黑名单且只含合法字符"""
        if v.lower() in cls.FORBIDDEN_USERNAMES:
            raise ValueError(f"用户名 '{v}' 已被系统保留")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("用户名只能包含字母、数字、下划线和连字符")
        return v

    @field_validator("email")
    @classmethod
    def email_must_contain_at(cls, v: str) -> str:
        """简单校验邮箱格式"""
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("邮箱格式不正确")
        return v.strip().lower()

    @field_validator("password_confirm")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        """校验两次密码输入一致"""
        # info.data 包含已校验过的字段值
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("两次输入的密码不一致")
        return v


# 使用示例
try:
    user = UserRegistration(
        username="admin",
        password="12345678",
        password_confirm="12345679",
        email="bad-email"
    )
except ValidationError as e:
    for err in e.errors():
        print(f"  {err['loc']}: {err['msg']}")
```

::: tip field_validator 的 mode 参数
从 v2.5 开始，`@field_validator` 支持 `mode` 参数：`mode='before'` 在类型转换前执行（拿到原始值），`mode='after'`（默认）在类型转换后执行。例如需要校验 JSON 字符串格式时，用 `mode='before'` 确保拿到原始字符串。
:::

### @model_validator 模型级校验

当校验逻辑需要跨字段协调时，使用 `@model_validator`。

```python
# Python 3.11+（typing.Self 需要 3.11+）
from pydantic import BaseModel, model_validator
from typing import Self


class DateRange(BaseModel):
    start_date: str
    end_date: str

    @model_validator(mode="after")
    def check_date_order(self) -> Self:
        """确保开始日期不晚于结束日期"""
        if self.start_date > self.end_date:
            raise ValueError(
                f"开始日期 ({self.start_date}) 不能晚于结束日期 ({self.end_date})"
            )
        return self

    @model_validator(mode="before")
    @classmethod
    def normalize_dates(cls, data: dict) -> dict:
        """预处理：如果只传了一个日期，自动填充另一个"""
        if isinstance(data, dict):
            if "start_date" in data and "end_date" not in data:
                data["end_date"] = data["start_date"]
            elif "end_date" in data and "start_date" not in data:
                data["start_date"] = data["end_date"]
        return data


# 使用示例
# 只传一个日期，自动补全
dr = DateRange(start_date="2026-06-01")
print(dr.model_dump())  # {'start_date': '2026-06-01', 'end_date': '2026-06-01'}

# 日期顺序错误
try:
    DateRange(start_date="2026-06-10", end_date="2026-06-01")
except ValidationError as e:
    print(e.errors()[0]["msg"])  # 开始日期不能晚于结束日期
```

---

## 校验器分类与执行流程

不同类型校验器在数据流入模型时按特定顺序执行，理解这个流程是排查校验问题的前提。

```mermaid
flowchart TD
    INPUT["原始输入数据<br/>dict / JSON / kwargs"] --> BEFORE_MODEL["@model_validator(mode='before')<br/>预处理原始数据"]

    BEFORE_MODEL --> PER_FIELD{"逐字段处理"}

    subgraph PerField["逐字段校验循环"]
        BEFORE_FIELD["@field_validator(mode='before')<br/>拿到原始值"] --> COERCE_FIELD["类型强制转换<br/>str→int, str→datetime"]
        COERCE_FIELD --> BUILTIN["内置约束校验<br/>gt/lt/min_length/pattern"]
        BUILTIN --> AFTER_FIELD["@field_validator(mode='after')<br/>拿到转换后的值"]
    end

    PER_FIELD --> PerField
    PerField --> AFTER_MODEL["@model_validator(mode='after')<br/>跨字段校验 / 复杂业务逻辑"]

    AFTER_MODEL --> PASS["校验通过<br/>返回模型实例"]

    INPUT -.->|"任意阶段失败"| FAIL["抛出 ValidationError<br/>包含结构化错误信息"]

```

**关键排序规则**：
1. `@model_validator(mode='before')` 最先执行，适合数据预处理
2. 逐字段执行：`before` 校验器 → 类型转换 → 内置约束 → `after` 校验器
3. `@model_validator(mode='after')` 最后执行，可访问所有已校验字段
4. 任何阶段失败立即终止，抛出 `ValidationError`

---

## 嵌套模型与递归校验

Pydantic 原生支持嵌套模型，子模型会自动递归校验。

```python
# Python 3.10+
from pydantic import BaseModel
from typing import Optional


class Address(BaseModel):
    street: str
    city: str
    zip_code: str
    country: str = "中国"


class Company(BaseModel):
    name: str
    address: Address  # 嵌套模型
    industry: Optional[str] = None


class Employee(BaseModel):
    id: int
    name: str
    company: Company
    skills: list[str] = []


# 从嵌套 dict 直接实例化
data = {
    "id": 1,
    "name": "张三",
    "company": {
        "name": "TechCorp",
        "address": {
            "street": "科技路 88 号",
            "city": "北京",
            "zip_code": "100000"
        },
        "industry": "互联网"
    },
    "skills": ["Python", "FastAPI", "Pydantic"]
}

emp = Employee(**data)
print(emp.company.address.city)  # 北京
print(emp.model_dump_json(indent=2))
```

### 递归模型（自引用）

```python
# Python 3.10+
from pydantic import BaseModel
from typing import Optional


class Category(BaseModel):
    name: str
    parent: Optional["Category"] = None  # 自引用（需用字符串形式）
    subcategories: list["Category"] = []


# 构建递归结构
electronics = Category(
    name="电子产品",
    subcategories=[
        Category(
            name="手机",
            subcategories=[
                Category(name="智能手机"),
                Category(name="功能手机"),
            ]
        ),
        Category(name="电脑"),
    ]
)

print(electronics.model_dump_json(indent=2))
```

::: warning 自引用模型的前向声明
当模型需要引用自身时，必须使用字符串形式 `"Category"` 而非直接引用 `Category`，因为类定义尚未完成。也可以在文件顶部使用 `from __future__ import annotations`（Python 3.7+ 即可用，注意 PEP 563 的延迟求值**从未**成为解释器默认行为），使注解统一延迟求值。
:::

---

## 模型配置项

`model_config` 是 Pydantic v2 中控制模型行为的集中配置入口，替代了 v1 的 `class Config` 内部类。

```python
# Python 3.10+
from pydantic import BaseModel, ConfigDict


class StrictUser(BaseModel):
    """严格模式配置"""
    model_config = ConfigDict(
        # 禁止额外字段 — 传入未定义的字段会报错
        extra="forbid",
        # 冻结模型 — 实例化后不可修改字段
        frozen=True,
        # 赋值时校验 — 修改属性时触发校验
        validate_assignment=True,
        # 从属性名填充 — 允许用属性名查找别名
        from_attributes=True,
        # 严格类型 — 不自动做类型转换
        strict=True,
    )

    id: int
    name: str
    email: str


# frozen=True 的效果
user = StrictUser(id=1, name="Alice", email="alice@example.com")
try:
    user.name = "Bob"  # 抛出 ValidationError
except ValidationError:
    print("模型已冻结，无法修改字段")

# extra="forbid" 的效果
try:
    StrictUser(id=1, name="Alice", email="alice@example.com", extra_field="oops")
except ValidationError:
    print("不允许传入额外字段")
```

**常用配置项速查**：

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `extra` | `"allow"` / `"forbid"` / `"ignore"` | `"ignore"` | 如何处理未定义的额外字段 |
| `frozen` | `bool` | `False` | 是否冻结模型为不可变 |
| `validate_assignment` | `bool` | `False` | 属性赋值时是否触发校验 |
| `from_attributes` | `bool` | `False` | 是否允许从 ORM 对象创建模型 |
| `strict` | `bool` | `False` | 是否开启严格模式（不自动类型转换） |
| `str_strip_whitespace` | `bool` | `False` | 是否自动去除字符串首尾空白 |
| `str_to_lower` | / `str_to_upper` | `bool` | `False` | 是否自动转换字符串大小写 |
| `use_enum_values` | `bool` | `False` | 序列化时是否使用枚举值 |
| `validate_default` | `bool` | `False` | 是否校验默认值 |
| `populate_by_name` | `bool` | `False` | 是否允许用字段名填充别名 |

---

## 泛型模型与 Discriminated Union

### 泛型模型

```python
# Python 3.10+
from pydantic import BaseModel
from typing import Generic, TypeVar

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """通用分页响应模型"""
    items: list[T]
    total: int
    page: int
    page_size: int


class UserItem(BaseModel):
    id: int
    name: str


class OrderItem(BaseModel):
    id: str
    amount: float
    status: str


# 使用泛型
user_page = PaginatedResponse[UserItem](
    items=[UserItem(id=1, name="Alice"), UserItem(id=2, name="Bob")],
    total=100,
    page=1,
    page_size=20,
)
print(user_page.model_dump_json(indent=2))
```

### Discriminated Union（可区分联合）

当需要根据某个字段的值来区分不同的模型时，使用 `Discriminated Union`，Pydantic 会自动选择正确的模型进行校验。

```python
# Python 3.10+
from pydantic import BaseModel
from typing import Annotated, Literal, Union
from typing import TypeAlias


class Cat(BaseModel):
    pet_type: Literal["cat"]
    meows: int                  # 猫叫次数
    favorite_toy: str


class Dog(BaseModel):
    pet_type: Literal["dog"]
    barks: float                # 犬吠音量
    favorite_treat: str


class Fish(BaseModel):
    pet_type: Literal["fish"]
    fins: int                   # 鱼鳍数量
    water_type: str             # 淡水/海水


# 可区分联合 — 根据 pet_type 自动选择模型
Pet: TypeAlias = Annotated[
    Union[Cat, Dog, Fish],
    Field(discriminator="pet_type")
]


class PetOwner(BaseModel):
    name: str
    pet: Pet


# 校验时自动根据 pet_type 选择正确的模型
owner1 = PetOwner(
    name="张三",
    pet={"pet_type": "cat", "meows": 5, "favorite_toy": "毛线球"}
)
print(type(owner1.pet))  # <class '__main__.Cat'>

owner2 = PetOwner(
    name="李四",
    pet={"pet_type": "dog", "barks": 3.5, "favorite_treat": "骨头"}
)
print(type(owner2.pet))  # <class '__main__.Dog'>

# 传入不匹配的字段会报错
try:
    PetOwner(
        name="王五",
        pet={"pet_type": "cat", "barks": 1.0}  # cat 没有 barks 字段
    )
except ValidationError as e:
    print("校验失败：字段不匹配")
```

---

## 序列化：model_dump() / model_dump_json()

Pydantic v2 的序列化 API 提供了丰富的控制选项。

```python
# Python 3.10+
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional


class Article(BaseModel):
    id: int = Field(exclude=True)  # 序列化时排除
    title: str
    content: str
    author: str
    status: str = "draft"
    created_at: datetime = datetime.now()
    secret_note: Optional[str] = Field(default=None, exclude=True)

    # 计算字段（v2 新特性）
    @property
    def summary(self) -> str:
        return self.content[:50] + "..." if len(self.content) > 50 else self.content


article = Article(
    id=123,
    title="Pydantic v2 序列化指南",
    content="Pydantic v2 带来了全新的序列化 API，支持更多控制选项...",
    author="文档组",
    secret_note="内部评审意见"
)

# 基础序列化
print(article.model_dump())
# id 和 secret_note 被 exclude=True 排除

# 指定包含/排除字段
print(article.model_dump(include={"title", "author"}))
# {'title': 'Pydantic v2 序列化指南', 'author': '文档组'}

print(article.model_dump(exclude={"content", "created_at"}))

# 序列化模式
print(article.model_dump(mode="json"))
# datetime 转为 ISO 格式字符串

# 输出 JSON 字符串
json_str = article.model_dump_json(indent=2, exclude_none=True)
print(json_str)
```

**序列化控制选项**：

| 参数 | 说明 |
|------|------|
| `include` | 只包含指定字段 |
| `exclude` | 排除指定字段 |
| `exclude_unset` | 排除未设置的字段（只输出显式传入的值） |
| `exclude_defaults` | 排除等于默认值的字段 |
| `exclude_none` | 排除值为 `None` 的字段 |
| `by_alias` | 使用字段别名代替原始名称 |
| `round_trip` | 确保序列化后的数据可以反序列化回来 |
| `mode` | `"python"`（返回 Python 对象）或 `"json"`（返回 JSON 兼容类型） |

---

## 常见陷阱

### 陷阱速查表

| 陷阱 | 描述 | 解决方案 |
|------|------|---------|
| **v1 与 v2 API 混用** | v1 的 `dict()` / `json()` / `parse_raw()` 在 v2 中已弃用，混用导致运行时警告 | 统一使用 v2 API：`model_dump()` / `model_dump_json()` / `model_validate_json()` |
| **可变默认值** | `Field(default=[])` 会导致所有实例共享同一个列表对象 | 使用 `Field(default_factory=list)` |
| **`Optional` 与 `None` 默认值** | `Optional[str]` 但未设默认值，则该字段仍是必填的 | 需要可选时显式设置 `Field(default=None)` |
| **循环引用** | 两个模型互相引用，导致序列化时无限递归 | 使用 `model_config` 或字串前向引用 `"ClassName"` |
| **`from_attributes` 未启用** | 从 ORM 对象创建模型时报错 | 设置 `model_config = ConfigDict(from_attributes=True)` |
| **`field_validator` 的 `info.data` 顺序** | 校验器执行顺序取决于字段定义顺序，`info.data` 只包含已校验的字段 | 跨字段校验使用 `@model_validator` |
| **`strict=True` 导致类型转换失效** | 严格模式下 `"123"` 不会被自动转为 `123` | 明确业务需求：严格模式适合 API 边界，内部使用可关闭 |
| **性能：大列表校验** | 列表中有大量元素时，逐元素校验耗时 | 使用 `TypeAdapter` 批量校验，或考虑 `pydantic` 的 `validate_call` 装饰器 |
| **`Union` 校验顺序** | `Union[int, str]` 中 `"123"` 会被强制转为 `int` | 使用 `Union[str, int]` 调整顺序，或使用 `Annotated` + `Field(discriminator=...)` |
| **`model_dump` 的 `mode` 参数** | 默认 `mode="python"`，datetime 等不会被转为字符串 | 需要 JSON 输出时使用 `mode="json"` 或 `model_dump_json()` |

### 循环引用处理

```python
# Python 3.10+
from pydantic import BaseModel
from typing import Optional


class Department(BaseModel):
    name: str
    manager: Optional["Employee"] = None  # 前向引用


class Employee(BaseModel):
    name: str
    department: Department


# 创建实例
dept = Department(name="研发部")
emp = Employee(name="张三", department=dept)
dept.manager = emp  # 设置循环引用

# 序列化时会自动处理循环引用
print(dept.model_dump_json(indent=2))
```

### 性能优化建议

```python
# Python 3.10+
from pydantic import BaseModel, TypeAdapter
from typing import Annotated


# 1. 避免重复创建模型实例的校验开销
# 使用 TypeAdapter 进行批量校验
class Item(BaseModel):
    name: str
    price: float


items_adapter = TypeAdapter(list[Item])

# 批量校验 — 比逐个实例化快
raw_data = [{"name": f"item_{i}", "price": i * 10.0} for i in range(1000)]
items = items_adapter.validate_python(raw_data)

# 2. 生产环境关闭不必要的校验
# model_config = ConfigDict(revalidate_instances="never")

# 3. 使用 model_construct() 跳过校验（仅在信任数据源时使用）
trusted_data = {"name": "trusted", "price": 99.0}
item = Item.model_construct(**trusted_data)  # 不校验，极快
```

---

## 实战案例

### 案例一：API 请求校验

这是 Pydantic 最常见的场景——校验 HTTP 请求体。

```python
# Python 3.10+
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional, Self
from enum import Enum
from datetime import date


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class OrderItem(BaseModel):
    product_id: str = Field(min_length=1, max_length=50)
    quantity: int = Field(gt=0, le=9999)
    unit_price: float = Field(gt=0)


class CreateOrderRequest(BaseModel):
    """订单创建请求模型"""
    customer_name: str = Field(min_length=1, max_length=100)
    customer_email: str
    items: list[OrderItem] = Field(min_length=1, max_length=50)
    shipping_address: str = Field(min_length=1, max_length=500)
    coupon_code: Optional[str] = Field(default=None, max_length=20)
    notes: Optional[str] = Field(default=None, max_length=1000)

    @field_validator("customer_email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("邮箱格式无效")
        return v.strip().lower()

    @model_validator(mode="after")
    def check_order_total(self) -> Self:
        """校验订单总金额不超过上限"""
        total = sum(item.quantity * item.unit_price for item in self.items)
        if total > 100_000:
            raise ValueError(f"订单总金额 {total:.2f} 超过上限 100,000")
        return self


# 模拟 API 请求
request_data = {
    "customer_name": "张三",
    "customer_email": "zhangsan@example.com",
    "items": [
        {"product_id": "PROD-001", "quantity": 2, "unit_price": 49.99},
        {"product_id": "PROD-002", "quantity": 1, "unit_price": 199.00},
    ],
    "shipping_address": "北京市朝阳区科技路 88 号",
    "coupon_code": "SAVE10",
}

order = CreateOrderRequest(**request_data)
print(f"订单总额: {sum(i.quantity * i.unit_price for i in order.items):.2f}")
# 订单总额: 298.98
```

### 案例二：配置文件加载（pydantic-settings）

`pydantic-settings` 是 Pydantic 官方维护的配置管理库，支持从环境变量、`.env` 文件、命令行参数等多种来源加载配置。

```python
# Python 3.10+
# pip install pydantic-settings

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from typing import Optional


class AppSettings(BaseSettings):
    """应用配置模型"""

    model_config = SettingsConfigDict(
        # 指定 .env 文件路径
        env_file=".env",
        env_file_encoding="utf-8",
        # 环境变量前缀（可选）
        env_prefix="APP_",
        # 是否区分大小写
        case_sensitive=False,
    )

    # 应用基础配置
    app_name: str = "MyApp"
    app_version: str = "1.0.0"
    debug: bool = False

    # 数据库配置
    database_url: str = Field(
        default="sqlite:///./app.db",
        description="数据库连接字符串",
    )
    database_pool_size: int = Field(default=10, ge=1, le=100)

    # Redis 配置
    redis_host: str = "localhost"
    redis_port: int = Field(default=6379, ge=1, le=65535)
    redis_password: Optional[str] = None

    # 安全配置
    secret_key: str = Field(min_length=32)
    access_token_expire_minutes: int = Field(default=30, ge=1)
    allowed_origins: list[str] = Field(default_factory=lambda: ["*"])

    # API 配置
    api_prefix: str = "/api/v1"
    rate_limit_per_minute: int = Field(default=60, ge=1)

    @field_validator("database_url")
    @classmethod
    def check_database_url(cls, v: str) -> str:
        """校验数据库 URL 格式"""
        if not any(v.startswith(prefix) for prefix in
                   ("sqlite://", "postgresql://", "mysql://", "postgresql+asyncpg://")):
            raise ValueError(f"不支持的数据库 URL 格式: {v}")
        return v

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v: str | list[str]) -> list[str]:
        """支持从环境变量读取逗号分隔的字符串"""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v


# 加载配置
settings = AppSettings()  # 自动从环境变量和 .env 文件加载

# 使用配置
print(f"应用: {settings.app_name} v{settings.app_version}")
print(f"数据库: {settings.database_url}")
print(f"Redis: {settings.redis_host}:{settings.redis_port}")
print(f"调试模式: {settings.debug}")
```

对应的 `.env` 文件示例：

```ini
# .env
APP_DEBUG=true
APP_DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
APP_SECRET_KEY=this-is-a-very-secret-key-32-chars
APP_REDIS_HOST=redis-cluster.example.com
APP_REDIS_PORT=6380
```

## 最佳实践

| 实践 | 说明 |
|------|------|
| **优先使用类型注解表达约束** | `int` / `str` / `list[Item]` 等类型注解本身就能表达基本约束，减少不必要的 `Field()` 参数 |
| **区分字段级和模型级校验** | 单个字段的校验用 `@field_validator`，跨字段校验用 `@model_validator` |
| **使用 `model_config` 集中管理行为** | 将 `extra`、`frozen`、`validate_assignment` 等配置集中在 `model_config` 中，便于审计 |
| **为每个模型写 docstring** | 模型文档会自动进入 JSON Schema，方便下游消费 |
| **使用 `exclude` / `include` 控制序列化** | 敏感字段（密码、密钥）用 `Field(exclude=True)` 标记，序列化时自动排除 |
| **生产环境用 `model_construct()` 加速** | 从可信数据源（如数据库）加载时，`model_construct()` 跳过校验，性能提升显著 |
| **使用 `TypeAdapter` 批量校验** | 校验大量同构数据时，`TypeAdapter` 比逐个实例化快 3-5 倍 |
| **`Union` 类型注意顺序** | `Union[int, str]` 中 `"123"` 会被转为 `int`；需要保留字符串时用 `Union[str, int]` |
| **敏感字段使用 `SecretStr`** | `pydantic.SecretStr` 在日志和序列化时自动遮蔽，比普通 `str` 更安全 |
| **锁定版本** | Pydantic v1 到 v2 是破坏性升级，生产环境应锁定主版本号 |

---

## 术语表

| 术语 | 全称 | 含义 |
|------|------|------|
| **Pydantic** | — | 基于 Python 类型注解的运行时数据校验与序列化库 |
| **BaseModel** | — | Pydantic 的核心基类，所有模型类继承自它 |
| **pydantic-core** | — | Pydantic v2 的 Rust 底层校验引擎，提供高性能校验 |
| **Field()** | — | 用于声明字段级别的约束条件和元数据 |
| **field_validator** | — | 字段级校验器装饰器，对单个字段的值进行自定义校验 |
| **model_validator** | — | 模型级校验器装饰器，可访问所有字段的值进行跨字段校验 |
| **model_config** | — | Pydantic v2 的集中配置机制，替代 v1 的 `class Config` |
| **ConfigDict** | Configuration Dictionary | 配置字典类型，用于 `model_config` |
| **model_dump()** | — | v2 序列化方法，将模型转为字典 |
| **model_dump_json()** | — | v2 序列化方法，将模型转为 JSON 字符串 |
| **TypeAdapter** | — | 独立于模型之外的校验适配器，适合批量校验和泛型校验 |
| **Discriminated Union** | — | 可区分联合类型，根据指定字段值自动选择正确的模型 |
| **ValidationError** | — | 校验失败时抛出的异常，包含结构化的错误信息 |
| **pydantic-settings** | — | Pydantic 官方配置管理扩展，支持从环境变量、`.env` 文件等加载配置 |
| **SecretStr** | — | 敏感字符串类型，序列化和日志输出时自动遮蔽 |
| **from_attributes** | — | 配置项，允许从 ORM 对象（如 SQLAlchemy 模型）创建 Pydantic 实例 |
| **strict** | — | 严格模式，禁止自动类型转换 |
| **frozen** | — | 冻结模式，模型实例化后不可修改 |
| **extra** | — | 配置项，控制如何处理未在模型中定义的额外字段 |
| **coerce** | — | 类型强制转换，将兼容类型自动转为目标类型（如 `str` "123" 转 `int` 123） |

---

## 延伸阅读

| 资源 | 说明 |
|------|------|
| [Pydantic 官方文档](https://docs.pydantic.dev/latest/) | 最权威的 API 参考和概念指南，包含 v1 到 v2 迁移指南 |
| [pydantic-core GitHub](https://github.com/pydantic/pydantic-core) | Rust 校验引擎源码，了解底层实现 |
| [pydantic-settings 文档](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) | 官方配置管理扩展文档 |
| [FastAPI 文档](https://fastapi.tiangolo.com/) | Pydantic 最重要的生态伙伴，学习如何将 Pydantic 模型用于 API 开发 |
| [SQLModel](https://sqlmodel.tiangolo.com/) | Pydantic + SQLAlchemy 的融合方案，ORM 模型即 Pydantic 模型 |
| [Pydantic v1 → v2 迁移指南](https://docs.pydantic.dev/latest/migration/) | 官方迁移指南，覆盖所有 API 变更 |
| [Python 类型注解（PEP 484）](https://peps.python.org/pep-0484/) | Python 类型注解标准，Pydantic 的设计基础 |
| [attrs 官方文档](https://www.attrs.org/) | Pydantic 的替代方案之一，适合需要更灵活数据类的场景 |

## 版本差异（第三方库 → 当前稳定版）

| 库 | 本文编写时 | 当前稳定版 |
|----|-----------|-----------|
| `pydantic` | 1.x | 2.x（V2 核心重写，API 兼容层 `v1` 可选） |
| `pytest` | 7.x | 8.x（`pytest 8` 移除部分旧插件兼容） |
| `Pillow` | 9.x/10.x | 11.x |
| `psutil` | 5.x | 6.x/7.x |
| `chardet` | 4.x | 5.x（纯 Python；如需更高性能可选用 `charset-normalizer` 或维护中的 `faust-cchardet`） |

> 本文示例多为概念讲解，API 基本稳定；升级第三方库时以官方 changelog 为准。
