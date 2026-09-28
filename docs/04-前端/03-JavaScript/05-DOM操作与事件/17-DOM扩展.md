---
title: "DOM 扩展"
description: "介绍 DOM 扩展相关 API：动态脚本与样式、Selectors API（querySelector/querySelectorAll/matches）、元素遍历、MutationObserver（观察范围/记录队列/性能）、HTML5 扩展（classList、焦点管理、dataset、innerHTML/outerHTML、scrollIntoView）与专有扩展。"
keywords: [querySelector, MutationObserver, classList, dataset]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---

# DOM 扩展

尽管 DOM API 已经相当不错，但仍然不断有标准或专有的扩展出现，以支持更多功能。2008 年以前，大部分浏览器对 DOM 的扩展是专有的。此后，W3C 开始着手将这些已成为事实标准的专有扩展编制成正式规范。

基于以上背景，诞生了描述 DOM 扩展的两个标准：Selectors API 与 HTML5。这两个标准体现了社区需求和标准化某些手段及 API 的愿景。另外还有较小的 Element Traversal 规范，增加了一些 DOM 属性

## DOM 编程

很多时候，操作 DOM 是很直观的。通过 HTML 代码能实现的，也一样能通过 JavaScript 实现。但有时候，DOM 也没有看起来那么简单。浏览器能力的参差不齐和各种问题，也会导致 DOM 的某些方面会复杂一些

### 动态脚本

创建动态脚本也有两种方式：插入外部文件和直接插入 JavaScript 代码。

```javascript
var script = document.createElement("script"); 
script.type = "text/javascript";  
script.src = "client.js"; 
document.body.appendChild(script);
```

显然，这里的 DOM 代码如实反映了相应的 HTML 代码。不过，在执行最后一行代码把`<script>`元素添加到页面中之前，是不会下载外部文件的。也可以把这个元素添加到 `<head>` 元素中，效果相同。

整个过程可以使用下面的函数来封装：

```javascript
function loadScript(url){ 
  var script = document.createElement("script"); 
  script.type = "text/javascript"; 
  script.src = url; 
  document.body.appendChild(script); 
}
```

然后，就可以通过调用这个函数来加载外部的 JavaScript 文件了：

```javascript
loadScript("client.js");
```

加载完成后，就可以在页面中的其他地方使用这个脚本了。问题只有一个：怎么知道脚本加载完成呢？遗憾的是，并没有什么标准方式来探知这一点。不过，与此相关的一些事件倒是可以派上用场，但要取决于所用的浏览器。

另一种指定 JavaScript 代码的方式是行内方式，如下面的例子所示：

```html
<script type="text/javascript"> 
 function sayHi(){ 
 		alert("hi"); 
 } 
</script>
```

从逻辑上讲，下面的 DOM 代码是有效的：

```javascript
var script = document.createElement("script"); 
script.type = "text/javascript"; 
script.appendChild(document.createTextNode("function sayHi(){alert('hi');}")); 
document.body.appendChild(script);
```

### 动态样式

所谓动态样式是指在页面刚加载时不存在的样式；动态样式是在页面加载完成后动态添加到页面中的。

```html
<link rel="stylesheet" type="text/css" href="styles.css">
```

使用 DOM 代码可以很容易地动态创建出这个元素：

```javascript
var link = document.createElement("link"); 
link.rel = "stylesheet"; 
link.type = "text/css"; 
link.href = "style.css"; 

var head = document.getElementsByTagName("head")[0]; 
head.appendChild(link);
```

以上代码在所有主流浏览器中都可以正常运行。需要注意的是，必须将 `<link>` 元素添加到 `<head>` 而不是 `<body>` 元素，才能保证在所有浏览器中的行为一致。整个过程可以用以下函数来表示：

```javascript
function loadStyles(url){ 
  var link = document.createElement("link"); 
  link.rel = "stylesheet"; 
  link.type = "text/css"; 
  link.href = url; 

  var head = document.getElementsByTagName("head")[0]; 
  head.appendChild(link); 
}
```

调用 loadStyles() 函数的代码如下所示：

```javascript
loadStyles("styles.css");
```

加载外部样式文件的过程是异步的，也就是加载样式与执行 JavaScript 代码的过程没有固定的次序。一般来说，知不知道样式已经加载完成并不重要；不过，也存在几种利用事件来检测这个过程是否完成的技术。

另一种定义样式的方式是使用 `<style>` 元素来包含嵌入式 CSS，如下所示：

```html
<style type="text/css"> 
  body { 
    background-color: red; 
  } 
</style>
```

按照相同的逻辑，下列 DOM 代码应该是有效的：

```javascript
let style = document.createElement("style"); 
style.type = "text/css"; 
style.appendChild(document.createTextNode("body{background-color:red}")); 
var head = document.getElementsByTagName("head")[0]; 
head.appendChild(style);
```

### 操作表格

表格是 HTML 中最复杂的结构之一。通过 DOM 编程创建 `<table>` 元素，通常要涉及大量标签，包括表行、表元、表题，等等。因此，通过 DOM 编程创建和修改表格时可能要写很多代码。假设要通过DOM 来创建以下 HTML 表格：

```html
<table border="1" width="100%"> 
  <tbody> 
    <tr> 
      <td>Cell 1,1</td> 
      <td>Cell 2,1</td> 
    </tr> 
    <tr> 
      <td>Cell 1,2</td> 
      <td>Cell 2,2</td> 
    </tr> 
  </tbody> 
</table>
```

下面就是以 DOM 编程方式重建这个表格的代码

```js
// 创建表格
let table = document.createElement("table"); 
table.border = 1; 
table.width = "100%"; 

// 创建表体
let tbody = document.createElement("tbody"); 
table.appendChild(tbody); 

// 创建第一行
let row1 = document.createElement("tr"); 
tbody.appendChild(row1); 
let cell1_1 = document.createElement("td"); 
cell1_1.appendChild(document.createTextNode("Cell 1,1")); 
row1.appendChild(cell1_1); 
let cell2_1 = document.createElement("td"); 
cell2_1.appendChild(document.createTextNode("Cell 2,1")); 
row1.appendChild(cell2_1); 

// 创建第二行
let row2 = document.createElement("tr"); 
tbody.appendChild(row2); 
let cell1_2 = document.createElement("td"); 
cell1_2.appendChild(document.createTextNode("Cell 1,2")); 
row2.appendChild(cell1_2); 
let cell2_2= document.createElement("td"); 
cell2_2.appendChild(document.createTextNode("Cell 2,2")); 
row2.appendChild(cell2_2); 

// 把表格添加到文档主体
document.body.appendChild(table);
```

以上代码相当烦琐，也不好理解。为了方便创建表格，HTML DOM 给 `<table>` 、`<tbody>` 和 `<tr>` 元素添加了一些属性和方法。

table元素添加了以下属性和方法：

- caption  指向 `<caption>`  元素的指针（如果存在）
- tBodies 包含 `<tbody>`  元素的 HTMLCollection
- tFoot  指向 `<tfoot>`  元素（如果存在）
- tHead，指向 `<thead>` 元素（如果存在）
- rows，包含表示所有行的 HTMLCollection
- createTHead()，创建 `<thead>` 元素，放到表格中，返回引用
- createTFoot()，创建 `<tfoot>` 元素，放到表格中，返回引用
- createCaption()，创建 `<caption>` 元素，放到表格中，返回引用
- deleteTHead()，删除 `<thead>` 元素
- deleteTFoot()，删除 `<tfoot>` 元素
- deleteCaption()，删除 `<caption>`  元素
- deleteRow(*pos*)，删除给定位置的行
- insertRow(*pos*)，在行集合中给定位置插入一行

tbody 元素添加了以下属性和方法：

- rows  包含 `<tbody>`  元素中所有行的 HTMLCollection
- deleteRow(pos)  删除给定位置的行
- insertRow(pos)  在行集合中给定位置插入一行，返回该行的引用

tr 元素添加了以下属性和方法：

- cells  包含 `<tr>` 元素所有表元的 HTMLCollection
- deleteCell(pos)  删除给定位置的表元
- insertCell(pos) 在表元集合给定位置插入一个表元，返回该表元的引用

这些属性和方法极大地减少了创建表格所需的代码量。例如，使用这些方法重写前面的代码之后是这样的（加粗代码表示更新的部分）：

```js
// 创建表格
let table = document.createElement("table"); 
table.border = 1; 
table.width = "100%"; 

// 创建表体
let tbody = document.createElement("tbody"); 
table.appendChild(tbody); 

// 创建第一行
tbody.insertRow(0); 
tbody.rows[0].insertCell(0); 
tbody.rows[0].cells[0].appendChild(document.createTextNode("Cell 1,1")); 
tbody.rows[0].insertCell(1); 
tbody.rows[0].cells[1].appendChild(document.createTextNode("Cell 2,1")); 

// 创建第二行
tbody.insertRow(1); 
tbody.rows[1].insertCell(0); 
tbody.rows[1].cells[0].appendChild(document.createTextNode("Cell 1,2")); 
tbody.rows[1].insertCell(1); 
tbody.rows[1].cells[1].appendChild(document.createTextNode("Cell 2,2")); 

// 把表格添加到文档主体
document.body.appendChild(table); 
```

### 使用 NodeList

理解 NodeList 对象和相关的 NamedNodeMap、HTMLCollection，是理解 DOM 编程的关键。这 3 个集合类型都是“实时的”，意味着文档结构的变化会实时地在它们身上反映出来，因此它们的值始终代表最新的状态。实际上，NodeList 就是基于 DOM 文档的实时查询。例如，下面的代码会导致无穷循环：

```js
let divs = document.getElementsByTagName("div"); 

for (let i = 0; i < divs.length; ++i){ 
 let div = document.createElement("div"); 
 document.body.appendChild(div); 
}
```

使用 ES6 迭代器并不会解决这个问题，因为迭代的是一个永远增长的实时集合。以下代码仍然会导致无穷循环：

```js
for (let div of document.getElementsByTagName("div")){ 
  let newDiv = document.createElement("div"); 
  document.body.appendChild(newDiv); 
}
```

任何时候要迭代 NodeList，最好再初始化一个变量保存当时查询时的长度，然后用循环变量与这个变量进行比较，如下所示：

```js
let divs = document.getElementsByTagName("div"); 
for (let i = 0, len = divs.length; i < len; ++i) { 
  let div = document.createElement("div"); 
  document.body.appendChild(div); 
}
```

在这个例子中，又初始化了一个保存集合长度的变量 len。因为 len 保存着循环开始时集合的长度，而这个值不会随集合增大动态增长，所以就可以避免前面例子中出现的无穷循环。本章还会使用这种技术来演示迭代 NodeList 对象的首选方式

另外，如果不想再初始化一个变量，也可以像下面这样反向迭代集合：

```js
let divs = document.getElementsByTagName("div"); 
for (let i = divs.length - 1; i >= 0; --i) { 
  let div = document.createElement("div"); 
  document.body.appendChild(div); 
}
```

一般来说，最好限制操作 NodeList 的次数。因为每次查询都会搜索整个文档，所以最好把查询到的 NodeList 缓存起来

## MutationObserver 接口

MutationObserver 接口，可以在 DOM 被修改时异步执行回调。使用 MutationObserver 可以观察整个文档、DOM 树的一部分，或某个元素。此外还可以观察元素属性、子节点、文本，或者前三者任意组合的变化

> 注意 新引进 MutationObserver 接口是为了取代废弃的 MutationEvent

### 基本用法

MutationObserver 的实例要通过调用 MutationObserver 构造函数并传入一个回调函数来创建：

```js
let observer = new MutationObserver(() => console.log('DOM was mutated!'));
```

#### observe() 方法

新创建的 MutationObserver 实例不会关联 DOM 的任何部分。要把这个 observer 与 DOM 关联起来，需要使用 observe()方法。这个方法接收两个必需的参数：要观察其变化的 DOM 节点，以及一个 MutationObserverInit 对象。

MutationObserverInit 对象用于控制观察哪些方面的变化，是一个键/值对形式配置选项的字典。

例如，下面的代码会创建一个观察者（observer）并配置它观察 `<body>` 元素上的属性变化：

```js
let observer = new MutationObserver(() => console.log('<body> attributes changed')); 

observer.observe(document.body, { attributes: true }); 
```

执行以上代码后，`<body>` 元素上任何属性发生变化都会被这个 MutationObserver 实例发现，然后就会异步执行注册的回调函数。`<body>` 元素后代的修改或其他非属性修改都不会触发回调进入任务队列。可以通过以下代码来验证：

```js
let observer = new MutationObserver(() => console.log('<body> attributes changed')); 
observer.observe(document.body, { attributes: true });

document.body.className = 'foo'; 
console.log('Changed body class'); 

// Changed body class 
// <body> attributes changed 
```

注意，回调中的 console.log() 是后执行的。这表明回调并非与实际的 DOM 变化同步执行。

#### 回调与 MutationRecord

每个回调都会收到一个 MutationRecord 实例的数组。MutationRecord 实例包含的信息包括发生了什么变化，以及 DOM 的哪一部分受到了影响。因为回调执行之前可能同时发生多个满足观察条件的事件，所以每次执行回调都会传入一个包含按顺序入队的 MutationRecord 实例的数组。

下面展示了反映一个属性变化的 MutationRecord 实例的数组

```js
let observer = new MutationObserver((mutationRecords) => console.log(mutationRecords));
observer.observe(document.body, { attributes: true }); 
document.body.setAttribute('foo', 'bar'); 
// [ 
// { 
// addedNodes: NodeList [],
// attributeName: "foo", 
// attributeNamespace: null, 
// nextSibling: null, 
// oldValue: null, 
// previousSibling: null 
// removedNodes: NodeList [], 
// target: body 
// type: "attributes" 
// } 
// ]
```

连续修改会生成多个 MutationRecord 实例，下次回调执行时就会收到包含所有这些实例的数组，顺序为变化事件发生的顺序：

```js
let observer = new MutationObserver((mutationRecords) => console.log(mutationRecords)); 

observer.observe(document.body, { attributes: true }); 
document.body.className = 'foo'; 
document.body.className = 'bar'; 
document.body.className = 'baz'; 
// [MutationRecord, MutationRecord, MutationRecord]
```

| 属性               | 说明                                                         |
| ------------------ | ------------------------------------------------------------ |
| target             | 被修改影响的目标节点                                         |
| type               | 字符串，表示变化的类型："attributes"、"characterData"或"childList" |
| oldValue           | 如果在 MutationObserverInit 对象中启用（attributeOldValue 或 characterData OldValue 为 true），"attributes"或"characterData"的变化事件会设置这个属性为被替代的值 "childList"类型的变化始终将这个属性设置为 null |
| attributeName      | 对于"attributes"类型的变化，这里保存被修改属性的名字，其他变化事件会将这个属性设置为 null |
| attributeNamespace | 对于使用了命名空间的"attributes"类型的变化，这里保存被修改属性的名字，其他变化事件会将这个属性设置为 null |
| addedNodes         | 对于"childList"类型的变化，返回包含变化中添加节点的 NodeList，默认为空 NodeList |
| removedNodes       | 对于"childList"类型的变化，返回包含变化中删除节点的 NodeList，默认为空 NodeList |
| previousSibling    | 对于"childList"类型的变化，返回变化节点的前一个同胞 Node 默认为 null |
| nextSibling        | 对于"childList"类型的变化，返回变化节点的后一个同胞 Node     |

传给回调函数的第二个参数是观察变化的 MutationObserver 的实例，演示如下

```js
let observer = new MutationObserver((mutationRecords, mutationObserver) => console.log(mutationRecords,
mutationObserver)); 
observer.observe(document.body, { attributes: true }); 
document.body.className = 'foo'; 
// [MutationRecord], MutationObserver
```

#### disconnect() 方法

默认情况下，只要被观察的元素不被垃圾回收，MutationObserver 的回调就会响应 DOM 变化事件，从而被执行。要提前终止执行回调，可以调用 disconnect()方法。下面的例子演示了同步调用 disconnect() 之后，不仅会停止此后变化事件的回调，也会抛弃已经加入任务队列要异步执行的回调：

```js
let observer = new MutationObserver(() => console.log('<body> attributes changed')); 
observer.observe(document.body, { attributes: true }); 
document.body.className = 'foo'; 
observer.disconnect(); 
document.body.className = 'bar'; 
//（没有日志输出）
```

要想让已经加入任务队列的回调执行，可以使用 setTimeout() 让已经入列的回调执行完毕再调用 disconnect()

```js
let observer = new MutationObserver(() => console.log('<body> attributes changed')); 
observer.observe(document.body, { attributes: true });

document.body.className = 'foo'; 
setTimeout(() => { 
  observer.disconnect(); 
  document.body.className = 'bar'; 
}, 0); 
// <body> attributes changed
```

#### 复用 MutationObserver

多次调用 observe()方法，可以复用一个 MutationObserver 对象观察多个不同的目标节点。此时，MutationRecord 的 target 属性可以标识发生变化事件的目标节点。下面的示例演示了这个过程

```js
let observer = new MutationObserver((mutationRecords) => console.log(mutationRecords.map((x) => 
x.target))); 

// 向页面主体添加两个子节点
let childA = document.createElement('div'), 
 childB = document.createElement('span'); 
document.body.appendChild(childA); 
document.body.appendChild(childB); 

// 观察两个子节点
observer.observe(childA, { attributes: true }); 
observer.observe(childB, { attributes: true }); 

// 修改两个子节点的属性
childA.setAttribute('foo', 'bar'); 
childB.setAttribute('foo', 'bar'); 
// [<div>, <span>] 
```

disconnect() 方法是一个“一刀切”的方案，调用它会停止观察所有目标：

```js
let observer = new MutationObserver((mutationRecords) => console.log(mutationRecords.map((x) => 
x.target))); 

// 向页面主体添加两个子节点
let childA = document.createElement('div'), 
 childB = document.createElement('span'); 
document.body.appendChild(childA); 
document.body.appendChild(childB); 

// 观察两个子节点
observer.observe(childA, { attributes: true }); 
observer.observe(childB, { attributes: true }); 
observer.disconnect(); 

// 修改两个子节点的属性
childA.setAttribute('foo', 'bar'); 
childB.setAttribute('foo', 'bar'); 
// （没有日志输出）
```

调用 disconnect()并不会结束 MutationObserver 的生命。还可以重新使用这个观察者，再将它关联到新的目标节点。下面的示例在两个连续的异步块中先断开然后又恢复了观察者与 `<body>` 元素的关联：

```js
let observer = new MutationObserver(() => console.log('<body> attributes changed')); 
observer.observe(document.body, { attributes: true }); 
// 这行代码会触发变化事件
document.body.setAttribute('foo', 'bar'); 
setTimeout(() => { 
  observer.disconnect(); 
  // 这行代码不会触发变化事件
  document.body.setAttribute('bar', 'baz'); 
}, 0); 

setTimeout(() => { 
  // Reattach 
  observer.observe(document.body, { attributes: true }); 
  // 这行代码会触发变化事件
  document.body.setAttribute('baz', 'qux'); 
}, 0); 
// <body> attributes changed 
// <body> attributes changed
```

### MutationObserverInit 与观察范围

MutationObserverInit 对象用于控制对目标节点的观察范围。粗略地讲，观察者可以观察的事件包括属性变化、文本变化和子节点变化。

下表列出了 MutationObserverInit 对象的属性

| 属性                  | 说明                                                         |
| --------------------- | ------------------------------------------------------------ |
| subtree               | 布尔值，表示除了目标节点，是否观察目标节点的子树（后代）     |
| attributes            | 布尔值，表示是否观察目标节点的属性变化，默认为 false         |
| attributeFilter       | 字符串数组，表示要观察哪些属性的变化。把这个值设置为 true 也会将 attributes 的值转换为 true , 默认为观察所有属性 |
| attributeOldValue     | 布尔值，表示 MutationRecord 是否记录变化之前的属性值,把这个值设置为 true 也会将 attributes 的值转换为 true ,默认为 false |
| characterData         | 布尔值，表示修改字符数据是否触发变化事件, 默认为 false       |
| characterDataOldValue | 布尔值，表示 MutationRecord 是否记录变化之前的字符数据, 把这个值设置为 true 也会将 characterData 的值转换为 true |
| childList             | 布尔值，表示修改目标节点的子节点是否触发变化事件,默认为 false |

> 在调用 observe()时，MutationObserverInit 对象中的 attribute、characterData 和 childList 属性必须至少有一项为 true（无论是直接设置这几个属性，还是通过设置 attributeOldValue 等属性间接导致它们的值转换为 true）。否则会抛出错误，因为没有任何变化事件可能触发回调

#### 观察属性

MutationObserver 可以观察节点属性的添加、移除和修改。要为属性变化注册回调，需要在 MutationObserverInit 对象中将 attributes 属性设置为 true，如下所示

```js
let observer = new MutationObserver((mutationRecords) => console.log(mutationRecords)); 

observer.observe(document.body, { attributes: true }); 

// 添加属性 
document.body.setAttribute('foo', 'bar'); 
// 修改属性
document.body.setAttribute('foo', 'baz'); 
// 移除属性
document.body.removeAttribute('foo'); 

// 以上变化都被记录下来了
// [MutationRecord, MutationRecord, MutationRecord]
```

把 attributes 设置为 true 的默认行为是观察所有属性，但不会在 MutationRecord 对象中记录原来的属性值。如果想观察某个或某几个属性，可以使用 attributeFilter 属性来设置白名单，即一个属性名字符串数组

```js
let observer = new MutationObserver( 
  (mutationRecords) => console.log(mutationRecords)); 
observer.observe(document.body, { attributeFilter: ['foo'] }); 
// 添加白名单属性
document.body.setAttribute('foo', 'bar'); 
// 添加被排除的属性
document.body.setAttribute('baz', 'qux');

// 只有 foo 属性的变化被记录了
// [MutationRecord] 
```

如果想在变化记录中保存属性原来的值，可以将 attributeOldValue 属性设置为 true

```js
let observer = new MutationObserver((mutationRecords) => console.log(mutationRecords.map((x) => x.oldValue))); 

observer.observe(document.body, { attributeOldValue: true }); 
document.body.setAttribute('foo', 'bar'); 
document.body.setAttribute('foo', 'baz'); 
document.body.setAttribute('foo', 'qux'); 
// 每次变化都保留了上一次的值
// [null, 'bar', 'baz']
```

#### 观察字符数据

MutationObserver 可以观察文本节点（如 Text、Comment 或 ProcessingInstruction 节点）中字符的添加、删除和修改。要为字符数据注册回调，需要在 MutationObserverInit 对象中将 characterData 属性设置为 true，如下所示：

```js
let observer = new MutationObserver((mutationRecords) => console.log(mutationRecords)); 

// 创建要观察的文本节点
document.body.firstChild.textContent = 'foo'; 
observer.observe(document.body.firstChild, { characterData: true }); 

// 赋值为相同的字符串
document.body.firstChild.textContent = 'foo'; 
// 赋值为新字符串
document.body.firstChild.textContent = 'bar'; 
// 通过节点设置函数赋值
document.body.firstChild.textContent = 'baz'; 

// 以上变化都被记录下来了
// [MutationRecord, MutationRecord, MutationRecord]
```

将 characterData 属性设置为 true 的默认行为不会在 MutationRecord 对象中记录原来的字符数据。如果想在变化记录中保存原来的字符数据，可以将 characterDataOldValue 属性设置为 true：

```js
let observer = new MutationObserver((mutationRecords) => console.log(mutationRecords.map((x) => x.oldValue))); 

document.body.innerText = 'foo'; 
observer.observe(document.body.firstChild, { characterDataOldValue: true }); 
document.body.innerText = 'foo'; 
document.body.innerText = 'bar';
document.body.firstChild.textContent = 'baz'; 
// 每次变化都保留了上一次的值
// ["foo", "foo", "bar"]
```

#### 观察子节点

MutationObserver 可以观察目标节点子节点的添加和移除。要观察子节点，需要在 MutationObserverInit 对象中将 childList 属性设置为 true

```js
// 清空主体
document.body.innerHTML = ''; 
let observer = new MutationObserver((mutationRecords) => console.log(mutationRecords)); 

observer.observe(document.body, { childList: true }); 
document.body.appendChild(document.createElement('div')); 
// [ 
// { 
// addedNodes: NodeList[div], 
// attributeName: null, 
// attributeNamespace: null, 
// oldValue: null, 
// nextSibling: null, 
// previousSibling: null, 
// removedNodes: NodeList[], 
// target: body, 
// type: "childList", 
// } 
// ]
```

下面的例子演示了移除子节点：

```js
// 清空主体
document.body.innerHTML = ''; 
let observer = new MutationObserver((mutationRecords) => console.log(mutationRecords)); 

// 先添加一个子节点，再开始观察
document.body.appendChild(document.createElement('div')); 
observer.observe(document.body, { childList: true }); 
document.body.removeChild(document.body.firstChild); 
// [ 
// { 
// addedNodes: NodeList[], 
// attributeName: null, 
// attributeNamespace: null, 
// oldValue: null, 
// nextSibling: null, 
// previousSibling: null, 
// removedNodes: NodeList[div], 
// target: body, 
// type: "childList", 
// } 
// ]
```

对子节点重新排序（尽管调用一个方法即可实现）会报告两次变化事件，因为从技术上会涉及先移除和再添加：

```js
// 清空主体
document.body.innerHTML = ''; 
let observer = new MutationObserver((mutationRecords) => console.log(mutationRecords)); 

// 创建两个初始子节点
document.body.appendChild(document.createElement('div')); 
document.body.appendChild(document.createElement('span')); 
observer.observe(document.body, { childList: true }); 

// 交换子节点顺序
document.body.insertBefore(document.body.lastChild, document.body.firstChild); 

// 发生了两次变化：第一次是节点被移除，第二次是节点被添加
// [ 
// { 
// addedNodes: NodeList[], 
// attributeName: null, 
// attributeNamespace: null, 
// oldValue: null, 
// nextSibling: null, 
// previousSibling: div, 
// removedNodes: NodeList[span], 
// target: body, 
// type: childList, 
// }, 
// { 
// addedNodes: NodeList[span], 
// attributeName: null, 
// attributeNamespace: null, 
// oldValue: null, 
// nextSibling: div, 
// previousSibling: null, 
// removedNodes: NodeList[], 
// target: body, 
// type: "childList", 
// } 
// ]
```

#### 观察字数

默认情况下，MutationObserver 将观察的范围限定为一个元素及其子节点的变化。可以把观察的范围扩展到这个元素的子树（所有后代节点），这需要在 MutationObserverInit 对象中将 subtree 属性设置为 true

```js
// 清空主体
document.body.innerHTML = ''; 
let observer = new MutationObserver((mutationRecords) => console.log(mutationRecords)); 

// 创建一个后代
document.body.appendChild(document.createElement('div'));

// 观察<body>元素及其子树
observer.observe(document.body, { attributes: true, subtree: true }); 

// 修改<body>元素的子树
document.body.firstChild.setAttribute('foo', 'bar'); 

// 记录了子树变化的事件
// [ 
// { 
// addedNodes: NodeList[], 
// attributeName: "foo", 
// attributeNamespace: null, 
// oldValue: null, 
// nextSibling: null, 
// previousSibling: null, 
// removedNodes: NodeList[], 
// target: div, 
// type: "attributes", 
// } 
// ]
```

有意思的是，被观察子树中的节点被移出子树之后仍然能够触发变化事件。这意味着在子树中的节点离开该子树后，即使严格来讲该节点已经脱离了原来的子树，但它仍然会触发变化事件

```js
// 清空主体
document.body.innerHTML = ''; 

let observer = new MutationObserver((mutationRecords) => console.log(mutationRecords)); 

let subtreeRoot = document.createElement('div'), 
    subtreeLeaf = document.createElement('span'); 

// 创建包含两层的子树
document.body.appendChild(subtreeRoot); 
subtreeRoot.appendChild(subtreeLeaf); 
// 观察子树
observer.observe(subtreeRoot, { attributes: true, subtree: true }); 
// 把节点转移到其他子树
document.body.insertBefore(subtreeLeaf, subtreeRoot); 
subtreeLeaf.setAttribute('foo', 'bar'); 
// 移出的节点仍然触发变化事件
// [MutationRecord]
```

### 异步回调与记录队列

MutationObserver 接口是出于性能考虑而设计的，其核心是异步回调与记录队列模型。为了在大量变化事件发生时不影响性能，每次变化的信息（由观察者实例决定）会保存在 MutationRecord 实例中，然后添加到记录队列。这个队列对每个 MutationObserver 实例都是唯一的，是所有 DOM 变化事件的有序列表。

#### 记录队列

每次 MutationRecord 被添加到 MutationObserver 的记录队列时，仅当之前没有已排期的微任务回调时（队列中微任务长度为 0），才会将观察者注册的回调（在初始化 MutationObserver 时传入）作为微任务调度到任务队列上。这样可以保证记录队列的内容不会被回调处理两次。

不过在回调的微任务异步执行期间，有可能又会发生更多变化事件。因此被调用的回调会接收到一个 MutationRecord 实例的数组，顺序为它们进入记录队列的顺序。回调要负责处理这个数组的每一个实例，因为函数退出之后这些实现就不存在了。回调执行后，这些 MutationRecord 就用不着了，因此记录队列会被清空，其内容会被丢弃。

#### takeRecords() 方法

调用 MutationObserver 实例的 takeRecords() 方法可以清空记录队列，取出并返回其中的所有 MutationRecord 实例。看这个例子：

```js
let observer = new MutationObserver((mutationRecords) => console.log(mutationRecords)); 

observer.observe(document.body, { attributes: true }); 

document.body.className = 'foo'; 
document.body.className = 'bar'; 
document.body.className = 'baz'; 
console.log(observer.takeRecords()); 
console.log(observer.takeRecords()); 

// [MutationRecord, MutationRecord, MutationRecord]
// []
```

这在希望断开与观察目标的联系，但又希望处理由于调用 disconnect()而被抛弃的记录队列中的 MutationRecord 实例时比较有用

### 性能、内存与垃圾回收

无论如何，使用 MutationObserver 仍然不是没有代价的。因此理解什么时候避免出现这种情况就很重要了。

#### MutationObserver 的引用

MutationObserver 实例与目标节点之间的引用关系是非对称的。MutationObserver 拥有对要观察的目标节点的弱引用。因为是弱引用，所以不会妨碍垃圾回收程序回收目标节点。

然而，目标节点却拥有对 MutationObserver 的强引用。如果目标节点从 DOM 中被移除，随后被垃圾回收，则关联的 MutationObserver 也会被垃圾回收

####  MutationRecord 的引用

记录队列中的每个 MutationRecord 实例至少包含对已有 DOM 节点的一个引用。如果变化是 childList 类型，则会包含多个节点的引用。记录队列和回调处理的默认行为是耗尽这个队列，处理每个 MutationRecord，然后让它们超出作用域并被垃圾回收。

有时候可能需要保存某个观察者的完整变化记录。保存这些 MutationRecord 实例，也就会保存它们引用的节点，因而会妨碍这些节点被回收。如果需要尽快地释放内存，建议从每个 MutationRecord 中抽取出最有用的信息，然后保存到一个新对象中，最后抛弃 MutationRecord

## Selectors API

Selectors API Level 1 的核心是两个方法：querySelector()和 querySelectorAll()。在兼容浏览器中，Document 类型和 Element 类型的实例上都会暴露这两个方法。

Selectors API Level 2 规范在 Element 类型上新增了更多方法，比如 matches()、find() 和 findAll()。不过，目前还没有浏览器实现或宣称实现 find() 和 findAll()

### querySelector() 方法

querySelector() 方法接收一个 CSS 选择符，返回与该模式匹配的第一个元素，如果没有找到匹配的元素，返回 null。请看下面的例子。

```javascript
//取得 body 元素
var body = document.querySelector("body"); 

//取得 ID 为"myDiv"的元素
var myDiv = document.querySelector("#myDiv"); 

//取得类为"selected"的第一个元素
var selected = document.querySelector(".selected"); 

//取得类为"button"的第一个图像元素
var img = document.body.querySelector("img.button");
```

CSS 选择符可以简单也可以复杂，视情况而定。如果传入了不被支持的选择符，querySelector() 会抛出错误

### querySelectorAll() 方法

返回的是所有匹配的元素而不仅仅是一个元素。这个方法返回的是一个 NodeList 的实例。

具体来说，返回的值实际上是带有所有属性和方法的 NodeList，而其底层实现则类似于一组元素的快照，而非不断对文档进行搜索的动态查询。这样实现可以避免使用 NodeList 对象通常会引起的大多数性能问题

只要传给 querySelectorAll()方法的 CSS 选择符有效，该方法都会返回一个 NodeList 对象，而不管找到多少匹配的元素。如果没有找到匹配的元素，NodeList 就是空的。与 querySelector() 类似，能够调用 querySelectorAll() 方法的类型包括 Document、DocumentFragment 和 Element

```javascript
//取得某 <div> 中的所有 <em> 元素（类似于 getElementsByTagName("em")）
var ems = document.getElementById("myDiv").querySelectorAll("em"); 

//取得类为"selected"的所有元素
var selecteds = document.querySelectorAll(".selected"); 

//取得所有<p>元素中的所有<strong>元素
var strongs = document.querySelectorAll("p strong");
```

要取得返回的 NodeList 中的每一个元素，可以使用 item() 方法，也可以使用方括号语法，比如：

```javascript
var i, len, strong; 

for (i=0, len=strongs.length; i < len; i++){ 
 strong = strongs[i]; //或者 strongs.item(i) 
 strong.className = "important"; 
}
```

同样与 querySelector()类似，如果传入了浏览器不支持的选择符或者选择符中有语法错误，querySelectorAll()会抛出错误。

### matches() 方法

matches()方法（在规范草案中称为 matchesSelector()）接收一个 CSS 选择符参数，如果元素匹配则该选择符返回 true，否则返回 false

```javascript
if (document.body.matches("body.page1")){ 
  // true 
}
```

在取得某个元素引用的情况下，使用这个方法能够方便地检测它是否会被 querySelector() 或 querySelectorAll() 方法返回。

## 元素遍历

对于元素间的空格，IE9 及之前版本不会返回文本节点，而其他所有浏览器都会返回文本节点。这样，就导致了在使用 childNodes 和 firstChild 等属性时的行为不一致。为了弥补这一差异，而同时又保持 DOM 规范不变，Element Traversal 规范（www.w3.org/TR/ElementTraversal/）新定义了一组属性。

Element Traversal API 为 DOM 元素添加了以下 5 个属性

- childElementCount：返回子元素（不包括文本节点和注释）的个数

- firstElementChild：指向第一个子元素；firstChild 的元素版

- lastElementChild：指向最后一个子元素；lastChild 的元素版

- previousElementSibling：指向前一个同辈元素；previousSibling 的元素版

- nextElementSibling：指向后一个同辈元素；nextSibling 的元素版

支持的浏览器为 DOM 元素添加了这些属性，利用这些元素不必担心空白文本节点，从而可以更方便地查找 DOM 元素了

下面来看一个例子。过去，要跨浏览器遍历某元素的所有子元素，需要像下面这样写代码。

```javascript
let parentElement = document.getElementById('parent'); 
let currentChildNode = parentElement.firstChild; 

// 没有子元素，firstChild 返回 null，跳过循环
while (currentChildNode) { 
  if (currentChildNode.nodeType === 1) { 
    // 如果有元素节点，则做相应处理
    processChild(currentChildNode); 
  } 
  if (currentChildNode === parentElement.lastChild) { 
    break; 
  } 
  currentChildNode = currentChildNode.nextSibling; 
}
```

而使用 Element Traversal 新增的元素，代码会更简洁。

```javascript
let parentElement = document.getElementById('parent'); 
let currentChildElement = parentElement.firstElementChild;

// 没有子元素，firstElementChild 返回 null，跳过循环
while (currentChildElement) { 
  // 这就是元素节点，做相应处理
  processChild(currentChildElement); 
  if (currentChildElement === parentElement.lastElementChild) { 
    break; 
  } 
  currentChildElement = currentChildElement.nextElementSibling; 
}
```

## HTML5

HTML5 代表着与以前的 HTML 截然不同的方向。在所有以前的 HTML 规范中，从未出现过描述JavaScript 接口的情形，HTML 就是一个纯标记语言。JavaScript 绑定的事，一概交给 DOM 规范去定义。

然而，HTML5 规范却包含了与标记相关的大量 JavaScript API 定义。其中有的 API 与 DOM 重合，定义了浏览器应该提供的 DOM 扩展

### CSS 类扩展

HTML5 添加的 getElementsByClassName() 方法是最受人欢迎的一个方法，可以通过 document 对象及所有 HTML 元素调用该方法。这个方法最早出现在 JavaScript 库中，是通过既有的 DOM 功能实现的，而原生的实现具有极大的性能优势。

#### getElementsByClassName()

getElementsByClassName()方法接收一个参数，即一个包含一或多个类名的字符串，返回带有指定类的所有元素的 HTMLCollection（实时集合）。传入多个类名时，类名的先后顺序不重要

```javascript
//取得所有类中包含"username"和"current"的元素，类名的先后顺序无所谓
var allCurrentUsernames = document.getElementsByClassName("username current"); 

//取得 ID 为"myDiv"的元素中带有类名"selected"的所有元素
var selected = document.getElementById("myDiv").getElementsByClassName("selected");
```

在 document 对象上调用 getElementsByClassName() 始终会返回与类名匹配的所有元素，在元素上调用该方法就只会返回后代元素中匹配的元素。

使用这个方法可以更方便地为带有某些类的元素添加事件处理程序，从而不必再局限于使用 ID 或标签名。不过别忘了，因为返回的是实时集合，所以使用这个方法与使用 getElementsByTagName() 等其他返回动态集合的 DOM 方法都具有同样的性能问题

#### classList 属性

在操作类名时，需要通过 className 属性添加、删除和替换类名。因为 className 中是一个字符串，所以即使只修改字符串一部分，也必须每次都设置整个字符串的值

```html
<div class="bd user disabled">...</div>
```

这个 `<div>` 元素一共有三个类名。要从中删除一个类名，需要把这三个类名拆开，删除不想要的那个，然后再把其他类名拼成一个新字符串

```javascript
//删除"user"类
//首先，取得类名字符串并拆分成数组
var classNames = div.className.split(/\s+/); 

//找到要删的类名
var pos = -1, i, len; 

for (i=0, len=classNames.length; i < len; i++){ 
 if (classNames[i] == "user"){ 
 	pos = i; 
 	break; 
 } 
} 

//删除类名
classNames.splice(i,1); 

//把剩下的类名拼成字符串并重新设置
div.className = classNames.join(" ");
```

HTML5 新增了一种操作类名的方式，可以让操作更简单也更安全，那就是为所有元素添加 classList 属性。这个 classList 属性是新集合类型 DOMTokenList 的实例，与其他 DOM 集合类似。

DOMTokenList 有一个表示自己包含多少元素的 length 属性，而要取得每个元素可以使用 item()方法，也可以使用方括号语法。此外，这个新类型还定义如下方法。

- add(value)：将给定的字符串值添加到列表中。如果值已经存在，就不添加了。

- contains(value)：表示列表中是否存在给定的值，如果存在则返回 true，否则返回 false。

- remove(value)：从列表中删除给定的字符串。

- toggle(value)：如果列表中已经存在给定的值，删除它；如果列表中没有给定的值，添加它。

这样，前面那么多行代码用下面这一行代码就可以代替了：

```javascript
div.classList.remove("user");
```

以上代码能够确保其他类名不受此次修改的影响。其他方法也能极大地减少类似基本操作的复杂性，如下面的例子所示。

```javascript
//删除"disabled"类
div.classList.remove("disabled"); 

//添加"current"类
div.classList.add("current"); 

//切换"user"类
div.classList.toggle("user"); 

//确定元素中是否包含既定的类名
if (div.classList.contains("bd") && !div.classList.contains("disabled")){ 
 //执行操作
}

//迭代类名
for (var i=0, len=div.classList.length; i < len; i++){ 
 doSomething(div.classList[i]); 
}
```

有了 classList 属性，除非你需要全部删除所有类名，或者完全重写元素的 class 属性，否则也就用不到 className 属性了。

### 焦点管理

HTML5 也添加了辅助管理 DOM 焦点的功能。首先就是 document.activeElement 属性，这个属性始终会引用 DOM 中当前获得了焦点的元素。元素获得焦点的方式有页面加载、用户输入（通常是通过按 Tab 键）和在代码中调用 focus()方法

```javascript
var button = document.getElementById("myButton"); 
button.focus(); 
alert(document.activeElement === button); //true
```

默认情况下，文档刚刚加载完成时，document.activeElement 中保存的是 document.body 元素的引用。文档加载期间，document.activeElement 的值为 null

另外就是新增了 document.hasFocus()方法，这个方法用于确定文档是否获得了焦点

```javascript
var button = document.getElementById("myButton"); 
button.focus(); 
alert(document.hasFocus()); //true
```

通过检测文档是否获得了焦点，可以知道用户是不是正在与页面交互。

查询文档获知哪个元素获得了焦点，以及确定文档是否获得了焦点，这两个功能最重要的用途是提高 Web 应用的无障碍性。无障碍 Web 应用的一个主要标志就是恰当的焦点管理，而确切地知道哪个元素获得了焦点是一个极大的进步，至少我们不用再像过去那样靠猜测了。

### HTMLDocument 的变化

HTML5 扩展了 HTMLDocument，增加了新的功能。与 HTML5 中新增的其他 DOM 扩展类似，这些变化同样基于那些已经得到很多浏览器完美支持的专有扩展。所以，尽管这些扩展被写入标准的时间相对不长，但很多浏览器很早就已经支持这些功能了

#### readyState 属性

Document 的 readyState 属性有两个可能的值：

- loading，正在加载文档

- complete，已经加载完文档

使用 document.readyState 的最恰当方式，就是通过它来实现一个指示文档已经加载完成的指示器。在这个属性得到广泛支持之前，要实现这样一个指示器，必须借助 onload 事件处理程序设置一个标签，表明文档已经加载完毕。document.readyState 属性的基本用法如下。

```javascript
if (document.readyState == "complete"){ 
  //执行操作
}
```

#### compatMode 属性

自从 IE6 开始区分渲染页面的模式是标准的还是混杂的，检测页面的兼容模式就成为浏览器的必要功能。IE 为此给 document 添加了一个名为 compatMode 的属性，这个属性就是为了告诉开发人员浏览器采用了哪种渲染模式。

在标准模式下，document.compatMode 的值等于 "CSS1Compat"，而在混杂模式下，document.compatMode 的值等于"BackCompat"。

```javascript
if (document.compatMode == "CSS1Compat"){
  alert("Standards mode");
} else { 
  alert("Quirks mode");
}
```

#### head 属性

作为对 document.body 引用文档的 `<body>` 元素的补充，HTML5 新增了 document.head 属性，引用文档的 `<head>` 元素。要引用文档的  `<head>`元素，可以结合使用这个属性和另一种后备方法

```javascript
var head = document.head || document.getElementsByTagName("head")[0];
```

如果可用，就使用 document.head，否则仍然使用 getElementsByTagName()方法

### 字符集属性

HTML5 新增了几个与文档字符集有关的属性。其中，charset 属性表示文档中实际使用的字符集，也可以用来指定新字符集。默认情况下，这个属性的值通常是 "UTF-8"（取决于页面的编码声明），但可以通过 `<meta>` 元素、响应头部或直接设置 charset 属性修改这个值。该属性已被标记为废弃，推荐使用 `document.characterSet`（只读）。

```javascript
alert(document.charset); //"UTF-8" 
document.charset = "UTF-8";
```

### 自定义数据属性 data-

HTML5 规定可以为元素添加非标准的属性，但要添加前缀 `data-` ，目的是为元素提供与渲染无关的信息，或者提供语义信息。这些属性可以任意添加、随便命名，只要以 data-开头即可

```html
<div id="myDiv" data-app-id="12345" data-myname="Nicholas"></div>
```

添加了自定义属性之后，可以通过元素的 dataset 属性来访问自定义属性的值。dataset 属性的值是 DOMStringMap 的一个实例，也就是一个名值对儿的映射。在这个映射中，每个 data-name 形式的属性都会有一个对应的属性，只不过属性名没有 `data-` 前缀，且连字符后的字母会转为驼峰（比如，自定义属性是 data-myname，映射中对应的属性就是 myname；data-app-id 对应 appId）。注意 HTML 属性名不区分大小写，`data-appId` 会被解析为 `data-appid`，因此推荐使用连字符写法。

```javascript
//本例中使的方法仅用于演示
var div = document.getElementById("myDiv"); 

//取得自定义属性的值
var appId = div.dataset.appId; 
var myName = div.dataset.myname; 

//设置值
div.dataset.appId = 23456; 
div.dataset.myname = "Michael"; 
```

如果需要给元素添加一些不可见的数据以便进行其他处理，那就要用到自定义数据属性。在跟踪链接或混搭应用中，通过自定义数据属性能方便地知道点击来自页面中的哪个部分。

### 插入标记

虽然 DOM 为操作节点提供了细致入微的控制手段，但在需要给文档插入大量新 HTML 标记的情况下，通过 DOM 操作仍然非常麻烦，因为不仅要创建一系列 DOM 节点，而且还要小心地按照正确的顺序把它们连接起来。相对而言，使用插入标记的技术，直接插入 HTML 字符串不仅更简单，速度也更快。以下与插入标记相关的 DOM 扩展已经纳入了 HTML5 规范

#### innerHTML 属性

在读模式下，innerHTML 属性返回与调用元素的所有子节点（包括元素、注释和文本节点）对应的 HTML 标记。在写模式下，innerHTML 会根据指定的值创建新的 DOM 树，然后用这个 DOM 树完全替换调用元素原先的所有子节点

```html
<div id="content"> 
 <p>This is a <strong>paragraph</strong> with a list following it.</p> 
 <ul> 
 	<li>Item 1</li> 
 	<li>Item 2</li> 
 	<li>Item 3</li> 
 </ul> 
</div>
```

对于上面的 `<div>` 元素来说，它的 innerHTML 属性会返回如下字符串。

```html
<p>This is a <strong>paragraph</strong> with a list following it.</p> 
<ul> 
 <li>Item 1</li> 
 <li>Item 2</li> 
 <li>Item 3</li> 
</ul>
```

实际返回的文本内容会因浏览器而不同。IE 和 Opera 会把所有元素标签转换为大写，而 Safari、Chrome 和 Firefox 则会按照文档源代码的格式返回，包含空格和缩进。因此不要指望不同浏览器的 innerHTML 会返回完全一样的值。

在写模式下，innerHTML 的值会被解析为 DOM 子树，替换调用元素原来的所有子节点。因为它的值被认为是 HTML，所以其中的所有标签都会按照浏览器处理 HTML 的标准方式转换为元素（同样，这里的转换结果也因浏览器而异）。如果设置的值仅是文本而没有 HTML 标签，那么结果就是设置纯文本，如下所示

```javascript
div.innerHTML = "Hello world!";
```

为 innerHTML 设置的包含 HTML 的字符串值与解析后 innerHTML 的值大不相同。来看下面的例子。

```javascript
div.innerHTML = "Hello & welcome, <b>\"reader\"!</b>";
```

以上操作得到的结果如下：

```html
<div id="content">Hello &amp; welcome, <b>&quot;reader&quot;!</b></div>
```

设置了 innerHTML 之后，可以像访问文档中的其他节点一样访问新创建的节点。

#### outerHTML 属性

在读模式下，outerHTML 返回调用它的元素及所有子节点的 HTML 标签。在写模式下，outerHTML会根据指定的 HTML 字符串创建新的 DOM 子树，然后用这个 DOM 子树完全替换调用元素

```html
<div id="content"> 
 <p>This is a <strong>paragraph</strong> with a list following it.</p> 
 <ul> 
 	<li>Item 1</li> 
 	<li>Item 2</li> 
 	<li>Item 3</li> 
 </ul> 
</div>
```

如果在 `<div>` 元素上调用 outerHTML，会返回与上面相同的代码，包括 `<div>` 本身。不过，由于浏览器解析和解释 HTML 标记的不同，结果也可能会有所不同。（这里的不同与使用 innerHTML 属性时存在的差异性质是一样的。）

使用 outerHTML 属性以下面这种方式设置值：

```javascript
div.outerHTML = "<p>This is a paragraph.</p>";
```

这行代码完成的操作与下面这些 DOM 脚本代码一样：

```javascript
var p = document.createElement("p"); 
p.appendChild(document.createTextNode("This is a paragraph.")); 
div.parentNode.replaceChild(p, div);
```

结果，就是新创建的 `<p>` 元素会取代 DOM 树中的 `<div>` 元素

####  insertAdjacentHTML() 与 insertAdjacentText()

关于插入标签的最后两个新增方法是 insertAdjacentHTML()和 insertAdjacentText()。这两个方法最早源自 IE，它们都接收两个参数：要插入标记的位置和要插入的 HTML 或文本。第一个参数必须是下列值中的一个：

- "beforebegin"，插入当前元素前面，作为前一个同胞节点
- "afterbegin"，插入当前元素内部，作为新的子节点或放在第一个子节点前面
- "beforeend"，插入当前元素内部，作为新的子节点或放在最后一个子节点后面
- "afterend"，插入当前元素后面，作为下一个同胞节点

注意这几个值是不区分大小写的。第二个参数会作为 HTML 字符串解析（与 innerHTML 和 outerHTML 相同）或者作为纯文本解析（与 innerText 和 outerText 相同）。如果是 HTML，则会在解析出错时抛出错误。下面展示了基本用法：

```js
// 作为前一个同胞节点插入
element.insertAdjacentHTML("beforebegin", "<p>Hello world!</p>");
element.insertAdjacentText("beforebegin", "Hello world!");

// 作为第一个子节点插入
element.insertAdjacentHTML("afterbegin", "<p>Hello world!</p>");
element.insertAdjacentText("afterbegin", "Hello world!");

// 作为最后一个子节点插入
element.insertAdjacentHTML("beforeend", "<p>Hello world!</p>");
element.insertAdjacentText("beforeend", "Hello world!");

// 作为下一个同胞节点插入
element.insertAdjacentHTML("afterend", "<p>Hello world!</p>");
element.insertAdjacentText("afterend", "Hello world!");
```

#### 内存与性能问题

下列代码使用 innerHTML 创建了很多列表项：

```javascript
for (var i=0, len=values.length; i < len; i++){ 
 ul.innerHTML += "<li>" + values[i] + "</li>"; //要避免这种频繁操作！！
}
```

这种每次循环都设置一次 innerHTML 的做法效率很低。而且，每次循环还要从 innerHTML 中读取一次信息，就意味着每次循环要访问两次 innerHTML。最好的做法是单独构建字符串，然后再一次性地将结果字符串赋值给 innerHTML，像下面这样：

```javascript
var itemsHtml = "";
for (var i=0, len=values.length; i < len; i++){
 itemsHtml += "<li>" + values[i] + "</li>"; 
} 

ul.innerHTML = itemsHtml;
```

这个例子的效率要高得多，因为它只对 innerHTML 执行了一次赋值操作

### scrollIntoView() 方法

scrollIntoView()方法存在于所有 HTML 元素上，可以滚动浏览器窗口或容器元素以便包含元素进入视口。这个方法的参数如下

- alignToTop 是一个布尔值
  - true：窗口滚动后元素的顶部与视口顶部对齐
  - false：窗口滚动后元素的底部与视口底部对齐
- scrollIntoViewOptions 是一个选项对象
  - behavior：定义过渡动画，可取的值为"smooth"和"auto"，默认为"auto"。
  - block：定义垂直方向的对齐，可取的值为"start"、"center"、"end"和"nearest"，默认为 "start"。
  - inline：定义水平方向的对齐，可取的值为"start"、"center"、"end"和"nearest"，默认为 "nearest"。
- 不传参数等同于 alignToTop 为 true

```js
// 确保元素可见
document.forms[0].scrollIntoView(); 

// 同上
document.forms[0].scrollIntoView(true); 
document.forms[0].scrollIntoView({block: 'start'}); 

// 尝试将元素平滑地滚入视口
document.forms[0].scrollIntoView({behavior: 'smooth', block: 'start'});
```

当页面发生变化时，一般会用这个方法来吸引用户的注意力。实际上，为某个元素设置焦点也会导致浏览器滚动并显示出获得焦点的元素

## 专有扩展

尽管所有浏览器厂商都理解遵循标准的重要性，但它们也都有为弥补功能缺失而为 DOM 添加专有扩展的历史。虽然这表面上看是一件坏事，但专有扩展也为开发者提供了很多重要功能，而这些功能后来则有可能被标准化，比如进入 HTML5。

除了已经标准化的，各家浏览器还有很多未被标准化的专有扩展。这并不意味着它们将来不会被纳入标准，只不过在本书编写时，它们还只是由部分浏览器专有和采用

### children 属性

由于 IE9 之前的版本与其他浏览器在处理文本节点中的空白符时有差异，因此就出现了 children属性。这个属性是 HTMLCollection 的实例，只包含元素中同样还是元素的子节点。除此之外，children 属性与 childNodes 没有什么区别，即在元素只包含元素子节点时，这两个属性的值相同。

下面是访问 children 属性的示例代码：

```javascript
var childCount = element.children.length; 
var firstChild = element.children[0];
```

### contains()方法

在实际开发中，经常需要知道某个节点是不是另一个节点的后代。IE 为此率先引入了 contains()方法，以便不通过在 DOM 文档树中查找即可获得这个信息

调用 contains() 方法的应该是祖先节点，也就是搜索开始的节点，这个方法接收一个参数，即要检测的后代节点。如果被检测的节点是后代节点，该方法返回 true；否则，返回 false。以下是一个例子：

```javascript
alert(document.documentElement.contains(document.body)); //true
```

这个例子测试了 `<body>` 元素是不是 `<html>` 元素的后代，在格式正确的 HTML 页面中，以上代码返回 true。另外，使用 DOM Level 3 的 compareDocumentPosition() 也能够确定节点间的关系。支持这个方法的浏览器有 IE9+、Firefox、Safari、Opera 9.5+和 Chrome。如前所述，这个方法用于确定两个节点间的关系

### 插入文本

前面介绍过，IE 原来专有的插入标记的属性 innerHTML 和 outerHTML 已经被 HTML5 纳入规范。但另外两个插入文本的专有属性则没有这么好的运气。这两个没有被 HTML5 看中的属性是 innerText和 outerText。

#### innerText 属性

通过 innerText 属性可以操作元素中包含的所有文本内容，包括子文档树中的文本。在通过innerText 读取值时，它会按照由浅入深的顺序，将子文档树中的所有文本拼接起来。在通过innerText 写入值时，结果会删除元素的所有子节点，插入包含相应文本值的文本节点

```html
<div id="content"> 
  <p>This is a <strong>paragraph</strong> with a list following it.</p> 
  <ul> 
    <li>Item 1</li> 
    <li>Item 2</li> 
    <li>Item 3</li> 
  </ul> 
</div>
```

对于这个例子中的 `<div>` 元素而言，其 innerText 属性会返回下列字符串：

```javascript
This is a paragraph with a list following it. 
Item 1 
Item 2 
Item 3
```

由于不同浏览器处理空白符的方式不同，因此输出的文本可能会也可能不会包含原始 HTML 代码中的缩进

使用 innerText 属性设置这个 `<div>` 元素的内容，则只需一行代码。

```javascript
div.innerText = "Hello world!";
```

执行这行代码后，页面的 HTML 代码就会变成如下所示

设置 innerText 属性移除了先前存在的所有子节点，完全改变了DOM子树。此外，设置innerText属性的同时，也对文本中存在的 HTML 语法字符（小于号、大于号、引号及和号）进行了编码。再看一个例子

```javascript
div.innerText = "Hello & welcome, <b>\"reader\"!</b>";
```

运行以上代码之后，会得到如下所示的结果

```html
<div id="content">Hello &amp; welcome, &lt;b&gt;&quot;reader&quot;!&lt;/b&gt;</div>
```

#### outerText 属性

除了作用范围扩大到了包含调用它的节点之外，outerText 与 innerText 基本上没有多大区别

在读取文本值时，outerText 与 innerText 的结果完全一样。但在写模式下，outerText 就完全不同了：outerText 不只是替换调用它的元素的子节点，而是会替换整个元素（包括子节点）。比如：

```javascript
div.outerText = "Hello world!";
```

这行代码实际上相当于如下两行代码：

```javascript
var text = document.createTextNode("Hello world!"); 

div.parentNode.replaceChild(text, div);
```

本质上，新的文本节点会完全取代调用 outerText 的元素。此后，该元素就从文档中被删除，无法访问

### 滚动

如前所述，滚动是 HTML5 之前 DOM 标准没有涉及的领域。虽然 HTML5 把 scrollIntoView() 标准化了，但不同浏览器中仍然有其他专有方法。比如，scrollIntoViewIfNeeded() 作为HTMLElement 类型的扩展可以在所有元素上调用。scrollIntoViewIfNeeded(alignCenter) 会在元素不可见的情况下，将其滚动到窗口或滚动容器中使其可见；如果已经在视口中可见，则这个方法什么也不做。如果将可选的参数 alignCenter 设置为 true，则浏览器会尝试将其放在视口中央。Safari、Chrome 和 Opera 实现了这个方法。

```js
// 如果不可见，则将元素可见
document.images[0].scrollIntoViewIfNeeded();
```
