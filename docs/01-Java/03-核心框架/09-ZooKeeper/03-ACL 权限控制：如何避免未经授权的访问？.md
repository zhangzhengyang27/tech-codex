---
title: "ACL 权限控制：如何避免未经授权的访问？"
description: "ZooKeeper ACL 权限控制机制：权限模式（Scheme）、授权对象（ID）、权限信息（Permission）三要素的使用方式，以及基于 AuthenticationProvider 的自定义扩展与客户端、服务端的底层实现原理。"
keywords: [ACL, 权限控制, ZooKeeper]
category: "Java"
tags: [Java, ZooKeeper]
---

# ACL 权限控制：如何避免未经授权的访问？

分布式锁、配置管理等 ZooKeeper 常见应用的本质都在于操作数据节点。而如果作为分布式锁或配置项的数据节点被错误删除或修改，会对整个分布式系统产生很大影响，甚至造成严重的生产事故。作为在分布式领域应用最为广泛的一致性解决框架，ZooKeeper 提供的对应解决方案就是 ACL 权限控制。

ACL（权限控制）并非 ZooKeeper 特有的概念。以 Linux 系统为例，文件使用者被分为三种身份，即 User、Group、Others，使用者对文件拥有读（read）、写（write）以及执行（execute）3 种方式的控制权。这种权限控制方式相对比较粗糙，在复杂的授权场景下往往并不适用。

![](/zookeeper-images/03-ACL_权限控制_如何避免未经授权的访问___CgqCHl67twGANQ9kAABTpMHtYI0138.png)

上图给出了某个技术开发公司的一个工作项目 /object。项目中的每个开发人员都可以读取和修改该项目中的文件，作为开发组长也对这个项目文件具有读取和修改的权限，其他技术开发组的员工则不能访问这个项目。按照 Linux 的权限模型设计：技术组长使用 User 身份，具有读、写、执行权限；项目组其他成员使用 Group 身份，具有读写权限；其他项目组的人员则没有任何权限。

但是，如果技术组新加入一个实习人员，为了让他熟悉项目，必须具有该项目的读取权限，而目前他不具备修改项目的能力，所以并未赋予写入权限。此时将其分配给 User 用户或者 Group 用户都不合适；而如果修改 Others 用户的权限，其他项目组的成员也能访问该项目文件。显然普通的三种身份的权限划分无法满足要求，而 ZooKeeper 中的 ACL 就能应对这种复杂的权限应用场景。

## ACL 的使用

一个 ACL 权限设置通常可以分为 3 部分，分别是：权限模式（Scheme）、授权对象（ID）、权限信息（Permission），最终组成一条例如 "scheme:id:permission" 格式的 ACL 请求信息。

### 权限模式：Scheme

权限模式用来设置 ZooKeeper 服务器进行权限验证的方式。ZooKeeper 的权限验证方式大体分为两种类型：一种是范围验证，另外一种是口令验证。

范围验证指 ZooKeeper 可以针对一个 IP 或者一段 IP 地址授予某种权限。例如让 IP 地址为 "ip:192.168.0.11" 的机器对服务器上的某个数据节点具有写入的权限，或者通过 "ip:192.168.0.11/22" 给一段 IP 地址的机器赋权。

口令验证即用户名密码的方式。在 ZooKeeper 中这种验证方式是 Digest 认证。由于通过网络传输密码并不安全，"绝不通过明文在网络发送密码"是程序设计中很重要的原则之一，因此 Digest 认证首先由客户端传送 "username:password" 这种形式的权限表示符，之后 ZooKeeper 服务端会对密码部分使用 SHA-1 和 BASE64 算法进行加密，以保证安全性。另一种权限模式 Super 可以认为是一种特殊的 Digest 认证，具有 Super 权限的客户端可以对 ZooKeeper 上的任意数据节点进行任意操作。下面这段代码给出了 Digest 模式下客户端的调用方式。

```java
//创建节点
create /digest_node1
//设置digest权限验证
setAcl /digest_node1 digest:用户名:base64格式密码:rwadc
//查询节点Acl权限
getAcl /digest_node1
//授权操作
addauth digest user:passwd

```

最后一种授权模式是 world 模式，这种授权模式对应于系统中的所有用户，本质上起不到任何限制作用——设置了 world 权限模式后，系统中的所有用户操作都可以不进行权限验证。

### 授权对象（ID）

授权对象指权限被赋予的主体。对应于 4 种不同的权限模式：采用 IP 方式时，授权对象可以是一个 IP 地址或 IP 地址段；使用 Digest 或 Super 方式时，授权对象对应于一个用户名；如果是 World 模式，则授权对象为系统中所有的用户。

### 权限信息（Permission）

权限指可以在数据节点上执行的操作种类，ZooKeeper 中已经定义好的权限有 5 种：

- 数据节点（create）创建权限，授予权限的对象可以在数据节点下创建子节点；

- 数据节点（write）更新权限，授予权限的对象可以更新该数据节点；

- 数据节点（read）读取权限，授予权限的对象可以读取该节点的内容以及子节点的信息；

- 数据节点（delete）删除权限，授予权限的对象可以删除该数据节点的子节点；

- 数据节点（admin）管理者权限，授予权限的对象可以对该数据节点进行 ACL 权限设置。

![](/zookeeper-images/03-ACL_权限控制_如何避免未经授权的访问___CgqCHl67tw2AbgggAACW3WWz4D4066.png)

需要注意的一点是，**每个节点都维护自身的 ACL 权限数据，即使是该节点的子节点也拥有自己的 ACL 权限，而不是直接继承其父节点的权限**。下图中 "172.168.11.1" 服务器有 "/Config" 节点的读取权限，但是没有其子节点 "/Config/dataBase_Config1" 的权限。

![](/zookeeper-images/03-ACL_权限控制_如何避免未经授权的访问___CgqCHl67txWALBicAABysKoJmFg484.png)

### 实现自定义权限控制

ZooKeeper 自身的权限控制机制已经足够细致，同时还提供了一种权限扩展机制，允许开发者实现自定义的权限控制方式。官方文档中对这种机制的定义是 "Pluggable ZooKeeper Authentication"，即可插拔的授权机制。

实现自定义权限控制机制的核心是实现 ZooKeeper 提供的权限控制器接口 AuthenticationProvider。下面这张图片展示了接口的内部结构，用户通过该接口实现自定义的权限控制。

![](/zookeeper-images/03-ACL_权限控制_如何避免未经授权的访问___CgqCHl67tyGAJKDxAABxRTWnmZs166.png)

实现自定义权限后，还需要将自定义的权限控制注册到 ZooKeeper 服务器中才能生效。注册的方式通常有两种。

第一种是通过设置系统属性来注册自定义的权限控制器：

```java
-Dzookeeper.authProvider.x=CustomAuthenticationProvider

```

另一种是在配置文件 zoo.cfg 中进行配置：

```java
authProvider.x=CustomAuthenticationProvider

```

## ACL 内部实现原理

### 客户端处理过程

以节点授权 addAuth 接口为例：客户端通过 ClientCnxn 类中的 addAuthInfo 方法向服务端发送 ACL 权限信息变更请求。该方法首先将 scheme 和 auth 封装成 AuthPacket 类，并通过 RequestHeader 方法表示该请求是权限操作请求，最后将这些数据统一封装到 packet 中，并添加到 outgoingQueue 队列中发送给服务端。

```java
public void addAuthInfo(String scheme, byte auth[]) {
    if (!state.isAlive()) {
        return;
    }
    authInfo.add(new AuthData(scheme, auth));
    queuePacket(new RequestHeader(-4, OpCode.auth), null,
            new AuthPacket(0, scheme, auth), null, null, null, null,
            null, null);
}

```

ACL 权限控制机制的客户端实现相对简单，只是封装请求类型为权限请求，方便服务器识别处理，而发送到服务器的信息包括前面提到的权限校验信息。

### 服务端实现过程

相比于客户端的处理过程，服务器端对 ACL 的内部实现比较复杂。当节点授权请求发送到服务端后，服务器的处理首先调用 readRequest() 方法作为处理入口，其内部只是调用 processPacket 方法。

```java
private void readRequest() throws IOException {

zkServer.processPacket(this, incomingBuffer);
}

```

而在 processPacket 方法的内部，首先反序列化客户端的请求信息并封装到 AuthPacket 对象中，之后通过 getServerProvider 方法根据不同的 scheme 判断具体的实现类。以 Digest 模式为例，该实现类是 DigestAuthenticationProvider，之后调用其 handleAuthentication() 方法进行权限验证。如果返回 KeeperException.Code.OK 则表示该请求已经通过了权限验证；如果返回的状态是其他或者抛出异常，则表示权限验证失败。

```java
public void processPacket(ServerCnxn cnxn, ByteBuffer incomingBuffer) throws IOException {
       ...
 ServerAuthenticationProvider         ap=ProviderRegistry.getServerProvider(scheme);
if(ap != null) {
authReturn = ap.handleAuthentication(new                          ServerAuthenticationProvider.ServerObjs(this, cnxn), authPacket.getAuth());
}
       ...
    }

```

权限认证的最终实现函数是 handleAuthentication，其内部逻辑是解析客户端传递的权限验证类型，并通过 addAuthInfo 函数将权限信息添加到 authInfo 集合属性中。

```java
public KeeperException.Code
        handleAuthentication(ServerCnxn cnxn, byte[] authData)
    {
        String id = new String(authData);
        try {
            String digest = generateDigest(id);
            if (digest.equals(superDigest)) {
                cnxn.addAuthInfo(new Id("super", ""));
            }
            cnxn.addAuthInfo(new Id(getScheme(), digest));
            return KeeperException.Code.OK;
       	...

}

```

其中 addAuthInfo 函数的作用是将解析到的权限信息存储到 ZooKeeper 服务器的内存中。该信息在整个会话存活期间一直保存在服务器上，如果会话关闭，该信息则会被删除——这个特性与数据节点中的临时节点类似。

经过上述步骤，服务器已经将客户端 ACL 请求解析并将对应的会话权限信息存储在服务器上。后续的权限验证过程是：在处理一次权限请求时，先通过 PrepRequestProcessor 中的 checkAcl 函数检查对应的请求权限。如果该节点没有任何权限设置则直接返回；如果该节点有权限设置则循环遍历节点信息进行检查，具有相应的权限则直接返回表明权限认证成功，否则最后抛出 NoAuthException 异常中断操作，表明权限认证失败。

```java
static void checkAcl(...){
  ...
  for (ACL a : acl) {
    if(authId.getScheme().equals(id.getScheme()..){
      return;
    }
  }
  throw new KeeperException.NoAuthException();

}

```

::: tip 客户端与服务端流程小结
客户端在 ACL 权限请求发送过程的步骤比较简单：首先封装该请求的类型，之后将权限信息封装到 request 中并发送给服务端。服务器的实现比较复杂：首先分析请求类型是否是权限相关操作，之后根据不同的权限模式（scheme）调用不同的实现类验证权限，最后存储权限信息。本文的例子采用了授权接口 addAuth 而没有采用权限设置接口 setAcl，因为权限设置接口相对简单，其核心功能点已经包括在授权接口实现中。
:::

::: warning 会话级授权信息
授权接口中的会话授权信息存储在 ZooKeeper 服务端的内存中，如果客户端会话关闭，授权信息会被删除。下次连接服务器后，需要重新调用授权接口进行授权。
:::

## 小结

ZooKeeper 作为分布式系统协调框架，在分布式锁、配置管理等应用场景中往往起到关键的作用。如果因为错误操作对重要数据节点进行变更或删除，对整个分布式系统影响很大，甚至会导致整个分布式服务不可用。因此设计使用 ZooKeeper 时，应对关键节点添加 ACL 权限控制。

实践中的一个常见问题：如果一个客户端对服务器上的一个节点设置了只有它自己才能操作的权限，那么等这个客户端下线或被删除后，对其创建的节点要想进行修改，可以通过 "super 模式"（超级管理员）删除该节点或变更该节点的权限验证方式。正因为 "super 模式" 拥有极大的权限，平时使用时应当更加谨慎。

## 版本差异(ZooKeeper 3.6 → 3.8/3.9)

| 特性 | 旧版（本文编写时，3.6.x） | 当前（3.8.x/3.9.x） |
|------|---------------------------|---------------------|
| 稳定版本 | 3.6.x | 3.8.x（LTS）/ 3.9.x |
| Java 支持 | JDK 8 | JDK 8/11/17（3.8+） |
| 客户端 | 原生客户端 | 推荐 Curator 5.x（容器节点、持久递归监听） |
| 监控 | JConsole + 四字母命令 | 3.6+ 实验性 Prometheus 指标端点，3.8+ 完善 |
| 核心机制 | ZAB/Watch/ACL/数据模型 | 原理不变，本文内容依然适用 |

> ZooKeeper 的核心协议（ZAB、Watch、ACL、数据模型）自 3.4 以来保持稳定，本文原理性讲解在 3.8/3.9 中依然适用；部署与监控建议按 3.8/3.9 官方文档更新。
