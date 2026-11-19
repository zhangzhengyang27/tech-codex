---
title: "消息消费：如何使用 Spring Cloud Stream 实现消息发布者和消费者？（下）"
description: "使用 @EnableBinding(Sink.class) 与 @StreamListener 实现消息消费，RedisTemplate 缓存更新逻辑，以及自定义消息通道、消费者分组（group）与消息分区（partitionKeyExpression/instanceIndex）高级配置。"
keywords: [消息消费, Spring Cloud Stream, 消息发布者, 消息消费者]
category: "Java"
tags: [Java, SpringCloud原理与实战]
---
# 消息消费：如何使用 Spring Cloud Stream 实现消息发布者和消费者？（下）

## 概念说明

消息消费是消息驱动的微服务架构中与消息发布对应的另一端：服务通过 Binder 绑定接收通道（Sink），监听消息中间件中的事件并执行相应的业务处理。以下以 SpringHealth 案例中 user-service 发布 UserInfoChangedEvent 事件、intervention-service 消费该事件为例，介绍消息消费者的实现方法，以及自定义消息通道、消费者分组、消息分区等高级主题。

消息消费实现流程

## 在服务中添加消息消费者

消费者组件的实现与发布者采用相同的方式展开，首当其冲的是使用 @EnableBinding 注解。

### 使用 @EnableBinding 注解

与初始化消息发布环境一样，需要在 intervention-service 引入 spring-cloud-stream、spring-cloud-starter-stream-kafka 或 spring-cloud-starter-stream-rabbit 这几个 Maven 依赖，并构建 Bootstrap 类。intervention-service 中的 Bootstrap 类是 InterventionApplication，其代码如下所示：

```java
@SpringCloudApplication
@EnableBinding(Sink.class)
public class InterventionApplication{

    public static void main(String[] args) {
        SpringApplication.run(InterventionApplication.class, args);
    }
}
```

对于作为消息消费者的 Bootstrap 类而言，@EnableBinding 注解所绑定的应该是 Sink 接口。

### 创建 Sink

UserInfoChangedSink 负责处理具体的消息消费逻辑，代码如下所示：

```java
import org.springframework.cloud.stream.annotation.EnableBinding;
import org.springframework.cloud.stream.annotation.StreamListener;
...

public class UserInfoChangedSink {

@Autowired
    private UserInfoRedisRepository userInfoRedisRepository;

private static final Logger logger = LoggerFactory.getLogger(UserInfoChangedSink.class);

@StreamListener("input")
    public void handleChangedUserInfo(UserInfoChangedEventMapper userInfoChangedEventMapper) {

logger.debug("Received a message of type " + userInfoChangedEventMapper.getType());
     logger.debug("Received a {} event from the user-service for user name {}",
             userInfoChangedEventMapper.getOperation(),
             userInfoChangedEventMapper.getUser().getUserName());

        if(userInfoChangedEventMapper.getOperation().equals("ADD")) {
            userInfoRedisRepository.saveUser(userInfoChangedEventMapper.getUser());
        } else if(userInfoChangedEventMapper.getOperation().equals("UPDATE")) {
         userInfoRedisRepository.updateUser(userInfoChangedEventMapper.getUser());
        } else if(userInfoChangedEventMapper.getOperation().equals("DELETE")) {
         userInfoRedisRepository.deleteUser(userInfoChangedEventMapper.getUser().getUserName());
        } else {
            logger.error("Received an UNKNOWN event from the user-service of type {}", userInfoChangedEventMapper.getType());
        }
    }
}
```

这里引入了一个新的注解 @StreamListener。将该注解添加到某个方法上就可以使之接收处理流中的事件。在上面的例子中，@StreamListener 注解添加在了 handleChangedUserInfo() 方法上并指向了“input”通道，意味着所有流经“input”通道的消息都会交由这个 handleChangedUserInfo() 方法进行处理。

handleChangedUserInfo() 方法中调用 UserInfoRedisRepository 类完成各种缓存相关的处理。UserInfoRedisRepository 的实现代码参考如下：

```java
@Repository
public class UserInfoRedisRepositoryImpl implements UserInfoRedisRepository {
    private static final String HASH_NAME = "user";

private RedisTemplate<String, UserMapper> redisTemplate;
    private HashOperations<String, String, UserMapper> hashOperations;

public UserInfoRedisRepositoryImpl() {
        super();
    }

@Autowired
    private UserInfoRedisRepositoryImpl(RedisTemplate<String, UserMapper> redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

@PostConstruct
    private void init() {
        hashOperations = redisTemplate.opsForHash();
    }

@Override
    public void saveUser(UserMapper user) {
        hashOperations.put(HASH_NAME, user.getUserName(), user);
    }

@Override
    public void updateUser(UserMapper user) {
        hashOperations.put(HASH_NAME, user.getUserName(), user);
    }

@Override
    public void deleteUser(String userName) {
        hashOperations.delete(HASH_NAME, userName);
    }

    @Override
    public UserMapper findUserByUserName(String userName) {
        return (UserMapper) hashOperations.get(HASH_NAME, userName);
    }
}
```

这里使用 Spring Data 提供的 RedisTemplate 和 HashOperations 工具类来封装对 Redis 的数据操作。Spring Data 的使用方法可参考相关资料进一步了解。

### 配置 Binder

对于消息消费者而言，配置 Binder 的方式和消息发布者非常类似。如果使用默认的消息通道，只需把用于发送的“output”通道改为接收的“input”通道。这里以 Kafka 为例，给出 Binder 的配置信息，如下所示：

```xml
spring:
  cloud:
    stream:
      bindings:
        input:
          destination: userInfoChangedTopic
          content-type: application/json
      kafka:
        binder:
          zk-nodes: localhost
          brokers: localhost
```

## Spring Cloud Stream 高级主题

在消息发布者和消费者的基本实现过程之上，Spring Cloud Stream 还提供三类高级主题：自定义消息通道、消费者组以及消息分区。

### 自定义消息通道

前面的示例中，无论消息发布还是消息消费，都使用了 Spring Cloud Stream 默认提供的通道名“output”和“input”。在有些场景下，为了更好地管理系统中存在的所有通道，为通道进行命名是一项最佳实践，这对消息消费的场景尤为重要。以下针对消息消费场景，不使用 Sink 组件默认提供的“input”通道，而是通过自定义通道的方式实现消息消费。

在 Spring Cloud Stream 中，实现一个面向消息消费场景的自定义通道非常简单：只需定义一个新的接口，并在该接口中通过 @Input 注解声明一个新的 Channel。例如定义一个新的 UserInfoChangedChannel 接口，通过 @Input 注解即可声明一个“userInfoChangedChannel”通道，代码如下所示。

```java
import org.springframework.cloud.stream.annotation.Input;
import org.springframework.messaging.SubscribableChannel;

public interface UserInfoChangedChannel{

String USER_INFO = "userInfoChangedChannel";

    @Input(UserInfoChangedChannel.USER_INFO)
    SubscribableChannel userInfoChangedChannel();
}
```

该通道的类型为 Spring Integration 中用于消费消息的 SubscribableChannel。UserInfoChangedChannel 的代码风格与 Spring Cloud Stream 自带的 Sink 接口完全一致，Sink 接口的定义如下所示：

```java
import org.springframework.cloud.stream.annotation.Input;
import org.springframework.messaging.SubscribableChannel;

public interface Sink{

String INPUT = "input";

    @Input(Sink.INPUT)
    SubscribableChannel input();
}
```

完成自定义消息通道后，就可以在 @StreamListener 注解中设置这个通道。以前面介绍的 UserInfoChangedSink 为例，添加了自定义通道之后的重构代码结构如下所示：

```java
@EnableBinding(UserInfoChangedChannel.class)
public class UserInfoChangedSink{

    @StreamListener(UserInfoChangedChannel.USER_INFO)
public void handleChangedUserInfo(UserInfoChangedEventMapper userInfoChangedEventMapper) {
	     …
	}
}
```

这里继续使用 @EnableBinding 注解绑定了自定义的 UserInfoChangedChannel。因为 UserInfoChangedChannel 中通过 @Input 注解提供了“userInfoChangedChannel”通道，所以这种用法实际上和 @EnableBinding(Sink.class) 完全一致。因此对 Binder 配置而言，只需调整通道的名称。再次以 Kafka 为例，重构后的 Binder 配置信息如下所示：

```xml
spring:
  cloud:
    stream:
      bindings:
        userInfoChangedChannel:
          destination: userInfoChangedTopic
          content-type: application/json
      kafka:
        binder:
          zk-nodes: localhost
          brokers: localhost
```

### 使用消费者分组

微服务架构中，服务多实例部署的场景非常常见。在集群环境下，希望服务的不同实例被放置在竞争的消费者关系中，同一服务集群中只有一个实例能够处理给定消息。Spring Cloud Stream 提供的消费者分组可以很方便地实现这一需求：两个 intervention-service 实例构成一个 interventionGroup，在这个 interventionGroup 中，UserInfoChangedEvent 事件只会被一个 intervention-service 实例所消费。

实现这一消息消费效果，只需重构 Binder 配置，在配置 Binder 时指定消费者分组信息，如下所示：

```xml
spring:
  cloud:
    stream:
      bindings:
        userInfoChangedChannel:
          destination: userInfoChangedTopic
          content-type: application/json
          group: interventionGroup
      kafka:
        binder:
          zk-nodes: localhost
          brokers: localhost
```

以上基于 Kafka 的配置信息中，“bindings”段中的通道名称使用了自定义的“userInfoChangedChannel”，并且在该配置项中设置了“group”为“interventionGroup”。

### 使用消息分区

Spring Cloud Stream 的最后一项高级主题是消费分区。同样在集群环境下，假设存在两个 intervention-service 实例，希望用户信息中 id 为单号的 UserInfoChangedEvent 始终由第一个 intervention-service 实例进行消费，id 为双号的 UserInfoChangedEvent 则始终由第二个 intervention-service 实例进行消费。基于类似这样的需求，可以构建消息分区，如下所示：

intervention-service 消息分区效果示意图

实现按单双号分流的消息消费效果，同样只需重构 Binder 配置。以 RabbitMQ 为例，示例配置如下所示：

```xml
spring:
  cloud:
    stream:
      bindings:
        default:
          content-type: application/json
          binder: rabbitmq
        output:
             destination: userInfoChangedExchange
           group: interventionGroup
          producer:
            partitionKeyExpression: payload.user.id % 2
            partitionCount: 2
      binders:
        rabbitmq:
          type: rabbit
          environment:
            spring:
              rabbitmq:
                host: 127.0.0.1
                port: 5672
                username: guest
                password: guest
                virtual-host: /
```

上述配置项针对的是消息发布者 Source 组件（出现了“output”配置项），其中指定的交换器和消费者分组分别为“userInfoChangedExchange”和“interventionGroup”。配置中出现的两个新配置项“partitionKeyExpression”和“partitionCount”与消息分区有关：“partitionKeyExpression”指定为“payload.user.id % 2”，意味着 Spring Cloud Stream 会根据传入的 UserInfoChangedEvent 中 User 对象的 id 对 2 进行取模操作——取模值为 0 的消息路由到分区 0，取模值为 1 的消息路由到分区 1，两个分区分别对应 instanceIndex 为 0 和 1 的消费者实例。通过这样的分区策略，分区的数量“partitionCount”应该为 2。

对应的，作为消息消费者的 Sink 组件的配置项如下所示：

```xml
spring:
  cloud:
    stream:
      bindings:
        default:
          content-type: application/json
          binder: rabbitmq
        input:
          destination: userInfoChangedExchange
          group: interventionGroup
          consumer:
            partitioned: true
            instanceIndex: 0
            instanceCount: 2
      binders:
        rabbitmq:
          type: rabbit
          environment:
            spring:
              rabbitmq:
                host: 127.0.0.1
                port: 5672
                username: guest
                password: guest
                virtual-host: /
```

上述配置中同样包含了分区信息：partitioned=true 表示启用消息分区功能，instanceCount=2 表示消息分区的消费者节点数量为 2 个。特别注意 instanceIndex 参数用来设置当前消费者实例的索引号，从 0 开始，这里把当前服务实例的索引号设置为 0；在另外一个 intervention-service 实例中需要将 instanceIndex 设置为 1。

演示消息分区功能需要运行一个 user-service 作为 Source 组件，以及两个独立的 intervention-service 作为 Sink 组件，构建完整的示例并观察运行时应用系统的控制台输出：两个 Sink 组件按照分区策略进行消息处理，UserInfoChangedEvent 中 User 对象的 Id 在两个 Sink 组件的输出中成单双数交替出现。

## 实践要点

- 消费端三件套：@EnableBinding(Sink/自定义 Channel) + @StreamListener 监听通道 + Binder 配置绑定 destination。
- 多实例部署必须配置消费者分组（group），保证同一消息只被集群中的一个实例消费。
- 需要按业务键路由到固定实例时启用消息分区：生产端配 partitionKeyExpression + partitionCount，消费端配 partitioned=true + instanceCount + instanceIndex（从 0 开始）。
- 通道命名最佳实践：通过 @Input 自定义通道名统一管理系统中所有通道，Binder 配置中的 key 同步调整。

## 小结

- 消息消费者的实现与发布者对称：@EnableBinding(Sink.class) 绑定“input”通道，@StreamListener 方法处理事件，Binder 配置将通道绑定到具体的 destination 与中间件。
- 自定义消息通道通过定义接口 + @Input 注解实现，用法与 Sink 完全一致。
- 消费者分组（group）解决多实例竞争消费问题；消息分区（partitionKeyExpression / partitioned / instanceIndex / instanceCount）实现按 Key 定向路由到指定实例。

## 版本差异（Spring Cloud 旧版 → 2025.x）

| 组件 | 旧版（本文编写时） | 当前（Spring Cloud 2025.x / Boot 3.5.x） |
|------|-------------------|------------------------------------------|
| 服务注册 | Eureka 1.x（Eureka 2.x 已终止开发） | Nacos 2.x / Consul（Eureka 1.x 仍随 Spring Cloud Netflix 维护） |
| 负载均衡 | Ribbon（已停止维护） | Spring Cloud LoadBalancer |
| 网关 | Zuul 1.x（已停止维护） | Spring Cloud Gateway（基于 WebFlux） |
| 熔断 | Hystrix（已停止维护） | Resilience4j / Sentinel |
| 配置中心 | Spring Cloud Config | Nacos Config / Apollo |
| 版本对应 | Hoxton/2020.x + Boot 2.x + JDK 8 | 2025.x + Boot 3.5.x + JDK 17+ |

> 本篇基于 Spring Cloud 旧版（Hoxton/2020.x 时代）编写。Hystrix、Ribbon、Zuul 1.x、Eureka 已停止维护，新项目请使用 Spring Cloud Gateway + LoadBalancer + Resilience4j（或 Alibaba 系 Nacos/Sentinel/Seata），并升级到 Spring Cloud 2025.x + Spring Boot 3.5.x。

## 相关阅读

本篇讲消息消费端的接入实现;消费可靠性(幂等、重试、积压治理)的深潜见 [13-消息队列导航](../../13-消息队列/00-导航.md),消息消费落库与数据库一致性配合见 [12-数据库总览](../../12-数据库/00-数据库.md)。
