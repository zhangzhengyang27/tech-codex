---
title: "浏览器的5种Observer"
description: "浏览器 5 种 Observer：IntersectionObserver 监听可见性、MutationObserver 监听属性与子节点变化、ResizeObserver 监听尺寸、PerformanceObserver 监听性能记录、ReportingObserver 监听过时 api 与浏览器干预报告。"
keywords: [浏览器的5种Observer]
category: React
tags: [React, 组件与实战]
---

# 浏览器的5种Observer

监听用户的交互行为，用 addEventListener 监听 click、mousedown、keydown、input 等事件即可；但对于元素的变化、performance 的记录、浏览器干预行为这类非交互事件，需要用到浏览器提供的 5 种 Observer api。

## IntersectionObserver

元素从不可见到可见、从可见到不可见，这种变化用 IntersectionObserver 监听。**IntersectionObserver 可以监听一个元素和可视区域相交部分的比例，然后在可视比例达到某个阈值的时候触发回调。**

准备两个元素：

```html
<div id="box1">BOX111</div>
<div id="box2">BOX222</div>
```

加上样式：

```css
#box1,#box2 {
    width: 100px;
    height: 100px;
    background: blue;
    color: #fff;

    position: relative;
}
#box1 {
    top: 500px;
}
#box2 {
    top: 800px;
}
```

这两个元素分别在 500 和 800 px 的高度，监听它们可见性的改变：

```javascript
const intersectionObserver = new IntersectionObserver(
    function (entries) {
        console.log('info:');
        entries.forEach(item => {
            console.log(item.target, item.intersectionRatio)
        })
    }, {
    threshold: [0.5, 1]
});

intersectionObserver.observe( document.querySelector('#box1'));
intersectionObserver.observe( document.querySelector('#box2'));
```

创建一个 IntersectionObserver 对象，监听 box1 和 box2 两个元素，当可见比例达到 0.5 和 1 的时候触发回调。浏览器运行可以看到：元素 box1 和 box2 在可视范围达到一半（0.5）和全部（1）时分别触发了回调。

应用场景：做数据采集时希望知道某个元素是否可见、什么时候可见，就可以用这个 api 监听；做图片懒加载时，可以当可视比例达到某个比例再触发加载。

## MutationObserver

监听一个普通 JS 对象的变化，用 Object.defineProperty 或者 Proxy；而监听元素的属性和子节点的变化，用 MutationObserver。**MutationObserver 可以监听对元素的属性的修改、对它的子节点的增删改。**

准备这样一个盒子：

```html
<div id="box"><button>光</button></div>
```

加上样式：

```css
 #box {
    width: 100px;
    height: 100px;
    background: blue;

    position: relative;
}
```

定时对它做修改：

```javascript
setTimeout(() => {
    box.style.background = 'red';
},2000);

setTimeout(() => {
    const dom = document.createElement('button');
    dom.textContent = '东东东';
    box.appendChild(dom);
},3000);

setTimeout(() => {
   document.querySelectorAll('button')[0].remove();
},5000);
```

2s 时修改背景颜色为红色，3s 时添加一个 button 的子元素，5s 时删除第一个 button。然后监听它的变化：

```javascript
const mutationObserver = new MutationObserver((mutationsList) => {
    console.log(mutationsList)
});

mutationObserver.observe(box, {
    attributes: true,
    childList: true
});
```

创建一个 MutationObserver 对象，监听这个盒子的属性和子节点的变化。浏览器运行可以看到三次变化都被监听到：

- 第一次改变的是 attributes，属性是 style。
- 第二次改变的是 childList，添加了一个节点。
- 第三次也是改变的 childList，删除了一个节点。

应用场景：比如文章水印被人通过 devtools 去掉了，可以通过 MutationObserver 监听这个变化然后重新加上，让水印去不掉。antd 的 Watermark 组件就是这个思路——当删除了水印节点，或者修改了水印节点的属性，就会重新渲染水印。此外还有很多别的用途。

## ResizeObserver

窗口可以用 addEventListener 监听 resize 事件，元素则用 ResizeObserver。**元素可以用 ResizeObserver 监听大小的改变，当 width、height 被修改时会触发回调。**

准备这样一个元素：

```html
<div id="box"></div>
```

添加样式：

```css
#box {
    width: 100px;
    height: 100px;
    background: blue;
}
```

在 3s 时修改它的宽度：

```javascript
const box = document.querySelector('#box');

setTimeout(() => {
    box.style.width = '200px';
}, 3000);
```

用 ResizeObserver 监听它的变化：

```javascript
const resizeObserver = new ResizeObserver(entries => {
    console.log('当前大小', entries)
});
resizeObserver.observe(box);
```

浏览器运行可以看到大小变化被监听到了，可以拿到元素和它的位置、尺寸。这样就实现了对元素 resize 的监听。

## PerformanceObserver

浏览器提供了 performance 的 api 用于记录一些时间点、某个时间段、资源加载的耗时等。如果希望记录了 performance 数据就马上上报，就要用 PerformanceObserver。**PerformanceObserver 用于监听记录 performance 数据的行为，一旦记录了就会触发回调，这样就可以在回调里把这些数据上报。**

比如 performance 可以用 mark 方法记录某个时间点：

```javascript
performance.mark('registered-observer');
```

用 measure 方法记录某个时间段（后两个参数是时间点，不传代表从开始到现在）：

```javascript
performance.measure('button clicked', 'from', 'to');
```

用 PerformanceObserver 监听它们：

```html
<html>
<body>
  <button onclick="measureClick()">Measure</button>

  <img src="https://p9-passport.byteacctimg.com/img/user-avatar/4e9e751e2b32fb8afbbf559a296ccbf2~300x300.image" />

  <script>
    const performanceObserver = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => {
        console.log(entry);// 上报
      })
    });
    performanceObserver.observe({entryTypes: ['resource', 'mark', 'measure']});

    performance.mark('registered-observer');

    function measureClick() {
      performance.measure('button clicked');
    }
  </script>
</body>
</html>
```

创建 PerformanceObserver 对象，监听 mark（时间点）、measure（时间段）、resource（资源加载耗时）三种记录时间的行为。页面里用 mark 记录了某个时间点，点击 button 时用 measure 记录了某个时间段的数据，还加载了一个图片。浏览器运行可以看到 mark 的时间点记录、资源加载的耗时、点击按钮的 measure 时间段记录都监听到了，分别打印了三种记录行为的数据。

有了这些数据，就可以上报上去做性能分析了。

## ReportingObserver

当浏览器运行到过时（deprecation）的 api 时，会在控制台打印一个过时的报告。浏览器还会在一些情况下对网页行为做干预（intervention），比如把占用 cpu 太多的广告 iframe 删掉、在网络比较慢的时候把图片替换为占位图片点击才加载。

这些干预都是浏览器做的，会在控制台打印一个报告。干预或者过时的 api 并不是报错，所以不能用错误监听的方式拿到，但这些情况对网页应用来说可能很重要：

- 比如网页就是为了展示广告的，浏览器干预把广告删掉了，开发者如果不知道就无法针对性优化 iframe。
- 比如网页的图片很重要，浏览器干预换成了占位图，开发者如果不知道就不会去优化图片大小。

所以自然也要监听。浏览器提供了 ReportingObserver 这个 api 用来监听这些报告的打印，拿到报告后可以上传：

```javascript
const reportingObserver = new ReportingObserver((reports, observer) => {
    for (const report of reports) {
        console.log(report.body);//上报
    }
}, {types: ['intervention', 'deprecation']});

reportingObserver.observe();
```

**ReportingObserver 可以监听过时的 api、浏览器干预等报告的打印，在回调里上报。这些是错误监听无法监听到、但对了解网页运行情况很有用的数据。**

案例代码见 [GitHub 仓库](https://github.com/QuarkGluonPlasma/react-course-code/tree/main/observer)。

## 总结

浏览器提供了 5 种 Observer：

- IntersectionObserver：监听元素可见性变化，常用来做元素显示的数据采集、图片的懒加载。
- MutationObserver：监听元素属性和子节点变化，比如可以用来做去不掉的水印。
- ResizeObserver：监听元素大小变化。

还有两个与元素无关的：

- PerformanceObserver：监听 performance 记录的行为，来上报数据。
- ReportingObserver：监听过时的 api、浏览器的一些干预行为的报告，可以更全面地了解网页应用的运行情况。

这些 api 相比 addEventListener 添加的交互事件来说用的比较少，但在特定场景下都很有用。

## 继续阅读

- 上一篇：[18-三个简单组件的封装](18-三个简单组件的封装)
- 下一篇：[22-图解网页的各种距离](22-图解网页的各种距离)
