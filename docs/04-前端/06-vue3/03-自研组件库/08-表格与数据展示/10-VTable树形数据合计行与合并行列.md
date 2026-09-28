---
title: VTable树形数据合计行与合并行列
description: "沿官方案例继续推进，走到几类典型的高级展示场景：树形数据、懒加载树形数据、表尾合计行、合并行或列。它们的共同点是都不只是\"把一行行数据列出来\"，而是在表达更复杂的数据关系和更强的可读性。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# VTable 树形数据、合计行与合并行列

## 概述

沿官方案例继续推进，走到几类典型的高级展示场景：树形数据、懒加载树形数据、表尾合计行、合并行或列。它们的共同点是都不只是"把一行行数据列出来"，而是在表达更复杂的数据关系和更强的可读性。本章落地树形表格的 row-key 与 children、懒加载的 lazy + load、合计行的 show-summary 与 summary-method、合并行列的 span-method。这些能力继续考验 VTable 是否还能保持对官方能力的承接——只要都能接进来，就说明封装方向是对的：VTable 的价值是统一承接官方能力，而不是把它们重新发明一遍。

## 学习目标

- 认识树形数据、合计行、合并行列是表格走向复杂数据结构展示的关键能力
- 理解树形表格最关键是 row-key（节点标识），而非 children 本身
- 区分 default-expand-all（初始展示策略）与 children（真实树结构）
- 用 lazy + load 把树形数据从静态树推进到异步树
- 用 show-summary 开启合计行，用 summary-method 自定义汇总逻辑
- 自定义汇总时首列写文案、其余列 reduce 求和，并显式 Number() 防 NaN
- 用 span-method 返回跨行跨列规则，理解 [0,0] 表示被合并吞掉
- 理解 VTable 的价值在于统一承接官方高级能力，而非替代重写

---

## 一、树形数据、合计行、合并行列走向复杂数据结构

这一节走到几类比较典型的高级展示场景：树形数据、懒加载树形数据、表尾合计行、合并行或列。它们的共同点是都不只是"把一行行数据列出来"，而是在表达更复杂的数据关系和更强的可读性。这些能力会继续考验 VTable 是否还能保持对官方能力的承接，更多是在验证"基础封装有没有挡住官方原生能力"。一旦这些高级场景都能接进来，VTable 的可用范围就会明显扩大。

```text
普通表格 -> 平铺数据
高级表格 -> 树形关系 / 汇总关系 / 合并关系
```

## 二、树形表格最关键是 row-key

接树形数据时，最先需要补的并不是列渲染，而是 row-key。因为树形表格要知道哪一行对应哪个唯一节点、展开/收起状态挂在哪个字段上，没有这个稳定标识，树形结构就很难正确工作。

```vue
<VTable
  :columns="treeTableColumns"
  :data="treeTableData"
  row-key="id"
  border
/>
```

树形表格下 row-key 比普通表格更重要；id 这类唯一标识应尽量稳定，不要用数组索引代替；只要涉及展开状态，稳定 key 就是第一前提。

## 三、default-expand-all 只是展示策略，层级来自 children

default-expand-all 的作用是默认把树节点全部展开，但这只是展示策略，不是数据结构本身。真正决定树形关系的，仍然是每一行上的 children。

```vue
<VTable
  :columns="treeTableColumns"
  :data="treeTableData"
  row-key="id"
  default-expand-all
/>
```

default-expand-all 只是显示层策略，不改变树结构；如果数据本身没有 children，单独加这个属性是没有意义的。树形表格要同时兼顾"结构"与"初始态"。

## 四、懒加载树加 lazy + load，数据从静态树到异步树

懒加载树形表格只是再加两样东西：lazy 和 load。这意味着节点的子级不再一次性全塞进 children，而是用户展开时再去异步取回下一层数据。

```vue
<VTable
  :columns="treeTableColumns"
  :data="treeTableData"
  row-key="id"
  lazy
  :load="loadNode"
/>
```

```ts
function loadNode(row: TreeRow, treeNode: unknown, resolve: (data: TreeRow[]) => void) {
  setTimeout(() => {
    resolve([{ id: `${row.id}-1`, date: "2016-05-01", name: "Child", address: "Lazy Child" }])
  }, 300)
}
```

懒加载树和静态树的区别不在 UI，而在数据加载时机。真正做懒加载时，要额外考虑 loading 状态和重复展开的缓存策略。

## 五、show-summary 开启合计行，summary-method 自定义汇总

表尾合计行其实有两层能力：show-summary 打开合计行显示，summary-method 自定义每一列怎么合计。如果只是普通数字求和，默认行为可能已经够用；但只要碰到文本列不参与求和、汇总文案要改、某列算法不同，就必须自己接管 summary-method。

```vue
<VTable :columns="summaryColumns" :data="summaryData" show-summary :summary-method="getSummaries" />
```

show-summary 决定有没有汇总行，summary-method 决定汇总内容怎么算；文本列通常不适合直接求和，需要自己兜底处理；一旦数据类型不统一，就不该盲目依赖默认汇总表现。

## 六、自定义汇总：首列文案 + reduce 求和 + Number() 防 NaN

汇总实现非常典型：第一列不做数值汇总，显示"合计"或自定义文字，其他列逐列提取数值再通过 reduce 做累加。这种写法适用于绝大多数后台统计型表格。

```ts
function getSummaries(param: { columns: VTableColumnType[]; data: Record<string, unknown>[] }) {
  const { columns, data } = param
  const sums: (string | number)[] = []

  columns.forEach((column, index) => {
    if (index === 0) {
      sums[index] = "合计"
      return
    }
    const values = data.map((item) => Number(item[column.property as string]))
    sums[index] = values.reduce((prev, curr) => prev + curr, 0)
  })

  return sums
}
```

求和前最好显式 Number() 一次，避免字符串拼接错误；文本列需要手动排除，否则容易出现 NaN；汇总行本质是"列级计算"，非常适合配合列配置一起理解。

## 七、span-method 返回跨行跨列规则

合并行列的核心并不是写复杂 DOM，而是给表格一个 span-method，返回每个单元格的跨行跨列规则。这个方法会拿到 row、column、rowIndex、columnIndex，然后返回 [rowspan, colspan] 或者 { rowspan, colspan }，就能告诉表格这个单元格应该怎么合并。

```ts
function arraySpanMethod({ rowIndex, columnIndex }: { rowIndex: number; columnIndex: number }) {
  if (rowIndex % 2 === 0) {
    if (columnIndex === 0) return [1, 2]   // 横向跨 2 列
    if (columnIndex === 1) return [0, 0]   // 被前一个合并单元格吞掉
  }
}
```

返回 [0, 0] 代表这个单元格被前一个合并单元格吞掉，不再单独显示；合并行列的本质是"布局规则"，不是普通内容渲染，这类能力对数据表结构影响很大，最好单独用示例页验证。数组写法和对象写法都只是不同表达形式，团队内最好统一一种，重点永远不是写法形式而是到底想跨几行几列。

## 八、VTable 的价值是统一承接，而非替代官方

做到这一节时，一个重要结论已经验证得很清楚：VTable 不是要重新发明一张表，而是要在不破坏官方能力的前提下，把官方能力收口成项目自己的边界。换句话说，VTable 的意义更像：统一 props 和类型、统一分页与国际化、统一插槽扩展和事件透传、统一复杂示例的落地入口。

```text
VTable -> 不替代官方，统一项目使用方式
```

如果某项官方能力一接进 VTable 就很痛苦，那说明封装边界可能还没设计好；组件库封装的价值在于统一，不在于抹平官方所有特性。表格这种组件尤其需要"收口"而不是"重写"。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 树形表格能显示但展开状态异常 | 没设置稳定的 row-key | 给树节点提供稳定唯一标识 |
| 只加了 default-expand-all 但没有树结构 | 误把展开策略当成树结构来源 | 真正的层级关系仍然来自 children |
| 汇总行出现 NaN | 把文本列或字符串金额直接累加 | 求和前显式 Number()，并排除非数值列 |
| 只想重置某一列筛选却一直不生效 | 混淆了筛选和汇总/树结构 API 职责 | 分清 column-key、summary-method、span-method 各自负责什么 |
| 合并行列效果和预期不一致 | 没搞清 rowspan / colspan 返回值含义 | 先明确目标是横跨列还是纵跨行，再返回对应值 |
| 懒加载树形表格接上了但体验很怪 | 只做了 load，没设计 loading / 缓存策略 | 把懒加载作为下一步专项能力继续完善 |

## 延伸阅读

- 上一篇：[09-VTable高级列模板与展开行方案](09-VTable高级列模板与展开行方案.md)
- 下一篇：[11-VTable模块收尾与组件化设计总结](11-VTable模块收尾与组件化设计总结.md)
- 相关链接：[Element Plus Table](https://element-plus.org/en-US/component/table)、[Element Plus 树形/合计/合并](https://element-plus.org/zh-CN/component/table.html)、[JavaScript reduce()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce)
