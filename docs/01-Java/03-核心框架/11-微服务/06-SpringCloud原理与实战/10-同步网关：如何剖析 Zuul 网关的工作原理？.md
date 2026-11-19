---
title: "同步网关：如何剖析 Zuul 网关的工作原理？"
description: "Zuul 网关源级原理：ZuulFilter/IZuulFilter 与 PRE/ROUTING/POST/ERROR 四种过滤器、FilterRegistry 与 FilterLoader 动态加载机制、ThreadLocal 版 RequestContext，以及 Spring Cloud 集成 ZuulFilter 的方式。"
keywords: [同步网关, 如何剖析, Zuul, 网关的工作原理]
category: "Java"
tags: [Java, SpringCloud原理与实战]
---
# 同步网关：如何剖析 Zuul 网关的工作原理？

> ⚠️ **组件状态说明**：Zuul 1.x 已由 Netflix 官方宣布停止维护（Netflix 自身已转向 Zuul 2，但 Spring Cloud 从未集成 Zuul 2，官方以 Spring Cloud Gateway 全面替代）。本文保留其原理讲解价值（过滤器链、RequestContext 与动态加载等网关核心机制并未过时，Spring Cloud Gateway 的 Filter 体系与之思想相通），生产选型请参考 [Spring Cloud Gateway](<../05-SpringCloudAlibaba实战/09-服务门户：Spring Cloud Gateway 如何把好微服务的大门.md>) 等现代替代方案（文中组件对照见尾部版本差异表）。

## 概述

Spring Cloud Netflix Zuul 是 API 网关的一种实现方式，提供了丰富的网关控制功能，其底层基于 Netflix 旗下的 Zuul 组件。本文从 Netflix Zuul 出发，对 Zuul 网关的内部原理进行源码级剖析。

## ZuulFilter 组件架构

Zuul 响应 HTTP 请求的过程是一种典型的过滤器结构，内部提供了 ZuulFilter 组件来实现这一机制。理解 Zuul 的工作原理从 ZuulFilter 开始。

### ZuulFilter 的定义与 FilterRegistry

在 Netflix Zuul 中存在一个 IZuulFilter 接口，定义如下：

```java
public interface IZuulFilter {
    boolean shouldFilter();
    Object run() throws ZuulException;
}
```

IZuulFilter 接口的 shouldFilter() 方法决定是否需要执行该过滤器，一般情况该方法都会返回 true，但可以利用该方法根据场景动态设置过滤器是否生效。而 run() 方法代表着该 Filter 具体需要实现的业务逻辑。

IZuulFilter 的直接实现类是 ZuulFilter，ZuulFilter 是一个抽象类，额外提供了如下所示的两个抽象方法：

```java
//过滤器类型
abstract public String filterType();
//过滤器顺序
abstract public int filterOrder();
```

其中 filterType() 代表过滤器的类型，内置过滤器分为 PRE、ROUTING、POST 和 ERROR 四种，后文会对这些过滤器具体展开；而 filterOrder() 方法用于设置过滤器的执行顺序，这个顺序用数字进行表示，数字越小则越先执行。

ZuulFilter 类中最核心的是负责执行 Filter 的 runFilter() 方法，该方法的执行流程如下所示：

```java
public ZuulFilterResult runFilter() {
        ZuulFilterResult zr = new ZuulFilterResult();
        if (!isFilterDisabled()) {
            if (shouldFilter()) {
                Tracer t = TracerFactory.instance().startMicroTracer("ZUUL::" + this.getClass().getSimpleName());
                try {
                    Object res = run();
                    zr = new ZuulFilterResult(res, ExecutionStatus.SUCCESS);
                } catch (Throwable e) {
                    t.setName("ZUUL::" + this.getClass().getSimpleName() + " failed");
                    zr = new ZuulFilterResult(ExecutionStatus.FAILED);
                    zr.setException(e);
                } finally {
                    t.stopAndLog();
                }
            } else {
                zr = new ZuulFilterResult(ExecutionStatus.SKIPPED);
            }
        }
        return zr;
}
```

有了过滤器，系统中就需要一个管理过滤器的组件——过滤器链。在 Netflix Zuul 中，使用一个称为过滤器注册表 FilterRegistry 的组件来保存和维护所有 ZuulFilter。FilterRegistry 类定义如下：

```java
public class FilterRegistry {

private static final FilterRegistry INSTANCE = new FilterRegistry();

public static final FilterRegistry instance() {
        return INSTANCE;
    }

private final ConcurrentHashMap<String, ZuulFilter> filters = new ConcurrentHashMap<String, ZuulFilter>();

private FilterRegistry() {
    }

public ZuulFilter remove(String key) {
        return this.filters.remove(key);
    }

public ZuulFilter get(String key) {
        return this.filters.get(key);
    }

public void put(String key, ZuulFilter filter) {
        this.filters.putIfAbsent(key, filter);
    }

public int size() {
        return this.filters.size();
    }

    public Collection<ZuulFilter> getAllFilters() {
        return this.filters.values();
    }
}
```

FilterRegistry 的实现非常简单：采用经典的单例模式创建 FilterRegistry 实例，内部直接使用线程安全的 ConcurrentHashMap 来缓存 ZuulFilter。

### ZuulFilter 的加载与 FilterLoader

在 Zuul 中，FilterLoader 负责 ZuulFilter 的加载。FilterLoader 类是 Zuul 的一个核心类——它用来在源码变化时编译、载入和校验过滤器。针对这个核心类，从它的变量入手进行分析。

```java
//Filter 文件名与修改时间的映射
private final ConcurrentHashMap<String, Long> filterClassLastModified = new ConcurrentHashMap<String, Long>();
//Filter 名称与代码的映射
private final ConcurrentHashMap<String, String> filterClassCode = new ConcurrentHashMap<String, String>();
//Filter 名称与名称的映射，作用是判断该 Filter 是否存在
private final ConcurrentHashMap<String, String> filterCheck = new ConcurrentHashMap<String, String>();
//Filter 类型与 List<ZuulFilter> 的映射
private final ConcurrentHashMap<String, List<ZuulFilter>> hashFiltersByType = new ConcurrentHashMap<String, List<ZuulFilter>>();
//前面提到的 FilterRegistry 单例
private FilterRegistry filterRegistry = FilterRegistry.instance();
//动态代码编译器实例，Zuul 提供的默认实现是 GroovyCompiler
static DynamicCodeCompiler COMPILER;
//ZuulFilter 工厂类
static FilterFactory FILTER_FACTORY = new DefaultFilterFactory();
```

这些变量中唯一值得注意的就是 DynamicCodeCompiler。顾名思义，它是一种动态代码编译器。DynamicCodeCompiler 接口定义如下：

```java
public interface DynamicCodeCompiler {
    Class compile(String sCode, String sName) throws Exception;

    Class compile(File file) throws Exception;
}
```

DynamicCodeCompiler 提供了两个接口：一个是从代码编译到类，另一个是从文件编译到类。GroovyCompiler 是该接口的实现类，用于把 Groovy 代码编译为 Java 类。GroovyCompiler 的实现如下所示：

```java
public class GroovyCompiler implements DynamicCodeCompiler {

GroovyClassLoader getGroovyClassLoader() {
        return new GroovyClassLoader();
    }

@Override
    public Class compile(String sCode, String sName) {
        GroovyClassLoader loader = getGroovyClassLoader();
        Class groovyClass = loader.parseClass(sCode, sName);
        return groovyClass;
    }

    @Override
    public Class compile(File file) throws IOException {
        GroovyClassLoader loader = getGroovyClassLoader();
        Class groovyClass = loader.parseClass(file);
        return groovyClass;
	}
}
```

GroovyCompiler 的核心代码同样比较简单：通过 groovy.lang.GroovyClassLoader 构建一个类加载器，然后调用它的 parseClass 方法即可将一个 Groovy 文件加载为一个 Java 类。

有了 GroovyCompiler 提供的动态加载和编译代码的能力，再回到 FilterLoader。FilterLoader 分别提供了 getFilter、putFilter 和 getFiltersByType 这三个工具方法，其中实际涉及加载和存储 Filter 的方法只有 putFilter，该方法如下所示：

```java
public boolean putFilter(File file) throws Exception {
        String sName = file.getAbsolutePath() + file.getName();
        if (filterClassLastModified.get(sName) != null && (file.lastModified() != filterClassLastModified.get(sName))) {
            LOG.debug("reloading filter " + sName);
            filterRegistry.remove(sName);
        }
        ZuulFilter filter = filterRegistry.get(sName);
        if (filter == null) {
            Class clazz = COMPILER.compile(file);
            if (!Modifier.isAbstract(clazz.getModifiers())) {
                filter = (ZuulFilter) FILTER_FACTORY.newInstance(clazz);
                List<ZuulFilter> list = hashFiltersByType.get(filter.filterType());
                if (list != null) {
                    hashFiltersByType.remove(filter.filterType());
                }
                filterRegistry.put(file.getAbsolutePath() + file.getName(), filter);
                filterClassLastModified.put(sName, file.lastModified());
                return true;
            }
        }

        return false;
}
```

上述 putFilter 方法通过文件加载 ZuulFilter，整体执行流程比较简洁明了：首先通过修改时间判断文件是否被修改过，如果被修改过则从 FilterRegistry 移除这个 Filter；然后根据 FilterRegistry 是否缓存了这个 Filter 来决定是否使用 DynamicCodeCompiler 动态加载代码，并根据加载的代码使用 FilterFactory 工厂类来实例化 ZuulFilter。

FilterFactory 的实现类是 DefaultFilterFactory，它的实例创建过程直接利用了反射机制，如下所示：

```java
@Override
public ZuulFilter newInstance(Class clazz) throws InstantiationException, IllegalAccessException {
        return (ZuulFilter) clazz.newInstance();
}
```

顺着 FilterLoader 类的 putFilter 方法继续往前走，需要明确该方法中传入的 File 对象从何而来。这个 File 对象由 FilterFileManager 类提供，其作用是管理这些 File 对象。FilterFileManager 中包含了如下所示的 manageFiles 和 processGroovyFiles 方法，后者调用了 FilterLoader 的 putFilter 方法以进行 Groovy 文件的处理。

```java
void manageFiles() throws Exception, IllegalAccessException, InstantiationException {
        List<File> aFiles = getFiles();
        processGroovyFiles(aFiles);
}

void processGroovyFiles(List<File> aFiles) throws Exception, InstantiationException, IllegalAccessException {
        for (File file : aFiles) {
            FilterLoader.getInstance().putFilter(file);
        }
}
```

manageFiles 方法由 FilterFileManager 中一个每隔 pollingIntervalSeconds 秒轮询一次的后台守护线程调用，该线程调用 manageFiles 方法来重新加载 Filter，如下所示：

```java
void startPoller() {
        poller = new Thread("GroovyFilterFileManagerPoller") {
            public void run() {
                while (bRunning) {
                    try {
                        sleep(pollingIntervalSeconds * 1000);
                        manageFiles();
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            }
        };
        poller.setDaemon(true);
        poller.start();
}
```

至此，ZuulFilter 的加载和管理流程已经非常清晰：Zuul 通过文件来存储各种 ZuulFilter 的定义和实现逻辑，然后启动一个守护线程定时轮询这些文件，确保变更之后的文件能够动态加载到 FilterRegistry 中。

### RequestContext 与上下文

RequestContext 是 Zuul 中的核心对象之一。通过该对象可以将业务信息放到请求上下文（Context）中，并使其在各个 ZuulFilter 中进行传递。上下文机制是众多开源软件中必备的一种需求和实现方案。

Context 处理机制的前提是：每个新的请求都由一个独立的线程进行处理（诸如 Tomcat 之类的服务器负责启动这个线程）。也就是说，HTTP 请求的所有参数总是绑定在处理请求的线程中。基于这一点，对 RequestContext 的访问必须设计成线程安全。Zuul 使用了非常常见和实用的 ThreadLocal，如下所示：

```java
protected static final ThreadLocal<? extends RequestContext> threadLocal = new ThreadLocal<RequestContext>() {
        @Override
        protected RequestContext initialValue() {
            try {
                return contextClass.newInstance();
            } catch (Throwable e) {
                throw new RuntimeException(e);
            }
        }
};
```

这里使用了线程安全的 ThreadLocal 来存放所有的 RequestContext。作为一个实现上的技巧，这里重写了 ThreadLocal 的 initialValue() 方法，目的是确保 ThreadLocal 的 get() 方法始终会获取一个 RequestContext 实例——默认情况下 ThreadLocal 的 get() 方法可能返回 null，而通过重写 initialValue() 方法可以在返回 null 时自动初始化一个 RequestContext 实例。

用于获取 RequestContext 的 getCurrentContext 方法如下所示：

```java
public static RequestContext getCurrentContext() {
	    RequestContext context = threadLocal.get();
        return context;
}
```

开发业务代码时可以先获取这个 RequestContext 对象，进而获取该对象中所存储的各种业务数据。RequestContext 提供了大量的 getter/setter 方法对来完成这一操作。与 Zuul 中的其他组件一样，RequestContext 的实现也是直接对 ConcurrentHashMap 做了一层封装，其中 Key 是 String 类型，而 Value 是 Object 类型，因此可以将任何想要传递的数据放到 RequestContext 中。

### HTTP 请求与过滤器执行

下面分析如何使用加载好的 ZuulFilter。Zuul 提供了 FilterProcessor 类来执行 Filter，参考如下所示的 runFilters 方法：

```java
public Object runFilters(String sType) throws Throwable {

        boolean bResult = false;
        List<ZuulFilter> list = FilterLoader.getInstance().getFiltersByType(sType);
        if (list != null) {
            for (int i = 0; i < list.size(); i++) {
                ZuulFilter zuulFilter = list.get(i);
                Object result = processZuulFilter(zuulFilter);
                if (result != null && result instanceof Boolean) {
                    bResult |= ((Boolean) result);
                }
            }
        }
        return bResult;
}
```

这个方法传入了 Filter 的类型，然后通过 FilterLoader 获取所属类型的 ZuulFilter 列表，通过遍历列表并调用 processZuulFilter 方法来完成对每个 Filter 的执行。processZuulFilter 方法的结构也比较简单，核心就是通过调用 ZuulFilter 自身的 runFilter 方法，然后获取执行结果状态。

FilterProcessor 基于 runFilters 方法衍生出 postRoute()、preRoute()、error() 和 route() 这四个方法，分别对应 Zuul 中的四种过滤器类型。其中 PRE 过滤器在请求到达目标服务器之前调用，ROUTING 过滤器把请求发送给目标服务，POST 过滤器在请求从目标服务返回之后执行，而 ERROR 过滤器则在发生错误时执行。这四种过滤器有固定的执行顺序：PRE → ROUTING → POST，ERROR 过滤器则在对应阶段发生错误时触发。每一种过滤器对应了一个 HTTP 请求的执行生命周期，因此可以在不同的过滤器中添加针对该生命周期的特定执行逻辑。例如，日常开发中常见的做法是在 PRE 过滤器中执行身份验证和记录请求日志等操作，而在 POST 过滤器返回的响应中添加消息头或者各种统计信息等。

基于对 Zuul 请求生命周期的理解，最后来看一下 ZuulServlet。Zuul 作为一个服务网关需要完成对 HTTP 请求的响应，ZuulServlet 是 Zuul 中对 HttpServlet 接口的一个实现类。Servlet 中最核心的就是 service 方法，ZuulServlet 的 service 方法如下所示：

```java
@Override
public void service(javax.servlet.ServletRequest servletRequest, javax.servlet.ServletResponse servletResponse) throws ServletException, IOException {
        try {
            init((HttpServletRequest) servletRequest, (HttpServletResponse) servletResponse);

RequestContext context = RequestContext.getCurrentContext();
            context.setZuulEngineRan();

try {
                preRoute();
            } catch (ZuulException e) {
                error(e);
                postRoute();
                return;
            }
            try {
                route();
            } catch (ZuulException e) {
                error(e);
                postRoute();
                return;
            }
            try {
                postRoute();
            } catch (ZuulException e) {
                error(e);
                return;
            }

        } catch (Throwable e) {
            error(new ZuulException(e, 500, "UNHANDLED_EXCEPTION_" + e.getClass().getName()));
        } finally {
            RequestContext.getCurrentContext().unset();
        }
}
```

这里的 postRoute()、preRoute()、error() 和 route() 四个方法同样只是对 ZuulRunner 中同名方法的直接封装。从这段代码可以梳理出 Zuul 中四种过滤器的执行顺序与异常流转：preRoute 失败 → error + postRoute；route 失败 → error + postRoute；postRoute 失败 → error；未捕获异常 → error(500)。

## Spring Cloud 集成 ZuulFilter

Zuul 的整体架构在设计上的初衷是把所有 ZuulFilter 通过 Groovy 文件的形式进行管理和加载，但在 Spring Cloud 体系中并没有使用此策略来加载 ZuulFilter。Spring Cloud 的 ZuulFilter 加载方式如下。

spring-cloud-netflix-zuul 同样是一个 Spring Boot 应用程序，因此直接进入 ZuulServerAutoConfiguration 类，可以找到如下所示的 ZuulFilterConfiguration 类：

```java
@Configuration
protected static class ZuulFilterConfiguration {
        @Autowired
        private Map<String, ZuulFilter> filters;

        @Bean
        public ZuulFilterInitializer zuulFilterInitializer(
                CounterFactory counterFactory, TracerFactory tracerFactory) {
            FilterLoader filterLoader = FilterLoader.getInstance();
            FilterRegistry filterRegistry = FilterRegistry.instance();
            return new ZuulFilterInitializer(this.filters, counterFactory, tracerFactory, filterLoader, filterRegistry);
        }
}
```

这里出现了熟悉的 FilterLoader 和 FilterRegistry，通过 ZuulFilterInitializer 的构造函数引入了过滤器加载的流程。filters 变量是一个 Key 为 String、Value 为 ZuulFilter 的 Map，且添加了 @Autowired 注解——这意味着 Spring 会把 ZuulFilter 的 bean 自动装载到 Map 对象中。

在 ZuulServerAutoConfiguration 及其子类 ZuulProxyAutoConfiguration 中存在很多添加了 @Bean 注解并以 "Filter" 结尾的类，其形式如下所示：

```java
@Bean
public ServletDetectionFilter servletDetectionFilter() {
        return new ServletDetectionFilter();
}
```

这个 ServletDetectionFilter 类就是 ZuulFilter 的子类，在 Spring 容器中会被自动注入 ZuulFilterConfiguration 的 filters 对象中。

获取了容器中自动注入的 ZuulFilter 之后，继续跟进 ZuulFilterInitializer，可以发现如下所示的 contextInitialized 方法：

```java
@PostConstruct
public void contextInitialized() {
        log.info("Starting filter initializer");

TracerFactory.initialize(tracerFactory);
        CounterFactory.initialize(counterFactory);

        for (Map.Entry<String, ZuulFilter> entry : this.filters.entrySet()) {
            filterRegistry.put(entry.getKey(), entry.getValue());
        }
}
```

该方法开启了 @PostConstruct 注解，因此在 Spring 容器中，一旦 ZuulFilterInitializer 的构造函数执行完成，就会执行这个 contextInitialized 方法。方法中通过 FilterRegistry 的 put 方法把从容器中自动注入的各个 Filter 添加到 FilterRegistry 中。同样，在 ZuulFilterInitializer 中也存在一个被添加了 @PostConstruct 注解的 contextDestroyed 方法，该方法调用了 filterRegistry 的 remove 方法删除 Filter。

至此，Spring Cloud 通过 Netflix Zuul 提供的 FilterLoader 和 FilterRegistry 等工具类完成了两者之间的集成。

## 实践要点

- Zuul 的过滤器体系核心是 IZuulFilter（shouldFilter + run）与 ZuulFilter（filterType + filterOrder）两层抽象：shouldFilter 控制过滤器是否生效，filterOrder 数字越小越先执行。
- Netflix Zuul 的原生设计通过 Groovy 文件管理过滤器：FilterFileManager 的守护线程按 pollingIntervalSeconds 轮询文件变更，经 GroovyCompiler 动态编译、FilterFactory 反射实例化后写入 FilterRegistry（单例 + ConcurrentHashMap），实现过滤器的热加载。
- RequestContext 基于 ThreadLocal 实现，并重写 initialValue() 保证 get() 不返回 null；底层是对 ConcurrentHashMap 的封装，可在各过滤器间传递任意业务数据；请求结束时 ZuulServlet 在 finally 中调用 unset() 清理上下文。
- 四种过滤器的固定生命周期为 PRE → ROUTING → POST，ERROR 在对应阶段出错时触发；常见实践是在 PRE 过滤器做身份验证与请求日志，在 POST 过滤器添加响应头与统计信息。
- Spring Cloud 没有沿用 Groovy 文件加载策略，而是把 ZuulFilter 声明为 Spring Bean，经 @Autowired 注入 Map 后由 ZuulFilterInitializer 在 @PostConstruct 阶段注册到 FilterRegistry，销毁时调用 remove。

## 小结

本文解析了 Zuul 网关的内部构造和实现原理：围绕最核心的过滤器组件 ZuulFilter，从其定义（IZuulFilter/ZuulFilter 抽象）、加载（FilterLoader + GroovyCompiler + FilterFileManager 轮询）、存储（FilterRegistry）和管理给出了源码级的分析过程；同时基于一个 HTTP 请求的处理过程，描绘了 Zuul 中四种过滤器类型（PRE/ROUTING/POST/ERROR）以及处理机制（FilterProcessor + ZuulServlet），并说明了 Spring Cloud 通过 Spring Bean 装载与 ZuulFilterInitializer 集成 ZuulFilter 的方式。处理请求上下文时，Zuul 使用 ThreadLocal 实现 RequestContext 的线程安全访问。

## 版本差异（Spring Cloud 旧版 → 2025.x）

| 组件 | 旧版（本文编写时） | 当前（Spring Cloud 2025.x / Boot 3.5.x） |
|------|-------------------|------------------------------------------|
| 服务注册 | Eureka 1.x（Eureka 2.x 已终止开发） | Nacos 2.x / Consul（Eureka 1.x 仍随 Spring Cloud Netflix 维护） |
| 负载均衡 | Ribbon（已停止维护） | Spring Cloud LoadBalancer |
| 网关 | Zuul 1.x（已停止维护） | Spring Cloud Gateway（基于 WebFlux） |
| 熔断 | Hystrix（已停止维护） | Resilience4j / Sentinel |
| 配置中心 | Spring Cloud Config | Nacos Config / Apollo |
| 版本对应 | Hoxton/2020.x + Boot 2.x + JDK 8 | 2025.x + Boot 3.5.x + JDK 17+ |

> 本文为 Spring Cloud 旧版课程（Hoxton/2020.x 时代）。Hystrix、Ribbon、Zuul 1.x、Eureka 已停止维护，新项目请使用 Spring Cloud Gateway + LoadBalancer + Resilience4j（或 Alibaba 系 Nacos/Sentinel/Seata），并升级到 Spring Cloud 2025.x + Spring Boot 3.5.x。
