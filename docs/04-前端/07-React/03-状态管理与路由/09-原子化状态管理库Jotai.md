---
title: "原子化状态管理库Jotai"
description: "声明原子状态，然后组合成新的状态，和 tailwind 的思路类似。"
keywords: [原子化状态管理库Jotai]
category: React
tags: [React, 状态管理与路由]
---

# 原子化状态管理库Jotai

## 学习目标

- 理解并掌握 原子化状态管理库Jotai 的核心原理与工程实践

## 总结

今天我们学了状态管理库 jotai，以及它的原子化的思路。

声明原子状态，然后组合成新的状态，和 tailwind 的思路类似。

提到原子化状态管理，都会提到 context 的性能问题，也就是 context 里通过对象存储了多个值的时候，修改一个值，会导致依赖其他值的组件也跟着重新渲染。

所以要拆分 context，这也是原子化状态管理的思想。

zustand 是所有 state 放在全局 store 里，然后用到的时候 selector 取需要的部分。

jotai 是每个 state 单独声明原子状态，用到的时候单独用或者组合用。

一个自上而下，一个自下而上，这是两种思路。

jotai 通过 atom 创建原子状态，定义的时候还可以单独指定 get、set 函数（或者叫 read、write 函数），用来实现状态派生、异步状态修改。

组件里可以用 useAtom 来拿到 get、set 函数，也可以通过 useAtomValue、useSetAtom 分别拿。

不需要读取状态的，用 useSetAtom 还可以避免不必要的渲染。

zustand 的中间件是通过包一层然后修改 get、set 实现的，而 jotai 天然支持 get、set 的修改。

在状态、派生状态、异步修改状态、中间件等能力上，zustand 和 jotai 都有覆盖。

区别只是一个是全局 store 里存储所有 state，一个是声明原子 state，然后组合。

这只是两种思路，没有好坏之分，看你业务需求，适合哪个就用那个，或者你习惯哪种思路就用哪个。

## 继续阅读

- 上一篇：[08-手写一个Zustand](08-手写一个Zustand)
- 下一篇：[10-用react-intl实现国际化](10-用react-intl实现国际化)
