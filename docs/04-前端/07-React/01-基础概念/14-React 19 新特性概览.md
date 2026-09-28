---
title: "React 19 新特性概览"
description: "React 19 于 2024 年 12 月发布，带来了 use Hook、Actions、Server Components 增强与原生文档元数据等重磅能力，本章逐一拆解这些变化的用法与动机。"
keywords: [React 19, use, Actions, Server Components, 文档元数据]
category: React
tags: [React, 基础概念]
---

# React 19 新特性概览

## 学习目标

- 掌握 `use` Hook 读取 Promise 与 Context 的用法与限制
- 掌握 Actions 体系：`useActionState`、`useOptimistic`、`useFormStatus`
- 理解 Server Components 在 React 19 中的增强与边界
- 了解原生文档元数据（`<title>`/`<meta>`/`<link>` 自动提升到 head）

## 为什么需要 React 19

React 18 引入了并发特性（并发渲染、`useTransition`、`useDeferredValue`、自动批量更新），但数据获取、表单提交、服务端渲染三者仍依赖大量第三方约定。React 19 的核心目标是**把数据获取与变更变成一等公民**：

- 用 `use` 统一「读取异步资源 / 读取 Context」的入口；
- 用 Actions 把「提交 → 等待 → 错误处理 → 乐观更新」收敛成声明式 API；
- 强化 Server Components（RSC），让服务端组件成为默认心智模型。

## use Hook

`use` 可以在渲染期间读取 Promise 或 Context：

```jsx
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise); // pending 时触发 Suspense，reject 时触发 ErrorBoundary
  return <ul>{comments.map(c => <li key={c.id}>{c.text}</li>)}</ul>;
}
```

与 `useState` / `useEffect` 不同，`use` 可以在条件语句、循环中调用（但注意不要包裹在 try/catch 中——Promise 的 reject 会被 catch 捕获，而不是交给 ErrorBoundary），因为它本质上是「读取」而非「订阅」。配合 Suspense，`use(promise)` 是 React 19 推荐的数据获取范式。

## Actions 体系

Actions 表示「一个可能异步、需要 pending/error 状态的函数」，React 19 提供三个配套 Hook：

- 在已有 `useTransition` 的 `isPending` 之外，新增 `useActionState(action, initialState)` 管理表单 Action 的状态与返回值；
- `useOptimistic(state, updateFn)` 在请求未完成前先展示预期结果，回滚时自动恢复；
- `useFormStatus()` 在 `<form>` 的子组件里读取所属表单的 pending / 提交状态，无需透传 props。

```jsx
function Submit() {
  const [state, formAction, isPending] = useActionState(async (prev, formData) => {
    const name = formData.get('name');
    const res = await saveName(name);
    return res.ok ? { ok: true } : { ok: false, error: res.error };
  }, { ok: true });

  return (
    <form action={formAction}>
      <input name="name" />
      <button disabled={isPending}>提交</button>
      {!state.ok && <p>{state.error}</p>}
    </form>
  );
}
```

## Server Components 增强

React 19 正式将 Server Components 作为框架级能力：服务端组件默认不携带客户端 JS，可直接 `async` 并 `await` 数据；`use server` 标记的函数可在服务端执行并被客户端调用（即 Server Actions）。注意 RSC 的**边界**由打包器/框架决定（`'use client'` / `'use server'` 指令），React 本身只定义模型。关于 RSC 的序列化协议与流式渲染原理，详见 [19-React Server Components 原理](../02-原理与源码/17-ReactServerComponents原理)。

## 文档元数据

React 19 支持在组件树中直接渲染 `<title>`、`<meta>`、`<link>`，React 会自动把它们提升到 `<head>`，取代 `react-helmet` 等方案（注意这不是一个叫 `<Document>` 的组件，而是原生标签的自动提升）：

```jsx
function Page() {
  return (
    <article>
      <title>页面标题</title>
      <meta name="description" content="页面描述" />
      <h1>正文</h1>
    </article>
  );
}
```

## 总结

React 19 的关键词是「数据获取与变更的原生化」：`use` 统一读取、Actions 收敛提交、RSC 强化服务端、原生文档元数据接管 head。建议结合 [15-StrictMode 与双重渲染](15-StrictMode%20与双重渲染) 理解开发期的额外校验。

## 继续阅读

- 上一篇：[13-事件原理](13-事件原理)
- 下一篇：[15-StrictMode 与双重渲染](15-StrictMode%20与双重渲染)
