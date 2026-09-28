---
title: "组件实战-Space间距组件"
description: "我们自己实现了 antd 的 Space 组件。"
keywords: [组件实战-Space间距组件]
category: React
tags: [React, 组件与实战]
---

# 组件实战-Space间距组件

## 学习目标

- 掌握 Space 布局组件的封装思路（React.Children + context）

## 总结

我们自己实现了 antd 的 Space 组件。

这是一个布局组件，可以通过参数设置水平和竖直间距、对齐方式、换行等。

我们用到了 React.children 的 api 来修改 children，然后根据 props 来确定 className，然后还有 context 的读取。

这个组件并不复杂，但这种把布局抽离成组件来复用的方式还是很值得学习的。
## 继续阅读

- 上一篇：[15-组件实战-Icon图标组件](15-组件实战-Icon图标组件)
- 下一篇：[17-React.Children和它的两种替代方案](17-React.Children和它的两种替代方案)
