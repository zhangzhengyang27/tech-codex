---
title: "手写一个Zustand"
description: "近几年出了很多可以替代 redux 的优秀状态管理库，zustand 是其中最优秀的一个。"
keywords: [手写一个Zustand]
category: React
tags: [React, 状态管理与路由]
---

# 手写一个Zustand

## 学习目标

- 理解并掌握 手写一个Zustand 的核心原理与工程实践

## 总结

近几年出了很多可以替代 redux 的优秀状态管理库，zustand 是其中最优秀的一个。

它的特点有很多：体积小、简单、支持中间件扩展。

它的核心就是一个 create 函数，传入 state 来创建 store。

create 返回的函数可以传入 selector，取出部分 state 在组件里用。

它的中间件和 redux 一样，就是一个高阶函数，可以对 get、set 做一些扩展。

zustand 内置了 immer、persist 等中间件，我们也自己写了一个 log 的中间件。

zustand 本身的实现也很简单，就是 getState、setState、subscribe 这些功能，然后再加上 useSyncExternalStore 来触发组件 rerender。

一共也就 60 行代码。

这样一个简单强大、非常流行的状态管理库，你确定不自己手写一个试试么？

## 继续阅读

- 上一篇：[07-ReactContext的性能缺点和解决方案](07-ReactContext的性能缺点和解决方案)
- 下一篇：[09-原子化状态管理库Jotai](09-原子化状态管理库Jotai)
