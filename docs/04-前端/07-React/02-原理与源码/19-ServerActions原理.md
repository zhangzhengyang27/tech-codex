---
title: "Server Actions 原理"
description: "Server Actions 是用 use server 标记、可在客户端调用的服务端函数。本章拆解它的调用链路、序列化边界，以及与 useActionState 等 Hook 的衔接。"
keywords: [Server Actions, use server, useActionState, 表单提交]
category: React
tags: [React, 原理与源码]
---

# Server Actions 原理

## 学习目标

- 理解 `use server` 标记的函数的调用链路
- 掌握 Server Action 的参数序列化边界
- 理解它与 `useActionState` / `useOptimistic` / `useFormStatus` 的衔接

## 什么是 Server Action

被 `'use server'` 标记的函数运行在**服务端**，但可以被客户端组件像普通异步函数一样调用：

```jsx
'use server';
export async function saveName(formData: FormData) {
  const name = formData.get('name');
  await db.user.update({ name });
  return { ok: true };
}
```

当客户端调用 `saveName` 时，React 框架会把它转成一个**网络请求**（而非本地执行），服务端执行后把返回值序列化回客户端。它本身是 React 的模型，具体传输由 Next.js 等框架落地。

## 参数序列化边界

传给 Server Action 的参数必须可序列化：支持基本类型、可序列化对象、FormData，以及 `'use server'` 标记的 Server Function 引用（Action 之间可以互相传递）。无法序列化的内容（如 `window`、class 实例、客户端回调函数）不能直接传入。

## 与表单 / Actions Hook 的衔接

React 19 的 Actions 体系围绕 Server Action 展开：

- `<form action={saveName}>`：表单提交直接触发 Server Action，`formData` 自动传入；
- `useActionState(action, initialState)`：维护 Action 的返回值与 `isPending`；
- `useOptimistic(state, fn)`：请求未完成前展示乐观结果；
- `useFormStatus()`：在 `<form>` 子组件读取 pending 状态，无需透传 props。

```jsx
// 注意：传给 useActionState 的 action 签名是 (prevState, formData)
'use server';
async function updateNameAction(prevState, formData) {
  const name = formData.get('name');
  await db.user.update({ name });
  return { ok: true };
}

function Form() {
  const [state, action, pending] = useActionState(updateNameAction, { ok: false });
  return <form action={action}>{/* ... */}<button disabled={pending}>提交</button></form>;
}
```

## 与 RSC 的关系

Server Actions 与 [19-React Server Components 原理](17-ReactServerComponents原理) 共用「服务端边界」心智：`'use server'` 与 `'use client'` 互为镜像，前者把函数暴露给客户端调用，后者把组件暴露给服务端引用。二者都由框架在打包阶段切分边界。

## 总结

Server Actions 让「提交表单 = 调用服务端函数」成为原生能力，配合 `useActionState` 等 Hook 把 pending / error / 乐观更新收敛为声明式 API，是 React 19 数据变更原生化的重要一环。

## 继续阅读

- 上一篇：[20-use Hook 实现原理](18-useHook实现原理)
- 下一篇：[20-useDeferredValue与useTransition选型](20-useDeferredValue与useTransition选型)
