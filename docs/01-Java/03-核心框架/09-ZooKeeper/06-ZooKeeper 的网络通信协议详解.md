---
title: "ZooKeeper 的网络通信协议详解"
description: "ZooKeeper 网络通信协议：请求协议（RequestHeader 与 ConnectRequest/GetDataRequest/SetDataRequest）与响应协议（ReplyHeader 与 ConnectResponse/GetDataResponse/SetDataResponse）的底层实现。"
keywords: [ZooKeeper, 网络通信协议, 请求协议, 响应协议]
category: "Java"
tags: [Java, ZooKeeper]
---

# ZooKeeper 的网络通信协议详解

## 概念说明

在 ZooKeeper 中，无论是客户端和服务器之间的通信，还是集群之间服务器的内部协同工作，都是基于网络进行通信的，网络通信协议是影响 ZooKeeper 性能和稳定性的核心点。

最为熟悉的网络通信协议是 TCP/IP 协议，ZooKeeper 则是在 TCP/IP 协议的基础上实现了自己特有的通信协议格式：一次客户端的请求协议由请求头、请求体组成；一次服务端的响应协议由响应头和响应体组成。

## ZooKeeper 协议的底层实现

### 请求协议

请求协议是客户端向服务端发送的协议。会话创建、数据节点查询等常用操作，都是客户端通过网络向 ZooKeeper 服务端发送请求协议完成的。

#### 客户端请求头底层解析

请求头在 ZooKeeper 中通过 RequestHeader 类实现。RequestHeader 类实现了 Record 接口，用于之后在网络传输中进行序列化操作。

RequestHeader 类中只有两个属性字段，分别是 xid 和 type：xid 代表客户端序号，用于记录客户端请求的发起顺序；type 代表请求操作的类型。

```java
class RequestHeader implements Record{
  private int xid;
  private int type;
}

```

#### 客户端请求体底层解析

协议的请求体包括了协议处理逻辑的全部内容，一次会话请求的所有操作内容都涵盖在请求体中。在 ZooKeeper 的内部实现中，根据不同的请求操作类型，会采用不同的结构封装请求体。下面以最常用的创建会话、数据节点查询和数据节点更新三种操作为例，深入分析 ZooKeeper 的内部实现。

**会话创建**

ZooKeeper 客户端发起会话时，会向服务端发送一个会话创建请求，该请求的作用是通知 ZooKeeper 服务端处理一个来自客户端的访问链接。

服务端处理会话创建请求所需要的所有信息都包括在请求体内。在 ZooKeeper 中该请求体通过 ConnectRequest 类实现，其内部一共包括五种属性字段：protocolVersion 表示该请求协议的版本信息、lastZxidSeen 表示最后一次接收到的服务器的 zxid 序号、timeOut 表示会话的超时时间、sessionId 为会话标识符、password 为会话密码。有了这些信息，ZooKeeper 服务端在接收一个请求时，就可以根据请求体的信息进行相关的操作。

```java
public class ConnectRequest implements Record {
  private int protocolVersion;
  private long lastZxidSeen;
  private int timeOut;
  private long sessionId;
  private byte[] passwd;
 }

```

**节点查询**

通过客户端 API 查询 ZooKeeper 服务器上的数据节点时，客户端会向服务端发送 GetDataRequest 会话请求。与会话请求不同，ZooKeeper 在处理获取数据节点会话请求时，选择了另一种结构作为该协议的请求体，具体实现类是 GetDataRequest。GetDataRequest 类实现了 Record 接口用于序列化操作，具有两个属性：字符串类型 path 表示要请求的数据节点路径，布尔类型 watch 表示该节点是否注册了 Watch 监控。

```java
public class GetDataRequest implements Record {
  private String path;
  private boolean watch;
}

```

**节点更新**

最后一种会话操作类型是节点的更新操作。客户端向服务端发送一个数据节点更新操作时，在网络上实际发送的是更新操作的请求协议。ZooKeeper 通过 SetDataRequest 类封装该协议内部的请求体。SetDataRequest 内部包含三种属性：path 表示节点的路径、data 表示节点数据信息、version 表示节点期望的版本号（用于锁的验证）。

```java
public class SetDataRequest implements Record {
  private String path;
  private byte[] data;
  private int version;
 }

```

以上即 ZooKeeper 客户端在一次网络会话请求中所发送的请求协议的内部结构和底层实现。这些都是客户端向服务器端的请求协议，下面继续分析 ZooKeeper 服务端向客户端发送的响应协议。

### 响应协议

响应协议可以理解为服务端在处理客户端的请求后，返回相关信息给客户端。服务端所采用的响应协议类型要根据客户端的请求协议类型来选择。

#### 服务端响应头解析

服务端接收到客户端的请求后，执行相关操作并将结果通知给客户端。ZooKeeper 服务端向客户端发送的响应协议同样包括响应头和响应体。与客户端的请求头不同的是，ZooKeeper 服务端的响应头多了一个错误状态字段，具体的实现类是 ReplyHeader。

```java
public class ReplyHeader implements Record {
  private int xid;
  private long zxid;
  private int err;
  }

```

#### 服务端响应体解析

服务端的响应体可以理解为对客户端所请求内容的封装，一个服务端的响应体包含了客户端所要查询的数据。对于不同的请求类型，ZooKeeper 的服务端采用了不同的结构进行处理。与会话创建、数据节点查询和修改三种请求操作对应，服务端的响应实现如下。

**响应会话创建**

对于客户端发起的一次会话连接操作，ZooKeeper 服务端在处理后，会返回给客户端一个 Response 响应。底层代码中 ZooKeeper 通过 ConnectResponse 类实现，该类有四个属性：protocolVersion 为请求协议的版本信息、timeOut 为会话超时时间、sessionId 为会话标识符、passwd 为会话密码。

```java
public class ConnectResponse implements Record {
  private int protocolVersion;
  private int timeOut;
  private long sessionId;
  private byte[] passwd;
  }

```

**响应节点查询**

客户端发起查询节点数据的请求时，服务端根据客户端发送的节点路径，并在验证客户端具有相应的权限后，将节点数据返回给客户端。ZooKeeper 服务端通过 GetDataResponse 类封装查询到的节点相关信息到响应协议的请求体中。GetDataResponse 内部有两种属性字段：data 属性表示节点数据的内容，stat 属性表示节点的状态信息。

```java
public class GetDataResponse implements Record {
  private byte[] data;
  private org.apache.zookeeper.data.Stat stat;
  }

```

**响应节点更新**

客户端发送一个节点变更操作后，ZooKeeper 服务端在处理完相关逻辑后会发送一个响应给客户端。更新完节点后 ZooKeeper 会将操作结果返回给客户端，节点更新操作的响应协议请求体通过 SetDataResponse 类实现。该类内部只有一个属性 stat 字段，表示该节点数据更新后的最新状态信息。

```java
public class SetDataResponse implements Record {
  private org.apache.zookeeper.data.Stat stat;
  }

```

## 实践要点

- ZooKeeper 的网络通信协议通过不同的类具体实现：请求头/响应头实现 Record 接口完成序列化，请求体/响应体按操作类型对应不同的 Request/Response 类。
- 会话超时时间在服务器端实现，会话超时后服务器端会主动关闭会话，因此会话请求的请求体中包括设置会话超时的属性字段（timeOut）。
- 实践中常见问题：客户端将超时时间设置为某个值，而实际执行时会话超时的时间可能远小于设置值。原因是 ZooKeeper 处理会话超时时间时不只是简单地使用客户端传来的超时时间，还会根据 minSessionTimeout 和 maxSessionTimeout 这两个参数来调整时间的设置，日常设置中需多加注意。
- 响应头中的 err 字段承载错误状态，客户端依据 xid 匹配请求、依据 err 判断操作结果。

## 小结

- ZooKeeper 在 TCP/IP 之上自定义协议格式：请求 = 请求头（xid/type）+ 请求体；响应 = 响应头（xid/zxid/err）+ 响应体。
- 三组典型配对：ConnectRequest ↔ ConnectResponse（会话创建）、GetDataRequest ↔ GetDataResponse（节点查询）、SetDataRequest ↔ SetDataResponse（节点更新），全部实现 Record 接口以支持序列化。
- 客户端会话的完整处理链路（创建、管理、超时）叠加本篇的网络协议视角后即构成 ZooKeeper 会话请求的全过程。

## 版本差异(ZooKeeper 3.6 → 3.8/3.9)

| 特性 | 旧版（本文编写时，3.6.x） | 当前（3.8.x/3.9.x） |
|------|---------------------------|---------------------|
| 稳定版本 | 3.6.x | 3.8.x（LTS）/ 3.9.x |
| Java 支持 | JDK 8 | JDK 8/11/17（3.8+） |
| 客户端 | 原生客户端 | 推荐 Curator 5.x（容器节点、持久递归监听） |
| 监控 | JConsole + 四字母命令 | 3.6+ 实验性 Prometheus 指标端点，3.8+ 完善 |
| 核心机制 | ZAB/Watch/ACL/数据模型 | 原理不变，本篇内容依然适用 |

> ZooKeeper 的核心协议（ZAB、Watch、ACL、数据模型）自 3.4 以来保持稳定，上述原理性内容在 3.8/3.9 中依然适用；部署与监控建议按 3.8/3.9 官方文档更新。
