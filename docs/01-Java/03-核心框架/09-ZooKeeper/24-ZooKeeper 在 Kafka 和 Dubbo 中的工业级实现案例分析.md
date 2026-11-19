---
title: "ZooKeeper 在 Kafka 和 Dubbo 中的工业级实现案例分析"
description: "分析 Dubbo 与 Kafka 两个主流开源框架中 ZooKeeper 的工业级实现：Dubbo 基于 ZooKeeper 构建服务注册中心实现服务透明性，Kafka 基于 ZooKeeper 管理集群 Broker 与 Topic 分区信息，并介绍在 Java 与 Python 项目中整合 ZooKeeper 的方式。"
keywords: [Kafka, Dubbo, ZooKeeper]
category: "Java"
tags: [Java, ZooKeeper]
---

# ZooKeeper 在 Kafka 和 Dubbo 中的工业级实现案例分析

## 概念说明

除了自行实现分布式 ID 生成器、负载均衡等解决方案外，参考主流开源框架对 ZooKeeper 的使用方式是提高 ZooKeeper 应用能力的有效途径。业界最为流行的两个代表性框架是 RPC 框架 Dubbo 和分布式发布订阅消息系统 Kafka。

- **Dubbo**：利用 ZooKeeper 实现注册中心，保证 RPC 过程中服务对外的透明性。
- **Kafka**：利用 ZooKeeper 存储集群架构数据模型，统计 Broker 运行情况并管理 Topic 分区信息。

## 核心要点

- Dubbo 是一款高性能、轻量级的开源 Java RPC 框架，提供三大核心能力：面向接口的远程方法调用、智能容错和负载均衡、服务自动注册和发现。
- Dubbo 的注册中心通过 ZooKeeper 实现：提供者在 `/dubbo/com.foo.BarService/providers` 下写入自己的 URL（创建数据节点），消费者订阅该目录并向 `/consumers` 写入自己的 URL，变更基于长连接推送。
- **跨机器或网络区间的通信是实现分布式系统的核心**，远程方法调用是 Dubbo 最核心的功能点。
- Kafka 是高吞吐量的分布式发布订阅消息系统，核心概念包括 Broker、Topic、Partition、Producer、Consumer、Consumer Group。
- Kafka 将系统架构存储为 ZooKeeper 上的数据模型：Broker 启动时在 `/brokers/ids` 下注册，Topic 与 Broker 的分区对应关系存储在 `/brokers/topics/[topic]` 节点上。
- 应用层整合 ZooKeeper 的通用模式：Java 生态引入 zookeeper / curator-framework / curator-recipes 包，Python 生态安装 kazoo 包；都是先引入客户端包，再调用客户端函数完成业务处理。

## Dubbo 与 ZooKeeper

### Dubbo 实现过程

Dubbo 是阿里巴巴开发的一套开源技术框架，**是一款高性能、轻量级的开源 Java RPC 框架**。它提供了三大核心能力：

- 面向接口的远程方法调用
- 智能容错和负载均衡
- 服务自动注册和发现

其中，远程方法调用是 Dubbo 最为核心的功能点。分布式系统是由分布在不同网络区间或节点上的计算机或服务，通过彼此之间的信息传递进行协调工作的系统，因此**跨机器或网络区间的通信是实现分布式系统的核心**。Dubbo 框架使得调用不同机器或网络服务上的线程方法可以像调用本地方法一样完成。

下图展示了整个 Dubbo 服务的连通过程。整个服务的调用过程主要分为**服务的消费端**和**服务的提供方**：首先，服务的提供方向 Registry 注册中心注册所能提供的服务信息；接着，服务的消费端向 Registry 注册中心订阅该服务，注册中心再将服务提供者地址列表返回给消费者；如果有变更，注册中心将基于长连接将变更数据推送给消费者，从而通过服务的注册机制实现远程过程调用。

![](/zookeeper-images/24-ZooKeeper_在_Kafka_和_Dubbo_中的工业级实现案例分析__Ciqc1F8ah0qASFC-AAELMLv7sPQ672.png)

### ZooKeeper 注册中心

在整个 Dubbo 框架的实现过程中，**注册中心是其中最为关键的一点，它保证了整个 RPC 过程中服务对外的透明性**。Dubbo 的注册中心通过 ZooKeeper 实现。

如下图所示，在整个 Dubbo 服务的启动过程中：

- 服务提供者在启动时向 /dubbo/com.foo.BarService/providers 目录写入自己的 URL 地址，这个操作可以看作是一个 ZooKeeper 客户端在 ZooKeeper 服务器的数据模型上创建一个数据节点。
- 服务消费者在启动时订阅 /dubbo/com.foo.BarService/providers 目录下的提供者 URL 地址，并向 /dubbo/com.foo.BarService/consumers 目录写入自己的 URL 地址。该操作是通过 ZooKeeper 服务器在 /consumers 节点路径下创建一个子数据节点，然后再在请求会话中发起对 /providers 节点的 watch 监控。

![](/zookeeper-images/24-ZooKeeper_在_Kafka_和_Dubbo_中的工业级实现案例分析__Ciqc1F8ah1WAW9KEAAIW9hNPw3Y360.png)

## Kafka 与 ZooKeeper

Kafka 是一种高吞吐量的分布式发布订阅消息系统，它可以处理消费者在网站中的所有动作流数据，经常用来解决大量数据日志的实时收集以及 Web 网站上用户 PV 数统计和访问记录等问题。可以把 Kafka 看作是一条数据的高速公路：利用这条公路，数据可以低延迟、高效地从一个地点到达另一个地点。

![](/zookeeper-images/24-ZooKeeper_在_Kafka_和_Dubbo_中的工业级实现案例分析__CgqCHl8ah16Ac117AAKJOqYuJ28381.png)

### Kafka 核心概念

如下图所示，Kafka 的系统架构主要由 Broker、Topic、Partition、Producer、Consumer、Consumer Group 这几个核心概念组成：

![](/zookeeper-images/24-ZooKeeper_在_Kafka_和_Dubbo_中的工业级实现案例分析__Ciqc1F8ah26APMkMAAH5xDJ2qz0508.png)

- **Broker**：Kafka 也是分布式的系统架构，整个系统中存在多台机器，每台机器定义为一个 Broker。
- **Topic**：Kafka 的主要功能是发送和接收消息。Kafka 内部将接收到的无论何种类型的消息统一定义为 Topic（主题），可以将 Topic 看作消息的逻辑容器。
- **Partition**：Partition 即分区，与 Topic 概念相似，也是存放消息的容器。区别在于 Partition 是物理上的分区，而 Topic 表示消息的逻辑分区。
- **Producer**：Producer 是消息的生产者。Kafka 系统遵循生产者和消费者模式，消息从生产者流通到接收者。
- **Consumer 和 Consumer Group**：Consumer 即消费者，是 Kafka 框架内部对接收方的定义。Consumer Group 会将消费者分组，然后按照不同的种类进行管理。

### 服务运行流程

在整个 Kafka 服务的运行过程中，信息首先通过 Producer 生产者提交给 Kafka 服务器上的 Topics 消息容器；在消息容器内部，根据分区规则（如按消息 key 取模或轮询）选择对应的分区进行存储，而每个分区会分布在一台或多台 Broker 服务器上（一主多副本）；之后 Consumer 再从 Broker 服务器上拉取信息进行消费。

### ZooKeeper 的作用

在 Kafka 中 ZooKeeper 几乎存在于每个方面。如下图所示，Kafka 会将系统流程架构存储为一个 ZooKeeper 上的数据模型。

![](/zookeeper-images/24-ZooKeeper_在_Kafka_和_Dubbo_中的工业级实现案例分析__CgqCHl8ah3iASZ2-AAEGN0oprwQ428.png)

- **Broker 运行监控**：Broker 服务器采用分布式集群的方式工作，服务运行过程中难免出现某台机器因异常而关闭的状况。为了保证整个 Kafka 集群的可用性，需要在系统中监控各机器的运行情况。Kafka 通过 ZooKeeper 中的数据节点，将网络中机器的运行统计存储在数据模型中的 brokers 节点下。
- **Topic 与分区信息注册**：Kafka 中同一个 Topic 消息容器可以分成多个不同片（分区），这些分区既可以存在于一台 Broker 服务器中，也可以存在于不同的 Broker 服务器中。为了能够读取这些以分布式方式存储的分区信息，Kafka 会将分区信息与 Broker 服务器的对应关系存储在 ZooKeeper 数据模型的 topic 节点上，每一个 topic 在 ZooKeeper 数据节点上都会以 `/brokers/topics/[topic]` 的形式存在。
- **Broker 注册**：Broker 服务器启动时，会首先在 `/brokers/ids` 节点下创建以自己的 Broker_id 命名的节点进行注册。之后在系统运行过程中，通过统计 /brokers/topics 下的节点信息，就能知道对应的 Broker 分区情况。

## 整合 ZooKeeper 到应用系统

### 在 Java 中使用 ZooKeeper

以 Spring Boot 框架为例，在工程中使用 ZooKeeper 首先要在工程的 pom 文件中引入对应的包。在 dependency 引用配置中添加版本为 3.6.1 的 org.apache.zookeeper 开发包后，工程即可使用 ZooKeeper 的相关功能。

```xml
<dependency>
  <groupId>org.apache.zookeeper</groupId>
  <artifactId>zookeeper</artifactId>
  <version>3.6.1</version>
</dependency>

```

项目开发 ZooKeeper 服务时，往往需要编写大量 ZooKeeper 客户端代码去请求 ZooKeeper 服务端完成业务处理，而 ZooKeeper 自带的客户端使用起来不是很便利。Curator 框架被誉为 ZooKeeper 客户端中的瑞士军刀，利用该框架可以大大提高开发 ZooKeeper 服务的效率，在项目开发中推荐使用。

在项目中使用 Curator 同样通过 pom 文件添加 dependency 完成：首先添加 4.0.0 版本的 org.apache.curator 包（包含 Curator 的基础功能）；之后添加 curator-recipes 包，其中包括重入锁、读写锁、Leader 选举设置等高级操作功能。把这两个包引用到工程后，整个 Spring Boot 工程就可以利用 ZooKeeper 进行开发了。

```xml
 <dependency>
   <groupId>org.apache.curator</groupId>
   <artifactId>curator-framework</artifactId>
   <version>4.0.0</version>
 </dependency>
 <dependency>
    <groupId>org.apache.curator</groupId>
    <artifactId>curator-recipes</artifactId>
    <version>4.0.0</version>
 </dependency>

```

### 在 Python 中使用 ZooKeeper

Python 在数据科学、微服务、服务端开发中都有广泛的应用。在 Python 项目中使用 ZooKeeper 服务，首先要在 Python 的运行环境中安装 kazoo 包。

```bash
pip install kazoo

```

### 连接 ZooKeeper 服务器

安装完 kazoo 包后，即可在 Python 项目中使用 ZooKeeper 服务。如下面的代码所示，在代码中引入 KazooClient 包，它的作用与 Java 中的 Curator 类似，主要提供 ZooKeeper 客户端的操作功能。之后调用 KazooClient 函数并传入服务器地址来创建服务器连接会话，再调用 create 函数来创建数据节点。

```python
from kazoo.client import KazooClient
zk = KazooClient(hosts='127.0.0.1:2181')
zk.start()
zk.create("/pyzk/study/node", b"a value")

```

无论是 Spring Boot 框架下使用 Java 语言开发项目，还是使用 Python 语言进行开发，使用 ZooKeeper 服务的方式基本一样：先引入相关的 ZooKeeper 包，之后调用相关的客户端函数完成业务相关的创建工作。

## 实践要点

- 生产环境中还可以使用 ZooKeeper 解决更多问题，这些问题本质上都是围绕分布式环境下一致性、可用性和分区容错性（CAP）这三个分布式环境问题产生的。
- Kafka 侧的节点写入规范：Broker 注册走 `/brokers/ids`，Topic 分区映射走 `/brokers/topics/[topic]`，排查 Kafka 集群问题时可直接检查这些节点的状态。
- Dubbo 侧的运维要点：提供者 URL 在 `/providers` 下、消费者 URL 在 `/consumers` 下，消费者对 `/providers` 建立 watch，因此提供者上下线会实时推送到消费者。

## 总结

Kafka 作为一个开源的分布式消息服务，利用 ZooKeeper 实现对集群 Broker 服务器运行情况的统计以及 Topic 分区信息的管理；Dubbo 则利用 ZooKeeper 实现注册机制，以保证服务的透明性。

在实际的生产中 ZooKeeper 还能解决很多其他问题，而这些问题本质上都是围绕分布式环境下一致性、可用性和分区容错性这三个分布式环境问题产生的。

## 版本差异(ZooKeeper 3.6 → 3.8/3.9)

| 特性 | 旧版（本文编写时，3.6.x） | 当前（3.8.x/3.9.x） |
|------|---------------------------|---------------------|
| 稳定版本 | 3.6.x | 3.8.x（LTS）/ 3.9.x |
| Java 支持 | JDK 8 | JDK 8/11/17（3.8+） |
| 客户端 | 原生客户端 | 推荐 Curator 5.x（容器节点、持久递归监听） |
| 监控 | JConsole + 四字母命令 | 3.6+ 实验性 Prometheus 指标端点，3.8+ 完善 |
| 核心机制 | ZAB/Watch/ACL/数据模型 | 原理不变，本文内容依然适用 |

> ZooKeeper 的核心协议（ZAB、Watch、ACL、数据模型）自 3.4 以来保持稳定，本文原理性讲解在 3.8/3.9 中依然适用；部署与监控建议按 3.8/3.9 官方文档更新。
