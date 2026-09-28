---
title: HTML 基础
description: "HTML 是一种网页语言（hypertext markup language），中文被称为超文本置标语言或超文本标记语言。它是一种文本类、解释执行的标记语言。与物理的文件结构不同，它旨在定义文件内的对象和描述文件的逻辑结构，而并不定义文件的显示。"
keywords: [HTML, 基础]
category: HTML5
tags: [HTML5, 语义化, Canvas, Web API]
---


# HTML 基础

`HTML` 是一种网页语言（hypertext markup language），中文被称为超文本置标语言或超文本标记语言。它是一种文本类、解释执行的标记语言。与物理的文件结构不同，它旨在定义文件内的对象和描述文件的逻辑结构，而并不定义文件的显示

## HTML 发展史

HTML 的发展经历从简单的文档标记到复杂的 Web 应用平台的演变。以下是关键的时间节点：

| 年份     | 版本/事件                | 说明                                                                                             |
| :------- | :----------------------- | :----------------------------------------------------------------------------------------------- |
| **1991** | **HTML 1.0**             | 由 Tim Berners-Lee 发布，包含约 20 个标签                                                        |
| **1995** | **HTML 2.0**             | 由 IETF 发布，确立了 Web 标准化的基础                                                            |
| **1997** | **HTML 3.2**             | W3C 发布的第一个标准，引入了表格、Applet 等                                                      |
| **1999** | **HTML 4.01**            | **里程碑版本**，分离了结构与样式（CSS），统领 Web 开发十余年                                     |
| **2000** | **XHTML 1.0**            | 基于 XML 的 HTML，语法极其严格（标签必须闭合、小写等）                                           |
| **2004** | **WHATWG 成立**          | 因不满 W3C 转向 XHTML 2.0（不兼容旧网页），浏览器厂商（Apple, Mozilla, Opera）另起炉灶研发 HTML5 |
| **2008** | **HTML5 草案**           | W3C 决定采纳 WHATWG 的成果，发布 HTML5 第一份正式草案                                            |
| **2014** | **HTML5 正式版**         | W3C 宣布 HTML5 成为推荐标准                                                                      |
| **2019** | **HTML Living Standard** | W3C 与 WHATWG 签署协议，**HTML 标准由 WHATWG 维护**，不再有版本号，称为 "Living Standard"        |
| **2022** | **`<dialog>` 元素**      | 原生对话框元素获得所有主流浏览器支持，替代了长期以来依赖 JS/ARIA 实现的模态框方案                |
| **2022** | **Container Queries**    | CSS 容器查询正式登陆 Chrome 105，HTML 结构与 CSS 布局解耦的重要里程碑                            |
| **2023** | **`<search>` 元素**      | WHATWG 新增语义化搜索区域标签，用于标记搜索相关内容区块                                          |
| **2023** | **Popover API**          | 原生弹出层 API（`popover` 属性）获得 Chrome 114+ 支持，简化了 Tooltip/菜单等弹出交互的实现       |
| **2023** | **`<model>` 元素（提案）** | Apple/WebKit 提案的原生 3D 模型嵌入元素（实验性），用于在网页中直接展示 USDZ/glTF 等 3D 资源；截至 2026-09 未纳入 WHATWG HTML 标准 |
| **2024** | **View Transitions API** | 页面/元素过渡动画 API 获得多浏览器支持，SPA/MPA 统一的转场方案                                   |
| **2025** | **CSS 锚点定位**         | `anchor-positioning` 在主流浏览器稳定，HTML 元素可通过 `anchor-name` 实现声明式定位              |

## HTML5 简介

HTML5 不仅仅是 HTML 的第五个版本，它代表了**现代 Web 平台的一整套技术规范**

核心设计理念：

- **向后兼容**：不仅兼容旧浏览器，也兼容旧的网页代码（即使语法不规范）
- **不仅是文档，更是应用**：提供了大量 API 以弥补 Web 与 Native 应用的差距
- **化繁为简**：简化了 `DOCTYPE`、`charset` 等声明，允许省略部分标签（虽不推荐）

### 关键特性概览

HTML5 引入大量新特性，主要可分为以下几类：

- **语义化 (Semantics)**
  - 新增 `<header>`, `<footer>`, `<nav>`, `<article>`, `<section>`, `<aside>` 等标签，使文档结构更清晰，利于 SEO 和无障碍访问
- **多媒体 (Multimedia)**
  - 原生支持 `<video>` 和 `<audio>`，不再依赖 Flash 插件
- **图形与 3D (Graphics)**
  - `<canvas>`：用于 2D 绘图（图表、游戏）
  - `SVG`：支持内联矢量图
  - `WebGL`：基于 Canvas 的 3D 绘图能力
- **离线与存储 (Offline & Storage)**
  - `localStorage` / `sessionStorage`：比 Cookie 更大、更易用的本地存储
  - `IndexedDB`：浏览器端的 NoSQL 数据库
  - `Service Worker`：实现离线访问和 PWA（渐进式 Web 应用）的核心
- **设备访问 (Device Access)**
  - Geolocation（地理位置）、Camera（相机）、Microphone（麦克风）等 API
- **连接与性能 (Connectivity & Performance)**
  - `WebSockets`：建立持久的双向连接
  - `Web Workers`：允许 JavaScript 在后台线程运行，避免阻塞主界面

### 标签体系

HTML5 在继承 HTML4 的基础上，对标签进行了分组和扩展。可以按照职责粗略分为以下几大类：

| 类别               | 代表标签                                                              | 说明                                             |
| ------------------ | --------------------------------------------------------------------- | ------------------------------------------------ |
| 文档结构与语义     | `<html>`、`<head>`、`<body>`、`<header>`、`<main>`、`<section>` 等    | 描述页面整体结构与信息层级                       |
| 元信息与资源引用   | `<meta>`、`<title>`、`<link>`、`<style>`、`<base>`                    | 声明编码、SEO、视口配置与外部资源                |
| 文本与段落         | `<h1>`–`<h6>`、`<p>`、`<span>`、`<strong>`、`<em>`、`<mark>` 等       | 负责正文内容与强调                               |
| 组块与布局         | `<div>`、`<section>`、`<article>`、`<aside>`、`<footer>`              | 组合页面区域，配合 CSS 布局                      |
| 列表与导航         | `<ul>`、`<ol>`、`<li>`、`<dl>`、`<dt>`、`<dd>`、`<nav>`               | 表示列表数据与站点导航                           |
| 链接与锚点         | `<a>`                                                                 | 在文档内部或不同文档之间创建跳转                 |
| 嵌入与多媒体       | `<img>`、`<picture>`、`<audio>`、`<video>`、`<source>`、`<track>`     | 嵌入图片、音频、视频等媒体资源                   |
| 表格               | `<table>`、`<thead>`、`<tbody>`、`<tfoot>`、`<tr>`、`<th>`、`<td>` 等 | 用于展示结构化的二维数据                         |
| 表单与交互控件     | `<form>`、`<input>`、`<textarea>`、`<select>`、`<button>` 等          | 收集用户输入，执行提交或前端交互                 |
| 脚本与模板         | `<script>`、`<noscript>`、`<template>`                                | 编写脚本、声明无脚本时的降级内容、定义可复用模板 |
| 交互与对话框       | `<dialog>`、`popover` 属性                                            | 原生模态/非模态对话框、声明式弹出层              |
| 内嵌内容与框架     | `<iframe>`、`<embed>`、`<object>`、`<model>`                          | 在页面中嵌入其他 HTML 页面、插件或 3D 模型内容   |
| 可访问性与交互增强 | 全局属性（`role`、`aria-*`）与交互属性（`tabindex`、`accesskey` 等）  | 为辅助技术提供语义和状态信息，提升键盘可达性     |

> 备注：HTML 规范采用"活标准"（Living Standard）形式不断演进，上表聚焦日常开发中常用的标签与能力，完整列表应以最新规范和 MDN 文档为准

### HTML Living Standard 新增元素（2022-2025）

自 HTML5 正式版发布以来，WHATWG 持续向 Living Standard 中添加新元素和 API。以下为近年来最受关注的新增内容（`<model>` 为 Apple/WebKit 提案、尚未入规，年份为提案年份）：

| 元素 / API          | 加入年份 | 语义 / 用途                | 浏览器支持                | 典型场景                         |
| ------------------- | -------- | -------------------------- | ------------------------- | -------------------------------- |
| `<dialog>`          | 2022     | 原生模态/非模态对话框      | 全部现代浏览器            | 确认弹窗、表单对话框、自定义提示 |
| `<search>`          | 2023     | 语义化搜索区域             | 全部现代浏览器            | 站内搜索栏、筛选面板             |
| `<model>`（提案）   | 2023*    | 嵌入 3D 模型（USDZ/glTF）  | 实验性（未入标准）        | 产品 3D 展示、AR 预览            |
| `popover` 属性      | 2023     | 声明式弹出层               | Chrome 114+、Firefox 125+、Safari 17+ | Tooltip、下拉菜单、通知卡片      |
| `<selectedcontent>` | 2024     | 自定义 `<select>` 下拉内容 | 实验性                    | 样式可定制的下拉选择器           |

```html
<search>
  <form action="/search" method="get">
    <label for="q">搜索</label>
    <input type="search" id="q" name="q" placeholder="输入关键词" />
    <button type="submit">搜索</button>
  </form>
</search>

<dialog id="confirmDialog">
  <form method="dialog">
    <p>确定要删除这条记录吗？</p>
    <button value="cancel">取消</button>
    <button value="confirm">确认</button>
  </form>
</dialog>

<button onclick="document.getElementById('confirmDialog').showModal()">打开对话框</button>
```

::: tip
`<dialog>` 和 `popover` 的完整用法详见 [Dialog 与 Popover API](/HTML5/高级应用/4-Dialog与Popover) 章节
:::

## HTML 文档基本结构

一个标准的 HTML5 文档由以下核心部分组成：

### DOCTYPE 声明

`<!DOCTYPE html>` 是 HTML5 的文档类型声明，必须位于文档的第一行：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>页面标题</title>
  </head>
  <body>
    <!-- 页面内容 -->
  </body>
</html>
```

**DOCTYPE 的作用：**

| 作用         | 说明                                                |
| ------------ | --------------------------------------------------- |
| 触发标准模式 | 告诉浏览器使用 W3C 标准来解析和渲染页面             |
| 避免怪异模式 | 缺少 DOCTYPE 会触发怪异模式，导致跨浏览器行为不一致 |
| 简洁性       | HTML5 的 DOCTYPE 极其简洁，不再需要复杂的 DTD 引用  |
| 向后兼容     | 即使旧浏览器不认识 HTML5 DOCTYPE，也会进入标准模式  |

**注意事项：**

- 应位于文档最顶部（第一行），前面不能出现任何元素（前导空白或注释不会被解析为内容、也不影响模式判断，但仍推荐紧贴文件开头）
- 不区分大小写，但推荐使用 `<!DOCTYPE html>`（大写 DOCTYPE）
- 不是 HTML 标签，而是一条指令

### 标准文档模板

以下是一个生产环境可用的最小 HTML5 文档模板：

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <!-- 字符编码：必须尽早声明，避免乱码 -->
    <meta charset="UTF-8" />

    <!-- 视口配置：移动端适配基础 -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <!-- 页面标题：对 SEO 和用户体验至关重要 -->
    <title>页面标题 - 网站名称</title>

    <!-- SEO 相关 -->
    <meta name="description" content="页面描述，通常显示在搜索结果中" />
    <meta name="keywords" content="关键词1, 关键词2" />

    <!-- 现代浏览器配置 -->
    <meta name="theme-color" content="#ffffff" />
    <meta name="color-scheme" content="light dark" />

    <!-- 外部资源：CSS -->
    <link rel="stylesheet" href="styles.css" />

    <!-- 关键资源预加载 -->
    <link rel="preconnect" href="https://cdn.example.com" />
  </head>
  <body>
    <!-- 语义化结构 -->
    <header>
      <nav>
        <!-- 导航内容 -->
      </nav>
    </header>

    <main>
      <!-- 主要内容 -->
      <article>
        <h1>文章标题</h1>
        <p>文章内容...</p>
      </article>
    </main>

    <aside>
      <!-- 侧边栏 -->
    </aside>

    <footer>
      <!-- 页脚 -->
    </footer>

    <!-- 外部资源：JavaScript -->
    <script src="script.js" defer></script>
  </body>
</html>
```

### 文档结构说明

| 标签     | 作用                                | 必需性   |
| -------- | ----------------------------------- | -------- |
| `html`   | 文档根元素，`lang` 属性用于语言声明 | 必需     |
| `head`   | 包含元数据、标题、样式表链接等      | 必需     |
| `body`   | 包含可见的页面内容                  | 必需     |
| `title`  | 页面标题，显示在浏览器标签页        | 必需     |
| `meta`   | 提供元数据（编码、视口、描述等）    | 强烈推荐 |
| `link`   | 链接外部资源（样式表、图标等）      | 按需使用 |
| `script` | 嵌入或引用 JavaScript 代码          | 按需使用 |
| `style`  | 嵌入 CSS 样式                       | 按需使用 |

## HTML 元素与属性

<h4>004-boolean-attributes.html</h4>

```html
<!-- 来源：1-HTML 基础.md - 布尔属性 -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>【004】布尔属性 Boolean Attributes</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 20px; font-size: 24px; }
    h2 { color: #555; margin: 25px 0 15px; font-size: 18px; border-bottom: 2px solid #eee; padding-bottom: 8px; }

    .demo-row { display: flex; gap: 15px; flex-wrap: wrap; margin-bottom: 15px; align-items: center; }

    /* 按钮状态 */
    button, input[type="text"], select {
      padding: 10px 16px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      transition: all 0.2s;
    }

    button {
      cursor: pointer;
      background: #007bff;
      color: white;
      border: none;
    }

    button:hover:not(:disabled) { background: #0056b3; }

    button:disabled {
      background: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }

    input[type="text"]:read-only {
      background: #e9ecef;
      color: #666;
    }

    input[type="text"]:required {
      border-left: 3px solid #dc3545;
    }

    input[type="text"]:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
    }

    label { font-size: 14px; color: #555; margin-right: 8px; }

    .checkbox-group, .select-group {
      display: flex;
      gap: 15px;
      align-items: center;
      flex-wrap: wrap;
    }

    .info-box {
      background: #fff3cd;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #ffc107;
      margin-top: 20px;
      font-size: 14px;
      line-height: 1.6;
    }

    .info-box code {
      background: rgba(0,0,0,0.05);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>布尔属性（Boolean Attributes）</h1>
    <p style="color: #666; margin-bottom: 25px;">
      布尔属性只需要声明属性名即可生效，不需要赋值。以下展示常见布尔属性的效果：
    </p>

    <h2>1. disabled - 禁用按钮</h2>
    <div class="demo-row">
      <button>正常按钮</button>
      <button disabled>已禁用按钮</button>
    </div>

    <h2>2. checked / selected - 默认选中</h2>
    <div class="checkbox-group">
      <label><input type="checkbox" /> 未选中的复选框</label>
      <label><input type="checkbox" checked /> 默认选中的复选框</label>
      <label><input type="radio" name="gender" /> 男</label>
      <label><input type="radio" name="gender" checked /> 女（默认选中）</label>
    </div>

    <h2>3. readonly - 只读文本</h2>
    <div class="demo-row">
      <label>可编辑：</label>
      <input type="text" value="可以修改这个文本" />
      <label>只读：</label>
      <input type="text" readonly value="只读文本，无法修改" />
    </div>

    <h2>4. required - 必填字段</h2>
    <div class="demo-row">
      <label>普通输入：</label>
      <input type="text" placeholder="可选填" />
      <label>必填输入：</label>
      <input type="text" required placeholder="此项必填" />
    </div>

    <h2>5. autofocus - 自动聚焦</h2>
    <div class="demo-row">
      <label>自动聚焦：</label>
      <input type="text" autofocus placeholder="页面加载时自动聚焦这里" />
    </div>

    <h2>6. multiple - 多重选择</h2>
    <div class="select-group">
      <label>单选下拉：</label>
      <select>
        <option>选项 1</option>
        <option>选项 2</option>
        <option>选项 3</option>
      </select>
      <label>多选下拉：</label>
      <select multiple size="3">
        <option>选项 A</option>
        <option selected>选项 B（默认选中）</option>
        <option>选项 C</option>
        <option selected>选项 D（默认选中）</option>
      </select>
    </div>

    <div class="info-box">
      <strong>💡 常见布尔属性速查：</strong><br>
      <code>disabled</code> 禁用 ·
      <code>checked</code> 默认选中 ·
      <code>readonly</code> 只读 ·
      <code>required</code> 必填 ·
      <code>autofocus</code> 自动聚焦 ·
      <code>multiple</code> 允许多选 ·
      <code>hidden</code> 隐藏元素
    </div>
  </div>
</body>
</html>
```

### 元素的基本结构

HTML 元素通常由以下部分组成：

```html
<p class="intro" id="first-paragraph">这是一个段落元素的内容</p>
```

**元素组成说明：**

| 组成部分 | 说明                                 | 示例                     |
| -------- | ------------------------------------ | ------------------------ |
| 开始标签 | 元素的起始标记，包含元素名和属性     | `<p class="intro">`      |
| 结束标签 | 元素的结束标记，在元素名前加斜杠     | `</p>`                   |
| 内容     | 标签之间的文本或其他元素             | `这是一个段落元素的内容` |
| 属性     | 在开始标签中定义，提供元素的额外信息 | `class="intro"`          |
| 元素     | 开始标签 + 内容 + 结束标签的整体     | 整个 `<p>...</p>`        |

### 空元素（Void Elements）

某些 HTML 元素没有内容，也不需要结束标签，称为空元素或自闭合元素：

```html
<!-- 图片 -->
<img src="image.jpg" alt="图片描述" />

<!-- 换行 -->
<br />

<!-- 水平线 -->
<hr />

<!-- 元信息 -->
<meta charset="UTF-8" />

<!-- 外部资源链接 -->
<link rel="stylesheet" href="styles.css" />

<!-- 输入框 -->
<input type="text" name="username" />
```

**常见的空元素：**

- `<area>` - 图像映射区域
- `<base>` - 文档基础 URL
- `<br>` - 换行
- `<col>` - 表格列
- `<embed>` - 嵌入内容
- `<hr>` - 水平分隔线
- `<img>` - 图片
- `<input>` - 输入控件
- `<link>` - 外部资源链接
- `<meta>` - 元数据
- `<param>` - 对象参数
- `<source>` - 媒体源
- `<track>` - 媒体轨道
- `<wbr>` - 换行机会

### 全局属性

全局属性是可以用于任何 HTML 元素的属性，它们提供了通用的功能和语义：

#### 核心属性

| 属性    | 作用                             | 示例                                       |
| ------- | -------------------------------- | ------------------------------------------ |
| `id`    | 元素的唯一标识符                 | `<div id="header">`                        |
| `class` | 元素的类名（可多个，空格分隔）   | `<p class="intro highlight">`              |
| `style` | 内联样式                         | `<span style="color: red;">`               |
| `title` | 元素的额外信息（鼠标悬停时显示） | `<abbr title="HyperText Markup Language">` |

#### 语义与结构属性

| 属性       | 作用                     | 示例                    |
| ---------- | ------------------------ | ----------------------- |
| `lang`     | 元素内容的语言代码       | `<html lang="zh-CN">`   |
| `dir`      | 文本方向（ltr/rtl/auto） | `<p dir="rtl">`         |
| `hidden`   | 隐藏元素                 | `<div hidden>`          |
| `tabindex` | Tab 键导航顺序           | `<button tabindex="1">` |

#### 交互属性

| 属性              | 作用             | 示例                           |
| ----------------- | ---------------- | ------------------------------ |
| `accesskey`       | 快捷键访问       | `<button accesskey="s">`       |
| `contenteditable` | 是否可编辑内容   | `<div contenteditable="true">` |
| `draggable`       | 是否可拖拽       | `<div draggable="true">`       |
| `spellcheck`      | 是否启用拼写检查 | `<textarea spellcheck="true">` |

#### 无障碍属性（Accessibility）

| 属性     | 作用                              | 示例                      |
| -------- | --------------------------------- | ------------------------- |
| `role`   | 定义元素的角色（ARIA）            | `<div role="button">`     |
| `aria-*` | ARIA 属性组，提供额外的无障碍信息 | `<div aria-label="关闭">` |

#### 数据属性（Data Attributes）

自定义数据属性允许在 HTML 元素上存储额外信息：

```html
<div data-user-id="12345" data-user-name="张三" data-user-role="admin">用户信息卡片</div>

<script>
  const div = document.querySelector("div")
  console.log(div.dataset.userId) // "12345"
  console.log(div.dataset.userName) // "张三"
  console.log(div.dataset.userRole) // "admin"
</script>
```

**数据属性规则：**

- 属性名以 `data-` 开头
- 可包含字母、数字、连字符（-）、冒号（:）、下划线（\_）
- 在 JavaScript 中通过 `dataset` 属性访问
- 连字符后的字母会自动转换为驼峰命名

### 布尔属性

布尔属性只需要声明属性名，不需要赋值：

```html
<!-- 禁用按钮 -->
<button disabled>已禁用</button>

<!-- 复选框默认选中 -->
<input type="checkbox" checked />

<!-- 文本框只读 -->
<input type="text" readonly value="只读文本" />

<!-- 必填字段 -->
<input type="text" required />

<!-- 自动聚焦 -->
<input type="text" autofocus />

<!-- 多重选择 -->
<select multiple>
  <option>选项1</option>
  <option>选项2</option>
</select>
```

**常见布尔属性：**

| 属性        | 适用元素                   | 作用         |
| ----------- | -------------------------- | ------------ |
| `disabled`  | 表单控件                   | 禁用元素     |
| `checked`   | checkbox、radio            | 默认选中     |
| `readonly`  | 文本输入框                 | 只读         |
| `required`  | 表单控件                   | 必填         |
| `autofocus` | 表单控件                   | 自动聚焦     |
| `multiple`  | select、input[type="file"] | 允许多选     |
| `selected`  | option                     | 默认选中     |
| `hidden`    | 所有元素                   | 隐藏元素     |
| `async`     | script                     | 异步加载脚本 |
| `defer`     | script                     | 延迟执行脚本 |

## HTML 实体字符

HTML 实体用于在 HTML 中显示特殊字符和保留字符：

常见实体字符：

| 字符 | 实体名称   | 实体编号  | 说明       |
| ---- | ---------- | --------- | ---------- |
| `<`  | `&lt;`     | `&#60;`   | 小于号     |
| `>`  | `&gt;`     | `&#62;`   | 大于号     |
| `&`  | `&amp;`    | `&#38;`   | 和号       |
| `"`  | `&quot;`   | `&#34;`   | 双引号     |
| `'`  | `&apos;`   | `&#39;`   | 单引号     |
| ` `  | `&nbsp;`   | `&#160;`  | 不换行空格 |
| `©`  | `&copy;`   | `&#169;`  | 版权符号   |
| `®`  | `&reg;`    | `&#174;`  | 注册商标   |
| `™`  | `&trade;`  | `&#8482;` | 商标符号   |
| `€`  | `&euro;`   | `&#8364;` | 欧元符号   |
| `¥`  | `&yen;`    | `&#165;`  | 人民币符号 |
| `°`  | `&deg;`    | `&#176;`  | 度数符号   |
| `×`  | `&times;`  | `&#215;`  | 乘号       |
| `÷`  | `&divide;` | `&#247;`  | 除号       |

使用示例：

```html
<!-- 在 HTML 中显示代码示例 -->
<p>HTML 标签的语法：&lt;tagname&gt;内容&lt;/tagname&gt;</p>

<!-- 显示数学公式 -->
<p>温度：25&deg;C</p>
<p>面积：5m&times;3m = 15m&sup2;</p>

<!-- 显示版权信息 -->
<p>&copy; 2024 我的网站. 保留所有权利.</p>

<!-- 空格控制 -->
<p>这是一个&nbsp;&nbsp;&nbsp;有多个空格的例子</p>
```

<h4>005-entity-characters.html</h4>

```html
<!-- 来源：1-HTML 基础.md - HTML 实体字符 -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>【005】HTML 实体字符</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 850px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 20px; font-size: 24px; }

    .section { margin-bottom: 25px; }
    .section h3 { color: #555; margin-bottom: 12px; font-size: 16px; }

    .example {
      background: #f8f9fa;
      padding: 15px 20px;
      border-radius: 6px;
      border-left: 4px solid #007bff;
      margin-bottom: 10px;
      font-size: 15px;
      line-height: 1.8;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      font-size: 14px;
    }

    th, td {
      padding: 10px 12px;
      text-align: left;
      border: 1px solid #dee2e6;
    }

    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #495057;
    }

    tr:nth-child(even) { background: #fdfdfd; }

    td:first-child { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 16px; }
    td:nth-child(2) { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; color: #007bff; }
    td:nth-child(3) { color: #666; }

    .highlight {
      background: #fff3cd;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #ffc107;
      margin-top: 20px;
      font-size: 14px;
      line-height: 1.6;
    }

    .highlight code {
      background: rgba(0,0,0,0.06);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>HTML 实体字符（Entity Characters）</h1>
    <p style="color: #666; margin-bottom: 25px;">
      HTML 实体用于在 HTML 中显示特殊字符和保留字符。以下是常见实体的实际应用：
    </p>

    <div class="section">
      <h3>📝 实际应用示例</h3>

      <div class="example">
        <strong>显示 HTML 标签语法：</strong><br>
        HTML 标签的语法：&lt;tagname&gt;内容&lt;/tagname&gt;
      </div>

      <div class="example">
        <strong>数学公式与单位：</strong><br>
        当前温度：25&deg;C &nbsp;|&nbsp; 面积：5m&times;3m = 15m&sup2; &nbsp;|&nbsp; 除法：10&divide;2 = 5
      </div>

      <div class="example">
        <strong>版权与商标信息：</strong><br>
        &copy; 2024 我的网站. 保留所有权利. &nbsp;|&nbsp; 注册商标&reg; &nbsp;|&nbsp; 商标符号&trade;
      </div>

      <div class="example">
        <strong>货币符号：</strong><br>
        价格：&euro;99.00（欧元）&nbsp;|&nbsp; &yen;688.00（人民币）&nbsp;|&nbsp; $120.00（美元）
      </div>

      <div class="example">
        <strong>空格控制（多个连续空格）：</strong><br>
        这是&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;有多个空格的例子（使用了 5 个 &amp;nbsp;）
      </div>
    </div>

    <div class="section">
      <h3>📋 常用实体字符对照表</h3>
      <table>
        <thead>
          <tr>
            <th>显示效果</th>
            <th>实体名称</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>&lt;</td><td>&amp;lt;</td><td>小于号（必须转义）</td></tr>
          <tr><td>&gt;</td><td>&amp;gt;</td><td>大于号（必须转义）</td></tr>
          <tr><td>&amp;</td><td>&amp;amp;</td><td>和号（必须转义）</td></tr>
          <tr><td>"</td><td>&amp;quot;</td><td>双引号</td></tr>
          <tr><td>'</td><td>&amp;apos;</td><td>单引号</td></tr>
          <tr><td>&nbsp;(空格)</td><td>&amp;nbsp;</td><td>不换行空格</td></tr>
          <tr><td>&copy;</td><td>&amp;copy;</td><td>版权符号</td></tr>
          <tr><td>&reg;</td><td>&amp;reg;</td><td>注册商标</td></tr>
          <tr><td>&trade;</td><td>&amp;trade;</td><td>商标符号</td></tr>
          <tr><td>&euro;</td><td>&amp;euro;</td><td>欧元符号</td></tr>
          <tr><td>&yen;</td><td>&amp;yen;</td><td>人民币符号</td></tr>
          <tr><td>&deg;</td><td>&amp;deg;</td><td>度数符号</td></tr>
          <tr><td>&times;</td><td>&amp;times;</td><td>乘号</td></tr>
          <tr><td>&divide;</td><td>&amp;divide;</td><td>除号</td></tr>
        </tbody>
      </table>
    </div>

    <div class="highlight">
      <strong>⚠️ 注意事项：</strong><br>
      • 在 UTF-8 编码下，大多数字符可以直接使用，但保留字符（<code>&lt;</code> <code>&gt;</code> <code>&amp;</code>）<strong>必须转义</strong><br>
      • 推荐在 <code>&lt;head&gt;</code> 中声明 <code>&lt;meta charset="UTF-8"&gt;</code><br>
      • 优先使用实体名称（如 <code>&amp;nbsp;</code>），因为比编号更易读
    </div>
  </div>
</body>
</html>
```

### 字符编码最佳实践

1. **优先使用 UTF-8 编码**：现代 Web 标准，支持几乎所有语言
2. **声明字符集**：在 `<head>` 顶部添加 `<meta charset="UTF-8">`
3. **避免实体过度使用**：UTF-8 编码下，大多数字符可直接使用
4. **保留字符必须转义**：`<`、`>`、`&` 等必须使用实体表示

## 基础术语

| 中文术语          | 推荐英文                         | 说明                                                   |
| ----------------- | -------------------------------- | ------------------------------------------------------ |
| 超文本标记语言    | HTML (HyperText Markup Language) | "标记语言"是主流译法；"置标语言"较少使用               |
| 元素              | element                          | 由标签（tag）和内容组成的节点                          |
| 标签              | tag                              | 例如 `<p>`、`</p>`                                     |
| 属性              | attribute                        | 例如 `href="..."`                                      |
| 布尔属性          | boolean attribute                | 只写属性名表示启用，例如 `disabled`、`checked`         |
| 空元素            | void element                     | 没有结束标签且不应有子节点，例如 `img`、`meta`、`link` |
| 可访问性 / 无障碍 | Accessibility (a11y)             | 面向读屏、键盘、低视力等用户的可用性                   |

注意：

| 主题                                                    | 结论                   | 为什么 / 注意事项                                                      |
| ------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------- |
| `<!doctype html>`                                       | 必须放第一行           | 触发标准模式（Standards Mode），避免怪异模式（Quirks Mode）            |
| `<head>` 可省略？                                       | 语法上可省略，但不建议 | 实际工程需要 `meta charset/viewport`、`title`、资源引用等              |
| 用 `<meta http-equiv="Cache-Control">` 禁止缓存         | 不可靠，不应依赖       | 缓存策略应优先由服务器响应头控制；Meta 的效果在不同浏览器/代理链不一致 |
| `bgcolor/background/text/link/vlink/alink` 等 body 属性 | 已废弃                 | 用 CSS 替代；保留它们只会误导新项目                                    |
| `robots` 的 `noodp/noydir`                              | 已过时                 | 这类目录项目早已不再作为主流索引来源，不建议继续写入笔记               |

## 文档结构与语义化

语义化（Semantic HTML）的核心目标：**用正确的标签表达正确的结构与含义**。它直接影响：

- SEO：搜索引擎更容易理解信息层级与关键内容
- 可访问性（a11y）：读屏软件会利用语义和"地标（Landmarks）"快速导航
- 可维护性：减少无意义的 `div` 嵌套与"看 class 猜结构"

![语义化布局示意图（SVG，可放大）](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202602101900978.svg)

语义化结构标签：

| 标签      | 适用场景                                      | 典型误用                                                   |
| --------- | --------------------------------------------- | ---------------------------------------------------------- |
| `header`  | 页面或区块的头部（Logo、标题、搜索、工具栏）  | 把所有顶部内容都塞进一个全局 `header`，忽略区块级 `header` |
| `nav`     | 主要导航链接集合                              | 用 `nav` 包裹页面中所有链接（例如页脚友情链接）            |
| `main`    | 页面"唯一核心内容"                            | 一个页面写多个 `main`（应当只有一个）                      |
| `article` | 可独立分发/复用的内容：文章、帖子、卡片、评论 | 用 `article` 做纯布局容器                                  |
| `section` | 主题分区（通常建议带标题）                    | 为了加样式而滥用 `section`（此时 `div` 更合适）            |
| `aside`   | 补充信息：侧栏、推荐、广告、目录              | 把主要内容放进 `aside`                                     |
| `footer`  | 页面或区块的尾部（版权、作者、相关链接）      | 只用 `div class="footer"`，丢失语义                        |

## 可访问性（Accessibility）最佳实践

可访问性（Accessibility，简称 a11y）是指确保网站和应用能够被所有人使用，包括残障人士、老年人、使用辅助技术的用户等。良好的可访问性不仅是道德和法律要求，也能提升所有用户的体验。

<h4>006-form-accessibility.html</h4>

```html
<!-- 来源：1-HTML 基础.md - 可访问性：表单可访问性 -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>【006】表单可访问性最佳实践</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 700px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 20px; font-size: 24px; }

    form { margin-top: 20px; }
    .form-group { margin-bottom: 20px; }

    label {
      display: block;
      font-weight: 600;
      margin-bottom: 6px;
      color: #333;
      font-size: 14px;
    }

    label .required {
      color: #dc3545;
      margin-left: 4px;
    }

    input[type="text"],
    input[type="email"],
    input[type="tel"],
    input[type="password"] {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ced4da;
      border-radius: 4px;
      font-size: 14px;
      transition: border-color 0.2s;
    }

    input:focus {
      outline: none;
      border-color: #007bff;
      box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
    }

    input[aria-invalid="true"] {
      border-color: #dc3545;
      border-width: 2px;
    }

    .hint {
      font-size: 13px;
      color: #6c757d;
      margin-top: 4px;
    }

    .error-message {
      font-size: 13px;
      color: #dc3545;
      margin-top: 4px;
      font-weight: 500;
    }

    fieldset {
      border: 2px solid #dee2e6;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 20px;
    }

    legend {
      font-weight: bold;
      color: #495057;
      padding: 0 10px;
      font-size: 16px;
    }

    button[type="submit"] {
      width: 100%;
      padding: 12px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    button[type="submit"]:hover { background: #0056b3; }

    .accessibility-info {
      background: #d4edda;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #28a745;
      margin-top: 25px;
      font-size: 14px;
      line-height: 1.6;
    }

    .accessibility-info code {
      background: rgba(0,0,0,0.06);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>表单可访问性最佳实践</h1>
    <p style="color: #666; margin-bottom: 10px;">
      以下展示了符合 WCAG 标准的可访问性表单实现：
    </p>

    <form onsubmit="event.preventDefault(); alert('表单提交成功！');">
      <!-- 1. 使用 label 关联表单控件 -->
      <div class="form-group">
        <label for="username">
          用户名<span class="required" aria-label="必填">*</span>
        </label>
        <input
          type="text"
          id="username"
          name="username"
          required
          aria-required="true"
          placeholder="请输入用户名"
        />
      </div>

      <!-- 2. 必填字段标识 + 错误提示关联 -->
      <div class="form-group">
        <label for="email">
          邮箱地址<span class="required" aria-label="必填">*</span>
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          aria-required="true"
          aria-invalid="false"
          aria-describedby="email-hint email-error"
          placeholder="example@mail.com"
        />
        <p id="email-hint" class="hint">我们不会分享您的邮箱地址</p>
        <p id="email-error" class="error-message" role="alert" style="display: none;"></p>
      </div>

      <!-- 3. 密码字段带提示和错误关联 -->
      <div class="form-group">
        <label for="password">密码<span class="required" aria-label="必填">*</span></label>
        <input
          type="password"
          id="password"
          name="password"
          required
          aria-required="true"
          aria-invalid="true"
          aria-describedby="password-hint password-error"
          placeholder="至少8位，包含字母和数字"
        />
        <p id="password-hint" class="hint">密码至少8位，包含字母和数字</p>
        <p id="password-error" class="error-message" role="alert">密码不符合要求</p>
      </div>

      <!-- 4. 字段集分组 -->
      <fieldset>
        <legend>联系方式</legend>

        <div class="form-group">
          <label for="phone">电话号码</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            placeholder="请输入手机号码"
          />
        </div>

        <div class="form-group">
          <label for="address">联系地址</label>
          <input
            type="text"
            id="address"
            name="address"
            placeholder="请输入详细地址"
          />
        </div>
      </fieldset>

      <button type="submit">提交表单</button>
    </form>

    <div class="accessibility-info">
      <strong>✅ 可访问性要点：</strong><br>
      • <code>&lt;label for=&quot;id&quot;&gt;</code> 关联表单控件，点击标签也能聚焦输入框<br>
      • <code>aria-required=&quot;true&quot;</code> 标识必填字段<br>
      • <code>aria-describedby</code> 关联提示文本和错误信息<br>
      • <code>&lt;fieldset&gt;</code> + <code>&lt;legend&gt;</code> 对相关字段进行分组<br>
      • <code>role=&quot;alert&quot;</code> 让错误信息能被屏幕阅读器即时播报
    </div>
  </div>
</body>
</html>
```


<h4>007-keyboard-navigation.html</h4>

```html
<!-- 来源：1-HTML 基础.md - 可访问性：键盘导航与跳过链接 -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>【007】键盘导航与跳过链接</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }

    /* 跳过导航链接 */
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      background: #000;
      color: #fff;
      padding: 8px 16px;
      z-index: 100;
      text-decoration: none;
      font-size: 14px;
      transition: top 0.2s;
    }

    .skip-link:focus {
      top: 0;
    }

    /* 导航栏 */
    nav {
      background: #343a40;
      padding: 15px 30px;
      display: flex;
      gap: 25px;
      align-items: center;
    }

    nav a {
      color: white;
      text-decoration: none;
      font-size: 15px;
      padding: 8px 12px;
      border-radius: 4px;
      transition: background 0.2s;
    }

    nav a:hover, nav a:focus {
      background: #495057;
      outline: none;
    }

    /* 主内容区 */
    main {
      max-width: 800px;
      margin: 30px auto;
      padding: 0 20px;
    }

    .content-box {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }

    .content-box h1 { color: #333; margin-bottom: 15px; font-size: 26px; }
    .content-box p { color: #555; line-height: 1.8; margin-bottom: 12px; }

    /* 自定义可聚焦组件 */
    .custom-button {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 16px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      outline: none;
    }

    .custom-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .custom-button:focus {
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.5);
    }

    .click-result {
      margin-top: 15px;
      padding: 12px;
      background: #d4edda;
      border-radius: 4px;
      color: #155724;
      font-weight: 500;
      display: none;
    }

    .info-panel {
      background: #e7f3ff;
      padding: 20px;
      border-radius: 6px;
      border-left: 4px solid #007bff;
      margin-top: 20px;
      font-size: 14px;
      line-height: 1.8;
    }

    .info-panel code {
      background: rgba(0,123,255,0.1);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }

    .kbd-hint {
      display: inline-block;
      background: #fff;
      border: 1px solid #ddd;
      border-bottom-width: 3px;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      margin: 0 2px;
    }
  </style>
</head>
<body>
  <!-- 跳过导航链接：按 Tab 时第一个聚焦的元素 -->
  <a href="#main-content" class="skip-link">跳过导航，直接到主要内容</a>

  <nav>
    <a href="/">首页</a>
    <a href="/products">产品</a>
    <a href="/about">关于我们</a>
    <a href="/contact">联系我们</a>
  </nav>

  <main id="main-content">
    <div class="content-box">
      <h1>键盘导航与跳过链接</h1>
      <p>
        尝试按 <kbd class="kbd-hint">Tab</kbd> 键导航页面，你会注意到第一个聚焦的元素是「跳过导航」链接。
        这对于使用键盘浏览的用户（尤其是屏幕阅读器用户）非常重要。
      </p>

      <h2 style="margin: 20px 0 12px; font-size: 18px; color: #555;">自定义可聚焦组件</h2>
      <p style="color: #666; font-size: 14px;">
        下方的按钮是一个使用 <code>div</code> 模拟的自定义按钮，
        通过添加 <code>tabindex="0"</code> 和键盘事件支持，使其可以被键盘操作：
      </p>

      <!-- 可聚焦的自定义组件 -->
      <div
        role="button"
        tabindex="0"
        class="custom-button"
        onclick="handleClick()"
        onkeydown="handleKeyDown(event)"
      >
        按 Enter 或空格键触发
      </div>

      <div class="click-result" id="result">✅ 操作成功！</div>
    </div>

    <div class="info-panel">
      <strong>⌨️ 键盘导航要点：</strong><br>
      • <code>tabindex=&quot;0&quot;</code> 使元素可通过 Tab 聚焦<br>
      • 监听 <code>keydown</code> 事件，处理 <kbd class="kbd-hint">Enter</kbd> 和 <kbd class="kbd-hint">Space</kbd> 键<br>
      • <code>role=&quot;button&quot;</code> 告诉辅助技术这是一个按钮<br>
      • 「跳过导航」链接应放在页面最前面，且默认隐藏（<kbd class="kbd-hint">Tab</kbd> 聚焦时才显示）<br>
      • 所有交互元素都应有清晰的焦点可见样式（<code>:focus</code>）
    </div>
  </main>

  <script>
    function handleClick() {
      const result = document.getElementById('result');
      result.style.display = 'block';
      setTimeout(() => result.style.display = 'none', 2000);
    }

    function handleKeyDown(event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleClick();
      }
    }
  </script>
</body>
</html>
```


<h4>008-aria-accessibility.html</h4>

```html
<!-- 来源：1-HTML 基础.md - ARIA 属性使用 -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>【008】ARIA 属性增强可访问性</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 750px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 20px; font-size: 24px; }

    /* 标签页组件 */
    [role="tablist"] {
      display: flex;
      gap: 4px;
      border-bottom: 2px solid #dee2e6;
      margin-bottom: 20px;
    }

    [role="tab"] {
      padding: 10px 20px;
      background: transparent;
      border: none;
      border-bottom: 3px solid transparent;
      font-size: 15px;
      color: #6c757d;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: -2px;
    }

    [role="tab"]:hover { color: #495057; }

    [role="tab"][aria-selected="true"] {
      color: #007bff;
      border-bottom-color: #007bff;
      font-weight: 600;
    }

    [role="tab"]:focus {
      outline: none;
      box-shadow: inset 0 -3px 0 #007bff;
    }

    [role="tabpanel"] {
      padding: 20px;
      background: #f8f9fa;
      border-radius: 0 6px 6px 6px;
      min-height: 150px;
    }

    [role="tabpanel"][hidden] { display: none; }

    [role="tabpanel"] h2 { font-size: 18px; color: #333; margin-bottom: 12px; }
    [role="tabpanel"] p { color: #555; line-height: 1.7; }

    /* 实时通知区域 */
    .notification-area {
      margin-top: 25px;
      padding: 15px;
      background: #d4edda;
      border: 2px dashed #28a745;
      border-radius: 6px;
      min-height: 50px;
    }

    .notification-area[empty]::before {
      content: '通知将显示在这里...';
      color: #999;
      font-style: italic;
    }

    /* 模态框 */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-overlay.active { display: flex; }

    [role="dialog"] {
      background: white;
      padding: 30px;
      border-radius: 12px;
      max-width: 450px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    }

    [role="dialog"] h2 { margin-bottom: 12px; color: #dc3545; }
    [role="dialog"] p { color: #555; line-height: 1.6; margin-bottom: 20px; }

    .modal-buttons { display: flex; gap: 10px; justify-content: flex-end; }

    .modal-buttons button {
      padding: 8px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .btn-confirm { background: #dc3545; color: white; }
    .btn-cancel { background: #6c757d; color: white; }

    .trigger-btn {
      margin-top: 20px;
      padding: 10px 20px;
      background: #dc3545;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }

    .trigger-btn:hover { background: #c82333; }

    .info {
      background: #fff3cd;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #ffc107;
      margin-top: 20px;
      font-size: 14px;
      line-height: 1.6;
    }

    .info code {
      background: rgba(0,0,0,0.06);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>ARIA 属性增强可访问性</h1>

    <!-- ========== 1. 标签页组件 ========== -->
    <h2 style="margin-bottom: 15px; font-size: 18px; color: #555;">标签页组件（Tabs）</h2>

    <div role="tablist" aria-label="功能设置">
      <button role="tab" id="tab-general" aria-selected="true" aria-controls="panel-general" onclick="switchTab('general')">
        常规设置
      </button>
      <button role="tab" id="tab-security" aria-selected="false" aria-controls="panel-security" onclick="switchTab('security')">
        安全设置
      </button>
    </div>

    <div role="tabpanel" id="panel-general" aria-labelledby="tab-general">
      <h2>常规设置内容</h2>
      <p>这里是常规设置面板的内容。你可以在这里配置应用程序的基本参数，包括语言、主题、通知偏好等选项。</p>
    </div>

    <div role="tabpanel" id="panel-security" aria-labelledby="tab-security" hidden>
      <h2>安全设置内容</h2>
      <p>这里是安全设置面板的内容。包含密码策略、双因素认证、登录会话管理等安全相关的配置项。</p>
    </div>

    <!-- ========== 2. 实时通知区域 ========== -->
    <h2 style="margin: 25px 0 15px; font-size: 18px; color: #555;">实时通知区域（Live Region）</h2>
    <div style="display: flex; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">
      <button onclick="sendNotification('操作成功！文件已保存。')" style="padding: 8px 16px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer;">
        发送成功通知
      </button>
      <button onclick="sendNotification('警告：存储空间不足！')" style="padding: 8px 16px; background: #ffc107; color: #333; border: none; border-radius: 4px; cursor: pointer;">
        发送警告通知
      </button>
      <button onclick="sendNotification('错误：网络连接失败。')" style="padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">
        发送错误通知
      </button>
    </div>
    <div aria-live="polite" aria-atomic="true" id="notifications" class="notification-area" empty></div>

    <!-- ========== 3. 模态框 ========== -->
    <h2 style="margin: 25px 0 15px; font-size: 18px; color: #555;">模态框（Modal Dialog）</h2>
    <button class="trigger-btn" onclick="openModal()">打开确认删除弹窗</button>

    <div class="modal-overlay" id="modalOverlay" onclick="closeModal(event)">
      <div role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-desc" onclick="event.stopPropagation()">
        <h2 id="dialog-title">确认删除</h2>
        <p id="dialog-desc">此操作不可撤销，确定要删除这条记录吗？删除后数据将无法恢复。</p>
        <div class="modal-buttons">
          <button class="btn-cancel" onclick="closeModal()">取消</button>
          <button class="btn-confirm" onclick="closeModal(); sendNotification('记录已删除')">确认删除</button>
        </div>
      </div>
    </div>

    <div class="info">
      <strong>📖 ARIA 属性说明：</strong><br>
      • <code>role=&quot;tablist/tab/tabpanel&quot;</code> - 构建标签页语义结构<br>
      • <code>aria-selected</code> - 表示当前选中的标签<br>
      • <code>aria-controls</code> - 关联控制的 panel<br>
      • <code>aria-live=&quot;polite&quot;</code> - 内容变化时通知屏幕阅读器<br>
      • <code>aria-modal=&quot;true&quot;</code> - 标识模态框，锁定焦点<br>
      • <code>aria-labelledby/describedby</code> - 关联标题和描述文本
    </div>
  </div>

  <script>
    // 切换标签页
    function switchTab(tabName) {
      // 更新所有 tab 按钮
      document.querySelectorAll('[role="tab"]').forEach(tab => {
        tab.setAttribute('aria-selected', 'false');
      });
      document.getElementById(`tab-${tabName}`).setAttribute('aria-selected', 'true');

      // 更新所有 panel
      document.querySelectorAll('[role="tabpanel"]').forEach(panel => {
        panel.hidden = true;
      });
      document.getElementById(`panel-${tabName}`).hidden = false;
    }

    // 发送通知
    function sendNotification(message) {
      const area = document.getElementById('notifications');
      area.removeAttribute('empty');
      area.textContent = message;
      setTimeout(() => {
        area.textContent = '';
        area.setAttribute('empty', '');
      }, 3000);
    }

    // 模态框控制
    function openModal() {
      document.getElementById('modalOverlay').classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeModal(e) {
      if (!e || e.target === e.currentTarget) {
        document.getElementById('modalOverlay').classList.remove('active');
        document.body.style.overflow = '';
      }
    }
  </script>
</body>
</html>
```

### 核心原则（WCAG 2.1）

Web 内容可访问性指南（WCAG）定义了四个核心原则：

| 原则   | 英文           | 说明                                   | 实践要点                         |
| ------ | -------------- | -------------------------------------- | -------------------------------- |
| 可感知 | Perceivable    | 信息必须能够被用户感知                 | 提供文本替代、字幕、色彩对比度   |
| 可操作 | Operable       | 界面组件必须能够被用户操作             | 键盘导航、足够时间、避免闪烁内容 |
| 可理解 | Understandable | 信息和操作必须能够被用户理解           | 可读性、可预测性、帮助用户纠错   |
| 健壮性 | Robust         | 内容必须足够健壮，能被各种用户代理解析 | 兼容辅助技术、使用标准标记       |

### 语义化与可访问性

正确的语义化是可访问性的基础：

```html
<!-- ❌ 错误示例：使用 div 模拟按钮 -->
<div onclick="submitForm()" class="btn">提交</div>

<!-- ✅ 正确示例：使用原生按钮元素 -->
<button type="submit" onclick="submitForm()">提交</button>

<!-- ❌ 错误示例：使用 div 模拟标题 -->
<div class="heading" style="font-size: 24px; font-weight: bold;">文章标题</div>

<!-- ✅ 正确示例：使用标题元素 -->
<h1>文章标题</h1>
```

### 图片可访问性

为图片提供替代文本是可访问性的基本要求：

```html
<!-- 有意义的图片：提供描述性 alt 文本 -->
<img src="chart.png" alt="2024年第一季度销售额增长20%，达到500万元" />

<!-- 装饰性图片：使用空 alt -->
<img src="decoration.png" alt="" />

<!-- 复杂图片：使用详细描述 -->
<figure>
  <img src="complex-diagram.png" alt="工作流程图" />
  <figcaption>
    详细说明：该流程图展示了从用户注册到订单完成的完整流程，
    包括账户验证、商品选择、支付处理等环节。
  </figcaption>
</figure>

<!-- 图片按钮：alt 描述按钮功能 -->
<input type="image" src="search-icon.png" alt="搜索" />
```

### 表单可访问性

表单是用户交互的重要部分，必须确保可访问：

```html
<!-- ✅ 使用 label 关联表单控件 -->
<label for="username">用户名：</label>
<input type="text" id="username" name="username" />

<!-- ✅ 必填字段标识 -->
<label for="email"> 邮箱：<span aria-label="必填" style="color: red;">*</span> </label>
<input type="email" id="email" name="email" required aria-required="true" />

<!-- ✅ 错误提示关联 -->
<label for="password">密码：</label>
<input
  type="password"
  id="password"
  name="password"
  aria-describedby="password-hint password-error"
  aria-invalid="true" />
<p id="password-hint">密码至少8位，包含字母和数字</p>
<p id="password-error" style="color: red;" role="alert">密码不符合要求</p>

<!-- ✅ 字段集分组 -->
<fieldset>
  <legend>联系方式</legend>
  <label for="phone">电话：</label>
  <input type="tel" id="phone" name="phone" />

  <label for="address">地址：</label>
  <input type="text" id="address" name="address" />
</fieldset>
```

### 键盘导航

确保所有交互元素都可以通过键盘访问：

```html
<!-- ✅ 可聚焦的自定义组件 -->
<div role="button" tabindex="0" onclick="handleClick()" onkeydown="handleKeyDown(event)">
  自定义按钮
</div>

<script>
  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleClick()
    }
  }
</script>

<!-- ✅ 跳过导航链接 -->
<a href="#main-content" class="skip-link">跳过导航</a>
<nav>
  <!-- 导航内容 -->
</nav>
<main id="main-content">
  <!-- 主要内容 -->
</main>

<style>
  .skip-link {
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px;
    z-index: 100;
  }
  .skip-link:focus {
    top: 0;
  }
</style>
```

### ARIA 属性使用

当原生 HTML 语义不足时，使用 ARIA 属性增强可访问性：

```html
<!-- 标签页组件 -->
<div role="tablist" aria-label="功能设置">
  <button role="tab" id="tab-general" aria-selected="true" aria-controls="panel-general">
    常规设置
  </button>
  <button role="tab" id="tab-security" aria-selected="false" aria-controls="panel-security">
    安全设置
  </button>
</div>

<div role="tabpanel" id="panel-general" aria-labelledby="tab-general">
  <h2>常规设置内容</h2>
  <!-- 设置选项 -->
</div>

<div role="tabpanel" id="panel-security" aria-labelledby="tab-security" hidden>
  <h2>安全设置内容</h2>
  <!-- 设置选项 -->
</div>

<!-- 实时区域：通知 -->
<div aria-live="polite" aria-atomic="true" id="notifications">
  <!-- 动态更新的通知内容 -->
</div>

<!-- 模态框 -->
<div role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-desc">
  <h2 id="dialog-title">确认删除</h2>
  <p id="dialog-desc">此操作不可撤销，确定要删除吗？</p>
  <button>确认</button>
  <button>取消</button>
</div>
```

### 常见 ARIA 属性

| 属性               | 用途                 | 示例                         |
| ------------------ | -------------------- | ---------------------------- |
| `role`             | 定义元素角色         | `role="button"`              |
| `aria-label`       | 提供可访问名称       | `aria-label="关闭"`          |
| `aria-labelledby`  | 关联可见标签         | `aria-labelledby="title-id"` |
| `aria-describedby` | 关联描述文本         | `aria-describedby="desc-id"` |
| `aria-hidden`      | 隐藏元素（辅助技术） | `aria-hidden="true"`         |
| `aria-live`        | 实时区域更新         | `aria-live="polite"`         |
| `aria-expanded`    | 展开/折叠状态        | `aria-expanded="true"`       |
| `aria-selected`    | 选中状态             | `aria-selected="false"`      |
| `aria-checked`     | 复选状态             | `aria-checked="mixed"`       |
| `aria-disabled`    | 禁用状态             | `aria-disabled="true"`       |
| `aria-invalid`     | 数据无效             | `aria-invalid="true"`        |
| `aria-required`    | 必填标识             | `aria-required="true"`       |

### 可访问性检查清单

**语义化：**

- [ ] 使用正确的 HTML 语义元素
- [ ] 标题层级按顺序使用（h1 -> h2 -> h3）
- [ ] 列表使用正确的元素（ul/ol/dl）
- [ ] 表格使用语义化标签（thead/tbody/th）

**键盘：**

- [ ] 所有交互元素可通过 Tab 访问
- [ ] Tab 顺序符合逻辑
- [ ] 提供跳过导航链接
- [ ] 焦点状态清晰可见
- [ ] 无键盘陷阱

**图片与媒体：**

- [ ] 所有有意义的图片都有 alt 文本
- [ ] 装饰性图片使用空 alt
- [ ] 视频提供字幕和文字描述
- [ ] 音频提供文字描述

**表单：**

- [ ] 所有表单控件有关联的 label
- [ ] 必填字段有明确标识
- [ ] 错误信息清晰且关联到字段
- [ ] 表单说明文本关联到对应字段

**颜色与对比度：**

- [ ] 文本对比度至少 4.5:1（普通文本）
- [ ] 文本对比度至少 3:1（大文本）
- [ ] 不仅依赖颜色传达信息
- [ ] 链接有明显区分（除了颜色）

**移动端与触控：**

- [ ] 触控目标足够大（至少 44x44px）
- [ ] 触控目标间距足够
- [ ] 支持手势操作（有替代方案）

### 可访问性测试工具

| 工具                     | 类型       | 用途                   |
| ------------------------ | ---------- | ---------------------- |
| Chrome DevTools          | 浏览器内置 | Accessibility 面板检查 |
| axe DevTools             | 浏览器插件 | 自动化可访问性测试     |
| WAVE                     | 浏览器插件 | 可视化可访问性问题     |
| Lighthouse               | 浏览器内置 | 性能与可访问性审计     |
| NVDA                     | 读屏软件   | Windows 读屏测试       |
| VoiceOver                | 读屏软件   | macOS/iOS 读屏测试     |
| Keyboard Tab             | 键盘测试   | 键盘导航测试           |
| Colour Contrast Analyser | 桌面应用   | 颜色对比度检测         |

## 元信息 Meta 与 SEO 基础

`<meta>` 标签提供的信息是用户不可见的，一般用来定义页面信息的名称、关键字、作者等。在 HTML 中 `<meta>` 标签不需要设置结束标签。在 HTML 头页面中可以有多个 `<meta>` 标签

### 必配元信息

| 标签     | 推荐写法                                                                 | 说明                                   |
| -------- | ------------------------------------------------------------------------ | -------------------------------------- |
| 字符集   | `<meta charset="utf-8" />`                                               | 尽量靠前，避免乱码                     |
| 视口     | `<meta name="viewport" content="width=device-width, initial-scale=1" />` | 移动端布局基础                         |
| 页面标题 | `<title>...</title>`                                                     | 搜索结果标题的重要来源之一             |
| 描述     | `<meta name="description" content="..." />`                              | 可能用于搜索结果摘要（由搜索引擎决定） |

### 常用配置

#### 设置页面关键字

```html
<meta name="keywords" content="html, 元信息, 关键字" />
<meta name="description" content="关于HTML使用的网站" />
```

> **注意**：`keywords` 可以了解，但不建议在现代项目中依赖它进行排名（主流搜索引擎如 Google、Bing 基本不再使用或权重极低），滥用甚至可能被判定为作弊。更重要的是保持页面内容与用户查询的高度相关性

#### 限制搜索方式

```html
<!-- 允许索引和跟踪链接（默认行为） -->
<meta name="robots" content="index, follow" />
<!-- 
其他常用配置：
- <meta name="robots" content="noindex, follow" /> 禁止索引但允许跟踪链接
- <meta name="robots" content="noindex, nofollow" /> 禁止索引和跟踪链接
- <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" /> 禁止索引、跟踪链接、缓存和显示摘要
-->
```

常用 `content` 值及含义：

| 指令值         | 说明                                    | 示例                                          |
| -------------- | --------------------------------------- | --------------------------------------------- |
| `index`        | 允许搜索引擎索引此页面                  | `<meta name="robots" content="index">`        |
| `noindex`      | 禁止搜索引擎索引此页面                  | `<meta name="robots" content="noindex">`      |
| `follow`       | 允许搜索引擎跟踪此页面上的链接          | `<meta name="robots" content="follow">`       |
| `nofollow`     | 禁止搜索引擎跟踪此页面上的链接          | `<meta name="robots" content="nofollow">`     |
| `all`          | 等同于 `index, follow`（默认行为）      | `<meta name="robots" content="all">`          |
| `none`         | 等同于 `noindex, nofollow`              | `<meta name="robots" content="none">`         |
| `noarchive`    | 禁止搜索引擎缓存此页面                  | `<meta name="robots" content="noarchive">`    |
| `nosnippet`    | 不在搜索结果中显示摘要                  | `<meta name="robots" content="nosnippet">`    |
| `noodp`        | 禁止使用开放目录项目(ODP)中的标题和描述（已过时：Google 等已不再读取 ODP 数据） | `<meta name="robots" content="noodp">`        |
| `noydir`       | 禁止使用雅虎目录中的标题和描述（已过时：雅虎目录已于 2014 年关闭） | `<meta name="robots" content="noydir">`       |
| `noimageindex` | 禁止索引页面上的图片                    | `<meta name="robots" content="noimageindex">` |
| `notranslate`  | 禁止翻译此页面                          | `<meta name="robots" content="notranslate">`  |

**注意事项：**

1. 这些指令是**建议性**的，不是强制性的，搜索引擎可能会选择性遵守
2. 对于重要页面，建议明确使用 `noindex` 防止被错误索引
3. 可以针对不同搜索引擎使用不同的 meta 标签，如 `googlebot`、`bingbot` 等
4. 也可以通过 robots.txt 文件进行更全面的爬虫控制

#### 设置网页的定时跳转

1. **页面自动刷新**：不指定 URL 时，只刷新当前页面
2. **页面自动跳转**：指定 URL 时，定时跳转到新页面

```html
<meta http-equiv="refresh" content="秒数; URL=目标地址" />

<!-- 5秒后自动刷新当前页面 -->
<!-- <meta http-equiv="refresh" content="5" /> -->
<!-- 3秒后自动跳转到example.com -->
<!-- <meta http-equiv="refresh" content="3; URL=https://www.example.com" /> -->
<!-- 10秒后重新加载当前页面 -->
<!-- <meta http-equiv="refresh" content="10; URL=currentpage.html" /> -->
```

参数说明：

| 参数      | 说明                                                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------- |
| `content` | 必需属性，格式为"秒数; URL=目标地址" 秒数：等待多少秒后执行操作 URL=目标地址（可选）：跳转的目标 URL |

**注意事项：**

1. **用户体验**：频繁的自动跳转或刷新会影响用户体验，应谨慎使用
2. **SEO 影响**：搜索引擎可能认为这种行为是"门页"或垃圾行为
3. **替代方案**：对于重定向，更推荐使用 HTTP 301/302 重定向
4. **可访问性**：应提供明显的提示告知用户即将跳转
5. **移动端**：在移动设备上可能表现不一致

#### 禁止从缓存中调用

在 HTML 中可以通过 `<meta>` 标签的 `http-equiv` 属性来控制页面缓存行为，防止页面被浏览器缓存。以下是几种常用的方法：

```html
<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate, proxy-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

`Cache-Control`：

- `no-store`：禁止缓存任何版本的响应

- `no-cache`：强制每次请求都向服务器验证（即使缓存存在）

- `must-revalidate`：过期后必须重新验证

- `proxy-revalidate`：代理服务器也必须重新验证

`Pragma`：兼容旧版 HTTP/1.0 的 `no-cache`

`Expires`：设置为 `0` 或过去时间，表示立即过期

仅禁止缓存（较宽松方式）

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="-1" />
```

说明：`Expires: -1` 表示立即过期（比 `0` 更明确）

#### 响应式与显示相关的元信息

现代移动设备和桌面浏览器在渲染时会参考额外的元信息。常见配置如下：

- `viewport`：控制布局视口宽度与缩放比例，`viewport-fit=cover` 可让内容延伸到刘海屏安全区域

- `theme-color`：为 Android Chrome、Windows Edge 等浏览器设置地址栏主题色，是 PWA 的基础配置

- `color-scheme`：声明页面支持的明暗主题，浏览器会据此选择默认表单控件与滚动条配色

- `format-detection`：在 iOS Safari 禁用电话号码、邮箱的自动识别，避免被自动添加下划线或弹窗

如果需要兼容旧版 IE 浏览器，可在服务器侧返回 `X-UA-Compatible` 头，而不再推荐依赖 `<meta http-equiv="X-UA-Compatible">`

`viewport` 常见字段说明：

| 字段                 | 作用                             | 建议                         |
| -------------------- | -------------------------------- | ---------------------------- |
| `width=device-width` | 视口宽度跟随设备宽度             | 基本必配                     |
| `initial-scale=1`    | 初始缩放比例                     | 基本必配                     |
| `maximum-scale`      | 最大缩放比例                     | 一般不建议限制               |
| `user-scalable`      | 是否允许用户缩放                 | 一般不建议禁用（影响无障碍） |
| `viewport-fit=cover` | 允许内容延伸到刘海屏安全区域之外 | 全屏沉浸式布局再考虑         |

示例：

```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#0c66ff" />
<meta name="color-scheme" content="light dark" />
<meta name="format-detection" content="telephone=no,email=no" />
```

### robots 配置示例

完整的 HTML 示例：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>robots 示例</title>

    <!-- 建议：明确表达索引策略（示例为"允许索引并跟踪链接"，即默认行为） -->
    <meta name="robots" content="index,follow" />

    <style>
      .note {
        padding: 10px;
        border-left: 4px solid #0c66ff;

        & code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
      }
    </style>
  </head>
  <body>
    <div class="note">
      <p>
        当你需要"强制不收录"时，优先用
        <code>HTTP 响应头 X-Robots-Tag</code> 或服务端路由控制， 再辅以 <code>meta robots</code>。
      </p>
    </div>
  </body>
</html>
```

## 资源加载：script / link / 资源提示

<h4>009-resource-hints.html</h4>

```html
<!-- 来源：1-HTML 基础.md - 资源提示（Resource Hints） -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>【009】资源提示 Resource Hints</title>

  <!-- 1) 预连接：减少首次建立连接开销（第三方域名常用） -->
  <link rel="preconnect" href="https://fonts.googleapis.com" crossorigin />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />

  <!-- 2) 预加载：当前页面关键资源 -->
  <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" as="style" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" />

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    h1 { color: #333; margin-bottom: 20px; font-size: 24px; }

    .hint-card {
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
      border: 1px solid #667eea30;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 20px;
    }

    .hint-card h3 { color: #667eea; margin-bottom: 10px; font-size: 16px; }
    .hint-card code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: rgba(102,126,234,0.1); padding: 2px 6px; border-radius: 3px; font-size: 13px; }
    .hint-card p { color: #555; line-height: 1.7; font-size: 14px; margin-top: 8px; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      font-size: 14px;
    }

    th, td {
      padding: 12px;
      text-align: left;
      border: 1px solid #dee2e6;
    }

    th { background: #f8f9fa; font-weight: 600; color: #495057; }
    tr:nth-child(even) { background: #fdfdfd; }

    td:first-child { font-weight: 600; color: #007bff; font-family: ui-monospace, monospace; }

    .tips {
      background: #d4edda;
      padding: 18px;
      border-radius: 6px;
      border-left: 4px solid #28a745;
      margin-top: 25px;
      font-size: 14px;
      line-height: 1.8;
    }

    .tips li { margin-left: 20px; margin-top: 5px; }
    .tips code { background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 3px; font-family: ui-monospace, monospace; }
  </style>
</head>
<body>
  <div class="container">
    <h1>资源提示（Resource Hints）</h1>
    <p style="color: #666; margin-bottom: 25px;">
      资源提示是浏览器提供的性能优化 API，允许开发者提前声明即将需要的资源。
      本页面使用了以下资源提示技术：
    </p>

    <div class="hint-card">
      <h3>🔗 preconnect - 预连接</h3>
      <code>&lt;link rel=&quot;preconnect&quot; href=&quot;...&quot; crossorigin&gt;</code>
      <p>提前与 Google Fonts 建立 DNS/TCP/TLS 连接，减少字体加载时的延迟。</p>
    </div>

    <div class="hint-card">
      <h3>⚡ preload - 预加载</h3>
      <code>&lt;link rel=&quot;preload&quot; href=&quot;...&quot; as=&quot;style&quot;&gt;</code>
      <p>以高优先级预加载关键 CSS 字体资源，避免渲染阻塞。</p>
    </div>

    <h2 style="margin: 25px 0 12px; font-size: 18px; color: #555;">资源提示对比</h2>
    <table>
      <thead>
        <tr>
          <th>属性 (rel)</th>
          <th>作用</th>
          <th>优先级</th>
          <th>典型场景</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>preconnect</td>
          <td>提前建立 DNS/TCP/TLS 连接</td>
          <td>中</td>
          <td>第三方域名（字体/CDN/API）</td>
        </tr>
        <tr>
          <td>preload</td>
          <td>高优先级预加载当前页面关键资源</td>
          <td>高</td>
          <td>关键 CSS、JS、字体、图片</td>
        </tr>
        <tr>
          <td>prefetch</td>
          <td>低优先级预取可能用到的资源</td>
          <td>低</td>
          <td>下一页路由、用户可能点击的页面</td>
        </tr>
        <tr>
          <td>modulepreload</td>
          <td>预加载 ES Module 依赖图</td>
          <td>高</td>
          <td>配合 type="module" 使用</td>
        </tr>
        <tr>
          <td>dns-prefetch</td>
          <td>仅执行 DNS 查询</td>
          <td>低</td>
          <td>低优先级的第三方域名</td>
        </tr>
      </tbody>
    </table>

    <div class="tips">
      <strong>✅ 最佳实践：</strong>
      <ul>
        <li><code>preconnect</code> 用于第三方 CDN、字体服务等跨域资源</li>
        <li><code>preload</code> 必须写正确的 <code>as</code> 属性，否则浏览器可能重复下载</li>
        <li><code>prefetch</code> 用于下一页或用户可能访问的资源，带宽充裕时使用</li>
        <li>不要过度使用资源提示，只针对真正关键的资源</li>
        <li>可以通过 Chrome DevTools → Network 面板验证资源加载顺序</li>
      </ul>
    </div>
  </div>
</body>
</html>
```

### `script` 资源加载

| 写法                         | 下载                         | 执行时机           | 顺序保证       | 典型场景                 |
| ---------------------------- | ---------------------------- | ------------------ | -------------- | ------------------------ |
| `<script src>`               | 阻塞解析                     | 立刻执行           | 按出现顺序     | 不推荐放在 `<head>` 顶部 |
| `<script defer src>`         | 不阻塞解析                   | DOM 解析完成后执行 | 保序           | 业务脚本（有依赖链）     |
| `<script async src>`         | 不阻塞解析                   | 下载完立刻执行     | 不保序         | 统计/埋点等独立脚本      |
| `<script type="module" src>` | 不阻塞解析（默认类似 defer） | DOM 解析完成后执行 | 保序（模块图） | 现代工程默认选择         |

### 资源提示

![资源提示对比示意图（SVG，可放大）](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202602102011796.svg)

| rel             | 作用                               | 优先级 | 常见 as                     | 备注                          |
| --------------- | ---------------------------------- | ------ | --------------------------- | ----------------------------- |
| `preconnect`    | 提前建立连接（DNS/TCP/TLS）        | 中     | -                           | 常用于第三方域名（字体/CDN）  |
| `preload`       | 以较高优先级预加载当前页面关键资源 | 高     | `style` / `script` / `font` | 要写对 `as`，否则可能重复下载 |
| `modulepreload` | 预加载 ES Module 依赖              | 高     | `script`                    | 配合 `type="module"`          |
| `prefetch`      | 低优先级预取"可能会用到"的资源     | 低     | -                           | 常用于下一页路由资源          |

最小示例（演示 preload / prefetch / modulepreload 的写法与注意点）：

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>资源提示示例</title>

    <!-- 1) 预连接：减少首次建立连接开销（第三方域名常用） -->
    <link rel="preconnect" href="https://example-cdn.invalid" crossorigin />

    <!-- 2) 预加载：当前页面关键资源（示例 URL 为占位符，请替换为真实资源） -->
    <link rel="preload" href="/assets/critical.css" as="style" />
    <link rel="stylesheet" href="/assets/critical.css" />

    <!-- 3) 预取：下一页"可能需要"的资源，优先级更低 -->
    <link rel="prefetch" href="/assets/next-page.chunk.js" />

    <!-- 4) 模块预加载：为 module 依赖图提前拉取（示例占位符） -->
    <link rel="modulepreload" href="/assets/app.js" />
    <script type="module" src="/assets/app.js"></script>

    <style>
      .tips {
        padding: 12px;

        & li {
          margin: 6px 0;
        }
      }
    </style>
  </head>
  <body>
    <ul class="tips">
      <li>若你在本地直接打开本示例，这些资源 URL 会 404，这是预期的（因为是占位符）。</li>
      <li>在真实项目里，确保 preload 的资源在页面中确实会被使用，避免浪费带宽。</li>
    </ul>
  </body>
</html>
```

## 性能与安全（现代浏览器策略）

### 性能：加载顺序、懒加载、响应式资源

| 方向           | 建议                                     | 示例 / 备注                             |
| -------------- | ---------------------------------------- | --------------------------------------- |
| 关键资源优先   | 关键 CSS 可 `preload` 或内联小段关键样式 | 避免阻塞首屏渲染                        |
| 非关键 JS 延后 | `defer` / `type="module"`                | 避免阻塞 DOM 解析                       |
| 懒加载         | `loading="lazy"`（img/iframe）           | 提升首屏速度、减少带宽浪费              |
| 响应式图片     | `srcset` + `sizes` / `<picture>`         | 避免移动端下载大图                      |
| 减少嵌入成本   | 谨慎使用 `<iframe>`                      | 能不嵌就不嵌；必要时加 `loading="lazy"` |

最小示例：图片懒加载 + 响应式图片（占位 URL 请替换为真实图片）

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>图片性能示例</title>
    <style>
      .grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));

        & img {
          width: 100%;
          height: auto;
          border-radius: 12px;
          background: color-mix(in oklab, CanvasText 10%, transparent);
        }
      }
    </style>
  </head>
  <body>
    <h1>图片性能最小示例</h1>

    <div class="grid">
      <!-- loading="lazy"：让浏览器在即将进入视口时再加载 -->
      <img
        loading="lazy"
        decoding="async"
        src="./images/demo-480.jpg"
        srcset="./images/demo-480.jpg 480w, ./images/demo-960.jpg 960w"
        sizes="(max-width: 600px) 100vw, 50vw"
        alt="示例图片（请替换为真实资源）" />
    </div>
  </body>
</html>
```

### 安全：CSP、混合内容、SRI、noopener

#### CSP（Content Security Policy）

推荐口径：**CSP 优先由 HTTP 响应头下发**；`<meta http-equiv="Content-Security-Policy">` 仅适用于无法改服务器配置的场景（能力与行为会受限）

**示例：HTTP 响应头（推荐）**

```text
Content-Security-Policy:
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  frame-ancestors 'none';
  img-src 'self' data:;
  style-src 'self' 'unsafe-inline';
  script-src 'self';
  upgrade-insecure-requests;
```

**示例：HTML meta（不如响应头可靠，但可用于静态站点快速加固）**

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>CSP meta 示例</title>

    <!-- 注意：实际工程更推荐用响应头配置 CSP -->
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'; upgrade-insecure-requests" />

    <style>
      .box {
        padding: 12px;

        & code {
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
      }
    </style>
  </head>
  <body>
    <div class="box">
      <p>此页面启用了简化版 CSP（仅演示写法）。</p>
      <p>如果你引入了第三方脚本/样式，需要显式放行对应域名或使用 nonce/hash。</p>
    </div>
  </body>
</html>
```

#### HTTPS 混合内容（Mixed Content）

当页面通过 HTTPS 加载时：

- **主动混合内容（Active Mixed Content）**：例如 `http://` 的脚本、iframe、XHR/fetch —— 会被现代浏览器直接阻止。
- **被动混合内容（Passive Mixed Content）**：例如 `http://` 图片 —— 也越来越多被限制/降级，且会造成安全警告。

建议：

- 所有资源统一使用 `https://`，或使用相对协议/相对路径（优先相对路径）
- 迁移期可用 `upgrade-insecure-requests`（CSP 指令）尝试自动升级，但不要把它当"长期方案"。

#### `target="_blank"`：必须配 `rel="noopener noreferrer"`

```html
<a href="https://example.com" target="_blank" rel="noopener noreferrer">
  新标签页打开（防止 tabnabbing）
</a>
```

## 常见错误与最佳实践

### 常见错误示例

#### 1. DOCTYPE 和字符集问题

```html
<!-- ❌ 错误：缺少 DOCTYPE 或位置错误 -->
<html>
  <head>
    <title>页面标题</title>
    <meta charset="UTF-8" />
  </head>
</html>

<!-- ❌ 错误：字符集声明过晚 -->
<html>
  <head>
    <title>页面标题</title>
    <meta name="description" content="描述" />
    <meta charset="UTF-8" />
    <!-- 应该在最前面 -->
  </head>
</html>

<!-- ✅ 正确：DOCTYPE 在第一行，字符集声明靠前 -->
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>页面标题</title>
  </head>
</html>
```

#### 2. 语义化错误

```html
<!-- ❌ 错误：使用 div 模拟按钮 -->
<div class="button" onclick="submit()">提交</div>

<!-- ✅ 正确：使用原生 button 元素 -->
<button type="submit">提交</button>

<!-- ❌ 错误：标题层级跳跃 -->
<h1>网站标题</h1>
<h3>子标题</h3>
<!-- 应该是 h2 -->

<!-- ✅ 正确：标题层级连续 -->
<h1>网站标题</h1>
<h2>主要章节</h2>
<h3>子章节</h3>

<!-- ❌ 错误：滥用 section -->
<section>
  <div class="wrapper">
    <p>内容</p>
  </div>
</section>

<!-- ✅ 正确：section 应有明确主题 -->
<section>
  <h2>产品介绍</h2>
  <p>详细内容...</p>
</section>
```

#### 3. 图片使用错误

```html
<!-- ❌ 错误：缺少 alt 属性 -->
<img src="photo.jpg" />

<!-- ❌ 错误：无意义的 alt -->
<img src="chart.png" alt="图片" />

<!-- ✅ 正确：描述性的 alt -->
<img src="chart.png" alt="2024年Q1销售额增长趋势图，同比增长25%" />

<!-- ❌ 错误：图片用于装饰但 alt 不为空 -->
<img src="decoration.png" alt="装饰图案" />

<!-- ✅ 正确：装饰性图片使用空 alt -->
<img src="decoration.png" alt="" />
```

#### 4. 表单可访问性错误

```html
<!-- ❌ 错误：label 未关联 input -->
<label>用户名：</label>
<input type="text" name="username" />

<!-- ✅ 正确：使用 for 属性关联 -->
<label for="username">用户名：</label>
<input type="text" id="username" name="username" />

<!-- ❌ 错误：错误提示未关联 -->
<input type="text" name="email" />
<span style="color: red;">请输入有效的邮箱地址</span>

<!-- ✅ 正确：使用 aria-describedby 关联 -->
<input type="email" id="email" name="email" aria-describedby="email-error" aria-invalid="true" />
<span id="email-error" style="color: red;">请输入有效的邮箱地址</span>
```

#### 5. 性能错误

```html
<!-- ❌ 错误：阻塞渲染的脚本 -->
<head>
  <script src="analytics.js"></script>
  <!-- 阻塞解析 -->
  <script src="app.js"></script>
  <!-- 阻塞解析 -->
</head>

<!-- ✅ 正确：使用 defer 或 async -->
<head>
  <script src="analytics.js" async></script>
  <!-- 独立脚本，异步 -->
  <script src="app.js" defer></script>
  <!-- 依赖 DOM，延迟 -->
</head>

<!-- ❌ 错误：未优化的图片 -->
<img src="large-image.jpg" alt="图片" />

<!-- ✅ 正确：响应式图片 + 懒加载 -->
<img
  src="image-800.jpg"
  srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"
  sizes="(max-width: 600px) 100vw, 50vw"
  loading="lazy"
  alt="描述" />
```

#### 6. 安全错误

```html
<!-- ❌ 错误：target="_blank" 缺少 rel -->
<a href="https://external.com" target="_blank">外部链接</a>

<!-- ✅ 正确：添加 noopener noreferrer -->
<a href="https://external.com" target="_blank" rel="noopener noreferrer">外部链接</a>

<!-- ❌ 错误：混合内容 -->
<!-- 在 HTTPS 页面加载 HTTP 资源 -->
<script src="http://insecure.com/script.js"></script>

<!-- ✅ 正确：使用 HTTPS -->
<script src="https://secure.com/script.js"></script>
```

### HTML 最佳实践清单

#### 文档结构

- ✅ DOCTYPE 声明在第一行
- ✅ `<html>` 元素设置 `lang` 属性
- ✅ `<head>` 中尽早声明字符集
- ✅ 设置视口元信息
- ✅ 提供有意义的页面标题

#### 语义化

- ✅ 使用正确的语义元素（header、nav、main、article、section、aside、footer）
- ✅ 标题层级连续（h1 -> h2 -> h3）
- ✅ 列表使用正确的元素（ul、ol、dl）
- ✅ 表格使用语义化标签（thead、tbody、th）
- ✅ 使用 `<figure>` 和 `<figcaption>` 包裹图片和说明

#### 可访问性

- ✅ 图片提供描述性 alt 文本
- ✅ 表单控件有关联的 label
- ✅ 所有交互元素可通过键盘访问
- ✅ 提供跳过导航链接
- ✅ 焦点状态清晰可见
- ✅ 颜色对比度符合标准（至少 4.5:1）
- ✅ 不仅依赖颜色传达信息

#### 性能

- ✅ 关键 CSS 内联或预加载
- ✅ JavaScript 使用 `defer` 或 `async`
- ✅ 图片使用懒加载（`loading="lazy"`）
- ✅ 图片使用响应式（`srcset` 和 `sizes`）
- ✅ 预连接关键域名（`rel="preconnect"`）
- ✅ 压缩和优化资源

#### SEO

- ✅ 提供唯一且描述性的页面标题
- ✅ 提供页面描述（meta description）
- ✅ 使用语义化 HTML 结构
- ✅ 图片有描述性 alt 文本
- ✅ URL 结构清晰有意义
- ✅ 使用规范链接（canonical）

#### 安全

- ✅ 使用 HTTPS
- ✅ 配置 CSP（内容安全策略）
- ✅ 外部链接使用 `rel="noopener noreferrer"`
- ✅ 避免混合内容
- ✅ 不在 HTML 中嵌入敏感信息

#### 代码质量

- ✅ 使用小写标签和属性名
- ✅ 属性值使用双引号
- ✅ 代码格式整齐，缩进一致
- ✅ 添加必要的注释
- ✅ 移除注释掉的代码

## 常见问题解答（FAQ）

### Q1: HTML、CSS、JavaScript 三者的关系是什么？

**A:** HTML、CSS、JavaScript 是 Web 前端开发的三大核心技术：

| 技术       | 角色                   | 职责                 | 类比           |
| ---------- | ---------------------- | -------------------- | -------------- |
| HTML       | 结构层（Structure）    | 定义内容的结构和语义 | 建筑的骨架     |
| CSS        | 表现层（Presentation） | 控制内容的外观和布局 | 建筑的装修     |
| JavaScript | 行为层（Behavior）     | 实现交互和动态功能   | 建筑的设施系统 |

```html
<!-- HTML：定义结构 -->
<button id="myButton">点击我</button>

<!-- CSS：定义样式 -->
<style>
  #myButton {
    background-color: #007bff;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
</style>

<!-- JavaScript：定义行为 -->
<script>
  document.getElementById("myButton").addEventListener("click", function () {
    alert("按钮被点击了！")
  })
</script>
```

### Q2: 什么是 HTML 实体？为什么要使用它们？

**A:** HTML 实体是用来表示特殊字符的代码序列。主要用于：

1. **显示保留字符**：HTML 中有特殊含义的字符必须转义

   ```html
   <!-- ❌ 错误：< 会被解析为标签 -->
   <p>使用</p>
   <p>标签定义段落</p>

   <!-- ✅ 正确：使用实体 -->
   <p>使用 &lt;p&gt; 标签定义段落</p>
   ```

2. **显示特殊符号**：版权、商标等

   ```html
   <p>&copy; 2024 我的网站 &trade;</p>
   ```

3. **控制空格**：多个连续空格在 HTML 中会被合并为一个
   ```html
   <p>这是&nbsp;&nbsp;&nbsp;多个空格</p>
   ```

### Q3: 什么是语义化 HTML？为什么它很重要？

**A:** 语义化 HTML 是指使用正确的标签来表达内容的含义，而不是仅仅用于显示样式。

**重要性：**

| 优势     | 说明                               |
| -------- | ---------------------------------- |
| SEO      | 搜索引擎更容易理解内容结构和重要性 |
| 可访问性 | 读屏软件能够更好地导航和理解页面   |
| 可维护性 | 代码更易读，团队协作更高效         |
| 性能     | 浏览器优化渲染，提升页面加载速度   |

```html
<!-- ❌ 非语义化 -->
<div class="header">
  <div class="nav">
    <div class="link">首页</div>
  </div>
</div>

<!-- ✅ 语义化 -->
<header>
  <nav>
    <a href="/">首页</a>
  </nav>
</header>
```

### Q4: 如何选择合适的 HTML5 语义标签？

**A:** 根据内容用途选择：

| 标签        | 使用场景                       | 是否唯一 |
| ----------- | ------------------------------ | -------- |
| `<header>`  | 页面或区块头部                 | 可多个   |
| `<nav>`     | 主要导航                       | 可多个   |
| `<main>`    | 页面主要内容                   | **唯一** |
| `<article>` | 可独立分发的内容（文章、帖子） | 可多个   |
| `<section>` | 主题分区（通常有标题）         | 可多个   |
| `<aside>`   | 侧边栏、补充信息               | 可多个   |
| `<footer>`  | 页面或区块尾部                 | 可多个   |

**决策流程：**

1. 是否是页面的主要导航？→ `<nav>`
2. 是否是页面的核心内容？→ `<main>`
3. 内容能否独立存在（如文章）？→ `<article>`
4. 内容是否是主题分区（带标题）？→ `<section>`
5. 内容是否是补充信息？→ `<aside>`
6. 是否是头部或尾部？→ `<header>` / `<footer>`
7. 以上都不是？→ `<div>`

### Q5: 什么是 DOCTYPE？为什么必须声明？

**A:** DOCTYPE 是文档类型声明，作用是告诉浏览器使用哪种 HTML 规范来解析页面。

**不声明 DOCTYPE 的后果：**

- 浏览器进入"怪异模式"（Quirks Mode）
- 不同浏览器表现不一致
- CSS 渲染规则可能不同
- JavaScript 行为可能异常

```html
<!-- HTML5 的 DOCTYPE 声明（简洁） -->
<!DOCTYPE html>

<!-- HTML 4.01 的 DOCTYPE 声明（复杂，已过时） -->
<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
```

### Q6: `defer` 和 `async` 有什么区别？

**A:** 两者都用于控制脚本加载和执行时机：

| 特性                      | `defer`                              | `async`                | 无属性         |
| ------------------------- | ------------------------------------ | ---------------------- | -------------- |
| 下载时机                  | 不阻塞 HTML 解析                     | 不阻塞 HTML 解析       | 阻塞 HTML 解析 |
| 执行时机                  | HTML 解析完成后，DOMContentLoaded 前 | 下载完成后立即执行     | 下载后立即执行 |
| 执行顺序                  | 按声明顺序执行                       | 谁先下载完谁先执行     | 按声明顺序     |
| 是否阻塞 DOMContentLoaded | 是                                   | 可能（如果下载快）     | 是             |
| 使用场景                  | 有依赖关系的脚本                     | 独立脚本（统计、广告） | 不推荐         |

```html
<!-- defer: 适合有依赖关系的脚本 -->
<script src="library.js" defer></script>
<script src="app.js" defer></script>
<!-- library.js 一定在 app.js 前执行 -->

<!-- async: 适合独立脚本 -->
<script src="analytics.js" async></script>
<script src="ads.js" async></script>
<!-- 执行顺序不确定 -->
```

### Q7: 如何优化图片加载性能？

**A:** 图片优化是性能优化的重点：

**1. 响应式图片：**

```html
<img
  src="image-800.jpg"
  srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"
  sizes="(max-width: 600px) 100vw, 50vw"
  alt="响应式图片示例" />
```

**2. 懒加载：**

```html
<img src="image.jpg" loading="lazy" alt="懒加载图片" />
```

**3. 现代图片格式：**

```html
<picture>
  <source srcset="image.avif" type="image/avif" />
  <source srcset="image.webp" type="image/webp" />
  <img src="image.jpg" alt="渐进式图片格式" />
</picture>
```

**4. 图片压缩：**

- 使用工具压缩图片（TinyPNG、ImageOptim）
- 选择合适的格式（JPEG 照片、PNG 图标、SVG 矢量图）
- 提供适当的分辨率

### Q8: 什么是混合内容？如何解决？

**A:** 混合内容是指 HTTPS 页面中加载 HTTP 资源。

**混合内容类型：**

| 类型         | 示例                     | 浏览器行为 |
| ------------ | ------------------------ | ---------- |
| 主动混合内容 | HTTP 的脚本、iframe、XHR | **被阻止** |
| 被动混合内容 | HTTP 的图片、音频、视频  | 允许但警告 |

**解决方案：**

1. **统一使用 HTTPS**：所有资源使用 HTTPS

   ```html
   <!-- ✅ 正确 -->
   <script src="https://cdn.example.com/script.js"></script>
   ```

2. **使用相对协议**：

   ```html
   <script src="//cdn.example.com/script.js"></script>
   ```

3. **使用 CSP 自动升级**：
   ```html
   <meta http-equiv="Content-Security-Policy" content="upgrade-insecure-requests" />
   ```

### Q9: 如何确保表单可访问性？

**A:** 表单可访问性要点：

```html
<!-- 1. 关联 label 和 input -->
<label for="email">邮箱地址：</label>
<input type="email" id="email" name="email" required />

<!-- 2. 分组表单字段 -->
<fieldset>
  <legend>个人信息</legend>

  <label for="name">姓名：</label>
  <input type="text" id="name" name="name" />

  <label for="phone">电话：</label>
  <input type="tel" id="phone" name="phone" />
</fieldset>

<!-- 3. 提供错误提示 -->
<label for="password">密码：</label>
<input
  type="password"
  id="password"
  name="password"
  aria-describedby="password-hint password-error"
  aria-invalid="true" />
<p id="password-hint">至少8位，包含字母和数字</p>
<p id="password-error" role="alert" style="color: red;">密码不符合要求</p>

<!-- 4. 标识必填字段 -->
<label for="username"> 用户名：<span aria-label="必填" style="color: red;">*</span> </label>
<input type="text" id="username" name="username" required />
```

### Q10: 如何选择合适的 meta 标签？

**A:** 常用 meta 标签分类：

**必需：**

```html
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>页面标题</title>
```

**SEO 相关：**

```html
<meta name="description" content="页面描述，显示在搜索结果中" />
<meta name="keywords" content="关键词1, 关键词2" />
<meta name="author" content="作者名称" />
<meta name="robots" content="index, follow" />
```

**社交媒体：**

```html
<meta property="og:title" content="页面标题" />
<meta property="og:description" content="页面描述" />
<meta property="og:image" content="https://example.com/image.jpg" />
<meta property="og:url" content="https://example.com/page" />
<meta name="twitter:card" content="summary_large_image" />
```

**浏览器行为：**

```html
<meta name="theme-color" content="#ffffff" />
<meta name="color-scheme" content="light dark" />
<!-- X-UA-Compatible 仅供旧版 IE 兼容，现代项目不需要（见上文"响应式与显示相关的元信息"） -->
```

**缓存控制（优先使用服务器响应头）：**

```html
<meta http-equiv="Cache-Control" content="no-cache" />
```

## 参考资料

- WHATWG HTML Living Standard：<https://html.spec.whatwg.org/>
- MDN Web Docs – HTML：<https://developer.mozilla.org/zh-CN/docs/Web/HTML>
- MDN – HTML 性能优化：<https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Extensions/Performance/HTML>
- Can I use（特性兼容性查询）：<https://caniuse.com/>



## 补充示例

<h4>001-html5-new-elements.html</h4>

```html
<!-- 来源：1-HTML 基础.md - HTML Living Standard 新增元素 -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>【001】HTML5 新增语义化元素</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 20px; font-size: 24px; }
    .section { margin-bottom: 30px; }
    search { display: block; margin-bottom: 20px; }
    search form { display: flex; gap: 10px; align-items: center; }
    search input { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; flex: 1; }
    search button { padding: 8px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    search button:hover { background: #0056b3; }

    dialog { border: none; border-radius: 12px; padding: 24px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); max-width: 400px; }
    dialog::backdrop { background: rgba(0,0,0,0.5); }
    dialog p { margin-bottom: 20px; color: #333; line-height: 1.6; }
    dialog button { padding: 8px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; margin-right: 10px; }
    dialog button[value="cancel"] { background: #6c757d; color: white; }
    dialog button[value="confirm"] { background: #dc3545; color: white; }

    .open-dialog-btn { padding: 12px 24px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    .open-dialog-btn:hover { background: #218838; }

    .info { background: #e7f3ff; padding: 15px; border-left: 4px solid #007bff; border-radius: 4px; margin-top: 20px; font-size: 14px; line-height: 1.6; }
    .info code { background: rgba(0,123,255,0.1); padding: 2px 6px; border-radius: 3px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  </style>
</head>
<body>
  <div class="container">
    <h1>HTML5 Living Standard 新增元素</h1>

    <div class="section">
      <h3>&lt;search&gt; 元素（2023）</h3>
      <p style="color: #666; margin-bottom: 10px;">语义化搜索区域，用于标记搜索相关内容区块：</p>
      <search>
        <form action="/search" method="get" onsubmit="event.preventDefault(); alert('搜索功能演示');">
          <label for="q">搜索</label>
          <input type="search" id="q" name="q" placeholder="输入关键词" />
          <button type="submit">搜索</button>
        </form>
      </search>
    </div>

    <div class="section">
      <h3>&lt;dialog&gt; 元素（2022）</h3>
      <p style="color: #666; margin-bottom: 10px;">原生模态/非模态对话框，替代 JS/ARIA 实现的模态框：</p>

      <dialog id="confirmDialog">
        <form method="dialog">
          <p>确定要删除这条记录吗？此操作不可撤销。</p>
          <button value="cancel">取消</button>
          <button value="confirm">确认</button>
        </form>
      </dialog>

      <button class="open-dialog-btn" onclick="document.getElementById('confirmDialog').showModal()">
        打开确认对话框
      </button>
    </div>

    <div class="info">
      <strong>说明：</strong><br>
      • <code>&lt;search&gt;</code> 是 WHATWG 2023 年新增的语义化标签，用于标记搜索区域<br>
      • <code>&lt;dialog&gt;</code> 支持 <code>showModal()</code> 打开模态框，自动创建遮罩层<br>
      • 这些新元素提升了语义化和可访问性，无需依赖第三方库
    </div>
  </div>
</body>
</html>
```
<h4>002-production-html-template.html</h4>

```html
<!-- 来源：1-HTML 基础.md - 标准文档模板 -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <!-- 字符编码：必须尽早声明，避免乱码 -->
  <meta charset="UTF-8">

  <!-- 视口配置：移动端适配基础 -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- 页面标题：对 SEO 和用户体验至关重要 -->
  <title>【002】生产级 HTML5 文档模板</title>

  <!-- SEO 相关 -->
  <meta name="description" content="这是一个生产环境可用的 HTML5 文档模板示例" />
  <meta name="keywords" content="HTML5, 模板, 最佳实践" />

  <!-- 现代浏览器配置 -->
  <meta name="theme-color" content="#ffffff" />
  <meta name="color-scheme" content="light dark" />

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }

    /* 语义化结构样式 */
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      text-align: center;
    }

    header h1 { font-size: 28px; margin-bottom: 10px; }
    header nav a { color: white; margin: 0 15px; text-decoration: none; opacity: 0.9; }
    header nav a:hover { opacity: 1; text-decoration: underline; }

    main {
      max-width: 900px;
      margin: 30px auto;
      padding: 0 20px;
    }

    article {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }

    article h2 { color: #667eea; margin-bottom: 15px; font-size: 22px; }
    article p { margin-bottom: 15px; line-height: 1.8; }

    aside {
      max-width: 900px;
      margin: 0 auto 20px;
      padding: 0 20px;
    }

    aside > div {
      background: #fff3cd;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #ffc107;
    }

    aside h3 { color: #856404; margin-bottom: 10px; }

    footer {
      background: #343a40;
      color: white;
      text-align: center;
      padding: 20px;
      margin-top: 40px;
    }

    footer p { margin: 5px 0; font-size: 14px; opacity: 0.8; }

    @media (max-width: 768px) {
      header h1 { font-size: 22px; }
      main { margin: 20px auto; }
      article { padding: 20px; }
    }
  </style>
</head>
<body>
  <!-- 语义化结构 -->
  <header>
    <h1>我的网站</h1>
    <nav>
      <a href="#home">首页</a>
      <a href="#about">关于</a>
      <a href="#contact">联系</a>
    </nav>
  </header>

  <main>
    <!-- 主要内容 -->
    <article>
      <h2>欢迎使用 HTML5 模板</h2>
      <p>
        这是一个<strong>生产环境可用</strong>的最小 HTML5 文档模板。它包含了现代 Web 开发所需的所有基础配置：
      </p>
      <ul style="margin-left: 20px; margin-bottom: 15px;">
        <li>正确的 DOCTYPE 和字符集声明</li>
        <li>响应式视口配置（viewport）</li>
        <li>SEO 相关的 meta 标签</li>
        <li>语义化的 HTML5 结构标签</li>
        <li>现代浏览器兼容性配置</li>
      </ul>
      <p>
        使用语义化标签（<code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code>, <code>&lt;main&gt;</code>, <code>&lt;article&gt;</code>, <code>&lt;aside&gt;</code>, <code>&lt;footer&gt;</code>）
        可以提升页面的<strong>可访问性</strong>和 <strong>SEO 效果</strong>。
      </p>
    </article>

    <article>
      <h2>为什么选择语义化 HTML？</h2>
      <p>
        语义化 HTML 不仅让代码更易读，还能帮助搜索引擎更好地理解页面结构，
        同时提升屏幕阅读器等辅助技术的体验。
      </p>
    </article>
  </main>

  <aside>
    <div>
      <h3>💡 提示</h3>
      <p>这是侧边栏区域，通常用于放置补充信息、广告或相关推荐内容。</p>
    </div>
  </aside>

  <footer>
    <p>&copy; 2024 我的网站. 保留所有权利.</p>
    <p>使用语义化 HTML5 构建 ✨</p>
  </footer>
</body>
</html>
```
<h4>003-data-attributes.html</h4>

```html
<!-- 来源：1-HTML 基础.md - 数据属性（Data Attributes） -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>【003】数据属性 Data Attributes</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    h1 { color: #333; margin-bottom: 20px; font-size: 24px; }

    .user-card {
      display: inline-block;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px 35px;
      border-radius: 12px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      user-select: none;
    }

    .user-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.4);
    }

    .user-card .name { font-size: 18px; font-weight: bold; margin-bottom: 8px; }
    .user-card .role { font-size: 13px; opacity: 0.9; }

    .output {
      margin-top: 25px;
      padding: 20px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 14px;
      line-height: 1.8;
    }

    .output .label { color: #666; font-weight: bold; }
    .output .value { color: #28a745; }

    .info {
      background: #e7f3ff;
      padding: 15px;
      border-left: 4px solid #007bff;
      border-radius: 4px;
      margin-top: 20px;
      font-size: 14px;
      line-height: 1.6;
    }

    .info code { background: rgba(0,123,255,0.1); padding: 2px 6px; border-radius: 3px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Data Attributes（数据属性）</h1>

    <p style="color: #666; margin-bottom: 20px;">
      点击下方用户卡片，通过 JavaScript 的 <code>dataset</code> API 读取自定义数据属性：
    </p>

    <!-- 用户卡片：使用 data-* 存储额外信息 -->
    <div
      class="user-card"
      data-user-id="12345"
      data-user-name="张三"
      data-user-role="admin"
      onclick="showUserData(this)"
    >
      <div class="name">👤 张三</div>
      <div class="role">系统管理员</div>
    </div>

    <div class="output" id="output">
      <span class="label">点击卡片查看数据...</span>
    </div>

    <div class="info">
      <strong>说明：</strong><br>
      • 属性名以 <code>data-</code> 开头<br>
      • 在 JavaScript 中通过 <code>element.dataset.propertyName</code> 访问<br>
      • 连字符会自动转换为驼峰命名（如 <code>data-user-id</code> → <code>userId</code>）
    </div>
  </div>

  <script>
    function showUserData(element) {
      const output = document.getElementById('output');
      const data = element.dataset;

      output.innerHTML = `
        <span class="label">用户 ID：</span><span class="value">${data.userId}</span><br>
        <span class="label">用户名：</span><span class="value">${data.userName}</span><br>
        <span class="label">角色：</span><span class="value">${data.userRole}</span><br><br>
        <span style="color: #999; font-size: 12px;">HTML 属性值：data-user-id="${element.getAttribute('data-user-id')}"</span>
      `;
    }
  </script>
</body>
</html>
```
<h4>010-image-performance.html</h4>

```html
<!-- 来源：1-HTML 基础.md - 图片性能优化（懒加载 + 响应式图片） -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>【010】图片性能优化：懒加载与响应式图片</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      padding: 20px;
      background: #f5f5f5;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    h1 { color: #333; margin-bottom: 10px; font-size: 24px; }
    .subtitle { color: #666; margin-bottom: 25px; font-size: 14px; }

    /* 图片网格布局 */
    .grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      margin-bottom: 25px;
    }

    .image-card {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      background: linear-gradient(135deg, #e0e7ff 0%, #fce7f3 100%);
      aspect-ratio: 4 / 3;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .image-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.5s ease;
    }

    .image-card img.loaded { opacity: 1; }

    .image-card .placeholder {
      position: absolute;
      color: #94a3b8;
      font-size: 14px;
      text-align: center;
    }

    .image-card .placeholder::before {
      content: '🖼️';
      display: block;
      font-size: 32px;
      margin-bottom: 8px;
    }

    .image-label {
      text-align: center;
      margin-top: 8px;
      font-size: 13px;
      color: #6c757d;
    }

    /* 技术说明卡片 */
    .tech-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 16px;
      margin-top: 25px;
    }

    .tech-card {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 20px;
    }

    .tech-card h3 { color: #007bff; font-size: 15px; margin-bottom: 10px; }
    .tech-card code {
      display: block;
      background: white;
      padding: 12px;
      border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      border: 1px solid #dee2e6;
      overflow-x: auto;
      white-space: pre;
    }

    .tech-card p { color: #666; font-size: 13px; line-height: 1.6; margin-top: 10px; }

    .info-banner {
      background: linear-gradient(135deg, #667eea10 0%, #764ba210 100%);
      border: 1px solid #667eea30;
      border-radius: 8px;
      padding: 18px;
      margin-top: 25px;
      font-size: 14px;
      line-height: 1.7;
    }

    .info-banner strong { color: #667eea; }
    .info-banner code { background: rgba(102,126,234,0.1); padding: 2px 6px; border-radius: 3px; font-family: ui-monospace, monospace; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📸 图片性能优化</h1>
    <p class="subtitle">演示 loading="lazy" 懒加载 + srcset/sizes 响应式图片 + decoding="async" 异步解码</p>

    <div class="grid">
      <!-- 图片1：懒加载 + 响应式 -->
      <div>
        <div class="image-card">
          <img
            loading="lazy"
            decoding="async"
            src="https://picsum.photos/seed/demo1/480/360.jpg"
            srcset="https://picsum.photos/seed/demo1/480/360.jpg 480w,
                    https://picsum.photos/seed/demo1/960/720.jpg 960w"
            sizes="(max-width: 600px) 100vw, 50vw"
            alt="响应式图片示例 1：自然风景"
            onload="this.classList.add('loaded')"
            onerror="this.style.display='none'"
          />
          <div class="placeholder">懒加载中...</div>
        </div>
        <p class="image-label">loading="lazy" + srcset + sizes</p>
      </div>

      <!-- 图片2：懒加载 + 响应式 -->
      <div>
        <div class="image-card">
          <img
            loading="lazy"
            decoding="async"
            src="https://picsum.photos/seed/demo2/480/360.jpg"
            srcset="https://picsum.photos/seed/demo2/480/360.jpg 480w,
                    https://picsum.photos/seed/demo2/960/720.jpg 960w"
            sizes="(max-width: 600px) 100vw, 50vw"
            alt="响应式图片示例 2：城市建筑"
            onload="this.classList.add('loaded')"
            onerror="this.style.display='none'"
          />
          <div class="placeholder">懒加载中...</div>
        </div>
        <p class="image-label">decoding="async" 异步解码</p>
      </div>

      <!-- 图片3：懒加载 + 响应式 -->
      <div>
        <div class="image-card">
          <img
            loading="lazy"
            decoding="async"
            src="https://picsum.photos/seed/demo3/480/360.jpg"
            srcset="https://picsum.photos/seed/demo3/480/360.jpg 480w,
                    https://picsum.photos/seed/demo3/960/720.jpg 960w"
            sizes="(max-width: 600px) 100vw, 50vw"
            alt="响应式图片示例 3：抽象艺术"
            onload="this.classList.add('loaded')"
            onerror="this.style.display='none'"
          />
          <div class="placeholder">懒加载中...</div>
        </div>
        <p class="image-label">滚动到视口时才加载</p>
      </div>
    </div>

    <div class="tech-cards">
      <div class="tech-card">
        <h3>🔄 loading="lazy"</h3>
        <code>loading="lazy"</code>
        <p>告诉浏览器在图片即将进入视口时再加载。对于首屏以下的图片特别有效，可显著提升首屏加载速度。</p>
      </div>

      <div class="tech-card">
        <h3>📐 srcset + sizes</h3>
        <code>srcset="img-480w 480w,
       img-960w 960w"
sizes="(max-width:
  600px) 100vw, 50vw"</code>
        <p>根据设备像素密度和视口宽度自动选择最合适的图片尺寸，移动端不会浪费带宽下载大图。</p>
      </div>

      <div class="tech-card">
        <h3>⚡ decoding="async"</h3>
        <code>decoding="async"</code>
        <p>异步解码图片，避免图片下载完成后阻塞主线程渲染，保持页面流畅性。</p>
      </div>
    </div>

    <div class="info-banner">
      <strong>💡 性能优化要点：</strong><br>
      • <code>loading="lazy"</code> 是原生懒加载，无需 JavaScript 库<br>
      • <code>sizes</code> 应准确描述图片在布局中的实际显示宽度<br>
      • 配合 <code>&lt;picture&gt;</code> 元素可实现艺术方向切换（art direction）<br>
      • 可在 Chrome DevTools → Network 面板勾选 "Slow 3G" 测试懒加载效果
    </div>
  </div>
</body>
</html>
```