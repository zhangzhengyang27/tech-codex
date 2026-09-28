---
title: "SpEL表达式语言"
description: "SpEL 的语法体系、求值上下文与类型安全、在 @Value 与 Bean 定义中的用法，以及常见陷阱与安全边界。"
keywords: ["SpEL", "表达式语言", "@Value", "spring-expression", "PropertyAccessor"]
category: "Java"
tags: [Java, Spring]
---

# SpEL 表达式语言

SpEL（Spring Expression Language，Spring 表达式语言）是 Spring 自 3.0 引入的一套独立、可嵌入的表达式引擎，位于 `spring-expression` 模块。它既能在注解和 XML 配置里做"动态取值"，也能在应用代码中独立求值。本篇聚焦 SpEL 的语法、求值机制和在 Spring 中的典型用法，并明确它的安全边界。

:::: tip 版本基准
本文档以 **Spring Framework 6.x / Spring Boot 3.x** 为主。SpEL 本身的语法在 Spring 3.0 后基本稳定，Spring 6 起对表达式安全解析（`SimpleEvaluationContext` / `StandardEvaluationContext` 的隔离）更加严格。
::::

## 一、SpEL 是什么，能做什么

SpEL 是一套表达式语言，不是模板语言。它支持：

- 字面量、算术运算、关系/逻辑运算
- 访问对象属性、数组、集合、Map
- 方法调用、构造器调用
- 正则匹配、集合投影（`.![]`）、筛选（`.?[]`）、聚合
- 在 Spring 容器中引用 Bean（`@beanName`）、取环境属性（`${...}` 在 `@Value` 中由 `PropertySourcesPlaceholderConfigurer` 先解析，再交给 SpEL）

典型使用场景：

| 场景 | 形式 | 说明 |
|------|------|------|
| 配置注入 | `@Value("#{...}")` | 注入计算结果而非字面量 |
| Bean 定义 | XML `<property value="#{...}"/>` | 传统 XML 配置中的动态值 |
| 条件装配 | `@ConditionalOnExpression("...")` | 按表达式结果决定是否装配 |
| 安全表达式 | `@PreAuthorize("hasRole('ADMIN')")` | Spring Security 用 SpEL 做鉴权 |
| 缓存键 | `@Cacheable(key = "#user.id")` | 用参数拼缓存键 |
| 独立求值 | `SpelExpressionParser` | 在代码里直接计算表达式 |

:::: warning SpEL 不是 EL（JSP 表达式语言）
两者语法相似但完全独立。SpEL 来自 `org.springframework.expression`，EL 来自 `jakarta.el`。在 `@Value` 中 `${}`（属性占位符）由 Spring 环境解析、先于 SpEL 执行；`#{}` 才是 SpEL。
::::

## 二、核心语法

### 2.1 字面量与运算符

```java
ExpressionParser parser = new SpelExpressionParser();

parser.parseExpression("'hello'").getValue(String.class);     // 字符串
parser.parseExpression("123").getValue(Integer.class);         // 整数
parser.parseExpression("true").getValue(Boolean.class);        // 布尔
parser.parseExpression("1 + 2 * 3").getValue(Integer.class);   // 7，遵循四则优先级
parser.parseExpression("10 % 3").getValue(Integer.class);      // 1
parser.parseExpression("'abc'.toUpperCase()").getValue();      // "ABC"
```

支持的运算符：

| 类别 | 运算符 |
|------|--------|
| 算术 | `+` `-` `*` `/` `%` `^`（幂） |
| 关系 | `<` `>` `<=` `>=` `==` `!=` |
| 逻辑 | `and` `or` `not` `&&` `\|\|` `!` |
| 三目 | `?:`、Elvis 运算符 `?:`（`name != null ? name : 'default'` 简写为 `name ?: 'default'`） |
| 正则 | `matches`（如 `'abc' matches '[a-z]+'`） |
| 集合 | `.![]` 投影、`.?[]` 筛选、`.^[]`/`.$[]` 取首/尾匹配 |

### 2.2 访问属性、集合与 Map

```java
// 假设 root 对象为 user，含 name、age、address.city、roles(List<String>)、tags(Map<String,String>)
ExpressionParser parser = new SpelExpressionParser();
EvaluationContext ctx = SimpleEvaluationContext.forReadOnlyDataBinding().build();

ctx.setVariable("user", user);
parser.parseExpression("#user.name").getValue(ctx);          // 属性
parser.parseExpression("#user.address.city").getValue(ctx);  // 链式导航
parser.parseExpression("#user.roles[0]").getValue(ctx);      // 集合/数组下标
parser.parseExpression("#user.tags['lang']").getValue(ctx);  // Map key（字符串需加引号）
```

### 2.3 集合投影与筛选

```java
List<User> users = List.of(
    new User("alice", 30), new User("bob", 17), new User("carol", 25));

EvaluationContext ctx = SimpleEvaluationContext.forReadOnlyDataBinding().build();
ctx.setVariable("users", users);

// 投影：取出所有 name
List<String> names = parser.parseExpression("#users.![name]").getValue(ctx, List.class);
// 筛选：年龄 >= 18
List<User> adults = parser.parseExpression("#users.?[age >= 18]").getValue(ctx, List.class);
```

## 三、EvaluationContext：求值的上下文与类型安全

表达式"在哪里求值、能访问什么"由 `EvaluationContext` 决定。Spring 提供两种实现，安全差异关键：

| 实现 | 能力 | 适用场景 |
|------|------|----------|
| `SimpleEvaluationContext` | 只读数据绑定、受限方法调用、不可构造对象、不可访问类类型 | **处理不可信/外部输入的表达式** |
| `StandardEvaluationContext` | 完整能力：方法调用、构造器、`T()` 类型引用、Bean 引用 | 应用内部配置、确定可信的表达式 |

::: warning 安全边界：绝不用 StandardEvaluationContext 解析外部输入
`StandardEvaluationContext` 允许 `T(java.lang.Runtime).getRuntime().exec('...')` 这类表达式。任何包含用户输入（如前端传入的排序字段、查询表达式）的表达式，都必须用 `SimpleEvaluationContext`，否则会造成远程代码执行（RCE）。
:::

```java
// 安全：只读绑定，外部输入也无法构造对象或调用方法
EvaluationContext safe = SimpleEvaluationContext
    .forReadOnlyDataBinding()
    .withRootObject(query)
    .build();
String field = request.getParameter("sort");   // 外部输入
parser.parseExpression("#root." + field).getValue(safe);
```

## 四、在 Spring 中的典型用法

### 4.1 @Value 注入计算结果

`@Value` 中 `#{}` 由 SpEL 求值，`${}` 由属性占位符先解析（可嵌套：`#{${app.max}}`）。

```java
@Component
public class AppConfig {

    // 直接字面量表达式
    @Value("#{1 + 1}")
    private int two;

    // 引用另一个 Bean 的属性
    @Value("#{systemProperties['os.name']}")
    private String osName;

    // 引用容器中的 Bean（@beanName 语法）
    @Value("#{dataSource.url}")
    private String dbUrl;

    // 通过 @beanName 语法调用容器中 Bean 的方法
    @Value("#{userService.defaultPageSize}")
    private int defaultPageSize;
}
```

### 4.2 缓存键与条件

```java
@Cacheable(cacheNames = "user", key = "#user.id")
public User load(User user) { ... }

// 条件：仅当参数满足表达式才缓存
@Cacheable(cacheNames = "order", unless = "#result == null")
public Order find(Long id) { ... }
```

### 4.3 条件装配

```java
@Bean
@ConditionalOnExpression("'${feature.async:false}' == 'true'")
public AsyncService asyncService() { ... }
```

::: note @ConditionalOnExpression 的表达式写法
`@ConditionalOnExpression` 的值本身就是一段 SpEL 表达式，**不要再包一层 `#{}`**（`#{}` 只用于 `@Value` 等 Bean 定义的占位场景）。属性占位符 `${...}` 会在表达式求值前先被解析。
:::

### 4.4 独立求值（非 Spring 配置场景）

```java
ExpressionParser parser = new SpelExpressionParser();
Expression exp = parser.parseExpression("'Hello ' + #name");
EvaluationContext ctx = SimpleEvaluationContext.forReadOnlyDataBinding().build();
ctx.setVariable("name", "World");
String result = exp.getValue(ctx, String.class);   // "Hello World"
```

## 五、常见陷阱

| 陷阱 | 表现 | 解决 |
|------|------|------|
| 把 `${}` 当 SpEL | `${app.name}` 是属性占位符，非表达式 | 需要运算用 `#{}`，可嵌套 `${}` 结果 |
| 空指针 | `#user.address.city` 中 address 为 null | 用安全导航 `#user?.address?.city`（`?.` 短路） |
| 类型不匹配 | `getValue(Integer.class)` 表达式返回字符串 | 显式转换或 `T(Integer).valueOf(...)` |
| 方法不可访问 | `SimpleEvaluationContext` 默认禁止方法调用 | 用 `forReadOnlyDataBinding().build()` 仅允许属性访问；需方法调用时用对应 builder |
| 外部输入用 Standard 上下文 | RCE 漏洞 | 一律 `SimpleEvaluationContext` |
| 复杂表达式写在注解里 | 可读性差、难测试 | 抽取为方法或独立求值工具类 |

:::: tip 安全导航运算符
`?.` 在左侧为 null 时直接返回 null 而不抛 `NullPointerException`，等价于 Java 的 `Optional.map`。对链式导航的表达式强烈建议默认使用。
::::

## 六、小结

SpEL 是 Spring 内部的表达式引擎，核心用法集中在 `@Value` 动态注入、缓存键/条件、条件装配与安全表达式。使用上要分清 `${}`（属性占位符）与 `#{}`（SpEL），区分 `SimpleEvaluationContext`（外部/不可信输入）与 `StandardEvaluationContext`（内部可信），并善用 `?.` 安全导航避免空指针。

**相关阅读**：`@Value` 注入更完整的依赖注入语境见 [IoC 容器](01-IoC容器.md)；方法级鉴权表达式见 [Spring Security 认证授权与 JWT 基础](/JAVA/SpringSecurity/00-认证授权与JWT基础)。

## 版本差异(旧版 → Spring 6.x)

| 特性 | 旧版(Spring 5.x) | Spring 6.x |
|------|-----------------|------------|
| SpEL 表达式 | 核心语法不变 | 不变；支持文本块等新语法 |
| 安全求值 | SimpleEvaluationContext | 不变；仍推荐受限上下文 |
| 编译模式 | SpelCompilerMode | 不变 |
