---
title: "Next.js App Router 项目实战"
description: "用一个博客/后台实战串起 App Router 的目录约定、Server Components 取数、Server Actions 表单与错误边界。本章聚焦 React 侧实践，部署见本站 Next.js 分类。"
keywords: [Next.js, App Router, 实战, Server Components, Server Actions]
category: React
tags: [React, 项目实战]
---

# Next.js App Router 项目实战

## 学习目标

- 用 App Router 目录约定组织一个真实项目
- 用 Server Component 取数 + Server Action 提交，组合出「零客户端取数」页面
- 用 `error.tsx` / `loading.tsx` 声明边界

## 目录约定

```
app/
  layout.tsx          // 根布局（Server Component）
  page.tsx            // 首页
  posts/
    page.tsx          // 列表（服务端取数）
    [id]/page.tsx     // 详情
    loading.tsx       // 列表 Suspense fallback
    error.tsx         // 列表错误边界（'use client'）
```

## 服务端取数 + 客户端交互

列表页直接 `async` 取数（服务端），详情里的「点赞」按钮是 Client Component 调用 Server Action：

```tsx
// app/posts/[id]/page.tsx
export default async function Post({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // Next.js 15 起 params 为 Promise，需要 await（Next 14 及之前为同步对象）
  const post = await db.post.find(id);
  return (
    <article>
      <h1>{post.title}</h1>
      <LikeButton initial={post.likes} postId={post.id} />
    </article>
  );
}
```

```tsx
// LikeButton.tsx（'use client'）
'use client';
import { useOptimistic } from 'react';
import { like } from './actions'; // Server Action

export function LikeButton({ initial, postId }: { initial: number; postId: string }) {
  const [likes, add] = useOptimistic(initial, (s) => s + 1);
  return (
    <button onClick={async () => { add(1); await like(postId); }}>
      👍 {likes}
    </button>
  );
}
```

## 边界声明

- `loading.tsx` 给列表套 Suspense fallback；
- `error.tsx` 捕获渲染错误并展示重试；
- `not-found.tsx` 处理 404。

## 与 React 分类其他篇的衔接

本实战组合运用了 [19-React Server Components 原理](../02-原理与源码/17-ReactServerComponents原理)、[21-Server Actions 原理](../02-原理与源码/19-ServerActions原理)、[12-Next.js App Router 数据加载](../03-状态管理与路由/12-Next.jsAppRouter数据加载) 与 [33-错误边界实践进阶](../04-组件与实战/33-错误边界实践进阶)。完整的部署与缓存策略请参考本站 **Next.js 分类**。

## 总结

App Router 实战的骨架是「Server Component 取数 + Client Component 交互 + 文件系统边界」。它把 React 19 的现代范式落地为可维护的项目结构。

## 继续阅读

- 上一篇：[12-继往开来：可视化页面搭建工具](12-继往开来：可视化页面搭建工具)
- 下一篇：[14-SSR与SSG部署实战](14-SSR与SSG部署实战)
