---
title: "Vue API 盲点解析"
category: Vue

---

# Vue API 盲点解析

## API 解析

### performance 开启性能追踪

`performance API` 是 Vue 全局配置 API 中的一个，可以使用它来进行网页性能的追踪，在入口文件中添加：

```javascript
if (process.env.NODE_ENV !== 'production') {
  Vue.config.performance = true;
}
```
该功能只适用于开发模式和支持 `performance.mark` API 的浏览器上，开启后可以下载 [Vue Performance Devtool](https://chrome.google.com/webstore/search/vue%20performance%20devtool) 这一 chrome 插件来查看各个组件的加载情况

从中可以清晰的看到页面组件在每个阶段的耗时情况，而针对耗时比较久的组件，便可以对其进行相应优化。

而其在 Vue 源码中主要使用了 [window.performance](https://developer.mozilla.org/zh-CN/docs/Web/API/Performance) 来获取网页性能数据，其中包含了 `performance.mark` 和 `performance.measure`。

* performance.mark 主要用于创建标记
* performance.measure 主要用于记录两个标记的时间间隔

```javascript
performance.mark('start'); // 创建 start 标记
performance.mark('end'); // 创建 end 标记

performance.measure('output', 'start', 'end'); // 计算两者时间间隔

performance.getEntriesByName('output'); // 获取标记，返回值是一个数组，包含了间隔时间数据
```
熟练的使用 performance 可以查看并分析网页的很多数据，为项目优化提供保障。除了上述介绍的两个方法，还可以使用 `performance.timing` 来计算页面各个阶段的加载情况

### errorHandler 来捕获异常

在浏览器异常捕获的方法上，熟知的一般有：`try ... catch` 和 `window.onerror`，这也是原生 JavaScript 提供给我们处理异常的方式。但是在 Vue 2.x 中想使用 window.onerror 来捕获异常，那么其实你是捕获不到的，因为异常信息被框架自身的异常机制捕获，可以使用 `errorHandler` 来进行异常信息的获取：

```javascript
Vue.config.errorHandler = function (err, vm, info) {
  let { 
    message, // 异常信息
    name, // 异常名称
    stack  // 异常堆栈信息
  } = err;

  // vm 为抛出异常的 Vue 实例
  // info 为 Vue 特定的错误信息，比如错误所在的生命周期钩子
}
```
在入口文件中加入上述代码后，便可以捕获到 Vue 项目中的一些异常信息了，但是需要注意的是 Vue 2.4.0 起的版本才支持捕获 Vue 自定义事件处理函数内部的错误，比如:

```html
<template>
  <my-component @eventFn="doSomething"></my-component>
</template>

<script>
  export default {
    methods: {
      doSomething() {
        console.log(a); // a is not defined
      }
    }
  }
</script>
```
使用 Vue 中的异常捕获机制，可以针对捕获到的数据进行分析和上报，为实现前端异常监控奠定基础。关于对异常捕获的详细介绍，感兴趣的同学可以查这篇文章：[谈谈前端异常捕获与上报](https://www.cnblogs.com/luozhihao/p/8635507.html)

### 使用 nextTick

在某些情况下，改变页面中绑定的数据后需要对新视图进行一些操作，而这时候新视图其实还未生成，需要等待 DOM 的更新后才能获取的到，在这种场景下便可以使用 nextTick 来延迟回调的执行。比如未使用 `nextTick` 时的代码：

```html
<template>
  <ul ref="box">
    <li v-for="(item, index) in arr" :key="index"></li>
  </ul>
</template>

<script>
  export default {
    data() {
      return {
        arr: []
      }
    },
    mounted() {
      this.getData();
    },
    methods: {
      getData() {
        this.arr = [1, 2, 3];
        this.$refs.box.getElementsByTagName('li')[0].innerHTML = 'hello';
      }
    }
  }
</script>
```
上方代码在实际运行的时候肯定会报错，因为获取 DOM 元素 `li` 的时候其还未被渲染，将方法放入 nextTick 回调中即可解决该问题：

```javascript
this.$nextTick(() => {
  this.$refs.box.getElementsByTagName('li')[0].innerHTML = 'hello';
})
```

### 使用 $isServer 判断是否运行于服务器

当 Vue 项目中存在服务端渲染（SSR）的时候，有些项目文件可能会同时在客户端和服务端加载，这时候代码中的一些客户端浏览器才支持的属性或变量在服务端便会加载出错，比如 window、 document 等，这时候需要进行环境的判断来区分客户端和服务端，如果你不知道 `$isServer`，那么可能会使用 `try ... catch` 或者 `process.env.VUE_ENV` 来判断：

```javascript
try {
  document.title = 'test';
} catch(e) {}

// process.env.VUE_ENV 需要在 webpack 中进行配置
if (process.env.VUE_ENV === 'client') {
  document.title = 'test';
}
```

而使用 `$isServer` 则无需进行配置，在组件中直接使用该 API 即可：

```javascript
if (this.$isServer) {
  document.title = 'test';
}
```

其源码中使用了 `Object.defineProperty` 来进行数据监测：

```javascript
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
});

var _isServer;
var isServerRendering = function () {
  if (_isServer === undefined) {
    if (!inBrowser && !inWeex && typeof global !== 'undefined') {
      _isServer = global['process'].env.VUE_ENV === 'server';
    } else {
      _isServer = false;
    }
  }
  return _isServer
};
```

当我们访问 $isServer 属性时，其会调用 `isServerRendering` 方法，该方法会首先判断当前环境，如果在浏览器或者 Weex 下则返回 false，否则继续判断当前全局环境下的 `process.env.VUE_ENV` 是否为 server 来返回最终结果。

### 思考

* 使用 watch 监听某一值时，同时修改该值两次会触发几次 watch 回调？

* 使用 `errorHandler` 捕获异常堆栈后如何解析 `source-map` 信息？

* 除了本文介绍的 Vue 盲点外，还有哪些需要注意并容易忽略的 API？

**解答**：在 Vue.js 框架中，`watch` 属性用于观察和响应 Vue 实例上的数据变动。当被观察的值发生变化时，`watch` 会触发回调函数。

对于你的问题，如果在同一个事件循环（tick）中两次修改了被监听的值，`watch` 的回调函数只会被触发一次。Vue.js 内部使用异步队列来处理数据变化，以确保每个被监听的属性在同一事件循环中只触发一次回调，无论它的值改变了多少次。

这里有一个例子来说明这个行为：

```javascript
new Vue({
  el: '#app',
  data: {
    a: 1
  },
  watch: {
    a(newValue, oldValue) {
      console.log('a changed from', oldValue, 'to', newValue)
    }
  },
  mounted() {
    this.a = 2; // 第一次修改，触发 watch 回调
    this.a = 3; // 第二次修改，在同一个事件循环中，不会再次触发 watch 回调
  }
})
```

在这个例子中，尽管 `a` 的值被修改了两次，但 `watch` 的回调只会被触发一次，并且回调中的 `newValue` 会是 `a` 的最终值，即 `3`。

这种行为是由 Vue 的响应式系统的设计决定的，目的是避免不必要的重复渲染和回调执行，从而提高应用的性能。这也意味着如果你在 `watch` 回调中执行了某些操作，你不需要担心因为多次触发而导致的重复执行问题。