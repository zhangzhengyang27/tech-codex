---
title: "服务治理：Nacos 如何实现微服务服务治理"
description: "Nacos 注册中心的特性与快速部署（JDK 环境、单机启动、防火墙端口），微服务接入 Nacos 的完整步骤，以及 Nacos 心跳机制与健康检查原理。"
keywords: [服务治理, Nacos 如何实现微服务服务治理]
category: "Java"
tags: [Java, SpringCloudAlibaba实战]
---
# 服务治理：Nacos 如何实现微服务服务治理

前文我们学习了通用的微服务架构应包含哪些组件以及 Spring Cloud Alibaba 生态中对应的技术实现，其中整个架构体系最核心的组件是服务注册中心 Alibaba Nacos。本文我们就对 Nacos 展开探讨，学习它的使用办法。在本文我们会讲解三方面内容：

1. 介绍 Nacos 注册中心的特性；

2. 微服务如何在 Nacos 进行注册登记；

3. Nacos 注册中心的心跳机制与健康检查。

## Nacos 注册中心的特性

我们以现实业务为例，某超市会员线上购物送等额积分，此积分在下次购物时可抵用现金，其中涉及订单服务、会员服务、积分服务等多个微服务模块。

在以往单实例情况下，服务间通常采用点对点通信，即采用 IP+端口+接口的形式直接调用。但考虑避免单点负载压力过大以及高可用的性能要求，通常会部署多实例节点保障系统的性能，但增加多实例后，调用方该如何选择哪个服务提供者进行处理呢？还有当服务提供者出现故障后，如何将后续请求转移到其他可用实例上呢？面对这些问题，微服务架构必须要引入注册中心对所有服务实例统一注册管理、有组织地进行健康检查来保障服务的可用性。


在 Spring Cloud Alibaba 生态中，由 Nacos 中间件承担注册中心职责，需要独立部署。下面我们先来认识一下 Nacos。

Nacos 官方地址为[https://nacos.io/zh-cn/index.html](https://nacos.io/zh-cn/index.html)。由阿里开源，官方定义为：

一个更易于构建云原生应用的动态服务发现、配置管理和服务管理平台。


Nacos 具备以下职能：

- 服务发现及管理；

- 动态配置服务；

- 动态 DNS 服务。

下图是Nacos 的核心特征：


因为官网有完整的功能介绍，这里不再赘述。

## Nacos 的快速部署

在微服务架构中，Nacos 注册中心处于核心地位，通常我们会采用高性能服务器独立部署。下面我来演示 Nacos 的部署过程。

#### 环境准备

Nacos 同时支持 Windows 与 Linux 系统。因大多数服务器会选择安装 Linux 操作系统，为了模拟真实环境，建议你搭建一个 CentOS 7/8 的虚拟机，我这里的服务器地址为：192.168.31.102。Nacos 采用 Java 进行开发，要求 JDK8+，如果 CentOS 系统中没有安装 JDK，可使用下面流程进行基础环境准备。

- **利用 yum 命令安装 OpenJDK 8。**

```shell
yum -y install java-1.8.0-openjdk-devel.x86_64
#安装成功后验证Java版本
java -version
```


- **配置 JAVA_HOME 环境变量。**

安装后 JDK 不要忘记设置 JAVA_HOME 环境变量，OpenJDK 默认安装在 /usr/lib/jvm/ 路径下，之后通过编辑 profile 设置 JAVA_HOME 环境变量。

```shell
[root@server-1 ~]# vim /etc/profile
export JAVA_HOME=/usr/lib/jvm/java-1.8.0-openjdk-1.8.0.272.b10-1.el7_9.x86_64
export JRE_HOME=$JAVA_HOME/jre
export CLASSPATH=$JAVA_HOME/lib:$JRE_HOME/lib:$CLASSPATH
export PATH=$JAVA_HOME/bin:$JRE_HOME/bin:$PATH
[root@server-1 ~]# source /etc/profile
```

最后要确认 JAVA_HOME 环境变量是否配置正确。

```shell
[root@server-1 ~]# echo $JAVA_HOME
/usr/lib/jvm/java-1.8.0-openjdk-1.8.0.272.b10-1.el7_9.x86_64
```

JDK安装后，正式进入 Nacos 的安装过程。

#### 安装过程

第一步，访问 Nacos GitHub：[https://github.com/alibaba/nacos/releases/](https://github.com/alibaba/nacos/releases/)获取 Nacos 最新版安装包 nacos-server-1.4.0.tar.gz。

第二步，上传 nacos-server-1.4.0.tar.gz 到 CentOS 系统，对安装包解压缩。

```shell
[root@server-1 local]#  tar -xvf nacos-server-1.4.0.tar.gz
```

解压后 Nacos 目录结构如下。

- bin：保存启用/关闭 Nacos Server 脚本；

- conf：Nacos Server 配置目录；

- data：Nacos 数据目录；

- logs：存放日志目录；

- target：Nacos Jar 包存放目录；

第三步，以单点方式启动 Nacos。

```shell
[root@server-1 local]# cd nacos/bin
[root@server-1 bin]# sh startup.sh -m standalone
```

启动日志如下：

```shell
nacos is starting with standalone
nacos is starting, you can check the /usr/local/nacos/nacos/logs/start.out
```

默认 Nacos 以后台模式启动，利用 tail 命令查看启动日志。可以看到 Nacos 默认端口为 8848，下面日志说明 Nacos 单机模式已启动成功。

```shell
[root@server-1 bin]# tail -f /usr/local/nacos/logs/start.out
2020-12-06 21:03:18,759 INFO Tomcat started on port(s): 8848 (http) with context path '/nacos'
2020-12-06 21:03:18,766 INFO Nacos Log files: /usr/local/nacos/nacos/logs
2020-12-06 21:03:18,766 INFO Nacos Log files: /usr/loca/nacos/nacos/conf
2020-12-06 21:03:18,766 INFO Nacos Log files: /usr/local/nacos/nacos/data
2020-12-06 21:03:18,767 INFO Nacos started successfully in stand alone mode. use embedded storage
```

第四步，默认 CentOS 系统并没有对外开放 7848/8848 端口，需要设置防火墙对 7848/8848 端口放行。

其中，8848 端口是 Nacos 对客户端提供服务的端口，7848 是 Nacos 集群通信端口，用于Nacos 集群间进行选举，检测等。

```shell
[root@server-1 bin]# firewall-cmd --zone=public --add-port=8848/tcp --permanent
success
[root@server-1 bin]# firewall-cmd --zone=public --add-port=7848/tcp --permanent
success
[root@server-1 bin]# firewall-cmd  --reload
success
```

此时，Nacos 已单机部署完毕。

第五步，进入 Nacos 管理界面，打开浏览器，地址栏输入：

[http://192.168.31.102:8848/nacos](http://192.168.31.102:8848/nacos)

其中 192.168.31.102 就是 Nacos 服务器的IP地址，端口号 8848。


管理界面默认用户名与密码均为**nacos**，提交后进入首页。点击左侧菜单“服务管理->服务列表”，这个功能用于查看已注册微服务列表。


目前因为没有任何微服务注册，右侧服务列表是空的。那如何让微服务在 Nacos 中注册呢？下一小节咱们继续讲解。

## 微服务如何接入 Nacos

Spring Cloud Alibaba 作为 Spring Cloud 子项目，开发框架仍基于 SpringBoot，只是在构建项目时需要选择不同的 starter 接入注册中心，下面我们通过实操完成微服务与 Nacos 服务器的接入工作。

开发工具强烈推荐 IDEA Ultimate，Ultimate 内置 SpringBoot 工程向导，可以非常方便地实现 Spring Cloud 微服务的快速创建。


#### 1. 创建新工程，工程类型选择 Spring Initializr。

工程向导右侧选中 Custom，将默认的 https://start.spring.io 改写为阿里云地址 [http://start.aliyun.com](http://start.aliyun.com)。因为 spring 官方服务器受网络原因影响经常无法访问，所以采用国内阿里云镜像生成工程初始代码。


Project Metadata 面板，设置 Maven Group 与 Artifact，一般 Artifact 即为微服务名称，约定俗成以 service 单词结尾。


#### 2. 在向导后面的依赖页面，要接入 Nacos 有一项是必选的，请大家注意。

Spring Cloud Alibaba -> Nacos Service Discovery。

- Nacos Service Discovery 是在当前SpringBoot工程内置 Nacos 客户端，在微服务应用启动时通过 Nacos 客户端向 Nacos 服务器发送注册信息。


#### 3. 工程创建成功，打开 pom.xml 文件，确认 Maven 依赖 nacos-discovery，说明服务已内置 Nacos 客户端成功。


此外，我们需要在当前微服务增加 Spring-Web 依赖。因为微服务默认通过 RESTful API 对外暴露接口，增加 Spring-Web 会在应用中内嵌 Tomcat，使微服务具备 HTTP 响应能力。

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

#### 4. 在 application.properties 配置 Nacos 注册中心通信地址。

```java
# 服务治理：Nacos 如何实现微服务服务治理
spring.application.name=sample-service
# 配置 Nacos 服务器的IP地址
spring.cloud.nacos.discovery.server-addr=192.168.31.102:8848
#连接 Nacos 服务器使用的用户名、密码，默认为 nacos
spring.cloud.nacos.discovery.username=nacos
spring.cloud.nacos.discovery.password=nacos
#微服务提供Web服务的端口号
server.port=9000
```

#### 5. 启动 SampleService 工程，在启动日志最后三句清晰的说明注册已成功。

```shell
#Web 服务端口号 9000
INFO 14188 o.s.b.w.embedded.tomcat.TomcatWebServer  : Tomcat started on port(s): 9000 (http) with context path ''
#微服务向 Nacos 注册成功，微服务 ID:sample-service
INFO 14188  c.a.c.n.registry.NacosServiceRegistry    : nacos registry, DEFAULT_GROUP sample-service 192.168.47.1:9000 register finished
#微服务启动成功
INFO 14188  c.l.s.SampleServiceApplication           : Started SampleServiceApplication in 4.911 seconds (JVM running for 6.039)
```

#### 6. 浏览器打开[http://192.168.31.102:8848/nacos](http://192.168.31.102:8848/nacos)，查看服务列表时发现 sample-service 服务已出现。


点击列表右侧“详情按钮”就会出现详细信息，在服务详情下清晰列出 sample-service 服务目前可用实例的 IP 及服务端口。


到这里我们已完成了微服务向 Nacos 注册登记，因为 SpringBoot 为我们高度封装了注册过程。为了你更透彻理解 Nacos，下面我来介绍 Nacos 注册过程背后的原理。

## Nacos 注册中心的心跳机制

讲到这里，你可能会有疑问：无论是部署 Nacos 服务器还是构建 Sample-Service 微服务，只用了几行代码便实现在 Nacos 注册登记。这一切背后，到底是如何实现的？这一小节我将为你答疑解惑。

在微服务启动后每过5秒，会由微服务内置的 Nacos 客户端主动向 Nacos 服务器发起心跳包（HeartBeat）。心跳包会包含当前服务实例的名称、IP、端口、集群名、权重等信息。


如果你开启微服务 Debug 日志，会清晰地看到每 5 秒一个心跳请求被发送到 Nacos 的 /nacos/v1/ns/instance/beat 接口，该请求会被 Nacos 服务器内置的 naming 模块处理。

```log
23:11:23.826 DEBUG 10720 --- [ing.beat.sender] s.n.www.protocol.http.HttpURLConnection  : sun.net.www.MessageHeader@665891d213 pairs: {PUT /nacos/v1/ns/instance/beat?app=unknown&serviceName=DEFAULT_GROUP%40%40sample-service&namespaceId=public&port=9000&clusterName=DEFAULT&ip=192.168.47.1 HTTP/1.1: null}{Content-Type: application/x-www-form-urlencoded}{Accept-Charset: UTF-8}{Accept-Encoding: gzip,deflate,sdch}{Content-Encoding: gzip}{Client-Version: 1.3.2}{User-Agent: Nacos-Java-Client:v1.3.2}{RequestId: 6447aa06-9d70-41ea-83ef-cd27af1d3422}{Request-Module: Naming}{Host: 192.168.31.102:8848}{Accept: text/html, image/gif, image/jpeg, *; q=.2, */*; q=.2}{Connection: keep-alive}{Content-Length: 326}
23:11:28.837 DEBUG 10720 --- [ing.beat.sender] s.n.www.protocol.http.HttpURLConnection  : sun.net.www.MessageHeader@5f00479a12 pairs: {PUT /nacos/v1/ns/instance/beat?app=unknown&serviceName=DEFAULT_GROUP%40%40sample-service&namespaceId=public&port=9000&clusterName=DEFAULT&ip=192.168.47.1 HTTP/1.1: null}{Content-Type: application/x-www-form-urlencoded}{Accept-Charset: UTF-8}{Accept-Encoding: gzip,deflate,sdch}{Content-Encoding: gzip}{Client-Version: 1.3.2}{User-Agent: Nacos-Java-Client:v1.3.2}{RequestId: 9fdf2264-9704-437f-bd34-7c9ee5e0be41}{Request-Module: Naming}{Host: 192.168.31.102:8848}{Accept: text/html, image/gif, image/jpeg, *; q=.2, */*; q=.2}{Connection: keep-alive}
23:11:38.847 DEBUG 10720 --- [ing.beat.sender] s.n.www.protocol.http.HttpURLConnection  : sun.net.www.MessageHeader@3521283812 pairs: {PUT /nacos/v1/ns/instance/beat?app=unknown&serviceName=DEFAULT_GROUP%40%40sample-service&namespaceId=public&port=9000&clusterName=DEFAULT&ip=192.168.47.1 HTTP/1.1: null}{Content-Type: application/x-www-form-urlencoded}{Accept-Charset: UTF-8}{Accept-Encoding: gzip,deflate,sdch}{Content-Encoding: gzip}{Client-Version: 1.3.2}{User-Agent: Nacos-Java-Client:v1.3.2}{RequestId: ccb6a586-897f-4036-9c0d-c614e2ff370a}{Request-Module: Naming}{Host: 192.168.31.102:8848}{Accept: text/html, image/gif, image/jpeg, *; q=.2, */*; q=.2}{Connection: keep-alive}
```

naming 模块在接收到心跳包后，会按以下逻辑处理心跳包并返回响应：

1. naming 模块收到心跳包，首先根据 IP 与端口判断 Nacos 是否存在该服务实例？如果实例信息不存在，在 Nacos 中注册登记该实例。而注册的本质是将新实例对象存储在“实例 Map”集合中；

2. 如果实例信息已存在，记录本次心跳包发送时间；

3. 设置实例状态为“健康”；

4. 推送“微服务状态变更”消息；

5. naming 模块返回心跳包时间间隔。

到这里一次完整的心跳包处理已完成。


那 Nacos 又是如何将无效实例从可用实例中剔除呢？默认策略下，Nacos Server 会定期扫描“实例 Map”：超过 15 秒未收到心跳的实例会被标记为“非健康”，超过 30 秒仍未收到心跳的实例会被从“实例 Map”中删除（两个阈值均可配置）。

## 小结

本文我们讲解了 Nacos 单点部署，同时介绍了微服务如何接入 Nacos，最后通过讲解 Nacos 心跳包机制使你了解 Nacos 注册背后的故事。

这里给你留一道思考题：本文我们进行了Nacos 单点部署，这必然会成为整个微服务架构的可用性瓶颈，如果你是 Nacos 设计师，该如何解决这个问题呢？

## 版本差异（Spring Cloud Alibaba 旧版 → 2025.x）

| 组件 | 旧版（本文编写时） | 当前（Spring Cloud Alibaba 2025.x / Boot 3.5.x） |
|------|-------------------|--------------------------------------------------|
| 注册配置中心 | Nacos 1.x/2.0 | Nacos 2.x+（gRPC 通信、鉴权） |
| 限流熔断 | Sentinel 1.8 | Sentinel 1.8+（规则可持久化到 Nacos） |
| 分布式事务 | Seata 1.x | Seata 1.6+/2.x（AT 模式稳定） |
| RPC | Dubbo 2.x | Dubbo 3.x（应用级服务发现） |
| 版本对应 | Boot 2.x + JDK 8 | Boot 3.5.x + JDK 17+（2022.0.0.0+ 起） |

> 本文为 Spring Cloud Alibaba 旧版课程。升级到 Spring Cloud Alibaba 2025.x + Spring Boot 3.5.x 时，注意 Nacos 2.x 鉴权、Seata 2.x 配置与 Dubbo 3.x 应用级注册的迁移。
