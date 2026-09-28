---
title: Koa 源码解析
description: Koa 是一个轻量级的 Node.js Web 框架，其核心代码仅约 2000 行，但提供了强大而灵活的中间件机制。本文将深入分析 Koa 的源码实现，帮助开发者理解其核心原理。
keywords: [Node.js, Web框架, Koa]
category: Node.js
tags: [Node.js, Web框架]
---







# Koa 源码解析

## 概述

Koa 是一个轻量级的 Node.js Web 框架，其核心代码仅约 2000 行，但提供了强大而灵活的中间件机制。本文将深入分析 Koa 的源码实现，帮助开发者理解其核心原理。

### 核心架构

Koa 的架构设计遵循以下几个核心原则：

1. **极简主义**：核心只提供最基础的功能，其他功能通过中间件实现
2. **中间件优先**：所有功能都通过中间件机制实现
3. **上下文封装**：统一封装 Node.js 的 req 和 res 对象
4. **异步流程控制**：全面支持 async/await

### 架构图

```
┌─────────────────────────────────────────────────┐
│                   Koa Application                │
│  ┌───────────────────────────────────────────┐  │
│  │              Middleware Stack              │  │
│  │  ┌─────────────────────────────────────┐  │  │
│  │  │   Middleware 1 (async)              │  │  │
│  │  │   ┌─────────────────────────────┐  │  │  │
│  │  │   │   Middleware 2 (async)      │  │  │  │
│  │  │   │   ┌─────────────────────┐  │  │  │  │
│  │  │   │   │   Middleware 3      │  │  │  │  │
│  │  │   │   │   await next()      │  │  │  │  │
│  │  │   │   └─────────────────────┘  │  │  │  │
│  │  │   └─────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
│                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │ Application │  │   Context   │  │ Request  │ │
│  │             │◄─┤   (ctx)     │◄─┤ Response │ │
│  │             │  │             │  │          │ │
│  └─────────────┘  └─────────────┘  └──────────┘ │
│         ▲                                      │
│         │                                      │
│  ┌──────┴──────┐                              │
│  │ Node.js HTTP│                              │
│  │   Server    │                              │
│  └─────────────┘                              │
└─────────────────────────────────────────────────┘
```

### 请求处理流程

```
HTTP Request
    │
    ├─→ http.createServer()
    │
    ├─→ Application.callback()
    │       │
    │       ├─→ compose(middleware)
    │       │
    │       └─→ createContext(req, res)
    │
    ├─→ Middleware Execution (洋葱模型)
    │       │
    │       ├─→ Middleware 1 (before next)
    │       ├─→ Middleware 2 (before next)
    │       ├─→ Middleware N (core logic)
    │       ├─→ Middleware 2 (after next)
    │       └─→ Middleware 1 (after next)
    │
    ├─→ respond(ctx)
    │
    └─→ HTTP Response
```

## 源码目录结构

从 GitHub 克隆最新代码（本文基于 v2.13.1 版本）：

```bash
git clone https://github.com/koajs/koa.git
cd koa
git checkout v2.13.1
```

### 项目结构

```
koa/
├── lib/                    # 核心源码
│   ├── application.js      # 应用核心 (~400 行)
│   ├── context.js          # 上下文对象 (~300 行)
│   ├── request.js          # 请求封装 (~500 行)
│   └── response.js         # 响应封装 (~400 行)
├── test/                   # 测试文件
├── docs/                   # 文档
├── benchmarks/             # 性能基准测试
└── package.json           # 项目配置
```

### 核心文件说明

| 文件 | 行数 | 职责 | 核心功能 |
|------|------|------|----------|
| `application.js` | ~400 | 应用管理 | 服务创建、中间件管理、错误处理 |
| `context.js` | ~300 | 上下文 | 属性委托、Cookie 操作 |
| `request.js` | ~500 | 请求封装 | 请求信息获取、内容协商 |
| `response.js` | ~400 | 响应封装 | 响应设置、Body 处理 |

### 依赖关系

```
application.js
    ├── context.js (委托机制)
    │     ├── request.js
    │     └── response.js
    ├── koa-compose (中间件组合)
    ├── koa-convert (Generator 转换)
    ├── delegates (属性委托)
    ├── http-errors (错误处理)
    └── cookies (Cookie 管理)
```

## Application 核心实现

`application.js` 是 Koa 的核心文件，负责服务创建、中间件管理和错误处理。

### Koa 创建服务原理

原生的服务是通过 HTTP 模块的 createServer 方法创建的，入参是一个回调函数，接受两个参数 req 和 res。这个回调函数有一个弊端，如果应用庞大且复杂，那么这个回调函数会变得越来越臃肿，最后可能会无法维护

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('hello world');
});

server.listen(4000, () => {
  console.log('server start at 4000');
});
```

Koa 如何创建服务解决了这里提到的弊端

```javascript
const Koa = require('koa')
const app = new Koa()

app.listen(4000, () => {
  console.log('server is running, port is 4000')
})
```

源码实现：

```javascript
// lib/application.js
module.exports = class Application extends Emitter {

  listen(...args) {
    // Debug 调试代码, 可以先忽略
    debug('listen');
    // 这里是用的 HTTP 模块创建服务
    const server = http.createServer(this.callback());
    return server.listen(...args);
  }

  callback() {
    const fn = compose(this.middleware);

    if (!this.listenerCount('error')) this.on('error',this.onerror);

    const handleRequest = (req, res) => {
      const ctx = this.createContext(req, res);
      return this.handleRequest(ctx, fn);
    };
    // 这里返回一个回调函数, 该回调函数对应 HTTP 模块中的 createServer()方法中的回调函数参数
    return handleRequest;
  }

  // 处理 request 逻辑
  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res;
    res.statusCode = 404;
    const onerror = err => ctx.onerror(err);
    const handleResponse = () => respond(ctx);
    onFinished(res, onerror);
    return fnMiddleware(ctx).then(handleResponse).catch(onerror);
  }
};
```

从源码的实现来看，首先整体导出一个 `class`，那么 `app` 就是这个 `class` 的一个实例，`app.listen` 就是调用的 `class` 中的 `listen()` 方法。

再看 `listen()` 方法的实现，服务是 `HTTP` 模块创建的，那在请求进来的时候，会执行 `this.callback()` 方法。那么 `callback()` 函数的实现中，返回的是一个函数，其实这个函数就是 HTTP 模块中`createServer()` 方法的回调函数参数

### 中间件实现原理

中间件是项目开发中经常使用且非常重要的一部分，是 `Koa` 整个框架中的灵魂。在源码的实现中，这部分知识也属于 `Koa` 的难点。源码中涉及 `use()` 方法实现的代码如下：

```javascript
// lib/application.js
module.exports = class Application extends Emitter {

  constructor(options) {
    super();
    // 省略部分代码
    this.middleware = [];
  }

  use(fn) {
    // 入参必须是函数  
    if (typeof fn !== 'function') throw new TypeError('middleware must be a function!');

    // 目前版本是 2.x, 这里主要是兼容 1.x 版本中的 Generator 函数
    if (isGeneratorFunction(fn)) {
      deprecate('Support for generators will be removed in v3. ' +
                'See the documentation for examples of how to convert old middleware ' +
                'https://github.com/koajs/koa/blob/master/docs/migration.md');
      // 如果是 Generator 函数, 则将其转成 2.x 中的(ctx, next)=> {}格式
      fn = convert(fn);
    }
    debug('use %s', fn._name || fn.name || '-');
    this.middleware.push(fn);
    return this;
  }
};
```

`Application` 类的构造函数中声明了一个名为 `middleware` 的数组，当执行 `use()` 方法时，会一直往 `middleware` 中的 `push()` 方法传入函数。其实这就是 Koa 注册中间件的原理，middleware 就是一个队列，注册一个中间件，就进行入队操作

#### koa-compose 解析

中间件注册后，当请求进来的时候，开始执行中间件里面的逻辑，由于有 `next` 的分割，一个中间件会分为两部分执行，整体执行流程可以抽象为下图：

<img src="https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202501141114524.png" alt="image-20250114111448891" style="zoom:33%;" />

那么 middleware 队列是如何按照上图过程执行？需要回到 Koa 的源码中找真相

```javascript
// lib/application.js
const compose = require('koa-compose');

module.exports = class Application extends Emitter {
  // 省略部分代码
  callback() {
    // 核心实现：处理队列中的中间件
    const fn = compose(this.middleware);

    if (!this.listenerCount('error')) this.on('error', this.onerror);

    const handleRequest = (req, res) => {
      const ctx = this.createContext(req, res);
      return this.handleRequest(ctx, fn);
    };

    return handleRequest;
  }
};
```

核心实现在 `koa-compose` 依赖里，可以到 GitHub上阅读 `koa-compose` 的源码，下面针对核心代码（https://github.com/koajs/compose/blob/master/index.js）进行分析，代码如下：

```javascript
// koa-compose 核心实现
module.exports = compose

function compose (middleware) {
  // 入参必须是数组
  if (!Array.isArray(middleware)) throw new TypeError('Middleware stack must be an array!')

  // 数组中的每一项, 必须是函数, 其实就是注册的中间件回调函数 (ctx. next) => {}
  for (const fn of middleware) {
    if (typeof fn !== 'function') throw new TypeError('Middleware must be composed of functions!')
  }

  // 返回闭包, 由此可知在 koa this.callback 中的函数后续一定会使用这个闭包传入过滤后的上下文
  return function (context, next) {
    // 最后回调 middleware 
    // 初始化中间件函数数组执行的下标值
    let index = -1
    // 返回递归执行的 Promise.resolve 去执行整个中间件数组, 从第一个开始
    return dispatch(0)
    function dispatch (i) {
      // 校验上次执行的下标索引不能大于本次执行的传入下标i, 如果大于, 可能是下个中间件执行了多次导致的
      if (i <= index) return Promise.reject(new Error('next() called multiple times'))

      index = i

      // 获取当前的中间件函数
      let fn = middleware[i]

      // 如果当前执行下标等于中间件长度, 表示已经执行完毕了, 返回 Promise.resolve() 即可
      if (i === middleware.length) fn = next
      if (!fn) return Promise.resolve()

      try {
        // 这里用了递归方法执行每个中间件
        return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))
      } catch (err) {
        return Promise.reject(err)
      }
    }
  }
}
```

整体来说：`koa-compose` 的实现是对 `middleware` 数组的处理。中间的注册按照 `middleware` 先进先注册的顺序来进行，在执行的时候也是按照这个注册的顺序执行 `await next()` 函数之前的逻辑，最后递归执行 `await next()` 函数后面的逻辑

另外 `context` 对象（也就是常用的 `ctx`）从始至终都贯穿所有的中间件，并且该对象的引用一直没变，也就是说，在中间件中经常会改变 `ctx` 对象，这个 `ctx` 在后面的中间件中就是改变后的

### 封装 ctx

在使用中间件的时候，有两个参数，一个是 `ctx`，另一个是 `next`。`next` 相当于把当前中间件的执行权力交给了下一个中间件

```javascript
const Koa = require('koa');
const app = new Koa();

app.use((ctx, next) => {
  // 输出请求中的路径
  console.log(ctx.req.url);
  console.log(ctx.request.req.url);
  console.log(ctx.response.req.url);
  console.log(ctx.url);
  console.log(ctx.request.url);

  // 设置状态码和响应内容
  ctx.response.status = 200;
  ctx.body = 'Hello World';
});

app.listen(4000, () => {
  console.log('server is running, port is 4000')
})
```

假设启动服务后，请求为 http://127.0.0.1:4000/home，那么上述代码中，所有的输出都是 `/home`。可以理解为虽然写了 5 种输出形式，但最终的结果都是一样的。为什么 `ctx` 对象的属性不同，最终得出的 `URL` 却是一样的呢？

```javascript
// lib/application.js
module.exports = class Application extends Emitter {

  constructor(options) {
    super();
    // 省略部分代码

    // 3 个属性, 通过 Ojbect.create()方法分别继承 context、request、response
    this.context = Object.create(context);
    this.request = Object.create(request);
    this.response = Object.create(response);
  }

  callback() {
    const fn = compose(this.middleware);

    if (!this.listenerCount('error')) this.on('error',  this.onerror);

    const handleRequest = (req, res) => {
      // 这里创建了ctx对象
      const ctx = this.createContext(req, res);
      return this.handleRequest(ctx, fn);
    };

    return handleRequest;
  }

  createContext(req, res) {
    const context = Object.create(this.context);
    const request = context.request = Object.create(this.request);
    const response = context.response = Object.create(this.response);

    // 将实例挂载到 context.app 中
    context.app = request.app = response.app = this;

    // 将 request 事件的 http.IncomingMessage 类挂载到 context.req 中
    context.req = request.req = response.req = req;
 
    // 将 request 事件的 http.ServerResponse 类挂载到 context.res 中
    context.res = request.res = response.res = res;

    // 互相挂载, 方便用户在 Koa 中通过 ctx 获取需要的信息
    request.ctx = response.ctx = context;
    request.response = response;
    response.request = request;
    context.originalUrl = request.originalUrl = req.url;
    context.state = {};
    return context;
  }
};
```

从上述源码中可以看到，中间件中的 `ctx` 对象经过 `createContext()` 方法进行了封装，其实 `ctx` 是通过 `Object.create()` 方法继承了 `this.context`，而 `this.context` 又继承了 `lib/context.js` 中导出的对象。

最终将 `http.IncomingMessage` 类和 `http.ServerResponse` 类都挂载到了 `context.req` 和 `context.res` 属性上，这样是为了方便用户从 ctx 对象上获取需要的信息。

那么为什么 `app`、`req`、`res`、`ctx` 也存放在 `request` 和 `response` 对象中呢？是为了使它们同时共享 `app`、`req`、`res`、`ctx`，方便处理职责进行转移。当用户访问时，只需要 `ctx` 就可以获取 `Koa` 提供的所有数据和方法，而 `Koa` 会继续将这些职责进行划分，比如 `request` 是进一步封装 `req` 的，`response` 是进一步封装 `res` 的，这样职责得到了分散，降低了耦合度，同时共享所有资源使上下文具有高内聚性，内部元素互相能访问到

### handleRequest 和 respond

分析一下 `handleRequest` 这个函数做了什么

```javascript
handleRequest(ctx, fnMiddleware) {
  const res = ctx.res;
  res.statusCode = 404;
  // 错误处理, 执行上下文中的 onerror() 方法
  const onerror = err => ctx.onerror(err);
  // 处理返回结果
  const handleResponse = () => respond(ctx);
  // 为 res 对象添加错误处理响应, 当 res 响应结束时, 执行上下文中的 onerror 函数
  onFinished(res, onerror);
  // 执行中间件数组中的所有函数, 在结束时调用 respond()函数
  return fnMiddleware(ctx).then(handleResponse).catch(onerror);
}
```

在 handleRequest 中，默认的返回状态码是 404，该方法最后返回一个 `fnMiddleware` 的链式调用，这是执行所有中间件后处理返回逻辑，如果执行过程中有任何异常，会执行 `ctx.onerror` 方法。

`respond()` 函数主要是对返回结果进行处理，源码如下：

```javascript
function respond(ctx) {
  // 允许跳过 Koa
  if (false === ctx.respond) return;

  // writable 是原生的 response 对象的可写入属性, 检查是否是可写流
  if (!ctx.writable) return;

  const res = ctx.res;
  let body = ctx.body;
  const code = ctx.status;

  // 忽略 body。如果响应的 statusCode 是 body 为空的类型, 例如 204、205、304, 将 body 置为 null
  if (statuses.empty[code]) {
    ctx.body = null;
    return res.end();
  }

  if ('HEAD' === ctx.method) {
    // headersSent 属性是 Node 原生的 response 对象上的, 用于检查 HTTP 响应头是否已经被发送
    // 如果头未被发送, 并且响应头没有 Content-Length 属性, 那么添加 length 头
    if (!res.headersSent && !ctx.response.has('Content-Length')) {
      const { length } = ctx.response;
      if (Number.isInteger(length)) ctx.length = length;
    }
    return res.end();
  }

  // 如果 body 为 null
  if (null == body) {
    // 如果 response 对象上有 _explicitNullBody 属性。移除 Content-Type 和 Transfer-Encoding 响应头, 并返回结果
    if (ctx.response._explicitNullBody) {
      ctx.response.remove('Content-Type');
      ctx.response.remove('Transfer-Encoding');
      return res.end();
    }
    // 如果 HTTP 为 2+ 版本, 设置 body 为对应 HTTP 状态码; 否则先设置 body 为 ctx.message, 不存在时再设置为状态码
    if (ctx.req.httpVersionMajor >= 2) {
      body = String(code);
    } else {
      body = ctx.message || String(code);
    }
    // 如果 res.headersSent 不为真, 直接设置返回类型 ctx.type 为 text, ctx.length 为 Buffer.byteLength(body)
    if (!res.headersSent) {
      ctx.type = 'text';
      ctx.length = Buffer.byteLength(body);
    }
    return res.end(body);
  }

  // body 为 Buffer 或 String 时, 结束请求返回结果
  if (Buffer.isBuffer(body)) return res.end(body);
  if ('string' === typeof body) return res.end(body);

  // body 为 Stream 时, 开启管道 body.pipe(res)
  if (body instanceof Stream) return body.pipe(res);

  // body 为 JSON 类型时, 使用 JSON.stringify(body)转为字符串,并设置 ctx.length 后返回结果
  body = JSON.stringify(body);
  if (!res.headersSent) {
    ctx.length = Buffer.byteLength(body);
  }
  res.end(body);
}
```

`respond()` 函数实现的主要是不同情况下的返回处理，按照上述代码里面的注释理解即可，整体没有什么难度

::: warning

在 Koa 的一些大型项目中，如果页面突然返回 Not Found，要检查一下是不是没有写 ctx.body。如果场景比较复杂，没有考虑这一点，排错的时候就容易跑偏

:::

### 异常处理

Koa 处理异常的逻辑比较简单，就是简单地打印到控制台

```javascript
callback() {
  const fn = compose(this.middleware);
  // 如果 application 中监听 error 事件的个数大于0, 则用自己的异常监听
  // 否则, 执行 Koa 默认的异常监听逻辑
  if (!this.listenerCount('error')) this.on('error',  this.onerror);

  const handleRequest = (req, res) => {
    const ctx = this.createContext(req, res);
    return this.handleRequest(ctx, fn);
  };

  return handleRequest;
}
```

在执行回调函数的时候，`Koa` 会判断一下 `app` 上属性 `listener-Count('error')` 是否存在，如果存在则执行自己定义的 `error` 监听逻辑，否则执行 `Koa` 默认的 `error` 监听逻辑。因为 `Application` 类继承 `Node` 的 `Emitter` 类，所以 `Application` 是具有事件监听能力的

::: info

如果看了源码，就会发现 `listenerCount` 并不是 `Application` 类的一个属性。这里需要注意的一点是，`Application` 继承 `Emitter`，就是继承 `NodeJS.EventEmitter`，因为 `EventEmitter` 类有静态方法 `listenerCount()`，所以如果自己定义 `app.on('error', (error) => {})`，listenerCount 会自动加 1

:::

再看一下 `onerror()` 方法的实现，代码如下

```javascript
onerror(err) {
  const isNativeError = Object.prototype.toString.call(err) === '[object Error]' || err instanceof Error;
  // 如果不是 NativeError, 则直接抛出异常
  if (!isNativeError) throw new TypeError(util.format('non-error thrown: %j', err));
  // err 状态码为 404 或 err.expose为true时, 不输出错误
  if (404 === err.status || err.expose) return;
  if (this.silent) return;

  // 直接输出错误栈到控制台
  const msg = err.stack || err.toString();
  console.error(`\n${msg.replace(/^/gm, '  ')}\n`);
}
```

Koa 默认的异常处理确实比较简单，一般在企业里的实际 Koa 项目中，会自定义一些更完善的异常处理方案。这里举一个具体实例，比如在中间件中有一些异步操作，如果异步操作中有异常，Koa 是获取不到错误信息的：

```javascript
const Koa = require('koa');
const app = new Koa();

app.use(async (ctx, next) => {
  setTimeout(() => {
    throw Error('这里出错了！')
  }, 1000)
  ctx.body= 'hello world';
});

app.listen(4000, () => {
  console.log('server is running, port is 4000')
})
```

中间件中有一个定时器，在 1 秒后抛出异常，那么这个异常 Koa 是捕获不到的，最终导致进程异常退出，这个时候就需要自己做一些兜底处理了，比较通用的方法是加一个 `uncaughtException` 类型事件的监听，这样就能捕获上述异常：

```javascript
process.on('uncaughtException', (error) => {
  console.log(error)
})
```

## Context 核心实现

`Context` 可以理解为上下文，其实就是常用的 `ctx` 对象

### 委托机制

`context.js` 中的委托机制使用了一个包 `delegates`，如果想深入了解 `delegates` 的原理，要先学会使用 `delegates`

```javascript
var delegate = require('delegates');

var obj = {};
obj.request = {
  name: 'xiaoye',
  age: 29,
  sex: 'man',
  say: function(){
    console.log('hello koa!');
  }
};

// 将obj.request的相关属性委托到obj上, 使调用更加简便
delegate(obj, 'request')
  .method('say')
  .getter('name')
  .setter('nickname')
  .access('age');

obj.say(); // hello koa!
obj.nickname = 'SKHon';
console.log('nickname: ', obj.request.nickname) // SKHon
console.log('现在年龄: ',obj.age) // 29
obj.age = 30;
console.log('明年年龄: ',obj.age) // 30
```

首先解释一下链式调用几个方法的含义

- `method`：外部对象可以直接调用内部对象的函数
- `getter`：外部对象可以直接访问内部对象的值
- `setter`：外部对象可以直接修改内部对象的值
- `access`：包含 `getter` 与 `setter` 的功能

把 `obj.request` 对象上的属性委托给 `obj`，这样 `obj` 就可以直接访问 `obj.request` 中的属性了。这就是 Koa 要把 `ctx.request` 和 `ctx.response` 中的属性挂载到 ctx 上的原因，即更方便获取相关属性。接下来探索 delegates 的源码实现。整个核心实现共有 150 多行代码，比较简单，地址为 https://github.com/tj/node-delegates/blob/master/index.js

```javascript
function Delegator(proto, target) {
  if (!(this instanceof Delegator)) return new Delegator(proto, target);
  this.proto = proto;
  this.target = target;
  this.methods = [];
  this.getters = [];
  this.setters = [];
  this.fluents = [];
}
```

首先判断实例是否存在，不存在则进行 new 操作，存在则依然使用存在的实例，这是一个典型的单例设计模式。下面几个属性都是数组，用来存放代理的属性名。method 是如何代理的呢？其实逻辑也非常简单，源码如下

```javascript
Delegator.prototype.method = function(name){
  var proto = this.proto;
  var target = this.target;
  // 存入 methods 数组
  this.methods.push(name);

  // 以闭包的方式, 将对 proto 方法的调用转为对 this[target] 上相关方法的调用。apply 改变 this 的指向为 this[target]
  proto[name] = function(){
    return this[target][name].apply(this[target], arguments);
  };

  // 返回 delegator 实例对象, 从而实现链式调用
  return this;
};
```

先将代理的所有方法名存储在 `this.methods` 数组中，然后以闭包的方式将 `proto` 方法的调用转为对 `this[target]` 上相关方法的调用。

`setter`、`getter` 和 `access` 的源码实现如下：

```javascript
Delegator.prototype.access = function(name){
  return this.getter(name).setter(name);
};

Delegator.prototype.getter = function(name){
  var proto = this.proto;
  var target = this.target;
  this.getters.push(name); // 将属性名称存入对应类型的数组

  // 利用__defineGetter__设置proto的getter
  // 使得访问proto[name]获取的是proto[target][name]的值
  proto.__defineGetter__(name, function(){
    return this[target][name];
  });
  // 返回 delegator 实例, 实现链式调用
  return this;
};

Delegator.prototype.setter = function(name){
  var proto = this.proto;
  var target = this.target;
  this.setters.push(name); // 将属性名称存入对应类型的数组

  // 利用__defineSetter__设置proto的setter
  // 实现给proto[name]赋值时, 实际改变的是proto[target][name]的值
  proto.__defineSetter__(name, function(val){
    return this[target][name] = val;
  });
  return this;
};
```

再回到 Koa 中看一下上下文实现中的代理源码：

```javascript
delegate(proto, 'response')
  .method('attachment')
  .method('redirect')
  .method('remove')
  .method('vary')
  .method('has')
  .method('set')
  .method('append')
  .method('flushHeaders')
  .access('status')
  .access('message')
  .access('body')
  .access('length')
  .access('type')
  .access('lastModified')
  .access('etag')
  .getter('headerSent')
  .getter('writable');

delegate(proto, 'request')
  .method('acceptsLanguages')
  .method('acceptsEncodings')
  .method('acceptsCharsets')
  .method('accepts')
  .method('get')
  .method('is')
  .access('querystring')
  .access('idempotent')
  .access('socket')
  .access('search')
  .access('method')
  .access('query')
  .access('path')
  .access('url')
  .access('accept')
  .getter('origin')
  .getter('href')
  .getter('subdomains')
  .getter('protocol')
  .getter('host')
  .getter('hostname')
  .getter('URL')
  .getter('header')
  .getter('headers')
  .getter('secure')
  .getter('stale')
  .getter('fresh')
  .getter('ips')
  .getter('ip');
```

`Koa` 要把 `ctx.request` 和 `ctx.response` 的属性代理到 `ctx` 上，就是为了将 `ctx.request.path` 写成 `ctx.path`。少写一个单词，就是一种提效的表现。

### Cookie 的操作

`Koa` 服务一般都是 `BFF` 服务，涉及前端服务时通常会遇到用户登录的场景。`Cookie` 是用来记录用户登录状态的，`Koa` 本身也提供了修改 Cookie 的功能

```javascript
const Koa = require('koa');
const app = new Koa();

app.use( async (ctx, next) => {
  // 获取 Cookies 方法：ctx.cookies.get('koa-cookie')
  ctx.cookies.set('koa-cookie', '456', {
    maxAge: 1000
  });

  ctx.body= 'hello world';
});

app.listen(4000, () => {
  console.log('server is running, port is 4000')
})
```

处理 `Cookie` 可直接用 `ctx` 对象中 `cookies` 属性的 `set()` 和 `get()` 方法。上述实例中，当浏览器有请求时，`Koa` 经过中间件处理，返回的 `response` 对象中会自动设置 `Cookie` 到浏览器中

在源码中实现 `Cookie` 的相关部分也比较简单，代码如下：

```javascript
// 省略部分代码
const Cookies = require('cookies');
const proto = module.exports = {
  // 省略部分代码
  get cookies() {
    if (!this[COOKIES]) {
      this[COOKIES] = new Cookies(this.req, this.res, {
        keys: this.app.keys,
        secure: this.request.secure
      });
    }
    return this[COOKIES];
  },

  set cookies(_cookies) {
    this[COOKIES] = _cookies;
  }
}
```

通过 `set()` 和 `get()` 方法来对 `Cookie` 进行操作，实际也是引用了`Cookies` 这个包，具体操作参考其 API 即可

## request 具体实现

`request.js` 的实现比较简单，就是通过 `set()` 和 `get()` 方法对一些属性进行封装，方便开发者调用一些常用属性。假设请求为 http://127.0.0.1:4000/home?page=10，所有属性以及对应输出结果如下

例如：获取并设置 `headers` 对象

```javascript
get header() {
  return this.req.headers;
},

set header(val) {
  this.req.headers = val;
},

get headers() {
  return this.req.headers;
},

set headers(val) {
  this.req.headers = val;
},
```

## response 具体实现

`response.js` 的整体实现思路和 `request.js` 大体一致，也是通过 `set()` 和 `get()` 方法封装了一些常用属性。主要包括：

### 核心属性

```javascript
// status - 响应状态码
get status() {
  return this.res.statusCode;
},

set status(code) {
  if (this.headerSent) return;
  this._explicitStatus = true;
  this.res.statusCode = code;
  this.res.statusMessage = statuses[code];
},

// body - 响应体
get body() {
  return this._body;
},

set body(val) {
  this._body = val;
  // 根据 val 类型自动设置 Content-Length
},

// type - Content-Type
get type() {
  const type = this.get('Content-Type');
  if (!type) return '';
  return type.split(';')[0];
},

set type(type) {
  this.set('Content-Type', getType(type) || type);
}
```

### Body 类型处理

`response.js` 支持多种类型的响应体：

```javascript
// String
ctx.body = 'Hello World'

// Buffer
ctx.body = Buffer.from('Hello')

// Stream
ctx.body = fs.createReadStream('./file.txt')

// JSON Object
ctx.body = { message: 'Success' }

// null
ctx.body = null
```

在 `respond()` 函数中会根据 body 的类型进行不同的处理。

## 中间件机制详解

### koa-compose 原理

`koa-compose` 是 Koa 中间件机制的核心，它将多个中间件组合成一个函数。完整实现已在「Application 核心实现 → koa-compose 解析」一节逐行分析过，此处不再重复，仅给出执行流程图与示例解析。

#### 执行流程图

```
请求进入
    │
    ├─→ dispatch(0)
    │     │
    │     ├─→ middleware[0](ctx,%20dispatch.bind(null,%201))
    │     │     │
    │     │     ├─→ before next()
    │     │     │
    │     │     ├─→ await next() → dispatch(1)
    │     │     │     │
    │     │     │     ├─→ middleware[1](ctx,%20dispatch.bind(null,%202))
    │     │     │     │     │
    │     │     │     │     ├─→ before next()
    │     │     │     │     │
    │     │     │     │     ├─→ await next() → dispatch(2)
    │     │     │     │     │     │
    │     │     │     │     │     └─→ middleware[2](ctx,%20dispatch.bind(null,%203))
    │     │     │     │     │           │
    │     │     │     │     │           └─→ dispatch(3) → Promise.resolve()
    │     │     │     │     │
    │     │     │     │     └─→ after next()
    │     │     │     │
    │     │     │     └─→ after next()
    │     │     │
    │     │     └─→ after next()
    │     │
    │     └─→ Promise.resolve()
    │
    └─→ respond(ctx)
```

#### 示例解析

```javascript
const Koa = require('koa')
const app = new Koa()

app.use(async (ctx, next) => {
  console.log('1. 中间件 1 - 请求')
  await next()
  console.log('6. 中间件 1 - 响应')
})

app.use(async (ctx, next) => {
  console.log('2. 中间件 2 - 请求')
  await next()
  console.log('5. 中间件 2 - 响应')
})

app.use(async (ctx) => {
  console.log('3. 中间件 3 - 处理')
  ctx.body = 'Hello Koa'
  console.log('4. 中间件 3 - 结束')
})

// 执行顺序: 1 → 2 → 3 → 4 → 5 → 6
```

### 异步错误处理

```javascript
// compose 内部的错误处理
try {
  return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))
} catch (err) {
  return Promise.reject(err)
}

// Application 的错误捕获
return fnMiddleware(ctx).then(handleResponse).catch(onerror)
```

## 性能优化

### 1. 减少中间件数量

```javascript
// ❌ 不推荐：多个单独的中间件
app.use(async (ctx, next) => {
  ctx.set('X-Custom-1', 'value1')
  await next()
})

app.use(async (ctx, next) => {
  ctx.set('X-Custom-2', 'value2')
  await next()
})

// ✅ 推荐：合并为一个中间件
app.use(async (ctx, next) => {
  ctx.set('X-Custom-1', 'value1')
  ctx.set('X-Custom-2', 'value2')
  await next()
})
```

### 2. 异步操作优化

```javascript
// ❌ 不推荐：串行执行
app.use(async (ctx) => {
  const user = await getUser(ctx.params.id)
  const posts = await getPosts(user.id)
  const comments = await getComments(posts[0].id)
  ctx.body = { user, posts, comments }
})

// ✅ 推荐：并行执行
app.use(async (ctx) => {
  const userId = ctx.params.id
  const [user, posts] = await Promise.all([
    getUser(userId),
    getPosts(userId)
  ])
  ctx.body = { user, posts }
})
```

### 3. 缓存优化

```javascript
// 静态资源缓存
app.use(serve('./public', {
  maxage: 365 * 24 * 60 * 60 * 1000,  // 1 年
  gzip: true,
  brotli: true
}))

// API 响应缓存
app.use(async (ctx, next) => {
  await next()
  
  if (ctx.status === 200 && ctx.method === 'GET') {
    ctx.set('Cache-Control', 'public, max-age=3600')
  }
})
```

### 4. 响应压缩

```javascript
const compress = require('koa-compress')

app.use(compress({
  threshold: 1024,  // 超过 1KB 才压缩
  gzip: {
    flush: require('zlib').constants.Z_SYNC_FLUSH
  }
}))
```

### 5. 内存优化

```javascript
// 避免大对象存储在 ctx.state
app.use(async (ctx, next) => {
  // ❌ 不推荐
  ctx.state.bigData = await getBigData()
  
  // ✅ 推荐：只存储必要信息
  ctx.state.userId = ctx.params.id
  await next()
  // 处理完后清理
  ctx.state = null
})
```

## 常见问题

### Q1: 为什么默认状态码是 404？

```javascript
// Application.handleRequest 源码
handleRequest(ctx, fnMiddleware) {
  const res = ctx.res;
  res.statusCode = 404;  // 默认 404
  // ...
}
```

**原因**：如果中间件没有设置 `ctx.body`，说明请求没有被正确处理，应该返回 404。这是一种防御性编程。

**解决方案**：

```javascript
// 确保在中间件中设置 ctx.body
app.use(async (ctx) => {
  ctx.body = 'Hello World'  // 设置 body 后状态码自动变为 200
})
```

### Q2: 为什么 next 返回 Promise？

```javascript
// koa-compose 实现
return Promise.resolve(fn(context, dispatch.bind(null, i + 1)))
```

**原因**：
1. 支持异步中间件
2. 统一同步和异步流程
3. 方便错误捕获

**正确用法**：

```javascript
app.use(async (ctx, next) => {
  // 等待下游中间件完成
  await next()
  
  // 响应阶段的处理
  ctx.set('X-Response-Time', Date.now() - start)
})
```

### Q3: 如何捕获异步错误？

```javascript
// ❌ 无法捕获定时器中的错误
app.use(async (ctx, next) => {
  setTimeout(() => {
    throw new Error('Error!')  // 进程崩溃
  }, 1000)
  await next()
})

// ✅ 方式 1：使用 try/catch
app.use(async (ctx, next) => {
  try {
    await someAsyncOperation()
    await next()
  } catch (err) {
    ctx.status = 500
    ctx.body = { error: err.message }
  }
})

// ✅ 方式 2：全局错误处理
app.on('error', (err, ctx) => {
  console.error('Server Error:', err)
})

// ✅ 方式 3：进程级别的错误捕获
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason)
})
```

### Q4: ctx.body 支持哪些类型？

```javascript
// String
ctx.body = 'Hello World'
// Content-Type: text/plain; charset=utf-8

// Buffer
ctx.body = Buffer.from('Hello')
// 直接发送二进制数据

// Stream
ctx.body = fs.createReadStream('./file.txt')
// 流式传输

// Object (JSON)
ctx.body = { message: 'Success' }
// Content-Type: application/json; charset=utf-8

// null
ctx.body = null
// 根据状态码决定响应内容
```

### Q5: 如何理解洋葱模型？

```javascript
// 中间件队列
middleware = [fn1, fn2, fn3]

// 执行顺序（递归调用）
fn1(ctx, () => fn2(ctx, () => fn3(ctx, () => Promise.resolve())))

// 实际执行
fn1 before next
  fn2 before next
    fn3 execute
  fn2 after next
fn1 after next

// 时序图
请求 → fn1 → fn2 → fn3 → fn2 → fn1 → 响应
```

### Q6: 为什么 Koa 不内置路由？

**设计理念**：
1. **极简主义**：核心代码保持最小
2. **灵活性**：开发者可以自由选择路由方案
3. **可维护性**：功能解耦，易于维护

**解决方案**：

```javascript
// 使用 @koa/router
const Router = require('@koa/router')
const router = new Router()

router.get('/users', (ctx) => {
  ctx.body = 'Users'
})

app.use(router.routes())
```

### Q7: 如何实现中间件的单元测试？

```javascript
const request = require('supertest')
const Koa = require('koa')

describe('Logger Middleware', () => {
  let app
  
  beforeEach(() => {
    app = new Koa()
    app.use(logger())
    app.use((ctx) => {
      ctx.body = 'test'
    })
  })
  
  it('should log request', async () => {
    const consoleSpy = jest.spyOn(console, 'log')
    
    await request(app.callback())
      .get('/')
      .expect(200)
    
    expect(consoleSpy).toHaveBeenCalled()
  })
})
```

## 源码阅读建议

### 阅读顺序

1. **application.js**：理解应用创建和中间件注册
2. **koa-compose**：深入理解中间件执行机制
3. **context.js**：了解上下文封装和委托机制
4. **request.js** 和 **response.js**：学习请求响应的封装

### 关键概念

#### 1. 继承关系

```javascript
// Application 继承 EventEmitter
class Application extends Emitter {
  // 具有事件监听能力
  on('error', handler)
  emit('error', err)
}

// Context 通过 Object.create 继承
const ctx = Object.create(app.context)
```

#### 2. 委托模式

```javascript
// context.js 中使用 delegates
delegate(proto, 'response')
  .access('body')   // ctx.body → ctx.response.body
  .access('status') // ctx.status → ctx.response.status

delegate(proto, 'request')
  .access('query')  // ctx.query → ctx.request.query
  .access('path')   // ctx.path → ctx.request.path
```

#### 3. 懒加载

```javascript
// Cookie 懒加载
get cookies() {
  if (!this[COOKIES]) {
    this[COOKIES] = new Cookies(this.req, this.res, {
      keys: this.app.keys,
      secure: this.request.secure
    })
  }
  return this[COOKIES]
}
```

### 调试技巧

```javascript
// 1. 使用 debug 模块
const debug = require('debug')('koa:application')

// 启用调试
// DEBUG=koa:* node app.js

// 2. 添加日志中间件
app.use(async (ctx, next) => {
  console.log(`>>> ${ctx.method} ${ctx.url}`)
  await next()
  console.log(`<<< ${ctx.status}`)
})

// 3. 检查中间件顺序
console.log(app.middleware)
```

### 相关资源

#### 官方资源

- [Koa GitHub](https://github.com/koajs/koa)
- [koa-compose](https://github.com/koajs/compose)
- [delegates](https://github.com/tj/node-delegates)

#### 推荐阅读

- [Koa 设计模式](https://github.com/koajs/koa/wiki)
- [Node.js HTTP 文档](https://nodejs.org/api/http.html)
- [Promise/A+ 规范](https://promisesaplus.com/)

### 精简版源码速读

为帮助快速理解 Koa 核心流程，以下是将 `application.js` 删减至约 100 行、`context.js` 删减至约 50 行的精简版本，剔除了非核心逻辑，保留了完整的主干流程。

#### application.js 精简版

```javascript
const onFinished = require('on-finished')
const response = require('./response')
const compose = require('koa-compose')
const context = require('./context')
const request = require('./request')
const Emitter = require('events')
const util = require('util')
const Stream = require('stream')
const http = require('http')
const only = require('only')

// 继承 Emitter，暴露一个 Application 类
module.exports = class Application extends Emitter {
  constructor() {
    super()
    this.proxy = false
    this.middleware = []
    this.subdomainOffset = 2
    this.env = process.env.NODE_ENV || 'development'
    this.context = Object.create(context)
    this.request = Object.create(request)
    this.response = Object.create(response)
    if (util.inspect.custom) {
      this[util.inspect.custom] = this.inspect
    }
  }

  // 等同于 http.createServer(app.callback()).listen(...)
  listen(...args) {
    const server = http.createServer(this.callback())
    return server.listen(...args)
  }

  // 返回 JSON 格式数据
  toJSON() {
    return only(this, ['subdomainOffset', 'proxy', 'env'])
  }

  // 把当前实例 JSON 格式化返回
  inspect() { return this.toJSON() }

  // 把中间件压入数组
  use(fn) {
    this.middleware.push(fn)
    return this
  }

  // 返回 Node 原生的 Server request 回调
  callback() {
    const fn = compose(this.middleware)
    const handleRequest = (req, res) => {
      const ctx = this.createContext(req, res)
      return this.handleRequest(ctx, fn)
    }

    return handleRequest
  }

  // 在回调中处理 request 请求对象
  handleRequest(ctx, fnMiddleware) {
    const res = ctx.res
    // 先设置一个 404 的响应码，等后面来覆盖它
    res.statusCode = 404
    const onerror = err => ctx.onerror(err)
    const handleResponse = () => respond(ctx)
    onFinished(res, onerror)
    return fnMiddleware(ctx).then(handleResponse).catch(onerror)
  }

  // 初始化一个上下文，为 req/res 建立各种引用关系，方便使用
  createContext(req, res) {
    const context = Object.create(this.context)
    const request = context.request = Object.create(this.request)
    const response = context.response = Object.create(this.response)
    context.app = request.app = response.app = this
    context.req = request.req = response.req = req
    context.res = request.res = response.res = res
    request.ctx = response.ctx = context
    request.response = response
    response.request = request
    context.originalUrl = request.originalUrl = req.url
    context.state = {}
    return context
  }
}

// 响应处理的辅助函数
function respond(ctx) {
  const res = ctx.res
  let body = ctx.body
  // 此处删减了代码，如 head/空 body 等问题的处理策略等
  // 基于 Buffer/string 和 流，分别给予响应
  if (Buffer.isBuffer(body)) return res.end(body)
  if ('string' == typeof body) return res.end(body)
  if (body instanceof Stream) return body.pipe(res)

  // 最后则是以 JSON 的格式返回
  body = JSON.stringify(body)
  res.end(body)
}
```

精简版 `application.js` 的核心要点：

- `new Koa()` 创建的 `app` 实例仅在调用 `listen()` 时才创建 HTTP Server
- `use(fn)` 将传入的函数压入中间件队列，按洋葱模型逐级进入逐级穿出
- Koa 支持 Buffer/String/JSON/Stream 等数据类型的响应
- 上下文 `context` 在 Node 原生 request 进入（即异步回调执行时）才创建，每个请求拥有独立上下文，互不污染
- `createContext()` 方法将上下文与原生对象、请求对象和响应对象之间建立各种引用关系，方便在业务代码和中间件中使用

#### context.js 精简版

```javascript
const util = require('util')
const delegate = require('delegates')
const Cookies = require('cookies')

// 上下文 prototype 的原型
const proto = module.exports = {
  // 挑选上下文的内容，JSON 格式化处理后返回
  toJSON() {
    return {
      request: this.request.toJSON(),
      response: this.response.toJSON(),
      app: this.app.toJSON(),
      originalUrl: this.originalUrl,
      req: '<original node req>',
      res: '<original node res>',
      socket: '<original node socket>'
    }
  },

  // 错误捕获处理
  onerror(err) {},
  // 拿到 cookies
  get cookies() {},
  // 设置 cookies
  set cookies(_cookies) {}
}

// 对新版 Node 增加自定义 inspect 的支持
if (util.inspect.custom) {
  module.exports[util.inspect.custom] = module.exports.inspect
}

// 为响应对象绑定原型方法
delegate(proto, 'response')
  .method('attachment').method('redirect').method('remove').method('vary')
  .method('set').method('append').method('flushHeaders')
  .access('status').access('message').access('body').access('length').access('type')
  .access('lastModified').access('etag')
  .getter('headerSent').getter('writable')

// 为请求对象绑定原型方法
delegate(proto, 'request')
  .method('acceptsLanguages').method('acceptsEncodings').method('acceptsCharsets')
  .method('accepts').method('get').method('is')
  .access('querystring').access('idempotent').access('socket').access('search')
  .access('method').access('query').access('path').access('url').access('accept')
  .getter('origin').getter('href').getter('subdomains').getter('protocol').getter('host')
  .getter('hostname').getter('URL').getter('header').getter('headers').getter('secure')
  .getter('stale').getter('fresh').getter('ips').getter('ip')
```

精简版 `context.js` 的核心要点：

- `ctx` 上之所以能直接使用 `request` 和 `response` 的属性与方法，正是 `delegate` 机制的作用——它将内部对象的属性和方法委托到外部对象上
- `method`：委托函数调用，如 `ctx.redirect()` 实际调用 `ctx.response.redirect()`
- `access`：委托读写属性，如 `ctx.body` 实际读写 `ctx.response.body`
- `getter`：委托只读属性，如 `ctx.ip` 实际读取 `ctx.request.ip`

### Koa 对 Node 基础能力的使用映射

Koa 作为 Node.js 的上层框架，其核心实现深度依赖 Node 的基础模块能力。以下映射图展示了 Koa 源码中各模块对 Node 基础能力的使用关系：

```
┌───────────────────────────────────────────────────────────────────┐
│                        Koa 框架核心模块                            │
├─────────────┬─────────────┬─────────────┬─────────────────────────┤
│application.js│  context.js │ request.js  │    response.js         │
├─────────────┴─────────────┴─────────────┴─────────────────────────┤
│                        使用的 Node 基础能力                        │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  events  │  │   http   │  │  stream  │  │   util   │          │
│  │ (Emitter)│  │(Server)  │  │(Readable │  │(inspect) │          │
│  │          │  │          │  │/Writable)│  │          │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  path    │  │  buffer  │  │   fs     │  │ process  │          │
│  │(路由解析)│  │(二进制    │  │(文件流   │  │(env/     │          │
│  │          │  │ 响应)    │  │ 响应)    │  │ exit)    │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                        │
│  │ url      │  │ querystring│ │ crypto  │                        │
│  │(URL解析) │  │(参数解析) │  │(Cookie  │                        │
│  │          │  │          │  │ 签名)   │                        │
│  └──────────┘  └──────────┘  └──────────┘                        │
│                                                                    │
├────────────────────────────────────────────────────────────────────┤
│                     具体使用场景映射                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Node 模块      │  Koa 中的使用场景                                │
│  ──────────────────────────────────────────────────────────────── │
│  events         │  Application 继承 Emitter，实现错误事件监听      │
│                 │  app.on('error') / app.emit('error')             │
│  http           │  http.createServer() 创建 HTTP Server            │
│                 │  http.IncomingMessage / http.ServerResponse      │
│  stream         │  ctx.body 支持 Stream 类型响应                   │
│                 │  body.pipe(res) 流式输出                          │
│  buffer         │  Buffer.isBuffer(body) 检测二进制响应            │
│                 │  Buffer.byteLength(body) 计算响应长度            │
│  util           │  util.inspect.custom 自定义对象格式化            │
│                 │  util.format 格式化错误信息                       │
│  process        │  process.env.NODE_ENV 获取运行环境               │
│  path           │  路径解析与拼接（多在中间件和路由中使用）         │
│  url            │  req.url 解析请求 URL                            │
│  querystring    │  解析和序列化查询字符串                           │
│  crypto         │  Cookie 签名验证（通过 keys 配置）               │
│  fs             │  静态文件服务中间件中使用文件流                   │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

::: info

学习 Koa 源码时，建议重点关注其网络进出模型（HTTP 请求-响应的完整流程），而不需要过多关注底层细节。理解 `http.createServer` -> `callback()` -> `createContext()` -> `compose()` -> `handleRequest()` -> `respond()` 这条主线即可把握 Koa 的核心脉络。

:::

### 源码练习

#### 手写简化版 Koa

```javascript
const http = require('http')

class Koa {
  constructor() {
    this.middleware = []
  }
  
  use(fn) {
    this.middleware.push(fn)
    return this
  }
  
  listen(...args) {
    const server = http.createServer(this.callback())
    return server.listen(...args)
  }
  
  callback() {
    const fn = this.compose(this.middleware)
    
    return (req, res) => {
      const ctx = { req, res }
      fn(ctx).then(() => {
        res.end(ctx.body || 'Not Found')
      }).catch(err => {
        res.statusCode = 500
        res.end(err.message)
      })
    }
  }
  
  compose(middleware) {
    return function(context) {
      let index = -1
      
      function dispatch(i) {
        if (i <= index) return Promise.reject(new Error('next() called multiple times'))
        index = i
        
        const fn = middleware[i]
        if (!fn) return Promise.resolve()
        
        try {
          return Promise.resolve(fn(context, () => dispatch(i + 1)))
        } catch (err) {
          return Promise.reject(err)
        }
      }
      
      return dispatch(0)
    }
  }
}

// 测试
const app = new Koa()

app.use(async (ctx, next) => {
  console.log('Middleware 1 start')
  await next()
  console.log('Middleware 1 end')
})

app.use(async (ctx, next) => {
  console.log('Middleware 2 start')
  ctx.body = 'Hello Koa'
  await next()
  console.log('Middleware 2 end')
})

app.listen(3000)
```

## 总结

### Koa 核心要点

1. **极简设计**：核心仅 4 个文件，约 2000 行代码
2. **洋葱模型**：中间件的双向执行流程
3. **async/await**：完善的异步流程控制
4. **Context 封装**：统一的请求响应接口
5. **委托机制**：简化 API 调用

### 源码亮点

- **compose 函数**：优雅的中间件组合
- **懒加载设计**：性能优化
- **错误处理**：多层错误捕获机制
- **委托模式**：简化 API 调用

### 学习收获

通过阅读 Koa 源码，可以学到：

1. 如何设计一个可扩展的框架
2. Promise 和 async/await 的深入应用
3. 中间件模式的实现
4. Node.js HTTP 服务的封装
5. 错误处理的最佳实践

---

> 最后更新：2026年2月
