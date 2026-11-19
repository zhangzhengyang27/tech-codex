---
title: "熔断之器：如何使用 Spring Cloud Circuit Breaker 实现服务容错？（上）"
description: "基于 @SpringCloudApplication 与 spring-cloud-starter-netflix-hystrix 引入 Hystrix，使用 HystrixCommand/@HystrixCommand 实现线程池隔离、熔断（超时与阈值配置）和服务回退（fallbackMethod）。"
keywords: [熔断之器, 如何使用, Spring, Cloud, Circuit, Breaker]
category: "Java"
tags: [Java, SpringCloud原理与实战]
---
# 熔断之器：如何使用 Spring Cloud Circuit Breaker 实现服务容错？（上）

> ⚠️ **组件状态说明**：Hystrix 已由 Netflix 官方宣布停止维护（进入维护模式，仅存量修复，Spring Cloud 自 2020.0 版本起移除对其支持）。本文保留其原理讲解价值（线程隔离、熔断与服务回退的核心机制并未过时），生产选型请参考 [Sentinel](<../05-SpringCloudAlibaba实战/11-限流与熔断：Sentinel 在项目中的最佳实践.md>)、Resilience4j 等现代替代方案（文中组件对照见尾部版本差异表）。

## 概述

在微服务架构中实现服务容错，需要依赖专门的服务容错框架。Spring Cloud 中承担这一职责的是 Spring Cloud Circuit Breaker。它是一个集成性的框架，内部整合了 Netflix Hystrix、Resilience4j、Sentinel 和 Spring Retry 这四款独立的熔断器组件。本文不逐一展开四款组件，而是聚焦于 Netflix 旗下的 Hystrix（受 Hystrix 启发而诞生的 Resilience4j 将在后文讨论）。

Hystrix 是一个非常经典而完善的服务容错开发框架，同时支持服务隔离、服务熔断和服务回退三种容错机制。

## 引入 Hystrix

### 添加依赖

在微服务中添加对 Netflix Hystrix 的支持，首先需要在 Maven 中添加 spring-cloud-starter-netflix-hystrix 的依赖：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-starter-netflix-hystrix</artifactId>
</dependency>
```

### @SpringCloudApplication 组合注解

在微服务架构中，服务调用之间势必需要**引入熔断器机制**，**确保服务容错**。为此，Spring Cloud 推出了一个全新的注解 @SpringCloudApplication，用来集成服务治理和服务熔断方面的核心功能。该注解定义如下所示。

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@SpringBootApplication
@EnableDiscoveryClient
@EnableCircuitBreaker
public @interface SpringCloudApplication {
}
```

@SpringCloudApplication 是一个组合注解，整合了 @SpringBootApplication、@EnableDiscoveryClient 和 @EnableCircuitBreaker 这三个微服务所需的核心注解，可以直接使用该注解来简化代码。业务服务的 Bootstrap 类即可使用该注解定义，以 intervention-service 为例：

```java
@SpringCloudApplication
public class InterventionApplication {
}
```

### HystrixCommand 核心类

Hystrix 中最核心的是 **HystrixCommand 类**。HystrixCommand 是一个抽象类，只包含一个抽象方法，即如下所示的 run 方法：

```java
protected abstract R run() throws Exception;
```

run 方法承载开发人员实现服务容错所需要处理的业务逻辑。在微服务架构中，通常在这个 run 方法中添加对远程服务的访问代码。

HystrixCommand 类中还提供了另一个很有用的方法 getFallback，用于在 HystrixCommand 子类中设置服务回退函数的具体实现：

```java
protected R getFallback() {

    throw new UnsupportedOperationException("No fallback available.");
}
```

## 使用 Hystrix 实现服务隔离

### 机制说明

针对服务隔离，Hystrix 组件在提供线程池隔离机制的同时，还实现了**信号量隔离**。以下基于最常用的线程池隔离进行介绍。实现方式有两种：创建 HystrixCommand 子类，或使用 @HystrixCommand 注解。

### 方式一：HystrixCommand 子类

提供 HystrixCommand 类的子类即可实现服务隔离，典型的子类代码风格如下所示：

```java
public class GetUserCommand extends HystrixCommand<UserMapper> {

//远程调用 user-service 的客户端工具类
    private UserServiceClient userServiceClient;

protected GetUserCommand(String name) {
        super(Setter.withGroupKey(
            //设置命令组
            HystrixCommandGroupKey.Factory.asKey("springHealthGroup"))
                //设置命令键
                .andCommandKey(HystrixCommandKey.Factory.asKey("interventionKey"))
                //设置线程池键
                .andThreadPoolKey(HystrixThreadPoolKey.Factory.asKey(name))
                //设置命令属性
                .andCommandPropertiesDefaults(
                    HystrixCommandProperties.Setter()
                        .withExecutionTimeoutInMilliseconds(5000))
                //设置线程池属性
                .andThreadPoolPropertiesDefaults(
                    HystrixThreadPoolProperties.Setter()
                        .withMaxQueueSize(10)
                        .withCoreSize(2))
        );
    }

@Override
    protected UserMapper run() throws Exception {
        return userServiceClient.getUserByUserName("springhealth_user1");
    }

    @Override
    protected UserMapper getFallback() {
        return new UserMapper(1L,"user1","springhealth_user1");
    }
}
```

上述代码使用了 Hystrix 中许多常见的配置项，这些配置项大多涉及线程池隔离的相关概念。从控制粒度上讲，开发人员可以从服务分组和服务本身这两个维度出发，对线程隔离机制进行配置：既可以把一批服务都划分到一个线程池中，也可以把单个服务划分到一个线程池中。上述代码中的 HystrixCommandGroupKey 和 HystrixCommandKey 分别用来配置**服务分组名称**和**服务名称**，HystrixThreadPoolKey 用来配置**线程池**的名称。

设置分组、服务以及线程池名称后，还需要指定与线程池相关的各个属性，这些属性都包含在 HystrixThreadPoolProperties 中。例如上述代码使用 maxQueueSize 配置线程池队列的最大值，使用 coreSize 配置核心线程池的最大值；同时可以使用 withExecutionTimeoutInMilliseconds 配置项指定请求的超时时间。

### 方式二：@HystrixCommand 注解（推荐）

HystrixCommand 子类有助于理解线程池隔离的实现机制，但日常开发中一般不推荐这种方式，而是推荐使用更为简单的 @HystrixCommand 注解。该注解是 Hystrix 为简化开发过程而专门提供的，定义如下：

```java
public @interface HystrixCommand {

    String groupKey() default "";
    String commandKey() default "";
    String threadPoolKey() default "";
    String fallbackMethod() default "";
    HystrixProperty[] commandProperties() default {};
    HystrixProperty[] threadPoolProperties() default {};
    Class<? extends Throwable>[] ignoreExceptions() default {};
    ObservableExecutionMode observableExecutionMode() default ObservableExecutionMode.EAGER;
    HystrixException[] raiseHystrixExceptions() default {};
    String defaultFallback() default "";
}
```

注解定义中包含用于设置分组、服务与线程池名称相关的 groupKey、commandKey 和 threadPoolKey 方法，以及与线程池属性相关的 threadPoolProperties 对象。回到案例，使用 @HystrixCommand 注解进行重构，效果如下：

```java
@HystrixCommand
private UserMapper getUser(String userName) {

    return userClient.getUserByUserName(userName);
}
```

只使用 @HystrixCommand 注解就完成了 HystrixCommand 的创建。还可以进一步使用 @HystrixProperty 注解来设置所需的各项属性：

```java
@HystrixCommand(threadPoolKey = "springHealthGroup",
    threadPoolProperties =
     {
         @HystrixProperty(name="coreSize",value="2"),
         @HystrixProperty(name="maxQueueSize",value="10")
     }
)
private UserMapper getUser(String userName) {

    return userClient.getUserByUserName(userName);
}
```

上述代码为该 HystrixCommand 设置了 threadPoolKey，并通过 threadPoolProperties 设置了 coreSize 和 maxQueueSize。

## 使用 Hystrix 实现服务熔断

### 机制说明

熔断器有三个状态，其中**打开**和**半打开状态**会导致**触发熔断机制**。下面结合案例系统中服务依赖调用的具体场景讨论服务熔断，该场景是服务隔离部分的延伸。在 SpringHealth 案例中，intervention-service 需要调用 user-service 和 device-service 来生成健康干预记录，该操作的代码流程如下所示：

```java
public Intervention generateIntervention(String userName, String deviceCode) {
        logger.debug("Generate intervention record with user: {} from device: {}", userName, deviceCode);

Intervention intervention = new Intervention();

//获取远程 User 信息
        UserMapper user = getUser(userName);
        if (user == null) {
            return intervention;
        }
        logger.debug("Get remote user: {} is successful", userName);

//获取远程 Device 信息
        DeviceMapper device = getDevice(deviceCode);
        if (device == null) {
            return intervention;
        }
        logger.debug("Get remote device: {} is successful", deviceCode);

//创建并保存 Intervention 信息
        intervention.setUserId(user.getId());
        intervention.setDeviceId(device.getId());
        intervention.setHealthData(device.getHealthData());
        intervention.setIntervention("InterventionForDemo");
        intervention.setCreateTime(new Date());

interventionRepository.save(intervention);

        return intervention;
}
```

上述代码中的 getUser() 方法和 getDevice() 方法都会涉及微服务之间的相互依赖和调用，示例代码如下所示：

```java
@Autowired
private UserServiceClient userClient;

@Autowired
private DeviceServiceClient deviceClient;

@HystrixCommand
private UserMapper getUser(String userName) {
    return userClient.getUserByUserName(userName);
}

@HystrixCommand
private DeviceMapper getDevice(String deviceCode) {
    return deviceClient.getDevice(deviceCode);
}
```

这里通过注入 UserServiceClient 和 DeviceServiceClient 两个工具类来实现远程调用，这两个工具类都使用了 Ribbon 和 RestTemplate 来实现调用过程的客户端负载均衡，相关内容见《负载均衡：如何使用 Ribbon 实现客户端负载均衡？》。

在微服务环境下，使用 UserServiceClient 和 DeviceServiceClient 的调用过程可能会出现响应超时等问题，此时 intervention-service 作为服务消费者需要做到服务容错。嵌入 Hystrix 提供的熔断机制只需在这两个方法上添加 @HystrixCommand 注解，前面代码已给出相应示例。

### 超时触发熔断

下面模拟远程调用超时的场景：调整 getDevice() 方法的代码，通过 Thread.sleep(2000) 模拟响应时间过长。

```java
@HystrixCommand
private DeviceMapper getDevice(String deviceCode) {

try {
            Thread.sleep(2000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }

        return deviceClient.getDevice(deviceCode);
}
```

再创建一个用于访问 InterventionService 并生成 Intervention 记录的端点：

```java
@RestController
@RequestMapping(value="interventions")
public class InterventionController {
    @Autowired
    private InterventionService interventionService;

@RequestMapping(value = "/{userName}/{deviceCode}", method = RequestMethod.POST)
    public Intervention generateIntervention( @PathVariable("userName") String userName,
            @PathVariable("deviceCode") String deviceCode) {
        Intervention intervention = interventionService.generateIntervention(userName, deviceCode);

        return intervention;
    }
}
```

访问该端点：

```xml
http://localhost:8083/interventions/springhealth_user1/device_blood
```

首先，intervention-service 的控制台中会看到 "java.lang.InterruptedException: sleep interrupted" 异常被抛出，而抛出该异常的来源正是 Hystrix。

然后查看端点调用的返回值：

```xml
{
     "timestamp":"1601881721343",
     "status":500,
     "error":"Internal Server Error",
     "exception":"com.netflix.hystrix.exception.HystrixRuntimeException",
     "message":"generate Intervention time-out and fallback failed.",
     "path":"/interventions/springhealth_user1/device_blood"
 }
```

HTTP 响应状态为 500，抛出的异常为 HystrixRuntimeException，从异常信息可以看出引起该异常的原因是超时。默认情况下，添加了 @HystrixCommand 注解的方法调用超过 1000 毫秒就会触发超时异常，上例中设置的 2000 毫秒满足触发条件。

### 熔断阈值配置

与设置线程池属性一样，在 HystrixCommand 中可以对熔断的超时时间、失败率等各项阈值进行设置。例如可以在 getDevice() 方法上添加如下配置项以改变 Hystrix 的默认行为：

```java
@HystrixCommand(commandProperties = {
            @HystrixProperty(name = "execution.isolation.thread.timeoutInMilliseconds", value = "3000")
})
private DeviceMapper getDevice(String deviceCode)
```

execution.isolation.thread.timeoutInMilliseconds 配置项用来设置 Hystrix 的超时时间，上述示例将其设置成 3000 毫秒。此时再次访问 [http://localhost:8083/interventions/springhealth_user1/device_blood](http://localhost:8083/interventions/springhealth_user1/device_blood) 端点，请求就会正常返回。

Hystrix 还提供了一系列配置项来细化对熔断器的控制，常见的配置项如下所示：

```java
@HystrixCommand(commandProperties = {
            @HystrixProperty(name = "execution.isolation.thread.timeoutInMilliseconds", value = "12000"),
            //一个滑动窗口内最小的请求数
            @HystrixProperty(name = "circuitBreaker.requestVolumeThreshold", value = "10"),
            //错误比率阈值
            @HystrixProperty(name = "circuitBreaker.errorThresholdPercentage", value = "75"),
            //触发熔断的时间值
            @HystrixProperty(name = "circuitBreaker.sleepWindowInMilliseconds", value = "7000"),
            //一个滑动窗口的时间长度
            @HystrixProperty(name = "metrics.rollingStats.timeInMilliseconds", value = "15000"),
            //一个滑动窗口被划分的数量
            @HystrixProperty(name = "metrics.rollingStats.numBuckets", value = "5") })
```

这些配置项的作用将在介绍 Hystrix 熔断器实现原理和滑动窗口机制时进一步展开。

## 使用 Hystrix 实现服务回退

### 机制说明

Hystrix 在服务调用失败时都可以执行服务回退逻辑。开发时只需提供一个 Fallback 方法实现并进行配置。对于 intervention-service 中访问 user-service 和 device-service 这两个远程调用场景，都可以实现 Fallback 方法。唯一需要注意的是：Fallback 方法的参数和返回值必须与真实方法完全一致。Fallback 方法的示例：

```java
private UserMapper getUserFallback(String userName) {

UserMapper fallbackUser = new UserMapper(0L,"no_user","not_existed_user");

        return fallbackUser;
}
```

这里通过构建一个不存在的 User 信息来返回 Fallback 结果。有了 Fallback 方法，接下来只需在 @HystrixCommand 注解中设置 "fallbackMethod" 配置项。重构后的 getUser 方法如下所示：

```java
@HystrixCommand(threadPoolKey = "springHealthGroup",
    threadPoolProperties =
         {
             @HystrixProperty(name="coreSize",value="2"),
             @HystrixProperty(name="maxQueueSize",value="10")
         },
         fallbackMethod = "getUserFallback"
)
private UserMapper getUser(String userName) {

        return userClient.getUserByUserName(userName);
}
```

验证时，可模拟远程方法调用的各种异常情况，并观察该 Fallback 是否生效。

## 实践要点

- 引入 Hystrix 优先使用 spring-cloud-starter-netflix-hystrix 依赖 + @SpringCloudApplication 组合注解，一次集成服务注册与熔断能力。
- 服务隔离推荐 @HystrixCommand 注解而非 HystrixCommand 子类；HystrixCommandGroupKey/HystrixCommandKey/HystrixThreadPoolKey 分别控制分组、命令与线程池维度，可按"一批服务一个线程池"或"单服务一个线程池"划分。
- 默认超时为 1000 毫秒，可通过 execution.isolation.thread.timeoutInMilliseconds 调整；熔断触发阈值由 circuitBreaker.requestVolumeThreshold（最小请求数）、circuitBreaker.errorThresholdPercentage（错误比率）、circuitBreaker.sleepWindowInMilliseconds（触发熔断时间）及 metrics.rollingStats.*（滑动窗口）共同控制。
- Fallback 方法参数与返回值必须与原方法完全一致，通过 fallbackMethod 配置项绑定。
- Hystrix 已进入维护模式，新项目应选用 Resilience4j 或 Sentinel，但其隔离、熔断、回退机制的设计思想依然适用于现代框架。

## 小结

本文对 Hystrix 这款服务容错实现框架进行了详细讨论，并结合 SpringHealth 案例系统给出了使用该框架的示例代码。Hystrix 是服务容错领域的代表性框架，包含服务隔离、服务熔断和服务回退三大功能。其实现原理将在后文从源码级别进一步分析。

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
