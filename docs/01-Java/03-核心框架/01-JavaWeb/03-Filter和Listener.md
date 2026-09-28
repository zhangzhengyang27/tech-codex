---
title: "Filter和Listener"
description: "Filter(过滤器) 是 JavaWeb 的三大组件之一,用于对请求和响应进行拦截处理。"
keywords: []
category: "Java"
tags: [Java, JavaWeb]
---


# Filter 和 Listener 完全指南

## 一、Filter 过滤器概述

### 1.1 Filter 的概念

**Filter(过滤器)** 是 JavaWeb 的三大组件之一,用于对请求和响应进行拦截处理。

#### Filter 的作用

1. **请求拦截:** 在请求到达目标资源前进行预处理
2. **响应拦截:** 在响应返回客户端前进行后处理
3. **统一处理:** 对多个请求进行统一处理(编码、权限等)
4. **解耦:** 将通用功能从 Servlet 中分离出来

#### Filter 与 Servlet 的关系

```
客户端请求
    ↓
┌─────────────────┐
│  Filter 链      │ ← 第一道防线
│  - Filter A     │
│  - Filter B     │
│  - Filter C     │
└─────────────────┘
    ↓
┌─────────────────┐
│  Servlet        │ ← 目标资源
└─────────────────┘
    ↓
┌─────────────────┐
│  Filter 链(返回) │ ← 响应拦截
└─────────────────┘
    ↓
客户端响应
```

### 1.2 Filter 体系结构

```
         Filter 接口
              ↑
              │ 实现
              │
        自定义 Filter 类
```

> 说明:与 Servlet 不同,Servlet 规范并没有为 Filter 提供类似 `GenericServlet` 的适配器抽象类,自定义 Filter 直接实现 `Filter` 接口即可(部分框架提供了自己的抽象实现,如 Spring 的 `OncePerRequestFilter`)。

## 二、Filter 开发详解

### 2.1 Filter 接口

`javax.servlet.Filter` 接口定义了过滤器的核心方法:

| 方法 | 说明 | 调用时机 |
|------|------|----------|
| `void init(FilterConfig filterConfig)` | 初始化方法 | Filter 创建时调用一次 |
| `void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)` | 过滤方法 | 每次请求调用 |
| `void destroy()` | 销毁方法 | Filter 销毁时调用一次 |

### 2.2 Filter 生命周期

```
┌─────────────┐
│  加载类     │
└──────┬──────┘
       ↓
┌─────────────┐
│  实例化     │ 调用构造方法
└──────┬──────┘
       ↓
┌─────────────┐
│  初始化     │ 调用 init() 方法
└──────┬──────┘
       ↓
┌─────────────┐
│  过滤       │ 调用 doFilter() 方法(多次)
└──────┬──────┘
       ↓
┌─────────────┐
│  销毁       │ 调用 destroy() 方法
└─────────────┘
```

### 2.3 第一个 Filter

#### 方式一: 实现 Filter 接口

```java
package com.xiaoye.filter;

import javax.servlet.*;
import java.io.IOException;

public class HelloFilter implements Filter {
    
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        System.out.println("Filter 初始化");
    }
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) 
            throws IOException, ServletException {
        
        System.out.println("Filter 拦截请求");
        
        // 放行,执行下一个 Filter 或目标资源
        chain.doFilter(request, response);
        
        System.out.println("Filter 拦截响应");
    }
    
    @Override
    public void destroy() {
        System.out.println("Filter 销毁");
    }
}
```

#### 方式二: 使用注解配置(Servlet 3.0+)

```java
package com.xiaoye.filter;

import javax.servlet.*;
import javax.servlet.annotation.WebFilter;
import java.io.IOException;

@WebFilter(
    filterName = "helloFilter",
    urlPatterns = "/*",
    initParams = {
        @WebInitParam(name = "encoding", value = "UTF-8")
    }
)
public class HelloFilter implements Filter {
    
    private String encoding;
    
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        encoding = filterConfig.getInitParameter("encoding");
        System.out.println("编码: " + encoding);
    }
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) 
            throws IOException, ServletException {
        
        request.setCharacterEncoding(encoding);
        response.setCharacterEncoding(encoding);
        
        chain.doFilter(request, response);
    }
    
    @Override
    public void destroy() {
        System.out.println("Filter 销毁");
    }
}
```

#### 方式三: web.xml 配置

```xml
<filter>
    <filter-name>helloFilter</filter-name>
    <filter-class>com.xiaoye.filter.HelloFilter</filter-class>
    <init-param>
        <param-name>encoding</param-name>
        <param-value>UTF-8</param-value>
    </init-param>
</filter>

<filter-mapping>
    <filter-name>helloFilter</filter-name>
    <url-pattern>/*</url-pattern>
</filter-mapping>
```

## 三、Filter 配置详解

### 3.1 URL 匹配规则

#### 精确匹配

```java
@WebFilter("/user/list")        // 匹配 /user/list
@WebFilter("/user/detail")      // 匹配 /user/detail
```

#### 目录匹配

```java
@WebFilter("/user/*")           // 匹配 /user/ 下所有路径
@WebFilter("/admin/*")          // 匹配 /admin/ 下所有路径
```

#### 扩展名匹配

```java
@WebFilter("*.do")              // 匹配所有 .do 结尾的请求
@WebFilter("*.action")          // 匹配所有 .action 结尾的请求
@WebFilter("*.jsp")             // 匹配所有 .jsp 请求
```

#### 匹配所有

```java
@WebFilter("/*")                // 匹配所有请求
@WebFilter(urlPatterns = {"/*"}) // 等价写法
```

### 3.2 dispatcher 配置

Filter 可以拦截不同的请求类型:

```java
@WebFilter(
    urlPatterns = "/*",
    dispatcherTypes = {
        DispatcherType.REQUEST,   // 默认,拦截直接请求
        DispatcherType.FORWARD,   // 拦截转发请求
        DispatcherType.INCLUDE,   // 拦截包含请求
        DispatcherType.ERROR,     // 拦截错误页面
        DispatcherType.ASYNC      // 拦截异步请求
    }
)
public class MyFilter implements Filter {
    // ...
}
```

**web.xml 配置:**

```xml
<filter-mapping>
    <filter-name>myFilter</filter-name>
    <url-pattern>/*</url-pattern>
    <dispatcher>REQUEST</dispatcher>
    <dispatcher>FORWARD</dispatcher>
    <dispatcher>ERROR</dispatcher>
</filter-mapping>
```

### 3.3 Filter 执行顺序

#### 注解配置的顺序

```java
// 按类名字母顺序执行
@WebFilter("/*")
public class AFilter implements Filter { }  // 第一个执行

@WebFilter("/*")
public class BFilter implements Filter { }  // 第二个执行

@WebFilter("/*")
public class CFilter implements Filter { }  // 第三个执行
```

#### web.xml 配置的顺序

```xml
<!-- 按照 filter-mapping 的顺序执行 -->
<filter-mapping>
    <filter-name>filterA</filter-name>  <!-- 第一个执行 -->
    <url-pattern>/*</url-pattern>
</filter-mapping>

<filter-mapping>
    <filter-name>filterB</filter-name>  <!-- 第二个执行 -->
    <url-pattern>/*</url-pattern>
</filter-mapping>

<filter-mapping>
    <filter-name>filterC</filter-name>  <!-- 第三个执行 -->
    <url-pattern>/*</url-pattern>
</filter-mapping>
```

:::: warning 重要提示
- 注解配置的 Filter 执行顺序不确定(按类名排序)
- 建议使用 web.xml 配置来明确控制执行顺序
- Filter 链的执行顺序:先进后出(栈结构),请求按 A→B→C 穿过,响应按 C→B→A 逆序返回
::::

## 四、Filter 常见应用场景

### 4.1 字符编码过滤器

```java
@WebFilter("/*")
public class EncodingFilter implements Filter {
    
    private String encoding = "UTF-8";
    
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        String configEncoding = filterConfig.getInitParameter("encoding");
        if (configEncoding != null) {
            encoding = configEncoding;
        }
    }
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) 
            throws IOException, ServletException {
        
        // 设置请求编码
        request.setCharacterEncoding(encoding);
        
        // 设置响应编码
        response.setCharacterEncoding(encoding);
        response.setContentType("text/html;charset=" + encoding);
        
        chain.doFilter(request, response);
    }
    
    @Override
    public void destroy() {
    }
}
```

### 4.2 登录验证过滤器

```java
@WebFilter(urlPatterns = {"/user/*", "/admin/*"})
public class LoginFilter implements Filter {
    
    // 不需要拦截的路径
    private static final Set<String> ALLOWED_PATHS = new HashSet<>(Arrays.asList(
        "/user/login", "/user/register", "/user/logout"
    ));
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) 
            throws IOException, ServletException {
        
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;
        
        // 获取请求路径
        String path = req.getRequestURI().substring(req.getContextPath().length());
        
        // 判断是否需要拦截
        if (ALLOWED_PATHS.contains(path)) {
            chain.doFilter(request, response);
            return;
        }
        
        // 检查登录状态
        HttpSession session = req.getSession(false);
        if (session == null || session.getAttribute("user") == null) {
            // 未登录,重定向到登录页
            resp.sendRedirect(req.getContextPath() + "/user/login");
            return;
        }
        
        // 已登录,放行
        chain.doFilter(request, response);
    }
}
```

### 4.3 权限验证过滤器

```java
@WebFilter("/admin/*")
public class PermissionFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) 
            throws IOException, ServletException {
        
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;
        
        HttpSession session = req.getSession(false);
        
        if (session != null) {
            User user = (User) session.getAttribute("user");
            
            // 检查是否是管理员
            if (user != null && "ADMIN".equals(user.getRole())) {
                chain.doFilter(request, response);
                return;
            }
        }
        
        // 权限不足
        resp.sendError(403, "权限不足");
    }
}
```

### 4.4 日志记录过滤器

```java
@WebFilter("/*")
public class LogFilter implements Filter {
    
    private static final Logger logger = Logger.getLogger(LogFilter.class.getName());
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) 
            throws IOException, ServletException {
        
        HttpServletRequest req = (HttpServletRequest) request;
        
        // 记录请求信息
        String method = req.getMethod();
        String uri = req.getRequestURI();
        String ip = req.getRemoteAddr();
        long startTime = System.currentTimeMillis();
        
        logger.info(String.format("请求开始 - %s %s from %s", method, uri, ip));
        
        try {
            chain.doFilter(request, response);
        } catch (Exception e) {
            logger.severe("请求异常: " + e.getMessage());
            throw e;
        } finally {
            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;
            
            logger.info(String.format("请求完成 - %s %s 耗时 %d ms", 
                                     method, uri, duration));
        }
    }
}
```

### 4.5 XSS 防护过滤器

```java
@WebFilter("/*")
public class XSSFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) 
            throws IOException, ServletException {
        
        // 使用包装类过滤参数
        XSSRequestWrapper wrappedRequest = new XSSRequestWrapper(
            (HttpServletRequest) request
        );
        
        chain.doFilter(wrappedRequest, response);
    }
}

// 请求包装类
public class XSSRequestWrapper extends HttpServletRequestWrapper {
    
    public XSSRequestWrapper(HttpServletRequest request) {
        super(request);
    }
    
    @Override
    public String getParameter(String name) {
        String value = super.getParameter(name);
        return stripXSS(value);
    }
    
    @Override
    public String[] getParameterValues(String name) {
        String[] values = super.getParameterValues(name);
        if (values == null) {
            return null;
        }
        
        String[] cleanValues = new String[values.length];
        for (int i = 0; i < values.length; i++) {
            cleanValues[i] = stripXSS(values[i]);
        }
        return cleanValues;
    }
    
    private String stripXSS(String value) {
        if (value == null) {
            return null;
        }
        
        // 移除危险字符
        value = value.replaceAll("<", "&lt;")
                     .replaceAll(">", "&gt;")
                     .replaceAll("\"", "&quot;")
                     .replaceAll("'", "&#x27;")
                     .replaceAll("/", "&#x2F;");
        
        return value;
    }
}
```

### 4.6 GZIP 压缩过滤器

```java
@WebFilter(urlPatterns = "/*")
public class GZIPFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) 
            throws IOException, ServletException {
        
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;
        
        // 检查浏览器是否支持 GZIP
        String acceptEncoding = req.getHeader("Accept-Encoding");
        
        if (acceptEncoding != null && acceptEncoding.contains("gzip")) {
            // 使用 GZIP 响应
            resp.setHeader("Content-Encoding", "gzip");
            
            GZIPResponseWrapper wrappedResponse = new GZIPResponseWrapper(resp);
            
            try {
                chain.doFilter(request, wrappedResponse);
            } finally {
                wrappedResponse.finish();
            }
        } else {
            // 不支持 GZIP,直接响应
            chain.doFilter(request, response);
        }
    }
}
```

### 4.7 跨域请求过滤器

```java
@WebFilter("/*")
public class CORSFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) 
            throws IOException, ServletException {
        
        HttpServletRequest req = (HttpServletRequest) request;
        HttpServletResponse resp = (HttpServletResponse) response;
        
        // 允许的域名
        resp.setHeader("Access-Control-Allow-Origin", "*");
        
        // 允许的方法
        resp.setHeader("Access-Control-Allow-Methods", 
                      "GET, POST, PUT, DELETE, OPTIONS");
        
        // 允许的头
        resp.setHeader("Access-Control-Allow-Headers", 
                      "Content-Type, Authorization");
        
        // 预检请求缓存时间(秒)
        resp.setHeader("Access-Control-Max-Age", "3600");
        
        // 预检请求直接返回
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            resp.setStatus(HttpServletResponse.SC_OK);
            return;
        }
        
        chain.doFilter(request, response);
    }
}
```

### 4.8 防重复提交过滤器

```java
@WebFilter("/*")
public class RepeatSubmitFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) 
            throws IOException, ServletException {
        
        HttpServletRequest req = (HttpServletRequest) request;
        
        // 只拦截 POST 请求
        if (!"POST".equalsIgnoreCase(req.getMethod())) {
            chain.doFilter(request, response);
            return;
        }
        
        // 生成请求唯一标识
        String token = req.getParameter("token");
        HttpSession session = req.getSession(false);
        
        if (token != null && session != null) {
            String sessionToken = (String) session.getAttribute("token");
            
            // 比对 token
            if (token.equals(sessionToken)) {
                // 删除 token,防止重复提交
                session.removeAttribute("token");
                chain.doFilter(request, response);
                return;
            }
        }
        
        // token 不匹配,可能是重复提交
        ((HttpServletResponse) response).sendError(400, "请勿重复提交");
    }
}
```

## 五、Filter 高级应用

### 5.1 Filter 链

多个 Filter 形成链式调用:

```java
@WebFilter("/*")
public class AFilter implements Filter {
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        System.out.println("A-请求前");
        chain.doFilter(request, response);
        System.out.println("A-响应后");
    }
}

@WebFilter("/*")
public class BFilter implements Filter {
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) throws IOException, ServletException {
        System.out.println("B-请求前");
        chain.doFilter(request, response);
        System.out.println("B-响应后");
    }
}

// 输出顺序:
// A-请求前
// B-请求前
// 目标资源执行
// B-响应后
// A-响应后
```

### 5.2 动态注册 Filter

```java
@WebListener
public class DynamicFilterListener implements ServletContextListener {
    
    @Override
    public void contextInitialized(ServletContextEvent sce) {
        ServletContext context = sce.getServletContext();
        
        FilterRegistration.Dynamic filter = context.addFilter(
            "dynamicFilter",
            new Filter() {
                @Override
                public void doFilter(ServletRequest request, ServletResponse response, 
                                   FilterChain chain) 
                        throws IOException, ServletException {
                    System.out.println("动态注册的 Filter");
                    chain.doFilter(request, response);
                }
            }
        );
        
        filter.addMappingForUrlPatterns(
            EnumSet.of(DispatcherType.REQUEST), 
            true, 
            "/*"
        );
    }
}
```

### 5.3 使用方式示例

自定义类实现 Filter 接口并重写 doFilter 方法：

```java
package com.xiaoye.Login;

import javax.servlet.*;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.io.IOException;

public class LoginFilter implements Filter {
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {

    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        // 1.实现对用户访问主页面的过滤操作，也就是只有用户登录后才能访问主页面，否则一律拦截
        // 判断session中是否已有用户名信息，若没有则进行拦截，否则放行
        System.out.println("进入拦截器");
        HttpServletRequest httpServletRequest = (HttpServletRequest)servletRequest;
        HttpSession session = httpServletRequest.getSession();

        Object userName = session.getAttribute("userName");
        // 获取Servlet的请求路径
        String servletPath = httpServletRequest.getServletPath();

        if (null == userName && !servletPath.contains("login")) {
            servletRequest.getRequestDispatcher("login.jsp").forward(servletRequest, servletResponse);
        } else {
            // 若已经登录，则放行
            filterChain.doFilter(servletRequest, servletResponse);
        }
    }

    @Override
    public void destroy() {

    }
}
```

在 web.xml 文件中配置过滤器：

```xml
<filter>
  <filter-name>LoginFilter</filter-name>
  <filter-class>com.xiaoye.Login.LoginFilter</filter-class>
</filter>
<filter-mapping>
  <filter-name>LoginFilter</filter-name>
  <url-pattern>/main.jsp</url-pattern>
</filter-mapping>
```

### 5.4 Filter 接口与 FilterConfig 接口

`javax.servlet.Filter` 接口主要用于描述过滤器对象，可以对资源的请求和资源的响应操作进行筛选操作：

| 声明方法                                                     | 功能介绍               |
| ------------------------------------------------------------ | ---------------------- |
| void init(FilterConfig filterConfig)                         | 实现过滤器的初始化操作 |
| void doFilter(ServletRequest request, ServletResponse response,FilterChain chain) | 执行过滤操作的功能     |
| void destroy()                                               | 实现过滤器的销毁操作   |

`javax.servlet.FilterConfig` 接口主要用于描述过滤器的配置信息：

| 方法声明                             | 功能介绍                 |
| ------------------------------------ | ------------------------ |
| String getFilterName()               | 获取过滤器的名字         |
| String getInitParameter(String name) | 获取指定的初始化参数信息 |
| Enumeration getInitParameterNames()  | 获取所有的初始化参数名称 |
| ServletContext getServletContext()   | 获取 ServletContext 对象 |

```java
package com.xiaoye.filter;

import javax.servlet.*;
import java.io.IOException;
import java.util.Enumeration;

public class LifeFilter implements Filter {
    public LifeFilter() {
        System.out.println("构造方法执行！");
    }

    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        System.out.println("获取到的过滤器名称为：" + filterConfig.getFilterName());
        String userName = filterConfig.getInitParameter("userName");
        System.out.println("获取到指定初始化参数的数值为：" + userName);  // admin
        Enumeration<String> initParameterNames = filterConfig.getInitParameterNames();
        while (initParameterNames.hasMoreElements()) {
            // userName password
            System.out.println("获取到的初始化参数名为：" + initParameterNames.nextElement());
        }
        ServletContext servletContext = filterConfig.getServletContext();
        System.out.println("获取到的上下文对象是：" + servletContext);
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        System.out.println("阻拦一切不合理的访问哦！");
        filterChain.doFilter(servletRequest, servletResponse);
    }

    @Override
    public void destroy() {
        System.out.println("销毁操作执行完毕了！");
    }
}
```

在 web.xml 中配置 filter：

```xml
<filter>
    <filter-name>LifeFilter</filter-name>
    <filter-class>com.xiaoye.filter.LifeFilter</filter-class>
    <init-param>
       <param-name>userName</param-name>
       <param-value>admin</param-value>
     </init-param>
     <init-param>
        <param-name>password</param-name>
        <param-value>123456</param-value>
     </init-param>
</filter>
<filter-mapping>
      <filter-name>LifeFilter</filter-name>
      <url-pattern>*.html</url-pattern>
</filter-mapping>
```

Filter 的构造方法和 init() 先执行，请求到达时再执行 doFilter() 方法。

### 5.5 多个过滤器的使用

如果有多个过滤器都满足过滤的条件，则容器依据映射的先后顺序来调用各个过滤器：

```java
package com.web6.demo02;

import javax.servlet.*;
import java.io.IOException;

public class AFilter implements Filter {
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {

    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        System.out.println("这是第一道防线！");
        filterChain.doFilter(servletRequest, servletResponse);
        System.out.println("第一道防线返回！");
    }

    @Override
    public void destroy() {

    }
}
```

```java
package com.web6.demo02;

import javax.servlet.*;
import java.io.IOException;

public class BFilter implements Filter {
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {

    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        System.out.println("这是第二道防线！");
        filterChain.doFilter(servletRequest, servletResponse);
        System.out.println("第二道防线返回！");
    }

    @Override
    public void destroy() {

    }
}
```

```xml
<filter>
  <filter-name>AFilter</filter-name>
  <filter-class>com.web6.demo02.AFilter</filter-class>
</filter>
<filter-mapping>
  <filter-name>AFilter</filter-name>
  <url-pattern>*.avi</url-pattern>
</filter-mapping>
<filter>
  <filter-name>BFilter</filter-name>
  <filter-class>com.web6.demo02.BFilter</filter-class>
</filter>
<filter-mapping>
  <filter-name>BFilter</filter-name>
  <url-pattern>*.avi</url-pattern>
</filter-mapping>
```

### 5.6 过滤器优点

- 实现代码的"可插拔性"，即增加或减少某个功能模块，不会影响程序的正常执行

- 可以将多个相同处理逻辑的模块集中写在过滤器里面，可实现重复利用、也方便代码的维护

## 六、Listener 监听器概述

### 6.1 Listener 的概念

**Listener(监听器)** 是 JavaWeb 的三大组件之一,用于监听 Servlet 容器产生的事件并进行相应处理。

#### Listener 的作用

1. **生命周期监听:** 监听对象的创建和销毁
2. **属性变化监听:** 监听属性的添加、修改、删除
3. **会话监听:** 监听会话的状态变化
4. **业务解耦:** 将通用逻辑从 Servlet 中分离

Listener 是 Servlet 规范中定义的一种特殊的组件，用来监听 Servlet 容器产生的事件并进行相应的处理。容器产生的事件分类如下：

- 生命周期相关的事件
- 属性状态相关的事件
- 存值状态相关的事件

底层原理是采用接口回调的方式实现。

### 6.2 Listener 分类

| 监听器类型 | 监听对象 | 接口 |
|-----------|---------|------|
| ServletContext 生命周期 | application 域 | ServletContextListener |
| ServletContext 属性变化 | application 域属性 | ServletContextAttributeListener |
| HttpSession 生命周期 | session 域 | HttpSessionListener |
| HttpSession 属性变化 | session 域属性 | HttpSessionAttributeListener |
| HttpSession 绑定 | session 域对象绑定 | HttpSessionBindingListener |
| HttpSession 钝化活化 | session 持久化 | HttpSessionActivationListener |
| ServletRequest 生命周期 | request 域 | ServletRequestListener |
| ServletRequest 属性变化 | request 域属性 | ServletRequestAttributeListener |

## 七、Listener 开发详解

### 7.1 ServletContextListener

**用途:** 监听 Web 应用的启动和关闭,执行初始化和清理操作。

```java
@WebListener
public class MyContextListener implements ServletContextListener {
    
    @Override
    public void contextInitialized(ServletContextEvent sce) {
        // Web 应用启动时执行
        System.out.println("Web 应用启动");
        
        // 加载配置文件
        ServletContext context = sce.getServletContext();
        String configPath = context.getInitParameter("configPath");
        
        // 初始化数据库连接池
        DataSource dataSource = createDataSource();
        context.setAttribute("dataSource", dataSource);
        
        // 加载系统配置
        Properties config = loadConfig(configPath);
        context.setAttribute("config", config);
    }
    
    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        // Web 应用关闭时执行
        System.out.println("Web 应用关闭");
        
        // 清理资源
        ServletContext context = sce.getServletContext();
        DataSource dataSource = (DataSource) context.getAttribute("dataSource");
        
        if (dataSource instanceof AutoCloseable) {
            try {
                ((AutoCloseable) dataSource).close();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }
    }
    
    private DataSource createDataSource() {
        // 创建数据源
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl("jdbc:mysql://localhost:3306/mydb");
        config.setUsername("root");
        config.setPassword("123456");
        return new HikariDataSource(config);
    }
    
    private Properties loadConfig(String path) {
        // 加载配置文件
        Properties props = new Properties();
        try {
            props.load(new FileInputStream(path));
        } catch (IOException e) {
            e.printStackTrace();
        }
        return props;
    }
}
```

### 7.2 ServletContextAttributeListener

**用途:** 监听 application 域属性的变化。

```java
@WebListener
public class MyContextAttributeListener implements ServletContextAttributeListener {
    
    @Override
    public void attributeAdded(ServletContextAttributeEvent event) {
        System.out.println("添加属性: " + event.getName() + " = " + event.getValue());
    }
    
    @Override
    public void attributeRemoved(ServletContextAttributeEvent event) {
        System.out.println("删除属性: " + event.getName());
    }
    
    @Override
    public void attributeReplaced(ServletContextAttributeEvent event) {
        System.out.println("修改属性: " + event.getName() + 
                          " 旧值: " + event.getValue());
    }
}
```

### 7.3 HttpSessionListener

**用途:** 监听 session 的创建和销毁,统计在线用户。

```java
@WebListener
public class OnlineUserListener implements HttpSessionListener {
    
    private static int onlineCount = 0;
    
    @Override
    public void sessionCreated(HttpSessionEvent se) {
        // Session 创建
        onlineCount++;
        System.out.println("新用户上线,当前在线: " + onlineCount);
        
        // 存储到 application 域
        ServletContext context = se.getSession().getServletContext();
        context.setAttribute("onlineCount", onlineCount);
    }
    
    @Override
    public void sessionDestroyed(HttpSessionEvent se) {
        // Session 销毁
        onlineCount--;
        System.out.println("用户下线,当前在线: " + onlineCount);
        
        // 更新 application 域
        ServletContext context = se.getSession().getServletContext();
        context.setAttribute("onlineCount", onlineCount);
    }
    
    public static int getOnlineCount() {
        return onlineCount;
    }
}
```

### 7.4 HttpSessionAttributeListener

**用途:** 监听 session 域属性的变化。

```java
@WebListener
public class MySessionAttributeListener implements HttpSessionAttributeListener {
    
    @Override
    public void attributeAdded(HttpSessionBindingEvent event) {
        System.out.println("Session 添加属性: " + event.getName() + 
                          " = " + event.getValue());
    }
    
    @Override
    public void attributeRemoved(HttpSessionBindingEvent event) {
        System.out.println("Session 删除属性: " + event.getName());
    }
    
    @Override
    public void attributeReplaced(HttpSessionBindingEvent event) {
        System.out.println("Session 修改属性: " + event.getName());
    }
}
```

### 7.5 HttpSessionBindingListener

**用途:** 监听对象与 session 的绑定和解除绑定。

**特点:** 不需要在 web.xml 配置,实体类实现接口即可。

```java
public class User implements HttpSessionBindingListener {
    
    private Integer id;
    private String username;
    
    public User() {}
    
    public User(Integer id, String username) {
        this.id = id;
        this.username = username;
    }
    
    // getter 和 setter...
    
    @Override
    public void valueBound(HttpSessionBindingEvent event) {
        // 对象被绑定到 session
        System.out.println("用户 " + username + " 登录系统");
        
        // 记录登录日志
        logLogin(username);
    }
    
    @Override
    public void valueUnbound(HttpSessionBindingEvent event) {
        // 对象从 session 解除绑定
        System.out.println("用户 " + username + " 退出系统");
        
        // 记录退出日志
        logLogout(username);
    }
    
    private void logLogin(String username) {
        // 记录登录日志
        System.out.println("记录登录日志: " + username);
    }
    
    private void logLogout(String username) {
        // 记录退出日志
        System.out.println("记录退出日志: " + username);
    }
}
```

**使用:**

```java
@WebServlet("/login")
public class LoginServlet extends HttpServlet {
    
    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        String username = req.getParameter("username");
        String password = req.getParameter("password");
        
        // 验证登录
        if (validUser(username, password)) {
            User user = new User(1, username);
            
            // 绑定到 session,触发 valueBound
            req.getSession().setAttribute("user", user);
            
            resp.sendRedirect("index.jsp");
        }
    }
}

@WebServlet("/logout")
public class LogoutServlet extends HttpServlet {
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        // 移除 session 属性,触发 valueUnbound
        req.getSession().removeAttribute("user");
        
        // 销毁 session
        req.getSession().invalidate();
        
        resp.sendRedirect("login.jsp");
    }
}
```

### 7.6 HttpSessionActivationListener

**用途:** 监听 session 的钝化和活化。

**钝化:** 将 session 持久化到磁盘
**活化:** 将 session 从磁盘加载到内存

```java
public class User implements Serializable, HttpSessionActivationListener {
    
    private Integer id;
    private String username;
    
    // getter 和 setter...
    
    @Override
    public void sessionWillPassivate(HttpSessionEvent se) {
        // session 即将钝化
        System.out.println("用户 " + username + " 即将钝化");
    }
    
    @Override
    public void sessionDidActivate(HttpSessionEvent se) {
        // session 已活化
        System.out.println("用户 " + username + " 已活化");
    }
}
```

**配置 session 钝化(Tomcat):**

```xml
<!-- context.xml -->
<Context>
    <Manager className="org.apache.catalina.session.PersistentManager"
             saveOnRestart="true">
        <Store className="org.apache.catalina.session.FileStore"
               directory="sessions"/>
    </Manager>
</Context>
```

### 7.7 ServletRequestListener

**用途:** 监听 request 的创建和销毁。

```java
@WebListener
public class MyRequestListener implements ServletRequestListener {
    
    @Override
    public void requestInitialized(ServletRequestEvent sre) {
        // Request 创建
        HttpServletRequest req = (HttpServletRequest) sre.getServletRequest();
        
        System.out.println("请求开始: " + req.getRequestURI());
        
        // 记录请求开始时间
        req.setAttribute("startTime", System.currentTimeMillis());
    }
    
    @Override
    public void requestDestroyed(ServletRequestEvent sre) {
        // Request 销毁
        HttpServletRequest req = (HttpServletRequest) sre.getServletRequest();
        
        Long startTime = (Long) req.getAttribute("startTime");
        long duration = System.currentTimeMillis() - startTime;
        
        System.out.println("请求结束: " + req.getRequestURI() + 
                          " 耗时: " + duration + " ms");
    }
}
```

### 7.8 ServletRequestAttributeListener

**用途:** 监听 request 域属性的变化。

```java
@WebListener
public class MyRequestAttributeListener implements ServletRequestAttributeListener {
    
    @Override
    public void attributeAdded(ServletRequestAttributeEvent srae) {
        System.out.println("Request 添加属性: " + srae.getName() + 
                          " = " + srae.getValue());
    }
    
    @Override
    public void attributeRemoved(ServletRequestAttributeEvent srae) {
        System.out.println("Request 删除属性: " + srae.getName());
    }
    
    @Override
    public void attributeReplaced(ServletRequestAttributeEvent srae) {
        System.out.println("Request 修改属性: " + srae.getName());
    }
}
```

## 八、Listener 实战案例

### 案例1: 初始化框架配置

```java
@WebListener
public class FrameworkInitializer implements ServletContextListener {
    
    @Override
    public void contextInitialized(ServletContextEvent sce) {
        ServletContext context = sce.getServletContext();
        
        // 1. 加载配置文件
        String configLocation = context.getInitParameter("contextConfigLocation");
        ApplicationContext applicationContext = 
            new ClassPathXmlApplicationContext(configLocation);
        context.setAttribute("applicationContext", applicationContext);
        
        // 2. 初始化数据库连接池
        DataSource dataSource = (DataSource) applicationContext.getBean("dataSource");
        context.setAttribute("dataSource", dataSource);
        
        // 3. 初始化缓存
        CacheManager cacheManager = (CacheManager) applicationContext.getBean("cacheManager");
        context.setAttribute("cacheManager", cacheManager);
        
        // 4. 初始化定时任务
        Scheduler scheduler = (Scheduler) applicationContext.getBean("scheduler");
        try {
            scheduler.start();
        } catch (SchedulerException e) {
            e.printStackTrace();
        }
        
        System.out.println("框架初始化完成");
    }
    
    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        ServletContext context = sce.getServletContext();
        
        // 关闭定时任务
        Scheduler scheduler = (Scheduler) context.getAttribute("scheduler");
        try {
            scheduler.shutdown();
        } catch (SchedulerException e) {
            e.printStackTrace();
        }
        
        // 关闭 Spring 容器
        ApplicationContext applicationContext = 
            (ApplicationContext) context.getAttribute("applicationContext");
        if (applicationContext instanceof ConfigurableApplicationContext) {
            ((ConfigurableApplicationContext) applicationContext).close();
        }
        
        System.out.println("框架资源释放完成");
    }
}
```

### 案例2: 在线用户统计

```java
@WebListener
public class OnlineUserStatistics implements HttpSessionListener, 
                                              ServletContextListener {
    
    private ServletContext context;
    
    @Override
    public void contextInitialized(ServletContextEvent sce) {
        context = sce.getServletContext();
        
        // 初始化在线用户列表
        List<String> onlineUsers = new CopyOnWriteArrayList<>();
        context.setAttribute("onlineUsers", onlineUsers);
        
        // 初始化在线用户数
        context.setAttribute("onlineCount", 0);
    }
    
    @Override
    public void sessionCreated(HttpSessionEvent se) {
        // 在线用户数 +1
        Integer count = (Integer) context.getAttribute("onlineCount");
        context.setAttribute("onlineCount", count + 1);
        
        System.out.println("当前在线用户数: " + (count + 1));
    }
    
    @Override
    public void sessionDestroyed(HttpSessionEvent se) {
        // 移除用户
        String username = (String) se.getSession().getAttribute("username");
        if (username != null) {
            List<String> onlineUsers = (List<String>) context.getAttribute("onlineUsers");
            onlineUsers.remove(username);
        }
        
        // 在线用户数 -1
        Integer count = (Integer) context.getAttribute("onlineCount");
        context.setAttribute("onlineCount", Math.max(0, count - 1));
        
        System.out.println("当前在线用户数: " + Math.max(0, count - 1));
    }
}
```

### 案例3: 请求日志记录

```java
@WebListener
public class RequestLogListener implements ServletRequestListener {
    
    private static final Logger logger = Logger.getLogger(RequestLogListener.class.getName());
    
    @Override
    public void requestInitialized(ServletRequestEvent sre) {
        HttpServletRequest req = (HttpServletRequest) sre.getServletRequest();
        
        String log = String.format("[%s] %s %s from %s",
            new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date()),
            req.getMethod(),
            req.getRequestURI(),
            req.getRemoteAddr()
        );
        
        logger.info(log);
    }
    
    @Override
    public void requestDestroyed(ServletRequestEvent sre) {
        // 可以在这里记录请求耗时等信息
    }
}
```

## 九、Filter 与 Listener 的区别

| 特性 | Filter | Listener |
|------|--------|----------|
| 作用 | 拦截请求和响应 | 监听容器事件 |
| 触发时机 | 每次请求 | 特定事件发生时 |
| 主要用途 | 编码转换、权限验证、日志等 | 初始化、销毁、统计等 |
| 配置方式 | @WebFilter 或 web.xml | @WebListener 或 web.xml |
| 执行次数 | 每次请求都执行 | 事件发生时执行一次 |
| 能否拦截请求 | 能 | 不能 |

## 十、常见问题与最佳实践

### 10.1 常见问题

#### 1. Filter 不执行

**原因:**
- URL 匹配不正确
- 没有调用 chain.doFilter()
- Filter 顺序问题

**解决:**
```java
@WebFilter("/*")
public class MyFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) 
            throws IOException, ServletException {
        
        System.out.println("Filter 执行");
        
        // 必须调用 chain.doFilter() 放行
        chain.doFilter(request, response);
    }
}
```

#### 2. Listener 不生效

**原因:**
- 没有添加 @WebListener 注解
- 没有在 web.xml 中配置
- 实现了错误的接口

**解决:**
```java
// 添加 @WebListener 注解
@WebListener
public class MyListener implements ServletContextListener {
    
    @Override
    public void contextInitialized(ServletContextEvent sce) {
        System.out.println("Listener 执行");
    }
}
```

#### 3. 多个 Filter 顺序问题

**解决:** 使用 web.xml 明确指定顺序

```xml
<filter-mapping>
    <filter-name>encodingFilter</filter-name>
    <url-pattern>/*</url-pattern>
</filter-mapping>

<filter-mapping>
    <filter-name>loginFilter</filter-name>
    <url-pattern>/*</url-pattern>
</filter-mapping>
```

### 10.2 最佳实践

#### 1. Filter 职责单一

```java
// 不推荐:一个 Filter 做多件事
@WebFilter("/*")
public class CommonFilter implements Filter {
    public void doFilter(...) {
        // 编码处理
        // 权限验证
        // 日志记录
        // ...
    }
}

// 推荐:职责单一
@WebFilter("/*")
public class EncodingFilter implements Filter {
    public void doFilter(...) {
        request.setCharacterEncoding("UTF-8");
        chain.doFilter(request, response);
    }
}

@WebFilter("/user/*")
public class LoginFilter implements Filter {
    public void doFilter(...) {
        // 只做登录验证
    }
}
```

#### 2. Listener 资源释放

```java
@WebListener
public class MyContextListener implements ServletContextListener {
    
    private DataSource dataSource;
    
    @Override
    public void contextInitialized(ServletContextEvent sce) {
        dataSource = createDataSource();
        sce.getServletContext().setAttribute("dataSource", dataSource);
    }
    
    @Override
    public void contextDestroyed(ServletContextEvent sce) {
        // 必须释放资源
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

#### 3. 异常处理

```java
@WebFilter("/*")
public class ExceptionFilter implements Filter {
    
    @Override
    public void doFilter(ServletRequest request, ServletResponse response, 
                        FilterChain chain) 
            throws IOException, ServletException {
        
        try {
            chain.doFilter(request, response);
        } catch (Exception e) {
            // 统一异常处理
            ((HttpServletResponse) response).sendError(500, "服务器内部错误");
            e.printStackTrace();
        }
    }
}
```

## 十一、面试要点

### Q1: Filter 的作用?

**答:**
1. 请求拦截和响应拦截
2. 统一处理编码、权限、日志等
3. 实现功能解耦
4. 过滤敏感词、XSS 防护

### Q2: Filter 的执行顺序?

**答:**
- 按照 filter-mapping 在 web.xml 中的顺序执行
- 注解配置按类名字母顺序
- 执行流程:请求拦截 → 目标资源 → 响应拦截

### Q3: Filter 与 Servlet 的区别?

**答:**
- Filter 用于拦截,Servlet 用于处理业务
- Filter 不能直接响应请求
- Filter 可以修改请求和响应

### Q4: Listener 的作用?

**答:**
1. 监听容器事件
2. 执行初始化和清理操作
3. 统计在线用户
4. 实现业务解耦

### Q5: 常用的 Listener 有哪些?

**答:**
- ServletContextListener: 监听应用启动关闭
- HttpSessionListener: 监听 session 创建销毁
- ServletRequestListener: 监听 request 创建销毁

### Q6: Filter 能否修改请求参数?

**答:**
可以,通过 HttpServletRequestWrapper 包装类修改。

```java
public class MyRequestWrapper extends HttpServletRequestWrapper {
    
    @Override
    public String getParameter(String name) {
        String value = super.getParameter(name);
        // 修改参数
        return value != null ? value.trim() : null;
    }
}
```

### Q7: 如何统计在线用户数?

**答:**
使用 HttpSessionListener:
- sessionCreated 时计数器 +1
- sessionDestroyed 时计数器 -1
- 将计数器存储在 ServletContext 中

---

> Filter 和 Listener 是 JavaWeb 的基础组件,虽然现代框架(如 Spring MVC)提供了更强大的拦截器(HandlerInterceptor)和监听器(ApplicationListener),但理解 Filter 和 Listener 的原理对于深入理解 Web 开发仍然重要。

## 版本差异(Servlet 3.x → Servlet 6.0)

| 特性 | 旧版（本文编写时） | 当前（Servlet 6.0） |
|------|-------------------|--------------------|
| 包名 | javax.servlet.Filter / javax.servlet.* | jakarta.servlet.Filter / jakarta.servlet.* |
| 注解配置 | @WebFilter/@WebListener（Servlet 3.0+） | 注解与接口签名不变，仅包名变化 |
| 注册方式 | web.xml / 注解 / ServletContext 动态注册 | 不变；Boot 3 中用 FilterRegistrationBean 或 @Component |
| 虚拟线程 | 无 | Tomcat 10.1+ 可启用虚拟线程，Filter 链机制不变 |

> Filter/Listener 机制在 Servlet 6.0 中保持不变，迁移时只需将 import 从 javax.servlet 改为 jakarta.servlet；Spring Boot 3.5.x 中推荐通过 FilterRegistrationBean 或 Spring Security Filter 链管理。