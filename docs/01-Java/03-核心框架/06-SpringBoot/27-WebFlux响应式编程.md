---
title: "WebFlux 响应式编程"
description: "从响应式编程核心概念（变化传递、数据流、声明式、背压）到 Reactor 的 Flux/Mono/Scheduler，再到 WebFlux 的注解式与函数式开发及 WebFluxAutoConfiguration 自动装配源码解析。"
keywords: [WebFlux, 响应式编程, Reactor, Flux, Mono, 背压]
category: "Java"
tags: [Java, SpringBoot]
---


# WebFlux 响应式编程

> **版本基准**：本文主体基于 Spring Boot 2.x 时代的源码剖析（自动配置类写法、`ResourceProperties`、`HttpProperties`、`javax.validation` 等均为 2.x 形态）。Spring Boot 3.x 中装配思路不变，但部分类有调整（如 `ResourceProperties` 并入 `WebProperties`、校验包迁移为 `jakarta.validation`），阅读时注意对照。



## 一、响应式编程核心概念

### 1.1 什么是响应式编程

响应式编程（Reactive Programming）是 WebFlux 的核心技术。业界对该概念尚无完全统一的定义，Spring Framework 官方文档给出的解释如下：

> We touched on “non-blocking” and “functional” but what does reactive mean?The term, “reactive,” refers to programming models that are built around reacting to change — network components reacting to I/O events, UI controllers reacting to mouse events, and others. In that sense, non-blocking is reactive, because, instead of being blocked, we are now in the mode of reacting to notifications as operations complete or data becomes available.There is also another important mechanism that we on the Spring team associate with “reactive” and that is non-blocking back pressure. In synchronous, imperative code, blocking calls serve as a natural form of back pressure that forces the caller to wait. In non-blocking code, it becomes important to control the rate of events so that a fast producer does not overwhelm its destination.Reactive Streams is a small spec (also adopted in Java 9) that defines the interaction between asynchronous components with back pressure. For example a data repository (acting as Publisher) can produce data that an HTTP server (acting as Subscriber) can then write to the response. The main purpose of Reactive Streams is to let the subscriber to control how quickly or how slowly the publisher produces data.上文讲响应式编程是“非阻塞”和“函数式”的，但响应式意味着什么呢？“响应式”这个概念是指围绕对更改做出反应的编程模型-网络组件对I/O事件做出反应，UI控制器对鼠标事件做出反应等。从这个意义上说，响应式是非阻塞的，因为随着操作完成或数据可用，我们现在处于响应通知的模式，而不是被阻塞。Spring团队还有另一个重要机制与“响应式”相关联，这是不阻碍背压的机制。在同步命令式代码中，阻塞调用是强制调用者等待的一种自然的背压形式。在非阻塞代码中，控制事件的速率非常重要，这样事件数据生产方就不会快速地淹没其消费方。Reactive Streams是一个小的规范（在Java 9中也采用了），它定义了带有反压力的异步组件之间的交互。例如，数据存储库（充当发布者）可以生成数据，以便作为HTTP服务器（充当订阅者）将其写入响应中。 Reactive Streams的主要目的是让订阅者控制发布者生成数据的速度。

这段解释包含几个关键信息：

- “响应式”指**围绕对变化做出反应**的编程模型：网络组件对 I/O 事件做出反应，UI 控制器对鼠标事件做出反应等。
- 非阻塞本身就是响应式的一种：随着操作完成或数据可用，程序处于响应通知的模式，而不是被阻塞。
- 响应式还包含一个重要机制：**非阻塞背压**。同步命令式代码中，阻塞调用是天然的背压形式，强制调用方等待；非阻塞代码中则必须控制事件速率，避免快速的生产方淹没其消费方。
- **Reactive Streams** 是一个很小的规范（Java 9 已采纳），定义了带背压的异步组件之间的交互。例如数据存储库（充当 Publisher）产生数据，HTTP 服务器（充当 Subscriber）将其写入响应；其主要目的是让订阅者控制发布者产生数据的速度。

自 2014 年 JDK 1.8 发行后，Java 支持了函数式编程，为响应式编程提供了技术基础。随着高并发和高性能要求的提升，响应式编程与 WebFlux 的应用越来越广泛。

### 1.2 基础概念铺垫

#### 1.2.1 异步非阻塞

以“烧水”为模型，可以清晰区分同步/异步与阻塞/非阻塞的组合。水壶有两种：没有哨的普通水壶、壶盖上带哨的响水壶（前者水开无通知，后者水开有通知）：

| 组合 | 行为特征 | 要点 |
|---|---|---|
| **同步阻塞** | 用普通水壶烧水，人守在壶旁盯着，直到壶冒热气才拎下 | 期间不做别的事情，烧水占据了全部注意力和时间 |
| **同步非阻塞** | 用普通水壶烧水，人去玩手机，每隔几分钟看一眼水开了没有 | 不再被持续占用时间，但仍需惦记并轮询水壶状态 |
| **异步阻塞** | 换响水壶烧水，但人仍搬小马扎坐在旁边干等水开 | 有完成通知（哨响），但等待期间没有干别的事 |
| **异步非阻塞** | 换响水壶烧水，人直接走开玩手机，哨响后再来拎壶 | 有完成通知，且等待期间可执行其他任务 |

归纳：**同步/异步**描述的是是否存在完成通知机制；**阻塞/非阻塞**描述的是等待期间是否让出执行资源。异步非阻塞是响应式编程追求的目标形态。

#### 1.2.2 观察者模式

观察者模式是最基础的设计模式之一，由观察者（监听器）、主题（事件源）、事件派发器等角色构成：

| 场景 | 观察者（监听器） | 主题（事件源） | 事件派发器 |
|---|---|---|---|
| 出发前手机推送天气预报有雨，携带雨具出门 | 出行人 | 天气 | 手机天气预报 |
| 面试结束后等待结果通知 | 面试者 | 面试官 | 面试官（兼任事件广播器） |
| 打车后等待司机到达（司机承诺到达前来电） | 乘客 | 司机 | 司机（兼任事件广播器） |

#### 1.2.3 前端框架的双向绑定

Vue、React、AngularJS 中有一个很基础的概念：双向绑定。以 Vue 为例：

```html
<div id="app">
    <p>{{ message }}</p>
    <input v-model="message">
</div>
```

```javascript
var app6 = new Vue({
    el: '#app',
    data: {
        message: 'SpringBoot good!'
    }
})
```

除声明插值表达式与 `input` 的 `v-model` 外，没有编写任何绑定关系的代码，文本框内容与页面展示即可保持同步——这就是响应式。

#### 1.2.4 双向绑定中蕴含的响应式要素

分析双向绑定，可以引出响应式编程的三个基础概念：

1. **变化传递**：文本框上方的 span 部分“观察着”文本框内容，文本框内容变化引起 span 部分变化——这本质是观察者模式。
2. **数据流**：文本框每发生一次变化都会引起 span 部分变化，把这一系列变化列举出来即形成一组变化动作的事件记录；事件源的每一个变化连起来就是一个事件流。
3. **声明式**：只声明插值表达式的内容与 `input` 的 model，框架即自动完成关联，无需手动编写绑定逻辑。

#### 1.2.5 小结

响应式的关键点：**变化传递、数据流、声明式**。围绕响应式编程还有一个很关键的核心：**事件**。事件是观察者模式的核心，响应式编程以观察者模式为基础，自然依赖事件。

### 1.3 响应式流与背压

#### 1.3.1 响应式流

响应式编程中的数据流与 Java 8 中熟悉的 Stream 有明显差异：

- 普通 Stream 是同步阻塞的，无法解决高并发场景的问题；**响应式流可以做到异步非阻塞**。
- Stream 一旦调用消费型方法，就会将流中所有方法处理完毕，数据量很大时无法妥善处理；响应式流可以对这些数据进行**流量控制**，保证数据的接收速度在处理能力之内。

响应式流的关键点：**异步非阻塞、数据流速控制**。

#### 1.3.2 背压

背压（Back Pressure）是数据流速控制的核心策略，以生产流水线与经销商为模型可以体会其两种形态：

- **上游缓存**：流水线工人（下游消费者）处理工序耗时长、消化能力不足，而上游工友持续投递半成品，下游积压过多时向上游反馈“慢一点，处理不过来了”；上游随后将处理好的件暂时留在自己处缓存，等下游通知能力恢复后再继续投递。
- **上游废弃**：下游角色转为经销商后，因产品失去市场需求而向上游厂商反馈“停止供货”；厂商虽然生产线仍在运转且有成品产出，但只能将这部分成品废弃。

背压情景中的两个关键部分：**下游向上游反馈，上游将数据暂时缓存或直接废弃**。

### 1.4 Reactor 快速体验

WebFlux 的底层库是 **Reactor**，导入 `spring-boot-starter-webflux` 依赖时 Reactor 会一并引入。响应式编程以观察者模式为基础，有发布者（事件源）和接收者（监听器）两类角色，Reactor 中对应的接口分别是 `Publisher` 和 `Subscriber`。

最简单的发布-订阅实现：

```java
public class QuickDemo {
    public static void main(String[] args) {
        Flux<Integer> flux = Flux.just(1, 2, 3);
        flux.subscribe(System.out::println);
    }
}
```

上述代码首先创建了一个 `Publisher`，此处选用 Reactor 的实现类 `Flux` 作为发布者；接收者的类型是 `Consumer`，故可传入 Lambda 表达式或者方法引用。发布者与订阅者建立订阅关系（消费关系）的时机是 `Publisher` 的 `subscribe` 方法——一旦触发 `subscribe` 方法，接收者就可以向发布者拉取数据，等拉取到的数据处理完成后再继续拉取，直到发布者的数据全部处理完成，或者出现异常终止。

#### 1.4.1 Reactive 中的核心接口

**Publisher**：数据发布者，只有一个方法 `subscribe`。

```java
public void subscribe(Subscriber<? super T> s);
```

它接收一个 `Subscriber`，构成“订阅”关系。其文档注释原文：

> Request Publisher to start streaming data. This is a "factory method" and can be called multiple times, each time starting a new Subscription. Each Subscription will work for only a single Subscriber. A Subscriber should only subscribe once to a single Publisher. If the Publisher rejects the subscription attempt or otherwise fails it will signal the error via Subscriber.onError.请求发布者开始流式传输数据。 这是一种“工厂方法”，可以多次调用，每次启动一个新的订阅。 每个订阅仅适用于单个订阅者。 订阅者只能订阅一个发布者。 如果发布者拒绝订阅，或以其他方式失败，它将通过 Subscriber.onError 指示错误。

要点：它可以产生多个订阅，一个订阅归属一个发布者和一个接收者。

**Subscriber**：数据接收者，接口方法有 4 个：

```java
public void onSubscribe(Subscription s);

public void onNext(T t);

public void onError(Throwable t);

public void onComplete();
```

方法名均以 **on** 开头，代表事件形式（类比 JavaScript 中的 onclick 等）。四个方法分别对应：

- onSubscribe：当触发订阅时
- onNext：当接收到下一个数据时
- onComplete：当发布者的数据都接收处理完成时
- onError：当出现异常时

**Subscription**：订阅“关系”本身，归属于一个发布者和一个接收者（可类比关系型数据库多对多中间表的一条数据）。它有两个方法：

```java
public void request(long n);

public void cancel();
```

`request` 对应请求/拉取数据，`cancel` 对应放弃/停止拉取。它完成了数据接收者对发布者的交互，背压也是基于此实现。

**Processor**：处理器，特点是**有输入，有输出**，对应到 Reactor 的概念中就是发布者和接收者的合体，一般用于数据的中间处理：

```java
public interface Processor<T, R> extends Subscriber<T>, Publisher<R>
```

在接口定义中它直接继承了 `Publisher` 和 `Subscriber` 接口。

#### 1.4.2 Reactor 常用组件

**Flux**：可以简单理解为**“非阻塞的 Stream”**，它实现了 `Publisher` 接口：

```java
public abstract class Flux<T> implements Publisher<T>
```

既然是发布者，就少不了 `subscribe` 方法。`Flux` 和下文的 `Mono` 的 `subscribe` 方法重载有很多，在实现 `Publisher` 原生 `subscribe` 方法的基础上还扩展了几个重载以简化操作，例如只传入一个数据消费 `Consumer` 的重载（只处理正常情况下的数据接收）。

称它可理解为 `Stream`，是因为它拥有 `Stream` 中的中间操作，并且更多更全面：

```java
public class FluxDemo {
    public static void main(String[] args) {
        Flux<Integer> flux = Flux.just(1, 2, 3);
        flux.map(num -> num * 5) // 将所有数据扩大5倍
                .filter(num -> num > 10) // 只过滤出数值中超过10的数
                .map(String::valueOf) // 将数据转为String类型
                .publishOn(Schedulers.boundedElastic()) // 使用有界弹性线程池来处理数据
                .subscribe(System.out::println); // 消费数据
    }
}
```

> 注：早期版本常用的 `Schedulers.elastic()`（无界弹性线程池）已在 Reactor 3.4 标记废弃、3.5 中移除，替换方案为 `boundedElastic()`（默认线程上限为 `max(CPU核数, 4) × 10`，任务队列上限 10 万）。

**Mono**：可以简单理解为**“非阻塞的 Optional”**，它也实现了 `Publisher` 接口：

```java
public abstract class Mono<T> implements Publisher<T>
```

它跟 Optional 类似，里面要么有一个对象，要么是空的。操作与 Flux 相似。

**Scheduler**：可以简单理解为**“线程池”**，线程池需要由 `Schedulers` 工具类产生（`Scheduler` 的实现类并非 public，需通过 `Schedulers` 的工厂方法获取）。它有几种类型：

- immediate：直接在当前线程执行（不发生线程切换）
- single：只有一个线程的线程池（可类比 `Executors.newSingleThreadExecutor()`）
- elastic：弹性线程池，线程池中的线程数量原则上没有上限（底层创建线程池时指定了最大容量为 `Integer.MAX_VALUE`）——已废弃并于 Reactor 3.5 移除，见上文 `boundedElastic()` 说明
- parallel：并行线程池，线程池中的线程数量默认等于CPU处理器的数量（jdk中的 `Runtime` 类可以调用 `availableProcessors` 方法来获取CPU处理器数量）

#### 1.4.3 概念小结

1. 响应式编程的三个关键点：**变化传递、数据流、声明式**。
2. 响应式编程不同于观察者模式的关键点在于：接收者（监听器）可以反向与发布者（事件源）交互。
3. Reactor 是实现 Reactive 编程规范的框架，核心组件包括 `Flux` 、`Mono` 、`Scheduler` 。

## 二、WebFlux 快速上手

自 SpringFramework 5 发行后，之前的 **SpringMVC** 被改名为 **SpringWebMvc**，并新增了 **SpringWebFlux**。为降低新技术的接入门槛，WebFlux 可以完全沿用 WebMvc 的开发风格。

### 2.1 WebFlux 环境下使用 WebMvc 风格

导入的依赖只需要 `spring-boot-starter-webflux`，没有引入 WebMvc 模块。直接运行主启动类，控制台输出：

```text
1970-01-01 10:00:00.000  INFO 10224 --- [           main] com.example.demo.DemoApplication         : Starting DemoApplication on DESKTOP with PID 10224 (D:\IDEA\spring-boot-demo\target\classes started by LinkedBear in D:\IDEA\spring-boot-demo)
1970-01-01 10:00:00.000  INFO 10224 --- [           main] com.example.demo.DemoApplication         : No active profile set, falling back to default profiles: default
1970-01-01 10:00:00.000  INFO 10224 --- [           main] o.s.b.web.embedded.netty.NettyWebServer  : Netty started on port(s): 8080
1970-01-01 10:00:00.000  INFO 10224 --- [           main] com.example.demo.DemoApplication         : Started DemoApplication in 1.941 seconds (JVM running for 4.619)
```

注意应用启动在 **Netty** 上而不是 Tomcat——Netty 更适合作为响应式编程的应用服务器。

接下来按照 WebMvc 的开发习惯编写一个 `DemoController`：

```java
@RestController
public class DemoController {

    @GetMapping("/test")
    public String test() {
        return "test";
    }

    @GetMapping("/list")
    public List<Integer> list() {
        return Arrays.asList(1, 2, 3);
    }

}
```

之后用浏览器或者 postman 发送请求：[http://localhost:8080/test](http://localhost:8080/test) ，能正常响应 `"test"` 字符串，证明 **WebFlux 可以完美兼容 WebMvc 的开发风格**。

### 2.2 逐步过渡到 WebFlux

Reactor 中核心数据的封装是 `Flux` 和 `Mono`。改造上面的 `DemoController`，用上这两个组件：

```java
@RestController
public class DemoController {

    @GetMapping("/test")
    public Mono<String> test() {
        return Mono.just("test");
    }

    @GetMapping("/list")
    public Flux<Integer> list() {
        return Flux.just(1, 2, 3);
    }

}
```

如果只返回一个对象，则使用 `Mono` 替换；返回列表则使用 `Flux` 替换。这样写只是替换了返回值类型，注解仍是原来 **WebMvc** 中的；SpringWebFlux 有自己专门一套开发 `Controller` 层的 API，那就是函数式开发。

### 2.3 WebFlux 的函数式开发

切换开发风格之前，先梳理 WebMvc 风格的关键点：

- Controller 类上要打 `@Controller` 或者 `@RestController` 注解
- url映射的方法要在方法上打 `@RequestMapping` 注解或者它的扩展注解

这些 `Controller` 中的方法最终都会被封装为一个一个的 **`Handler`**，每个 `Handler` 都有自己匹配的 **url**。由此，WebFlux 函数式开发的核心点转换为两种关键组件：**`HandlerFunction`** 和 **`RouterFunction`** 。

#### 2.3.1 DemoController转换为DemoHandler

将 WebMvc 中的 `DemoController` 转换为 WebFlux 中的 `DemoHandler`：

```java
@Component
public class DemoHandler {

    public Mono<ServerResponse> test(ServerRequest request) {
        return ServerResponse.ok().contentType(MediaType.TEXT_PLAIN).body(Mono.just("test"), String.class);
    }

    public Mono<ServerResponse> list(ServerRequest request) {
        return ServerResponse.ok().contentType(MediaType.APPLICATION_JSON).body(Flux.just(1, 2, 3), Integer.class);
    }

}
```

此时的 `DemoHandler` 已经变成一个普通类，没有继承也没有实现，除了 `@Component` 注解外没有任何注解；IoC 容器既不知道它的功能定位，也不知道这些方法是否会被转换为实际处理客户端请求的 `Handler`。

#### 2.3.2 编写RouterConfiguration

`DemoHandler` 已经没有了 url 映射的功能，路由规则需要手动声明。编写一个配置类 `RouterConfiguration` 来配置路由规则：

```java
import static org.springframework.web.reactive.function.server.RequestPredicates.*;

@Configuration
public class RouterConfiguration {

    @Autowired
    private DemoHandler demoHandler;

    @Bean
    public RouterFunction<ServerResponse> demoRouter() {
        return RouterFunctions.route(GET("/test").and(accept(MediaType.TEXT_PLAIN)), demoHandler::test)
                .andRoute(GET("/list").and(accept(MediaType.APPLICATION_JSON)), demoHandler::list);
    }

}
```

这部分映射完全由手动声明。代码静态导入了 `RequestPredicates` 中的所有静态属性和方法，编写思路是：注入前面编写的 `DemoHandler`，注册若干 `RouterFunction` 类型的 Bean，注册过程中引用 `DemoHandler` 中的方法，并配置请求类型、uri、响应类型。

至此，最简单的 WebFlux 使用演示完毕。

### 2.4 WebMvc与WebFlux的对比

官方文档中有一张图直观展示了 WebMvc 和 WebFlux 的兼容功能点，以及各自领域目前特有的功能点，地址如下：

[https://docs.spring.io/spring/docs/5.1.10.RELEASE/spring-framework-reference/web-reactive.html#webflux-framework-choice](https://docs.spring.io/spring/docs/5.1.10.RELEASE/spring-framework-reference/web-reactive.html#webflux-framework-choice)

- SpringWebMvc 基于原生 Servlet，属于命令式编程，编写方式相对熟悉且便于调试；Servlet 可以是阻塞的，更适合跟传统的关系型数据库等阻塞IO的组件进行交互。
- SpringWebFlux 基于 Reactor，异步非阻塞，使用函数式编程，相较于命令式编程和声明式映射更灵活；它可以运行在 Netty 上，也可以运行在 Tomcat 、Jetty 、Undertow 等基于 Servlet3.1 规范及以上的Web容器中。
- SpringWebMvc 和 SpringWebFlux 都可以使用声明式注解编程来配置控制器和映射路径。

## 三、WebFlux 自动装配源码

使用 WebFlux 时主启动类相比于 WebMvc 没有任何区别，因此 WebFlux 的装配由自动配置类控制，即 `WebFluxAutoConfiguration`。

### 3.1 WebFluxAutoConfiguration

```java
@Configuration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
@ConditionalOnClass(WebFluxConfigurer.class)
@ConditionalOnMissingBean({ WebFluxConfigurationSupport.class })
@AutoConfigureAfter({ ReactiveWebServerFactoryAutoConfiguration.class, CodecsAutoConfiguration.class,
		ValidationAutoConfiguration.class })
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE + 10)
public class WebFluxAutoConfiguration
```

它与 `WebMvcAutoConfiguration` 几乎没有太大区别：

```java
@Configuration
@ConditionalOnWebApplication(type = Type.SERVLET)
@ConditionalOnClass({ Servlet.class, DispatcherServlet.class, WebMvcConfigurer.class })
@ConditionalOnMissingBean(WebMvcConfigurationSupport.class)
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE + 10)
@AutoConfigureAfter({ DispatcherServletAutoConfiguration.class, TaskExecutionAutoConfiguration.class,
		ValidationAutoConfiguration.class })
public class WebMvcAutoConfiguration
```

仅判断条件不同：WebFlux 需要判断的应用类型为 **REACTIVE**，而 WebMvc 为 **SERVLET**；WebFlux 需要判断 classpath 下是否有 `WebFluxConfigurer` 类，而 WebMvc 需要的是 `Servlet` 、`DispatcherServlet` 、`WebMvcConfigurer` 三个类。

阅读 WebFlux 的自动配置，首先进入 `ReactiveWebServerFactoryAutoConfiguration` 查看嵌入式容器的配置。

### 3.2 ReactiveWebServerFactoryAutoConfiguration

```java
@AutoConfigureOrder(Ordered.HIGHEST_PRECEDENCE)
@Configuration
@ConditionalOnClass(ReactiveHttpInputMessage.class)
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.REACTIVE)
@EnableConfigurationProperties(ServerProperties.class)
@Import({ ReactiveWebServerFactoryAutoConfiguration.BeanPostProcessorsRegistrar.class,
		ReactiveWebServerFactoryConfiguration.EmbeddedTomcat.class,
		ReactiveWebServerFactoryConfiguration.EmbeddedJetty.class,
		ReactiveWebServerFactoryConfiguration.EmbeddedUndertow.class,
		ReactiveWebServerFactoryConfiguration.EmbeddedNetty.class })
public class ReactiveWebServerFactoryAutoConfiguration
```

它会导入嵌入式容器工厂的配置类。默认情况下，导入 `spring-boot-starter-webflux` 后使用 **Netty** 作为嵌入式容器，故此处 `EmbeddedNetty` 生效，生效机制与 WebMvc 原理一致。

`EmbeddedNetty` 的源码如下。

#### 3.2.1 EmbeddedNetty

```java
@Configuration
@ConditionalOnMissingBean(ReactiveWebServerFactory.class)
@ConditionalOnClass({ HttpServer.class })
static class EmbeddedNetty {

    @Bean
    @ConditionalOnMissingBean
    public ReactorResourceFactory reactorServerResourceFactory() {
        return new ReactorResourceFactory();
    }

    @Bean
    public NettyReactiveWebServerFactory nettyReactiveWebServerFactory(ReactorResourceFactory resourceFactory) {
        NettyReactiveWebServerFactory serverFactory = new NettyReactiveWebServerFactory();
        serverFactory.setResourceFactory(resourceFactory);
        return serverFactory;
    }

}
```

它创建了两个 Bean：`ReactorResourceFactory` 和 `NettyReactiveWebServerFactory`。`NettyReactiveWebServerFactory` 从命名上看类比于 WebMvc 中的 `TomcatServletWebServerFactory`，那 `ReactorResourceFactory` 是什么？

#### 3.2.2 ReactorResourceFactory

它的文档注释原文翻译：

> Factory to manage Reactor Netty resources, i.e. LoopResources for event loop threads, and ConnectionProvider for the connection pool, within the lifecycle of a Spring ApplicationContext. This factory implements InitializingBean and DisposableBean and is expected typically to be declared as a Spring-managed bean.在Spring ApplicationContext 的生命周期内，用于管理Reactor Netty资源的工厂，即用于事件循环线程的 LoopResources 和用于连接池的 ConnectionProvider 。该工厂实现 InitializingBean 和 DisposableBean，通常应将其声明为Spring管理的Bean。

重点是**管理Reactor Netty资源的工厂**：涉及事件循环线程与连接池概念，角色类似 JDBC 中的 `DataSource`。往里看它的成员：

```java
public class ReactorResourceFactory implements InitializingBean, DisposableBean {
	private boolean useGlobalResources = true;
	private Consumer<HttpResources> globalResourcesConsumer;
	private Supplier<ConnectionProvider> connectionProviderSupplier = () -> ConnectionProvider.elastic("webflux");
	private Supplier<LoopResources> loopResourcesSupplier = () -> LoopResources.create("webflux-http");
    // ......
```

注意第三个属性 `connectionProviderSupplier`，它的创建方式是 `ConnectionProvider.elastic`，与 Reactor 调度器中 **elastic** 类型线程池的命名呼应。点开 ConnectionProvider 的 elastic 方法：

```java
static ConnectionProvider elastic(String name) {
    return new PooledConnectionProvider(name,
            (bootstrap, handler, checker) -> new SimpleChannelPool(bootstrap,
                    handler, checker, true, false));
```

可见它是一个连接的提供者，且基于 **Pool** 实现——可以简单理解为 **Reactor Netty 的连接池**。

实际运行观察可知：`ConnectionProvider` 底层确实是一个连接池，且能看到 Netty 事件循环的 **selector** 与 **worker** 线程组的概念，这正是 Netty 的核心（worker 线程数默认与 CPU 核心数相关）。

`ReactiveWebServerFactoryAutoConfiguration` 看完之后，回到 `WebFluxAutoConfiguration`。作为对比，`WebMvcAutoConfiguration` 的装配顺序声明：

```java
@AutoConfigureAfter({ DispatcherServletAutoConfiguration.class, CodecsAutoConfiguration.class,
		ValidationAutoConfiguration.class })
public class WebMvcAutoConfiguration
```

而 `WebFluxAutoConfiguration` 除了要先处理 `ValidationAutoConfiguration` 的**JSR-303**校验之外，还要先处理一个 `CodecsAutoConfiguration`（见 3.1 节源码中它的 `@AutoConfigureAfter`）。

### 3.3 CodecsAutoConfiguration

`CodecsAutoConfiguration` 只注册了一个 json 转换器以及日志工具：

```java
@Configuration
@ConditionalOnClass(CodecConfigurer.class)
@AutoConfigureAfter(JacksonAutoConfiguration.class)
public class CodecsAutoConfiguration {

private static final MimeType[] EMPTY_MIME_TYPES = {};

@Configuration
	@ConditionalOnClass(ObjectMapper.class)
	static class JacksonCodecConfiguration {

@Bean
		@Order(0)
		@ConditionalOnBean(ObjectMapper.class)
		public CodecCustomizer jacksonCodecCustomizer(ObjectMapper objectMapper) {
			return (configurer) -> {
				CodecConfigurer.DefaultCodecs defaults = configurer.defaultCodecs();
				defaults.jackson2JsonDecoder(new Jackson2JsonDecoder(objectMapper, EMPTY_MIME_TYPES));
				defaults.jackson2JsonEncoder(new Jackson2JsonEncoder(objectMapper, EMPTY_MIME_TYPES));
			};
		}

}

@Configuration
	@EnableConfigurationProperties(HttpProperties.class)
	static class LoggingCodecConfiguration {

@Bean
		@Order(0)
		public CodecCustomizer loggingCodecCustomizer(HttpProperties properties) {
			return (configurer) -> configurer.defaultCodecs()
					.enableLoggingRequestDetails(properties.isLogRequestDetails());
		}

}
}
```

接下来是最核心的 `WebFluxAutoConfiguration`。它的源码中定义了三个内部类，逐个来看。

### 3.4 WebFluxConfig

```java
@Configuration
@EnableConfigurationProperties({ ResourceProperties.class, WebFluxProperties.class })
@Import({ EnableWebFluxConfiguration.class })
public static class WebFluxConfig implements WebFluxConfigurer
```

它又导入了 `EnableWebFluxConfiguration`（即 3.5 节的配置类）。

#### 3.4.1 静态资源映射

```java
public void addResourceHandlers(ResourceHandlerRegistry registry) {
    if (!this.resourceProperties.isAddMappings()) {
        logger.debug("Default resource handling disabled");
        return;
    }
    if (!registry.hasMappingForPattern("/webjars/**")) {
        ResourceHandlerRegistration registration = registry.addResourceHandler("/webjars/**")
                .addResourceLocations("classpath:/META-INF/resources/webjars/");
        configureResourceCaching(registration);
        customizeResourceHandlerRegistration(registration);
    }
    String staticPathPattern = this.webFluxProperties.getStaticPathPattern();
    if (!registry.hasMappingForPattern(staticPathPattern)) {
        ResourceHandlerRegistration registration = registry.addResourceHandler(staticPathPattern)
                .addResourceLocations(this.resourceProperties.getStaticLocations());
        configureResourceCaching(registration);
        customizeResourceHandlerRegistration(registration);
    }
}
```

处理逻辑与 WebMvc 部分几乎一致：处理 webjars 的资源，以及 `ResourceProperties` 中的静态路径。默认情况下：

```java
public class ResourceProperties {
	private static final String[] CLASSPATH_RESOURCE_LOCATIONS = { "classpath:/META-INF/resources/",
			"classpath:/resources/", "classpath:/static/", "classpath:/public/" };
	private String[] staticLocations = CLASSPATH_RESOURCE_LOCATIONS;
```

静态资源路径也与 WebMvc 部分相同。

#### 3.4.2 ViewResolver

```java
public void configureViewResolvers(ViewResolverRegistry registry) {
    this.viewResolvers.orderedStream().forEach(registry::viewResolver);
}
```

这部分是配置 `ViewResolver` 的；默认情况下运行时并不会进入 `configureViewResolvers` 方法。

#### 3.4.3 Converter和Formatter

```java
public void addFormatters(FormatterRegistry registry) {
    for (Converter<?, ?> converter : getBeansOfType(Converter.class)) {
        registry.addConverter(converter);
    }
    for (GenericConverter converter : getBeansOfType(GenericConverter.class)) {
        registry.addConverter(converter);
    }
    for (Formatter<?> formatter : getBeansOfType(Formatter.class)) {
        registry.addFormatter(formatter);
    }
}
```

这部分与 WebMvc 完全一致，作用是配置转换器。

### 3.5 EnableWebFluxConfiguration

先看继承：

```java
@Configuration
public static class EnableWebFluxConfiguration extends DelegatingWebFluxConfiguration
```

它继承了 `DelegatingWebFluxConfiguration`，与 WebMvc 的套路一致：

```java
@Configuration
public static class EnableWebMvcConfiguration extends DelegatingWebMvcConfiguration implements ResourceLoaderAware
```

这些 `Delegating***Configuration` 是 `@EnableWebMvc` 或者 `@EnableWebFlux` 注解导入的配置类：

```java
@Import(DelegatingWebFluxConfiguration.class)
public @interface EnableWebFlux
```

其作用是：只要在 SpringBoot 中标注了这样的注解，SpringBoot 默认的自动配置类就不生效，改由开发者自己接管配置 WebMvc 或 WebFlux。

下面来看它里面配置的组件。

#### 3.5.1 FormattingConversionService

```java
@Bean
public FormattingConversionService webFluxConversionService() {
    WebConversionService conversionService = new WebConversionService(this.webFluxProperties.getDateFormat());
    addFormatters(conversionService);
    return conversionService;
}
```

类比 WebMvc 部分的参数类型转换器，代码几乎一模一样。

#### 3.5.2 Validator

```java
@Bean
public Validator webFluxValidator() {
    if (!ClassUtils.isPresent("javax.validation.Validator", getClass().getClassLoader())) {
        return super.webFluxValidator();
    }
    return ValidatorAdapter.get(getApplicationContext(), getValidator());
}
```

它配置的是 **JSR-303** 参数校验的校验器。

#### 3.5.3 HandlerMapping和HandlerAdapter

```java
protected RequestMappingHandlerAdapter createRequestMappingHandlerAdapter() {
    if (this.webFluxRegistrations != null
            && this.webFluxRegistrations.getRequestMappingHandlerAdapter() != null) {
        return this.webFluxRegistrations.getRequestMappingHandlerAdapter();
    }
    return super.createRequestMappingHandlerAdapter();
}

protected RequestMappingHandlerMapping createRequestMappingHandlerMapping() {
    if (this.webFluxRegistrations != null
            && this.webFluxRegistrations.getRequestMappingHandlerMapping() != null) {
        return this.webFluxRegistrations.getRequestMappingHandlerMapping();
    }
    return super.createRequestMappingHandlerMapping();
}
```

这两个组件与 WebMvc 中配合 `DispatcherServlet` 的核心组件相同，在 WebFlux 中也是一样的效果。

### 3.6 WebFluxConfigurationSupport

`EnableWebFluxConfiguration` 继承了 `DelegatingWebFluxConfiguration`，而后者又继承了 `WebFluxConfigurationSupport`。这个配置类中还注册了一批组件。

#### 3.6.1 DispatcherHandler

```java
@Bean
public DispatcherHandler webHandler() {
    return new DispatcherHandler();
}
```

WebFlux 的核心前端控制器 **`DispatcherHandler`** 在这里注册，它比 `DispatcherServlet` 简单得多。

#### 3.6.2 WebExceptionHandler

```java
@Bean
@Order(0)
public WebExceptionHandler responseStatusExceptionHandler() {
    return new WebFluxResponseStatusExceptionHandler();
}
```

WebFlux 的异常状态响应处理器。

#### 3.6.3 RequestMappingHandlerMapping

```java
@Bean
public RequestMappingHandlerMapping requestMappingHandlerMapping() {
    RequestMappingHandlerMapping mapping = createRequestMappingHandlerMapping();
    mapping.setOrder(0);
    mapping.setContentTypeResolver(webFluxContentTypeResolver());
    mapping.setCorsConfigurations(getCorsConfigurations());

PathMatchConfigurer configurer = getPathMatchConfigurer();
    Boolean useTrailingSlashMatch = configurer.isUseTrailingSlashMatch();
    if (useTrailingSlashMatch != null) {
        mapping.setUseTrailingSlashMatch(useTrailingSlashMatch);
    }
    Boolean useCaseSensitiveMatch = configurer.isUseCaseSensitiveMatch();
    if (useCaseSensitiveMatch != null) {
        mapping.setUseCaseSensitiveMatch(useCaseSensitiveMatch);
    }
    Map<String, Predicate<Class<?>>> pathPrefixes = configurer.getPathPrefixes();
    if (pathPrefixes != null) {
        mapping.setPathPrefixes(pathPrefixes);
    }

    return mapping;
}
```

这里真正创建了 `RequestMappingHandlerMapping` 组件。

#### 3.6.4 RouterFunctionMapping

```java
@Bean
public RouterFunctionMapping routerFunctionMapping() {
    RouterFunctionMapping mapping = createRouterFunctionMapping();
    mapping.setOrder(-1); // go before RequestMappingHandlerMapping
    mapping.setMessageReaders(serverCodecConfigurer().getReaders());
    mapping.setCorsConfigurations(getCorsConfigurations());

    return mapping;
}
```

与 `RequestMappingHandlerMapping` 区分开，它是**函数式端点路由编程的Mapping处理器**，其作用见第四章。

#### 3.6.5 SimpleUrlHandlerMapping

```java
@Bean
public HandlerMapping resourceHandlerMapping() {
    ResourceLoader resourceLoader = this.applicationContext;
    if (resourceLoader == null) {
        resourceLoader = new DefaultResourceLoader();
    }
    ResourceHandlerRegistry registry = new ResourceHandlerRegistry(resourceLoader);
    registry.setResourceUrlProvider(resourceUrlProvider());
    addResourceHandlers(registry);

    AbstractHandlerMapping handlerMapping = registry.getHandlerMapping();
    if (handlerMapping != null) {
        PathMatchConfigurer configurer = getPathMatchConfigurer();
        Boolean useTrailingSlashMatch = configurer.isUseTrailingSlashMatch();
        Boolean useCaseSensitiveMatch = configurer.isUseCaseSensitiveMatch();
        if (useTrailingSlashMatch != null) {
            handlerMapping.setUseTrailingSlashMatch(useTrailingSlashMatch);
        }
        if (useCaseSensitiveMatch != null) {
            handlerMapping.setUseCaseSensitiveMatch(useCaseSensitiveMatch);
        }
    }
    else {
        handlerMapping = new EmptyHandlerMapping();
    }
    return handlerMapping;
}
```

源码中第一个 if 结构下面使用了 `ResourceHandlerRegistry`，即前文静态资源映射中出现过的组件，用于**处理静态资源的映射**。通常项目中会有一些静态资源，只要存在静态资源，它就会创建一个 `SimpleUrlHandlerMapping` 来真正处理静态资源的路径映射；默认应用因存在图标 `favicon.ico`，运行时确实会注册该映射。

#### 3.6.6 RequestMappingHandlerAdapter

```java
@Bean
public RequestMappingHandlerAdapter requestMappingHandlerAdapter() {
    RequestMappingHandlerAdapter adapter = createRequestMappingHandlerAdapter();
    adapter.setMessageReaders(serverCodecConfigurer().getReaders());
    adapter.setWebBindingInitializer(getConfigurableWebBindingInitializer());
    adapter.setReactiveAdapterRegistry(webFluxAdapterRegistry());

ArgumentResolverConfigurer configurer = new ArgumentResolverConfigurer();
    configureArgumentResolvers(configurer);
    adapter.setArgumentResolverConfigurer(configurer);

    return adapter;
}
```

这里真正创建了 `RequestMappingHandlerAdapter`。

#### 3.6.7 LocaleContextResolver

```java
@Bean
public LocaleContextResolver localeContextResolver() {
    return createLocaleContextResolver();
}
```

`LocaleContextResolver` 是与国际化相关的组件。

#### 3.6.8 ReactiveAdapterRegistry

```java
@Bean
public ReactiveAdapterRegistry webFluxAdapterRegistry() {
    return new ReactiveAdapterRegistry();
}
```

该类用于处理 **Reactive** 类型，看一眼它的文档注释：

> A registry of adapters to adapt Reactive Streams Publisher to/from various async/reactive types such as CompletableFuture, RxJava Observable, and others. By default, depending on classpath availability, adapters are registered for Reactor, RxJava 1, RxJava 2 types, CompletableFuture, and Java 9+ Flow.Publisher.适配器注册表，用于使Reactive Streams Publisher适应各种异步/反应类型，例如CompletableFuture，RxJava Observable等。 默认情况下，根据类路径的可用性，为Reactor，RxJava 1，RxJava 2类型，CompletableFuture和Java 9+ Flow.Publisher注册适配器。

它可以处理多种 **Reactive Stream** 的发布器，涵盖 Reactor 、RxJava 、jdk9版本的 `Flow` 等。

#### 3.6.9 一组ResultHandler

```java
@Bean // 处理HttpEntity和ResponseEntity
public ResponseEntityResultHandler responseEntityResultHandler() {
    return new ResponseEntityResultHandler(serverCodecConfigurer().getWriters(),
            webFluxContentTypeResolver(), webFluxAdapterRegistry());
}

@Bean // 处理@ResponseBody类型的
public ResponseBodyResultHandler responseBodyResultHandler() {
    return new ResponseBodyResultHandler(serverCodecConfigurer().getWriters(),
            webFluxContentTypeResolver(), webFluxAdapterRegistry());
}

@Bean // 返回视图类型
public ViewResolutionResultHandler viewResolutionResultHandler() {
    ViewResolverRegistry registry = getViewResolverRegistry();
    List<ViewResolver> resolvers = registry.getViewResolvers();
    ViewResolutionResultHandler handler = new ViewResolutionResultHandler(
            resolvers, webFluxContentTypeResolver(), webFluxAdapterRegistry());
    handler.setDefaultViews(registry.getDefaultViews());
    handler.setOrder(registry.getOrder());
    return handler;
}

@Bean // 处理返回值类型为ServerResponse
public ServerResponseResultHandler serverResponseResultHandler() {
    List<ViewResolver> resolvers = getViewResolverRegistry().getViewResolvers();
    ServerResponseResultHandler handler = new ServerResponseResultHandler();
    handler.setMessageWriters(serverCodecConfigurer().getWriters());
    handler.setViewResolvers(resolvers);
    return handler;
}
```

WebFlux 提供了 4 种 `ResultHandler`，功能已标注在源码注释中：处理 HttpEntity/ResponseEntity、处理 @ResponseBody、返回视图类型、处理返回值类型为 ServerResponse。

### 3.7 ResourceChainCustomizerConfiguration

`WebFluxAutoConfiguration` 最底下还有一个配置类，配置很简单：

```java
@Configuration
@ConditionalOnEnabledResourceChain
static class ResourceChainCustomizerConfiguration {
    @Bean
    public ResourceChainResourceHandlerRegistrationCustomizer resourceHandlerRegistrationCustomizer() {
        return new ResourceChainResourceHandlerRegistrationCustomizer();
    }
}
```

它有一个 `@ConditionalOnEnabledResourceChain` 注解，作用与配置项 `spring.resources.chain.strategy.fixed.enabled` 相关：配置为 true 时该条件才生效，默认不生效。

### 3.8 自动装配小结

1. `WebFluxAutoConfiguration` 的配置整体与 `WebMvcAutoConfiguration` 非常相似，其中不乏包括几个核心组件。
2. `WebFluxAutoConfiguration` 默认配置的Web容器是Netty而非 Tomcat 等传统 Servlet 容器。
3. 大部分比较熟悉的组件都在 `DelegatingWebFluxConfiguration` 的父类 `WebFluxConfigurationSupport` 中注册。

## 四、WebFlux 工作原理：DispatcherHandler 源码走读

WebFlux 可以完美兼容 WebMvc 的开发风格，由此可推测，WebFlux 中的核心前端控制器 `DispatcherHandler` 在这部分的处理上与 `DispatcherServlet` 相差不大。以下通过处理逻辑的走读验证这一推测，分为传统注解方式与函数式端点两种情况。

### 4.1 传统注解方式的请求处理

#### 4.1.1 DispatcherHandler#handle

```java
public Mono<Void> handle(ServerWebExchange exchange) {
    if (this.handlerMappings == null) {
        return createNotFoundError();
    }
    return Flux.fromIterable(this.handlerMappings)
            .concatMap(mapping -> mapping.getHandler(exchange))
            .next()
            .switchIfEmpty(createNotFoundError())
            .flatMap(handler -> invokeHandler(exchange, handler))
            .flatMap(result -> handleResult(exchange, result));
}
```

它的源码量相比 `DispatcherServlet` 少了一个数量级。入参是一个 `ServerWebExchange`，类比 `DispatcherServlet` 中传入的 `HttpServletRequest` 和 `HttpServletResponse`，它应是类似于这两个类的合体：

```java
public interface ServerWebExchange {
	/**
	 * Return the current HTTP request.
	 */
	ServerHttpRequest getRequest();

	/**
	 * Return the current HTTP response.
	 */
	ServerHttpResponse getResponse();
```

该接口的方法中确实存在 **Request** 和 **Response** 的概念。

回到 `handle` 方法，对一个同时包含注解映射与函数式端点映射的示例工程进行调试观察，可以发现共有 3 个 `HandlerMapping`（注解映射、函数式端点映射与静态资源映射）。方法体中的 return 结构是一连串链式调用，这也体现了函数式编程和响应式编程的一个特点：断点调试困难。参考 `DispatcherServlet` 的工作原理，调用链可拆解为三个步骤。

#### 4.1.2 选定HandlerMapping

选定 `HandlerMapping` 的步骤是这几行：

```java
    return Flux.fromIterable(this.handlerMappings)
            .concatMap(mapping -> mapping.getHandler(exchange))
            .next()
```

首先进入 `fromIterable` 方法。

##### 2.1 Flux#fromIterable

```java
public static <T> Flux<T> fromIterable(Iterable<? extends T> it) {
    return onAssembly(new FluxIterable<>(it));
}
```

它将这一组 `HandlerMapping` 转换成了一组 `FluxIterable`，之后传入了 `onAssembly` 方法中。

##### 2.2 onAssembly

```java
protected static <T> Flux<T> onAssembly(Flux<T> source) {
    Function<Publisher, Publisher> hook = Hooks.onEachOperatorHook;
    if(hook != null) {
        source = (Flux<T>) hook.apply(source);
    }
    if (Hooks.GLOBAL_TRACE) {
        AssemblySnapshot stacktrace = new AssemblySnapshot(null, Traces.callSiteSupplierFactory.get());
        source = (Flux<T>) Hooks.addAssemblyInfo(source, stacktrace);
    }
    return source;
}
```

方法名称可理解为“触发了装载、扩展动作”，其文档注释：

> To be used by custom operators: invokes assembly Hooks pointcut given a Flux, potentially returning a new Flux. This is for example useful to activate cross-cutting concerns at assembly time, eg. a generalized checkpoint().由自定义运算符使用：给定Flux调用程序集Hooks切入点，并有可能返回新的Flux。这对于在装配时激活横切关注点很有用，比方说泛型checkpoint()。

注释中的关键词——切入点、装配、横切——指向 AOP 的概念；该方法的作用类似 AOP，更准确地说符合装饰者模式。运行观察可知，它只是将可迭代集合包装为 `FluxIterable` 对象：将可迭代的集合装载为一个 Flux 流，这就是装载、扩展的体现。

##### 2.3 concatMap(mapping -> mapping.getHandler(exchange))

将这组 `HandlerMapping` 转换为 Flux 后，接下来要从中找出能处理当前请求的 `HandlerMapping`，来到 `AbstractHandlerMapping#getHandler`：

```java
public Mono<Object> getHandler(ServerWebExchange exchange) {
    return getHandlerInternal(exchange).map(handler -> {
        // ......
    });
}
```

这个方法分为两部分：先执行 `getHandlerInternal` 获取可以处理当前请求的处理器，再执行 `map` 方法进行后处理。

###### 2.3.1 getHandlerInternal

对于传统的 `@RequestMapping` 方式标注的 Handler，会进入 `AbstractHandlerMethodMapping#getHandlerInternal` 方法（又跟 WebMvc 非常相似）：

```java
public Mono<HandlerMethod> getHandlerInternal(ServerWebExchange exchange) {
    this.mappingRegistry.acquireReadLock();
    try {
        HandlerMethod handlerMethod;
        try {
            // 搜索处理器方法（真正处理请求的RequestMapping）
            handlerMethod = lookupHandlerMethod(exchange);
        }
        catch (Exception ex) {
            return Mono.error(ex);
        }
        // 将方法分离出来，单独形成一个Bean
        if (handlerMethod != null) {
            handlerMethod = handlerMethod.createWithResolvedBean();
        }
        return Mono.justOrEmpty(handlerMethod);
    }
    finally {
        this.mappingRegistry.releaseReadLock();
    }
}
```

对比《WebMvc 请求处理流程源码》中 `DispatcherServlet` 的对应处理：`DispatcherServlet` 中的方法更短，但 WebFlux 处理得更严谨（有异常处理的考虑），而 WebMvc 中只是简单地把异常抛出去。忽略细节后思路完全一致：先搜索所有 HandlerMethod，再封装为一个单独的 `HandlerMethod` 类型的 Bean。调试观察可见，扫描到的匹配请求的 `HandlerMethod` 即示例工程的 `DemoController`。

###### 2.3.2 搜索到后的map

```java
return getHandlerInternal(exchange).map(handler -> {
    if (logger.isDebugEnabled()) {
        logger.debug(exchange.getLogPrefix() + "Mapped to " + handler);
    }
    if (CorsUtils.isCorsRequest(exchange.getRequest())) {
        CorsConfiguration configA = this.corsConfigurationSource.getCorsConfiguration(exchange);
        CorsConfiguration configB = getCorsConfiguration(handler, exchange);
        CorsConfiguration config = (configA != null ? configA.combine(configB) : configB);
        if (!getCorsProcessor().process(config, exchange) ||
                CorsUtils.isPreFlightRequest(exchange.getRequest())) {
            return REQUEST_HANDLED_HANDLER;
        }
    }
    return handler;
});
```

其中包含对跨域的处理。最简单的测试不会触发跨域处理，直接把封装好的 `Mono<HandlerMethod>` 返回。

返回后回到 `DispatcherHandler` 的 `handle` 方法，下一步是寻找该 `HandlerMethod` 对应的 `HandlerAdapter`。

#### 4.1.3 寻找HandlerAdapter

```java
private Mono<HandlerResult> invokeHandler(ServerWebExchange exchange, Object handler) {
    if (this.handlerAdapters != null) {
        for (HandlerAdapter handlerAdapter : this.handlerAdapters) {
            if (handlerAdapter.supports(handler)) {
                return handlerAdapter.handle(exchange, handler);
            }
        }
    }
    return Mono.error(new IllegalStateException("No HandlerAdapter: " + handler));
}
```

WebMvc 开发风格的处理返回的 Handler 是 `DemoController` 里的 `HandlerMethod`，默认情况下有 3 个 HandlerAdapter，匹配命中的是 `RequestMappingHandlerAdapter`，之后直接调用它的 `handle` 方法。

#### 4.1.4 执行目标方法

来到 `RequestMappingHandlerAdapter` 中：

```java
public Mono<HandlerResult> handle(ServerWebExchange exchange, Object handler) {
    HandlerMethod handlerMethod = (HandlerMethod) handler;
    Assert.state(this.methodResolver != null && this.modelInitializer != null, "Not initialized");

// 4.1 初始化参数绑定上下文
    InitBinderBindingContext bindingContext = new InitBinderBindingContext(
            getWebBindingInitializer(), this.methodResolver.getInitBinderMethods(handlerMethod));

// 4.2 创建方法执行对象
    InvocableHandlerMethod invocableMethod = this.methodResolver.getRequestMappingMethod(handlerMethod);

// 异常处理器的准备
    Function<Throwable, Mono<HandlerResult>> exceptionHandler =
            ex -> handleException(ex, handlerMethod, bindingContext, exchange);

    // 4.3 执行目标方法，处理返回值和异常
    return this.modelInitializer
            .initModel(handlerMethod, bindingContext, exchange)
            .then(Mono.defer(() -> invocableMethod.invoke(exchange, bindingContext)))
            .doOnNext(result -> result.setExceptionHandler(exceptionHandler))
            .doOnNext(result -> bindingContext.saveModel())
            .onErrorResume(exceptionHandler);
}
```

源码先对 `HandlerMethod` 进行处理，并准备异常处理器；链式调用第三行的 `invocableMethod.invoke` 负责引导调用真正的 Controller 方法。按源码注释标注逐个来看。

##### 4.1 InitBinderBindingContext

这个类没有被 SpringFramework 的官方 API 收录，只能通过源码了解：

```java
/** Extends BindingContext with @InitBinder method initialization. */
class InitBinderBindingContext extends BindingContext
```

它的文档注释中提到了 `@InitBinder` 注解，该注解在 WebMvc 中用于参数绑定。它继承自 `BindingContext`，`BindingContext` 的文档注释：

> Context to assist with binding request data onto Objects and provide access to a shared Model with controller-specific attributes. Provides methods to create a WebExchangeDataBinder for a specific target, command Object to apply data binding and validation to, or without a target Object for simple type conversion from request values. Container for the default model for the request.用于帮助将请求数据绑定到对象的上下文，并提供对具有控制器特定属性的共享模型的访问。提供用于为特定目标创建 WebExchangeDataBinder 的方法，提供对目标对象应用数据绑定和验证的命令Object（或不具有目标对象的命令Object）以从请求值进行简单类型转换的方法。请求的默认模型的容器。

可见它确实是跟参数绑定相关的组件。

##### 4.2 InvocableHandlerMethod

这个组件在 WebMvc 中也出现过，作用是调用 `HandlerMapping` 中真正封装的 Controller 方法。它与 WebMvc 部分的 `ServletInvocableHandlerMethod` 是继承关系，只不过 WebFlux 中的 `InvocableHandlerMethod` 在 reactive 包下而不是 mvc 包，其余部分几乎完全相同，可与 [36-DispatcherServlet源码](36-DispatcherServlet源码.md) 中 `DispatcherServlet` 工作原理对照阅读。

##### 4.3 执行目标方法，处理返回值和异常

```java
return this.modelInitializer
        .initModel(handlerMethod, bindingContext, exchange)
        .then(Mono.defer(() -> invocableMethod.invoke(exchange, bindingContext)))
        .doOnNext(result -> result.setExceptionHandler(exceptionHandler))
        .doOnNext(result -> bindingContext.saveModel())
        .onErrorResume(exceptionHandler);
```

其中最重要的动作是 `invocableMethod.invoke(exchange, bindingContext)`，进入 `InvocableHandlerMethod` 看它的实现：

```java
public Mono<HandlerResult> invoke(
        ServerWebExchange exchange, BindingContext bindingContext, Object... providedArgs) {
    return getMethodArgumentValues(exchange, bindingContext, providedArgs).flatMap(args -> {
        Object value;
        try {
            //4.3.1 执行目标方法
            ReflectionUtils.makeAccessible(getBridgedMethod());
            value = getBridgedMethod().invoke(getBean(), args);
        }
        // catch ......

        // ......
    });
}
```

lambda 表达式中 try 块里的 `value = getBridgedMethod().invoke(getBean(), args);` 与 WebMvc 中的调用方式对比如下：

###### 4.3.1 WebMvc 和 WebFlux 部分的Controller方法反射调用

```java
// org.springframework.web.servlet.mvc.method.annotation.ServletInvocableHandlerMethod (注意看包名)
public void invokeAndHandle(ServletWebRequest webRequest, ModelAndViewContainer mavContainer,
        Object... providedArgs) throws Exception {

Object returnValue = invokeForRequest(webRequest, mavContainer, providedArgs);
    setResponseStatus(webRequest);

------ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ↓ ------

// org.springframework.web.method.support.InvocableHandlerMethod (注意看包名)
protected Object doInvoke(Object... args) throws Exception {
    ReflectionUtils.makeAccessible(getBridgedMethod());
    try {
        return getBridgedMethod().invoke(getBean(), args);
    }
    // catch ......
}
```

两者完全相同——WebFlux 的请求处理在大量环节上沿用了 WebMvc 的实现。

执行完目标方法后，回到 `invoke` 方法，要进行返回值处理：

```java
    try {
        ReflectionUtils.makeAccessible(getBridgedMethod());
        value = getBridgedMethod().invoke(getBean(), args);
    } // catch ......

// 处理响应状态
    HttpStatus status = getResponseStatus();
    if (status != null) {
        exchange.getResponse().setStatusCode(status);
    }

MethodParameter returnType = getReturnType();
    // 4.3.2 处理返回值
    ReactiveAdapter adapter = this.reactiveAdapterRegistry.getAdapter(returnType.getParameterType());
    boolean asyncVoid = isAsyncVoidReturnType(returnType, adapter);
    if ((value == null || asyncVoid) && isResponseHandled(args, exchange)) {
        return (asyncVoid ? Mono.from(adapter.toPublisher(value)) : Mono.empty());
    }

    HandlerResult result = new HandlerResult(this, value, returnType, bindingContext);
    return Mono.just(result);
```

###### 4.3.2 处理返回值

处理响应状态后，下面处理返回值。示例 `DemoController` 中声明的返回值类型是 `Mono<String>`，因此这里的 value 也是 `Mono<String>` 类型，它的类型和对应的 `ReactiveAdapter` 都能获取到。

补充：`ReactiveAdapter` 是通过 `ReactiveAdapterRegistry` 组件获取而来的，用它来实际兼容 RxJava 等其他响应式编程框架。最后，返回值会被封装为一个 `HandlerResult` 对象返回出去。

#### 4.1.5 最后的返回值处理

回到 `DispatcherHandler` 中：

```java
return Flux.fromIterable(this.handlerMappings)
        .concatMap(mapping -> mapping.getHandler(exchange))
        .next()
        .switchIfEmpty(createNotFoundError())
        .flatMap(handler -> invokeHandler(exchange, handler))
        .flatMap(result -> handleResult(exchange, result));
```

上一步执行完成的是 `handler -> invokeHandler`，下面还要再处理上一步的返回值：

```java
private Mono<Void> handleResult(ServerWebExchange exchange, HandlerResult result) {
    return getResultHandler(result).handleResult(exchange, result)
            .onErrorResume(ex -> result.applyExceptionHandler(ex).flatMap(exceptionResult ->
                    getResultHandler(exceptionResult).handleResult(exchange, exceptionResult)));
}
```

调用链先根据上一步的返回值获取到 `ResultHandler`，之后处理返回。

##### 5.1 getResultHandler

```java
private HandlerResultHandler getResultHandler(HandlerResult handlerResult) {
    if (this.resultHandlers != null) {
        for (HandlerResultHandler resultHandler : this.resultHandlers) {
            if (resultHandler.supports(handlerResult)) {
                return resultHandler;
            }
        }
    }
    throw new IllegalStateException("No HandlerResultHandler for " + handlerResult.getReturnValue());
}
```

搜索方式是循环所有的 `HandlerResultHandler`，默认情况下一共有 4 个 `HandlerResultHandler`（分别处理 ResponseEntity、@ResponseBody、视图渲染与 ServerResponse，见第三章自动装配一节的源码）。

很容易判断，通过 `@RestController` 标注的方法都会走 `ResponseBodyResultHandler`：

##### 5.2 ResponseBodyResultHandler#handleResult

```java
public Mono<Void> handleResult(ServerWebExchange exchange, HandlerResult result) {
    Object body = result.getReturnValue();
    MethodParameter bodyTypeParameter = result.getReturnTypeSource();
    return writeBody(body, bodyTypeParameter, exchange);
}
```

它将返回值拿到，之后执行 `writeBody` 方法将返回值结果写到响应流中，处理结束。

`handleResult` 方法执行完毕后，回到 `DispatcherHandler` 中，链式调用的链也执行完毕了，整个请求处理结束。

#### 4.1.6 小结

1. `DispatcherHandler` 与 `DispatcherServlet` 的处理思路几乎完全相同，包括寻找 `HandlerMapping` 、`HandlerAdapter` 、执行目标方法等。
2. `DispatcherHandler` 相比较 `DispatcherServlet` 最大的不同点，是里面的实现绝大部分都采用响应式流编程。

### 4.2 函数式端点方式的请求处理

以函数式端点编程开发的 Handler 发起请求，观察处理流程的相同与不同之处。

#### 4.2.1 DispatcherHandler#handle

两种方式最终都走同一个前端控制器 `DispatcherHandler` 的 `handle` 方法：

```java
public Mono<Void> handle(ServerWebExchange exchange) {
    if (this.handlerMappings == null) {
        return createNotFoundError();
    }
    return Flux.fromIterable(this.handlerMappings)
            .concatMap(mapping -> mapping.getHandler(exchange))
            .next()
            .switchIfEmpty(createNotFoundError())
            .flatMap(handler -> invokeHandler(exchange, handler))
            .flatMap(result -> handleResult(exchange, result));
}
```

处理套路与 4.1 节一致，逐个来看。

#### 4.2.2 选定HandlerMapping

`concatMap(mapping -> mapping.getHandler(exchange))` 用于筛选 HandlerMapping，来到 `AbstractHandlerMapping#getHandler`：

```java
public Mono<Object> getHandler(ServerWebExchange exchange) {
    return getHandlerInternal(exchange).map(handler -> {
        // ......
    });
}
```

进入 Lambda 表达式中可以发现，`Handler` 的类型是 `RouterConfiguration` 中编写的 Lambda 表达式，且它被映射到了实际处理的 `DemoHandler`。

此处实际的 `HandlerMapping` 是 `RouterFunctionMapping`，回顾 3.6.4 节的源码：

##### 2.0 RouterFunctionMapping

```java
@Bean
public RouterFunctionMapping routerFunctionMapping() {
    RouterFunctionMapping mapping = createRouterFunctionMapping();
    mapping.setOrder(-1); // go before RequestMappingHandlerMapping
    mapping.setMessageReaders(serverCodecConfigurer().getReaders());
    mapping.setCorsConfigurations(getCorsConfigurations());

    return mapping;
}
```

它设置了一个 `Order` 属性为 -1，并且后面的单行注释写得很明白：它会排在 `RequestMappingHandlerMapping` 的前面。由此可知，**用函数式端点开发的映射，优先级会高于用 WebMvc 的注解风格开发的映射**。

对比 `RequestMappingHandlerMapping`，它的 Order 是 0，证明 `RouterFunctionMapping` 更靠前：

```java
@Bean
public RequestMappingHandlerMapping requestMappingHandlerMapping() {
    RequestMappingHandlerMapping mapping = createRequestMappingHandlerMapping();
    mapping.setOrder(0);
    // ......
```

另外，`RouterFunctionMapping` 中包含了所有的函数式端点，看它的定义：

```java
public class RouterFunctionMapping extends AbstractHandlerMapping implements InitializingBean {

    @Nullable
    private RouterFunction<?> routerFunction;
```

它里面有一个 `routerFunction` 属性，保存了所有的函数式端点。看似只有一个对象，说明内部必然有组合/合并的动作。借助 IDE 跳转，该类中有一个 `initRouterFunctions` 方法：

```java
protected void initRouterFunctions() {
    List<RouterFunction<?>> routerFunctions = routerFunctions();
    this.routerFunction = routerFunctions.stream().reduce(RouterFunction::andOther).orElse(null);
    logRouterFunctions(routerFunctions);
}
```

它先获取所有的 `RouterFunction`，之后通过 `reduce` 操作利用 `RouterFunction` 的 `andOther` 方法，将所有 `RouterFunction` 进行组合。

#### 4.2.3 寻找HandlerAdapter

```java
private Mono<HandlerResult> invokeHandler(ServerWebExchange exchange, Object handler) {
    if (this.handlerAdapters != null) {
        for (HandlerAdapter handlerAdapter : this.handlerAdapters) {
            if (handlerAdapter.supports(handler)) {
                return handlerAdapter.handle(exchange, handler);
            }
        }
    }
    return Mono.error(new IllegalStateException("No HandlerAdapter: " + handler));
}
```

依旧来到 `invokeHandler` 方法中找 `HandlerAdapter`，不过这次是函数式端点编程，匹配到的 `HandlerAdapter` 类型有所不同：为 `HandlerFunctionAdapter`。该类没有对象属性，内部实现全部为方法逻辑。

#### 4.2.4 执行目标方法

```java
public Mono<HandlerResult> handle(ServerWebExchange exchange, Object handler) {
    HandlerFunction<?> handlerFunction = (HandlerFunction<?>) handler;
    ServerRequest request = exchange.getRequiredAttribute(RouterFunctions.REQUEST_ATTRIBUTE);
    return handlerFunction.handle(request)
            .map(response -> new HandlerResult(handlerFunction, response, HANDLER_FUNCTION_RETURN_TYPE));
}
```

在 `HandlerFunctionAdapter` 中，所有的 Handler 都可以转换为 `HandlerFunction` 类型。

> `RouterFunctions` 类的 route 方法会传入 HandlerFunction 类型的 lambda表达式：

```java
public static <T extends ServerResponse> RouterFunction<T> route(
        RequestPredicate predicate, HandlerFunction<T> handlerFunction) {
    return new DefaultRouterFunction<>(predicate, handlerFunction);
}
```

return 部分的第一步 `handlerFunction.handle(request)` 会直接拿 `handlerFunction` 调 `handle` 方法，这个操作就相当于实际调用 Controller 的方法。`HandlerFunction` 接口的定义：

```java
@FunctionalInterface
public interface HandlerFunction<T extends ServerResponse> {
    Mono<T> handle(ServerRequest request);
}
```

`handle` 方法的实现就是 `DemoHandler` 中编写的方法。由此可以发现，函数式端点的执行更简单：不需要走反射，直接强转就可以调用 Controller/Handler 的目标方法。

#### 4.2.5 返回值处理

`DispatcherHandler` 的最后一步，要对上一步的返回值进行处理，走 `result -> handleResult(exchange, result)` 方法：

```java
private Mono<Void> handleResult(ServerWebExchange exchange, HandlerResult result) {
    return getResultHandler(result).handleResult(exchange, result)
            .onErrorResume(ex -> result.applyExceptionHandler(ex).flatMap(exceptionResult ->
                    getResultHandler(exceptionResult).handleResult(exchange, exceptionResult)));
}
```

调用链的第一步获取 `ResultHandler`，这次获取的类型是 `ServerResponseResultHandler`，它与 `ResponseBodyResultHandler` 是不同的实现。

##### 5.1 ServerResponseResultHandler

来到 `ServerResponseResultHandler` 的 `handleResult` 方法：

```java
public Mono<Void> handleResult(ServerWebExchange exchange, HandlerResult result) {
    ServerResponse response = (ServerResponse) result.getReturnValue();
    Assert.state(response != null, "No ServerResponse");
    return response.writeTo(exchange, new ServerResponse.Context() {
        @Override
        public List<HttpMessageWriter<?>> messageWriters() {
            return messageWriters;
        }
        @Override
        public List<ViewResolver> viewResolvers() {
            return viewResolvers;
        }
    });
}
```

实现并不复杂：直接拿到 `ServerResponse`，直接调 `writeTo` 方法，向响应流中写入数据。至此，请求被成功处理。

#### 4.2.6 小结

1. `RouterFunctionMapping` 用于在函数式端点的映射中寻找对应的目标方法，而且它的优先级高于 `RequestMappingHandlerMapping` 。
2. 函数式端点编程在真正调用目标 Controller/Handler 方法时，相较于传统 WebMvc 方式，不需要走反射，而是直接强转为 `HandlerFunction` 后直接调用目标方法。

## 五、版本差异(旧版 → Spring Boot 3.5.x)

| 特性 | 旧版(Spring Boot 2.x) | Spring Boot 3.5.x |
|------|----------------------|-------------------|
| 响应式支持 | WebFlux（5.x） | 不变；Spring 6 响应式语义稳定 |
| 默认容器 | Netty | 不变（Netty 4.1+）；其事件循环线程模型与虚拟线程无关 |
| 响应式客户端 | WebClient | 不变（响应式场景仍用 WebClient）；同步场景 Spring 6.1 新增 RestClient 替代 RestTemplate |
| 虚拟线程 | 无 | 同步栈（WebMvc）可启用虚拟线程；WebFlux 仍适合高吞吐 I/O 密集场景 |
| 选型 | WebFlux vs MVC | 权衡不变；简单阻塞 I/O 场景可考虑 MVC+虚拟线程 |
| 函数式端点 | RouterFunction | 不变 |
| 背压 | Reactor 背压 | 不变 |
| Netty 调优 | Netty 参数调优 | 不变；Netty 事件循环参数稳定 |
