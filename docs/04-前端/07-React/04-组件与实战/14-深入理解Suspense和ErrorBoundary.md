---
title: "深入理解Suspense和ErrorBoundary"
description: "大多数人用 Suspense 都是结合 React.lazy 异步加载组件的时候用，其实它也可以独立用。"
keywords: [深入理解Suspense和ErrorBoundary]
category: React
tags: [React, 组件与实战]
---

# 深入理解Suspense和ErrorBoundary

## 学习目标

- 掌握 Suspense 的 throw promise 原理
- 掌握 ErrorBoundary 的捕获机制与限制

## 总结

大多数人用 Suspense 都是结合 React.lazy 异步加载组件的时候用，其实它也可以独立用。

它的底层原理就是 throw 一个 promise，然后 React 会捕获这个 promise，交给最近的 Suspense 组件来处理。

类似的，ErrorBoundary 也是这种处理方式，只不过捕获的是 throw 的 error。

ErrorBoundary 只能是 class 组件的形式，通过 getDerivedStateFromError 方法来接收错误修改 state，以及 componentDidCatch 来打印错误日志。

自己写 throw promise 来触发 Suspense 还是很麻烦的，一般我们都不用这个，而是自己写个 loading 的 state 来标识。

不过当你用 next.js、jotai 等框架的时候，因为内部做了 throw promise 的封装，就可以直接用 Suspense 了。

此外，react 有一个 use 的 hook，可以接收 promise，在 pending 的时候触发 Suspense，在 reject 的时候触发 ErrorBoundary，底层原理就是 throw error 和 promise。

这个 hook 已经在 React 19 中正式发布，随着 use 的普及，代码里会有大量 Suspense 的使用。

Suspense 和 ErrorBoundary 看似是两种不同的东西，但其实不管是用法还是实现原理，都是很类似的。
## 继续阅读

- 上一篇：[13-React组件如何写单测](13-React组件如何写单测)
- 下一篇：[15-组件实战-Icon图标组件](15-组件实战-Icon图标组件)
