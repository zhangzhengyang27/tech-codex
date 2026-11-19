---
title: "Spring Cloud综合案例"
description: "本文「综合案例」主要讲解如何综合运用前面所学的组件，构建一套完整的微服务架构。"
keywords: [Spring, Cloud综合案例]
category: "Java"
tags: [Java, SpringCloud原理与实战]
---

# Spring Cloud综合案例

## 综合案例架构图

![](/spring-cloud-images/12-Spring_Cloud综合案例__Cgp9HWBcIOuACRh7AADDrLDk4gs631.png)

本案例综合运用 Spring Cloud 各组件，构建一套完整的微服务架构，可作为使用 Spring Cloud 做微服务架构时的落地参考。

架构流转路径：客户端发起请求到负载均衡器（如 Nginx），Nginx 将请求转发到网关，网关再转发到具体的服务上。

架构中的基础组件：注册中心集群为 Eureka；配置中心为 Apollo；链路跟踪为 Sleuth 加 Zipkin；ELK 用来收集链路日志展示查询。

本案例并不会将所有组件都搭建出来，而是将最底层的代码框架搭建出来，像 Nginx、ELK 等不再具体演示。

## 案例项目模块

![](/spring-cloud-images/12-Spring_Cloud综合案例__Cgp9HWBcIPaAYc_qAABYROhyDiA390.png)

整个项目采用 Maven 多模块的结构，总共 8 个模块。

- article 是文章服务，提供文章获取接口，作为案例不会做太多跟业务相关的事情。article-api 是接口的定义，所有文章相关的接口都在 api 中进行定义，同时也作为 Feign Client 的调用 SDK。article-provider 是服务提供者，article 服务最终是通过 article-provider 来启动暴露的，在 article-provider 中会实现 api 中定义的接口和业务逻辑。

- common 中会放一些通用的工具类，比如 JsonUtils、DateUtils 等。

- core 中主要是一些核心的逻辑，并且比较通用，比如像灰度发布的处理等。

- eureka 是注册中心。

- hystrix-dashboard 是 hystrix 监控数据展示的 Web 控制台。

- user 是用户服务，负责用户的登录、退出登录、用户信息查询等。

- zuul 是网关，负责访问控制、请求跨域处理等。

- webpage 是一个有页面的 Web 项目。整个案例采用前后端分离的思想，为了降低理解和使用难度，直接采用 Spring MVC 的方式创建一个项目模拟前端（纯前端方式对不熟悉前端的开发者有一定难度）。Web 中采用 Controller 来进行页面的跳转，到页面后通过 Vue 来渲染页面，通过 Ajax 请求后端接口获取数据。与完整的前后端分离不同的点在于路由是通过后端转发控制的，而不是通过前端框架控制路由，整体实现思路一致。

## 前端页面

![](/spring-cloud-images/12-Spring_Cloud综合案例__CioPOWBcIQWAAit7AABjdZD-Hs4729.png)

前端页面只实现了 2 个：一个是登录的页面，负责登录的功能；一个是文章详情的页面，负责获取文章信息展示，页面上还有退出登录的按钮，执行退出操作。

![](/spring-cloud-images/12-Spring_Cloud综合案例__CioPOWBcIQyAJveUAACBu7riNqg956.png)

## 案例实现功能

实现的业务功能主要有三个：用户登录、用户退出登录、查询文章信息。

实现的技术功能有：网关验证、用户信息全局透传、服务灰度发布、调用链集成、Apollo 集成。

### 用户登录

业务功能用户登录：webpage 中有一个登录的页面，包含一个表单、两个文本框（用户名与密码），以及非空验证逻辑。重置按钮用于清空表单的输入项，登录按钮执行真正的登录业务逻辑。登录时调用 user-provider 服务的登录接口，将用户名和密码传递过去，登录成功则将返回的 Token 存储起来。

在 user-provider 中的 UserRestController 里实现了登录的逻辑，接口的定义在 UserAPI 中，同时也是作为 Feign 的 Client 使用。

登录逻辑比较简单：因为是示例程序，只做了简单的参数判断，固定等于某个值即认为登录成功，然后使用 JWT 工具类生成用户对应的 Token 返回给调用方。

### 退出登录

退出登录的按钮在 index 页面中，调用的接口同样来自 user-provider。退出登录时会判断要注销的 Token 和当前用户是不是同一个人，防止被非法操作。验证成功后将注销的 Token 放入 Redis 中，然后在网关中加一层过滤逻辑：如果访问的 Token 存在于注销 Redis 中就拦截。需要注意的是，user-provider 中的 Redis 和网关中必须是同一个；如果不同，则需要在 user-provider 中通过其他方式告诉网关。

### 查询文章信息

文章信息也在 index 页面中显示。页面加载时就会去调用 article-provider 的接口获取文章信息，然后显示。

article-provider 中会调用 user-provider 中的用户信息接口，拿到用户名组装结果返回给调用方。示例中是固定写好的数据，没有做数据库相关的操作，只为让示例更简单、方便本地启动。

### 网关验证

网关是所有外部请求的入口，必须守好这道防线：请求必须验证，但有的特殊请求可以不进行验证，比如登录接口（如果登录都被拦截，就会陷入死循环）。因此需要一个白名单功能，并且还需要能够实时修改并生效——这正是配置中心的作用。

实现方式：在 Zuul 中定义一个验证的过滤器，同时定义一个接口白名单的 List，关联上 Apollo。

过滤器 run 方法中判断当前请求的接口是否在白名单中：如果在就直接放行，不在才进行 Token 的校验。

对于没有带 Token 或者带了 Token 但校验失败的请求，直接将校验结果返回；校验通过则取出 Token 中的用户 ID，添加到请求头中向后端服务进行传递。

### 用户信息全局透传

网关验证通过、用户 ID 获取之后，这只是网关中的逻辑。一个请求会转发到后端的 N 个服务上，这些服务同样需要知道当前登录的用户是谁，因此需要将用户信息进行全局传递。

实现方式：在 core 模块中定义一个用于接收用户 ID 信息的 HttpHeaderParamFilter，在过滤器中接收然后存到 ThreadLocal 中。为了让代码复用，该过滤器定义在 core 模块中，要用的项目只要依赖 core 模块，然后配置启用这个过滤器即可。

core 中的配置逻辑也已写好，通过 @ConditionalOnProperty 来控制是否启用，只要在使用的项目中配置了 user.info.enabled=true 即可启用。

启用后就可以直接从 ThreadLocal 中获取用户信息。需要注意：如果使用了 Hystrix 的线程隔离模式，ThreadLocal 会失效，对应的并发解决方案也在 core 中进行了配置，同样通过配置文件启用。

然后将用户信息传递到其他的服务中。一般有两种调用方式：Feign 和 RestTemplate。core 中定义了两个拦截器，分别处理不同调用方式的用户信息传递。同样采用配置的方式启用，其中 Feign 拦截器的配置采用 @ConditionalOnClass 来判断当前 classpath 中是否有指定的类——因为有的项目依赖了 core 但不使用 Feign（没有 Feign 的依赖），如果不加判断就会报错，网关项目就是这种情况。

### 服务灰度发布

灰度发布的集成也在 core 中，灰度功能是所有服务都要用的。主要是 2 个策略：一个是 Zuul 中的，针对网关的处理；一个是普通服务的处理。同样可以通过配置的方式启用。对于 discovery 的 Maven 依赖，Eureka、Apollo、Hystrix 三个通用的默认依赖；Zuul 和 service 需要依赖方自行指定，用于处理 Zuul 和普通 service 的区别。

### 调用链集成

调用链没有特殊的代码，只需要配置 sleuth 和 Zipkin 的 Maven 依赖，然后配置好 Zipkin 的服务端地址。案例中使用 HTTP 方式的传输，如果要换成 RabbitMQ，修改相应配置即可。

Zipkin server 的 jar 需自行到官网下载，案例中不提供。

### Apollo 集成

Apollo 的集成只需要在配置文件中指定 appid 和 metaserver 地址，案例中使用官方提供的演示地址。为了方便运行本案例，目前所有的配置还保留在项目中，运行时可将项目中的配置信息移动到 Apollo 中。

## 演示

演示案例效果：将 Eureka、zuul、webpage、article-provider、user-provider 启动，访问 webpage，进行登录，登录成功后跳转到文章详情页面，获取到文章的信息。右上角退出登录的按钮用于注销。

## 小结

本案例综合运用了前文介绍的各 Spring Cloud 组件：Eureka 注册中心、Zuul 网关（白名单验证 + Token 校验 + 用户 ID 透传）、Feign 服务调用、Hystrix（含 dashboard 监控与线程隔离下 ThreadLocal 失效的应对）、Apollo 配置中心（白名单动态生效）、Sleuth + Zipkin 调用链集成、灰度发布策略（core 模块统一沉淀、配置化启用），并以 webpage 模拟前端完成登录、注销、查询文章三个业务闭环。

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
