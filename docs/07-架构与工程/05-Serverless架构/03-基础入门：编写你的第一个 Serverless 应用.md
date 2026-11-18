---
title: 基础入门：编写你的第一个 Serverless 应用
description: 以“Hello World”接口为例对比传统部署与 FaaS 部署的差异，完整走一遍函数计算与 Lambda 的开发、部署、触发器配置流程，并讲解入口函数、函数定义、触发器、日志与异常处理等基础知识。
keywords: [05-Serverless架构, 基础入门, Serverless 应用]
category: 架构与工程
tags: [架构, 05-Serverless架构]
---


# 基础入门：编写你的第一个 Serverless 应用

## 概念说明

学习一门新技术，除了了解其基础概念，更重要的是把理论转化为实践。本文以一个“Hello World”接口为例，对比传统部署与 FaaS 部署的差异，完整走一遍函数计算与 Lambda 的开发、部署、触发器配置流程，并讲解入口函数、函数定义、触发器、日志与异常处理等基础知识。

## 选择适合的 FaaS 平台

在开发 Serverless 应用之前，需要先了解并选择一个 Serverless FaaS 平台，因为要用 FaaS 运行代码。

目前主流的 FaaS 产品有 AWS Lambda、阿里云函数计算等。不同 FaaS 支持的编程语言和触发器不尽相同，主要异同可以总结为以下几点信息。

- FaaS 平台都支持 Node.js、Python、Java 等编程语言；

- FaaS 平台都支持 HTTP 和定时触发器（这两个触发器最常用）。此外各厂商的 FaaS 支持与自己云产品相关的触发器，函数计算支持阿里云表格存储等触发器；

- FaaS 的计费都差不多，且每个月都提供一定的免费额度。其中 GB-s 是指函数每秒消耗的内存大小，比如 1G-s 的含义就是函数以 1G 内存执行 1 秒钟。超出免费额度后，费用基本都是 0.0133 元/万次，0.00003167 元/GB-s（以函数计算当时的定价为例，实际以云厂商最新价格为准）。所以，用 FaaS 整体费用非常便宜，对一个小应用来说，几乎是免费的。

总的来说，国外开发者经常用 Lambda，相关的第三方产品和社区更完善；国内经常用函数计算，因为函数计算使用方式更符合国内开发者的习惯。

## 开发 Serverless 应用的步骤

示例应用的功能是：提供一个所有人都可访问的 “Hello World!” 接口，并且能够根据请求参数进行响应（比如请求 http://example.com/?name=Serverless 返回 Hello, Serverless）。

### 传统开发方式对比

按照传统方式，可以直接用 Node.js 中的 Express.js 框架定义一个路由，接收 HTTP 请求，然后处理请求参数并返回结果，代码如下：

```javascript
// index.js
const express = require('express')
const app = express()
const port = 3000
// 定义路由
app.get('/hello', (req, res) => {
  const { name } = req.query;
  res.send(`Hello ${name}!`);
});
// 启动服务
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
});
```

问题在于如何把接口分享给别人：如果对域名解析、Nginx 配置等流程不熟悉，就需要耗费很多时间和精力。**可能代码开发几分钟，部署上线几小时。**

而基于 Serverless FaaS 平台进行开发就很简单了：开发完的函数代码部署到 FaaS 平台并为函数配置 HTTP 触发器，FaaS 会自动初始化运行环境，并且 HTTP 触发器会自动提供一个测试域名。

### 基于函数计算实现

以函数计算为例（以函数计算 2.0 为例），可以直接点击[新建函数](https://fc.console.aliyun.com/fc/service/cn-hangzhou/function/create)的链接进入函数计算控制台，新建一个函数。**需要注意的是，这里会用到 HTTP 触发器，函数计算的 HTTP 触发器要在创建函数时就指定。**

函数创建成功后，就会进入到代码编辑页面，在编辑器中写入如下代码：

```javascript
// 函数计算
exports.handler = (request, response, context) => {
    // 从 request 中获取
    const { name } = request.queries;
    // 设置 HTTP 响应
    response.setStatusCode(200);
    response.setHeader("Content-Type", "application/json");
    response.send(JSON.stringify({ message: `Hello, ${name}` }));
 }
```

这段代码就是 Serverless 应用的全部代码了，它本质上是一个函数，函数有三个参数。

- request 是请求信息，可以从中获取到请求参数；

- response 是响应对象，可以用它来设置 HTTP 响应数据；

- context 是函数上下文，后文会讲到。

由此可见，相比 Express.js 框架，基于 FaaS 的 Serverless 应用的代码更简单，就像写一个普通函数，接收参数并处理，然后返回。写完代码后，在“触发器”标签下可以看到函数计算默认创建的 API Endpoint。

用该 API Endpoint 即可对函数进行测试。通过 curl 命令测试：

```shell
$ curl https://1457216987974698.cn-hangzhou.fc.aliyuncs.com/2016-08-15/proxy/serverless/hello-world/\?name\=Serverless
Hello Serverless!
```

接口也按照预期返回了 Hello Serverless!

**需要注意的是**，如果直接用浏览器访问函数计算默认提供的 API Endpoint，函数计算 HTTP 触发器会默认在 response headers 中强制添加 content-disposition: attachment 字段，这会让返回结果在浏览器中以附件的方式下载。**解决的方法就是使用自定义域名。** 所以如果应用是一个线上服务，建议购买自定义域名绑定到函数上。

至此就基于函数计算完成了 Serverless 应用的开发、部署和测试。

### 基于 Lambda 实现

如果用的是 Lambda，需要在[Lambda 控制台](https://console.aws.amazon.com/lambda/home?region=us-east-1#/functions)先创建一个函数，然后为函数添加 API 网关触发器。Lambda 没有直接提供 HTTP 触发器，但可以用 API 网关触发器来实现通过 HTTP 请求触发函数执行。同样 Lambda 也会默认提供一个测试域名，代码如下：

```javascript
// Lambda
exports.handler = (event, context, callback) => {
    // 从 event 中获取 URL query 参数
    const { name } = event.queryStringParameters;
    // 定义 HTTP Response
    const response = {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json"
            },
        body: JSON.stringify({ message: `Hello ${name}!`} ),
    };
    callback(null, response);
};
```

与 HTTP 触发器不同的是，API 网关触发器入参是 event，event 对象就是 HTTP 请求信息。相比而言，函数计算的 HTTP 触发器请求处理方式与 Express.js 框架处理请求更类似，而 API 网关触发器则类似普通函数。

总的来说，开发一个 Serverless 应用可以分为三个步骤：**代码开发、函数部署、触发器创建**。

## 开发 Serverless 应用的基础知识

> 🖼️ 原文配图未随迁移入库

### 入口函数

开发传统应用时，编写的第一行代码一般都是入口函数，比如 Java 的 main 函数，而 Serverless 应用是由一个个函数组成的，与 main 函数对应的就是 FaaS 中的入口函数。

创建 FaaS 时，会填写一个 “函数入口”，默认是 index.handler，含义为：运行 index 文件中的 handler 函数，handler 函数就是 “入口函数”。FaaS 运行函数时，会根据“函数入口”加载代码中的“入口函数”。**这也就是为什么示例中的函数名是 handler。**

在开发 “Hello World” 应用时，只编写了一个 index.js 文件，文件中也只有一个 handler 方法，函数入口就是 index.handler。

当然，FaaS 函数可以包含多个源文件，然后按照编程语言的模块机制相互引入，这和传统的编程没有区别。比如 Hello World 应用可以拆分一个 sayHello 函数到 logic.js 文件中，然后在 index.js 中引入 logic.js，函数的入口还是 index.handler。

```javascript
// logic.js
exports.sayHello = function (name) {
  return `Hello, ${name}!`;
}
```

```js
// index.js
const logic = require('./logic');
exports.handler = (request, response, context) => {
  // 从 request 中获取
  const { name } = request.queries;

  // 处理业务逻辑
  const message = logic.sayHello(name)

  // 设置 HTTP 响应
  response.setStatusCode(200);
  response.setHeader("Content-Type", "application/json");
  response.send(JSON.stringify({ message }));
}
```

**推荐的做法是把业务逻辑拆分到入口函数之外**。另外，也可以用一份源文件去创建多个函数。因为应用通常是由多个函数组成，为了方便管理，可以在一个源文件中编写所有的入口函数。

### 函数定义

在 HTTP 触发器中函数定义是 function(request, response, context)，在 API 网关触发器中，函数定义是 function(event, context)。**所以，函数定义本质上是由触发器和编程语言决定的。**

标准的函数定义是 function(event, context)。event 是事件对象。在 Serverless 中，触发器被称为“事件源”，英文是 event，这解释了为什么函数参数名是 event。

触发器不同，event 的值可能不同。部分特殊触发器的函数定义可能和标准函数定义不一样，比如 HTTP 触发器，它其实是对标准函数的进一步封装，主要是为了方便对 HTTP 请求进行处理。这也是为什么在函数计算中，HTTP 触发器必须在创建函数时就指定，并且一旦创建后就不能修改。

第二个参数 context 是函数上下文，包含了函数运行时的一些信息（比如函数名称、运行函数的账号信息等）。同一 FaaS 平台中所有触发器的 context 对象都类似，例如：

```javascript
{
  requestId: 'cd234b13-a145-468a-b640-17a8bf5e2ef2',
  credentials: {
    accessKeyId: '***',
    accessKeySecret: '***',
    securityToken: '***'
  },
  function: {
    name: 'hello-world',
    handler: 'index.handler',
    memory: 512,
    timeout: 60,
    initializer: undefined,
    initializationTimeout: NaN
  },
  service: {
    name: 'serverless',
    logProject: 'aliyun-fc-cn-hangzhou-***',
    logStore: 'function-log',
    qualifier: 'LATEST',
    versionId: ''
  },
  region: 'cn-hangzhou',
  accountId: '145***',
  retryCount: 0
}
```

以下列举几种不同编程语言的入口函数示例，以便更形象地了解函数定义：

```javascript
// Node.js 回调函数写法
exports.handler = function (event, context, callback) {
    callback(null, "Hello World!");
}
```

```javascript
// Node.js 异步函数写法（async/await）
exports.handler = async function (event, context) {
    return "Hello World!"
}
```

```javascript
// Python
def handler(event, context):
  return "Hello World!"
```

```javascript
// Java
package example;
import com.aliyun.fc.runtime.Context;
import com.aliyun.fc.runtime.StreamRequestHandler;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
public class HelloWorld implements StreamRequestHandler {
    @Override
    public void handleRequest(
            InputStream inputStream, OutputStream outputStream, Context context) throws IOException {
        outputStream.write(new String("hello world").getBytes());
    }
}
```

由此可见，Node.js 和 Python 的代码是最简洁的。Node.js 编写简单，开发人员众多，前后端都容易上手，所以它在 Serverless 中最受欢迎。

不过在 Node.js 中，早期仅 Lambda 的入口函数支持异步 async 写法，其他 FaaS 平台入口函数只能是同步写法，对于异步操作只能使用回调函数实现，所以入口函数有第三个参数 callback。callback 就是平时写 JavaScript 代码中的回调函数，第一个参数是错误信息，第二个参数是返回值。如果函数运行正常没有报错，则 callback 第一个参数传入 null。当然，除了入口函数，其他代码支持异步，这由 Node.js 的版本决定（如今主流 FaaS 平台的 Node.js 运行时均已支持 async 写法的入口函数）。举个例子，下面的代码入口函数 handler 是回调函数，而 sayHello 函数是 async 函数：

```javascript
async function sayHello() {
  return 'hello world';
}
exports.handler = (event, context, callback) => {
  sayHello()
    .then(res => callback(null, res))
    .catch(error => callback(error));
}
```

### 触发器及事件对象

FaaS 接收到触发器产生的事件后，会根据触发器信息生成 event 对象，然后以 event 为参数调用函数。以下是常见的触发器及其 event 对象属性。

#### HTTP 触发器

在众多 FaaS 平台中，函数计算直接提供了 HTTP 触发器。HTTP 触发器通过发送 HTTP 请求来触发函数执行，一般都会支持 POST、GET、PUT、HEAD 等方法，可以用 HTTP 触发器来构建 RESTful 接口或 Web 系统。

HTTP 触发器会根据 HTTP 请求和请求参数生成事件，然后以参数形式传递给函数。HTTP 触发器入口函数参数中的 request 和 response 参数，本质上与 Express.js 框架的 request 和 response 类似，具体可以参考其文档。下面是 request 参数的示例：

```javascript
// HTTP 触发器 request 参数
{
    "method": "GET",
    "clientIP": "42.120.75.133",
    "url": "/2016-08-15/proxy/serverless/hello-world/",
    "path": "/",
    "queries": { "name": "World" },
    "headers": {
    "accept": "*/*",
        "content-length": "0",
        "content-type": "application/x-www-form-urlencoded",
        "host": "1457216987974698.cn-hangzhou.fc.aliyuncs.com",
        "user-agent": "curl/7.64.1",
        "x-forwarded-proto": "https"
  }
  // ...
}
```

POST 请求下直接从 request 中取 body 参数比较麻烦，可以用 raw-body 这个包来处理请求参数，代码示例如下：

```javascript
var getRawBody = require('raw-body')
exports.handler = function (request, response, context) {
    // 获取请求参数
    getRawBody(request, function (err, data) {
        var params = {
            path: request.path,
            queries: request.queries, // HTTP 请求 query 参数
            headers: request.headers,
            method: request.method,
            body: data, // data 就是 HTTP 请求 body 参数
            url: request.url,
            clientIP: request.clientIP,
        }
        // 设置 HTTP 返回值
        var respBody = Buffer.from(JSON.stringify(params));
        response.setStatusCode(200)
        response.setHeader('content-type', 'application/json')
        response.send(respBody)
    })
};
```

#### API 网关触发器

API 网关触发器与 HTTP 触发器类似，它主要用于构建 Web 系统。本质是利用 API 网关接收 HTTP 请求，然后再产生事件，将事件传递给 FaaS。FaaS 将函数执行完毕后将函数返回值传递给 API 网关，API 网关再将返回值包装为 HTTP 响应返回给用户。

下面是 Lambda 的 API 网关触发器 event 参数示例：

```javascript
// Lambda API 网关触发器 event 参数示例
{
    "version": "2.0",
    "routeKey": "ANY /hello-world",
    "rawPath": "/default/hello-world",
    "rawQueryString": "name=1",
    "headers": {
        "accept": "*/*",
        "content-length": "0",
        "host": "gwfk38f70e.execute-api.us-east-1.amazonaws.com",
        "user-agent": "curl/7.64.1",
        "x-amzn-trace-id": "Root=1-5fb47a82-5cf8a8f3573b039d538fdea2",
        "x-forwarded-for": "42.120.75.133",
        "x-forwarded-port": "443",
        "x-forwarded-proto": "https"
    },
    "queryStringParameters": {
        "name": "1"
    },
    "requestContext": {},
    "isBase64Encoded": false
}
```

相比而言，HTTP 触发器用起来更简单，API 网关触发器功能更丰富，比如可以实现 IP 黑名单、流量控制等高级功能。所以，如果只是实现简单的 Web 接口，可以使用 HTTP 触发器；如果需要一些高级功能，可以用 API 网关触发器。

#### 定时触发器

定时触发器就是定时执行函数，经常用来做一些周期任务，比如每天定时查询天气并发送通知、每小时定时处理分析日志等。

定时触发器的`event`对象很简单：

```json
// 函数计算定时触发器 event 参数示例
{
  "triggerTime": "2020-11-22T17:42:20Z",
  "triggerName": "timer",
  "payload": ""
}
```

除了这三种触发器，各个云厂商也都实现了与自己云产品相关的触发器，比如，文件存储触发器、消息触发器、数据库触发器。

总的来说，触发器决定了一个 Serverless 应用如何提供服务，也决定了代码应该如何编写。丰富的触发器可以让应用功能更强大，但不同触发器的 event 属性不同，也为编程带来了麻烦。**将业务逻辑拆分到入口函数之外、保持入口函数的简洁，业务代码就与触发器无关了。**

### 日志输出

无论用什么编程语言开发 Serverless 应用，都要在合适的时候输出合适的日志信息，方便调试应用、排查问题。在 Serverless 中，日志输出和传统应用的日志输出没有太大区别，**只是日志的存储和查询方式变了。**

以函数计算为例，如果在控制台创建函数，则函数计算默认会使用日志服务来存储日志。在 “日志查询” 标签下可以查看函数调用日志。日志服务是一个日志采集、分析产品，所以要实现业务监控，可以将日志输出到日志服务，然后在日志服务中对日志进行分析，并设置报警项。

基本上，各个云厂商的 FaaS 会选择自己的日志服务来存储函数日志，FaaS 平台也提供了基本的函数监控，包括函数的运行时长、内存使用等。国外也有很多第三方的 SaaS 产品可以实现 Serverless 应用的日志存储分析、系统监控报警，比如 [dashbird](https://dashbird.io/)、[thundra](https://www.thundra.io/)，而国内这方面的产品非常少。

### 异常处理

函数在运行过程中，会出现异常情况。当函数执行异常或主动抛出异常时，FaaS 平台会捕捉到异常信息，记录异常日志，并将异常信息以 JSON 对象返回。比如在 Node.js 代码中使用 throw new Error() 主动抛出一个异常时，函数的返回值和调用日志中都会包含该异常信息。

在传统应用中，一个函数的异常可能会让整个应用崩溃，但在 Serverless 应用中，一个函数异常只会影响这一次函数的执行，这也是 Serverless 能够提升应用整体稳定性的原因。即便如此，编写代码时仍应充分考虑程序的异常，保证代码的健壮性，进一步提升系统稳定性。

## 实践要点

- 技术选型时除了基本的函数执行能力，还要考虑 FaaS 平台的开发工具便利性、触发器丰富度、日志监控完善程度以及与其他服务的集成能力。
- 函数计算的 HTTP 触发器必须在创建函数时指定，创建后不能修改；Lambda 用 API 网关触发器实现 HTTP 触发。
- 浏览器直接访问函数计算默认 API Endpoint 会触发附件下载（content-disposition: attachment），线上服务应绑定自定义域名。
- 将业务逻辑拆分到入口函数之外，保持入口函数简洁，使业务代码与触发器解耦。
- 一份源文件可以创建多个函数，便于集中管理应用的所有入口函数。
- 编写函数代码时充分考虑程序异常，保证健壮性；Serverless 中单函数异常只影响一次执行，但不能因此忽视异常处理。
- Serverless 适合快速开发一个测试接口、实时处理日志等业务场景。

## 小结

Serverless 应用的基本组成单位是函数，函数之间互相独立，因此 Serverless 能提高应用稳定性。开发一个 Serverless 应用分为代码开发、函数部署、触发器创建三个步骤；函数定义与触发器和编程语言相关，不同 FaaS 平台的实现不尽相同。相比传统部署（域名解析、Nginx 配置等），FaaS 部署由平台自动完成，代码编辑可以在云端进行，应用的组成是单个独立的函数，而不是所有功能的集合体。
