---
title: "ReactContext的实现原理和在antd里的应用"
description: "context 是 react 的重要特性，它主要用来在任意层级组件之间传递数据。"
keywords: [ReactContext的实现原理和在antd里的应用]
category: React
tags: [React, 状态管理与路由]
---

# ReactContext的实现原理和在antd里的应用

## 学习目标

- 理解并掌握 ReactContext的实现原理和在antd里的应用 的核心原理与工程实践

## 总结

context 是 react 的重要特性，它主要用来在任意层级组件之间传递数据。

使用方式就是用 createContext 创建 context 对象，然后用 Provider 修改值，用 useContext 和 Consumer 读取值。

context 在 antd 这种组件库里用的特别多，比如 Form 的 fields 的值的传递，form.setFieldsValue 之后 FormItem 能拿到最新值就是通过 context 取的。

context 的原理是 context 对象有 _currentValue 属性用来保存值，Provider 会修改 _currentValue，Consumer 和 useContext 会读取它。

Provider 还有入栈出栈机制，保证值的修改只影响子组件。

context 原理其实还挺简单的，也就是一个对象属性的修改和读取。不知道 context 用在哪的话，不妨去看下 antd 源码里怎么用的吧。

## 继续阅读

- 上一篇：[05-Historyapi和ReactRouter实现原理](05-Historyapi和ReactRouter实现原理)
- 下一篇：[07-ReactContext的性能缺点和解决方案](07-ReactContext的性能缺点和解决方案)
