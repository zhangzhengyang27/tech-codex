---
title: "BOM"
description: "BOM（浏览器对象模型）详解：window 对象的 Global 角色、窗口位置与大小、window.open 与弹窗屏蔽、定时器、系统对话框、location/navigator/screen/history 各对象的属性与用法。"
category: JavaScript

---

# BOM

ECMAScript 是 JavaScript 的核心，但如果要在 Web 中使用 JavaScript，那么 BOM（浏览器对象模型）则无疑才是真正的核心。BOM 提供了很多对象，用于访问浏览器的功能，这些功能与任何网页内容无关。

W3C 为了把浏览器中 JavaScript 最基本的部分标准化，已经将 BOM 的主要方面纳入了 HTML5 的规范中

## window 对象

BOM 的核心对象是 window ，它表示浏览器的一个实例。在浏览器中， window 对象有双重角色，它既是通过 JavaScript 访问浏览器窗口的一个接口，又是 ECMAScript 规定的 **Global 对象**。这意味着在网页中定义的任何一个对象、变量和函数，都以 window 作为其 Global 对象，因此有权访问 parseInt() 等方法

### Global 作用域

由于 window 对象同时扮演着 ECMAScript 中 Global 对象的角色，所以通过 var 声明的所有全局变量和函数都会变成 window 对象的属性和方法。

抛开全局变量会成为 window 对象的属性不谈，定义全局变量与在 window 对象上直接定义属性还是有一点差别；全局变量不能通过 delete 操作符删除，而直接在 window 对象上的定义的属性可以删除。

```javascript
var age = 29;		// 不可以删除
window.color = "red";  // 可以删除

delete window.age; //returns false
delete window.color; //returns true

alert(window.age); //29
alert(window.color); //undefined
```

刚才使用 var 语句添加的 age 属性有一个名为[[Configurable]]的特性，这个特性的值被设置为false，因此这样定义的属性不可以通过delete 操作符删除。

另外，还要记住一件事：尝试访问未声明的变量会抛出错误，但是通过查询 window 对象，可以知道某个可能未声明的变量是否存在

```javascript
//这里会抛出错误，因为 oldValue 未定义
var newValue = oldValue;

//这里不会抛出错误，因为这是一次属性查询
//newValue 的值是 undefined
var newValue = window.oldValue;
```

很多全局 JavaScript 对象（如 location 和 navigator）实际上都是 window 对象的属性

### 窗口关系及框架

如果页面中包含框架，则每个框架都拥有自己的 window 对象，并且保存在 frames 集合中。在 frames集合中，可以通过数值索引（从 0 开始，从左至右，从上到下）或者框架名称来访问相应的 window 对象。每个 window 对象都有一个 name 属性，其中包含框架的名称。下面是一个包含框架的页面：

```html
<html>
	<head>
	<title>Frameset Example</title>
	</head>
	<frameset rows="160,*">
		<frame src="frame.htm" name="topFrame">
        <frameset cols="50%,50%">
            <frame src="anotherframe.htm" name="leftFrame">
            <frame src="yetanotherframe.htm" name="rightFrame">
        </frameset>
	</frameset>
</html>
```

以上代码创建了一个框架集，其中一个框架居上，两个框架居下。对这个例子而言，可以通过 `window.frames[0]` 或者 `window.frames["topFrame"] `来引用上方的框架。不过，最好使用 top 而非 window 来引用这些框架（例如通过 `top.frames[0]`）

**我们知道，top 对象始终指向最高（最外）层的框架，也就是浏览器窗口。**使用它可以确保在一个框架中正确地访问另一个框架。因为对于在一个框架中编写的任何代码来说，其中的 window 对象指向的都是那个框架的特定实例，而非最高层的框架。

图  展示了在最高层窗口中，通过代码来访问前面例子中每个框架的不同方式

![image-20230920172800409](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309201728972.png)

与 top 相对的另一个 window 对象是 parent。顾名思义，parent（父）对象始终指向当前框架的直接上层框架。在某些情况下，parent 有可能等于 top；但在没有框架的情况下，parent 一定等于top（此时它们都等于window）

```html
<html> 
 <head> 
 <title>Frameset Example</title> 
 </head> 
 	<frameset rows="100,*"> 
 			<frame src="frame.htm" name="topFrame"> 
 			<frameset cols="50%,50%"> 
 				<frame src="anotherframe.htm" name="leftFrame"> 
 				<frame src="anotherframeset.htm" name="rightFrame">
 			</frameset> 
 	</frameset> 
</html>
```

这个框架集中的一个框架包含了另一个框架集，该框架集的代码如下所示

```html
<html> 
 <head> 
 <title>Frameset Example</title> 
 </head> 
 <frameset cols="50%,50%"> 
 		<frame src="red.htm" name="redFrame"> 
 		<frame src="blue.htm" name="blueFrame"> 
 </frameset> 
</html>
```

浏览器在加载完第一个框架集以后，会继续将第二个框架集加载到 rightFrame 中。如果代码位于redFrame（或 blueFrame）中，那么 parent 对象指向的就是 rightFrame。可是，如果代码位于topFrame 中，则 parent 指向的是 top，因为 topFrame 的直接上层框架就是最外层框架。下图展示了在将前面例子加载到浏览器之后，不同 window 对象的值

![image-20230920172922099](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309201729665.png)

注意，除非最高层窗口是通过 window.open() 打开的，否则其 window 对象的 name 属性不会包含任何值

与框架有关的最后一个对象是 self，它始终指向 window；实际上，self 和 window 对象可以互换使用。引入 self 对象的目的只是为了与 top 和 parent 对象对应起来，因此它不格外包含其他值

所有这些对象都是 window 对象的属性，可以通过 `window.parent`、`window.top` 等形式来访问。同时，这也意味着可以将不同层次的window 对象连缀起来，例如 `window.parent.parent.frames[0]`

在使用框架的情况下，浏览器中会存在多个 Global 对象。在每个框架中定义的全局变量会自动成为框架中 window 对象的属性。由于每个 window 对象都包含原生类型的构造函数，因此每个框架都有一套自己的构造函数，这些构造函数一一对应，但并不相等。例如，`top.Object`  并不等于 `top.frames[0].Object`。这个问题会影响到对跨框架传递的对象使用 instanceof 操作符。

###  窗口位置

window 对象的位置可以通过不同的属性和方法来确定。现代浏览器提供了 screenLeft 和 screenTop 属性，用于表示窗口相对于屏幕左侧和顶部的位置 ，返回值的单位是 CSS 像素。

可以使用 moveTo() 和 moveBy() 方法移动窗口。这两个方法都接收两个参数，其中 moveTo() 接收要移动到的新位置的绝对坐标 *x* 和 *y*；而 moveBy()则接收相对当前位置在两个方向上移动的像素数。比如：

```js
// 把窗口移动到左上角
window.moveTo(0,0); 
// 把窗口向下移动 100 像素
window.moveBy(0, 100);
```

### 像素比

CSS 像素是 Web 开发中使用的统一像素单位。这个单位的背后其实是一个角度：0.0213°。如果屏幕距离人眼是一臂长，则以这个角度计算的 CSS 像素大小约为 1/96 英寸。这样定义像素大小是为了在不同设备上统一标准。

比如，低分辨率平板设备上 12 像素（CSS 像素）的文字应该与高清 4K 屏幕下 12 像素（CSS 像素）的文字具有相同大小。这就带来了一个问题，不同像素密度的屏幕下就会有不同的缩放系数，以便把物理像素（屏幕实际的分辨率）转换为 CSS 像素（浏览器报告的虚拟分辨率）

举个例子，手机屏幕的物理分辨率可能是 1920×1080，但因为其像素可能非常小，所以浏览器就需要将其分辨率降为较低的逻辑分辨率，比如 640×320。这个物理像素与 CSS 像素之间的转换比率由 window.devicePixelRatio 属性提供。对于分辨率从 1920×1080 转换为 640×320 的设备，window.devicePixelRatio 的值就是 3。这样一来，12 像素（CSS 像素）的文字实际上就会用 36 像素的物理像素来显示。

window.devicePixelRatio 实际上与每英寸像素数（DPI，dots per inch）是对应的。DPI 表示单位像素密度，而window.devicePixelRatio 表示物理像素与逻辑像素之间的缩放系数

### 窗口大小

在不同浏览器中确定浏览器窗口大小没有想象中那么容易。所有现代浏览器都支持 4 个属性：innerWidth、innerHeight、outerWidth 和 outerHeight。outerWidth 和 outerHeight 返回浏览器窗口自身的大小（不管是在最外层 window 上使用，还是在窗格 `<frame>` 中使用）。innerWidth 和 innerHeight 返回浏览器窗口中页面视口的大小（不包含浏览器边框和工具栏）。

document.documentElement.clientWidth 和 document.documentElement.clientHeight 返回页面视口的宽度和高度。

浏览器窗口自身的精确尺寸不好确定，但可以确定页面视口的大小，如下所示：

```javascript
let pageWidth = window.innerWidth, 
    pageHeight = window.innerHeight; 

if (typeof pageWidth != "number") { 
  if (document.compatMode == "CSS1Compat"){ 
    pageWidth = document.documentElement.clientWidth; 
    pageHeight = document.documentElement.clientHeight; 
  } else { 
    pageWidth = document.body.clientWidth; 
    pageHeight = document.body.clientHeight; 
  } 
}
```

首先将 `window.innerWidth` 和 `window.innerHeight` 的值分别赋给了`pageWidth`  和 `pageHeight`。然后检查 pageWidth 中保存的是不是一个数值；如果不是，则通过检查 `document.compatMode` 来确定页面是否处于标准模式

对于移动设备，`window.innerWidth` 和 `window.innerHeight`  返回视口大小，也就是屏幕上可见页面区域的大小。

在其他移动浏览器中，`document.documentElement`  度量的是布局视口，即渲染后页面的实际大小（与可见视口不同，可见视口只是整个页面中的一小部分）。移动 IE 浏览器把布局视口的信息保存在`document.body.clientWidth`和 `document.body.clientHeight` 中。这些值不会随着页面缩放变化

由于与桌面浏览器间存在这些差异，最好是先检测一下用户是否在使用移动设备，然后再决定使用哪个属性

> 有关移动设备视口的话题比较复杂，有很多非常规的情形，也有各种各样的建议。移动开发咨询师 Peter-Paul Koch 记述了他对这个问题的研究：http://t.cn/zOZs0Tz。如果你在做移动 Web 开发，推荐你读一读这篇文章
>

另外，使用 resizeTo() 和 resizeBy() 方法可以调整浏览器窗口的大小。这两个方法都接收两个参数，其中 resizeTo() 接收浏览器窗口的新宽度和新高度，而 resizeBy() 接收新窗口与原窗口的宽度和高度之差

```javascript
//调整到 100×100
window.resizeTo(100, 100);

//调整到 200×150
window.resizeBy(100, 50);

//调整到 300×300
window.resizeTo(300, 300);
```

与移动窗口的方法一样，缩放窗口的方法可能会被浏览器禁用，而且在某些浏览器中默认是禁用的。同样，缩放窗口的方法只能应用到最上层的 window 对象

### 视口位置

浏览器窗口尺寸通常无法满足完整显示整个页面，为此用户可以通过滚动在有限的视口中查看文档。度量文档相对于视口滚动距离的属性有两对，返回相等的值：window.pageXoffset/window.scrollX 和 window.pageYoffset/window.scrollY

可以使用 scroll()、scrollTo() 和 scrollBy() 方法滚动页面。这 3 个方法都接收表示相对视口距离的 *x* 和 *y* 坐标，这两个参数在前两个方法中表示要滚动到的坐标，在最后一个方法中表示滚动的距离

```js
// 相对于当前视口向下滚动 100 像素
window.scrollBy(0, 100); 

// 相对于当前视口向右滚动 40 像素
window.scrollBy(40, 0); 

// 滚动到页面左上角
window.scrollTo(0, 0);

// 滚动到距离屏幕左边及顶边各 100 像素的位置
window.scrollTo(100, 100);
```

这几个方法也都接收一个 ScrollToOptions 字典，除了提供偏移值，还可以通过 behavior 属性告诉浏览器是否平滑滚动

```js
// 正常滚动 
window.scrollTo({ 
  left: 100, 
  top: 100, 
  behavior: 'auto' 
}); 

// 平滑滚动
window.scrollTo({ 
  left: 100, 
  top: 100, 
  behavior: 'smooth' 
});
```

### 导航和打开窗口

使用 window.open() 方法既可以导航到一个特定的 URL，也可以打开一个新的浏览器窗口

这个方法可以接收 4 个参数

1. 要加载的 URL
2. 窗口目标
3. 一个特性字符串以及一个表示新页面是否取代浏览器历史记录中当前加载页面的布尔值
4. 通常只须传递第一个参数，最后一个参数只在不打开新窗口的情况下使用

如果为 window.open() 传递了第二个参数，而且该参数是已有窗口或框架的名称，那么就会在具有该名称的窗口或框架中加载第一个参数指定的 URL。看下面的例子

```javascript
//等同于< a href="http://www.wrox.com" target="topFrame"></a>
window.open("http://www.wrox.com/", "topFrame");
```

如果有一个名叫 "topFrame" 的窗口或者框架，就会在该窗口或框架加载这个 URL；否则，就会创建一个新窗口并将其命名为 "topFrame"。此外，第二个参数也可以是下列任何一个特殊的窗口名称：`self`、`parent`、`top`  或 `blank`

##### 弹出窗口

如果给 `window.open()` 传递的第二个参数并不是一个已经存在的窗口或框架，那么该方法就会根据在第三个参数位置上传入的字符串创建一个新窗口或新标签页。如果没有传入第三个参数，那么就会打开一个带有全部默认设置（工具栏、地址栏和状态栏等）的新浏览器窗口（或者打开一个新标签页——根据浏览器设置）。在不打开新窗口的情况下，会忽略第三个参数。

第三个参数是一个逗号分隔的设置字符串，表示在新窗口中都显示哪些特性

| 设置       | 值        | 说明                                                         |
| ---------- | --------- | ------------------------------------------------------------ |
| fullscreen | yes 或 no | 表示浏览器窗口是否最大化。仅限IE                             |
| height     | 数值      | 表示新窗口的高度。不能小于100                                |
| left       | 数值      | 表示新窗口的左坐标。不能是负值                               |
| location   | yes 或 no | 表示是否在浏览器窗口中显示地址栏。不同浏览器的默认值不同。如果设置为no，地址栏可能会隐藏，也可能会被禁用（取决于浏览器） |
| menubar    | yes 或 no | 表示是否在浏览器窗口中显示菜单栏。默认值为 no                |
| resizable  | yes 或 no | 表示是否可以通过拖动浏览器窗口的边框改变其大小。默认值为 no  |
| scrollbars | yes 或 no | 表示如果内容在视口中显示不下，是否允许滚动。默认值为 no      |
| status     | yes 或 no | 表示是否在浏览器窗口中显示状态栏。默认值为 no                |
| toolbar    | yes 或 no | 表示是否在浏览器窗口中显示工具栏。默认值为 no                |
| top        | 数值      | 表示新窗口的上坐标。不能是负值                               |
| width      | 数值      | 表示新窗口的宽度。不能小于100                                |

```javascript
// 打开一个新的可以调整大小的窗口，窗口初始大小为 400×400 像素，并且距屏幕上沿和左边各 10 像素
window.open("http://www.wrox.com/","wroxWindow","height=400,width=400,top=10,left=10,resizable=yes");
```

`window.open()`  方法会返回一个指向新窗口的引用。引用的对象与其他 window 对象大致相似，但我们可以对其进行更多控制。例如，有些浏览器在默认情况下可能不允许我们针对主浏览器窗口调整大小或移动位置，但却允许我们针对通过 window.open() 创建的窗口调整大小或移动位置。通过这个返回的对象，可以像操作其他窗口一样操作新打开的窗口

```javascript
var wroxWin = window.open("http://www.wrox.com/","wroxWindow","height=400,width=400,top=10,left=10,resizable=yes");

//调整大小
wroxWin.resizeTo(500,500);

//移动位置
wroxWin.moveTo(100,100);

//调用 close() 方法还可以关闭新打开的窗口。
wroxWin.close();
alert(wroxWin.closed); //true
```

但是，这个方法仅适用于通过 `window.open() ` 打开的弹出窗口。对于浏览器的主窗口，如果没有得到用户的允许是不能关闭它的。不过，弹出窗口倒是可以调用 `top.close() ` 在不经用户允许的情况下关闭自己。弹出窗口关闭之后，窗口的引用仍然还在，但除了像下面这样检测其 closed 属性之外，已经没有其他用处了

```javascript
wroxWin.close(); 

alert(wroxWin.closed); //true
```

新创建的 window 对象有一个 opener 属性，其中保存着打开它的原始窗口对象。这个属性只在弹出窗口中的最外层 window 对象（top）中有定义，而且指向调用 window.open()的窗口或框架

```javascript
var wroxWin = window.open("http://www.wrox.com/","wroxWindow","height=400,width=400,top=10,left=10,resizable=yes");

alert(wroxWin.opener == window); //true
```

虽然弹出窗口中有一个指针指向打开它的原始窗口，但原始窗口中并没有这样的指针指向弹出窗口。窗口并不跟踪记录它们打开的弹出窗口，因此我们只能在必要的时候自己来手动实现跟踪

在某些浏览器中，每个标签页会运行在独立的进程中。如果一个标签页打开了另一个，而 window 对象需要跟另一个标签页通信，那么标签便不能运行在独立的进程中。在这些浏览器中，可以将新打开的标签页的 opener 属性设置为 null，表示新打开的标签页可以运行在独立的进程中

```javascript
let wroxWin = window.open("http://www.wrox.com/", "wroxWindow","height=400,width=400,top=10,left=10,resizable=yes");

wroxWin.opener = null;
```

将 opener 属性设置为 null 就是告诉浏览器新创建的标签页不需要与打开它的标签页通信，因此可以在独立的进程中运行。标签页之间的联系一旦切断，将没有办法恢复

##### 安全限制

弹出窗口有段时间被在线广告用滥了。很多在线广告会把弹出窗口伪装成系统对话框，诱导用户点击。因为长得像系统对话框，所以用户很难分清这些弹窗的来源。为了让用户能够区分清楚，浏览器开始对弹窗施加限制。

IE 的早期版本实现针对弹窗的多重安全限制，包括不允许创建弹窗或把弹窗移出屏幕之外，以及不允许隐藏状态栏等。从 IE7 开始，地址栏也不能隐藏了，而且弹窗默认是不能移动或缩放的。Firefox 1禁用了隐藏状态栏的功能，因此无论 window.open() 的特性字符串是什么，都不会隐藏弹窗的状态栏。

Firefox 3 强制弹窗始终显示地址栏。Opera 只会在主窗口中打开新窗口，但不允许它们出现在系统对话框的位置。

此外，浏览器会在用户操作下才允许创建弹窗。在网页加载过程中调用 window.open()没有效果，而且还可能导致向用户显示错误。弹窗通常可能在鼠标点击或按下键盘中某个键的情况下才能打开

> 注意 IE 对打开本地网页的窗口再弹窗解除了某些限制。同样的代码如果来自服务器，则会施加弹窗限制

##### 弹出窗口屏蔽程序

所有现代浏览器都内置了屏蔽弹窗的程序，因此大多数意料之外的弹窗都会被屏蔽。在浏览器屏蔽弹窗时，可能会发生一些事。如果浏览器内置的弹窗屏蔽程序阻止了弹窗，那么 window.open() 很可能会返回 null。此时，只要检查这个方法的返回值就可以知道弹窗是否被屏蔽了，比如

```javascript
var wroxWin = window.open("http://www.wrox.com", "_blank");
if (wroxWin == null){
	alert("The popup was blocked!");
}
```

如果是浏览器扩展或其他程序阻止的弹出窗口，那么 window.open() 通常会抛出一个错误。因此，要想准确地检测出弹出窗口是否被屏蔽，必须在检测返回值的同时，将对 window.open() 的调用封装在一个 `try-catch` 块中

```javascript
var blocked = false;
try {
  var wroxWin = window.open("http://www.wrox.com", "_blank");
  if (wroxWin == null){
    blocked = true;
  }
} catch (ex){
  blocked = true;
}
if (blocked){
  alert("The popup was blocked!");
}
```

无论弹窗是用什么方法屏蔽的，以上代码都可以准确判断调用 window.open() 的弹窗是否被屏蔽了

### 定时器

JavaScript 在浏览器中是单线程执行的，但允许使用定时器指定在某个时间之后或每隔一段时间就执行相应的代码。setTimeout()用于指定在一定时间后执行某些代码，而 setInterval()用于指定每隔一段时间执行某些代码。

setTimeout() 方法通常接收两个参数：要执行的代码和在执行回调函数前等待的时间（毫秒）。为了调度不同代码的执行，JavaScript 维护了一个任务队列。其中的任务会按照添加到队列的先后顺序执行。setTimeout() 的第二个参数只是告诉 JavaScript 引擎在指定的毫秒数过后把任务添加到这个队列。如果队列是空的，则会立即执行该代码。如果队列不是空的，则代码必须等待前面的任务执行完才能执行。

调用 setTimeout()时，会返回一个表示该超时排期的数值 ID。这个超时 ID 是被排期执行代码的唯一标识符，可用于取消该任务。要取消等待中的排期任务，可以调用 clearTimeout()方法并传入超时 ID，如下面的例子所示

```javascript
// 设置超时任务
let timeoutId = setTimeout(() => alert("Hello world!"), 1000); 

// 取消超时任务
clearTimeout(timeoutId);
```

只要是在指定时间到达之前调用 clearTimeout()，就可以取消超时任务。在任务执行后再调用 clearTimeout() 没有效果

> 所有超时执行的代码（函数）都会在全局作用域中的一个匿名函数中运行，因此函数中的 this 值在非严格模式下始终指向 window，而在严格模式下是 undefined。如果给 setTimeout()提供了一个箭头函数，那么 this 会保留为定义它时所在的词汇作用域

setInterval() 同样可以接收两个参数：要执行的代码（字符串或函数），以及把下一次执行定时代码的任务添加到队列要等待的时间（毫秒）

```js
setInterval(() => alert("Hello world!"), 10000);
```

> 间隔时间，指的是向队列添加新任务之前等待的时间。比如，调用 setInterval() 的时间为 01:00:00，间隔时间为 3000 毫秒。这意味着 01:00:03 时，浏览器会把任务添加到执行队列。浏览器不关心这个任务什么时候执行或者执行要花多长时间。因此，到了01:00:06，它会再向队列中添加一个任务。由此可看出，执行时间短、非阻塞的回调函数比较适合 setInterval()

调用 setInterval() 方法同样也会返回一个间歇调用 ID，该 ID 可用于在将来某个时刻取消间歇调用。要取消尚未执行的间歇调用，可以使用 clearInterval() 方法并传入相应的间歇调用 ID

取消间歇调用的重要性要远远高于取消超时调用，因为在不加干涉的情况下，间歇调用将会一直执行到页面卸载。以下是一个常见的使用间歇调用的例子。

```javascript
var num = 0;
var max = 10;
var intervalId = null;

function incrementNumber() {
  num++;
  //如果执行次数达到了 max 设定的值，则取消后续尚未执行的调用
  if (num == max) {
    clearInterval(intervalId);
    alert("Done");
  }
}

intervalId = setInterval(incrementNumber, 500);
```

变量 num 每半秒钟递增一次，当递增到最大值时就会取消先前设定的间歇调用。这个模式也可以使用超时调用来实现，如下所示

```javascript
var num = 0;
var max = 10;
function incrementNumber() {
  num++;
  // 如果执行次数未达到 max  设定的值，则设置另一次超时调用
  if (num < max) {
    setTimeout(incrementNumber, 500);
  } else {
    alert("Done");
  }
}

setTimeout(incrementNumber, 500);
```

可见，在使用超时调用时，没有必要跟踪超时调用 ID，因为每次执行代码之后，如果不再设置另一次超时调用，调用就会自行停止。**一般认为，使用超时调用来模拟间歇调用的是一种最佳模式**

在开发环境下，很少使用真正的间歇调用，原因是后一个间歇调用可能会在前一个间歇调用结束之前启动。而像前面示例中那样使用超时调用，则完全可以避免这一点。所以，最好不要使用间歇调用

### 系统对话框

浏览器通过 `alert()`、`confirm()` 和 `prompt()` 方法可以调用系统对话框向用户显示消息。

系统对话框与在浏览器中显示的网页没有关系，也不包含 HTML。它们的外观由操作系统及（或）浏览器设置决定，而不是由 CSS 决定

此外，通过这几个方法打开的对话框都是同步和模态的。也就是说，显示这些对话框的时候代码会停止执行，而关掉这些对话框后代码又会恢复执行

由于不涉及 HTML、CSS 或 JavaScript，因此它们是增强 Web 应用程序的一种便捷方式

还有两个可以通过 JavaScript 打开的对话框，即“查找”和“打印”。这两个对话框都是异步显示的，能够将控制权立即交还给脚本。这两个对话框与用户通过浏览器菜单的“查找”和“打印”命令打开的对话框相同

而在 JavaScript 中则可以像下面这样通过 window 对象的 find() 和 print() 方法打开它们

```javascript
//显示“打印”对话框
window.print(); 

//显示“查找”对话框
window.find();
```

这两个方法同样不会就用户在对话框中的操作给出任何信息，因此它们的用处有限。另外，既然这两个对话框是异步显示的，那么 Chrome 的对话框计数器就不会将它们计算在内，所以它们也不会受用户禁用后续对话框显示的影响

## location 对象

location 是最有用的 BOM 对象之一，它提供了与当前窗口中加载的文档有关的信息，还提供了一些导航功能 。location 对象是很特别的一个对象，因为它既是 window 对象的属性，也是 document 对象的属性；换句话说，`window.location` 和 `document.location` 引用的是同一个对象

location 对象的用处不只表现在它保存着当前文档的信息，还表现在它将 URL 解析为独立的片段，让开发人员可以通过不同的属性访问这些片段。下表列出了 location 对象的所有属性（注：省略了每个属性前面的 location 前缀）

| 属 性 名 | 例 子                 | 说 明                                                        |
| -------- | --------------------- | ------------------------------------------------------------ |
| hash     | "#contents"           | 返回URL中的hash（#号后跟零或多个字符），如果URL中不包含散列，则返回空字符串 |
| host     | "www.wrox.com:80"     | 返回服务器名称和端口号（如果有）                             |
| hostname | "www.wrox.com"        | 返回不带端口号的服务器名称                                   |
| href     | "http:/www.wrox.com"  | 返回当前加载页面的完整URL。而location对象的toString()方法也返回这个值 |
| pathname | "/WileyCDA/"          | 返回URL中的目录和（或）文件名                                |
| port     | "8080"                | 返回URL中指定的端口号。如果URL中不包含端口号，则这个属性返回空字符串 |
| protocol | "http:"               | 返回页面使用的协议。通常是http:或https:                      |
| search   | "?q=javascript"       | 返回URL的查询字符串。这个字符串以问号开头                    |
| origin   | "http://www.wrox.com" | URL 的源地址。只读                                           |

### 查询字符串

虽然通过上面的属性可以访问到 location 对象的大多数信息，但其中访问 URL 包含的查询字符串的属性并不方便。

尽管 location.search 返回从问号到 URL 末尾的所有内容，但却没有办法逐个访问其中的每个查询字符串参数。为此，可以像下面这样创建一个函数，用以解析查询字符串，然后返回包含所有参数的一个对象：

```javascript
let getQueryStringArgs = function() { 
  // 取得没有开头问号的查询字符串
  let qs = (location.search.length > 0 ? location.search.substring(1) : "");
  // 保存数据的对象
  let    args = {}; 
  
  // 把每个参数添加到 args 对象
  for (let item of qs.split("&").map(kv => kv.split("="))) { 
    let name = decodeURIComponent(item[0]), 
        value = decodeURIComponent(item[1]); 
    if (name.length) { 
      args[name] = value; 
    } 
  }
  return args; 
}
```

下面给出了使用这个函数的示例

```javascript
// 假设查询字符串为 ?q=javascript&num=10 
let args = getQueryStringArgs(); 

alert(args["q"]); // "javascript" 
alert(args["num"]); // "10"
```

可见，每个查询字符串参数都成了返回对象的属性。这样就极大地方便了对每个参数的访问

#### URLSearchParams

URLSearchParams 提供了一组标准 API 方法，通过它们可以检查和修改查询字符串。给 URLSearchParams 构造函数传入一个查询字符串，就可以创建一个实例。这个实例上暴露了 get()、set()和 delete() 等方法，可以对查询字符串执行相应操作

```js
let qs = "?q=javascript&num=10"; 
let searchParams = new URLSearchParams(qs); 
alert(searchParams.toString()); // "q=javascript&num=10"
searchParams.has("num"); // true 
searchParams.get("num"); // "10"
searchParams.set("page", "3"); 
alert(searchParams.toString()); // "q=javascript&num=10&page=3"
searchParams.delete("q"); 
alert(searchParams.toString()); // "num=10&page=3"
```

大多数支持 URLSearchParams 的浏览器也支持将 URLSearchParams 的实例用作可迭代对象：

```js
let qs = "?q=javascript&num=10"; 
let searchParams = new URLSearchParams(qs); 
for (let param of searchParams) { 
  console.log(param); 
} 

// ["q", "javascript"] 
// ["num", "10"]
```

### 操作地址

可以通过修改 location 对象修改浏览器的地址。首先，最常见的是使用 assign() 方法并传入一个 URL

```javascript
location.assign("http://www.wrox.com");
```

这样，就可以立即打开新 URL 并在浏览器的历史记录中生成一条记录。如果是将 `location.href` 或 `window.location` 设置为一个 URL 值，也会以该值调用 `assign()` 方法

```javascript
window.location = "http://www.wrox.com"; 
location.href = "http://www.wrox.com";
```

在这 3 种修改浏览器地址的方法中，设置 location.href 是最常见的。

另外，修改 location 对象的其他属性也可以改变当前加载的页面。下面的例子展示了通过将 hash、search、hostname、pathname 和 port 属性设置为新值来改变 URL

```javascript
//假设初始 URL 为 http://www.wrox.com/WileyCDA/

//将 URL 修改为"http://www.wrox.com/WileyCDA/#section1"
location.hash = "#section1";

//将 URL 修改为"http://www.wrox.com/WileyCDA/?q=javascript"
location.search = "?q=javascript";

//将 URL 修改为"http://www.yahoo.com/WileyCDA/"
location.hostname = "www.yahoo.com";

//将 URL 修改为"http://www.yahoo.com/mydir/"
location.pathname = "mydir";

//将 URL 修改为"http://www.yahoo.com:8080/WileyCDA/"
location.port = 8080;
```

除了 hash 之外，只要修改 location 的一个属性，就会导致页面重新加载新 URL。

在以前面提到的方式修改 URL 之后，浏览器历史记录中就会增加相应的记录。当用户单击“后退”按钮时，就会导航到前一个页面。如果不希望增加历史记录，可以使用 replace()方法。这个方法接收一个 URL 参数，但重新加载后不会增加历史记录。调用 replace() 之后，用户不能回到前一页

```html
<!DOCTYPE html> 
<html> 
<head> 
 <title>You won't be able to get back here</title> 
</head> 
 <body> 
 		<p>Enjoy this page for a second, because you won't be coming back here.</p> 
 		<script type="text/javascript"> 
 				setTimeout(function () { 
 					location.replace("http://www.wrox.com/"); 
 				}, 1000); 
 		</script> 
</body> 
</html>
```

与位置有关的最后一个方法是 reload()，作用是重新加载当前显示的页面。如果调用 reload() 时不传递任何参数，页面就会以最有效的方式重新加载。也就是说，如果页面自上次请求以来并没有改变过，页面就会从浏览器缓存中重新加载。如果要强制从服务器重新加载，则需要像下面这样为该方法传递参数 true

```javascript
location.reload(); //重新加载（有可能从缓存中加载）
location.reload(true); //重新加载（从服务器重新加载）
```

> 注：forceReload 参数并非标准——现代规范中 `location.reload()` 不接受参数，Chrome/Safari 等浏览器会忽略它（历史上仅 Firefox 支持）。

位于 reload()调用之后的代码可能会也可能不会执行，这要取决于网络延迟或系统资源等因素。最好将 reload() 放在代码的最后一行

## navigator 对象

最早由 Netscape Navigator 2.0 引入的 navigator 对象，现在已经成为识别客户端浏览器的事实标准。与其他 BOM 对象的情况一样，每个浏览器中的 navigator 对象也都有一套自己的属性。下表列出了存在于所有浏览器中的属性和方法，以及支持它们的浏览器版本

![image-20230920173952491](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309201739008.png)

![image-20230920174020812](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309201740366.png)

### 检测插件

检测浏览器是否安装了某个插件是开发中常见的需求。除 IE10 及更低版本外的浏览器，都可以通过 plugins 数组来确定。这个数组中的每一项都包含如下属性

- name  插件的名字

- description  插件的描述

- filename   插件的文件名

- length  插件所处理的 MIME 类型数量

通常，name 属性包含识别插件所需的必要信息，尽管不是特别准确。检测插件就是遍历浏览器中可用的插件，并逐个比较插件的名称

```javascript
// 插件检测，IE10 及更低版本无效 
let hasPlugin = function(name) { 
  name = name.toLowerCase();
  for (let plugin of window.navigator.plugins){ 
    if (plugin.name.toLowerCase().indexOf(name) > -1){ 
      return true; 
    } 
  } 
  return false; 
} 

// 检测 Flash 
alert(hasPlugin("Flash")); 

// 检测 QuickTime 
alert(hasPlugin("QuickTime"));
```

plugins 集合有一个名叫 refresh() 的方法，用于刷新 plugins 以反映最新安装的插件。这个方法接收一个参数：表示是否应该重新加载页面的一个布尔值。如果将这个值设置为 true，则会重新加载包含插件的所有页面；否则，只更新 plugins集合，不重新加载页面

### 注册处理程序

现代浏览器支持 navigator 上的（在 HTML5 中定义的）registerProtocolHandler() 方法。这个方法可以把一个网站注册为处理某种特定类型信息应用程序。随着在线 RSS 阅读器和电子邮件客户端的流行，可以借助这个方法将 Web 应用程序注册为像桌面软件一样的默认应用程序。

要使用 registerProtocolHandler()方法，必须传入 3 个参数：要处理的协议（如 "mailto" 或 "ftp"）、处理该协议的 URL，以及应用名称。比如，要把一个 Web 应用程序注册为默认邮件客户端，可以这样做：

```js
navigator.registerProtocolHandler("mailto", "http://www.somemailclient.com?cmd=%s", "Some Mail Client");
```

这个例子为 "mailto" 协议注册了一个处理程序，这样邮件地址就可以通过指定的 Web 应用程序打开。注意，第二个参数是负责处理请求的 URL，`%s`  表示原始的请求

## screen 对象

JavaScript 中有几个对象在编程中用处不大，而 screen 对象就是其中之一。screen 对象基本上只用来表明客户端的能力，其中包括浏览器窗口外部的显示器的信息，如像素宽度和高度等。每个浏览器中的 screen 对象都包含着各不相同的属性

| 属性        | 说明                                         |
| ----------- | -------------------------------------------- |
| availHeight | 屏幕像素高度减去系统组件高度（只读）         |
| availLeft   | 没有被系统组件占用的屏幕的最左侧像素（只读） |
| availTop    | 没有被系统组件占用的屏幕的最顶端像素（只读） |
| availWidth  | 屏幕像素宽度减去系统组件宽度（只读）         |
| colorDepth  | 表示屏幕颜色的位数；多数系统是 32（只读）    |
| height      | 屏幕像素高度                                 |
| left        | 当前屏幕左边的像素距离                       |
| pixelDepth  | 屏幕的位深（只读）                           |
| top         | 当前屏幕顶端的像素距离                       |
| width       | 屏幕像素宽度                                 |
| orientation | 返回 Screen Orientation API 中屏幕的朝向     |

这些信息经常集中出现在测定客户端能力的站点跟踪工具中，但通常不会用于影响功能。不过，有时候也可能会用到其中的信息来调整浏览器窗口大小，使其占据屏幕的可用空间，例如：

```javascript
window.resizeTo(screen.availWidth, screen.availHeight);
```

前面曾经提到过，许多浏览器都会禁用调整浏览器窗口大小的能力，因此上面这行代码不一定在所有环境下都有效

## history 对象

history 对象表示当前窗口首次使用以来用户的导航历史记录。因为 history 是 window 的属性，所以每个 window 都有自己的 history 对象。出于安全考虑，这个对象不会暴露用户访问过的 URL，

但可以通过它在不知道实际 URL 的情况下前进和后退。出于安全方面的考虑，**开发人员无法得知用户浏览过的 URL**。不过，借由用户访问过的页面列表，同样可以在不知道实际 URL 的情况下实现后退和前进

### 导航

go()方法可以在用户历史记录中沿任何方向导航，可以前进也可以后退。这个方法只接收一个参数，这个参数可以是一个整数，表示前进或后退多少步。负值表示在历史记录中后退（类似点击浏览器的“后退”按钮），而正值表示在历史记录中前进（类似点击浏览器的“前进”按钮）

```javascript
//后退一页
history.go(-1);
//前进一页
history.go(1);
//前进两页
history.go(2);
```

在旧版本的一些浏览器中，go()方法的参数也可以是一个字符串，这种情况下浏览器会导航到历史中包含该字符串的第一个位置。最接近的位置可能涉及后退，也可能涉及前进。如果历史记录中没有匹配的项，则这个方法什么也不做，如下所示：

```js
// 导航到最近的 wrox.com 页面
history.go("wrox.com"); 
// 导航到最近的 nczonline.net 页面
history.go("nczonline.net");
```

还可以使用两个简写方法 back() 和 forward() 来代替 go() 。顾名思义，这两个方法可以模仿浏览器的“后退”和“前进”按钮。

```javascript
history.back();
history.forward();
```

history 对象还有一个 length 属性，保存着历史记录的数量。这个数量包括所有历史记录，即所有向后和向前的记录。通过像下面这样测试该属性的值，可以确定用户是否一开始就打开了你的页面。

```javascript
if (history.length == 1){
	//这应该是用户打开窗口后的第一个页面（length 包含当前页，新开标签页时为 1）
}
```

### 历史状态管理

现代 Web 应用程序开发中最难的环节之一就是历史记录管理。用户每次点击都会触发页面刷新的时代早已过去，“后退”和“前进”按钮对用户来说就代表“帮我切换一个状态”的历史也就随之结束了。为解决这个问题，首先出现的是 hashchange 事件。HTML5 也为 history 对象增加了方便的状态管理特性。

hashchange 会在页面 URL 的散列变化时被触发，开发者可以在此时执行某些操作。而状态管理 API 则可以让开发者改变浏览器 URL 而不会加载新页面。为此，可以使用 history.pushState() 方法。这个方法接收 3 个参数：一个 state 对象、一个新状态的标题和一个（可选的）相对 URL。例如：

```js
let stateObject = {foo:"bar"}; 
history.pushState(stateObject, "My title", "baz.html");
```

pushState()方法执行后，状态信息就会被推到历史记录中，浏览器地址栏也会改变以反映新的相对 URL。除了这些变化之外，即使 location.href 返回的是地址栏中的内容，浏览器页不会向服务器发送请求。第二个参数并未被当前实现所使用，因此既可以传一个空字符串也可以传一个短标题。第一个参数应该包含正确初始化页面状态所必需的信息。为防止滥用，这个状态的对象大小是有限制的，通常在 500KB～1MB 以内。

因为 pushState()会创建新的历史记录，所以也会相应地启用“后退”按钮。此时单击“后退”按钮，就会触发 window 对象上的 popstate 事件。popstate 事件的事件对象有一个 state 属性，其中包含通过 pushState()第一个参数传入的 state 对象：

```js
window.addEventListener("popstate", (event) => { 
  let state = event.state; 
  if (state) { // 第一个页面加载时状态是 null 
    processState(state); 
  } 
});
```

基于这个状态，应该把页面重置为状态对象所表示的状态（因为浏览器不会自动为你做这些）。记住，页面初次加载时没有状态。因此点击“后退”按钮直到返回最初页面时，event.state 会为 null。可以通过 history.state 获取当前的状态对象，也可以使用 replaceState()并传入与pushState()同样的前两个参数来更新状态。更新状态不会创建新历史记录，只会覆盖当前状态：

```js
history.replaceState({newFoo: "newBar"}, "New title"); 
```

传给 pushState() 和 replaceState() 的 state 对象应该只包含可以被序列化的信息。因此，DOM 元素之类并不适合放到状态对象里保存
