---
title: 滚动文本指令设计、requestAnimationFrame驱动与音频标题扩展
description: "课程把功能做成自定义指令 `v-scroll-text`，用 `requestAnimationFrame()` 驱动 `scrollLeft` 而非纯 CSS 平移，先算 `maxScrollLeft` 判断是否需要滚动，再用「方向变量 + 起始时间重置」的状态机实现到边界后反向滚动。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 滚动文本指令设计、requestAnimationFrame 驱动与音频标题扩展

## 概述

这一节是播放器的体验增强扩展节，目标是解决长标题滚动这种高频场景：歌名很长、单行放不下，又希望用户看到完整内容。它不只服务于歌单标题，也能用于歌词、公告、跑马灯文本，最终应沉淀成一个可复用能力而非临时代码。

课程把功能做成自定义指令 `v-scroll-text`，用 `requestAnimationFrame()` 驱动 `scrollLeft` 而非纯 CSS 平移，先算 `maxScrollLeft` 判断是否需要滚动，再用「方向变量 + 起始时间重置」的状态机实现到边界后反向滚动。

## 学习目标

- 理解长标题滚动为何适合做成自定义指令而非硬编码在组件里
- 区分 `scrollLeft` 与 `translateX`：前者推动容器内部内容滚动，后者平移整个元素
- 用 `scrollWidth - clientWidth` 算出 `maxScrollLeft`，仅在溢出时启用滚动
- 用 `requestAnimationFrame()` 时间戳驱动滚动，比 `setInterval()` 更贴合浏览器绘制节奏
- 用 `direction` + 重置 `start` 的状态机实现到边界反向滚动
- 预留后续扩展空间：悬停暂停、触摸暂停、边界停顿、单向滚动

---

## 一、这是体验增强，也是可复用能力

本节目标不是继续补音频实例方法，而是提升视觉体验。场景很典型：歌曲标题很长、单行区域放不下、用户又希望看到完整内容。很多音频播放器里标题会自动左右滚动。课程把它抽成可复用能力，而不只是给当前播放器写一段临时逻辑。

这类能力价值在于：不仅能用在歌单标题，也能用在歌词、公告、跑马灯文本，甚至后续独立成通用指令或小组件。这一节已经明显从「做出播放器」转向「优化播放器细节体验」。

## 二、为什么做成自定义指令

课程专门讨论了设计取舍：直接写在组件里一坨逻辑，还是做成指令。结论偏向指令，原因有几个：这个功能本质上直接操作 DOM 的滚动行为；指令天然拿得到真实元素；指令也有对应生命周期钩子；想用时加上、移除时拿掉，非常轻量。它适合「增强某个现有 DOM 元素行为」的场景。

```ts
const scrollText: Directive = {
  mounted(el) {
    // 初始化滚动逻辑
  },
}
```

```vue
<div v-scroll-text>
  很长很长的歌曲标题...
</div>
```

指令适合增强现有元素行为，不适合承载复杂业务状态；这里用指令的核心原因是它比组件更接近 DOM。课程也提醒了副作用：DOM 动画太多会影响性能，不能滥用。

## 三、用 scrollLeft 而非 CSS translateX

直觉上很多人会想到 `animation` + `transform: translateX(...)`，但这个思路有问题：很难根据真实文本宽度和容器宽度动态计算终点；窗口尺寸变化后动画位移量还得重算；`translateX` 平移的是整个元素，而非真实内部滚动位置。

课程想实现的是：文本在容器内部真实滚动、超出部分隐藏、滚到末尾停一下再反向滚动。更自然的做法是控制 `scrollLeft`，而不是元素自身位移。

```
CSS translateX: 更像“平移元素”
scrollLeft:     更像“推动容器内部内容滚动”
```

这里要操作的是滚动条位置而非元素坐标；当需求涉及真实内容宽度、容器宽度和反向滚动时，纯 CSS 往往不够灵活。课程选择 JS 驱动，是因为交互细节已超出纯样式动画的舒适区。

## 四、先算 maxScrollLeft 决定是否滚动

真正写逻辑时第一步不是上动画，而是先算一个关键值：`maxScrollLeft = el.scrollWidth - el.clientWidth`。这个值决定两件事：文本最多能滚多远、这个元素到底需不需要滚动。如果它小于等于 `0`，说明内容没超出容器，根本不该启用滚动。

```ts
function getMaxScrollLeft(el: HTMLElement) {
  return el.scrollWidth - el.clientWidth
}
```

先算滚动范围再谈动画，是这类功能最基本的顺序；内容没溢出就不滚动本身就是一个重要体验细节；后续窗口宽度变化时这个值也要重新计算。

## 五、用 requestAnimationFrame 时间戳驱动

课程没有选 `setInterval()`，而是改用 `requestAnimationFrame()`。对视觉动画来说，它的优势是更贴近浏览器刷新节奏、暂停和恢复控制更自然、时间戳参数天生适合做进度计算。课程进一步引入 `start` / `duration` / `rate` / `progress`，完成「滚动距离 = 时间进度 × 速度」的计算——已不是每次固定加像素，而是更稳定的时间驱动模型。

```ts
let start = 0
const duration = 10000

function step(timestamp: number) {
  if (!start) start = timestamp
  const progress = timestamp - start
  requestAnimationFrame(step)
}

requestAnimationFrame(step)
```

`requestAnimationFrame()` 的回调自动带时间戳参数；时间戳比「每次固定加 1 像素」更适合做平滑动画。

## 六、方向切换与起始时间重置绑定

最有代表性的实现细节是「滚动到尽头后反向滚动」。核心思路是用 `direction` 变量表示当前方向：正向用 `progress * rate`，反向用 `(duration - progress) * rate`；滚到头时切换 `direction`，同时把 `start` 重置为 `0`。

关键点不只是反向滚动，而是方向切换后时间进度也要重新开始算，否则后续 `progress` 会延续上一段时间导致公式立刻失效。所以「切方向」和「重置 start」必须绑定处理。

```ts
let start = 0
let direction = true

function step(timestamp: number) {
  if (!start) start = timestamp

  const progress = timestamp - start
  const currentScroll = (direction ? progress : duration - progress) * rate

  el.scrollLeft = currentScroll

  if (currentScroll >= maxScrollLeft || currentScroll <= 0) {
    direction = !direction
    start = 0
  }

  requestAnimationFrame(step)
}
```

方向切换和起始时间重置必须一起做；这里实际上已是一个小型状态机而非简单动画；若后续要补「停顿几秒再反向」，可在这个状态机里再加等待状态。

## 七、基础版已成型，预留扩展空间

课程前半段已做出基础版本：单行显示、超出隐藏、自动滚动、正反向切换。但开头还描述了更多细节能力：鼠标悬停暂停、移动端按住暂停、到头停顿、是否反向滚动、不溢出就不滚。这说明本节是在搭一个「可继续扩展」的基础模型。指令方案好用，正因为这些后续参数都可通过 `binding.value` 或修饰符继续扩展进去。

```ts
type ScrollTextOptions = {
  duration?: number
  reverse?: boolean
  pauseOnHover?: boolean
}
```

当前这节做的是基础滚动版而非完整成品版；指令一旦成型，后续的标题、歌词、公告场景也能继续复用。最重要的是把基础模型搭对，后面交互细节才有地方挂。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 为何不用纯 CSS 动画做滚动 | 纯 `translateX` 不擅长处理真实滚动宽度、容器变化和往返边界 | 改用 JS 控制 `scrollLeft` |
| 为何有些标题不滚动 | 文本实际没超出容器，`scrollWidth - clientWidth <= 0` | 这是正确行为，只有溢出才滚动 |
| 滚到结尾后不反向 | 没在边界处切换 `direction` 并重置 `start` | 到边界时同时翻转方向并重置起始时间 |
| 文字还是换行 | 样式没设对，尤其 `whiteSpace` | 指令里明确设置 `overflow: hidden` 和 `whiteSpace: nowrap` |
| 为何不用组件做 | 操作核心是现有 DOM 的滚动行为，指令更轻量直接 | 用自定义指令挂在目标元素上更合适 |
| 功能是否影响性能 | 大量 DOM 动画确实影响性能 | 只在必要元素上使用，别把整页都做成滚动 |

## 延伸阅读

- 上一篇：[Howler.js 控制栏显隐配置、移动端适配与 useAudioPlayer 逻辑抽离](12-Howler.js控制栏显隐配置、移动端适配与useAudioPlayer逻辑抽离.md)
- 下一篇：[滚动文本指令延迟控制、暂停恢复与状态重置](14-滚动文本指令延迟控制、暂停恢复与状态重置.md)
- 相关：[Howler.js 实例初始化、播放进度同步与时间格式化](06-Howler.js实例初始化、播放进度同步与时间格式化.md)
- 参考：[Vue 自定义指令指南](https://cn.vuejs.org/guide/reusability/custom-directives.html)、[MDN `requestAnimationFrame`](https://developer.mozilla.org/zh-CN/docs/Web/API/Window/requestAnimationFrame)、[MDN `scrollLeft`](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/scrollLeft)
