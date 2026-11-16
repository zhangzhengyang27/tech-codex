---
title: Vue 中的 TypeScript
description: "Vue 3 + TypeScript 实践:defineComponent 与组件类型推导、script setup 泛型组件、defineProps/withDefaults 的 Props 类型、defineEmits 事件类型、响应式 API 类型标注,以及最佳实践清单。"
version: 1.0
author: 文档维护组
created: 2026-11-14
updated: 2026-11-14
status: 正式
category: TypeScript
---

# Vue 中的 TypeScript

Vue 3 的核心用 TypeScript 重写,组合式 API 天然贴合类型推导:`ref`、`computed` 等函数的返回值类型自动收窄,模板层配合 Volar 可获得完整的类型检查。本章以 `<script setup>` 为主线,覆盖组件类型、Props、Emit、泛型组件与工程实践。

> 版本说明:本文基于 Vue 3.3+(`defineProps` 泛型、`defineSlots` 等在此后完善),大方向适用于整个 Vue 3.x。

## 环境与语言服务

```bash
npm create vue@latest   # 官方脚手架,勾选 TypeScript 即得完整配置
```

工程上需要两件套:

1. **vue-tsc**:基于 Volar 的命令行类型检查器,`vue-tsc --noEmit` 会连同 `.vue` 文件的模板表达式一起检查。
2. **Volar(Vue - Official 扩展)**:编辑器内的语言服务,提供模板内的类型提示与跳转。旧工具 Vetur 已停止维护,需要卸载避免冲突。

::: warning 用 vue-tsc 而不是裸 tsc
`tsc` 不认识 `.vue` 单文件组件,`import App from './App.vue'` 会直接报"找不到模块"。构建检查一律使用 `vue-tsc`,同时通过 `env.d.ts` 中的 `/// <reference types="vite/client" />` 让 TS 识别 `.vue` 模块声明。
:::

## defineComponent 与组件类型

不用 `<script setup>` 时,`defineComponent` 让对象选项获得完整推导:

```ts
import { defineComponent, ref, onMounted } from 'vue';

export default defineComponent({
  props: {
    title: String,
    count: { type: Number, required: true },
  },
  setup(props) {
    // props 被自动推导为 { title?: string; count: number }
    const count = ref(props.count); // Ref<number>
    onMounted(() => console.log(count.value));
    return { count };
  },
});
```

`defineComponent` 返回的组件类型会保留 props、emits、slots 的信息,因此父组件模板中使用该组件时,属性与事件都能获得检查。

## setup 语法糖与 Props 类型

`<script setup>` 下 Props 通过 `defineProps` 的**泛型参数**声明,这是 Vue 3 + TS 的推荐写法:

```vue
<script setup lang="ts">
// 仅类型声明:编译期生成运行时校验,运行时零开销
interface Props {
  title: string;
  count?: number;
  tags: string[];
  status: 'draft' | 'published';
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
});

props.status; // 'draft' | 'published',字面量类型保留
</script>
```

要点:

- 泛型里直接写 TS 类型,联合类型、字面量类型都会原样保留,比运行时 `type: Number` 表达力强得多。
- **默认值交给 `withDefaults`**(Vue 3.5 起也可用响应式 Props 解构默认值,见下)。
- 若需要基于类型生成运行时校验,Vue 编译器会做类型到 props 定义的转换;不支持的复杂类型(如函数类型之外的自定义类)需要回退到运行时声明。

```ts
// 运行时声明 + PropType:需要复用复杂类型时的兜底写法
import type { PropType } from 'vue';

interface User {
  id: string;
  name: string;
}

defineProps({
  user: {
    type: Object as PropType<User>,
    required: true,
  },
  onChange: Function as PropType<(val: string) => void>,
});
```

::: tip Vue 3.5+ 响应式 Props 解构
Vue 3.5 起 `const { count = 0 } = defineProps<Props>()` 解构写法被正式支持,默认值写在解构处即可,`withDefaults` 逐渐退居二线。老项目升级时两种写法可以共存。
:::

## Emit 类型

`defineEmits` 同样推荐泛型写法,用**具名元组**约束事件名与参数:

```vue
<script setup lang="ts">
const emit = defineEmits<{
  change: [value: string, index: number]; // 事件名: [参数列表]
  submit: [];
}>();

function handleChange(v: string, i: number) {
  emit('change', v, i); // 参数类型被检查,写错编译报错
  // emit('change', 123)  ❌ 编译错误
}
</script>
```

旧式联合签名写法仍可用,但参数类型关联能力弱,新项目建议用具名元组:

```ts
// 旧写法:(event: 'change', value: string): void 的函数重载形式
const emit = defineEmits<{
  (e: 'change', value: string): void;
}>();
```

## 泛型组件

`<script setup>` 支持 `generic` 属性,让组件像函数一样接收类型参数——典型场景是通用列表、选择器:

```vue
<!-- SelectList.vue -->
<script setup lang="ts" generic="T extends { id: string }">
import type { PropType } from 'vue';

defineProps<{
  items: T[];
  modelValue: T | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: T];
}>();
</script>

<template>
  <ul>
    <li
      v-for="item in items"
      :key="item.id"
      @click="emit('update:modelValue', item)"
    >
      <slot :item="item" />
    </li>
  </ul>
</template>
```

父组件使用时,`T` 会根据传入的 `items` 自动推断,选中项类型同步收窄:

```vue
<script setup lang="ts">
// items 是 User[] 时,modelValue 就是 User | null
</script>
```

::: tip 泛型组件与 defineExpose
`generic` 属性中可以使用 `defineProps` 的类型参数做约束(`generic="T extends { id: string }"`),也可以写多个类型参数 `generic="K, V"`。目前泛型组件需要配合 Volar / vue-tsc 才有完整推导,纯运行时无感知。
:::

## 响应式 API 的类型

```ts
import { ref, reactive, computed, shallowRef } from 'vue';

// ref:自动推导,或显式标注复杂类型
const count = ref(0);                  // Ref<number>
const user = ref<User | null>(null);   // Ref<User | null>

// ❌ ref<HTMLDivElement>() 会把初始 undefined 收窄丢失,DOM 元素用 HTMLElement | null
const el = ref<HTMLDivElement | null>(null); // 模板 ref 标准写法

// reactive:传入什么类型就是什么类型,建议用接口约束
interface FormState {
  name: string;
  age: number;
}
const form = reactive<FormState>({ name: '', age: 0 });

// computed:返回值自动推导为 ComputedRef<string>
const greeting = computed(() => `Hello, ${form.name}`);

// shallowRef:大对象性能优化,类型同 ref
const bigList = shallowRef<Item[]>([]);
```

::: warning reactive 丢失类型信息的两个坑
- 对 `reactive` 返回值做解构或展开,得到的变量不再是响应式代理,类型虽在但响应性断裂,应统一使用 `toRefs`。
- `reactive` 不要标注联合类型(如 `FormState | null`),会导致 `.value` 访问链上的类型收窄失效;可空状态交给 `ref`。
:::

## defineSlots 与插槽类型

Vue 3.3+ 可用 `defineSlots` 给插槽签名:

```vue
<script setup lang="ts">
defineSlots<{
  default(item: { row: User; index: number }): any;
  header?: () => any;
}>();
</script>
```

该类型主要作用于编辑器提示与 Volar 检查,不影响运行时。

## 最佳实践清单

1. **组件统一 `<script setup lang="ts">`**:类型声明最短、推导最完整,放弃 `defineComponent` 对象式写法(仅写库时保留)。
2. **Props 用泛型 + 接口**:把领域模型(`interface User`)复用到 Props,避免运行时声明与类型两套维护;需要运行时校验再回退 `PropType`。
3. **Emit 用具名元组**:事件参数一目了然,模板中监听事件也有类型检查。
4. **模板 ref 统一 `ref<HTMLElement | null>(null)`**:初始值为 `null`,挂载后自动收窄。
5. **可空状态用 `ref` 而非 `reactive`**:保证类型收窄(`if (user.value)`)正常工作。
6. **CI 里跑 `vue-tsc --noEmit`**:把 `.vue` 模板纳入类型检查范围,否则一半代码裸奔。
7. **类型与值分离导入**:`import type` 引入纯类型,避免运行时打包被误引入。

## 小结

- `defineProps` 泛型是 Props 类型化的主路径,`withDefaults`(或 3.5 解构默认值)补默认值,`PropType` 做运行时兜底。
- `defineEmits` 用具名元组约束事件参数;`defineSlots` 给插槽签名。
- `generic` 属性让 `<script setup>` 支持泛型组件,类型随 props 自动推断。
- `ref`/`reactive`/`computed` 自动推导为主,模板 ref 与可空状态遵循固定范式。
- 工程闭环靠 Volar + `vue-tsc --noEmit`,缺一不可。

## 延伸阅读

- [01-React 中的 TypeScript](01-React 中的 TypeScript) — 另一大框架的类型接入方式,对照阅读理解"框架如何承载类型"
- [02-泛型](../02-类型系统/02-泛型) — 泛型组件的类型基础
- [03-any-unknown-never](../02-类型系统/03-any-unknown-never) — 处理模板事件对象时的类型收窄依据
- [02-TSConfig配置-构建](../04-工程化实践/02-TSConfig配置-构建) — Vue 项目 tsconfig 的编译配置细节
- [Vue 官方 TypeScript 指南](https://vuejs.org/guide/typescript/overview.html)
