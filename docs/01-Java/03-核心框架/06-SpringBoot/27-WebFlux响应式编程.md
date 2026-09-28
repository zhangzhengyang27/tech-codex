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

小伙伴们，如果你已经走到这里，恭喜你已经对当下 SpringFramework 和 SpringBoot 中的核心原理都有了一个比较完整的了解。按照目前的互联网整体开发现状，响应式编程和 WebFlux 的开发已经越来越多，虽然 WebMvc 的使用和开发已经非常普遍而且大家都能熟练使用，但面对高并发和高性能的要求，响应式编程的呼声越来越高，而且自从14年jdk1.8发行后，Java就已经支持了函数式编程，这也为后续的响应式编程提供了技术基础。接下来的这几篇我们来了解一下响应式编程和 WebFlux ，以及解析 WebFlux 中的一些原理，从而让小伙伴们从更深层面理解 WebFlux ，以及它和 WebMvc 的异同。

#### 1. 响应式编程引入

WebFlux 的核心技术是响应式编程，而对于这个概念，到目前业界还没有一个完完全全被认可的定义，那既然我们是研究 WebFlux ，那我们去 SpringFramework 的官网来了解一下：

> We touched on “non-blocking” and “functional” but what does reactive mean?The term, “reactive,” refers to programming models that are built around reacting to change — network components reacting to I/O events, UI controllers reacting to mouse events, and others. In that sense, non-blocking is reactive, because, instead of being blocked, we are now in the mode of reacting to notifications as operations complete or data becomes available.There is also another important mechanism that we on the Spring team associate with “reactive” and that is non-blocking back pressure. In synchronous, imperative code, blocking calls serve as a natural form of back pressure that forces the caller to wait. In non-blocking code, it becomes important to control the rate of events so that a fast producer does not overwhelm its destination.Reactive Streams is a small spec (also adopted in Java 9) that defines the interaction between asynchronous components with back pressure. For example a data repository (acting as Publisher) can produce data that an HTTP server (acting as Subscriber) can then write to the response. The main purpose of Reactive Streams is to let the subscriber to control how quickly or how slowly the publisher produces data.咱都讲响应式编程是“非阻塞”和“函数式”的，但是响应式意味着什么呢？“响应式”这个概念是指围绕对更改做出反应的编程模型-网络组件对I/O事件做出反应，UI控制器对鼠标事件做出反应等。从这个意义上说，响应式是非阻塞的，因为随着操作完成或数据可用，我们现在处于响应通知的模式，而不是被阻塞。Spring团队还有另一个重要机制与“响应式”相关联，这是不阻碍背压的机制。在同步命令式代码中，阻塞调用是强制调用者等待的一种自然的背压形式。在非阻塞代码中，控制事件的速率非常重要，这样事件数据生产方就不会快速地淹没其消费方。Reactive Streams是一个小的规范（在Java 9中也采用了），它定义了带有反压力的异步组件之间的交互。例如，数据存储库（充当发布者）可以生成数据，以便作为HTTP服务器（充当订阅者）将其写入响应中。 Reactive Streams的主要目的是让订阅者控制发布者生成数据的速度。

这段解释有好多陌生的概念，咱暂且放置一边，毕竟不好理解的内容不要强行灌输到自己脑子里，这样没什么好处的。咱先用几个简单的例子来体会一些基础概念。

#### 2. 体会一些基础概念

##### 2.1 异步非阻塞

之前看过一个非常好的解释异步非阻塞的例子，文档加以引用：

你在家里烧水，烧水的壶有两种：没有哨的普通水壶、壶盖上带哨的响水壶。对于烧水的动作，有四种情景：

- 你先用普通水壶烧水，但你不放心什么时候水壶里的水会烧开，于是你就搬个小马扎坐在壶旁边盯着，直到壶冒热气，你知道水开了，拎下来，烧水结束。此谓：**同步阻塞** （人会一直盯着壶，期间不干别的事情，烧水占据了你的注意力和时间，构成同步阻塞）
- 你觉得这种烧水方法太浪费自己时间了，于是下一次烧水的时候你就不搬小马扎坐壶旁边干等着了，而是一边玩手机，玩几分钟就看一眼壶里的水开了没，水没开就继续玩，发现水开了就拎下来。此谓：**同步非阻塞** （人不再一直盯着壶了，但还在惦记着壶，只是不再被壶一直占用着时间，构成同步非阻塞）
- 烧了几次你发现这普通水壶用着太不爽了，于是去市场买了把带哨的，这次好使了，水开了壶会响。于是你屁颠屁颠的拿响水壶烧水，但第一次你也不知道这哨好不好使，就跟第一次一样，搬个小马扎坐在水壶旁边，但你也不干别的，就干等着水烧开。等哨响了，你把水壶拎下来，烧水结束。此谓：**异步阻塞** （你没再惦记水壶，但这期间你没干别的事，相当于还是被烧水这个事情占据了时间，构成异步阻塞）
- 烧完水你突然觉得你跟个二愣子似的，这玩意都带哨了我还等个毛线？于是以后再烧水你直接准备好就跑路玩手机了，也不回去看壶了，水烧开了，哨自然响，你自然就去把水壶拎下来。此谓：**异步非阻塞** （你没再惦记水壶，而且烧水的过程也没再耽误你干别的事，构成异步非阻塞）

##### 2.2 观察者模式

这个最基础的设计模式之一，小伙伴们已经都很熟悉吧。这里文档只举几个简单例子，帮助小伙伴们回忆一下吧：

- 你要去面试，面试前准备出发时手机推送了天气预报今天有雨，于是你带了伞出门 观察者（监听器）：你 ； 主题（事件源）：天气 ； 事件派发器：手机天气预报
- 面试完成后，面试官会对你说：请留下你的联系方式，有消息我们会通知你的 观察者（监听器）：你 ； 主题（事件源&事件广播器）：面试官
- 面试后你出门叫车回家，由于外头还在下雨，你希望司机快一些来，于是给司机发消息让司机快点，司机告诉你快到的时候会给你打电话的 观察者（监听器）：你 ； 主题（事件源&事件广播器）：司机

##### 2.3 Vue等前端框架的双向绑定

在Vue、React、AngularJS中有一个很基础的概念：双向绑定。下面用一张动图来演示：

这就是响应式！

##### 2.4 【思考】双向绑定中的玄机

仔细思考双向绑定，咱会产生一种感觉：

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

由上面的体会，咱来总结一下响应式的关键点：**变化传递、数据流、声明式**。这里面一直有一个很关键的核心围绕着响应式编程：**事件**。咱们也知道，事件是观察者模式的核心，咱又说响应式也是观察者模式，那自然响应式编程也要依赖事件。

#### 3. 体会一些响应式的新概念

##### 3.1 响应式流

前面咱总结出了数据流的概念，那响应式编程中的数据流自然就有些讲究，它与之前咱在 Java8 中熟悉的 Stream 有些不一样：普通的 Stream 还是同步阻塞的，对于高并发场景下还是不能解决问题，而**响应式流可以做到异步非阻塞**。另外，Stream 的一个特性是一旦有了消费型方法，它就会将这个流中的所有方法处理完毕，如果这期间的数据量很大，Stream 是无法对这些庞大数据量有一个妥善的处理，而响应式流可以对这些数据进行**流量控制**，保证数据的接收速度在处理能力之内。

所以总结下来，响应式流的关键点：**异步非阻塞、数据流速控制**。

##### 3.2 背压

异步非阻塞的概念咱在前面已经体会过了，下面通过一个模拟情景来体会数据流速控制的策略：**背压**。

- 你在一个知名手机生产大厂中，你的职位是生产流水线上的一名普通工人，你的工作是负责流水线上的一个关键部分，这部分需要的时间比较多，而恰好这段时间跟你一起干活的伙计都陪老婆生孩子去了，剩下你单枪匹马仍然战斗在一线。
- 但是你的上游工人似乎并不知道跟你一起干活的伙计都陪老婆生孩子了，而且不知道咋回事他们天天跟打了鸡血似的干劲十足，搞得你这边压了好多上游同事给你的件儿，但你的这部分工序耗时长，积压这么多件你也hold不住，于是忍无可忍的你向你的上游同事发飙了：**你们慢点，我处理不过来了**！你的上游同事听到了你的怒吼，于是他们**处理好的件儿就先不给你了，暂时放在他们自己那儿**，等你告诉他你这边的处理差不多了，他们再塞件儿给你。
- 后来过了一段时间，厂子的工头发现你的成绩非常好，于是阴差阳错你就不干流水线的工作了，转行当经销商来卖这个手机了。这你开心啊，于是经销商定期给你发一批一批的手机，你就拿来售卖。
- 但很不幸，这批手机在售卖后的一段时间后传出电池爆炸的坏新闻，市面上买这款手机的人急剧下降，你作为经销商自然也就不想卖这款手机了，于是你会跟厂商反映：**别给我供这款手机的货了**。厂商也非常无奈，这边生产线还正在运作，而且也有产出的成品机，但经销商都不要了，于是只好**将这部分成品都废弃掉**。

体会这个情景中的两个关键部分：**下游向上游反馈，上游将数据暂时缓存/直接废弃**。

上面咱都是聊一些概念，下面咱用一些简单的Demo来体会真正的响应式编程应该是什么样子。

#### 4. 快速体会Reactor

之所以选择 **Reactor** 作为响应式编程的框架支撑，是因为 WebFlux 的底层库就是 **Reactor** 。

咱直接导入 `spring-boot-starter-webflux` 依赖，**Reactor** 会一起引入进来。

咱上面也看到了，响应式编程是一种观察者模式，自然就有发布者（事件源）和接收者（监听器）。在 Reactor 中，发布者和接收者对应的接口分别是 `Publisher` 和 `Subscriber` 。

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

`Processor` 字面意思可以翻译为处理器，咱之前也看到过IOC容器中的好多后置处理器。这些处理器的特点都是**有输入，有输出**，那对应到Reactor的概念中，就应该是发布者和接收者的合体：

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

这里面要注意的是，它在实现 `Publisher` 原生的 `subscribe` 方法时，还扩展了几个方法，以简化操作。比如上面咱在快速体会中的简单示例，它就是使用了只传入一个数据消费 `Consumer` 的重载（只处理正常情况下的数据接收）。

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

更具体的方法的使用，小伙伴们可以参照API文档，或者网络资料进行了解和练习。

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

【咱快速了解一下响应式编程，以及Reactor框架的一些核心点，接下来咱快速体会 WebFlux 的开发，好为后面解析 WebFlux 的源码做准备】

### WebFlux：快速使用WebFlux

前一篇咱快速的了解了响应式编程，以及 Reactor 框架的基本使用，接下来咱要开始正式接触 WebFlux 了。

咱都知道，自打 SpringFramework5 发行后，之前的 **SpringMVC** 被改名为 **SpringWebMvc**，因为它多了一个兄弟叫 **SpringWebFlux** 。而且 Spring 的开发者们为了避免咱们这些使用者因为新技术的门槛过高而吓跑，WebFlux 可以完美使用 WebMvc 的开发风格。下面咱先实战使用 WebFlux 框架，但还是用 WebMvc 的开发风格。

#### 1. WebFlux环境下用WebMvc风格

导入的依赖还是咱上一篇提到的 `spring-boot-starter-webflux` ，没有引入 WebMvc 模块，直接运行主启动类，观察控制台的输出：

```text
1970-01-01 10:00:00.000  INFO 10224 --- [           main] com.example.demo.DemoApplication         : Starting DemoApplication on DESKTOP with PID 10224 (D:\IDEA\spring-boot-demo\target\classes started by LinkedBear in D:\IDEA\spring-boot-demo)
1970-01-01 10:00:00.000  INFO 10224 --- [           main] com.example.demo.DemoApplication         : No active profile set, falling back to default profiles: default
1970-01-01 10:00:00.000  INFO 10224 --- [           main] o.s.b.web.embedded.netty.NettyWebServer  : Netty started on port(s): 8080
1970-01-01 10:00:00.000  INFO 10224 --- [           main] com.example.demo.DemoApplication         : Started DemoApplication in 1.941 seconds (JVM running for 4.619)
```

注意看应用启动在 **Netty** 上而不是 Tomcat 了！因为 Netty 更适合做响应式编程的应用服务器。

接下来，跟之前开发 WebMvc 应用一样，咱编写一个 `DemoController`：

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

在上一篇咱看到了，Reactor 中的核心数据的封装是 `Flux` 和 `Mono`，那下面咱来改造上面的 `DemoController` ，用上这两个组件：

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

咱之前分析 WebMvc 的原理时也知道，这些 `Controller` 中的方法，最终都会封装为一个一个的 **`Handler`** ，每个 `Handler` 都有自己匹配的 **url**。

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

因为上面的 `DemoHandler` 已经没有了 url 映射的功能，需要手动声明路由规则，下面咱编写一个 `RouterConfiguration` 来配置路由规则（注意这是一个配置类）：

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

写到这里，咱先不着急开始走原理，先停下来思考一下，WebMvc 和 WebFlux 有哪些是相同的，又有哪些是不同的呢？

官方文档中有一张图我觉得不错，这里引用一下吧：

[https://docs.spring.io/spring/docs/5.1.10.RELEASE/spring-framework-reference/web-reactive.html#webflux-framework-choice](https://docs.spring.io/spring/docs/5.1.10.RELEASE/spring-framework-reference/web-reactive.html#webflux-framework-choice)

这张图很直观的展示出了 WebMvc 和 WebFlux 的兼容功能点，以及各自领域目前特有的功能点。

- SpringWebMvc 基于原生 Servlet，所以它是命令式编程，编写相对熟悉，而且很方便调试；Servlet 可以是阻塞的，它更适合跟传统的关系型数据库等阻塞IO的组件进行交互。
- SpringWebFlux 基于 Reactor，它是异步非阻塞的，它使用函数式编程，相较于命令式编程和声明式映射更灵活，而且它可以运行在 Netty 上，当然它也可以运行在 Tomcat 、Jetty 、Undertow 等基于 Servlet3.1 规范及以上的Web容器中。
- SpringWebMvc 和 SpringWebFlux 都可以使用声明式注解编程来配置控制器和映射路径。

社区中还有一张对比图，描述的差不多也是这个意思。

【大概了解 WebFlux 的使用之后，下面咱开始解析 WebFlux 中的原理，并且咱希望通过源码分析和原理解读，来从更深的层面来对比 WebMvc和 WebFlux】

### WebFlux：WebFlux的自动装配

根据之前的经验，咱使用WebFlux的时候，主启动类上相对比于WebMvc来讲没有任何区别，那只有自动配置类可以控制WebFlux的装配了，那装配的自动配置类不难猜想应该是：`WebFluxAutoConfiguration` 。

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

果然它就是一个连接的提供者，而且它还是 **Pool** ，换句话说，咱就可以简单的理解成它是 **Reactor Netty 的连接池**。

实际Debug了一下，发现确实与咱的推测基本贴合：`ConnectionProvider` 底层确实是一个连接池，而且能看到 Netty 事件循环的 **selector** 与 **worker** 线程组的概念，这就是 Netty 的核心（worker 线程数默认与 CPU 核心数相关）。

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

接下来才是最核心的 `WebFluxAutoConfiguration` 。源码中它定义了三个内部类，咱一个一个来看：

#### 4. WebFluxConfig

```java
@Configuration
@EnableConfigurationProperties({ ResourceProperties.class, WebFluxProperties.class })
@Import({ EnableWebFluxConfiguration.class })
public static class WebFluxConfig implements WebFluxConfigurer
```

可以看到它又导入了一个 `EnableWebFluxConfiguration` ，而它就是下面第5章节的 `EnableWebFluxConfiguration` ，咱从上往下一样一样看。先看 `WebFluxConfig` 中的配置：

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

这部分在 WebMvc 部分也是一模一样的，直接copy过来的！（不过这部分不是特别关键，而且之前也没有单独拿出来聊，小伙伴们知道这里是配置转换器的即可）

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

至于这些 `Delegating***Configuration` 的作用咱之前也提到过，它就是 `@EnableWebMvc` 或者 `@EnableWebFlux` 注解导入的配置类：

```java
@Import(DelegatingWebFluxConfiguration.class)
public @interface EnableWebFlux
```

它的作用小伙伴们还记得吗？只要在 SpringBoot 中标注了这样的注解，代表 SpringBoot 默认的自动配置类不生效，改由咱们自己接管配置 WebMvc 或者 WebFlux 。

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

哇塞这不是咱之前在 WebMvc 部分常聊的两个配合 `DispatcherServlet` 的核心组件吗？对的，它在 WebFlux 中也是一样的其效果。

#### 6. WebFluxConfigurationSupport

上面咱注意到了 `EnableWebFluxConfiguration` 继承了 `DelegatingWebFluxConfiguration`，而它又继承了 `WebFluxConfigurationSupport` ，这个配置类中还注册了一些组件：

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

与 `RequestMappingHandlerMapping` 区别开来，它是**函数式端点路由编程的Mapping处理器**。至于它的作用，咱到本篇 6.4 节再聊。

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

注意看源码中第一个if结构下面，它用了一个 `ResourceHandlerRegistry` ，有没有感觉似曾相识？咱在前面看静态资源映射的时候见过它，它是**处理静态资源的映射**的。通常情况下咱的项目中会有一些静态资源，只要存在静态资源，它就会创建一个 `SimpleUrlHandlerMapping` 来真正处理静态资源的路径映射。通过Debug，发现确实存在（因为有应用图标 `favicon.ico`）：

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

发现它有一个 `@ConditionalOnEnabledResourceChain` 注解，它的作用咱不深追究了，它实际是跟一个 `application.properties` 中的配置有关：`spring.resources.chain.strategy.fixed.enabled` ，如果它配置为true，这个条件才生效，默认不生效，不再深究。

#### 小结

1. `WebFluxAutoConfiguration` 的配置整体与 `WebMvcAutoConfiguration` 非常相似，其中不乏包括几个核心组件。
2. `WebFluxAutoConfiguration` 默认配置的Web容器是Netty而非 Tomcat 等传统 Servlet 容器。
3. 大部分比较熟悉的组件都在 `DelegatingWebFluxConfiguration` 的父类 `WebFluxConfigurationSupport` 中注册。

## 版本差异(旧版 → Spring Boot 3.5.x)

| 特性 | 旧版(Spring Boot 2.x) | Spring Boot 3.5.x |
|------|----------------------|-------------------|
| 响应式支持 | WebFlux（5.x） | 不变；Spring 6 响应式语义稳定 |
| 默认容器 | Netty | 不变（Netty 4.1+）；其事件循环线程模型与虚拟线程无关 |
| 响应式客户端 | WebClient | 不变（响应式场景仍用 WebClient）；同步场景 Spring 6.1 新增 RestClient 替代 RestTemplate |
| 虚拟线程 | 无 | 同步栈（WebMvc）可启用虚拟线程；WebFlux 仍适合高吞吐 I/O 密集场景 |
| 选型 | WebFlux vs MVC | 权衡不变；简单阻塞 I/O 场景可考虑 MVC+虚拟线程 |
