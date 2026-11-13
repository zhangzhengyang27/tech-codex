---
title: "WebFlux 响应式编程"
description: "从响应式编程核心概念（变化传递、数据流、声明式、背压）到 Reactor 的 Flux/Mono/Scheduler，再到 WebFlux 的注解式与函数式开发及 WebFluxAutoConfiguration 自动装配源码解析。"
keywords: [WebFlux, 响应式编程, Reactor, Flux, Mono, 背压]
category: "Java"
tags: [Java, SpringBoot]
---


# WebFlux 响应式编程

> **版本基准**：本文源自 Spring Boot 2.x 时代的源码剖析（自动配置类写法、`ResourceProperties`、`HttpProperties`、`javax.validation` 等均为 2.x 形态）。Spring Boot 3.x 中装配思路不变，但部分类有调整（如 `ResourceProperties` 并入 `WebProperties`、校验包迁移为 `jakarta.validation`），阅读时注意对照。



## WebFlux响应式编程

### WebFlux：快速了解响应式编程与Reactive

走到这里，读者已经对 SpringFramework 和 SpringBoot 中的核心原理有了比较完整的了解。按照目前的互联网整体开发现状，响应式编程和 WebFlux 的开发越来越多：WebMvc 的使用非常普遍，但面对高并发和高性能的要求，响应式编程的呼声越来越高。而且自从 2014 年 JDK 1.8 发行后，Java 就支持了函数式编程，为响应式编程提供了技术基础。本篇起介绍响应式编程和 WebFlux，并解析 WebFlux 的一些原理，从更深层面理解 WebFlux 与 WebMvc 的异同。

#### 1. 响应式编程引入

WebFlux 的核心技术是响应式编程，而对于这个概念，到目前业界还没有一个完完全全被认可的定义，那既然我们是研究 WebFlux ，那我们去 SpringFramework 的官网来了解一下：

> We touched on “non-blocking” and “functional” but what does reactive mean?The term, “reactive,” refers to programming models that are built around reacting to change — network components reacting to I/O events, UI controllers reacting to mouse events, and others. In that sense, non-blocking is reactive, because, instead of being blocked, we are now in the mode of reacting to notifications as operations complete or data becomes available.There is also another important mechanism that we on the Spring team associate with “reactive” and that is non-blocking back pressure. In synchronous, imperative code, blocking calls serve as a natural form of back pressure that forces the caller to wait. In non-blocking code, it becomes important to control the rate of events so that a fast producer does not overwhelm its destination.Reactive Streams is a small spec (also adopted in Java 9) that defines the interaction between asynchronous components with back pressure. For example a data repository (acting as Publisher) can produce data that an HTTP server (acting as Subscriber) can then write to the response. The main purpose of Reactive Streams is to let the subscriber to control how quickly or how slowly the publisher produces data.上文讲响应式编程是“非阻塞”和“函数式”的，但响应式意味着什么呢？“响应式”这个概念是指围绕对更改做出反应的编程模型-网络组件对I/O事件做出反应，UI控制器对鼠标事件做出反应等。从这个意义上说，响应式是非阻塞的，因为随着操作完成或数据可用，我们现在处于响应通知的模式，而不是被阻塞。Spring团队还有另一个重要机制与“响应式”相关联，这是不阻碍背压的机制。在同步命令式代码中，阻塞调用是强制调用者等待的一种自然的背压形式。在非阻塞代码中，控制事件的速率非常重要，这样事件数据生产方就不会快速地淹没其消费方。Reactive Streams是一个小的规范（在Java 9中也采用了），它定义了带有反压力的异步组件之间的交互。例如，数据存储库（充当发布者）可以生成数据，以便作为HTTP服务器（充当订阅者）将其写入响应中。 Reactive Streams的主要目的是让订阅者控制发布者生成数据的速度。

这段解释有好多陌生的概念，先放置一边——不好理解的内容不必强行灌输，先用几个简单的例子体会一些基础概念。

#### 2. 体会一些基础概念

##### 2.1 异步非阻塞

之前看过一个非常好的解释异步非阻塞的例子，文档加以引用：

你在家里烧水，烧水的壶有两种：没有哨的普通水壶、壶盖上带哨的响水壶。对于烧水的动作，有四种情景：

- 你先用普通水壶烧水，但你不放心什么时候水壶里的水会烧开，于是你就搬个小马扎坐在壶旁边盯着，直到壶冒热气，你知道水开了，拎下来，烧水结束。此谓：**同步阻塞** （人会一直盯着壶，期间不干别的事情，烧水占据了你的注意力和时间，构成同步阻塞）
- 你觉得这种烧水方法太浪费自己时间了，于是下一次烧水的时候你就不搬小马扎坐壶旁边干等着了，而是一边玩手机，玩几分钟就看一眼壶里的水开了没，水没开就继续玩，发现水开了就拎下来。此谓：**同步非阻塞** （人不再一直盯着壶了，但还在惦记着壶，只是不再被壶一直占用着时间，构成同步非阻塞）
- 烧了几次你发现这普通水壶用着太不爽了，于是去市场买了把带哨的，这次好使了，水开了壶会响。于是你屁颠屁颠的拿响水壶烧水，但第一次你也不知道这哨好不好使，就跟第一次一样，搬个小马扎坐在水壶旁边，但你也不干别的，就干等着水烧开。等哨响了，你把水壶拎下来，烧水结束。此谓：**异步阻塞** （你没再惦记水壶，但这期间你没干别的事，相当于还是被烧水这个事情占据了时间，构成异步阻塞）
- 烧完水你突然觉得你跟个二愣子似的，这玩意都带哨了我还等个毛线？于是以后再烧水你直接准备好就跑路玩手机了，也不回去看壶了，水烧开了，哨自然响，你自然就去把水壶拎下来。此谓：**异步非阻塞** （你没再惦记水壶，而且烧水的过程也没再耽误你干别的事，构成异步非阻塞）

##### 2.2 观察者模式

这是最基础的设计模式之一。这里只举几个简单例子，帮助回忆：

- 你要去面试，面试前准备出发时手机推送了天气预报今天有雨，于是你带了伞出门 观察者（监听器）：你 ； 主题（事件源）：天气 ； 事件派发器：手机天气预报
- 面试完成后，面试官会对你说：请留下你的联系方式，有消息我们会通知你的 观察者（监听器）：你 ； 主题（事件源&事件广播器）：面试官
- 面试后你出门叫车回家，由于外头还在下雨，你希望司机快一些来，于是给司机发消息让司机快点，司机告诉你快到的时候会给你打电话的 观察者（监听器）：你 ； 主题（事件源&事件广播器）：司机

##### 2.3 Vue等前端框架的双向绑定

在Vue、React、AngularJS中有一个很基础的概念：双向绑定。下面用一张动图来演示：

这就是响应式！

##### 2.4 【思考】双向绑定中的玄机

仔细思考双向绑定，会产生一种感觉：

1. 上面动图中，文本框上面的 span 部分应该是“观察着”下面的文本框内容，当文本框中内容发生改变时， span 部分就跟着变化。这不也是观察者模式吗？好，这里引出第一个响应式的概念：变化传递。文本框的内容变化引起了 span 部分的变化。
2. 再观察图，有注意到文本框中每发生一次变化，都会引起上面的 span 部分变化！如果把这一系列变化都列出来，会形成一组变化动作的事件记录。好，这里再引出第二个响应式的概念：数据流。事件源的每一个变化连起来就是一个事件流。
3. 这次不看图了，回想一下Vue是怎么做这种双向绑定的：

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

除了这些以外没再写别的代码来绑定关系了！由此可以引出第三个响应式的概念：声明式。我只告诉了你（声明）这个插值表达式里面的内容，以及一个 input 中的 model ，它就能帮我关联起来。

##### 2.5 小总结

由上面的体会，总结一下响应式的关键点：**变化传递、数据流、声明式**。其中有一个很关键的核心围绕着响应式编程：**事件**。事件是观察者模式的核心，响应式编程也是观察者模式，自然也要依赖事件。

#### 3. 体会一些响应式的新概念

##### 3.1 响应式流

前面总结出了数据流的概念，响应式编程中的数据流有些讲究，它与 Java 8 中熟悉的 Stream 有些不一样：普通的 Stream 还是同步阻塞的，对于高并发场景下还是不能解决问题，而**响应式流可以做到异步非阻塞**。另外，Stream 的一个特性是一旦有了消费型方法，它就会将这个流中的所有方法处理完毕，如果这期间的数据量很大，Stream 是无法对这些庞大数据量有一个妥善的处理，而响应式流可以对这些数据进行**流量控制**，保证数据的接收速度在处理能力之内。

所以总结下来，响应式流的关键点：**异步非阻塞、数据流速控制**。

##### 3.2 背压

异步非阻塞的概念前面已经体会过了，下面通过一个模拟情景来体会数据流速控制的策略：**背压**。

- 你在一个知名手机生产大厂中，你的职位是生产流水线上的一名普通工人，你的工作是负责流水线上的一个关键部分，这部分需要的时间比较多，而恰好这段时间跟你一起干活的伙计都陪老婆生孩子去了，剩下你单枪匹马仍然战斗在一线。
- 但是你的上游工人似乎并不知道跟你一起干活的伙计都陪老婆生孩子了，而且不知道咋回事他们天天跟打了鸡血似的干劲十足，搞得你这边压了好多上游同事给你的件儿，但你的这部分工序耗时长，积压这么多件你也hold不住，于是忍无可忍的你向你的上游同事发飙了：**你们慢点，我处理不过来了**！你的上游同事听到了你的怒吼，于是他们**处理好的件儿就先不给你了，暂时放在他们自己那儿**，等你告诉他你这边的处理差不多了，他们再塞件儿给你。
- 后来过了一段时间，厂子的工头发现你的成绩非常好，于是阴差阳错你就不干流水线的工作了，转行当经销商来卖这个手机了。这你开心啊，于是经销商定期给你发一批一批的手机，你就拿来售卖。
- 但很不幸，这批手机在售卖后的一段时间后传出电池爆炸的坏新闻，市面上买这款手机的人急剧下降，你作为经销商自然也就不想卖这款手机了，于是你会跟厂商反映：**别给我供这款手机的货了**。厂商也非常无奈，这边生产线还正在运作，而且也有产出的成品机，但经销商都不要了，于是只好**将这部分成品都废弃掉**。

体会这个情景中的两个关键部分：**下游向上游反馈，上游将数据暂时缓存/直接废弃**。

上面聊的都是概念，下面用一些简单的 Demo 来体会真正的响应式编程是什么样子。

#### 4. 快速体会Reactor

之所以选择 **Reactor** 作为响应式编程的框架支撑，是因为 WebFlux 的底层库就是 **Reactor** 。

直接导入 `spring-boot-starter-webflux` 依赖，**Reactor** 会一起引入进来。

上面已经看到，响应式编程是一种观察者模式，自然有发布者（事件源）和接收者（监听器）。在 Reactor 中，发布者和接收者对应的接口分别是 `Publisher` 和 `Subscriber` 。

下面先快速体会一个最简单的发布-订阅的实现：

```java
public class QuickDemo {
    public static void main(String[] args) {
        Flux<Integer> flux = Flux.just(1, 2, 3);
        flux.subscribe(System.out::println);
    }
}
```

代码非常的简单，首先创建了一个 `Publisher` ，这里为了编码方便，我选用 Reactor 中的实现类 `Flux` 作为发布者，接收者的类型是 `Consumer` ，故可以传入Lambda表达式或者方法引用。这其中，发布者与订阅者建立订阅关系（消费关系）的时机是 `Publisher` 的 `subscribe` 方法。一旦触发 `subscribe` 方法，接收者就可以向发布者拉取数据，等拉取到的数据处理完成后再继续拉取，直到发布者的数据全部处理完成，或者出现异常终止。

这里面简单介绍下这里面会涉及到的几个核心概念和组件：

##### 4.1 Reactive中的核心概念

###### 4.1.1 Publisher

`Publisher` 作为数据发布者，它只有一个方法：`subscribe` 。

```java
public void subscribe(Subscriber<? super T> s);
```

它会接收一个 `Subscriber` ，构成“订阅”关系。看一眼它的文档注释：

> Request Publisher to start streaming data. This is a "factory method" and can be called multiple times, each time starting a new Subscription. Each Subscription will work for only a single Subscriber. A Subscriber should only subscribe once to a single Publisher. If the Publisher rejects the subscription attempt or otherwise fails it will signal the error via Subscriber.onError.请求发布者开始流式传输数据。 这是一种“工厂方法”，可以多次调用，每次启动一个新的订阅。 每个订阅仅适用于单个订阅者。 订阅者只能订阅一个发布者。 如果发布者拒绝订阅，或以其他方式失败，它将通过 Subscriber.onError 指示错误。

文档注释已经解释的比较清楚了，它可以产生多个订阅，一个订阅归属一个发布者和一个接收者。

###### 4.1.2 Subscriber

`Subscriber` 作为数据接收者，它的接口方法有4个：

```java
public void onSubscribe(Subscription s);

public void onNext(T t);

public void onError(Throwable t);

public void onComplete();
```

方法前面都带有 **on** ，代表它属于事件形式（联想 JavaScript 中的 onclick 等）。那上面的四个方法就可以分别解释：

- onSubscribe：当触发订阅时
- onNext：当接收到下一个数据时
- onComplete：当发布者的数据都接收处理完成时
- onError：当出现异常时

###### 4.1.3 Subscription

`Subscription` 可以看做一个订阅“关系”，它归属于一个发布者和一个接收者（可以类似的理解为关系型数据库的多对多中间表的一条数据）。它有两个方法：

```java
public void request(long n);

public void cancel();
```

很明显上面是请求/拉取数据，下面是放弃/停止拉取，它完成了数据接收者对发布者的交互，背压也是基于此来实现。

###### 4.1.4 Processor

`Processor` 字面意思可以翻译为处理器，前面在 IoC 容器中也看到过很多后置处理器。这些处理器的特点都是**有输入，有输出**，对应到 Reactor 的概念中，就是发布者和接收者的合体：

```java
public interface Processor<T, R> extends Subscriber<T>, Publisher<R>
```

在接口定义中它就是直接继承了 `Publisher` 和 `Subscriber` 接口，它一般用于数据的中间处理。

##### 4.2 Reactor中常用组件

###### 4.2.1 Flux

`Flux` 可以简单理解为**“非阻塞的Stream”**，它实现了 `Publisher` 接口：

```java
public abstract class Flux<T> implements Publisher<T>
```

那既然它是发布者，那它必然少不了 `subscribe` 方法。`Flux` 和下面的 `Mono` 的 `subscribe` 方法重载有很多：

这里面要注意的是，它在实现 `Publisher` 原生的 `subscribe` 方法时，还扩展了几个方法，以简化操作。比如上面快速体会中的简单示例，就使用了只传入一个数据消费 `Consumer` 的重载（只处理正常情况下的数据接收）。

之所以称它可以理解为 `Stream` ，是因为它拥有 `Stream` 中的中间操作，并且更多更全面，举几个例子吧：

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

更具体的方法使用可参照 API 文档或网络资料进行了解和练习。

###### 4.2.2 Mono

`Mono` 可以简单理解为**“非阻塞的Optional”**，它也实现了 `Publisher` 接口：

```java
public abstract class Mono<T> implements Publisher<T>
```

它跟 Optional 类似，都是里面要么有一个对象，要么是空的。它的操作与 Flux 相似，不再赘述。

###### 4.2.3 Scheduler

`Scheduler` 可以简单理解为**“线程池”**，从上面的示例中可以看到线程池需要由 `Schedulers` 工具类产生（`Scheduler` 的实现类并非 public，需通过 `Schedulers` 的工厂方法获取）。它有几种类型：

- immediate：直接在当前线程执行（不发生线程切换）
- single：只有一个线程的线程池（可类比 `Executors.newSingleThreadExecutor()`）
- elastic：弹性线程池，线程池中的线程数量原则上没有上限（底层创建线程池时指定了最大容量为 `Integer.MAX_VALUE`）——已废弃并于 Reactor 3.5 移除，见上文 `boundedElastic()` 说明
- parallel：并行线程池，线程池中的线程数量默认等于CPU处理器的数量（jdk中的 `Runtime` 类可以调用 `availableProcessors` 方法来获取CPU处理器数量）

#### 小结

1. 响应式编程的三个关键点：**变化传递、数据流、声明式**。
2. 响应式编程不同于观察者模式的关键点在于：接收者（监听器）可以反向与发布者（事件源）交互。
3. Reactor 是实现 Reactive 编程规范的框架，核心组件包括 `Flux` 、`Mono` 、`Scheduler` 。

本节快速了解了响应式编程与 Reactor 框架的核心点，接下来体会 WebFlux 的开发，为后面解析 WebFlux 源码做准备。

### WebFlux：快速使用WebFlux

前面快速了解了响应式编程与 Reactor 框架的基本使用，接下来正式接触 WebFlux。

自打 SpringFramework 5 发行后，之前的 **SpringMVC** 被改名为 **SpringWebMvc**，因为它多了一个兄弟叫 **SpringWebFlux**。而且 Spring 的开发者们为了降低新技术的门槛，让 WebFlux 可以完美使用 WebMvc 的开发风格。下面先实战使用 WebFlux 框架，但仍用 WebMvc 的开发风格。

#### 1. WebFlux环境下用WebMvc风格

导入的依赖还是上面提到的 `spring-boot-starter-webflux`，没有引入 WebMvc 模块。直接运行主启动类，观察控制台的输出：

```text
1970-01-01 10:00:00.000  INFO 10224 --- [           main] com.example.demo.DemoApplication         : Starting DemoApplication on DESKTOP with PID 10224 (D:\IDEA\spring-boot-demo\target\classes started by LinkedBear in D:\IDEA\spring-boot-demo)
1970-01-01 10:00:00.000  INFO 10224 --- [           main] com.example.demo.DemoApplication         : No active profile set, falling back to default profiles: default
1970-01-01 10:00:00.000  INFO 10224 --- [           main] o.s.b.web.embedded.netty.NettyWebServer  : Netty started on port(s): 8080
1970-01-01 10:00:00.000  INFO 10224 --- [           main] com.example.demo.DemoApplication         : Started DemoApplication in 1.941 seconds (JVM running for 4.619)
```

注意看应用启动在 **Netty** 上而不是 Tomcat 了！因为 Netty 更适合做响应式编程的应用服务器。

接下来，跟之前开发 WebMvc 应用一样，编写一个 `DemoController`：

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

#### 2. 逐步过渡到WebFlux

上面已经看到，Reactor 中核心数据的封装是 `Flux` 和 `Mono`。下面改造上面的 `DemoController`，用上这两个组件：

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

如果只返回一个对象，则使用 `Mono` 替换，返回列表则使用 `Flux` 替换。

但这样写的话，只是替换了返回值类型，注解还是原来 **WebMvc** 中的，SpringWebFlux 有自己的专门一套开发 `Controller` 层的API，那就是函数式开发。

#### 3. WebFlux的函数式开发

在切换完全不同的开发风格之前，先大概想一下之前的 WebMvc 部分，关键点都有哪些：

- Controller 类上要打 `@Controller` 或者 `@RestController` 注解
- url映射的方法要在方法上打 `@RequestMapping` 注解或者它的扩展注解

前面分析 WebMvc 的原理时也知道，这些 `Controller` 中的方法最终都会封装为一个一个的 **`Handler`**，每个 `Handler` 都有自己匹配的 **url**。

由此，WebFlux 的函数式开发的核心点就转换为两种关键组件：**`HandlerFunction`** 和 **`RouterFunction`** 。

##### 3.1 DemoController转换为DemoHandler

先将 WebMvc 中的 `DemoController` 转换为 WebFlux 中的 `DemoHandler`：

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

可以发现，现在的 `DemoHandler` 已经变成了一个普通类，没有继承也没有实现，除了 `@Component` 注解外没有任何注解，IOC容器也不知道它到底是什么功能的Bean，也不知道这些方法是不是要转换为实际处理客户端请求的 `Handler` 。

##### 3.2 新编写RouterConfiguration

因为上面的 `DemoHandler` 已经没有了 url 映射的功能，需要手动声明路由规则。下面编写一个 `RouterConfiguration` 来配置路由规则（注意这是一个配置类）：

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

可以发现这部分的映射是手动声明的。当然这部分代码可能比较难看懂，因为在上面静态导入了 `RequestPredicates` 中的所有静态属性和方法。

大概看一眼编写思路：它需要注入前面编写的 `DemoHandler` ，下面注册一些 `RouterFunction` 类型的Bean，注册的过程中需要引用 `DemoHandler` 中的方法，以及配置请求类型、uri、响应类型。

至此，最简单的 WebFlux 使用Demo演示完毕。

#### 4. WebMvc与WebFlux的对比

写到这里，先不急着走原理，停下来思考一下：WebMvc 和 WebFlux 有哪些相同，又有哪些不同？

官方文档中有一张图我觉得不错，这里引用一下吧：

[https://docs.spring.io/spring/docs/5.1.10.RELEASE/spring-framework-reference/web-reactive.html#webflux-framework-choice](https://docs.spring.io/spring/docs/5.1.10.RELEASE/spring-framework-reference/web-reactive.html#webflux-framework-choice)

这张图很直观的展示出了 WebMvc 和 WebFlux 的兼容功能点，以及各自领域目前特有的功能点。

- SpringWebMvc 基于原生 Servlet，所以它是命令式编程，编写相对熟悉，而且很方便调试；Servlet 可以是阻塞的，它更适合跟传统的关系型数据库等阻塞IO的组件进行交互。
- SpringWebFlux 基于 Reactor，它是异步非阻塞的，它使用函数式编程，相较于命令式编程和声明式映射更灵活，而且它可以运行在 Netty 上，当然它也可以运行在 Tomcat 、Jetty 、Undertow 等基于 Servlet3.1 规范及以上的Web容器中。
- SpringWebMvc 和 SpringWebFlux 都可以使用声明式注解编程来配置控制器和映射路径。

社区中还有一张对比图，描述的差不多也是这个意思。

了解 WebFlux 的使用之后，下面开始解析 WebFlux 中的原理，通过源码分析和原理解读，从更深层面对比 WebMvc 与 WebFlux。

### WebFlux：WebFlux的自动装配

根据前面的经验，使用 WebFlux 时主启动类相比于 WebMvc 没有任何区别，那么只有自动配置类可以控制 WebFlux 的装配。装配的自动配置类不难猜想应该是：`WebFluxAutoConfiguration`。

#### 1. WebFluxAutoConfiguration

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

可以发现它跟 WebMvcAutoConfiguration 几乎没什么太大的区别：

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

只不过判断条件不太一样而已，WebFlux 需要判断的应用类型为 **REACTIVE** ，而 WebMvc 为 **SERVLET** ；WebFlux 需要判断classpath下是否有 `WebFluxConfigurer` 类，而 WebMvc 需要的是 `Servlet` 、`DispatcherServlet` 、`WebMvcConfigurer` 三个类。

根据之前读 WebMvc 的自动配置，肯定要先走进 `ReactiveWebServerFactoryAutoConfiguration` ，看一眼嵌入式容器的配置。

#### 2. ReactiveWebServerFactoryAutoConfiguration

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

果不其然，它会导入嵌入式容器工厂的配置类。由于在默认情况下，导入 `spring-boot-starter-webflux` ，默认使用 **Netty** 作为嵌入式容器，故此处 `EmbeddedNetty` 生效，生效的原因与之前 WebMvc 原理一致，不再赘述。

看一眼 `EmbeddedNetty` 都干了什么：

##### 2.1 EmbeddedNetty

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

很明显它创建了一个 `ReactorResourceFactory` ，一个 `NettyReactiveWebServerFactory` 。`NettyReactiveWebServerFactory` 从命名上看就知道它应该是类比于 WebMvc 中的 `TomcatServletWebServerFactory` ，那 `ReactorResourceFactory` 是什么呢？

##### 2.2 ReactorResourceFactory

它的文档注释原文翻译：

> Factory to manage Reactor Netty resources, i.e. LoopResources for event loop threads, and ConnectionProvider for the connection pool, within the lifecycle of a Spring ApplicationContext. This factory implements InitializingBean and DisposableBean and is expected typically to be declared as a Spring-managed bean.在Spring ApplicationContext 的生命周期内，用于管理Reactor Netty资源的工厂，即用于事件循环线程的 LoopResources 和用于连接池的 ConnectionProvider 。该工厂实现 InitializingBean 和 DisposableBean，通常应将其声明为Spring管理的Bean。

划重点：**管理Reactor Netty资源的工厂**，这个说法怎么感觉跟线程池似的？而且后面还有循环、连接池的概念，难不成它就类比于jdbc中的 `DataSource`？往里看它的成员：

```java
public class ReactorResourceFactory implements InitializingBean, DisposableBean {
	private boolean useGlobalResources = true;
	private Consumer<HttpResources> globalResourcesConsumer;
	private Supplier<ConnectionProvider> connectionProviderSupplier = () -> ConnectionProvider.elastic("webflux");
	private Supplier<LoopResources> loopResourcesSupplier = () -> LoopResources.create("webflux-http");
    // ......
```

注意第三个属性：`connectionProviderSupplier` ，它的创建方式是 `ConnectionProvider.elastic` ，突然感觉眼熟：前面看调度器的时候，对于 Reactor 的线程池就有一种 **elastic** 类型的！莫非它确实就是管理 `ConnectionProvider` 的？点开 ConnectionProvider 的 elastic 方法：

```java
static ConnectionProvider elastic(String name) {
    return new PooledConnectionProvider(name,
            (bootstrap, handler, checker) -> new SimpleChannelPool(bootstrap,
                    handler, checker, true, false));
```

果然它是一个连接的提供者，而且它还是 **Pool**——可以简单理解为 **Reactor Netty 的连接池**。

实际 Debug 了一下，发现与推测基本贴合：`ConnectionProvider` 底层确实是一个连接池，而且能看到 Netty 事件循环的 **selector** 与 **worker** 线程组的概念，这就是 Netty 的核心（worker 线程数默认与 CPU 核心数相关）。

`ReactiveWebServerFactoryAutoConfiguration` 看完之后，回到 `WebFluxAutoConfiguration`。作为对比，先看一眼 `WebMvcAutoConfiguration` 的装配顺序声明：

```java
@AutoConfigureAfter({ DispatcherServletAutoConfiguration.class, CodecsAutoConfiguration.class,
		ValidationAutoConfiguration.class })
public class WebMvcAutoConfiguration
```

而 `WebFluxAutoConfiguration` 除了要先处理 `ValidationAutoConfiguration` 的**JSR-303**校验之外，还要先处理一个 `CodecsAutoConfiguration`（见 1 节源码中它的 `@AutoConfigureAfter`）：

#### 3. CodecsAutoConfiguration

可以发现这里面只是注册了一个 json 转换器，以及日志工具。源码很简单，不过多解析。

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

接下来才是最核心的 `WebFluxAutoConfiguration` 。源码中它定义了三个内部类，逐个来看：

#### 4. WebFluxConfig

```java
@Configuration
@EnableConfigurationProperties({ ResourceProperties.class, WebFluxProperties.class })
@Import({ EnableWebFluxConfiguration.class })
public static class WebFluxConfig implements WebFluxConfigurer
```

可以看到它又导入了一个 `EnableWebFluxConfiguration` ，也就是下面第 5 节的 `EnableWebFluxConfiguration`。从上往下逐个看，先看 `WebFluxConfig` 中的配置：

##### 4.1 静态资源映射

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

可以发现它处理的逻辑几乎跟 WebMvc 部分一致！也是处理 webjars 的资源，以及 ResourceProperties 中的静态路径，默认情况下：

```java
public class ResourceProperties {
	private static final String[] CLASSPATH_RESOURCE_LOCATIONS = { "classpath:/META-INF/resources/",
			"classpath:/resources/", "classpath:/static/", "classpath:/public/" };
	private String[] staticLocations = CLASSPATH_RESOURCE_LOCATIONS;
```

发现也是跟 WebMvc 部分一样的路径。

##### 4.2 ViewResolver

```java
public void configureViewResolvers(ViewResolverRegistry registry) {
    this.viewResolvers.orderedStream().forEach(registry::viewResolver);
}
```

可以发现这部分是配置 `ViewResolver` 的，不过默认情况下Debug发现并没有进入 `configureViewResolvers` 方法中，暂且略过。

##### 4.3 Converter和Formatter

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

这部分在 WebMvc 部分也是一模一样的，直接copy过来的！（不过这部分不是特别关键，之前也没有单独拿出来聊，知道这里是配置转换器的即可）

大概来看 `WebFluxConfig` 主要就配置了这几个组件，继续往下看：

#### 5. EnableWebFluxConfiguration

先看一眼继承：

```java
@Configuration
public static class EnableWebFluxConfiguration extends DelegatingWebFluxConfiguration
```

它继承了 `DelegatingWebFluxConfiguration` ，这个套路貌似跟 WebMvc 部分也是一样的！

```java
@Configuration
public static class EnableWebMvcConfiguration extends DelegatingWebMvcConfiguration implements ResourceLoaderAware
```

至于这些 `Delegating***Configuration` 的作用前面也提到过：它就是 `@EnableWebMvc` 或者 `@EnableWebFlux` 注解导入的配置类：

```java
@Import(DelegatingWebFluxConfiguration.class)
public @interface EnableWebFlux
```

它的作用是：只要在 SpringBoot 中标注了这样的注解，SpringBoot 默认的自动配置类就不生效，改由开发者自己接管配置 WebMvc 或 WebFlux。

下面来看它里面配置的组件：

##### 5.1 FormattingConversionService

```java
@Bean
public FormattingConversionService webFluxConversionService() {
    WebConversionService conversionService = new WebConversionService(this.webFluxProperties.getDateFormat());
    addFormatters(conversionService);
    return conversionService;
}
```

看这个类的名，大概也能联想到之前看 WebMvc 部分的那个参数类型转换器吧！而且代码几乎也一模一样。

##### 5.2 Validator

```java
@Bean
public Validator webFluxValidator() {
    if (!ClassUtils.isPresent("javax.validation.Validator", getClass().getClassLoader())) {
        return super.webFluxValidator();
    }
    return ValidatorAdapter.get(getApplicationContext(), getValidator());
}
```

很明显它是配置 **JSR-303** 参数校验的校验器。

##### 5.3 HandlerMapping和HandlerAdapter

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

这不是前面在 WebMvc 部分常聊的两个配合 `DispatcherServlet` 的核心组件吗？对的，它在 WebFlux 中也是一样的效果。

#### 6. WebFluxConfigurationSupport

上面注意到 `EnableWebFluxConfiguration` 继承了 `DelegatingWebFluxConfiguration`，而它又继承了 `WebFluxConfigurationSupport`，这个配置类中还注册了一些组件：

##### 6.1 DispatcherHandler

```java
@Bean
public DispatcherHandler webHandler() {
    return new DispatcherHandler();
}
```

发现了 WebFlux 的核心前端控制器：**`DispatcherHandler`** ，它在这里注册了，而且比 `DispatcherServlet` 简单的多。

##### 6.2 WebExceptionHandler

```java
@Bean
@Order(0)
public WebExceptionHandler responseStatusExceptionHandler() {
    return new WebFluxResponseStatusExceptionHandler();
}
```

WebFlux 的异常状态响应处理器，见名知意，不再深扒。

##### 6.3 RequestMappingHandlerMapping

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

可以发现这里真正创建了 `RequestMappingHandlerMapping` 组件。

##### 6.4 RouterFunctionMapping

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

与 `RequestMappingHandlerMapping` 区别开来，它是**函数式端点路由编程的Mapping处理器**。至于它的作用，到本篇 6.4 节再聊。

##### 6.5 SimpleUrlHandlerMapping

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

注意看源码中第一个if结构下面，它用了一个 `ResourceHandlerRegistry` ，似曾相识——前面看静态资源映射的时候见过它，它是**处理静态资源的映射**的。通常项目中会有一些静态资源，只要存在静态资源，它就会创建一个 `SimpleUrlHandlerMapping` 来真正处理静态资源的路径映射。通过Debug，发现确实存在（因为有应用图标 `favicon.ico`）：

##### 6.6 RequestMappingHandlerAdapter

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

这里真正创建了 `RequestMappingHandlerAdapter` 。

##### 6.7 LocaleContextResolver

```java
@Bean
public LocaleContextResolver localeContextResolver() {
    return createLocaleContextResolver();
}
```

这个 `LocaleContextResolver` 组件从类名上就可以看出来它是与国际化相关的组件。

##### 6.8 ReactiveAdapterRegistry

```java
@Bean
public ReactiveAdapterRegistry webFluxAdapterRegistry() {
    return new ReactiveAdapterRegistry();
}
```

这个 `ReactiveAdapterRegistry` 类看上去应该是处理 **Reactive** 类型的，看一眼它的文档注释：

> A registry of adapters to adapt Reactive Streams Publisher to/from various async/reactive types such as CompletableFuture, RxJava Observable, and others. By default, depending on classpath availability, adapters are registered for Reactor, RxJava 1, RxJava 2 types, CompletableFuture, and Java 9+ Flow.Publisher.适配器注册表，用于使Reactive Streams Publisher适应各种异步/反应类型，例如CompletableFuture，RxJava Observable等。 默认情况下，根据类路径的可用性，为Reactor，RxJava 1，RxJava 2类型，CompletableFuture和Java 9+ Flow.Publisher注册适配器。

果然，它可以处理多种 **Reactive Stream** 的发布器，它提到了 Reactor 、RxJava 、jdk9版本的 `Flow` 等。

##### 6.9 一组ResultHandler

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

WebFlux 提供了4种 `ResultHandler` ，每种功能已标注在源码中。

#### 7. ResourceChainCustomizerConfiguration

在最底下还有一个，不过它的配置很简单：

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

发现它有一个 `@ConditionalOnEnabledResourceChain` 注解，它的作用与一个 `application.properties` 配置有关：`spring.resources.chain.strategy.fixed.enabled` ，如果它配置为true，这个条件才生效，默认不生效，不再深究。

#### 小结

1. `WebFluxAutoConfiguration` 的配置整体与 `WebMvcAutoConfiguration` 非常相似，其中不乏包括几个核心组件。
2. `WebFluxAutoConfiguration` 默认配置的Web容器是Netty而非 Tomcat 等传统 Servlet 容器。
3. 大部分比较熟悉的组件都在 `DelegatingWebFluxConfiguration` 的父类 `WebFluxConfigurationSupport` 中注册。

## WebFlux 工作原理：DispatcherHandler 源码走读

### WebFlux：DispatcherHandler的工作原理-传统方式

前面已经看到并示例过：WebFlux 可以完美兼容 WebMvc 的开发风格。由此可以推测，WebFlux 中的核心前端控制器 `DispatcherHandler` 在这部分的处理上应该与 `DispatcherServlet` 相差不大。带着这个猜测，以 Debug 的方式观察处理逻辑走向：

#### 1. DispatcherHandler#handle

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

这里很惊讶的发现它的源码非常少，相比较 `DispatcherServlet` 的代码数量，少的不是一个数量级！

注意它传入的参数是一个 `ServerWebExchange` ，联想 `DispatcherServlet` 中传入的是 `HttpServletRequest` 和 `HttpServletResponse` ，猜想它应该是类似于这两个类的合体：

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

果然从这个接口的方法中发现了 **Request** 和 **Response** 的概念，证明猜想正确。

回到 `handle` 方法，通过Debug进来，首先要判断现有的 `HandlerMapping` ，当前测试的Demo工程中我分别写了基于注解的映射，和基于函数式端点的映射。Debug下发现有3个 `HandlerMapping` （注解映射、函数式端点映射与静态资源映射）。

之后的return结构中是一连串链式调用，这也体现出了函数式编程和响应式编程的一个弊端：Debug真的困难。我在最开始Debug找线索时，真是费了不少功夫，才慢慢找到这些端倪。

这段调用可读性挺高，参考前面 `DispatcherServlet` 的工作原理，大概分析一下其中的三个步骤：

#### 2. 选定HandlerMapping

不难看出，选定 `HandlerMapping` 的步骤是这几步：

```java
    return Flux.fromIterable(this.handlerMappings)
            .concatMap(mapping -> mapping.getHandler(exchange))
            .next()
```

首先进入 `fromIterable` 方法：

##### 2.1 Flux#fromIterable

```java
public static <T> Flux<T> fromIterable(Iterable<? extends T> it) {
    return onAssembly(new FluxIterable<>(it));
}
```

它将这一组 `HandlerMapping` 转换成了一组 `FluxIterable` ，之后传入了 `onAssembly` 方法中。

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

方法的名称可以理解为 “触发了装载、扩展动作”，这个方法的文档注释：

> To be used by custom operators: invokes assembly Hooks pointcut given a Flux, potentially returning a new Flux. This is for example useful to activate cross-cutting concerns at assembly time, eg. a generalized checkpoint().由自定义运算符使用：给定Flux调用程序集Hooks切入点，并有可能返回新的Flux。这对于在装配时激活横切关注点很有用，比方说泛型checkpoint()。

文档注释中的几个关键词已经足以给我们提供思路了：切入点、装配、横切。是不是想到了AOP？其实这个方法的作用有点类似AOP，不过我个人感觉它应该更符合装饰者模式。通过Debug，发现它只是包装为一个 `FluxIterable` 对象，不过这就是装载、扩展的体现：将可迭代的集合装载为一个 Flux 流。

##### 2.3 concatMap(mapping -> mapping.getHandler(exchange))

上面将那一组 `HandlerMapping` 转换为 Flux后，接下来要从这组 `HandlerMapping` 中找出能处理当前请求的 `HandlerMapping` 了：

来到 `AbstractHandlerMapping#getHandler` ：

```java
public Mono<Object> getHandler(ServerWebExchange exchange) {
    return getHandlerInternal(exchange).map(handler -> {
        // ......
    });
}
```

这个方法分为两部分：先执行 `getHandlerInternal` 获取可以处理当前请求的 `HandlerMapping` ，再执行 `map` 方法进行后处理。

###### 2.3.1 getHandlerInternal

对于传统的 `@RequestMapping` 方式标注的 “Handler”，会进入 `AbstractHandlerMethodMapping#getHandlerInternal` 方法（又跟 WebMvc 非常相似）：

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

对比第 25 篇《WebMvc 请求处理流程源码》中 `DispatcherServlet` 的对应处理，发现 `DispatcherServlet` 中的方法更短，但相比较而言 WebFlux 中处理的更严谨（有异常处理的考虑），而WebMvc 中只是简单地把异常抛出去了而已。如果不看这些细枝末节，会发现思路完全一致：先搜索所有 “HandlerMethod”，后封装为一个单独的 `HandlerMethod` 类型的Bean。

方法内部的实现与 WebMvc 部分思路几乎完全一致，不再深扒。这里看一眼扫描到的匹配请求的 `HandlerMethod`：Debug 中已经找到了示例的 `DemoController`。

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

可以看出来它有对跨域的处理。由于本例是最简单的测试，不会触发跨域处理，直接把封装好的 `Mono<HandlerMethod>` 返回了。

返回回去后，回到 `DispatcherHandler` 的 `handle` 方法，要寻找这个 `HandlerMethod` 对应的 `HandlerAdapter` 了：

#### 3. 寻找HandlerAdapter

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

由于是 WebMvc 开发风格的处理，返回的 `HandlerMethod` 也是 `DemoController` 里的，默认情况下有3个 HandlerAdapter 。不用想，肯定走 `RequestMappingHandlerAdapter` ，通过Debug发现确实如此，之后直接调了它的 `handle` 方法了！

#### 4. 【目标方法】HandlerAdapter#handle

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

这里面先是对 `HandlerMethod` 进行一些处理，以及异常处理器的处理，最后的链式调用中第三行有一个 `invocableMethod.invoke` ，它就会去引导调用真正的 Controller 方法。根据上面源码的注释标注逐个来看：

##### 4.1 InitBinderBindingContext

这个类非常有意思，它在 SpringFramework 的官方API中根本没有收录进去，而且也找不到任何相关的资料，只能靠源码的部分来大概看一眼它：

```java
/** Extends BindingContext with @InitBinder method initialization. */
class InitBinderBindingContext extends BindingContext
```

它的文档注释中提到了 `@InitBinder` 注解，这个注解在 WebMvc 部分见过，是做参数绑定的。另外它继承自 `BindingContext`，从类名可以推测 `BindingContext` 是配合 `@InitBinder` 做参数绑定相关工作的。看一眼它的文档注释：

> Context to assist with binding request data onto Objects and provide access to a shared Model with controller-specific attributes. Provides methods to create a WebExchangeDataBinder for a specific target, command Object to apply data binding and validation to, or without a target Object for simple type conversion from request values. Container for the default model for the request.用于帮助将请求数据绑定到对象的上下文，并提供对具有控制器特定属性的共享模型的访问。提供用于为特定目标创建 WebExchangeDataBinder 的方法，提供对目标对象应用数据绑定和验证的命令Object（或不具有目标对象的命令Object）以从请求值进行简单类型转换的方法。请求的默认模型的容器。

文档注释倒是可以比较明确的看出，它确实是跟参数绑定相关的组件。

##### 4.2 InvocableHandlerMethod

这个组件在 WebMvc 部分也见过，作用是调用 `HandlerMapping` 中真正封装的 Controller 方法。注意它跟 WebMvc 部分的 `ServletInvocableHandlerMethod` 应该是继承关系，只不过 WebFlux 中的 `InvocableHandlerMethod` 在 reactive 包下，而不是 mvc 包。其余部分几乎完全相同，可与 [36-DispatcherServlet源码](36-DispatcherServlet源码.md) 中 `DispatcherServlet` 工作原理对照翻看，此处不再赘述。

##### 4.3 执行目标方法，处理返回值和异常

```java
return this.modelInitializer
        .initModel(handlerMethod, bindingContext, exchange)
        .then(Mono.defer(() -> invocableMethod.invoke(exchange, bindingContext)))
        .doOnNext(result -> result.setExceptionHandler(exceptionHandler))
        .doOnNext(result -> bindingContext.saveModel())
        .onErrorResume(exceptionHandler);
```

注意这里面最重要的动作就是 `invocableMethod.invoke(exchange, bindingContext)` ，来看它的实现，进入到 `InvocableHandlerMethod` 中：

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

它直接就 return 了，里面又是流式调用，lambda 表达式中有一部分很眼熟：try 块中的 `value = getBridgedMethod().invoke(getBean(), args);` ，把 WebMvc 中的调用方式拿出来对比一下：

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

竟然是一模一样的！是不是产生了一种感觉：WebFlux 不会基本上都是抄的 WebMvc 吧。（然而事实还真是）

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

上面处理响应状态后，下面要处理返回值了：

###### 4.3.2 处理返回值

由于示例在 `DemoController` 中声明的返回值类型是 `Mono<String>`，这里的 value 也就是 `Mono<String>` 类型。通过Debug，发现它的类型和对应的 `ReactiveAdapter` 也都获取到了。

补充一点：`ReactiveAdapter` 是通过 `ReactiveAdapterRegistry` 组件获取而来的，用它来实际兼容 RxJava 等其他响应式编程框架。

最后，它会将返回值封装为一个 `HandlerResult` 对象，返回出去。

#### 5. 最后的返回值处理

回到 `DispatcherHandler` 中：

```java
return Flux.fromIterable(this.handlerMappings)
        .concatMap(mapping -> mapping.getHandler(exchange))
        .next()
        .switchIfEmpty(createNotFoundError())
        .flatMap(handler -> invokeHandler(exchange, handler))
        .flatMap(result -> handleResult(exchange, result));
```

上一步执行完成的是 `handler -> invokeHandler` ，下面还要再处理上一步的返回值：

```java
private Mono<Void> handleResult(ServerWebExchange exchange, HandlerResult result) {
    return getResultHandler(result).handleResult(exchange, result)
            .onErrorResume(ex -> result.applyExceptionHandler(ex).flatMap(exceptionResult ->
                    getResultHandler(exceptionResult).handleResult(exchange, exceptionResult)));
}
```

又是一个调用链，它先根据上一步的返回值，获取到 `ResultHandler` ，之后处理一下，返回。

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

它的搜索方法还是循环所有的 `HandlerResultHandler` ，而默认情况下一共有4个 `HandlerResultHandler` （分别处理 ResponseEntity、@ResponseBody、视图渲染与 ServerResponse，见第 27 篇自动装配一节的源码）。

很容易判断，通过 `@RestController` 出来的方法，都会走 `ResponseBodyResultHandler` ：

##### 5.2 ResponseBodyResultHandler#handleResult

```java
public Mono<Void> handleResult(ServerWebExchange exchange, HandlerResult result) {
    Object body = result.getReturnValue();
    MethodParameter bodyTypeParameter = result.getReturnTypeSource();
    return writeBody(body, bodyTypeParameter, exchange);
}
```

在这里它会将返回值拿到，之后执行 `writeBody` 方法将返回值结果写到响应流中，处理结束。

`handleResult` 方法执行完毕后，回到 `DispatcherHandler` 中，链式调用的链也执行完毕了，整个请求处理结束。

#### 小结

1. `DispatcherHandler` 与 `DispatcherServlet` 的处理思路几乎完全相同，包括寻找 `HandlerMapping` 、`HandlerAdapter` 、执行目标方法等。
2. `DispatcherHandler` 相比较 `DispatcherServlet` 最大的不同点，是里面的实现绝大部分都采用响应式流编程。

至此，一次传统 WebMvc 风格编程的请求处理就完成了。接下来看使用函数式端点编程时，`DispatcherHandler` 是如何处理的。

### WebFlux：DispatcherHandler的工作原理-函数式端点

前面用传统的 WebMvc 编程风格测试了一个请求，下面用前面写的函数式端点编程开发的 Handler，看看处理有什么相同和不同。

#### 1. DispatcherHandler#handle

对，你没看错，它还是来到 `DispatcherHandler` 的 `handle` 方法，证明两种方式最终都是走一个前端控制器。

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

套路与前面一致，逐个来看：

#### 2. 选定HandlerMapping

`concatMap(mapping -> mapping.getHandler(exchange))` 的步骤是筛选 HandlerMapping 的，来到 `AbstractHandlerMapping#getHandler` ：

```java
public Mono<Object> getHandler(ServerWebExchange exchange) {
    return getHandlerInternal(exchange).map(handler -> {
        // ......
    });
}
```

进入Lambda表达式中发现 `Handler` 的类型是我自己写的 `RouterConfiguration` 中的Lambda表达式！而且它也帮我映射到了实际处理的 `DemoHandler` ！

注意这个地方实际上的 `HandlerMapping` 是 `RouterFunctionMapping` ，这个组件在前文留了个缺口，这里回顾一下：

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

它有设置一个 `Order` 的属性为 -1，并且后面的单行注释也写得很明白：它会排在 `RequestMappingHandlerMapping` 的前面。这样看来，用**函数式端点开发的映射，优先级会高于用 WebMvc 的注解风格开发的映射**。

对比 `RequestMappingHandlerMapping` ，发现它的 Order 是0，证明 `RouterFunctionMapping` 更靠前：

```java
@Bean
public RequestMappingHandlerMapping requestMappingHandlerMapping() {
    RequestMappingHandlerMapping mapping = createRequestMappingHandlerMapping();
    mapping.setOrder(0);
    // ......
```

另外，`RouterFunctionMapping` 中包含了所有的函数式端点，看看它的定义：

```java
public class RouterFunctionMapping extends AbstractHandlerMapping implements InitializingBean {

    @Nullable
    private RouterFunction<?> routerFunction;
```

它里面有一个 `routerFunction` 的属性，它保存了所有的函数式端点。可这样看上去只有一个，说明它肯定有一些组合/合并的动作。

借助IDEA，发现在这个类中有一个 `initRouterFunctions` 方法：

```java
protected void initRouterFunctions() {
    List<RouterFunction<?>> routerFunctions = routerFunctions();
    this.routerFunction = routerFunctions.stream().reduce(RouterFunction::andOther).orElse(null);
    logRouterFunctions(routerFunctions);
}
```

这里它会先获取所有的 `RouterFunction` ，之后在下面有一个将所有 `RouterFunction` 的 `reduce` 操作，它会利用 `RouterFunction` 的 `andOther` 方法，将所有 `RouterFunction` 进行组合。

#### 3. 寻找HandlerAdapter

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

依旧来到 `invokeHandler` 方法中找 `HandlerAdapter` ，不过这次是函数式端点编程，所以找到的 `HandlerAdapter` 的类型会有所不同：

发现类型为 `HandlerFunctionAdapter` ，不过Debug时想展开看看它里面有什么组成，结果扑了个空。（实际上也确实没有对象属性）

#### 4. 执行目标方法

```java
public Mono<HandlerResult> handle(ServerWebExchange exchange, Object handler) {
    HandlerFunction<?> handlerFunction = (HandlerFunction<?>) handler;
    ServerRequest request = exchange.getRequiredAttribute(RouterFunctions.REQUEST_ATTRIBUTE);
    return handlerFunction.handle(request)
            .map(response -> new HandlerResult(handlerFunction, response, HANDLER_FUNCTION_RETURN_TYPE));
}
```

注意在 `HandlerFunctionAdapter` 中，所有的 Handler 都可以转换为 `HandlerFunction` 类型。

> `RouterFunctions` 类的 route 方法会传入 HandlerFunction 类型的 lambda表达式：

```java
public static <T extends ServerResponse> RouterFunction<T> route(
        RequestPredicate predicate, HandlerFunction<T> handlerFunction) {
    return new DefaultRouterFunction<>(predicate, handlerFunction);
}
```

下面的return部分的调用，注意第一步：`handlerFunction.handle(request)` ，它会直接拿 `handlerFunction` 调 `handle` 方法，这个操作就相当于实际调用 Controller 的方法，而 HandlerFunction 接口的定义：

```java
@FunctionalInterface
public interface HandlerFunction<T extends ServerResponse> {
    Mono<T> handle(ServerRequest request);
}
```

借助IDEA，发现 `handle` 方法的实现就是我自己写的 `DemoHandler` 里的方法：

由此可以发现，原来函数式端点的执行更简单，不需要走反射，直接强转就可以调用 Controller/Handler的目标方法。

#### 5. 返回值处理

`DispatcherHandler` 的最后一步，要对上一步的返回值进行处理，会走 `result -> handleResult(exchange, result)` 方法：

```java
private Mono<Void> handleResult(ServerWebExchange exchange, HandlerResult result) {
    return getResultHandler(result).handleResult(exchange, result)
            .onErrorResume(ex -> result.applyExceptionHandler(ex).flatMap(exceptionResult ->
                    getResultHandler(exceptionResult).handleResult(exchange, exceptionResult)));
}
```

调用链的第一步获取 `ResultHandler` ，不过这次获取的类型发生了变化：

它的类型是 `ServerResponseResultHandler` ！就有必要看看这个类了，毕竟它跟 `ResponseBodyResultHandler` 肯定是不一样的实现。

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

可以发现它其实也没那么神秘，也是直接拿 `ServerResponse` ，直接调 `writeTo` 方法，向响应流中写入数据。

至此，请求被成功处理。

#### 小结

1. `RouterFunctionMapping` 用于在函数式端点的映射中寻找对应的目标方法，而且它的优先级高于 `RequestMappingHandlerMapping` 。
2. 函数式端点编程在真正调用目标 Controller/Handler 方法时，相较于传统 WebMvc 方式，不需要走反射，而是直接强转为 `HandlerFunction` 后直接调用目标方法。

【至此，WebFlux的核心装配和执行流程全部解析完毕】

> 以下内容吸收自原独立篇《WebFlux 工作原理》：DispatcherHandler 处理请求的 Debug 走读（传统注解风格与函数式端点两种方式）。

## 版本差异(旧版 → Spring Boot 3.5.x)

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
