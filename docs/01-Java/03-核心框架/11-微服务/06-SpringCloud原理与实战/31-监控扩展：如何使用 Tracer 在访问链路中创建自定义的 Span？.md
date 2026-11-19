---
title: "监控扩展：如何使用 Tracer 在访问链路中创建自定义的 Span？"
description: "使用 Spring Cloud Sleuth 底层 Brave 框架创建自定义 Span：Span/Tracer 核心方法（nextSpan/start/tag/annotate/finish）、@NewSpan/@SpanTag 注解，以及结合 Zipkin 可视化定位性能瓶颈。"
keywords: [监控扩展, 如何使用, Tracer, 在访问链路中创建自定义的, Span]
category: "Java"
tags: [Java, SpringCloud原理与实战]
---
# 监控扩展：如何使用 Tracer 在访问链路中创建自定义的 Span？

## 概念说明

Spring Cloud Sleuth 内置的日志埋点和采集功能能够满足日常开发的大多数场景需要，但在业务系统中需要重点监控某些业务操作时，就需要创建自定义的 Span 并纳入可视化监控机制。这一需求通过 Spring Cloud Sleuth 底层的 Brave 框架实现。

从 2.X 版本开始，Spring Cloud Sleuth 全面使用 Brave 作为其底层的服务跟踪实现框架。1.X 版本中通过 Spring Cloud Sleuth 自带的 org.springframework.cloud.sleuth.Tracer 接口创建和管理自定义 Span 的方法不再有效。要在访问链路中创建自定义的 Span，需要对 Brave 框架所提供的功能有足够的了解。

Brave 是 Java 版的 Zipkin 客户端，它将收集的跟踪信息以 Span 的形式上报给 Zipkin 系统。

## 核心要点

- Brave 中的 `Span` 是一个抽象类，几乎所有方法都是抽象方法，具体实现由子类 `RealSpan` 完成；`RealSpan` 内部依赖可变的 `MutableSpan` 记录状态。
- Span 的核心方法：`start()` 设置开始时间、`finish()` 设置结束时间并触发 Handler 回调、`annotate()` 为事件指定类型与时间、`tag()` 为 Span 添加键值对标签。
- 通过 Tracer 类创建 Span 的常用方法：`newTrace()`（新根 Span）、`nextSpan()`（子 Span 或新根 Span）、`newChild()`（指定父上下文的子 Span）、`currentSpan()`（获取当前 Span）。
- `PendingSpan` 用于收集一条 Trace 上暂时被挂起的未完成的 Span。
- 业务代码中添加自定义 Span 的模版：`tracer.nextSpan().name(...).start()` → 业务逻辑 → `tag()` / `annotate()` → `finish()`；不脱离当前进程的场景可改用 `startScopedSpan()` 返回的 ScopedSpan。
- 注解方式：`@NewSpan` 自动创建新 Span，`@SpanTag` 自动为该 Span 添加以方法参数为值的标签。
- `finish()` 方法必须在操作结束后调用，否则 Span 数据不会被发送到 Zipkin。
- 自定义 Span 的典型价值：当默认 Span 无法判断某方法响应时间过长的原因时，通过细粒度 Span 定位性能瓶颈。

## 使用 Brave 创建自定义 Span

### Span 类的核心方法

Brave 中的 Span 是一个抽象类，该类的几乎所有方法都是抽象方法，需要子类进行实现。在 Brave 中，该抽象类的子类是 RealSpan。RealSpan 中的 start 方法如下所示：

```java
@Override
public Span start(long timestamp) {
    synchronized (state) {
      state.startTimestamp(timestamp);
    }
    return this;
}
```

这里的 state 是一个可变的 MutableSpan，上述 start 方法就是为这个 MutableSpan 设置开始时间。对应的 finish 方法会为 MutableSpan 设置结束时间，如下所示：

```java
@Override
public void finish(long timestamp) {
    if (!pendingSpans.remove(context)) return;
    synchronized (state) {
      state.finishTimestamp(timestamp);
    }
    finishedSpanHandler.handle(context, state);
}
```

对于关闭 Span 的操作而言，finish 方法还添加了一个 Handler 以便执行回调逻辑，这也是非常常见的一种实现技巧。

另一个非常有用的方法是 annotate，如下所示：

```java
@Override
public Span annotate(long timestamp, String value) {
    if ("cs".equals(value)) {
      synchronized (state) {
        state.kind(Span.Kind.CLIENT);
        state.startTimestamp(timestamp);
      }
    } else if ("sr".equals(value)) {
      synchronized (state) {
        state.kind(Span.Kind.SERVER);
        state.startTimestamp(timestamp);
      }
    } else if ("cr".equals(value)) {
      synchronized (state) {
        state.kind(Span.Kind.CLIENT);
      }
      finish(timestamp);
    } else if ("ss".equals(value)) {
      synchronized (state) {
        state.kind(Span.Kind.SERVER);
      }
      finish(timestamp);
    } else {
      synchronized (state) {
        state.annotate(timestamp, value);
      }
    }
    return this;
}
```

对照服务监控中 cs（客户端发送）、sr（服务端接收）、cr（客户端接收）、ss（服务端发送）四种监控事件，上述代码的作用就是为这些事件指定类型以及时间，从而为构建监控链路提供基础。

RealSpan 中另一个值得介绍的方法是 tag：

```java
@Override
public Span tag(String key, String value) {
    synchronized (state) {
      state.tag(key, value);
    }
    return this;
}
```

该方法为 Span 打上一个标签，两个参数分别代表标签的 Key 和 Value，开发人员可以根据需要对任何一个 Span 添加自定义的标签体系。

### 通过 Tracer 类创建 Span

Tracer 是一个工具类，提供了一批方法用于完成与 Span 相关的各种属性和操作。

通过 Tracer 创建一个新的根 Span，可以使用如下所示的 newTrace 方法：

```java
public Span newTrace() {
    return _toSpan(newRootContext());
}
```

这里用到了一个保存跟踪信息的 TraceContext 上下文对象。对于根 Span 而言，这个 TraceContext 就是全新的上下文，没有父 Span。`_toSpan` 方法最终构建了一个 RealSpan 对象：

```java
Span _toSpan(TraceContext decorated) {
	if (isNoop(decorated)) return new NoopSpan(decorated);
    PendingSpan pendingSpan = pendingSpans.getOrCreate(decorated, false);
    return new RealSpan(decorated, pendingSpans, pendingSpan.state(), pendingSpan.clock(), finishedSpanHandler);
}
```

这里出现的新对象 PendingSpan 用于收集一条 Trace 上暂时被挂起的未完成的 Span。

创建了根 Span 之后，可以在这个 Span 上执行 nextSpan 方法来添加新的 Span：

```java
public Span nextSpan() {
    TraceContext parent = currentTraceContext.get();
    return parent != null ? newChild(parent) : newTrace();
}
```

该方法获取当前 TraceContext：如果该上下文不存在，就通过 newTrace 方法创建一个新的根 Span；如果存在，则基于这个上下文并调用 newChild 方法创建一个子 Span。newChild 方法如下所示：

```java
public Span newChild(TraceContext parent) {
    if (parent == null) throw new NullPointerException("parent == null");
    return _toSpan(nextContext(parent));
}
```

在需要获取当前 Span 的场景下，可以使用 Tracer 类提供的 currentSpan 方法：

```java
public Span currentSpan() {
    TraceContext currentContext = currentTraceContext.get();
    return currentContext != null ? toSpan(currentContext) : null;
}
```

基于 Tracer 提供的这些常见方法，可以梳理出在业务代码中添加自定义 Span 的模版方法：

```java
@Service
public class MyService {

@Autowired
    private Tracer tracer;

    public void perform() {
         Span newSpan = tracer.nextSpan().name("spanName").start();
        //ScopedSpan newSpan = tracer.startScopedSpan("spanName");
        try {
            //执行业务逻辑
        }
        finally{
          newSpan.tag("key", "value");
          newSpan.annotate("myannotation");
          newSpan.finish();
        }
    }
}
```

上述代码注入了一个 Tracer 对象，然后通过 `nextSpan().name("spanName").start()` 创建并启动了一个名为 "spanName" 的新 Span。这是在业务代码中嵌入自定义 Span 的一种方法。另一种方法是使用注释掉的代码行中的 ScopedSpan：ScopedSpan 代表包含一定操作延迟的 Span 对象，适用于操作不脱离当前进程的场景。执行完业务逻辑之后，分别通过 tag 方法和 annotate 方法添加标签和定义事件，最后通过 finish 方法关闭 Span。

### 使用注解创建 Span

除了使用代码对创建 Span 的过程进行控制之外，Brave 还提供了更简单的注解方式。

`@NewSpan` 注解可以自动创建一个新的 Span：

```java
@NewSpan
void myMethod();
```

`@NewSpan` 注解也可以和 `@SpanTag` 注解结合使用，@SpanTag 注解用于自动为通过 @NewSpan 注解创建的 Span 添加标签：

```java
@NewSpan(name = "myspan")
void myMethod(@SpanTag("mykey") String param);
```

上述示例定义了一个名为 "myspan" 的新 Span，并在 myMethod 方法中注入了一个标签、指定了标签的键，而该标签的值就是方法的输入参数 param。执行 `myMethod(@SpanTag("mykey") String param)` 方法时，将生成一个键为 "mykey"、值为 param 的新标签。

## 使用 Zipkin 集成自定义跟踪

默认情况下，完整服务调用链路中的各个 Span 都由系统自动生成，在大多数情况下通过这些 Span 就可以分析和排查服务调用链路中可能存在的问题。但在某些特定场景下，需要在这些 Span 的基础上实现定制化的数据收集和展示方式。

典型场景：服务调用链路中某一个方法调用时间比较长，但通过默认创建的基于该方法的 Span，通常无法判断响应时间过长的原因。此时就需要为该方法内部的关键步骤创建自定义 Span。

### 使用 Tracer 添加自定义 Span

以 SpringHealth 案例系统中的 device-service 为例，通过 Brave 的 Tracer 工具类创建 Span 并把该 Span 相关信息推送给 Zipkin。在 DeviceService 的调用过程中添加一个新的 Span，帮助 device-service 诊断响应时间过长问题，示例代码如下：

```java
@Service
public class DeviceService {

@Autowired
    private DeviceRepository deviceRepository;

@Autowired
     private Tracer tracer;

public Device getDeviceByCode(String deviceCode) {

Span newSpan = tracer.nextSpan().name("findByDeviceCode").start();

        try {
            return deviceRepository.findByDeviceCode(deviceCode);
        }
        finally{
          newSpan.tag("device", "database");
          newSpan.annotate("deviceInfoObtained");
          newSpan.finish();
        }
    }
}
```

上述示例基于自定义 Span 模版方法完成了 Span 的创建过程：

1. 使用 nextSpan 方法创建一个自定义的 Span，并为该 Span 命名为 "findByDeviceCode"。
2. 创建一个键为 "device" 的标签，把标签值设置为 "database"，指明该标签与数据库操作相关。
3. 通过 annotate 方法记录一个代表设备信息已经被获取的 "deviceInfoObtained" 事件。
4. 执行 finish 方法。在具体操作结束之后必须调用此方法，否则 Span 数据不会被发送到 Zipkin 中。

### 可视化自定义 Span

在不添加自定义 Span 之前，调用 [http://localhost:5555/springhealth/device/devices/device1](http://localhost:5555/springhealth/device/devices/device1) 时，Zipkin 上生成的是三个由系统自动生成的 Span。

添加自定义 Span 之后，在原有默认可视化效果的基础上多了一个名为 "findByDeviceCode" 的自定义 Span。

查看该自定义 Span 中每个关键事件的明细数据，可以看到 "deviceInfoObtained" 这个自定义事件。基于数据可以发现在 device-service 处理请求的时间中，实际上大部分消耗在访问数据库以获取设备数据的过程中。同样，在其他服务中也可以添加不同的 Span，以实现对服务调用过程更加精细化的管理。

## 小结

自定义 Span 是日常开发过程中常用的工程实践：在业务系统中嵌入各种 Span，能够帮助开发人员找到系统中的性能瓶颈点，为系统重构和优化提供抓手。在 Spring Cloud Sleuth 中，Brave 框架可以用来创建自定义的 Span，创建方式包括 Tracer 类的编程式方法（newTrace / nextSpan / newChild / currentSpan）与 @NewSpan / @SpanTag 注解两种；Zipkin 框架则可以对这些自定义 Span 实现可视化。

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
