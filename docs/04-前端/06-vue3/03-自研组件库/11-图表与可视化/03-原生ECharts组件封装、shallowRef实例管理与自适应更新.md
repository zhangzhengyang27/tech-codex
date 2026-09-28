---
title: 原生ECharts组件封装、shallowRef实例管理与自适应更新
description: "除了用 vue-echarts 包装层，也可以不依赖它、直接在组件里接管 ECharts 原生实例。这条路线尤其适用于：计划把 ECharts 作为 CDN external 掉、希望完全控制初始化与更新时机、或只需要项目内部一套自定义图表包装层。本文聚焦原生封装的 init/setOption/resize/dispose 四个核心动作、shallowRef 管理实例、尺寸自适应与实例暴露。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 原生 ECharts 组件封装、shallowRef 实例管理与自适应更新

## 概述

除了用 `vue-echarts` 包装层，也可以不依赖它、直接在组件里接管 ECharts 原生实例。这条路线尤其适用于：计划把 ECharts 作为 CDN external 掉、希望完全控制初始化与更新时机、或只需要项目内部一套自定义图表包装层。它和前两篇的 `vue-echarts` 封装并不冲突，而是两种不同的工程策略——前者偏官方包装复用，后者偏内部定制和 external 场景。代价是你要自己补齐 `vue-echarts` 替你做好的生命周期、事件、`resize`、销毁与更新。本文聚焦原生封装的四个核心动作、`shallowRef` 管理实例、尺寸自适应与实例暴露。

## 学习目标

- 理解原生 ECharts 封装的适用场景，以及它与 `vue-echarts` 封装的取舍。
- 掌握原生组件最核心的四件事：初始化、更新、缩放、销毁。
- 知道为什么 ECharts 实例要用 `shallowRef()` 或普通变量保存，而不能进深层响应式。
- 能为 `option` 保持 `EChartsOption` 类型，而不是退化成裸 `object` 绕过 TS 报错。
- 理解 `ResizeObserver` 比 `window.resize` 更稳、`watch(option)` 的成本边界，以及实例暴露的两条路。

---

## 一、原生封装的适用场景

原生封装指不安装 `vue-echarts`，直接在组件里 `import * as echarts from "echarts"` 并手动 `echarts.init()`。它适合：准备把 ECharts 作为 CDN external、希望完全控制初始化和更新时机、或只需要项目内部一套定制包装层。这条路线更灵活，但也意味着你要自己补齐响应式更新、`autoresize`、事件绑定等能力。与 `vue-echarts` 封装二选一即可，不必混用——如果团队已统一用 `vue-echarts`，通常没必要再维护一套原生封装。

## 二、四件核心动作：init / setOption / resize / dispose

原生 ECharts 组件归纳起来只有四个生命周期动作：挂载后 `echarts.init(dom)`、数据变化时 `setOption(option)`、尺寸变化时 `resize()`、卸载时 `dispose()`。这四步串起来就是最小可用组件。

```ts
const chart = echarts.init(dom)
chart.setOption(option)
chart.resize()
chart.dispose()
```

注意三点：`init` 只做一次，后续更新应走 `setOption`，不要反复销毁重建；`dispose` 不是可选动作，漏掉会造成实例和事件监听残留；`resize` 只在容器尺寸变化时触发，不要当成普通刷新手段。

## 三、用 shallowRef 管理实例

一个关键修正：ECharts 实例绝不该用 `ref()` 包起来，因为它会被 Vue 深度递归代理，带来异常表现。Vue 官方说明 `shallowRef()` 的内部值按原样存储和暴露，不会被深层转换为响应式——这对第三方复杂实例尤其重要。

```ts
import { shallowRef } from "vue"
const chartInstance = shallowRef<echarts.ECharts>()
```

`shallowRef()` 保留了 `.value` 层的响应式，但不递归代理内部属性。如果只是组件内部使用，普通变量也可以；如果还要暴露给模板或外部组合逻辑，`shallowRef()` 更方便。等价替代还有 `markRaw()`。

## 四、option 类型不要退化成 object

常见 TS 问题是组件 props 想写成 `EChartsOption`，调用侧传值却报类型不匹配，于是把 props 退回 `object` 再内部 `as EChartsOption`。这能跑，但丢掉了最重要的类型收益：option 自动提示、配置项拼写校验、系列和组件结构约束。

更好的做法是：组件 props 保持 `option: EChartsOption`，在调用侧把数据源显式标注成 `EChartsOption`，或用 `satisfies EChartsOption`。修正"调用侧数据源类型"，而不是牺牲"组件侧 props 类型"。

```ts
import type { EChartsOption } from "echarts"
const option: EChartsOption = { /* ... */ }
```

## 五、formatDimension 与统一 computed style

宽度、高度、`style`、默认值、`number | string` 兼容，是基础组件极易变乱的细节。如果这层不统一，业务侧会遇到"数字高度要不要补 px""宽度不传默认给多少""外部 style 和组件默认谁覆盖谁"。推荐抽一个 `formatDimension()`，所有尺寸逻辑收口到一个 `computed chartStyle`：

```ts
function formatDimension(value: string | number | undefined, defaultValue: string) {
  if (typeof value === "number") return `${value}px`
  return value || defaultValue
}

const chartStyle = computed<CSSProperties>(() => ({
  ...(attrs.style as CSSProperties),
  width: formatDimension(props.width, "100%"),
  height: formatDimension(props.height, "400px"),
}))
```

宽度默认 `100%` 通常合理，但高度不建议默认 `100%`，除非你能确保父容器有稳定高度；高度默认值建议给明确像素（如 `400px`）。要提前约定 `style` 合并优先级，避免用户样式被内部覆盖得不可预期。

## 六、ResizeObserver 优于 window.resize

课程里为简单用了 `window.addEventListener("resize", fn)`，本身没问题，官方文档也展示过。但现代后台布局里，图表尺寸变化不一定来自窗口：侧边栏折叠、抽屉打开、父容器宽度变化、Tabs 切换后重新布局，都会让容器变宽变窄。`window.resize` 未必能感知这些容器级变化。

```ts
onMounted(() => {
  if (!chartRef.value || !props.autoresize) return
  resizeObserver = new ResizeObserver(() => throttledResize())
  resizeObserver.observe(chartRef.value)
})
```

优先监听图表容器本身的尺寸变化，通常比只监听窗口更稳。无论哪种方式，都建议配合节流减少频繁重算。

## 七、watch(option) 的成本边界

为了"直接修改 option 内部数据后实时刷新"，常会对 `props.option` 做 `deep: true` 的 `watch` 并调用 `setOption`。这对中小规模、变化频率不高的图表很方便，但代价是深度监听会追踪更多变化、高频更新时反复调用 `setOption`。

```ts
watch(
  () => props.option,
  (newOption) => chartInstance.value?.setOption(newOption, { notMerge: false }),
  { deep: true }
)
```

这条方案偏"方便优先"，适合数据变化频率不高、业务更看重易用性的场景。如果是高频流式数据或超大数据量，更适合手动控制更新节奏（如防抖合并、或 `manual-update` 模式下主动调用实例方法），避免深度监听成为瓶颈。

## 八、实例暴露的两条路

图表实例暴露有两种策略：逐个透传事件/方法/实例能力，或直接把初始化后的实例抛给外层。对项目内部通用组件，第二种往往更务实——ECharts 实例方法极多，全人工封装一遍工作量大、容易漏、还要维护类型；而直接 `defineExpose` 暴露实例或通过 `emit("init", instance)` 抛出，外层就能自行调用 `dispatchAction`、`resize`、`convertToPixel`、`showLoading` 等官方 API。

```ts
function initChart() {
  if (!chartRef.value) return
  chartInstance.value = echarts.init(chartRef.value)
  chartInstance.value.setOption(props.option)
  emit("init", chartInstance.value)
}
defineExpose({ getInstance: () => chartInstance.value })
```

只有在把组件作为公共库对外发布时，才更需要考虑完整 API 设计与方法透传一致性。项目内部组件，直接暴露实例通常是成本最低、灵活性最高的方案。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
| --- | --- | --- |
| 图表首次不显示 | 容器未挂载就调用 `init` | 只在 `onMounted` 后初始化 |
| 切换后内存泄漏/重复监听 | 卸载时未 `dispose` 或清理监听 | `onBeforeUnmount` 统一 `disconnect` 与 `dispose` |
| 尺寸不随布局变化 | 没调用 `resize` | 用 `ResizeObserver` 监听容器变化并 `resize` |
| 用 `ref` 存实例行为异常 | 第三方实例被深度代理 | 改用 `shallowRef` 或普通变量 |
| 为绕 TS 把 option 改成 object | 牺牲了组件侧类型校验 | 保持 props 为 `EChartsOption`，调用侧正确标注 |
| 外层拿不到实例 | 组件未透出实例能力 | `emit("init")` 或 `defineExpose` 暴露实例 |

## 延伸阅读

- 上一篇：[Vue-ECharts 按需注册解析、组件能力增强与实例透传](02-Vue-ECharts按需注册解析、组件能力增强与实例透传.md)
- 下一篇：[富文本编辑器选型对比与 Vditor 方案确定](../12-富文本与内容编排/01-富文本编辑器选型对比与Vditor方案确定.md)
- 相关：[ECharts 基础接入与 Vue-ECharts 通用图表组件封装](01-ECharts基础接入与Vue-ECharts通用图表组件封装.md)
