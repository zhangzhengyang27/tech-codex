---
title: "DOM树：JavaScript对DOM解析的影响"
description: "DOM（Document Object Model）是 HTML 文档在内存中的树状表示，是 JavaScript 与页面交互的核心接口。本文阐述 DOM 树的构建过程（字节流→Token→节点→DOM 树）、JavaScript 与 CSS 对解析的阻塞机制、预解析器与 async/defer 加载策略，以及批量修改等 DOM 性能优化。"
keywords: [DOM树]
category: JavaScript
tags: [JavaScript, 浏览器, DOM]
---


# DOM 树：JavaScript 对 DOM 解析的影响

## 概述

DOM（Document Object Model）是 HTML 文档在内存中的树状表示，是 JavaScript 与页面交互的核心接口。本文将阐述 DOM 树的构建过程、JavaScript 对 DOM 解析的阻塞机制，以及现代浏览器的预解析和异步加载优化策略。

---

## 1 DOM 树构建过程

### 1.1 字节流到 DOM 树

```mermaid
graph LR
    BYTES["字节流<br/>(UTF-8 编码)"] --> CHARS["字符流"] --> TOKENS["Token 流<br/>(StartTag/EndTag/Text)"] --> NODES["Node 节点"] --> DOM["DOM 树"]
```

### 1.2 DOM 节点类型

| 节点类型 | 作用 | 示例 |
|----------|------|------|
| `Document` | 树根 | `document` |
| `Element` | HTML 元素 | `<div>`, `<p>`, `<script>` |
| `Text` | 文本内容 | `"Hello World"` |
| `Comment` | 注释 | `<!-- comment -->` |
| `DocumentType` | 文档类型声明 | `<!DOCTYPE html>` |
| `DocumentFragment` | 轻量文档容器 | 批量 DOM 操作 |

### 1.3 DOM 与 HTML 的区别

- **HTML** 是标记语言的文本序列化
- **DOM** 是内存中的树状数据结构，可通过 JavaScript 实时查询和修改
- 解析后的 DOM 可能与原始 HTML 不同（错误纠正、脚本修改等）

---

## 2 JavaScript 对 DOM 解析的阻塞

### 2.1 阻塞机制

HTML 解析器在遇到 `<script>` 标签时必须暂停 DOM 构建，等待 JavaScript 下载和执行完毕。因为 JavaScript 可能使用 `document.write()` 修改文档流，或通过 DOM API 操作已解析的节点。

```mermaid
graph LR
    PARSE1["解析 HTML"] --> SCRIPT["遇到 script 标签"] --> WAIT["暂停 DOM 构建<br/>下载并执行 JS"] --> PARSE2["继续解析 HTML"]
```

### 2.2 预解析器（Preload Scanner）

现代浏览器在主解析器被 JavaScript 阻塞时，启动**预解析器**扫描后续 HTML，提前发现并下载子资源（CSS、JS、图片、字体等）：

```mermaid
graph TB
    subgraph "主解析器（被 JS 阻塞）"
        P1["解析到 script src=app.js"] --> W["等待 JS 执行"]
    end
    subgraph "预解析器（并行运行）"
        PP["扫描后续 HTML"] --> DIS["发现 style.css, logo.png"]
        DIS --> DL["提前下载"]
    end
```

### 2.3 脚本加载策略

| 策略 | 语法 | DOM 解析阻塞 | 执行时机 |
|------|------|-------------|----------|
| 默认 | `<script src>` | ✅ 阻塞 | 下载后立即执行 |
| async | `<script async src>` | ❌ 不阻塞 | 下载后立即执行（阻塞短暂） |
| defer | `<script defer src>` | ❌ 不阻塞 | DOM 解析完成后执行 |
| type=module | `<script type=module>` | ❌ 不阻塞 | 默认 defer 行为 |
| inline | `<script>...</script>` | ✅ 阻塞 | 立即执行 |

### 2.4 CSS 对 DOM 解析的影响

CSS **不阻塞 DOM 解析**，但阻塞渲染（需要 CSSOM 计算样式）。CSS 也阻塞后续 `<script>` 的执行（因为 JS 可能访问 `getComputedStyle()`）。

---

## 3 DOM 操作的性能优化

### 3.1 批量 DOM 修改

```javascript
// ❌ 逐次修改（触发 N 次重排）
for (let i = 0; i < 100; i++) {
    const li = document.createElement('li');
    li.textContent = `Item ${i}`;
    list.appendChild(li); // 每次追加可能触发重排
}

// ✅ 使用 DocumentFragment 批量修改
const fragment = document.createDocumentFragment();
for (let i = 0; i < 100; i++) {
    const li = document.createElement('li');
    li.textContent = `Item ${i}`;
    fragment.appendChild(li);
}
list.appendChild(fragment); // 仅触发 1 次重排
```

### 3.2 离线 DOM 操作

```javascript
// 将元素从 DOM 中移除 → 修改 → 重新插入
const element = document.getElementById('target');
const parent = element.parentNode;
parent.removeChild(element);

// 批量修改（无重排）
element.style.width = '200px';
element.style.height = '100px';
element.style.background = 'blue';

parent.appendChild(element); // 仅 1 次重排
```

### 3.3 使用 CSS containment

```css
.widget {
    contain: layout style paint;
    /* 告诉浏览器此元素的变更不影响外部，可独立优化 */
}
```

---

## 4 总结

| 概念 | 关键要点 |
|------|----------|
| DOM 构建 | HTML 字节流 → Token → Node → DOM 树 |
| JS 阻塞 | `<script>` 暂停 DOM 构建，等待下载+执行 |
| 预解析器 | 主解析器阻塞时，并行扫描下载后续资源 |
| async/defer | 不阻塞 DOM 解析，延迟执行时机 |
| DOM 优化 | DocumentFragment、离线操作、CSS containment |

理解 JavaScript 对 DOM 构建的影响，是优化首屏加载速度的基础——合理安排脚本加载策略，避免关键渲染路径上的阻塞。

---

## 参考文献

1. HTML Spec: [Parsing HTML documents](https://html.spec.whatwg.org/multipage/parsing.html)
2. Chrome Blog: [Preload Scanner](https://developer.chrome.com/blog/preload-scanner/)
3. MDN: [DocumentFragment](https://developer.mozilla.org/en-US/docs/Web/API/DocumentFragment)
