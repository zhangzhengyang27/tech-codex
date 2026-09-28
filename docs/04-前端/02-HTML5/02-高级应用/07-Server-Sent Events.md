---
title: Server-Sent Events
description: 基于 HTTP 的服务器单向推送技术，对比 WebSocket 的轻量方案
keywords: [SSE, EventSource, 服务器推送, 长连接]
category: HTML5
tags: [HTML5, Web API, 实时通信]
---

# Server-Sent Events (SSE)

`Server-Sent Events`（SSE）是一种基于 HTTP 的服务器向客户端**单向推送**技术，使用 `EventSource` 接口接收服务端持续发送的文本事件流。它适合股票行情、消息通知、日志推送等"服务器主动推、客户端只收"的场景。

## 与 WebSocket 的区别

| 维度 | SSE | WebSocket |
| ---- | --- | --------- |
| 通信方向 | 服务器 → 客户端（单向） | 双向全双工 |
| 传输协议 | 基于 HTTP/HTTPS | 独立 `ws://` 协议 |
| 数据格式 | 纯文本事件流 | 二进制 / 文本帧 |
| 自动重连 | 浏览器原生支持 | 需手动实现 |
| 断点续传 | 支持 `Last-Event-ID` | 需自行设计 |
| 复杂度 | 低 | 中高 |

:::: tip 提示
若仅需服务器推送、不需要客户端频繁回传，优先选择 SSE，实现成本远低于 WebSocket。
::::

## 客户端用法

```js
const source = new EventSource('https://api.example.com/stream');

source.onmessage = (event) => {
  console.log('收到消息:', event.data);
};

source.onerror = (error) => {
  console.error('连接异常:', error);
};
```

### 自定义事件类型

服务端可通过 `event:` 字段指定事件名，客户端用 `addEventListener` 监听：

```js
source.addEventListener('price', (event) => {
  const data = JSON.parse(event.data);
  console.log('股价更新:', data.symbol, data.price);
});

source.addEventListener('alert', (event) => {
  console.warn('系统告警:', event.data);
});
```

### 关闭连接

```js
source.close();
```

## 服务端实现要求

SSE 要求服务端响应满足以下条件（以 Node.js 为例）：

```js
// Node.js (Express) 示例
app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const interval = setInterval(() => {
    const payload = JSON.stringify({ time: new Date().toISOString() });
    res.write(`data: ${payload}\n\n`);
  }, 1000);

  req.on('close', () => {
    clearInterval(interval);
    res.end();
  });
});
```

### 事件流格式规范

每条消息由若干字段组成，以空行 `\n\n` 结束：

```
event: price
data: {"symbol": "AAPL", "price": 192.3}
id: 1024

data: 这是一条默认事件(onmessage 接收)
```

| 字段 | 作用 |
| ---- | ---- |
| `data:` | 消息内容（可多行，拼接为单行） |
| `event:` | 自定义事件类型 |
| `id:` | 事件 ID，断线后由 `Last-Event-ID` 头回传 |
| `retry:` | 重连间隔时间（毫秒） |

## 断线重连与续传

浏览器在连接意外断开时会**自动重连**，并在请求头带上最后一次收到的 `Last-Event-ID`：

```js
source.onopen = () => console.log('连接已建立');
```

服务端可据此从断点继续推送，避免消息丢失：

```js
app.get('/stream', (req, res) => {
  const lastId = Number(req.headers['last-event-id'] || 0);
  // 从 lastId 之后的消息继续推送……
});
```

## 完整可运行示例

以下示例用纯前端模拟 `EventSource` 的推送与自动重连语义（无需后端即可观察效果）：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>SSE 推送演示</title>
</head>
<body>
  <button id="startBtn">开始推送</button>
  <button id="stopBtn">停止</button>
  <pre id="log"></pre>

  <script>
    const log = document.getElementById('log');
    let timer = null, count = 0;

    document.getElementById('startBtn').onclick = () => {
      if (timer) return;
      log.textContent = '连接已建立（模拟 EventSource）\n';
      timer = setInterval(() => {
        count++;
        const time = new Date().toLocaleTimeString();
        log.textContent += `📨 #${count}  ${time}  服务器推送数据\n`;
        if (count % 5 === 0) {
          log.textContent += `↻ 自动重连机制就绪（心跳 #${count}）\n`;
        }
      }, 1000);
    };

    document.getElementById('stopBtn').onclick = () => {
      clearInterval(timer);
      timer = null;
      log.textContent += '连接已关闭 (source.close())\n';
    };
  </script>
</body>
</html>
```

### 浏览器兼容性

所有现代浏览器均支持 `EventSource`。注意旧版 IE/Edge（非 Chromium 内核）不支持，生产环境需评估兼容方案（如 polyfill 或降级为轮询）。
