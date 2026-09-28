---
title: Header折叠状态透传与双菜单交互预留
description: "这一节把布局状态透传与交互状态建模两类能力往前推进：collapse 这类布局级状态可以穿过 Header，但不应该沉淀在 Header；同时双菜单摆出来之后，二级菜单不再只是静态区域，而是一个具备 collapsed / pinned 独立行为的导航面板。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Header 折叠状态透传与双菜单交互预留

## 概述

这一节把布局状态透传与交互状态建模两类能力往前推进：`collapse` 这类布局级状态可以穿过 Header，但不应该沉淀在 Header；同时双菜单摆出来之后，二级菜单不再只是静态区域，而是一个具备 `collapsed` / `pinned` 独立行为的导航面板。本节讲清 Header 作为折叠状态中转站的边界、内部折叠触发器的受控写法、左侧边栏的显示判断顺序，以及二级菜单自动折叠与钉住之间的优先级规则。

这一节真正铺垫的是「复杂布局组件的状态归属纪律」：凡是跨越多个层级的布局状态，都必须有明确的所有者，否则每加一个交互就会多出一份状态副本，最终互相打架。

## 学习目标

- 明确 collapse 归布局层所有，Header 只承接并向上抛事件，不自己成为状态源
- 把 Header 内部折叠触发器设计成「受控 prop + 事件」的标准模式
- 先判「左侧区域在不在」再拆一级/二级菜单的细分显示条件
- 把二级菜单的 collapsed 与 pinned 拆成两个独立维度建模
- 理解「用户钉住优先于自动折叠」这类交互优先级控制
- 在状态稳定后把用户偏好纳入持久化，避免刷新后交互重置

---

## 一、collapse 归布局层，Header 只做中转

collapse 虽然要经过 Header 传给内部子组件，但它本质上仍属于布局层状态：DefaultLayout 持有真正的 collapse，Header 接收并透传给需要的子组件，内部触发折叠时再通过事件抛回外层。这和之前的 toggle-collapse 思路一致。

```ts
const props = withDefaults(defineProps<{ collapse?: boolean }>(), {
  collapse: false
})
const emit = defineEmits<{ "toggle-collapse": [] }>()
```

```vue
<HeaderToolbar
  :collapse="props.collapse"
  @toggle-collapse="emit('toggle-collapse')"
/>
```

不要让 Header 一边接收 collapse 一边自己偷偷维护另一份 isCollapsed。这类布局级状态最适合由 DefaultLayout 或更高层统一维护，Header 更像「布局状态中转站」，不是状态拥有者。

## 二、内部折叠触发器是受控组件

Header 里与折叠相关的子组件，既需要拿到 collapse 决定当前图标/样式，又能通过点击影响 collapse。正确职责是：通过 `props.collapse` 渲染当前态，通过点击事件发出「我要切换」的意图——它是受控组件，而不是自己存状态。

```ts
const props = defineProps<{ collapse: boolean }>()
const emit = defineEmits<{ toggle: [] }>()
```

```vue
<button type="button" @click="emit('toggle')">
  {{ props.collapse ? "展开" : "折叠" }}
</button>
```

最自然的形式就是「受控 prop + 事件」。整理时统一表述为「Header 内部折叠触发器」即可，不必保留口述里的语音识别误差命名。

## 三、先判左侧区域在不在，再拆一级/二级菜单

左侧边栏整块区域的显示条件要先单独抽出来：只有 `top` 模式下左侧整体边栏才彻底不显示，其余模式只是内部一级/二级菜单的组合不同。先判「左侧区域在不在」，再判「左侧里显示谁」，模板结构会更清晰。

```ts
const showSidebar = computed(() => settings.navMode !== "top")
const showPrimaryMenu = computed(() =>
  settings.navMode === "sidebar" || settings.navMode === "mixedBar"
)
const showSecondaryMenu = computed(() =>
  settings.navMode === "mixTop" || settings.navMode === "mixedBar"
)
```

## 四、二级菜单的交互状态要拆成两个维度

双菜单显示出来后，下一步重点不只是样式，而是交互状态设计。至少出现两类：`collapsed`（用户点击后二级菜单隐藏）与 `pinned`（用户点击钉住后二级菜单不再自动折叠）。它们是两个不同维度，不要混成一个布尔值——「自动折叠是否生效」本质上取决于 `pinned`，而不是 `collapsed`。

```ts
const secondaryCollapsed = ref(false)
const secondaryPinned = ref(false)
```

先把状态字段设计好，后面做动画和交互才不会推倒重来。

## 五、钉住优先级高于自动折叠

如果用户点了「钉住」，二级菜单不应再自动折叠。这其实是在定义一条交互优先级规则：用户主动钉住 > 自动收起策略。这是后台产品里很常见的设计，不是纯视觉问题，而是状态机规则问题。

```ts
function autoCollapseSecondaryMenu() {
  if (secondaryPinned.value) return
  secondaryCollapsed.value = true
}
```

自动折叠通常只是「默认行为」，用户显式钉住应当拥有更高优先级。没有这条优先级规则，后续交互会非常混乱。

## 六、样式调整在为「导航条 + 列表区」做视觉分层

这一节的样式延续上一节：一级菜单图标在上文字在下、覆盖 `el-menu-item` 默认 `height`/`line-height`、移除横向遗留的 `mr-3` 改成纵向 `margin-bottom`、二级菜单颜色比一级更淡。这些动作合在一起，本质是把左侧区域拆成两个职责差异明显的视觉层——一级导航条更像模块切换器，二级菜单区更像当前模块的详细导航列表。让二级菜单更淡是主次层级设计，不是随手调色。

## 七、状态设计先于样式实现

这一节先定 collapsed / pinned 两个独立维度，再谈样式，顺序很重要：交互状态是骨架，样式只是表层。如果反过来先调样式再补状态，经常出现「视觉改完了但钉住/折叠逻辑对不上」。后台复杂交互组件建议都按这个顺序——先把状态机和优先级规则写清楚，再让样式去贴合状态，避免反复返工。

## 八、交互状态最好进入持久化层

collapsed / pinned 这类用户偏好，刷新后如果回到默认态会让用户觉得「没记住我的操作」。当二级菜单的交互状态已经稳定，应把 pinned 至少纳入 settings 持久化，collapsed 可视项目复杂度决定是否持久化。状态一旦要跨刷新保留，就别再只放在组件本地 ref，而要进入统一的设置源，否则同一份偏好会在不同入口表现不一致。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| Header 拿到 collapse 点击后布局没变 | Header 只接收没向外抛事件 | 保持 props + emit 受控组件模式 |
| Header 和外层各维护一份折叠状态 | 状态归属层级不清 | 让 DefaultLayout 成为唯一状态源 |
| 左侧菜单条件判断越来越绕 | 没先抽「左侧整体是否显示」 | 先定义 showSidebar 再拆一级/二级 |
| 钉住后二级菜单仍自动收起 | 没定义交互优先级 | 让 secondaryPinned 优先级高于自动折叠 |
| 一级菜单上下结构后图标怪异 | 只改 column 没覆盖默认高度行高 | 同时重写 height、line-height、图标间距 |
| 一/二级菜单层次不明显 | 结构变了视觉权重没变 | 用颜色、布局、内容密度拉主次层级 |
| 钉住后刷新又自动折叠 | 钉住状态没持久化 | 把 pinned 也纳入 settings 持久化 |

## 延伸阅读

- 上一篇：[混合模式双菜单与菜单样式调整](08-混合模式双菜单与菜单样式调整.md)
- 下一篇：[mixedBar 深色样式与折叠逻辑修正](10-mixedBar深色样式与折叠逻辑修正.md)
- 相关链接：[布局模式与菜单系统演进](01-布局模式与菜单系统演进.md)、[Vue Props](https://cn.vuejs.org/guide/components/props)、[Vue 组件事件](https://cn.vuejs.org/guide/components/events)
