---
title: Java 客户端助手
description: Java 生态 Redis 客户端选型：Jedis 与 Lettuce 对比、连接池与 Pipeline/事务用法、哨兵与集群模式接入、Spring Data Redis 集成
keywords: [Redis, Java, Jedis, Lettuce, Spring Data Redis, 连接池, 客户端]
category: Redis
tags: [Redis, Java, 客户端, Jedis, Lettuce]
---

# Java 客户端助手

## 0. 引言

Java 是 Redis 使用量最大的语言生态，主流客户端三选一：**Jedis**（直连、简单）、**Lettuce**（异步/响应式、Spring 默认）、Redisson（分布式对象/锁）。本章给出选型对比、连接管理（池）、Pipeline/事务的正确姿势，以及哨兵/集群模式的接入要点。

## 1. 选型对比

| 维度 | Jedis | Lettuce | Redisson |
|------|-------|---------|----------|
| 模式 | 同步阻塞 | 同步/异步/响应式 | 同步/异步/响应式 |
| 线程安全 | 非线程安全（需池） | 线程安全（共享连接） | 线程安全 |
| 连接模型 | 每线程一条连接 | 单连接多路复用（Netty） | 单连接多路复用 |
| 高级特性 | 少 | Pipeline/事务完备 | 分布式锁、限流器、延迟队列等对象化封装 |
| Spring Boot 默认 | 否 | **是**（Spring Data Redis 默认） | 可选 |
| 适用 | 简单场景、低并发 | 高并发、异步需求 | 需要分布式组件（锁/布隆过滤器） |

**选型建议**：

- 新项目默认 **Lettuce**（Spring 生态默认，连接复用，资源占用低）；
- 需要分布式锁/限流器等**现成组件**用 Redisson；
- 追求极致简单、连接数可控的场景可用 Jedis（配连接池）。

## 2. 连接管理

### 2.1 Lettuce 连接配置

```java
// Lettuce：单连接多路复用，自动重连
RedisClient client = RedisClient.create(
    RedisURI.builder()
        .withHost("127.0.0.1").withPort(6379)
        .withPassword("pass".toCharArray())
        .withDatabase(0)
        .build());
StatefulRedisConnection<String, String> conn = client.connect();
RedisCommands<String, String> sync = conn.sync();        // 同步
RedisAsyncCommands<String, String> async = conn.async(); // 异步
```

### 2.2 Jedis 连接池（JedisPool）

```java
// Jedis 非线程安全：必须用连接池
JedisPoolConfig config = new JedisPoolConfig();
config.setMaxTotal(50);            // 最大连接数
config.setMaxIdle(20);
config.setMinIdle(5);
config.setTestOnBorrow(true);      // 借用时校验（防死连接）
config.setTestWhileIdle(true);

try (JedisPool pool = new JedisPool(config, "127.0.0.1", 6379, 2000, "pass")) {
    try (Jedis jedis = pool.getResource()) {
        jedis.set("k", "v");
    }   // 归还连接
}
```

**池参数核心**：`maxTotal` 按"QPS × 命令耗时"估算（如 10000 QPS × 1ms = 10 条并发连接）；`testOnBorrow` 在 Redis 重启场景下防止拿到失效连接。

## 3. 核心用法模式

### 3.1 Pipeline（批量提速）

```java
// Jedis Pipeline：一次 RTT 批量执行
Jedis jedis = pool.getResource();
Pipeline pipe = jedis.pipelined();
for (int i = 0; i < 1000; i++) {
    pipe.set("key:" + i, String.valueOf(i));
}
List<Object> results = pipe.syncAndReturnAll();
```

```java
// Lettuce Pipeline（异步批量）
RedisAsyncCommands<String, String> async = conn.async();
List<RedisFuture<String>> futures = new ArrayList<>();
for (int i = 0; i < 1000; i++) {
    futures.add(async.set("key:" + i, String.valueOf(i)));
}
// 一次性等待全部完成
LettuceFutures.awaitAll(10, TimeUnit.SECONDS, futures.toArray(new RedisFuture[0]));
```

### 3.2 Lua 脚本（原子操作）

```java
// Jedis：分布式锁安全释放
String script = "if redis.call('get', KEYS[1]) == ARGV[1] then "
              + "return redis.call('del', KEYS[1]) else return 0 end";
Object res = jedis.eval(script, 1, "lock:order", token);
```

- 脚本内容用 `SCRIPT LOAD` 预加载，执行用 `EVALSHA`（省带宽）；
- 集群模式下脚本内 key 必须同槽（hash tag）。

### 3.3 事务

```java
// Jedis 事务
Transaction tx = jedis.multi();
tx.set("a", "1");
tx.incr("counter");
List<Object> results = tx.exec();
```

```java
// Lettuce 事务
async.multi();
async.set("a", "1");
async.incr("counter");
RedisFuture<List<Object>> future = async.exec();
```

## 4. 哨兵与集群接入

### 4.1 Sentinel 模式

```java
// Lettuce 哨兵：自动发现与故障转移
RedisURI uri = RedisURI.builder()
    .withSentinel("127.0.0.1", 26379)
    .withSentinel("127.0.0.1", 26380)
    .withSentinelMasterId("mymaster")
    .withPassword("pass".toCharArray())
    .build();
RedisClient client = RedisClient.create(uri);
```

```java
// Jedis 哨兵
Set<String> sentinels = Set.of("127.0.0.1:26379", "127.0.0.1:26380");
JedisSentinelPool pool = new JedisSentinelPool("mymaster", sentinels);
```

### 4.2 Cluster 模式

```java
// Lettuce 集群：自动槽位路由与 MOVED 处理
RedisClusterClient clusterClient = RedisClusterClient.create(
    RedisURI.create("redis://127.0.0.1:7000"));
StatefulRedisClusterConnection<String, String> conn = clusterClient.connect();
RedisAdvancedClusterCommands<String, String> sync = conn.sync();
sync.set("user:{10001}:name", "jack");   // 同 tag 多 key 操作 OK
```

```java
// Jedis 集群
Set<HostAndPort> nodes = Set.of(new HostAndPort("127.0.0.1", 7000));
JedisCluster cluster = new JedisCluster(nodes);
```

**集群使用要点**：

- 连接串只需给**一个节点**（自动发现全拓扑）；
- 多 key 命令必须 hash tag 同槽；
- 客户端负责槽位缓存与重定向，版本要新（老版 Jedis 对 ASK 处理有缺陷）。

## 5. Spring Data Redis 集成

```yaml
# application.yml
spring:
  data:
    redis:
      host: 127.0.0.1
      port: 6379
      password: pass
      lettuce:
        pool:
          max-active: 50
          max-idle: 20
          min-idle: 5
```

```java
@Configuration
public class RedisConfig {
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);
        // JSON 序列化 value，String 序列化 key
        GenericJackson2JsonRedisSerializer serializer = new GenericJackson2JsonRedisSerializer();
        template.setKeySerializer(RedisSerializer.string());
        template.setValueSerializer(serializer);
        template.setHashKeySerializer(RedisSerializer.string());
        template.setHashValueSerializer(serializer);
        return template;
    }
}
```

**注意**：Spring Data Redis 默认用 JDK 序列化（可读性差、体积大），生产必须换 JSON；`@Cacheable` 缓存注解的 key 生成与 TTL 需自定义 `RedisCacheManager`。

## 6. 常见坑

1. **Jedis 未用池**：每条命令新建连接，性能灾难；
2. **Lettuce 共享连接的坑**：阻塞命令（如 `BRPOP`）会占用整个连接，异步场景注意 `BLPOP` 用超时版本；
3. **序列化不一致**：Redis Desktop 里看到乱码 `\xac\xed` = JDK 序列化，换 JSON；
4. **集群下用单机客户端**：MGET 跨槽直接 CROSSSLOT 报错；
5. **忽略连接池监控**：`pool.getNumActive()` 接近 maxTotal 时先扩容再排查慢命令。

## 7. 小结

- 默认 Lettuce（Spring 生态）+ 场景组件用 Redisson；Jedis 用于简单直连；
- 连接管理：Lettuce 多路复用单连接，Jedis 必须连接池；
- 批量用 Pipeline、原子操作用 Lua、锁用 Redisson 现成实现；
- 哨兵/集群接入客户端已封装，注意 hash tag 与版本要求。

下一章讲解 Lua 脚本与 Redis Functions：服务端原子编程的进阶。