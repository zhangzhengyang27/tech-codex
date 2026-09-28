---
title: "10-Cookie和Session"
description: "Cookie 与 Session 的概念、区别与 Java Web 中的使用方法：Cookie 存于客户端（4KB 限制、maxAge 生命周期、易被篡改），Session 存于服务端（JSESSIONID 关联、超时失效、相对安全），含创建/读取/销毁的 Servlet API 代码示例与现代分布式会话（Spring Session Redis、JWT）演进对比。"
keywords: [Cookie, Session, JSESSIONID, 会话管理, Spring Session]
category: "Java"
tags: [Java, 架构与运维]
---


# Cookie 和 Session

作为一名 Java 工程师，理解 Cookie 和 Session 的概念和使用方法是非常重要的。以下是对这两个概念的详细讲解：

## Cookie

Cookie 是存储在客户端（通常是浏览器）上的小数据片段。它们由服务器发送，并在后续请求中被客户端发送回服务器。Cookie 通常用于存储用户偏好、会话标识符以及其他需要跨多个请求持久化的信息

- **存储位置**：客户端（浏览器）
- **数据大小**：每个 Cookie 大小通常不超过 4KB
- **生命周期**：可以设置过期时间（`maxAge`），过期后浏览器会自动删除
- **安全性**：数据存储在客户端，容易被用户查看和篡改，敏感信息不应存储在 Cookie 中

在 Java Web 应用中，可以使用 `javax.servlet.http.Cookie` 类来创建和管理 Cookie（Boot 3.x 起 Servlet API 迁移至 `jakarta.servlet.http.Cookie`，方法名不变）

**创建和发送 Cookie：**

```java
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletResponse;

public void addCookie(HttpServletResponse response) {
    Cookie cookie = new Cookie("username", "john_doe");
    cookie.setMaxAge(24 * 60 * 60); // 设置 Cookie 有效期为一天
    response.addCookie(cookie);
}
```

**读取 Cookie：**

```java
import javax.servlet.http.Cookie;
import javax.servlet.http.HttpServletRequest;

public String getCookieValue(HttpServletRequest request, String name) {
    Cookie[] cookies = request.getCookies();
    if (cookies != null) {
        for (Cookie cookie : cookies) {
            if (cookie.getName().equals(name)) {
                return cookie.getValue();
            }
        }
    }
    return null;
}
```

## Session

Session 是一种在服务器端保持用户状态的方法。Session 通常与特定用户相关联，使用唯一的会话 ID（通常存储在 Cookie 中）来识别用户。Session 数据存储在服务器上，可以包含用户的登录状态、购物车信息等

- **存储位置**：服务器
- **数据大小**：没有固定限制，但应避免存储过多数据，影响性能
- **生命周期**：服务器端设置，通常会有默认的超时时间（例如 30 分钟），超时后会自动失效
- **安全性**：数据存储在服务器端，相对更安全

在 Java Web 应用中，可以使用 `javax.servlet.http.HttpSession` 类来创建和管理 Session（Boot 3.x 起为 `jakarta.servlet.http.HttpSession`）

**创建和存储数据到 Session：**

```java
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

public void createSession(HttpServletRequest request) {
    HttpSession session = request.getSession();
    session.setAttribute("username", "john_doe");
    session.setMaxInactiveInterval(30 * 60); // 设置 Session 过期时间为30分钟
}
```

**读取 Session 数据：**

```java
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

public String getSessionValue(HttpServletRequest request, String name) {
    HttpSession session = request.getSession(false);
    if (session != null) {
        return (String) session.getAttribute(name);
    }
    return null;
}
```

**销毁 Session：**

```java
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;

public void invalidateSession(HttpServletRequest request) {
    HttpSession session = request.getSession(false);
    if (session != null) {
        session.invalidate();
    }
}
```

## 比较 Cookie 和 Session

**存储位置**：

- Cookie：存储在客户端
- Session：存储在服务器端

**安全性**：

- Cookie：容易被用户查看和篡改，安全性较低
- Session：相对安全，因为数据存储在服务器端

**数据大小**：

- Cookie：每个 Cookie 大小有限制（通常不超过 4KB）
- Session：没有固定限制，但应避免存储过多数据

**生命周期**：

- Cookie：可以设置过期时间，过期后自动删除
- Session：服务器端设置过期时间，超时后失效

**适用场景**：

- Cookie：适用于存储不敏感的、需要跨多个请求持久化的数据，如用户偏好设置
- Session：适用于存储敏感的、与用户会话相关的数据，如用户登录状态、购物车信息

## 版本差异(Cookie/Session → 现代 Web)

| 特性 | 传统方案 | 当前实践 |
|------|----------|----------|
| 会话存储 | 服务端内存 Session | 分布式会话：Redis 存储（Spring Session Redis） |
| 会话标识 | JSESSIONID Cookie | 不变；可配置 HttpOnly/Secure/SameSite 增强安全 |
| 单点登录 | 自研 | OAuth2/OIDC、JWT（无状态）或 Spring Session + SSO |
| 跨域会话 | 需共享域 | SameSite=None + Secure + 三方 Cookie 受限，倾向 token 方案 |
| 集群扩展 | sticky session | 无状态 JWT 或 Redis 会话，天然水平扩展 |

> Cookie/Session 基础机制不随版本变化；现代工程重点是会话外置（Redis）、安全属性（SameSite）与向无状态 JWT 演进的取舍。
