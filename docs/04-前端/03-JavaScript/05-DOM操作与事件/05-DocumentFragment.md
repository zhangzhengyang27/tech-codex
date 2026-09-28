---
title: DocumentFragment
description: "DocumentFragment 是 DOM 中一个特殊的轻量级容器节点，它本身不属于主文档树，却可以承载一组真实的 DOM 节点。借助这个\"离屏容器\"，开发者可以将多次 DOM 读写压缩成一次提交，大幅降低重排与重绘的次数。"
keywords: []
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---


# DocumentFragment

## 系统架构概览

DocumentFragment 是 DOM 中一个特殊的轻量级容器节点，它本身不属于主文档树，却可以承载一组真实的 DOM 节点。借助这个"离屏容器"，开发者可以将多次 DOM 读写压缩成一次提交，大幅降低重排与重绘的次数。

### DocumentFragment 在 DOM 体系中的位置

```
EventTarget (事件目标基类)
    │
    └── Node (节点基类)
            │
            ├── DocumentFragment (文档片段 - 本文档重点)
            │       ├─ 独立于文档树
            │       ├─ 轻量级容器
            │       └─ 批量操作优化器
            │
            ├── Document (文档节点)
            ├── Element (元素节点)
            ├── Text (文本节点)
            └── ... 其他节点类型
```

### DocumentFragment 的继承关系

```
DocumentFragment 继承链：
├─ Node 接口
│  ├─ nodeType = 11 (DOCUMENT_FRAGMENT_NODE)
│  ├─ nodeName = "#document-fragment"
│  └─ 基础节点操作方法
│
└─ ParentNode 接口
   ├─ children 属性
   ├─ firstElementChild 属性
   ├─ lastElementChild 属性
   ├─ childElementCount 属性
   ├─ querySelector() 方法
   ├─ querySelectorAll() 方法
   └─ append() 方法
```

## 概述

DocumentFragment 是轻量级的文档片段，它本身不属于主文档树，却可以承载一组真实的 DOM 节点。借助这个"离屏容器"，我们可以将多次 DOM 读写压缩成一次提交，大幅降低重排与重绘的次数。

```javascript
// 创建 DocumentFragment
const fragment = document.createDocumentFragment()
```

### 核心特性

- **轻量离屏容器**：没有父节点，不触发布局和渲染
- **节点收集器**：可以承载任意数量的子节点，保留节点之间的关系
- **一次性挂载**：插入文档时会整体迁移子节点，减少 DOM 操作次数
- **可复用的结构块**：常用于模板渲染、批量插入、DOM 重排等场景
- **性能优化器**：将多次 DOM 操作合并为一次，降低重排重绘开销

### 核心功能模块

| **模块分类** | **主要功能** | **关键属性/方法** | **使用场景** |
| --- | --- | --- | --- |
| 批量插入 | 一次性插入多个子节点，减少重排 | `append()`, `appendChild()` | 渲染列表、动态内容 |
| 模板克隆 | 从模板生成结构 | `template.content.cloneNode(true)` | Web Components |
| Range 提取 | 从文档提取节点 | `range.extractContents()` | DOM 片段操作 |
| 节点导入 | 跨文档导入 | `document.importNode(fragment, true)` | 跨 iframe 操作 |

### 创建方式

### 方式一：直接创建（推荐）

```
const fragment = document.createDocumentFragment()

// 添加节点
fragment.appendChild(document.createElement('div'))
fragment.append('文本', document.createElement('span'))

// 插入到文档
container.appendChild(fragment)
```

### 方式二：借助 `<template>` 元素

```javascript
// HTML 模板
// <template id="card-template">
//   <div class="card">
//     <h2 class="name"></h2>
//     <p class="email"></p>
//   </div>
// </template>

const template = document.querySelector('#card-template')
const fragment = template.content.cloneNode(true)

// 填充数据
fragment.querySelector('.name').textContent = '张三'
fragment.querySelector('.email').textContent = 'zhangsan@example.com'

// 插入文档
document.body.appendChild(fragment)
```

### 方式三：由 `Range` 生成

```javascript
const range = document.createRange()
range.selectNodeContents(sourceElement)

// 提取内容到 fragment（会从原位置移除）
const fragment = range.extractContents()

// 或者复制内容到 fragment（不影响原位置）
const clonedFragment = range.cloneContents()
```

### 方式四：从现有节点导入

```javascript
// 跨文档导入（如 iframe）
const iframe = document.querySelector('iframe')
const importedFragment = document.importNode(
  iframe.contentDocument.createDocumentFragment(),
  true
)
```

## 属性

### 核心属性总览

#### Node 接口属性

| **属性** | **类型** | **可写** | **描述** |
|----------|----------|----------|----------|
| `nodeType` | Number | 否 | 值为 `11` (Node.DOCUMENT_FRAGMENT_NODE) |
| `nodeName` | String | 否 | 值为 `"#document-fragment"` |
| `nodeValue` | null | 否 | 始终为 `null` |
| `parentNode` | null | 否 | 始终为 `null`（不在文档树中） |
| `childNodes` | NodeList | 否 | 包含所有子节点 |
| `firstChild` | Node | 否 | 第一个子节点，无则返回 `null` |
| `lastChild` | Node | 否 | 最后一个子节点，无则返回 `null` |
| `textContent` | String | 是 | 获取或设置所有文本内容 |

#### ParentNode 接口属性

| **属性** | **类型** | **可写** | **描述** |
|----------|----------|----------|----------|
| `children` | HTMLCollection | 否 | 所有子元素节点 |
| `firstElementChild` | Element | 否 | 第一个子元素，无则返回 `null` |
| `lastElementChild` | Element | 否 | 最后一个子元素，无则返回 `null` |
| `childElementCount` | Number | 否 | 子元素数量 |

### 节点类型判断

```javascript
const fragment = document.createDocumentFragment()

// 方式一：使用 nodeType 常量（推荐）
if (fragment.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
  console.log('这是文档片段')
}

// 方式二：使用 nodeType 数值
if (fragment.nodeType === 11) {
  console.log('这是文档片段')
}

// 方式三：使用 instanceof
if (fragment instanceof DocumentFragment) {
  console.log('这是文档片段')
}

// 方式四：使用 nodeName
if (fragment.nodeName === '#document-fragment') {
  console.log('这是文档片段')
}
```

### 属性使用示例

```javascript
const fragment = document.createDocumentFragment()

// 添加子节点
fragment.appendChild(document.createElement('div'))
fragment.appendChild(document.createElement('span'))
fragment.append('文本内容')

console.log(fragment.nodeType)           // 11
console.log(fragment.nodeName)           // "#document-fragment"
console.log(fragment.parentNode)         // null
console.log(fragment.childNodes.length)  // 3
console.log(fragment.children.length)    // 2 (只有元素节点)
console.log(fragment.childElementCount)  // 2
console.log(fragment.textContent)        // "文本内容"

// 获取第一个子节点
console.log(fragment.firstChild)         // <div>
console.log(fragment.firstElementChild)  // <div>
```

## 方法

### 方法总览

#### Node 接口方法

| **方法** | **参数** | **返回值** | **描述** |
|----------|----------|------------|----------|
| `appendChild(node)` | node: Node | Node | 添加子节点到末尾 |
| `insertBefore(newNode, refNode)` | newNode: Node, refNode: Node | Node | 在参考节点前插入 |
| `removeChild(node)` | node: Node | Node | 移除子节点 |
| `cloneNode(deep)` | deep: boolean | Node | 克隆节点 |
| `append(...nodes)` | nodes: (Node \| String)[] | void | 在末尾添加多个节点/字符串 |
| `prepend(...nodes)` | nodes: (Node \| String)[] | void | 在开头添加多个节点/字符串 |
| `replaceChildren(...nodes)` | nodes: (Node \| String)[] | void | 清空并替换子节点 |
| `querySelector(sel)` | sel: String | Element \| null | 查询匹配选择器的后代元素 |
| `querySelectorAll(sel)` | sel: String | NodeList | 查询所有匹配选择器的后代 |
| `getElementById(id)` | id: String | Element \| null | 通过 ID 查询元素（不推荐） |

### 核心方法详解

#### append() 与 appendChild()

```
const fragment = document.createDocumentFragment()

// 方式一：appendChild（返回被添加的节点）
const div = document.createElement('div')
const returned = fragment.appendChild(div)
console.log(returned === div)  // true

// 方式二：append（可添加多个节点，无返回值）
fragment.append(
  document.createElement('span'),
  '文本内容',
  document.createElement('p')
)

// appendChild 只能添加节点，append 可以添加字符串（自动转为文本节点）
```

#### querySelector() 与 querySelectorAll()

```javascript
// HTML 模板
const template = document.querySelector('#card-template')
const fragment = template.content.cloneNode(true)

// 查询单个元素
const name = fragment.querySelector('.name')
console.log(name)  // <h2 class="name">

// 查询所有元素
const allInputs = fragment.querySelectorAll('input')
console.log(allInputs.length)  // 输入框数量

// 复杂选择器
const firstRequired = fragment.querySelector('input[required]')
```

#### cloneNode() - 克隆片段

```javascript
const original = document.createDocumentFragment()
original.appendChild(document.createElement('div'))

// 浅克隆：只克隆片段本身（空片段）
const shallowClone = original.cloneNode()
console.log(shallowClone.childNodes.length)  // 0

// 深克隆：克隆片段及其所有子节点（推荐）
const deepClone = original.cloneNode(true)
console.log(deepClone.childNodes.length)  // 1
```

### 方法使用示例

```javascript
const fragment = document.createDocumentFragment()

// 创建复杂结构
const ul = document.createElement('ul')
for (let i = 0; i < 5; i++) {
  const li = document.createElement('li')
  li.textContent = `项目 ${i + 1}`
  li.setAttribute('data-index', i)
  ul.appendChild(li)
}
fragment.appendChild(ul)

// 查询操作
const firstLi = fragment.querySelector('li')
const allLis = fragment.querySelectorAll('li')
const thirdLi = fragment.querySelector('li[data-index="2"]')

console.log(firstLi.textContent)     // "项目 1"
console.log(allLis.length)           // 5
console.log(thirdLi.textContent)     // "项目 3"

// 插入操作
const newLi = document.createElement('li')
newLi.textContent = '新项目'
fragment.querySelector('ul').insertBefore(newLi, firstLi)

// 克隆操作
const clonedFragment = fragment.cloneNode(true)
console.log(clonedFragment.querySelector('li').textContent)  // "新项目"
```

## 工作机制

### 生命周期

```
创建 → 填充节点 → 插入文档 → 自动清空
  ↓        ↓          ↓          ↓
内存中   离屏操作   一次性提交   片段为空
```

### 关键行为

1. **创建阶段**：
   - 文档片段处于内存中，不属于文档树
   - 没有父节点，不会触发布局和渲染
   - 不影响页面性能

2. **填充阶段**：
   - 可以添加任意类型的子节点（Element、Text、Comment 等）
   - 子节点会保留原有的属性、事件监听器、数据集
   - 支持查询操作（querySelector）

3. **插入阶段**：
   - 使用 `appendChild(fragment)` 或 `insertBefore(fragment, refNode)`
   - 子节点会被移动到目标位置
   - 片段本身会变为空，可以重新填充

4. **清空阶段**：
   - 插入后片段立即变空
   - `fragment.childNodes.length === 0`
   - 可以重新使用，但需要重新填充节点

### 节点迁移过程

```javascript
// 创建片段并添加节点
const fragment = document.createDocumentFragment()
const div = document.createElement('div')
div.textContent = 'Hello'
fragment.appendChild(div)

console.log(fragment.childNodes.length)  // 1
console.log(div.parentNode)              // DocumentFragment

// 插入到文档
const container = document.querySelector('#container')
container.appendChild(fragment)

console.log(fragment.childNodes.length)  // 0 (片段已空)
console.log(div.parentNode)              // container (节点已迁移)
```

### 性能优势原理

```javascript
// ❌ 低效方式：每次插入都触发重排
for (let i = 0; i < 1000; i++) {
  const div = document.createElement('div')
  container.appendChild(div)  // 触发 1000 次重排
}

// ✅ 高效方式：只触发 1 次重排
const fragment = document.createDocumentFragment()
for (let i = 0; i < 1000; i++) {
  const div = document.createElement('div')
  fragment.appendChild(div)  // 不触发重排
}
container.appendChild(fragment)  // 只触发 1 次重排
```

| **操作方式** | **重排次数** | **重绘次数** | **性能提升** |
|--------------|--------------|--------------|--------------|
| 直接插入 1000 个节点 | 1000 次 | 1000 次 | 基准 |
| 使用 DocumentFragment | 1 次 | 1 次 | 显著提升 |

> 注：重排次数为概念示意（现代浏览器会在同一任务内合并部分布局更新），实际性能差距取决于具体场景与浏览器实现。

## 常见使用模式

### 场景一：批量插入列表

最常见的使用场景，用于高效渲染大量数据。

```javascript
// 基础版本：批量渲染列表
function renderList(items) {
  const fragment = document.createDocumentFragment()

  items.forEach((item, index) => {
    const li = document.createElement("li")
    li.textContent = item
    li.dataset.index = index
    li.className = 'list-item'
    fragment.appendChild(li)
  })

  document.querySelector("#list").appendChild(fragment)
}

// 配合事件委托，避免为每个 li 单独绑定
document.querySelector("#list").addEventListener('click', (e) => {
  const li = e.target.closest('.list-item')
  if (li) {
    console.log('点击项目:', li.dataset.index, li.textContent)
  }
})
```

### 场景二：暂存节点再处理

将节点从 DOM 中移出，处理后重新插入。

```javascript
// 节点排序
function sortList(list) {
  const fragment = document.createDocumentFragment()

  // 1. 将所有节点移到 fragment（离线操作，不触发重排）
  while (list.firstChild) {
    fragment.appendChild(list.firstChild)
  }

  // 2. 在 fragment 中对子节点排序
  const sorted = Array.from(fragment.children).sort((a, b) =>
    a.textContent.localeCompare(b.textContent)
  )

  // 3. 将排序结果重新放回 fragment
  fragment.replaceChildren(...sorted)

  // 4. 一次性插入文档
  list.appendChild(fragment)
}
```

### 场景三：配合 `<template>` 渲染

模板引擎的核心模式，适用于 Web Components。

```javascript
// HTML 模板定义
/*
<template id="user-card-template">
  <div class="user-card">
    <img class="avatar" src="" alt="">
    <div class="info">
      <h3 class="name"></h3>
      <p class="email"></p>
      <span class="role"></span>
    </div>
  </div>
</template>
*/

// 基于模板克隆渲染单个用户卡片
function renderUserCard(user) {
  const template = document.querySelector('#user-card-template')
  const fragment = template.content.cloneNode(true)
  fragment.querySelector('.avatar').src = user.avatar
  fragment.querySelector('.name').textContent = user.name
  fragment.querySelector('.email').textContent = user.email
  fragment.querySelector('.role').textContent = user.role
  return fragment
}

// 批量渲染用户列表
function renderUsers(users) {
  const fragment = document.createDocumentFragment()
  users.forEach(user => {
    fragment.appendChild(renderUserCard(user))
  })
  document.querySelector('#user-container').appendChild(fragment)
}
```

### 场景四：异步批次渲染

处理大量数据时，分批次渲染避免阻塞主线程。

```javascript
// 分批渲染
async function renderInBatches(items, batchSize = 100) {
  const container = document.querySelector('#container')

  for (let i = 0; i < items.length; i += batchSize) {
    const fragment = document.createDocumentFragment()
    const batch = items.slice(i, i + batchSize)

    batch.forEach(item => {
      const div = document.createElement('div')
      div.textContent = item.title
      fragment.appendChild(div)
    })

    // 每批一次性插入，只触发一次重排
    container.appendChild(fragment)

    // 让出主线程，避免长时间阻塞（setTimeout 属于宏任务）
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}
```

### 场景五：DOM 结构重组

在不影响渲染性能的情况下重组 DOM。

```javascript
// 移动节点到新位置
function restructureDOM() {
  const fragment = document.createDocumentFragment()

  // 提取所有需要移动的节点（离线操作）
  const section1 = document.querySelector('#section1')
  const section2 = document.querySelector('#section2')
  fragment.appendChild(section1)
  fragment.appendChild(section2)

  // 在 fragment 中调整顺序
  fragment.appendChild(fragment.querySelector('.first'))

  // 一次性插入到目标容器
  document.querySelector('#main').appendChild(fragment)
}
```

### 场景六：拖拽排序

实现高效的拖拽重新排序。

```javascript
function setupDragAndDrop(list) {
  let draggedItem = null

  list.addEventListener('dragstart', (e) => {
    draggedItem = e.target
  })

  list.addEventListener('dragover', (e) => {
    e.preventDefault()
  })

  list.addEventListener('drop', (e) => {
    e.preventDefault()
    if (!draggedItem) return

    // 找到拖放目标位置的兄弟节点
    const afterElement = getDragAfterElement(list, e.clientY)
    const fragment = document.createDocumentFragment()

    // 离线重排：先把所有项移入 fragment
    const items = Array.from(list.children)
    items.forEach(item => fragment.appendChild(item))

    if (afterElement == null) {
      fragment.appendChild(draggedItem)
    } else {
      fragment.insertBefore(draggedItem, afterElement)
    }

    // 一次性插回，减少重排
    list.appendChild(fragment)
  })
}

// 辅助：根据鼠标位置返回应该插入到的目标节点
function getDragAfterElement(container, y) {
  const draggable = [...container.querySelectorAll('.drag-item:not(.dragging)')]
  return draggable.reduce((closest, child) => {
    const box = child.getBoundingClientRect()
    const offset = y - box.top - box.height / 2
    if (offset < 0 && offset > closest.offset) {
      return { offset, element: child }
    }
    return closest
  }, { offset: Number.NEGATIVE_INFINITY }).element
}
```

## 性能优化最佳实践

### 性能对比

#### 基准测试代码

```javascript
const total = 10000

// 测试 1：使用 DocumentFragment
console.time("DocumentFragment")
{
  const fragment = document.createDocumentFragment()
  for (let i = 0; i < total; i++) {
    const div = document.createElement("div")
    div.textContent = `item-${i}`
    fragment.appendChild(div)
  }
  container.appendChild(fragment)
}
console.timeEnd("DocumentFragment")  // ~15ms

// 测试 2：使用 innerHTML 字符串拼接
console.time("innerHTML")
{
  let html = ""
  for (let i = 0; i < total; i++) {
    html += `<div>item-${i}</div>`
  }
  container.innerHTML = html
}
console.timeEnd("innerHTML")  // ~30ms
```

#### 性能对比表

| **方法** | **1000 节点** | **10000 节点** | **100000 节点** | **内存占用** |
|----------|---------------|----------------|-----------------|--------------|
| DocumentFragment | ~2ms | ~15ms | ~150ms | 低 |
| 直接插入 | ~15ms | ~150ms | ~1500ms | 中 |
| innerHTML | ~3ms | ~30ms | ~300ms | 高 |
| 克隆模板 | ~1ms | ~10ms | ~100ms | 中 |

> 注：上表数值仅为示意（随浏览器、设备与数据特征差异很大），请以自身业务的实测为准；相对关系（Fragment/克隆模板优于逐个插入）是稳定的结论。

### 优化策略

#### 策略一：分批渲染

```javascript
// 对于超大数据集，分批处理避免阻塞
async function renderLargeDataset(items) {
  const batchSize = 100
  const container = document.querySelector('#container')

  for (let i = 0; i < items.length; i += batchSize) {
    const fragment = document.createDocumentFragment()
    const batch = items.slice(i, i + batchSize)

    batch.forEach(item => {
      const div = document.createElement('div')
      div.textContent = item
      fragment.appendChild(div)
    })

    container.appendChild(fragment)

    // 让出主线程，保持响应
    if (i + batchSize < items.length) {
      await new Promise(resolve => requestAnimationFrame(resolve))
    }
  }
}
```

#### 策略二：虚拟滚动

```javascript
// 只渲染可见区域的节点
class VirtualList {
  constructor(container, options = {}) {
    this.container = container
    this.itemHeight = options.itemHeight || 50
    this.items = []
    this.visibleStart = 0
    this.visibleEnd = 0

    this.init()
  }

  init() {
    // 设置容器高度
    this.container.style.position = 'relative'
    this.container.addEventListener('scroll', () => this.onScroll())
    this.render()
  }

  setItems(items) {
    this.items = items
    this.container.style.height = this.items.length * this.itemHeight + 'px'
    this.render()
  }

  onScroll() {
    const scrollTop = this.container.scrollTop
    this.visibleStart = Math.floor(scrollTop / this.itemHeight)
    this.render()
  }

  render() {
    const viewportHeight = this.container.clientHeight
    this.visibleEnd = Math.min(
      this.visibleStart + Math.ceil(viewportHeight / this.itemHeight),
      this.items.length
    )

    // 构建可见区域的 fragment，一次性插入
    const fragment = document.createDocumentFragment()
    for (let i = this.visibleStart; i < this.visibleEnd; i++) {
      const div = document.createElement('div')
      div.textContent = this.items[i]
      div.style.height = this.itemHeight + 'px'
      div.style.position = 'absolute'
      div.style.top = i * this.itemHeight + 'px'
      div.style.width = '100%'
      fragment.appendChild(div)
    }

    // 替换可见区域
    this.container.innerHTML = ''
    this.container.appendChild(fragment)
  }
}
```

#### 策略三：惰性加载

```javascript
// 使用 Intersection Observer 实现懒加载
function setupLazyLoad(container, fetchCallback) {
  const sentinel = document.createElement('div')
  sentinel.className = 'sentinel'
  container.appendChild(sentinel)

  let isLoading = false

  // 加载并插入一批数据
  async function loadMore() {
    if (isLoading) return
    isLoading = true

    const items = await fetchCallback()
    const fragment = document.createDocumentFragment()
    items.forEach(item => {
      const div = document.createElement('div')
      div.textContent = item
      fragment.appendChild(div)
    })

    // 在 sentinel 之前批量插入，只触发一次重排
    container.insertBefore(fragment, sentinel)
    isLoading = false
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadMore()
      }
    })
  })

  observer.observe(sentinel)
}
```

#### 策略四：避免重复查询

```javascript
// ❌ 低效：每次都查询
function renderInefficient(data) {
  const fragment = document.createDocumentFragment()

  data.forEach(item => {
    const template = document.querySelector('#item-template')  // 重复查询
    const clone = template.content.cloneNode(true)
    clone.querySelector('.title').textContent = item.title
    fragment.appendChild(clone)
  })

  container.appendChild(fragment)
}

// ✅ 高效：提前缓存模板
function renderEfficient(data) {
  const template = document.querySelector('#item-template')  // 只查询一次
  const fragment = document.createDocumentFragment()

  data.forEach(item => {
    const clone = template.content.cloneNode(true)
    clone.querySelector('.title').textContent = item.title
    fragment.appendChild(clone)
  })

  container.appendChild(fragment)
}
```

### 性能监控

```javascript
// 性能监控工具
class PerformanceMonitor {
  constructor() {
    this.metrics = {}
  }

  start(name) {
    this.metrics[name] = performance.now()
  }

  end(name) {
    if (this.metrics[name]) {
      const duration = performance.now() - this.metrics[name]
      delete this.metrics[name]
      return duration
    }
    return null
  }
}

const monitor = new PerformanceMonitor()

monitor.start('render')
renderLargeDataset(items)
const duration = monitor.end('render')
console.log(`渲染耗时: ${duration}ms`)
```

## 常见陷阱与注意事项

### 陷阱一：插入后片段为空

**问题**：`parent.appendChild(fragment)` 会把子节点转移走，片段瞬间变空。

```javascript
const fragment = document.createDocumentFragment()
const div = document.createElement('div')
div.textContent = 'Hello'
fragment.appendChild(div)

console.log(fragment.childNodes.length)  // 1

container.appendChild(fragment)

console.log(fragment.childNodes.length)  // 0 ⚠️ 片段已空
```

**解决方案**：如需重复使用，需要重新填充或克隆。

```javascript
// 方案一：重新填充
for (let i = 0; i < 3; i++) {
  const fragment = document.createDocumentFragment()
  fragment.appendChild(createElement())
  container.appendChild(fragment)
}

// 方案二：克隆后插入
const fragment = document.createDocumentFragment()
// ... 填充节点

const clone = fragment.cloneNode(true)
container1.appendChild(fragment)
container2.appendChild(clone)
```

### 陷阱二：`textContent` 会清空所有子节点

**问题**：调用 `textContent` 会移除所有子节点。

```javascript
const fragment = document.createDocumentFragment()
fragment.appendChild(document.createElement('div'))
fragment.appendChild(document.createElement('span'))

console.log(fragment.children.length)  // 2

fragment.textContent = '文本内容'

console.log(fragment.children.length)  // 0 ⚠️ 子节点被清空
console.log(fragment.childNodes.length)  // 1 (只有文本节点)
```

**解决方案**：使用前先克隆保护原始结构。

```javascript
const fragment = document.createDocumentFragment()
// ... 填充节点

const backup = fragment.cloneNode(true)  // 保护原始结构
fragment.textContent = '文本内容'
```

### 陷阱三：无法在片段上读取布局信息

**问题**：离屏节点的尺寸通常为 0。

```javascript
const fragment = document.createDocumentFragment()
const div = document.createElement('div')
div.style.width = '100px'
div.style.height = '50px'
fragment.appendChild(div)

console.log(div.offsetWidth)   // 0 ⚠️ 离屏节点无尺寸
console.log(div.clientHeight)  // 0 ⚠️ 无法测量
```

**解决方案**：先插入文档或使用虚拟渲染。

```javascript
// 方案一：临时插入测量
const fragment = document.createDocumentFragment()
const div = document.createElement('div')
div.style.width = '100px'
div.style.height = '50px'
div.style.position = 'absolute'
div.style.visibility = 'hidden'
fragment.appendChild(div)

document.body.appendChild(fragment)
console.log(div.offsetWidth)   // 100 ✓
console.log(div.clientHeight)  // 50 ✓
document.body.removeChild(div)

// 方案二：使用虚拟渲染策略
function measureVirtualNode(html) {
  const container = document.createElement('div')
  container.style.position = 'absolute'
  container.style.visibility = 'hidden'
  container.innerHTML = html
  document.body.appendChild(container)

  const rect = container.getBoundingClientRect()
  document.body.removeChild(container)

  return rect
}
```

### 陷阱四：事件监听需要特殊处理

**问题**：片段本身不接收事件，事件监听器需要在最终容器上委托。

```javascript
const fragment = document.createDocumentFragment()

// ❌ 错误：片段无法接收事件
fragment.addEventListener('click', () => {
  console.log('不会触发')
})

// ✅ 正确：在最终容器上使用事件委托
const container = document.querySelector('#container')
container.addEventListener('click', (e) => {
  if (e.target.matches('.item')) {
    console.log('项目被点击:', e.target)
  }
})

container.appendChild(fragment)
```

### 陷阱五：`getElementById` 不推荐使用

**问题**：虽然 DocumentFragment 支持 `getElementById`，但不推荐使用。

```javascript
const fragment = document.createDocumentFragment()
const div = document.createElement('div')
div.id = 'myDiv'
fragment.appendChild(div)

// 可以使用，但不推荐
const found = fragment.getElementById('myDiv')  // ⚠️ 不推荐

// 推荐使用 querySelector
const better = fragment.querySelector('#myDiv')  // ✓ 推荐
```

### 陷阱六：IE 兼容性问题

**问题**：IE9+ 支持核心功能，但某些方法不支持。

```javascript
// IE 不支持的方法
// - append()
// - prepend()
// - querySelector() (IE9+ 支持)
// - querySelectorAll() (IE9+ 支持)

// 兼容性解决方案
if (!DocumentFragment.prototype.append) {
  DocumentFragment.prototype.append = function(...nodes) {
    nodes.forEach(node => {
      this.appendChild(
        typeof node === 'string' ? document.createTextNode(node) : node
      )
    })
  }
}
```

## 相关 API

| **API** | **描述** | **兼容性** |
|---------|---------|-----------|
| `Document.createDocumentFragment()` | 创建文档片段 | 所有浏览器 |
| `Node.append()` | 添加多个节点 | IE 不支持 |
| `Node.appendChild()` | 添加单个节点 | 所有浏览器 |
| `Node.replaceChildren()` | 替换所有子节点 | IE 不支持 |
| `Document.importNode()` | 跨文档导入 | 所有浏览器 |
| `DocumentFragment.cloneNode()` | 克隆片段 | 所有浏览器 |
| `Range.createContextualFragment()` | 从字符串创建片段 | 所有浏览器 |

### 浏览器兼容性

| 浏览器 | `createDocumentFragment()` | `appendChild()` | `append()` | `replaceChildren()` |
|--------|---------------------------|-----------------|------------|---------------------|
| Chrome | 1+ ✓ | 1+ ✓ | 54+ ✓ | 86+ ✓ |
| Firefox | 1+ ✓ | 1+ ✓ | 49+ ✓ | 78+ ✓ |
| Safari | 3.2+ ✓ | 3.2+ ✓ | 10+ ✓ | 14+ ✓ |
| Edge | 12+ ✓ | 12+ ✓ | 17+ ✓ | 86+ ✓ |
| IE | 9+ ✓ | 9+ ✓ | ✗ | ✗ |
| iOS Safari | 3.2+ ✓ | 3.2+ ✓ | 10+ ✓ | 8+ ✓ |
| Android | 1+ ✓ | 1+ ✓ | 54+ ✓ | 4.4+ ✓ |

### Polyfill 方案

```
// 为 IE 和旧浏览器提供 polyfill
if (!DocumentFragment.prototype.append) {
  DocumentFragment.prototype.append = function(...nodes) {
    nodes.forEach(node => {
      this.appendChild(
        typeof node === 'string' ? document.createTextNode(node) : node
      )
    })
  }
}

if (!DocumentFragment.prototype.prepend) {
  DocumentFragment.prototype.prepend = function(...nodes) {
    const firstChild = this.firstChild
    nodes.reverse().forEach(node => {
      const child = typeof node === 'string' ? document.createTextNode(node) : node
      this.insertBefore(child, firstChild)
    })
  }
}

// template 元素 polyfill（简化版）
if (!('content' in document.createElement('template'))) {
  Object.defineProperty(HTMLTemplateElement.prototype, 'content', {
    get() {
      const fragment = document.createDocumentFragment()
      while (this.firstChild) {
        fragment.appendChild(this.firstChild)
      }
      return fragment
    }
  })
}
```

## 常见问题解答（FAQ）

### Q1: DocumentFragment 与 innerHTML 有什么区别？

**A:** 两者在性能和使用场景上有显著差异：

| **对比项** | **DocumentFragment** | **innerHTML** |
|------------|---------------------|---------------|
| **性能** | 高（离屏操作） | 中（字符串解析） |
| **安全性** | 安全（不解析 HTML） | XSS 风险 |
| **灵活性** | 高（支持事件监听器） | 低（事件会丢失） |
| **适用场景** | 复杂 DOM 结构 | 简单 HTML 字符串 |
| **内存占用** | 低 | 高（字符串拼接） |

```javascript
// DocumentFragment：安全、灵活
const fragment = document.createDocumentFragment()
const button = document.createElement('button')
button.textContent = '点击'
button.addEventListener('click', () => alert('点击'))
fragment.appendChild(button)

// innerHTML：简单、但有风险
const html = '<button onclick="alert(1)">点击</button>'
container.innerHTML = html  // ⚠️ 有 XSS 风险
```

### Q2: 什么时候应该使用 DocumentFragment？

**A:** 以下场景推荐使用：

```javascript
// 场景一：批量插入大量节点
function renderList(items) {
  const fragment = document.createDocumentFragment()
  items.forEach(item => {
    fragment.appendChild(createItem(item))
  })
  container.appendChild(fragment)
}

// 场景二：需要保留事件监听器
const fragment = document.createDocumentFragment()
const button = document.createElement('button')
button.addEventListener('click', handler)
fragment.appendChild(button)

// 场景三：DOM 结构重组
const fragment = document.createDocumentFragment()
while (container.firstChild) {
  fragment.appendChild(container.firstChild)
}
// ... 处理节点
newContainer.appendChild(fragment)

// 不推荐使用的场景：
// 1. 只插入单个节点（性能提升不明显）
// 2. 简单的 HTML 字符串（innerHTML 更快）
// 3. 频繁的小批量更新
```

### Q3: DocumentFragment 能否接收事件？

**A:** 不能。DocumentFragment 本身不在文档树中，无法接收事件。

```javascript
// ❌ 错误：片段无法接收事件
const fragment = document.createDocumentFragment()
fragment.addEventListener('click', handler)  // 无效

// ✅ 正确：在子节点或最终容器上监听
const fragment = document.createDocumentFragment()

// 方式一：在子节点上监听
const div = document.createElement('div')
div.addEventListener('click', handler)
fragment.appendChild(div)

// 方式二：在容器上使用事件委托
container.addEventListener('click', (e) => {
  if (e.target.matches('.item')) {
    handler(e)
  }
})
```

### Q4: 如何在 Web Components 中使用 DocumentFragment？

**A:** DocumentFragment 是 Web Components 中模板复用的核心。

```javascript
// 使用 template 和 slot
class UserCard extends HTMLElement {
  constructor() {
    super()

    // 创建 Shadow DOM
    const shadow = this.attachShadow({ mode: 'open' })

    // 从模板创建片段
    const template = document.querySelector('#user-card-template')
    const fragment = template.content.cloneNode(true)

    // 填充数据
    fragment.querySelector('.name').textContent = this.getAttribute('name')
    fragment.querySelector('.email').textContent = this.getAttribute('email')

    shadow.appendChild(fragment)
  }
}

customElements.define('user-card', UserCard)
```

### Q5: DocumentFragment 与 React/Vue 的虚拟 DOM 有什么关系？

**A:** 它们是不同层面的优化技术：

| **技术** | **优化层面** | **工作原理** |
|----------|--------------|--------------|
| DocumentFragment | DOM 层面 | 合并多次 DOM 操作 |
| 虚拟 DOM | 应用层面 | Diff 算法 + 最小化更新 |
| React Fiber | 调度层面 | 时间切片 + 优先级调度 |

```javascript
// 框架内部会使用 DocumentFragment
// React 示例（简化版）
function renderReactElement(element) {
  const fragment = document.createDocumentFragment()
  // ... 创建 DOM 节点
  fragment.appendChild(domNode)
  return fragment
}

// Vue 示例
function createFragment(vnodes) {
  const fragment = document.createDocumentFragment()
  vnodes.forEach(vnode => {
    fragment.appendChild(createElement(vnode))
  })
  return fragment
}
```

### Q6: 如何在 Node.js 环境中使用 DocumentFragment？

**A:** 需要使用 DOM 模拟库，如 jsdom。

```javascript
// 安装 jsdom
// npm install jsdom

const { JSDOM } = require('jsdom')
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
const { document } = dom.window

// 现在可以使用 DocumentFragment
const fragment = document.createDocumentFragment()
const div = document.createElement('div')
div.textContent = 'Hello Node.js'
fragment.appendChild(div)

console.log(fragment.childNodes.length)  // 1
console.log(fragment.textContent)        // "Hello Node.js"
```

### Q7: DocumentFragment 的内存占用如何？

**A:** DocumentFragment 是轻量级的，内存占用很低。JavaScript 无法直接测量对象的内存占用（下例中的 `sizeof` 为示意伪代码），数值仅为量级示意。

```javascript
// 内存占用测试（示意）
const fragment = document.createDocumentFragment()
console.log(sizeof(fragment))  // 约 32 bytes（基础开销）

// 添加 10000 个节点
for (let i = 0; i < 10000; i++) {
  fragment.appendChild(document.createElement('div'))
}
console.log(sizeof(fragment))  // 约 800KB

// 插入后片段变空，释放引用
container.appendChild(fragment)
console.log(sizeof(fragment))  // 约 32 bytes（回到基础开销）
```

## 综合示例

### 完整示例：性能优化的列表渲染器

```html
<ul id="list"></ul>
<template id="item-template">
  <li class="item"></li>
</template>

<script>
  const items = Array.from({ length: 1000 }, (_, i) => `项目 ${i + 1}`)
  const template = document.querySelector('#item-template')  // 模板只查询一次
  const list = document.querySelector('#list')

  function render(items) {
    const fragment = document.createDocumentFragment()
    items.forEach((text) => {
      const clone = template.content.cloneNode(true)
      clone.querySelector('.item').textContent = text
      fragment.appendChild(clone)
    })
    list.replaceChildren(fragment)  // 一次性挂载
  }

  // 事件委托：监听器只绑定一次，后续新增条目无需重新绑定
  list.addEventListener('click', (e) => {
    const item = e.target.closest('.item')
    if (item) console.log('点击:', item.textContent)
  })

  render(items)
</script>
```

## 总结

### DocumentFragment 核心要点

1. **节点类型**：`nodeType = 11`，`nodeName = "#document-fragment"`
2. **接口继承**：Node → DocumentFragment，实现 ParentNode 接口
3. **核心特性**：轻量离屏容器、节点收集器、一次性挂载
4. **性能优势**：将多次 DOM 操作合并为一次，降低重排重绘开销
5. **使用场景**：批量插入、模板渲染、DOM 重组、虚拟滚动

### 最佳实践速查表

| **场景** | **推荐方法** | **避免做法** |
|----------|--------------|--------------|
| 批量插入节点 | DocumentFragment | 循环 appendChild |
| 模板渲染 | `template.content.cloneNode(true)` | innerHTML 拼接 |
| 大数据渲染 | 分批 + requestAnimationFrame | 一次性渲染 |
| 节点排序/过滤 | 提取到片段处理 | 直接在 DOM 操作 |
| 虚拟滚动 | 片段 + IntersectionObserver | 渲染所有节点 |
| 事件处理 | 事件委托 | 在片段上监听 |

### 性能优化流程图

```
需要批量操作 DOM
    │
    ├─ 是否需要保留事件监听器？
    │   ├─ 是 → 使用 DocumentFragment
    │   └─ 否 → 继续判断
    │
    ├─ 是否有现成的 HTML 字符串？
    │   ├─ 是 → 使用 innerHTML（注意 XSS）
    │   └─ 否 → 使用 DocumentFragment
    │
    ├─ 数据量是否超过 1000？
    │   ├─ 是 → 分批渲染 + 虚拟滚动
    │   └─ 否 → 一次性 DocumentFragment
    │
    └─ 是否需要测量布局？
        ├─ 是 → 临时插入 → 测量 → 移除
        └─ 否 → 直接使用
```

### 技术选型对比

| **技术方案** | **性能** | **安全性** | **灵活性** | **推荐指数** |
|--------------|----------|------------|------------|--------------|
| DocumentFragment | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| innerHTML | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| 直接插入 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| 虚拟 DOM | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

### 使用建议

**✅ 推荐使用场景：**
- 批量插入大量 DOM 节点（100+）
- Web Components 模板渲染
- 虚拟滚动和懒加载
- DOM 结构重组和排序
- 需要保留事件监听器的节点操作

**❌ 不推荐使用场景：**
- 只插入单个节点（性能提升不明显）
- 简单的 HTML 字符串（innerHTML 更快）
- 频繁的小批量更新（考虑其他优化策略）
- 需要在片段上读取布局信息

## 参考资料

### 官方文档

- [MDN: DocumentFragment](https://developer.mozilla.org/zh-CN/docs/Web/API/DocumentFragment)
- [MDN: 使用模板与插槽构建组件](https://developer.mozilla.org/zh-CN/docs/Web/Web_Components/Using_templates_and_slots)
- [MDN: Range API](https://developer.mozilla.org/zh-CN/docs/Web/API/Range)
- [WHATWG DOM Standard: DocumentFragment](https://dom.spec.whatwg.org/#interface-documentfragment)

### 性能优化

- [Google Developers: DOM 性能优化](https://developers.google.com/web/fundamentals/performance/rendering/avoid-large-complex-layouts)
- [MDN: 性能优化指南](https://developer.mozilla.org/zh-CN/docs/Web/Performance)
- [Web Fundamentals: 渲染性能](https://developers.google.com/web/fundamentals/performance/rendering)

### 相关技术

- [React Virtual DOM 原理](https://reactjs.org/docs/faq-internals.html)
- [Vue 模板编译](https://vuejs.org/v2/guide/render-function.html)
- [Web Components 规范](https://www.webcomponents.org/)
- [Intersection Observer API](https://developer.mozilla.org/zh-CN/docs/Web/API/Intersection_Observer_API)
