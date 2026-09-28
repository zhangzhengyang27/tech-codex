---
title: "组件库实战-构建umd产物，通过unpkg访问"
description: "前面分析过，组件库基本都会提供 esm、commonjs、umd 三种格式的代码。"
keywords: [组件库实战-构建umd产物, 通过unpkg访问]
category: React
tags: [React, 工程化与生态]
---

# 组件库实战-构建umd产物，通过unpkg访问

## 学习目标

- 掌握用 webpack 构建组件库 umd 产物（ts-loader 编译 + externals 外部化 react）
- 了解 jsx 编译为 React.createElement 的 umd 兼容处理

## 总结

前面分析过，组件库基本都会提供 esm、commonjs、umd 三种格式的代码。

这节我们实现了 umd 的支持，通过 webpack 做了打包。

打包逻辑很简单：用 ts-loader 来编译 typescript 代码，然后 react、react-dom 等模块用 externals 的方式引入就好了。

再就是 react 通过 externals 的方式，会导致 react/jsx-runtime 引入有问题，所以我们修改了 tsconfig.json 的 jsx 的编译为 react，也就是编译成 React.createElement 的代码。

虽然 umd 的方式用的场景不多，但我们组件库还是要支持的。

## 继续阅读

- 上一篇：[09-组件库实战-构建esm和cjs产物，发布到npm](09-组件库实战-构建esm和cjs产物，发布到npm)
- 下一篇：[11-基于react-dnd实现拖拽排序](11-基于react-dnd实现拖拽排序)
