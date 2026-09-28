---
title: 面包屑响应式恢复、ResizeObserver宽度监听与节流防抖优化
description: "面包屑的响应式适配很容易被误认为\"屏幕变窄时隐藏几项\"就结束了，但其实它是一套双向过程：变窄要裁剪，变宽还要把裁掉的项按原始顺序加回来。如果只做删除不做恢复，面包屑会越来越短，直到用户手动刷新才回到完整状态。"
keywords: [面包屑响应式恢复、ResizeObserver宽度监听与节流防抖优化]
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 面包屑响应式恢复、ResizeObserver 宽度监听与节流防抖优化

## 概述

面包屑的响应式适配很容易被误认为"屏幕变窄时隐藏几项"就结束了，但其实它是一套双向过程：变窄要裁剪，变宽还要把裁掉的项按原始顺序加回来。如果只做删除不做恢复，面包屑会越来越短，直到用户手动刷新才回到完整状态。

本章围绕头部面包屑的响应式收尾，完整拆解恢复逻辑的五个关键步骤：缓存原始数组、以当前首个可见项为锚点回补、空数组时从末尾恢复、判重保证幂等、以及用 `ResizeObserver` 结合旧宽度判断变化方向。最后再用 `useThrottleFn` 节流恢复逻辑抑制拖拽放大时的抖动，并把删除动作交给一套独立的高度阈值观察做纠偏。

## 学习目标

- 理解面包屑响应式是"裁剪 + 恢复"的双向过程，而非单向隐藏
- 掌握用 `localData` 浅拷贝缓存原始完整数组，为恢复提供顺序依据
- 学会以当前首个可见项为锚点、向前回补一项的恢复策略
- 处理显示数组被删空后的边界恢复场景
- 用判重逻辑保证恢复的幂等性，避免高频回调重复插入
- 用 `ResizeObserver` + `oldWidth` 比较判断宽度变化方向
- 用 `useThrottleFn` 对恢复逻辑节流，并让删除逻辑继续即时兜底

---

## 一、响应式是双向过程：既要裁剪也要恢复

之前章节已经实现了宽度不足时删除面包屑项的能力，但完整的响应式逻辑还缺另一半：宽度重新变大时，要把之前删掉的项再加回来。

```text
宽度变窄 -> 删除一项
宽度变宽 -> 恢复一项
```

只处理删除不处理恢复，最终体验是不完整的——用户一旦缩小过窗口，面包屑就永久变短，只能靠刷新救回。因此恢复逻辑的关键不是随便加一个元素，而是要按原始顺序补回，否则链路会错乱。

## 二、恢复的前提：缓存一份不被裁剪破坏的原始数组

当前页面正在显示的 `breadcrumbData` 是一个会被删减的数组。如果只拿它自己做恢复依据，会遇到两个问题：被删掉的元素已经不在数组里，而且无法知道原始顺序。所以必须保留一份不随显示过程被破坏的源数据。

```ts
const localData = ref<AppRouteMenuItem[]>([])

watch(
  breadcrumbData,
  (value) => {
    localData.value = [...value]
  },
  { immediate: true }
)
```

这里用浅拷贝（`[...value]`）而不是直接引用赋值，避免恢复过程中修改显示数组时把源数据一并改掉。只要展示数组会被修改，就应该为恢复逻辑保留这份稳定副本。

## 三、以当前首个可见项为锚点向前回补

恢复逻辑的难点不在于"添加元素"，而在于"添加哪一个"。删除时通常从左侧前部开始隐藏，所以恢复时也应该从最接近当前第一个可见项的前一个兄弟开始补回。

```ts
if (breadcrumbData.value.length > 0) {
  const index = localData.value.findIndex(
    (item) => item.name === breadcrumbData.value[0]?.name
  )

  const item = localData.value[Math.max(index - 1, 0)]
  breadcrumbData.value.unshift(item)
}
```

做法是：取当前显示数组第一个元素，去完整数组里找它的索引，往前取一项，插回显示数组头部。锚点是"当前显示数组的第一个元素"，查找时更推荐按 `name` 或 `path` 这类稳定字段比较，而不是直接比较对象引用。

## 四、显示数组为空时从完整数组末尾恢复

当显示数组已经被删空，就没有"第一个可见元素"可供定位，第三节的锚点策略失效。此时合理的做法是直接从完整数组最后一项开始恢复，因为最后一项通常代表当前页面本身，是链路中最贴近当前视图的节点。

```ts
if (breadcrumbData.value.length === 0) {
  const item = localData.value[localData.value.length - 1]
  breadcrumbData.value.unshift(item)
}
```

任何涉及数组索引的恢复逻辑都要显式防止越界，`Math.max(index - 1, 0)` 和取末尾项本身都隐含了边界保护。

## 五、判重插入保证幂等，避免拖拽放大时重复

`ResizeObserver` 在拖拽放大时会高频触发，宽度每变化一次都会回调一次。如果恢复前不判重，同一个元素会被反复 `unshift`，页面出现重复面包屑项。所以恢复逻辑必须具备幂等性：相同状态下反复执行，结果仍然正确。

```ts
if (
  item &&
  !breadcrumbData.value.some((breadcrumb) => breadcrumb.name === item.name)
) {
  breadcrumbData.value.unshift(item)
}
```

更推荐按唯一标识（`name` / `path`）判断是否存在，而不是单纯依赖对象引用。`some()` 判重后再插入，本质是给 UI 状态更新加了一层幂等保护。

## 六、ResizeObserver 结合旧宽度判断变化方向

`ResizeObserver` 拿到宽度变化后，不能只知道"尺寸变了"，还要知道是变宽还是变窄。定义 `oldWidth` 与当前宽度比较，`width > oldWidth` 走恢复逻辑，`width < oldWidth` 交给已有的删除观察机制。

```ts
const oldWidth = ref(-1)

useResizeObserver(breadcrumbRef, ([entry]) => {
  const width = entry.contentRect.width

  if (oldWidth.value === -1) {
    oldWidth.value = width
    return
  }

  if (width > oldWidth.value) {
    restoreBreadcrumb()
  }

  oldWidth.value = width
})
```

首次执行必须先初始化旧宽度，避免第一次就误判成"变宽"而触发多余恢复。`ResizeObserver` 监听的是容器本身，比只依赖窗口尺寸更精准，适合做容器级响应式。

## 七、删除与恢复职责拆分，高度阈值兜底

恢复逻辑里不需要再写"加多了怎么删"，因为删除动作本来就由另一套观察逻辑接管：当面包屑区域高度大于阈值（例如 `14px`）说明当前行已溢出，立即删掉一项。恢复侧的条件则相反——只有当前仍保持单行（高度不超过阈值）时，才尝试向前回补一项：

```ts
if (breadcrumbRef.value?.$el?.offsetHeight <= 14) {
  restoreBreadcrumb()
}
```

这样删除和恢复被拆成两个职责——宽度变宽时尝试恢复，高度超限时立即纠偏删除。高度阈值是防止恢复过量的最后一道兜底，建议提取成常量（如 `BREADCRUMB_SINGLE_LINE_HEIGHT`），避免后续修改字号或行高时难以维护。

## 八、用 useThrottleFn 节流恢复逻辑抑制抖动

持续拖拽放大时，`ResizeObserver` 频繁触发，如果每次都立即尝试恢复一个元素，视觉上会一直抖、一直跳。最直接的解法不是改 CSS 动画，而是对"添加元素"这段逻辑做节流，让它在一段时间内最多执行一次。

```ts
const throttledRestore = useThrottleFn(() => {
  if (breadcrumbRef.value?.$el?.offsetHeight <= 14) {
    restoreBreadcrumb()
  }
}, 500)
```

节流只包裹恢复逻辑，删除逻辑仍保持即时执行——两者节奏分离，既稳住放大时的交互，又不拖慢缩小时的纠偏。节流时间不是越短越好，课程里从 `200ms` 调整到 `500ms`，需根据视觉稳定性权衡。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 面包屑缩小后能隐藏，但放大后回不来 | 只实现了裁剪逻辑，未保留原始完整数组 | 增加 `localData` 缓存，宽度变宽时按顺序恢复 |
| 放大窗口后出现重复面包屑项 | 高频回调反复插入同一元素 | 恢复前先判重，再决定是否 `unshift()` |
| 恢复顺序错乱 | 没有基于首个可见项向前回补 | 以首个可见项为锚点，在完整数组中找前一个元素 |
| 当前数组为空时恢复失败 | 未处理"无锚点"边界场景 | 从完整数组最后一项开始恢复 |
| 拖拽放大时新增项一直抖动 | `ResizeObserver` 高频触发，恢复执行过密 | 用 `useThrottleFn()` 对恢复逻辑节流 |
| 恢复后刚加回来又立刻换行 | 没有结合高度阈值做空间判断 | 恢复前检查容器高度，删除逻辑继续作为兜底 |

## 延伸阅读

- 上一篇：[29-主体内容区滚动容器、固定头部与动态高度计算优化](29-主体内容区滚动容器、固定头部与动态高度计算优化.md)
- 下一篇：[31-CollapseTransition基础组件封装、滚动状态恢复与可配置折叠动画](31-CollapseTransition基础组件封装、滚动状态恢复与可配置折叠动画.md)
- 相关链接：[VueUse useResizeObserver](https://vueuse.org/core/useResizeObserver/)、[VueUse useThrottleFn](https://vueuse.org/shared/useThrottleFn/)、[MDN ResizeObserver](https://developer.mozilla.org/zh-CN/docs/Web/API/ResizeObserver)
