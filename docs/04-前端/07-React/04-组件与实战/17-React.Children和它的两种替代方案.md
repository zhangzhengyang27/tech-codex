---
title: "React.Children和它的两种替代方案"
description: "我们学了用 React.Children 来修改 children，它有 map、forEach、toArray、only、count 等方法。"
keywords: [React.Children和它的两种替代方案]
category: React
tags: [React, 组件与实战]
---

# React.Children和它的两种替代方案

## 学习目标

- 掌握 React.Children 的常用 api 与使用场景
- 理解 两种替代方案：抽离渲染逻辑为单独组件 / 传入数据 + render props

## 总结

我们学了用 React.Children 来修改 children，它有 map、forEach、toArray、only、count 等方法。

不建议直接用数组方法来操作，而是用 React.Children 的 api。

原因主要是：children 不一定是数组，它可以是字符串、数字、null、React 元素等任意节点，直接用数组方法可能直接报错；而且 React 可能会改写或添加 children 上的 key，直接操作数组拿到的 key 不一定是原始传入的。

当然，官方文档也把 Children 的 api 视作不常用、容易写出脆弱代码的用法，可以用另外两种方案来替代：抽离渲染逻辑为单独组件、传入数据 + render props。

不过，这两种替代方案易用性都不如 React.Children，各大组件库也依然大量使用 React.Children 的 api。

所以，遇到需要修改渲染的 children 的情况，用 React.Children 的 api，或是两种替代方案（抽离渲染逻辑为单独组件、传入数据 + render props）都可以。
## 继续阅读

- 上一篇：[16-组件实战-Space间距组件](16-组件实战-Space间距组件)
- 下一篇：[18-三个简单组件的封装](18-三个简单组件的封装)
