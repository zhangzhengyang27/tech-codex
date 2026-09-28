---
title: "过滤器链与SecurityContext"
description: "Spring Security 真正的核心不是某一个注解，而是整条安全过滤器链。很多\"为什么登录后还是 401\"\"为什么权限明明有却被拦\"这类问题，最后都要回到："
keywords: []
category: "Java"
tags: [Java, SpringSecurity]
---


# 过滤器链与 SecurityContext

Spring Security 真正的核心不是某一个注解，而是整条安全过滤器链。很多"为什么登录后还是 401""为什么权限明明有却被拦"这类问题，最后都要回到：

- 请求经过了哪些过滤器
-  里到底有没有认证信息

理解这条链路，才能真正排查 Spring Security 问题。

## 过滤器链解决什么问题

Spring Security 会在请求进入业务 Controller 之前，先经过一组安全过滤器，负责：

- 认证（Authentication）:确认用户是谁
- 授权（Authorization）:确认用户能做什么
- 异常处理：认证或授权失败时的响应
- 会话与上下文管理：维护用户登录状态

这意味着安全逻辑不是"控制器里手写 if 判断"，而是由框架统一在入口层处理。

### 过滤器链的核心价值

**1. 统一入口**
```
所有请求 → 过滤器链 → Controller
         ↓
    安全逻辑统一处理
```

**2. 关注点分离**
```java
// × 不推荐:在 Controller 中处理安全逻辑
@GetMapping("/orders")
public List<Order> getOrders(Authentication auth) {
    if (!auth.getAuthorities().contains("ORDER_READ")) {
        throw new AccessDeniedException();
    }
    return orderService.findAll();
}

// √ 推荐:在过滤器链中配置
@GetMapping("/orders")
@PreAuthorize("hasAuthority('ORDER_READ')")
public List<Order> getOrders() {
    return orderService.findAll();
}
```

**3. 可插拔设计**
- 添加新的认证方式只需添加过滤器
- 修改授权策略只需调整配置
- 不同模块可以有独立的安全链

## Spring Security 过滤器链结构

### 核心过滤器列表

Spring Security 的过滤器链由一系列有序的过滤器组成，每个过滤器负责特定的安全功能：

```
请求 → SecurityContextPersistenceFilter
     → LogoutFilter
     → UsernamePasswordAuthenticationFilter
     → DefaultLoginPageGeneratingFilter
     → DefaultLogoutPageGeneratingFilter
     → BasicAuthenticationFilter
     → RequestCacheAwareFilter
     → SecurityContextHolderAwareRequestFilter
     → SessionManagementFilter
     → ExceptionTranslationFilter
     → FilterSecurityInterceptor
     → Controller
```

::: warning 过滤器命名的版本差异
上面的链条是 Spring Security 5.x 的经典命名。在 6.x 中有两处更名： → （职责拆分）； → （ 的新授权实现）。职责与顺序基本不变，下文按经典命名讲解。
:::

### 关键过滤器详解

#### 1. SecurityContextPersistenceFilter

**职责**：管理 SecurityContext 的生命周期

**工作流程**:
```
请求进入:
1. 从 Session 中加载 SecurityContext(如果存在)
2. 设置到 SecurityContextHolder

请求结束:
1. 从 SecurityContextHolder 获取 SecurityContext
2. 保存到 Session
3. 清空 SecurityContextHolder
```

**关键代码**:
```java
public class SecurityContextPersistenceFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) {
        
        HttpRequestResponseHolder holder = 
            new HttpRequestResponseHolder(request, response);
        
        // 请求开始:从仓库加载 SecurityContext
        SecurityContext contextBeforeChainExecution = 
            repo.loadContext(holder);
        
        try {
            // 设置到 ThreadLocal
            SecurityContextHolder.setContext(contextBeforeChainExecution);
            
            // 继续过滤器链
            filterChain.doFilter(holder.getRequest(), holder.getResponse());
            
        } finally {
            // 请求结束:保存 SecurityContext
            SecurityContext contextAfterChainExecution = 
                SecurityContextHolder.getContext();
            
            repo.saveContext(contextAfterChainExecution, 
                holder.getRequest(), holder.getResponse());
            
            // 清空 ThreadLocal,防止内存泄漏
            SecurityContextHolder.clearContext();
        }
    }
}
```

**注意事项**:
-  必须在其他安全过滤器之前执行
-  请求结束后必须清空 SecurityContextHolder
-  如果使用 JWT 无状态认证，可以禁用此过滤器

#### 2. UsernamePasswordAuthenticationFilter

**职责**：处理表单登录认证

**工作流程**:
```
POST /login
  ↓
1. 提取用户名和密码
2. 构造 UsernamePasswordAuthenticationToken
3. 调用 AuthenticationManager 认证
4. 认证成功:保存到 SecurityContext
5. 认证失败:抛出异常
```

**关键代码**:
```java
public class UsernamePasswordAuthenticationFilter 
        extends AbstractAuthenticationProcessingFilter {
    
    public UsernamePasswordAuthenticationFilter() {
        super(new AntPathRequestMatcher("/login", "POST"));
    }
    
    @Override
    public Authentication attemptAuthentication(
            HttpServletRequest request,
            HttpServletResponse response) {
        
        // 1. 提取用户名密码
        String username = obtainUsername(request);
        String password = obtainPassword(request);
        
        // 2. 构造未认证的 Token
        UsernamePasswordAuthenticationToken authRequest = 
            new UsernamePasswordAuthenticationToken(username, password);
        
        // 3. 调用 AuthenticationManager 认证
        return this.getAuthenticationManager().authenticate(authRequest);
    }
    
    // 认证成功回调
    @Override
    protected void successfulAuthentication(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain,
            Authentication authResult) {
        
        // 保存到 SecurityContext
        SecurityContextHolder.getContext().setAuthentication(authResult);
        
        // 调用成功处理器
        successHandler.onAuthenticationSuccess(request, response, authResult);
    }
}
```

**自定义登录路径**:
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .formLogin(form -> form
            .loginPage("/login")
            .loginProcessingUrl("/auth/login")
            .usernameParameter("username")
            .passwordParameter("password")
            .successHandler(new SimpleUrlAuthenticationSuccessHandler("/home"))
            .failureHandler(new SimpleUrlAuthenticationFailureHandler("/login?error"))
        );
    
    return http.build();
}
```

#### 3. BasicAuthenticationFilter

**职责**：处理 HTTP Basic 认证

**工作原理**:
```
请求头: Authorization: Basic dXNlcm5hbWU6cGFzc3dvcmQ=
                            ↓
                 Base64 解码
                            ↓
                 username:password
                            ↓
                 调用 AuthenticationManager 认证
```

**关键代码**:
```java
public class BasicAuthenticationFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) {
        
        // 1. 提取 Authorization 头
        String header = request.getHeader("Authorization");
        
        if (header == null || !header.startsWith("Basic ")) {
            filterChain.doFilter(request, response);
            return;
        }
        
        // 2. 解码 Base64
        String[] tokens = extractAndDecodeHeader(header, request);
        String username = tokens[0];
        String password = tokens[1];
        
        // 3. 构造认证 Token
        UsernamePasswordAuthenticationToken authRequest = 
            new UsernamePasswordAuthenticationToken(username, password);
        
        // 4. 认证
        Authentication authResult = 
            authenticationManager.authenticate(authRequest);
        
        // 5. 保存到 SecurityContext
        SecurityContextHolder.getContext().setAuthentication(authResult);
        
        filterChain.doFilter(request, response);
    }
}
```

**启用 Basic 认证**:
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .authorizeHttpRequests(authz -> authz
            .anyRequest().authenticated()
        )
        .httpBasic(Customizer.withDefaults());
    
    return http.build();
}
```

#### 4. LogoutFilter

**职责**：处理用户登出

**工作流程**:
```
POST /logout
  ↓
1. 验证 CSRF Token(如果启用)
2. 执行登出处理器链
   - SecurityContextLogoutHandler:清空 SecurityContext
   - CookieClearingLogoutHandler:清除 Cookie
   - CsrfLogoutHandler:清除 CSRF Token
3. 调用登出成功处理器
```

**关键代码**:
```java
public class LogoutFilter extends GenericFilter {
    
    private LogoutHandler handler;
    private LogoutSuccessHandler logoutSuccessHandler;
    
    @Override
    public void doFilter(
            ServletRequest request,
            ServletResponse response,
            FilterChain chain) {
        
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse res = (HttpServletResponse) response;
        
        // 检查是否是登出请求
        if (requiresLogout(req)) {
            // 执行登出处理器链
            handler.logout(req, res, 
                SecurityContextHolder.getContext().getAuthentication());
            
            // 调用成功处理器
            logoutSuccessHandler.onLogoutSuccess(req, res, 
                SecurityContextHolder.getContext().getAuthentication());
            
            return;
        }
        
        chain.doFilter(request, response);
    }
}
```

**自定义登出配置**:
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .logout(logout -> logout
            .logoutUrl("/auth/logout")
            .logoutSuccessUrl("/login?logout")
            .addLogoutHandler(new CookieClearingLogoutHandler("JSESSIONID", "remember-me"))
            .deleteCookies("JSESSIONID")
        );
    
    return http.build();
}
```

#### 5. ExceptionTranslationFilter

**职责**：处理认证和授权异常

**工作流程**:
```
捕获异常:
  ↓
AuthenticationException (认证失败)
  ↓
AuthenticationEntryPoint.commence()
  → 重定向到登录页或返回 401

AccessDeniedException (授权失败)
  ↓
AccessDeniedHandler.handle()
  → 返回 403 或自定义响应
```

**关键代码**:
```java
public class ExceptionTranslationFilter extends GenericFilter {
    
    private AuthenticationEntryPoint authenticationEntryPoint;
    private AccessDeniedHandler accessDeniedHandler;
    
    @Override
    public void doFilter(
            ServletRequest request,
            ServletResponse response,
            FilterChain chain) {
        
        try {
            chain.doFilter(request, response);
            
        } catch (AuthenticationException ex) {
            // 认证异常:启动认证流程
            authenticationEntryPoint.commence(
                (HttpServletRequest) request,
                (HttpServletResponse) response,
                ex
            );
            
        } catch (AccessDeniedException ex) {
            // 授权异常:检查是否已认证
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            
            if (auth == null || auth.isAuthenticated() == false) {
                // 未认证:启动认证流程
                authenticationEntryPoint.commence(
                    (HttpServletRequest) request,
                    (HttpServletResponse) response,
                    new InsufficientAuthenticationException("Not authenticated", ex)
                );
            } else {
                // 已认证但权限不足:调用 AccessDeniedHandler
                accessDeniedHandler.handle(
                    (HttpServletRequest) request,
                    (HttpServletResponse) response,
                    ex
                );
            }
        }
    }
}
```

**自定义异常处理**:
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .exceptionHandling(exceptions -> exceptions
            .authenticationEntryPoint((request, response, authException) -> {
                // 返回 JSON 而非重定向
                response.setContentType("application/json;charset=UTF-8");
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().write(
                    "{\"code\":401,\"message\":\"未登录或登录已过期\"}"
                );
            })
            .accessDeniedHandler((request, response, accessDeniedException) -> {
                // 权限不足返回 JSON
                response.setContentType("application/json;charset=UTF-8");
                response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                response.getWriter().write(
                    "{\"code\":403,\"message\":\"权限不足\"}"
                );
            })
        );
    
    return http.build();
}
```

#### 6. FilterSecurityInterceptor

**职责**：最终授权决策

**工作原理**:
```
请求 → FilterSecurityInterceptor
          ↓
     检查配置的授权规则
          ↓
     调用 AccessDecisionManager.decide()
          ↓
     投票机制:
     - AffirmativeBased:一票通过
     - ConsensusBased:少数服从多数
     - UnanimousBased:全票通过
          ↓
     通过:继续到 Controller
     拒绝:抛出 AccessDeniedException
```

**关键代码**:
```java
public class FilterSecurityInterceptor extends AbstractSecurityInterceptor 
        implements Filter {
    
    @Override
    public void doFilter(
            ServletRequest request,
            ServletResponse response,
            FilterChain chain) {
        
        FilterInvocation fi = new FilterInvocation(request, response, chain);
        
        invoke(fi);
    }
    
    public void invoke(FilterInvocation fi) {
        // 检查是否已处理过
        if (fi.getRequest() != null && fi.getRequest().getAttribute(FILTER_APPLIED) != null) {
            fi.getChain().doFilter(fi.getRequest(), fi.getResponse());
            return;
        }
        
        // 标记为已处理
        fi.getRequest().setAttribute(FILTER_APPLIED, Boolean.TRUE);
        
        // 执行授权检查
        InterceptorStatusToken token = super.beforeInvocation(fi);
        
        try {
            fi.getChain().doFilter(fi.getRequest(), fi.getResponse());
        } finally {
            super.afterInvocation(token, null);
        }
    }
}
```

**配置授权规则**:
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .authorizeHttpRequests(authz -> authz
            .requestMatchers("/public/**").permitAll()
            .requestMatchers("/admin/**").hasRole("ADMIN")
            .requestMatchers("/user/**").hasAnyRole("USER", "ADMIN")
            .anyRequest().authenticated()
        );
    
    return http.build();
}
```

### 过滤器顺序的重要性

过滤器链是有顺序的。顺序错了，常见问题包括：

- 认证过滤器执行太晚，授权时上下文还是空的
- 异常处理链路不对，错误信息不符合预期
- 某些过滤器提前短路，后面的认证逻辑根本没执行

这也是为什么自定义过滤器时，经常要显式指定加在谁前面或后面。

#### 过滤器顺序配置

**添加自定义过滤器**:
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        // 在指定过滤器之前添加
        .addFilterBefore(jwtAuthenticationFilter(), 
            UsernamePasswordAuthenticationFilter.class)
        
        // 在指定过滤器之后添加
        .addFilterAfter(apiKeyFilter(), 
            BasicAuthenticationFilter.class)
        
        // 在指定位置添加
        .addFilterAt(customFilter(), 
            UsernamePasswordAuthenticationFilter.class);
    
    return http.build();
}
```

**过滤器位置常量**:
```java
// Spring Security 内部的过滤器顺序登记表（节选示意）
// 实际实现为包私有的 FilterOrderRegistration（6.x；5.x 中为 FilterComparator），
// 开发者不能直接引用，自定义过滤器应通过 addFilterBefore/addFilterAfter 定位
final class FilterOrderRegistration {
    public static final int FIRST = Integer.MIN_VALUE;
    public static final int CHANNEL_FILTER = FIRST + 100;
    public static final int SECURITY_CONTEXT_FILTER = CHANNEL_FILTER + 100;
    public static final int CONCURRENT_SESSION_FILTER = SECURITY_CONTEXT_FILTER + 100;
    public static final int LOGOUT_FILTER = CONCURRENT_SESSION_FILTER + 100;
    public static final int X509_FILTER = LOGOUT_FILTER + 100;
    public static final int PRE_AUTH_FILTER = X509_FILTER + 100;
    public static final int CAS_FILTER = PRE_AUTH_FILTER + 100;
    public static final int FORM_LOGIN_FILTER = CAS_FILTER + 100;
    public static final int OPENID_FILTER = FORM_LOGIN_FILTER + 100;
    public static final int LOGIN_PAGE_FILTER = OPENID_FILTER + 100;
    public static final int DIGEST_FILTER = LOGIN_PAGE_FILTER + 100;
    public static final int BASIC_FILTER = DIGEST_FILTER + 100;
    public static final int REQUEST_CACHE_FILTER = BASIC_FILTER + 100;
    public static final int SERVLET_API_SUPPORT_FILTER = REQUEST_CACHE_FILTER + 100;
    public static final int JAAS_API_SUPPORT_FILTER = SERVLET_API_SUPPORT_FILTER + 100;
    public static final int REMEMBER_ME_FILTER = JAAS_API_SUPPORT_FILTER + 100;
    public static final int ANONYMOUS_FILTER = REMEMBER_ME_FILTER + 100;
    public static final int SESSION_MANAGEMENT_FILTER = ANONYMOUS_FILTER + 100;
    public static final int EXCEPTION_TRANSLATION_FILTER = SESSION_MANAGEMENT_FILTER + 100;
    public static final int FILTER_SECURITY_INTERCEPTOR = EXCEPTION_TRANSLATION_FILTER + 100;
    public static final int SWITCH_USER_FILTER = FILTER_SECURITY_INTERCEPTOR + 100;
    public static final int LAST = Integer.MAX_VALUE;
}
```

## SecurityContext 是什么

 可以理解为当前请求的安全上下文。里面最关键的是  对象，它通常描述：

- 当前请求是谁
- 是否已经认证
- 拥有哪些角色和权限

后续很多授权动作，本质上都是基于这个上下文完成的。

### SecurityContext 接口定义

```java
public interface SecurityContext extends Serializable {
    
    // 获取当前认证对象
    Authentication getAuthentication();
    
    // 设置认证对象
    void setAuthentication(Authentication authentication);
}
```

### Authentication 接口详解

 是 Spring Security 中最核心的概念之一：

```java
public interface Authentication extends Principal, Serializable {
    
    // 获取权限列表
    Collection<? extends GrantedAuthority> getAuthorities();
    
    // 获取凭证(通常是密码,认证后会清除)
    Object getCredentials();
    
    // 获取额外信息(如 IP、Session ID 等)
    Object getDetails();
    
    // 获取主体(通常是用户名)
    Object getPrincipal();
    
    // 是否已认证
    boolean isAuthenticated();
    
    // 设置认证状态
    void setAuthenticated(boolean isAuthenticated);
}
```

### 常见 Authentication 实现类

#### 1. UsernamePasswordAuthenticationToken

用于用户名密码认证：

```java
// 未认证状态
UsernamePasswordAuthenticationToken unauthenticated = 
    new UsernamePasswordAuthenticationToken("username", "password");

// 已认证状态
UsernamePasswordAuthenticationToken authenticated = 
    new UsernamePasswordAuthenticationToken(
        "username",        // principal:用户名或用户对象
        null,              // credentials:认证后清除
        authorities        // authorities:权限列表
    );
```

#### 2. JwtAuthenticationToken

用于 JWT 资源服务器认证（ 场景，由认证转换器构建）：

```java
// 解析 JWT 后构造
JwtAuthenticationToken token = new JwtAuthenticationToken(
    jwt,           // JWT 对象
    authorities    // 从 JWT 中提取的权限
);
```

#### 3. PreAuthenticatedAuthenticationToken

用于预认证场景（如 X.509 证书）:

```java
PreAuthenticatedAuthenticationToken token = 
    new PreAuthenticatedAuthenticationToken(
        principal,    // 主体对象
        credentials,  // 凭证
        authorities   // 权限
    );
```

#### 4. AnonymousAuthenticationToken

用于匿名用户：

```java
AnonymousAuthenticationToken anonymous = 
    new AnonymousAuthenticationToken(
        "key",            // 匿名用户标识
        "anonymousUser",  // 用户名
        Arrays.asList(new SimpleGrantedAuthority("ROLE_ANONYMOUS"))
    );
```

### SecurityContextHolder 工作原理

 是 SecurityContext 的持有者，使用 ThreadLocal 存储每个线程的安全上下文：

```java
public class SecurityContextHolder {
    
    // 默认使用 ThreadLocal 模式
    private static final ThreadLocalSecurityContextHolderStrategy strategy = 
        new ThreadLocalSecurityContextHolderStrategy();
    
    // 获取当前上下文
    public static SecurityContext getContext() {
        return strategy.getContext();
    }
    
    // 设置当前上下文
    public static void setContext(SecurityContext context) {
        strategy.setContext(context);
    }
    
    // 清空当前上下文
    public static void clearContext() {
        strategy.clearContext();
    }
}
```

#### 安全上下文存储策略

Spring Security 提供了三种存储策略：

**1. ThreadLocalSecurityContextHolderStrategy（默认）**
```java
// 每个线程独立的 SecurityContext
private static final ThreadLocal<SecurityContext> contextHolder = 
    new ThreadLocal<>();

public SecurityContext getContext() {
    SecurityContext ctx = contextHolder.get();
    if (ctx == null) {
        ctx = createEmptyContext();
        contextHolder.set(ctx);
    }
    return ctx;
}
```

**适用场景**:
- 标准的请求-响应模型
- 每个请求一个线程
- 最常用、性能最好

**2. InheritableThreadLocalSecurityContextHolderStrategy**
```java
// 子线程继承父线程的 SecurityContext
private static final InheritableThreadLocal<SecurityContext> contextHolder = 
    new InheritableThreadLocal<>();
```

**适用场景**:
- 需要在子线程中使用父线程的安全上下文
- 异步任务需要父线程的认证信息

**注意事项**:
-  线程池场景下可能出问题（线程复用）
-  需要配合 DelegatingSecurityContextRunnable 使用

**3. GlobalSecurityContextHolderStrategy**
```java
// 全局共享一个 SecurityContext
private static SecurityContext context;
```

**适用场景**:
- 单线程应用
- 客户端应用（非 Web）

**配置策略**:
```java
// 在应用启动时配置
SecurityContextHolder.setStrategyName(SecurityContextHolder.MODE_THREADLOCAL);
// 或
SecurityContextHolder.setStrategyName(SecurityContextHolder.MODE_INHERITABLETHREADLOCAL);
// 或
SecurityContextHolder.setStrategyName(SecurityContextHolder.MODE_GLOBAL);
```

## 认证信息是怎么放进去的

一个典型流程通常如下：

1. 请求进入过滤器链
2. 某个认证过滤器提取凭证
3. 校验成功后构造认证对象
4. 写入 
5. 后续授权过滤器基于它判断是否放行

如果上下文没写进去，后面所有权限判断都会失败。

### 认证流程完整示例

#### 1. 表单登录认证流程

```
1. 用户提交登录表单
   POST /login?username=user&password=pass
     ↓
2. UsernamePasswordAuthenticationFilter 拦截
   - 提取用户名密码
   - 构造 UsernamePasswordAuthenticationToken
     ↓
3. AuthenticationManager 认证
   - 委托 ProviderManager
   - 遍历 AuthenticationProvider 列表
   - 找到支持的 Provider(如 DaoAuthenticationProvider)
     ↓
4. DaoAuthenticationProvider 认证
   - 调用 UserDetailsService.loadUserByUsername()
   - 获取用户信息(UserDetails)
   - 校验密码(passwordEncoder.matches())
   - 构造已认证的 UsernamePasswordAuthenticationToken
     ↓
5. 写入 SecurityContext
   SecurityContextHolder.getContext().setAuthentication(authentication);
     ↓
6. 调用成功处理器
   - 重定向到首页或返回 JSON
```

#### 2. JWT 认证流程

```
1. 请求携带 JWT
   GET /api/user
   Header: Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...
     ↓
2. JwtAuthenticationFilter 拦截
   - 提取 Authorization 头
   - 解析 JWT
   - 验证签名和过期时间
     ↓
3. 构造 Authentication
   - 从 JWT 中提取用户信息
   - 从 JWT 中提取权限列表
   - 构造 JwtAuthenticationToken
     ↓
4. 写入 SecurityContext
   SecurityContextHolder.getContext().setAuthentication(authentication);
     ↓
5. 继续过滤器链
   - FilterSecurityInterceptor 进行授权检查
   - 到达 Controller
```

## JWT 模式下的典型链路

在前后端分离项目里，常见做法是：

- 从请求头里读取 
- 校验 Token
- 解析用户身份和权限
- 构造 
- 写入 

如果顺序或写入逻辑出了问题，就会表现为：

- 明明带了 Token 还是 401
- 能认证成功，但权限判断失败

### 完整的 JWT 认证实现

#### 1. JWT 工具类

```java
@Component
public class JwtTokenProvider {
    
    @Value("${jwt.secret}")
    private String secretKey;
    
    @Value("${jwt.expiration}")
    private long expiration;
    
    private Key getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
    
    // 生成 Token
    public String generateToken(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);
        
        return Jwts.builder()
            .setSubject(userPrincipal.getId())
            .claim("username", userPrincipal.getUsername())
            .claim("roles", userPrincipal.getAuthorities())
            .setIssuedAt(now)
            .setExpiration(expiryDate)
            .signWith(getSigningKey(), SignatureAlgorithm.HS512)
            .compact();
    }
    
    // 解析 Token
    public Claims parseToken(String token) {
        try {
            return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
        } catch (JwtException ex) {
            throw new InvalidTokenException("Invalid JWT token", ex);
        }
    }
    
    // 验证 Token
    public boolean validateToken(String token) {
        try {
            Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token);
            return true;
        } catch (JwtException ex) {
            return false;
        }
    }
}
```

#### 2. JWT 认证过滤器

```java
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Autowired
    private JwtTokenProvider tokenProvider;
    
    @Autowired
    private UserDetailsService userDetailsService;
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        
        try {
            // 1. 从请求头提取 JWT
            String jwt = getJwtFromRequest(request);
            
            if (StringUtils.hasText(jwt) && tokenProvider.validateToken(jwt)) {
                // 2. 解析 JWT 获取用户 ID
                Claims claims = tokenProvider.parseToken(jwt);
                String userId = claims.getSubject();
                
                // 3. 加载用户信息
                UserDetails userDetails = 
                    userDetailsService.loadUserByUsername(userId);
                
                // 4. 构造 Authentication
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                    );
                
                // 5. 设置详细信息
                authentication.setDetails(
                    new WebAuthenticationDetailsSource().buildDetails(request)
                );
                
                // 6. 写入 SecurityContext
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
            
        } catch (Exception ex) {
            logger.error("Could not set user authentication in security context", ex);
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
```

#### 3. 配置 SecurityFilterChain

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    
    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter();
    }
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) 
            throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/auth/**").permitAll()
                .anyRequest().authenticated()
            )
            // 添加 JWT 过滤器
            .addFilterBefore(jwtAuthenticationFilter(), 
                UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    public AuthenticationManager authenticationManager(
            UserDetailsService userDetailsService,
            PasswordEncoder passwordEncoder) {
        
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        
        return new ProviderManager(provider);
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

#### 4. 登录接口

```java
@RestController
@RequestMapping("/auth")
public class AuthController {
    
    @Autowired
    private AuthenticationManager authenticationManager;
    
    @Autowired
    private JwtTokenProvider tokenProvider;
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // 1. 认证
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(
                request.getUsername(),
                request.getPassword()
            )
        );
        
        // 2. 写入 SecurityContext
        SecurityContextHolder.getContext().setAuthentication(authentication);
        
        // 3. 生成 JWT
        String token = tokenProvider.generateToken(authentication);
        
        return ResponseEntity.ok(new JwtAuthenticationResponse(token));
    }
}
```

## 为什么过滤器顺序很重要

过滤器链是有顺序的。顺序错了，常见问题包括：

- 认证过滤器执行太晚，授权时上下文还是空的
- 异常处理链路不对，错误信息不符合预期
- 某些过滤器提前短路，后面的认证逻辑根本没执行

这也是为什么自定义过滤器时，经常要显式指定加在谁前面或后面。

### 常见顺序错误示例

#### 错误示例 1:JWT 过滤器在 SecurityContextPersistenceFilter 之前

```java
// × 错误:JWT 过滤器在 SecurityContextPersistenceFilter 之前
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) {
    http
        .addFilterBefore(jwtFilter(), SecurityContextPersistenceFilter.class);
    // 问题:SecurityContext 还没初始化,无法设置 Authentication
    return http.build();
}

// √ 正确:JWT 过滤器在 UsernamePasswordAuthenticationFilter 之前
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) {
    http
        .addFilterBefore(jwtFilter(), UsernamePasswordAuthenticationFilter.class);
    // 此时 SecurityContext 已加载,可以设置 Authentication
    return http.build();
}
```

#### 错误示例 2:异常处理过滤器位置不当

```java
// × 错误:ExceptionTranslationFilter 在 FilterSecurityInterceptor 之后
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) {
    http
        .addFilterAfter(exceptionTranslationFilter(), FilterSecurityInterceptor.class);
    // 问题:FilterSecurityInterceptor 抛出的异常无法被捕获
    return http.build();
}

// √ 正确:ExceptionTranslationFilter 应该在 FilterSecurityInterceptor 之前
// Spring Security 默认配置已经正确处理,无需手动添加
```

#### 错误示例 3:自定义过滤器短路了过滤器链

```java
// × 错误:过滤器不调用 filterChain.doFilter()
public class BadFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) {
        // 处理逻辑
        // 问题:忘记调用 filterChain.doFilter(),请求被拦截
        return;
    }
}

// √ 正确:必须调用 filterChain.doFilter()
public class GoodFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        // 处理逻辑
        filterChain.doFilter(request, response); // 必须调用
    }
}
```

## 示例代码

下面是一个简化的 JWT 认证过滤器示意：

```java
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            String token = authorization.substring(7);

            String username = parseUsername(token);
            List<GrantedAuthority> authorities = List.of(
                    new SimpleGrantedAuthority("order:read")
            );

            Authentication authentication =
                    new UsernamePasswordAuthenticationToken(username, null, authorities);

            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    private String parseUsername(String token) {
        return "demo-user";
    }
}
```

这个例子体现了两件最关键的事：

- 从请求中提取并校验凭证
- 把认证结果写入 

### 完整的自定义过滤器示例

#### 多设备认证过滤器

```java
public class DeviceAuthenticationFilter extends OncePerRequestFilter {
    
    @Autowired
    private DeviceSessionService deviceSessionService;
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        
        // 1. 获取当前认证信息
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.isAuthenticated()) {
            // 2. 提取设备信息
            String deviceId = request.getHeader("X-Device-Id");
            String userAgent = request.getHeader("User-Agent");
            String ipAddress = getClientIpAddress(request);
            
            // 3. 验证设备
            DeviceValidationResult result = deviceSessionService.validateDevice(
                authentication.getName(),
                deviceId,
                userAgent,
                ipAddress
            );
            
            if (!result.isValid()) {
                // 4. 设备验证失败,清空认证
                SecurityContextHolder.clearContext();
                
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write(
                    "{\"error\":\"" + result.getError() + "\"}"
                );
                return;
            }
            
            // 5. 更新设备最后使用时间
            deviceSessionService.updateLastUsed(deviceId);
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
```

#### API Key 认证过滤器

```java
public class ApiKeyAuthenticationFilter extends OncePerRequestFilter {
    
    @Autowired
    private ApiKeyService apiKeyService;
    
    private String headerName = "X-API-Key";
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        
        // 1. 提取 API Key
        String apiKey = request.getHeader(headerName);
        
        if (StringUtils.hasText(apiKey)) {
            // 2. 验证 API Key
            ApiKeyPrincipal principal = apiKeyService.validate(apiKey);
            
            if (principal != null) {
                // 3. 构造 Authentication
                PreAuthenticatedAuthenticationToken authentication = 
                    new PreAuthenticatedAuthenticationToken(
                        principal,
                        null,
                        principal.getAuthorities()
                    );
                
                // 4. 写入 SecurityContext
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        }
        
        filterChain.doFilter(request, response);
    }
}
```

## 实战场景

### 场景一：明明登录了却还是 401

这类问题通常不只是"前端没传 Token"，还可能是：

- 自定义过滤器顺序不对
-  没写成功
- 上下文在后续流程被覆盖或清空

**排查步骤：**

```java
// 1. 在过滤器中添加日志
@Override
protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain) throws ServletException, IOException {
    
    String jwt = getJwtFromRequest(request);
    logger.info("JWT from request: {}", jwt);
    
    // ... 认证逻辑
    
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    logger.info("Authentication after set: {}", auth);
    
    filterChain.doFilter(request, response);
}

// 2. 在 Controller 中检查 SecurityContext
@GetMapping("/user/profile")
public ResponseEntity<?> getProfile() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    logger.info("Authentication in controller: {}", auth);
    
    if (auth == null || !auth.isAuthenticated()) {
        return ResponseEntity.status(401).body("Not authenticated");
    }
    
    // ...
}

// 3. 检查过滤器链顺序
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) {
    http
        // 确保在正确的位置添加过滤器
        .addFilterBefore(jwtFilter(), UsernamePasswordAuthenticationFilter.class);
    
    return http.build();
}
```

**常见原因：**

1. **过滤器顺序错误**
```java
// × 在 SecurityContextPersistenceFilter 之前,SecurityContext 未初始化
.addFilterBefore(jwtFilter(), SecurityContextPersistenceFilter.class)

// √ 在 UsernamePasswordAuthenticationFilter 之前
.addFilterBefore(jwtFilter(), UsernamePasswordAuthenticationFilter.class)
```

2. **Session 管理配置错误**
```java
// × 使用 JWT 但开启了 Session
.sessionManagement(session -> 
    session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))

// √ JWT 模式应该无状态
.sessionManagement(session -> 
    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
```

3. **CORS 预检请求未放行**
```java
// × OPTIONS 请求被拦截
.authorizeHttpRequests(authz -> authz.anyRequest().authenticated())

// √ 放行 OPTIONS 请求
.authorizeHttpRequests(authz -> authz
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
    .anyRequest().authenticated()
)
```

### 场景二：权限明明有却还是 403

请求能进入系统，但在授权阶段被拒绝，通常要回头看：

- 当前认证对象里是否真的有对应角色或权限
- 权限前缀和配置是否一致
- 使用的是  还是 

**排查步骤：**

```java
// 1. 打印当前认证信息
@GetMapping("/debug/auth")
public ResponseEntity<?> debugAuth() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    
    Map<String, Object> info = new HashMap<>();
    info.put("principal", auth.getPrincipal());
    info.put("authorities", auth.getAuthorities());
    info.put("authenticated", auth.isAuthenticated());
    
    return ResponseEntity.ok(info);
}

// 2. 检查权限配置
@GetMapping("/admin/users")
@PreAuthorize("hasRole('ADMIN')")  // 会添加 ROLE_ 前缀
public List<User> getUsers() {
    // ...
}

@GetMapping("/admin/orders")
@PreAuthorize("hasAuthority('ROLE_ADMIN')")  // 不会添加前缀
public List<Order> getOrders() {
    // ...
}
```

**常见原因：**

1. **角色前缀问题**
```java
// UserDetails 中的权限
authorities.add(new SimpleGrantedAuthority("ADMIN"));

// × 错误:hasRole 会添加 ROLE_ 前缀,实际检查 ROLE_ADMIN
.hasRole("ADMIN")

// √ 正确方式 1:UserDetails 中添加 ROLE_ 前缀
authorities.add(new SimpleGrantedAuthority("ROLE_ADMIN"));

// √ 正确方式 2:使用 hasAuthority
.hasAuthority("ADMIN")
```

2. **权限数据类型不匹配**
```java
// × 错误:返回的是字符串
public Collection<? extends GrantedAuthority> getAuthorities() {
    return Arrays.asList("ADMIN", "USER");
}

// √ 正确:返回 GrantedAuthority
public Collection<? extends GrantedAuthority> getAuthorities() {
    return Arrays.asList(
        new SimpleGrantedAuthority("ROLE_ADMIN"),
        new SimpleGrantedAuthority("ROLE_USER")
    );
}
```

3. **方法级权限未启用**
```java
@Configuration
@EnableWebSecurity
// × 缺少 @EnableMethodSecurity
public class SecurityConfig {
    // ...
}

// √ 启用方法级权限
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    // ...
}
```

### 场景三：Controller 能执行，方法级权限却失败

这类情况通常说明：

- 入口认证是成功的
- 但  中的权限数据不足
- 或方法级表达式和实际权限结构不匹配

**排查步骤：**

```java
// 1. 检查方法权限表达式
@GetMapping("/orders/{id}")
@PreAuthorize("hasPermission(#id, 'order', 'read')")
public Order getOrder(@PathVariable Long id) {
    // ...
}

// 2. 实现 PermissionEvaluator
@Component
public class CustomPermissionEvaluator implements PermissionEvaluator {
    
    @Autowired
    private OrderService orderService;
    
    @Override
    public boolean hasPermission(
            Authentication authentication,
            Object targetId,
            Object permission) {
        
        Long orderId = (Long) targetId;
        String requiredPermission = (String) permission;
        
        // 获取当前用户
        UserPrincipal user = (UserPrincipal) authentication.getPrincipal();
        
        // 检查权限
        return orderService.hasPermission(user.getId(), orderId, requiredPermission);
    }
}

// 3. 注册 PermissionEvaluator
@Configuration
@EnableMethodSecurity(prePostEnabled = true)
public class MethodSecurityConfig {
    
    @Bean
    public PermissionEvaluator permissionEvaluator() {
        return new CustomPermissionEvaluator();
    }
}
```

### 场景四：异步任务中无法获取认证信息

在异步方法中，SecurityContext 可能丢失：

```java
// × 问题:异步方法中 SecurityContext 为空
@Async
public void asyncTask() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    // auth 为 null
}

// √ 解决方案 1:传递认证参数
@Async
public void asyncTask(Authentication auth) {
    // 使用传递的 auth
}

// √ 解决方案 2:使用 DelegatingSecurityContextRunnable
@Async
public void asyncTask() {
    // 配置异步任务时使用
    DelegatingSecurityContextRunnable runnable = 
        new DelegatingSecurityContextRunnable(
            () -> { /* 任务逻辑 */ },
            SecurityContextHolder.getContext()
        );
    runnable.run();
}

// √ 解决方案 3:配置异步使用 INHERITABLETHREADLOCAL
SecurityContextHolder.setStrategyName(
    SecurityContextHolder.MODE_INHERITABLETHREADLOCAL);
```

## 排查与治理思路

### 排查重点

安全链路问题排查时，优先看：

- 请求实际经过了哪些过滤器
- 自定义过滤器顺序是否正确
-  是否写入认证信息
- 鉴权规则和权限数据是否匹配

**调试技巧：**

```java
// 1. 启用 Spring Security 调试日志
logging:
  level:
    org.springframework.security: DEBUG

// 2. 添加全局过滤器打印调试信息
@Bean
public Filter debugFilter() {
    return new OncePerRequestFilter() {
        @Override
        protected void doFilterInternal(
                HttpServletRequest request,
                HttpServletResponse response,
                FilterChain filterChain) throws ServletException, IOException {
            
            logger.info("=== Request Start ===");
            logger.info("URI: {}", request.getRequestURI());
            logger.info("Method: {}", request.getMethod());
            logger.info("Authorization: {}", request.getHeader("Authorization"));
            
            filterChain.doFilter(request, response);
            
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            logger.info("Authentication: {}", auth);
            logger.info("Authorities: {}", 
                auth != null ? auth.getAuthorities() : "null");
            logger.info("=== Request End ===");
        }
    };
}

// 3. 将调试过滤器添加到链的最前面
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) {
    http
        .addFilterBefore(debugFilter(), ChannelProcessingFilter.class);
    return http.build();
}
```

### 治理重点

- 明确认证和授权在链路中的边界
- 自定义过滤器只做该做的事
- 权限数据结构保持稳定
- 日志里保留必要的安全上下文信息

**最佳实践：**

```java
// 1. 使用日志记录关键安全事件
@Slf4j
public class SecurityAuditFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        if (auth != null && auth.isAuthenticated()) {
            log.info("User: {}, URI: {}, Method: {}, IP: {}",
                auth.getName(),
                request.getRequestURI(),
                request.getMethod(),
                request.getRemoteAddr()
            );
        }
        
        filterChain.doFilter(request, response);
    }
}

// 2. 统一异常处理
@RestControllerAdvice
public class SecurityExceptionHandler {
    
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<?> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        return ResponseEntity.status(403)
            .body(Map.of("error", "Access denied"));
    }
    
    @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
    public ResponseEntity<?> handleNoAuth(AuthenticationCredentialsNotFoundException ex) {
        log.warn("Authentication not found: {}", ex.getMessage());
        return ResponseEntity.status(401)
            .body(Map.of("error", "Not authenticated"));
    }
}

// 3. 使用配置类管理安全配置
@ConfigurationProperties(prefix = "security")
@Data
public class SecurityProperties {
    private List<String> publicPaths = new ArrayList<>();
    private boolean enableCsrf = true;
    private boolean enableCors = true;
}

@Bean
public SecurityFilterChain securityFilterChain(
        HttpSecurity http,
        SecurityProperties properties) throws Exception {
    
    http.authorizeHttpRequests(authz -> {
        // 放行公共路径
        for (String path : properties.getPublicPaths()) {
            authz.requestMatchers(path).permitAll();
        }
        // 其他请求需要认证
        authz.anyRequest().authenticated();
    });
    
    if (!properties.isEnableCsrf()) {
        http.csrf(csrf -> csrf.disable());
    }
    
    return http.build();
}
```

## 常见误区

### 误区一：把 Spring Security 当成几个注解的集合

**问题：**
- 只会用 、 等注解
- 不理解底层过滤器链机制
- 遇到问题无法排查

**正确理解：**
- 注解只是授权的表达方式
- 真正的安全逻辑在过滤器链中
- 理解过滤器链才能深入掌握 Spring Security

### 误区二：自定义过滤器放错顺序

**问题：**
```java
// × 在错误的位置添加
.addFilterAfter(jwtFilter(), FilterSecurityInterceptor.class)
```

**正确做法：**
```java
// √ 在正确的位置添加
.addFilterBefore(jwtFilter(), UsernamePasswordAuthenticationFilter.class)
```

**理解过滤器职责：**
- 认证过滤器应该在授权过滤器之前
- SecurityContext 需要在早期初始化
- 异常处理应该在最后

### 误区三：权限判断失败先怪前端，不看上下文是否正确建立

**问题：**
- 前端说 Token 传了
- 后端说权限配置没问题
- 但就是 403

**正确排查：**
```java
// 在 Controller 中检查
@GetMapping("/debug")
public ResponseEntity<?> debug() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    
    return ResponseEntity.ok(Map.of(
        "authenticated", auth != null && auth.isAuthenticated(),
        "authorities", auth != null ? auth.getAuthorities() : null,
        "principal", auth != null ? auth.getPrincipal() : null
    ));
}
```

### 误区四：不理解 SecurityContext 却直接改鉴权逻辑

**问题：**
- 随意修改 SecurityContextHolder
- 在错误的地方清空 SecurityContext
- 导致后续请求认证失败

**正确做法：**
```java
// × 错误:在业务逻辑中清空 SecurityContext
@GetMapping("/logout")
public void logout() {
    SecurityContextHolder.clearContext(); // 不应该在这里做
}

// √ 正确:使用 Spring Security 的登出机制
@PostMapping("/logout")
public void logout(HttpServletRequest request, HttpServletResponse response) {
    // Spring Security 会自动处理
    new SecurityContextLogoutHandler().logout(request, response, null);
}
```

### 误区五：在异步方法中丢失 SecurityContext

**问题：**
```java
// × 异步方法中 SecurityContext 为空
@Async
public void asyncMethod() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    // auth 为 null!
}
```

**原因：**
- Spring Security 默认使用 ThreadLocal 存储 SecurityContext
- 异步方法在另一个线程执行
- 新线程无法访问原线程的 ThreadLocal

**解决方案：**

```java
// 方案 1:传递认证参数
@Async
public void asyncMethod(Authentication auth) {
    // 使用传递的参数
}

// 方案 2:使用 DelegatingSecurityContextAsyncTaskExecutor
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(5);
        executor.setMaxPoolSize(10);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("async-");
        executor.initialize();
        
        // 包装为支持 SecurityContext 的 Executor
        return new DelegatingSecurityContextAsyncTaskExecutor(executor);
    }
}

// 方案 3:使用 INHERITABLETHREADLOCAL
SecurityContextHolder.setStrategyName(
    SecurityContextHolder.MODE_INHERITABLETHREADLOCAL);
```

## 面试要点

### 基础问题

**1. Spring Security 为什么强调过滤器链？**

答：Spring Security 使用过滤器链是因为：
1. **统一入口**：所有请求都先经过安全过滤器，确保安全逻辑不被绕过。
2. **关注点分离**：认证、授权、异常处理等职责分散在不同过滤器中，易于理解和维护。
3. **可扩展性**：可以通过添加、移除或替换过滤器来定制安全策略。
4. **符合 Servlet 规范**：过滤器是 Servlet 标准组件，与 Spring MVC 无缝集成。
5. **性能优化**：在请求到达 Controller 之前就完成安全检查，避免不必要的业务处理。

**2. SecurityContext 里通常放什么？**

答：SecurityContext 主要存放：
- **Authentication 对象**：包含当前用户的身份信息
  - principal:用户主体（用户名或用户对象）
  - credentials:凭证（认证后通常清除）
  - authorities:权限列表
  - details:详细信息（如 IP、Session ID）
  - authenticated:是否已认证

SecurityContext 通过 SecurityContextHolder 使用 ThreadLocal 存储，确保每个请求线程有独立的安全上下文。

**3. JWT 模式下认证信息是怎么进入上下文的？**

答：JWT 模式下的认证流程：
1. **提取 Token**：从请求头 Authorization 中提取 Bearer Token。
2. **验证 Token**：检查签名、过期时间、发行者等。
3. **解析 Token**：提取用户 ID、权限等信息。
4. **构造 Authentication**：创建 UsernamePasswordAuthenticationToken 或 JwtAuthenticationToken。
5. **写入 SecurityContext**：调用 。
6. **后续使用**：FilterSecurityInterceptor 等过滤器从 SecurityContext 获取认证信息进行授权判断。

**4. 为什么过滤器顺序会影响认证授权结果？**

答：过滤器顺序关键的原因：
1. **依赖关系**：后续过滤器依赖前面过滤器建立的状态。例如，授权过滤器需要认证过滤器先建立 Authentication。
2. **SecurityContext 初始化**：SecurityContextPersistenceFilter 必须先加载 SecurityContext,其他过滤器才能使用。
3. **异常处理**：ExceptionTranslationFilter 必须在 FilterSecurityInterceptor 之前，才能捕获授权异常。
4. **短路机制**：某些过滤器可能在特定条件下终止过滤器链，影响后续执行。

错误的顺序会导致：
- 认证信息无法写入（上下文未初始化）
- 授权检查失败（认证信息缺失）
- 异常无法正确处理（异常处理器未生效）

### 进阶问题

**5. 描述 Spring Security 认证流程的完整链路。**

答：完整认证流程（以表单登录为例）:

```
1. 用户提交登录表单
   POST /login

2. UsernamePasswordAuthenticationFilter 拦截请求
   - 提取用户名和密码
   - 构造 UsernamePasswordAuthenticationToken(未认证状态)

3. 调用 AuthenticationManager.authenticate()
   - 委托给 ProviderManager
   - 遍历 AuthenticationProvider 列表

4. DaoAuthenticationProvider 处理认证
   - 调用 UserDetailsService.loadUserByUsername()
   - 获取 UserDetails(包含密码和权限)
   - 使用 PasswordEncoder 验证密码
   - 构造 UsernamePasswordAuthenticationToken(已认证状态)

5. 认证成功回调
   - 将 Authentication 写入 SecurityContext
   - SecurityContextPersistenceFilter 将 SecurityContext 保存到 Session
   - 调用 AuthenticationSuccessHandler

6. 后续请求
   - SecurityContextPersistenceFilter 从 Session 加载 SecurityContext
   - FilterSecurityInterceptor 基于认证信息进行授权检查
```

**6. SecurityContextHolder 的三种存储策略有什么区别？**

答：

| 策略 | 实现 | 特点 | 适用场景 |
|---|---|---|---|
| MODE_THREADLOCAL | ThreadLocal | 每个线程独立的 SecurityContext | Web 应用，一个请求一个线程 |
| MODE_INHERITABLETHREADLOCAL | InheritableThreadLocal | 子线程继承父线程的 SecurityContext | 需要在子线程中访问父线程认证信息的场景 |
| MODE_GLOBAL | 静态变量 | 全局共享一个 SecurityContext | 单线程应用，非 Web 应用 |

**MODE_THREADLOCAL**（默认）:
```java
// 每个线程独立
private static final ThreadLocal<SecurityContext> contextHolder = 
    new ThreadLocal<>();
```
优点：线程安全，性能好。
注意：异步场景下需要特殊处理。

**MODE_INHERITABLETHREADLOCAL**:
```java
// 子线程继承
private static final InheritableThreadLocal<SecurityContext> contextHolder = 
    new InheritableThreadLocal<>();
```
优点：子线程可访问父线程的认证信息。
注意：线程池场景下可能出问题（线程复用导致数据混乱）,需配合 DelegatingSecurityContextRunnable。

**MODE_GLOBAL**:
```java
// 全局共享
private static SecurityContext context;
```
优点：简单直接。
注意：多线程不安全，仅适用于单线程场景。

**7. 如何实现自定义的认证过滤器？**

答：实现自定义认证过滤器的步骤：

**1. 继承 OncePerRequestFilter:**
```java
public class CustomAuthenticationFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        
        // 1. 提取认证信息
        String credentials = extractCredentials(request);
        
        // 2. 如果没有凭证,继续过滤器链
        if (credentials == null) {
            filterChain.doFilter(request, response);
            return;
        }
        
        // 3. 认证
        Authentication auth = authenticate(credentials);
        
        // 4. 写入 SecurityContext
        SecurityContextHolder.getContext().setAuthentication(auth);
        
        // 5. 继续过滤器链
        filterChain.doFilter(request, response);
    }
    
    private String extractCredentials(HttpServletRequest request) {
        // 从请求头、参数等位置提取凭证
        return request.getHeader("X-Custom-Auth");
    }
    
    private Authentication authenticate(String credentials) {
        // 验证凭证并构造 Authentication
        // ...
    }
}
```

**2. 配置到过滤器链：**
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .addFilterBefore(
            new CustomAuthenticationFilter(), 
            UsernamePasswordAuthenticationFilter.class
        );
    
    return http.build();
}
```

**关键点：**
- 继承 OncePerRequestFilter 确保每个请求只执行一次
- 不处理时必须调用 
- 认证成功后写入 SecurityContext
- 选择正确的过滤器位置

**8. 如何在异步方法中访问 SecurityContext?**

答：

**问题原因：**
Spring Security 默认使用 ThreadLocal 存储 SecurityContext,异步方法在新线程中执行，无法访问原线程的 ThreadLocal。

**解决方案：**

**方案 1:传递认证参数**
```java
@Async
public void asyncMethod(Authentication auth) {
    // 使用传递的参数
    String username = auth.getName();
}
```

**方案 2:使用 DelegatingSecurityContextAsyncTaskExecutor**
```java
@Configuration
@EnableAsync
public class AsyncConfig implements AsyncConfigurer {
    
    @Override
    public Executor getAsyncExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.initialize();
        
        // 包装为支持 SecurityContext 的 Executor
        return new DelegatingSecurityContextAsyncTaskExecutor(executor);
    }
}
```

**方案 3:使用 INHERITABLETHREADLOCAL**
```java
// 在应用启动时配置
SecurityContextHolder.setStrategyName(
    SecurityContextHolder.MODE_INHERITABLETHREADLOCAL);
```
注意：线程池场景需谨慎使用，可能造成数据混乱。

**方案 4:手动传递和设置 SecurityContext**
```java
@Async
public void asyncMethod(SecurityContext context) {
    // 在新线程中设置 SecurityContext
    SecurityContextHolder.setContext(context);
    try {
        // 业务逻辑
    } finally {
        // 清理
        SecurityContextHolder.clearContext();
    }
}
```

### 实战问题

**9. 如何排查"登录后仍 401"的问题？**

答：

**排查步骤：**

**1. 确认 Token 是否传递：**
```java
// 在过滤器中打印日志
@Override
protected void doFilterInternal(...) {
    String token = request.getHeader("Authorization");
    log.info("Authorization header: {}", token);
    // ...
}
```

**2. 检查过滤器是否执行：**
```java
// 在自定义过滤器入口处打印日志
log.info("JwtAuthenticationFilter executed for URI: {}", request.getRequestURI());
```

**3. 检查 SecurityContext 是否设置成功：**
```java
// 设置后立即检查
SecurityContextHolder.getContext().setAuthentication(authentication);
Authentication stored = SecurityContextHolder.getContext().getAuthentication();
log.info("Authentication stored: {}", stored);
```

**4. 在 Controller 中检查：**
```java
@GetMapping("/debug")
public ResponseEntity<?> debug() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    return ResponseEntity.ok(Map.of(
        "authenticated", auth != null && auth.isAuthenticated(),
        "authorities", auth != null ? auth.getAuthorities() : null
    ));
}
```

**5. 检查过滤器顺序：**
```java
// 确保在正确位置添加
.addFilterBefore(jwtFilter(), UsernamePasswordAuthenticationFilter.class)
```

**常见原因：**
- Token 未传递或格式错误
- 过滤器顺序错误
- Token 验证失败但未抛出异常
- Session 管理配置错误（STATELESS vs IF_REQUIRED）
- CORS 预检请求未放行

**10. 如何排查"权限足够但仍 403"的问题？**

答：

**排查步骤：**

**1. 打印当前认证信息：**
```java
@GetMapping("/debug/auth")
public ResponseEntity<?> debugAuth() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    return ResponseEntity.ok(Map.of(
        "principal", auth.getPrincipal(),
        "authorities", auth.getAuthorities(),
        "details", auth.getDetails()
    ));
}
```

**2. 检查权限配置：**
```java
// 检查是用 hasRole 还是 hasAuthority
@PreAuthorize("hasRole('ADMIN')")  // 会添加 ROLE_ 前缀
@PreAuthorize("hasAuthority('ROLE_ADMIN')")  // 不会添加前缀
```

**3. 检查 UserDetails 中的权限：**
```java
@Override
public Collection<? extends GrantedAuthority> getAuthorities() {
    // 确保权限格式正确
    return Arrays.asList(
        new SimpleGrantedAuthority("ROLE_ADMIN")  // hasRole 需要前缀
    );
}
```

**4. 检查方法级权限是否启用：**
```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)  // 必须启用
public class SecurityConfig {
    // ...
}
```

**5. 检查 URL 配置和方法注解冲突：**
```java
// URL 配置
.authorizeHttpRequests(authz -> authz
    .requestMatchers("/admin/**").hasRole("ADMIN")
)

// 方法注解
@GetMapping("/admin/users")
@PreAuthorize("hasAuthority('USER')")  // 可能与 URL 配置冲突
```

**常见原因：**
- 权限前缀不一致（hasRole vs hasAuthority）
- UserDetails 中权限格式错误
- 方法级权限未启用
- 权限配置冲突
- 大小写不一致

**11. 如何实现"记住我"功能？**

答：

**方案 1:使用 Spring Security 内置的 Remember-Me**

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .rememberMe(remember -> remember
            .key("uniqueAndSecret")
            .tokenValiditySeconds(14 * 24 * 60 * 60) // 14 天
            .rememberMeParameter("remember-me")
            .rememberMeCookieName("remember-me")
            .userDetailsService(userDetailsService)
        );
    
    return http.build();
}

// 登录表单添加 checkbox
<input type="checkbox" name="remember-me"> 记住我
```

**工作原理：**
1. 用户勾选"记住我"登录
2. 服务器生成 remember-me Token 并保存到 Cookie
3. Token 包含用户名、密码哈希、过期时间
4. 下次访问时，Cookie 中的 Token 被解析并验证
5. 验证通过后自动登录

**方案 2:自定义持久化 Token**

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .rememberMe(remember -> remember
            .tokenRepository(persistentTokenRepository())
            .tokenValiditySeconds(14 * 24 * 60 * 60)
        );
    
    return http.build();
}

@Bean
public PersistentTokenRepository persistentTokenRepository() {
    JdbcTokenRepositoryImpl tokenRepository = new JdbcTokenRepositoryImpl();
    tokenRepository.setDataSource(dataSource);
    return tokenRepository;
}

// 需要创建表
CREATE TABLE persistent_logins (
    username VARCHAR(64) NOT NULL,
    series VARCHAR(64) PRIMARY KEY,
    token VARCHAR(64) NOT NULL,
    last_used TIMESTAMP NOT NULL
);
```

**方案 3:使用 JWT 实现"记住我"**

```java
// 登录时根据用户选择生成不同有效期的 Token
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest request) {
    // 认证...
    
    long expiration = request.isRememberMe() 
        ? 14 * 24 * 60 * 60 * 1000L  // 14 天
        : 30 * 60 * 1000L;          // 30 分钟
    
    String token = jwtTokenProvider.generateToken(authentication, expiration);
    
    return ResponseEntity.ok(new JwtResponse(token));
}
```

**安全考虑：**
- remember-me Token 应该有足够的安全强度
- 敏感操作应要求重新认证
- 提供撤销 remember-me Token 的接口
- 记录审计日志

**12. 如何实现多因素认证（MFA）?**

答：

**实现方案：**

**1. 认证流程设计**
```
用户名密码登录
    ↓
第一步认证成功
    ↓
检查是否启用 MFA
    ↓
是 → 发送验证码 → 输入验证码 → 第二步认证
否 → 直接登录成功
```

**2. 实现代码**

```java
// 认证状态枚举
public enum AuthenticationStage {
    FIRST_FACTOR_COMPLETED,  // 第一步认证完成
    SECOND_FACTOR_REQUIRED,  // 需要第二步认证
    FULLY_AUTHENTICATED      // 完全认证
}

// 认证详情
public class MfaAuthenticationDetails {
    private AuthenticationStage stage;
    private String userId;
    private String tempToken;  // 第一步认证后的临时 Token
    private Instant authenticatedAt;
}

// 第一步认证
@PostMapping("/auth/login")
public ResponseEntity<?> login(@RequestBody LoginRequest request) {
    // 1. 用户名密码认证
    Authentication auth = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(
            request.getUsername(),
            request.getPassword()
        )
    );
    
    User user = (User) auth.getPrincipal();
    
    // 2. 检查是否启用 MFA
    if (user.isMfaEnabled()) {
        // 生成临时 Token
        String tempToken = mfaService.generateTempToken(user.getId());
        
        // 发送验证码
        mfaService.sendCode(user.getId(), user.getMfaType());
        
        // 返回临时 Token
        return ResponseEntity.ok(Map.of(
            "stage", "MFA_REQUIRED",
            "tempToken", tempToken,
            "mfaType", user.getMfaType()
        ));
    }
    
    // 3. 未启用 MFA,直接返回 Token
    String accessToken = jwtTokenProvider.generateToken(auth);
    return ResponseEntity.ok(Map.of(
        "stage", "AUTHENTICATED",
        "accessToken", accessToken
    ));
}

// 第二步认证
@PostMapping("/auth/mfa/verify")
public ResponseEntity<?> verifyMfa(@RequestBody MfaVerifyRequest request) {
    // 1. 验证临时 Token
    String userId = mfaService.validateTempToken(request.getTempToken());
    
    // 2. 验证 MFA 代码
    boolean valid = mfaService.verifyCode(userId, request.getCode());
    
    if (!valid) {
        throw new InvalidMfaCodeException("Invalid MFA code");
    }
    
    // 3. 认证成功,生成正式 Token
    UserDetails user = userDetailsService.loadUserByUsername(userId);
    Authentication auth = new UsernamePasswordAuthenticationToken(
        user, null, user.getAuthorities()
    );
    
    String accessToken = jwtTokenProvider.generateToken(auth);
    
    return ResponseEntity.ok(Map.of(
        "stage", "AUTHENTICATED",
        "accessToken", accessToken
    ));
}

// MFA 服务
@Service
public class MfaService {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    // 生成临时 Token
    public String generateTempToken(String userId) {
        String token = UUID.randomUUID().toString();
        String key = "mfa:temp:" + token;
        
        redisTemplate.opsForValue().set(
            key, userId, 
            5, TimeUnit.MINUTES  // 5 分钟有效
        );
        
        return token;
    }
    
    // 验证临时 Token
    public String validateTempToken(String token) {
        String key = "mfa:temp:" + token;
        String userId = redisTemplate.opsForValue().get(key);
        
        if (userId == null) {
            throw new InvalidTokenException("Temp token expired or invalid");
        }
        
        // 删除临时 Token(一次性使用)
        redisTemplate.delete(key);
        
        return userId;
    }
    
    // 发送验证码
    public void sendCode(String userId, MfaType type) {
        String code = generateCode();
        String key = "mfa:code:" + userId;
        
        // 存储验证码
        redisTemplate.opsForValue().set(
            key, code,
            5, TimeUnit.MINUTES
        );
        
        // 发送
        switch (type) {
            case SMS:
                smsService.send(userId, code);
                break;
            case EMAIL:
                emailService.send(userId, code);
                break;
            case TOTP:
                // TOTP 由客户端应用生成,无需发送
                break;
        }
    }
    
    // 验证验证码
    public boolean verifyCode(String userId, String code) {
        String key = "mfa:code:" + userId;
        String storedCode = redisTemplate.opsForValue().get(key);
        
        if (storedCode != null && storedCode.equals(code)) {
            redisTemplate.delete(key);
            return true;
        }
        
        return false;
    }
}
```

**3. Spring Security 集成**

```java
// 自定义认证过滤器
public class MfaAuthenticationFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        
        // 检查是否需要 MFA
        String tempToken = request.getHeader("X-Temp-Token");
        
        if (tempToken != null) {
            // 临时认证,只允许访问 MFA 相关接口
            String uri = request.getRequestURI();
            if (!uri.startsWith("/auth/mfa/")) {
                response.sendError(403, "MFA required");
                return;
            }
        }
        
        filterChain.doFilter(request, response);
    }
}
```

**安全考虑：**
- 临时 Token 应该一次性使用
- 验证码应该有有效期和重试次数限制
- 记录 MFA 审计日志
- 提供备用认证方式（如备用码）

## 版本差异（旧版 → Spring Security 6.x）

| 特性 | 旧版（Spring Security 5.x） | Spring Security 6.x |
|------|--------------------------|---------------------|
| 过滤器链 | FilterChainProxy | 不变；SecurityFilterChain Bean |
| SecurityContext | ThreadLocal | 不变；虚拟线程下需注意 ThreadLocal 传播 |
| 自定义过滤器 | 手动 | 不变；推荐 OncePerRequestFilter |
| 虚拟线程 | 无 | 虚拟线程卸载/挂载保留 ThreadLocal；跨线程异步才需传播 |
