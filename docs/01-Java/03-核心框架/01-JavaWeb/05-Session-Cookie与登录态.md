---
title: "Session-Cookie与登录态"
description: "这套模型虽然不是现代前后端分离项目的唯一主流，但它仍然是理解登录态、会话安全、CSRF 风险和无状态 Token 方案的基础。"
keywords: []
category: "Java"
tags: [Java, JavaWeb]
---


# Session、Cookie 与登录态

传统 Java Web 的登录态治理，最核心的就是：

- Cookie
- Session

这套模型虽然不是现代前后端分离项目的唯一主流，但它仍然是理解登录态、会话安全、`CSRF` 风险和无状态 Token 方案的基础。

## Cookie 解决什么问题

Cookie 是浏览器侧保存的一小段状态数据。它最常见的作用是：

- 让浏览器在后续请求中自动携带某个标识
- 帮助服务端识别当前请求属于哪个会话

Cookie 本身通常不负责保存完整用户状态，更常见的是保存：

- Session ID
- 登录标识
- 一些轻量偏好配置

### Cookie 的工作原理

```text
1. 服务端通过 Set-Cookie 响应头设置 Cookie
2. 浏览器自动保存 Cookie
3. 浏览器后续请求自动携带 Cookie（Cookie 请求头）
4. 服务端从请求头中读取 Cookie
```

**HTTP 响应（设置 Cookie）**：

```http
HTTP/1.1 200 OK
Set-Cookie: JSESSIONID=abc123; Path=/; HttpOnly; Secure; SameSite=Lax
Content-Type: text/html
```

**HTTP 请求（携带 Cookie）**：

```http
GET /user/profile HTTP/1.1
Cookie: JSESSIONID=abc123
```

### Cookie 的常用属性

| 属性 | 说明 | 示例 |
|------|------|------|
| `Name=Value` | Cookie 的名称和值 | `JSESSIONID=abc123` |
| `Domain` | Cookie 生效的域名 | `.example.com` |
| `Path` | Cookie 生效的路径 | `/app` |
| `Max-Age` | Cookie 过期时间（秒） | `3600` |
| `Expires` | Cookie 过期的具体时间 | `Wed, 09 Jun 2021 10:18:14 GMT` |
| `HttpOnly` | 禁止 JavaScript 访问（防 XSS） | - |
| `Secure` | 仅 HTTPS 传输 | - |
| `SameSite` | 跨站请求限制（防 CSRF） | `Strict` / `Lax` / `None` |

### Cookie 的限制

- 大小限制：单个 Cookie 不超过 **4KB**
- 数量限制：每个域名下约 **50个**（不同浏览器有差异）
- 只能存字符串，不适合存复杂对象
- 存在客户端，用户可以查看和修改

## Session 解决什么问题

Session 更偏服务端会话存储。它的典型流程是：

- 服务端保存用户登录态
- 浏览器通过 Cookie 带上 Session ID
- 服务端根据 Session ID 找到当前用户上下文

所以 Session 模式本质上是：

- 状态存在服务端
- 标识存在客户端

### Session 的存储方式

| 存储方式 | 说明 | 适用场景 |
|---------|------|---------|
| **内存存储** | 默认方式，存在 JVM 内存中 | 单机、开发环境 |
| **Redis 存储** | 分布式 Session，存在 Redis 中 | 多实例部署 |
| **数据库存储** | 存在数据库表中 | 低频访问、持久化需求 |
| **文件存储** | 序列化到磁盘 | 容器重启后恢复 |

## 一个典型登录态流程

最基础的 Session 登录流程通常如下：

1. 用户提交用户名和密码
2. 服务端校验身份
3. 校验成功后创建 Session
4. 服务端把 Session ID 通过 Cookie 返回给浏览器
5. 浏览器后续请求自动带上该 Cookie
6. 服务端根据 Session ID 恢复当前用户登录态

### 完整代码示例

```java
@WebServlet("/login")
public class LoginServlet extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        String username = request.getParameter("username");
        String password = request.getParameter("password");

        // 1. 校验用户名和密码（实际应查数据库）
        if (!"admin".equals(username) || !"123456".equals(password)) {
            request.setAttribute("error", "用户名或密码错误");
            request.getRequestDispatcher("/login.jsp").forward(request, response);
            return;
        }

        // 2. 校验成功，创建 Session
        HttpSession session = request.getSession(true);
        session.setAttribute("loginUser", username);
        session.setAttribute("loginTime", new Date());

        // 3. 重定向到主页
        response.sendRedirect(request.getContextPath() + "/home");
    }
}
```

**登出处理**：

```java
@WebServlet("/logout")
public class LogoutServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        // 销毁 Session
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate(); // 使 Session 失效
        }

        // 重定向到登录页
        response.sendRedirect(request.getContextPath() + "/login");
    }
}
```

**权限校验（Filter 方式）**：

```java
@WebFilter(urlPatterns = "/user/*")
public class LoginCheckFilter implements Filter {

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;
        
        // 检查 Session 中是否有登录信息
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("loginUser") == null) {
            // 未登录，重定向到登录页
            resp.sendRedirect(req.getContextPath() + "/login");
            return;
        }
        
        // 已登录，放行
        chain.doFilter(request, response);
    }
}
```

## 登录态为什么和安全强相关

一旦浏览器自动带上 Cookie，就要同时考虑：

- 会话过期
- 会话固定攻击
- 会话劫持
- `CSRF` 风险
- 多端登录与登出失效

这也是为什么登录态问题从来不只是"前端有没有跳转成功"，而是完整的会话安全问题。

### Session 的超时机制

```xml
<!-- web.xml 中配置 Session 超时时间（分钟） -->
<session-config>
    <session-timeout>30</session-timeout>
</session-config>
```

也可以在代码中动态设置：

```java
// 设置 Session 超时时间为 1 小时（秒）
session.setMaxInactiveInterval(3600);

// 获取剩余有效时间
int remaining = session.getMaxInactiveInterval();
```

**Session 过时后的行为**：
- `request.getSession(false)` 返回 `null`
- `request.getSession(true)` 创建新的 Session

## Cookie 与 Session 的分工

| 机制 | 存储位置 | 主要作用 |
|---|---|---|
| Cookie | 浏览器端 | 保存会话标识或轻量状态，随请求自动带上 |
| Session | 服务端 | 保存用户登录态和会话上下文 |

很多初学者容易把 Cookie 和 Session 当成同一个东西，其实它们是一对配合机制：

- Cookie 负责"带标识"
- Session 负责"存状态"

## 实战场景

### 场景一：用户登录后访问受保护页面

这是最经典的场景：

- 登录成功后创建 Session
- 浏览器保存 Session ID 对应 Cookie
- 后续访问后台页面时自动带上 Cookie
- 服务端恢复用户身份并判断权限

### 场景二：用户登出后仍能访问

这类问题通常不是"前端没跳转"，而是：

- Session 没真正失效
- Cookie 还在
- 服务端边界没清理干净

因此登出操作通常不仅要删前端标识，还要同步使服务端会话失效。

### 场景三：多实例部署会话丢失

一旦系统多实例部署，如果 Session 只存在单机内存，就会出现：

- 请求打到另一台实例后会话丢失

这也是后来很多系统要么引入分布式 Session，要么走无状态 Token 模式的原因。

### 场景四：浏览器禁用 Cookie

如果用户禁用了 Cookie，Session ID 无法通过 Cookie 传递，解决方案：

```java
// 方式1：URL 重写（URL 中附带 Session ID）
String url = response.encodeURL("/user/profile");
// 输出: /user/profile;jsessionid=abc123

// 方式2：表单隐藏字段
// <input type="hidden" name="jsessionid" value="abc123">
```

## 多实例部署下怎么处理 Session

如果仍然使用 Session 模式，常见做法包括：

### 方案对比

| 方案 | 实现复杂度 | 扩展性 | 推荐度 |
|------|-----------|--------|--------|
| **Session 粘滞** | 低 | 差 | 一般（仅作过渡方案） |
| **Redis Session** | 中 | 好 | 推荐 |
| **JWT/Token** | 中 | 最好 | 推荐（前后端分离首选） |
| **数据库 Session** | 中 | 一般 | 不推荐（性能差） |

### Redis 分布式 Session 示例

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.session</groupId>
    <artifactId>spring-session-data-redis</artifactId>
</dependency>
```

```yaml
# application.yml
spring:
  session:
    store-type: redis
  redis:
    host: localhost
    port: 6379
```

```java
// 配置后，Session 自动存储到 Redis
// 多个实例共享同一个 Redis，实现 Session 共享
@EnableRedisHttpSession
@Configuration
public class SessionConfig {
}
```

### JWT Token 方案

```java
// 登录成功后返回 Token
@PostMapping("/login")
public Result login(@RequestBody LoginDTO dto) {
    User user = userService.authenticate(dto);
    String token = jwtUtil.generateToken(user.getId(), user.getUsername());
    return Result.success(token);
}

// 后续请求在 Header 中携带 Token
@GetMapping("/profile")
public Result profile(@RequestHeader("Authorization") String token) {
    Long userId = jwtUtil.getUserId(token);
    User user = userService.getById(userId);
    return Result.success(user);
}
```

需要注意：

- 粘滞会话实现简单，但扩展性和故障切换能力一般
- 分布式 Session 更适合传统服务端渲染或仍依赖 Session 的系统
- 无状态 Token 更适合前后端分离和多服务场景

## Cookie 与 Session 的安全点

### 为什么 Session 模式容易引出 `CSRF`

因为浏览器会自动携带 Cookie，所以攻击者可以诱导用户访问恶意页面，让浏览器在用户不知情的情况下向目标站点发请求。

这就是 `CSRF` 风险的核心来源：

- 凭证自动携带
- 服务端只认 Cookie，不区分请求是否是用户主动发起

**CSRF 攻击示例**：

```html
<!-- 恶意网站上的页面 -->
<!-- 用户已登录银行网站，Session Cookie 会自动携带 -->
<img src="https://bank.example.com/transfer?to=hacker&amount=1000" style="display:none" />
<!-- 浏览器渲染该 img 时会向银行站点发起 GET 请求并自动携带 Cookie -->
```

### 常见安全措施

| 安全措施 | 说明 | 防护场景 |
|---------|------|---------|
| **会话固定防护** | 登录成功后重新生成 Session ID | 会话固定攻击 |
| **HttpOnly** | 禁止 JS 访问 Cookie | XSS 窃取 Cookie |
| **Secure** | 仅 HTTPS 传输 | 中间人窃听 |
| **SameSite** | 跨站请求限制 | CSRF 攻击 |
| **会话超时** | 合理设置过期时间 | 会话劫持 |
| **登出清理** | 销毁服务端 Session | 登出后残留访问 |
| **CSRF Token** | 每次请求携带随机 Token | CSRF 攻击 |

```java
// 登录成功后迁移 Session（防止会话固定攻击）
HttpSession oldSession = request.getSession(false);
if (oldSession != null) {
    oldSession.invalidate();
}
HttpSession newSession = request.getSession(true);
newSession.setAttribute("loginUser", username);
```

## 排查与治理思路

### 排查重点

会话问题排查时优先看：

- 浏览器是否带上 Cookie（F12 → Application → Cookies）
- Session 是否真的创建成功（服务端日志）
- 服务端是否正确恢复用户上下文（Debug / 日志）
- Session 是否已过期或被销毁（超时配置）
- 多实例环境下会话是否共享（Redis / Sticky）

### 排查清单

```text
用户反馈"未登录"或"登录态丢失"：

□ 浏览器是否携带了 Cookie？
  → F12 → Network → 检查 Request Headers 中是否有 Cookie

□ Cookie 中的 JSESSIONID 是否正确？
  → F12 → Application → Cookies → 检查值

□ 服务端是否创建了 Session？
  → 服务端日志中搜索 Session 创建记录

□ Session 是否已过期？
  → 检查 Session 超时配置和最后访问时间

□ 是否多实例部署？
  → 检查 Session 存储方式是否支持共享

□ 是否有过滤器拦截了请求？
  → 检查 Filter 链配置和日志
```

### 治理重点

- 明确 Session 和 Cookie 的分工
- 登录、过期、登出边界要完整
- 多实例部署要考虑会话共享或替代方案
- 自动携带凭证场景要特别关注安全边界

## 常见误区

- 把 Cookie 和 Session 当成同一个东西
- 只关注登录成功，不关注失效和登出
- 多实例部署还默认单机 Session 足够
- 不理解自动携带登录态带来的安全问题
- 以为 Cookie 里存了 Session ID 就等于服务端自动安全
- 在 Cookie 中存储敏感信息（密码、Token 明文等）
- 不设置 `HttpOnly` 和 `Secure` 属性

## 面试要点

### 基础题

1. **Cookie 和 Session 分别存什么？**
   - Cookie 通常存标识，Session 通常存服务端状态

2. **为什么 Session 模式更容易引出 `CSRF` 风险？**
   - 因为浏览器会自动携带 Cookie

3. **多实例部署下 Session 会遇到什么问题？**
   - 请求落到不同实例时会话可能丢失

### 进阶题

4. **传统登录态和无状态 Token 模式的核心差异是什么？**
   - Session 模式：服务端存状态，有状态
   - Token 模式：客户端持有凭证，无状态

5. **如何防止 CSRF 攻击？**
   - CSRF Token、SameSite Cookie、验证 Referer

6. **如何实现分布式 Session？**
   - Redis Session、数据库存储、JWT Token

### 实战题

7. **用户反馈"登录后刷新页面就回到登录页"，如何排查？**
   - 检查 Cookie 是否设置成功
   - 检查 Session 超时配置
   - 检查域名和路径配置
   - 检查是否有过滤器拦截

8. **Session 固定攻击如何防范？**
   - 登录成功后调用 `session.invalidate()` 重新创建 Session
   - 使用 `changeSessionId()` 迁移 Session ID

## 版本差异(旧版 → 当前)

| 特性 | 旧版（本文编写时） | 当前（Servlet 6.0 / Spring Boot 3.5.x） |
|------|-------------------|----------------------------------------|
| Cookie/Session 机制 | javax.servlet.http.* | 机制不变，包名迁移为 jakarta.servlet.http.* |
| 登录态方案 | 服务端 Session | 新项目多采用 JWT/Redis 会话（无状态） |
| Session 安全 | 固定攻击防护手段不变 | 此外：SameSite Cookie、HttpOnly 均需开启 |
| 虚拟线程 | 无 | 注意 Session 与虚拟线程的线程绑定关系（ThreadLocal 保留） |

> Session/Cookie 是 Web 登录态的基础，机制多年不变；新项目建议优先考虑 JWT/Redis 方案并配置 Secure/HttpOnly/SameSite Cookie 属性。
