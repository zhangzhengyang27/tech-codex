---
title: "用CSSModules避免样式冲突"
description: "不同组件的 className 可能会一样，导致样式冲突。"
keywords: [用CSSModules避免样式冲突]
category: React
tags: [React, 工程化与生态]
---

# 用CSSModules避免样式冲突

## 学习目标

- 理解 CSS Modules 通过编译时 hash 化解决 className 冲突的思路
- 掌握 xxx.module.css 的使用与 postcss-modules 的常用配置

## 总结

不同组件的 className 可能会一样，导致样式冲突。

为此，我们希望 css 能实现像 js 的 es module 一样的模块化功能。

可以用 BEM 的命名规范来避免冲突，但是这需要人为保证，不够可靠。

一般都是用编译的方式，比如 CSS Modules 或者 vue 的 Scoped CSS。

它是通过 postcss-modules 实现的，可以把 css 的 className 编译成带 hash 的形式。

然后在组件里用 styles.xxx 的方式引入。

在 vite、cra（已停止维护，新项目建议用 Vite）里都对 css modules 做了支持，只要用 xx.module.css、xxx.module.scss 等结尾，就默认开启了 css modules。

还可以通过各种配置来做更多定制：

- scopeBehaviour： 默认 local 或者 global
- getJSON：可以拿到 css 模块导出的对象
- exportGlobals： 全局的 className 也导出到对象
- globalModulePaths：哪些文件路径默认是全局 className
- generateScopedName：定制 local className 的格式
- localsConvention： 导出的对象的 key 的格式

在 webpack 的 css-loader 里也有类似的配置。

现在的组件开发基本都有模块化的要求，所以 CSS Modules 在日常开发中用的特别多。

## 继续阅读

- 上一篇：[04-快速掌握Tailwind-最流行的原子化CSS框架](04-快速掌握Tailwind-最流行的原子化CSS框架)
- 下一篇：[06-CSSInJS-快速掌握styled-components](06-CSSInJS-快速掌握styled-components)
