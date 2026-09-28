---
title: "Vue3 中使用 TypeScript"
description: "Vue 3 中使用 TypeScript：Composition API 的类型推断与泛型约束、defineProps/defineEmits 类型声明、Todo 接口改造示例、vue-router 的 Router 与 RouteRecordRaw 类型，以及 TS 与 JS 的关系权衡。"
keywords: [TypeScript, Vue]
category: Vue
tags: [Vue, TypeScript]
---

# Vue3 中使用 TypeScript

TypeScript 是微软开发的 JavaScript 的超集，意思就是 TypeScript 在语法上完全包含 JavaScript。TypeScript 的主要作用是给 JavaScript 赋予强类型的语言环境。现在大部分的开源项目都是用 TypeScript 构建的，并且 Vue 3 本身 TS 的覆盖率也超过了 95%。

由于 TypeScript 中的每个变量都需要把类型定义好，因而对代码书写的要求也会提高。 **Vue 2 中全部属性都挂载在 this 之上，而 this 可以说是一个黑盒子，完全没办法预先知道 this 上会有什么数据，这也是 Vue 2 对 TypeScript 的支持一直不太好的原因**。

Vue 3 有了 Composition API 之后没有了 this 这个黑盒，对 TypeScript 的支持也比 Vue2 要好很多

```vue
<script setup lang="ts">
  import { ref } from 'vue'
  // 已启用类型推断

  const count = ref(1)
  count.value.split('') // => Property 'split' does not exist on type 'number'
</script>
```

在 `<script setup>` 的内部需要调整写法的内容不多。使用 Composition API 过程中，可以针对 ref 或者 reactive 进行类型推导。如果ref 包裹的是数字，那么在对 count.value 进行 split 函数操作的时候，TypeScript 就可以预先判断 `count.value` 是一个数字，并且进行报错提示

也可以显式地去规定 ref、reactive 和 computed 输入的属性，每个函数都可以使用默认的参数推导，也可以显式地通过泛型去限制。

```vue
<script setup lang="ts">
  import { computed, reactive, ref } from 'vue'
  
  interface course {
    name: string
    price: number
  }

  const msg = ref('') //  根据输入参数推导字符串类型
  const msg1 = ref<string>('') //  可以通过范型显示约束

  const obj = reactive({})
  const course1 = reactive<course>({name: 'Vue3', price: 129})

  const msg2 = computed(() => '') // 默认参数推导
  const course2 = computed<course>(() => {
    return {name: '玩转Vue3全家桶', price: 129}
  })
</script>
```

Vue 中除了组件内部数据的类型限制，还需要对传递的属性 Props 声明类型。在 `<script setup>` 语法中只需要在 defineProps 和 defineEmits 声明参数类型就可以了。下面的代码中声明了 title 属性必须是 string，可选属性 value 为 number 类型

```typescript
const props = defineProps<{
  title: string
  value?: number
}>()

const emit = defineEmits<{
  (e: 'update', value: number): void
}>()

```

对清单应用做一个 TypeScript 代码的改造。定义 Todo 这个接口

```typescript
import {ref, Ref} from 'vue'

interface Todo{
  title:string,
  done:boolean
}
let todos:Ref<Todo[]> = ref([{title:'学习Vue',done:false}])
```

vue-router 提供了 Router 和 RouteRecordRaw 这两个路由相关的类型，路由配置使用 RouteRecordRaw 来定义，返回的 router 实例使用类型 Router

```typescript
import { createRouter, createWebHashHistory, Router, RouteRecordRaw } from 'vue-router'
const routes: Array<RouteRecordRaw> = [
  ...
]

const router: Router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
```

项目目录下 `node\_modules/vue-router/dist/vue-router.d.ts`  文件，可以看到 vue-router 是一个组合类型，在这个类型的限制下，你在注册路由的时候，如果参数有漏写或者格式不对的情况，那就会在调试窗口里直接看到报错信息

```typescript
export declare type RouteRecordRaw = RouteRecordSingleView | RouteRecordMultipleViews | RouteRecordRedirect;

declare interface RouteRecordSingleView extends _RouteRecordBase {
    /**
     * Component to display when the URL matches this route.
     */
    component: RawRouteComponent;
    components?: never;
    /**
     * Allow passing down params as props to the component rendered by `router-view`.
     */
    props?: _RouteRecordProps;
}

```

## TS 和 JS 的平衡

**TypeScript 是 JavaScript 的一个超集，这两者并不是完全对立的关系。**学习 TypeScript 和学习 JavaScript 不是二选一的关系：打好坚实的 JavaScript 基础，在维护复杂项目和编写基础库的时候选择 TypeScript

TypeScript 最终还是要编译成为 JavaScript，并在浏览器里执行。对于浏览器厂商来说，引入类型系统的收益并不太高，毕竟编译需要时间。而过多的编译时间，会影响运行时的性能，所以未来 TypeScript 很难成为浏览器的语言标准
