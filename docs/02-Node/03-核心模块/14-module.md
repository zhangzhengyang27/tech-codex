---
title: module 模块系统
description: module 模块的导出引用、CommonJS 缓存与 ESM 互操作细节（建议配合 02-模块系统）
keywords: [Node.js, module, CommonJS, ESM]
category: Node.js
tags: [Node.js, 核心模块]
---







# module 模块系统

`module` 模块是 Node.js 模块系统的核心基础设施，实现了 CommonJS 规范的 `require()`、`module.exports`、模块缓存、路径解析等关键机制。通过该模块可以访问模块加载流程、查看和操作缓存、控制解析策略，并实现与 ES Module (`import/export`) 的协同工作。

```javascript
const moduleBuiltin = require("module")
```

## 模块系统概述

Node.js 模块系统基于 CommonJS 规范实现，每个文件被视为一个独立的模块，拥有独立的作用域。模块系统提供了以下核心能力：

| 特性             | 说明                                                           |
| ---------------- | -------------------------------------------------------------- |
| **封装性**       | 每个模块拥有独立的变量作用域，避免全局污染                     |
| **可复用性**     | 通过 `module.exports` 导出接口，`require()` 导入使用           |
| **缓存机制**     | 模块首次加载后缓存，后续引用复用同一实例                       |
| **路径解析**     | 支持相对路径、绝对路径、node_modules 搜索、内置模块等多种方式  |
| **动态加载**     | 运行时按需加载模块，支持条件导入                               |

### 模块类型对比

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Node.js 模块类型                              │
├─────────────────┬───────────────────────────────────────────────────┤
│ 内置模块         │ fs, http, path, crypto 等，编译进 Node.js 二进制  │
├─────────────────┼───────────────────────────────────────────────────┤
│ 文件模块         │ 项目中的 .js、.json、.node 文件                    │
├─────────────────┼───────────────────────────────────────────────────┤
│ 第三方模块       │ node_modules 中的包，通过 npm/yarn 安装            │
├─────────────────┼───────────────────────────────────────────────────┤
│ 核心模块         │ module 模块本身，提供模块系统的元编程能力           │
└─────────────────┴───────────────────────────────────────────────────┘
```

---

## 系统架构

### 模块加载流程图

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          require(modulePath)                             │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │      检查是否为内置模块          │
                    │   (fs, http, path, etc.)        │
                    └─────────────┬───────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
                    ▼                           ▼
            ┌───────────────┐           ┌───────────────┐
            │   是内置模块   │           │   非内置模块   │
            └───────┬───────┘           └───────┬───────┘
                    │                           │
                    │                           ▼
                    │             ┌─────────────────────────────────┐
                    │             │    检查 require.cache 缓存       │
                    │             └─────────────┬───────────────────┘
                    │                           │
                    │             ┌─────────────┴─────────────┐
                    │             │                           │
                    │             ▼                           ▼
                    │     ┌───────────────┐           ┌───────────────┐
                    │     │   缓存命中     │           │   缓存未命中   │
                    │     └───────┬───────┘           └───────┬───────┘
                    │             │                           │
                    │             │                           ▼
                    │             │             ┌─────────────────────────────────┐
                    │             │             │      解析模块路径                 │
                    │             │             │  Module._resolveFilename()       │
                    │             │             └─────────────┬───────────────────┘
                    │             │                           │
                    │             │                           ▼
                    │             │             ┌─────────────────────────────────┐
                    │             │             │      创建 Module 实例            │
                    │             │             │   new Module(id, parent)         │
                    │             │             └─────────────┬───────────────────┘
                    │             │                           │
                    │             │                           ▼
                    │             │             ┌─────────────────────────────────┐
                    │             │             │      读取文件内容                 │
                    │             │             │      fs.readFileSync()           │
                    │             │             └─────────────┬───────────────────┘
                    │             │                           │
                    │             │                           ▼
                    │             │             ┌─────────────────────────────────┐
                    │             │             │      模块包装                     │
                    │             │             │  wrapper(content)                │
                    │             │             └─────────────┬───────────────────┘
                    │             │                           │
                    │             │                           ▼
                    │             │             ┌─────────────────────────────────┐
                    │             │             │      编译执行                     │
                    │             │             │  vm.runInThisContext()           │
                    │             │             └─────────────┬───────────────────┘
                    │             │                           │
                    │             │                           ▼
                    │             │             ┌─────────────────────────────────┐
                    │             │             │      存入缓存                     │
                    │             │             │  require.cache[filename] = module│
                    │             │             └─────────────┬───────────────────┘
                    │             │                           │
                    └─────────────┴───────────────────────────┘
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │   返回 module.exports            │
                    └─────────────────────────────────┘
```

---

## 核心 API 详解

### module 对象属性

每个模块内部都可以访问 `module` 对象，代表当前模块的元信息：

| 属性                 | 类型         | 说明                                                           |
| -------------------- | ------------ | -------------------------------------------------------------- |
| `module.id`          | string       | 模块标识符，通常为绝对路径，入口模块为 `"."`                   |
| `module.filename`    | string       | 模块文件的绝对路径，与 `module.id` 常相同                      |
| `module.loaded`      | boolean      | 模块是否已完成加载（`false` 表示正在加载中）                   |
| `module.parent`      | Module\|null | 首次引入当前模块的父模块（已废弃，建议使用 `module.children`）  |
| `module.children`    | Module[]     | 当前模块直接依赖的子模块列表                                   |
| `module.paths`       | string[]     | 模块搜索路径数组，按优先级排序                                 |
| `module.exports`     | object       | 模块导出的对象，是 `require()` 返回值                          |
| `module.path`        | string       | 模块所在目录路径（Node.js 11.14.0+）                           |
| `module.isPreloading`| boolean      | 是否处于预加载阶段（Node.js 16.0.0+）                          |

### require 函数属性

`require` 函数本身挂载了多个实用属性：

| 属性/方法                | 说明                                                           |
| ------------------------ | -------------------------------------------------------------- |
| `require.cache`          | 对象，存储所有已加载模块，键为绝对路径                         |
| `require.main`           | 指向应用程序的入口模块                                         |
| `require.resolve()`      | 解析模块路径但不加载，返回绝对路径                             |
| `require.resolve.paths()`| 返回模块搜索路径数组                                           |
| `require.extensions`     | 对象，定义不同扩展名的加载处理函数（已废弃，仅用于扩展）       |

### 示例：查看模块完整信息

```javascript
// module-info.js
console.log("=== 当前模块信息 ===")
console.log("模块 ID:", module.id)
console.log("文件路径:", module.filename)
console.log("是否加载完成:", module.loaded)
console.log("父模块 ID:", module.parent?.filename || "无（入口模块）")
console.log("子模块数量:", module.children.length)
console.log("搜索路径:")
module.paths.forEach((p, i) => console.log(`  ${i + 1}. ${p}`))

console.log("\n=== 模块缓存统计 ===")
console.log("已缓存模块数量:", Object.keys(require.cache).length)
console.log("入口模块:", require.main?.filename || "无")
```

执行结果示例：

```
=== 当前模块信息 ===
模块 ID: .
文件路径: /path/to/project/module-info.js
是否加载完成: false
父模块 ID: 无（入口模块）
子模块数量: 0
搜索路径:
  1. /path/to/project/node_modules
  2. /path/to/node_modules
  3. /path/node_modules
  4. /node_modules

=== 模块缓存统计 ===
已缓存模块数量: 5
入口模块: /path/to/project/module-info.js
```

---

## 模块加载机制

### 模块包装器

Node.js 在执行模块代码前，会自动将其包装在一个函数中：

```javascript
(function (exports, require, module, __filename, __dirname) {
  // 模块代码实际在这里执行
  // 你的代码...
})
```

**包装器的作用**：

1. **作用域隔离**：模块内的变量不会污染全局作用域
2. **注入变量**：提供 `exports`、`require`、`module`、`__filename`、`__dirname` 等全局变量
3. **统一接口**：所有模块拥有相同的执行环境

### 验证包装器

```javascript
// wrapper-demo.js
console.log("arguments 数量:", arguments.length)
console.log("参数列表:", [
  "exports",
  "require", 
  "module", 
  "__filename", 
  "__dirname"
])

// 通过 eval 间接证明
const fn = eval(`(function() { return arguments.callee.toString() })()`)
console.log("\n函数体前 100 字符:", fn.substring(0, 100))
```

### 包装器的实现原理

```javascript
// Node.js 内部简化实现（伪代码）
const vm = require("vm")
const path = require("path")

function wrapModule(content, filename) {
  const wrapper = [
    "(function (exports, require, module, __filename, __dirname) { ",
    "\n})"
  ]
  const wrapped = wrapper[0] + content + wrapper[1]
  
  const dirname = path.dirname(filename)
  const moduleExports = {}
  const moduleObj = {
    exports: moduleExports,
    filename,
    loaded: false,
    id: filename
  }
  
  const compiledWrapper = vm.compileFunction(wrapped, [
    "exports", "require", "module", "__filename", "__dirname"
  ])
  
  compiledWrapper.call(
    moduleExports,
    moduleExports,
    createRequire(filename),
    moduleObj,
    filename,
    dirname
  )
  
  moduleObj.loaded = true
  return moduleObj.exports
}
```

---

## 缓存机制

### 缓存原理

模块首次加载后，Node.js 会将其 `Module` 实例存入 `require.cache`：

```javascript
// 缓存键：模块的绝对路径
// 缓存值：Module 对象实例
require.cache[absolutePath] = moduleInstance
```

### 缓存的优势

1. **性能提升**：避免重复的文件读取和编译
2. **状态共享**：同一模块多次 `require` 返回同一实例
3. **单例模式**：天然支持单例模式的实现

### 缓存示例：单例模式

```javascript
// singleton.js
let instance = null
let counter = 0

class Database {
  constructor() {
    if (instance) {
      return instance
    }
    counter++
    console.log(`创建数据库实例 #${counter}`)
    instance = this
  }
  
  query(sql) {
    return `执行查询: ${sql}`
  }
}

module.exports = Database

// test.js
const DB1 = require("./singleton")
const DB2 = require("./singleton")

console.log(DB1 === DB2) // true，同一实例
new DB1() // 不会再次创建
new DB2() // 不会再次创建
```

### 清除缓存

```javascript
// 清除单个模块缓存
const modulePath = require.resolve("./counter")
delete require.cache[modulePath]

// 清除所有模块缓存（谨慎使用）
Object.keys(require.cache).forEach(key => {
  delete require.cache[key]
})

// 清除特定模块及其依赖
function clearCacheRecursive(modulePath) {
  const mod = require.cache[modulePath]
  if (!mod) return
  
  // 递归清除子模块
  mod.children.forEach(child => {
    clearCacheRecursive(child.filename)
  })
  
  delete require.cache[modulePath]
}
```

### 缓存注意事项

```javascript
// cache-demo.js
// 模块状态会被保留
let state = 0
module.exports = {
  increment: () => ++state,
  getState: () => state
}

// app.js
const mod1 = require("./cache-demo")
console.log(mod1.increment()) // 1
console.log(mod1.increment()) // 2

// 清除缓存后重新加载
delete require.cache[require.resolve("./cache-demo")]

const mod2 = require("./cache-demo")
console.log(mod2.getState()) // 0，状态重置
console.log(mod2.increment()) // 1
```

---

## 路径解析规则

### 解析优先级

```
1. 内置模块（fs, http, path...）
     ↓
2. 相对路径（./module, ../module）
     ↓
3. 绝对路径（/path/to/module）
     ↓
4. node_modules 搜索（从当前目录向上遍历）
     ↓
5. 抛出 MODULE_NOT_FOUND 错误
```

### 解析流程图

```
require("lodash")
        │
        ▼
┌───────────────────────┐
│ 是否内置模块?          │ ─── 是 ──→ 返回内置模块
└───────────┬───────────┘
            │ 否
            ▼
┌───────────────────────┐
│ 是否以 ./ 或 ../ 开头? │ ─── 是 ──→ 相对路径解析
└───────────┬───────────┘            │
            │ 否                      ▼
            ▼                  解析为绝对路径
┌───────────────────────┐            │
│ 是否以 / 开头?         │ ─── 是 ──→│
└───────────┬───────────┘            │
            │ 否                      │
            ▼                         │
┌───────────────────────┐             │
│ 从当前目录开始向上     │             │
│ 遍历 node_modules     │◄────────────┘
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 在每个 node_modules   │
│ 中查找匹配项          │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐
│ 是否找到?             │ ─── 否 ──→ 继续向上查找
└───────────┬───────────┘            │
            │ 是                      │
            ▼                         │
┌───────────────────────┐             │
│ 解析 package.json     │             │
│ (main/exports 字段)   │             │
└───────────┬───────────┘             │
            │                         │
            ▼                         │
┌───────────────────────┐             │
│ 尝试文件扩展名        │             │
│ .js, .json, .node     │             │
└───────────┬───────────┘             │
            │                         │
            ▼                         │
┌───────────────────────┐             │
│ 找到文件?             │ ─── 否 ──→──┘
└───────────┬───────────┘
            │ 是
            ▼
      返回模块路径
```

### require.resolve 用法

```javascript
const path = require("path")

// 基本用法：解析模块路径
const lodashPath = require.resolve("lodash")
console.log(lodashPath)
// /path/to/project/node_modules/lodash/lodash.js

// 解析相对路径
const relativePath = require.resolve("./utils/helper")
console.log(relativePath)
// /path/to/project/utils/helper.js

// 使用选项
const customPath = require.resolve("./config", {
  paths: [
    path.resolve(__dirname, "config"),
    path.resolve(__dirname, "settings")
  ],
  extensions: [".js", ".json", ".yaml"]
})

// 获取模块搜索路径（不解析）
const searchPaths = require.resolve.paths("lodash")
console.log(searchPaths)
// ["/path/to/project/node_modules", "/path/to/node_modules", ...]
```

### module.paths 示例

```javascript
// 假设文件位于 /home/user/projects/myapp/src/lib/util.js
console.log(module.paths)
/*
[
  '/home/user/projects/myapp/src/lib/node_modules',
  '/home/user/projects/myapp/src/node_modules',
  '/home/user/projects/myapp/node_modules',
  '/home/user/projects/node_modules',
  '/home/user/node_modules',
  '/home/node_modules',
  '/node_modules'
]
*/
```

---

## 循环依赖处理

### 循环依赖的场景

```
模块 A ──require──→ 模块 B
   ↑                  │
   └────require───────┘
```

### 循环依赖的加载过程

```javascript
// a.js
console.log("a.js 开始加载")
exports.loaded = false

const b = require("./b")
console.log("a.js 中 b.loaded:", b.loaded)

exports.loaded = true
console.log("a.js 加载完成")

// b.js
console.log("b.js 开始加载")
exports.loaded = false

const a = require("./a")
console.log("b.js 中 a.loaded:", a.loaded)

exports.loaded = true
console.log("b.js 加载完成")

// main.js
console.log("=== 开始 ===")
const a = require("./a")
console.log("=== 结束 ===")
console.log("最终 a.loaded:", a.loaded)
```

**执行流程**：

```
=== 开始 ===
a.js 开始加载
b.js 开始加载
b.js 中 a.loaded: false      ← a 还未加载完成
b.js 加载完成
a.js 中 b.loaded: true
a.js 加载完成
=== 结束 ===
最终 a.loaded: true
```

### 循环依赖的解决方案

#### 方案 1：延迟导入

```javascript
// a.js
exports.doSomething = () => {
  const b = require("./b") // 在函数内部导入
  return b.calculate()
}

// b.js
exports.calculate = () => {
  return 42
}
```

#### 方案 2：重构模块结构

```javascript
// 将共享逻辑提取到独立模块
// shared.js
exports.sharedFunction = () => { /* ... */ }

// a.js
const shared = require("./shared")
// ...

// b.js
const shared = require("./shared")
// ...
```

#### 方案 3：使用 exports 而非 module.exports

```javascript
// a.js
exports.init = function() {
  const b = require("./b")
  b.doSomething()
}

// b.js
let a = null
exports.init = function() {
  a = require("./a")
}
exports.doSomething = function() {
  if (a) a.someMethod()
}
```

### 循环依赖检测工具

```javascript
// detect-circular.js
function detectCircular(entry) {
  const visited = new Set()
  const stack = []
  const circulars = []
  
  function visit(modulePath) {
    if (stack.includes(modulePath)) {
      circulars.push([...stack, modulePath])
      return
    }
    if (visited.has(modulePath)) return
    
    visited.add(modulePath)
    stack.push(modulePath)
    
    // 模拟加载（简化版）
    try {
      const mod = require(modulePath)
      // 实际项目中需要分析 AST 获取依赖
    } catch (e) {}
    
    stack.pop()
  }
  
  visit(entry)
  return circulars
}
```

---

## 目录模块加载

### 默认加载规则

当 `require()` 参数指向目录时，Node.js 会按以下顺序查找：

```
1. 目录/package.json 中的 "main" 字段
2. 目录/index.js
3. 目录/index.json
4. 目录/index.node
```

### 示例：目录模块结构

```
my-module/
├── package.json
├── index.js
├── lib/
│   └── core.js
└── README.md
```

```json
// my-module/package.json
{
  "name": "my-module",
  "version": "1.0.0",
  "main": "index.js"
}
```

```javascript
// 使用方式
const myModule = require("./my-module")
// 等价于
const myModule = require("./my-module/index.js")
```

### 自定义入口文件

```json
// package.json
{
  "name": "my-module",
  "main": "lib/main.js"  // 自定义入口
}
```

```javascript
// 现在会加载 lib/main.js
const myModule = require("./my-module")
```

### 使用 exports 字段（现代方式）

```json
// package.json
{
  "name": "my-module",
  "exports": {
    ".": "./lib/index.js",
    "./feature": "./lib/feature.js",
    "./utils": "./lib/utils.js"
  }
}
```

```javascript
const main = require("my-module")           // ./lib/index.js
const feature = require("my-module/feature") // ./lib/feature.js
const utils = require("my-module/utils")     // ./lib/utils.js
```

---

## CommonJS 与 ES Module 互操作

### 模块系统对比

```
┌────────────────────┬─────────────────────┬─────────────────────┐
│      特性          │     CommonJS        │     ES Module       │
├────────────────────┼─────────────────────┼─────────────────────┤
│ 导出语法           │ exports/module.exports │ export/export default│
│ 导入语法           │ require()           │ import              │
│ 加载时机           │ 运行时同步          │ 编译时静态分析       │
│ this 指向          │ module.exports      │ undefined           │
│ 是否可变绑定       │ 是（值拷贝）        │ 是（活绑定）        │
│ 顶层 await         │ 不支持              │ 支持                │
│ 文件扩展名         │ .js, .cjs           │ .mjs, .js(type:module)│
└────────────────────┴─────────────────────┴─────────────────────┘
```

### 在 CommonJS 中导入 ES Module

```javascript
// ⚠️ 传统上 CommonJS 不能直接 require ESM；自 Node.js 22.12.0 起，
// require() 可以直接加载「不含顶层 await」的 ESM 模块（require(esm)）
// const esm = require("./esm-module.mjs") // Node.js 22.12+ 可用

// 方式 1：使用动态 import()（返回 Promise）—— 兼容所有版本
async function loadEsm() {
  const esm = await import("./esm-module.mjs")
  return esm.default
}

// 方式 2：使用 createRequire
const { createRequire } = require("module")
const requireEsm = createRequire(import.meta.url) // 仅在 ESM 中可用
```

### 在 ES Module 中导入 CommonJS

```javascript
// 方式 1：直接 import（default 导出）
import cjsModule from "./cjs-module.cjs"
console.log(cjsModule.someFunction())

// 方式 2：命名空间导入
import * as cjsNamespace from "./cjs-module.cjs"

// 方式 3：使用 createRequire
import { createRequire } from "module"
const require = createRequire(import.meta.url)
const cjs = require("./cjs-module.cjs")
```

### createRequire 完整示例

```javascript
// 在 .mjs 文件中
import { createRequire } from "module"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 创建相对于当前文件的 require 函数
const require = createRequire(import.meta.url)

// 现在可以像 CommonJS 一样使用 require
const fs = require("fs")
const lodash = require("lodash")
const localConfig = require("./config.json")

console.log(localConfig)
```

### package.json 的 type 字段

```json
// package.json
{
  "name": "my-project",
  "type": "module"  // 所有 .js 文件视为 ESM
}
```

```json
// 或者使用 CommonJS（默认）
{
  "name": "my-project",
  "type": "commonjs"  // 可省略，默认值
}
```

**扩展名优先级**：

```
type: "module" 时：
  .js   → ESM
  .cjs  → CommonJS
  .mjs  → ESM

type: "commonjs"（默认）时：
  .js   → CommonJS
  .cjs  → CommonJS
  .mjs  → ESM
```

---

## 高级 API

### Module 构造函数

`module` 内置模块导出了 `Module` 构造函数，可用于高级场景：

```javascript
const Module = require("module")

// 创建新模块实例
const mod = new Module("/path/to/file.js", null)
mod.filename = "/path/to/file.js"
mod.paths = Module._nodeModulePaths("/path/to")
```

### Module 静态属性

| 属性                       | 说明                                        |
| -------------------------- | ------------------------------------------- |
| `Module.builtinModules`    | 内置模块名称数组                            |
| `Module.globalPaths`       | 全局模块搜索路径                            |
| `Module._extensions`       | 扩展名处理函数映射                          |
| `Module._cache`            | 模块缓存（等同于 require.cache）            |
| `Module._pathCache`        | 路径解析缓存                                |
| `Module._nodeModulePaths()`| 获取 node_modules 搜索路径                  |

### 自定义扩展名加载器

```javascript
const Module = require("module")
const fs = require("fs")

// 为 .txt 文件添加加载器
Module._extensions[".txt"] = (module, filename) => {
  const content = fs.readFileSync(filename, "utf8")
  // 将文本转为大写并导出
  module.exports = {
    raw: content,
    upper: content.toUpperCase(),
    lines: content.split("\n")
  }
}

// 为 .yaml 文件添加加载器
Module._extensions[".yaml"] = (module, filename) => {
  const yaml = require("js-yaml") // 需要安装
  const content = fs.readFileSync(filename, "utf8")
  module.exports = yaml.load(content)
}

// 使用自定义加载器
const text = require("./data.txt")
console.log(text.upper)

const config = require("./config.yaml")
console.log(config)
```

### Module.builtinModules 使用

```javascript
const { builtinModules } = require("module")

// 过滤可用的内置模块
const coreModules = builtinModules.filter(name => !name.startsWith("_"))

console.log(`Node.js 内置模块数量: ${coreModules.length}`)
console.log("前 10 个:", coreModules.slice(0, 10))

// 检查模块是否为内置模块
// （Node.js 18.6+ 可直接使用 require("module").isBuiltin(name)）
function isBuiltin(name) {
  const normalizedName = name.startsWith("node:") 
    ? name.slice(5) 
    : name
  return builtinModules.includes(normalizedName)
}

console.log(isBuiltin("fs"))        // true
console.log(isBuiltin("node:fs"))   // true
console.log(isBuiltin("lodash"))    // false
```

### 运行时代码编译

```javascript
const Module = require("module")
const vm = require("vm")
const path = require("path")

function loadFromMemory(code, filename) {
  const m = new Module(filename, module.parent)
  m.filename = filename
  m.paths = Module._nodeModulePaths(path.dirname(filename))
  m._compile(code, filename)
  return m.exports
}

// 从内存加载模块
const code = `
  const greeting = "Hello"
  module.exports = {
    say: (name) => \`\${greeting}, \${name}!\`
  }
`

const mod = loadFromMemory(code, "/virtual/module.js")
console.log(mod.say("World")) // Hello, World!
```

### 模块预加载

```javascript
// preload.js
const Module = require("module")

// 预加载特定模块
const preloadModules = ["fs", "path", "http"]

preloadModules.forEach(name => {
  if (!Module._cache[require.resolve(name)]) {
    require(name)
  }
})

console.log("预加载完成")
```

---

## 错误处理与调试

### 常见错误类型

| 错误代码                  | 原因                        | 解决方案                          |
| ------------------------- | --------------------------- | --------------------------------- |
| `MODULE_NOT_FOUND`        | 模块不存在                  | 检查路径、安装依赖                |
| `INVALID_PACKAGE_CONFIG`  | package.json 格式错误       | 验证 JSON 格式                    |
| `INVALID_PACKAGE_TARGET`  | exports 字段配置错误        | 检查 exports 配置                 |
| 导出为 `undefined`        | 循环依赖导致部分导出未完成  | 重构模块结构                      |
| `ERR_REQUIRE_ESM`         | CommonJS 中 require ESM     | 使用 import() 或 createRequire（Node.js 22.12+ 可直接 require 无顶层 await 的 ESM） |

### 错误处理示例

```javascript
// 安全加载模块
function safeRequire(modulePath) {
  try {
    return require(modulePath)
  } catch (error) {
    if (error.code === "MODULE_NOT_FOUND") {
      console.error(`模块未找到: ${modulePath}`)
      console.error("搜索路径:", require.resolve.paths(modulePath))
      return null
    }
    if (error.code === "ERR_REQUIRE_ESM") {
      console.error(`模块 ${modulePath} 是 ES Module，请使用 import()`)
      // 返回 Promise 版本
      return import(modulePath)
    }
    throw error
  }
}

// 使用
const lodash = safeRequire("lodash")
if (lodash) {
  console.log("加载成功")
}
```

### 调试模块加载

```javascript
// 使用 NODE_DEBUG 环境变量
// NODE_DEBUG=module node app.js

// 或在代码中启用
const Module = require("module")

// 保存原始 _load 方法
const originalLoad = Module._load

Module._load = function(request, parent, isMain) {
  console.log(`[模块加载] ${request}`)
  console.log(`  父模块: ${parent?.filename || "无"}`)
  console.log(`  是否入口: ${isMain}`)
  
  const result = originalLoad.apply(this, arguments)
  
  console.log(`  导出类型: ${typeof result}`)
  return result
}

// 加载模块
require("./my-module")
```

### 路径解析调试

```javascript
function debugResolve(modulePath, fromPath = __dirname) {
  console.log(`\n解析模块: ${modulePath}`)
  console.log(`从目录: ${fromPath}`)
  console.log(`\n搜索路径:`)
  
  const paths = require.resolve.paths(modulePath) || []
  paths.forEach((p, i) => {
    const exists = require("fs").existsSync(p)
    console.log(`  ${i + 1}. ${p} ${exists ? "✓" : "✗"}`)
  })
  
  try {
    const resolved = require.resolve(modulePath, {
      paths: [fromPath]
    })
    console.log(`\n解析结果: ${resolved}`)
    return resolved
  } catch (e) {
    console.log(`\n解析失败: ${e.message}`)
    return null
  }
}

debugResolve("lodash")
debugResolve("./missing-module")
```

---

## 性能优化

### 模块加载性能

```javascript
// 1. 延迟加载重型模块
let heavyModule = null
function getHeavyModule() {
  if (!heavyModule) {
    heavyModule = require("heavy-module")
  }
  return heavyModule
}

// 2. 条件加载
const config = require("./config")
if (config.features.logger) {
  require("./logger").init()
}

// 3. 预编译正则表达式
const patterns = {
  email: /^[\w.-]+@[\w.-]+\.\w+$/,
  phone: /^\d{11}$/
}
module.exports = patterns

// 4. 缓存计算结果
const cache = new Map()
function expensiveOperation(key) {
  if (cache.has(key)) {
    return cache.get(key)
  }
  const result = JSON.stringify(key).length // 复杂计算（示意）
  cache.set(key, result)
  return result
}
```

### 减少模块数量

```javascript
// 不推荐：过多小文件
// utils/
//   ├── capitalize.js
//   ├── lowercase.js
//   └── trim.js

// 推荐：合并相关功能
// utils/
//   └── string.js  // 包含所有字符串工具

// utils/string.js
exports.capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1)
exports.lowercase = (str) => str.toLowerCase()
exports.trim = (str) => str.trim()
```

### 缓存策略

```javascript
// 利用缓存实现配置单例
// config.js
let config = null

function loadConfig() {
  if (!config) {
    const fs = require("fs")
    const path = require("path")
    config = JSON.parse(
      fs.readFileSync(path.join(__dirname, "config.json"), "utf8")
    )
  }
  return config
}

module.exports = loadConfig()

// 或使用懒加载
module.exports = {
  get config() {
    if (!this._config) {
      this._config = loadConfig()
    }
    return this._config
  }
}
```

---

## 安全注意事项

### 避免动态路径拼接

```javascript
// 危险：用户输入直接拼接到 require 路径
function loadUserModule(userInput) {
  return require(`./modules/${userInput}`) // 危险！
}

// 安全：白名单验证
const ALLOWED_MODULES = ["utils", "helper", "validator"]

function loadUserModule(userInput) {
  if (!ALLOWED_MODULES.includes(userInput)) {
    throw new Error("非法模块名称")
  }
  return require(`./modules/${userInput}`)
}
```

### 防止原型污染

```javascript
// 危险：导出对象可能被修改
module.exports = {}

// 安全：使用 Object.freeze
module.exports = Object.freeze({
  version: "1.0.0",
  config: Object.freeze({
    maxItems: 100
  })
})

// 或使用类
class SecureModule {
  #privateData = "secret"
  
  getPublicData() {
    return "public"
  }
}

module.exports = Object.freeze(new SecureModule())
```

### 安全的模块加载

```javascript
const Module = require("module")
const path = require("path")

function safeRequire(modulePath, allowedBase) {
  // 解析为绝对路径
  const resolved = path.resolve(modulePath)
  
  // 检查是否在允许的目录内
  const normalizedBase = path.resolve(allowedBase)
  if (!resolved.startsWith(normalizedBase)) {
    throw new Error("模块路径不在允许的目录内")
  }
  
  // 检查路径遍历攻击
  const normalized = path.normalize(resolved)
  if (normalized.includes("..")) {
    throw new Error("检测到路径遍历攻击")
  }
  
  return require(resolved)
}
```

---

## 常见问题解答

### Q1: exports 和 module.exports 的区别？

```javascript
// exports 是 module.exports 的引用
// 初始时：exports === module.exports

// 正确：添加属性
exports.a = 1        // module.exports.a = 1
module.exports.b = 2 // exports.b = 2

// 错误：重新赋值 exports
exports = { a: 1 }   // exports 指向新对象，module.exports 未变

// 正确：重新赋值 module.exports
module.exports = { a: 1 } // require() 返回 { a: 1 }
```

### Q2: 如何判断模块是否是入口文件？

```javascript
// 方式 1：require.main
if (require.main === module) {
  console.log("当前文件是入口模块")
  // 直接运行此文件
}

// 方式 2：require.main.filename
if (require.main?.filename === __filename) {
  console.log("当前文件是入口模块")
}

// 实际应用
if (require.main === module) {
  // 执行测试或 CLI
  runTests()
}
```

### Q3: 如何动态加载模块？

```javascript
// CommonJS 方式
function loadModule(name) {
  try {
    return require(name)
  } catch (e) {
    console.error(`加载模块 ${name} 失败`)
    return null
  }
}

// ES Module 方式（推荐）
async function loadModuleAsync(name) {
  try {
    return await import(name)
  } catch (e) {
    console.error(`加载模块 ${name} 失败`)
    return null
  }
}

// 按环境加载
const logger = process.env.NODE_ENV === "production"
  ? require("./logger/production")
  : require("./logger/development")
```

### Q4: 如何清除模块缓存并重新加载？

```javascript
function reloadModule(modulePath) {
  const absolutePath = require.resolve(modulePath)
  
  // 清除缓存
  delete require.cache[absolutePath]
  
  // 重新加载
  return require(modulePath)
}

// 清除模块及其依赖
function deepReload(modulePath) {
  const absolutePath = require.resolve(modulePath)
  const mod = require.cache[absolutePath]
  
  if (mod) {
    // 递归清除子模块
    mod.children.forEach(child => {
      deepReload(child.filename)
    })
    delete require.cache[absolutePath]
  }
  
  return require(modulePath)
}
```

### Q5: require 和 import 的主要区别？

| 特性              | require (CommonJS)    | import (ES Module)    |
| ----------------- | --------------------- | --------------------- |
| 加载时机          | 运行时同步            | 编译时静态            |
| 是否可动态路径    | 是                    | 否（需用 import()）   |
| 返回值            | module.exports 的拷贝 | 活绑定（引用）        |
| 顶层 await        | 不支持                | 支持                  |
| 循环依赖处理      | 返回部分导出          | 静态分析可检测        |
| Tree Shaking      | 不支持                | 支持                  |

### Q6: 如何检测模块加载时间？

```javascript
// 方式 1：使用 console.time
console.time("加载 lodash")
const _ = require("lodash")
console.timeEnd("加载 lodash")

// 方式 2：性能 API
const start = performance.now()
const mod = require("heavy-module")
const duration = performance.now() - start
console.log(`加载耗时: ${duration.toFixed(2)}ms`)

// 方式 3：全局监控
const Module = require("module")
const loadTimes = new Map()

const originalLoad = Module._load
Module._load = function(request, parent, isMain) {
  const start = Date.now()
  const result = originalLoad.apply(this, arguments)
  const duration = Date.now() - start
  
  loadTimes.set(request, duration)
  return result
}

// 输出统计
process.on("exit", () => {
  console.log("\n模块加载统计:")
  const sorted = [...loadTimes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  
  sorted.forEach(([name, time]) => {
    console.log(`  ${name}: ${time}ms`)
  })
})
```

---

## 最佳实践

### 导出模式

```javascript
// 1. 导出单一功能（推荐用于工具函数）
module.exports = function add(a, b) {
  return a + b
}

// 2. 导出对象（推荐用于多个相关功能）
module.exports = {
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  mul: (a, b) => a * b
}

// 3. 导出类（推荐用于面向对象设计）
class Calculator {
  constructor(initial = 0) {
    this.value = initial
  }
  
  add(n) {
    this.value += n
    return this
  }
}

module.exports = Calculator

// 4. 命名导出 + 默认导出
module.exports = {
  version: "1.0.0",
  utils: { /* ... */ }
}
module.exports.default = Calculator
```

### 模块组织结构

```
project/
├── src/
│   ├── index.js          # 入口文件
│   ├── config/           # 配置模块
│   │   ├── index.js
│   │   └── default.js
│   ├── utils/            # 工具模块
│   │   ├── index.js      # 统一导出
│   │   ├── string.js
│   │   └── array.js
│   └── services/         # 业务模块
│       ├── index.js
│       └── user.js
├── test/
└── package.json
```

### 编码规范

```javascript
// 1. 使用 node: 前缀明确引用内置模块
const fs = require("node:fs")
const path = require("node:path")

// 2. 模块顶部声明业务依赖
const _ = require("lodash")
const localUtils = require("./utils")

// 3. 导出在文件末尾（或使用命名导出）
module.exports = {
  // public API
}

// 4. 私有变量用 let/const 声明
const privateConstant = "internal"
let privateState = 0

// 5. 提供清晰的文档注释
/**
 * 计算两个数的和
 * @param {number} a - 第一个数
 * @param {number} b - 第二个数
 * @returns {number} 两数之和
 */
exports.add = (a, b) => a + b
```

### 其他建议

1. **避免深层嵌套的目录结构**：保持模块路径简洁
2. **使用 package.json 的 exports 字段**：明确模块入口
3. **编写单元测试**：确保模块功能正确
4. **使用 TypeScript 或 JSDoc**：提供类型信息
5. **遵循单一职责原则**：每个模块只做一件事
6. **合理使用缓存**：利用模块缓存优化性能
7. **处理循环依赖**：及时重构避免复杂的循环依赖
8. **统一模块系统**：项目中选择 CommonJS 或 ESM，避免混用

---

## 参考资料

- [Node.js Module API 文档](https://nodejs.org/api/module.html)
- [CommonJS 规范](https://www.commonjs.org/)
- [ECMAScript Modules](https://nodejs.org/api/esm.html)
- [Node.js 模块加载机制源码](https://github.com/nodejs/node/blob/main/lib/internal/modules/cjs/loader.js)
