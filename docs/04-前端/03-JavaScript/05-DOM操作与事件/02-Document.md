---
title: Document
description: "Document 是浏览器中 DOM 树的根节点，代表当前已被解析或加载的文档。几乎所有的 DOM 操作都以 document 为入口：查找元素、创建节点、挂载到页面、注册事件、读取元信息等。"
keywords: [Document]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---


# Document 节点详解

`Document` 是浏览器中 DOM 树的根节点，代表当前已被解析或加载的文档。几乎所有的 DOM 操作都以 `document` 为入口：查找元素、创建节点、挂载到页面、注册事件、读取元信息等。

## Document 基础

### Document 是什么

- DOM 树的根节点，节点类型为 `Node.DOCUMENT_NODE (9)`。
- 提供访问 `documentElement`（通常是 `<html>`）、`head`、`body`、`title` 等入口。
- 混入了 `EventTarget`、`Node`、`ParentNode` 等接口，可调用对应方法。

```javascript
console.log(document instanceof Document) // true
console.log(document.nodeType) // 9
console.log(document.documentElement.tagName) // "HTML"
```

### 如何获取 Document

| 方式 | 说明 | 示例 |
|------|------|------|
| 页面上下文 | 直接使用全局的 `document` | `document` 或 `window.document` |
| iframe 中 | 通过 iframe 元素获取 | `iframe.contentDocument` 或 `iframe.contentWindow.document` |
| Ajax 响应 | XMLHttpRequest 解析结果 | `xhr.responseXML` |
| DOMParser | 解析字符串生成文档 | `new DOMParser().parseFromString(str, 'text/html')` |
| 节点回溯 | 任意节点的所属文档 | `node.ownerDocument` |
| 创建新文档 | 创建独立文档对象 | `document.implementation.createHTMLDocument(title)` |

```javascript
// iframe 中的文档
const iframe = document.querySelector('iframe')
const iframeDoc = iframe?.contentDocument

// 解析 XML/HTML
const parser = new DOMParser()
const xmlDoc = parser.parseFromString('<root></root>', 'text/xml')

// 节点所属文档
const div = document.querySelector('div')
console.log(div.ownerDocument === document) // true

// 创建独立文档
const newDoc = document.implementation.createHTMLDocument('Test')
console.log(newDoc.title) // "Test"
```

## Document 属性

### 快捷属性

快捷属性提供对文档关键节点的直接访问。

| 属性 | 描述 | 返回值 | 备注 |
|------|------|--------|------|
| `document.defaultView` | document 所属的 window 对象 | `Window` \| `null` | 若文档不属于 window 则返回 `null` |
| `document.doctype` | 文档的 DTD 节点 | `DocumentType` \| `null` | `<!DOCTYPE html>` |
| `document.documentElement` | 文档的根元素节点 | `<html>` 元素 | 通常是 document 的第二个子节点 |
| `document.body` | 指向 `<body>` 节点 | `<body>` 元素 | 若源码省略会自动创建，可写 |
| `document.head` | 指向 `<head>` 节点 | `<head>` 元素 | 若源码省略会自动创建，可写 |
| `document.scrollingElement` | 文档滚动时的滚动元素 | `Element` | 标准模式返回 `<html>`，兼容模式返回 `<body>` |
| `document.activeElement` | 当前获得焦点的元素 | `Element` | 若无焦点则返回 `<body>` 或 `null` |
| `document.fullscreenElement` | 当前处于全屏状态的元素 | `Element` \| `null` | 非全屏返回 `null` |

```javascript
// 访问根元素
console.log(document.documentElement.tagName) // "HTML"

// 滚动到顶部
const scrollEl = document.scrollingElement || document.documentElement
scrollEl.scrollTop = 0

// 检查全屏状态
if (document.fullscreenElement?.nodeName === 'VIDEO') {
  console.log('视频正在全屏播放')
}

// 获取焦点元素
const focused = document.activeElement
if (focused instanceof HTMLInputElement) {
  console.log('当前输入框:', focused.value)
}
```

### 节点集合属性

这些属性返回动态集合（`HTMLCollection` 或 `StyleSheetList`），会随着 DOM 更新而自动变化。

| 属性 | 描述 | 访问方式 | 备注 |
|------|------|----------|------|
| `document.links` | 所有带 `href` 的 `<a>` / `<area>` 元素 | `links[index]` / `links.length` | 仅包含有效超链接 |
| `document.forms` | 所有 `<form>` 元素 | `forms[index]` / `forms.name` / `forms.id` | 可通过索引、name 或 id 访问 |
| `document.images` | 所有 `<img>` 元素 | `images[index]` / `images.length` | 统计图片数量 |
| `document.embeds` / `plugins` | 所有 `<embed>` 元素 | `embeds[index]` / `plugins[index]` | 两者功能相同 |
| `document.scripts` | 所有 `<script>` 元素 | `scripts[index]` / `scripts.length` | 检查脚本存在 |
| `document.styleSheets` | 所有样式表 | `styleSheets[index]` | 返回 `StyleSheetList` |

```javascript
// 遍历所有链接
for (let i = 0; i < document.links.length; i++) {
  console.log(document.links[i].href)
}

// 通过 name 访问表单
const loginForm = document.forms.login // <form name="login">
const firstForm = document.forms[0]    // 第一个表单

// 检查页面脚本
if (document.scripts.length === 0) {
  console.log('页面不包含脚本')
}

// 动态集合的特性
const images = document.images
console.log(images.length) // 3
document.body.appendChild(document.createElement('img'))
console.log(images.length) // 4（自动更新）
```

> 💡 **动态集合 vs 静态快照**
> 动态集合（`HTMLCollection`）会实时更新，适合需要监控 DOM 变化的场景。若只需要当前快照，可使用 `Array.from()` 或 `[...collection]` 转换为静态数组。

```javascript
// 获取静态快照
const imagesArray = Array.from(document.images)
const formIds = [...document.forms].map(form => form.id)
```

### 文档信息属性

#### URL 与位置信息

| 属性 | 描述 | 可写性 | 备注 |
|------|------|--------|------|
| `document.URL` | 文档完整 URL（HTML 文档） | 只读 | `location.href` 的别名 |
| `document.documentURI` | 文档完整 URL（所有文档类型） | 只读 | 继承自 `Document` 接口 |
| `document.baseURI` | 文档的基础 URL | 只读 | 若存在 `<base>` 标签则返回其 `href` |
| `document.location` | `Location` 对象 | 可写（重定向） | 等同于 `window.location` |
| `document.domain` | 文档的域名 | 可写（有限制） | 现代开发不推荐使用 |

```javascript
// URL 信息
console.log(document.URL)      // "https://example.com/path?query=1"
console.log(document.baseURI)  // "https://example.com/base/"

// 重定向
document.location = 'https://new.url' // 跳转

// baseURI 受 <base> 标签影响
// <base href="https://cdn.example.com/">
console.log(document.baseURI) // "https://cdn.example.com/"
```

> ⚠️ **避免使用 document.domain**
> `document.domain` 仅在极少数旧式跨子域通信场景使用。修改后会降低同源策略的严格程度，且现代浏览器已逐步废弃。推荐使用 `postMessage`、`Channel Messaging` 或 `Storage Access API`。

#### 文档元信息

| 属性 | 描述 | 可写性 | 备注 |
|------|------|--------|------|
| `document.title` | 文档标题 | 可写 | 修改后立即更新浏览器标签 |
| `document.characterSet` | 文档编码 | 只读 | 通常为 `"UTF-8"` |
| `document.contentType` | 文档 MIME 类型 | 只读 | `"text/html"`、`"image/svg+xml"` 等 |
| `document.lastModified` | 文档最后修改时间 | 只读 | 字符串格式，需 `Date.parse()` 转换 |
| `document.referrer` | 引荐来源 URL | 只读 | 直接访问返回空字符串 |
| `document.dir` | 文本方向 | 可写 | `"ltr"` 或 `"rtl"` |
| `document.compatMode` | 浏览器处理文档的模式 | 只读 | `"CSS1Compat"` 或 `"BackCompat"` |
| `document.origin` | 文档的源（协议+主机+端口） | 只读 | 仅安全上下文可用 |

```javascript
// 设置标题
document.title = '新标题'

// 检测文档模式
if (document.compatMode === 'CSS1Compat') {
  console.log('标准模式')
} else {
  console.log('怪异模式')
}

// 检测来源
if (document.referrer) {
  console.log('来源:', document.referrer)
} else {
  console.log('直接访问')
}

// 检测编码
console.log(document.characterSet) // "UTF-8"
console.log(document.charset)      // 已废弃，使用 characterSet
```

### 文档状态属性

#### 文档可见性

| 属性 | 描述 | 可能值 | 典型场景 |
|------|------|--------|----------|
| `document.hidden` | 页面是否隐藏 | `true` / `false` | 标签页切换时暂停动画 |
| `document.visibilityState` | 页面详细可见状态 | `"visible"` / `"hidden"`（历史值 `"prerender"` 已随预渲染机制废弃） | 根据状态调整资源加载 |
| `document.readyState` | 文档加载状态 | `"loading"` / `"interactive"` / `"complete"` | 检测页面是否就绪 |

```javascript
// 监听可见性变化
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('页面隐藏，暂停动画和视频')
    video.pause()
  } else {
    console.log('页面可见，恢复播放')
    video.play()
  }
})

// 检测加载状态
console.log(document.readyState) // "loading" | "interactive" | "complete"

// 监听加载状态变化
document.addEventListener('readystatechange', () => {
  if (document.readyState === 'complete') {
    console.log('页面完全加载')
  }
})
```

#### 编辑与功能控制

| 属性 | 描述 | 可写性 | 备注 |
|------|------|--------|------|
| `document.designMode` | 控制整个文档是否可编辑 | 可写（`"on"` / `"off"`） | 开启后所有内容可编辑 |
| `document.cookie` | 读取或设置 Cookie | 可写 | 注意 `HttpOnly`、`Secure`、`SameSite` |
| `document.currentScript` | 当前执行的 `<script>` 节点 | 只读 | 仅在脚本同步执行期间有效 |

```javascript
// 开启全局编辑
document.designMode = 'on'

// 设置 Cookie
document.cookie = [
  'username=John',
  'expires=Fri, 31 Dec 2025 23:59:59 GMT',
  'path=/',
  'SameSite=Lax',
  'Secure'
].join('; ')

// 获取当前脚本
const script = document.currentScript
console.log(script?.src) // 当前脚本路径
```

#### 全屏与画中画

| 属性 | 描述 | 返回值 | 备注 |
|------|------|--------|------|
| `document.fullscreenElement` | 当前全屏元素 | `Element` \| `null` | 与 `fullscreenEnabled` 搭配使用 |
| `document.fullscreenEnabled` | 是否允许全屏 | `boolean` | 需在 HTTPS 中使用 |
| `document.pictureInPictureElement` | 当前画中画视频 | `<video>` \| `null` | 仅部分浏览器支持 |
| `document.pictureInPictureEnabled` | 是否允许画中画 | `boolean` | 与权限策略相关 |
| `document.pointerLockElement` | 当前锁定指针的元素 | `Element` \| `null` | FPS 游戏、3D 查看器 |

```javascript
// 进入全屏
if (!document.fullscreenElement && document.fullscreenEnabled) {
  await document.documentElement.requestFullscreen()
}

// 退出全屏
if (document.fullscreenElement) {
  await document.exitFullscreen()
}

// 画中画
if (document.pictureInPictureEnabled) {
  const video = document.querySelector('video')
  if (video && !document.pictureInPictureElement) {
    await video.requestPictureInPicture()
  }
}
```

> ⚠️ **用户手势要求**
> 全屏、画中画、指针锁定都属于敏感操作，需要用户手势触发（如点击事件），并可能受 Permissions Policy 限制。

### 样式与字体资源属性

| 属性 | 描述 | 返回类型 | 备注 |
|------|------|----------|------|
| `document.styleSheets` | 页面中所有样式表 | `StyleSheetList` | 动态集合 |
| `document.adoptedStyleSheets` | 构造样式表数组 | `CSSStyleSheet[]` | Web Components 共享样式 |
| `document.fonts` | 文档关联的字体集合 | `FontFaceSet` | 等待字体加载 |

```javascript
// 禁用特定样式表
for (const sheet of document.styleSheets) {
  if (sheet.href?.includes('legacy')) {
    sheet.disabled = true
  }
}

// 使用构造样式表
if ('adoptedStyleSheets' in document) {
  const sheet = new CSSStyleSheet()
  await sheet.replace(`
    :root {
      color-scheme: light dark;
    }
  `)
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet]
}

// 等待字体加载
await document.fonts.ready
console.log('所有字体已加载')
```

> ⚠️ **跨域样式表限制**
> 跨域引入的样式表若未设置 `Access-Control-Allow-Origin`，访问其规则会抛出安全错误。

## Document 方法

### 查询类方法

#### 方法速查表

| 方法 | 返回值 | 集合是否动态 | 典型用途 |
|------|--------|--------------|----------|
| `getElementById(id)` | `Element` \| `null` | — | 按唯一 id 查找 |
| `querySelector(selector)` | `Element` \| `null` | — | 获取首个匹配元素 |
| `querySelectorAll(selector)` | `NodeList` | 否（静态） | CSS 选择器批量查找 |
| `getElementsByTagName(tag)` | `HTMLCollection` | 是（动态） | 按标签名查找 |
| `getElementsByClassName(class)` | `HTMLCollection` | 是（动态） | 按类名组合查询 |
| `getElementsByName(name)` | `NodeList` | 是（动态） | 按 name 属性查找 |
| `elementFromPoint(x, y)` | `Element` \| `null` | — | 命中测试、拖放 |
| `elementsFromPoint(x, y)` | `Element[]` | — | 层叠元素分析 |

> 💡 **动态 vs 静态集合**
> - **动态集合**（`HTMLCollection`）：DOM 更新时自动同步，适合实时监控
> - **静态集合**（`NodeList`）：返回快照，适合批量操作时固定结果集

#### getElementById()

按 `id` 查找唯一元素，最快速的查询方式之一。

```javascript
const element = document.getElementById(id)
```

**参数**
- `id`：大小写敏感的字符串

**返回值**
- `Element` 或 `null`

```javascript
const app = document.getElementById('app')
const header = document.getElementById('header')

// 性能优于 querySelector('#id')
console.time('getElementById')
for (let i = 0; i < 10000; i++) {
  document.getElementById('test')
}
console.timeEnd('getElementById')

console.time('querySelector')
for (let i = 0; i < 10000; i++) {
  document.querySelector('#test')
}
console.timeEnd('querySelector')
```

**注意事项**
- 仅能在 `document` 上调用
- 若页面存在重复 `id`，返回文档流中第一个匹配元素
- `id` 大小写敏感

#### querySelector() / querySelectorAll()

通过 CSS 选择器检索元素。

```javascript
const element = document.querySelector(selector)
const elements = document.querySelectorAll(selector)

// 限定作用域
const container = document.getElementById('container')
const items = container.querySelectorAll('.item')
```

**参数**
- `selector`：合法的 CSS 选择器字符串，支持逗号分隔

**返回值**
- `querySelector()`：`Element | null`
- `querySelectorAll()`：静态 `NodeList`

```javascript
// 基本查询
const headline = document.querySelector('#header')
const activeButtons = document.querySelectorAll('.btn.is-active')

// 限定作用域（提升性能）
const sidebar = document.getElementById('sidebar')
const links = sidebar.querySelectorAll('a[href^="#"]')

// 选择器分组
const boxes = document.querySelectorAll('div.note, div.alert')

// 属性选择器
const inputs = document.querySelectorAll('input[type="text"][required]')

// 伪类选择器
const firstItem = document.querySelector('li:first-child')
const checkedInputs = document.querySelectorAll('input:checked')
```

**注意事项**
- `querySelectorAll()` 返回静态快照，不随 DOM 变化更新
- 某些伪类（`:visited`、`:link`）受安全限制
- 特殊字符（`.`、`:`、`[`）需要转义

```javascript
// 特殊字符转义
const id = 'user.name'
const element = document.querySelector(`#${CSS.escape(id)}`)

// 性能优化：缓存查询结果
const cachedElements = document.querySelectorAll('.item')
// 避免在循环中重复查询
```

#### getElementsByTagName()

按标签名返回动态集合。

```javascript
const elements = document.getElementsByTagName(tagName)

// 限定作用域
const scopedElements = element.getElementsByTagName(tagName)
```

**参数**
- `tagName`：不区分大小写的标签名字符串，`"*"` 匹配所有标签

**返回值**
- 动态 `HTMLCollection`

```javascript
const images = document.getElementsByTagName('img')
console.log(images.length) // 初始数量

document.body.appendChild(document.createElement('img'))
console.log(images.length) // 自动 +1

// SVG 命名空间
const svg = document.querySelector('svg')
const circles = svg.getElementsByTagNameNS('http://www.w3.org/2000/svg', 'circle')
```

**注意事项**
- 遍历动态集合时修改 DOM 可能跳过元素，建议倒序或先拷贝

```javascript
// 错误：正序遍历时删除会跳过元素
const items = document.getElementsByTagName('li')
for (let i = 0; i < items.length; i++) {
  items[i].remove() // 危险！
}

// 正确：倒序删除
for (let i = items.length - 1; i >= 0; i--) {
  items[i].remove()
}

// 正确：先拷贝为数组
const itemsArray = Array.from(document.getElementsByTagName('li'))
itemsArray.forEach(item => item.remove())
```

#### getElementsByClassName()

按类名组合返回动态集合。

```javascript
const elements = document.getElementsByClassName(classNames)

// 限定作用域
const scopedElements = element.getElementsByClassName(classNames)
```

**参数**
- `classNames`：空格分隔的类名字符串，顺序不影响结果

**返回值**
- 动态 `HTMLCollection`

```javascript
// 单类名
const buttons = document.getElementsByClassName('btn')

// 多类名组合（AND 关系）
const activeButtons = document.getElementsByClassName('btn primary')

// 限定作用域
const sidebar = document.getElementById('sidebar')
const links = sidebar.getElementsByClassName('nav-link')

// 动态特性
const items = document.getElementsByClassName('item')
console.log(items.length) // 3
const newItem = document.createElement('div')
newItem.className = 'item'
document.body.appendChild(newItem)
console.log(items.length) // 4
```

#### getElementsByName()

按 `name` 属性查找，返回动态集合。

```javascript
const elements = document.getElementsByName(name)
```

**参数**
- `name`：大小写敏感的字符串

**返回值**
- 动态 `NodeList`（会随 DOM 更新自动变化）

```javascript
// 单选按钮组
const genderRadios = document.getElementsByName('gender')

// meta 标签
const viewport = document.getElementsByName('viewport')[0]

// 表单控件
const emails = document.getElementsByName('email')

// 转换为数组使用数组方法
const emailArray = [...document.getElementsByName('email')]
```

**注意事项**
- 不支持限定作用域
- 适用于表单控件、`<meta>`、`<iframe>` 等带 `name` 属性的元素

#### elementFromPoint() / elementsFromPoint()

根据视口坐标返回命中元素。

```javascript
const element = document.elementFromPoint(x, y)
const elements = document.elementsFromPoint(x, y)
```

**参数**
- `x`：相对于视口左上角的横坐标
- `y`：相对于视口左上角的纵坐标

**返回值**
- `elementFromPoint()`：最顶层元素或 `null`
- `elementsFromPoint()`：自顶向底排序的元素数组

```javascript
// 鼠标悬停检测
document.addEventListener('mousemove', (event) => {
  const topElement = document.elementFromPoint(event.clientX, event.clientY)
  console.log('鼠标下的元素:', topElement?.tagName)
})

// 点击穿透分析
document.addEventListener('click', (event) => {
  const stack = document.elementsFromPoint(event.clientX, event.clientY)
  console.log('命中路径:', stack.map(el => el.tagName))
})

// 拖放目标检测
function getDropTarget(x, y) {
  const element = document.elementFromPoint(x, y)
  return element?.closest('.drop-zone')
}
```

**注意事项**
- 坐标超出视口返回 `null`
- `pointer-events: none` 的元素会被跳过，返回其下层的元素
- 结果基于视觉堆叠，非 DOM 顺序

### 节点创建与操作方法

#### createElement()

创建元素节点。

```javascript
const element = document.createElement(tagName, options?)
```

**参数**
- `tagName`：标签名（不区分大小写）
- `options.is`：自定义元素名称（可选）

**返回值**
- `Element`

```javascript
// 基本创建
const div = document.createElement('div')
div.className = 'container'
div.textContent = 'Hello'

// 创建自定义元素
class MyButton extends HTMLElement {}
customElements.define('my-button', MyButton)
const btn = document.createElement('button', { is: 'my-button' })

// SVG 元素需要命名空间
const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
```

#### createTextNode()

创建纯文本节点，安全插入用户输入。

```javascript
const textNode = document.createTextNode(data)
```

**参数**
- `data`：字符串，作为纯文本处理

**返回值**
- `Text` 节点

```javascript
// 安全插入用户输入（防 XSS）
const userInput = "<script>alert('XSS')</script>"
const textNode = document.createTextNode(userInput)

const container = document.createElement('div')
container.appendChild(textNode)
document.body.appendChild(container)
// 显示：<script>alert('XSS')</script>（纯文本）

// 对比 innerHTML（危险！）
container.innerHTML = userInput // 会把字符串解析为 HTML 并插入，<img onerror=…> 等载荷可执行代码（<script> 标签本身虽不执行，但仍绝不可用于用户输入）
```

#### createAttribute()

创建属性节点（底层 API，现代开发较少使用）。

```javascript
const attr = document.createAttribute(name)
attr.value = value
element.setAttributeNode(attr)
```

**参数**
- `name`：属性名

**返回值**
- `Attr` 对象

```javascript
// 传统方式（不推荐）
const attr = document.createAttribute('data-role')
attr.value = 'dialog'
element.setAttributeNode(attr)

// 现代方式（推荐）
element.setAttribute('data-role', 'dialog')
// 或
element.dataset.role = 'dialog'
```

#### createComment()

创建注释节点。

```javascript
const comment = document.createComment(data)
```

**参数**
- `data`：注释文本

**返回值**
- `Comment` 节点

```javascript
// 标记动态内容边界
const begin = document.createComment(' 用户卡片开始 ')
const end = document.createComment(' 用户卡片结束 ')

const card = document.createElement('section')
card.className = 'user-card'

const fragment = document.createDocumentFragment()
fragment.appendChild(begin)
fragment.appendChild(card)
fragment.appendChild(end)

document.body.appendChild(fragment)
```

#### createDocumentFragment()

创建文档片段，用于批量 DOM 插入。

```javascript
const fragment = document.createDocumentFragment()
```

**返回值**
- `DocumentFragment`（无父节点的临时容器）

```javascript
// 批量插入列表项（减少回流）
function renderList(items) {
  const fragment = document.createDocumentFragment()
  
  items.forEach(item => {
    const li = document.createElement('li')
    li.textContent = item
    fragment.appendChild(li)
  })
  
  const list = document.getElementById('list')
  list.innerHTML = ''
  list.appendChild(fragment) // 一次性插入
}

// 对比：逐个插入（多次回流）
function renderListSlow(items) {
  const list = document.getElementById('list')
  list.innerHTML = ''
  items.forEach(item => {
    const li = document.createElement('li')
    li.textContent = item
    list.appendChild(li) // 每次都触发回流
  })
}
```

**性能优势**
- 插入 fragment 时，子节点被移动到目标位置
- fragment 本身不进入 DOM 树
- 减少重排重绘次数

#### adoptNode() / importNode()

跨文档迁移节点。

```javascript
// 移动节点（从原文档移除）
const node = document.adoptNode(externalNode)

// 复制节点（保留原文档）
const node = document.importNode(externalNode, deep)
```

**参数**
- `externalNode`：外部文档的节点
- `deep`：是否深拷贝（默认 `false`）

**返回值**
- `Node`

```javascript
// 从 iframe 移动节点
const iframe = document.querySelector('iframe')
const externalDoc = iframe.contentDocument
const externalNode = externalDoc.getElementById('content')

// adoptNode：从原文档移除
const adopted = document.adoptNode(externalNode)
document.body.appendChild(adopted)

// importNode：保留原文档
const imported = document.importNode(externalNode, true)
document.body.appendChild(imported)

// 从 DOMParser 结果导入
const parser = new DOMParser()
const doc = parser.parseFromString('<div>内容</div>', 'text/html')
const importedNode = document.importNode(doc.body.firstElementChild, true)
document.body.appendChild(importedNode)
```

**区别**
- `adoptNode()`：节点从原文档移除，所有权转移
- `importNode()`：创建副本，原文档不变

### DOM 遍历方法

#### createNodeIterator()

创建节点迭代器，深度优先遍历。

```javascript
const iterator = document.createNodeIterator(
  root,
  whatToShow,
  filterFn
)
```

**参数**
- `root`：遍历起点
- `whatToShow`：`NodeFilter` 常量
- `filterFn`：自定义过滤函数（可选）

**返回值**
- `NodeIterator`

```javascript
// 遍历所有元素
const iterator = document.createNodeIterator(
  document.body,
  NodeFilter.SHOW_ELEMENT
)

let node
while ((node = iterator.nextNode())) {
  console.log(node.tagName)
}

// 只遍历文本节点
const textIterator = document.createNodeIterator(
  document.body,
  NodeFilter.SHOW_TEXT
)

// 自定义过滤
const linkIterator = document.createNodeIterator(
  document.body,
  NodeFilter.SHOW_ELEMENT,
  {
    acceptNode(node) {
      return node.tagName === 'A' && node.href
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP
    }
  }
)
```

**whatToShow 常量**
- `NodeFilter.SHOW_ALL`：所有节点
- `NodeFilter.SHOW_ELEMENT`：元素节点
- `NodeFilter.SHOW_TEXT`：文本节点
- `NodeFilter.SHOW_COMMENT`：注释节点

#### createTreeWalker()

创建树遍历器，支持多方向导航。

```javascript
const walker = document.createTreeWalker(
  root,
  whatToShow,
  filterFn
)
```

**参数**
- 同 `createNodeIterator`

**返回值**
- `TreeWalker`

```javascript
const walker = document.createTreeWalker(
  document.body,
  NodeFilter.SHOW_ELEMENT
)

// 遍历所有元素
const elements = []
while (walker.nextNode()) {
  elements.push(walker.currentNode)
}

// 树形导航
walker.firstChild()    // 第一个子节点
walker.lastChild()     // 最后一个子节点
walker.nextSibling()   // 下一个兄弟
walker.previousSibling() // 上一个兄弟
walker.parentNode()    // 父节点

// 当前节点
console.log(walker.currentNode)
```

**对比 NodeIterator**
- `TreeWalker`：支持父节点、兄弟节点导航
- `NodeIterator`：只能单向遍历

### 事件相关方法

#### addEventListener() / removeEventListener()

注册和移除事件监听器。

```javascript
target.addEventListener(type, listener, options?)
target.removeEventListener(type, listener, options?)
```

**参数**
- `type`：事件名（如 `"click"`、`"keydown"`）
- `listener`：函数或 `handleEvent` 对象
- `options`：配置对象或布尔值

**options 配置**
```javascript
{
  capture: false,    // 捕获阶段触发
  once: false,       // 仅触发一次
  passive: false,    // 不会调用 preventDefault()
  signal: undefined  // AbortSignal 用于移除
}
```

```javascript
// 基本用法
document.addEventListener('click', (event) => {
  console.log('点击:', event.target)
})

// 一次性监听
element.addEventListener('transitionend', handler, { once: true })

// 被动监听器（优化滚动性能）
document.addEventListener('touchstart', handler, { passive: true })

// 使用 AbortController 批量移除
const controller = new AbortController()
const { signal } = controller

document.addEventListener('click', handler1, { signal })
document.addEventListener('keydown', handler2, { signal })

// 一次性移除所有
controller.abort()

// 使用对象作为监听器
const handler = {
  handleEvent(event) {
    console.log(event.type)
  }
}
element.addEventListener('click', handler)
```

**注意事项**
- `removeEventListener` 需要相同的函数引用和参数
- 匿名函数无法移除
- 及时移除避免内存泄漏

```javascript
// 错误：无法移除
element.addEventListener('click', () => {})
element.removeEventListener('click', () => {}) // 不同的函数引用

// 正确：使用具名函数
function handler(event) {}
element.addEventListener('click', handler)
element.removeEventListener('click', handler)
```

#### dispatchEvent()

手动触发事件。

```javascript
const success = target.dispatchEvent(event)
```

**参数**
- `event`：Event 对象

**返回值**
- `boolean`：未被取消返回 `true`

```javascript
// 触发自定义事件
const event = new CustomEvent('build', {
  detail: { time: Date.now() },
  bubbles: true,
  cancelable: true
})

element.addEventListener('build', (e) => {
  console.log('构建时间:', e.detail.time)
})

element.dispatchEvent(event)

// 触发原生事件
const button = document.querySelector('button')
const clickEvent = new MouseEvent('click', { bubbles: true })
const notCancelled = button.dispatchEvent(clickEvent)

console.log('事件是否被取消:', !notCancelled)
```

#### createEvent()（已废弃）

旧式事件创建方法，已不推荐使用。

```javascript
// 旧方式（不推荐）
const event = document.createEvent('Event')
event.initEvent('build', true, true)
element.dispatchEvent(event)

// 新方式（推荐）
const event = new Event('build', { bubbles: true, cancelable: true })
// 或
const event = new CustomEvent('build', { detail: { ... } })
```

### 文档状态方法

#### hasFocus()

判断文档是否拥有焦点。

```javascript
const focused = document.hasFocus()
```

**返回值**
- `boolean`

```javascript
// 根据焦点状态调整行为
function startAnimation() {
  if (document.hasFocus()) {
    // 页面聚焦时运行动画
    requestAnimationFrame(animate)
  }
}

// 监听焦点变化
window.addEventListener('focus', () => {
  console.log('页面获得焦点')
})

window.addEventListener('blur', () => {
  console.log('页面失去焦点')
})
```

**注意事项**
- 文档可能激活但无焦点（如弹出新窗口后）
- `hasFocus()` 检查整个文档，`activeElement` 检查具体元素

#### execCommand()（已废弃）

执行富文本编辑命令。

> ⚠️ **已废弃**
> 此 API 已被废弃，推荐使用 `Selection`、`Range` 与 Clipboard API 替代。

```javascript
const success = document.execCommand(commandId, showUI?, value?)
```

```javascript
// 旧方式（不推荐）
document.execCommand('bold')
document.execCommand('copy')

// 新方式：Clipboard API
navigator.clipboard.writeText(text)
navigator.clipboard.readText()

// 新方式：Selection/Range
const selection = window.getSelection()
const range = selection.getRangeAt(0)
// 手动操作选区
```

### 选区方法

#### getSelection()

获取用户选区对象。

```javascript
const selection = document.getSelection()
// 等同于 window.getSelection()
```

**返回值**
- `Selection` 对象

```javascript
// 获取选中文本
const selection = document.getSelection()
const selectedText = selection.toString()

console.log('选中的文本:', selectedText)

// 获取选区范围
if (selection.rangeCount > 0) {
  const range = selection.getRangeAt(0)
  console.log('选区起始:', range.startContainer)
  console.log('选区结束:', range.endContainer)
}

// 清除选区
selection.removeAllRanges()

// 程序化设置选区
const range = document.createRange()
range.selectNodeContents(element)
selection.removeAllRanges()
selection.addRange(range)
```

### 已废弃的方法

#### document.write() / document.writeln()

> ⚠️ **极度不推荐**
> 这些方法在现代开发中应完全避免使用。

**风险**
- 阻塞渲染，影响性能
- 页面加载后调用会清空整个文档
- XSS 安全隐患
- 难以维护

```javascript
// 危险示例
document.write('<p>内容</p>') // 阻塞解析

setTimeout(() => {
  document.write('<p>清空页面</p>') // 清空整个文档！
}, 1000)
```

**推荐替代方案**
```javascript
// 动态插入内容
const element = document.createElement('p')
element.textContent = '内容'
document.body.appendChild(element)

// 使用 innerHTML（注意 XSS）
container.innerHTML = '<p>内容</p>'

// 使用模板
const template = document.createElement('template')
template.innerHTML = '<p>内容</p>'
document.body.appendChild(template.content)
```

#### document.open() / document.close()

> ⚠️ **极度不推荐**
> 会清空整个文档，现代开发中应完全避免。

## Document 事件

### 加载事件

| 事件 | 触发时机 | 典型用途 |
|------|----------|----------|
| `DOMContentLoaded` | DOM 解析完成（不等图片等资源） | 初始化脚本、绑定事件 |
| `load` | 所有资源加载完成 | 依赖图片尺寸的逻辑 |
| `readystatechange` | `readyState` 变化 | 监控加载进度 |

```javascript
// DOM 解析完成
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 已就绪，可以操作元素')
  initApp()
})

// 所有资源加载完成
window.addEventListener('load', () => {
  console.log('所有资源加载完成')
  // 依赖图片尺寸的逻辑
  measureImages()
})

// 更早的初始化方式
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init() // DOM 已就绪
}
```

### 可见性事件

| 事件 | 触发时机 | 典型用途 |
|------|----------|----------|
| `visibilitychange` | 页面可见性变化 | 暂停/恢复动画、视频 |
| `freeze` | 页面被冻结（实验性） | 保存状态 |
| `resume` | 页面恢复（实验性） | 恢复状态 |

```javascript
// 监听可见性变化
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    console.log('页面隐藏')
    pauseVideo()
    stopAnimation()
  } else {
    console.log('页面可见')
    resumeVideo()
    startAnimation()
  }
})
```

### 其他常用事件

```javascript
// 滚动事件
document.addEventListener('scroll', () => {
  console.log('滚动位置:', document.scrollingElement.scrollTop)
}, { passive: true })

// 点击事件委托
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]')
  if (!target) return

  const action = target.dataset.action
  switch (action) {
    case 'fullscreen':
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        document.documentElement.requestFullscreen()
      }
      break
    case 'scroll-top':
      document.scrollingElement.scrollTop = 0
      break
    default:
      console.log('未定义的操作:', action)
  }
})
```

## 实用示例

### 1. 安全插入用户输入

```javascript
function renderUserInput(input) {
  const p = document.createElement('p')
  p.textContent = input // 自动转义 HTML
  document.getElementById('output')?.appendChild(p)
}

// 安全：XSS 攻击失效
renderUserInput("<img onerror='alert(1)' src=x>")
// 显示：<img onerror='alert(1)' src=x>（纯文本）
```

### 2. 批量渲染列表

```javascript
function renderList(containerId, data) {
  const container = document.getElementById(containerId)
  if (!container) return
  
  // 使用文档片段减少回流
  const fragment = document.createDocumentFragment()
  
  data.forEach(text => {
    const li = document.createElement('li')
    li.textContent = text
    fragment.appendChild(li)
  })
  
  container.innerHTML = ''
  container.appendChild(fragment)
}

renderList('list', ['项目 1', '项目 2', '项目 3'])
```

### 3. 模板渲染与事件委托

```html
<template id="card-tpl">
  <article class="card">
    <h3></h3>
    <p></p>
    <button data-action="remove">删除</button>
  </article>
</template>

<div id="cards"></div>
```

```javascript
function addCard(title, content) {
  const tpl = document.getElementById('card-tpl')
  if (!(tpl instanceof HTMLTemplateElement)) return
  
  const node = tpl.content.firstElementChild.cloneNode(true)
  node.querySelector('h3').textContent = title
  node.querySelector('p').textContent = content
  
  document.getElementById('cards')?.appendChild(node)
}

// 事件委托
document.getElementById('cards')?.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]')
  if (!btn) return
  
  const action = btn.dataset.action
  if (action === 'remove') {
    const card = btn.closest('.card')
    card?.remove()
  }
})

// 使用
addCard('标题 1', '内容 1')
addCard('标题 2', '内容 2')
```

### 4. 滚动到顶部

```javascript
function scrollToTop() {
  const el = document.scrollingElement || document.documentElement
  el.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// 监听滚动显示回到顶部按钮
let scrollToTopBtn
document.addEventListener('scroll', () => {
  if (!scrollToTopBtn) {
    scrollToTopBtn = document.getElementById('scroll-to-top')
  }
  
  if (document.scrollingElement.scrollTop > 300) {
    scrollToTopBtn?.classList.add('visible')
  } else {
    scrollToTopBtn?.classList.remove('visible')
  }
}, { passive: true })
```

### 5. Cookie 操作

```javascript
// 读取 Cookie
function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop().split(';').shift()
  }
  return null
}

// 设置 Cookie
function setCookie(name, value, days) {
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value}; expires=${date.toUTCString()}; path=/; SameSite=Lax; Secure`
}

// 删除 Cookie
function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

// 使用
setCookie('user', 'john', 7)
console.log(getCookie('user')) // 'john'
deleteCookie('user')
```

### 6. 判断运行环境

```javascript
// 是否在 iframe 中
const isInIframe = () => window.self !== window.top

// 是否在顶层窗口
const isTopWindow = () => window.self === window.top

// 获取当前脚本路径
function getCurrentScriptPath() {
  const script = document.currentScript
  if (!script) return ''
  
  const src = script.src || ''
  return src.substring(0, src.lastIndexOf('/') + 1)
}

// 检测移动端
const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
```

### 7. DOM 就绪检测

```javascript
// 封装 DOM 就绪检测
function domReady(callback) {
  if (document.readyState !== 'loading') {
    callback()
  } else {
    document.addEventListener('DOMContentLoaded', callback)
  }
}

// 使用
domReady(() => {
  console.log('DOM 已就绪')
  initApp()
})
```

### 8. 复制文本到剪贴板

```javascript
// 现代方式（推荐）
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    console.log('复制成功')
  } catch (err) {
    console.error('复制失败:', err)
  }
}

// 兼容方式：navigator.clipboard 需要安全上下文，旧浏览器可回退
function copyTextFallback(text) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

// 调用：优先使用现代 API，否则回退
function copyToClipboard(text) {
  if (navigator.clipboard) {
    copyText(text)
  } else {
    copyTextFallback(text)
  }
}
```

## 性能与兼容性

### 性能优化建议

#### 1. 减少查询次数

```javascript
// 错误：重复查询
for (let i = 0; i < 100; i++) {
  document.getElementById('container').appendChild(createElement(i))
}

// 正确：缓存查询结果
const container = document.getElementById('container')
const fragment = document.createDocumentFragment()
for (let i = 0; i < 100; i++) {
  fragment.appendChild(createElement(i))
}
container.appendChild(fragment)
```

#### 2. 批量 DOM 操作

```javascript
// 错误：逐个插入（多次回流）
items.forEach(item => {
  list.appendChild(document.createElement('li'))
})

// 正确：使用文档片段
const fragment = document.createDocumentFragment()
items.forEach(item => {
  const li = document.createElement('li')
  li.textContent = item
  fragment.appendChild(li)
})
list.appendChild(fragment) // 一次回流
```

#### 3. 使用事件委托

```javascript
// 错误：每个按钮单独绑定
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', handleClick)
})

// 正确：事件委托
document.addEventListener('click', (e) => {
  if (e.target.matches('.btn')) {
    handleClick(e)
  }
})
```

#### 4. 脱离文档流操作

```javascript
// 复杂操作前脱离文档流
const element = document.getElementById('container')
const parent = element.parentNode
const nextSibling = element.nextSibling

// 脱离文档流
parent.removeChild(element)

// 执行复杂操作
element.style.width = '100px'
element.style.height = '100px'
// ...更多操作

// 重新插入
parent.insertBefore(element, nextSibling)
```

#### 5. 使用 requestAnimationFrame

```javascript
// 样式读取和写入分离
function updateLayout() {
  // 读取
  const height = element.offsetHeight
  
  // 写入
  requestAnimationFrame(() => {
    element.style.height = height + 10 + 'px'
  })
}
```

### 兼容性注意事项

#### 动态集合特性

```javascript
// HTMLCollection 是动态的
const images = document.getElementsByTagName('img')
console.log(images.length) // 3
document.body.appendChild(new Image())
console.log(images.length) // 4（自动更新）

// NodeList 可能是静态或动态
const allImages = document.querySelectorAll('img') // 静态
const namedImages = document.getElementsByName('img') // 动态（live NodeList）
```

#### 浏览器差异

| 特性 | 兼容性 | 备注 |
|------|--------|------|
| `document.scrollingElement` | 现代浏览器 | 兼容模式需回退到 `documentElement` |
| `document.currentScript` | 现代浏览器 | 异步脚本中返回 `null` |
| `adoptedStyleSheets` | Chrome 73+ | 需要能力检测 |
| `document.fonts` | 现代浏览器 | FontFaceSet API |
| `document.write()` | 所有浏览器 | 已废弃，不推荐使用 |

```javascript
// 兼容性检测
if ('adoptedStyleSheets' in document) {
  // 使用构造样式表
} else {
  // 回退到 <style> 元素
}

// 滚动元素兼容
const scrollElement = document.scrollingElement || document.documentElement
```

## 常见问题

### 1. 获取不到元素

**问题**：`document.getElementById()` 返回 `null`

**原因**：
- DOM 未加载完成
- 元素不存在
- `id` 拼写错误

**解决方案**：

```javascript
// 方案 1：使用 DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const element = document.getElementById('my-element')
})

// 方案 2：使用 defer 属性
// <script src="app.js" defer></script>

// 方案 3：放置在 body 末尾
// <script src="app.js"></script> </body>

// 方案 4：检测加载状态
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
```

### 2. 动态集合遍历问题

**问题**：遍历时修改集合导致跳过元素

```javascript
// 错误示例
const items = document.getElementsByClassName('item')
for (let i = 0; i < items.length; i++) {
  items[i].remove() // 会跳过元素
}
```

**解决方案**：

```javascript
// 方案 1：倒序遍历
for (let i = items.length - 1; i >= 0; i--) {
  items[i].remove()
}

// 方案 2：转换为静态数组
const itemsArray = Array.from(document.getElementsByClassName('item'))
itemsArray.forEach(item => item.remove())

// 方案 3：使用 querySelectorAll
const items = document.querySelectorAll('.item') // 静态 NodeList
items.forEach(item => item.remove())
```

### 3. 样式未生效即读取尺寸

**问题**：读取元素尺寸返回 0

**原因**：样式尚未计算完成

**解决方案**：

```javascript
// 方案 1：等待 load 事件
window.addEventListener('load', () => {
  const height = element.offsetHeight
})

// 方案 2：使用 requestAnimationFrame
requestAnimationFrame(() => {
  const height = element.offsetHeight
})

// 方案 3：触发强制回流
element.offsetHeight // 读取触发回流
const computed = getComputedStyle(element)

// 方案 4：使用 ResizeObserver
const observer = new ResizeObserver((entries) => {
  console.log('尺寸:', entries[0].contentRect)
})
observer.observe(element)
```

### 4. 跨域样式表访问错误

**问题**：访问 `styleSheets[i].cssRules` 抛出安全错误

**原因**：样式表来自不同源且未设置 CORS

**解决方案**：

```html
<!-- 设置 CORS -->
<link rel="stylesheet" href="https://other-domain.com/style.css" crossorigin="anonymous">
```

```javascript
// 安全访问
try {
  const rules = styleSheet.cssRules
  // 处理规则
} catch (e) {
  console.warn('无法访问跨域样式表')
}
```

### 5. 事件监听器无法移除

**问题**：`removeEventListener` 无效

**原因**：函数引用不同

**解决方案**：

```javascript
// 错误：匿名函数无法移除
element.addEventListener('click', () => {})
element.removeEventListener('click', () => {}) // 无效！

// 正确：使用具名函数
function handleClick(event) {}
element.addEventListener('click', handleClick)
element.removeEventListener('click', handleClick) // 有效

// 正确：使用对象监听器
const handler = {
  handleEvent(event) {
    console.log(event.type)
  }
}
element.addEventListener('click', handler)
element.removeEventListener('click', handler)

// 正确：使用 AbortController
const controller = new AbortController()
element.addEventListener('click', handler, { signal: controller.signal })
controller.abort() // 移除
```

### 6. document.write 导致页面清空

**问题**：调用 `document.write` 后页面内容消失

**原因**：页面加载完成后调用会触发 `document.open()`

**解决方案**：

```javascript
// 完全避免使用 document.write

// 替代方案：动态插入
const script = document.createElement('script')
script.src = 'script.js'
document.body.appendChild(script)

// 替代方案：使用 innerHTML
element.innerHTML = '<p>内容</p>'

// 替代方案：使用 DOM API
const p = document.createElement('p')
p.textContent = '内容'
element.appendChild(p)
```

## 附录

### Document API 速查表

#### 属性分类

| 分类 | 主要属性 |
|------|----------|
| 快捷访问 | `documentElement`, `head`, `body`, `activeElement` |
| 集合 | `links`, `forms`, `images`, `scripts`, `styleSheets` |
| URL | `URL`, `baseURI`, `location`, `referrer` |
| 状态 | `readyState`, `hidden`, `visibilityState` |
| 全屏 | `fullscreenElement`, `fullscreenEnabled` |

#### 方法分类

| 分类 | 主要方法 |
|------|----------|
| 查询 | `getElementById`, `querySelector`, `querySelectorAll` |
| 创建 | `createElement`, `createTextNode`, `createDocumentFragment` |
| 遍历 | `createNodeIterator`, `createTreeWalker` |
| 事件 | `addEventListener`, `removeEventListener`, `dispatchEvent` |
| 选区 | `getSelection` |

### 相关文档

- [Node 接口](01-Node%20接口.md) - 节点基础接口
- [Element 接口](03-Element.md) - 元素节点详解
- [事件处理](07-事件机制.md) - 事件机制深入
- [性能优化最佳实践](10-性能优化最佳实践.md) - DOM 性能优化
