---
title: Border 边框属性详解
description: 系统讲解 border 边框的物理方向属性：各方向边框的简写、宽度、样式、颜色，以及 border-style/border-width 的统一设置方式，每个属性均附可交互的 MDN 演示。
category: CSS

---

# Border 边框属性详解

## 概述

本文档系统讲解 border 各方向边框属性。每个属性都配有来自 MDN 的可交互演示，可以直接点击运行查看效果。

## 各方向边框

### border-top

设置元素顶部边框的简写（宽度/样式/颜色）。

#### border-top 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>border-top 属性演示 - MDN 示例</title>
    <meta name="description" content="border-top 属性演示" />
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
        background-color: #eeeeee;
        color: darkmagenta;
        padding: 0.75em;
        width: 80%;
        height: 100px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">border-top: solid;</button>
        <button class="snippet-btn" data-index="1">border-top: dashed red;</button>
        <button class="snippet-btn" data-index="2">border-top: 1rem solid;</button>
        <button class="snippet-btn" data-index="3">border-top: thick double #32a1ce;</button>
        <button class="snippet-btn" data-index="4">border-top: 4mm ridge rgb(211 220 50 / 0.6);</button>
      </div>
      <div class="preview-panel">
        <section class="default-example" id="default-example">
          <div class="transition-all" id="example-element">这是一个带有边框的盒子。</div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  border-top: solid;
}`,
        `#example-element {
  border-top: dashed red;
}`,
        `#example-element {
  border-top: 1rem solid;
}`,
        `#example-element {
  border-top: thick double #32a1ce;
}`,
        `#example-element {
  border-top: 4mm ridge rgb(211 220 50 / 0.6);
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

### border-top-color

设置元素顶部边框的颜色。

#### border-top-color 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>border-top-color 属性演示 - MDN 示例</title>
    <meta name="description" content="border-top-color 属性演示" />
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
        background-color: #eee;
        color: #000;
        border: 0.75em solid;
        padding: 0.75em;
        width: 80%;
        height: 100px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">border-top-color: red;</button>
        <button class="snippet-btn" data-index="1">border-top-color: #32a1ce;</button>
        <button class="snippet-btn" data-index="2">border-top-color: rgb(170, 50, 220, 0.6);</button>
        <button class="snippet-btn" data-index="3">border-top-color: hsl(60, 90%, 50%, 0.8);</button>
        <button class="snippet-btn" data-index="4">border-top-color: transparent;</button>
      </div>
      <div class="preview-panel">
        <section class="default-example" id="default-example">
          <div class="transition-all" id="example-element">This is a box with a border around it.</div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  border-top-color: red;
}`,
        `#example-element {
  border-top-color: #32a1ce;
}`,
        `#example-element {
  border-top-color: rgb(170, 50, 220, 0.6);
}`,
        `#example-element {
  border-top-color: hsl(60, 90%, 50%, 0.8);
}`,
        `#example-element {
  border-top-color: transparent;
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

### border-top-style

设置元素顶部边框的样式（solid/dashed/dotted 等）。

#### border-top-style 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>border-top-style 属性演示 - MDN 示例</title>
    <meta name="description" content="border-top-style 属性演示" />
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
        background-color: #eee;
        color: #000;
        border: 0.75em solid;
        padding: 0.75em;
        width: 80%;
        height: 100px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">border-top-style: none;</button>
        <button class="snippet-btn" data-index="1">border-top-style: dotted;</button>
        <button class="snippet-btn" data-index="2">border-top-style: dashed;</button>
        <button class="snippet-btn" data-index="3">border-top-style: solid;</button>
        <button class="snippet-btn" data-index="4">border-top-style: groove;</button>
        <button class="snippet-btn" data-index="5">border-top-style: inset;</button>
      </div>
      <div class="preview-panel">
        <section id="default-example">
          <div class="transition-all" id="example-element">This is a box with a border around it.</div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  border-top-style: none;
}`,
        `#example-element {
  border-top-style: dotted;
}`,
        `#example-element {
  border-top-style: dashed;
}`,
        `#example-element {
  border-top-style: solid;
}`,
        `#example-element {
  border-top-style: groove;
}`,
        `#example-element {
  border-top-style: inset;
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

### border-top-width

设置元素顶部边框的宽度。

#### border-top-width 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>border-top-width 属性演示 - MDN 示例</title>
    <meta name="description" content="border-top-width 属性演示" />
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
        background-color: palegreen;
        color: #000;
        border: 0 solid crimson;
        padding: 0.75em;
        width: 80%;
        height: 100px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">border-top-width: thick;</button>
        <button class="snippet-btn" data-index="1">border-top-width: 2em;</button>
        <button class="snippet-btn" data-index="2">border-top-width: 4px;</button>
        <button class="snippet-btn" data-index="3">border-top-width: 2ex;</button>
        <button class="snippet-btn" data-index="4">border-top-width: 0;</button>
      </div>
      <div class="preview-panel">
        <section class="default-example" id="default-example">
          <div class="transition-all" id="example-element">This is a box with a border around it.</div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  border-top-width: thick;
}`,
        `#example-element {
  border-top-width: 2em;
}`,
        `#example-element {
  border-top-width: 4px;
}`,
        `#example-element {
  border-top-width: 2ex;
}`,
        `#example-element {
  border-top-width: 0;
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

### border-bottom

设置元素底部边框的简写。

#### border-bottom 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>border-bottom 属性演示 - MDN 示例</title>
    <meta name="description" content="border-bottom 属性演示" />
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
        background-color: #eee;
        color: #8b008b;
        padding: 0.75em;
        width: 80%;
        height: 100px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">border-bottom: solid;</button>
        <button class="snippet-btn" data-index="1">border-bottom: dashed red;</button>
        <button class="snippet-btn" data-index="2">border-bottom: 1rem solid;</button>
        <button class="snippet-btn" data-index="3">border-bottom: thick double #32a1ce;</button>
        <button class="snippet-btn" data-index="4">border-bottom: 4mm ridge rgba(211, 220, 50, 0.6);</button>
      </div>
      <div class="preview-panel">
        <section class="default-example" id="default-example">
          <div class="transition-all" id="example-element">This is a box with a border around it.</div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  border-bottom: solid;
}`,
        `#example-element {
  border-bottom: dashed red;
}`,
        `#example-element {
  border-bottom: 1rem solid;
}`,
        `#example-element {
  border-bottom: thick double #32a1ce;
}`,
        `#example-element {
  border-bottom: 4mm ridge rgba(211, 220, 50, 0.6);
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

### border-bottom-style

设置元素底部边框的样式。

#### border-bottom-style 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>border-bottom-style 属性演示 - MDN 示例</title>
    <meta name="description" content="border-bottom-style 属性演示" />
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
        background-color: #eeeeee;
        color: black;
        border: 0.75em solid;
        padding: 0.75em;
        width: 80%;
        height: 100px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">border-bottom-style: none;</button>
        <button class="snippet-btn" data-index="1">border-bottom-style: dotted;</button>
        <button class="snippet-btn" data-index="2">border-bottom-style: dashed;</button>
        <button class="snippet-btn" data-index="3">border-bottom-style: solid;</button>
        <button class="snippet-btn" data-index="4">border-bottom-style: groove;</button>
        <button class="snippet-btn" data-index="5">border-bottom-style: inset;</button>
      </div>
      <div class="preview-panel">
        <section id="default-example">
          <div class="transition-all" id="example-element">这是一个带有边框的盒子。</div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  border-bottom-style: none;
}`,
        `#example-element {
  border-bottom-style: dotted;
}`,
        `#example-element {
  border-bottom-style: dashed;
}`,
        `#example-element {
  border-bottom-style: solid;
}`,
        `#example-element {
  border-bottom-style: groove;
}`,
        `#example-element {
  border-bottom-style: inset;
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

### border-left-style

设置元素左侧边框的样式。

#### border-left-style 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>border-left-style 属性演示 - MDN 示例</title>
    <meta name="description" content="border-left-style 属性演示" />
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
        background-color: #eee;
        color: #000;
        border: 0.75em solid;
        padding: 0.75em;
        width: 80%;
        height: 100px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">border-left-style: none;</button>
        <button class="snippet-btn" data-index="1">border-left-style: dotted;</button>
        <button class="snippet-btn" data-index="2">border-left-style: dashed;</button>
        <button class="snippet-btn" data-index="3">border-left-style: solid;</button>
        <button class="snippet-btn" data-index="4">border-left-style: groove;</button>
        <button class="snippet-btn" data-index="5">border-left-style: inset;</button>
      </div>
      <div class="preview-panel">
        <section id="default-example">
          <div class="transition-all" id="example-element">This is a box with a border around it.</div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  border-left-style: none;
}`,
        `#example-element {
  border-left-style: dotted;
}`,
        `#example-element {
  border-left-style: dashed;
}`,
        `#example-element {
  border-left-style: solid;
}`,
        `#example-element {
  border-left-style: groove;
}`,
        `#example-element {
  border-left-style: inset;
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

### border-left-width

设置元素左侧边框的宽度。

#### border-left-width 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>border-left-width 属性演示 - MDN 示例</title>
    <meta name="description" content="border-left-width 属性演示" />
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
        background-color: palegreen;
        color: #000;
        border: 0 solid crimson;
        padding: 0.75em;
        width: 80%;
        height: 100px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">border-left-width: thick;</button>
        <button class="snippet-btn" data-index="1">border-left-width: 2em;</button>
        <button class="snippet-btn" data-index="2">border-left-width: 4px;</button>
        <button class="snippet-btn" data-index="3">border-left-width: 2ex;</button>
        <button class="snippet-btn" data-index="4">border-left-width: 0;</button>
      </div>
      <div class="preview-panel">
        <section class="default-example" id="default-example">
          <div class="transition-all" id="example-element">This is a box with a border around it.</div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  border-left-width: thick;
}`,
        `#example-element {
  border-left-width: 2em;
}`,
        `#example-element {
  border-left-width: 4px;
}`,
        `#example-element {
  border-left-width: 2ex;
}`,
        `#example-element {
  border-left-width: 0;
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

### border-right

设置元素右侧边框的简写。

#### border-right 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>border-right 属性演示 - MDN 示例</title>
    <meta name="description" content="border-right 属性演示" />
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
        background-color: #eee;
        color: #8b008b;
        padding: 0.75em;
        width: 80%;
        height: 100px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">border-right: solid;</button>
        <button class="snippet-btn" data-index="1">border-right: dashed red;</button>
        <button class="snippet-btn" data-index="2">border-right: 1rem solid;</button>
        <button class="snippet-btn" data-index="3">border-right: thick double #32a1ce;</button>
        <button class="snippet-btn" data-index="4">border-right: 4mm ridge rgba(211, 220, 50, 0.6);</button>
      </div>
      <div class="preview-panel">
        <section class="default-example" id="default-example">
          <div class="transition-all" id="example-element">This is a box with a border around it.</div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  border-right: solid;
}`,
        `#example-element {
  border-right: dashed red;
}`,
        `#example-element {
  border-right: 1rem solid;
}`,
        `#example-element {
  border-right: thick double #32a1ce;
}`,
        `#example-element {
  border-right: 4mm ridge rgba(211, 220, 50, 0.6);
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

### border-right-color

设置元素右侧边框的颜色。

#### border-right-color 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>border-right-color 属性演示 - MDN 示例</title>
    <meta name="description" content="border-right-color 属性演示" />
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
        background-color: #eee;
        color: #000;
        border: 0.75em solid;
        padding: 0.75em;
        width: 80%;
        height: 100px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">border-right-color: red;</button>
        <button class="snippet-btn" data-index="1">border-right-color: #32a1ce;</button>
        <button class="snippet-btn" data-index="2">border-right-color: rgb(170, 50, 220, 0.6);</button>
        <button class="snippet-btn" data-index="3">border-right-color: hsl(60, 90%, 50%, 0.8);</button>
        <button class="snippet-btn" data-index="4">border-right-color: transparent;</button>
      </div>
      <div class="preview-panel">
        <section class="default-example" id="default-example">
          <div class="transition-all" id="example-element">This is a box with a border around it.</div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  border-right-color: red;
}`,
        `#example-element {
  border-right-color: #32a1ce;
}`,
        `#example-element {
  border-right-color: rgb(170, 50, 220, 0.6);
}`,
        `#example-element {
  border-right-color: hsl(60, 90%, 50%, 0.8);
}`,
        `#example-element {
  border-right-color: transparent;
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

### border-right-style

设置元素右侧边框的样式。

#### border-right-style 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>border-right-style 属性演示 - MDN 示例</title>
    <meta name="description" content="border-right-style 属性演示" />
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
        background-color: #eee;
        color: #000;
        border: 0.75em solid;
        padding: 0.75em;
        width: 80%;
        height: 100px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">border-right-style: none;</button>
        <button class="snippet-btn" data-index="1">border-right-style: dotted;</button>
        <button class="snippet-btn" data-index="2">border-right-style: dashed;</button>
        <button class="snippet-btn" data-index="3">border-right-style: solid;</button>
        <button class="snippet-btn" data-index="4">border-right-style: groove;</button>
        <button class="snippet-btn" data-index="5">border-right-style: inset;</button>
      </div>
      <div class="preview-panel">
        <section id="default-example">
          <div class="transition-all" id="example-element">This is a box with a border around it.</div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  border-right-style: none;
}`,
        `#example-element {
  border-right-style: dotted;
}`,
        `#example-element {
  border-right-style: dashed;
}`,
        `#example-element {
  border-right-style: solid;
}`,
        `#example-element {
  border-right-style: groove;
}`,
        `#example-element {
  border-right-style: inset;
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

### border-right-width

设置元素右侧边框的宽度。

#### border-right-width 交互演示（MDN）

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>border-right-width 属性演示 - MDN 示例</title>
    <meta name="description" content="border-right-width 属性演示" />
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
        background-color: palegreen;
        color: #000;
        border: 0 solid crimson;
        padding: 0.75em;
        width: 80%;
        height: 100px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">border-right-width: thick;</button>
        <button class="snippet-btn" data-index="1">border-right-width: 2em;</button>
        <button class="snippet-btn" data-index="2">border-right-width: 4px;</button>
        <button class="snippet-btn" data-index="3">border-right-width: 2ex;</button>
        <button class="snippet-btn" data-index="4">border-right-width: 0;</button>
      </div>
      <div class="preview-panel">
        <section class="default-example" id="default-example">
          <div class="transition-all" id="example-element">This is a box with a border around it.</div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  border-right-width: thick;
}`,
        `#example-element {
  border-right-width: 2em;
}`,
        `#example-element {
  border-right-width: 4px;
}`,
        `#example-element {
  border-right-width: 2ex;
}`,
        `#example-element {
  border-right-width: 0;
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

## 统一设置

### border-style

统一设置四个方向边框的样式。

#### border-style 交互演示（MDN）

统一设置四个方向边框的样式。

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>border-style 属性演示 - MDN 示例</title>
    <meta name="description" content="border-style 属性演示" />
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
        background-color: #eee;
        color: #000;
        border: 0.75em solid;
        padding: 0.75em;
        width: 80%;
        height: 100px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">border-style: none;</button>
        <button class="snippet-btn" data-index="1">border-style: dotted;</button>
        <button class="snippet-btn" data-index="2">border-style: inset;</button>
        <button class="snippet-btn" data-index="3">border-style: dashed solid;</button>
        <button class="snippet-btn" data-index="4">border-style: dashed double none;</button>
        <button class="snippet-btn" data-index="5">border-style: dashed groove none dotted;</button>
      </div>
      <div class="preview-panel">
        <section id="default-example">
          <div class="transition-all" id="example-element">This is a box with a border around it.</div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  border-style: none;
}`,
        `#example-element {
  border-style: dotted;
}`,
        `#example-element {
  border-style: inset;
}`,
        `#example-element {
  border-style: dashed solid;
}`,
        `#example-element {
  border-style: dashed double none;
}`,
        `#example-element {
  border-style: dashed groove none dotted;
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

### border-width

统一设置四个方向边框的宽度。

#### border-width 交互演示（MDN）

统一设置四个方向边框的宽度。

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>border-width 属性演示 - MDN 示例</title>
    <meta name="description" content="border-width 属性演示" />
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
        background-color: palegreen;
        color: #000;
        border: 0 solid crimson;
        padding: 0.75em;
        width: 80%;
        height: 100px;
      }
    </style>
  </head>
  <body>
    <div class="demo-layout">
      <div class="snippet-panel">
        <button class="snippet-btn active" data-index="0">border-width: thick;</button>
        <button class="snippet-btn" data-index="1">border-width: 1em;</button>
        <button class="snippet-btn" data-index="2">border-width: 4px 1.25em;</button>
        <button class="snippet-btn" data-index="3">border-width: 2ex 1.25ex 0.5ex;</button>
        <button class="snippet-btn" data-index="4">border-width: 0 4px 8px 12px;</button>
      </div>
      <div class="preview-panel">
        <section class="default-example" id="default-example">
          <div class="transition-all" id="example-element">This is a box with a border around it.</div>
        </section>
      </div>
    </div>
    <script>
      const snippets = [
        `#example-element {
  border-width: thick;
}`,
        `#example-element {
  border-width: 1em;
}`,
        `#example-element {
  border-width: 4px 1.25em;
}`,
        `#example-element {
  border-width: 2ex 1.25ex 0.5ex;
}`,
        `#example-element {
  border-width: 0 4px 8px 12px;
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

## 未单独收录的属性速查

以下边框属性未附 MDN 演示，用法与已收录的同侧属性完全一致：

| 属性 | 说明 |
|------|------|
| `border-bottom-color` / `border-bottom-width` | 底部边框的颜色 / 宽度，用法同 `border-top-color` / `border-top-width` |
| `border-left` | 左边框简写（宽度/样式/颜色），用法同 `border-top` |
| `border-left-color` / `border-left-width` | 左边框的颜色 / 宽度，用法同 `border-top-*` 对应项 |
| `border-color` | 四个方向颜色的统一设置（1~4 值，遵循 TRBL 顺序） |
| `border` | 四边简写：`border: 1px solid #ccc`（border-style 必填） |

> 💡 提示：`border` 简写会重置未指定的子属性；需要单独覆盖某一方向时优先使用长写属性。
