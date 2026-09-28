---
title: Redis
description: Redis 入门：核心特点与性能、Python 连接与连接池、五大常用数据类型（String/Hash/List/Set/ZSet）、事务（MULTI/EXEC/WATCH 乐观锁抢票）、ZSet 排行榜与 Lua 脚本、RDB/AOF 持久化对比及缓存/分布式锁/消息队列/限流应用
keywords: [Redis, NoSQL, 键值存储, 内存数据库]
category: Redis
tags: [数据库, NoSQL, Redis]
---

# Redis

## Redis简介

Redis（REmote DIctionary Server）是一个开源的内存数据结构存储系统，采用键值对（Key-Value）方式存储数据。

### Redis的核心特点

| 特点 | 说明 |
|-----|------|
| **基于内存** | 数据存储在内存中，避免磁盘I/O，读写速度极快 |
| **数据结构简单** | 采用Key-Value方式，操作复杂度O(1) |
| **单线程模型** | 命令执行单线程，避免上下文切换和线程竞争（Redis 6.0 起网络 I/O 可多线程） |
| **多路I/O复用** | 同一线程处理多个网络连接 |

### Redis性能数据

根据官方数据，Redis每秒最多可处理**10万次请求**，这得益于：

```
高性能原因：
├── 内存存储：避免磁盘I/O延迟
├── 单线程：无锁竞争，无上下文切换
├── I/O多路复用：高效处理并发连接
└── 简单数据结构：O(1)操作复杂度
```

## Python连接Redis

### 安装与导入

```bash
pip install redis
```

```python
import redis
```

### 连接方式

**方式一：直接连接**

```python
import redis

r = redis.Redis(host='localhost', port=6379, db=0)
```

**方式二：连接池（推荐）**

```python
import redis

pool = redis.ConnectionPool(host='localhost', port=6379, db=0)
r = redis.Redis(connection_pool=pool)
```

### 连接池原理

```
连接池机制：
┌─────────────────────────────────────────────────────┐
│                  ConnectionPool                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  _available_connections     _in_use_connections     │
│  ┌─────┐ ┌─────┐           ┌─────┐ ┌─────┐        │
│  │conn1│ │conn2│ ...       │conn3│ │conn4│ ...    │
│  └─────┘ └─────┘           └─────┘ └─────┘        │
│     可用连接                  使用中连接              │
│                                                     │
│  获取连接：从available移到in_use                     │
│  释放连接：从in_use移回available                     │
└─────────────────────────────────────────────────────┘
```

**连接池优势**：
- 避免频繁创建和销毁连接
- 复用已有连接，减少资源消耗
- 提高高并发场景下的性能

### 性能测试

```python
import redis
import time

pool = redis.ConnectionPool(host='localhost', port=6379)
r = redis.StrictRedis(connection_pool=pool)

# 测试1万次写操作
start_time = time.time()
for i in range(10000):
    data = {'username': 'zhangfei', 'age': 28}
    r.hset("users" + str(i), mapping=data)  # HMSET 已废弃，改用 HSET ... mapping=
write_time = time.time() - start_time
print(f"1万次写操作耗时: {write_time:.2f}秒")

# 测试1万次读操作
start_time = time.time()
for i in range(10000):
    result = r.hmget("users" + str(i), ['username', 'age'])
read_time = time.time() - start_time
print(f"1万次读操作耗时: {read_time:.2f}秒")
```

**典型结果**：
```
1万次写操作耗时: 2.00秒
1万次读操作耗时: 0.99秒
```

## Redis数据类型

### 常用数据类型

| 数据类型 | 说明 | 适用场景 |
|---------|------|---------|
| **String** | 字符串，最基本类型 | 缓存、计数器、分布式锁 |
| **Hash** | 哈希表，字段-值对 | 对象存储、用户信息 |
| **List** | 列表，有序可重复 | 消息队列、最新列表 |
| **Set** | 集合，无序不重复 | 标签、共同好友 |
| **ZSet** | 有序集合，带分数 | 排行榜、延时队列 |

### 基本操作示例

```python
# String操作
r.set('name', 'redis')
r.get('name')           # 'redis'
r.incr('counter')       # 自增
r.expire('name', 60)    # 设置过期时间

# Hash操作
r.hset('user:1', 'name', '张三')
r.hset('user:1', 'age', 25)
r.hgetall('user:1')     # {'name': '张三', 'age': '25'}

# List操作
r.lpush('list', 'a', 'b', 'c')
r.rpop('list')          # 'a'
r.lrange('list', 0, -1) # ['c', 'b']

# Set操作
r.sadd('tags', 'redis', 'mysql', 'python')
r.smembers('tags')      # {'redis', 'mysql', 'python'}

# ZSet操作
r.zadd('rank', {'user1': 100, 'user2': 200})
r.zrange('rank', 0, -1, withscores=True)
```

## Redis事务处理

### Redis事务特点

Redis事务与RDBMS事务有所不同：

| 特性 | Redis | RDBMS |
|-----|-------|-------|
| **原子性** | 部分支持（无回滚） | 完全支持 |
| **一致性** | 支持 | 支持 |
| **隔离性** | 单线程，天然隔离 | 需要隔离级别设置 |
| **持久性** | 可选（RDB/AOF） | 完全支持 |

**Redis不支持事务回滚的原因**：
- 只有语法错误才会导致事务失败
- 语法错误通常出现在开发环境
- 不需要为此增加回滚机制的复杂度

### 事务命令

| 命令 | 说明 |
|-----|------|
| `MULTI` | 开启事务 |
| `EXEC` | 执行事务中的所有命令 |
| `DISCARD` | 取消事务 |
| `WATCH` | 监视一个或多个键 |
| `UNWATCH` | 取消监视 |

### 事务执行流程

```
事务执行流程：
┌─────────────────────────────────────────────────────┐
│                                                     │
│  MULTI ──> 命令入队 ──> EXEC ──> 执行所有命令        │
│                                                     │
│  命令1 ──> QUEUED                                   │
│  命令2 ──> QUEUED                                   │
│  命令3 ──> QUEUED                                   │
│  EXEC  ──> 执行命令1、2、3                          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 事务示例

```bash
# Redis CLI中使用事务
MULTI
HMSET user:001 hero 'zhangfei' hp_max 8341 mp_max 100
HMSET user:002 hero 'guanyu' hp_max 7107 mp_max 10
HMSET user:003 hero 'liubei' hp_max 6900 mp_max 1742
EXEC
```

## Redis实现抢票功能

### WATCH+MULTI实现乐观锁

Redis通过WATCH+MULTI实现乐观锁机制：

```
乐观锁流程：
┌─────────────────────────────────────────────────────┐
│                                                     │
│  1. WATCH ticket_count  (监视票数)                  │
│           │                                         │
│           ▼                                         │
│  2. GET ticket_count    (获取当前票数)              │
│           │                                         │
│           ▼                                         │
│  3. 票数 > 0?                                       │
│      ├── 是 ──> MULTI ──> DECR ──> EXEC            │
│      └── 否 ──> 抢票失败                            │
│           │                                         │
│           ▼                                         │
│  4. EXEC成功?                                       │
│      ├── 是 ──> 抢票成功                            │
│      └── 否 ──> 票数被修改，重试                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Python实现多用户抢票

```python
import redis
import threading

pool = redis.ConnectionPool(host='127.0.0.1', port=6379, db=0)
r = redis.StrictRedis(connection_pool=pool)

KEY = "ticket_count"

def sell(user_id):
    """模拟用户抢票"""
    pipe = r.pipeline()
    while True:
        try:
            # 监视票数
            pipe.watch(KEY)
            # 获取当前票数
            count = int(pipe.get(KEY))
            
            if count > 0:
                # 开启事务
                pipe.multi()
                pipe.decr(KEY)
                pipe.execute()
                print(f'用户 {user_id} 抢票成功，剩余票数 {count-1}')
                break
            else:
                print(f'用户 {user_id} 抢票失败，票已售完')
                break
        except redis.WatchError:
            # 票数被其他用户修改，重试
            print(f'用户 {user_id} 抢票失败，重试中...')
            continue
        finally:
            pipe.unwatch()

if __name__ == "__main__":
    # 初始化5张票
    r.set(KEY, 5)
    
    # 8个用户同时抢票
    threads = []
    for i in range(8):
        t = threading.Thread(target=sell, args=(i,))
        threads.append(t)
        t.start()
    
    for t in threads:
        t.join()
```

**运行结果示例**：
```
用户 0 抢票成功，剩余票数 4
用户 1 抢票成功，剩余票数 3
用户 2 抢票失败，重试中...
用户 3 抢票成功，剩余票数 2
用户 4 抢票成功，剩余票数 1
用户 5 抢票成功，剩余票数 0
用户 6 抢票失败，票已售完
用户 7 抢票失败，票已售完
用户 2 抢票失败，票已售完
```

## Redis实现排行榜

### 排行榜需求分析

假设需要为10万名玩家建立排行榜：

| 排行榜类型 | 说明 |
|-----------|------|
| **并列排行榜** | 分数相同，排名相同 |
| **严格排行榜** | 分数相同，按时间排序 |

### 使用ZSet实现排行榜

```python
import redis

r = redis.Redis(host='localhost', port=6379)

# 添加玩家分数
r.zadd('game_rank', {
    'player_001': 100,
    'player_002': 200,
    'player_003': 150,
    'player_004': 200,  # 与player_002分数相同
})

# 获取排行榜（从高到低；分数相同时 ZREVRANGE 按成员字典序降序）
rank = r.zrevrange('game_rank', 0, 9, withscores=True)
print(rank)
# [('player_004', 200.0), ('player_002', 200.0), ('player_003', 150.0), ('player_001', 100.0)]

# 获取玩家排名（从0开始）
player_rank = r.zrevrank('game_rank', 'player_001')
print(f"排名: {player_rank + 1}")  # 排名: 4

# 获取玩家分数
score = r.zscore('game_rank', 'player_001')
print(f"分数: {score}")  # 分数: 100.0
```

### Lua脚本批量创建数据

Redis 2.6+支持Lua脚本，可实现类似存储过程的功能：

```lua
-- insert_user_scores.lua
-- 批量创建玩家数据

math.randomseed(ARGV[1])
local create_time = 1567769563 - 3600*24*365*2.0
local num = ARGV[2]
local user_id = ARGV[3]

for i=1, num do
    local interval = math.random(1, 60)
    local temp = math.random(1, 112)
    
    -- 达到王者段位后继续增加星星
    if temp == 112 then
        temp = temp + math.random(0, 100)
    end
    
    create_time = create_time + interval
    -- 将时间信息编码到分数小数部分
    temp = temp + create_time / 10000000000
    
    redis.call('ZADD', KEYS[1], temp, user_id+i-1)
end

return 'Generation Completed'
```

**执行Lua脚本**：

```bash
redis-cli --eval insert_user_scores.lua rank , 30 100000 10000
```

## Redis持久化

### RDB持久化

**特点**：
- 生成数据快照保存到磁盘
- 适合备份和灾难恢复
- 性能影响小
- 可能丢失最后一次快照后的数据

**配置**：

```ini
# redis.conf
save 900 1      # 900秒内至少1次修改
save 300 10     # 300秒内至少10次修改
save 60 10000   # 60秒内至少10000次修改
```

### AOF持久化

**特点**：
- 记录每个写操作
- 数据安全性更高
- 文件体积较大
- 恢复速度较慢

**配置**：

```ini
# redis.conf
appendonly yes
appendfsync everysec  # 每秒同步一次
# appendfsync always  # 每次写操作都同步
# appendfsync no      # 由操作系统决定
```

### 持久化策略对比

| 特性 | RDB | AOF |
|-----|-----|-----|
| 数据安全性 | 可能丢失分钟级数据 | 最多丢失1秒数据 |
| 文件大小 | 较小（压缩） | 较大 |
| 恢复速度 | 快 | 慢 |
| 性能影响 | 小 | 较大 |
| 适用场景 | 备份、灾难恢复 | 高可用、数据安全 |

## Redis应用场景

### 1. 缓存

```python
def get_user(user_id):
    # 先查缓存
    user = r.get(f'user:{user_id}')
    if user:
        return user
    
    # 缓存未命中，查数据库
    user = db.query_user(user_id)
    if user:
        # 写入缓存，设置过期时间
        r.setex(f'user:{user_id}', 3600, user)
    return user
```

### 2. 分布式锁

```python
import uuid

def acquire_lock(lock_name, timeout=10):
    """获取分布式锁"""
    identifier = str(uuid.uuid4())
    lock_key = f'lock:{lock_name}'
    
    if r.setnx(lock_key, identifier):
        r.expire(lock_key, timeout)
        return identifier
    return None

def release_lock(lock_name, identifier):
    """释放分布式锁"""
    lock_key = f'lock:{lock_name}'
    if r.get(lock_key) == identifier:
        r.delete(lock_key)
```

> 注意：`SETNX` 与 `EXPIRE` 分开执行、`GET` 与 `DELETE` 分开执行都不是原子操作，生产环境建议用 Lua 脚本原子加锁/释放，或使用 `SET key value NX EX seconds` 一条命令加锁。

### 3. 消息队列

```python
# 生产者
def produce(queue_name, message):
    r.lpush(queue_name, message)

# 消费者
def consume(queue_name):
    while True:
        message = r.brpop(queue_name, timeout=0)
        process_message(message)
```

### 4. 限流

```python
def is_rate_limited(user_id, limit=100, period=60):
    """检查是否超过限流"""
    key = f'rate:{user_id}'
    count = r.incr(key)
    
    if count == 1:
        r.expire(key, period)
    
    return count > limit
```

## 总结

Redis作为高性能内存数据库，核心要点如下：

| 方面 | 说明 |
|-----|------|
| **核心优势** | 内存存储、单线程、I/O多路复用 |
| **数据类型** | String、Hash、List、Set、ZSet |
| **事务机制** | MULTI/EXEC/WATCH，无回滚 |
| **持久化** | RDB快照、AOF日志 |
| **典型应用** | 缓存、排行榜、分布式锁、消息队列 |

**使用建议**：
1. 使用连接池管理连接
2. 合理设置过期时间
3. 根据场景选择持久化策略
4. 注意大Key问题，避免阻塞
