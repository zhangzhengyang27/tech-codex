---
title: "React组件如何写单测"
description: "单元测试能保证函数、类的方法等代码单元的功能正常，把手动测试变成自动化测试。"
keywords: [React组件如何写单测]
category: React
tags: [React, 组件与实战]
---

# React组件如何写单测

## 学习目标

- 掌握 @testing-library/react 的常用 api
- 理解 React 组件与 hook 单测的基本写法

## 总结

单元测试能保证函数、类的方法等代码单元的功能正常，把手动测试变成自动化测试。

变更不频繁的代码，还是有必要写单测的，写一次，自动测试 n 次，收益很大。

我们学了 react 组件和 hook 的单测写法。

主要是用 @testing-library/react 这个库，它有一些 api：

- render：渲染组件，返回 container 容器 dom 和其他的查询 api
- fireEvent：触发某个元素的某个事件
- createEvent：创建某个事件（一般不用这样创建）
- waitFor：等待异步操作完成再断言，可以指定 timeout
- act：包裹的代码会更接近浏览器里运行的方式
- renderHook：执行 hook，可以通过 result.current 拿到 hook 返回值

其实也没多少东西。

jest 的 api 加上 @testing-library/react 的这些 api，就可以写任何组件、hook 的单元测试了。
## 继续阅读

- 上一篇：[12-快速掌握Storybook](12-快速掌握Storybook)
- 下一篇：[14-深入理解Suspense和ErrorBoundary](14-深入理解Suspense和ErrorBoundary)
