---
title: "StrictMode 与双重渲染"
description: "StrictMode 是 React 的开发期护栏，它通过故意双重调用来暴露不纯的渲染逻辑，本章讲清它做了什么、为什么以及它和并发特性的关系。"
keywords: [StrictMode, 双重渲染, 开发期检查]
category: React
tags: [React, 基础概念]
---

# StrictMode 与双重渲染

## 学习目标

- 掌握 StrictMode 启用的几类开发期检查
- 理解「双重渲染 / 双重调用」的设计意图
- 区分开发期与生产的差异，避免被日志误导

## StrictMode 是什么

`<React.StrictMode>` 是一个只在**开发环境**生效的组件，它不渲染任何可见 UI，而是对其子孙组件附加一系列「压力测试」：

- 组件函数体、Initializer、Updater 会被**双重调用**，以暴露依赖副作用或可变状态的逻辑；
- 故意**双重挂载**组件（挂载 → 卸载 → 再挂载），验证清理逻辑完整；
- 警告使用已废弃的 API（如 string refs、Legacy Context；`findDOMNode` 在 React 19 已被彻底移除）；
- 检测意外的副作用（如渲染期间订阅外部存储却未清理）。

```jsx
import { StrictMode } from 'react';

<StrictMode>
  <App />
</StrictMode>;
```

## 为什么双重渲染不是 bug

双重调用是为了帮你发现「渲染不纯」：

```jsx
function Counter() {
  const [count, setCount] = useState(0);
  // ❌ 渲染期间修改外部变量 —— 双重调用会立刻暴露不一致
  window.__c = (window.__c || 0) + 1;
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

双重调用应当产生相同的结果：第一次调用与第二次调用的返回值若不一致，说明渲染依赖了外部可变状态。生产构建中这些双重调用会被完全移除，因此**不会影响运行性能**。

## 与并发特性的关系

并发渲染（Concurrent Rendering）下，React 可能先渲染一棵「被丢弃」的树再渲染最终树。StrictMode 的双重调用提前让你习惯「渲染可能被中断/重来」，从而写出可中断安全的组件。这与 [14-React 19 新特性概览](14-React%2019%20新特性概览) 中的 `use`、Suspense 配合，要求组件在任意渲染阶段都保持纯净。

## 总结

StrictMode 是开发期的「纠错教练」：用双重调用逼出副作用隐患，生产环境零开销。它是写出并发安全组件的必要训练。

## 继续阅读

- 上一篇：[14-React 19 新特性概览](14-React%2019%20新特性概览)
- 下一篇：[16-useMemo与useCallback在React19的取舍](16-useMemo与useCallback在React19的取舍)
