---
title: "ReactContext的性能缺点和解决方案"
description: "context 在跨层传递数据方面很好用，在组件库里用的很多，但是它也有一些性能方面的缺点。"
keywords: [ReactContext的性能缺点和解决方案]
category: React
tags: [React, 状态管理与路由]
---

# ReactContext的性能缺点和解决方案

## 学习目标

- 理解并掌握 ReactContext的性能缺点和解决方案 的核心原理与工程实践

## 总结

context 在跨层传递数据方面很好用，在组件库里用的很多，但是它也有一些性能方面的缺点。

context 中如果是一个对象，不管任意属性变了，都会导致依赖其它属性的组件跟着重新渲染。

解决这个问题有几种方案：

- 拆分 context，每种数据放在一个 context 里
- 用 zustand 等状态管理库，因为它们不是用 context 实现的，自然没有这种问题
- 用 memo 包裹子组件，减少中间层组件不必要的重渲染——但要注意，memo 只对比 props，对**直接消费了该 context 的组件无效**（context 变化会穿透 memo）

context 虽然好用，但是用的时候也要注意下这个性能方面的缺点。

## 继续阅读

- 上一篇：[06-ReactContext的实现原理和在antd里的应用](06-ReactContext的实现原理和在antd里的应用)
- 下一篇：[08-手写一个Zustand](08-手写一个Zustand)
