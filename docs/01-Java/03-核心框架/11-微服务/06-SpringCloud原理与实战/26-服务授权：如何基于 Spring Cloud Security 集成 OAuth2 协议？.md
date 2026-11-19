---
title: "服务授权：如何基于 Spring Cloud Security 集成 OAuth2 协议？"
description: "基于 @EnableAuthorizationServer 与 Spring Cloud Security 构建 OAuth2 授权服务器，通过 ClientDetailsServiceConfigurer 与 WebSecurityConfigurerAdapter 设置客户端/用户信息，并以密码模式（password grant）通过 /oauth/token 端点生成 Token。"
keywords: [服务授权, 如何基于, Spring, Cloud, Security, 集成]
category: "Java"
tags: [Java, SpringCloud原理与实战]
---
# 服务授权：如何基于 Spring Cloud Security 集成 OAuth2 协议？

## 概念说明

在微服务架构中实现认证和授权这两个基本的安全性控制手段时，可以使用 OAuth2 协议来实现服务访问的授权，使用 JWT 来实现定制化的用户认证机制。Spring Cloud 中专门用于提供服务访问安全性的框架是 Spring Cloud Security。本篇基于这一框架介绍如何构建 OAuth2 授权服务器，并基于常用的密码模式生成对应的 Token，为后续服务访问控制提供基础。

## 构建 OAuth2 授权服务器

在微服务架构的实现过程中，OAuth2 授权服务器和注册中心服务器、配置服务器一样也表现为一个独立的微服务，因此构建授权服务器的方法也是创建一个 Spring Boot 应用程序：引入合适的 Maven 依赖，并提供一个 Bootstrap 类作为访问的入口。

回到 SpringHealth 案例，在已有各个服务的基础上，整个系统中需要创建一个新的代码工程并取名为 auth-server，同时引入与 OAuth2 协议相关的依赖：

```xml
<dependency>
    <groupId>org.springframework.cloud</groupId>
    <artifactId>spring-cloud-security</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.security.oauth</groupId>
    <artifactId>spring-security-oauth2</artifactId>
</dependency>
```

其中第一个依赖 spring-cloud-security 属于 Spring Cloud 家族中的一员，而 spring-security-oauth2 则来自于 Spring Security 中的 OAuth2 库。

Maven 依赖添加完毕后，下一步是构建 Bootstrap 类。以下代码位于 auth-server 工程的 AuthApplication 类中：

```java
@SpringCloudApplication
@RestController
@EnableResourceServer
@EnableAuthorizationServer
public class AuthApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuthApplication.class, args);
    }
}
```

这里出现了一个新的注解 @EnableAuthorizationServer。该注解的作用在于为微服务运行环境提供一个基于 OAuth2 协议的授权服务，该授权服务会暴露一系列基于 RESTful 风格的端点（例如 /oauth/authorize 和 /oauth/token）供 OAuth2 授权流程使用。

构建 OAuth2 授权服务只是集成 OAuth2 协议的第一步。授权服务器是一种集中式系统，管理着所有与安全性流程相关的客户端和用户信息，因此接下来需要在授权服务器中对这些基础信息进行初始化，Spring Cloud Security 框架提供了各种配置类来实现这一目标。

## 基于密码模式生成 Token

OAuth2 协议存在四种授权模式，本篇以简单但常用的密码模式为例展开。在密码模式下，用户向客户端提供用户名和密码，并将用户名和密码发给授权服务器从而请求 Token；授权服务器首先会对密码凭证信息进行认证，确认无误后向客户端发放 Token。

需要注意：授权服务器在这里执行认证操作的目的是验证所传入的用户名和密码是否正确。在密码模式下这一步是必须的；而如果采用其他授权模式，则不一定会有用户认证这一环节。

确定了采用密码模式之后，实现该授权模式的开发工作分为三步：设置客户端信息、设置用户认证信息、生成 Token。前两步属于基础数据准备，之后基于这些基础数据即可通过 HTTP 请求获取所需的 Token。

### 设置客户端信息

设置客户端时用到的配置类是 ClientDetailsServiceConfigurer，该配置类用来配置客户端详情服务 ClientDetailsService。用于描述客户端详情的 ClientDetails 接口包含了与安全性控制相关的多个重要方法，该接口中的部分方法定义如下：

```java
public interface ClientDetails extends Serializable {

    //客户端唯一性 Id
    String getClientId();
    Set<String> getResourceIds();
    boolean isSecretRequired();
    //客户端安全码
    String getClientSecret();
    boolean isScoped();
    //客户端的访问范围
    Set<String> getScope();
    //客户端可以使用的授权模式
    Set<String> getAuthorizedGrantTypes();
	…
}
```

与日常开发紧密相关的几个属性如下：

- **clientId**：必备属性，用来唯一标识客户的 Id；**clientSecret** 代表客户端安全码。
- **scope**：用来限制客户端的访问范围，如果为空，客户端就拥有全部的访问范围。常见的设置方式是 webclient 或 mobileclient，分别代表 Web 端和移动端。
- **authorizedGrantTypes**：代表客户端可以使用的授权模式，可选范围包括代表授权码模式的 authorization_code、代表隐式授权模式的 implicit、代表密码模式的 password 以及代表客户端凭据模式的 client_credentials。该属性在设置上也可以添加 refresh_token，用来通过刷新操作获取以上授权模式下所产生的新 Token。

Spring Security 提供了 AuthorizationServerConfigurerAdapter 类来简化配置类的使用方式，通过继承该类并覆写其中的 configure() 方法即可完成配置。使用 AuthorizationServerConfigurerAdapter 进行客户端信息配置的基本代码结构如下所示：

```java
@Configuration
public class SpringHealthAuthorizationServerConfigurer extends AuthorizationServerConfigurerAdapter {

@Autowired
    private AuthenticationManager authenticationManager;

@Autowired
    private UserDetailsService userDetailsService;

@Override
    public void configure(AuthorizationServerEndpointsConfigurer endpoints) throws Exception {
        endpoints.authenticationManager(authenticationManager).userDetailsService(userDetailsService);
    }

@Override
    public void configure(ClientDetailsServiceConfigurer clients) throws Exception {

        clients.inMemory().withClient("springhealth").secret("{noop}springhealth_secret")
                .authorizedGrantTypes("refresh_token", "password", "client_credentials")
                .scopes("webclient", "mobileclient");
    }
}
```

上述代码将授权模式设置为密码模式。授权服务器中存储客户端信息有两种方式：一种是如上述代码所示的基于内存级别的存储，另一种是通过 JDBC 在数据库中存储详情信息。

设置客户端安全码时使用了 "{noop}springhealth_secret" 这种格式。原因在于 Spring Security 5 中统一使用 PasswordEncoder 来对密码进行编码，设置密码时要求格式为 "{id}password"；前缀 "{noop}" 就是具体 PasswordEncoder 的 id，表示使用的是 NoOpPasswordEncoder。

@EnableAuthorizationServer 注解暴露的端点中，授权由 AuthorizationEndpoint 这个端点控制。要对该端点的行为进行配置，可以使用 AuthorizationServerEndpointsConfigurer 配置类，配置方式同样是继承 AuthorizationServerConfigurerAdapter 并覆写其中的 configure() 方法。

由于指定了授权模式为密码模式，而密码模式包含认证环节，所以针对 AuthorizationServerEndpointsConfigurer 配置类需要指定一个认证管理器 AuthenticationManager，用于对用户名和密码进行认证；同时需要指定一个自定义的 UserDetailsService 来替换全局的实现（UserDetailsService 的设置见下文"设置用户认证信息"部分）。在 SpringHealthAuthorizationServerConfigurer 类中添加如下代码即可完成 AuthorizationServerEndpointsConfigurer 的配置：

```java
@Autowired
private AuthenticationManager authenticationManager;

@Autowired
private UserDetailsService userDetailsService;

@Override
public void configure(AuthorizationServerEndpointsConfigurer endpoints) throws Exception {

        endpoints.authenticationManager(authenticationManager)
                .userDetailsService(userDetailsService);
}
```

至此，客户端设置工作全部完成，核心是实现了一个自定义的 SpringHealthAuthorizationServerConfigurer 配置类。

### 设置用户认证信息

设置用户认证信息所依赖的配置类是 WebSecurityConfigurer 类，Spring Security 同样提供了 WebSecurityConfigurerAdapter 类来简化该配置类的使用方式：继承 WebSecurityConfigurerAdapter 类并覆写其中的 configure() 方法即可完成配置工作。

WebSecurityConfigurer 配置类的配置内容非常简单，只需指定用户名（User）、密码（Password）和角色（Role）这三项数据。这部分工作通过前文提到的认证管理器 AuthenticationManager 完成，该接口非常简单，只包含一个用于认证的 authenticate 方法：

```java
public interface AuthenticationManager {

    Authentication authenticate(Authentication authentication)
            throws AuthenticationException;
}
```

在 Spring Security 中，可以使用 AuthenticationManagerBuilder 类轻松实现基于内存、LDAP 和 JDBC 的认证机制。SpringHealth 案例使用该类中的 inMemoryAuthentication() 方法实现基于内存的用户信息认证，完整的 SpringHealthWebSecurityConfigurer 类代码如下所示：

```java
@Configuration
public class SpringHealthWebSecurityConfigurer extends WebSecurityConfigurerAdapter {

@Override
    @Bean
    public AuthenticationManager authenticationManagerBean() throws Exception {
        return super.authenticationManagerBean();
    }

@Override
    @Bean
    public UserDetailsService userDetailsServiceBean() throws Exception {
        return super.userDetailsServiceBean();
    }

    @Override
    protected void configure(AuthenticationManagerBuilder builder) throws Exception {
     builder.inMemoryAuthentication().withUser("springhealth_user").password("{noop}password1").roles("USER").and()
                .withUser("springhealth_admin").password("{noop}password2").roles("USER", "ADMIN");
    }
}
```

上述代码构建了具有不同角色和密码的两个用户："springhealth_user" 代表的角色是普通用户，"springhealth_admin" 则具有管理员角色。设置密码时同样需要添加前缀 "{noop}"。另外，authenticationManagerBean() 和 userDetailsServiceBean() 方法分别返回了父类的默认实现，这里返回的 UserDetailsService 和 AuthenticationManager 正是前面设置客户端信息时所注入的两个 Bean。

### 生成 Token

OAuth2 授权服务器启动完毕后，即可获取 Token。构建 OAuth2 服务器时提到，授权服务器中会暴露一批端点供 HTTP 请求访问，其中获取 Token 的端点是 [http://localhost:8080/oauth/token](http://localhost:8080/oauth/token)。使用该端点时，需要提供前面所配置的客户端信息和用户信息。

以 Postman 模拟 HTTP 请求为例：

1. 在 "Authorization" 请求头中指定认证类型为 "Basic Auth"，设置客户端名称和客户端安全码分别为 "springhealth" 和 "springhealth_secret"。
2. 指定针对授权模式的专用配置信息：用于指定授权模式的 grant_type 属性，以及用于指定客户端访问范围的 scope 属性，这里分别设置为 "password" 和 "webclient"；由于采用密码模式，还需要指定用户名和密码用于识别用户身份，以 "springhealth_user" 这个用户为例进行设置。

在 Postman 中执行这个请求，会得到如下所示的返回结果：

```json
{
    "access_token": "868adf52-f524-4be8-a9e7-24c1c41aa7d6",
    "token_type": "bearer",
    "refresh_token": "96de5815-7935-4ca7-a24e-0d7441345696",
    "expires_in": 43199,
    "scope": "webclient"
}
```

返回结果中除了作为请求参数的 scope 之外，还包含 access_token、token_type、refresh_token 和 expires_in 等属性，含义如下：

- **access_token**：最重要的属性，代表一个 OAuth2 Token。
- **token_type**：OAuth2 协议中存在多种 Token 类型可供选择，包括 bearer 类型、mac 类型等，这里返回的是最常见的一种类型，即 bearer 类型。
- **refresh_token**：当 access_token 过期之后，用于重新下发一个新的 access_token。
- **expires_in**：指定 access_token 的有效时间，超过这个有效时间时 access_token 会自动失效。

由于每次请求生成的 Token 都是唯一的，实际尝试时所获取的 Token 值与示例中的结果不同属于正常现象。

## 小结

- 对微服务访问进行安全性控制的首要条件是生成一个访问 Token；实现路径为构建 OAuth2 授权服务器（auth-server 工程 + @EnableAuthorizationServer），基于密码模式依次设置客户端信息（ClientDetailsServiceConfigurer + AuthorizationServerConfigurerAdapter）、用户认证信息（WebSecurityConfigurer + WebSecurityConfigurerAdapter + AuthenticationManager），最终通过 /oauth/token 端点生成 Token。
- 一个合法的 OAuth2 Token 响应包含的核心属性：access_token、token_type、refresh_token、expires_in、scope。
- Spring Security 5 中密码编码统一为 "{id}password" 格式，示例中的 "{noop}" 前缀对应 NoOpPasswordEncoder，生产环境应替换为 bcrypt 等强编码器。

## 版本差异（Spring Cloud 旧版 → 2025.x）

| 组件 | 旧版（本文编写时） | 当前（Spring Cloud 2025.x / Boot 3.5.x） |
|------|-------------------|------------------------------------------|
| 服务注册 | Eureka 1.x（Eureka 2.x 已终止开发） | Nacos 2.x / Consul（Eureka 1.x 仍随 Spring Cloud Netflix 维护） |
| 负载均衡 | Ribbon（已停止维护） | Spring Cloud LoadBalancer |
| 网关 | Zuul 1.x（已停止维护） | Spring Cloud Gateway（基于 WebFlux） |
| 熔断 | Hystrix（已停止维护） | Resilience4j / Sentinel |
| 配置中心 | Spring Cloud Config | Nacos Config / Apollo |
| 版本对应 | Hoxton/2020.x + Boot 2.x + JDK 8 | 2025.x + Boot 3.5.x + JDK 17+ |

> 本文基于 Spring Cloud 旧版（Hoxton/2020.x 时代）编写。Hystrix、Ribbon、Zuul 1.x、Eureka 已停止维护，新项目请使用 Spring Cloud Gateway + LoadBalancer + Resilience4j（或 Alibaba 系 Nacos/Sentinel/Seata），并升级到 Spring Cloud 2025.x + Spring Boot 3.5.x。Spring Security 5.x 之后 WebSecurityConfigurerAdapter 已被弃用，推荐改用 SecurityFilterChain Bean 的声明式配置方式。
