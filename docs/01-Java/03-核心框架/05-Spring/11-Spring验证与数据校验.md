---
title: "Spring验证与数据校验"
description: "JSR-380 Bean Validation 注解、Spring Validator 接口与校验时机、方法参数/@RequestBody 校验、分组校验与自定义约束，以及常见陷阱。"
keywords: ["Bean Validation", "@Valid", "@Validated", "Hibernate Validator", "校验分组", "ConstraintValidator"]
category: "Java"
tags: [Java, Spring]
---

# Spring 验证与数据校验

数据校验是分层架构里反复出现的横切需求：Controller 接收外部输入要校验，Service 处理业务参数要校验，持久化前也要保证数据合法。Spring 本身提供 `Validator` 接口，同时完整集成了 JSR-380（Bean Validation 2.0，Jakarta Validation 3.0）规范，由 Hibernate Validator 作为默认实现。本篇讲清两套机制的区别、在 Spring 中的校验时机，以及分组与自定义约束的实战。

:::: tip 版本基准
本文档以 **Spring Framework 6.x / Spring Boot 3.x** 为主。Spring 6 使用 **Jakarta Validation 3.0**（`jakarta.validation.*`）；Spring 5 / Boot 2 使用 `javax.validation.*`。命名空间迁移是历史代码最常见的编译错误来源。
::::

## 一、两套校验机制

| 机制 | 来源 | 用法 | 特点 |
|------|------|------|------|
| `Validator` 接口 | Spring 自带 `org.springframework.validation` | 编程式，实现 `validate(Object, Errors)` | 灵活、可访问 Spring 上下文；样板代码多 |
| Bean Validation | JSR-380 / Jakarta Validation | 声明式注解 `@NotNull` 等 | 标准、零侵入、生态广；推荐默认使用 |

实际项目里**优先用 Bean Validation 注解**，在需要访问 Spring Bean 或复杂跨字段逻辑时再配合 `Validator` 或自定义 `ConstraintValidator`。

## 二、Bean Validation 核心注解

### 2.1 常用约束

```java
public class CreateUserRequest {

    @NotBlank(message = "用户名不能为空")
    private String username;

    @Email(message = "邮箱格式不正确")
    private String email;

    @Min(value = 18, message = "年龄不能小于 18")
    @Max(value = 120, message = "年龄不能大于 120")
    private Integer age;

    @Size(min = 6, max = 20, message = "密码长度 6-20")
    private String password;

    @Pattern(regexp = "^1[3-9]\\d{9}$", message = "手机号格式不正确")
    private String phone;

    @NotNull
    @Future(message = "过期时间必须晚于当前")
    private LocalDateTime expireAt;
}
```

常用注解速查：

| 注解 | 适用类型 | 说明 |
|------|---------|------|
| `@NotNull` | 任意 | 不为 null（空字符串算有值） |
| `@Null` | 任意 | 必须为 null |
| `@NotBlank` | `CharSequence` | 非 null 且去空白后非空 |
| `@NotEmpty` | `CharSequence`/集合/Map/数组 | 非 null 且长度/大小 > 0 |
| `@Size(min,max)` | 同上 | 长度/大小范围 |
| `@Min`/`@Max` | 数值 | 数值范围 |
| `@DecimalMin`/`@DecimalMax` | 数值/字符串 | 含边界的数值范围 |
| `@Email` | `CharSequence` | 邮箱格式 |
| `@Pattern` | `CharSequence` | 正则匹配 |
| `@Past`/`@Future` | 日期时间 | 必须在过去/未来 |
| `@AssertTrue`/`@AssertFalse` | `boolean` | 必须为 true/false |

### 2.2 级联校验

对象里的嵌套对象、集合元素要加 `@Valid` 才会递归校验：

```java
public class OrderRequest {
    @Valid
    private CreateUserRequest user;

    @Valid
    private List<@NotNull OrderItem> items;
}
```

## 三、Spring 中的校验时机

### 3.1 @RequestBody（Controller 入参）

在 `@RequestBody` 参数上加 `@Valid` / `@Validated`，校验失败抛出 `MethodArgumentNotValidException`。

```java
@RestController
@RequestMapping("/users")
public class UserController {

    @PostMapping
    public ResponseEntity<Void> create(@Valid @RequestBody CreateUserRequest req) {
        // 校验通过才会进入方法体
        userService.create(req);
        return ResponseEntity.ok().build();
    }
}
```

### 3.2 @ModelAttribute / 表单绑定

```java
@PostMapping("/form")
public String submit(@Valid CreateUserRequest req, BindingResult result) {
    if (result.hasErrors()) {           // 手动处理校验结果
        return "form-view";
    }
    return "success";
}
```

::: tip @Valid 与 @Validated 的区别
- `@Valid`（JSR-380）支持嵌套级联校验，用在方法参数上。
- `@Validated`（Spring 提供）支持**分组校验**和 Spring 的 AOP 代理（可用于校验 Service 方法参数），但不能标注在字段上做级联标记——级联仍需在嵌套字段上加 `@Valid`。
- Controller 入参两者通常都能用；需要分组时必须用 `@Validated`。
:::

### 3.3 Service 方法参数校验

在类上标注 `@Validated`（Spring 的），方法参数用 `@NotNull` 等约束，由 AOP 在调用前校验：

```java
@Service
@Validated
public class UserService {

    public User findById(@NotNull Long id) {     // 不传 id 抛 ConstraintViolationException
        return repository.findById(id).orElseThrow();
    }
}
```

### 3.4 编程式校验（注入 Validator）

```java
@Autowired
private Validator validator;

public void check(CreateUserRequest req) {
    Set<ConstraintViolation<CreateUserRequest>> violations = validator.validate(req);
    if (!violations.isEmpty()) {
        throw new IllegalArgumentException(violations.iterator().next().getMessage());
    }
}
```

## 四、分组校验

同一对象在不同场景（新增/更新）需要不同约束时，用分组接口区分。

```java
public interface OnCreate {}   // 新增分组
public interface OnUpdate {}   // 更新分组

public class UserForm {

    @Null(groups = OnCreate.class, message = "新增时 id 必须为空")
    @NotNull(groups = OnUpdate.class, message = "更新时 id 不能为空")
    private Long id;

    @NotBlank(groups = {OnCreate.class, OnUpdate.class})
    private String name;
}

@PostMapping
public void create(@Validated(OnCreate.class) @RequestBody UserForm form) { ... }

@PutMapping
public void update(@Validated(OnUpdate.class) @RequestBody UserForm form) { ... }
```

## 五、自定义约束

当内置注解不够时，定义注解 + 实现 `ConstraintValidator`。

```java
@Target({FIELD})
@Retention(RUNTIME)
@Constraint(validatedBy = PhoneValidator.class)
public @interface Phone {
    String message() default "手机号不合法";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class PhoneValidator implements ConstraintValidator<Phone, String> {
    private static final Pattern P = Pattern.compile("^1[3-9]\\d{9}$");

    @Override
    public boolean isValid(String value, ConstraintValidatorContext ctx) {
        return value == null || P.matcher(value).matches();   // 允许 null，配合 @NotNull 控制必填
    }
}
```

## 六、常见陷阱

| 陷阱 | 表现 | 解决 |
|------|------|------|
| 漏加 `@Valid` / `@Validated` | 注解不生效，直接进方法体 | 入参必须显式标注才会触发校验 |
| `javax` vs `jakarta` | Spring 6 编译报找不到 `javax.validation` | Boot 3 用 `jakarta.validation.*` |
| 嵌套对象不校验 | 子对象字段全放行 | 在字段上加 `@Valid` 级联 |
| 自定义注解 `null` 处理 | null 被判定为非法 | 在 `isValid` 中显式 `return value == null || ...`，必填交给 `@NotNull` |
| 异常未统一处理 | 前端收到 500 或异常栈 | 用 `@ExceptionHandler`/`@RestControllerAdvice` 拦截 `MethodArgumentNotValidException` 返回 400 |
| 分组类型写错 | 校验没按预期触发 | 确认 `@Validated(分组.class)` 与注解 `groups` 一致 |

:::: tip 统一异常响应
校验失败本质是"业务参数不合法"，应返回 400 而非 500。建议在 `@RestControllerAdvice` 中集中处理 `MethodArgumentNotValidException` 与 `ConstraintViolationException`，提取 `FieldError` 拼成 `{field: message}` 结构返回。
::::

## 七、小结

Spring 校验以 JSR-380 Bean Validation 为主、Spring `Validator` 为辅。日常用法是在 `@RequestBody` 上加 `@Valid` 做入参校验，需要分组用 `@Validated`，嵌套对象用 `@Valid` 级联，特殊规则用 `ConstraintValidator` 自定义。注意 Spring 6 的 `jakarta.validation` 命名空间，并做好校验异常的统一响应。

**相关阅读**：入参来自 Web 层，完整的请求处理链路见 [Spring MVC 执行流程与拦截器](05-SpringMVC执行流程与拦截器.md)；表达式中的动态取值见 [SpEL 表达式语言](10-SpEL表达式语言.md)。

## 版本差异(旧版 → Spring 6.x)

| 特性 | 旧版(Spring 5.x / Bean Validation 2.x) | Spring 6.x (BV 3.0) |
|------|----------------------------------------|---------------------|
| 校验 API | javax.validation.* | jakarta.validation.* |
| 规范版本 | Bean Validation 2.0 | Bean Validation 3.0 |
| 嵌套校验 | @Valid 级联 | 不变 |
| 自定义校验 | ConstraintValidator | 不变 |
| Spring Validator | 可用 | 不变；与 jakarta 适配 |
