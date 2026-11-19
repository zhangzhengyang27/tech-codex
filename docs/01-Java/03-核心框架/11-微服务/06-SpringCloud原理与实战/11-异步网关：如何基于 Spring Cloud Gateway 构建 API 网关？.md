---
title: "异步网关：如何基于 Spring Cloud Gateway 构建 API 网关？"
description: "Spring Cloud Gateway 与 Zuul 的对比（响应式非阻塞 vs Servlet 阻塞），路由配置（谓词/过滤器/lb 负载均衡/RewritePath），全局过滤器与 GlobalFilter 自定义，以及基于 Redis 的 RequestRateLimiter 请求限流。"
keywords: [异步网关, 如何基于, Spring, Cloud, Gateway, 构建]
category: "Java"
tags: [Java, SpringCloud原理与实战]
---
# 异步网关：如何基于 Spring Cloud Gateway 构建 API 网关？

## 概念说明

在微服务架构中，可以根据需要在服务提供者和消费者之间架设 API 网关，来满足服务路由和控制的各种场景。Zuul 网关之外，另一款主流的 API 网关实现是 Spring Cloud Gateway。

Spring Cloud Gateway 是 Spring 官方开发的一款 API 网关。它与 Netflix Zuul 的核心差异如下：

- **通信模型**：Zuul 的实现原理是对 Servlet 的一层封装，通信模式上采用阻塞式 I/O；Spring Cloud Gateway 基于最新的 Spring 5 和 Spring Boot 2，以及用于响应式编程的 Project Reactor 框架，提供响应式、非阻塞式 I/O 模型。较之 Netflix Zuul，**性能上** Spring Cloud Gateway 更胜一筹。
- **功能丰富度**：除了通用的服务路由机制之外，Spring Cloud Gateway 还支持请求限流等面向服务容错方面的功能，同样能与 Hystrix 等框架进行良好的集成。
- **选型权衡**：Spring Cloud Gateway 的源码较为复杂，出现问题不容易排查和解决；而 Zuul 的编程模型和底层原理都非常简单，开发调试上容易把握。这是两者并存的原因。

要在微服务架构中引入 Spring Cloud Gateway，需要构建一个独立的 Spring Boot 应用程序，并在 Maven 中添加如下依赖项：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-gateway</artifactId>
</dependency>
```

按照约定，这个独立的微服务可命名为 gateway-server，然后在作为 Bootstrap 类的 GatewayApplication 上添加 @EnableDiscoveryClient 注解即可，如下所示：

```java
@SpringBootApplication
@EnableDiscoveryClient
public class GatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(GatewayApplication.class, args);
    }
}
```

## 服务路由

### 基本架构

Spring Cloud Gateway 中的核心概念有两个：一个是**过滤器（Filter）**，一个是**谓词（Predicate）**。

Spring Cloud Gateway 中的过滤器与 Zuul 中的过滤器是同一个概念，都可以用于在处理 HTTP 请求之前或之后修改请求本身及对应响应结果，区别在于两者的类型和实现方式不同。Spring Cloud Gateway 的过滤器种类非常丰富，后文将有专门主题对其进行详细展开。

谓词本质上是一种判断条件，用于将 HTTP 请求与路由进行匹配。Spring Cloud Gateway 内置了大量的谓词组件，可以分别对 HTTP 请求的消息头、请求路径等常见的路由媒介进行自动匹配以便决定路由结果。各谓词的详细用法可参考官方文档做进一步学习。

除了指定服务的名称和目标服务地址之外，使用 Spring Cloud Gateway 最主要的开发工作就是配置谓词和过滤器规则。

### 路由配置

与 Zuul 一样，Spring Cloud Gateway 通过配置项来设置对 HTTP 请求的路由行为。但与 Zuul 不同，默认情况下 Spring Cloud Gateway 并不支持与服务发现机制之间的自动集成。为了启用该功能，需要在配置文件中添加如下配置项：

```yaml
spring:
  cloud:
    gateway:
      discovery:
        locator:
          enabled: true
```

一条完整路由配置的基本结构如下所示：

```yaml
spring:
  cloud:
    gateway:
      routes:
      - id: testroute
        uri: lb://testservice
        predicates:
        - Path=/test/**
        filters:
        - PrefixPath=/prefix
```

在上述配置中，有几个需要注意的点。首先使用 id 配置项指定了这条**路由信息的编号**，这个例子中的“testroute”就起了这个作用。而 uri 配置项中的“lb”代表**负载均衡** LoadBalance，也就是说在访问 url 指定的服务名称时需要**集成负载均衡机制**。请注意“lb”配置项中所指定的服务名称同样需要与保存在 Eureka 中的服务名称**完全一致**。然后通过**谓词**对请求路径进行**匹配**，这里的“Path=/test/**”代表所有以“/test”开头的请求都将被路由到这条路径中。最后定义了一个**过滤器**，这个过滤器的作用是**为路径添加前缀**（Prefix），这样当请求“/test/”时，最后转发到目标服务的路径将会变为“/prefix/test/”。

以 SpringHealth 案例系统为例，Spring Cloud Gateway 网关服务中完整版的配置信息如下所示：

```yaml
server:
  port: 5555

eureka:
  instance:
    preferIpAddress: true
  client:
    registerWithEureka: true
    fetchRegistry: true
    serviceUrl:
        defaultZone: http://localhost:8761/eureka/

spring:
  cloud:
    gateway:
      discovery:
        locator:
          enabled: true
      routes:
      - id: userroute
        uri: lb://userservice
        predicates:
        - Path=/user/**
        filters:
        - RewritePath=/user/(?<path>.*), /$\{path}
      - id: deviceroute
        uri: lb://deviceservice
        predicates:
        - Path=/device/**
        filters:
        - RewritePath=/device/(?<path>.*), /$\{path}
      - id: interventionroute
        uri: lb://interventionservice
        predicates:
        - Path=/intervention/**
        filters:
        - RewritePath=/intervention/(?<path>.*), /$\{path}
```

即便三个独立的业务服务尚未完成完整构建，从设计和规划上讲，也可以先对服务路由进行配置。在上述配置中，先设置了 Eureka 服务的地址并启用了服务发现机制，然后根据 Eureka 保存的服务名称和地址定义了三条路由规则：userroute、deviceroute 和 interventionroute 分别对应 user-service、device-service 和 intervention-service 这三个微服务。这里通过在各个服务名称前面加上“lb://”来实现客户端负载均衡。

同时，上述配置对请求路径设置了谓词，并添加了一个对请求路径进行重写（Rewrite）的**过滤器**。通常，每个微服务自身通过根路径“/”来暴露服务。基于以上配置，通过 Spring Cloud Gateway 暴露它们时，则分别在路径上添加了“/user”“/device”和“/intervention”前缀。这种重写过滤器的效果与前缀过滤器有相同的效果。

以上配置项比较常见，可参考并搭建满足自身需求的网关服务。在 Spring Cloud Gateway 的整个功能体系中，**扩展性**主要体现在**过滤器组件**中。

## 过滤器机制

### 全局过滤器 GlobalFilter

针对过滤器，Spring Cloud Gateway 提供了一个全局过滤器（GlobalFilter）的概念。这个概念的应用对象是路由本身：如果过滤器只针对某一个路由生效，那它就是一个普通的过滤器；而那些对所有路由都生效的过滤器就是全局过滤器。Spring Cloud Gateway 内置了一大批过滤器，每个过滤器在官方文档中都有详细的描述，以下举几个常见的过滤器使用方法。

全局过滤器可用于对所有 HTTP 请求进行拦截，具体做法是实现 GlobalFilter 接口，示例代码如下所示。

```java
@Configuration
public class JWTAuthFilter implements GlobalFilter {

@Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest.Builder builder = exchange.getRequest().mutate();
        builder.header("Authorization","JWTToken");

        return chain.filter(exchange.mutate().request(builder.build()).build());
    }
}
```

以上代码展示了如何利用全局过滤器在所有的请求中添加 Header 的实现方法。在这个示例中，所有经过 API 网关的 HTTP 请求都被添加了一个消息头，用来设置与 JWT Token 相关的安全认证信息。关于微服务的安全性和 JWT 的详细内容见《服务认证：如何使用 JWT 实现定制化 Token？》一文。

注意到这里的 filter 方法返回了一个 Mono 对象。Mono 是响应式编程框架 Project Reactor 中代表单个返回值的流式对象。响应式编程是一个复杂的话题，此处只需掌握使用常见 API 构建全局过滤器的方法以及效果。

### pre 与 post 阶段过滤器

Zuul 有 pre、route、post 和 error 这四种类型的过滤器，分别对应一个 HTTP 请求的不同生命周期。在这点上，Spring Cloud Gateway 与 Zuul 在设计思想上是一致的，它也提供了可用于 pre 和 post 两种阶段的过滤器。很多时候需要根据场景来构建针对这两个阶段的自定义过滤器。

以下代码展示了一个 PostGatewayFilter 的实现方式：首先继承一个 AbstractGatewayFilterFactory 类，然后可以通过覆写 apply 方法来提供针对 ServerHttpResponse 对象的任何操作：

```java
public class PostGatewayFilterFactory extends AbstractGatewayFilterFactory {

public PostGatewayFilterFactory() {
        super(Config.class);
    }

public GatewayFilter apply() {
        return apply(o -> {
        });
    }

@Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
          return chain.filter(exchange).then(Mono.fromRunnable(() -> {
              ServerHttpResponse response = exchange.getResponse();

//针对Response的各种处理
            }));
          };
    }

    public static class Config {
    }
}
```

PreGatewayFilter 的实现方式也类似，只不过处理的目标一般是 ServerHttpRequest 对象。

### 请求限流 RequestRateLimiter

相比 Zuul，**请求限流**是 Spring Cloud Gateway 的一项特色功能。为此，Spring Cloud Gateway 中专门存在一个请求限流过滤器 RequestRateLimiter。

所谓限流，一般的做法是衡量请求处理的速率并对其进行控制。因此，RequestRateLimiter 抽象了两个参数来完成这一目标。其中第一个参数是 replenishRate，该参数用于指定允许用户每秒处理的请求数。而第二个参数是 burstCapacity，它用于设置允许的突发请求上限，即“桶”的容量。如果把请求看成是往一个桶里倒水，那么 replenishRate 参数用于控制水流的速度，而 burstCapacity 用于控制桶的大小。请求限流过滤器的完整配置示例如下所示：

```yaml
spring:
  cloud:
    gateway:
      routes:
      - id: requestratelimiterroute
        uri: lb://interventionservice
        filters:
        - name: RequestRateLimiter
          args:
            redis-rate-limiter.replenishRate: 50
            redis-rate-limiter.burstCapacity: 100
```

请求限流过滤器在实现上依赖 Redis，所以需要引入 spring-boot-starter-data-redis-reactive 这个支持响应式 Redis 的依赖。以上配置针对访问 intervention-service 的场景，基于 Redis 分别设置 replenishRate 和 burstCapacity 值为 50 和 100。日常开发过程中可以尝试调整这些参数。

## 实践要点

- 启用与服务发现的自动集成需要显式开启 `spring.cloud.gateway.discovery.locator.enabled=true`，这一点与 Zuul 的默认行为不同。
- “lb://服务名”中的服务名必须与注册中心（Eureka）中的服务名称完全一致，否则路由将无法命中。
- 全局过滤器（GlobalFilter）对所有路由生效，普通过滤器只对单个路由生效；跨切面逻辑（如认证信息注入）适合用全局过滤器实现。
- 自定义 pre/post 过滤器继承 AbstractGatewayFilterFactory，分别围绕 ServerHttpRequest 与 ServerHttpResponse 编写处理逻辑。
- RequestRateLimiter 依赖 Redis（响应式客户端），replenishRate 控制平均速率，burstCapacity 控制突发容量，两者需按业务峰值共同调优。
- Spring Cloud Gateway 源码复杂度高于 Zuul，出现问题时可优先利用内置过滤器与谓词的官方文档进行排查。

## 小结

Spring Cloud Gateway 是基于 Spring 5、Spring Boot 2 与 Project Reactor 的响应式 API 网关，相比基于 Servlet 阻塞 I/O 的 Zuul 具备性能与功能上的双重优势。其基本架构由过滤器（Filter）与谓词（Predicate）两大核心概念构成：谓词负责请求与路由的匹配，过滤器负责请求前后的处理与路径改写；GlobalFilter 提供对所有路由生效的拦截能力，AbstractGatewayFilterFactory 支持 pre/post 两个阶段的自定义扩展，RequestRateLimiter 则基于 Redis 提供速率与突发容量两个维度的请求限流。

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
