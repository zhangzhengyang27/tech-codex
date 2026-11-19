---
title: "服务认证：如何使用 JWT 实现定制化 Token？"
description: "JWT 的三段式结构（Header/Payload/Signature），通过 JwtTokenStore+JwtAccessTokenConverter 将 OAuth2 与 JWT 集成，使用 Filter+ThreadLocal+RestTemplate 拦截器在服务链中传播 JWT，以及基于 TokenEnhancer 扩展自定义属性。"
keywords: [服务认证, 如何使用, JWT, 实现定制化, Token]
category: "Java"
tags: [Java, SpringCloud原理与实战]
---
# 服务认证：如何使用 JWT 实现定制化 Token？

## 概念说明

在微服务架构中，可以使用 Token 对服务的访问过程进行权限控制，这里的 Token 是类似“b7c2c7e0-0223-40e2-911d-eff82d125b80”的一种字符串结构。这个字符串中能包含哪些内容？是不是所有的 Token 都是这样的结构？事实上，在 OAuth2 协议中，并没有对 Token 的具体组成结构做出明确规定。为了解决 Token 的标准化问题，就诞生了 JWT。

## 原理与机制：JWT 的结构

### 什么是 JWT？

JWT 的全称是 JSON Web Token，所以它本质上就是一种基于 JSON 表示的 Token。JWT 的设计目标就是为 OAuth2 中所使用的 Token 提供一种标准结构，所以它经常与 OAuth2 协议集成在一起使用。

从结构上讲，JWT 本身是由三段信息构成的，第一段为头部（Header），第二段为有效负载（Payload），第三段为签名（Signature），如下所示：

```xml
header. payload. signature
```

以上三个部分的内容从数据格式上讲都是一个 JSON 对象。在 JWT 中，每一段 JSON 对象都被 Base64 进行编码，然后编码后的内容用“.”号连接在一起。所以本质上 JWT 就是一个字符串，如下所示的就是一个 JWT 字符串的示例：

```xml
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3NwcmluZ2hlYWx0aC5leGFtcGxlLmNvbSIsInN1YiI6Im1haWx0bzpzcHJpbmdoZWFsdGhAZXhhbXBsZS5jb20iLCJuYmYiOjE1OTkwNTY4NjIsImV4cCI6MTU5OTA2MDQ2MiwiaWF0IjoxNTk5MDU2ODYyLCJqdGkiOiJpZDEyMzQ1NiIsInR5cCI6Imh0dHBzOi8vc3ByaW5naGVhbHRoLmV4YW1wbGUuY29tL3JlZ2lzdGVyIn0.rlg2i8mWwV-gFjHUSCutX-UBMYrqxL0th1xtyGq7UdE
```

显然，无法直接从这个经过 Base64 编码的字符串中获取有用的信息。业界也存在一些在线生成和解析 JWT 的工具，这里以 [jsjws](http://kjur.github.io/jsjws/tool_jwt.html) 上所提供的在线工具为例来演示 JWT 的内部结构和签名方式。

指定相应内容之后，就可以获取前面所给出的 JWT 字符串。反之，可以使用[http://jwt.calebb.net/](http://jwt.calebb.net/)所提供的反向转换原始数据的功能。针对前面的 JWT 字符串，其中所包含的原始 JSON 数据如下所示：

```xml
{
 alg: "HS256",
 typ: "JWT"
}.
{
 iss: "https://springhealth.example.com",
 sub: "mailto:springhealth@example.com",
 nbf: 1599056862,
 exp: 1599060462,
 iat: 1599056862,
 jti: "id123456",
 typ: "https://springhealth.example.com/register"
}.
[signature]
```

由此可以清晰地看到一个 JWT 中所包含的 Header 部分和 Payload 部分的数据，而出于安全考虑，Signature 部分数据并没有进行展示。

Spring Cloud Security 为 JWT 的生成和验证提供了开箱即用的支持。要发送和消费 JWT，OAuth2 授权服务和各个受保护的微服务必须以不同的方式进行配置。整个开发流程与《服务授权：如何基于 Spring Cloud Security 集成 OAuth2 协议？》中介绍的普通 Token 是一致的，不同之处在于配置的内容和方式。

## 代码示例：集成 OAuth2 与 JWT

对于所有需要用到 JWT 的独立服务，首先需要在 Maven 的 pom 文件中添加对应的依赖包，如下所示：

```xml
<dependency>
	<groupId>org.springframework.security</groupId>
	<artifactId>spring-security-jwt</artifactId>
</dependency>
```

接下来的一步就是提供一个配置类用于完成 JWT 的生成和转换。在 OAuth2 协议中专门提供了一个接口用于管理 Token 的存储，这个接口就是 TokenStore。该接口有多个实现类，包括 InMemoryTokenStore、JdbcTokenStore 以及专门用来存储 JWT Token 的 JwtTokenStore 等。对应的，也需要创建一个用于配置 JwtTokenStore 的配置类。以 SpringHealth 案例系统中的 auth-server 服务为例，添加一个 SpringHealthJWTTokenStoreConfig 配置类，如下所示：

```java
@Configuration
public class SpringHealthJWTTokenStoreConfig {

@Bean
    public TokenStore tokenStore() {
        return new JwtTokenStore(jwtAccessTokenConverter());
    }

@Bean
    public JwtAccessTokenConverter jwtAccessTokenConverter() {
        JwtAccessTokenConverter converter = new JwtAccessTokenConverter();
        converter.setSigningKey("123456");
        return converter;
	}

    @Bean
    public DefaultTokenServices tokenServices() {
        DefaultTokenServices defaultTokenServices = new DefaultTokenServices();
        defaultTokenServices.setTokenStore(tokenStore());
        defaultTokenServices.setSupportRefreshToken(true);
        return defaultTokenServices;
    }
}
```

可以看到，这里构建了 JwtTokenStore 对象，而在它的构造函数中传入了一个 JwtAccessTokenConverter。JwtAccessTokenConverter 是一个用来转换 JWT 的转换器，而转换的过程需要签名键。在创建完 JwtTokenStore 之后，通过 tokenServices 方法返回了已经设置 JwtTokenStore 对象的 DefaultTokenServices。

SpringHealthJWTTokenStoreConfig 的作用就是创建一系列对象供 Spring 容器使用，这些对象在将 JWT 集成到 OAuth2 授权服务的过程中被使用。基于《服务授权：如何基于 Spring Cloud Security 集成 OAuth2 协议？》中的讨论，可以构建一个 SpringHealthAuthorizationServerConfigurer 类来覆写 AuthorizationServerConfigurerAdapter 中的 configure 方法。原先的这个 configure 方法实现如下：

```java
@Override
public void configure(AuthorizationServerEndpointsConfigurer endpoints) throws Exception {

        endpoints.authenticationManager(authenticationManager)
                .userDetailsService(userDetailsService);
}
```

而集成了 JWT 之后，该方法的实现过程如下所示：

```java
@Override
public void configure(AuthorizationServerEndpointsConfigurer endpoints) throws Exception {
        TokenEnhancerChain tokenEnhancerChain = new TokenEnhancerChain();
        tokenEnhancerChain.setTokenEnhancers(Arrays.asList(jwtTokenEnhancer, jwtAccessTokenConverter));
        endpoints.tokenStore(tokenStore).accessTokenConverter(jwtAccessTokenConverter)
                .tokenEnhancer(tokenEnhancerChain)
                .authenticationManager(authenticationManager)
                .userDetailsService(userDetailsService);
}
```

可以看到，这里构建了一个对 Token 的增强链 TokenEnhancerChain，并用到了在 SpringHealthJWTTokenStoreConfig 中创建的 tokenStore、jwtAccessTokenConverter 对象。至此，在 OAuth2 协议中集成 JWT 的过程介绍完成，也就是说此时访问 OAuth2 授权服务器获取的 Token 应该就是 JWT Token。通过 Postman 发起请求即可得到相应的 Token：

```plain
{
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzeXN0ZW0iOiJTcHJpbmdIZWFsdGgiLCJ1c2VyX25hbWUiOiJzcHJpbmdoZWFsdGhfYWRtaW4iLCJzY29wZSI6WyJ3ZWJjbGllbnQiXSwiZXhwIjoxNjA2MzYyMTM3LCJhdXRob3JpdGllcyI6WyJST0xFX0FETUlOIiwiUk9MRV9VU0VSIl0sImp0aSI6IjU3YjhjYjM5LThkMGYtNGE4Ny1hZDU2LTQyZGExZTIxNmRjYyIsImNsaWVudF9pZCI6InNwcmluZ2hlYWx0aCJ9.kEjhuZtSYrj7HJlQhowfBQDzH9qJiqCQm8p7gHUhhcU",
    "token_type": "bearer",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzeXN0ZW0iOiJTcHJpbmdIZWFsdGgiLCJ1c2VyX25hbWUiOiJzcHJpbmdoZWFsdGhfYWRtaW4iLCJzY29wZSI6WyJ3ZWJjbGllbnQiXSwiYXRpIjoiNTdiOGNiMzktOGQwZi00YTg3LWFkNTYtNDJkYTFlMjE2ZGNjIiwiZXhwIjoxNjA4OTEwOTM3LCJhdXRob3JpdGllcyI6WyJST0xFX0FETUlOIiwiUk9MRV9VU0VSIl0sImp0aSI6IjVmOGZkNDFjLTdlMTEtNDk1OC05ZDVmLWFlY2MzNGRmYThiNSIsImNsaWVudF9pZCI6InNwcmluZ2hlYWx0aCJ9.Rq8pLRHSvZgda_0DgSFQ8eI5dctAGE4Jqlb_qabRDvE",
    "expires_in": 43199,
    "scope": "webclient",
    "system": "SpringHealth",
    "jti": "57b8cb39-8d0f-4a87-ad56-42da1e216dcc"
}
```

显然，这里的 access_token 和 refresh_token 都已经是经过 Base64 编码的字符串。同样，可以通过前面介绍的在线工具获取其 JSON 数据格式的内容，如下所示的就是 access_token 的原始内容：

```xml
{
 alg: "HS256",
 typ: "JWT"
}.
{
 system: "SpringHealth",
 user_name: "springhealth_admin",
 scope: [
  "webclient"
 ],
 exp: 1606362137,
 authorities: [
  "ROLE_ADMIN",
  "ROLE_USER"
 ],
 jti: "57b8cb39-8d0f-4a87-ad56-42da1e216dcc",
 client_id: "springhealth"
}.
[signature]
```

### 在微服务中使用 JWT：传播 JWT Token

在各个微服务中使用 JWT 的第一步也是配置工作。需要在 SpringHealth 案例系统中的三个业务微服务中分别添加一个 SpringHealthJWTTokenStoreConfig 配置类，这个配置类的内容就是创建一个 JwtTokenStore 并构建 tokenServices，具体代码见前文。

配置工作完成之后，剩下的问题就是在服务调用链中传播 JWT。对于普通的 Token，OAuth2RestTemplate 工具类可以完成传播；但可惜的是，它并不能传播基于 JWT 的 Token。从实现原理上，OAuth2RestTemplate 也是在 RestTemplate 的基础上做了一层封装，所以思路也是尝试在 RestTemplate 请求中添加对 JWT 的支持。

HTTP 请求是通过在 Header 部分中添加一个“Authorization”消息头来完成对 Token 的传递。实现 JWT 传播分三步：第一步，从 HTTP 请求中获取这个 JWT Token；第二步，将这个 Token 存储在一个线程安全的地方以便在后续的服务链中进行使用；第三步，也是最关键的一步，在通过 RestTemplate 发起请求时，能够把这个 Token 自动嵌入到所发起的每一个 HTTP 请求中。

**第一步：Filter 过滤器获取 Token。** 在 HTTP 请求过程中，可以通过过滤器 Filter 对所有请求进行过滤。Filter 是 servlet 中的一个核心组件，其基本原理就是构建一个过滤器链并对经过该过滤器链的请求和响应添加定制化的处理机制。Filter 接口的定义如下所示：

```java
public interface Filter {
    public void init(FilterConfig filterConfig) throws ServletException;
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain) throws IOException, ServletException;
    public void destroy();
}
```

通常，实现 Filter 接口中的 doFilter 方法。例如，在 SpringHealth 案例系统中，可以将 ServletRequest 转化为一个 HttpServletRequest 对象，并从该对象中获取“Authorization”消息头，示例代码如下所示：

```java
@Component
public class AuthorizationHeaderFilter implements Filter {

@Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {

	HttpServletRequest httpServletRequest = (HttpServletRequest) servletRequest;

	AuthorizationHeaderHolder.getAuthorizationHeader().setAuthorizationHeader(httpServletRequest.getHeader(AuthorizationHeader.AUTHORIZATION_HEADER));

	filterChain.doFilter(httpServletRequest, servletResponse);
    }

@Override
    public void init(FilterConfig filterConfig) throws ServletException {}

    @Override
    public void destroy() {}
}
```

注意到，这里把从 HTTP 请求中获取的“Authorization”消息头保存到了一个 AuthorizationHeaderHolder 对象中。从命名上看，AuthorizationHeader 对象代表的就是 HTTP 中“Authorization”消息头，而 AuthorizationHeaderHolder 则是该消息头对象的持有者。这种命名方式在 Spring 等主流开源框架中非常常见：一般而言，以 -Holder 结尾的多是一种封装类，用于对原有对象添加线程安全等附加特性。这里的 AuthorizationHeaderHolder 就是这样一个封装类，如下所示：

```java
public class AuthorizationHeaderHolder {
    private static final ThreadLocal<AuthorizationHeader> authorizationHeaderContext = new ThreadLocal<AuthorizationHeader>();

public static final AuthorizationHeader getAuthorizationHeader(){
        AuthorizationHeader header = authorizationHeaderContext.get();

if (header == null) {
         header = new AuthorizationHeader();
            authorizationHeaderContext.set(header);

}
        return authorizationHeaderContext.get();
    }

    public static final void setAuthorizationHeader(AuthorizationHeader header) {
        authorizationHeaderContext.set(header);
    }
}
```

可以看到，这里使用了 ThreadLocal 来确保对 AuthorizationHeader 对象访问的线程安全性，AuthorizationHeader 定义如下，用于保存来自 HTTP 请求头的 JWT Token：

```java
@Component
public class AuthorizationHeader {
    public static final String AUTHORIZATION_HEADER = "Authorization";

private String authorizationHeader = new String();

public String getAuthorizationHeader() {
        return authorizationHeader;
    }

    public void setAuthorizationHeader(String authorizationHeader) {
        this.authorizationHeader = authorizationHeader;
    }
}
```

**第三步：RestTemplate 拦截器嵌入 Token。** 对于每一个 HTTP 请求，此时都能获取其中的 Token 并将其保存在上下文对象中。剩下的唯一问题就是如何通过 RestTemplate 将这个 Token 继续传递到下一个服务中，以便下一个服务也能从 HTTP 请求中获取 Token 并继续向后传递，从而确保 Token 在整个调用链中持续传播。要实现这一目标，需要对 RestTemplate 进行一些设置，如下所示：

```java
@Bean
public RestTemplate getCustomRestTemplate() {
        RestTemplate template = new RestTemplate();
        List<ClientHttpRequestInterceptor> interceptors = template.getInterceptors();
        if (interceptors == null) {
            template.setInterceptors(Collections.singletonList(new AuthorizationHeaderInterceptor()));
        } else {
            interceptors.add(new AuthorizationHeaderInterceptor());
            template.setInterceptors(interceptors);
        }

        return template;
}
```

RestTemplate 允许开发人员添加自定义的拦截器 Interceptor，拦截器本质上与过滤器的功能类似，用于对传入的 HTTP 请求进行定制化处理。例如，上述代码中的 AuthorizationHeaderInterceptor 的作用就是在 HTTP 请求的消息头中嵌入保存在 AuthorizationHeaderHolder 中的 JWT Token，如下所示：

```java
public class AuthorizationHeaderInterceptor implements ClientHttpRequestInterceptor {

@Override
    public ClientHttpResponse intercept(
            HttpRequest request, byte[] body, ClientHttpRequestExecution execution)
            throws IOException {

	HttpHeaders headers = request.getHeaders();
        headers.add(AuthorizationHeader.AUTHORIZATION_HEADER, AuthorizationHeaderHolder.getAuthorizationHeader().getAuthorizationHeader());

        return execution.execute(request, body);
    }
}
```

至此，在微服务中嵌入 JWT 的完整过程已经完成。回到 intervention-service 中的 UserServiceClient 类，会发现它重新使用了前面所构建的 RestTemplate 对象来发起远程调用，代码如下所示：

```java
@Component
public class UserServiceClient {

@Autowired
	RestTemplate restTemplate;

public UserMapper getUserByUserName(String userName){

	ResponseEntity<UserMapper> restExchange =
                restTemplate.exchange(
                         "http://zuulservice:5555/springhealth/user/users/username/{userName}",
                       HttpMethod.GET,
                        null, UserMapper.class, userName);

	UserMapper user = restExchange.getBody();

        return user;
    }
}
```

## 如何扩展 JWT？

JWT 具有良好的可扩展性，开发人员可以根据需要在 JWT Token 中添加各种附加信息。

针对 JWT 的扩展性场景，Spring Security 专门提供了一个 TokenEnhancer 接口来对 Token 进行增强（Enhance），该接口定义如下：

```java
public interface TokenEnhancer {
    OAuth2AccessToken enhance(OAuth2AccessToken accessToken, OAuth2Authentication authentication);
}
```

可以看到这里处理的是一个 OAuth2AccessToken 接口，而该接口有一个默认的实现类 DefaultOAuth2AccessToken。可以通过该实现类的 setAdditionalInformation 方法以键值对的方式将附加信息添加到 OAuth2AccessToken 中，示例代码如下所示：

```java
public class SpringHealthJWTTokenEnhancer implements TokenEnhancer {

@Override
    public OAuth2AccessToken enhance(OAuth2AccessToken accessToken, OAuth2Authentication authentication) {
        Map<String, Object> systemInfo= new HashMap<>();

	systemInfo.put("system", "springhealth");

        ((DefaultOAuth2AccessToken) accessToken).setAdditionalInformation(systemInfo);
        return accessToken;
    }
}
```

这里以硬编码的方式添加了一个“system”属性，可根据需要进行相应的调整。

要使得上述 SpringHealthJWTTokenEnhancer 类能够生效，需要对 SpringHealthAuthorizationServerConfigurer 类中的 configure 方法进行重新配置，并将 SpringHealthJWTTokenEnhancer 嵌入到 TokenEnhancerChain 中（前文代码中已演示了这部分内容）。

扩展 JWT Token 之后，从这个 JWT Token 中获取所扩展的属性的方法也比较简单和固定，如下所示：

```java
//获取 JWTToken
RequestContext ctx = RequestContext.getCurrentContext();
String authorizationHeader = ctx.getRequest().getHeader(AUTHORIZATION_HEADER);
String jwtToken = authorizationHeader.replace("Bearer ","");

//解析 JWTToken
String[] split_string = jwtToken.split("\\.");
String base64EncodedBody = split_string[1];
Base64 base64Url = new Base64(true);
String body = new String(base64Url.decode(base64EncodedBody));
JSONObject jsonObj = new JSONObject(body);

//获取定制化属性值
String systemName = jsonObj.getString("system");
```

这段代码可以嵌入到需要使用自定义“system”属性的任何场景中。

## 实践要点

- JWT 是三段式结构（Header.Payload.Signature），每段都是 Base64 编码的 JSON，Header 与 Payload 可被任何工具反向解析，因此 JWT 不能存放敏感明文数据，防篡改能力由 Signature 保证。
- 授权服务器侧集成 JWT 的三个关键 Bean：JwtTokenStore（Token 存储）、JwtAccessTokenConverter（转换器，需设置签名键 signingKey）、DefaultTokenServices（绑定 TokenStore 并支持刷新 Token）。
- 授权服务器 configure 方法中通过 TokenEnhancerChain 串联自定义 TokenEnhancer 与 JwtAccessTokenConverter，实现 Token 增强。
- JWT 在服务链中的传播方案是“Filter + ThreadLocal + RestTemplate 拦截器”三件套：Filter 从请求头取出 Token，-Holder 封装类基于 ThreadLocal 保证线程安全，ClientHttpRequestInterceptor 在每次远程调用时自动回填“Authorization”头。
- OAuth2RestTemplate 只能传播普通 Token，无法传播 JWT，需自行按上述方案扩展 RestTemplate。
- TokenEnhancer 通过 DefaultOAuth2AccessToken.setAdditionalInformation 以键值对方式追加自定义属性；读取时按“.”分段取 Payload 段做 Base64 解码即可。

## 小结

本文关注微服务的认证问题而不是授权问题，为此引入了 JWT 机制。JWT 本质上也是一种 Token，只不过提供了标准化的规范定义，可以与 OAuth2 协议进行集成。使用 JWT 时，既可以通过 JwtTokenStore + JwtAccessTokenConverter 在授权服务器中签发标准 Token，也可以通过 Filter、ThreadLocal 与 RestTemplate 拦截器在微服务访问链路中传播 Token，还能借助 TokenEnhancer 轻松为 JWT 附加各种定制化的认证信息。

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
