---
title: "useMemo 与 useCallback 在 React 19 的取舍"
description: "React 19 下编译器（React Compiler）可自动记忆化，手写 useMemo/useCallback 的性价比下降。本章讲清何时仍需要、何时是过度优化，以及常见误用。"
keywords: [useMemo, useCallback, React Compiler, 记忆化, 性能取舍]
category: React
tags: [React, 基础概念]
---

# useMemo 与 useCallback 在 React 19 的取舍

## 学习目标

- 理解 React 19 / React Compiler 对记忆化的影响
- 掌握 `useMemo` / `useCallback` 仍然有意义的场景
- 识别「为优化而优化」的误用

## 记忆化的初衷

`useMemo` 缓存计算结果，`useCallback` 缓存函数引用，目的是避免**每次渲染都重复做昂贵工作**或**因引用变化触发子组件无谓重渲染**。

```jsx
const sorted = useMemo(() => [...items].sort(byPrice), [items]);
const onSubmit = useCallback((e) => save(e), [save]);
```

## React 19 / React Compiler 带来的变化

React Compiler（React 19 起官方推荐）会**自动**为组件插入记忆化，等价于自动加 `useMemo` / `useCallback`，开发者无需手写。因此：

- 启用 Compiler 后，绝大多数手写 `useMemo` / `useCallback` 是**冗余**的；
- 手写记忆化本身有成本（依赖数组管理、闭包陷阱），过度使用反而降低可读性。

## 仍然需要手写的场景

1. **开销极大的纯计算**（如大数据排序、复杂派生）：即使有 Compiler，显式 `useMemo` 更清晰可控；
2. **引用稳定性是语义要求**：把函数传给依赖引用相等的第三方（`React.memo` 子组件、`useEffect` 依赖）；
3. **未启用 Compiler 的老项目**：仍需手写。

```jsx
// 仍需手写：计算昂贵且结果被用于渲染
const stats = useMemo(() => computeHeavyStats(rows), [rows]);
```

## 常见误用

- 把「简单取值」包 `useMemo`（收益 < 成本）；
- 为「防止函数重建」无脑 `useCallback`，再把返回的函数写进 `useEffect` 依赖，处理不当反而引发 effect 循环执行；
- 依赖数组遗漏导致拿到陈旧值（stale closure）。

## 总结

React 19 的口号是「默认无需记忆化」：优先用 React Compiler，仅在昂贵计算或引用稳定性是硬需求时手写。它是性能工具而非默认规范，与 [11-渲染调优](11-渲染调优) 的宏观优化互补。

## 继续阅读

- 上一篇：[15-StrictMode 与双重渲染](15-StrictMode%20与双重渲染)
