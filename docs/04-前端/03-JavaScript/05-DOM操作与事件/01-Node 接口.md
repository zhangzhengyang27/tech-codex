---
title: Node 接口
description: "DOM（Document Object Model，文档对象模型）是浏览器提供的编程接口，用于在内存中表示和操作文档结构。本文讲解 Node 接口——所有节点的基类：nodeType/nodeName 等属性、appendChild/insertBefore/removeChild 等方法，以及遍历、克隆与性能优化要点。"
keywords: [Node, 接口]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---


# Node 接口

## 系统架构概览

DOM（Document Object Model，文档对象模型）是浏览器提供的编程接口，用于在内存中表示和操作文档结构。它将结构化的标记语言（HTML、XML）解析成可以通过脚本访问和修改的节点树，是前端开发中最核心、最常见的能力之一

### DOM 架构层次

```
┌─────────────────────────────────────────────────────┐
│              浏览器渲染引擎                          │
├─────────────────────────────────────────────────────┤
│  DOM 核心 (Core DOM)                                │
│  ├─ Node 接口 (所有节点的基类)                      │
│  ├─ Document 接口 (文档对象)                        │
│  ├─ Element 接口 (元素节点)                         │
│  ├─ Text 接口 (文本节点)                            │
│  └─ ... 其他节点类型                                │
├─────────────────────────────────────────────────────┤
│  HTML DOM (HTML 特定接口)                           │
│  ├─ HTMLElement                                     │
│  ├─ HTMLDivElement                                  │
│  ├─ HTMLInputElement                                │
│  └─ ... 其他 HTML 元素接口                          │
├─────────────────────────────────────────────────────┤
│  Events (事件模型)                                  │
│  ├─ Event 接口                                      │
│  ├─ EventTarget 接口                                │
│  └─ ... 其他事件类型                                │
└─────────────────────────────────────────────────────┘
```

### Node 接口在 DOM 体系中的位置

```
EventTarget (事件目标基类)
    │
    └── Node (节点基类 - 本文档重点)
            │
            ├── Document (文档节点)
            ├── Element (元素节点)
            │       │
            │       ├── HTMLElement
            │       │       ├── HTMLDivElement
            │       │       ├── HTMLSpanElement
            │       │       └── ...
            │       └── SVGElement
            ├── CharacterData (字符数据)
            │       ├── Text (文本节点)
            │       └── Comment (注释节点)
            ├── DocumentType (文档类型)
            ├── DocumentFragment (文档片段)
            └── Attr (属性节点 - 已废弃)
```

## 概述

DOM 是 JavaScript 操作网页的接口，将网页转为 JavaScript 对象，从而可以用脚本进行各种操作（比如增删内容）。

**核心特性：**

- **平台无关性**：DOM 只是接口规范，可以用各种语言实现（JavaScript、Python、Java 等）
- **树形结构**：将结构化文档解析成节点树（DOM Tree），所有节点和最终的树状结构都有规范的对外接口
- **实时性**：DOM 操作会立即反映到页面渲染中（除非显式延迟）
- **动态性**：可以在运行时动态修改文档结构、样式和内容

DOM 的最小组成单位是**节点（node）**，文档的树形结构由各种类型的节点组成。节点的类型主要有七种：

- **Document**：整个文档树的顶层节点
- **DocumentType**：`<!DOCTYPE html>` 等文档类型声明
- **Element**：网页的各种 HTML 标签（如 `<body>`、`<a>`）
- **Attr**：网页元素的属性（如 `class="right"`，现已废弃）
- **Text**：标签之间或标签包含的文本
- **Comment**：注释
- **DocumentFragment**：文档的片段

这七种节点都继承自原生的节点对象 `Node`，因此具有一些共同的属性和方法（详见下文 `nodeType` 的完整节点类型对照表）。

### 节点类型判断示例

```
// 检查节点类型
const element = document.querySelector('div')
console.log(element.nodeType)  // 1 (ELEMENT_NODE)
console.log(element.nodeName)  // "DIV"

// 使用常量判断（推荐）
if (element.nodeType === Node.ELEMENT_NODE) {
  console.log('这是一个元素节点')
}

// 检查文本节点
const textNode = document.querySelector('p').firstChild
if (textNode.nodeType === Node.TEXT_NODE) {
  console.log('这是一个文本节点:', textNode.textContent)
}
```

### 节点树结构

文档的所有节点，按照所在的层级，可以抽象成一种树状结构。这种树状结构就是 DOM 树。它有一个顶层节点，下一层都是顶层节点的子节点，然后子节点又有自己的子节点。

#### DOM 树结构示意图

```
document (Document 节点, nodeType=9)
    │
    ├── DocumentType 节点 (nodeType=10)
    │   └── <!DOCTYPE html>
    │
    └── html (Element 节点, nodeType=1) [根元素]
            │
            ├── head (Element 节点)
            │   ├── meta
            │   ├── title
            │   │   └── Text 节点: "页面标题"
            │   └── ...
            │
            └── body (Element 节点)
                ├── div
                │   ├── Text 节点: "Hello "
                │   ├── span
                │   │   └── Text 节点: "World"
                │   └── Comment 节点: "<!-- 注释内容 -->"
                └── ...
```

#### 核心概念

- **根节点（Root Node）**：`document` 节点代表整个文档，是 DOM 树的顶层节点
- **文档结构**：文档的第一层有两个节点
  - 第一个是文档类型节点 `<!DOCTYPE html>`
  - 第二个是 HTML 根元素节点 `<html>`，其他 HTML 标签节点都是它的下级节点

#### 节点层级关系

除了根节点，其他节点都有三种层级关系：

| **关系类型**     | **属性**          | **说明**                           |
| ---------------- | ----------------- | ---------------------------------- |
| 父节点关系       | `parentNode`      | 直接的上级节点                     |
| 子节点关系       | `childNodes`      | 直接的下级节点集合                 |
| 同级节点关系     | `nextSibling` / `previousSibling` | 拥有同一个父节点的节点             |

DOM 提供操作接口，用来获取这三种关系的节点：

- **子节点接口**：`firstChild`、`lastChild`、`childNodes`
- **父节点接口**：`parentNode`、`parentElement`
- **同级节点接口**：`nextSibling`（紧邻在后的同级节点）、`previousSibling`（紧邻在前的同级节点）

```javascript
// 节点关系遍历示例
const body = document.body

console.log(body.parentNode)           // <html> 元素
console.log(body.firstChild)           // body 的第一个子节点
console.log(body.lastChild)            // body 的最后一个子节点
console.log(body.nextSibling)          // body 后面的同级节点（通常为 null）
console.log(body.previousSibling)      // body 前面的同级节点（通常是 head）
```

## Node 接口属性

所有 DOM 节点对象都继承了 Node 接口，拥有一些共同的属性和方法。所有的属性都定义在 `Node.prototype` 上。

### nodeType - 节点类型

`nodeType` 返回一个整数值，表示节点的类型。

#### 完整的节点类型对照表

| **节点类型**                     | **nodeType** | **对应常量**                | **说明**                           |
| -------------------------------- | ------------ | --------------------------- | ---------------------------------- |
| 元素节点（Element）              | 1            | Node.ELEMENT_NODE           | HTML 或 XML 元素                   |
| 属性节点（Attr）                 | 2            | Node.ATTRIBUTE_NODE         | 元素属性（已废弃）                 |
| 文本节点（Text）                 | 3            | Node.TEXT_NODE              | 元素或属性中的文本内容             |
| CDATA 节点                       | 4            | Node.CDATA_SECTION_NODE     | CDATA 区块（XML）                  |
| 实体引用节点                     | 5            | Node.ENTITY_REFERENCE_NODE  | 实体引用（已废弃）                 |
| 实体节点                         | 6            | Node.ENTITY_NODE            | 实体（已废弃）                     |
| 处理指令节点                     | 7            | Node.PROCESSING_INSTRUCTION_NODE | 处理指令（XML）               |
| 注释节点（Comment）              | 8            | Node.COMMENT_NODE           | 注释                               |
| 文档节点（Document）             | 9            | Node.DOCUMENT_NODE          | 整个文档                           |
| 文档类型节点（DocumentType）     | 10           | Node.DOCUMENT_TYPE_NODE     | DTD 声明                           |
| 文档片断节点（DocumentFragment） | 11           | Node.DOCUMENT_FRAGMENT_NODE | 文档片段                           |
| 符号节点                         | 12           | Node.NOTATION_NODE          | DTD 符号（已废弃）                 |

#### 使用示例

```javascript
// 基本用法
document.nodeType // 9

// 使用常量判断（推荐方式）
document.nodeType === Node.DOCUMENT_NODE // true

// 实际应用：遍历并过滤特定类型的节点
function getElementsOnly(parent) {
  const elements = []
  for (let child of parent.childNodes) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      elements.push(child)
    }
  }
  return elements
}

// 判断节点类型
const node = document.documentElement.firstChild
if (node.nodeType === Node.ELEMENT_NODE) {
  console.log("该节点是元素节点")
} else if (node.nodeType === Node.TEXT_NODE) {
  console.log("该节点是文本节点:", node.textContent.trim())
}
```

### nodeName - 节点名称

`nodeName` 返回一个字符串，表示节点的名称。不同类型的节点返回不同的值。

#### nodeName 返回值对照表

| **节点类型**                     | **nodeName**           | **示例**                    |
| -------------------------------- | ---------------------- | --------------------------- |
| 文档节点（Document）             | `#document`            | `document.nodeName`         |
| 元素节点（Element）              | 大写的标签名           | `"DIV"`, `"SPAN"`, `"P"`    |
| 属性节点（Attr）                 | 属性的名称             | `"class"`, `"id"`           |
| 文本节点（Text）                 | `#text`                | `textNode.nodeName`         |
| 文档片断节点（DocumentFragment） | `#document-fragment`   | `fragment.nodeName`         |
| 文档类型节点（DocumentType）     | 文档的类型             | `"html"`                    |
| 注释节点（Comment）              | `#comment`             | `comment.nodeName`          |

#### 使用示例

```javascript
// 元素节点
const div = document.getElementById("d1")
console.log(div.nodeName) // "DIV" (注意：始终是大写)

// 文本节点
const textNode = div.firstChild
console.log(textNode.nodeName) // "#text"

// 判断特定标签
if (element.nodeName.toLowerCase() === 'div') {
  console.log('这是一个 div 元素')
}
```

> ⚠️ **注意事项**： - 对于元素节点，`nodeName` 返回的标签名始终是大写的，即使 HTML 中使用小写
> - 判断标签类型时，建议使用 `nodeName.toLowerCase()` 进行比较
### nodeValue - 节点文本值

`nodeValue` 返回一个字符串，表示当前节点本身的文本值，该属性可读写。

#### 适用范围

只有以下三种节点类型有文本值，可以设置和返回 `nodeValue`：

| **节点类型**   | **nodeValue**     | **说明**                           |
| -------------- | ----------------- | ---------------------------------- |
| 文本节点       | 文本内容          | 可读写                             |
| 注释节点       | 注释内容          | 可读写                             |
| 属性节点       | 属性值            | 可读写（已废弃）                   |
| 其他节点       | `null`            | 设置无效                           |

#### 使用示例

```javascript
// 元素节点的 nodeValue 为 null
const div = document.getElementById("d1")
console.log(div.nodeValue) // null

// 获取文本节点的值
const textNode = div.firstChild
console.log(textNode.nodeValue) // "hello world"

// 设置文本节点的值
textNode.nodeValue = "new text content"

// 实际应用：修改注释内容
const comments = document.childNodes
for (let node of comments) {
  if (node.nodeType === Node.COMMENT_NODE) {
    console.log('原注释:', node.nodeValue)
    node.nodeValue = '修改后的注释'
  }
}
```

### textContent - 当前节点与所有后代节点的文本内容

`textContent` 属性返回当前节点及其所有后代节点的文本内容，自动忽略 HTML 标签。

#### textContent 与其他属性对比

| **属性**       | **返回内容**                          | **性能** | **是否触发回流** |
| -------------- | ------------------------------------- | -------- | ---------------- |
| `textContent`  | 所有文本内容（忽略标签）              | 高       | 否               |
| `innerText`    | 渲染后的文本（考虑 CSS 样式）         | 低       | 是               |
| `innerHTML`    | 包含 HTML 标签的完整内容              | 中       | 是               |

#### 使用示例

```javascript
// 获取文本内容
// HTML: <div id="divA">This is <span>some</span> text</div>
const divA = document.getElementById("divA")
console.log(divA.textContent) // "This is some text"

// 设置文本内容（自动转义 HTML）
document.getElementById("foo").textContent = "<p>GoodBye!</p>"
// 页面显示: &lt;p&gt;GoodBye!&lt;/p&gt;（转义后的文本）

// 实际应用：安全地显示用户输入
function safeDisplay(userInput) {
  const display = document.getElementById('display')
  display.textContent = userInput // 自动转义，防止 XSS
}
```

> ℹ️ **最佳实践**： - 需要设置纯文本时，优先使用 `textContent`，性能更好且自动转义 HTML
> - 需要获取可见文本时，使用 `innerText`（但会触发回流）
> - 需要获取/设置 HTML 内容时，使用 `innerHTML`（注意 XSS 风险）
### baseURI - 当前网页的绝对路径

`baseURI` 属性返回一个字符串，表示当前网页的绝对路径。浏览器根据这个属性计算网页上的相对路径 URL。

#### 属性特性

- **只读属性**：无法直接修改
- **默认值**：当前页面的 URL（即 `window.location.href`）
- **可通过 `<base>` 标签修改**

#### 使用示例

```javascript
// 当前网页：http://www.example.com/index.html
console.log(document.baseURI) // "http://www.example.com/index.html"

// 通过 <base> 标签修改
// HTML: <base href="http://www.example.com/page.html">
console.log(document.baseURI) // "http://www.example.com/page.html"

// 实际应用：解析相对路径
const link = document.createElement('a')
link.href = '../images/logo.png'
console.log(link.href) // 完整的绝对路径
```

> ⚠️ **注意事项**： - 如果页面中有 `<base>` 标签，`baseURI` 返回 `<base>` 标签的 `href` 值
> - 如果无法读取网页 URL，`baseURI` 返回 `null`
### ownerDocument - 返回当前节点所在的顶层文档对象

`ownerDocument` 返回当前节点所在的顶层文档对象（即 `document` 对象）。

#### 属性特性

- 返回节点所属的 `document` 对象
- `document` 节点本身的 `ownerDocument` 返回 `null`
- 跨文档操作时非常有用

#### 使用示例

```javascript
// 获取节点所属的文档
const p = document.querySelector('p')
const d = p.ownerDocument
console.log(d === document) // true

// 实际应用：在 iframe 中操作
const iframe = document.querySelector('iframe')
const iframeDoc = iframe.contentDocument
const iframeElement = iframeDoc.querySelector('div')
console.log(iframeElement.ownerDocument === iframeDoc) // true

// 实际应用：创建节点时指定文档
function createNodeInDocument(doc, tagName) {
  return doc.createElement(tagName)
}

const newDiv = createNodeInDocument(document, 'div')
```

### nextSibling - 当前节点后一个同级节点

`nextSibling` 属性返回紧跟在当前节点后面的第一个同级节点。如果当前节点后面没有同级节点，则返回 `null`。

#### 属性特性

- 返回的是所有类型的同级节点（包括文本节点、注释节点）
- 如果节点后面有空格或换行，会返回文本节点

#### 使用示例

```javascript
// HTML:
// <div id="d1">hello</div>
// <div id="d2">world</div>
const d1 = document.getElementById("d1")
const d2 = document.getElementById("d2")

// 注意：如果两个 div 之间有空格，d1.nextSibling 是文本节点
console.log(d1.nextSibling === d2) // 可能为 false（中间有文本节点）

// 遍历所有子节点
let el = document.getElementById("div1").firstChild
while (el !== null) {
  console.log(el.nodeName, el.nodeType)
  el = el.nextSibling
}

// 只遍历元素节点
function getNextElement(node) {
  let current = node
  while (current) {
    current = current.nextSibling
    if (current && current.nodeType === Node.ELEMENT_NODE) {
      return current
    }
  }
  return null
}
```

#### nextSibling vs nextElementSibling

```javascript
// HTML:
// <div id="test">
//   <span>1</span>
//   <span>2</span>
// </div>

const span1 = document.querySelector('#test span')
console.log(span1.nextSibling.nodeType)        // 3 (文本节点)
console.log(span1.nextElementSibling.nodeName) // "SPAN"
```

### previousSibling - 当前节点前一个同级节点

`previousSibling` 属性返回当前节点前面距离最近的一个同级节点。如果当前节点前面没有同级节点，则返回 `null`。

#### 使用示例

```javascript
// HTML:
// <div id="d1">hello</div>
// <div id="d2">world</div>

const d1 = document.getElementById("d1")
const d2 = document.getElementById("d2")

console.log(d2.previousSibling === d1) // 可能为 false（中间有文本节点）

// 向前遍历所有节点
function findPreviousElement(node) {
  let current = node
  while (current) {
    current = current.previousSibling
    if (current && current.nodeType === Node.ELEMENT_NODE) {
      return current
    }
  }
  return null
}
```

### parentNode - 当前节点的父节点

`parentNode` 属性返回当前节点的父节点。

#### 父节点的可能类型

对于普通节点，父节点只可能是三种类型：
1. 元素节点（Element）
2. 文档节点（Document）
3. 文档片段节点（DocumentFragment）

#### 特殊情况

| **节点类型**         | **parentNode** |
| -------------------- | -------------- |
| document 节点        | `null`         |
| DocumentFragment     | `null`         |
| 未插入 DOM 树的节点  | `null`         |

#### 使用示例

```javascript
// 安全移除节点
if (node.parentNode) {
  node.parentNode.removeChild(node)
}

// 向上遍历到根节点
function getAncestors(node) {
  const ancestors = []
  let current = node
  while (current.parentNode) {
    ancestors.push(current.parentNode)
    current = current.parentNode
  }
  return ancestors
}

// 检查节点是否在 DOM 树中
function isInDOM(node) {
  return node.parentNode !== null
}
```

### parentElement - 当前节点的父元素节点

`parentElement` 属性返回当前节点的父元素节点。如果当前节点没有父节点，或者父节点类型不是元素节点，则返回 `null`。

#### parentNode vs parentElement

| **场景**             | **parentNode**   | **parentElement** |
| -------------------- | ---------------- | ----------------- |
| 普通元素             | 父元素           | 父元素            |
| 文档节点             | `null`           | `null`            |
| html 元素            | document         | `null`            |
| DocumentFragment 子节点 | DocumentFragment | `null`          |

#### 使用示例

```javascript
// 安全地操作父元素样式
if (node.parentElement) {
  node.parentElement.style.color = "red"
}

// 向上查找特定父元素
function findAncestor(element, selector) {
  let current = element.parentElement
  while (current) {
    if (current.matches(selector)) {
      return current
    }
    current = current.parentElement
  }
  return null
}

// 示例：查找最近的 .container
const container = findAncestor(button, '.container')
```

> ℹ️ **最佳实践**： - 需要操作父元素样式或属性时，优先使用 `parentElement`
> - 需要包含文档节点时，使用 `parentNode`
### firstChild 与 lastChild - 子节点访问

#### firstChild - 第一个子节点

`firstChild` 属性返回当前节点的第一个子节点。如果当前节点没有子节点，则返回 `null`。

#### lastChild - 最后一个子节点

`lastChild` 属性返回当前节点的最后一个子节点。如果当前节点没有子节点，则返回 `null`。

#### 属性特性

- 返回所有类型的子节点（包括文本节点、注释节点）
- 只读属性

#### 使用示例

```javascript
// 紧凑的 HTML（无空白）
// <p id="p1"><span>First span</span></p>
const p1 = document.getElementById("p1")
console.log(p1.firstChild.nodeName) // "SPAN"

// 带换行的 HTML
// <p id="p2">
//   <span>First span</span>
// </p>
const p2 = document.getElementById("p2")
console.log(p2.firstChild.nodeName) // "#text"（换行符和空格）

// 获取第一个元素子节点
function getFirstElementChild(parent) {
  let child = parent.firstChild
  while (child) {
    if (child.nodeType === Node.ELEMENT_NODE) {
      return child
    }
    child = child.nextSibling
  }
  return null
}
```

#### firstChild vs firstElementChild

```javascript
const parent = document.getElementById('parent')

// Node 接口（包含所有节点类型）
console.log(parent.firstChild)          // 可能是文本节点

// Element 接口（仅元素节点）
console.log(parent.firstElementChild)   // 第一个子元素
```

> ⚠️ **常见陷阱**： - `firstChild` / `lastChild` 包含文本节点（空白字符、换行符）
> - 如果需要只访问元素节点，使用 `firstElementChild` / `lastElementChild`（Element 接口）
### childNodes - 当前节点的所有子节点

`childNodes` 属性返回一个类似数组的对象（NodeList 集合），成员包括当前节点的所有子节点。

#### NodeList 特性

| **特性**         | **说明**                                     |
| ---------------- | -------------------------------------------- |
| 类型             | NodeList 对象                                |
| 动态性           | 动态集合，会随 DOM 变化实时更新              |
| 包含内容         | 所有类型的子节点（元素、文本、注释等）       |
| 遍历方式         | `for` 循环、`for...of`、`forEach`            |

#### 使用示例

```javascript
// 获取所有子节点
const children = document.querySelector("ul").childNodes
console.log(children.length) // 子节点数量

// 遍历所有子节点
const div = document.getElementById("div1")
for (let i = 0; i < div.childNodes.length; i++) {
  console.log(div.childNodes[i].nodeName)
}

// 使用 for...of
for (let child of div.childNodes) {
  console.log(child.nodeType, child.nodeName)
}

// 使用 forEach（NodeList 支持 forEach）
div.childNodes.forEach(child => {
  console.log(child.nodeName)
})

// 过滤出元素节点
const elements = Array.from(div.childNodes).filter(
  node => node.nodeType === Node.ELEMENT_NODE
)
```

#### document 的子节点

```javascript
const children = document.childNodes
console.log(children.length) // 2

for (let child of children) {
  console.log(child.nodeType, child.nodeName)
}
// 10 "html" (DocumentType)
// 1 "HTML" (Element)
```

> ⚠️ **重要提示**： - `childNodes` 包含所有类型的子节点（元素、文本、注释）
> - 如果当前节点没有任何子节点，返回空的 NodeList（不是 `null`）
> - NodeList 是动态集合，DOM 变化会立即反映在返回结果中
### isConnected - 当前节点是否在文档之中

`isConnected` 属性返回一个布尔值，表示当前节点是否在文档之中（是否已连接到 DOM 树）。

#### 使用示例

```javascript
// 创建新节点（未连接）
const test = document.createElement("p")
console.log(test.isConnected) // false

// 添加到文档
document.body.appendChild(test)
console.log(test.isConnected) // true

// 从文档移除
test.remove()
console.log(test.isConnected) // false
```

#### 实际应用场景

```javascript
// 1. 检查节点是否在 DOM 中
function ensureInDOM(node) {
  if (!node.isConnected) {
    throw new Error('节点不在文档中')
  }
}

// 2. 条件性渲染：仅在节点连接时执行更新
class Component {
  constructor() {
    this.element = document.createElement('div')
  }

  update() {
    if (!this.element.isConnected) return
    // ... 执行 DOM 更新
    this.element.textContent = '已更新'
  }

  connectedCallback() {
    this.update()
  }

  disconnectedCallback() {
    console.log('元素已从 DOM 移除')
  }
}
```

> ℹ️ **最佳实践**： - 在操作节点前检查 `isConnected`，避免操作未连接的节点
> - 用于检测自定义元素的生命周期状态
> - 在组件库中用于条件性更新优化
## Node 接口方法

### appendChild - 添加到最后/移动节点

`appendChild()` 方法接受一个节点对象作为参数，将其作为最后一个子节点，插入当前节点。该方法的返回值就是插入文档的子节点。

#### 方法签名

```javascript
const returnedNode = parentNode.appendChild(childNode)
```

#### 使用示例

```javascript
// 创建并添加新节点
const p = document.createElement("p")
p.textContent = "新段落"
document.body.appendChild(p)

// 移动已存在的节点
const div = document.getElementById("myDiv")
document.body.appendChild(div) // div 从原位置移动到 body 尾部
```

#### 特殊行为

| **情况**                 | **行为**                                     |
| ------------------------ | -------------------------------------------- |
| 插入新节点               | 添加到子节点列表末尾                         |
| 插入已存在的节点         | 从原位置移除，添加到新位置                   |
| 插入 DocumentFragment    | 插入其所有子节点，返回空的 DocumentFragment  |

#### 实际应用

```javascript
// 批量添加节点
const fragment = document.createDocumentFragment()
for (let i = 0; i < 100; i++) {
  const li = document.createElement('li')
  li.textContent = `Item ${i}`
  fragment.appendChild(li)
}
document.querySelector('ul').appendChild(fragment)
```

> ⚠️ **注意事项**： - 如果参数节点已经在文档中，会从原位置移除
> - 返回值与参数是同一个节点的引用
### hasChildNodes - 当前节点是否有子节点

`hasChildNodes()` 返回一个布尔值，表示当前节点是否有子节点。

#### 使用示例

```javascript
const foo = document.getElementById("foo")

if (foo.hasChildNodes()) {
  foo.removeChild(foo.childNodes[0])
}
```

#### 判断子节点的多种方法

```javascript
// 方法1：使用 hasChildNodes()
if (node.hasChildNodes()) { /* ... */ }

// 方法2：检查 firstChild
if (node.firstChild !== null) { /* ... */ }

// 方法3：检查 childNodes.length
if (node.childNodes.length > 0) { /* ... */ }
```

#### 遍历所有后代节点

```javascript
function DOMComb(parent, callback) {
  if (parent.hasChildNodes()) {
    for (var node = parent.firstChild; node; node = node.nextSibling) {
      DOMComb(node, callback)
    }
  }
  callback(parent)
}

// 用法
DOMComb(document.body, console.log)
```

### cloneNode - 克隆节点

`cloneNode()` 用于克隆一个节点。它接受一个布尔值作为参数，表示是否同时克隆子节点。

#### 方法签名

```javascript
const clonedNode = node.cloneNode(deep)
```

#### 参数说明

| **参数** | **类型**    | **说明**                     |
| -------- | ----------- | ---------------------------- |
| `deep`   | `boolean`   | `true`：深克隆（包含子节点） |
|          |             | `false`：浅克隆（仅节点本身）|

#### 使用示例

```javascript
// 浅克隆（仅克隆节点本身）
const div = document.getElementById('myDiv')
const shallowClone = div.cloneNode() // 不包含子节点

// 深克隆（包含所有子节点）
const deepClone = div.cloneNode(true) // 包含所有子节点

// 实际应用：复制列表
const originalUL = document.querySelector("ul")
const cloneUL = originalUL.cloneNode(true)
document.body.appendChild(cloneUL)
```

#### 克隆注意事项

> ⚠️ **重要注意事项**： - **不会克隆事件监听器**：`addEventListener` 添加的事件不会被复制
> - **不会克隆 `on-` 属性**：如 `node.onclick = fn` 不会被复制
> - **克隆的节点不在文档中**：必须手动添加到 DOM
> - **ID 属性冲突**：克隆后可能出现相同 ID，需要修改
> - **`name` 属性**：如果原节点有 `name` 属性，可能也需要修改
#### 实际应用示例

```javascript
// 模板克隆
function cloneTemplate(templateId) {
  const template = document.getElementById(templateId)
  const clone = template.content.cloneNode(true)
  return clone
}

// 使用模板
const card = cloneTemplate('card-template')
document.body.appendChild(card)
```

### insertBefore - 插入到指定位置

`insertBefore()` 用于将某个节点插入父节点内部的指定位置。

#### 方法签名

```javascript
const insertedNode = parentNode.insertBefore(newNode, referenceNode)
```

#### 参数说明

| **参数**         | **类型** | **说明**                           |
| ---------------- | -------- | ---------------------------------- |
| `newNode`        | Node     | 要插入的新节点                     |
| `referenceNode`  | Node     | 参考节点，新节点将插入到此节点之前 |
|                  |          | 如果为 `null`，则插入到末尾        |

#### 使用示例

```javascript
// 插入到第一个子节点之前
const p = document.createElement("p")
p.textContent = "插入在开头"
document.body.insertBefore(p, document.body.firstChild)

// 插入到末尾（referenceNode 为 null）
const p2 = document.createElement("p")
p2.textContent = "插入在末尾"
document.body.insertBefore(p2, null)

// 插入到特定节点之前
const reference = document.getElementById('reference')
const newNode = document.createElement('div')
reference.parentNode.insertBefore(newNode, reference)
```

#### 模拟 insertAfter

```javascript
// 由于没有 insertAfter 方法，可以结合 nextSibling 实现
function insertAfter(parent, newNode, referenceNode) {
  parent.insertBefore(newNode, referenceNode.nextSibling)
}

// 使用示例
const reference = document.getElementById('reference')
const newNode = document.createElement('div')
insertAfter(reference.parentNode, newNode, reference)
```

> ⚠️ **注意事项**： - 如果 `newNode` 已经在文档中，会从原位置移除并插入新位置
> - 如果插入 `DocumentFragment`，则插入其所有子节点，返回空的 `DocumentFragment`
> - `referenceNode` 参数不能省略，必须显式传递 `null` 或节点引用
### removeChild - 移除子节点

`removeChild()` 用于从当前节点移除一个子节点。返回值是被移除的子节点。

#### 方法签名

```javascript
const removedNode = parentNode.removeChild(childNode)
```

#### 使用示例

```javascript
// 移除指定节点
const divA = document.getElementById("A")
divA.parentNode.removeChild(divA)

// 移除所有子节点
const element = document.getElementById("top")
while (element.firstChild) {
  element.removeChild(element.firstChild)
}

// 移除并保留引用
const removed = element.removeChild(element.firstChild)
console.log(removed.textContent) // 仍然可以访问
```

> ⚠️ **重要提示**： - 被移除的节点仍然存在于内存中，可以继续使用
> - 如果需要彻底移除，可以将其引用设为 `null`
> - 如果参数节点不是当前节点的子节点，会抛出错误
#### 安全移除模式

```javascript
// 安全移除（检查父节点是否存在）
function safeRemove(node) {
  if (node && node.parentNode) {
    return node.parentNode.removeChild(node)
  }
  return null
}

// 批量移除
function removeAllChildren(parent) {
  while (parent.firstChild) {
    parent.removeChild(parent.firstChild)
  }
}

// 现代 API：使用 remove()
// 注意：remove() 是 Element 接口的方法，不是 Node 的
element.remove() // 直接移除节点，无需父节点引用
```

### replaceChild - 替换子节点

`replaceChild()` 用于将一个新的节点替换当前节点的某一个子节点。

#### 方法签名

```javascript
const replacedNode = parentNode.replaceChild(newChild, oldChild)
```

#### 参数说明

| **参数**   | **类型** | **说明**               |
| ---------- | -------- | ---------------------- |
| `newChild` | Node     | 用来替换的新节点       |
| `oldChild` | Node     | 将被替换的子节点       |

#### 使用示例

```javascript
// 替换节点
const divA = document.getElementById("divA")
const newSpan = document.createElement("span")
newSpan.textContent = "Hello World!"
divA.parentNode.replaceChild(newSpan, divA)

// 用文本节点替换元素
const oldElement = document.querySelector('.old')
const newText = document.createTextNode('纯文本内容')
oldElement.parentNode.replaceChild(newText, oldElement)
```

### contains - 包含关系判断

`contains()` 方法返回一个布尔值，表示参数节点是否满足以下三个条件之一：

1. 参数节点为当前节点本身
2. 参数节点为当前节点的子节点
3. 参数节点为当前节点的后代节点

#### 使用示例

```javascript
// 检查包含关系
console.log(document.body.contains(node)) // true/false

// 注意：节点包含自身
console.log(nodeA.contains(nodeA)) // true

// 实际应用：检查点击是否在元素外
document.addEventListener('click', (e) => {
  const dropdown = document.querySelector('.dropdown')
  if (!dropdown.contains(e.target)) {
    dropdown.classList.remove('open')
  }
})
```

### compareDocumentPosition - 比较节点位置关系

`compareDocumentPosition()` 返回一个六个比特位的二进制值，表示参数节点与当前节点的关系。

#### 返回值含义

| **二进制值** | **十进制值** | **常量**                              | **含义**                             |
| ------------ | ------------ | ------------------------------------- | ------------------------------------ |
| 000000       | 0            | -                                     | 两个节点相同                         |
| 000001       | 1            | Node.DOCUMENT_POSITION_DISCONNECTED   | 不在同一个文档                       |
| 000010       | 2            | Node.DOCUMENT_POSITION_PRECEDING      | 参数节点在当前节点前面               |
| 000100       | 4            | Node.DOCUMENT_POSITION_FOLLOWING      | 参数节点在当前节点后面               |
| 001000       | 8            | Node.DOCUMENT_POSITION_CONTAINS       | 参数节点包含当前节点                 |
| 010000       | 16           | Node.DOCUMENT_POSITION_CONTAINED_BY   | 当前节点包含参数节点                 |
| 100000       | 32           | Node.DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC | 浏览器内部使用             |

#### 使用示例

```javascript
// HTML:
// <div id="mydiv">
//   <form><input id="test" /></form>
// </div>

const div = document.getElementById("mydiv")
const input = document.getElementById("test")

console.log(div.compareDocumentPosition(input)) // 20
console.log(input.compareDocumentPosition(div))  // 10
```

**解释**：
- `div.compareDocumentPosition(input)` 返回 20
  - div 包含 input（二进制 010000 = 16）
  - input 在 div 后面（二进制 000100 = 4）
  - 16 + 4 = 20

#### 位运算检查

```javascript
// 使用位运算检查特定关系
const head = document.head
const body = document.body

if (head.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING) {
  console.log("文档结构正确：body 在 head 后面")
}

// 检查包含关系
function contains(parent, child) {
  return parent === child || 
         !!(parent.compareDocumentPosition(child) & Node.DOCUMENT_POSITION_CONTAINED_BY)
}
```

### isEqualNode 与 isSameNode - 节点比较

#### isEqualNode - 相等性判断

`isEqualNode()` 方法返回一个布尔值，检查两个节点是否"相等"。

**相等的定义**：类型相同、属性相同、子节点相同。

```javascript
const p1 = document.createElement("p")
const p2 = document.createElement("p")

console.log(p1.isEqualNode(p2)) // true（类型和属性都相同）

p1.className = 'test'
console.log(p1.isEqualNode(p2)) // false（属性不同）

// 深度比较
const div1 = document.createElement('div')
div1.innerHTML = '<span>test</span>'

const div2 = document.createElement('div')
div2.innerHTML = '<span>test</span>'

console.log(div1.isEqualNode(div2)) // true（内容和结构相同）
```

#### isSameNode - 同一性判断

`isSameNode()` 方法返回一个布尔值，表示两个节点是否为同一个节点（引用相同）。

```javascript
const p1 = document.createElement("p")
const p2 = document.createElement("p")

console.log(p1.isSameNode(p2)) // false（不同的节点对象）
console.log(p1.isSameNode(p1)) // true（同一个引用）

// 实际应用
const element = document.querySelector('.target')
const sameElement = document.querySelector('.target')

console.log(element.isSameNode(sameElement)) // true
```

> ℹ️ **区别总结**： - `isEqualNode`：比较内容和结构是否相同
> - `isSameNode`：比较是否是同一个对象引用（相当于 `===`）
### normalize - 清理文本节点

`normalize()` 方法用于清理当前节点内部的所有文本节点。它会：

1. 去除空的文本节点
2. 将毗邻的文本节点合并成一个

#### 使用示例

```javascript
const wrapper = document.createElement("div")

// 创建多个文本节点
wrapper.appendChild(document.createTextNode("Part 1 "))
wrapper.appendChild(document.createTextNode("Part 2 "))
wrapper.appendChild(document.createTextNode(""))

console.log(wrapper.childNodes.length) // 3（包含一个空文本节点）

// 规范化
wrapper.normalize()

console.log(wrapper.childNodes.length) // 1（合并后的文本节点）
console.log(wrapper.firstChild.textContent) // "Part 1 Part 2 "
```

#### 实际应用

```javascript
// 处理用户编辑后的文本节点
function cleanupTextNodes(element) {
  element.normalize()
  return element
}

// 示例：合并文本节点后处理
const content = document.querySelector('.content')
content.innerHTML = 'Hello <span>World</span>!'
content.normalize() // 合并文本节点
```

### getRootNode - 返回根节点

`getRootNode()` 方法返回当前节点所在文档的根节点。

#### 方法签名

```javascript
const root = node.getRootNode(options)
```

#### 使用示例

```javascript
// 在文档中
console.log(document.body.firstChild.getRootNode() === document) // true

// 与 ownerDocument 比较
console.log(document.body.firstChild.getRootNode() === 
            document.body.firstChild.ownerDocument) // true

// document 节点自身
console.log(document.getRootNode()) // document
console.log(document.ownerDocument) // null

// Shadow DOM 中
const shadowRoot = element.attachShadow({ mode: 'open' })
console.log(shadowRoot.firstChild.getRootNode()) // shadowRoot
```

#### options 参数

```javascript
// 获取文档根节点（跳过 Shadow DOM）
const root = node.getRootNode({ composed: true })
```

## 常见遍历与检查模式

### 深度优先遍历（DFS）

```javascript
// 递归方式
function traverseDFS(node, callback) {
  if (!node) return
  callback(node)
  for (let child = node.firstChild; child; child = child.nextSibling) {
    traverseDFS(child, callback)
  }
}

// 使用示例
traverseDFS(document.body, (node) => {
  if (node.nodeType === Node.ELEMENT_NODE) {
    console.log(`<${node.nodeName.toLowerCase()}>`)
  }
})

// 非递归方式（使用栈）
function traverseDFSIterative(root, callback) {
  const stack = [root]
  while (stack.length > 0) {
    const node = stack.pop()
    callback(node)
    // 反向添加子节点，保证处理顺序
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      stack.push(node.childNodes[i])
    }
  }
}
```

### 广度优先遍历（BFS）

```javascript
function traverseBFS(root, callback) {
  if (!root) return
  const queue = [root]
  while (queue.length > 0) {
    const node = queue.shift()
    callback(node)
    queue.push(...node.childNodes)
  }
}

// 使用示例
traverseBFS(document.body, (node) => {
  if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
    console.log("文本节点:", node.textContent.trim())
  }
})
```

### 节点匹配辅助函数

```javascript
// 判断是否为元素节点
function isElement(node, tagName) {
  return node?.nodeType === Node.ELEMENT_NODE && 
         (!tagName || node.nodeName.toLowerCase() === tagName)
}

// 获取下一个元素节点
function getNextElement(node) {
  let current = node
  while (current) {
    current = current.nextSibling
    if (isElement(current)) {
      return current
    }
  }
  return null
}

// 按标签名收集后代元素节点（DFS）
function getElementsByTag(node, tagName) {
  const results = []
  function traverse(child) {
    if (isElement(child, tagName)) {
      results.push(child)
    }
    for (let c = child.firstChild; c; c = c.nextSibling) {
      traverse(c)
    }
  }
  traverse(node)
  return results
}
```

## 性能与最佳实践

### DOM 操作性能优化

#### 1. 使用 DocumentFragment 批量操作

```javascript
// ❌ 不好：多次插入，触发多次回流
for (let i = 0; i < 100; i++) {
  const li = document.createElement('li')
  li.textContent = `Item ${i}`
  ul.appendChild(li) // 每次都触发回流
}

// ✅ 好：使用 DocumentFragment 批量插入
const fragment = document.createDocumentFragment()
for (let i = 0; i < 100; i++) {
  const li = document.createElement('li')
  li.textContent = `Item ${i}`
  fragment.appendChild(li)
}
ul.appendChild(fragment) // 只触发一次回流
```

#### 2. 缓存节点引用

```javascript
// ❌ 不好：重复查询
for (let i = 0; i < 100; i++) {
  document.querySelector('.container').appendChild(items[i])
}

// ✅ 好：缓存引用
const container = document.querySelector('.container')
for (let i = 0; i < 100; i++) {
  container.appendChild(items[i])
}
```

#### 3. 批量样式修改

```javascript
// ❌ 不好：多次样式修改
element.style.width = '100px'
element.style.height = '100px'
element.style.backgroundColor = 'red'

// ✅ 好：一次性修改
element.style.cssText = 'width: 100px; height: 100px; background-color: red;'

// 或使用 class
element.className = 'active'
```

#### 4. 离线 DOM 操作

```javascript
// 复杂操作前先移除节点
const parent = element.parentNode
const nextSibling = element.nextSibling
parent.removeChild(element)

// 进行大量操作
// ...

// 操作完成后重新插入
parent.insertBefore(element, nextSibling)
```

### 现代 API 替代方案

| **传统方法**            | **现代替代方法**          | **优势**                     |
| ----------------------- | ------------------------- | ---------------------------- |
| `appendChild()`         | `append()`                | 支持多个参数、字符串自动转文本|
| `insertBefore()`        | `prepend()`, `before()`   | 更直观的 API                 |
| `removeChild()`         | `remove()`                | 无需父节点引用               |
| `replaceChild()`        | `replaceWith()`           | 更简洁的语法                 |
| `cloneNode()`           | `cloneNode()`             | 保持不变                     |

```javascript
// 传统方式
parent.appendChild(child)
parent.insertBefore(newNode, referenceNode)
parent.removeChild(child)

// 现代方式（Element 接口）
parent.append(child1, child2, '文本')
parent.prepend(newNode)
parent.before(siblingNode)
child.remove()
child.replaceWith(newChild)
```

### 事件委托优化

```javascript
// ❌ 不好：为每个子节点添加事件
document.querySelectorAll('.item').forEach(item => {
  item.addEventListener('click', handleClick)
})

// ✅ 好：使用事件委托
document.querySelector('.container').addEventListener('click', (e) => {
  if (e.target.matches('.item')) {
    handleClick(e)
  }
})
```

## 调试技巧

### 浏览器开发者工具

1. **Elements/Inspector 面板**：实时观察 DOM 变化
2. **控制台快捷方式**：
   - `$0`：当前选中的节点
   - `$1`：上一个选中的节点
   - `$$('selector')`：等同于 `document.querySelectorAll()`

### 控制台调试

```javascript
// 查看节点的所有属性
console.dir(element)

// 评估 DOM 操作耗时
console.time('DOM 操作')
// ... DOM 操作代码
console.timeEnd('DOM 操作')

// 监控 DOM 变化
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    console.log('DOM 变化:', mutation)
  })
})

observer.observe(element, {
  childList: true,
  attributes: true,
  subtree: true
})
```

### 常见问题排查

```javascript
// 检查节点是否在 DOM 中
function checkInDOM(node) {
  console.log('isConnected:', node.isConnected)
  console.log('parentNode:', node.parentNode)
  console.log('ownerDocument:', node.ownerDocument === document)
}

// 检查节点层级
function showNodePath(node) {
  const path = []
  let current = node
  while (current) {
    path.unshift(current.nodeName || '#document')
    current = current.parentNode
  }
  console.log(path.join(' > '))
}
```

## 常见问题解答（FAQ）

### Q1：`childNodes` 和 `children` 有什么区别？

**A**：
- `childNodes`：返回所有类型的子节点（NodeList），包括文本节点、注释节点
- `children`：仅返回元素子节点（HTMLCollection），不包括文本和注释

```javascript
const parent = document.getElementById('parent')
console.log(parent.childNodes.length)  // 包含文本节点
console.log(parent.children.length)    // 仅包含元素节点
```

### Q2：`textContent` 和 `innerText` 有什么区别？

**A**：

| **特性**         | `textContent`          | `innerText`             |
| ---------------- | ---------------------- | ----------------------- |
| 性能             | 高                     | 低                      |
| 是否触发回流     | 否                     | 是                      |
| CSS 样式影响     | 不考虑                 | 考虑（如 `display:none`）|
| 内容范围         | 所有文本内容           | 可见文本内容            |

**推荐**：大多数情况下使用 `textContent`，除非需要获取用户可见的文本。

### Q3：为什么 `firstChild` 返回的不是我期望的元素？

**A**：`firstChild` 返回所有类型的子节点，包括文本节点（空白字符、换行符）。

解决方案：
1. 使用 `firstElementChild` 获取第一个元素子节点
2. 或者遍历跳过文本节点

```javascript
// 方法1：使用 firstElementChild
const firstElement = parent.firstElementChild

// 方法2：跳过文本节点
let first = parent.firstChild
while (first && first.nodeType !== Node.ELEMENT_NODE) {
  first = first.nextSibling
}
```

### Q4：如何正确克隆一个节点及其事件监听器？

**A**：`cloneNode()` 不会克隆事件监听器。解决方案：

```javascript
// 方法1：重新绑定事件
const clone = original.cloneNode(true)
clone.addEventListener('click', handleClick)

// 方法2：使用事件委托
// 在父节点上监听事件，避免为每个节点单独绑定

// 方法3：使用自定义克隆函数
function cloneWithEvents(node) {
  const clone = node.cloneNode(true)
  // 手动复制需要的事件逻辑
  return clone
}
```

### Q5：`parentNode` 和 `parentElement` 应该用哪个？

**A**：

- 需要操作父元素的样式或属性时，使用 `parentElement`
- 需要判断节点是否在文档中时，使用 `parentNode`

```javascript
// 操作父元素样式
if (node.parentElement) {
  node.parentElement.style.color = 'red'
}

// 检查是否在文档中
if (node.parentNode) {
  // 在文档中或 DocumentFragment 中
}
```

### Q6：如何高效地清空一个元素的所有子节点？

**A**：多种方法对比：

```javascript
// 方法1：循环移除（兼容性好）
while (element.firstChild) {
  element.removeChild(element.firstChild)
}

// 方法2：设置 innerHTML（性能好）
element.innerHTML = ''

// 方法3：设置 textContent（性能最好）
element.textContent = ''

// 方法4：使用 replaceChildren()（现代方法）
element.replaceChildren()
```

### Q7：如何在节点插入后立即执行代码？

**A**：使用 `MutationObserver` 或自定义元素的生命周期：

```javascript
// 方法1：MutationObserver
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        console.log('节点被插入:', node)
      }
    })
  })
})

observer.observe(document.body, { childList: true, subtree: true })

// 方法2：自定义元素
class MyElement extends HTMLElement {
  connectedCallback() {
    console.log('元素已插入到 DOM')
  }
}

customElements.define('my-element', MyElement)
```

## 浏览器兼容性

### Node 接口核心特性

| **特性**           | **Chrome** | **Firefox** | **Safari** | **Edge** | **IE**    |
| ------------------ | ---------- | ----------- | ---------- | -------- | --------- |
| `nodeType`         | 1+         | 1+          | 1+         | 12+      | 6+        |
| `nodeName`         | 1+         | 1+          | 1+         | 12+      | 6+        |
| `textContent`      | 1+         | 1+          | 3+         | 12+      | 9+        |
| `isConnected`      | 51+        | 53+         | 10.1+      | 16+      | ❌        |
| `getRootNode()`    | 54+        | 53+         | 10.1+      | 17+      | ❌        |

### Polyfill 建议

```javascript
// isConnected polyfill
if (!Node.prototype.hasOwnProperty('isConnected')) {
  Object.defineProperty(Node.prototype, 'isConnected', {
    get() {
      return !this.ownerDocument || 
             !this.ownerDocument.contains(this.parentNode) === false
    }
  })
}
```

## 总结

Node 接口是 DOM 操作的基础，理解其属性和方法对于前端开发至关重要。关键要点：

1. **节点类型**：理解不同类型的节点及其特性
2. **节点关系**：掌握父、子、同级节点的导航方法
3. **性能优化**：使用 DocumentFragment、事件委托等技术
4. **现代 API**：了解传统方法的现代替代方案
5. **调试技巧**：善用浏览器开发者工具

通过合理使用 Node 接口，可以高效地进行 DOM 操作，构建高性能的 Web 应用。
