---
title: Element
description: "Element 节点对象对应网页的 HTML 元素。每一个 HTML 元素，在 DOM 树上都会转化成一个 Element 节点对象（以下简称元素节点）。元素节点的 nodeType 属性都是 1。"
keywords: [Element]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---



# Element 接口

## 概述

Element 节点对象对应网页的 HTML 元素。每一个 HTML 元素，在 DOM 树上都会转化成一个 Element 节点对象（以下简称元素节点）。元素节点的 `nodeType` 属性都是 1。

```javascript
var p = document.querySelector("p")
p.nodeName // "P"
p.nodeType // 1
```

## 接口继承关系

Element 对象继承 Node 接口，因此 Node 的属性和方法在 Element 对象都存在。完整的继承链如下：

```
EventTarget
  └─ Node
       ├─ Element
       │    ├─ HTMLElement
       │    │    ├─ HTMLDivElement
       │    │    ├─ HTMLSpanElement
       │    │    ├─ HTMLAnchorElement
       │    │    └─ ... (其他具体元素类型)
       │    └─ SVGElement
       ├─ Document
       ├─ Text
       └─ Comment
```

## 核心功能模块

Element 接口提供了以下核心功能模块：

| **模块分类** | **主要功能** | **关键属性/方法** |
|------------|------------|-----------------|
| **元素特性** | 获取和设置元素的基本特性 | `id`, `tagName`, `className`, `classList` |
| **尺寸计算** | 获取元素的布局和视觉尺寸 | `clientWidth`, `offsetWidth`, `scrollWidth` |
| **位置定位** | 获取和设置元素位置信息 | `offsetTop`, `offsetLeft`, `offsetParent` |
| **滚动控制** | 控制元素滚动行为 | `scrollTop`, `scrollLeft`, `scroll()` |
| **样式操作** | 操作元素的内联样式 | `style`, `getComputedStyle()` |
| **内容操作** | 获取和设置元素内容 | `innerHTML`, `textContent`, `innerText` |
| **子元素操作** | 遍历和操作子元素 | `children`, `firstElementChild`, `append()` |
| **类名操作** | 管理元素 CSS 类 | `className`, `classList` |
| **数据存储** | 自定义数据属性 | `dataset` |

## 属性操作方法

### getAttribute()

获取元素的指定属性值。

```
const element = document.getElementById("myLink")
const href = element.getAttribute("href")
console.log(href) // 返回 href 属性值
```

**参数**：
- `name`: 属性名称（字符串）

**返回值**：属性值的字符串，如果属性不存在则返回 `null`

### setAttribute()

设置元素的属性值。

```javascript
const element = document.getElementById("myInput")
element.setAttribute("type", "text")
element.setAttribute("disabled", "disabled")
```

**参数**：
- `name`: 属性名称（字符串）
- `value`: 属性值（字符串）

**注意**：属性值会自动转换为字符串类型

### removeAttribute()

移除元素的指定属性。

```javascript
const element = document.getElementById("myInput")
element.removeAttribute("disabled")
```

**参数**：
- `name`: 属性名称（字符串）

### hasAttribute()

检查元素是否具有指定属性。

```javascript
const element = document.getElementById("myInput")
if (element.hasAttribute("disabled")) {
  console.log("元素已被禁用")
}
```

**参数**：
- `name`: 属性名称（字符串）

**返回值**：布尔值，`true` 表示属性存在

### toggleAttribute()

切换属性的存在状态（较新的 API）。

```javascript
const element = document.getElementById("myInput")
element.toggleAttribute("disabled") // 切换 disabled 属性
element.toggleAttribute("disabled", true) // 强制添加属性
```

**参数**：
- `name`: 属性名称（字符串）
- `force`（可选）：布尔值，`true` 强制添加，`false` 强制移除

**返回值**：布尔值，表示操作后属性是否存在

**兼容性**：IE 不支持，需要 polyfill

### attributes 属性

`attributes` 属性返回一个类似数组的动态对象（`NamedNodeMap`），成员是该元素标签的所有属性节点对象。属性的实时变化都会反映在这个节点对象上。其他类型的节点对象虽然也有 `attributes` 属性，但返回的都是 `null`，因此可以把这个属性视为元素对象独有。

单个属性可以通过序号引用，也可以通过属性名引用：

```javascript
// HTML 代码如下
// <body bgcolor="yellow" onload="">
document.body.attributes[0]
document.body.attributes.bgcolor
document.body.attributes["ONLOAD"]
// 三种方法返回的都是属性节点对象，而不是属性值
```

属性节点对象有 `name` 和 `value` 属性，对应该属性的属性名和属性值，等同于 `nodeName` 属性和 `nodeValue` 属性：

```javascript
// HTML代码为
// <div id="mydiv">
const n = document.getElementById("mydiv")

n.attributes[0].name     // "id"
n.attributes[0].nodeName // "id"
n.attributes[0].value    // "mydiv"
n.attributes[0].nodeValue // "mydiv"
```

遍历一个元素节点的所有属性：

```javascript
const para = document.getElementsByTagName("p")[0]

if (para.hasAttributes()) {
  const attrs = para.attributes
  for (let i = 0; i < attrs.length; i++) {
    console.log(attrs[i].name, "->", attrs[i].value)
  }
}
```

## DOM 查询方法

### querySelector()

返回匹配指定 CSS 选择器的第一个子元素。

```javascript
const element = document.getElementById("container")
const firstItem = element.querySelector(".item")
const specificItem = element.querySelector("div.item[data-id='123']")
```

**参数**：
- `selectors`: CSS 选择器字符串

**返回值**：Element 对象，如果没有匹配则返回 `null`

### querySelectorAll()

返回匹配指定 CSS 选择器的所有子元素。

```javascript
const element = document.getElementById("container")
const allItems = element.querySelectorAll(".item")

// 遍历结果
allItems.forEach(item => {
  console.log(item.textContent)
})

// 转换为数组
const itemsArray = Array.from(allItems)
```

**参数**：
- `selectors`: CSS 选择器字符串

**返回值**：NodeList 对象（静态集合，非实时）

### getElementsByTagName()

返回指定标签名的所有子元素。

```javascript
const element = document.getElementById("container")
const divs = element.getElementsByTagName("div")
```

**参数**：
- `tagName`: 标签名称（字符串，`"*"` 表示所有标签）

**返回值**：HTMLCollection 对象（实时集合）

### getElementsByClassName()

返回包含指定类名的所有子元素。

```javascript
const element = document.getElementById("container")
const items = element.getElementsByClassName("item active")
```

**参数**：
- `classNames`: 类名字符串，多个类名用空格分隔

**返回值**：HTMLCollection 对象（实时集合）

## 滚动控制方法

### scroll() / scrollTo()

滚动元素到指定位置。

```javascript
const element = document.getElementById("scrollable")

// 绝对滚动到指定位置
element.scroll(0, 100)
element.scrollTo({
  top: 500,
  left: 0,
  behavior: "smooth" // 平滑滚动
})

// 等同于设置 scrollTop/scrollLeft
element.scrollTop = 500
```

**参数**：
- `x`, `y`: 滚动坐标（像素）
- 或 `options` 对象：`{ top, left, behavior }`

### scrollBy()

相对当前滚动位置进行增量滚动。

```javascript
const element = document.getElementById("scrollable")

// 向下滚动 100px
element.scrollBy(0, 100)

// 平滑滚动
element.scrollBy({
  top: 100,
  behavior: "smooth"
})
```

**参数**：
- `x`, `y`: 滚动增量（像素）
- 或 `options` 对象：`{ top, left, behavior }`

### scrollIntoView()

滚动元素到可见区域。

```javascript
const element = document.getElementById("target")

// 简单用法
element.scrollIntoView()

// 详细配置
element.scrollIntoView({
  behavior: "smooth", // 平滑滚动
  block: "start", // 垂直对齐方式：start, center, end, nearest
  inline: "nearest" // 水平对齐方式：start, center, end, nearest
})

// 传统用法
element.scrollIntoView(true) // 顶部对齐
element.scrollIntoView(false) // 底部对齐
```

**参数**：
- `alignToTop`（布尔值）：`true` 顶部对齐，`false` 底部对齐
- 或 `options` 对象：`{ behavior, block, inline }`

## 元素匹配与查找方法

### matches()

检查元素是否匹配指定的 CSS 选择器。

```javascript
const element = document.getElementById("myElement")

if (element.matches(".active")) {
  console.log("元素处于激活状态")
}

// 常用于事件委托
document.addEventListener("click", (e) => {
  if (e.target.matches(".delete-btn")) {
    deleteItem(e.target)
  }
})
```

**参数**：
- `selectors`: CSS 选择器字符串

**返回值**：布尔值

### closest()

从当前元素开始向上查找，返回匹配指定选择器的最近祖先元素（包括自身）。

```javascript
const element = document.getElementById("innerItem")

// 查找最近的容器元素
const container = element.closest(".container")

// 查找最近的列表项
const listItem = element.closest("li")

// 从自身开始查找
const self = element.closest("#innerItem") // 返回自身
```

**参数**：
- `selectors`: CSS 选择器字符串

**返回值**：Element 对象，如果没有匹配则返回 `null`

## 插入方法

### insertAdjacentHTML()

在指定位置插入 HTML 字符串。

```javascript
const element = document.getElementById("container")

// 位置参数说明：
// "beforebegin": 元素自身的前面
// "afterbegin": 元素内部的第一个子节点之前
// "beforeend": 元素内部的最后一个子节点之后
// "afterend": 元素自身的后面

element.insertAdjacentHTML("beforeend", "<div>新内容</div>")
```

**参数**：
- `position`: 插入位置（"beforebegin" | "afterbegin" | "beforeend" | "afterend"）
- `text`: HTML 字符串

**图示说明**：

```
<!-- beforebegin -->
<div id="container">
  <!-- afterbegin -->
  <p>现有内容</p>
  <!-- beforeend -->
</div>
<!-- afterend -->
```

### insertAdjacentElement()

在指定位置插入元素节点。

```javascript
const container = document.getElementById("container")
const newElement = document.createElement("div")
newElement.textContent = "新元素"

// 在容器内部末尾插入
container.insertAdjacentElement("beforeend", newElement)
```

**参数**：
- `position`: 插入位置
- `element`: 要插入的 Element 对象

**返回值**：插入的元素，如果插入失败则返回 `null`

### insertAdjacentText()

在指定位置插入文本节点。

```javascript
const element = document.getElementById("container")
element.insertAdjacentText("beforeend", "这是一段文本")
```

**参数**：
- `position`: 插入位置
- `text`: 文本内容

## 位置与尺寸方法

### getBoundingClientRect()

返回元素的大小及其相对于视口的位置。

```javascript
const element = document.getElementById("myElement")
const rect = element.getBoundingClientRect()

console.log("宽度:", rect.width)
console.log("高度:", rect.height)
console.log("顶部距离视口:", rect.top)
console.log("左边距离视口:", rect.left)
console.log("右边距离视口:", rect.right)
console.log("底部距离视口:", rect.bottom)
console.log("宽度（包含边框）:", rect.width)
console.log("高度（包含边框）:", rect.height)
```

**返回值**：DOMRect 对象，包含以下属性：
- `width`, `height`: 元素宽度/高度（包含 padding 和 border）
- `top`, `left`, `right`, `bottom`: 相对于视口的坐标
- `x`, `y`: 等同于 `left` 和 `top`

### getClientRects()

返回元素的所有矩形区域的集合（主要用于行内元素跨行的情况）。

```javascript
const element = document.getElementById("inlineElement")
const rects = element.getClientRects()

for (let rect of rects) {
  console.log("矩形区域:", rect.width, rect.height)
}
```

**返回值**：DOMRectList 对象

## 方法对比总结

| **方法类别** | **常用方法** | **返回类型** | **实时性** | **使用场景** |
|------------|------------|------------|----------|------------|
| **属性操作** | `getAttribute()` | 字符串 | - | 读取属性值 |
| **属性操作** | `setAttribute()` | void | - | 设置属性值 |
| **DOM 查询** | `querySelector()` | Element | - | 查找单个子元素 |
| **DOM 查询** | `querySelectorAll()` | NodeList | 静态 | 查找多个子元素 |
| **DOM 查询** | `getElementsByTagName()` | HTMLCollection | 实时 | 按标签查找 |
| **DOM 查询** | `getElementsByClassName()` | HTMLCollection | 实时 | 按类名查找 |
| **元素匹配** | `matches()` | boolean | - | 判断是否匹配选择器 |
| **元素匹配** | `closest()` | Element \| null | - | 向上查找最近的匹配祖先 |
| **插入** | `insertAdjacentHTML()` | void | - | 在指定位置插入 HTML |
| **插入** | `append()` / `prepend()` | void | - | 在末尾/开头添加子节点 |
| **位置尺寸** | `getBoundingClientRect()` | DOMRect | - | 获取元素相对视口的位置尺寸 |

属性说明：

- `id`：虽然浏览器区分大小写（`"foo"`和 `"FOO"`不同），但建议统一使用小写或驼峰命名，避免混淆
- `tagName`：始终返回大写形式（如 `"DIV"`、`"SPAN"`），与 `nodeName`一致
- `accessKey`：不同浏览器可能对快捷键的支持不同（如 `Alt + h`或 `Alt + Shift + h`）
- `draggable`：需配合 `dragstart`、`dragover`、`drop`等事件实现完整拖放功能
- `tabIndex`：`0`表示按默认顺序，`-1`表示跳过（但仍可通过 `focus()`聚焦），正数按值从小到大遍历

```
// HTML代码为
// <span id="myspan">Hello</span>
var span = document.getElementById("myspan")
span.id // "myspan"
span.tagName // "SPAN"
```

`accessKey` 用于读写分配给当前元素的快捷键，btn 元素的快捷键是 h，按下 `Alt + h` 就能将焦点转移到它上面

```javascript
// HTML 代码如下
// <button accesskey="h" id="btn">点击</button>
var btn = document.getElementById("btn")
btn.accessKey // "h"
```

`lang` 属性返回当前元素的语言设置。该属性可读写

```javascript
// HTML 代码如下
// <html lang="en">
document.documentElement.lang // "en"
```

## 元素尺寸 clientHeight、clientWidth、clientLeft 和 clientTop

**返回值类型都是整数（四舍五入）**

| **属性**       | **定义**                                                                      | **包含内容**       | **不包含内容**                     | **适用元素**               | **应用场景**                   |
| -------------- | ----------------------------------------------------------------------------- | ------------------ | ---------------------------------- | -------------------------- | ------------------------------ |
| `clientHeight` | 返回元素的 CSS 高度（像素），包括高度和 padding，减去水平滚动条高度（如果有） | 元素高度 + padding | border、margin、水平滚动条（减去） | 块级元素                   | 获取可视高度，用于动态布局调整 |
| `clientWidth`  | 返回元素的 CSS 宽度（像素），包括宽度和 padding，减去垂直滚动条宽度（如果有） | 元素宽度 + padding | border、margin、垂直滚动条（减去） | 块级元素                   | 响应式布局中根据宽度调整内容   |
| `clientLeft`   | 返回元素左边框的宽度（像素），未设置边框或行内元素时返回 0                    | 左边框宽度         | padding、margin                    | 所有元素（行内元素返回 0） | 计算元素偏移量时考虑边框宽度   |
| `clientTop`    | 返回元素顶部边框的宽度（像素），未设置边框或行内元素时返回 0                  | 顶部边框宽度       | padding、margin                    | 所有元素（行内元素返回 0） | 计算垂直偏移量时考虑边框       |

示例：

![](https://cdn.nlark.com/yuque/0/2025/png/28081210/1760961463126-7db76f94-833d-48b3-b767-54dde4cab5fd.png)

```html
<!-- HTML 结构省略，仅展示关键 JS 逻辑 -->
```

关键注意事项：

1. **块级 vs 行内元素**：
   - `clientHeight`和 `clientWidth`对行内元素（如 `<span>`）返回 `0`
   - `clientLeft`和 `clientTop`对行内元素或无边框元素返回 `0`
2. **滚动条的影响**：
   - `clientHeight`和 `clientWidth`会自动减去滚动条占用的空间（如果有）
3. **四舍五入**：
   - 所有属性返回整数值，小数部分会被四舍五入（如 `20.6px`返回 `21`）

以下是整理的 **元素滚动尺寸属性** 表格，包含 `scrollHeight`和 `scrollWidth`的详细说明：

| 属性 | 含义 | 计算方式 | 是否包含隐藏内容 | 是否只读 |
|------|------|----------|-----------------|---------|
| `scrollHeight` | 元素内容的总高度（含溢出部分） | 内容高度 + padding（不含 border/margin） | ✅ | ✅ |
| `scrollWidth` | 元素内容的总宽度（含溢出部分） | 内容宽度 + padding（不含 border/margin） | ✅ | ✅ |

- 这两个属性都是只读的，无法直接赋值修改

示例：

```javascript
const container = document.querySelector('#container')
// scrollHeight：内容总高度（含溢出的不可见内容）
console.log(container.scrollHeight)
// scrollWidth：内容总宽度（含溢出的不可见内容）
console.log(container.scrollWidth)
// 这两个属性包含 padding，但不包含 border 和 margin
```

## 元素滚动位置 scrollLeft、scrollTop

| **属性**     | **定义**                                             | **可读写性** | **默认值** | **应用场景**                              |
| ------------ | ---------------------------------------------------- | ------------ | ---------- | ----------------------------------------- |
| `scrollLeft` | 表示元素水平滚动条向右滚动的像素数（无滚动条时为 0） | 可读写       | 0          | 获取/设置水平滚动位置，实现横向滚动控制   |
| `scrollTop`  | 表示元素垂直滚动条向下滚动的像素数（无滚动条时为 0） | 可读写       | 0          | 获取/设置垂直滚动位置，实现滚动监听或跳转 |

示例：

```javascript
const container = document.querySelector('#scrollContainer')
// 获取当前滚动位置
console.log('scrollLeft:', container.scrollLeft)
console.log('scrollTop:', container.scrollTop)
// 设置滚动位置（回到顶部）
container.scrollLeft = 0
container.scrollTop = 0
// 或使用 scrollTo / scrollBy
container.scrollTo({ top: 500, behavior: 'smooth' })
```

## 元素布局尺寸 offsetHeight、offsetWidth

**返回值类型都是整数（四舍五入）**

| **属性**       | **定义**                                                | **包含内容**                | **不包含内容** | **应用场景**                           |
| -------------- | ------------------------------------------------------- | --------------------------- | -------------- | -------------------------------------- |
| `offsetHeight` | 返回元素的布局高度（像素），包括内容、padding 和 border | 内容高度 + padding + border | margin         | 获取元素的完整高度（包括边框和内边距） |
| `offsetWidth`  | 返回元素的布局宽度（像素），包括内容、padding 和 border | 内容宽度 + padding + border | margin         | 获取元素的完整宽度（包括边框和内边距） |

示例：

```javascript
const box = document.querySelector('#testBox')
// offsetHeight/offsetWidth 包含内容 + padding + border
console.log('offsetHeight:', box.offsetHeight)  // 200 + 40 + 10 = 250
console.log('offsetWidth:', box.offsetWidth)

// 相比 clientHeight（不含 border）
console.log('clientHeight:', box.clientHeight)  // 200 + 40 = 240
```

## 元素位置相关属性

### offsetParent

`offsetParent` 返回最靠近当前元素的、并且 CSS 的`position`属性不等于`static`的上层元素。如果该元素是不可见的（`display`属性为`none`），或者位置是固定的（`position`属性为`fixed`），则`offsetParent`属性返回`null`

**应用场景**：用于确定子元素位置偏移的计算基准，`Element.offsetTop`和`Element.offsetLeft`都是基于`offsetParent`元素计算的

### offsetTop

`offsetTop` 返回当前元素的上边界相对于其`offsetParent`元素上边界的偏移量（单位像素）

**应用场景**：用于计算元素在页面中的垂直位置，常用于布局和滚动定位

### offsetLeft

`offsetLeft` 返回当前元素的左边界相对于其`offsetParent`元素左边界的偏移量（单位像素）

**应用场景**：用于计算元素在页面中的水平位置，常用于布局和滚动定位

示例：

```javascript
// offsetTop/offsetLeft 基于 offsetParent 计算
const child = document.querySelector('.child')
console.log('offsetParent:', child.offsetParent)  // 最近的定位祖先
console.log('offsetTop:', child.offsetTop)        // 相对 offsetParent 顶部的偏移
console.log('offsetLeft:', child.offsetLeft)      // 相对 offsetParent 左侧的偏移

// 当元素 display:none 或 position:fixed 时，offsetParent 为 null
const fixedElement = document.createElement('div')
fixedElement.style.position = 'fixed'
document.body.appendChild(fixedElement)
console.log('fixedElement.offsetParent:', fixedElement.offsetParent) // null
```

## 元素可见性 hidden

**hidden** 是一个布尔值，表示元素是否被隐藏。如果元素的`hidden`属性被设置为`true`，则该元素不会显示在页面上。用于控制元素的显示和隐藏，是一种简单的隐藏元素的方式，比使用`display: none`更语义化

```javascript
const element = document.getElementById("myElement")
element.hidden = true // 隐藏元素
console.log(element.hidden) // 输出 true
```

或者：

```javascript
// <div hidden>这个元素会被隐藏</div>
element.setAttribute("hidden", "") // 添加 hidden 属性
element.removeAttribute("hidden") // 移除 hidden 属性
```

浏览器会自动为 `hidden`属性应用以下样式：

```css
[hidden] {
  display: none !important;
}
```

对比其他的隐藏方式：

| **方式**                | **是否影响 DOM** | **是否影响布局** | **是否可被 CSS 覆盖**      |
| ----------------------- | ---------------- | ---------------- | -------------------------- |
| `hidden`属性            | ❌ 不影响        | ✅ 隐藏          | ✅ 可被更高优先级 CSS 覆盖 |
| `style="display: none"` | ❌ 不影响        | ✅ 隐藏          | ✅ 可被更高优先级 CSS 覆盖 |
| `visibility: hidden`    | ❌ 不影响        | ❌ 仍占位        | ✅ 可被 CSS 覆盖           |
| `opacity: 0`            | ❌ 不影响        | ❌ 仍占位        | ✅ 可被 CSS 覆盖           |

### `hidden` 属性的覆盖与自定义

**覆盖默认 `hidden` 样式**：由于 `hidden` 默认样式使用 `!important`，如果要强制显示，可以：

```css
[hidden] {
  display: block !important; /* 强制显示 */
}
```

或者：

```javascript
element.style.display = "block" // JS 强制覆盖
```

如果不想用 `display: none`，可以改用其他隐藏方式：

```css
[hidden] {
  visibility: hidden; /* 隐藏但仍占位 */
  opacity: 0; /* 透明但仍可交互 */
}
```

### `hidden`属性的适用场景

**适用情况：**

- **简单隐藏元素**：不需要动态切换，直接静态隐藏
- **SEO 优化**：搜索引擎会忽略 `hidden`内容（但 `display: none`也可能被忽略）
- **无障碍（A11Y）**：屏幕阅读器通常跳过 `hidden`元素

**不适用情况：**

- **需要动态显示/隐藏**：推荐用 `classList.toggle('hidden')`或 `style.display`
- **需要动画过渡**：`display: none`无法动画，可用 `visibility + opacity`替代

### `hidden`与 ARIA 属性的关系

`hidden`和 `aria-hidden="true"`都可用于隐藏元素，但：

- `hidden`是 HTML 标准属性，影响视觉和部分可访问性。
- `aria-hidden="true"`仅影响屏幕阅读器，不影响视觉渲染。

**示例：**

```html
<div hidden aria-hidden="false">仍然会被隐藏</div>
<div aria-hidden="true">视觉可见，但屏幕阅读器跳过</div>
```

## 元素可编辑性相关属性

`contentEditable`和 `isContentEditable`是 HTML 提供的用于控制元素可编辑状态的属性，它们允许开发者直接在页面上创建可编辑的富文本区域，而无需使用 `<textarea>`或 `<input>`等传统表单元素

### contentEditable

`contentEditable`是一个全局 HTML 属性，可以应用于几乎所有 HTML 元素，使其内容可以被用户直接编辑

- `"true"`：元素内容可编辑
- `"false"`：元素内容不可编辑
- `"inherit"`（默认值）：继承父元素的可编辑状态

```html
<div contenteditable="true">这段文字可以被编辑</div>
<div contenteditable="false">这段文字不可被编辑</div>
```

使用示例：

```html
<div id="editable" contenteditable="true">可编辑内容</div>
<script>
  // 动态设置或读取可编辑状态
  const element = document.getElementById("editable")
  element.contentEditable = "false" // 关闭编辑
  // 检查元素当前是否可编辑
  console.log(element.isContentEditable) // false
</script>
```

### isContentEditable

`isContentEditable`是一个只读属性，返回一个布尔值，表示元素当前是否可编辑

```javascript
const element = document.getElementById("myElement")
console.log(element.isContentEditable) // true 或 false
```

使用示例：

```html
<div id="editableDiv" contenteditable="true">可编辑内容</div>
<script>
  const div = document.getElementById("editableDiv")
  console.log(div.isContentEditable) // 输出: true
</script>
```

示例：简单的富文本编辑器

```html
<div id="editor" contenteditable="true">
  这是一段可以编辑的富文本
</div>
<script>
  const editor = document.getElementById("editor")

  // 监听输入，实时统计字符数
  function updateOutput() {
    document.getElementById("count").textContent = editor.textContent.length
  }
  editor.addEventListener("input", updateOutput)
  updateOutput()

  // 用 execCommand 实现加粗（已废弃但兼容性好）
  document.getElementById("boldBtn").addEventListener("click", () => {
    document.execCommand("bold")
  })
</script>
```

## 元素样式 style

`style`属性允许直接获取和设置元素的内联样式（inline styles）。`style`属性返回一个 `CSSStyleDeclaration`对象，表示元素的内联样式（即通过 `style`属性直接写在 HTML 标签中的样式）

```javascript
const element = document.getElementById("myElement")
const styleObject = element.style
```

### 基本使用

1. 获取样式值

```javascript
// 获取单个样式属性
const color = element.style.color

// 获取所有内联样式
const allStyles = element.style.cssText
```

2. 设置样式值

```javascript
// 设置单个样式属性
element.style.color = "red"

// 使用驼峰式属性名
element.style.backgroundColor = "#fff"

// 设置多个样式
element.style.cssText = "color: red; background-color: white;"
```

3. 其他有用方法

```javascript
// 移除某个样式属性
element.style.removeProperty("color")

// 设置优先级
element.style.setProperty("color", "blue", "important")

// 获取属性优先级
const priority = element.style.getPropertyPriority("color")
```

`style`属性只反映元素的内联样式，不包含来自样式表的计算样式。要获取计算样式，应使用 `window.getComputedStyle()`

```javascript
const computedStyle = window.getComputedStyle(element)
```

CSS 属性名中的连字符在 JavaScript 中需要转换为驼峰式：

```javascript
element.style.backgroundColor = "white" // background-color
element.style.fontSize = "16px" // font-size
```

### 对比 classList

| **特性** | **style 属性**             | **classList**            |
| -------- | -------------------------- | ------------------------ |
| 操作方式 | 直接操作样式属性           | 通过添加/移除类名操作    |
| 优先级   | 高（内联样式）             | 取决于样式表中的定义     |
| 适用场景 | 需要精确控制单个样式属性时 | 需要切换一组预定义样式时 |
| 性能     | 频繁操作可能影响性能       | 通常性能更好             |
| 可维护性 | 较低（样式与逻辑混合）     | 较高（样式与逻辑分离）   |

最佳实践：

1. **优先使用类名**：对于复杂的样式变化，优先考虑使用 `classList`添加/移除类名
2. **批量修改**：使用 `cssText`或 `Object.assign`批量修改样式，减少重排次数：

```javascript
// 批量修改
Object.assign(element.style, {
  color: "red",
  backgroundColor: "white",
  fontSize: "16px"
})
```

3. **动画优化**：对于复杂动画，考虑使用 CSS transitions/animations 或 requestAnimationFrame。
4. **样式分离**：尽量将样式定义放在样式表中，JavaScript 只负责状态变化。

`style`属性是前端开发中操作元素样式的强大工具，理解其特性和正确使用方式对于创建动态、响应式的 Web 应用至关重要。

## 元素子元素相关属性

| **属性**                   | **类型**       | **返回值**     | **说明**                             |
| -------------------------- | -------------- | -------------- | ------------------------------------ |
| **children**               | HTMLCollection | 所有子元素     | 仅包含元素节点，不包含文本和注释节点 |
| **childElementCount**      | number         | 子元素数量     | 等同于 children.length，但性能更优   |
| **firstElementChild**      | Element/null   | 第一个子元素   | 无子元素时返回 null                  |
| **lastElementChild**       | Element/null   | 最后一个子元素 | 无子元素时返回 null                  |
| **nextElementSibling**     | Element/null   | 下一个兄弟元素 | 无后续兄弟元素时返回 null            |
| **previousElementSibling** | Element/null   | 上一个兄弟元素 | 无前驱兄弟元素时返回 null            |

### children

`children` 返回一个实时的 HTMLCollection 对象，包含当前元素的所有子元素节点（不包括文本节点和注释节点）

**特点**：

- 只包含元素节点（Element nodes）
- 集合是**实时**的（live），会随 DOM 变化自动更新
- 性能优于 childNodes（不需要过滤非元素节点）

```javascript
// 示例：遍历所有子元素
const container = document.getElementById("container")
for (let child of container.children) {
  console.log(child.tagName)
}

// 示例：修改所有子元素样式
Array.from(container.children).forEach((child) => {
  child.style.padding = "10px"
})
```

### childElementCount

`childElementCount` 返回当前元素的子元素数量，等价于`children.length`

**优势**：

- 比访问 `children.length` 性能更好
- 直接返回数字，不需要创建 HTMLCollection 对象

```javascript
// 检查是否有子元素
if (container.childElementCount > 0) {
  console.log("容器不为空")
}

// 动态布局示例
if (container.childElementCount > 5) {
  container.style.flexDirection = "column"
}
```

### firstElementChild & lastElementChild

**对比**：

| **属性**          | **获取位置**   | **典型应用场景**           |
| ----------------- | -------------- | -------------------------- |
| firstElementChild | 第一个子元素   | 获取列表首项、设置首项样式 |
| lastElementChild  | 最后一个子元素 | 获取列表末项、追加新元素前 |

```javascript
// 示例：操作首尾元素
const first = container.firstElementChild
const last = container.lastElementChild

if (first) first.classList.add("first-item")
if (last) last.classList.add("last-item")

// 在最后子元素后插入新元素
const newItem = document.createElement("div")
container.insertBefore(newItem, last ? last.nextSibling : null)
```

### nextElementSibling & previousElementSibling

| **属性**               | **方向** | **典型应用场景**         |
| ---------------------- | -------- | ------------------------ |
| nextElementSibling     | 向后查找 | 遍历水平菜单、表格行处理 |
| previousElementSibling | 向前查找 | 实现"上移"功能、顺序操作 |

```javascript
// 示例：兄弟元素遍历
function getAllSiblings(element) {
  const siblings = []
  let prev = element.previousElementSibling
  let next = element.nextElementSibling

  while (prev) {
    siblings.unshift(prev)
    prev = prev.previousElementSibling
  }

  while (next) {
    siblings.push(next)
    next = next.nextElementSibling
  }

  return siblings
}

// 表格行高亮示例
tableRows.forEach((row) => {
  row.addEventListener("mouseover", () => {
    const prev = row.previousElementSibling
    const next = row.nextElementSibling

    if (prev) prev.style.backgroundColor = "#f0f0f0"
    if (next) next.style.backgroundColor = "#f0f0f0"
  })
})
```

综合示例：

```html
<div id="container">
  <div class="item">Item 1</div>
  <div class="item">Item 2</div>
  <div class="item">Item 3</div>
</div>
<script>
  const container = document.getElementById("container")
  const newItem = document.createElement("div")
  newItem.className = "item"
  newItem.textContent = "New Item"
  // 在最后一个子元素之前插入
  container.insertBefore(newItem, container.lastElementChild)
</script>
```

## 元素数据集 **dataset**

`dataset`属性是 HTML5 引入的一个强大特性，它提供标准化的方式来访问和操作 HTML 元素上的自定义数据属性 `data-*`

`dataset`属性返回一个 `DOMStringMap`对象，包含元素所有以 `data-`开头的自定义数据属性

```javascript
// <div id="user" data-id="12345" data-user-name="john_doe" data-account-status="active"></div>

const userElement = document.getElementById("user")
const userData = userElement.dataset

console.log(userData.id) // "12345"
console.log(userData.userName) // "john_doe"
console.log(userData.accountStatus) // "active"
```

### 属性命名转换规则

HTML 属性名与 JavaScript 属性名之间的转换遵循特定规则：

- `data-`前缀被去除
- 连字符命名（kebab-case）转换为驼峰命名（camelCase）：
  - `data-user-name`→ `userName`
  - `data-account-status`→ `accountStatus`

### 基本使用

1. 读取数据属性

```javascript
// 获取单个属性
const userId = element.dataset.id

// 获取所有数据属性
const allData = JSON.stringify(element.dataset)
console.log(allData)
```

2. 设置数据属性

```javascript
// 设置单个属性
element.dataset.userRole = "admin"

// 设置多个属性
Object.assign(element.dataset, {
  lastLogin: "2023-05-15",
  loginCount: "42"
})
```

3. 删除数据属性

```javascript
// 删除属性
delete element.dataset.accountStatus

// 检查属性是否存在
if ("accountStatus" in element.dataset) {
  // 属性存在
}
```

4. dataset 属性值始终是字符串类型。如需其他类型，需要手动转换：

```javascript
// 自动转换
const numericId = parseInt(element.dataset.id)
const isActive = element.dataset.active === "true"
const userObj = JSON.parse(element.dataset.userInfo)

// 设置非字符串值
element.dataset.loginCount = 42 // 会自动转换为字符串 "42"
element.dataset.userInfo = JSON.stringify({ name: "John", age: 30 })
```

### 对比 getAttribute/setAttribute

| **特性**   | **dataset 属性** | **getAttribute/setAttribute** |
| ---------- | ---------------- | ----------------------------- |
| 访问方式   | 对象属性访问     | 方法调用                      |
| 命名转换   | 自动转换驼峰命名 | 保持原始属性名                |
| 性能       | 更高效           | 稍慢                          |
| 数据类型   | 始终返回字符串   | 始终返回字符串                |
| 代码可读性 | 更高             | 较低                          |

### 注意事项

1. **性能考虑**：频繁操作 dataset 可能触发重排/重绘，批量操作时建议：

```javascript
// 不推荐
element.dataset.prop1 = "a"
element.dataset.prop2 = "b"

// 推荐
Object.assign(element.dataset, {
  prop1: "a",
  prop2: "b"
})
```

2. **数据安全**：避免存储敏感信息，因为 dataset 可通过开发者工具查看
3. **JSON 数据**：存储复杂数据时使用 JSON：

```javascript
// 存储
element.dataset.userInfo = JSON.stringify(user)

// 读取
try {
  const user = JSON.parse(element.dataset.userInfo)
} catch (e) {
  console.error("Invalid JSON data")
}
```

## 元素内容相关属性

### innerHTML

`innerHTML`属性用于获取或设置元素内部的 HTML 内容（不包括元素本身）

```javascript
// <div id="container">
//  <p>Hello <span>World</span></p>
// </div>

const container = document.getElementById("container")
console.log(container.innerHTML)
// 输出: "<p>Hello <span>World</span></p>"
```

设置 innerHTML

```javascript
// 设置新的HTML内容
container.innerHTML = "<h1>New Content</h1><p>With multiple elements</p>"

// 追加内容
container.innerHTML += "<div>Appended content</div>"
```

直接使用 `innerHTML`可能带来 XSS 攻击风险：

```javascript
// 不安全的方式（可能执行恶意脚本）
container.innerHTML = "<img src=x onerror=\"alert('XSS')\">"

// 安全替代方案
const text = "<img src=x onerror=\"alert('XSS')\">"
container.textContent = text // 作为纯文本显示
```

频繁操作 `innerHTML`会导致浏览器重排和重绘：

```javascript
// 不推荐（多次重排）
for (let i = 0; i < 100; i++) {
  container.innerHTML += `<div>Item ${i}</div>`
}

// 推荐（单次重排）
let html = ""
for (let i = 0; i < 100; i++) {
  html += `<div>Item ${i}</div>`
}
container.innerHTML = html
```

### outerHTML

`outerHTML`属性获取或设置元素及其内容的 HTML 表示（包括元素本身）

```javascript
// <div id="container">
//  <p>Hello World</p>
// </div>

const container = document.getElementById("container")
console.log(container.outerHTML)
// 输出: "<div id="container"><p>Hello World</p></div>"
```

设置 outerHTML

```javascript
// 替换整个元素
container.outerHTML = '<section id="new-container"><h1>Replaced</h1></section>'

// 注意：原元素引用现在无效了
console.log(container) // 仍然存在，但已不在DOM中
```

设置 `outerHTML`会替换整个元素，包括其所有属性和子元素：

```javascript
// 原始元素
const div = document.createElement("div")
div.id = "test"
div.innerHTML = "<span>content</span>"
document.body.appendChild(div)

// 替换元素
div.outerHTML = '<p id="new">New element</p>'

// 原div变量仍然存在，但不在DOM中
console.log(div.outerHTML) // 仍然可以访问
```

考虑使用更安全的 API：

```javascript
// 创建元素而非使用 innerHTML
const p = document.createElement("p")
p.textContent = "Safe content"
element.appendChild(p)

// 使用DocumentFragment
const fragment = document.createDocumentFragment()
const items = ["Item 1", "Item 2", "Item 3"]
items.forEach((text) => {
  const li = document.createElement("li")
  li.textContent = text
  fragment.appendChild(li)
})
listElement.appendChild(fragment)
```

消毒 HTML 内容：

```javascript
// 使用DOMPurify库消毒HTML
const dirty = "<img src=x onerror=alert(1)>"
const clean = DOMPurify.sanitize(dirty)
element.innerHTML = clean
```

## 元素集合属性 attributes

`attributes`属性提供对元素所有属性的访问和操作能力。`attributes`属性返回一个 `NamedNodeMap`对象，包含元素的所有属性节点（包括标准属性和自定义属性）

```javascript
// <div id="main" class="container" data-info="example" custom-attr="value"></div>

const div = document.getElementById("main")
const attrs = div.attributes
```

`NamedNodeMap`是一个类数组对象，具有以下特点：

- 包含元素的全部属性节点（Attr 对象）
- 属性节点是动态的，会随 DOM 变化自动更新
- 不是真正的数组，但可以通过索引访问
- 具有 length 属性表示属性数量

基本使用：

1. 获取属性数量

```javascript
console.log(attrs.length) // 输出: 4 (id, class, data-info, custom-attr)
```

2. 通过索引访问属性

```javascript
// 获取第一个属性
const firstAttr = attrs[0]
console.log(firstAttr.name) // "id"
console.log(firstAttr.value) // "main"

// 遍历所有属性
for (let i = 0; i < attrs.length; i++) {
  console.log(attrs[i].name + ": " + attrs[i].value)
}
```

3. 通过名称访问属性

```javascript
// 获取特定属性
const classAttr = attrs.getNamedItem("class")
console.log(classAttr.value) // "container"

// 简写方式
console.log(attrs["class"].value) // "container"
```

4. 添加新属性

```javascript
// 创建并添加新属性
const newAttr = document.createAttribute("custom-attribute")
newAttr.value = "new-value"
attrs.setNamedItem(newAttr)

// 注意：NamedNodeMap 不支持 attrs["another-attr"] = ... 这样直接赋值来添加属性，
// 仅支持通过名称读取；添加/修改属性推荐使用 setAttribute()
```

5. 修改属性值

```plain
// 修改现有属性
attrs.getNamedItem('class').value = 'new-container';

// 简写方式
attrs['class'].value = 'updated-container';
```

6. 删除属性

```javascript
// 删除属性
attrs.removeNamedItem("custom-attr")

// 检查属性是否存在
if (attrs.getNamedItem("custom-attr")) {
  console.log("属性存在")
}
```

### 对比其他属性方法

| **操作**     | **attributes 属性**                 | **其他方法**                        |
| ------------ | ----------------------------------- | ----------------------------------- |
| **获取属性** | `attrs.getNamedItem('id').value`    | `element.getAttribute('id')`        |
| **设置属性** | `attrs.getNamedItem('id').value=`   | `element.setAttribute('id', 'new')` |
| **删除属性** | `attrs.removeNamedItem('id')`       | `element.removeAttribute('id')`     |
| **检查属性** | `attrs.getNamedItem('id') !== null` | `element.hasAttribute('id')`        |

### 实际应用场景

1. 动态属性操作

```javascript
function toggleAttribute(element, attrName) {
  const attr = element.attributes.getNamedItem(attrName)
  if (attr) {
    element.attributes.removeNamedItem(attrName)
  } else {
    const newAttr = document.createAttribute(attrName)
    element.attributes.setNamedItem(newAttr)
  }
}
```

2. 属性遍历与过滤

```javascript
// 获取所有自定义属性
function getCustomAttributes(element) {
  return Array.from(element.attributes).filter((attr) => attr.name.startsWith("data-") || attr.name.startsWith("custom-"))
}
```

3. 属性备份与恢复

```javascript
// 备份属性
function backupAttributes(element) {
  return Array.from(element.attributes).map((attr) => ({
    name: attr.name,
    value: attr.value
  }))
}

// 恢复属性
function restoreAttributes(element, backup) {
  backup.forEach((attr) => {
    element.setAttribute(attr.name, attr.value)
  })
}
```

### 与 dataset 的关系

`dataset`是 `attributes`的一个子集，专门用于处理 `data-*`属性：

```javascript
// 通过attributes访问data属性
const dataInfo = element.attributes.getNamedItem("data-info").value

// 等效的dataset访问
const sameData = element.dataset.info
```

## className

`className`是 DOM 元素的一个标准属性，用于获取或设置元素的 `class`属性值

```javascript
// <div id="example" class="header primary active"></div>

const element = document.getElementById("example")
console.log(element.className) // "header primary active"
```

设置 className

```javascript
// 完全替换class
element.className = "new-class another-class"

// 追加class（不推荐）
element.className += " additional-class" // 注意前面的空格
```

特点与限制:

- **字符串操作**：`className`返回的是字符串，操作需要字符串处理
- **覆盖风险**：直接赋值会替换所有现有类名
- **空格处理**：需要手动管理类名之间的空格

## classList

`classList`返回一个 `DOMTokenList`对象，提供更强大的类名操作方法

```javascript
const classList = element.classList
console.log(classList) // DOMTokenList ["header", "primary", "active"]
```

### 主要方法

- add 添加一个或多个类名
- remove 移除一个或多个类名
- toggle 切换类名的存在状态（有则移除，无则添加）
- contains 检查是否包含指定类
- replace 替换一个类名为另一个
- item() 返回指定索引位置的 class
- toString() 将 class 的列表转为字符串

```javascript
// 添加
element.classList.add("new-class")
element.classList.add("class1", "class2", "class3")

// 移除
element.classList.remove("primary")
element.classList.remove("class1", "class2")

// 切换
element.classList.toggle("active") // 切换active类
element.classList.toggle("active", true) // 强制添加
element.classList.toggle("active", false) // 强制移除

if (element.classList.contains("primary")) {
  // 包含primary类
}

element.classList.replace("old-class", "new-class")
```

### 基本使用

1. 导航菜单激活状态

```javascript
// 使用classList
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", function () {
    // 移除所有active类
    document.querySelectorAll(".nav-item").forEach((i) => i.classList.remove("active"))
    // 为当前项添加active
    this.classList.add("active")
  })
})
```

2. 暗黑模式切换

```javascript
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode")
  localStorage.setItem("darkMode", document.body.classList.contains("dark-mode"))
}
```

3. 响应式类名操作

```javascript
window.addEventListener("resize", function () {
  const element = document.getElementById("responsive-element")
  if (window.innerWidth < 768) {
    element.classList.add("mobile")
    element.classList.remove("desktop")
  } else {
    element.classList.add("desktop")
    element.classList.remove("mobile")
  }
})
```

4. **批量操作**：

```javascript
// 不推荐
element.classList.add("class1")
element.classList.add("class2")

// 推荐
element.classList.add("class1", "class2")
```

## 尺寸与位置属性对比总结

### 尺寸属性对比图

以下是各种尺寸属性的包含关系对比：

```
┌─────────────────────────────────────────────────────────┐
│                      margin                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │                    border                          │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │                padding                       │  │  │
│  │  │  ┌────────────────────────────────────────┐ │  │  │
│  │  │  │                                        │ │  │  │
│  │  │  │         content (内容区域)              │ │  │  │
│  │  │  │                                        │ │  │  │
│  │  │  │         clientWidth/Height             │ │  │  │
│  │  │  │         (内容 + padding - 滚动条)        │ │  │  │
│  │  │  └────────────────────────────────────────┘ │  │  │
│  │  │                                             │  │  │
│  │  │  offsetWidth/Height                         │  │  │
│  │  │  (内容 + padding + border)                  │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  │                                                    │  │
│  │  scrollWidth/Height                                │  │
│  │  (全部内容 + padding)                              │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### 尺寸属性对比表

| **属性** | **包含内容** | **不包含内容** | **包含隐藏内容** | **减去滚动条** | **只读** | **适用元素** |
|---------|------------|--------------|----------------|--------------|---------|------------|
| `clientWidth` | 内容 + padding | border, margin | ❌ | ✅ | ✅ | 块级元素 |
| `clientHeight` | 内容 + padding | border, margin | ❌ | ✅ | ✅ | 块级元素 |
| `offsetWidth` | 内容 + padding + border | margin | ❌ | ❌ | ✅ | 所有元素 |
| `offsetHeight` | 内容 + padding + border | margin | ❌ | ❌ | ✅ | 所有元素 |
| `scrollWidth` | 内容 + padding | border, margin | ✅ | ✅ | ✅ | 所有元素 |
| `scrollHeight` | 内容 + padding | border, margin | ✅ | ✅ | ✅ | 所有元素 |

> 💡 **小结**：三套尺寸体系各有侧重——`client*` 是"可见内容区"（不含滚动条和边框），`offset*` 是"布局占位"（含边框），`scroll*` 是"全部内容"（含溢出隐藏部分）。测量时根据"是否需要含 border / 溢出内容"来选择。

## 最佳实践

### 1. 性能优化

#### 批量操作 DOM

```
// ❌ 不推荐：多次触发重排
for (let i = 0; i < 100; i++) {
  container.innerHTML += `<div>Item ${i}</div>`
}

// ✅ 推荐：单次重排
let html = ""
for (let i = 0; i < 100; i++) {
  html += `<div>Item ${i}</div>`
}
container.innerHTML = html

// ✅ 更好：使用 DocumentFragment
const fragment = document.createDocumentFragment()
for (let i = 0; i < 100; i++) {
  const div = document.createElement("div")
  div.textContent = `Item ${i}`
  fragment.appendChild(div)
}
container.appendChild(fragment)
```

#### 缓存 DOM 查询

```javascript
// ❌ 不推荐：重复查询
function updateItems() {
  for (let i = 0; i < 10; i++) {
    document.getElementById("container").children[i].style.color = "red"
  }
}

// ✅ 推荐：缓存查询结果
function updateItems() {
  const container = document.getElementById("container")
  const children = container.children
  for (let i = 0; i < 10; i++) {
    children[i].style.color = "red"
  }
}
```

#### 使用类名代替样式操作

```javascript
// ❌ 不推荐：直接操作样式
element.style.backgroundColor = "red"
element.style.color = "white"
element.style.padding = "10px"

// ✅ 推荐：使用类名
element.classList.add("active")
```

### 2. 安全性

#### 防止 XSS 攻击

```javascript
// ❌ 危险：直接使用 innerHTML
element.innerHTML = userInput

// ✅ 安全：使用 textContent
element.textContent = userInput

// ✅ 更好：使用 DOMPurify 库
import DOMPurify from "dompurify"
element.innerHTML = DOMPurify.sanitize(userInput)
```

#### 安全地创建元素

```javascript
// ❌ 不安全
const html = `<div onclick="alert('XSS')">${userInput}</div>`
element.innerHTML = html

// ✅ 安全
const div = document.createElement("div")
div.textContent = userInput
element.appendChild(div)
```

### 3. 代码可维护性

#### 使用语义化的类名

```javascript
// ❌ 不推荐
element.className = "active selected highlighted"

// ✅ 推荐：使用有意义的类名
element.classList.add("is-active", "is-selected", "is-highlighted")
```

#### 使用 dataset 存储数据

```javascript
// ❌ 不推荐：使用自定义属性
element.setAttribute("user-id", "123")
const userId = element.getAttribute("user-id")

// ✅ 推荐：使用 dataset
element.dataset.userId = "123"
const userId = element.dataset.userId
```

### 4. 事件委托

```javascript
// ❌ 不推荐：为每个元素绑定事件
document.querySelectorAll(".delete-btn").forEach(btn => {
  btn.addEventListener("click", handleDelete)
})

// ✅ 推荐：使用事件委托
document.addEventListener("click", (e) => {
  if (e.target.matches(".delete-btn")) {
    handleDelete(e)
  }
})

// ✅ 更好：委托到最近的共同祖先
document.getElementById("list").addEventListener("click", (e) => {
  const deleteBtn = e.target.closest(".delete-btn")
  if (deleteBtn) {
    handleDelete(e)
  }
})
```

## 常见问题

### Q1: clientWidth 和 offsetWidth 的区别是什么？

**A:** 主要区别在于是否包含边框：

```javascript
// 假设元素样式：width: 100px; padding: 10px; border: 5px solid;
console.log(element.clientWidth) // 120 (100 + 10*2)
console.log(element.offsetWidth) // 130 (100 + 10*2 + 5*2)
```

- `clientWidth` = 内容宽度 + padding - 滚动条宽度
- `offsetWidth` = 内容宽度 + padding + border

### Q2: 为什么 getBoundingClientRect() 和 offsetTop 的值不同？

**A:** 因为参照物不同：

```javascript
const rect = element.getBoundingClientRect()
console.log(rect.top) // 相对于视口顶部
console.log(element.offsetTop) // 相对于 offsetParent
```

- `getBoundingClientRect()` 的值相对于**视口**
- `offsetTop` 的值相对于**offsetParent**

### Q3: 如何判断元素是否在可视区域内？

**A:** 有多种方法：

```javascript
// 方法 1：使用 getBoundingClientRect()
function isInViewport(element) {
  const rect = element.getBoundingClientRect()
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  )
}

// 方法 2：使用 Intersection Observer API（推荐）
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      console.log("元素进入可视区域")
    }
  })
}, { threshold: 0.1 })

observer.observe(element)
```

### Q4: innerHTML 和 textContent 有什么区别？

**A:** 主要区别在于对 HTML 的处理：

```javascript
const html = "<script>alert('XSS')</script>"

// innerHTML：会解析 HTML，可能执行脚本
element.innerHTML = html // 危险！

// textContent：将 HTML 作为纯文本显示
element.textContent = html // 安全
```

| **特性** | **innerHTML** | **textContent** |
|---------|--------------|----------------|
| HTML 解析 | ✅ 会解析 | ❌ 不解析 |
| XSS 风险 | ⚠️ 高 | ✅ 安全 |
| 性能 | 较慢（需解析） | 快 |
| 使用场景 | 需要 HTML 结构 | 纯文本内容 |

### Q5: 如何正确获取元素的计算样式？

**A:** 使用 `getComputedStyle()`：

```javascript
// ❌ 错误：style 只能获取内联样式
console.log(element.style.width) // 空字符串（如果样式在 CSS 中）

// ✅ 正确：获取计算样式
const computedStyle = window.getComputedStyle(element)
console.log(computedStyle.width) // "100px"
console.log(computedStyle.backgroundColor) // "rgb(255, 0, 0)"
```

### Q6: classList 和 className 应该用哪个？

**A:** 推荐使用 `classList`：

```javascript
// ❌ className：需要手动处理字符串
element.className = "class1 class2"
element.className += " class3" // 需要注意空格

// ✅ classList：提供清晰的 API
element.classList.add("class1", "class2")
element.classList.add("class3")
element.classList.toggle("active")
element.classList.remove("class1")
```

| **特性** | **className** | **classList** |
|---------|--------------|--------------|
| 类型 | 字符串 | DOMTokenList 对象 |
| 操作方式 | 字符串拼接 | 方法调用 |
| 可读性 | 较低 | 高 |
| 易用性 | 需要处理空格 | 自动处理 |

### Q7: scrollHeight 和 clientHeight 什么时候相等？

**A:** 当内容没有溢出时：

```javascript
// 内容未溢出
if (element.scrollHeight === element.clientHeight) {
  console.log("内容没有溢出")
}

// 内容溢出
if (element.scrollHeight > element.clientHeight) {
  console.log("内容溢出，需要滚动")
}
```

### Q8: 如何检测元素是否可滚动？

**A:** 比较 scrollHeight/clientHeight 或 scrollWidth/clientWidth：

```javascript
function isScrollable(element) {
  return {
    vertical: element.scrollHeight > element.clientHeight,
    horizontal: element.scrollWidth > element.clientWidth
  }
}

// 使用示例
const scrollStatus = isScrollable(container)
console.log("垂直可滚动:", scrollStatus.vertical)
console.log("水平可滚动:", scrollStatus.horizontal)
```

## API 速查表

### 常用属性速查

```javascript
// 元素信息
element.id                    // 元素 ID
element.tagName               // 标签名（大写）
element.className             // class 属性（字符串）
element.classList             // class 列表（DOMTokenList）

// 尺寸信息
element.clientWidth           // 可视宽度（含 padding）
element.clientHeight          // 可视高度（含 padding）
element.offsetWidth           // 布局宽度（含 padding + border）
element.offsetHeight          // 布局高度（含 padding + border）
element.scrollWidth           // 内容总宽度
element.scrollHeight          // 内容总高度

// 滚动与位置
element.scrollTop             // 垂直滚动位置
element.scrollLeft            // 水平滚动位置
element.offsetTop             // 相对 offsetParent 的垂直偏移
element.offsetLeft            // 相对 offsetParent 的水平偏移
element.offsetParent          // 最近的定位祖先元素

// 其他
element.hidden                // 是否隐藏
element.style                 // 内联样式对象
element.dataset               // data-* 属性集合
element.attributes            // 所有属性集合
```

### 常用方法速查

```javascript
// 属性操作
element.getAttribute(name)              // 获取属性
element.setAttribute(name, value)       // 设置属性
element.removeAttribute(name)           // 移除属性
element.hasAttribute(name)              // 检查属性

// DOM 查询
element.querySelector(selectors)        // 查找单个子元素
element.querySelectorAll(selectors)     // 查找所有匹配的子元素
element.getElementsByTagName(name)      // 按标签查找
element.getElementsByClassName(names)   // 按类名查找

// 元素匹配
element.matches(selectors)              // 是否匹配选择器
element.closest(selectors)              // 查找最近的祖先元素

// 滚动
element.scroll(x, y)                    // 滚动到指定位置
element.scrollBy(x, y)                  // 相对滚动
element.scrollIntoView()                // 滚动到可见区域

// 插入
element.insertAdjacentHTML(position, html)  // 插入 HTML
element.insertAdjacentElement(position, el) // 插入元素

// 位置
element.getBoundingClientRect()         // 获取相对于视口的位置
element.getClientRects()                // 获取所有矩形区域
```
