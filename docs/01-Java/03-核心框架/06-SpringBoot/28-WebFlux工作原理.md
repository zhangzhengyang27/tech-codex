---
title: "WebFlux 工作原理"
description: "以 Debug 视角解析 WebFlux 核心前端控制器 DispatcherHandler 的请求处理流程：HandlerMapping 选定、HandlerAdapter 匹配、目标方法反射调用与返回值处理，并对比传统注解式与函数式端点两种风格的源码差异。"
keywords: [WebFlux, DispatcherHandler, HandlerMapping, RouterFunctionMapping, 函数式端点]
category: "Java"
tags: [Java, SpringBoot]
---


# WebFlux 工作原理

> **版本基准**：本文基于 Spring Boot 2.x 源码撰写（`RequestMappingHandlerAdapter` 中的 `methodResolver`/`InitBinderBindingContext` 等为 Spring 5.2.x 形态）。Spring Boot 3.x 中整体流程不变，仅内部实现类有重构，阅读时注意对照。



## WebFlux工作原理

### WebFlux：DispatcherHandler的工作原理-传统方式

咱前面也看到了，也做过示例，咱知道 WebFlux 可以完美兼容 WebMvc 的开发风格，那自然咱就猜测，WebFlux 中的核心前端控制器 `DispatcherHandler` 估计能跟 `DispatcherServlet` 在这部分的处理上差不多，抱着这个猜测，咱来以Debug的方式来观察处理逻辑走向：

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

这段调用中可读性倒是挺高，咱参考之前 `DispatcherServlet` 的工作原理，大概分析一下这里面的三个步骤：

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

方法内部的实现与 WebMvc 部分思路几乎完全一致，不再深扒，这里咱瞄一眼扫描到的匹配请求的 `HandlerMethod`：Debug中它已经找到了咱写的 `DemoController` 。

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

可以看出来它这里面有对跨域的处理，由于咱这是最简单的测试，自然不会触发跨域处理，直接把封装好的 `Mono<HandlerMethod>` 返回回去了。

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

这里面先是对 `HandlerMethod` 进行一些处理，以及异常处理器的处理，最后的链式调用中第三行有一个 `invocableMethod.invoke` ，它就会去引导调用真正的 Controller 方法。根据上面源码的注释标注咱一样一样来看：

##### 4.1 InitBinderBindingContext

这个类非常有意思，它在 SpringFramework 的官方API中根本没有收录进去，而且也找不到任何相关的资料，只能靠源码的部分来大概看一眼它：

```java
/** Extends BindingContext with @InitBinder method initialization. */
class InitBinderBindingContext extends BindingContext
```

它的文档注释中提到了 `@InitBinder` 注解，这个注解咱之前在 WebMvc 部分见过，它是做参数绑定的。另外它继承自 `BindingContext` ，而 `BindingContext` 咱看类名能猜测可能是跟 `@InitBinder` 注解配合做参数绑定相关工作的。看一眼它的文档注释：

> Context to assist with binding request data onto Objects and provide access to a shared Model with controller-specific attributes. Provides methods to create a WebExchangeDataBinder for a specific target, command Object to apply data binding and validation to, or without a target Object for simple type conversion from request values. Container for the default model for the request.用于帮助将请求数据绑定到对象的上下文，并提供对具有控制器特定属性的共享模型的访问。提供用于为特定目标创建 WebExchangeDataBinder 的方法，提供对目标对象应用数据绑定和验证的命令Object（或不具有目标对象的命令Object）以从请求值进行简单类型转换的方法。请求的默认模型的容器。

文档注释倒是可以比较明确的看出，它确实是跟参数绑定相关的组件。

##### 4.2 InvocableHandlerMethod

这个组件咱之前在 WebMvc 部分也见过，它的作用就是调用 `HandlerMapping` 中真正封装的 Controller 方法。注意到它跟 WebMvc 部分的 `ServletInvocableHandlerMethod` 应该是继承和被继承关系，只不过在 WebFlux 中见到的 `InvocableHandlerMethod` 是在 reactive 包下的，而不是 mvc 包。其余部分几乎完全相同，小伙伴们可以将之前第 25 篇《WebMvc 请求处理流程源码》中的 `DispatcherServlet` 工作原理进行对照翻看，文档不再赘述。

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

它直接就 return 了，里面又是流式调用，lambda表达式中有一部分吸引了我：try块中的 `value = getBridgedMethod().invoke(getBean(), args);` ，这个套路似曾相识啊，咱把 WebMvc 中的调用方式一块拿出来对比一下：

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

由于之前咱在 `DemoController` 中声明的返回值类型是 `Mono<String>` ，那这里的 value 也就是 `Mono<String>` 类型。通过Debug，发现它的类型和对应的 `ReactiveAdapter` 也都获取到了。

多提一嘴，`ReactiveAdapter` 就是通过上一篇咱看自动装配中看到的 `ReactiveAdapterRegistry` 组件获取而来，用它来实际兼容 RxJava 等其他响应式编程框架。

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

【至此，一次传统 WebMvc 风格编程的请求处理就完成了，接下来的一篇咱来看看使用函数式端点编程，`DispatcherHandler` 是如何处理的】

### WebFlux：DispatcherHandler的工作原理-函数式端点

上一篇咱用传统的 WebMvc 编程风格测试了一个请求，下面咱用后面写的函数式端点编程开发的Handler，看看它的处理有什么相同和不同。

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

那套路就跟上一篇的一样了，咱一一来看：

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

注意这个地方实际上的 `HandlerMapping` 是 `RouterFunctionMapping` ，这个组件咱之前在第27篇留了个缺口，这里咱回顾一下：

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

另外，`RouterFunctionMapping` 中包含了所有的函数式端点，咱看看它的定义：

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

它的类型是 `ServerResponseResultHandler` ！那咱就有必要看看这个类了，毕竟它跟 `ResponseBodyResultHandler` 肯定是不一样的实现。

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

## 版本差异(旧版 → Spring Boot 3.5.x)

| 特性 | 旧版(Spring Boot 2.x) | Spring Boot 3.5.x |
|------|----------------------|-------------------|
| WebFlux 核心 | Mono/Flux + Netty | 不变；Spring 6 响应式语义稳定 |
| 函数式端点 | RouterFunction | 不变 |
| 背压 | Reactor 背压 | 不变 |
| 虚拟线程 | 无 | 若同步阻塞占多数，可评估 MVC + 虚拟线程 |
| 调优 | Netty 参数调优 | 不变；Netty 事件循环参数稳定 |
