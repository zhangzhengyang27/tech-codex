---
title: Vditor基础组件封装、默认配置合并与v-model联动
description: "选定 Vditor 后，下一步是把这个第三方实例型编辑器封装成 Vue 组件。Vditor 本质上和 ECharts、地图类库一样，是\"DOM 容器 + 第三方实例\"模式：模板留一个挂载节点，在 `onMounted()` 里手动 `new Vditor()`，在 `onBeforeUnmount()` 销毁实例。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Vditor 基础组件封装、默认配置合并与 v-model 联动

## 概述

选定 Vditor 后，下一步是把这个第三方实例型编辑器封装成 Vue 组件。Vditor 本质上和 ECharts、地图类库一样，是"DOM 容器 + 第三方实例"模式：模板留一个挂载节点，在 `onMounted()` 里手动 `new Vditor()`，在 `onBeforeUnmount()` 销毁实例。本文覆盖几个工程要点：用官方成品样式免 Less、挂载时 `cache.id` 的硬性要求、`IOptions` 类型与受控 props、`defaultOptions + Object.assign` 合并大配置对象、`v-model` 双向绑定且不破坏用户回调、外部回写时的差异判断，以及语言切换这类实例重建场景的正确恢复时机。

## 学习目标

- 理解 Vditor 在 Vue 中的封装本质是"容器 + 实例 + 生命周期管理"。
- 掌握用 `vditor/dist/index.css` 免 Less 接入，以及 `HTMLElement` 挂载时 `cache.id` 必填的约束。
- 能为组件导出一层受控 props 类型，而不是直接依赖包内部 `IOptions` 声明。
- 用 `defaultOptions + Object.assign` 合并大配置对象，而不是把所有默认值硬塞进 `withDefaults()`。
- 实现 `v-model` 双向绑定：内部同步内容且不吞掉用户 `after`/`input` 回调；外部回写做差异判断；语言切换在 `after` 恢复内容并清空历史栈。

---

## 一、Vue 接入方式：容器 + 实例 + 生命周期

Vditor 官方 README 的基本思路是：先在页面留挂载位置，再 `new Vditor(el, options)`。它和很多声明式 Vue 组件不同，本质是需要手动初始化的第三方实例型组件。所以最自然的封装是：模板提供 `ref` 容器、`onMounted()` 后初始化、`onBeforeUnmount()` 销毁。

```vue
<script setup lang="ts">
import { onMounted, ref, shallowRef } from "vue"
import Vditor from "vditor"
import "vditor/dist/index.css"

const editorRef = ref<HTMLDivElement>()
const editorInstance = shallowRef<Vditor>()

onMounted(() => {
  if (!editorRef.value) return
  editorInstance.value = new Vditor(editorRef.value, { mode: "ir", minHeight: 400 })
})
</script>
```

实例用 `shallowRef()` 保存，避免复杂第三方实例进入深层响应式系统。初始化时机必须放到 DOM 已挂载之后，容器节点本身不会自动变成编辑器，必须手动实例化。

## 二、dist/index.css 免 Less

源码示例里常见导入 Less，但项目不一定装了 Less 编译链。Vditor 官方同时提供现成 CSS 入口 `vditor/dist/index.css`，不想为了一个编辑器引入 Less，可以直接用成品样式。对大多数业务项目这是更省事的方案；只有后续要深度定制主题变量，才考虑走 Less 源码路线。样式入口放在组件内部导入一次即可。

## 三、HTMLElement 挂载时 cache.id 必填

课程里第一次初始化报错，根因就是没给缓存系统提供唯一标识。官方 API 明确：`id` 参数可传元素 `id` 或 `HTMLElement`，但若传 `HTMLElement` 且 `options.cache.enable` 没关，就必须设置 `options.cache.id`。这不是可选优化，而是在该用法下的硬性要求——缓存系统需要一个稳定 key 区分不同实例。不想处理也可以显式把 `cache.enable` 关掉；多实例场景下 `cache.id` 一定要唯一。

```ts
const cacheId = Math.random().toString(36).slice(2)
const options = { cache: { id: cacheId } }
```

## 四、IOptions 类型与受控 props

`dist/index.d.ts` 的构造函数参数是 `options?: IOptions`，但从主入口直接复用这个类型，在 Vue `defineProps()` 场景下并不一定顺手（内部类型通过 `/// <reference types="./types" />` 引用）。可行的折中有：复制一份类型文件、自己手写精简 props、或用三斜线引用内部类型再转成自己的导出类型。但这些都偏脆弱，依赖包内部声明结构。最稳妥的工程思路是：组件对外不要暴露整包所有复杂类型细节，根据项目实际需要封一层自己的 `EditorOptions`/`EditorProps`。

```ts
export type EditorOptions = IOptions
export interface EditorProps {
  options?: EditorOptions
}
```

## 五、defaultOptions + Object.assign 合并

Vditor 的 options 很大且多嵌套对象，如果硬塞进 `withDefaults()`，每个对象型默认值都要写成工厂函数，维护成本很高。更好的做法是准备一个 `defaultOptions`，初始化时用 `Object.assign(defaultOptions, props.options)` 统一合并。

```ts
const defaultOptions: EditorOptions = {
  mode: "ir",
  minHeight: 400,
  cache: { enable: true, id: Math.random().toString(36).slice(2) },
}

function initEditor(customOptions?: EditorOptions) {
  const options = Object.assign({}, defaultOptions, customOptions)
  editorInstance.value = new Vditor(editorRef.value!, options)
}
```

注意 `Object.assign()` 只做浅合并，嵌套对象层级更深时要注意覆盖行为；默认配置对象要尽量稳定，避免运行时被意外污染。复杂场景可考虑 `defu`、`lodash.merge` 这类更明确的深合并工具。

## 六、v-model 双向绑定与回调合并

Vditor 本身支持 `after`、`input` 回调。封装组件时如果直接覆盖它们，会出现"组件自己的 v-model 能同步，但用户传进来的原始回调失效"。正确写法是先缓存用户的 `after`/`input`，再包装成新回调，在内部回调里先执行用户逻辑再同步 `modelValue`。

```ts
const modelValue = defineModel<string>()

function buildOptions(customOptions?: EditorOptions): EditorOptions {
  const userAfter = customOptions?.after
  const userInput = customOptions?.input
  return Object.assign({}, defaultOptions, customOptions, {
    after: () => {
      userAfter?.()
      modelValue.value = editorInstance.value?.getValue() || ""
    },
    input: (value: string) => {
      userInput?.(value)
      modelValue.value = value
    },
  })
}
```

这类"先执行用户回调、再同步内部状态"的包装模式，在编辑器、图表、地图、上传组件里都非常常见。v-model 同步逻辑和用户自定义逻辑应该并存，不能互相吞掉。

## 七、外部回写的差异判断

从外部改 `modelValue` 回写编辑器时，不能无脑 `setValue()`，否则每次响应式变化都反复设置，导致光标跳动、历史栈污染。要先判断实例是否存在，再比较新值和当前编辑器内的值是否一致。

```ts
watch(modelValue, (newValue) => {
  if (!editorInstance.value || newValue == null) return
  const current = editorInstance.value.getValue()
  if (`${newValue}` === `${current}`) return
  editorInstance.value.setValue(`${newValue}`)
})
```

比较时统一转成字符串是最省心的兜底。"view -> model"和"model -> view"双向同步都要有去重逻辑，编辑器对 `setValue()` 非常敏感，滥用会影响光标和撤销栈。

## 八、语言切换等重建场景：after 恢复 + clearStack

当 `options` 里像 `lang` 这样的配置变化需要重建实例时，正确做法不是立即 `setValue()`，而是先保存旧值、销毁旧实例、用新配置重新初始化，再在新实例的 `after` 回调里 `setValue(history, true)`。因为实例刚创建时内部模式和渲染流程可能还没完全准备好，直接调用会出现 `currentMode` 相关报错。而 `after` 正是"异步渲染完成后的回调"，配合 `setValue(markdown, clearStack)` 的第二个参数 `true`，刚好能恢复旧内容并清空历史栈，避免把"切换语言"变成一次撤销记录。

```ts
watch(
  () => props.options,
  (newOptions) => {
    historyValue.value = editorInstance.value?.getValue() || ""
    editorInstance.value?.destroy()
    initEditor(newOptions)
  },
  { deep: true }
)
```

在 `after` 中若 `historyValue` 有值，就 `setValue(historyValue, true)` 并清空，既恢复内容又清掉程序性恢复产生的历史。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
| --- | --- | --- |
| 初始化报 `cache.id` 必填 | 用 HTMLElement 挂载且缓存默认开启 | 设置 `options.cache.id` 或显式关闭缓存 |
| 不想为编辑器装 Less | 照抄了源码样式导入方式 | 改用官方 `vditor/dist/index.css` |
| v-model 有了但用户 after/input 失效 | 包装时覆盖了原始回调 | 先缓存用户回调，再在包装回调里手动调用 |
| 切换语言直接 setValue 报错 | 新实例尚未完成初始化和模式准备 | 先保存旧值，在 `after` 回调中恢复 |
| 外部改值编辑器来回抖动 | 没比较新值和当前值 | watch(modelValue) 中先做差异判断 |
| 想复用完整 IOptions 但类型别扭 | 包内部类型组织与 defineProps 不完全契合 | 导出一层受控类型，或三斜线引用作项目内折中 |

## 延伸阅读

- 上一篇：[富文本编辑器选型对比与 Vditor 方案确定](01-富文本编辑器选型对比与Vditor方案确定.md)
- 下一篇：[Vditor 配置面板联动、动态表单扩展与响应式示例页](03-Vditor配置面板联动、动态表单扩展与响应式示例页.md)
