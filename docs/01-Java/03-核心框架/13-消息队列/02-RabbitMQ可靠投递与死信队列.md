---
title: "RabbitMQ可靠投递与死信队列"
description: "RabbitMQ 在 Java 业务系统里很常见,因为它的路由能力、确认机制和队列治理手段比较灵活。它很适合订单事件、通知分发、异步任务编排这类\"业务型消息\"场景。"
keywords: [RabbitMQ, 可靠投递, 死信队列, 延迟重试]
category: "Java"
tags: [Java, 消息队列]
---


# RabbitMQ 可靠投递与死信队列

## 概念与背景

RabbitMQ 在 Java 业务系统里很常见,因为它的路由能力、确认机制和队列治理手段比较灵活。它很适合订单事件、通知分发、异步任务编排这类"业务型消息"场景。

真正需要掌握的不是"怎么发一条消息",而是:

- **生产者如何确认消息真的到达 Broker**
- **消费者失败后如何重试而不把系统拖垮**
- **死信队列如何隔离异常消息**

### RabbitMQ 的核心优势

| 特性 | 说明 | 适用场景 |
|------|------|---------|
| 路由灵活 | Exchange + Routing Key + Binding | 复杂消息分发 |
| 确认机制 | Publisher Confirm + Consumer ACK | 高可靠性要求 |
| 死信队列 | 自动隔离异常消息 | 异常处理 |
| 延迟队列 | 延迟投递消息 | 定时任务 |
| 消息持久化 | 持久化队列和消息 | 数据安全 |

### RabbitMQ vs 其他 MQ

| 特性 | RabbitMQ | Kafka | RocketMQ |
|------|----------|-------|----------|
| 吞吐量 | 万级 | 十万级 | 十万级 |
| 延迟 | 微秒级 | 毫秒级 | 毫秒级 |
| 路由能力 | 非常强 | 弱 | 中等 |
| 事务消息 | 不支持 | 不支持 | 支持 |
| 延迟队列 | 支持(插件) | 不支持 | 支持 |
| 适用场景 | 业务系统 | 日志采集 | 电商交易 |

## 原理与机制

### RabbitMQ 的核心角色

一条消息在 RabbitMQ 里通常会经过:

```
Producer(生产者)
    ↓
Exchange(交换机) → 按路由规则分发
    ↓
Queue(队列) → 接收并保存消息
    ↓
Consumer(消费者) → 从队列消费
```

#### 1. Exchange(交换机)

**作用:** 接收生产者发送的消息,根据路由规则分发到队列

**四种交换机类型:**

| 类型 | 说明 | 路由规则 | 适用场景 |
|------|------|---------|---------|
| Direct | 直连 | 精确匹配 Routing Key | 点对点消息 |
| Topic | 主题 | 模式匹配 Routing Key | 多条件路由 |
| Fanout | 扇出 | 广播到所有绑定队列 | 发布订阅 |
| Headers | 头部 | 匹配消息头属性 | 复杂路由(少用) |

**Direct Exchange 示例:**

```java
@Configuration
public class RabbitConfig {
    // 直连交换机
    @Bean
    public DirectExchange orderExchange() {
        return new DirectExchange("order.exchange", true, false);
    }
    
    // 队列
    @Bean
    public Queue orderQueue() {
        return new Queue("order.queue", true);
    }
    
    // 绑定
    @Bean
    public Binding orderBinding() {
        return BindingBuilder
            .bind(orderQueue())
            .to(orderExchange())
            .with("order.created");  // 精确匹配
    }
}

// 发送消息
rabbitTemplate.convertAndSend("order.exchange", "order.created", orderEvent);
```

**Topic Exchange 示例:**

```java
@Configuration
public class RabbitConfig {
    // 主题交换机
    @Bean
    public TopicExchange orderExchange() {
        return new TopicExchange("order.exchange", true, false);
    }
    
    // 订单创建队列
    @Bean
    public Queue orderCreatedQueue() {
        return new Queue("order.created.queue", true);
    }
    
    // 订单支付队列
    @Bean
    public Queue orderPaidQueue() {
        return new Queue("order.paid.queue", true);
    }
    
    // 订单所有事件队列
    @Bean
    public Queue orderAllQueue() {
        return new Queue("order.all.queue", true);
    }
    
    // 绑定
    @Bean
    public Binding orderCreatedBinding() {
        return BindingBuilder
            .bind(orderCreatedQueue())
            .to(orderExchange())
            .with("order.created");  // 精确匹配
    }
    
    @Bean
    public Binding orderPaidBinding() {
        return BindingBuilder
            .bind(orderPaidQueue())
            .to(orderExchange())
            .with("order.paid");
    }
    
    @Bean
    public Binding orderAllBinding() {
        return BindingBuilder
            .bind(orderAllQueue())
            .to(orderExchange())
            .with("order.*");  // 模式匹配
    }
}

// 发送消息
rabbitTemplate.convertAndSend("order.exchange", "order.created", orderEvent);
rabbitTemplate.convertAndSend("order.exchange", "order.paid", orderEvent);
```

**Fanout Exchange 示例:**

```java
@Configuration
public class RabbitConfig {
    // 扇出交换机
    @Bean
    public FanoutExchange orderExchange() {
        return new FanoutExchange("order.exchange", true, false);
    }
    
    // 多个队列
    @Bean
    public Queue smsQueue() {
        return new Queue("sms.queue", true);
    }
    
    @Bean
    public Queue emailQueue() {
        return new Queue("email.queue", true);
    }
    
    @Bean
    public Queue notificationQueue() {
        return new Queue("notification.queue", true);
    }
    
    // 绑定(所有队列都会收到消息)
    @Bean
    public Binding smsBinding() {
        return BindingBuilder.bind(smsQueue()).to(orderExchange());
    }
    
    @Bean
    public Binding emailBinding() {
        return BindingBuilder.bind(emailQueue()).to(orderExchange());
    }
    
    @Bean
    public Binding notificationBinding() {
        return BindingBuilder.bind(notificationQueue()).to(orderExchange());
    }
}

// 发送消息(不需要 Routing Key)
rabbitTemplate.convertAndSend("order.exchange", "", orderEvent);
// smsQueue、emailQueue、notificationQueue 都会收到
```

#### 2. Queue(队列)

**作用:** 存储消息,等待消费者消费

**队列属性:**

| 属性 | 说明 | 配置方式 |
|------|------|---------|
| durable | 是否持久化 | new Queue(name, true) |
| exclusive | 是否排他(仅当前连接可见) | new Queue(name, false, true, false) |
| autoDelete | 是否自动删除(无消费者时删除) | new Queue(name, false, false, true) |
| arguments | 其他参数(如死信队列、TTL) | QueueBuilder.durable().withArgument() |

**队列配置示例:**

```java
@Configuration
public class QueueConfig {
    
    // 1. 持久化队列
    @Bean
    public Queue durableQueue() {
        return new Queue("order.queue", true);  // true = 持久化
    }
    
    // 2. 带死信队列的队列
    @Bean
    public Queue queueWithDeadLetter() {
        return QueueBuilder.durable("order.queue")
            .withArgument("x-dead-letter-exchange", "dlx.exchange")
            .withArgument("x-dead-letter-routing-key", "dlx.order")
            .build();
    }
    
    // 3. 带 TTL 的队列
    @Bean
    public Queue queueWithTTL() {
        return QueueBuilder.durable("order.queue")
            .withArgument("x-message-ttl", 86400000)  // 24 小时
            .build();
    }
    
    // 4. 带最大长度的队列
    @Bean
    public Queue queueWithMaxLength() {
        return QueueBuilder.durable("order.queue")
            .withArgument("x-max-length", 10000)  // 最多 10000 条消息
            .build();
    }
    
    // 5. 延迟队列
    @Bean
    public Queue delayQueue() {
        return QueueBuilder.durable("order.delay.queue")
            .withArgument("x-dead-letter-exchange", "order.exchange")
            .withArgument("x-dead-letter-routing-key", "order.queue")
            .withArgument("x-message-ttl", 10000)  // 10 秒后转主队列
            .build();
    }
}
```

#### 3. Routing Key 与 Binding

**Routing Key:** 生产者发送消息时指定的路由键

**Binding:** 队列与交换机的绑定关系,可以指定绑定键

**路由匹配规则:**

| Exchange 类型 | Routing Key 规则 | 示例 |
|--------------|-----------------|------|
| Direct | 精确匹配 | "order.created" → "order.created" |
| Topic | 模式匹配 | "order.*" → "order.created", "order.paid" |
| Topic | 多层匹配 | "order.#" → "order.created", "order.paid.success" |
| Fanout | 忽略 | 所有队列都收到 |

**Topic 匹配规则详解:**

```
* (星号): 匹配一个单词
# (井号): 匹配零个或多个单词

示例:
order.*        → order.created, order.paid
order.#        → order.created, order.paid.success, order.shipped.express
*.order        → created.order, paid.order
*.*.order      → user.vip.order, guest.normal.order
```

**代码示例:**

```java
// 发送消息
rabbitTemplate.convertAndSend("order.exchange", "order.created.success", event);

// 队列1: 匹配 "order.created.success"
@RabbitListener(queues = "queue1")
public void handle1(OrderEvent event) {
    // Binding: order.created.*
}

// 队列2: 匹配 "order.created.success"
@RabbitListener(queues = "queue2")
public void handle2(OrderEvent event) {
    // Binding: order.#
}

// 队列3: 不匹配
@RabbitListener(queues = "queue3")
public void handle3(OrderEvent event) {
    // Binding: order.paid.*
}
```

### 生产者可靠投递

生产端常用的可靠性手段有两类:

- **publisher confirm**: Broker 告诉生产者消息是否成功接收
- **mandatory + return callback**: 路由不到任何队列时,把消息退回给生产者

#### 1. Publisher Confirm 机制

**这两者解决的是不同问题:**

- **confirm**: 关注消息有没有到 Broker
- **return**: 关注消息到了 Broker 后有没有路由成功

**如果只开 confirm,不处理 return,那么消息可能"成功到达交换机,但没有队列接住",业务上仍然等于丢失。**

**配置:**

```yaml
# application.yml
spring:
  rabbitmq:
    publisher-confirm-type: correlated  # 开启确认机制
    publisher-returns: true              # 开启退回机制
    template:
      mandatory: true                    # 路由失败返回生产者
```

**确认模式:**

| 模式 | 说明 | 性能 | 可靠性 |
|------|------|------|--------|
| none | 不确认 | 最高 | 最低 |
| correlated | 异步确认 | 高 | 高 |
| simple | 同步确认 | 低 | 最高 |

**异步确认示例:**

```java
@Service
@Slf4j
public class OrderProducer {
    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    @PostConstruct
    public void init() {
        // 设置确认回调
        rabbitTemplate.setConfirmCallback((correlationData, ack, cause) -> {
            if (ack) {
                log.info("消息确认成功: correlationData={}", correlationData);
            } else {
                log.error("消息确认失败: correlationData={}, cause={}", 
                         correlationData, cause);
                // 确认失败,记录到数据库或重试
                if (correlationData != null) {
                    failedMessageService.save(correlationData);
                }
            }
        });
    }
    
    public void sendOrderCreated(OrderEvent event) {
        // 设置消息 ID
        CorrelationData correlationData = new CorrelationData(
            UUID.randomUUID().toString()
        );
        
        // 发送消息
        rabbitTemplate.convertAndSend(
            "order.exchange",
            "order.created",
            event,
            correlationData
        );
    }
}
```

**事务方式示例（吞吐最低,常规场景建议改用 confirm 机制）:**

```java
@Service
public class OrderProducer {
    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    public void sendWithConfirm(OrderEvent event) {
        try {
            // 开启事务
            rabbitTemplate.execute(channel -> {
                channel.txSelect();  // 开启事务
                
                try {
                    // 发送消息
                    channel.basicPublish(
                        "order.exchange",
                        "order.created",
                        null,
                        JSON.toJSONString(event).getBytes()
                    );
                    
                    // 提交事务
                    channel.txCommit();
                    log.info("消息发送成功");
                    
                } catch (Exception e) {
                    // 回滚事务
                    channel.txRollback();
                    log.error("消息发送失败", e);
                }
                
                return null;
            });
        } catch (Exception e) {
            log.error("发送异常", e);
        }
    }
}
```

**性能对比:**

| 方式 | 吞吐量 | 延迟 | 可靠性 |
|------|--------|------|--------|
| 不确认 | 最高 | 最低 | 低 |
| 异步确认 | 高 | 中 | 高 |
| 同步确认 | 低 | 高 | 最高 |
| 事务 | 最低 | 最高 | 最高 |

#### 2. Return Callback 机制

**作用:** 当消息路由不到任何队列时,触发 return callback

**示例:**

```java
@Service
@Slf4j
public class OrderProducer {
    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    @PostConstruct
    public void init() {
        // 设置退回回调
        rabbitTemplate.setReturnsCallback(returned -> {
            log.error("消息路由失败: exchange={}, routingKey={}, replyText={}, message={}",
                     returned.getExchange(),
                     returned.getRoutingKey(),
                     returned.getReplyText(),
                     new String(returned.getMessage().getBody()));
            
            // 路由失败,记录到数据库或告警
            failedMessageService.save(
                returned.getExchange(),
                returned.getRoutingKey(),
                new String(returned.getMessage().getBody())
            );
            
            alertService.sendAlert("消息路由失败", returned.toString());
        });
    }
    
    public void sendOrderCreated(OrderEvent event) {
        rabbitTemplate.convertAndSend(
            "order.exchange",
            "order.created",
            event
        );
    }
}
```

#### 3. 完整的生产者可靠性方案

```java
@Service
@Slf4j
public class ReliableOrderProducer {
    @Autowired
    private RabbitTemplate rabbitTemplate;
    @Autowired
    private FailedMessageService failedMessageService;
    @Autowired
    private AlertService alertService;
    
    @PostConstruct
    public void init() {
        // 1. 确认回调
        rabbitTemplate.setConfirmCallback((correlationData, ack, cause) -> {
            if (ack) {
                log.debug("消息确认成功: {}", correlationData);
            } else {
                log.error("消息确认失败: correlationData={}, cause={}", 
                         correlationData, cause);
                
                // 确认失败,重试或记录
                if (correlationData != null && correlationData.getId() != null) {
                    failedMessageService.save(correlationData.getId(), "确认失败: " + cause);
                }
            }
        });
        
        // 2. 退回回调
        rabbitTemplate.setReturnsCallback(returned -> {
            log.error("消息路由失败: exchange={}, routingKey={}",
                     returned.getExchange(), returned.getRoutingKey());
            
            // 路由失败,记录或重试
            failedMessageService.save(
                returned.getExchange(),
                returned.getRoutingKey(),
                new String(returned.getMessage().getBody())
            );
            
            alertService.sendAlert("消息路由失败",
                String.format("Exchange: %s, RoutingKey: %s, Reason: %s",
                             returned.getExchange(),
                             returned.getRoutingKey(),
                             returned.getReplyText()));
        });
    }
    
    /**
     * 可靠发送消息
     */
    public void sendReliably(String exchange, String routingKey, Object message) {
        // 1. 生成消息 ID
        String messageId = UUID.randomUUID().toString();
        CorrelationData correlationData = new CorrelationData(messageId);
        
        // 2. 发送消息
        try {
            rabbitTemplate.convertAndSend(
                exchange,
                routingKey,
                message,
                msg -> {
                    // 设置消息持久化
                    msg.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
                    // 设置消息 ID
                    msg.getMessageProperties().setMessageId(messageId);
                    // 设置消息过期时间
                    msg.getMessageProperties().setExpiration("86400000");  // 24 小时
                    return msg;
                },
                correlationData
            );
            
            log.info("消息发送成功: messageId={}, exchange={}, routingKey={}",
                    messageId, exchange, routingKey);
            
        } catch (Exception e) {
            log.error("消息发送异常: messageId={}, exchange={}, routingKey={}",
                     messageId, exchange, routingKey, e);
            
            // 发送异常,记录到数据库
            failedMessageService.save(
                messageId,
                exchange,
                routingKey,
                JSON.toJSONString(message),
                "发送异常: " + e.getMessage()
            );
            
            // 告警
            alertService.sendAlert("消息发送异常",
                String.format("MessageId: %s, Error: %s", messageId, e.getMessage()));
        }
    }
}
```

### 消费确认与重试

消费端常见策略是手动 `ack`:

- **业务成功后再 `ack`**
- **临时失败时延迟重试**
- **不可恢复错误直接拒绝并进入死信**

#### 1. 自动确认 vs 手动确认

**这里最危险的做法是"刚收到消息就先 ack",这样业务执行失败时消息已经无法重来。**

**自动确认(默认):**

```java
// × 自动确认: 不安全
@RabbitListener(queues = "order.queue")
public void handleOrder(OrderEvent event) {
    // 消息到达立即 ACK
    // 如果下面业务失败,消息已丢失
    orderService.process(event);
}
```

**手动确认:**

```java
// √ 手动确认: 安全
@RabbitListener(queues = "order.queue", ackMode = "MANUAL")
public void handleOrder(OrderEvent event, Channel channel,
                        @Header(AmqpHeaders.DELIVERY_TAG) long tag) {
    try {
        // 1. 执行业务逻辑
        orderService.process(event);
        
        // 2. 业务成功后 ACK
        channel.basicAck(tag, false);
        log.info("消息处理成功: orderId={}", event.getOrderId());
        
    } catch (Exception e) {
        log.error("消息处理失败: orderId={}", event.getOrderId(), e);
        
        try {
            // 3. 业务失败,NACK 并重新入队
            channel.basicNack(tag, false, true);
        } catch (IOException ex) {
            log.error("NACK 失败", ex);
        }
    }
}
```

#### 2. 确认模式对比

| 模式 | 说明 | 可靠性 | 性能 | 适用场景 |
|------|------|--------|------|---------|
| Auto | 自动确认 | 低 | 高 | 非关键业务 |
| Manual | 手动确认 | 高 | 中 | 关键业务 |
| None | 不确认(极少用) | 最低 | 最高 | 无需可靠性 |

#### 3. 重试策略

**立即重试(不推荐):**

```java
// × 立即重试: 可能导致重试风暴
@RabbitListener(queues = "order.queue", ackMode = "MANUAL")
public void handleOrder(OrderEvent event, Channel channel,
                        @Header(AmqpHeaders.DELIVERY_TAG) long tag) {
    try {
        orderService.process(event);
        channel.basicAck(tag, false);
    } catch (Exception e) {
        log.error("处理失败", e);
        // 立即重新入队,可能反复失败
        channel.basicNack(tag, false, true);
    }
}
```

**延迟重试(推荐):**

```java
@Configuration
public class RetryConfig {
    
    // 延迟队列
    @Bean
    public Queue retryQueue() {
        return QueueBuilder.durable("order.retry.queue")
            .withArgument("x-dead-letter-exchange", "order.exchange")
            .withArgument("x-dead-letter-routing-key", "order.queue")
            .withArgument("x-message-ttl", 10000)  // 10 秒后转主队列
            .build();
    }
    
    // 绑定
    @Bean
    public Binding retryBinding() {
        return BindingBuilder
            .bind(retryQueue())
            .to(new DirectExchange("order.exchange"))
            .with("order.retry");
    }
}

@Service
public class OrderConsumer {
    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    @RabbitListener(queues = "order.queue", ackMode = "MANUAL")
    public void handleOrder(OrderEvent event, Channel channel,
                           @Header(AmqpHeaders.DELIVERY_TAG) long tag,
                           @Header("retry_count", required = false) Integer retryCount) {
        
        retryCount = retryCount == null ? 0 : retryCount;
        
        try {
            orderService.process(event);
            channel.basicAck(tag, false);
            
        } catch (Exception e) {
            log.error("处理失败: orderId={}, retryCount={}", 
                     event.getOrderId(), retryCount, e);
            
            if (retryCount < 3) {
                // 转延迟队列重试
                rabbitTemplate.convertAndSend(
                    "order.exchange",
                    "order.retry",
                    event,
                    message -> {
                        message.getMessageProperties()
                            .setHeader("retry_count", retryCount + 1);
                        return message;
                    }
                );
                channel.basicAck(tag, false);
            } else {
                // 超过重试次数,转死信队列
                channel.basicNack(tag, false, false);
            }
        }
    }
}
```

**指数退避重试:**

```java
@Service
public class OrderConsumer {
    
    // 计算延迟时间(指数退避)
    private long calculateDelay(int retryCount) {
        return (long) Math.pow(2, retryCount) * 1000;  // 1s, 2s, 4s, 8s...
    }
    
    @RabbitListener(queues = "order.queue", ackMode = "MANUAL")
    public void handleOrder(OrderEvent event, Channel channel,
                           @Header(AmqpHeaders.DELIVERY_TAG) long tag,
                           @Header("retry_count", required = false) Integer retryCount) {
        
        retryCount = retryCount == null ? 0 : retryCount;
        
        try {
            orderService.process(event);
            channel.basicAck(tag, false);
            
        } catch (Exception e) {
            if (retryCount < 5) {
                // 指数退避延迟
                long delay = calculateDelay(retryCount);
                log.warn("处理失败,{}毫秒后重试: orderId={}", 
                         delay, event.getOrderId());
                
                // 发送到延迟队列(需要 RabbitMQ 延迟插件)
                rabbitTemplate.convertAndSend(
                    "order.delay.exchange",
                    "order.delay",
                    event,
                    message -> {
                        message.getMessageProperties().setDelay((int) delay);
                        message.getMessageProperties()
                            .setHeader("retry_count", retryCount + 1);
                        return message;
                    }
                );
                channel.basicAck(tag, false);
            } else {
                // 超过最大重试次数,转死信
                log.error("超过最大重试次数: orderId={}", event.getOrderId());
                channel.basicNack(tag, false, false);
            }
        }
    }
}
```

### 死信队列怎么工作

RabbitMQ 的死信机制通常由这几个条件触发:

- **消息被 `reject` / `nack` 且不重新入队**
- **消息过期**
- **队列满了**

死信消息会被重新投递到指定的死信 Exchange,再路由到死信队列。

#### 1. 死信队列的配置

```java
@Configuration
public class DeadLetterConfig {
    
    // 死信交换机
    @Bean
    public DirectExchange deadLetterExchange() {
        return new DirectExchange("dlx.exchange", true, false);
    }
    
    // 死信队列
    @Bean
    public Queue deadLetterQueue() {
        return new Queue("dlx.order.queue", true);
    }
    
    // 死信绑定
    @Bean
    public Binding deadLetterBinding() {
        return BindingBuilder
            .bind(deadLetterQueue())
            .to(deadLetterExchange())
            .with("dlx.order");
    }
    
    // 业务队列(配置死信队列)
    @Bean
    public Queue orderQueue() {
        return QueueBuilder.durable("order.queue")
            .withArgument("x-dead-letter-exchange", "dlx.exchange")
            .withArgument("x-dead-letter-routing-key", "dlx.order")
            .build();
    }
}
```

#### 2. 死信产生的三种情况

**情况1: 消息被拒绝且不重新入队**

```java
@Service
public class OrderConsumer {
    
    @RabbitListener(queues = "order.queue", ackMode = "MANUAL")
    public void handleOrder(OrderEvent event, Channel channel,
                           @Header(AmqpHeaders.DELIVERY_TAG) long tag) {
        
        try {
            orderService.process(event);
            channel.basicAck(tag, false);
            
        } catch (BusinessException e) {
            // 业务异常,不应该重试,转死信
            log.error("业务异常,转死信: orderId={}", event.getOrderId(), e);
            
            // NACK 且不重新入队 → 触发死信
            channel.basicNack(tag, false, false);
        }
    }
}
```

**情况2: 消息过期**

```java
@Configuration
public class QueueConfig {
    
    // 队列级 TTL
    @Bean
    public Queue orderQueue() {
        return QueueBuilder.durable("order.queue")
            .withArgument("x-message-ttl", 60000)  // 1 分钟过期
            .withArgument("x-dead-letter-exchange", "dlx.exchange")
            .withArgument("x-dead-letter-routing-key", "dlx.order")
            .build();
    }
}

// 或消息级 TTL
rabbitTemplate.convertAndSend(
    "order.exchange",
    "order.created",
    event,
    message -> {
        message.getMessageProperties().setExpiration("60000");  // 1 分钟过期
        return message;
    }
);
```

**情况3: 队列满了**

```java
@Configuration
public class QueueConfig {
    
    @Bean
    public Queue orderQueue() {
        return QueueBuilder.durable("order.queue")
            .withArgument("x-max-length", 10000)  // 最多 10000 条
            .withArgument("x-dead-letter-exchange", "dlx.exchange")
            .withArgument("x-dead-letter-routing-key", "dlx.order")
            .build();
    }
}
```

#### 3. 死信队列的处理

```java
@Service
@Slf4j
public class DeadLetterConsumer {
    @Autowired
    private FailedMessageService failedMessageService;
    @Autowired
    private AlertService alertService;
    
    @RabbitListener(queues = "dlx.order.queue")
    public void handleDeadLetter(Message message) {
        String payload = new String(message.getBody());
        log.error("收到死信消息: {}", payload);
        
        // 1. 解析消息
        OrderEvent event = JSON.parseObject(payload, OrderEvent.class);
        
        // 2. 获取死信原因(x-death 是一个 List<Map<String, Object>>)
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> xDeath = (List<Map<String, Object>>) message
            .getMessageProperties().getHeaders().get("x-death");
        String reason = (String) xDeath.get(0).get("reason");
        
        // 3. 记录到数据库
        FailedMessage failedMessage = new FailedMessage();
        failedMessage.setQueueName("order.queue");
        failedMessage.setPayload(payload);
        failedMessage.setReason(reason);
        failedMessage.setCreateTime(LocalDateTime.now());
        failedMessageService.save(failedMessage);
        
        // 4. 发送告警
        alertService.sendAlert("死信告警",
            String.format("队列: order.queue, 原因: %s, 订单ID: %s",
                         reason, event.getOrderId()));
        
        // 5. 可以在这里实现自动补偿或人工处理
        // compensationService.compensate(event);
    }
}
```

#### 4. 死信队列的价值

它的价值在于:

- **把异常消息从主链路隔离出去**
- **避免重复失败消息堵住正常消费**
- **让排障和人工补偿有明确入口**

## 实战场景

### 场景一:下单后异步发优惠券

订单支付成功后,系统向 RabbitMQ 发一条"发券"消息。

**更稳妥的链路应该是:**

```
1. 生产者发送时开启 confirm
2. 路由不到队列时走 return callback 告警
3. 消费端手动 ack
4. 发券接口短暂失败时转延迟重试
5. 重试超过阈值后进入死信队列
```

**完整实现:**

```java
// 1. 生产者(可靠发送)
@Service
@Slf4j
public class CouponProducer {
    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    @PostConstruct
    public void init() {
        rabbitTemplate.setConfirmCallback((correlationData, ack, cause) -> {
            if (!ack) {
                log.error("消息确认失败: {}", cause);
            }
        });
        
        rabbitTemplate.setReturnsCallback(returned -> {
            log.error("消息路由失败: {}", returned.getReplyText());
            alertService.sendAlert("消息路由失败", returned.toString());
        });
    }
    
    public void sendCouponMessage(Long userId, Long orderId) {
        CouponEvent event = new CouponEvent(userId, orderId);
        
        rabbitTemplate.convertAndSend(
            "coupon.exchange",
            "coupon.grant",
            event,
            message -> {
                message.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
                return message;
            },
            new CorrelationData(UUID.randomUUID().toString())
        );
    }
}

// 2. 消费者(可靠消费)
@Service
@Slf4j
public class CouponConsumer {
    @Autowired
    private CouponService couponService;
    @Autowired
    private StringRedisTemplate redisTemplate;
    
    private static final int MAX_RETRY = 3;
    
    @RabbitListener(queues = "coupon.queue", ackMode = "MANUAL")
    public void handleCoupon(CouponEvent event, Channel channel,
                            @Header(AmqpHeaders.DELIVERY_TAG) long tag,
                            @Header("retry_count", required = false) Integer retryCount) {
        
        retryCount = retryCount == null ? 0 : retryCount;
        String dedupKey = "coupon:dedup:" + event.getUserId() + ":" + event.getOrderId();
        
        try {
            // 幂等性检查
            Boolean isFirst = redisTemplate.opsForValue()
                .setIfAbsent(dedupKey, "1", Duration.ofDays(7));
            
            if (Boolean.FALSE.equals(isFirst)) {
                log.info("重复消息,跳过: userId={}, orderId={}", 
                         event.getUserId(), event.getOrderId());
                channel.basicAck(tag, false);
                return;
            }
            
            // 发优惠券
            couponService.grantCoupon(event.getUserId(), event.getOrderId());
            
            channel.basicAck(tag, false);
            log.info("优惠券发放成功: userId={}, orderId={}", 
                     event.getUserId(), event.getOrderId());
            
        } catch (CouponServiceException e) {
            // 优惠券服务异常,可以重试
            log.error("优惠券服务异常: userId={}, orderId={}", 
                     event.getUserId(), event.getOrderId(), e);
            
            if (retryCount < MAX_RETRY) {
                // 延迟重试
                sendToRetryQueue(event, retryCount + 1);
                channel.basicAck(tag, false);
            } else {
                // 超过重试次数,转死信
                channel.basicNack(tag, false, false);
            }
        } catch (Exception e) {
            // 其他异常,转死信
            log.error("未知异常: userId={}, orderId={}", 
                     event.getUserId(), event.getOrderId(), e);
            channel.basicNack(tag, false, false);
        }
    }
    
    private void sendToRetryQueue(CouponEvent event, int retryCount) {
        rabbitTemplate.convertAndSend(
            "coupon.retry.exchange",
            "coupon.retry",
            event,
            message -> {
                message.getMessageProperties().setHeader("retry_count", retryCount);
                return message;
            }
        );
    }
}

// 3. 配置
@Configuration
public class CouponConfig {
    
    // 交换机
    @Bean
    public DirectExchange couponExchange() {
        return new DirectExchange("coupon.exchange", true, false);
    }
    
    // 主队列
    @Bean
    public Queue couponQueue() {
        return QueueBuilder.durable("coupon.queue")
            .withArgument("x-dead-letter-exchange", "dlx.exchange")
            .withArgument("x-dead-letter-routing-key", "dlx.coupon")
            .build();
    }
    
    // 重试队列
    @Bean
    public Queue retryQueue() {
        return QueueBuilder.durable("coupon.retry.queue")
            .withArgument("x-dead-letter-exchange", "coupon.exchange")
            .withArgument("x-dead-letter-routing-key", "coupon.queue")
            .withArgument("x-message-ttl", 10000)  // 10 秒后重试
            .build();
    }
    
    // 绑定
    @Bean
    public Binding couponBinding() {
        return BindingBuilder
            .bind(couponQueue())
            .to(couponExchange())
            .with("coupon.grant");
    }
}
```

### 场景二:短信通道抖动

短信供应商接口抖动时,如果消费者每次失败都立刻重新入队:

- 消费线程会被异常请求打满
- 重试风暴会进一步放大外部依赖压力

**正确做法通常是:**

- **区分临时错误和永久错误**
- **临时错误走延迟重试**
- **永久错误直接转死信并告警**

**实现:**

```java
@Service
@Slf4j
public class SmsConsumer {
    @Autowired
    private SmsService smsService;
    @Autowired
    private CircuitBreaker circuitBreaker;
    
    private static final int MAX_RETRY = 5;
    
    @RabbitListener(queues = "sms.queue", ackMode = "MANUAL")
    public void handleSms(SmsEvent event, Channel channel,
                         @Header(AmqpHeaders.DELIVERY_TAG) long tag,
                         @Header("retry_count", required = false) Integer retryCount) {
        
        retryCount = retryCount == null ? 0 : retryCount;
        
        // 1. 熔断检查
        if (circuitBreaker.isOpen()) {
            log.warn("熔断器打开,暂停消费: phone={}", event.getPhone());
            sendToDelayQueue(event, retryCount, 60000);  // 延迟 1 分钟
            channel.basicAck(tag, false);
            return;
        }
        
        try {
            // 2. 发送短信
            smsService.sendSms(event.getPhone(), event.getContent());
            circuitBreaker.recordSuccess();
            channel.basicAck(tag, false);
            log.info("短信发送成功: phone={}", event.getPhone());
            
        } catch (SmsServiceException e) {
            circuitBreaker.recordFailure();
            
            // 3. 区分错误类型
            if (e.isTemporaryError()) {
                // 临时错误(限流、网络超时),延迟重试
                log.warn("临时错误,延迟重试: phone={}, retryCount={}", 
                         event.getPhone(), retryCount);
                
                if (retryCount < MAX_RETRY) {
                    // 指数退避
                    long delay = (long) Math.pow(2, retryCount) * 1000;
                    sendToDelayQueue(event, retryCount + 1, delay);
                    channel.basicAck(tag, false);
                } else {
                    // 超过重试次数,转死信
                    log.error("超过最大重试次数: phone={}", event.getPhone());
                    channel.basicNack(tag, false, false);
                }
                
            } else {
                // 永久错误(号码格式错误、黑名单),转死信
                log.error("永久错误,转死信: phone={}, error={}", 
                         event.getPhone(), e.getMessage());
                channel.basicNack(tag, false, false);
            }
        }
    }
    
    private void sendToDelayQueue(SmsEvent event, int retryCount, long delay) {
        rabbitTemplate.convertAndSend(
            "sms.delay.exchange",
            "sms.delay",
            event,
            message -> {
                message.getMessageProperties().setDelay((int) delay);
                message.getMessageProperties().setHeader("retry_count", retryCount);
                return message;
            }
        );
    }
}
```

### 场景三:毒消息治理

如果消息字段版本不兼容,或者 payload 本身就是脏数据,这类消息无论重试多少次都不会成功。

**没有死信隔离时,结果通常是:**

- 主队列消费效率持续下降
- 大量错误日志淹没正常告警
- 正常消息延迟越来越高

**解决方案:**

```java
@Service
@Slf4j
public class OrderConsumer {
    @Autowired
    private OrderService orderService;
    @Autowired
    private DeadLetterService deadLetterService;
    
    @RabbitListener(queues = "order.queue", ackMode = "MANUAL")
    public void handleOrder(OrderEvent event, Channel channel,
                           @Header(AmqpHeaders.DELIVERY_TAG) long tag,
                           @Header("retry_count", required = false) Integer retryCount) {
        
        retryCount = retryCount == null ? 0 : retryCount;
        
        try {
            // 1. 消息格式校验
            validateEvent(event);
            
            // 2. 业务处理
            orderService.process(event);
            
            channel.basicAck(tag, false);
            log.info("订单处理成功: orderId={}", event.getOrderId());
            
        } catch (MessageFormatException e) {
            // 消息格式错误,不应该重试,直接转死信
            log.error("消息格式错误: orderId={}", event.getOrderId(), e);
            deadLetterService.sendToDeadLetter(event, "消息格式错误: " + e.getMessage());
            channel.basicAck(tag, false);  // 直接 ACK,不重新入队
            
        } catch (BusinessException e) {
            // 业务异常,不应该重试
            log.error("业务异常: orderId={}", event.getOrderId(), e);
            deadLetterService.sendToDeadLetter(event, "业务异常: " + e.getMessage());
            channel.basicAck(tag, false);
            
        } catch (Exception e) {
            // 系统异常,可以重试
            log.error("系统异常: orderId={}, retryCount={}", 
                     event.getOrderId(), retryCount, e);
            
            if (retryCount < 3) {
                channel.basicNack(tag, false, true);  // 重新入队
            } else {
                deadLetterService.sendToDeadLetter(event, "重试次数超限");
                channel.basicAck(tag, false);
            }
        }
    }
    
    private void validateEvent(OrderEvent event) throws MessageFormatException {
        if (event.getOrderId() == null) {
            throw new MessageFormatException("订单ID不能为空");
        }
        if (event.getUserId() == null) {
            throw new MessageFormatException("用户ID不能为空");
        }
        if (event.getVersion() != null && event.getVersion() > 2) {
            throw new MessageFormatException("不支持的消息版本: " + event.getVersion());
        }
    }
}
```

## 排查与治理思路

### 生产端排查

如果怀疑消息没发出去,优先看:

#### 1. confirm 是否成功

```java
// 查看确认日志
rabbitTemplate.setConfirmCallback((correlationData, ack, cause) -> {
    if (!ack) {
        log.error("消息确认失败: correlationData={}, cause={}", correlationData, cause);
    }
});
```

#### 2. 是否触发 return callback

```java
// 查看退回日志
rabbitTemplate.setReturnsCallback(returned -> {
    log.error("消息路由失败: exchange={}, routingKey={}, replyText={}",
             returned.getExchange(), returned.getRoutingKey(), returned.getReplyText());
});
```

#### 3. Exchange、Routing Key、Binding 是否匹配

```bash
# 查看交换机
rabbitmqctl list_exchanges

# 查看队列
rabbitmqctl list_queues name messages

# 查看绑定
rabbitmqctl list_bindings
```

#### 4. 生产者本地重试和补偿日志是否完整

```java
@Service
public class OrderProducer {
    
    public void sendOrderCreated(OrderEvent event) {
        String messageId = UUID.randomUUID().toString();
        
        try {
            rabbitTemplate.convertAndSend(
                "order.exchange",
                "order.created",
                event,
                message -> {
                    message.getMessageProperties().setMessageId(messageId);
                    return message;
                },
                new CorrelationData(messageId)
            );
            
            // 记录发送日志
            sendLogService.save(new SendLog(messageId, "order.created", "SUCCESS"));
            
        } catch (Exception e) {
            // 记录失败日志
            sendLogService.save(new SendLog(messageId, "order.created", "FAILED", e.getMessage()));
            throw e;
        }
    }
}
```

### 消费端排查

如果消费异常或堆积上升,优先看:

#### 1. 是否使用手动 ack

```java
// √ 手动确认
@RabbitListener(queues = "order.queue", ackMode = "MANUAL")
public void handleOrder(OrderEvent event, Channel channel,
                        @Header(AmqpHeaders.DELIVERY_TAG) long tag) {
    try {
        orderService.process(event);
        channel.basicAck(tag, false);
    } catch (Exception e) {
        channel.basicNack(tag, false, true);
    }
}
```

#### 2. 重试是否存在风暴

```java
// × 重试风暴
@RabbitListener(queues = "order.queue")
public void handleOrder(OrderEvent event) {
    try {
        orderService.process(event);
    } catch (Exception e) {
        throw new RuntimeException(e);  // 立即重新入队
    }
}

// √ 延迟重试
@RabbitListener(queues = "order.queue", ackMode = "MANUAL")
public void handleOrder(OrderEvent event, Channel channel,
                       @Header(AmqpHeaders.DELIVERY_TAG) long tag) {
    try {
        orderService.process(event);
        channel.basicAck(tag, false);
    } catch (Exception e) {
        // 转延迟队列
        sendToRetryQueue(event);
        channel.basicAck(tag, false);
    }
}
```

#### 3. 死信队列数量是否快速增长

```java
@Scheduled(fixedRate = 60000)
public void monitorDeadLetter() {
    Properties props = rabbitAdmin.getQueueProperties("dlx.order.queue");
    Integer messageCount = (Integer) props.get("messageCount");
    
    if (messageCount > 100) {
        alertService.sendAlert("死信队列告警",
            String.format("死信队列消息数: %d", messageCount));
    }
}
```

#### 4. 消费逻辑是否幂等

```java
// √ 幂等检查
@RabbitListener(queues = "order.queue")
public void handleOrder(OrderEvent event) {
    String dedupKey = "order:dedup:" + event.getOrderId();
    if (!redisTemplate.opsForValue().setIfAbsent(dedupKey, "1", Duration.ofDays(7))) {
        return;  // 重复消息
    }
    orderService.process(event);
}
```

#### 5. 下游依赖 RT 和错误率是否异常

```java
@RabbitListener(queues = "order.queue")
public void handleOrder(OrderEvent event) {
    long start = System.currentTimeMillis();
    
    try {
        orderService.process(event);
        
        long cost = System.currentTimeMillis() - start;
        if (cost > 1000) {
            log.warn("处理耗时过长: orderId={}, cost={}ms", event.getOrderId(), cost);
        }
        
    } catch (Exception e) {
        log.error("处理失败: orderId={}", event.getOrderId(), e);
        meterRegistry.counter("rabbitmq.consume.error").increment();
    }
}
```

### 治理重点

```
┌─────────────────────────────────────────────┐
│  RabbitMQ 可靠性治理重点                    │
├─────────────────────────────────────────────┤
│  生产端:                                    │
│  - 必须同时处理 confirm 与 return           │
│  - 记录发送日志,支持补偿                    │
├─────────────────────────────────────────────┤
│  消费端:                                    │
│  - 必须幂等,且 ACK 放在业务成功之后         │
│  - 区分临时错误和永久错误                   │
├─────────────────────────────────────────────┤
│  重试策略:                                  │
│  - 要有限次、有间隔、有分类                 │
│  - 推荐指数退避                             │
├─────────────────────────────────────────────┤
│  死信队列:                                  │
│  - 必须可观测、可回放、可人工处理           │
│  - 定期清理和处理                           │
└─────────────────────────────────────────────┘
```

## 示例代码

### 完整的 RabbitMQ 可靠投递实现

```java
// 1. 配置
@Configuration
public class RabbitConfig {
    
    // 交换机
    @Bean
    public DirectExchange orderExchange() {
        return new DirectExchange("order.exchange", true, false);
    }
    
    // 主队列
    @Bean
    public Queue orderQueue() {
        return QueueBuilder.durable("order.queue")
            .withArgument("x-dead-letter-exchange", "dlx.exchange")
            .withArgument("x-dead-letter-routing-key", "dlx.order")
            .build();
    }
    
    // 延迟队列
    @Bean
    public Queue delayQueue() {
        return QueueBuilder.durable("order.delay.queue")
            .withArgument("x-dead-letter-exchange", "order.exchange")
            .withArgument("x-dead-letter-routing-key", "order.queue")
            .withArgument("x-message-ttl", 10000)
            .build();
    }
    
    // 绑定
    @Bean
    public Binding orderBinding() {
        return BindingBuilder
            .bind(orderQueue())
            .to(orderExchange())
            .with("order.created");
    }
}

// 2. 生产者
@Service
@Slf4j
public class OrderProducer {
    @Autowired
    private RabbitTemplate rabbitTemplate;
    
    @PostConstruct
    public void init() {
        rabbitTemplate.setConfirmCallback((correlationData, ack, cause) -> {
            if (!ack) {
                log.error("消息确认失败: correlationData={}, cause={}", correlationData, cause);
                failedMessageService.save(correlationData.getId(), "确认失败");
            }
        });
        
        rabbitTemplate.setReturnsCallback(returned -> {
            log.error("消息路由失败: {}", returned);
            failedMessageService.save(
                returned.getExchange(),
                returned.getRoutingKey(),
                new String(returned.getMessage().getBody())
            );
        });
    }
    
    public void sendOrderCreated(OrderEvent event) {
        String messageId = UUID.randomUUID().toString();
        
        rabbitTemplate.convertAndSend(
            "order.exchange",
            "order.created",
            event,
            message -> {
                message.getMessageProperties().setMessageId(messageId);
                message.getMessageProperties().setDeliveryMode(MessageDeliveryMode.PERSISTENT);
                return message;
            },
            new CorrelationData(messageId)
        );
    }
}

// 3. 消费者
@Service
@Slf4j
public class OrderConsumer {
    @Autowired
    private OrderService orderService;
    @Autowired
    private StringRedisTemplate redisTemplate;
    @Autowired
    private DeadLetterService deadLetterService;
    
    @RabbitListener(queues = "order.queue", ackMode = "MANUAL")
    public void handleOrder(OrderEvent event, Channel channel,
                           @Header(AmqpHeaders.DELIVERY_TAG) long tag,
                           @Header("retry_count", required = false) Integer retryCount) {
        
        retryCount = retryCount == null ? 0 : retryCount;
        String dedupKey = "order:dedup:" + event.getOrderId();
        
        try {
            // 幂等检查
            Boolean isFirst = redisTemplate.opsForValue()
                .setIfAbsent(dedupKey, "1", Duration.ofDays(7));
            
            if (Boolean.FALSE.equals(isFirst)) {
                log.info("重复消息: orderId={}", event.getOrderId());
                channel.basicAck(tag, false);
                return;
            }
            
            // 业务处理
            orderService.process(event);
            channel.basicAck(tag, false);
            log.info("订单处理成功: orderId={}", event.getOrderId());
            
        } catch (Exception e) {
            log.error("订单处理失败: orderId={}, retryCount={}", 
                     event.getOrderId(), retryCount, e);
            
            if (retryCount < 3) {
                // 延迟重试
                sendToDelayQueue(event, retryCount + 1);
                channel.basicAck(tag, false);
            } else {
                // 转死信
                deadLetterService.sendToDeadLetter(event, "重试次数超限");
                channel.basicAck(tag, false);
            }
        }
    }
}
```

## 常见误区

### × 误区一:只开 confirm,不处理路由失败

```java
// × 只开 confirm,路由失败不处理
rabbitTemplate.setConfirmCallback((correlationData, ack, cause) -> {
    if (!ack) {
        log.error("确认失败");
    }
});

// √ 同时处理 confirm 和 return
rabbitTemplate.setConfirmCallback(...);
rabbitTemplate.setReturnsCallback(returned -> {
    log.error("路由失败: {}", returned);
});
```

### × 误区二:消费者收到消息就立刻 ack

```java
// × 自动 ACK 后业务失败,消息丢失
@RabbitListener(queues = "order.queue")
public void handleOrder(OrderEvent event) {
    // 消息已 ACK
    orderService.process(event);  // 如果失败,消息丢失
}

// √ 业务成功后再 ACK
@RabbitListener(queues = "order.queue", ackMode = "MANUAL")
public void handleOrder(OrderEvent event, Channel channel,
                        @Header(AmqpHeaders.DELIVERY_TAG) long tag) {
    try {
        orderService.process(event);
        channel.basicAck(tag, false);  // 业务成功后 ACK
    } catch (Exception e) {
        channel.basicNack(tag, false, true);  // 失败时 NACK
    }
}
```

### × 误区三:所有错误都原地重试

```java
// × 立即重试,可能导致重试风暴
@RabbitListener(queues = "order.queue")
public void handleOrder(OrderEvent event) {
    try {
        orderService.process(event);
    } catch (Exception e) {
        throw new RuntimeException(e);  // 立即重新入队
    }
}

// √ 延迟重试,指数退避
@RabbitListener(queues = "order.queue", ackMode = "MANUAL")
public void handleOrder(OrderEvent event, Channel channel, ...) {
    try {
        orderService.process(event);
        channel.basicAck(tag, false);
    } catch (Exception e) {
        sendToDelayQueue(event, retryCount + 1);  // 延迟重试
        channel.basicAck(tag, false);
    }
}
```

### × 误区四:有死信队列但没人监控

```java
// √ 定期监控死信队列
@Scheduled(fixedRate = 60000)
public void monitorDeadLetter() {
    Properties props = rabbitAdmin.getQueueProperties("dlx.order.queue");
    Integer messageCount = (Integer) props.get("messageCount");
    
    if (messageCount > 100) {
        alertService.sendAlert("死信队列告警", 
            String.format("消息数: %d", messageCount));
    }
}
```

### × 误区五:以为 RabbitMQ 可靠投递就能替代业务幂等

```java
// × 没有幂等检查
@RabbitListener(queues = "order.queue")
public void handleOrder(OrderEvent event) {
    orderService.process(event);  // 重复消息会导致重复处理
}

// √ 幂等检查
@RabbitListener(queues = "order.queue")
public void handleOrder(OrderEvent event) {
    String dedupKey = "order:dedup:" + event.getOrderId();
    if (!redisTemplate.opsForValue().setIfAbsent(dedupKey, "1", Duration.ofDays(7))) {
        return;  // 重复消息
    }
    orderService.process(event);
}
```

## 面试补充

### 1. confirm 和 return callback 的区别是什么?

**答案:**

- **confirm**: 关注消息是否到达 Broker(交换机)
- **return callback**: 关注消息是否路由到队列

两者解决不同问题:
- confirm 失败 → 生产者发送失败
- return 触发 → 消息到达交换机但路由不到队列

### 2. 为什么手动 ack 更适合关键业务消费?

**答案:**

手动 ACK 可以在业务成功后再确认,避免:
- 自动 ACK 后业务失败,消息丢失
- 消费者宕机,未处理的消息丢失

手动 ACK 提供了更好的可靠性保障。

### 3. 死信队列的价值是什么?

**答案:**

死信队列的价值:
- 隔离异常消息,避免阻塞主队列
- 提供排障入口,便于定位问题
- 支持人工处理或自动补偿
- 保护系统稳定性

### 4. 为什么 RabbitMQ 常用于业务事件分发?

**答案:**

因为 RabbitMQ 的路由能力非常灵活:
- 四种 Exchange 类型满足不同场景
- Routing Key 支持精确匹配和模式匹配
- 支持 Binding 灵活配置
- 死信队列和确认机制完善

非常适合订单事件、通知分发等业务场景。

### 5. 生产成功、路由成功、消费成功为什么是三段不同的可靠性问题?

**答案:**

- **生产成功**: 消息从生产者到达 Broker(需要 confirm 确认)
- **路由成功**: 消息从交换机路由到队列(需要 return callback 监控)
- **消费成功**: 消息被消费者正确处理(需要手动 ACK)

任何一环失败,业务上都可能等于消息丢失,需要分别保障。

## 实战理解题

### 题目一:设计订单系统的 RabbitMQ 可靠投递方案

**需求:**
- 订单创建后发送消息
- 要保证消息不丢失
- 要处理路由失败的情况

**参考方案:**

```
1. 生产者:
   - 开启 confirm 机制
   - 开启 return callback
   - 记录发送日志

2. Broker:
   - 交换机、队列持久化
   - 消息持久化

3. 消费者:
   - 手动 ACK
   - 幂等性检查
   - 延迟重试

4. 监控:
   - 监控队列深度
   - 监控死信队列
   - 监控消费延迟
```

### 题目二:设计延迟队列方案

**需求:**
- 订单创建后 30 分钟未支付,自动取消
- 使用 RabbitMQ 实现

**参考方案:**

```
订单创建 → 订单队列(30分钟 TTL)
              ↓
           死信交换机
              ↓
           死信队列(订单取消)
              ↓
           取消订单逻辑
```

---

**参考资料:**

- [RabbitMQ 官方文档](https://www.rabbitmq.com/documentation.html)
- [RabbitMQ Reliability Guide](https://www.rabbitmq.com/reliability.html)
- [Spring AMQP 文档](https://docs.spring.io/spring-amqp/reference/)
- 《RabbitMQ 实战指南》

**最后更新:** 2026-03-30

## 版本差异(旧版 → 当前)

| 组件 | 旧版（本文编写时） | 当前 |
|------|-------------------|------|
| RabbitMQ | 3.8/3.9 | 3.13/4.x（quorum queue 为默认推荐） |
| Kafka | 2.x/3.0 | 3.7+/4.x（KRaft 模式取代 ZooKeeper） |
| RocketMQ | 4.x | 5.x（gRPC 通信、简化运维） |
| Java 版本 | JDK 8 | JDK 17+（Kafka 3.7+ 客户端要求） |

> 本文讲解的消息可靠性设计（投递确认、死信、幂等、顺序）原理不变；注意各中间件版本升级后的配置差异，如 Kafka 的 KRaft 模式、RabbitMQ 的 quorum queue。
