---
title: 系统迁移 传统应用如何迁移到 Serverless？
description: 传统应用的常驻进程、内存缓存、session 认证、磁盘读写与统一接入层在 Serverless 下都需要改造。梳理四大改造点，并以 Express.js 为例详解 Web 服务 Serverless 化的三种方案。
keywords: [05-Serverless架构, 系统迁移, Serverless 改造]
category: 架构与工程
tags: [架构, 05-Serverless架构]
---


# 系统迁移 传统应用如何迁移到 Serverless？

## 背景与问题

Serverless 有很多优点：不用关心运维、按量付费节省成本……因此很多团队想把已有应用迁移到 Serverless 架构上。但 Serverless 是一项新技术，和传统开发方式区别很大，迁移成本也大。

架构层面的根本差异在于：基于 Serverless 架构的应用由 FaaS 和 BaaS 组成（FaaS 提供计算资源，BaaS 提供数据存储和服务），而传统应用的计算和存储都在同一台服务器上。所以传统应用要想迁移到 Serverless 架构，必须进行相关改造。本文先从整体上梳理迁移的几个重要改造点，再以 Express.js 为例详解传统 Web 服务的 Serverless 化。

## 传统应用迁移到 Serverless 的四大改造点

传统应用的典型特点是：应用进程持续运行在服务器上。以 Web 服务为例，部署一个应用要买服务器，把代码部署到服务器上，启动服务进程，监听服务器相关端口，然后等待客户端请求，收到请求后进行处理并返回结果。这个服务进程是常驻的，就算没有客户端请求，也会占用服务器资源。

由“进程常驻”衍生出的一系列假设，正是迁移时需要逐一改造的地方。

### 改造点一：内存缓存

因为应用进程常驻，同一服务器上的内存可以共享，所以传统应用通常会在内存中缓存数据以提升计算性能（比如在内存中保存用户信息），每次处理用户请求时直接从内存读取，不用查询数据库。

但基于 Serverless 架构的应用，内存缓存通常没有意义：函数生命周期有限，且函数实例之间无法共享内存。因此迁移的第一个改造点就是**内存缓存问题**。

Serverless 架构中一般不用内存做缓存，而是用缓存数据库（比如 Redis）。基于 Redis 的缓存读写数据要经过网络请求，性能相比内存缓存有一定损耗，但这一点不必特别担心：在传统应用中（尤其分布式应用），大部分时候也会使用缓存数据库，因为服务器和服务器之间同样无法共享内存，内存缓存也仅作用于当前服务器处理的所有请求。

此外，传统应用中通常也会使用二级缓存：同时将数据缓存在内存和缓存数据库中。读取缓存时，首先读取内存缓存，内存中没有数据再读取缓存数据库，缓存数据库中也没有数据，再通过网络请求从远程读取。

### 改造点二：身份认证

缓存带来的另一个问题就是身份认证，这是传统应用迁移到 Serverless 的**第二个改造点**。传统应用的身份认证通常有 cookie-session 和 JWT 两种方式。

- **cookie-session**：身份信息保存在服务端的 session 中。对于只有一台服务器的应用，可能会把 session 保存在内存中，但在 Serverless 中就会有问题，因为内存缓存是很短暂的。当然，现在大部分 cookie-session 的身份认证也会将 session 存储在缓存数据库中，这样就降低了迁移成本。
- **JWT**：认证方式本身是无状态的，客户端和服务端通过一个加密后的 token 交换信息，比较适合 Serverless 架构，可以无缝迁移。

### 改造点三：数据持久化

除了内存读写，一些传统应用可能还会对磁盘有很多读写操作。比如基于磁盘做重试：一条数据处理失败后将其写入磁盘，然后启动另一个线程读取磁盘数据进行重试。部署传统应用的磁盘是直接挂载到服务器上的，就算应用重启了，服务器和磁盘也依旧存在，将数据直接写入磁盘不会造成数据丢失。

而 Serverless 函数运行在 FaaS 平台上，函数运行时只会有一个临时目录的读写权限，一旦运行环境被释放，该临时目录也会被释放，所以磁盘数据无法持续存储；并且与内存问题类似，不同函数实例的临时目录也是独立的。

对于有读写磁盘需求的应用，解决方案是为 Serverless 函数挂载一个持久存储，比如云盘或 NAS：这些持久化存储与 FaaS 平台相互独立，只要不释放，数据可以永久保存；不同函数可以共用同一个持久化存储，从而读写同一份数据，甚至函数间还可以基于持久化存储进行通信。采用持久化存储还有一个好处——计算和存储分离了，更利于应用扩缩容。**数据持久化是传统应用迁移到 Serverless 的第三个改造点。**

其实不难看出，如果传统应用本身是分布式架构，很容易满足前面三点：分布式架构的应用本身就需要考虑内存缓存、身份认证、持久化存储等问题，而 Serverless 架构本身也是分布式的。

### 改造点四：Web 服务 Serverless 化

对于传统分布式应用，要对外提供 HTTP 服务，通常会有一个统一接入层来实现负载均衡、高可用等，例如通过负载均衡使用户流量均衡分配到背后的每台服务器上，其中可能使用到 Nginx、SLB 等产品。而 Serverless 架构的应用可以使用 API 网关来做统一接入：由 API 网关承接用户请求，然后触发具体函数的执行。

使用 API 网关做统一接入是架构上的改造，除此之外，应用代码也需要改造。因为在传统应用中，运行在服务器上的应用直接处理来自用户的 HTTP 请求；而在 Serverless 应用中，函数处理的是 API 网关的事件，两者的数据结构和请求响应方式都有很大差异。必须对传统应用提供 HTTP 服务的代码进行改造，才能使其部署在 Serverless 平台上。**将传统 Web 服务 Serverless 化，是传统应用迁移到 Serverless 架构的又一个改造点。**

## Web 服务如何 Serverless 化：以 Express.js 为例

传统 Web 服务的请求参数与 Serverless 函数参数有较大差异，所以将 Web 服务 Serverless 化的核心工作就是**开发一个适配层**：通过适配层将函数的事件对象转化为标准的 Web 请求，之后就可以继续用传统 Web 服务处理用户请求和响应。

背景知识：Serverless 函数是由事件触发的，事件形式上就是一个 JSON 数据，不同事件的数据不一样；Serverless 平台接收到事件后，会以事件对象为参数来执行入口函数。

函数的事件对象就是入口函数的参数，下面是函数计算 API 网关的入口函数定义：

```javascript
module.exports.handler = (event, context, callback) => {
  // 处理业务逻辑
  callback(null, res);
};
```

在传统应用中，与入口函数对应的概念就是入口文件，比如 Express.js 入口文件定义：

```javascript
const express = require('express')
const app = express()
const port = 3000
// 监听 / 路由，处理请求
app.get('/', function(request, response) {
  response.send('Hello World!')
})
// 监听 3000 端口，启动 HTTP 服务
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
```

在 Express.js 入口文件中，监听了 `/` 路由，该路由对应的请求由回调函数 `function(request, response)` 进行处理。适配的目标就是：把 Serverless 函数的 event 对象转换为 Express.js 框架的 `request` 对象，然后把 Express.js 框架的 `response` 对象转换为函数的 callback 参数。另外，Express.js 入口文件通过 `app.listen` 启动 HTTP 服务，其本质上是调用 Node.js http 模块的 `createServer()` 方法。

所以要想将 event 对象转换为 request 参数，首先需要创建一个自定义的 HTTP 服务来代替 Express.js 的 `app.listen`。大致代码如下：

```javascript
function createServer(requestListener, serverListenCallback) {
    // 创建一个自定义的 HTTP 服务（Node.js Server）
    const server = http.createServer(requestListener);
    // 生成一个 Unix Domain Socket
    server.socketPathSuffix = getRandomString();
    server.on("listening", () => {
        server.isListening = true;
        if (serverListenCallback) serverListenCallback();
    });
    server
        .on("close", () => {
            server.isListening = false;
        })
        .on("error", (error) => {
            // 异常处理，例如判读 socket 是否已被监听
        });
    // 监听 Unix Domain Socket，启动 Node.js Server
    server.listen(`/tmp/server-${server.socketPathSuffix}.sock`);
    return server;
}
```

上述代码的重点在于：首先创建一个 Node.js Server，然后生成一个随机的 Unix Domain Socket，最后监听该 Socket 启动 HTTP 服务（Node.js Server）。

然后就可以将函数的事件对象 event 转换为 Express.js 的 request 请求：

```javascript
function forwardRequestToNodeServer(server, event, context, resolver) {
  try {
    // 将 API 网关事件转换为 HTTP Request
    const requestOptions = mapApiGatewayEventToHttpRequest(
      event,
      context,
      getSocketPath(server.socketPathSuffix)
    );
    // 将 HTTP 请求转发到 Node.js Server
    const req = http.request(requestOptions, (response) =>
      forwardResponseToApiGateway(server, response, resolver)
    );
    req
      .on("error", (error) => {
        // 处理异常
        return forwardLibraryErrorResponse(error, resolver);
      })
      .end();
  } catch (error) {
    // 处理异常
    return forwardLibraryErrorResponse(error, resolver);
  }
}
```

**这段代码的主要功能是：** 先将 event 对象转换为 HTTP 请求参数，然后以该参数向 Node.js Server 发起请求，这样函数的请求就会被 Node.js Server 接管，由 Node.js 再进行处理。

当 Node.js Server 处理完毕后，还需要对 Node.js Server 的 response 做处理，将 response 信息转换为 callback 函数的参数，该参数会直接返回给 API 网关：

```javascript
function forwardResponseToApiGateway(server, response, resolver) {
  const buf = [];
  response
    .on("data", (chunk) => buf.push(chunk))
    .on("end", () => {
      // 根据 response 构造函数执行结果
      const data = {
        statusCode: response.statusCode,
        body: Buffer.concat(buf),
        headers: getResponseHeaders(response),
        isBase64Encoded: isContentTypeBinaryMimeType(response),
      };
      // 返回函数执行结果
      resolver(data);
    });
}
```

这段代码的重点在于根据 response 构建函数执行结果和返回函数执行结果。

至此，Express.js 框架 Serverless 化的核心代码就完成了，使用方式如下：

```javascript
const express = require('express');

const app = express();
app.all('*', (req, res) => {
  res.send('hello world!');
});

// 创建一个自定义 Node.js Server
const server = createServer(app);

module.exports.handler = function(event, context, callback) {
  // 将 event 对象转换为 HTTP request 并转发到 Node.js Server
  forwardRequestToNodeServer(server, event, context, callback)
};
```

即：首先创建一个自定义的 Node.js Server，然后在函数里面将 event 对象转换为 HTTP request 并转发到 Node.js Server。

传统 Web 框架 Serverless 化比较麻烦的地方在于需要完全理解 Web 框架和 Serverless 函数事件的每个参数，所以各云厂商为了方便开发也提供了相应的依赖包，比如阿里云函数计算提供的 [@webserverless/fc-express](https://github.com/awesome-fc/webserverless) 和腾讯云云函数提供的 [tencent-serverless-http](https://github.com/serverless-plus/tencent-serverless-http)。

虽然这里只举了 Express.js 框架的例子，但其他 Web 框架 Serverless 化的原理基本类似，大体需要三个步骤：

- 创建一个自定义 HTTP Server；
- 将事件对象转换为 HTTP 请求参数，并转发到自定义的 HTTP Server；
- 将 HTTP 响应转换为函数返回值。

值得注意的是，传统 Web 服务 Serverless 化的原理与自定义运行时的原理非常类似：自定义运行时的本质也是在函数中实现一个 HTTP 服务，接下来 FaaS 平台会将事件转发到这个 HTTP 服务上。因此基于自定义运行时，也可以很轻松地将传统 Web 服务 Serverless 化，而且不用开发适配层。

## 方案选型

自定义运行时有两种方式：一种是在函数中直接创建 HTTP 服务，另一种是通过 Docker 镜像启动一个 HTTP 服务。综合适配层方案，将传统 Web 服务 Serverless 化共有三种方案：

- 通过适配层，由适配层将事件对象转换为标准 Web 请求；
- 通过自定义运行时，在函数中创建一个 HTTP 服务，该 HTTP 服务将函数事件处理后转发给传统 Web 服务；
- 通过自定义运行时，将传统 Web 服务构建为自定义镜像。

选型原则：如果应用比较简单，可以使用第一种或第二种方案，开发起来最方便；如果应用有很多依赖，或者需要使用 FaaS 平台不支持的编程语言，建议使用第三种方案，把依赖都打包到 Docker 镜像中，不过这就需要依赖容器镜像服务了。

## 小结

- 传统应用迁移到 Serverless，需要考虑内存缓存、身份认证、持久化存储、Web 服务 Serverless 化等改造点；
- 如果一个应用本身就是分布式部署的，且在架构上是计算和存储分离的，则比较容易迁移到 Serverless；
- Web 服务 Serverless 化的主要原理是实现一个自定义 HTTP 服务，通过该 HTTP 服务处理事件对象和 Web 请求的差异；
- 可以通过实现适配层和自定义运行时等方案，实现 Web 服务 Serverless 化。

实际迁移操作中还可能遇到一些未知困难，但相比困难，Serverless 带来的收益是值得尝试的。
