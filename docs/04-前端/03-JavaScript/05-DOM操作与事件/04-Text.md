---
title: Text
description: "文本节点 Text 代表元素节点 Element 和属性节点 Attribute 的文本内容。如果一个节点只包含一段文本，那么它就有一个文本子节点，代表该节点的文本内容。"
keywords: [Text]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---


# Text 节点

## 系统架构概览

Text 节点是 DOM 树中最基础的叶子节点类型，代表元素节点内的文本内容。每个 Text 节点都是一个独立的文本单元，包含了纯文本数据。

### Text 节点在 DOM 体系中的位置

```
EventTarget (事件目标基类)
    │
    └── Node (节点基类)
            │
            ├── CharacterData (字符数据抽象类)
            │       │
            │       ├── Text (文本节点 - 本文档重点)
            │       │       ├── Text (普通文本)
            │       │       └── CDATASection (XML CDATA 节点)
            │       └── Comment (注释节点)
            │
            ├── Element (元素节点)
            │       └── 可能包含 Text 子节点
            │
            └── ... 其他节点类型
```

### Text 节点的继承关系

```
Text 节点继承了以下接口：
├─ Node 接口
│  ├─ nodeType = 3 (TEXT_NODE)
│  ├─ nodeName = "#text"
│  └─ 基础节点操作方法
│
└─ CharacterData 接口
   ├─ data 属性 (文本内容)
   ├─ length 属性 (文本长度)
   └─ 文本操作方法 (appendData, deleteData 等)
```

## 概述

文本节点 `Text` 代表元素节点 `Element` 和属性节点 `Attribute` 的文本内容。如果一个节点只包含一段文本，那么它就有一个文本子节点，代表该节点的文本内容。

通常使用父节点的`firstChild`、`nextSibling`等属性获取文本节点，或者使用`Document`节点的`createTextNode`方法创造一个文本节点。

### 核心特性

- **节点类型固定**：Text 节点的 `nodeType` 恒为 `3`（`Node.TEXT_NODE`）
- **自动创建**：每个文本片段（包括空格和换行）都对应一个 Text 节点
- **接口继承**：实现了 `CharacterData` 接口，拥有文本操作方法
- **安全性**：`textContent` 和 `createTextNode` 会自动转义 HTML，防止 XSS 攻击
- **可合并性**：使用父节点的 `normalize()` 可合并相邻 Text 节点

### 快速示例

```javascript
// 方式一：获取已有的文本节点
const textNode = document.querySelector("p").firstChild

// 方式二：创建新的文本节点
const newText = document.createTextNode("Hello World")
document.querySelector("div").appendChild(newText)

// 方式三：使用构造函数（现代浏览器）
const textNode2 = new Text("Hello World")
```

## 创建与更新 Text 节点

### 创建方式对比

| **方式** | **语法** | **特点** | **适用场景** |
|----------|----------|----------|--------------|
| 构造函数 | `new Text("内容")` | ES6 标准，简洁 | 现代 Web 应用 |
| 工厂方法 | `document.createTextNode("内容")` | 兼容性好，历史悠久 | 所有浏览器环境 |
| 属性设置 | `element.textContent = "内容"` | 自动创建/替换节点 | 快速设置文本 |
| innerHTML | `element.innerHTML = "内容"` | 解析 HTML 标签 | 需要插入 HTML 时 |

### 安全性对比

```javascript
// 安全：自动转义 HTML，防止 XSS
element.textContent = '<script>alert("XSS")</script>'
// 结果：&lt;script&gt;alert("XSS")&lt;/script&gt;

// 危险：会把字符串解析为 HTML 并插入（仅用于可信内容）
// 注意：通过 innerHTML 插入的 <script> 标签本身不会执行，
// 但 <img onerror=…> 等其他载荷可以执行代码，仍属危险操作
element.innerHTML = '<script>alert("XSS")</script>'
```

### 更新文本内容

```javascript
// 方式一：修改 data 属性
textNode.data = "新内容"

// 方式二：修改 nodeValue 属性
textNode.nodeValue = "新内容"

// 方式三：使用 appendData 等方法
textNode.appendData("追加内容")
textNode.replaceData(0, 3, "替换")

// 方式四：使用父元素的 textContent
parentElement.textContent = "新内容" // 会替换所有子节点
```

## 属性

### 核心属性总览

| **属性** | **类型** | **可写** | **描述** |
|----------|----------|----------|----------|
| `nodeType` | Number | 否 | 值为 `3` (Node.TEXT_NODE) |
| `nodeName` | String | 否 | 值为 `"#text"` |
| `nodeValue` | String | 是 | 文本内容 |
| `data` | String | 是 | 文本内容（与 nodeValue 相同） |
| `length` | Number | 否 | 文本内容的字符长度 |
| `wholeText` | String | 否 | 返回相邻文本节点的合并文本 |
| `parentNode` | Element | 否 | 父节点（通常是元素节点） |
| `assignedSlot` | HTMLSlotElement | 否 | 分配的 slot 元素（Shadow DOM） |

### 节点类型判断

Text 节点继承自 `Node` 接口，可通过多种方式判断节点类型：

```javascript
// 方式一：使用 nodeType 常量（推荐）
if (node.nodeType === Node.TEXT_NODE) {
  console.log('这是文本节点')
}

// 方式二：使用 nodeType 数值
if (node.nodeType === 3) {
  console.log('这是文本节点')
}

// 方式三：使用 instanceof
if (node instanceof Text) {
  console.log('这是文本节点')
}

// 方式四：使用 nodeName
if (node.nodeName === '#text') {
  console.log('这是文本节点')
}
```

### 文本内容属性对比

| **属性** | **作用域** | **性能** | **安全性** | **适用场景** |
|----------|------------|----------|------------|--------------|
| `data` | 单个 Text 节点 | ⭐⭐⭐⭐⭐ | ✓ 安全 | 直接操作文本节点 |
| `nodeValue` | 单个 Text 节点 | ⭐⭐⭐⭐⭐ | ✓ 安全 | 与 data 等价 |
| `textContent` | 整个元素 | ⭐⭐⭐⭐ | ✓ 安全 | 快速获取/设置所有文本 |
| `innerText` | 整个元素 | ⭐⭐⭐ | ✓ 安全 | 获取用户可见文本 |
| `innerHTML` | 整个元素 | ⭐⭐⭐ | ⚠️ XSS风险 | 需要解析 HTML |

#### data 与 nodeValue

`data` 和 `nodeValue` 属性完全等价，都用于读写文本节点内容：

```javascript
const textNode = document.querySelector("p").firstChild

// 读取文本内容
console.log(textNode.data)       // "Hello World"
console.log(textNode.nodeValue)  // "Hello World"

// 设置文本内容
textNode.data = "新内容"
textNode.nodeValue = "新内容"    // 效果相同
```

#### textContent 与 innerText

```javascript
const element = document.querySelector("#content")
/*
<div id="content">
  Hello <span style="display:none">Hidden</span>
  <script>alert('XSS')</script>
</div>
*/

// textContent：返回所有文本（包括隐藏元素和脚本内容）
element.textContent  
// 返回: "\n  Hello Hidden\n  alert('XSS')\n"

// innerText：只返回可见文本（需要计算样式，性能较低）
element.innerText     
// 返回: "\n  Hello"（隐藏元素与脚本内容均不在渲染结果中，会被排除）

// 安全性对比
element.textContent = '<script>alert("XSS")</script>'
// 结果: 显示转义后的文本，不会执行脚本

element.innerHTML = '<script>alert("XSS")</script>'
// ⚠️ 危险: 会解析为 HTML 插入，<img onerror=…> 等载荷可执行代码
```

### wholeText 属性

`wholeText` 属性返回当前文本节点及其所有相邻文本节点的合并文本，不受注释节点影响。

#### 工作原理示意

```
<div>文本1<!-- 注释 -->文本2<span>文本3</span>文本4</div>

访问第一个文本节点的 wholeText:
返回: "文本1文本2" (合并相邻文本，不包括注释)

访问第三个文本节点:
返回: "文本4" (被元素节点分隔，不合并)
```

#### 示例代码

```javascript
// HTML: <div id="demo">Hello<!-- 注释 -->World</div>
const div = document.getElementById('demo')
const textNodes = Array.from(div.childNodes).filter(n => n.nodeType === Node.TEXT_NODE)

console.log(textNodes[0].data)       // "Hello"
console.log(textNodes[0].wholeText)  // "HelloWorld" (合并相邻文本)

console.log(textNodes[1].data)       // "World"
console.log(textNodes[1].wholeText)  // "HelloWorld" (与第一个节点相同)
```

### CharacterData 接口继承

Text 节点实现了 `CharacterData` 接口，该接口提供了文本操作的基础能力：

```
CharacterData 接口提供的能力：
├─ 属性
│  ├─ data: 文本内容
│  └─ length: 文本长度
│
└─ 方法
   ├─ appendData(text): 追加文本
   ├─ deleteData(offset, count): 删除文本
   ├─ insertData(offset, text): 插入文本
   └─ substringData(offset, count): 提取子串
   （remove() 等节点移除方法来自 ChildNode 混入，见下文）
```

其他实现 `CharacterData` 接口的节点：
- **Comment**（注释节点）
- **CDATASection**（XML CDATA 节点）

## 方法

### 方法总览

#### CharacterData 接口方法

| **方法** | **参数** | **返回值** | **描述** |
| --- | --- | --- | --- |
| `appendData(data)` | data: string | void | 在文本末尾追加数据 |
| `deleteData(offset, count)` | offset: number, count: number | void | 从 offset 开始删除 count 个字符 |
| `insertData(offset, data)` | offset: number, data: string | void | 在 offset 位置插入数据 |
| `replaceData(offset, count, data)` | offset, count: number, data: string | void | 用 data 替换从 offset 开始的 count 个字符 |
| `substringData(offset, count)` | offset, count: number | string | 提取从 offset 开始的 count 个字符 |
| `remove()` | - | void | 移除当前节点 |
| `replaceWith(...nodes)` | nodes: (Node\|String)[] | void | 替换当前节点 |

### 文本操作方法详解

#### appendData() - 追加文本

```
// HTML: <p>Hello</p>
const textNode = document.querySelector("p").firstChild

textNode.appendData(" World")
// 结果: "Hello World"
```

#### deleteData() - 删除文本

```javascript
// HTML: <p>Hello World</p>
const textNode = document.querySelector("p").firstChild

textNode.deleteData(5, 6)  // 从位置5开始删除6个字符
// 结果: "Hello"
```

#### insertData() - 插入文本

```javascript
// HTML: <p>HWorld</p>
const textNode = document.querySelector("p").firstChild

textNode.insertData(1, "ello ")  // 在位置1插入"ello "
// 结果: "Hello World"
```

#### replaceData() - 替换文本

```javascript
// HTML: <p>Hello World</p>
const textNode = document.querySelector("p").firstChild

textNode.replaceData(6, 5, "JavaScript")  // 从位置6开始，替换5个字符为"JavaScript"
// 结果: "Hello JavaScript"
```

#### substringData() - 提取子串

```javascript
// HTML: <p>Hello World</p>
const textNode = document.querySelector("p").firstChild

const substring = textNode.substringData(0, 5)
console.log(substring)  // "Hello"
// 注意：不会修改原文本
```

### splitText() - 分割文本节点

`splitText()` 是 Text 节点特有的方法，将一个文本节点分割成两个相邻的文本节点。

#### 分割原理

```
分割前:
<div>foobar</div>
  └─ Text节点: "foobar"

执行 textNode.splitText(3):

分割后:
<div>
  ├─ Text节点: "foo"
  └─ Text节点: "bar" ← splitText() 返回这个新节点
</div>
```

#### 示例代码

```javascript
// HTML: <p id="p">foobar</p>
const p = document.getElementById("p")
const textnode = p.firstChild

// 在位置3分割
const newText = textnode.splitText(3)

console.log(textnode.data)  // "foo"
console.log(newText.data)   // "bar"
console.log(p.childNodes.length)  // 2

// 使用 normalize() 合并
p.normalize()
console.log(p.childNodes.length)  // 1
console.log(p.firstChild.data)    // "foobar"
```

#### 实际应用场景

```javascript
// 场景：高亮部分文本
function highlightText(element, start, end, highlightClass) {
  const textNode = element.firstChild
  const length = end - start
  
  // 分割成三部分
  const middle = textNode.splitText(start)
  const endNode = middle.splitText(length)
  
  // 创建高亮 span
  const span = document.createElement('span')
  span.className = highlightClass
  span.textContent = middle.data
  
  // 替换中间节点
  element.replaceChild(span, middle)
}

// HTML: <p id="text">Hello World</p>
highlightText(document.getElementById('text'), 6, 11, 'highlight')
// 结果: <p>Hello <span class="highlight">World</span></p>
```

### ChildNode 接口方法

Text 节点作为叶子节点，可以使用 ChildNode 接口的方法来操作自身在父元素中的位置。

#### before() 与 after()

```javascript
// HTML: <p id="demo">World</p>
const textNode = document.querySelector("#demo").firstChild

textNode.before("Hello ")
// 结果: <p id="demo">Hello World</p>

textNode.after("!")
// 结果: <p id="demo">Hello World!</p>
```

#### replaceWith()

```javascript
// HTML: <p id="demo">Hello</p>
const textNode = document.querySelector("#demo").firstChild

textNode.replaceWith("Hi", document.createElement('br'), "World")
// 结果: <p id="demo">Hi<br>World</p>
```

#### remove()

```javascript
// HTML: <p id="demo">Hello</p>
const textNode = document.querySelector("#demo").firstChild

textNode.remove()
// 结果: <p id="demo"></p>
```

### 方法性能对比

```javascript
// 注：以下耗时数值仅为示意，实际性能因浏览器、设备与场景而异
const iterations = 10000
const textNode = document.createTextNode("")
const element = document.querySelector('div')

console.time('data 赋值')
for (let i = 0; i < iterations; i++) {
  textNode.data = "text " + i
}
console.timeEnd('data 赋值')  // ~5ms

console.time('textContent')
for (let i = 0; i < iterations; i++) {
  element.textContent = "text " + i
}
console.timeEnd('textContent')  // ~20ms

console.time('deleteData + insertData')
for (let i = 0; i < iterations; i++) {
  textNode.deleteData(0, textNode.length)
  textNode.insertData(0, "text " + i)
}
console.timeEnd('deleteData + insertData')  // ~15ms
```

## 常见场景与最佳实践

### 场景一：处理空白字符

HTML 中的缩进、换行会生成额外的 Text 节点，需要谨慎处理。

```javascript
// HTML:
// <div>
//   <span>文本</span>
// </div>

const div = document.querySelector('div')
console.log(div.childNodes.length)  // 3: 文本节点(换行)、span、文本节点(换行)

// 方式一：过滤空白文本节点
const nonEmptyTextNodes = Array.from(div.childNodes).filter(node => {
  return node.nodeType === Node.TEXT_NODE && node.data.trim() !== ''
})

// 方式二：遍历时跳过空白节点
function getTextContent(element) {
  let text = ''
  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.data
    }
  }
  return text.trim()
}

// 方式三：使用 CSS 避免空白节点（父元素设置）
// white-space: nowrap; 或使用紧凑的 HTML 格式
```

### 场景二：动态高亮文本

```javascript
/**
 * 高亮元素中的特定文本
 * @param {Element} element - 目标元素
 * @param {string} searchText - 要高亮的文本
 * @param {string} highlightClass - 高亮样式类名
 */
function highlightText(element, searchText, highlightClass = 'highlight') {
  if (!searchText) return

  // 使用 TreeWalker 遍历所有文本节点
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
  const nodes = []
  while (walker.nextNode()) {
    if (walker.currentNode.nodeValue.includes(searchText)) {
      nodes.push(walker.currentNode)
    }
  }

  // 用 <mark> 包裹匹配文本
  nodes.forEach((node) => {
    const index = node.nodeValue.indexOf(searchText)
    if (index === -1) return
    const range = document.createRange()
    range.setStart(node, index)
    range.setEnd(node, index + searchText.length)
    const mark = document.createElement('mark')
    mark.className = highlightClass
    range.surroundContents(mark)
  })
}

// 使用示例
highlightText(document.getElementById('content'), '关键词', 'highlight')
```

### 场景三：文本节点监听

```javascript
// 使用 MutationObserver 监听文本变化
const observer = new MutationObserver((mutations) => {
  mutations.forEach(mutation => {
    if (mutation.type === 'characterData') {
      console.log('文本变化:', {
        oldValue: mutation.oldValue,
        newValue: mutation.target.data
      })
    }
  })
})

const textNode = document.querySelector('#content').firstChild

observer.observe(textNode, {
  characterData: true,      // 监听文本内容变化
  characterDataOldValue: true  // 记录旧值
})

// 触发变化
textNode.data = "新文本内容"
```

### 场景四：性能优化

```javascript
// ❌ 错误：频繁创建文本节点
function badExample() {
  const container = document.getElementById('container')
  for (let i = 0; i < 1000; i++) {
    const text = document.createTextNode(i + ' ')
    container.appendChild(text)  // 每次 appendChild 都触发重排
  }
}

// ✅ 正确：使用 DocumentFragment 或 textContent
function goodExample1() {
  const fragment = document.createDocumentFragment()
  for (let i = 0; i < 1000; i++) {
    fragment.appendChild(document.createTextNode(i + ' '))
  }
  document.getElementById('container').appendChild(fragment)  // 只触发一次重排
}

function goodExample2() {
  let text = ''
  for (let i = 0; i < 1000; i++) {
    text += i + ' '
  }
  document.getElementById('container').textContent = text
}
```

### 场景五：安全插入用户内容

```javascript
// ✅ 安全：自动转义 HTML
function safeInsertUserContent(element, userContent) {
  // 方式一：使用 textContent
  element.textContent = userContent
  
  // 方式二：使用 createTextNode
  const textNode = document.createTextNode(userContent)
  element.appendChild(textNode)
  
  // 方式三：使用 Text 构造函数
  const textNode2 = new Text(userContent)
  element.appendChild(textNode2)
}

// ⚠️ 危险：可能执行恶意代码
function dangerousInsert(element, userContent) {
  element.innerHTML = userContent  // 永远不要对用户输入使用 innerHTML
}

// 使用示例
const userContent = '<script>alert("XSS")</script>'
safeInsertUserContent(document.getElementById('output'), userContent)
// 结果: 显示转义后的文本，不会执行脚本
```

### 性能对比表

| **操作方式** | **触发重排** | **触发重绘** | **性能评分** | **推荐场景** |
|--------------|--------------|--------------|--------------|--------------|
| `data` 属性修改 | ✗ | ✓ | ⭐⭐⭐⭐⭐ | 高频文本更新 |
| `textContent` 设置 | ✓ | ✓ | ⭐⭐⭐⭐ | 整体文本替换 |
| `innerText` 设置 | ✓ | ✓ | ⭐⭐⭐ | 需要计算可见性 |
| `splitText()` | ✓ | ✓ | ⭐⭐⭐ | 文本分割操作 |
| `appendChild(textNode)` | ✓ | ✓ | ⭐⭐⭐ | 插入新文本 |

## 常见问题解答（FAQ）

### Q1: Text 节点与 Comment 节点有什么区别？

**A:** 两者都继承自 `CharacterData` 接口，但用途不同：

```javascript
// Text 节点
const text = document.createTextNode('可见文本')
console.log(text.nodeType)  // 3
console.log(text.nodeName)  // "#text"

// Comment 节点
const comment = document.createComment('注释内容')
console.log(comment.nodeType)  // 8
console.log(comment.nodeName)  // "#comment"
```

| **特性** | **Text 节点** | **Comment 节点** |
|----------|---------------|------------------|
| nodeType | 3 | 8 |
| nodeName | "#text" | "#comment" |
| 是否显示 | ✓ 显示 | ✗ 隐藏 |
| 是否可交互 | ✓ 可选中复制 | ✗ 不可交互 |

### Q2: 为什么会有多个相邻的 Text 节点？

**A:** 以下情况会产生多个 Text 节点：

1. **脚本操作**：使用 `splitText()` 或多次 `appendChild()`
2. **实体引用**：解析 HTML 实体（如 `&amp;`）
3. **动态插入**：在已有文本中插入元素或文本

```javascript
// 原始 HTML: <div>Hello</div>
const div = document.querySelector('div')

// 插入元素会在文本中间产生分割
const span = document.createElement('span')
span.textContent = ' World'
div.firstChild.splitText(5)
div.insertBefore(span, div.childNodes[1])

// 结果: <div>Hello<span> World</span></div>
// 文本节点数量: 2
```

解决方法：使用 `normalize()` 合并相邻 Text 节点。

### Q3: `data` 和 `nodeValue` 有什么区别？

**A:** 两者完全等价，`data` 是 `CharacterData` 接口定义的属性，`nodeValue` 是 `Node` 接口定义的属性。

```javascript
const textNode = document.createTextNode('test')
console.log(textNode.data === textNode.nodeValue)  // true

// 推荐使用 data，语义更清晰
textNode.data = 'new content'
```

### Q4: 如何获取元素中所有文本节点的数量？

**A:** 使用 `TreeWalker` 或递归遍历：

```javascript
// 方法一：使用 TreeWalker（推荐）
function countTextNodes(element) {
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_TEXT,
    null,
    false
  )

  let count = 0
  while (walker.nextNode()) count++
  return count
}

// 使用示例
console.log(countTextNodes(document.body))
```

### Q5: `wholeText` 和 `textContent` 有什么区别？

**A:**

| **属性** | **作用域** | **分隔符** | **使用场景** |
|----------|------------|------------|--------------|
| `wholeText` | 单个文本节点及其相邻文本节点 | 注释节点不中断 | 处理连续文本片段 |
| `textContent` | 整个元素的所有文本内容 | 元素节点中断 | 快速获取全部文本 |

```javascript
// HTML: <div>文本1<!-- 注释 -->文本2<span>文本3</span></div>
const div = document.querySelector('div')
const firstText = div.firstChild

console.log(firstText.wholeText)    // "文本1文本2"（合并相邻，不包括注释）
console.log(div.textContent)         // "文本1文本2文本3"（所有文本）
```

### Q6: 如何处理表情符号和多字节字符？

**A:** Text 节点的 `length` 基于 UTF-16 编码：

```javascript
const text = document.createTextNode('😊')
console.log(text.length)  // 2 (UTF-16 代理对)

// 获取实际字符数
console.log([...text.data].length)  // 1

// 使用 Intl.Segmenter（现代浏览器）
const segmenter = new Intl.Segmenter('zh', { granularity: 'grapheme' })
const segments = [...segmenter.segment(text.data)]
console.log(segments.length)  // 1
```

### Q7: 如何在 Shadow DOM 中使用 Text 节点？

**A:** Text 节点的 `assignedSlot` 属性可以访问分配到的 slot：

```javascript
// 创建 Shadow DOM
const host = document.querySelector('#host')
const shadow = host.attachShadow({ mode: 'open' })
shadow.innerHTML = '<slot name="content"></slot>'

// 插入文本
const text = document.createTextNode('Hello')
const span = document.createElement('span')
span.slot = 'content'
span.appendChild(text)
host.appendChild(span)

// 检查 slot 分配
console.log(text.assignedSlot)  // <slot name="content">
console.log(text.assignedSlot.name)  // "content"
```

## 总结

### Text 节点核心要点

1. **节点类型**：`nodeType = 3`，`nodeName = "#text"`
2. **接口继承**：Node → CharacterData → Text
3. **核心属性**：`data`（文本内容）、`wholeText`（相邻文本合并）、`length`（文本长度）
4. **核心方法**：文本操作（`appendData`、`deleteData` 等）、节点分割（`splitText`）
5. **安全性**：优先使用 `textContent` 或 `createTextNode`，避免 XSS

### 最佳实践速查表

| **场景** | **推荐方法** | **避免做法** |
|----------|--------------|--------------|
| 设置纯文本 | `textContent` | `innerHTML` |
| 高频更新 | `data` 属性 | `textContent` |
| 插入用户内容 | `createTextNode` | `innerHTML` |
| 获取可见文本 | `innerText` | - |
| 合并文本节点 | `normalize()` | 手动合并 |
| 分割文本 | `splitText()` | 字符串操作 + 重建 |
| 遍历文本节点 | `TreeWalker` | 手动递归（复杂场景）|

### API 选择流程图

```
需要操作文本内容
    │
    ├─ 是否需要插入 HTML 标签？
    │   ├─ 是 → 使用 innerHTML（注意 XSS 风险）
    │   └─ 否 → 继续判断
    │
    ├─ 是否需要细粒度控制？
    │   ├─ 是 → 使用 Text 节点 API
    │   │   ├─ 需要分割 → splitText()
    │   │   ├─ 需要追加 → appendData()
    │   │   └─ 其他操作 → data 属性
    │   │
    │   └─ 否 → 使用高级属性
    │       ├─ 需要可见文本 → innerText
    │       └─ 需要全部文本 → textContent
    │
    └─ 是否需要监听变化？
        ├─ 是 → MutationObserver
        └─ 否 → 完成
```

## 参考资料

- [MDN: Text 接口](https://developer.mozilla.org/zh-CN/docs/Web/API/Text)
- [MDN: CharacterData 接口](https://developer.mozilla.org/zh-CN/docs/Web/API/CharacterData)
- [DOM Living Standard: Text](https://dom.spec.whatwg.org/#interface-text)
- [WHATWG HTML Standard: DOM APIs](https://html.spec.whatwg.org/)
