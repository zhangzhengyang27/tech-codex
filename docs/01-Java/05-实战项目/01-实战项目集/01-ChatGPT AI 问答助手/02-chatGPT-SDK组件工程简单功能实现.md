---
title: "chatGPT-SDK组件工程简单功能实现"
description: "基于 Retrofit2 + OkHttp3 搭建 ChatGPT-SDK 组件工程：以会话模型为出口设计 IOpenAiApi 接口、OpenAiSession 会话与 DefaultOpenAiSessionFactory 工厂，封装 OpenAI 文本问答与会话聊天两类接口，并通过 HttpClientTest 单元测试验证调用链路。"
keywords: [ChatGPT, SDK, Retrofit2, OkHttp3, 工厂模式]
category: "Java"
tags: [Java, ChatGPT AI 问答助手]
---


# chatGPT-SDK组件工程简单功能实现

**本章源码**：https://gitcode.net/KnowledgePlanet/chatgpt/chatgpt-sdk-java/-/tree/230505-xfg-sdk-api

搭建一个 ChatGPT-SDK 组件工程，专门用于封装对 OpenAI 接口的使用。由于 OpenAI 接口本身较多，并有各类配置的设置，所以开发一个共用的 SDK 组件，更合适在各类工程中扩展使用。所以这个章节以 OpenAI 抽象为会话模型，建立工程结构设计。**其实这也是架构设计的一部分**。并在本章的 ChatGPT-SDK 组件工程中，开发简单的对话功能模块实现

整个流程为；以会话模型为出口，驱动整个服务的调用链路。并对外提供会话工厂的创建和使用


## 方案实现

工程的搭建、Maven的配置、模型的设计、Retrofit2 和 okhttp3 的使用等


整个工程内容和配置，都是本章节新增内容

1. ChatGPT 的 API 包含；简单问答模型 - v1/completions、会话聊天模型- v1/chat/completions。所以在工程的 domain 下也添加了对应的这两部分请求和应答对象。
2. 之后就是以 session 会话为入口，管理整个服务的启动、调用、封装结果信息。
3. 为了让大家更好理解，小傅哥把最基本简单调用，写到 HttpClientTest 里。之后此工程也是从 HttpClientTest 的调用链路使用设计模式进行职责隔离和拆分

### 定义接口

**源码**：cn.bugstack.chatgpt.IOpenAiApi

1. 在 IOpenAiApi 接口中定义访问接口，这里后续会不断地进行扩展，包括；模型列表、消耗额度、流式对话、画图等各类方法
2. 注意；这个接口是没有对应的硬编码实现类的，它的存在只是定义标准，之后由 Retrofit 工具包进行创建服务，如：IOpenAiApi openAiApi = new Retrofit.Builder() 你可以把这想象成是对 DAO 接口与数据库的连接数据源之间的操作

```java
public interface IOpenAiApi {

    /**
     * 文本问答
     * @param qaCompletionRequest 请求信息
     * @return                    返回结果
     */
    @POST("v1/completions")
    Single<QACompletionResponse> completions(@Body QACompletionRequest qaCompletionRequest);

    /**
     * 默认 GPT-3.5 问答模型
     * @param chatCompletionRequest 请求信息
     * @return                      返回结果
     */
    @POST("v1/chat/completions")
    Single<ChatCompletionResponse> completions(@Body ChatCompletionRequest chatCompletionRequest);
}
```

### 会话接口

**源码**：cn.bugstack.chatgpt.session.OpenAiSession

会话接口 OpenAiSession 与 IOpenAiApi 看上去是有些类似的。但其实也和 MyBatis 的会话接口一样，**[会话接口有增删改查4个方法，但执行器里其实只对应了2个方法](https://bugstack.cn/md/spring/develop-mybatis/2022-06-10-第12章：完善ORM框架，增删改查操作.html)**。但有了这样一个接口，就可以封装出各类需要的扩展方法

```java
public interface OpenAiSession {

    /**
     * 文本问答 24年1月，方法废弃
     * @param qaCompletionRequest 请求信息
     * @return                    返回结果
     */
    QACompletionResponse completions(QACompletionRequest qaCompletionRequest);

    /**
     * 文本问答；简单请求 24年1月，方法废弃
     * @param question 请求信息
     * @return         返回结果
     */
    QACompletionResponse completions(String question);

    /**
     * 默认 GPT-3.5 问答模型
     * @param chatCompletionRequest 请求信息
     * @return                      返回结果
     */
    ChatCompletionResponse completions(ChatCompletionRequest chatCompletionRequest);

}
```

### 会话工厂

**源码**：cn.bugstack.chatgpt.session.defaults.DefaultOpenAiSessionFactory

只要想调用OpenAI官网的接口，就一定会需要使用到 HTTP 服务。那么这些类似零件的装配，就需要一个统一收口的地方进行管理。一种是使用工厂模型接口，另外一种是使用建造者组装设计。但我个人认为，工厂模型结构对于这样内容的封装更为适合，因为工厂的设计面上更大，更好扩展

```java
public class DefaultOpenAiSessionFactory implements OpenAiSessionFactory {

    private final Configuration configuration;

    public DefaultOpenAiSessionFactory(Configuration configuration) {
        this.configuration = configuration;
    }

    @Override
    public OpenAiSession openSession() {
        // 1. 日志配置
        HttpLoggingInterceptor httpLoggingInterceptor = new HttpLoggingInterceptor();
        httpLoggingInterceptor.setLevel(HttpLoggingInterceptor.Level.HEADERS);

        // 2. 开启 Http 客户端
        OkHttpClient okHttpClient = new OkHttpClient
                .Builder()
                .addInterceptor(httpLoggingInterceptor)
                .addInterceptor(new OpenAiInterceptor(configuration.getApiKey(), configuration.getAuthToken()))
                .connectTimeout(450, TimeUnit.SECONDS)
                .writeTimeout(450, TimeUnit.SECONDS)
                .readTimeout(450, TimeUnit.SECONDS)
                .build();

        // 3. 创建 API 服务
        IOpenAiApi openAiApi = new Retrofit.Builder()
                .baseUrl(configuration.getApiHost())
                .client(okHttpClient)
                .addCallAdapterFactory(RxJava2CallAdapterFactory.create())
                .addConverterFactory(JacksonConverterFactory.create())
                .build().create(IOpenAiApi.class);

        return new DefaultOpenAiSession(openAiApi);
    }
}
```

## 功能验证

对 HttpClientTest 单元测试类进行学习，这样可以更好的理解整个工程的实现。因为我们做一个方案的时候，通常都是先需要做个demo，把最核心的流程跑出来，在做整体的设计实现

```java
public static void main(String[] args) {
    HttpLoggingInterceptor httpLoggingInterceptor = new HttpLoggingInterceptor();
    httpLoggingInterceptor.setLevel(HttpLoggingInterceptor.Level.BODY);
    OkHttpClient okHttpClient = new OkHttpClient
            .Builder()
            .addInterceptor(httpLoggingInterceptor)
            .addInterceptor(chain -> {
                Request original = chain.request();
                // 从请求中获取 token 参数，并将其添加到请求路径中
                HttpUrl url = original.url().newBuilder()
                        .addQueryParameter("token", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4ZmciLCJleHAiOjE2ODMyNzIyMjAsImlhdCI6MTY4MzI2ODYyMCwianRpIjoiOTkwMmM");
                        .build();
                Request request = original.newBuilder()
                        .url(url)
                        .header(Header.AUTHORIZATION.getValue(), "Bearer " + "sk-****" // 替换为你自己的 API Key，切勿提交真实密钥到代码仓库)
                        .header(Header.CONTENT_TYPE.getValue(), ContentType.JSON.getValue())
                        .method(original.method(), original.body())
                        .build();
                return chain.proceed(request);
            })
            .build();
    IOpenAiApi openAiApi = new Retrofit.Builder()
            .baseUrl("https://api.xfg.im/b8b6/") // 你看可以替换任意你可以使用的接口。
            .client(okHttpClient)
            .addCallAdapterFactory(RxJava2CallAdapterFactory.create())
            .addConverterFactory(JacksonConverterFactory.create())
            .build().create(IOpenAiApi.class);
    Message message = Message.builder().role(Constants.Role.USER).content("写一个java冒泡排序").build();
    ChatCompletionRequest chatCompletion = ChatCompletionRequest
            .builder()
            .messages(Collections.singletonList(message))
            .model(ChatCompletionRequest.Model.GPT_3_5_TURBO.getCode())
            .build();
    Single<ChatCompletionResponse> chatCompletionResponseSingle = openAiApi.completions(chatCompletion);
    ChatCompletionResponse chatCompletionResponse = chatCompletionResponseSingle.blockingGet();
    chatCompletionResponse.getChoices().forEach(e -> {
        System.out.println(e.getMessage());
    });
}
```

### 单元测试

之后测试下本章的功能实现。源码：`cn.bugstack.chatgpt.test.ApiTest`

#### 开启会话工厂

```java
@Before
public void test_OpenAiSessionFactory() {
    // 1. 配置文件【如果你从小傅哥获取key会给你提供apihost，你可以分别替换下】
    Configuration configuration = new Configuration();
    configuration.setApiHost("https://api.xfg.im/b8b6/");
    configuration.setApiKey("sk-****"); // 替换为你自己的 API Key
    // 可以根据课程首页评论置顶说明获取 apihost、apikey；https://t.zsxq.com/0d3o5FKvc
    configuration.setAuthToken("如果是直接访问官网地址或者小傅哥新给的地址和key，就不需要token了");
    // 2. 会话工厂
    OpenAiSessionFactory factory = new DefaultOpenAiSessionFactory(configuration);
    // 3. 开启会话
    this.openAiSession = factory.openSession();
}
```


#### 简单问答模型【24年废弃，知道开发方式即可】

```java
@Test
public void test_qa_completions() throws JsonProcessingException {
    QACompletionResponse response01 = openAiSession.completions("写个java冒泡排序");
    log.info("测试结果：{}", new ObjectMapper().writeValueAsString(response01.getChoices()));
}
```


#### 聊天对话模型【推荐】

```java
@Test
public void test_chat_completions() {
    // 1. 创建参数
    ChatCompletionRequest chatCompletion = ChatCompletionRequest
            .builder()
            .messages(Collections.singletonList(Message.builder().role(Constants.Role.USER).content("写一个java冒泡排序").build()))
            .model(ChatCompletionRequest.Model.GPT_3_5_TURBO.getCode())
            .build();
    // 2. 发起请求
    ChatCompletionResponse chatCompletionResponse = openAiSession.completions(chatCompletion);
    // 3. 解析结果
    chatCompletionResponse.getChoices().forEach(e -> {
        log.info("测试结果：{}", e.getMessage());
    });
}
```


## 版本差异(自研 SDK → OpenAI 官方 SDK)

| 特性 | 旧版（自研 chatgpt-sdk-java） | 当前 |
|------|-------------------------------|------|
| SDK | 自研封装 | 官方 openai-java（`com.openai:openai-java`，支持 OkHttp 客户端） |
| 模型 | gpt-3.5-turbo | gpt-4o / gpt-4.1 / o3 推理模型（ChatModel.GPT_4O 等） |
| 调用方式 | 手写 HTTP + 工厂模型 | ChatCompletionCreateParams.builder() + client.chat().completions().create() |
| 国内替代 | chatglm-sdk-java | 智谱 GLM-4、DeepSeek 等（API 兼容 OpenAI 格式） |

> 自研 SDK 的价值在于理解"工厂模式 + Builder 组装"的架构设计；生产项目可直接使用官方 openai-java，模型名与参数构造按官方文档调整。
