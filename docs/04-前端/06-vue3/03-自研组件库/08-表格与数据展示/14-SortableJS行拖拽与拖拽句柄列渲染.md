---
title: SortableJS行拖拽与拖拽句柄列渲染
description: "从列拖拽继续推进到行拖拽，两者共用同一套拖拽库，但真正操作的数据源完全不同：列拖拽改 columns，行拖拽改 data，因此必须先建立独立的 localData。行拖拽的绑定目标从表头 tr 切换到 tbody 里的行列表，并多出一个关键产品化细节——拖拽句柄 handle，避免误触单元格点击。句柄列最好继续走\"列模板组件\"路线（新建 DragIcon 通过 defaultSlot 插进第一列），且必须兼容用户已有的 defaultSlot：在拖拽图标后面继续渲染原有列模板，而不是覆盖它。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# SortableJS 行拖拽与拖拽句柄列渲染

## 概述

从列拖拽继续推进到行拖拽，两者共用同一套拖拽库，但真正操作的数据源完全不同：列拖拽改 columns，行拖拽改 data，因此必须先建立独立的 localData。行拖拽的绑定目标从表头 tr 切换到 tbody 里的行列表，并多出一个关键产品化细节——拖拽句柄 handle，避免误触单元格点击。句柄列最好继续走"列模板组件"路线（新建 DragIcon 通过 defaultSlot 插进第一列），且必须兼容用户已有的 defaultSlot：在拖拽图标后面继续渲染原有列模板，而不是覆盖它。用 h 表达"外层套句柄、内层保留 slot"的嵌套逻辑通常比模板更清晰。最后同样要把新顺序通过 drag-row-change 回传页面层，dragRow / dragCol 作为两条并行能力线彼此独立启用。

## 学习目标

- 理解行拖拽与列拖拽操作对象分别是 data 与 columns，需独立本地状态
- 把行拖拽目标从表头 tr 切换到 tbody 里的行列表
- 用 handle 限定拖拽入口，避免误触整行点击
- 通过独立 DragIcon 组件无侵入地插入拖拽句柄
- 兼容用户已有 defaultSlot，不破坏原有列模板
- 用 h / TSX 表达"外层包装句柄、内层保留 slot"的组合逻辑
- 行拖拽结束后通过 drag-row-change 把新顺序回传页面层
- 认识 dragRow 与 dragCol 是两条应彼此独立启用的能力线

---

## 一、行拖拽与列拖拽操作对象不同

行拖拽和列拖拽底层思路一样：都是 SortableJS、都是 oldIndex / newIndex、都是 splice 重排。但它们真正改写的对象不同——列拖拽是 localColumns，行拖拽是 localData。这就是为什么一上来先定义 localData = props.data。

```ts
const localData = ref(props.data)
```

```text
column drag -> 重排 columns
row drag    -> 重排 data
```

行拖拽和列拖拽不能共用同一个本地状态变量；表面上看都是"拖拽"，但真正被改写的模型不同。只要想清楚这一点，后面的实现就会非常顺。

## 二、行拖拽目标切换到 tbody

列拖拽时拖拽对象是表头区域的 tr，这一节行拖拽时目标就必须切换成 tbody 里的行元素，所以去查询的 DOM 也从 .el-table__header-wrapper tr 改成了 .el-table__body-wrapper tbody。

```ts
const element = tableRef.value?.$el?.querySelector(".el-table__body-wrapper tbody")
```

拖拽的绑定层级必须和目标元素类型对应；行拖拽只应该作用于数据行，不应该碰到表头。这一步一旦查错选择器，后面所有拖拽逻辑都会跑偏。

## 三、行拖拽多出拖拽句柄 handle

行拖拽没有让用户"随便点整行任意位置都能拖"，而是加了一个专门的拖拽图标，并在 Sortable.create 里设置 handle。这是一种很成熟的产品化处理方式，因为它能避免用户只是想点某个单元格却误触发拖拽。

```ts
Sortable.create(element, {
  handle: ".drag-button"
})
```

行拖拽通常更适合显式句柄，而不是全行都可拖，尤其是表格行里本身有很多点击事件时，句柄能显著降低误操作。handle 是这节实现里最有产品感的一个细节。

## 四、句柄列继续走"列模板组件"路线

非常克制地没有直接去改 VTableColumn 的内部模板，而是继续延续前面建立好的思路：新建一个 DragIcon 组件，通过 defaultSlot 把它插进第一列。这样做不会让 VTableColumn 和拖拽场景强耦合，DragIcon 能单独控制样式和插槽，后续默认列渲染和拖拽列渲染可以继续共存。

```vue
<DragIcon>
  <slot />
</DragIcon>
```

不要为了一个案例把基础列组件写死成拖拽专用；拖拽句柄组件越独立，后续越容易维护。这节的重点不是"图标长什么样"，而是"拖拽能力如何无侵入地插入现有列结构"。

## 五、必须兼容用户已有的 defaultSlot

当前列如果本来已经设置了 defaultSlot，行拖拽开启后，不能因为你插了个拖拽图标就把用户自己的列模板给覆盖掉。正确做法不是"替换原来的默认渲染"，而是在拖拽图标后面继续渲染用户原本的 defaultSlot；如果用户没有定义 defaultSlot，才回退到默认文本渲染。

```ts
if (defaultSlot) {
  return h(DragIcon, null, {
    default: () => defaultSlot(scope)
  })
}
```

行拖拽真正难的是兼容性，不是拖拽库接入本身；如果不保留用户已有 defaultSlot，拖拽功能一开就会把已有列模板打坏。这一步直接决定了拖拽能力是不是"可叠加"的增强能力。

## 六、用 h 表达外层包装内层 slot 的组合逻辑

这一节非常典型地展示了模板写法在这里会变得有点绕，h 或 TSX 反而更好表达嵌套逻辑。因为当前要表达的是：外层是一个 DragIcon，里面的默认插槽内容要么来自用户，要么来自默认文本。这种"包装一个已有 slot"的逻辑，本来就更像函数式组合，而不是简单模板。

```ts
return h(
  DragIcon,
  {},
  {
    default: () => defaultSlot ? defaultSlot(scope) : h("span", row[prop])
  }
)
```

这不是说模板不好，而是这个场景更像"函数式拼装"；一旦模板开始俄罗斯套娃，改用 h 往往会更清晰。

## 七、行拖拽同样要把新顺序回传页面层

在行拖拽逻辑里同样延续了上一节的思路：拖拽完成后，不只是本地重排 localData，还要 emit("drag-row-change", localData)。这样页面层才能进一步决定是否持久化、是否同步到接口、是否触发其他联动。

```ts
emit("drag-row-change", localData.value)
```

只改本地顺序，页面层不知道结果，拖拽能力就是半成品；行拖拽和列拖拽在这件事上完全一致，事件名分开设计也让页面层更容易区分"谁变了"。

## 八、dragRow 与 dragCol 是两条并行能力线

当前你可能遇到：某些列表只允许列拖拽、某些只允许行拖拽、某些两个都不允许。所以把它们拆成两个独立布尔开关，而不是一个模糊的 draggable，是更合理的设计。

```vue
<VTable drag-row />
<VTable drag-col />
<VTable :drag-row="false" :drag-col="false" />
```

拖拽能力不是"有或没有"这么简单，而是至少要区分行和列两个维度；当前拆分开的设计，为后续扩展提供了非常好的空间。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 行拖拽拖得动但数据顺序没真正变 | 只做了 DOM 拖拽，没有改本地数组 | 用 localData + splice 回写顺序 |
| 拖拽时经常误触发单元格点击 | 没有限定拖拽句柄 | 在 Sortable.create 里设置 handle: '.drag-button' |
| 开启行拖拽后第一列原自定义渲染消失 | 直接覆盖了用户的 defaultSlot | 在包装拖拽图标时保留用户已有 defaultSlot |
| 拖拽图标出来了但第一列数据不见了 | 只渲染了句柄，没有继续渲染默认内容 | 在 DragIcon 的默认插槽里补原始内容 |
| 页面层不知道拖拽后的新顺序 | 只改了组件内部本地状态 | 拖拽结束后 emit('drag-row-change', localData) |
| 想只开列拖拽却把行拖拽一起开了 | 没把 dragRow 和 dragCol 分开控制 | 继续保持两个独立布尔开关 |

## 延伸阅读

- 上一篇：[13-SortableJS列拖拽实现与拖拽事件透传](13-SortableJS列拖拽实现与拖拽事件透传.md)
- 下一篇：[15-VTable拖拽限制分析与树形拖拽扩展思路](15-VTable拖拽限制分析与树形拖拽扩展思路.md)
- 相关链接：[SortableJS](https://github.com/SortableJS/Sortable)、[Vue h 渲染函数](https://cn.vuejs.org/api/render-function)、[Vue 生命周期 onBeforeMount](https://cn.vuejs.org/api/composition-api-lifecycle)

## 示例代码

```ts
const localData = ref(props.data)

function rowDrop() {
  nextTick(() => {
    const element = tableRef.value?.$el?.querySelector(".el-table__body-wrapper tbody")
    if (!element) return

    Sortable.create(element, {
      handle: ".drag-button",
      delay: 0,
      animation: 300,
      onEnd({ oldIndex, newIndex }) {
        if (oldIndex === undefined || newIndex === undefined) return
        const current = localData.value.splice(oldIndex, 1)[0]
        localData.value.splice(newIndex, 0, current)
        emit("drag-row-change", localData.value)
      }
    })
  })
}
```
