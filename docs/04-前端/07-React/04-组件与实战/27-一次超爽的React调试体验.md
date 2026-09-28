---
title: "一次超爽的React调试体验"
description: "这节我们把 VSCode 断点调试 React 组件和 click-to-react-component 点击元素在 VSCode 打开组件结合了起来。"
keywords: [一次超爽的React调试体验]
category: React
tags: [React, 组件与实战]
---

# 一次超爽的React调试体验

## 学习目标

- 掌握 VSCode 断点调试与 click-to-react-component 的结合使用

## 总结

这节我们把 VSCode 断点调试 React 组件和 click-to-react-component 点击元素在 VSCode 打开组件结合了起来。

引入 click-to-react-component，然后添加一个调试配置。

按照这样的步骤来：

- option + 点击页面上想调试的元素，定位到 VSCode 里的源码
- 打断点看一下值的来源
- 如果是来自父组件，那就用 option + 右键查找父组件，直接定位到父组件的源码
- 在定位到的父组件源码里打断点
- 不断往上找，直到找到产生这个值的地方，断点调试

这样，就算你不懂这段业务逻辑，也能快速梳理清楚整个流程，并知道在哪里改代码。

两者结合用，调试体验是非常爽的。
## 继续阅读

- 上一篇：[26-项目里如何快速定位组件源码](26-项目里如何快速定位组件源码)
- 下一篇：[28-组件实战-ColorPicker颜色选择器](28-组件实战-ColorPicker颜色选择器)
