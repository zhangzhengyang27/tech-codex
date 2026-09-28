---
title: VTable排序筛选与列默认配置
description: "沿 Element Plus Table 官方案例继续推进，重点从固定列、流体高度、多级表头切到了更贴近业务列表页的能力：排序与筛选。这两项在后台页面出现频率极高，直接关系到数据查找与对比效率。本章落地默认排序、标签列筛选、指定列筛选重置，并引入项目内部的列默认配置对象 columnDefaults 来减少重复。同时厘清几个易混点：default-sort 依赖列 sortable、clearFilter 吃的是 column-key 而非 row-key、filter-multiple 默认就是 true。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# VTable 排序筛选与列默认配置

## 概述

沿 Element Plus Table 官方案例继续推进，重点从固定列、流体高度、多级表头切到了更贴近业务列表页的能力：排序与筛选。这两项在后台页面出现频率极高，直接关系到数据查找与对比效率。本章落地默认排序、标签列筛选、指定列筛选重置，并引入项目内部的列默认配置对象 columnDefaults 来减少重复。同时厘清几个易混点：default-sort 依赖列 sortable、clearFilter 吃的是 column-key 而非 row-key、filter-multiple 默认就是 true。能力越接近"数据行为"，越要把基础组件边界和示例页逻辑分开。

## 学习目标

- 理解排序筛选是表格进入真实后台列表页的关键能力
- 掌握默认排序需同时满足列 sortable 与表格 default-sort 两个条件
- 用 filters、filter-method 加列配置组成筛选最小闭环
- 记住 clearFilter 依赖的是 column-key，不是 row-key
- 知道 filter-multiple 默认就是 true，不必无意义重复配置
- 用 columnDefaults 抽高频默认项，但不膨胀成巨型常量
- 区分基础表格与复杂表格示例，保持组件边界与示例页边界清晰

---

## 一、排序筛选是最先进入真实后台列表页的能力

固定列、流体高度、多级表头解决的是"怎么把数据陈列得清楚"；而排序和筛选解决的是"怎么帮用户在数据里找东西"。这两项能力在后台表格页出现频率极高，直接关系到数据查找效率、对比效率和检索体验。到这一步，VTable 已经不只是展示组件，而是开始承接数据探索能力，并且会反向影响列类型设计和事件透传设计。这两项能力越早接通，后面复杂列表页越容易落地。

## 二、默认排序需同时满足两个条件

给表格加 default-sort 还不够，要让默认排序真正生效，至少同时满足：目标列开启 sortable，且 default-sort.prop 指向这列的 prop。default-sort 只是告诉表格初始按哪一列、什么顺序排序，列本身仍然必须允许排序。

```vue
<VTable
  :columns="orderColumns"
  :data="tableData"
  :default-sort="{ prop: 'date', order: 'descending' }"
/>
```

```ts
const orderColumns = [
  { prop: "date", label: "Date", sortable: true },
  { prop: "name", label: "Name" },
  { prop: "address", label: "Address" }
]
```

default-sort 不是万能开关，它依赖目标列本身已启用排序；如果列没开 sortable，改多少 default-sort 都不会按预期工作，prop 名也必须和目标列字段对得上。

## 三、筛选最小闭环是三件事

筛选的核心结构非常清楚：filters 给用户看到的可选筛选项；filter-method 决定行是否通过筛选；列配置本身决定这个筛选挂在哪一列上。三者缺一不可。

```ts
const filterColumns: VTableColumnType[] = [
  {
    prop: "tag",
    label: "Tag",
    filters: [
      { text: "Home", value: "Home" },
      { text: "Office", value: "Office" }
    ],
    filterMethod: (value, row, column) => {
      const property = column.property as string
      return row[property] === value
    }
  }
]
```

filters 决定的是"能选什么"，不是"怎么筛"；真正的筛选逻辑在 filter-method。标签列是非常典型的筛选列案例。

## 四、clearFilter 依赖的是 column-key，不是 row-key

做筛选重置时，clearFilter(["date"]) 接收的是一组 columnKey。如果想只清除某一列筛选，关键在于给那一列设置 column-key，而不是给整张表设置 row-key。row-key 服务于行标识、树形表格、保留选中状态，和 clearFilter(["date"]) 并不是同一个问题。

```ts
const columns: VTableColumnType[] = [
  { prop: "date", label: "Date", columnKey: "date", filters: [...], filterMethod: ... }
]

tableRef.value?.clearFilter(["date"])
```

这类 API 名字很容易误导，一定要回到官方文档看它到底吃什么参数。column-key 是筛选列的标识，不是行标识，文档里要把这点写清楚。

## 五、filter-multiple 默认就是 true

有时候示例里筛选行为和官方显示不一致，需要区分两件事：哪些是官方默认行为，哪些是列配置里自己覆盖掉的。根据 Element Plus 官方 Table-column 文档，filter-multiple 默认值就是 true，所以只要你没有显式改掉，它本来就应该是多选筛选。

```ts
{
  prop: "tag",
  label: "Tag",
  filters: [...],
  filterMethod: ...
  // filterMultiple 不写，默认就是 true
}
```

不要为了"和官方示例一致"把所有默认值都手动再写一遍；先搞清楚当前行为是因为默认值，还是因为你自己的配置覆盖。列默认配置对象里也不应该盲目把所有可能属性都塞进去。

## 六、columnDefaults 只抽高频默认项，不要膨胀

尝试做一个 columnDefaults 方向本身是好的，因为很多列会共享一些默认规则。但 AI 生成出来的默认对象容易过度膨胀，把很多其实没有默认值的属性也塞进来，反而引入类型和行为上的困惑。正确思路是只抽那些在项目里确实高频重复、且真的想统一的默认项，而不是把官方所有列属性都复制一份当项目默认值。

```ts
const columnDefaults = {
  align: "left",
  headerAlign: "left",
  showOverflowTooltip: false
}

function setColumnDefault(column: VTableColumnType) {
  return { ...columnDefaults, ...column }
}
```

默认配置对象的目标是减少重复，而不是复刻整份官方 API。如果某个属性本身没有稳定默认值，就不应强塞进项目默认对象里。

## 七、排序筛选越接近数据行为，越要分开边界

这一节做了很多示例页切分：基础表格、复杂表格、排序、筛选。这背后的工程价值在于，有些能力只要透传 props 就够，有些能力已经需要额外页面状态、按钮和实例方法。如果把所有示例全堆在一个页面里，后面就很难分清是基础组件本身变复杂了，还是示例页逻辑变复杂了。基础组件要稳，复杂示例要分层，这样后续迭代才不会乱；排序、筛选、选择列、事件透传这些能力应该逐步推进，而不是一次性堆满。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 设了 default-sort 但页面没按预期排序 | 目标列没开 sortable | 同时保证列有 sortable，且 default-sort.prop 指向正确字段 |
| 点"重置某列筛选"报找不到列 | 给表格设了 row-key，却没给筛选列设 column-key | 记住 clearFilter 用的是 column-key |
| 筛选默认变成单选 | 误以为必须额外配置 filter-multiple | 当前官方默认值就是 true，先检查是否被别处覆盖 |
| columnDefaults 越写越巨大 | 把官方所有列属性都抄进默认对象 | 只保留项目内真正高频复用的默认项 |
| 排序筛选选择列堆在一个示例页越来越乱 | 没把基础和复杂案例分层 | 基础表格、复杂表格、排序筛选案例分开组织 |
| AI 生成的默认配置对象行为很怪 | 没核对哪些属性根本没有稳定默认值 | 对照官方文档和实际项目需要手动裁剪 |

## 延伸阅读

- 上一篇：[07-VTable实例方法透传与选择列控制](07-VTable实例方法透传与选择列控制.md)
- 下一篇：[09-VTable高级列模板与展开行方案](09-VTable高级列模板与展开行方案.md)
- 相关链接：[Element Plus 排序与筛选](https://element-plus.org/zh-CN/component/table.html)、[Element Plus Table-column API](https://element-plus.org/en-US/component/table)、[Vue 计算属性](https://cn.vuejs.org/guide/essentials/computed)
