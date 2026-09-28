---
title: "useDeferredValue 与 useTransition 选型"
description: "同为并发特性，useDeferredValue 与 useTransition 都用于「让紧急更新优先」，但适用场景不同。本章用对比讲清该选哪一个。"
keywords: [useDeferredValue, useTransition, 并发渲染, 紧急更新, 选型]
category: React
tags: [React, 原理与源码]
---

# useDeferredValue 与 useTransition 选型

## 学习目标

- 理解两者「延迟非紧急工作」的共同目标
- 区分「值延迟」与「动作包裹」的差异
- 掌握实际选型标准

## 共同点

二者都基于并发渲染，把**非紧急的渲染**标记为低优先级，让输入框、点击等**紧急更新**先响应，避免卡顿：

```jsx
// 紧急：用户输入
// 非紧急：根据输入过滤的长列表
```

## useDeferredValue：延迟「值」

当你有一个值（通常是 props 或 state）要去驱动昂贵的下游渲染，而该值的来源你控制不了（或不想改来源逻辑），用 `useDeferredValue` 复制一份「延迟值」：

```jsx
function App({ query }) {
  const deferred = useDeferredValue(query); // query 立即更新，deferred 滞后
  return <List query={deferred} />;
}
```

适合场景：值来自父组件 / 第三方，难以用 `useTransition` 包裹来源动作。

## useTransition：包裹「动作」

当你能控制触发更新的动作（如 `setState` 调用），用 `useTransition` 把整个状态更新包成「可中断的低优先级任务」，并拿到 `isPending`：

```jsx
function App() {
  const [query, setQuery] = useState('');
  const [isPending, start] = useTransition();
  return <input onChange={e => start(() => setQuery(e.target.value))} />;
}
```

适合场景：更新动作在本组件内，且需要 pending 状态驱动 loading UI。

## 选型标准

| 维度 | useDeferredValue | useTransition |
| --- | --- | --- |
| 控制对象 | 值（value） | 动作（action） |
| 是否需要 pending | 否（值自然滞后） | 是（返回 isPending） |
| 来源可控性 | 来源不可改也能用 | 需能包裹 setState |
| 典型用例 | 受控输入驱动大列表 | Tab 切换 / 筛选提交 |

经验法则：**能包动作就用 `useTransition`（还能拿 pending）；只能拿到值就用 `useDeferredValue`**。

## 总结

两者目标一致、边界清晰：延迟「值」用 `useDeferredValue`，包裹「动作」用 `useTransition`。它们与 [09-Transition](09-Transition) 的底层机制同源，本章补的是工程选型视角。

## 继续阅读

- 上一篇：[21-Server Actions 原理](19-ServerActions原理)
- 下一篇：[00-Ref 的实现原理](00-Ref的实现原理)
