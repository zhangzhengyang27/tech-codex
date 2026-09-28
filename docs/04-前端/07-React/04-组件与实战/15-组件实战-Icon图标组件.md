---
title: "组件实战-Icon图标组件"
description: "这节我们实现了 Icon 组件。"
keywords: [组件实战-Icon图标组件]
category: React
tags: [React, 组件与实战]
---

# 组件实战-Icon图标组件

## 学习目标

- 掌握 Icon 组件的实现原理（svg + currentColor + 1em）
- 掌握 createIcon / createIconFromIconfont 的封装

## 总结

这节我们实现了 Icon 组件。

支持 size、spin、className、style 等参数。

然后实现了 createIcon 方法，可以传入 svg 内容来生成具体的 Icon。

并且对 iconfont 做了支持，实现了 createIconFromIconfont，可以传入 scriptUrl，然后指定 type 来引用对应的 icon。

通过把 svg 的 fill 设置为 currentColor，把 width、height 设置为 1em， 实现了可以通过 color 和 font-size 来设置 Icon 大小和颜色的效果。

这就是我们每天在用的 Icon 组件的实现原理。
## 继续阅读

- 上一篇：[14-深入理解Suspense和ErrorBoundary](14-深入理解Suspense和ErrorBoundary)
- 下一篇：[16-组件实战-Space间距组件](16-组件实战-Space间距组件)
