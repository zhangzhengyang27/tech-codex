---
title: "微信公众号验签和初步对接OpenAI"
description: "对接微信公众号实现 ChatGPT 消息自动回复：微信 SDK 验签（GET）与消息应答（POST）的接口开发、chatgpt-sdk-java 组件引入、同步与异步两种应答实现，以及 natapp 内网穿透的功能验证步骤。"
keywords: [微信公众号, 验签, OpenAI, natapp, 内网穿透]
category: "Java"
tags: [Java, ChatGPT AI 问答助手]
---


# 微信公众号验签和初步对接 OpenAI

微信公众号 SDK 对接，并通过异步调用的方式处理消息应答。完成开发后使用内网穿透工具做本地的测试验证

**对接chatgpt方案（本节代码）**：https://gitcode.net/KnowledgePlanet/chatgpt/chatgpt-api/-/tree/230506-xfg-wx-sdk  

**对接chatglm方案（优化代码）【更好申请ApiKey，小白可用】**：https://gitcode.net/KnowledgePlanet/chatgpt/chatgpt-api/-/tree/231116-xfg-chatglm

以实际应用为目标，初步尝试把 OpenAI 对接到公众号上，实现消息自动回复功能。随着 OpenAI 生成式服务的日益完善，以后各个大厂都会有自己品牌的 GPT 服务，并把这些服务对接到你现在通过问答方式回复的场景中。虽然本章来引入微信公众号开发的 SDK 和 chatgpt-sdk-java   到 chatgpt-api 做一个简单的对接使用。

**注意**：ChatGPT 对接申请复杂，可以在本节开始选择对接 [chatglm-sdk-java](https://bugstack.cn/md/project/chatgpt/sdk/chatglm-sdk-java.html) 这个是小傅哥新实现的SDK，与使用 chatgpt-sdk-java 一致。所有 chatgpt 的对接，替换为 chatglm 即可。代码改动量不大

整个流程为；对接微信公众号，提供验签服务的get请求和处理消息的post请求以及初始化 chatgpt-sdk-java 服务。当验签完成后接收post请求并做应答处理


整体结构可对照仓库分支源码中的工程结构查看。

需要准备一些基础内容；

1. 微信订阅号申请：**https://mp.weixin.qq.com/cgi-bin/registermidpage?action=index&lang=zh_CN** - 个人即可申请，也支持基本的开发对接
2. 内网穿透使用：**[https://natapp.cn/](https://natapp.cn/tunnel/buy)** - 你可以使用免费的隧道，也可以购买最低配置，更稳定

## 方案实现

在本章节的实现需要先打开 chatgpt-sdk-java 工程，并在 IDEA 右侧的 Maven 栏里点击 Install 按钮。这样才能把这个组件打成一个 Jar 包，让 chatgpt-api 工程在 POM 中配置引入

```xml
<!-- 工程：https://gitcode.net/KnowledgePlanet/chatgpt/chatgpt-sdk-java -->
<dependency>
    <groupId>cn.bugstack.chatgpt</groupId>
    <artifactId>chatgpt-sdk-java</artifactId>
    <version>1.0-SNAPSHOT</version>
</dependency>

<!-- 工程：https://gitcode.net/KnowledgePlanet/road-map/chatglm-sdk-java -->
<dependency>
    <groupId>cn.bugstack</groupId>
    <artifactId>chatglm-sdk-java</artifactId>
    <version>1.0-SNAPSHOT</version>
</dependency>

<!-- 二选一对接即可，如果没有 chatgpt apikey 建议对接 chatglm 体验一样，不影响学习 -->
```

在初次打开  chatgpt-api#230506-xfg-wx-sdk 分支会报红。所以这个引入组件的步骤很重要。你需要满足本地在同一个 Maven 配置下，并能正确 Install 以及确定版本号，并在 chatgpt-api POM 中配置了，才能引入


1. 本章只是做了微信公众号开发的基本对接，以及简单使用 chatgpt-sdk-java 组件做消息应答（完整改动可对照仓库分支源码查看）。
2. 代码包括；微信公众号的 SDK 使用，以及 WeiXinPortalController 为入口的微信验证签名和消息应答。**你可以安装个 IDEA 插件：Sequence Diagram** - 下载后在类的方法上右键选择使用，会帮你生成出代码的调用链路图，非常方便理解代码

## 基础配置

需要对微信公众号，提前了解并获取一些基本的信息；

注册信息 - 原始ID  地址：**https://mp.weixin.qq.com/cgi-bin/settingpage?t=setting/index&action=index&token=636571670&lang=zh_CN**


基础配置 - appid   地址：**https://mp.weixin.qq.com/advanced/advanced?action=dev&t=advanced/dev&token=636571670&lang=zh_CN**


## 接口开发

### 创建会话

**源码**：cn.bugstack.chatgpt.interfaces.WeiXinPortalController#WeiXinPortalController

这里目前是一个硬编码的方式启动 OpenAI 的会话处理，以后会放到专门的领域模块下提供服务

```java
private OpenAiSession openAiSession;
public WeiXinPortalController() {
    // 1. 配置文件
    Configuration configuration = new Configuration();
    configuration.setApiHost("https://api.xfg.im/b8b6/");
    configuration.setApiKey("sk-****"); // 替换为你自己的 API Key
    configuration.setAuthToken("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4ZmciLCJleHAiOjE2ODMzODM0NTYsImlhdCI6MTY4MzM3OTg1****");
    // 2. 会话工厂
    OpenAiSessionFactory factory = new DefaultOpenAiSessionFactory(configuration);
    // 3. 开启会话
    this.openAiSession = factory.openSession();
    logger.info("开始 openAiSession");
}
```

### 验证签名

**源码**：cn.bugstack.chatgpt.interfaces.WeiXinPortalController#validate

验证签名是一个标准的处理方式，调用的也是微信的前面 SDK，验证成功后直接返回 echostr 即可。

```java
@GetMapping(produces = "text/plain;charset=utf-8")
public String validate(@PathVariable String appid,
                       @RequestParam(value = "signature", required = false) String signature,
                       @RequestParam(value = "timestamp", required = false) String timestamp,
                       @RequestParam(value = "nonce", required = false) String nonce,
                       @RequestParam(value = "echostr", required = false) String echostr) {
    try {
        logger.info("微信公众号验签信息{}开始 [{}, {}, {}, {}]", appid, signature, timestamp, nonce, echostr);
        if (StringUtils.isAnyBlank(signature, timestamp, nonce, echostr)) {
            throw new IllegalArgumentException("请求参数非法，请核实!");
        }
        boolean check = weiXinValidateService.checkSign(signature, timestamp, nonce);
        logger.info("微信公众号验签信息{}完成 check：{}", appid, check);
        if (!check) {
            return null;
        }
        return echostr;
    } catch (Exception e) {
        logger.error("微信公众号验签信息{}失败 [{}, {}, {}, {}]", appid, signature, timestamp, nonce, echostr, e);
        return null;
    }
}
```

### 应答消息【简单实现】

**源码**：cn.bugstack.chatgpt.interfaces.WeiXinPortalController#post

1. 应答消息分为三部分；接收消息、ChatGPT调用和回复消息。
2. 公众号会有一个超时重试，如果在5秒内拿不到消息会提供公众号服务异常。对于这样的情况一种是非个人订阅号的客服消息功能异步回复处理【但大部分人没有这个权限】，另外一种是曲线的方案，把用户的请求做一个异步调用和结果存放，当用户重新请求的时候再获取结果。

```java
@PostMapping(produces = "application/xml; charset=UTF-8")
public String post(@PathVariable String appid,
                   @RequestBody String requestBody,
                   @RequestParam("signature") String signature,
                   @RequestParam("timestamp") String timestamp,
                   @RequestParam("nonce") String nonce,
                   @RequestParam("openid") String openid,
                   @RequestParam(name = "encrypt_type", required = false) String encType,
                   @RequestParam(name = "msg_signature", required = false) String msgSignature) {
    try {
        logger.info("接收微信公众号信息请求{}开始 {}", openid, requestBody);
        MessageTextEntity message = XmlUtil.xmlToBean(requestBody, MessageTextEntity.class);
        BehaviorMatter behaviorMatter = new BehaviorMatter();
        behaviorMatter.setOpenId(openid);
        behaviorMatter.setFromUserName(message.getFromUserName());
        behaviorMatter.setMsgType(message.getMsgType());
        behaviorMatter.setContent(StringUtils.isBlank(message.getContent()) ? "你是谁" : message.getContent().trim());
        behaviorMatter.setEvent(message.getEvent());
        behaviorMatter.setCreateTime(new Date(Long.parseLong(message.getCreateTime()) * 1000L));
        // OpenAI 请求
        // 1. 创建参数
        ChatCompletionRequest chatCompletion = ChatCompletionRequest
                .builder()
                .messages(Collections.singletonList(Message.builder().role(Constants.Role.USER).content(behaviorMatter.getContent()).build()))
                .model(ChatCompletionRequest.Model.GPT_3_5_TURBO.getCode())
                .build();
        // 2. 发起请求
        ChatCompletionResponse chatCompletionResponse = openAiSession.completions(chatCompletion);
        // 3. 解析结果
        StringBuilder messages = new StringBuilder();
        chatCompletionResponse.getChoices().forEach(e -> {
            messages.append(e.getMessage().getContent());
        });
        // 反馈信息[文本]
        MessageTextEntity res = new MessageTextEntity();
        res.setToUserName(behaviorMatter.getOpenId());
        res.setFromUserName(originalId);
        res.setCreateTime(String.valueOf(System.currentTimeMillis() / 1000L));
        res.setMsgType("text");
        res.setContent(messages.toString());
        String result = XmlUtil.beanToXml(res);
        logger.info("接收微信公众号信息请求{}完成 {}", openid, result);
        return result;
    } catch (Exception e) {
        logger.error("接收微信公众号信息请求{}失败 {}", openid, requestBody, e);
        return "";
    }
}
```

### 应答消息【异步处理】

**源码**：cn.bugstack.chatgpt.interfaces.WeiXinPortalController#post

```java
@PostMapping(produces = "application/xml; charset=UTF-8")
public String post(@PathVariable String appid,
                   @RequestBody String requestBody,
                   @RequestParam("signature") String signature,
                   @RequestParam("timestamp") String timestamp,
                   @RequestParam("nonce") String nonce,
                   @RequestParam("openid") String openid,
                   @RequestParam(name = "encrypt_type", required = false) String encType,
                   @RequestParam(name = "msg_signature", required = false) String msgSignature) {
    try {
        logger.info("接收微信公众号信息请求{}开始 {}", openid, requestBody);
        MessageTextEntity message = XmlUtil.xmlToBean(requestBody, MessageTextEntity.class);
        // 异步任务
        if (chatGPTMap.get(message.getContent().trim()) == null || "NULL".equals(chatGPTMap.get(message.getContent().trim()))) {
            // 反馈信息[文本]
            MessageTextEntity res = new MessageTextEntity();
            res.setToUserName(openid);
            res.setFromUserName(originalId);
            res.setCreateTime(String.valueOf(System.currentTimeMillis() / 1000L));
            res.setMsgType("text");
            res.setContent("消息处理中，请再回复我一句【" + message.getContent().trim() + "】");
            if (chatGPTMap.get(message.getContent().trim()) == null) {
                doChatGPTTask(message.getContent().trim());
            }
            return XmlUtil.beanToXml(res);
        }
        // 反馈信息[文本]
        MessageTextEntity res = new MessageTextEntity();
        res.setToUserName(openid);
        res.setFromUserName(originalId);
        res.setCreateTime(String.valueOf(System.currentTimeMillis() / 1000L));
        res.setMsgType("text");
        res.setContent(chatGPTMap.get(message.getContent().trim()));
        String result = XmlUtil.beanToXml(res);
        logger.info("接收微信公众号信息请求{}完成 {}", openid, result);
        chatGPTMap.remove(message.getContent().trim());
        return result;
    } catch (Exception e) {
        logger.error("接收微信公众号信息请求{}失败 {}", openid, requestBody, e);
        return "";
    }
}

public void doChatGPTTask(String content) {
    chatGPTMap.put(content, "NULL");
    taskExecutor.execute(() -> {
        // OpenAI 请求
        // 1. 创建参数
        ChatCompletionRequest chatCompletion = ChatCompletionRequest
                .builder()
                .messages(Collections.singletonList(Message.builder().role(Constants.Role.USER).content(content).build()))
                .model(ChatCompletionRequest.Model.GPT_3_5_TURBO.getCode())
                .build();
        // 2. 发起请求
        ChatCompletionResponse chatCompletionResponse = openAiSession.completions(chatCompletion);
        // 3. 解析结果
        StringBuilder messages = new StringBuilder();
        chatCompletionResponse.getChoices().forEach(e -> {
            messages.append(e.getMessage().getContent());
        });
        chatGPTMap.put(content, messages.toString());
    });
}
```

1. 把用户的请求信息做一个异步调用和结果存放，不过目前其实还是有些粗暴，如果调用OpenAI接口不超时的可以直接返回，不用异步处理。后续再完善这些内容。
2. 界面的使用效果可在完成部署后于公众号中实际体验。


## 功能验证

### 1. 内网穿透

因为目前需要在本地进行验证调试，那么需要类似 natapp 这样的工具把自己的内网映射出去，有个公网的地址访问到你本地的服务。你可以登录 **[https://natapp.cn](https://natapp.cn/)** 创建一个免费或者9元+3元域名的付费通信隧道。注意在这里绑定自己域名需要备案


### **配置更换**


URL：`http://xfg.nat300.top/wx/portal/wxad979c0307864a66` - 【地址和ID】部分你需要替换为你的。同时 wx 的配置放到 application.yml 中。

在 `application.yml` 中有一组微信公众号的开发配置，你需要自己替换

```yaml
# 微信公众号配置信息
# originalid：原始ID
# appid：个人AppID
# token：开通接口服务自定义设置 
wx:
  config:
    originalid: gh_c5ce6e4a0e0e
    appid: wxad979c0307864a66
    token: b8b6

```

注意 URL 为你的服务启动后的，设置的自己的地址。我的地址是 natapp 内网穿透以及自己买的域名

### 启动服务


体验


1. 以上信息配置并启动完成后，就可以在公众号回复消息了。注意：**以上为测试公众号，不长期提供服务。**

## 读者作业

1. 简单作业：完成公众号对接开发，可以通过回复消息自动应答。
2. 复杂作业：优化应答体验，如；【低于超时时间的，可以直接应答】、【存放HashMap时间过长消息删除】。你也可以发挥想象。在分支中 https://gitcode.net/KnowledgePlanet/chatgpt/chatgpt-api/-/tree/231116-xfg-chatglm 已经做了此优化，可参考

## 优秀作业

1. https://t.zsxq.com/13cX1rpf4 @AD钙奶
2. https://t.zsxq.com/13xMuFZZV @俗人
3. https://t.zsxq.com/15pSG1Vg7 @CCAT
4. https://t.zsxq.com/15l7We6nd @淡笑莫言 - 优化了公众号的智能回复，体验非常好

## 版本差异(公众号对接 → 当前)

| 特性 | 旧版（2023） | 当前 |
|------|--------------|------|
| 公众号验签 | SHA1 排序验签 | 不变（微信开放平台接口稳定） |
| 模型 | gpt-3.5-turbo / chatglm | gpt-4o 系列 / GLM-4 / DeepSeek（国内无需翻墙） |
| 消息接口 | 明文模式 | 推荐加密模式（aes 加解密） |
| 合规 | 无要求 | 生成式 AI 需备案（国内公众号接入 AI 回复需注意内容合规） |

> 微信公众号验签流程（token 排序 → SHA1 → 比对）长期稳定；差异在模型选择与合规要求上。
