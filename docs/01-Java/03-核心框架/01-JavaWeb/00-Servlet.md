---
title: "Servlet"
description: "随着 Web 技术发展，B/S 架构的劣势逐渐被弥补（如前端框架让界面更丰富），而其跨平台、易维护的优势越来越明显，因此现代 Web 应用主要采用 B/S 架构。"
keywords: [Servlet]
category: "Java"
tags: [Java, JavaWeb]
---


# Servlet 完全指南

## 一、Servlet 概述

### 1.1 Web 应用架构

在深入学习 Servlet 之前，我们需要理解 Web 应用的两种主流架构：

#### C/S 架构（Client/Server）

客户端/服务器模式，需要安装专门的客户端软件。

**优点：**
- 客户端界面丰富，用户体验好
- 应用服务器负荷较轻
- 响应速度快

**缺点：**
- 需要安装客户端，用户群固定
- 维护和升级成本高，所有客户端都需要更新
- 跨平台能力差

#### B/S 架构（Browser/Server）

浏览器/服务器模式，客户端只需浏览器即可访问。

**优点：**
- 无需安装客户端，只要有浏览器即可
- 适用面广，用户群不固定
- 维护和升级成本低，只需更新服务器端
- 跨平台能力强

**缺点：**
- 应用服务器负荷较重
- 浏览器界面功能相对单一
- 跨浏览器兼容性需要处理

::: tip 为什么 B/S 架构成为主流？
随着 Web 技术发展，B/S 架构的劣势逐渐被弥补（如前端框架让界面更丰富），而其跨平台、易维护的优势越来越明显，因此现代 Web 应用主要采用 B/S 架构。
:::

### 1.2 JavaWeb 技术体系

互联网上的资源分为：

- **静态资源**：内容固定不变，如 HTML、CSS、JavaScript、图片等
- **动态资源**：内容根据请求动态生成，如 JSP、Servlet、ASP、PHP 等

**JavaWeb** 是使用 Java 语言开发动态 Web 资源的技术统称，主要包括：
- Servlet（服务端小程序）
- JSP（Java Server Pages）
- 框架技术（Spring、SpringMVC、Spring Boot 等）

### 1.3 Servlet 核心概念

#### 什么是 Servlet？

**Servlet（Server Applet）** 是运行在 Web 服务器上的 Java 小程序，用于处理客户端请求并生成动态响应。

```java
// Servlet 的本质：一个特殊的 Java 类
public class MyServlet extends HttpServlet {
    // 处理请求
}
```

#### Servlet 的作用

1. **接收客户端请求**：处理浏览器发送的 HTTP 请求
2. **处理业务逻辑**：调用 Service 层处理业务
3. **生成动态响应**：根据业务结果生成 HTML、JSON 等响应
4. **访问数据库**：通过 JDBC 或 ORM 框架操作数据库

#### Servlet 与普通 Java 类的区别

| 特性 | 普通 Java 类 | Servlet |
|------|-------------|---------|
| 运行位置 | JVM 中 | Web 容器中 |
| 生命周期 | 程序员控制 | 容器管理 |
| 实例数量 | 由程序决定 | 通常单例 |
| 作用 | 通用功能 | 处理 HTTP 请求 |

#### Servlet 的优势

- **平台无关性**：基于 Java，跨平台运行
- **可移植性**：遵循标准规范，可部署到任何 Servlet 容器
- **高效性**：多线程处理，性能优异
- **功能强大**：丰富的 API 支持
- **安全性**：继承 Java 的安全特性

## 二、Servlet 快速入门

### 2.1 开发环境搭建

#### 创建 Web 项目

使用 IDEA 创建 Java Web 项目：

1. 创建新项目 → Java Enterprise → Web Application
2. 选择 Java EE 版本（推荐 Java EE 8）
3. 配置 Tomcat 服务器

#### Tomcat 配置要点

```xml
<!-- server.xml 配置 UTF-8 编码 -->
<Connector port="8080" protocol="HTTP/1.1"
           connectionTimeout="20000"
           redirectPort="8443"
           URIEncoding="UTF-8" />
```

### 2.2 第一个 Servlet

#### 方式一：实现 Servlet 接口

```java
package com.xiaoye.servlet;

import javax.servlet.*;
import java.io.IOException;

public class HelloServlet implements Servlet {
    
    @Override
    public void init(ServletConfig config) throws ServletException {
        System.out.println("Servlet 初始化");
    }
    
    @Override
    public void service(ServletRequest req, ServletResponse res) 
            throws ServletException, IOException {
        System.out.println("处理请求");
        res.getWriter().write("Hello, Servlet!");
    }
    
    @Override
    public void destroy() {
        System.out.println("Servlet 销毁");
    }
    
    @Override
    public ServletConfig getServletConfig() {
        return null;
    }
    
    @Override
    public String getServletInfo() {
        return "My First Servlet";
    }
}
```

#### 方式二：继承 GenericServlet 类

```java
import javax.servlet.GenericServlet;
import javax.servlet.ServletException;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import java.io.IOException;

public class HelloServlet2 extends GenericServlet {
    
    @Override
    public void service(ServletRequest req, ServletResponse res) 
            throws ServletException, IOException {
        res.getWriter().write("Hello from GenericServlet!");
    }
}
```

#### 方式三：继承 HttpServlet 类（推荐）

```java
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

public class HelloServlet3 extends HttpServlet {
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        resp.setContentType("text/html;charset=UTF-8");
        resp.getWriter().write("<h1>GET 请求处理</h1>");
    }
    
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        resp.setContentType("text/html;charset=UTF-8");
        resp.getWriter().write("<h1>POST 请求处理</h1>");
    }
}
```

### 2.3 Servlet 配置

#### 方式一：web.xml 配置（传统方式）

```xml
<?xml version="1.0" encoding="UTF-8"?>
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee 
         http://xmlns.jcp.org/xml/ns/javaee/web-app_4_0.xsd"
         version="4.0">
    
    <!-- Servlet 注册 -->
    <servlet>
        <servlet-name>helloServlet</servlet-name>
        <servlet-class>com.xiaoye.servlet.HelloServlet3</servlet-class>
    </servlet>
    
    <!-- Servlet 映射 -->
    <servlet-mapping>
        <servlet-name>helloServlet</servlet-name>
        <url-pattern>/hello</url-pattern>
    </servlet-mapping>
    
</web-app>
```

**配置说明：**
- `<servlet-name>`：Servlet 的名称（自定义）
- `<servlet-class>`：Servlet 的全限定类名
- `<url-pattern>`：浏览器访问路径

#### 方式二：注解配置（推荐，Servlet 3.0+）

```java
import javax.servlet.annotation.WebServlet;

// 单路径映射
@WebServlet("/hello")

// 多路径映射
@WebServlet(urlPatterns = {"/hello", "/hi"})

// 完整配置
@WebServlet(
    name = "helloServlet",
    urlPatterns = "/hello",
    loadOnStartup = 1,
    initParams = {
        @WebInitParam(name = "username", value = "admin")
    }
)
public class HelloServlet extends HttpServlet {
    // ...
}
```

### 2.4 URL 映射规则

#### 精确匹配

```java
@WebServlet("/hello")           // 精确匹配 /hello
@WebServlet("/user/list")       // 精确匹配 /user/list
```

#### 目录匹配

```java
@WebServlet("/user/*")          // 匹配 /user/ 下所有路径
```

#### 扩展名匹配

```java
@WebServlet("*.do")             // 匹配所有 .do 结尾的请求
@WebServlet("*.action")         // 匹配所有 .action 结尾的请求
```

::: warning 匹配规则注意事项
- 扩展名匹配不能以 `/` 开头
- 优先级：精确匹配 > 目录匹配 > 扩展名匹配
- 一个 Servlet 可以配置多个 URL 映射
:::

## 三、Servlet 生命周期（重点）

### 3.1 生命周期概述

Servlet 生命周期由 Web 容器管理，包含以下阶段：

```
┌─────────────┐
│   加载类    │
└──────┬──────┘
       ↓
┌─────────────┐
│  实例化     │  调用构造方法
└──────┬──────┘
       ↓
┌─────────────┐
│  初始化     │  调用 init() 方法
└──────┬──────┘
       ↓
┌─────────────┐
│  服务       │  调用 service() 方法（多次）
└──────┬──────┘
       ↓
┌─────────────┐
│  销毁       │  调用 destroy() 方法
└─────────────┘
```

### 3.2 详细流程解析

#### 1. 加载和实例化

**时机**：
- 默认：第一次请求时创建
- 配置 `loadOnStartup`：服务器启动时创建

```java
@WebServlet(urlPatterns = "/hello", loadOnStartup = 1)
public class HelloServlet extends HttpServlet {
    public HelloServlet() {
        System.out.println("构造方法执行，实例创建");
    }
}
```

**loadOnStartup 说明：**
- 值为负数或未设置：首次请求时创建（默认）
- 值为 0 或正数：服务器启动时创建，数值越小优先级越高

#### 2. 初始化

```java
@Override
public void init() throws ServletException {
    System.out.println("Servlet 初始化，执行一次");
    // 执行初始化操作：加载配置文件、建立连接等
}
```

**特点：**
- 只执行一次
- 在实例创建后立即调用
- 用于执行一次性初始化操作

#### 3. 服务

```java
@Override
protected void service(HttpServletRequest req, HttpServletResponse resp) 
        throws ServletException, IOException {
    System.out.println("处理请求，可执行多次");
    // 根据请求方法调用对应的 doGet/doPost
    super.service(req, resp);
}
```

**特点：**
- 每次请求都会调用
- HttpServlet 会根据请求方法分发到 doGet/doPost
- 多线程并发执行

#### 4. 销毁

```java
@Override
public void destroy() {
    System.out.println("Servlet 销毁，执行一次");
    // 释放资源：关闭连接、保存状态等
}
```

**触发时机：**
- 服务器正常关闭
- Web 应用被卸载
- Servlet 被重新加载

### 3.3 生命周期验证示例

```java
@WebServlet("/lifecycle")
public class LifecycleServlet extends HttpServlet {
    
    public LifecycleServlet() {
        System.out.println("1. 构造方法执行");
    }
    
    @Override
    public void init() throws ServletException {
        System.out.println("2. init() 方法执行");
    }
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        System.out.println("3. doGet() 方法执行");
        resp.getWriter().write("Lifecycle Demo");
    }
    
    @Override
    public void destroy() {
        System.out.println("4. destroy() 方法执行");
    }
}
```

**控制台输出：**
```
第一次访问：
1. 构造方法执行
2. init() 方法执行
3. doGet() 方法执行

第二次访问：
3. doGet() 方法执行

服务器关闭：
4. destroy() 方法执行
```

### 3.4 Servlet 单实例多线程

::: danger 重要机制
Servlet 默认采用**单实例多线程**模式：
- **单实例**：一个 Servlet 类只创建一个对象实例
- **多线程**：每个请求由独立线程处理，共享同一个 Servlet 实例

这意味着：
- 成员变量会被所有线程共享（线程不安全）
- 局部变量每个线程独享（线程安全）
:::

## 四、Servlet 体系结构

### 4.1 体系结构图

```
          Servlet 接口
              ↑
              │ 实现
              │
      GenericServlet 抽象类
              ↑
              │ 继承
              │
        HttpServlet 抽象类
              ↑
              │ 继承
              │
        自定义 Servlet 类
```

### 4.2 Servlet 接口

`javax.servlet.Servlet` 接口定义了 Servlet 的核心方法：

| 方法 | 说明 | 调用时机 |
|------|------|----------|
| `void init(ServletConfig config)` | 初始化方法 | 实例创建后调用一次 |
| `void service(ServletRequest req, ServletResponse res)` | 服务方法 | 每次请求调用 |
| `void destroy()` | 销毁方法 | Servlet 卸载前调用一次 |
| `ServletConfig getServletConfig()` | 获取配置信息 | - |
| `String getServletInfo()` | 获取 Servlet 信息 | - |

### 4.3 GenericServlet 类

`javax.servlet.GenericServlet` 是 Servlet 接口的通用实现：

**特点：**
- 实现了 Servlet 接口的大部分方法
- 只需要实现 `service()` 方法
- 与协议无关，适用于各种协议

```java
public abstract class GenericServlet implements Servlet {
    // 实现了 init、destroy 等方法
    // 只留下 service() 为抽象方法
    public abstract void service(ServletRequest req, ServletResponse res);
}
```

### 4.4 HttpServlet 类（重点）

`javax.servlet.http.HttpServlet` 是最常用的 Servlet 实现类：

**特点：**
- 继承 GenericServlet
- 专门处理 HTTP 协议
- 根据请求方法自动分发

**核心方法：**

| 方法 | 说明 |
|------|------|
| `doGet(HttpServletRequest req, HttpServletResponse resp)` | 处理 GET 请求 |
| `doPost(HttpServletRequest req, HttpServletResponse resp)` | 处理 POST 请求 |
| `doPut(HttpServletRequest req, HttpServletResponse resp)` | 处理 PUT 请求 |
| `doDelete(HttpServletRequest req, HttpServletResponse resp)` | 处理 DELETE 请求 |
| `service(HttpServletRequest req, HttpServletResponse resp)` | 请求分发 |

**请求分发机制：**

```java
// HttpServlet 的 service 方法内部实现
protected void service(HttpServletRequest req, HttpServletResponse resp) {
    String method = req.getMethod();
    
    if (method.equals("GET")) {
        doGet(req, resp);
    } else if (method.equals("POST")) {
        doPost(req, resp);
    } else if (method.equals("PUT")) {
        doPut(req, resp);
    } else if (method.equals("DELETE")) {
        doDelete(req, resp);
    }
    // ... 其他方法
}
```

**最佳实践：**

```java
@WebServlet("/user")
public class UserServlet extends HttpServlet {
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        // 处理查询请求
        System.out.println("GET - 查询用户");
    }
    
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        // 处理添加请求
        System.out.println("POST - 添加用户");
    }
    
    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        // 处理更新请求
        System.out.println("PUT - 更新用户");
    }
    
    @Override
    protected void doDelete(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        // 处理删除请求
        System.out.println("DELETE - 删除用户");
    }
}
```

## 五、请求与响应对象

### 5.1 HttpServletRequest 对象

`HttpServletRequest` 封装了客户端的 HTTP 请求信息。

#### 获取请求行信息

```java
@WebServlet("/request")
public class RequestServlet extends HttpServlet {
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        // 获取请求方式
        String method = req.getMethod();                    // GET
        
        // 获取请求路径
        String uri = req.getRequestURI();                   // /webapp/request
        StringBuffer url = req.getRequestURL();             // http://localhost:8080/webapp/request
        
        // 获取协议版本
        String protocol = req.getProtocol();                // HTTP/1.1
        
        // 获取上下文路径（项目名）
        String contextPath = req.getContextPath();          // /webapp
        
        // 获取 Servlet 路径
        String servletPath = req.getServletPath();          // /request
        
        // 获取查询字符串
        String queryString = req.getQueryString();          // name=zhangsan&age=18
    }
}
```

#### 获取请求头信息

```java
// 获取指定请求头
String contentType = req.getHeader("Content-Type");
String userAgent = req.getHeader("User-Agent");

// 获取所有请求头名称
Enumeration<String> headerNames = req.getHeaderNames();
while (headerNames.hasMoreElements()) {
    String name = headerNames.nextElement();
    String value = req.getHeader(name);
    System.out.println(name + ": " + value);
}

// 获取整型请求头
int contentLength = req.getIntHeader("Content-Length");
```

#### 获取请求参数

```java
// 获取单个参数
String username = req.getParameter("username");

// 获取多个值（如复选框）
String[] hobbies = req.getParameterValues("hobby");

// 获取所有参数名
Enumeration<String> paramNames = req.getParameterNames();

// 获取参数 Map
Map<String, String[]> paramMap = req.getParameterMap();
```

#### 获取客户端信息

```java
// 获取客户端 IP
String remoteAddr = req.getRemoteAddr();

// 获取客户端端口
int remotePort = req.getRemotePort();

// 获取服务器名称
String serverName = req.getServerName();

// 获取服务器端口
int serverPort = req.getServerPort();
```

#### 请求域属性

```java
// 存储属性（用于请求转发传递数据）
req.setAttribute("user", user);

// 获取属性
User user = (User) req.getAttribute("user");

// 移除属性
req.removeAttribute("user");
```

### 5.2 HttpServletResponse 对象

`HttpServletResponse` 用于向客户端发送响应。

#### 设置响应行

```java
// 设置状态码
resp.setStatus(200);              // 正常
resp.setStatus(404);              // 未找到
resp.setStatus(500);              // 服务器错误

// 发送错误状态码
resp.sendError(404, "页面不存在");
```

#### 设置响应头

```java
// 设置内容类型和编码
resp.setContentType("text/html;charset=UTF-8");
resp.setContentType("application/json;charset=UTF-8");

// 设置响应头
resp.setHeader("Content-Type", "text/html;charset=UTF-8");
resp.setHeader("Cache-Control", "no-cache");
resp.setHeader("Refresh", "3;url=http://www.baidu.com");

// 设置整型头
resp.setIntHeader("Content-Length", 1024);
```

#### 响应体输出

```java
// 字符输出流（输出文本）
PrintWriter writer = resp.getWriter();
writer.write("<h1>Hello World</h1>");
writer.write("中文内容");

// 字节输出流（输出二进制数据）
ServletOutputStream outputStream = resp.getOutputStream();
// 输出图片、文件等
```

#### 响应 JSON 数据

```java
@WebServlet("/api/user")
public class UserApiServlet extends HttpServlet {
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        // 设置响应类型
        resp.setContentType("application/json;charset=UTF-8");
        
        // 构造 JSON 数据
        String json = "{\"name\":\"张三\",\"age\":18,\"city\":\"北京\"}";
        
        // 输出
        resp.getWriter().write(json);
    }
}
```

### 5.3 中文乱码问题

#### 请求乱码

**POST 请求：**

```java
@Override
protected void doPost(HttpServletRequest req, HttpServletResponse resp) 
        throws ServletException, IOException {
    
    // 必须在获取参数之前设置
    req.setCharacterEncoding("UTF-8");
    
    String name = req.getParameter("name");  // 正常显示中文
}
```

**GET 请求：**

方式一：修改 Tomcat 配置（推荐），server.xml 中添加 `URIEncoding="UTF-8"`：

```xml
<Connector port="8080" protocol="HTTP/1.1"
           connectionTimeout="20000"
           redirectPort="8443"
           URIEncoding="UTF-8" />
```

方式二：手动转码（通用方案）：

```java
String name = req.getParameter("name");
name = new String(name.getBytes("ISO-8859-1"), "UTF-8");
```

#### 响应乱码

```java
// 方式一：设置 Content-Type（推荐）
resp.setContentType("text/html;charset=UTF-8");

// 方式二：分别设置
resp.setCharacterEncoding("UTF-8");
resp.setHeader("Content-Type", "text/html;charset=UTF-8");
```

## 六、ServletConfig 和 ServletContext

### 6.1 ServletConfig 接口

`ServletConfig` 用于获取 Servlet 的初始化配置信息，**每个 Servlet 有独立的 ServletConfig**。

#### 配置初始化参数

**XML 配置：**

```xml
<servlet>
    <servlet-name>configServlet</servlet-name>
    <servlet-class>com.xiaoye.servlet.ConfigServlet</servlet-class>
    <!-- 初始化参数 -->
    <init-param>
        <param-name>username</param-name>
        <param-value>admin</param-value>
    </init-param>
    <init-param>
        <param-name>password</param-name>
        <param-value>123456</param-value>
    </init-param>
</servlet>
<servlet-mapping>
    <servlet-name>configServlet</servlet-name>
    <url-pattern>/config</url-pattern>
</servlet-mapping>
```

**注解配置：**

```java
@WebServlet(
    urlPatterns = "/config",
    initParams = {
        @WebInitParam(name = "username", value = "admin"),
        @WebInitParam(name = "password", value = "123456")
    }
)
public class ConfigServlet extends HttpServlet {
    // ...
}
```

#### 获取配置信息

```java
@Override
public void init() throws ServletException {
    // 获取 ServletConfig 对象
    ServletConfig config = getServletConfig();
    
    // 获取 Servlet 名称
    String servletName = config.getServletName();
    
    // 获取单个参数
    String username = config.getInitParameter("username");
    String password = config.getInitParameter("password");
    
    // 获取所有参数名
    Enumeration<String> names = config.getInitParameterNames();
    while (names.hasMoreElements()) {
        String name = names.nextElement();
        String value = config.getInitParameter(name);
        System.out.println(name + " = " + value);
    }
}
```

### 6.2 ServletContext 接口

`ServletContext` 代表整个 Web 应用，**一个 Web 应用只有一个 ServletContext**。

#### 获取 ServletContext

```java
// 方式一：通过 HttpServlet 父类方法
ServletContext context = getServletContext();

// 方式二：通过 ServletConfig
ServletContext context = getServletConfig().getServletContext();

// 方式三：通过 HttpSession
ServletContext context = req.getSession().getServletContext();

// 方式四：通过 HttpServletRequest
ServletContext context = req.getServletContext();
```

#### 获取全局配置参数

**web.xml 配置：**

```xml
<!-- 全局初始化参数 -->
<context-param>
    <param-name>dbUrl</param-name>
    <param-value>jdbc:mysql://localhost:3306/mydb</param-value>
</context-param>
<context-param>
    <param-name>dbUsername</param-name>
    <param-value>root</param-value>
</context-param>
```

**获取参数：**

```java
@Override
protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
        throws ServletException, IOException {
    
    ServletContext context = getServletContext();
    
    // 获取单个参数
    String dbUrl = context.getInitParameter("dbUrl");
    
    // 获取所有参数名
    Enumeration<String> names = context.getInitParameterNames();
}
```

#### 获取 Web 应用路径

```java
ServletContext context = getServletContext();

// 获取上下文路径（项目名）
String contextPath = context.getContextPath();  // /webapp

// 获取文件在服务器的真实路径
String realPath = context.getRealPath("/");     
// D:\tomcat\webapps\webapp\

String realPath = context.getRealPath("/WEB-INF/web.xml");
// D:\tomcat\webapps\webapp\WEB-INF\web.xml
```

#### 域对象功能

ServletContext 是一个域对象，可以在整个 Web 应用范围内共享数据。

```java
// 存储数据
context.setAttribute("count", 0);

// 获取数据
Integer count = (Integer) context.getAttribute("count");

// 移除数据
context.removeAttribute("count");
```

**统计网站访问次数示例：**

```java
@WebServlet("/visit")
public class VisitServlet extends HttpServlet {
    
    @Override
    public void init() throws ServletException {
        // 初始化访问次数
        getServletContext().setAttribute("count", 0);
    }
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        ServletContext context = getServletContext();
        
        // 获取并递增
        Integer count = (Integer) context.getAttribute("count");
        count++;
        context.setAttribute("count", count);
        
        // 响应
        resp.setContentType("text/html;charset=UTF-8");
        resp.getWriter().write("<h1>您是第 " + count + " 位访客</h1>");
    }
}
```

### 6.3 ServletConfig vs ServletContext

| 特性 | ServletConfig | ServletContext |
|------|--------------|----------------|
| 作用范围 | 单个 Servlet | 整个 Web 应用 |
| 创建时机 | Servlet 初始化时 | Web 应用启动时 |
| 数量 | 每个 Servlet 一个 | 整个应用唯一一个 |
| 参数来源 | `<init-param>` | `<context-param>` |
| 用途 | Servlet 专属配置 | 全局共享数据和配置 |

## 七、请求转发与重定向

### 7.1 请求转发（Forward）

**请求转发**是服务器内部资源跳转，浏览器只发送一次请求。

```java
@WebServlet("/forwardA")
public class ForwardAServlet extends HttpServlet {
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        System.out.println("Servlet A 处理请求");
        
        // 存储数据到 request 域
        req.setAttribute("message", "来自 A 的数据");
        
        // 获取转发器并转发
        req.getRequestDispatcher("/forwardB").forward(req, resp);
    }
}

@WebServlet("/forwardB")
public class ForwardBServlet extends HttpServlet {
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        System.out.println("Servlet B 处理请求");
        
        // 获取转发来的数据
        String message = (String) req.getAttribute("message");
        
        resp.setContentType("text/html;charset=UTF-8");
        resp.getWriter().write("收到消息：" + message);
    }
}
```

**转发特点：**
- 浏览器地址栏不变
- 一次请求，一次响应
- 共享同一个 Request 对象
- 只能转发到本应用内部资源
- 可以访问 WEB-INF 目录下的资源

### 7.2 重定向（Redirect）

**重定向**是浏览器重新发起请求，服务器返回新地址让浏览器重新访问。

```java
@WebServlet("/redirectA")
public class RedirectAServlet extends HttpServlet {
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        System.out.println("Servlet A 处理请求");
        
        // 重定向到其他资源
        resp.sendRedirect("/webapp/redirectB");
        
        // 也可以重定向到外部网站
        // resp.sendRedirect("https://www.baidu.com");
    }
}
```

**重定向特点：**
- 浏览器地址栏改变
- 两次请求，两次响应
- 不共享 Request 对象
- 可以重定向到任何资源（包括外部网站）
- 不能访问 WEB-INF 目录下的资源

### 7.3 转发 vs 重定向对比

| 特性 | 请求转发 | 重定向 |
|------|---------|--------|
| 请求次数 | 1 次 | 2 次 |
| 地址栏 | 不变 | 改变 |
| Request 对象 | 共享 | 不共享 |
| 跳转范围 | 仅本应用内部 | 任意 URL |
| 访问 WEB-INF | 可以 | 不可以 |
| 状态码 | 无特殊状态码 | 302 |

### 7.4 使用场景

**使用转发：**
- 需要传递数据
- 用户登录后显示主页
- 查询数据后显示结果

**使用重定向：**
- 不需要传递数据
- 用户登录成功后跳转（避免表单重复提交）
- 支付成功后跳转到支付平台
- 模块间跳转

```java
@WebServlet("/login")
public class LoginServlet extends HttpServlet {
    
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        String username = req.getParameter("username");
        String password = req.getParameter("password");
        
        if ("admin".equals(username) && "123456".equals(password)) {
            // 登录成功，重定向到主页（避免表单重复提交）
            resp.sendRedirect(req.getContextPath() + "/index.html");
        } else {
            // 登录失败，转发回登录页（保留错误提示）
            req.setAttribute("error", "用户名或密码错误");
            req.getRequestDispatcher("/login.html").forward(req, resp);
        }
    }
}
```

## 八、会话管理

### 8.1 会话管理概述

**问题背景：** HTTP 协议是无状态的，每次请求都是独立的，服务器无法识别请求是否来自同一客户端。

**解决方案：** 使用会话技术保存客户端状态。

```
客户端管理：Cookie（数据存客户端）
服务器管理：Session（数据存服务器）
```

### 8.2 Cookie 技术

#### Cookie 工作原理

```
第一次请求：
浏览器 → 服务器
         ← Set-Cookie: name=zhangsan

第二次请求：
浏览器(Cookie: name=zhangsan) → 服务器
                              ← 服务器读取 Cookie
```

#### Cookie 基本使用

```java
@WebServlet("/cookie")
public class CookieServlet extends HttpServlet {
    
    // 发送 Cookie
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        // 创建 Cookie
        Cookie cookie = new Cookie("username", "zhangsan");
        
        // 设置存活时间（秒）
        cookie.setMaxAge(60 * 60 * 24 * 7);  // 7 天
        
        // 设置路径（只有访问该路径及其子路径才携带 Cookie）
        cookie.setPath(req.getContextPath());
        
        // 添加到响应
        resp.addCookie(cookie);
        
        resp.getWriter().write("Cookie 已发送");
    }
    
    // 获取 Cookie
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        Cookie[] cookies = req.getCookies();
        
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                String name = cookie.getName();
                String value = cookie.getValue();
                System.out.println(name + " = " + value);
            }
        }
    }
}
```

#### Cookie 修改和删除

```java
// 修改 Cookie：创建同名 Cookie 覆盖
Cookie cookie = new Cookie("username", "lisi");
cookie.setMaxAge(60 * 60);
cookie.setPath(req.getContextPath());
resp.addCookie(cookie);

// 删除 Cookie：设置存活时间为 0
Cookie cookie = new Cookie("username", "");
cookie.setMaxAge(0);
cookie.setPath(req.getContextPath());  // 路径必须一致
resp.addCookie(cookie);
```

#### Cookie 中文处理

```java
import java.net.URLEncoder;
import java.net.URLDecoder;

// 发送中文 Cookie
String value = URLEncoder.encode("张三", "UTF-8");
Cookie cookie = new Cookie("name", value);
resp.addCookie(cookie);

// 获取中文 Cookie
String value = cookie.getValue();
String name = URLDecoder.decode(value, "UTF-8");
```

### 8.3 Session 技术

#### Session 工作原理

```
第一次请求：
浏览器 → 服务器
         ← Set-Cookie: JSESSIONID=xxx

第二次请求：
浏览器(Cookie: JSESSIONID=xxx) → 服务器
                                ← 根据 ID 找到 Session
```

#### Session 基本使用

```java
@WebServlet("/session")
public class SessionServlet extends HttpServlet {
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        // 获取 Session（不存在则创建）
        HttpSession session = req.getSession();
        
        // 获取 Session ID
        String sessionId = session.getId();
        System.out.println("Session ID: " + sessionId);
        
        // 判断是否为新创建
        boolean isNew = session.isNew();
        
        // 存储数据
        session.setAttribute("user", "zhangsan");
        
        // 获取数据
        String user = (String) session.getAttribute("user");
        
        // 移除数据
        session.removeAttribute("user");
        
        // 设置存活时间（秒）
        session.setMaxInactiveInterval(60 * 30);  // 30 分钟
        
        // 获取存活时间
        int interval = session.getMaxInactiveInterval();
    }
}
```

#### Session 销毁

```java
// 方式一：手动销毁
session.invalidate();

// 方式二：超时自动销毁（默认 30 分钟）
session.setMaxInactiveInterval(60);  // 60 秒
```

方式三：web.xml 配置全局超时：

```xml
<session-config>
    <session-timeout>30</session-timeout>  <!-- 单位：分钟 -->
</session-config>
```

#### Session 典型应用：用户登录

```java
@WebServlet("/login")
public class LoginServlet extends HttpServlet {
    
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        String username = req.getParameter("username");
        String password = req.getParameter("password");
        
        // 验证登录
        if ("admin".equals(username) && "123456".equals(password)) {
            // 登录成功，存入 Session
            HttpSession session = req.getSession();
            session.setAttribute("user", username);
            
            resp.sendRedirect(req.getContextPath() + "/index.html");
        } else {
            resp.sendRedirect(req.getContextPath() + "/login.html");
        }
    }
}

@WebServlet("/logout")
public class LogoutServlet extends HttpServlet {
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        // 销毁 Session
        HttpSession session = req.getSession();
        session.invalidate();
        
        resp.sendRedirect(req.getContextPath() + "/login.html");
    }
}
```

### 8.4 Cookie vs Session 对比

| 特性 | Cookie | Session |
|------|--------|---------|
| 存储位置 | 浏览器 | 服务器 |
| 数据类型 | 只能字符串 | 任意对象 |
| 存储大小 | 约 4KB | 无限制 |
| 安全性 | 较低（可被篡改） | 较高 |
| 服务器压力 | 无 | 占用内存 |
| 生命周期 | 可长期保存 | 默认 30 分钟 |
| 浏览器支持 | 可被禁用 | 依赖 Cookie |

**选择建议：**
- 敏感数据、重要数据：使用 Session
- 非敏感数据、需要长期保存：使用 Cookie
- 实际开发中：两者结合使用

## 九、Servlet 线程安全

### 9.1 线程安全问题

Servlet 默认采用单实例多线程模式，当多个线程同时访问同一个 Servlet 时，可能发生线程安全问题。

```java
@WebServlet("/thread")
public class ThreadServlet extends HttpServlet {
    
    // 成员变量：线程不安全！
    private String name;
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        name = req.getParameter("name");  // 线程 A 设置 name="A"
        
        try {
            Thread.sleep(5000);  // 线程 A 睡眠
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        
        // 线程 A 输出的可能是线程 B 设置的值！
        resp.getWriter().write("name = " + name);
    }
}
```

### 9.2 解决方案

#### 方案一：使用局部变量（推荐）

```java
@Override
protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
        throws ServletException, IOException {
    
    // 局部变量：每个线程独享，线程安全
    String name = req.getParameter("name");
    
    try {
        Thread.sleep(5000);
    } catch (InterruptedException e) {
        e.printStackTrace();
    }
    
    resp.getWriter().write("name = " + name);
}
```

#### 方案二：使用 synchronized 同步代码块

```java
@Override
protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
        throws ServletException, IOException {
    
    synchronized (this) {  // 加锁，性能下降
        name = req.getParameter("name");
        
        try {
            Thread.sleep(5000);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        
        resp.getWriter().write("name = " + name);
    }
}
```

#### 方案三：实现 SingleThreadModel 接口（已废弃）

```java
// 已过时，不推荐使用
public class ThreadServlet extends HttpServlet implements SingleThreadModel {
    // ...
}
```

### 9.3 最佳实践

::: tip 线程安全准则
1. **避免使用成员变量**：尽量使用局部变量
2. **只读成员变量可以安全使用**：如 `private static final`
3. **必须使用成员变量时**：
   - 使用 `synchronized` 加锁
   - 使用 `ThreadLocal`
   - 使用并发工具类（`AtomicInteger`、`ConcurrentHashMap` 等）
:::

## 十、综合案例：用户管理系统

### 10.1 项目结构

```
UserManager/
├── src/main/java/
│   └── com/xiaoye/
│       ├── dao/
│       │   ├── UserDao.java
│       │   └── impl/UserDaoImpl.java
│       ├── model/
│       │   └── User.java
│       ├── service/
│       │   ├── UserService.java
│       │   └── impl/UserServiceImpl.java
│       ├── servlet/
│       │   ├── UserListServlet.java
│       │   ├── UserAddServlet.java
│       │   ├── UserUpdateServlet.java
│       │   └── UserDeleteServlet.java
│       └── util/
│           └── DbUtil.java
└── webapp/
    ├── WEB-INF/
    │   └── web.xml
    ├── index.html
    ├── add.html
    └── update.html
```

### 10.2 实体类

```java
package com.xiaoye.model;

public class User {
    private Integer id;
    private String username;
    private String password;
    private String email;
    
    public User() {}
    
    public User(String username, String password, String email) {
        this.username = username;
        this.password = password;
        this.email = email;
    }
    
    // getter 和 setter 省略
}
```

### 10.3 数据库工具类

```java
package com.xiaoye.util;

import java.sql.*;

public class DbUtil {
    private static final String URL = "jdbc:mysql://localhost:3306/userdb?useSSL=false&serverTimezone=UTC&characterEncoding=UTF-8";
    private static final String USER = "root";
    private static final String PASSWORD = "123456";
    
    static {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            e.printStackTrace();
        }
    }
    
    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }
    
    public static void close(Connection conn, PreparedStatement pstmt, ResultSet rs) {
        try {
            if (rs != null) rs.close();
            if (pstmt != null) pstmt.close();
            if (conn != null) conn.close();
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }
}
```

### 10.4 DAO 层

```java
package com.xiaoye.dao.impl;

import com.xiaoye.model.User;
import com.xiaoye.util.DbUtil;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class UserDaoImpl {
    
    // 查询所有用户
    public List<User> findAll() {
        List<User> users = new ArrayList<>();
        String sql = "SELECT * FROM user";
        
        Connection conn = null;
        PreparedStatement pstmt = null;
        ResultSet rs = null;
        
        try {
            conn = DbUtil.getConnection();
            pstmt = conn.prepareStatement(sql);
            rs = pstmt.executeQuery();
            
            while (rs.next()) {
                User user = new User();
                user.setId(rs.getInt("id"));
                user.setUsername(rs.getString("username"));
                user.setPassword(rs.getString("password"));
                user.setEmail(rs.getString("email"));
                users.add(user);
            }
        } catch (SQLException e) {
            e.printStackTrace();
        } finally {
            DbUtil.close(conn, pstmt, rs);
        }
        
        return users;
    }
    
    // 添加用户
    public int add(User user) {
        String sql = "INSERT INTO user(username, password, email) VALUES(?, ?, ?)";
        
        Connection conn = null;
        PreparedStatement pstmt = null;
        
        try {
            conn = DbUtil.getConnection();
            pstmt = conn.prepareStatement(sql);
            pstmt.setString(1, user.getUsername());
            pstmt.setString(2, user.getPassword());
            pstmt.setString(3, user.getEmail());
            return pstmt.executeUpdate();
        } catch (SQLException e) {
            e.printStackTrace();
        } finally {
            DbUtil.close(conn, pstmt, null);
        }
        
        return 0;
    }
    
    // 其他方法省略...
}
```

### 10.5 Servlet 层

```java
package com.xiaoye.servlet;

@WebServlet("/user/list")
public class UserListServlet extends HttpServlet {
    
    private UserDaoImpl userDao = new UserDaoImpl();
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        // 查询用户列表
        List<User> users = userDao.findAll();
        
        // 存入 request 域
        req.setAttribute("users", users);
        
        // 转发到 JSP 页面
        req.getRequestDispatcher("/user_list.jsp").forward(req, resp);
    }
}

@WebServlet("/user/add")
public class UserAddServlet extends HttpServlet {
    
    private UserDaoImpl userDao = new UserDaoImpl();
    
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        req.setCharacterEncoding("UTF-8");
        
        String username = req.getParameter("username");
        String password = req.getParameter("password");
        String email = req.getParameter("email");
        
        User user = new User(username, password, email);
        int result = userDao.add(user);
        
        if (result > 0) {
            // 重定向到列表页
            resp.sendRedirect(req.getContextPath() + "/user/list");
        } else {
            resp.getWriter().write("添加失败");
        }
    }
}
```

## 十一、Servlet 3.0+ 新特性

### 11.1 注解支持

Servlet 3.0 引入注解支持,大大简化了配置。

#### 常用注解

```java
// @WebServlet - Servlet 配置
@WebServlet(
    name = "userServlet",
    urlPatterns = {"/user", "/users"},
    loadOnStartup = 1,
    initParams = {
        @WebInitParam(name = "encoding", value = "UTF-8")
    }
)
public class UserServlet extends HttpServlet {
    // ...
}

// @WebFilter - Filter 配置
@WebFilter(
    urlPatterns = "/*",
    initParams = {
        @WebInitParam(name = "encoding", value = "UTF-8")
    }
)
public class EncodingFilter implements Filter {
    // ...
}

// @WebListener - Listener 配置
@WebListener
public class MyContextListener implements ServletContextListener {
    // ...
}

// @MultipartConfig - 文件上传配置
@MultipartConfig(
    fileSizeThreshold = 1024 * 1024,      // 1MB
    maxFileSize = 1024 * 1024 * 5,        // 5MB
    maxRequestSize = 1024 * 1024 * 10,    // 10MB
    location = "/tmp"
)
public class UploadServlet extends HttpServlet {
    // ...
}
```

### 11.2 异步处理

Servlet 3.0 引入异步处理,提升并发性能。

#### 异步处理的必要性

**传统同步处理的问题:**
```java
@WebServlet("/sync")
public class SyncServlet extends HttpServlet {
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        // 长时间处理(如调用远程服务)
        String result = slowService();  // 阻塞 5 秒
        
        // 响应客户端
        resp.getWriter().write(result);
    }
    
    private String slowService() {
        try {
            Thread.sleep(5000);  // 模拟耗时操作
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        return "处理完成";
    }
}
```

**问题:** 线程在等待响应期间被阻塞,无法处理其他请求。

#### 异步处理实现

```java
@WebServlet(urlPatterns = "/async", asyncSupported = true)
public class AsyncServlet extends HttpServlet {
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        resp.setContentType("text/html;charset=UTF-8");
        
        // 1. 开启异步上下文
        AsyncContext asyncContext = req.startAsync();
        
        // 2. 提交异步任务到线程池
        CompletableFuture.runAsync(() -> {
            try {
                // 执行耗时操作
                Thread.sleep(5000);
                
                // 获取响应对象
                ServletResponse response = asyncContext.getResponse();
                response.getWriter().write("异步处理完成");
                
                // 3. 完成异步处理
                asyncContext.complete();
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
        
        // 主线程立即返回,不阻塞
        System.out.println("主线程继续处理其他请求");
    }
}
```

#### 异步处理流程

```
┌─────────────┐
│ 客户端请求  │
└──────┬──────┘
       ↓
┌─────────────┐
│ Servlet接收 │
└──────┬──────┘
       ↓
┌─────────────┐
│ 开启异步    │ startAsync()
└──────┬──────┘
       ↓
┌─────────────┐
│ 提交任务    │ 异步线程池执行
└──────┬──────┘
       ↓
┌─────────────┐
│ 主线程返回  │ 可以处理其他请求
└──────┬──────┘
       ↓
┌─────────────┐
│ 异步完成    │ asyncContext.complete()
└──────┬──────┘
       ↓
┌─────────────┐
│ 响应客户端  │
└─────────────┘
```

#### 异步处理的适用场景

1. **长时间处理:** 文件上传、大文件下载
2. **远程调用:** WebService、RPC 调用
3. **推送技术:** Server-Sent Events (SSE)

```java
// SSE 示例
@WebServlet(urlPatterns = "/sse", asyncSupported = true)
public class SseServlet extends HttpServlet {
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        resp.setContentType("text/event-stream");
        resp.setCharacterEncoding("UTF-8");
        
        AsyncContext asyncContext = req.startAsync();
        
        // 定时推送消息
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
        scheduler.scheduleAtFixedRate(() -> {
            try {
                ServletResponse response = asyncContext.getResponse();
                PrintWriter writer = response.getWriter();
                writer.write("data: " + System.currentTimeMillis() + "\n\n");
                writer.flush();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }, 0, 1, TimeUnit.SECONDS);
    }
}
```

### 11.3 文件上传

Servlet 3.0 内置文件上传支持,无需第三方库。

#### 配置上传 Servlet

```java
@WebServlet("/upload")
@MultipartConfig(
    fileSizeThreshold = 1024 * 1024,      // 内存阈值
    maxFileSize = 1024 * 1024 * 5,        // 单文件最大 5MB
    maxRequestSize = 1024 * 1024 * 20,    // 总请求最大 20MB
    location = "/tmp"                      // 临时目录
)
public class UploadServlet extends HttpServlet {
    
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        req.setCharacterEncoding("UTF-8");
        
        // 1. 获取单个文件
        Part filePart = req.getPart("file");
        
        // 2. 获取文件信息
        String fileName = getFileName(filePart);
        long fileSize = filePart.getSize();
        String contentType = filePart.getContentType();
        
        System.out.println("文件名: " + fileName);
        System.out.println("文件大小: " + fileSize + " bytes");
        System.out.println("文件类型: " + contentType);
        
        // 3. 保存文件
        String uploadPath = getServletContext().getRealPath("/uploads");
        File uploadDir = new File(uploadPath);
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
        
        filePart.write(uploadPath + File.separator + fileName);
        
        resp.setContentType("text/html;charset=UTF-8");
        resp.getWriter().write("文件上传成功: " + fileName);
    }
    
    // 从 Content-Disposition 头中提取文件名
    private String getFileName(Part part) {
        String contentDisp = part.getHeader("content-disposition");
        String[] tokens = contentDisp.split(";");
        for (String token : tokens) {
            if (token.trim().startsWith("filename")) {
                return token.substring(token.indexOf("=") + 2, token.length() - 1);
            }
        }
        return "";
    }
}
```

#### 多文件上传

```java
@WebServlet("/multiUpload")
@MultipartConfig
public class MultiUploadServlet extends HttpServlet {
    
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        req.setCharacterEncoding("UTF-8");
        
        // 获取所有上传文件
        Collection<Part> parts = req.getParts();
        
        int count = 0;
        for (Part part : parts) {
            if (part.getName().equals("files")) {
                String fileName = getFileName(part);
                if (!fileName.isEmpty()) {
                    // 保存文件
                    part.write(getServletContext().getRealPath("/uploads") + 
                              File.separator + fileName);
                    count++;
                }
            }
        }
        
        resp.getWriter().write("成功上传 " + count + " 个文件");
    }
    
    private String getFileName(Part part) {
        // 同上
    }
}
```

#### 前端上传表单

```html
<!-- 单文件上传 -->
<form action="upload" method="post" enctype="multipart/form-data">
    <input type="file" name="file" required>
    <button type="submit">上传</button>
</form>

<!-- 多文件上传 -->
<form action="multiUpload" method="post" enctype="multipart/form-data">
    <input type="file" name="files" multiple required>
    <button type="submit">批量上传</button>
</form>
```

#### 文件上传注意事项

:::: warning 安全提示
1. **文件类型验证:** 检查文件扩展名和 MIME 类型
2. **文件大小限制:** 防止大文件耗尽服务器资源
3. **文件名处理:** 避免文件名冲突和路径遍历攻击
4. **存储位置:** 不要存储在 Web 应用目录下
5. **病毒扫描:** 对上传文件进行安全检查
::::

```java
// 文件类型白名单验证
private boolean isValidFileType(String fileName, String contentType) {
    // 允许的文件类型
    String[] allowedTypes = {
        "image/jpeg", "image/png", "image/gif",
        "application/pdf", "text/plain"
    };
    
    String[] allowedExts = {".jpg", ".jpeg", ".png", ".gif", ".pdf", ".txt"};
    
    // 检查 MIME 类型
    boolean validContentType = Arrays.asList(allowedTypes).contains(contentType);
    
    // 检查文件扩展名
    String fileExt = fileName.substring(fileName.lastIndexOf(".")).toLowerCase();
    boolean validExtension = Arrays.asList(allowedExts).contains(fileExt);
    
    return validContentType && validExtension;
}
```

### 11.4 动态注册

Servlet 3.0 支持运行时动态注册 Servlet、Filter、Listener。

#### 动态注册 Servlet

```java
@WebListener
public class DynamicServletListener implements ServletContextListener {
    
    @Override
    public void contextInitialized(ServletContextEvent sce) {
        ServletContext context = sce.getServletContext();
        
        // 动态注册 Servlet
        ServletRegistration.Dynamic servlet = context.addServlet(
            "dynamicServlet", 
            new HttpServlet() {
                @Override
                protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
                        throws ServletException, IOException {
                    resp.getWriter().write("动态注册的 Servlet");
                }
            }
        );
        
        servlet.addMapping("/dynamic");
        servlet.setLoadOnStartup(1);
    }
}
```

#### 动态注册 Filter

```java
@WebListener
public class DynamicFilterListener implements ServletContextListener {
    
    @Override
    public void contextInitialized(ServletContextEvent sce) {
        ServletContext context = sce.getServletContext();
        
        // 动态注册 Filter
        FilterRegistration.Dynamic filter = context.addFilter(
            "dynamicFilter",
            new Filter() {
                @Override
                public void doFilter(ServletRequest request, ServletResponse response, 
                                   FilterChain chain) 
                        throws IOException, ServletException {
                    System.out.println("动态过滤器执行");
                    chain.doFilter(request, response);
                }
            }
        );
        
        filter.addMappingForUrlPatterns(EnumSet.of(DispatcherType.REQUEST), 
                                       true, "/*");
    }
}
```

## 十二、Servlet 与 Spring MVC

### 12.1 Servlet 在 Spring MVC 中的角色

Spring MVC 基于 Servlet 构建,核心是 DispatcherServlet。

#### DispatcherServlet 架构

```
┌─────────────────────────────────────────┐
│         DispatcherServlet              │
├─────────────────────────────────────────┤
│  - 接收所有 HTTP 请求                    │
│  - 调用 HandlerMapping 找到 Controller  │
│  - 调用 HandlerAdapter 执行 Controller  │
│  - 调用 ViewResolver 解析视图           │
└─────────────────────────────────────────┘
              ↓ 继承关系
┌─────────────────────────────────────────┐
│           FrameworkServlet              │
├─────────────────────────────────────────┤
│  - 提供 Web 应用上下文                   │
│  - 处理多部分请求                        │
└─────────────────────────────────────────┘
              ↓ 继承关系
┌─────────────────────────────────────────┐
│           HttpServletBean              │
├─────────────────────────────────────────┤
│  - 从 ServletConfig 注入配置参数        │
└─────────────────────────────────────────┘
              ↓ 继承关系
┌─────────────────────────────────────────┐
│             HttpServlet                 │
└─────────────────────────────────────────┘
```

#### Spring MVC 工作流程

```
请求 → DispatcherServlet
         ↓
    HandlerMapping (找到 Controller)
         ↓
    HandlerAdapter (执行 Controller)
         ↓
    Controller 返回 ModelAndView
         ↓
    ViewResolver (解析视图)
         ↓
    View 渲染
         ↓
    响应客户端
```

### 12.2 从 Servlet 到 Spring MVC 的演进

#### 传统 Servlet 开发

```java
@WebServlet("/user")
public class UserServlet extends HttpServlet {
    
    private UserService userService = new UserServiceImpl();
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        String action = req.getParameter("action");
        
        if ("list".equals(action)) {
            List<User> users = userService.findAll();
            req.setAttribute("users", users);
            req.getRequestDispatcher("/user_list.jsp").forward(req, resp);
        } else if ("get".equals(action)) {
            Integer id = Integer.parseInt(req.getParameter("id"));
            User user = userService.findById(id);
            req.setAttribute("user", user);
            req.getRequestDispatcher("/user_detail.jsp").forward(req, resp);
        }
    }
}
```

**问题:**
- 一个 Servlet 处理多个动作,代码臃肿
- 手动解析参数
- 手动转发视图
- 依赖管理复杂

#### Spring MVC 开发

```java
@Controller
@RequestMapping("/user")
public class UserController {
    
    @Autowired
    private UserService userService;  // 自动注入
    
    @GetMapping("/list")
    public String list(Model model) {
        List<User> users = userService.findAll();
        model.addAttribute("users", users);
        return "user_list";  // 自动转发到 user_list.jsp
    }
    
    @GetMapping("/get/{id}")
    public String get(@PathVariable Integer id, Model model) {
        User user = userService.findById(id);
        model.addAttribute("user", user);
        return "user_detail";
    }
}
```

**优势:**
- 一个方法处理一个动作,职责清晰
- 自动参数绑定
- 自动视图解析
- 依赖注入

### 12.3 Spring Boot 中的 Servlet

#### 注册 Servlet 的方式

**方式一:@ServletComponentScan 扫描**

```java
@SpringBootApplication
@ServletComponentScan  // 扫描 @WebServlet、@WebFilter、@WebListener
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

@WebServlet("/custom")
public class CustomServlet extends HttpServlet {
    // ...
}
```

**方式二:RegistrationBean 注册**

```java
@Configuration
public class ServletConfig {
    
    @Bean
    public ServletRegistrationBean<CustomServlet> customServlet() {
        ServletRegistrationBean<CustomServlet> bean = 
            new ServletRegistrationBean<>(new CustomServlet(), "/custom");
        bean.setLoadOnStartup(1);
        return bean;
    }
    
    @Bean
    public FilterRegistrationBean<CustomFilter> customFilter() {
        FilterRegistrationBean<CustomFilter> bean = 
            new FilterRegistrationBean<>(new CustomFilter());
        bean.addUrlPatterns("/*");
        bean.setOrder(1);
        return bean;
    }
}
```

#### 为什么 Spring Boot 默认不推荐使用 Servlet

:::: tip 最佳实践
Spring Boot 推荐使用 Controller 而不是直接使用 Servlet,原因:

1. **简化开发:** Spring MVC 提供更高级的抽象
2. **统一管理:** 所有请求由 DispatcherServlet 统一分发
3. **功能丰富:** 参数绑定、数据验证、异常处理等开箱即用
4. **生态整合:** 与 Spring 生态无缝集成

**适用场景:**
- 兼容老系统的 Servlet
- 需要底层控制的应用(如文件下载、WebSocket)
- 性能要求极高的场景
::::

## 十三、Servlet 性能优化

### 13.1 生命周期优化

#### 预加载关键 Servlet

```java
@WebServlet(urlPatterns = "/critical", loadOnStartup = 1)
public class CriticalServlet extends HttpServlet {
    // 服务器启动时加载,避免首次请求延迟
}
```

#### 初始化资源

```java
@WebServlet("/resource")
public class ResourceServlet extends HttpServlet {
    
    private DataSource dataSource;
    
    @Override
    public void init() throws ServletException {
        // 初始化数据库连接池
        dataSource = createDataSource();
    }
    
    @Override
    public void destroy() {
        // 关闭资源
        if (dataSource instanceof AutoCloseable) {
            try {
                ((AutoCloseable) dataSource).close();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
}
```

### 13.2 并发优化

#### 使用异步处理

```java
@WebServlet(urlPatterns = "/async", asyncSupported = true)
public class AsyncServlet extends HttpServlet {
    
    private ExecutorService executorService;
    
    @Override
    public void init() throws ServletException {
        executorService = Executors.newFixedThreadPool(20);
    }
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        AsyncContext asyncContext = req.startAsync();
        
        executorService.submit(() -> {
            try {
                // 执行耗时操作
                String result = processRequest();
                
                asyncContext.getResponse().getWriter().write(result);
                asyncContext.complete();
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }
    
    @Override
    public void destroy() {
        executorService.shutdown();
    }
}
```

#### 连接池配置

```java
// 数据库连接池
private DataSource createDataSource() {
    HikariConfig config = new HikariConfig();
    config.setJdbcUrl("jdbc:mysql://localhost:3306/mydb");
    config.setUsername("root");
    config.setPassword("123456");
    config.setMaximumPoolSize(20);        // 最大连接数
    config.setMinimumIdle(5);             // 最小空闲连接
    config.setConnectionTimeout(30000);   // 连接超时
    config.setIdleTimeout(600000);        // 空闲超时
    return new HikariDataSource(config);
}
```

### 13.3 缓存优化

#### 使用 ServletContext 缓存

```java
@WebServlet("/config")
public class ConfigServlet extends HttpServlet {
    
    @Override
    public void init() throws ServletException {
        // 启动时加载配置到缓存
        Properties config = loadConfig();
        getServletContext().setAttribute("config", config);
    }
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        // 从缓存读取
        Properties config = (Properties) getServletContext().getAttribute("config");
        
        // 使用配置
        String value = config.getProperty("key");
    }
}
```

#### 响应缓存

```java
@WebServlet("/static")
public class StaticServlet extends HttpServlet {
    
    private Map<String, byte[]> cache = new ConcurrentHashMap<>();
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        String path = req.getParameter("path");
        
        // 从缓存读取
        byte[] content = cache.computeIfAbsent(path, k -> {
            try {
                return Files.readAllBytes(Paths.get(getServletContext().getRealPath(k)));
            } catch (IOException e) {
                return null;
            }
        });
        
        if (content != null) {
            resp.getOutputStream().write(content);
        } else {
            resp.sendError(404);
        }
    }
}
```

## 十四、常见误区与面试要点

### 14.1 常见误区

#### 误区一：Servlet 每次请求都创建新实例

× 错误理解：每次请求都创建新的 Servlet 对象

√ 正确理解：Servlet 默认单实例，多次请求共享同一个实例

#### 误区二：成员变量可以随便使用

× 错误代码：
```java
public class MyServlet extends HttpServlet {
    private String username;  // 线程不安全！
}
```

√ 正确做法：使用局部变量

#### 误区三：转发和重定向效果一样

× 错误理解：转发和重定向只是跳转方式不同

√ 正确理解：转发是一次请求，重定向是两次请求，有本质区别

#### 误区四：Session 可以存储任意大小的数据

× 错误认识：Session 存储无限制

√ 正确认识：Session 存储在服务器内存，大量数据会占用内存，影响性能

#### 误区五:Servlet 3.0 异步处理能提升所有场景的性能

× 错误认识:所有请求都应该使用异步处理

√ 正确认识:
- 异步处理适用于IO密集型操作(远程调用、文件处理)
- 计算密集型操作使用异步反而会增加线程切换开销
- 需要根据实际场景选择

#### 误区六:文件上传必须使用第三方库

× 错误认识:Servlet 文件上传必须依赖 Commons FileUpload

√ 正确认识:
- Servlet 3.0+ 内置文件上传支持(@MultipartConfig + Part)
- 无需第三方库,更简单高效

#### 误区七:Spring Boot 完全替代了 Servlet

× 错误认识:Spring Boot 中不再需要了解 Servlet

√ 正确认识:
- Spring MVC 基于 Servlet 构建
- 理解 Servlet 原理有助于深入理解 Spring MVC
- 某些场景仍需要直接使用 Servlet

### 14.2 面试要点

#### Q1：Servlet 生命周期？

**答：**
1. **加载和实例化**：第一次请求或启动时创建实例
2. **初始化**：调用 `init()` 方法，执行一次
3. **服务**：调用 `service()` 方法，每次请求调用
4. **销毁**：调用 `destroy()` 方法，服务器关闭时调用一次

#### Q2：GET 和 POST 请求的区别？

| 特性 | GET | POST |
|------|-----|------|
| 参数位置 | URL 后面 | 请求体中 |
| 参数大小 | 较小（约 2KB） | 无限制 |
| 安全性 | 较低 | 较高 |
| 可缓存 | 可以 | 不可以 |
| 书签收藏 | 可以 | 不可以 |

#### Q3：转发和重定向的区别？

| 特性 | 转发 | 重定向 |
|------|------|--------|
| 请求次数 | 1 次 | 2 次 |
| 地址栏 | 不变 | 改变 |
| Request 域 | 共享 | 不共享 |
| 跳转范围 | 本应用 | 任意 URL |

#### Q4：Cookie 和 Session 的区别？

| 特性 | Cookie | Session |
|------|--------|---------|
| 存储位置 | 客户端 | 服务器 |
| 安全性 | 低 | 高 |
| 存储大小 | 约 4KB | 无限制 |
| 性能影响 | 无 | 占用服务器内存 |

#### Q5：如何解决 Servlet 线程安全问题？

**答：**
1. 使用局部变量代替成员变量（推荐）
2. 使用 `synchronized` 同步代码块
3. 使用 `ThreadLocal` 存储线程私有数据
4. 使用并发工具类

#### Q6：ServletContext 有什么作用？

**答：**
1. 获取 Web 应用初始化参数
2. 获取 Web 应用路径
3. 作为域对象在整个应用范围内共享数据
4. 访问 Web 应用的资源文件

#### Q7：什么是单实例多线程？

**答：** Servlet 默认采用单实例多线程模式：
- **单实例**：一个 Servlet 类只创建一个对象
- **多线程**：每个请求由独立线程处理
- **注意**：成员变量被所有线程共享，存在线程安全问题

#### Q8：Servlet 3.0 有哪些新特性？

**答：**
1. **注解支持**：`@WebServlet` 替代 web.xml 配置
2. **异步处理**：支持异步 Servlet
3. **文件上传**：支持 multipart/form-data
4. **动态注册**：可以动态注册 Servlet、Filter、Listener

#### Q9:Servlet 异步处理的适用场景？

**答:**
1. **远程服务调用:** 调用第三方API、微服务
2. **文件处理:** 大文件上传下载
3. **推送技术:** Server-Sent Events
4. **长轮询:** 即时通讯场景

**不适用场景:**
- 计算密集型任务
- 简单的CRUD操作
- 响应时间很短的请求

#### Q10:如何实现文件上传？

**答:**

**Servlet 3.0+ 方式:**
```java
@WebServlet("/upload")
@MultipartConfig(maxFileSize = 1024*1024*5)
public class UploadServlet extends HttpServlet {
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) {
        Part filePart = req.getPart("file");
        String fileName = filePart.getSubmittedFileName();
        filePart.write("/uploads/" + fileName);
    }
}
```

**关键点:**
- 使用 `@MultipartConfig` 注解
- 通过 `req.getPart()` 获取文件
- 调用 `part.write()` 保存文件

#### Q11:Servlet 与 Spring MVC 的关系？

**答:**
- Spring MVC 基于 Servlet 构建
- DispatcherServlet 是核心,继承 HttpServlet
- Spring MVC 是 Servlet 的高级封装
- 提供了更强大的功能:参数绑定、视图解析、拦截器等

#### Q12:如何防止文件上传漏洞？

**答:**
1. **文件类型验证:** 检查扩展名和MIME类型
2. **文件大小限制:** 设置 maxFileSize
3. **文件名处理:** 重命名文件,避免路径遍历
4. **存储位置:** 不存储在Web应用目录下
5. **权限控制:** 限制上传目录的执行权限
6. **病毒扫描:** 对上传文件进行安全检查

## 十五、实战案例补充

### 15.1 验证码生成

```java
@WebServlet("/captcha")
public class CaptchaServlet extends HttpServlet {
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        // 1. 生成随机验证码
        String captcha = generateCaptcha(4);
        
        // 2. 存入 Session
        req.getSession().setAttribute("captcha", captcha);
        
        // 3. 生成图片
        int width = 120;
        int height = 40;
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        
        Graphics2D g = image.createGraphics();
        
        // 设置背景
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, width, height);
        
        // 绘制验证码
        g.setColor(Color.BLACK);
        g.setFont(new Font("Arial", Font.BOLD, 30));
        g.drawString(captcha, 20, 30);
        
        // 添加干扰线
        Random random = new Random();
        for (int i = 0; i < 5; i++) {
            g.setColor(new Color(random.nextInt(255), random.nextInt(255), random.nextInt(255)));
            g.drawLine(random.nextInt(width), random.nextInt(height), 
                      random.nextInt(width), random.nextInt(height));
        }
        
        // 4. 输出图片
        resp.setContentType("image/jpeg");
        ImageIO.write(image, "jpg", resp.getOutputStream());
    }
    
    private String generateCaptcha(int length) {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        Random random = new Random();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
```

### 15.2 文件下载

```java
@WebServlet("/download")
public class DownloadServlet extends HttpServlet {
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        // 1. 获取文件名
        String fileName = req.getParameter("file");
        
        // 2. 安全检查
        if (fileName == null || fileName.contains("..")) {
            resp.sendError(400, "非法文件名");
            return;
        }
        
        // 3. 获取文件路径
        String filePath = getServletContext().getRealPath("/uploads/" + fileName);
        File file = new File(filePath);
        
        if (!file.exists()) {
            resp.sendError(404, "文件不存在");
            return;
        }
        
        // 4. 设置响应头
        resp.setContentType(getServletContext().getMimeType(fileName));
        resp.setContentLength((int) file.length());
        
        // 处理中文文件名
        String encodedFileName = URLEncoder.encode(fileName, "UTF-8")
                                           .replaceAll("\\+", "%20");
        resp.setHeader("Content-Disposition", 
                      "attachment; filename=\"" + encodedFileName + "\"");
        
        // 5. 输出文件
        try (InputStream in = new FileInputStream(file);
             OutputStream out = resp.getOutputStream()) {
            
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
        }
    }
}
```

### 15.3 AJAX 请求处理

```java
@WebServlet("/api/user")
public class UserApiServlet extends HttpServlet {
    
    private ObjectMapper objectMapper = new ObjectMapper();
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        // 返回 JSON 数据
        resp.setContentType("application/json;charset=UTF-8");
        
        List<User> users = Arrays.asList(
            new User(1, "张三", "zhangsan@example.com"),
            new User(2, "李四", "lisi@example.com")
        );
        
        String json = objectMapper.writeValueAsString(users);
        resp.getWriter().write(json);
    }
    
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        // 接收 JSON 数据
        BufferedReader reader = req.getReader();
        StringBuilder json = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            json.append(line);
        }
        
        // 解析 JSON
        User user = objectMapper.readValue(json.toString(), User.class);
        
        // 处理业务
        System.out.println("收到用户: " + user);
        
        // 返回结果
        resp.setContentType("application/json;charset=UTF-8");
        resp.getWriter().write("{\"success\":true}");
    }
}
```

### 15.4 分页查询

```java
@WebServlet("/user/page")
public class UserPageServlet extends HttpServlet {
    
    private UserDao userDao = new UserDao();
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        // 1. 获取分页参数
        int pageNum = Integer.parseInt(req.getParameter("pageNum") != null ? 
                                      req.getParameter("pageNum") : "1");
        int pageSize = Integer.parseInt(req.getParameter("pageSize") != null ? 
                                       req.getParameter("pageSize") : "10");
        
        // 2. 查询数据
        int totalCount = userDao.count();
        int totalPage = (int) Math.ceil((double) totalCount / pageSize);
        List<User> users = userDao.findByPage(pageNum, pageSize);
        
        // 3. 封装分页对象
        PageBean<User> pageBean = new PageBean<>();
        pageBean.setData(users);
        pageBean.setPageNum(pageNum);
        pageBean.setPageSize(pageSize);
        pageBean.setTotalCount(totalCount);
        pageBean.setTotalPage(totalPage);
        
        // 4. 存入 request 域
        req.setAttribute("pageBean", pageBean);
        
        // 5. 转发到 JSP
        req.getRequestDispatcher("/user_list.jsp").forward(req, resp);
    }
}

// 分页工具类
public class PageBean<T> {
    private List<T> data;          // 数据列表
    private int pageNum;           // 当前页码
    private int pageSize;          // 每页条数
    private int totalCount;        // 总记录数
    private int totalPage;         // 总页数
    
    // getter 和 setter
}
```

## 十六、最佳实践

### 16.1 编码规范

```java
@WebServlet("/user")
public class UserServlet extends HttpServlet {
    
    // 1. 使用注解配置，避免繁琐的 XML
    // 2. 类名以 Servlet 结尾
    // 3. 继承 HttpServlet 而不是实现 Servlet 接口
    
    private UserService userService = new UserServiceImpl();
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        // 4. 设置编码
        resp.setContentType("text/html;charset=UTF-8");
        
        // 5. 使用局部变量
        String action = req.getParameter("action");
        
        // 6. 根据参数分发到不同方法
        if ("list".equals(action)) {
            list(req, resp);
        } else if ("add".equals(action)) {
            add(req, resp);
        }
    }
    
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        req.setCharacterEncoding("UTF-8");
        doGet(req, resp);
    }
    
    private void list(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        // 处理逻辑
    }
    
    private void add(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        // 处理逻辑
    }
}
```

### 16.2 性能优化建议

1. **使用 `loadOnStartup`** 预加载关键 Servlet
2. **避免在成员变量中存储大数据**
3. **合理设置 Session 超时时间**
4. **减少不必要的对象创建**
5. **使用连接池管理数据库连接**

### 16.3 安全建议

1. **输入验证**：对用户输入进行严格验证
2. **防止 SQL 注入**：使用 PreparedStatement
3. **防止 XSS 攻击**：对输出进行 HTML 转义
4. **敏感数据加密**：密码等敏感数据加密存储
5. **使用 HTTPS**：传输层加密

## 十七、总结

### Servlet 核心知识点

```
Servlet 基础
├── 概念：运行在服务器上的 Java 小程序
├── 体系结构：Servlet → GenericServlet → HttpServlet
└── 配置方式：web.xml / @WebServlet

生命周期
├── 加载实例化
├── 初始化（init）
├── 服务（service）
└── 销毁（destroy）

核心对象
├── HttpServletRequest：请求对象
├── HttpServletResponse：响应对象
├── ServletConfig：Servlet 配置
└── ServletContext：Web 应用上下文

会话管理
├── Cookie：客户端存储
└── Session：服务器端存储

跳转方式
├── 请求转发（Forward）
└── 重定向（Redirect）

线程安全
└── 单实例多线程，避免使用成员变量
```

---

> Servlet 是 Java Web 开发的基础，虽然现代开发中更多使用 Spring MVC 等框架，但理解 Servlet 的原理对于掌握 Java Web 开发至关重要。

## 版本差异(Servlet 3.x → Servlet 6.0)

| 特性 | 旧版（本文编写时，Servlet 3.x） | 当前（Servlet 6.0，Tomcat 10.1+） |
|------|-------------------------------|----------------------------------|
| 包名 | javax.servlet.* | jakarta.servlet.*（Servlet 5.0 起强制） |
| 注解配置 | @WebServlet（Servlet 3.0+） | 注解与接口不变，仅包名变化 |
| 异步处理 | Servlet 3.0 引入 | 保留并增强；配合 JDK 21 虚拟线程使用 |
| 文件上传 | @MultipartConfig + Part | 不变 |
| 部署方式 | 外部 Tomcat + web.xml | 新项目推荐 Spring Boot 内嵌容器 |
| 虚拟线程 | 无 | Tomcat 10.1+/Boot 3.2+ 可启用虚拟线程处理请求 |

> 本文的 javax.servlet 示例在 Servlet 5.0+（Tomcat 10+）中需将 import 替换为 jakarta.servlet.*，其余 API 与注解用法完全一致；Servlet 3.0 引入的注解/异步/文件上传特性至今仍是 Servlet 6.0 的核心。
