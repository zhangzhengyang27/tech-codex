---
title: "Turbopack 与 Rspack"
description: "Turbopack（Next.js 官方，Rust 重写）与 Rspack（字节，兼容 webpack 配置）是新一代构建工具。本章对比它们的定位、性能与适用场景。"
keywords: [Turbopack, Rspack, Rust, 构建工具, webpack 兼容]
category: React
tags: [React, 工程化与生态]
---

# Turbopack 与 Rspack

## 学习目标

- 理解 Rust 重写构建工具的动力（速度）
- 区分 Turbopack 与 Rspack 的定位差异
- 知道何时选择它们而非 webpack / Vite

## 为什么用 Rust 重写

webpack 的 JS 运行时在大项目增量构建上到达瓶颈。Rust 工具链（基于 SWC / NAPI）在解析、转译、增量缓存上数量级提速，催生了两款工具。

## Turbopack

Turbopack 是 Vercel/Next.js 团队用 Rust 写的增量打包器（webpack 作者 Tobias Koppers 主导），原生服务于 Next.js：

```js
// package.json
// Next.js 15 起用 next dev --turbopack / next build --turbopack 启用
{ "scripts": { "dev": "next dev --turbopack" } }
```

特点是**按需编译图**（只构建被请求的路由与模块），增量 HMR 极快。Next.js 16（2025-10）起 Turbopack 已成为 `next dev` 和 `next build` 的默认打包器。

## Rspack

Rspack 由字节开源，目标是**兼容 webpack 配置与 loader 生态**，让存量 webpack 项目以最小改造获得 Rust 速度：

```js
// rspack.config.js 几乎与 webpack.config.js 同形
module.exports = {
  context: __dirname,
  entry: './src/index.js',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'typescript', tsx: true },
              transform: { react: { runtime: 'automatic' } },
            },
          },
        },
      },
    ],
  },
};
```

它适合「不想重写配置、只想提速」的大型 webpack 工程。

## 对比

| 工具 | 定位 | 配置兼容 | 适用 |
| --- | --- | --- | --- |
| Vite | 通用、开发体验 | 全新配置 | 新项目 |
| Turbopack | Next.js 原生 | 框架内 | Next.js App Router |
| Rspack | webpack 平替 | 兼容 webpack | 存量大型工程 |

## 总结

新一代构建工具用 Rust 解决速度瓶颈：Turbopack 绑定 Next.js 体验，Rspack 兼容 webpack 生态。选型的本质是「新项目 vs 存量工程」。

## 继续阅读

- 上一篇：[13-Vite 构建工具](13-Vite构建工具)
- 下一篇：[15-使用 @testing-library/react 测试组件](15-使用testing-library测试组件)
