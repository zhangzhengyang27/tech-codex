---
title: Schema表单校验与LayoutWrapper扩展
description: "表单能渲染、能绑定值还不够，\"能校验、能提交\"才是业务闭环。本章把校验规则也推进 Schema：每个字段用 rules（字段级 FormItemRule[]）描述自己的规则，再用 setRules 递归汇总成整张表单的 FormRules；随后通过 FormInstance.validate() 在提交时兜底校验。同时讨论多层组件默认值对齐、Select 初值用 undefined 更稳的坑，以及 ElSpace 这类\"包裹整个 FormItem\"的需求引出更外层的 LayoutWrapper。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Schema 表单校验与 LayoutWrapper 扩展

## 概述

表单能渲染、能绑定值还不够，"能校验、能提交"才是业务闭环。本章把校验规则也推进 Schema：每个字段用 `rules`（字段级 `FormItemRule[]`）描述自己的规则，再用 `setRules` 递归汇总成整张表单的 `FormRules`；随后通过 `FormInstance.validate()` 在提交时兜底校验。同时讨论多层组件默认值对齐、`Select` 初值用 `undefined` 更稳的坑，以及 `ElSpace` 这类"包裹整个 FormItem"的需求引出更外层的 `LayoutWrapper`。

## 学习目标

- 理解为什么规则也要进 Schema 才算完整配置驱动
- 掌握 `schema.rules` 用字段级 `FormItemRule[]` 而非整表 `FormRules`
- 掌握 `setRules` 递归汇总整表规则的写法
- 用 `FormInstance.validate()` 在提交流程中兜底校验
- 认识多层组件默认值漂移导致的校验错觉
- 理解 `ElSpace` 引出更外层的 `LayoutWrapper` 抽象
- 掌握 Select 初值语义用 undefined 更稳的细节
- 接入 status-icon 等校验增强属性
- 用一个最小实战串起校验与提交

---

## 一、规则进 Schema 才算真正配置驱动

前面 `setForm` 解决了动态值、`VFormItem` 解决了动态控件，但如果 `rules` 仍然游离在 Schema 之外手写一大坨，这个表单就还是"半手工"状态——设计器无法编辑规则，服务端也无法下发规则。把规则收进每个字段的 `rules`，Schema 才真正成为表单的唯一真相来源。这一步不是锦上添花，而是 Schema Form 真正成型的标志。

## 二、schema.rules 用字段级 FormItemRule

Schema 是按字段组织的，所以每一项上的 `rules` 也应该只描述"自己这一个字段"。Element Plus 提供的 `FormItemRule` 正是单字段规则片段（`required`、`message`、`trigger` 等），而整表的 `FormRules` 是 `Record<field, FormItemRule[]>`。让 `FormSchema.rules?: FormItemRule[]`，粒度与字段对齐，后续汇总逻辑也更自然。不要在一开始就把整表规则摊进单个字段配置。

```ts
export interface FormSchema extends Partial<FormItemProps> {
  field?: string
  rules?: FormItemRule[]
}
```

## 三、setRules 递归汇总整表规则

与 `setForm` 平行，再加一个 `setRules` 递归：遍历 Schema，若某项有 `field` 且 `rules`，就把 `rules` 挂到 `formRules[field]`；若该项有 `schema` 子结构，则递归合并子结构的规则。两个递归共用"遍历 Schema"的骨架，只是产出不同（值和规则）。数据初始化与规则初始化拆开，调试时能立刻分清是"值有问题"还是"规则没生成"。

```ts
function setRules(arr: FormSchema[]) {
  const formRules: Record<string, FormItemRule[]> = {}
  arr.forEach((item) => {
    if (item.field && item.rules) formRules[item.field] = item.rules
    if (item.schema?.length) Object.assign(formRules, setRules(item.schema))
  })
  return formRules
}
```

## 四、validate() 兜底整表校验

生成 `rules` 并绑到 `el-form` 只是第一步，字段级错误提示会出现，但提交逻辑仍不完整。必须在提交流程里拿到 `FormInstance` 调 `await formRef.value.validate()`，校验不过就拦截提交。字段级提示是"边填边提示"，整表 `validate` 是"提交兜底"，两者缺一不可。接入 `FormInstance` 意味着 Schema Form 正式进入"可提交、可校验"的业务阶段。

```ts
const formRef = ref<FormInstance>()

async function handleSubmit() {
  if (!formRef.value) return
  // validate() 校验失败时会 reject，需 catch 住转成 false
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  // 校验通过，提交 formValue
}
```

## 五、多层默认值不对齐会产生校验错觉

动态表单里 `VForm`、`VFormItem`、布局层可能各自带 `showMessage`、`required` 等默认值。如果某一层没对齐，会出现"字段明明配了 required，渲染出来却不校验"的错觉。根因往往不是规则本身，而是中间层默认值漂移。动态表单比静态表单更依赖默认值一致性，只要多层包裹组件参与渲染，就要统一默认策略，避免行为偏掉。

## 六、Select 初值用 undefined 比空串更稳

`Select`、日期类控件用空字符串 `""` 初始化时，在某些状态下会触发不自然的校验或展示表现——空串看起来像一个"真实的空值"，而 `undefined` 更像"未选择"。阶段性更稳的做法是：若控件类型是 select 且初值为空串，内部初始化成 `undefined`。这是组件级兼容优化，不是最终数据规范，等行为和类型策略稳定后再收紧也不迟。

```ts
if (props.item.type === "select" && props.item.value === "") {
  modelValue.value = undefined
}
```

## 七、status-icon 等校验增强属性的接入

Element Plus 还提供 `status-icon`（在输入框右侧显示校验状态图标）、`scroll-to-error`（校验失败滚动到第一个错误项）等增强属性。它们本质是 `el-form` 的 props，既然 `VForm` 已继承 `FormProps`，这些属性可以原样透传给页面层配置，无需额外封装。要分清"组件级别该内置的默认值"（如 `showMessage`）和"交给页面层按需开关的增强项"（如 `status-icon`），后者保持透传即可。

## 八、ElSpace 引出更外层的 LayoutWrapper

`VFormLayout` 处理的是 FormItem 内部的列布局，但像 `ElSpace` 这种能力包的是"整个 FormItem 外面"，职责比内部布局更外层。这说明表单布局一旦复杂，至少需要两层抽象：内层 `VFormLayout` 管字段内列排布，外层 `LayoutWrapper` 管 FormItem 之间的包裹与间距。不要把所有布局都压在 `VFormLayout` 上，`Wrapper` 与 `Layout` 要分层，这是 Schema Form 往更复杂布局演进的自然方向。

## 九、最小实战：校验与提交联动

把规则、实例、`watch` 回写串起来，一个最小可提交的 Schema Form 大致是这样：Schema 里给字段配 `rules`；`useForm` 用 `setRules` 生成 `rules` 绑到 `el-form`；用户改动经 `watch` 回写 `formValue`；提交按钮里 `await formRef.validate()` 通过后拿 `formValue` 调接口。这条链路跑通，表单才从"能渲染"真正变成"能上线"。

## 十、校验能力边界清单

把本章关于校验的结论固化，避免规则散落或默认值漂移：

- 规则进 Schema：`schema.rules` 用字段级 `FormItemRule[]`，整表规则由 `setRules` 汇总
- 字段级提示与整表 `validate` 兜底缺一不可，少一个都不是完整校验
- 多层组件（`VForm`/`VFormItem`/布局）默认值必须对齐，否则出现校验错觉
- `Select` 等控件初值用 `undefined` 比空串更稳，避免语义误判
- 增强属性（`status-icon` 等）保持透传，不内置为默认值
- 外层包装需求（如 `ElSpace`）引出更外层的 `LayoutWrapper`，不与内层布局混写

校验是表单从"能渲染"迈向"能上线"的关键一跃。规则能否进 Schema、能否被统一汇总与触发，直接决定了这套表单系统是否真的"配置驱动"，还是只是换了种写法继续半手工。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 规则写进 Schema 却没法统一校验 | 没走 `validate()` 整表链路 | 提交时显式调 `formRef.validate()` |
| 选择类组件初始状态异常 | 空串初始化语义不像"未选择" | 内部初始化成 `undefined` |
| 动态表单 `required` 表现不一致 | 各层默认值没对齐 | 统一 `VForm`/`VFormItem`/布局层默认 |
| `schema.rules` 越写越乱 | 单字段与整表规则混写 | 保持字段级 `rules`，`setRules` 汇总 |
| 想塞 `ElSpace` 却无处放 | 混淆内层布局与外层包装 | 后续引入 `LayoutWrapper` |
| 增强属性要不要内置 | 没分清默认值与透传项 | 增强项保持透传，不内置 |

## 延伸阅读

- 上一篇：[05-useForm封装与Schema数据扁平化](05-useForm封装与Schema数据扁平化.md)
- 下一篇：[07-VFormItem事件透传与实例暴露](07-VFormItem事件透传与实例暴露.md)
- 相关链接：[Element Plus Form](https://element-plus.org/en-US/component/form)、[Element Plus Space](https://element-plus.org/en-US/component/space)
