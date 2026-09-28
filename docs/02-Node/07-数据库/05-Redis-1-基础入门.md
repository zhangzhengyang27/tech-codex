---
title: Redis 基础入门
description: Redis 的字符串/哈希/列表等核心数据类型与基本命令
keywords: [Node.js, Redis, 缓存, 数据类型]
category: Node.js
tags: [Node.js, 数据库]
---

# Redis 基础入门

Redis（**RE**mote **DI**ctionary **S**erver，远程字典服务器）是一个使用 ANSI C 编写的、开源的、支持网络、基于内存且可选持久性的键值对存储数据库。自 2009 年发布以来，Redis 已成为最受欢迎的 NoSQL 数据库之一。

## 系统架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        客户端应用                            │
│              (Node.js / Java / Python / Go ...)             │
└─────────────────────────────┬───────────────────────────────┘
                              │ Redis 协议 (RESP)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Redis 服务端                            │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    命令处理器                          │  │
│  │  • 命令解析  • 权限校验  • 执行调度                   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   内存数据存储                        │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │  │
│  │  │ String  │ │  Hash   │ │  List   │ │  Set    │    │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │  │
│  │  │  ZSet   │ │ Stream  │ │ HyperLog│ │  Geo    │    │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌─────────────────────┐  ┌─────────────────────────────┐   │
│  │     持久化模块       │  │       高可用模块            │   │
│  │  • RDB 快照         │  │  • 主从复制                 │   │
│  │  • AOF 日志         │  │  • 哨兵 Sentinel            │   │
│  │  • 混合持久化       │  │  • 集群 Cluster             │   │
│  └─────────────────────┘  └─────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                      ┌─────────────┐
                      │    磁盘      │
                      │ (持久化存储) │
                      └─────────────┘
```

### 单线程模型

Redis 采用单线程事件循环模型：

```
┌─────────────────────────────────────────────────────────────┐
│                    Redis 单线程模型                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌──────────────┐                                         │
│    │   客户端连接  │  ──────────────────────────────────┐   │
│    └──────────────┘                                    │   │
│    ┌──────────────┐                                    │   │
│    │   客户端连接  │  ──────────────────────────────────┤   │
│    └──────────────┘                                    │   │
│    ┌──────────────┐                                    ▼   │
│    │   客户端连接  │  ──────────▶  ┌─────────────────────┐ │
│    └──────────────┘               │                     │ │
│                                   │    I/O 多路复用器   │ │
│                                   │    (epoll/kqueue)  │ │
│                                   │                     │ │
│                                   └──────────┬──────────┘ │
│                                              │            │
│                                              ▼            │
│                                   ┌─────────────────────┐ │
│                                   │                     │ │
│                                   │    事件循环         │ │
│                                   │    (Event Loop)    │ │
│                                   │                     │ │
│                                   └──────────┬──────────┘ │
│                                              │            │
│                         ┌────────────────────┼────────────┐│
│                         ▼                    ▼            ▼│
│                   ┌──────────┐        ┌──────────┐  ┌──────┐
│                   │ 文件事件 │        │ 时间事件 │  │ 其他 │
│                   │  处理器  │        │  处理器  │  │      │
│                   └──────────┘        └──────────┘  └──────┘
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

> **为什么单线程这么快？**
> - 纯内存操作，无磁盘 I/O 阻塞
> - 单线程避免上下文切换开销
> - I/O 多路复用高效处理并发连接
> - 非阻塞 I/O 操作

---

## Redis 核心特性

### 1. 卓越的性能

Redis 将所有数据存储在内存中，读写速度极快：

| 操作类型 | 性能指标 |
|----------|----------|
| 简单读写 | > 100,000 ops/s |
| Pipeline 批量 | > 1,000,000 ops/s |
| 典型延迟 | < 1ms |

### 2. 丰富的数据结构

```
┌─────────────────────────────────────────────────────────────┐
│                    Redis 数据结构                           │
├───────────────┬─────────────────────────────────────────────┤
│    基础类型    │                  说明                       │
├───────────────┼─────────────────────────────────────────────┤
│   String      │  字符串，最基本类型，最大 512MB             │
│   Hash        │  哈希，存储字段-值对                        │
│   List        │  列表，有序字符串集合，双向链表             │
│   Set         │  集合，无序且唯一的字符串集合               │
│   ZSet        │  有序集合，每个元素关联分数进行排序         │
├───────────────┼─────────────────────────────────────────────┤
│    高级类型    │                  说明                       │
├───────────────┼─────────────────────────────────────────────┤
│   Stream      │  流，消息队列（Redis 5.0+）                 │
│   HyperLogLog │  基数估算，统计去重数量                     │
│   Bitmap      │  位图，位级别操作                          │
│   Geo         │  地理位置信息                              │
│   Bitfield    │  位域，多位操作                            │
└───────────────┴─────────────────────────────────────────────┘
```

### 3. 持久化机制

| 方式 | 原理 | 特点 |
|------|------|------|
| **RDB** | 定时生成数据快照 | 文件小，恢复快，可能丢失数据 |
| **AOF** | 记录所有写操作命令 | 数据安全，文件大，恢复慢 |
| **混合** | RDB + AOF 结合 | 兼顾两者优点（Redis 4.0+） |

### 4. 高可用与分布式

```
┌─────────────────────────────────────────────────────────────┐
│                    Redis 高可用方案                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    主从复制                          │   │
│  │  Master ──复制──▶ Slave ──复制──▶ Slave             │   │
│  │  功能：读写分离、数据备份                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    哨兵模式                          │   │
│  │  Sentinel 监控 Master，自动故障转移                  │   │
│  │  功能：监控、通知、自动故障转移                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    集群模式                          │   │
│  │  多主多从，数据分片存储                              │   │
│  │  功能：数据分片、高可用、水平扩展                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Redis 应用场景

### 场景总览

| 场景 | 推荐数据结构 | 说明 |
|------|-------------|------|
| **缓存系统** | String | 存储热点数据，减轻数据库压力 |
| **分布式会话** | String/Hash | 分布式会话管理 |
| **计数器** | String | 原子性自增，点赞数、访问量 |
| **排行榜** | ZSet | 实时排行榜、积分榜 |
| **消息队列** | List/Stream | 异步任务、消息推送 |
| **分布式锁** | String + Lua | SETNX 实现 |
| **社交网络** | Set/ZSet | 共同好友、推荐系统 |
| **限流器** | String/ZSet | API 访问频率限制 |
| **地理位置** | Geo | 附近的人、打车距离计算 |

### 场景详解

#### 1. 缓存系统

```
┌─────────────────────────────────────────────────────────────┐
│                     缓存架构示意                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   请求 ──▶ 应用服务 ──▶ Redis 缓存 ──命中──▶ 返回          │
│                      │                                       │
│                      └──未命中──▶ MySQL ──▶ 写入缓存──▶ 返回 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 2. 排行榜实现

```
┌─────────────────────────────────────────────────────────────┐
│                    ZSet 排行榜示意                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Key: leaderboard                                          │
│   ┌─────────────────────────────────────────────────────┐  │
│   │  Member     │  Score  │  Rank                       │  │
│   ├─────────────────────────────────────────────────────┤  │
│   │  player3    │  980    │  1                          │  │
│   │  player1    │  850    │  2                          │  │
│   │  player2    │  720    │  3                          │  │
│   │  player5    │  650    │  4                          │  │
│   │  player4    │  500    │  5                          │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
│   ZREVRANGE leaderboard 0 9 WITHSCORES  # Top 10           │
│   ZINCRBY leaderboard 100 "player1"     # 加分             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 安装与配置

### 安装方式

#### macOS 安装

```bash
# 使用 Homebrew
brew install redis

# 启动服务
brew services start redis

# 验证安装
redis-cli ping  # 输出: PONG
```

#### Linux 安装

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install redis-server

# CentOS/RHEL
sudo yum install redis

# 源码编译
wget https://download.redis.io/releases/redis-7.2.tar.gz
tar xzf redis-7.2.tar.gz
cd redis-7.2
make && make install
```

#### Docker 安装

```bash
# 拉取镜像
docker pull redis:7.2

# 启动容器
docker run -d --name redis \
  -p 6379:6379 \
  -v /data/redis:/data \
  redis:7.2 redis-server --appendonly yes
```

### 基本命令

```bash
# 启动 Redis 服务器
redis-server                          # 前台运行
redis-server /etc/redis/redis.conf   # 指定配置文件
redis-server --daemonize yes         # 后台运行

# 连接 Redis
redis-cli                            # 默认连接 127.0.0.1:6379
redis-cli -h 127.0.0.1 -p 6379      # 指定主机和端口
redis-cli -a yourpassword           # 指定密码
redis-cli -u redis://:password@host:6379/0  # URL 方式

# 停止 Redis
redis-cli shutdown
redis-cli -a password shutdown      # 需要密码时

# 测试连接
redis-cli ping                       # 返回 PONG
```

### 配置参数详解

```conf
# ============================================
# redis.conf 核心配置参数
# ============================================

# ------------------ 网络配置 ------------------
# 绑定 IP 地址，多个用空格分隔
bind 127.0.0.1

# 保护模式，生产环境建议开启
protected-mode yes

# 监听端口
port 6379

# TCP 连接队列长度
tcp-backlog 511

# 客户端空闲超时（秒），0 表示禁用
timeout 0

# TCP keepalive 设置（秒）
tcp-keepalive 300

# ------------------ 通用配置 ------------------
# 后台运行
daemonize no

# PID 文件路径
pidfile /var/run/redis/redis-server.pid

# 日志级别: debug, verbose, notice, warning
loglevel notice

# 日志文件路径
logfile /var/log/redis/redis-server.log

# 数据库数量（0-15）
databases 16

# 启动时是否显示 Logo
always-show-logo no

# ------------------ 持久化配置 ------------------
# RDB 快照配置
save 900 1      # 900秒内至少1个key变化
save 300 10     # 300秒内至少10个key变化
save 60 10000   # 60秒内至少10000个key变化

# RDB 快照失败时停止写入
stop-writes-on-bgsave-error yes

# RDB 文件名
dbfilename dump.rdb

# 数据目录
dir /var/lib/redis

# AOF 持久化配置
appendonly yes
appendfilename "appendonly.aof"

# AOF 同步策略
# always: 每次写入都同步（最安全，最慢）
# everysec: 每秒同步（推荐）
# no: 由操作系统决定
appendfsync everysec

# AOF 重写期间是否禁用 fsync
no-appendfsync-on-rewrite no

# AOF 文件重写触发条件
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# ------------------ 内存管理 ------------------
# 最大内存限制
maxmemory 2gb

# 内存淘汰策略
# volatile-lru: 从设置了过期时间的数据集中淘汰最近最少使用的
# allkeys-lru: 从所有数据集中淘汰最近最少使用的
# volatile-lfu: 从设置了过期时间的数据集中淘汰最不常用的
# allkeys-lfu: 从所有数据集中淘汰最不常用的
# volatile-random: 从设置了过期时间的数据集中随机淘汰
# allkeys-random: 从所有数据集中随机淘汰
# volatile-ttl: 淘汰设置了过期时间且 TTL 最短的
# noeviction: 不淘汰，内存满时返回错误（默认）
maxmemory-policy allkeys-lru

# 淘汰样本数量
maxmemory-samples 5

# ------------------ 安全配置 ------------------
# 访问密码
requirepass your-strong-password

# 重命名危险命令
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command KEYS ""

# ------------------ 客户端配置 ------------------
# 最大客户端连接数
maxclients 10000

# ------------------ 慢查询日志 ------------------
# 慢查询时间阈值（微秒）
slowlog-log-slower-than 10000

# 慢查询日志最大长度
slowlog-max-len 128
```

### 内存淘汰策略详解

```
┌─────────────────────────────────────────────────────────────┐
│                    内存淘汰策略选择                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    是否有过期时间策略？                      │
│                           │                                 │
│              ┌────────────┴────────────┐                    │
│              ▼                         ▼                    │
│            是（针对有 TTL）        否（针对所有 key）         │
│              │                         │                    │
│    ┌─────────┼─────────┐      ┌────────┼────────┐          │
│    ▼         ▼         ▼      ▼        ▲        ▼          │
│  LRU       LFU      Random   LRU      LFU    Random         │
│  淘汰最    淘汰最    随机     淘汰最   淘汰最  随机          │
│  少使用    不常用    淘汰     少使用   不常用  淘汰          │
│                                                             │
│  volatile-lru  volatile-lfu  volatile-random                │
│  allkeys-lru   allkeys-lfu   allkeys-random                │
│                                                             │
│  特殊策略：                                                  │
│  • volatile-ttl: 淘汰 TTL 最短的 key                        │
│  • noeviction: 不淘汰，内存满时返回错误                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**选择建议：**

| 场景 | 推荐策略 | 原因 |
|------|----------|------|
| 缓存系统 | `allkeys-lru` | 缓存数据应尽量保留热点数据 |
| 有明确热点数据 | `allkeys-lfu` | 更精确地识别热点 |
| 数据重要性不同 | `volatile-lru` | 保护无过期时间的重要数据 |
| 随机访问模式 | `allkeys-random` | 无明显访问规律时 |
| 不允许数据丢失 | `noeviction` | 配合监控和报警使用 |

---

## 数据类型操作

### 1. 字符串（String）

String 是 Redis 最基本的数据类型，可以存储字符串、整数、浮点数或二进制数据。

```bash
# ==================== 基本操作 ====================

# 设置值
SET key value
SET user:name "Alice"
SET user:email "alice@example.com"

# 获取值
GET key                          # "Alice"

# 设置多个值
MSET key1 value1 key2 value2
MSET user:name "Alice" user:age "30"

# 获取多个值
MGET key1 key2

# 删除
DEL key

# ==================== 过期时间 ====================

# 设置值并指定过期时间（秒）
SETEX key seconds value
SETEX session:token 3600 "abc123"

# 设置值并指定过期时间（毫秒）
PSETEX key milliseconds value

# 设置过期时间
EXPIRE key seconds              # 秒
PEXPIRE key milliseconds        # 毫秒
EXPIREAT key timestamp          # Unix 时间戳（秒）
PEXPIREAT key milliseconds-timestamp  # Unix 时间戳（毫秒）

# 查看剩余生存时间
TTL key                         # 秒，-2 表示已过期，-1 表示永不过期
PTTL key                        # 毫秒

# 移除过期时间
PERSIST key

# ==================== 条件设置 ====================

# 只有 key 不存在时设置（分布式锁基础）
SETNX key value                 # 返回 1 表示成功，0 表示失败

# 只有 key 存在时设置
SET key value XX                # XX 选项

# 完整的 SET 选项
SET key value [NX|XX] [GET] [EX seconds|PX milliseconds|EXAT unix-time-seconds|PXAT unix-time-milliseconds|KEEPTTL]

# 示例：设置锁，30秒过期，仅当不存在时
SET lock:resource "locked" NX EX 30

# ==================== 数值操作 ====================

# 自增（值不存在时初始化为 0 再自增）
INCR counter                    # 返回 1
INCR counter                    # 返回 2

# 自减
DECR counter                    # 返回 1

# 指定增量
INCRBY counter 10               # 增加 10
DECRBY counter 5                # 减少 5

# 浮点数增量
INCRBYFLOAT price 2.5           # 增加 2.5

# ==================== 字符串操作 ====================

# 追加字符串
APPEND key value
APPEND user:name " Smith"       # "Alice Smith"

# 获取字符串长度
STRLEN key

# 获取子字符串
GETRANGE key start end
GETRANGE user:name 0 4          # "Alice"

# 替换子字符串
SETRANGE key offset value
SETRANGE user:name 0 "Bob"      # "Bobce Smith"
```

**使用示例：**

```bash
# 缓存 JSON 数据
SET user:1001 '{"name":"Alice","age":30}'

# 计数器
INCR page:views                 # 页面访问量

# 分布式锁
SET lock:order:123 "uuid-value" NX PX 30000

# 限流计数
INCR rate-limit:192.168.1.1
EXPIRE rate-limit:192.168.1.1 60
```

### 2. 哈希（Hash）

Hash 适合存储对象，类似于 JavaScript 的对象或 Python 的字典。

```bash
# ==================== 基本操作 ====================

# 设置单个字段
HSET key field value
HSET user:1 name "Alice"

# 设置多个字段
HSET user:1 name "Alice" age 30 email "alice@example.com"

# 仅当字段不存在时设置
HSETNX user:1 name "Bob"        # 返回 0（字段已存在）

# 获取单个字段
HGET user:1 name                # "Alice"

# 获取多个字段
HMGET user:1 name age email

# 获取所有字段和值
HGETALL user:1
# 1) "name"
# 2) "Alice"
# 3) "age"
# 4) "30"
# 5) "email"
# 6) "alice@example.com"

# ==================== 字段管理 ====================

# 判断字段是否存在
HEXISTS user:1 name             # 1 表示存在

# 删除字段
HDEL user:1 email

# 获取所有字段名
HKEYS user:1

# 获取所有字段值
HVALS user:1

# 获取字段数量
HLEN user:1

# ==================== 数值操作 ====================

# 字段值自增
HINCRBY user:1 age 1            # age + 1
HINCRBY user:1 age -2           # age - 2

# 浮点数自增
HINCRBYFLOAT user:1 salary 500.5
```

**使用场景：**

```bash
# 存储用户信息
HSET user:1001 name "Alice" age 30 role "admin"

# 存储商品信息
HSET product:2001 name "iPhone 15" price 7999 stock 100

# 购物车
HSET cart:user:1001 product:2001 2 product:2002 1
HINCRBY cart:user:1001 product:2001 1   # 增加数量
```

### 3. 列表（List）

List 是有序的字符串列表，基于双向链表实现，支持从两端插入和弹出。

```bash
# ==================== 插入操作 ====================

# 从左侧插入（头部）
LPUSH key value [value ...]
LPUSH tasks "task1" "task2"     # 返回列表长度

# 从右侧插入（尾部）
RPUSH key value [value ...]
RPUSH tasks "task3"

# 在指定元素前/后插入
LINSERT key BEFORE|AFTER pivot value
LINSERT tasks BEFORE "task2" "task1.5"

# 仅当列表存在时插入
LPUSHX key value                # 列表不存在则不操作
RPUSHX key value

# ==================== 获取操作 ====================

# 获取范围内的元素
LRANGE key start stop
LRANGE tasks 0 -1               # 获取所有元素
LRANGE tasks 0 2                # 获取前三个元素

# 获取指定索引的元素
LINDEX key index
LINDEX tasks 0                  # 第一个元素

# 获取列表长度
LLEN key

# ==================== 弹出操作 ====================

# 从左侧弹出
LPOP key [count]
LPOP tasks                      # 弹出一个元素

# 从右侧弹出
RPOP key [count]

# 阻塞弹出（用于消息队列）
BLPOP key [key ...] timeout     # 从左侧弹出，timeout=0 表示无限等待
BRPOP key [key ...] timeout     # 从右侧弹出
BRPOPLPUSH source destination timeout  # 弹出并推入另一个列表

# ==================== 修改操作 ====================

# 设置指定索引的值
LSET key index value

# 裁剪列表，保留指定范围
LTRIM key start stop
LTRIM logs:2024-01-01 -100 -1   # 只保留最后 100 条

# 移除指定值的元素
LREM key count value
LREM tasks 1 "task1"            # 从头开始移除 1 个 "task1"
LREM tasks -1 "task1"           # 从尾开始移除
LREM tasks 0 "task1"            # 移除所有 "task1"
```

**使用场景：**

```bash
# 消息队列（先进先出）
RPUSH queue:tasks "task1"
LPUSH queue:tasks "urgent-task"  # 高优先级任务
LPOP queue:tasks

# 最新列表（如最新文章、最新评论）
LPUSH articles:latest "article:1001"
LTRIM articles:latest 0 99      # 只保留最新 100 条

# 时间轴（社交网络）
LPUSH timeline:user:1001 "post:2001"
```

### 4. 集合（Set）

Set 是无序且唯一的字符串集合，适合存储不重复的数据。

```bash
# ==================== 基本操作 ====================

# 添加成员
SADD key member [member ...]
SADD tags "Node.js" "Redis" "JavaScript"

# 移除成员
SREM key member [member ...]

# 获取所有成员
SMEMBERS key

# 判断成员是否存在
SISMEMBER key member
SISMEMBER tags "Redis"          # 返回 1 表示存在

# 获取集合大小
SCARD key

# 随机获取成员
SRANDMEMBER key [count]

# 随机弹出成员
SPOP key [count]

# ==================== 集合运算 ====================

# 交集（同时存在于多个集合的元素）
SINTER key [key ...]
SINTER set1 set2                # 返回交集元素
SINTERSTORE destination key [key ...]  # 将交集存入新集合

# 并集（所有集合中的元素）
SUNION key [key ...]
SUNIONSTORE destination key [key ...]

# 差集（第一个集合有，其他集合没有的元素）
SDIFF key [key ...]
SDIFFSTORE destination key [key ...]

# 移动成员到另一个集合
SMOVE source destination member
```

**使用场景：**

```bash
# 标签系统
SADD article:1001:tags "JavaScript" "Node.js" "Redis"
SADD tag:JavaScript:articles "article:1001"

# 共同好友
SADD user:1001:friends "user:2001" "user:2002"
SADD user:1002:friends "user:2002" "user:2003"
SINTER user:1001:friends user:1002:friends  # 共同好友

# 抽奖系统
SADD lottery:2024 "user:1001" "user:1002" "user:1003"
SPOP lottery:2024               # 随机抽取中奖者

# 点赞/收藏
SADD article:1001:likes "user:1001"
SISMEMBER article:1001:likes "user:1001"  # 是否已点赞
SCARD article:1001:likes                  # 点赞数
```

### 5. 有序集合（ZSet）

ZSet 是有序且唯一的集合，每个成员关联一个分数（score），按分数排序。

```bash
# ==================== 基本操作 ====================

# 添加成员（分数 + 成员）
ZADD key [NX|XX] [CH] [INCR] score member [score member ...]
ZADD leaderboard 100 "player1" 250 "player2" 150 "player3"

# 获取成员数量
ZCARD key

# 获取成员分数
ZSCORE key member
ZSCORE leaderboard "player1"    # "100"

# 获取成员排名（从 0 开始，升序）
ZRANK key member

# 获取成员排名（降序）
ZREVRANK key member

# ==================== 范围查询 ====================

# 按排名范围获取（升序）
ZRANGE key start stop [WITHSCORES]
ZRANGE leaderboard 0 -1 WITHSCORES  # 所有成员

# 按排名范围获取（降序）
ZREVRANGE key start stop [WITHSCORES]
ZREVRANGE leaderboard 0 9 WITHSCORES  # Top 10

# 按分数范围获取
ZRANGEBYSCORE key min max [WITHSCORES] [LIMIT offset count]
ZRANGEBYSCORE leaderboard 100 200 WITHSCORES

# 按分数范围获取（降序）
ZREVRANGEBYSCORE key max min [WITHSCORES] [LIMIT offset count]

# 获取分数范围内的成员数量
ZCOUNT key min max

# ==================== 修改操作 ====================

# 增加成员分数
ZINCRBY key increment member
ZINCRBY leaderboard 50 "player1"  # 分数变为 150

# 移除成员
ZREM key member [member ...]

# 按排名范围移除
ZREMRANGEBYRANK key start stop

# 按分数范围移除
ZREMRANGEBYSCORE key min max

# ==================== 集合运算 ====================

# 并集
ZUNIONSTORE destination numkeys key [key ...] [WEIGHTS weight] [AGGREGATE SUM|MIN|MAX]

# 交集
ZINTERSTORE destination numkeys key [key ...] [WEIGHTS weight] [AGGREGATE SUM|MIN|MAX]
```

**使用场景：**

```bash
# 排行榜
ZADD leaderboard 100 "player1" 200 "player2" 150 "player3"
ZREVRANGE leaderboard 0 9 WITHSCORES  # Top 10
ZINCRBY leaderboard 10 "player1"      # 加分

# 延迟队列（分数为执行时间戳）
ZADD delay:queue 1704067200 "task1"   # 2024-01-01 00:00:00
ZRANGEBYSCORE delay:queue 0 <current_timestamp>

# 热度排行（分数为热度值）
ZADD trending:topics 1000 "topic1" 500 "topic2"

# 带权重的标签
ZADD user:1001:interests 10 "JavaScript" 8 "Node.js" 5 "Python"
```

### 6. 高级数据类型

#### Stream（消息队列）

Redis 5.0+ 新增的数据类型，专门用于消息队列场景。

```bash
# 添加消息
XADD mystream * field1 value1 field2 value2
# 返回消息 ID: 1704067200000-0

# 读取消息
XRANGE mystream - +              # 获取所有消息
XRANGE mystream 1704067200000-0 1704067200001-0  # 范围获取

# 消费者组
XGROUP CREATE mystream mygroup $  # 创建消费者组
XREADGROUP GROUP mygroup consumer1 COUNT 1 STREAMS mystream >  # 读取消息
XACK mystream mygroup 1704067200000-0  # 确认消息
```

#### HyperLogLog（基数统计）

用于估算集合中不重复元素的数量，误差约 0.81%。

```bash
# 添加元素
PFADD uv:2024-01-01 "user1" "user2" "user3"

# 获取基数估算值
PFCOUNT uv:2024-01-01            # 返回估算的不重复数量

# 合并多个 HyperLogLog
PFMERGE uv:total uv:2024-01-01 uv:2024-01-02
```

#### Bitmap（位图）

对字符串的位级别操作。

```bash
# 设置位
SETBIT user:sign:2024:1001 0 1   # 第 1 天签到
SETBIT user:sign:2024:1001 1 1   # 第 2 天签到

# 获取位
GETBIT user:sign:2024:1001 0     # 返回 1

# 统计为 1 的位数
BITCOUNT user:sign:2024:1001     # 返回签到天数

# 位运算
BITOP AND destkey key [key ...]
BITOP OR destkey key [key ...]
BITOP XOR destkey key [key ...]
```

#### Geo（地理位置）

存储地理位置信息并计算距离。

```bash
# 添加地理位置
GEOADD locations 116.404 39.915 "Beijing"
GEOADD locations 121.474 31.230 "Shanghai"

# 计算两点距离
GEODIST locations Beijing Shanghai km  # 返回距离（千米）

# 获取经纬度
GEOPOS locations Beijing

# 获取指定范围内的元素
GEORADIUS locations 116.404 39.915 100 km WITHDIST
GEORADIUSBYMEMBER locations Beijing 100 km
```

---

## 通用命令

```bash
# ==================== 键操作 ====================

# 查看所有 key（生产环境慎用！）
KEYS *

# 模式匹配（生产环境慎用！）
KEYS user:*

# 安全遍历 key（推荐）
SCAN cursor [MATCH pattern] [COUNT count]
SCAN 0 MATCH user:* COUNT 100

# 判断 key 是否存在
EXISTS key
EXISTS user:1 user:2             # 返回存在的数量

# 查看 key 类型
TYPE key

# 删除 key
DEL key [key ...]
UNLINK key [key ...]             # 异步删除（不阻塞）

# 重命名 key
RENAME oldkey newkey
RENAMENX oldkey newkey           # 仅当新 key 不存在时

# ==================== 过期时间 ====================

# 设置过期时间
EXPIRE key seconds
EXPIREAT key timestamp           # Unix 时间戳

# 查看剩余生存时间
TTL key                          # 秒
PTTL key                         # 毫秒

# 移除过期时间
PERSIST key

# ==================== 排序 ====================

# 对列表、集合、有序集合排序
SORT key [BY pattern] [LIMIT offset count] [GET pattern] [ASC|DESC] [ALPHA]
SORT mylist DESC                 # 降序排序
SORT mylist LIMIT 0 10           # 分页

# ==================== 数据库操作 ====================

# 切换数据库
SELECT 1                         # 切换到数据库 1

# 查看当前数据库 key 数量
DBSIZE

# 清空当前数据库
FLUSHDB

# 清空所有数据库
FLUSHALL

# 查看服务器信息
INFO
INFO memory                      # 内存信息
INFO replication                 # 复制信息
```

---

## 相关文档

- [Redis 进阶特性](06-Redis-2-进阶特性.md) - 过期策略、事务、发布订阅、Pipeline、Lua脚本、持久化、高可用架构
- [07-Redis-3-NodeJS操作](07-Redis-3-NodeJS操作.md) - ioredis 客户端使用、实际应用示例
- [08-Redis-4-最佳实践](08-Redis-4-最佳实践.md) - 性能优化、安全配置、常见问题解答

## 参考资料

- [Redis 官方文档](https://redis.io/docs/)
- [Redis 命令参考](https://redis.io/commands)
- [《Redis 设计与实现》](http://redisbook.com/)
