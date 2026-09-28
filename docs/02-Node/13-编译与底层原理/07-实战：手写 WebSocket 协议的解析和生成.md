---
title: 手写 WebSocket 协议：从理论到实战
description: 剖析 WebSocket 握手、Sec-WebSocket-Accept 计算与帧格式编解码，手写解析器
keywords: [Node.js, AST, 编译, WebSocket]
category: Node.js
tags: [Node.js, 编译与底层原理]
---







# 手写 WebSocket 协议：从理论到实战

## 1. WebSocket 协议简介

WebSocket 是一种在单个 TCP 连接上进行全双工通信的协议，它使得客户端和服务器之间的数据交换变得更加简单、高效。与需要客户端发起请求才能响应的 HTTP 不同，WebSocket 允许服务端主动向客户端推送信息。

本篇文章将带你从零开始，使用 Node.js 手写一个 WebSocket 服务器，深入理解其协议细节和实现原理。

## 2. WebSocket 握手流程

WebSocket 连接的建立始于一个 HTTP/1.1 协议的升级请求，这个过程被称为 WebSocket 握手

### 2.1 客户端请求

客户端首先向服务器发起一个特殊的 HTTP 请求，其中包含以下关键头部字段：

```http
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
```

- `Connection: Upgrade` 和 `Upgrade: websocket` 表明客户端希望将连接从 HTTP 升级到 WebSocket。
- `Sec-WebSocket-Key` 是一个 Base64 编码的随机字符串，用于后续的安全校验。
- `Sec-WebSocket-Version` 指定了 WebSocket 协议的版本，通常为 13。

### 2.2 服务端响应

如果服务器支持 WebSocket，它将返回一个 `101 Switching Protocols` 的响应，表示同意协议升级：

```http
HTTP/1.1 101 Switching Protocols
Connection: Upgrade
Upgrade: websocket
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

- `Sec-WebSocket-Accept` 是服务端根据客户端的 `Sec-WebSocket-Key` 计算得出的，用于确认服务端确实理解 WebSocket 协议。

### 2.3 安全密钥

`Sec-WebSocket-Accept` 的计算方法如下：将客户端发送的 `Sec-WebSocket-Key` 与一个固定的 UUID `258EAFA5-E914-47DA-95CA-C5AB0DC85B11` 拼接，然后计算其 SHA-1 哈希值，最后进行 Base64 编码。

以下是 Node.js 的实现：

```javascript
const crypto = require("crypto")

function hashKey(key) {
  const sha1 = crypto.createHash("sha1")
  sha1.update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
  return sha1.digest("base64")
}
```

这个过程确保了服务端是真正理解 WebSocket 协议的服务器，而不是一个普通的 HTTP 服务器。握手完成后，底层的 TCP 连接就正式切换到 WebSocket 协议，允许双向数据传输。

## 3. WebSocket 帧格式详解

握手成功后，所有的数据都以“帧”（Frame）的格式进行传输。WebSocket 帧是协议的基本数据单位。

### 3.1 帧结构概览

一个 WebSocket 帧的结构如下：

```text
      0                   1                   2                   3
      0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
     +-+-+-+-+-------+-+-------------+-------------------------------+
     |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
     |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
     |N|V|V|V|       |S|             |   (if payload len==126/127)   |
     | |1|2|3|       |K|             |                               |
     +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
     |     Extended payload length continued, if payload len == 127  |
     + - - - - - - - - - - - - - - - +-------------------------------+
     |                               |Masking-key, if MASK set to 1  |
     +-------------------------------+-------------------------------+
     | Masking-key (continued)       |          Payload Data         |
     +-------------------------------- - - - - - - - - - - - - - - - +
     :                     Payload Data continued ...                :
     + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
     |                     Payload Data continued ...                |
     +---------------------------------------------------------------+
```

### 3.2 关键字段解析

- **FIN (1 bit):**

  - `1`: 表示这是消息的最后一个分片。
  - `0`: 表示消息还有后续分片。

- **RSV1, RSV2, RSV3 (1 bit each):**

  - 必须为 `0`，除非扩展了协议，否则收到非零值时应断开连接。

- **Opcode (4 bits):** 定义了“有效负载数据”的类型。

  - `0x0`: Continuation Frame (分片消息的后续帧)
  - `0x1`: Text Frame (UTF-8 编码的文本数据)
  - `0x2`: Binary Frame (二进制数据)
  - `0x8`: Connection Close Frame (关闭连接)
  - `0x9`: Ping Frame
  - `0xA`: Pong Frame

- **Mask (1 bit):**

  - `1`: 表示数据被掩码。所有从客户端发往服务器的数据帧，该位都必须为 `1`。
  - `0`: 表示数据未被掩码。

- **Payload length (7 bits, 7+16 bits, or 7+64 bits):**

  - 如果值在 `0-125` 之间，则该值就是负载数据的长度。
  - 如果值为 `126`，则随后的 2 个字节（16 位）代表负载数据的长度。
  - 如果值为 `127`，则随后的 8 个字节（64 位）代表负载数据的长度。

- **Masking-key (0 or 4 bytes):**

  - 如果 `Mask` 位为 `1`，则包含一个 4 字节的掩码密钥。客户端发送的每个帧都必须使用一个新的掩码密钥。

- **Payload Data:**
  - 实际传输的数据。如果设置了 `Mask`，则数据是经过掩码处理的。

## 4. Node.js 实现 WebSocket 服务器

了解了协议细节后，开始用 Node.js 构建自己的 WebSocket 服务器。

### 4.1 项目初始化

首先，创建一个新项目并初始化：

```bash
mkdir my-websocket
cd my-websocket
npm init -y
```

### 4.2 创建 HTTP 服务器

我们的 WebSocket 服务器需要一个 HTTP 服务器来处理初始的升级请求。创建一个 `MyWebSocket` 类，它继承自 `EventEmitter` 以便进行事件驱动的通信。

```javascript
// src/ws.js
const { EventEmitter } = require("node:events")
const http = require("node:http")

class MyWebsocket extends EventEmitter {
  constructor(options) {
    super(options)

    const server = http.createServer()
    server.listen(options.port || 8080)

    server.on("upgrade", (req, socket) => {
      this.socket = socket
      socket.setKeepAlive(true)
      // ... 协议升级逻辑
    })
  }
}
```

### 4.3 处理协议升级

当收到 `upgrade` 事件时，需要发送正确的响应头来完成握手。这包括计算并返回 `Sec-WebSocket-Accept` 头。

```javascript
// 在 server.on('upgrade', ...) 回调中
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
});

socket.on('close', (error) => {
  this.emit('close');
});
```

`hashKey` 函数在前面的 [2.3 安全密钥](#23-安全密钥) 部分已经定义。完成这一步，协议升级就成功了。

### 4.4 解析数据帧

当服务器与客户端完成握手后，就可以开始进行数据通信。所有的数据都以“帧”（Frame）的格式进行传输。服务器需要监听 `socket` 的 `data` 事件，接收并解析客户端发送过来的数据帧。

```javascript
// 在 MyWebsocket 类的构造函数中
socket.on("data", (buffer) => {
  this.buffer = buffer
  this.decodeDataFrame()
})
```

`decodeDataFrame` 方法是解析数据帧的核心，它严格按照协议规范读取 Buffer 中的二进制数据。

```javascript
// MyWebsocket 类中的方法
decodeDataFrame() {
    let currentIndex = 0;
    const byte1 = this.buffer.readUInt8(currentIndex++);
    const fin = (byte1 & 0b10000000) === 0b10000000;
    const opcode = byte1 & 0b00001111;

    const byte2 = this.buffer.readUInt8(currentIndex++);
    const mask = (byte2 & 0b10000000) === 0b10000000;
    let payloadLength = byte2 & 0b01111111;

    if (payloadLength === 126) {
        payloadLength = this.buffer.readUInt16BE(currentIndex);
        currentIndex += 2;
    } else if (payloadLength === 127) {
        payloadLength = this.buffer.readBigUInt64BE(currentIndex);
        currentIndex += 8;
    }

    let maskingKey;
    if (mask) {
        maskingKey = this.buffer.slice(currentIndex, currentIndex + 4);
        currentIndex += 4;
    }

    const payload = this.buffer.slice(currentIndex, currentIndex + Number(payloadLength));

    if (mask) {
        this.unmask(payload, maskingKey);
    }

    this.handleOpcode(opcode, payload);
}
```

### 4.5 数据解码与处理

客户端发送到服务器的数据必须进行掩码处理。`unmask` 方法通过按位异或运算，将掩码从负载数据中移除，还原出原始信息。

```javascript
// MyWebsocket 类中的方法
unmask(payload, maskingKey) {
    for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskingKey[i % 4];
    }
}
```

解码后，需要根据 `Opcode` 来判断数据类型并进行相应的处理。

```javascript
// MyWebsocket 类中的方法
handleOpcode(opcode, payload) {
    switch (opcode) {
        case OPCODES.TEXT:
            this.emit('data', payload.toString('utf8'));
            break;
        case OPCODES.BINARY:
            this.emit('data', payload);
            break;
        case OPCODES.CLOSE:
            this.emit('close');
            break;
        default:
            // 处理其他操作码，如 PING, PONG 等
            break;
    }
}
```

同时，定义 `OPCODES` 常量以提高代码的可读性。

```javascript
const OPCODES = {
  CONTINUE: 0,
  TEXT: 1,
  BINARY: 2,
  CLOSE: 8,
  PING: 9,
  PONG: 10
}
```

至此，成功实现了对客户端数据帧的解析和处理。

### 4.6 封装和发送数据

除了接收数据，服务器还需要能主动向客户端发送消息。这需要将数据封装成符合 WebSocket 协议的帧格式。

首先，在 `MyWebsocket` 类中添加一个 `send` 方法，用于处理不同类型的数据（文本或二进制）。

```javascript
// MyWebsocket 类中的方法
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
        throw new Error('Unsupported data type');
    }
    this.doSend(opcode, buffer);
}
```

`doSend` 方法会调用 `encodeMessage` 函数来创建数据帧，并通过 `socket` 发送出去。

```javascript
// MyWebsocket 类中的方法
doSend(opcode, buffer) {
    this.socket.write(this.encodeMessage(opcode, buffer));
}
```

`encodeMessage` 是数据封装的核心。它根据 `Opcode` 和 `Payload` 创建一个符合协议格式的 `Buffer`。注意，从服务器发送到客户端的数据帧，`Mask` 位必须为 `0`。

为了简化，先实现 `payload length < 126` 的情况。

```javascript
// MyWebsocket 类中的方法
encodeMessage(opcode, payload) {
    const payloadLength = payload.length;
    let buffer;

    // 服务器到客户端的数据帧，Mask 位为 0
    // FIN 位置 1，表示是消息的最后一帧
    const byte1 = 0b10000000 | opcode;

    if (payloadLength < 126) {
        buffer = Buffer.alloc(2 + payloadLength);
        buffer.writeUInt8(byte1, 0);
        buffer.writeUInt8(payloadLength, 1);
        payload.copy(buffer, 2);
    } else if (payloadLength < 65536) {
        buffer = Buffer.alloc(4 + payloadLength);
        buffer.writeUInt8(byte1, 0);
        buffer.writeUInt8(126, 1);
        buffer.writeUInt16BE(payloadLength, 2);
        payload.copy(buffer, 4);
    } else {
        buffer = Buffer.alloc(10 + payloadLength);
        buffer.writeUInt8(byte1, 0);
        buffer.writeUInt8(127, 1);
        buffer.writeBigUInt64BE(BigInt(payloadLength), 2);
        payload.copy(buffer, 10);
    }
    return buffer;
}
```

现在，我们的 `MyWebsocket` 服务器就具备了完整的双向通信能力。

## 5. 使用指南

下面是一个简单的示例，展示了如何使用创建的 `MyWebsocket` 服务器。

### 5.1 服务端代码

创建一个 `index.js` 文件，引入并实例化 `MyWebsocket`。

```javascript
// index.js
const MyWebsocket = require("./ws")

const ws = new MyWebsocket({ port: 8080 })

ws.on("data", (data) => {
  console.log("接收到客户端消息:", data)
  ws.send("你好，客户端！这是来自服务器的回应。")
})

ws.on("close", () => {
  console.log("客户端已断开连接")
})

console.log("WebSocket 服务器已启动在端口 8080")
```

### 5.2 客户端代码

你可以使用任何支持 WebSocket 的客户端进行连接，例如浏览器中的 JavaScript。

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>WebSocket Client</title>
  </head>
  <body>
    <h1>WebSocket Test</h1>
    <script>
      const socket = new WebSocket("ws://localhost:8080")

      socket.onopen = () => {
        console.log("已连接到服务器")
        socket.send("你好，服务器！")
      }

      socket.onmessage = (event) => {
        console.log("接收到服务器消息:", event.data)
      }

      socket.onclose = () => {
        console.log("已从服务器断开")
      }

      socket.onerror = (error) => {
        console.error("WebSocket 错误:", error)
      }
    </script>
  </body>
</html>
```

### 5.3 运行示例

1.  在终端中运行服务端代码：`node index.js`。
2.  在浏览器中打开 `index.html` 文件。
3.  打开浏览器的开发者控制台，你将看到客户端与服务器之间的消息交互。

## 6. 常见问题 (FAQ)

**Q1: 为什么客户端发送的数据需要掩码，而服务器发送的却不需要？**

A: 这是协议设计的一部分，主要是为了防止“缓存中毒攻击”（Cache Poisoning）。某些代理服务器可能会缓存看似无害的 HTTP GET 请求（WebSocket 握手请求），但如果一个恶意的客户端可以构造特定的数据帧，代理服务器可能会缓存并提供一个被污染的响应。要求客户端掩码可以防止这种情况。

**Q2: 如何处理大于 64KB 的大数据帧？**

A: 我们的 `encodeMessage` 和 `decodeDataFrame` 方法已经完整支持 `payload length` 为 126（使用额外 2 字节）和 127（使用额外 8 字节）的情况，可以自动处理大数据帧的编码和解码。

**Q3: 如何实现心跳机制来保持连接？**

A: WebSocket 协议本身提供了 `Ping` (0x9) 和 `Pong` (0xA) 控制帧。你可以定期（例如每 30 秒）从服务器发送一个 Ping 帧，客户端收到后会自动回复一个 Pong 帧。如果在一段时间内没有收到 Pong 回复，就可以认为连接已断开。

## 7. 总结

通过本次实践，从零开始，深入探索了 WebSocket 协议的每一个细节，并最终完成了一个功能完备的 WebSocket 服务器。

核心要点回顾：

1.  **HTTP 升级握手**：通过 `Upgrade` 和 `Connection` 头，以及基于 `Sec-WebSocket-Key` 的安全校验，将一个 HTTP 连接平滑地过渡到 WebSocket 连接。
2.  **二进制帧协议**：学习了如何解析和封装 WebSocket 的二进制数据帧，理解了 `FIN`, `Opcode`, `Mask`, `Payload Length` 等关键字段的作用。
3.  **数据加/解码**：实现了客户端数据的掩码解码（XOR 运算）和服务器数据的封装，支持了不同长度的负载。
4.  **事件驱动模型**：基于 Node.js 的 `EventEmitter`，构建了事件驱动的 `data` 和 `close` 事件处理逻辑，使代码结构清晰且易于扩展。

手写协议的实现过程不仅让掌握了 WebSocket 的工作原理，也加深了对 Node.js 中 `Buffer` 操作、`crypto` 模块和网络编程的理解。

## 8. 完整代码

以下是 `MyWebsocket` 类的完整实现，你可以将其保存为 `ws.js` 并直接在你的项目中使用。

```javascript
// ws.js
const { EventEmitter } = require("node:events")
const http = require("node:http")
const crypto = require("node:crypto")

const OPCODES = {
  CONTINUE: 0,
  TEXT: 1,
  BINARY: 2,
  CLOSE: 8,
  PING: 9,
  PONG: 10
}

function hashKey(key) {
  const sha1 = crypto.createHash("sha1")
  sha1.update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
  return sha1.digest("base64")
}

class MyWebsocket extends EventEmitter {
  constructor(options) {
    super(options)
    const server = http.createServer()
    server.listen(options.port || 8080)

    server.on("upgrade", (req, socket) => {
      this.socket = socket
      socket.setKeepAlive(true)

      const resHeaders = [
        "HTTP/1.1 101 Switching Protocols",
        "Upgrade: websocket",
        "Connection: Upgrade",
        "Sec-WebSocket-Accept: " + hashKey(req.headers["sec-websocket-key"]),
        "",
        ""
      ].join("\r\n")
      socket.write(resHeaders)

      socket.on("data", (buffer) => {
        this.buffer = buffer
        this.decodeDataFrame()
      })

      socket.on("close", () => {
        this.emit("close")
      })
    })
  }

  decodeDataFrame() {
    let currentIndex = 0
    const byte1 = this.buffer.readUInt8(currentIndex++)
    const fin = (byte1 & 0b10000000) === 0b10000000
    const opcode = byte1 & 0b00001111

    const byte2 = this.buffer.readUInt8(currentIndex++)
    const mask = (byte2 & 0b10000000) === 0b10000000
    let payloadLength = byte2 & 0b01111111

    if (payloadLength === 126) {
      payloadLength = this.buffer.readUInt16BE(currentIndex)
      currentIndex += 2
    } else if (payloadLength === 127) {
      payloadLength = this.buffer.readBigUInt64BE(currentIndex)
      currentIndex += 8
    }

    let maskingKey
    if (mask) {
      maskingKey = this.buffer.slice(currentIndex, currentIndex + 4)
      currentIndex += 4
    }

    const payload = this.buffer.slice(
      currentIndex,
      currentIndex + Number(payloadLength)
    )

    if (mask) {
      this.unmask(payload, maskingKey)
    }

    this.handleOpcode(opcode, payload)
  }

  unmask(payload, maskingKey) {
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= maskingKey[i % 4]
    }
  }

  handleOpcode(opcode, payload) {
    switch (opcode) {
      case OPCODES.TEXT:
        this.emit("data", payload.toString("utf8"))
        break
      case OPCODES.BINARY:
        this.emit("data", payload)
        break
      case OPCODES.CLOSE:
        this.emit("close")
        break
      default:
        break
    }
  }

  send(data) {
    let opcode
    let buffer
    if (Buffer.isBuffer(data)) {
      opcode = OPCODES.BINARY
      buffer = data
    } else if (typeof data === "string") {
      opcode = OPCODES.TEXT
      buffer = Buffer.from(data, "utf8")
    } else {
      throw new Error("Unsupported data type")
    }
    this.doSend(opcode, buffer)
  }

  doSend(opcode, buffer) {
    this.socket.write(this.encodeMessage(opcode, buffer))
  }

  encodeMessage(opcode, payload) {
    const payloadLength = payload.length
    let buffer
    const byte1 = 0b10000000 | opcode

    if (payloadLength < 126) {
      buffer = Buffer.alloc(2 + payloadLength)
      buffer.writeUInt8(byte1, 0)
      buffer.writeUInt8(payloadLength, 1)
      payload.copy(buffer, 2)
    } else if (payloadLength < 65536) {
      buffer = Buffer.alloc(4 + payloadLength)
      buffer.writeUInt8(byte1, 0)
      buffer.writeUInt8(126, 1)
      buffer.writeUInt16BE(payloadLength, 2)
      payload.copy(buffer, 4)
    } else {
      buffer = Buffer.alloc(10 + payloadLength)
      buffer.writeUInt8(byte1, 0)
      buffer.writeUInt8(127, 1)
      buffer.writeBigUInt64BE(BigInt(payloadLength), 2)
      payload.copy(buffer, 10)
    }
    return buffer
  }
}

module.exports = MyWebsocket
```
