---
title: "Vite 构建工具"
description: "Vite 以原生 ESM + 按需编译取代 webpack 的预打包，开发启动秒级。本章讲清它与 React 的集成、HMR 原理，以及与 CRA/webpack 的差异。"
keywords: [Vite, 构建工具, ESM, HMR, dev server]
category: React
tags: [React, 工程化与生态]
---

# Vite 构建工具

## 学习目标

- 理解 Vite「开发期原生 ESM、生产期 Rollup」的双模式
- 掌握 `@vitejs/plugin-react` 的集成
- 理解 Vite 与 webpack/CRA 的核心差异

## 为什么快

webpack 类工具启动时要**先打包整个依赖图**再起服务；Vite 开发期直接以**浏览器原生 ESM** 提供源码，依赖（node_modules）用 esbuild 预打包为临时模块，应用代码按需编译，因此冷启动几乎即时。

```js
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()], server: { port: 4200 } });
```

## HMR 原理

Vite 的 HMR 基于原生 ESM：某个模块变更时，只通过 WebSocket 推送该模块的新代码，浏览器重新 `import` 该模块及其受影响链，无需重建整个 bundle，保存即所见。

## 与 CRA / webpack 的差异

| 维度 | CRA / webpack | Vite |
| --- | --- | --- |
| 开发启动 | 全量打包，慢 | 原生 ESM，秒级 |
| 生产构建 | webpack | Rollup（esbuild 压缩） |
| 配置心智 | loader / plugin 链 | 插件 + 原生 ESM |

React 官方已推荐新项目用 Vite 或框架（Next.js）替代 CRA，CRA 已停止维护。

## 总结

Vite 用「开发期不打包、生产期 Rollup」的取舍换来了极致开发体验，是 React 新项目的主流脚手架选择。

## 继续阅读

- 上一篇：[12-react-dnd实战-拖拽版TodoList](12-react-dnd实战-拖拽版TodoList)
- 下一篇：[14-Turbopack 与 Rspack](14-Turbopack与Rspack)
