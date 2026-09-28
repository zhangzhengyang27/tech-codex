---
title: "Rollup打包工具详解"
description: Rollup 打包工具的核心特性、配置与适用场景
keywords: [Rollup, 打包工具, 库打包]
category: 前端工程化
---

# Rollup打包工具详解

## 一、概述

Rollup 是一款以 ES Module 为基础的 JavaScript 模块打包器，以产物纯净、Tree Shaking 效果好著称，是库/组件开发的主流选择，也是 Vite 生产环境打包的底层引擎。本文覆盖其核心特点、配置、插件体系与实战。

## 二、Rollup 核心特点

### 2.1 定义

> Rollup 是一个 JavaScript 模块打包器，可以将小块代码编译成大块复杂代码。

**适用场景：**

```
 JavaScript 库打包
 组件库开发
 工具函数库
 框架核心代码打包
```

### 2.2 与 Webpack 的核心区别

| 维度             | Rollup               | Webpack        |
| ---------------- | -------------------- | -------------- |
| **模块规范**     | ES6 模块优先         | CommonJS 优先  |
| **配置语法**     | ES Module 导出       | CommonJS 导出  |
| **Tree Shaking** | 原生支持，效果更好   | 支持，但需配置 |
| **代码产物**     | 更纯净，无运行时代码 | 包含运行时代码 |
| **适用场景**     | 库开发               | 应用开发       |
| **开发服务器**   | 功能较弱             | 功能强大       |

### 2.3 ES Module vs CommonJS

**Rollup 使用 ES6 模块的优势：**

```
┌─────────────────────────────────────────┐
│ ES Module 的优势                         │
├─────────────────────────────────────────┤
│ 1. 官方标准，JavaScript 发展方向         │
│ 2. 支持静态分析，优化 Tree Shaking       │
│ 3. 按需引入/导出，更灵活                 │
│ 4. 循环引用处理更好                      │
│ 5. 动态绑定支持                          │
└─────────────────────────────────────────┘
```

**使用对比：**

```javascript
// ES Module（Rollup 推荐）
import { say } from "my-library"
say("hello")

// CommonJS（Webpack 默认）
const { say } = require("my-library")
say("hello")
```

### 2.4 Tree Shaking 详解

**概念：**

> Tree Shaking 用于清除无用的代码，类似"按需加载"的概念。

**原理：**

```
ES Module 静态分析
    ↓
确定哪些代码被使用
    ↓
删除未使用的代码
    ↓
输出更小的 Bundle
```

**示例：**

```javascript
// utils.js
export function funcA() {
  /* 使用 */
}
export function funcB() {
  /* 未使用 */
}
export function funcC() {
  /* 未使用 */
}

// main.js
import { funcA } from "./utils"
funcA()

// 打包后：funcB、funcC 被删除
```

---

## 三、Rollup 核心概念

### 3.1 与 Webpack 概念对比

| 概念     | Rollup             | Webpack             |
| -------- | ------------------ | ------------------- |
| 入口     | `input`            | `entry`             |
| 输出     | `output`           | `output`            |
| 插件     | `plugins`          | `plugins`           |
| 配置文件 | `rollup.config.js` | `webpack.config.js` |

### 3.2 配置文件核心属性

**官方文档：**

```
https://rollupjs.org/
```

**配置项分类：**

```
核心配置（Core）：
├── input（入口）
├── output（输出）← 必填
├── plugins（插件）
└── external（外部依赖）

高级配置（Advanced）：
├── cache（缓存）
├── onwarn（警告处理）
├── preserveEntrySignatures（入口签名）
└── strictDeprecations（严格弃用）

危险区域（Danger Zone）：
├── treeshake（Tree Shaking 配置）
├── context（上下文）
└── moduleContext（模块上下文）

实验性（Experimental）：
└── output.experimentalMinChunkSize
```

### 3.3 学习路径建议

```
第一步：核心配置（必须）
├── input
├── output
└── plugins

第二步：高级配置
├── external
├── cache
└── 其他优化配置

第三步：进阶实践
├── 编写自定义插件
└── 复杂场景配置
```

---

## 四、Rollup 安装与基本使用

### 4.1 安装方式

**方式一：项目安装（推荐）**

```bash
# 初始化项目
mkdir rollup-demo
cd rollup-demo
npm init

# 安装 Rollup
npm install -D rollup

# 使用
npx rollup
```

**方式二：全局安装**

```bash
npm install -g rollup

# 使用
rollup
```



### 4.2 注意事项

**项目命名陷阱：**

```bash
❌ 错误示例：
mkdir rollup           # 项目名与包名冲突
npm init -y            # package.json 中 name: "rollup"
npm install -D rollup  # 安装失败！

✅ 正确示例：
mkdir rollup-demo      # 项目名避免与包名冲突
npm init               # 手动指定 package name
npm install -D rollup  # 安装成功
```

### 4.3 命令行选项

```bash
npx rollup --help
```

**常用命令：**

| 命令              | 说明            |
| ----------------- | --------------- |
| `-c, --config`    | 指定配置文件    |
| `-i, --input`     | 入口文件        |
| `-o, --file`      | 输出文件        |
| `-f, --format`    | 输出格式        |
| `-w, --watch`     | 监听模式        |
| `-m, --sourcemap` | 生成 Source Map |
| `-v, --version`   | 显示版本号      |

---

## 五、Rollup 实战：基础打包

### 5.1 项目结构

```
rollup-demo/
├── src/
│   ├── main.js
│   └── c.js
├── dist/
├── package.json
└── rollup.config.js
```

### 5.2 创建源文件

**src/c.js：**

```javascript
export default function say(name) {
  console.log(name)
}
```

**src/main.js：**

```javascript
import say from "./c.js"
say("hello rollup")
```

### 5.3 命令行打包

**打包为 CommonJS 格式：**

```bash
npx rollup src/main.js -f cjs -o dist/bundle.js
```

**打包为 ES Module 格式：**

```bash
npx rollup src/main.js -f es -o dist/bundle.es.js
```

### 5.4 输出格式说明

| 格式      | 参数     | 说明                    |
| --------- | -------- | ----------------------- |
| CommonJS  | `cjs`    | Node.js 环境            |
| ES Module | `es`     | 现代浏览器/打包工具     |
| AMD       | `amd`    | RequireJS 等            |
| UMD       | `umd`    | 通用格式（浏览器+Node） |
| IIFE      | `iife`   | 立即执行函数            |
| System    | `system` | SystemJS 加载器         |

### 5.5 打包产物分析

**CommonJS 格式输出：**

```javascript
"use strict"

// 标记已编译的 ES 模块
Object.defineProperty(exports, "__esModule", { value: true })

// 导出函数
function say(name) {
  console.log(name)
}

exports["default"] = say
```

**关键代码说明：**

```javascript
Object.defineProperty(exports, "__esModule", { value: true })
// 这行代码的作用：标记当前文件是已编译的 ES 模块
```

### 5.6 测试打包结果

```javascript
// dist/test.js
const say = require('./bundle.js');
say('hello rollup');

// 执行
node dist/test.js
// 输出：hello rollup
```

---

## 六、Rollup 配置文件详解

### 6.1 基础配置

**rollup.config.js：**

```javascript
export default {
  input: "src/main.js",
  output: {
    file: "dist/bundle.js",
    format: "cjs"
  }
}
```

**package.json：**

```json
{
  "scripts": {
    "build": "rollup -c"
  }
}
```

### 6.2 多输出配置

**方式一：数组形式**

```javascript
export default [
  {
    input: "src/main.js",
    output: {
      file: "dist/bundle.js",
      format: "cjs"
    }
  },
  {
    input: "src/main.js",
    output: {
      file: "dist/bundle.es.js",
      format: "es"
    }
  }
]
```

**方式二：单入口多输出**

```javascript
export default {
  input: "src/main.js",
  output: [
    {
      file: "dist/bundle.js",
      format: "cjs"
    },
    {
      file: "dist/bundle.es.js",
      format: "es"
    }
  ]
}
```

**执行打包：**

```bash
npm run build
# 或
npx rollup -c
```

---

## 七、Rollup 插件使用



### 7.1 插件资源

**官方插件列表：**

```
https://github.com/rollup/awesome
```

**常用插件：**

| 插件                          | 作用                       |
| ----------------------------- | -------------------------- |
| `@rollup/plugin-node-resolve` | 解析 node_modules 中的模块 |
| `@rollup/plugin-commonjs`     | 转换 CommonJS 为 ES Module |
| `@rollup/plugin-babel`        | Babel 编译                 |
| `@rollup/plugin-typescript`   | TypeScript 支持            |
| `@rollup/plugin-terser`       | 代码压缩                   |
| `@rollup/plugin-json`         | JSON 文件导入              |
| `@rollup/plugin-url`          | 处理文件资源               |

### 7.2 插件实战：代码压缩

**安装插件：**

```bash
npm install -D @rollup/plugin-terser
```

**配置使用：**

```javascript
import terser from "@rollup/plugin-terser"

export default {
  input: "src/main.js",
  output: [
    {
      file: "dist/bundle.js",
      format: "cjs"
    },
    {
      file: "dist/bundle.es.js",
      format: "es"
    }
  ],
  plugins: [terser()]
}
```

**打包效果：**

```javascript
// 压缩前
function say(name) {
  console.log(name)
}
exports["default"] = say

// 压缩后
;("use strict")
function e(o) {
  console.log(o)
}
exports.default = e
```

### 7.3 插件执行顺序

**重要规则：顺序引用，顺序执行**

```javascript
plugins: [
  pluginA(), // 第 1 个执行
  pluginB(), // 第 2 个执行
  pluginC() // 第 3 个执行
]

// 与 Webpack 的区别：
// Webpack：插件通过 tapable 钩子介入构建生命周期，执行时机由钩子类型决定，
//          并不存在"逆序执行"规则（"从右往左/从下往上"仅适用于 Loader）
// Rollup：按配置顺序依次执行
```

**对比总结：**

| 工具    | 插件执行顺序                                       |
| ------- | -------------------------------------------------- |
| Webpack | 由 tapable 钩子机制决定（tap 参与构建生命周期）    |
| Rollup  | 按配置顺序依次执行                                 |

---

## 八、进阶：阅读 Vue 源码配置

### 8.1 Vue 源码配置参考

**GitHub 仓库：**

```
https://github.com/vuejs/core
```

**配置文件：**

```
rollup.config.js
```

### 8.2 Vue 配置要点

```javascript
// Vue 3 打包输出的格式（简化示意，详见 rollup.config.js）
output: [
  { format: 'cjs' },      // CommonJS（Node 使用）
  { format: 'es' },       // ES Module（打包器使用，esm-bundler）
  { format: 'es' },       // 浏览器 ES Module（esm-browser）
  { format: 'iife' },     // 全局变量版（global）
]

// 核心配置
{
  input: 'src/index.ts',
  external: ['...'],      // 外部依赖
  plugins: [/* ... */],   // 插件列表
}
```

### 8.3 调试技巧

**方式一：直接调试**

```bash
npx rollup -c --watch
```

**方式二：VS Code 断点调试**

```
1. 打开配置文件
2. 设置断点
3. 使用调试模式运行
4. 查看变量和执行流程
```

---

## 九、Rollup vs Webpack 深度对比

### 9.1 功能对比

| 维度             | Rollup             | Webpack          |
| ---------------- | ------------------ | ---------------- |
| **定位**         | 库打包工具         | 应用打包工具     |
| **模块规范**     | ES Module 优先     | CommonJS 优先    |
| **Tree Shaking** | 原生支持，效果最佳 | 默认支持（生产模式，需 ESM），效果略逊 |
| **代码分割**     | 支持但功能有限     | 功能强大         |
| **HMR**          | 无原生支持         | 功能强大         |
| **配置复杂度**   | 简单               | 复杂             |
| **生态**         | 库开发生态完善     | 应用开发生态完善 |
| **学习曲线**     | 平缓               | 陡峭             |

### 9.2 选择建议

```
选择 Rollup：
├── 开发 npm 库
├── 开发组件库
├── 开发工具函数库
├── 需要纯净的输出产物
└── 对 Tree Shaking 要求高

选择 Webpack：
├── 开发复杂 SPA 应用
├── 需要强大的开发服务器
├── 需要代码分割和懒加载
├── 需要丰富的 Loader 生态
└── 企业级应用开发
```

### 9.3 Vite 的选择

**Vite 的架构：**

```
开发环境：原生 ESM + esbuild
生产环境：Rollup 打包
```

**为什么生产环境用 Rollup？**

- 代码产物更纯净
- Tree Shaking 效果更好
- 库打包生态成熟
- 配置更简洁

---



## 十、最佳实践总结

### 10.1 配置模板

**库开发标准配置：**

```javascript
import resolve from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"
import typescript from "@rollup/plugin-typescript"
import terser from "@rollup/plugin-terser"

export default {
  input: "src/index.ts",
  output: [
    {
      file: "dist/index.cjs.js",
      format: "cjs",
      sourcemap: true
    },
    {
      file: "dist/index.esm.js",
      format: "esm",
      sourcemap: true
    },
    {
      file: "dist/index.umd.js",
      format: "umd",
      name: "MyLibrary",
      sourcemap: true
    }
  ],
  external: ["lodash"],
  plugins: [resolve(), commonjs(), typescript(), terser()]
}
```

### 10.2 package.json 配置

```json
{
  "name": "my-library",
  "version": "1.0.0",
  "main": "dist/index.cjs.js",
  "module": "dist/index.esm.js",
  "browser": "dist/index.umd.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w"
  }
}
```

---

## 十一、常见问题与解决方案

| 问题                    | 原因                 | 解决方案                           |
| ----------------------- | -------------------- | ---------------------------------- |
| 安装 Rollup 失败        | 项目名与包名冲突     | 重命名项目目录                     |
| 打包后代码未压缩        | 未配置压缩插件       | 使用 `@rollup/plugin-terser`       |
| CommonJS 模块导入失败   | 未配置 commonjs 插件 | 使用 `@rollup/plugin-commonjs`     |
| node_modules 模块找不到 | 未配置 resolve 插件  | 使用 `@rollup/plugin-node-resolve` |
| 插件执行顺序不对        | 不了解执行规则       | 记住"顺序执行"                     |
| Tree Shaking 不生效     | 使用了 CommonJS 格式 | 使用 ES Module 格式                |

---

## 十二、学习要点总结

1. **Rollup 是 Vue 核心库的打包工具**  
   Vue 1.0 开始核心库就用 Rollup，Vite 生产环境也用 Rollup

2. **ES Module 是 Rollup 的核心优势**  
   原生支持 ES Module，Tree Shaking 效果最佳

3. **Rollup 适合库开发**  
   输出纯净、配置简单、生态完善

4. **插件机制与 Webpack 不同**  
   Rollup 按配置顺序执行；Webpack 通过 tapable 钩子介入构建流程（逆序规则仅适用于 Loader）

5. **学习路径：核心配置 → 高级配置 → 进阶实践**  
   先掌握 input、output、plugins，再扩展其他

---

## 十三、延伸学习资源

### 官方资源

- [Rollup 官方文档](https://rollupjs.org/)
- [Rollup 中文文档](https://cn.rollupjs.org/)
- [Rollup Awesome](https://github.com/rollup/awesome)

### 插件资源

- [@rollup/plugin-node-resolve](https://github.com/rollup/plugins/tree/master/packages/node-resolve)
- [@rollup/plugin-commonjs](https://github.com/rollup/plugins/tree/master/packages/commonjs)
- [@rollup/plugin-terser](https://github.com/rollup/plugins/tree/master/packages/terser)

### 源码学习

- [Vue 3 源码](https://github.com/vuejs/core)
- [Vue 3 rollup.config.js](https://github.com/vuejs/core/blob/main/rollup.config.js)

---

## 十四、思考题

1. **为什么 Vue 核心库选择 Rollup 而不是 Webpack 进行打包？**

2. **Rollup 的 Tree Shaking 为什么比 Webpack 效果更好？**

3. **什么情况下应该选择 Rollup，什么情况下应该选择 Webpack？**

4. **Rollup 插件按配置顺序执行，与 Webpack 的钩子机制相比各有什么特点？**

5. **如何使用 Rollup 打包一个同时支持 CommonJS 和 ES Module 的库？**

