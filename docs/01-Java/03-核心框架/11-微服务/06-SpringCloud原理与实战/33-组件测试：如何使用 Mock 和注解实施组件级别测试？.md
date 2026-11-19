---
title: "组件测试：如何使用 Mock 和注解实施组件级别测试？"
description: "使用 @SpringBootTest、@DataJpaTest、@WebMvcTest 与 @MockBean/MockMvc 对 Spring Boot 微服务的启动类、Repository、Service、Controller 四个层级实施组件级别测试。"
keywords: [组件测试, Mock, 注解, 组件级别测试]
category: "Java"
tags: [Java, SpringCloud原理与实战]
---
# 组件测试：如何使用 Mock 和注解实施组件级别测试？

## 概念说明

组件级别测试针对单个微服务内部的各个组件展开，涉及数据访问 Repository 层、服务构建 Service 层和提供外部端点的 Controller 层。基于常见的代码组织结构，组件测试体现为一种层次关系，即需要测试从 Repository 层到 Service 层再到 Controller 层的完整业务链路。

Mock 是一种测试策略而不是具体技术。对某一个或一些被测试对象所依赖的方法而言，编写 Mock 相对简单，只需模拟被使用的方法即可。以 intervention-service 中的 InterventionService 类为例：

```java
@Service
public class InterventionService {

    public Intervention getInterventionById(Long id) {
        …
	}
}
```

对该方法进行 Mock 通常使用 easymock、jmock 等工具包来隐式实现。例如某个被测试对象依赖 InterventionService，只需给出 getInterventionById 方法的实现即可完成隔离。

Spring Boot 内置了一个测试模块用于组件级别的测试场景，其中提供了一批非常有用的注解来简化测试过程。使用这些注解需引入 spring-boot-starter-test 依赖，如下所示：

```xml
<dependency>
      <groupId>org.springframework.boot</groupId>
      <artifactId>spring-boot-starter-test</artifactId>
      <scope>test</scope>
</dependency>
```

## 启动类测试：@SpringBootTest 注解

Spring Boot 程序的入口是 Bootstrap 类，Spring Boot 专门提供了 @SpringBootTest 注解来测试 Bootstrap 类，使用方法如下所示：

```java
@SpringBootTest(classes = UserApplication.class,
	webEnvironment = SpringBootTest.WebEnvironment.MOCK)
```

在 Spring Boot 中，@SpringBootTest 注解主要用于测试基于自动配置的 ApplicationContext，它允许设置测试上下文中的 Servlet 环境。在多数场景下，一个真实的 Servlet 环境对于测试而言过于重量级，因此一般通过 WebEnvironment.MOCK 环境来模拟测试环境。

对于一个 Spring Boot 应用程序而言，Bootstrap 类中的 main() 入口通过 SpringApplication.run() 方法将启动 Spring 容器。如下所示为 intervention-service 中的启动类 InterventionApplication：

```java
@SpringBootApplication
public class InterventionApplication {

    public static void main(String[] args) {
        SpringApplication.run(InterventionApplication.class, args);
    }
}
```

针对这个 Bootstrap 类，可以通过编写测试用例的方式验证 Spring 容器是否能够正常启动，该测试用例如下所示：

```java
package com.tianyalan.testing.orders;

import org.junit.Assert;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.junit4.SpringRunner;

@SpringBootTest
@RunWith(SpringRunner.class)
public class ApplicationContextTests {

@Autowired
  private ApplicationContext applicationContext;

  @Test
  public void testContextLoaded() throws Throwable {
      Assert.assertNotNull(this.applicationContext);
  }
}
```

这里用到了 @SpringBootTest 注解和 @RunWith 注解。@SpringBootTest 注解的作用如前所述；@RunWith 注解由 JUnit 框架提供，用于设置测试运行器，例如通过 @RunWith(SpringRunner.class) 可以让测试运行于 Spring 测试环境中。

testContextLoaded 方法上添加了一个 @Test 注解，该注解来自 JUnit 框架，代表该方法为一个有效的测试用例。这里测试的场景是对 Spring 中的 ApplicationContext 作非空验证。执行该测试用例，从控制台输出信息中可以看到 Spring Boot 应用程序被正常启动，同时测试用例本身也会给出执行成功的提示。

## Repository 层：@DataJpaTest 注解

验证容器正常启动之后，继续分析应用程序的其他组件层。对于 Repository 层而言，主要的交互媒介是数据库，所以 Spring Boot 专门提供了 @DataJpaTest 注解来模拟基于 JPA 规范的数据访问过程；对于 Controller 层而言，Spring Boot 也提供了 @WebMvcTest 注解来模拟 Web 交互的测试场景。

Service 层没有专门的测试注解，原因在于：Repository 层和 Controller 层组件都涉及与某一种特定技术体系的交互——Repository 层的交互对象是数据库，Controller 层的交互对象是 Web 请求，所以需要专门的测试注解；而 Service 层主要是业务代码，没有与具体某一项技术体系直接关联，测试过程中只需充分使用 Mock 机制即可。下图展示了一个业务微服务中各层的测试方法：

组件测试的层次和实现方式

下面对上述三个层次及对应的实现方法分别展开。

## Repository 层测试实践

业务微服务一般都涉及数据持久化。对 Repository 层的测试从数据持久化角度出发，使用 @DataJpaTest 注解完成。@DataJpaTest 注解会自动注入各种 Repository 类，并会初始化一个内存数据库及访问该数据库的数据源。为了演示方便，使用 h2 作为内存数据库，并通过 Mysql 实现数据持久化，因此需要引入以下 Maven 依赖。

```xml
<dependency>
       <groupId>com.h2database</groupId>
       <artifactId>h2</artifactId>
</dependency>

<dependency>
       <groupId>mysql</groupId>
       <artifactId>mysql-connector-java</artifactId>
       <scope>runtime</scope>
</dependency>
```

以 SpringHealth 案例系统中 intervention-service 的 InterventionRepository 接口为例：

```java
public interface InterventionRepository extends JpaRepository<Intervention, Long> {

List<Intervention> findInterventionsByUserId(@Param("userId") String userId);

    List<Intervention> findInterventionsByDeviceId(@Param("deviceId") String deviceId);
}
```

InterventionRepository 扩展了 Spring Data 中的 JpaRepository 接口。针对该接口的测试用例如下所示：

```java
@RunWith(SpringRunner.class)
@DataJpaTest
public class InterventionRepositoryTest {

@Autowired
    private TestEntityManager entityManager;

@Autowired
    private InterventionRepository interventionRepository;

@Test
    public void testFindInterventionByUserId() throws Exception {
        this.entityManager.persist(new Intervention(1L, 1L, 100F, "Intervention1", new Date()));
        this.entityManager.persist(new Intervention(1L, 2L, 200F, "Intervention2", new Date()));

Long userId = 1L;
        List<Intervention> interventions = this.interventionRepository.findInterventionsByUserId(userId);
        assertThat(intervations).size().isEqualTo(2);
        Intervention actual = interventions.get(0);
        assertThat(actual.getUserId()).isEqualTo(userId);
    }

@Test
    public void testFindInterventionByNonExistedUserId() throws Exception {
        this.entityManager.persist(new Intervention(1L, 1L, 100F, "Intervention1", new Date()));
        this.entityManager.persist(new Intervention(1L, 2L, 200F, "Intervention2", new Date()));

        Long userId = 3L;
        List<Intervention> interventions = this.interventionRepository.findInterventionsByUserId(userId);
        assertThat(interventions).size().isEqualTo(0);
    }
}
```

这里使用了 @DataJpaTest 完成 InterventionRepository 的注入。另一个核心测试组件是 TestEntityManager，该类内部定义了一个 EntityManagerFactory 变量，而 EntityManagerFactory 能够构建数据持久化操作所需要的 EntityManager 对象。TestEntityManager 的效果相当于不使用真正的 InterventionRepository 来完成数据的持久化，从而提供了一种数据与环境之间的隔离机制。TestEntityManager 中包含的方法可参考官方文档进一步了解。

基于 InterventionRepository 中的方法定义以及初始化的数据，以上测试用例的结果显而易见。执行这些单元测试并观察控制台的日志输出，可以从日志中看到各种 SQL 语句的执行效果。

## Service 层：Mock

前面介绍的 @SpringBootTest 注解中的 SpringBootTest.WebEnvironment.MOCK 选项用于加载 WebApplicationContext 并提供一个 Mock 的 Servlet 环境，内置的 Servlet 容器并没有真实启动。下面针对 Service 层演示这种测试方式。

InterventionService 类的 generateIntervention 方法是其最核心的方法，涉及对 user-service 和 device-service 的远程调用：

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

以上代码中的 getUser 方法和 getDevice 方法涉及远程访问。以 getUser 方法为例，它基于 UserServiceClient 发送 HTTP 请求，该类的实现如下：

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

对于测试而言，InterventionService 类不需要关注 UserServiceClient 中如何实现远程访问的具体过程，因为测试过程只需关注方法调用返回的结果。所以对 UserServiceClient 以及 DeviceServiceClient 采用 Mock 机制完成隔离。针对 InterventionService 的测试用例代码如下所示：

```java
@RunWith(SpringRunner.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
public class InterventionServiceTests {

@MockBean
    private UserServiceClient userClient;

@MockBean
    private DeviceServiceClient deviceClient;

@MockBean
    private InterventionRepository interventionRepository;

@Autowired
    private InterventionService interventionService;

@Test
    public void testGenerateIntervention() throws Exception {
        String userName = "springhealth_user1";
        String deviceCode = "device1";

given(this.userClient.getUserByUserName(userName))
            .willReturn(new UserMapper(1L, "user1", userName));
        given(this.deviceClient.getDevice(deviceCode))
            .willReturn(new DeviceMapper(1L, "便携式血压计", "device1", "Sphygmomanometer", 100F));

Intervention actual = interventionService.generateIntervention(userName, deviceCode);

        assertThat(actual.getHealthData()).isEqualTo(100L);
    }
}
```

这里基于 mockito 对 UserServiceClient 和 DeviceServiceClient 这两个远程访问类的返回结果做了模拟。上述测试用例演示了在 Service 层中进行集成测试的各种手段，这些手段已经能够满足一般场景的需要。

## Controller 层：@WebMvcTest 注解

对 intervention-service 中 InterventionController 的测试方式如下。InterventionController 类的功能非常简单，基本都是对 InterventionService 的直接封装，代码如下所示：

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

@RequestMapping(value = "/{id}", method = RequestMethod.GET)
    public Intervention getIntervention(@PathVariable Long id) {
        Intervention intervention = interventionService.getInterventionById(id);

     return intervention;
    }
}
```

@WebMvcTest 注解将初始化测试 Controller 所必需的 Spring MVC 基础设施。InterventionController 类的测试用例如下所示：

```java
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@RunWith(SpringRunner.class)
@WebMvcTest(InterventionController.class)
public class InterventionControllerTests {

@Autowired
    private MockMvc mvc;

@MockBean
    private InterventionService interventionService;

@Test
    public void testGenerateIntervention() throws Exception {
        String userName = "springhealth_user1";
        String deviceCode = "device1";
        Intervention intervention = new Intervention(100L, 1L, 1L, 100F, "Intervention1", new Date());

given(this.interventionService.generateIntervention(userName, deviceCode))
                .willReturn(intervention);

        this.mvc.perform(post("/interventions/" + userName+ "/" + deviceCode).accept(MediaType.APPLICATION_JSON)).andExpect(status().isOk());
    }
}
```

以上代码的关键是 MockMvc 工具类。MockMvc 类提供了一系列基础方法来满足对 Controller 层组件的测试需求：首先通过 MockMvc 类中的一组 get/post/put/delete 方法声明发送 HTTP 请求的方式并初始化一个 HTTP 请求；然后使用 param 方法为该请求添加参数；请求构建完成后，perform 方法负责执行请求，并自动将请求映射到相应的 Controller 进行处理；执行完请求之后进入验证阶段，使用 andExpect、andDo 和 andReturn 等方法对返回的数据进行判断，验证 HTTP 请求执行结果是否正确。

执行该测试用例，从控制台日志中可以看到，整个流程相当于启动了 InterventionController 并执行远程访问，而 InterventionController 中所用到的 InterventionService 则做了 Mock。测试 InterventionController 的目的在于验证请求是否成功发送和返回，因此通过 perform、accept 和 andExpect 方法最终模拟 HTTP 请求的整个过程并验证结果的正确性。

## 实践要点

- 测试 Repository 层使用 @DataJpaTest + TestEntityManager：前者自动注入 Repository 并初始化内存数据库，后者提供数据与环境之间的隔离机制。
- Service 层没有专属测试注解，通过 @SpringBootTest(MOCK 环境) + @MockBean 隔离远程访问类（如 UserServiceClient、DeviceServiceClient）与 Repository 依赖，基于 Mockito 的 given/willReturn 模拟返回结果。
- 测试 Controller 层使用 @WebMvcTest + MockMvc：get/post/put/delete 初始化请求，param 添加参数，perform 执行请求，andExpect/andDo/andReturn 验证结果。
- 对所依赖组件的行为进行模拟，统一使用 @MockBean 注入 Mock 对象替换容器中的真实 Bean，再配合 MockMvc 或直接方法调用完成验证。

## 小结

| 注解/工具 | 作用 | 适用层级 |
|---------|------|---------|
| @SpringBootTest | 启动完整的 Spring 应用上下文，可通过 WebEnvironment 指定 Servlet 环境 | 启动类/整体 |
| @DataJpaTest | 自动配置 JPA 相关组件并初始化内存数据库 | Repository 层 |
| @WebMvcTest | 初始化测试 Controller 所需的 Spring MVC 基础设施 | Controller 层 |
| @MockBean | 向容器中注入 Mock 对象以替换真实的依赖 Bean | 各层依赖 |
| TestEntityManager | 提供持久化操作与数据环境隔离机制 | Repository 层 |
| MockMvc | 模拟 HTTP 请求并验证响应结果 | Controller 层 |

## 版本差异（Spring Cloud 旧版 → 2025.x）

| 组件 | 旧版（本文编写时） | 当前（Spring Cloud 2025.x / Boot 3.5.x） |
|------|-------------------|------------------------------------------|
| 服务注册 | Eureka 1.x（Eureka 2.x 已终止开发） | Nacos 2.x / Consul（Eureka 1.x 仍随 Spring Cloud Netflix 维护） |
| 负载均衡 | Ribbon（已停止维护） | Spring Cloud LoadBalancer |
| 网关 | Zuul 1.x（已停止维护） | Spring Cloud Gateway（基于 WebFlux） |
| 熔断 | Hystrix（已停止维护） | Resilience4j / Sentinel |
| 配置中心 | Spring Cloud Config | Nacos Config / Apollo |
| 版本对应 | Hoxton/2020.x + Boot 2.x + JDK 8 | 2025.x + Boot 3.5.x + JDK 17+ |

> 本篇示例基于 Spring Cloud 旧版（Hoxton/2020.x 时代）。Hystrix、Ribbon、Zuul 1.x、Eureka 已停止维护，新项目请使用 Spring Cloud Gateway + LoadBalancer + Resilience4j（或 Alibaba 系 Nacos/Sentinel/Seata），并升级到 Spring Cloud 2025.x + Spring Boot 3.5.x。
