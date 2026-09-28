---
title: Howler.js实例初始化、播放进度同步与时间格式化
description: "前几节把进度条、音量条和控制区都做成了纯 UI 状态。本节开始真正把这些状态接到 Howler.js 的播放逻辑上：先把全局对象 Howler 和实例对象 Howl 的职责分清，再用默认配置合并与全局字段白名单完成初始化，最后通过 onload、seek() 和 requestAnimationFrame() 把时长、播放状态和进度接通到 UI。 这一节的产出是播放器的「基础闭环」：能加载、能播放、能暂停、能显示时长、能同步进度。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Howler.js 实例初始化、播放进度同步与时间格式化

## 概述

前几节把进度条、音量条和控制区都做成了纯 UI 状态。本节开始真正把这些状态接到 Howler.js 的播放逻辑上：先把全局对象 `Howler` 和实例对象 `Howl` 的职责分清，再用默认配置合并与全局字段白名单完成初始化，最后通过 `onload`、`seek()` 和 `requestAnimationFrame()` 把时长、播放状态和进度接通到 UI。

这一节的产出是播放器的「基础闭环」：能加载、能播放、能暂停、能显示时长、能同步进度。拖拽反向控制 `seek()`、音量联动、倍率联动留到后续章节继续做穿。

## 学习目标

- 区分 `Howler`（全局层）与 `Howl`（实例层）的职责边界
- 用 `defaultAudioOptions` 维护组件默认配置，并与用户配置合并
- 用字段白名单把全局选项挂到 `Howler`，避免误写进实例配置
- 在 `onload` 回调里通过 `duration()` 拿到总时长并格式化显示
- 用 `handleTogglePlay()` 在 `play()` 与 `pause()` 之间按状态切换
- 用 `seek()` 加 `requestAnimationFrame()` 实时同步进度，并把秒数换算成百分比

---

## 一、先分清 Howler 与 Howl 的职责

`Howler.js` 暴露两个核心对象：`Howler` 与 `Howl`。它们的职责不同——`Howl` 用来创建具体音频实例，`Howler` 是全局对象，负责全局 options 和全局 methods。

后面会同时遇到两类配置：用户传入的当前实例配置（`src`、`volume`、`loop`、`rate`），以及用户传入的全局行为配置（`autoUnlock`、`html5PoolSize` 之类）。因此初始化不能只是一句 `new Howl(options)`，而要先想清楚哪些值喂给实例、哪些值提前挂到全局对象上。

```ts
import { Howl, Howler } from "howler"

const audioInstance = shallowRef<Howl>()

function initAudio(options: AudioPlayerOptions) {
  Howler.autoUnlock = true
  audioInstance.value = new Howl(options)
}
```

注意：后续要暴露给父组件的方法通常是 `Howl` 实例，而不是整个 `Howler` 对象；全局配置一旦写入 `Howler`，就会影响后续实例行为，所以来源要谨慎。

## 二、维护默认音频配置并合并

和 video.js 一样，音频播放器也应先定义一组默认配置：`volume`、`loop`、`rate`、`mute` 这类组件层默认行为。如果散落在页面逻辑里，后续维护会很困难。

```ts
type DefaultAudioOptions = Partial<AudioPlayerOptions>

const defaultAudioOptions: DefaultAudioOptions = {
  volume: 0.8,
  loop: false,
  rate: 1,
  mute: false,
}

const options = Object.assign({}, defaultAudioOptions, props.options)
```

这里用 `Partial<AudioPlayerOptions>` 很合适，因为默认配置通常只覆盖部分字段。`Object.assign({}, ...)` 比直接改原对象更稳，能避免运行时污染默认配置。

## 三、用白名单把全局选项挂到 Howler

有一类配置属于 `Howler` 的全局属性，不是单个 `Howl` 实例的局部配置。课程用一组「全局配置字段白名单」在初始化前遍历赋值，价值在于：明确哪些字段允许写入全局对象、避免把不属于全局层的字段错误复制给 `Howler`、方便后续类型约束和维护。这是一种受控透传。

```ts
const globalOptionKeys = ["autoUnlock", "html5PoolSize"] as const

for (const key of globalOptionKeys) {
  if (options[key] !== undefined) Howler[key] = options[key]
}
```

要点：全局配置应在实例初始化之前挂载，这样才会影响后续实例行为；不要把所有 `options` 一股脑复制给 `Howler`。

## 四、在 onload 里拿总时长并格式化

总时长最自然的获取时机是 `Howl` 初始化配置里的 `onload` 回调——只有音频真正加载完，总时长才可靠。拿到秒数后存进组件状态，再用 `formatTime()` 转成 UI 文本。格式化函数本身也属于播放器体验：小时为 `0` 时不展示小时段，秒数不保留小数而是四舍五入。

```ts
const state = reactive({ duration: 0 })

audioInstance.value = new Howl({
  ...options,
  onload() {
    state.duration = audioInstance.value?.duration() ?? 0
  },
})
```

```vue
<span>{{ formatTime(state.duration) }}</span>
```

## 五、用 handleTogglePlay 收敛播放/暂停

播放按钮的核心职责不是「只会 play」，而是反映当前状态并决定下一步切到哪个状态。课程收拢成一个语义化入口 `handleTogglePlay()`：先看 `state.isPlay`，正在播放就 `pause()`，否则 `play()`。模板再根据 `state.isPlay` 切图标，UI 与内部状态统一。

```ts
function handleTogglePlay() {
  if (!audioInstance.value) return
  if (state.isPlay) audioInstance.value.pause()
  else audioInstance.value.play()
}
```

```vue
<button type="button" @click="handleTogglePlay">
  <i v-if="state.isPlay">暂停图标</i>
  <i v-else>播放图标</i>
</button>
```

图标切换应跟状态绑定，而不是跟点击行为绑定；这里的 `state.isPlay` 最终应来自实例状态，而非单纯点击时手动翻转。

## 六、用 seek 与 requestAnimationFrame 同步进度

当前播放进度最直接的获取方式是 `seek()`，它返回秒值。但 UI 要持续更新，所以封装一个 `step()`：先判断实例是否存在、再判断当前是否正在播放、然后读取 `seek()`、更新 `state.progress`、再次 `requestAnimationFrame(step)`。这构成经典的「播放中动画帧轮询」。

```ts
function step() {
  if (!audioInstance.value) return
  state.isPlay = audioInstance.value.playing()
  if (!state.isPlay) return
  state.progress = Number(audioInstance.value.seek() || 0)
  requestAnimationFrame(step)
}
```

`requestAnimationFrame()` 应只在播放期间持续调用，否则是无意义轮询。先判断实例存在、再判断正在播放，两个分支都不能省。

## 七、进度条接真实进度，并消除时间文本抖动

`ProgressBar` 需要的是 `0 ~ 1` 百分比，而 `state.progress` 是当前秒数，所以要换算：

```ts
progressRatio.value = state.duration
  ? Math.min(Math.max(state.progress / state.duration, 0), 1)
  : 0
```

课程还发现一个「看起来像进度条在抖」的问题，最终定位到不是滑块在抖，而是左侧时间文本宽度在变化。修复方式是给时间文本固定或最小宽度并加 `text-center`——这是典型的播放器 UI 调优：视觉抖动不一定来自核心交互逻辑，也可能来自相邻排版元素。

```vue
<span class="min-w-[4rem] text-center">{{ formatTime(state.progress) }}</span>
<ProgressBar v-model="progressRatio" />
<span class="min-w-[4rem] text-center">{{ formatTime(state.duration) }}</span>
```

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 为何要区分 `Howler` 和 `Howl` | 一个是全局层，一个是实例层，职责不同 | 先把全局配置写到 `Howler`，再用 `Howl` 创建当前实例 |
| 默认配置为何还要再做一次合并 | 组件需要稳定开箱即用行为，同时允许用户覆盖 | 用 `defaultAudioOptions + props.options` 做浅合并 |
| 直接读取 `duration()` 为何有时拿不到 | 音频还没加载完成 | 在 `onload` 回调里读取总时长 |
| 播放按钮为何不能只写 `play()` | 按钮承担的是播放/暂停切换职责 | 用 `state.isPlay` 驱动 `handleTogglePlay()` 分支 |
| 进度同步为何要用 `requestAnimationFrame` | 只取一次 `seek()` 不足以驱动连续 UI | 播放期间循环执行 `step()` 持续刷新 |
| 进度条为何还要传百分比 | `ProgressBar` 的对外契约是 `0 ~ 1`，不是秒数 | 用 `state.progress / state.duration` 做换算 |
| 看起来像进度条在抖，问题在哪 | 左右时间文本宽度变化撑动了布局 | 给时间文本固定最小宽度并居中 |
| 销毁实例为何还要 `unload()` | 只清空变量不能释放内部资源 | 卸载阶段调用 `audioInstance.value?.unload()` |

## 延伸阅读

- 上一篇：[Howler.js 进度条组件封装、音量控制与播放模式切换](05-Howler.js进度条组件封装、音量控制与播放模式切换.md)
- 下一篇：[Howler.js 进度条反控、音量联动与 15 秒快进快退、倍速切换](07-Howler.js进度条反控、音量联动与15秒快进快退、倍速切换.md)
- 相关：[video.js 基础集成、播放器组件封装与默认配置合并](02-video.js基础集成、播放器组件封装与默认配置合并.md)
- 参考：[Howler.js README](https://github.com/goldfire/howler.js/blob/master/README.md)、[MDN `requestAnimationFrame`](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestAnimationFrame)
