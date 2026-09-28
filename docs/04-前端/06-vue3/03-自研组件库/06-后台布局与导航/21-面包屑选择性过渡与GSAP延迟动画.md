---
title: 面包屑选择性过渡与GSAP延迟动画
description: "这一节把面包屑动画从“整段容器替换”推进到“逐项列表动画”。核心不是接入某个动画库，而是判断动画对象已经从单个容器变成了当前路由链路生成的一组列表项，从而改用 TransitionGroup；再通过观察“同级切换时最后一项等待过久”的体验问题，引出“选择性延迟”——根据本次路由切换到底改动了几项面包屑来动态调整节奏。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 面包屑选择性过渡与 GSAP 延迟动画

## 概述

这一节把面包屑动画从“整段容器替换”推进到“逐项列表动画”。核心不是接入某个动画库，而是判断动画对象已经从单个容器变成了当前路由链路生成的一组列表项，从而改用 `TransitionGroup`；再通过观察“同级切换时最后一项等待过久”的体验问题，引出“选择性延迟”——根据本次路由切换到底改动了几项面包屑来动态调整节奏。GSAP 在这里只是实现手段，纯 CSS 的 `TransitionGroup` 同样可用。

## 学习目标

- 判断何时从 `transition` 切换到 `TransitionGroup`：动画目标是列表项而非互斥容器。
- 用 `:css="false"` 让 JS 钩子（`@enter` / `@leave`）完整接管动画，并正确调用 `done`。
- 用 `gsap.fromTo()` 同时声明初始状态和最终状态，实现列表项从右滑入。
- 通过 `data-index` 给每项独立 delay，再用 `watch(newVal, oldVal)` 统计变化项数实现选择性延迟。
- 理解 GSAP 与纯 CSS 方案的取舍：精细节奏控制用 GSAP，基础滑入用 CSS 足矣。

---

## 一、逐项动画应切换到 `TransitionGroup`

前一节的面包屑更接近“整段区域整体替换”，单个 `transition` 就够了。这一节要做的是面包屑项逐个滑入、跨层级切换时多项按顺序延迟出现，动画对象已从“单个容器”变成“一组列表项”，更适合用 `TransitionGroup`——它专门处理列表项插入、移除与位置变化。

```vue
<TransitionGroup tag="div" name="breadcrumb-list">
  <el-breadcrumb-item
    v-for="item in breadcrumbs"
    :key="item.name || item.path"
  >
    {{ item.title }}
  </el-breadcrumb-item>
</TransitionGroup>
```

所有子项都必须有稳定 `key`，否则动画顺序和 DOM 复用都会出问题。此时面包屑可被看作“当前路由链路生成的一组列表项”。

## 二、用 GSAP 接管时记得 `:css="false"`

一旦打算用 JavaScript 钩子手动控制动画，就要明确告诉 Vue“这次动画不交给 CSS class 自动完成”。`<TransitionGroup>` 需要加 `:css="false"`，否则 Vue 仍会尝试等待 CSS 过渡结束，容易出现时机判断混乱。

```vue
<TransitionGroup
  tag="div"
  :css="false"
  @enter="onEnter"
  @leave="onLeave"
>
```

`@enter`、`@leave` 最终都要调用 `done`，否则过渡状态可能无法正确结束。

## 三、`gsap.fromTo()` 明确两端状态，适合列表项滑入

面包屑项进入时，初始状态不是当前状态，而是从右侧偏移、透明度为 0 开始，再过渡到正常位置、透明度为 1。`fromTo()` 把两端都写清楚，比 `to()` 更省去提前设初始状态的麻烦。

```ts
function onEnter(el: Element, done: () => void) {
  gsap.fromTo(
    el,
    { opacity: 0, x: 30 },
    {
      opacity: 1,
      x: 0,
      duration: 0.35,
      ease: "power2.out",
      onComplete: done
    }
  )
}
```

`fromVars` 放初始状态，`toVars` 放最终状态和 `duration`、`delay`、`ease`、`onComplete` 等。这节课核心是 X 轴位移，重点参数通常是 `x` 和 `opacity`。

## 四、`data-index` 让每项拥有独立延迟节奏

给每个列表项挂 `data-index`，在 JS 钩子里读取索引再转成不同 `delay`，动画就不再是“所有面包屑一起出现”，而是第一项先出现、第二项稍晚、第三项再稍晚，让导航链路呈现更清晰。

```ts
const delay = Number((el as HTMLElement).dataset.index ?? 0) * 0.15
```

`dataset` 读出来的是字符串，最好转成数字后再参与计算。`0.15` 秒间隔适合后台系统，节奏清楚但不拖沓。若面包屑层级太深、完全按索引累加 delay，后面的项会慢得明显，这也是后续要优化的点。

## 五、同级切换最后一项延迟过久：选择性延迟的核心

一个典型问题：从首页切到复杂表格时多级面包屑依次进入，效果很好；但在同一菜单层级里来回切换时，最后一项仍按它的绝对索引延迟，体感上就会“出来太慢”。例如 `基础表格 → 高级表格` 只改了最后一项，若仍按 `2 * 0.15` 延迟，用户会觉得这一项慢半拍。

真正需要控制的是“这次路由切换到底改动了几项面包屑”，而不是“它排第几个”。动画节奏要服从变化范围，不能机械服从列表索引。

## 六、用 `watch(newVal, oldVal)` + `Math.max` 统计变化项数

监听面包屑数组变化，拿到前后两组链路，统计本次变了多少项。之所以循环到 `Math.max(newVal.length, oldVal.length)`，是因为无法预设用户是从一级切到三级，还是从三级退回一级，前后数组长度不同是常态。

```ts
watch(
  () => breadcrumbs.value,
  (newVal, oldVal = []) => {
    let changed = 0
    const max = Math.max(newVal.length, oldVal.length)
    for (let i = 0; i < max; i++) {
      const next = newVal[i]
      const prev = oldVal[i]
      if (!next || !prev || next.name !== prev.name) changed++
    }
    change.value = changed
  },
  { deep: true }
)
```

要考虑数组越界场景，不能默认 `newVal[i]` 和 `oldVal[i]` 一定存在；核心目标不是做 diff 算法，而是快速判断“动画应该慢一点还是快一点”。

## 七、`change === 1` 时压缩 delay

核心策略：默认延迟仍按 `dataset.index` 算，但如果这次只变化了一项面包屑，就不要让最后一项按大索引等待太久。

```ts
function resolveDelayIndex(el: HTMLElement) {
  let index = Number(el.dataset.index ?? 0)
  if (change.value === 1) index = 1
  return index
}
```

这不是说真实索引变成了 1，而是对动画 delay 来说把它当作“只需要一个很短延迟的项”。这是一种体验优先的近似策略，目的是让同级切换更快出现。更复杂的规则可升级成按“第一个变化位置”计算 delay，而非只看变化项数量。

## 八、GSAP 非唯一解，纯 CSS 方案已足够

如果只想基础滑入滑出，前面那套纯 CSS 的 `TransitionGroup` 方案完全可以：维护成本更低、依赖更少。GSAP 的真正优势是更容易做精细节奏控制、延迟、时间轴与复杂组合。工程取舍是：要的只是基础过渡就用 CSS；要做“按变化层级控制 delay”这类细节就上 GSAP。动画方案要服从项目复杂度，不是库越多越高级。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `TransitionGroup` 钩子写了但动画不稳定 | 仍让 Vue 等待 CSS 过渡，同时又用 JS 控制 GSAP | 加 `:css="false"`，明确由 JS 接管 |
| 面包屑项没有依次进入效果 | 没给每项提供 `data-index`，所有项用同一延迟 | 给每项绑定 `:data-index="index"` |
| 同级切换最后一项出来太慢 | 直接把绝对索引当 delay 权重 | 监听前后变化，只变一项时压缩 delay |
| 从三级退回一级时逻辑异常 | 比较前后数组没处理长度不一致和越界 | 用 `Math.max` 长度并对越界判空 |
| 不想引入 GSAP 依赖 | 需求只是基础滑入滑出 | 回退到纯 CSS 的 `TransitionGroup` 方案 |

## 延伸阅读

- 上一篇：[20-菜单高亮持久化、面包屑过渡与KeepAlive页面缓存](20-菜单高亮持久化、面包屑过渡与KeepAlive页面缓存.md)
- 下一篇：[22-菜单激活态恢复与主题色CSS变量联动](22-菜单激活态恢复与主题色CSS变量联动.md)
- 相关：[Vue TransitionGroup 文档](https://cn.vuejs.org/guide/built-ins/transition-group.html)
- 相关：[GSAP fromTo 文档](https://gsap.com/docs/v3/GSAP/gsap.fromTo%28%29/)
