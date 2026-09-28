---
title: WebSocket
description: "WebSocket 协议（RFC 6455）提供了一种在客户端和服务器之间建立持久化双向通信通道的方式。与传统的 HTTP 请求-响应模式不同，WebSocket 允许服务器主动向客户端推送数据。"
keywords: [WebSocket]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---


# WebSocket

> WebSocket 是一种在单个 TCP 连接上进行全双工通信的协议，实现了浏览器与服务器之间的实时双向数据传输。

## 概述

WebSocket 协议（RFC 6455）提供了一种在客户端和服务器之间建立持久化双向通信通道的方式。与传统的 HTTP 请求-响应模式不同，WebSocket 允许服务器主动向客户端推送数据。

### 核心特性

| 特性 | 说明 |
|------|------|
| **全双工通信** | 客户端和服务器可同时发送数据 |
| **持久连接** | 握手成功后保持长连接，避免重复建立连接 |
| **低开销** | 头部信息小，数据帧轻量 |
| **实时性** | 毫秒级延迟，适合实时应用 |
| **二进制支持** | 原生支持文本和二进制数据 |

### 工作原理

```
┌─────────┐                      ┌─────────┐
│ Client  │                      │ Server  │
└────┬────┘                      └────┬────┘
     │                                │
     │  1. HTTP Upgrade Request       │
     │ ─────────────────────────────> │
     │                                │
     │  2. HTTP 101 Switching         │
     │ <───────────────────────────── │
     │                                │
     │  ═════ WebSocket 连接建立 ═════│
     │                                │
     │  3. 双向数据传输               │
     │ <═══════════════════════════> │
     │                                │
     │  4. Close Frame                │
     │ ─────────────────────────────> │
     │                                │
```

---

## 与 HTTP 对比

### HTTP 轮询 vs WebSocket

| 对比项 | HTTP 轮询 | 长轮询 | Server-Sent Events | WebSocket |
|--------|----------|--------|-------------------|-----------|
| 通信方向 | 单向 | 单向 | 单向（服务器→客户端） | 双向 |
| 连接方式 | 短连接 | 长连接 | 长连接 | 长连接 |
| 实时性 | 低 | 中 | 高 | 高 |
| 服务器开销 | 高 | 中 | 低 | 低 |
| 浏览器支持 | 全部 | 全部 | 大部分 | 大部分 |
| 二进制支持 | 是 | 是 | 否 | 是 |

### 性能对比示例

```javascript
// HTTP 轮询：每秒请求一次
setInterval(async () => {
  const response = await fetch('/api/messages');
  const messages = await response.json();
  // 处理消息
}, 1000);

// WebSocket：建立连接后实时推送
const ws = new WebSocket('wss://example.com/ws');
ws.onmessage = (event) => {
  const messages = JSON.parse(event.data);
  // 处理消息
};
```

### 适用场景选择

```
┌─────────────────────────────────────────────────────────┐
│                    场景选择指南                          │
├─────────────────────────────────────────────────────────┤
│  实时聊天/协作        ──────>  WebSocket                 │
│  多人游戏             ──────>  WebSocket                 │
│  股票/金融数据        ──────>  WebSocket                 │
│  服务器通知           ──────>  SSE / WebSocket           │
│  偶尔的数据更新       ──────>  HTTP 轮询                 │
│  兼容旧浏览器         ──────>  HTTP 轮询 / 长轮询        │
└─────────────────────────────────────────────────────────┘
```

---

## 核心概念

### 握手过程

WebSocket 通过 HTTP Upgrade 机制建立连接：

```
客户端请求：
GET /ws HTTP/1.1
Host: example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13

服务器响应：
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

### 数据帧格式

```
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
```

### Opcode 类型

| Opcode | 十进制 | 说明 |
|--------|--------|------|
| 0x0 | 0 | 继续帧 |
| 0x1 | 1 | 文本帧 |
| 0x2 | 2 | 二进制帧 |
| 0x8 | 8 | 关闭帧 |
| 0x9 | 9 | Ping 帧 |
| 0xA | 10 | Pong 帧 |

---

## API 详解

### 构造函数

```javascript
const ws = new WebSocket(url, protocols);
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `url` | string | WebSocket 服务器地址，以 `ws://` 或 `wss://` 开头 |
| `protocols` | string \| string[] | 可选，子协议名称或数组 |

```javascript
// 基本连接
const ws = new WebSocket('ws://example.com/ws');

// 加密连接（推荐）
const wss = new WebSocket('wss://example.com/ws');

// 指定子协议
const ws = new WebSocket('wss://example.com/ws', ['chat', 'superchat']);
```

### 实例属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `url` | string | 连接的 URL |
| `readyState` | number | 连接状态 |
| `bufferedAmount` | number | 发送队列中未发送的字节数 |
| `protocol` | string | 服务器选择的子协议 |
| `extensions` | string | 服务器选择的扩展 |
| `binaryType` | string | 二进制数据类型（`blob` 或 `arraybuffer`） |

**连接状态常量（readyState）：**

| 常量 | 值 | 说明 |
|------|-----|------|
| `CONNECTING` | 0 | 连接中 |
| `OPEN` | 1 | 已连接，可通信 |
| `CLOSING` | 2 | 正在关闭 |
| `CLOSED` | 3 | 已关闭或连接失败 |

---

## 基本用法

### 创建连接

```javascript
// 方式一：直接赋值事件处理函数
const ws = new WebSocket('wss://example.com/ws');

ws.onopen = function(event) {
  console.log('连接已建立');
  ws.send('Hello Server');
};

ws.onmessage = function(event) {
  console.log('收到消息:', event.data);
};

ws.onclose = function(event) {
  console.log('连接关闭:', event.code, event.reason);
  console.log('是否正常关闭:', event.wasClean);
};

ws.onerror = function(error) {
  console.error('WebSocket 错误:', error);
};
```

```javascript
// 方式二：使用 addEventListener（推荐）
const ws = new WebSocket('wss://example.com/ws');

ws.addEventListener('open', (event) => {
  console.log('连接已建立');
});

ws.addEventListener('message', (event) => {
  console.log('收到消息:', event.data);
});

ws.addEventListener('close', (event) => {
  console.log('连接关闭:', event.code, event.reason);
});

ws.addEventListener('error', (error) => {
  console.error('WebSocket 错误:', error);
});
```

### 检查连接状态

```javascript
function checkConnection(ws) {
  const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
  console.log(`当前状态: ${states[ws.readyState]}`);
  
  if (ws.readyState === WebSocket.OPEN) {
    console.log('可以发送数据');
  }
}
```

### 设置二进制类型

```javascript
const ws = new WebSocket('wss://example.com/ws');

// 接收 ArrayBuffer 格式的二进制数据
ws.binaryType = 'arraybuffer';

ws.onmessage = (event) => {
  if (event.data instanceof ArrayBuffer) {
    const view = new DataView(event.data);
    // 处理二进制数据
  }
};
```

---

## 消息传输

### 发送文本消息

```javascript
// 纯文本
ws.send('Hello World');

// JSON 格式
const message = {
  type: 'chat',
  content: '你好',
  userId: 'user123',
  timestamp: Date.now()
};
ws.send(JSON.stringify(message));
```

### 发送二进制数据

```javascript
// 发送 ArrayBuffer
const buffer = new ArrayBuffer(4);
const view = new DataView(buffer);
view.setInt32(0, 12345);
ws.send(buffer);

// 发送 TypedArray
const int8Array = new Int8Array([1, 2, 3, 4, 5]);
ws.send(int8Array.buffer);

// 发送 Blob
const blob = new Blob(['Hello World'], { type: 'text/plain' });
ws.send(blob);

// 发送文件
fileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    ws.send(file);
  }
});
```

### 消息分片发送

```javascript
// 对于大文件，可以分片发送
function sendLargeFile(ws, file, chunkSize = 65536) {
  let offset = 0;
  
  function sendNextChunk() {
    if (offset >= file.size) return;
    const slice = file.slice(offset, offset + chunkSize);
    const reader = new FileReader();
    
    reader.onload = (event) => {
      ws.send(event.target.result);
      offset += chunkSize;
      sendNextChunk();
    };
    
    reader.readAsArrayBuffer(slice);
  }
  
  sendNextChunk();
}
```

**上传完成时发送元信息：**

```javascript
function notifyUploadComplete(ws, file) {
  ws.send(JSON.stringify({
    type: 'file:complete',
    name: file.name,
    size: file.size,
    mimeType: file.type
  }));
}
```

### 接收消息处理

```javascript
ws.onmessage = (event) => {
  // 文本消息
  if (typeof event.data === 'string') {
    try {
      const message = JSON.parse(event.data);
      handleJsonMessage(message);
    } catch {
      handleTextMessage(event.data);
    }
  }
  // 二进制消息
  else if (event.data instanceof ArrayBuffer) {
    // 将 ArrayBuffer 转为 Blob 或 Uint8Array 处理
    const bytes = new Uint8Array(event.data);
    console.log('收到二进制数据，长度:', bytes.byteLength);
    handleBinaryMessage(bytes);
  }
  // Blob 消息
  else if (event.data instanceof Blob) {
    event.data.arrayBuffer().then((buffer) => {
      handleBinaryMessage(new Uint8Array(buffer));
    });
  }
}

// 按类型分发 JSON 消息
function handleJsonMessage(message) {
  switch (message.type) {
    case 'system':
      handleSystemMessage(message);
      break;
    case 'ping':
      // 心跳响应
      ws.send(JSON.stringify({ type: 'pong' }));
      break;
    case 'notification':
      showNotification(message.data);
      break;
    default:
      console.log('未知消息类型:', message.type);
  }
}
```

---

## 连接管理

### 关闭连接

```javascript
// 正常关闭
ws.close();

// 指定关闭码和原因
ws.close(1000, 'Normal closure');

// 业务层关闭
ws.close(4000, 'User logged out');
```

### 关闭状态码

#### 标准关闭码（1000-1999）

| 代码 | 名称 | 说明 |
|------|------|------|
| 1000 | Normal Closure | 正常关闭 |
| 1001 | Going Away | 端点离开（如页面关闭） |
| 1002 | Protocol Error | 协议错误 |
| 1003 | Unsupported Data | 不支持的数据类型 |
| 1005 | No Status Received | 无状态码（保留） |
| 1006 | Abnormal Closure | 异常关闭（无关闭帧） |
| 1007 | Invalid Frame Payload Data | 无效帧数据 |
| 1008 | Policy Violation | 违反策略 |
| 1009 | Message Too Big | 消息过大 |
| 1010 | Mandatory Ext. | 缺少必要扩展 |
| 1011 | Internal Error | 服务器内部错误 |
| 1012 | Service Restart | 服务重启 |
| 1013 | Try Again Later | 暂时不可用 |
| 1014 | Bad Gateway | 网关错误 |
| 1015 | TLS Handshake | TLS 握手失败 |

#### 自定义关闭码（3000-4999）

```javascript
// 注册相关
ws.close(3000, 'Not registered');
ws.close(3001, 'Already registered');

// 认证相关
ws.close(4000, 'Invalid token');
ws.close(4001, 'Token expired');
ws.close(4002, 'Permission denied');

// 业务相关
ws.close(4500, 'Room full');
ws.close(4501, 'Kicked by admin');
```

### 处理关闭事件

```javascript
ws.onclose = (event) => {
  const closeInfo = {
    code: event.code,        // 关闭码
    reason: event.reason,    // 关闭原因
    wasClean: event.wasClean // 是否正常关闭
  };
  
  console.log('关闭信息:', closeInfo);
  
  // 根据关闭码处理
  switch (event.code) {
    case 1000:
      console.log('正常关闭');
      break;
    case 1006:
      console.log('连接异常断开，需要重连');
      break;
    case 4001:
      console.log('认证失败，请重新登录');
      redirectToLogin();
      break;
    default:
      console.log('连接关闭:', event.reason);
  }
};
```

---

## 高级封装

### 完整的 WebSocket 客户端类

```javascript
class WebSocketClient {
  constructor(options) {
    this.url = options.url;
    this.protocols = options.protocols || [];
    this.reconnect = options.reconnect ?? true;
    this.reconnectInterval = options.reconnectInterval || 3000;
    this.reconnectAttempts = options.reconnectAttempts || 5;
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    this.heartbeatTimeout = options.heartbeatTimeout || 5000;
    
    this.ws = null;
    this.reconnectCount = 0;
  }
  
  // 建立连接
  connect() {
    this.ws = new WebSocket(this.url, this.protocols);
    
    this.ws.onopen = () => {
      this.reconnectCount = 0;
      this.emit('open');
      this.startHeartbeat();
    };
    
    this.ws.onmessage = (event) => {
      this.emit('message', JSON.parse(event.data));
    };
    
    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.emit('close');
      if (this.reconnect) {
        this.scheduleReconnect();
      }
    };
    
    this.ws.onerror = (error) => {
      this.emit('error', error);
    };
  }
  
  // 心跳机制
  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        // 设置心跳超时
        this.heartbeatTimerId = setTimeout(() => {
          this.ws.close();  // 无响应则关闭重连
        }, this.heartbeatTimeout);
      }
    }, this.heartbeatInterval);
  }
  
  stopHeartbeat() {
    clearInterval(this.heartbeatTimer);
    clearTimeout(this.heartbeatTimerId);
  }
  
  // 重连（带退避）
  scheduleReconnect() {
    if (this.reconnectCount >= this.reconnectAttempts) return;
    this.reconnectCount++;
    const delay = this.reconnectInterval * this.reconnectCount;
    setTimeout(() => this.connect(), delay);
  }
  
  // 发送消息
  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
  
  // 事件监听
  on(type, handler) {
    if (!this.handlers) this.handlers = {};
    (this.handlers[type] ||= []).push(handler);
    return () => this.off(type, handler);
  }
  
  off(type, handler) {
    if (this.handlers?.[type]) {
      this.handlers[type] = this.handlers[type].filter(h => h !== handler);
    }
  }
  
  emit(type, data) {
    this.handlers?.[type]?.forEach(handler => handler(data));
  }
}


// 创建客户端实例
const client = new WebSocketClient({
  url: 'wss://example.com/ws'
});

// 建立连接
client.connect();

// 发送消息
client.send({ type: 'chat', content: 'Hello' });
```

### 指数退避重连策略

```javascript
class WebSocketWithBackoff extends WebSocketClient {
  constructor(options) {
    super(options);
    this.baseInterval = options.reconnectInterval || 1000;
    this.maxInterval = options.maxReconnectInterval || 30000;
    this.backoffFactor = options.backoffFactor || 1.5;
  }
  
  getNextReconnectInterval() {
    const interval = Math.min(
      this.baseInterval * Math.pow(this.backoffFactor, this.reconnectCount),
      this.maxInterval
    );
    // 添加随机抖动
    return interval + Math.random() * 1000;
  }
}

// 使用示例
const client = new WebSocketWithBackoff({
  url: 'wss://example.com/ws',
  reconnectInterval: 1000,
  maxReconnectInterval: 30000,
  backoffFactor: 1.5
});
```

---

## 实战应用

### 场景一：实时聊天室

```javascript
class ChatRoom {
  constructor(roomId, userId) {
    this.roomId = roomId;
    this.userId = userId;
    this.ws = new WebSocketClient({
      url: `wss://chat.example.com/ws?room=${roomId}&user=${userId}`
    });
    this.messageHandlers = new Map();
    
    this.setupHandlers();
    this.ws.connect();
  }
  
  // 设置消息处理
  setupHandlers() {
    this.ws.on('message', (message) => {
      switch (message.type) {
        case 'chat':
          this.handleChatMessage(message);
          break;
        case 'system':
          this.handleSystemMessage(message);
          break;
        case 'typing':
          this.handleTyping(message);
          break;
        default:
          console.log('未知消息:', message);
      }
    });
  }
  
  // 发送聊天消息
  send(content) {
    this.ws.send({ type: 'chat', roomId: this.roomId, content, userId: this.userId });
  }
  
  // 发送输入中状态
  sendTyping() {
    this.ws.send({ type: 'typing', roomId: this.roomId, userId: this.userId });
  }
  
  // 离开房间
  leave() {
    this.ws.send({ type: 'leave', roomId: this.roomId, userId: this.userId });
    this.ws.close();
  }
  
  handleChatMessage(message) {
    this.messageHandlers.get('message')?.forEach(handler => handler(message));
  }
  
  handleSystemMessage(message) {
    this.messageHandlers.get('system')?.forEach(handler => handler(message));
  }
  
  handleTyping(message) {
    this.messageHandlers.get('typing')?.forEach(handler => handler(message));
  }
  
  // 注册消息处理
  on(type, handler) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type).push(handler);
  }
}

// 使用
const chat = new ChatRoom('room1', 'user1');
chat.on('message', (data) => {
  console.log('收到消息:', data.content);
});
chat.on('system', (data) => {
  showNotification(`${data.username} 离开了聊天室`);
});

chat.on('typing', (data) => {
  showTypingIndicator(data.userId);
});
```

### 场景二：实时数据仪表板

```javascript
class Dashboard {
  constructor() {
    this.ws = null;
    this.subscriptions = new Set();
    this.data = {};
  }
  
  connect() {
    this.ws = new WebSocketClient({
      url: 'wss://data.example.com/ws',
      heartbeatInterval: 30000
    });
    
    this.ws.on('message', (message) => {
      // 更新数据并触发图表刷新
      this.data[message.topic] = message.value;
      this.updateChart(message.topic, message.value);
    });
    
    this.ws.connect();
  }
  
  // 订阅数据源
  subscribe(topic) {
    this.subscriptions.add(topic);
    this.ws.send({ type: 'subscribe', topic });
  }
  
  // 取消订阅
  unsubscribe(topic) {
    this.subscriptions.delete(topic);
    this.ws.send({ type: 'unsubscribe', topic });
  }
  
  // 更新图表
  updateChart(topic, value) {
    console.log(`[${topic}] 更新为:`, value);
    // 实际项目中触发图表库重绘
  }
}

// 使用
const dashboard = new Dashboard();
dashboard.connect();

dashboard.subscribe('stock:AAPL');
dashboard.subscribe('weather:beijing');
dashboard.subscribe('server:metrics');
```

### 场景三：协作编辑器

```javascript
class CollaborativeEditor {
  constructor(documentId) {
    this.documentId = documentId;
    this.version = 0;
    this.pendingOps = [];
    this.ws = null;
    
    this.connect();
  }
  
  connect() {
    this.ws = new WebSocketClient({
      url: `wss://collab.example.com/ws?doc=${this.documentId}`
    });
    
    this.ws.on('message', (message) => {
      switch (message.type) {
        case 'op':
          this.applyOperation(message.op);
          break;
        case 'sync':
          this.version = message.version;
          break;
        case 'cursor':
          this.updateCursor(message.userId, message.position);
          break;
      }
    });
    
    this.ws.connect();
  }
  
  // 应用远端操作（OT 合并）
  applyOperation(op) {
    this.pendingOps.push(op);
    // 实际项目中进行 OT 转换和合并
    this.version++;
    this.applyToDocument(op);
  }
  
  // 发送本地操作
  sendOperation(op) {
    this.ws.send({ type: 'op', docId: this.documentId, version: this.version, op });
  }
  
  // 发送光标位置
  updateCursorPosition(position) {
    this.ws.send({
      type: 'cursor',
      docId: this.documentId,
      position
    });
  }
  
  applyToDocument(op) {
    console.log('应用到文档:', op);
  }
  
  updateCursor(userId, position) {
    console.log(`用户 ${userId} 光标位置:`, position);
  }
}
```

---

## 安全与性能

### 安全最佳实践

```javascript
// 1. 始终使用加密连接
const ws = new WebSocket('wss://example.com/ws'); // ✅
// const ws = new WebSocket('ws://example.com/ws'); // ❌ 生产环境避免

// 2. 验证消息来源
ws.onmessage = (event) => {
  if (event.origin !== 'https://example.com') {
    console.warn('消息来源可疑:', event.origin);
    return;
  }
  // 处理消息
};

// 3. 消息发送限流（防止刷屏）
class RateLimiter {
  constructor(maxCount = 10, windowMs = 1000) {
    this.maxCount = maxCount;
    this.windowMs = windowMs;
    this.timestamps = [];
  }
  
  // 检查是否允许发送
  allow() {
    const now = Date.now();
    // 移除窗口外的记录
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);
    if (this.timestamps.length >= this.maxCount) {
      return false;  // 超过限流
    }
    this.timestamps.push(now);
    return true;
  }
}

// 使用
const limiter = new RateLimiter(10, 1000);
function sendMessage(ws, data) {
  if (!limiter.allow()) {
    console.warn('消息发送过于频繁');
    return false;
  }
  ws.send(data);
  return true;
}
```

### 性能优化

```javascript
// 1. 批量发送消息
class MessageBatcher {
  constructor(ws, interval = 100) {
    this.ws = ws;
    this.interval = interval;
    this.queue = [];
    this.timer = null;
  }
  
  add(message) {
    this.queue.push(message);
    
    // 首次加入时启动定时器批量发送
    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.interval);
    }
  }
  
  // 批量发送队列中的所有消息
  flush() {
    if (this.queue.length === 0) {
      this.timer = null;
      return;
    }
    // 合并为一条批量消息发送
    this.ws.send(JSON.stringify({ type: 'batch', messages: this.queue }));
    this.queue = [];
    this.timer = null;
  }
  
  // 立即刷新并销毁
  destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.flush();
    }
  }
}

// 2. 连接池管理（复用连接）
class ConnectionPool {
  constructor(size = 5) {
    this.connections = Array.from({ length: size }, () => ({
      isAvailable: true,
      ws: null
    }));
  }
  
  getConnection() {
    return this.connections.find(conn => conn.isAvailable);
  }
  
  release(conn) {
    conn.isAvailable = true;
  }
}
```

---

## 调试技巧

### 开发环境调试

```javascript
// 创建带日志的 WebSocket 包装器
function createDebugWebSocket(url) {
  const ws = new WebSocket(url);
  const originalSend = ws.send.bind(ws);
  
  ws.send = function(data) {
    console.log('[WS Send]', typeof data === 'string' ? data : 'Binary data');
    return originalSend(data);
  };
  
  ws.addEventListener('open', () => {
    console.log('[WS] 连接已建立');
  });
  
  ws.addEventListener('message', (event) => {
    console.log('[WS Receive]', event.data);
  });
  
  ws.addEventListener('close', (event) => {
    console.log('[WS Close]', `code: ${event.code}, reason: ${event.reason}`);
  });
  
  ws.addEventListener('error', (error) => {
    console.error('[WS Error]', error);
  });
  
  return ws;
}
```

### Chrome DevTools 调试

```
1. 打开 DevTools (F12)
2. 切换到 Network 标签
3. 筛选 "WS" (WebSocket)
4. 选择连接查看:
   - Headers: 握手信息
   - Messages: 收发消息记录
   - Timing: 连接时序
```

### 常见问题排查

```javascript
// 连接状态监控
class WebSocketMonitor {
  constructor(ws) {
    this.ws = ws;
    this.startTime = Date.now();
    this.messageCount = 0;
    this.errorCount = 0;
    
    this.setupMonitoring();
  }
  
  setupMonitoring() {
    this.ws.addEventListener('open', () => {
      console.log('连接建立耗时:', Date.now() - this.startTime, 'ms');
    });

    this.ws.addEventListener('message', () => {
      this.messageCount++;
    });

    this.ws.addEventListener('error', () => {
      this.errorCount++;
    });

    this.ws.addEventListener('close', () => {
      console.log('连接关闭');
    });

    // 定期上报统计
    setInterval(() => {
      console.log('[监控]', {
        messageCount: this.messageCount,
        errorCount: this.errorCount,
        upTime: Date.now() - this.startTime
      });
    }, 60000);
  }
}

// 使用
const ws = new WebSocket('wss://example.com/ws');
new WebSocketMonitor(ws);
```

---

## 浏览器兼容性

### 兼容性表格

| 浏览器 | 最低版本 | 备注 |
|--------|----------|------|
| Chrome | 4+ | 完全支持 |
| Firefox | 4+ | 完全支持 |
| Safari | 5+ | 完全支持 |
| Edge | 12+ | 完全支持 |
| IE | 10+ | 部分支持（不支持二进制） |
| iOS Safari | 4.2+ | 完全支持 |
| Android Browser | 4.4+ | 完全支持 |

### 特性检测与降级

```javascript
// 检测 WebSocket 支持
function getWebSocket() {
  // 优先使用原生 WebSocket
  if ('WebSocket' in window) {
    return WebSocket;
  }
  
  // 早期 Firefox（6~10）曾使用带前缀的 MozWebSocket
  if ('MozWebSocket' in window) {
    return MozWebSocket;
  }
  
  // 都不支持：返回 null，由业务侧降级处理
  return null;
}

// 检测可用的实时通信降级方案
function getFallbackOptions() {
  return {
    websocket: 'WebSocket' in window || 'MozWebSocket' in window,
    sse: typeof EventSource !== 'undefined',
    longPolling: typeof fetch !== 'undefined' || typeof XMLHttpRequest !== 'undefined',
    binary: 'ArrayBuffer' in window,
    blob: 'Blob' in window
  };
}
```

---

## 常见问题

### Q1: WebSocket 连接为什么会自动断开？

**原因分析：**
- 网络不稳定或切换
- 服务器超时未收到心跳
- 代理服务器/Nginx 超时配置
- 浏览器进入后台（移动端）

**解决方案：**
```javascript
// 实现自动重连 + 心跳检测
const client = new WebSocketClient({
  url: 'wss://example.com/ws',
  reconnect: true,
  heartbeatInterval: 30000
});
```

### Q2: 如何处理跨域 WebSocket 连接？

**解决方案：**
WebSocket 不受同源策略的 CORS 约束——浏览器不会对 WebSocket 握手做 CORS 校验，也不需要 `Access-Control-Allow-Origin` 响应头。是否接受跨域连接完全由服务器决定：服务器应在握手阶段校验 `Origin` 请求头，拒绝不受信任的来源。

```javascript
// 客户端正常连接
const ws = new WebSocket('wss://api.other-domain.com/ws');

// 服务器在握手时校验 Origin（Node.js + ws 示例）
new WebSocket.Server({
  port: 8080,
  verifyClient: (info) => allowedOrigins.includes(info.origin)
});
```

### Q3: 如何在 WebSocket 中实现认证？

**方案一：URL 参数（简单场景）**
```javascript
const token = localStorage.getItem('token');
const ws = new WebSocket(`wss://example.com/ws?token=${token}`);
```

**方案二：首条消息认证（推荐）**
```javascript
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'auth',
    token: localStorage.getItem('token')
  }));
};
```

**方案三：Cookie（同域）**
```javascript
// 浏览器自动携带 Cookie
const ws = new WebSocket('wss://example.com/ws');
// 服务器验证 Cookie 中的 session
```

### Q4: 如何传输大文件？

**解决方案：分片传输**
```javascript
async function sendLargeFile(ws, file, chunkSize = 65536) {
  const totalChunks = Math.ceil(file.size / chunkSize);
  
  // 发送文件信息
  ws.send(JSON.stringify({
    type: 'file_start',
    name: file.name,
    size: file.size,
    totalChunks
  }));
  
  // 分片发送
  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);
    
    const buffer = await chunk.arrayBuffer();
    ws.send(buffer);
    
    // 等待服务器确认
    await waitForAck(ws);
  }
  
  ws.send(JSON.stringify({ type: 'file_end' }));
}
```

### Q5: WebSocket 和 HTTP/2 如何选择？

| 场景 | 推荐 | 原因 |
|------|------|------|
| 实时聊天 | WebSocket | 双向通信，低延迟 |
| 服务器推送 | SSE / WebSocket | 单向即可用 SSE |
| 大量并发连接 | HTTP/2 | 多路复用，减少连接数 |
| 需要兼容性 | HTTP/2 | 更好的浏览器支持 |

---

## 参考资源

- [MDN - WebSocket API](https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket)
- [RFC 6455 - WebSocket Protocol](https://tools.ietf.org/html/rfc6455)
- [HTML5 Rocks - WebSockets](https://www.html5rocks.com/zh/tutorials/websockets/basics/)

---

> 💡 **最佳实践提示**：
> 1. 生产环境始终使用 `wss://` 加密连接
> 2. 实现心跳检测和自动重连机制
> 3. 对消息进行格式验证和内容过滤
> 4. 控制消息频率，防止服务器过载
> 5. 提供降级方案以支持旧浏览器
