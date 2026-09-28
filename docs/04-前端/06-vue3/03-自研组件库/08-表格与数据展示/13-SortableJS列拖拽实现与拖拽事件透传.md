---
title: SortableJS列拖拽实现与拖拽事件透传
description: "正式落地拖拽功能时，先从列拖拽入手更合理：它操作的是 columns，不会马上影响整行数据语义，更适合先验证拖拽库接入、索引计算和状态回写是否成立。实现上继续采用成熟的 SortableJS，先用本地 localColumns 承接可变的列顺序（绝不直接改 props），再把拖拽目标精确锁定到表头的 tr，通过 onEnd 拿到的 oldIndex / newIndex 配合 splice 完成重排。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# SortableJS 列拖拽实现与拖拽事件透传

## 概述

正式落地拖拽功能时，先从列拖拽入手更合理：它操作的是 columns，不会马上影响整行数据语义，更适合先验证拖拽库接入、索引计算和状态回写是否成立。实现上继续采用成熟的 SortableJS，先用本地 localColumns 承接可变的列顺序（绝不直接改 props），再把拖拽目标精确锁定到表头的 tr，通过 onEnd 拿到的 oldIndex / newIndex 配合 splice 完成重排。稳定 id/key 是列表正确重排的硬前提，组件内部应在用户没传 id 时自动补齐。最后通过 drag-col-change 事件把新列顺序回传给页面层，并用 dragRow / dragCol 两个独立布尔开关按需启用不同拖拽能力。

## 学习目标

- 理解为何先从列拖拽入手验证拖拽链路
- 用 SortableJS 作为成熟稳定的拖拽排序基础方案
- 建立本地 localColumns 承接拖拽重排，绝不直接改 props
- 把拖拽目标精确锁定到表头区域的 tr
- 用 onEnd 的 oldIndex / newIndex 配合 splice 完成列重排
- 认识稳定 id/key 是拖拽列表正确重排的硬前提
- 在用户没传 id 时由组件内部自动补齐增强容错
- 用 drag-col-change 事件把新顺序回传页面层，dragCol 按需开关

---

## 一、为何先从列拖拽入手

行拖拽和列拖拽底层逻辑相似，但真正实现时先选列拖拽更合理。因为列拖拽通常更聚焦：操作的是 columns，不会马上影响整行数据的语义，更适合先验证拖拽库接入、索引计算和状态回写是否成立。这一节是"拖拽能力落地的第一步"，不是一次性做完整套拖拽体系。

```text
先做列拖拽 -> 验证拖拽排序链路
再做行拖拽 -> 迁移到 data 数组
```

行拖拽和列拖拽底层逻辑相似，但落点不同；先从列拖拽做起，能更清楚验证组件边界。

## 二、继续采用 SortableJS 作为基础方案

没有自己从零写拖拽，而是继续采用上一节分析过的 SortableJS，这依然是合理选择，因为它本来就适合"现成 DOM 列表重排序"的场景。对当前表格列拖拽来说，它能直接绑定到头部列元素、拖拽过程中有现成动画、不需要自己去处理大量原始拖拽事件。

```ts
import Sortable from "sortablejs"

Sortable.create(element, {
  animation: 300,
  delay: 0,
  onEnd() {}
})
```

课程这里并不是在比谁能不用库写出来，而是在做工程上的最优解。列拖拽的重点应该放在状态回写，而不是底层拖拽事件本身。

## 三、建立本地 localColumns 承接重排

正式写代码时，第一个关键动作不是 Sortable.create，而是先定义 localColumns。因为 props.columns 是输入，拖拽排序是要修改顺序，组件不能直接去改 props，所以列拖拽真正操作的对象必须是本地可变列状态。

```ts
const localColumns = ref<VTableColumnType[]>(props.columns)
```

```text
props.columns  -> 只读输入
localColumns   -> 拖拽后真正被重排
```

只要涉及排序、切换、显隐这类变更，就不要直接动 props。本地状态是拖拽成功回写的前提，这一点和前面的本地配置/状态设计思路一致。

## 四、拖拽目标精确锁定到表头 tr

真正去找拖拽目标元素时，没有去随便绑整个 el-table，而是明确锁定表头包装区里面的 tr。因为当前拖的是"列头"，所以真正应该交给 SortableJS 的是表头这一排元素，而不是表格 body 或整张 table 外壳。

```ts
const element = tableRef.value?.$el?.querySelector(".el-table__header-wrapper tr")
```

拖拽绑定层级选错了，后面所有逻辑都会跑偏；列拖拽只应关注 header 区域，和 body 数据区是分开的。用 querySelector 查 DOM，本质上是在精确定位"可排序的那一排"。

## 五、oldIndex 与 newIndex 是重排核心输入

在 onEnd 回调里最先打印的就是 oldIndex 和 newIndex。这两个值之所以关键，是因为拖拽本质上只是告诉你某个元素原来在第几个位置、现在被放到了第几个位置。之后不论操作的是列数组还是行数组，真正的状态更新逻辑都会围绕这两个索引展开。

```ts
onEnd({ oldIndex, newIndex }) {
  console.log(oldIndex, newIndex)
}
```

这一步建议先打印验证，别一上来就直接改数组；先确认索引和你的直觉一致，再继续写重排逻辑，一旦索引认知错了后面的 splice 结果就很难调。

## 六、用 splice 完成最直接的列重排

真正回写顺序时，用的是最经典的数组重排套路：从 localColumns 里把旧位置元素切出来，再把它插入到新位置。这套写法非常适合拖拽排序，因为它和 oldIndex / newIndex 的语义天然一致。

```ts
const current = localColumns.value.splice(oldIndex, 1)[0]
localColumns.value.splice(newIndex, 0, current)
```

splice 会直接修改数组本身，正好适合本地可变状态；这套逻辑未来迁移到行拖拽上也依然成立。

## 七、稳定 id/key 是列表正确重排的硬前提

拖拽逻辑写完之后，很容易遇到"数据顺序好像变了，但表头位置没按预期更新"的问题，根因不在 splice，而在于渲染层缺少稳定标识。只要是 Vue 列表重排场景，都离不开 key。对表格列来说，如果没有稳定 id，Vue 很可能会复用旧节点，导致你感觉"拖拽没生效"。

```vue
<VTableColumn
  v-for="column in localColumns"
  :key="column.id"
  :column-key="column.id"
  v-bind="column"
/>
```

拖拽排序场景里，稳定 key 是硬前提，不是可选优化；表头和列内容不一致时，优先查 key，而不是先怀疑拖拽库。

## 八、组件内部自动补齐 id 增强容错

更合理的做法是：当用户忘了传 id 且检测到 dragCol 开启时，组件内部自动补一个。这会让 VTable 更像一个真正可用的基础组件，而不是"会用的人才用得好"。

```ts
function addId(enabled: boolean, arr: VTableColumnType[]) {
  if (!enabled || !arr.length || arr[0].id) return arr
  arr.forEach((item, index) => { item.id = index })
  return arr
}
```

自动补 ID 是增强容错性，不是替代用户建模；如果用户本来就传了稳定 id，就应尊重用户输入；这一类"自愈能力"非常适合基础组件。

## 九、拖拽完成后把新顺序回传页面层

没有停在"拖拽看起来可以用了"，而是继续补了 drag-col-change 事件。对页面层来说，拖拽动画只是表面，真正重要的是新的列顺序是什么，页面层只有拿到它，才能决定后续要不要保存用户偏好、写入缓存、发给服务端。

```ts
emit("drag-col-change", localColumns.value)
```

任何排序交互，最终都要回到"新顺序能不能被业务层消费"；不把顺序吐出去，拖拽就只是一个页面上的小动画。

## 十、dragRow 与 dragCol 做成按需开关

在实现列拖拽前，就先在 VTableProps 里预留了 dragRow 和 dragCol，这是一种很好的设计，因为不是所有表格都必须支持拖拽，也不是所有表格都同时支持行拖拽和列拖拽。页面层可以按需启用：只开列拖拽、只开行拖拽、或者都不开。

```ts
export interface VTableProps {
  dragRow?: boolean
  dragCol?: boolean
}
```

拖拽属于增强能力，不应该强绑到所有表格上；开关式设计能让组件更符合真实项目里的按需启用场景，后续行拖拽实现时可以直接沿用这一套结构。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 列能拖但顺序没真正变 | 没有修改本地列数组，只做了视觉拖动 | 用 localColumns + splice 回写顺序 |
| 数据列位置变了表头却没对上 | 列节点缺少稳定 key / id | 给列配置增加稳定 id，或组件内部自动补齐 |
| ref 到 VTable 却拖拽无效 | Sortable 没真正绑定到表头 DOM | 确保查询的是 .el-table__header-wrapper tr |
| 没开拖拽却仍创建拖拽实例 | 没用 dragCol 开关做条件判断 | 只在 dragCol 为 true 时执行 columnDrop() |
| 拖拽后页面层拿不到新列顺序 | 只改了本地状态，没有 emit | 在 onEnd 里补 drag-col-change 事件 |
| 以为列拖拽做完行拖拽也自动有了 | 混淆了两类排序对象 | 记住列拖拽操作 columns，行拖拽操作 data |

## 延伸阅读

- 上一篇：[12-自适应表格与行列拖拽方案分析](12-自适应表格与行列拖拽方案分析.md)
- 下一篇：[14-SortableJS行拖拽与拖拽句柄列渲染](14-SortableJS行拖拽与拖拽句柄列渲染.md)
- 相关链接：[SortableJS](https://github.com/SortableJS/Sortable)、[Vue nextTick](https://cn.vuejs.org/api/general.html#nexttick)、[Vue defineEmits](https://cn.vuejs.org/api/sfc-script-setup#defineprops-defineemits)

## 示例代码

```vue
<script setup lang="ts">
import { nextTick, onMounted, ref } from "vue"
import Sortable from "sortablejs"

const props = withDefaults(defineProps<VTableProps>(), {
  dragRow: false,
  dragCol: false
})
const emit = defineEmits<VTableEventsType>()

const tableRef = ref()
const localColumns = ref<VTableColumnType[]>([])

function columnDrop() {
  nextTick(() => {
    const element = tableRef.value?.$el?.querySelector(".el-table__header-wrapper tr")
    if (!element) return

    Sortable.create(element, {
      delay: 0,
      animation: 300,
      onEnd({ oldIndex, newIndex }) {
        if (oldIndex === undefined || newIndex === undefined) return
        const current = localColumns.value.splice(oldIndex, 1)[0]
        localColumns.value.splice(newIndex, 0, current)
        emit("drag-col-change", localColumns.value)
      }
    })
  })
}

onMounted(() => {
  localColumns.value = addId(props.dragCol, [...props.columns])
  if (props.dragCol) columnDrop()
})
</script>
```
