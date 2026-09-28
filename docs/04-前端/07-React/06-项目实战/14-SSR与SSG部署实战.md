---
title: "SSR 与 SSG 部署实战"
description: "SSR（每次请求渲染）与 SSG（构建时渲染）决定首屏与 SEO。本章讲清二者取舍、缓存策略，以及从构建到上线的部署要点（框架级落地见 Next.js 分类）。"
keywords: [SSR, SSG, 服务端渲染, 静态生成, 部署]
category: React
tags: [React, 项目实战]
---

# SSR 与 SSG 部署实战

## 学习目标

- 区分 SSR / SSG / CSR 的取舍
- 掌握缓存与 revalidate 策略
- 了解从构建产物到上线的部署要点

## 三种渲染模式

| 模式 | 渲染时机 | 适用 |
| --- | --- | --- |
| CSR | 客户端 | 强交互后台 |
| SSR | 每次请求 | 个性化、实时数据、需 SEO |
| SSG | 构建时 | 内容稳定、高并发公开页 |

React 的 SSR 原理见 [02-React 服务端渲染-从 SSR 到 hydrate](../02-原理与源码/02-React服务端渲染-从SSR到hydrate)，本章侧重工程选择。

## 缓存与重新生成

现代框架支持细粒度缓存：

- 路由级 `revalidate`（如 `export const revalidate = 60`）：SSG 页面 60 秒后按需重渲；
- 数据级 `cache` / `fetch` 的 `next` 选项；
- 按需 `revalidateTag` 在内容变更时主动失效。

```tsx
export const revalidate = 60; // 该路由最多每分钟重渲一次
export default async function Page() {
  const data = await fetch('https://api.x/posts', { next: { tags: ['posts'] } }).then(r => r.json());
  return <List data={data} />;
}
```

## 部署要点

- 静态页（SSG）可直接上 CDN / 对象存储；
- SSR 需要常驻 Node 服务或边缘运行时（Edge Runtime）；
- 流式渲染（`loading.tsx` + Suspense）降低 TTFB，配合 [19-React Server Components 原理](../02-原理与源码/17-ReactServerComponents原理) 的流式协议；
- 环境变量、图片优化、重定向在框架层配置。

## 与 React 分类的衔接

SSR 的 hydration 风险（[13-事件原理](../01-基础概念/13-事件原理) 提到的合成事件）、服务端/客户端不一致，是部署前必须验证的点。具体的平台部署（Vercel / 自建）请参考 **Next.js 分类**。

## 总结

SSR 与 SSG 的取舍是「实时性 vs 性能/成本」。用 `revalidate` 做增量再生，用 CDN 扛静态流量，用边缘运行时跑 SSR——落地细节依赖框架，React 侧只需理解模型。

## 继续阅读

- 上一篇：[13-Next.jsAppRouter项目实战](13-Next.jsAppRouter项目实战)
