---
title: "API 工程搭建和简单访问认证"
description: "两套 API 访问准入方案：Nginx auth_request 模块调用 SpringBoot 认证接口的流程与 default.conf 配置，以及 SpringBoot 整合 Shiro + JWT 登录发放 Token（JwtRealm/JwtFilter/ShiroConfig/ApiAccessController）的实现与功能验证。"
category: Java

---
# API 工程搭建和简单访问认证

在完成一个完整需求前，最好是先梳理需求，并把用于完成需求目标的各个功能节点进行单个验证，以确保方案的可行性。有了这些基本功能模块的验证后，就可以逐步再把各个模块像乐高积木一样搭建起来，搭建的过程就是架构和设计模式的运用。

本章的目标就是在 Nginx 访问接口时，做一些权限校验，只有校验通过才能访问接口，否则就直接返回失败

### 流程设计

整个流程为；以用户视角访问 API 开始，进入 Nginx 的 auth 认证模块，调用 SpringBoot 提供的认证服务。根据认证结果调用重定向到对应的 API 接口或者 404 页面


由于 OpenAI 或者本身自己训练的一套服务，都会有服务器成本。所以基于这样一个模型结构，后续可以通过用户购买 Token 的时效性进行成本回收。这也是其中一种商业变现的思路

### 方案实现

首先创建一个 SpringBoot 工程，并在工程中提供简单的 API 接口

```java
@SpringBootApplication
@RestController
public class Application {

  private Logger logger = LoggerFactory.getLogger(Application.class);

  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }

  @GetMapping("/verify")
  public ResponseEntity<String> verify(String token) {
    logger.info("验证 token：{}", token);
    if ("success".equals(token)){
      return ResponseEntity.status(HttpStatus.OK).build();
    } else {
      return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
    }
  }

  @GetMapping("/success")
  public String success(){
    return "test success by xfg";
  }
}
```

目前的工程还非常简单，只是在 Application 中提供了2个接口，一个认证，一个成功。在 verify 接口中，如果 `token == success 就返回 HttpStatus.OK == 200 的码，否则返回 HttpStatus.BAD_REQUEST == 400`  错误码

#### Nginx 配置

这里需要改动 11-Nginx基础概述 的 default.conf 配置文件，添加 auth 认证模块；

```11-Nginx基础概述
server {

  listen       80;
  server_name  192.168.1.101;

  # 首页
  index index.html;

  location / {
    root   /usr/share/11-Nginx基础概述/html;
    index  index.html index.htm;
  }

  location /api/ {
    auth_request /auth;
    # 鉴权通过后的处理方式
    proxy_pass http://127.0.0.1:8080/success;
  }

  location = /auth {
    # 发送子请求到HTTP服务，验证客户端的凭据，返回响应码
    internal;
    # 设置参数
    set $query '';
    if ($request_uri ~* "[^\?]+\?(.*)$") {
      set $query $1;
    }
    # 验证成功，返回200 OK
    proxy_pass http://127.0.0.1:8080/verify?$query;
    # 发送原始请求
    proxy_pass_request_body off;
    # 清空 Content-Type
    proxy_set_header Content-Type "";
  }

  error_page 404 /404.html;
  location = /40x.html {

  }

  error_page   500 502 503 504  /50x.html;
  location = /50x.html {
  }
}
```

用户访问 http://localhost/api 目标是到 `http://192.168.1.101:8080/success`  但这里添加了 auth 模块，所以会先进入 auth 的处理。

1. `= auth 是绝对匹配，没有 = 号就是前缀匹配。在 auth 中把请求 api 的参数获取到在访问到验证地址 http://192.168.1.101:8080/verify?$query`  如果接口返回一个 200 的码就通过，其他的码就失败
2. 注意：每次修改 11-Nginx基础概述 配置后，需要重启或者 reload 才会生效

### 功能验证

启动 chatgpt-api SpringBoot 服务

命令：`docker restart 11-Nginx基础概述`  或者在 portainer 页面重启 http://localhost:9000/#!/2/docker/containers

访问测试

- 正确验证：`http://localhost/api/?token=success` 
- 错误验证：`http://localhost/api/?token=123` 

## Shiro 登录授权发放访问 token

通过 SpringBoot 整合 Shiro + JWT 进行登录验证，发放使用API的准入 Token 信息。

用户使用 OpenAI 接口，如；http://localhost/api 时，需要根据用户身份标识做一些访问的验证和限定。最直接就是在使用 api 的时候把用户的账号和密码一同和访问 api 传递过来，如；http://localhost/api?userId=xfg&password=123 但这样就把用户的密码信息给泄漏了，是非常不安全的。

需要根据用户的账密，先通过登录验证的方式，发放一个 token，之后用户再使用这个 token 配置到链接后面使用。如；http://localhost/api?token=xxxxx 这样就安全多


### 方案实现

本章节大部分都是 Shiro、JWT 的基本操作，文章中不适合粘贴所有代码，所以读者可以结合视频、文章在于对应分支的代码一起学习，效果会更好

#### 工程结构


本章新增的核心代码：IApiAccessService、JwtToken、JwtRealm、JwtFilter、JwtUtil、ShiroConfig、Constants、ApiAccessController（工程结构可对照仓库分支源码查看）：

1. JwtToken：Token 的对象信息，你可以设置用户ID、用户密码
2. JwtRealm：一个自定义的验证服务，需要继承 AuthorizingRealm 类
3. JwtFilter：自定义的 Filter 过滤器
4. JwtUtil：token的创建、解析、验证工具类
5. ShiroConfig：Shiro 的一个配置启动类
6. ApiAccessController：新增加的 API 访问准入管理；当访问 OpenAI 接口时，需要进行准入验证

#### JwtRealm 验证配置

**源码**：`cn.bugstack.chatgpt.domain.security.service.realm.JwtRealm`

在 doGetAuthenticationInfo 方法中，使用 jwtUtil.isVerify(jwt) 方法做验证处理

```java
@Override
protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken token) throws AuthenticationException {
  String jwt = (String) token.getPrincipal();
  if (jwt == null) {
    throw new NullPointerException("jwtToken 不允许为空");
  }
  // 判断
  if (!jwtUtil.isVerify(jwt)) {
    throw new UnknownAccountException();
  }
  // 可以获取username信息，并做一些处理
  String username = (String) jwtUtil.decode(jwt).get("username");
  logger.info("鉴权用户 username：{}", username);
  return new SimpleAuthenticationInfo(jwt, jwt, "JwtRealm");
}
```

#### JwtFilter 过滤器

**源码**：`cn.bugstack.chatgpt.domain.security.service.JwtFilter`

这是一个自定义的 Filter 在 onAccessDenied 获取 request 请求的 token 入参信息，之后调用 getSubject 进行验证处理

```java
public class JwtFilter extends AccessControlFilter {

  private Logger logger = LoggerFactory.getLogger(JwtFilter.class);

  /**
     * isAccessAllowed 判断是否携带有效的 JwtToken
     * 所以这里直接返回一个 false，让它走 onAccessDenied 方法流程
     */
  @Override
  protected boolean isAccessAllowed(ServletRequest request, ServletResponse response, Object mappedValue) throws Exception {
    return false;
  }

  /**
     * 返回结果为true表明登录通过
     */
  @Override
  protected boolean onAccessDenied(ServletRequest servletRequest, ServletResponse servletResponse) throws Exception {
    HttpServletRequest request = (HttpServletRequest) servletRequest;
    // 如果你设定的 token 放到 header 中，则可以这样获取；request.getHeader("Authorization");
    JwtToken jwtToken = new JwtToken(request.getParameter("token"));
    try {
      // 鉴权认证
      getSubject(servletRequest, servletResponse).login(jwtToken);
      return true;
    } catch (Exception e) {
      logger.error("鉴权认证失败", e);
      onLoginFail(servletResponse);
      return false;
    }
  }

  /**
     * 鉴权认证失败时默认返回 401 状态码
     */
  private void onLoginFail(ServletResponse response) throws IOException {
    HttpServletResponse httpResponse = (HttpServletResponse) response;
    httpResponse.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
    httpResponse.getWriter().write("Auth Err!");
  }
}
```

####  ShiroConfig 启动配置

**源码**：`cn.bugstack.chatgpt.domain.security.service.ShiroConfig`

这部分是一个设置过滤器和拦截处理，把 jwt 的过滤器设置上，之后拦截指定的 /verify 方法。如果是 /** 就是拦截所有除了 login、logout 配置的其他方法了。通常也是 Web 请求的一些配置操作

```java
@Bean
public ShiroFilterFactoryBean shiroFilterFactoryBean() {
  ShiroFilterFactoryBean shiroFilter = new ShiroFilterFactoryBean();
  shiroFilter.setSecurityManager(securityManager());
  shiroFilter.setLoginUrl("/unauthenticated");
  shiroFilter.setUnauthorizedUrl("/unauthorized");
  // 添加jwt过滤器
  Map<String, Filter> filterMap = new HashMap<>();
  // 设置过滤器【anon\logout可以不设置】
  filterMap.put("anon", new AnonymousFilter());
  filterMap.put("jwt", new JwtFilter());
  filterMap.put("logout", new LogoutFilter());
  shiroFilter.setFilters(filterMap);
  // 拦截器，指定方法走哪个拦截器 【login->anon】【logout->logout】【verify->jwt】
  Map<String, String> filterRuleMap = new LinkedHashMap<>();
  filterRuleMap.put("/login", "anon");
  filterRuleMap.put("/logout", "logout");
  filterRuleMap.put("/verify", "jwt");
  shiroFilter.setFilterChainDefinitionMap(filterRuleMap);
  return shiroFilter;
}
```

#### ApiAccessController

这是本章节新增加的一个类，专门用于授权分配Token和验证处理的操作。不过这里的登录目前还没有走数据库，只是简单的验证处理。

测试：http://localhost:8080/authorize?username=xfg&password=123 - 你会获得一个 Token 信息。用于访问 http://localhost/api?token=【添加到这里】 - 这个地址是 Nginx 提供的，在上一个章节有讲解【**[chatgpt-api 第1节：API工程搭建和简单访问认证](https://t.zsxq.com/0dcdSvckQ)**】。

```java
@RestController
public class ApiAccessController {

  private Logger logger = LoggerFactory.getLogger(ApiAccessController.class);

  /**
     * http://localhost:8080/authorize?username=xfg&password=123
     */
  @RequestMapping("/authorize")
  public ResponseEntity<Map<String, String>> authorize(String username, String password) {
    Map<String, String> map = new HashMap<>();
    // 模拟账号和密码校验
    if (!"xfg".equals(username) || !"123".equals(password)) {
      map.put("msg", "用户名密码错误");
      return ResponseEntity.ok(map);
    }
    // 校验通过生成token
    JwtUtil jwtUtil = new JwtUtil();
    Map<String, Object> claim = new HashMap<>();
    claim.put("username", username);
    String jwtToken = jwtUtil.encode(username, 5 * 60 * 1000, claim);
    map.put("msg", "授权成功");
    map.put("token", jwtToken);
    // 返回token码
    return ResponseEntity.ok(map);
  }

  /**
     * http://localhost:8080/verify?token=
     */
  @RequestMapping("/verify")
  public ResponseEntity<String> verify(String token) {
    logger.info("验证 token：{}", token);
    return ResponseEntity.status(HttpStatus.OK).body("verify success!");
  }

  @RequestMapping("/success")
  public String success(){
    return "test success by xfg";
  }
}
```

### **功能验证**

授权Token：**http://localhost:8080/authorize?username=xfg&password=123** - 服务启动，访问地址，获取Token

使用Token：**http://localhost/api/?token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4ZmciLCJleHAiOjE2ODMxMDQ4ODcsImlhdCI6MTY4MzEwNDU4NywianRpIjoiYzg5Y2YyZTQtODdiMy00ZjcyLWE0NTUtNTA4YTVkZjQxMTViIiwidXNlcm5hbWUiOiJ4ZmcifQ.Vy5QTZ8iDzOt-fGd_NKrT_IOBce8mBEx0gV0o0zHfaY** - 把上面返回的 Token 复制到这里就可以

Token 可以压缩，缩短字符串。你可以尝试下做这个优化处理。这个 Token 也就是一般付费模式中，购买的东西，购买后因为本身都是在一个系统下登录的话，那么用户是感知不到的。但实际上就是这么一个东西来驱动流程执行

## 版本差异(API 鉴权 → 当前)

| 特性 | 旧版（2023） | 当前 |
|------|--------------|------|
| 鉴权方案 | Shiro + JWT（自研 token） | 不变，仍是主流；也可用 Spring Security + JWT |
| JWT 库 | jjwt 0.9.x | jjwt 0.12.x（API 包名 jjwt-api/jjwt-impl） |
| 模型 | gpt-3.5-turbo | gpt-4o / gpt-4.1 系列（官方接口已多次迭代） |
| Spring Boot | 2.x | 3.5.x（jakarta） |

> 鉴权核心思路（登录发放 token → 请求携带 token → 拦截器校验）不随版本变化；JWT 库与 OpenAI 模型名需按当前版本调整。
