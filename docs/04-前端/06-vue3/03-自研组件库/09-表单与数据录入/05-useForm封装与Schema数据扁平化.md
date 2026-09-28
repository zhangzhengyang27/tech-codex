---
title: useForm封装与Schema数据扁平化
description: "上一章把初始化和绑定逻辑直接写在 VForm 里，随着规则、扁平化等能力加入，组件会变重。本章把数据相关能力收口到一个 useForm composable：setForm 负责初始化值，setRules 负责初始化规则（规则部分留到下一章），flatObj 负责把嵌套 model 扁平化成提交所需的单层结构。重点讲清 setForm 与 flatObj 的职责分离、Date 对象扁平化的边界判断，以及\"formValue（对外扁平值）\"与\"model（内部嵌套值）\"的数据分层。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# useForm 封装与 Schema 数据扁平化

## 概述

上一章把初始化和绑定逻辑直接写在 `VForm` 里，随着规则、扁平化等能力加入，组件会变重。本章把数据相关能力收口到一个 `useForm` composable：`setForm` 负责初始化值，`setRules` 负责初始化规则（规则部分留到下一章），`flatObj` 负责把嵌套 `model` 扁平化成提交所需的单层结构。重点讲清 `setForm` 与 `flatObj` 的职责分离、Date 对象扁平化的边界判断，以及"formValue（对外扁平值）"与"model（内部嵌套值）"的数据分层。

## 学习目标

- 掌握用 `useForm` composable 收口初始化逻辑
- 理解 `setForm` 与 `flatObj` 的职责分离
- 掌握 `Object.keys(value).length > 0` 判断 Date 对象是否扁平化
- 区分 `formValue`（对外提交）与 `model`（内部嵌套）两层数据
- 认识扁平化时过滤内部辅助 key 的必要性
- 为下一章接入校验规则预留结构
- 理解 flatObj 对数组类型的处理边界
- 掌握用扁平结果对接接口提交的实践要点

---

## 一、把数据逻辑收口到 useForm

`VForm` 不应该既管渲染又管数据构建。`useForm(schema)` 把"根据 Schema 造数据"这件事独立成 composable，返回 `model`、`rules`、`formValue`。组件只负责消费这些返回值，`VForm` 因此更薄、更易测试，数据逻辑也能被其他场景（如弹窗表单、分步表单）复用。这是典型的"逻辑与视图分离"重构：先让能力跑通，再把横切逻辑抽出去。

## 二、setForm 与 flatObj 职责分离

`setForm` 的职责是"构建嵌套的初始 model"——遇到 `schema` 子结构就递归生成子对象，让表单内部可以用树状结构表达复杂字段。`flatObj` 的职责正好相反——"把嵌套对象压平成一层的提交结构"，遍历时若遇到非空对象就继续往下递归，直到落到真正的值。两者方向相反但互补：一个建树，一个拆树。把它们写成两个独立函数，调试时能立刻定位是"初始化错了"还是"提交结构错了"。

```ts
function flatObj(obj: Record<string, any>, result: Record<string, any> = {}) {
  if (!obj || typeof obj !== "object") return result
  for (const key in obj) {
    const value = obj[key]
    if (key.startsWith("form")) continue
    if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0) {
      flatObj(value, result)
    } else {
      result[key] = value
    }
  }
  return result
}
```

## 三、Date 对象扁平化的边界判断

`flatObj` 的判断里有一句关键：`Object.keys(value).length > 0`。它的作用是区分"真正的嵌套对象"和"看起来像对象但其实是一个值"的情况——最典型的就是 `Date`。`Date` 在 `typeof` 上也是 object，但它没有可枚举的自身 key 能表达成扁平字段，强行递归只会得到空。所以只有当对象有真实可枚举 key 时才继续递归，Date 这类值对象会直接落到 `result[key] = value`。这一步是扁平化里最容易踩的坑，判断条件必须保留。

## 四、formValue 与 model 的数据分层

组件内部维护的 `model` 是嵌套的、方便渲染和递归绑定的；对外暴露的 `formValue`（通常由 `computed(() => flatObj(model))` 得到）是扁平的、方便直接提交给后端的。两层数据各取所需：渲染读嵌套，提交读扁平。页面层通过 `v-model` 或 `update:modelValue` 拿到的应该是 `formValue`，而不是内部 `model`。这种分层避免了"为了提交方便而强迫渲染结构也扁平"的妥协。

## 五、扁平化时过滤内部辅助 key

Schema 驱动过程中，可能在 `model` 上临时挂一些以特定前缀（如 `form`）命名的辅助 key，用于内部追踪或联动状态，它们不属于业务数据。扁平化时通过 `if (key.startsWith("form")) continue` 跳过这些 key，保证提交给后端的数据干净。是否过滤、用什么前缀，应该在团队内约定清楚，避免误把辅助字段带进接口 payload。

## 六、flatObj 对数组类型的处理

判断里专门写 `!Array.isArray(value)`，是因为数组（如多选项 `string[]`、上传文件列表）在 `typeof` 上也是 object，但它不该被继续展开成多个平铺 key，否则会破坏"一个字段对应一个数组值"的语义。把数组当作叶子值直接落到 `result[key]`，既能保留数组本身，也不会把数组下标当成字段名。数组与 Date 一样，是"看起来像对象、实则是一个值"的典型，扁平化时必须显式排除。

## 七、完整 useForm 收口后的形态

把初始化、规则（占位）与扁平化合在一起，`useForm` 返回三个响应式值，组件只需消费：

```ts
export function useForm(schema: FormSchema[]) {
  const model = ref<Record<string, any>>(setForm(schema))
  const rules = ref(setRules(schema)) // 下一章实现
  const formValue = computed(() => flatObj(model.value))
  return { model, rules, formValue }
}
```

`VForm` 拿到这三个值后，把 `model` 绑到 `el-form`、把 `rules` 绑到 `el-form` 的 `:rules`、把 `formValue` 通过 `watch` 回写对外。数据逻辑完全在 composable 内闭环，组件只做"接线"。

## 八、扁平化与嵌套的取舍权衡

扁平化不是永远正确：当后端接口本来就接受嵌套结构（如 `address: { province, city }`），强行扁平反而要在提交前再组装回去，多此一举。取舍原则是"以接口契约为准"——接口要扁平就扁平，接口要嵌套就保留 `model` 直接提交。把 `flatObj` 作为"可选加工步骤"而非强制流程，能让 `useForm` 适应更多接口形态，而不是反过来绑架后端。

## 九、用扁平结果对接接口提交

当接口确实需要单层结构时，`formValue` 就是现成的 payload。提交函数只需 `await api.submit(formValue.value)`，不必在业务逻辑里再写一遍字段拍平。把"数据形态转换"收敛到 `useForm`，业务层保持干净，是这套设计最直接的收益。若接口要求部分字段保持嵌套，也可以在提交前对 `formValue` 做局部重组，而不是在 `flatObj` 里加特例。

## 十、为接入校验规则预留结构

`useForm` 此刻已经返回 `model` 和 `formValue`，但 `rules` 还是空壳。下一章会把 `setRules` 加进来并行于 `setForm`，让规则也由 Schema 驱动。当前把数据初始化单独收口，正是为了让规则初始化能无缝并入同一 composable——两个递归（`setForm` / `setRules`）共用 Schema 遍历逻辑，只是产出不同（值和规则）。结构提前分层，后续扩展才不伤筋动骨。

## 十一、数据层边界清单

把 `useForm` 这一层该守的边界收一下，避免它越界变成"什么都管"的大对象：

- `setForm` 只建树、`flatObj` 只拆树，两者职责严格分离，便于定位问题
- `flatObj` 必须排除 Date 与数组，否则值对象会被错误展开
- 内部辅助 key 用约定前缀（如 `form`）并在扁平化时跳过，保证提交干净
- `formValue` 与 `model` 分层：渲染读嵌套、提交读扁平，互不将就
- 扁平化是可选加工，以接口契约为准，不强制所有表单都拍平
- 规则初始化（`setRules`）与值初始化（`setForm`）共用遍历骨架，并行不悖

数据层是表单系统的"地基"，地基稳不稳直接决定后面校验、联动、提交的表现。把这一层收口干净，后续任何能力扩展都不会从数据侧引入混乱。

记住：`useForm` 只解决"数据怎么来、怎么平"，不替代业务层的提交逻辑。它把脏活揽走，业务层才能专心写"校验通过后干什么、失败怎么提示"。把职责切得这么干净，正是 composable 收口相比在组件里堆逻辑的最大收益。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `VForm` 又管渲染又管数据太重 | 数据逻辑没抽离 | 收口到 `useForm` composable |
| 扁平化把 Date 拆坏了 | 没区分值对象和嵌套对象 | 用 `Object.keys(value).length > 0` 判断 |
| 多选项数组被拆成下标 key | 没排除数组类型 | `!Array.isArray(value)` 显式排除 |
| 提交数据带了内部辅助字段 | 扁平化没过滤辅助 key | 过滤 `form` 前缀等内部 key |
| 渲染结构和提交结构互相将就 | 没做 formValue/model 分层 | 内部嵌套、对外扁平各一层 |
| 接口要嵌套却硬扁平 | 把扁平当成强制流程 | 以接口契约为准决定是否扁平 |
| 规则初始化无处安放 | 数据逻辑和规则逻辑混在一起 | 在 `useForm` 里并行加 `setRules` |

## 延伸阅读

- 上一篇：[04-Schema表单双向绑定与嵌套结构初始化](04-Schema表单双向绑定与嵌套结构初始化.md)
- 下一篇：[06-Schema表单校验与LayoutWrapper扩展](06-Schema表单校验与LayoutWrapper扩展.md)
- 相关链接：[Vue computed](https://cn.vuejs.org/guide/essentials/computed)、[Vue 组合式函数](https://cn.vuejs.org/guide/reusability/composables)
