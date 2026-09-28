---
title: WebSocket 与群聊
description: "实时的双向数据通信，一般会用 WebSocket 来做。本文从 WebSocket 协议原理讲起，用 Node 手写一个协议解析，再讲 Nest 里如何开发 WebSocket 服务，最后基于 Socket.io 的 room 实现群聊功能。"
keywords: [WebSocket, Socket.io, 协议, Nest, 群聊, room, 双向通信]
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# WebSocket 与群聊

实时的双向数据通信，一般会用 WebSocket 来做。本文从 WebSocket 协议原理讲起，用 Node 手写一个协议解析，再讲 Nest 里如何开发 WebSocket 服务，最后基于 Socket.io 的 room 实现群聊功能。

## 一、WebSocket 协议原理

HTTP 的协议格式很清楚，就是 header、body 这些。那 WebSocket 的协议格式是什么样的呢？

WebSocket 严格来说和 HTTP 没什么关系，是另外一种协议格式。但是需要一次从 HTTP 到 WebSocket 的切换过程。

切换过程详细来说是这样的：请求的时候带上这几个 header：

```
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Key: Ia3dQjfWrAug/6qm7mTZOg==
```

前两个很容易理解，就是升级到 websocket 协议的意思。第三个 header 是保证安全用的一个 key。

服务端返回这样的 header：

```
HTTP/1.1 101 Switching Protocols
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Accept: JkE58n3uIigYDMvC+KsBbGZsp1A=
```

和请求 header 类似，Sec-WebSocket-Accept 是对请求带过来的 Sec-WebSocket-Key 处理之后的结果。加入这个 header 的校验是为了确定对方一定是有 WebSocket 能力的，不然万一建立了连接对方却一直没消息，那不就白等了么。

那 Sec-WebSocket-Key 经过什么处理能得到 Sec-WebSocket-Accept 呢？用 node 实现了一下：

```javascript
const crypto = require('crypto');

function hashKey(key) {
  const sha1 = crypto.createHash('sha1');
  sha1.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
  return sha1.digest('base64');
}
```

也就是用客户端传过来的 key，加上一个固定的字符串 `258EAFA5-E914-47DA-95CA-C5AB0DC85B11`，经过 sha1 加密之后，转成 base64 的结果。

这一步之后就换到 websocket 的协议了，那是一个全新的协议。大家习惯的 http 协议是 key:value 的 header 带个 body 的文本协议，每个 header 都是容易理解的字符，好懂但传输占的空间太大。而 websocket 是二进制协议，一个字节可以用来存储很多信息：

- 协议的第一个字节，存储了 FIN（结束标志）、opcode（内容类型是 binary 还是 text）等信息。
- 第二个字节存储了 mask（是否做了掩码）、payload（数据长度）。

仅仅两个字节，就存储了很多信息，这就是二进制协议比文本协议好的地方。看到的 weboscket 的 message 的收发，其实底层都是拼成这样的格式，只是浏览器帮解析了这种格式的协议数据。

## 二、用 Node.js 手写 WebSocket 协议

新建个项目：

```
mkdir my-websocket
cd my-websocket
npm init -y
```

在 src/ws.js 定义个 MyWebSocket 的 class：

```javascript
const { EventEmitter } = require('events');
const http = require('http');

class MyWebsocket extends EventEmitter {
  constructor(options) {
    super(options);

    const server = http.createServer();
    server.listen(options.port || 8080);

    server.on('upgrade', (req, socket) => {

    });
  }
}
```

继承 EventEmitter 是为了可以用 emit 发送一些事件，外界可以通过 on 监听这个事件来处理。在构造函数里创建了一个 http 服务，当 upgrade 事件发生，也就是收到了 Connection: upgrade 的 header 的时候，返回切换协议的 header。

返回的 header 就是对 sec-websocket-key 做下处理：

```javascript
server.on('upgrade', (req, socket) => {
  this.socket = socket;
  socket.setKeepAlive(true);

  const resHeaders = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    'Sec-WebSocket-Accept: ' + hashKey(req.headers['sec-websocket-key']),
    '',
    ''
  ].join('\r\n');
  socket.write(resHeaders);

  socket.on('data', (data) => {
    console.log(data)
  });
  socket.on('close', (error) => {
      this.emit('close');
  });
});
```

拿到 socket，返回上面的 header，其中 key 做的处理就是前面聊过的算法：

```javascript
function hashKey(key) {
  const sha1 = crypto.createHash('sha1');
  sha1.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
  return sha1.digest('base64');
}
```

就这么简单，就已经完成协议切换了。

新建 src/index.js，引入实现的 ws 服务器，跑起来：

```javascript
const MyWebSocket = require('./ws');
const ws = new MyWebSocket({ port: 8080 });

ws.on('data', (data) => {
  console.log('receive data:' + data);
});

ws.on('close', (code, reason) => {
  console.log('close:', code, reason);
});
```

然后新建这样一个 index.html：

```html
<!DOCTYPE HTML>
<html>
<body>
    <script>
        const ws = new WebSocket("ws://localhost:8080");

        ws.onopen = function () {
            ws.send("发送数据");
            setTimeout(() => {
                ws.send("发送数据2");
            }, 3000)
        };

        ws.onmessage = function (evt) {
            console.log(evt)
        };

        ws.onclose = function () {
        };
    </script>
</body>

</html>
```

用浏览器的 WebSocket api 建立连接，发送消息。起个静态服务：

```
npx http-server .
```

然后浏览器访问这个 html，打开 devtools 就会发现协议切换成功了（这 3 个 header 还有 101 状态码都是返回的）。message 里也可以看到发送的消息。再去服务端看看，也收到了这个消息，只不过是 Buffer 的，也就是二进制的。

接下来只要按照协议格式解析这个 Buffer，并且生成响应格式的协议数据 Buffer 返回就可以收发 websocket 数据了。

需要第一个字节的后四位，也就是 opcode：

```javascript
const byte1 = bufferData.readUInt8(0);
let opcode = byte1 & 0x0f;
```

读取 8 位无符号整数的内容，也就是一个字节的内容，通过位运算取出后四位，这就是 opcode 了。

然后再处理第二个字节，第一位是 mask 标志位，后 7 位是 payload 长度：

```javascript
const byte2 = bufferData.readUInt8(1);
const str2 = byte2.toString(2);
const MASK = str2[0];
let payloadLength = parseInt(str2.substring(1), 2);
```

还是用 buffer.readUInt8 读取一个字节的内容。先转成二进制字符串，这时第一位就是 mask，然后再截取后 7 位的子串，parseInt 成数字，这就是 payload 长度了。

有同学可能问了，后面咋还有俩 payload 长度呢？这是因为数据不一定有多长，可能需要 16 位存长度，可能需要 32 位。于是 websocket 协议就规定了：

- 如果那个 7 位的内容不超过 125，那它就是 payload 长度。
- 如果 7 位的内容是 126，那就不用它了，用后面的 16 位的内容作为 payload 长度。
- 如果 7 位的内容是 127，也不用它了，用后面那个 64 位的内容作为 payload 长度。

其实还是容易理解的，就是 3 个 if else。用代码写出来就是这样的：

```javascript
let payloadLength = parseInt(str2.substring(1), 2);

let curByteIndex = 2;

if (payloadLength === 126) {
  payloadLength = bufferData.readUInt16BE(2);
  curByteIndex += 2;
} else if (payloadLength === 127) {
  payloadLength = bufferData.readBigUInt64BE(2);
  curByteIndex += 8;
}
```

这里的 curByteIndex 是存储当前处理到第几个字节的。如果是 126，那就从第 3 个字节开始，读取 2 个字节也就是 16 位的长度，用 buffer.readUInt16BE 方法。如果是 127，那就从第 3 个字节开始，读取 8 个字节也就是 64 位的长度，用 buffer.readBigUInt64BE 方法。

这样就拿到了 payload 的长度，然后再用这个长度去截取内容就好了。但在读取数据之前，还有个 mask 要处理，这个是用来还原内容的：读 4 个字节，就是 mask key，再后面的就可以根据 payload 长度读出来。

```javascript
let realData = null;

if (MASK) {
  const maskKey = bufferData.slice(curByteIndex, curByteIndex + 4);
  curByteIndex += 4;
  const payloadData = bufferData.slice(curByteIndex, curByteIndex + payloadLength);
  realData = handleMask(maskKey, payloadData);
} else {
  realData = bufferData.slice(curByteIndex, curByteIndex + payloadLength);
}
```

然后用 mask key 来解密数据。这个算法也是固定的，用每个字节的 mask key 和数据的每一位做按位异或就好了：

```javascript
function handleMask(maskBytes, data) {
  const payload = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    payload[i] = maskBytes[i % 4] ^ data[i];
  }
  return payload;
}
```

这样，就拿到了最终的数据！但是传给处理程序之前，还要根据类型来处理下，因为内容分几种类型，也就是 opcode 有几种值：

```javascript
const OPCODES = {
  CONTINUE: 0,
  TEXT: 1, // 文本
  BINARY: 2, // 二进制
  CLOSE: 8,
  PING: 9,
  PONG: 10,
};
```

只处理文本和二进制就好了：

```javascript
handleRealData(opcode, realDataBuffer) {
    switch (opcode) {
      case OPCODES.TEXT:
        this.emit('data', realDataBuffer.toString('utf8'));
        break;
      case OPCODES.BINARY:
        this.emit('data', realDataBuffer);
        break;
      default:
        this.emit('close');
        break;
    }
}
```

文本就转成 utf-8 的字符串，二进制数据就直接用 buffer 的数据。这样，处理程序里就能拿到解析后的数据。至此，websocket 协议的解析成功了！这样的协议格式的数据叫做 frame，也就是帧。

解析可以了，接下来再实现数据的发送。发送也是构造一样的 frame 格式。定义这样一个 send 方法：

```javascript
send(data) {
    let opcode;
    let buffer;
    if (Buffer.isBuffer(data)) {
      opcode = OPCODES.BINARY;
      buffer = data;
    } else if (typeof data === 'string') {
      opcode = OPCODES.TEXT;
      buffer = Buffer.from(data, 'utf8');
    } else {
      console.error('暂不支持发送的数据类型')
    }
    this.doSend(opcode, buffer);
}

doSend(opcode, bufferData) {
   this.socket.write(encodeMessage(opcode, bufferData));
}
```

根据发送的是文本还是二进制数据来对内容作处理，然后构造 websocket 的 frame：

```javascript
function encodeMessage(opcode, payload) {
  //payload.length < 126
  let bufferData = Buffer.alloc(payload.length + 2 + 0);

  let byte1 = parseInt('10000000', 2) | opcode; // 设置 FIN 为 1
  let byte2 = payload.length;

  bufferData.writeUInt8(byte1, 0);
  bufferData.writeUInt8(byte2, 1);

  payload.copy(bufferData, 2);

  return bufferData;
}
```

只处理数据长度小于 125 的情况。第一个字节是 opcode，把第一位置 1，通过按位或的方式。服务端给客户端回消息不需要 mask，所以第二个字节就是 payload 长度。分别把这前两个字节的数据写到 buffer 里，指定不同的 offset：

```javascript
bufferData.writeUInt8(byte1, 0);
bufferData.writeUInt8(byte2, 1);
```

之后把 payload 数据放在后面：

```javascript
 payload.copy(bufferData, 2);
```

这样一个 websocket 的 frame 就构造完了。收到客户端消息后，每两秒回一个消息，收发消息都成功了！

完整代码如下（MyWebSocket，src/ws.js）：

```javascript
//ws.js
const { EventEmitter } = require('events');
const http = require('http');
const crypto = require('crypto');

function hashKey(key) {
  const sha1 = crypto.createHash('sha1');
  sha1.update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11');
  return sha1.digest('base64');
}

function handleMask(maskBytes, data) {
  const payload = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    payload[i] = maskBytes[i % 4] ^ data[i];
  }
  return payload;
}

const OPCODES = {
  CONTINUE: 0,
  TEXT: 1,
  BINARY: 2,
  CLOSE: 8,
  PING: 9,
  PONG: 10,
};

function encodeMessage(opcode, payload) {
  //payload.length < 126
  let bufferData = Buffer.alloc(payload.length + 2 + 0);

  let byte1 = parseInt('10000000', 2) | opcode; // 设置 FIN 为 1
  let byte2 = payload.length;

  bufferData.writeUInt8(byte1, 0);
  bufferData.writeUInt8(byte2, 1);

  payload.copy(bufferData, 2);

  return bufferData;
}

class MyWebsocket extends EventEmitter {
  constructor(options) {
    super(options);

    const server = http.createServer();
    server.listen(options.port || 8080);

    server.on('upgrade', (req, socket) => {
      this.socket = socket;
      socket.setKeepAlive(true);

      const resHeaders = [
        'HTTP/1.1 101 Switching Protocols',
        'Upgrade: websocket',
        'Connection: Upgrade',
        'Sec-WebSocket-Accept: ' + hashKey(req.headers['sec-websocket-key']),
        '',
        ''
      ].join('\r\n');
      socket.write(resHeaders);

      socket.on('data', (data) => {
        this.processData(data);
        // console.log(data);
      });
      socket.on('close', (error) => {
          this.emit('close');
      });
    });
  }

  handleRealData(opcode, realDataBuffer) {
    switch (opcode) {
      case OPCODES.TEXT:
        this.emit('data', realDataBuffer.toString('utf8'));
        break;
      case OPCODES.BINARY:
        this.emit('data', realDataBuffer);
        break;
      default:
        this.emit('close');
        break;
    }
  }

  processData(bufferData) {
    const byte1 = bufferData.readUInt8(0);
    let opcode = byte1 & 0x0f;

    const byte2 = bufferData.readUInt8(1);
    const str2 = byte2.toString(2);
    const MASK = str2[0];

    let curByteIndex = 2;

    let payloadLength = parseInt(str2.substring(1), 2);
    if (payloadLength === 126) {
      payloadLength = bufferData.readUInt16BE(2);
      curByteIndex += 2;
    } else if (payloadLength === 127) {
      payloadLength = bufferData.readBigUInt64BE(2);
      curByteIndex += 8;
    }

    let realData = null;

    if (MASK) {
      const maskKey = bufferData.slice(curByteIndex, curByteIndex + 4);
      curByteIndex += 4;
      const payloadData = bufferData.slice(curByteIndex, curByteIndex + payloadLength);
      realData = handleMask(maskKey, payloadData);
    }

    this.handleRealData(opcode, realData);
  }

  send(data) {
    let opcode;
    let buffer;
    if (Buffer.isBuffer(data)) {
      opcode = OPCODES.BINARY;
      buffer = data;
    } else if (typeof data === 'string') {
      opcode = OPCODES.TEXT;
      buffer = Buffer.from(data, 'utf8');
    } else {
      console.error('暂不支持发送的数据类型')
    }
    this.doSend(opcode, buffer);
  }

  doSend(opcode, bufferData) {
    this.socket.write(encodeMessage(opcode, bufferData));
  }
}

module.exports = MyWebsocket;
```

Index（src/index.js）：

```
const MyWebSocket = require('./ws');
const ws = new MyWebSocket({ port: 8080 });

ws.on('data', (data) => {
  console.log('receive data:' + data);
  setInterval(() => {
    ws.send(data + ' ' + Date.now());
  }, 2000)
});

ws.on('close', (code, reason) => {
  console.log('close:', code, reason);
});
```

html：

```html
<!DOCTYPE HTML>
<html>
<body>
    <script>
        const ws = new WebSocket("ws://localhost:8080");

        ws.onopen = function () {
            ws.send("发送数据");
            setTimeout(() => {
                ws.send("发送数据2");
            }, 3000)
        };

        ws.onmessage = function (evt) {
            console.log(evt)
        };

        ws.onclose = function () {
        };
    </script>
</body>

</html>
```

## 三、Nest 开发 WebSocket 服务

最常用的网络协议是 HTTP，它是一问一答的模式，客户端发送请求，服务端返回响应。有时候也会用 Server Sent Event，它是基于 HTTP 的，客户端发送请求，服务端返回 text/event-stream 类型的响应，可以多次返回数据。但是 HTTP 不能服务端向客户端推送数据，SSE 适合一次请求之后服务端多次推送数据的场景。类似聊天室这种，需要实时的双向通信的场景，还是得用 WebSocket。

在 Nest 里实现 WebSocket 的服务还是很简单的。创建个项目：

```
nest new nest-websocket
```

进入项目，安装用到的包：

```
npm i --save @nestjs/websockets @nestjs/platform-socket.io
```

然后创建个 websocket 模块（生成 WebSockets 类型的代码）：

```
nest g resource aaa
```

生成的代码很容易看懂：

- `@WebSocketGateway` 声明这是一个处理 websocket 的类。默认的端口和 http 服务 app.listen 的那个端口一样。
- `@SubscribeMessage` 是指定处理的消息。
- 通过 `@MessageBody` 取出传过来的消息内容。

分别声明了 find、create、update、remove 这些 CRUD 的消息类型，具体的实现在 AaaService 里。

然后加一下客户端代码，跑起来试试。添加 pages/index.html：

```html
<html>
  <head>
    <script src="https://cdn.socket.io/4.3.2/socket.io.min.js" integrity="sha384-KAZ4DtjNhLChOB/hxXuKqhMLYvx3b5MlT55xPEiNmREKRzeEm+RVPlTnAn0ajQNs" crossorigin="anonymous"></script>
    <script>
      const socket = io('http://localhost:3000');
      socket.on('connect', function() {
        console.log('Connected');

        socket.emit('findAllAaa', response =>
          console.log('findAllAaa', response),
        );

        socket.emit('findOneAaa', 1, response =>
          console.log('findOneAaa', response),
        );

        socket.emit('createAaa', {name: 'guang'},response =>
          console.log('createAaa', response),
        );

        socket.emit('updateAaa',{id: 2, name: 'dong'},response =>
          console.log('updateAaa', response),
        );

        socket.emit('removeAaa', 2,response =>
          console.log('removeAaa', response),
        );
      });
      socket.on('disconnect', function() {
        console.log('Disconnected');
      });
    </script>
  </head>

  <body></body>
</html>
```

这段代码也比较容易看懂，就是用 socket.io 来连接 ws 服务端。connect 之后，分别发送 find、remove、update 等消息。

然后在 main.ts 里支持下这个 pages 静态目录的访问：

```javascript
import { NestApplication, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets('pages');
  await app.listen(3000);
}
bootstrap();
```

把服务跑起来：

```
npm run start:dev
```

浏览器访问下 http://localhost:3000，可以看到，CRUD 方法都有了正确的响应。在 Nest 里写 WebSocket 服务就这么简单。

### 3.1 自定义事件名与异步返回

那如果响应接收和返回消息不想用同样的名字呢？分别指定 event 和 data。这时候原来的代码就收不到 findAll 返回的消息了，因为返回的消息是 guang，可以加一下这个事件的监听：

```javascript
socket.on('guang', function(data) {
    console.log('guang', data);
});
```

这样就收到消息了。

那如果我不是马上发送消息，而是过几秒再发呢？这就要返回 rxjs 的 Observer 了：

```javascript
@SubscribeMessage('findAllAaa')
findAll() {
    return new Observable((observer) => {
      observer.next({ event: 'guang', data: { msg: 'aaa'} });

      setTimeout(() => {
        observer.next({ event: 'guang', data: { msg: 'bbb'} });
      }, 2000);

      setTimeout(() => {
        observer.next({ event: 'guang', data: { msg: 'ccc'} });
      }, 5000);
    });
}
```

测试下，可以看到，2s、5s 的时候，收到了服务端传过来的消息。有这些就足够用了，websocket 是用来双向实时通信的。

### 3.2 平台实例与生命周期

当然，如果你想用具体平台的 api，也可以注入实例。安装 socket.io（Nest 默认使用 socket.io 包实现 WebSocket 功能）：

```
npm install socket.io
```

```javascript
@SubscribeMessage('findOneAaa')
findOne(@MessageBody() id: number, @ConnectedSocket() server: Server) {

    server.emit('guang', 666);
    return this.aaaService.findOne(id);
}
```

这样也可以，但是和具体的平台耦合了，不建议这样写。除了 @ConnectedSocket 装饰器注入实例，也可以用 @WebSocketServer 注入实例：

```javascript
@WebSocketServer()
server: Server;

@SubscribeMessage('createAaa')
create(@MessageBody() createAaaDto: CreateAaaDto) {
    this.server.emit('guang', 777);
    return this.aaaService.create(createAaaDto);
}
```

同样，也是不建议用的。

此外，服务端也有 connected、disconnected 等生命周期函数：

```javascript
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class AaaGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect{

  handleDisconnect(client: Socket) {
  }

  handleConnection(client: Socket, ...args: any[]) {
  }

  afterInit(server: Server) {
  }
}
```

分别实现 OnGatewayInit、OnGatewayConnection、OnGatewayDisconnect 接口，在生命周期函数里可以拿到实例对象。

## 四、基于 Socket.io 的 room 实现群聊

微信可以在不同的群聊里聊天，如何实现这种功能呢？这就要用到 socket.io 的 room 功能了。

socket.io 支持加入房间：

```javascript
socket.join('room666')
```

可以向对应房间发消息：

```javascript
server.to("room666").emit("新成员加入了群聊")
```

这样就实现了群聊功能。

来写一下：

```
nest new group-chat-room
```

进入项目，安装 websocket 的包：

```
npm i --save @nestjs/websockets @nestjs/platform-socket.io socket.io
```

然后创建个 websocket 模块（注意，选择生成 WebSockets 类型的代码）：

```
nest g resource chatroom
```

这些前面写过。在 main.ts 里支持下 pages 这个静态目录的访问：

```javascript
import { NestApplication, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets('pages');
  await app.listen(3000);
}
bootstrap();
```

创建 pages/index.html：

```html
<html>
  <head>
    <script src="https://cdn.socket.io/4.3.2/socket.io.min.js"></script>
    <script>
      const socket = io('http://localhost:3000');
      socket.on('connect', function() {
        console.log('Connected');

        socket.emit('findAllChatroom', function(data) {
            console.log('allChatroom', data);
        });
      });
      socket.on('disconnect', function() {
        console.log('Disconnected');
      });
    </script>
  </head>

  <body></body>
</html>
```

把服务跑起来：

```
npm run start:dev
```

浏览器访问下，打印了返回的消息。

然后实现下房间的功能：

```javascript
import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class ChatroomGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('joinRoom')
  joinRoom(client: Socket, room: string): void {
    console.log(room);
    client.join(room);
    this.server.to(room).emit('message', `新用户加入了 ${room} 房间`);
  }

  @SubscribeMessage('sendMessage')
  sendMessage(client: Socket, payload: any): void {
    console.log(payload);
    this.server.to(payload.room).emit('message', payload.message);
  }
}
```

添加一个 joinRoom 的路由，它接收 room 参数，把 client 加入对应房间，然后给这个房间发送一个欢迎消息。然后加一个 sendMessage 的路由，接收房间和消息，可以给对应 room 发送消息。

然后在客户端也加入 room 功能：

```html
<html>
  <head>
    <script src="https://cdn.socket.io/4.3.2/socket.io.min.js"></script>
    <script>
        const roomName = prompt('输入群聊名');
        if(roomName) {
            const socket = io('http://localhost:3000');
            socket.on('connect', function() {
                console.log('Connected');

                socket.emit('joinRoom', roomName);

                socket.on('message', (message) => {
                    console.log('收到来自房间的消息:', message);
                });

                socket.emit('sendMessage', { room: roomName, message: 'Hello, everyone!' });
            });
            socket.on('disconnect', function() {
                console.log('Disconnected');
            });
        } else {
            alert('请输入群聊名');
        }
    </script>
  </head>

  <body></body>
</html>
```

进入页面首先输入群聊名，然后加入对应房间，并发一个消息。

测试下：打开页面，进入 aaa 房间，发送了一条消息；再打开一个页面，进入 aaa 房间，这时候之前那个房间就有 2 条消息了；再打开一个页面，进入 bbb 房间，这时候之前的 aaa 房间并没有收到消息。这样，群聊房间功能就实现了。

再完善一下：首先 payload 都传入 room 和 nickName：

```javascript
import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class ChatroomGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('joinRoom')
  joinRoom(client: Socket, payload: any): void {
    console.log(payload.roomName);
    client.join(payload.roomName);
    this.server.to(payload.roomName).emit('message', {
      nickName: payload.nickName,
      message: `${payload.nickName} 加入了 ${payload.roomName} 房间`
    });
  }

  @SubscribeMessage('sendMessage')
  sendMessage(@MessageBody() payload: any): void {
    console.log(payload);
    this.server.to(payload.room).emit('message', { nickName: payload.nickName, message: payload.message});
  }
}
```

然后改下 client：

```html
<html>
  <head>
    <script src="https://cdn.socket.io/4.3.2/socket.io.min.js"></script>
  </head>
  <body>

    <div id="messageBox">
    </div>

    <input id="messageInput"/>
    <button id="sendMessage">发送</button>

    <script>
        const messageBox = document.getElementById('messageBox');
        const messageInput = document.getElementById('messageInput');
        const sendMessage = document.getElementById('sendMessage');

        const roomName = prompt('输入群聊名');
        const nickName = prompt('输入昵称');
        if(roomName && nickName) {
            const socket = io('http://localhost:3000');
            socket.on('connect', function() {
                console.log('Connected');

                socket.emit('joinRoom', { roomName, nickName});

                socket.on('message', (payload) => {
                    console.log('收到来自房间的消息:', payload);

                    const item = document.createElement('div');
                    item.className = 'message'
                    item.textContent = payload.nickName + ':  ' + payload.message;
                    messageBox.appendChild(item);
                });
            });

            sendMessage.onclick = function() {
                socket.emit('sendMessage', { room: roomName, nickName, message: messageInput.value });
            }

            socket.on('disconnect', function() {
                console.log('Disconnected');
            });
        }
    </script>
  </body>
</html>
```

进入页面输入群聊名和昵称，加上 messageBox 用于显示消息，在输入框输入内容，点击的时候发送消息。

测试下：打开一个页面发消息，再打开一个页面，可以看到另一个页面也收到消息了，因为这俩在一个房间。进入其他房间发消息试试，这时候另外两个页面就没收到消息了，因为在不同房间。

## 总结

这次整理了 WebSocket 协议与群聊实现：

- WebSocket 协议：实时性较高的需求，会用 websocket 实现，比如即时通讯、游戏等场景。websocket 和 http 没什么关系，但从 http 到 websocket 需要一次切换的过程。这个切换过程除了要带 upgrade 的 header 外，还要带 sec-websocket-key，服务端根据这个 key 算出结果，通过 sec-websocket-accept 返回，响应是 101 Switching Protocols 的状态码。这个计算过程比较固定，就是 key + 固定的字符串通过 sha1 加密后再 base64 的结果。之后就是 websocket 协议了，这是个二进制协议，根据格式完成了 websocket 帧的解析和生成。
- Nest WebSocket 服务：需要用到 @nestjs/websockets 和 @nestjs/platform-socket.io 包。涉及到这些装饰器：@WebSocketGateway（声明这是一个处理 websocket 的类）、@SubscribeMessage（声明处理的消息）、@MessageBody（取出传过来的消息内容）、@WebSocketServer（取出 Socket 实例对象）、@ConnectedSocket（取出 Socket 实例对象注入方法）。客户端也是使用 socket.io 来连接。如果想异步返回消息，就通过 rxjs 的 Observer 来异步多次返回。
- 群聊：主要是基于 socket.io 的 room 实现的，可以把 client socket 加入某个 room，然后向这个 room 发消息。这样，发消息的时候带上昵称、群聊名等内容，就可以往指定群聊发消息了。更完善的聊天室，会带上 userId、groupId 等，然后可以根据这俩 id 查询更详细的信息，但只是消息格式更复杂一些，原理都是 room。