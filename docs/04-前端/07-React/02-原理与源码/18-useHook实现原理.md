---
title: "use Hook 实现原理"
description: "use 是 React 19 引入的「读取」原语，可在渲染中读取 Promise 或 Context。它不像 useState 那样订阅，而是触发 Suspense / ErrorBoundary。本章拆解它的内部机制。"
keywords: [use Hook, Suspense, Context, 读取原语]
category: React
tags: [React, 原理与源码]
---

# use Hook 实现原理

## 学习目标

- 理解 `use` 与 `useState` 的本质区别（读取 vs 订阅）
- 掌握 `use(promise)` 如何与 Suspense 协作
- 掌握 `use(context)` 如何替代 `useContext`

## use 不是 Hook，是「读取原语」

`use` 的特别之处在于：**它可以在条件、循环里调用**（普通 Hooks 不行），因为它不维护「调用顺序链表」，而是「立刻读取一个值」：

```jsx
function Comp({ promise, ctx }) {
  if (someFlag) {
    const value = use(promise); // ✅ 允许在条件中
  }
  const theme = use(ThemeContext); // ✅ 等价于 useContext
}
```

## use(promise) 触发 Suspense

当传入的是一个 pending 的 Promise，`use` 会**抛出一个特殊的 thenable**，被最近的 `<Suspense>` 捕获并展示 fallback；Promise resolve 后，React 重新渲染该组件拿到值；reject 则冒泡到最近的 `<ErrorBoundary>`。其底层与 [14-深入理解Suspense和ErrorBoundary](../04-组件与实战/14-深入理解Suspense和ErrorBoundary) 中 `throw promise` 的机制一致。

```jsx
function User({ promise }) {
  const user = use(promise); // pending → Suspense；resolve → user；reject → ErrorBoundary
  return <h1>{user.name}</h1>;
}
```

## use(context) 替代 useContext

`use(context)` 直接读取 Context 当前值，行为等同于 `useContext(context)`，但可作为表达式嵌入（如 `use(ThemeContext).color`），且能在条件分支中使用。它不改变 Context 的订阅机制，组件仍会在 Context 变化时重新渲染。

## 与并发渲染的配合

`use` 读取的 Promise 的状态会被 React 跟踪（读写状态直接记录在该 promise 对象上），配合缓存可避免重复请求。它与 [19-React Server Components 原理](17-ReactServerComponents原理) 中服务端 `await` 取数形成「服务端直取 / 客户端读缓存」的闭环。

## 总结

`use` 把「读 Promise / 读 Context」统一为一个可在任意位置调用的原语，其本质是「抛出让 Suspense/ErrorBoundary 接管的特殊值」，而非建立订阅。

## 继续阅读

- 上一篇：[19-React Server Components 原理](17-ReactServerComponents原理)
- 下一篇：[21-Server Actions 原理](19-ServerActions原理)
