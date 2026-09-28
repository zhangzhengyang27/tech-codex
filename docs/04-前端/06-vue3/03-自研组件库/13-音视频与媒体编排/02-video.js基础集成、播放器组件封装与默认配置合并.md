---
title: video.js基础集成、播放器组件封装与默认配置合并
description: "官方 Guides 展示了三类嵌入方式：直接在原生 video 标签上增强、player div ingest、使用 <video-js> 自定义元素。在 Vue 组件里更推荐第二种——用容器包裹 video 节点，自己控制 ref、生命周期与实例获取。这是一种“容器交给 Vue 管，播放器内部增强交给 video.js”的集成方式，和图表、编辑器这类实例型组件的封装思路一致。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# video.js 基础集成、播放器组件封装与默认配置合并

## 概述

视频侧选型确定 video.js 之后，真正落地要解决的是“如何在 Vue 3 组件里稳定地封装它”。video.js 是典型的第三方实例型库，必须依赖真实 DOM 初始化、在组件卸载时销毁，并对外保留实例透传能力。本文从嵌入方式、初始化策略、类型补强、生命周期封装到默认配置合并，一步步搭出可复用的 VideoPlayer 组件骨架。

## 学习目标

- 理解为什么在 Vue 组件里优先选 player div ingest + 手动初始化
- 认识 video.js 自带类型入口但 options 仍为 any，学会自己维护受控的 VideoJsOptions
- 掌握“容器节点 + 实例引用 + 生命周期回收”的封装骨架
- 用 defaultOptions 与 Object.assign 合并用户配置，提升开箱即用程度
- 通过 init 事件把播放器实例透传给父组件，并扩展控制栏按钮

---

## 一、嵌入方式与初始化策略

官方 Guides 展示了三类嵌入方式：直接在原生 video 标签上增强、player div ingest、使用 `<video-js>` 自定义元素。在 Vue 组件里更推荐第二种——用容器包裹 video 节点，自己控制 ref、生命周期与实例获取。这是一种“容器交给 Vue 管，播放器内部增强交给 video.js”的集成方式，和图表、编辑器这类实例型组件的封装思路一致。

初始化同样有两套：依赖 `data-setup` 的自动初始化，以及脚本里显式调用 `videojs()` 的手动初始化。组件封装应优先手动初始化，因为一旦进入 Vue 层，更需要自己决定初始化时机、销毁时机、options 合并方式，以及初始化完成后是否向外派发实例。

```ts
import videojs from "video.js"

onMounted(() => {
  playerInstance.value = videojs(playerRef.value!, options)
})

onBeforeUnmount(() => {
  playerInstance.value?.dispose()
})
```

## 二、类型补强：自己维护 VideoJsOptions

video.js 包内确实有类型声明入口（如 `./dist/types/video.d.ts`），但 `videojs()` 的 options 参数仍是 `any`。所以项目中仍然值得自己维护一份受控的 `VideoJsOptions`，常用字段强约束，其余字段用索引签名兜底。这层类型不是和官方对抗，而是给组件 props 与对外契约补一层边界。

```ts
export interface VideoJsOptions {
  autoplay?: boolean | "play" | "muted" | "any"
  controls?: boolean
  fluid?: boolean
  aspectRatio?: string
  playbackRates?: number[]
  muted?: boolean
  loop?: boolean
  sources?: Array<{ src: string; type?: string }>
  [key: string]: unknown
}

export interface VideoPlayerProps {
  options?: VideoJsOptions
}
```

## 三、封装骨架：DOM + 实例引用 + 生命周期

VideoPlayer 组件的核心骨架非常标准：模板里提供 video DOM，脚本里用 `ref` 指向它，用 `shallowRef()` 存放播放器实例（播放器实例不是拿来深层响应式追踪的），`onMounted()` 初始化，`onBeforeUnmount()` 调用 `dispose()` 回收。`dispose()` 不只是“删变量”，它负责清理内部资源与事件绑定，组件销毁时必须调用，否则容易残留事件与 DOM 状态。

```vue
<template>
  <div data-vjs-player>
    <video ref="playerRef" class="video-js" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from "vue"
import videojs from "video.js"
import "video.js/dist/video-js.css"

const playerRef = ref<HTMLVideoElement>()
const playerInstance = shallowRef<any>()
</script>
```

## 四、默认配置合并

组件内部应沉淀一组 `defaultOptions`，再和用户传入的 `props.options` 浅合并。这样页面只关心差异化配置，组件内部默认就具备合理交互体验，后续统一升级默认能力时也只需改组件层。注意合并时要新建空对象，避免污染默认配置源；嵌套更复杂时再考虑深合并工具。

```ts
const defaultOptions: VideoJsOptions = {
  autoplay: false,
  controls: true,
  fluid: true,
  aspectRatio: "16:9",
  playbackRates: [0.5, 1, 1.5, 2, 2.5, 3],
  muted: false,
  loop: false
}

const mergedOptions = Object.assign({}, defaultOptions, props.options)
```

## 五、实例透传与控制栏扩展

组件初始化完成后，应通过 `defineEmits()` 触发 `init` 事件把实例抛给父组件，而不是让父组件深入操纵内部 DOM。这种方式既让父层能及时拿到实例，又保留子组件对初始化与销毁的控制权。

```ts
const emit = defineEmits<{ init: [player: unknown] }>()
playerInstance.value = videojs(playerRef.value, mergedOptions)
emit("init", playerInstance.value)
```

控制栏扩展也可以通过 `getChild("controlBar").addChild()` 完成，比“new 一个按钮再手动塞 DOM”更符合组件树思维。自定义图标若依赖 CSS 背景图，常需全局样式，图标素材可直接用 SVG Data URI。

```ts
playerInstance.value?.getChild("controlBar")?.addChild("button", {
  className: "icon-home-button",
  clickHandler() { console.log("custom control button clicked") }
})
```

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 为什么不直接用 data-setup 自动初始化 | 自动初始化不利于和 Vue 生命周期精确协同 | 组件内使用手动 `videojs()` 初始化，更易控制销毁与实例透传 |
| 官方已有类型，为何还要自己定义 options | 初始化 options 仍然是 any | 维护一份 VideoJsOptions，常用字段强约束，其余索引签名兜底 |
| 视频没有撑满宽度或比例不对 | 未启用流式布局或比例约束 | 设置 `fluid: true`，配合 `aspectRatio: "16:9"` |
| 父组件拿不到 video.js 实例 | 组件只在内部初始化，未对外透传 | 用 defineEmits 定义 init 事件，初始化完成后 `emit("init", instance)` |
| 自定义控制栏按钮图标不生效 | video.js 内部结构与 scoped 样式作用域冲突 | 优先使用全局样式，并用 SVG Data URI 或明确可命中的选择器 |
| 页面切换后播放器行为异常或重复创建 | 实例销毁不彻底 | 在 onBeforeUnmount 中显式调用 `dispose()` |

## 延伸阅读

- 上一篇：[音视频播放器选型对比与组件方案确定](01-音视频播放器选型对比与组件方案确定.md)
- 下一篇：[Howler.js 音频播放器结构搭建、样式布局与响应式设计](03-Howler.js音频播放器结构搭建、样式布局与响应式设计.md)
- 相关资源：[video.js Embeds Guide](https://videojs.com/guides/embeds/)、[video.js Options Reference](https://videojs.com/guides/options/)、[video.js Components Guide](https://videojs.com/guides/components/)
