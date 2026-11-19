---
title: "Curator：如何降低 ZooKeeper 使用的复杂性？"
description: "Curator 是 Java 语言的 ZooKeeper 客户端框架。本文介绍 Curator 的工程引入方式、流式 API 对会话与节点的操作、ConnectionStateListener 异常处理，以及 LeaderSelector 与 LeaderLatch 两种 Leader 选举工具。"
keywords: [Curator, ZooKeeper, 客户端框架]
category: "Java"
tags: [Java, ZooKeeper]
---

# Curator：如何降低 ZooKeeper 使用的复杂性？

## 概念说明

Curator 是一套开源的、Java 语言编程的 ZooKeeper 客户端框架。它把常用的 ZooKeeper 服务开发功能做了封装，例如 Leader 选举、分布式计数器、分布式锁，减少了使用 ZooKeeper 时的大部分底层细节开发工作。

在会话重新连接、Watch 反复注册、多种异常处理等使用场景中，用原生的 ZooKeeper API 实现起来比较复杂；而 Curator 对这些功能都做了高度封装，使用起来更加简单，不但减少了开发时间，而且增强了程序的可靠性。

## 核心要点

- Curator 分为两个核心包：`curator-framework` 封装 ZooKeeper 底层 API，`curator-recipes` 封装高级特性（Cache 事件监听、选举、分布式锁、分布式 Barrier）。
- Curator 的 API 采用 "Fluent Style" 流式编码风格，调用按逻辑先后顺序链式书写，代码连贯、逻辑清晰。
- 创建会话的核心类是 `CuratorFramework`，通过 `CuratorFrameworkFactory` 工厂构建，需指定 connectionString、retryPolicy、sessionTimeoutMs、connectionTimeoutMs 等参数。
- `sessionTimeoutMs` 作用在服务端（会话在服务端的失效时间），`connectionTimeoutMs` 作用在客户端（发起会话连接到收到应答的时间），两者容易混淆。
- 会话状态由 `ConnectionStateListener` 监控，共有 CONNECTED、READONLY、SUSPENDED、RECONNECTED、LOST 等状态；SUSPENDED（挂起）不等于关闭会话，不会触发删除临时节点等操作。
- Curator 的 recipes 包提供两种 Leader 选举工具：`LeaderSelector`（抢占式，选举出 Leader 服务器执行回调）与 `LeaderLatch`（所有机器轮流作为 Leader 参与集群工作）。

## 工程准备

在工程中使用 Curator 框架，首先要引入相关的开发包。以 Maven 工程为例，将 Curator 相关的引用包配置到 Maven 工程的 pom 文件中。配置文件中引用了两个 Curator 相关的包：第一个是 curator-framework 包，对 ZooKeeper 底层 API 做了封装；另一个是 curator-recipes 包，封装了 ZooKeeper 服务的高级特性，如 Cache 事件监听、选举、分布式锁、分布式 Barrier。

```xml
<dependency>
 <groupId>org.apache.curator</groupId>
 <artifactId>curator-framework</artifactId>
 <version>2.12.0</version>
</dependency>
<dependency>
 <groupId>org.apache.curator</groupId>
 <artifactId>curator-recipes</artifactId>
 <version>2.12.0</version>
</dependency>

```

## 基础方法

部署好工程的开发环境后，就可以利用 Curator 开发 ZooKeeper 服务。Curator 的编码采用 "Fluent Style" 流式风格，这种风格在 Scala 等编程语言中也被广泛采用。与传统的编码方式相比——传统代码风格会把功能拆分成不同的函数并分行书写——流式编程的功能函数按照逻辑的先后顺序采用链式调用，代码书写更加连贯，逻辑衔接更清晰。

下面这段代码的作用是创建一个 "/my/path" 路径的节点到 ZooKeeper 服务端，之后将 myData 变量的数据作为该节点的数据。

```java
client.create().forPath("/my/path", myData)

```

### 会话创建

客户端与服务端要相互通信完成特定功能，首先要创建一个会话连接。利用 Curator 创建会话连接的代码如下：

```java
RetryPolicy retryPolicy = new ExponentialBackoffRetry(1000, 3);
CuratorFramework client = CuratorFrameworkFactory.builder()
                .connectString("192.168.128.129:2181")
                .sessionTimeoutMs(5000)  // 会话超时时间
                .connectionTimeoutMs(5000) // 连接超时时间
                .retryPolicy(retryPolicy)
                .namespace("base") // 包含隔离名称
                .build();
client.start();

```

这段代码采用流式编码风格，最核心的类是 CuratorFramework 类，该类的作用是定义一个 ZooKeeper 客户端对象，并在之后的上下文中使用。定义 CuratorFramework 对象实例时使用了 CuratorFrameworkFactory 工厂方法，并指定了 connectionString 服务器地址列表、retryPolicy 重试策略、sessionTimeoutMs 会话超时时间、connectionTimeoutMs 会话创建超时时间。各参数说明如下：

- **connectionString**：服务器地址列表，格式是 host1:port1,host2:port2。可以是一个地址，也可以是多个地址；多个地址之间用逗号分隔。
- **retryPolicy**：重试策略。当客户端异常退出或与服务端失去连接时，通过设置客户端重新连接 ZooKeeper 服务端。Curator 提供了一次重试、多次重试等不同种类的实现方式。Curator 内部通过判断服务器返回的 KeeperException 的状态代码来决定是否进行重试处理：返回 OK 表示一切操作都没有问题，SYSTEMERROR 表示系统或服务端错误。
- **超时时间**：Curator 客户端创建过程中有两个超时时间的设置，也是容易混淆的地方。一个是 sessionTimeoutMs 会话超时时间，用来设置该条会话在 ZooKeeper 服务端的失效时间；另一个是 connectionTimeoutMs 客户端创建会话的超时时间，用来限制客户端发起一个会话连接到接收 ZooKeeper 服务端应答的时间。**sessionTimeoutMs 作用在服务端，而 connectionTimeoutMs 作用在客户端**，日常开发中需要注意区分。

### 创建节点

描述一个节点需要包括节点类型（临时节点还是持久节点）、节点的数据信息、节点是否是有序节点等属性和性质。创建节点的方式如下：

```java
client.create().withMode(CreateMode.EPHEMERAL).forPath("path","init".getBytes());

```

在 Curator 中，使用 `create` 函数创建数据节点，通过 `withMode` 函数指定节点是临时节点还是持久节点，之后调用 `forPath` 函数指定节点的路径和数据信息。

### 更新节点

通过客户端实例的 `setData()` 方法更新 ZooKeeper 服务上的数据节点，在 setData 方法后面通过 `forPath` 函数指定更新的数据节点路径以及要更新的数据。

```java
client.setData().forPath("path","data".getBytes());

```

### 删除节点

删除 ZooKeeper 服务器上的节点可以使用 Curator 中的 `client.delete()`。如下代码所示，流式调用中包含几个功能函数：

```java
client.delete().guaranteed().deletingChildrenIfNeeded().withVersion(10086).forPath("path");

```

- **guaranteed**：起到保障删除成功的作用，其底层工作方式是**只要该客户端的会话有效，就会在后台持续发起删除请求，直到该数据节点在 ZooKeeper 服务端被删除**。
- **deletingChildrenIfNeeded**：指定该函数后，系统在删除该数据节点时会以递归的方式直接删除其子节点以及子节点的子节点。
- **withVersion**：指定要删除的数据节点版本。
- **forPath**：指定要删除的数据节点的路径。

## 高级应用

curator-recipes 包即 "Curator 菜谱"，提供了很多丰富的功能，许多高级特性都在这个包中实现。

### 异常处理

ZooKeeper 客户端与服务端通过网络通信的方式协同工作，由于网络不稳定和不可靠等原因，网络中断或高延迟等异常情况出现得较为频繁，因此处理好异常是决定 ZooKeeper 服务质量的关键。

在 Curator 中，客户端与服务端建立会话连接后会一直监控该连接的运行情况。底层实现中通过 ConnectionStateListener 来监控会话的连接状态，当连接状态改变时，根据参数设置 ZooKeeper 服务会采取不同的处理方式。一个会话基本有六种状态，如下图所示：

![](/zookeeper-images/13-Curator_如何降低_ZooKeeper_使用的复杂性___Ciqc1F7pw-CAZMcMAABbJUFbJOY244.png)

各状态的含义：

- **CONNECTED（已连接状态）**：客户端发起的会话成功连接到服务端后，该条会话的状态变为 CONNECTED 已连接状态。
- **READONLY（只读状态）**：当一个客户端会话调用 CuratorFrameworkFactory.Builder.canBeReadOnly() 时，该会话会一直处于只读模式，直到重新设置该条会话的状态类型。
- **SUSPENDED（会话连接挂起状态）**：客户端与服务端的连接暂时中断但会话还未过期时，会话进入挂起状态，进行 Leader 选举和 lock 锁等操作时会受到挂起状态的影响。**注意：会话挂起并不等于关闭会话，也不会触发诸如删除临时节点等操作。**
- **RECONNECTED（重新连接状态）**：已经与服务端成功连接的客户端断开后，在会话超时之前重新连接上服务端，该条会话的状态为 RECONNECTED，即重新连接。此时会话依然是原来的那条会话，之前创建的临时节点等信息依然保留；如果是在会话超时之后才重新连接，服务端则会将其视为一次全新的会话。
- **LOST（会话丢失状态）**：客户端与服务器端因为异常或超时导致会话关闭时，该条会话的状态变为 LOST。

以 Curator 捕捉到的"会话关闭后重新发起与服务器端的连接"为例，处理方式如下：要处理一个会话关闭的异常，必须捕获这条异常事件。如下代码所示，创建一个 sessionConnectionListener 类用来监听事件的异常关闭操作。该类实现了 ConnectionStateListener 接口——这是 Curator 的内部接口，负责监控会话的状态变化；当会话状态发生改变时，系统会调用 stateChanged 函数，会话状态的处理逻辑就编写在 stateChanged 函数中。下例中设置的处理是：会话改变时客户端一直尝试连接服务端直到连接成功。

```java
class sessionConnectionListener implements ConnectionStateListener {
  public void stateChanged(CuratorFramework curatorFramework, ConnectionState connectionState){
  while(true){
  ...
    reConnectZKServer(..);
  }
  }
}

```

使用 Curator 处理会话异常非常简单：只要实现 ConnectionStateListener 接口，并在对应的状态变更函数中实现自己的处理逻辑即可。

### Leader 选举

在分布式环境中，ZooKeeper 集群起到了关键作用。Leader 选举是保证 ZooKeeper 集群可用性的解决方案，可以避免集群使用中出现单点失效等问题。ZooKeeper 服务开始运行时，首先会选举出 Leader 节点服务器；在服务运行过程中，Leader 节点服务器失效时会重新在集群中进行 Leader 节点的选举操作。

![](/zookeeper-images/13-Curator_如何降低_ZooKeeper_使用的复杂性___Ciqc1F7pxGCAPkfEAAAxSw3ff2o475.png)

使用 ZooKeeper 原生 API 开发 Leader 选举相关的功能相对复杂。Curator 框架中的 recipe 包提供了高效、方便易用的工具函数，分别是 LeaderSelector 和 LeaderLatch。

**LeaderSelector** 的功能是选举 ZooKeeper 中的 Leader 服务器，通过构造函数的方式实例化。在下面的构造方法中，第一个参数为会话的客户端实例 CuratorFramework，第二个参数是 LeaderSelectorListener 对象，它是在被选举成 Leader 服务器的事件触发时执行的回调函数。

```java
public LeaderSelector(CuratorFramework client, String mutexPath, LeaderSelectorListener listener)

```

**LeaderLatch** 也是实现 Leader 选举功能的工具。与 LeaderSelector 不同的是，LeaderLatch 将 ZooKeeper 服务中的所有机器都作为 Leader 候选机器，在服务运行期间，集群中的机器轮流作为 Leader 机器参与集群工作：

```java
public LeaderLatch(CuratorFramework client, String latchPath)

```

LeaderLatch 同样通过构造函数的方式创建实例对象，并传入会话客户端对象 CuratorFramework。构造函数的第二个参数 latchPath 是一个字符串类型字段。服务启动后，调用了 LeaderLatch 的客户端会和其他使用相同 latch path 的服务器交涉，然后选择其中一个作为 Leader 服务器。

## 实践要点

- 两个超时参数必须区分：`sessionTimeoutMs` 控制会话在服务端的失效时间，`connectionTimeoutMs` 控制客户端建连应答时间，配置颠倒会导致难以排查的连接问题。
- `RetryPolicy` 的选择直接影响异常恢复行为，常用 `ExponentialBackoffRetry(baseSleepTimeMs, maxRetries)` 实现指数退避重试。
- SUSPENDED 状态下 Leader 选举和 lock 锁等操作会受影响，业务侧应通过 ConnectionStateListener 感知状态变化并做相应处理。
- `guaranteed()` 删除适合对删除最终一致性有要求的场景：只要会话有效，后台会持续重试直到节点被删除。
- LeaderSelector 适合"抢占式"任务场景（同一时刻一个 Leader 执行回调），LeaderLatch 适合"轮流执政"场景。

## 小结

Curator 框架通过封装 ZooKeeper 底层 API 降低了使用复杂性：工程层面通过 curator-framework 与 curator-recipes 两个包引入；基础操作（会话创建、节点增删改）通过流式 API 完成；异常处理通过实现 ConnectionStateListener 接口完成；Leader 选举通过 LeaderSelector 与 LeaderLatch 两个工具类完成。

除上述功能外，Curator 还可以实现分布式锁、分布式计数器、分布式队列等功能，可在此基础上进一步学习相关技术知识。

## 版本差异(ZooKeeper 3.6 → 3.8/3.9)

| 特性 | 旧版（本文编写时，3.6.x） | 当前（3.8.x/3.9.x） |
|------|---------------------------|---------------------|
| 稳定版本 | 3.6.x | 3.8.x（LTS）/ 3.9.x |
| Java 支持 | JDK 8 | JDK 8/11/17（3.8+） |
| 客户端 | 原生客户端 | 推荐 Curator 5.x（容器节点、持久递归监听） |
| 监控 | JConsole + 四字母命令 | 3.6+ 实验性 Prometheus 指标端点，3.8+ 完善 |
| 核心机制 | ZAB/Watch/ACL/数据模型 | 原理不变，本文内容依然适用 |

> ZooKeeper 的核心协议（ZAB、Watch、ACL、数据模型）自 3.4 以来保持稳定，本文原理性讲解在 3.8/3.9 中依然适用；部署与监控建议按 3.8/3.9 官方文档更新。
