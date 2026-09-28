---
title: "SpringBoot启动流程分析原理"
description: "以 Debug 视角剖析 Spring Boot 启动流程：SpringApplication 构造器的 Web 类型推断与初始化器/监听器加载（spring.factories），run() 方法中环境准备、容器创建、刷新、Runner 执行与事件发布的完整链路（基于 2.1.x 源码，附 3.5.x 差异）。"
keywords: [SpringBoot 启动流程, SpringApplication, 启动源码, spring.factories]
category: "Java"
tags: [Java, SpringBoot]
---


# SpringBoot 启动流程分析原理

> SpringBoot 一直有个口号"约定优于配置"，其实是一种按约定编程的软件设计范式，目的在于减少软件开发人员在工作中的各种繁琐的配置。传统的 SSM 框架的组合，会伴随着大量的繁琐的配置；稍有不慎，就可能各种 bug。本文就来探究 `SpringBoot` 到底是如何做到"**约定优于配置**"的。

## 调试项目 `SpringApplication` 初始化过程

首先用 `Spring Initializr` 来创建 `SpringBoot` 工程，使用的版本是 `SpringBoot 2.1.5.RELEASE`（本文以经典 2.1.x 源码讲解启动流程，其核心流程在 3.5.x 中保持不变，具体差异见文末版本差异小节）。在 `pom.xml` 文件中添加一个web 工程的依赖，是为了观察后面容器类型的源码

```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

找到这个应用程序的入口主方法，在上面打一个断点

启动之后 F5 进入到 `run()` 方法

```java
public static ConfigurableApplicationContext run(Class<?>[] primarySources,String[] args) {
	return new SpringApplication(primarySources).run(args);
}
```

到这里会执行 `new SpringApplication(primarySources)` 创建 spring 应用对象，继续 F5 往下跟会执行 `SpringApplication` 构造器

```java
// SpringApplication 构造器
public SpringApplication(ResourceLoader resourceLoader, Class<?>... primarySources) {
  
  // 资源加载器
  this.resourceLoader = resourceLoader;
  Assert.notNull(primarySources, "PrimarySources must not be null");
  this.primarySources = new LinkedHashSet<>(Arrays.asList(primarySources));
  
  // 1. 推断可能的 web 应用类型
  this.webApplicationType = WebApplicationType.deduceFromClasspath();
  
  // 2. 设置初始化应用context
  setInitializers((Collection) getSpringFactoriesInstances(ApplicationContextInitializer.class));
  
  // 3.设置初始化监听	
  setListeners((Collection) getSpringFactoriesInstances(ApplicationListener.class));
  
  // 4. 推演主程序类	
  this.mainApplicationClass = deduceMainApplicationClass();
}
```

很多事情都是发生在这个对象初始化的时候

```java
static WebApplicationType deduceFromClasspath() {
  if (ClassUtils.isPresent(WEBFLUX_INDICATOR_CLASS, null)
      && !ClassUtils.isPresent(WEBMVC_INDICATOR_CLASS, null)
      && !ClassUtils.isPresent(JERSEY_INDICATOR_CLASS, null)) {
    return WebApplicationType.REACTIVE;
  }
  for (String className : SERVLET_INDICATOR_CLASSES) {
    if (!ClassUtils.isPresent(className, null)) {
      return WebApplicationType.NONE;
    }
  }
  // 这里是测试 web 容器
  return WebApplicationType.SERVLET;
}
```

### 推断 web应用类型

这段代码是来推断应用是哪种 web 应用程序，当然一开始加入 web 的依赖，所以是 `servlet` 容器

```java
public enum WebApplicationType {

  /**
	 * The application should not run as a web application and should not start an embedded web server.
	 */
  NONE, // 不是 web 应用

  /**
	 * The application should run as a servlet-based web application and should start an embedded servlet web server.
	 */
  SERVLET, // servlet容器

  /**
	 * The application should run as a reactive web application and should start an embedded reactive web server.
	 */
  REACTIVE;  // 反应型 web 应用（webflux）
}
```

### 初始化应用上下文

在设置初始化应用 context 的时候 ，是先执行了 `getSpringFactoriesInstances(ApplicationContextInitializer.class)`  方法，参数是 `ApplicationContextInitializer.class` 字节码对象

```java
private <T> Collection<T> getSpringFactoriesInstances(Class<T> type, Class<?>[] parameterTypes, Object... args) {
  ClassLoader classLoader = getClassLoader();
  
  // Use names and ensure unique to protect against duplicates
  // 加载 ApplicationContextInitializer.class 类型的类,这里传入就是参数 ApplicationContextInitializer.class
  Set<String> names = new LinkedHashSet<>(SpringFactoriesLoader.loadFactoryNames(type, classLoader));
  
  // 实例化加载到的类
  List<T> instances = createSpringFactoriesInstances(type, parameterTypes,classLoader, args, names);
  AnnotationAwareOrderComparator.sort(instances);
  // 返回
  return instances;
}

public static List<String> loadFactoryNames(Class<?> factoryClass, @Nullable ClassLoader classLoader) {
  String factoryClassName = factoryClass.getName();
  return loadSpringFactories(classLoader).getOrDefault(factoryClassName, Collections.emptyList());
}
```

先来看看是如何加载到这些类

```java
private static Map<String, List<String>> loadSpringFactories(@Nullable ClassLoader classLoader) {
  // 先从缓存中拿
  MultiValueMap<String, String> result = cache.get(classLoader);
  if (result != null) {
    return result;
  }
  try {
    // FACTORIES_RESOURCE_LOCATION 为常量："META-INF/spring.factories"
    // 去资源路径下加载
    Enumeration<URL> urls = (classLoader != null ?
                             classLoader.getResources(FACTORIES_RESOURCE_LOCATION) :
                             ClassLoader.getSystemResources(FACTORIES_RESOURCE_LOCATION));
    result = new LinkedMultiValueMap<>();
    while (urls.hasMoreElements()) {
      URL url = urls.nextElement();
      UrlResource resource = new UrlResource(url);
      Properties properties = PropertiesLoaderUtils.loadProperties(resource);
      for (Map.Entry<?, ?> entry : properties.entrySet()) {
        String factoryClassName = ((String) entry.getKey()).trim();
        for (String factoryName : StringUtils.commaDelimitedListToStringArray((String) entry.getValue())) {
          result.add(factoryClassName, factoryName.trim());
        }
      }
    }
    cache.put(classLoader, result);
    // 返回所有的加载的类
    return result;
  }
  catch (IOException ex) {
    throw new IllegalArgumentException("Unable to load factories from location [" +
                                       FACTORIES_RESOURCE_LOCATION + "]", ex);
  }
}
```

这里有两个加载配置类的地方其实都指向了 `META-INF/spring.factories`，通过断点可以看到应用程序是加载了多个 jar 下的 `spring.factories` 文件

> 双击 Shift 搜索 spring.factories 可以看到它存在于以下工程中

`spring-boot-2.1.5.RELEASE.jar` 下的 `spring.factories`（其中注册了各类型的初始化器、监听器等）

从 Map 中根据 `org.springframework.context.ApplicationContextInitializer` 的类型拿到需要的类初始化类，断点进入`getOrDefault(factoryClassName, Collections.emptyList());`方法


之后就是把加载到的需要初始化的类进行实例化添加到一个集合中等待备用

```java
public void setInitializers(
  Collection<? extends ApplicationContextInitializer<?>> initializers) {
  this.initializers = new ArrayList<>();
  this.initializers.addAll(initializers);
}
```

### 初始化监听器类

最关键的还是这句 `setListeners((Collection) getSpringFactoriesInstances(ApplicationListener.class));`

当跟进去之后，会发现在初始化监听类的时候和上面初始化应用上下文是一样的代码。唯一不同的是 `getSpringFactoriesInstances(ApplicationListener.class)` 传进去的是 `ApplicationListener.class`，所以这里就不再赘述

### 推演主程序类

> 也就是这个最关键的代码了

```java
this.mainApplicationClass = deduceMainApplicationClass();
```


到这里就完成了 `SpringBoot` 启动过程中初始化 `SpringApplication` 的过程

## `run()` 方法调试

```java
return new SpringApplication(primarySources).run(args)
```

继续往下跟着源码进入到  `run()` 方法

```java
public ConfigurableApplicationContext run(String... args) {
  StopWatch stopWatch = new StopWatch();
  // 计时器开始	
  stopWatch.start();
  ConfigurableApplicationContext context = null;
  Collection<SpringBootExceptionReporter> exceptionReporters = new ArrayList<>();
  
  // 配置 Headless 模式，是在缺少显示屏、键盘或者鼠标时的系统配置 默认为true
  configureHeadlessProperty();
  // 获取所有的监听器
  SpringApplicationRunListeners listeners = getRunListeners(args);
  // 启动监听器
  listeners.starting();
  
  try {
    ApplicationArguments applicationArguments = new DefaultApplicationArguments(args);
    // 准备环境
    ConfigurableEnvironment environment = prepareEnvironment(listeners,applicationArguments);
    
    // 配置忽略的 bean
    configureIgnoreBeanInfo(environment);
    
    // 打印 banner
    Banner printedBanner = printBanner(environment);
    
    // 创建容器
    context = createApplicationContext();
    
    // 异常处理相关
    exceptionReporters = getSpringFactoriesInstances(SpringBootExceptionReporter.class,new Class[] { ConfigurableApplicationContext.class }, context);
    
    // 准备应用上下文
    prepareContext(context, environment, listeners, applicationArguments,printedBanner);
    
    // 刷新容器
    refreshContext(context);
    
    // 刷新容器后的扩展接口
    afterRefresh(context, applicationArguments);
    
    stopWatch.stop();
    if (this.logStartupInfo) {
      new StartupInfoLogger(this.mainApplicationClass).logStarted(getApplicationLog(), stopWatch);
    }
    // 发布监听应用上下文启动完成
    listeners.started(context);
    // 执行runner
    callRunners(context, applicationArguments);
  }
  catch (Throwable ex) {
    handleRunFailure(context, ex, exceptionReporters, listeners);
    throw new IllegalStateException(ex);
  }

  try {
    // 监听应用上下文运行中
    listeners.running(context);
  }
  catch (Throwable ex) {
    handleRunFailure(context, ex, exceptionReporters, null);
    throw new IllegalStateException(ex);
  }
  return context;
}
```

### 1. 获取所有的监听器

```java
private SpringApplicationRunListeners getRunListeners(String[] args) {
  Class<?>[] types = new Class<?>[] { SpringApplication.class, String[].class };
  return new SpringApplicationRunListeners(logger, getSpringFactoriesInstances(    
    SpringApplicationRunListener.class, types, this, args));
}

private <T> Collection<T> getSpringFactoriesInstances(Class<T> type,
                                                      Class<?>[] parameterTypes, Object... args) {
  ClassLoader classLoader = getClassLoader();
  // Use names and ensure unique to protect against duplicates
  Set<String> names = new LinkedHashSet<>(
    SpringFactoriesLoader.loadFactoryNames(type, classLoader));
  List<T> instances = createSpringFactoriesInstances(type, parameterTypes,
                                                     classLoader, args, names);
  AnnotationAwareOrderComparator.sort(instances);
  return instances;
}
```

这段代码比较熟悉，主要作用就是去 `META-INF/spring.factories` 中加载配置 `SpringApplicationRunListener` 的监听器如下:

```properties
# Run Listeners
org.springframework.boot.SpringApplicationRunListener=org.springframework.boot.context.event.EventPublishingRunListener
```

显然只有一个事件发布监听器类，拿到 `EventPublishingRunListener` 启动事件发布监听器，下一步就是开始启动了`listeners.starting();` 

```java
@Override
public void starting() {
  this.initialMulticaster.multicastEvent(new ApplicationStartingEvent(this.application, this.args));
}
```

启动的时候实际上是又创建了一个 `ApplicationStartingEvent` 对象,其实就是监听应用启动事件。其中 `initialMulticaster` 是一个 `SimpleApplicationEventMulticaster`

```java
public void multicastEvent(final ApplicationEvent event, @Nullable ResolvableType eventType) {
  ResolvableType type = (eventType != null ? eventType : resolveDefaultEventType(event));
  // 根据ApplicationStartingEvent事件类型找到对应的监听器，获取线程池，为每个监听事件创建一个线程
  for (final ApplicationListener<?> listener :  getApplicationListeners(event, type)) {
    Executor executor = getTaskExecutor();
    if (executor != null) {
      executor.execute(() -> invokeListener(listener, event));
    }
    else {
      invokeListener(listener, event);
    }
  }
}
```


### 2. 准备环境

```java
ConfigurableEnvironment environment = prepareEnvironment(listeners,applicationArguments);
```

继续往下跟看到，添加了 web 的依赖 `getOrCreateEnvironment()` 返回的是一个 `StandardServletEnvironment` 标准的 servlet 环境

```java
private ConfigurableEnvironment prepareEnvironment(SpringApplicationRunListeners listeners,ApplicationArguments applicationArguments) {
  
  // Create and configure the environment
  // 这里我们加 web 的依赖所以是一个 servlet 容器
  ConfigurableEnvironment environment = getOrCreateEnvironment();
  
  // 配置环境
  configureEnvironment(environment, applicationArguments.getSourceArgs());
  
  //环境准备完成
  listeners.environmentPrepared(environment);
  // 	
  bindToSpringApplication(environment);
  if (!this.isCustomEnvironment) {
    environment = new EnvironmentConverter(getClassLoader()).convertEnvironmentIfNecessary(environment, deduceEnvironmentClass());
  }
  ConfigurationPropertySources.attach(environment);
  return environment;
}
```

#### 配置环境

```java
protected void configureEnvironment(ConfigurableEnvironment environment,String[] args) {
  if (this.addConversionService) {
    // 嵌入式的转换器
    ConversionService conversionService = ApplicationConversionService.getSharedInstance();
    environment.setConversionService((ConfigurableConversionService) conversionService);
  }
  // 配置属性资源文件
  configurePropertySources(environment, args);
  //配置文件
  configureProfiles(environment, args);
}
```

应用嵌入的转换器 `ApplicationConversionService`

```java
public static void configure(FormatterRegistry registry) {
  DefaultConversionService.addDefaultConverters(registry);
  DefaultFormattingConversionService.addDefaultFormatters(registry);
  addApplicationFormatters(registry);
  addApplicationConverters(registry);
}

// ===================格式转换=============================
public static void addApplicationFormatters(FormatterRegistry registry) {
  registry.addFormatter(new CharArrayFormatter());
  registry.addFormatter(new InetAddressFormatter());
  registry.addFormatter(new IsoOffsetFormatter());
}

// ====================类型转换============================
public static void addApplicationConverters(ConverterRegistry registry) {
  addDelimitedStringConverters(registry);
  registry.addConverter(new StringToDurationConverter());
  registry.addConverter(new DurationToStringConverter());
  registry.addConverter(new NumberToDurationConverter());
  registry.addConverter(new DurationToNumberConverter());
  registry.addConverter(new StringToDataSizeConverter());
  registry.addConverter(new NumberToDataSizeConverter());
  registry.addConverterFactory(new StringToEnumIgnoringCaseConverterFactory());
}
```

#### 环境准备完成

> 同上面启动监听事件，这次的环境准备也是同样的代码

```java
@Override
public void environmentPrepared(ConfigurableEnvironment environment) {
  this.initialMulticaster.multicastEvent(
    // 创建了一个应用环境准备事件对象
    new ApplicationEnvironmentPreparedEvent(this.application, this.args, environment));
}
```

debug 进去之后代码跟 `ApplicationStartingEvent` 事件对象是一样的。不再赘述。

不过这里是7个监听器对象

### 3. 配置忽略的 bean

```java
configureIgnoreBeanInfo(environment);
```

### 4. 打印 banner

> 这是 SpringBoot 默认的启动时的图标

```java
Banner printedBanner = printBanner(environment);
```


### 5. 创建容器

> 紧接着上文，接下来就是创建容器

```
context = createApplicationContext();
```


环境是 `servlet`，即根据 `DEFAULT_SERVLET_WEB_CONTEXT_CLASS` 常量，通过反射的方式创建容器对象

```java
public static final String DEFAULT_SERVLET_WEB_CONTEXT_CLASS = "org.springframework.boot."
			+ "web.servlet.context.AnnotationConfigServletWebServerApplicationContext";
```

并且实例化 `AnnotationConfigServletWebServerApplicationContext` 对象

### 6. 异常错误处理

代码如下：

```java
exceptionReporters = getSpringFactoriesInstances(
					SpringBootExceptionReporter.class,
					new Class[] { ConfigurableApplicationContext.class }, context);
```

其实还是去 `META-INF/spring.factories` 配置文件中加载`SpringBootExceptionReporter`类

```properties
# Error Reporters
org.springframework.boot.SpringBootExceptionReporter=org.springframework.boot.diagnostics.FailureAnalyzers
```

### 7. 准备应用上下文

> 这里就会根据之前创建的上下文、准备的环境、以及监听等准备应用上下文

```java
private void prepareContext(ConfigurableApplicationContext context, ConfigurableEnvironment environment, 
                           SpringApplicationRunListeners listeners, ApplicationArguments applicationArguments, Banner printedBanner) {
  //设置环境参数
  context.setEnvironment(environment);
  //设置后处理应用上下文
  this.postProcessApplicationContext(context);
  //把从 spring.factories 中加载的 org.springframework.boot.context.config.ConfigurationWarningsApplicationContextInitializer，进行初始化操作
  this.applyInitializers(context);
  
  //EventPublishingRunListener发布应用上下文事件
  listeners.contextPrepared(context);
  
  //打印启动日志
  if (this.logStartupInfo) {
    this.logStartupInfo(context.getParent() == null);
    this.logStartupProfileInfo(context);
  }
  
  //注册一个名为 springApplicationArguments 的单例 bean，
  context.getBeanFactory().registerSingleton("springApplicationArguments", applicationArguments);

  if (printedBanner != null) {
    //注册一个名为 springBootBanner 的单例 bean，
    context.getBeanFactory().registerSingleton("springBootBanner", printedBanner);
  }
  
  //Load the sources 获取所有资源
  Set<Object> sources = this.getAllSources();
  Assert.notEmpty(sources, "Sources must not be empty");
  //创建BeanDefinitionLoader加载器加载注册所有的资源
  this.load(context, sources.toArray(new Object[0]));
  //同之前，发布应用上下文加载事件
  listeners.contextLoaded(context);
}
```

### 8. 刷新应用上下文

> 刷新应用上下文就进入了 spring 的源码了

```java
@Override
public void refresh() throws BeansException, IllegalStateException {
  synchronized (this.startupShutdownMonitor) {
    // 准备刷新上下文
    prepareRefresh();

    // 通知子类刷新内部工厂
    ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();

    // 准备Bean工厂
    prepareBeanFactory(beanFactory);

    try {
      // Allows post-processing of the bean factory in context subclasses.	
      // 允许在上下文子类中对bean工厂进行后处理。              
      postProcessBeanFactory(beanFactory);

      // Invoke factory processors registered as beans in the context.
      // 调用上下文中注册为bean的工厂处理器
      invokeBeanFactoryPostProcessors(beanFactory);

      // 注册后置处理器。               
      registerBeanPostProcessors(beanFactory);

      // 初始化消息源（国际化消息）             
      initMessageSource();

      // 	初始化上下文事件发布器
      initApplicationEventMulticaster();

      // 初始化其他自定义bean
      onRefresh();

      // 注册监听器
      registerListeners();

      // Instantiate all remaining (non-lazy-init) singletons.
      // 完成bean工厂初始化
      finishBeanFactoryInitialization(beanFactory);

      // Last step: publish corresponding event.
      // 完成刷新，清缓存，初始化生命周期，事件发布等      
      finishRefresh();
    }

    catch (BeansException ex) {
      if (logger.isWarnEnabled()) {
        logger.warn("Exception encountered during context initialization - " +"cancelling refresh attempt: " + ex);
      }

      // 销毁bean		
      destroyBeans();

      // Reset 'active' flag.
      cancelRefresh(ex);

      // Propagate exception to caller.
      throw ex;
    }

    finally {
      // Reset common introspection caches in Spring's core, since we
      // might not ever need metadata for singleton beans anymore...
      resetCommonCaches();
    }
  }
}
```

刷新的代码有点深，也是在这时创建了 Tomcat 对象，这也是 `SpringBoot` **一键启动**web 工程的关键

```java
@Override
protected void onRefresh() {
  super.onRefresh();
  try {
    // 创建 web 服务
    createWebServer();
  }
  catch (Throwable ex) {
    throw new ApplicationContextException("Unable to start web server", ex);
  }
}

private void createWebServer() {
  WebServer webServer = this.webServer;
  ServletContext servletContext = getServletContext();
  if (webServer == null && servletContext == null) {
    ServletWebServerFactory factory = getWebServerFactory();
    // 获取到 Tomcat
    this.webServer = factory.getWebServer(getSelfInitializer());
  }
  else if (servletContext != null) {
    try {
      getSelfInitializer().onStartup(servletContext);
    }
    catch (ServletException ex) {
      throw new ApplicationContextException("Cannot initialize servlet context",ex);
    }
  }
  initPropertySources();
}
```

创建 Tomcat 对象并设置参数

```java
public WebServer getWebServer(ServletContextInitializer... initializers) {
  Tomcat tomcat = new Tomcat();
  File baseDir = (this.baseDirectory != null) ? this.baseDirectory: createTempDir("tomcat");
  tomcat.setBaseDir(baseDir.getAbsolutePath());
  Connector connector = new Connector(this.protocol);
  tomcat.getService().addConnector(connector);
  customizeConnector(connector);
  tomcat.setConnector(connector);
  tomcat.getHost().setAutoDeploy(false);
  configureEngine(tomcat.getEngine());
  for (Connector additionalConnector : this.additionalTomcatConnectors) {
    tomcat.getService().addConnector(additionalConnector);
  }
  prepareContext(tomcat.getHost(), initializers);
  // 返回TomcatWebServer服务
  return getTomcatWebServer(tomcat);
}
```

启动 `Tomcat` 服务器


### 9. 刷新后处理

> afterRefresh() 是个空实现，留着后期扩展

```java
protected void afterRefresh(ConfigurableApplicationContext context,	ApplicationArguments args) {
	// TODO
}
```

### 10. 发布监听应用启动事件

```java
public void started(ConfigurableApplicationContext context) {
  context.publishEvent(new ApplicationStartedEvent(this.application, this.args, context));
}
```

这里是调用 `context.publishEvent()` 方法，发布应用启动事件 `ApplicationStartedEvent`

### 11. 执行 Runner

> 获取所有的 ApplicationRunner 和 CommandLineRunner 来初始化一些参数
>
> callRunner() 是一个回调函数

```java
private void callRunners(ApplicationContext context, ApplicationArguments args) {
  List<Object> runners = new ArrayList<>();
  runners.addAll(context.getBeansOfType(ApplicationRunner.class).values());
  runners.addAll(context.getBeansOfType(CommandLineRunner.class).values());
  AnnotationAwareOrderComparator.sort(runners);
  for (Object runner : new LinkedHashSet<>(runners)) {
    if (runner instanceof ApplicationRunner) {
      callRunner((ApplicationRunner) runner, args);
    }
    if (runner instanceof CommandLineRunner) {
      callRunner((CommandLineRunner) runner, args);
    }
  }
}
```

### 12. 发布应用就绪事件

```java
listeners.running(context);
```

```java
public void running(ConfigurableApplicationContext context) {
	context.publishEvent(new ApplicationReadyEvent(this.application, this.args, context));
}
```

这段代码看上去似曾相识，前面有很多类似的代码，不同的是这里上下文准备完成之后发布了一个 `ApplicationReadyEvent` 事件，声明一下应用上下文准备完成

## 版本差异(Spring Boot 2.1.5 → 3.5.x)

| 特性 | 旧版（2.1.5.RELEASE） | 当前（3.5.x） |
|------|------------------------|---------------|
| JDK | JDK 8+ | JDK 17-24 |
| Spring 版本 | Spring 5.1.x | Spring 6.2.x |
| 自动配置注册 | 仅 spring.factories | spring.factories + AutoConfiguration.imports |
| 启动类注解 | @SpringBootApplication（不变） | 语义一致，新增 @AutoConfiguration 用于自动配置类 |
| 初始化器/监听器 | getSpringFactoriesInstances（spring.factories） | 仍从 spring.factories 加载，逻辑不变 |
| Web 容器 | Tomcat 9（javax） | Tomcat 10.1（jakarta） |

> 核心启动流程（构造 SpringApplication → deduceFromClasspath 推断 Web 类型 → 加载初始化器/监听器 → run() 创建环境/容器/刷新 → 发布 ApplicationReadyEvent）在 3.5.x 中完全一致，源码分析思路可复用；差异主要集中在注册机制（imports 文件）与包名（jakarta）上。