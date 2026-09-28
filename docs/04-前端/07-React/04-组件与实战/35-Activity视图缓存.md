---
title: "Activity 视图缓存"
description: "React 19.2 引入官方的 <Activity> 组件实现视图级缓存（类 KeepAlive），切走再切回时状态与 DOM 被保留。本章讲清它与手写 KeepAlive 的差异。"
keywords: [Activity, KeepAlive, 视图缓存, 组件状态保留]
category: React
tags: [React, 组件与实战]
---

# Activity 视图缓存

## 学习目标

- 理解 `<Activity>` 的「卸载但保留状态」语义
- 区分 `<Activity>` 与 `display:none` / 手写 KeepAlive 的差异
- 掌握多页签 / 路由切换缓存的典型用法

## 为什么需要视图缓存

Tab 切换、路由前进后退时，若直接卸载组件，其局部状态（输入框内容、滚动位置、表单草稿）会丢失。经典解法是 KeepAlive——把组件从树里「摘下但存着」。React 19 前社区需手写（见 [03-KeepAlive 实现](03-KeepAlive实现)），React 19.2 起官方提供 `<Activity>`。

## Activity 的语义

`<Activity>` 让被包裹的树在「不活跃」时**不渲染到屏幕，但保留 state 与（部分）DOM**，重新激活时无缝恢复：

```jsx
import { Activity } from 'react';

<Activity mode={active ? 'visible' : 'hidden'}>
  <HeavyPanel />
</Activity>
```

- `visible`：正常挂载渲染；
- `hidden`：离屏、不渲染 UI，但内部状态与副作用被保留（类似「冻结」），避免重挂载开销。

## 与手写 KeepAlive 的差异

| 方案 | 实现 | 状态保留 | 官方支持 |
| --- | --- | --- | --- |
| `display:none` | CSS 隐藏 | 保留（始终挂载） | 是，但常驻 DOM |
| 手写 KeepAlive | 缓存 fiber / portal 搬运 | 保留 | 否，需维护 |
| `<Activity>` | React 内建 | 保留且离屏不渲染 | 是，19.2+ |

`<Activity>` 的优势是「离屏即不渲染」，比常驻 DOM 更省，比手写方案更可靠（由 React 协调而非 hack）。

## 与并发渲染的配合

`<Activity>` 切换非紧急，可配合 `useTransition` 让切回大面板时的恢复不阻塞输入。它和 [33-错误边界实践进阶](33-错误边界实践进阶) 一样是「生产级组件」的体验保障。

## 总结

`<Activity>` 是 React 官方的视图缓存原语：离屏不渲染但保留状态，取代脆弱的手写 KeepAlive，是 Tab / 路由缓存的推荐方案。

## 继续阅读

- 上一篇：[34-组件无障碍 a11y](34-组件无障碍a11y)
- 下一篇：[00-表单验证](00-表单验证)
