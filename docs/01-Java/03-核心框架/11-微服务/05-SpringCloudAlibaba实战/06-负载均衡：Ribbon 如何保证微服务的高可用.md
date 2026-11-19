---
title: "负载均衡：Ribbon 如何保证微服务的高可用"
description: "负载均衡的服务端/客户端两种实现方式，Ribbon+RestTemplate 的代码模式与 @LoadBalanced 注解模式实现服务间高可用通信，以及 Ribbon 常用负载均衡策略与配置办法。"
keywords: [负载均衡, Ribbon, 如何保证微服务的高可用]
category: "Java"
tags: [Java, SpringCloudAlibaba实战]
---
# 负载均衡：Ribbon 如何保证微服务的高可用

> ⚠️ **组件状态说明**：Ribbon 已由 Netflix 官方宣布停止维护（Netflix 已将其转入归档状态，Spring Cloud 自 2020.0 版本起移除 Ribbon，以 Spring Cloud LoadBalancer 全面替代）。本文保留其原理讲解价值（负载均衡策略与客户端高可用通信的设计思想并未过时），生产选型请参考 [Spring Cloud LoadBalancer 官方文档](https://docs.spring.io/spring-cloud-commons/reference/spring-cloud-commons/loadbalancer.html)（文中组件对照见尾部版本差异表）。

单个微服务接入 Nacos 注册中心后，微服务之间如何实现稳定通信是本篇的核心内容，主要涵盖三方面知识：

1. Ribbon 负载均衡器；

2. Ribbon+RestTemplate 两种实现方式；

3. Ribbon 的负载均衡策略。

## Ribbon 负载均衡器

### 概念：负载均衡的两种实现方式

负载均衡是指通过软件或者硬件措施，将来自客户端的请求按照某种策略平均地分配到集群的每一个节点上，保证这些节点的 CPU、内存等设备负载情况大致在一条水平线，避免由于局部节点负载过高产生宕机，再将这些处理压力传递到其他节点上产生系统性崩溃。

负载均衡按实现方式分类可区分为：**服务端负载均衡**与**客户端负载均衡**。

服务端负载均衡在架构中会提供专用的负载均衡器，由负载均衡器持有后端节点的信息，服务消费者发来的请求经由专用的负载均衡器分发给服务提供者，进而实现负载均衡的作用。目前常用的负载均衡器软硬件有：F5、Nginx、HaProxy 等。

客户端负载均衡是指在架构中不再部署额外的负载均衡器，在每个服务消费者内部持有客户端负载均衡器，由内置的负载均衡策略决定向哪个服务提供者发起请求。Netflix Ribbon 是 Netflix 公司开源的一个客户端负载均衡组件，目前 Ribbon 已被 Spring Cloud 官方技术生态整合，运行时以 SDK 形式内嵌到每一个微服务实例中，为微服务间通信提供负载均衡与高可用支持。

Ribbon 的执行流程如下：

1. 订单服务（order-service）与商品服务（goods-service）实例在启动时向 Nacos 注册；

2. 订单服务向商品服务发起通信前，Ribbon 向 Nacos 查询商品服务的可用实例列表；

3. Ribbon 根据设置的负载策略从商品服务可用实例列表中选择实例；

4. 订单服务实例向商品服务实例发起请求，完成 RESTful 通信。

## Ribbon+RestTemplate 实现服务间高可用通信

RestTemplate 是 Spring 封装的 RESTful 通信对象，它封装了基于 HTTP 协议的操作，通过简单的 API 便可发起 HTTP 请求并自动处理响应。RestTemplate 天然与 Ribbon 兼容，两者配合可以极大简化服务间通信过程。Ribbon + RestTemplate 提供了两种开发模式：代码模式与注解模式。

### 代码模式

代码模式指通过纯 Java 代码实现微服务间通信。虽然在生产中代码模式很少使用，但它是理解 Ribbon+RestTemplate 最直观的途径。该模式的使用分为两个阶段。

**第一阶段**：创建服务提供者。服务提供者是请求的实际处理者，也是标准的 Spring Boot 工程，利用 Controller 对外暴露 RESTful API 供服务消费者调用。

第一步，利用 Spring Initializr 向导创建 provider-service 微服务。

其中 pom.xml 要确保引入 web 与 nacos-discovery 两个依赖。

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
```

第二步，在 application.yml 中调整微服务与 Nacos 的通信配置。

```yaml
spring:
  application:
    name: provider-service #应用/微服务名字
  cloud:
    nacos:
      discovery:
        server-addr: 192.168.31.102:8848 #nacos服务器地址
        username: nacos #用户名密码
        password: nacos
server:
  port: 80
```

第三步，创建 ProviderController，通过 Controller 控制器对外暴露接口。

```java
package com.lagou.providerservice.controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
@RestController
public class ProviderController {
    @GetMapping("/provider/msg")
    public String sendMessage(){
        return "This is the message from provider service!";
    }
}
```

服务提供者 provider-service 就是标准的 Spring Cloud 微服务：向 Nacos 进行注册的同时对外暴露 msg 接口并返回一段静态文本，没有任何与 Ribbon 相关的内容。Ribbon 与 RestTemplate 应出现在服务消费者，而非提供者一端。

为了演示，准备五台虚拟机：192.168.31.102 部署 Nacos，111~113 三台部署 provider-service 实例，120 部署 consumer-service。

在 provider-service 工程中利用 maven package 命令生成 provider-service-0.0.1-SNAPSHOT.jar。

分别上传至 111 至 113 节点后执行 Java 命令启动微服务实例。

```shell
java -jar provider-service-0.0.1-SNAPSHOT.jar
```

三个节点启动成功，在 Nacos 控制台应见到三个健康实例。

单独访问任意节点，都能看到相同的返回文本。

```text
http://192.168.31.111/provider/msg
http://192.168.31.112/provider/msg
http://192.168.31.113/provider/msg
```

**第二阶段**：开发服务消费者 consumer-service，即服务的使用方，在服务消费者内置 Ribbon+RestTemplate 实现服务间高可用通信。

第一步，利用 Spring Initializr 创建 consumer-service 微服务。

pom.xml 确保引入以下三个依赖。

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-ribbon</artifactId>
    <version>${spring-cloud-alibaba.version}</version>
</dependency>
```

这里需要重点说明：starter-netflix-ribbon 就是通过 Spring Boot Starter 向当前微服务工程集成 Ribbon，无须做其他额外配置。与此同时，用于 RESTful 通信的 RestTemplate 对象已被集成到 starter-web 模块，无须额外依赖。

第二步，配置 application.yml，与 provider-service 除微服务 id 外并无其他变化。

```yaml
spring:
  application:
    name: consumer-service #应用/微服务名字
  cloud:
    nacos:
      discovery:
        server-addr: 192.168.31.102:8848 #nacos服务器地址
        username: nacos #用户名密码
        password: nacos
server:
  port: 80
```

第三步，利用 Spring Java Config 方式声明 RestTemplate。在 ConsumerServiceApplication 类中新增以下声明代码。

```java
@SpringBootApplication
public class ConsumerServiceApplication {
    //Java Config声明RestTemplate对象
    //在应用启动时自动执行restTemplate()方法创建RestTemplate对象，其BeanId为restTemplate。
    @Bean
    public RestTemplate restTemplate(){
        return new RestTemplate();
    }
    public static void main(String[] args) {
        SpringApplication.run(ConsumerServiceApplication.class, args);
    }
}
```

第四步，创建 ConsumerController，通过 Ribbon+RestTemplate 实现负载均衡通信。

```java
package com.lagou.consumerservice.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import javax.annotation.Resource;

@RestController
public class ConsumerController {
    private Logger logger = LoggerFactory.getLogger(ConsumerController.class);
    //注入 Ribbon 负载均衡器对象
    //在引入 starter-netflix-ribbon 后在 SpringBoot 启动时会自动实例化 LoadBalancerClient 对象。
    //在 Controller 使用 @Resource 注解进行注入即可。
    @Resource
    private LoadBalancerClient loadBalancerClient;
    @Resource
    //将应用启动时创建的 RestTemplate 对象注入 ConsumerController
    private RestTemplate restTemplate;
    @GetMapping("/consumer/msg")
    public String getProviderMessage() {
        //loadBalancerClient.choose()方法会从 Nacos 获取 provider-service 所有可用实例，
        //并按负载均衡策略从中选择一个可用实例，封装为 ServiceInstance（服务实例）对象
        //结合现有环境既是从192.168.31.111:80、192.168.31.112:80、192.168.31.113:80三个实例中选择一个包装为ServiceInstance
        ServiceInstance serviceInstance = loadBalancerClient.choose("provider-service");
        //获取服务实例的 IP 地址
        String host = serviceInstance.getHost();
        //获取服务实例的端口
        int port = serviceInstance.getPort();
        //在日志中打印服务实例信息
        logger.info("本次调用由provider-service的" + host + ":" + port + " 实例节点负责处理" );
        //通过 RestTemplate 对象的 getForObject() 方法向指定 URL 发送请求，并接收响应。
        //getForObject()方法有两个参数：
        //1. 具体发送的 URL，结合当前环境发送地址为：http://192.168.31.111:80/provider/msg
        //2. String.class说明 URL 返回的是纯字符串，如果第二参数是实体类， RestTemplate 会自动进行反序列化，为实体属性赋值
        String result = restTemplate.getForObject("http://" + host + ":" + port + "/provider/msg", String.class);
        //输出响应内容
        logger.info("provider-service 响应数据:" + result);
        //向浏览器返回响应
        return "consumer-service 响应数据:" + result;
    }
}
```

第五步，利用 Maven Package 打包生成 Jar。

部署至 120 虚拟机，执行启动命令：

```shell
java -jar consumer-service-0.0.1-SNAPSHOT.jar
```

启动成功后，在 Nacos 中确认 consumer-service 已注册。在浏览器输入 [http://192.168.31.120/consumer/msg](http://192.168.31.120/consumer/msg)，多次刷新，日志会得到以下结果。

```log
本次调用由 provider-service 的 192.168.31.111:80 实例节点负责处理
consumer-service 获得数据:This is the message from provider service!
本次调用由 provider-service 的 192.168.31.112:80 实例节点负责处理
consumer-service 获得数据:This is the message from provider service!
本次调用由 provider-service 的 192.168.31.113:80 实例节点负责处理
consumer-service 获得数据:This is the message from provider service!
本次调用由 provider-service 的 192.168.31.111:80 实例节点负责处理
consumer-service 获得数据:This is the message from provider service!
本次调用由 provider-service 的 192.168.31.112:80 实例节点负责处理
consumer-service 获得数据:This is the message from provider service!
```

不难看出，因为 Nacos 中存在 3 个 provider-service 的可用实例，默认 Ribbon 以轮询方式按顺序逐次发送。如果遇到某个 provider-service 实例宕机，Nacos 心跳机制会检测到并将其剔除，同时通知所有 consumer-service 实例服务提供者节点状态发生变化，之后 consumer-service 便不会向宕机节点发出请求。

以上便是代码模式的处理过程，它清晰说明了 Ribbon 的执行过程：先从 Nacos 获取可用服务提供者实例信息，再通过 RestTemplate.getForObject() 向该实例发起 RESTful 请求完成处理。但代码模式使用复杂，需要自己获取可用实例 IP、端口信息，再拼接 URL 实现服务间通信；@LoadBalanced 注解可以自动化实现这一过程。

### 注解模式

注解模式同样分为两阶段。

**第一阶段**：创建服务提供者 provider-service，因服务提供者并不涉及 Ribbon，与代码模式第一阶段代码完全相同。

**第二阶段**：创建新的服务消费者 consumer-service。

第一步，利用 Spring Initializr 创建 consumer-service 微服务。

同样引用 3 个依赖。

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-ribbon</artifactId>
    <version>${spring-cloud-alibaba.version}</version>
</dependency>
```

第二步，配置 application.yml。在原有代码模式基础上，将 Debug 级别日志输出，这样便可看到负载均衡实例信息。

```yaml
spring:
  application:
    name: consumer-service #应用/微服务名字
  cloud:
    nacos:
      discovery:
        server-addr: localhost:8848 #nacos服务器地址
        username: nacos #用户名密码
        password: nacos
logging:
  level:
    root: debug
```

第三步，在 Spring 初始化 RestTemplate 实例时增加 @LoadBalanced 注解，使 RestTemplate 进行服务通信时自动与 Ribbon 整合，自动实现负载均衡。

```java
@SpringBootApplication
public class ConsumerServiceApplication {
    @Bean
    @LoadBalanced //使RestTemplate对象自动支持Ribbon负载均衡
    public RestTemplate restTemplate(){
        return new RestTemplate();
    }
    public static void main(String[] args) {
        SpringApplication.run(ConsumerServiceApplication.class, args);
    }
}
```

第四步，在 Controller 发起通信时，原有 RestTemplate.getForObject() 方法书写 URL 时，将 IP 端口部分替换为服务名。

```java
@RestController
public class ConsumerController {
    private Logger logger = LoggerFactory.getLogger(ConsumerController.class);
    @Resource
    private RestTemplate restTemplate;
    @GetMapping("/consumer/msg")
    public String getProviderMessage() {
        //关键点：将原有IP:端口替换为服务名，RestTemplate便会在通信前自动利用Ribbon查询可用provider-service实例列表
        //再根据负载均衡策略选择节点实例
        String result = restTemplate.getForObject("http://provider-service/provider/msg", String.class);
        logger.info("consumer-service获得数据:" + result);
        return   "consumer-service获得数据:" + result;
    }
}
```

在新的 getProviderMessage 代码中，不再出现 LoadBalancerClient 与 ServiceInstance 对象，这一切都被 @LoadBalanced 进行封装，在 RestTemplate 查询前自动处理。

第五步，重新部署 consumer-service，多次访问地址 [http://192.168.31.120/consumer/msg](http://192.168.31.120/consumer/msg)，控制台会看到 Debug 级别日志，通过实际 IP 地址也同样印证 Ribbon 默认采用轮询策略进行分配。

```log
s.n.www.protocol.http.HttpURLConnection : {GET /provider/msg ...}{Accept: ...}{User-Agent: ...}{Host: 192.168.31.111:80}
...
s.n.www.protocol.http.HttpURLConnection : {GET /provider/msg ...}{Accept: ...}{User-Agent: ...}{Host: 192.168.31.112:80}
...
s.n.www.protocol.http.HttpURLConnection : {GET /provider/msg ...}{Accept: ...}{User-Agent: ...}{Host: 192.168.31.113:80}
```

以上便是注解模式的使用办法，相比代码模式简单很多。无论注解模式还是代码模式，默认的负载均衡策略都是轮询，即按顺序依次访问；Ribbon 还支持其他负载均衡策略。

## 如何配置 Ribbon 负载均衡策略

Ribbon 内置多种负载均衡策略，常用的分为以下几种。

- **RoundRobinRule：**

轮询策略，Ribbon 默认策略。默认超过 10 次获取到的 server 都不可用，会返回一个空的 server。

- **RandomRule：**

随机策略，如果随机到的 server 为 null 或者不可用的话，会不停地循环选取。

- **RetryRule**：

重试策略，在一定时限内循环重试。默认继承 RoundRobinRule，也支持自定义注入。RetryRule 会在每次选取之后，对选举的 server 进行判断，是否为 null，是否 alive，并且在 500ms 内会不停地选取判断。而 RoundRobinRule 失效的策略是超过 10 次，RandomRule 没有失效时间的概念，只要 serverList 没都挂。

- **BestAvailableRule**：

最小连接数策略，遍历 serverList，选取出可用的且连接数最小的一个 server；若没有可用的 server，则调用 RoundRobinRule 重新选取。

- **AvailabilityFilteringRule**：

可用过滤策略。扩展了轮询策略，会先通过默认的轮询选取一个 server，再去判断该 server 是否超时可用、当前连接数是否超限，都成功再返回。

- **ZoneAvoidanceRule**：

区域权衡策略。扩展了轮询策略，除了过滤超时和链接数过多的 server，还会过滤掉不符合要求的 zone 区域里面的所有节点，始终保证在一个区域/机房内的服务实例进行轮询。

所有负载均衡策略名本质都是 com.netflix.loadbalancer 包下的类。

更改微服务通信时采用的负载均衡策略，在 application.yml 中采用下面格式书写即可。

```yaml
provider-service: #服务提供者的微服务id
  ribbon:
    NFLoadBalancerRuleClassName: com.netflix.loadbalancer.RandomRule #设置对应的负载均衡类
```

当采用随机策略，运行时得到如下日志，杂乱的顺序说明随机策略已生效。

```log
本次调用由 provider-service的192.168.31.112:80 实例节点负责处理
consumer-service 获得数据:This is the message from provider service!
本次调用由 provider-service 的 192.168.31.112:80 实例节点负责处理
consumer-service 获得数据:This is the message from provider service!
本次调用由 provider-service 的 192.168.31.113:80 实例节点负责处理
consumer-service 获得数据:This is the message from provider service!
本次调用由 provider-service 的 192.168.31.111:80 实例节点负责处理
consumer-service 获得数据:This is the message from provider service!
本次调用由 provider-service 的 192.168.31.113:80 实例节点负责处理
consumer-service 获得数据:This is the message from provider service!
```

::: tip 自定义策略
如果 Ribbon 自带的负载均衡策略不能满足实际项目的需要，可以通过实现 IRule 接口自定义负载均衡策略，并在 application.yml 中通过 NFLoadBalancerRuleClassName 指定自定义实现类。
:::

## 小结

本文介绍了三方面知识：首先介绍了负载均衡的两种实现方式与 Ribbon 负载均衡器的作用；之后讲解了 Ribbon 的两种开发模式（代码模式与 @LoadBalanced 注解模式）；最后讲解了 Ribbon 的负载均衡策略与配置办法。在项目中合理使用 Ribbon 负载均衡可以使系统性能有显著的提升。

## 版本差异（Spring Cloud Alibaba 旧版 → 2025.x）

| 组件 | 旧版（本文编写时） | 当前（Spring Cloud Alibaba 2025.x / Boot 3.5.x） |
|------|-------------------|--------------------------------------------------|
| 注册配置中心 | Nacos 1.x/2.0 | Nacos 2.x+（gRPC 通信、鉴权） |
| 限流熔断 | Sentinel 1.8 | Sentinel 1.8+（规则可持久化到 Nacos） |
| 分布式事务 | Seata 1.x | Seata 1.6+/2.x（AT 模式稳定） |
| RPC | Dubbo 2.x | Dubbo 3.x（应用级服务发现） |
| 负载均衡 | Ribbon（已停止维护） | Spring Cloud LoadBalancer |
| 链路追踪 | Sleuth + Zipkin（Sleuth 已停止维护） | Micrometer Tracing + Zipkin/OTel |
| 版本对应 | Boot 2.x + JDK 8 | Boot 3.5.x + JDK 17+（2022.0.0.0+ 起） |

> 本文为 Spring Cloud Alibaba 旧版课程。升级到 Spring Cloud Alibaba 2025.x + Spring Boot 3.5.x 时，注意 Nacos 2.x 鉴权、Seata 2.x 配置与 Dubbo 3.x 应用级注册的迁移。
