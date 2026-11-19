---
title: "负载均衡：如何使用 Ribbon 实现客户端负载均衡？"
description: "Ribbon 客户端负载均衡的两种用法：DiscoveryClient+RestTemplate 手动获取实例并调用，以及 @LoadBalanced/@RibbonClient 注解自动负载均衡与自定义负载均衡策略（RandomRule）。"
keywords: [负载均衡, 如何使用, Ribbon, 实现客户端负载均衡]
category: "Java"
tags: [Java, SpringCloud原理与实战]
---
# 负载均衡：如何使用 Ribbon 实现客户端负载均衡？

> ⚠️ **组件状态说明**：Ribbon 已由 Netflix 官方宣布停止维护（Netflix 已将其转入归档状态，Spring Cloud 自 2020.0 版本起移除 Ribbon，以 Spring Cloud LoadBalancer 全面替代）。本文保留其原理讲解价值（客户端负载均衡的使用模式与策略配置思想并未过时），生产选型请参考 [Spring Cloud LoadBalancer 官方文档](https://docs.spring.io/spring-cloud-commons/reference/spring-cloud-commons/loadbalancer.html)（文中组件对照见尾部版本差异表）。

在服务治理技术体系中，服务的发现和调用往往与**负载均衡**这个概念结合在一起。Spring Cloud 中存在着与 Eureka 配套的负载均衡器，这就是 Ribbon 组件。

## 概念说明：Ribbon 与 DiscoveryClient

### Ribbon 的核心功能

Ribbon 组件同样来自 Netflix，它的定位是一款用于提供客户端负载均衡的工具软件。Ribbon 会自动地基于某种内置的负载均衡算法去连接服务实例，也支持设计并实现自定义的负载均衡算法并嵌入 Ribbon 中。同时，Ribbon 客户端组件提供了一系列完善的辅助机制用来确保服务调用过程的可靠性和容错性，包括连接超时和重试等。Ribbon 是客户端负载均衡机制的典型实现方案，需要嵌入在服务消费者的内部进行使用。

Netflix Ribbon 本质上只是一个工具，而不是一套完整的解决方案，所以 Spring Cloud Netflix Ribbon 对 Netflix Ribbon 做了封装和集成，使其可以融入以 Spring Boot 为构建基础的技术体系中。基于 Spring Cloud Netflix Ribbon，通过注解就能简单实现在面向服务的接口调用中自动集成负载均衡功能，使用方式主要包括以下两种：

- **使用 @LoadBalanced 注解。**

@LoadBalanced 注解用于修饰发起 HTTP 请求的 RestTemplate 工具类，并在该工具类中自动嵌入客户端负载均衡功能。开发人员不需要针对负载均衡做任何特殊的开发或配置。

- **使用 @RibbonClient 注解。**

@RibbonClient 注解允许完全控制客户端负载均衡行为。这在需要定制化负载均衡算法等特定场景下非常有用，可以实现更细粒度的负载均衡配置。

### 使用 DiscoveryClient 获取服务实例信息

Eureka 提供了获取服务详细信息的 HTTP 端点。基于这一点，假如没有 Ribbon 这样的负载均衡工具，也可以通过代码在运行时实时获取注册中心中的服务列表，并通过服务定义并结合各种负载均衡策略动态发起服务调用。

根据服务名称获取 Eureka 中的服务实例信息，通过 DiscoveryClient 很容易实现。

首先获取当前注册到 Eureka 中的服务名称全量列表，如下所示：

```java
List<String> serviceNames = discoveryClient.getServices();
```

基于这个服务名称列表可以获取所有感兴趣的服务，并进一步获取这些服务的实例信息：

```java
List<ServiceInstance> serviceInstances = discoveryClient.getInstances(serviceName);
```

ServiceInstance 对象代表服务实例，包含了很多有用的信息，定义如下：

```java
public interface ServiceInstance {
    //服务实例的唯一性 Id
    String getServiceId();
    //主机
    String getHost();
	//端口
    int getPort();
	//URI
    URI getUri();
	//元数据
    Map<String, String> getMetadata();
    //其他方法从略
}
```

显然，一旦获取了一个 ServiceInstance 列表，就可以基于常见的随机、轮询等算法来实现客户端负载均衡，也可以基于服务的 URI 信息等实现各种定制化的路由机制。一旦确定负载均衡的最终目标服务，就可以使用 HTTP 工具类来根据服务的地址信息发起远程调用。

在 Spring 的世界中，访问 HTTP 端点最常见的方法就是使用 RestTemplate 工具类。在演示 RestTemplate 的使用方法之前，先在 SpringHealth 案例的 user-service 添加一个 HTTP 端点，如下所示：

```java
@RestController
@RequestMapping(value = "users")
public class UserController {

    @RequestMapping(value = "/{userName}", method = RequestMethod.GET)
    public User getUserByUserName(@PathVariable("userName") String userName) {
        User user = new User();
        user.setId(001L);
        user.setUserCode("mockUser");
        user.setUserName(userName);
        return user;
    }
}
```

这是一个典型的 Controller 类，构建了一个“users/userName”端点用于根据用户名获取用户详细信息。为了演示简单，这里使用硬编码构造了一个 User 对象并返回。

然后构建一个测试类来访问这个 HTTP 端点。如果能够获取注册中心中的服务定义，就可以通过 ServiceInstance 对该服务进行调用，如下所示：

```java
@Autowired
RestTemplate restTemplate;

@Autowired
private DiscoveryClient discoveryClient;

public User getUserByUserName(String userName) {
        List<ServiceInstance> instances = discoveryClient.getInstances("userservice");

if (instances.size()==0)
         return null;

String userserviceUri = String.format("%s/users/%s",instances.get(0).getUri()
	.toString(),userName);

ResponseEntity<User> user =
            restTemplate.exchange(userserviceUri, HttpMethod.GET, null, User.class, userName);

        return user.getBody();
}
```

可以看到，这里通过 RestTemplate 工具类就可以使用 ServiceInstance 中的 URL 轻松实现 HTTP 请求。在上面的示例代码中，通过 instances.get(0) 方法获取的是服务列表中的第一个服务，然后使用 RestTemplate 的 exchange() 方法封装整个 HTTP 请求调用过程并获取结果。

## 代码示例：通过 @LoadBalanced 注解调用服务

掌握 RestTemplate 的使用方法之后，在 Spring Cloud 中基于 Ribbon 来实现负载均衡非常简单，要做的事情就是在 RestTemplate 上添加一个注解。

继续使用前文的 user-service 进行演示。因为涉及负载均衡，所以首先需要运行至少两个 user-service 服务实例。另一方面，为了显示负载均衡环境下的调用结果，可在 UserController 中添加日志方便在运行时观察控制台输出信息。重构后的 UserController 的代码如下所示。

```java
@RestController
@RequestMapping(value = "users")
public class UserController {

private static final Logger logger = LoggerFactory.getLogger(UserController.class);

@Autowired
    private HttpServletRequest request;

@RequestMapping(value = "/{userName}", method = RequestMethod.GET)
    public User getUserByUserName(@PathVariable("userName") String userName) {

	logger.info("Get user by userName from port : {} of userservice instance", request.getServerPort());

        User user = new User();
        user.setId(001L);
        user.setUserCode("mockUser");
        user.setUserName(userName);
        return user;
    }
}
```

分别用 8082 和 8083 端口来启动两个 user-service 服务实例，并将它们注册到 Eureka 中，Eureka 监控页面上即可看到这两个实例。


准备工作就绪之后，构建 SpringHealth 案例系统的第二个业务微服务。**intervention-service 会访问 user-service 以便生成健康干预信息**（案例背景见“案例驱动：如何通过实战案例来学习 Spring Cloud 框架？”）。对于 user-service 而言，intervention-service 就是它的客户端。在 intervention-service 的启动类 InterventionApplication 中，通过 @LoadBalanced 注解创建 RestTemplate。现在的 InterventionApplication 类代码如下所示：

```java
@SpringBootApplication
@EnableEurekaClient
public class InterventionApplication {

@LoadBalanced
    @Bean
    public RestTemplate getRestTemplate(){
        return new RestTemplate();
    }

    public static void main(String[] args) {
        SpringApplication.run(InterventionApplication.class, args);
    }
}
```

对于 intervention-service 而言准备工作已经就绪，接下来就可以编写访问 user-service 的远程调用代码。在 intervention-service 工程中添加一个新的 UserServiceClient 类并添加以下代码：

```java
@Component
public class UserServiceClient {

@Autowired
	RestTemplate restTemplate;

public UserMapper getUserByUserName(String userName){

ResponseEntity<UserMapper> restExchange =
                restTemplate.exchange(
                        "http://userservice/users/{userName}",
                        HttpMethod.GET,
                        null, UserMapper.class, userName);

UserMapper user = restExchange.getBody();

        return user;
    }
}
```

以上代码就是注入 RestTemplate，然后通过 RestTemplate 的 exchange() 方法对 user-service 进行远程调用。但是请注意，这里的 RestTemplate 已经具备了客户端负载均衡功能，因为在 InterventionApplication 类中创建该 RestTemplate 时添加了 @LoadBalanced 注解。同样请注意，URL “http://userservice/users/{userName}” 中的 “userservice”是在 user-service 中配置的服务名称，也就是在注册中心中存在的名称。至于这里的 UserMapper 类，只是一个数据传输对象，用于完成序列化操作。

为了验证客户端负载均衡功能是否已经生效，可注入这个 UserServiceClient 类并调用 getUserByUserName 方法来对远程调用进行测试。如果多次执行这个方法，那么在两个 user-service 的服务实例中将交替看到如下日志，这意味着负载均衡已经发生效果：

```log
INFO [userservice,,] 6148 --- [nio-8081-exec-5] c.t.p.controllers. UserController : Get user by userName from 8082 port of userservice instance

INFO [userservice,,] 6148 --- [nio-8081-exec-5] c.t.p.controllers. UserController: Get user by userName from 8083 port of userservice instance
```

## 原理与机制：通过 @RibbonClient 注解自定义负载均衡策略

在基于 @LoadBalanced 注解执行负载均衡时，采用的是 Ribbon 内置的负载均衡机制。默认情况下，Ribbon 使用的是轮询策略，开发人员无法控制具体生效的是哪种负载均衡算法。但在有些场景下，需要对负载均衡这一过程进行更加精细化的控制，这时候就可以用到 @RibbonClient 注解。Spring Cloud Netflix Ribbon 提供 @RibbonClient 注解的目的在于通过该注解声明自定义配置，从而完全控制客户端负载均衡行为。@RibbonClient 注解的定义如下：

```java
public @interface RibbonClient {
    //同下面的 name 属性
    String value() default "";
    //指定服务名称
    String name() default "";
	//指定负载均衡配置类
    Class<?>[] configuration() default {};
}
```

使用 @RibbonClient 注解时，通常需要指定目标服务名称以及负载均衡配置类。为此需要创建一个独立的配置类，用来指定具体的负载均衡规则。以下代码演示的就是一个自定义的配置类 SpringHealthLoadBalanceConfig：

```java
@Configuration
public class SpringHealthLoadBalanceConfig{

@Autowired
    IClientConfig config;

@Bean
    @ConditionalOnMissingBean
    public IRule springHealthRule(IClientConfig config) {

        return new RandomRule();
    }
}
```

有了这个 SpringHealthLoadBalanceConfig 之后，就可以在调用特定服务时使用该配置类，从而对客户端负载均衡实现细粒度的控制。在 intervention-service 中使用 SpringHealthLoadBalanceConfig 实现对 user-service 访问的示例代码如下所示：

```java
@SpringBootApplication
@EnableEurekaClient
@RibbonClient(name = "userservice", configuration = SpringHealthLoadBalanceConfig.class)
public class InterventionApplication{

@Bean
    @LoadBalanced
    public RestTemplate restTemplate(){
        return new RestTemplate();
    }

    public static void main(String[] args) {
        SpringApplication.run(InterventionApplication.class, args);
    }
}
```

可以注意到，@RibbonClient 中设置了目标服务名称为 userservice，配置类为 SpringHealthLoadBalanceConfig。此时每次访问 user-service 时将使用 RandomRule 这一随机负载均衡策略。

对比 @LoadBalanced 注解和 @RibbonClient 注解：如果使用的是普通的负载均衡场景，那么通常只需要 @LoadBalanced 注解就能完成客户端负载均衡；而如果要对 Ribbon 运行时行为进行定制化处理，就可以使用 @RibbonClient 注解。

## 实践要点

- 客户端负载均衡器嵌入在服务消费者内部，服务列表来自注册中心，选择实例的过程发生在调用方，这是它与服务器端负载均衡的本质区别。
- RestTemplate 的调用 URL 中直接写注册中心中的服务名（如 `http://userservice/users/{userName}`），由 Ribbon 负责解析为真实实例地址。
- 验证负载均衡是否生效的简单方法：运行多个服务实例并在端点中输出端口信息，多次调用后观察日志交替出现。
- 普通 @LoadBalanced 场景使用默认轮询策略即可；需要定制算法（如 RandomRule）时，通过 @RibbonClient 的 configuration 属性指定独立的配置类，实现按服务粒度的策略控制。
- 自定义负载均衡配置类中，IRule Bean 通常配合 @ConditionalOnMissingBean 注解，避免覆盖全局默认配置。

## 小结

在微服务架构中，每个服务都存在多个运行时实例，所以负载均衡是服务治理的必备组件。Ribbon 是一款典型的客户端负载均衡工具，在与 Eureka 无缝集成的同时，也给开发人员提供了非常友好的使用方式：既可以通过 DiscoveryClient 手动获取实例列表并基于 RestTemplate 自行实现负载均衡调用，也可以使用内嵌了负载均衡机制的 @LoadBalanced 注解完成远程调用，还可以使用 @RibbonClient 注解实现自定义的负载均衡策略。

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
