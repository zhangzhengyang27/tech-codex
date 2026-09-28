---
title: "jsp"
description: "JSP (Java Server Pages) 是 Java 平台的一种服务端视图技术,允许在 HTML 页面中嵌入 Java 代码片段和 JSP 标签,动态生成 Web 页面。"
keywords: [jsp]
category: "Java"
tags: [Java, JavaWeb]
---


# JSP (Java Server Pages)

> **核心要点**：JSP 是一种服务端视图技术,本质上会被编译为 Servlet 执行。虽然在现代项目中已不再是主流,但理解 JSP 有助于掌握 Java Web 技术演进过程。

## 一、JSP 概述

### 1.1 什么是 JSP

**JSP (Java Server Pages)** 是 Java 平台的一种服务端视图技术,允许在 HTML 页面中嵌入 Java 代码片段和 JSP 标签,动态生成 Web 页面。

**JSP 的本质**：
- JSP 是建立在 Servlet 技术之上的模板技术
- Web 容器会将 JSP 文件编译成 Servlet 类
- 最终执行的是生成的 Servlet,而不是 JSP 文件本身

**技术定位**：

JSP 文件：

```jsp
<%@ page contentType="text/html;charset=UTF-8" %>
<html>
<body>
  <h1>当前时间: <%= new java.util.Date() %></h1>
</body>
</html>
```

编译后的 Servlet（简化版）：

```java
public class index_jsp extends HttpServlet {
    public void _jspService(HttpServletRequest request, HttpServletResponse response) {
        response.setContentType("text/html;charset=UTF-8");
        PrintWriter out = response.getWriter();
        out.write("<html>\n<body>\n");
        out.write("<h1>当前时间: ");
        out.print(new java.util.Date());
        out.write("</h1>\n</body>\n</html>");
    }
}
```

### 1.2 JSP 的发展历史

| 时间 | 版本 | 特性 |
|------|------|------|
| 1999 | JSP 1.0 | 最初的 JSP 规范,支持脚本片段和标准动作 |
| 2001 | JSP 1.2 | 引入自定义标签库 |
| 2003 | JSP 2.0 | 支持 EL 表达式、简化自定义标签开发 |
| 2006 | JSP 2.1 | 与 JSF 集成、统一表达式语言 |
| 2013 | JSP 2.3 | Java EE 7,小幅改进 |

**技术演进趋势**：
```
Servlet → JSP → JSP + EL + JSTL → 模板引擎(Thymeleaf) → 前后端分离(Vue/React)
```

### 1.3 JSP 的优缺点

#### 优点

1. **易于上手**：对于熟悉 HTML 和 Java 的开发者,学习成本低
2. **功能强大**：可以直接访问 Java API,灵活性高
3. **成熟稳定**：经过多年发展,技术成熟,生态完善
4. **适合简单页面**：对于简单的动态页面,开发效率高

#### 缺点

1. **耦合度高**：HTML 和 Java 代码混合,难以维护
2. **可读性差**：大量脚本片段导致页面结构混乱
3. **测试困难**：无法对页面逻辑进行单元测试
4. **前后端分离困难**：不利于前后端分工协作
5. **性能问题**：首次访问需要编译,影响响应速度

### 1.4 为什么仍然值得学习 JSP

1. **理解 Servlet 容器的工作原理**
   - JSP 最终会被编译为 Servlet 执行
   - 理解 JSP 有助于理解 Web 容器的视图处理机制

2. **维护存量项目**
   - 许多老系统仍在使用 JSP
   - 需要具备维护和优化的能力

3. **面试准备**
   - 面试中常用于说明 Java Web 技术演进
   - 考察对技术选型的理解和判断能力

4. **学习服务端渲染的原理**
   - JSP 是服务端渲染的典型代表
   - 有助于理解现代模板引擎(Thymeleaf、Freemarker)的工作原理

---

## 二、JSP 核心原理

### 2.1 JSP 的执行流程

当浏览器请求一个 `.jsp` 页面时,Web 容器的处理流程如下:

```
1. 浏览器发送请求 → http://localhost:8080/hello.jsp

2. Web 容器检查 JSP 文件
   ├─ 是否存在?
   ├─ 是否被修改过?
   └─ 是否已编译?

3. 如果未编译或已修改
   ├─ JSP 引擎解析 JSP 文件
   ├─ 将 JSP 转换为 Servlet 源码
   └─ 编译 Servlet 为 .class 文件

4. Web 容器加载并实例化 Servlet

5. Servlet 调用 _jspService() 方法
   ├─ 设置响应内容类型
   ├─ 获取输出流(PrintWriter)
   └─ 输出 HTML 内容

6. 容器将响应返回给浏览器
```

**详细流程图**：

```
┌─────────┐
│ 浏览器  │
└────┬────┘
     │ HTTP 请求: hello.jsp
     ↓
┌─────────────────┐
│   Web 容器      │
│  (Tomcat)       │
└────────┬────────┘
         │
         ↓
┌─────────────────────────┐
│ JSP 引擎检查 JSP 文件   │
│ - 是否存在?             │
│ - 是否被修改?           │
│ - 是否已编译?           │
└────────┬────────────────┘
         │
         ↓
    ┌────┴────┐
    │需要编译?│
    └────┬────┘
         │
    ┌────┴────────────────┐
    │                     │
   YES                   NO
    │                     │
    ↓                     │
┌──────────────┐          │
│ JSP → Servlet│          │
│ 转换与编译   │          │
└──────┬───────┘          │
       │                  │
       ↓                  │
┌──────────────┐          │
│ 加载 Servlet │◄─────────┘
└──────┬───────┘
       │
       ↓
┌──────────────────┐
│ 执行 _jspService │
│ 生成 HTML 响应   │
└──────┬───────────┘
       │
       ↓
┌─────────────┐
│ 返回给浏览器│
└─────────────┘
```

### 2.2 JSP 的生命周期

JSP 的生命周期与 Servlet 类似,但有一些特殊之处:

#### 1. 编译阶段

JSP 文件 hello.jsp：

```jsp
<%@ page contentType="text/html;charset=UTF-8" %>
<html>
<body>
  <h1>Hello, <%= request.getParameter("name") %>!</h1>
</body>
</html>
```

生成的 Servlet 类（简化）：

```java
public class hello_jsp extends HttpJspBase {
    
    // 初始化方法
    public void _jspInit() {
        // 初始化资源
    }
    
    // 销毁方法
    public void _jspDestroy() {
        // 释放资源
    }
    
    // 服务方法
    public void _jspService(HttpServletRequest request, 
                            HttpServletResponse response) 
        throws IOException, ServletException {
        
        // 设置响应类型
        response.setContentType("text/html;charset=UTF-8");
        
        // 获取输出流
        PrintWriter out = response.getWriter();
        
        // 输出 HTML
        out.write("<html>\n<body>\n");
        out.write("  <h1>Hello, ");
        out.print(request.getParameter("name"));
        out.write("!</h1>\n</body>\n</html>");
    }
}
```

#### 2. 初始化阶段

```java
// JSP 初始化方法
public void jspInit() {
    // 初始化数据库连接
    // 加载配置文件
    // 初始化缓存
}
```

#### 3. 服务阶段

```java
// 每次请求都会调用 _jspService 方法
public void _jspService(HttpServletRequest request, 
                        HttpServletResponse response) {
    // 处理请求
    // 生成响应
}
```

#### 4. 销毁阶段

```java
// JSP 销毁方法
public void jspDestroy() {
    // 关闭数据库连接
    // 释放资源
    // 清理缓存
}
```

### 2.3 JSP 与 Servlet 的关系

**核心观点**：JSP 本质上就是 Servlet,两者不是平行替代关系。

| 特性 | Servlet | JSP |
|------|---------|-----|
| 本质 | Java 类 | 文本文件(被编译为 Servlet) |
| 适用场景 | 业务逻辑处理、API 开发 | 视图展示、页面渲染 |
| 编写方式 | 纯 Java 代码 | HTML + Java 代码片段 |
| 部署方式 | 编译后部署 | 容器自动编译 |
| MVC 中的角色 | Controller | View |

**最佳实践**：
```
MVC 架构中的分工:
- Model: JavaBean、Entity
- View: JSP、Thymeleaf
- Controller: Servlet、Spring MVC Controller
```

---

## 三、JSP 语法详解

### 3.1 JSP 指令(Directives)

JSP 指令用于向容器提供全局信息,不直接产生输出。

#### 1. page 指令

```jsp
<%@ page 
    language="java"           // 脚本语言,默认 java
    contentType="text/html; charset=UTF-8"  // 响应内容类型
    pageEncoding="UTF-8"      // JSP 文件编码
    import="java.util.*,java.sql.*"  // 导入 Java 类
    session="true"            // 是否启用 session,默认 true
    buffer="8kb"              // 缓冲区大小
    autoFlush="true"          // 自动刷新缓冲区
    isThreadSafe="true"       // 是否线程安全
    isErrorPage="false"       // 是否为错误处理页面
    errorPage="error.jsp"     // 错误处理页面
%>

<!-- 示例 -->
<%@ page contentType="text/html;charset=UTF-8" import="java.util.*" %>
<%@ page errorPage="error.jsp" %>
```

#### 2. include 指令

```jsp
<!-- 静态包含:在编译时将目标文件内容插入到当前文件 -->
<%@ include file="header.jsp" %>

<!-- 示例:布局模板 -->
<html>
<head>
    <title>我的网站</title>
</head>
<body>
    <%@ include file="header.jsp" %>
    
    <div class="content">
        <!-- 页面内容 -->
    </div>
    
    <%@ include file="footer.jsp" %>
</body>
</html>
```

**静态包含 vs 动态包含**：

| 特性 | 静态包含 `<%@ include %>` | 动态包含 `<jsp:include>` |
|------|--------------------------|------------------------|
| 执行时机 | 编译时 | 运行时 |
| 原理 | 源码合并 | 请求转发 |
| 变量共享 | 共享同一个 request | 独立的 request |
| 性能 | 更高 | 较低 |
| 灵活性 | 较低 | 更高 |

#### 3. taglib 指令

```jsp
<!-- 引入 JSTL 核心标签库 -->
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<!-- 引入 JSTL 格式化标签库 -->
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<!-- 引入自定义标签库 -->
<%@ taglib prefix="my" uri="/WEB-INF/tags/my-tags.tld" %>
```

### 3.2 JSP 脚本元素

#### 1. 脚本片段(Scriptlet)

```jsp
<%
    // Java 代码片段
    // 可以写任意 Java 代码
    String name = request.getParameter("name");
    if (name == null || name.isEmpty()) {
        name = "Guest";
    }
    
    // 循环、条件、方法调用等
    for (int i = 0; i < 10; i++) {
        out.println("<p>Number: " + i + "</p>");
    }
%>

<!--  注意:不推荐在 JSP 中写大量业务逻辑! -->
```

#### 2. 表达式(Expression)

```jsp
<!-- 表达式会被转换为 out.print() -->
<h1>Welcome, <%= user.getName() %>!</h1>
<p>Current time: <%= new java.util.Date() %></p>
<p>Sum: <%= 10 + 20 %></p>

<!-- 等价于 -->
<h1>Welcome, 
<% out.print(user.getName()); %>
!</h1>
```

#### 3. 声明(Declaration)

```jsp
<%!
    // 声明成员变量和方法
    private int counter = 0;
    
    public int getCounter() {
        return ++counter;
    }
    
    private String formatDate(Date date) {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
        return sdf.format(date);
    }
%>

<!-- 使用声明的方法 -->
<p>访问次数: <%= getCounter() %></p>
<p>当前时间: <%= formatDate(new Date()) %></p>
```

**脚本片段 vs 声明**：

| 特性 | 脚本片段 `<% %>` | 声明 `<%! %>` |
|------|----------------|--------------|
| 位置 | `_jspService()` 方法内 | Servlet 类体中 |
| 作用域 | 局部变量 | 成员变量/方法 |
| 线程安全 | 线程安全(每次请求独立) | 非线程安全(共享) |

### 3.3 JSP 隐式对象

JSP 提供了 9 个隐式对象,无需声明即可直接使用:

#### 1. request - HttpServletRequest 对象

```jsp
<%
    // 获取请求参数
    String name = request.getParameter("name");
    
    // 获取请求头
    String userAgent = request.getHeader("User-Agent");
    
    // 获取请求属性
    Object user = request.getAttribute("user");
    
    // 设置请求属性
    request.setAttribute("message", "Hello");
%>
```

#### 2. response - HttpServletResponse 对象

```jsp
<%
    // 设置响应类型
    response.setContentType("application/json");
    
    // 设置响应头
    response.setHeader("Cache-Control", "no-cache");
    
    // 重定向
    // response.sendRedirect("login.jsp");
    
    // 获取输出流
    PrintWriter out = response.getWriter();
    out.println("Hello");
%>
```

#### 3. out - JspWriter 对象

```jsp
<%
    // 输出内容到页面
    out.println("<h1>Hello World</h1>");
    out.print("当前时间: " + new Date());
    
    // 清空缓冲区
    // out.clear();
    
    // 刷新缓冲区
    out.flush();
%>
```

#### 4. session - HttpSession 对象

```jsp
<%
    // 获取 session
    HttpSession session = request.getSession();
    
    // 设置 session 属性
    session.setAttribute("user", userObject);
    
    // 获取 session 属性
    User user = (User) session.getAttribute("user");
    
    // 移除 session 属性
    session.removeAttribute("user");
    
    // 使 session 失效
    // session.invalidate();
%>
```

#### 5. application - ServletContext 对象

```jsp
<%
    // 获取应用初始化参数
    String dbUrl = application.getInitParameter("dbUrl");
    
    // 设置应用范围属性
    application.setAttribute("counter", 0);
    
    // 获取应用范围属性
    Integer counter = (Integer) application.getAttribute("counter");
    
    // 获取真实路径
    String realPath = application.getRealPath("/WEB-INF/config.properties");
%>
```

#### 6. config - ServletConfig 对象

```jsp
<%
    // 获取 Servlet 初始化参数
    String param = config.getInitParameter("configParam");
    
    // 获取 Servlet 名称
    String servletName = config.getServletName();
%>
```

#### 7. pageContext - PageContext 对象

```jsp
<%
    // 获取其他隐式对象
    HttpServletRequest req = (HttpServletRequest) pageContext.getRequest();
    HttpSession sess = pageContext.getSession();
    
    // 设置页面范围属性
    pageContext.setAttribute("message", "Hello", PageContext.PAGE_SCOPE);
    
    // 查找属性(依次在 page、request、session、application 范围查找)
    Object value = pageContext.findAttribute("user");
    
    // 转发请求
    // pageContext.forward("result.jsp");
    
    // 包含其他页面
    pageContext.include("header.jsp");
%>
```

#### 8. page - 当前 Servlet 实例

```jsp
<%
    // page 等价于 this
    // 当前 JSP 编译后的 Servlet 实例
    String servletName = page.getClass().getName();
%>
```

#### 9. exception - Throwable 对象

```jsp
<!-- 在错误处理页面中使用 -->
<%@ page isErrorPage="true" %>

<%
    // 获取异常信息
    String message = exception.getMessage();
    String stackTrace = Arrays.toString(exception.getStackTrace());
%>

<h1>出错了!</h1>
<p>错误信息: <%= message %></p>
<pre><%= stackTrace %></pre>
```

**隐式对象作用域总结**：

| 对象 | 作用域 | 生命周期 |
|------|--------|---------|
| pageContext | Page | 当前页面 |
| request | Request | 当前请求 |
| session | Session | 当前会话 |
| application | Application | 整个应用 |

---

## 四、EL 表达式(Expression Language)

### 4.1 EL 表达式概述

**EL (Expression Language)** 是 JSP 2.0 引入的表达式语言,用于简化 JSP 页面中的数据访问。

**优点**：
- 语法简洁,易于阅读
- 自动类型转换
- 空值安全处理
- 支持运算符和函数

**基本语法**：

```jsp
${expression}
```

### 4.2 EL 访问数据

#### 1. 访问对象属性

```jsp
<%
    // 设置 request 属性
    User user = new User("张三", 25);
    request.setAttribute("user", user);
%>

<!-- 使用 EL 访问 -->
<p>姓名: ${user.name}</p>
<p>年龄: ${user.age}</p>

<!-- 等价于 -->
<p>姓名: <%= ((User) request.getAttribute("user")).getName() %></p>
```

#### 2. 访问集合

```jsp
<%
    // List
    List<String> names = Arrays.asList("张三", "李四", "王五");
    request.setAttribute("names", names);
    
    // Map
    Map<String, Object> map = new HashMap<>();
    map.put("name", "张三");
    map.put("age", 25);
    request.setAttribute("userMap", map);
%>

<!-- 访问 List -->
<p>第一个: ${names[0]}</p>
<p>第二个: ${names[1]}</p>

<!-- 访问 Map -->
<p>姓名: ${userMap.name}</p>
<p>年龄: ${userMap['age']}</p>
```

#### 3. 作用域访问

```jsp
<%
    // 在不同作用域设置同名属性
    pageContext.setAttribute("name", "Page Scope");
    request.setAttribute("name", "Request Scope");
    session.setAttribute("name", "Session Scope");
    application.setAttribute("name", "Application Scope");
%>

<!-- 自动从最小范围开始查找 -->
<p>${name}</p> <!-- 输出: Page Scope -->

<!-- 显式指定作用域 -->
<p>Page: ${pageScope.name}</p>
<p>Request: ${requestScope.name}</p>
<p>Session: ${sessionScope.name}</p>
<p>Application: ${applicationScope.name}</p>
```

### 4.3 EL 运算符

#### 1. 算术运算符

```jsp
<p>加法: ${10 + 5}</p>        <!-- 15 -->
<p>减法: ${10 - 5}</p>        <!-- 5 -->
<p>乘法: ${10 * 5}</p>        <!-- 50 -->
<p>除法: ${10 / 5}</p>        <!-- 2.0 -->
<p>取模: ${10 % 3}</p>        <!-- 1 -->
```

#### 2. 比较运算符

```jsp
<p>相等: ${10 == 10}</p>      <!-- true -->
<p>不等: ${10 != 5}</p>       <!-- true -->
<p>大于: ${10 > 5}</p>        <!-- true -->
<p>小于: ${10 < 15}</p>       <!-- true -->
<p>大于等于: ${10 >= 10}</p>  <!-- true -->
<p>小于等于: ${10 <= 15}</p>  <!-- true -->
```

#### 3. 逻辑运算符

```jsp
<p>与: ${true && false}</p>   <!-- false -->
<p>或: ${true || false}</p>   <!-- true -->
<p>非: ${!true}</p>           <!-- false -->
```

#### 4. 空值判断

```jsp
<%
    String nullStr = null;
    String emptyStr = "";
    List<String> emptyList = new ArrayList<>();
    
    request.setAttribute("nullStr", nullStr);
    request.setAttribute("emptyStr", emptyStr);
    request.setAttribute("emptyList", emptyList);
%>

<p>判断 null: ${empty nullStr}</p>        <!-- true -->
<p>判断空字符串: ${empty emptyStr}</p>    <!-- true -->
<p>判断空集合: ${empty emptyList}</p>     <!-- true -->
<p>判断非空: ${!empty names}</p>          <!-- false -->
```

### 4.4 EL 隐式对象

```jsp
<!-- pageScope -->
${pageScope.user}

<!-- requestScope -->
${requestScope.user}

<!-- sessionScope -->
${sessionScope.user}

<!-- applicationScope -->
${applicationScope.user}

<!-- param - 请求参数 -->
${param.username}
${param.password}

<!-- paramValues - 多值请求参数 -->
${paramValues.hobbies[0]}
${paramValues.hobbies[1]}

<!-- header - 请求头 -->
${header["User-Agent"]}
${header.Host}

<!-- headerValues - 多值请求头 -->
${headerValues["Accept-Encoding"][0]}

<!-- cookie -->
${cookie.JSESSIONID.value}

<!-- initParam - 初始化参数 -->
${initParam.dbUrl}

<!-- pageContext -->
${pageContext.request.contextPath}
${pageContext.session.id}
```

---

## 五、JSTL 标签库

### 5.1 JSTL 概述

**JSTL (JavaServer Pages Standard Tag Library)** 是 JSP 标准标签库,提供了一组常用标签,用于替代 JSP 脚本片段。

**优点**：
- 代码更简洁、可读性更高
- 易于维护和重用
- 避免在 JSP 中写 Java 代码
- 符合 MVC 分层架构

**引入 JSTL**：

```jsp
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="sql" uri="http://java.sun.com/jsp/jstl/sql" %>
<%@ taglib prefix="x" uri="http://java.sun.com/jsp/jstl/xml" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
```

### 5.2 核心标签库(Core)

#### 1. 条件标签

```jsp
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<!-- if 标签 -->
<c:if test="${user.age >= 18}">
    <p>您已成年</p>
</c:if>

<!-- if-else 标签 -->
<c:choose>
    <c:when test="${score >= 90}">
        <p>优秀</p>
    </c:when>
    <c:when test="${score >= 80}">
        <p>良好</p>
    </c:when>
    <c:when test="${score >= 60}">
        <p>及格</p>
    </c:when>
    <c:otherwise>
        <p>不及格</p>
    </c:otherwise>
</c:choose>
```

#### 2. 循环标签

```jsp
<!-- forEach 遍历集合 -->
<c:forEach items="${users}" var="user" varStatus="status">
    <tr>
        <td>${status.index + 1}</td>
        <td>${user.name}</td>
        <td>${user.age}</td>
    </tr>
</c:forEach>

<!-- forEach 循环指定次数 -->
<c:forEach begin="1" end="10" step="2" var="i">
    <p>${i}</p>
</c:forEach>

<!-- forTokens 分隔字符串 -->
<c:forTokens items="张三,李四,王五" delims="," var="name">
    <p>${name}</p>
</c:forTokens>
```

#### 3. URL 标签

```jsp
<!-- url 生成 URL -->
<a href="<c:url value='/user/profile'/>">用户资料</a>

<!-- url 带参数 -->
<c:url value="/user/search" var="searchUrl">
    <c:param name="keyword" value="${keyword}"/>
    <c:param name="page" value="1"/>
</c:url>
<a href="${searchUrl}">搜索结果</a>
```

#### 4. 重定向标签

```jsp
<!-- redirect 重定向 -->
<c:redirect url="/login.jsp">
    <c:param name="error" value="请先登录"/>
</c:redirect>
```

#### 5. 包含标签

```jsp
<!-- include 动态包含 -->
<c:import url="/header.jsp" charEncoding="UTF-8">
    <c:param name="title" value="首页"/>
</c:import>
```

#### 6. 设置和移除变量

```jsp
<!-- set 设置变量 -->
<c:set var="message" value="Hello World" scope="request"/>
<c:set var="user" value="${requestScope.user}" scope="session"/>

<!-- set 设置对象属性 -->
<c:set target="${user}" property="name" value="张三"/>

<!-- remove 移除变量 -->
<c:remove var="message" scope="request"/>
```

#### 7. 异常处理标签

```jsp
<!-- catch 捕获异常 -->
<c:catch var="exception">
    <%
        int result = 10 / 0;
    %>
</c:catch>

<c:if test="${not empty exception}">
    <p>发生错误: ${exception.message}</p>
</c:if>
```

### 5.3 格式化标签库(FMT)

```jsp
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<!-- 格式化日期 -->
<jsp:useBean id="now" class="java.util.Date"/>
<fmt:formatDate value="${now}" pattern="yyyy-MM-dd HH:mm:ss"/>

<!-- 格式化数字 -->
<fmt:formatNumber value="123456.789" pattern="#,##0.00"/>

<!-- 设置语言环境 -->
<fmt:setLocale value="zh_CN"/>

<!-- 设置时区 -->
<fmt:setTimeZone value="Asia/Shanghai"/>

<!-- 解析日期 -->
<fmt:parseDate value="2024-01-01" pattern="yyyy-MM-dd" var="date"/>

<!-- 解析数字 -->
<fmt:parseNumber value="1,234.56" var="number"/>
```

### 5.4 函数标签库(Functions)

```jsp
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>

<!-- 字符串长度 -->
<p>长度: ${fn:length(name)}</p>

<!-- 转换大小写 -->
<p>大写: ${fn:toUpperCase(name)}</p>
<p>小写: ${fn:toLowerCase(name)}</p>

<!-- 截取字符串 -->
<p>截取: ${fn:substring(name, 0, 5)}</p>

<!-- 替换字符串 -->
<p>替换: ${fn:replace(text, "old", "new")}</p>

<!-- 分割字符串 -->
<c:forEach items="${fn:split(names, ',')}" var="name">
    <p>${name}</p>
</c:forEach>

<!-- 查找子串 -->
<p>包含: ${fn:contains(text, "keyword")}</p>
<p>开始于: ${fn:startsWith(text, "prefix")}</p>
<p>结束于: ${fn:endsWith(text, "suffix")}</p>

<!-- 去除空格 -->
<p>去除两端空格: ${fn:trim(text)}</p>

<!-- 转义 XML -->
<p>${fn:escapeXml(htmlContent)}</p>
```

---

## 六、JSP 最佳实践

### 6.1 现代 JSP 推荐写法

#### √ 推荐的做法

```jsp
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<!DOCTYPE html>
<html>
<head>
    <title>用户列表</title>
</head>
<body>
    <h1>用户列表</h1>
    
    <!-- 使用 JSTL 标签,避免 Java 代码 -->
    <table>
        <c:forEach items="${users}" var="user" varStatus="status">
            <tr>
                <td>${status.index + 1}</td>
                <td>${user.name}</td>
                <td>${user.age}</td>
                <td>
                    <c:choose>
                        <c:when test="${user.age >= 18}">
                            成年
                        </c:when>
                        <c:otherwise>
                            未成年
                        </c:otherwise>
                    </c:choose>
                </td>
            </tr>
        </c:forEach>
    </table>
    
    <!-- 使用 EL 表达式 -->
    <p>总计: ${fn:length(users)} 个用户</p>
</body>
</html>
```

#### × 不推荐的做法

```jsp
<%@ page contentType="text/html;charset=UTF-8" %>

<!DOCTYPE html>
<html>
<head>
    <title>用户列表</title>
</head>
<body>
    <h1>用户列表</h1>
    
    <!-- × 在 JSP 中写大量 Java 代码 -->
    <table>
        <%
            List<User> users = (List<User>) request.getAttribute("users");
            for (int i = 0; i < users.size(); i++) {
                User user = users.get(i);
        %>
        <tr>
            <td><%= i + 1 %></td>
            <td><%= user.getName() %></td>
            <td><%= user.getAge() %></td>
            <td>
                <%
                    if (user.getAge() >= 18) {
                %>
                成年
                <%
                    } else {
                %>
                未成年
                <%
                    }
                %>
            </td>
        </tr>
        <%
            }
        %>
    </table>
</body>
</html>
```

### 6.2 JSP 开发规范

#### 1. 代码分离原则

```java
// √ 正确:业务逻辑在 Servlet/Controller 中处理
@WebServlet("/users")
public class UserServlet extends HttpServlet {
    protected void doGet(HttpServletRequest request, HttpServletResponse response) 
            throws ServletException, IOException {
        
        // 业务逻辑处理
        List<User> users = userService.getAllUsers();
        
        // 设置数据到 request
        request.setAttribute("users", users);
        
        // 转发到 JSP
        request.getRequestDispatcher("/WEB-INF/views/users.jsp").forward(request, response);
    }
}
```

```jsp
<!-- √ 正确:JSP 只负责显示 -->
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<table>
    <c:forEach items="${users}" var="user">
        <tr>
            <td>${user.name}</td>
            <td>${user.age}</td>
        </tr>
    </c:forEach>
</table>
```

#### 2. 页面布局规范

```jsp
<!-- layout.jsp - 布局模板 -->
<%@ page contentType="text/html;charset=UTF-8" %>

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${pageTitle}</title>
    <link rel="stylesheet" href="${pageContext.request.contextPath}/css/style.css">
</head>
<body>
    <!-- 页头 -->
    <%@ include file="header.jsp" %>
    
    <!-- 主内容区 -->
    <div class="main-content">
        <jsp:include page="${contentPage}"/>
    </div>
    
    <!-- 页脚 -->
    <%@ include file="footer.jsp" %>
    
    <script src="${pageContext.request.contextPath}/js/main.js"></script>
</body>
</html>
```

#### 3. 错误处理规范

```jsp
<!-- error.jsp - 错误处理页面 -->
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ page isErrorPage="true" %>

<!DOCTYPE html>
<html>
<head>
    <title>出错了</title>
</head>
<body>
    <h1>抱歉,系统出错了</h1>
    
    <!-- 生产环境隐藏详细错误信息 -->
    <c:if test="${not empty exception}">
        <p>错误信息: ${exception.message}</p>
        
        <!-- 开发环境显示堆栈跟踪 -->
        <c:if test="${applicationScope.env == 'dev'}">
            <pre><% exception.printStackTrace(new java.io.PrintWriter(out)); %></pre>
        </c:if>
    </c:if>
    
    <a href="javascript:history.back()">返回</a>
</body>
</html>
```

#### 4. 安全规范

```jsp
<%@ page contentType="text/html;charset=UTF-8" %>

<!-- 防止 XSS 攻击 -->
<!-- × 错误:直接输出用户输入 -->
<p>${param.comment}</p>

<!-- √ 正确:使用 fn:escapeXml 转义 -->
<p>${fn:escapeXml(param.comment)}</p>

<!-- √ 正确:使用 <c:out> 标签(默认转义) -->
<c:out value="${param.comment}"/>

<!-- 防止 SQL 注入 -->
<!-- × 错误:在 JSP 中拼接 SQL -->
<%
    String sql = "SELECT * FROM users WHERE name = '" + request.getParameter("name") + "'";
%>

<!-- √ 正确:在 Servlet/Service 层使用 PreparedStatement -->
```

### 6.3 性能优化建议

#### 1. 减少脚本片段

```jsp
<!-- × 错误:大量脚本片段影响性能 -->
<%
    for (int i = 0; i < 1000; i++) {
        out.println("<p>" + i + "</p>");
    }
%>

<!-- √ 正确:使用 JSTL 标签 -->
<c:forEach begin="1" end="1000" var="i">
    <p>${i}</p>
</c:forEach>
```

#### 2. 合理使用 include

```jsp
<!-- 静态包含:适合不变的页面片段 -->
<%@ include file="header.jsp" %>

<!-- 动态包含:适合动态内容 -->
<jsp:include page="advertisement.jsp"/>
```

#### 3. 控制 session 创建

```jsp
<!-- 不需要 session 的页面 -->
<%@ page session="false" %>

<!-- 避免不必要的 session 创建 -->
<%
    // × 错误:无条件自动创建 session
    HttpSession session = request.getSession();
%>

<%
    // √ 正确:只在需要时创建
    HttpSession session = request.getSession(false);
    if (session == null) {
        session = request.getSession();
    }
%>
```

---

## 七、常见误区与注意事项

### 7.1 误区一:JSP 过时就完全不用学

**错误认识**: JSP 已经过时,完全没有学习的必要。

**实际情况**:
1. 许多存量项目仍在使用 JSP
2. 理解 JSP 有助于学习服务端渲染原理
3. 面试中常用于说明技术演进过程
4. 维护老系统时需要 JSP 知识

**建议**:
- 了解 JSP 的核心原理和基本语法
- 掌握 EL 表达式和 JSTL 标签库
- 理解 JSP 与 Servlet 的关系
- 学习现代替代方案(Thymeleaf、前后端分离)

### 7.2 误区二:JSP 和 Servlet 是平行替代关系

**错误认识**: JSP 和 Servlet 是两种完全独立的技术,可以互相替代。

**实际情况**:
1. JSP 本质上会被编译为 Servlet 执行
2. JSP 是建立在 Servlet 技术之上的模板技术
3. 两者的关系是互补而非替代

**MVC 架构中的分工**:
```
┌─────────────────────────────────────┐
│         MVC 架构                     │
├─────────────────────────────────────┤
│ Model      │ JavaBean、Entity       │
│ View       │ JSP、Thymeleaf         │
│ Controller │ Servlet、Spring MVC    │
└─────────────────────────────────────┘
```

### 7.3 误区三:在 JSP 中直接写业务逻辑没问题

**错误认识**: 在 JSP 中可以直接写业务逻辑,方便快捷。

**实际情况**:
1. 违反 MVC 分层架构
2. 代码可读性差,难以维护
3. 无法进行单元测试
4. 前后端分工困难
5. 性能问题(每次请求都需要编译脚本片段)

**正确做法**:
```java
// Servlet/Controller 处理业务逻辑
@WebServlet("/user")
public class UserServlet extends HttpServlet {
    protected void doGet(HttpServletRequest request, HttpServletResponse response) {
        // 业务逻辑
        List<User> users = userService.getAllUsers();
        request.setAttribute("users", users);
        request.getRequestDispatcher("/WEB-INF/views/users.jsp").forward(request, response);
    }
}
```

```jsp
<!-- JSP 只负责显示 -->
<c:forEach items="${users}" var="user">
    <tr>
        <td>${user.name}</td>
        <td>${user.age}</td>
    </tr>
</c:forEach>
```

### 7.4 误区四:JSP 无法进行前后端分离

**错误认识**: 使用 JSP 就无法实现前后端分离。

**实际情况**:
1. JSP 可以返回 JSON 数据,支持前后端分离
2. 可以结合 AJAX 实现异步交互
3. JSP 作为视图层,可以与前端框架配合

**示例:JSP 返回 JSON**:
```jsp
<%@ page contentType="application/json;charset=UTF-8" %>
<%@ page import="com.google.gson.Gson" %>
<%
    List<User> users = userService.getAllUsers();
    Gson gson = new Gson();
    out.print(gson.toJson(users));
%>
```

### 7.5 误区五:EL 表达式和脚本片段完全等价

**错误认识**: EL 表达式 `${user.name}` 和脚本片段 `<%= user.getName() %>` 完全等价。

**实际情况**:
1. EL 表达式自动处理 null 值,不会抛出 NullPointerException
2. EL 表达式支持更简洁的语法
3. EL 表达式性能略低于直接的方法调用

**对比**:
```jsp
<!-- 脚本片段:可能抛出 NullPointerException -->
<%= user.getName() %>

<!-- EL 表达式:null 值安全 -->
${user.name}

<!-- 等价于 -->
<%
    if (user != null) {
        out.print(user.getName());
    } else {
        out.print("");
    }
%>
```

---

## 八、JSP 现代替代方案

### 8.1 Thymeleaf

**Thymeleaf** 是现代 Java 模板引擎,与 Spring Boot 集成良好。

**优点**:
- 自然模板:可以直接在浏览器中打开
- 与 Spring MVC 深度集成
- 支持布局、国际化等功能
- 语法更现代化

**示例**:
```html
<!-- Thymeleaf 模板 -->
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<head>
    <title>用户列表</title>
</head>
<body>
    <h1>用户列表</h1>
    
    <table>
        <tr th:each="user : ${users}">
            <td th:text="${user.name}"></td>
            <td th:text="${user.age}"></td>
        </tr>
    </table>
</body>
</html>
```

### 8.2 前后端分离(Vue/React + Spring Boot)

**前后端分离** 是当前主流架构,前端使用 Vue/React,后端提供 REST API。

**优点**:
- 前后端独立开发,提高效率
- 用户体验更好(单页应用)
- 易于扩展和维护
- 前端可以独立部署

**示例**:
```java
// Spring Boot Controller
@RestController
@RequestMapping("/api/users")
public class UserController {
    
    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }
}
```

```javascript
// Vue.js 前端
<template>
  <div>
    <h1>用户列表</h1>
    <ul>
      <li v-for="user in users" :key="user.id">
        {{ user.name }} - {{ user.age }}
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  data() {
    return {
      users: []
    }
  },
  mounted() {
    fetch('/api/users')
      .then(response => response.json())
      .then(data => {
        this.users = data;
      });
  }
}
</script>
```

### 8.3 技术选型建议

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| 新项目 | 前后端分离 | 用户体验好,易于维护和扩展 |
| 简单管理系统 | Spring Boot + Thymeleaf | 开发效率高,学习成本低 |
| 老项目维护 | JSP + JSTL | 保持技术栈一致,降低风险 |
| 内容型网站 | Spring Boot + Thymeleaf | SEO 友好,服务端渲染 |

---

## 九、面试要点

### 9.1 JSP 核心面试题

#### Q1:JSP 的本质是什么?为什么说 JSP 就是 Servlet?

**答案**:
1. JSP 本质上是一种模板技术,会被 Web 容器编译为 Servlet 执行
2. JSP 文件会被转换为 Java 源码,然后编译为 Servlet 类
3. 最终执行的是生成的 Servlet 的 `_jspService()` 方法
4. JSP 和 Servlet 不是平行替代关系,而是建立在 Servlet 之上的技术

#### Q2:JSP 有哪些隐式对象?各自的作用是什么?

**答案**:

| 隐式对象 | 类型 | 作用 |
|---------|------|------|
| request | HttpServletRequest | 获取请求参数和属性 |
| response | HttpServletResponse | 设置响应内容 |
| out | JspWriter | 输出内容到页面 |
| session | HttpSession | 管理会话数据 |
| application | ServletContext | 管理应用范围数据 |
| config | ServletConfig | 获取 Servlet 配置 |
| pageContext | PageContext | 提供页面范围的上下文 |
| page | Object | 当前 Servlet 实例 |
| exception | Throwable | 异常信息(错误页面) |

#### Q3:静态包含和动态包含有什么区别?

**答案**:

| 特性 | 静态包含 `<%@ include %>` | 动态包含 `<jsp:include>` |
|------|--------------------------|------------------------|
| 执行时机 | 编译时 | 运行时 |
| 原理 | 源码合并 | 请求转发 |
| 变量共享 | 共享同一个 request | 独立的 request |
| 性能 | 更高 | 较低 |
| 灵活性 | 较低 | 更高 |

#### Q4:EL 表达式有哪些优势?

**答案**:
1. 语法简洁,易于阅读
2. 自动类型转换
3. 空值安全处理(不会抛出 NullPointerException)
4. 支持运算符和函数
5. 避免在 JSP 中写 Java 代码

#### Q5:为什么现代项目不再推荐使用 JSP?

**答案**:
1. **前后端分离趋势**:前端框架(Vue/React)更强大
2. **维护成本高**:HTML 和 Java 混合,难以维护
3. **用户体验**:单页应用体验更好
4. **性能问题**:首次访问需要编译
5. **技术演进**:模板引擎(Thymeleaf)更现代化

---

## 十、总结

### 10.1 核心知识点总结

#### JSP 核心要点
1. **JSP 的本质**：JSP 会被编译为 Servlet 执行
2. **执行流程**：请求 → JSP 引擎 → 转换为 Servlet → 编译 → 执行
3. **核心语法**：指令、脚本元素、EL 表达式、JSTL 标签
4. **最佳实践**：避免在 JSP 中写业务逻辑,使用 EL 和 JSTL

#### EL 和 JSTL
1. **EL 表达式**：简化数据访问,自动处理 null 值
2. **JSTL 标签**：替代脚本片段,提高可读性
3. **核心标签库**：条件、循环、URL、包含等标签
4. **格式化标签**：日期、数字格式化

#### 现代替代方案
1. **Thymeleaf**：现代模板引擎,与 Spring Boot 集成良好
2. **前后端分离**：Vue/React + Spring Boot REST API
3. **技术选型**：根据项目需求选择合适的方案

### 10.2 学习路径建议

#### 初级阶段
1. 理解 JSP 的本质和执行流程
2. 掌握 JSP 基本语法(指令、脚本元素)
3. 学会使用隐式对象

#### 中级阶段
1. 掌握 EL 表达式和 JSTL 标签库
2. 理解 JSP 与 Servlet 的关系
3. 学会 MVC 架构设计

#### 高级阶段
1. 学习 JSP 性能优化
2. 理解 JSP 的生命周期
3. 学习现代替代方案(Thymeleaf、前后端分离)

### 10.3 实战理解题

#### 题目 1:实现用户登录功能

**要求**：使用 JSP + Servlet 实现用户登录,包括登录页面、登录处理、主页展示。

**提示**：
- 登录页面使用 JSP 展示表单
- Servlet 处理登录逻辑
- 使用 session 保存登录状态
- 主页根据登录状态显示不同内容

#### 题目 2:实现分页查询功能

**要求**：使用 JSP + JSTL 实现数据分页展示。

**提示**：
- 使用 `<c:forEach>` 遍历数据
- 使用 EL 表达式显示分页信息
- 实现上一页、下一页、跳转功能

#### 题目 3:JSP 性能优化

**要求**：分析一个包含大量脚本片段的 JSP 页面,进行优化。

**提示**：
- 将业务逻辑移到 Servlet
- 使用 JSTL 标签替代脚本片段
- 合理使用 include
- 控制 session 创建

---

## 参考资料

1. **官方文档**
   - [Java EE 7 Tutorial - JavaServer Pages Technology](https://docs.oracle.com/javaee/7/tutorial/jsps.htm)
   - [JSP 2.3 规范](https://download.oracle.com/otndocs/jcp/jsp-2_3-mrel-spec/)

2. **经典书籍**
   - 《Head First Servlets and JSP》- Bryan Basham
   - 《Java Web 开发实战经典》- 李刚

3. **开源项目**
   - [Apache Tomcat](https://github.com/apache/tomcat)：JSP 引擎实现
   - [JSTL 实现](https://github.com/eclipse-ee4j/jstl-api)：JSTL 标准标签库

---

**最后更新**：2026-03-29  
**维护人**：AI 助手

## 版本差异(JSP 时代 → 当前)

| 特性 | 旧版（JSP 时代） | 当前 |
|------|------------------|------|
| 视图技术 | JSP（javax.servlet.jsp） | 新项目推荐 Thymeleaf/前后端分离（Vue/React） |
| 包名 | javax.servlet.jsp.* | jakarta.servlet.jsp.*（Tomcat 10+） |
| 弃用状态 | JSP 仍可用 | Oracle 已将其列入可移除技术（JEP 尚未执行），不推荐新项目使用 |
| 维护场景 | 老系统 JSP 页面 | Spring Boot 3 已不再默认支持 JSP，需额外配置 |

> JSP 作为历史技术，理解其原理有助于维护遗留系统；新项目不建议使用 JSP，Spring Boot 3.5.x 推荐 Thymeleaf 或前后端分离架构。
