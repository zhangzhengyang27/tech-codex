---
title: Rollup 打包
description: Rollup 的 Tree-shaking、多格式输出与库打包实践
keywords: [Node.js, 构建, 脚手架, Rollup]
category: Node.js
tags: [Node.js, 工程化]
---







# Rollup 打包

## 介绍

Rollup 是一个 JavaScript 模块打包器，特别适合用于打包库文件。它支持 ES Module，并能够进行高效的 Tree Shaking。

## 安装

```bash
pnpm add rollup -D
```

## 基础配置

创建 `rollup.config.js`：

```javascript
export default {
  // 入口
  input: 'src/index.js',
  
  // 输出
  output: [
    {
      file: 'dist/bundle.cjs.js',
      format: 'cjs'  // CommonJS
    },
    {
      file: 'dist/bundle.esm.js',
      format: 'es'  // ES Module
    },
    {
      file: 'dist/bundle.umd.js',
      format: 'umd',  // UMD
      name: 'MyLibrary'
    }
  ]
}
```

> **注**：若 `package.json` 未设置 `"type": "module"`，使用 ESM 语法的配置文件应命名为 `rollup.config.mjs`（或改用 `rollup.config.cjs` + CJS 语法）。

## 输出格式

| 格式 | 说明 | 适用场景 |
|------|------|---------|
| `es` | ES Module | 现代打包工具、浏览器 |
| `cjs` | CommonJS | Node.js |
| `umd` | Universal Module Definition | 浏览器 script 标签 |
| `iife` | Immediately Invoked Function Expression | 浏览器 script 标签 |

> **注**：Rollup 的 `format` 合法值为 `amd`/`cjs`/`es`/`iife`/`system`/`umd`，写 `esm` 会直接报错。

## 常用插件

### @rollup/plugin-node-resolve

解析 node_modules 中的模块：

```bash
pnpm add @rollup/plugin-node-resolve -D
```

```javascript
import resolve from '@rollup/plugin-node-resolve'

export default {
  plugins: [resolve()]
}
```

### @rollup/plugin-commonjs

转换 CommonJS 模块为 ES Module：

```bash
pnpm add @rollup/plugin-commonjs -D
```

```javascript
import commonjs from '@rollup/plugin-commonjs'

export default {
  plugins: [commonjs()]
}
```

### @rollup/plugin-babel

使用 Babel 转译代码：

```bash
pnpm add @rollup/plugin-babel @babel/core -D
```

```javascript
import babel from '@rollup/plugin-babel'

export default {
  plugins: [
    babel({
      babelHelpers: 'bundled',
      exclude: 'node_modules/**'
    })
  ]
}
```

### @rollup/plugin-typescript

编译 TypeScript：

```bash
pnpm add @rollup/plugin-typescript tslib -D
```

```javascript
import typescript from '@rollup/plugin-typescript'

export default {
  plugins: [
    typescript({
      tsconfig: './tsconfig.json'
    })
  ]
}
```

### @rollup/plugin-terser

代码压缩：

```bash
pnpm add @rollup/plugin-terser -D
```

```javascript
import terser from '@rollup/plugin-terser'

export default {
  plugins: [terser()]
}
```

### rollup-plugin-dts

生成类型声明文件：

```bash
pnpm add rollup-plugin-dts -D
```

```javascript
import dts from 'rollup-plugin-dts'

export default [
  // 主构建配置
  {
    input: 'src/index.ts',
    output: [
      { file: 'dist/index.js', format: 'es' },
      { file: 'dist/index.cjs', format: 'cjs' }
    ],
    plugins: [typescript()]
  },
  // 类型声明文件
  {
    input: 'src/index.ts',
    output: { file: 'dist/index.d.ts', format: 'es' },
    plugins: [dts()]
  }
]
```

## 完整配置示例

```javascript
import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import terser from '@rollup/plugin-terser'

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true
    },
    {
      file: 'dist/index.cjs',
      format: 'cjs',
      sourcemap: true
    },
    {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'MyLibrary',
      sourcemap: true
    }
  ],
  plugins: [
    resolve(),
    commonjs(),
    typescript(),
    terser()
  ],
  external: ['some-external-dependency']
}
```

## package.json 配置

```json
{
  "name": "my-library",
  "version": "1.0.0",
  "main": "dist/index.cjs",
  "module": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "rollup -c"
  }
}
```

## Tree Shaking

Rollup 的 Tree Shaking 非常高效：

```javascript
// 只导出需要的部分
export { functionA } from './module'

// 而不是
export * from './module'
```

## 常见问题

**Q: 如何排除 peerDependencies？**

```javascript
import pkg from './package.json'

export default {
  external: Object.keys(pkg.peerDependencies || {})
}
```

**Q: 如何处理 CSS 文件？**

使用 `rollup-plugin-postcss`：

```bash
pnpm add rollup-plugin-postcss -D
```
