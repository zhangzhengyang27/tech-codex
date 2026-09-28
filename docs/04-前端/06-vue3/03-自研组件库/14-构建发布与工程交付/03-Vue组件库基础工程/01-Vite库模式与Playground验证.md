---
title: Vite库模式与Playground验证
description: "把现有业务项目里的 components 直接打包成组件库，技术上可行，但不建议在已经很复杂的业务工程里硬改。一个真实业务项目的 vite.config.ts 往往同时承担 Web 应用、桌面端、环境变量分支等多种构建职责，再把组件库构建逻辑塞进去只会让配置越来越难维护。更合理的路径是先独立出一个轻量、纯粹的组件库基础工程，再在这个工程里学习 Vite Library Mode、导出方式和打包流程。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Vite 库模式与 Playground 验证

## 概述

把现有业务项目里的 `components` 直接打包成组件库，技术上可行，但不建议在已经很复杂的业务工程里硬改。一个真实业务项目的 `vite.config.ts` 往往同时承担 Web 应用、桌面端、环境变量分支等多种构建职责，再把组件库构建逻辑塞进去只会让配置越来越难维护。更合理的路径是先独立出一个轻量、纯粹的组件库基础工程，再在这个工程里学习 Vite Library Mode、导出方式和打包流程。

本文聚焦三件事：如何用 Vite Library Mode 把 `.vue` 组件构建成可被其他项目 `import` 的库产物、如何建立清晰的库入口、以及如何用一个 Playground 项目验证库真的能被安装、导入和渲染。

## 学习目标

- 理解为什么组件库应该放在独立的轻量工程里，而不是业务项目里顺手切一刀
- 掌握 Vite Library Mode 的核心配置：`build.lib`、`formats`、`rollupOptions.external`
- 区分应用入口 `main.ts` 与库入口 `src/index.ts` 的职责差异
- 把 `vue` 设为 `peerDependencies` 与 `external`，避免使用方出现重复 Vue
- 用 Playground（workspace / `file:` / link）模拟真实消费，而不是只看 `build` 是否成功

---

## 一、为什么需要独立的组件库工程

直接用业务项目的 `vite.config.ts` 承载组件库构建，会带来几个现实问题：

- 业务配置本身已经很长，里面混有桌面端、环境变量分支、各种插件的判断条件；
- 后续接手的人要在同一份文件里理解两套完全不同的构建目标；
- 组件库构建与业务构建职责混杂，任何一处改动都可能影响另一处。

所以课程强调的做法是：先独立初始化一个最小组件库工程，只保留组件库需要的构建配置，再在这个基础上学习库模式与打包流程。这不是绕路，而是在降低长期维护成本。

## 二、Vite Library Mode 是本阶段的合理起点

Vite、Rollup、Webpack 都能打包组件库，但如果你当前目标是「快速搭一个 Vue 组件库基础工程，同时理解构建过程」，Vite Library Mode 是最直接的起点。它和普通应用开发的区别在于：

- 普通开发模式：启动本地服务，面向页面运行；
- 库模式：输出一个可复用的库，面向其他项目消费。

库模式最终产出的不是运行中的站点，而是一组 JS 模块文件、可能拆出的 CSS 文件，以及通常还需要额外补齐的类型声明文件。

```ts
build: {
  lib: {
    entry: "src/index.ts",
    name: "MyLib"
  }
}
```

`build.lib` 面向「产物输出」，不是面向「页面运行」。它底层仍依赖 Rollup 的产物能力，所以很多输出选项来自 Rollup 配置。

## 三、打包的是 `.vue` 组件，不是纯 TS 工具库

如果你的产物是纯函数、工具方法、工具类，用纯 TS 库构建思路完全没问题。但如果你打包的是带模板、样式、组件选项的 Vue 组件，就应该围绕「Vue 组件库」去设计工程，而不是把它误当成普通 TS 模块库。组件库的构建边界通常比工具库更复杂，`tsc` 无法直接覆盖 `.vue` 组件的完整构建需求。

```ts
// 工具库入口
export * from "./utils";

// Vue 组件库入口
export { default as VButton } from "./components/VButton.vue";
```

初始化组件库基础工程时，更推荐直接用最轻的 Vue + TS 模板：

```bash
npm create vite@latest my-vue-components -- --template vue-ts
```

如果确实选择 `create-vue`，建议关闭 Router、Pinia、Cypress，保留 TypeScript，按需保留 Vitest 和 ESLint。模板越轻越好，不要把应用级配置无脑带进来。

## 四、库入口用 `src/index.ts` 而非 `main.ts`

教学里常直接把 `main.ts` 改造成导出入口，但在可复用经验里更推荐写成 `src/index.ts`。原因是：`main.ts` 语义上是应用入口，里面常有 `createApp(...).mount(...)`；`index.ts` 更符合库入口语义，只负责导出组件和类型。

```ts
// src/index.ts
export { default as HelloWorld } from "./components/HelloWorld.vue";
export { default as TheWelcome } from "./components/TheWelcome.vue";
```

库入口文件应该尽量「只导出，不启动」。后续若支持全局注册，可以在入口里补 `install(app)`。

## 五、`build.lib` 之外还要处理输出格式与 Vue 外部化

`build.lib` 只是第一步，真正能让组件库被外部项目稳定消费，还包括输出格式、`vue` 外部化和包入口约定。最关键的一点是：`vue` 不应该被打进组件库主产物，应该作为 `peerDependencies` 和 `external`，否则使用方项目可能出现两份 Vue。

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "MyLib",
      fileName: "my-lib",
      formats: ["es", "umd"]
    },
    rollupOptions: {
      external: ["vue"],
      output: {
        globals: {
          vue: "Vue"
        }
      }
    }
  }
});
```

```json
{
  "name": "my-lib",
  "version": "0.0.0",
  "main": "./dist/my-lib.umd.cjs",
  "module": "./dist/my-lib.js",
  "types": "./dist/index.d.ts",
  "peerDependencies": {
    "vue": "^3.0.0"
  }
}
```

不对 `vue` 做 `external`，组件库很容易把 Vue 一起打进去；包入口字段也要和实际构建产物保持一致。

## 六、Playground 验证的是真实消费，不是打包命令

很多人做组件库时只看 `pnpm build` 成功就以为没问题，但真正关键的是：别的项目能不能装、能不能导入、TS 有没有类型提示、页面能不能正常显示。这就是 Playground 的价值。课程里通过相对路径导入 `dist` 文件加改 TS 配置来跑通，可用于教学，但真实工程更推荐 `pnpm workspace`、`file:` 本地依赖、`npm link / pnpm link` 或 monorepo 直接联调。

```json
{
  "dependencies": {
    "my-lib": "file:../my-vue-components"
  }
}
```

```vue
<script setup lang="ts">
import { HelloWorld, TheWelcome } from "my-lib";
</script>

<template>
  <HelloWorld />
  <TheWelcome />
</template>
```

「能 build」不等于「能消费」。Playground 最好模拟真实安装路径，而不是长期依赖手工复制 `dist` 文件。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 组件库项目里还保留 `createApp(App).mount(...)` | 仍在沿用应用入口思路 | 单独建立 `src/index.ts`，只负责组件导出 |
| 其他项目使用时报 Vue 重复实例 | 没有把 `vue` 设为 external / peer dependency | 在 `rollupOptions.external` 和 `peerDependencies` 中都声明 `vue` |
| 直接在复杂业务项目里加库模式配置，配置越改越乱 | 业务构建和库构建职责混在一起 | 单独初始化一个最小组件库工程 |
| Playground 导入 dist 文件报 TS 声明或路径问题 | 直接相对路径导入构建产物，消费方式不稳 | 用 `file:`、workspace 或 link 模拟真实安装 |
| 只会 `build`，但不知道产物能不能被别人用 | 缺少真实消费验证 | 新建 Playground，验证安装、导入、渲染和类型 |

## 延伸阅读

- 上一篇：[Renovate 安装接入与配置校验](../02-CI部署与依赖治理/05-Renovate安装接入与配置校验.md)
- 下一篇：[开发期页面闪烁与依赖预构建优化](02-开发期页面闪烁与依赖预构建优化.md)
- 相关：[Vite 官方文档：Library Mode](https://vite.dev/guide/build.html#library-mode)
- 相关：[unplugin-vue-components](https://github.com/unplugin/unplugin-vue-components)
