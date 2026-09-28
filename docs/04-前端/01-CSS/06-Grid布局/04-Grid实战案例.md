---
title: Grid实战案例
description: "通过圣杯布局、响应式导航、卡片网格、仪表盘、图库、表单、页脚、产品页等实战案例掌握 Grid 布局技巧，附 DevTools 调试方法与性能优化清单。"
keywords: [Grid实战案例]
category: CSS
tags: [CSS, 布局, 动画, 响应式]
---


# Grid 实战案例

通过实际案例深入理解 Grid 布局的应用，从简单到复杂，逐步掌握 Grid 布局技巧。

## 页面整体布局

### 圣杯布局

经典的页面三栏布局：

```html
<div class="layout">
  <header class="header">Header</header>
  <aside class="sidebar">Sidebar</aside>
  <main class="main">Main Content</main>
  <aside class="aside">Aside</aside>
  <footer class="footer">Footer</footer>
</div>
```

```css
.layout {
  display: grid;
  grid-template:
    "header header header" 60px
    "sidebar main aside" 1fr
    "footer footer footer" 60px
    / 200px 1fr 200px;
  min-height: 100vh;
  gap: 0;
}

.header { 
  grid-area: header; 
  background: #2c3e50;
  color: white;
  padding: 0 20px;
  display: flex;
  align-items: center;
}

.sidebar { 
  grid-area: sidebar; 
  background: #34495e;
  color: white;
  padding: 20px;
}

.main { 
  grid-area: main; 
  padding: 20px;
  background: #ecf0f1;
}

.aside { 
  grid-area: aside; 
  background: #95a5a6;
  padding: 20px;
}

.footer { 
  grid-area: footer; 
  background: #2c3e50;
  color: white;
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

**布局示意**：

```
┌─────────────────────────────────────┐
│              Header                 │
├──────────┬─────────────┬────────────┤
│          │             │            │
│ Sidebar  │    Main     │   Aside    │
│          │             │            │
├──────────┴─────────────┴────────────┤
│              Footer                 │
└─────────────────────────────────────┘
```

### 响应式圣杯布局

```css
/* 移动端：垂直堆叠 */
.layout {
  display: grid;
  grid-template:
    "header" 60px
    "sidebar" auto
    "main" 1fr
    "aside" auto
    "footer" 60px
    / 1fr;
  min-height: 100vh;
}

/* 平板：两栏布局 */
@media (min-width: 768px) {
  .layout {
    grid-template:
      "header header" 60px
      "sidebar main" 1fr
      "aside aside" auto
      "footer footer" 60px
      / 200px 1fr;
  }
}

/* 桌面：三栏布局 */
@media (min-width: 1024px) {
  .layout {
    grid-template:
      "header header header" 60px
      "sidebar main aside" 1fr
      "footer footer footer" 60px
      / 200px 1fr 200px;
  }
}
```

### 粘性页脚布局

```html
<div class="page">
  <header class="page-header">Header</header>
  <main class="page-content">Content</main>
  <footer class="page-footer">Footer</footer>
</div>
```

```css
.page {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

.page-header {
  /* 自动高度 */
}

.page-content {
  /* 占据剩余所有空间 */
}

.page-footer {
  /* 自动高度，始终在底部 */
}
```

## 卡片网格布局

### 等宽卡片网格

```html
<div class="card-grid">
  <div class="card">Card 1</div>
  <div class="card">Card 2</div>
  <div class="card">Card 3</div>
  <div class="card">Card 4</div>
  <div class="card">Card 5</div>
  <div class="card">Card 6</div>
</div>
```

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

### 响应式卡片网格

```css
/* 自动适应，最小宽度 300px */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}
```

**不同宽度下的表现**：

```
宽屏（>900px）:
┌────────┬────────┬────────┐
│ Card 1 │ Card 2 │ Card 3 │
├────────┼────────┼────────┤
│ Card 4 │ Card 5 │ Card 6 │
└────────┴────────┴────────┘

中屏（600-900px）:
┌────────────┬────────────┐
│   Card 1   │   Card 2   │
├────────────┼────────────┤
│   Card 3   │   Card 4   │
├────────────┼────────────┤
│   Card 5   │   Card 6   │
└────────────┴────────────┘

窄屏（<600px）:
┌──────────────────┐
│     Card 1       │
├──────────────────┤
│     Card 2       │
├──────────────────┤
│     Card 3       │
└──────────────────┘
```

### 不规则卡片网格

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 200px;
  gap: 20px;
}

/* 第一个卡片占 2x2 */
.card:nth-child(1) {
  grid-column: span 2;
  grid-row: span 2;
}

/* 第4个卡片跨两列 */
.card:nth-child(4) {
  grid-column: span 2;
}

/* 每5个一组，第一个大卡片 */
.card:nth-child(5n+1) {
  grid-column: span 2;
  grid-row: span 2;
}
```

## 仪表盘布局

```html
<div class="dashboard">
  <div class="stat-card">Users</div>
  <div class="stat-card">Revenue</div>
  <div class="stat-card">Orders</div>
  <div class="stat-card">Visitors</div>
  <div class="chart">Main Chart</div>
  <div class="chart-small">Pie Chart</div>
  <div class="chart-small">Bar Chart</div>
  <div class="table">Data Table</div>
</div>
```

```css
.dashboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 120px;
  gap: 20px;
  padding: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart {
  grid-column: span 2;
  grid-row: span 2;
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.chart-small {
  grid-row: span 2;
  background: white;
  border-radius: 8px;
  padding: 20px;
}

.table {
  grid-column: span 4;
  grid-row: span 2;
  background: white;
  border-radius: 8px;
  padding: 20px;
  overflow: auto;
}
```

**布局示意**：

```
┌──────┬──────┬──────┬──────┐
│ Stat │ Stat │ Stat │ Stat │
├──────┴──────┼──────┼──────┤
│             │      │      │
│   Chart     │ Pie  │ Bar  │
│             │      │      │
├─────────────┴──────┴──────┤
│                           │
│       Data Table          │
│                           │
└───────────────────────────┘
```

## 图库布局

### 固定网格图库

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.gallery-item {
  aspect-ratio: 1;
  overflow: hidden;
}

.gallery-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

### 瀑布流效果

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 10px;
  gap: 10px;
}

.gallery-item {
  overflow: hidden;
}

/* 根据图片高度设置 span */
.gallery-item:nth-child(1) { grid-row: span 20; }
.gallery-item:nth-child(2) { grid-row: span 30; }
.gallery-item:nth-child(3) { grid-row: span 25; }
.gallery-item:nth-child(4) { grid-row: span 35; }
.gallery-item:nth-child(5) { grid-row: span 20; }
.gallery-item:nth-child(6) { grid-row: span 28; }
```

### 交错布局

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-auto-rows: 150px;
  gap: 15px;
}

/* 每5个项目，第1个跨2x2 */
.gallery-item:nth-child(5n+1) {
  grid-column: span 2;
  grid-row: span 2;
}

/* 每5个项目，第4个跨两列 */
.gallery-item:nth-child(5n+4) {
  grid-column: span 2;
}
```

## 表单布局

### 标签-输入两列表单

```html
<form class="form">
  <label for="name">Name</label>
  <input type="text" id="name">
  
  <label for="email">Email</label>
  <input type="email" id="email">
  
  <label for="phone">Phone</label>
  <input type="tel" id="phone">
  
  <div class="form-actions">
    <button type="submit">Submit</button>
  </div>
</form>
```

```css
.form {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 15px 20px;
  align-items: center;
}

label {
  text-align: right;
  font-weight: 500;
}

input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.form-actions {
  grid-column: 1 / -1;
  justify-self: end;
}
```

### 复杂表单布局

```html
<form class="form">
  <div class="form-group">
    <label>First Name</label>
    <input type="text">
  </div>
  <div class="form-group">
    <label>Last Name</label>
    <input type="text">
  </div>
  <div class="form-group full-width">
    <label>Email</label>
    <input type="email">
  </div>
  <div class="form-group full-width">
    <label>Message</label>
    <textarea></textarea>
  </div>
  <div class="form-actions full-width">
    <button type="submit">Submit</button>
  </div>
</form>
```

```css
.form {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

.form-group {
  display: grid;
  gap: 5px;
}

.full-width {
  grid-column: 1 / -1;
}

textarea {
  min-height: 120px;
  resize: vertical;
}

.form-actions {
  justify-self: end;
}
```

## 文章布局

### 居中阅读布局

```html
<article class="article">
  <h1 class="article-title">Article Title</h1>
  <div class="article-content">
    <p>Content...</p>
  </div>
  <figure class="article-image">
    <img src="image.jpg" alt="">
  </figure>
</article>
```

```css
.article {
  display: grid;
  grid-template-columns: 1fr minmax(0, 700px) 1fr;
  gap: 20px;
}

.article-title,
.article-content {
  grid-column: 2;
}

.article-image {
  grid-column: 1 / -1;
}

.article-image img {
  width: 100%;
}
```

**布局示意**：

```
┌───────────────────────────────────┐
│           Article Image           │
├───────┬─────────────────┬─────────┤
│       │   Article       │         │
│       │   Content       │         │
│       │                 │         │
└───────┴─────────────────┴─────────┘
```

### 杂志风格布局

```css
.magazine {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: minmax(100px, auto);
  gap: 20px;
}

.headline {
  grid-column: span 8;
  font-size: 3rem;
}

.sidebar {
  grid-column: span 4;
  grid-row: span 2;
}

.feature {
  grid-column: span 6;
}

.article {
  grid-column: span 4;
}
```

## 导航布局

### 三段式导航

```html
<nav class="nav">
  <div class="logo">Logo</div>
  <ul class="nav-links">
    <li><a href="#">Home</a></li>
    <li><a href="#">About</a></li>
    <li><a href="#">Contact</a></li>
  </ul>
  <div class="nav-actions">
    <button>Login</button>
  </div>
</nav>
```

```css
.nav {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 20px;
  padding: 0 20px;
  height: 60px;
  background: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
}

.nav-links {
  justify-self: center;
  display: flex;
  gap: 30px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-actions {
  display: flex;
  gap: 10px;
}
```

### 响应式导航

HTML 结构在三段式导航的基础上，额外增加一个 `.menu-toggle` 汉堡按钮：

```css
.nav {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas:
    "logo menu"
    "links links"
    "actions actions";
  gap: 10px;
  padding: 10px 20px;
}

.logo { grid-area: logo; }
.menu-toggle { grid-area: menu; }
.nav-links { grid-area: links; }
.nav-actions { grid-area: actions; }

/* 移动端隐藏链接 */
.nav-links {
  display: none;
}

.nav-links.active {
  display: flex;
  flex-direction: column;
}

/* 桌面端展开 */
@media (min-width: 768px) {
  .nav {
    grid-template-columns: auto 1fr auto;
    grid-template-areas: "logo links actions";
  }
  
  .menu-toggle {
    display: none;
  }
  
  .nav-links {
    display: flex;
    flex-direction: row;
  }
}
```

## 页脚布局

### 多列页脚

```html
<footer class="footer">
  <div class="footer-brand">Brand</div>
  <div class="footer-links">
    <h4>Product</h4>
    <a href="#">Features</a>
    <a href="#">Pricing</a>
  </div>
  <div class="footer-links">
    <h4>Company</h4>
    <a href="#">About</a>
    <a href="#">Contact</a>
  </div>
  <div class="footer-links">
    <h4>Support</h4>
    <a href="#">Help</a>
    <a href="#">FAQ</a>
  </div>
  <div class="footer-bottom">
    <p>&copy; 2024 Company. All rights reserved.</p>
  </div>
</footer>
```

```css
.footer {
  display: grid;
  grid-template-columns: 2fr repeat(3, 1fr);
  gap: 40px;
  padding: 40px 20px;
  background: #1a1a1a;
  color: white;
}

.footer-brand {
  font-size: 1.5rem;
  font-weight: bold;
}

.footer-links {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-links h4 {
  margin-bottom: 10px;
}

.footer-links a {
  color: #999;
  text-decoration: none;
}

.footer-links a:hover {
  color: white;
}

.footer-bottom {
  grid-column: 1 / -1;
  border-top: 1px solid #333;
  padding-top: 20px;
  text-align: center;
  color: #666;
}

/* 响应式 */
@media (max-width: 768px) {
  .footer {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .footer-brand {
    grid-column: 1 / -1;
  }
}
```

## 产品展示

### 产品详情页

```html
<div class="product-page">
  <div class="product-images">
    <div class="thumbnails">
      <img src="thumb1.jpg" alt="">
      <img src="thumb2.jpg" alt="">
      <img src="thumb3.jpg" alt="">
    </div>
    <div class="main-image">
      <img src="main.jpg" alt="">
    </div>
  </div>
  <div class="product-info">
    <h1>Product Name</h1>
    <p class="price">$99.00</p>
    <p class="description">Description...</p>
    <button class="buy-btn">Add to Cart</button>
  </div>
</div>
```

```css
.product-page {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 40px;
  padding: 40px;
}

.product-images {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 10px;
}

.thumbnails {
  display: grid;
  gap: 10px;
}

.thumbnails img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  cursor: pointer;
  border: 2px solid transparent;
}

.thumbnails img:hover,
.thumbnails img.active {
  border-color: #333;
}

.main-image {
  grid-row: span 4;
}

.main-image img {
  width: 100%;
  height: auto;
}

/* 响应式 */
@media (max-width: 768px) {
  .product-page {
    grid-template-columns: 1fr;
  }
}
```

## 对比表格

```css
.comparison-table {
  display: grid;
  grid-template-columns: 1fr repeat(3, minmax(150px, 1fr));
  gap: 1px;
  background: #ddd;
  border: 1px solid #ddd;
}

.comparison-table > * {
  background: white;
  padding: 15px;
}

.comparison-header {
  text-align: center;
  font-weight: bold;
  background: #f5f5f5;
}

.feature-name {
  font-weight: 500;
}

.check {
  color: green;
  text-align: center;
}

.cross {
  color: red;
  text-align: center;
}
```

**布局示意**：

```
┌─────────────┬─────────┬─────────┬─────────┐
│   Feature   │  Basic  │   Pro   │Enterprise│
├─────────────┼─────────┼─────────┼─────────┤
│   Users     │    1    │   10    │   ∞     │
├─────────────┼─────────┼─────────┼─────────┤
│   Storage   │   5GB   │  50GB   │  ∞      │
├─────────────┼─────────┼─────────┼─────────┤
│   Support   │    ✗    │    ✓    │   ✓     │
└─────────────┴─────────┴─────────┴─────────┘
```

## 调试技巧

### Chrome DevTools 可视化

1. **启用网格线显示**
   - 打开开发者工具（F12）
   - 选择 Grid 容器元素
   - 点击 DOM 树中的 `grid` 徽章

2. **Layout 面板设置**
   - 在 Layout 面板中可以设置：
     - 显示网格线编号
     - 显示网格区域名称
     - 显示轨道大小

### 临时边框调试

```css
/* 为所有网格项目添加边框 */
.container > * {
  outline: 1px solid red;
}

/* 显示网格线 */
.container {
  background-image: 
    linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px);
  background-size: 100px 100px;
}
```

### 调试命名区域

纯 CSS 无法直接读取 `grid-template-areas` 的区域名称。查看区域划分，推荐使用 Chrome DevTools：

1. 选中 Grid 容器
2. 在 **Layout** 面板中勾选"显示网格区域名称"（Show area names）
3. 页面上会直接叠加显示 `header`、`main` 等区域标签

## 性能优化

### 避免过度使用 span

```css
/* 不推荐：过多项目跨列 */
.item:nth-child(1) { grid-column: span 3; }
.item:nth-child(2) { grid-column: span 2; }
.item:nth-child(3) { grid-column: span 4; }
/* 会导致浏览器频繁计算布局 */

/* 推荐：合理规划网格结构 */
.container {
  grid-template-columns: repeat(6, 1fr);
}
```

### 减少隐式网格创建

```css
/* 不推荐：依赖隐式网格 */
.container {
  grid-template-columns: repeat(3, 1fr);
  /* 没有定义 rows，大量项目会创建隐式行 */
}

/* 推荐：预设行高 */
.container {
  grid-template-columns: repeat(3, 1fr);
  grid-auto-rows: 200px; /* 预设隐式行高度 */
}
```

### 优化响应式断点

```css
/* 不推荐：过多媒体查询 */
@media (max-width: 1400px) { /* ... */ }
@media (max-width: 1200px) { /* ... */ }
@media (max-width: 1000px) { /* ... */ }
@media (max-width: 800px) { /* ... */ }

/* 推荐：使用 auto-fit 自动适应 */
.container {
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}
```

### 使用 content-visibility 优化

```css
/* 对长列表使用虚拟滚动优化 */
.long-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.long-grid > * {
  content-visibility: auto;
  contain-intrinsic-size: 200px;
}
```

## 最佳实践总结

1. **语义化命名区域**：使用 `grid-template-areas` 让布局意图清晰
2. **响应式优先**：使用 `auto-fit` + `minmax` 实现自适应
3. **合理设置间距**：使用 `gap` 替代 `margin`
4. **避免过度嵌套**：Grid 容器内避免再使用 Grid
5. **使用简写属性**：`grid-template` 一体化定义
6. **调试工具友好**：善用 Chrome DevTools 可视化
7. **注意可访问性**：`order` 只改变视觉顺序
8. **性能考量**：减少隐式网格、避免频繁重排

## 常见问题 FAQ

### Q1: 如何实现 Grid 布局中的垂直居中？

```css
.container {
  display: grid;
  place-items: center;
  min-height: 100vh;
}
```

### Q2: Grid 布局中如何实现等高列？

Grid 默认同一行的项目等高，使用 `align-items: stretch`（默认值）。

### Q3: 如何让最后一个项目占据剩余所有空间？

```css
.item:last-child {
  grid-row: auto / -1;
}
```

### Q4: auto-fit 和 auto-fill 什么时候使用？

- `auto-fill`：希望保留空位，等待内容填充
- `auto-fit`：希望现有内容扩展填满空间

### Q5: 如何实现 Grid 布局中的 sticky 定位？

```css
.header {
  grid-area: header;
  position: sticky;
  top: 0;
  z-index: 100;
}
```

### Q6: Grid 布局如何处理图片？

```css
.item img {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 或 contain */
}
```
