---
title: "CSSInJS-快速掌握styled-components"
description: "CSS in JS 就是用 js 来写 css。"
keywords: [CSSInJS-快速掌握styled-components]
category: React
tags: [React, 工程化与生态]
---

# CSSInJS-快速掌握styled-components

## 学习目标

- 掌握 styled-components 创建样式组件、传参、全局样式的用法
- 了解 CSS in JS 相比 scss 等方案的优缺点

## 总结

CSS in JS 就是用 js 来写 css。

今天我们学习了最流行的 CSS in JS 库 styled-components。

它的特点就是样式组件，用 styled.div、styled() 可以创建样式组件。

样式组件可以传参数，可以通过 attrs() 修改参数。

通过 keyframes 来声明动画样式，通过 css 来复用某段样式，通过 createGlobalStyle 创建全局样式。

写样式的时候，通过 & 代表当前样式组件的实例，当样式和全局样式冲突的时候，还可以 && 提高优先级。

styled-components 还支持 theme，可以通过 ThemeProvider 修改 theme 值，通过 useTheme 来读取，每个样式组件里都可以通过 props.theme 拿到当前 theme，然后展示不同样式。

styled-components 相比 scss 等方案有好有坏：

- 没有 className 冲突问题，不需要 CSS Modules
- 用 js 来写逻辑，不需要学习单独的 scss 语法
- 项目里会多很多的样式组件，和普通组件混在一起
- React DevTools 里会有很多层的样式组件

总体来说，styled-components 还是不错的，如果你喜欢通过 React 组件的方式来写样式这种方式，可以考虑使用。

我最近在维护的一个项目，用 styled-components 好多年了，大项目用也没问题。

## 继续阅读

- 上一篇：[05-用CSSModules避免样式冲突](05-用CSSModules避免样式冲突)
- 下一篇：[07-react-spring实现滑入滑出的转场动画](07-react-spring实现滑入滑出的转场动画)
