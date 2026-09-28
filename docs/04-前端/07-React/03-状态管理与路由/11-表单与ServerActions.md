---
title: "表单与 Server Actions"
description: "React 19 把表单提交收敛为声明式 Actions，useActionState / useOptimistic / useFormStatus 各自职责清晰。本章结合实际表单串起它们。"
keywords: [表单, Server Actions, useActionState, useOptimistic, useFormStatus]
category: React
tags: [React, 状态管理与路由]
---

# 表单与 Server Actions

## 学习目标

- 掌握 `<form action={...}>` 直接对接 Server Action 的写法
- 区分 `useActionState` / `useOptimistic` / `useFormStatus` 三者的职责
- 理解乐观更新的回滚机制

## 基础：form 直接提交

React 19 允许把函数直接传给 `<form action>`，提交时 React 自动收集 `FormData` 并调用它（可以是客户端函数，也可以是 `'use server'` 的 Server Action，后者详见 [21-Server Actions 原理](../02-原理与源码/19-ServerActions原理)）。

```jsx
function Form() {
  const [state, action, pending] = useActionState(submit, { ok: false });
  return (
    <form action={action}>
      <input name="name" />
      <button disabled={pending}>提交</button>
      {state.ok ? <p>成功</p> : <p>{state.error}</p>}
    </form>
  );
}
```

## 三个 Hook 的分工

| Hook | 职责 |
| --- | --- |
| `useActionState(action, init)` | 维护 Action 返回值与 `isPending`，适合展示提交结果与错误 |
| `useOptimistic(state, fn)` | 请求未返回前先渲染预期值，失败自动回滚 |
| `useFormStatus()` | 在 `<form>` 子组件内读取 pending/提交状态，免透传 props |

```jsx
function NameField({ optimisticName }) {
  const [opt, setOpt] = useOptimistic(optimisticName);
  // 提交前 setOpt(临时值)，出错时 React 自动恢复为原值
}
function Status() {
  const { pending } = useFormStatus(); // 无需父组件传 pending
  return <button disabled={pending}>保存</button>;
}
```

## 乐观更新与回滚

`useOptimistic` 的意义在于：网络请求期间用户立刻看到「像成功了一样」的界面，提升体感；一旦 Action reject，React 丢弃乐观值、回到真实 state。它常与 `useActionState` 搭配——前者管「即时展示」，后者管「最终结果」。

## 总结

表单相关状态在 React 19 里不再需要手写 `useState` + `useEffect` 提交流，而是用 `useActionState` 管结果、`useOptimistic` 管即时反馈、`useFormStatus` 管按钮态，三者构成完整闭环。

## 继续阅读

- 上一篇：[10-用react-intl实现国际化](10-用react-intl实现国际化)
- 下一篇：[12-Next.js App Router 数据加载](12-Next.jsAppRouter数据加载)
