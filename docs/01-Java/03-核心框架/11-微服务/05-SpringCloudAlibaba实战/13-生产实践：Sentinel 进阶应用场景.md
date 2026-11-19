---
title: "生产实践：Sentinel 进阶应用场景"
description: "通过 sentinel-datasource-nacos 将 Sentinel 流控/熔断规则持久化到 Nacos 并实时推送生效，使用 @SentinelResource 自定义资源点实施熔断保护，以及统一的 BlockException 异常处理与 JSON 输出。"
keywords: [生产实践, Sentinel, 进阶应用场景]
category: "Java"
tags: [Java, SpringCloudAlibaba实战]
---
# 生产实践：Sentinel 进阶应用场景

## 概述

Sentinel 在生产环境下的三个进阶应用场景：

- Sentinel 与 Nacos 整合实现规则持久化；

- 自定义资源点进行熔断保护；

- 开发友好的异常处理程序。

## Sentinel 与 Nacos 整合实现规则持久化

### 问题背景：规则为何丢失

Sentinel 默认的使用方式存在一个明显问题：微服务重启以后所有的配置规则都会丢失。根源是默认情况下微服务将 Sentinel 的规则保存在 JVM 内存中，当应用重启后 JVM 内存销毁，规则就会丢失。解决这个问题需要一种机制将配置好的规则持久化保存，同时规则变更后还能及时通知微服务进行变更。

Nacos 配置中心同时具备两个特性：配置数据的持久化与配置中心主动推送，正好满足上述需求，因此 Nacos 是 Sentinel 规则持久化的首选。

### 案例准备

构建演示工程 sentinel-sample。

**1**. 利用 Spring Initializr 向导创建 sentinel-sample 工程，pom.xml 增加以下三项依赖。

```xml
<!-- Nacos 客户端 Starter-->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
</dependency>
<!-- Sentinel 客户端 Starter-->
<dependency>
    <groupId>com.alibaba.cloud</groupId>
    <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
</dependency>
<!-- 对外暴露 Spring Boot 监控指标-->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

**2**. 配置 Nacos 与 Sentinel 客户端。

```yaml
spring:
  application:
    name: sentinel-sample #应用名&微服务 id
  cloud:
    sentinel: #Sentinel Dashboard 通信地址
      transport:
        dashboard: 192.168.31.10:9100
      eager: true #取消控制台懒加载
    nacos: #Nacos 通信地址
      server-addr: 192.168.31.10:8848
      username: nacos
      password: nacos
  jackson:
    default-property-inclusion: non_null
server:
  port: 80
management:
  endpoints:
    web: #将所有可用的监控指标项对外暴露
      exposure: #可以访问 /actuator/sentinel进行查看Sentinel监控项
        include: '*'
logging:
  level:
    root: debug #开启 debug 是学习需要，生产改为 info 即可
```

**3**. 在 sentinel-sample 服务中，增加 SentinelSampleController 类，用于演示运行效果。

```java
@RestController
public class SentinelSampleController {
    //演示用的业务逻辑类
    @Resource
    private SampleService sampleService;
    /**
     * 流控测试接口
     * @return
     */
    @GetMapping("/test_flow_rule")
    public ResponseObject testFlowRule(){
        //code=0 代表服务器处理成功
        return new ResponseObject("0","success!");
    }

    /**
     * 熔断测试接口
     * @return
     */
    @GetMapping("/test_degrade_rule")
    public ResponseObject testDegradeRule(){
        try {
            sampleService.createOrder();
        }catch (IllegalStateException e){
            //当 createOrder 业务处理过程中产生错误时会抛出IllegalStateException
            //IllegalStateException 是 JAVA 内置状态异常，在项目开发时可以更换为自己项目的自定义异常
            //出现错误后将异常封装为响应对象后JSON输出
            return new ResponseObject(e.getClass().getSimpleName(),e.getMessage());
        }
        return new ResponseObject("0","order created!");
    }
}
```

此外，ResponseObject 对象封装了响应的数据。

```java
/**
 * 封装响应数据的对象
 */
public class ResponseObject {
    private String code; //结果编码，0-固定代表处理成功
    private String message;//响应消息
    private Object data;//响应附加数据（可选）

    public ResponseObject(String code, String message) {
        this.code = code;
        this.message = message;
    }
    //Getter/Setter省略
}
```

**4**. 额外增加 SampleService 用于模拟业务逻辑，后续将用它演示自定义资源点与熔断设置。

```java
/**
 * 演示用的业务逻辑类
 */
@Service
public class SampleService {
    //模拟创建订单业务
    public void createOrder(){
        try {
            //模拟处理业务逻辑需要101毫秒
            Thread.sleep(101);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        System.out.println("订单已创建");
    }
}
```

启动 sentinel-sample，访问[http://localhost/test_flow_rule](http://localhost/test_flow_rule)，浏览器出现 code=0 的 JSON 响应，说明 sentinel-sample 服务启动成功。

```text
{
    code: "0",
    message: "success!"
}
```

### 流控规则持久化

工程创建完成后，将 Sentinel 接入 Nacos 配置中心。

第一步，pom.xml 新增 sentinel-datasource-nacos 依赖。

```xml
<dependency>
    <groupId>com.alibaba.csp</groupId>
    <artifactId>sentinel-datasource-nacos</artifactId>
</dependency>
```

sentinel-datasource-nacos 是 Sentinel 为 Nacos 扩展的数据源模块，允许将规则数据存储在 Nacos 配置中心，在微服务启动时利用该模块 Sentinel 会自动在 Nacos 下载对应的规则数据。

第二步，在 application.yml 文件中增加 Nacos 下载规则，在原有的 sentinel 配置下新增 datasource 选项。以下先只对流控规则进行设置，重要配置项均在代码注释中说明。

```yaml
spring:
  application:
    name: sentinel-sample #应用名&微服务id
  cloud:
    sentinel: #Sentinel Dashboard通信地址
      transport:
        dashboard: 192.168.31.10:9100
      eager: true #取消控制台懒加载
      datasource:
        flow: #数据源名称，可以自定义
          nacos: #nacos配置中心
            #Nacos内置配置中心，因此重用即可
            server-addr: ${spring.cloud.nacos.server-addr}
            dataId: ${spring.application.name}-flow-rules #定义流控规则data-id，完整名称为:sentinel-sample-flow-rules，在配置中心设置时data-id必须对应。
            groupId: SAMPLE_GROUP #groupId 对应配置文件分组，对应配置中心groups项
            rule-type: flow #flow固定写死，说明这个配置是流控规则
            username: nacos #nacos通信的用户名与密码
            password: nacos
    nacos: #Nacos通信地址
      server-addr: 192.168.31.10:8848
      username: nacos
      password: nacos
  jackson:
    default-property-inclusion: non_null
server:
  port: 80
management:
  endpoints:
    web:
      exposure:
        include: '*'
logging:
  level:
    root: debug
```

通过这一份配置，微服务在启动时就会自动从 Nacos 配置中心 SAMPLE_GROUP 分组下载 data-id 为 sentinel-sample-flow-rules 的配置信息并将其作为流控规则生效。

第三步，在 Nacos 配置中心页面，新增 data-id 为 sentinel-sample-flow-rules 的配置项。

data-id 与 groups 需与微服务应用的配置保持对应，最核心的配置内容采用 JSON 格式书写。以下分析这段流控规则。

```text
[
    {
        "resource":"/test_flow_rule", #资源名，说明对哪个 URI 进行流控
        "limitApp":"default",  #命名空间，默认default
        "grade":1, #类型 0-线程 1-QPS
        "count":2, #超过2个QPS限流将被限流
        "strategy":0, #限流策略: 0-直接 1-关联 2-链路
        "controlBehavior":0, #控制行为: 0-快速失败 1-WarmUp 2-排队等待
        "clusterMode":false #是否集群模式
    }
]
```

这些配置项与 Dashboard UI 中的选项是对应的：使用 Dashboard UI 的最终目的就是生成这段 JSON 数据，只不过通过 UI 更容易使用。各设置项的细节可参考 Sentinel 的 GitHub 文档。

[https://github.com/alibaba/Sentinel/wiki/%E6%B5%81%E9%87%8F%E6%8E%A7%E5%88%B6](https://github.com/alibaba/Sentinel/wiki/%E6%B5%81%E9%87%8F%E6%8E%A7%E5%88%B6)

### 验证流控生效与规则实时推送

启动应用验证流控效果。

访问 [http://localhost/test_flow_rule](http://localhost/test_flow_rule)，日志中将会看到这条 Debug 信息，说明在服务启动时已向 Nacos 配置中心获取到流控规则。

```log

DEBUG 12728 --- [main] s.n.www.protocol.http.HttpURLConnection  : sun.net.www.MessageHeader@5432948015 pairs: {GET /nacos/v1/cs/configs?dataId=sentinel-sample-flow-rules&accessToken=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJuYWNvcyIsImV4cCI6MTYxMDg3NTA1M30.Hq561OkXuAqPI20IBsnPIn0ia86R9sZgdWwa_K8zwvw&group=SAMPLE_GROUP HTTP/1.1: null}...
```

在浏览器反复刷新，当 test_flow_rule 接口每秒超过 2 次访问，就会出现 "Blocked by Sentinel (flow limiting)" 的错误信息，说明流控规则已生效。

之后验证能否自动推送新规则：将 Nacos 配置中心中流控规则 count 选项改为 1。

```text
[
    {
        "resource":"/test_flow_rule",
        "limitApp":"default",
        "grade":1,
        "count":1, #2改为1
        "strategy":0,
        "controlBehavior":0,
        "clusterMode":false
    }
]
```

新规则发布后，sentinel-sample 控制台会立即收到下面的日志，说明新的流控规则即时生效。

```log

DEBUG 12728 --- [.168.31.10_8848] s.n.www.protocol.http.HttpURLConnection  : sun.net.www.MessageHeader@41257f3915 pairs: {GET /nacos/v1/cs/configs?dataId=sentinel-sample-flow-rules&accessToken=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJuYWNvcyIsImV4cCI6MTYxMDg3NTA1M30.Hq561OkXuAqPI20IBsnPIn0ia86R9sZgdWwa_K8zwvw&group=SAMPLE_GROUP HTTP/1.1: null}
```

在无须重启的情况下，test_flow_rule 接口 QPS 超过 1 就会直接报错。

与此同时，还可以通过 Spring Boot Actuator 提供的监控指标确认流控规则已生效。

访问 [http://localhost/actuator/sentinel](http://localhost/actuator/sentinel)，在 flowRules 这个数组中可以看到 test_flow_rule 的限流规则。每一次流控规则产生改变时，Nacos 都会主动推送到微服务并立即生效。

## 自定义资源点进行熔断保护

### 机制说明

前述流控规则都针对 RESTful 接口设置，但项目中有时需要针对某一个 Service 业务逻辑方法进行限流熔断等规则设置。sentinel-core 客户端为开发者提供了 @SentinelResource 注解，允许在程序代码中自定义 Sentinel 资源点来实现对特定方法的保护。下面以熔断降级规则为例进行讲解。熔断降级是指某个服务接口在执行过程中频繁出现故障的情况下，在一段时间内将服务停用的保护措施。

在 sentinel-core 中基于 Spring AOP（面向切面技术）可在目标 Service 方法执行前按熔断规则进行检查，只允许有效的数据被送入目标方法进行处理。

以 sentinel-sample 工程为例，对 SampleService.createOrder 方法进行熔断保护的设置步骤如下。

**第一步，声明切面类。**

在应用入口 SentinelSampleApplication 声明 SentinelResourceAspect。SentinelResourceAspect 就是 Sentinel 提供的切面类，用于进行熔断的前置检查。

```java
@SpringBootApplication
public class SentinelSampleApplication {
    // 注解支持的配置Bean
    @Bean
    public SentinelResourceAspect sentinelResourceAspect() {
        return new SentinelResourceAspect();
    }
    public static void main(String[] args) {
        SpringApplication.run(SentinelSampleApplication.class, args);
    }
}
```

**第二步，声明资源点。**

在 SampleService.createOrder 方法上增加 @SentinelResource 注解用于声明 Sentinel 资源点。只有声明了资源点，Sentinel 才能实施限流熔断等保护措施。

```java
/**
 * 演示用的业务逻辑类
 */
@Service
public class SampleService {
    //资源点名称为createOrder
    @SentinelResource("createOrder")
    /**
     * 模拟创建订单业务
     * 抛出IllegalStateException异常用于模拟业务逻辑执行失败的情况
     */
    public void createOrder() throws IllegalStateException{
        try {
            //模拟处理业务逻辑需要101毫秒
            Thread.sleep(101);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        System.out.println("订单已创建");
    }
}
```

修改完毕，启动服务访问 [http://localhost/test_degrade_rule](http://localhost/test_degrade_rule)，当见到 code=0 的 JSON 响应便代表应用运行正常。

```java
{
    code: "0",
    message: "order created!"
}
```

然后打开 Sentinel Dashboard，在簇点链路中确认 createOrder 资源点已存在。

**第三步，获取熔断规则。**

打开 sentinel-sample 工程的 application.yml 文件，将服务接入 Nacos 配置中心的参数以获取熔断规则。

```yaml
spring:
  cloud:
    sentinel:
      datasource:
        flow: #之前的流控规则，保持不变
          nacos:
            server-addr: ${spring.cloud.nacos.server-addr}
            dataId: ${spring.application.name}-flow-rules
            groupId: SAMPLE_GROUP
            rule-type: flow
            username: nacos
            password: nacos
        degrade: #熔断规则
          nacos:
            server-addr: ${spring.cloud.nacos.server-addr}
            dataId: ${spring.application.name}-degrade-rules
            groupId: SAMPLE_GROUP
            rule-type: degrade #代表熔断
            username: nacos
            password: nacos
```

熔断规则的获取过程和前面流控规则类似，只不过 data-id 改为 sentinel-sample-degrade-rules，以及 rule-type 更改为 degrade。

启动过程中，出现下面日志代表配置成功。

```log

[main] s.n.www.protocol.http.HttpURLConnection  : sun.net.www.MessageHeader@d96945215 pairs: {GET /nacos/v1/cs/configs?dataId=sentinel-sample-degrade-rules&accessToken=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJuYWNvcyIsImV4cCI6MTYxMDg5MDMwNH0.ooHkFb4zX14klmHMuLXTDkHSoCrwI8LtN7ex__9tMHg&group=SAMPLE_GROUP HTTP/1.1: null}...
```

**第四步，在 Nacos 配置熔断规则。**

设置 data-id 为 sentinel-sample-degrade-rules，Groups 为 SAMPLE_GROUP，与微服务的设置保持一致。

配置内容如下，每一项均附说明。

```text
[{
    "resource": "createOrder", #自定义资源名
    "limitApp": "default", #命名空间
    "grade": 0, #0-慢调用比例 1-异常比例 2-异常数
    "count": 100, #最大RT 100毫秒执行时间
    "timeWindow": 5, #时间窗口5秒
    "minRequestAmount": 1, #最小请求数
    "slowRatioThreshold": 0.1 #比例阈值
}]
```

上面这段 JSON 完整的含义是：在过去 1 秒内，如果 createOrder 资源被访问 1 次后便开启熔断检查，如果其中有 10% 的访问处理时间超过 100 毫秒，则触发熔断 5 秒钟。这期间访问该方法的所有请求都将直接抛出 DegradeException。5 秒后该资源点回到"半开"状态等待新的访问：如果下一次访问处理成功，资源点恢复正常状态；如果下一次处理失败，则继续熔断 5 秒钟。

设置成功后，访问 Spring Boot Actuator [http://localhost/actuator/sentinel](http://localhost/actuator/sentinel)，可以看到此时 gradeRules 数组下 createOrder 资源点的熔断规则已被 Nacos 推送并立即生效。

### 验证熔断效果

规则允许最大时长为 100 毫秒，而 createOrder 方法中模拟业务处理需要 101 毫秒，显然会触发熔断。

```java
@SentinelResource("createOrder")
//模拟创建订单业务
public void createOrder(){
    try {
        //模拟处理业务逻辑需要101毫秒
        Thread.sleep(101);
    } catch (InterruptedException e) {
        e.printStackTrace();
    }
    System.out.println("订单已创建");
}
```

连续访问 [http://localhost/test_degrade_rule](http://localhost/test_degrade_rule)，当第二次访问时便会出现 500 错误。

控制台日志中也出现了 ERROR 日志，说明熔断已生效。

```log

2021-01-17 17:19:44.795 ERROR 13244 --- [p-nio-80-exec-3] o.a.c.c.C.[.[.[/].[dispatcherServlet]    : Servlet.service() for servlet [dispatcherServlet] in context with path [] threw exception [Request processing failed; nested exception is java.lang.reflect.UndeclaredThrowableException] with root cause
com.alibaba.csp.sentinel.slots.block.degrade.DegradeException: null
```

看到 DegradeException 就说明之前配置的熔断规则已经生效。

至此，Sentinel 规则在 Nacos 配置中心完成了持久化，并通过 Nacos 的推送机制实现新规则的实时更新。但上述过程中，触发流控或熔断后默认的错误提示非常不友好，在真正的项目中还需要对异常进行二次处理才能满足要求。

## 开发友好的异常处理程序

Sentinel 的异常处理程序分为两种情况：

- 针对 RESTful 接口的异常处理；

- 针对自定义资源点的异常处理。

### 针对 RESTful 接口的异常处理

默认情况下如果访问触发了流控规则，则会直接响应异常信息 "Blocked by Sentinel (flow limiting)"。

RESTful 接口默认应返回 JSON 格式数据，如果直接返回纯文本，调用者将无法正确解析，因此需要对其进行封装，提供更友好的 JSON 格式数据。

针对 RESTful 接口的统一异常处理需要实现 BlockExceptionHandler，完整代码如下。

```java
@Component //Spring IOC实例化并管理该对象
public class UrlBlockHandler implements BlockExceptionHandler {
    /**
     * RESTFul异常信息处理器
     * @param httpServletRequest
     * @param httpServletResponse
     * @param e
     * @throws Exception
     */
    @Override
    public void handle(HttpServletRequest httpServletRequest, HttpServletResponse httpServletResponse, BlockException e) throws Exception {
        String msg = null;
        if(e instanceof FlowException){//限流异常
            msg = "接口已被限流";
        }else if(e instanceof DegradeException){//熔断异常
            msg = "接口已被熔断,请稍后再试";
        }else if(e instanceof ParamFlowException){ //热点参数限流
            msg = "热点参数限流";
        }else if(e instanceof SystemBlockException){ //系统规则异常
            msg = "系统规则(负载/....不满足要求)";
        }else if(e instanceof AuthorityException){ //授权规则异常
            msg = "授权规则不通过";
        }
        httpServletResponse.setStatus(500);
        httpServletResponse.setCharacterEncoding("UTF-8");
        httpServletResponse.setContentType("application/json;charset=utf-8");
        //ObjectMapper是内置Jackson的序列化工具类,这用于将对象转为JSON字符串
        ObjectMapper mapper = new ObjectMapper();
        //某个对象属性为null时不进行序列化输出
        mapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        mapper.writeValue(httpServletResponse.getWriter(),
                new ResponseObject(e.getClass().getSimpleName(), msg)
        );
    }
}
```

BlockExceptionHandler.handle() 方法第三个参数类型是 BlockException，它有五种子类代表不同类型的规则异常。

**1**. FlowException：流控规则异常。
**2**. DegradeException：熔断规则异常。
**3**. ParamFlowException：热点参数规则异常。

例如：针对 id=5 的冷门商品编号时不开启限流，针对 id=10 的热门商品编号则需要进行限流，当 10 号商品被限流时抛出热点参数异常。

**4**. SystemBlockException：系统规则异常。

例如：服务器 CPU 负载超过 80%，抛出系统规则异常。

**5**. AuthorityException：授权规则异常。

例如：某个 IP 被列入黑名单，该 IP 在访问时就会抛出授权规则异常。

利用 instanceof 关键字确定具体的规则异常后，便通过 response 响应对象将封装好的 ResponseObject 对象返回给应用前端，此时响应中 code 值不再为 0，而是对应的异常类型。

例如，当 RESTful 触发流控规则后，前端响应如下：

```text
{
    code: "FlowException",
    message: "接口已被限流"
}
```

当触发熔断规则后，前端响应如下。

```text
{
    code: "DegradeException",
    message: "接口已被熔断,请稍后再试"
}
```

通过这种统一而通用的异常处理机制，对 RESTful 屏蔽了 sentinel-core 默认的错误文本，让项目采用统一的 JSON 规范进行输出。

### 自定义资源点的异常处理

自定义资源点的异常处理与 RESTful 接口处理略有不同：需要在 @SentinelResource 注解上额外附加 blockHandler 属性进行异常处理，完整代码如下。

```java
/**
 * 演示用的业务逻辑类
 */
@Service
public class SampleService {
    @SentinelResource(value = "createOrder",blockHandler = "createOrderBlockHandler")
    /**
     * 模拟创建订单业务
     * 抛出 IllegalStateException 异常用于模拟业务逻辑执行失败的情况
     */
    public void createOrder() throws IllegalStateException{
        try {
            //模拟处理业务逻辑需要 101 毫秒
            Thread.sleep(101);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        System.out.println("订单已创建");
    }
    public void createOrderBlockHandler(BlockException e) throws IllegalStateException{
        String msg = null;
        if(e instanceof FlowException){//限流异常
            msg = "资源已被限流";
        }else if(e instanceof DegradeException){//熔断异常
            msg = "资源已被熔断,请稍后再试";
        }else if(e instanceof ParamFlowException){ //热点参数限流
            msg = "热点参数限流";
        }else if(e instanceof SystemBlockException){ //系统规则异常
            msg = "系统规则(负载/....不满足要求)";
        }else if(e instanceof AuthorityException){ //授权规则异常
            msg = "授权规则不通过";
        }
        throw new IllegalStateException(msg);
    }
}
```

这份代码中有两点关键变化。

第一，为 @SentinelResource 附加了 blockHandler 属性，该属性指向 createOrderBlockHandler 方法名。其作用是当 sentinel-core 触发规则异常后，自动执行 createOrderBlockHandler 方法进行异常处理。

第二，createOrderBlockHandler 方法的书写有两个要求：

- 方法返回值、访问修饰符、抛出异常要与原始的 createOrder 方法完全相同。

- createOrderBlockHandler 方法名允许自定义，但最后一个参数必须是 BlockException 对象——这是所有规则异常的父类，通过判断 BlockException 可以确定触发了哪种规则异常。

createOrderBlockHandler 方法的代码和 RESTful 异常处理基本一致：先判断规则异常的种类，再对外抛出 IllegalStateException 异常。SampleController 会对 IllegalStateException 异常进行捕获，对外输出为 JSON 响应。

程序运行后，访问 [http://localhost/test_degrade_rule](http://localhost/test_degrade_rule)。当触发流控规则后，响应如下：

```text
{
    code: "IllegalStateException",
    message: "资源已被限流"
}
```

当触发熔断规则后，响应如下：

```text
{
    code: "IllegalStateException",
    message: "资源已被熔断,请稍后再试"
}
```

## 实践要点

- Sentinel 默认将规则保存在 JVM 内存中，重启即丢失；生产环境必须通过 sentinel-datasource-nacos 等数据源模块将规则持久化到 Nacos。
- datasource 配置中 dataId、groupId、rule-type 三个参数必须与 Nacos 配置中心中的配置项一一对应，rule-type 固定取值 flow（流控）或 degrade（熔断）。
- 规则 JSON 的字段与 Dashboard UI 选项一一对应，Dashboard UI 本质是生成规则 JSON 的可视化工具；规则变更后由 Nacos 主动推送，无须重启微服务。
- 对 Service 方法做限流熔断需使用 @SentinelResource 自定义资源点，并注册 SentinelResourceAspect 切面 Bean；资源点可在 Dashboard 簇点链路中确认。
- RESTful 接口实现 BlockExceptionHandler 统一处理 BlockException 五种子类（FlowException/DegradeException/ParamFlowException/SystemBlockException/AuthorityException）；自定义资源点通过 @SentinelResource 的 blockHandler 属性绑定处理方法，处理方法最后一个参数必须是 BlockException。
- 除流控与熔断外，Sentinel 还有三种规则：热点参数流控、系统规则、授权规则（黑白名单），详见官方文档 [https://github.com/alibaba/Sentinel/wiki](https://github.com/alibaba/Sentinel/wiki)。

## 小结

本文围绕生产实践中 Sentinel 必然涉及的三类应用场景展开：其一，通过流控案例说明如何利用 Nacos 配置中心将 Sentinel 规则持久化存储，并利用 Nacos 的推送功能实现新规则的实时更新；其二，通过熔断规则介绍 @SentinelResource 注解的用法，将自定义资源点的熔断规则放入 Nacos 进行持久化；其三，针对流控熔断默认不友好的异常输出，利用 Sentinel 自带机制逐一优化，生成符合项目要求的 JSON 格式数据。

## 版本差异（Spring Cloud Alibaba 旧版 → 2025.x）

| 组件 | 旧版（本文编写时） | 当前（Spring Cloud Alibaba 2025.x / Boot 3.5.x） |
|------|-------------------|--------------------------------------------------|
| 注册配置中心 | Nacos 1.x/2.0 | Nacos 2.x+（gRPC 通信、鉴权） |
| 限流熔断 | Sentinel 1.8 | Sentinel 1.8+（规则可持久化到 Nacos） |
| 分布式事务 | Seata 1.x | Seata 1.6+/2.x（AT 模式稳定） |
| RPC | Dubbo 2.x | Dubbo 3.x（应用级服务发现） |
| 负载均衡 | Ribbon（已停止维护） | Spring Cloud LoadBalancer |
| 链路追踪 | Sleuth + Zipkin（Sleuth 已停止维护） | Micrometer Tracing + Zipkin/OTel |
| 版本对应 | Boot 2.x + JDK 8 | Boot 3.5.x + JDK 17+（2022.0.0.0+ 起） |

> 本文为 Spring Cloud Alibaba 旧版课程。升级到 Spring Cloud Alibaba 2025.x + Spring Boot 3.5.x 时，注意 Nacos 2.x 鉴权、Seata 2.x 配置与 Dubbo 3.x 应用级注册的迁移。
