---
title: esbuild 与 swc
description: esbuild/swc 的 Go/Rust 极速编译原理与在构建链路中的定位
keywords: [Node.js, 构建, 脚手架, esbuild, swc]
category: Node.js
tags: [Node.js, 工程化]
---







# esbuild 与 swc

## esbuild

### 介绍

esbuild 是一个用 Go 语言编写的 JavaScript 打包器和压缩器，速度极快。

### 安装

```bash
pnpm add esbuild -D
```

### 基础使用

```bash
# 打包
npx esbuild src/index.js --bundle --outfile=dist/bundle.js

# 压缩
npx esbuild src/index.js --minify --outfile=dist/bundle.min.js

# 指定格式
npx esbuild src/index.js --format=esm --outfile=dist/bundle.mjs

# 开发服务器
npx esbuild src/index.js --bundle --serve=3000 --servedir=public
```

### API 使用

```javascript
const esbuild = require('esbuild')

// 一次性构建
esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/bundle.js',
  minify: true,
  sourcemap: true,
  format: 'esm',
  target: ['es2020'],
  define: {
    'process.env.NODE_ENV': '"production"'
  }
}).then(() => {
  console.log('Build complete')
})

// 开发模式（监视变化）
esbuild.context({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/bundle.js'
}).then(ctx => {
  ctx.watch()
  // ctx.serve({ servedir: 'public' })
})
```

### 插件系统

```javascript
const esbuild = require('esbuild')

const httpPlugin = {
  name: 'http',
  setup(build) {
    // 拦截 http/https 导入
    build.onResolve({ filter: /^https?:\/\// }, args => ({
      path: args.path,
      namespace: 'http-url'
    }))

    // 获取远程内容
    build.onLoad({ filter: /.*/, namespace: 'http-url' }, async args => {
      const response = await fetch(args.path)
      const contents = await response.text()
      return { contents }
    })
  }
}

esbuild.build({
  entryPoints: ['src/index.js'],
  bundle: true,
  outfile: 'dist/bundle.js',
  plugins: [httpPlugin]
})
```

### 与其他工具集成

#### Vite

Vite 默认使用 esbuild 进行转换和压缩。

#### tsup

基于 esbuild 的库打包工具：

```bash
pnpm add tsup -D
```

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,          // 生成类型声明
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true
})
```

---

## swc

### 介绍

swc (Speedy Web Compiler) 是用 Rust 编写的超快速编译器，可用于编译 TypeScript/JavaScript、压缩代码等。

### 安装

```bash
pnpm add @swc/core -D
pnpm add @swc/cli -D
```

### 基础使用

```bash
# 编译文件
npx swc src/index.js -o dist/index.js

# 编译目录
npx swc src -d dist

# 监视模式
npx swc src -d dist --watch
```

### 配置文件

创建 `.swcrc`：

```json
{
  "$schema": "https://json.schemastore.org/swcrc",
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "tsx": false,
      "decorators": true,
      "dynamicImport": true
    },
    "transform": {
      "react": {
        "pragma": "React.createElement",
        "pragmaFrag": "React.Fragment"
      }
    },
    "target": "es2020",
    "loose": false,
    "externalHelpers": false
  },
  "module": {
    "type": "es6"
  },
  "minify": false,
  "sourceMaps": true
}
```

### API 使用

```javascript
const swc = require('@swc/core')

// 转换代码
const result = await swc.transform('const x = 1', {
  jsc: {
    parser: {
      syntax: 'typescript'
    },
    target: 'es2015'
  }
})

// 编译文件
const output = await swc.transformFile('src/index.ts', {
  jsc: {
    parser: {
      syntax: 'typescript'
    }
  }
})
```

### 与工具集成

#### @swc/register

在 Node.js 中实时编译：

```bash
pnpm add @swc/register -D
```

```javascript
require('@swc/register')

// 现在可以直接 require TypeScript 文件
require('./src/index.ts')
```

#### ts-node + swc

```json
// tsconfig.json
{
  "ts-node": {
    "swc": true
  }
}
```

#### Jest + swc

```bash
pnpm add @swc/jest -D
```

```javascript
// jest.config.js
module.exports = {
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest'
  }
}
```

#### Webpack + swc

```bash
pnpm add swc-loader -D
```

```javascript
module.exports = {
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript'
              }
            }
          }
        }
      }
    ]
  }
}
```

---

## esbuild vs swc 对比

| 特性 | esbuild | swc |
|------|---------|-----|
| 语言 | Go | Rust |
| 主要用途 | 打包、压缩 | 编译、转换 |
| TypeScript 支持 | ✅ | ✅ |
| 打包功能 | ✅ 强大 | ❌ 需配合其他工具 |
| 插件系统 | ✅ | ✅ |
| 速度 | 极快 | 极快 |
| 生态集成 | Vite、tsup | Next.js、Turbopack |

### 选择建议

- **需要打包**：使用 esbuild
- **只需要编译/转换**：使用 swc
- **Next.js 项目**：swc（内置支持）
- **Vite 项目**：esbuild（内置支持）
