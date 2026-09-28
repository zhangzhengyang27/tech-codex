---
title: "认证授权与JWT基础"
description: "这两者几乎总是一起出现，但它们不是同一件事。理解这个区别，是读懂 Spring Security 的起点。"
keywords: [认证授权与JWT基础]
category: "Java"
tags: [Java, SpringSecurity]
---


# 认证、授权与 JWT 基础

在绝大多数业务系统里，安全体系的第一步都离不开两件事：

- **认证（Authentication）**：确认"你是谁"
- **授权（Authorization）**：确认"你能做什么"

这两者几乎总是一起出现，但它们不是同一件事。理解这个区别，是读懂 Spring Security 的起点。

## 一、认证与授权的核心概念

### 1.1 认证（Authentication）

认证解决的是**身份确认**问题。系统需要验证当前访问者是谁。

**常见认证方式：**

| 认证方式 | 说明 | 适用场景 |
|---------|------|---------|
| 用户名密码登录 | 最传统的认证方式 | 传统Web应用 |
| 手机验证码登录 | 通过短信验证身份 | 移动端应用 |
| OAuth2 登录 | 第三方授权登录 | 社交登录场景 |
| Token 校验 | 无状态身份恢复 | 前后端分离、微服务 |
| 生物识别 | 指纹、人脸识别 | 移动端高安全场景 |
| 数字证书 | SSL客户端证书 | 高安全要求系统 |

**认证的核心要素：**

```java
// 认证成功后,系统构建 Authentication 对象
public interface Authentication extends Principal, Serializable {
    // 权限列表
    Collection<? extends GrantedAuthority> getAuthorities();
    
    // 凭证(如密码,认证后通常清空)
    Object getCredentials();
    
    // 用户详情
    Object getDetails();
    
    // 主体标识(通常是用户名)
    Object getPrincipal();
    
    // 是否已认证
    boolean isAuthenticated();
    
    void setAuthenticated(boolean authenticated);
}
```

**认证流程示例：**

```java
@Service
public class AuthenticationService {
    
    @Autowired
    private AuthenticationManager authenticationManager;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    /**
     * 用户登录认证
     */
    public String login(String username, String password) {
        try {
            // 1. 创建认证令牌
            UsernamePasswordAuthenticationToken authToken = 
                new UsernamePasswordAuthenticationToken(username, password);
            
            // 2. 执行认证(会调用 UserDetailsService 加载用户信息)
            Authentication authentication = authenticationManager.authenticate(authToken);
            
            // 3. 认证成功,生成 JWT Token
            String token = jwtTokenProvider.generateToken(authentication);
            
            // 4. 将认证信息存入 SecurityContext
            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            return token;
            
        } catch (BadCredentialsException e) {
            throw new AuthenticationException("用户名或密码错误");
        } catch (DisabledException e) {
            throw new AuthenticationException("账户已被禁用");
        } catch (LockedException e) {
            throw new AuthenticationException("账户已被锁定");
        }
    }
}
```

### 1.2 授权（Authorization）

授权解决的是**权限判断**问题。系统需要判断当前用户能否执行某个操作。

**常见授权场景：**

- 功能权限：用户能不能访问后台管理页面
- 数据权限：用户能不能查看某条敏感数据
- 操作权限：用户能不能删除订单

**授权模型分类：**

| 模型 | 说明 | 适用场景 |
|-----|------|---------|
| ACL(Access Control List) | 访问控制列表，直接指定资源与权限关系 | 文件系统权限 |
| RBAC(Role-Based Access Control) | 基于角色的访问控制 | 企业应用系统 |
| ABAC(Attribute-Based Access Control) | 基于属性的访问控制 | 复杂权限场景 |

**授权判断示例：**

```java
// Spring Security 权限判断方式

// 1. 配置式授权(HttpSecurity 配置)
@Configuration
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth
            .requestMatchers("/admin/**").hasRole("ADMIN")
            .requestMatchers("/user/**").hasAnyRole("USER", "ADMIN")
            .requestMatchers("/public/**").permitAll()
            .anyRequest().authenticated()
        );
        return http.build();
    }
}

// 2. 注解式授权(方法级别)
@Service
public class OrderService {
    
    @PreAuthorize("hasRole('ADMIN') or #userId == authentication.principal.id")
    public Order getOrder(Long orderId, Long userId) {
        return orderRepository.findById(orderId);
    }
    
    @PreAuthorize("hasAuthority('order:delete')")
    public void deleteOrder(Long orderId) {
        orderRepository.deleteById(orderId);
    }
    
    @PostAuthorize("returnObject.userId == authentication.principal.id")
    public Order getMyOrder(Long orderId) {
        return orderRepository.findById(orderId);
    }
}

// 3. 编程式授权(代码中判断)
@Service
public class DataService {
    
    public SensitiveData getSensitiveData(Long dataId) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        // 判断是否有管理员权限
        boolean isAdmin = auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        
        if (isAdmin) {
            return dataRepository.findById(dataId);
        }
        
        // 普通用户只能查看自己的数据
        Long userId = ((UserDetails) auth.getPrincipal()).getUserId();
        return dataRepository.findByIdAndUserId(dataId, userId);
    }
}
```

### 1.3 认证与授权的关系

授权的前提通常是**认证已经完成**,因为连"是谁"都不知道，就很难判断"能做什么"。

**完整的安全访问流程：**

```
1. 用户发起请求
   ↓
2. 认证过滤器拦截(如 UsernamePasswordAuthenticationFilter)
   ↓
3. 尝试从请求中提取认证信息
   ↓
4. 认证管理器执行认证(AuthenticationManager)
   ↓
5. 认证成功 → 构建 Authentication 对象
   ↓
6. 将认证信息存入 SecurityContext
   ↓
7. 授权过滤器拦截(FilterSecurityInterceptor)
   ↓
8. 根据配置判断是否有权限访问
   ↓
9. 有权限 → 继续执行业务逻辑
   无权限 → 抛出 AccessDeniedException
```

## 二、Spring Security 核心架构

### 2.1 过滤器链架构

Spring Security 的核心入口不是 Controller,而是**过滤器链**。请求进入应用后，会先经过一系列安全过滤器，再进入业务控制器。

**核心过滤器链：**

```
请求 → SecurityContextPersistenceFilter
     → HeaderWriterFilter
     → CsrfFilter
     → LogoutFilter
     → UsernamePasswordAuthenticationFilter
     → DefaultLoginPageGeneratingFilter
     → DefaultLogoutPageGeneratingFilter
     → BasicAuthenticationFilter
     → RequestCacheAwareFilter
     → SecurityContextHolderAwareFilter
     → SessionManagementFilter
     → ExceptionTranslationFilter
     → FilterSecurityInterceptor
     → 业务 Controller
```

::: warning 过滤器命名的版本差异
上面的链条是 Spring Security 5.x 的经典命名。在 6.x 中有两处更名： → （职责拆分）； → （ 的新授权实现，旧的拦截器类已废弃）。职责与顺序基本不变。
:::

**主要过滤器职责：**

| 过滤器 | 职责 | 说明 |
|-------|------|------|
| SecurityContextPersistenceFilter | 安全上下文持久化 | 请求前从Session恢复上下文，请求后保存上下文 |
| CsrfFilter | CSRF 防护 | 验证请求中是否包含有效的 CSRF Token |
| UsernamePasswordAuthenticationFilter | 表单登录认证 | 处理用户名密码登录请求 |
| BasicAuthenticationFilter | HTTP Basic 认证 | 处理 HTTP Basic 认证请求 |
| ExceptionTranslationFilter | 异常转换 | 捕获安全异常并转换为响应 |
| FilterSecurityInterceptor | 权限拦截 | 最终的权限判断 |

**自定义过滤器示例：**

```java
// JWT 认证过滤器
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request, 
            HttpServletResponse response, 
            FilterChain filterChain) throws ServletException, IOException {
        
        try {
            // 1. 从请求头中提取 JWT Token
            String token = jwtTokenProvider.resolveToken(request);
            
            // 2. 验证 Token 有效性
            if (token != null && jwtTokenProvider.validateToken(token)) {
                // 3. 从 Token 中解析用户信息
                Authentication auth = jwtTokenProvider.getAuthentication(token);
                
                // 4. 将认证信息存入 SecurityContext
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        } catch (JwtException e) {
            logger.error("JWT 认证失败: {}", e.getMessage());
        }
        
        filterChain.doFilter(request, response);
    }
}

// 注册到过滤器链
@Configuration
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/auth/**").permitAll()
                .anyRequest().authenticated()
            )
            // 在 UsernamePasswordAuthenticationFilter 之前添加 JWT 过滤器
            .addFilterBefore(jwtAuthenticationFilter(), 
                UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter();
    }
}
```

### 2.2 核心组件详解

**AuthenticationManager（认证管理器）:**

```java
// 认证管理器接口
public interface AuthenticationManager {
    Authentication authenticate(Authentication authentication) 
        throws AuthenticationException;
}

// ProviderManager 是最常见的实现
public class ProviderManager implements AuthenticationManager {
    
    private List<AuthenticationProvider> providers;
    
    @Override
    public Authentication authenticate(Authentication authentication) 
            throws AuthenticationException {
        
        // 遍历所有 AuthenticationProvider,找到支持当前认证类型的 Provider
        for (AuthenticationProvider provider : getProviders()) {
            if (!provider.supports(authentication.getClass())) {
                continue;
            }
            
            try {
                // 调用 Provider 执行认证
                Authentication result = provider.authenticate(authentication);
                if (result != null) {
                    return result;
                }
            } catch (AuthenticationException e) {
                // 记录异常,继续尝试下一个 Provider
            }
        }
        
        throw new ProviderNotFoundException("No AuthenticationProvider found");
    }
}
```

**AuthenticationProvider（认证提供者）:**

```java
// 自定义认证提供者示例
@Component
public class CustomAuthenticationProvider implements AuthenticationProvider {
    
    @Autowired
    private UserDetailsService userDetailsService;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Override
    public Authentication authenticate(Authentication authentication) 
            throws AuthenticationException {
        
        String username = authentication.getName();
        String password = authentication.getCredentials().toString();
        
        // 1. 加载用户信息
        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
        
        // 2. 验证密码
        if (!passwordEncoder.matches(password, userDetails.getPassword())) {
            throw new BadCredentialsException("密码错误");
        }
        
        // 3. 检查账户状态
        if (!userDetails.isEnabled()) {
            throw new DisabledException("账户已被禁用");
        }
        
        if (!userDetails.isAccountNonLocked()) {
            throw new LockedException("账户已被锁定");
        }
        
        // 4. 认证成功,返回 Authentication 对象
        return new UsernamePasswordAuthenticationToken(
            userDetails, 
            null, 
            userDetails.getAuthorities()
        );
    }
    
    @Override
    public boolean supports(Class<?> authentication) {
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
    }
}
```

**UserDetailsService（用户详情服务）:**

```java
// 加载用户信息的核心接口
public interface UserDetailsService {
    UserDetails loadUserByUsername(String username) 
        throws UsernameNotFoundException;
}

// 实现
@Service
public class CustomUserDetailsService implements UserDetailsService {
    
    @Autowired
    private UserRepository userRepository;
    
    @Override
    public UserDetails loadUserByUsername(String username) 
            throws UsernameNotFoundException {
        
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new UsernameNotFoundException(
                "用户不存在: " + username));
        
        // 加载用户权限
        List<GrantedAuthority> authorities = loadAuthorities(user);
        
        return new org.springframework.security.core.userdetails.User(
            user.getUsername(),
            user.getPassword(),
            user.isEnabled(),
            user.isAccountNonExpired(),
            user.isCredentialsNonExpired(),
            user.isAccountNonLocked(),
            authorities
        );
    }
    
    private List<GrantedAuthority> loadAuthorities(User user) {
        // 从数据库加载用户的角色和权限
        return user.getRoles().stream()
            .flatMap(role -> role.getPermissions().stream())
            .map(permission -> new SimpleGrantedAuthority(permission.getName()))
            .collect(Collectors.toList());
    }
}
```

**SecurityContext（安全上下文）:**

```java
// SecurityContext 存储当前用户的安全信息
public interface SecurityContext extends Serializable {
    Authentication getAuthentication();
    void setAuthentication(Authentication authentication);
}

// 使用示例
@Service
public class CurrentUserService {
    
    /**
     * 获取当前登录用户
     */
    public UserDetails getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        if (auth == null || !auth.isAuthenticated()) {
            throw new AuthenticationException("用户未登录");
        }
        
        return (UserDetails) auth.getPrincipal();
    }
    
    /**
     * 获取当前用户ID
     */
    public Long getCurrentUserId() {
        UserDetails user = getCurrentUser();
        if (user instanceof CustomUserDetails) {
            return ((CustomUserDetails) user).getUserId();
        }
        return null;
    }
    
    /**
     * 判断当前用户是否有指定权限
     */
    public boolean hasAuthority(String authority) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals(authority));
    }
}
```

## 三、密码存储安全

### 3.1 为什么密码必须单向加密

密码绝不能明文保存。更合理的做法是使用**单向哈希算法**,例如 。

**核心原因：**

1. **服务端不应该知道用户原始密码**：即使系统管理员也不应该能看到用户密码
2. **数据库泄露风险**：即使数据库被拖库，也要尽量降低直接还原密码的风险
3. **用户密码复用**：很多用户在多个网站使用相同密码，泄露一个影响多个

**为什么不能使用可逆加密：**

```java
// × 错误示例:使用可逆加密(AES)
@Service
public class BadPasswordService {
    
    @Autowired
    private AESPasswordEncoder aesEncoder; // 可逆加密
    
    public void register(String username, String password) {
        // 问题:密钥泄露后,所有密码都能被解密
        String encoded = aesEncoder.encode(password);
        user.setPassword(encoded);
    }
    
    public String getOriginalPassword(String username) {
        // 严重问题:管理员可以解密用户密码
        return aesEncoder.decode(user.getPassword());
    }
}

// √ 正确示例:使用单向哈希
@Service
public class GoodPasswordService {
    
    @Autowired
    private BCryptPasswordEncoder passwordEncoder; // 单向哈希
    
    public void register(String username, String password) {
        String encoded = passwordEncoder.encode(password);
        user.setPassword(encoded);
    }
    
    public boolean login(String username, String rawPassword) {
        // 只能验证,不能解密
        return passwordEncoder.matches(rawPassword, user.getPassword());
    }
}
```

### 3.2 BCryptPasswordEncoder 详解

**BCrypt 算法特点：**

1. **基于 Blowfish 算法**：安全性高
2. **内置盐值**：每次加密自动生成随机盐
3. **可配置强度**：通过 cost 参数控制计算复杂度
4. **抗彩虹表攻击**：相同密码每次加密结果不同

**使用示例：**

```java
@Configuration
public class SecurityConfig {
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        // strength 参数(默认10):值越大越安全,但计算时间越长
        // 10: 约100ms | 12: 约400ms | 14: 约1.5s
        return new BCryptPasswordEncoder(12);
    }
}

@Service
public class UserService {
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * 用户注册
     */
    public void register(String username, String rawPassword) {
        // 1. 校验密码强度
        validatePasswordStrength(rawPassword);
        
        // 2. 加密密码
        String encodedPassword = passwordEncoder.encode(rawPassword);
        
        // 3. 保存用户
        User user = new User();
        user.setUsername(username);
        user.setPassword(encodedPassword);
        userRepository.save(user);
        
        // 日志:记录注册,但不记录密码
        log.info("用户注册成功: {}", username);
    }
    
    /**
     * 修改密码
     */
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new UserNotFoundException("用户不存在"));
        
        // 1. 验证旧密码
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new IllegalArgumentException("旧密码错误");
        }
        
        // 2. 校验新密码强度
        validatePasswordStrength(newPassword);
        
        // 3. 新密码不能与旧密码相同
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new IllegalArgumentException("新密码不能与旧密码相同");
        }
        
        // 4. 加密并保存
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
    
    /**
     * 校验密码强度
     */
    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new IllegalArgumentException("密码长度不能少于8位");
        }
        
        if (!password.matches(".*[A-Z].*")) {
            throw new IllegalArgumentException("密码必须包含大写字母");
        }
        
        if (!password.matches(".*[a-z].*")) {
            throw new IllegalArgumentException("密码必须包含小写字母");
        }
        
        if (!password.matches(".*[0-9].*")) {
            throw new IllegalArgumentException("密码必须包含数字");
        }
        
        if (!password.matches(".*[!@#$%^&*].*")) {
            throw new IllegalArgumentException("密码必须包含特殊字符");
        }
    }
}
```

**BCrypt 密码格式解析：**

```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZRGdjGj/n3/ItBh/4UwLPkH8POPOy

$2a      - 算法版本(2a)
$10      - cost 参数(强度,2^10 = 1024轮)
$N9qo... - 128位盐值(22个Base64字符)
OPO...   - 184位哈希值(31个Base64字符)
```

### 3.3 其他密码编码器

```java
// Spring Security 提供的编码器对比

// 1. BCryptPasswordEncoder (推荐)
// - 内置盐值,抗彩虹表攻击
// - 可配置强度
// - 适用于新项目
PasswordEncoder bcrypt = new BCryptPasswordEncoder(12);

// 2. PBKDF2PasswordEncoder
// - 基于 PBKDF2 算法
// - 可配置迭代次数
// - 适用于需要 PBKDF2 标准的场景
PasswordEncoder pbkdf2 = new Pbkdf2PasswordEncoder(
    "secret",           // 密钥
    16,                 // 盐值长度
    310000,             // 迭代次数(OWASP 推荐)
    SecretKeyFactoryAlgorithm.PBKDF2WithHmacSHA256
);

// 3. SCryptPasswordEncoder
// - 内存密集型算法
// - 抗 GPU 破解
// - 适用于高安全要求场景
PasswordEncoder scrypt = new SCryptPasswordEncoder(
    16384,  // CPU cost(N)
    8,      // Memory cost(r)
    1,      // Parallelization(p)
    32,     // Key length
    64      // Salt length
);

// 4. Argon2PasswordEncoder (Spring Security 5.3+)
// - Password Hashing Competition 冠军
// - 抗 GPU/ASIC 破解
// - 适用于最高安全要求场景
PasswordEncoder argon2 = new Argon2PasswordEncoder(
    16,     // salt length
    32,     // hash length
    1,      // parallelism
    65536,  // memory (KB)
    3       // iterations
);

// 5. DelegatingPasswordEncoder (推荐用于迁移)
// - 支持多种编码器
// - 通过前缀识别编码方式
// - 适用于密码编码器迁移场景
Map<String, PasswordEncoder> encoders = new HashMap<>();
encoders.put("bcrypt", new BCryptPasswordEncoder());
encoders.put("pbkdf2", new Pbkdf2PasswordEncoder());
encoders.put("scrypt", new SCryptPasswordEncoder());

PasswordEncoder delegating = new DelegatingPasswordEncoder("bcrypt", encoders);

// 示例:{bcrypt}$2a$10$...  {pbkdf2}5FuO...
```

## 四、JWT 深度解析

### 4.1 JWT 基础概念

JWT（JSON Web Token）是一种把用户身份信息编码进令牌中的方案，常用于前后端分离或无状态认证场景。

**JWT 特点：**

- **自包含**：Token 中包含用户信息，无需服务端存储 Session
- **跨语言**：基于 JSON,任何语言都可以解析
- **签名验证**：通过签名保证 Token 不可篡改

**典型流程：**

```
1. 用户登录成功
   ↓
2. 服务端签发 JWT
   ↓
3. 客户端存储 Token(localStorage/Cookie)
   ↓
4. 后续请求携带 Token(Authorization: Bearer <token>)
   ↓
5. 服务端校验 Token 后恢复用户身份
```

> 注：上述工具类使用 jjwt 0.9.x/0.11.x 的经典 API（、）。jjwt 0.12+ 已重构 API（、 等），升级依赖时需按新 API 改写。

### 4.2 JWT 结构详解

JWT 由三部分组成，用点（.）分隔：

```
header.payload.signature
```

**Header（头部）:**

```json
{
  "alg": "HS256",  // 签名算法
  "typ": "JWT"     // Token 类型
}
```

**Payload（载荷）:**

```json
{
  "sub": "1234567890",    // Subject(主题)
  "name": "张三",          // 自定义字段
  "iat": 1516239022,      // Issued At(签发时间)
  "exp": 1516242622,      // Expiration(过期时间)
  "iss": "myapp",         // Issuer(签发者)
  "aud": "appuser",       // Audience(接收者)
  "jti": "unique-id"      // JWT ID(唯一标识)
}
```

**Signature（签名）:**

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

**完整示例：**

```java
// JWT 工具类
@Component
public class JwtTokenProvider {
    
    @Value("${jwt.secret}")
    private String jwtSecret;
    
    @Value("${jwt.expiration:86400000}") // 默认24小时
    private long jwtExpiration;
    
    @Value("${jwt.issuer:myapp}")
    private String jwtIssuer;
    
    /**
     * 生成 JWT Token
     */
    public String generateToken(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);
        
        Map<String, Object> claims = new HashMap<>();
        claims.put("roles", userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList()));
        
        if (userDetails instanceof CustomUserDetails) {
            claims.put("userId", ((CustomUserDetails) userDetails).getUserId());
            claims.put("email", ((CustomUserDetails) userDetails).getEmail());
        }
        
        return Jwts.builder()
            .setClaims(claims)  // 注意：setClaims 会整体替换 claims，必须放在 setSubject 之前
            .setSubject(userDetails.getUsername())
            .setIssuer(jwtIssuer)
            .setIssuedAt(now)
            .setExpiration(expiryDate)
            .signWith(SignatureAlgorithm.HS512, jwtSecret)
            .compact();
    }
    
    /**
     * 从 Token 中解析用户信息
     */
    public Authentication getAuthentication(String token) {
        Claims claims = Jwts.parser()
            .setSigningKey(jwtSecret)
            .parseClaimsJws(token)
            .getBody();
        
        String username = claims.getSubject();
        
        List<String> roles = claims.get("roles", List.class);
        Collection<GrantedAuthority> authorities = roles.stream()
            .map(SimpleGrantedAuthority::new)
            .collect(Collectors.toList());
        
        UserDetails userDetails = User.builder()
            .username(username)
            .password("") // Token 认证不需要密码
            .authorities(authorities)
            .build();
        
        return new UsernamePasswordAuthenticationToken(
            userDetails, null, authorities);
    }
    
    /**
     * 验证 Token 有效性
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser().setSigningKey(jwtSecret).parseClaimsJws(token);
            return true;
        } catch (SignatureException ex) {
            logger.error("无效的 JWT 签名");
        } catch (MalformedJwtException ex) {
            logger.error("无效的 JWT Token");
        } catch (ExpiredJwtException ex) {
            logger.error("JWT Token 已过期");
        } catch (UnsupportedJwtException ex) {
            logger.error("不支持的 JWT Token");
        } catch (IllegalArgumentException ex) {
            logger.error("JWT claims 为空");
        }
        return false;
    }
    
    /**
     * 从请求中提取 Token
     */
    public String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}
```

### 4.3 JWT 安全注意事项

**重要提醒：**

- Payload 通常只是 **Base64 编码，不是加密**,任何人都能解析
- 真正保证不可篡改的是**签名**
- **不要在 JWT 里放高敏感明文信息**（如密码、身份证号）

**安全最佳实践：**

```java
@Configuration
public class JwtSecurityConfig {
    
    // √ 正确:安全的密钥配置
    @Value("${jwt.secret}")
    private String jwtSecret; // 从环境变量或配置中心读取
    
    // × 错误:硬编码密钥
    // private String jwtSecret = "my-secret-key"; // 绝对禁止!
    
    /**
     * JWT 安全配置建议
     */
    // 1. 密钥管理
    // - 使用强密钥(HS256至少256位,RS256至少2048位)
    // - 定期轮换密钥
    // - 不同环境使用不同密钥
    
    // 2. Token 有效期
    // - Access Token: 短有效期(15-30分钟)
    // - Refresh Token: 长有效期(7-30天)
    
    // 3. 敏感信息处理
    // √ 正确:只放必要信息
    Map<String, Object> safeClaims = new HashMap<>();
    safeClaims.put("sub", "user123");         // 用户标识
    safeClaims.put("roles", Arrays.asList("ROLE_USER")); // 权限
    safeClaims.put("userId", 12345L);         // 用户ID
    
    // × 错误:放敏感信息
    Map<String, Object> unsafeClaims = new HashMap<>();
    unsafeClaims.put("password", "123456");        // 禁止!
    unsafeClaims.put("idCard", "110101199001011234"); // 禁止!
    unsafeClaims.put("bankAccount", "6222...");    // 禁止!
    
    // 4. Token 存储
    // - 推荐使用 HttpOnly Cookie(XSS 防护)
    // - 如使用 localStorage,需做好 XSS 防护
    
    // 5. HTTPS 传输
    // - 必须使用 HTTPS,防止中间人攻击
}
```

### 4.4 JWT vs Session 对比

| 特性 | Session | JWT |
|-----|---------|-----|
| **状态存储** | 服务端存储 | 客户端存储 |
| **扩展性** | 需要Session共享机制 | 天然支持水平扩展 |
| **性能** | 每次请求需查询Session存储 | 无需查询，直接验证签名 |
| **跨域支持** | 需要额外处理（CORS、Cookie配置） | 天然支持跨域 |
| **移动端** | Cookie机制不友好 | 适合移动端 |
| **安全性** | Session ID 泄露风险 | Token 泄露风险 |
| **失效控制** | 服务端可直接失效 | 需要额外机制（黑名单） |
| **数据量** | Session ID 很小 | Token 包含用户信息，较大 |
| **微服务友好** | 需要Session共享方案 | 天然适合微服务 |

**选择建议：**

```java
// Session 适用场景:
// 1. 传统服务端渲染应用(Monolithic)
// 2. 管理后台(用户数固定,安全要求高)
// 3. 需要即时踢出用户的场景
// 4. 不想处理 Token 失效的复杂场景

// JWT 适用场景:
// 1. 前后端分离项目
// 2. 移动端应用
// 3. 微服务架构
// 4. 需要无状态认证的场景
// 5. 网关统一鉴权场景
// 6. 需要弱会话依赖的系统
```

## 五、完整的 JWT 认证实战案例

### 5.1 项目结构

```
src/main/java/com/example/security/
├── config/
│   ├── SecurityConfig.java          # Spring Security 配置
│   ├── JwtConfig.java               # JWT 配置
│   └── CorsConfig.java              # CORS 配置
├── controller/
│   └── AuthController.java          # 认证接口
├── dto/
│   ├── LoginRequest.java            # 登录请求
│   ├── RegisterRequest.java         # 注册请求
│   └── JwtResponse.java             # JWT 响应
├── entity/
│   ├── User.java                    # 用户实体
│   └── Role.java                    # 角色实体
├── filter/
│   └── JwtAuthenticationFilter.java # JWT 认证过滤器
├── repository/
│   └── UserRepository.java          # 用户 Repository
├── security/
│   ├── JwtTokenProvider.java        # JWT 工具类
│   ├── JwtAuthenticationEntryPoint.java  # 认证入口点
│   └── CustomUserDetailsService.java     # 用户详情服务
└── service/
    └── AuthService.java             # 认证服务
```

### 5.2 核心代码实现

**User 实体：**

```java
@Entity
@Table(name = "users")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(unique = true, nullable = false)
    private String username;
    
    @Column(nullable = false)
    private String password;
    
    @Column(unique = true)
    private String email;
    
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "user_roles",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();
    
    private boolean enabled = true;
    private boolean accountNonExpired = true;
    private boolean accountNonLocked = true;
    private boolean credentialsNonExpired = true;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // getters and setters
}

@Entity
@Table(name = "roles")
public class Role {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Enumerated(EnumType.STRING)
    private ERole name;
    
    // getters and setters
}

public enum ERole {
    ROLE_USER,
    ROLE_MODERATOR,
    ROLE_ADMIN
}
```

**认证接口：**

```java
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    @Autowired
    private AuthService authService;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    /**
     * 用户登录
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        String token = authService.login(request.getUsername(), request.getPassword());
        return ResponseEntity.ok(new JwtResponse(token));
    }
    
    /**
     * 用户注册
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {
        authService.register(request);
        return ResponseEntity.ok(new MessageResponse("注册成功"));
    }
    
    /**
     * 刷新 Token
     */
    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(HttpServletRequest request) {
        String token = jwtTokenProvider.resolveToken(request);
        String newToken = authService.refreshToken(token);
        return ResponseEntity.ok(new JwtResponse(newToken));
    }
    
    /**
     * 获取当前用户信息
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        return ResponseEntity.ok(userDetails);
    }
    
    /**
     * 登出(可选,如使用黑名单)
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request) {
        String token = jwtTokenProvider.resolveToken(request);
        authService.logout(token);
        return ResponseEntity.ok(new MessageResponse("登出成功"));
    }
}
```

**认证服务：**

```java
@Service
@Transactional
public class AuthService {
    
    @Autowired
    private AuthenticationManager authenticationManager;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private RoleRepository roleRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    @Autowired
    private RefreshTokenService refreshTokenService;
    
    /**
     * 用户登录
     */
    public String login(String username, String password) {
        // 1. 认证
        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(username, password)
        );
        
        // 2. 设置认证信息到 SecurityContext
        SecurityContextHolder.getContext().setAuthentication(authentication);
        
        // 3. 生成 Access Token
        String accessToken = jwtTokenProvider.generateToken(authentication);
        
        // 4. 生成 Refresh Token
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        RefreshToken refreshToken = refreshTokenService.createRefreshToken(
            userDetails.getUsername());
        
        // 5. 返回 Access Token
        return accessToken;
    }
    
    /**
     * 用户注册
     */
    public void register(RegisterRequest request) {
        // 1. 检查用户名是否存在
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("用户名已被使用");
        }
        
        // 2. 检查邮箱是否存在
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("邮箱已被使用");
        }
        
        // 3. 创建用户
        User user = new User();
        user.setUsername(request.getUsername());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(request.getEmail());
        
        // 4. 设置默认角色
        Role userRole = roleRepository.findByName(ERole.ROLE_USER)
            .orElseThrow(() -> new RuntimeException("角色不存在"));
        user.setRoles(Collections.singleton(userRole));
        
        // 5. 保存用户
        userRepository.save(user);
    }
    
    /**
     * 刷新 Token
     */
    public String refreshToken(String token) {
        if (token == null || !jwtTokenProvider.validateToken(token)) {
            throw new RuntimeException("Token 无效");
        }
        
        String username = jwtTokenProvider.getUsernameFromToken(token);
        RefreshToken refreshToken = refreshTokenService.getByUsername(username);
        
        if (refreshToken.isExpired()) {
            throw new RuntimeException("Refresh Token 已过期,请重新登录");
        }
        
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        UserDetails userDetails = CustomUserDetails.create(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
            userDetails, null, userDetails.getAuthorities());
        
        return jwtTokenProvider.generateToken(authentication);
    }
    
    /**
     * 登出(将 Token 加入黑名单)
     */
    public void logout(String token) {
        if (token != null && jwtTokenProvider.validateToken(token)) {
            // 将 Token 加入黑名单(使用 Redis)
            long expiresIn = jwtTokenProvider.getExpirationFromToken(token).getTime() 
                - System.currentTimeMillis();
            refreshTokenService.addToBlackList(token, expiresIn);
        }
    }
}
```

**JWT 认证过滤器：**

```java
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    @Autowired
    private CustomUserDetailsService userDetailsService;
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        
        try {
            // 1. 从请求中获取 Token
            String jwt = jwtTokenProvider.resolveToken(request);
            
            // 2. 验证 Token
            if (jwt != null && jwtTokenProvider.validateToken(jwt)) {
                // 3. 从 Token 中获取用户名
                String username = jwtTokenProvider.getUsernameFromToken(jwt);
                
                // 4. 加载用户信息
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                
                // 5. 创建认证对象
                UsernamePasswordAuthenticationToken authentication = 
                    new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities());
                
                authentication.setDetails(new WebAuthenticationDetailsSource()
                    .buildDetails(request));
                
                // 6. 设置到 SecurityContext
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (JwtException e) {
            logger.error("JWT 认证失败: {}", e.getMessage());
            SecurityContextHolder.clearContext();
        }
        
        filterChain.doFilter(request, response);
    }
}
```

**Security 配置：**

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {
    
    @Autowired
    private CustomUserDetailsService userDetailsService;
    
    @Autowired
    private JwtAuthenticationEntryPoint unauthorizedHandler;
    
    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
    
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) 
            throws Exception {
        
        http
            // 禁用 CSRF(前后端分离项目不需要)
            .csrf(csrf -> csrf.disable())
            
            // 禁用 Session(无状态)
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // 异常处理
            .exceptionHandling(exception -> 
                exception.authenticationEntryPoint(unauthorizedHandler))
            
            // 授权配置
            .authorizeHttpRequests(auth -> auth
                // 公开接口
                .requestMatchers("/api/auth/**").permitAll()
                .requestMatchers("/api/public/**").permitAll()
                
                // Swagger 文档
                .requestMatchers(
                    "/swagger-ui/**",
                    "/v3/api-docs/**",
                    "/swagger-resources/**"
                ).permitAll()
                
                // 管理员接口
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                
                // 其他接口需要认证
                .anyRequest().authenticated()
            )
            
            // 添加 JWT 过滤器
            .addFilterBefore(jwtAuthenticationFilter(), 
                UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
}
```

### 5.3 Refresh Token 机制

```java
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id")
    private User user;
    
    @Column(unique = true, nullable = false)
    private String token;
    
    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    // getters and setters
}

@Service
public class RefreshTokenService {
    
    @Value("${jwt.refresh-expiration:604800000}") // 7天
    private long refreshTokenDuration;
    
    @Autowired
    private RefreshTokenRepository refreshTokenRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    /**
     * 创建 Refresh Token
     */
    public RefreshToken createRefreshToken(String username) {
        // 删除旧的 Refresh Token
        refreshTokenRepository.deleteByUsername(username);
        
        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUser(userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("用户不存在")));
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiryDate(LocalDateTime.now()
            .plusMillis(refreshTokenDuration));
        refreshToken.setCreatedAt(LocalDateTime.now());
        
        return refreshTokenRepository.save(refreshToken);
    }
    
    /**
     * 验证 Refresh Token
     */
    public RefreshToken verifyExpiration(RefreshToken token) {
        if (token.getExpiryDate().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(token);
            throw new RuntimeException("Refresh Token 已过期");
        }
        return token;
    }
    
    /**
     * 将 Token 加入黑名单(Redis)
     */
    public void addToBlackList(String token, long expiresIn) {
        String key = "jwt:blacklist:" + token;
        redisTemplate.opsForValue().set(key, "1", expiresIn, TimeUnit.MILLISECONDS);
    }
    
    /**
     * 检查 Token 是否在黑名单中
     */
    public boolean isBlackListed(String token) {
        String key = "jwt:blacklist:" + token;
        return Boolean.TRUE.equals(redisTemplate.hasKey(key));
    }
}
```

## 六、安全最佳实践

### 6.1 HTTPS 强制使用

```java
@Configuration
public class SecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) 
            throws Exception {
        
        http
            // 强制 HTTPS
            .requiresChannel(channel -> 
                channel.anyRequest().requiresSecure())
            
            // ... 其他配置
        
        return http.build();
    }
}

// 或在 application.yml 中配置
/*
server:
  ssl:
    enabled: true
    key-store: classpath:keystore.p12
    key-store-password: your-password
    key-store-type: PKCS12
    key-alias: tomcat
  port: 8443
*/
```

### 6.2 CORS 配置

```java
@Configuration
public class CorsConfig {
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        // 允许的域名(生产环境必须配置具体域名)
        configuration.setAllowedOrigins(Arrays.asList(
            "https://example.com",
            "https://app.example.com"
        ));
        
        // 允许的方法
        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS"
        ));
        
        // 允许的头
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "X-Requested-With"
        ));
        
        // 允许携带凭证(Cookie)
        configuration.setAllowCredentials(true);
        
        // 预检请求缓存时间(秒)
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = 
            new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        
        return source;
    }
}

// 在 SecurityConfig 中启用
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) 
        throws Exception {
    
    http
        .cors(cors -> cors.configurationSource(corsConfigurationSource()))
        // ... 其他配置
    
    return http.build();
}
```

### 6.3 防暴力破解

```java
@Component
public class LoginAttemptService {
    
    private final int MAX_ATTEMPT = 5;
    private final long LOCK_TIME_DURATION = 15 * 60 * 1000; // 15分钟
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    /**
     * 登录失败,记录尝试次数
     */
    public void loginFailed(String username) {
        String key = "login:attempt:" + username;
        Long attempts = redisTemplate.opsForValue().increment(key);
        
        // 设置过期时间
        if (attempts != null && attempts == 1) {
            redisTemplate.expire(key, LOCK_TIME_DURATION, TimeUnit.MILLISECONDS);
        }
        
        // 超过最大尝试次数,锁定账户
        if (attempts != null && attempts >= MAX_ATTEMPT) {
            String lockKey = "login:locked:" + username;
            redisTemplate.opsForValue().set(
                lockKey, "1", LOCK_TIME_DURATION, TimeUnit.MILLISECONDS);
        }
    }
    
    /**
     * 登录成功,清除尝试记录
     */
    public void loginSucceeded(String username) {
        String key = "login:attempt:" + username;
        redisTemplate.delete(key);
    }
    
    /**
     * 检查账户是否被锁定
     */
    public boolean isLocked(String username) {
        String lockKey = "login:locked:" + username;
        return Boolean.TRUE.equals(redisTemplate.hasKey(lockKey));
    }
    
    /**
     * 获取剩余尝试次数
     */
    public int getRemainingAttempts(String username) {
        String key = "login:attempt:" + username;
        String attempts = redisTemplate.opsForValue().get(key);
        return MAX_ATTEMPT - (attempts == null ? 0 : Integer.parseInt(attempts));
    }
}

// 在认证服务中使用
@Service
public class AuthService {
    
    @Autowired
    private LoginAttemptService loginAttemptService;
    
    public String login(String username, String password) {
        // 1. 检查是否被锁定
        if (loginAttemptService.isLocked(username)) {
            throw new LockedException("账户已被锁定,请15分钟后重试");
        }
        
        try {
            // 2. 执行认证
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password)
            );
            
            // 3. 认证成功,清除尝试记录
            loginAttemptService.loginSucceeded(username);
            
            // 4. 生成 Token
            return jwtTokenProvider.generateToken(authentication);
            
        } catch (BadCredentialsException e) {
            // 5. 认证失败,记录尝试次数
            loginAttemptService.loginFailed(username);
            
            int remaining = loginAttemptService.getRemainingAttempts(username);
            throw new BadCredentialsException(
                "用户名或密码错误,剩余尝试次数: " + remaining);
        }
    }
}
```

### 6.4 敏感操作二次验证

```java
@RestController
@RequestMapping("/api/sensitive")
public class SensitiveController {
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    /**
     * 修改密码(需要二次验证)
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            @RequestBody ChangePasswordRequest request,
            Authentication authentication) {
        
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        User user = userRepository.findByUsername(userDetails.getUsername())
            .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        // 二次验证:验证当前密码
        if (!passwordEncoder.matches(request.getCurrentPassword(), 
                user.getPassword())) {
            throw new RuntimeException("当前密码错误");
        }
        
        // 执行修改密码逻辑
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        
        return ResponseEntity.ok(new MessageResponse("密码修改成功"));
    }
    
    /**
     * 删除账户(需要二次验证)
     */
    @DeleteMapping("/account")
    public ResponseEntity<?> deleteAccount(
            @RequestBody DeleteAccountRequest request,
            Authentication authentication) {
        
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        User user = userRepository.findByUsername(userDetails.getUsername())
            .orElseThrow(() -> new RuntimeException("用户不存在"));
        
        // 二次验证
        if (!passwordEncoder.matches(request.getPassword(), 
                user.getPassword())) {
            throw new RuntimeException("密码错误,无法删除账户");
        }
        
        // 软删除
        user.setEnabled(false);
        user.setDeletedAt(LocalDateTime.now());
        userRepository.save(user);
        
        return ResponseEntity.ok(new MessageResponse("账户已删除"));
    }
}
```

### 6.5 安全响应头

```java
@Configuration
public class SecurityHeadersConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) 
            throws Exception {
        
        http
            .headers(headers -> headers
                // 防止点击劫持
                .frameOptions(HeadersConfigurer.FrameOptionsConfig::deny)
                
                // X-Content-Type-Options
                .contentTypeOptions(contentType -> contentType.disable())
                .addHeaderWriter(
                    new StaticHeadersWriter("X-Content-Type-Options", "nosniff"))
                
                // X-XSS-Protection
                .xssProtection(xss -> xss.disable())
                .addHeaderWriter(
                    new StaticHeadersWriter("X-XSS-Protection", "1; mode=block"))
                
                // Strict-Transport-Security (HSTS)
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000))
                
                // Content-Security-Policy
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives(
                        "default-src 'self'; " +
                        "script-src 'self' 'unsafe-inline' https://cdn.example.com; " +
                        "style-src 'self' 'unsafe-inline' https://cdn.example.com; " +
                        "img-src 'self' data: https:; " +
                        "font-src 'self' https://cdn.example.com; " +
                        "connect-src 'self' https://api.example.com; " +
                        "frame-ancestors 'none';"
                    ))
                
                // Referrer-Policy
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy
                        .STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                
                // Permissions-Policy
                .addHeaderWriter(new StaticHeadersWriter(
                    "Permissions-Policy",
                    "geolocation=(), microphone=(), camera=()"
                ))
            );
        
        return http.build();
    }
}
```

## 七、常见误区与陷阱

### 7.1 JWT 等于安全

**误区：**认为使用了 JWT 就自动保证了系统安全。

**真相：**JWT 只是令牌载体，本身不解决安全问题。

```java
// × 错误示例:过度信任 JWT
@Service
public class BadService {
    
    public void transferMoney(String token, BigDecimal amount) {
        // 问题:没有验证 Token 是否被篡改
        // 问题:没有验证用户是否有权限转账
        // 问题:没有验证金额是否合法
        Claims claims = Jwts.parser().parseClaimsJwt(token).getBody();
        String userId = claims.getSubject();
        
        // 直接执行转账,没有任何安全检查
        bankService.transfer(userId, amount);
    }
}

// √ 正确示例:完整的安全检查
@Service
public class GoodService {
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    public void transferMoney(String token, BigDecimal amount) {
        // 1. 验证 Token 有效性
        if (!jwtTokenProvider.validateToken(token)) {
            throw new SecurityException("Token 无效");
        }
        
        // 2. 获取认证信息
        Authentication auth = jwtTokenProvider.getAuthentication(token);
        UserDetails user = (UserDetails) auth.getPrincipal();
        
        // 3. 检查权限
        if (!auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("TRANSFER"))) {
            throw new AccessDeniedException("无转账权限");
        }
        
        // 4. 业务验证
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("转账金额必须大于0");
        }
        
        // 5. 执行转账
        bankService.transfer(user.getUsername(), amount);
    }
}
```

### 7.2 权限控制只做前端判断

**误区：**通过前端隐藏按钮或菜单来实现权限控制。

**真相：**前端隐藏只能改善体验，真正的安全边界必须在服务端。

```java
// × 错误示例:只在前端控制
// 前端代码
/*
if (user.role === 'ADMIN') {
    // 显示删除按钮
    showDeleteButton();
}
*/

// 后端代码
@RestController
public class BadController {
    
    @DeleteMapping("/api/users/{id}")
    public void deleteUser(@PathVariable Long id) {
        // 问题:没有权限验证,任何人都能删除
        userService.deleteUser(id);
    }
}

// √ 正确示例:前后端都做权限控制
// 前端代码
/*
// 根据权限显示按钮
if (hasPermission('user:delete')) {
    showDeleteButton();
}
*/

// 后端代码
@RestController
public class GoodController {
    
    @PreAuthorize("hasAuthority('user:delete')")
    @DeleteMapping("/api/users/{id}")
    public void deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
    }
}
```

### 7.3 在 JWT 里放过多业务敏感信息

**误区：**把所有业务数据都放到 JWT Payload 中。

**真相：**JWT Payload 只是编码，任何人都能看到内容。

```java
// × 错误示例:放敏感信息
public String generateToken(User user) {
    return Jwts.builder()
        .setSubject(user.getUsername())
        .claim("password", user.getPassword())        // 禁止!
        .claim("idCard", user.getIdCard())            // 禁止!
        .claim("bankAccount", user.getBankAccount())  // 禁止!
        .signWith(SignatureAlgorithm.HS256, secret)
        .compact();
}

// √ 正确示例:只放必要信息
public String generateToken(User user) {
    return Jwts.builder()
        .setSubject(user.getUsername())
        .claim("userId", user.getId())
        .claim("roles", user.getRoles())
        .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION))
        .signWith(SignatureAlgorithm.HS256, secret)
        .compact();
}

// 需要敏感信息时,从数据库查询
@Service
public class UserService {
    
    public UserInfo getUserInfo(Long userId) {
        // 从数据库查询完整信息
        return userRepository.findById(userId)
            .map(this::toUserInfo)
            .orElseThrow(() -> new UserNotFoundException());
    }
}
```

### 7.4 不区分认证和授权

**误区：**认为认证成功就等于有权限访问所有资源。

**真相：**认证解决"你是谁"，授权解决"你能做什么"，两者必须分开。

```java
// × 错误示例:混淆认证和授权
@Configuration
public class BadSecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) 
            throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                // 问题:所有认证用户都能访问所有接口
                .anyRequest().authenticated()
            );
        return http.build();
    }
}

// √ 正确示例:明确区分
@Configuration
public class GoodSecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) 
            throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                // 公开资源:无需认证
                .requestMatchers("/public/**").permitAll()
                
                // 普通用户资源:需要认证
                .requestMatchers("/user/**").hasRole("USER")
                
                // 管理员资源:需要 ADMIN 角色
                .requestMatchers("/admin/**").hasRole("ADMIN")
                
                // 特定权限:需要特定权限
                .requestMatchers("/api/orders/delete")
                    .hasAuthority("order:delete")
                
                // 其他资源:需要认证
                .anyRequest().authenticated()
            );
        return http.build();
    }
}
```

### 7.5 Token 永不过期

**误区：**为了方便，设置 Token 永不过期或过期时间很长。

**真相：**Token 一旦泄露，风险会持续存在。

```java
// × 错误示例:Token 永不过期
public String generateToken(User user) {
    return Jwts.builder()
        .setSubject(user.getUsername())
        // 问题:没有设置过期时间
        .signWith(SignatureAlgorithm.HS256, secret)
        .compact();
}

// 或设置过期时间太长
@Value("${jwt.expiration:315360000000}") // 10年!
private long jwtExpiration;

// √ 正确示例:合理的过期时间
// Access Token: 15-30分钟
@Value("${jwt.access-token-expiration:1800000}")
private long accessTokenExpiration; // 30分钟

// Refresh Token: 7-30天
@Value("${jwt.refresh-token-expiration:604800000}")
private long refreshTokenExpiration; // 7天

public String generateAccessToken(User user) {
    return Jwts.builder()
        .setSubject(user.getUsername())
        .setExpiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
        .signWith(SignatureAlgorithm.HS256, secret)
        .compact();
}
```

## 八、面试要点

### 8.1 基础概念题

**Q1: 认证（Authentication）和授权（Authorization）有什么区别？**

```
认证(Authentication):
- 解决"你是谁"的问题
- 验证用户身份的有效性
- 例如:用户名密码登录、Token 校验
- 发生在授权之前

授权(Authorization):
- 解决"你能做什么"的问题
- 判断用户是否有权限访问资源
- 例如:角色检查、权限验证
- 发生在认证之后

关系:
- 认证是授权的前提
- 不知道"是谁",就无法判断"能做什么"
```

**Q2: 为什么密码要单向加密？**

```
核心原因:

1. 服务端不应该知道用户原始密码
   - 即使系统管理员也不应该能看到用户密码
   - 保护用户隐私

2. 数据库泄露风险
   - 即使数据库被拖库,也无法还原密码
   - 降低撞库攻击风险

3. 用户密码复用
   - 很多用户在多个网站使用相同密码
   - 泄露一个网站的密码会影响多个网站

4. 合规要求
   - 数据保护法规要求密码不能明文存储
   - 如 GDPR、网络安全法等
```

**Q3: Session 和 JWT 的区别是什么？**

```
Session:
- 状态存储在服务端
- 客户端只保存 Session ID
- 需要Session共享机制才能支持集群
- 服务端可以主动失效 Session
- Cookie 容易受到 CSRF 攻击

JWT:
- 状态存储在客户端
- Token 包含用户信息
- 天然支持分布式和集群
- Token 签发后难以主动失效
- 需要额外机制实现黑名单

选择建议:
- 传统服务端渲染应用:Session
- 前后端分离/移动端:JWT
- 微服务架构:JWT
- 需要即时踢出用户:Session
```

### 8.2 Spring Security 核心题

**Q4: Spring Security 为什么依赖过滤器链？**

```
原因:

1. 请求入口控制
   - 请求在到达 Controller 之前先经过过滤器
   - 可以统一处理认证和授权
   - 避免每个 Controller 都写安全代码

2. 关注点分离
   - 安全逻辑与业务逻辑分离
   - 安全配置集中管理
   - 易于维护和测试

3. 灵活性
   - 可以自定义过滤器
   - 可以调整过滤器顺序
   - 可以添加或移除过滤器

4. 标准化
   - 遵循 Servlet 规范
   - 与容器集成
   - 兼容性好
```

**Q5: AuthenticationManager、AuthenticationProvider 和 UserDetailsService 的关系？**

```
AuthenticationManager:
- 认证管理器,顶层接口
- 定义认证方法 authenticate()
- ProviderManager 是最常见的实现

AuthenticationProvider:
- 认证提供者,真正执行认证逻辑
- 一个 ProviderManager 可以有多个 Provider
- 每个 Provider 支持不同的认证方式
- 例如:DaoAuthenticationProvider、JwtAuthenticationProvider

UserDetailsService:
- 用户详情服务
- 加载用户信息(用户名、密码、权限)
- 供 AuthenticationProvider 使用

工作流程:
1. 用户提交认证信息
2. AuthenticationManager 接收认证请求
3. ProviderManager 遍历所有 Provider
4. 找到支持当前认证类型的 Provider
5. Provider 调用 UserDetailsService 加载用户信息
6. Provider 执行认证(如密码验证)
7. 认证成功返回 Authentication 对象
```

**Q6: SecurityContext 是如何工作的？**

```
SecurityContext:
- 存储当前用户的安全信息
- 包含 Authentication 对象
- 每个用户请求都有独立的 SecurityContext

工作流程:

1. 请求到达
   ↓
2. SecurityContextPersistenceFilter 从 Session 中恢复 SecurityContext
   ↓
3. 认证过滤器将 Authentication 存入 SecurityContext
   ↓
4. 业务代码从 SecurityContext 获取当前用户信息
   ↓
5. 请求结束,SecurityContextPersistenceFilter 将 SecurityContext 保存到 Session

使用方式:
// 获取当前用户
Authentication auth = SecurityContextHolder.getContext().getAuthentication();
UserDetails user = (UserDetails) auth.getPrincipal();

// 手动设置认证信息(一般不需要)
SecurityContextHolder.getContext().setAuthentication(authentication);
```

### 8.3 JWT 深度题

**Q7: JWT 的结构是怎样的？各部分有什么作用？**

```
JWT 结构: header.payload.signature

1. Header(头部):
   {
     "alg": "HS256",  // 签名算法
     "typ": "JWT"     // Token 类型
   }
   作用: 说明 Token 类型和签名算法

2. Payload(载荷):
   {
     "sub": "1234567890",  // 主题(通常是用户ID)
     "name": "张三",        // 自定义字段
     "iat": 1516239022,    // 签发时间
     "exp": 1516242622     // 过期时间
   }
   作用: 存储用户信息和声明(Claims)
   
   重要提醒:
   - Payload 只是 Base64 编码,不是加密
   - 任何人都能看到 Payload 内容
   - 不要放敏感信息

3. Signature(签名):
   HMACSHA256(
     base64UrlEncode(header) + "." + base64UrlEncode(payload),
     secret
   )
   作用: 保证 Token 不被篡改
```

**Q8: JWT 如何保证安全性？**

```
JWT 安全机制:

1. 签名验证
   - 使用密钥对 Token 签名
   - 服务端验证签名确保 Token 不被篡改
   - 密钥必须保密,定期更换

2. 过期时间
   - Access Token 短有效期(15-30分钟)
   - Refresh Token 长有效期(7-30天)
   - Token 过期后必须重新获取

3. HTTPS 传输
   - 必须使用 HTTPS
   - 防止中间人攻击
   - 保护 Token 不被窃取

4. 安全存储
   - 推荐使用 HttpOnly Cookie
   - 防止 XSS 攻击
   - 如用 localStorage,需做好 XSS 防护

5. 最小权限原则
   - Payload 只放必要信息
   - 不放敏感信息
   - 权限验证仍在服务端进行

6. 黑名单机制
   - Token 失效场景(登出、改密码)
   - 使用 Redis 存储黑名单
   - 或使用短过期时间 + Refresh Token
```

**Q9: JWT Token 泄露后如何处理？**

```
Token 泄露的风险:
- 攻击者可以冒充用户身份
- 在 Token 有效期内持续访问
- 可能访问用户敏感数据

处理方案:

1. 短过期时间
   - Access Token 有效期设短(15-30分钟)
   - 泄露后影响时间窗口小

2. 黑名单机制
   - 发现泄露后立即加入黑名单
   - 使用 Redis 存储,快速失效
   - 缺点:需要维护黑名单,不再是纯无状态

3. Refresh Token 轮换
   - 每次刷新时生成新的 Refresh Token
   - 旧的 Refresh Token 立即失效
   - 检测到重复使用,说明可能泄露

4. Token 版本控制
   - 用户数据中维护 Token 版本号
   - Token 中包含版本号
   - 验证时检查版本号是否匹配
   - 泄露后修改版本号使所有 Token 失效

5. IP 白名单
   - Token 绑定 IP 地址
   - IP 变化时要求重新登录
   - 缺点:移动场景不友好

最佳实践:
- Access Token 短过期时间
- Refresh Token 支持"吊销"
- 重要操作需要二次验证
- 监控异常登录行为
```

### 8.4 实战场景题

**Q10: 如何实现"记住我"功能？**

```
方案1: 延长 Refresh Token 有效期
- Access Token: 30分钟
- Refresh Token 不勾选"记住我": 7天
- Refresh Token 勾选"记住我": 30天

方案2: 持久化 Token
- 登录时生成一个长期 Token 存入数据库
- 用户勾选"记住我"时返回此 Token
- 客户端保存到 Cookie(持久化 Cookie)
- 下次访问时使用此 Token 自动登录

实现示例:
// 登录接口
@PostMapping("/login")
public ResponseEntity<?> login(
        @RequestBody LoginRequest request,
        @RequestParam(required = false) boolean rememberMe) {
    
    Authentication auth = authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(
            request.getUsername(), 
            request.getPassword()
        )
    );
    
    String accessToken = jwtTokenProvider.generateToken(auth);
    
    String refreshToken;
    if (rememberMe) {
        // "记住我": Refresh Token 有效期30天
        refreshToken = refreshTokenService.createRefreshToken(
            auth.getName(), 30 * 24 * 60 * 60 * 1000L);
    } else {
        // 普通: Refresh Token 有效期7天
        refreshToken = refreshTokenService.createRefreshToken(
            auth.getName(), 7 * 24 * 60 * 60 * 1000L);
    }
    
    return ResponseEntity.ok(new JwtResponse(accessToken, refreshToken));
}
```

**Q11: 如何实现多设备登录控制？**

```
方案1: 单设备登录(新登录踢掉旧登录)
- 每个用户只允许一个有效的 Refresh Token
- 新登录时删除旧的 Refresh Token
- 旧设备使用旧 Refresh Token 刷新时会失败

方案2: 多设备登录限制(最多 N 个设备)
- 每个用户允许最多 N 个 Refresh Token
- 超过限制时删除最旧的 Token
- 使用 Redis 按时间排序管理

方案3: 设备管理(用户可查看和管理设备)
- 每个登录生成唯一的设备 ID
- 存储设备信息(设备类型、IP、登录时间)
- 提供接口让用户查看已登录设备
- 用户可以主动踢出某个设备

实现示例:
@Service
public class DeviceManagementService {
    
    @Autowired
    private RedisTemplate<String, String> redisTemplate;
    
    private static final int MAX_DEVICES = 5;
    
    /**
     * 注册新设备
     */
    public void registerDevice(Long userId, String deviceId, String refreshToken) {
        String key = "user:devices:" + userId;
        
        // 添加设备
        redisTemplate.opsForHash().put(key, deviceId, refreshToken);
        
        // 检查设备数量
        Long deviceCount = redisTemplate.opsForHash().size(key);
        if (deviceCount > MAX_DEVICES) {
            // 删除最旧的设备(按添加顺序)
            // 实际实现需要维护设备添加时间
            removeOldestDevice(userId);
        }
    }
    
    /**
     * 获取用户所有设备
     */
    public List<DeviceInfo> getUserDevices(Long userId) {
        String key = "user:devices:" + userId;
        Map<Object, Object> devices = redisTemplate.opsForHash().entries(key);
        
        return devices.entrySet().stream()
            .map(entry -> new DeviceInfo(
                (String) entry.getKey(),
                (String) entry.getValue()
            ))
            .collect(Collectors.toList());
    }
    
    /**
     * 踢出设备
     */
    public void removeDevice(Long userId, String deviceId) {
        String key = "user:devices:" + userId;
        
        // 获取 Refresh Token
        String refreshToken = (String) redisTemplate.opsForHash().get(key, deviceId);
        
        // 将 Refresh Token 加入黑名单
        if (refreshToken != null) {
            addToBlackList(refreshToken);
        }
        
        // 删除设备记录
        redisTemplate.opsForHash().delete(key, deviceId);
    }
}
```

**Q12: 微服务架构下如何做统一认证？**

```
方案: 网关统一认证 + 内部服务免认证

架构:
客户端 → 网关(认证) → 内部服务(免认证)

实现步骤:

1. 网关层(Spring Cloud Gateway):
   - 拦截所有请求
   - 验证 JWT Token
   - 解析用户信息
   - 将用户信息注入请求头
   - 转发到内部服务

2. 内部服务:
   - 从请求头获取用户信息
   - 无需再次验证 Token
   - 直接使用网关注入的用户信息

代码示例:

// 网关过滤器
@Component
public class JwtAuthGatewayFilter implements GlobalFilter {
    
    @Autowired
    private JwtTokenProvider jwtTokenProvider;
    
    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        
        // 1. 排除不需要认证的路径
        if (isExcludedPath(request.getPath().value())) {
            return chain.filter(exchange);
        }
        
        // 2. 从请求头获取 Token
        String token = extractToken(request);
        
        if (token == null) {
            return onError(exchange, "未提供认证令牌");
        }
        
        // 3. 验证 Token
        if (!jwtTokenProvider.validateToken(token)) {
            return onError(exchange, "令牌无效或已过期");
        }
        
        // 4. 解析用户信息
        Claims claims = jwtTokenProvider.getClaimsFromToken(token);
        String userId = claims.getSubject();
        String username = claims.get("username", String.class);
        String roles = claims.get("roles", String.class);
        
        // 5. 将用户信息注入请求头
        ServerHttpRequest mutatedRequest = request.mutate()
            .header("X-User-Id", userId)
            .header("X-Username", username)
            .header("X-Roles", roles)
            .build();
        
        // 6. 转发请求
        return chain.filter(exchange.mutate().request(mutatedRequest).build());
    }
}

// 内部服务用户信息解析
@Component
public class InternalUserFilter extends OncePerRequestFilter {
    
    @Override
    protected void doFilterInternal(
            HttpServletRequest request, 
            HttpServletResponse response, 
            FilterChain filterChain) throws ServletException, IOException {
        
        // 从请求头获取用户信息
        String userId = request.getHeader("X-User-Id");
        String username = request.getHeader("X-Username");
        String roles = request.getHeader("X-Roles");
        
        if (userId != null && username != null) {
            // 构建 Authentication 对象
            UserDetails userDetails = User.builder()
                .username(username)
                .password("")
                .authorities(parseRoles(roles))
                .build();
            
            Authentication auth = new UsernamePasswordAuthenticationToken(
                userDetails, null, userDetails.getAuthorities());
            
            // 设置到 SecurityContext
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        
        filterChain.doFilter(request, response);
    }
}
```

---

**参考资料：**

- [Spring Security 官方文档](https://docs.spring.io/spring-security/reference/)
- [JWT.io - JSON Web Tokens](https://jwt.io/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [BCrypt Password Hashing](https://auth0.com/blog/hashing-in-action-understanding-bcrypt/)

**下一步学习：**

- [RBAC 与权限设计](01-RBAC与权限设计.md)
- [OAuth2 与刷新令牌](02-OAuth2与刷新令牌.md)
- [过滤器链与 SecurityContext](03-过滤器链与SecurityContext.md)
- [CSRF、CORS 与会话安全](04-CSRF-CORS与会话安全.md)

## 版本差异（旧版 → Spring Security 6.x）

| 特性 | 旧版（Spring Security 5.x） | Spring Security 6.x |
|------|--------------------------|---------------------|
| 配置方式 | WebSecurityConfigurerAdapter | SecurityFilterChain Bean（Adapter 已移除） |
| 命名空间 | javax.* | jakarta.* |
| JWT 库 | jjwt 0.x | jjwt 0.11+ / 0.12（支持 EdDSA；0.12 起构建/解析 API 全面更新） |
| 授权 API | authorizeRequests（5.8 起废弃，6.1 移除） | authorizeHttpRequests（5.8 引入，6.x 唯一方式） |
| CSRF | 默认开启 | 默认开启；6.0 起默认启用 BREACH 防护（XorCsrfTokenRequestAttributeHandler） |
