---
title: "React Server Components 原理"
description: "Server Components（RSC）把组件拆分为服务端 / 客户端两类，通过序列化协议与流式渲染实现「服务端取数、客户端零 JS」。本章拆解它的传输格式与渲染模型。"
keywords: [RSC, Server Components, 序列化协议, 流式渲染]
category: React
tags: [React, 原理与源码]
---

# React Server Components 原理

## 学习目标

- 理解 RSC 的「服务端 / 客户端」组件二分模型
- 掌握 RSC 的序列化协议（RSC Wire Format）
- 理解流式渲染（streaming）与 Suspense 的协作

## 两类组件的边界

RSC 把组件按运行位置分为：

- **Server Component（默认）**：在服务端渲染，可以 `async/await` 直接取数，产物**不携带 JS** 到浏览器；
- **Client Component**：用 `'use client'` 标记，会打包进客户端 bundle，拥有交互与 hooks 能力。

```jsx
// Server Component
async function Article({ id }) {
  const data = await db.article.find(id); // 服务端直连数据库
  return <h1>{data.title}</h1>;
}
```

Server Component 可以引入 Client Component，反之不行（Client 无法反向包含服务端逻辑），边界由 `'use client'` 指令划定。

## RSC 序列化协议

服务端渲染 Server Component 后，不是产出 HTML，而是产出一种**带引用的序列化流**（RSC Payload）。它描述组件树、props，以及 Client Component 的「占位引用」：

```
1:I["client#Counter",["client-chunk.js","hash"],"Counter"]
0:["$","@1",null,{"initial":0}]
```

浏览器收到后：服务端组件部分直接成为 UI，Client Component 部分按引用加载对应 chunk。这样实现了「服务端取数、客户端只拿交互代码」。

## 流式渲染

RSC 支持边算边发（streaming）。结合 `<Suspense>`，服务端可以先用 fallback 占位，待某个异步 Server Component 就绪后再把这段补发到同一个流里，浏览器增量拼接。这正是 [14-React 19 新特性概览](../01-基础概念/14-React%2019%20新特性概览) 中 `use(promise)` 在服务端的落地基础。

## 与 Next.js 的关系

RSC 是 React 的**模型规范**，具体路由、缓存、打包由框架实现（如 Next.js App Router）。React 本身不提供文件系统路由，因此 RSC 的工程化部署请参考本站 Next.js 分类。

## 总结

RSC 的核心是「用序列化协议替换 HTML，用指令划定服务端/客户端边界，用流式渲染衔接 Suspense」。它让取数逻辑留在服务端，客户端 bundle 大幅瘦身。

## 继续阅读

- 上一篇：[16-React18的并发机制是怎么实现的](16-React18的并发机制是怎么实现的)
- 下一篇：[20-use Hook 实现原理](18-useHook实现原理)
