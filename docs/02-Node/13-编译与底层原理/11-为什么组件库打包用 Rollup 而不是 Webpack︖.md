---
title: 为什么组件库打包用 Rollup 而不是 Webpack？
description: 从 ESM 静态分析、Tree-shaking 与产物体积角度解释组件库为何选 Rollup
keywords: [Node.js, AST, 编译, Rollup, vs]
category: Node.js
tags: [Node.js, 编译与底层原理]
---







# 为什么组件库打包用 Rollup 而不是 Webpack？

在现代前端工程化中，Webpack 和 Rollup 是两款主流的打包工具 (Bundler)。Webpack 凭借其强大的功能和丰富的生态，在**应用打包**领域占据主导地位。然而，当转向**组件库或 JS 库**的开发时，却会发现 Rollup 成为了更受青睐的选择。

这不禁让人思考：**为什么组件库打包首选是 Rollup，而不是功能看似更全面的 Webpack？**

本文将深入探讨两者在设计理念、打包产物、核心优势及生态等方面的差异，帮助你理解它们各自的适用场景，并最终解答这个问题。

## 核心差异对比 (Core Difference Comparison)

为了直观地感受差异，从一个简单的例子入手。

**项目准备：**

```bash
mkdir rollup-test
cd rollup-test
npm init -y
```

**源文件：**

`src/index.js`

```javascript
import { add } from "./utils"

function main() {
  console.log(add(1, 2))
}

export default main
```

`src/utils.js`

```javascript
function add(a, b) {
  return a + b
}

export { add }
```

### 打包产物分析

#### Rollup 打包

**安装与配置：**

```bash
npm install --save-dev rollup
```

`rollup.config.mjs`

```javascript
/** @type {import("rollup").RollupOptions} */
export default {
  input: "src/index.js",
  output: [
    {
      file: "dist/esm.js",
      format: "esm"
    },
    {
      file: "dist/cjs.js",
      format: "cjs"
    }
  ]
}
```

**打包命令：**

```bash
npx rollup -c rollup.config.mjs
```

**产物对比 (ESM 格式):**
`dist/esm.js`

```javascript
function add(a, b) {
  return a + b
}

function main() {
  console.log(add(1, 2))
}

export { main as default }
```

可以看到，Rollup 的打包结果非常纯净、简洁。它将所有模块铺平到同一个作用域中，移除了未使用的代码，并且没有注入任何额外的运行时 (Runtime) 代码。

#### Webpack 打包

**安装与配置：**

```bash
npm install --save-dev webpack webpack-cli
```

`webpack.config.mjs`

```javascript
import path from "node:path"

/** @type {import("webpack").Configuration} */
export default {
  entry: "./src/index.js",
  mode: "development",
  devtool: false,
  output: {
    path: path.resolve(import.meta.dirname, "dist2"),
    filename: "bundle.js",
    library: {
      type: "module"
    }
  },
  experiments: {
    outputModule: true // 开启 ESM 格式输出
  }
}
```

**打包命令：**

```bash
npx webpack-cli -c webpack.config.mjs
```

**产物对比 (ESM 格式):**
`dist2/bundle.js`

```javascript
var __webpack_exports__ = {}
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
;(() => {
  var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./src/utils.js")

  function main() {
    console.log((0, _utils__WEBPACK_IMPORTED_MODULE_0__.add)(1, 2))
  }

  /* harmony default export */ __webpack_exports__["default"] = main
})()
```

Webpack 的产物中包含了 `__webpack_require__`、`__webpack_exports__` 等运行时代码。这是因为 Webpack 设计之初是为了解决浏览器环境的模块化问题，它实现了一套自己的模块加载机制，用于模拟 `require`/`import`，从而带来了额外的代码开销。

### 模块处理机制

- **Rollup**：基于 **ES Modules (ESM)** 标准进行静态分析。它在编译时就能确定模块的依赖关系，从而实现高效的 **Tree-shaking** 和生成更简洁的代码。它假定你正在构建一个库，代码将由最终用户在另一个项目中使用。

- **Webpack**：设计上更为复杂，它通过一套运行时来模拟模块系统（包括 CommonJS, AMD, ESM）。这使得 Webpack 功能更强大，能够处理代码分割 (Code Splitting)、动态导入 (Dynamic Imports) 和 HMR (Hot Module Replacement) 等复杂场景，但也导致了产物体积更大。

## Rollup 的核心优势：Tree-shaking

Tree-shaking 是 Rollup 最具代表性的特性，也是它在库打包场景下优于 Webpack 的关键原因。

### 什么是 Tree-shaking？

Tree-shaking，又称“摇树优化”，是一个在打包过程中移除 JavaScript 上下文中未引用代码（dead-code）的优化过程。想象一下，你的代码库是一棵树，绿色的叶子是实际使用的代码，而枯黄的叶子是未使用的代码。摇晃这棵树，枯叶就会掉落，只留下有用的部分。

对于组件库而言，这意味着最终用户的应用只会包含他们实际 `import` 的组件和函数，从而显著减小应用的最终体积。

### Tree-shaking 的原理

Tree-shaking 的实现依赖于 **ES Modules (ESM) 的静态结构**。

- **静态分析**：ESM 的 `import` 和 `export` 语法是静态的，必须在模块的顶层声明。这意味着在代码实际运行前，仅通过词法分析，打包工具就能确定模块的完整依赖关系图。

- **标记与移除**：
  1. Rollup 从入口文件开始，标记所有被显式 `import` 的代码为“活代码”。
  2. 接着，它会遍历整个依赖图，标记所有与“活代码”相关的代码。
  3. 最后，在生成最终产物时，所有未被标记的“死代码”都会被忽略。

相比之下，CommonJS 的 `require()` 是动态的，可以在代码的任何地方执行，甚至可以根据变量来决定加载哪个模块（例如 `require(myModule)`）。这种动态性使得在编译时进行可靠的静态分析变得极其困难，因此 Webpack 对 CommonJS 模块的 Tree-shaking 效果远不如 Rollup 对 ESM 的效果。

## 组件库打包实战 (Component Library Packaging in Practice)

### 主流组件库的打包策略

以 `antd` 为例，观察其 `node_modules` 目录结构：

- `es/`：存放 ES Module 格式的组件代码，供现代打包工具（如 Webpack, Rollup）进行 Tree-shaking。
- `lib/`：存放 CommonJS 格式的组件代码，用于 Node.js 环境或旧版工具。
- `dist/`：存放 UMD 格式的打包文件，可直接通过 `<script>` 标签在浏览器中使用。

`package.json` 中通过以下字段指明不同模块规范的入口：

```json
{
  "main": "lib/index.js", // CommonJS 入口
  "module": "es/index.js", // ESM 入口
  "unpkg": "dist/antd.min.js" // UMD 入口
}
```

这种策略满足了不同环境下的使用需求，而 Rollup 能够轻松地一次性输出多种格式的产物，完美契合了这一需求。

### 处理 CSS：插件生态对比

组件库不仅包含 JS，还包含样式文件。

#### Rollup 处理 CSS

使用 `rollup-plugin-postcss` 插件可以方便地处理 CSS，并支持将其提取为单独的文件。

**配置示例：**

```javascript
import postcss from "rollup-plugin-postcss"

export default {
  // ...
  plugins: [
    postcss({
      extract: "index.css" // 提取 CSS 到 index.css
    })
  ]
}
```

打包后，JS 文件中对 CSS 的 `import` 会被移除（得益于 Tree-shaking），同时生成一个独立的 `index.css` 文件。

#### Webpack 处理 CSS

Webpack 需要 `css-loader` 来解析 CSS `import`，并结合 `mini-css-extract-plugin` 来提取 CSS。

**配置示例：**

```javascript
import MiniCssExtractPlugin from "mini-css-extract-plugin"

export default {
  // ...
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"]
      }
    ]
  },
  plugins: [new MiniCssExtractPlugin({ filename: "index.css" })]
}
```

虽然两者都能实现目标，但 Rollup 的配置通常更简洁直观。

### 自定义插件：深入 Rollup 机制

Rollup 的插件机制非常强大且易于理解。一个 Rollup 插件本质上是一个返回特定钩子 (Hooks) 函数的对象。其中，`transform` 钩子类似于 Webpack 的 loader，用于转换单个模块的代码。

**自定义 CSS 提取插件示例：**
`my-extract-css-plugin.mjs`

```javascript
import fs from "fs"
import path from "path"

const cssCode = new Map()

export default function myExtractCssPlugin(options = {}) {
  return {
    name: "my-extract-css-plugin",

    // 转换每个模块
    transform(code, id) {
      if (!id.endsWith(".css")) {
        return null // 返回 null 表示不处理此模块
      }
      // 存储 CSS 内容，并返回一个空的 JS 模块
      cssCode.set(id, code)
      return {
        code: "", // 返回空代码，以便被 Tree-shaking 移除
        map: { mappings: "" }
      }
    },

    // 打包结束时生成最终文件
    generateBundle(opts, bundle) {
      const css = Array.from(cssCode.values()).join("\n")
      const fileName = options.filename || "bundle.css"

      // 发射一个资源文件
      this.emitFile({
        type: "asset",
        fileName,
        source: css
      })
    }
  }
}
```

这个例子清晰地展示了 Rollup 插件如何通过 `transform` 和 `generateBundle` 钩子协同工作，实现代码转换和资源生成。

## 性能对比 (Performance Comparison)

| 指标 (Metric)              | Rollup                                               | Webpack                                                     |
| -------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| **打包速度 (Build Speed)** | 通常更快，因为它处理的依赖关系更简单。               | 相对较慢，因为它需要处理更复杂的特性和运行时注入。          |
| **输出体积 (Output Size)** | **极小**。得益于高效的 Tree-shaking 和无运行时代码。 | **较大**。包含模块加载器和运行时代码，体积开销更大。        |
| **Tree-shaking 效果**      | **优秀**。基于 ESM 静态分析，效果彻底。              | **良好但有限**。对 ESM 支持好，但受限于对 CommonJS 的兼容。 |

## 适用场景总结 (Use Case Summary)

| 场景 (Scenario)                   | 推荐工具 (Recommended Tool) | 原因 (Reason)                                                               |
| --------------------------------- | --------------------------- | --------------------------------------------------------------------------- |
| **JS 库 / UI 组件库**             | **Rollup**                  | 输出代码干净、体积小，Tree-shaking 效果好，完美支持多种模块格式。           |
| **复杂的单页应用 (SPA)**          | **Webpack**                 | 生态成熟，功能强大（代码分割、HMR、CSS 模块化），能应对各种复杂的工程需求。 |
| **需要快速冷启动的现代 Web 应用** | **Vite (底层使用 Rollup)**  | 开发体验极佳，生产环境利用 Rollup 的优势进行优化打包。                      |

## 生态与未来 (Ecosystem and Future)

**Vite** 的崛起进一步证明了 Rollup 在现代前端工具链中的重要地位。Vite 在开发环境下利用浏览器原生的 ESM 和 esbuild 实现极速的冷启动和热更新；而在**生产环境打包时，则默认采用 Rollup**，因为它能生成高度优化的、体积更小的代码。

此外，Vite 团队正在推进 **Rolldown**，一个用 Rust 编写的打包工具，旨在将 Rollup 的功能与 esbuild 的性能合二为一（截至 2026 年已在部分 Vite 版本中提供试用）。这预示着未来构建工具将朝着更高性能、更一体化的方向发展。

## 总结 (Conclusion)

回到最初的问题：**为什么组件库打包用 Rollup 而不是 Webpack？**

答案可以归结为以下几点：

1.  **设计理念不同**：Rollup 专注于将代码打包成标准化的、可复用的 JS 模块，而 Webpack 则是一个为复杂应用设计的全能型模块打包解决方案。
2.  **产物纯净**：Rollup 基于 ESM 进行静态分析，生成的代码不包含额外的运行时，体积更小、更易于阅读和调试。
3.  **Tree-shaking 高效**：Rollup 的 Tree-shaking 机制更为彻底，能最大程度地为库的使用者减小最终包体积，这是库打包的核心诉求。
4.  **配置简洁**：对于库打包场景，Rollup 的配置通常比 Webpack 更简单明了。

因此，**选择 Rollup 是为了让库的产物更专业、更轻量、对使用者更友好。** 而 Webpack 则继续在它所擅长的应用打包领域发光发热。两者并非竞争关系，而是前端工具生态中相辅相成的两个重要组成部分。

## 参考资料 (References)

- [Rollup 官方文档](https://rollupjs.org/)
- [Webpack 官方文档](https://webpack.js.org/)
- [Vite 官方文档](https://vitejs.dev/)
