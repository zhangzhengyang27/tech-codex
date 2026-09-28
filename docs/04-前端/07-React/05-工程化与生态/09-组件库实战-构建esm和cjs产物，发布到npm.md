---
title: "组件库实战-构建esm和cjs产物，发布到npm"
description: "可以直接在项目里引入来用，和 antd 等组件库一样。"
keywords: [组件库实战-构建esm和cjs产物, 发布到npm]
category: React
tags: [React, 工程化与生态]
---

# 组件库实战-构建esm和cjs产物，发布到npm

## 学习目标

- 掌握组件库 esm/cjs/dts 产物的构建与 package.json 入口声明
- 学会通过 npm adduser、npm publish 发布组件库

## 总结

今天我们把之前写过的部分组件封装成了组件库并发布到了 npm 仓库。

可以直接在项目里引入来用，和 antd 等组件库一样。

构建部分我们分析过很多组件库，都是一样的：

- commonjs 和 esm 的代码通过 tsc 或者 babel 编译产生
- umd 代码通过 webpack 打包产生
- css 代码通过 sass 或者 less 等编译产生
- dts 类型也是通过 tsc 编译产生

我们在 package.json 里配置了 main 和 module，分别声明 commonjs 和 es module 的入口，配置了 types 指定类型的入口。

然后通过 npm adduser 登录，之后 npm publish 发布到 npm。

这样，react 项目里就可以引入这个组件库来用了，之前写过的所有组件都可以加到这个组件库里。

## 继续阅读

- 上一篇：[08-React组件库都是怎么构建的](08-React组件库都是怎么构建的)
- 下一篇：[10-组件库实战-构建umd产物，通过unpkg访问](10-组件库实战-构建umd产物，通过unpkg访问)
