---
title: "从Servlet到SpringMVC的演进"
description: "传统 Java Web 的价值,不是为了让你今天继续手写大量 Servlet,而是为了让你理解:为什么早期这么写、为什么演进到 Spring MVC、Spring Boot 又解决了什么。本文梳理 Servlet/JSP → Spring MVC → Spring Boot 的演进链路。"
keywords: []
category: "Java"
tags: [Java, JavaWeb]
---


# 从 Servlet 到 Spring MVC 的演进

传统 Java Web 的价值，不是为了让你今天继续手写大量 Servlet，而是为了让你理解：

- 为什么早期 Java Web 这么写
- 后来为什么会演进到 Spring MVC
- Spring Boot 又在这个基础上进一步解决了什么

理解这一条演进链路，能帮助你把历史技术、当前主线和工程实践串起来。

## Servlet 模式的边界

Servlet 模式能完成 Web 请求处理，但随着业务变复杂，问题会越来越明显：

- 请求分发和业务逻辑耦合
- 参数绑定、返回处理样板代码多
- JSON 处理、异常治理、拦截逻辑不统一
- 控制器职责容易膨胀

也就是说，Servlet 不是不能做复杂系统，而是系统一复杂，开发和维护成本会迅速上升。

### 传统 Servlet 的痛点

```java
// 每个 URL 都需要一个 Servlet，或者用 if-else 分发
@WebServlet("/user")
public class UserServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        String action = req.getParameter("action");

        // 参数手动解析
        String id = req.getParameter("id");
        String name = req.getParameter("name");

        // 路由手动分发
        if ("list".equals(action)) {
            // 查询列表
        } else if ("detail".equals(action)) {
            // 查询详情
        } else if ("create".equals(action)) {
            // 创建用户
        }
        // ... 越来越多的 if-else

        // 响应手动写入
        resp.setContentType("application/json;charset=UTF-8");
        resp.getWriter().write("{\"code\":200}");
    }
}
```

**痛点总结**：

| 问题 | Servlet 时代 | 痛点程度 |
|------|-------------|---------|
| URL 映射 | `@WebServlet` + 手动路由 | ★★☆ |
| 参数绑定 | `req.getParameter()` 逐个获取 | ★★★ |
| 类型转换 | 手动 `Integer.parseInt()` | ★★★ |
| JSON 处理 | 手动序列化/反序列化 | ★★★ |
| 异常处理 | 各 Servlet 自行处理 | ★★☆ |
| 拦截逻辑 | Filter 粒度太粗 | ★★☆ |
| 代码复用 | 只能继承 `BaseServlet` | ★★☆ |

## JSP 模式的边界

JSP 主要解决的是服务端页面渲染问题。在早期 Java Web 里，它很常见，因为：

- 服务端渲染页面是主流
- 前后端边界没有今天这么明确

但现代项目里：

- 前后端分离更普遍
- REST API 更常见
- 前端框架承担了更多页面渲染职责

所以 JSP 更适合理解历史演进，而不是现代方案默认入口。

### JSP 的典型问题

```jsp
<!-- JSP 中混入大量 Java 代码，难以维护 -->
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ page import="java.util.*,com.example.model.*" %>
<html>
<body>
    <%
        List<User> users = (List<User>) request.getAttribute("users");
        for (User user : users) {
    %>
    <tr>
        <td><%= user.getName() %></td>
        <td><%= user.getEmail() %></td>
    </tr>
    <%
        }
    %>
</body>
</html>
```

**问题**：
- Java 代码和 HTML 混在一起，可读性差
- 没有 IDE 级别的模板语法提示
- 前后端无法独立开发和部署
- 调试困难

## Spring MVC 为什么出现

Spring MVC 的价值在于：在 Servlet 容器之上，提供了更现代、更统一的 Web 编程模型。

它主要带来了这些改进：

- 把请求分发统一交给 `DispatcherServlet`
- 用注解简化映射、参数绑定、返回值处理
- 更容易统一做异常处理、拦截器、校验
- 与 Spring 容器整合更自然

它不是推翻 Servlet，而是在 Servlet 容器之上提供了更高层抽象。

### Spring MVC 的核心架构

```
                    ┌──────────────┐
                    │   客户端      │
                    └──────┬───────┘
                           │ HTTP Request
                    ┌──────▼───────┐
                    │  Dispatcher  │  ← 前端控制器
                    │   Servlet    │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
     ┌────────▼──────┐ ┌───▼────┐ ┌────▼─────────┐
     │ HandlerMapping│ │View    │ │Interceptors  │
     │ (URL映射)     │ │Resolver│ │(拦截器链)    │
     └────────┬──────┘ └───┬────┘ └──────────────┘
              │            │
     ┌────────▼──────┐    │
     │  Controller   │    │
     │  (处理器)      │    │
     └────────┬──────┘    │
              │            │
     ┌────────▼──────┐    │
     │View Resolution│    │
     │(视图解析)      │    │
     └────────┬──────┘    │
              │            │
     ┌────────▼────────────▼──────┐
     │      HTTP Response          │
     └─────────────────────────────┘
```

### 一个直观对比

#### 传统 Servlet 写法

```java
@WebServlet("/user/detail")
public class UserDetailServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {
        String userId = req.getParameter("id");
        // 手动类型转换
        Long id = Long.parseLong(userId);
        // 手动调用 Service
        UserService service = new UserService();
        User user = service.getById(id);
        // 手动 JSON 序列化
        resp.setContentType("application/json;charset=UTF-8");
        resp.getWriter().write("{\"id\":" + user.getId()
            + ",\"name\":\"" + user.getName() + "\"}");
    }
}
```

#### Spring MVC 写法

```java
@RestController
@RequestMapping("/user")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/detail")
    public User detail(@RequestParam("id") Long userId) {
        return userService.getById(userId);
        // 自动 JSON 序列化
        // 自动参数绑定和类型转换
    }
}
```

从这个简单例子就能看到，Spring MVC 的优势在于：

- 参数绑定更直接
- 请求映射更清晰
- 业务逻辑和底层 Servlet API 解耦得更好

### Spring MVC 的核心注解

| 注解 | 作用 | 替代的 Servlet 操作 |
|------|------|-------------------|
| `@RestController` | 声明 REST 控制器 | 继承 `HttpServlet` |
| `@RequestMapping` | URL 映射 | `@WebServlet` + if-else |
| `@GetMapping` / `@PostMapping` | HTTP 方法映射 | 重写 `doGet` / `doPost` |
| `@RequestParam` | 请求参数绑定 | `req.getParameter()` |
| `@PathVariable` | 路径变量绑定 | 手动解析 URL |
| `@RequestBody` | 请求体绑定(JSON) | 手动读取 InputStream |
| `@ResponseStatus` | 响应状态码 | `resp.setStatus()` |

## Spring MVC 解决了哪些工程问题

### 统一请求分发

Spring MVC 通过 `DispatcherServlet` 作为统一前端控制器，把请求分发逻辑集中管理，而不是让每个 Servlet 自己处理路由。

```text
Servlet 时代:
  Client → ServletA (自己处理路由)
  Client → ServletB (自己处理路由)
  Client → ServletC (自己处理路由)

Spring MVC 时代:
  Client → DispatcherServlet → ControllerA
                              → ControllerB
                              → ControllerC
```

### 统一异常处理

传统 Servlet 时代，异常处理往往比较分散。Spring MVC 之后，可以更自然地通过全局异常处理器统一收口。

```java
// 传统 Servlet：每个 Servlet 自己 try-catch
protected void doGet(HttpServletRequest req, HttpServletResponse resp) {
    try {
        // 业务逻辑
    } catch (BusinessException e) {
        resp.getWriter().write("{\"code\":500,\"msg\":\"" + e.getMessage() + "\"}");
    } catch (Exception e) {
        resp.getWriter().write("{\"code\":500,\"msg\":\"系统错误\"}");
    }
}

// Spring MVC：全局异常处理
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public Result handleBusinessException(BusinessException e) {
        return Result.fail(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public Result handleException(Exception e) {
        return Result.fail(500, "系统错误");
    }
}
```

### 统一拦截与校验

Spring MVC 把这些能力整合得更清晰：

- 拦截器（`HandlerInterceptor`）
- 参数绑定（`@RequestParam`、`@PathVariable`、`@RequestBody`）
- 数据校验（`@Valid`、`@NotNull`、`@Size`）
- 消息转换（`HttpMessageConverter`）

这让 Web 层从"能跑"走向"可治理"。

### 数据校验示例

```java
// 传统 Servlet：手动校验
String name = req.getParameter("name");
if (name == null || name.isEmpty()) {
    resp.getWriter().write("名称不能为空");
    return;
}
String email = req.getParameter("email");
if (email == null || !email.contains("@")) {
    resp.getWriter().write("邮箱格式不正确");
    return;
}

// Spring MVC：注解校验
public class UserDTO {
    @NotBlank(message = "名称不能为空")
    private String name;

    @Email(message = "邮箱格式不正确")
    private String email;
}

@PostMapping("/user")
public Result createUser(@Valid @RequestBody UserDTO dto) {
    userService.create(dto);
    return Result.success();
}
```

## 为什么后来又继续演进到 Spring Boot

Spring MVC 已经大幅提升了开发体验，但到了企业项目里，仍然还有很多工程问题：

- 依赖版本管理
- XML / Java Config 配置较多
- 容器整合和打包部署成本
- 监控、配置、测试等基础能力接入不统一

### 传统 Spring MVC 的配置痛点

```xml
<!-- web.xml -->
<servlet>
    <servlet-name>dispatcher</servlet-name>
    <servlet-class>org.springframework.web.servlet.DispatcherServlet</servlet-class>
    <init-param>
        <param-name>contextConfigLocation</param-name>
        <param-value>classpath:spring-mvc.xml</param-value>
    </init-param>
</servlet>
<servlet-mapping>
    <servlet-name>dispatcher</servlet-name>
    <url-pattern>/</url-pattern>
</servlet-mapping>

<!-- 还需要 spring-mvc.xml、spring-db.xml、spring-tx.xml... -->
```

### Spring Boot 的解决方案

Spring Boot 进一步解决的是这些工程化问题：

| 问题 | Spring Boot 方案 |
|------|-----------------|
| 依赖版本管理 | `spring-boot-starter-parent` 统一版本 |
| XML 配置过多 | 自动配置 + `application.yml` |
| 容器整合 | 嵌入式 Tomcat/Jetty/Undertow |
| 打包部署 | `java -jar` 一键启动 |
| 监控能力 | `spring-boot-starter-actuator` |
| 测试支持 | `spring-boot-starter-test` |
| 依赖管理 | Starter 机制 |

所以演进链路可以概括为：

```text
Servlet / JSP  →  Spring MVC  →  Spring Boot
(手写底层)       (框架抽象)      (工程化)
```

## 演进链路全景图

```text
┌─────────────────────────────────────────────────────────┐
│                    技术演进路线                            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1997  Servlet + JSP                                     │
│    ├── 手写 Servlet 处理请求                              │
│    ├── JSP 服务端渲染                                     │
│    └── web.xml 配置路由                                    │
│           │                                              │
│           ▼                                              │
│  2001+ Struts / WebWork                                   │
│    ├── MVC 分层思想                                       │
│    ├── ActionForm 参数绑定                                │
│    └── 配置文件驱动                                       │
│           │                                              │
│           ▼                                              │
│  2004  Spring MVC                                        │
│    ├── DispatcherServlet 统一入口                        │
│    ├── 注解驱动（@Controller、@RequestMapping）           │
│    ├── 统一异常处理                                       │
│    └── REST 支持                                         │
│           │                                              │
│           ▼                                              │
│  2014  Spring Boot                                       │
│    ├── 自动配置                                          │
│    ├── Starter 机制                                      │
│    ├── 嵌入式容器                                         │
│    ├── Actuator 监控                                     │
│    └── 生产就绪能力                                       │
│           │                                              │
│           ▼                                              │
│  2022+  Spring Boot 3.x                                  │
│    ├── AOT 编译                                          │
│    ├── GraalVM Native Image                              │
│    ├── Observability 内置                                 │
│    └── Jakarta EE 迁移                                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 实战场景

### 场景一：控制器方法替代手写参数解析

相比原始 Servlet 模式，Spring MVC 让参数绑定、JSON 处理、返回体序列化更自然。

### 场景二：统一异常和拦截

传统 Servlet 时代很多逻辑散落在各层，Spring MVC 之后：

- 拦截器（`HandlerInterceptor`）
- 全局异常处理（`@RestControllerAdvice`）
- 参数校验（`@Valid`、`@Validated`）

都更容易形成统一治理。

### 场景三：从 WAR 到嵌入式容器

再往后发展到 Spring Boot，连 Tomcat 部署形态都进一步简化了，现代项目更多是嵌入式容器启动，而不是手工部署 WAR 包。

```text
传统部署:
  开发 → 打WAR包 → 上传服务器 → 部署Tomcat → 启动

Spring Boot:
  开发 → 打JAR包 → java -jar app.jar → 启动
```

## 阅读这段历史时应该关注什么

读传统 Java Web 内容时，不要只看"怎么写 Servlet"，更要看：

- 哪些问题在 Servlet 时代很痛
- Spring MVC 是如何抽象和统一这些能力的
- Spring Boot 又把哪些工程化问题进一步收敛

这样读，历史内容才有价值。

## 常见误区

- 觉得 Java Web 旧内容"完全没用"
- 或者反过来，把 JSP / Servlet 当成现代项目主线
- 只记技术名词，不理解演进背后的工程问题
- 误以为 Spring MVC 和 Servlet 是完全替代关系（实际上 MVC 建立在 Servlet 之上）
- 以为学会了 Spring Boot 就不需要理解底层

## 面试要点

### 基础题

1. **为什么 Java Web 从 Servlet / JSP 演进到 Spring MVC？**
   - 因为复杂系统需要更统一的请求处理和治理模型

2. **Spring MVC 和 Servlet 是替代关系还是构建关系？**
   - 构建关系：Spring MVC 建立在 Servlet 容器之上

3. **为什么现代项目大多继续演进到 Spring Boot？**
   - 因为还需要解决配置、依赖、部署和运行治理问题

### 进阶题

4. **DispatcherServlet 的作用是什么？**
   - 统一前端控制器，负责接收所有请求并分发到对应的 Controller

5. **Spring Boot 自动配置的原理是什么？**
   - `@EnableAutoConfiguration` + 自动配置清单（Boot 2.7+ 为 `META-INF/spring/...AutoConfiguration.imports`，旧版为 `spring.factories`）+ 条件注解（`@Conditional` 系列）

6. **传统 Java Web 内容今天最大的价值是什么？**
   - 帮助理解 Web 请求生命周期和框架演进逻辑

### 实战题

7. **如何在不使用 Spring Boot 的情况下配置 Spring MVC？**
   - `web.xml` + `spring-mvc.xml` 或 `WebApplicationInitializer`

8. **Servlet Filter 和 Spring MVC Interceptor 的区别？**
   - Filter：Servlet 规范级别，可以拦截所有请求
   - Interceptor：Spring MVC 级别，只能拦截 Controller 请求

## 版本差异(旧版 → Spring Boot 3.5.x)

| 特性 | 旧版（本文编写时） | 当前（Spring Boot 3.5.x） |
|------|-------------------|--------------------------|
| 配置方式 | web.xml + spring-mvc.xml / WebApplicationInitializer | Boot 自动配置 + 注解，零 XML |
| Spring 版本 | Spring 4/5 | Spring 6.2.x |
| 包名 | javax.servlet.* | jakarta.servlet.* |
| DispatcherServlet | 手动注册 | 自动注册（DispatcherServletAutoConfiguration） |
| 虚拟线程 | 无 | Boot 3.2+ 可启用虚拟线程处理请求 |

> 从 Servlet 到 Spring MVC 的演进主线不变：DispatcherServlet 本质仍是 Servlet；升级到 Boot 3.5.x 后只需处理 jakarta 包名迁移，HandlerInterceptor 等机制完全兼容。
