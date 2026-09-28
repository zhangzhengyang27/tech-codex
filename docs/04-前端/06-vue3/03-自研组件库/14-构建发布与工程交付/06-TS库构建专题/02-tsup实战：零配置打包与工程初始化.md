---
title: tsup实战：零配置打包与工程初始化
description: "这一节是「TS 库工程化」子线的真正起点。课程目标不是炫耀 tsup 命令有多短，而是让你体会：纯 TS 库的最小构建链路其实可以很轻。它先打通 tsup + tsconfig + Lint 的基础工程，下一节再扩展脚本、Git Hooks 和发包流程。tsup 的核心价值不是「又一个打包工具」，而是让纯 TS 库在几乎零配置的前提下快速从 src/index.ts 出到 dist，并顺带产出类型声明、支持 ESM / CJS 两种格式——非常适合工具库、SDK、辅助库。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# tsup 实战：零配置打包与工程初始化

## 概述

这一节是「TS 库工程化」子线的真正起点。课程目标不是炫耀 tsup 命令有多短，而是让你体会：纯 TS 库的最小构建链路其实可以很轻。它先打通 tsup + tsconfig + Lint 的基础工程，下一节再扩展脚本、Git Hooks 和发包流程。tsup 的核心价值不是「又一个打包工具」，而是让纯 TS 库在几乎零配置的前提下快速从 src/index.ts 出到 dist，并顺带产出类型声明、支持 ESM / CJS 两种格式——非常适合工具库、SDK、辅助库。

## 学习目标

- 理解 tsup 在纯 TS 库场景下「零配置快速起步」的价值与边界
- 掌握同时输出 esm / cjs 两类产物，以及 --dts 生成类型声明
- 判断何时把命令行参数收敛进 tsup.config.ts
- 补齐 tsconfig.json 给类型检查、声明生成和源码组织提供底座
- 接入 ESLint 把代码风格提前变成工程约束，理解合格模板的四项能力

---

## 一、tsup 的价值不在「又一个打包工具」

课程选择 tsup，核心原因是快速、配置少，适合纯 TS 工具库、SDK、辅助库。对这类项目，最重要的不是复杂插件系统，而是：能否快速从 src/index.ts 出到 dist、能否顺带产出类型声明、能否支持 ESM / CJS。它很适合「先最小跑通，再逐步加配置」的节奏，更适合纯 TS 库，不一定适合所有带复杂样式和运行时资源的项目。

```bash
pnpm add -D tsup typescript
npx tsup src/index.ts
```

对教学来说，tsup 的价值在于降低库工程化入门门槛。

## 二、同时输出 esm 和 cjs 两类产物

面向 npm 生态的 TS 库，消费方并不统一：现代构建链偏 esm，一些旧环境、Node 工具链或兼容场景还需要 cjs。所以课程把 tsup 输出格式扩成 esm 和 cjs。

```bash
npx tsup src/index.ts --format esm,cjs
```

```json
{
  "scripts": {
    "build": "tsup src/index.ts --format esm,cjs"
  }
}
```

不是所有库都一定要同时支持两种格式，但这通常是最稳妥的默认选项。只有产物格式和 package.json 入口声明匹配，消费方才能稳定使用——这一步是从「能 build」走向「能交付」的第一步。

## 三、--dts 类型声明是标配

课程做的是 TS 库，不是单纯 JS 工具。既然面向 TypeScript 用户，就不能只生成 JS，还要把 .d.ts 一起产出。`--dts`（或配置 `dts: true`）基本是标配。

```bash
npx tsup src/index.ts --format esm,cjs --dts
```

没有类型声明的 TS 库，使用体验会明显下降；产出 .d.ts 后还要在 package.json 对齐 types；类型文件生成不是「可选优化」，而是库可用性的一部分。

## 四、命令行参数变多就收敛进 tsup.config.ts

最开始直接命令行跑 tsup 适合入门。但一旦开始增加 format、dts、sourcemap、clean、watch、external，如果还全堆在脚本里，维护成本会迅速上升。所以课程逐步引导进入配置文件阶段。

```ts
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
})
```

命令行适合试验，配置文件适合长期维护；一旦准备做模板项目，配置文件基本是必选项，这也是组件库工程化从「脚本」走向「项目」的分水岭。

## 五、tsconfig 是工程化底座

课程补 tsconfig 的意义至少有三层：让 TypeScript 明确源代码根目录和输出语义、配合库构建生成更稳定的声明文件、给后续 IDE / Lint / 构建器统一一套 TS 约束。对纯 TS 库来说，tsconfig 是整个工程化的底座之一。

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "declaration": true,
    "strict": true,
    "moduleResolution": "Node"
  },
  "include": ["src"]
}
```

tsup 能帮你打包，不代表可以完全不要 tsconfig；组件库项目通常更应把 TS 基线配清楚，而不是只追求能跑。这一步会直接影响后面声明文件质量。

## 六、Lint 把风格提前变成工程约束

课程在 tsup 跑通后，没有直接跳去发包，而是继续补 ESLint 和 TypeScript ESLint 作为代码质量校验入口。这个顺序合理：只会 build 的项目不代表是可维护的模板，模板必须能约束未来代码继续保持一致风格。Lint 是工程卫生，不是锦上添花。

```bash
pnpm add -D eslint typescript-eslint
```

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

课程先接 tsup 再接 Lint，符合真实项目搭建节奏；后面接 Git Hooks 时，这些命令还会被继续复用。

## 七、合格 TS 库模板的四项能力

这一节看似内容分散，其实是在逐步补齐一套最小模板：tsup 对应可构建、--dts / tsconfig 对应可声明、eslint 对应可校验、后续的 tsx / 脚本扩展对应可调试。这就是模板项目和临时 demo 的区别。课程真正想教的不是某一个包，而是模板项目的成型顺序——当这四项能力都具备后，后续发包、联调、组件迁移才会更顺。这一节和下一节本来就是一组连续的工程化动作。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| tsup 能跑但没有类型声明文件 | 没开 --dts 或 dts: true | 补充声明生成配置 |
| 命令越来越长、越来越难维护 | 构建逻辑都堆在 package 脚本里 | 把配置迁移到 tsup.config.ts |
| 项目能打包但编辑器类型体验差 | tsconfig 配置不完整 | 补齐基础 TS 配置 |
| 项目能 build 但团队风格混乱 | 没有接入 Lint | 增加 eslint、lint、lint:fix |
| 入口文件写了很多逻辑不好维护 | 没先建立清晰统一的 src/index.ts | 先收敛统一入口，再扩展多入口 |

## 延伸阅读

- 上一篇：[TS 库工具选型：编译器、运行时与打包工具](01-TS库工具选型：编译器、运行时与打包工具.md)
- 下一篇：[package.json 脚本扩展与发包流程](03-package-json脚本扩展与发包流程.md)
- 相关：[tsup 官方仓库](https://github.com/egoist/tsup)
- 相关：[TypeScript TSConfig Reference](https://www.typescriptlang.org/tsconfig)
- 相关：[ESLint 官方文档](https://eslint.org/)
