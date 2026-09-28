---
title: electron-vite
description: "electron-vite 是专为 Electron 设计的构建工具，旨在提供更快、更精简的开发体验。它深度集成 Vite，并为 Electron 的独特环境提供了预配置，让开发者可以开箱即用。"
keywords: [electron-vite]
category: Electron
tags: [Electron, 桌面应用, IPC, 打包]
---


# electron-vite

`electron-vite` 是专为 Electron 设计的构建工具，旨在提供更快、更精简的开发体验。它深度集成 Vite，并为 Electron 的独特环境提供了预配置，让开发者可以开箱即用。

## 概述

| 特性 | 说明 |
|------|------|
| **开发服务器启动** | 极快（秒级），基于 esbuild 预构建 |
| **热重载 (HMR)** | 毫秒级响应，与项目大小无关 |
| **配置复杂度** | 简单，预设大量最佳实践 |
| **构建速度** | 快速，利用 esbuild 进行预构建和压缩 |
| **生产环境输出** | 高度优化，支持 Tree-shaking |

## 安装与依赖

### 环境要求

| 依赖 | 版本要求 |
|------|---------|
| Node.js | >= 18.0.0 |
| npm / yarn / pnpm | 最新稳定版 |
| Electron | >= 20.0.0 |

### 项目初始化

最快捷的方式是使用官方的脚手架工具 `create-electron`：

```bash
# npm
npm create @quick-start/electron@latest

# yarn
yarn create @quick-start/electron

# pnpm
pnpm create @quick-start/electron
```

该工具会引导你选择框架（Vue, React, Svelte 等）、是否使用 TypeScript，并自动生成一个配置完善的项目。

### 生成的项目结构

```
my-electron-app/
├── src/
│   ├── main/              # 主进程代码
│   │   └── index.ts
│   ├── preload/           # 预加载脚本
│   │   └── index.ts
│   └── renderer/          # 渲染进程代码
│       ├── index.html
│       └── src/
├── electron.vite.config.ts
├── package.json
└── tsconfig.json
```

### package.json 脚本说明

```jsonc
{
  "scripts": {
    "dev": "electron-vite dev",      // 启动开发服务器
    "build": "electron-vite build",  // 构建生产代码
    "preview": "electron-vite preview", // 预览构建结果
    "start": "electron-vite preview"   // 同 preview
  }
}
```

### 手动安装

如果需要在现有项目中集成 `electron-vite`：

```bash
# npm
npm install -D electron-vite

# yarn
yarn add -D electron-vite

# pnpm
pnpm add -D electron-vite
```

## Electron 与 Vite 的强强联合

传统的 Electron 应用开发通常依赖于像 Webpack 这样的打包工具。虽然功能强大，但随着项目复杂度的增加，缓慢的构建和热重载速度成为了开发效率的瓶颈。

`electron-vite` 的出现正是为了解决这一痛点。它巧妙地结合了 Electron 和 Vite 的优势：

- **Electron 的跨平台能力**：允许使用 Web 技术构建桌面应用
- **Vite 的极致开发体验**：
  - **极速的冷启动**：基于 esbuild 的预构建，启动速度远超传统打包工具
  - **闪电般的热模块更换 (HMR)**：利用浏览器原生 ES 模块，实现与应用大小无关的快速热更新

通过将 Vite 应用于 Electron 的渲染进程，`electron-vite` 极大地提升了 UI 开发的效率和体验

## 核心功能

### 快速热重载 (HMR) 实现原理

`electron-vite` 为 Electron 的不同进程提供了不同的热重载策略：

- **渲染进程 (Renderer Process)**：

  - **原理**：完全利用 Vite 的原生 HMR 机制。当渲染进程的代码（如 Vue、React 组件）发生变化时，Vite 服务器会通过 WebSocket 将更新的模块推送给客户端（即 Electron 的 `BrowserWindow`），浏览器仅替换更新的模块，无需重新加载整个页面。
  - **优势**：更新速度极快，通常在毫秒级别，且不会丢失应用状态。

- **主进程 (Main Process) 与预加载脚本 (Preload Scripts)**：
  - **原理**：这两个部分运行在 Node.js 环境中。当它们的代码发生变化时，`electron-vite` 会快速重新构建这部分代码，然后**重启整个 Electron 应用**。这虽然不是真正的“热”替换，但其自动化和快速响应的特性，相较于手动重启，依然带来了很好的开发体验。
  - **优势**：确保主进程和预加载脚本的最新代码能够被正确加载和执行。

### 原生模块 (Native Node Modules) 支持方案

Electron 应用经常需要使用原生 Node 模块（例如，`sqlite3`, `serialport`）。`electron-vite` 通过智能的外部化处理来支持它们：

- **智能外部化**：`electron-vite` 在打包时，会自动将 Node.js 的内置模块和 `dependencies` 中列出的模块标记为 `external`。这意味着这些模块不会被打包进最终的 bundle 文件中，而是在运行时由 Node.js 环境动态加载。
- **环境区分**：
  - 在**主进程和预加载脚本**中，由于它们运行在 Node.js 环境，可以直接 `require` 或 `import` 原生模块。
  - 在**渲染进程**中，出于安全和环境限制，无法直接访问 Node.js API。正确的做法是通过**预加载脚本**，使用 `contextBridge` 将需要的功能暴露给渲染进程。

### 主进程与渲染进程的代码组织方式

`electron-vite` 推荐并默认支持一种约定优于配置的项目结构，以实现代码的清晰分离：

```
.
├── src
│   ├── main          # 主进程代码
│   │   └── index.ts
│   ├── preload       # 预加载脚本
│   │   └── index.ts
│   └── renderer      # 渲染进程代码 (Vue, React, etc.)
│       └── index.html
├── electron.vite.config.ts # 统一的配置文件
└── package.json
```

- **`src/main`**: 存放所有主进程相关的代码，如窗口管理、系统托盘、菜单等。
- **`src/preload`**: 存放预加载脚本，作为渲染进程和主进程之间的桥梁，用于安全地暴露 Node.js API。
- **`src/renderer`**: 存放所有 UI 相关的代码，可以是一个完整的 Vite 项目（如 Vue, React）。

这种结构使得不同进程的职责更加明确，易于维护和管理。

## 配置说明

`electron-vite` 亮点是其集中的配置方式。所有的构建配置都在根目录的 `electron.vite.config.ts` 文件中完成。

### 基础配置文件结构解析

一个基础的配置文件结构如下：

```typescript
// electron.vite.config.ts
import { defineConfig } from "electron-vite"
import { resolve } from "path"

export default defineConfig({
  main: {
    // 主进程的 Vite 配置
  },
  preload: {
    // 预加载脚本的 Vite 配置
  },
  renderer: {
    // 渲染进程的 Vite 配置
  }
})
```

每个部分（`main`、 `preload`、`renderer`）都可以接受 Vite 的配置项，允许对不同进程的构建过程进行精细化控制

### 常用配置项及其作用

- **入口文件 (Entry Point)**：

  - 通常 `electron-vite` 会自动查找入口文件。如果你的项目结构比较特殊，可以通过 `build.rollupOptions.input` 来手动指定。

  ```typescript
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, "electron/main/index.ts")
        }
      }
    }
  }
  ```

- **输出目录 (Output Directory)**：

  - 使用 `build.outDir` 来指定构建产物的输出目录。

  ```typescript
  main: {
    build: {
      outDir: "dist/main"
    }
  }
  ```

- **外部依赖 (External Dependencies)**：

  - `electron-vite` 会自动处理，但你也可以通过 `build.rollupOptions.external` 添加额外的外部依赖。

  ```typescript
  main: {
    build: {
      rollupOptions: {
        external: ["some-native-module"]
      }
    }
  }
  ```

- **渲染进程根目录 (Renderer Root)**：
  - 如果你的渲染进程 `index.html` 和源代码不在 `src/renderer` 目录下，需要指定 `root`。
  ```typescript
  renderer: {
    root: '.', // 例如，如果 index.html 在项目根目录
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        }
      }
    }
  }
  ```

## 最佳实践

### 开发调试工作流

**启动开发服务器**：

```bash
npm run dev
```

此命令会同时启动 Vite 开发服务器用于渲染进程，并运行 Electron 应用

**编码与热更新**：

- 修改渲染进程的代码，你会在应用窗口中看到即时的 HMR 更新
- 修改主进程或预加载脚本的代码，Electron 应用会自动重启

**调试**：

- **渲染进程**：可以直接使用 `BrowserWindow` 的开发者工具进行调试。
- **主进程**：可以在 VSCode 中创建一个 `launch.json` 配置，附加到主进程上进行断点调试。`electron-vite` 官方文档提供了详细的[调试指南](https://electron-vite.org/guide/debugging)

### 生产环境构建优化

**执行构建命令**：

```bash
npm run build
```

此命令会使用 Vite 对主进程、预加载脚本和渲染进程的代码进行打包和优化，并输出到 `out` 目录。

**源码保护**：

- `electron-vite` 支持将源码编译为 V8 字节码，以提供基础的源码保护。这可以防止代码被轻易地解包和阅读
- 在配置文件中开启：

```typescript
main: {
  build: {
    // ...
    sourcemap: false, // 禁用 sourcemap
    minify: 'terser',
    terserOptions: {
      // ...
    }
  }
},
// 配合 electron-builder 的 asar 选项
```

**打包为可执行文件**：

- 构建完成后，通常会配合 `electron-builder` 或 `electron-packager` 将 `out` 目录和 `node_modules` 打包成最终的可执行文件（如 `.exe`, `.dmg`, `.AppImage`）

## 环境变量配置

`electron-vite` 支持在不同进程中使用环境变量：

### 定义环境变量

创建 `.env` 文件：

```bash
# .env
VITE_APP_TITLE=My Electron App

# .env.development
VITE_API_URL=http://localhost:3000

# .env.production
VITE_API_URL=https://api.example.com
```

### 使用环境变量

```typescript
// 渲染进程
console.log(import.meta.env.VITE_APP_TITLE)

// 主进程需要通过 loadEnv 加载
import { loadEnv } from 'electron-vite'

const env = loadEnv('development')
console.log(env.VITE_API_URL)
```

### 内置环境变量

| 变量名 | 说明 |
|--------|------|
| `import.meta.env.MODE` | 应用运行模式 |
| `import.meta.env.DEV` | 是否为开发环境 |
| `import.meta.env.PROD` | 是否为生产环境 |
| `import.meta.env.BASE_URL` | 应用基础 URL |

## 常见问题解答

### Q1: 热重载不生效怎么办？

**可能原因及解决方案**：

1. 检查文件是否在正确的监听范围内
2. 确保没有在配置中禁用 HMR
3. 主进程修改需要重启应用（这是预期行为）

```typescript
// 确保配置正确
export default defineConfig({
  main: {
    build: {
      watch: {} // 主进程热重载
    }
  }
})
```

### Q2: 如何处理原生模块？

```typescript
// electron.vite.config.ts
export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        external: ['better-sqlite3', 'serialport'] // 标记为外部依赖
      }
    }
  }
})
```

### Q3: 如何配置代理？

```typescript
// electron.vite.config.ts
export default defineConfig({
  renderer: {
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true
        }
      }
    }
  }
})
```

### Q4: 构建产物过大怎么办？

**优化策略**：

1. 启用代码分割
2. 压缩资源
3. 排除不必要的依赖

```typescript
export default defineConfig({
  renderer: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['vue', 'vue-router']
          }
        }
      }
    }
  }
})
```

### Q5: 如何调试主进程？

在 `.vscode/launch.json` 中配置：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron-vite",
      "runtimeArgs": ["--sourcemap"],
      "env": { "NODE_ENV": "development" }
    }
  ]
}
```

## 性能对比：与传统 Electron 打包方案的差异

| 特性               | electron-vite                         | 传统方案 (如 Webpack)                    |
| :----------------- | :------------------------------------ | :--------------------------------------- |
| **开发服务器启动** | **极快** (秒级)                       | 较慢，需完整构建依赖                     |
| **热重载 (HMR)**   | **极快** (毫秒级)，与项目大小无关     | 较慢，通常需要重新打包大量代码           |
| **配置复杂度**     | **简单**，预设了大量最佳实践          | **复杂**，需要手动配置 loader、plugin 等 |
| **构建速度**       | **快**，利用 esbuild 进行预构建和压缩 | 较慢，尤其是在大型项目中                 |
| **生产环境输出**   | 高度优化，支持 Tree-shaking           | 高度优化，但构建过程更长                 |

**核心差异**：`electron-vite` 的核心优势在于**开发阶段的极致体验**。它通过避免不必要的打包，让开发者能够像开发普通 Web 应用一样，享受到 Vite 带来的速度与激情，从而显著提升开发效率。而在生产构建方面，它同样能产出与传统方案相媲美的高度优化的代码
