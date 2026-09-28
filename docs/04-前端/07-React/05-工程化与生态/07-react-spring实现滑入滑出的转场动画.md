---
title: "react-spring实现滑入滑出的转场动画"
description: "很多场景下，加上转场动画会使交互体验更好。"
keywords: [react-spring实现滑入滑出的转场动画]
category: React
tags: [React, 工程化与生态]
---

# react-spring实现滑入滑出的转场动画

## 学习目标

- 掌握用 react-spring 的 useTransition 实现滑入滑出转场动画
- 学会通过 useRef 记录前值实现退出回调 onExit

## 总结

很多场景下，加上转场动画会使交互体验更好。

这节我们用 react-spring 实现了滑入滑出的转场动画（或者叫过渡动画）。

支持了 isVisible、from、children、onExit、onEnter、className、style 参数。

from 可以设置 right 或 bottom，然后根据它来设置 x 参数初始值为 window.screen.width 或者 window.screen.height（也可用 window.innerWidth/innerHeight 取视口尺寸）。

改变 x、opacity 就可以实现滑入滑出的动画。

我们通过 useRef 记录之前的参数来实现了 onExit 的回调。

用 styled-components 写了外层 div 的样式。

这样的 SlideInOverlay 组件就比较完善了，可以直接用在项目里。

## 继续阅读

- 上一篇：[06-CSSInJS-快速掌握styled-components](06-CSSInJS-快速掌握styled-components)
- 下一篇：[08-React组件库都是怎么构建的](08-React组件库都是怎么构建的)
