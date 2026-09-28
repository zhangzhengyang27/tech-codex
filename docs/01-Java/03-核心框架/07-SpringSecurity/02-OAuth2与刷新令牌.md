---
title: "OAuth2与刷新令牌"
description: "OAuth2 是现代 Web 服务里非常常见的授权协议。它要解决的不是\"用户怎么登录本系统\"这么简单，而是\"应用如何在用户授权下，安全地访问受保护资源\"。"
keywords: [OAuth2与刷新令牌]
category: "Java"
tags: [Java, SpringSecurity]
---


# OAuth2 与刷新令牌

OAuth2 是现代 Web 服务里非常常见的授权协议。它要解决的不是"用户怎么登录本系统"这么简单，而是"应用如何在用户授权下，安全地访问受保护资源"。

在前后端分离、第三方登录、开放平台和多服务体系里，这个问题会非常常见。

## OAuth2 解决什么问题

OAuth2 的核心目标是：

- 不把用户密码直接交给第三方应用
- 让资源访问建立在授权和令牌机制之上
- 把身份认证、授权发令牌、资源访问这几件事拆开

它最适合回答的问题是：

- 某个客户端是否有资格代表用户访问资源服务器
- 它能访问哪些资源
- 令牌什么时候失效、如何刷新

### 传统方案的痛点

在 OAuth2 出现之前，第三方应用访问用户资源的方式通常是：

**方案一：直接共享密码**
- 用户将密码告诉第三方应用
- 第三方应用使用用户名密码登录
- 问题：密码泄露风险极高，无法精细控制权限范围

**方案二：API Key**
- 用户生成专门的 API Key 给第三方
- 第三方使用 API Key 访问资源
- 问题：难以区分不同客户端，权限控制粗粒度

OAuth2 通过引入授权服务器和令牌机制，解决了这些问题：

```
传统方式:
用户 → 密码 → 第三方应用 → 使用密码访问资源服务器

OAuth2 方式:
用户 → 授权确认 → 授权服务器 → 颁发令牌 → 第三方应用 → 使用令牌访问资源服务器
```

## OAuth2 的四个角色

OAuth2 中最常见的四个角色包括：

| 角色 | 含义 | 示例 |
|---|---|---|
| 资源拥有者（Resource Owner） | 通常是最终用户，控制授权 | 微信用户 |
| 客户端（Client） | 发起请求的应用，例如前端、移动端、第三方应用 | 某个第三方网站 |
| 授权服务器（Authorization Server） | 负责认证用户、颁发令牌 | 微信开放平台 |
| 资源服务器（Resource Server） | 持有受保护资源，验证令牌后返回数据 | 微信用户信息接口 |

理解这四个角色很重要，因为 OAuth2 的核心不是"多一个 Token"，而是把原本耦合在一起的身份和资源访问解耦。

### 角色交互示例

以"使用微信登录某网站并获取用户信息"为例：

```
1. 用户(资源拥有者)访问第三方网站(客户端)
2. 网站重定向用户到微信授权服务器
3. 用户在微信授权服务器登录并同意授权
4. 授权服务器返回授权码给网站
5. 网站使用授权码向授权服务器换取 Access Token
6. 网站使用 Access Token 向资源服务器(微信API)获取用户信息
```

## OAuth2 的四种授权模式

OAuth2 定义了四种授权模式，每种适用于不同场景：

### 1. 授权码模式（Authorization Code）

**最安全、最常用的模式**,适合有后端的 Web 应用。

**流程：**

```
+----------+                                +------------------+
|          |                                |                  |
|  用户    |                                |  授权服务器      |
|          |                                |                  |
+----------+                                +------------------+
     |                                              ^
     | (A) 用户访问客户端                           |
     v                                              |
+----------+                                +------------------+
|          |--(B)-> 重定向到授权服务器 ----->|                  |
|  客户端  |                                |  授权服务器      |
|          |<-(C)- 返回授权码 -------------|                  |
+----------+                                +------------------+
     |                                              ^
     | (D) 使用授权码换取令牌                       |
     +----------------------------------------------+
                                                    |
                                                    v
                                            +------------------+
                                            |                  |
                                            |  资源服务器      |
                                            |                  |
                                            +------------------+
```

**详细步骤：**

1. **用户发起授权请求**
   ```
   GET /authorize?
       response_type=code&
       client_id=CLIENT_ID&
       redirect_uri=REDIRECT_URI&
       scope=read:user&
       state=xyz
   ```

2. **用户登录并授权**
   - 授权服务器展示授权页面
   - 用户确认授权范围

3. **返回授权码**
   ```
   HTTP/1.1 302 Found
   Location: REDIRECT_URI?code=AUTHORIZATION_CODE&state=xyz
   ```

4. **客户端使用授权码换取令牌**
   ```
   POST /oauth/token
   Content-Type: application/x-www-form-urlencoded

   grant_type=authorization_code&
   code=AUTHORIZATION_CODE&
   redirect_uri=REDIRECT_URI&
   client_id=CLIENT_ID&
   client_secret=CLIENT_SECRET
   ```

5. **返回令牌**
   ```json
   {
     "access_token": "ACCESS_TOKEN",
     "token_type": "Bearer",
     "expires_in": 3600,
     "refresh_token": "REFRESH_TOKEN",
     "scope": "read:user"
   }
   ```

**安全性分析：**
- √ 授权码通过前端传递，但只能使用一次
- √ Access Token 在后端交换，不暴露给前端
- √ 需要 client_secret 验证客户端身份
- √ 支持精确的 scope 权限控制

### 2. 隐式模式（Implicit）

**已不推荐使用**,适合纯前端应用（无后端）。安全风险高，已被 PKCE 增强的授权码模式取代。

**流程：**

```
用户 → 客户端(前端) → 授权服务器
                    ↓
              直接返回 Access Token
```

**问题：**
- × Token 直接暴露在浏览器 URL 中
- × 无法使用 Refresh Token
- × 容易被 XSS 攻击窃取

### 3. 密码模式（Resource Owner Password Credentials）

**仅适用于高度信任的客户端**,如官方移动应用。

**流程：**

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=password&
username=USER_NAME&
password=PASSWORD&
scope=read:user
```

**返回：**

```json
{
  "access_token": "ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "REFRESH_TOKEN"
}
```

**适用场景：**
- 官方移动应用（用户能辨别真伪）
- 内部系统间的服务调用
- 遗留系统迁移过渡期

**不适用场景：**
- × 第三方应用（无法信任）
- × Web 前端（密码会暴露）

### 4. 客户端凭证模式（Client Credentials）

**适用于服务间通信**,无用户参与。

**流程：**

```
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&
client_id=CLIENT_ID&
client_secret=CLIENT_SECRET&
scope=service:read
```

**返回：**

```json
{
  "access_token": "ACCESS_TOKEN",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "service:read"
}
```

**特点：**
- 无用户概念，令牌代表客户端本身
- 不返回 Refresh Token（通常不需要）
- 适合后端服务间调用

### 授权模式选择指南

| 模式 | 适用场景 | 安全等级 | 是否支持 Refresh Token |
|---|---|---|---|
| 授权码模式 | Web 应用、有后端 | 高 | √ |
| 授权码+PKCE | 移动应用、SPA | 高 | √ |
| 隐式模式 | 已废弃 | 低（勿用） | × |
| 密码模式 | 官方应用、内部系统 | 中（凭证暴露给客户端） | √ |
| 客户端凭证 | 服务间通信 | 中（无用户上下文） | × |

## 授权码模式为什么最常见

在今天的业务系统里，最值得重点理解的是授权码模式（Authorization Code Grant）。

它的核心流程通常是：

1. 客户端把用户重定向到授权服务器
2. 用户登录并同意授权
3. 授权服务器返回临时 
4. 客户端后端用这个 code 去换取  和 
5. 客户端再携带  访问资源服务器

它之所以常见，是因为它能把敏感凭证尽量留在服务端，而不是暴露给浏览器前端。

### 授权码的关键安全特性

**1. 一次性使用**
```java
// 授权码使用后立即失效
public class AuthorizationCodeService {
    private Map<String, AuthorizationCode> codeStore = new ConcurrentHashMap<>();
    
    public AuthorizationCode consumeCode(String code) {
        AuthorizationCode authCode = codeStore.remove(code); // 一次性
        if (authCode == null) {
            throw new InvalidGrantException("Invalid authorization code");
        }
        if (authCode.isExpired()) {
            throw new InvalidGrantException("Authorization code expired");
        }
        return authCode;
    }
}
```

**2. 短期有效**
```java
// 授权码通常 5-10 分钟过期
AuthorizationCode authCode = AuthorizationCode.builder()
    .code(generateCode())
    .clientId(clientId)
    .redirectUri(redirectUri)
    .expiresAt(Instant.now().plusSeconds(600)) // 10 分钟
    .build();
```

**3. 绑定客户端和重定向 URI**
```java
// 验证时检查 redirect_uri 是否一致
if (!authCode.getRedirectUri().equals(redirectUri)) {
    throw new InvalidGrantException("Redirect URI mismatch");
}
```

### PKCE 增强（针对移动端和 SPA）

PKCE（Proof Key for Code Exchange）为授权码模式增加了一层保护：

```javascript
// 1. 生成 code_verifier 和 code_challenge
function generatePKCE() {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = sha256(codeVerifier);
  return { codeVerifier, codeChallenge };
}

// 2. 授权请求携带 code_challenge
const authUrl = `https://auth.example.com/authorize?
  response_type=code&
  client_id=CLIENT_ID&
  redirect_uri=REDIRECT_URI&
  code_challenge=${codeChallenge}&
  code_challenge_method=S256`;

// 3. 换取令牌时携带 code_verifier
const tokenResponse = await fetch('/oauth/token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    code_verifier: codeVerifier, // 证明是同一个客户端
    client_id: CLIENT_ID
  })
});
```

**防止了什么攻击：**
- × 授权码被拦截后无法换取令牌（没有 code_verifier）
- × 恶意应用冒充合法客户端

## Access Token 与 Refresh Token 的区别

| 对比项 | Access Token | Refresh Token |
|---|---|---|
| 生命周期 | 短，通常分钟级 | 长，通常天级到月级 |
| 用途 | 直接访问资源服务器 | 换取新的 Access Token |
| 暴露风险 | 高，但有效期短 | 更高，必须更谨慎保护 |
| 使用频率 | 每次请求都可能用到 | 仅在刷新时使用 |
| 存储位置 | 前端内存或短期存储 | 服务端或 HttpOnly Cookie |
| 撤销方式 | 等待过期或主动撤销 | 主动撤销或轮换失效 |

可以简单理解为：

- Access Token 是"短期通行证"
- Refresh Token 是"续期凭证"

### Access Token 的设计考量

**1. 有效期设置**
```yaml
# 建议配置
access-token:
  short-lived:
    expires-in: 900  # 15 分钟(高敏感操作)
  medium-lived:
    expires-in: 3600 # 1 小时(常规业务)
  long-lived:
    expires-in: 7200 # 2 小时(内部系统)
```

**2. Token 格式选择**

**JWT 格式（推荐）:**
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user123",
    "aud": "api.example.com",
    "iss": "auth.example.com",
    "exp": 1234567890,
    "iat": 1234560000,
    "scope": "read:user write:order",
    "client_id": "client_app"
  }
}
```

优点：
- √ 无状态，资源服务器可自验证
- √ 携带用户信息和权限
- √ 性能好，无需查询数据库

缺点：
- × 无法主动撤销（需配合黑名单）
- × Payload 不加密，不能存敏感信息

**Opaque Token（不透明令牌）:**
```
9d8f7a6b-5c4d-3e2f-1a0b-9c8d7e6f5a4b
```

优点：
- √ 可随时撤销
- √ 安全性高

缺点：
- × 每次请求需查询授权服务器
- × 性能开销大

### Refresh Token 的安全要求

**1. 存储安全**
```java
// 不推荐:存储在 localStorage(易受 XSS 攻击)
localStorage.setItem('refresh_token', refreshToken);

// 推荐:存储在 HttpOnly Cookie
response.setHeader("Set-Cookie", 
    "refresh_token=" + refreshToken + 
    "; HttpOnly; Secure; SameSite=Strict; Path=/oauth/token");
```

**2. 绑定设备信息**
```java
// 生成 Refresh Token 时绑定设备
RefreshToken token = RefreshToken.builder()
    .token(generateToken())
    .userId(userId)
    .deviceId(deviceId) // 绑定设备
    .userAgent(userAgent) // 绑定浏览器
    .ipAddress(ipAddress) // 绑定 IP(可选)
    .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
    .build();
```

**3. 单设备单 Token**
```java
// 每个设备维护独立的 Refresh Token
public class RefreshTokenService {
    // key = userId:deviceId
    private Map<String, RefreshToken> tokenStore = new ConcurrentHashMap<>();
    
    public RefreshToken createToken(String userId, String deviceId) {
        String key = userId + ":" + deviceId;
        // 旧 Token 失效
        tokenStore.remove(key);
        // 生成新 Token
        RefreshToken token = generateToken(userId, deviceId);
        tokenStore.put(key, token);
        return token;
    }
}
```

## 为什么需要刷新令牌

如果 Access Token 永不过期，一旦泄露，风险就会长期存在。  
如果每次过期都要求用户重新登录，体验又会很差。

所以更常见的折中方案是：

- Access Token 设为短期有效
- Refresh Token 用于在不重新登录的情况下换新 Access Token

这样既兼顾了安全性，也兼顾了使用体验。

### 刷新令牌的价值

**1. 安全性提升**
```
假设 Access Token 泄露:
- 有效期 1 小时 → 最多暴露 1 小时的风险
- 有效期永久 → 风险持续到用户修改密码

假设 Refresh Token 泄露:
- 可以轮换失效
- 可以主动撤销
- 可以检测异常使用
```

**2. 用户体验优化**
```
无刷新令牌:
Access Token 过期 → 用户重新登录 → 体验差

有刷新令牌:
Access Token 过期 → 自动刷新 → 用户无感知
```

**3. 权限更新机制**
```java
// 刷新时重新加载权限
public AccessToken refreshAccessToken(String refreshToken) {
    RefreshToken stored = validateRefreshToken(refreshToken);
    
    // 重新查询最新权限
    User user = userRepository.findById(stored.getUserId());
    List<String> currentScopes = user.getScopes();
    
    // 生成新的 Access Token
    return generateAccessToken(user.getId(), currentScopes);
}
```

## 刷新令牌的典型流程

一个常见刷新流程通常如下：

1. 用户登录成功，服务端同时签发 Access Token 和 Refresh Token
2. 客户端请求资源时使用 Access Token
3. Access Token 过期后，客户端调用刷新接口
4. 服务端验证 Refresh Token 是否有效
5. 验证通过后签发新的 Access Token
6. 必要时轮换新的 Refresh Token

这里的关键点不是"能不能换"，而是：

- 谁来持有 Refresh Token
- 刷新失败时怎么处理
- 旧 Refresh Token 是否立即失效

### 刷新令牌的完整实现

**1. 刷新接口设计**

```java
@RestController
@RequestMapping("/oauth")
public class TokenController {
    
    @Autowired
    private RefreshTokenService refreshTokenService;
    
    @Autowired
    private JwtTokenProvider tokenProvider;
    
    @PostMapping("/token/refresh")
    public ResponseEntity<?> refreshToken(
            @RequestHeader("Refresh-Token") String refreshToken,
            HttpServletRequest request) {
        
        // 1. 验证 Refresh Token
        RefreshTokenValidation validation = refreshTokenService.validate(refreshToken);
        
        if (!validation.isValid()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "invalid_grant",
                           "error_description", validation.getError()));
        }
        
        // 2. 检查设备指纹(防止令牌被盗用)
        String deviceId = extractDeviceId(request);
        if (!validation.getDeviceId().equals(deviceId)) {
            refreshTokenService.revoke(refreshToken);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "invalid_grant",
                           "error_description", "Device mismatch"));
        }
        
        // 3. 生成新的 Access Token
        AccessTokenResponse response = tokenProvider.generateAccessToken(
            validation.getUserId(),
            validation.getScopes()
        );
        
        // 4. 轮换 Refresh Token
        if (validation.isRotationEnabled()) {
            String newRefreshToken = refreshTokenService.rotate(
                refreshToken, 
                deviceId
            );
            response.setRefreshToken(newRefreshToken);
        }
        
        return ResponseEntity.ok(response);
    }
}
```

**2. Refresh Token 验证逻辑**

```java
@Service
public class RefreshTokenService {
    
    @Autowired
    private RefreshTokenRepository tokenRepository;
    
    public RefreshTokenValidation validate(String token) {
        // 1. 查询 Token
        Optional<RefreshToken> stored = tokenRepository.findByToken(token);
        if (stored.isEmpty()) {
            return RefreshTokenValidation.invalid("Token not found");
        }
        
        RefreshToken refreshToken = stored.get();
        
        // 2. 检查是否已撤销
        if (refreshToken.isRevoked()) {
            return RefreshTokenValidation.invalid("Token revoked");
        }
        
        // 3. 检查是否过期
        if (refreshToken.getExpiresAt().isBefore(Instant.now())) {
            return RefreshTokenValidation.invalid("Token expired");
        }
        
        // 4. 检查用户是否被锁定
        User user = userRepository.findById(refreshToken.getUserId());
        if (user.isLocked()) {
            revoke(token);
            return RefreshTokenValidation.invalid("User locked");
        }
        
        // 5. 返回验证结果
        return RefreshTokenValidation.valid(
            refreshToken.getUserId(),
            refreshToken.getScopes(),
            refreshToken.getDeviceId(),
            refreshToken.isRotationEnabled()
        );
    }
    
    // 轮换 Refresh Token
    public String rotate(String oldToken, String deviceId) {
        // 1. 撤销旧 Token
        tokenRepository.revoke(oldToken);
        
        // 2. 生成新 Token
        RefreshToken newToken = RefreshToken.builder()
            .token(UUID.randomUUID().toString())
            .userId(getUserId(oldToken))
            .deviceId(deviceId)
            .scopes(getScopes(oldToken))
            .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
            .rotationEnabled(true)
            .build();
        
        tokenRepository.save(newToken);
        
        return newToken.getToken();
    }
}
```

**3. 前端刷新逻辑**

```javascript
// 前端自动刷新拦截器
class TokenRefreshInterceptor {
  constructor() {
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  async intercept(error) {
    const originalRequest = error.config;
    
    // 不是 401 错误,直接返回
    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }
    
    // 已经尝试过刷新,仍然失败
    if (originalRequest._retry) {
      // 跳转到登录页
      window.location.href = '/login';
      return Promise.reject(error);
    }
    
    // 如果正在刷新,将请求加入队列
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.failedQueue.push({ resolve, reject });
      }).then(() => {
        return axios(originalRequest);
      });
    }
    
    // 开始刷新
    originalRequest._retry = true;
    this.isRefreshing = true;
    
    try {
      // 调用刷新接口
      const refreshToken = getRefreshToken(); // 从 Cookie 获取
      const response = await axios.post('/oauth/token/refresh', null, {
        headers: { 'Refresh-Token': refreshToken }
      });
      
      // 更新 Access Token
      const { access_token, refresh_token } = response.data;
      setAccessToken(access_token);
      if (refresh_token) {
        setRefreshToken(refresh_token);
      }
      
      // 重试失败的请求
      this.processQueue(null, access_token);
      return axios(originalRequest);
      
    } catch (refreshError) {
      // 刷新失败,清除登录态
      this.processQueue(refreshError, null);
      clearTokens();
      window.location.href = '/login';
      return Promise.reject(refreshError);
      
    } finally {
      this.isRefreshing = false;
    }
  }
  
  processQueue(error, token = null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }
}
```

## 刷新令牌轮换是什么

轮换机制可以理解为：

- 每次成功刷新后
- 旧的 Refresh Token 立即作废
- 返回新的 Refresh Token

这样做的价值在于：如果旧 Token 被重放，就能更容易识别异常使用行为。

### 轮换机制详解

**1. 为什么需要轮换**

```
无轮换场景:
Refresh Token 泄露 → 攻击者可无限期使用 → 用户无法感知

有轮换场景:
1. 攻击者窃取 Refresh Token
2. 用户正常使用并刷新
3. 轮换后,攻击者的 Token 失效
4. 攻击者尝试使用旧 Token → 被检测到异常
```

**2. 检测令牌重放攻击**

```java
@Service
public class RefreshTokenRotationService {
    
    // 存储最近使用过的 Token(用于检测重放)
    private Map<String, Instant> recentlyUsedTokens = new ConcurrentHashMap<>();
    
    public RefreshToken rotate(String oldToken) {
        // 1. 检查是否为已轮换的旧 Token
        if (recentlyUsedTokens.containsKey(oldToken)) {
            // 检测到重放攻击!
            // 立即撤销该用户所有 Token
            String userId = getUserId(oldToken);
            revokeAllUserTokens(userId);
            
            // 发送安全告警
            securityAlertService.sendAlert(userId, "Token replay detected");
            
            throw new SecurityException("Token replay detected");
        }
        
        // 2. 标记旧 Token 为已使用
        recentlyUsedTokens.put(oldToken, Instant.now());
        
        // 3. 定期清理过期的已用 Token 记录
        cleanupRecentlyUsedTokens();
        
        // 4. 生成新 Token
        return generateNewToken();
    }
    
    // 清理过期的已用 Token 记录(保留 24 小时)
    private void cleanupRecentlyUsedTokens() {
        Instant threshold = Instant.now().minus(24, ChronoUnit.HOURS);
        recentlyUsedTokens.entrySet().removeIf(e -> e.getValue().isBefore(threshold));
    }
}
```

**3. 轮换策略选择**

| 策略 | 说明 | 适用场景 |
|---|---|---|
| 每次轮换 | 每次刷新都返回新 Token | 高安全要求 |
| 定期轮换 | 每 N 次刷新才轮换 | 平衡安全和性能 |
| 不轮换 | Token 固定不变 | 低风险内部系统 |

```java
// 定期轮换示例
public RefreshToken rotateIfNeeded(String token, int refreshCount) {
    RefreshToken stored = tokenRepository.findByToken(token);
    
    // 每刷新 5 次才轮换
    if (refreshCount % 5 == 0) {
        return rotate(token);
    }
    
    // 其他时候返回原 Token
    return stored;
}
```

## Refresh Token 为什么必须更谨慎保护

Refresh Token 本质上仍然是 Bearer 凭证。一旦泄露，攻击者就可能持续换取新的 Access Token。

因此更稳妥的做法通常包括：

- 不把 Refresh Token 放在 
- 优先放在服务端安全存储或 
- 配置轮换机制（Rotating Refresh Token）
- 支持撤销和失效控制

### Refresh Token 的存储方案对比

**方案一：HttpOnly Cookie（推荐）**

```java
// 后端设置 Cookie
@PostMapping("/login")
public ResponseEntity<?> login(@RequestBody LoginRequest request, 
                               HttpServletResponse response) {
    // ... 认证逻辑
    
    // 设置 Access Token(短期,可放在内存或 Cookie)
    Cookie accessTokenCookie = new Cookie("access_token", accessToken);
    accessTokenCookie.setHttpOnly(true);
    accessTokenCookie.setSecure(true);
    accessTokenCookie.setPath("/");
    accessTokenCookie.setMaxAge(900); // 15 分钟
    response.addCookie(accessTokenCookie);
    
    // 设置 Refresh Token(长期,必须 HttpOnly)
    Cookie refreshTokenCookie = new Cookie("refresh_token", refreshToken);
    refreshTokenCookie.setHttpOnly(true);
    refreshTokenCookie.setSecure(true);
    refreshTokenCookie.setPath("/oauth/token"); // 仅刷新接口可访问
    refreshTokenCookie.setMaxAge(2592000); // 30 天
    response.addCookie(refreshTokenCookie);
    
    return ResponseEntity.ok(Map.of("user", userInfo));
}
```

**优点：**
- √ 自动防范 XSS 攻击（HttpOnly）
- √ 浏览器自动携带
- √ 可以设置精确的 Path 和 SameSite

**缺点：**
- × 需要防范 CSRF（但可以通过 SameSite=Strict 缓解）
- × 子域名共享需要配置 Domain

**方案二：服务端存储，客户端只拿 ID**

```java
// 客户端只持有 Token ID,不持有实际 Token
public class RefreshToken {
    private String id;          // 客户端持有
    private String token;       // 服务端存储
    private String userId;
    private Instant expiresAt;
}

// 客户端请求刷新
@PostMapping("/token/refresh")
public ResponseEntity<?> refresh(@RequestBody RefreshRequest request) {
    String tokenId = request.getTokenId();
    
    // 服务端根据 ID 查询实际 Token
    RefreshToken stored = tokenRepository.findById(tokenId);
    
    // 验证并生成新 Access Token
    // ...
}
```

**优点：**
- √ 即使泄露，攻击者也无法直接使用
- √ 服务端可随时撤销

**缺点：**
- × 需要数据库查询
- × 增加系统复杂度

**方案三：加密存储在前端（不推荐）**

```javascript
// 使用用户密码加密 Refresh Token
function encryptRefreshToken(token, userPassword) {
  return CryptoJS.AES.encrypt(token, userPassword).toString();
}

// 刷新时解密
function decryptRefreshToken(encrypted, userPassword) {
  const bytes = CryptoJS.AES.decrypt(encrypted, userPassword);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

**问题：**
- × 如果能获取到加密的 Token 和用户密码，攻击者就能解密
- × 增加前端复杂度
- × 性能开销

### Refresh Token 的撤销机制

**1. 主动撤销**

```java
// 用户登出时撤销 Refresh Token
@PostMapping("/logout")
public ResponseEntity<?> logout(@RequestBody LogoutRequest request) {
    String refreshToken = request.getRefreshToken();
    
    // 撤销指定的 Refresh Token
    refreshTokenService.revoke(refreshToken);
    
    // 如果需要,撤销该用户所有 Token
    // refreshTokenService.revokeAllUserTokens(userId);
    
    return ResponseEntity.ok().build();
}

// 撤销实现
public void revoke(String token) {
    tokenRepository.findByToken(token).ifPresent(t -> {
        t.setRevoked(true);
        t.setRevokedAt(Instant.now());
        tokenRepository.save(t);
    });
}
```

**2. 被动撤销**

```java
// 用户修改密码时撤销所有 Token
@PostMapping("/password/change")
public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request) {
    // ... 修改密码逻辑
    
    // 撤销所有 Refresh Token,强制重新登录
    refreshTokenService.revokeAllUserTokens(userId);
    
    return ResponseEntity.ok().build();
}

// 用户被锁定时撤销
@EventListener
public void onUserLocked(UserLockedEvent event) {
    refreshTokenService.revokeAllUserTokens(event.getUserId());
}
```

**3. 定期清理**

```java
@Scheduled(cron = "0 0 3 * * ?") // 每天凌晨 3 点
public void cleanupExpiredTokens() {
    // 删除过期超过 7 天的 Token
    tokenRepository.deleteExpiredTokens(Instant.now().minus(7, ChronoUnit.DAYS));
}
```

## Spring Security OAuth2 配置示例

### Spring Authorization Server 配置（推荐）

Spring Authorization Server 是 Spring 官方推荐的 OAuth2 授权服务器实现。

**1. 添加依赖**

```xml
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-oauth2-authorization-server</artifactId>
    <version>1.2.0</version>
</dependency>
```

**2. 授权服务器配置**

```java
@Configuration
public class AuthorizationServerConfig {
    
    @Bean
    public RegisteredClientRepository registeredClientRepository() {
        // 注册客户端应用
        RegisteredClient client = RegisteredClient.withId("1")
            .clientId("web-app")
            .clientSecret("{noop}secret") // 生产环境使用 {bcrypt}
            .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
            .authorizationGrantType(AuthorizationGrantType.CLIENT_CREDENTIALS)
            .redirectUri("http://localhost:8080/login/oauth2/code/web-app")
            .scope("read:user")
            .scope("write:order")
            .tokenSettings(
                TokenSettings.builder()
                    .accessTokenTimeToLive(Duration.ofMinutes(15))
                    .refreshTokenTimeToLive(Duration.ofDays(30))
                    .reuseRefreshTokens(false) // 启用轮换
                    .build()
            )
            .clientSettings(
                ClientSettings.builder()
                    .requireAuthorizationConsent(true) // 需要用户同意授权
                    .build()
            )
            .build();
        
        return new InMemoryRegisteredClientRepository(client);
    }
    
    @Bean
    public AuthorizationServerSettings authorizationServerSettings() {
        return AuthorizationServerSettings.builder()
            .issuer("http://auth.example.com")
            .authorizationEndpoint("/oauth2/authorize")
            .tokenEndpoint("/oauth2/token")
            .tokenIntrospectionEndpoint("/oauth2/introspect")
            .tokenRevocationEndpoint("/oauth2/revoke")
            .jwkSetEndpoint("/oauth2/jwks")
            .build();
    }
    
    @Bean
    @Order(1)
    public SecurityFilterChain authorizationServerSecurityFilterChain(HttpSecurity http)
            throws Exception {
        OAuth2AuthorizationServerConfiguration.applyDefaultSecurity(http);

        http.getConfigurer(OAuth2AuthorizationServerConfigurer.class)
            .oidc(Customizer.withDefaults()); // 启用 OpenID Connect

        return http.build();
    }

    // 注意：上面是 Spring Authorization Server 1.0~1.1 的文档写法。
    // SAS 1.2+ 起 applyDefaultSecurity 已废弃，推荐写法为：
    //   var asConfigurer = OAuth2AuthorizationServerConfigurer.authorizationServer();
    //   http.securityMatcher(asConfigurer.getEndpointsMatcher())
    //       .with(asConfigurer, Customizer.withDefaults())
    //       .authorizeHttpRequests(auth -> auth.anyRequest().authenticated());
}
```

**3. 资源服务器配置**

```java
@Configuration
@EnableWebSecurity
public class ResourceServerConfig {
    
    @Bean
    @Order(2)
    public SecurityFilterChain resourceServerFilterChain(HttpSecurity http) 
            throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/public/**").permitAll()
                .requestMatchers("/api/**").authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
            );
        
        return http.build();
    }
    
    // 自定义 JWT 权限转换器
    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            // scope 声明通常是空格分隔的字符串（如 "read:user write:order"）
            String scope = jwt.getClaimAsString("scope");
            if (scope == null || scope.isBlank()) {
                return Collections.emptyList();
            }
            return Arrays.stream(scope.split("\\s+"))
                .map(s -> new SimpleGrantedAuthority("SCOPE_" + s))
                .collect(Collectors.toList());
        });
        return converter;
    }
}
```

**4. 自定义令牌生成**

```java
@Component
public class CustomOAuth2TokenCustomizer implements OAuth2TokenCustomizer<JwtEncodingContext> {
    
    @Override
    public void customize(JwtEncodingContext context) {
        // 添加自定义声明
        context.getClaims().claims(claims -> {
            // 添加用户 ID
            claims.put("user_id", context.getPrincipal().getName());
            
            // 添加额外信息
            UserDetails user = (UserDetails) context.getPrincipal().getPrincipal();
            claims.put("email", user.getEmail());
            claims.put("tenant_id", user.getTenantId());
        });
    }
}
```

### 使用 JWT 的简化配置

如果不需要完整的 OAuth2 授权服务器，只想用 JWT 做认证：

```java
@Configuration
@EnableWebSecurity
public class JwtSecurityConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) 
            throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/auth/login", "/auth/refresh").permitAll()
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter(), 
                UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    public JwtAuthenticationFilter jwtAuthenticationFilter() {
        return new JwtAuthenticationFilter(jwtTokenProvider);
    }
    
    @Bean
    public JwtTokenProvider jwtTokenProvider() {
        return new JwtTokenProvider(
            "your-256-bit-secret-key-here",
            900000L,  // Access Token 有效期: 15 分钟
            2592000000L // Refresh Token 有效期: 30 天
        );
    }
}
```

## 示例场景

### 场景一：前后端分离登录

前端拿短效 Access Token 调接口，Refresh Token 由后端或  保护。当接口返回 401 时，前端先尝试走刷新流程，再决定是否跳登录页。

**完整实现：**

**后端接口：**

```java
@RestController
@RequestMapping("/auth")
public class AuthController {
    
    @Autowired
    private AuthService authService;
    
    // 登录
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request,
                                   HttpServletResponse response) {
        LoginResult result = authService.login(
            request.getUsername(), 
            request.getPassword()
        );
        
        // Access Token 放在响应体(前端可访问)
        // Refresh Token 放在 HttpOnly Cookie
        
        Cookie refreshTokenCookie = new Cookie("refresh_token", result.getRefreshToken());
        refreshTokenCookie.setHttpOnly(true);
        refreshTokenCookie.setSecure(true);
        refreshTokenCookie.setPath("/auth");
        refreshTokenCookie.setMaxAge(30 * 24 * 60 * 60);
        response.addCookie(refreshTokenCookie);
        
        return ResponseEntity.ok(Map.of(
            "access_token", result.getAccessToken(),
            "expires_in", result.getExpiresIn(),
            "user", result.getUser()
        ));
    }
    
    // 刷新令牌
    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(
            @CookieValue(value = "refresh_token", required = false) String refreshToken,
            HttpServletResponse response) {
        
        if (refreshToken == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "No refresh token"));
        }
        
        RefreshResult result = authService.refresh(refreshToken);
        
        // 轮换 Refresh Token
        Cookie newRefreshTokenCookie = new Cookie("refresh_token", result.getNewRefreshToken());
        newRefreshTokenCookie.setHttpOnly(true);
        newRefreshTokenCookie.setSecure(true);
        newRefreshTokenCookie.setPath("/auth");
        newRefreshTokenCookie.setMaxAge(30 * 24 * 60 * 60);
        response.addCookie(newRefreshTokenCookie);
        
        return ResponseEntity.ok(Map.of(
            "access_token", result.getAccessToken(),
            "expires_in", result.getExpiresIn()
        ));
    }
    
    // 登出
    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @CookieValue(value = "refresh_token", required = false) String refreshToken,
            HttpServletResponse response) {
        
        if (refreshToken != null) {
            authService.revokeRefreshToken(refreshToken);
        }
        
        // 清除 Cookie
        Cookie cookie = new Cookie("refresh_token", null);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/auth");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        
        return ResponseEntity.ok().build();
    }
}
```

**前端实现：**

```javascript
// api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

// 请求拦截器:添加 Access Token
api.interceptors.request.use(config => {
  const accessToken = sessionStorage.getItem('access_token');
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 响应拦截器:自动刷新
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // 401 且未重试过
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // 刷新 Token(浏览器会自动携带 HttpOnly Cookie)
        const response = await axios.post('/auth/refresh');
        const { access_token } = response.data;
        
        // 更新 Access Token
        sessionStorage.setItem('access_token', access_token);
        
        // 重试原请求
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        // 刷新失败,跳转登录
        sessionStorage.removeItem('access_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
```

### 场景二：第三方登录

第三方应用不直接拿用户密码，而是通过授权服务器完成授权和令牌交换，再访问资源服务器。

**GitHub OAuth2 登录示例：**

**1. 注册 OAuth 应用**

在 GitHub 设置中注册 OAuth App:
- Application name: My App
- Homepage URL: https://myapp.example.com
- Authorization callback URL: https://myapp.example.com/login/oauth2/code/github

**2. Spring Security 配置**

```java
@Configuration
@EnableWebSecurity
public class OAuth2LoginConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) 
            throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/", "/error").permitAll()
                .anyRequest().authenticated()
            )
            .oauth2Login(oauth2 -> oauth2
                .loginPage("/login")
                .authorizationEndpoint(auth -> auth
                    .baseUri("/oauth2/authorization")
                )
                .redirectionEndpoint(redir -> redir
                    .baseUri("/login/oauth2/code/*")
                )
                .userInfoEndpoint(userInfo -> userInfo
                    .userService(oAuth2UserService())
                )
                .successHandler(oauth2LoginSuccessHandler())
            );
        
        return http.build();
    }
    
    @Bean
    public OAuth2UserService<OAuth2UserRequest, OAuth2User> oAuth2UserService() {
        DefaultOAuth2UserService delegate = new DefaultOAuth2UserService();
        
        return request -> {
            OAuth2User oauth2User = delegate.loadUser(request);
            
            // 处理用户信息,保存到数据库
            String registrationId = request.getClientRegistration().getRegistrationId();
            String userNameAttributeName = request.getClientRegistration()
                .getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();
            
            // 根据不同登录源处理
            switch (registrationId) {
                case "github":
                    return processGithubUser(oauth2User);
                case "google":
                    return processGoogleUser(oauth2User);
                default:
                    return oauth2User;
            }
        };
    }
    
    private OAuth2User processGithubUser(OAuth2User oauth2User) {
        String githubId = oauth2User.getAttribute("id");
        String login = oauth2User.getAttribute("login");
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");
        
        // 查找或创建本地用户
        User user = userService.findOrCreateByGithubId(githubId, login, email, name);
        
        // 返回包含本地用户信息的 OAuth2User
        return new DefaultOAuth2User(
            user.getAuthorities(),
            Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail()
            ),
            "id"
        );
    }
    
    @Bean
    public AuthenticationSuccessHandler oauth2LoginSuccessHandler() {
        return (request, response, authentication) -> {
            // OAuth2 登录成功后,生成 JWT Token
            OAuth2User oauth2User = (OAuth2User) authentication.getPrincipal();
            
            String accessToken = jwtTokenProvider.generateAccessToken(oauth2User);
            String refreshToken = jwtTokenProvider.generateRefreshToken(oauth2User);
            
            // 设置 Cookie 或返回 JSON
            response.addCookie(createHttpOnlyCookie("refresh_token", refreshToken));
            
            // 重定向到前端,携带 Access Token
            // 注意:Token 出现在 URL 会进入浏览器历史/访问日志,生产环境更推荐
            // 通过一次性中间页(授权码或 POST 表单)完成令牌交接
            response.sendRedirect("/dashboard?access_token=" + accessToken);
        };
    }
    
    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        return new InMemoryClientRegistrationRepository(
            githubClientRegistration(),
            googleClientRegistration()
        );
    }
    
    private ClientRegistration githubClientRegistration() {
        return ClientRegistration.withRegistrationId("github")
            .clientId("${GITHUB_CLIENT_ID}")
            .clientSecret("${GITHUB_CLIENT_SECRET}")
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
            .scope("read:user", "user:email")
            .authorizationUri("https://github.com/login/oauth/authorize")
            .tokenUri("https://github.com/login/oauth/access_token")
            .userInfoUri("https://api.github.com/user")
            .userNameAttributeName("id")
            .clientName("GitHub")
            .build();
    }
}
```

**3. 前端集成**

```javascript
// 发起 GitHub 登录
function loginWithGithub() {
  window.location.href = '/oauth2/authorization/github';
}

// 处理回调
async function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('access_token');
  
  if (accessToken) {
    // 存储 Access Token
    sessionStorage.setItem('access_token', accessToken);
    
    // 获取用户信息
    const user = await fetchUserInfo(accessToken);
    
    // 更新 UI
    updateUI(user);
  }
}
```

### 场景三：多设备登录与撤销

如果用户在多个设备上登录，刷新令牌通常不能粗暴共用，否则设备级别的撤销和异常控制会很困难。

**实现方案：**

```java
@Service
public class DeviceSessionService {
    
    @Autowired
    private RefreshTokenRepository tokenRepository;
    
    // 登录时创建设备会话
    public LoginResult login(String username, String password, 
                             DeviceInfo deviceInfo) {
        // 1. 认证用户
        User user = authenticate(username, password);
        
        // 2. 生成设备 ID(如果未提供)
        String deviceId = deviceInfo.getDeviceId();
        if (deviceId == null) {
            deviceId = generateDeviceId(deviceInfo);
        }
        
        // 3. 检查设备数量限制
        List<RefreshToken> activeTokens = tokenRepository
            .findByUserIdAndRevokedFalse(user.getId());
        
        if (activeTokens.size() >= MAX_DEVICES) {
            // 可选:踢掉最旧的设备
            RefreshToken oldest = activeTokens.stream()
                .min(Comparator.comparing(RefreshToken::getCreatedAt))
                .orElse(null);
            
            if (oldest != null) {
                revokeToken(oldest.getToken());
            }
        }
        
        // 4. 创建新会话
        RefreshToken refreshToken = RefreshToken.builder()
            .token(UUID.randomUUID().toString())
            .userId(user.getId())
            .deviceId(deviceId)
            .deviceName(deviceInfo.getDeviceName())
            .deviceType(deviceInfo.getDeviceType())
            .userAgent(deviceInfo.getUserAgent())
            .ipAddress(deviceInfo.getIpAddress())
            .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
            .build();
        
        tokenRepository.save(refreshToken);
        
        // 5. 生成 Access Token
        String accessToken = generateAccessToken(user, deviceId);
        
        return LoginResult.builder()
            .accessToken(accessToken)
            .refreshToken(refreshToken.getToken())
            .deviceId(deviceId)
            .expiresIn(900L)
            .build();
    }
    
    // 获取用户所有设备会话
    public List<DeviceSession> listUserDevices(String userId) {
        return tokenRepository.findByUserIdAndRevokedFalse(userId)
            .stream()
            .map(token -> DeviceSession.builder()
                .deviceId(token.getDeviceId())
                .deviceName(token.getDeviceName())
                .deviceType(token.getDeviceType())
                .lastUsedAt(token.getLastUsedAt())
                .ipAddress(token.getIpAddress())
                .build())
            .collect(Collectors.toList());
    }
    
    // 撤销指定设备
    public void revokeDevice(String userId, String deviceId) {
        tokenRepository.revokeByUserIdAndDeviceId(userId, deviceId);
    }
    
    // 撤销所有其他设备
    public void revokeOtherDevices(String userId, String currentDeviceId) {
        tokenRepository.revokeOtherDevices(userId, currentDeviceId);
    }
}

// 设备信息
@Data
public class DeviceInfo {
    private String deviceId;
    private String deviceName;      // "iPhone 13 Pro"
    private String deviceType;      // "mobile", "desktop", "tablet"
    private String userAgent;
    private String ipAddress;
}

// API 接口
@RestController
@RequestMapping("/api/devices")
public class DeviceController {
    
    @Autowired
    private DeviceSessionService deviceSessionService;
    
    @GetMapping
    public ResponseEntity<?> listDevices(Authentication auth) {
        String userId = auth.getName();
        List<DeviceSession> devices = deviceSessionService.listUserDevices(userId);
        return ResponseEntity.ok(devices);
    }
    
    @DeleteMapping("/{deviceId}")
    public ResponseEntity<?> revokeDevice(Authentication auth,
                                          @PathVariable String deviceId) {
        String userId = auth.getName();
        deviceSessionService.revokeDevice(userId, deviceId);
        return ResponseEntity.ok().build();
    }
    
    @DeleteMapping("/others")
    public ResponseEntity<?> revokeOtherDevices(Authentication auth,
                                                @RequestParam String currentDeviceId) {
        String userId = auth.getName();
        deviceSessionService.revokeOtherDevices(userId, currentDeviceId);
        return ResponseEntity.ok().build();
    }
}
```

**前端展示：**

```javascript
// 设备管理页面
function DeviceManager() {
  const [devices, setDevices] = useState([]);
  
  useEffect(() => {
    fetchDevices();
  }, []);
  
  const fetchDevices = async () => {
    const response = await api.get('/api/devices');
    setDevices(response.data);
  };
  
  const handleRevoke = async (deviceId) => {
    if (confirm('确定要登出此设备吗?')) {
      await api.delete(`/api/devices/${deviceId}`);
      fetchDevices();
    }
  };
  
  const handleRevokeOthers = async () => {
    if (confirm('确定要登出其他所有设备吗?')) {
      await api.delete('/api/devices/others?' + 
        new URLSearchParams({ currentDeviceId: getCurrentDeviceId() }));
      fetchDevices();
    }
  };
  
  return (
    <div>
      <h2>已登录设备</h2>
      <button onClick={handleRevokeOthers}>登出其他设备</button>
      
      <ul>
        {devices.map(device => (
          <li key={device.deviceId}>
            <strong>{device.deviceName}</strong>
            <span>{device.deviceType}</span>
            <span>最后使用: {formatTime(device.lastUsedAt)}</span>
            <span>IP: {device.ipAddress}</span>
            <button onClick={() => handleRevoke(device.deviceId)}>
              登出
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## 开发中的注意事项

### OAuth2 不等于 JWT

OAuth2 是授权协议，JWT 是一种令牌载体格式。两者经常一起出现，但不是同一个概念。

**对比：**

| 特性 | OAuth2 | JWT |
|---|---|---|
| 本质 | 协议/框架 | 数据格式 |
| 解决问题 | 授权流程 | 令牌编码 |
| 依赖关系 | 可使用多种令牌格式 | 可用于多种场景 |
| 标准组织 | IETF RFC 6749 | IETF RFC 7519 |

**常见组合：**

```
OAuth2 + JWT:
授权服务器使用 OAuth2 协议颁发 JWT 格式的令牌
→ 最常见的现代方案

OAuth2 + Opaque Token:
授权服务器使用 OAuth2 协议颁发随机字符串令牌
→ 传统方案,需查询验证

OAuth2 + SAML:
授权服务器使用 OAuth2 协议颁发 SAML 断言
→ 企业级场景
```

### 刷新逻辑不能无脑自动重试

如果刷新接口失败，客户端应该有明确策略，例如：

- 刷新失败则要求重新登录
- 检测到异常重放则主动登出

**错误处理策略：**

```javascript
// 推荐的刷新失败处理
async function handleRefreshFailure(error) {
  const errorCode = error.response?.data?.error;
  
  switch (errorCode) {
    case 'invalid_grant':
      // Refresh Token 无效或过期
      // 清除登录态,跳转登录
      clearTokens();
      redirectToLogin();
      break;
      
    case 'token_revoked':
      // Token 被撤销
      // 可能是用户在其他设备登出
      showNotification('您已在其他设备登录');
      clearTokens();
      redirectToLogin();
      break;
      
    case 'user_locked':
      // 用户被锁定
      showNotification('账户已被锁定');
      clearTokens();
      redirectToLogin();
      break;
      
    case 'device_mismatch':
      // 设备不匹配,可能被盗用
      showNotification('检测到异常登录');
      clearTokens();
      redirectToLogin();
      break;
      
    default:
      // 其他错误,稍后重试
      retryOrFail();
  }
}
```

### 令牌问题不只是认证问题

令牌设计同时涉及：

- 认证
- 授权
- 生命周期管理
- 撤销策略
- 客户端存储安全

**安全检查清单：**

```markdown
## OAuth2 安全检查清单

### 令牌生成
- [ ] 使用强随机数生成器
- [ ] Access Token 有效期不超过 1 小时
- [ ] Refresh Token 有效期合理(7-30 天)
- [ ] 使用 HTTPS 传输

### 令牌存储
- [ ] Access Token 不存储在 localStorage
- [ ] Refresh Token 使用 HttpOnly Cookie
- [ ] 敏感操作不依赖前端存储的令牌

### 授权码安全
- [ ] 授权码一次性使用
- [ ] 授权码有效期短(5-10 分钟)
- [ ] 验证 redirect_uri 完全匹配

### 刷新令牌安全
- [ ] 启用轮换机制
- [ ] 检测重放攻击
- [ ] 支持主动撤销
- [ ] 绑定设备信息

### 客户端安全
- [ ] 验证 client_id 和 client_secret
- [ ] 不在前端存储 client_secret
- [ ] 使用 PKCE(移动端和 SPA)

### 权限控制
- [ ] 使用最小权限原则
- [ ] scope 命名清晰
- [ ] 支持增量授权

### 监控与审计
- [ ] 记录令牌颁发和使用日志
- [ ] 监控异常刷新行为
- [ ] 定期审计活跃会话
```

## 常见误区

### 误区一：认为 Refresh Token 永久有效

**问题：**
```java
// × 错误:设置 Refresh Token 永不过期
RefreshToken.builder()
    .expiresAt(null) // 永久有效
    .build();
```

**正确做法：**
```java
// √ 正确:设置合理过期时间
RefreshToken.builder()
    .expiresAt(Instant.now().plus(30, ChronoUnit.DAYS))
    .build();

// √ 更好:定期要求重新认证
if (isDaysSinceLastLogin(refreshToken) > 90) {
    throw new AuthenticationRequiredException();
}
```

### 误区二：把 Refresh Token 暴露给前端长期存储

**问题：**
```javascript
// × 错误:存储在 localStorage
localStorage.setItem('refresh_token', refreshToken);

// × 错误:存储在 sessionStorage
sessionStorage.setItem('refresh_token', refreshToken);
```

**正确做法：**
```java
// √ 后端设置 HttpOnly Cookie
Cookie cookie = new Cookie("refresh_token", refreshToken);
cookie.setHttpOnly(true);  // 防止 JavaScript 访问
cookie.setSecure(true);    // 仅 HTTPS 传输
cookie.setSameSite("Strict"); // 防止 CSRF
response.addCookie(cookie);
```

### 误区三：忽略授权码的一次性使用规则

**问题：**
```java
// × 错误:授权码可重复使用
public AuthorizationCode getOrCreateCode(String code) {
    return codeStore.computeIfAbsent(code, this::generateCode);
}
```

**正确做法：**
```java
// √ 授权码使用后立即删除
public AuthorizationCode consumeCode(String code) {
    AuthorizationCode authCode = codeStore.remove(code);
    if (authCode == null) {
        throw new InvalidGrantException("Code already used or invalid");
    }
    return authCode;
}
```

### 误区四：只关心 Access Token,不关心撤销和轮换机制

**问题：**
- 没有 Token 撤销接口
- Refresh Token 固定不变
- 用户登出后 Token 仍然有效

**正确做法：**
```java
// √ 提供完整的生命周期管理
public interface TokenManagement {
    // 登出撤销
    void revoke(String refreshToken);
    
    // 全部撤销
    void revokeAll(String userId);
    
    // 轮换
    String rotate(String oldToken);
    
    // 验证
    TokenValidation validate(String token);
}
```

### 误区五：把 OAuth2 简化成"发个 JWT 就算完成了"

**问题：**
- 没有授权服务器
- 没有客户端注册
- 没有授权流程
- 直接颁发 JWT

**正确理解：**
```
完整的 OAuth2 实现:
1. 客户端注册(client_id, client_secret, redirect_uri)
2. 授权端点(用户授权页面)
3. 令牌端点(颁发和刷新令牌)
4. 资源服务器(验证令牌并提供资源)
5. 用户信息端点(获取用户信息)
6. 令牌撤销端点
7. 令牌自省端点

简化方案:
仅使用 JWT 做认证,不实现完整 OAuth2 流程
→ 这不是 OAuth2,只是 JWT 认证
```

## 面试要点

### 基础问题

**1. OAuth2 解决的核心问题是什么？**

答：OAuth2 解决的是在不共享用户密码的情况下，让第三方应用安全地访问用户受保护资源的问题。它通过引入授权服务器和令牌机制，将用户身份认证、授权决策和资源访问解耦，实现了更安全、更可控的授权流程。

**2. OAuth2 的四个角色分别是什么？各有什么职责？**

答：
- **资源拥有者（Resource Owner）**：通常是最终用户，拥有对资源的控制权，可以授权客户端访问资源。
- **客户端（Client）**：发起资源访问请求的应用，如第三方网站、移动应用。它需要向授权服务器注册并获得 client_id。
- **授权服务器（Authorization Server）**：负责认证用户身份，获取用户授权，并颁发访问令牌。它是 OAuth2 的核心组件。
- **资源服务器（Resource Server）**：存储受保护资源，验证访问令牌的有效性，并根据令牌权限返回相应数据。

**3. OAuth2 的四种授权模式分别适用于什么场景？**

答：
- **授权码模式**：最安全，适合有后端的 Web 应用。通过后端交换令牌，避免令牌暴露给前端。
- **隐式模式**：已废弃，曾用于纯前端应用，安全风险高，被授权码+PKCE 取代。
- **密码模式**：适合官方移动应用或高度信任的客户端，用户直接提供密码给客户端。
- **客户端凭证模式**：适合服务间通信，无用户参与，令牌代表客户端本身。

**4. Access Token 和 Refresh Token 有什么区别？**

答：
- **生命周期**：Access Token 短期（分钟到小时）,Refresh Token 长期（天到月）。
- **用途**：Access Token 直接访问资源，Refresh Token 仅用于刷新获取新 Access Token。
- **暴露风险**：Access Token 泄露风险窗口短，Refresh Token 泄露后果更严重，需更严格保护。
- **存储位置**：Access Token 可在前端内存，Refresh Token 应在 HttpOnly Cookie 或服务端。
- **撤销机制**：Access Token 通常等待过期，Refresh Token 应支持主动撤销。

### 进阶问题

**5. 为什么授权码模式最安全？**

答：授权码模式的安全性来自多个层面：
- **授权码机制**：前端只拿到临时授权码，Access Token 在后端交换，不暴露给浏览器。
- **一次性使用**：授权码使用后立即失效，防止重放攻击。
- **client_secret 保护**：后端持有 client_secret,前端无法伪造客户端身份。
- **redirect_uri 验证**：严格验证回调地址，防止授权码被劫持。
- **state 参数**：防止 CSRF 攻击，确保授权请求来自合法来源。

**6. 什么是刷新令牌轮换？有什么价值？**

答：刷新令牌轮换是指每次使用 Refresh Token 刷新后，旧 Token 立即失效，颁发新的 Refresh Token。

价值：
- **检测令牌盗用**：如果攻击者窃取并使用了旧 Token,系统会发现该 Token 已失效，从而检测到异常。
- **限制暴露窗口**：即使 Token 泄露，也只在使用前有效，轮换后立即失效。
- **支持精准撤销**：可以针对特定会话进行撤销，而不影响其他设备。

**7. 为什么说 OAuth2 和 JWT 不是一回事？**

答：
- **本质不同**：OAuth2 是授权协议，定义了客户端如何获取访问令牌的流程；JWT 是令牌格式，定义了如何编码和验证令牌。
- **独立性**：OAuth2 可以使用 JWT、Opaque Token、SAML 等多种令牌格式；JWT 也可用于非 OAuth2 场景，如单点登录、信息交换。
- **关注点**：OAuth2 关注授权流程和角色交互，JWT 关注令牌的编码、签名和验证。

**8. 如何检测和防范刷新令牌重放攻击？**

答：
**检测方法：**
- 存储已使用的 Refresh Token 记录
- 当发现已使用过的 Token 再次出现时，判定为重放攻击
- 立即撤销该用户所有令牌，发送安全告警

**防范措施：**
- 启用令牌轮换，旧 Token 使用后立即失效
- 绑定设备信息（IP、User-Agent、设备指纹）
- 检测异常使用模式（如短时间内多设备刷新）
- 限制单个用户的令牌数量

**实现示例：**
```java
public RefreshToken rotate(String oldToken) {
    // 检查是否已使用过(重放攻击)
    if (isUsedToken(oldToken)) {
        // 撤销所有令牌
        revokeAllUserTokens(getUserId(oldToken));
        // 发送告警
        alertService.send(getUserId(oldToken), "Token replay detected");
        throw new SecurityException("Token replay detected");
    }
    
    // 标记为已使用
    markAsUsed(oldToken);
    
    // 生成新令牌
    return generateNewToken();
}
```

### 实战问题

**9. 如何设计多设备登录和设备级撤销？**

答：
**设计方案：**
1. **设备标识**：每次登录生成唯一设备 ID,绑定到 Refresh Token。
2. **设备数量限制**：限制单用户最多 N 个设备，超过时踢掉最旧设备。
3. **设备信息记录**：记录设备类型、名称、IP、最后使用时间。
4. **设备管理接口**：提供查询所有设备、撤销指定设备、撤销其他设备的接口。

**关键代码：**
```java
// 创建会话时绑定设备
RefreshToken token = RefreshToken.builder()
    .token(generateToken())
    .userId(userId)
    .deviceId(generateOrGetDeviceId(request))
    .deviceName(extractDeviceName(userAgent))
    .ipAddress(request.getRemoteAddr())
    .build();

// 撤销指定设备
public void revokeDevice(String userId, String deviceId) {
    tokenRepository.revokeByUserIdAndDeviceId(userId, deviceId);
}
```

**10. 如何处理刷新令牌失败的各种情况？**

答：
**失败场景及处理：**
- **Token 无效/过期**：清除登录态，跳转登录页。
- **Token 被撤销**：可能用户在其他设备登出，提示并跳转登录。
- **用户被锁定**：账户异常，提示联系管理员。
- **设备不匹配**：疑似盗用，撤销所有令牌，强制重新认证。
- **重放攻击检测**：撤销所有令牌，发送安全告警。

**前端处理示例：**
```javascript
async function handleRefreshError(error) {
  const errorCode = error.response?.data?.error;
  
  switch (errorCode) {
    case 'invalid_grant':
    case 'token_expired':
      clearTokens();
      redirectToLogin();
      break;
    case 'token_revoked':
      showNotification('您已在其他设备登录');
      clearTokens();
      redirectToLogin();
      break;
    case 'user_locked':
      showNotification('账户已被锁定,请联系管理员');
      clearTokens();
      redirectToLogin();
      break;
    case 'device_mismatch':
    case 'replay_detected':
      showNotification('检测到异常登录,请重新认证');
      clearTokens();
      redirectToLogin();
      break;
  }
}
```

**11. 如何在 Spring Security 中配置 OAuth2 资源服务器？**

答：
```java
@Configuration
@EnableWebSecurity
public class ResourceServerConfig {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) 
            throws Exception {
        http
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/public/**").permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt
                    .jwtAuthenticationConverter(jwtAuthenticationConverter())
                )
                .authenticationEntryPoint(customAuthenticationEntryPoint())
            );
        
        return http.build();
    }
    
    // 自定义 JWT 权限转换
    private JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            // scope 声明通常是空格分隔的字符串，需拆分而非直接取 List
            String scope = jwt.getClaimAsString("scope");
            if (scope == null || scope.isBlank()) {
                return Collections.emptyList();
            }
            return Arrays.stream(scope.split("\\s+"))
                .map(s -> new SimpleGrantedAuthority("SCOPE_" + s))
                .collect(Collectors.toList());
        });
        return converter;
    }
}
```

**12. 如何实现安全的第三方登录（如 GitHub OAuth2）?**

答：
**实现步骤：**
1. **注册 OAuth 应用**：在 GitHub 创建 OAuth App,获取 client_id 和 client_secret。
2. **配置 Spring Security**:
```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) {
    http
        .oauth2Login(oauth2 -> oauth2
            .loginPage("/login")
            .userInfoEndpoint(userInfo -> userInfo
                .userService(customOAuth2UserService())
            )
            .successHandler(oauth2LoginSuccessHandler())
        );
    return http.build();
}

@Bean
public ClientRegistrationRepository clientRegistrationRepository() {
    return new InMemoryClientRegistrationRepository(
        ClientRegistration.withRegistrationId("github")
            .clientId("${GITHUB_CLIENT_ID}")
            .clientSecret("${GITHUB_CLIENT_SECRET}")
            .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
            .redirectUri("{baseUrl}/login/oauth2/code/{registrationId}")
            .scope("read:user", "user:email")
            .authorizationUri("https://github.com/login/oauth/authorize")
            .tokenUri("https://github.com/login/oauth/access_token")
            .userInfoUri("https://api.github.com/user")
            .userNameAttributeName("id")
            .build()
    );
}
```

3. **处理用户信息**：在 OAuth2UserService 中关联或创建本地用户。
4. **生成令牌**：登录成功后生成 JWT Token,返回给前端。

**安全注意事项：**
- 验证 state 参数防止 CSRF
- 验证 redirect_uri 完全匹配
- 使用 HTTPS
- 妥善保管 client_secret

## 版本差异（旧版 → Spring Security 6.x）

| 特性 | 旧版（Spring Security 5.x） | Spring Security 6.x |
|------|--------------------------|---------------------|
| OAuth2 支持 | spring-security-oauth2 | 内置 OAuth2 Client/Resource Server |
| 授权模式 | 授权码/密码 | 授权码 + PKCE 推荐；密码模式废弃 |
| JWT 库 | jjwt 0.9 | jjwt 0.12（Nimbus JOSE 也可） |
| 刷新令牌 | 手动 | 内置 RefreshToken 支持 |
| 默认配置 | 需大量 XML/Java | 配置属性化（spring.security.oauth2.*） |
