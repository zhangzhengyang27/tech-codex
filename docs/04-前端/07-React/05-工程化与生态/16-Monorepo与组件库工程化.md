---
title: "Monorepo 与组件库工程化"
description: "大型 React 项目常用 Monorepo 管理多包（应用 + 组件库）。本章讲清 pnpm workspace、Turborepo 的任务编排，以及组件库发布的工程链路。"
keywords: [Monorepo, pnpm workspace, Turborepo, 组件库, 工程化]
category: React
tags: [React, 工程化与生态]
---

# Monorepo 与组件库工程化

## 学习目标

- 掌握 pnpm workspace 多包管理
- 理解 Turborepo 的任务缓存与依赖编排
- 了解组件库的构建、类型与发布链路

## 为什么 Monorepo

当「多个应用 + 共享组件库 + 工具包」需要统一版本与原子提交，Monorepo 让跨包改动一次提交完成，避免多仓库版本漂移。

## pnpm workspace

`pnpm-workspace.yaml` 声明包范围，包间可「软链接」互相引用而无需发版：

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

```jsonc
// packages/ui/package.json
{ "name": "@acme/ui", "exports": { ".": "./src/index.ts" } }
```

应用直接 `import { Button } from '@acme/ui'` 即引用源码，配合 [13-Vite 构建工具](13-Vite构建工具) 的 ESM 实现「源码级联调」。

## Turborepo 编排

Turborepo 用任务依赖图缓存可复现任务：

```jsonc
// turbo.json
{ "tasks": { "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] }, "test": {} } }
```

`turbo run build` 只对变更及受影响的包重算，命中缓存则跳过，CI 大幅提速。

## 组件库发布链路

- 用 `tsc` / `vite build` 产出 ESM + CJS + `.d.ts`；
- 用 `changesets` 管理版本与 CHANGELOG；
- 发布到私有/公共 registry，`peerDependencies` 声明 React 版本避免重复打包。

## 总结

Monorepo 让多包工程「一次提交、原子联动」，pnpm workspace 管依赖、Turborepo 管任务缓存、changesets 管发布，三者构成 React 组件库工程化的标准栈。

## 继续阅读

- 上一篇：[15-使用 @testing-library/react 测试组件](15-使用testing-library测试组件)
- 下一篇：[05-开发前准备](../06-项目实战/05-开发前准备)
