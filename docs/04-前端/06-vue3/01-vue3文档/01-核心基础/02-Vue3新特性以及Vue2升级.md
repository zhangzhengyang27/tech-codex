---
title: "Vue3 新特性以及 Vue2 升级"
description: "从 RFC 机制、Proxy 响应式、自定义渲染器、TypeScript 重构到 Composition API 与 Vite，梳理 Vue 3 的核心新特性；并讲解 Vue 2 项目升级到 Vue 3 的不兼容变更与 @vue/compat、gogocode 等自动化迁移工具。"
keywords: [Vue3, 新特性, 升级, Composition API, Vite]
category: Vue
tags: [Vue, Vue3, 迁移]
---

# Vue3 新特性以及 Vue2 升级

## Vue 2 的核心模块和历史遗留问题

Vue 2 是一个响应式驱动的、内置虚拟 DOM、组件化、用在浏览器开发，并且有一个运行时把这些模块很好地管理起来的框架。不过 Vue 2 还是有缺陷的，所以后面才会升级迭代

- 从开发维护的角度看，使用 Flow.js 来做类型校验。但现在 Flow.js 已经停止维护了，整个社区都在全面使用 TypeScript 来构建基础库
- 然后从社区的二次开发难度来说，Vue 2 内部运行时，是直接执行浏览器 API 的。但这样就会在 Vue 2 的跨端方案中带来问题，要么直接进入 Vue 源码中，和 Vue 一起维护，比如 Vue 2 中你就能见到 Weex 的文件夹。要么是要直接改为复制一份全部 Vue 的代码，把浏览器 API 换成客户端或者小程序的。比如 mpvue 就是这么做的，但是 Vue 后续的更新就很难享受到
- 从开发者的角度来说，Vue 2 响应式并不是真正意义上的代理，而是基于 Object.defineProperty() 实现的。这个 API 并不是代理，而是对某个属性进行拦截，所以有很多缺陷，比如：删除数据就无法监听，需要 `$delete` 等 API 辅助才能监听到
- Options API 在组织代码较多组件的时候不易维护。所有的 methods、computed 都在一个对象里配置，这对小应用来说还好。但代码超过 300 行的时候，新增或者修改一个功能，就需要不停地在 data、methods 里跳转写代码

## Vue3 新特性

Vue 3 就是继承了 Vue 2 具有的响应式、虚拟 DOM，组件化等所有优秀的特点，并且全部重新设计，解决了这些历史包袱的新框架，是一个拥抱未来的前端框架

### RFC 机制

关于 Vue 的新语法或者新功能的讨论，都会先在 [GitHub](https://github.com/vuejs/rfcs) 上公开征求意见，邀请社区所有的人一起讨论

这个改变让 Vue 社区更加有活力，不管是 `<script setup>` 还是 Vue 3 引入的 ref API，都可以在这个项目中看到每个需求从诞生到最终被 Vue 采纳的来龙去脉

Vue 很长一段时间都是尤雨溪一个人维护，社区也有很多人对 Vue 的稳定性提出质疑。后来尤雨溪吸纳了社区的人，并成立了 Core Team。Vue 3 在此基础之上更进一步，全面拥抱社区，任何对 Vue 感兴趣的人都可以参与新特性的讨论

### 响应式系统

Vue2 的响应式机制是基于 Object.defineProperty() 这个 API 实现的，此外，Vue 还使用了 Proxy，这两者看起来都像是对数据的读写进行拦截，但是 defineProperty 是拦截具体某个属性，Proxy 才是真正的“代理”

首先看 defineProperty 这个 API，defineProperty 的使用，要明确地写在代码里，下面是示例代码：

```javascript
Object.defineProperty(obj, 'title', {
  get() {},
  set() {},
})
```

**当项目里“读取 obj.title”和“修改 obj.title”的时候被 defineProperty 拦截，但 defineProperty 对不存在的属性无法拦截，所以 Vue 2 中所有数据必须要在 data 里声明**

而且，如果 title 是一个数组的时候，对数组的操作，并不会改变 obj.title 的指向，虽然可以通过拦截 `.push` 等操作实现部分功能，但是对数组的长度的修改等操作还是无法实现拦截，所以还需要额外的 $set 等 API

而 Proxy 这个 API 就是真正的代理了，我们先看它的用法：

```javascript
new Proxy(obj, {
  get() { },
  set() { },
})
```

虽然 Proxy 拦截 obj 这个数据，但 obj 具体是什么属性，Proxy 则不关心，统一都拦截了。而且 Proxy 还可以监听更多的数据格式，比如 Set、Map，这是 Vue2 做不到的。当然，Proxy 存在一些兼容性问题

在 Proxy 普及之前，是没有办法完整的监听一个 JavaScript 对象的变化，只能使用 Object.defineProperty() 去实现一部分功能。前端框架利用浏览器的新特性来完善自己，才会让前端这个生态更繁荣，抛弃旧的浏览器是早晚的事

### 自定义渲染器

Vue2 内部所有的模块都是揉在一起的，这样做会导致不好扩展的问题。Vue3 使用最近流行的 monorepo 管理方式，响应式、编译和运行时全部独立了，变成下图所示的模样

![image-20240306140554992](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403061405156.png)

在 Vue 3 的组织架构中，响应式独立了出来，甚至可以在 Node.js 和 React 中使用响应式。而 Vue 2 的响应式只服务于 Vue

在这个架构下，Node 的一些库，甚至 React 都可以依赖响应式。在任何时候，如果你希望数据被修改了之后能通知你，你都可以单独依赖 Vue 3 的响应式。那么，在你想使用 Vue 3 开发小程序、开发 canvas 小游戏以及开发客户端的时候，就不用全部 fork Vue 的代码，只需要实现平台的渲染逻辑就可以

### TypeScript 重构

Vue2 那个时代基本只有两个技术选型，Facebook 的 Flow.js 和微软的 TypeScript。Vue 2 选 Flow.js 没问题，但是现在 `Flow.js` 被抛弃了。Vue 3 选择了 TypeScript

### Composition API 组合语法

Composition API 叫作组合 API。先举个 Vue 2 中的简单例子，一个累加器，并且还有一个计算属性显示累加器乘以 2 的结果

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

在 Vue 3 中，除了上面这种这个写法，我们还可以采用下方的写法，新增一个 setup 配置

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

使用 Composition API 后，代码看起来很烦琐，没有 Vue 2 中 Options API 的写法简单好懂，但 Options API 的写法也有几个很严重的问题：

- 所有数据都挂载在 this 之上，对 TypeScript 的类型推导很不友好，并且不好做 Tree-shaking
- 新增功能基本都得修改 data、method 等配置
- 代码不好复用，Vue 2 的组件很难抽离通用逻辑，只能使用 mixin，还会带来命名冲突的问题

使用 Composition API 后，虽然看起来烦琐了一些，但是带来了诸多好处

- 所有 API 都是 import 引入的。用到的功能都 import 进来，对 Tree-shaking 很友好
- 把功能模块的 methods、data 都放在一起书写，维护更轻松
- 代码方便复用，可以把一个功能所有的 methods、data 封装在一个独立的函数里，复用代码非常容易
- Composition API 新增的 return 等语句，在实际项目中使用 `<script setup>` 特性可以省去，我们后续项目中都会用到这样的操作

### 新的组件

Vue 3 还内置了 Fragment、Teleport 和 Suspense 三个新组件

- Fragment: Vue 3 组件不再要求有一个唯一的根节点，清除了很多无用的占位 div
- Teleport: 允许组件渲染在别的元素内，主要开发弹窗组件的时候特别有用
- Suspense: 异步组件，更方便开发有异步请求的组件

### 工程化工具 Vite

Vite  不在 Vue 3 的代码包内，和 Vue 也不是强绑定，Vite 的竞品是 Webpack，而且按照现在的趋势看，使用率超过 `Webpack` 也是早晚的事

Vite 主要提升的是开发的体验，Webpack 等工程化工具的原理，就是根据你的 import 依赖逻辑，形成一个依赖图，然后调用对应的处理工具，把整个项目打包后，放在内存里再启动调试

由于要预打包，所以复杂项目的开发，启动调试环境需要 3 分钟都很常见，Vite 就是为了解决这个时间资源的消耗问题出现的。现代浏览器已经默认支持了 ES6 的 import 语法，Vite 就是基于这个原理来实现的。具体来说，在调试环境下，不需要全部预打包，只是把你首页依赖的文件，依次通过网络请求去获取，整个开发体验得到巨大提升，做到了复杂项目的秒级调试和热更新

而下图所示的是 Vite 的工作原理，一开始就可以准备联调，然后根据首页的依赖模块，再去按需加载，这样启动调试所需要的资源会大大减少

![image-20240306141920310](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403061419435.png)

## Vue2 项目升级到 Vue3

Vue 2.7 会移植 Vue 3 的一些新特性，也能享受 Vue 3 的部分新特性。在 Vue 2.7 发布之前，Vue 2 项目中需要基于 `@vue/composition-api` 插件才能使用 Composition API 语法；Vue 2.7 起这套 API 已直接内置，不再需要插件，在 Vue 2 中默认也可以用 Composition API 来组合代码

### Vue 3 不兼容的写法

了解一下 Vue 3 不兼容的那些具体语法，除了可以帮你在升级项目后，避免写的代码无法使用，还会让你更好地适应 Vue 3。详细的兼容性变更，官方有一个[迁移指南](https://v3-migration.vuejs.org/zh/)

有 Vue 2 开发经验的，在全面实战 Vue 3 之前，你不必完整阅读官方的指南，因为 Vue 3 的大部分 API 都是对 Vue 2 兼容的。

在 Vue 2 中使用 `new Vue()`  来新建应用，有一些全局的配置会直接挂在 Vue 上，通过 `Vue.use` 来使用插件，通过 `Vue.component` 来注册全局组件。这种形式虽然很直接，但是全局的 Vue 只有一个，在一个页面的多个应用中独立使用 Vue 就会非常困难

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

在 Vue 上注册了一个组件 `el-counter` 并创建了两个 Vue 的实例。但是这两个都拥有了 el-counter 这个组件，但这样做很容易造成混淆

```javascript
Vue.component('el-counter',...)

new Vue({el:'#app1'})
new Vue({el:'#app2'})
```

为了解决这个问题，Vue 3 引入一个新的 API createApp，也就是新增了 App 的概念。全局的组件、插件都独立地注册在这个 App 内部，很好的解决了上面提到的两个实例容易造成混淆的问题

```javascript
const { createApp } = Vue
const app = createApp({})
app.component(...)
app.use(...)
app.mount('#app1')

const app2 = createApp({})
app2.mount('#app2')
```

createApp 还移除了很多我们常见的写法，比如在 createApp 中，就不再支持 filter、`$on` 、`$off` 、`$set`、`$delete`  等 API

在 Vue 3 中，v-model 的用法也有更改， Vue 3 还有很多小细节的更新，比如 slot 和 slot-scope 两者实现了合并，而 directive 注册指令的 API 等也有变化

### 自动化升级工具进行 Vue 的升级

小项目从 Vue 2 升级到 Vue 3 之后，对于语法的改变之处，挨个替换写法就可以。但对于复杂项目，需要借助几个自动化工具来帮过渡。

首先在 Vue 3 的项目里有一个 `@vue/compat` 的库，这是一个 Vue 3 的构建版本，提供了兼容 Vue 2 的行为。这个版本默认运行在 Vue 2 下，它的大部分 API 和 Vue 2 保持了一致。当使用那些在 Vue 3 中发生变化或者废弃的特性时，这个版本会提出警告，从而避免兼容性问题的发生，帮助你很好地迁移项目。并且通过升级的提示信息，`@vue/compat` 还可以很好地帮助你学习版本之间的差异

在下面的代码中，把项目依赖的 Vue 版本换成 Vue 3，并且引入了 `@vue/compat`

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

然后给 vue 设置别名 @vue/compat，也就是以 compat 作为入口，这时在控制台看到很多警告，以及很多优化的建议。参照建议，挨个去做优化

```javascript
// vue.config.js
module.exports = {
  chainWebpack: config => {
    config.resolve.alias.set('vue', '@vue/compat')
    // ......
  }
}
```

在 `@vue/compat` 提供了很多建议后，还是要慢慢做修改。但从另一个角度看，“偷懒”是优秀程序员的标志，社区就有能够做自动化替换的工具，比较好用的就是阿里出品的 [gogocode](https://gogocode.io/zh)，官方文档也写得很详细，就不在这里赘述了

自动化替换工具的原理很简单，和 Vue 的 Compiler 优化的原理是一样的，也就是利用编译原理做代码替换。如下图所示，利用 babel 分析左边 Vue 2 的源码，解析成 AST，然后根据 Vue 3 的写法对 AST 进行转换，最后生成新的 Vue 3 代码

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403061431900.png)
