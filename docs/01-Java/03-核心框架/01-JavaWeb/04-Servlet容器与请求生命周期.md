---
title: "Servlet容器与请求生命周期"
description: "理解传统 Java Web,真正关键的不是记多少 Servlet API,而是搞清楚:请求是怎么进来的、容器做了什么、一个请求在线程里经历了哪些阶段。本文讲解 Servlet 容器的请求生命周期、线程模型与转发重定向。"
keywords: []
category: "Java"
tags: [Java, JavaWeb]
---


# Servlet 容器与请求生命周期

理解传统 Java Web，真正关键的不是记多少 `Servlet API`，而是搞清楚：

- 请求是怎么进来的
- 容器做了什么
- 一个请求在线程里经历了哪些阶段

这也是后面理解 Spring MVC、过滤器链和嵌入式 Tomcat 的基础。

## Servlet 容器解决什么问题

Servlet 容器本质上是 Java Web 应用和 HTTP 世界之间的桥梁。它主要负责：

- 接收 HTTP 请求
- 建立请求与响应对象
- 分配工作线程
- 调用对应的 `Filter`、`Servlet`、`Listener`
- 管理 Web 应用生命周期和上下文

常见 Servlet 容器包括：

| 容器 | 特点 |
|------|------|
| **Tomcat** | 最主流，Spring Boot 默认嵌入式容器，社区活跃 |
| **Jetty** | 轻量、可嵌入性好，适合长连接/WebSocket 场景 |
| **Undertow** | 高性能、非阻塞，Spring Boot 可选替换容器 |

在现代 Spring Boot 项目中，虽然很多开发者不再直接写 Servlet，但底层依然离不开这套容器模型。

## 一个请求的大致生命周期

可以先把一次请求粗略理解为下面几个阶段：

```text
浏览器 → DNS → TCP连接 → HTTP请求 → 容器接收 → 线程分配 → Filter链 → Servlet → 业务逻辑 → 写响应 → 返回浏览器
```

详细阶段：

1. 客户端发起 HTTP 请求
2. 容器接收请求并分配工作线程
3. 容器创建 `HttpServletRequest` 和 `HttpServletResponse`
4. 请求经过过滤器链（按 `web.xml` 或注解配置的顺序）
5. 路由到目标 Servlet
6. 执行业务逻辑并写入响应
7. 容器把响应返回给客户端

如果中间发生了：

- 异常
- 请求转发
- 重定向
- 过滤器拦截

那么实际路径还会发生变化。

### 生命周期时序图

```
客户端                  Servlet容器                   Servlet                  Filter
  │                        │                           │                        │
  │── HTTP Request ────────>│                           │                        │
  │                        │── 创建 Request/Response ──>│                        │
  │                        │── 从线程池分配线程 ────────>│                        │
  │                        │                           │                        │
  │                        │── Filter1.doFilter() ─────────────────────────────>│
  │                        │                           │                ┌── chain.doFilter() ──┐
  │                        │                           │                │── Filter2.doFilter() │
  │                        │                           │                │── chain.doFilter() ──┤
  │                        │                           │<────────────────┘                       │
  │                        │── Servlet.service() ─────>│                                        │
  │                        │<── 响应 ──────────────────│<───────────────────────────────────────│
  │<── HTTP Response ──────│                           │                        │
  │                        │── 线程回收 ───────────────>│                        │
```

## 生命周期中的关键角色

### `ServletContext`

`ServletContext` 可以理解为整个 Web 应用级别的上下文。它通常在应用启动时创建，在应用关闭时销毁。

它适合保存：

- 应用级配置信息
- 全局共享对象
- 初始化参数

```java
// 在 Servlet 中获取 ServletContext
ServletContext context = getServletContext();

// 获取初始化参数
String dbUrl = context.getInitParameter("dbUrl");

// 设置全局属性
context.setAttribute("onlineCount", 100);
```

**生命周期**：
- 创建：Web 应用启动时（`contextInitialized()`）
- 销毁：Web 应用关闭或重新部署时（`contextDestroyed()`）

**常见用途**：

| 用途 | 说明 |
|------|------|
| 全局配置 | 存放数据库连接、系统参数等 |
| 共享数据 | 多个 Servlet 之间共享数据 |
| 资源读取 | 读取 `web.xml` 中的配置 |
| 请求转发 | `getRequestDispatcher()` 实现转发 |

### `Servlet`

Servlet 是处理请求的核心组件。容器负责创建 Servlet 实例，并在收到匹配请求时调用其 `service()` 方法。

**Servlet 生命周期**：

```text
加载 → 实例化 → 初始化(init) → 请求处理(service) → 销毁(destroy)
```

```java
@WebServlet("/demo")
public class DemoServlet extends HttpServlet {

    // 1. 初始化（只调用一次）
    @Override
    public void init() throws ServletException {
        System.out.println("Servlet 初始化");
    }

    // 2. 请求处理（每次请求都调用）
    @Override
    protected void service(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        // 根据 HTTP 方法分发到 doGet / doPost 等
        super.service(req, resp);
    }

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp)
            throws ServletException, IOException {
        resp.getWriter().write("Hello Servlet");
    }

    // 3. 销毁（只调用一次）
    @Override
    public void destroy() {
        System.out.println("Servlet 销毁");
    }
}
```

**需要注意**：

- Servlet 通常是单实例、多线程处理请求
- 因此 Servlet 中的成员变量要特别注意线程安全
- `init()` 在第一次请求或启动时调用（取决于 `loadOnStartup` 配置）
- `destroy()` 在容器关闭时调用，用于释放资源

### `Filter`

Filter 位于业务 Servlet 之前或之后，适合处理横切逻辑，例如：

- 编码处理
- 登录校验
- 请求日志
- 跨域处理
- 敏感词过滤
- 压缩响应

**Filter 执行顺序**：

```text
请求: Filter1 → Filter2 → Filter3 → Servlet
响应: Servlet → Filter3 → Filter2 → Filter1
```

```java
@WebFilter(urlPatterns = "/*")
public class AuthFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        // Filter 初始化
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        HttpServletRequest req = (HttpServletRequest) request;

        // 前置处理：编码设置
        req.setCharacterEncoding("UTF-8");
        response.setCharacterEncoding("UTF-8");

        // 前置处理：登录校验
        String uri = req.getRequestURI();
        HttpSession session = req.getSession(false);
        if (!uri.contains("/login") && session == null) {
            response.getWriter().write("未登录");
            return; // 不放行
        }

        // 放行：继续执行后续 Filter 或 Servlet
        long start = System.currentTimeMillis();
        chain.doFilter(request, response);
        long cost = System.currentTimeMillis() - start;

        // 后置处理：记录耗时
        System.out.println(req.getRequestURI() + " 耗时: " + cost + "ms");
    }

    @Override
    public void destroy() {
        // Filter 销毁
    }
}
```

### `Listener`

Listener 用于监听应用、会话或请求级事件，例如：

- 应用启动与销毁
- Session 创建与销毁
- 请求进入与结束
- 属性变化

```java
// 监听 Session 创建和销毁
@WebListener
public class SessionListener implements HttpSessionListener {

    @Override
    public void sessionCreated(HttpSessionEvent se) {
        System.out.println("Session 创建: " + se.getSession().getId());
    }

    @Override
    public void sessionDestroyed(HttpSessionEvent se) {
        System.out.println("Session 销毁: " + se.getSession().getId());
    }
}
```

**常用 Listener 类型**：

| Listener | 监听事件 | 用途 |
|----------|---------|------|
| `ServletContextListener` | 应用启动/销毁 | 初始化数据库连接池、加载缓存 |
| `HttpSessionListener` | Session 创建/销毁 | 在线用户统计 |
| `ServletRequestListener` | 请求进入/结束 | 请求日志 |
| `HttpSessionAttributeListener` | Session 属性变化 | 监听登录状态变化 |

## 为什么线程模型重要

Servlet 容器通常不会为每个请求临时新建线程，而是通过线程池复用工作线程。因此：

- 每个请求不是"独占一个新线程"
- 慢请求会占用线程池资源
- 共享对象必须考虑线程安全

这也是为什么 Java Web 和并发问题天然相关。

如果请求里存在这些操作：

- 阻塞 IO
- 慢 SQL
- 远程调用超时
- 大量同步计算

都可能把容器线程池拖满，最终表现为：

- RT 升高
- 吞吐下降
- 请求排队

### Tomcat 线程池模型

```
┌─────────────────────────────────┐
│        Tomcat 线程池             │
│  ┌───────┐ ┌───────┐ ┌───────┐ │
│  │Thread1│ │Thread2│ │Thread3│ │  ← 默认最大200个线程
│  └───────┘ └───────┘ └───────┘ │
│  ┌───────┐ ┌───────┐ ┌───────┐ │
│  │Thread4│ │Thread5│ │  ...  │ │
│  └───────┘ └───────┘ └───────┘ │
├─────────────────────────────────┤
│  连接器(Acceptor)  → Endpoint   │  ← NIO 模型接收连接
│  Protocol Handler → Coyote      │  ← HTTP 协议解析
│  Container       → Engine       │  ← Servlet 容器
└─────────────────────────────────┘
```

**关键配置参数**：

```xml
<!-- server.xml
     maxThreads:       最大线程数
     minSpareThreads:  最小空闲线程
     acceptCount:      等待队列长度 -->
<Connector port="8080"
           protocol="HTTP/1.1"
           maxThreads="200"
           minSpareThreads="10"
           acceptCount="100"
           connectionTimeout="20000" />
```

当所有线程都在忙，新请求会进入等待队列（`acceptCount`），队列满后请求会被拒绝。

## 转发与重定向

### 请求转发

请求转发发生在服务端内部，浏览器通常只发起一次请求。请求对象会继续沿用当前链路。

```java
// 请求转发
RequestDispatcher dispatcher = request.getRequestDispatcher("/user/detail");
dispatcher.forward(request, response);
```

**特点**：
- 地址栏不变化
- 共享同一个 `Request` 对象
- 只能转发到当前 Web 应用内的资源
- `forward` 前不能提交响应

### 重定向

重定向是服务端告诉浏览器"你再发一个新的请求到另一个地址"。因此浏览器会再次发起请求，地址栏也会变化。

```java
// 重定向
response.sendRedirect("/login.jsp");
```

**特点**：
- 地址栏变化
- 两次请求，不共享 `Request` 对象
- 可以跳转到任意 URL
- 两次独立的请求-响应

### 转发 vs 重定向对比

| 维度 | 转发 (Forward) | 重定向 (Redirect) |
|------|---------------|-------------------|
| 请求次数 | 1次 | 2次 |
| 地址栏 | 不变 | 变化 |
| Request 共享 | √ 共享 | × 不共享 |
| 跳转范围 | 当前应用内 | 任意URL |
| WEB-INF | √ 可以访问 | × 不可以访问 |
| 效率 | 高 | 较低 |

它们最大的区别可以简单记为：

- 转发：服务端内部跳转
- 重定向：客户端重新发起请求

## 实战场景

### 场景一：接口 RT 变高

如果 Servlet 容器线程被慢请求占满，即使业务代码本身没挂，整体吞吐也会明显下降。

**排查步骤**：

```
1. 检查线程池状态
   - jstack 分析线程状态
   - 查看线程是否都在 WAITING / BLOCKED
   
2. 定位慢请求
   - 访问日志找高耗时接口
   - Filter 打印每个请求耗时
   
3. 分析根因
   - 慢 SQL？
   - 外部调用超时？
   - 阻塞 IO？
   - 数据库连接池耗尽？
```

这时排查不能只看 Controller 或 Servlet 逻辑，还要看：

- 容器线程池是否饱和
- 是否存在慢 SQL 或阻塞调用
- 是否有过滤器提前耗时

### 场景二：过滤器链影响请求路径

很多鉴权、日志、编码、跨域处理都发生在业务 Servlet 之前。不理解请求生命周期，很容易排障跑偏，以为"请求没进 Controller 就说明服务没收到请求"。

**排查思路**：

```
请求 → DNS → LB → Nginx → Tomcat → Filter1 → Filter2 → Servlet

排查时逐层检查:
1. 网络层：DNS是否正常？LB是否健康？
2. 容器层：Tomcat是否收到请求？access log？
3. 过滤器层：哪个Filter拦截了？打印日志确认
4. Servlet层：路由是否匹配？参数是否正确？
```

### 场景三：转发和重定向混淆

看似都是"跳页面"，实际一个发生在服务端内部链路，一个依赖浏览器再发一次请求。

**典型错误**：

```java
// 错误：forward 之后又尝试写响应
request.getRequestDispatcher("/success.jsp").forward(request, response);
response.getWriter().write("hello"); // × IllegalStateException

// 正确：forward 之后直接 return
request.getRequestDispatcher("/success.jsp").forward(request, response);
return; // √
```

## 排查与治理思路

### 排查重点

遇到请求链路问题时，优先看：

- 请求是否到达容器（检查 access log）
- 是否被过滤器提前拦截（Filter 日志）
- Servlet 映射是否正确（`@WebServlet` 或 `web.xml`）
- 容器线程池是否存在阻塞（`jstack` 线程 dump）
- 是否发生了转发、重定向或异常中断

### 治理重点

- 把请求处理链路理解成容器统一调度过程
- 容器线程模型和业务线程安全一起看
- 慢请求、阻塞 IO、过滤器顺序要有清晰意识
- 合理配置线程池参数（`maxThreads`、`acceptCount`）

## 常见误区

- 把 Java Web 理解成几个 API 的记忆题
- 以为每个请求都会新建线程
- 不理解过滤器和 Servlet 的先后边界
- 在 Servlet 成员变量里保存请求级状态（线程不安全！）
- 只会写功能，不会从容器角度看请求链路
- 转发和重定向不分，导致数据传递失败
- 忽略 Filter 的执行顺序（`@WebFilter` 无法控制顺序，需要 `web.xml`）

## 面试要点

### 基础题

1. **Servlet 容器主要负责什么？**
   - 接收请求、线程调度、调用 Servlet / Filter / Listener、管理生命周期

2. **一个 HTTP 请求在 Java Web 里大致经历哪些阶段？**
   - 容器接收 → 线程分配 → 创建 Request/Response → Filter 链 → 目标 Servlet → 写响应 → 返回客户端

3. **为什么 Servlet 模型和线程安全问题天然相关？**
   - 因为通常是单实例、多线程处理请求，成员变量是共享的

4. **过滤器为什么通常发生在业务逻辑之前？**
   - 因为它负责统一处理横切能力（编码、鉴权、日志等）

### 进阶题

5. **Servlet 的生命周期是怎样的？**
   - 加载 → 实例化 → `init()` → `service()` / `doGet()` / `doPost()` → `destroy()`

6. **转发和重定向的区别？**
   - 转发：服务端内部，1次请求，地址栏不变，共享 Request
   - 重定向：客户端重新发起，2次请求，地址栏变化，不共享 Request

7. **如何解决 Servlet 线程安全问题？**
   - 不使用成员变量保存请求状态
   - 使用局部变量
   - 使用 `ThreadLocal`
   - 加锁（影响性能，不推荐）

### 实战题

8. **线上接口 RT 突然升高，如何排查？**
   - 查 access log 找高耗时接口
   - `jstack` 分析线程状态
   - 检查数据库连接池、慢 SQL
   - 检查外部服务调用超时
   - 检查 Filter 链中是否有耗时操作

9. **Tomcat 线程池满了会怎样？**
   - 新请求进入等待队列（`acceptCount`）
   - 队列满后返回 `Connection Refused` 或 `503`

10. **ServletContext 和 Session 的区别？**
    - `ServletContext`：应用级别，所有用户共享
    - `Session`：会话级别，单个用户独享

## 版本差异(Servlet 3.x → Servlet 6.0)

| 特性 | 旧版（本文编写时） | 当前（Servlet 6.0，Tomcat 10.1+） |
|------|-------------------|----------------------------------|
| 容器演进 | Tomcat 8/9 | Tomcat 10.1/11（jakarta 命名空间） |
| 请求线程模型 | 阻塞式线程池 | 可启用虚拟线程（Boot 3.2+/Tomcat 10.1+） |
| HTTP/2 | Servlet 4.0 支持 | Servlet 6.0 持续支持 HTTP/2 |
| 生命周期 | init/service/destroy | 机制不变 |
| 部署 | 外部容器 | Spring Boot 内嵌容器为主流 |

> Servlet 容器请求生命周期（解析→Filter 链→Servlet 实例化→service）在 Servlet 6.0 中保持不变，本文对生命周期各阶段的理解依然适用。
