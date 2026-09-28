---
title: rollup
description: "Rollup 是现代的 JavaScript 模块打包工具，采用 ES2015 模块的标准化格式，能够进行高效的静态分析与 Tree-shaking。本文介绍其与 Webpack 的区别、配置文件、多格式输出选型、代码分割与性能优化建议。"
keywords: [rollup]
category: tools
tags: [Rollup, 打包, ESM, 库构建]
---


# Rollup

Rollup 是现代的 JavaScript 模块打包工具，专注于将小块的代码编译成更大、更复杂的项目，例如库或应用程序。与传统的 CommonJS 和 AMD 模块加载器不同，Rollup 采用 ES2015 模块（`import` 和 `export`）的标准化格式，这使得它能够进行高效的静态分析

Rollup 的核心思想是：**基于 ES 模块的静态结构，只打包实际被使用的代码**。这使得 Rollup 在构建 JavaScript 库时尤其受欢迎，因为它能生成体积更小、性能更高的代码

## 与 Webpack 的主要区别

虽然 Rollup 和 Webpack 都是优秀的打包工具，但它们的设计哲学和适用场景有所不同

- **使用 Rollup**：当构建供他人使用的 **JavaScript 库**时，Rollup 是最佳选择。它能生成最优化、最小化的代码
- **使用 Webpack**：当构建复杂的 **Web 应用程序**时，Webpack 更具优势。它提供了更强大的功能，如代码分割、静态资源处理（CSS, 图片）、热模块替换（HMR）等

| 特性             | Rollup                                           | Webpack                                                         |
| :--------------- | :----------------------------------------------- | :-------------------------------------------------------------- |
| **核心目标**     | 主要用于打包 **JavaScript 库**                   | 主要用于打包 **Web 应用程序**                                   |
| **模块系统**     | 默认使用 **ES 模块**，输出更扁平、更简洁的代码   | 兼容多种模块系统（ESM、CJS、AMD），但会注入运行时代码来管理模块 |
| **Tree-shaking** | **天然支持**，效果更好，因为其静态分析能力更强   | 需要配置开启，且对于 CommonJS 模块的支持有限                    |
| **代码分割**     | 支持，但配置相对复杂                             | 功能强大，支持多种复杂的代码分割策略                            |
| **开发体验**     | 插件生态相对较小，配置更简单直接                 | 插件生态极其丰富，支持 HMR（热模块替换），开发服务器等高级功能  |
| **输出结果**     | 输出的代码非常干净，几乎没有额外的运行时包裹代码 | 输出的代码包含一个引导程序（bootstrap），用于管理模块加载和执行 |

## Tree-shaking 机制

**Tree-shaking**（摇树优化）是 Rollup 最具代表性的特性之一。这个术语由 Rollup 首次提出，指的是**在打包过程中自动移除 JavaScript 上下文中未被引用的代码**

### 工作原理

Tree-shaking 的实现依赖于 **ES2015 模块的静态结构**。与 CommonJS 的 `require()` 不同，ESM 的 `import` 和 `export` 语句是静态的，只能在模块的顶层使用它们。这意味着 Rollup 可以在**编译时**就确定模块的依赖关系，并精确地知道哪些代码被导出和导入

这里的“ES2015 模块的静态结构”指的是静态的 `import` / `export` 声明语句（必须写在模块顶层）。这些语句在代码执行前就可以被完整解析，Rollup 才能够基于它们构建依赖图并进行 Tree-shaking。

需要注意，后文提到用于代码分割的动态导入使用的是 `import()` 表达式，它属于运行时按需加载机制，可以写在函数或条件内部，主要用于实现懒加载和拆分 chunk。静态 `import` / `export` 提供的是 Tree-shaking 所需的静态依赖信息；`import()` 提供的是按需加载能力，两者是互补关系，并不矛盾

### 优势

- **减小文件体积**：只包含必要的代码，显著减小最终输出文件的大小
- **提升执行性能**：代码体积变小，浏览器加载和解析 JavaScript 的速度更快，从而提升了应用的启动和运行性能
- **促进代码模块化**：鼓励开发者编写更小、更独立的模块，因为未使用的代码不会增加最终产物的体积

Tree-shaking 是现代前端工程化中一项至关重要的优化手段，而 Rollup 在这方面提供了最出色、最原生的支持

## 安装与配置

### 全局安装

可以通过 npm 来安装 Rollup。全局安装后，可以在任何项目中使用 `rollup` 命令

```bash
npm install --global rollup
# 或者
yarn global add rollup
```

### 项目本地安装

在实际项目中，更推荐将 Rollup 作为开发依赖项进行本地安装。这样可以确保团队成员使用统一的 Rollup 版本

```bash
npm install --save-dev rollup
# 或者
yarn add --dev rollup
```

本地安装后，可以通过 `npx rollup` 或在 `package.json` 的 `scripts` 中定义命令来运行 Rollup

```json
{
  "scripts": {
    "build": "rollup --config rollup.config.js",
    "build:watch": "rollup --config rollup.config.js --watch"
  }
}
```

也可以将开发环境与生产环境拆分为不同配置文件，如 `rollup.config.dev.js` 与 `rollup.config.prod.js`，分别用于本地调试与发布构建

## 配置文件

Rollup 的核心配置位于根目录下的 `rollup.config.js` 文件中。这个文件使用标准的 ES 模块语法，允许使用 JavaScript 的全部功能来编写配置。

示例：基本的配置文件结构

```javascript
// rollup.config.js
export default {
  // 核心选项
  input: "src/main.js", // 打包入口文件
  output: {
    file: "dist/bundle.js", // 输出文件
    format: "es", // 输出格式 (amd, cjs, es, iife, umd)
    name: "MyBundle", // 当 format 为 iife 或 umd 时，需要指定一个全局变量名
    globals: {
      jquery: "$" // 指出外部依赖（当使用 umd/iife 时）
    }
  },
  plugins: [
    // 插件列表
  ],
  external: [
    // 外部依赖，告诉 Rollup 不要将这些模块打包进去
    "jquery"
  ]
}
```

### 常用选项解析

- **`input`**: (String | String[] | Object) 打包的入口文件路径
- **`output`**: (Object | Object[]) 输出配置
  - **`file`**: (String) 输出文件的路径
  - **`dir`**: (String) 当有多个入口或代码分割时，指定输出目录
  - **`format`**: (String) 输出的模块格式
    - `es`: ES 模块文件，适用于现代浏览器。
    - `cjs`: CommonJS 格式，适用于 Node.js 环境。
    - `umd`: 通用模块定义，兼容 amd, cjs 和 iife。
    - `iife`: 自执行函数，适用于 `<script>` 标签。
  - **`name`**: (String) 当 `format` 为 `iife` 或 `umd` 时，作为全局变量的名称
  - **`sourcemap`**: (Boolean | 'inline') 是否生成 Source Map
- **`plugins`**: (Array) 使用的插件列表
- **`external`**: (String[] | Function) 声明外部依赖，Rollup 不会处理这些模块

#### 不同模块格式的输出差异与选型

Rollup 支持多种输出格式，常见场景可以总结为：

| format | 适用环境                 | 特点与差异                                                |
| ------ | ------------------------ | --------------------------------------------------------- |
| `es`   | 现代打包工具、现代浏览器 | 原生 ES 模块，支持 Tree-shaking，推荐作为库的主要输出格式 |
| `cjs`  | Node.js、老旧工具链      | CommonJS 模块，使用 `require` 加载，适合 Node 环境        |
| `umd`  | 兼容多种环境的通用库     | 同时支持 AMD、CommonJS 和全局变量，体积相对更大           |
| `iife` | 通过 `<script>` 直接引入 | 立即执行函数，打包为一个全局变量，适用于传统浏览器场景    |

实践上的推荐是：

- 发布 npm 库时，优先输出 `es` 和 `cjs` 两种格式。
- 面向无打包工具的浏览器场景时，使用 `iife` 或 `umd`。
- 只有在 `format` 为 `iife` 或 `umd` 时才需要配置 `output.name`，用于指定挂载到全局对象上的变量名。

### 开发环境

在开发环境中，通常需要快速的构建速度和详细的错误提示

```javascript
// rollup.config.dev.js
import serve from "rollup-plugin-serve"
import livereload from "rollup-plugin-livereload"

export default {
  input: "src/main.js",
  output: {
    file: "dist/bundle.js",
    format: "iife",
    sourcemap: true
  },
  plugins: [
    serve({
      open: true, // 自动打开浏览器
      contentBase: ["dist", "public"], // 静态文件目录
      port: 3000
    }),
    livereload("dist") // 监听 dist 目录变化并刷新浏览器
  ]
}
```

### 生产环境

在生产环境中，关注的是代码的压缩和优化

```javascript
// rollup.config.prod.js
// 注：rollup-plugin-terser 已停止维护，Rollup 3+ 请使用官方的 @rollup/plugin-terser（导入方式相同）
import { terser } from "rollup-plugin-terser"

export default {
  input: "src/main.js",
  output: [
    {
      file: "dist/bundle.cjs.js",
      format: "cjs"
    },
    {
      file: "dist/bundle.es.js",
      format: "es"
    },
    {
      file: "dist/bundle.umd.js",
      format: "umd",
      name: "MyBundle"
    }
  ],
  plugins: [
    terser() // 压缩代码
  ]
}
```

通过导出一个数组，可以同时生成多种格式的打包文件，这对于发布一个库非常有用

### 常见构建场景配置示例

下面给出几个在实际工程中经常遇到的完整配置场景，便于对比理解。

#### 构建浏览器应用（单入口 + IIFE）

适用场景：传统浏览器应用，通过 `<script>` 标签直接引入。

```javascript
// rollup.config.app.js
import { nodeResolve } from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import { terser } from "@rollup/plugin-terser"
import replace from "@rollup/plugin-replace"

const isProd = process.env.NODE_ENV === "production"

export default {
  input: "src/main.js",
  output: {
    file: isProd ? "dist/app.min.js" : "dist/app.js",
    format: "iife",
    name: "App",
    sourcemap: !isProd
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    replace({
      preventAssignment: true,
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV || "development")
    }),
    isProd && terser()
  ].filter(Boolean)
}
```

#### 构建通用 JS 库（同时输出 ESM + CJS）

适用场景：发布到 npm 的通用库，既支持 Node，又支持现代打包工具。

```javascript
// rollup.config.lib.js
import { nodeResolve } from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import { babel } from "@rollup/plugin-babel"
import typescript from "@rollup/plugin-typescript"

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.cjs",
      format: "cjs",
      sourcemap: true
    },
    {
      file: "dist/index.esm.js",
      format: "es",
      sourcemap: true
    }
  ],
  external: [
    // 保持依赖为 external，避免重复打包
    "lodash"
  ],
  plugins: [
    nodeResolve({
      extensions: [".js", ".ts"]
    }),
    commonjs(),
    typescript({
      tsconfig: "./tsconfig.json"
    }),
    babel({
      babelHelpers: "bundled",
      extensions: [".js", ".ts"],
      exclude: "node_modules/**"
    })
  ]
}
```

#### 构建 Node.js CLI 工具

适用场景：需要打包为单个执行文件的 Node 脚本。

```javascript
// rollup.config.cli.js
import { nodeResolve } from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"

export default {
  input: "src/cli.js",
  output: {
    file: "dist/cli.cjs",
    format: "cjs",
    banner: "#!/usr/bin/env node",
    sourcemap: true
  },
  external: [
    // 通常保持 Node 内置模块为 external
    "fs",
    "path",
    "os"
  ],
  plugins: [nodeResolve(), commonjs()]
}
```

## Rollup 的高级用法

除了基本的打包功能，Rollup 还提供一系列高级特性，以满足更复杂的构建需求

### 代码分割 (Code Splitting)

代码分割是优化大型应用性能的关键技术。允许将代码库分割成多个小的 `chunks`（块），这些 `chunks` 可以按需加载，而不是一次性将所有代码都发送给用户

Rollup 支持两种方式的代码分割：

1.  **多入口**：在 `input` 中提供一个入口数组
2.  **动态导入**：在代码中使用 `import()` 语法

#### 多入口实现代码分割

当为 `input` 提供一个数组时，Rollup 会为每个入口文件生成一个单独的 `chunk`。同时它们共享的依赖会被提取到一个公共的 `chunk` 中

```javascript
// rollup.config.js
export default {
  input: ["src/pageA.js", "src/pageB.js"],
  output: {
    dir: "dist",
    format: "es"
  }
}
```

假设 `pageA.js` 和 `pageB.js` 都依赖于 `lodash`，那么 Rollup 的输出目录 `dist` 中可能会包含：

- `pageA.js` (入口 A 的代码)
- `pageB.js` (入口 B 的代码)
- `chunk-xxxx.js` (包含 `lodash` 的共享代码)

#### 动态导入实现代码分割

动态 `import()` 语法是实现代码分割的更现代、更灵活的方式。当 Rollup 遇到 `import()` 时，它会自动将该模块及其依赖项放入一个单独的 `chunk` 中

```javascript
// main.js
button.addEventListener("click", () => {
  import("./lazy-module.js").then((module) => {
    module.doSomething()
  })
})
```

**配置**：

```javascript
// rollup.config.js
export default {
  input: "src/main.js",
  output: {
    dir: "dist",
    format: "es"
  }
}
```

Rollup 会生成 `main.js` 和 `lazy-module.js` 两个 `chunk`，`lazy-module.js` 只在用户点击按钮时才会被加载

### 多入口打包配置

通过在 `input` 中提供个对象，可以更精细地控制多入口打包的输出文件名

```javascript
// rollup.config.js
export default {
  input: {
    main: "src/main.js",
    admin: "src/admin.js"
  },
  output: {
    dir: "dist",
    format: "es",
    entryFileNames: "[name].[hash].js", // 控制入口文件的命名
    chunkFileNames: "chunk-[name].[hash].js" // 控制共享块的命名
  }
}
```

### 与其他工具链的集成

Rollup 可以与许多流行的前端工具无缝集成

#### 与 Babel 集成

通过 `@rollup/plugin-babel`，可以在 Rollup 中使用 Babel 的全部功能

**配置 `.babelrc`**：

```json
{
  "presets": [["@babel/preset-env", { "modules": false }]]
}
```

**重要提示**：必须设置 `"modules": false`，否则 Babel 会在 Rollup 之前将 ES 模块转换为 CommonJS 模块，这会破坏 Rollup 的 Tree-shaking 功能

#### 与 TypeScript 集成

使用 `@rollup/plugin-typescript` 可以直接打包 TypeScript 项目。

**配置 `tsconfig.json`**：确保在 `tsconfig.json` 中设置了正确的 `module` 和 `target` 选项

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "declaration": true, // 生成 .d.ts 类型声明文件
    "outDir": "dist"
  }
}
```

**在 `rollup.config.js` 中使用**：

```javascript
import typescript from "@rollup/plugin-typescript"

export default {
  input: "src/main.ts",
  output: {
    dir: "dist",
    format: "es"
  },
  plugins: [typescript()]
}
```

## 性能优化建议

为了最大限度地发挥 Rollup 的性能优势，可以从以下几个方面进行优化：

- 控制插件数量：只在必要时启用插件，尤其是压缩类、静态分析类插件。
- 按环境区分配置：开发环境关闭 `terser`、复杂分析插件，仅保留解析和转换插件。
- 合理使用 `external`：把已经在运行环境中存在的依赖（如 `react`、`vue`）标记为外部依赖，避免重复打包。
- 使用 watch 模式：在本地开发时通过 `rollup --config --watch` 获取增量构建加速。
- 根据场景调整 `treeshake` 配置，在库场景下开启更严格的摇树策略，并确保源码使用 ES 模块。

### 构建速度优化

- **使用缓存**：Rollup 的 `cache` 选项可以缓存上一次构建的模块信息，从而在下一次构建时跳过未更改的模块，显著加快增量构建的速度。在 `watch` 模式下，此功能默认开启

  ```javascript
  // rollup.config.js
  let cache

  export default {
    // ...
    cache: cache,
    watch: {
      // ...
    }
  }
  ```

- **合理使用插件**：避免在开发环境中使用不必要的插件，尤其是像 `terser` 这样的压缩插件，它们会显著拖慢构建速度

- **并行构建**：Rollup 本身暂无内置的并行构建选项。对于非常大的项目，可以在 CI 中把多个输出格式/入口拆分为多个任务并行执行，或借助社区的并行构建方案

### 输出文件大小优化

- **充分利用 Tree-shaking**：

  - 始终优先使用 ES 模块
  - 避免有副作用的导入（`import './style.css'`），因为 Rollup 无法确定这是否可以安全地移除
  - 对于库的作者，确保你的 `package.json` 中有 `"sideEffects": false` 或明确列出有副作用的文件

- **代码压缩**：在生产环境中使用 `@rollup/plugin-terser` 来压缩和混淆代码

- **代码分割**：通过代码分割将不常用的代码分离出去，实现按需加载

- **`external` 选项**：如果项目是在一个已经包含某些依赖（如 React, Vue）的环境中运行，应该将这些依赖标记为 `external`，以避免将它们重复打包

  ```javascript
  // rollup.config.js
  export default {
    // ...
    external: ["react", "react-dom"]
  }
  ```

### 缓存策略和增量构建

Rollup 的 watch 模式是实现快速增量构建的最佳方式。当运行 `rollup --config --watch` 时，Rollup 会：

1.  执行一次完整的构建，并将模块图缓存在内存中
2.  监听文件的变化
3.  当文件发生变化时，只重新构建受影响的部分，并快速生成新的输出

对于更高级的缓存策略，例如在 CI/CD 环境中，可以手动管理 `cache` 对象，将其序列化到磁盘，并在下一次构建时读回，从而实现跨进程的持久化缓存

## 错误处理与诊断

在复杂工程中，合理处理构建过程中的警告和错误同样重要，可以通过 Rollup 的 `onwarn` 钩子统一拦截和定制化输出：

```javascript
// rollup.config.js
export default {
  // ...
  onwarn(warning, warn) {
    if (warning.code === "UNUSED_EXTERNAL_IMPORT") {
      // 忽略未使用的 external import 警告
      return
    }

    if (warning.code === "CIRCULAR_DEPENDENCY") {
      // 可以在这里统一打印或上报循环依赖
      console.warn("Circular dependency:", warning.importer)
      return
    }

    // 对于其他情况仍然使用默认行为
    warn(warning)
  }
}
```

在插件内部，可以结合 `this.warn` 和 `this.error` 进行更精细的错误控制

## 配置测试与构建结果验证

对于库型项目，建议为构建结果编写简单的验证脚本，保证不同输出格式的一致性：

```javascript
// tests/build.test.js
import assert from "assert"
import * as esm from "../dist/index.esm.js"
import cjs from "../dist/index.cjs"

// 检查导出是否存在
assert.ok(esm.foo, "ESM export foo should exist")
assert.ok(cjs.foo, "CJS export foo should exist")

console.log("Build outputs validated")
```

配合 npm scripts 使用：

```json
{
  "scripts": {
    "build": "rollup --config rollup.config.lib.js",
    "test:build": "node tests/build.test.js"
  }
}
```

除了自动化测试，还可以从以下几个角度人工验证构建结果：

- 运行验证：对 `iife` 格式，直接在 HTML 中通过 `<script>` 引入构建产物，检查全局变量是否按预期挂载
- 体积验证：通过 `ls -lh dist` 或配合体积分析插件查看各个 chunk 的大小
- Source Map 验证：在浏览器 DevTools 中确认是否能正确映射回源码
