---
title: "消息架构：如何把握 Spring Cloud Stream 的基本架构？"
description: "Spring Cloud Stream 四大核心组件（Binder/Channel/Source/Sink），@Input/@Output 注解与自定义通道，发布-订阅模型、消费者组与消息分区三大概念，以及 Binder 与 RabbitMQ/Kafka 的整合方式。"
keywords: [消息架构, 如何把握, Spring, Cloud, Stream, 的基本架构]
category: "Java"
tags: [Java, SpringCloud原理与实战]
---
# 消息架构：如何把握 Spring Cloud Stream 的基本架构？

## 概念说明

事件驱动架构的基本原理以及 Spring 对消息传递机制的抽象之上，还有多种在案例系统中添加消息发送和接收效果的实现方法：可以直接使用诸如 RabbitMQ、Kafka 等消息中间件来实现消息传递，但这种解决方案的主要问题在于需要开发人员考虑不同框架的使用方式以及框架之间存在的功能差异性。Spring Cloud Stream 则不同，它在内部整合了多款主流的消息中间件，为开发人员提供了一个平台型解决方案，从而屏蔽各个消息中间件在技术实现上的差异。本文介绍 Spring Cloud Stream 的基本架构，并给出它与目前主流的各种消息中间件之间的整合机制。

## 原理与机制：Spring Cloud Stream 基本架构

Spring Cloud Stream 对整个消息发布和消费过程做了高度抽象，并提供了一系列核心组件。先介绍通过 Spring Cloud Stream 构建消息传递机制的基本工作流程。

Spring Cloud Stream 工作流程图

Spring Cloud Stream 具备四个核心组件，分别是 Binder、Channel、Source 和 Sink，其中 Binder 和 Channel 成对出现，而 Source 和 Sink 分别面向消息的发布者和消费者。

- Source 和 Sink

在 Spring Cloud Stream 中，Source 组件是真正生成消息的组件，相当于是一个输出（Output）组件。而 Sink 则是真正消费消息的组件，相当于是一个输入（Input）组件。根据事件驱动架构的原理，对于同一个 Source 组件而言，不同的微服务可能会实现不同的 Sink 组件，分别根据自身需求进行业务上的处理。

在 Spring Cloud Stream 中，Source 组件使用一个普通的 POJO 对象来充当需要发布的消息，通过将该对象进行序列化（默认的序列化方式是 JSON）然后发布到 Channel 中。另一方面，Sink 组件监听 Channel 并等待消息的到来，一旦有可用消息，Sink 将该消息反序列化为一个 POJO 对象并用于处理业务逻辑。

- Channel

Channel 的概念比较容易理解，就是常见的通道，是对队列的一种抽象。在消息传递系统中，队列的作用就是实现存储转发的媒介，消息生产者所生成的消息都将保存在队列中并由消息消费者进行消费。通道的名称对应的往往就是队列的名称。

- Binder

Spring Cloud Stream 中最重要的概念就是 Binder。所谓 Binder，顾名思义就是一种黏合剂，将业务服务与消息传递系统黏合在一起。通过 Binder，可以很方便地连接消息中间件，可以动态地改变消息的目标地址、发送方式而不需要了解其背后的各种消息中间件在实现上的差异。关于 Binder 如何与不同的消息中间件进行整合的实现原理，后文会有源码级的专题讨论。

## 代码示例：Spring Cloud Stream 集成 Spring 消息处理机制

结合 Spring Messaging 和 Spring Integration 的相关概念，就不难理解 Spring Cloud Stream 中关于 Source 和 Sink 的定义。Source 和 Sink 都是接口，其中 Source 接口的定义如下

```java
import org.springframework.cloud.stream.annotation.Output;
import org.springframework.messaging.MessageChannel;

public interface Source {

String OUTPUT = "output";

    @Output(Source.OUTPUT)
    MessageChannel output();
}
```

注意到这里通过 MessageChannel 来发送消息，而 MessageChannel 类来自 Spring Messaging 组件。MessageChannel 上有一个 @Output 注解，该注解定义了一个输出通道。

类似的，Sink 接口定义如下：

```java
import org.springframework.cloud.stream.annotation.Input;
import org.springframework.messaging.SubscribableChannel;

public interface Sink{

String INPUT = "input";

    @Input(Sink.INPUT)
    SubscribableChannel input();
}
```

同样，这里通过 Spring Messaging 中的 SubscribableChannel 来实现消息接收，而 @Input 注解定义了一个输入通道。

注意到 @Input 和 @Output 注解使用通道名称作为参数，如果没有名称，会使用带注解的方法名字作为参数，也就是默认情况下分别使用“input”和“output”作为通道名称。从这个角度讲，一个 Spring Cloud Stream 应用程序中的 Input 和 Output 通道数量和名称都是可以任意设置的，只需要在这些通道的定义上添加 @Input 和 @Output 注解即可。例如在如下所示的代码中，定义了 SpringHealthChannel 接口并声明了一个 Input 通道和两个 Output 通道，说明使用该通道的服务会从外部的一个通道中获取消息并向外部的两个通道发送消息：

```java
public interface SpringHealthChannel {

@Input
	    SubscribableChannel input1();

@Output
	    MessageChannel output1();

	    @Output
	    MessageChannel output2();
}
```

可以看到上述接口定义中同时使用到了 Spring Messaging 中的 SubscribableChannel 和 MessageChannel。Spring Cloud Stream 对 Spring Messaging 和 Spring Integration 提供了原生支持。在常规情况下，不需要使用这些框架中提供的 API 就能完成常见的开发需求；但如果确实有需要，也可以使用更为底层的 API 直接操控消息发布和接收过程。

## Binder 与消息中间件的整合

对于 Spring Cloud Stream 而言，最核心的无疑是 Binder 组件。Binder 组件是服务与消息中间件之间的一层抽象，但各种消息中间件在消息传递机制的设计和实现上存在一定的差异性，Spring Cloud Stream 通过梳理自身的消息传递模型来屏蔽这些差异性。

### Spring Cloud Stream 中的消息传递模型

Spring Cloud Stream 将消息发布和消费抽象成如下三个核心概念，并结合目前主流的一些消息中间件对这些概念提供了统一的实现方式。

- 发布-订阅模型

点对点模型和发布-订阅模型是传统消息传递系统的两大基本模型，其中点对点模型实际上可以被视为发布-订阅模型在订阅者数量为 1 时的一种特例。因此，在 Spring Cloud Stream 中，统一通过发布-订阅模型完成消息的发布和消费。

- 消费者组

设计消费者组（Consumer Group）的目的是应对集群环境下的多服务实例问题。显然，如果采用发布-订阅模式就会导致一个服务的不同实例都消费到了同一条消息。为了解决这个问题，Spring Cloud Stream 中提供了消费者组的概念。一旦使用了消费组，一条消息就只能被同一个组中的某一个服务实例所消费。

- 消息分区

假如希望相同的消息都被同一个微服务实例来处理，但又有多个服务实例组成了负载均衡结构，那么通过上述的消费组概念仍然不能满足要求。针对这一场景，Spring Cloud Stream 又引入了消息分区（Partition）的概念。引入分区概念的意义在于，同一分区中的消息能够确保始终是由同一个消费者实例进行消费。

### Binder 与消息中间件

Binder 组件本质上是一个中间层，负责与各种消息中间件的交互。目前，Spring Cloud Stream 中集成的消息中间件包括 RabbitMQ 和 Kafka。在具体介绍如何使用 Spring Cloud Stream 进行消息发布和消费之前，先结合消息传递机制给出 Binder 对这两种不同消息中间件的整合方式。

- RabbitMQ

RabbitMQ 是 AMQP（Advanced Message Queuing Protocol，高级消息队列协议）协议的典型实现框架。在 RabbitMQ 中，核心概念是交换器（Exchange）。可以通过控制交换器与队列之间的路由规则来实现对消息的存储转发、点对点、发布-订阅等消息传递模型。在一个 RabbitMQ 中可能会存在多个队列，交换器如果想要把消息发送到具体某一个队列，就需要通过两者之间的绑定规则来设置路由信息。路由信息的设置是开发人员操控 RabbitMQ 的主要手段，而路由过程的执行依赖于消息头中的路由键（Routing Key）属性。交换器会检查路由键并结合路由算法来决定将消息路由到哪个队列中去。一条来自生产者的消息通过交换器中的路由算法可以发送给一个或多个队列，从而分别实现点对点和发布订阅功能。同时，由此也可以得出消费者组的实现方案：因为 RabbitMQ 里每个队列是被消费者竞争消费的，所以指定同一个组的消费者消费同一个队列就可以实现消费者组。

- Kafka

从架构上讲，在 Kafka 中，生产者使用推模式将消息发布到服务器，而消费者使用拉模式从服务器订阅消息。在 Kafka 2.8 之前的版本中还使用到了 Zookeeper，其作用在于实现服务器与消费者之间的负载均衡，所以启动 Kafka 之前必须确保 Zookeeper 正常运行（Kafka 2.8 起提供 KRaft 模式，可脱离 Zookeeper 运行）。

在 Kafka 中，多个消费者可以构成一种组结构，消息只能传输给某个组中的某一个消费者。也就是说，Kafka 中消息的消费具有显式的分布式特性，天生就内置了 Spring Cloud Stream 中的消费组概念。

在 SpringHealth 案例中，将同时基于 RabbitMQ 和 Kafka 来展示 Spring Cloud Stream 的各项功能特性。

## 实践要点

- Spring Cloud Stream 的四大核心组件：Source（输出，生成消息并序列化发布）、Sink（输入，监听并反序列化消费）、Channel（队列抽象，通道名通常对应队列名）、Binder（连接业务服务与消息中间件的黏合层）。
- Source/Sink 分别基于 Spring Messaging 的 MessageChannel 与 SubscribableChannel，通过 @Output/@Input 注解声明通道；注解缺省时以方法名作为通道名（output/input），自定义通道只需定义接口方法并标注注解。
- 消息传递统一采用发布-订阅模型：点对点模型可视为订阅者为 1 的特例。
- 消费者组解决集群多实例重复消费问题（一条消息仅被同组一个实例消费）；消息分区解决“相同消息由同一实例处理”的有序性需求，两者常配合使用。
- RabbitMQ 整合依托 Exchange + Routing Key 路由机制实现点对点与发布订阅；消费者组通过让同组消费者竞争消费同一队列实现。
- Kafka 天生内置消费组语义（组内竞争消费），生产者推模式、消费者拉模式；2.8 之前依赖 Zookeeper，2.8 起可用 KRaft 模式独立运行。

## 小结

Spring Cloud Stream 是 Spring Cloud 中针对消息处理的一款平台型框架，其核心优势在于内部集成了 RabbitMQ、Kafka 等主流消息中间件，对外提供统一的 API 接入层，这一目标通过 Binder 实现。框架以 Source/Sink/Channel/Binder 四大组件构成基本架构，与 Spring Messaging/Spring Integration 原生集成并支持自定义通道；针对消息处理场景下的发布-订阅、消费者分组、消息分区等需求，框架内置了统一抽象并完成与不同消息中间件之间的整合。

## 版本差异（Spring Cloud 旧版 → 2025.x）

| 组件 | 旧版（本文编写时） | 当前（Spring Cloud 2025.x / Boot 3.5.x） |
|------|-------------------|------------------------------------------|
| 服务注册 | Eureka 1.x（Eureka 2.x 已终止开发） | Nacos 2.x / Consul（Eureka 1.x 仍随 Spring Cloud Netflix 维护） |
| 负载均衡 | Ribbon（已停止维护） | Spring Cloud LoadBalancer |
| 网关 | Zuul 1.x（已停止维护） | Spring Cloud Gateway（基于 WebFlux） |
| 熔断 | Hystrix（已停止维护） | Resilience4j / Sentinel |
| 配置中心 | Spring Cloud Config | Nacos Config / Apollo |
| 版本对应 | Hoxton/2020.x + Boot 2.x + JDK 8 | 2025.x + Boot 3.5.x + JDK 17+ |

> 本文基于 Spring Cloud 旧版（Hoxton/2020.x 时代）编写。Hystrix、Ribbon、Zuul 1.x、Eureka 已停止维护，新项目请使用 Spring Cloud Gateway + LoadBalancer + Resilience4j（或 Alibaba 系 Nacos/Sentinel/Seata），并升级到 Spring Cloud 2025.x + Spring Boot 3.5.x。

## 相关阅读

Stream 的 Binder 架构见本文；消息可靠性（投递确认、幂等、积压治理）的深入内容见 [13-消息队列导航](../../13-消息队列/00-导航.md)，消息消费落库与数据库一致性配合见 [12-数据库总览](../../12-数据库/00-数据库.md)。
