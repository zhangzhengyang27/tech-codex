---
title: "Concurrent-State更新"
description: "主流框架两种批量更新的实现原理（微任务/宏任务集中更新、可控任务批量更新），以及 React v18 concurrent 模式下 state 更新的调度流程与同步、异步条件的差异。"
keywords: [Concurrent-State更新]
category: React
tags: [React, 原理与源码]
---

# Concurrent-State更新

## 概念：主流框架中更新处理方式

主流框架存在两种典型的批量更新原理，理解它们是理解 v18 concurrent 更新机制的基础。

### 1 第一种：微任务｜宏任务实现集中更新

第一种批量更新的实现，基于**宏任务**和**微任务**来完成：每次更新并不立即执行更新任务，而是先把每一个更新任务放入一个待更新队列 `updateQueue` 里，然后 js 执行完毕，用一个微任务统一去批量更新队列里面的任务；如果微任务存在兼容性问题，就降级成一个宏任务。**优先采用微任务**的原因是微任务的执行时机要早于下一次宏任务的执行。

典型案例就是 vue 的更新原理（`vue.$nextTick` 的原理），以及 v18 中 `scheduleMicrotask` 的更新原理。

以 vue 为例，看一下 nextTick 的实现：

> runtime-core/src/scheduler.ts
````js
const p = Promise.resolve()
/* nextTick 实现，用微任务实现的 */
export function nextTick(fn?: () => void): Promise<void> {
  return fn ? p.then(fn) : p
}
````

* nextTick 的原理，本质就是 `Promise.resolve()` 创建的微任务。

整个流程可以模拟实现如下：

````js
class Scheduler {
    constructor(){
        this.callbacks = []
        /* 微任务批量处理 */
        queueMicrotask(()=>{
            this.runTask()
        })
    }
    /* 增加任务 */
    addTask(fn){
        this.callbacks.push(fn)
    }
    runTask(){
        console.log('------合并更新开始------')
        while(this.callbacks.length > 0){
            const cur = this.callbacks.shift()
            cur()
        }
        console.log('------合并更新结束------')
        console.log('------开始更新组件------')
    }
}
function nextTick(cb){
    const scheduler = new Scheduler()
    cb(scheduler.addTask.bind(scheduler))
}

/* 模拟一次更新 */
function mockOnclick(){
   nextTick((add)=>{
       add(function(){
           console.log('第一次更新')
       })
       console.log('----宏任务逻辑----')
       add(function(){
        console.log('第二次更新')
       })
   })
}

mockOnclick()
````

具体实现细节拆解：

* 通过一个 Scheduler 调度器来完成整个流程。
* 通过 addTask 每次向队列中放入任务。
* 用 queueMicrotask 创建一个微任务，来统一处理这些任务。
* mockOnclick 模拟一次更新，用 nextTick 模拟更新函数的处理逻辑。

打印效果如下：

```
----宏任务逻辑----
------合并更新开始------
第一次更新
第二次更新
------合并更新结束------
------开始更新组件------
```

两次更新被合并到同一个微任务中批量执行，并且晚于本次同步代码（宏任务逻辑）执行。

### 2 第二种：可控任务实现批量更新

另一种方式，通过拦截把任务变成**可控的**，典型代表是 React v17 之前的 batchEventUpdate 批量更新。这种方式下，更新来源于对事件进行拦截，比如 React 的事件系统。

以 React 的事件批量更新为例：onClick、onChange 等事件都被 React 的事件系统处理，外层用一个统一的处理函数进行拦截，而绑定的事件都在该函数的执行上下文内部被调用。

在一次点击事件中触发多次更新时，外层处于 React 事件系统处理函数的上下文中，此时可以通过一个开关证明当前更新是可控的、可以做批量处理，接下来 React 把这些更新合并成一次批量处理即可。

模拟实现如下：

````html
<body>
    <button onclick="handleClick()" >点击</button>
</body>
<script>
  let  batchEventUpdate = false
  let callbackQueue = []

  function flushSyncCallbackQueue(){
      console.log('-----执行批量更新-------')
      while(callbackQueue.length > 0 ){
          const cur = callbackQueue.shift()
          cur()
      }
      console.log('-----批量更新结束-------')
  }

  function wrapEvent(fn){
     return function (){
         /* 开启批量更新状态 */
        batchEventUpdate = true
        fn()
        /* 立即执行更新任务 */
        flushSyncCallbackQueue()
        /* 关闭批量更新状态 */
        batchEventUpdate = false
     }
  }

  function setState(fn){
      /* 如果在批量更新状态下，那么批量更新 */
      if(batchEventUpdate){
          callbackQueue.push(fn)
      }else{
          /* 如果没有在批量更新条件下，那么直接更新。 */
          fn()
      }
  }

  function handleClick(){
      setState(()=>{
          console.log('---更新1---')
      })
      console.log('上下文执行')
      setState(()=>{
          console.log('---更新2---')
      })
  }
  /* 让 handleClick 变成可控的  */
  handleClick = wrapEvent(handleClick)

</script>
````

打印结果：

```
上下文执行
-----执行批量更新-------
---更新1---
---更新2---
-----批量更新结束-------
```

两次更新（更新1、更新2）都被推迟到了事件上下文结束后的批量更新中执行。

核心流程分析：

* 本方式的核心是让 handleClick 通过 wrapEvent 变成可控的。wrapEvent 类似于事件处理函数，内部通过开关 batchEventUpdate 来判断是否开启批量更新状态，最后通过 flushSyncCallbackQueue 来清空待更新队列。
* 在批量更新条件下，事件会被放入到更新队列中；非批量更新条件下，立即执行更新任务。

## 原理：与传统 legacy 模式的区别

传统的 legacy 模式采用上述第二种批量更新模式（可控任务批量处理），原理主要有两个：

* 通过不同的更新上下文开关，在开关里的任务是可控的，可以进行批量处理。
* 在事件执行完毕后，通过 `flushSyncCallback` 来进行更新任务执行。

Concurrent 模式下则取消了批量更新的概念。以事件系统的更新为例对比两种模式的区别。

在老版本事件系统中：

> react-dom/src/events/ReactDOMUpdateBatching.js
````js
export function batchedEventUpdates(fn,a){
    isBatchingEventUpdates = true; //打开批量更新开关
    try{
       fn(a)  // 事件在这里执行
    }finally{
        isBatchingEventUpdates = false //关闭批量更新开关
        if (executionContext === NoContext) {
            flushSyncCallbackQueue(); // TODO: 这个很重要，用来同步执行更新队列中的任务
        }
    }
}
````

* 通过开关 isBatchingEventUpdates 来让 fn 里面的更新变成可控的，所以可以进行批量更新。
* 重点就是 flushSyncCallbackQueue 用来同步执行更新队列中的任务。

在 v18 alpha 系统中，事件变成了这样（此代码与代码仓库有些出入，只关注流程即可）：

````js
function batchedEventUpdates(){
    var prevExecutionContext = executionContext;
    executionContext |= EventContext;  // 运算赋值
    try {
        return fn(a);  // 执行函数
    }finally {
        executionContext = prevExecutionContext; // 重置之前的状态
        if (executionContext === NoContext) {
            flushSyncCallbacksOnlyInLegacyMode() // 同步执行更新队列中的任务
        }
    }
}
````

v18 alpha 版本的流程大致如下：

* 同样通过类似开关状态来控制：刚开始的时候将 executionContext 赋值为 `EventContext`，然后在事件执行之后，重置为 `prevExecutionContext`。
* 之后同样会触发 flushSyncCallbacksOnlyInLegacyMode，从函数名称可以推断，这个方法主要针对 legacy 模式的更新，那么 concurrent mode 下也就不会走 flushSyncCallback 的逻辑了。

为了验证这个推断，看一下 `flushSyncCallbacksOnlyInLegacyMode` 做了什么：

> react-reconciler/src/ReactFiberWorkLoop.js
````js
export function flushSyncCallbacksOnlyInLegacyMode(){
    if(includesLegacySyncCallbacks){ /* 只有在 legacy 模式下，才会走这里的流程。 */
        flushSyncCallbacks();
    }
}
````

* 验证了之前的猜测，**只有在 legacy 模式下，才会执行 flushSyncCallbacks 来同步执行任务。**

flushSyncCallbacks 的主要作用是，在一次更新中直接同步更新任务，防止任务在下一次的宏任务中执行。那么 concurrent 下的更新流程是怎样的呢？

### 一次更新 state 会发生什么？

编写如下 `demo` 观察：

````js
function Index(){
    const [ number , setNumber ] = React.useState(0)
    /* 同步条件下 */
    const handleClickSync = () => {
        setNumber(1)
        setNumber(2)
    }
    /* 异步条件下 */
    const handleClick = () => {
        setTimeout(()=>{
            setNumber(1)
            setNumber(2)
        },0)
    }
    console.log('----组件渲染----')
    return <div>
         {number}
         <button onClick={handleClickSync} >同步环境下</button>
         <button onClick={handleClick} >异步环境下</button>
     </div>
}
````

**v17 legacy 下更新：**

* 点击按钮 `同步环境下`，组件渲染一次。

* 点击按钮 `异步环境下`，组件会渲染二次。异步条件下的更新任务不在 React 可控的范围内，所以会触发两次流程。

**v18 concurrent 下更新：**

* 无论点击 **`同步环境下`** 还是 **`异步环境下`** ，组件都会执行一次。

问题随之而来：在 concurrent 下，更新是如何合并的呢？

## v18 更新原理揭秘

无论同步还是异步条件，只要触发 React 的 `setState` 或者 `useState`，最终进入调度任务开始更新的入口函数都是 `ensureRootIsScheduled`，所以可以从这个函数找到线索。

> react-reconciler/src/ReactFiberWorkLoop.js -> ensureRootIsScheduled
````js
function ensureRootIsScheduled(root,currentTime){
    var existingCallbackNode = root.callbackNode;

    var newCallbackPriority = getHighestPriorityLane(nextLanes);
     var existingCallbackPriority = root.callbackPriority;

    if (existingCallbackPriority === newCallbackPriority &&
    !( ReactCurrentActQueue.current !== null && existingCallbackNode !== fakeActCallbackNode)) {
        /* 批量更新退出* */
        return;
    }

    /* 同步更新条件下，会走这里的逻辑 */
    if (newCallbackPriority === SyncLane) {
        scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
        /* 用微任务去立即执行更新  */
        scheduleMicrotask(flushSyncCallbacks);

    }else{
        newCallbackNode = scheduleCallback(
            schedulerPriorityLevel,
            performConcurrentWorkOnRoot.bind(null, root),
        );
    }
    /* 这里很重要就是给当前 root 赋予 callbackPriority 和 callbackNode 状态 */
    root.callbackPriority = newCallbackPriority;
    root.callbackNode = newCallbackNode;
}
````

### 1 同步条件下的逻辑

concurrent 中已经没有可控任务那一套逻辑，同步更新的核心流程如下。

当同步状态下触发多次 useState 的时候：

* 首先第一次进入到 ensureRootIsScheduled ，会计算出 `newCallbackPriority`（可以理解成执行新的更新任务的优先级），并与之前的 `callbackPriority` 进行对比，如果相等则退出流程；第一次两者肯定是不相等的。

* 同步状态下常规的更新 newCallbackPriority 是等于 `SyncLane` 的，那么会执行两个函数，`scheduleSyncCallback` 和 `scheduleMicrotask`。

`scheduleSyncCallback` 会把任务放入 `syncQueue` 同步更新队列中：

> react-reconciler/src/ReactFiberWorkLoop.js -> scheduleSyncCallback
````js
export function scheduleSyncCallback(callback: SchedulerCallback) {
  if (syncQueue === null) {
    syncQueue = [callback];
  } else {
    syncQueue.push(callback);
  }
}
````

* **注意：这就是 concurrent 下更新的关键区别。老版本 React 是基于事件处理函数执行的 flushSyncCallbacks ，而新版本 React 是通过 scheduleMicrotask 执行的。**

scheduleMicrotask 的实现如下：

> react-dom/src/client/ReactDOMHostConfig.js -> scheduleMicrotask
````js
var scheduleMicrotask = typeof queueMicrotask === 'function' ? queueMicrotask : typeof Promise !== 'undefined' ? function (callback) {
  return Promise.resolve(null).then(callback).catch(handleErrorInNextTick);
} : scheduleTimeout;
````

scheduleMicrotask 本质上就是 `Promise.resolve`，还有一个 setTimeout 向下兼容的情况。通过 scheduleMicrotask 去进行调度更新。

* 如果发生第二次 useState ，则会出现 ` existingCallbackPriority === newCallbackPriority` 的情况，接下来就会 return 退出更新流程了。

### 2 异步条件下的逻辑

在异步情况下，比如在 `setTimeout` 或者 `Promise.resolve` 条件下的更新，流程如下：

* 第一步也会判断 existingCallbackPriority === newCallbackPriority 是否相等，相等则退出。
* 第二步则有区别：会直接执行 `scheduleCallback`，得到最新的 newCallbackNode，并赋值给 root 。
* 接下来第二次 useState ，同样会 return 跳出 `ensureRootIsScheduled` 。

scheduleCallback 的实现如下。

> react-reconciler/src/ReactFiberWorkLoop.js -> scheduleCallback

````js
function scheduleCallback(priorityLevel, callback) {
    var actQueue = ReactCurrentActQueue.current;
    if (actQueue !== null) {
      actQueue.push(callback);
      return fakeActCallbackNode;
    } else {
      /* 交给 Scheduler 调度器调度（Scheduler_scheduleCallback） */
      return Scheduler_scheduleCallback(priorityLevel, callback);
    }
}
````

至此，concurrent 下的更新流程已经清晰：同步更新通过 `scheduleSyncCallback` 入队并用 `scheduleMicrotask`（微任务）尽快执行；异步更新通过 `scheduleCallback` 交给 Scheduler 调度器，在浏览器空闲的时间片中执行。

## 总结

* 主流框架中更新处理方式。
* concurrent 模式下的 state 更新流程。
* 在同步异步条件下，state 更新的区别。

## 继续阅读

- 上一篇：[10-进入调度任务](10-进入调度任务)
- 下一篇：[12-订阅外部数据源](12-订阅外部数据源)
