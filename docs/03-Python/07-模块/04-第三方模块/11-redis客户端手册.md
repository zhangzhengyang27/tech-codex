---
title: redis-py — Redis 客户端手册
description: redis-py 速查与最佳实践：连接池配置、五大常用数据结构操作、缓存模式（旁路缓存/过期/TTL 抖动），深度原理链接非关系型数据库与性能优化专篇。
version: 1.0
author: 文档维护组
created: 2026-11-13
updated: 2026-11-13
status: 正式
category: Python

---

# redis-py — Redis 客户端手册

## 概念说明

`redis-py` 是 Python 官方推荐的 Redis 客户端，提供**同步与异步双客户端**：同步用 `redis.Redis`，异步用 `redis.asyncio.Redis`，两者命令方法同名同义，心智模型一致。本篇定位是**速查 + 缓存最佳实践**：Redis 数据结构的设计思想、持久化、主从与集群拓扑见[非关系型数据库](/docs/python/09-进阶核心/03-数据库/02-非关系型数据库)；缓存在整体性能优化中的定位（多级缓存、失效策略）见[性能优化](/docs/python/03-工程化与运维/01-工程化/08-性能优化)的缓存策略章节。

```bash
pip install "redis[hiredis]"   # hiredis 解析器可降低 CPU 开销，生产推荐
```

::: tip 本篇与已有专篇的分工
- 本文：**客户端怎么用**——连接、命令调用、缓存代码模式、运维红线。
- [非关系型数据库](/docs/python/09-进阶核心/03-数据库/02-非关系型数据库)：Redis 数据结构选型、MongoDB、其他 NoSQL 的**方案设计**。
- [性能优化](/docs/python/03-工程化与运维/01-工程化/08-性能优化)：缓存命中率、`lru_cache` 本地缓存、多级缓存架构。
:::

## 核心要点

- 连接信息从环境变量读取（URL 或分项配置），密码绝不写进代码。
- **应用生命周期内复用全局客户端实例**：连接池内建于客户端，反复建实例等于放弃池化。
- 每个写操作都回答一个问题："这个 key 的 TTL 是多少？"没有 TTL 的 key 是内存泄漏。
- `decode_responses=True` 让返回值是 `str` 而非 `bytes`，业务代码默认开。
- 批量操作用 Pipeline（一次网络往返），高频计数用 `INCR`（原子性，不读改写）。
- 缓存模式默认选**旁路缓存（Cache-Aside）**，配合 TTL 抖动防雪崩。
- ⚠️ 常见误区：在请求路径里做 `KEYS *`。生产环境用 `SCAN` 增量遍历，`KEYS` 会阻塞整个实例。
- ⚠️ 常见误区：用 `GET` + `SET` 实现计数器。非原子操作在并发下丢计数，用 `INCR`。
- ⚠️ 常见误区：把 Redis 当强一致存储。缓存丢失是常态，回源能力必须兜底。

## 连接与连接池

```python
import os

import redis

# 方式一：URL（推荐，与部署环境变量直接对应）
# 格式：redis://[username:password@]host:port/db
r = redis.Redis.from_url(
    os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
    decode_responses=True,       # 返回 str 而非 bytes
    socket_timeout=5,            # 命令读写超时
    socket_connect_timeout=3,    # 建连超时
    health_check_interval=30,    # 空闲 30s 后探活，防半开连接
    max_connections=50,          # 连接池上限
)

# 方式二：显式连接池（多客户端共享一个池时使用）
pool = redis.ConnectionPool.from_url(
    os.environ["REDIS_URL"],
    max_connections=50,
    decode_responses=True,
)
r = redis.Redis(connection_pool=pool)
```

```python
# 异步客户端：API 与同步镜像，方法加 await
import redis.asyncio as aioredis

ar = aioredis.Redis.from_url(
    os.environ.get("REDIS_URL", "redis://localhost:6379/0"),
    decode_responses=True,
    socket_timeout=5,
)

async def cache_get(key: str) -> str | None:
    return await ar.get(key)
```

::: warning 客户端实例的创建成本
`redis.Redis()` 本身不建连接（惰性），但**每个实例各持一个连接池**。在请求处理器、任务函数里反复 `Redis.from_url(...)` 会让池形同虚设、连接数翻倍。正确姿势：模块级或应用工厂里创建一次，全局复用；Web 框架在启动钩子里初始化、关闭钩子里 `close()`。
:::

::: tip 健康检查与重连
`health_check_interval` 让客户端在空闲连接上发 `PING` 探活，配合 `socket_timeout` 能把"服务端断连后首次请求超时"的范围控制在毫秒级。redis-py 断连后会自动重连，业务层只需捕获 `redis.TimeoutError` / `redis.ConnectionError` 做降级（跳过缓存直接回源）。
:::

## 常用数据结构速查

### String：缓存、计数器、分布式锁的载体

```python
# 基本读写
r.set("greet:zh", "你好", ex=600)        # ex=秒 / px=毫秒 过期时间
r.get("greet:zh")                          # '你好'（decode_responses=True）
r.delete("greet:zh")
r.exists("greet:zh")                       # 1 / 0

# 原子计数器：限流、统计，绝不要 GET 后 SET
r.incr("stats:api:hits")                   # 不存在则从 0 开始
r.incrby("stats:api:hits", 10)
r.ttl("stats:api:hits")                    # 剩余过期秒数；-1 永不过期，-2 不存在

# 仅当不存在时写入：NX 是分布式锁与防重复提交的基石
r.set("lock:task:42", "owner-1", nx=True, ex=30)

# SETEX 组合：不存在才设置缓存（防覆盖刚写入的新值）
r.set("cache:user:1", '{"name":"alice"}', ex=300, nx=True)
```

### Hash：对象的字段级读写

```python
r.hset("user:1", mapping={"name": "alice", "level": "3"})
r.hget("user:1", "name")                   # 'alice'
r.hgetall("user:1")                        # {'name': 'alice', 'level': '3'}
r.hincrby("user:1", "level", 1)            # 字段级原子递增
r.hexpire("user:1", 3600)                  # 新版 Redis 支持字段级 TTL；旧版本只能整 key 过期
```

### List：队列与最新列表

```python
r.lpush("queue:emails", "job-1", "job-2")
r.rpop("queue:emails")                     # 非阻塞弹出
r.brpop("queue:emails", timeout=5)         # 阻塞弹出：消费者轮询的省电模式
r.lrange("news:latest", 0, 9)              # 最新 10 条
r.ltrim("news:latest", 0, 99)              # 只保留 100 条，防无限增长
```

### Set：去重与关系

```python
r.sadd("article:42:likes", "user:1", "user:2")
r.sismember("article:42:likes", "user:1")  # True
r.sinter("user:1:tags", "user:2:tags")     # 共同标签
r.scard("article:42:likes")                # 点赞数
```

### ZSet：排行榜与延迟队列

```python
import time

r.zadd("leaderboard", {"alice": 95, "bob": 87})
r.zrevrange("leaderboard", 0, 9, withscores=True)   # Top 10
r.zincrby("leaderboard", 5, "bob")                  # 加分
r.zrevrank("leaderboard", "alice")                  # 名次（0 起）

# 延迟任务：score 存执行时间戳，轮询到期任务
now = time.time()
r.zadd("delayed:jobs", {"job-9": now + 300})
due = r.zrangebyscore("delayed:jobs", 0, now, start=0, num=10)
```

::: tip Pipeline：一次网络往返
`pipeline()` 把多条命令打包发送，RTT 从 N 次降为 1 次。注意：`transaction=True`（默认）时 Pipeline 兼具 MULTI/EXEC 事务语义；只是要批量性能时用 `pipeline(transaction=False)` 更轻。异步客户端同样支持 `async with ar.pipeline() as pipe:`。
:::

```python
async with ar.pipeline(transaction=False) as pipe:
    pipe.get("cache:user:1")
    pipe.incr("stats:hits")
    results = await pipe.execute()
```

## 缓存模式

### 旁路缓存（Cache-Aside）——默认模式

应用自己管理缓存读写：先查缓存，未命中回源数据库并回填。这是最通用、最不易出错的模式：

```python
import json
import random

from redis.exceptions import RedisError

CACHE_TTL = 600  # 基础 TTL：10 分钟


def get_user_profile(user_id: int) -> dict:
    key = f"user:profile:{user_id}"
    try:
        cached = r.get(key)
        if cached is not None:
            return json.loads(cached)
    except RedisError:
        pass  # Redis 故障时降级：直接回源，缓存不是可用性的前置条件

    profile = db_fetch_profile(user_id)          # 回源（同步查库/调服务）
    try:
        # TTL 抖动：±10% 随机偏移，避免大批 key 同一时刻集中过期
        jitter = random.uniform(0.9, 1.1)
        r.set(key, json.dumps(profile, ensure_ascii=False), ex=int(CACHE_TTL * jitter))
    except RedisError:
        pass
    return profile
```

::: warning 缓存三大经典问题与对策
- **穿透**：查询不存在的数据，每次都打到数据库。对策：空值也缓存（短 TTL，如 60s），或入口层布隆过滤器。
- **击穿**：热点 key 过期瞬间，并发请求同时回源。对策：回填加互斥（`set nx` 抢占回填权），或热点 key 逻辑过期不物理删除。
- **雪崩**：大批 key 同时过期。对策：TTL 加随机抖动（如上例），并把缓存部署做成高可用。
:::

### 更新策略：先写库，再删缓存

```python
def update_user_profile(user_id: int, data: dict) -> None:
    db_update_profile(user_id, data)     # 1. 先落库
    try:
        r.delete(f"user:profile:{user_id}")   # 2. 再删缓存（不是写缓存）
    except RedisError:
        pass   # 删除失败可接受：下次读到旧值，TTL 到期自然纠正
```

先删缓存再写库的反向顺序在高并发下会把旧值重新写回缓存，是最常见的缓存不一致来源。**"先库后删 + TTL 兜底"是默认答案**，一致性要求极端严格的场景再考虑订阅 binlog 异步失效。

### 键设计与运维红线

```python
# 命名分层：业务:对象:ID，可读、可批量清理
#   cache:user:profile:1   cache:sku:price:1001   lock:order:create:42

# 遍历用 SCAN（增量、不阻塞），绝不用 KEYS
cursor = 0
while True:
    cursor, keys = r.scan(cursor, match="cache:user:*", count=200)
    if keys:
        r.delete(*keys)
    if cursor == 0:
        break

# 大 key 体检：内存分析从采样开始
r.memory_usage("cache:user:profile:1")
```

::: danger 生产环境四不要
1. **不要 `KEYS *`**——全量扫描阻塞主线程，单线程的 Redis 会卡住所有请求。
2. **不要无 TTL 的 key**——除非明确是持久配置，所有缓存 key 必须带过期时间。
3. **不要在 Redis 里放大对象**——单 key 控制在几十 KB 内，大 value 拆 Hash 或回源存储。
4. **不要把密码写进连接串提交**——URL 里的密码来自环境变量（见[配置管理](/docs/python/03-工程化与运维/01-工程化/07-配置管理)）。
:::

## 与 Celery 的关系

Redis 在任务队列场景常兼任 Celery 的 broker 与 result backend，连接配置同样走环境变量；Celery 侧的完整用法（任务定义、重试、周期调度）见 [Celery 任务队列手册](/docs/python/07-模块/04-第三方模块/12-Celery任务队列手册)。两者共用实例时注意 db 编号隔离（如缓存用 db0、broker 用 db1），避免 `flushdb` 误伤。

## 常见陷阱

| 陷阱 | 后果 | 正确做法 |
|---|---|---|
| 每次请求新建 Redis 实例 | 连接池失效，连接数暴涨 | 模块级全局实例 + 连接池 |
| 计数器用 GET 再 SET | 并发丢更新 | `INCR` / `HINCRBY` 原子命令 |
| 缓存 key 不设 TTL | 内存只增不减，最终 OOM | 一律 `ex=`，TTL 加抖动 |
| 生产用 `KEYS *` | 阻塞主线程，全站卡顿 | `SCAN` 增量遍历 |
| 先删缓存再更新库 | 并发下旧值回填，长期不一致 | 先写库再删缓存，TTL 兜底 |
| Redis 挂了业务跟着挂 | 缓存层故障放大到全局 | 捕获 `RedisError` 降级回源 |
| 返回值当 bytes 处理一层层 decode | 代码噪音 | `decode_responses=True` |
| 大 value（MB 级 JSON） | 网络与内存抖动，慢查询 | 拆字段存 Hash 或回源存储 |

## 最佳实践

1. **客户端工厂统一管理**：同步与异步客户端各建一次，注入依赖；超时、池大小、decode 策略集中配置。
2. **缓存访问统一封装**：`cache_get_json` / `cache_set_json` 收口序列化、TTL 抖动与异常降级，业务代码不直接碰 `r.set`。
3. **key 规范写进团队约定**：命名分层、必带 TTL、禁止 `KEYS`，评审时按此三条把关。
4. **监控命中与延迟**：命中率、`latency`、内存水位是缓存系统三大火警信号，接入[监控与可观测性](/docs/python/03-工程化与运维/02-运维/02-监控与可观测性)体系。
5. **Redis 不是数据库**：缓存数据必须能从源头重建；持久化配置（RDB/AOF）只是加速恢复，不是一致性保证。
6. **本地缓存做第一级**：进程内 `lru_cache` 存极热小对象，Redis 做第二级，数据库做源头——分层思路见[性能优化](/docs/python/03-工程化与运维/01-工程化/08-性能优化)。

## 延伸阅读

- [redis-py 官方文档](https://redis-py.readthedocs.io/) — 同步/异步客户端与全部命令映射
- [非关系型数据库](/docs/python/09-进阶核心/03-数据库/02-非关系型数据库) — 数据结构选型、MongoDB 与 NoSQL 方案设计
- [性能优化](/docs/python/03-工程化与运维/01-工程化/08-性能优化) — 缓存策略与多级缓存在性能体系中的定位
- [Celery 任务队列手册](/docs/python/07-模块/04-第三方模块/12-Celery任务队列手册) — Redis 作为 broker 的任务队列完整用法
- [配置管理](/docs/python/03-工程化与运维/01-工程化/07-配置管理) — 连接串与密码的环境变量注入规范
