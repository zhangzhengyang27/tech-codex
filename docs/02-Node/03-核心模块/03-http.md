---
title: HTTP 模块
description: http 模块的服务端/客户端 API、请求生命周期、连接管理与基于 llhttp 的解析架构
keywords: [Node.js, http]
category: Node.js
tags: [Node.js, 核心模块]
---







# HTTP 模块

## 概述

`http` 模块是 Node.js 网络编程的核心——它构建在 `net` 模块（TCP）之上，实现了 HTTP/1.1 协议的完整解析与生成能力。从底层的 HTTP 解析器（llhttp）到高层的 `http.Server` / `http.ClientRequest`，http 模块的架构体现了 Node.js "薄封装、大生态"的设计哲学。

```mermaid
flowchart TD
    subgraph "应用层"
        APP["Express / Koa / 原生 http"]
    end

    subgraph "HTTP 模块"
        SERVER["http.Server<br/>IncomingMessage + ServerResponse"]
        CLIENT["http.ClientRequest<br/>IncomingMessage"]
    end

    subgraph "底层机制"
        PARSER["llhttp 解析器<br/>C 实现的状态机"]
        FL["FreeList<br/>HTTPParser 对象池"]
        NET["net.Server / net.Socket<br/>TCP 连接管理"]
    end

    APP --> SERVER
    APP --> CLIENT
    SERVER --> PARSER
    CLIENT --> PARSER
    PARSER --> FL
    PARSER --> NET
```

## HTTP 解析器架构：llhttp

### 从 http-parser 到 llhttp

Node.js 早期使用 Ryan Dahl 编写的 `http-parser`（C 语言），后来因维护困难和性能瓶颈，于 v12.0.0 切换为 `llhttp`——一个基于 TypeScript 生成 C 代码的 HTTP 解析器：

| 维度 | http-parser | llhttp |
|------|------------|--------|
| 语言 | C（手写） | TypeScript → C（代码生成） |
| 状态机 | 手动实现 | 自动生成 |
| 维护性 | 差（大量宏） | 好（类型安全） |
| 性能 | 基准 | ~20% 更快 |
| 安全性 | 多个 CVE | 更好的边界检查 |

> 注：表中性能数据为社区测试的粗略量级，实际表现因报文大小与负载而异。

### llhttp 的状态机

llhttp 本质是一个**有限状态机**，逐字节解析 HTTP 报文：

```mermaid
flowchart TD
    A["接收到数据"] --> B["HTTP 解析状态机"]
    B --> C{当前状态}

    C -->|"开始"| D["解析请求行<br/>GET /path HTTP/1.1"]
    C -->|"请求行完成"| E["解析请求头<br/>Header: Value"]
    C -->|"头部完成"| F{"是否有消息体？"}

    F -->|是| G["解析消息体<br/>Content-Length / chunked"]
    F -->|否| H["请求完成 → 触发 'request' 事件"]

    G --> I{"Transfer-Encoding?"}
    I -->|"chunked"| J["逐块解析<br/>size\\r\\ndata\\r\\n"]
    I -->|"Content-Length"| K["读取指定长度"]
    I -->|"无"| L["读到连接关闭"]

    J --> H
    K --> H
    L --> H

    D --> E --> F
```

> 注意：`'request'` 事件在请求行与请求头解析完成后即触发（此时可开始流式读取请求体），不必等消息体解析完毕。

### HTTPParser 对象池 — FreeList

Node.js 使用 **FreeList** 模式复用 HTTPParser 实例，避免频繁的 C++ 对象创建/销毁：

```javascript
// 简化的 FreeList 实现
class FreeList {
  constructor(name, max, ctor) {
    this.name = name;
    this.ctor = ctor;
    this.max = max;
    this.list = [];  // 空闲列表
  }

  alloc() {
    if (this.list.length > 0) {
      return this.list.pop();  // 复用已有实例
    }
    return new this.ctor();    // 列表为空时创建新实例
  }

  free(obj) {
    if (this.list.length < this.max) {
      this.list.push(obj);    // 归还到池中
    }
    // 超出 max 则丢弃（GC 回收）
  }
}

const parsers = new FreeList('http-parser', 1000, HTTPParser); // HTTPParser 为 Node 内部解析器类，此处仅示意
```

```mermaid
sequenceDiagram
    participant Conn as 新 TCP 连接
    participant FL as FreeList
    participant P as HTTPParser
    participant CB as 回调

    Conn->>FL: alloc()
    alt 空闲列表有实例
        FL->>P: pop() → 复用
    else 空闲列表为空
        FL->>P: new HTTPParser()
    end
    P->>P: 重新初始化状态
    Conn->>P: socket 数据传入
    P->>CB: onHeadersComplete
    P->>CB: onBody
    P->>CB: onMessageComplete
    Conn->>FL: free(parser)
    Note over FL: parser 归还池中等待复用
```

## HTTP 服务端

### 基本创建

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### 请求生命周期

```mermaid
sequenceDiagram
    participant C as 客户端
    participant S as http.Server
    participant P as llhttp 解析器
    participant H as 请求处理函数

    C->>S: TCP 连接 (三次握手)
    S->>S: 'connection' 事件 → 创建 socket
    C->>S: HTTP 请求数据
    S->>P: 数据传入解析器
    P->>P: 解析请求行 + 请求头
    P->>S: headersComplete
    S->>S: 创建 IncomingMessage (req)
    S->>S: 创建 ServerResponse (res)
    S->>H: 'request' 事件 → (req, res)
    P->>P: 解析请求体
    P->>S: onBody → req 'data' 事件
    P->>S: messageComplete → req 'end' 事件
    H->>S: res.writeHead() + res.end()
    S->>C: HTTP 响应
    Note over S,C: Connection: keep-alive → 连接保持
    Note over S,C: Connection: close → 关闭连接
```

### IncomingMessage — 请求对象

`IncomingMessage` 继承自 `Readable` Stream：

```javascript
const server = http.createServer((req, res) => {
  // 请求行
  req.method;       // 'GET'
  req.url;          // '/path?query=value'
  req.httpVersion;  // '1.1'

  // 请求头
  req.headers;      // { 'content-type': 'application/json', ... }
  req.rawHeaders;   // ['Content-Type', 'application/json', ...]（原始顺序）

  // 请求体（Readable Stream）
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString();
    console.log(body);
  });
});
```

### ServerResponse — 响应对象

`ServerResponse` 继承自 `Writable` Stream：

```javascript
// 设置状态码和响应头
res.statusCode = 200;
res.setHeader('Content-Type', 'application/json');
res.setHeader('X-Custom', 'value');

// 写入响应头（不可更改）
res.writeHead(200, {
  'Content-Type': 'application/json',
  'Set-Cookie': ['type=ninja', 'lang=js'],
});

// 写入响应体
res.write('{"data":');
res.write('"hello"}');
res.end();  // 结束响应

// 简写
res.end(JSON.stringify({ data: 'hello' }));
```

### 响应体的三种模式

```mermaid
flowchart TD
    A["res.end()"] --> B{"是否传入了数据？"}
    B -->|是| C["写入数据 + 结束"]
    B -->|否| D["仅结束响应"]

    E["res.write() + res.end()"] --> F["流式写入<br/>适用于大响应"]
    G["res.writeHead() → res.end()"] --> H["固定响应<br/>适用于小响应"]
```

#### 1. 固定响应（小数据）

```javascript
res.writeHead(200, { 'Content-Type': 'text/html' });
res.end('<h1>Hello</h1>');
```

#### 2. 流式响应（大数据）

```javascript
const fs = require('fs');

res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
fs.createReadStream('large-file.bin').pipe(res);
```

#### 3. Server-Sent Events

```javascript
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
});

setInterval(() => {
  res.write(`data: ${JSON.stringify({ time: Date.now() })}\n\n`);
}, 1000);
```

## HTTP 客户端

### 基本请求

```javascript
const http = require('http');

const req = http.request({
  hostname: 'example.com',
  port: 80,
  path: '/api/data',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
}, (res) => {
  console.log(`状态码: ${res.statusCode}`);
  console.log(`响应头: ${JSON.stringify(res.headers)}`);

  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(data); });
});

req.write(JSON.stringify({ key: 'value' }));
req.end();
```

### GET 请求简写

```javascript
http.get('http://example.com/api/data', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => { console.log(data); });
}).on('error', (err) => {
  console.error(`请求错误: ${err.message}`);
});
```

### 请求生命周期

```mermaid
sequenceDiagram
    participant App as 应用代码
    participant Req as ClientRequest
    participant Sock as Socket
    participant Res as IncomingMessage
    participant Server as 远程服务器

    App->>Req: http.request(options, callback)
    Req->>Sock: 建立 TCP 连接
    Sock->>Server: SYN → SYN-ACK → ACK
    Req->>Server: 发送 HTTP 请求
    Note over Req: req.write(body)
    Note over Req: req.end()

    Server->>Res: 响应头到达
    Res->>App: callback(res)
    Server->>Res: 响应体数据
    Res->>App: 'data' 事件
    Server->>Res: 响应结束
    Res->>App: 'end' 事件
```

### 请求超时与错误处理

```javascript
const req = http.request(options, callback);

// 连接超时
req.setTimeout(5000, () => {
  req.destroy(new Error('Connection timeout'));
});

// 错误处理
req.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.error('连接被拒绝');
  } else if (err.code === 'ETIMEDOUT') {
    console.error('连接超时');
  } else {
    console.error(err.message);
  }
});

req.end();
```

## Keep-Alive 与连接复用

HTTP/1.1 默认启用 Keep-Alive，同一个 TCP 连接可以发送多个请求：

```mermaid
sequenceDiagram
    participant C as 客户端
    participant S as 服务器

    C->>S: TCP 连接建立
    C->>S: 请求 1
    S->>C: 响应 1
    Note over C,S: 连接保持 (keep-alive)
    C->>S: 请求 2
    S->>C: 响应 2
    Note over C,S: 连接保持
    C->>S: 请求 3
    S->>C: 响应 3
    Note over C,S: 连接关闭或超时
```

```javascript
// 服务端 Keep-Alive 配置
const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Connection': 'keep-alive',
    'Keep-Alive': 'timeout=5, max=100',
  });
  res.end('OK');
});

server.keepAliveTimeout = 5000;   // 空闲超时（默认 5s）
server.maxRequestsPerSocket = 100; // 每个连接最大请求数
```

```javascript
// 客户端 Keep-Alive
const agent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: Infinity,
  maxFreeSockets: 256,
  timeout: 5000,
});

const req = http.request({
  hostname: 'example.com',
  agent,  // 使用自定义 Agent
}, callback);
```

## Agent — 连接池管理

`http.Agent` 管理客户端的连接池，控制每个 origin 的并发连接数：

```mermaid
flowchart TD
    subgraph "Agent 连接池"
        direction TB
        ORIGIN["example.com:80"]
        ORIGIN --> P1["活跃连接 1"]
        ORIGIN --> P2["活跃连接 2"]
        ORIGIN --> P3["活跃连接 3 (maxSockets=3)"]

        ORIGIN --> F1["空闲连接 1 (keep-alive)"]
        ORIGIN --> F2["空闲连接 2 (keep-alive)"]

        Q["等待队列<br/>请求 4, 5, 6..."]
    end

    P1 -->|"请求完成"| F1
    Q -->|"连接释放"| P1
```

```javascript
const agent = new http.Agent({
  maxSockets: 10,          // 每个 origin 最大并发连接数
  maxFreeSockets: 5,       // 每个 origin 最大空闲连接数
  keepAlive: true,         // 启用 Keep-Alive
  keepAliveMsecs: 1000,    // TCP Keep-Alive 探测的初始延迟（毫秒）
  timeout: 30000,          // socket 超时
  scheduling: 'lifo',      // 调度策略：lifo（默认）/ fifo
});
```

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `maxSockets` | `Infinity` | 每个 origin 的最大并发连接 |
| `maxFreeSockets` | `256` | 每个 origin 的最大空闲连接 |
| `keepAlive` | `false` | 是否复用连接 |
| `scheduling` | `'lifo'` | LIFO 倾向复用最近使用的连接 |

## Chunked Transfer Encoding

当不知道响应体大小时，使用 **分块传输编码**：

```javascript
// ⚠️ 以下仅示意 chunked 的报文在线路上的样子；实际代码不要手写块大小，
// Node 会为 res.write() 的每次写入自动添加分块帧
res.writeHead(200, {
  'Transfer-Encoding': 'chunked',
  'Content-Type': 'text/plain',
});

// 写入分块
res.write('3\r\n');       // 块大小（十六进制）
res.write('hel\r\n');     // 块数据
res.write('2\r\n');
res.write('lo\r\n');
res.write('0\r\n');       // 结束块
res.write('\r\n');
res.end();
```

实际上 `res.write()` + `res.end()` 会自动处理 chunked 编码——当没有设置 `Content-Length` 时，Node.js 自动使用 chunked。

## 常见陷阱

### 1. 未消费请求体导致连接挂起

```javascript
// ❌ 未读取请求体，连接不会释放
server.on('request', (req, res) => {
  res.end('ok');
  // 如果客户端发送了 body，但服务端没读，连接可能挂起
});

// ✅ 始终消费请求体
server.on('request', (req, res) => {
  req.resume();  // 丢弃请求体
  res.end('ok');
});
```

### 2. 忘记调用 res.end

```javascript
// ❌ 响应永远不会结束，客户端一直等待
server.on('request', (req, res) => {
  res.write('hello');
  // 忘记调用 res.end()
});

// ✅ 始终调用 res.end()
server.on('request', (req, res) => {
  res.end('hello');
});
```

### 3. 请求体大小无限制导致 OOM

```javascript
// ❌ 无限制地缓存请求体
const chunks = [];
req.on('data', (chunk) => chunks.push(chunk));

// ✅ 限制请求体大小
const MAX_BODY = 1e6;  // 1MB
let bodySize = 0;
req.on('data', (chunk) => {
  bodySize += chunk.length;
  if (bodySize > MAX_BODY) {
    res.writeHead(413, { 'Connection': 'close' });
    res.end('Payload too large');
    req.destroy();
    return;
  }
  chunks.push(chunk);
});
```

### 4. HTTP Agent 的连接泄漏

```javascript
// ❌ 使用了 keep-alive Agent 但未正确清理
const agent = new http.Agent({ keepAlive: true });

// ✅ 在适当时候销毁 Agent
process.on('SIGTERM', () => {
  agent.destroy();
  server.close();
});
```
