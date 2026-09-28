---
title: "数据不可变-immutable和immer"
description: 对比 Facebook 的 immutable.js 与 MobX 作者的 immer 两个不可变数据方案：API 形态差异、与 setState / reducer 的结合方式，以及两者在体验与性能上的取舍。
keywords: [数据不可变-immutable和immer]
category: React
tags: [React, 状态管理与路由]
---

# 数据不可变-immutable和immer

## 学习目标

- 理解并掌握 数据不可变-immutable和immer 的核心原理与工程实践

## 总结

在 React 组件里 setState 是要创建新的 state 对象的，在继承 PureComponent 的 class 组件、function 组件都是这样。

继承 PureComponent 的 class 组件会浅对比 props 和 state，如果 state 变了，并且 state 的 key 的某个值变了，才会渲染。

function 组件的 state 对象变了就会重新渲染。

虽然在普通 class 组件里，不需要创建新的 state，但我们还是建议统一，所有的组件里的 setState 都创建新的对象。

但是创建对象是件比较麻烦的事情，要一层层 ...，所以我们会结合 immutable 的库。

主流的 immutable 库有两个， facebook 的 immutable 和 MobX 作者写的 immer。

immutable 有自己的数据结构，Map、Set 等，有 fromJS、toJS 的 api 用来转换 immutable 数据结构和普通 JS 对象，操作数据需要用 set、setIn、get、getIn。

immer 只有一个 produce api，传入原对象和修改函数，返回的就是新对象，使用新对象就是普通 JS 对象的用法。

要注意在 class 组件里，只能 state 的某个 key 的值变为 immutable，而不能整体变为 immutable，因为 React 内部会用到。

从使用体验上来说，不管是和 react 的 setState 结合还是和 redux 的 reducer 结合，都是 immer 完胜，但是 immutable 因为有专用数据结构的原因，在有大 state 对象的时候，性能会好一些。

90% 的情况下，immer 能完胜 immutable（个人经验之谈，具体取决于 state 结构与更新频率）。

## 继续阅读

- 上一篇：[03-实现mini-Router](03-实现mini-Router)
- 下一篇：[05-Historyapi和ReactRouter实现原理](05-Historyapi和ReactRouter实现原理)
