---
title: "配置服务：如何基于Spring Cloud Config 构建配置中心服务器？"
description: "基于 @EnableConfigServer 构建 Spring Cloud Config 配置服务器，native 本地文件系统与 Git 两种配置仓库方案，以及 EnvironmentRepository/EnvironmentController 的工作机制与源码解析。"
keywords: [配置服务, 如何基于Spring, Cloud, Config, 构建配置中心服务器]
category: "Java"
tags: [Java, SpringCloud原理与实战]
---
# 配置服务：如何基于Spring Cloud Config 构建配置中心服务器？

在上一节中，我们提到配置中心有两个核心组件，一个是**配置服务器**，一个是**配置仓库**。在 Spring Cloud 中，自研了一个 Spring Cloud Config 框架来构建配置中心，并同时提供了配置服务器和多种配置仓库实现方案。今天我们先来看如何基于 Spring Cloud Config 构建配置服务器，并分别基于本地文件系统和第三方仓库来实现配置仓库。

## 构建配置中心

使用 Spring Cloud Config 构建配置中心的第一步是搭建配置服务器，有了配置服务器就可以分别使用本地文件系统以及第三方仓库来实现具体的配置方案。让我们一一来看一下。

### 基于 Spring Cloud Config 构建配置服务器

基于 Spring Cloud Config，要想构建配置服务器，我们需要在 SpringHealth 案例中创建一个新的独立服务 config-server 并导入两个组件，它们分别是 spring-cloud-config-server 和 spring-cloud-starter-config，其中前者包含了用于构建配置服务器的各种组件，相应的 Maven 依赖如下所示。

```xml
<dependency>
       <groupId>org.springframework.cloud</groupId>
       <artifactId>spring-cloud-config-server</artifactId>
</dependency>

<dependency>
       <groupId>org.springframework.cloud</groupId>
       <artifactId>spring-cloud-starter-config</artifactId>
</dependency>
```

接下来我们在新建的 config-server 工程中添加一个 Bootstrap 类 ConfigServerApplication，如下所示。

```java
@SpringCloudApplication
@EnableConfigServer
public class ConfigServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(ConfigServerApplication.class, args);
	  }
}
```

除了熟悉的 @SpringCloudApplication 注解之外，我们还看到这里添加了一个崭新的注解 @EnableConfigServer。有了这个注解，配置服务器就可以将所存储的配置信息转化为 RESTful 接口数据供各个业务微服务在分布式环境下进行使用。

### 实现基于本地文件系统的配置方案

Spring Cloud Config 中提供了多种配置仓库的实现方案，最常见的就是基于本地文件系统的配置方案和基于 Git 的配置方案。我们先来看基于本地文件系统的配置方案，在这种配置方案中，相当于配置仓库位于配置服务器的内部。

在 SpringHealth 案例中，当我们使用本地配置文件方案构建配置仓库时，一种典型的项目工程结构是：我们在 src/main/resources 目录下创建一个 springhealthconfig 文件夹，再在这个文件夹下分别创建 userservice、deviceservice 和 interventionservice 这三个子文件夹，请注意这三个子文件夹的名称必须与各个服务自身的名称完全一致。然后我们可以看到这三个子文件夹下面都放着以服务名称命名的针对不同运行环境的 .yml 配置文件。

接下来，我们在 application.yml 文件中添加如下配置项，通过 searchLocations 指向各个配置文件的路径。

```yaml
server:
  port: 8888

spring:
  cloud:
    config:
      server:
        native:
          searchLocations: classpath:springhealthconfig/,classpath:springhealthconfig/userservice,classpath:springhealthconfig/deviceservice,classpath:springhealthconfig/interventionservice
```

现在我们在 springhealthconfig/userservice/userservice.yml 配置文件中添加如下所示的配置信息，显然这些配置信息用于设置 MySQL 数据库访问的各项参数。

```yaml
spring:
  jpa:
    database: MYSQL
  datasource:
    platform: mysql
    url: jdbc:mysql://127.0.0.1:3306/springhealth_user
    driver-class-name: com.mysql.jdbc.Driver
    username: root
    password: root
```

Spring Cloud Config 为我们提供了强大的集成入口，配置服务器可以将存放在本地文件系统中的配置文件信息自动转化为 RESTful 风格的接口数据。当我们启动配置服务器，并访问 [http://localhost:8888/userservice/default](http://localhost:8888/userservice/default) 端点时，可以得到如下信息：

```xml
{
	    "name": "userservice",
	    "profiles": [
	        "default"
	    ],
	    "label": null,
	    "version": null,
	    "state": null,
	    "propertySources": [
	        {
	            "name": "classpath:springhealthconfig/userservice/userservice.yml",
	            "source": {
	                "spring.jpa.database": "MYSQL",
	                "spring.datasource.platform": "mysql",
	                "spring.datasource.url": "jdbc:mysql://119.3.52.175:3306/springhealth_user",
	                "spring.datasource.username": "root",
	                "spring.datasource.password": "1qazxsw2#edc",
	                "spring.datasource.driver-class-name": "com.mysql.jdbc.Driver"
	            }
	        }
	    ]
}
```

因为我们访问的是 [http://localhost:8888/userservice/default](http://localhost:8888/userservice/default) 端点，相当于获取的是 userservice.yml 文件中的配置信息，所以这里的 "profiles" 值为 "default"，意味着配置文件的 Profile 是默认环境。而 "label" 的值为 "null"，代表未指定版本标签；当使用 Git 等版本仓库时，label 通常对应分支名（如 master）。最后的"propertySources"段展示了配置文件的路径以及具体内容。

那么，如果我们想要访问的是 test 环境的配置信息应该怎么做呢？很简单，对应的端点就变成了[http://localhost:8888/userservice/test](http://localhost:8888/userservice/test)，你可以尝试进行访问，其他环境也以此类推。

### 实现基于第三方仓库的配置方案

对于 Spring Cloud Config 而言，更加推荐将配置信息存放在 Git 等具有版本控制机制的远程仓库中。假如我们把配置信息放在 Git 仓库中，通常的做法是把所有的配置文件放到自建或公共的 Git 系统中。例如在 SpringHealth 案例中，我们可以把各个服务所依赖的配置文件统一存放到 GitHub 上进行托管。

因为改变了配置仓库的实现方式，我们同样需要修改 application.yml 中关于配置仓库的配置信息，调整后的配置内容示例如下所示：

```yaml
server:
  port: 8888

spring:
  cloud:
    config:
      discovery:
        enabled: true
      server:
        git:
          uri: https://github.com/tianyilan/springcloud-demo/config-repository/
          searchPaths: userservice,deviceservice,interventionservice
          username: tianyilan
          password: tianyilan_pwd
```

可以看到，我们在 spring.cloud.config.server.git 配置段中指定了 GitHub 相关的各项信息，其中 searchPaths 用于指向各个配置文件所在的目录名称。这里的配置项只是基于我 GitHub 账号的一个演示，你也可以根据自身情况进行设置。

事实上，基于 Git 的配置方案的最终结果也是将位于 Git 仓库中的远程配置文件加载到本地。一旦配置文件已经加载到本地，那么对这些配置文件的处理方式以及处理效果与前面介绍的本地文件系统是完全一样的。

## Spring Cloud Config Server 工作机制

### EnvironmentRepository

@EnableConfigServer 注解是理解 Spring Cloud Config 服务器端组件的入口，该注解定义如下：

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Import(ConfigServerConfiguration.class)
public @interface EnableConfigServer {
}
```

这里通过 @Import 注解引入了 ConfigServerConfiguration，我们发现在该类中定义了一个 Marker 空类。在 Spring Boot 的自动配置体系中，这是常见的一种处理方式。这个 Marker 类的作用就是为了提供一个启动条件，而这个启动条件的唯一使用者就是 ConfigServerAutoConfiguration，如下所示：

```java
@Configuration
@ConditionalOnBean(ConfigServerConfiguration.Marker.class)
@EnableConfigurationProperties(ConfigServerProperties.class)
@Import({ EnvironmentRepositoryConfiguration.class, CompositeConfiguration.class, ResourceRepositoryConfiguration.class,
        ConfigServerEncryptionConfiguration.class, ConfigServerMvcConfiguration.class })
public class ConfigServerAutoConfiguration {
}
```

这里的 @ConditionalOnBean(ConfigServerConfiguration.Marker.class) 条件注解表示只有在类路径中构建了这个 Marker 类的实例时才会执行 ConfigServerAutoConfiguration 的处理。同时，这里又进一步导入了一批配置类，我们无意对这些配置类都展开讨论，而是重点关注 EnvironmentRepositoryConfiguration。对于 Spring Cloud Config 而言，它把所有的配置信息抽象为一种 Environment（环境），而存储这些配置信息的地方就称为 EnvironmentRepository。EnvironmentRepository 就是带有配置仓库的配置中心实现方案的具体体现，它是一个接口，定义如下：

```java
public interface EnvironmentRepository {
        Environment findOne(String application, String profile, String label);
}
```

可以看到这个接口非常简单，Spring Cloud Config中把配置信息抽象为应用（application）、环境（profile）和版本（label）这三个维度进行管理，通过这三个维度，我们就可以确定唯一的一份配置数据。EnvironmentRepository 的实现类非常多，从命名中基本都可以看出这些类是用于加载哪些不同类型的配置。事实上，各种实现类之间存在一定的关联，那么我们选择哪一个 EnvironmentRepository 来作为切入点呢？这个问题实际上不难回答，因为 Spring Cloud Config 为我们提供了一个默认的 EnvironmentRepositoryConfiguration，即 DefaultRepositoryConfiguration，如下所示：

```java
@Configuration
@ConditionalOnMissingBean(value = EnvironmentRepository.class, search = SearchStrategy.CURRENT)
class DefaultRepositoryConfiguration {

@Autowired
    private ConfigurableEnvironment environment;

@Autowired
    private ConfigServerProperties server;

@Autowired(required = false)
    private TransportConfigCallback customTransportConfigCallback;

    @Bean
    public MultipleJGitEnvironmentRepository defaultEnvironmentRepository(
            MultipleJGitEnvironmentRepositoryFactory gitEnvironmentRepositoryFactory,
            MultipleJGitEnvironmentProperties environmentProperties) throws Exception {
        return gitEnvironmentRepositoryFactory.build(environmentProperties);
    }
}
```

而 GitRepositoryConfiguration 继承了这个 DefaultRepositoryConfiguration，也就是说 Spring Cloud Config 中默认使用 Git 作为配置仓库来完成配置信息的存储和管理，提供的 EnvironmentRepository 就是 MultipleJGitEnvironmentRepository，而 MultipleJGitEnvironmentRepository 则继承了抽象类 JGitEnvironmentRepository。

当服务器启动时，在 JGitEnvironmentRepository 中会决定是否调用 initClonedRepository() 方法来完成从远程 Git 仓库 Clone 代码。如果执行了这一操作，相当于会将配置文件从 Git 上 clone 到本地，然后再进行其他的操作。在 JGitEnvironmentRepository 抽象类中，提供了大量针对第三方 Git 仓库的操作代码，这些都不是理解配置中心的重点内容，这里不做展开。我们只需要明白，无论采用诸如 Git、SVN 等具体某一种配置仓库的实现方式，最终我们处理的对象都是位于本地文件系统中的配置文件。

在这个类层结构中，AbstractScmEnvironmentRepository 实现了 EnvironmentRepository 接口，同时也是 JGitEnvironmentRepository 的父类，它的 findOne 方法如下所示：

```java
public synchronized Environment findOne(String application, String profile, String label) {
        // 构建 NativeEnvironmentRepository
        NativeEnvironmentRepository delegate = new NativeEnvironmentRepository(getEnvironment(),
                new NativeEnvironmentProperties());
        Locations locations = getLocations(application, profile, label);
        delegate.setSearchLocations(locations.getLocations());
        Environment result = delegate.findOne(application, profile, "");
        result.setVersion(locations.getVersion());
        result.setLabel(label);
        return this.cleaner.clean(result, getWorkingDirectory().toURI().toString(),
                getUri());
}
```

注意到这里的代码中使用了 NativeEnvironmentRepository，该类实现了 EnvironmentRepository 接口并封装了对本地文件的相关操作。我们同样关注它的 findOne 方法，如下所示（部分代码做了裁剪）：

```java
@Override
public Environment findOne(String config, String profile, String label) {
        SpringApplicationBuilder builder = new SpringApplicationBuilder(
                PropertyPlaceholderAutoConfiguration.class);
        ConfigurableEnvironment environment = getEnvironment(profile);
        builder.environment(environment);
        builder.web(WebApplicationType.NONE).bannerMode(Mode.OFF);

// 获取配置信息的参数
        String[] args = getArgs(config, profile, label);

        // 设置监听器用于监听配置文件的变化
        builder.application()
                .setListeners(Arrays.asList(new ConfigFileApplicationListener()));
        ConfigurableApplicationContext context = builder.run(args);
        environment.getPropertySources().remove("profiles");
        try {
            return clean(new PassthruEnvironmentRepository(environment).findOne(config,
                    profile, label));
        }
        finally {
            context.close();
        }
}
```

从代码结构上，我们看到最终委托 PassthruEnvironmentRepository 完成配置文件的读取，然后通过 clean 方法完成本地文件地址与远程仓库之间地址的转换。同时，这里用到了 Spring Boot 自带的 ConfigFileApplicationListener 来监听配置文件的变化。

### EnvironmentController

在 Spring Cloud Config 中，通过 EnvironmentRepository 获取的配置信息最终通过 EnvironmentController 暴露给客户端应用程序进行。EnvironmentController 类比较简单，类的定义如下所示：

```java
@RestController
@RequestMapping(method = RequestMethod.GET, path = "${spring.cloud.config.server.prefix:}")
public class EnvironmentController {
    private EnvironmentRepository repository;
	private ObjectMapper objectMapper;

}
```

可以看到它的关键成员变量只有两个，即 EnvironmentRepository 和 ObjectMapper。前者是具体某一个 EnvironmentRepository 的实例，而 ObjectMapper 用于将结果序列化成 JSON 格式的配置数据。

EnvironmentController 提供了多种获取配置信息的方法，这些方法接收前面介绍的 application、profile、label 这三个参数。EnvironmentController 中最重要的方法就是如下所示的 defaultLabel 方法和 labelled 方法，这些方法暴露了最常用的获取配置的 HTTP 端点：

```java
@RequestMapping("/{name}/{profiles:.*[^-].*}")
public Environment defaultLabel(@PathVariable String name,
          @PathVariable String profiles) {
      return labelled(name, profiles, null);
}

@RequestMapping("/{name}/{profiles}/{label:.*}")
public Environment labelled(@PathVariable String name, @PathVariable String profiles, @PathVariable String label) {
  Environment environment = this.repository.findOne(name, profiles, label);
  if(!acceptEmpty && (environment == null || environment.getPropertySources().isEmpty())){
      throw new EnvironmentNotFoundException("Profile Not found");
  }
  return environment;
}
```

可以看到，在 labelled 方法中，会调用 EnvironmentRepository 的 findOne() 方法来加载配置，然后返回给配置的消费者，也就是内嵌了 Spring Cloud Config 客户端的各个业务微服务。

## 小结

本文关注于如何使用 Spring Cloud Config 来完成配置中心服务器端的构建过程。我们通过该框架创建了一个新的微服务，并嵌入到 SpringHealth 案例系统中。尽管创建配置服务器并指定配置仓库的开发工作非常简单，但我们需要在掌握使用方法的基础上深入理解其内部的工作机制。针对 Spring Cloud Config Server 组件，本文也做了源码级别的原理分析。

这里给你留一道思考题：在 Spring Cloud Config 中，是如何对位于 Git 等远程仓库中的配置信息进行有效处理的呢？

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
