---
title: "**使用 Rollup 打包 React 组件库：从零到一的完整指南**"
description: 用 Rollup 打包 React 组件库的完整配置：多格式输出、类型声明与外部化
keywords: [Node.js, AST, 编译, Rollup, React]
category: Node.js
tags: [Node.js, 编译与底层原理]
---







# **使用 Rollup 打包 React 组件库：从零到一的完整指南**

## **摘要**

本指南将详细介绍如何使用 Rollup 从零开始打包一个 React 组件库。内容涵盖从创建 React 组件、配置 Rollup、处理 CSS 和 TypeScript，到最终发布到 npm 的全过程。还将探讨打包过程中的最佳实践和常见问题，旨在为您提供一个全面、可复用的组件库打包方案。

## **目录**

1.  [引言](#1-引言)
2.  [环境准备](#2-环境准备)
3.  [创建你的第一个 React 组件](#3-创建你的第一个-react-组件)
4.  [搭建组件库打包环境](#4-搭建组件库打包环境)
5.  [深入解析 Rollup 配置](#5-深入解析-rollup-配置)
6.  [执行打包与配置 `package.json`](#6-执行打包与配置-packagejson)
7.  [发布与使用组件库](#7-发布与使用组件库)
8.  [最佳实践](#8-最佳实践)
9.  [常见问题与解决方案 (FAQ)](#9-常见问题与解决方案-faq)
10. [总结](#10-总结)

---

## **1. 引言**

在现代前端开发中，组件化是提高代码复用性、可维护性的核心思想。无论是 React、Vue 还是其他框架，构建自己的组件库已成为团队和个人开发者的常见需求。Rollup 作为一个高效的 JavaScript 模块打包器，凭借其对 ES Modules 的原生支持和 Tree Shaking 的强大功能，成为打包组件库的首选工具。

与 Webpack 这类更侧重于应用打包的工具不同，Rollup 专注于生成更小、更快的库代码。本指南将带你一步步完成以下目标：

- **创建并组织 React 组件**：使用 TypeScript 和 SCSS 构建一个基础的 `Button` 组件。
- **配置 Rollup 打包**：支持 `ESM`、`CJS` 和 `UMD` 三种主流模块格式。
- **处理样式与类型定义**：自动抽离 CSS 文件并生成 `.d.ts` 类型声明。
- **发布到 npm**：将你的组件库发布，供他人或跨项目使用。
- **掌握最佳实践**：学习组件库开发中的高级技巧和注意事项。

让我们开始吧！

## **2. 环境准备**

在开始之前，请确保你的开发环境中已安装以下工具：

- **Node.js**: `v18.0.0` 或更高版本。
- **npm**: `v9.0.0` 或更高版本，或使用 `yarn`、`pnpm` 等其他包管理工具。
- **代码编辑器**: 推荐使用 VS Code。

## **3. 创建你的第一个 React 组件**

为了演示打包过程，首先需要一个可用的 React 组件。将创建一个简单的 `Button` 组件作为示例。

### **3.1 初始化一个 Vite + React 项目**

可以使用 Vite 快速创建一个 React 开发环境，以便实时预览和测试我们的组件。

```bash
# 创建一个名为 react-comp 的 Vite + React 项目
npx create-vite react-comp --template react-ts
```

进入项目目录并安装依赖：

```bash
cd react-comp
npm install
```

### **3.2 创建 Button 组件**

在 `src` 目录下，创建 `Button` 文件夹，并添加以下文件：

**`src/Button/index.tsx`**:

```typescript
import { CSSProperties, MouseEventHandler, PropsWithChildren } from "react"
import "./index.scss"

export interface ButtonProps extends PropsWithChildren {
  className?: string
  style?: CSSProperties
  type?: "primary" | "default"
  onClick?: MouseEventHandler
}

function Button(props: ButtonProps) {
  const {
    className = "",
    style,
    type = "primary",
    children,
    onClick = () => {}
  } = props

  return (
    <div
      className={`btn ${className} btn-${type}`}
      style={{ ...style }}
      onClick={onClick}>
      {children}
    </div>
  )
}

export default Button
```

**`src/Button/index.scss`**:

为了支持 SCSS，需要安装 `sass` 依赖：

```bash
npm install --save sass
```

然后编写样式文件：

```scss
.btn {
  padding: 8px 10px;
  display: inline-block;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;

  &-primary {
    background: skyblue;
    color: white;
    &:hover {
      background: lightblue;
    }
  }

  &-default {
    border: 1px solid skyblue;
    color: initial;
    &:hover {
      color: skyblue;
      border-color: lightblue;
    }
  }
}
```

### **3.3 在 App 中使用组件**

修改 `src/App.tsx` 来测试我们的 `Button` 组件：

```typescript
import Button from "./Button"

function App() {
  return (
    <div style={{ padding: "20px" }}>
      <Button type="primary" style={{ marginRight: "20px" }}>
        按钮一
      </Button>
      <Button type="default" onClick={() => alert("Button clicked!")}>
        按钮二
      </Button>
    </div>
  )
}

export default App
```

运行开发服务器：

```bash
npm run dev
```

现在，你应该能在浏览器中看到两个样式不同的按钮，并且点击第二个按钮会触发弹窗。这证明我们的组件已经可以正常工作了。


## **4. 搭建组件库打包环境**

确认组件无误后，开始搭建一个专门用于打包组件库的项目。

### **4.1 初始化项目**

创建一个新目录 `react-comp-lib` 并初始化 `package.json`：

```bash
mkdir react-comp-lib
cd react-comp-lib
npm init -y
```

### **4.2 组织项目结构**

将之前写好的 `Button` 组件代码（`src/Button` 目录）复制到新项目的 `src` 目录下。同时，创建一个入口文件 `src/index.ts`，用于导出所有需要暴露给外部的组件和类型。

项目结构如下：

```javascript
react-comp-lib/
├── src/
│   ├── Button/
│   │   ├── index.tsx
│   │   └── index.scss
│   └── index.ts
└── package.json
```

**`src/index.ts`**:

```typescript
import Button, { ButtonProps } from "./Button"

export { Button }
export type { ButtonProps }
```

### **4.3 安装核心依赖**

组件库项目需要 `react` 和 `react-dom` 作为对等依赖（peer dependencies），同时安装 Rollup 和相关插件。

```bash
# 安装 React 相关包
npm install --save-dev react@18 react-dom@18 @types/react@18 @types/react-dom@18

# 安装 Rollup 及插件
npm install --save-dev rollup @rollup/plugin-commonjs @rollup/plugin-node-resolve @rollup/plugin-replace @rollup/plugin-typescript rollup-plugin-postcss tslib sass
```

- **`react`, `react-dom`**: 作为 `devDependencies` 安装，因为它们不应被打包进库里，而是由使用库的项目提供。
- **`rollup`**: 核心打包工具。
- **`@rollup/plugin-commonjs`**: 将 CommonJS 模块转换为 ES6，以便 Rollup 处理。
- **`@rollup/plugin-node-resolve`**: 解析 `node_modules` 中的第三方模块。
- **`@rollup/plugin-replace`**: 在打包过程中替换代码中的字符串，常用于设置 `process.env.NODE_ENV`。
- **`@rollup/plugin-typescript`**: 编译 TypeScript 代码。
- **`rollup-plugin-postcss`**: 处理 CSS、SCSS 等样式文件，支持提取 CSS 到单独文件。
- **`tslib`**: TypeScript 的运行时库，包含所有 TypeScript 的辅助函数。
- **`sass`**: 支持 SCSS 语法。

## **5. 深入解析 Rollup 配置**

接下来，创建 Rollup 的配置文件 `rollup.config.mjs` 和 TypeScript 的配置文件 `tsconfig.json`。

### **5.1 `tsconfig.json`**

这个配置文件指导 TypeScript 编译器如何工作，特别是如何生成类型声明文件（`.d.ts`）。

```json
{
  "compilerOptions": {
    "target": "es2015",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "declaration": true, // 生成 .d.ts 文件
    "declarationDir": "dist/types", // .d.ts 文件输出目录
    "outDir": "dist", // 此处仅为示例，实际输出由 Rollup 控制
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true, // 重要：让 Rollup 处理文件生成
    "isolatedModules": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.tsx", "src/**/*.stories.tsx"]
}
```

**关键配置说明**：

- **`"declaration": true`**: 这是生成类型声明文件的关键。
- **`"declarationDir": "dist/types"`**: 指定类型声明文件的输出目录。
- **`"noEmit": true`**: 告诉 TypeScript 编译器不要输出 JavaScript 文件，因为这个工作将由 Rollup 完成。

### **5.2 `rollup.config.mjs`**

这是 Rollup 打包的核心配置文件。将配置它以生成 `ESM`、`CJS` 和 `UMD` 三种格式的产物。

```javascript
import postcss from "rollup-plugin-postcss"
import typescript from "@rollup/plugin-typescript"
import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import replace from "@rollup/plugin-replace"

/** @type {import("rollup").RollupOptions} */
export default {
  // 入口文件
  input: "src/index.ts",

  // 告诉 Rollup 不要将 react 和 react-dom 打包进来
  external: ["react", "react-dom"],

  // 输出配置
  output: [
    // ES Module
    {
      file: "dist/esm.js",
      format: "esm",
      sourcemap: true
    },
    // CommonJS
    {
      file: "dist/cjs.js",
      format: "cjs",
      sourcemap: true
    },
    // UMD
    {
      file: "dist/umd.js",
      format: "umd",
      name: "GuangReactCompLib", // 全局变量名
      globals: {
        react: "React",
        "react-dom": "ReactDOM"
      },
      sourcemap: true
    }
  ],

  // 插件列表
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: "tsconfig.json"
      // Rollup v3+ and @rollup/plugin-typescript v11+
      // declaration: true,
      // declarationDir: "dist/types",
    }),
    postcss({
      extract: "index.css", // 将所有 CSS 提取到一个文件中
      modules: false, // 禁用 CSS Modules
      minimize: true, // 压缩 CSS
      sourceMap: true
    }),
    replace({
      preventAssignment: true,
      "process.env.NODE_ENV": JSON.stringify("production")
    })
  ]
}
```

**配置项解析**：

- **`input`**: 指定打包的入口文件。
- **`external`**: 声明外部依赖。`react` 和 `react-dom` 应该由最终使用组件库的应用提供，而不是打包到库中，这可以有效减小包体积并避免版本冲突。
- **`output`**: 一个数组，用于配置多种输出格式。
  - **`format: 'esm'`**: ES Module 格式，适用于现代前端项目（如 Vite、Webpack 5+）。
  - **`format: 'cjs'`**: CommonJS 格式，适用于 Node.js 环境或旧版 Webpack。
  - **`format: 'umd'`**: UMD 格式，可同时用于 AMD、CommonJS 和浏览器全局变量。
  - **`name`**: 当 `format` 为 `umd` 时，此选项指定暴露在浏览器 `window` 对象上的全局变量名。
  - **`globals`**: 告诉 Rollup 在 UMD 环境中，外部依赖（如 `react`）对应于哪个全局变量。
- **`plugins`**:
  - **`resolve()`**: 解析 `node_modules` 中的模块。
  - **`commonjs()`**: 转换 CommonJS 模块为 ES 模块。
  - **`typescript()`**: 编译 TypeScript。它会读取 `tsconfig.json` 的配置。
  - **`postcss()`**: 处理 CSS。`extract: 'index.css'` 会将所有组件的 CSS 合并并输出到 `dist/index.css`。
  - **`replace()`**: 替换代码中的环境变量，这对于 React 等库区分开发和生产模式至关重要。

## **6. 执行打包与配置 `package.json`**

### **6.1 执行打包命令**

在 `package.json` 中添加一个 `build` 脚本：

```json
"scripts": {
  "build": "rollup -c rollup.config.mjs"
}
```

然后运行打包：

```bash
npm run build
```

打包完成后，`dist` 目录的结构应如下所示：

```bash
dist/
├── cjs.js
├── esm.js
├── umd.js
├── index.css
└── types/
    ├── Button/
    │   └── index.d.ts
    └── index.d.ts
```

### **6.2 配置 `package.json`**

为了让 npm 和打包工具能正确识别我们的库，需要对 `package.json` 进行详细配置。

```json
{
  "name": "@your-scope/react-comp-lib",
  "version": "1.0.0",
  "description": "A simple React component library.",
  "main": "dist/cjs.js",
  "module": "dist/esm.js",
  "types": "dist/types/index.d.ts",
  "unpkg": "dist/umd.js",
  "files": ["dist"],
  "scripts": {
    "build": "rollup -c rollup.config.mjs"
  },
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-dom": ">=16.8.0"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "keywords": ["react", "component", "library"],
  "author": "Your Name",
  "license": "MIT"
}
```

**关键字段说明**：

- **`name`**: 包名。如果希望发布到 npm 的组织下，可以使用 `@scope/package-name` 的格式。
- **`main`**: CommonJS 入口，指向 `cjs.js`。
- **`module`**: ES Module 入口，指向 `esm.js`。现代打包工具会优先使用此字段。
- **`types`**: TypeScript 类型声明入口，指向 `index.d.ts`。
- **`unpkg`**: UMD 入口，供 CDN 服务（如 unpkg）使用。
- **`files`**: 一个数组，指定发布到 npm 时应包含哪些文件或目录。只需要发布 `dist` 目录。
- **`peerDependencies`**: 对等依赖。声明你的库需要宿主环境提供 `react` 和 `react-dom`。这可以防止版本冲突。
- **`publishConfig`**: 发布相关的配置。`"access": "public"` 允许你发布公共作用域包。

## **7. 发布与使用组件库**

### **7.1 发布到 npm**

首先，你需要在 [npm 网站](https://www.npmjs.com/)上注册一个账户。如果你的包名带有 `@scope`，还需要创建一个对应的组织。

登录 npm CLI：

```bash
npm login
```

然后发布：

```bash
npm publish
```

发布成功后，你就可以在 npm 上看到你的组件库了。

### **7.2 在其他项目中使用**

现在，来测试一下刚刚发布的组件库。创建一个新的 Vite + React 项目：

```bash
npx create-vite my-app --template react-ts
cd my-app
npm install
```

安装你的组件库：

```bash
npm install @your-scope/react-comp-lib
```

修改 `src/App.tsx`：

```typescript
import { Button } from "@your-scope/react-comp-lib"
// 别忘了引入样式文件
import "@your-scope/react-comp-lib/dist/index.css"

function App() {
  return (
    <div style={{ padding: "20px" }}>
      <Button type="primary" style={{ marginRight: "20px" }}>
        来自组件库的按钮
      </Button>
      <Button type="default" onClick={() => alert("Hello from lib!")}>
        点我
      </Button>
    </div>
  )
}

export default App
```

运行项目，你应该能看到与之前开发时完全一致的按钮效果。

### **7.3 UMD 用法**

UMD 产物可以直接在 HTML 中通过 `<script>` 标签使用。创建一个 `test.html` 文件：

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>UMD Test</title>
    <!-- 引入 React 和 ReactDOM -->
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

    <!-- 引入你的组件库 UMD 文件和 CSS -->
    <script src="https://unpkg.com/@your-scope/react-comp-lib@1.0.0/dist/umd.js"></script>
    <link
      rel="stylesheet"
      href="https://unpkg.com/@your-scope/react-comp-lib@1.0.0/dist/index.css" />
  </head>
  <body>
    <div id="root"></div>
    <script>
      const container = document.getElementById("root")
      const root = ReactDOM.createRoot(container)

      // 使用 React.createElement 创建组件实例
      root.render(
        React.createElement(GuangReactCompLib.Button, {
          type: "primary",
          onClick: () => alert("UMD works!"),
          children: "UMD 按钮"
        })
      )
    </script>
  </body>
</html>
```

在浏览器中打开此文件，你将看到通过 UMD 方式渲染的按钮。

## **8. 最佳实践**

1.  **Tree Shaking 优化**：

    - 确保你的代码是 "side-effect-free"（无副作用）的。在 `package.json` 中添加 `"sideEffects": false` 或 `["*.css"]` 可以帮助打包工具更好地进行 Tree Shaking。
    - 导出的模块应尽可能原子化，避免在一个文件中导出过多不相关的组件。

2.  **CSS 处理策略**：

    - **CSS-in-JS**: 如果你的组件库使用 CSS-in-JS（如 `styled-components` 或 `Emotion`），请确保将它们也列为 `peerDependencies`。
    - **CSS Modules**: `rollup-plugin-postcss` 支持 CSS Modules，可以为每个组件生成唯一的类名，避免全局样式污染。
    - **单独的 CSS 文件**: 本指南采用的策略。优点是简单直接，缺点是用户需要手动引入 CSS 文件。

3.  **版本管理**：

    - 遵循 [Semantic Versioning (SemVer)](https://semver.org/) 规范。
    - `major` (主版本号): 当你做了不兼容的 API 修改。
    - `minor` (次版本号): 当你做了向下兼容的功能性新增。
    - `patch` (修订号): 当你做了向下兼容的问题修正。

4.  **文档与示例**：
    - 使用 [Storybook](https://storybook.js.org/) 或 [Dumi](https://d.umijs.org/) 等工具为你的组件库创建交互式文档和示例，这将极大地方便用户使用。

## **9. 常见问题与解决方案 (FAQ)**

**Q1: 为什么 `react` 和 `react-dom` 要放在 `peerDependencies` 而不是 `dependencies`?**
**A:** 如果将 React 打包进你的库中，而用户的项目也依赖了 React，那么最终应用里会存在两个不同版本的 React 实例。这会导致一系列问题，比如 Hooks 失效（"Invalid hook call" 错误）、Context 无法共享等。`peerDependencies` 确保你的库和宿主应用共享同一个 React 实例。

**Q2: 打包时出现 `[!] Error: 'default' is not exported by ...` 错误怎么办？**
**A:** 这个错误通常是因为你试图从一个 CommonJS 模块中 `import` 默认导出，但该模块实际上只有命名导出。`@rollup/plugin-commonjs` 通常能解决这个问题，但如果问题依然存在，请检查你的 `import` 语句。尝试使用 `import * as name from 'module'` 代替 `import name from 'module'`。

**Q3: 如何处理图片、字体等静态资源？**
**A:** 你可以使用 `@rollup/plugin-url` 或 `rollup-plugin-copy`。

- **`@rollup/plugin-url`**: 可以将小于某个阈值的资源转换为 Base64 Data URI，大于该阈值的则复制到输出目录。
- **`rollup-plugin-copy`**: 可以直接将指定的文件或目录复制到输出目录。

**Q4: 如何为不同的组件生成单独的 CSS 文件？**
**A:** `rollup-plugin-postcss` 的 `extract` 选项默认会将所有 CSS 合并。如果你想为每个组件生成单独的 CSS，你需要更复杂的 Rollup 配置，可能需要为每个组件创建一个打包入口。对于大多数中小型组件库，单一的 CSS 文件是更简单实用的方案。

## **10. 总结**

通过本指南，学习了如何使用 Rollup 从零开始构建、打包和发布一个 React 组件库。涵盖了从项目设置、Rollup 配置、多格式输出，到最终发布和使用的完整流程。

Rollup 是一个强大而灵活的工具，尤其适合库的打包。希望本指南能为你构建自己的高质量组件库提供坚实的基础。

> **代码仓库链接:**
>
> - [React 组件示例](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/react-comp)
> - [Rollup 打包配置](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/react-comp-lib)
> - [测试项目](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/my-comp-lib-test)
