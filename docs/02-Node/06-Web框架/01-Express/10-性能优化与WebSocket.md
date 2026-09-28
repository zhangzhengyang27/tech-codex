---
title: Express 性能优化与 WebSocket
description: 请求调优、压缩、连接池、集群、缓存与压测，以及基于 ws/socket.io 的 WebSocket 集成
keywords: [Node.js, Web框架, Express, 性能优化, WebSocket, socket.io]
category: Node.js
tags: [Node.js, Web框架]
---


# Express 性能优化与 WebSocket

性能优化不是玄学，而是一层一层消除瓶颈的过程。本专题先给出一份可落地的 Express 性能优化清单，再接入 WebSocket 实现实时双向通信。

> **前置知识**：先理解 [中间件](03-中间件.md) 与 [错误处理](04-错误处理.md)。

## 一、性能优化分层

### 1.1 应用层优化

**中间件顺序**：把耗时短、不依赖业务的中间件放前面；限流、压缩、静态文件尽量前置。

```javascript
const express = require("express");
const compression = require("compression");
const helmet = require("helmet");
const cors = require("cors");
const app = express();

app.disable("x-powered-by");      // 关闭指纹
app.set("trust proxy", true);      // 反向代理下拿到真实 IP
app.use(helmet());
app.use(compression());            // Gzip 压缩响应
app.use(express.json({ limit: "1mb" }));
```

**静态资源**：交给 Nginx/CDN 而非 Node 进程，Node 只服务动态接口。

### 1.2 数据库与连接池

所有数据库访问务必使用连接池，避免每次请求新建连接：

```javascript
const { createPool } = require("mysql2/promise");
const db = createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 10,
  waitForConnections: true,
});
```

- 查询加索引、避免 N+1、用 Redis 缓存热点数据。
- 大列表用分页/游标，杜绝全表扫描。

### 1.3 缓存策略

```javascript
// 设置合理的 Cache-Control / ETag
app.get("/hot", (req, res) => {
  res.set("Cache-Control", "public, max-age=60");
  res.json(hotData);
});

// Redis 缓存热点接口（node-redis v4 语法）
async function cached(key, ttl, loader) {
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);
  const value = await loader();
  await redis.set(key, JSON.stringify(value), { EX: ttl });
  return value;
}
```

### 1.4 进程级扩展

单实例受限于单核，用 PM2 cluster 充分利用多核：

```bash
pm2 start app.js -i max        # 按 CPU 核数启动 worker
pm2 start app.js -i 0 --name api --max-memory-restart 500M
```

### 1.5 压测验证

```bash
npx autocannon -c 100 -d 10 -p 10 http://localhost:3000/api
```

关注 **P99/P95 延迟** 与 QPS，改一处测一处，避免凭直觉优化。

### 1.6 常见瓶颈速查

| 瓶颈 | 表现 | 对策 |
|------|------|------|
| 同步阻塞 | 高 TTFB | async 化、避免 CPU 密集任务阻塞事件循环 |
| 频繁序列化 | CPU 高 | 开启 HTTP 压缩、减少大对象返回 |
| 无缓存 | 数据库打满 | Redis 缓存 + 索引 |
| 单实例 | 单核打满 | PM2 cluster + Nginx 负载均衡 |

```javascript
// 避免阻塞事件循环：CPU 密集任务交给 worker 线程
const { Worker } = require("node:worker_threads");
```

## 二、WebSocket 集成到 Express

WebSocket 实现服务端推送、聊天、实时同步。两种方案：`ws`（轻量底层）与 `socket.io`（自带房间/自动重连/多语言客户端）。

### 2.1 方案一：`ws`（轻量）

```bash
npm install ws
```

```javascript
const http = require("http");
const express = require("express");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.get("/", (req, res) => res.send("http ok"));

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "welcome" }));

  ws.on("message", (msg) => {
    console.log("received:", msg.toString());
    // 广播给所有客户端
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(msg.toString());
    });
  });
});

server.listen(3000, () => console.log("http + ws on 3000"));
```

**复用同一 HTTP 服务**是关键——WebSocket 握手需走 HTTP Upgrade，共用端口更简单。

### 2.2 方案二：`socket.io`（功能完整）

```bash
npm install socket.io
```

```javascript
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.get("/", (req, res) => res.send("socket.io server"));

io.on("connection", (socket) => {
  socket.emit("ready", { msg: "已连接" });

  socket.join("room-a"); // 加入房间

  socket.on("chat", (payload) => {
    io.to("room-a").emit("chat", { from: socket.id, ...payload });
  });

  socket.on("disconnect", () => console.log("disconnected", socket.id));
});

server.listen(3000);
```

**socket.io 客户端**（前端）：

```html
<script src="/socket.io/socket.io.js"></script>
<script>
  const socket = io();
  socket.on("ready", (d) => console.log(d));
  socket.emit("chat", { text: "你好" });
  socket.on("chat", (d) => console.log("收到", d));
</script>
```

### 2.3 鉴权：在 WebSocket 连接前校验

```javascript
// ws 方案：noServer 模式，握手时通过 token 校验
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const token = parseToken(req.url); // parseToken 为自定义的 token 解析函数
  if (!token) return socket.destroy();
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
});
```

### 2.4 方案对比与选型

| 维度 | `ws` | `socket.io` |
|------|------|-------------|
| 体积 | 精简 | 较全 |
| 断线重连 | 需自研 | 内置自动重连 |
| 房间/广播 | 自实现 | 内置 room/emit |
| 降级 | 纯 WebSocket | 支持轮询降级 |
| 适用 | 定制实时链路 | 快速搭建实时应用 |

---

## 常见问题

### Q1: WebSocket 和 HTTP 同一端口可以吗？

可以，且推荐。WebSocket 握手基于 HTTP Upgrade，用同一个 Node HTTP 服务即可。

### Q2: 性能优化该从哪里下手？

先压测定位瓶颈，再对症下药。通用的前三步：`compression` + HTTP 缓存命中率 + 打开 Redis；随后考虑 PM2 cluster 扩容。

### Q3: Nginx 反代 WebSocket 要特殊配置？

需要开启 Upgrade 头：

```11-Nginx基础概述
location /ws {
    proxy_pass http://node_app;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

## 下一步学习

- [Express 5 新特性与升级](09-Express5新特性与升级.md)
- 深入：数据库层优化可参考本仓库 `后端/01-MySQL` 与 `后端/02-Redis` 系列