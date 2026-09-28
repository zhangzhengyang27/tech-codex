---
title: "手写react-lazyload"
description: "当图片进入可视区域才加载的时候，可以用 react-lazyload。"
keywords: [手写react-lazyload]
category: React
tags: [React, 组件与实战]
---

# 手写react-lazyload

## 学习目标

- 掌握 react-lazyload 的用法
- 掌握 基于 IntersectionObserver 的懒加载实现原理

## 总结

当图片进入可视区域才加载的时候，可以用 react-lazyload。

它支持设置 placeholder 占位内容，设置 offset 距离多少距离进入可视区域触发加载。

此外，它也可以用来实现组件进入可视区域时再加载，配合 React.lazy + import() 即可。

它的实现原理就是 IntersectionObserver，我们自己实现了一遍，设置 rootMargin 也就是 offset，设置 threshold 为 0 也就是一进入可视区域就触发。

图片、组件的懒加载（进入可视区域再触发加载）是非常常见的需求，不但要会用 react-lazyload 实现这种需求，也要能够自己实现。
## 继续阅读

- 上一篇：[20-组件实战-Watermark防删除水印组件](20-组件实战-Watermark防删除水印组件)
- 下一篇：[22-图解网页的各种距离](22-图解网页的各种距离)
