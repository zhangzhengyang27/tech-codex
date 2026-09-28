---
title: Howler.js歌单切换、播放模式事件透传与自动播放状态继承
description: "这一节播放器正式和外层歌单联动。第一步不是写切歌逻辑，而是先把组件会向外抛的事件定义清楚（preview / next / mode / init），再用「意图上抛」模式把内部按钮和外层列表解耦。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Howler.js 歌单切换、播放模式事件透传与自动播放状态继承

## 概述

这一节播放器正式和外层歌单联动。第一步不是写切歌逻辑，而是先把组件会向外抛的事件定义清楚（`preview` / `next` / `mode` / `init`），再用「意图上抛」模式把内部按钮和外层列表解耦。外层只维护 `current` 和 `mode` 两个最小状态，`watch(current)` 统一同步新的 `src` 和标题。

切歌不只是换 `src`：还要重置进度、重建实例，并用 `oldIsPlay` 继承切歌前的真实播放状态来决定是否续播。这一节把歌单交互的通路打通，真正的播放模式策略留到下一节扩展。

## 学习目标

- 用 `AudioPlayerEvents` 显式类型化播放器对外事件边界
- 用 `emit("preview"/"next"/"mode")` 把切歌意图抛给父组件，而非内部直接改歌单
- 理解外层歌单联动只需 `current` 和 `mode` 两个最小状态单元
- 用 `watch(current, { immediate })` 集中收口切歌副作用，同步 `src` 与标题
- 切歌时重置进度，避免残留上一首歌的播放位置
- 用 `oldIsPlay` 继承真实播放状态，`props.options` 变化时按固定顺序重建实例

---

## 一、先做事件边界，再做切歌逻辑

播放器一旦开始和外层歌单交互，就不再是内部自闭环组件。课程先把会抛给外层的事件整理成明确类型：

```ts
export type AudioPlayerEvents = {
  preview: []
  next: []
  mode: [index: number]
  init: [instance: unknown]
}

const emit = defineEmits<AudioPlayerEvents>()
```

`preview` 和 `next` 是无参事件，`mode` 和 `init` 带有有效载荷（模式索引、实例）。一旦组件有对外交互，就要尽量把事件边界显式类型化；这一步做完，后面父组件接歌单逻辑会清晰很多。

## 二、内部按钮表达意图，不碰外层歌单

播放器内部只表达「用户点了上一曲 / 下一曲 / 模式切换」，真正决定切哪一首由父组件基于歌单和当前索引处理。这是一种典型意图上抛：

```ts
function handleChange(name: "preview" | "next") {
  if (name === "preview") emit("preview")
  else emit("next")
}

function handleLoopChange() {
  loop.value++
  if (loop.value >= 4) loop.value = 0
  emit("mode", loop.value)
}
```

好处是播放器内部不需要知道完整歌单结构，父组件可以自由决定边界行为，后续歌单来源变化播放器本身也不用改。`mode` 事件传的是模式索引，父组件据此决定后续播放策略。

## 三、外层歌单联动只需 current 和 mode

回到外层页面，课程先准备两个最基础响应式状态：`current` 和 `mode`。这两个状态几乎支撑整个联动主干——`current` 决定当前播哪首，`mode` 决定下一次切歌遵循什么策略。

这一节先实现最普通的列表模式：上一曲索引减一、到头停在 `0`；下一曲索引加一、到尾停在最后一首。虽然还不是完整的随机 / 单曲循环 / 列表循环策略，但已搭起外层歌单切换骨架。

```ts
const current = ref(0)
const mode = ref(0)

function handleNext() {
  if (mode.value === 0) {
    current.value = current.value >= list.value.length - 1
      ? list.value.length - 1
      : current.value + 1
  }
}
```

先把普通模式走通再扩展其他播放模式是更稳的顺序；边界裁剪依然不能少，尤其是歌单头尾位置。

## 四、用 watch(current) 收口切歌副作用

课程没有把所有切歌逻辑写在按钮点击函数里，而是把「索引变化后的副作用」统一交给 `watch(current)`。只要 `current` 变了——无论因点按钮、自动播放、模式策略还是外部操作——副作用都只执行一遍。这一节副作用主要是更新 `options.src` 和更新 `title`，并加 `immediate: true` 让首屏就加载第一首歌。

```ts
watch(current, (newValue) => {
  const item = list.value[newValue]
  if (!item) return
  options.value.src = [item.src]
  title.value = item.title
}, { immediate: true })
```

切歌后的副作用要集中收口，不要散落在每个按钮方法里；标题和 `src` 是同一份「当前歌曲状态」的两个投影，应该一起更新。

## 五、切歌必须重置进度

接上外层歌单后马上发现一个典型问题：歌曲切换了，但播放器显示的进度还停留在上一首歌的位置。原因是当前资源已换，但 `state.progress`、进度条百分比、当前时间显示还没归零。

```ts
function handleChange(name: "preview" | "next") {
  if (name === "preview") emit("preview")
  else emit("next")
  state.progress = 0
}
```

切歌重置进度是 UI 层必要动作，不是可选优化；如果进度条是独立组件，也要确保传给它的百分比会同步归零。这一步能显著减少「切歌后界面状态错乱」的问题。

## 六、用 oldIsPlay 继承真实播放状态

切歌后到底要不要自动播放？如果直接把 `autoplay` 写死成 `true`，首次初始化会误播，用户暂停状态切歌也会被强行播起来，都不符合习惯。课程采用更成熟的方案：切歌前先记录 `state.isPlay` 存成 `oldIsPlay`，重新初始化完成后若 `oldIsPlay` 为 `true` 再 `play()`，最后把 `oldIsPlay` 重置回 `false`。

```ts
const state = reactive({ isPlay: false, oldIsPlay: false })

watch(() => props.options, (newOptions) => {
  state.oldIsPlay = state.isPlay
  audioInstance.value?.unload()
  initAudio(newOptions)
}, { deep: true })

function initAudio(options?: AudioPlayerOptions) {
  audioInstance.value = new Howl({
    ...options,
    onload() {
      if (state.oldIsPlay) {
        audioInstance.value?.play()
        state.oldIsPlay = false
      }
    },
  })
}
```

这里继承的是真实播放状态而非单纯看配置项；`oldIsPlay` 用完要及时清回去，否则后面逻辑会串。这比硬开 `autoplay` 稳得多。

## 七、options 变化时的实例重建顺序

`props.options` 变了，当前 `Howl` 实例必须重建。课程延续一贯思路：`watch(props.options, { deep: true })` 触发后卸载旧实例、用新配置重新初始化。但音频播放器多了特有要求：切歌前播放状态要保留、切歌后进度归零、标题和时长重新同步。

完整顺序应理解为：记录旧播放状态 → 重置必要 UI 状态 → 卸载旧实例 → 用新 `options` 初始化 → 根据旧状态决定是否续播。这也是音频播放器从「单首播放」走向「歌单播放」的关键一步。

```ts
watch(() => props.options, (newOptions) => {
  state.oldIsPlay = state.isPlay
  state.progress = 0
  if (audioInstance.value) audioInstance.value.unload()
  initAudio(newOptions)
}, { deep: true })
```

`options` 变化后的重建流程最好收敛成固定顺序；对实例型组件来说，「重建前记录状态」是非常重要的步骤。这一节已打通歌单切歌底层能力，后续播放模式策略就能接在这条链路上扩展。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 切歌按钮为何不直接在内部改 `src` | 组件不应掌握完整歌单和切歌策略 | 用 `emit("preview") / emit("next")` 把意图抛给父组件 |
| 切歌后标题不更新 | 只改了 `src` 没同步元信息 | 在 `watch(current)` 里同时更新 `src` 和 `title` |
| 切歌后进度条停在上首位置 | 没把 `state.progress` 归零 | 在切歌和重建逻辑里显式重置进度 |
| 切歌后总是自动播放 | 用了固定 `autoplay` 没考虑真实状态 | 改成记录 `state.oldIsPlay`，重建后按旧状态续播 |
| 用户传的 `onload` / `onplay` 不执行 | 被组件内部回调覆盖 | 先缓存默认回调再在包装回调里继续执行 |
| 多个播放器互相影响 | 用了全局销毁或无边界全局状态 | 组件内坚持实例级 `unload()` 和受控事件透传 |
| 父组件拿到实例没方法提示 | 只做了 `defineExpose()` 没导出类型 | 补导出 `AudioPlayerMethods`，父层用 `ref<AudioPlayerMethods>()` |

## 延伸阅读

- 上一篇：[Howler.js 实例方法透传、回调兼容与外层列表联动前置](08-Howler.js实例方法透传、回调兼容与外层列表联动前置.md)
- 下一篇：[Howler.js 播放模式策略、随机歌单回退与单曲循环实例控制](10-Howler.js播放模式策略、随机歌单回退与单曲循环实例控制.md)
- 相关：[Howler.js 进度条反控、音量联动与 15 秒快进快退、倍速切换](07-Howler.js进度条反控、音量联动与15秒快进快退、倍速切换.md)
- 参考：[Vue `defineEmits()` 文档](https://cn.vuejs.org/api/sfc-script-setup.html#defineprops-defineemits)、[Vue `watch()` 文档](https://cn.vuejs.org/guide/essentials/watchers.html)
