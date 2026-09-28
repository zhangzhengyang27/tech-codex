---
title: Redis 进阶特性
description: Redis 的过期策略、持久化（RDB/AOF）、发布订阅与 Lua 脚本
keywords: [Node.js, Redis, 持久化, 发布订阅]
category: Node.js
tags: [Node.js, 数据库]
---

# Redis 进阶特性

本文档介绍 Redis 的高级特性，包括过期策略、事务、发布订阅、Pipeline、Lua 脚本、持久化机制和高可用架构。

## 过期策略

### 过期键删除策略

```
┌─────────────────────────────────────────────────────────────┐
│                    Redis 过期删除策略                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              惰性删除（Lazy Expiration）              │   │
│  │                                                      │   │
│  │  访问 key 时检查是否过期，过期则删除                  │   │
│  │  优点：CPU 友好，只在访问时处理                       │   │
│  │  缺点：过期 key 可能长期占用内存                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              定期删除（Periodic Expiration）          │   │
│  │                                                      │   │
│  │  定期随机抽取部分 key 检查过期                       │   │
│  │  默认每秒 10 次，每次检查 20 个 key                   │   │
│  │  优点：平衡 CPU 和内存                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Redis 采用：惰性删除 + 定期删除                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### TTL 返回值

| 返回值 | 含义 |
|--------|------|
| `-2` | key 不存在或已过期 |
| `-1` | key 存在但没有设置过期时间 |
| `> 0` | 剩余生存时间（秒） |

---

## 事务

Redis 事务通过 MULTI、EXEC、DISCARD、WATCH 命令实现。

### 基本语法

```bash
# 开启事务
MULTI

# 命令入队（不会立即执行）
SET key1 "value1"
SET key2 "value2"
INCR counter

# 执行事务
EXEC

# 取消事务
DISCARD
```

### 事务特性

```
┌─────────────────────────────────────────────────────────────┐
│                    Redis 事务特性                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✓ 原子性：事务中的命令要么全部执行，要么全部不执行         │
│  ✓ 隔离性：事务执行期间不会被其他客户端命令打断             │
│  ✗ 一致性：不支持回滚，某条命令失败后后续命令仍会执行       │
│  ✗ 持久性：取决于持久化配置                                 │
│                                                             │
│  注意：Redis 事务不是真正的 ACID 事务                       │
│       命令语法错误会导致整个事务失败                        │
│       运行时错误（如类型错误）不会影响其他命令              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### WATCH 命令（乐观锁）

监视一个或多个 key，如果在事务执行前这些 key 被修改，事务将失败。

```bash
# 监视 key
WATCH balance

# 获取当前值
GET balance                    # 假设返回 100

# 另一个客户端修改了 balance
# SET balance 50

# 开启事务
MULTI
DECRBY balance 10

# 执行事务，如果 balance 被修改，返回 nil
EXEC                           # 返回 nil 表示失败
```

### 事务应用示例

```bash
# 转账示例
WATCH from_account
GET from_account               # 获取余额
WATCH to_account
GET to_account                 # 获取余额

MULTI
DECRBY from_account 100
INCRBY to_account 100
EXEC                           # 如果任一账户被修改，事务失败
```

---

## 发布/订阅（Pub/Sub）

### 基本操作

```bash
# ==================== 频道操作 ====================

# 订阅频道
SUBSCRIBE news-channel

# 订阅多个频道
SUBSCRIBE news-channel sports-channel

# 模式订阅（支持通配符）
PSUBSCRIBE news:*

# 发布消息
PUBLISH news-channel "Hello, World!"

# 退订
UNSUBSCRIBE news-channel
PUNSUBSCRIBE news:*

# 查看活跃频道
PUBSUB CHANNELS
PUBSUB CHANNELS news:*

# 查看订阅数
PUBSUB NUMSUB news-channel
```

### 消息流转

```
┌─────────────────────────────────────────────────────────────┐
│                    Pub/Sub 消息流转                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Publisher                     Redis Server                │
│   ┌─────────┐                  ┌─────────────────┐         │
│   │ PUBLISH │ ──────────────▶ │   news-channel  │         │
│   │         │                  │                 │         │
│   └─────────┘                  └────────┬────────┘         │
│                                         │                   │
│                    ┌────────────────────┼────────────────┐  │
│                    ▼                    ▼                ▼  │
│              ┌──────────┐        ┌──────────┐      ┌──────────┐
│              │Subscriber│        │Subscriber│      │Subscriber│
│              │    1     │        │    2     │      │    3     │
│              └──────────┘        └──────────┘      └──────────┘
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 应用场景

| 场景 | 说明 |
|------|------|
| 实时通知 | 系统公告、消息推送 |
| 聊天室 | 多人实时聊天 |
| 实时数据同步 | 配置更新、状态变更 |
| 事件驱动架构 | 解耦系统组件 |

> **注意**：Pub/Sub 消息不会被持久化，订阅者离线期间的消息会丢失。需要持久化的场景请使用 Stream。

---

## 管道（Pipeline）

### 工作原理

```
┌─────────────────────────────────────────────────────────────┐
│                    Pipeline vs 普通模式                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  普通模式：                                                  │
│  Client ──▶ SET key1 ──▶ Server ──▶ OK ──▶ Client          │
│  Client ──▶ SET key2 ──▶ Server ──▶ OK ──▶ Client          │
│  Client ──▶ SET key3 ──▶ Server ──▶ OK ──▶ Client          │
│  （每个命令都需要一次网络往返）                              │
│                                                             │
│  Pipeline 模式：                                             │
│  Client ──▶ SET key1, SET key2, SET key3 ──▶ Server        │
│  Client ◀─── OK, OK, OK ◀──────────────────── Server        │
│  （多个命令打包发送，只需一次网络往返）                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Pipeline vs 事务

| 特性 | Pipeline | 事务 |
|------|----------|------|
| 原子性 | 不保证 | 保证 |
| 关注点 | 减少网络延迟 | 保证原子执行 |
| 适用场景 | 批量写入/读取 | 需要原子性的操作 |
| 是否可一起使用 | 可以结合事务使用 | - |

### 性能对比

```
┌─────────────────────────────────────────────────────────────┐
│                    性能对比示例                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  执行 10000 次 SET 操作：                                   │
│                                                             │
│  普通模式：     ~10 秒（每条命令约 1ms 网络延迟）            │
│  Pipeline：     ~0.1 秒（减少 99% 网络延迟）                │
│                                                             │
│  网络延迟 = 1ms 时：                                        │
│  普通模式：10000 × 1ms = 10 秒                              │
│  Pipeline：1 × 1ms + 处理时间 ≈ 0.01 秒                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Lua 脚本

### 为什么使用 Lua 脚本

1. **原子性**：整个脚本作为一个整体执行，不会被其他命令打断
2. **减少网络开销**：多个命令一次发送
3. **复用性**：脚本加载后可重复调用

### 基本操作

```bash
# 执行脚本
EVAL "return redis.call('GET', KEYS[1])" 1 mykey

# 参数说明：
# 第一个参数：Lua 脚本
# 第二个参数：KEYS 数量
# 后续参数：KEYS 和 ARGV

# 加载脚本到缓存
SCRIPT LOAD "return redis.call('GET', KEYS[1])"
# 返回 SHA1: "e0e1f9fabfc9d4800c877a703b823ac0578ff8db"

# 通过 SHA1 执行已缓存的脚本
EVALSHA e0e1f9fabfc9d4800c877a703b823ac0578ff8db 1 mykey

# 检查脚本是否存在
SCRIPT EXISTS e0e1f9fabfc9d4800c877a703b823ac0578ff8db

# 清除所有缓存的脚本
SCRIPT FLUSH
```

### Lua 脚本示例

#### 原子性 GET-SET

```lua
-- 如果 key 不存在则设置值并返回，存在则返回原值
local value = redis.call('GET', KEYS[1])
if value then
  return value
else
  redis.call('SET', KEYS[1], ARGV[1])
  return ARGV[1]
end
```

#### 分布式锁释放

```lua
-- 只有锁的持有者才能释放锁
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
else
  return 0
end
```

#### 限流器

```lua
-- 滑动窗口限流
local key = KEYS[1]
local limit = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local current = redis.call('TIME')[1]

redis.call('ZREMRANGEBYSCORE', key, 0, current - window)
local count = redis.call('ZCARD', key)

if count < limit then
  redis.call('ZADD', key, current, current .. '-' .. math.random())
  redis.call('EXPIRE', key, window)
  return 1
else
  return 0
end
```

---

## 持久化

### RDB 持久化

在指定时间间隔内生成数据快照。

```conf
# redis.conf RDB 配置
save 900 1      # 900秒内至少1个key变化
save 300 10     # 300秒内至少10个key变化
save 60 10000   # 60秒内至少10000个key变化

dbfilename dump.rdb
dir /var/lib/redis

# RDB 压缩
rdbcompression yes
rdbchecksum yes
```

```bash
# 手动生成 RDB 快照
BGSAVE                          # 后台保存
SAVE                            # 同步保存（会阻塞）

# 查看最后保存时间
LASTSAVE
```

### AOF 持久化

记录所有写操作命令。

```conf
# redis.conf AOF 配置
appendonly yes
appendfilename "appendonly.aof"

# 同步策略
appendfsync always    # 每次写入都同步（最安全，最慢）
appendfsync everysec  # 每秒同步（推荐，最多丢失1秒数据）
appendfsync no        # 由操作系统决定（最快，最不安全）

# AOF 重写配置
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# 加载 AOF 时忽略最后一条可能不完整的命令
aof-load-truncated yes
```

```bash
# 手动触发 AOF 重写
BGREWRITEAOF

# 查看 AOF 状态
INFO persistence
```

### RDB vs AOF 对比

```
┌─────────────────────────────────────────────────────────────┐
│                    RDB vs AOF 对比                           │
├───────────────┬─────────────────────┬───────────────────────┤
│     特性      │        RDB          │         AOF           │
├───────────────┼─────────────────────┼───────────────────────┤
│ 文件大小      │ 小（压缩二进制）     │ 大（文本命令）         │
│ 恢复速度      │ 快                  │ 慢                    │
│ 数据安全性    │ 低（可能丢失分钟级） │ 高（最多丢失1秒）      │
│ 性能影响      │ 小                  │ 较大                  │
│ 文件可读性    │ 不可读              │ 可读                  │
│ 适用场景      │ 备份、主从复制       │ 数据安全要求高         │
└───────────────┴─────────────────────┴───────────────────────┘
```

### 混合持久化（Redis 4.0+）

```conf
# 开启混合持久化
aof-use-rdb-preamble yes
```

AOF 重写时，将 RDB 内容写入 AOF 文件开头，后续追加增量命令。

```
┌─────────────────────────────────────────────────────────────┐
│                    混合持久化文件结构                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  RDB 格式数据（基础快照）                            │   │
│  │  包含重写时刻的所有数据                              │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AOF 格式数据（增量命令）                            │   │
│  │  重写期间新产生的写命令                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  恢复时先加载 RDB 快速恢复大部分数据，再执行增量命令        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 高可用架构

### 主从复制

```
┌─────────────────────────────────────────────────────────────┐
│                    主从复制架构                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    ┌─────────────┐                          │
│                    │   Master    │                          │
│                    │  (读写)     │                          │
│                    └──────┬──────┘                          │
│                           │                                 │
│              ┌────────────┼────────────┐                    │
│              │            │            │                    │
│              ▼            ▼            ▼                    │
│        ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│        │  Slave1  │ │  Slave2  │ │  Slave3  │              │
│        │  (只读)  │ │  (只读)  │ │  (只读)  │              │
│        └──────────┘ └──────────┘ └──────────┘              │
│                                                             │
│        写操作 ──▶ Master ──复制──▶ Slave                    │
│        读操作 ──▶ Slave（读写分离）                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

```bash
# 在从节点配置
REPLICAOF <master-ip> <master-port>

# 或在配置文件中设置
replicaof 192.168.1.100 6379

# 主节点设置密码时
masterauth yourpassword

# 查看复制信息
INFO replication

# 取消主从关系
REPLICAOF NO ONE
```

### 哨兵（Sentinel）

```
┌─────────────────────────────────────────────────────────────┐
│                    哨兵架构                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│   │ Sentinel │  │ Sentinel │  │ Sentinel │                │
│   │    1     │  │    2     │  │    3     │                │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘                │
│        │             │             │                        │
│        └─────────────┼─────────────┘                        │
│                      │                                      │
│                      ▼ 监控 & 故障转移                      │
│                                                             │
│   ┌─────────────┐          ┌─────────────┐                 │
│   │   Master    │ ──────▶  │   Slave     │                 │
│   └─────────────┘  复制    └─────────────┘                 │
│                                                             │
│   故障转移流程：                                             │
│   1. Sentinel 检测到 Master 下线                           │
│   2. Sentinel 投票选举新 Master                            │
│   3. 提升 Slave 为新 Master                                │
│   4. 通知其他 Slave 复制新 Master                          │
│   5. 更新客户端配置                                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

```conf
# sentinel.conf
port 26379
sentinel monitor mymaster 127.0.0.1 6379 2
sentinel down-after-milliseconds mymaster 5000
sentinel failover-timeout mymaster 60000
sentinel parallel-syncs mymaster 1
sentinel auth-pass mymaster yourpassword
```

```bash
# 启动哨兵
redis-sentinel /path/to/sentinel.conf

# 或
redis-server /path/to/sentinel.conf --sentinel

# 查看哨兵状态
redis-cli -p 26379 INFO sentinel
```

### 集群（Cluster）

```
┌─────────────────────────────────────────────────────────────┐
│                    Redis Cluster 架构                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    16384 个哈希槽分布到多个主节点                            │
│                                                             │
│   ┌───────────────┐         ┌───────────────┐              │
│   │    Master1    │         │    Master2    │              │
│   │  槽 0-5461    │         │  槽 5462-10922│              │
│   │  ┌─────────┐  │         │  ┌─────────┐  │              │
│   │  │ Slave1  │  │         │  │ Slave2  │  │              │
│   │  └─────────┘  │         │  └─────────┘  │              │
│   └───────┬───────┘         └───────┬───────┘              │
│           │                         │                       │
│           │    ┌───────────────┐    │                       │
│           └───▶│    Master3    │◀───┘                       │
│                │ 槽 10923-16383│                            │
│                │  ┌─────────┐  │                            │
│                │  │ Slave3  │  │                            │
│                │  └─────────┘  │                            │
│                └───────────────┘                            │
│                                                             │
│   key 路由：CRC16(key) % 16384 -> 槽位 -> 节点             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

```conf
# redis.conf 集群配置
cluster-enabled yes
cluster-config-file nodes.conf
cluster-node-timeout 5000
cluster-announce-ip 192.168.1.100
cluster-announce-port 6379
cluster-announce-bus-port 16379
```

```bash
# 创建集群（至少 3 主 3 从）
redis-cli --cluster create \
  192.168.1.101:6379 192.168.1.102:6379 192.168.1.103:6379 \
  192.168.1.104:6379 192.168.1.105:6379 192.168.1.106:6379 \
  --cluster-replicas 1

# 添加节点
redis-cli --cluster add-node new_host:new_port existing_host:existing_port

# 删除节点
redis-cli --cluster del-node host:port node_id

# 重新分片
redis-cli --cluster reshard host:port

# 查看集群状态
redis-cli -c cluster info
redis-cli -c cluster nodes
```

### 高可用方案对比

| 方案 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| 主从复制 | 简单、读写分离 | 需手动故障转移 | 数据备份、读写分离 |
| 哨兵 | 自动故障转移 | 配置较复杂 | 需要高可用的中小规模场景 |
| 集群 | 数据分片、高可用 | 配置复杂、有运维成本 | 大数据量、高并发场景 |

---

## 相关文档

- [05-Redis-1-基础入门](05-Redis-1-基础入门.md) - 系统架构、核心特性、数据类型操作
- [07-Redis-3-NodeJS操作](07-Redis-3-NodeJS操作.md) - ioredis 客户端使用、实际应用示例
- [08-Redis-4-最佳实践](08-Redis-4-最佳实践.md) - 性能优化、安全配置、常见问题解答
