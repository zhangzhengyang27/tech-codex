---
title: Express 5 新特性与升级指南
description: Express 5 的路由机制、异步处理、路径匹配语法变化，以及从 Express 4 平滑迁移的注意事项
keywords: [Node.js, Web框架, Express, Express5, 升级, path-to-regexp]
category: Node.js
tags: [Node.js, Web框架]
---


# Express 5 新特性与升级指南

Express 5（2024 年 9 月发布的正式版本）是其久候多年的重大版本更新。它移除了对 Node 旧版本的兼容、升级了路由底层（切换到新版 `path-to-regexp`），并原生支持 async 错误处理。若你的项目仍停留在 Express 4，理解这些差异能帮你平稳升级。

> **前置知识**：先熟悉 [路由系统](02-路由系统.md) 与 [中间件](03-中间件.md)。

## 一、为什么要升级到 Express 5

| 改进 | Express 4 | Express 5 |
|------|-----------|-----------|
| 异步错误处理 | 需手动 `try/catch` + `next(err)` | async 路由抛错自动进入错误中间件 |
| 路径匹配库 | `path-to-regexp@0.x` | `path-to-regexp@8.x`（更现代、更安全） |
| Node 版本 | 低至 Node 0.10 | 要求 Node >= 18 |
| 委派功能 | `res.sendfile` | 统一 `res.sendFile` |
| 内部路由属性 | 可访问 `app.router` | 移除，路由器改为内部实现（`app._router` 仅限调试） |

**最关键**：Express 5 让 `async` Handler 抛出的 `Promise` 拒绝能被自动捕获，彻底告别「异步错误静默吞掉」的坑。

## 二、核心新特性

### 2.1 原生支持 async 错误传播

```javascript
// Express 5：无需包装，抛出的错误自动进入错误中间件
app.get("/async", async (req, res) => {
  const data = await fetchData();
  if (!data) throw new Error("数据加载失败"); // 自动被错误中间件捕获
  res.json(data);
});

// Express 4 则需要手动处理（对比）
app.get("/async", async (req, res, next) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});
```

这意味着可以大幅简化代码，去掉到处可见的 `asyncHandler` 包装器。

### 2.2 输入校验自动向前传递

当内容体解析失败（如非法 JSON）时，Express 5 会自动将错误传给错误处理中间件：

```javascript
app.use(express.json());
app.post("/data", (req, res) => res.json({ received: req.body }));

// 错误处理中间件可捕获 body 解析错误
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "请求体不是合法 JSON" });
  }
  next(err);
});
```

### 2.3 请求体解析增强

```javascript
// 支持通配匹配的 content-type 通配符
app.use(express.json({ type: "*/json" }));

// 可指定 strict 行为
app.use(express.json({ strict: true })); // 仅接受数组和对象
```

## 三、路径匹配语法变化（重点迁移点）

Express 5 使用新版 `path-to-regexp@8`，路由参数语法与 4 有差异：

| 场景 | Express 4 | Express 5 |
|------|-----------|-----------|
| 简单参数 | `/:id` | `/:id`（不变） |
| 可选参数 | `/:id?` | `{/:id}`（可选组，`?` 后缀已不再支持） |
| 通配捕获 | `*` | `*splat`（命名）或 `{*splat}` |
| 参数内嵌正则 | `/:id(\d+)` | 不再支持，改用参数校验中间件或正则路由 |

### 3.1 通配符写法

```javascript
// Express 4
app.get("/files/*", (req, res) => res.send(req.params[0]));

// Express 5（命名通配）
app.get("/files/*splat", (req, res) => res.send(req.params.splat));
```

### 3.2 可选参数写法

```javascript
// Express 5 推荐：可选组 {/:page}
app.get("/books{/:page}", (req, res) => {
  res.json({ page: req.params.page });
});
```

### 3.3 迁移须知

- 大量使用正则路由的旧项目升级需重写路由，这是最主要的破坏性变更。
- 强烈建议升级后跑一遍路由相关 E2E 用例。

## 四、不再支持 `res.sendfile` / `res.redirect` 行为变化

```javascript
// Express 4 曾同时支持 sendfile（小写）
res.sendfile("data.txt");

// Express 5 统一为 sendFile（驼峰），并为流式错误改进了错误处理
res.sendFile(path.join(__dirname, "data.txt"));
```

`res.redirect("back")`、`res.redirect(301, url)` 行为保持，但运行时抛出 `ERR_HTTP_HEADERS_SENT` 检查更严格。

## 五、从 Express 4 平滑升级步骤

### 5.1 兼容层与依赖

```bash
# 升级主包
npm install express@5
```

查看兼容中间件（大多数主流中间件已支持 5）。若个别中间件仍不兼容，先在隔离分支测试，或临时锁定其旧版本。

### 5.2 检查清单

- [ ] 全部路由参数语法迁移到 `path-to-regexp@8` 规则
- [ ] `res.sendfile` → `res.sendFile`
- [ ] 移除多余的手动 `next(err)` 包装（可选，保留也兼容）
- [ ] Node 版本升级到 >= 18
- [ ] 跑通单测 + 路由/接口 E2E
- [ ] `npm ls express` 确认无依赖锁定在 4

### 5.3 小步回归

先用一条不影响主链路的服务验证 5 的行为，再逐模块切换；前端联调关注 404/路由通配后的路径形态。

## 六、新项目默认用 Express 5

新项目可直接：

```bash
npm install express@5
```

并享受 async 自动错误处理带来的整洁代码。若团队里存在大量历史正则路由，则按需评估是否强制升级。

---

## 常见问题

### Q1: 升级后很多路由 404 了？

大概率是通配/正则语法差异。用上文「路径匹配语法变化」对照重写。

### Q2: 还兼容 `app.route().get(...)` 吗？

兼容，链式路由 (`app.route`) 与 `express.Router` 均在 5 中保留。

### Q3: 某些中间件不兼容 5？

检查其 `express` 的 peerDependency；多数活跃中间件已发布 5 兼容版本。

---

## 下一步学习

- [性能优化与 WebSocket](10-性能优化与WebSocket.md)
- [Express 应用分层架构实战](07-中级应用分层架构实战.md)