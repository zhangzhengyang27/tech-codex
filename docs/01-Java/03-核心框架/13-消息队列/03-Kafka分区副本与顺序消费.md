---
title: "Kafka分区副本与顺序消费"
description: "Kafka 更偏向高吞吐、可扩展的日志流平台。在埋点、日志采集、行为流、异步事件总线这类场景里很常见。和 RabbitMQ 相比,Kafka 更强调:"
keywords: [Kafka, 分区, 副本, ISR, 顺序消费, Rebalance]
category: "Java"
tags: [Java, 消息队列]
---


# Kafka 分区副本与顺序消费

## 概念与背景

Kafka 更偏向高吞吐、可扩展的日志流平台。在埋点、日志采集、行为流、异步事件总线这类场景里很常见。和 RabbitMQ 相比,Kafka 更强调:

- **分区带来的并行吞吐**: 单个 Topic 可拆分为多个分区并行处理,理论上吞吐量无上限
- **副本带来的可用性**: 通过多副本机制保证数据不丢失,支持故障自动切换
- **消费者组带来的横向扩展**: 消费能力可随消费者数量线性扩展

真正难点在于:你一旦追求吞吐,就必须接受"分区顺序而不是全局顺序",并理解 offset、rebalance、副本同步这些机制。

## 一、Kafka 分区机制详解

### 1.1 分区的核心概念

**分区(Partition)** 是 Kafka 实现高吞吐的核心设计:

```
Topic: order-events
├── Partition 0: [0, 1, 2, 3, ...]  ← 有序消息序列
├── Partition 1: [0, 1, 2, 3, ...]  ← 有序消息序列
├── Partition 2: [0, 1, 2, 3, ...]  ← 有序消息序列
└── Partition 3: [0, 1, 2, 3, ...]  ← 有序消息序列
```

**每个分区是一个有序的消息队列**:
- 每条消息在分区内有一个唯一的 offset(偏移量)
- 消费者按 offset 顺序读取消息
- 分区内的消息顺序写入磁盘,利用顺序 IO 性能

### 1.2 分区的作用

#### 1. 提升吞吐量

**生产端并发写入**:
```java
// 多个生产者线程可以并发写入不同分区
producer.send(new ProducerRecord<>("topic", 0, key, value)); // 分区0
producer.send(new ProducerRecord<>("topic", 1, key, value)); // 分区1
producer.send(new ProducerRecord<>("topic", 2, key, value)); // 分区2
```

**消费端并行处理**:
- 每个分区可以被消费者组中的一个消费者独立处理
- 分区数 = 最大并行度(单个消费者组内)
- 例如:Topic 有 10 个分区,消费者组最多可以有 10 个消费者实例并行消费

#### 2. 提升可用性

**分区级别的故障隔离**:
- 每个分区有自己的 Leader 和 Follower
- 某个分区的 Leader 故障,不影响其他分区
- 不同分区可以分布在不同 Broker 上,实现负载均衡

#### 3. 支持水平扩展

**增加分区提升容量**:
```bash
# 动态增加分区数
kafka-topics.sh --alter --topic order-events --partitions 10 --bootstrap-server localhost:9092
```

**注意事项**:
- 分区数只能增加,不能减少
- 增加 partition 后,相同 key 的消息可能被路由到不同分区(破坏顺序性)
- 生产环境建议提前规划好分区数

### 1.3 分区策略详解

Kafka 生产者如何决定消息发送到哪个分区?

#### 1. 指定分区

```java
// 直接指定分区号
ProducerRecord<String, String> record = 
    new ProducerRecord<>("order-events", 2, orderId, payload);
producer.send(record);
```

**适用场景**: 需要精确控制消息分布,例如特殊的负载均衡策略

#### 2. Key 分区(默认策略)

```java
// 有 Key: hash(key) % 分区数
ProducerRecord<String, String> record = 
    new ProducerRecord<>("order-events", orderId, payload);
producer.send(record);

// 没有 Key: 轮询或粘性分区
ProducerRecord<String, String> record = 
    new ProducerRecord<>("order-events", payload);
producer.send(record);
```

**Key 分区原理**:
```java
// Kafka 默认分区器实现
public int partition(String topic, Object key, byte[] keyBytes, 
                     Object value, byte[] valueBytes, Cluster cluster) {
    List<PartitionInfo> partitions = cluster.partitionsForTopic(topic);
    int numPartitions = partitions.size();
    
    if (keyBytes == null) {
        // 无 Key: 粘性分区器(Sticky Partitioner, Kafka 2.4+)
        return nextStickyPartition(topic, numPartitions);
    } else {
        // 有 Key: hash(key) % 分区数
        return Utils.toPositive(Utils.murmur2(keyBytes)) % numPartitions;
    }
}
```

**为什么用 MurmurHash?**
- 分布均匀,减少数据倾斜
- 计算速度快
- 同一个 key 始终映射到同一分区

#### 3. 自定义分区器

```java
public class OrderPartitioner implements Partitioner {
    @Override
    public int partition(String topic, Object key, byte[] keyBytes,
                         Object value, byte[] valueBytes, Cluster cluster) {
        // 按订单 ID 前缀分区
        String orderId = (String) key;
        String prefix = orderId.substring(0, 2);
        
        // VIP 订单单独分区
        if (prefix.equals("VIP")) {
            return 0; // VIP 分区
        }
        
        // 普通订单按区域分区
        int regionCode = getRegionCode(prefix);
        int partitionCount = cluster.partitionCountForTopic(topic);
        return (regionCode % (partitionCount - 1)) + 1;
    }
    
    @Override
    public void configure(Map<String, ?> configs) {}
    
    @Override
    public void close() {}
}
```

**配置自定义分区器**:
```java
Properties props = new Properties();
props.put(ProducerConfig.PARTITIONER_CLASS_CONFIG, OrderPartitioner.class.getName());
KafkaProducer<String, String> producer = new KafkaProducer<>(props);
```

#### 4. 粘性分区器(Sticky Partitioner)

**Kafka 2.4 引入的新策略**,用于无 Key 场景:

**原理**:
- 生产者会"粘"在一个分区上一段时间
- 批量发送满后或超时后才切换到下一个分区
- 提高批量发送效率,减少请求次数

**优势**:
```
传统轮询:  每条消息轮询不同分区 → 小批量 → 低吞吐
粘性分区:  批量消息发送同一分区 → 大批量 → 高吞吐
```

**配置**:
```java
props.put(ProducerConfig.PARTITIONER_CLASS_CONFIG, 
          "org.apache.kafka.clients.producer.internals.StickyPartitioner");
```

### 1.4 分区数设计原则

**如何确定合理的分区数?**

#### 1. 根据吞吐量计算

```
分区数 = 目标吞吐量 ÷ 单分区吞吐量

示例:
- 目标吞吐量: 100 MB/s
- 单分区生产吞吐: 20 MB/s
- 单分区消费吞吐: 15 MB/s
- 需要: max(100/20, 100/15) ≈ 7 个分区
```

#### 2. 根据并行度需求

```
分区数 ≥ 消费者实例数

示例:
- 消费者组有 20 个实例
- 至少需要 20 个分区才能充分利用所有消费者
```

#### 3. 综合考虑因素

| 因素 | 分区数少 | 分区数多 |
|------|---------|---------|
| **吞吐量** | 受限 | 高 |
| **顺序性保证** | 容易(分区少,冲突少) | 需要 Key 分区 |
| **资源消耗** | 低(Broker 文件句柄少) | 高(每个分区多个文件) |
| **Rebalance 时间** | 快 | 慢 |
| **可用性** | 低(单点故障影响大) | 高(故障影响范围小) |

**生产经验**:
- 小规模集群: 3-10 个分区
- 中等规模: 10-50 个分区
- 大规模: 100-1000 个分区(需评估 Broker 资源)

## 二、副本同步原理详解

### 2.1 副本的核心概念

Kafka 通过**副本机制**保证数据高可用:

```
Partition 0
├── Leader (Broker 1)   ← 处理所有读写请求
├── Follower (Broker 2) ← 从 Leader 同步数据
└── Follower (Broker 3) ← 从 Leader 同步数据
```

**三种副本角色**:

1. **Leader(领导者)**
   - 处理所有生产者和消费者请求
   - 负责维护和更新 ISR 列表
   - 每个分区只有一个 Leader

2. **Follower(追随者)**
   - 被动从 Leader 同步数据
   - 不处理客户端请求(除非特殊配置)
   - 提供数据冗余

3. **ISR(In-Sync Replicas)**
   - 与 Leader 保持同步的副本集合
   - ISR 包含 Leader 自己
   - 只有 ISR 中的副本才能被选为新 Leader

### 2.2 副本同步流程详解

#### 1. 同步机制核心概念

**LEO(Log End Offset)**:
- 日志末端偏移量
- 表示副本当前写到的最新位置
- Leader 和每个 Follower 都有自己的 LEO

**HW(High Watermark)**:
- 高水位线
- 表示已提交(commit)的消息位置
- HW 之前的消息对所有 ISR 副本可见,可以安全消费
- HW = min(所有 ISR 副本的 LEO)

```
Leader:
  LEO = 10  (最新写入位置)
  HW  = 8   (已提交位置)

Follower 1:
  LEO = 9   (同步到位置 9)
  HW  = 8   (跟随 Leader 的 HW)

Follower 2:
  LEO = 8   (同步到位置 8)
  HW  = 8

最终 HW = min(10, 9, 8) = 8
```

#### 2. 同步流程详细步骤

**生产者写入流程**:

```
Step 1: 生产者发送消息到 Leader
        Producer → Leader Broker

Step 2: Leader 写入本地日志
        Leader LEO: 9 → 10

Step 3: Follower 拉取数据(Fetch 请求)
        Follower → Leader: "我需要 offset 9 之后的数据"

Step 4: Leader 返回数据并携带 HW
        Leader → Follower: 数据 + HW=8

Step 5: Follower 写入本地日志
        Follower LEO: 9 → 10

Step 6: Follower 再次拉取,Leader 更新 HW
        Leader 收到 Follower 的 LEO=10,更新 HW=min(10,10)=10

Step 7: 后续 Fetch 请求中,Leader 告知 Follower 新 HW
        Leader → Follower: HW=10
        Follower 更新自己的 HW=10
```

**关键点**:
- Follower 是主动拉取(Pull)模式,不是 Leader 推送
- HW 的更新有延迟,不是实时的
- 消费者只能读到 HW 之前的消息(保证一致性)

#### 3. ISR 动态维护

**ISR 收缩**:
```
条件: Follower 长时间未同步
      replica.lag.time.max.ms (默认 30s)

动作: Leader 将该 Follower 移出 ISR
      ISR: [Leader, Follower1, Follower2] 
      → ISR: [Leader, Follower1]
```

**ISR 扩张**:
```
条件: 被移出的 Follower 追上 Leader
      Follower LEO 接近 Leader LEO

动作: Leader 将其重新加入 ISR
      ISR: [Leader, Follower1]
      → ISR: [Leader, Follower1, Follower2]
```

**配置参数**:
```properties
# 副本同步超时时间(超过此时间未同步则移出 ISR)
replica.lag.time.max.ms=30000

# 最小 ISR 副本数(少于此值不允许生产)
min.insync.replicas=2
```

### 2.3 ACKS 确认机制

生产者的 `acks` 参数控制写入确认级别:

#### 1. acks=0(不确认)

```java
props.put(ProducerConfig.ACKS_CONFIG, "0");
```

**流程**:
- 生产者发送后立即返回成功
- 不等待任何副本确认
- Leader 可能还没写入就返回

**特点**:
- 吞吐量最高,延迟最低
- 可能丢消息(Leader 写入失败、Leader 故障)
- 适用场景:日志采集、监控指标等可丢失场景

#### 2. acks=1(Leader 确认)

```java
props.put(ProducerConfig.ACKS_CONFIG, "1");
```

**流程**:
- Leader 写入成功后立即返回
- 不等待 Follower 同步

**特点**:
- 吞吐量中等
- 可能丢消息(Leader 写入成功但未同步,Leader 故障)
- 适用场景:一般业务消息

**风险场景**:
```
1. Leader 写入成功,返回 ack
2. Follower 还未同步
3. Leader 故障
4. 新 Leader 从 Follower 选出(数据不完整)
→ 消息丢失
```

#### 3. acks=all 或 acks=-1(所有 ISR 确认)

```java
props.put(ProducerConfig.ACKS_CONFIG, "all");
props.put(ProducerConfig.MIN_INSYNC_REPLICAS_CONFIG, 2); // 至少 2 个副本确认
```

**流程**:
- Leader 等待所有 ISR 副本同步完成
- 更新 HW 后才返回成功

**特点**:
- 吞吐量最低,延迟最高
- 数据最安全,不丢消息(除非所有 ISR 副本同时故障)
- 适用场景:金融交易、订单等关键业务

**配合 min.insync.replicas**:
```properties
# Topic 配置
min.insync.replicas=2

含义:
- ISR 中至少有 2 个副本(包括 Leader)写入成功
- 如果 ISR 只有 1 个副本,生产者会收到异常
- 防止"acks=all 但 ISR 只有 Leader"的情况
```

**异常处理**:
```java
try {
    producer.send(record).get(); // 同步等待
} catch (ExecutionException e) {
    if (e.getCause() instanceof NotEnoughReplicasException) {
        // ISR 副本不足,无法满足 min.insync.replicas
        log.error("ISR 副本不足,消息发送失败");
    }
}
```

### 2.4 Leader 选举与故障转移

#### 1. Leader 故障检测

**Controller 监听机制**:
- Kafka Controller 监听 Broker 故障
- 检测到 Leader 所在 Broker 下线
- 从 ISR 中选举新 Leader

**检测方式**:
```
方式 1: Zookeeper Session 超时
        Broker 与 ZK 断开连接,Session 超时

方式 2: Kafka 2.8+ 移除 ZK,使用 KRaft
        基于 Quorum 的故障检测
```

#### 2. Leader 选举策略

**首选副本选举(Preferred Replica Election)**:
```
创建 Topic 时指定:
  Partition 0: Leader=Broker1, Replicas=[Broker1, Broker2, Broker3]

选举优先级:
  1. 首选副本(Broker1)
  2. ISR 中的其他副本
  3. 非 ISR 副本(需配置 unclean.leader.election.enable=true)
```

**自动恢复首选 Leader**:
```properties
# 自动均衡,让首选副本重新成为 Leader
auto.leader.rebalance.enable=true
```

#### 3. 不洁选举(Unclean Leader Election)

**配置**:
```properties
# 是否允许非 ISR 副本成为 Leader
unclean.leader.election.enable=false
```

**场景分析**:

```
情况: ISR 只有 Leader,Leader 故障

unclean.leader.election.enable=false:
  → 无法选举新 Leader
  → 分区不可用
  → 数据不丢失(原有数据保留)

unclean.leader.election.enable=true:
  → 从非 ISR 副本选举 Leader
  → 分区可用
  → 数据丢失(非 ISR 副本数据不完整)
```

**生产建议**:
- 关键业务: `unclean.leader.election.enable=false`(宁可不可用,不可丢数据)
- 一般业务: `unclean.leader.election.enable=true`(可用性优先)

#### 4. Leader 切换过程中的数据一致性

**消费者视角**:
```
Leader 切换前:
  消费者读 Partition 0, Leader=Broker1, HW=100

Leader 切换中:
  消费者收到 "NotLeaderForPartitionException"
  消费者重新连接新 Leader

Leader 切换后:
  消费者读 Partition 0, Leader=Broker2
  从上次 commit 的 offset 继续消费
```

**关键点**:
- HW 之前的消息不会丢失
- HW 和 LEO 之间的消息可能需要重新同步或丢弃
- 消费者需要处理 Leader 切换异常并重试

### 2.5 副本同步监控与治理

#### 1. 关键监控指标

```bash
# ISR 副本数
kafka-topics.sh --describe --topic order-events \
  --bootstrap-server localhost:9092

# 输出示例
Topic: order-events	PartitionCount: 10	ReplicationFactor: 3
Topic: order-events	Partition: 0	Leader: 1	Replicas: 1,2,3	Isr: 1,2,3
Topic: order-events	Partition: 1	Leader: 2	Replicas: 2,3,1	Isr: 2,3,1
```

**ISR 收缩告警**:
- Topic 配置 3 副本,ISR 只有 1 个 → 严重告警
- ISR 副本数 < min.insync.replicas → 生产可能失败

#### 2. Under-Replicated 分区

```bash
# 查看副本不足的分区
kafka-topics.sh --describe --under-replicated-partitions \
  --bootstrap-server localhost:9092

# 输出:副本数 < 配置副本数的分区
```

**原因排查**:
1. Follower 所在 Broker 故障
2. 网络延迟导致同步慢
3. 磁盘 IO 阻塞
4. JVM GC 频繁

**解决方案**:
- 扩容 Broker,迁移分区
- 调整 `num.replica.fetchers`(增加同步线程)
- 优化磁盘和网络

## 三、顺序消费实现方案

### 3.1 Kafka 的顺序性保证

**Kafka 能保证的顺序**:
- √ 单分区内按 offset 顺序消费
- √ 同一消费者实例内,单线程顺序处理

**Kafka 不能保证的顺序**:
- × 跨分区全局顺序
- × 消费者多线程并发处理的顺序
- × 消息重试导致的顺序问题

### 3.2 为什么需要顺序消费?

**典型场景**:

#### 1. 订单状态流转

```
订单 1001 的状态变化:
  创建(10:00) → 支付(10:05) → 发货(10:10) → 完成(10:15)

如果乱序:
  支付 → 创建 → 发货 → 完成  ← 逻辑错误!
```

#### 2. 账户余额变更

```
用户 A 的账户:
  初始余额: 1000
  - 充值 +500  → 余额 1500
  - 消费 -200  → 余额 1300

如果乱序:
  消费 -200(余额 800) → 充值 +500(余额 1300)  ← 余额错误!
```

#### 3. 数据库 Binlog 同步

```
MySQL 表操作顺序:
  INSERT → UPDATE → DELETE

如果 Binlog 同步到其他系统时乱序:
  数据状态不一致
```

### 3.3 顺序消费实现方案

#### 方案一:Key 分区(推荐)

**原理**: 相同 Key 的消息总是发送到同一分区

```java
// 生产者:订单 ID 作为 Key
public void sendOrderEvent(OrderEvent event) {
    String orderId = event.getOrderId();
    String payload = JSON.toJSONString(event);
    
    ProducerRecord<String, String> record = 
        new ProducerRecord<>("order-events", orderId, payload);
    
    producer.send(record, (metadata, exception) -> {
        if (exception != null) {
            log.error("发送订单事件失败: orderId={}", orderId, exception);
        }
    });
}
```

**保证**:
- 同一 `orderId` 的所有事件 → 同一分区
- 单分区内有序 → 同一订单事件有序
- 不同订单的事件 → 可能不同分区 → 并行处理

**注意事项**:
```
问题: Key 分布不均导致数据倾斜

示例:
  - 订单 "VIP001" 的消息特别多
  - 所有 "VIP001" 的消息都在同一分区
  - 该分区积压,其他分区空闲

解决:
  - 使用组合 Key,如 "订单类型:订单ID"
  - VIP 订单单独 Topic
  - 自定义分区器做负载均衡
```

#### 方案二:单分区 Topic

**适用场景**: 消息量小,必须全局有序

```bash
# 创建单分区 Topic
kafka-topics.sh --create --topic global-ordered-events \
  --partitions 1 --replication-factor 3 \
  --bootstrap-server localhost:9092
```

**特点**:
- 全局顺序保证
- 吞吐量受限(无法并行)
- 消费者组只能有一个消费者

#### 方案三:消费者端保证(需谨慎)

**单线程消费**:
```java
@KafkaListener(topics = "order-events", groupId = "order-consumer")
public void consume(ConsumerRecord<String, String> record) {
    // 单线程处理,保证顺序
    String orderId = record.key();
    String payload = record.value();
    
    processOrderEvent(orderId, payload);
}
```

**问题**: 
- 性能差(无法并发)
- 不推荐(应该从生产端分区策略保证顺序)

**多线程 + 分区锁**:
```java
@KafkaListener(topics = "order-events", groupId = "order-consumer",
               concurrency = "3") // 3 个线程
public void consume(List<ConsumerRecord<String, String>> records) {
    // 按 Key 分组
    Map<String, List<ConsumerRecord<String, String>>> groupedRecords = 
        records.stream()
              .collect(Collectors.groupingBy(ConsumerRecord::key));
    
    // 不同 Key 并行处理,相同 Key 顺序处理
    groupedRecords.forEach((orderId, orderRecords) -> {
        executorService.submit(() -> {
            // 同一订单的事件顺序处理
            orderRecords.forEach(record -> {
                processOrderEvent(orderId, record.value());
            });
        });
    });
}
```

**复杂度高,不推荐,建议用方案一**。

### 3.4 顺序消费的常见问题

#### 问题一:消息重试导致乱序

**场景**:
```
分区消息序列: [A1, A2, A3]
消费者处理:
  - A1 成功
  - A2 失败,重试
  - A3 成功
  - A2 重试成功

实际执行顺序: A1 → A3 → A2  ← 乱序!
```

**解决方案**:

1. **失败消息跳过,记录到死信队列**
```java
@KafkaListener(topics = "order-events", groupId = "order-consumer")
public void consume(ConsumerRecord<String, String> record) {
    try {
        processOrderEvent(record.key(), record.value());
    } catch (Exception e) {
        // 发送到死信队列,不影响后续消息
        sendToDeadLetterQueue(record, e);
        // 正常提交 offset
    }
}
```

2. **失败消息阻塞,不提交 offset(需谨慎)**
```java
@KafkaListener(topics = "order-events", groupId = "order-consumer",
               containerFactory = "manualAckContainerFactory")
public void consume(ConsumerRecord<String, String> record,
                    Acknowledgment ack) {
    try {
        processOrderEvent(record.key(), record.value());
        ack.acknowledge(); // 成功才提交
    } catch (Exception e) {
        // 不提交 offset,阻塞后续消息
        log.error("处理失败,阻塞队列: key={}", record.key(), e);
        // 可能导致分区积压
    }
}
```

3. **重试队列 + 延迟处理**
```java
// 失败消息发送到延迟重试 Topic
producer.send(new ProducerRecord<>("order-events-retry", 
                                   record.key(), record.value()));

// 延迟 Topic 消费者稍后重试
@KafkaListener(topics = "order-events-retry", groupId = "retry-consumer")
public void retryConsume(ConsumerRecord<String, String> record) {
    // 延迟后重试
    Thread.sleep(5000);
    processOrderEvent(record.key(), record.value());
}
```

#### 问题二:消费者 Rebalance 导致乱序

**场景**:
```
消费者组: [Consumer1, Consumer2]
分区分配: Consumer1 → Partition0, Consumer2 → Partition1

Rebalance:
  Consumer1 下线
  分区重新分配: Consumer2 → Partition0, Partition1

影响:
  Partition0 的 offset 可能重复消费或跳跃
```

**解决方案**:
- 使用**外部存储 offset**(而不是 Kafka 内部)
- Rebalance 后从外部存储恢复 offset

```java
// 自定义 Offset 存储
public class RedisOffsetStore {
    public void saveOffset(String topic, int partition, long offset) {
        redisTemplate.opsForValue().set(
            "kafka:offset:" + topic + ":" + partition, 
            String.valueOf(offset)
        );
    }
    
    public long getOffset(String topic, int partition) {
        String offset = redisTemplate.opsForValue().get(
            "kafka:offset:" + topic + ":" + partition
        );
        return offset == null ? 0 : Long.parseLong(offset);
    }
}
```

#### 问题三:并发消费破坏顺序

**场景**:
```java
@KafkaListener(topics = "order-events", groupId = "order-consumer")
public void consume(ConsumerRecord<String, String> record) {
    // 异步处理,破坏顺序
    CompletableFuture.runAsync(() -> {
        processOrderEvent(record.key(), record.value());
    });
}
```

**问题**: 
- 虽然从 Kafka 读取有序,但异步执行可能乱序

**解决方案**:
- 顺序消费场景不要异步处理
- 或者用方案三中的"多线程 + 分区锁"

### 3.5 顺序消费最佳实践

#### 1. 设计阶段

**确定顺序边界**:
- 哪些场景需要顺序?
- 顺序的粒度是什么?(订单级?用户级?全局?)
- 能否接受局部顺序而非全局顺序?

**Topic 和分区设计**:
```
强顺序场景:
  - 单分区 Topic
  - 或 Key 分区 + 单线程消费

弱顺序场景:
  - 多分区 + Key 分区
  - 相同 Key 有序,不同 Key 并行

无顺序要求:
  - 多分区 + 轮询分区
  - 最大化吞吐
```

#### 2. 生产阶段

**Key 选择原则**:
```
√ 好的 Key:
  - 订单 ID(订单状态流转)
  - 用户 ID(用户行为序列)
  - 交易流水号(交易记录)

× 不好的 Key:
  - 时间戳(无法保证顺序)
  - 随机字符串(无业务含义)
  - null(无法分区)
```

**生产者配置**:
```java
Properties props = new Properties();
props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true); // 幂等生产者
props.put(ProducerConfig.ACKS_CONFIG, "all"); // 确保消息不丢
props.put(ProducerConfig.RETRIES_CONFIG, Integer.MAX_VALUE); // 无限重试
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 1); // 单请求(避免乱序)
```

**关键配置**: `max.in.flight.requests.per.connection=1`
- 禁止并发请求
- 确保重试时不会乱序
- 降低吞吐量,但保证顺序

#### 3. 消费阶段

**消费者配置**:
```java
Properties props = new Properties();
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false); // 手动提交
props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 10); // 小批量
props.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed"); // 读已提交
```

**处理原则**:
- 顺序场景: 同步处理,失败则阻塞
- 失败处理: 死信队列 + 人工介入
- 幂等设计: 相同消息重复消费不产生副作用

#### 4. 监控阶段

**关键指标**:
- 分区 lag(是否积压)
- 消费延迟(是否实时)
- 失败消息数(死信队列大小)
- Rebalance 频率(是否稳定)

## 四、消费者组机制详解

### 4.1 消费者组核心概念

**消费者组(Consumer Group)** 是 Kafka 实现消费扩展的核心机制:

```
Topic: order-events (4 个分区)
┌─────────────────────────────────────┐
│ Partition 0 → Consumer 1            │
│ Partition 1 → Consumer 1            │
│ Partition 2 → Consumer 2            │
│ Partition 3 → Consumer 2            │
└─────────────────────────────────────┘
消费者组: order-consumer-group
```

**核心规则**:
- 同一消费者组内,**一个分区只能被一个消费者消费**
- 不同消费者组可以独立消费同一 Topic
- 消费者组是逻辑单位,不是物理部署单位

### 4.2 消费者组的优势

#### 1. 横向扩展

```
场景: 消息积压,需要提升消费能力

方案: 增加消费者实例
  初始: 4 分区, 2 消费者 → 每个消费者 2 个分区
  扩容: 4 分区, 4 消费者 → 每个消费者 1 个分区
  极限: 4 分区, 8 消费者 → 4 个消费者空闲
```

**扩展上限**: 消费者数 ≤ 分区数

#### 2. 故障容错

```
场景: Consumer 2 故障

流程:
  1. Kafka 检测到 Consumer 2 下线(心跳超时)
  2. 触发 Rebalance
  3. Partition 2 和 Partition 3 重新分配给 Consumer 1
  4. Consumer 1 消费 4 个分区
```

**自动故障转移**: 消费者故障后,分区自动重新分配

#### 3. 多业务隔离

```
Topic: order-events
├── 消费者组 A: order-service (处理订单业务)
├── 消费者组 B: notification-service (发送通知)
└── 消费者组 C: data-analytics (数据分析)
```

**每个消费者组独立消费**,互不影响。

### 4.3 消费者组配置详解

#### 1. 必需配置

```java
Properties props = new Properties();
props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
props.put(ConsumerConfig.GROUP_ID_CONFIG, "order-consumer-group"); // 消费者组 ID
props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, 
          StringDeserializer.class.getName());
props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, 
          StringDeserializer.class.getName());
```

**group.id 的作用**:
- 标识消费者组
- 相同 group.id 的消费者属于同一组
- Kafka 内部用 group.id 管理 offset

#### 2. Offset 管理配置

```java
// 自动提交 offset
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, true);
props.put(ConsumerConfig.AUTO_COMMIT_INTERVAL_MS_CONFIG, 5000); // 每 5 秒提交

// 手动提交 offset(推荐)
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
```

**自动提交 vs 手动提交**:

| 方式 | 优点 | 缺点 | 适用场景 |
|------|------|------|---------|
| 自动提交 | 简单 | 可能重复消费/丢失消息 | 非关键业务 |
| 手动提交 | 精确控制 | 代码复杂 | 关键业务 |

**手动提交示例**:
```java
while (true) {
    ConsumerRecords<String, String> records = consumer.poll(Duration.ofMillis(100));
    
    for (ConsumerRecord<String, String> record : records) {
        try {
            processMessage(record);
            // 同步提交 offset
            consumer.commitSync();
        } catch (Exception e) {
            // 不提交 offset,下次重新消费
            log.error("处理失败", e);
        }
    }
}
```

#### 3. 心跳和会话配置

```java
props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 10000); // 会话超时:10 秒
props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 3000); // 心跳间隔:3 秒
props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000); // 最大处理间隔:5 分钟
```

**参数关系**:
```
HEARTBEAT_INTERVAL_MS < SESSION_TIMEOUT_MS

示例:
  心跳间隔: 3 秒
  会话超时: 10 秒
  含义: 如果 10 秒内未收到心跳,认为消费者下线
```

**MAX_POLL_INTERVAL_MS**:
- 两次 `poll()` 调用的最大间隔
- 如果处理时间过长,超过此时间,消费者会被踢出组
- 适用场景: 单条消息处理耗时长

#### 4. 消费位置配置

```java
// 从最早的消息开始消费
props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "earliest");

// 从最新的消息开始消费
props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "latest");

// 如果没有 offset,抛出异常
props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, "none");
```

**适用场景**:
- `earliest`: 新消费者组需要消费历史数据
- `latest`: 只消费新产生的消息
- `none`: 必须明确指定 offset

### 4.4 消费者组协议:Rebalance

#### 1. Rebalance 触发条件

**消费者数量变化**:
```
触发:
  - 新消费者加入组
  - 消费者主动离开组
  - 消费者故障(心跳超时)
  - 消费者处理超时(max.poll.interval.ms)
```

**分区数量变化**:
```
触发:
  - Topic 分区数增加(不能减少)
```

**Topic 数量变化**:
```
触发:
  - 消费者订阅的 Topic 列表变化(正则订阅)
  - 新 Topic 匹配订阅正则
```

#### 2. Rebalance 流程

**阶段一:JoinGroup(加入组)**

```
1. 消费者发送 JoinGroupRequest 到 Coordinator
   - 包含: group.id, member.id, subscription 等

2. Coordinator 选择 Group Leader
   - 第一个加入的消费者成为 Leader
   - Leader 负责制定分区分配方案

3. Coordinator 返回 JoinGroupResponse
   - 包含: member.id, member.id.leader(如果是 Leader),组成员列表
```

**阶段二:SyncGroup(同步分配方案)**

```
1. Leader 制定分区分配方案
   - 根据 partition.assignment.strategy 策略分配
   - 生成 Assignment: {member1: [p0, p1], member2: [p2, p3]}

2. 所有成员发送 SyncGroupRequest
   - Leader 携带分配方案
   - 其他成员不携带

3. Coordinator 返回 SyncGroupResponse
   - 包含每个成员的分区分配结果
```

**阶段三:Rebalance 完成**

```
消费者开始消费分配到的分区
```

#### 3. Rebalance 的影响

**正面影响**:
- 自动故障转移
- 动态扩缩容

**负面影响**:
```
1. 消费暂停
   Rebalance 期间,所有消费者停止消费
   时间: 几秒到几分钟(取决于组大小)

2. 重复消费
   Rebalance 前,offset 可能未提交
   Rebalance 后,重新消费已处理的消息

3. 消费抖动
   分区重新分配,可能导致:
   - 某些消费者负载增加
   - 某些消费者负载减少
   - 本地缓存失效(如果缓存与分区绑定)
```

#### 4. Rebalance 策略

**Range 策略(默认)**:
```
分配逻辑:
  - 按分区号范围分配
  - 可能导致分配不均

示例:
  Topic: 7 个分区 [P0, P1, P2, P3, P4, P5, P6]
  消费者: 3 个 [C1, C2, C3]
  
  分配结果:
    C1: P0, P1, P2      (3 个)
    C2: P3, P4          (2 个)
    C3: P5, P6          (2 个)
```

**RoundRobin 策略**:
```
分配逻辑:
  - 轮询分配所有分区
  - 分配更均匀

示例:
  Topic: 7 个分区 [P0, P1, P2, P3, P4, P5, P6]
  消费者: 3 个 [C1, C2, C3]
  
  分配结果:
    C1: P0, P3, P6      (3 个)
    C2: P1, P4          (2 个)
    C3: P2, P5          (2 个)
```

**Sticky 策略(Kafka 0.11+)**:
```
分配逻辑:
  - 尽量保持原有分配不变
  - 只重新分配需要迁移的分区
  - 减少 Rebalance 影响

示例:
  Rebalance 前:
    C1: P0, P1
    C2: P2, P3
    C3: P4, P5
  
  C2 下线后 Rebalance:
    Range/RoundRobin:
      C1: P0, P1, P2  (需要重新分配 P2)
      C3: P3, P4, P5  (需要重新分配 P3)
    
    Sticky:
      C1: P0, P1, P2  (保持 P0, P1,新增 P2)
      C3: P4, P5, P3  (保持 P4, P5,新增 P3)
```

**配置方式**:
```java
props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG, 
          "org.apache.kafka.clients.consumer.StickyAssignor");
```

#### 5. Rebalance 优化

**优化一:减少 Rebalance 频率**

```java
// 增加会话超时时间(避免瞬时故障触发 Rebalance)
props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 30000); // 30 秒

// 增加最大处理间隔(避免处理慢触发 Rebalance)
props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 600000); // 10 分钟

// 增加心跳间隔(减少心跳频率)
props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 10000); // 10 秒
```

**优化二:使用静态成员(Static Membership)**

**Kafka 2.3+ 引入**:
```java
props.put(ConsumerConfig.GROUP_INSTANCE_ID_CONFIG, "consumer-1"); // 静态成员 ID
props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 300000); // 5 分钟
```

**原理**:
- 消费者离开组后,如果在 `session.timeout.ms` 内重新加入
- 不触发 Rebalance,直接恢复原有分区分配
- 适用场景: 消费者重启、滚动升级

**优化三:增量 Rebalance(Kafka 2.4+)**

**CooperativeStickyAssignor**:
```java
props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
          "org.apache.kafka.clients.consumer.CooperativeStickyAssignor");
```

**原理**:
- Eager Rebalance: 所有消费者放弃所有分区,重新分配
- Cooperative Rebalance: 只迁移需要变更的分区

**对比**:
```
Eager Rebalance:
  1. 所有消费者停止消费
  2. 所有分区重新分配
  3. 所有消费者恢复消费

Cooperative Rebalance:
  1. 只有受影响的消费者停止消费部分分区
  2. 只迁移需要变更的分区
  3. 其他消费者不受影响
```

### 4.5 消费者组监控

#### 1. 查看消费者组状态

```bash
# 列出所有消费者组
kafka-consumer-groups.sh --list --bootstrap-server localhost:9092

# 查看消费者组详情
kafka-consumer-groups.sh --describe --group order-consumer-group \
  --bootstrap-server localhost:9092

# 输出示例
GROUP                TOPIC           PARTITION  CURRENT-OFFSET  LOG-END-OFFSET  LAG
order-consumer-group order-events    0          1000            1050            50
order-consumer-group order-events    1          2000            2100            100
order-consumer-group order-events    2          1500            1500            0
order-consumer-group order-events    3          1800            1900            100
```

**关键指标**:
- `CURRENT-OFFSET`: 消费者当前 offset
- `LOG-END-OFFSET`: 分区最新 offset
- `LAG`: 消费延迟(积压消息数)

#### 2. 重置消费者组 Offset

```bash
# 重置到最早位置
kafka-consumer-groups.sh --reset-offsets --group order-consumer-group \
  --topic order-events --to-earliest --execute \
  --bootstrap-server localhost:9092

# 重置到最新位置
kafka-consumer-groups.sh --reset-offsets --group order-consumer-group \
  --topic order-events --to-latest --execute \
  --bootstrap-server localhost:9092

# 重置到指定位置
kafka-consumer-groups.sh --reset-offsets --group order-consumer-group \
  --topic order-events --to-offset 1000 --execute \
  --bootstrap-server localhost:9092

# 按时间重置
kafka-consumer-groups.sh --reset-offsets --group order-consumer-group \
  --topic order-events --to-datetime 2025-01-01T00:00:00.000 --execute \
  --bootstrap-server localhost:9092
```

## 五、分区策略与重平衡

### 5.1 生产者分区策略

#### 1. 默认分区器(DefaultPartitioner)

**Kafka 2.4 之前**:
```
有 Key:
  partition = hash(key) % partitionCount
  
无 Key:
  partition =轮询(round-robin)
```

**Kafka 2.4+ (粘性分区器)**:
```
有 Key:
  partition = hash(key) % partitionCount
  
无 Key:
  partition = 粘性分区(批量发送到同一分区)
```

#### 2. 自定义分区器实现

**业务场景**: 根据订单类型分区

```java
public class OrderTypePartitioner implements Partitioner {
    private Map<String, Integer> typeToPartition;
    
    @Override
    public void configure(Map<String, ?> configs) {
        // 从配置中读取分区映射
        typeToPartition = (Map<String, Integer>) configs.get("type.partition.mapping");
    }
    
    @Override
    public int partition(String topic, Object key, byte[] keyBytes,
                         Object value, byte[] valueBytes, Cluster cluster) {
        String orderType = extractOrderType(value);
        
        // VIP 订单到分区 0
        if ("VIP".equals(orderType)) {
            return 0;
        }
        
        // 普通订单按类型分区
        Integer partition = typeToPartition.get(orderType);
        return partition != null ? partition : 1;
    }
    
    private String extractOrderType(Object value) {
        // 从消息体中提取订单类型
        JSONObject json = JSON.parseObject((String) value);
        return json.getString("orderType");
    }
    
    @Override
    public void close() {}
}
```

**配置**:
```java
Properties props = new Properties();
props.put(ProducerConfig.PARTITIONER_CLASS_CONFIG, OrderTypePartitioner.class.getName());
props.put("type.partition.mapping", Map.of(
    "NORMAL", 1,
    "PROMOTION", 2,
    "REFUND", 3
));
```

### 5.2 消费者分区分配策略

#### 1. RangeAssignor(默认)

**适用场景**: 消费者订阅单个 Topic

**优点**: 简单,适合单 Topic

**缺点**: 多 Topic 时可能分配不均

```
示例: 订阅 2 个 Topic,各 3 个分区
TopicA: [P0, P1, P2]
TopicB: [P0, P1, P2]
消费者: [C1, C2]

RangeAssignor 分配:
  C1: TopicA-P0, TopicA-P1, TopicB-P0, TopicB-P1  (4 个)
  C2: TopicA-P2, TopicB-P2                        (2 个)
```

#### 2. RoundRobinAssignor

**适用场景**: 消费者订阅多个 Topic

**优点**: 分配均匀

**缺点**: Rebalance 时所有分区重新分配

```
示例: 订阅 2 个 Topic,各 3 个分区
TopicA: [P0, P1, P2]
TopicB: [P0, P1, P2]
消费者: [C1, C2]

RoundRobinAssignor 分配:
  C1: TopicA-P0, TopicA-P2, TopicB-P1  (3 个)
  C2: TopicA-P1, TopicB-P0, TopicB-P2  (3 个)
```

#### 3. StickyAssignor

**适用场景**: Rebalance 频繁的场景

**优点**: 
- Rebalance 时尽量保持原有分配
- 减少分区迁移

**缺点**: 分配逻辑复杂

#### 4. CooperativeStickyAssignor(Kafka 2.4+)

**适用场景**: 大规模消费者组

**优点**: 
- 增量 Rebalance
- 最小化消费中断

**配置**:
```java
props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
          "org.apache.kafka.clients.consumer.CooperativeStickyAssignor");
```

### 5.3 Rebalance 深度解析

#### 1. Rebalance 的两种模式

**Eager Rebalance(急切重平衡)**:
- 所有消费者放弃所有分区
- 重新分配所有分区
- 短暂停止所有消费

**Cooperative Rebalance(协作重平衡)**:
- 只重新分配需要变更的分区
- 其他分区保持不变
- 最小化消费中断

#### 2. Rebalance 问题排查

**问题一:频繁 Rebalance**

**现象**: 消费者组不停 Rebalance,消费抖动

**原因排查**:
```bash
# 查看消费者组日志
grep "Rebalance" /var/log/kafka/consumer.log

# 常见原因:
# 1. 消费者处理超时(单条消息处理时间 > max.poll.interval.ms)
# 2. 消费者频繁重启
# 3. 网络抖动导致心跳失败
# 4. JVM Full GC 导致心跳线程阻塞
# 5. 消费者数量动态变化(自动扩缩容)
```

**解决方案**:
```java
// 1. 增加 max.poll.interval.ms
props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 600000); // 10 分钟

// 2. 减少 max.poll.records(单次拉取数量)
props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 100);

// 3. 增加会话超时时间
props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 30000);

// 4. 使用静态成员
props.put(ConsumerConfig.GROUP_INSTANCE_ID_CONFIG, "consumer-static-1");
```

**问题二:Rebalance 导致消费延迟**

**现象**: Rebalance 期间,消息积压

**原因**:
- Rebalance 时所有消费者停止消费
- Rebalance 时间过长

**解决方案**:
```java
// 使用 CooperativeStickyAssignor
props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
          "org.apache.kafka.clients.consumer.CooperativeStickyAssignor");

// 增加心跳频率(更快完成 Rebalance)
props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 3000);
```

**问题三:Rebalance 导致重复消费**

**现象**: Rebalance 后,部分消息重复消费

**原因**:
- Rebalance 前,offset 未提交
- Rebalance 后,从旧 offset 恢复

**解决方案**:
```java
// 手动提交 offset,处理成功后立即提交
consumer.commitSync();

// 或使用事务(保证精确一次)
props.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");
```

#### 3. Rebalance 监控告警

**关键指标**:
- Rebalance 频率(次/小时)
- Rebalance 持续时间
- 消费者加入/离开次数
- 分区分配变化次数

**告警规则**:
```
严重告警:
  - Rebalance 频率 > 10 次/小时
  - Rebalance 持续时间 > 1 分钟
  - 消费者组为空(所有消费者下线)

警告:
  - Rebalance 频率 > 5 次/小时
  - 消费者数量变化
```

## 六、Kafka 实战案例

### 6.1 案例:订单系统顺序消费

#### 1. 需求分析

**业务场景**: 电商订单状态流转

**顺序要求**:
```
订单创建 → 支付成功 → 发货 → 确认收货 → 完成

要求:
  - 同一订单的事件必须按顺序处理
  - 不同订单可以并行处理
```

**消息量**:
- 日均订单: 100 万
- 每订单平均事件: 5 个
- 日均消息量: 500 万
- 峰值: 1000 条/秒

#### 2. 架构设计

**Topic 设计**:
```bash
# retention.ms: 保留 7 天; segment.bytes: 单个 segment 1GB
kafka-topics.sh --create --topic order-events \
  --partitions 10 --replication-factor 3 \
  --config retention.ms=604800000 \
  --config segment.bytes=1073741824 \
  --bootstrap-server localhost:9092
```

**分区数计算**:
```
峰值吞吐: 1000 条/秒
单分区吞吐: 200 条/秒(保守估计)
最少分区: 1000 / 200 = 5 个

考虑扩展: 10 个分区(预留扩展空间)
```

**生产者设计**:
```java
@Service
public class OrderEventProducer {
    private final KafkaTemplate<String, String> kafkaTemplate;
    
    public OrderEventProducer() {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, 
                  StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, 
                  StringSerializer.class.getName());
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 1);
        
        this.kafkaTemplate = new KafkaTemplate<>(new DefaultKafkaProducerFactory<>(props));
    }
    
    public void sendOrderEvent(OrderEvent event) {
        String orderId = event.getOrderId(); // 订单 ID 作为 Key
        String payload = JSON.toJSONString(event);
        
        // Key = orderId,保证同一订单的事件到同一分区
        ProducerRecord<String, String> record = 
            new ProducerRecord<>("order-events", orderId, payload);
        
        kafkaTemplate.send(record).addCallback(
            result -> log.info("发送成功: orderId={}, partition={}", 
                              orderId, result.getRecordMetadata().partition()),
            failure -> log.error("发送失败: orderId={}", orderId, failure)
        );
    }
}
```

**消费者设计**:
```java
@Service
@Slf4j
public class OrderEventConsumer {
    
    @KafkaListener(topics = "order-events", groupId = "order-consumer-group",
                   concurrency = "10") // 10 个线程,对应 10 个分区
    public void consume(ConsumerRecord<String, String> record) {
        String orderId = record.key();
        String payload = record.value();
        
        try {
            OrderEvent event = JSON.parseObject(payload, OrderEvent.class);
            processOrderEvent(event);
            
            log.info("处理成功: orderId={}, event={}, offset={}", 
                    orderId, event.getEventType(), record.offset());
        } catch (Exception e) {
            log.error("处理失败: orderId={}, payload={}", orderId, payload, e);
            
            // 发送到死信队列
            sendToDeadLetterQueue(record, e);
        }
    }
    
    private void processOrderEvent(OrderEvent event) {
        String orderId = event.getOrderId();
        String eventType = event.getEventType();
        
        // 幂等处理:检查是否已处理
        if (isProcessed(orderId, eventType)) {
            log.warn("事件已处理,跳过: orderId={}, event={}", orderId, eventType);
            return;
        }
        
        // 根据事件类型处理
        switch (eventType) {
            case "ORDER_CREATED":
                handleOrderCreated(event);
                break;
            case "PAYMENT_SUCCESS":
                handlePaymentSuccess(event);
                break;
            case "ORDER_SHIPPED":
                handleOrderShipped(event);
                break;
            case "ORDER_COMPLETED":
                handleOrderCompleted(event);
                break;
            default:
                throw new IllegalArgumentException("未知事件类型: " + eventType);
        }
        
        // 标记为已处理
        markAsProcessed(orderId, eventType);
    }
    
    private boolean isProcessed(String orderId, String eventType) {
        // Redis 或数据库检查
        String key = "order:event:processed:" + orderId + ":" + eventType;
        return redisTemplate.hasKey(key);
    }
    
    private void markAsProcessed(String orderId, String eventType) {
        String key = "order:event:processed:" + orderId + ":" + eventType;
        redisTemplate.opsForValue().set(key, "1", Duration.ofDays(7));
    }
}
```

**消费者配置**:
```java
@Configuration
public class KafkaConsumerConfig {
    
    @Bean
    public ConsumerFactory<String, String> consumerFactory() {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, 
                  StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, 
                  StringDeserializer.class);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, "order-consumer-group");
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false); // 手动提交
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 100); // 单次最多 100 条
        props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, 300000); // 5 分钟处理超时
        props.put(ConsumerConfig.SESSION_TIMEOUT_MS_CONFIG, 30000); // 30 秒会话超时
        props.put(ConsumerConfig.HEARTBEAT_INTERVAL_MS_CONFIG, 10000); // 10 秒心跳
        props.put(ConsumerConfig.PARTITION_ASSIGNMENT_STRATEGY_CONFIG,
                  "org.apache.kafka.clients.consumer.CooperativeStickyAssignor");
        
        return new DefaultKafkaConsumerFactory<>(props);
    }
    
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, String> 
            kafkaListenerContainerFactory() {
        ConcurrentKafkaListenerContainerFactory<String, String> factory =
            new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory());
        factory.setConcurrency(10); // 10 个并发消费者
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);
        
        return factory;
    }
}
```

#### 3. 监控与告警

**监控指标**:
```java
@Component
public class KafkaMetrics {
    
    @Autowired
    private MeterRegistry meterRegistry;
    
    public void recordLag(String topic, int partition, long lag) {
        meterRegistry.gauge("kafka.consumer.lag", 
                           Tags.of("topic", topic, "partition", String.valueOf(partition)), 
                           lag);
    }
    
    public void recordProcessTime(String eventType, long duration) {
        meterRegistry.timer("kafka.consumer.process.time",
                           Tags.of("eventType", eventType))
                     .record(duration, TimeUnit.MILLISECONDS);
    }
    
    public void recordError(String eventType) {
        meterRegistry.counter("kafka.consumer.error",
                             Tags.of("eventType", eventType))
                     .increment();
    }
}
```

**告警规则(Prometheus)**:
```yaml
groups:
  - name: kafka-alerts
    rules:
      - alert: KafkaConsumerLagHigh
        expr: kafka_consumer_lag > 10000
        for: 5m
        annotations:
          summary: "Kafka 消费延迟过高"
          description: "Topic {{ $labels.topic }} Partition {{ $labels.partition }} 延迟 {{ $value }} 条"
      
      - alert: KafkaRebalanceFrequent
        expr: rate(kafka_consumer_rebalance_total[1h]) > 0.1
        annotations:
          summary: "Kafka Rebalance 频繁"
          description: "消费者组 {{ $labels.group }} 在过去 1 小时内 Rebalance 次数过多"
```

### 6.2 案例:日志采集系统

#### 1. 需求分析

**业务场景**: 应用日志采集和分析

**特点**:
- 吞吐量高(10 万条/秒)
- 不要求严格顺序
- 可容忍少量丢失

#### 2. 架构设计

**Topic 设计**:
```bash
# retention.ms: 保留 1 天; compression.type: LZ4 压缩
kafka-topics.sh --create --topic app-logs \
  --partitions 20 --replication-factor 2 \
  --config retention.ms=86400000 \
  --config compression.type=lz4 \
  --config segment.bytes=1073741824 \
  --bootstrap-server localhost:9092
```

**生产者设计(高性能)**:
```java
@Service
public class LogProducer {
    private final KafkaProducer<String, String> producer;
    
    public LogProducer() {
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, "localhost:9092");
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, 
                  StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, 
                  StringSerializer.class.getName());
        props.put(ProducerConfig.ACKS_CONFIG, "1"); // Leader 确认即可
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4"); // 压缩
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 32768); // 32KB 批量
        props.put(ProducerConfig.LINGER_MS_CONFIG, 10); // 10ms 延迟
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 67108864); // 64MB 缓冲
        
        this.producer = new KafkaProducer<>(props);
    }
    
    public void sendLog(LogEntry log) {
        String payload = JSON.toJSONString(log);
        
        // 无 Key,使用粘性分区器
        ProducerRecord<String, String> record = 
            new ProducerRecord<>("app-logs", payload);
        
        producer.send(record); // 异步发送,不等待回调
    }
    
    @PreDestroy
    public void close() {
        producer.flush();
        producer.close();
    }
}
```

**消费者设计(批量处理)**:
```java
@Service
@Slf4j
public class LogConsumer {
    
    @KafkaListener(topics = "app-logs", groupId = "log-analyzer-group",
                   batch = "true", // 批量消费
                   concurrency = "20")
    public void consume(List<ConsumerRecord<String, String>> records) {
        List<LogEntry> logs = records.stream()
            .map(record -> JSON.parseObject(record.value(), LogEntry.class))
            .collect(Collectors.toList());
        
        // 批量写入 Elasticsearch
        bulkInsertToElasticsearch(logs);
        
        log.info("批量处理日志: count={}", logs.size());
    }
}
```

### 6.3 案例:微服务事件总线

#### 1. 需求分析

**业务场景**: 微服务之间的事件驱动通信

**特点**:
- 多个消费者组独立消费
- 部分事件需要顺序,部分不需要
- 需要事务保证

#### 2. 架构设计

**Topic 设计**:
```bash
# 顺序事件 Topic(单分区)
kafka-topics.sh --create --topic user-events-ordered \
  --partitions 1 --replication-factor 3 \
  --bootstrap-server localhost:9092

# 并行事件 Topic(多分区)
kafka-topics.sh --create --topic notification-events \
  --partitions 10 --replication-factor 3 \
  --bootstrap-server localhost:9092
```

**生产者设计(事务)**:
```java
@Service
public class EventPublisher {
    private final KafkaTemplate<String, String> kafkaTemplate;
    
    @Transactional
    public void publishUserEvent(UserEvent event) {
        // 业务逻辑
        userRepository.updateUserStatus(event.getUserId(), event.getStatus());
        
        // 发送事件(事务保证)
        String payload = JSON.toJSONString(event);
        kafkaTemplate.executeInTransaction(template -> {
            template.send("user-events-ordered", event.getUserId(), payload);
            return true;
        });
    }
}
```

**多消费者组**:
```java
// 消费者组 1: 用户服务
@Service
public class UserServiceConsumer {
    @KafkaListener(topics = "user-events-ordered", groupId = "user-service-group")
    public void consume(UserEvent event) {
        // 更新用户状态
    }
}

// 消费者组 2: 通知服务
@Service
public class NotificationServiceConsumer {
    @KafkaListener(topics = "user-events-ordered", groupId = "notification-service-group")
    public void consume(UserEvent event) {
        // 发送通知
    }
}

// 消费者组 3: 数据分析服务
@Service
public class AnalyticsServiceConsumer {
    @KafkaListener(topics = "user-events-ordered", groupId = "analytics-service-group")
    public void consume(UserEvent event) {
        // 数据统计
    }
}
```

## 七、常见问题与解决方案

### 7.1 数据倾斜问题

**现象**: 某个分区消息过多,其他分区空闲

**原因**:
- Key 分布不均(某些 Key 消息特别多)
- 分区策略不合理

**解决方案**:

1. **使用组合 Key**
```java
// 原始:只按订单 ID 分区 → 大客户订单集中
String key = orderId;

// 优化:订单 ID + 日期,分散不同分区
String key = orderId + ":" + LocalDate.now();
```

2. **自定义分区器**
```java
// 大客户单独分区
if (vipOrders.contains(orderId)) {
    return 0; // VIP 分区
} else {
    return hash(orderId) % (partitionCount - 1) + 1;
}
```

3. **预聚合**
```java
// 在生产者端聚合高频消息
@Service
public class AggregatedProducer {
    private final Map<String, List<Event>> buffer = new ConcurrentHashMap<>();
    
    @Scheduled(fixedRate = 1000) // 每秒批量发送
    public void flush() {
        buffer.forEach((key, events) -> {
            String aggregated = JSON.toJSONString(events);
            producer.send(new ProducerRecord<>("topic", key, aggregated));
        });
        buffer.clear();
    }
}
```

### 7.2 消息积压问题

**现象**: 消费延迟持续增长,消息积压

**原因排查**:
```bash
# 查看消费延迟
kafka-consumer-groups.sh --describe --group order-consumer-group \
  --bootstrap-server localhost:9092

# 输出
LAG
50000  # 积压 5 万条
```

**解决方案**:

1. **临时扩容消费者**
```bash
# 增加分区数
kafka-topics.sh --alter --topic order-events --partitions 20 \
  --bootstrap-server localhost:9092

# 增加消费者实例数(最多 20 个)
```

2. **优化消费逻辑**
```java
// 原始:同步调用下游服务
public void consume(ConsumerRecord<String, String> record) {
    String response = httpClient.post("http://downstream/api", record.value());
    // 阻塞等待响应,慢!
}

// 优化:批量处理 + 异步
public void consume(List<ConsumerRecord<String, String>> records) {
    List<CompletableFuture<String>> futures = records.stream()
        .map(record -> httpClient.postAsync("http://downstream/api", record.value()))
        .collect(Collectors.toList());
    
    CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
}
```

3. **跳过积压消息(紧急情况)**
```bash
# 重置 offset 到最新
kafka-consumer-groups.sh --reset-offsets --group order-consumer-group \
  --topic order-events --to-latest --execute \
  --bootstrap-server localhost:9092
```

### 7.3 消息丢失问题

**现象**: 部分消息未消费

**原因排查**:

1. **生产者未正确处理异常**
```java
// 错误:异步发送不处理失败
producer.send(record);

// 正确:处理失败回调
producer.send(record, (metadata, exception) -> {
    if (exception != null) {
        // 重试或记录到本地文件
        log.error("发送失败", exception);
    }
});
```

2. **acks 配置不当**
```java
// 问题:acks=1,Leader 故障导致丢失
props.put(ProducerConfig.ACKS_CONFIG, "1");

// 解决:acks=all + min.insync.replicas=2
props.put(ProducerConfig.ACKS_CONFIG, "all");
// Topic 配置 min.insync.replicas=2
```

3. **消费者自动提交 offset**
```java
// 问题:自动提交 offset,处理失败后无法重新消费
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, true);

// 解决:手动提交 offset
props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);

// 处理成功后提交
consumer.commitSync();
```

### 7.4 重复消费问题

**现象**: 同一消息被消费多次

**原因**:
- Rebalance 导致 offset 回退
- 消费者处理成功但 offset 未提交
- 生产者重试导致消息重复

**解决方案**:

1. **幂等设计**
```java
@Service
public class OrderService {
    public void processOrder(OrderEvent event) {
        String orderId = event.getOrderId();
        String eventId = event.getEventId();
        
        // 检查是否已处理(唯一 ID)
        if (eventRepository.existsByEventId(eventId)) {
            log.warn("事件已处理,跳过: eventId={}", eventId);
            return;
        }
        
        // 处理业务
        doProcess(event);
        
        // 记录事件 ID
        eventRepository.save(new EventRecord(eventId, orderId));
    }
}
```

2. **使用 Kafka 事务**
```java
// 生产者:事务保证精确一次
props.put(ProducerConfig.TRANSACTIONAL_ID_CONFIG, "order-producer-1");

producer.initTransactions();
producer.beginTransaction();
try {
    producer.send(record);
    producer.commitTransaction();
} catch (Exception e) {
    producer.abortTransaction();
}

// 消费者:只读已提交消息
props.put(ConsumerConfig.ISOLATION_LEVEL_CONFIG, "read_committed");
```

### 7.5 性能优化问题

**生产者优化**:
```java
// 批量发送
props.put(ProducerConfig.BATCH_SIZE_CONFIG, 32768); // 32KB
props.put(ProducerConfig.LINGER_MS_CONFIG, 10); // 延迟 10ms

// 压缩
props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, "lz4");

// 缓冲区
props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, 67108864); // 64MB

// 并发请求
props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);
```

**消费者优化**:
```java
// 批量拉取
props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 500);

// 预取
props.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 1024 * 1024); // 1MB
props.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500); // 最多等待 500ms

// 并发处理
@KafkaListener(concurrency = "10") // 10 个线程
```

**Broker 优化**:
```properties
# 增加 Broker 数量
# 增加分区数
# 调整日志刷盘策略
log.flush.interval.messages=10000
log.flush.interval.ms=1000
```

## 八、面试要点

### 8.1 基础概念类

**Q1: Kafka 为什么吞吐量高?**

**答**:
1. **顺序写磁盘**: Kafka 将消息追加到日志文件末尾,利用磁盘顺序写性能(比随机写快几个数量级)
2. **零拷贝技术**: 使用 sendfile 系统调用,数据直接从磁盘到网卡,无需经过用户空间
3. **批量传输**: 生产者批量发送,消费者批量拉取,减少网络请求
4. **分区并行**: 多个分区并行处理,线性扩展吞吐量
5. **页缓存**: 利用 OS 的 Page Cache,消息先写入内存,异步刷盘

**Q2: Kafka 如何保证消息不丢失?**

**答**:
```
生产者端:
  - acks=all:等待所有 ISR 副本确认
  - retries:无限重试
  - enable.idempotence:开启幂等生产者

Broker 端:
  - replication.factor >= 3:多副本
  - min.insync.replicas >= 2:ISR 最少副本数
  - unclean.leader.election.enable=false:禁止不洁选举

消费者端:
  - enable.auto.commit=false:手动提交 offset
  - 处理成功后再提交 offset
```

**Q3: Kafka 的消息顺序性如何保证?**

**答**:
```
Kafka 能保证:
  - 单分区内按 offset 顺序消费
  - 同一消费者实例内单线程顺序处理

Kafka 不能保证:
  - 跨分区全局顺序
  - 多线程并发处理的顺序

实现顺序消费:
  - 生产者:Key 分区,相同 Key 到同一分区
  - 消费者:单线程处理或按 Key 分组后顺序处理
  - 配置:max.in.flight.requests.per.connection=1(避免重试乱序)
```

### 8.2 架构设计类

**Q4: Kafka 的副本机制是如何工作的?**

**答**:
```
副本角色:
  - Leader:处理所有读写请求
  - Follower:从 Leader 同步数据,不处理客户端请求
  - ISR:与 Leader 保持同步的副本集合

同步流程:
  1. Leader 写入本地日志,更新 LEO
  2. Follower 拉取数据(Fetch 请求)
  3. Leader 返回数据 + 当前 HW
  4. Follower 写入本地日志,更新 LEO
  5. Leader 收到 Follower 的 LEO,更新 HW = min(所有 LEO)
  6. 后续 Fetch 告知 Follower 新 HW

关键概念:
  - LEO(Log End Offset):日志末端偏移量
  - HW(High Watermark):高水位线,已提交消息位置
  - 消费者只能读到 HW 之前的消息
```

**Q5: 什么是 Rebalance?有什么影响?如何优化?**

**答**:
```
定义:
  消费者组内分区的重新分配过程

触发条件:
  - 消费者加入/离开组
  - 消费者故障(心跳超时)
  - Topic 分区数变化
  - 订阅的 Topic 变化

影响:
  - 消费暂停(所有消费者停止消费)
  - 重复消费(offset 未提交)
  - 消费抖动(分区重新分配)

优化方案:
  1. 增加 session.timeout.ms 和 max.poll.interval.ms
  2. 使用静态成员(group.instance.id)
  3. 使用 CooperativeStickyAssignor(增量 Rebalance)
  4. 减少消费者重启频率
```

**Q6: 消费者组的作用是什么?如何实现扩展?**

**答**:
```
作用:
  1. 横向扩展:增加消费者实例提升消费能力
  2. 故障容错:消费者故障后自动重新分配分区
  3. 业务隔离:不同消费者组独立消费同一 Topic

扩展机制:
  - 分区数 = 最大并行度
  - 消费者数 ≤ 分区数
  - 扩展步骤:
    1. 增加 Topic 分区数
    2. 增加消费者实例数
    3. 触发 Rebalance,重新分配分区

限制:
  - 消费者数超过分区数,部分消费者空闲
  - 单个分区只能被一个消费者消费
```

### 8.3 实战应用类

**Q7: 如何设计一个高可用的 Kafka 集群?**

**答**:
```
Broker 层面:
  - 至少 3 个 Broker 节点(奇数,支持选举)
  - 机架感知分配(rack awareness),副本分布不同机架
  - 监控:CPU、内存、磁盘 IO、网络 IO

Topic 层面:
  - replication.factor >= 3:多副本
  - min.insync.replicas >= 2:ISR 最少副本数
  - 分区数:根据吞吐量和并行度需求

生产者层面:
  - acks=all:等待所有 ISR 确认
  - retries=Integer.MAX_VALUE:无限重试
  - 监控:发送成功率、延迟

消费者层面:
  - 合理的消费者组大小
  - 手动提交 offset
  - 监控:消费延迟、Rebalance 频率

运维层面:
  - 监控告警:LAG、ISR 收缩、Broker 故障
  - 容量规划:磁盘空间、网络带宽
  - 灾备:跨机房复制(MirrorMaker)
```

**Q8: Kafka 如何实现精确一次语义(Exactly-Once)?**

**答**:
```
挑战:
  - 至少一次:可能重复消费
  - 至多一次:可能丢失消息
  - 精确一次:既不丢也不重复

实现方案:
  1. 幂等生产者(enable.idempotence=true)
     - 生产者分配 PID(Producer ID)
     - 每条消息带序列号
     - Broker 去重

  2. 事务(transactional.id)
     - 生产者开启事务
     - 多条消息原子性写入
     - 消费者隔离级别设为 read_committed

  3. 幂等消费者
     - 业务层唯一 ID 去重
     - 使用数据库唯一索引
     - Redis 记录已处理消息 ID

代码示例:
  // 生产者
  props.put("enable.idempotence", true);
  props.put("transactional.id", "order-producer-1");
  producer.initTransactions();
  producer.beginTransaction();
  producer.send(record);
  producer.commitTransaction();
  
  // 消费者
  props.put("isolation.level", "read_committed");
```

**Q9: 如何处理消息积压问题?**

**答**:
```
排查步骤:
  1. 查看消费延迟:LAG 指标
  2. 分析原因:
     - 消费者数量不足
     - 单条消息处理慢
     - 下游服务阻塞
     - Rebalance 频繁

解决方案:
  1. 临时扩容:
     - 增加分区数
     - 增加消费者实例
     - 扩容下游服务

  2. 优化消费:
     - 批量处理
     - 异步处理
     - 跳过非关键步骤

  3. 紧急措施:
     - 重置 offset 到最新(丢弃积压消息)
     - 迁移到新 Topic 重新消费

预防措施:
  - 监控告警:LAG > 阈值告警
  - 容量规划:预留消费能力
  - 压测验证:峰值流量验证
```

**Q10: Kafka 和 RabbitMQ 如何选择?**

**答**:
```
Kafka 适用场景:
  - 高吞吐量场景(日志、埋点、行为流)
  - 消息持久化和回溯
  - 大数据管道(流处理)
  - 多消费者独立消费

RabbitMQ 适用场景:
  - 复杂路由(Exchange + Routing Key)
  - 延迟队列、优先级队列
  - 事务消息
  - 传统消息队列场景(低延迟、高可靠)

对比表:
  | 维度 | Kafka | RabbitMQ |
  |------|-------|----------|
  | 吞吐量 | 极高(百万级/秒) | 中等(万级/秒) |
  | 延迟 | 毫秒级 | 微秒级 |
  | 持久化 | 强(顺序写磁盘) | 中(内存为主) |
  | 顺序性 | 单分区有序 | 单队列有序 |
  | 路由 | 简单(Topic) | 复杂(Exchange) |
  | 消费模式 | 拉取(Pull) | 推送(Push) |
  | 扩展性 | 极强(分区) | 一般(集群) |

选择建议:
  - 日志、大数据 → Kafka
  - 传统业务消息 → RabbitMQ
  - 微服务事件总线 → Kafka(高吞吐)或 RabbitMQ(复杂路由)
```

## 九、总结

### 9.1 核心要点回顾

**分区机制**:
- 分区是 Kafka 高吞吐的核心
- 单分区有序,跨分区无序
- 分区数决定最大并行度

**副本机制**:
- Leader 处理读写,Follower 同步数据
- ISR 保证数据一致性
- HW 决定消费者可见范围

**顺序消费**:
- Key 分区保证同一 Key 到同一分区
- 单线程处理保证顺序
- 幂等设计防止重复消费

**消费者组**:
- 横向扩展和故障容错
- Rebalance 影响消费稳定性
- 静态成员和协作式 Rebalance 优化

### 9.2 最佳实践清单

**生产环境配置**:
```
Topic:
  - partitions: 根据吞吐量和并行度设计
  - replication.factor: >= 3
  - min.insync.replicas: >= 2
  - retention.ms: 根据业务需求

生产者:
  - acks: all
  - enable.idempotence: true
  - retries: Integer.MAX_VALUE
  - max.in.flight.requests.per.connection: 1(顺序场景)

消费者:
  - enable.auto.commit: false
  - max.poll.records: 根据处理能力
  - partition.assignment.strategy: CooperativeStickyAssignor

监控:
  - LAG(消费延迟)
  - ISR 副本数
  - Rebalance 频率
  - 生产/消费吞吐量
```

### 9.3 延伸学习

**深入理解**:
- Kafka 源码:日志存储、网络层、Controller
- Kafka Streams:流处理框架
- Kafka Connect:数据集成工具

**生态工具**:
- Schema Registry:消息格式管理
- Kafka Manager:集群管理工具
- Burrow:消费者延迟监控
- MirrorMaker:跨集群复制

**相关技术**:
- Pulsar:云原生消息系统
- RocketMQ:阿里开源消息系统
- Flink:流处理引擎

## 版本差异(旧版 → 当前)

| 组件 | 旧版（本文编写时） | 当前 |
|------|-------------------|------|
| RabbitMQ | 3.8/3.9 | 3.13/4.x（quorum queue 为默认推荐） |
| Kafka | 2.x/3.0 | 3.7+/4.x（KRaft 模式取代 ZooKeeper） |
| RocketMQ | 4.x | 5.x（gRPC 通信、简化运维） |
| Java 版本 | JDK 8 | JDK 17+（Kafka 3.7+ 客户端要求） |

> 本文讲解的消息可靠性设计（投递确认、死信、幂等、顺序）原理不变；注意各中间件版本升级后的配置差异，如 Kafka 的 KRaft 模式、RabbitMQ 的 quorum queue。
