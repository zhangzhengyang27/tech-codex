---
title: "Next.js App Router 数据加载"
description: "App Router 把数据加载从客户端 useEffect 迁移到服务端组件与路由约定。本章对照传统客户端取数，讲清 App Router 的 loader 心智与 React 19 的衔接。"
keywords: [Next.js, App Router, 数据加载, RSC, loader]
category: React
tags: [React, 状态管理与路由]
---

# Next.js App Router 数据加载

## 学习目标

- 理解 App Router 中「服务端组件直接取数」替代 useEffect 取数的变化
- 掌握 `loading.tsx` / `error.tsx` 与 Suspense 的对应关系
- 了解 `use` 在 App Router 数据读取中的角色

## 从 useEffect 取数到服务端取数

传统 SPA 在客户端用 `useEffect` + `fetch` 取数，存在「先渲染空白再请求」的瀑布流。App Router 下，页面组件本身是 Server Component，可直接 `async` 取数：

```tsx
// app/posts/page.tsx（Server Component）
export default async function Page() {
  const posts = await db.posts.list();
  return <PostList posts={posts} />;
}
```

取数发生在服务端，客户端拿到的是带数据的 HTML/RSC 流，无需再发一次请求。

## 路由级 loading 与 error

App Router 用约定文件表达 Suspense / ErrorBoundary 边界：

- `loading.tsx`：等价于给当前路由套一层 `<Suspense fallback>`；
- `error.tsx`：等价于该路由的 ErrorBoundary（需 `'use client'`）；
- `not-found.tsx`：404 边界。

这与 React 的 [14-深入理解Suspense和ErrorBoundary](../04-组件与实战/14-深入理解Suspense和ErrorBoundary) 一脉相承，只是把边界「声明在文件系统」上。

## use 与客户端取数

当子组件是 Client Component 且需读取父级传入的 Promise，用 `use(promise)`（见 [20-use Hook 实现原理](../02-原理与源码/18-useHook实现原理)）即可在客户端订阅该结果，避免 props 透传后再 useEffect。

## 与 React Router 的对照

`react-router` 的 `loader` / `useLoaderData` 与 App Router 思路相似，但前者仍在客户端路由层取数，App Router 利用 RSC 把取数搬到服务端。对比参见 [00-React-Router](00-React-Router)。

## 总结

App Router 的数据加载本质是「RSC + 路由约定」的组合：取数上移到服务端、边界用文件系统声明、`use` 衔接客户端读取。完整的工程化部署（缓存、revalidate）请参考本站 Next.js 分类。

## 继续阅读

- 上一篇：[11-表单与 Server Actions](11-表单与ServerActions)
