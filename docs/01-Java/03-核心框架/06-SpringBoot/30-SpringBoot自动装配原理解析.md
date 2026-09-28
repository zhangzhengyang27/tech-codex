---
title: "SpringBoot自动装配原理解析"
description: "解析 @SpringBootApplication → @EnableAutoConfiguration → AutoConfigurationImportSelector 的自动装配全链路：spring.factories 加载、条件注解过滤、执行顺序控制、自定义 Starter 注册与 Spring Boot 3.x 的 AutoConfiguration.imports 变化。"
keywords: [SpringBoot 自动装配, EnableAutoConfiguration, AutoConfigurationImportSelector, 条件注解, AutoConfiguration.imports]
category: "Java"
tags: [Java, SpringBoot]
---


# SpringBoot 自动装配原理解析

> **版本说明**：下文 `AutoConfigurationImportSelector` 等源码基于 Spring Boot 2.x（候选配置类从 `spring.factories` 加载）。Spring Boot 3.x 起自动配置类改从 `META-INF/spring/.../AutoConfiguration.imports` 加载，机制差异见文末「Spring Boot 2.7+ 新特性」「Spring Boot 3.x 变化」两节。

## 核心概念

### 什么是自动装配？

SpringBoot 自动装配（Auto Configuration）是 SpringBoot 的核心特性之一，它能够根据类路径中的依赖、已存在的 Bean 以及配置文件中的属性，自动配置 Spring 应用程序所需的 Bean。

**核心优势：**

- **零配置**：无需手动编写大量 XML 配置
- **约定优于配置**：遵循 SpringBoot 的默认约定即可快速启动项目
- **按需加载**：通过条件注解，只加载需要的配置类

### 自动装配的入口

对于 SpringBoot 工程来说，最明显的标志就是 `@SpringBootApplication` 注解，它标记这是一个 SpringBoot 工程，也是自动装配的入口点。

## 自动装配流程

### 1. @SpringBootApplication 注解分析

在 `@SpringBootApplication` 注解上按下 `Ctrl + 鼠标左键`，进入源码：

```java
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@SpringBootConfiguration
@EnableAutoConfiguration
@ComponentScan(excludeFilters = {
  @Filter(type = FilterType.CUSTOM, classes = TypeExcludeFilter.class),
  @Filter(type = FilterType.CUSTOM, classes = AutoConfigurationExcludeFilter.class) })
public @interface SpringBootApplication {
  // 省略其他属性...
}
```

**注解说明：**

- `@SpringBootConfiguration`：标记这是一个 SpringBoot 配置类
- `@EnableAutoConfiguration`：**核心注解，启用自动装配功能**
- `@ComponentScan`：组件扫描，自动装配与此无关

> **重点**：自动装配的核心是 `@EnableAutoConfiguration` 注解，其他注解主要用于配置和组件扫描。

## 关键组件分析

### 1. @SpringBootConfiguration

```java
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Configuration
public @interface SpringBootConfiguration {
    @AliasFor(annotation = Configuration.class)
    boolean proxyBeanMethods() default true;
}
```

`@SpringBootConfiguration` **是用来标记这是一个 SpringBoot 工程的配置类**，它本质上就是 `@Configuration` 注解的封装。

**作用：**

- 标识这是一个 Spring 配置类
- 允许通过 `proxyBeanMethods()` 控制是否使用代理模式

### 2. @EnableAutoConfiguration

```java
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@Inherited
@AutoConfigurationPackage
@Import({AutoConfigurationImportSelector.class})
public @interface EnableAutoConfiguration {
    String ENABLED_OVERRIDE_PROPERTY = "spring.boot.enableautoconfiguration";

    Class<?>[] exclude() default {};

    String[] excludeName() default {};
}
```

**关键点：**

- `@AutoConfigurationPackage`：自动配置包扫描，将主类所在包及其子包纳入扫描范围
- `@Import({AutoConfigurationImportSelector.class})`：**核心导入选择器，负责加载自动配置类**

### 3. AutoConfigurationImportSelector 核心类

`AutoConfigurationImportSelector` 是实现自动装配的核心类，它实现了 `DeferredImportSelector` 接口，在 Spring 容器启动的后期阶段执行。

```java
public class AutoConfigurationImportSelector
  implements DeferredImportSelector, BeanClassLoaderAware, ResourceLoaderAware,
  BeanFactoryAware, EnvironmentAware, Ordered {

  @Override
  public String[] selectImports(AnnotationMetadata annotationMetadata) {
    if (!isEnabled(annotationMetadata)) {
      return NO_IMPORTS;
    }

    // 加载自动配置元数据（用于条件过滤优化）
    AutoConfigurationMetadata autoConfigurationMetadata = AutoConfigurationMetadataLoader
      .loadMetadata(this.beanClassLoader);

    // 获取自动配置的实体
    AutoConfigurationEntry autoConfigurationEntry = getAutoConfigurationEntry(
      autoConfigurationMetadata, annotationMetadata);

    return StringUtils.toStringArray(autoConfigurationEntry.getConfigurations());
  }

  // 具体用来加载自动配置类的方法
  protected AutoConfigurationEntry getAutoConfigurationEntry(
    AutoConfigurationMetadata autoConfigurationMetadata,
    AnnotationMetadata annotationMetadata) {
    if (!isEnabled(annotationMetadata)) {
      return EMPTY_ENTRY;
    }

    AnnotationAttributes attributes = getAttributes(annotationMetadata);
    // 步骤1：获取候选的配置类（从 spring.factories 加载）
    List<String> configurations = getCandidateConfigurations(annotationMetadata, attributes);

    // 步骤2：去重
    configurations = removeDuplicates(configurations);

    // 步骤3：获取排除的配置类
    Set<String> exclusions = getExclusions(annotationMetadata, attributes);
    checkExcludedClasses(configurations, exclusions);

    // 步骤4：移除排除的配置类
    configurations.removeAll(exclusions);

    // 步骤5：条件过滤（根据条件注解决定是否加载）
    configurations = filter(configurations, autoConfigurationMetadata);

    // 步骤6：触发自动配置导入事件
    fireAutoConfigurationImportEvents(configurations, exclusions);

    // 返回最终需要的配置
    return new AutoConfigurationEntry(configurations, exclusions);
  }
}
```

**执行流程说明：**

1. **获取候选配置类**：从 `META-INF/spring.factories` 文件中加载所有自动配置类
2. **去重处理**：移除重复的配置类
3. **排除处理**：根据 `exclude` 和 `excludeName` 排除指定的配置类
4. **条件过滤**：根据条件注解（如 `@ConditionalOnClass`）决定是否加载
5. **返回结果**：返回最终需要加载的配置类列表

### 4. AutoConfigurationEntry 内部类

这个自动配置的实体 `AutoConfigurationEntry` 里面有两个属性 `configurations` 和 `exclusions`：

```java
protected static class AutoConfigurationEntry {

  // 用来存储需要的配置项
  private final List<String> configurations;

  // 用来存储排除的配置项
  private final Set<String> exclusions;

  private AutoConfigurationEntry() {
    this.configurations = Collections.emptyList();
    this.exclusions = Collections.emptySet();
  }
}
```

在后面可以看到 `getAutoConfigurationEntry()` 方法返回了一个对象 `return new AutoConfigurationEntry(configurations, exclusions)`，这里也就是把需要的配置都拿到了。

**AutoConfigurationEntry 的作用：**

- `configurations`：存储最终需要加载的自动配置类全限定名列表
- `exclusions`：存储被排除的配置类集合

## 自动配置加载机制

### 步骤 1：获取候选配置类

接着看这个获取候选配置类的方法 `getCandidateConfigurations()`：

```java
protected List<String> getCandidateConfigurations(AnnotationMetadata metadata, AnnotationAttributes attributes) {
  List<String> configurations = SpringFactoriesLoader.loadFactoryNames(
    getSpringFactoriesLoaderFactoryClass(),
    getBeanClassLoader()
  );

  Assert.notEmpty(configurations,
    "No auto configuration classes found in META-INF/spring.factories. " +
    "If you are using a custom packaging, make sure that file is correct.");
  return configurations;
}
```

**方法说明：**

- `getSpringFactoriesLoaderFactoryClass()`：返回 `EnableAutoConfiguration.class`，用于从 `spring.factories` 文件中查找对应的配置类
- `getBeanClassLoader()`：获取类加载器，用于加载资源文件

### 步骤 2：获取工厂类类型

跟着断点去走，首先进入 `getSpringFactoriesLoaderFactoryClass()` 方法：

```java
protected Class<?> getSpringFactoriesLoaderFactoryClass() {
  // 返回的是 EnableAutoConfiguration 字节码对象
  return EnableAutoConfiguration.class;
}
```

**说明：** 返回 `EnableAutoConfiguration.class`，用于在 `spring.factories` 文件中查找 key 为 `org.springframework.boot.autoconfigure.EnableAutoConfiguration` 的配置类列表。

### 步骤 3：获取类加载器

接着进入 `getBeanClassLoader()` 方法，这里就是一个类加载器：

```java
protected ClassLoader getBeanClassLoader() {
  return this.beanClassLoader;
}
```

**说明：** 返回当前应用的类加载器，用于加载 `META-INF/spring.factories` 资源文件。

### 步骤 4：加载工厂名称

最后再进入 `loadFactoryNames()` 方法，这个方法就是根据刚才的字节码文件和类加载器来找到候选的配置类：

```java
public static List<String> loadFactoryNames(Class<?> factoryClass, @Nullable ClassLoader classLoader) {
  // 获取 EnableAutoConfiguration.class 的全限定名
  // org.springframework.boot.autoconfigure.EnableAutoConfiguration
  String factoryClassName = factoryClass.getName();
  return loadSpringFactories(classLoader).getOrDefault(factoryClassName, Collections.emptyList());
}
```

**说明：**

- 将 `EnableAutoConfiguration.class` 转换为全限定名：`org.springframework.boot.autoconfigure.EnableAutoConfiguration`
- 调用 `loadSpringFactories()` 加载所有 `spring.factories` 文件，并获取 key 为上述全限定名的配置类列表

### 步骤 5：加载 spring.factories 文件

最后通过 `loadSpringFactories()` 来获取到所有的配置类：

```java
private static Map<String, List<String>> loadSpringFactories(@Nullable ClassLoader classLoader) {
  // 缓存加载的配置类，避免重复加载
  MultiValueMap<String, String> result = cache.get(classLoader);
  if (result != null) {
    return result;
  }
  try {
    // 去资源目录下找或者去系统资源目录下找
    Enumeration<URL> urls = (classLoader != null
      ? classLoader.getResources(FACTORIES_RESOURCE_LOCATION)
      : ClassLoader.getSystemResources(FACTORIES_RESOURCE_LOCATION));

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
    // 加载完成放到缓存中
    cache.put(classLoader, result);
    // 返回加载到的配置类
    return result;
  }
  catch (IOException ex) {
    throw new IllegalArgumentException(
      "Unable to load factories from location [" + FACTORIES_RESOURCE_LOCATION + "]", ex);
  }
}
```

**执行流程：**

1. **检查缓存**：如果已经加载过，直接返回缓存结果
2. **查找资源文件**：从类路径中查找所有 `META-INF/spring.factories` 文件
3. **解析 Properties**：将文件内容解析为 Properties 对象
4. **构建映射关系**：将 key-value 对存储到 `MultiValueMap` 中
5. **缓存结果**：将加载结果放入缓存，避免重复加载

### 步骤 6：spring.factories 文件位置

这里要看下怎么从资源目录下 `FACTORIES_RESOURCE_LOCATION` 加载的，下面是加载配置文件的路径：

```java
public final class SpringFactoriesLoader {
  public static final String FACTORIES_RESOURCE_LOCATION = "META-INF/spring.factories";
}
```

**说明：** SpringBoot 会在项目启动时扫描所有 jar 包中 `META-INF/spring.factories` 文件。

### spring.factories 文件格式

`spring.factories` 文件采用 Properties 格式，key 为接口或注解的全限定名，value 为实现类的全限定名列表（多个用逗号分隔）。

**示例：**

```properties
# Auto Configure
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
org.springframework.boot.autoconfigure.admin.SpringApplicationAdminJmxAutoConfiguration,\
org.springframework.boot.autoconfigure.aop.AopAutoConfiguration,\
org.springframework.boot.autoconfigure.amqp.RabbitAutoConfiguration,\
org.springframework.boot.autoconfigure.batch.BatchAutoConfiguration,\
org.springframework.boot.autoconfigure.cache.CacheAutoConfiguration,\
...
```

**关键点：**

- 项目启动时会扫描所有 jar 包中的 `META-INF/spring.factories` 文件
- 主要配置类位于 `spring-boot-autoconfigure-xxx.jar` 中
- 根据 `EnableAutoConfiguration.class` 的全限定名查找对应的配置类列表（通常有 100+ 个自动配置类）

### 自动装配流程图

```text
启动应用
    ↓
@SpringBootApplication
    ↓
@EnableAutoConfiguration
    ↓
AutoConfigurationImportSelector.selectImports()
    ↓
getAutoConfigurationEntry()
    ↓
┌─────────────────────────────────────┐
│ 1. 从 spring.factories 加载候选配置类 │
│ 2. 去重处理                          │
│ 3. 排除处理（exclude/excludeName）   │
│ 4. 条件过滤（条件注解）              │
│ 5. 触发导入事件                      │
└─────────────────────────────────────┘
    ↓
返回最终配置类列表
    ↓
Spring 容器加载配置类
    ↓
创建 Bean 实例
```

## 条件装配机制

SpringBoot 的自动装配并不是简单地加载所有配置类，而是通过**条件注解**来决定是否加载某个配置类。这是自动装配的核心机制。

### 常用条件注解

| 注解                              | 说明                                     | 使用场景示例                 |
| --------------------------------- | ---------------------------------------- | ---------------------------- |
| `@ConditionalOnClass`             | 当类路径中存在指定的类时，才加载配置     | 检测第三方库是否引入         |
| `@ConditionalOnMissingClass`      | 当类路径中不存在指定的类时，才加载配置   | 排除某些库的自动配置         |
| `@ConditionalOnBean`              | 当容器中存在指定的 Bean 时，才加载配置   | 依赖其他 Bean 的配置         |
| `@ConditionalOnMissingBean`       | 当容器中不存在指定的 Bean 时，才加载配置 | 避免重复配置，允许用户自定义 |
| `@ConditionalOnProperty`          | 当配置文件中存在指定的属性时，才加载配置 | 根据配置属性启用/禁用功能    |
| `@ConditionalOnWebApplication`    | 当应用是 Web 应用时，才加载配置          | Web 相关的自动配置           |
| `@ConditionalOnNotWebApplication` | 当应用不是 Web 应用时，才加载配置        | 非 Web 应用的配置            |
| `@ConditionalOnResource`          | 当指定的资源文件存在时，才加载配置       | 根据资源文件是否存在决定配置 |
| `@ConditionalOnExpression`        | 当 SpEL 表达式为 true 时，才加载配置     | 复杂的条件判断               |
| `@ConditionalOnJava`              | 当 Java 版本满足条件时，才加载配置       | 根据 Java 版本启用不同配置   |

### 条件注解使用示例

**@ConditionalOnProperty 示例：**

```java
@Configuration
@ConditionalOnProperty(
    prefix = "spring.datasource",
    name = "type",
    havingValue = "com.zaxxer.hikari.HikariDataSource",
    matchIfMissing = true  // 如果属性不存在，默认匹配
)
public class HikariDataSourceAutoConfiguration {
    // ...
}
```

**@ConditionalOnExpression 示例：**

```java
@Configuration
@ConditionalOnExpression("${app.feature.enabled:false} && ${app.feature.mode} == 'auto'")
public class FeatureAutoConfiguration {
    // ...
}
```

### 条件过滤流程

在 `getAutoConfigurationEntry()` 方法中，`filter()` 方法会根据条件注解进行过滤：

```java
configurations = filter(configurations, autoConfigurationMetadata);
```

**过滤过程：**

1. 遍历所有候选配置类
2. 检查每个配置类上的条件注解
3. 根据条件判断是否满足加载要求
4. 只保留满足条件的配置类

### 实际案例：DataSourceAutoConfiguration

以 `DataSourceAutoConfiguration` 为例，看看条件注解的使用：

```java
@Configuration(proxyBeanMethods = false)
@ConditionalOnClass({ DataSource.class, EmbeddedDatabaseType.class })
@EnableConfigurationProperties(DataSourceProperties.class)
@Import({ DataSourcePoolMetadataProvidersConfiguration.class,
    DataSourceInitializationConfiguration.class })
public class DataSourceAutoConfiguration {
  // ...
}
```

**条件说明：**

- `@ConditionalOnClass({ DataSource.class, EmbeddedDatabaseType.class })`：只有当类路径中存在 `DataSource` 和 `EmbeddedDatabaseType` 时，才会加载此配置
- 类内部定义数据源 `@Bean` 的方法上标注了 `@ConditionalOnMissingBean(DataSource.class)`：只有当容器中不存在 `DataSource` 类型的 Bean 时，才会创建默认数据源，允许用户自定义覆盖

## 自动配置执行顺序

SpringBoot 的自动配置类之间可能存在依赖关系，需要控制执行顺序。SpringBoot 提供了以下注解来控制自动配置的执行顺序：

### 执行顺序注解

| 注解                   | 说明                             | 使用场景                         |
| ---------------------- | -------------------------------- | -------------------------------- |
| `@AutoConfigureBefore` | 在指定的自动配置类之前执行       | 当前配置需要在其他配置之前加载   |
| `@AutoConfigureAfter`  | 在指定的自动配置类之后执行       | 当前配置依赖其他配置，需要后加载 |
| `@AutoConfigureOrder`  | 指定执行顺序（数字越小越先执行） | 精确控制多个配置类的执行顺序     |

### 执行顺序示例

#### 示例 1：@AutoConfigureAfter

```java
@Configuration(proxyBeanMethods = false)
@ConditionalOnClass(PlatformTransactionManager.class)
@AutoConfigureAfter({
    JtaAutoConfiguration.class,
    HibernateJpaAutoConfiguration.class,
    DataSourceTransactionManagerAutoConfiguration.class
})
public class TransactionAutoConfiguration {
    // 事务配置需要在数据源配置之后加载
}
```

#### 示例 2：@AutoConfigureBefore

```java
// 自定义自动配置：需要在 DataSourceAutoConfiguration 之前执行
@Configuration(proxyBeanMethods = false)
@AutoConfigureBefore(DataSourceAutoConfiguration.class)
public class MyEarlyConfiguration {
    // 需要先于数据源自动配置加载的逻辑
}
```

#### 示例 3：@AutoConfigureOrder

```java
@Configuration(proxyBeanMethods = false)
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE)
public class PriorityConfiguration {
    // 最高优先级，最先执行
}
```

### 执行顺序规则

1. **默认顺序**：如果没有指定顺序注解，按照类名的字母顺序执行
2. **@AutoConfigureAfter/@AutoConfigureBefore**：显式指定依赖关系
3. **@AutoConfigureOrder**：通过数字大小控制顺序（数字越小优先级越高）
4. **组合使用**：可以同时使用多个注解来精确控制顺序

## 实际应用示例

### 示例 1：为什么 SpringBoot 不需要 @EnableTransactionManagement 就能使用事务？

SpringBoot 通过自动装配机制，在 `spring-boot-autoconfigure` 包中已经自动配置了事务管理器。

**自动配置类：** `TransactionAutoConfiguration`

```java
@Configuration(proxyBeanMethods = false)
@ConditionalOnClass(PlatformTransactionManager.class)
@AutoConfigureAfter({ JtaAutoConfiguration.class, HibernateJpaAutoConfiguration.class,
    DataSourceTransactionManagerAutoConfiguration.class })
@EnableConfigurationProperties(TransactionProperties.class)
public class TransactionAutoConfiguration {
  // ...
}
```

**关键点：**

- 当类路径中存在 `PlatformTransactionManager` 时，自动配置事务管理器
- 如果使用 JDBC，会自动配置 `DataSourceTransactionManager`
- 如果使用 JPA，会自动配置 `JpaTransactionManager`
- 因此无需手动添加 `@EnableTransactionManagement`（虽然添加也不会有问题）

### 示例 2：WebMvcAutoConfiguration 自动配置

SpringBoot 自动配置了 Spring MVC，无需手动配置 `@EnableWebMvc`：

```java
@Configuration(proxyBeanMethods = false)
@ConditionalOnWebApplication(type = Type.SERVLET)
@ConditionalOnClass({ Servlet.class, DispatcherServlet.class, WebMvcConfigurer.class })
@ConditionalOnMissingBean(WebMvcConfigurationSupport.class)
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE + 10)
@AutoConfigureAfter({ DispatcherServletAutoConfiguration.class,
    TaskExecutionAutoConfiguration.class, ValidationAutoConfiguration.class })
public class WebMvcAutoConfiguration {
    // 自动配置 DispatcherServlet、ViewResolver 等
}
```

**关键点：**

- 只有在 Web 应用（SERVLET 类型）中才会加载
- 如果用户自定义了 `WebMvcConfigurationSupport`，则不会自动配置
- 自动配置了默认的视图解析器、静态资源处理等

### 示例 3：RedisAutoConfiguration 自动配置

当引入 `spring-boot-starter-data-redis` 依赖时，自动配置 Redis：

```java
@Configuration(proxyBeanMethods = false)
@ConditionalOnClass(RedisOperations.class)
@EnableConfigurationProperties(RedisProperties.class)
@Import({ LettuceConnectionConfiguration.class, JedisConnectionConfiguration.class })
public class RedisAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean(name = "redisTemplate")
    public RedisTemplate<Object, Object> redisTemplate(
            RedisConnectionFactory redisConnectionFactory) {
        // 自动创建 RedisTemplate
    }
}
```

**关键点：**

- 检测到 `RedisOperations` 类存在时自动配置
- 如果用户已经定义了 `redisTemplate` Bean，则不会重复创建
- 支持 Lettuce 和 Jedis 两种连接方式

## 自定义自动配置

Spring Boot 自动装配的目标是根据类路径中的依赖项和环境中的配置，自动配置 Spring 应用程序。它通过一系列的自动配置类来实现，根据应用程序的上下文条件，启用或禁用相应的配置。

- `@SpringBootApplication` 是一个组合注解，集成了 `@Configuration`、`@EnableAutoConfiguration` 和 `@ComponentScan`
- `@EnableAutoConfiguration` 注解启用 Spring Boot 的自动配置功能，会触发 Spring Boot 的自动配置机制。Spring Boot 会扫描 `META-INF/spring.factories` 文件中列出的配置类，并根据条件加载这些类

### 自动配置的工作原理

1. **条件注解**：

   - 自动配置类通常使用条件注解（如 `@ConditionalOnClass`、`@ConditionalOnMissingBean` 等）来决定是否应用特定的配置。
   - 例如 `@ConditionalOnClass` 表示只有在类路径中存在指定的类时，才会应用相应的配置

2. **配置类**：

   - 自动配置类使用 `@Configuration` 注解，定义 Bean 的创建逻辑
   - 这些类位于 Spring Boot 的 `org.springframework.boot.autoconfigure` 包中

3. **`spring.factories` 文件**：
   - 在每个自动配置模块的 `META-INF` 目录下，有一个 `spring.factories` 文件，列出了所有自动配置类
   - Spring Boot 在启动时会读取这些文件，并加载列出的自动配置类

### 自定义配置方式

如果默认的自动配置不能满足需求，可以通过以下方式自定义配置：

1. **属性配置**：

   在 `application.properties` 或 `application.yml` 文件中配置属性，以覆盖默认值。例如，配置服务器端口：

   ```properties
   server.port=8081
   ```

2. **自定义配置类**：

   创建自定义配置类，并使用 `@Configuration` 和其他条件注解。例如：

   ```java
   @Configuration
   @ConditionalOnClass(DataSource.class)
   public class CustomDataSourceConfig {
       @Bean
       public DataSource dataSource() {
           // 自定义 DataSource 配置逻辑
       }
   }
   ```

### 禁用自动配置

如果某些自动配置不需要，可以通过以下方式禁用：

1. **注解排除**：

   ```java
   @SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})
   public class Application {
       public static void main(String[] args) {
           SpringApplication.run(Application.class, args);
       }
   }
   ```

2. **属性排除**：

   ```properties
   spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
   ```

3. **YAML 配置排除**：

   ```yaml
   spring:
     autoconfigure:
       exclude:
         - org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
         - org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration
   ```

### 创建自定义自动配置类

#### 步骤 1：创建配置类

```java
@Configuration
@ConditionalOnClass(MyService.class)
@ConditionalOnMissingBean(MyService.class)
@EnableConfigurationProperties(MyServiceProperties.class)
public class MyServiceAutoConfiguration {

    @Bean
    @ConditionalOnProperty(prefix = "my.service", name = "enabled", havingValue = "true", matchIfMissing = true)
    public MyService myService(MyServiceProperties properties) {
        return new MyService(properties);
    }
}
```

#### 步骤 2：创建配置属性类

```java
@ConfigurationProperties(prefix = "my.service")
public class MyServiceProperties {
    private String name = "default";
    private int timeout = 1000;

    // getter/setter
}
```

#### 步骤 3：注册到 spring.factories

在 `src/main/resources/META-INF/spring.factories` 文件中添加：

```properties
org.springframework.boot.autoconfigure.EnableAutoConfiguration=\
com.example.autoconfigure.MyServiceAutoConfiguration
```

#### 步骤 4：使用配置属性

在 `application.properties` 中配置：

```properties
my.service.enabled=true
my.service.name=MyCustomService
my.service.timeout=2000
```

## Spring Boot 2.7+ 新特性

### 新的自动配置注册方式

从 Spring Boot 2.7 开始，除了传统的 `spring.factories` 方式，还支持新的自动配置注册方式：

#### 新方式：META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports

在 `src/main/resources/META-INF/spring/` 目录下创建 `org.springframework.boot.autoconfigure.AutoConfiguration.imports` 文件：

```text
com.example.autoconfigure.MyServiceAutoConfiguration
com.example.autoconfigure.AnotherAutoConfiguration
```

#### 优势

- 更简洁：每行一个配置类，无需 Properties 格式
- 更易读：不需要转义和反斜杠
- 支持注释：使用 `#` 开头表示注释

#### 兼容性

- Spring Boot 2.7+ 同时支持两种方式
- 如果两种方式都存在，会合并加载
- 建议新项目使用新方式，老项目可以逐步迁移

### 自动配置元数据

Spring Boot 提供了自动配置元数据（Auto-configuration Metadata），用于 IDE 提示和配置验证。

**位置：** `META-INF/spring-configuration-metadata.json`

**示例：**

```json
{
  "groups": [
    {
      "name": "my.service",
      "type": "com.example.MyServiceProperties",
      "sourceType": "com.example.MyServiceProperties"
    }
  ],
  "properties": [
    {
      "name": "my.service.enabled",
      "type": "java.lang.Boolean",
      "defaultValue": true,
      "description": "Enable my service auto-configuration."
    },
    {
      "name": "my.service.timeout",
      "type": "java.lang.Integer",
      "defaultValue": 1000,
      "description": "Service timeout in milliseconds."
    }
  ]
}
```

## 常见问题与调试

### 问题 1：自动配置类没有生效

**可能原因：**

1. 条件注解不满足
2. 配置类被排除
3. `spring.factories` 文件路径错误

**调试方法：**

1. **启用调试日志**：

   ```properties
   # application.properties
   debug=true
   ```

   或者：

   ```properties
   logging.level.org.springframework.boot.autoconfigure=DEBUG
   ```

2. **查看自动配置报告**：

   启动应用后，控制台会输出自动配置报告，显示：

   - 哪些配置类被加载（Positive matches）
   - 哪些配置类被排除（Negative matches）
   - 排除的原因（Exclusions）

3. **使用 Actuator 端点**（需要引入 `spring-boot-starter-actuator`）：

   ```properties
   management.endpoints.web.exposure.include=conditions
   ```

   访问：`http://localhost:8080/actuator/conditions` 查看条件评估报告

### 问题 2：Bean 冲突

**场景：** 自动配置创建了 Bean，但用户也想自定义同名 Bean

**解决方案：**

1. **使用 @ConditionalOnMissingBean**：自动配置类应该使用此注解，允许用户覆盖
2. **排除自动配置**：使用 `@SpringBootApplication(exclude = {...})` 排除
3. **使用 @Primary**：标记用户自定义的 Bean 为主 Bean

### 问题 3：配置类执行顺序问题

**场景：** 配置类 A 依赖配置类 B，但 B 在 A 之后执行

**解决方案：**

使用 `@AutoConfigureAfter` 或 `@AutoConfigureBefore` 注解：

```java
@Configuration
@AutoConfigureAfter(DataSourceAutoConfiguration.class)
public class MyConfiguration {
    // 确保在 DataSourceAutoConfiguration 之后执行
}
```

### 调试技巧

1. **断点调试**：

   - 在 `AutoConfigurationImportSelector.selectImports()` 方法打断点
   - 在 `getAutoConfigurationEntry()` 方法打断点
   - 查看 `configurations` 列表，确认哪些配置类被加载

2. **查看加载的配置类**：

   ```java
   @Component
   public class AutoConfigurationReporter implements ApplicationListener<ApplicationReadyEvent> {
       @Autowired
       private ApplicationContext applicationContext;

       @Override
       public void onApplicationEvent(ApplicationReadyEvent event) {
           // 适用于 2.7+/3.x：自动配置类标注了 @AutoConfiguration 时才能按该注解匹配
           String[] autoConfigBeans = applicationContext.getBeanNamesForAnnotation(
               org.springframework.boot.autoconfigure.AutoConfiguration.class);
           System.out.println("Auto-configuration beans: " + Arrays.toString(autoConfigBeans));
       }
   }
   ```

3. **使用 Spring Boot DevTools**：

   引入 `spring-boot-devtools` 依赖，可以快速重启应用，方便调试

## 最佳实践

### 1. 条件注解的使用

- **优先使用 `@ConditionalOnMissingBean`**：允许用户自定义 Bean 覆盖自动配置
- **合理使用 `@ConditionalOnClass`**：确保依赖的类存在
- **避免过度条件判断**：条件注解过多会影响启动性能

### 2. 配置属性的设计

- **使用 `@ConfigurationProperties`**：统一管理配置属性
- **提供合理的默认值**：减少用户配置成本
- **添加配置元数据**：提供 IDE 提示和文档

### 3. 自动配置类的设计

- **单一职责**：每个自动配置类只负责一个功能模块
- **可扩展性**：提供扩展点，允许用户自定义
- **向后兼容**：版本升级时保持配置兼容

### 4. 性能优化

- **延迟初始化**：使用 `@Lazy` 注解延迟 Bean 初始化
- **条件过滤优化**：使用 `AutoConfigurationMetadata` 提前过滤
- **避免不必要的扫描**：合理使用 `@ConditionalOnClass` 减少类加载

### 5. 测试

- **编写自动配置测试**：使用 `@SpringBootTest` 测试自动配置
- **测试条件注解**：验证各种条件下的行为
- **集成测试**：确保自动配置在实际项目中正常工作

## Spring Boot 3.x 变化

- **AutoConfiguration.imports 成为唯一方式**：Spring Boot 3.x 已移除对 `spring.factories` 中 `EnableAutoConfiguration` 键的读取，自动配置类只能通过 `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` 注册（2.7 兼容期已结束）
- **@AutoConfiguration 注解**：3.0 起自动配置类推荐使用 `@AutoConfiguration` 替代 `@Configuration`，且可通过 `before`/`after` 属性直接声明顺序，替代 `@AutoConfigureBefore/After`；`@SpringBootApplication` 的组件扫描会通过 `AutoConfigurationExcludeFilter` 排除已注册的自动配置类，避免被组件扫描误拾取
- **条件过滤机制保留**：3.x 中条件过滤仍基于 `@Conditional` 系列注解与 `spring-autoconfigure-metadata.properties` 元数据提前进行
- **JDK 17 基线**：自动配置类必须使用 jakarta 命名空间，且编译目标为 JDK 17+（3.5.x 最高可运行在 JDK 24 上）
- **AOT 处理**：Spring Boot 3.x 支持 GraalVM 原生镜像（AOT），自动配置可通过 `AutoConfiguration.imports` 在构建期被静态分析，原生编译时自动装配依然生效

## 版本差异(Spring Boot 2.x → 3.5.x)

| 特性 | 旧版（2.x） | 当前（3.5.x） |
|------|-------------|---------------|
| 注册文件 | spring.factories（主） | AutoConfiguration.imports（唯一） |
| 注解 | @Configuration | @AutoConfiguration（推荐） |
| 命名空间 | javax | jakarta |
| JDK | 8/11 | 17-24 |
| 原生镜像 | 不支持 | AOT + GraalVM 原生镜像 |
| 顺序声明 | @AutoConfigureBefore/After 单独注解 | @AutoConfiguration(before/after) 可一体化声明 |

## 总结

### 核心要点

1. **自动装配的本质**：通过 `@EnableAutoConfiguration` 注解触发，`AutoConfigurationImportSelector` 负责加载配置类

2. **加载机制**：

   - 从 `META-INF/spring.factories`（或新版本的 `AutoConfiguration.imports`）加载候选配置类
   - 通过条件注解过滤，只加载满足条件的配置类
   - 支持排除和自定义配置

3. **条件装配**：通过条件注解（`@ConditionalOnClass`、`@ConditionalOnMissingBean` 等）实现按需加载

4. **执行顺序**：通过 `@AutoConfigureBefore`、`@AutoConfigureAfter`、`@AutoConfigureOrder` 控制执行顺序

### 关键优势

- **零配置**：开箱即用，减少配置工作量
- **约定优于配置**：遵循默认约定即可快速开发
- **灵活扩展**：支持自定义配置和覆盖默认配置
- **按需加载**：只加载需要的配置，提高启动性能

### 学习建议

1. **阅读源码**：深入理解 `AutoConfigurationImportSelector` 的实现
2. **实践调试**：通过调试和日志理解自动配置的执行过程
3. **自定义配置**：尝试创建自己的自动配置类，加深理解
4. **关注更新**：了解 Spring Boot 新版本的自动配置变化

### 相关资源

- [Spring Boot 官方文档 - Auto-configuration](https://docs.spring.io/spring-boot/docs/current/reference/html/using.html#using.auto-configuration)
- [Spring Boot 源码](https://github.com/spring-projects/spring-boot)
- [Spring Boot Auto-configuration 最佳实践](https://docs.spring.io/spring-boot/docs/current/reference/html/features.html#features.developing-auto-configuration)
