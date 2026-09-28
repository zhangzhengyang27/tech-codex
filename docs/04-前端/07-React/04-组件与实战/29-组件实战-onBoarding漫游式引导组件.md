---
title: "组件实战-onBoarding漫游式引导组件"
description: "antd 里是用 4 个 rect 元素实现的，我们是用一个 div 设置 width、height、四个方向不同的 border-width 实现的。"
keywords: [组件实战-onBoarding漫游式引导组件]
category: React
tags: [React, 组件与实战]
---

# 组件实战-onBoarding漫游式引导组件

## 学习目标

- 掌握 OnBoarding 引导蒙层的实现原理（border-width mask + transition）
- 理解 ResizeObserver 与 useEffect 触发二次渲染的细节

## 总结

今天我们实现了 OnBoarding 组件，就是 antd5 里加的 Tour 组件。

antd 里是用 4 个 rect 元素实现的，我们是用一个 div 设置 width、height、四个方向不同的 border-width 实现的。

通过设置 transition，然后改变 width、height、border-width 就可以实现 mask 移动的动画。

然后我们在外层封装了一层，加上了上一步下一步的切换。

并且用 ResizeObserver 在窗口改变的时候重新计算 mask 样式。

此外，还要注意，mask 需要在 dom 树渲染完之后才能拿到 dom 来计算样式，所以需要 useEffect + setState 来触发一次额外渲染。

这样，OnBoarding 组件就完成了。
## 继续阅读

- 上一篇：[28-组件实战-ColorPicker颜色选择器](28-组件实战-ColorPicker颜色选择器)
- 下一篇：[30-组件实战-Upload拖拽上传](30-组件实战-Upload拖拽上传)
