---
title: Edge Runtime
description: Next.js Edge Runtime 的特性、限制与适用场景，对比 Node.js Runtime
keywords: [Edge Runtime, Node.js Runtime, 边缘计算, Vercel Edge]
category: Next.js
tags: [Next.js]
---

# Edge Runtime

## 1. 概念说明

在 Next.js 中涉及 Edge Runtime 和 Node.js Runtime 两个概念。运行时（runtime）可以理解为执行期间一组可用的库、API、和常规功能的集合。在服务端，有两个可以用于渲染应用的运行时：

*   Node.js Runtime，这是默认的运行时，可以使用 Node.js API 和其生态的包
*   Edge Runtime，基于 [Web API](https://nextjs.org/docs/app/api-reference/edge)

在 Next.js 中，Edge Runtime 是 Node.js API 的子集，功能上虽有限制，但对应也更轻量，速度也更快，适用于开发小而简单的功能，以低延迟实现动态、个性化的内容。

## 2. 原理：从 CDN 到边缘计算

要准确理解 Edge Runtime 这个概念，需要从 CDN 开始说起。

CDN，全称 Content Delivery Network，中文译为“内容分发网络”，它是由分布于不同地理位置的服务器及数据中心组成的虚拟网络，目的在于以最小的延迟将内容分发给用户。举例来说，在杭州请求在美国的网站，因为物理距离太远，响应会有延迟，但如果将网站的内容同步到杭州的服务器上，转而请求杭州服务器上的内容，响应时间就会加快。这组在杭州的用于缓存和传送网络内容的服务器就被称为 “Edge”。

以前的 Edge 只能存储一些静态的资源，随着技术演进，Edge 也开始能够执行代码。当能够执行代码时，CDN 网络就变成了更为强大的边缘网络（Edge Network），在 Edge 发生的计算，也被称为边缘计算，它可以为主要服务器分担一部分处理内容。理解这些概念，有助于理解 Edge Runtime 这个概念，其术语 Edge 指的正是这种面向即时无服务器计算的环境。

与此相关的一个概念是 Serverless。Serverless 每次请求的时候都会开启不同的实例，并重新初始化环境，尽管底层架构会做很多优化，但依然不能最大限度的复用资源。而对于 Edge Runtime，可以通过 Vercel Edge functions 或者 Cloudflare workers 或者其他一些工具来部署 Edge Runtime 环境，Edge Runtime 并不运行 Node.js，而使用 V8 引擎和 Web APIs，这样更加轻量，启动速度更快。多个请求可以使用一个实例，更好的复用资源。

有了 Edge Runtime 的优化再加上 Streaming，响应速度会进一步提升。

::: tip 一句话总结
Edge Runtime 可以理解成一个特殊的运行环境，在这个环境里，只能使用标准的 Web APIs，但对应也会带来更好的性能。至于具体支持哪些 API，查看 Next.js 提供的 [Edge Runtime Supports](https://nextjs.org/docs/app/api-reference/edge) 文档。
:::

## 3. 开启方式

在 Next.js 中可以为单个路由指定运行时。做法是声明一个名为 `runtime` 的变量并导出它。变量必须是字符串，值为 `'nodejs'` 或者 `'edge'`。举个例子：

```javascript
// app/page.js
export const runtime = 'edge' // 'nodejs' (default) | 'edge'
```

也可以在布局上定义 `runtime`，这会将 Edge Runtime 应用于该布局下的所有路由：

```javascript
// app/layout.js
export const runtime = 'edge' // 'nodejs' (default) | 'edge'
```

如果没有声明，默认是 Node.js Runtime，所以如果不打算修改，也无须使用该选项。

## 4. 实践要点

- Edge Runtime 的 API 是 Node.js API 的子集，只支持标准 Web APIs，迁移代码前需确认所依赖的 Node.js API（如文件系统、部分 Node 内置模块）是否可用。
- 适用场景：小而简单的功能，以低延迟实现动态、个性化的内容，如 A/B 测试、请求改写、认证中间件等。
- 部署载体：Vercel Edge Functions、Cloudflare Workers 等，均基于 V8 引擎而非完整的 Node.js 进程。
- 与 Serverless 的关键差异：多个请求可复用同一个实例，资源复用率更高，冷启动更快。

## 小结

Next.js 服务端有两个运行时：默认的 Node.js Runtime（支持完整 Node.js API）与基于 Web API 的 Edge Runtime（轻量、快速但功能受限）。Edge Runtime 的“Edge”源自 CDN 边缘节点概念，即靠近用户、面向即时无服务器计算的环境；相比传统 Serverless，它基于 V8 引擎运行，多请求共享实例，启动更快。通过导出 `runtime = 'edge'` 变量，可以在页面或布局级别开启 Edge Runtime。

## 参考链接

1.  <https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming>
2.  <https://edge-runtime.vercel.app/>
3.  <https://www.cdnetworks.com/cn/what-is-a-cdn/>
4.  <https://zhuanlan.zhihu.com/p/510366735>
