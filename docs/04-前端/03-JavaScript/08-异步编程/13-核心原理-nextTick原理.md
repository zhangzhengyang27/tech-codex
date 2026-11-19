---
title: "核心原理-nextTick原理"
description: "深入 process.nextTick 的执行机制：nextTick 队列的优先级与用途、与事件循环的关系，以及 Vue nextTick 的微任务降级实现（Promise → MutationObserver → setTimeout）。"
keywords: [nextTick, process.nextTick, 微任务, Vue]
category: JavaScript
tags: [JavaScript, Node.js, 微任务, Vue]
---


# 核心原理-nextTick原理

## 概念说明

在宏任务和微任务的运行机制中,`process.nextTick` 属于微任务的一种。它在浏览器端代码中很少使用,但在 Node.js 开发中极为常见。与此同时,Vue 框架在浏览器端也提供了一个同名概念 `nextTick`(`$nextTick`),两者的运行机制不同,需要注意区分。

理解这两个 nextTick,需要回答两个关键问题:

- process.nextTick 和其他微任务方法在一起的时候,执行顺序是怎么样的?
- Vue 的 nextTick 的逻辑又是什么样的?

## 核心要点

- `process.nextTick` 会将回调添加到 "next tick queue";该队列在当前 JavaScript 调用栈执行完成后、下一次事件循环开始前按 FIFO 出队。
- 严格来说 `process.nextTick` 并不是事件循环(eventloop)的一部分:"next tick queue" 在当前操作完成之后立即被处理,而不管当前处于事件循环的哪个阶段。
- 递归调用 `process.nextTick` 可能导致无限循环,挂起 I/O 使事件循环永远无法到达轮询阶段,需要适时终止递归。
- `process.nextTick` 的设计理念:Node.js 中的 API 应该总是异步的,即使某些地方并不需要异步;它保证回调在用户代码执行完毕后、事件循环继续工作前执行。
- Vue 的 nextTick 用于缓冲同一事件循环中的数据变化,在下一个"tick"中批量更新 DOM;避免同一个 watcher 被重复触发导致的多余计算。
- Vue 2.5+ 中 nextTick 的实现在 `src/core/util/next-tick.js`,核心是 `timerFunc`,按兼容性优先级降级选择:**Promise → MutationObserver → setImmediate → setTimeout**。

## process.nextTick 的执行机制

### 基本语法

process.nextTick 的语法有两个参数:

> process.nextTick(callback[, ...args])

第一个参数是 callback 回调函数;第二个参数是 args,调用 callback 时额外传递的参数,是可选参数。

process.nextTick 的运行逻辑:

- process.nextTick 会将 callback 添加到"next tick queue";
- "next tick queue" 会在当前 JavaScript stack 执行完成后、下一次 event loop 开始执行前,按照 FIFO 出队;
- 如果递归调用 process.nextTick 可能会导致一个无限循环,需要适时终止递归。

process.nextTick 是微任务,同时也是异步 API 的一部分。但从技术上来说,它并不是事件循环(eventloop)的一部分——"next tick queue" 将会在当前操作完成之后立即被处理,而不管当前处于事件循环的哪个阶段。

据此推论:在任何给定阶段调用 process.nextTick,所有传入的回调将在事件循环继续往下执行前被执行。这可能造成很糟的情形:用户可以递归调用 process.nextTick 来挂起 I/O 进程,导致事件循环永远无法到达轮询阶段。

## 为什么使用 process.nextTick()

process.nextTick 这样的 API 被允许出现在 Node.js 中,一部分原因是设计理念:Node.js 中的 API 应该总是异步的,即使是那些不需要异步的地方:

```javascript
function apiCall(arg, callback) {
  if (typeof arg !== 'string')
  return process.nextTick(callback, new TypeError('argument should be string'));
}
```

上面的代码检查参数,检查不通过时将一个错误对象传给回调。Node.js API 后来已允许向 process.nextTick 传递参数作为回调函数的参数,而不必写嵌套函数。

这里做的事是将一个错误传递给用户,但只在用户代码被执行完毕后执行。使用 process.nextTick 可以保证 `apiCall()` 的回调总是在用户代码被执行后、且在事件循环继续工作前被执行。为了达到这一点,JS 调用栈被允许展开,然后立即执行所提供的回调;该回调允许用户对 process.nextTick 递归调用而不会达到 RangeError(V8 调用栈的最大值)。

### 问题场景:伪异步函数

这种设计理念也对应一类潜在问题:

```javascript
let bar;
function someAsyncApiCall(callback) { callback(); }
someAsyncApiCall(() => {
  console.log('bar', bar);   // undefined
});
bar = 1;
```

用户定义的 `someAsyncApiCall()` 有一个异步签名,但实际上是同步执行的。它被调用时,提供给它的回调函数会在执行 `someAsyncApiCall()` 本身的同一个事件循环阶段被执行,因为 `someAsyncApiCall()` 实际上并未执行任何异步操作。结果就是:回调函数尝试引用变量 bar,但此时作用域中还没有该变量,因为程序还没运行到对 bar 赋值的部分。

将回调放到 process.nextTick 中,程序依然可以执行完毕,且所有的变量、函数等都在执行回调之前被初始化;它还具有不会被事件循环打断的优点:

```javascript
let bar;
 
function someAsyncApiCall(callback) {
  process.nextTick(callback);
}
 
someAsyncApiCall(() => {
  console.log('bar', bar); // 1
});
 
bar = 1;
```

### 典型场景:EventEmitter 构造函数中触发事件

Node.js 内置的 `events` 模块就是一个 EventEmitter(EventEmitter 的实现原理可参阅[手写 EventEmitter](11-核心原理-手写EventEmitter.md))。直接在构造函数中触发事件是有问题的:

```javascript
const EventEmitter = require('events');
const util = require('util');
 
function MyEmitter() {
EventEmitter.call(this);
this.emit('event');
}
util.inherits(MyEmitter, EventEmitter);
 
const myEmitter = new MyEmitter();
myEmitter.on('event', () => {
console.log('an event occurred!');
});
```

在构造函数中无法立即触发一个事件,因为此时程序还未运行到将回调赋值给事件的那段代码。在构造函数内部,可以使用 process.nextTick 设置一个回调,让事件在构造函数执行完毕后触发:

```javascript
const EventEmitter = require('events');
const util = require('util');
 
function MyEmitter() {
EventEmitter.call(this);
process.nextTick(() => {
  this.emit('event');
});
}
util.inherits(MyEmitter, EventEmitter);
 
const myEmitter = new MyEmitter();
  myEmitter.on('event', () => {
  console.log('an event occurred!');
});
```

即使 event 事件还没绑定,也可以让触发代码写在前面:process.nextTick 的回调在用户代码执行完毕后、事件循环继续之前执行,因此不报错,同时保持了代码的逻辑顺序。

## Vue 的 nextTick 是什么

Vue 官网对 nextTick 的解释如下:

> Vue 异步执行 DOM 的更新。当数据发生变化时，Vue 会开启一个队列，用于缓冲在同一事件循环中发生的所有数据改变的情况。如果同一个 watcher 被多次触发，只会被推入到队列中一次。这种在缓冲时去除重复数据对于避免不必要的计算和 DOM 操作上非常重要。然后在下一个的事件循环“tick”中。例如：当你设置 vm.someData = 'new value'，该组件不会立即重新渲染。当刷新队列时，组件会在事件循环队列清空时的下一个“tick”更新。多数情况我们不需要关心这个过程，但是如果你想在 DOM 状态更新后做点什么，这就可能会有些棘手。

也就是说,Vue 开启了一个队列:在 nextTick 方法中改变数据时,视图层不会立即更新,而是要在下一次事件循环队列中更新。这一点与 Node.js 的 process.nextTick 思路相近,只是运行环境不同。

看一段 Vue 代码,理解 nextTick 的作用:

```javascript
<template>
  <div class="app">
    <div ref="msg">{{msg}}</div>
    <div v-if="msg1">Message got outside $nextTick: {{msg1}}</div>
    <div v-if="msg2">Message got inside $nextTick: {{msg2}}</div>
    <button @click="changeMsg">
      Change the Message
    </button>
  </div>
</template>
<script>
new Vue({
  el: '.app',
  data: {
    msg: 'Vue',
    msg1: '',
    msg2: '',
  },
  methods: {
    changeMsg() {
      this.msg = "Hello world."
      this.msg1 = this.$refs.msg.innerHTML
      this.$nextTick(() => {
        this.msg2 = this.$refs.msg.innerHTML
      })
    }
  }
})
</script>
```

在 Vue 项目中执行这段代码并点击按钮,可以观察到 msg1 和 msg2 的变化:第一次点击按钮调用 `changeMsg` 方法时,msg2 并没有变化,因为 msg2 的变化是在下一个 tick 才执行的——`$nextTick` 的回调等 DOM 更新完成后才运行,此时读取 `innerHTML` 拿到的是新值。

### Vue nextTick 的源码实现

Vue 2.5+ 版本中,nextTick 由单独的 JS 文件维护,路径是 `src/core/util/next-tick.js`:

```javascript
/* @flow */
	/* globals MutationObserver */
	
	import { noop } from 'shared/util'
	import { handleError } from './error'
	import { isIE, isIOS, isNative } from './env'
	
	export let isUsingMicroTask = false
	
	const callbacks = []
	let pending = false
	
	function flushCallbacks () {
	  pending = false
	  const copies = callbacks.slice(0)
	  callbacks.length = 0
	  for (let i = 0; i < copies.length; i++) {
	    copies[i]()
	  }
	}
	
	// Here we have async deferring wrappers using microtasks.
	// In 2.5 we used (macro) tasks (in combination with microtasks).
	// However, it has subtle problems when state is changed right before repaint
	// (e.g. #6813, out-in transitions).
	// Also, using (macro) tasks in event handler would cause some weird behaviors
	// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
	// So we now use microtasks everywhere, again.
	// A major drawback of this tradeoff is that there are some scenarios
	// where microtasks have too high a priority and fire in between supposedly
	// sequential events (e.g. #4521, #6690, which have workarounds)
	// or even between bubbling of the same event (#6566).
	let timerFunc
	
	// The nextTick behavior leverages the microtask queue, which can be accessed
	// via either native Promise.then or MutationObserver.
	// MutationObserver has wider support, however it is seriously bugged in
	// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
	// completely stops working after triggering a few times... so, if native
	// Promise is available, we will use it:
	/* istanbul ignore next, $flow-disable-line */
	if (typeof Promise !== 'undefined' && isNative(Promise)) {
	  const p = Promise.resolve()
	  timerFunc = () => {
	    p.then(flushCallbacks)
	    // In problematic UIWebViews, Promise.then doesn't completely break, but
	    // it can get stuck in a weird state where callbacks are pushed into the
	    // microtask queue but the queue isn't being flushed, until the browser
	    // needs to do some other work, e.g. handle a timer. Therefore we can
	    // "force" the microtask queue to be flushed by adding an empty timer.
	     if (isIOS) setTimeout(noop)
	  }
	  isUsingMicroTask = true
	} else if (!isIE && typeof MutationObserver !== 'undefined' && (
	  isNative(MutationObserver) ||
	  // PhantomJS and iOS 7.x
	  MutationObserver.toString() === '[object MutationObserverConstructor]'
	)) {
	  // Use MutationObserver where native Promise is not available,
	  // e.g. PhantomJS, iOS7, Android 4.4
	  // (#6466 MutationObserver is unreliable in IE11)
	  let counter = 1
	  const observer = new MutationObserver(flushCallbacks)
	  const textNode = document.createTextNode(String(counter))
	  observer.observe(textNode, {
	    characterData: true
	  })
	  timerFunc = () => {
	    counter = (counter + 1) % 2
	    textNode.data = String(counter)
	  }
	  isUsingMicroTask = true
	} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
	  // Fallback to setImmediate.
	  // Technically it leverages the (macro) task queue,
	  // but it is still a better choice than setTimeout.
	  timerFunc = () => {
	    setImmediate(flushCallbacks)
	  }
	} else {
	  // Fallback to setTimeout.
	  timerFunc = () => {
	    setTimeout(flushCallbacks, 0)
	  }
	}
	
	export function nextTick (cb?: Function, ctx?: Object) {
	  let _resolve
	  callbacks.push(() => {
	    if (cb) {
	      try {
	        cb.call(ctx)
	      } catch (e) {
	        handleError(e, ctx, 'nextTick')
	      }
	    } else if (_resolve) {
	      _resolve(ctx)
	    }
	  })
	  if (!pending) {
	    pending = true
	    timerFunc()
	  }
	  // $flow-disable-line
	  if (!cb && typeof Promise !== 'undefined') {
	    return new Promise(resolve => {
	      _resolve = resolve
	    })
	  }
	}
```

整体代码不多、注释较多,核心部分在 40~80 行之间,核心在于 `timerFunc` 函数的逻辑实现。`timerFunc` 采用多种处理方式,针对系统以及 Promise 的支持情况进行兼容性处理:

```mermaid
flowchart TD
    START[timerFunc 初始化] --> P{是否原生支持<br/>Promise?}
    P -->|是| USE_P[利用 Promise<br/>触发执行回调函数<br/>Promise.resolve().then]
    P -->|否| M{是否支持<br/>MutationObserver?}
    M -->|是| USE_M[生成 MutationObserver<br/>观察文本节点变化<br/>触发执行所有回调]
    M -->|否| USE_T[使用 setTimeout<br/>延时设为 0]

    style P fill:#e1f5fe
    style USE_M fill:#fff3e0
    style USE_T fill:#fce4ec
```

> `timerFunc` 按兼容性优先级选择触发方式：**Promise → MutationObserver → setTimeout(0)**，将回调统一压入异步任务队列，在下一轮循环执行。

理解 Promise 与 MutationObserver 之后,`timerFunc` 的逻辑就比较容易理解:主要是一些兼容性判断,原生 Promise 可用时优先使用微任务;否则在支持 MutationObserver 的环境中借助文本节点变化触发回调;最后降级到宏任务队列(setImmediate 或 setTimeout)。

## process.nextTick 与 Vue nextTick 对比

| 对比维度 | `Process.nextTick()` | Vue 的 `nextTick` |
|---------|---------------------|------------------|
| 所属环境 | Node.js | Vue（浏览器端为主）|
| 触发时机 | 当前操作结束后立即执行，优先级高于 Promise | 数据更新后 DOM 更新完成时执行 |
| 底层实现 | 直接插入本轮循环，优先于微任务 | `Promise` → `MutationObserver` → `setTimeout` 兼容降级 |
| 回调入队 | 立即执行，不等事件循环 | 通过 timerFunc 压入异步队列 |
| 典型用途 | 避免阻塞 I/O 操作 | 等待 DOM 更新后获取最新状态 |

> `Process.nextTick` 优先于 `Promise`，而 Vue 的 `nextTick` 则按"Promise → MutationObserver → setTimeout"降级选择触发方式。

## 小结

`process.nextTick`(Node.js)将回调插入本轮循环,优先于其他微任务执行,适合在用户代码执行完毕后、事件循环继续前运行回调,典型用途是避免阻塞 I/O 与解决"伪异步"函数的时序问题;Vue 的 `nextTick`(浏览器端)通过 `timerFunc` 按 Promise → MutationObserver → setImmediate/setTimeout 的优先级降级,将回调压入异步队列,在 DOM 更新完成后执行,用于等待最新渲染状态。两者同名不同源,使用时需注意区分运行环境。
