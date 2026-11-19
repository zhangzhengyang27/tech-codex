---
title: "Vue3 新特性以及 Vue2 升级"
description: "从 RFC 机制、Proxy 响应式、自定义渲染器、TypeScript 重构到 Composition API 与 Vite，梳理 Vue 3 的核心新特性；并讲解 Vue 2 项目升级到 Vue 3 的不兼容变更与 @vue/compat、gogocode 等自动化迁移工具。"
keywords: [Vue3, 新特性, 升级, Composition API, Vite]
category: Vue
tags: [Vue, Vue3, 迁移]
---

# Vue3 新特性以及 Vue2 升级

## Vue 2 的核心模块和历史遗留问题

Vue 2 是一个响应式驱动的、内置虚拟 DOM、组件化、面向浏览器开发的框架，内部由一个运行时把各模块管理起来。Vue 2 存在以下几类历史遗留问题，这也是 Vue 3 重构升级的直接动因：

- **类型系统层面**：Vue 2 使用 Flow.js 做类型校验，但 Flow.js 已停止维护，整个社区都在全面转向 TypeScript 构建基础库
- **跨端扩展层面**：Vue 2 内部运行时直接执行浏览器 API，这给跨端方案带来问题——要么直接进入 Vue 源码与 Vue 一起维护（如 Vue 2 中的 Weex 文件夹），要么复制一份完整 Vue 代码并把浏览器 API 替换为客户端或小程序的实现（如 mpvue 的做法），后者难以享受 Vue 后续的更新
- **响应式实现层面**：Vue 2 的响应式并非真正意义上的代理，而是基于 `Object.defineProperty()` 对某个属性进行拦截，存在诸多缺陷。例如删除数据无法被监听，需要 `$delete` 等 API 辅助
- **代码组织层面**：Options API 在组织较大组件时不易维护，所有 methods、computed 都在一个对象里配置。小应用尚可接受，但代码超过 300 行后，新增或修改一个功能需要不停地在 data、methods 之间跳转

## Vue3 新特性

Vue 3 继承了 Vue 2 响应式、虚拟 DOM、组件化等所有优秀特点，并在此基础上全部重新设计，解决了上述历史包袱。

### RFC 机制

Vue 的新语法或新功能的讨论，都会先在 [GitHub](https://github.com/vuejs/rfcs) 上公开征求意见，邀请社区所有人参与讨论。

这一机制让 Vue 社区更有活力：无论是 `<script setup>` 还是 Vue 3 引入的 ref API，都可以在这个项目中看到每个需求从诞生到最终被采纳的来龙去脉。

Vue 曾长期由尤雨溪个人维护，社区对其稳定性提出过不少质疑。后来项目吸纳了社区成员并成立 Core Team，Vue 3 在此基础上更进一步，全面拥抱社区，任何对 Vue 感兴趣的人都可以参与新特性的讨论。

### 响应式系统：Proxy 与 Object.defineProperty

Vue 2 的响应式机制基于 `Object.defineProperty()` 实现。`defineProperty` 和 `Proxy` 看起来都是对数据的读写进行拦截，但 `defineProperty` 拦截的是具体某个属性，`Proxy` 才是真正的"代理"。

`defineProperty` 的使用必须明确写在代码里：

```javascript
Object.defineProperty(obj, 'title', {
  get() {},
  set() {},
})
```

**当项目中"读取 obj.title"和"修改 obj.title"时会被 defineProperty 拦截，但 defineProperty 对不存在的属性无法拦截，所以 Vue 2 中所有数据必须要在 data 里声明。**

此外，如果 title 是一个数组，对数组的操作并不会改变 obj.title 的指向。虽然可以通过拦截 `.push` 等操作实现部分功能，但对数组长度的修改等操作仍无法实现拦截，因此 Vue 2 还需要额外的 `$set` 等 API。

`Proxy` 则是真正的代理，用法如下：

```javascript
new Proxy(obj, {
  get() { },
  set() { },
})
```

`Proxy` 拦截的是 obj 这个数据本身，不关心具体属性，统一全部拦截。`Proxy` 还可以监听更多数据格式，比如 Set、Map，这是 Vue 2 做不到的。当然，`Proxy` 存在一些兼容性问题。

在 `Proxy` 普及之前，没有办法完整地监听一个 JavaScript 对象的变化，只能使用 `Object.defineProperty()` 实现部分功能。前端框架利用浏览器的新特性完善自身，才会让前端生态更繁荣，抛弃旧浏览器是必然趋势。

### 自定义渲染器与 monorepo 架构

Vue 2 内部所有模块揉在一起，导致扩展性不佳。Vue 3 使用 monorepo 管理方式，响应式、编译和运行时全部独立，架构如下：

![image-20240306140554992](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403061405156.png)

在 Vue 3 的组织架构中，响应式被独立出来，甚至可以在 Node.js 和 React 中使用；而 Vue 2 的响应式只服务于 Vue 本身。

在这个架构下，Node 的一些库甚至 React 都可以依赖 Vue 3 的响应式。任何时候，只要希望数据被修改后能收到通知，就可以单独引入 Vue 3 的响应式模块。当需要用 Vue 3 开发小程序、canvas 小游戏以及客户端应用时，不再需要 fork 整个 Vue 的代码，只需实现对应平台的渲染逻辑即可。

### TypeScript 重构

Vue 2 的时代基本只有两个技术选型：Facebook 的 Flow.js 和微软的 TypeScript。Vue 2 选择 Flow.js 在当时没有问题，但如今 Flow.js 已被抛弃，Vue 3 选择了 TypeScript。

### Composition API 组合语法

Composition API 叫作组合 API。先看 Vue 2 中的简单例子——一个累加器，以及一个显示累加器乘以 2 的计算属性：

```html
<!DOCTYPE html>
<html lang="en">

  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue2的例子</title>
  </head>

  <body>
    <div id="app">
      <h1 @click="add">{{count}} * 2 = {{double}}</h1>
    </div>
    <script src="/vue.global.js"></script>
    <script>
      let App = {
        data() {
          return {
            count: 1
          }
        },
        methods: {
          add() {
            this.count++
          }
        },
        computed: {
          double() {
            return this.count * 2
          }
        }
      }
      Vue.createApp(App).mount('#app')
    </script>
  </body>

</html>
```

在 Vue 3 中，除了上述写法，还可以新增一个 setup 配置：

```html
<!DOCTYPE html>
<html lang="en">

  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Vue3的例子</title>
  </head>

  <body>
    <div id="app">
      <h1 @click="add">{{state.count}} * 2 = {{double}}</h1>
    </div>
    <script src="/vue.global.js"></script>
    <script>
      const {reactive, computed} = Vue
      let App = {
        setup() {
          const state = reactive({
            count: 1
          })

          function add() {
            state.count++
          }

          const double = computed(() => state.count * 2)
          return {state, add, double}
        }
      }
      Vue.createApp(App).mount('#app')
    </script>
  </body>

</html>
```

单看这个例子，Composition API 的写法看起来比 Vue 2 的 Options API 更烦琐。但 Options API 存在几个很严重的问题：

- 所有数据都挂载在 this 之上，对 TypeScript 的类型推导很不友好，并且不好做 Tree-shaking
- 新增功能基本都要修改 data、method 等配置
- 代码不好复用，Vue 2 的组件很难抽离通用逻辑，只能使用 mixin，还会带来命名冲突问题

使用 Composition API 后，虽然表面上烦琐了一些，但带来了诸多好处：

- 所有 API 都是 import 引入的，用到的功能都显式导入，对 Tree-shaking 很友好
- 把功能模块的 methods、data 都放在一起书写，维护更轻松
- 代码方便复用，可以把一个功能所有的 methods、data 封装在一个独立的函数里，复用非常容易
- Composition API 新增的 return 等语句，在实际项目中使用 `<script setup>` 特性可以省去

### 新的组件

Vue 3 还内置了 Fragment、Teleport 和 Suspense 三个新组件：

- Fragment：Vue 3 组件不再要求有唯一的根节点，清除了很多无用的占位 div
- Teleport：允许组件渲染在别的元素内，开发弹窗类组件时特别有用
- Suspense：异步组件，更方便开发包含异步请求的组件

### 工程化工具 Vite

Vite 不在 Vue 3 的代码包内，和 Vue 也不是强绑定关系。Vite 的竞品是 Webpack，且按照当前趋势，使用率超过 Webpack 只是时间问题。

Vite 主要提升的是开发体验。Webpack 等传统工程化工具的原理是根据 import 依赖逻辑形成一个依赖图，然后调用对应的处理工具，把整个项目打包后放在内存里再启动调试。由于要预打包，复杂项目的开发环境启动调试耗时 3 分钟很常见。

Vite 就是为解决这个时间消耗问题而出现的。现代浏览器已经默认支持 ES6 的 import 语法，Vite 正是基于这个原理实现：在调试环境下不做全量预打包，只按需获取首页依赖的文件，整个开发体验得到巨大提升，做到了复杂项目的秒级调试和热更新。

下图是 Vite 的工作原理：一开始就可以准备联调，然后根据首页的依赖模块按需加载，启动调试所需的资源大大减少。

![image-20240306141920310](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403061419435.png)

## Vue2 项目升级到 Vue3

Vue 2.7 会移植 Vue 3 的一些新特性，也能享受 Vue 3 的部分能力。在 Vue 2.7 发布之前，Vue 2 项目中需要基于 `@vue/composition-api` 插件才能使用 Composition API 语法；Vue 2.7 起这套 API 已直接内置，不再需要插件，在 Vue 2 中默认也可以用 Composition API 来组合代码。

### Vue 3 不兼容的写法

了解 Vue 3 不兼容的具体语法，一方面可以在升级项目后避免写出无法使用的代码，另一方面也有助于更好地适应 Vue 3。详细的兼容性变更可参考官方[迁移指南](https://v3-migration.vuejs.org/zh/)。

有 Vue 2 开发经验的开发者在全面迁移到 Vue 3 之前，不必完整阅读官方指南，因为 Vue 3 的大部分 API 都兼容 Vue 2。

在 Vue 2 中使用 `new Vue()` 新建应用，一些全局配置会直接挂在 Vue 上，通过 `Vue.use` 使用插件，通过 `Vue.component` 注册全局组件。这种形式很直接，但全局的 Vue 只有一个，在一个页面的多个应用中独立使用 Vue 会非常困难：

```javascript
Vue.component('el-counter', {
  data(){
    return {count: 1}
  },
  template: '<button @click="count++">Clicked {{ count }} times.</button>'
})

let VueRouter = require('vue-router')
Vue.use(VueRouter)
```

在 Vue 上注册了一个组件 `el-counter` 并创建了两个 Vue 实例，两个实例都拥有了 el-counter 这个组件，很容易造成混淆：

```javascript
Vue.component('el-counter',...)

new Vue({el:'#app1'})
new Vue({el:'#app2'})
```

为了解决这个问题，Vue 3 引入了新的 API createApp，即新增了 App 的概念。全局组件、插件都独立注册在这个 App 内部，很好地解决了多个实例容易混淆的问题：

```javascript
const { createApp } = Vue
const app = createApp({})
app.component(...)
app.use(...)
app.mount('#app1')

const app2 = createApp({})
app2.mount('#app2')
```

createApp 还移除了很多常见写法：createApp 中不再支持 filter、`$on`、`$off`、`$set`、`$delete` 等 API。

在 Vue 3 中，v-model 的用法也有更改。此外还有很多细节更新，例如 slot 和 slot-scope 实现了合并，directive 注册指令的 API 等也有变化。

### 自动化升级工具进行 Vue 的升级

小项目从 Vue 2 升级到 Vue 3 后，对语法的改变之处逐个替换即可。对于复杂项目，则需要借助自动化工具过渡。

Vue 3 项目中有一个 `@vue/compat` 库，这是一个提供 Vue 2 兼容行为的 Vue 3 构建版本。该版本默认运行在 Vue 2 模式下，大部分 API 与 Vue 2 保持一致；当使用在 Vue 3 中发生变化或废弃的特性时，会给出警告，从而避免兼容性问题，帮助项目迁移。并且通过升级提示信息，`@vue/compat` 还可以用于学习版本之间的差异。

下面的代码把项目依赖的 Vue 版本换成 Vue 3，并引入 `@vue/compat`：

```diff
"dependencies": {
  -  "vue": "^2.6.12",
  +  "vue": "^3.2.19",
  +  "@vue/compat": "^3.2.19"
  ...
},
"devDependencies": {
  -  "vue-template-compiler": "^2.6.12"
  +  "@vue/compiler-sfc": "^3.2.19"
}
```

然后给 vue 设置别名 @vue/compat，即以 compat 作为入口。这时控制台会出现很多警告和优化建议，参照建议逐项优化即可：

```javascript
// vue.config.js
module.exports = {
  chainWebpack: config => {
    config.resolve.alias.set('vue', '@vue/compat')
    // ......
  }
}
```

`@vue/compat` 给出建议后仍需要逐步手动修改。社区中还有能做自动化替换的工具，比较好用的是阿里出品的 [gogocode](https://gogocode.io/zh)，官方文档写得很详细。

自动化替换工具的原理和 Vue 的 Compiler 优化原理一致，即利用编译原理做代码替换。如下图所示，利用 babel 分析左侧 Vue 2 的源码，解析成 AST，然后根据 Vue 3 的写法对 AST 进行转换，最后生成新的 Vue 3 代码：

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403061431900.png)

## 小结

- Vue 2 的历史包袱集中在类型系统（Flow.js 停维）、跨端扩展（运行时耦合浏览器 API）、响应式实现（defineProperty 拦截缺陷）与代码组织（Options API 难复用）四个方面
- Vue 3 的核心新特性：RFC 开源决策机制、Proxy 真代理响应式、monorepo 架构下的自定义渲染器能力、TypeScript 重构、Composition API、Fragment/Teleport/Suspense 新组件与 Vite 工程化
- Composition API 表面上比 Options API 烦琐，但在 Tree-shaking、逻辑聚合与逻辑复用上优势明显
- Vue 2 升级 Vue 3 的主要不兼容点：`new Vue()` 变为 `createApp()`，移除 filter、`$on`、`$set` 等 API，v-model 与指令注册写法变更
- 复杂项目的迁移可借助 `@vue/compat` 兼容构建逐项消警，或使用 gogocode 这类基于 AST 的自动化替换工具
