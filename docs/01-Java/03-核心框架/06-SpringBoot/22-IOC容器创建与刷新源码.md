---
title: "IOC 容器创建与刷新源码"
description: "Debug 视角走读 Spring IOC 容器的创建与 refresh() 全流程：prepareContext 加载 BeanDefinition、BeanFactory 预处理与后处理、ConfigurationClassPostProcessor 配置类解析、BeanPostProcessor 注册与执行时机、finishRefresh 与嵌入式容器创建（基于 Spring Boot 2.x 源码）。"
keywords: [IOC 容器, refresh 源码, BeanFactory, BeanPostProcessor, ConfigurationClassPostProcessor]
category: "Java"
tags: [Java, SpringBoot]
---


# IOC 容器创建与刷新源码

> **版本基准**：本文基于 Spring Boot 2.x / Spring Framework 5.x 源码撰写（`refresh()` 中的 `startupShutdownMonitor` 在 Spring Framework 6.1 中已改为 `ReentrantLock` 实现，其余模板流程不变）。

## 创建、初始化 IOC 容器

### IOC：创建、初始化IOC容器


（本篇文章篇幅较长且有重要内容 **`BeanDefinition`**，小伙伴一定要仔细阅读和理解）

#### 4. run：启动SpringApplication

```java
public ConfigurableApplicationContext run(String... args) {
    // ...
    try {
        // ...
        // 4.6 如果有配置 spring.beaninfo.ignore，则将该配置设置进系统参数
        configureIgnoreBeanInfo(environment);
        // 4.7 打印SpringBoot的banner
        Banner printedBanner = printBanner(environment);
        // 4.8 创建ApplicationContext
        context = createApplicationContext();
        // 初始化异常报告器
        exceptionReporters = getSpringFactoriesInstances(SpringBootExceptionReporter.class,
                new Class[] { ConfigurableApplicationContext.class }, context);
        // 4.9 初始化IOC容器
        prepareContext(context, environment, listeners, applicationArguments, printedBanner);
        // ...
}
```

##### 4.6 configureIgnoreBeanInfo：设置系统参数

```java
public static final String IGNORE_BEANINFO_PROPERTY_NAME = "spring.beaninfo.ignore";

private void configureIgnoreBeanInfo(ConfigurableEnvironment environment) {
    if (System.getProperty(CachedIntrospectionResults.IGNORE_BEANINFO_PROPERTY_NAME) == null) {
        Boolean ignore = environment.getProperty("spring.beaninfo.ignore", Boolean.class, Boolean.TRUE);
        System.setProperty(CachedIntrospectionResults.IGNORE_BEANINFO_PROPERTY_NAME, ignore.toString());
    }
}
```

它提到了一个配置：`spring.beaninfo.ignore`，我们没见过他也没配置过，那就只好借助文档注释。在文档注释中有一句话比较关键：

> "spring.beaninfo.ignore", with a value of "true" skipping the search for BeanInfo classes (typically for scenarios where no such classes are being defined for beans in the application in the first place).“spring.beaninfo.ignore” 的值为 “true” 时，跳过对 BeanInfo 类的搜索（通常用于应用中的 Bean 本就没有定义对应 BeanInfo 类的情况）。

由此可知，它是控制是否跳过 `BeanInfo` 类的搜索，并且由源码可知默认值是true，不作过多研究。

##### 4.7 printBanner：打印Banner

在阅读这部分源码之前，先看看 `Banner` 到底是什么。

【如果小伙伴仅仅是知道 `Banner`，不妨继续往下看看。对 `Banner` 很熟悉的小伙伴可以跳过4.7.0节】

###### 4.7.0 Banner和它的实现类

```java
public interface Banner {

void printBanner(Environment environment, Class<?> sourceClass, PrintStream out);

    enum Mode {
        OFF,
        CONSOLE,
        LOG
    }
}
```

它是一个接口，并且内置了一个枚举类型，代表 Banner 输出的模式（关闭、控制台打印、日志输出）。

借助IDEA，可以发现它的实现类中，第一眼应该关注的就是最熟悉的 `SpringBootBanner`。翻看它的源码：

```java
class SpringBootBanner implements Banner {

private static final String[] BANNER = { "", "  .   ____          _            __ _ _",
            " /\\\\ / ___'_ __ _ _(_)_ __  __ _ \\ \\ \\ \\", "( ( )\\___ | '_ | '_| | '_ \\/ _` | \\ \\ \\ \\",
            " \\\\/  ___)| |_)| | | | | || (_| |  ) ) ) )", "  '  |____| .__|_| |_|_| |_\\__, | / / / /",
            " =========|_|==============|___/=/_/_/_/" };

private static final String SPRING_BOOT = " :: Spring Boot :: ";

private static final int STRAP_LINE_SIZE = 42;

@Override
    public void printBanner(Environment environment, Class<?> sourceClass, PrintStream printStream) {
        // 先打印Banner内容
        for (String line : BANNER) {
            printStream.println(line);
        }
         // 打印SpringBoot的版本
        String version = SpringBootVersion.getVersion();
        version = (version != null) ? " (v" + version + ")" : "";
        StringBuilder padding = new StringBuilder();
        while (padding.length() < STRAP_LINE_SIZE - (version.length() + SPRING_BOOT.length())) {
            padding.append(" ");
        }

printStream.println(AnsiOutput.toString(AnsiColor.GREEN, SPRING_BOOT, AnsiColor.DEFAULT, padding.toString(),
                AnsiStyle.FAINT, version));
        printStream.println();
    }

}
```

看到了上面一堆奇怪但又有些熟悉的东西，常量名是 `BANNER`，它就是在默认情况下打印在控制台的 `Banner`。

它重写的 `printBanner` 方法，就是拿输出对象，把定义好的 Banner 和 SpringBoot 的版本号打印出去，逻辑比较简单。

回到 `printBanner` 中，看它的源码：

```java
private Banner.Mode bannerMode = Banner.Mode.CONSOLE;

private Banner printBanner(ConfigurableEnvironment environment) {
    if (this.bannerMode == Banner.Mode.OFF) {
        return null;
    }
    // Banner文件资源加载
    ResourceLoader resourceLoader = (this.resourceLoader != null) ? this.resourceLoader
            : new DefaultResourceLoader(getClassLoader());
    // 使用BannerPrinter打印Banner
    SpringApplicationBannerPrinter bannerPrinter = new SpringApplicationBannerPrinter(resourceLoader, this.banner);
    if (this.bannerMode == Mode.LOG) {
        return bannerPrinter.print(environment, this.mainApplicationClass, logger);
    }
    return bannerPrinter.print(environment, this.mainApplicationClass, System.out);
}
```

首先判断当前是否关闭了 Banner 输出，而默认值是打在控制台上。

之后要获取 `ResourceLoader`，它的作用大概可以猜测到是加载资源的。

###### 4.7.1 ResourceLoader

```java
public interface ResourceLoader {

/** Pseudo URL prefix for loading from the class path: "classpath:". */
    String CLASSPATH_URL_PREFIX = ResourceUtils.CLASSPATH_URL_PREFIX;

Resource getResource(String location);

@Nullable
    ClassLoader getClassLoader();

}
```

它的文档注释原文翻译：

> Strategy interface for loading resources (e.g. class path or file system resources).用于加载资源（例如类路径或文件系统资源）的策略接口。

从接口定义和文档注释，已经基本证实了我们的猜测是正确的。上面方法默认创建的是 `DefaultResourceLoader`，看它的 `getResource` 方法：

```java
public Resource getResource(String location) {
    Assert.notNull(location, "Location must not be null");

for (ProtocolResolver protocolResolver : getProtocolResolvers()) {
        Resource resource = protocolResolver.resolve(location, this);
        if (resource != null) {
            return resource;
        }
    }

    // 处理前缀
    if (location.startsWith("/")) {
        return getResourceByPath(location);
    }
    else if (location.startsWith(CLASSPATH_URL_PREFIX)) {
        return new ClassPathResource(location.substring(CLASSPATH_URL_PREFIX.length()), getClassLoader());
    }
    else {
        // try块中加载资源
        try {
            // Try to parse the location as a URL...
            URL url = new URL(location);
            return (ResourceUtils.isFileURL(url) ? new FileUrlResource(url) : new UrlResource(url));
        }
        catch (MalformedURLException ex) {
            // No URL -> resolve as resource path.
            return getResourceByPath(location);
        }
    }
}
```

前面的实现都可以不看，注意最后的try块中，它借助URL类来加载资源，这种方式已经跟 classLoader 的方式差不太多了，至此石锤我们的猜测是正确的。

回到 `printBanner` 中：

```java
    // ...
    ResourceLoader resourceLoader = (this.resourceLoader != null) ? this.resourceLoader
            : new DefaultResourceLoader(getClassLoader());
    SpringApplicationBannerPrinter bannerPrinter = new SpringApplicationBannerPrinter(resourceLoader, this.banner);
    if (this.bannerMode == Mode.LOG) {
        return bannerPrinter.print(environment, this.mainApplicationClass, logger);
    }
    return bannerPrinter.print(environment, this.mainApplicationClass, System.out);
```

获取到 `ResourceLoader` 后，下面要创建一个 `SpringApplicationBannerPrinter` ，默认情况下最终调用到最后的return中。

###### 4.7.2 SpringApplicationBannerPrinter#print

```java
public Banner print(Environment environment, Class<?> sourceClass, PrintStream out) {
    Banner banner = getBanner(environment);
    banner.printBanner(environment, sourceClass, out);
    return new PrintedBanner(banner, sourceClass);
}
```

首先它要获取 `Banner`，之后打印 `Banner`，最后把 `Banner` 封装成 `PrintedBanner` 返回。

###### 4.7.2.1 getBanner：获取Banner

```java
private static final Banner DEFAULT_BANNER = new SpringBootBanner();

private Banner getBanner(Environment environment) {
    Banners banners = new Banners();
    // 先加载图片Banner和文字Banner
    banners.addIfNotNull(getImageBanner(environment));
    banners.addIfNotNull(getTextBanner(environment));
    // 只要有一个，就返回
    if (banners.hasAtLeastOneBanner()) {
        return banners;
    }
    if (this.fallbackBanner != null) {
        return this.fallbackBanner;
    }
    // 都没有，返回默认的
    return DEFAULT_BANNER;
}
```

很明显它要先试着找有没有 `图片Banner` 和 `文字Banner` ，如果都没有，则会取默认的 Banner，而这个 Banner 恰好就是一开始看到的，也是我们最熟悉的 Banner。

以获取 文字Banner 为例，看看它是怎么拿的：

###### 4.7.2.2 getTextBanner

```java
static final String BANNER_LOCATION_PROPERTY = "spring.banner.location";
static final String DEFAULT_BANNER_LOCATION = "banner.txt";

private Banner getTextBanner(Environment environment) {
    String location = environment.getProperty(BANNER_LOCATION_PROPERTY, DEFAULT_BANNER_LOCATION);
    Resource resource = this.resourceLoader.getResource(location);
    if (resource.exists()) {
        return new ResourceBanner(resource);
    }
    return null;
}
```

首先它要看你有没有显式的在 `application.properties` 中配置 `spring.banner.location` 这个属性，如果有，就加载它，否则加载默认的位置，叫 `banner.txt`。

由此可见 SpringBoot 的设计原则：**约定大于配置**。

拿到 Banner 后，打印，返回，Banner 部分结束。

##### 4.8 createApplicationContext：创建IOC容器

```java
public static final String DEFAULT_CONTEXT_CLASS = "org.springframework.context."
        + "annotation.AnnotationConfigApplicationContext";
public static final String DEFAULT_SERVLET_WEB_CONTEXT_CLASS = "org.springframework.boot."
        + "web.servlet.context.AnnotationConfigServletWebServerApplicationContext";
public static final String DEFAULT_REACTIVE_WEB_CONTEXT_CLASS = "org.springframework."
        + "boot.web.reactive.context.AnnotationConfigReactiveWebServerApplicationContext";

protected ConfigurableApplicationContext createApplicationContext() {
    Class<?> contextClass = this.applicationContextClass;
    if (contextClass == null) {
        try {
            // 根据Web应用类型决定实例化哪个IOC容器
            switch (this.webApplicationType) {
                case SERVLET:
                    contextClass = Class.forName(DEFAULT_SERVLET_WEB_CONTEXT_CLASS);
                    break;
                case REACTIVE:
                    contextClass = Class.forName(DEFAULT_REACTIVE_WEB_CONTEXT_CLASS);
                    break;
                default:
                    contextClass = Class.forName(DEFAULT_CONTEXT_CLASS);
            }
        }
        catch (ClassNotFoundException ex) {
            throw new IllegalStateException(
                    "Unable create a default ApplicationContext, " + "please specify an ApplicationContextClass",
                    ex);
        }
    }
    return (ConfigurableApplicationContext) BeanUtils.instantiateClass(contextClass);
}
```

可以发现都是创建的基于Annotation的 **ApplicationContext**。

（如果是非Web环境，创建的 `ApplicationContext` 与常规用 SpringFramework 时使用的注解驱动IOC容器一致）

注意 `BeanFactory` 在这里已经被创建了：

```java
public GenericApplicationContext() {
    this.beanFactory = new DefaultListableBeanFactory();
}
```

之前分析过，默认导入 `spring-boot-start-web` 时，**Servlet**环境生效，故上面导入的类为：`AnnotationConfigServletWebServerApplicationContext` 。这个类将在后续的分析中大量出现。

到这里，咱对三种类型的运行时环境、IOC容器的类型归纳一下：

- Servlet - `StandardServletEnvironment` - `AnnotationConfigServletWebServerApplicationContext`
- Reactive - `StandardReactiveWebEnvironment` - `AnnotationConfigReactiveWebServerApplicationContext`
- None - `StandardEnvironment` - `AnnotationConfigApplicationContext`

##### 4.9 prepareContext：初始化IOC容器

先大体浏览这部分源码的内容，其中几个复杂的地方我们单独来看。

```java
private void prepareContext(ConfigurableApplicationContext context, ConfigurableEnvironment environment,
        SpringApplicationRunListeners listeners, ApplicationArguments applicationArguments, Banner printedBanner) {
    // 将创建好的应用环境设置到IOC容器中
    context.setEnvironment(environment);
    // 4.9.1 IOC容器的后置处理
    postProcessApplicationContext(context);
    // 4.9.2 执行Initializer
    applyInitializers(context);
    // 【回调】SpringApplicationRunListeners的contextPrepared方法（在创建和准备ApplicationContext之后，但在加载之前）
    listeners.contextPrepared(context);
    if (this.logStartupInfo) {
        logStartupInfo(context.getParent() == null);
        logStartupProfileInfo(context);
    }
    // Add boot specific singleton beans
    ConfigurableListableBeanFactory beanFactory = context.getBeanFactory();
    // 创建两个组件：在控制台打印Banner的，之前把main方法中参数封装成对象的组件
    beanFactory.registerSingleton("springApplicationArguments", applicationArguments);
    if (printedBanner != null) {
        beanFactory.registerSingleton("springBootBanner", printedBanner);
    }
    if (beanFactory instanceof DefaultListableBeanFactory) {
        ((DefaultListableBeanFactory) beanFactory)
                .setAllowBeanDefinitionOverriding(this.allowBeanDefinitionOverriding);
    }
    // Load the sources
    // 4.9.3 加载主启动类
    Set<Object> sources = getAllSources();
    Assert.notEmpty(sources, "Sources must not be empty");
    // 4.9.4 注册主启动类
    load(context, sources.toArray(new Object[0]));
    // 【回调】SpringApplicationRunListeners的contextLoaded方法（ApplicationContext已加载但在刷新之前）
    listeners.contextLoaded(context);
}
```

###### 4.9.1 postProcessApplicationContext：IOC容器的后置处理

```java
// 留意一下这个名，后面Debug的时候会看到
public static final String CONFIGURATION_BEAN_NAME_GENERATOR =
			"org.springframework.context.annotation.internalConfigurationBeanNameGenerator";

protected void postProcessApplicationContext(ConfigurableApplicationContext context) {
    // 注册BeanName生成器
    if (this.beanNameGenerator != null) {
        context.getBeanFactory().registerSingleton(AnnotationConfigUtils.CONFIGURATION_BEAN_NAME_GENERATOR,
                this.beanNameGenerator);
    }
    // 设置资源加载器和类加载器
    if (this.resourceLoader != null) {
        if (context instanceof GenericApplicationContext) {
            ((GenericApplicationContext) context).setResourceLoader(this.resourceLoader);
        }
        if (context instanceof DefaultResourceLoader) {
            ((DefaultResourceLoader) context).setClassLoader(this.resourceLoader.getClassLoader());
        }
    }
    // 设置类型转换器
    if (this.addConversionService) {
        context.getBeanFactory().setConversionService(ApplicationConversionService.getSharedInstance());
    }
}
```

它设置了几个组件：

- 如果 `beanNameGenerator` 不为空，则把它注册到IOC容器中。 `BeanNameGenerator` 是Bean的name生成器，指定的 `CONFIGURATION_BEAN_NAME_GENERATOR` 在修改首字母大写后无法从IDEA索引到，暂且放置一边。
- `ResourceLoader` 和 `ClassLoader`，这些都在前面准备好了
- `ConversionService`，用于类型转换的工具，前面也准备好了，并且还做了容器共享

###### 4.9.2 applyInitializers：执行Initializer

```java
protected void applyInitializers(ConfigurableApplicationContext context) {
    for (ApplicationContextInitializer initializer : getInitializers()) {
        Class<?> requiredType = GenericTypeResolver.resolveTypeArgument(initializer.getClass(),
                ApplicationContextInitializer.class);
        Assert.isInstanceOf(requiredType, context, "Unable to call initializer.");
        initializer.initialize(context);
    }
}
```

这个方法会获取到所有 Initializer，调用initialize方法。而这些 Initializer，其实就是刚创建 `SpringApplication` 时准备的那些 `ApplicationContextInitializer`。

通过Debug发现默认情况下确实是那6个 Initializer ：

来到 prepareContext 的最后几行：

```java
    // Load the sources
    // 4.9.3 加载主启动类
    Set<Object> sources = getAllSources();
    Assert.notEmpty(sources, "Sources must not be empty");
    // 4.9.4 注册主启动类
    load(context, sources.toArray(new Object[0]));
```

###### 4.9.3 getAllSources

```java
private Set<Class<?>> primarySources;
private Set<String> sources = new LinkedHashSet<>();

public Set<Object> getAllSources() {
    Set<Object> allSources = new LinkedHashSet<>();
    if (!CollectionUtils.isEmpty(this.primarySources)) {
        allSources.addAll(this.primarySources);
    }
    if (!CollectionUtils.isEmpty(this.sources)) {
        allSources.addAll(this.sources);
    }
    return Collections.unmodifiableSet(allSources);
}
```

它要加载 primarySources 和 sources 。

在之前分析的时候， primarySources 已经被设置过了，就是主启动类。sources 不清楚也没见过，通过Debug发现它确实为空。

也就是说，getAllSources 实际上是把主启动类加载进来了。

加载进来之后，就要注册进去，来到load方法：

###### 4.9.4 【复杂】load

```java
protected void load(ApplicationContext context, Object[] sources) {
    if (logger.isDebugEnabled()) {
        logger.debug("Loading source " + StringUtils.arrayToCommaDelimitedString(sources));
    }
    BeanDefinitionLoader loader = createBeanDefinitionLoader(getBeanDefinitionRegistry(context), sources);
    // 设置BeanName生成器，通过Debug发现此时它还没有被注册
    if (this.beanNameGenerator != null) {
        loader.setBeanNameGenerator(this.beanNameGenerator);
    }
    // 设置资源加载器
    if (this.resourceLoader != null) {
        loader.setResourceLoader(this.resourceLoader);
    }
    // 设置运行环境
    if (this.environment != null) {
        loader.setEnvironment(this.environment);
    }
    loader.load();
}
```

在调用 `createBeanDefinitionLoader` 方法之前，它先获取了 `BeanDefinitionRegistry` 。

###### 4.9.4.1 getBeanDefinitionRegistry

```java
private BeanDefinitionRegistry getBeanDefinitionRegistry(ApplicationContext context) {
    if (context instanceof BeanDefinitionRegistry) {
        return (BeanDefinitionRegistry) context;
    }
    if (context instanceof AbstractApplicationContext) {
        return (BeanDefinitionRegistry) ((AbstractApplicationContext) context).getBeanFactory();
    }
    throw new IllegalStateException("Could not locate BeanDefinitionRegistry");
}
```

发现它在拿IOC容器进行类型判断和强转。

前面分析了，我们最终拿到的IOC容器是 `AnnotationConfigServletWebServerApplicationContext`，它的类继承结构：

```java
public class AnnotationConfigServletWebServerApplicationContext extends ServletWebServerApplicationContext
		implements AnnotationConfigRegistry
public class ServletWebServerApplicationContext extends GenericWebApplicationContext
		implements ConfigurableWebServerApplicationContext
public class GenericWebApplicationContext extends GenericApplicationContext
		implements ConfigurableWebApplicationContext, ThemeSource
public class GenericApplicationContext extends AbstractApplicationContext implements BeanDefinitionRegistry
```

它继承自 `GenericApplicationContext`，而 `GenericApplicationContext` 就继承了 `AbstractApplicationContext`，实现了 `BeanDefinitionRegistry` 接口。

所以上面的源码实际上**把IOC容器返回去了**。

###### 4.9.4.2 createBeanDefinitionLoader

拿到IOC容器后，进入 `createBeanDefinitionLoader` 方法：

```java
protected BeanDefinitionLoader createBeanDefinitionLoader(BeanDefinitionRegistry registry, Object[] sources) {
    return new BeanDefinitionLoader(registry, sources);
}
```

源码非常简单，直接new了一个 `BeanDefinitionLoader` 。那 `BeanDefinitionLoader` 的构造方法都干了什么呢？

```java
BeanDefinitionLoader(BeanDefinitionRegistry registry, Object... sources) {
    Assert.notNull(registry, "Registry must not be null");
    Assert.notEmpty(sources, "Sources must not be empty");
    this.sources = sources;
    // 注册BeanDefinition解析器
    this.annotatedReader = new AnnotatedBeanDefinitionReader(registry);
    this.xmlReader = new XmlBeanDefinitionReader(registry);
    if (isGroovyPresent()) {
        this.groovyReader = new GroovyBeanDefinitionReader(registry);
    }
    this.scanner = new ClassPathBeanDefinitionScanner(registry);
    this.scanner.addExcludeFilter(new ClassExcludeFilter(sources));
}
```

这里面发现了几个关键的组件：`AnnotatedBeanDefinitionReader`（注解驱动的Bean定义解析器）、`XmlBeanDefinitionReader`（Xml定义的Bean定义解析器）、`ClassPathBeanDefinitionScanner`（类路径下的Bean定义扫描器），还有一个我们不用的 `GroovyBeanDefinitionReader`（它需要经过isGroovyPresent方法，而这个方法需要判断classpath下是否有 `groovy.lang.MetaClass` 类）。

`BeanDefinitionLoader` 的文档注释原文翻译：

> Loads bean definitions from underlying sources, including XML and JavaConfig. Acts as a simple facade over AnnotatedBeanDefinitionReader, XmlBeanDefinitionReader and ClassPathBeanDefinitionScanner.从基础源（包括XML和JavaConfig）加载bean定义。充当 AnnotatedBeanDefinitionReader，XmlBeanDefinitionReader 和 ClassPathBeanDefinitionScanner 的简单外观（整合，外观模式）。

正好呼应了上面的组件，而且它使用了外观模式，将这几个组件整合了起来。

###### 4.9.4.3 load

创建好解析器后，在上面的源码中，它又往loader中设置了 beanNameGenerator、resourceLoader、environment，最后调用了它的load方法。

```java
public int load() {
    int count = 0;
    for (Object source : this.sources) {
        count += load(source);
    }
    return count;
}
```

它拿到所有的 sources（其实就主启动类一个），继续调用重载的load方法：

```java
private int load(Object source) {
    Assert.notNull(source, "Source must not be null");
    // 根据传入source的类型，决定如何解析
    if (source instanceof Class<?>) {
        return load((Class<?>) source);
    }
    if (source instanceof Resource) {
        return load((Resource) source);
    }
    if (source instanceof Package) {
        return load((Package) source);
    }
    if (source instanceof CharSequence) {
        return load((CharSequence) source);
    }
    throw new IllegalArgumentException("Invalid source type " + source.getClass());
}
```

它会根据传入的 source 的类型，来决定用哪种方式加载。主启动类属于 `Class` 类型，于是继续调用重载的方法：

```java
private int load(Class<?> source) {
    if (isGroovyPresent() && GroovyBeanDefinitionSource.class.isAssignableFrom(source)) {
        // Any GroovyLoaders added in beans{} DSL can contribute beans here
        GroovyBeanDefinitionSource loader = BeanUtils.instantiateClass(source, GroovyBeanDefinitionSource.class);
        load(loader);
    }
    // 如果它是一个Component，则用注解解析器来解析它
    if (isComponent(source)) {
        this.annotatedReader.register(source);
        return 1;
    }
    return 0;
}
```

上面的 Groovy 相关的我们不关心，下面它要检测是否为一个 **Component**。

回想主启动类，它被 `@SpringBootApplication` 注解标注，而 `@SpringBootApplication` 组合了一个 `@SpringBootConfiguration`，它又组合了一个 `@Configuration` 注解，`@Configuration` 的底层就是一个 `@Component` 。

```java
@SpringBootConfiguration
@EnableAutoConfiguration
@ComponentScan(excludeFilters = { @Filter(type = FilterType.CUSTOM, classes = TypeExcludeFilter.class),
		@Filter(type = FilterType.CUSTOM, classes = AutoConfigurationExcludeFilter.class) })
public @interface SpringBootApplication

@Configuration
public @interface SpringBootConfiguration

@Component
public @interface Configuration
```

所以主启动类是一个 Component，进入 `annotatedReader` 的 `register` 方法中。

###### 4.9.4.4 annotatedReader.register

```java
public void registerBean(Class<?> beanClass) {
    doRegisterBean(beanClass, null, null, null);
}
```

【**规律总结**】SpringFramework 和 SpringBoot中 有很多类似于 **xxx** 方法和 **doXXX** 方法。一般情况下，xxx方法负责引导到 **doXXX** 方法，**doXXX** 方法负责真正的逻辑和工作。

进入 `doRegisterBean` 中：

###### 4.9.4.5 doRegisterBean

（源码较长，不太复杂的部分直接在源码上标注单行注释了）

```java
<T> void doRegisterBean(Class<T> beanClass, @Nullable Supplier<T> instanceSupplier, @Nullable String name,
        @Nullable Class<? extends Annotation>[] qualifiers, BeanDefinitionCustomizer... definitionCustomizers) {

// 包装为BeanDefinition
    AnnotatedGenericBeanDefinition abd = new AnnotatedGenericBeanDefinition(beanClass);
    if (this.conditionEvaluator.shouldSkip(abd.getMetadata())) {
        return;
    }

abd.setInstanceSupplier(instanceSupplier);
    // 解析Scope信息，决定作用域
    ScopeMetadata scopeMetadata = this.scopeMetadataResolver.resolveScopeMetadata(abd);
    abd.setScope(scopeMetadata.getScopeName());
    // 生成Bean的名称
    String beanName = (name != null ? name : this.beanNameGenerator.generateBeanName(abd, this.registry));

// 解析BeanDefinition的注解
    AnnotationConfigUtils.processCommonDefinitionAnnotations(abd);
    if (qualifiers != null) {
        for (Class<? extends Annotation> qualifier : qualifiers) {
            if (Primary.class == qualifier) {
                abd.setPrimary(true);
            }
            else if (Lazy.class == qualifier) {
                abd.setLazyInit(true);
            }
            else {
                abd.addQualifier(new AutowireCandidateQualifier(qualifier));
            }
        }
    }
    // 使用定制器修改这个BeanDefinition
    for (BeanDefinitionCustomizer customizer : definitionCustomizers) {
        customizer.customize(abd);
    }

    // 使用BeanDefinitionHolder，将BeanDefinition注册到IOC容器中
    BeanDefinitionHolder definitionHolder = new BeanDefinitionHolder(abd, beanName);
    definitionHolder = AnnotationConfigUtils.applyScopedProxyMode(scopeMetadata, definitionHolder, this.registry);
    BeanDefinitionReaderUtils.registerBeanDefinition(definitionHolder, this.registry);
}
```

其中 `AnnotationConfigUtils.processCommonDefinitionAnnotations` 的实现：

```java
public static void processCommonDefinitionAnnotations(AnnotatedBeanDefinition abd) {
    processCommonDefinitionAnnotations(abd, abd.getMetadata());
}

static void processCommonDefinitionAnnotations(AnnotatedBeanDefinition abd, AnnotatedTypeMetadata metadata) {
    // 解析@Lazy
    AnnotationAttributes lazy = attributesFor(metadata, Lazy.class);
    if (lazy != null) {
        abd.setLazyInit(lazy.getBoolean("value"));
    }
    else if (abd.getMetadata() != metadata) {
        lazy = attributesFor(abd.getMetadata(), Lazy.class);
        if (lazy != null) {
            abd.setLazyInit(lazy.getBoolean("value"));
        }
    }

// 解析@Primary
    if (metadata.isAnnotated(Primary.class.getName())) {
        abd.setPrimary(true);
    }
    // 解析@DependsOn
    AnnotationAttributes dependsOn = attributesFor(metadata, DependsOn.class);
    if (dependsOn != null) {
        abd.setDependsOn(dependsOn.getStringArray("value"));
    }

    // 解析@Role
    AnnotationAttributes role = attributesFor(metadata, Role.class);
    if (role != null) {
        abd.setRole(role.getNumber("value").intValue());
    }
    // 解析@Description
    AnnotationAttributes description = attributesFor(metadata, Description.class);
    if (description != null) {
        abd.setDescription(description.getString("value"));
    }
}
```

原来这部分是在解析一些咱之前学习 SpringFramework 时候接触的注解啊！

最终会将这个 BeanDefinition 注册到IOC容器中，调用 `BeanDefinitionReaderUtils` 的 `registerBeanDefinition` 方法。

###### 4.9.4.6 BeanDefinitionReaderUtils.registerBeanDefinition

```java
public static void registerBeanDefinition(
        BeanDefinitionHolder definitionHolder, BeanDefinitionRegistry registry)
        throws BeanDefinitionStoreException {

// Register bean definition under primary name.
    String beanName = definitionHolder.getBeanName();
    registry.registerBeanDefinition(beanName, definitionHolder.getBeanDefinition());

    // Register aliases for bean name, if any.
    String[] aliases = definitionHolder.getAliases();
    if (aliases != null) {
        for (String alias : aliases) {
            registry.registerAlias(beanName, alias);
        }
    }
}
```

第7行，看到了 `registry.registerBeanDefinition`，有没有想起来之前在之前介绍手动装配时的 `ImportBeanDefinitionRegistrar`？（第21篇 自动配置与 Starter 机制中，4.1.4小节）

在这里它就是这么把Bean的定义信息注册进IOC容器的。其中，Bean的名称和别名在这个方法也被分开处理。

看到这里，小伙伴们可能会疑惑，这个 **BeanDefinition** 是个什么东西，它在IOC容器中起到了什么作用呢？

###### 4.9.5 【重要】BeanDefinition

它的文档注释原文翻译：

> A BeanDefinition describes a bean instance, which has property values, constructor argument values, and further information supplied by concrete implementations. This is just a minimal interface: The main intention is to allow a BeanFactoryPostProcessor such as PropertyPlaceholderConfigurer to introspect and modify property values and other bean metadata.BeanDefinition 描述了一个bean实例，该实例具有属性值，构造函数参数值以及具体实现所提供的更多信息。这只是一个最小的接口：主要目的是允许 BeanFactoryPostProcessor （例如 PropertyPlaceholderConfigurer ）内省和修改属性值和其他bean元数据。

从文档注释中可以看出，它是描述Bean的实例的一个定义信息，但它不是真正的Bean。这个接口还定义了很多方法，不一一列举，全部的方法定义小伙伴们可以自行从IDE中了解。

- `String getBeanClassName();`
- `String getScope();`
- `String[] getDependsOn();`
- `String getInitMethodName();`
- `boolean isSingleton();`
- .....

`SpringFramework` 设计的这种机制会在后续的Bean加载和创建时起到非常关键的作用，小伙伴们一定要留意。

下面提到了一个 `BeanPostProcessor` ，这个概念我们到下一篇再了解。

#### 小结

1. Banner在初始化运行时环境之后，创建IOC容器之前打印。
2. SpringApplication 会根据前面确定好的应用类型，创建对应的IOC容器。
3. IOC容器在刷新之前会进行初始化、加载主启动类等预处理工作。

【至此，主启动类也被注册进IOC容器中，IOC容器已经准备好，下面的几篇将是IOC容器最核心的部分：**refresh**】

### IOC：刷新容器-BeanFactory的预处理

（接下来的几篇将会有非常多的干货，小伙伴们一定要好好理解好好消化）

（因为IOC容器的刷新部分实在太多而且复杂，这部分将不延续之前文章的标号，单独成编号体系）


```java
        prepareContext(context, environment, listeners, applicationArguments, printedBanner);
        refreshContext(context);
        afterRefresh(context, applicationArguments);
```

上一篇IOC容器已经准备好了，下面到了IOC容器最核心的部分：**refresh**。

#### 0. refreshContext

```java
private void refreshContext(ConfigurableApplicationContext context) {
    refresh(context);
    if (this.registerShutdownHook) {
        try {
            context.registerShutdownHook();
        }
        catch (AccessControlException ex) {
            // Not allowed in some environments.
        }
    }
}
```

它直接调了refresh方法（注意此时还是 SpringApplication，没有进到真正的IOC容器），后面又注册了一个关闭的钩子。这个 `registerShutdownHook` 方法的文档注释：

> Register a shutdown hook with the JVM runtime, closing this context on JVM shutdown unless it has already been closed at that time.向JVM运行时注册一个shutdown的钩子，除非JVM当时已经关闭，否则在JVM关闭时关闭上下文。

可以大概看出来，这个钩子的作用是监听JVM关闭时销毁IOC容器和里面的Bean。这里面有一个很经典的应用：应用停止时释放数据库连接池里面的连接。

下面咱来看这个refresh方法：

```java
protected void refresh(ApplicationContext applicationContext) {
    Assert.isInstanceOf(AbstractApplicationContext.class, applicationContext);
    ((AbstractApplicationContext) applicationContext).refresh();
}
```

没有什么复杂的逻辑，它会直接强转成 `AbstractApplicationContext`，调它的refresh方法。之前我们有了解过，`AbstractApplicationContext` 中的 **refresh** 是IOC容器启动时的最核心方法：

```java
//最终调到AbstractApplicationContext的refresh方法
public void refresh() throws BeansException, IllegalStateException {
    synchronized (this.startupShutdownMonitor) {
        // Prepare this context for refreshing.
        // 1. 初始化前的预处理
        prepareRefresh();

// Tell the subclass to refresh the internal bean factory.
        // 2. 获取BeanFactory，加载所有bean的定义信息（未实例化）
        ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();

// Prepare the bean factory for use in this context.
        // 3. BeanFactory的预处理配置
        prepareBeanFactory(beanFactory);

try {
            // Allows post-processing of the bean factory in context subclasses.
            // 4. 准备BeanFactory完成后进行的后置处理
            postProcessBeanFactory(beanFactory);

// Invoke factory processors registered as beans in the context.
            // 5. 执行BeanFactory创建后的后置处理器
            invokeBeanFactoryPostProcessors(beanFactory);

// Register bean processors that intercept bean creation.
            // 6. 注册Bean的后置处理器
            registerBeanPostProcessors(beanFactory);

// Initialize message source for this context.
            // 7. 初始化MessageSource
            initMessageSource();

// Initialize event multicaster for this context.
            // 8. 初始化事件派发器
            initApplicationEventMulticaster();

// Initialize other special beans in specific context subclasses.
            // 9. 子类的多态onRefresh
            onRefresh();

// Check for listener beans and register them.
            // 10. 注册监听器
            registerListeners();

//到此为止，BeanFactory已创建完成

// Instantiate all remaining (non-lazy-init) singletons.
            // 11. 初始化所有剩下的单例Bean
            finishBeanFactoryInitialization(beanFactory);

// Last step: publish corresponding event.
            // 12. 完成容器的创建工作
            finishRefresh();
        }

catch (BeansException ex) {
            if (logger.isWarnEnabled()) {
                logger.warn("Exception encountered during context initialization - " +
                        "cancelling refresh attempt: " + ex);
            }

// Destroy already created singletons to avoid dangling resources.
            destroyBeans();

// Reset 'active' flag.
            cancelRefresh(ex);

// Propagate exception to caller.
            throw ex;
        }

        finally {
            // Reset common introspection caches in Spring's core, since we
            // might not ever need metadata for singleton beans anymore...
            // 13. 清除缓存
            resetCommonCaches();
        }
    }
}
```

这个方法非常长，一共有13个步骤，本篇我们来看前3个步骤：

```java
public void refresh() throws BeansException, IllegalStateException {
    synchronized (this.startupShutdownMonitor) {
        // Prepare this context for refreshing.
        // 1. 初始化前的预处理
        prepareRefresh();

// Tell the subclass to refresh the internal bean factory.
        // 2. 获取BeanFactory，加载所有bean的定义信息（未实例化）
        ConfigurableListableBeanFactory beanFactory = obtainFreshBeanFactory();

        // Prepare the bean factory for use in this context.
        // 3. BeanFactory的预处理配置
        prepareBeanFactory(beanFactory);
```

#### 1. prepareRefresh：初始化前的预处理

```java
protected void prepareRefresh() {
    this.startupDate = System.currentTimeMillis(); // 记录启动时间
    this.closed.set(false); // 标记IOC容器的关闭状态为false
    this.active.set(true); // 标记IOC容器已激活

if (logger.isInfoEnabled()) {
        logger.info("Refreshing " + this);
    }

// Initialize any placeholder property sources in the context environment
    // 1.1 初始化属性配置
    initPropertySources();

// Validate that all properties marked as required are resolvable
    // see ConfigurablePropertyResolver#setRequiredProperties
    // 1.2 属性校验
    getEnvironment().validateRequiredProperties();

    // Allow for the collection of early ApplicationEvents,
    // to be published once the multicaster is available...
    // 这个集合的作用，是保存容器中的一些事件，以便在合适的时候利用事件广播器来广播这些事件
    // 【配合registerListeners方法中的第三部分使用】
    this.earlyApplicationEvents = new LinkedHashSet<>();
}
```

最前面先记录启动时间，标记IOC容器状态，之后要开始初始化属性配置：

##### 1.1 initPropertySources：初始化属性配置

```java
protected void initPropertySources() {
    // For subclasses: do nothing by default.
}
```

这个方法是一个模板方法，留给子类重写，默认不做任何事情。

借助IDEA，发现这个方法在 `GenericWebApplicationContext` 中有重写，而 `AnnotationConfigServletWebServerApplicationContext` 恰好继承了它。

```java
protected void initPropertySources() {
    ConfigurableEnvironment env = getEnvironment();
    if (env instanceof ConfigurableWebEnvironment) {
        ((ConfigurableWebEnvironment) env).initPropertySources(this.servletContext, null);
    }
}
```

它最终又调到 `Environment` 的 `initPropertySources` 中。`StandardServletEnvironment` 是唯一重写这个方法的：

```java
public void initPropertySources(@Nullable ServletContext servletContext, @Nullable ServletConfig servletConfig) {
    WebApplicationContextUtils.initServletPropertySources(getPropertySources(), servletContext, servletConfig);
}
```

继续追踪 `WebApplicationContextUtils.initServletPropertySources`：

```java
public static final String SERVLET_CONTEXT_PROPERTY_SOURCE_NAME = "servletContextInitParams";
public static final String SERVLET_CONFIG_PROPERTY_SOURCE_NAME = "servletConfigInitParams";

public static void initServletPropertySources(MutablePropertySources sources,
        @Nullable ServletContext servletContext, @Nullable ServletConfig servletConfig) {

    Assert.notNull(sources, "'propertySources' must not be null");
    String name = StandardServletEnvironment.SERVLET_CONTEXT_PROPERTY_SOURCE_NAME;
    if (servletContext != null && sources.contains(name) && sources.get(name) instanceof StubPropertySource) {
        sources.replace(name, new ServletContextPropertySource(name, servletContext));
    }
    name = StandardServletEnvironment.SERVLET_CONFIG_PROPERTY_SOURCE_NAME;
    if (servletConfig != null && sources.contains(name) && sources.get(name) instanceof StubPropertySource) {
        sources.replace(name, new ServletConfigPropertySource(name, servletConfig));
    }
}
```

这个方法的文档注释：

> Replace Servlet-based stub property sources with actual instances populated with the given servletContext and servletConfig objects. This method is idempotent with respect to the fact it may be called any number of times but will perform replacement of stub property sources with their corresponding actual property sources once and only once.将基于Servlet的存根属性源替换为使用给定 ServletContext 和 ServletConfig 对象填充的实际实例。关于此方法可以调用任意次的事实，它是幂等的，但是将用其相应的实际属性源执行一次且仅一次的存根属性源替换。

通过大概的阅读文档注释和内部的两个if，可以大概确定它是把 Servlet 的一些初始化参数放入IOC容器中（类似于 web.xml 中的参数放入IOC容器）。

回到prepareRefresh方法：

```java
    initPropertySources();

    // Validate that all properties marked as required are resolvable
    // see ConfigurablePropertyResolver#setRequiredProperties
    // 1.2 属性校验
    getEnvironment().validateRequiredProperties();
```

##### 1.2 validateRequiredProperties：属性校验

```java
// AbstractEnvironment
public void validateRequiredProperties() throws MissingRequiredPropertiesException {
    this.propertyResolver.validateRequiredProperties();
}

// AbstractPropertyResolver
public void validateRequiredProperties() {
    MissingRequiredPropertiesException ex = new MissingRequiredPropertiesException();
    for (String key : this.requiredProperties) {
        if (this.getProperty(key) == null) {
            ex.addMissingRequiredProperty(key);
        }
    }
    if (!ex.getMissingRequiredProperties().isEmpty()) {
        throw ex;
    }
}
```

从调用的两步来看，它是要检验一些必需的属性是否为空，如果有null的属性会抛出异常。从源码的英文单行注释中可以看到，它与 `ConfigurablePropertyResolver` 的 `setRequiredProperties` 方法有关。翻看这个方法的文档注释：

> Specify which properties must be present, to be verified by validateRequiredProperties().指定必须存在哪些属性，以通过 validateRequiredProperties 方法进行验证。

它是说指定了属性，就可以通过 `validateRequiredProperties` 方法校验。那到底有没有字段校验呢？咱通过Debug来看一眼：

。。根本就没有要校验的。那这一步就跳过去吧。。

回到 `prepareRefresh` 方法：

```java
    getEnvironment().validateRequiredProperties();

    // Allow for the collection of early ApplicationEvents,
    // to be published once the multicaster is available...
    // 这个集合的作用，是保存容器中的一些事件，以便在合适的时候利用事件广播器来广播这些事件
    // 【配合registerListeners方法中的第三部分使用】
    this.earlyApplicationEvents = new LinkedHashSet<>();
```

这个早期事件，目前还不好解释，得联系后面的一个组件来解释。

#### 2. obtainFreshBeanFactory：获取BeanFactory，加载所有bean的定义信息

```java
protected ConfigurableListableBeanFactory obtainFreshBeanFactory() {
    // 2.1 刷新BeanFactory
    refreshBeanFactory();
    return getBeanFactory();
}
```

源码非常简单，先刷新后获取。

##### 2.1 refreshBeanFactory

```java
protected abstract void refreshBeanFactory() throws BeansException, IllegalStateException;
```

发现它是一个抽象方法，留给子类重写。对于XML配置的IOC容器，和注解配置的IOC容器，分别有一种实现。借助IDEA，发现 `GenericApplicationContext` 和 `AbstractRefreshableApplicationContext` 重写了它。根据前面的分析，`AnnotationConfigServletWebServerApplicationContext` 继承了 `GenericApplicationContext`，故咱来看它的 `refreshBeanFactory` 方法：

```java
protected final void refreshBeanFactory() throws IllegalStateException {
    if (!this.refreshed.compareAndSet(false, true)) {
        throw new IllegalStateException(
                "GenericApplicationContext does not support multiple refresh attempts: just call 'refresh' once");
    }
    this.beanFactory.setSerializationId(getId());
}
```

逻辑很简单，只是设置了 `BeanFactory` 的序列化ID而已。

###### 2.1.1 【扩展】基于XML的refreshBeanFactory

上面看到有两个子类重写了这个方法（XML和注解的），基于XML配置的IOC容器，在这一步要做的事情要更复杂，简单扫一眼：

```java
protected final void refreshBeanFactory() throws BeansException {
    if (hasBeanFactory()) {
        destroyBeans();
        closeBeanFactory();
    }
    try {
        // 创建BeanFactory
        DefaultListableBeanFactory beanFactory = createBeanFactory();
        beanFactory.setSerializationId(getId());
        // 自定义配置BeanFactory
        customizeBeanFactory(beanFactory);
        // 解析、加载XML中定义的BeanDefinition
        loadBeanDefinitions(beanFactory);
        synchronized (this.beanFactoryMonitor) {
            this.beanFactory = beanFactory;
        }
    }
    catch (IOException ex) {
        throw new ApplicationContextException("I/O error parsing bean definition source for " + getDisplayName(), ex);
    }
}

protected DefaultListableBeanFactory createBeanFactory() {
    return new DefaultListableBeanFactory(getInternalParentBeanFactory());
}

// 使用XmlBeanDefinitionReader做bean的装配（即解析xml）
protected void loadBeanDefinitions(DefaultListableBeanFactory beanFactory) throws BeansException, IOException {
    // Create a new XmlBeanDefinitionReader for the given BeanFactory.
    XmlBeanDefinitionReader beanDefinitionReader = new XmlBeanDefinitionReader(beanFactory);

// Configure the bean definition reader with this context's
    // resource loading environment.
    beanDefinitionReader.setEnvironment(this.getEnvironment());
    beanDefinitionReader.setResourceLoader(this);
    beanDefinitionReader.setEntityResolver(new ResourceEntityResolver(this));

    // Allow a subclass to provide custom initialization of the reader,
    // then proceed with actually loading the bean definitions.
    initBeanDefinitionReader(beanDefinitionReader);
    loadBeanDefinitions(beanDefinitionReader);
}
```

可以发现逻辑更复杂。简单来看一下吧：

如果已经有 BeanFactory 了，销毁Bean和 BeanFactory 。之后创建一个 BeanFactory，设置序列化ID，执行自定义 BeanFactory 的逻辑，之后加载Bean定义，最后设置到IOC容器中。

这其中有xml的加载和读取，由于 SpringBoot 已经几乎放弃xml配置，全部通过注解和 JavaConfig 来配置应用，故不再深入研究。

##### 2.2 getBeanFactory

```java
public final ConfigurableListableBeanFactory getBeanFactory() {
    return this.beanFactory;
}
```

更简单了，不必多言。

#### 3. prepareBeanFactory：BeanFactory的预处理配置

```java
protected void prepareBeanFactory(ConfigurableListableBeanFactory beanFactory) {
    // Tell the internal bean factory to use the context's class loader etc.
    // 设置BeanFactory的类加载器、表达式解析器等
    beanFactory.setBeanClassLoader(getClassLoader());
    beanFactory.setBeanExpressionResolver(new StandardBeanExpressionResolver(beanFactory.getBeanClassLoader()));
    beanFactory.addPropertyEditorRegistrar(new ResourceEditorRegistrar(this, getEnvironment()));

// Configure the bean factory with context callbacks.
    // 3.1 配置一个可回调注入ApplicationContext的BeanPostProcessor
    beanFactory.addBeanPostProcessor(new ApplicationContextAwareProcessor(this));
    beanFactory.ignoreDependencyInterface(EnvironmentAware.class);
    beanFactory.ignoreDependencyInterface(EmbeddedValueResolverAware.class);
    beanFactory.ignoreDependencyInterface(ResourceLoaderAware.class);
    beanFactory.ignoreDependencyInterface(ApplicationEventPublisherAware.class);
    beanFactory.ignoreDependencyInterface(MessageSourceAware.class);
    beanFactory.ignoreDependencyInterface(ApplicationContextAware.class);

// BeanFactory interface not registered as resolvable type in a plain factory.
    // MessageSource registered (and found for autowiring) as a bean.
    // 3.2 自动注入的支持
    beanFactory.registerResolvableDependency(BeanFactory.class, beanFactory);
    beanFactory.registerResolvableDependency(ResourceLoader.class, this);
    beanFactory.registerResolvableDependency(ApplicationEventPublisher.class, this);
    beanFactory.registerResolvableDependency(ApplicationContext.class, this);

// Register early post-processor for detecting inner beans as ApplicationListeners.
    // 3.3 配置一个可加载所有监听器的组件
    beanFactory.addBeanPostProcessor(new ApplicationListenerDetector(this));

// Detect a LoadTimeWeaver and prepare for weaving, if found.
    if (beanFactory.containsBean(LOAD_TIME_WEAVER_BEAN_NAME)) {
        beanFactory.addBeanPostProcessor(new LoadTimeWeaverAwareProcessor(beanFactory));
        // Set a temporary ClassLoader for type matching.
        beanFactory.setTempClassLoader(new ContextTypeMatchClassLoader(beanFactory.getBeanClassLoader()));
    }

    // Register default environment beans.
    // 注册了默认的运行时环境、系统配置属性、系统环境的信息
    if (!beanFactory.containsLocalBean(ENVIRONMENT_BEAN_NAME)) {
        beanFactory.registerSingleton(ENVIRONMENT_BEAN_NAME, getEnvironment());
    }
    if (!beanFactory.containsLocalBean(SYSTEM_PROPERTIES_BEAN_NAME)) {
        beanFactory.registerSingleton(SYSTEM_PROPERTIES_BEAN_NAME, getEnvironment().getSystemProperties());
    }
    if (!beanFactory.containsLocalBean(SYSTEM_ENVIRONMENT_BEAN_NAME)) {
        beanFactory.registerSingleton(SYSTEM_ENVIRONMENT_BEAN_NAME, getEnvironment().getSystemEnvironment());
    }
}
```

在源码中发现了一个组件概念：**`BeanPostProcessor`**。这个概念非常非常重要，我们先来了解一下它。

【如果小伙伴不是很了解或不了解 **`BeanPostProcessor`**，请继续往下看；对 `BeanPostProcessor` 很熟悉的小伙伴可以跳过第3.0节】

##### 3.0 【重要】BeanPostProcessor

它的文档注释原文翻译：

> Factory hook that allows for custom modification of new bean instances, e.g. checking for marker interfaces or wrapping them with proxies. ApplicationContexts can autodetect BeanPostProcessor beans in their bean definitions and apply them to any beans subsequently created. Plain bean factories allow for programmatic registration of post-processors, applying to all beans created through this factory. Typically, post-processors that populate beans via marker interfaces or the like will implement postProcessBeforeInitialization, while post-processors that wrap beans with proxies will normally implement postProcessAfterInitialization.这个接口允许自定义修改新的Bean的实例，例如检查它们的接口或者将他们包装成代理对象等，ApplicationContexts能自动察觉到我们在 BeanPostProcessor 里对对象作出的改变，并在后来创建该对象时应用其对应的改变。普通的bean工厂允许对后置处理器进行程序化注册，它适用于通过该工厂创建的所有bean。通常，通过标记接口等填充bean的后处理器将实现 postProcessBeforeInitialization，而使用代理包装bean的后处理器将实现 postProcessAfterInitialization。

它通常被称为 **“Bean的后置处理器”**，它的作用在文档注释中也描述的差不多，**它可以在对象实例化但初始化之前，以及初始化之后进行一些后置处理**。

可以这样简单理解 Bean 的初始化步骤，以及 BeanPostProcessor 的切入时机：

下面用一个实例快速感受 `BeanPostProcessor` 的作用。

###### 3.0.1 BeanPostProcessor的使用

声明一个 Cat 类：

```java
public class Cat {
    String name;

    public Cat(String name) {
        this.name = name;
    }
}
```

再声明一个 CatBeanPostProcessor：

```java
@Component
public class CatBeanPostProcessor implements BeanPostProcessor {

@Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
        return bean;
    }

@Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        if (bean instanceof Cat) {
            Cat cat = (Cat) bean;
            cat.name = "dog";
        }
        return bean;
    }

}
```

`BeanPostProcessor` 可以在前后做一些额外的处理。

接下来，编写一个配置类，并创建这个Cat对象：

```java
@Configuration
@ComponentScan("com.example.demo.postprocessor")
public class ConfigurationDemo {

@Bean
    public Cat cat() {
        return new Cat("cat");
    }

}
```

启动IOC容器，并获取这个Cat，打印它的name，发现打印输出是dog，证明后置处理器已经起作用了。

###### 3.0.2 【执行时机】Bean初始化的顺序及BeanPostProcessor的执行时机

我们在学过 SpringFramework 的时候，知道Bean的几种额外的初始化方法的指定（`init-method`，`@PostConstruct`，`InitializingBean接口`）。那么它们以及构造方法的执行顺序，以及 `BeanPostProcessor` 的执行时机分别是什么呢？我们修改上面的代码来测试一下：

修改 Cat：

```java
@Component
public class Cat implements InitializingBean {

public Cat(String name) {
        System.out.println("Cat constructor run...");
    }

@PostConstruct
    public void afterInit() {
        System.out.println("Cat PostConstruct run...");
    }

    @Override
    public void afterPropertiesSet() {
        System.out.println("Cat afterPropertiesSet run...");
    }
}
```

修改 CatBeanPostProcessor：

```java
@Component
public class CatBeanPostProcessor implements BeanPostProcessor {

@Override
    public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
        if (bean instanceof Cat) {
            System.out.println("Cat postProcessBeforeInitialization run...");
        }
        return bean;
    }

@Override
    public Object postProcessAfterInitialization(Object bean, String beanName) throws BeansException {
        if (bean instanceof Cat) {
            System.out.println("Cat postProcessAfterInitialization run...");
        }
        return bean;
    }

}
```

重新启动IOC容器，打印结果如下：

```text
Cat constructor run...
Cat postProcessBeforeInitialization run...
Cat PostConstruct run...
Cat afterPropertiesSet run...
Cat postProcessAfterInitialization run...
```

由此可得结论：

- 初始化回调执行顺序：构造方法 → BeanPostProcessor 的 before → @PostConstruct → InitializingBean 的 afterPropertiesSet → init-method → BeanPostProcessor 的 after
- BeanPostProcessor的执行时机：before 在构造方法之后、@PostConstruct 之前；after 在初始化回调（afterPropertiesSet / init-method）之后

出现这种情况的原理，我们可以先翻看文档注释，等到后面初始化单实例Bean时会有源码解析。

- @PostConstructThe PostConstruct annotation is used on a method that needs to be executed after dependency injection is done to perform any initialization. This method MUST be invoked before the class is put into service. This annotation MUST be supported on all classes that support dependency injection.PostConstruct注解，用于标注在需要依赖注入完成，以执行任何初始化之后需要执行的方法上。在Bean投入使用之前必须调用此方法。所有支持依赖注入的类都必须支持该注解。
- InitializingBean：Interface to be implemented by beans that need to react once all their properties have been set by a BeanFactory: e.g. to perform custom initialization, or merely to check that all mandatory properties have been set. An alternative to implementing InitializingBean is specifying a custom init method, for example in an XML bean definition.由 BeanFactory 设置完所有属性后需要作出反应的bean所实现的接口：执行自定义初始化，或仅检查是否已设置所有必填属性。实现InitializingBean的替代方法是指定自定义 init-method，例如在XML bean定义中。

BeanPostProcessor：

- before：Apply this BeanPostProcessor to the given new bean instance before any bean initialization callbacks (like InitializingBean's afterPropertiesSet or a custom init-method). The bean will already be populated with property values. The returned bean instance may be a wrapper around the original.在任何bean初始化回调（例如 InitializingBean的afterPropertiesSet 或 自定义init-method）之前，将此 BeanPostProcessor 应用于给定的新bean实例。该bean将已经用属性值填充。返回的bean实例可能是原始实例的包装。
- after：Apply this BeanPostProcessor to the given new bean instance after any bean initialization callbacks (like InitializingBean's afterPropertiesSet or a custom init-method). The bean will already be populated with property values. The returned bean instance may be a wrapper around the original.在任何bean初始化回调（例如InitializingBean的afterPropertiesSet 或 自定义init-method）之后，将此 BeanPostProcessor 应用于给定的新bean实例。该bean将已经用属性值填充。返回的bean实例可能是原始实例的包装。

了解 `BeanPostProcessor` 后，来看下面几个片段：

##### 3.1 addBeanPostProcessor(new ApplicationContextAwareProcessor(this));

```java
    // Configure the bean factory with context callbacks.
    // 3.1 配置一个可回调注入ApplicationContext的BeanPostProcessor
    beanFactory.addBeanPostProcessor(new ApplicationContextAwareProcessor(this));
    beanFactory.ignoreDependencyInterface(EnvironmentAware.class);
    beanFactory.ignoreDependencyInterface(EmbeddedValueResolverAware.class);
    beanFactory.ignoreDependencyInterface(ResourceLoaderAware.class);
    beanFactory.ignoreDependencyInterface(ApplicationEventPublisherAware.class);
    beanFactory.ignoreDependencyInterface(MessageSourceAware.class);
    beanFactory.ignoreDependencyInterface(ApplicationContextAware.class);
```

它先配置了一个 `ApplicationContextAwareProcessor`，之后又忽略了下面几个接口。它这么做的原因是什么呢？咱不妨先来看看 `ApplicationContextAwareProcessor` 是什么。

###### 3.1.1 ApplicationContextAwareProcessor

它的文档注释原文翻译：

> BeanPostProcessor implementation that passes the ApplicationContext to beans that implement the EnvironmentAware, EmbeddedValueResolverAware, ResourceLoaderAware, ApplicationEventPublisherAware, MessageSourceAware and/or ApplicationContextAware interfaces. Implemented interfaces are satisfied in order of their mention above. Application contexts will automatically register this with their underlying bean factory. Applications do not use this directly.BeanPostProcessor 实现，它将 ApplicationContext 传递给实现 EnvironmentAware，EmbeddedValueResolverAware，ResourceLoaderAware，ApplicationEventPublisherAware，MessageSourceAware 和/或 ApplicationContextAware 接口的bean。按照上面提到的顺序满足已实现的接口。IOC容器将自动在其基础bean工厂中注册它。应用程序不直接使用它。

看到这段文档注释，就已经能明白上面的几个ignore的意义了。我们再看一眼源码，便更能理解它的设计了：

```java
public Object postProcessBeforeInitialization(final Object bean, String beanName) throws BeansException {
    AccessControlContext acc = null;

if (System.getSecurityManager() != null &&
            (bean instanceof EnvironmentAware || bean instanceof EmbeddedValueResolverAware ||
                    bean instanceof ResourceLoaderAware || bean instanceof ApplicationEventPublisherAware ||
                    bean instanceof MessageSourceAware || bean instanceof ApplicationContextAware)) {
        acc = this.applicationContext.getBeanFactory().getAccessControlContext();
    }

if (acc != null) {
        AccessController.doPrivileged((PrivilegedAction<Object>) () -> {
            invokeAwareInterfaces(bean);
            return null;
        }, acc);
    }
    else {
        // 往下调用
        invokeAwareInterfaces(bean);
    }

return bean;
}

private void invokeAwareInterfaces(Object bean) {
    if (bean instanceof Aware) {
        if (bean instanceof EnvironmentAware) {
            ((EnvironmentAware) bean).setEnvironment(this.applicationContext.getEnvironment());
        }
        if (bean instanceof EmbeddedValueResolverAware) {
            ((EmbeddedValueResolverAware) bean).setEmbeddedValueResolver(this.embeddedValueResolver);
        }
        if (bean instanceof ResourceLoaderAware) {
            ((ResourceLoaderAware) bean).setResourceLoader(this.applicationContext);
        }
        if (bean instanceof ApplicationEventPublisherAware) {
            ((ApplicationEventPublisherAware) bean).setApplicationEventPublisher(this.applicationContext);
        }
        if (bean instanceof MessageSourceAware) {
            ((MessageSourceAware) bean).setMessageSource(this.applicationContext);
        }
        if (bean instanceof ApplicationContextAware) {
            ((ApplicationContextAware) bean).setApplicationContext(this.applicationContext);
        }
    }
}
```

它果然在挨个判断，然后注入。

##### 3.2 registerResolvableDependency：自动注入的支持

```java
    // BeanFactory interface not registered as resolvable type in a plain factory.
    // MessageSource registered (and found for autowiring) as a bean.
    beanFactory.registerResolvableDependency(BeanFactory.class, beanFactory);
    beanFactory.registerResolvableDependency(ResourceLoader.class, this);
    beanFactory.registerResolvableDependency(ApplicationEventPublisher.class, this);
    beanFactory.registerResolvableDependency(ApplicationContext.class, this);
```

上面的单行注释翻译：

> BeanFactory 接口未在普通工厂中注册为可解析类型。MessageSource 注册为Bean（并发现用于自动装配）。

上面一句还能看懂，下面是干什么？讲真我也不是很清楚，咱还是看看这个方法的文档注释吧。

> Register a special dependency type with corresponding autowired value. This is intended for factory/context references that are supposed to be autowirable but are not defined as beans in the factory: e.g. a dependency of type ApplicationContext resolved to the ApplicationContext instance that the bean is living in. Note: There are no such default types registered in a plain BeanFactory, not even for the BeanFactory interface itself.用相应的自动装配值注册一个特殊的依赖类型。这适用于应该是可自动执行但未在工厂中定义为bean的工厂/上下文引用：类型为 ApplicationContext 的依赖关系已解析为Bean所在的 ApplicationContext 实例。注意：在普通 BeanFactory 中没有注册这样的默认类型，甚至 BeanFactory 接口本身也没有。

它大概的意思是如果遇到一个特殊的依赖类型，就使用一个特殊的预先准备好的对象装配进去。

它的方法实现（仅在 `DefaultListableBeanFactory` 中有实现）：

```java
/** Map from dependency type to corresponding autowired value. */
private final Map<Class<?>, Object> resolvableDependencies = new ConcurrentHashMap<>(16);

public void registerResolvableDependency(Class<?> dependencyType, @Nullable Object autowiredValue) {
    Assert.notNull(dependencyType, "Dependency type must not be null");
    if (autowiredValue != null) {
        if (!(autowiredValue instanceof ObjectFactory || dependencyType.isInstance(autowiredValue))) {
            throw new IllegalArgumentException("Value [" + autowiredValue +
                    "] does not implement specified dependency type [" + dependencyType.getName() + "]");
        }
        this.resolvableDependencies.put(dependencyType, autowiredValue);
    }
}
```

前面的判断都不看，底下有一个put操作，key和value分别是**依赖的类型**和**自动注入的值**。

这个 `resolvableDependencies` 是个Map，它的注释：

> 从依赖项类型映射到相应的自动装配值。

至此，它的功能已经明确了：它可以支持一些特殊依赖关系的类型，并放到 `resolvableDependencies` 集合中保存，使得能在任意位置注入上述源码中的组件。

##### 3.3 addBeanPostProcessor(new ApplicationListenerDetector(this))

```java
    // Register early post-processor for detecting inner beans as ApplicationListeners.
    beanFactory.addBeanPostProcessor(new ApplicationListenerDetector(this));
```

又注册了一个后置处理器，来看 `ApplicationListenerDetector` 的文档注释：

> BeanPostProcessor that detects beans which implement the ApplicationListener interface. This catches beans that can't reliably be detected by getBeanNamesForType and related operations which only work against top-level beans.BeanPostProcessor，用于检测实现 ApplicationListener 接口的bean。这将捕获 getBeanNamesForType 和仅对顶级bean有效的相关操作无法可靠检测到的bean。

文档注释还是比较容易理解的，它是来收集 `ApplicationListener` 的。再来看看它的源码核心部分：

```java
public Object postProcessAfterInitialization(Object bean, String beanName) {
    if (bean instanceof ApplicationListener) {
        // potentially not detected as a listener by getBeanNamesForType retrieval
        Boolean flag = this.singletonNames.get(beanName);
        if (Boolean.TRUE.equals(flag)) {
            // singleton bean (top-level or inner): register on the fly
            this.applicationContext.addApplicationListener((ApplicationListener<?>) bean);
        }
        else if (Boolean.FALSE.equals(flag)) {
            if (logger.isWarnEnabled() && !this.applicationContext.containsBean(beanName)) {
                // inner bean with other scope - can't reliably process events
                logger.warn("Inner bean '" + beanName + "' implements ApplicationListener interface " +
                        "but is not reachable for event multicasting by its containing ApplicationContext " +
                        "because it does not have singleton scope. Only top-level listener beans are allowed " +
                        "to be of non-singleton scope.");
            }
            this.singletonNames.remove(beanName);
        }
    }
    return bean;
}
```

逻辑还是比较简单的，如果Bean是 `ApplicationListener` 的实现类，并且是单实例Bean，则会注册到IOC容器中。

#### 小结

1. IOC容器在开始刷新之前有加载 `BeanDefinition` 的过程。
2. `BeanFactory` 的初始化中会注册后置处理器，和自动注入的支持。
3. `BeanPostProcessor` 的执行时机是在Bean初始化前后执行。



## BeanFactory 后处理与组件扫描

### IOC：刷新容器-BeanFactory的后处理和组件扫描


本篇解析4、5步骤：

```java
        try {
            // Allows post-processing of the bean factory in context subclasses.
            // 4. BeanFactory的后置处理
            postProcessBeanFactory(beanFactory);

            // Invoke factory processors registered as beans in the context.
            // 5. 执行BeanFactory创建后的后置处理器
            invokeBeanFactoryPostProcessors(beanFactory);
```

#### 4. postProcessBeanFactory：BeanFactory的后置处理

在 `AbstractApplicationContext` 中，这个方法又被设置成模板方法了：

```java
protected void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) {
}
```

借助IDEA，发现 `AnnotationConfigServletWebServerApplicationContext` 重写了这个方法。

```java
// AnnotationConfigServletWebServerApplicationContext
protected void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) {
    super.postProcessBeanFactory(beanFactory);
    // 包扫描
    if (this.basePackages != null && this.basePackages.length > 0) {
        this.scanner.scan(this.basePackages);
    }
    if (!this.annotatedClasses.isEmpty()) {
        this.reader.register(ClassUtils.toClassArray(this.annotatedClasses));
    }
}
```

它首先调了父类 `ServletWebServerApplicationContext` 的 `postProcessBeanFactory` 方法。

##### 4.1 ServletWebServerApplicationContext.postProcessBeanFactory

```java
// ServletWebServerApplicationContext
protected void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) {
    // 注册ServletContext注入器
    beanFactory.addBeanPostProcessor(new WebApplicationContextServletContextAwareProcessor(this));
    beanFactory.ignoreDependencyInterface(ServletContextAware.class);
    registerWebApplicationScopes();
}
```

###### 4.1.1 注册WebApplicationContextServletContextAwareProcessor

它的文档注释原文翻译：

> Variant of ServletContextAwareProcessor for use with a ConfigurableWebApplicationContext. Can be used when registering the processor can occur before the ServletContext or ServletConfig have been initialized.ServletContextAwareProcessor 的扩展，用于 ConfigurableWebApplicationContext 。可以在初始化 ServletContext 或 ServletConfig 之前进行处理器注册时使用。

似乎看不出什么很明显的思路，但它说是 `ServletContextAwareProcessor` 的扩展，那追到 `ServletContextAwareProcessor` 的文档注释：

> BeanPostProcessor implementation that passes the ServletContext to beans that implement the ServletContextAware interface. Web application contexts will automatically register this with their underlying bean factory. Applications do not use this directly.将 ServletContext 传递给实现 ServletContextAware 接口的Bean的 BeanPostProcessor 实现。Web应用程序上下文将自动将其注册到其底层bean工厂，应用程序不直接使用它。

发现很明白，它是把 `ServletContext`、`ServletConfig` 注入到组件中。它的核心源码：

```java
public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
    if (getServletContext() != null && bean instanceof ServletContextAware) {
        ((ServletContextAware) bean).setServletContext(getServletContext());
    }
    if (getServletConfig() != null && bean instanceof ServletConfigAware) {
        ((ServletConfigAware) bean).setServletConfig(getServletConfig());
    }
    return bean;
}
```

跟上一篇中的注册几乎是一个套路，不再赘述。

###### 4.1.2 registerWebApplicationScopes

```java
private void registerWebApplicationScopes() {
    ExistingWebApplicationScopes existingScopes = new ExistingWebApplicationScopes(getBeanFactory());
    WebApplicationContextUtils.registerWebApplicationScopes(getBeanFactory());
    existingScopes.restore();
}
```

这个方法没有任何注释，只能靠里面的源码来试着推测。

###### 4.1.2.1 ExistingWebApplicationScopes

从字面意思上看，它是表示在Web应用上已经存在的作用域。它的部分源码：

```java
public static class ExistingWebApplicationScopes {

private static final Set<String> SCOPES;

static {
        Set<String> scopes = new LinkedHashSet<>();
        scopes.add(WebApplicationContext.SCOPE_REQUEST);
        scopes.add(WebApplicationContext.SCOPE_SESSION);
        SCOPES = Collections.unmodifiableSet(scopes);
    }

    public void restore() {
        this.scopes.forEach((key, value) -> {
            if (logger.isInfoEnabled()) {
                logger.info("Restoring user defined scope " + key);
            }
            this.beanFactory.registerScope(key, value);
        });
    }
```

发现它确实是缓存了两种scope，分别是 request 域和 session 域。

下面的 `restore` 方法，是把现在缓存的所有作用域，注册到 BeanFactory 中。

大概猜测这是**将Web的request域和session域注册到IOC容器，让IOC容器知道这两种作用域**（学过 SpringFramework 都知道Bean的作用域有request 和 session）。

###### 4.1.2.2 WebApplicationContextUtils.registerWebApplicationScopes

```java
public static void registerWebApplicationScopes(ConfigurableListableBeanFactory beanFactory) {
    registerWebApplicationScopes(beanFactory, null);
}

public static void registerWebApplicationScopes(ConfigurableListableBeanFactory beanFactory,
        @Nullable ServletContext sc) {

// 注册作用域类型
    beanFactory.registerScope(WebApplicationContext.SCOPE_REQUEST, new RequestScope());
    beanFactory.registerScope(WebApplicationContext.SCOPE_SESSION, new SessionScope());
    if (sc != null) {
        ServletContextScope appScope = new ServletContextScope(sc);
        beanFactory.registerScope(WebApplicationContext.SCOPE_APPLICATION, appScope);
        // Register as ServletContext attribute, for ContextCleanupListener to detect it.
        sc.setAttribute(ServletContextScope.class.getName(), appScope);
    }

    // 自动注入的支持
    beanFactory.registerResolvableDependency(ServletRequest.class, new RequestObjectFactory());
    beanFactory.registerResolvableDependency(ServletResponse.class, new ResponseObjectFactory());
    beanFactory.registerResolvableDependency(HttpSession.class, new SessionObjectFactory());
    beanFactory.registerResolvableDependency(WebRequest.class, new WebRequestObjectFactory());
    if (jsfPresent) {
        FacesDependencyRegistrar.registerFacesDependencies(beanFactory);
    }
}
```

它的文档注释原文翻译：

> Register web-specific scopes ("request", "session", "globalSession", "application") with the given BeanFactory, as used by the WebApplicationContext.使用WebApplicationContext使用的给定BeanFactory注册特定于Web的作用域（“request”，“session”，“globalSession”，“application”）。

注释很清晰，将Web的几种作用域注册到 BeanFactory 中。

源码中注册了 request 、session 、application 域，还注册了几种特定的依赖注入的关系。

回到 `AnnotationConfigServletWebServerApplicationContext` 中：

```java
    if (this.basePackages != null && this.basePackages.length > 0) {
        this.scanner.scan(this.basePackages);
    }
```

下一步是进行组件的包扫描。不过注意一点，在这个位置上打断点，Debug运行时发现 basePackages 为null，故此处不进，小伙伴不要觉得之前已经知道了 primarySource 就觉得这个地方 basePackages 就肯定有值了。

咱先了解下这个包扫描，方便后续咱们看到时理解。

##### 4.2 【重要】包扫描

```java
private final AnnotatedBeanDefinitionReader reader;
private final ClassPathBeanDefinitionScanner scanner;
```

在 `AnnotationConfigServletWebServerApplicationContext` 中有声明 `注解Bean定义解析器` 和 `类路径Bean定义扫描器` 的类型，可以依此类型来查看原理。

```java
// ClassPathBeanDefinitionScanner
public int scan(String... basePackages) {
    int beanCountAtScanStart = this.registry.getBeanDefinitionCount();

doScan(basePackages);

// Register annotation config processors, if necessary.
    if (this.includeAnnotationConfig) {
        AnnotationConfigUtils.registerAnnotationConfigProcessors(this.registry);
    }

    return (this.registry.getBeanDefinitionCount() - beanCountAtScanStart);
}
```

又出现 **scan** 和 **doScan** 了。doScan 方法：

```java
protected Set<BeanDefinitionHolder> doScan(String... basePackages) {
    Assert.notEmpty(basePackages, "At least one base package must be specified");
    Set<BeanDefinitionHolder> beanDefinitions = new LinkedHashSet<>();
    // 只有主启动类所在包
    for (String basePackage : basePackages) {
        // 4.2.1 - 4.2.5 扫描包及子包下的组件
        Set<BeanDefinition> candidates = findCandidateComponents(basePackage);
        // 4.3 ......
    }
    return beanDefinitions;
}
```

###### 4.2.1 findCandidateComponents

来到父类 `ClassPathScanningCandidateComponentProvider` 的 `findCandidateComponents` 方法：

```java
private CandidateComponentsIndex componentsIndex;

public Set<BeanDefinition> findCandidateComponents(String basePackage) {
    if (this.componentsIndex != null && indexSupportsIncludeFilters()) {
        return addCandidateComponentsFromIndex(this.componentsIndex, basePackage);
    }
    else {
        return scanCandidateComponents(basePackage);
    }
}
```

很明显，包扫描进入的是下面的 `scanCandidateComponents` ：

###### 4.2.2 scanCandidateComponents

这个方法中有大量log，精简篇幅如下：

```java
// ResourcePatternResolver
String CLASSPATH_ALL_URL_PREFIX = "classpath*:";

static final String DEFAULT_RESOURCE_PATTERN = "**/*.class";
private String resourcePattern = DEFAULT_RESOURCE_PATTERN;

private Set<BeanDefinition> scanCandidateComponents(String basePackage) {
    Set<BeanDefinition> candidates = new LinkedHashSet<>();
    try {
        // 拼接包扫描路径
        String packageSearchPath = ResourcePatternResolver.CLASSPATH_ALL_URL_PREFIX +
                resolveBasePackage(basePackage) + '/' + this.resourcePattern;
        // 4.2.3,4 包扫描
        Resource[] resources = getResourcePatternResolver().getResources(packageSearchPath);
        for (Resource resource : resources) {
            if (resource.isReadable()) {
                try {
                    MetadataReader metadataReader = getMetadataReaderFactory().getMetadataReader(resource);
                    if (isCandidateComponent(metadataReader)) {
                        ScannedGenericBeanDefinition sbd = new ScannedGenericBeanDefinition(metadataReader);
                        sbd.setResource(resource);
                        sbd.setSource(resource);
                        if (isCandidateComponent(sbd)) {
                            candidates.add(sbd);
                        }
                // log和catch部分省略
    return candidates;
}
```

首先它将要扫描的包和一些前缀进行拼接：前缀是 `classpath*:` ，后缀默认扫 `**/*.class` ，中间部分调了一个 `resolveBasePackage` 方法，这个方法其实不看也能猜出来是把这个**包名转换成文件路径**（不然怎么拼接到扫描路径呢）。看一眼源码：

```java
// ClassPathScanningCandidateComponentProvider
protected String resolveBasePackage(String basePackage) {
    return ClassUtils.convertClassNameToResourcePath(getEnvironment().resolveRequiredPlaceholders(basePackage));
}

// ClassUtils
private static final char PACKAGE_SEPARATOR = '.';
private static final char PATH_SEPARATOR = '/';

public static String convertClassNameToResourcePath(String className) {
    Assert.notNull(className, "Class name must not be null");
    return className.replace(PACKAGE_SEPARATOR, PATH_SEPARATOR);
}
```

果然是包名转换，把 ` .` 转换成 ` /` 。

由此可算得，入门启动程序中的拼接包路径应该是： ` classpath*:com/example/demo/**/*.class` 。

回到方法中：

```java
        String packageSearchPath = ResourcePatternResolver.CLASSPATH_ALL_URL_PREFIX +
                resolveBasePackage(basePackage) + '/' + this.resourcePattern;
        Resource[] resources = getResourcePatternResolver().getResources(packageSearchPath);
```

下面的 `getResources` 方法最终会拿 `ResourcePatternResolver` 来获取一组 `Resource` ，分开来看：

###### 4.2.3 getResourcePatternResolver

```java
private ResourcePatternResolver getResourcePatternResolver() {
    if (this.resourcePatternResolver == null) {
        this.resourcePatternResolver = new PathMatchingResourcePatternResolver();
    }
    return this.resourcePatternResolver;
}
```

可以发现它用的是 `PathMatchingResourcePatternResolver` 。那下面的 `getResources` 方法就是它里面的了：

###### 4.2.4 getResources：包扫描

```java
String CLASSPATH_ALL_URL_PREFIX = "classpath*:";

public Resource[] getResources(String locationPattern) throws IOException {
    Assert.notNull(locationPattern, "Location pattern must not be null");
    if (locationPattern.startsWith(CLASSPATH_ALL_URL_PREFIX)) {
        // a class path resource (multiple resources for same name possible)
        if (getPathMatcher().isPattern(locationPattern.substring(CLASSPATH_ALL_URL_PREFIX.length()))) {
            // a class path resource pattern
            return findPathMatchingResources(locationPattern);
        }
        else {
            // all class path resources with the given name
            return findAllClassPathResources(locationPattern.substring(CLASSPATH_ALL_URL_PREFIX.length()));
        }
    }
    else {
        // Generally only look for a pattern after a prefix here,
        // and on Tomcat only after the "*/" separator for its "war:" protocol.
        int prefixEnd = (locationPattern.startsWith("war:") ? locationPattern.indexOf("*/") + 1 :
                locationPattern.indexOf(':') + 1);
        if (getPathMatcher().isPattern(locationPattern.substring(prefixEnd))) {
            // a file pattern
            return findPathMatchingResources(locationPattern);
        }
        else {
            // a single resource with the given name
            return new Resource[] {getResourceLoader().getResource(locationPattern)};
        }
    }
}
```

整个方法的大if结构中，先判断要扫描的包路径是否有 `classpath*:` ，有则截掉，之后判断路径是否能匹配扫描规则。而这个规则的匹配器，通过IDEA发现 `PathMatcher` 只有一个实现类： ` AntPathMatcher` ，由此也解释了 `SpringFramework` 支持的是ant规则声明包。

如果规则匹配，则会进入下面的 `findPathMatchingResources` 方法：

###### 4.2.4.1 findPathMatchingResources：根据Ant路径进行包扫描

```java
protected Resource[] findPathMatchingResources(String locationPattern) throws IOException {
    // 4.2.4.1.1 截取扫描根路径
    String rootDirPath = determineRootDir(locationPattern);
    // 截取剩下扫描路径（**/*.class）
    String subPattern = locationPattern.substring(rootDirPath.length());
    // 4.2.4.2,3 获取扫描包路径下的所有包
    Resource[] rootDirResources = getResources(rootDirPath);
    Set<Resource> result = new LinkedHashSet<>(16);
    for (Resource rootDirResource : rootDirResources) {
        rootDirResource = resolveRootDirResource(rootDirResource);
        URL rootDirUrl = rootDirResource.getURL();
        if (equinoxResolveMethod != null && rootDirUrl.getProtocol().startsWith("bundle")) {
            URL resolvedUrl = (URL) ReflectionUtils.invokeMethod(equinoxResolveMethod, null, rootDirUrl);
            if (resolvedUrl != null) {
                rootDirUrl = resolvedUrl;
            }
            rootDirResource = new UrlResource(rootDirUrl);
        }
        if (rootDirUrl.getProtocol().startsWith(ResourceUtils.URL_PROTOCOL_VFS)) {
            result.addAll(VfsResourceMatchingDelegate.findMatchingResources(rootDirUrl, subPattern, getPathMatcher()));
        }
        else if (ResourceUtils.isJarURL(rootDirUrl) || isJarResource(rootDirResource)) {
            result.addAll(doFindPathMatchingJarResources(rootDirResource, rootDirUrl, subPattern));
        }
        else {
            result.addAll(doFindPathMatchingFileResources(rootDirResource, subPattern));
        }
    }
    if (logger.isTraceEnabled()) {
        logger.trace("Resolved location pattern [" + locationPattern + "] to resources " + result);
    }
    return result.toArray(new Resource[0]);
}
```

首先它要截取扫描根路径，这个截取是一个简单算法：

```java
protected String determineRootDir(String location) {
    int prefixEnd = location.indexOf(':') + 1;
    int rootDirEnd = location.length();
    while (rootDirEnd > prefixEnd && getPathMatcher().isPattern(location.substring(prefixEnd, rootDirEnd))) {
        rootDirEnd = location.lastIndexOf('/', rootDirEnd - 2) + 1;
    }
    if (rootDirEnd == 0) {
        rootDirEnd = prefixEnd;
    }
    return location.substring(0, rootDirEnd);
}
```

通过上面的算法，可以计算得路径是 `classpath*:com/example/demo/` 。

回到上面的方法：

```java
    // 4.2.4.1.1 截取扫描根路径
    String rootDirPath = determineRootDir(locationPattern);
    // 截取剩下扫描路径（**/*.class）
    String subPattern = locationPattern.substring(rootDirPath.length());
    Resource[] rootDirResources = getResources(rootDirPath);
```

在截取完成后，又把根路径传入了那个 `getResources` 方法。由于这一次没有后缀了，只有根路径，故进入的分支方法会不一样：

```java
public Resource[] getResources(String locationPattern) throws IOException {
    Assert.notNull(locationPattern, "Location pattern must not be null");
    if (locationPattern.startsWith(CLASSPATH_ALL_URL_PREFIX)) {
        // a class path resource (multiple resources for same name possible)
        if (getPathMatcher().isPattern(locationPattern.substring(CLASSPATH_ALL_URL_PREFIX.length()))) {
            // a class path resource pattern
            return findPathMatchingResources(locationPattern);
        }
        else {
            // ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓
            // all class path resources with the given name
            return findAllClassPathResources(locationPattern.substring(CLASSPATH_ALL_URL_PREFIX.length()));
        }
    }
    // ...
```

这次路径是 ` classpath*:com/example/demo/` ，不能匹配了，进入下面的else部分，`findAllClassPathResources` 方法：

###### 4.2.4.2 findAllClassPathResources

```java
protected Resource[] findAllClassPathResources(String location) throws IOException {
    String path = location;
    if (path.startsWith("/")) {
        path = path.substring(1);
    }
    //                     ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓
    Set<Resource> result = doFindAllClassPathResources(path);
    if (logger.isTraceEnabled()) {
        logger.trace("Resolved classpath location [" + location + "] to resources " + result);
    }
    return result.toArray(new Resource[0]);
}
```

这里进行真正的扫描获取包的工作：`doFindAllClassPathResources`

###### 4.2.4.3 doFindAllClassPathResources

```java
protected Set<Resource> doFindAllClassPathResources(String path) throws IOException {
    Set<Resource> result = new LinkedHashSet<>(16);
    ClassLoader cl = getClassLoader();
    Enumeration<URL> resourceUrls = (cl != null ? cl.getResources(path) : ClassLoader.getSystemResources(path));
    while (resourceUrls.hasMoreElements()) {
        URL url = resourceUrls.nextElement();
        result.add(convertClassLoaderURL(url));
    }
    if ("".equals(path)) {
        // The above result is likely to be incomplete, i.e. only containing file system references.
        // We need to have pointers to each of the jar files on the classpath as well...
        addAllClassLoaderJarRoots(cl, result);
    }
    return result;
}
```

可以发现它在做的工作是**使用类加载器，把传入的根包以Resource的形式加载出来，以便后续的文件读取**。

之后方法返回，回到4.2.4.1的方法中：

###### 4.2.4.4 扫描包

```java
    Resource[] rootDirResources = getResources(rootDirPath);
    Set<Resource> result = new LinkedHashSet<>(16);
    for (Resource rootDirResource : rootDirResources) {
        rootDirResource = resolveRootDirResource(rootDirResource);
        URL rootDirUrl = rootDirResource.getURL();
        if (equinoxResolveMethod != null && rootDirUrl.getProtocol().startsWith("bundle")) {
            URL resolvedUrl = (URL) ReflectionUtils.invokeMethod(equinoxResolveMethod, null, rootDirUrl);
            if (resolvedUrl != null) {
                rootDirUrl = resolvedUrl;
            }
            rootDirResource = new UrlResource(rootDirUrl);
        }
        if (rootDirUrl.getProtocol().startsWith(ResourceUtils.URL_PROTOCOL_VFS)) {
            result.addAll(VfsResourceMatchingDelegate.findMatchingResources(rootDirUrl, subPattern, getPathMatcher()));
        }
        else if (ResourceUtils.isJarURL(rootDirUrl) || isJarResource(rootDirResource)) {
            result.addAll(doFindPathMatchingJarResources(rootDirResource, rootDirUrl, subPattern));
        }
        else {
            // ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓
            result.addAll(doFindPathMatchingFileResources(rootDirResource, subPattern));
        }
    }
```

它要拿到所有要扫描的包的文件路径，来进行真正的包扫描工作。

首先 `resolveRootDirResource` 方法在实现中直接把 `rootDirResource` 返回了（不知道这什么鬼才操作），之后要判断扫描包路径前缀是否为vfs或jar，都不是则进入最底下的方法（默认情况下我们只配置扫描本项目的组件，则扫描最终的扫描包路径前缀为 `file:/`）。

###### 4.2.4.5 doFindPathMatchingFileResources

这个方法默认在 `PathMatchingResourcePatternResolver` 中有实现，但通过IDEA发现它被 `ServletContextResourcePatternResolver` 重写了。通过Debug，走到这一步也发现先进的 `ServletContextResourcePatternResolver` 中的 `doFindPathMatchingFileResources` 方法。

```java
protected Set<Resource> doFindPathMatchingFileResources(Resource rootDirResource, String subPattern)
        throws IOException {

    if (rootDirResource instanceof ServletContextResource) {
        ServletContextResource scResource = (ServletContextResource) rootDirResource;
        ServletContext sc = scResource.getServletContext();
        String fullPattern = scResource.getPath() + subPattern;
        Set<Resource> result = new LinkedHashSet<>(8);
        doRetrieveMatchingServletContextResources(sc, fullPattern, scResource.getPath(), result);
        return result;
    }
    else {
        return super.doFindPathMatchingFileResources(rootDirResource, subPattern);
    }
}
```

然而在默认的项目内部包扫描中，与 `ServletContextResource` 没有关系，故还是要回到 `PathMatchingResourcePatternResolver` 中。

###### 4.2.4.6 PathMatchingResourcePatternResolver.doFindPathMatchingFileResources

```java
protected Set<Resource> doFindPathMatchingFileResources(Resource rootDirResource, String subPattern)
        throws IOException {

    File rootDir;
    try {
        rootDir = rootDirResource.getFile().getAbsoluteFile();
    }
    catch (FileNotFoundException ex) {
        if (logger.isDebugEnabled()) {
            logger.debug("Cannot search for matching files underneath " + rootDirResource +
                    " in the file system: " + ex.getMessage());
        }
        return Collections.emptySet();
    }
    catch (Exception ex) {
        if (logger.isInfoEnabled()) {
            logger.info("Failed to resolve " + rootDirResource + " in the file system: " + ex);
        }
        return Collections.emptySet();
    }
    return doFindMatchingFileSystemResources(rootDir, subPattern);
}
```

try中先把文件加载出来，之后调了下面的 ` doFindMatchingFileSystemResources` 方法：

```java
protected Set<Resource> doFindMatchingFileSystemResources(File rootDir, String subPattern) throws IOException {
    if (logger.isTraceEnabled()) {
        logger.trace("Looking for matching resources in directory tree [" + rootDir.getPath() + "]");
    }
    //                        ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓
    Set<File> matchingFiles = retrieveMatchingFiles(rootDir, subPattern);
    Set<Resource> result = new LinkedHashSet<>(matchingFiles.size());
    for (File file : matchingFiles) {
        result.add(new FileSystemResource(file));
    }
    return result;
}
```

源码中很明显只有一句是核心： ` retrieveMatchingFiles` ：

###### 4.2.4.7 retrieveMatchingFiles

```java
protected Set<File> retrieveMatchingFiles(File rootDir, String pattern) throws IOException {
    // 不存在的检查
    if (!rootDir.exists()) {
        // log
        return Collections.emptySet();
    }
    // 非文件夹检查
    if (!rootDir.isDirectory()) {
        // log
        return Collections.emptySet();
    }
    // 不可读检查
    if (!rootDir.canRead()) {
        // log
        return Collections.emptySet();
    }
    String fullPattern = StringUtils.replace(rootDir.getAbsolutePath(), File.separator, "/");
    if (!pattern.startsWith("/")) {
        fullPattern += "/";
    }
    fullPattern = fullPattern + StringUtils.replace(pattern, File.separator, "/");
    Set<File> result = new LinkedHashSet<>(8);
    doRetrieveMatchingFiles(fullPattern, rootDir, result);
    return result;
}
```

上面的一些必要的检查之后，它将路径进行整理，最终调用 `doRetrieveMatchingFiles` 方法：

###### 4.2.4.8 doRetrieveMatchingFiles：递归扫描

```java
protected void doRetrieveMatchingFiles(String fullPattern, File dir, Set<File> result) throws IOException {
    if (logger.isTraceEnabled()) {
        logger.trace("Searching directory [" + dir.getAbsolutePath() +
                "] for files matching pattern [" + fullPattern + "]");
    }
    for (File content : listDirectory(dir)) {
        String currPath = StringUtils.replace(content.getAbsolutePath(), File.separator, "/");
        if (content.isDirectory() && getPathMatcher().matchStart(fullPattern, currPath + "/")) {
            if (!content.canRead()) {
                if (logger.isDebugEnabled()) {
                    logger.debug("Skipping subdirectory [" + dir.getAbsolutePath() +
                            "] because the application is not allowed to read the directory");
                }
            }
            else {
                doRetrieveMatchingFiles(fullPattern, content, result);
            }
        }
        if (getPathMatcher().match(fullPattern, currPath)) {
            result.add(content);
        }
    }
}
```

这个方法是最终进行包扫描的底层，可以发现在16行使用了递归扫描。

扫描完成后， `getResources` 方法算是彻底执行完成，回到4.2.2 scanCandidateComponents 方法中：

###### 4.2.5 解析Component

```java
    Resource[] resources = getResourcePatternResolver().getResources(packageSearchPath);
    for (Resource resource : resources) {
        if (traceEnabled) {
            logger.trace("Scanning " + resource);
        }
        if (resource.isReadable()) {
            try {
                MetadataReader metadataReader = getMetadataReaderFactory().getMetadataReader(resource);
                if (isCandidateComponent(metadataReader)) {
                    ScannedGenericBeanDefinition sbd = new ScannedGenericBeanDefinition(metadataReader);
                    sbd.setResource(resource);
                    sbd.setSource(resource);
                    if (isCandidateComponent(sbd)) {
                        if (debugEnabled) {
                            logger.debug("Identified candidate component class: " + resource);
                        }
                        candidates.add(sbd);
                    }
                    // else ......
```

下面要遍历每个扫描出来的.class文件（此时还没有进行过滤），来下面的try部分。

它使用了一个 `MetadataReader` 来解析.class文件，它就可以读取这个class的类定义信息、注解标注信息。之后要用 `MetadataReader` 来判断这个class是否为一个 **Component**：

###### 4.2.5.1 isCandidateComponent

```java
protected boolean isCandidateComponent(MetadataReader metadataReader) throws IOException {
    for (TypeFilter tf : this.excludeFilters) {
        if (tf.match(metadataReader, getMetadataReaderFactory())) {
            return false;
        }
    }
    for (TypeFilter tf : this.includeFilters) {
        if (tf.match(metadataReader, getMetadataReaderFactory())) {
            return isConditionMatch(metadataReader);
        }
    }
    return false;
}
```

它拿了一组 excludeFilters 和 includeFilters，而这两组过滤器通过Debug可以发现：

它会判断class是否被 `@Component` / `@ManagedBean` 标注。至此发现了真正扫描 `@Component` 的原理。

判定为 Component 后，会将这个class封装为 `BeanDefinition`，最后返回。

这部分的逻辑非常复杂，咱用一个图来理解这部分过程：

返回到4.2中的doScan中：

##### 4.3 扫描完BeanDefinition后

```java
    Set<BeanDefinition> candidates = findCandidateComponents(basePackage);
    for (BeanDefinition candidate : candidates) {
        ScopeMetadata scopeMetadata = this.scopeMetadataResolver.resolveScopeMetadata(candidate);
        candidate.setScope(scopeMetadata.getScopeName());
        String beanName = this.beanNameGenerator.generateBeanName(candidate, this.registry);
        if (candidate instanceof AbstractBeanDefinition) {
            postProcessBeanDefinition((AbstractBeanDefinition) candidate, beanName);
        }
        if (candidate instanceof AnnotatedBeanDefinition) {
            AnnotationConfigUtils.processCommonDefinitionAnnotations((AnnotatedBeanDefinition) candidate);
        }
        if (checkCandidate(beanName, candidate)) {
            BeanDefinitionHolder definitionHolder = new BeanDefinitionHolder(candidate, beanName);
            definitionHolder =
                    AnnotationConfigUtils.applyScopedProxyMode(scopeMetadata, definitionHolder, this.registry);
            beanDefinitions.add(definitionHolder);
            registerBeanDefinition(definitionHolder, this.registry);
        }
    }
```

它要遍历每个 `BeanDefinition`，进行一些后置处理。

###### 4.3.1 beanNameGenerator.generateBeanName

之前我们见过它，它的作用到后面加载它的时候咱再看。

###### 4.3.2 postProcessBeanDefinition

```java
protected void postProcessBeanDefinition(AbstractBeanDefinition beanDefinition, String beanName) {
    beanDefinition.applyDefaults(this.beanDefinitionDefaults);
    if (this.autowireCandidatePatterns != null) {
        beanDefinition.setAutowireCandidate(PatternMatchUtils.simpleMatch(this.autowireCandidatePatterns, beanName));
    }
}
```

发现是设置 `BeanDefinition` 的一些默认值。

###### 4.3.3 checkCandidate

字面意思是检查候选者，不是很好理解，来看这个方法的文档注释：

> Check the given candidate's bean name, determining whether the corresponding bean definition needs to be registered or conflicts with an existing definition.检查给定候选者的Bean名称，以确定是否需要注册相应的Bean定义或与现有定义冲突。

原来它是检查BeanName是否冲突的。

###### 4.3.4 registerBeanDefinition

既然上面的检查不冲突，就可以进入到if结构体中，最后就可以注册 `BeanDefinition` 。

```java
protected void registerBeanDefinition(BeanDefinitionHolder definitionHolder, BeanDefinitionRegistry registry) {
    BeanDefinitionReaderUtils.registerBeanDefinition(definitionHolder, registry);
}
```

遇见了熟悉的方法，这个方法之前已经看过了，不再详细解析。（第10篇4.9.4.6章节）

至此，`BeanFactory` 的后置处理就结束了，但下面还有一组后置处理器，也是对 `BeanFactory` 进行处理。

#### 5. invokeBeanFactoryPostProcessors：执行BeanFactory创建后的后置处理器

```java
protected void invokeBeanFactoryPostProcessors(ConfigurableListableBeanFactory beanFactory) {
    // 5.1 执行BeanFactory后置处理器
    PostProcessorRegistrationDelegate.invokeBeanFactoryPostProcessors(beanFactory, getBeanFactoryPostProcessors());

    // Detect a LoadTimeWeaver and prepare for weaving, if found in the meantime
    // (e.g. through an @Bean method registered by ConfigurationClassPostProcessor)
    if (beanFactory.getTempClassLoader() == null && beanFactory.containsBean(LOAD_TIME_WEAVER_BEAN_NAME)) {
        beanFactory.addBeanPostProcessor(new LoadTimeWeaverAwareProcessor(beanFactory));
        beanFactory.setTempClassLoader(new ContextTypeMatchClassLoader(beanFactory.getBeanClassLoader()));
    }
}
```

注意这里又出现了一个新的概念：**`BeanFactoryPostProcessor`**。

##### 5.0 【重要】BeanFactoryPostProcessor

BeanFactoryPostProcessor（**BeanFactory后置处理器**）是一个接口，它只定义了一个方法：

```java
/**
 * Modify the application context's internal bean factory after its standard
 * initialization. All bean definitions will have been loaded, but no beans
 * will have been instantiated yet. This allows for overriding or adding
 * properties even to eager-initializing beans.
 * 在应用程序上下文的标准初始化之后修改其内部bean工厂。
 * 所有bean定义都已经加载，但是还没有实例化bean。这允许覆盖或添加属性，甚至可以初始化bean。
 */
void postProcessBeanFactory(ConfigurableListableBeanFactory beanFactory) throws BeansException;
```

实现了这个接口，`BeanFactory` 标准初始化完毕后，可以对这个 `BeanFactory` 进行**后置处理**。

这个时机下，**所有的 `BeanDefinition` 已经被加载，但没有Bean被实例化**。

另外，`BeanFactoryPostProcessor` 还有一个子接口：**`BeanDefinitionRegistryPostProcessor`**（**Bean定义注册的后置处理器**）

它额外定义了一个方法：

```java
/**
 * Modify the application context's internal bean definition registry after its
 * standard initialization. All regular bean definitions will have been loaded,
 * but no beans will have been instantiated yet. This allows for adding further
 * bean definitions before the next post-processing phase kicks in.
 * 在标准初始化之后修改应用程序上下文的内部bean定义注册表。
 * 所有常规bean定义都已加载，但还没有实例化bean。
 * 这允许在下一个后期处理阶段开始之前添加进一步的bean定义。
 */
void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) throws BeansException;
```

它的执行时机是**所有Bean的定义信息即将被加载但未实例化时**，也就是**先于 `BeanFactoryPostProcessor`**。

【**规律**】`BeanPostProcessor` 是对Bean的后置处理，`BeanFactoryPostProcessor` 是对 `BeanFactory` 的后置处理，后续再看到这样的同理。

回到源码：

##### 5.1 PostProcessorRegistrationDelegate.invokeBeanFactoryPostProcessors：回调后置处理器

这段源码非常长（130行+），为了浏览方便，我直接把关键注释写在源码中了。

```java
public static void invokeBeanFactoryPostProcessors(
        ConfigurableListableBeanFactory beanFactory, List<BeanFactoryPostProcessor> beanFactoryPostProcessors) {

// Invoke BeanDefinitionRegistryPostProcessors first, if any.
    // 首先调用BeanDefinitionRegistryPostProcessor
    Set<String> processedBeans = new HashSet<>();

// 这里要判断BeanFactory的类型，默认SpringBoot创建的BeanFactory是DefaultListableBeanFactory
    // 这个类实现了BeanDefinitionRegistry接口，则此if结构必进
    if (beanFactory instanceof BeanDefinitionRegistry) {
        BeanDefinitionRegistry registry = (BeanDefinitionRegistry) beanFactory;
        List<BeanFactoryPostProcessor> regularPostProcessors = new ArrayList<>();
        List<BeanDefinitionRegistryPostProcessor> registryProcessors = new ArrayList<>();

// foreach中为了区分不同的后置处理器，并划分到不同的集合中
        // 注意如果是BeanDefinitionRegistryPostProcessor，根据原理描述，还会回调它的后置处理功能
        for (BeanFactoryPostProcessor postProcessor : beanFactoryPostProcessors) {
            if (postProcessor instanceof BeanDefinitionRegistryPostProcessor) {
                BeanDefinitionRegistryPostProcessor registryProcessor =
                        (BeanDefinitionRegistryPostProcessor) postProcessor;
                registryProcessor.postProcessBeanDefinitionRegistry(registry);
                registryProcessors.add(registryProcessor);
            }
            else {
                regularPostProcessors.add(postProcessor);
            }
        }

// Do not initialize FactoryBeans here: We need to leave all regular beans
        // uninitialized to let the bean factory post-processors apply to them!
        // Separate between BeanDefinitionRegistryPostProcessors that implement
        // PriorityOrdered, Ordered, and the rest.
        // 不要在这里初始化BeanFactory：我们需要保留所有未初始化的常规bean，以便让bean工厂后处理器应用到它们！
        // 独立于实现PriorityOrdered、Ordered和其他的BeanDefinitionRegistryPostProcessor之间。
        List<BeanDefinitionRegistryPostProcessor> currentRegistryProcessors = new ArrayList<>();
        // 这部分实际上想表达的意思是，在创建Bean之前，要先执行这些
        // BeanDefinitionRegistryPostProcessor的后置处理方法，并且实现了
        // PriorityOrdered排序接口或实现了Ordered接口的Bean需要优先被加载。

// 下面一段是从BeanFactory中取出所有BeanDefinitionRegistryPostProcessor类型的全限定名（String[]）,
        // 放到下面遍历，还要判断这些类里是否有实现PriorityOrdered接口的，
        // 如果有，存到集合里，之后进行排序、统一回调这些后置处理器

// First, invoke the BeanDefinitionRegistryPostProcessors that implement PriorityOrdered.
        // 首先，调用实现PriorityOrdered接口的BeanDefinitionRegistryPostProcessors。
        String[] postProcessorNames =
                beanFactory.getBeanNamesForType(BeanDefinitionRegistryPostProcessor.class, true, false);
        for (String ppName : postProcessorNames) {
            if (beanFactory.isTypeMatch(ppName, PriorityOrdered.class)) {
                currentRegistryProcessors.add(beanFactory.getBean(ppName, BeanDefinitionRegistryPostProcessor.class));
                processedBeans.add(ppName);
            }
        }
        sortPostProcessors(currentRegistryProcessors, beanFactory);
        registryProcessors.addAll(currentRegistryProcessors);
        invokeBeanDefinitionRegistryPostProcessors(currentRegistryProcessors, registry);
        currentRegistryProcessors.clear();

// Next, invoke the BeanDefinitionRegistryPostProcessors that implement Ordered.
        // 接下来，调用实现Ordered接口的BeanDefinitionRegistryPostProcessors。
        postProcessorNames = beanFactory.getBeanNamesForType(BeanDefinitionRegistryPostProcessor.class, true, false);
        for (String ppName : postProcessorNames) {
            if (!processedBeans.contains(ppName) && beanFactory.isTypeMatch(ppName, Ordered.class)) {
                currentRegistryProcessors.add(beanFactory.getBean(ppName, BeanDefinitionRegistryPostProcessor.class));
                processedBeans.add(ppName);
            }
        }
        sortPostProcessors(currentRegistryProcessors, beanFactory);
        registryProcessors.addAll(currentRegistryProcessors);
        invokeBeanDefinitionRegistryPostProcessors(currentRegistryProcessors, registry);
        currentRegistryProcessors.clear();

// Finally, invoke all other BeanDefinitionRegistryPostProcessors until no further ones appear.
        // 最后，调用所有其他BeanDefinitionRegistryPostProcessor
        boolean reiterate = true;
        while (reiterate) {
            reiterate = false;
            postProcessorNames = beanFactory.getBeanNamesForType(BeanDefinitionRegistryPostProcessor.class, true, false);
            for (String ppName : postProcessorNames) {
                if (!processedBeans.contains(ppName)) {
                    currentRegistryProcessors.add(beanFactory.getBean(ppName, BeanDefinitionRegistryPostProcessor.class));
                    processedBeans.add(ppName);
                    reiterate = true;
                }
            }
            sortPostProcessors(currentRegistryProcessors, beanFactory);
            registryProcessors.addAll(currentRegistryProcessors);
            invokeBeanDefinitionRegistryPostProcessors(currentRegistryProcessors, registry);
            currentRegistryProcessors.clear();
        }

// Now, invoke the postProcessBeanFactory callback of all processors handled so far.
        // 回调所有BeanFactoryPostProcessor的postProcessBeanFactory方法
        invokeBeanFactoryPostProcessors(registryProcessors, beanFactory);
        invokeBeanFactoryPostProcessors(regularPostProcessors, beanFactory);
        // 先回调BeanDefinitionRegistryPostProcessor的postProcessBeanFactory方法
        // 再调用BeanFactoryPostProcessor的postProcessBeanFactory方法
    }

// 如果BeanFactory没有实现BeanDefinitionRegistry接口，则进入下面的代码流程
    else {
        // Invoke factory processors registered with the context instance.
        // 调用在上下文实例中注册的工厂处理器。
        invokeBeanFactoryPostProcessors(beanFactoryPostProcessors, beanFactory);
    }

// 下面的部分是回调BeanFactoryPostProcessor，思路与上面的几乎一样

// Do not initialize FactoryBeans here: We need to leave all regular beans
    // uninitialized to let the bean factory post-processors apply to them!
    String[] postProcessorNames =
            beanFactory.getBeanNamesForType(BeanFactoryPostProcessor.class, true, false);

// Separate between BeanFactoryPostProcessors that implement PriorityOrdered,
    // Ordered, and the rest.
    List<BeanFactoryPostProcessor> priorityOrderedPostProcessors = new ArrayList<>();
    List<String> orderedPostProcessorNames = new ArrayList<>();
    List<String> nonOrderedPostProcessorNames = new ArrayList<>();
    for (String ppName : postProcessorNames) {
        if (processedBeans.contains(ppName)) {
            // skip - already processed in first phase above
        }
        else if (beanFactory.isTypeMatch(ppName, PriorityOrdered.class)) {
            priorityOrderedPostProcessors.add(beanFactory.getBean(ppName, BeanFactoryPostProcessor.class));
        }
        else if (beanFactory.isTypeMatch(ppName, Ordered.class)) {
            orderedPostProcessorNames.add(ppName);
        }
        else {
            nonOrderedPostProcessorNames.add(ppName);
        }
    }

// First, invoke the BeanFactoryPostProcessors that implement PriorityOrdered.
    sortPostProcessors(priorityOrderedPostProcessors, beanFactory);
    invokeBeanFactoryPostProcessors(priorityOrderedPostProcessors, beanFactory);

// Next, invoke the BeanFactoryPostProcessors that implement Ordered.
    List<BeanFactoryPostProcessor> orderedPostProcessors = new ArrayList<>();
    for (String postProcessorName : orderedPostProcessorNames) {
        orderedPostProcessors.add(beanFactory.getBean(postProcessorName, BeanFactoryPostProcessor.class));
    }
    sortPostProcessors(orderedPostProcessors, beanFactory);
    invokeBeanFactoryPostProcessors(orderedPostProcessors, beanFactory);

// Finally, invoke all other BeanFactoryPostProcessors.
    List<BeanFactoryPostProcessor> nonOrderedPostProcessors = new ArrayList<>();
    for (String postProcessorName : nonOrderedPostProcessorNames) {
        nonOrderedPostProcessors.add(beanFactory.getBean(postProcessorName, BeanFactoryPostProcessor.class));
    }
    invokeBeanFactoryPostProcessors(nonOrderedPostProcessors, beanFactory);

    // Clear cached merged bean definitions since the post-processors might have
    // modified the original metadata, e.g. replacing placeholders in values...
    // 清理缓存
    beanFactory.clearMetadataCache();
}
```

这一部分非常重要。可以简单地这样理解：

将这段源码分成几部分来看：

###### 5.1.1 参数中的PostProcessor分类

```java
        // foreach中为了区分不同的后置处理器，并划分到不同的集合中
        // 注意如果是BeanDefinitionRegistryPostProcessor，根据原理描述，还会回调它的后置处理功能
        for (BeanFactoryPostProcessor postProcessor : beanFactoryPostProcessors) {
            if (postProcessor instanceof BeanDefinitionRegistryPostProcessor) {
                BeanDefinitionRegistryPostProcessor registryProcessor =
                        (BeanDefinitionRegistryPostProcessor) postProcessor;
                registryProcessor.postProcessBeanDefinitionRegistry(registry);
                registryProcessors.add(registryProcessor);
            }
            else {
                regularPostProcessors.add(postProcessor);
            }
        }
```

遍历一次后，把同时也是 `BeanDefinitionRegistryPostProcessor` 的后置处理器单独挑出来，直接回调 `postProcessBeanDefinitionRegistry` 方法。

通过Debug，发现传入这个方法的参数中，`beanFactoryPostProcessors` 有3个：

这里面同时属于 `BeanDefinitionRegistryPostProcessor` 有两个：

###### 5.1.2 BeanFactory中取+排序+回调

```java
        // First, invoke the BeanDefinitionRegistryPostProcessors that implement PriorityOrdered.
        // 首先，调用实现PriorityOrdered接口的BeanDefinitionRegistryPostProcessors。
        String[] postProcessorNames =
                beanFactory.getBeanNamesForType(BeanDefinitionRegistryPostProcessor.class, true, false);
        for (String ppName : postProcessorNames) {
            if (beanFactory.isTypeMatch(ppName, PriorityOrdered.class)) {
                currentRegistryProcessors.add(beanFactory.getBean(ppName, BeanDefinitionRegistryPostProcessor.class));
                processedBeans.add(ppName);
            }
        }
        sortPostProcessors(currentRegistryProcessors, beanFactory);
        registryProcessors.addAll(currentRegistryProcessors);
        invokeBeanDefinitionRegistryPostProcessors(currentRegistryProcessors, registry);
        currentRegistryProcessors.clear();
```

```java
        // Next, invoke the BeanDefinitionRegistryPostProcessors that implement Ordered.
        // 接下来，调用实现Ordered接口的BeanDefinitionRegistryPostProcessors。
        postProcessorNames = beanFactory.getBeanNamesForType(BeanDefinitionRegistryPostProcessor.class, true, false);
        for (String ppName : postProcessorNames) {
            if (!processedBeans.contains(ppName) && beanFactory.isTypeMatch(ppName, Ordered.class)) {
                currentRegistryProcessors.add(beanFactory.getBean(ppName, BeanDefinitionRegistryPostProcessor.class));
                processedBeans.add(ppName);
            }
        }
        sortPostProcessors(currentRegistryProcessors, beanFactory);
        registryProcessors.addAll(currentRegistryProcessors);
        invokeBeanDefinitionRegistryPostProcessors(currentRegistryProcessors, registry);
        currentRegistryProcessors.clear();
```

它把 `BeanFactory` 中所有的 `BeanDefinitionRegistryPostProcessor` 分成三部分：实现 `PriorityOrdered` 接口的、实现 `Ordered` 接口的，普通的。

上面的两部分源码就是对前两种方式进行回调：筛选，排序，注册，回调，清除。

之后又用同样的逻辑，取所有的 `BeanFactoryPostProcessor` ，进行同样的操作，不再重复描述。

逻辑不算复杂，下面介绍几个重要的后置处理器。

##### 5.2 【重要扩展】ConfigurationClassPostProcessor

在上述源码的Debug中，第二环节获取所有 `BeanDefinitionRegistryPostProcessor` 的时候发现了一个后置处理器：`ConfigurationClassPostProcessor` 。

它的文档注释原文翻译：

> BeanFactoryPostProcessor used for bootstrapping processing of @Configuration classes. Registered by default when using <context:annotation-config/> or <context:component-scan/>. Otherwise, may be declared manually as with any other BeanFactoryPostProcessor. This post processor is priority-ordered as it is important that any Bean methods declared in @Configuration classes have their corresponding bean definitions registered before any other BeanFactoryPostProcessor executes.BeanFactoryPostProcessor，用于 @Configuration 类的扫描加载处理。 使用 <context：annotation-config /> 或 <context：component-scan /> 时默认注册。否则，可以像其他任何 BeanFactoryPostProcessor 一样手动声明。 此后处理器按优先级排序，因为在 @Configuration 标注的类中声明的任何Bean方法在执行任何其他 BeanFactoryPostProcessor 之前都要注册其相应的Bean定义，这一点很重要。

那自然我们应该去看它的 `postProcessBeanDefinitionRegistry` 方法：

```java
public void postProcessBeanDefinitionRegistry(BeanDefinitionRegistry registry) {
    int registryId = System.identityHashCode(registry);
    if (this.registriesPostProcessed.contains(registryId)) {
        throw new IllegalStateException(
                "postProcessBeanDefinitionRegistry already called on this post-processor against " + registry);
    }
    if (this.factoriesPostProcessed.contains(registryId)) {
        throw new IllegalStateException(
                "postProcessBeanFactory already called on this post-processor against " + registry);
    }
    this.registriesPostProcessed.add(registryId);

    processConfigBeanDefinitions(registry);
}
```

它取出 `BeanFactory` 的id，并在下面的if结构中判断是否已经被调用过了。确定没有，在被调用过的集合中加上当前 `BeanFactory` 的id，之后调用 `processConfigBeanDefinitions` 方法：

```java
public void processConfigBeanDefinitions(BeanDefinitionRegistry registry) {
    List<BeanDefinitionHolder> configCandidates = new ArrayList<>();
    String[] candidateNames = registry.getBeanDefinitionNames();

// 5.2.1 确定配置类和组件
    for (String beanName : candidateNames) {
        BeanDefinition beanDef = registry.getBeanDefinition(beanName);
        if (ConfigurationClassUtils.isFullConfigurationClass(beanDef) ||
                ConfigurationClassUtils.isLiteConfigurationClass(beanDef)) {
            if (logger.isDebugEnabled()) {
                logger.debug("Bean definition has already been processed as a configuration class: " + beanDef);
            }
        }
        else if (ConfigurationClassUtils.checkConfigurationClassCandidate(beanDef, this.metadataReaderFactory)) {
            configCandidates.add(new BeanDefinitionHolder(beanDef, beanName));
        }
    }

// Return immediately if no @Configuration classes were found
    if (configCandidates.isEmpty()) {
        return;
    }

// Sort by previously determined @Order value, if applicable
    // 对配置类进行排序
    configCandidates.sort((bd1, bd2) -> {
        int i1 = ConfigurationClassUtils.getOrder(bd1.getBeanDefinition());
        int i2 = ConfigurationClassUtils.getOrder(bd2.getBeanDefinition());
        return Integer.compare(i1, i2);
    });

// Detect any custom bean name generation strategy supplied through the enclosing application context
    // 5.2.2 加载获取BeanNameGenerator
    SingletonBeanRegistry sbr = null;
    if (registry instanceof SingletonBeanRegistry) {
        sbr = (SingletonBeanRegistry) registry;
        if (!this.localBeanNameGeneratorSet) {
            BeanNameGenerator generator = (BeanNameGenerator) sbr.getSingleton(CONFIGURATION_BEAN_NAME_GENERATOR);
            if (generator != null) {
                this.componentScanBeanNameGenerator = generator;
                this.importBeanNameGenerator = generator;
            }
        }
    }

if (this.environment == null) {
        this.environment = new StandardEnvironment();
    }

// Parse each @Configuration class
    // 加载所有配置类
    ConfigurationClassParser parser = new ConfigurationClassParser(
            this.metadataReaderFactory, this.problemReporter, this.environment,
            this.resourceLoader, this.componentScanBeanNameGenerator, registry);

Set<BeanDefinitionHolder> candidates = new LinkedHashSet<>(configCandidates);
    Set<ConfigurationClass> alreadyParsed = new HashSet<>(configCandidates.size());
    do {
        // 5.2.3 解析配置类
        parser.parse(candidates);
        parser.validate();

Set<ConfigurationClass> configClasses = new LinkedHashSet<>(parser.getConfigurationClasses());
        configClasses.removeAll(alreadyParsed);

// Read the model and create bean definitions based on its content
        if (this.reader == null) {
            this.reader = new ConfigurationClassBeanDefinitionReader(
                    registry, this.sourceExtractor, this.resourceLoader, this.environment,
                    this.importBeanNameGenerator, parser.getImportRegistry());
        }
        // 5.2.4 解析配置类中的内容
        this.reader.loadBeanDefinitions(configClasses);
        alreadyParsed.addAll(configClasses);

candidates.clear();
        // 5.2.5 加载配置类中的被@Bean标注的组件
        if (registry.getBeanDefinitionCount() > candidateNames.length) {
            String[] newCandidateNames = registry.getBeanDefinitionNames();
            Set<String> oldCandidateNames = new HashSet<>(Arrays.asList(candidateNames));
            Set<String> alreadyParsedClasses = new HashSet<>();
            for (ConfigurationClass configurationClass : alreadyParsed) {
                alreadyParsedClasses.add(configurationClass.getMetadata().getClassName());
            }
            for (String candidateName : newCandidateNames) {
                if (!oldCandidateNames.contains(candidateName)) {
                    BeanDefinition bd = registry.getBeanDefinition(candidateName);
                    if (ConfigurationClassUtils.checkConfigurationClassCandidate(bd, this.metadataReaderFactory) &&
                            !alreadyParsedClasses.contains(bd.getBeanClassName())) {
                        candidates.add(new BeanDefinitionHolder(bd, candidateName));
                    }
                }
            }
            candidateNames = newCandidateNames;
        }
    }
    while (!candidates.isEmpty());

// Register the ImportRegistry as a bean in order to support ImportAware @Configuration classes
    // 将ImportRegistry注册为Bean，以支持ImportAware @Configuration类
    if (sbr != null && !sbr.containsSingleton(IMPORT_REGISTRY_BEAN_NAME)) {
        sbr.registerSingleton(IMPORT_REGISTRY_BEAN_NAME, parser.getImportRegistry());
    }

    // 清除缓存
    if (this.metadataReaderFactory instanceof CachingMetadataReaderFactory) {
        // Clear cache in externally provided MetadataReaderFactory; this is a no-op
        // for a shared cache since it'll be cleared by the ApplicationContext.
        ((CachingMetadataReaderFactory) this.metadataReaderFactory).clearCache();
    }
}
```

源码中有几部分是比较复杂且重要的环节，咱们一一来看：

###### 5.2.1 确定配置类和组件

```java
    // 5.2.1 确定配置类和组件
    for (String beanName : candidateNames) {
        BeanDefinition beanDef = registry.getBeanDefinition(beanName);
        if (ConfigurationClassUtils.isFullConfigurationClass(beanDef) ||
                ConfigurationClassUtils.isLiteConfigurationClass(beanDef)) {
            if (logger.isDebugEnabled()) {
                logger.debug("Bean definition has already been processed as a configuration class: " + beanDef);
            }
        }
        else if (ConfigurationClassUtils.checkConfigurationClassCandidate(beanDef, this.metadataReaderFactory)) {
            configCandidates.add(new BeanDefinitionHolder(beanDef, beanName));
        }
    }
```

这里面需要关注的几个 `ConfigurationClassUtils` 方法：

- `isFullConfigurationClass`：判断一个配置类是否为full类型
- `isLiteConfigurationClass`：判断一个配置类是否为lite类型
- `checkConfigurationClassCandidate`：检查一个类是否为配置类

上面提到了两个类型，都是可以从源码中看到的。那这个full和lite都是什么呢？

###### 5.2.1.1 full与lite

其实，了解full和lite，只需要到最后一个方法 `checkConfigurationClassCandidate` 中看一下就知道了：

```java
public static boolean checkConfigurationClassCandidate(
        BeanDefinition beanDef, MetadataReaderFactory metadataReaderFactory) {

// ......

if (isFullConfigurationCandidate(metadata)) {
        beanDef.setAttribute(CONFIGURATION_CLASS_ATTRIBUTE, CONFIGURATION_CLASS_FULL);
    }
    else if (isLiteConfigurationCandidate(metadata)) {
        beanDef.setAttribute(CONFIGURATION_CLASS_ATTRIBUTE, CONFIGURATION_CLASS_LITE);
    }
    else {
        return false;
    }

// It's a full or lite configuration candidate... Let's determine the order value, if any.
    Integer order = getOrder(metadata);
    if (order != null) {
        beanDef.setAttribute(ORDER_ATTRIBUTE, order);
    }

    return true;
}
```

前面大段的代码都是校验和获取注解标注信息（已省略），核心的源码在底下的if-else结构中。它会调 `isFullConfigurationCandidate` 和 `isLiteConfigurationCandidate` 来校验Bean的类型，而这两个方法的声明：

```java
public static boolean isFullConfigurationCandidate(AnnotationMetadata metadata) {
    return metadata.isAnnotated(Configuration.class.getName());
}

private static final Set<String> candidateIndicators = new HashSet<>(8);
static {
    candidateIndicators.add(Component.class.getName());
    candidateIndicators.add(ComponentScan.class.getName());
    candidateIndicators.add(Import.class.getName());
    candidateIndicators.add(ImportResource.class.getName());
}
public static boolean isLiteConfigurationCandidate(AnnotationMetadata metadata) {
    // Do not consider an interface or an annotation...
    if (metadata.isInterface()) {
        return false;
    }

// Any of the typical annotations found?
    for (String indicator : candidateIndicators) {
        if (metadata.isAnnotated(indicator)) {
            return true;
        }
    }

    // Finally, let's look for @Bean methods...
    try {
        return metadata.hasAnnotatedMethods(Bean.class.getName());
    }
    catch (Throwable ex) {
        if (logger.isDebugEnabled()) {
            logger.debug("Failed to introspect @Bean methods on class [" + metadata.getClassName() + "]: " + ex);
        }
        return false;
    }
}
```

由这段源码可以得知：

- full：`@Configuration` 标注的类
- lite：有 `@Component` 、`@ComponentScan` 、`@Import` 、`@ImportResource` 标注的类，以及 `@Configuration` 中标注 `@Bean` 的类。

###### 5.2.2 加载获取BeanNameGenerator

```java
    // Detect any custom bean name generation strategy supplied through the enclosing application context
    // 5.2.2 加载获取BeanNameGenerator
    SingletonBeanRegistry sbr = null;
    if (registry instanceof SingletonBeanRegistry) {
        sbr = (SingletonBeanRegistry) registry;
        if (!this.localBeanNameGeneratorSet) {
            BeanNameGenerator generator = (BeanNameGenerator) sbr.getSingleton(CONFIGURATION_BEAN_NAME_GENERATOR);
            if (generator != null) {
                this.componentScanBeanNameGenerator = generator;
                this.importBeanNameGenerator = generator;
            }
        }
    }
```

它要在这个地方获取 `BeanNameGenerator` ，然而通过Debug发现它是null，故先放一边。

###### 5.2.3 解析配置类 与 包扫描的触发时机

```java
    do {
        // 5.2.3 解析配置类
        parser.parse(candidates);
        parser.validate();

        // ......
```

这一段第一句就是核心：`parse`

```java
public void parse(Set<BeanDefinitionHolder> configCandidates) {
    for (BeanDefinitionHolder holder : configCandidates) {
        BeanDefinition bd = holder.getBeanDefinition();
        try {
            if (bd instanceof AnnotatedBeanDefinition) {
                parse(((AnnotatedBeanDefinition) bd).getMetadata(), holder.getBeanName());
            }
            else if (bd instanceof AbstractBeanDefinition && ((AbstractBeanDefinition) bd).hasBeanClass()) {
                parse(((AbstractBeanDefinition) bd).getBeanClass(), holder.getBeanName());
            }
            else {
                parse(bd.getBeanClassName(), holder.getBeanName());
            }
        }
        // catch ......
    }

    this.deferredImportSelectorHandler.process();
}
```

它要遍历每一个 `BeanDefinition`，并根据类型来决定如何解析。SpringBoot 通常使用注解配置，这里会进入第一个if结构：

```java
protected final void parse(AnnotationMetadata metadata, String beanName) throws IOException {
    processConfigurationClass(new ConfigurationClass(metadata, beanName));
}

protected void processConfigurationClass(ConfigurationClass configClass) throws IOException {
    if (this.conditionEvaluator.shouldSkip(configClass.getMetadata(), ConfigurationPhase.PARSE_CONFIGURATION)) {
        return;
    }

ConfigurationClass existingClass = this.configurationClasses.get(configClass);
    if (existingClass != null) {
        if (configClass.isImported()) {
            if (existingClass.isImported()) {
                existingClass.mergeImportedBy(configClass);
            }
            // Otherwise ignore new imported config class; existing non-imported class overrides it.
            return;
        }
        else {
            // Explicit bean definition found, probably replacing an import.
            // Let's remove the old one and go with the new one.
            this.configurationClasses.remove(configClass);
            this.knownSuperclasses.values().removeIf(configClass::equals);
        }
    }

// Recursively process the configuration class and its superclass hierarchy.
    SourceClass sourceClass = asSourceClass(configClass);
    do {
        sourceClass = doProcessConfigurationClass(configClass, sourceClass);
    }
    while (sourceClass != null);

    this.configurationClasses.put(configClass, configClass);
}
```

上面的方法又调到下面，下面的方法中先进行判断。这里的 `existingClass` 容易被误解，它在这个方法的最后，把当前传入的组件存到一个Map中，每次组件进到这个方法时先校验是否有这个类型的Bean了，如果有，要进行一些处理。如果没有，往下走，进入到do-while结构中，它要执行 `doProcessConfigurationClass` 方法。

```java
protected final SourceClass doProcessConfigurationClass(ConfigurationClass configClass, SourceClass sourceClass)
        throws IOException {

if (configClass.getMetadata().isAnnotated(Component.class.getName())) {
        // Recursively process any member (nested) classes first
        processMemberClasses(configClass, sourceClass);
    }

// Process any @PropertySource annotations
    for (AnnotationAttributes propertySource : AnnotationConfigUtils.attributesForRepeatable(
            sourceClass.getMetadata(), PropertySources.class,
            org.springframework.context.annotation.PropertySource.class)) {
        if (this.environment instanceof ConfigurableEnvironment) {
            processPropertySource(propertySource);
        }
        // ......
    }

// Process any @ComponentScan annotations
    Set<AnnotationAttributes> componentScans = AnnotationConfigUtils.attributesForRepeatable(
            sourceClass.getMetadata(), ComponentScans.class, ComponentScan.class);
    if (!componentScans.isEmpty() &&
            !this.conditionEvaluator.shouldSkip(sourceClass.getMetadata(), ConfigurationPhase.REGISTER_BEAN)) {
        for (AnnotationAttributes componentScan : componentScans) {
            // The config class is annotated with @ComponentScan -> perform the scan immediately
            // ......
        }
    }

// Process any @Import annotations
    processImports(configClass, sourceClass, getImports(sourceClass), true);

// Process any @ImportResource annotations
    AnnotationAttributes importResource =
            AnnotationConfigUtils.attributesFor(sourceClass.getMetadata(), ImportResource.class);
    if (importResource != null) {
        // ......
    }

// Process individual @Bean methods
    Set<MethodMetadata> beanMethods = retrieveBeanMethodMetadata(sourceClass);
    for (MethodMetadata methodMetadata : beanMethods) {
        configClass.addBeanMethod(new BeanMethod(methodMetadata, configClass));
    }

// Process default methods on interfaces
    processInterfaces(configClass, sourceClass);

// Process superclass, if any
    if (sourceClass.getMetadata().hasSuperClass()) {
        String superclass = sourceClass.getMetadata().getSuperClassName();
        if (superclass != null && !superclass.startsWith("java") &&
                !this.knownSuperclasses.containsKey(superclass)) {
            this.knownSuperclasses.put(superclass, configClass);
            // Superclass found, return its annotation metadata and recurse
            return sourceClass.getSuperClass();
        }
    }

    // No superclass -> processing is complete
    return null;
}
```

从源码注释中已经看出，它来解析 `@PropertySource` 、`@ComponentScan` 、`@Import` 、`@ImportResource` 、`@Bean` 等注解，并整理成一个 `ConfigClass` 。

由此可知，在这一步，一个配置类的所有信息就已经被解析完成了。

咱们以解析 `@ComponentScan` 为例：

###### 5.2.3.1 解析 @ComponentScan

```java
    // Process any @ComponentScan annotations
    Set<AnnotationAttributes> componentScans = AnnotationConfigUtils.attributesForRepeatable(
            sourceClass.getMetadata(), ComponentScans.class, ComponentScan.class);
    if (!componentScans.isEmpty() &&
            !this.conditionEvaluator.shouldSkip(sourceClass.getMetadata(), ConfigurationPhase.REGISTER_BEAN)) {
        for (AnnotationAttributes componentScan : componentScans) {
            // The config class is annotated with @ComponentScan -> perform the scan immediately
            Set<BeanDefinitionHolder> scannedBeanDefinitions =
                    this.componentScanParser.parse(componentScan, sourceClass.getMetadata().getClassName());
            // Check the set of scanned definitions for any further config classes and parse recursively if needed
            for (BeanDefinitionHolder holder : scannedBeanDefinitions) {
                BeanDefinition bdCand = holder.getBeanDefinition().getOriginatingBeanDefinition();
                if (bdCand == null) {
                    bdCand = holder.getBeanDefinition();
                }
                if (ConfigurationClassUtils.checkConfigurationClassCandidate(bdCand, this.metadataReaderFactory)) {
                    parse(bdCand.getBeanClassName(), holder.getBeanName());
                }
            }
        }
    }
```

这部分解析要追踪到 `componentScanParser` 的parse方法中，它用来真正的做注解解析：

###### 5.2.3.2 ComponentScanAnnotationParser.parse

（这里只记录重要的部分，中间省略的部分小伙伴们可借助IDE查看）

```java
public Set<BeanDefinitionHolder> parse(AnnotationAttributes componentScan, final String declaringClass) {
    ClassPathBeanDefinitionScanner scanner = new ClassPathBeanDefinitionScanner(this.registry,
            componentScan.getBoolean("useDefaultFilters"), this.environment, this.resourceLoader);

    // ......
    return scanner.doScan(StringUtils.toStringArray(basePackages));
}
```

先看一眼最后的return：`doScan` 方法！原来包扫描的触发时机在这里：**执行 `ConfigurationClassPostProcessor` 的 `postProcessBeanDefinitionRegistry` 方法，解析 `@ComponentScan` 时触发**。

除了最后的 `doScan`，这里面有一个关注的点：

###### 5.2.3.3 new ClassPathBeanDefinitionScanner

这个构造方法中有点细节：

```java
private BeanNameGenerator beanNameGenerator = new AnnotationBeanNameGenerator();
private ScopeMetadataResolver scopeMetadataResolver = new AnnotationScopeMetadataResolver();

public ClassPathBeanDefinitionScanner(BeanDefinitionRegistry registry, boolean useDefaultFilters,
        Environment environment, @Nullable ResourceLoader resourceLoader) {

Assert.notNull(registry, "BeanDefinitionRegistry must not be null");
    this.registry = registry;

    if (useDefaultFilters) {
        registerDefaultFilters();
    }
    setEnvironment(environment);
    setResourceLoader(resourceLoader);
}
```

终于找到这个 `BeanNameGenerator` 的类型了：`AnnotationBeanNameGenerator` 。

###### 5.2.3.4 【扩展】AnnotationBeanNameGenerator 的Bean名称生成规则

```java
public class AnnotationBeanNameGenerator implements BeanNameGenerator {

private static final String COMPONENT_ANNOTATION_CLASSNAME = "org.springframework.stereotype.Component";

@Override
	public String generateBeanName(BeanDefinition definition, BeanDefinitionRegistry registry) {
		if (definition instanceof AnnotatedBeanDefinition) {
			String beanName = determineBeanNameFromAnnotation((AnnotatedBeanDefinition) definition);
			if (StringUtils.hasText(beanName)) {
				// Explicit bean name found.
				return beanName;
			}
		}
		// Fallback: generate a unique default bean name.
		return buildDefaultBeanName(definition, registry);
	}

@Nullable
	protected String determineBeanNameFromAnnotation(AnnotatedBeanDefinition annotatedDef) {
		AnnotationMetadata amd = annotatedDef.getMetadata();
		Set<String> types = amd.getAnnotationTypes();
		String beanName = null;
		for (String type : types) {
			AnnotationAttributes attributes = AnnotationConfigUtils.attributesFor(amd, type);
			if (attributes != null && isStereotypeWithNameValue(type, amd.getMetaAnnotationTypes(type), attributes)) {
				Object value = attributes.get("value");
				if (value instanceof String) {
					String strVal = (String) value;
					if (StringUtils.hasLength(strVal)) {
						if (beanName != null && !strVal.equals(beanName)) {
							throw new IllegalStateException("Stereotype annotations suggest inconsistent " +
									"component names: '" + beanName + "' versus '" + strVal + "'");
						}
						beanName = strVal;
					}
				}
			}
		}
		return beanName;
	}

protected boolean isStereotypeWithNameValue(String annotationType,
			Set<String> metaAnnotationTypes, @Nullable Map<String, Object> attributes) {

boolean isStereotype = annotationType.equals(COMPONENT_ANNOTATION_CLASSNAME) ||
				metaAnnotationTypes.contains(COMPONENT_ANNOTATION_CLASSNAME) ||
				annotationType.equals("javax.annotation.ManagedBean") ||
				annotationType.equals("javax.inject.Named");

return (isStereotype && attributes != null && attributes.containsKey("value"));
	}

protected String buildDefaultBeanName(BeanDefinition definition, BeanDefinitionRegistry registry) {
		return buildDefaultBeanName(definition);
	}

protected String buildDefaultBeanName(BeanDefinition definition) {
		String beanClassName = definition.getBeanClassName();
		Assert.state(beanClassName != null, "No bean class name set");
		String shortClassName = ClassUtils.getShortName(beanClassName);
		return Introspector.decapitalize(shortClassName);
	}

}

    public static String decapitalize(String name) {
        if (name == null || name.length() == 0) {
            return name;
        }
        if (name.length() > 1 && Character.isUpperCase(name.charAt(1)) &&
                        Character.isUpperCase(name.charAt(0))){
            return name;
        }
        char chars[] = name.toCharArray();
        chars[0] = Character.toLowerCase(chars[0]);
        return new String(chars);
    }
```

从重写的方法开始：

先执行下面的 `determineBeanNameFromAnnotation` 方法，看这些模式注解上是否有显式的声明 value 属性，如果没有，则进入下面的 `buildDefaultBeanName` 方法，它会取类名的全称，之后调 `Introspector.decapitalize` 方法将首字母转为小写。

###### 5.2.4 loadBeanDefinitions：解析配置类中的内容

```java
public void loadBeanDefinitions(Set<ConfigurationClass> configurationModel) {
    TrackedConditionEvaluator trackedConditionEvaluator = new TrackedConditionEvaluator();
    for (ConfigurationClass configClass : configurationModel) {
        loadBeanDefinitionsForConfigurationClass(configClass, trackedConditionEvaluator);
    }
}
```

这里它会循环所有的配置类，去加载配置类里面的Bean定义信息。继续往下看：

```java
private void loadBeanDefinitionsForConfigurationClass(
        ConfigurationClass configClass, TrackedConditionEvaluator trackedConditionEvaluator) {

if (trackedConditionEvaluator.shouldSkip(configClass)) {
        String beanName = configClass.getBeanName();
        if (StringUtils.hasLength(beanName) && this.registry.containsBeanDefinition(beanName)) {
            this.registry.removeBeanDefinition(beanName);
        }
        this.importRegistry.removeImportingClass(configClass.getMetadata().getClassName());
        return;
    }

if (configClass.isImported()) {
        registerBeanDefinitionForImportedConfigurationClass(configClass);
    }
    for (BeanMethod beanMethod : configClass.getBeanMethods()) {
        loadBeanDefinitionsForBeanMethod(beanMethod);
    }

    loadBeanDefinitionsFromImportedResources(configClass.getImportedResources());
    loadBeanDefinitionsFromRegistrars(configClass.getImportBeanDefinitionRegistrars());
}
```

由于在之前已经解析过这个 `configClass` 了，所以在这里可以很容易的解析出这里面的 `@Import` 、标注了 `@Bean` 的方法、`@ImportResource` 等，并进行相应处理。

咱们以 读取 `@Bean` 注解标注的方法为例，看一眼它对Bean的解析和加载：（方法很长，关键注释已标注在源码中）

```java
private void loadBeanDefinitionsForBeanMethod(BeanMethod beanMethod) {
    ConfigurationClass configClass = beanMethod.getConfigurationClass();
    MethodMetadata metadata = beanMethod.getMetadata();
    String methodName = metadata.getMethodName();

// Do we need to mark the bean as skipped by its condition?
    // 判断该Bean是否要被跳过
    if (this.conditionEvaluator.shouldSkip(metadata, ConfigurationPhase.REGISTER_BEAN)) {
        configClass.skippedBeanMethods.add(methodName);
        return;
    }
    if (configClass.skippedBeanMethods.contains(methodName)) {
        return;
    }

// 校验是否标注了@Bean注解
    AnnotationAttributes bean = AnnotationConfigUtils.attributesFor(metadata, Bean.class);
    Assert.state(bean != null, "No @Bean annotation attributes");

// Consider name and any aliases
    // Bean的名称处理规则：如果Bean中标注了name，取第一个；没有标注，取方法名
    List<String> names = new ArrayList<>(Arrays.asList(bean.getStringArray("name")));
    String beanName = (!names.isEmpty() ? names.remove(0) : methodName);

// Register aliases even when overridden
    // 其余声明的name被视为Bean的别名
    for (String alias : names) {
        this.registry.registerAlias(beanName, alias);
    }

// Has this effectively been overridden before (e.g. via XML)?
    // 注解Bean如果覆盖了xml配置的Bean，要看BeanName是否相同，相同则抛出异常
    if (isOverriddenByExistingDefinition(beanMethod, beanName)) {
        if (beanName.equals(beanMethod.getConfigurationClass().getBeanName())) {
            throw new BeanDefinitionStoreException(beanMethod.getConfigurationClass().getResource().getDescription(),
                    beanName, "Bean name derived from @Bean method '" + beanMethod.getMetadata().getMethodName() +
                    "' clashes with bean name for containing configuration class; please make those names unique!");
        }
        return;
    }

ConfigurationClassBeanDefinition beanDef = new ConfigurationClassBeanDefinition(configClass, metadata);
    beanDef.setResource(configClass.getResource());
    beanDef.setSource(this.sourceExtractor.extractSource(metadata, configClass.getResource()));

// 被@Bean标注的方法是否为一个静态方法
    if (metadata.isStatic()) {
        // static @Bean method
        beanDef.setBeanClassName(configClass.getMetadata().getClassName());
        beanDef.setFactoryMethodName(methodName);
    }
    else {
        // instance @Bean method
        // 实例Bean，设置它的工厂方法为该方法名。这个工厂方法在后续创建Bean时会利用到
        beanDef.setFactoryBeanName(configClass.getBeanName());
        beanDef.setUniqueFactoryMethodName(methodName);
    }
    beanDef.setAutowireMode(AbstractBeanDefinition.AUTOWIRE_CONSTRUCTOR);
    beanDef.setAttribute(org.springframework.beans.factory.annotation.RequiredAnnotationBeanPostProcessor.
            SKIP_REQUIRED_CHECK_ATTRIBUTE, Boolean.TRUE);

AnnotationConfigUtils.processCommonDefinitionAnnotations(beanDef, metadata);

Autowire autowire = bean.getEnum("autowire");
    if (autowire.isAutowire()) {
        beanDef.setAutowireMode(autowire.value());
    }

// 是否需要自动注入
    boolean autowireCandidate = bean.getBoolean("autowireCandidate");
    if (!autowireCandidate) {
        beanDef.setAutowireCandidate(false);
    }

// 初始化方法
    String initMethodName = bean.getString("initMethod");
    if (StringUtils.hasText(initMethodName)) {
        beanDef.setInitMethodName(initMethodName);
    }

// 销毁方法
    String destroyMethodName = bean.getString("destroyMethod");
    beanDef.setDestroyMethodName(destroyMethodName);

// Consider scoping
    ScopedProxyMode proxyMode = ScopedProxyMode.NO;
    AnnotationAttributes attributes = AnnotationConfigUtils.attributesFor(metadata, Scope.class);
    if (attributes != null) {
        beanDef.setScope(attributes.getString("value"));
        proxyMode = attributes.getEnum("proxyMode");
        if (proxyMode == ScopedProxyMode.DEFAULT) {
            proxyMode = ScopedProxyMode.NO;
        }
    }

// Replace the original bean definition with the target one, if necessary
    // 如果有必要，将原始bean定义替换为目标bean定义
    BeanDefinition beanDefToRegister = beanDef;
    if (proxyMode != ScopedProxyMode.NO) {
        BeanDefinitionHolder proxyDef = ScopedProxyCreator.createScopedProxy(
                new BeanDefinitionHolder(beanDef, beanName), this.registry,
                proxyMode == ScopedProxyMode.TARGET_CLASS);
        beanDefToRegister = new ConfigurationClassBeanDefinition(
                (RootBeanDefinition) proxyDef.getBeanDefinition(), configClass, metadata);
    }

    if (logger.isTraceEnabled()) {
        logger.trace(String.format("Registering bean definition for @Bean method %s.%s()",
                configClass.getMetadata().getClassName(), beanName));
    }
    // 注册Bean定义信息
    this.registry.registerBeanDefinition(beanName, beanDefToRegister);
}
```

###### 5.2.5 加载配置类中的未加载完成的被@Bean标注的组件

```java
        // 5.2.4 加载配置类中的被@Bean标注的组件
        if (registry.getBeanDefinitionCount() > candidateNames.length) {
            String[] newCandidateNames = registry.getBeanDefinitionNames();
            Set<String> oldCandidateNames = new HashSet<>(Arrays.asList(candidateNames));
            Set<String> alreadyParsedClasses = new HashSet<>();
            for (ConfigurationClass configurationClass : alreadyParsed) {
                alreadyParsedClasses.add(configurationClass.getMetadata().getClassName());
            }
            for (String candidateName : newCandidateNames) {
                if (!oldCandidateNames.contains(candidateName)) {
                    BeanDefinition bd = registry.getBeanDefinition(candidateName);
                    if (ConfigurationClassUtils.checkConfigurationClassCandidate(bd, this.metadataReaderFactory) &&
                            !alreadyParsedClasses.contains(bd.getBeanClassName())) {
                        candidates.add(new BeanDefinitionHolder(bd, candidateName));
                    }
                }
            }
            candidateNames = newCandidateNames;
        }
```

这部分的判断比较有趣：在上面的配置类都加载完成后，它要比对 `BeanDefinition` 的个数，以及被处理过的数量。只要数量不对应，就会展开那些配置类继续加载。这部分的源码与上面比较类似，只是检测逻辑的不同，文档不再详细展开，有兴趣的小伙伴可以自行Debug看一下效果。

（这部分想演示出这个情况，文档提供一个思路：声明一个配置类，再在配置类中使用 `@Bean` 注册一个组件，这样进到这个方法中就会引发两个数量不对应进入if结构体了）

#### 小结

1. `BeanFactoryPostProcessor` 的执行时机是所有的 `BeanDefinition` 已经被加载，但没有Bean被实例化。
2. 包扫描会加载所有 `BeanDefinition`，底层采用递归扫描。
3. IOC容器使用 `ConfigurationClassPostProcessor` 进行注解组件解析。



## 后置处理器与监听器注册

### IOC：刷新容器-后置处理器、监听器的注册


本篇解析6-10步骤：

```java
        // Register bean processors that intercept bean creation.
        //4.7.6 注册Bean的后置处理器
        registerBeanPostProcessors(beanFactory);

// Initialize message source for this context.
        //4.7.7 初始化MessageSource（SpringMVC）
        initMessageSource();

// Initialize event multicaster for this context.
        //4.7.8 初始化事件派发器
        initApplicationEventMulticaster();

// Initialize other special beans in specific context subclasses.
        //4.7.9、4.8 子类的多态onRefresh
        onRefresh();

        // Check for listener beans and register them.
        //4.7.10 注册监听器
        registerListeners();
```

#### 6. registerBeanPostProcessors：注册 BeanPostProcessor

（源码较长，关键注释已标注在源码中）

```java
protected void registerBeanPostProcessors(ConfigurableListableBeanFactory beanFactory) {
    PostProcessorRegistrationDelegate.registerBeanPostProcessors(beanFactory, this);
}

public static void registerBeanPostProcessors(
        ConfigurableListableBeanFactory beanFactory, AbstractApplicationContext applicationContext) {

String[] postProcessorNames = beanFactory.getBeanNamesForType(BeanPostProcessor.class, true, false);

// Register BeanPostProcessorChecker that logs an info message when
    // a bean is created during BeanPostProcessor instantiation, i.e. when
    // a bean is not eligible for getting processed by all BeanPostProcessors.
    int beanProcessorTargetCount = beanFactory.getBeanPostProcessorCount() + 1 + postProcessorNames.length;
    beanFactory.addBeanPostProcessor(new BeanPostProcessorChecker(beanFactory, beanProcessorTargetCount));

// 这次拿的接口类型是BeanPostProcessor，并且创建了更多的List，分别存放不同的PostProcessor
    // Separate between BeanPostProcessors that implement PriorityOrdered,
    // Ordered, and the rest.
    List<BeanPostProcessor> priorityOrderedPostProcessors = new ArrayList<>();
    List<BeanPostProcessor> internalPostProcessors = new ArrayList<>();
    List<String> orderedPostProcessorNames = new ArrayList<>();
    List<String> nonOrderedPostProcessorNames = new ArrayList<>();
    // 根据PriorityOrdered、Ordered接口，对这些BeanPostProcessor进行归类
    for (String ppName : postProcessorNames) {
        if (beanFactory.isTypeMatch(ppName, PriorityOrdered.class)) {
            BeanPostProcessor pp = beanFactory.getBean(ppName, BeanPostProcessor.class);
            priorityOrderedPostProcessors.add(pp);
            // MergedBeanDefinitionPostProcessor类型的后置处理器被单独放在一个集合中，说明该接口比较特殊
            if (pp instanceof MergedBeanDefinitionPostProcessor) {
                internalPostProcessors.add(pp);
            }
        }
        else if (beanFactory.isTypeMatch(ppName, Ordered.class)) {
            orderedPostProcessorNames.add(ppName);
        }
        else {
            nonOrderedPostProcessorNames.add(ppName);
        }
    }

// First, register the BeanPostProcessors that implement PriorityOrdered.
    // 注册实现了PriorityOrdered的BeanPostProcessor
    sortPostProcessors(priorityOrderedPostProcessors, beanFactory);
    registerBeanPostProcessors(beanFactory, priorityOrderedPostProcessors);

// Next, register the BeanPostProcessors that implement Ordered.
    // 注册实现了Ordered接口的BeanPostProcessor
    List<BeanPostProcessor> orderedPostProcessors = new ArrayList<>();
    for (String ppName : orderedPostProcessorNames) {
        BeanPostProcessor pp = beanFactory.getBean(ppName, BeanPostProcessor.class);
        orderedPostProcessors.add(pp);
        if (pp instanceof MergedBeanDefinitionPostProcessor) {
            internalPostProcessors.add(pp);
        }
    }
    sortPostProcessors(orderedPostProcessors, beanFactory);
    registerBeanPostProcessors(beanFactory, orderedPostProcessors);

// Now, register all regular BeanPostProcessors.
    // 注册普通的BeanPostProcessor
    List<BeanPostProcessor> nonOrderedPostProcessors = new ArrayList<>();
    for (String ppName : nonOrderedPostProcessorNames) {
        BeanPostProcessor pp = beanFactory.getBean(ppName, BeanPostProcessor.class);
        nonOrderedPostProcessors.add(pp);
        if (pp instanceof MergedBeanDefinitionPostProcessor) {
            internalPostProcessors.add(pp);
        }
    }
    registerBeanPostProcessors(beanFactory, nonOrderedPostProcessors);

// Finally, re-register all internal BeanPostProcessors.
    // 最最后，才注册那些MergedBeanDefinitionPostProcessor
    sortPostProcessors(internalPostProcessors, beanFactory);
    registerBeanPostProcessors(beanFactory, internalPostProcessors);

    // Re-register post-processor for detecting inner beans as ApplicationListeners,
    // moving it to the end of the processor chain (for picking up proxies etc).
    // 手动加了一个ApplicationListenerDetector，它是一个ApplicationListener的检测器
    // 这个检测器用于在最后检测IOC容器中的Bean是否为ApplicationListener接口的实现类，如果是，还会有额外的作用
    // 实际上它并不是手动加，而是重新注册它，让他位于所有后置处理器的最末尾位置
    beanFactory.addBeanPostProcessor(new ApplicationListenerDetector(applicationContext));
}
```

发现这段套路与前面看到的注册 `BeanFactoryPostProcessor` 极其类似！

这里面有几个特殊的组件，着重看一眼：

##### 6.1 MergedBeanDefinitionPostProcessor

它是一个接口，它的文档注释原文翻译：

> Post-processor callback interface for merged bean definitions at runtime. BeanPostProcessor implementations may implement this sub-interface in order to post-process the merged bean definition (a processed copy of the original bean definition) that the Spring BeanFactory uses to create a bean instance. The postProcessMergedBeanDefinition method may for example introspect the bean definition in order to prepare some cached metadata before post-processing actual instances of a bean. It is also allowed to modify the bean definition but only for definition properties which are actually intended for concurrent modification. Essentially, this only applies to operations defined on the RootBeanDefinition itself but not to the properties of its base classes.在运行时用于合并bean定义的后处理器回调接口。 BeanPostProcessor 实现可以实现此子接口，以便对Spring BeanFactory 用于创建bean实例的合并bean定义（原始bean定义的已处理副本）进行后处理。postProcessMergedBeanDefinition 方法可以例如内省bean定义，以便在对bean的实际实例进行后处理之前准备一些缓存的元数据。还允许修改bean定义，但只允许修改实际上用于并行修改的定义属性。本质上，这仅适用于 RootBeanDefinition 本身定义的操作，不适用于其基类的属性。

文档注释似乎并没有说明太多意思，它是说给 `BeanDefinition` 做合并。借助IDEA，看一眼它的实现类：

这里面有一个我们一看就很兴奋： `AutowiredAnnotationBeanPostProcessor` 。

###### 6.1.1 【重要】AutowiredAnnotationBeanPostProcessor

它的文档注释非常长，这里我们截取重要的部分：

> BeanPostProcessor implementation that autowires annotated fields, setter methods and arbitrary config methods. Such members to be injected are detected through a Java 5 annotation: by default, Spring's @Autowired and @Value annotations. Also supports JSR-330's @Inject annotation, if available, as a direct alternative to Spring's own @Autowired. Only one constructor (at max) of any given bean class may declare this annotation with the 'required' parameter set to true, indicating the constructor to autowire when used as a Spring bean. If multiple non-required constructors declare the annotation, they will be considered as candidates for autowiring. The constructor with the greatest number of dependencies that can be satisfied by matching beans in the Spring container will be chosen. If none of the candidates can be satisfied, then a primary/default constructor (if present) will be used. If a class only declares a single constructor to begin with, it will always be used, even if not annotated. An annotated constructor does not have to be public. Fields are injected right after construction of a bean, before any config methods are invoked. Such a config field does not have to be public.BeanPostProcessor 的实现，可自动连接带注解的字段，setter方法和任意config方法。通过Java 5注释检测要注入的此类成员：默认情况下，Spring的 @Autowired 和 @Value 注解。 还支持JSR-330的 @Inject 注解（如果可用），以替代Spring自己的 @Autowired 。 任何给定bean类的构造器（最大）只能使用 "required" 参数设置为true来声明此批注，指示在用作Spring bean时要自动装配的构造器。如果多个不需要的构造函数声明了注释，则它们将被视为自动装配的候选对象。将选择通过匹配Spring容器中的bean可以满足的依赖关系数量最多的构造函数。如果没有一个候选者满意，则将使用主/默认构造函数（如果存在）。如果一个类仅声明一个单一的构造函数开始，即使没有注释，也将始终使用它。带注解的构造函数不必是public的。 在构造任何bean之后，调用任何配置方法之前，立即注入字段。这样的配置字段不必是public的。 Config方法可以具有任意名称和任意数量的参数。这些参数中的每个参数都将与Spring容器中的匹配bean自动连接。 Bean属性设置器方法实际上只是这种常规config方法的特例。 Config方法不必是public的。

很明确，它就是完成自动注入的Bean后置处理器。它实现了 `MergedBeanDefinitionPostProcessor` ，那自然要实现接口中的方法：`postProcessMergedBeanDefinition` ：

```java
public void postProcessMergedBeanDefinition(RootBeanDefinition beanDefinition, Class<?> beanType, String beanName) {
    InjectionMetadata metadata = findAutowiringMetadata(beanName, beanType, null);
    metadata.checkConfigMembers(beanDefinition);
}
```

这里面分两步，先获取注入的依赖，再进行对象检查。分步骤来看：

###### 6.1.1.1 findAutowiringMetadata

```java
private InjectionMetadata findAutowiringMetadata(String beanName, Class<?> clazz, @Nullable PropertyValues pvs) {
    // Fall back to class name as cache key, for backwards compatibility with custom callers.
    String cacheKey = (StringUtils.hasLength(beanName) ? beanName : clazz.getName());
    // Quick check on the concurrent map first, with minimal locking.
    // 首先从缓存中取，如果没有才创建
    InjectionMetadata metadata = this.injectionMetadataCache.get(cacheKey);
    if (InjectionMetadata.needsRefresh(metadata, clazz)) {
        synchronized (this.injectionMetadataCache) {
            metadata = this.injectionMetadataCache.get(cacheKey);
            if (InjectionMetadata.needsRefresh(metadata, clazz)) {
                if (metadata != null) {
                    metadata.clear(pvs);
                }
                // 构建自动装配的信息
                metadata = buildAutowiringMetadata(clazz);
                // 放入缓存
                this.injectionMetadataCache.put(cacheKey, metadata);
            }
        }
    }
    return metadata;
}
```

这部分实现中使用了双检锁来保证线程安全，之后会构建自动装配的 metadata：

###### 6.1.1.2 buildAutowiringMetadata

```java
private InjectionMetadata buildAutowiringMetadata(final Class<?> clazz) {
    List<InjectionMetadata.InjectedElement> elements = new ArrayList<>();
    Class<?> targetClass = clazz;

// 循环获取父类信息
    do {
        final List<InjectionMetadata.InjectedElement> currElements = new ArrayList<>();

// 循环获取类上的属性，并判断是否有@Autowired等注入类注解
        ReflectionUtils.doWithLocalFields(targetClass, field -> {
            AnnotationAttributes ann = findAutowiredAnnotation(field);
            if (ann != null) {
                if (Modifier.isStatic(field.getModifiers())) {
                    if (logger.isInfoEnabled()) {
                        logger.info("Autowired annotation is not supported on static fields: " + field);
                    }
                    return;
                }
                boolean required = determineRequiredStatus(ann);
                currElements.add(new AutowiredFieldElement(field, required));
            }
        });

// 循环获取类上的方法，并判断是否有需要依赖的项
        ReflectionUtils.doWithLocalMethods(targetClass, method -> {
            Method bridgedMethod = BridgeMethodResolver.findBridgedMethod(method);
            if (!BridgeMethodResolver.isVisibilityBridgeMethodPair(method, bridgedMethod)) {
                return;
            }
            AnnotationAttributes ann = findAutowiredAnnotation(bridgedMethod);
            if (ann != null && method.equals(ClassUtils.getMostSpecificMethod(method, clazz))) {
                if (Modifier.isStatic(method.getModifiers())) {
                    if (logger.isInfoEnabled()) {
                        logger.info("Autowired annotation is not supported on static methods: " + method);
                    }
                    return;
                }
                if (method.getParameterCount() == 0) {
                    if (logger.isInfoEnabled()) {
                        logger.info("Autowired annotation should only be used on methods with parameters: " +
                                method);
                    }
                }
                boolean required = determineRequiredStatus(ann);
                PropertyDescriptor pd = BeanUtils.findPropertyForMethod(bridgedMethod, clazz);
                currElements.add(new AutowiredMethodElement(method, required, pd));
            }
        });

elements.addAll(0, currElements);
        targetClass = targetClass.getSuperclass();
    }
    while (targetClass != null && targetClass != Object.class);

    return new InjectionMetadata(clazz, elements);
}
```

先看一眼这个 do-while 循环，这个 do-while 循环是用来一步一步往父类上爬的（可以看到这个循环体的最后一行是获取父类，判断条件是判断是否爬到了 `Object`）。

循环体中，先是反射遍历当前类的属性，并判断上面是否有 `@Autowired` 等类型的注解。这部分注解的加载在这个方法中可以追溯到：

```java
private final Set<Class<? extends Annotation>> autowiredAnnotationTypes = new LinkedHashSet<>(4);

public AutowiredAnnotationBeanPostProcessor() {
    this.autowiredAnnotationTypes.add(Autowired.class);
    this.autowiredAnnotationTypes.add(Value.class);
    try {
        this.autowiredAnnotationTypes.add((Class<? extends Annotation>)
                ClassUtils.forName("javax.inject.Inject", AutowiredAnnotationBeanPostProcessor.class.getClassLoader()));
    }
    catch (ClassNotFoundException ex) {
        // JSR-330 API not available - simply skip.
    }
}

private AnnotationAttributes findAutowiredAnnotation(AccessibleObject ao) {
    if (ao.getAnnotations().length > 0) {  // autowiring annotations have to be local
        for (Class<? extends Annotation> type : this.autowiredAnnotationTypes) {
            AnnotationAttributes attributes = AnnotatedElementUtils.getMergedAnnotationAttributes(ao, type);
            if (attributes != null) {
                return attributes;
            }
        }
    }
    return null;
}
```

可以发现这部分判断的几种注解： `@Autowired` 、`@Value` 、`@Inject` 。

之后又获取方法上的注解，也保存进去。最后获取父类，一层一层往上爬，直到循环跳出，方法结束。

```java
public void postProcessMergedBeanDefinition(RootBeanDefinition beanDefinition, Class<?> beanType, String beanName) {
    InjectionMetadata metadata = findAutowiringMetadata(beanName, beanType, null);
    metadata.checkConfigMembers(beanDefinition);
}
```

下面要到 `checkConfigMembers` 方法了：

###### 6.1.1.3 checkConfigMembers

```java
public void checkConfigMembers(RootBeanDefinition beanDefinition) {
    Set<InjectedElement> checkedElements = new LinkedHashSet<>(this.injectedElements.size());
    for (InjectedElement element : this.injectedElements) {
        Member member = element.getMember();
        if (!beanDefinition.isExternallyManagedConfigMember(member)) {
            beanDefinition.registerExternallyManagedConfigMember(member);
            checkedElements.add(element);
            if (logger.isTraceEnabled()) {
                logger.trace("Registered injected element on class [" + this.targetClass.getName() + "]: " + element);
            }
        }
    }
    this.checkedElements = checkedElements;
}
```

这里面涉及到一个叫 `Member` 的概念：

> Member is an interface that reflects identifying information about a single member (a field or a method) or a constructor.反映有关单个成员（字段或方法）或构造函数的标识信息的接口。

看文档注释的意思，大概可以看出来它是表示类中的一个成员。

源码中的for循环，里面有两个很迷的方法。这两个方法都操作了 `RootBeanDefinition` 的一个属性：`externallyManagedConfigMember` ，而这部分除了这两个方法有调过，也没别的地方用了。这两个方法除了这个方法中使用过，别的地方也没用过。那看来这部分不会影响到大局，大可忽略。

至此，咱先对 `AutowiredAnnotationBeanPostProcessor` 这个后置处理器作一个了解，自动注入的原理会在后续慢慢看到。

再来看一个后置处理器，它是在注册BeanPostProcessor中的最后一步，显式声明的。

##### 6.2 ApplicationListenerDetector

注意上面的截图，会发现 `ApplicationListenerDetector` 也实现了 `MergedBeanDefinitionPostProcessor` 。而且这个类在之前第11篇的3.3章节介绍过它，它的作用是收集监听器。它是 `BeanPostProcessor` ，但同时它也是 `MergedBeanDefinitionPostProcessor` 。那咱来看看它实现 `MergedBeanDefinitionPostProcessor` 后实现的方法：

```java
public void postProcessMergedBeanDefinition(RootBeanDefinition beanDefinition, Class<?> beanType, String beanName) {
    this.singletonNames.put(beanName, beanDefinition.isSingleton());
}
```

可以发现非常简单，只是保存Bean是否为单实例Bean的信息。这个单实例Bean的机制在前面也提到过，只有单实例Bean才能注册到监听器列表中。

至此，`registerBeanPostProcessors` 方法执行完毕。

#### 7. initMessageSource：初始化MessageSource

```java
public static final String MESSAGE_SOURCE_BEAN_NAME = "messageSource";

protected void initMessageSource() {
    ConfigurableListableBeanFactory beanFactory = getBeanFactory();
    // 检查是否已经存在了MessageSource组件，如果有，直接赋值
    if (beanFactory.containsLocalBean(MESSAGE_SOURCE_BEAN_NAME)) {
        this.messageSource = beanFactory.getBean(MESSAGE_SOURCE_BEAN_NAME, MessageSource.class);
        // Make MessageSource aware of parent MessageSource.
        if (this.parent != null && this.messageSource instanceof HierarchicalMessageSource) {
            HierarchicalMessageSource hms = (HierarchicalMessageSource) this.messageSource;
            if (hms.getParentMessageSource() == null) {
                // Only set parent context as parent MessageSource if no parent MessageSource
                // registered already.
                hms.setParentMessageSource(getInternalParentMessageSource());
            }
        }
        if (logger.isDebugEnabled()) {
            logger.debug("Using MessageSource [" + this.messageSource + "]");
        }
    }
    // 如果没有，创建一个，并注册到BeanFactory中
    else {
        // Use empty MessageSource to be able to accept getMessage calls.
        DelegatingMessageSource dms = new DelegatingMessageSource();
        dms.setParentMessageSource(getInternalParentMessageSource());
        this.messageSource = dms;
        beanFactory.registerSingleton(MESSAGE_SOURCE_BEAN_NAME, this.messageSource);
        if (logger.isDebugEnabled()) {
            logger.debug("Unable to locate MessageSource with name '" + MESSAGE_SOURCE_BEAN_NAME +
                    "': using default [" + this.messageSource + "]");
        }
    }
}
```

这个组件我们在之前第22篇的IOC容器介绍（1.3.2章节）中说过，它是实现国际化的接口。

它默认创建的实现类是 `DelegatingMessageSource` ，它的文档注释：

> Empty MessageSource that delegates all calls to the parent MessageSource. If no parent is available, it simply won't resolve any message.Used as placeholder by AbstractApplicationContext, if the context doesn't define its own MessageSource. Not intended for direct use in applications.空的MessageSource，将所有调用委派给父MessageSource。如果没有父母可用，它将根本无法解决任何消息。如果上下文未定义其自己的MessageSource，则AbstractApplicationContext用作占位符。不适用于直接在应用程序中使用。

其实，`DelegatingMessageSource` 扮演的角色更像是一种 “消息源解析的委派”（用户未指定时，IOC容器会默认使用 `DelegatingMessageSource` ）。它的功能比较简单：将字符串和参数数组格式化为一个国际化后的消息。

#### 8. initApplicationEventMulticaster：初始化事件派发器

```java
private ApplicationEventMulticaster applicationEventMulticaster;

public static final String APPLICATION_EVENT_MULTICASTER_BEAN_NAME = "applicationEventMulticaster";

// 初始化当前ApplicationContext的事件广播器
protected void initApplicationEventMulticaster() {
    ConfigurableListableBeanFactory beanFactory = getBeanFactory();
    if (beanFactory.containsLocalBean(APPLICATION_EVENT_MULTICASTER_BEAN_NAME)) {
        // 8.1 ApplicationEventMulticaster
        this.applicationEventMulticaster =
                beanFactory.getBean(APPLICATION_EVENT_MULTICASTER_BEAN_NAME, ApplicationEventMulticaster.class);
        if (logger.isDebugEnabled()) {
            logger.debug("Using ApplicationEventMulticaster [" + this.applicationEventMulticaster + "]");
        }
    }
    else {
        this.applicationEventMulticaster = new SimpleApplicationEventMulticaster(beanFactory);
        beanFactory.registerSingleton(APPLICATION_EVENT_MULTICASTER_BEAN_NAME, this.applicationEventMulticaster);
        if (logger.isDebugEnabled()) {
            logger.debug("Unable to locate ApplicationEventMulticaster with name '" +
                    APPLICATION_EVENT_MULTICASTER_BEAN_NAME +
                    "': using default [" + this.applicationEventMulticaster + "]");
        }
    }
}
```

源码中先判断IOC容器中是否有名称为 `applicationEventMulticaster` 的Bean，没有就默认注册一个 `ApplicationEventMulticaster` 。

##### 8.1 ApplicationEventMulticaster

它的文档注释原文翻译：

> Interface to be implemented by objects that can manage a number of ApplicationListener objects, and publish events to them.由可以管理多个 ApplicationListener 对象并向其发布事件的对象实现的接口。

可以发现它就是一个事件发布器而已。它的核心方法-事件发布的源码如下：

```java
@Override
public void multicastEvent(ApplicationEvent event) {
    // 往下面的方法跳转
    multicastEvent(event, resolveDefaultEventType(event));
}

@Override
public void multicastEvent(final ApplicationEvent event, @Nullable ResolvableType eventType) {
    ResolvableType type = (eventType != null ? eventType : resolveDefaultEventType(event));
    Executor executor = getTaskExecutor();
    for (ApplicationListener<?> listener : getApplicationListeners(event, type)) {
        if (executor != null) {
            executor.execute(() -> invokeListener(listener, event));
        }
        else {
            // 执行监听器，继续往下跳转
            invokeListener(listener, event);
        }
    }
}

protected void invokeListener(ApplicationListener<?> listener, ApplicationEvent event) {
    ErrorHandler errorHandler = getErrorHandler();
    if (errorHandler != null) {
        try {
            // 真正执行监听器的方法
            doInvokeListener(listener, event);
        }
        catch (Throwable err) {
            errorHandler.handleError(err);
        }
    }
    else {
        doInvokeListener(listener, event);
    }
}

private void doInvokeListener(ApplicationListener listener, ApplicationEvent event) {
    try {
        // ApplicationListener的方法
        listener.onApplicationEvent(event);
    }
    catch (ClassCastException ex) {
        String msg = ex.getMessage();
        if (msg == null || matchesClassCastMessage(msg, event.getClass())) {
            // Possibly a lambda-defined listener which we could not resolve the generic event type for
            // -> let's suppress the exception and just log a debug message.
            Log logger = LogFactory.getLog(getClass());
            if (logger.isTraceEnabled()) {
                logger.trace("Non-matching event type for listener: " + listener, ex);
            }
        }
        else {
            throw ex;
        }
    }
}
```

可以发现它最终会执行到 `ApplicationListener` 的 `onApplicationEvent` 方法，思路比较简单。

#### 9. onRefresh：子类扩展刷新

```java
protected void onRefresh() throws BeansException {
    // For subclasses: do nothing by default.
}
```

发现又是模板方法。这部分我们单独留到第16篇再展开描述，SpringBoot 在这里做了额外的操作。

#### 10. registerListeners：注册监听器

```java
protected void registerListeners() {
    // Register statically specified listeners first.
    // 把所有的IOC容器中以前缓存好的一组ApplicationListener取出来，添加到事件派发器中
    for (ApplicationListener<?> listener : getApplicationListeners()) {
        getApplicationEventMulticaster().addApplicationListener(listener);
    }

// Do not initialize FactoryBeans here: We need to leave all regular beans
    // uninitialized to let post-processors apply to them!
    // 拿到BeanFactory中定义的所有的ApplicationListener类型的组件全部取出，添加到事件派发器中
    String[] listenerBeanNames = getBeanNamesForType(ApplicationListener.class, true, false);
    for (String listenerBeanName : listenerBeanNames) {
        getApplicationEventMulticaster().addApplicationListenerBean(listenerBeanName);
    }

// Publish early application events now that we finally have a multicaster...
    // 10.1 广播早期事件
    Set<ApplicationEvent> earlyEventsToProcess = this.earlyApplicationEvents;
    this.earlyApplicationEvents = null;
    if (earlyEventsToProcess != null) {
        for (ApplicationEvent earlyEvent : earlyEventsToProcess) {
            getApplicationEventMulticaster().multicastEvent(earlyEvent);
        }
    }
}

public Collection<ApplicationListener<?>> getApplicationListeners() {
    return this.applicationListeners;
}
```

监听器在IOC容器中早就注册好了，取出来后要放入事件广播器，以方便事件广播器广播事件。

在上面方法的最后一段，它广播了早期事件。

之前在最开始我们遇见过早期事件（refresh的第一步），下面咱要真正的说说这个早期事件了。

##### 10.1 earlyEvent：早期事件

在 `refresh` 方法的 `prepareRefresh` 中，最后一步有这么一句：

```java
    // Allow for the collection of early ApplicationEvents,
    // to be published once the multicaster is available...
    // 这个集合的作用，是保存容器中的一些事件，以便在合适的时候利用事件广播器来广播这些事件
    // 【配合registerListeners方法中的第三部分使用】
    this.earlyApplicationEvents = new LinkedHashSet<>();
```

这里存储的事件会在这一步被触发。由此也知早期事件的发布时机：**监听器被注册，但其余的单实例Bean还没有创建时**。

实际上，通过Debug，发现默认情况下这里根本就没有早期事件：

由此也大概猜到这个早期事件的设计由来：**留给开发者，在后置处理器和监听器都被创建好，其余的单实例Bean还没有创建时，提供一个预留的时机来处理一些额外的事情**。

##### 10.2 【扩展】SpringFramework中的观察者模式

实际上 `ApplicationListener` 与 `ApplicationEvent` 这样的事件派发机制就是观察者模式的体现。

事件派发器（广播器）、事件监听器（被通知者）、事件（`ApplicationEvent`），其实这就是构成观察者模式的三大组件

- 广播器（`ApplicationEventMulticaster`）：观察事件发生
- 被通知者（`ApplicationListener`）：接收广播器发送的广播，并做出相应的行为

#### 小结

1. 注册 `BeanPostProcessor` 的时机是 `BeanFactory` 已经初始化完毕，监听器还没有注册之前。
2. 注册 `ApplicationListener` 的时机是 `BeanPostProcessor` 注册完，但还没有初始化单实例Bean。
3. IOC容器使用 `ApplicationEventMulticaster` 广播事件。

【至此，后置处理器、监听器都已经注册完毕，下面到了最复杂的部分之一：**初始化剩余单实例Bean**】



## 刷新后处理与 SpringBoot 扩展

### IOC：刷新后的处理&SpringBoot在刷新容器时的扩展


本篇我们解析第9、12、13步骤：

```java
public void refresh() throws BeansException, IllegalStateException {
    synchronized (this.startupShutdownMonitor) {
        // ...
        try {
            // ...
            // Initialize other special beans in specific context subclasses.
            // 9. 子类的多态onRefresh
            onRefresh();
            // ...
            // Last step: publish corresponding event.
            // 12. 完成容器的创建工作
            finishRefresh();
        }
        catch (BeansException ex) {
            // ...
        }

        finally {
            // Reset common introspection caches in Spring's core, since we
            // might not ever need metadata for singleton beans anymore...
            // 13. 清除缓存
            resetCommonCaches();
        }
    }
}
```

#### 12. finishRefresh：完成容器的创建工作

```java
protected void finishRefresh() {
    // Clear context-level resource caches (such as ASM metadata from scanning).
    // 清除资源缓存(如扫描的ASM元数据)
    clearResourceCaches();

// Initialize lifecycle processor for this context.
    // 初始化生命周期处理器
    initLifecycleProcessor();

// Propagate refresh to lifecycle processor first.
    // 将刷新传播到生命周期处理器
    getLifecycleProcessor().onRefresh();

// Publish the final event.
    // 发布容器刷新完成的事件，让监听器去回调各自的方法
    publishEvent(new ContextRefreshedEvent(this));

    // Participate in LiveBeansView MBean, if active.
    LiveBeansView.registerApplicationContext(this);
}
```

这些方法可以看得出来都属于最终的步骤了，简单扫一眼：

##### 12.1 clearResourceCaches：清除资源缓存

```java
public void clearResourceCaches() {
    this.resourceCaches.clear();
}
```

非常简单，不再深入。

##### 12.2 initLifecycleProcessor：初始化生命周期处理器

```java
public static final String LIFECYCLE_PROCESSOR_BEAN_NAME = "lifecycleProcessor";

protected void initLifecycleProcessor() {
    ConfigurableListableBeanFactory beanFactory = getBeanFactory();
    if (beanFactory.containsLocalBean(LIFECYCLE_PROCESSOR_BEAN_NAME)) {
        this.lifecycleProcessor =
                beanFactory.getBean(LIFECYCLE_PROCESSOR_BEAN_NAME, LifecycleProcessor.class);
        if (logger.isTraceEnabled()) {
            logger.trace("Using LifecycleProcessor [" + this.lifecycleProcessor + "]");
        }
    }
    else {
        DefaultLifecycleProcessor defaultProcessor = new DefaultLifecycleProcessor();
        defaultProcessor.setBeanFactory(beanFactory);
        this.lifecycleProcessor = defaultProcessor;
        beanFactory.registerSingleton(LIFECYCLE_PROCESSOR_BEAN_NAME, this.lifecycleProcessor);
        if (logger.isTraceEnabled()) {
            logger.trace("No '" + LIFECYCLE_PROCESSOR_BEAN_NAME + "' bean, using " +
                    "[" + this.lifecycleProcessor.getClass().getSimpleName() + "]");
        }
    }
}
```

可以发现源码中默认使用 `DefaultLifecycleProcessor` 作为生命周期处理器。它的文档注释原文翻译：

> Default implementation of the LifecycleProcessor strategy.LifecycleProcessor: Strategy interface for processing Lifecycle beans within the ApplicationContext.用于在 ApplicationContext 中处理 Lifecycle 类型的Bean的策略接口。

从文档注释中又看到了一个新的概念：`Lifecycle` 。

###### 12.2.1 LifeCycle

`Lifecycle` 是一个接口，它的文档注释原文翻译：

> A common interface defining methods for start/stop lifecycle control. The typical use case for this is to control asynchronous processing. NOTE: This interface does not imply specific auto-startup semantics. Consider implementing SmartLifecycle for that purpose. Can be implemented by both components (typically a Spring bean defined in a Spring context) and containers (typically a Spring ApplicationContext itself). Containers will propagate start/stop signals to all components that apply within each container, e.g. for a stop/restart scenario at runtime. Can be used for direct invocations or for management operations via JMX. In the latter case, the org.springframework.jmx.export.MBeanExporter will typically be defined with an org.springframework.jmx.export.assembler.InterfaceBasedMBeanInfoAssembler, restricting the visibility of activity-controlled components to the Lifecycle interface. Note that the present Lifecycle interface is only supported on top-level singleton beans. On any other component, the Lifecycle interface will remain undetected and hence ignored. Also, note that the extended SmartLifecycle interface provides sophisticated integration with the application context's startup and shutdown phases.定义启动/停止生命周期控制方法的通用接口。典型的用例是控制异步处理。注意：此接口并不意味着特定的自动启动语义。考虑为此目的实施 SmartLifecycle。可以通过组件（通常是在Spring上下文中定义的 Spring bean）和容器（通常是Spring ApplicationContext 本身）实现。容器会将开始/停止信号传播到每个容器中应用的所有组件，例如在运行时停止/重新启动的情况。可以用于直接调用或通过JMX进行管理操作。在后一种情况下，通常将使用 InterfaceBasedMBeanInfoAssembler 定义 MBeanExporter，从而将活动控制的组件的可见性限制为 Lifecycle 接口。请注意，当前的 Lifecycle 接口仅在顶级 Singleton Bean 上受支持。在任何其他组件上，Lifecycle 接口将保持未被检测到并因此被忽略。另外，请注意，扩展的 SmartLifecycle 接口提供了与应用程序上下文的启动和关闭阶段的复杂集成。

到这里我们大概看懂了，实现了 `Lifecycle` 接口的Bean可以**规范化它的生命周期**，可以在IOC容器的启动、停止时，自动触发接口中定义的 `start` 方法和 `stop` 方法。

###### 12.2.2 【扩展】SmartLifeCycle

`Lifecycle` 还有一个扩展的接口：`SmartLifecycle` ，它的文档注释关键部分：

> An extension of the Lifecycle interface for those objects that require to be started upon ApplicationContext refresh and/or shutdown in a particular order. The isAutoStartup() return value indicates whether this object should be started at the time of a context refresh. The callback-accepting stop(Runnable) method is useful for objects that have an asynchronous shutdown process. Any implementation of this interface must invoke the callback's run() method upon shutdown completion to avoid unnecessary delays in the overall ApplicationContext shutdown.Lifecycle 接口的扩展，用于那些需要按特定顺序刷新和/或关闭IOC容器时启动的对象。 isAutoStartup() 返回值指示是否应在刷新上下文时启动此对象。接受回调的 stop(Runnable) 方法对于具有异步关闭过程的对象很有用。此接口的任何实现都必须在关闭完成时调用回调的 run() 方法，以避免在整个IOC容器关闭中不必要的延迟。

从文档注释中可以看到一个很关键的信息：`stop(Runnable)` ，这就意味着可以在 `stop` 动作中再注入一些自定义逻辑。从它的方法定义中，可以看到它还扩展了几个方法：

- `getPhase` - Bean的排序（类似于 `@Order` 或 `Ordered` 接口）
- `isAutoStartup` - 如果该方法返回 false ，则不执行 start 方法。

这两个接口比较简单，不再深入研究，有兴趣的小伙伴可以写几个测试Demo体会一下。

##### 12.3 getLifecycleProcessor().onRefresh()

紧接着调用这些 `LifecycleProcessor` 的 `onRefresh` 方法。具体到 `DefaultLifecycleProcessor` 中：

```java
public void onRefresh() {
    startBeans(true);
    this.running = true;
}

private void startBeans(boolean autoStartupOnly) {
    Map<String, Lifecycle> lifecycleBeans = getLifecycleBeans();
    Map<Integer, LifecycleGroup> phases = new HashMap<>();
    lifecycleBeans.forEach((beanName, bean) -> {
        if (!autoStartupOnly || (bean instanceof SmartLifecycle && ((SmartLifecycle) bean).isAutoStartup())) {
            int phase = getPhase(bean);
            LifecycleGroup group = phases.get(phase);
            if (group == null) {
                group = new LifecycleGroup(phase, this.timeoutPerShutdownPhase, lifecycleBeans, autoStartupOnly);
                phases.put(phase, group);
            }
            group.add(beanName, bean);
        }
    });
    if (!phases.isEmpty()) {
        List<Integer> keys = new ArrayList<>(phases.keySet());
        Collections.sort(keys);
        for (Integer key : keys) {
            phases.get(key).start();
        }
    }
}
```

源码也是比较好理解的，它会从IOC容器中找出所有的 `Lifecycle` 类型的Bean，遍历回调 `start` 方法。

##### 12.4 publishEvent(new ContextRefreshedEvent(this))

很明显它发布了 `ContextRefreshedEvent` 事件，代表IOC容器已经刷新完成。有关事件与监听器的部分，我们在13篇中已经解释过了，不再赘述。

#### 13. resetCommonCaches：清除缓存

```java
protected void resetCommonCaches() {
    ReflectionUtils.clearCache();
    AnnotationUtils.clearCache();
    ResolvableType.clearCache();
    CachedIntrospectionResults.clearClassLoader(getClassLoader());
}
```

清除缓存也是够简单了，不再深追。

以上就是全部 `AbstractApplicationContext` 的 **refresh** 方法了。之前留了一个章节，说 `SpringBoot` 对 `onRefresh` 方法有一个扩展，下面咱来看看都扩展了个什么东西：

#### 9. ServletWebServerApplicationContext.onRefresh

在第13篇中，我们说在 `AbstractApplicationContext` 中没有真正实现这个方法，而是留给了子类。SpringBoot 扩展的IOC容器中对这个方法进行了真正地实现：

```java
protected void onRefresh() {
    super.onRefresh();
    try {
        createWebServer();
    }
    catch (Throwable ex) {
        throw new ApplicationContextException("Unable to start web server", ex);
    }
}
```

它要创建一个WebServer：

```java
private void createWebServer() {
    WebServer webServer = this.webServer;
    ServletContext servletContext = getServletContext();
    if (webServer == null && servletContext == null) {
        // 9.1 这一步创建了嵌入式Servlet容器的工厂
        ServletWebServerFactory factory = getWebServerFactory();
        // 9.2 创建嵌入式Servlet容器
        this.webServer = factory.getWebServer(getSelfInitializer());
    }
    else if (servletContext != null) {
        try {
            getSelfInitializer().onStartup(servletContext);
        }
        catch (ServletException ex) {
            throw new ApplicationContextException("Cannot initialize servlet context", ex);
        }
    }
    initPropertySources();
}
```

##### 9.1 getWebServerFactory：获取嵌入式Servlet容器工厂Bean

```java
protected ServletWebServerFactory getWebServerFactory() {
    // Use bean names so that we don't consider the hierarchy
    //获取IOC容器中类型为ServletWebServerFactory的Bean
    String[] beanNames = getBeanFactory().getBeanNamesForType(ServletWebServerFactory.class);
    if (beanNames.length == 0) {
        throw new ApplicationContextException("Unable to start ServletWebServerApplicationContext due to missing "
                + "ServletWebServerFactory bean.");
    }
    if (beanNames.length > 1) {
        throw new ApplicationContextException("Unable to start ServletWebServerApplicationContext due to multiple "
                + "ServletWebServerFactory beans : " + StringUtils.arrayToCommaDelimitedString(beanNames));
    }
    return getBeanFactory().getBean(beanNames[0], ServletWebServerFactory.class);
}
```

因为一次创建只能运行在一个 Servlet容器中，说明一次只能取出一个Bean来。

默认的 `Tomcat` 创建工厂应该从这里取出：`TomcatServletWebServerFactory`，他实现了 `ServletWebServerFactory` 接口。

这个 `TomcatServletWebServerFactory`，应该是在自动配置时注册好的。

###### 9.1.1 自动配置下的 TomcatServletWebServerFactory 注册时机

```java
@Configuration
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE)
@ConditionalOnClass(ServletRequest.class)
@ConditionalOnWebApplication(type = Type.SERVLET)
@EnableConfigurationProperties(ServerProperties.class)
@Import({ ServletWebServerFactoryAutoConfiguration.BeanPostProcessorsRegistrar.class,
        ServletWebServerFactoryConfiguration.EmbeddedTomcat.class,
        ServletWebServerFactoryConfiguration.EmbeddedJetty.class,
        ServletWebServerFactoryConfiguration.EmbeddedUndertow.class })
public class ServletWebServerFactoryAutoConfiguration
```

这个类我们之前看过，它使用 `@Import` 导入了 `ServletWebServerFactoryConfiguration` 以及三个内部类：

```java
@Configuration
class ServletWebServerFactoryConfiguration {

@Configuration
    // 如果classpath下有Servlet的类，有Tomcat的类，有UpgradeProtocol的类，这个配置就生效
    @ConditionalOnClass({ Servlet.class, Tomcat.class, UpgradeProtocol.class })
    @ConditionalOnMissingBean(value = ServletWebServerFactory.class, search = SearchStrategy.CURRENT)
    public static class EmbeddedTomcat {
        @Bean
        public TomcatServletWebServerFactory tomcatServletWebServerFactory() {
            return new TomcatServletWebServerFactory();
        }
    }

@Configuration
    @ConditionalOnClass({ Servlet.class, Server.class, Loader.class, WebAppContext.class })
    @ConditionalOnMissingBean(value = ServletWebServerFactory.class, search = SearchStrategy.CURRENT)
    public static class EmbeddedJetty {
        @Bean
        public JettyServletWebServerFactory JettyServletWebServerFactory() {
            return new JettyServletWebServerFactory();
        }
    }

    @Configuration
    @ConditionalOnClass({ Servlet.class, Undertow.class, SslClientAuthMode.class })
    @ConditionalOnMissingBean(value = ServletWebServerFactory.class, search = SearchStrategy.CURRENT)
    public static class EmbeddedUndertow {
        @Bean
        public UndertowServletWebServerFactory undertowServletWebServerFactory() {
            return new UndertowServletWebServerFactory();
        }
    }
}
```

不难发现，`TomcatServletWebServerFactory` 在这里被创建。

##### 9.2 getWebServer：创建嵌入式Servlet容器

```java
// TomcatServletWebServerFactory
public WebServer getWebServer(ServletContextInitializer... initializers) {
    Tomcat tomcat = new Tomcat();
    File baseDir = (this.baseDirectory != null) ? this.baseDirectory : createTempDir("tomcat");
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
    return getTomcatWebServer(tomcat);
}
```

方法体中第一行：

`Tomcat tomcat = new Tomcat();`

发现 Tomcat 在此被创建了。

#### 12. ServletWebServerApplicationContext.finishRefresh

`ServletWebServerApplicationContext` 还重写了 `finishRefresh` 方法：

```java
protected void finishRefresh() {
    super.finishRefresh();
    WebServer webServer = startWebServer();
    if (webServer != null) {
        publishEvent(new ServletWebServerInitializedEvent(webServer, this));
    }
}
```

可以发现在此处启动嵌入式Web容器。

```java
private WebServer startWebServer() {
    WebServer webServer = this.webServer;
    if (webServer != null) {
        webServer.start();
    }
    return webServer;
}
```

这里调用了 `WebServer` 的start方法真正启动嵌入式Web容器。

嵌入式Tomcat容器的更多原理解读和源码分析，在后面会有专门的篇章来读，此处不作过多解释，只希望小伙伴们知道在这个时机创建的嵌入式Tomcat即可。

#### 回到原来SpringApplication.run的标号

```java
    // 4.11 刷新后的处理
    afterRefresh(context, applicationArguments);
    stopWatch.stop();
    if (this.logStartupInfo) {
        new StartupInfoLogger(this.mainApplicationClass).logStarted(getApplicationLog(), stopWatch);
    }
    // 4.12 发布started事件
    listeners.started(context);
    // 4.13 运行器回调
    callRunners(context, applicationArguments);
```

##### 4.11 afterRefresh：刷新后的处理

```java
protected void afterRefresh(ConfigurableApplicationContext context, ApplicationArguments args) {
}
```

空方法，且借助IDEA发现没有子类再实现，故不再深究。

##### 4.12 listeners.started：发布started事件

```java
public void started(ConfigurableApplicationContext context) {
    for (SpringApplicationRunListener listener : this.listeners) {
        listener.started(context);
    }
}
```

源码很简单，根据前面的部分可得知直接来到 `EventPublishingRunListener` ：

```java
public void started(ConfigurableApplicationContext context) {
    context.publishEvent(new ApplicationStartedEvent(this.application, this.args, context));
}
```

这部分会回到 `AbstractApplicationContext` 中：

```java
public void publishEvent(ApplicationEvent event) {
    publishEvent(event, null);
}
```

之后继续往下调：

```java
protected void publishEvent(Object event, @Nullable ResolvableType eventType) {
    // ......
    if (this.earlyApplicationEvents != null) {
        this.earlyApplicationEvents.add(applicationEvent);
    }
    else {
        getApplicationEventMulticaster().multicastEvent(applicationEvent, eventType);
    }

    // Publish event via parent context as well...
    if (this.parent != null) {
        if (this.parent instanceof AbstractApplicationContext) {
            ((AbstractApplicationContext) this.parent).publishEvent(event, eventType);
        }
        else {
            this.parent.publishEvent(event);
        }
    }
}
```

上面的预处理部分咱们不关心，关键的看这两段if-else：

- 第一段if-else是在当前IOC容器发布 `ApplicationStartedEvent` 事件
- 下面的if结构会向父容器发布 `ApplicationStartedEvent` 事件

由此可见**事件的发布还会影响到父容器**。

##### 4.13 callRunners：运行器回调

```java
//从容器中获取了ApplicationRunner和CommandLineRunner
private void callRunners(ApplicationContext context, ApplicationArguments args) {
    List<Object> runners = new ArrayList<>();
    runners.addAll(context.getBeansOfType(ApplicationRunner.class).values());
    runners.addAll(context.getBeansOfType(CommandLineRunner.class).values());
    AnnotationAwareOrderComparator.sort(runners);
    //ApplicationRunner先回调，CommandLineRunner后回调
    for (Object runner : new LinkedHashSet<>(runners)) {
        if (runner instanceof ApplicationRunner) {
            callRunner((ApplicationRunner) runner, args);
        }
        if (runner instanceof CommandLineRunner) {
            callRunner((CommandLineRunner) runner, args);
        }
    }
}

private void callRunner(ApplicationRunner runner, ApplicationArguments args) {
    try {
        (runner).run(args);
    }
    catch (Exception ex) {
        throw new IllegalStateException("Failed to execute ApplicationRunner", ex);
    }
}

private void callRunner(CommandLineRunner runner, ApplicationArguments args) {
    try {
        (runner).run(args.getSourceArgs());
    }
    catch (Exception ex) {
        throw new IllegalStateException("Failed to execute CommandLineRunner", ex);
    }
}
```

这部分涉及到两个概念： `CommandLineRunner` 和 `ApplicationRunner` 。

###### 4.13.1 CommandLineRunner

文档注释原文翻译：

> Interface used to indicate that a bean should run when it is contained within a SpringApplication. Multiple CommandLineRunner beans can be defined within the same application context and can be ordered using the Ordered interface or @Order annotation. If you need access to ApplicationArguments instead of the raw String array consider using ApplicationRunner.用于指示bean被包含在 SpringApplication 中时应该运行的接口。可以在同一应用程序上下文中定义多个 CommandLineRunner Bean，并且可以使用 Ordered 接口或 @Order 注解对其进行排序。如果需要访问 ApplicationArguments 而不是原始String数组，请考虑使用 ApplicationRunner 。

###### 4.13.2 ApplicationRunner

文档注释原文翻译：

> Interface used to indicate that a bean should run when it is contained within a SpringApplication. Multiple ApplicationRunner beans can be defined within the same application context and can be ordered using the Ordered interface or @Order annotation.用于指示bean被包含在 SpringApplication 中时应该运行的接口。可以在同一应用程序上下文中定义多个 ApplicationRunner Bean，并可以使用 Ordered 接口或 @Order 注解对其进行排序。

文档注释都没有明确的对这两个组件有很好的解释。翻看 `SpringBoot` 的官方文档：

[https://docs.spring.io/spring-boot/docs/2.1.9.RELEASE/reference/htmlsingle/#boot-features-command-line-runner](https://docs.spring.io/spring-boot/docs/2.1.9.RELEASE/reference/htmlsingle/#boot-features-command-line-runner)

官方文档甚至没有说明这两个接口到底能干什么，只告诉我们怎么用。那这两个组件到底是干什么的呢？

###### 4.13.3 【扩展】SpringBoot1.x中对这两个组件的应用

其实这两个接口组件，如果翻看它的文档注释中的since，会发现一个没有标注，一个是 `SpringBoot1.3.0`，说明它们都来自于 `SpringBoot1.x` 。它们本来是用于监听特定的时机来执行一些操作，奈何 `SpringBoot2.x` 后扩展了事件，可以通过监听 `ApplicationStartedEvent` 来实现跟这两个组件一样的效果。换句话说，这两个组件已经被隐式的“淘汰”了，不必过多深究。

至此，SpringBoot应用启动成功。

#### 小结

1. IOC容器初始化完成后会清理缓存。
2. SpringBoot 对IOC容器的扩展是创建嵌入式Web容器。
3. SpringBoot 存在一些版本过时但还没有清理或废弃的组件（如 `CommandLineRunner` 和 `ApplicationRunner`）。

### IOC：小结与收获

小伙伴们，能走到这里，真的要恭喜你们，你们在文档的辅助下已经成功走完一遍 `SpringBoot` 的IOC容器启动原理了。咱暂且先不急继续前行，先回过头来看看咱读完IOC原理后，都有哪些归纳总结的，以及咱能有什么收获吧，毕竟温故而知新。

#### 1. Web应用类型判定

`SpringBoot` 会根据classpath下存在的类，决定当前应用的类型，以此来创建合适的IOC容器。

默认WebMvc环境下，创建的IOC容器是 `AnnotationConfigServletWebServerApplicationContext` 。

#### 2. Spring的SPI技术

`SpringBoot` 使用 `SpringFactoriesLoader.loadFactoryNames` 机制来从 `META-INF/spring.factories` 文件中读取指定 类/注解 映射的组件全限定类名，以此来反射创建组件。Spring设计的SPI比Java原生的SPI要更灵活，因为它的**key可以任意定义类/注解，不再局限于“接口-实现类”的形式**。

#### 3. SpringApplicationRunListener

`SpringApplicationRunListener` 可以监听 `SpringApplication` 的运行方法。通过注册 `SpringApplicationRunListener` ，可以自定义的在 `SpringBoot` 应用**启动过程、运行、销毁**时监听对应的事件，来执行自定义逻辑。

#### 4. Environment

Spring应用的IOC容器需要依赖 `Environment` - 运行环境，它用来表示整个Spring应用运行时的环境，它分为 **profiles** 和 **properties** 两个部分。通过配置不同的 `profile` ，可以支持配置的灵活切换，并且可以同时配置一到多个 `profile` 来共同配置 `Environment` 。

#### 5. 多种后置处理器

IOC容器中出现的后置处理器类型非常多，咱来回顾一下都有哪些：

- BeanPostProcessor：Bean实例化后，初始化的前后触发
- BeanDefinitionRegistryPostProcessor：所有Bean的定义信息即将被加载但未实例化时触发
- BeanFactoryPostProcessor：所有的 `BeanDefinition` 已经被加载，但没有Bean被实例化时触发
- InstantiationAwareBeanPostProcessor：Bean的实例化对象的前后过程、以及实例的属性设置（AOP）
- InitDestroyAnnotationBeanPostProcessor：触发执行Bean中标注 `@PostConstruct` 、`@PreDestroy` 注解的方法
- ConfigurationClassPostProcessor：解析加了 `@Configuration` 的配置类，解析 `@ComponentScan` 注解扫描的包，以及解析 `@Import` 、`@ImportResource` 等注解
- AutowiredAnnotationBeanPostProcessor：负责处理 `@Autowired` 、`@Value` 等注解

#### 6. 监听器与观察者模式

`SpringFramework` 有原生的 `ApplicationListener`，在IOC容器中有对应的监听器注册，与事件广播器。通过注册不同的 `ApplicationListener`，并指定事件类型，注册到IOC容器中，IOC容器会自动将其注册并在事件发布时执行监听方法。

#### 7. 初始化单实例Bean与循环依赖

Bean的初始化经过的步骤非常多，其中也包括AOP的部分。其中IOC容器为了避免出现循环依赖，会在 `BeanFactory` 中设计三级缓存来解决 setter 和 `@Autowired` 的循环依赖。

#### 8. 嵌入式Web容器的创建

`SpringBoot` 扩展的 `ServletWebServerApplicationContext` 会在IOC容器的模板方法 `onRefresh` 方法中创建嵌入式Web容器，这部分涉及到的内容会在后面专门的篇章中解析。

【小伙伴们，IOC的部分到这里就全部完结了。下面咱来一起进入AOP的部分，来探究 `SpringFramework` 是如何实现AOP的吧】

## 版本差异(旧版 → Spring Boot 3.5.x)

| 特性 | 旧版(Spring Framework 5.x) | Spring Framework 6.x |
|------|---------------------------|----------------------|
| IOC 容器刷新 | refresh() 模板方法 | 不变；核心流程稳定 |
| 注解扫描 | @ComponentScan | 不变；支持 AOT 提前处理 |
| 配置类处理 | @Configuration 代理 | 不变；CGLIB 代理默认 |
| 循环依赖 | 默认允许 | Boot 2.6+ 默认禁止 |
| 原生支持 | 无 | Spring 6 支持 GraalVM Native Image（AOT） |
