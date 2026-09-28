---
title: "RocketMQ事务消息与顺序消息"
description: "RocketMQ 是阿里巴巴开源的分布式消息中间件,在国内外业务系统中广泛应用。相比其他 MQ,RocketMQ 的核心优势在于:"
keywords: [RocketMQ, 事务消息, 顺序消息, 延迟等级]
category: "Java"
tags: [Java, 消息队列]
---


# RocketMQ 事务消息与顺序消息

## 概述

RocketMQ 是阿里巴巴开源的分布式消息中间件,在国内外业务系统中广泛应用。相比其他 MQ,RocketMQ 的核心优势在于:

- **事务消息**:实现本地事务与消息发送的最终一致性,解决分布式事务难题
- **顺序消息**:保证消息的严格顺序,满足订单状态流转等业务场景
- **高吞吐低延迟**:单机支持万级 QPS,延迟在毫秒级别
- **消息可靠性高**:支持消息追溯、消息过滤、消息重试等特性

本节重点讲解 RocketMQ 最核心的两个特性:**事务消息**和**顺序消息**。

## RocketMQ 架构详解

### 整体架构

RocketMQ 采用 NameServer + Broker 的架构设计:

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Producer   │──────▶│   Broker    │◀──────│  Consumer   │
└─────────────┘       └─────────────┘       └─────────────┘
       │                      │                      │
       │                      ▼                      │
       │              ┌─────────────┐                │
       └─────────────▶│ NameServer  │◀───────────────┘
                      └─────────────┘
```

### 核心组件

#### NameServer(名字服务器)

**作用**: 轻量级注册中心,管理 Broker 路由信息

**特点**:
- 无状态设计,节点之间互不通信
- 每个 NameServer 都有完整的路由信息
- Broker 定期向所有 NameServer 发送心跳
- Producer/Consumer 从 NameServer 获取路由信息

**配置示例**:
```properties
# NameServer 配置
listenPort=9876
# 心跳检测间隔(秒)
scanNotActiveBrokerInterval=120
```

#### Broker(消息服务器)

**作用**: 消息存储、转发、查询的核心组件

**核心概念**:

| 概念 | 说明 | 示例 |
|------|------|------|
| **Topic** | 消息主题,消息的第一级分类 | `ORDER_TOPIC` |
| **Queue** | 消息队列,消息的第二级分类 | `ORDER_TOPIC` 下 4 个 Queue |
| **BrokerId** | Broker 标识 | Master=0, Slave>0 |
| **BrokerRole** | 角色 | ASYNC_MASTER、SYNC_MASTER、SLAVE |

**存储结构**:
```
${storeRoot}/
├── commitlog/          # 所有消息统一存储
│   ├── 00000000000000000000
│   ├── 00000000001073741824
│   └── ...
├── consumequeue/       # 消费队列索引
│   └── TopicName/
│       └── QueueId/
│           ├── 00000000000000000000
│           └── ...
└── index/             # 消息索引(按Key查询)
    └── ...
```

**关键配置**:
```properties
# Broker 基础配置
brokerClusterName=DefaultCluster
brokerName=broker-a
brokerId=0
listenPort=10911

# 存储配置
storePathRootDir=/data/rocketmq/store
storePathCommitLog=/data/rocketmq/store/commitlog

# 刷盘策略
flushDiskType=ASYNC_FLUSH  # 异步刷盘
# flushDiskType=SYNC_FLUSH  # 同步刷盘

# 主从复制
brokerRole=ASYNC_MASTER  # 异步复制
# brokerRole=SYNC_MASTER  # 同步复制
# brokerRole=SLAVE        # 从节点
```

#### Producer(生产者)

**作用**: 发送消息的应用

**核心特性**:
- 支持 3 种发送方式:同步、异步、单向
- 支持消息重试和容错
- 支持 Batch 发送
- 支持延迟消息

**代码示例**:
```java
// 创建生产者
DefaultMQProducer producer = new DefaultMQProducer("ORDER_PRODUCER_GROUP");
producer.setNamesrvAddr("localhost:9876");
producer.start();

// 同步发送
Message msg = new Message("ORDER_TOPIC", "TAGA", "Hello RocketMQ".getBytes());
SendResult result = producer.send(msg);
System.out.println(result);

// 异步发送
producer.send(msg, new SendCallback() {
    @Override
    public void onSuccess(SendResult sendResult) {
        System.out.println("发送成功:" + sendResult);
    }
    
    @Override
    public void onException(Throwable e) {
        System.err.println("发送失败:" + e);
    }
});

// 单向发送(不关心结果)
producer.sendOneway(msg);

producer.shutdown();
```

#### Consumer(消费者)

**作用**: 接收消息的应用

**两种消费模式**:

| 模式 | 说明 | 适用场景 | 特点 |
|------|------|----------|------|
| **集群消费** | 消息被多个消费者均摊消费 | 微服务间解耦 | 每条消息只被一个消费者消费 |
| **广播消费** | 消息被所有消费者都消费 | 缓存更新、配置同步 | 每个消费者都收到全量消息 |

**代码示例**:
```java
// 集群消费(默认)
DefaultMQPushConsumer consumer = new DefaultMQPushConsumer("ORDER_CONSUMER_GROUP");
consumer.setNamesrvAddr("localhost:9876");
consumer.subscribe("ORDER_TOPIC", "TAGA || TAGB");
consumer.registerMessageListener(new MessageListenerConcurrently() {
    @Override
    public ConsumeConcurrentlyStatus consumeMessage(List<MessageExt> msgs, ConsumeConcurrentlyContext context) {
        msgs.forEach(msg -> {
            System.out.println("收到消息:" + new String(msg.getBody()));
        });
        return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
    }
});
consumer.start();

// 广播消费(需在 start() 之前设置)
// consumer.setMessageModel(MessageModel.BROADCASTING);
```

### 消息流转完整流程

```
┌──────────────────────────────────────────────────────────┐
│                     消息发送流程                          │
└──────────────────────────────────────────────────────────┘
Producer → NameServer(获取路由) → Broker(Master) → CommitLog
                                      ↓
                               ConsumeQueue ← Consumer

详细步骤:
1. Producer 启动,从 NameServer 获取 Topic 路由信息
2. Producer 选择一个 Queue 发送消息
3. Broker 将消息写入 CommitLog(顺序写入,高性能)
4. Broker 异步构建 ConsumeQueue(消费队列索引)
5. Consumer 从 Broker 拉取消息(长轮询机制)
6. Consumer 消费成功后返回 ACK
7. Broker 更新消费进度(offset)
```

## 事务消息原理与实现

### 为什么需要事务消息

在分布式系统中,常见的一致性问题场景:

#### 问题场景一:本地事务成功但消息未发送

```java
@Transactional
public void createOrder(Order order) {
    // 1. 插入订单
    orderMapper.insert(order);
    
    // 2. 发送消息
    producer.send(new Message("ORDER_TOPIC", order.toString()));
    
    // 问题:如果消息发送失败,但事务已提交
    // 结果:订单创建成功,但下游系统未收到通知,数据不一致
}
```

#### 问题场景二:消息发送成功但本地事务失败

```java
public void createOrder(Order order) {
    // 1. 发送消息(先发消息)
    producer.send(new Message("ORDER_TOPIC", order.toString()));
    
    // 2. 插入订单
    try {
        orderMapper.insert(order);
    } catch (Exception e) {
        // 问题:消息已发送,但订单插入失败
        // 结果:下游系统收到订单消息,但订单库中没有这条记录
        return;
    }
}
```

### RocketMQ 事务消息解决方案

RocketMQ 采用**两阶段提交 + 回查机制**实现事务消息:

#### 核心流程

```
┌─────────────────────────────────────────────────────────────┐
│                    事务消息完整流程                           │
└─────────────────────────────────────────────────────────────┘

第一阶段:发送半消息(Half Message)
┌──────────┐      ┌──────────┐      ┌──────────┐
│Producer  │─────▶│ Broker   │─────▶│CommitLog │
└──────────┘ ①   └──────────┘ ②   └──────────┘
              发送半消息      暂存(不可消费)

第二阶段:执行本地事务
┌──────────┐      ┌──────────┐
│Producer  │─────▶│本地事务   │
└──────────┘ ③   └──────────┘
              执行本地事务

第三阶段:提交或回滚
┌──────────┐      ┌──────────┐      ┌──────────┐
│Producer  │─────▶│ Broker   │─────▶│CommitLog │
└──────────┘ ④   └──────────┘ ⑤   └──────────┘
              通知事务状态    更新消息状态

异常情况:事务状态回查
┌──────────┐      ┌──────────┐      ┌──────────┐
│ Broker   │─────▶│Producer  │─────▶│本地事务表 │
└──────────┘ ⑥   └──────────┘ ⑦   └──────────┘
              回查事务状态    查询事务结果
```

#### 半消息(Half Message)

**定义**: 暂时不能被 Consumer 消费的消息,存储在 Broker 但标记为"待确认"

**特点**:
- 消息已写入 CommitLog
- 但未写入 ConsumeQueue,Consumer 无法拉取
- 消息属性中带有 `TRANSACTION_CHECK_TIMES`(回查次数)

### 事务消息完整实现

#### 代码实现

```java
public class TransactionProducer {
    public static void main(String[] args) throws Exception {
        // 1. 创建事务消息生产者
        TransactionMQProducer producer = new TransactionMQProducer("ORDER_TRANSACTION_GROUP");
        producer.setNamesrvAddr("localhost:9876");
        
        // 2. 设置事务监听器
        producer.setTransactionListener(new TransactionListener() {
            
            // 执行本地事务
            @Override
            public LocalTransactionState executeLocalTransaction(Message msg, Object arg) {
                try {
                    // 解析消息
                    String orderId = msg.getKeys();
                    Order order = JSON.parseObject(new String(msg.getBody()), Order.class);
                    
                    // 执行本地事务(插入订单)
                    orderService.createOrder(order);
                    
                    // 本地事务成功,提交消息
                    return LocalTransactionState.COMMIT_MESSAGE;
                    
                } catch (Exception e) {
                    // 本地事务失败,回滚消息
                    return LocalTransactionState.ROLLBACK_MESSAGE;
                }
            }
            
            // 事务状态回查
            @Override
            public LocalTransactionState checkLocalTransaction(MessageExt msg) {
                try {
                    String orderId = msg.getKeys();
                    
                    // 查询本地事务状态
                    Order order = orderService.getByOrderId(orderId);
                    
                    if (order != null) {
                        // 订单存在,说明事务成功,提交消息
                        return LocalTransactionState.COMMIT_MESSAGE;
                    } else {
                        // 订单不存在,说明事务失败,回滚消息
                        return LocalTransactionState.ROLLBACK_MESSAGE;
                    }
                    
                } catch (Exception e) {
                    // 查询失败,稍后重试
                    return LocalTransactionState.UNKNOW;
                }
            }
        });
        
        // 3. 设置事务回查线程池
        producer.setCheckThreadPoolMinSize(5);
        producer.setCheckThreadPoolMaxSize(20);
        producer.setCheckRequestHoldMax(2000);
        
        producer.start();
        
        // 4. 发送事务消息
        Order order = new Order("ORDER_123", "用户A", 100.0);
        Message msg = new Message(
            "ORDER_TOPIC", 
            "TAGA",
            order.getOrderId(),  // Key,用于回查
            JSON.toJSONString(order).getBytes()
        );
        
        // arg 参数会传递给 executeLocalTransaction
        TransactionSendResult result = producer.sendMessageInTransaction(msg, order);
        
        System.out.println("发送结果:" + result.getLocalTransactionState());
        
        // producer.shutdown();  // 生产环境不关闭
    }
}
```

#### 本地事务表设计

```sql
CREATE TABLE `transaction_log` (
  `transaction_id` varchar(64) NOT NULL COMMENT '事务ID',
  `order_id` varchar(64) NOT NULL COMMENT '订单ID',
  `status` tinyint NOT NULL COMMENT '事务状态:0-执行中,1-成功,2-失败',
  `create_time` datetime NOT NULL COMMENT '创建时间',
  `update_time` datetime DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`transaction_id`),
  KEY `idx_order_id` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='事务日志表';
```

#### 完整业务流程

```java
@Service
public class OrderService {
    
    @Autowired
    private OrderMapper orderMapper;
    
    @Autowired
    private TransactionLogMapper transactionLogMapper;
    
    /**
     * 执行本地事务(带事务日志)
     */
    @Transactional
    public void createOrder(Order order) {
        String transactionId = UUID.randomUUID().toString();
        
        try {
            // 1. 插入事务日志(状态:执行中)
            TransactionLog log = new TransactionLog();
            log.setTransactionId(transactionId);
            log.setOrderId(order.getOrderId());
            log.setStatus(0);  // 执行中
            transactionLogMapper.insert(log);
            
            // 2. 插入订单
            orderMapper.insert(order);
            
            // 3. 更新事务日志(状态:成功)
            transactionLogMapper.updateStatus(transactionId, 1);
            
        } catch (Exception e) {
            // 更新事务日志(状态:失败)
            transactionLogMapper.updateStatus(transactionId, 2);
            throw e;
        }
    }
    
    /**
     * 查询事务状态(用于回查)
     */
    public LocalTransactionState checkTransactionState(String orderId) {
        TransactionLog log = transactionLogMapper.getByOrderId(orderId);
        
        if (log == null) {
            // 事务日志不存在,说明事务未执行
            return LocalTransactionState.ROLLBACK_MESSAGE;
        }
        
        switch (log.getStatus()) {
            case 1:  // 成功
                return LocalTransactionState.COMMIT_MESSAGE;
            case 2:  // 失败
                return LocalTransactionState.ROLLBACK_MESSAGE;
            default:  // 执行中
                return LocalTransactionState.UNKNOW;
        }
    }
}
```

### 事务消息配置详解

#### Broker 配置

```properties
# 事务消息相关配置
# 事务消息检查间隔(毫秒),默认 60 秒
transactionCheckInterval=60000

# 事务消息最大检查次数,默认 15 次
transactionCheckMax=15

# 事务消息超时时间(毫秒),默认 6 小时
transactionTimeOut=21600000
```

#### Producer 配置

```java
// 设置事务回查线程池
producer.setCheckThreadPoolMinSize(5);        // 最小线程数
producer.setCheckThreadPoolMaxSize(20);       // 最大线程数
producer.setCheckRequestHoldMax(2000);        // 最大等待请求数
```

### 事务消息注意事项

#### 1. 幂等性设计

**问题**: 消费者可能重复消费事务消息

**解决方案**:
```java
@Component
public class OrderConsumer {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    @RocketMQMessageListener(
        topic = "ORDER_TOPIC",
        consumerGroup = "ORDER_CONSUMER_GROUP"
    )
    public void onMessage(MessageExt message) {
        String orderId = message.getKeys();
        String msgId = message.getMsgId();
        
        // 1. 幂等性检查(使用 Redis)
        String key = "order:consume:" + msgId;
        Boolean success = redisTemplate.opsForValue().setIfAbsent(key, "1", 1, TimeUnit.DAYS);
        
        if (!success) {
            // 消息已消费,直接返回成功
            return;
        }
        
        try {
            // 2. 业务处理
            Order order = JSON.parseObject(new String(message.getBody()), Order.class);
            processOrder(order);
            
            // 3. 消费成功
            System.out.println("订单消费成功:" + orderId);
            
        } catch (Exception e) {
            // 4. 消费失败,删除 Redis 标记,等待重试
            redisTemplate.delete(key);
            throw new RuntimeException("消费失败", e);
        }
    }
}
```

#### 2. 事务状态回查优化

**最佳实践**:
- 本地事务表必须记录事务状态
- 回查逻辑要快速、轻量
- 回查次数要有上限,避免无限重试
- 回查失败要有告警机制

```java
@Override
public LocalTransactionState checkLocalTransaction(MessageExt msg) {
    String orderId = msg.getKeys();
    
    // 限制回查次数
    int checkTimes = msg.getReconsumeTimes();
    if (checkTimes > 5) {
        // 超过最大回查次数,人工介入
        alertService.sendAlert("事务回查超限:" + orderId);
        return LocalTransactionState.ROLLBACK_MESSAGE;
    }
    
    // 查询事务状态
    LocalTransactionState state = transactionService.checkState(orderId);
    
    // 记录回查日志
    log.info("事务回查:orderId={}, state={}, times={}", orderId, state, checkTimes);
    
    return state;
}
```

#### 3. 事务超时处理

**问题**: 事务执行时间过长,导致 Broker 频繁回查

**解决方案**:
- 合理设置 `transactionTimeOut`
- 异步事务采用状态机管理
- 长事务考虑 Saga 模式

```java
// 方案一:延长超时时间
producer.setTransactionTimeOut(3600000);  // 1 小时

// 方案二:异步事务状态机
public enum TransactionStatus {
    STARTED,      // 事务开始
    PROCESSING,   // 处理中
    SUCCESS,      // 成功
    FAILED,       // 失败
    COMPENSATING  // 补偿中
}

@Override
public LocalTransactionState checkLocalTransaction(MessageExt msg) {
    String orderId = msg.getKeys();
    TransactionStatus status = transactionService.getStatus(orderId);
    
    switch (status) {
        case SUCCESS:
            return LocalTransactionState.COMMIT_MESSAGE;
        case FAILED:
        case COMPENSATING:
            return LocalTransactionState.ROLLBACK_MESSAGE;
        default:  // STARTED, PROCESSING
            return LocalTransactionState.UNKNOW;  // 稍后重试
    }
}
```

## 顺序消息实现方案

### 为什么需要顺序消息

#### 业务场景

**场景一:订单状态流转**

订单状态必须按顺序处理:
```
订单创建 → 支付成功 → 发货 → 确认收货
```

如果乱序处理,可能导致:
- 先处理"发货",再处理"支付成功" → 业务异常
- 先处理"取消订单",再处理"支付成功" → 数据不一致

**场景二:数据库 Binlog 同步**

```
INSERT → UPDATE → DELETE
```

如果乱序,会导致数据状态错误。

### RocketMQ 顺序消息原理

#### 全局顺序 vs 分区顺序

| 类型 | 说明 | 性能 | 适用场景 | 实现 |
|------|------|------|----------|------|
| **全局顺序** | 所有消息严格按 FIFO | 低(单队列串行) | Binlog 同步 | Topic 下只 1 个 Queue |
| **分区顺序** | 同一 Queue 内有序 | 高(多队列并行) | 订单状态流转 | 按 Key 路由到同一 Queue |

**核心思想**: RocketMQ 只保证 **Queue 级别的顺序**,不保证全局顺序。

#### 实现原理

```
┌─────────────────────────────────────────────────────────┐
│                   顺序消息实现原理                        │
└─────────────────────────────────────────────────────────┘

Producer 选择 Queue 的逻辑:
┌──────────────────────────────────────────────────────────┐
│ MessageQueueSelector.select(List<MessageQueue> mqs,      │
│                            Message msg, Object arg)      │
│ {                                                         │
│     int index = arg.hashCode() % mqs.size();             │
│     return mqs.get(Math.abs(index));                     │
│ }                                                         │
└──────────────────────────────────────────────────────────┘

示例:订单 ORDER_123 的所有消息都发送到 Queue 2
┌──────────┐      ┌──────────────────────────────────┐
│Producer  │      │ Topic: ORDER_TOPIC               │
│          │      │  ┌─────────┐ ┌─────────┐        │
│ ORDER_123├──────┼─▶│ Queue 0 │ │ Queue 1 │        │
│ ORDER_456├──────┼─▶│         │ │         │        │
│ ORDER_123├──────┼──┼──┐      │ │         │        │
│ ORDER_789├──────┼─▶│  │      │ │         │        │
│ ORDER_123├──────┼──┼──┼──────┼─┤ Queue 2 │◀───┐   │
└──────────┘      │  │  │      │ │  msg1   │    │   │
                  │  │  │      │ │  msg2   │    │   │
                  │  │  │      │ │  msg3   │    │   │
                  │  │  │      │ └─────────┘    │   │
                  │  │  │      │                │   │
                  └──┼──┼──────┘                │   │
                     │  └───────────────────────┘   │
                     │    ORDER_123.hashCode() % 3 = 2 │
                     └────────────────────────────────┘
```

### 顺序消息完整实现

#### 生产者实现

```java
public class OrderProducer {
    public static void main(String[] args) throws Exception {
        DefaultMQProducer producer = new DefaultMQProducer("ORDER_PRODUCER_GROUP");
        producer.setNamesrvAddr("localhost:9876");
        producer.start();
        
        // 订单ID(同一个订单的消息发送到同一个 Queue)
        String orderId = "ORDER_123";
        
        // 发送顺序消息
        for (int i = 1; i <= 5; i++) {
            String content = "订单 " + orderId + " 第 " + i + " 条消息";
            Message msg = new Message("ORDER_TOPIC", "TAGA", orderId, content.getBytes());
            
            // 关键:使用 MessageQueueSelector 指定 Queue
            SendResult result = producer.send(msg, new MessageQueueSelector() {
                @Override
                public MessageQueue select(List<MessageQueue> mqs, Message msg, Object arg) {
                    // arg = orderId,根据订单ID选择 Queue
                    Long orderId = Long.parseLong(arg.toString().split("_")[1]);
                    long index = orderId % mqs.size();
                    return mqs.get((int) index);
                }
            }, orderId);
            
            System.out.println("发送结果:" + result);
        }
        
        producer.shutdown();
    }
}
```

#### 消费者实现

**关键**: 使用 `MessageListenerOrderly` 接口,保证顺序消费

```java
public class OrderConsumer {
    public static void main(String[] args) throws Exception {
        DefaultMQPushConsumer consumer = new DefaultMQPushConsumer("ORDER_CONSUMER_GROUP");
        consumer.setNamesrvAddr("localhost:9876");
        consumer.subscribe("ORDER_TOPIC", "TAGA");
        
        // 关键:使用 MessageListenerOrderly 接口
        consumer.registerMessageListener(new MessageListenerOrderly() {
            @Override
            public ConsumeOrderlyStatus consumeMessage(List<MessageExt> msgs, 
                                                        ConsumeOrderlyContext context) {
                msgs.forEach(msg -> {
                    System.out.println("消费消息:" + new String(msg.getBody()) 
                                     + ", QueueId=" + msg.getQueueId()
                                     + ", Offset=" + msg.getQueueOffset());
                });
                return ConsumeOrderlyStatus.SUCCESS;
            }
        });
        
        consumer.start();
        System.out.println("消费者启动成功");
    }
}
```

#### 顺序消费原理

```
┌────────────────────────────────────────────────────────┐
│                MessageListenerOrderly 原理              │
└────────────────────────────────────────────────────────┘

消费者对每个 Queue 加锁:
┌─────────────────────────────────────────────────────────┐
│ Queue 0: ┌───────────┐                                  │
│          │ Lock      │  Consumer Thread 1               │
│          └───────────┘  (独占消费)                       │
│                                                         │
│ Queue 1: ┌───────────┐                                  │
│          │ Lock      │  Consumer Thread 2               │
│          └───────────┘  (独占消费)                       │
│                                                         │
│ Queue 2: ┌───────────┐                                  │
│          │ Lock      │  Consumer Thread 3               │
│          └───────────┘  (独占消费)                       │
└─────────────────────────────────────────────────────────┘

关键点:
1. 同一个 Queue 只能被一个消费者线程处理
2. 消费成功后才处理下一条消息
3. 消费失败会阻塞当前 Queue,不影响其他 Queue
```

### 顺序消息常见问题

#### 问题一:消息堆积

**原因**: 顺序消费是串行处理,单条消息处理慢会导致整个 Queue 堆积

**解决方案**:
```java
// 方案一:异步处理 + 本地缓存
consumer.registerMessageListener(new MessageListenerOrderly() {
    @Override
    public ConsumeOrderlyStatus consumeMessage(List<MessageExt> msgs, 
                                                ConsumeOrderlyContext context) {
        msgs.forEach(msg -> {
            String orderId = msg.getKeys();
            
            // 快速存入本地缓存,异步处理
            CacheManager.put(orderId, msg);
            
            // 异步线程池处理(保证同一 orderId 的消息串行)
            executorService.submit(() -> {
                // 根据 orderId 获取对应的串行队列
                Queue<MessageExt> queue = getOrCreateQueue(orderId);
                queue.offer(msg);
                
                // 串行处理
                while (!queue.isEmpty()) {
                    MessageExt m = queue.poll();
                    processMessage(m);
                }
            });
        });
        return ConsumeOrderlyStatus.SUCCESS;
    }
});

// 方案二:增加 Queue 数量,提高并发度
// 创建 Topic 时指定 Queue 数量
mqadmin updateTopic -n localhost:9876 -t ORDER_TOPIC -c DefaultCluster -r 16 -w 16
```

#### 问题二:消费失败阻塞

**问题**: 顺序消费失败后,会阻塞整个 Queue,后续消息无法处理

**解决方案**:
```java
consumer.registerMessageListener(new MessageListenerOrderly() {
    @Override
    public ConsumeOrderlyStatus consumeMessage(List<MessageExt> msgs, 
                                                ConsumeOrderlyContext context) {
        for (MessageExt msg : msgs) {
            try {
                processMessage(msg);
            } catch (Exception e) {
                // 重试次数
                int reconsumeTimes = msg.getReconsumeTimes();
                
                if (reconsumeTimes < 3) {
                    // 重试
                    return ConsumeOrderlyStatus.SUSPEND_CURRENT_QUEUE_A_MOMENT;
                } else {
                    // 超过最大重试次数,记录日志,跳过此消息
                    log.error("消息消费失败,超过最大重试次数:msgId={}", msg.getMsgId(), e);
                    
                    // 存入死信队列或数据库,人工处理
                    saveToDeadLetterQueue(msg);
                    
                    // 返回成功,继续处理下一条
                    continue;
                }
            }
        }
        return ConsumeOrderlyStatus.SUCCESS;
    }
});
```

#### 问题三:Queue 数量规划

**最佳实践**:
- Queue 数量 = 消费者数量 × 每个消费者的线程数
- 太少:并发度不够,性能低
- 太多:消费者负载不均衡

```bash
# 查看Topic的Queue数量
mqadmin topicRoute -n localhost:9876 -t ORDER_TOPIC

# 动态调整Queue数量
mqadmin updateTopic -n localhost:9876 -t ORDER_TOPIC -c DefaultCluster -r 8 -w 8
```

### 顺序消息 vs 非顺序消息对比

| 对比项 | 顺序消费 | 并发消费 |
|--------|----------|----------|
| **接口** | MessageListenerOrderly | MessageListenerConcurrently |
| **并发度** | Queue 级别串行 | Queue 级别并行 |
| **吞吐量** | 低 | 高 |
| **延迟** | 高(单条消息阻塞整个 Queue) | 低 |
| **适用场景** | 订单状态、Binlog 同步 | 普通业务消息 |
| **失败处理** | 阻塞当前 Queue | 跳过失败消息,处理后续消息 |
| **性能优化** | 增加 Queue 数量 | 增加消费者线程数 |

## 消息重试机制详解

### Producer 重试机制

#### 同步发送重试

```java
DefaultMQProducer producer = new DefaultMQProducer("PRODUCER_GROUP");
producer.setNamesrvAddr("localhost:9876");

// 设置重试次数(默认 2 次)
producer.setRetryTimesWhenSendFailed(3);

// 同步发送(会自动重试)
Message msg = new Message("TOPIC", "Hello".getBytes());
SendResult result = producer.send(msg);

System.out.println("发送结果:" + result.getSendStatus());
```

#### 异步发送重试

```java
// 设置异步发送重试次数
producer.setRetryTimesWhenSendAsyncFailed(3);

// 异步发送
producer.send(msg, new SendCallback() {
    @Override
    public void onSuccess(SendResult sendResult) {
        System.out.println("发送成功");
    }
    
    @Override
    public void onException(Throwable e) {
        System.err.println("发送失败:" + e);
        // 注意:超过重试次数后会触发此回调
    }
});
```

### Consumer 重试机制

#### 重试策略

```
┌──────────────────────────────────────────────────────────┐
│                 消费者重试策略                             │
└──────────────────────────────────────────────────────────┘

消费失败 → 消息进入重试队列(RETRY_TOPIC)
           ↓
       延迟一段时间后重新投递
           ↓
       重试次数 + 1
           ↓
    ┌──────┴──────┐
    │             │
成功消费      超过最大重试次数(16次)
    │             │
正常结束    进入死信队列(DLQ)

重试时间间隔(指数退避):
第1次: 10秒   第2次: 30秒   第3次: 1分钟
第4次: 2分钟  第5次: 3分钟  第6次: 4分钟
第7次: 5分钟  第8次: 6分钟  第9次: 7分钟
第10次: 8分钟 第11次: 9分钟 第12次: 10分钟
第13次: 20分钟 第14次: 30分钟 第15次: 1小时
第16次: 2小时
```

#### 代码示例

```java
DefaultMQPushConsumer consumer = new DefaultMQPushConsumer("CONSUMER_GROUP");
consumer.setNamesrvAddr("localhost:9876");
consumer.subscribe("ORDER_TOPIC", "*");

// 设置最大重试次数(默认 16 次)
consumer.setMaxReconsumeTimes(16);

consumer.registerMessageListener(new MessageListenerConcurrently() {
    @Override
    public ConsumeConcurrentlyStatus consumeMessage(List<MessageExt> msgs, 
                                                     ConsumeConcurrentlyContext context) {
        for (MessageExt msg : msgs) {
            try {
                processMessage(msg);
            } catch (Exception e) {
                // 消费失败
                int reconsumeTimes = msg.getReconsumeTimes();
                log.warn("消息消费失败:msgId={}, times={}", msg.getMsgId(), reconsumeTimes);
                
                // 返回 RECONSUME_LATER,消息会进入重试队列
                return ConsumeConcurrentlyStatus.RECONSUME_LATER;
            }
        }
        return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
    }
});

consumer.start();
```

### 死信队列(Dead Letter Queue)

#### 原理

```
消息重试 16 次失败后,进入死信队列:

原Topic: ORDER_TOPIC
死信Topic: %DLQ%CONSUMER_GROUP

死信队列特点:
1. Topic 名称为 %DLQ% + ConsumerGroup
2. 死信消息不会再被自动消费
3. 需要人工介入或程序处理
```

#### 处理死信消息

```java
// 消费死信队列
DefaultMQPushConsumer dlqConsumer = new DefaultMQPushConsumer("DLQ_HANDLER_GROUP");
dlqConsumer.setNamesrvAddr("localhost:9876");

// 订阅死信队列
dlqConsumer.subscribe("%DLQ%CONSUMER_GROUP", "*");

dlqConsumer.registerMessageListener(new MessageListenerConcurrently() {
    @Override
    public ConsumeConcurrentlyStatus consumeMessage(List<MessageExt> msgs, 
                                                     ConsumeConcurrentlyContext context) {
        for (MessageExt msg : msgs) {
            // 记录日志
            log.error("死信消息:msgId={}, topic={}, keys={}", 
                     msg.getMsgId(), msg.getTopic(), msg.getKeys());
            
            // 发送告警
            alertService.sendAlert("发现死信消息:" + msg.getMsgId());
            
            // 存入数据库,人工处理
            deadLetterService.save(msg);
        }
        return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
    }
});

dlqConsumer.start();
```

### 重试最佳实践

#### 1. 区分业务异常和系统异常

```java
@Override
public ConsumeConcurrentlyStatus consumeMessage(List<MessageExt> msgs, 
                                                 ConsumeConcurrentlyContext context) {
    for (MessageExt msg : msgs) {
        try {
            processMessage(msg);
        } catch (BusinessException e) {
            // 业务异常(如参数错误、数据不存在)
            // 重试也无效,直接记录日志,跳过此消息
            log.error("业务异常,跳过消息:msgId={}, error={}", msg.getMsgId(), e.getMessage());
            return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
            
        } catch (SystemException e) {
            // 系统异常(如数据库连接超时、下游服务不可用)
            // 可以重试
            log.warn("系统异常,稍后重试:msgId={}", msg.getMsgId(), e);
            return ConsumeConcurrentlyStatus.RECONSUME_LATER;
        }
    }
    return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
}
```

#### 2. 自定义重试次数

```java
// 根据消息类型设置不同的重试次数
Message msg = new Message("TOPIC", "TAGA", "Hello".getBytes());

// 关键消息:多重试几次
if (isCriticalMessage(msg)) {
    consumer.setMaxReconsumeTimes(20);
} else {
    // 普通消息:少重试几次
    consumer.setMaxReconsumeTimes(5);
}
```

#### 3. 重试告警机制

```java
@Override
public ConsumeConcurrentlyStatus consumeMessage(List<MessageExt> msgs, 
                                                 ConsumeConcurrentlyContext context) {
    for (MessageExt msg : msgs) {
        int reconsumeTimes = msg.getReconsumeTimes();
        
        // 重试次数超过阈值,发送告警
        if (reconsumeTimes >= 10) {
            alertService.sendAlert(
                "消息重试次数过多:msgId=" + msg.getMsgId() + 
                ", times=" + reconsumeTimes
            );
        }
        
        try {
            processMessage(msg);
        } catch (Exception e) {
            return ConsumeConcurrentlyStatus.RECONSUME_LATER;
        }
    }
    return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
}
```

## RocketMQ 实战案例

### 案例一:电商订单事务消息

#### 业务需求

用户下单后,需要保证:
1. 订单库插入成功
2. 库存扣减成功
3. 积分发放成功
4. 支付成功后,通知发货

#### 实现方案

```java
@Service
public class OrderTransactionService {
    
    @Autowired
    private TransactionMQProducer producer;
    
    @Autowired
    private OrderService orderService;
    
    @Autowired
    private TransactionLogService transactionLogService;
    
    /**
     * 创建订单(事务消息)
     */
    public void createOrder(OrderDTO orderDTO) throws Exception {
        // 1. 准备事务消息
        Message msg = new Message(
            "ORDER_TOPIC",
            "ORDER_CREATE",
            orderDTO.getOrderId(),
            JSON.toJSONString(orderDTO).getBytes()
        );
        
        // 2. 发送事务消息
        TransactionSendResult result = producer.sendMessageInTransaction(msg, orderDTO);
        
        if (result.getLocalTransactionState() == LocalTransactionState.ROLLBACK_MESSAGE) {
            throw new RuntimeException("订单创建失败");
        }
    }
    
    /**
     * 事务监听器
     */
    @Component
    public class OrderTransactionListener implements TransactionListener {
        
        @Override
        public LocalTransactionState executeLocalTransaction(Message msg, Object arg) {
            OrderDTO orderDTO = (OrderDTO) arg;
            String transactionId = UUID.randomUUID().toString();
            
            try {
                // 1. 插入事务日志
                transactionLogService.insert(transactionId, orderDTO.getOrderId(), 0);
                
                // 2. 创建订单(扣减库存、发放积分)
                orderService.createOrder(orderDTO);
                
                // 3. 更新事务状态为成功
                transactionLogService.updateStatus(transactionId, 1);
                
                return LocalTransactionState.COMMIT_MESSAGE;
                
            } catch (Exception e) {
                // 更新事务状态为失败
                transactionLogService.updateStatus(transactionId, 2);
                
                return LocalTransactionState.ROLLBACK_MESSAGE;
            }
        }
        
        @Override
        public LocalTransactionState checkLocalTransaction(MessageExt msg) {
            String orderId = msg.getKeys();
            
            // 查询事务状态
            Integer status = transactionLogService.getStatus(orderId);
            
            if (status == null) {
                return LocalTransactionState.ROLLBACK_MESSAGE;
            }
            
            switch (status) {
                case 1:
                    return LocalTransactionState.COMMIT_MESSAGE;
                case 2:
                    return LocalTransactionState.ROLLBACK_MESSAGE;
                default:
                    return LocalTransactionState.UNKNOW;
            }
        }
    }
}
```

#### 消费者实现

```java
@Component
@RocketMQMessageListener(
    topic = "ORDER_TOPIC",
    tags = "ORDER_CREATE",
    consumerGroup = "ORDER_CONSUMER_GROUP"
)
public class OrderConsumer implements RocketMQListener<String> {
    
    @Autowired
    private InventoryService inventoryService;
    
    @Autowired
    private PointService pointService;
    
    @Override
    public void onMessage(String message) {
        OrderDTO orderDTO = JSON.parseObject(message, OrderDTO.class);
        
        try {
            // 扣减库存
            inventoryService.deduct(orderDTO.getProductId(), orderDTO.getQuantity());
            
            // 发放积分
            pointService.issue(orderDTO.getUserId(), orderDTO.getAmount());
            
            log.info("订单处理成功:orderId={}", orderDTO.getOrderId());
            
        } catch (Exception e) {
            log.error("订单处理失败:orderId={}", orderDTO.getOrderId(), e);
            throw new RuntimeException("订单处理失败", e);
        }
    }
}
```

### 案例二:订单状态顺序流转

#### 业务需求

订单状态流转:创建 → 支付 → 发货 → 收货,必须严格按顺序处理。

#### 实现方案

```java
@Service
public class OrderStatusService {
    
    @Autowired
    private DefaultMQProducer producer;
    
    /**
     * 发送订单状态变更消息
     */
    public void sendOrderStatusMessage(String orderId, OrderStatus status) throws Exception {
        OrderStatusMessage msg = new OrderStatusMessage();
        msg.setOrderId(orderId);
        msg.setStatus(status);
        msg.setTimestamp(System.currentTimeMillis());
        
        Message message = new Message(
            "ORDER_STATUS_TOPIC",
            "STATUS_CHANGE",
            orderId,
            JSON.toJSONString(msg).getBytes()
        );
        
        // 关键:根据 orderId 选择 Queue,保证顺序
        producer.send(message, new MessageQueueSelector() {
            @Override
            public MessageQueue select(List<MessageQueue> mqs, Message msg, Object arg) {
                String orderId = (String) arg;
                int index = Math.abs(orderId.hashCode()) % mqs.size();
                return mqs.get(index);
            }
        }, orderId);
    }
}
```

#### 消费者实现

```java
@Service
@RocketMQMessageListener(
    topic = "ORDER_STATUS_TOPIC",
    consumerGroup = "ORDER_STATUS_CONSUMER_GROUP",
    consumeMode = ConsumeMode.ORDERLY  // 顺序消费
)
public class OrderStatusConsumer implements RocketMQListener<String> {
    
    @Autowired
    private OrderService orderService;
    
    @Override
    public void onMessage(String message) {
        OrderStatusMessage msg = JSON.parseObject(message, OrderStatusMessage.class);
        
        try {
            // 检查状态流转是否合法
            OrderStatus currentStatus = orderService.getStatus(msg.getOrderId());
            
            if (!isValidTransition(currentStatus, msg.getStatus())) {
                log.warn("订单状态流转非法:orderId={}, current={}, new={}", 
                        msg.getOrderId(), currentStatus, msg.getStatus());
                return;
            }
            
            // 更新订单状态
            orderService.updateStatus(msg.getOrderId(), msg.getStatus());
            
            // 执行后续操作
            switch (msg.getStatus()) {
                case PAID:
                    // 发送支付成功通知
                    notifyService.sendPaidNotification(msg.getOrderId());
                    break;
                case SHIPPED:
                    // 发送发货通知
                    notifyService.sendShippedNotification(msg.getOrderId());
                    break;
                case RECEIVED:
                    // 发送收货确认通知
                    notifyService.sendReceivedNotification(msg.getOrderId());
                    break;
            }
            
            log.info("订单状态更新成功:orderId={}, status={}", msg.getOrderId(), msg.getStatus());
            
        } catch (Exception e) {
            log.error("订单状态处理失败:orderId={}", msg.getOrderId(), e);
            throw new RuntimeException("订单状态处理失败", e);
        }
    }
    
    /**
     * 检查状态流转是否合法
     */
    private boolean isValidTransition(OrderStatus current, OrderStatus next) {
        // 状态流转规则:CREATED → PAID → SHIPPED → RECEIVED → COMPLETED
        switch (current) {
            case CREATED:
                return next == OrderStatus.PAID || next == OrderStatus.CANCELLED;
            case PAID:
                return next == OrderStatus.SHIPPED || next == OrderStatus.REFUNDED;
            case SHIPPED:
                return next == OrderStatus.RECEIVED;
            case RECEIVED:
                return next == OrderStatus.COMPLETED;
            default:
                return false;
        }
    }
}
```

### 案例三:分布式事务补偿

#### 业务需求

订单支付成功后,如果库存扣减失败,需要补偿(恢复库存、发送通知)。

#### 实现方案

```java
@Service
public class OrderCompensationService {
    
    @Autowired
    private DefaultMQProducer producer;
    
    @Autowired
    private TransactionLogService transactionLogService;
    
    /**
     * 发送补偿消息
     */
    public void sendCompensationMessage(String orderId, CompensateReason reason) throws Exception {
        CompensateMessage msg = new CompensateMessage();
        msg.setOrderId(orderId);
        msg.setReason(reason);
        msg.setTimestamp(System.currentTimeMillis());
        
        Message message = new Message(
            "COMPENSATE_TOPIC",
            "ORDER_COMPENSATE",
            orderId,
            JSON.toJSONString(msg).getBytes()
        );
        
        // 延迟消息:1小时后执行补偿
        // RocketMQ 4.x 默认 18 个延迟级别:1=1s 2=5s 3=10s 4=30s 5=1m ... 16=30m 17=1h 18=2h
        message.setDelayTimeLevel(17);  // 17 = 1小时
        
        producer.send(message);
    }
    
    /**
     * 补偿消费者
     */
    @Service
    @RocketMQMessageListener(
        topic = "COMPENSATE_TOPIC",
        consumerGroup = "COMPENSATE_CONSUMER_GROUP"
    )
    public class CompensateConsumer implements RocketMQListener<String> {
        
        @Override
        public void onMessage(String message) {
            CompensateMessage msg = JSON.parseObject(message, CompensateMessage.class);
            
            try {
                // 查询订单状态
                Order order = orderService.getByOrderId(msg.getOrderId());
                
                if (order == null) {
                    log.warn("订单不存在,跳过补偿:orderId={}", msg.getOrderId());
                    return;
                }
                
                // 检查是否需要补偿
                if (order.getStatus() == OrderStatus.CREATED) {
                    // 订单未支付,可能库存已扣减,需要恢复
                    inventoryService.restore(order.getProductId(), order.getQuantity());
                    log.info("库存恢复成功:orderId={}, productId={}", 
                            msg.getOrderId(), order.getProductId());
                }
                
                // 发送告警通知
                alertService.sendAlert(
                    "订单需要人工处理:orderId=" + msg.getOrderId() + 
                    ", reason=" + msg.getReason()
                );
                
            } catch (Exception e) {
                log.error("补偿处理失败:orderId={}", msg.getOrderId(), e);
                throw new RuntimeException("补偿处理失败", e);
            }
        }
    }
}
```

## 常见问题与解决方案

### 问题一:事务消息回查风暴

**现象**: Broker 频繁回查生产者事务状态,导致生产者负载高。

**原因**:
- 本地事务执行时间过长
- 事务状态表设计不合理,查询慢
- 网络不稳定,回查请求频繁超时

**解决方案**:

```java
// 方案一:优化事务状态表索引
CREATE INDEX idx_order_id ON transaction_log(order_id);
CREATE INDEX idx_status ON transaction_log(status);

// 方案二:异步更新事务状态
@Override
public LocalTransactionState executeLocalTransaction(Message msg, Object arg) {
    OrderDTO orderDTO = (OrderDTO) arg;
    
    try {
        // 插入事务日志(状态:执行中)
        transactionLogService.insert(orderDTO.getOrderId(), 0);
        
        // 异步执行本地事务
        CompletableFuture.runAsync(() -> {
            try {
                orderService.createOrder(orderDTO);
                transactionLogService.updateStatus(orderDTO.getOrderId(), 1);
            } catch (Exception e) {
                transactionLogService.updateStatus(orderDTO.getOrderId(), 2);
            }
        });
        
        // 返回 UNKNOW,等待回查
        return LocalTransactionState.UNKNOW;
        
    } catch (Exception e) {
        return LocalTransactionState.ROLLBACK_MESSAGE;
    }
}

// 方案三:调整 Broker 回查参数
// broker.conf
transactionCheckInterval=120000  # 回查间隔 2 分钟
transactionCheckMax=5            # 最大回查次数 5 次
```

### 问题二:顺序消费吞吐量低

**现象**: 顺序消费场景下,消息处理速度慢,出现积压。

**原因**:
- 单个 Queue 串行处理,并发度低
- 单条消息处理慢,阻塞整个 Queue
- Queue 数量太少

**解决方案**:

```java
// 方案一:增加 Queue 数量
// 创建 Topic 时指定 16 个 Queue
mqadmin updateTopic -n localhost:9876 -t ORDER_TOPIC -c DefaultCluster -r 16 -w 16

// 方案二:异步处理 + 本地缓存
consumer.registerMessageListener(new MessageListenerOrderly() {
    @Override
    public ConsumeOrderlyStatus consumeMessage(List<MessageExt> msgs, 
                                                ConsumeOrderlyContext context) {
        for (MessageExt msg : msgs) {
            String orderId = msg.getKeys();
            
            // 存入本地缓存
            cacheManager.put(orderId, msg);
            
            // 异步处理(保证同一 orderId 串行)
            CompletableFuture.runAsync(() -> {
                processMessage(msg);
            }, getExecutorForOrder(orderId));
        }
        return ConsumeOrderlyStatus.SUCCESS;
    }
});

// 方案三:按业务维度拆分 Topic
// 大订单 Topic:ORDER_LARGE_TOPIC (8 个 Queue)
// 小订单 Topic:ORDER_SMALL_TOPIC (16 个 Queue)
// 根据订单金额路由到不同 Topic
```

### 问题三:消息重试导致重复消费

**现象**: 消息重试后,业务逻辑重复执行。

**原因**:
- 消费者未实现幂等性
- 重试机制导致消息重复投递

**解决方案**:

```java
// 方案一:Redis 幂等性检查
@Override
public ConsumeConcurrentlyStatus consumeMessage(List<MessageExt> msgs, 
                                                 ConsumeConcurrentlyContext context) {
    for (MessageExt msg : msgs) {
        String msgId = msg.getMsgId();
        String key = "mq:consume:" + msgId;
        
        // 幂等性检查
        Boolean success = redisTemplate.opsForValue()
            .setIfAbsent(key, "1", 1, TimeUnit.DAYS);
        
        if (!success) {
            log.warn("消息已消费,跳过:msgId={}", msgId);
            continue;
        }
        
        try {
            processMessage(msg);
        } catch (Exception e) {
            // 删除幂等标记,允许重试
            redisTemplate.delete(key);
            return ConsumeConcurrentlyStatus.RECONSUME_LATER;
        }
    }
    return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
}

// 方案二:数据库唯一约束
@Override
public ConsumeConcurrentlyStatus consumeMessage(List<MessageExt> msgs, 
                                                 ConsumeConcurrentlyContext context) {
    for (MessageExt msg : msgs) {
        try {
            // 插入消费记录(唯一约束:msg_id)
            consumeRecordMapper.insert(msg.getMsgId(), msg.getTopic());
            
            // 业务处理
            processMessage(msg);
            
        } catch (DuplicateKeyException e) {
            // 消息已消费,跳过
            log.warn("消息已消费,跳过:msgId={}", msg.getMsgId());
            continue;
        } catch (Exception e) {
            return ConsumeConcurrentlyStatus.RECONSUME_LATER;
        }
    }
    return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
}

// 方案三:业务幂等键
@Override
public ConsumeConcurrentlyStatus consumeMessage(List<MessageExt> msgs, 
                                                 ConsumeConcurrentlyContext context) {
    for (MessageExt msg : msgs) {
        OrderDTO order = JSON.parseObject(new String(msg.getBody()), OrderDTO.class);
        
        try {
            // 使用业务键(orderId)实现幂等
            orderService.createOrderIfNotExists(order);
        } catch (Exception e) {
            return ConsumeConcurrentlyStatus.RECONSUME_LATER;
        }
    }
    return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
}
```

### 问题四:死信队列处理不及时

**现象**: 死信队列消息堆积,人工处理不及时。

**解决方案**:

```java
// 方案一:自动处理死信消息
@Service
@RocketMQMessageListener(
    topic = "%DLQ%ORDER_CONSUMER_GROUP",
    consumerGroup = "DLQ_HANDLER_GROUP"
)
public class DeadLetterConsumer implements RocketMQListener<String> {
    
    @Autowired
    private AlertService alertService;
    
    @Override
    public void onMessage(String message) {
        // 解析死信消息
        MessageExt msg = JSON.parseObject(message, MessageExt.class);
        
        // 发送告警
        alertService.sendAlert(
            "发现死信消息:" +
            "msgId=" + msg.getMsgId() + 
            ", topic=" + msg.getTopic() +
            ", keys=" + msg.getKeys()
        );
        
        // 存入数据库,人工处理
        deadLetterService.save(msg);
    }
}

// 方案二:定期清理死信队列
@Scheduled(cron = "0 0 2 * * ?")  // 每天凌晨 2 点执行
public void cleanDeadLetterQueue() {
    // 查询 7 天前的死信消息
    List<DeadLetter> oldMessages = deadLetterService.findOldMessages(7);
    
    // 标记为已处理
    deadLetterService.markAsProcessed(oldMessages);
    
    // 发送统计报告
    reportService.sendDailyReport(oldMessages);
}
```

## 最佳实践总结

### 事务消息最佳实践

1. **本地事务表必须存在**
   - 记录事务 ID、业务 ID、状态
   - 为业务 ID 建立索引,加快回查速度

2. **回查逻辑要快速轻量**
   - 避免复杂查询和远程调用
   - 超时时间设置为 30 秒以内

3. **幂等性设计必不可少**
   - 消费者必须实现幂等性
   - 使用 Redis 或数据库唯一约束

4. **超时和重试要合理设置**
   - 事务超时时间:根据业务执行时间设置
   - 回查次数:5-15 次

### 顺序消息最佳实践

1. **合理规划 Queue 数量**
   - Queue 数量 = 消费者数量 × 每个消费者的线程数
   - 避免数量太少导致并发度不够

2. **消息处理要快速**
   - 避免单条消息处理时间过长
   - 耗时操作异步处理

3. **消费失败要有补偿机制**
   - 重试次数限制:避免无限阻塞
   - 死信队列:人工介入处理

4. **监控告警必不可少**
   - 监控消息积压情况
   - 设置阈值告警

### 消息重试最佳实践

1. **区分异常类型**
   - 业务异常:不重试,直接记录日志
   - 系统异常:重试,设置最大次数

2. **重试间隔要合理**
   - 指数退避策略
   - 避免对下游系统造成压力

3. **告警机制要完善**
   - 重试次数过多时告警
   - 死信队列要有人工处理

4. **幂等性是基础**
   - 所有消费者必须实现幂等性
   - 使用唯一键或业务键去重

## 面试要点

### 基础问题

1. **RocketMQ 事务消息的原理是什么?**
   
   **答案**:
   - 两阶段提交 + 回查机制
   - 第一阶段:发送半消息(不可消费)
   - 第二阶段:执行本地事务,提交或回滚
   - 异常情况:Broker 回查生产者事务状态
   - 关键点:本地事务表记录事务状态

2. **RocketMQ 如何实现顺序消息?**
   
   **答案**:
   - Queue 级别顺序,不是全局顺序
   - 生产者:根据业务 Key 选择 Queue(MessageQueueSelector)
   - 消费者:使用 MessageListenerOrderly 接口
   - 每个 Queue 由一个消费者线程独占处理

3. **RocketMQ 消息重试机制是什么?**
   
   **答案**:
   - 消费失败后,消息进入重试队列(RETRY_TOPIC)
   - 延迟一段时间后重新投递(指数退避)
   - 默认重试 16 次,超过后进入死信队列(DLQ)
   - 重试时间:10s、30s、1min、2min...2h

### 进阶问题

4. **事务消息的回查机制有什么问题?如何优化?**
   
   **答案**:
   
   **问题**:
   - 回查频繁,生产者压力大
   - 回查查询慢,影响性能
   - 网络不稳定,回查超时
   
   **优化方案**:
   - 事务状态表加索引
   - 异步更新事务状态
   - 调整 Broker 回查参数(间隔、次数)
   - 网络超时设置合理

5. **顺序消息有什么缺点?如何优化?**
   
   **答案**:
   
   **缺点**:
   - 吞吐量低(串行处理)
   - 单条消息慢会阻塞整个 Queue
   - Queue 数量太少导致并发度不够
   
   **优化方案**:
   - 增加 Queue 数量
   - 异步处理 + 本地缓存
   - 按业务维度拆分 Topic
   - 快速失败,避免长时间阻塞

6. **如何避免消息重复消费?**
   
   **答案**:
   
   **幂等性设计方案**:
   - Redis 去重:`setIfAbsent(msgId, "1", TTL)`
   - 数据库唯一约束:`INSERT ... UNIQUE(msg_id)`
   - 业务键去重:根据业务 ID 判断是否已处理
   - 状态机:使用状态字段判断是否已处理
   
   **最佳实践**:
   - 所有消费者必须实现幂等性
   - 幂等键要全局唯一(建议 msgId 或业务 ID)
   - 幂等标记要有过期时间

### 实战问题

7. **电商订单场景如何使用事务消息?**
   
   **答案**:
   
   **流程**:
   1. 发送事务消息(半消息)
   2. 执行本地事务(插入订单 + 扣减库存)
   3. 记录事务状态到本地事务表
   4. 提交或回滚消息
   5. 消费者处理订单(发积分、发通知)
   
   **关键点**:
   - 本地事务表记录事务状态
   - 消费者实现幂等性
   - 失败要有补偿机制

8. **如何处理消息积压问题?**
   
   **答案**:
   
   **定位原因**:
   - 消费速度慢(消费者性能问题)
   - 下游依赖慢(数据库、RPC 调用)
   - 并发度不够(消费者线程数少)
   
   **解决方案**:
   - 临时扩容:增加消费者实例
   - 异步处理:存入缓存,异步处理
   - 批量消费:一次拉取多条消息
   - 跳过非关键消息:延迟处理
   - 优化消费逻辑:减少 IO 和远程调用

9. **RocketMQ 和 Kafka 有什么区别?**
   
   **答案**:
   
   | 对比项 | RocketMQ | Kafka |
   |--------|----------|-------|
   | **事务消息** | 支持(两阶段提交 + 回查) | 不支持 |
   | **顺序消息** | 支持(Queue 级别) | 支持(Partition 级别) |
   | **延迟消息** | 支持(18 个延迟级别) | 不支持(需自行实现) |
   | **消息过滤** | 支持(Tag、SQL) | 不支持 |
   | **消息回溯** | 支持按时间、Offset 回溯 | 支持 |
   | **适用场景** | 业务消息(电商、金融) | 日志采集、大数据 |

10. **如何保证消息不丢失?**
    
    **答案**:
    
    **生产端**:
    - 使用同步发送,等待 Broker 确认
    - 开启重试机制
    - 事务消息保证本地事务和消息一致性
    
    **Broker 端**:
    - 同步刷盘:消息写入磁盘后才返回
    - 同步复制:主从同步后才返回
    - 主从架构:避免单点故障
    
    **消费端**:
    - 手动提交 Offset(消费成功后再提交)
    - 消费失败时,返回 RECONSUME_LATER
    - 死信队列:人工处理失败消息

## 总结

RocketMQ 的事务消息和顺序消息是其在业务系统中广泛应用的核心特性:

**事务消息**:
- 解决分布式事务一致性问题
- 两阶段提交 + 回查机制
- 必须配合本地事务表使用
- 消费者必须实现幂等性

**顺序消息**:
- 保证消息的严格顺序(Queue 级别)
- 生产者选择 Queue,消费者串行处理
- 适用于订单状态流转、Binlog 同步等场景
- 需要权衡吞吐量和顺序性

**最佳实践**:
- 本地事务表必不可少
- 幂等性设计是基础
- 监控告警要完善
- 补偿机制要有预案

掌握 RocketMQ 的这两个核心特性,能够应对大多数分布式系统和业务场景的挑战。

## 版本差异(旧版 → 当前)

| 组件 | 旧版（本文编写时） | 当前 |
|------|-------------------|------|
| RabbitMQ | 3.8/3.9 | 3.13/4.x（quorum queue 为默认推荐） |
| Kafka | 2.x/3.0 | 3.7+/4.x（KRaft 模式取代 ZooKeeper） |
| RocketMQ | 4.x | 5.x（gRPC 通信、简化运维） |
| Java 版本 | JDK 8 | JDK 17+（Kafka 3.7+ 客户端要求） |

> 本文讲解的消息可靠性设计（投递确认、死信、幂等、顺序）原理不变；注意各中间件版本升级后的配置差异，如 Kafka 的 KRaft 模式、RabbitMQ 的 quorum queue。
