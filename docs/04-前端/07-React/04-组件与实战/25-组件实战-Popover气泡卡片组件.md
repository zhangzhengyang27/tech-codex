---
title: "组件实战-Popover气泡卡片组件"
description: "如果完全自己实现，计算位置还是挺麻烦的，有 top、right、left 等不同位置，而且到达边界的时候也要做特殊处理。"
keywords: [组件实战-Popover气泡卡片组件]
category: React
tags: [React, 组件与实战]
---

# 组件实战-Popover气泡卡片组件

## 学习目标

- 掌握 floating-ui 的 useFloating / useInteractions 用法
- 理解 Popover 的定位计算与边界处理

## 总结

今天我们封装了 Popover 组件。

如果完全自己实现，计算位置还是挺麻烦的，有 top、right、left 等不同位置，而且到达边界的时候也要做特殊处理。

所以我们直接基于 floating-ui 来做，它是专门用于 tooltip、popover、dropdown 等浮动组件的。

用 useFloating 的 hook 来计算位置，用 useInteractions 的 hook 来处理交互。

它支持很多中间件，比如 offset 来设置偏移、arrow 来处理箭头位置，可以完成各种复杂的定位功能。

我们封装了一层，加了一些参数，然后把浮层用 createPortal 渲染到了 body 下。

这样就是一个功能完整的 Popover 组件了。

如果完全自己实现 Popover 组件，还是挺麻烦的，但是基于 floating-ui 封装，就很简单。
## 继续阅读

- 上一篇：[24-组件实战-Message全局提示组件](24-组件实战-Message全局提示组件)
- 下一篇：[26-项目里如何快速定位组件源码](26-项目里如何快速定位组件源码)
