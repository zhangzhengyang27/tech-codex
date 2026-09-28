---
title: "React组件库都是怎么构建的"
description: "我们分析了 ant-design、semi-design、arco-design 组件库的产物和编译打包逻辑。"
keywords: [React组件库都是怎么构建的]
category: React
tags: [React, 工程化与生态]
---

# React组件库都是怎么构建的

## 学习目标

- 了解 ant-design、semi-design、arco-design 三大组件库的产物结构（lib/es/dist）
- 理解 esm/cjs/umd/样式各自的编译打包方案与 gulp 任务组织

## 总结

我们分析了 ant-design、semi-design、arco-design 组件库的产物和编译打包逻辑。

它们都有 lib、es、dist 目录，分别放着 commonjs、es module、umd 规范的组件代码。

并且在 package.json 里用 main、module、unpkg 来声明了 3 种规范的入口。

从产物上来看，三个组件库都是差不多的。

然后我们分析了下编译打包的逻辑。

ant-design 和 arco-design 都是单独抽了一个放 scripts 的包，而 semi-design 没有。

它们编译 esm 和 cjs 代码都用了 babel 和 tsc 来编译，只不过 arco-design 是用 tsc 或者 babel 二选一，而 ant-design 和 semi-design 是先用 tsc 编译再用 babel 编译。

打包出 umd 的代码，三个组件库都是用的 webpack，只不过有的是把 webpack 配置内置了，有的是放在组件库项目目录下。

而样式部分，ant-design 是用 css-in-js 的运行时方案了，不需要编译，而 arco-design 用的 less，样式放组件目录下维护，semi-design 用的 scss，单独一个目录来放所有组件样式。

并且编译任务都是用的 gulp 来组织的，它可以串行、并行的执行一些任务。

虽然有一些细小的差别，但从整体上来看，这三大组件库的编译打包逻辑可以说是一模一样的。

写这样的 scripts 麻烦么？

并不麻烦，umd 部分的 webpack 打包大家都会，而 esm 和 cjs 用 babel 或者 tsc 编译也不难，至于 scss、less 部分，那个就更简单了。

所以编译打包并不是组件库的难点。

如果你要写一个组件库，也可以这样来写 scripts。

## 继续阅读

- 上一篇：[07-react-spring实现滑入滑出的转场动画](07-react-spring实现滑入滑出的转场动画)
- 下一篇：[09-组件库实战-构建esm和cjs产物，发布到npm](09-组件库实战-构建esm和cjs产物，发布到npm)
