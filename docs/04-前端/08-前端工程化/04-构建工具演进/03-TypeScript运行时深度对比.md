---
title: "TypeScript运行时深度对比"
description: 对比 Node.js / Deno / Bun 等 TypeScript 运行时的性能与生态
keywords: [TypeScript, 运行时, Node.js, Deno, Bun]
category: 前端工程化
---

# TypeScript运行时深度对比

## 一、传统方式 vs 运行时

#### 方式一：手动编译（传统方式）

```bash
# 1. 编写 TS 代码
# index.ts
const a: number = 10
console.log(a + 5)

# 2. 手动编译
tsc index.ts

# 3. 执行编译后的 JS 文件
node index.js
```

**痛点：**
- 每次修改都需要重新编译
- 开发效率低下
- 调试流程繁琐

---

#### 方式二：ts-node

```bash
# 1. 初始化配置
tsc --init

# 2. 配置 tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020"
  }
}

# 3. 执行 TS 文件
ts-node index.ts
```

**痛点：**
- 需要初始化配置文件
- 配置复杂，学习成本高
- 仍有性能瓶颈

---

#### 方式三：TSX（零配置运行时）

```bash
# 直接执行，无需配置
tsx index.ts

# 输出：15
```

**优势：**
- 零配置，开箱即用
- 极速执行
- 开发体验极佳

---

## 二、主流 TypeScript 运行时对比

### 2.1 npm 下载量排名（2023 年）

```
排名  运行时       下载量趋势               主要应用场景
1⃣   ts-node     ████████████████       TypeScript 官方生态
2⃣   esbuild    ████████████           Vite 依赖预构建引擎
3⃣   JITI        ████████               Nuxt 3/Unbuild
4⃣   SWC         ██████                 Next.js/Turbopack
5⃣   TSX         ███                    新兴零配置工具
```

---

### 2.2 GitHub Star 数量

| 工具 | Star 数量 | 发布时间 | 语言 | 状态 |
|------|----------|---------|------|------|
| ts-node | 12k+ | 2015年 | TypeScript | 稳定 |
| esbuild | 37k+ | 2020年 | Go | 活跃 |
| JITI | 1k+ | 2021年 | TypeScript | 活跃 |
| SWC | 30k+ | 2019年 | Rust | 活跃 |
| TSX | 4k+ | 2021年 | TypeScript | 活跃 |

---



### 2.3 各运行时详细分析

#### 1. ts-node - 官方生态代表

**基本信息：**
- 发布时间：2015 年
- Star 数量：12k+
- 编译器：TypeScript Compiler (tsc)

**核心特性：**
```typescript
// 直接执行 TypeScript 代码
ts-node script.ts

// REPL 交互模式
ts-node
> const a: number = 10
> console.log(a + 5)
15
```

**优势：**
- TypeScript 官方生态
- 功能最完善
- 社区成熟，资料丰富

**劣势：**
- 需要配置文件
- 性能相对较慢（基于 tsc）
- 启动速度慢

**适用场景：**
- TypeScript 项目开发
- Node.js 后端开发
- 需要完整类型检查的场景

---

#### 2. esbuild - 性能之王

**基本信息：**
- 发布时间：2020 年
- Star 数量：37k+
- 编写语言：Go
- 编译器：esbuild

**技术架构：**
```
Go 语言编写
    ↓
极快的编译速度（比 tsc 快 10-100 倍）
    ↓
Vite 的依赖预构建与转译引擎
```

**核心优势：**
- 极致的编译性能
- 内置于 Vite 等工具（承担依赖预构建与转译）
- 内存占用低

**局限性：**
- 类型检查能力弱于 tsc
- 某些高级 TS 特性支持有限

**适用场景：**
- Vite 项目开发
- 快速原型开发
- 对性能要求极高的场景

---

#### 3. JITI - Nuxt 3 的选择

**基本信息：**
- 发布时间：2021 年
- Star 数量：1k+
- 编译器：Babel（jiti 内置 transform 默认基于 Babel，按需惰性加载，非 esbuild）

**关键应用场景：**
```
Nuxt 3 SSR 框架
    ↓
服务端 TypeScript 编译
    ↓
使用 JITI 运行时
```

**为什么 Nuxt 3 选择 JITI？**
```javascript
// Nuxt 3 架构
├─ 开发模式：Vite（esbuild）
├─ 服务端渲染：JITI
└─ 模块处理：JITI + esbuild
```

**优势：**
- 轻量级
- 性能优秀
- ESM 支持好

**应用工具：**
- Nuxt 3
- Unbuild（打包工具）
- Nitropack（服务引擎）

---

#### 4. SWC - Rust 编写的极速引擎

**基本信息：**
- 发布时间：2019 年
- Star 数量：30k+
- 编写语言：Rust
- 编译器：SWC

**技术优势：**
```
Rust 语言编写
    ↓
单线程性能极强
    ↓
Next.js / Turbopack 底层引擎
```

**应用场景：**
- Next.js 12+ 编译
- Turbopack 底层引擎
- React 编译优化

**性能对比：**
```
编译速度：SWC > esbuild > ts-node
功能完整度：ts-node > esbuild > SWC
```

**局限性：**
- 部分 ESM → CJS 转换不支持
- CommonJS scope 变量支持有限

---

#### 5. TSX - 零配置执行器

**注意：** 这里的 TSX 指 TypeScript eXecute，不是 JSX 语法！

**基本信息：**
- 发布时间：2021 年
- Star 数量：4k+
- 编译器：esbuild

**核心特性：**

```bash
# 零配置执行
tsx index.ts

# Watch 模式
tsx watch index.ts

# REPL 模式
tsx
```

**为什么一直不温不火？**
- 早期 TypeScript 生态未成熟
- ts-node 占据主导地位
- 最近因零配置特性重新受到关注

**开发体验优势：**
- 零配置，开箱即用
- Watch 模式
- REPL 支持
- 高性能实验特性警告

---

## 三、功能特性深度对比

### 3.1 功能支持对比表

| 特性 | ts-node | esbuild | JITI | SWC | TSX |
|------|---------|----------|------|-----|-----|
| **CommonJS Scope** | ✅ | — | — | ⚠️ 部分 | ✅ |
| **ESM 转换** | ✅ | ✅ | ✅ | ⚠️ 有限 | ✅ |
| **Resolution**（解析能力排名） | 2 | 4 | 3 | 5 | 1 |
| **Import 支持** | ⚠️ 有限 | ⚠️ 有限 | ⚠️ 有限 | ⚠️ 有限 | ✅ 完整 |
| **Interoperability**（CJS 中 require ESM） | ❌ | ✅ | ✅ | ❌ | ✅ |
| **缓存机制** | ✅（可启用） | ✅ | ❌ | ✅ | ✅ |
| **Watch 模式** | — | — | — | — | ✅ |
| **REPL 模式** | ✅ | — | — | — | ✅ |

> 注：表中"—"为原笔记未注明的项，不表示不支持，选型时以各工具官方文档为准。Import 支持一行中 ts-node/SWC 不能在 CJS 环境中 require ESM 文件，详见下文 Interoperability 说明。

---



### 3.2 关键概念解释

#### CommonJS Scope（模块作用域）

**定义：** 在模块作用域中可使用的内置变量

```javascript
// CommonJS 模块作用域变量
module.exports    // 导出对象
exports           // 导出对象别名
require           // 引入函数
__filename        // 当前文件绝对路径
__dirname         // 当前文件所在目录
```

**支持对比：**
```
TSX、ts-node：完整支持 
SWC：部分支持 （某些语法不支持）
```

---

#### Resolution（模块解析）

**定义：** 判断 `require`/`import` 能否解析给定的规范

**测试场景：**

```typescript
// 场景 1：在 TS 文件中导入 JS 文件
import { foo } from './bar.js'

// 场景 2：在 .cjs 文件中导入 TS 文件
const ts = require('./typescript.ts')

// 场景 3：导入 .cts/.mts 文件（TS 新后缀）
import { util } from './utils.mts'
```

**支持度排名：**
```
TSX > ts-node > JITI > esbuild > SWC
```

---

#### Interoperability（互操作性）

**定义：** 能否交互性地加载不同格式的文件

**测试代码：**

```typescript
// 可以 require 哪些文件？
require('./file.js')      // JS 文件
require('./file.ts')      // TS 文件
require('./file.cjs')     // CJS 文件
require('./file.mjs')     // ESM 文件（关键！）
```

**支持对比：**

| 运行时 | .js | .ts | .cjs | .mjs |
|--------|-----|-----|------|------|
| TSX |  |  |  |  |
| esbuild |  |  |  |  |
| JITI |  |  |  |  |
| ts-node |  |  |  |  |
| SWC |  |  |  |  |

**关键发现：**
> TSX、esbuild、JITI 可以在 CommonJS 环境中 `require` ESM 文件，这在跨模块系统开发时非常重要！

---

### 3.3 TypeScript 新后缀名支持

**新后缀说明：**
```
.ts   → 普通 TypeScript 文件
.cts  → CommonJS 规范的 TypeScript 文件
.mts  → ES Module 规范的 TypeScript 文件
```

**使用示例：**

```typescript
// utils.mts
export function add(a: number, b: number): number {
  return a + b
}

// main.ts
import { add } from './utils.mts'  // TSX 完美支持
```

---

## 四、性能对比

### 4.1 编译器对比

| 运行时 | 编译器 | 语言 | 速度 | 缓存 |
|--------|--------|------|------|------|
| ts-node | tsc | TypeScript | 慢 | ✅（可启用） |
| esbuild | esbuild | Go | 极快 | ✅ |
| JITI | Babel | TypeScript | 快 | ❌ |
| SWC | SWC | Rust | 极快 | ✅ |
| TSX | esbuild | TypeScript | 快 | ✅ |

### 4.2 性能排名

```
启动速度：SWC ≈ esbuild > TSX > JITI > ts-node
执行速度：SWC ≈ esbuild > TSX > JITI > ts-node
缓存效率：TSX > SWC ≈ esbuild > ts-node > JITI
```

### 4.3 实际测试数据

**测试场景：** 编译一个包含 1000 个模块的项目

> 注：以下为笔记记录的量级参考，非严格基准测试，绝对数值因机器与环境而异，重点看数量级差异。

| 运行时 | 首次编译 | 增量编译 | 内存占用 |
|--------|---------|---------|---------|
| ts-node | 15s | 5s | 500MB |
| esbuild | 0.3s | 0.1s | 100MB |
| TSX | 0.5s | 0.2s | 150MB |
| SWC | 0.2s | 0.05s | 80MB |

---

## 五、开发体验（DX）对比

### 5.1 DX 特性对比

| 特性 | ts-node | esbuild | JITI | SWC | TSX |
|------|---------|----------|------|-----|-----|
| **零配置** | ❌ | — | ✅ | — | ✅ |
| **Watch 模式** | — | — | — | — | ✅ |
| **REPL 模式** | ✅ | — | — | — | ✅ |
| **类型检查** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **实验特性警告** | — | — | — | — | ✅ |
| **Source Map** | — | — | — | — | — |

### 5.2 配置复杂度对比

**ts-node（需要配置）：**
```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "strict": true
  },
  "ts-node": {
    "compilerOptions": {
      "module": "commonjs"
    }
  }
}
```

**TSX（零配置）：**
```bash
# 直接执行，无需任何配置文件
tsx script.ts
```

---

## 六、选型决策指南

### 6.1 决策树

```
你的需求是什么？
│
├─  需要完整类型检查
│   └─ 使用 ts-node
│
├─  追求极致性能
│   ├─ Rust 技术栈 → SWC
│   └─ Go 技术栈 → esbuild
│
├─  零配置快速开发
│   └─ 使用 TSX
│
├─  Nuxt 3 项目
│   └─ 使用 JITI（已内置）
│
├─  需要完整功能支持
│   ├─ ESM + CJS 混合 → TSX
│   └─ 传统 CommonJS → ts-node
│
└─  实验性项目尝鲜
    └─ SWC 或 TSX
```



### 6.2 场景推荐

#### 场景 1：开发 Node.js 后端
```bash
推荐：TSX 或 ts-node
理由：
- TSX：零配置，开发快
- ts-node：类型检查完整，生产稳定
```

#### 场景 2：开发 npm 工具库
```bash
推荐：TSX
理由：
- 零配置，快速测试
- 支持各种模块格式
- 开发体验好
```

#### 场景 3：Next.js 项目
```bash
推荐：SWC（已内置）
理由：
- Next.js 12+ 默认使用 SWC
- 无需额外配置
- 性能最优
```

#### 场景 4：Nuxt 3 项目
```bash
推荐：JITI（已内置）
理由：
- Nuxt 3 默认使用 JITI
- SSR 场景优化
- 与 Vite 配合良好
```

---

## 七、实际应用案例

### 7.1 案例 1：开发 CLI 工具

**需求：** 快速开发一个 TypeScript CLI 工具

**解决方案：**

```bash
# 1. 安装 TSX
npm install -D tsx

# 2. 编写 CLI 代码
# src/cli.ts
#!/usr/bin/env node
import { program } from 'commander'

program
  .version('1.0.0')
  .command('build')
  .action(() => {
    console.log('Building...')
  })

program.parse()

# 3. 在 package.json 中配置
{
  "bin": {
    "my-cli": "dist/cli.js"
  },
  "scripts": {
    "dev": "tsx src/cli.ts",
    "build": "tsup src/cli.ts"
  }
}

# 4. 开发时直接运行
npm run dev build
```

**优势：**
- 零配置，快速开发
- 开发时直接执行 TS 代码
- 生产时用 tsup 打包

---

### 7.2 案例 2：Node.js 后端开发

**需求：** 使用 TypeScript 开发 Express 后端

**解决方案：**

```bash
# 方案 1：ts-node（传统）
npm install -D ts-node @types/node @types/express
npx ts-node src/server.ts

# 方案 2：TSX（推荐）
npm install -D tsx
npx tsx src/server.ts

# 方案 3：TSX + Watch 模式
npx tsx watch src/server.ts
```

---

### 7.3 案例 3：跨模块系统开发

**问题：** 在 CommonJS 项目中导入 ESM 模块

```typescript
// 问题代码
const { default: config } = require('./config.mjs')
// ❌ ts-node 报错：Cannot require ES Module

// 解决方案：使用 TSX
tsx script.ts  // ✅ 可以正常运行
```

---



## 八、常见问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| ts-node 执行慢 | 基于 tsc，性能较低 | 1. 启用缓存<br>2. 换用 TSX/esbuild |
| 无法 require ESM 文件 | ts-node 不支持 | 使用 TSX 或 JITI |
| SWC 不支持某些语法 | 功能仍在完善中 | 使用 TSX 或等待更新 |
| 需要零配置工具 | 不想写配置文件 | 使用 TSX |
| 需要完整类型检查 | 快速运行时不做检查 | 使用 ts-node + tsc --noEmit |
| Nuxt 3 如何调试 TS？ | 内置 JITI | 直接使用，无需配置 |

---

## 九、核心要点总结

1. **TypeScript 运行时是 TS 与运行环境的桥梁**  
   负责将 TS 代码转换为目标环境可执行的代码

2. **TSX 是功能最全面的零配置执行器**  
   支持 CommonJS Scope、Resolution、Import、Interoperability

3. **性能排序：SWC ≈ esbuild > TSX > JITI > ts-node**  
   Rust/Go 编写的运行时性能远超 TypeScript 实现

4. **缓存机制显著提升性能**  
   TSX、SWC、esbuild 都支持缓存，JITI 不支持

5. **选择建议：零配置选 TSX，类型检查选 ts-node**  
   根据项目需求平衡开发体验和功能完整性

---

## 十、延伸学习资源

### 官方文档

- [ts-node 官方文档](https://typestrong.org/ts-node/)
- [esbuild 官方文档](https://esbuild.github.io/)
- [SWC 官方文档](https://swc.rs/)
- [TSX GitHub](https://github.com/esbuild-kit/tsx)
- [JITI GitHub](https://github.com/unjs/jiti)

### 对比文档

- [TypeScript Runtime Comparison](https://github.com/privatenumber/ts-runtime-comparison) - 详细功能对比表

### 实践项目

- 使用 TSX 开发 CLI 工具
- 使用 SWC 优化 Next.js 项目
- 使用 JITI 开发 Nuxt 3 模块

### 进阶学习

- TypeScript Compiler API
- AST（抽象语法树）原理
- Rust 编译器开发

---

## 十一、思考题

1. **为什么 Vite 选择 esbuild 而不是 SWC 作为底层引擎？**

2. **TSX 推出较晚（2021 年），为什么能快速受到关注？**

3. **如果要在 CommonJS 项目中导入 ESM 模块，应该选择哪个运行时？为什么？**

4. **JITI 为什么被 Nuxt 3 选中？它有哪些独特优势？**

5. **开发 npm 库时，应该选择哪个运行时进行测试？**

---

## 十二、注意事项

### 运行时 vs 构建工具

**重要区分：**
```
运行时（Runtime）：
  TSX、ts-node、JITI、SWC、esbuild-runner
  ↓
  用于开发阶段快速执行 TS 代码

构建工具（Build Tool）：
  Rollup、Webpack、Vite、Turbopack
  ↓
  用于生产环境打包编译
```

**示例：**
```bash
# 开发阶段：使用运行时
tsx src/index.ts

# 生产阶段：使用构建工具
vite build
```

---

**笔记整理时间：** 2026-03-08  
**技术栈版本：** ts-node 10 / esbuild 0.19 / SWC 1.3 / TSX 4.7  
**下一步学习：** Vite 实战配置与优化技巧

> **审校补注（2026-09）**：文中数据为 2023 年快照。截至审校时点，Node.js 自 v23.6 起（并回移至 v22.18+）默认支持以 type stripping 直接运行 TypeScript（仅限可擦除语法，枚举等需 `--experimental-transform-types`）；ts-node 已进入低维护状态，社区更常推荐 tsx。

