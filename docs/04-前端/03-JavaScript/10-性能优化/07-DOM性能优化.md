---
title: DOM性能优化
description: "系统讲解 DOM 性能优化：回流/重绘/合成的触发条件与浏览器 Flush 队列、读写分离规避强制同步布局、DocumentFragment/事件委托/虚拟列表等批量操作手段。"
keywords: [DOM性能优化]
category: JavaScript
tags: [JavaScript, 性能优化, DOM, 渲染]
---


# DOM 性能优化

> DOM 操作是前端性能优化的核心战场。理解"DOM 为什么慢"以及浏览器渲染原理，是进行高效优化的前提。

## 回流与重绘

### 什么是回流与重绘

#### 回流（Reflow / Layout）

当 DOM 的修改影响了元素的**几何属性**（宽高、位置、隐藏等）时，浏览器需要重新计算布局。

```
DOM 几何属性变化 → 重新计算布局 → 更新渲染树 → 重绘
```

#### 重绘（Repaint / Paint）

当 DOM 的修改仅影响**外观样式**（颜色、背景、阴影等）而不影响几何属性时，浏览器只需重新绘制受影响的元素。

```
DOM 样式变化（非几何）→ 跳过回流 → 直接重绘
```

#### 两者的关系

```
回流 ──→ 必然触发重绘（因为位置变了需要重画）
重绘 ──→ 不一定触发回流（可能只改了颜色等）
```

**性能代价：回流 >> 重绘**

| 类型 | 说明 | 性能影响 |
|------|------|----------|
| **回流（Reflow）** | 元素几何属性变化，重新计算布局 | 高 |
| **重绘（Repaint）** | 元素外观变化，不影响布局 | 中 |
| **合成（Composite）** | 仅合成层变化，不影响布局和绘制 | 低 |

#### 渲染流程与关键路径

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│     DOM     │   │    CSSOM    │   │  Render     │
│   解析 HTML  │ + │   解析 CSS  │ = │    Tree     │
└─────────────┘   └─────────────┘   └─────────────┘
                                            │
                                            ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Display   │   │   Composite │   │    Layout   │
│    显示     │ ← │    合成     │ ← │   布局      │
└─────────────┘   └─────────────┘   └─────────────┘
```

| 阶段 | 说明 | 触发条件 |
|------|------|----------|
| 构建 DOM 树 | 解析 HTML | HTML 文档 |
| 构建 CSSOM 树 | 解析 CSS | style 标签、外部 CSS |
| 构建 Render 树 | DOM + CSSOM | DOM 和 CSSOM 完成 |
| Layout（布局） | 计算元素位置和大小 | 几何属性变化 |
| Paint（绘制） | 绘制像素到屏幕 | 外观属性变化 |
| Composite（合成） | 合成图层 | transform、opacity |

#### 渲染层与合成层

```
┌─────────────────────────────────────┐
│           GPU 合成层                 │
│  ┌──────────┐  ┌──────────┐         │
│  │  Layer 1 │  │  Layer 2 │  ...    │
│  │ transform│  │  opacity │         │
│  └──────────┘  └──────────┘         │
└─────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│           CPU 渲染层                 │
│  普通元素（会触发回流/重绘）          │
└─────────────────────────────────────┘
```

**提升为合成层的属性：**
- `transform`（3D 变换）
- `opacity`
- `filter`
- `will-change`

### 触发回流的操作

#### 几何属性变更与 DOM 结构变更

| 类别 | 具体操作 |
|------|----------|
| **几何属性变更** | width, height, padding, margin, border, top, left, display: none→block 等 |
| **DOM 结构变更** | 增删节点、移动节点位置、修改文字内容 |
| **获取布局信息** | offsetWidth/Height, scrollWidth/Height, clientWidth/Height, getBoundingClientRect(), getComputedStyle() |
| **窗口变化** | 窗口 resize、字体加载完成（普通滚动不改变布局，不触发回流） |

```javascript
// 布局属性变化
element.style.width = '100px';
element.style.height = '100px';
element.style.margin = '10px';
element.style.padding = '10px';
element.style.display = 'none';

// DOM 结构变化
parent.appendChild(child);
parent.removeChild(child);

// 读取布局属性（强制同步布局）
const width = element.offsetWidth;
const height = element.offsetHeight;
const rect = element.getBoundingClientRect();
const style = getComputedStyle(element);
```

#### 触发重绘的操作

| 操作 | 说明 |
|------|------|
| 颜色修改 | color, background-color, border-color 等 |
| 可见性 | visibility（注意与 display 区别） |
| 背景相关 | background-image, background-position 等 |
| 阴影/圆角 | box-shadow, border-radius 等 |
| 伪类状态 | :hover, :active 等触发的样式变化 |

```javascript
// 外观属性变化（不改变布局）
element.style.color = 'red';
element.style.backgroundColor = 'blue';
element.style.visibility = 'hidden';
element.style.textDecoration = 'underline';
element.style.boxShadow = '0 0 10px black';
```

#### 仅触发合成的操作

```javascript
// 推荐使用 transform 和 opacity 做动画
element.style.transform = 'translateX(100px)';
element.style.transform = 'scale(1.5)';
element.style.opacity = '0.5';
```

#### 浏览器的 Flush 队列机制

现代浏览器会自动将短时间内的多次回流/重绘操作**批量合并**：

```javascript
const el = document.getElementById("container")
el.style.width = "100px"    // 加入 flush 队列
el.style.height = "200px"   // 加入 flush 队列
el.style.border = "10px solid red"  // 加入 flush 队列
el.style.color = "red"      // 加入 flush 队列
// 浏览器在适当时机统一处理队列 → 实际只有 1 次回流 + 1 次重绘
```

**但有一种情况会强制刷新队列**——读取以下"敏感属性"时会立即执行队列中待处理的任务：

```
offsetTop, offsetLeft, offsetWidth, offsetHeight
scrollTop, scrollLeft, scrollWidth, scrollHeight
clientTop, clientLeft, clientWidth, clientHeight
getComputedStyle()
getBoundingClientRect()
```

这就是为什么在循环内读取 `offsetTop` 会导致严重性能问题——它迫使浏览器在每次读取前先处理完所有排队的回流任务。

> **既然浏览器已经做了批处理优化，为什么还要手动规避？**
> 1. **不是所有浏览器都聪明** — Chrome 做得好不代表旧版浏览器也做得好
> 2. **Flush 队列有上限** — 大量操作仍可能导致频繁刷新
> 3. **养成良好的编码习惯** — 从根源上解决问题是最周全的方法

### 如何减少回流与重绘

#### 1. 合并样式修改（使用 class 批量更新）

```javascript
// ❌ 逐条修改样式（多次触发回流/重绘）
element.style.width = '100px';
element.style.height = '100px';
element.style.margin = '10px';
element.style.padding = '10px';

// ✅ 使用 class 一次性修改
element.classList.add('active');

// ✅ 使用 cssText
element.style.cssText = 'width: 100px; height: 100px; margin: 10px; padding: 10px;';
```

#### 2. 使用 DocumentFragment

DocumentFragment 是一个轻量级的文档容器，对其的操作不会触发真实 DOM 的回流/重绘：

```javascript
// ❌ 每次添加都触发回流
const list = document.getElementById('list');
for (let i = 0; i < 100; i++) {
  const item = document.createElement('li');
  item.textContent = i;
  list.appendChild(item); // 100 次回流
}

// ✅ 使用 DocumentFragment
const fragment = document.createDocumentFragment();
for (let i = 0; i < 100; i++) {
  const item = document.createElement('li');
  item.textContent = i;
  fragment.appendChild(item); // 向 Fragment 添加，不触发回流
}
list.appendChild(fragment); // 仅触发一次回流
```

> **DocumentFragment 特性**：`appendChild` 时它会"全身而退"，自身不会出现在 DOM 树中，只将其子节点转移过去。Vue、jQuery 等框架内部大量使用此技术。

#### 3. 脱离文档流修改

```javascript
// ✅ 方案1：隐藏元素后修改
element.style.display = 'none';
// 进行大量 DOM 操作（不会触发回流/重绘）
element.style.width = '100px';
element.style.height = '200px';
element.style.border = '10px solid red';
element.style.color = 'red';
element.style.display = 'block'; // 仅触发 2 次回流（隐藏时1次+显示时1次）

// ✅ 方案2：克隆节点
const clone = element.cloneNode(true);
// 在克隆上操作
clone.appendChild(newChild);
clone.style.width = '200px';
// 替换原节点
element.parentNode.replaceChild(clone, element);
```

> **原理**：`display: none` 的元素不在渲染树中，对其的任何修改都不会触发回流/重绘。适用于大量连续 DOM 操作的场景。

#### 4. 读写分离（缓存布局信息）

```javascript
// ❌ 读写混合，强制同步布局
element.style.width = '100px';       // 写入
const width = element.offsetWidth;   // 读取（强制回流）
element.style.height = width + 'px'; // 写入

// ❌ 循环内读取敏感属性（每次循环都强制回流）
const el = document.getElementById("box")
for (let i = 0; i < 10; i++) {
  el.style.top = el.offsetTop + 10 + "px"   // 读取 offsetTop 触发回流
  el.style.left = el.offsetLeft + 10 + "px" // 读取 offsetLeft 触发回流
}

// ✅ 读写分离：先统一读取，再统一写入
const el = document.getElementById("box")
let top = el.offsetTop   // 一次性读取
let left = el.offsetLeft // 一次性读取

for (let i = 0; i < 10; i++) {
  top += 10
  left += 10
}

el.style.top = top + "px"    // 只写入一次
el.style.left = left + "px"  // 只写入一次
```

#### 5. 使用 requestAnimationFrame

```javascript
// ❌ 同步布局
function updateElements(elements) {
  elements.forEach(element => {
    const width = element.offsetWidth;
    element.style.height = width * 0.5 + 'px';
  });
}

// ✅ 使用 requestAnimationFrame 批量处理
function updateElements(elements) {
  // 批量读取
  const widths = elements.map(el => el.offsetWidth);

  // 在下一帧批量写入
  requestAnimationFrame(() => {
    elements.forEach((element, index) => {
      element.style.height = widths[index] * 0.5 + 'px';
    });
  });
}
```

#### 6. 使用 CSS transform 替代几何属性动画

```css
/* ❌ 改变 left/top 会触发每一帧的回流 */
.moving-box {
  position: absolute;
  left: 0;
  transition: left 0.3s linear;
}

/* ✅ 使用 transform 只触发合成（GPU 加速），不触发回流 */
.moving-box {
  transform: translateX(0);
  transition: transform 0.3s linear;
}
```

**可使用 GPU 加速的属性**：
- `transform`: translate / scale / rotate / skew
- `opacity`
- `filter`
- `will-change`（提前声明即将变化的属性）

---

## DOM 操作优化

### DOM 操作的性能瓶颈

#### "过路费"问题

```
┌─────────────┐     桥接接口      ┌─────────────┐
│   JS 引擎    │ ←────────────→ │   渲染引擎   │
│  (V8 等)    │   (过路费开销)  │ (Blink 等)  │
└─────────────┘                 └─────────────┘
```

JS 引擎和渲染引擎是**独立实现**的模块。每次 JS 操作 DOM 都需要通过桥接接口（C++ 层）进行跨模块通信——这就是"过路费"。频繁的 DOM 操作 = 频繁地交过路费 = 性能问题。

DOM 修改 → 触发渲染树变化 → 可能触发回流/重绘 → 带来额外性能开销。

### 批量 DOM 操作

#### 在 JS 中拼接完成后一次性写入

```javascript
// ❌ 循环中反复修改 DOM（10000 次回流/重绘）
const container = document.getElementById("container")
for (let i = 0; i < 10000; i++) {
  container.innerHTML += `<span>内容 ${i}</span>`
}

// ✅ 在 JS 中拼接完成，一次性写入 DOM
const container = document.getElementById("container")
let content = ""
for (let i = 0; i < 10000; i++) {
  content += `<span>内容 ${i}</span>`
}
container.innerHTML = content // 只触发一次 DOM 更新
```

#### innerHTML vs createElement

```javascript
// innerHTML：适合大量静态内容
// 优点：代码简洁，一次性插入
// 缺点：安全问题（XSS），事件绑定丢失
container.innerHTML = `
  <div class="item">Item 1</div>
  <div class="item">Item 2</div>
`;

// createElement：适合动态内容、需要事件绑定
// 优点：安全，可绑定事件
// 缺点：代码较多
const item = document.createElement('div');
item.className = 'item';
item.textContent = 'Item 1';
item.addEventListener('click', handleClick);
container.appendChild(item);

// 推荐：大量节点用 innerHTML 拼接；少量节点用 createElement 更结构化
```

#### DOM 操作最佳实践清单

| 策略 | 说明 |
|------|------|
| **缓存引用** | 将 DOM 查询结果存储在变量中复用 |
| **批量更新** | 多次修改合并为一次操作 |
| **DocumentFragment** | 离线操作 DOM 批量节点 |
| **innerHTML vs createElement** | 大量节点用 innerHTML 拼接；少量节点用 createElement 更结构化 |
| **cloneNode** | 复制已有节点比创建新节点更快 |
| **firstChild / nextSibling** | 遍历子节点时比 childNodes 高效 |

### 虚拟 DOM 与 Diff 算法

虚拟 DOM 是现代前端框架（React、Vue 等）解决 DOM 操作性能问题的核心方案。其核心思想是：用 JS 对象描述 DOM 结构，通过 Diff 算法计算最小变更，再批量更新真实 DOM。

```
状态变化 → 生成新虚拟 DOM 树 → Diff 对比 → 最小补丁集 → 批量更新真实 DOM
```

**优势**：
- 将多次 DOM 操作合并为一次批量更新
- 通过 Diff 算法只更新变化的部分，避免全量重绘
- 跨平台能力（React Native、SSR 等）

### 事件委托

```javascript
// ❌ 为每个元素绑定事件（内存占用大）
document.querySelectorAll('.item').forEach(item => {
  item.addEventListener('click', handleClick);
});

// ✅ 使用事件委托（只需一个事件监听器）
document.getElementById('list').addEventListener('click', (e) => {
  // 事件冒泡处理
  if (e.target.classList.contains('item')) {
    handleClick(e);
  }
});

// ✅ 更精确的委托（使用 closest）
document.getElementById('list').addEventListener('click', (e) => {
  const item = e.target.closest('.item');
  if (item) {
    const id = item.dataset.id;
    handleClick({ ...e, target: item, id });
  }
});
```

**事件委托优势：**

| 特性 | 传统绑定 | 事件委托 |
|------|----------|----------|
| 内存占用 | n 个监听器 | 1 个监听器 |
| 动态元素 | 需要重新绑定 | 自动生效 |
| 代码复杂度 | 简单 | 中等 |

#### 被动事件监听

```javascript
// ✅ 提高滚动性能
document.addEventListener('touchstart', handler, { passive: true });
document.addEventListener('touchmove', handler, { passive: true });
document.addEventListener('wheel', handler, { passive: true });

// passive: true 告诉浏览器不会调用 preventDefault()
// 允许浏览器在事件处理函数执行前就开始滚动
```

#### 节制高频事件

```javascript
// ❌ 直接绑定高频事件
window.addEventListener('scroll', handleScroll);

// ✅ 使用节流
import { throttle } from './utils';
window.addEventListener('scroll', throttle(handleScroll, 100));

// ✅ 使用 requestAnimationFrame
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      handleScroll();
      ticking = false;
    });
    ticking = true;
  }
});
```

---

## DOM 查询优化

### 缓存 DOM 查询结果

每次 DOM 查询都要通过桥接接口与渲染引擎通信，频繁查询等于频繁交"过路费"。

```javascript
// ❌ 每次循环都查询 DOM（10000 次"过路费"）
for (let i = 0; i < 10000; i++) {
  document.getElementById("container").innerHTML += "<span>内容</span>"
}

// ✅ 缓存 DOM 引用（只查一次）
const container = document.getElementById("container")
for (let i = 0; i < 10000; i++) {
  container.innerHTML += "<span>内容</span>"
}
```

### 选择器优化

不同选择器的查询效率差异显著，选择器越具体、层级越浅，查询越快。

```javascript
// ❌ 低效选择器
document.querySelectorAll('div.container ul li a.link') // 层级太深
document.querySelector('[data-type="item"]')            // 属性选择器较慢

// ✅ 高效选择器
document.getElementById('itemId')   // 最快：O(1) 查找
document.getElementsByClassName('item') // 较快：基于类名索引
document.querySelector('#container .item') // 合理使用 ID 缩小范围
```

**选择器性能排序**（从快到慢）：

| 选择器类型 | 示例 | 速度 |
|-----------|------|------|
| ID 选择器 | `getElementById` | 最快 |
| 类名选择器 | `getElementsByClassName` | 快 |
| 标签选择器 | `getElementsByTagName` | 较快 |
| 复合 CSS 选择器 | `querySelector` | 较慢 |
| 通用/属性选择器 | `querySelectorAll('*')` | 最慢 |

**优化原则**：
- 优先使用 `getElementById`、`getElementsByClassName` 等原生方法
- 避免过深的 DOM 层级遍历
- 缩小查询范围：先定位父容器，再在范围内查找
- 缓存查询结果，避免重复查询同一元素

---

## 虚拟列表

### 原理说明

```
┌─────────────────────────────────────┐
│          可视区域                    │
│  ┌─────────────────────────────┐   │
│  │  Item 1                     │   │
│  │  Item 2                     │   │
│  │  Item 3                     │   │
│  │  Item 4                     │   │
│  └─────────────────────────────┘   │
│                                     │
│  上缓冲区                           │
│  下缓冲区                           │
└─────────────────────────────────────┘

实际渲染：10000 条数据 → 只渲染 ~20 条可见项
```

### 完整实现

```javascript
class VirtualList {
  constructor(container, options) {
    this.container = container;
    this.itemHeight = options.itemHeight;
    this.renderItem = options.renderItem;
    this.data = options.data;
    this.bufferSize = options.bufferSize || 5;

    this.visibleStart = 0;
    this.visibleEnd = 0;
    this.scrollTop = 0;

    this.init();
  }

  init() {
    // 计算可视区域可容纳的条目数
    this.viewHeight = this.container.clientHeight;
    this.visibleCount = Math.ceil(this.viewHeight / this.itemHeight);
    this.visibleEnd = this.visibleCount + this.bufferSize;

    // 占位元素撑起滚动高度
    this.phantom = document.createElement('div');
    this.phantom.style.height = `${this.data.length * this.itemHeight}px`;
    this.container.appendChild(this.phantom);

    // 内容层绝对定位，随滚动移动
    this.content = document.createElement('div');
    this.content.style.position = 'absolute';
    this.content.style.top = '0';
    this.content.style.width = '100%';
    this.container.appendChild(this.content);

    this.container.addEventListener('scroll', () => this.onScroll());
    this.render();
  }

  onScroll() {
    this.scrollTop = this.container.scrollTop;
    this.visibleStart = Math.floor(this.scrollTop / this.itemHeight) - this.bufferSize;
    this.visibleStart = Math.max(0, this.visibleStart);
    this.visibleEnd = this.visibleStart + this.visibleCount + this.bufferSize * 2;
    this.render();
  }

  render() {
    // 只渲染可视区域的条目
    const fragment = document.createDocumentFragment();
    for (let i = this.visibleStart; i < this.visibleEnd && i < this.data.length; i++) {
      fragment.appendChild(this.renderItem(this.data[i], i));
    }
    this.content.innerHTML = '';
    this.content.appendChild(fragment);
    this.content.style.transform = `translateY(${this.visibleStart * this.itemHeight}px)`;
  }
}

// 使用示例
const list = new VirtualList(document.getElementById('list'), {
  itemHeight: 40,
  data: new Array(10000).fill(null).map((_, i) => ({ text: `Item ${i}` })),
  renderItem: (item) => {
    const div = document.createElement('div');
    div.className = 'list-item';
    div.textContent = item.text;
    return div;
  }
});
```

### 性能对比

（下表为示意量级，实测数据因设备与内容而异）

| 数据量 | 传统渲染 | 虚拟列表 |
|--------|----------|----------|
| 100 条 | ~16ms | ~16ms |
| 1000 条 | ~150ms | ~16ms |
| 10000 条 | ~1500ms | ~16ms |

---

## 懒加载

### 图片懒加载

```javascript
// ✅ 使用 IntersectionObserver（推荐）
const images = document.querySelectorAll('img[data-src]');

const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      observer.unobserve(img);
    }
  });
}, {
  rootMargin: '50px 0px', // 提前 50px 开始加载
  threshold: 0.01
});

images.forEach(img => imageObserver.observe(img));

// ✅ 原生懒加载（HTML5）
// <img src="image.jpg" loading="lazy" alt="描述">
```

### 组件懒加载

```javascript
// React 懒加载
import React, { Suspense, lazy } from 'react';

const LazyComponent = React.lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}

// Vue 懒加载
const LazyComponent = () => import('./HeavyComponent.vue');

export default {
  components: {
    LazyComponent
  }
};
```

### 路由懒加载

```javascript
// React Router
const routes = [
  {
    path: '/dashboard',
    component: React.lazy(() => import('./pages/Dashboard'))
  },
  {
    path: '/settings',
    component: React.lazy(() => import('./pages/Settings'))
  }
];

// Vue Router
const routes = [
  {
    path: '/dashboard',
    component: () => import('./views/Dashboard.vue')
  }
];
```

---

## 动画优化

### 使用 transform 代替位置属性

```css
/* ❌ 触发回流 */
.box {
  position: absolute;
  animation: move 1s;
}

@keyframes move {
  to {
    left: 100px;
    top: 100px;
  }
}

/* ✅ 仅触发合成 */
.box {
  animation: move 1s;
}

@keyframes move {
  to {
    transform: translate(100px, 100px);
  }
}
```

### 使用 will-change 提示浏览器

```css
/* 提示浏览器即将发生的变化 */
.animated-element {
  will-change: transform, opacity;
}

/* 动画结束后移除 */
.animated-element:not(.animating) {
  will-change: auto;
}
```

### 使用 CSS 硬件加速

```css
.gpu-accelerated {
  /* 触发 GPU 加速 */
  transform: translateZ(0);
  /* 或者 */
  will-change: transform;
  /* 或者 */
  backface-visibility: hidden;
}
```

---

## 性能监控

### 检测回流重绘

```javascript
// Chrome DevTools Performance 面板
// 可以看到 Layout、Paint、Composite 的详细信息

// 使用 Performance API 监控
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.entryType === 'layout-shift') {
      console.log('布局偏移:', entry.value);
    }
  }
});

observer.observe({ type: 'layout-shift', buffered: true });
```

### 检测长任务

```javascript
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    console.log('长任务:', {
      duration: entry.duration,
      name: entry.name,
      startTime: entry.startTime
    });
  }
});

observer.observe({ type: 'longtask', buffered: true });
```

---

## 常见问题解答

### Q1: 如何判断页面是否需要 DOM 优化？

判断指标：

```javascript
// 1. DOM 节点数量
const nodeCount = document.getElementsByTagName('*').length;
console.log('DOM 节点数:', nodeCount);
// 建议: < 1500 个节点

// 2. DOM 深度
function getDepth(element, depth = 0) {
  if (!element.children.length) return depth;
  return Math.max(...Array.from(element.children).map(child => getDepth(child, depth + 1)));
}
console.log('DOM 深度:', getDepth(document.body));
// 建议: < 15 层

// 3. 布局偏移
let clsScore = 0;
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (!entry.hadRecentInput) {
      clsScore += entry.value;
    }
  }
}).observe({ type: 'layout-shift' });
// CLS 应该 < 0.1
```

### Q2: innerHTML 和 createElement 哪个更好？

使用场景对比：

```javascript
// innerHTML：适合大量静态内容
// 优点：代码简洁，一次性插入
// 缺点：安全问题（XSS），事件绑定丢失
container.innerHTML = `
  <div class="item">Item 1</div>
  <div class="item">Item 2</div>
`;

// createElement：适合动态内容、需要事件绑定
// 优点：安全，可绑定事件
// 缺点：代码较多
const item = document.createElement('div');
item.className = 'item';
item.textContent = 'Item 1';
item.addEventListener('click', handleClick);
container.appendChild(item);

// 推荐：静态内容用 innerHTML，动态内容用 createElement
```

### Q3: 何时使用 DocumentFragment？

使用场景：

```javascript
// 场景1：批量插入多个元素
const fragment = document.createDocumentFragment();
items.forEach(item => {
  const div = document.createElement('div');
  div.textContent = item.text;
  fragment.appendChild(div);
});
container.appendChild(fragment);

// 场景2：移动多个元素
const fragment = document.createDocumentFragment();
Array.from(oldContainer.children).forEach(child => {
  fragment.appendChild(child);
});
newContainer.appendChild(fragment);

// 注意：DocumentFragment 插入后会自动清空
```

### Q4: 如何优化大量数据的表格渲染？

推荐方案：

```javascript
// 1. 虚拟滚动（适用于固定行高）
// 2. 分页加载
// 3. 冻结列（使用 position: sticky）

// 分页示例
function renderTable(data, page, pageSize) {
  const start = page * pageSize;
  const end = start + pageSize;
  const pageData = data.slice(start, end);

  // 只渲染当前页数据
  const html = pageData.map(row => `<tr>...</tr>`).join('');
  tbody.innerHTML = html;
}
```

---

## 优化总结

| 优化方式 | 原理 | 效果 |
|---------|------|------|
| 批量 DOM 操作 | 减少操作次数 | ⭐⭐⭐ |
| 读写分离 | 避免强制同步布局 | ⭐⭐⭐ |
| 事件委托 | 减少监听器数量 | ⭐⭐ |
| 虚拟列表 | 减少渲染节点数 | ⭐⭐⭐ |
| 懒加载 | 延迟加载资源 | ⭐⭐⭐ |
| CSS 动画优化 | 使用合成层 | ⭐⭐ |
| 缓存 DOM 查询 | 减少"过路费"开销 | ⭐⭐⭐ |

> 核心原则：少操作、批量操作、读写分离、缓存查询。
