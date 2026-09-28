---
title: "快速掌握Tailwind-最流行的原子化CSS框架"
description: "tailwind 是一个流行的原子化 css 框架。"
keywords: [快速掌握Tailwind-最流行的原子化CSS框架]
category: React
tags: [React, 工程化与生态]
---

# 快速掌握Tailwind-最流行的原子化CSS框架

## 学习目标

- 理解原子化 CSS 与传统 CSS 写法的差异
- 了解 Tailwind 的任意值、状态前缀与扩展机制

## 总结

tailwind 是一个流行的原子化 css 框架。

传统 css 写法是定义 class，然后在 class 内部写样式，而原子化 css 是预定义一些细粒度 class，通过组合 class 的方式完成样式编写。

tailwind 用起来很简单：

所有预定义的 class 都可以通过配置文件修改值，也可以通过 aaa-[14px] 的方式定义任意值的 class。

所有 class 都可以通过 hover:xxx、md:xxx 的方式来添加某个状态下的样式，响应式的样式，相比传统的写法简洁太多了。

它的优点有很多，我个人最喜欢的就是不用起 class 的名字了，而且避免了同样的样式在多个 class 里定义多次导致代码重复，并且局部作用于某个标签，避免了全局污染。

它可以通过 @layer、@apply 或者插件的方式扩展原子 class，支持 prefix 来避免 class 名字冲突。

tailwind 本质上就是一个 postcss 插件，通过 AST 来分析 css 代码，对 css 做增删改，并且可以通过 extractor 提取 js、html 中的 class，之后基于这些来生成最终的 css 代码。

是否感受到了 tailwind 的简洁高效，易于扩展？就是这些原因让它成为了最流行的原子化 css 框架。

> 注：Tailwind CSS v4（2025 年发布）改为 CSS-first 配置（@theme），内置 Lightning CSS 引擎，PostCSS 插件不再是必需；本文描述的 v3 配置文件方式仍受支持。

## 继续阅读

- 上一篇：[03-用react-transition-group和react-spring做过渡动画](03-用react-transition-group和react-spring做过渡动画)
- 下一篇：[05-用CSSModules避免样式冲突](05-用CSSModules避免样式冲突)
