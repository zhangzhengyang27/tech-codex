---
title: Margin 与 Padding 属性详解
description: 系统讲解 margin 与 padding 的物理方向属性：margin-top/left/right、padding-top/left/right/bottom 的语法、取值与应用，每个属性均附可交互的 MDN 演示。
category: CSS

---

# Margin 与 Padding 属性详解

## 概述

本文档系统讲解 margin 与 padding 各方向的物理属性。每个属性都配有来自 MDN 的可交互演示，可以直接点击运行查看效果。

## Margin 外边距

### margin-top

设置元素顶部的外边距，支持长度或百分比。

#### margin-top 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>margin-top 属性演示 - MDN 示例</title>
    <meta name="description" content="margin-top 属性演示" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        min-height: 100vh;
        padding: 0;
      }
      .demo-layout {
        display: flex;
        height: 100vh;
        gap: 0;
      }
      .snippet-panel {
        width: 320px;
        flex-shrink: 0;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        border-right: 1px solid #ddd;
        background: #fafafa;
      }
      .snippet-btn {
        padding: 10px 14px;
        border: 1px solid #ccc;
        border-radius: 6px;
        background: #fff;
        font-family: "JetBrains Mono", "Fira Code", monospace;
        font-size: 13px;
        color: #333;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s;
        line-height: 1.4;
      }
      .snippet-btn:hover {
        border-color: #8083ff;
        background: #f0f0ff;
      }
      .snippet-btn.active {
        border-color: #8083ff;
        background: #e8e8ff;
        color: #571bc1;
        font-weight: 600;
      }
      .preview-panel {
        flex: 1;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        overflow: auto;
      }
      .preview-panel > section,
      .preview-panel > div:not(.snippet-panel):not(.demo-layout) {
        flex: 1;
        width: 100%;
        min-height: 0;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #container {
        width: 300px;
        height: 200px;
        display: flex;
        align-content: flex-start;
        flex-direction: column;
        justify-content: flex-start;
      }

      .row {
        height: 33.33%;
        display: inline-block;
        border: solid #ce7777 10px;
        background-color: #2b3a55;
        flex-shrink: 0;
      }

      #example-element {
        border: solid 10px #ffbf00;
        background-color: #2b3a55;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">margin-top: 1em;</button>
        <button class="snippet-btn" data-index="1">margin-top: 10%;</button>
        <button class="snippet-btn" data-index="2">margin-top: 10px;</button>
        <button class="snippet-btn" data-index="3">margin-top: 0;</button>
      </div>
      <div class="preview-panel">
        <section id="default-example">
          <div id="container">
            <div class="row"></div>
            <div class="row transition-all" id="example-element"></div>
            <div class="row"></div>
          </div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  margin-top: 1em;
}`,
        `#example-element {
  margin-top: 10%;
}`,
        `#example-element {
  margin-top: 10px;
}`,
        `#example-element {
  margin-top: 0;
}`,
      ];

      let styleEl = document.createElement("style");
      document.head.appendChild(styleEl);

      function applySnippet(index) {
        styleEl.textContent = snippets[index];
        document.querySelectorAll(".snippet-btn").forEach((btn, i) => {
          btn.classList.toggle("active", i === index);
        });
      }

      document.querySelectorAll(".snippet-btn").forEach((btn) => {
        btn.addEventListener("click", () => applySnippet(parseInt(btn.dataset.index)));
      });

      applySnippet(0);
    </script>
  </body>
</html>

```

### margin-left

设置元素左侧的外边距。

#### margin-left 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>margin-left 属性演示 - MDN 示例</title>
    <meta name="description" content="margin-left 属性演示" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        min-height: 100vh;
        padding: 0;
      }
      .demo-layout {
        display: flex;
        height: 100vh;
        gap: 0;
      }
      .snippet-panel {
        width: 320px;
        flex-shrink: 0;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        border-right: 1px solid #ddd;
        background: #fafafa;
      }
      .snippet-btn {
        padding: 10px 14px;
        border: 1px solid #ccc;
        border-radius: 6px;
        background: #fff;
        font-family: "JetBrains Mono", "Fira Code", monospace;
        font-size: 13px;
        color: #333;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s;
        line-height: 1.4;
      }
      .snippet-btn:hover {
        border-color: #8083ff;
        background: #f0f0ff;
      }
      .snippet-btn.active {
        border-color: #8083ff;
        background: #e8e8ff;
        color: #571bc1;
        font-weight: 600;
      }
      .preview-panel {
        flex: 1;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        overflow: auto;
      }
      .preview-panel > section,
      .preview-panel > div:not(.snippet-panel):not(.demo-layout) {
        flex: 1;
        width: 100%;
        min-height: 0;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #container {
        width: 300px;
        height: 200px;
        display: flex;
        align-content: flex-start;
        justify-content: flex-start;
      }

      .col {
        width: 33.33%;
        border: solid #5b6dcd 10px;
        background-color: rgba(229, 232, 252, 0.6);
        flex-shrink: 0;
      }

      #example-element {
        border: solid 10px #ffc129;
        background-color: rgba(255, 244, 219, 0.6);
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">margin-left: 1em;</button>
        <button class="snippet-btn" data-index="1">margin-left: 10%;</button>
        <button class="snippet-btn" data-index="2">margin-left: 10px;</button>
        <button class="snippet-btn" data-index="3">margin-left: 0;</button>
      </div>
      <div class="preview-panel">
        <section id="default-example">
          <div id="container">
            <div class="col"></div>
            <div class="col transition-all" id="example-element"></div>
            <div class="col"></div>
          </div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  margin-left: 1em;
}`,
        `#example-element {
  margin-left: 10%;
}`,
        `#example-element {
  margin-left: 10px;
}`,
        `#example-element {
  margin-left: 0;
}`,
      ];

      let styleEl = document.createElement("style");
      document.head.appendChild(styleEl);

      function applySnippet(index) {
        styleEl.textContent = snippets[index];
        document.querySelectorAll(".snippet-btn").forEach((btn, i) => {
          btn.classList.toggle("active", i === index);
        });
      }

      document.querySelectorAll(".snippet-btn").forEach((btn) => {
        btn.addEventListener("click", () => applySnippet(parseInt(btn.dataset.index)));
      });

      applySnippet(0);
    </script>
  </body>
</html>

```

### margin-right

设置元素右侧的外边距。

#### margin-right 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>margin-right 属性演示 - MDN 示例</title>
    <meta name="description" content="margin-right 属性演示" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        min-height: 100vh;
        padding: 0;
      }
      .demo-layout {
        display: flex;
        height: 100vh;
        gap: 0;
      }
      .snippet-panel {
        width: 320px;
        flex-shrink: 0;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        border-right: 1px solid #ddd;
        background: #fafafa;
      }
      .snippet-btn {
        padding: 10px 14px;
        border: 1px solid #ccc;
        border-radius: 6px;
        background: #fff;
        font-family: "JetBrains Mono", "Fira Code", monospace;
        font-size: 13px;
        color: #333;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s;
        line-height: 1.4;
      }
      .snippet-btn:hover {
        border-color: #8083ff;
        background: #f0f0ff;
      }
      .snippet-btn.active {
        border-color: #8083ff;
        background: #e8e8ff;
        color: #571bc1;
        font-weight: 600;
      }
      .preview-panel {
        flex: 1;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        overflow: auto;
      }
      .preview-panel > section,
      .preview-panel > div:not(.snippet-panel):not(.demo-layout) {
        flex: 1;
        width: 100%;
        min-height: 0;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #container {
        width: 300px;
        height: 200px;
        display: flex;
        align-content: flex-start;
        justify-content: flex-start;
      }

      .col {
        width: 33.33%;
        border: solid #5b6dcd 10px;
        background-color: rgba(229, 232, 252, 0.6);
        flex-shrink: 0;
      }

      #example-element {
        border: solid 10px #ffc129;
        background-color: rgba(255, 244, 219, 0.6);
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">margin-right: 1em;</button>
        <button class="snippet-btn" data-index="1">margin-right: 10%;</button>
        <button class="snippet-btn" data-index="2">margin-right: 10px;</button>
        <button class="snippet-btn" data-index="3">margin-right: 0;</button>
      </div>
      <div class="preview-panel">
        <section id="default-example">
          <div id="container">
            <div class="col"></div>
            <div class="col transition-all" id="example-element"></div>
            <div class="col"></div>
          </div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  margin-right: 1em;
}`,
        `#example-element {
  margin-right: 10%;
}`,
        `#example-element {
  margin-right: 10px;
}`,
        `#example-element {
  margin-right: 0;
}`,
      ];

      let styleEl = document.createElement("style");
      document.head.appendChild(styleEl);

      function applySnippet(index) {
        styleEl.textContent = snippets[index];
        document.querySelectorAll(".snippet-btn").forEach((btn, i) => {
          btn.classList.toggle("active", i === index);
        });
      }

      document.querySelectorAll(".snippet-btn").forEach((btn) => {
        btn.addEventListener("click", () => applySnippet(parseInt(btn.dataset.index)));
      });

      applySnippet(0);
    </script>
  </body>
</html>

```

### margin-bottom

设置元素底部的外边距，支持长度或百分比（百分比相对包含块的**宽度**）。

```css
/* 示例：卡片之间的垂直间距 */
.card {
  margin-bottom: 1rem;
}
.card:last-child {
  margin-bottom: 0;
}
```

> 💡 垂直间距优先考虑 Flex/Grid 布局的 `gap`（不参与 margin 合并、无需处理末元素）；相邻兄弟元素的 margin-bottom 与下一元素的 margin-top 会发生合并，取两者较大值。交互演示可参考上方 margin-top（将属性替换为 `margin-bottom` 即可）。

## Padding 内边距

### padding-top

设置元素顶部的内边距，影响内容区与边框的距离。

#### padding-top 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>padding-top 属性演示 - MDN 示例</title>
    <meta name="description" content="padding-top 属性演示" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        min-height: 100vh;
        padding: 0;
      }
      .demo-layout {
        display: flex;
        height: 100vh;
        gap: 0;
      }
      .snippet-panel {
        width: 320px;
        flex-shrink: 0;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        border-right: 1px solid #ddd;
        background: #fafafa;
      }
      .snippet-btn {
        padding: 10px 14px;
        border: 1px solid #ccc;
        border-radius: 6px;
        background: #fff;
        font-family: "JetBrains Mono", "Fira Code", monospace;
        font-size: 13px;
        color: #333;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s;
        line-height: 1.4;
      }
      .snippet-btn:hover {
        border-color: #8083ff;
        background: #f0f0ff;
      }
      .snippet-btn.active {
        border-color: #8083ff;
        background: #e8e8ff;
        color: #571bc1;
        font-weight: 600;
      }
      .preview-panel {
        flex: 1;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        overflow: auto;
      }
      .preview-panel > section,
      .preview-panel > div:not(.snippet-panel):not(.demo-layout) {
        flex: 1;
        width: 100%;
        min-height: 0;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #example-element {
        border: 10px solid #ffc129;
        overflow: hidden;
        text-align: left;
      }

      .box {
        border: dashed 1px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">padding-top: 1em;</button>
        <button class="snippet-btn" data-index="1">padding-top: 10%;</button>
        <button class="snippet-btn" data-index="2">padding-top: 20px;</button>
        <button class="snippet-btn" data-index="3">padding-top: 1ch;</button>
        <button class="snippet-btn" data-index="4">padding-top: 0;</button>
      </div>
      <div class="preview-panel">
        <section id="default-example">
          <div class="transition-all" id="example-element">
            <div class="box">
              Far out in the uncharted backwaters of the unfashionable end of the western spiral arm of the Galaxy lies
              a small unregarded yellow sun.
            </div>
          </div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  padding-top: 1em;
}`,
        `#example-element {
  padding-top: 10%;
}`,
        `#example-element {
  padding-top: 20px;
}`,
        `#example-element {
  padding-top: 1ch;
}`,
        `#example-element {
  padding-top: 0;
}`,
      ];

      let styleEl = document.createElement("style");
      document.head.appendChild(styleEl);

      function applySnippet(index) {
        styleEl.textContent = snippets[index];
        document.querySelectorAll(".snippet-btn").forEach((btn, i) => {
          btn.classList.toggle("active", i === index);
        });
      }

      document.querySelectorAll(".snippet-btn").forEach((btn) => {
        btn.addEventListener("click", () => applySnippet(parseInt(btn.dataset.index)));
      });

      applySnippet(0);
    </script>
  </body>
</html>

```

### padding-left

设置元素左侧的内边距。

#### padding-left 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>padding-left 属性演示 - MDN 示例</title>
    <meta name="description" content="padding-left 属性演示" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        min-height: 100vh;
        padding: 0;
      }
      .demo-layout {
        display: flex;
        height: 100vh;
        gap: 0;
      }
      .snippet-panel {
        width: 320px;
        flex-shrink: 0;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        border-right: 1px solid #ddd;
        background: #fafafa;
      }
      .snippet-btn {
        padding: 10px 14px;
        border: 1px solid #ccc;
        border-radius: 6px;
        background: #fff;
        font-family: "JetBrains Mono", "Fira Code", monospace;
        font-size: 13px;
        color: #333;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s;
        line-height: 1.4;
      }
      .snippet-btn:hover {
        border-color: #8083ff;
        background: #f0f0ff;
      }
      .snippet-btn.active {
        border-color: #8083ff;
        background: #e8e8ff;
        color: #571bc1;
        font-weight: 600;
      }
      .preview-panel {
        flex: 1;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        overflow: auto;
      }
      .preview-panel > section,
      .preview-panel > div:not(.snippet-panel):not(.demo-layout) {
        flex: 1;
        width: 100%;
        min-height: 0;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #example-element {
        border: 10px solid #ffc129;
        overflow: hidden;
        text-align: left;
      }

      .box {
        border: dashed 1px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">padding-left: 1.5em;</button>
        <button class="snippet-btn" data-index="1">padding-left: 10%;</button>
        <button class="snippet-btn" data-index="2">padding-left: 20px;</button>
        <button class="snippet-btn" data-index="3">padding-left: 1ch;</button>
        <button class="snippet-btn" data-index="4">padding-left: 0;</button>
      </div>
      <div class="preview-panel">
        <section id="default-example">
          <div class="transition-all" id="example-element">
            <div class="box">
              Far out in the uncharted backwaters of the unfashionable end of the western spiral arm of the Galaxy lies
              a small unregarded yellow sun.
            </div>
          </div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  padding-left: 1.5em;
}`,
        `#example-element {
  padding-left: 10%;
}`,
        `#example-element {
  padding-left: 20px;
}`,
        `#example-element {
  padding-left: 1ch;
}`,
        `#example-element {
  padding-left: 0;
}`,
      ];

      let styleEl = document.createElement("style");
      document.head.appendChild(styleEl);

      function applySnippet(index) {
        styleEl.textContent = snippets[index];
        document.querySelectorAll(".snippet-btn").forEach((btn, i) => {
          btn.classList.toggle("active", i === index);
        });
      }

      document.querySelectorAll(".snippet-btn").forEach((btn) => {
        btn.addEventListener("click", () => applySnippet(parseInt(btn.dataset.index)));
      });

      applySnippet(0);
    </script>
  </body>
</html>

```

### padding-right

设置元素右侧的内边距。

#### padding-right 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>padding-right 属性演示 - MDN 示例</title>
    <meta name="description" content="padding-right 属性演示" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        min-height: 100vh;
        padding: 0;
      }
      .demo-layout {
        display: flex;
        height: 100vh;
        gap: 0;
      }
      .snippet-panel {
        width: 320px;
        flex-shrink: 0;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        border-right: 1px solid #ddd;
        background: #fafafa;
      }
      .snippet-btn {
        padding: 10px 14px;
        border: 1px solid #ccc;
        border-radius: 6px;
        background: #fff;
        font-family: "JetBrains Mono", "Fira Code", monospace;
        font-size: 13px;
        color: #333;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s;
        line-height: 1.4;
      }
      .snippet-btn:hover {
        border-color: #8083ff;
        background: #f0f0ff;
      }
      .snippet-btn.active {
        border-color: #8083ff;
        background: #e8e8ff;
        color: #571bc1;
        font-weight: 600;
      }
      .preview-panel {
        flex: 1;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        overflow: auto;
      }
      .preview-panel > section,
      .preview-panel > div:not(.snippet-panel):not(.demo-layout) {
        flex: 1;
        width: 100%;
        min-height: 0;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #example-element {
        border: 10px solid #ffc129;
        overflow: hidden;
        text-align: left;
      }

      .box {
        border: dashed 1px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">padding-right: 1.5em;</button>
        <button class="snippet-btn" data-index="1">padding-right: 10%;</button>
        <button class="snippet-btn" data-index="2">padding-right: 20px;</button>
        <button class="snippet-btn" data-index="3">padding-right: 1ch;</button>
        <button class="snippet-btn" data-index="4">padding-right: 0;</button>
      </div>
      <div class="preview-panel">
        <section id="default-example">
          <div class="transition-all" id="example-element">
            <div class="box">
              Far out in the uncharted backwaters of the unfashionable end of the western spiral arm of the Galaxy lies
              a small unregarded yellow sun.
            </div>
          </div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  padding-right: 1.5em;
}`,
        `#example-element {
  padding-right: 10%;
}`,
        `#example-element {
  padding-right: 20px;
}`,
        `#example-element {
  padding-right: 1ch;
}`,
        `#example-element {
  padding-right: 0;
}`,
      ];

      let styleEl = document.createElement("style");
      document.head.appendChild(styleEl);

      function applySnippet(index) {
        styleEl.textContent = snippets[index];
        document.querySelectorAll(".snippet-btn").forEach((btn, i) => {
          btn.classList.toggle("active", i === index);
        });
      }

      document.querySelectorAll(".snippet-btn").forEach((btn) => {
        btn.addEventListener("click", () => applySnippet(parseInt(btn.dataset.index)));
      });

      applySnippet(0);
    </script>
  </body>
</html>

```

### padding-bottom

设置元素底部的内边距。

#### padding-bottom 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>padding-bottom 属性演示 - MDN 示例</title>
    <meta name="description" content="padding-bottom 属性演示" />
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        min-height: 100vh;
        padding: 0;
      }
      .demo-layout {
        display: flex;
        height: 100vh;
        gap: 0;
      }
      .snippet-panel {
        width: 320px;
        flex-shrink: 0;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        overflow-y: auto;
        border-right: 1px solid #ddd;
        background: #fafafa;
      }
      .snippet-btn {
        padding: 10px 14px;
        border: 1px solid #ccc;
        border-radius: 6px;
        background: #fff;
        font-family: "JetBrains Mono", "Fira Code", monospace;
        font-size: 13px;
        color: #333;
        cursor: pointer;
        text-align: left;
        transition: all 0.2s;
        line-height: 1.4;
      }
      .snippet-btn:hover {
        border-color: #8083ff;
        background: #f0f0ff;
      }
      .snippet-btn.active {
        border-color: #8083ff;
        background: #e8e8ff;
        color: #571bc1;
        font-weight: 600;
      }
      .preview-panel {
        flex: 1;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        overflow: auto;
      }
      .preview-panel > section,
      .preview-panel > div:not(.snippet-panel):not(.demo-layout) {
        flex: 1;
        width: 100%;
        min-height: 0;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      #example-element {
        border: 10px solid #ffc129;
        overflow: hidden;
        text-align: left;
      }

      .box {
        border: dashed 1px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">padding-bottom: 1em;</button>
        <button class="snippet-btn" data-index="1">padding-bottom: 10%;</button>
        <button class="snippet-btn" data-index="2">padding-bottom: 20px;</button>
        <button class="snippet-btn" data-index="3">padding-bottom: 1ch;</button>
        <button class="snippet-btn" data-index="4">padding-bottom: 0;</button>
      </div>
      <div class="preview-panel">
        <section id="default-example">
          <div class="transition-all" id="example-element">
            <div class="box">
              Far out in the uncharted backwaters of the unfashionable end of the western spiral arm of the Galaxy lies
              a small unregarded yellow sun.
            </div>
          </div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  padding-bottom: 1em;
}`,
        `#example-element {
  padding-bottom: 10%;
}`,
        `#example-element {
  padding-bottom: 20px;
}`,
        `#example-element {
  padding-bottom: 1ch;
}`,
        `#example-element {
  padding-bottom: 0;
}`,
      ];

      let styleEl = document.createElement("style");
      document.head.appendChild(styleEl);

      function applySnippet(index) {
        styleEl.textContent = snippets[index];
        document.querySelectorAll(".snippet-btn").forEach((btn, i) => {
          btn.classList.toggle("active", i === index);
        });
      }

      document.querySelectorAll(".snippet-btn").forEach((btn) => {
        btn.addEventListener("click", () => applySnippet(parseInt(btn.dataset.index)));
      });

      applySnippet(0);
    </script>
  </body>
</html>

```

