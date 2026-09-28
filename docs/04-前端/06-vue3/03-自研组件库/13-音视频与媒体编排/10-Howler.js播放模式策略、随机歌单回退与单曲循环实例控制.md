---
title: Howler.js播放模式策略、随机歌单回退与单曲循环实例控制
description: "关键纠偏有两点：随机模式一旦要支持上一曲，就必须引入历史索引栈，不能只写 `Math.random()`；单曲循环不应通过改 `options.loop` 触发实例重建，而应直接调用当前实例的 `loop()` 方法。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Howler.js 播放模式策略、随机歌单回退与单曲循环实例控制

## 概述

上一节只把播放模式索引透传出去，还只是 UI 状态。这一节把模式真正接到歌单切换策略上：普通列表、列表循环、随机、单曲循环四种模式，会让同一个上一曲/下一曲按钮执行不同算法。

关键纠偏有两点：随机模式一旦要支持上一曲，就必须引入历史索引栈，不能只写 `Math.random()`；单曲循环不应通过改 `options.loop` 触发实例重建，而应直接调用当前实例的 `loop()` 方法。此外，`oldLoop` 延续了 `oldIsPlay` / `oldVolume` 那套「切模式前保存旧状态」的统一思路。

## 学习目标

- 理解播放模式是「控制控制器」的状态，会改变切歌算法而非只是图标
- 用取余与边界判断实现列表循环的头尾回绕
- 用历史索引栈 `oldIndex` 支持随机模式的上一曲回退，并处理栈边界
- 把随机新索引生成抽成 `getRandomIndex()` 函数，统一「不等于当前值」约束
- 用实例 `loop()` 实现单曲循环，避免重建实例导致从头播放
- 用 `oldLoop` 在进入/退出单曲循环时保存与恢复原始 loop 状态

---

## 一、播放模式改变的是切歌策略

前面虽然把模式索引透传出去了，但那只是 UI 状态。这一节要解决的四种策略是：普通列表怎么切、列表循环怎么切、随机怎么切、单曲循环到底影响什么。也就是说，模式按钮的本质不是切一个图标，而是切换「下一次上一曲/下一曲操作应采用的策略」。这和集合量、倍率这类单点控制不同，播放模式本质上是一个「控制控制器」的状态。

```
模式索引：
  0 -> 普通列表
  1 -> 列表循环
  2 -> 单曲循环
  3 -> 随机播放
```

播放模式不是 UI 装饰，它会改变歌单切换算法；真正的播放模式逻辑通常集中在外层列表，而不是只写在播放器内部。单曲循环和上一曲/下一曲不是同一层级的问题，后面要单独处理。

## 二、列表循环只在边界处与普通列表不同

列表循环模式与普通列表最接近，差别不是「整体逻辑完全不同」，而只是边界行为：普通列表到头或到尾就停住；列表循环到尾后下一曲回到第一首，到头后上一曲回到最后一首。所以核心是把边界判定写准确。

下一曲用取余数很自然：`(current + 1) % list.length`；上一曲因为会出现负数，课程用了更直接的条件判断：小于 `0` 时回到 `list.length - 1`。

```ts
function handleNext() {
  if (mode.value === 1) {
    current.value = (current.value + 1) % list.value.length
  }
}

function handlePreview() {
  if (mode.value === 1) {
    current.value = current.value - 1 < 0
      ? list.value.length - 1
      : current.value - 1
  }
}
```

列表循环的核心是头尾闭环，不是复杂分支数量；这一层逻辑写在外层歌单页更合适，因为它依赖完整列表长度。

## 三、随机播放需要历史索引栈

很多同学做随机模式时只会想到 `Math.random()`，但课程指出关键问题：随机「下一首」好做，随机模式下的「上一首」怎么办？如果没有历史记录，点上一曲时根本不知道上一首随机到的是谁。所以引入 `oldIndex`——本质上是一个栈，用来记录随机播放路径。

每次随机下一首前，把当前索引压栈；点上一曲时，从栈里弹出之前的索引。这说明随机播放不是「无状态随机」，而是「带历史记忆的随机导航」。

```ts
const oldIndex = ref<number[]>([])

function pushHistory() {
  oldIndex.value.push(current.value)
}
```

随机播放如果没有历史栈，上一曲体验会非常奇怪；这里的历史栈记录的是「走过的随机路径」，不是全量歌单顺序；`oldIndex` 最好显式标成 `number[]`，否则后面 `push/pop` 会有类型问题。

## 四、随机上一曲的边界处理

随机模式上花最多时间不是因为随机数难，而是「回退历史」容易写 bug。两个典型问题：栈里最后一个值刚好等于当前值；栈已经空了再点上一曲怎么办。第一个会导致点上一曲还是当前这一首，相当于要点两次才有反应；第二个意味着没有历史可退，应该重新随机一个新值。

最终处理思路：先 `pop()` 一个临时值 `temp`；如果 `temp === current` 且栈里还有值，继续 `pop()`；如果栈已空，重新随机；如果 `temp !== current`，直接拿 `temp` 作为当前值。这是典型的「历史导航 + 边界兜底」写法。

```ts
function handleRandomPreview() {
  const temp = oldIndex.value.pop()

  if (typeof temp === "number" && temp !== current.value) {
    current.value = temp
    return
  }

  if (typeof temp === "number" && oldIndex.value.length > 0) {
    current.value = oldIndex.value.pop() ?? 0
    return
  }

  current.value = getRandomIndex(current.value, list.value.length)
}
```

`pop()` 返回值可能是 `undefined`，TypeScript 里要特别处理；「上一曲回退无效」通常不是随机数问题，而是历史栈边界没处理好。

## 五、抽成 getRandomIndex 统一随机策略

随机取新索引的逻辑被写了好几次：随机下一曲要用、栈空兜底要用、某些场景还要再用。继续复制粘贴后续一定会越改越乱，所以抽成独立函数：传入当前索引和列表长度，持续随机直到新值不同于当前值。

```ts
function getRandomIndex(current: number, length: number) {
  let number = current
  do {
    number = Math.floor(Math.random() * length)
  } while (number === current)
  return number
}
```

抽函数最大的价值不是少几行，而是统一随机策略；该函数默认假设列表长度大于 `1`，单曲列表场景还需额外兜底；随机函数一旦固定，所有模式分支都应复用它。

## 六、单曲循环用实例 loop 而非重建配置

课程一开始尝试通过改 `options.value.loop` 实现单曲循环，但马上发现问题：`options` 一改，整个实例重建，当前音乐又从头开始播放，不符合预期。正确方式是直接调用当前实例的 `loop(true | false)`。单曲循环应被视为「实例运行状态切换」，而不是「配置重建」。

```ts
const oldLoop = ref(false)

function handleMode(index: number) {
  mode.value = index

  if (index === 2) {
    oldLoop.value = options.value.loop ?? false
    audioRef.value?.loop(true)
  } else {
    audioRef.value?.loop(oldLoop.value)
  }
}
```

单曲循环是实例行为，不该通过重建配置实现；一旦切回其他模式，还要考虑恢复用户之前的 `loop` 配置。

## 七、oldLoop 延续「切模式前保存旧状态」思路

`oldIsPlay`、`oldVolume`、`oldLoop` 本质是同一件事：临时切到某种特殊状态前先记住原状态，等退出时再恢复。很多交互都不是「永久改值」，而是「临时切换到某个模式」。单曲循环正是这种场景：进入前先记住原来的 `loop`，离开时再恢复，用户的原始配置就不会被无意覆盖。

这类 `oldXxx` 状态要在进入模式前记录，而不是退出时才补救；临时模式切换和永久配置修改要严格区分。课程到这里已经形成一套比较统一的状态继承思路，非常值得复用。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 列表循环和普通列表逻辑差不多为何分开 | 两者边界行为不同，普通停住、循环回绕 | 把边界分支明确写清楚，不混在一起 |
| 随机模式只会随机下一首，上一曲无法回退 | 没记录随机历史路径 | 增加 `oldIndex` 栈，随机下一首前先推入当前索引 |
| 随机上一曲需点两次才有效 | 栈顶元素和当前值重复，pop 出来没变化 | 检查 `temp === current`，继续弹出或重新随机 |
| 随机切到下一首后卡住不动 | 新随机值和当前值相同 | 用 `do...while` 保证随机值不等于当前值 |
| 单曲循环一切换整首从头开始 | 改 `options.loop` 触发了实例重建 | 直接调用实例方法 `audioRef.value?.loop(true)` |
| 离开单曲循环后原 loop 状态丢了 | 没记录切模式前的旧状态 | 增加 `oldLoop`，进入模式前先缓存 |
| 模式图标切了行为没变 | 只改 UI 索引没把模式接进 `handleNext/handlePreview` | 让所有切歌入口都基于 `mode.value` 选择策略 |

## 延伸阅读

- 上一篇：[Howler.js 歌单切换、播放模式事件透传与自动播放状态继承](09-Howler.js歌单切换、播放模式事件透传与自动播放状态继承.md)
- 下一篇：[Howler.js 播放模式调试收尾、状态修复与控制栏显隐设计](11-Howler.js播放模式调试收尾、状态修复与控制栏显隐设计.md)
- 相关：[Howler.js 实例方法透传、回调兼容与外层列表联动前置](08-Howler.js实例方法透传、回调兼容与外层列表联动前置.md)
- 参考：[Howler.js README](https://github.com/goldfire/howler.js/blob/master/README.md)、[MDN `Math.random()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Math/random)、[MDN `Array.prototype.pop()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/pop)
