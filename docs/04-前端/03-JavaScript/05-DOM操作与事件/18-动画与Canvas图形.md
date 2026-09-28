---
title: "动画与 Canvas 图形"
description: "讲解 JavaScript 动画的演进：早期 setInterval 定时动画的精度问题，requestAnimationFrame/cancelAnimationFrame 的原理与用法（重绘前回调、DOMHighResTimeStamp 时间戳），以及利用回调队列实现滚动事件节流。"
keywords: [requestAnimationFrame, 动画]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---

# 动画与 Canvas 图形

图形和动画已经日益成为浏览器中现代 Web 应用程序的必备功能，但实现起来仍然比较困难。视觉上复杂的功能要求性能调优和硬件加速，不能拖慢浏览器。目前已经有一套日趋完善的 API 和工具可以用来开发此类功能。

毋庸置疑，`<canvas>` 是 HTML5 最受欢迎的新特性。这个元素会占据一块页面区域，让 JavaScript可以动态在上面绘制图片。`<canvas>` 最早是苹果公司提出并准备用在控制面板中的，随着其他浏览器的迅速跟进，HTML5 将其纳入标准。目前所有主流浏览器都在某种程度上支持  `<canvas>` 元素

与浏览器环境中的其他部分一样，`<canvas>`  自身提供了一些 API，但并非所有浏览器都支持这些 API，其中包括支持基础绘图能力的 2D 上下文和被称为 WebGL 的 3D 上下文。支持的浏览器的最新版本现在都支持 2D 上下文和 WebGL

## 使用 requestAnimationFrame

很长时间以来，计时器和定时执行都是 JavaScript 动画最先进的工具。虽然 CSS 过渡和动画方便了 Web 开发者实现某些动画，但 JavaScript 动画领域多年来进展甚微。requestAnimationFrame() 方法已经得到各大浏览器的支持

### 早期定时动画

以前，在 JavaScript 中创建动画基本上就是使用 setInterval()来控制动画的执行。下面的例子展示了使用 setInterval()的基本模式：

```js
(function() { 
  function updateAnimations() { 
    doAnimation1(); 
    doAnimation2(); 
    // 其他任务
  } 
  setInterval(updateAnimations, 100); 
})();
```

作为一个小型动画库的标配，这个 updateAnimations() 方法会周期性运行注册的动画任务，并反映出每个任务的变化（例如，同时更新滚动新闻和进度条）。如果没有动画需要更新，则这个方法既可以什么也不做，直接退出，也可以停止动画循环，等待其他需要更新的动画。

这种定时动画的问题在于无法准确知晓循环之间的延时。定时间隔必须足够短，这样才能让不同的动画类型都能平滑顺畅，但又要足够长，以便产生浏览器可以渲染出来的变化。

实现平滑动画最佳的重绘间隔为 1000 毫秒/60，大约 17 毫秒。以这个速度重绘可以实现最平滑的动画，因为这已经是浏览器的极限了。如果同时运行多个动画，可能需要加以限流，以免 17 毫秒的重绘间隔过快，导致动画过早运行完。

**虽然使用 setInterval() 的定时动画比使用多个 setTimeout()实 现循环效率更高，但也不是没有问题。无论 setInterval()还是 setTimeout() 都是不能保证时间精度的。作为第二个参数的延时只能保证何时会把代码添加到浏览器的任务队列，不能保证添加到队列就会立即运行**

**如果队列前面还有其他任务，那么就要等这些任务执行完再执行。简单来讲，这里毫秒延时并不是说何时这些代码会执行，而只是说到时候会把回调加到任务队列。如果添加到队列后，主线程还被其他任务占用，比如正在处理用户操作，那么回调就不会马上执行**

### requestAnimationFrame

Mozilla的 Robert O’Callahan一直在思考这个问题，并提出了一个独特的方案。他指出，浏览器知道 CSS 过渡和动画应该什么时候开始，并据此计算出正确的时间间隔，到时间就去刷新用户界面。但对于 JavaScript 动画，浏览器不知道动画什么时候开始。他给出的方案是创造一个名为 mozRequestAnimationFrame() 的新方法，用以通知浏览器某些 JavaScript 代码要执行动画了。这样浏览器就可以在运行某些代码后进行适当的优化。目前所有浏览器都支持这个方法不带前缀的版本，即 requestAnimationFrame()。

requestAnimationFrame()方法接收一个参数，此参数是一个要在重绘屏幕前调用的函数。这个函数就是修改 DOM 样式以反映下一次重绘有什么变化的地方。为了实现动画循环，可以把多个 requestAnimationFrame() 调用串联起来，就像以前使用 setTimeout()时一样：

```js
function updateProgress() { 
  var div = document.getElementById("status"); 
  div.style.width = (parseInt(div.style.width, 10) + 5) + "%"; 
  if (div.style.width != "100%") { 
    requestAnimationFrame(updateProgress); 
  } 
} 
requestAnimationFrame(updateProgress);
```

因为 requestAnimationFrame() 只会调用一次传入的函数，所以每次更新用户界面时需要再手动调用它一次。同样，也需要控制动画何时停止。结果就会得到非常平滑的动画。

目前为止，requestAnimationFrame() 已经解决了浏览器不知道 JavaScript 动画何时开始的问题，以及最佳间隔是多少的问题，但是，不知道自己的代码何时实际执行的问题呢？这个方案同样也给出了解决方法。

传给 requestAnimationFrame() 的函数实际上可以接收一个参数，此参数是一个 DOMHighResTimeStamp 的实例（比如 performance.now() 返回的值），表示当前帧的时间戳，即这一批回调开始触发的时间点。这一点非常重要：

requestAnimationFrame() 实际上把重绘任务安排在了未来一个已知的时间点上，而且通过这个参数告诉了开发者。基于这个参数，就可以更好地决定如何调优动画了

### cancelAnimationFrame

与 setTimeout() 类似，requestAnimationFrame() 也返回一个请求 ID，可以用于通过另一个方法 cancelAnimationFrame() 来取消重绘任务。下面的例子展示了刚把一个任务加入队列又立即将其取消：

```js
let requestID = window.requestAnimationFrame(() => { 
  console.log('Repaint!'); 
}); 

window.cancelAnimationFrame(requestID);
```

### 通过 requestAnimationFrame 节流

requestAnimationFrame 这个名字有时候会让人误解，因为看不出来它跟排期任务有关。支持这个方法的浏览器实际上会暴露出作为钩子的回调队列。所谓钩子（hook），就是浏览器在执行下一次重绘之前的一个点。这个回调队列是一个可修改的函数列表，包含应该在重绘之前调用的函数。每次调用

requestAnimationFrame() 都会在队列上推入一个回调函数，队列的长度没有限制。

这个回调队列的行为不一定跟动画有关。不过，通过 requestAnimationFrame() 递归地向队列中加入回调函数，可以保证每次重绘最多只调用一次回调函数。这是一个非常好的节流工具。在频繁执行影响页面外观的代码时（比如滚动事件监听器），可以利用这个回调队列进行节流。

先来看一个原生实现，其中的滚动事件监听器每次触发都会调用名为 expensiveOperation()（耗时操作）的函数。当向下滚动网页时，这个事件很快就会被触发并执行成百上千次：

```js
function expensiveOperation() { 
  console.log('Invoked at', Date.now()); 
}

window.addEventListener('scroll', () => { 
  expensiveOperation(); 
});
```

如果想把事件处理程序的调用限制在每次重绘前发生，那么可以像这样下面把它封装到 requestAnimationFrame() 调用中

```js
function expensiveOperation() { 
  console.log('Invoked at', Date.now()); 
}
window.addEventListener('scroll', () => { 
  window.requestAnimationFrame(expensiveOperation); 
});
```

这样会把所有回调的执行集中在重绘钩子，但不会过滤掉每次重绘的多余调用。此时，定义一个标志变量，由回调设置其开关状态，就可以将多余的调用屏蔽：

```js
let enqueued = false; 
function expensiveOperation() { 
  console.log('Invoked at', Date.now()); 
  enqueued = false; 
}

window.addEventListener('scroll', () => { 
  if (!enqueued) { 
    enqueued = true; 
    window.requestAnimationFrame(expensiveOperation); 
  } 
});
```

因为重绘是非常频繁的操作，所以这还算不上真正的节流。更好的办法是配合使用一个计时器来限制操作执行的频率。这样，计时器可以限制实际的操作执行间隔，而 requestAnimationFrame 控制在浏览器的哪个渲染周期中执行。下面的例子可以将回调限制为不超过 50 毫秒执行一次：

```js
let enabled = true; 
function expensiveOperation() { 
  console.log('Invoked at', Date.now()); 
} 
window.addEventListener('scroll', () => { 
  if (enabled) { 
    enabled = false; 
    window.requestAnimationFrame(expensiveOperation); 
    window.setTimeout(() => enabled = true, 50); 
  } 
});
```

