---
title: "Kafka 流式处理与事件驱动架构"
description: "Kafka 流式处理与事件驱动架构：Kafka Streams API 实战、KTable/窗口/聚合、事件溯源与 CQRS、CDC 变更数据捕获、事件驱动微服务设计"
keywords: [Kafka, Kafka Streams, 流式处理, 事件驱动, 事件溯源, CDC]
category: "Java"
tags: [Java, Kafka, 流式处理, 事件驱动]
---

# Kafka 流式处理与事件驱动架构

Kafka 不仅是消息队列，更是**分布式流处理平台**。本文讲解 Kafka 的核心流处理能力（Kafka Streams）、**事件驱动架构**的落地模式，以及 **CDC（变更数据捕获）** 与事件溯源，帮助你从"用 Kafka 传消息"进阶到"用 Kafka 做流式处理与事件驱动"。

> 基础概念、分区、副本、顺序消费见「[Kafka 分区副本与顺序消费](03-Kafka分区副本与顺序消费.md)」。

## 一、Kafka 双支柱：消息队列 + 流处理

Kafka 的设计源于 LinkedIn 的日志处理需求，本质是一个**高吞吐、可持久化、可回溯**的分布式日志。它有两个核心能力：

1. **消息队列（Message Broker）**：生产/消费解耦，削峰填谷。
2. **流处理（Stream Processing）**：对数据流做实时转换、聚合、连接。

**关键特性（区别于普通 MQ）**：
- **可回溯**：消息持久化在磁盘，可重复消费（按 offset 回溯）。
- **顺序性**：同一分区内消息有序。
- **时间维度**：消息带时间戳，支持窗口计算。

## 二、Kafka Streams：流处理 API

Kafka Streams 是 Kafka 官方的**轻量流处理库**，无需独立集群，可作为普通 Java 应用运行，利用 Kafka 做存储与容错。

### 2.1 核心概念

- **KStream**：**记录流**（每条记录是一条数据），可无限增长，不合并。
- **KTable**：**变化表**（key→value 的最新状态），对同一 key 只保留最新值。
- **KGroupedStream**：分组后的流（按 key 分组），用于聚合。
- **窗口（Window）**：把无限流按时间切分为有界窗口，进行窗口聚合（滚动/滑动/会话窗口）。

### 2.2 流式 WordCount 示例

```java
// 构建流处理拓扑
StreamsBuilder builder = new StreamsBuilder();

// 从 topic "text-lines" 读取记录流
KStream<String, String> textLines = builder.stream("text-lines");

// 1. flatMapValues: 按空格拆分单词
// 2. groupBy: 按单词分组
// 3. count: 统计每个单词出现次数
KTable<String, Long> wordCounts = textLines
    .flatMapValues(line -> Arrays.asList(line.toLowerCase().split("\\W+")))
    .groupBy((key, word) -> word)
    .count();

// 输出到 topic "word-count"
wordCounts.toStream().to("word-count", Produced.with(Serdes.String(), Serdes.Long()));

// 创建 KafkaStreams 并启动
KafkaStreams streams = new KafkaStreams(builder.build(), streamConfig);
streams.start();
```

**运行方式**：这是一个**普通 Java 应用**，配置 `bootstrap.servers`、`application.id`（用于容错和状态存储），即可本地运行，无需 Kafka Streams 集群。

**容错与状态**：Kafka Streams 通过**状态存储（State Store）**保存中间状态，状态默认存 RocksDB 并同步到 Kafka 内部 topic（`*-changelog`），节点故障时自动恢复，**实现了有状态流处理的容错**。

### 2.3 窗口聚合（以 5 分钟滚动窗口为例）

```java
KTable<Windowed<String>, Long> windowedCounts = textLines
    .flatMapValues(line -> Arrays.asList(line.split("\\W+")))
    .groupBy((k, w) -> w)
    .windowedBy(TimeWindows.of(Duration.ofMinutes(5)))  // 5分钟窗口
    .count();
```

## 三、事件驱动架构（Event-Driven Architecture）

### 3.1 什么是事件驱动

传统**请求/响应**架构（同步调用）：服务 A 直接调用服务 B，强耦合、易阻塞。

**事件驱动架构**：服务之间通过**事件（Event）**解耦——生产者发布事件到 Kafka，消费者异步订阅处理，两者**互不感知**。

```text
同步调用: A ----请求----> B（A 等待 B 响应，强耦合）
事件驱动: A --发布事件--> Kafka --订阅--> B（A 立即返回，B 异步处理）
```

### 3.2 事件驱动的优势

- **解耦**：服务之间不直接依赖，可独立演进、独立部署。
- **异步与削峰**：突发流量通过消息缓冲，消费者按能力消费。
- **可扩展**：消费端可水平扩容。
- **可追溯**：事件持久化在 Kafka，可回溯、可重放。

### 3.3 常见事件驱动模式

| 模式 | 说明 | 适用 |
|------|------|------|
| **事件通知** | 发事件通知，不传完整数据 | 通知、触发下游 |
| **事件携带状态传递（Event Carrying State Transfer）** | 事件携带完整数据，消费端无需回查 | 解耦查询 |
| **事件溯源（Event Sourcing）** | 以事件序列作为事实来源，状态可由事件重放得出 | 审计、可回溯系统 |
| **CQRS（命令查询职责分离）** | 写模型 + 读模型分离，事件驱动读模型更新 | 高并发读写分离 |

### 3.4 事件溯源（Event Sourcing）示例

**核心思想**：不保存"当前状态"，而是保存**产生状态的所有事件**。当前状态 = 所有事件重放的结果。

```text
订单状态 = 由以下事件重放得出：
  OrderCreated(2026-08-01) -> OrderPaid(2026-08-02) -> OrderShipped(2026-08-03)

查询当前状态: 依次重放这3个事件 -> 得到"已发货"状态
```

**优点**：
- **完整审计**：所有变更都有事件记录，可追溯任何时刻的状态。
- **可回溯重建**：修复 bug 后可从事件重新计算状态。
- **时间旅行**：可回到任意历史点。

**缺点**：
- 事件存储膨胀。
- 查询当前状态需重放，常配合 **CQRS**（用读模型存当前状态，事件更新读模型）。

## 四、CDC（变更数据捕获）

**CDC（Change Data Capture，变更数据捕获）**：捕获数据库的数据变更（插入/更新/删除），以事件形式发布到 Kafka，供下游消费。

### 4.1 实现方式

| 方式 | 说明 | 代表 |
|------|------|------|
| **基于 binlog** | 监听 MySQL binlog，解析变更 | Debezium、Canal、Maxwell |
| **基于查询轮询** | 定时查询变化字段 | 简单但滞后 |
| **基于触发器** | 数据库触发器写变更表 | 侵入数据库 |

### 4.2 Debezium + Kafka 示例

Debezium 监听 MySQL binlog，把每行变更转成事件发布到 Kafka topic：

```text
MySQL: UPDATE user SET name='Tom' WHERE id=1
   ||
Debezium 捕获 binlog
   ||
Kafka topic "user_change": {op:"u", before:{id:1,name:"Old"}, after:{id:1,name:"Tom"}}
```

**CDC 的典型用途**：
- **数据同步**：数据库 → 搜索/缓存/数仓/其他存储。
- **事件驱动**：数据库变更驱动下游业务（如订单变更触发通知）。
- **双写解耦**：避免应用双写（写库 + 写缓存），用 CDC 单向同步。

### 4.3 CDC 的优点

- **无侵入业务代码**：监听 binlog，业务无感知。
- **实时性高**：binlog 实时解析。
- **可靠**：基于 binlog 的完整记录，可重放。

## 五、事件驱动架构落地要点

1. **事件设计**：事件要有**唯一 ID**、**时间戳**、**schema**（版本化），便于演进与追踪。
2. **幂等消费**：Kafka 可能重复投递（至少一次语义），消费者必须**幂等**（详见「MQ 幂等重试与一致性排障」）。
3. **事件顺序**：同一实体的相关事件要保证顺序（按 key 分区，同一 key 进同一分区）。
4. **最终一致**：事件驱动是**最终一致**，不适合强一致的实时查询场景。
5. **重放与补偿**：利用 Kafka 可回溯，实现事件重放和失败补偿。
6. **监控与轨迹**：事件全链路要有 traceId 关联，便于排障。

## 小结

- **Kafka Streams** 是官方的轻量流处理库，支持 `KStream`/`KTable`、分组聚合、窗口计算，可做实时流处理。
- **事件驱动架构** 通过事件解耦服务，支持异步、削峰、可追溯。
- **事件溯源 + CQRS** 以事件为事实来源，支持完整审计与状态重建。
- **CDC（Debezium/Canal）** 监听 binlog 把数据库变更实时发布到 Kafka，实现数据同步与事件驱动。
- 落地时要保证**幂等消费、事件顺序、schema 版本化、可重放**。

## 版本差异(旧版 → 当前)

| 组件 | 旧版（本文编写时） | 当前 |
|------|-------------------|------|
| RabbitMQ | 3.8/3.9 | 3.13/4.x（quorum queue 为默认推荐） |
| Kafka | 2.x/3.0 | 3.7+/4.x（KRaft 模式取代 ZooKeeper） |
| RocketMQ | 4.x | 5.x（gRPC 通信、简化运维） |
| Java 版本 | JDK 8 | JDK 17+（Kafka 3.7+ 客户端要求） |

> 本文讲解的消息可靠性设计（投递确认、死信、幂等、顺序）原理不变；注意各中间件版本升级后的配置差异，如 Kafka 的 KRaft 模式、RabbitMQ 的 quorum queue。
