---
title: "React组件如何调试"
description: "这节我们学了如何用 VSCode 调试 React 组件。"
keywords: [React组件如何调试]
category: React
tags: [React, 组件与实战]
---

# React组件如何调试

## 学习目标

- 掌握 VSCode 调试 React 组件：launch.json 配置与断点类型
- 理解 chrome 调试实例与 userDataDir 的关系

## 总结

这节我们学了如何用 VSCode 调试 React 组件。

点击创建 launch.json，输入 chrome 类型的调试配置，点击调试，这时候代码就会在打的断点处断住。

断点类型有普通断点、条件断点、hit count、logpoint 等。

用 debugger 可以在想调试的代码处断住，单步调试，看一些变量的变化，看代码执行路线，这样高效很多。

此外，chrome 的各种用户数据是保存在 userDataDir 下，一个 userDataDir 只能跑一个实例。

默认跑的浏览器是会创建新的临时 userDataDir，所以没有之前的用户数据，也就没有之前安装的 React DevTools 等插件。

可以把它设置为 false，然后关掉别的浏览器再跑，这时候就是在默认 userDataDir 跑的，各种用户的数据都有。

会断点调试 React 组件，是提高开发和排查问题效率的很重要的技能。
## 继续阅读

- 上一篇：[07-React组件如何写TypeScript类型](07-React组件如何写TypeScript类型)
- 下一篇：[09-受控模式VS非受控模式](09-受控模式VS非受控模式)
