---
title: 组件库可用性验证：纯净Playground联调
description: "这一节第一次把「构建成功」和「真正可用」明确区分开。组件库已经能打包了，但一个完全独立的项目真的能把它用起来吗？课程强调要用一个「单纯的基础环境」来验证，而不是直接回到原模板项目——因为原模板里天然已有 Element Plus、i18n、样式系统、全局注册等，会掩盖组件库的隐式依赖。本文讲清纯净 Playground 的价值、npm link 联调缓存、optimizeDeps.force 强制重预构建、Source Map 跳源码，以及 $t is not a function 暴露的宿主 i18n 隐式依赖问题。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 组件库可用性验证：纯净 Playground 联调

## 概述

这一节第一次把「构建成功」和「真正可用」明确区分开。组件库已经能打包了，但一个完全独立的项目真的能把它用起来吗？课程强调要用一个「单纯的基础环境」来验证，而不是直接回到原模板项目——因为原模板里天然已有 Element Plus、i18n、样式系统、全局注册等，会掩盖组件库的隐式依赖。本文讲清纯净 Playground 的价值、`npm link` 联调缓存、`optimizeDeps.force` 强制重预构建、Source Map 跳源码，以及 `$t is not a function` 暴露的宿主 i18n 隐式依赖问题。

## 学习目标

- 理解组件库「打包成功」不等于「可被第三方项目真实消费」，需用纯净 Playground 从零模拟接入
- 识别 `npm link` 联调的三层缓存：link 产物、Vite 预构建缓存、浏览器缓存
- 用 `optimizeDeps.force: true` 强制重新预构建依赖，缩短 linked package 旧缓存干扰
- 借助 Source Map 把运行时报错映射回源码，而非在构建产物里盲猜
- 通过 `$t is not a function` 识别组件对宿主 i18n 的隐式依赖，并在三种 i18n 策略间做选择

---

## 一、纯净 Playground 才是真实的消费方验收

如果直接回到原模板项目测试组件库，很多问题会被原项目本身的运行环境遮蔽：Element Plus、i18n、样式系统、工具函数、全局注册、各种业务模块都在。这会导致假象——你以为组件库「已经能用了」，其实只是「它在原宿主环境里还能继续活着」。

更合理的验证方式是用纯净 Playground，从零安装、从零引入、从零配置，这才是真正模拟第三方项目接入。Playground 的价值不是「预览页面」，而是「最小消费方环境」。组件库越偏业务型，越容易偷偷依赖原模板里的全局能力。这一节本质上是在做一次「消费方视角验收」。

## 二、`npm link` 联调的三层缓存

更新组件库后重新安装 / 重新 link，是为了避免 Playground 继续吃旧缓存。这背后其实有两层缓存：

- link 层：组件库的 `dist` 产物是否已更新，Playground 当前引用到的还是不是旧构建结果；
- Vite 预构建层：`node_modules/.vite` 中是否还缓存着旧的依赖预构建结果。

所以「我代码明明改了，为什么页面还是旧的」通常不是单点问题。组件库源码更新，并不等于消费方开发服务器一定立刻看到最新结果；`npm link` 解决的是包链接，不负责帮你清理 Vite 的依赖优化缓存。这类问题常表现为「类型、样式、运行逻辑三者不同步」。

## 三、`optimizeDeps.force` 强制重新预构建

`optimizeDeps.force: true` 的作用是：启动时忽略之前缓存的优化依赖，强制重新进行依赖预构建。这对组件库联调尤其有用，因为 linked package 的构建结果变化后，Vite 未必会自动把它当作「需要重新优化」的依赖。

```ts
// playground/vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  optimizeDeps: {
    force: true,
  },
})
```

这个配置更适合调试阶段，不建议长期无脑常驻；它处理的是 Vite 依赖预构建缓存，不是替代浏览器缓存策略。课程配它的真正目的，是让 Playground 更快拿到 linked package 的最新产物。

## 四、无痕窗口与 Vite 缓存不是同一层

课程给了两种思路：用无痕窗口、用 `optimizeDeps.force`。两者处理的层次并不一样：无痕窗口主要规避浏览器侧缓存、localStorage、service worker 等干扰；`optimizeDeps.force` 处理的是开发服务器侧的依赖优化缓存。真正工程上更常见的结论是：无痕窗口是辅助，Vite 缓存和包链接状态才是主因。如果组件库样式、类型或运行逻辑总「看起来不对劲」，优先怀疑 Vite 缓存和 link 产物。稳定的联调流程仍然是：重构建 → 刷新依赖 → 重启 dev server。

## 五、Source Map 把报错跳回源码

课程发生 `$t is not a function` 报错后，第一步不是盲改，而是借助 Source Map 直接跳到源码位置。这是组件库调试里非常关键的能力：你面对的经常是 `dist` 产物被消费后的运行错误，没有 Source Map 只能在打包后的代码里猜，有了它就能直接定位到具体组件源码。组件库调试阶段保留 Source Map 通常是值得的，最大价值是极大降低排错成本。

## 六、`$t is not a function` 暴露宿主 i18n 隐式依赖

通过 Source Map 追到 `IconPicker` 组件后，发现它内部直接调用了 `$t`。这说明组件内部默认假设：当前 app 已经注册了 i18n 插件，运行时上下文里存在全局翻译能力。在原模板项目里这种假设通常成立，但在纯净 Playground 里不一定成立，于是报出 `$t is not a function`。这类问题的本质不是「函数名写错了」，而是组件库和宿主应用之间的边界没有定义清楚——属于「隐式依赖暴露」。

对组件库里的国际化能力，至少有三种策略：

- 方案 A：依赖宿主 i18n，组件继续使用 `$t` / `useI18n`，但明确要求消费方安装并注册 i18n；
- 方案 B：组件库内置最小 i18n，自己提供默认语言包和切换能力，更独立但体积和复杂度会上来；
- 方案 C：把文案控制权交给使用者，通过 props、slots、配置对象传文本，最解耦但 API 设计更复杂。

这不是纯技术问题，而是组件库定位问题。如果主要服务同一套 admin 系统，依赖宿主 i18n 往往可接受；如果目标是通用开放复用，宿主依赖必须明确写进文档，或进一步解耦。

## 七、Playground 是边界检测器

这一节最重要的价值不只是发现 `$t` 报错，而是让你终于开始知道：原模板到底默默提供了哪些全局能力——i18n、Element Plus 全局注册、全局样式、自动导入、路由上下文、全局工具函数。只有当这些东西被 Playground 一件一件拆掉后，组件库的真实边界才会显现。组件库从「能在原项目里复用」走向「能被独立项目消费」，最关键的一步就是环境去魅。Playground 不是可有可无，它本质上是边界检测器。

## 八、用最小案例复现并做宿主依赖审计

纯净验证的目标不是做完整页面，而是让运行时尽快暴露缺失依赖和上下文假设。一个最小 Playground 案例足以触发问题：

```vue
<!-- playground/src/App.vue -->
<script setup lang="ts">
import { IconPicker } from 'el-admin-components'
import type { CSSProperties } from 'vue'

const iconPickerStyle: CSSProperties = { width: '320px' }
const handleSubmit = (value: any) => console.log(value)
</script>

<template>
  <div :style="iconPickerStyle">
    <IconPicker @submit="handleSubmit" />
  </div>
</template>
```

当这类组件报 `$t is not a function` 时，按下面的顺序排查：保留 Source Map → 在浏览器报错中跳回源码 → 定位到具体组件 → 检查它是否直接依赖 `$t` / `useI18n` / 全局属性 → 再决定补宿主 i18n 还是改组件设计。更主动的做法是做一次「宿主依赖审计」：把当前组件库里所有直接用到 `$t`、`useI18n`、`useRoute`、`inject` 的组件列出来，逐个判断这些上下文是否应由消费方提供，或改为 props / slots 外置。

三条 i18n 策略没有绝对优劣，但判断标准很清晰：如果组件库只服务于内部 admin 体系，依赖宿主 i18n 通常可接受；如果目标是开放复用，宿主依赖必须写进文档或彻底解耦；折中的文案外置（props / slots）最干净，但会抬高使用方的接入成本。先验证再定策略，远比一开始就拍板更稳。这也是课程把可用性验证放在组件库工程化早期而非末尾的原因：边界越早显性化，后期返工成本越低。

实操上，把「原模板默认提供的一切」显性化，可以从一张清单开始：i18n、Element Plus 全局注册、全局样式、自动导入、路由上下文、全局工具函数。逐项判断它是组件库该自带、该要求消费方提供，还是该改为显式 props / 配置。这张清单本身就是组件库后续「接入前必读」文档的雏形。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 组件库已 build 成功但 Playground 用不了 | 构建成功只代表产物生成，不代表宿主依赖和运行上下文齐全 | 用纯净 Playground 从零验证真实接入流程 |
| 组件库更新了但 Playground 还是旧效果 | link 产物、Vite 预构建缓存、浏览器缓存之一没刷新 | 重新 build、重新 link / install、重启 dev server，必要时开启 `optimizeDeps.force` |
| 无痕窗口也没解决问题 | 根因不在浏览器缓存，而在 Vite 预构建缓存或宿主环境差异 | 优先排查 `.vite` 预构建缓存和 linked package 产物 |
| 浏览器报错看不懂 | 只看到打包后的代码位置 | 保留 Source Map，直接跳回源码定位 |
| `$t is not a function` | 组件默认依赖宿主已注入 i18n | 明确 i18n 策略：宿主提供、组件库自带，或改为 props/slots 外置文本 |
| 原模板里一切正常换 Playground 就坏 | 原模板默认提供了太多全局上下文 | 逐步把这些上下文显性化，写进文档或改造组件设计 |

## 延伸阅读

- 上一篇：[组件库批量打包排错：第三方依赖收敛](04-组件库批量打包排错：第三方依赖收敛.md)
- 下一篇：[组件库国际化完整方案：外部依赖、资源外置与远程加载](../05-组件库国际化与API完善/01-组件库国际化完整方案：外部依赖、资源外置与远程加载.md)
- 相关：[Vite Dep Optimization Options](https://vite.dev/config/dep-optimization-options)
- 相关：[Vite Features](https://vite.dev/guide/features)
- 相关：[Vue I18n 文档](https://vue-i18n.intlify.dev/)
- 相关：[Element Plus Quick Start](https://element-plus.org/en-US/guide/quickstart)
