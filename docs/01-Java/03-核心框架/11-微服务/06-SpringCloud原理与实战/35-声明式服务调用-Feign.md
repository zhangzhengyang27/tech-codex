---
title: "声明式服务调用-Feign"
description: "声明式 REST 客户端 Feign：核心组件（Contract/Encoder/Decoder/Client/Retryer 等）与执行过程，原生 API、自带注解与 Spring Cloud OpenFeign 三种使用方式，整合 Hystrix 回退、配置方式、最佳使用技巧与源码分析。"
keywords: [声明式服务调用-Feign]
category: "Java"
tags: [Java, SpringCloud原理与实战]
---

# 声明式服务调用-Feign

> ⚠️ **组件状态说明**：本文写作时 Feign 尚属 Netflix 体系，其配套的负载均衡组件 Ribbon 与熔断组件 Hystrix 均已由 Netflix 官方宣布停止维护（Spring Cloud 自 2020.0 起分别以 Spring Cloud LoadBalancer、Resilience4j/Sentinel 替代），Feign 本身则由 Spring Cloud OpenFeign 接续维护。本文保留其原理讲解价值（声明式服务调用的核心机制并未过时），生产选型请参考 Spring Cloud OpenFeign 与 [Spring Cloud LoadBalancer 官方文档](https://docs.spring.io/spring-cloud-commons/reference/spring-cloud-commons/loadbalancer.html)（文中组件对照见尾部版本差异表）。

内容涵盖三部分：Feign 基础知识、Feign 的使用与最佳使用技巧、Feign 源码分析。

开发中经常会遇到需要调用内部 API 或者第三方 API 的情况，常见调用方式主要有以下几种：

- HttpURLConnection

- HttpClient

- OKHttp

- RestTemplate

以上四种是最常见的 API 调用方式。调用 API 之前首先需要知道 API 的地址，其次是 API 对应的参数，然后发起调用，本质上调用 API 的过程就是一个 HTTP 请求过程。

Dubbo 框架的远程调用不需要使用者关注服务提供者信息：直接注入一个接口，然后调用接口中的方法，就像调用本地方法一样。这样的方式开发效率高，代码优雅。

## Feign 基础知识

### Feign 简介

Feign 是一个声明式的 REST 客户端，目的就是让 REST 调用更加简单。Feign 提供了 HTTP 请求的模板，通过编写简单的接口和插入注解，就可以定义好 HTTP 请求的参数、格式、地址等信息。

Feign 会完全代理 HTTP 请求，开发者只需像调用方法一样调用它就可以完成服务请求及相关处理。Spring Cloud 对 Feign 进行了封装，使其支持 SpringMVC 标准注解和 HttpMessageConverters。Feign 可以与 Eureka 和 Ribbon 组合使用以支持负载均衡，与 Hystrix 组合使用支持熔断回退。

未使用 Spring Cloud 时，可以直接用原生的 Feign 来调用 API；使用了 Spring Cloud，则可以直接用 Spring Cloud OpenFeign 来调用 API。

### Feign 重要组件

Feign 的强大功能离不开内部众多组件的支持，这些组件同时也为 Feign 提供了非常灵活的扩展机制，开发者可以根据自身的需求去扩展这些组件。

```mermaid
flowchart LR
  Client[Feign Client 客户端] --> Contract[Contract 契约组件<br/>解析接口注解(SpringMvcContract)]
  Client --> Encoder[Encoder 编码组件]
  Client --> Decoder[Decoder 解码组件]
  Client --> Logger[Logger 日志组件]
  Client --> ReqInterceptor[RequestInterceptor 拦截器]
  Client --> Retryer[Retryer 重试组件]
  Client --> LoadBalancer[LoadBalancer 负载均衡<br/>结合 Ribbon]
```

- Contract 契约组件

在 Feign 中可以通过定义 API 接口的方式来调用远程的 Http API，在定义调用 Client 的时候需要增加一些注解来描述这个调用 API 的基本信息，比如请求类型是 GET 还是 POST，请求的 URI 是什么。Contract 允许用户自定义契约去解析注解信息，最典型的应用场景就是在 Spring Cloud 中使用 Feign，开发者可以使用 Spring MVC 的注解来定义 Feign 的客户端，这是因为 Spring Cloud OpenFeign 中实现了自己的 SpringMvcContract。

- Encoder 编码组件

通过该组件可以将请求信息采用指定的编码方式进行编码后传输。

- Decoder 解码组件

Decoder 将响应数据解码成对象。

- ErrorDecoder 异常解码器

当被调用方发生异常后，可以在 ErrorDecoder 中将响应的数据转换成具体的异常返回给调用方，适合内部服务之间调用、但不想通过指定的字段来判断是否成功的场景，直接用自定义异常代替。

- Logger 日志记录

Logger 组件负责 Feign 中记录日志，可以指定 Logger 的级别以及自定义日志的输出。

- Client 请求执行组件

Client 是负责 HTTP 请求执行的组件，Feign 将请求信息封装好后会交由 Client 来执行。Feign 中默认的 Client 是通过 JDK 的 HttpURLConnection 来发起请求的，在每次发送请求的时候都会创建新的 HttpURLConnection 链接。使用默认方式 Feign 的性能会很差，原因就是使用了 HttpURLConnection。可以通过扩展该接口，使用 Apache HttpClient 等基于连接池的高性能 HTTP 客户端。

- Retryer 重试组件

Retryer 是负责重试的组件，Feign 内置了重试器，当 HTTP 请求出现 IO 异常时，Feign 会限定一个最大重试次数来进行重试操作。

- InvocationHandlerFactory 代理

InvocationHandlerFactory 采用 JDK 的动态代理方式生成代理对象。开发者定义的 Feign Client 是接口，当调用这个接口中定义的方法时，实际上是要去调用远程的 HTTP API，这里用了动态代理方式：当调用某个方法时，会进入代理中真正的去调用远程 HTTP API。

- RequestInterceptor 请求拦截器

可以为 Feign 添加多个拦截器，在请求执行前设置一些扩展的参数信息。

- QueryMapEncoder 参数查询

QueryMapEncoder 是针对实体类参数查询的编码器，可以基于 QueryMapEncoder 将实体类生成对应的查询参数。

### Feign 执行过程

```mermaid
flowchart TD
  A[定义 Feign 接口<br/>注解描述 HTTP 请求] --> B[调用接口方法]
  B --> C[InvocationHandlerFactory 动态代理<br/>生成代理实现类,委托到代理]
  C --> D[Contract 契约解析<br/>解析注解为 Feign 内部信息(SpringMvcContract)]
  D --> E[MethodHandler 生成 Request 对象<br/>设置 RequestInterceptor 拦截器]
  E --> F[Client 执行 HTTP 请求<br/>执行前/后记录日志]
  F --> G[Decoder 解码响应结果]
  G --> H[返回结果]
```

使用 Feign 时，首先定义对应的接口类，在接口类上使用 Feign 自带的注解来标识 HTTP 的请求参数信息。当调用接口对应的方法时，Feign 内部会基于面向接口的动态代理方式生成实现类，将请求调用委托到动态代理实现类，负责动态代理的组件是 InvocationHandlerFactory。

根据 Contract 规则，接口类的注解信息被解析并翻译成 Feign 内部能识别的信息。Feign 默认有一套自己的协议规范，也可以自定义其他的规范来进行扩展。在 Spring Cloud OpenFeign 中就扩展了 SpringMvcContract，这样做的目的是为了降低学习和使用成本：客户端和服务端使用同一个接口定义，发布成 SDK 给调用方使用。

MethodHandler 在执行的时候会生成 Request 对象，在构建 Request 对象的时候会为其设置拦截器，交由 Client 执行前记录一些日志，Client 执行完成后也记录一些日志，然后由 Decoder 进行响应结果的解码操作，并返回结果。

## Feign 的使用

### 原生 API

![](/spring-cloud-images/05-声明式服务调用-Feign__CgotOV2oGbmAGk9hAAEqjsNnfEc049.png)

上图代码截取自 Feign 的 GitHub 主页，展示了 Feign 调用 API 的简便性。

这是一个 GET 请求的示例：定义了一个 GitHub 的接口，接口中定义了一个查询的方法和参数。方法上有 @RequestLine 注解，定义了请求类型和请求的 URI，URI 中有对应的参数占位符，返回值是集合，集合中是对应的返回结构对象。

通过 Feign 的 builder 模式构建 GitHub 接口对象后，就可以直接通过 GitHub 接口对象调用里面的 contributors 方法，然后可以得到返回结果。Feign 的这种方式与 Dubbo 中的调用方式一样，就像调用本地方法一样。

使用原生的 Feign 来调用 API，只需要通过特定的注解来描述调用的 API 信息，包括请求方式（GET 或者 POST 等）、请求参数、请求地址等。把这些信息定义好后就可以直接使用这个定好了的接口来调用对应的远程 API。

### 自带注解

![](/spring-cloud-images/05-声明式服务调用-Feign__CgoB5l2oGbmAAxxlAACsHadsFYk931.png)

通过定义接口、加几个注解就可以轻松完成 API 的远程调用。Feign 中自带的注解与平时使用的 Spring MVC 注解不一样，除了前面提到的 @RequestLine 注解，Feign 中还有很多其他内置的注解，下面列出 Feign 内置注解及其作用。

@RequestLine 用来定义请求类型和请求的 URI；@Param 是用来做参数映射的；@Headers 是用来做请求头映射的；@QueryMap 是用来接收多个参数的，最常见的就是将多个参数封装在一个实体类中，然后用 @QueryMap 来修饰；@HeaderMap 可以将请求头映射成一个 Map 对象；@Body 可以定义一个数据模板，通过 @Param 解析对应的表达式，最终替换成完整的请求体。

### Spring Cloud

原生的 Feign 在使用层面已经很方便了，但是在 Spring Cloud 体系中却不那么适用，所以官方团队在 Feign 的基础上进行扩展，推出了 spring-cloud-openfeign，目的是让开发者在 Spring Cloud 体系中使用 Feign 变得更加简单。

由于开发的 API 通常都用 Spring MVC 的注解（比如 RequestMapping 等），而 Feign 的注解是单独的一套，编写调用 Client 接口时需要根据已有的接口来编写。在 spring-cloud-openfeign 中实现了 Spring MVC 的一套注解，调用方 Client 接口中的注解和 API 方可以一致，非常方便。

![](/spring-cloud-images/05-声明式服务调用-Feign__CgotOV2oGvSAB6lzACuH262SK0o630.gif)

在 Spring Cloud 中使用 Feign 主要有三步。

- 需要在启动类加 @EnableFeignClients 注解启用 Feign。

- 定义 Feign 的调用客户端，需要在接口上增加 @FeignClient 注解。

- 直接通过客户端访问接口。

![](/spring-cloud-images/05-声明式服务调用-Feign__CgotOV2oGu2AYbCzAD5-YgFFrj0939.gif)

示例操作：创建一个 UserRemoteClient，定义一个 getUser 方法，getUser 方法上的注解与服务提供方一致即可；然后在接口上增加一个 @FeignClient 注解，value 指定为服务提供方的服务名称，也就是 Eureka 中的服务名；启动类需要增加 @EnableFeignClients 注解开启 Feign 的装配；在使用的地方直接注入 UserRemoteClient，然后调用 getUser 方法就可以获取到远程的数据。

## Feign 整合 Hystrix

![](/spring-cloud-images/05-声明式服务调用-Feign__CgoB5l2oGuCAdFnGAA6QDTT4wB4893.gif)

在 pom 中增加 spring-cloud-starter-netflix-hystrix 的依赖，然后在配置文件中开启 Feign 对 Hystrix 的支持，配置 feign.hystrix.enabled=true。

![](/spring-cloud-images/05-声明式服务调用-Feign__CgotOV2oGtiAUD-yABz3qehaijk305.gif)

然后为 Feign Client 增加 Fallback：新建一个 UserRemoteClientFallbackFactory，实现 FallbackFactory 接口，泛型传入 Feign Client。在 create 方法中创建 UserRemoteClient 并编写回退逻辑。

最后需要在 @FeignClient 注解中指定 FallbackFactory 类，这样才能让这个 Feign Client 应用回退逻辑。

![](/spring-cloud-images/05-声明式服务调用-Feign__CgoB5l2oGr6AGh27ADHEa_iaFU8088.gif)

访问 getUser 接口测试：将对应的服务先停止，就可以看到相应的回退内容。

FallbackFactory 回退可以获取异常信息；还有一种回退方式不携带异常信息：创建一个 UserRemoteClientFallback 实现 UserRemoteClient，重写 getUser 方法，然后在 @FeignClient 注解中指定 fallback 即可。

## Feign 的配置

### 代码方式

Feign 的配置可以在代码中指定：为每个 Feign Client 创建一个单独的配置类，在类中配置对应的信息。例如要改变日志的级别，可以配置一个 Logger.Level 的 Bean，访问对应的接口后，可以在控制台看见详细的调用日志输出，前提是日志的级别必须为 Debug。还需要在 @FeignClient 注解中进行配置类的指定。

### 配置文件方式

更灵活的配置方式是放入配置文件中，生产实践建议将配置都放入配置文件。

![](/spring-cloud-images/05-声明式服务调用-Feign__CgotOV2oGbqAQfgPAAFRayo3xS8984.png)

配置文件方式有统一的格式，而且格式比较简单：前缀都是固定的 feign.client.config，后面接的是 Feign Client 的名称（即 @FeignClient 注解中的 value），然后是对应的配置项。这样的配置可以为不同的 Feign Client 配置不同的值。

## Feign 的最佳使用技巧

以下为几个实用技巧：

- 继承特性

- 拦截器

- GET 请求多参数传递

- 日志配置

- 异常解码器

### 继承特性-方式一

![](/spring-cloud-images/05-声明式服务调用-Feign__CgoB5l2oGbqAcCubAAD1tEMB1xw892.png)

Spring Cloud OpenFeign 支持继承的特性，可以将 API 的定义提取出来封装成一个单独的接口，给 API 的实现方和调用方共用，在一定程度上简化了重复的代码。

示例中定义了一个 UserFeignRemoteClient 的接口，加了 @FeignClient 注解，这个接口就变成了一个 Feign 的 Client。接口中定义了 getUser 方法，指定了访问的 URI。

再创建一个 UserController，增加 RestController 注解，并且实现上面定义的 UserFeignRemoteClient 接口，实现 getUser 方法。

使用的地方只要注入 UserFeignRemoteClient 就可以使用 getUser 方法，UserController 中也不用重复定义 API 的 URI 等信息。当接口的 URI 发生变化时，提供方和使用方用的都是一个共用的接口，两边不会出现不一致的情况，这就是继承特性带来的好处。

### 继承特性-方式二

![](/spring-cloud-images/05-声明式服务调用-Feign__CgotOV2oGbuASp8GAAC5YoZgIl0061.png)

上面的继承方式是简化之后的版本；Spring Cloud OpenFeign 的官方文档中给出的继承示例还要多一个类。第一步是抽出一个公共的接口，例如 UserService，UserService 中定义了要实现的 API 的方法。

在 UserController 中实现 UserService，然后创建一个 UserFeignRemoteClient，UserFeignRemoteClient 中继承 UserService。不同点在于：方式一是将 API 的方法定义在 UserFeignRemoteClient 中，然后 Controller 中实现 UserFeignRemoteClient；方式二是 API 方法的定义在一个独立的 UserService 接口上，Controller 和 Feign Client 分别实现或继承 UserService。两种方式的使用效果是一样的。

### 拦截器

![](/spring-cloud-images/05-声明式服务调用-Feign__CgoB5l2oGbuAIUQoAAC9NEkPsms617.png)

Feign 中提供了拦截器机制，可以添加自定义拦截器实现某些场景下的需求。BasicAuth 是 Feign 中默认提供的拦截器，只需配置一下就可以使用。自定义拦截器可以参考 BasicAuth 的代码：只要实现 RequestInterceptor 接口，在 apply 方法中编写自定义逻辑即可。通过 RequestTemplate 可以进行很多操作，比如添加指定的请求头信息，这个可以用在服务间传递某些信息的场景。

### GET 请求多参数传递

![](/spring-cloud-images/05-声明式服务调用-Feign__CgotOV2oGbuAG632AACHzF9lMXk706.png)

Feign 中 GET 请求传递多个参数可以用多个 @RequestParam 来接收，但参数多了对代码的可读性不友好。一般超过 3 个以上的参数会将参数封装在一个实体类中。在 Spring Cloud OpenFeign 中支持对象接收多个参数，但需要增加 @SpringQueryMap 注解才可以。

### 日志配置

API 调用失败后，需要有详细的请求信息来分析失败原因，可以设置 Feign 的日志级别来输出详细的请求信息。Feign 的日志级别有四种：

- NONE 表示不输出日志。

- BASIC 表示只输出请求方法的 URL 和响应的状态码以及执行的时间。

- HEADERS 将 BASIC 信息和请求头信息输出。

- FULL 会输出全部完整的请求信息。

了解日志级别后，就可以为 Feign Client 设置不同的级别，级别不同输出的请求信息的详细程度也不一样。此外，日志级别还可以通过动态配置在运行时调整：平时不输出日志，一旦需要排查问题时动态将日志打开，非常方便。

### 异常解码器

![](/spring-cloud-images/05-声明式服务调用-Feign__CgoB5l2oGbuAFUvrAADJtR7jdKs966.png)

Feign 中提供了异常的解码器，同时也可以自定义异常解码器，用于内部服务之间调用的异常传递。例如 A 服务调用 B 服务，B 服务中出现异常后，会由 B 服务中的全局异常处理器进行处理，然后返回给 A 服务的数据格式是固定的（code 是多少、message 是什么）。

在 A 服务中，可以通过 B 服务返回的 code 码来做对应的判断：调用是成功了还是失败了。内部服务之间为了简便性，通常希望跟调用本地方法一样——当被调用方抛出异常后，调用方也能感知到对应的异常。这个时候可以在异常解码器中获取异常信息，然后转换成对应的异常对象返回。

## Feign 源码分析

![](/spring-cloud-images/05-声明式服务调用-Feign__CgoB5l2oGpiAEY_oABwyiU6L1t0316.gif)

首先来看 Feign 执行请求的源码。从 Feign 这个类开始，通过 Feign 类提供的 Builder 模式可以构建出一个 Feign Client，通过这个 Client 就可以调用远程的 API。Builder 类中的参数信息包括 Logger、Client 等。

![](/spring-cloud-images/05-声明式服务调用-Feign__CgoB5l2oGomATcVTAErP1s9Xx08760.gif)

接下来看 target 方法。target 是最终生成代理类的方法：首先会进入 build 方法，在 build 中创建了 ReflectiveFeign 对象，最终调用的是 newInstance 方法，解析出 MethodHandler，然后创建 InvocationHandler 生成代理类。接着查看 SynchronousMethodHandler 类，在 invoke 方法中就是调用远程 API 的逻辑：创建一个 RequestTemplate，然后根据 RequestTemplate 获取对应的 Request 并记录日志，然后交由 client 执行，得到 response 后由 decode 进行解码。这就是大致的整体流程，想了解内部的实现细节可以深入阅读这段源码。

![](/spring-cloud-images/05-声明式服务调用-Feign__CgoB5l2oGlKAYPhyADyseZWK2iI541.gif)

然后看 Feign 中是如何集成 Hystrix 的。打开源码 FeignClientsConfiguration 类，其中的 HystrixFeignConfiguration 对 Feign.Builder 进行了重新定义，返回的是 HystrixFeign.builder()。

进入 HystrixFeign.builder 中可以看到它继承了 Feign 的 Builder，增加了 Hystrix 的 SetterFactory。看 build 方法里，对 invocationHandlerFactory 进行了重写，在 create 的时候返回的是 HystrixInvocationHandler。HystrixInvocationHandler 中在 invoke 的时候会将请求包装成 HystrixCommand 去执行，这样就自然地集成了 Hystrix。

## 小结

本文覆盖了 Feign 的基础知识（组件模型与执行过程）、使用方式（原生 API、自带注解、Spring Cloud OpenFeign）、整合 Hystrix 回退、代码/配置文件两种配置方式、五项最佳使用技巧（继承特性、拦截器、GET 多参数、日志配置、异常解码器），以及基于 Builder 与动态代理的源码执行链路。声明式服务调用的核心机制（接口 + 注解 + 动态代理）在 Spring Cloud OpenFeign 中延续使用，原理并未过时。

## 版本差异（Spring Cloud 旧版 → 2025.x）

| 组件 | 旧版（本文编写时） | 当前（Spring Cloud 2025.x / Boot 3.5.x） |
|------|-------------------|------------------------------------------|
| 服务注册 | Eureka 1.x（Eureka 2.x 已终止开发） | Nacos 2.x / Consul（Eureka 1.x 仍随 Spring Cloud Netflix 维护） |
| 负载均衡 | Ribbon（已停止维护） | Spring Cloud LoadBalancer |
| 网关 | Zuul 1.x（已停止维护） | Spring Cloud Gateway（基于 WebFlux） |
| 熔断 | Hystrix（已停止维护） | Resilience4j / Sentinel |
| 配置中心 | Spring Cloud Config | Nacos Config / Apollo |
| 版本对应 | Hoxton/2020.x + Boot 2.x + JDK 8 | 2025.x + Boot 3.5.x + JDK 17+ |

> 本文为 Spring Cloud 旧版课程（Hoxton/2020.x 时代）。Hystrix、Ribbon、Zuul 1.x、Eureka 已停止维护，新项目请使用 Spring Cloud Gateway + LoadBalancer + Resilience4j（或 Alibaba 系 Nacos/Sentinel/Seata），并升级到 Spring Cloud 2025.x + Spring Boot 3.5.x。
