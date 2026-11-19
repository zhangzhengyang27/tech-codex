---
title: "监控原理：如何理解服务监控和 Spring Cloud Sleuth 的基本原理？"
description: "服务监控基本原理：TraceId/SpanId 概念与调用链路还原，cs/sr/ss/cr 四种关键事件的时间差计算，以及通过 spring-cloud-starter-sleuth 在日志中自动注入链路信息。"
keywords: [监控原理, 如何理解服务监控和, Spring, Cloud, Sleuth, 的基本原理]
category: "Java"
tags: [Java, SpringCloud原理与实战]
---
# 监控原理：如何理解服务监控和 Spring Cloud Sleuth 的基本原理？

## 概念说明

服务监控是微服务架构中非常重要的一个话题。服务监控的基本原理是理解服务监控相关工具和框架的基础。作为 Spring Cloud 中用于实现服务监控的专用工具，Spring Cloud Sleuth 为实现这些基本原理提供了完整而强大的解决方案。

在微服务架构中，系统基于业务划分服务并对外暴露服务访问接口。考虑这样一个场景：某一个业务接口在访问过程中发生了错误，一般的处理过程就是快速定位到问题所发生的服务并进行解决。但在中大型系统中，一个业务接口背后可能会调用一批其他业务体系中的业务接口或基础设施类的底层接口，如何做到快速定位问题就是服务监控要解决的核心问题。

传统的做法是通过查阅服务器的日志来定位问题，但在中大型系统中，这种做法可操作性并不强，主要原因是很难找到包含错误日志的那台服务器。一方面，开发人员可能都不知道整个服务调用链路中具体有几个服务，也就无法找到是哪个服务发生了错误；就算找到了目标服务，在分布式集群的环境下，也不建议直接通过访问某台服务器来定位问题。服务监控的需求就应运而生。

## 原理与机制

分布式服务跟踪和监控的运行原理实际上并不复杂，首先需要引入两个基本概念，即 SpanId 和 TraceId。

### SpanId

SpanId 一般被称为跨度 Id。针对服务 A 的访问请求，通过 SpanId 来标识该请求的到达并返回的具体过程。显然，对于这个 Span 而言，需要明确 Span 的开始时间和结束时间，这两个时间之间的差值就是服务 A 对这个请求的处理时间。

### TraceId

除了 SpanId 外，还需要 TraceId，也就是跟踪 Id。要想监控整个链路，不能只关注服务 A 中的 Span，而是需要把请求通过所有服务的 Span 都串联起来。这时候就需要为这个请求生成一个全局的唯一性 Id，通过这个 Id 可以串联起从服务 A 到服务 F 的整个调用，这个唯一性 Id 就是 TraceId。

同时，各个 Span 之间的顺序关系也需要关注。服务 A 位于服务 B 的上游，所以访问服务 A 所生成的 SpanId 应该是访问服务 B 所生成的 SpanId 的父 SpanId，服务 B 和服务 C 的调用关系以此类推。这样，通过获取请求的唯一性 TraceId，并通过各个父 SpanId 与子 SpanId 之间的关联关系，就可以构建出一条完整的服务调用链路。

### 四种关键事件

关于 Span，业界一般使用四种关键事件记录每个服务的客户端请求和服务器响应过程。可以基于四种关键事件来剖析一个 Span 中的时间表示方式：cs 表示 Client Send，也就是客户端向服务 A 发起了一个请求，代表了一个 Span 的开始；sr 代表 Server Receive，表示服务端接收客户端的请求并开始处理它；一旦请求到达了服务器端，服务器端对请求进行处理，并返回结果给客户端，这时候就会产生 ss 事件，也就是 Server Send；最后的 cr 表示 Client Receive，表示客户端接收到了服务器端返回的结果，代表着一个 Span 的完成。

通过计算这些关键时间点之间的差值可以获取 Span 中的时间信息：sr-cs 值等于请求的去程网络延迟，ss-sr 值表示服务端处理请求的时间，而 cr-ss 值则代表结果从服务端传回客户端的回程网络延迟。

通过这些关键事件就可以发现服务调用链路中存在的问题，目前主流的服务监控实现工具都对这些关键事件做了支持和封装。

明确了分布式环境下服务跟踪的载体（TraceId 和 SpanId）之后，要实现服务跟踪还需要围绕这两个载体做进一步的分析和挖掘。首先，需要对整个调用过程的所有服务进行埋点并生成事件，并对这些事件数据进行采集；同时，由于事件数据量一般都很大，不仅要能实现存储，还需要能提供快速查询；然后，在此基础上，还需要对采集到的事件数据进行各种指标运算，并将运算结果保存起来，并提供各种排序、阈值设置和警告等功能。

这些工作不是简单一个工具和框架能全部完成的。幸好在 Spring Cloud 中存在一个组件能够简化实现，这个组件就是 Spring Cloud Sleuth。在 Spring Cloud Sleuth 中，这些事件被称为注解（Annotation），需注意名称上的不同叫法。

## 代码示例：使用 Spring Cloud Sleuth 实现服务监控

Spring Cloud Sleuth 是 Spring Cloud 的组成部分之一，对于分布式环境下的服务调用链路，可以通过该框架来完成服务监控和跟踪方面的各种需求。

将 Spring Cloud Sleuth 添加到系统的类路径后，该框架便会自动建立日志收集渠道，不仅包括常见的使用 RestTemplate 发出的请求，同时也能无缝支持通过 API 网关 Zuul 以及 Spring Cloud Stream 所发送的请求。

借助 Spring Cloud Sleuth 中即插即用的服务调用链路构建过程，在某个微服务中添加服务监控功能要做的事情只有一件，即把 spring-cloud-starter-sleuth 组件添加到 Maven 依赖中即可，如下所示。

```xml
<dependency>
     <groupId>org.springframework.cloud</groupId>
     <artifactId>spring-cloud-starter-sleuth</artifactId>
</dependency>
```

初始化工作完成之后，引入 Spring Cloud Sleuth 带来的变化首当其冲体现在控制台日志分析上。以 SpringHealth 案例系统为例，通过发起一次请求操作来观察 Spring Cloud Sleuth 的运行时效果。

intervention-service 分别调用了 user-service 和 device-service。调用[http://localhost:5555/springhealth/intervention/interventions/springhealth_admin/device1](http://localhost:5555/springhealth/intervention/interventions/springhealth_admin/device1) 端点后，在 user-service 的控制台上可以看到如下日志信息：

```xml
INFO [userservice,81d66b6e43e71faa,6df220755223fb6e,true] 18100 --- [nio-8082-exec-8] c.s.user.controller.UserController       : Get user by userName from 8082 port of userservice instance
```

上述日志信息中方括号内包括了四段内容，即服务名称、TraceId、SpanId 和 Zipkin 标志位，其格式如下所示：

```xml
[服务名称, TraceId, SpanId, Zipkin 标志位]
```

第一段中的 userservice 代表着该服务的名称，使用的就是在 bootstrap.yml 中 spring.application.name 指定的服务名称。考虑到服务跟踪的需求，为服务指定一个统一而友好的名称是一项最佳实践。

第二段中的 TraceId 代表一次完整请求的唯一编号，上例中的 81d66b6e43e71faa 就是该次请求的唯一编号。在诸如 Zipkin 等可视化工具中，可以通过 TraceId 查看完整的服务调用链路。

在一个完整的服务调用链路中，每一个服务之间的调用过程都可以通过 SpanId 进行唯一标识，例如上例中位于第三段的 6df220755223fb6e。所以 TraceId 和 SpanId 是一对多的关系，即一个 TraceId 一般都会包含多个 SpanId，每一个 SpanId 都从属于特定的 TraceId。当然，也可以通过 SpanId 查看某一个服务调用过程的详细信息。

在未引入 Spring Cloud Sleuth 之前，这四段内容的日志显示效果为 [userservice,,,]，即默认请求下 TraceId、SpanId 和 Zipkin 标志位都为空，这些内容都是在引入 Spring Cloud Sleuth 之后被自动添加到每一次服务调用中的。

同样，device-service 和 intervention-service 中的日志信息也包含完整的四段内容。device-service 中的控制台输出日志如下，其中 TraceId 为 81d66b6e43e71faa，SpanId 为 e1dffdb86c81cc3c，Zipkin 标志位为 true：

```xml
INFO [deviceservice,81d66b6e43e71faa,e1dffdb86c81cc3c,true] 18656 --- [nio-8081-exec-2] c.s.device.controller.DeviceController   : Get device by code: device1 from port: 8081
```

在 intervention-service 的日志信息中，也存在类似的一条记录，其中 TraceId 为 81d66b6e43e71faa，SpanId 为 992aec60c399ece2，Zipkin 标志位也为 true：

```xml
INFO [interventionservice,81d66b6e43e71faa,992aec60c399ece2,true] 28648 --- [nio-8081-exec-2] c.s.intervention.controller.InterventionController   : Generate intervention for userName: springhealth_admin and deviceCode: device1.
```

请注意，以上三段日志中的 TraceId 都是 81d66b6e43e71faa，也就是它们属于同一个服务调用链路，而不同的 SpanId 代表着整个链路中的具体某一个服务调用。从日志中的时间上也不难看出三者之间的调用时序。基于这三个服务以及 TraceId、SpanId，就可以还原出完整的服务调用时序链路。

## 实践要点

- 服务监控的完整能力链条：埋点生成事件 → 事件采集 → 大数据量存储与快速查询 → 指标运算 → 排序、阈值设置与警告，单一工具难以覆盖全部环节。
- TraceId 与 SpanId 是一对多关系：一个 TraceId 对应一次完整请求，多个 SpanId 对应该请求经过的各次服务调用，父 SpanId 与子 SpanId 的关联关系构成调用链路。
- 日志格式 `[服务名称, TraceId, SpanId, Zipkin 标志位]` 由 Sleuth 自动注入，未引入 Sleuth 时显示为 `[userservice,,,]`，可作为框架是否生效的快速判据。
- 通过 `spring.application.name` 为服务指定统一而友好的名称，是日志检索与服务跟踪的最佳实践。
- cs/sr/ss/cr 四种关键事件的时间差（sr-cs、ss-sr、cr-ss）可分别定位去程网络延迟、服务端处理耗时与回程网络延迟。

## 小结

构建服务监控和链路跟踪在微服务系统开发过程中是一项基础设施类工作，而 Spring Cloud Sleuth 可以轻松完成这项工作。Sleuth 内置了日志采集和分析机制，能够自动化建立 TraceId 和 SpanId 之间的关联关系：TraceId 标识一次完整请求，SpanId 标识链路中的每一次服务调用，配合 cs/sr/ss/cr 四种关键事件即可还原完整的服务调用时序链路。

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
