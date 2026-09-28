---
title: "SpringBoot国际化与本地化"
description: "Spring Boot 国际化机制：MessageSource、LocaleResolver、拦截器与消息文件组织，以及多语言切换与校验信息本地化的实战。"
keywords: ["国际化", "i18n", "MessageSource", "LocaleResolver", "本地化"]
category: "Java"
tags: [Java, SpringBoot]
---

# Spring Boot 国际化与本地化

国际化（i18n，Internationalization 的 i 与 n 之间有 18 个字母）让同一套应用根据客户端语言返回不同语言的文案。Spring Boot 通过 `MessageSource` 抽象 + `LocaleResolver` 解析区域来原生支持这一能力，常用于前端提示、邮件模板、校验错误信息的多语言。

:::: tip 版本基准
本文档以 **Spring Boot 3.x** 为主。`MessageSource` 与 `LocaleResolver` 的 API 在 Spring 5/6 中稳定；Spring 6 起默认消息文件编码按 UTF-8 处理，无需额外指定 `encoding`。
::::

## 一、核心组件

| 组件 | 职责 | 默认实现 |
|------|------|---------|
| `MessageSource` | 按 code + Locale 取消息 | `ResourceBundleMessageSource` / `ReloadableResourceBundleMessageSource` |
| `LocaleResolver` | 从请求解析当前区域 | `AcceptHeaderLocaleResolver`（按 Accept-Language） |
| `LocaleChangeInterceptor` | 通过参数动态切换区域 | 拦截器，配合 `LocaleResolver` |

## 二、消息文件组织

按 `basename_语言_地区.properties` 命名，放在 `resources/messages/` 下：

```text
messages/
  messages.properties        # 默认（兜底）
  messages_zh_CN.properties   # 中文
  messages_en_US.properties   # 英文
```

```properties
# messages_zh_CN.properties
user.notfound=用户不存在：{0}
greeting=你好，{0}
```

```properties
# messages_en_US.properties
user.notfound=User not found: {0}
greeting=Hello, {0}
```

## 三、配置 MessageSource

```java
@Configuration
public class I18nConfig implements WebMvcConfigurer {

    @Bean
    public MessageSource messageSource() {
        ReloadableResourceBundleMessageSource src = new ReloadableResourceBundleMessageSource();
        src.setBasename("classpath:messages/messages");  // 对应 messages_*.properties
        src.setDefaultEncoding("UTF-8");
        src.setCacheSeconds(3600);                        // 按秒检测文件变化后重载；开发期可设 0 实时重载，-1 表示永久缓存
                                                          // 注意：classpath: 资源（尤其在 JAR 内）时热更新不可靠，建议开发期用 file: 路径
        return src;
    }

    @Bean
    public LocaleResolver localeResolver() {
        SessionLocaleResolver resolver = new SessionLocaleResolver();
        resolver.setDefaultLocale(Locale.SIMPLIFIED_CHINESE);  // 默认中文
        return resolver;
    }

    @Bean
    public LocaleChangeInterceptor localeChangeInterceptor() {
        LocaleChangeInterceptor interceptor = new LocaleChangeInterceptor();
        interceptor.setParamName("lang");   // 通过 ?lang=en_US 切换
        return interceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(localeChangeInterceptor());
    }
}
```

## 四、在代码与模板中取消息

### 4.1 注入 MessageSource

```java
@Service
public class UserService {
    @Autowired
    private MessageSource messageSource;

    public String greet(String name, Locale locale) {
        return messageSource.getMessage("greeting", new Object[]{name}, locale);
    }
}
```

### 4.2 Controller 直接返回本地化文案

```java
@GetMapping("/greet")
public String greet(@RequestParam String name, Locale locale) {
    return messageSource.getMessage("greeting", new Object[]{name}, locale);
}
```

### 4.3 Thymeleaf 模板

```html
<p th:text="#{greeting(${name})}">你好</p>
```

## 五、校验信息本地化

Bean Validation 的国际化消息可被 `MessageSource` 接管，实现校验错误多语言：

```java
public class UserForm {
    @NotBlank(message = "{user.name.required}")
    private String name;
}
```

```properties
# messages_zh_CN.properties
user.name.required=用户名不能为空
# messages_en_US.properties
user.name.required=Username is required
```

Spring Boot 默认会把 `{code}` 格式的 message 交给 `MessageSource` 解析，无需额外配置。

## 六、区域解析策略对比

| 策略 | 实现 | 切换方式 |
|------|------|---------|
| 按请求头 | `AcceptHeaderLocaleResolver` | 浏览器 Accept-Language（默认，不可动态改） |
| 按会话 | `SessionLocaleResolver` | 配合拦截器 `?lang=xx` |
| 按 Cookie | `CookieLocaleResolver` | 写入 Cookie 持久化 |
| 按参数 | 同上 + 拦截器 | URL 参数 |

::: tip 动态切换必须配 LocaleChangeInterceptor
`AcceptHeaderLocaleResolver` 默认不允许 `setLocale`，即无法通过拦截器改语言。需要用户手动切换语言时，改用 `SessionLocaleResolver` 或 `CookieLocaleResolver` 并注册 `LocaleChangeInterceptor`。
:::

## 七、常见陷阱

| 陷阱 | 表现 | 解决 |
|------|------|------|
| 中文乱码 | properties 读到乱码 | `setDefaultEncoding("UTF-8")`（Spring 6 默认已是，老版本需显式） |
| 找不到默认文件 | `NoSuchMessageException` | 确认 `setBasename` 不带 `.properties` 后缀 |
| 切换语言无效 | 始终是默认语言 | 注册 `LocaleChangeInterceptor` 并改用 Session/Cookie 解析器 |
| 占位符 {0} 不替换 | 原样输出 `{0}` | `getMessage` 第三个参数传 `Object[]` 实参 |
| 校验消息不本地化 | 仍显示 `{user.name.required}` | 确保 message 用 `{}` 包裹且 key 存在于 messages 文件 |

## 八、小结

Spring Boot 国际化由 `MessageSource` 提供文案、`LocaleResolver` 决定语言、`LocaleChangeInterceptor` 支持动态切换。把多语言文案抽到 `messages_*.properties`，校验注解 message 用 `{code}` 即可自动本地化。需要用户切换语言时务必用 Session/Cookie 解析器并注册拦截器。

**相关阅读**：校验注解与分组见 [Spring 验证与数据校验](/JAVA/Spring/11-Spring验证与数据校验)；Web 请求处理流程见 [Spring MVC 请求处理流程](25-WebMvc请求处理流程源码)。

## 版本差异(旧版 → Spring Boot 3.5.x)

| 特性 | 旧版(Spring Boot 2.x) | Spring Boot 3.5.x |
|------|----------------------|-------------------|
| MessageSource | 不变 | 不变；核心机制稳定 |
| 校验国际化 | javax.validation.* | jakarta.validation.*（消息 key 不变） |
| 默认编码 | UTF-8 | 不变 |
| 虚拟线程 | 无 | 线程上下文不变；Locale 传递方式不变 |
