---
title: AMD
description: "系统讲解 AMD 异步模块定义规范：define/require 核心 API、依赖前置设计、RequireJS 与 r.js 打包实践，以及与 CommonJS/ESM 的多维度对比。"
keywords: [AMD]
category: JavaScript
tags: [JavaScript, 模块化, AMD, RequireJS]
---


# AMD 异步模块定义

本章将深入探讨 AMD 规范的核心思想、API 设计和实际应用。主要内容包括：

- **核心理念**: 解释 AMD 为何采用**异步加载**机制，以及其“**依赖前置**”的设计哲学。
- **规范 API**: 详细解析 `define()` 和 `require()` 两个核心函数的语法和用法。
- **代码实践**: 通过具体示例展示如何定义和使用 AMD 模块。
- **方案对比**: 将 AMD 与 CommonJS 和 ES Modules 进行多维度对比，分析其优缺点。
- **生态与实践**: 介绍以 RequireJS 为代表的 AMD 生态及其在项目中的应用方式。

---

## AMD 规范的具体实现细节

AMD 规范的核心在于通过全局函数 `define` 来定义模块，以及通过 `require` 来加载模块。

### `define` 函数

`define` 函数用于定义一个模块，其基本语法为：

```javascript
define(id?, dependencies?, factory);
```

- **`id` (可选)**: 字符串类型，表示模块的名称。通常在打包优化时由工具自动生成，不建议手动指定。
- **`dependencies` (可选)**: 字符串数组，列出了当前模块所依赖的其他模块。
- **`factory`**: 工厂函数或对象。模块的主体内容。如果为函数，其参数与 `dependencies` 数组中的模块一一对应，函数的返回值即为该模块的导出值。

### `require` 函数

`require` 函数用于在顶层加载模块并执行回调。它通常作为应用的入口点。

```javascript
require(dependencies, callback)
```

- **`dependencies`**: 需要加载的模块数组。
- **`callback`**: 依赖加载完成后执行的回调函数，其参数是加载的模块实例。

---

## 代码示例及其作用说明

### 示例 1: 定义一个独立的数学模块 (`math.js`)

此模块不依赖任何其他模块，直接通过 `factory` 函数返回一个对象作为导出接口。

```javascript
// file: js/modules/math.js
define(function () {
  console.log("math.js is loaded")
  const add = (a, b) => a + b
  const subtract = (a, b) => a - b

  // 返回的对象就是模块的导出值
  return {
    add: add,
    subtract: subtract
  }
})
```

### 示例 2: 定义一个依赖 `math.js` 的计算器模块 (`calculator.js`)

此模块声明了对 `'./math'` 的依赖，`factory` 函数的参数 `math` 即为 `math.js` 模块的导出对象。

```javascript
// file: js/modules/calculator.js
define(["./math"], function (math) {
  console.log("calculator.js is loaded")
  const doubleAdd = (a, b) => math.add(a, b) * 2

  return {
    doubleAdd: doubleAdd
  }
})
```

### 示例 3: 在主文件 (`main.js`) 中使用模块

使用 `require` 作为入口，加载 `calculator.js`，并在回调函数中使用它。

```javascript
// file: js/main.js
require(["./modules/calculator"], function (calculator) {
  console.log("main.js execution started")
  const result = calculator.doubleAdd(5, 10)
  console.log("Result is:", result) // 输出: Result is: 30
})
```

---

## 相关的最佳实践和使用场景

- **适用场景**: AMD 特别适合于那些需要在浏览器端**异步按需加载**大量 JavaScript 模块的复杂 Web 应用。在 ES Modules 普及之前，它是构建大型单页应用（SPA）的主流选择之一。

- **最佳实践**:
  1.  **使用加载器**: 必须配合一个实现了 AMD 规范的加载器库，最著名的就是 **RequireJS**。
  2.  **路径配置**: 在 RequireJS 中，通过 `baseUrl` 和 `paths` 配置来管理模块的路径，避免硬编码相对路径。
  3.  **打包优化**: 在生产环境中，使用 **r.js** (RequireJS Optimizer) 工具将所有依赖的模块打包、压缩成一个文件，以减少 HTTP 请求，提升性能。

---

## 与其他前端模块化方案的对比

| 特性         | AMD (Asynchronous Module Definition)         | CommonJS                                   | ES Modules (ESM)                    |
| :----------- | :------------------------------------------- | :----------------------------------------- | :---------------------------------- |
| **语法**     | `define()` / `require()`                     | `require()` / `module.exports`             | `import` / `export`                 |
| **加载方式** | **异步加载**                                 | **同步加载**                               | **异步加载**                        |
| **依赖时机** | **依赖前置** (在执行 factory 前加载所有依赖) | **运行时加载** (执行到 `require` 时才加载) | **静态解析** (在编译时确定依赖关系) |
| **值绑定**   | 值的拷贝或引用 (取决于 factory 返回)         | 值的拷贝 (原始类型) / 引用 (对象)          | **动态只读引用** (Live Binding)     |
| **适用环境** | **浏览器** (通过加载器)                      | **Node.js** (原生)                         | 现代浏览器 (原生)、新版 Node.js     |

---

## 注意事项和常见问题

- **依赖书写繁琐**: 所有的依赖都必须在模块定义的开头以数组形式声明，这被称为“依赖前置”，在依赖较多时显得冗长。
- **回调地狱风险**: 异步加载和回调函数的使用，在逻辑复杂时可能导致代码嵌套过深。
- **调试不便**: 模块的加载和执行被封装在加载器内部，出错时堆栈跟踪可能不如同步代码直观。
- **现代项目中的地位**: 随着 ES Modules 的标准化和 Webpack、Vite 等构建工具的成熟，AMD 已逐渐淡出主流视野。新项目几乎不再使用，其主要价值体现在维护一些历史悠久的老项目中。
