---
title: "链路跟踪：基于 Sleuth+Zipkin 实施链路跟踪体系"
description: "微服务链路追踪的原理（TraceId/SpanId/导出标识），Spring Cloud Sleuth 通过日志扩展生成链路数据的用法，以及 Zipkin 服务端部署、客户端接入与可视化排障。"
keywords: [链路跟踪, 基于, Sleuth+Zipkin, 实施链路跟踪体系]
category: "Java"
tags: [Java, SpringCloudAlibaba实战]
---
# 链路跟踪：基于 Sleuth+Zipkin 实施链路跟踪体系

## 概念说明

在微服务架构下，系统的功能是由大量的微服务协调组成的。例如：电商创建订单业务就需要订单服务、库存服务、支付服务、短信通知服务逐级调用才能完成，而每个服务可能是由不同的团队进行开发，部署在成百上千台服务器上。

面对如此复杂的消息传递过程，当系统发生故障时，需要一种机制对故障点进行快速定位，确认是哪个服务出了问题——链路追踪技术由此而生。所谓链路追踪，就是运行时通过某种方式记录下服务之间的调用过程，再通过可视化的 UI 界面帮助研发运维人员快速定位到出错点。引入链路追踪是微服务架构运维的底层基础，没有它，运维人员无法了解服务间的通信过程。

在 Spring Cloud 标准生态下内置了 Sleuth 组件，它通过扩展 Logging 日志的方式实现微服务的链路追踪。标准的微服务日志格式如下：

```log
2021-01-12 17:00:33.441 INFO [nio-7000-exec-2] c.netflix.config.ChainedDynamicProperty  : Flipping property: b-service.ribbon.ActiveConnectionsLimit to use NEXT property: niws.loadbalancer.availabilityFilteringRule.activeConnectionsLimit = 2147483647
```

引入 Spring Cloud Sleuth 链路追踪组件后，日志会变成下面的格式：

```log
2021-01-12 17:00:33.441  INFO [a-service,5f70945e0eefa832,5f70945e0eefa832,true] 18404 --- [nio-7000-exec-2] c.netflix.config.ChainedDynamicProperty  : Flipping property: b-service.ribbon.ActiveConnectionsLimit to use NEXT property: niws.loadbalancer.availabilityFilteringRule.activeConnectionsLimit = 2147483647
```

对比后会发现，原有日志中额外附加了下面的文本：

```text
[a-service,5f70945e0eefa832,5f70945e0eefa832,true]
```

这段文本就是 Sleuth 在微服务日志中附加的链路调用数据，它的格式是固定的，包含以下四部分：

```text
[微服务 Id,TraceId,SpanId,isExport]
```

- **微服务 Id**：说明日志是由哪个微服务产生的。
- **TraceId**：轨迹编号。一次完整的业务处理过程被称为轨迹，例如：实现登录功能需要从服务 A 调用服务 B，服务 B 再调用服务 C，那这一次登录处理的过程就是一个轨迹。从前端应用发来请求到接收到响应，每一次完整的业务功能处理过程都对应唯一的 TraceId。
- **SpanId**：步骤编号。实现登录功能需要从服务 A 到服务 C，涉及 3 个微服务处理，按处理前后顺序，每一个微服务处理时日志都被赋予不同的 SpanId。一个 TraceId 拥有多个 SpanId，而 SpanId 只能隶属于某一个 TraceId。
- **导出标识**：当前这个日志是否被导出。该值为 true 时说明当前轨迹数据允许被其他链路追踪可视化服务收集展现。

一个完整的追踪数据实例：模拟**服务 A -> 服务 B -> 服务 C** 的调用链路，三个服务分别产生的日志如下。

```log
#服务 A 应用控制台日志
2021-01-12 22:16:54.394 DEBUG [a-service,e8ca7047a782568b,e8ca7047a782568b,true] 21320 --- [nio-7000-exec-1] org.apache.tomcat.util.http.Parameters   : ...
#服务 B 应用控制台日志
2021-01-12 22:16:54.402 DEBUG [b-service,e8ca7047a782568b,b6aa80fb33e71de6,true] 21968 --- [nio-8000-exec-2] org.apache.tomcat.util.http.Parameters   : ...
#服务 C 应用控制台日志
2021-01-12 22:16:54.405 DEBUG [c-service,e8ca7047a782568b,537098c59827a242,true] 17184 --- [nio-9000-exec-2] org.apache.tomcat.util.http.Parameters   : ...
```

在 DEBUG 级别下链路追踪数据被打印出来，按调用时间先后顺序分别是 A 到 C 依次出现。因为是一次完整业务处理，TraceId 都是相同的，SpanId 却各不相同，这些日志都已经被 Sleuth 导出，可以被 Zipkin 收集展示。

Zipkin 是推特的一个开源项目，它能收集各个服务实例上的链路追踪数据并可视化展现。服务控制台产生的日志在 Zipkin 的 UI 界面中会以链路追踪图表的形式展现，通过图表可以非常直观地了解业务处理过程中服务间的依赖关系与处理时间、处理状态等信息，是开发运维人员进行故障分析时必要的工具。

## 核心要点

- Sleuth 的接入成本极低：只需在服务工程 pom.xml 中引入 spring-cloud-starter-sleuth 依赖，重启服务无须任何额外设置，即自动为日志附加链路追踪数据。
- 链路追踪数据格式固定为 `[微服务 Id,TraceId,SpanId,isExport]`；同一轨迹内 TraceId 相同、SpanId 各不相同。
- Zipkin 是典型的 C/S（客户端与服务端）架构模式，需要独立部署 Zipkin 服务器，同时在微服务内部持有 Zipkin 客户端。
- Zipkin 客户端以异步形式将链路日志推送至服务端；服务端默认监听 9411 端口，远程访问需在防火墙放行。
- 采样配置：`spring.sleuth.sampler.probability` 是采样率（采集 Trace 的比率，默认 0.1），`spring.sleuth.sampler.rate` 是每秒最多采集 Trace 条数，超出部分直接抛弃。
- 排障用法：链路图可展示各服务的执行时间、执行顺序、访问地址、访问方式及是否执行成功；服务异常时链路图会标红并给出异常明细（如无可用实例导致处理失败）。
- 生产环境靠人工组织数以万计的链路日志不现实，必须部署 Zipkin 等分析工具简化过程。

## 微服务整合 Sleuth

以 a-service、b-service、c-service 三个微服务工程为例，配置过程如下。

**第一步**，创建 a-service、b-service、c-service 三个 Spring Boot 工程，pom.xml 依赖如下：

```xml
<!--Spring Web应用 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
<!--Nacos 客户端 -->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
<!--服务间通信组件OpenFeign -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-openfeign</artifactId>
    <version>2.2.6.RELEASE</version>
</dependency>
```

c-service 作为调用链末端，不依赖 OpenFeign，pom.xml 依赖如下：

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

因为调用关系是服务 A 调用服务 B、服务 B 调用服务 C，所以在 A、B 两个服务中需要额外依赖 OpenFeign 实现服务间通信。

**第二步**，配置 ABC 服务的 application.yml。这三个配置文件除了应用名称与服务端口不同外，其他都一样。设置 A 服务端口为 7000，B 服务端口 8000，C 服务端口 9000。

```yaml
server:
  port: 7000 #a:7000/b:8000/c:9000
spring:
  cloud:
    nacos:
      discovery:
        server-addr: 192.168.31.10:8848
        username: nacos
        password: nacos
  application:
    name: a-service #a-service/b-service/c-service
logging:
  level:
    root: debug #为演示需要，开启debug级别日志
```

**第三步**，实现业务逻辑，代码如下：

- **c-service 工程。**

SampleController 的 methodC 方法产生响应字符串 "-> Service C"，方法映射地址 "/c"：

```java
@RestController
public class SampleController {
    @GetMapping("/c")
    public String methodC(){
        String result = " -> Service C";
        return result;
    }
}
```

- **b-service 工程。**

CServiceFeignClient 通过 OpenFeign 实现了 C 服务的通信客户端，方法名为 methodC。

```java
@FeignClient("c-service")
public interface CServiceFeignClient {
    @GetMapping("/c")
    public String methodC();
}
```

SampleController 通过 methodB 方法调用 methodC 的同时为响应附加的字符串 "-> Service B"，方法映射地址 "/b"。

```java
@Controller
public class SampleController {
    @Resource
    private CServiceFeignClient cService;
    @GetMapping("/b")
    @ResponseBody
    public String methodB(){
        String result = cService.methodC();
        result = " -> Service B" + result;
        return result;
    }
}
```

- **a-service 工程。**

BServiceFeignClient 通过 OpenFeign 实现了 B 服务的通信客户端，方法名为 methodB：

```java
@FeignClient("b-service")
public interface BServiceFeignClient {
    @GetMapping("/b")
    public String methodB();
}
```

SampleController 通过 methodA 方法调用 methodB 的同时，为响应附加的字符串 "-> Service A"，方法映射地址 "/a"。

```java
@RestController
public class SampleController {
    @Resource
    private BServiceFeignClient bService;
    @GetMapping("/a")
    public String methodA(){
        String result = bService.methodB();
        result = "-> Service A" + result;
        return result;
    }
}
```

这样一个完整的调用链路已形成。3 个服务实例启动后，访问 A 实例 [http://localhost:7000/a](http://localhost:7000/a) 得到运行结果。

```text
-> Service A -> Service B -> Service C
```

ABC 三个服务按前后顺序依次产生结果，但此时日志中还没有包含任何链路追踪数据。引入 Sleuth 的方式：打开三个服务工程的 pom.xml 文件分别引入 spring-cloud-starter-sleuth 依赖。

```xml
<!--添加Sleuth依赖 -->
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-sleuth</artifactId>
    <version>2.2.6.RELEASE</version>
</dependency>
```

加入依赖后，重启服务，无须做任何额外设置，Spring Cloud Sleuth 便自动为日志增加了链路追踪数据，下面是整理后的追踪数据。

```log
#服务 A 应用控制台日志，已附加链路追踪数据
2021-01-12 22:16:54.394 DEBUG [a-service,e8ca7047a782568b,e8ca7047a782568b,true] 21320 --- [nio-7000-exec-1] org.apache.tomcat.util.http.Parameters   : ...
#服务 B 应用控制台日志
2021-01-12 22:16:54.402 DEBUG [b-service,e8ca7047a782568b,b6aa80fb33e71de6,true] 21968 --- [nio-8000-exec-2] org.apache.tomcat.util.http.Parameters   : ...
#服务 C 应用控制台日志
2021-01-12 22:16:54.405 DEBUG [c-service,e8ca7047a782568b,537098c59827a242,true] 17184 --- [nio-9000-exec-2] org.apache.tomcat.util.http.Parameters   : ...
```

在 DEBUG 级别下链路追踪数据被打印出来，按调用时间先后顺序分别是 A 到 C 依次出现。因为是一次完整业务处理，TraceId 都是相同的，SpanId 却各不相同，这些日志都已经被 Sleuth 导出，可以被 Zipkin 收集展示。

## 构建 Zipkin Server 实现链路追踪的可视化管理

Zipkin 是由推特开发的分布式链路追踪系统，用于对 Sleuth 产生的日志加以收集，并采用可视化的数据对链路追踪进行分析与图表展示。Zipkin 是典型的 C/S（客户端与服务端）架构模式，需要独立部署 Zipkin 服务器，同时也需要在微服务内部持有 Zipkin 客户端，才可以自动实现日志的推送与展示。

部署 Zipkin 服务端后，一旦微服务产生链路追踪日志，Zipkin 客户端便会自动以异步形式将日志数据推送至 Zipkin 服务端；Zipkin 服务端对数据进行组织整理，开发运维人员便可通过 Zipkin 服务端提供的 UI 界面进行查看。

## 部署 Zipkin 服务端

Zipkin 服务端部署非常简单，可以通过官网快速上手：

[https://zipkin.io/pages/quickstart.html](https://zipkin.io/pages/quickstart.html)。

```shell
curl -sSL https://zipkin.io/quickstart.sh | bash -s
java -jar zipkin.jar
```

因为 Zipkin 完全是基于 Java 开发的，在安装好 Java 环境后，只需要使用 Curl 命令下载 Zipkin 最新 Jar 包，并利用 Java 命令启动执行即可。

```log
Armeria server started at ports: {/0:0:0:0:0:0:0:0:9411=ServerPort(/0:0:0:0:0:0:0:0:9411, [http])}
```

注意：默认 Zipkin 监听本机 9411 端口，如果是网络远程访问，请在系统防火墙放行 9411 端口，否则无法通信。

启动成功后，访问 Zipkin 后台：

[http://localhost:9411/zipkin/](http://localhost:9411/zipkin/)

此时即为 Zipkin 内置的分析 UI 界面。没有任何服务接入时查询不到任何数据，接下来进行 Zipkin 客户端接入。

### 在微服务安装 Zipkin 客户端

Zipkin 客户端是以 Maven 依赖的形式在微服务中进行安装。

**第一步**，打开 ABC 工程的 pom.xml 文件，引入 Zipkin 客户端。

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-zipkin</artifactId>
    <version>2.2.6.RELEASE</version>
</dependency>
```

**第二步**，打开 ABC 工程的 application.yml 配置 Zipkin 通信地址以及采样率。

```yaml
spring:
  application:
    name: a-service
  sleuth:
    sampler: #采样器
      probability: 1.0 #采样率，采样率是采集Trace的比率，默认0.1
      rate: 10000 #每秒数据采集量，最多n条/秒Trace
  zipkin:
    #设置zipkin服务端地址
    base-url: http://localhost:9411
```

spring.zipkin.base-url 设置可用的 Zipkin 服务端 IP 端口即可。

采样器的两个设置项需要重点说明：

- spring.sleuth.sampler.probability 是采样率。假设在过去的 1 秒 a 服务实例产生了 10 个 Trace，如果采用默认采样率 0.1，则代表只有其中 1 条会被发送到 Zipkin 服务端进行分析整理；如果设为 1，则 10 条 Trace 都会被发送到服务端进行处理。
- spring.sleuth.sampler.rate 指每秒最多采集量，说明每秒最多允许采集多少条 Trace，超出部分将直接抛弃。

将 ABC 服务都设置好后，启动应用，重新访问 [http://localhost:7000/a](http://localhost:7000/a) 地址，然后打开 Zipkin 服务端 UI 界面 [http://localhost:9411](http://localhost:9411)，点击"查找"按钮，便会出现调用链路。

点击执行之间的蓝条，便会出现对应的链路调用图。通过这个图可以直观了解到 ABC 三个服务的执行时间、执行顺序、访问地址、访问方式以及是否执行成功；点击对应的色条，还可以看到更详细的内容。

### 异常链路排障实验

将 C 服务停止后再次访问 A 服务，会报 500 错误 "java.net.SocketTimeoutException: Read timed out"，此时链路追踪图会显示错误。

通过图表发现最后 b-service 只有 6 纳秒执行时间，肯定是有问题的，点击后查看明细，异常信息已经非常清晰地说明 C 服务没有可用的实例导致处理失败，开发人员针对这个问题进行及时补救即可。

## 实践要点

- 生产环境不要将 sampler.probability 设为 1.0：全量采集会产生大量链路数据，通常按业务重要性与容量规划设置采样率与 rate 上限。
- 排查跨服务故障的标准动作：先在 Zipkin 查询 Trace，观察各 Span 的耗时与颜色标记；执行时间异常短的 Span 往往意味着下游调用失败，点开明细查看异常栈即可定位根因。
- DEBUG 级别日志仅为演示链路数据方便，生产环境应使用 INFO 级别；Sleuth 的链路数据注入与日志级别无关。
- Sleuth 自 Spring Cloud 2022.0 起停止维护，新项目建议采用 Micrometer Tracing（见文末版本差异表）。

## 小结

链路追踪通过在服务调用过程中记录 TraceId/SpanId 等数据实现故障快速定位。Sleuth+Zipkin 组合的实施分为两个阶段：在服务中加入 Spring Cloud Sleuth 生成链路追踪日志（仅依赖引入即可生效）；通过 Zipkin 收集链路日志并生成可视化图表（服务端一键启动，客户端依赖加配置）。异常场景下，链路图与 Span 明细能够直接指出无可用实例等故障根因。

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

> 本文为 Spring Cloud Alibaba 旧版课程。升级到 Spring Cloud Alibaba 2025.x + Spring Boot 3.5.x 时，注意 Nacos 2.x 鉴权、Seata 2.x 配置与 Dubbo 3.x 应用级注册的迁移；链路追踪建议改用 Micrometer Tracing（Sleuth 自 Spring Cloud 2022.0 起停止维护）。
