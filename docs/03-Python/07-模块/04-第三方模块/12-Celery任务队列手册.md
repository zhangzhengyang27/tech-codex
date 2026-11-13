---
title: Celery — 分布式任务队列手册
description: Celery 速查与最佳实践：broker 与 result backend 选型、任务定义与路由、重试/超时/幂等三件套、beat 周期任务，异步任务队列全景链接专篇。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# Celery — 分布式任务队列手册

## 概念说明

Celery 是 Python 生态最成熟的**分布式任务队列**：Web 请求里不该做的事（发邮件、转码、报表生成、大批量写库）丢进队列，由独立的 worker 进程异步消费。它解决三个问题——**削峰**（慢操作不阻塞请求）、**解耦**（生产者与消费者独立部署伸缩）、**重试**（失败任务自动恢复）。

三个核心角色：

| 角色 | 职责 | 常见实现 |
|---|---|---|
| **broker** | 消息队列，投递任务消息 | Redis、RabbitMQ |
| **worker** | 消费进程，执行任务 | Celery 进程池 |
| **result backend** | 存储任务结果与状态 | Redis（推荐）、数据库 |

```bash
pip install "celery[redis]"   # Celery + Redis 依赖一并安装
```

::: tip 本篇与已有专篇的分工
本文是 **Celery 客户端速查与运维实践**。异步编程基础（协程、事件循环）、asyncpg/aiomysql 直连异步库、与 APScheduler 等替代方案的对比，见[异步数据库与任务队列](/docs/python/09-进阶核心/02-异步编程/04-异步数据库与任务队列)。Redis 连接细节见 [redis-py 客户端手册](/docs/python/07-模块/04-第三方模块/11-redis客户端手册)。
:::

## 核心要点

- broker 与 backend 地址一律来自环境变量（`CELERY_BROKER_URL` / `CELERY_RESULT_BACKEND`），密码不进代码。
- 任务函数定义在**独立模块**中，应用与 worker 共享同一个 Celery 实例——写在入口文件里会导致 worker 找不到任务。
- **重试、超时、幂等是任务三件套**：没有这三项配置的任务，上生产等于裸奔。
- 任务路由把不同性质的任务（IO 密集 / CPU 密集、高优 / 低优）分流到不同队列与 worker，避免慢任务堵塞快任务。
- 周期任务由 **beat** 调度：beat 只投递消息，执行仍靠 worker，两者都要启动。
- `delay()` 是 `apply_async()` 的快捷方式；需要指定队列、倒计时、重试策略时用 `apply_async()`。
- ⚠️ 常见误区：把任务参数设计成大对象。消息里只传 ID 和标量，数据在任务内部回查。
- ⚠️ 常见误区：worker 与 Web 共用进程。worker 是独立进程（`celery worker`），与 Web 服务器分开部署。
- ⚠️ 常见误区：依赖 result backend 传递业务数据。结果是"查询用的回执"，不是存储。

## 应用与任务定义

### Celery 实例与配置

```python
# celery_app.py —— worker 与 Web 共同导入的入口
import os

from celery import Celery

broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/1")
backend_url = os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379/2")

app = Celery(
    "myapp",
    broker=broker_url,
    backend=backend_url,
    include=["myapp.tasks"],        # 显式列出任务模块，worker 启动时导入
)

app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Shanghai",
    enable_utc=False,
    # 结果与可靠性
    task_acks_late=True,             # 任务执行完再确认，worker 崩溃时消息可重投
    task_reject_on_worker_lost=True, # worker 被杀时消息重回队列
    worker_prefetch_multiplier=1,    # 每次只预取 1 条，配合 acks_late 保证公平分发
    result_expires=3600,             # 结果保留 1 小时，防止 backend 膨胀
    task_track_started=True,         # 记录 STARTED 状态，便于前端展示进度
)
```

::: warning broker 与 backend 的 db 编号隔离
Redis 兼任 broker 和 backend 时用不同 db 编号（如 1 和 2），并与缓存业务的 db（通常 0）隔离。共享实例上一次 `flushdb` 会同时清掉队列、结果与缓存，这是真实发生过的运维事故。密码同样写进环境变量里的 URL（见[配置管理](/docs/python/03-工程化与运维/01-工程化/07-配置管理)）。
:::

### 任务定义

```python
# myapp/tasks.py
import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30)  # bind=True 拿到 self 管理重试
def send_email(self, user_id: int, template: str) -> str:
    """给用户发邮件。参数只传 ID 与模板名，不传大对象。"""
    try:
        user = db_get_user(user_id)              # 任务内部回查数据
        provider_send(user.email, template)
        return f"sent:{user.email}"
    except ProviderTimeout as exc:
        raise self.retry(exc=exc, countdown=30 * (2 ** self.request.retries))  # 指数退避


@shared_task
def generate_report(report_id: str) -> str:
    """CPU/IO 密集的报表任务，路由到专用队列（见路由一节）。"""
    ...
    return report_id
```

调用侧：

```python
from myapp.tasks import send_email, generate_report

result = send_email.delay(user_id=42, template="welcome")     # 快捷投递
result = send_email.apply_async(                              # 全参数投递
    kwargs={"user_id": 42, "template": "welcome"},
    queue="emails",
    countdown=60,            # 60 秒后执行
    expires=300,             # 5 分钟未消费则丢弃，防陈旧任务
)

result.id                    # 任务 ID，写库或返回前端
result.ready()               # 是否执行完
result.get(timeout=10)       # 阻塞取结果（Web 请求里慎用，见 warning）
result.state                 # PENDING / STARTED / SUCCESS / FAILURE / RETRY
```

::: warning 不要在 Web 请求里 result.get()
`get()` 会阻塞 HTTP worker 等待任务完成，异步架构的意义就没了。正确模式：投递后立即返回 `task_id`，前端轮询 `/tasks/{id}` 状态接口，任务完成后由任务自身把结果写回业务表或触发通知。
:::

启动 worker：

```bash
celery -A myapp.celery_app worker --loglevel=INFO --concurrency=8
celery -A myapp.celery_app worker -Q emails --concurrency=4     # 只消费指定队列
```

## 路由：任务分流到不同 worker

不同任务对资源的需求差异巨大——发邮件是 IO 密集，报表生成可能吃满 CPU。路由让它们互不干扰：

```python
# celery_app.py 中追加
from kombu import Queue

app.conf.task_queues = (
    Queue("default"),
    Queue("emails"),
    Queue("reports"),
)

app.conf.task_routes = {
    "myapp.tasks.send_email": {"queue": "emails"},
    "myapp.tasks.generate_report": {"queue": "reports"},
    "myapp.tasks.*": {"queue": "default"},        # 兜底规则
}
```

```bash
# 三类 worker 各自伸缩：邮件 worker 可以多副本，报表 worker 单副本大内存
celery -A myapp.celery_app worker -Q default --concurrency=8
celery -A myapp.celery_app worker -Q emails  --concurrency=4
celery -A myapp.celery_app worker -Q reports --concurrency=2 --pool=solo   # CPU 密集用单并发
```

CPU 密集任务注意：Celery 默认 prefork 进程池适合 CPU 并行；在事件循环（asyncio 服务）内投递任务本身是同步的、无碍——真正执行在 worker 进程，这正是任务队列对异步服务的价值。

## 重试、超时与幂等

### 重试策略

```python
from celery import shared_task


@shared_task(
    bind=True,
    max_retries=5,
    # 指数退避：10s, 20s, 40s, 80s, 160s；jitter 打散重试时刻防惊群
    retry_backoff=10,
    retry_backoff_max=600,
    retry_jitter=True,
    autoretry_for=(ConnectionError, TimeoutError),   # 指定异常自动重试
    retry_kwargs={"max_retries": 5},
)
def sync_external_data(self, source: str) -> int:
    data = external_api_fetch(source)
    return db_upsert(data)
```

::: warning 重试只给"可能成功"的任务
参数错误（4xx 类）重试多少次都会失败，应直接抛异常进入 FAILURE 并告警；重试只面向瞬态故障（网络抖动、下游过载、锁冲突）。`autoretry_for` 明确列出可重试异常，比无差别 try/except 重试安全得多。
:::

### 超时

```python
@shared_task(
    soft_time_limit=60,    # 软超时：抛 SoftTimeLimitExceeded，任务可清理后退出
    time_limit=90,         # 硬超时：worker 直接终止子进程，兜底必须设
)
def transcode_video(task_id: str) -> str:
    ...
```

软超时让任务有机会保存现场、释放资源；硬超时是防僵尸任务的最后防线。**两者都必须显式设置**——没有超时的任务一旦卡死，会永久占用一个 worker 并发槽位。

### 幂等：重试可靠性的前提

`acks_late=True` 意味着任务可能被执行多次（worker 在确认前崩溃、消息重投）。任务必须设计为幂等：

```python
@shared_task(bind=True, soft_time_limit=120, time_limit=150)
def import_order(self, order_id: str) -> str:
    # 幂等关键：以业务 ID 为唯一键，重复执行等价于一次执行
    if db_order_imported(order_id):
        return f"skip:{order_id}"              # 已处理过：直接返回，不产生副作用

    with db_transaction() as tx:               # 数据库唯一约束兜底并发重复
        mark_importing(order_id, task_id=self.request.id)   # 抢占式标记
        rows = parse_and_insert(order_id)
        mark_imported(order_id)
    return f"imported:{rows}"
```

::: tip 幂等三板斧
1. **状态前置检查**：执行前判断"这件事做过没有"，做过就跳过。
2. **数据库唯一约束**：以业务 ID 建唯一索引，重复插入直接被约束拒绝。
3. **原子标记**：用 `INSERT ... ON CONFLICT` 或 Redis `SET NX` 抢占任务标记，天然防并发重入。
:::

## 周期任务：beat

`celery beat` 是独立调度进程，按时间表把周期任务**当作普通消息**投给 worker。定时逻辑只配在 beat 侧一处，worker 不感知：

```python
# celery_app.py 中追加
from celery.schedules import crontab

app.conf.beat_schedule = {
    "cleanup-expired-tokens": {
        "task": "myapp.tasks.cleanup_expired_tokens",
        "schedule": crontab(minute=0, hour=3),            # 每天 03:00
    },
    "sync-external-data": {
        "task": "myapp.tasks.sync_external_data",
        "schedule": crontab(minute="*/15"),               # 每 15 分钟
        "args": ("partner-api",),
        "options": {"queue": "default", "expires": 600},  # 上一次未跑完则丢弃本次，防堆积
    },
    "nightly-report": {
        "task": "myapp.tasks.generate_report",
        "schedule": crontab(minute=30, hour=1, day_of_week="1-5"),  # 工作日 01:30
        "options": {"queue": "reports"},
    },
}
```

```bash
celery -A myapp.celery_app beat --loglevel=INFO          # 调度进程：只投递，不执行
celery -A myapp.celery_app worker --loglevel=INFO        # 执行进程：与单机部署时相同
```

::: warning 单实例 beat 与任务重叠
beat 默认基于本地内存调度，**只能运行一个实例**（多副本会导致重复投递），生产环境把"beat 进程唯一性"纳入部署约束（如单副本 Deployment 或选主锁）。周期任务可能上次还没跑完就到下次触发点：用 `expires` 让过期消息作废，或任务内做幂等检查——否则任务会堆积成雪崩。
:::

## 监控与故障排查

| 场景 | 排查入口 |
|---|---|
| 任务积压 | 队列长度（broker LLEN）持续增长 → 扩 worker 或查慢任务 |
| 任务"消失" | 确认 worker 导入了任务模块（`include`/`imports`），任务名路由是否命中 |
| 结果总是 PENDING | `task_track_started`、backend 配置、worker 是否实际消费 |
| 内存缓慢上涨 | 大结果未过期（`result_expires`）或任务内存泄漏，`worker_max_tasks_per_child` 兜底重启 |
| 重复执行 | 检查 `acks_late` + 幂等设计；确认 beat 是否多副本 |
| 全链路可视化 | `pip install flower` 后 `celery -A myapp.celery_app flower`，看实时队列与任务事件 |

任务异常要**结构化落日志**（task_id、参数、异常栈），接入[日志系统](/docs/python/03-工程化与运维/02-运维/01-日志系统)；关键指标（队列深度、成功率、耗时）接入[监控与可观测性](/docs/python/03-工程化与运维/02-运维/02-监控与可观测性)。

## 常见陷阱

| 陷阱 | 后果 | 正确做法 |
|---|---|---|
| broker/密码硬编码 | 泄漏进 Git 与日志 | `CELERY_BROKER_URL` 等环境变量注入 |
| 任务定义在入口/`__main__` 里 | worker 找不到任务，永远 PENDING | 任务放独立模块，`include` 显式声明 |
| 任务参数传 ORM 对象/大字典 | 消息膨胀、反序列化失败 | 只传 ID 与标量，任务内回查 |
| 无超时任务 | 僵尸任务占死并发槽位 | `soft_time_limit` + `time_limit` 必设 |
| 无差别重试所有异常 | 参数错误也重试 5 次，噪音告警 | `autoretry_for` 限定瞬态异常 |
| 非幂等任务 + `acks_late` | 崩溃重投导致重复副作用 | 幂等三板斧（状态检查/唯一约束/原子标记） |
| beat 多副本部署 | 每个副本都投递，任务翻倍执行 | beat 单实例约束 |
| Web 请求里 `result.get()` | HTTP worker 被阻塞 | 返回 task_id，异步轮询结果 |
| 周期任务不带 `expires` | 上次未完成，本次继续堆积 | `options={"expires": ...}` + 幂等 |

## 最佳实践

1. **任务即函数，函数要薄**：任务体只做"回查数据 → 调业务函数 → 返回标量"，业务逻辑在普通模块中可独立单测。
2. **三件套默认写上**：团队约定所有 `@shared_task` 必须带重试策略（或明确不重试）、超时、幂等说明，评审按此把关。
3. **队列按资源画像划分**：IO 密集、CPU 密集、高低优先级分开队列与 worker，各自伸缩互不拖累。
4. **结果存业务表而非 backend**：backend 只承载"状态查询"，报表数据、处理结果落数据库，backend 定期过期。
5. **先幂等再可靠**：`acks_late` + 幂等是可靠交付的组合；只开 acks_late 不做幂等等于引入重复执行的 bug。
6. **可见性优先**：队列深度、任务耗时、失败率是任务系统的生命体征，上线第一天就接入监控告警。

## 延伸阅读

- [Celery 官方文档](https://docs.celeryq.dev/) — 配置项与部署模式的权威参考
- [异步数据库与任务队列](/docs/python/09-进阶核心/02-异步编程/04-异步数据库与任务队列) — asyncio 全景与任务队列方案对比
- [redis-py 客户端手册](/docs/python/07-模块/04-第三方模块/11-redis客户端手册) — Redis 作为 broker/backend 的连接管理
- [日志系统](/docs/python/03-工程化与运维/02-运维/01-日志系统) — 任务日志的结构化与聚合
- [监控与可观测性](/docs/python/03-工程化与运维/02-运维/02-监控与可观测性) — 队列深度与任务指标接入告警
