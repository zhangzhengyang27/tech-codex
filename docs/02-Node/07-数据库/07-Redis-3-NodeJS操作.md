---
title: Node.js 操作 Redis
description: ioredis/node-redis 客户端的连接、管道与集群操作
keywords: [Node.js, Redis, ioredis, 客户端]
category: Node.js
tags: [Node.js, 数据库]
---

# Node.js 操作 Redis

本文档介绍如何在 Node.js 中使用 Redis，以 `ioredis` 客户端为例，涵盖基本操作、高级功能和实际应用示例。

## 客户端选择

| 客户端 | 特点 | 推荐场景 |
|--------|------|----------|
| **ioredis** | 功能全面，支持集群、哨兵、Stream、Promise | 生产环境推荐 |
| **node-redis** | 官方客户端，API 简洁，TypeScript 支持好 | 简单场景 |

本文以 `ioredis` 为例进行说明。

---

## 安装与连接

### 安装

```bash
npm install ioredis
# 或
pnpm add ioredis
```

### 基本连接

```javascript
const Redis = require("ioredis")

// ==================== 连接方式 ====================

// 方式一：默认连接（127.0.0.1:6379）
const redis = new Redis()

// 方式二：指定连接参数
const redis = new Redis({
  host: "127.0.0.1",
  port: 6379,
  password: "yourpassword",
  db: 0,
  // 连接选项
  connectTimeout: 10000,      // 连接超时（毫秒）
  retryStrategy: (times) => { // 重试策略
    if (times > 3) return null
    return Math.min(times * 100, 3000)
  }
})

// 方式三：连接 URL
const redis = new Redis("redis://user:password@127.0.0.1:6379/0")

// 方式四：Rediss URL（支持 TLS）
const redis = new Redis("rediss://user:password@127.0.0.1:6379/0")

// ==================== 事件监听 ====================

redis.on("connect", () => {
  console.log("Redis 连接成功")
})

redis.on("ready", () => {
  console.log("Redis 准备就绪")
})

redis.on("error", (err) => {
  console.error("Redis 错误:", err)
})

redis.on("close", () => {
  console.log("Redis 连接关闭")
})

redis.on("reconnecting", () => {
  console.log("Redis 重连中...")
})
```

### 集群连接

```javascript
const Redis = require("ioredis")

const cluster = new Redis.Cluster(
  [
    { host: "192.168.1.101", port: 6379 },
    { host: "192.168.1.102", port: 6379 },
    { host: "192.168.1.103", port: 6379 }
  ],
  {
    scaleReads: "slave",       // 读操作分发到从节点
    maxRedirections: 16,       // 最大重定向次数
    retryDelayOnFailover: 100, // 故障转移重试延迟
    slotsRefreshTimeout: 1000, // 槽刷新超时
    password: "yourpassword"
  }
)
```

### 哨兵连接

```javascript
const Redis = require("ioredis")

const redis = new Redis({
  sentinels: [
    { host: "192.168.1.101", port: 26379 },
    { host: "192.168.1.102", port: 26379 },
    { host: "192.168.1.103", port: 26379 }
  ],
  name: "mymaster",
  password: "yourpassword",
  sentinelPassword: "sentinel-password"
})
```

---

## 基本操作

### 字符串操作

```javascript
// ==================== 设置与获取 ====================

// 设置值
await redis.set("name", "Alice")

// 获取值
const name = await redis.get("name")
console.log(name)  // "Alice"

// 设置多个值
await redis.mset({
  "user:name": "Alice",
  "user:age": "30",
  "user:email": "alice@example.com"
})

// 获取多个值
const values = await redis.mget("user:name", "user:age")
console.log(values)  // ["Alice", "30"]

// ==================== 过期时间 ====================

// 设置值并指定过期时间
await redis.set("token", "abc123", "EX", 3600)  // 1小时
await redis.set("token", "abc123", "PX", 3600000)  // 1小时（毫秒）

// 设置过期时间
await redis.expire("key", 60)  // 60秒

// 获取剩余时间
const ttl = await redis.ttl("key")

// ==================== 条件设置 ====================

// SETNX：仅当 key 不存在时设置
const result = await redis.setnx("lock", "1")
console.log(result)  // 1 表示成功，0 表示失败

// SET with options
await redis.set("lock", "locked", "NX", "EX", 30)  // 不存在时设置，30秒过期

// ==================== 数值操作 ====================

// 自增
await redis.set("counter", 0)
await redis.incr("counter")       // 1
await redis.incrby("counter", 10) // 11

// 自减
await redis.decr("counter")       // 10
await redis.decrby("counter", 5)  // 5

// 浮点数增量
await redis.incrbyfloat("price", 2.5)

// ==================== 其他操作 ====================

// 追加字符串
await redis.append("name", " Smith")

// 获取长度
const len = await redis.strlen("name")

// 获取子串
const substr = await redis.getrange("name", 0, 4)
```

### 哈希操作

```javascript
// ==================== 设置与获取 ====================

// 设置字段
await redis.hset("user:1", "name", "Alice", "age", 30)

// 设置多个字段（对象形式）
await redis.hset("user:1", {
  name: "Alice",
  age: 30,
  email: "alice@example.com"
})

// 仅当字段不存在时设置
await redis.hsetnx("user:1", "name", "Bob")  // 返回 0（字段已存在）

// 获取单个字段
const name = await redis.hget("user:1", "name")

// 获取多个字段
const values = await redis.hmget("user:1", "name", "age")

// 获取所有字段
const user = await redis.hgetall("user:1")
console.log(user)  // { name: "Alice", age: "30", email: "alice@example.com" }

// ==================== 字段管理 ====================

// 判断字段是否存在
const exists = await redis.hexists("user:1", "name")  // 1 或 0

// 删除字段
await redis.hdel("user:1", "email")

// 获取所有字段名
const fields = await redis.hkeys("user:1")

// 获取所有字段值
const vals = await redis.hvals("user:1")

// 获取字段数量
const count = await redis.hlen("user:1")

// ==================== 数值操作 ====================

// 字段值自增
await redis.hincrby("user:1", "age", 1)
await redis.hincrbyfloat("user:1", "salary", 500.5)
```

### 列表操作

```javascript
// ==================== 插入操作 ====================

// 从左侧插入
await redis.lpush("tasks", "task1", "task2")

// 从右侧插入
await redis.rpush("tasks", "task3")

// ==================== 获取操作 ====================

// 获取范围内的元素
const tasks = await redis.lrange("tasks", 0, -1)  // 所有元素

// 获取指定索引的元素
const first = await redis.lindex("tasks", 0)

// 获取列表长度
const len = await redis.llen("tasks")

// ==================== 弹出操作 ====================

// 从左侧弹出
const task = await redis.lpop("tasks")

// 从右侧弹出
const task = await redis.rpop("tasks")

// 阻塞弹出（用于消息队列）
const [key, value] = await redis.blpop("tasks", 5)  // 5秒超时
const [key, value] = await redis.brpop("tasks", 0)  // 无限等待

// ==================== 其他操作 ====================

// 裁剪列表
await redis.ltrim("logs", -100, -1)  // 只保留最后 100 条

// 设置指定索引的值
await redis.lset("tasks", 0, "updated-task")

// 移除元素
await redis.lrem("tasks", 1, "task1")  // 移除 1 个 "task1"
```

### 集合操作

```javascript
// ==================== 基本操作 ====================

// 添加成员
await redis.sadd("tags", "Node.js", "Redis", "JavaScript")

// 获取所有成员
const tags = await redis.smembers("tags")

// 判断成员是否存在
const exists = await redis.sismember("tags", "Redis")  // 1 或 0

// 移除成员
await redis.srem("tags", "JavaScript")

// 获取集合大小
const count = await redis.scard("tags")

// 随机获取成员
const member = await redis.srandmember("tags")

// 随机弹出成员
const member = await redis.spop("tags")

// ==================== 集合运算 ====================

// 交集
const intersection = await redis.sinter("set1", "set2")

// 并集
const union = await redis.sunion("set1", "set2")

// 差集
const diff = await redis.sdiff("set1", "set2")

// 存储运算结果
await redis.sinterstore("result", "set1", "set2")
```

### 有序集合操作

```javascript
// ==================== 基本操作 ====================

// 添加成员
await redis.zadd("leaderboard", 100, "player1", 250, "player2", 150, "player3")

// 获取成员数量
const count = await redis.zcard("leaderboard")

// 获取成员分数
const score = await redis.zscore("leaderboard", "player1")

// 获取成员排名（从 0 开始）
const rank = await redis.zrank("leaderboard", "player1")      // 升序排名
const revRank = await redis.zrevrank("leaderboard", "player1") // 降序排名

// ==================== 范围查询 ====================

// 按排名范围获取（升序）
const members = await redis.zrange("leaderboard", 0, -1)
const withScores = await redis.zrange("leaderboard", 0, -1, "WITHSCORES")

// 按排名范围获取（降序）
const top10 = await redis.zrevrange("leaderboard", 0, 9, "WITHSCORES")

// 按分数范围获取
const range = await redis.zrangebyscore("leaderboard", 100, 200, "WITHSCORES")

// 带分页
const page = await redis.zrangebyscore("leaderboard", 0, 1000, "WITHSCORES", "LIMIT", 0, 10)

// ==================== 修改操作 ====================

// 增加分数
await redis.zincrby("leaderboard", 50, "player1")

// 移除成员
await redis.zrem("leaderboard", "player3")

// 按排名范围移除
await redis.zremrangebyrank("leaderboard", 0, 10)

// 按分数范围移除
await redis.zremrangebyscore("leaderboard", 0, 50)
```

---

## 高级功能

### 管道（Pipeline）

```javascript
// ==================== 基本用法 ====================

const pipeline = redis.pipeline()

pipeline.set("key1", "value1")
pipeline.set("key2", "value2")
pipeline.get("key1")
pipeline.incr("counter")

const results = await pipeline.exec()

// results 是一个数组：
// [
//   [null, 'OK'],      // set key1
//   [null, 'OK'],      // set key2
//   [null, 'value1'],  // get key1
//   [null, 1]          // incr counter
// ]

// ==================== 链式调用 ====================

const results = await redis
  .pipeline()
  .set("key1", "value1")
  .set("key2", "value2")
  .get("key1")
  .exec()
```

### 事务

```javascript
// ==================== 基本事务 ====================

const results = await redis
  .multi()
  .set("key1", "value1")
  .set("key2", "value2")
  .get("key1")
  .exec()

// ==================== WATCH 事务 ====================

// 使用 watch 实现乐观锁
const key = "balance"
const current = await redis.get(key)

// 监视 key
await redis.watch(key)

// 模拟检查条件
if (parseInt(current) >= 100) {
  const result = await redis
    .multi()
    .decrby(key, 100)
    .exec()

  if (result === null) {
    console.log("事务失败，key 被修改")
  }
} else {
  await redis.unwatch()
}
```

### 发布/订阅

```javascript
// ==================== 订阅者 ====================

const subscriber = new Redis()

// 订阅频道
await subscriber.subscribe("news", "sports")

// 监听消息
subscriber.on("message", (channel, message) => {
  console.log(`收到消息 [${channel}]: ${message}`)
})

// 模式订阅
await subscriber.psubscribe("news:*")
subscriber.on("pmessage", (pattern, channel, message) => {
  console.log(`模式 [${pattern}] 频道 [${channel}]: ${message}`)
})

// ==================== 发布者 ====================

const publisher = new Redis()
await publisher.publish("news", "Hello, World!")
await publisher.publish("news:breaking", "Breaking news!")
```

### Lua 脚本

```javascript
// ==================== 直接执行 ====================

const result = await redis.eval(
  "return redis.call('GET', KEYS[1])",
  1,  // KEYS 数量
  "mykey"
)

// ==================== 定义自定义命令 ====================

// 原子性自增并设置过期时间
redis.defineCommand("incrAndExpire", {
  numberOfKeys: 1,
  lua: `
    local current = redis.call("incr", KEYS[1])
    redis.call("expire", KEYS[1], ARGV[1])
    return current
  `
})

// 使用
const count = await redis.incrAndExpire("my_counter", 60)  // 自增并设置 60 秒过期

// ==================== 分布式锁释放脚本 ====================

const unlockScript = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`

const result = await redis.eval(unlockScript, 1, "lock:resource", "uuid-value")
```

### Stream 操作

```javascript
// ==================== 生产者 ====================

// 添加消息
const id = await redis.xadd("mystream", "*", {
  field1: "value1",
  field2: "value2"
})
console.log("消息 ID:", id)  // "1704067200000-0"

// 指定最大长度
await redis.xadd("mystream", "MAXLEN", 1000, "*", { data: "value" })

// ==================== 消费者 ====================

// 创建消费者组
await redis.xgroup("CREATE", "mystream", "mygroup", "$", "MKSTREAM")

// 读取消息
const messages = await redis.xreadgroup(
  "GROUP", "mygroup", "consumer1",
  "COUNT", 10,
  "BLOCK", 5000,  // 阻塞 5 秒
  "STREAMS", "mystream", ">"
)

// 确认消息
await redis.xack("mystream", "mygroup", "1704067200000-0")
```

---

## 实际应用示例

### 1. 缓存封装

```javascript
class CacheService {
  constructor(redis) {
    this.redis = redis
    this.defaultTTL = 3600  // 默认 1 小时
  }

  /**
   * 获取缓存，不存在时从数据源加载
   */
  async get(key, loader, ttl = this.defaultTTL) {
    // 先从缓存获取
    const cached = await this.redis.get(key)
    if (cached !== null) {
      return JSON.parse(cached)
    }

    // 缓存不存在，从数据源加载
    const data = await loader()

    // 写入缓存
    if (data !== null && data !== undefined) {
      await this.redis.set(key, JSON.stringify(data), "EX", ttl)
    }

    return data
  }

  /**
   * 设置缓存
   */
  async set(key, value, ttl = this.defaultTTL) {
    await this.redis.set(key, JSON.stringify(value), "EX", ttl)
  }

  /**
   * 删除缓存
   */
  async del(key) {
    await this.redis.del(key)
  }

  /**
   * 批量删除（模糊匹配）
   */
  async delPattern(pattern) {
    const keys = []
    let cursor = "0"

    do {
      const [nextCursor, matched] = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100
      )
      cursor = nextCursor
      keys.push(...matched)
    } while (cursor !== "0")

    if (keys.length > 0) {
      await this.redis.del(...keys)
    }

    return keys.length
  }
}

// 使用示例
const cache = new CacheService(redis)

const user = await cache.get(
  "user:1001",
  async () => {
    // 从数据库加载
    return await db.getUser(1001)
  },
  7200  // 2 小时过期
)
```

### 2. 分布式锁

```javascript
class DistributedLock {
  constructor(redis) {
    this.redis = redis
    this.unlockScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `
  }

  /**
   * 获取锁
   * @param {string} key 锁的 key
   * @param {number} ttl 锁的过期时间（毫秒）
   * @param {number} retryTimes 重试次数
   * @param {number} retryDelay 重试间隔（毫秒）
   */
  async acquire(key, ttl = 10000, retryTimes = 3, retryDelay = 100) {
    const value = `${Date.now()}-${Math.random()}`

    for (let i = 0; i < retryTimes; i++) {
      const result = await this.redis.set(key, value, "PX", ttl, "NX")
      if (result === "OK") {
        return value  // 返回锁的标识，用于释放
      }

      if (i < retryTimes - 1) {
        await this.sleep(retryDelay)
      }
    }

    return null  // 获取锁失败
  }

  /**
   * 释放锁
   */
  async release(key, value) {
    return await this.redis.eval(this.unlockScript, 1, key, value)
  }

  /**
   * 自动续期
   */
  async renew(key, value, ttl) {
    const currentValue = await this.redis.get(key)
    if (currentValue === value) {
      await this.redis.pexpire(key, ttl)
      return true
    }
    return false
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 使用示例
const lock = new DistributedLock(redis)

async function withLock(key, callback, ttl = 10000) {
  const lockValue = await lock.acquire(key, ttl)

  if (!lockValue) {
    throw new Error("获取锁失败")
  }

  try {
    return await callback()
  } finally {
    await lock.release(key, lockValue)
  }
}

// 使用
await withLock("order:123", async () => {
  // 执行关键任务
  await processOrder(123)
}, 30000)
```

### 3. 速率限制器

```javascript
class RateLimiter {
  constructor(redis) {
    this.redis = redis
  }

  /**
   * 固定窗口限流
   */
  async fixedWindow(key, limit, windowSeconds) {
    const current = await this.redis.incr(key)

    if (current === 1) {
      await this.redis.expire(key, windowSeconds)
    }

    const ttl = await this.redis.ttl(key)

    return {
      allowed: current <= limit,
      current,
      limit,
      remaining: Math.max(0, limit - current),
      resetIn: ttl
    }
  }

  /**
   * 滑动窗口限流（更精确）
   */
  async slidingWindow(key, limit, windowMs) {
    const now = Date.now()
    const windowStart = now - windowMs

    const luaScript = `
      local key = KEYS[1]
      local limit = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local windowStart = now - window

      redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
      local count = redis.call('ZCARD', key)

      if count < limit then
        redis.call('ZADD', key, now, now .. '-' .. math.random())
        redis.call('PEXPIRE', key, window)
        return {1, count + 1, limit - count - 1}
      else
        return {0, count, 0}
      end
    `

    const result = await this.redis.eval(luaScript, 1, key, limit, windowMs, now)

    return {
      allowed: result[0] === 1,
      current: result[1],
      remaining: result[2]
    }
  }

  /**
   * 令牌桶限流
   */
  async tokenBucket(key, capacity, rate) {
    const luaScript = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local rate = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])

      local lastRefill = tonumber(redis.call('HGET', key, 'lastRefill') or now)
      local tokens = tonumber(redis.call('HGET', key, 'tokens') or capacity)

      local elapsed = math.max(0, now - lastRefill)
      local refill = math.floor(elapsed * rate / 1000)
      tokens = math.min(capacity, tokens + refill)

      local allowed = 0
      if tokens >= 1 then
        tokens = tokens - 1
        allowed = 1
      end

      redis.call('HSET', key, 'tokens', tokens)
      redis.call('HSET', key, 'lastRefill', now)
      redis.call('PEXPIRE', key, math.ceil(capacity / rate * 1000) + 1000)

      return {allowed, tokens}
    `

    const result = await this.redis.eval(luaScript, 1, key, capacity, rate, Date.now())

    return {
      allowed: result[0] === 1,
      remaining: result[1]
    }
  }
}

// Express 中使用
const limiter = new RateLimiter(redis)

app.get("/api/data", async (req, res) => {
  const key = `rate-limit:${req.ip}`

  const result = await limiter.slidingWindow(key, 100, 60000)  // 60秒内最多100次

  res.set({
    "X-RateLimit-Limit": 100,
    "X-RateLimit-Remaining": result.remaining,
    "X-RateLimit-Reset": 60
  })

  if (!result.allowed) {
    return res.status(429).json({ error: "Too Many Requests" })
  }

  // 处理请求
  res.json({ data: "success" })
})
```

### 4. 会话存储

```javascript
const session = require("express-session")
const RedisStore = require("connect-redis").default

// 配置会话存储
app.use(
  session({
    store: new RedisStore({
      client: redis,
      prefix: "sess:",
      ttl: 86400  // 1 天
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 86400000  // 1 天
    }
  })
)
```

### 5. 消息队列

```javascript
class MessageQueue {
  constructor(redis, queueName) {
    this.redis = redis
    this.queueName = queueName
  }

  // 生产者：添加任务
  async enqueue(data) {
    const task = JSON.stringify({
      data,
      createdAt: Date.now()
    })
    await this.redis.rpush(this.queueName, task)
  }

  // 消费者：获取任务（阻塞）
  async dequeue(timeout = 0) {
    const result = await this.redis.blpop(this.queueName, timeout)
    if (result) {
      return JSON.parse(result[1])
    }
    return null
  }

  // 延迟队列
  async enqueueDelayed(data, delayMs) {
    const executeAt = Date.now() + delayMs
    await this.redis.zadd(
      `${this.queueName}:delayed`,
      executeAt,
      JSON.stringify({ data, executeAt })
    )
  }

  // 处理延迟任务
  async processDelayed(callback) {
    const now = Date.now()
    const tasks = await this.redis.zrangebyscore(
      `${this.queueName}:delayed`,
      0,
      now
    )

    for (const task of tasks) {
      const parsed = JSON.parse(task)
      await callback(parsed.data)
      await this.redis.zrem(`${this.queueName}:delayed`, task)
    }
  }
}

// 使用示例
const queue = new MessageQueue(redis, "tasks")

// 生产者
await queue.enqueue({ type: "email", to: "user@example.com" })
await queue.enqueueDelayed({ type: "reminder" }, 60000)  // 1 分钟后

// 消费者
async function worker() {
  while (true) {
    const task = await queue.dequeue(5)  // 阻塞 5 秒
    if (task) {
      await processTask(task)
    }
  }
}
```

---

## 相关文档

- [05-Redis-1-基础入门](05-Redis-1-基础入门.md) - 系统架构、核心特性、数据类型操作
- [Redis 进阶特性](06-Redis-2-进阶特性.md) - 过期策略、事务、发布订阅、持久化、高可用架构
- [08-Redis-4-最佳实践](08-Redis-4-最佳实践.md) - 性能优化、安全配置、常见问题解答

## 参考资料

- [ioredis GitHub](https://github.com/luin/ioredis)
- [node-redis GitHub](https://github.com/redis/node-redis)
- [connect-redis GitHub](https://github.com/tj/connect-redis)

---

## 附：Node.js 原生能力与 Serverless Redis

### 原生 fetch 调用 Redis REST API

Upstash 等 Serverless Redis 提供了 REST API，可使用原生 fetch 访问：

```javascript
// 使用 Upstash Redis REST API（无需 ioredis）
const response = await fetch('https://your-redis.upstash.io/get/key', {
  headers: { Authorization: `Bearer ${process.env.UPSTASH_TOKEN}` }
})
const { result } = await response.json()

// SET 操作
await fetch('https://your-redis.upstash.io/set/key/value', {
  headers: { Authorization: `Bearer ${process.env.UPSTASH_TOKEN}` }
})
```

### --env-file 管理 Redis 配置

```bash
# 传统方式（需要 dotenv）
node app.js

# Node.js 22+ 原生方式
node --env-file=.env.production app.js
```

```env
# .env.production
REDIS_HOST=redis.production.internal
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_DB=0
```
