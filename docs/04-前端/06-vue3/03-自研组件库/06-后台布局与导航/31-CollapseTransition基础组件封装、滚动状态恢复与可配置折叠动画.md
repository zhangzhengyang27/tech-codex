---
title: CollapseTransition基础组件封装、滚动状态恢复与可配置折叠动画
description: "组件基于 Vue 的 <Transition> 与 JavaScript 钩子实现，完整管理 height、padding、overflow 三类状态的接力，并通过 dataset 缓存旧值以便动画结束后恢复。"
keywords: [CollapseTransition基础组件封装、滚动状态恢复与可配置折叠动画]
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# CollapseTransition 基础组件封装、滚动状态恢复与可配置折叠动画

## 概述

前面章节零散写过折叠展开过渡，本章把它收口成一个可复用的基础组件 `CollapseTransition`。这一步的核心价值不是"少写几行代码"，而是把一整套折叠动画状态机沉淀下来：哪些状态在进入前处理、哪些在进入中恢复、哪些在结束后清理，以及如何兼容本身带滚动条和内边距的内容块。

组件基于 Vue 的 `<Transition>` 与 JavaScript 钩子实现，完整管理 `height`、`padding`、`overflow` 三类状态的接力，并通过 `dataset` 缓存旧值以便动画结束后恢复。最后暴露 `duration` 配置项，并用 CSS `v-bind` 与组件 props 联动，让折叠速度可调。

## 学习目标

- 理解把 `<Transition>` 封装成基础组件，沉淀的是"折叠动画行为模型"
- 掌握折叠动画中 `height`、`padding`、`overflow` 三状态在钩子间的完整接力
- 学会用 `dataset` 缓存旧 `overflow`，兼容内部原本就有滚动条的内容块
- 识别 `scrollHeight !== 0` 不能准确判断"是否有滚动条"的误区
- 理解 JS 钩子控制进入/离开态后，CSS 只需保留 `*-active` 过渡规则
- 用 `duration` props + `v-bind` 实现可配置的折叠动画时长
- 了解如何将基础过渡组件接入真实业务面板（图标旋转、schema 渲染）

---

## 一、封装的价值是沉淀动画状态机

`CollapseTransition` 不是简单包一层 `<Transition>`，而是把"展开 / 收起"这套交互动效抽象成统一能力。它适合在项目里出现多次、且边界复杂的交互动效场景——折叠面板、筛选区域收起、描述区展开都能直接复用。

```vue
<template>
  <CollapseTransition>
    <section v-show="expanded" class="panel-body">
      <slot />
    </section>
  </CollapseTransition>
</template>
```

基础组件封装的是"行为模型"，不是单纯的样式片段。边界清晰、复用价值高的动效才值得抽成基础组件。

## 二、折叠动画的关键是三状态完整接力

折叠动画容易出问题，是因为它不是单变量动画，至少涉及三类状态：`height`、上下内边距 `padding-top / padding-bottom`、溢出行为 `overflow`。只改 `height` 会导致展开时内容突兀跳出、折叠时 padding 残留、内部滚动条提前出现。

```ts
function beforeEnter(el: HTMLElement) {
  el.dataset.oldPaddingTop = el.style.paddingTop
  el.dataset.oldPaddingBottom = el.style.paddingBottom
  el.style.height = "0"
  el.style.paddingTop = "0"
  el.style.paddingBottom = "0"
}

function enter(el: HTMLElement) {
  el.style.height = `${el.scrollHeight}px`
  el.style.paddingTop = el.dataset.oldPaddingTop || ""
  el.style.paddingBottom = el.dataset.oldPaddingBottom || ""
  el.style.overflow = "hidden"
}

function afterEnter(el: HTMLElement) {
  el.style.height = ""
  el.style.overflow = el.dataset.oldOverflow || ""
}
```

`before-enter` 把元素压到折叠态作为起点，`enter` 读 `scrollHeight` 作为目标高度并恢复内边距，`after-enter` 清空高度让元素回到自然高度。进入和离开两个阶段都需要有最终的"清理"动作，否则内联样式会污染后续布局。

## 三、兼容内部滚动条：先缓存旧 overflow 再恢复

给内容块固定高度并加 `overflow-y: auto` 后，内部会出现滚动条。如果折叠动画没处理好 `overflow`，会出现滚动条闪烁、展开后滚动条丢失、折叠后状态恢复不正确等问题。

```ts
function enter(el: HTMLElement) {
  el.dataset.oldOverflow = el.style.overflow
  el.style.height = `${el.scrollHeight}px`
  el.style.overflow = "hidden"
}

function afterEnter(el: HTMLElement) {
  el.style.height = ""
  el.style.overflow = el.dataset.oldOverflow || ""
}
```

做法是：进入或离开前先缓存旧 `overflow`，动画过程中强制 `overflow: hidden` 避免滚动条干扰视觉，动画结束后恢复原值。`dataset` 只能存字符串，恢复时要做好空值兜底（`|| ""`）。

## 四、scrollHeight !== 0 不能判断"是否有滚动条"

课程口述里用 `el.scrollHeight !== 0` 判断元素内部是否有滚动，这个说法不够严谨。只要有内容，`scrollHeight` 通常就大于 0，它只能说明"元素里有内容"，不能说明"原本是不是内部可滚动容器"。

```ts
const hasInnerScroll = el.scrollHeight > el.clientHeight
el.dataset.oldOverflow = el.style.overflow
```

从工程稳定性看，"先无条件缓存旧 overflow"比"先猜它有没有滚动"更稳。对于这类基础组件，宁可多存一个状态，也不要依赖不精确的推断。

## 五、JS 钩子控制状态后，CSS 只需保留 active 类

当进入态和离开态完全由 JS 钩子手动设置后，CSS 层就不再需要 `enter-from` / `leave-to`，只保留 `enter-active`、`leave-active` 即可。这遵循典型的 Vue 过渡分工：CSS 负责"怎么动"（曲线和时长），JS 钩子负责"从哪里动到哪里"。

```scss
.collapse-transition-enter-active,
.collapse-transition-leave-active {
  transition:
    height 0.3s ease-in-out,
    padding-top 0.3s ease-in-out,
    padding-bottom 0.3s ease-in-out;
  overflow: hidden;
}
```

注意：复用型过渡组件的过渡类样式尽量不要写成 `scoped`，否则可能匹配不到插槽根元素上的过渡类。状态都在 JS 里控制后，CSS 可以大幅简化。

## 六、暴露 duration 配置项实现可调动画

给 `CollapseTransition` 加一个 `duration` 属性（默认 `0.3s`），把"效果可用"升级为"效果可调"：信息密度高的后台页面可以更快，强调展示感的区域可以更慢，不同业务场景不改组件逻辑只调时长。

```ts
const props = withDefaults(
  defineProps<{ duration?: string }>(),
  { duration: "0.3s" }
)
```

如果用 CSS `transition-duration` 驱动动画，`duration` 传字符串比较自然（`0.3s`、`500ms`）。暴露参数要克制，只保留真正有复用价值、会被频繁调整的配置项。

## 七、接入真实业务面板才是封装的终点

基础组件的价值最终体现在能否顺利接到业务 UI 上。用 `CollapseTransition` 实现类似官方 `Collapse` 的折叠面板时，重点不是动画本身，而是把基础动效能力接到真实业务：右侧图标用旋转而非替换图标、中间内容走 schema 封装的 `Descriptions`、内容区还能插 `Tag`、`Link`、图标等业务元素。

```vue
<button class="panel-trigger" @click="expanded = !expanded">
  <span>基础信息</span>
  <IconArrowRight :class="{ 'is-rotated': expanded }" />
</button>

<CollapseTransition>
  <SchemaDescriptions v-show="expanded" :schemas="schemas" />
</CollapseTransition>
```

当基础能力进入业务层后，才会暴露更多可扩展点（插槽、schema、右侧操作区），这才是真正的工程化应用方式。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 展开时内容一下子跳出来，没有平滑动画 | 只改了显示状态，没先把高度压到 `0` | 在 `beforeEnter()` 中先设置 `height: 0` 和 `padding: 0` |
| 展开后内部原有滚动条消失 | 动画过程中覆盖 `overflow` 但结束后未恢复 | 先缓存旧 `overflow`，在 `afterEnter()` / `afterLeave()` 恢复 |
| 内容区有 padding 时折叠不自然 | 只处理了高度，没处理上下内边距 | 把 `padding-top` / `padding-bottom` 一起纳入状态管理 |
| 组件封装后过渡类不生效 | 过渡类样式写成 `scoped`，匹配不到插槽根元素 | 复用型过渡组件的过渡类样式尽量不要写 `scoped` |
| 想调慢动画只能改源码 | 时长写死在 CSS 里 | 暴露 `duration` props，并通过 CSS `v-bind` 绑定 |
| 用 `scrollHeight !== 0` 判断"有滚动条"不准 | 该条件只能说明元素有内容 | 直接缓存旧 `overflow`，或用 `scrollHeight > clientHeight` 判断内部滚动 |

## 延伸阅读

- 上一篇：[30-面包屑响应式恢复、ResizeObserver宽度监听与节流防抖优化](30-面包屑响应式恢复、ResizeObserver宽度监听与节流防抖优化.md)
- 下一篇：[01-登录注册页设计与表单方案](../07-认证与登录流程/01-登录注册页设计与表单方案.md)
- 相关链接：[Vue Transition](https://cn.vuejs.org/guide/built-ins/transition)、[Element Plus 内置过渡动画](https://element-plus.org/zh-CN/guide/transitions.html)、[Element Plus Collapse 折叠面板](https://element-plus.org/zh-CN/component/collapse.html)、[MDN scrollHeight](https://developer.mozilla.org/zh-CN/docs/Web/API/Element/scrollHeight)
