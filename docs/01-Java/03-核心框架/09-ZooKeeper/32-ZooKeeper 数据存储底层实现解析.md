---
title: "ZooKeeper 数据存储底层实现解析"
description: "在之前的《crontab 与 PurgeTxnLog：线上系统日志清理的最佳时间和方式》中，我们介绍了线上日志的清理方式，并讲解了 ZooKeeper 服务在运行的过程中产生的数据日志等文件。本文继续学习 ZooKeeper 文件系统的布局方式，以及数据日志与快照文件的内部结构格式。"
keywords: [ZooKeeper, 数据存储底层实现解析]
category: "Java"
tags: [Java, ZooKeeper]
---

# ZooKeeper 数据存储底层实现解析

## 概念说明

《crontab 与 PurgeTxnLog：线上系统日志清理的最佳时间和方式》一篇已介绍线上日志的清理方式，并讲解了 ZooKeeper 服务在运行过程中产生的数据日志等文件。本篇继续深入 ZooKeeper 文件存储和管理的相关知识，分析 ZooKeeper 文件系统的布局方式和不同文件的内部结构格式。

无论是 ZooKeeper 服务运行时产生的数据日志，还是集群中进行数据同步时用到的数据快照，都可以被看作一种文件系统。文件系统的两个功能就是对文件的存储和对不同文件格式的解析。ZooKeeper 中的数据存储可以分为两种类型：数据日志文件和快照文件，下面分别介绍这两种文件的结构信息和底层实现。

## 数据日志

在 ZooKeeper 服务运行的过程中，数据日志是用来记录 ZooKeeper 服务运行状态的数据文件。通过这个文件不但能统计 ZooKeeper 服务的运行情况，还可以在 ZooKeeper 服务发生异常的情况下，根据日志文件记录的内容进行分析，定位问题产生的原因并找到解决异常错误的方法。

日志文件的位置由 ZooKeeper 的 zoo.cfg 配置文件中的 dataLogDir 属性字段指定，所指定的文件地址就是当前 ZooKeeper 服务的日志文件的存储地址。

在了解日志文件的存放位置和格式结构之后，下面深入 ZooKeeper 服务的底层实现，分析日志的搜集与存储机制。

### 搜集日志

ZooKeeper 通过第三方开源日志服务框架 SLF4J 搜集程序的运行信息。

SLF4J 是一个**采用门面设计模式（Facade）**的日志框架。如下图所示，门面模式也叫外观模式，采用这种设计模式的主要作用是：对外隐藏系统内部的复杂性，并向外部调用的客户端或程序提供统一的接口。门面模式通常以接口的方式实现，可以被程序中的方法引用。

![](/zookeeper-images/32-ZooKeeper_数据存储底层实现解析__Ciqc1F8_iESARR3eAAB5fX25Qrk279.png)

上图以绘制几何图形的小功能演示了门面模式的用法：首先定义一个 Shape 接口类，并分别创建 Circle、Square、Rectangle 三个类实现 Shape 接口；然后创建画笔类 ShapeMaker，在该类中定义 shape 形状字段以及 drawCircle 等绘画函数。

之后，本地项目中需要调用绘制功能时，直接调用 ShapeMaker 类并传入要绘制的图形信息即可实现图形绘制。它使用起来非常简单，调用方不必关心底层如何实现绘制操作，只要将需要绘制的图形信息传入接口函数中即可。

ZooKeeper 中使用 SLF4J 日志框架的方式同样简单：首先在类中通过工厂函数创建日志工具类 LOG，然后在需要搜集的操作流程处引入日志搜集函数 LOG.info 即可。

```java
protected static final Logger LOG = LoggerFactory.getLogger(Learner.class);
LOG.info("Revalidating client: 0x" + Long.toHexString(clientId));
LOG.warn("Couldn't find the leader with id = "
        + current.getId());

```

### 存储日志

搜集完的日志文件的样子如下。系统日志的存放位置在 zoo.cfg 文件中配置。假设日志路径为 dataDir=/var/lib/zookeeper，进入该文件夹可以看到如下图所示的样子，所有系统日志文件都放在该文件夹下。

![](/zookeeper-images/32-ZooKeeper_数据存储底层实现解析__CgqCHl8_iFWAQwfvAAAfvGjcfow495.png)

## 快照文件

除了记录系统操作日志的文件外，ZooKeeper 中另一种十分重要的文件数据是快照日志文件。快照文件主要用来存储 ZooKeeper 服务内存数据的全量快照（即由 Znode 组成的数据树状态），并通过数据快照文件实现集群之间服务器的数据同步功能。

### 快照创建

在 ZooKeeper 的底层实现中，快照文件的创建过程如下。ZooKeeper 源码中定义了一个 SnapShot 接口类，在该接口中描述了 ZooKeeper 服务的相关属性和方法。其中 serialize 函数用于将内存中的快照文件转存到本地磁盘时的序列化操作；deserialize 的作用正好与其相反，是把快照文件从本地磁盘加载到内存中时的反序列化操作。无论是序列化还是反序列化，整个快照所操作的数据对象是 ZooKeeper 数据模型，也就是由 Znode 组成的结构树。

```java
public interface SnapShot {
  long deserialize(DataTree dt, Map<Long, Integer> sessions)
    throws IOException;
    void serialize(DataTree dt, Map<Long, Integer> sessions,
               File name, boolean fsync)
    throws IOException;
    File findMostRecentSnapshot() throws IOException;
    void close() throws IOException;
}

```

### 快照存储

创建完 ZooKeeper 服务的数据快照文件后，就要对数据文件进行持久化的存储操作。在整个 ZooKeeper 中，随着服务所处阶段的变化，数据快照存放文件的位置也随之变化，存储位置的变化主要是内存和本地磁盘之间的转变。当 ZooKeeper 集群处理来自客户端的事务性会话请求时，事务会先记录到事务日志中，而内存数据的全量快照则会按照一定的策略（如基于 snapCount 的事务数量阈值）周期性地在内存中生成，并在序列化后持久化到本地磁盘中，如下图所示。

![](/zookeeper-images/32-ZooKeeper_数据存储底层实现解析__Ciqc1F8_iGKAU3N-AABQvy8biHk445.png)

存储到本地磁盘中的数据快照文件，是经过 ZooKeeper 序列化后的二进制格式文件，通常无法直接查看。如需查看，可以通过 ZooKeeper 自带的 SnapshotFormatter 类实现。SnapshotFormatter 类内部用来查看快照文件的几种函数分别是：printDetails 函数，用来打印日志中的数据节点和 Session 会话信息；printZnodeDetails 函数，用来查看日志文件中节点的详细信息，包括节点 id 编码、state 状态信息、version 节点版本信息等。

```java
public class SnapshotFormatter {
  private void printDetails(DataTree dataTree, Map<Long, Integer> sessions)
  private void printZnodeDetails(DataTree dataTree)
  private void printZnode(DataTree dataTree, String name)
  private void printSessionDetails(DataTree dataTree, Map<Long, Integer> sessions)
  private void printStat(StatPersisted stat)
  private void printHex(String prefix, long value)
}

```

虽然 ZooKeeper 提供了 SnapshotFormatter 类，但其实现的查询功能比较单一，可在此基础上按照自身业务需求编写自定义的快照文件查看器。

## 总结

ZooKeeper 服务相关的数据文件有两类：数据日志文件与数据快照文件，最终都存储在本地磁盘中。从文件的生成方式看，两者的区别是：数据日志文件实时性更高，产生的日志文件不断变化，只要 ZooKeeper 服务一直运行，就会产生新的操作日志数据；而数据快照并非实时产生，它是当集群中数据发生变化后，先在内存中生成数据快照文件，经过序列化后再存储到本地磁盘中。

数据日志文件如何监控并解决异常情况、数据快照文件如何实现数据同步等内容，可与前述章节结合阅读，以对 ZooKeeper 的文件系统形成更完整的理解。

## 版本差异(ZooKeeper 3.6 → 3.8/3.9)

| 特性 | 旧版（本文编写时，3.6.x） | 当前（3.8.x/3.9.x） |
|------|---------------------------|---------------------|
| 稳定版本 | 3.6.x | 3.8.x（LTS）/ 3.9.x |
| Java 支持 | JDK 8 | JDK 8/11/17（3.8+） |
| 客户端 | 原生客户端 | 推荐 Curator 5.x（容器节点、持久递归监听） |
| 监控 | JConsole + 四字母命令 | 3.6+ 实验性 Prometheus 指标端点，3.8+ 完善 |
| 核心机制 | ZAB/Watch/ACL/数据模型 | 原理不变，本文内容依然适用 |

> ZooKeeper 的核心协议（ZAB、Watch、ACL、数据模型）自 3.4 以来保持稳定，本篇原理性讲解在 3.8/3.9 中依然适用；部署与监控建议按 3.8/3.9 官方文档更新。
