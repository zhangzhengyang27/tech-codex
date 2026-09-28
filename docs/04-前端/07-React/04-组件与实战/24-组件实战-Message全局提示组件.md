---
title: "组件实战-Message全局提示组件"
description: "这节我们实现了 Message 组件。"
keywords: [组件实战-Message全局提示组件]
category: React
tags: [React, 组件与实战]
---

# 组件实战-Message全局提示组件

## 学习目标

- 掌握 Message 组件的列表增删与过渡动画
- 掌握 forwardRef + context 转发的静态 api 方案

## 总结

这节我们实现了 Message 组件。

它的核心就是一个列表元素的增删改，然后用 react-transition-group 加上过渡动画。

这个列表可以通过 createPortal 渲染到 body 下。

但是难点在于如何在 api 的方式来动态添加这个组件。

ant design 等都是用重新渲染一个 root 的方式来做的，但是这种会报警告，不建议用。

我们是通过 forwardRef + context 转发来实现的。

唯一要注意的问题就是需要直接修改 ref.current，而不是用 useImperativeHandle 来修改。

**useImperativeHandle 的好处是可以在依赖数组改变的时候重新执行回调函数来修改 ref，但坏处是它不是同步修改 ref 的，有的时候不太合适。**

这样，Message 组件就完成了。

这个组件还是比较复杂的，涉及到 ref 转发，context ，过渡动画，portal 等，还封装了两个自定义 hook，大家可以自己写一遍。
## 继续阅读

- 上一篇：[23-自定义hook练习](23-自定义hook练习)
- 下一篇：[25-组件实战-Popover气泡卡片组件](25-组件实战-Popover气泡卡片组件)
