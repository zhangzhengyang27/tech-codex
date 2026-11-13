---
title: Django REST Framework
description: 使用 DRF 构建 RESTful API：Serializer 序列化与校验、ViewSet 与 Router、认证权限体系、分页过滤限流，以及 DRF 与 FastAPI 的选型分工。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# Django REST Framework

前两篇 Django 文章（[MVT 实战](/docs/python/01-Web与爬虫/01-Web开发/01-Django快速入门与MVT实战)、[表单认证与生产部署](/docs/python/01-Web与爬虫/01-Web开发/02-Django表单认证与生产部署)）解决的是"服务端渲染页面"的问题。当前的趋势是，越来越多的 Django 项目以 **API 服务**的形态存在——前端是 Vue/React 单页应用，或移动端、第三方系统，它们需要的不是 HTML 页面，而是结构化的 JSON。

**Django REST Framework（下称 DRF）** 就是 Django 生态中构建 RESTful API 的事实标准。它复用 Django 的 ORM、认证系统与配置体系，在其上补充了序列化层、通用视图、认证鉴权、限流分页等 API 专用能力。

## 概念说明

| 能力 | 原生 Django | DRF 补充 |
|------|------------|----------|
| 数据转 JSON | 手写 `JsonResponse` + `values()` | `Serializer` 声明式序列化 |
| 请求体解析 | `request.POST`（仅表单） | 自动解析 JSON / 表单 / multipart |
| 输入校验 | Form / ModelForm | Serializer 字段级校验 |
| 权限控制 | 装饰器 + 手动检查 | 声明式 `permission_classes` |
| API 文档 | 无 | drf-spectacular 等扩展生成 OpenAPI |

::: tip 核心心智模型
DRF 的处理链路是固定的四步：**认证**（你是谁）→ **权限**（你能不能做）→ **限流**（你做得多不多）→ **序列化/视图逻辑**（具体怎么做）。几乎所有 DRF 配置都是往这四步里挂载组件。
:::

### 安装与最小配置

```bash
pip install djangorestframework django-filter drf-spectacular
```

```python
# settings.py
INSTALLED_APPS = [
    # ... Django 内置应用
    "learning_notes",          # 前两篇文章中的业务应用
    "rest_framework",          # 注册 DRF
]

REST_FRAMEWORK = {
    # 全局默认值，也可在视图级别覆盖
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
}
```

::: warning 安全默认值
全局 `DEFAULT_PERMISSION_CLASSES` 建议设为 `IsAuthenticated`，再在公开接口上显式放行为 `AllowAny`。DRF 默认是 `AllowAny`，沿用默认值容易把内部接口暴露出去。
:::

## Serializer：序列化、反序列化与校验

Serializer 是 DRF 的核心，承担双向职责：**序列化**（模型实例 → JSON）与**反序列化**（JSON → 校验后的数据 → 模型实例）。

### ModelSerializer

```python
# learning_notes/serializers.py
from rest_framework import serializers
from .models import Topic, Entry


class EntrySerializer(serializers.ModelSerializer):
    """条目序列化器：自动从模型生成字段"""

    class Meta:
        model = Entry
        fields = ["id", "topic", "text", "date_added"]
        read_only_fields = ["id", "date_added"]


class TopicSerializer(serializers.ModelSerializer):
    """主题序列化器：演示嵌套与自定义字段"""

    entry_count = serializers.IntegerField(read_only=True, default=0)
    # 只读统计字段：来自视图层的 annotate 注解，而非数据库字段
    entries = EntrySerializer(many=True, read_only=True)   # 嵌套展示条目

    class Meta:
        model = Topic
        fields = ["id", "text", "date_added", "entry_count", "entries"]
```

```python
data = TopicSerializer(Topic.objects.get(id=1)).data         # 单个对象 → dict
data = TopicSerializer(Topic.objects.all(), many=True).data  # QuerySet → list[dict]
```

### 反序列化与校验

反序列化走 `is_valid()` → `validated_data` 流程，校验分三层：字段类型校验 → 字段级 `validate_<field>` → 对象级 `validate`。

```python
class TopicCreateSerializer(serializers.ModelSerializer):
    """面向写操作的序列化器：与读操作分离"""

    class Meta:
        model = Topic
        fields = ["text"]

    def validate_text(self, value: str) -> str:
        """字段级校验：单个字段的规则"""
        if len(value.strip()) < 2:
            raise serializers.ValidationError("主题名称至少 2 个字符")
        if value.strip().lower() == "admin":
            raise serializers.ValidationError("不能使用保留名称")
        return value.strip()
```

```python
serializer = TopicCreateSerializer(data={"text": "机器学习"})
if serializer.is_valid():
    topic = serializer.save()          # 校验通过，写入数据库
else:
    print(serializer.errors)   # {'text': ['主题名称至少 2 个字符']} → 直接返回 400
```

::: tip 读写分离
列表页不需要嵌套的 `entries`（数据量大且慢），写操作也不需要只读字段。实践中常用 `TopicSerializer`（读）、`TopicCreateSerializer`（写）两套序列化器对应同一模型，而不是一个巨型 Serializer 包打天下。
:::

## ViewSet 与 Router

前两篇的 Django 视图是一个 URL 一个函数；DRF 的 `ViewSet` 把同一资源的 CRUD 收拢到一个类中，Router 再自动生成全部路由。

### ModelViewSet：一个类完成 CRUD

```python
# learning_notes/apiviews.py
from django.db.models import Count
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Topic
from .serializers import TopicSerializer, TopicCreateSerializer


class TopicViewSet(viewsets.ModelViewSet):
    """Topic 的完整 CRUD：list / retrieve / create / update / partial_update / destroy"""

    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """数据归属隔离：每人只看自己的主题（沿用 02 篇的三层防护思想）"""
        qs = Topic.objects.filter(owner=self.request.user)
        return qs.annotate(entry_count=Count("entries"))

    def get_serializer_class(self):
        """读写分离：写操作用精简序列化器"""
        if self.action in ("create", "update", "partial_update"):
            return TopicCreateSerializer
        return TopicSerializer

    def perform_create(self, serializer):
        """创建时强制写入归属人，不接受客户端传入"""
        serializer.save(owner=self.request.user)
```

### Router 自动生成路由

```python
# learning_notes/apiurls.py
from rest_framework.routers import DefaultRouter
from .apiviews import TopicViewSet

router = DefaultRouter()
router.register("topics", TopicViewSet, basename="topic")

urlpatterns = router.urls
# 自动生成：
#   GET    /topics/           → list
#   POST   /topics/           → create
#   GET    /topics/{pk}/      → retrieve
#   PUT/PATCH /topics/{pk}/   → update / partial_update
#   DELETE /topics/{pk}/      → destroy
# 项目主路由挂载：path("api/", include("learning_notes.apiurls"))
```

### @action：资源下的自定义动作

不属于标准 CRUD 的行为（如"归档""最新"）用 `@action` 挂在 ViewSet 上：

```python
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.response import Response


class TopicViewSet(viewsets.ModelViewSet):
    # ... 前述代码

    @action(detail=True, methods=["post"])
    def archive(self, request, pk=None):
        """POST /api/topics/{pk}/archive/ —— 归档单个主题"""
        topic = self.get_object()          # 自动执行权限与归属检查
        topic.archived_at = timezone.now()
        topic.save(update_fields=["archived_at"])
        return Response({"id": topic.id, "archived": True})

    @action(detail=False)
    def recent(self, request):
        """GET /api/topics/recent/ —— 集合级自定义端点"""
        recent = self.get_queryset()[:5]
        return Response(TopicSerializer(recent, many=True).data)
```

::: warning detail 参数
`detail=True` 生成的是**对象级**端点（URL 含 `{pk}`），`detail=False` 生成**集合级**端点。搞反了会出现 404 或参数缺失，是 ViewSet 最常见的低级错误之一。
:::

## 认证与权限

DRF 把"你是谁"（认证）与"你能不能做"（权限）拆成两个独立组件。Django 内置认证体系（Session、User 模型、密码哈希）的原理与配置在[第 02 篇](/docs/python/01-Web与爬虫/01-Web开发/02-Django表单认证与生产部署)已系统讲解，本节只讲 DRF 如何挂载它们。

### 认证类：Session 与 Token

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # Session 认证：浏览器端与 Django Admin 同源时直接复用登录态
        "rest_framework.authentication.SessionAuthentication",
        # Token 认证：移动端 / 第三方调用
        "rest_framework.authentication.TokenAuthentication",
    ],
}
```

```bash
# Token 认证需要迁移建表，并生成令牌
python manage.py migrate          # 创建 authtoken_token 表
python manage.py drf_create_token zhang

# 客户端携带令牌调用
curl -H "Authorization: Token <令牌>" http://127.0.0.1:8000/api/topics/
```

::: tip 认证方案怎么选
同域浏览器应用用 **Session**（零额外成本，复用 Django 登录态）；跨端调用用 **Token** 或 JWT（社区常用 `djangorestframework-simplejwt`）。大型项目的完整认证/权限体系设计与数据归属防护见[第 02 篇](/docs/python/01-Web与爬虫/01-Web开发/02-Django表单认证与生产部署)，此处不重复展开。
:::

### 内置权限类

```python
from rest_framework.permissions import AllowAny

class PublicTopicViewSet(viewsets.ReadOnlyModelViewSet):
    """公开只读接口：匿名可访问（显式覆盖全局默认）"""
    permission_classes = [AllowAny]
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer

# 管理端接口直接用内置的 IsAdminUser：permission_classes = [IsAdminUser]
```

### 自定义对象级权限

内置权限只能控制"接口级"访问；"这条数据是不是你的"需要对象级权限：

```python
# learning_notes/permissions.py
from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    """写操作仅限对象归属人"""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True                      # GET/HEAD/OPTIONS 放行
        return obj.owner == request.user     # 写操作核对归属
```

```python
class TopicViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOwnerOrReadOnly]
    # 执行顺序：先 IsAuthenticated（未登录 401），再对象级归属检查（不是你的 403）
```

::: warning 权限类的两道关卡
`has_permission` 管**接口级**（进得来吗），`has_object_permission` 管**对象级**（这条数据能碰吗）。后者只在 `get_object()` 取到具体对象后才触发——列表接口里的越权数据要靠 `get_queryset()` 过滤兜底，两件事缺一不可。
:::

## 分页、过滤与限流

### 分页

```python
# learning_notes/paginations.py
from rest_framework.pagination import PageNumberPagination


class TopicPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"     # 允许客户端调整每页数量
    max_page_size = 100                     # 上限防滥用

# settings.py 中全局挂载：
# "DEFAULT_PAGINATION_CLASS": "learning_notes.paginations.TopicPagination"
```

分页后的响应带统一结构：`{"count": 42, "next": "...?page=2", "previous": null, "results": [...]}`，前端翻页可直接消费。

### 过滤与搜索

```python
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter


class TopicViewSet(viewsets.ModelViewSet):
    # ... 延续前述 ViewSet，此处仅展示过滤相关配置
    queryset = Topic.objects.all()
    serializer_class = TopicSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]

    filterset_fields = ["owner"]              # 精确过滤：?owner=1
    search_fields = ["text"]                  # 模糊搜索：?search=python
    ordering_fields = ["date_added", "text"]  # 排序：?ordering=-date_added
```

### 限流

```python
REST_FRAMEWORK = {
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",   # 匿名按 IP
        "rest_framework.throttling.UserRateThrottle",   # 登录用户按用户
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "30/min",
        "user": "120/min",
        # 自定义限流域：视图里用 throttle_scope="login" 引用
        "login": "5/min",
    },
}
```

自定义限流域在视图上用 `throttle_classes = [ScopedRateThrottle]` + `throttle_scope = "login"` 引用即可生效。

::: warning 限流不是安全边界
限流防的是刷接口与误用，防不了撞库与暴力破解——那需要配合锁定策略、验证码与登录失败监控。被限流时 DRF 返回 `429 Too Many Requests`，客户端应做退避重试。
:::

## DRF 与 FastAPI 的分工

DRF 与 FastAPI 都能写 REST API，选型差异不在"能不能"，而在**生态位置与团队形态**：

| 维度 | Django + DRF | FastAPI |
|------|-------------|---------|
| 定位 | 全栈框架的 API 层，与 ORM/Admin/认证一体 | 独立 API 框架，异步优先 |
| ORM | Django ORM（自带迁移） | 需配 SQLAlchemy/Tortoise |
| Admin 后台 | ✅ 直接复用 | ❌ 需另建 |
| API 文档 | 需 drf-spectacular 扩展 | ✅ 内置 Swagger/ReDoc |
| 异步 | 有限支持（Django 5.x 的 ASGI/异步 ORM） | 原生 async/await |
| 校验 | Serializer | Pydantic（类型驱动） |
| 团队背景 | 已有 Django 项目/同步思维团队 | 新项目、IO 密集、异步经验 |

### 何时选 Django + DRF

1. **已有 Django 项目**：模型、认证、Admin 都是现成的，加一层 DRF 就能把现有系统 API 化，迁移成本最低。
2. **需要 Admin 后台**：运营后台、内容管理场景里，Django Admin 免费提供的 CRUD 界面是 FastAPI 生态没有的即战力。
3. **复杂业务模型 + 成熟 ORM**：多表关联、迁移管理这类"重 ORM"需求，Django ORM + DRF Serializer 的组合最顺手；团队熟悉 Django 而无异步经验时，DRF 的心智负担也显著更低。

### 何时选 FastAPI

对性能敏感的 IO 密集型服务、以异步为主的技术栈、需要原生类型校验与自动文档的独立微服务，FastAPI 更合适，参见 [FastAPI 入门与路由依赖](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/01-FastAPI入门与路由依赖)。

::: tip 一句话决策
**先有 Django 系统，或需要 Admin/重 ORM/成熟生态 → DRF；从零开始的高并发 API 服务、团队拥抱异步 → FastAPI。** 两者在同一组织内共存很常见：主站 Django+DRF，新拆出的高性能服务用 FastAPI。
:::

## 常见陷阱

| 陷阱 | 后果 | 正确做法 |
|------|------|---------|
| 沿用默认 `AllowAny` | 内部接口匿名可访问 | 全局默认 `IsAuthenticated`，公开接口显式放行 |
| 只写对象权限不过滤 QuerySet | 列表接口泄露他人数据 | `get_queryset()` 按归属过滤 + 对象级权限双保险 |
| 读写共用一个 Serializer | 响应臃肿、只读字段可被写入 | 读写分离，`read_only_fields` 兜底 |
| `@action` 的 `detail` 写反 | 路由 404 或 `pk` 缺失 | 对象级动作 `detail=True`，集合级 `detail=False` |
| 没配分页就返回全量数据 | 大表一次拖垮内存与带宽 | 全局默认分页 + `max_page_size` 上限 |

## 延伸阅读

- [Django 快速入门与 MVT 实战](/docs/python/01-Web与爬虫/01-Web开发/01-Django快速入门与MVT实战) —— 本文的模型与路由基础来自该篇
- [Django 表单认证与生产部署](/docs/python/01-Web与爬虫/01-Web开发/02-Django表单认证与生产部署) —— 认证体系与数据归属防护的系统讲解
- [FastAPI 入门与路由依赖](/docs/python/01-Web与爬虫/01-Web开发/04-FastAPI/01-FastAPI入门与路由依赖) —— DRF 与 FastAPI 分工的另一端
- DRF 官方文档：https://www.django-rest-framework.org/
- Django 官方文档：https://docs.djangoproject.com/

> 🧭 本系列其余篇目与 Python 学习路线统一维护在 [导航总览](/docs/python/02-基础与入门/00-导航总览)。
