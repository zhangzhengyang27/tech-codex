---
title: "JavaScript 实用技巧"
description: 收录 JavaScript 实用技巧：动态加载脚本、参数默认值、单例与 once、全屏、屏幕录制、MutationObserver、解构赋值与数组操作等常见片段
category: 前端工程化
keywords: [JavaScript, 技巧, 动态加载, 优化]
---

# JavaScript 实用技巧

## 动态加载 JS 文件

在一些特殊的场景下，特别是一些库和框架的开发中，我们有时会去动态的加载 JS 文件并执行，下面是利用 Promise 进行了简单的封装

- 利用 Promise 处理异步的逻辑 
- 利用 script 标签进行 js 的加载并执行

```javascript
function loadJS(files, done) {
  // 获取head标签
  const head = document.getElementsByTagName('head')[0];
  Promise.all(files.map(file => {
    
    return new Promise(resolve => {
      // 创建script标签并添加到head
      const s = document.createElement('script');
      s.type = "text/javascript";
      s.async = true;
      s.src = file;
      // 监听load事件，如果加载完成则resolve
      s.addEventListener('load', (e) => resolve(), false);
      head.appendChild(s);
    });
  })).then(done);  // 所有均完成，执行用户的回调事件
}

loadJS(["test1.js", "test2.js"], () => {
  // 用户的回调逻辑
});
```

## 添加默认值

有时候一个方法需要用户传入一个参数，通常情况下我们有两种处理方式，如果用户不传，我们通常会给一个默认值，亦或是用户必须要传一个参数，不传直接抛错。

```javascript
function double(value) {
    return value * 2
}

// 不传的话给一个默认值0
function double(value = 0) {
    return value * 2
}
```

```js
// 用户必须要传一个参数，不传参数就抛出一个错误

const required = () => {
    throw new Error("This function requires one parameter.")
}
function double(value = required()) {
    return value * 2
}

double(3) // 6
double() // throw Error
```

## 函数只执行一次

有些情况下我们有一些特殊的场景，某一个函数只允许执行一次，或者绑定的某一个方法只允许执行一次。

```javascript
export function once (fn) {
  // 利用闭包判断函数是否执行过
  let called = false
  return function () {
    if (!called) {
      called = true
      fn.apply(this, arguments)
    }
  }
}
```

## 实现单例模式

JavaScript 的单例模式是一种常用的设计模式，它可以确保一个类只有一个实例，并提供对该实例的全局访问点，在JS中有广泛的应用场景，如购物车，缓存对象，全局的状态管理等等

```javascript
let cache;
class A {
  // ...
}

function getInstance() {
  if (cache) return cache;
  return cache = new A();
}

const x = getInstance();
const y = getInstance();

console.log(x === y); // true
```

## 全屏/退出全屏

当你需要将当前屏幕显示为全屏时

```javascript
function fullScreen() {
    const el = document.documentElement
    const rfs =
    el.requestFullscreen ||
    el.webkitRequestFullScreen ||
    el.mozRequestFullScreen ||
    el.msRequestFullscreen
    if(typeof rfs != "undefined" && rfs) {
        rfs.call(el)
    }
}
fullScreen()
```

当你需要退出全屏时

```javascript
function exitScreen() {
  if (document.exitFullscreen) {
    document.exitFullscreen()
  }else if (document.mozCancelFullScreen) {
    document.mozCancelFullScreen()
  } else if (document.webkitCancelFullScreen) {
    document.webkitCancelFullScreen()
  } else if (document.msExitFullscreen) {
    document.msExitFullscreen()
  }
}
exitScreen()
```

## 自定义打印样式

当您需要打印当前页面时

```javascript
window.print()
```

当需要打印出当前页面，但又需要修改当前布局时

```html
<style>
/* Use @media print to adjust the print style you need */
@media print {
    .noprint {
        display: none;
    }
}
</style>
<div class="print">print</div>
<div class="noprint">noprint</div>
```

## 阻止关闭事件

当需要阻止用户刷新或关闭浏览器时，可以选择触发 beforeunload 事件，部分浏览器无法自定义文本内容

```javascript
window.onbeforeunload = function(){    
  return 'Are you sure you want to leave the haorooms blog？';
};
```

## 屏幕录制

当您需要录制当前屏幕并上传或下载屏幕录像时

```javascript
const streamPromise = navigator.mediaDevices.getDisplayMedia()
streamPromise.then(stream => {
  var recordedChunks = [];// recorded video data
  var options = { mimeType: "video/webm; codecs=vp9" };// Set the encoding format
  var mediaRecorder = new MediaRecorder(stream, options);// Initialize the MediaRecorder instance
  // Set the callback when data is available (end of screen recording)
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start();
  
  // Video Fragmentation
  function handleDataAvailable(event) {
    if (event.data.size > 0) {
      recordedChunks.push(event.data);// Add data, event.data is a BLOB object
      download();// Encapsulate into a BLOB object and download
    }
  }
  
  function download() {
    var blob = new Blob(recordedChunks, {
      type: "video/webm"
    });
    // Videos can be uploaded to the backend here
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    a.href = url;
    a.download = "test.webm";
    a.click();
    window.URL.revokeObjectURL(url);
  }
})
```

## 横竖屏

```javascript
function hengshuping(){
    if(window.orientation==180||window.orientation==0){
        alert("Portrait state！")
    }
    if(window.orientation==90||window.orientation==-90){
        alert("Landscape state！")
    }
}
window.addEventListener("onorientationchange" in window ? "orientationchange" : "resize", hengshuping, false);
```

修改横竖屏的样式

```html
<style>
@media all and (orientation : landscape) {
    body {
        background-color: #ff0000;
    }
}
@media all and (orientation : portrait) {
    body {
        background-color: #00ff00;
    }
}
</style>
```

## 标签页隐藏

当你需要监听标签显示和隐藏的事件时

```javascript
const {hidden, visibilityChange} = (() => {
  let hidden, visibilityChange;
  if (typeof document.hidden !== "undefined") {
    // Opera 12.10 and Firefox 18 and later support
    hidden = "hidden";
    visibilityChange = "visibilitychange";
  } else if (typeof document.msHidden !== "undefined") {
    hidden = "msHidden";
    visibilityChange = "msvisibilitychange";
  } else if (typeof document.webkitHidden !== "undefined") {
    hidden = "webkitHidden";
    visibilityChange = "webkitvisibilitychange";
  }
  return {
    hidden,
    visibilityChange
  }
})();

const handleVisibilityChange = () => {
  console.log("currently hidden", document[hidden]);
};

document.addEventListener(
  visibilityChange,
  handleVisibilityChange,
  false
);
```

## 本地图片预览

当你从客户端获取图片但不能立即上传到服务器，需要预览时

```html
<div class="test">
    <input type="file" name="" id="">
    <img src="" alt="">
</div>
```

```html
<script>
const getObjectURL = (file) => {
    let url = null;
    if (window.createObjectURL != undefined) { // basic
        url = window.createObjectURL(file);
    } else if (window.URL != undefined) { // mozilla(firefox) 及现代浏览器
        url = window.URL.createObjectURL(file);
    } else if (window.webkitURL != undefined) { // webkit or chrome
        url = window.webkitURL.createObjectURL(file);
    }
    return url;
}
document.querySelector('input').addEventListener('change', (event) => {
    document.querySelector('img').src = getObjectURL(event.target.files[0])
})
</script>
```

## 递归函数名解耦

当你需要写一个递归函数时，你声明了一个函数名，但是每次修改函数名时，你总是忘记修改内部函数名。arguments 是函数的内部对象，包括传入函数的所有参数，arguments.callee 代表函数名

> 注：`arguments.callee` 已被废弃，在严格模式下不可用（ES5 起严格模式禁止访问）。现代写法推荐直接使用函数名或具名函数表达式。

```javascript
// This is a basic Fibonacci sequence
function fibonacci (n) {
    const fn = arguments.callee
    if (n <= 1) return 1
    return fn(n - 1) + fn(n - 2)
}
```

## 判断 dom 是否显示在页面上

当需要判断一个 dom 元素当前是否出现在视口（viewport）中时，可以尝试使用 IntersectionObserver 来判断

```html
<style>
.item {
    height: 350px;
}
</style>

<div class="container">
  <div class="item" data-id="1">Invisible</div>
  <div class="item" data-id="2">Invisible</div>
  <div class="item" data-id="3">Invisible</div>
</div>
```

```javascript
if (window?.IntersectionObserver) {
  let items = [...document.getElementsByClassName("item")]; 
  let io = new IntersectionObserver(
    (entries) => {
      entries.forEach((item) => {
        item.target.innerHTML =
          item.intersectionRatio === 1? `Element is fully visible`: `Element is partially invisible`;
      });
    },
    {
      root: null,
      rootMargin: "0px 0px",
      threshold: 1, 
      // The threshold is set to 1, and the callback function is triggered only when the ratio reaches 1
    }
  );
  items.forEach((item) => io.observe(item));
}
```

## 元素可编辑

当你需要编辑一个 dom 元素时，让它像 textarea 一样点击

```html
<div contenteditable="true">here can be edited</div>
```

## 监听元素属性变化

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>Title</title>
  </head>
  <body>
    <div id="test">test</div>
    <button onclick="handleClick()">OK</button>
  </body>
  <script>
    const el = document.getElementById("test");
    let n = 1;
    const observe = new MutationObserver((mutations) => {
      console.log("attribute is changed", mutations);
    })
    observe.observe(el, {
      attributes: true
    });

    function handleClick() {
      el.setAttribute("style", "color: red");
      el.setAttribute("data-name", n++);
    }

    setTimeout(() => {
      observe.disconnect(); // stop watch
    }, 5000);
  </script>
</html>
```

## 打印 dom 元素

在开发过程中需要打印 dom 元素时，使用 console.log 往往只能打印出整个 dom 元素，无法查看 dom 元素的内部属性。您可以尝试使用 console.dir

```javascript
console.log(document.body)
console.dir(document.body)
```

## 解构赋值

日常使用解构赋值，一般都是先解构，再赋值，当然我们也可以一行就完成解构加赋值操作，看起来非常简化，当然可读性你懂得！

```javascript
let people = { name: null, age: null };
let result = { name: '张三',  age: 16 };

({ name: people.name, age: people.age} = result);
console.log(people) // {"name":"张三","age":16}
```

### 对基础数据类型进行解构

日常中我们应该用不到这样的场景，但是实际上我们也可以对基础数据类型解构

```javascript
const {length : a} = '1234';
console.log(a) // 4
```

### 对数组解构拿到最后一项

实际上我们是可以对数组解构赋值拿到 **length** 属性的，通过这个特性也可以做更多的事情

```javascript
const arr = [1, 2, 3];
const { 0: first, length, [length - 1]: last } = arr;
first; // 1
last; // 3
length; // 3
```

## 判断是否是整数

```javascript
/* 1.任何整数都会被1整除，即余数是0。利用这个规则来判断是否是整数。但是对字符串不准确 */
function isInteger(obj) {
 return obj%1 === 0
}

/* 1. 添加一个是数字的判断 */
function isInteger(obj) {
 return typeof obj === 'number' && obj%1 === 0
}

/* 2. 使用Math.round、Math.ceil、Math.floor判断 整数取整后还是等于自己。利用这个特性来判断是否是整数*/
function isInteger(obj) {
 return Math.floor(obj) === obj
}

/* 3. 通过parseInt判断 某些场景不准确 */
function isInteger(obj) {
 return parseInt(obj, 10) === obj
}

/* 4. 通过位运算符*/
function isInteger(obj) {
 return (obj | 0) === obj
}

/* 5.ES6提供了Number.isInteger */
```

## 随机

### 数组随机打乱顺序

通过 `0.5-Math.random()` 得到一个随机数，再通过两次sort排序打乱的更彻底,但是这个方法实际上并不够随机，如果是企业级运用，建议使用第二种洗牌算法

```javascript
function shuffleSimple(arr) {
  return arr.sort(() => 0.5 - Math.random()).sort(() => 0.5 - Math.random());
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[randomIndex]] = [arr[randomIndex], arr[i]]
  }
  return arr
}
```

### 随机获取一个 Boolean 值

```javascript
function randomBool() {
    return Math.random() > 0.5
}
```

### 获取随机颜色

日常我们经常会需要获取一个随机颜色，通过随机数即可完成

```javascript
function getRandomColor(){
    return `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;
}
```

## 移动数组

### 数组的第一项放到最后一项

```javascript
function moveFirstToLast(arr){
  arr.push(arr.shift());
  return arr;
}
```

### 数组最后一项移到第一项

```javascript
function moveLastToFirst(arr){
  arr.unshift(arr.pop());
  return arr;
}
```

## 检测是否为空对象

通过使用 ES6 的 Reflect 静态方法判断它的长度就可以判断是否是空对象了，也可以通过 Object.keys() 来判断

```javascript
function isEmpty(obj){
  return  Reflect.ownKeys(obj).length === 0 && obj.constructor === Object;
}
```

## 比较两个时间大小

通过调用 getTime 获取时间戳比较就可以了

```javascript
function compare(a, b){
    return a.getTime() > b.getTime();
}
```

## 判断一个参数是不是函数

有时候我们的方法需要传入一个函数回调，但是需要检测其类型，我们可以通过 Object 的原型方法去检测，当然这个方法可以准确检测任何类型

```javascript
function isFunction(v){
  return ['[object Function]', '[object GeneratorFunction]', '[object AsyncFunction]'].includes(Object.prototype.toString.call(v));
}
```

## 判断是否 Node.js 环境

通过判断全局环境来检测是否是 Node.js 环境

```javascript
function isNode(){
    return typeof process !== 'undefined' && process.versions != null && process.versions.node != null;
}
```