---
title: electron-vite
description: electron-vite 的快速开始、CLI 命令与主进程/预加载/渲染器的 Vite 构建配置
keywords: [Electron, Vite, 桌面应用, 构建工具]
category: Node.js
tags: [Node.js, 工程化]
---

# electron-vite

官网：https://cn.electron-vite.org/

github：https://github.com/alex8088/electron-vite/issues

## 快速开始

**electron-vite** 是一个新型构建工具，旨在为 [Electron](https://www.electronjs.org/) 提供更快、更精简的开发体验。它主要由五部分组成：

*   一套构建指令，它使用 [Vite](https://cn.vitejs.dev/) 打包你的代码，并且它能够处理 Electron 的独特环境，包括 [Node.js](https://nodejs.org/) 和浏览器环境
    
*   集中配置主进程、渲染器和预加载脚本的 Vite 配置，并针对 Electron 的独特环境进行预配置
    
*   为渲染器提供快速模块热替换（HMR）支持，为主进程和预加载脚本提供热重载支持，极大地提高了开发效率
    
*   优化 Electron 主进程资源处理
    
*   使用 V8 字节码保护源代码
    

electron-vite 快速、简单且功能强大，旨在开箱即用。

> electron-vite 1.x 需要 **Node.js** 版本 14.18+ 和 **Vite** 版本 3.0+（2.x 起要求 Node.js 18+ 与 Vite 5+）
>

```
npm  i  electron-vite  -D
```

在安装了 electron-vite 的项目中，你可以直接使用 `npx electron-vite` 运行，也可以在 `package.json` 文件中添加 npm scripts：

json

```json
{
  "scripts": {
    "start": "electron-vite preview", // 开启 Electron 程序预览生产构建
    "dev": "electron-vite dev", // 开启开发服务和 Electron 程序
    "prebuild": "electron-vite build"  // 为生产构建代码
  }
}
```

你还可以指定其他 CLI 选项，例如 `--outDir`。 有关 CLI 选项的完整列表，可以在你的项目中运行 `npx electron-vite -h`。了解更多有关 [命令行界面](https://cn.electron-vite.org/guide/cli) 的信息。

### 配置 electron-vite

当以命令行方式运行 `electron-vite` 时，electron-vite 将会自动尝试解析项目根目录下名为 `electron.vite.config.js` 的配置文件。最基本的配置文件如下所示：

```js
// electron.vite.config.js

export default {
  main: {
    // vite config options
  },
  preload: {
    // vite config options
  },
  renderer: {
    // vite config options
  }
}
```

了解更多有关 [配置](https://cn.electron-vite.org/config/) 的信息。

### Electron 入口

当使用 electron-vite 打包代码时，Electron 应用程序的入口点应更改为输出目录中的主进程入口文件。默认的输出目录 `outDir` 为 `out`。你的 `package.json` 文件会是这样：

```json
{
 "name": "electron-app",
 "version": "1.0.0",
 "main": "./out/main/index.js"
}
```

Electron 的工作目录将是输出目录，而不是你的源代码目录。因此在打包 Electron 应用程序时可以将源代码排除

了解更多有关 [生产构建](https://cn.electron-vite.org/guide/build) 的信息

### 搭建 electron-vite 项目

在命令行中运行以下命令：

```bash
npm create @quick-start/electron
yarn create @quick-start/electron
pnpm create @quick-start/electron
```

然后按照提示操作即可!

```
✔ Project name: … <electron-app>
✔ Select a framework: › vue
✔ Add TypeScript? … No / Yes
✔ Add Electron updater plugin? … No / Yes
✔ Enable Electron download mirror proxy? … No / Yes
Scaffolding project in ./<electron-app>...
Done.
```

## 命令行界面

### electron-vite

别名：`electron-vite dev`、 `electron-vite serve`

该命令将构建主进程和预加载脚本源代码，并为渲染器启动一个开发服务器，最后启动 Electron 应用程序

### electron-vite preview

该命令将构建主进程、渲染器和预加载脚本源代码，并启动 Electron 应用程序进行预览

### electron-vite build

该命令将构建主进程、渲染器和预加载脚本源代码。通常在打包 Electron 应用程序之前，需要执行此命令

### 选项

#### 通用选项

| 选项                     | 描述                                                       |
| ------------------------ | ---------------------------------------------------------- |
| `-c, --config <file>`    | 定义配置文件路径                                           |
| `-l, --logLevel <level>` | 设置日志级别 (optional: `info`, `warn`, `error`, `silent`) |
| `-m, --mode <mode>`      | 设置环境模式                                               |
| `-w, --watch`            | 用于热重载的监视模式 (default: `false`)                    |
| `--ignoreConfigWarning`  | 忽略配置缺失警告 (default: `false`)                        |
| `--sourcemap`            | 输出 source maps 支持 debug (default: `false`)             |
| `--outDir <dir>`         | 设置输出目录 (default: `out`)                              |
| `--entry <file>`         | 指定 Electron 入口文件                                     |
| `-v, --version`          | 显示版本号                                                 |
| `-h, --help`             | 显示可用的 CLI 选项                                        |

> `--ignoreConfigWarning` 选项允许你在配置缺失时忽略警告。例如，不需要使用预加载脚本
>

#### Dev 选项

| 选项                    | 描述                                        |
| ----------------------- | ------------------------------------------- |
| `--inspect [port]`      | 指定端口启用 V8 inspector (default: `5858`) |
| `--inspectBrk [port]`   | 和`--inspect` 一样，但会暂停运行            |
| `--remoteDebuggingPort` | 远程调试端口                                |
| `--rendererOnly`        | 仅为渲染器启动开发服务                      |

**提示**

*   `--inspect` 选项允许你在指定的端口上启用 V8 Inspector。外部调试器可以连接到此端口。有关更多详细信息，请参阅 [V8 Inspector](https://cn.electron-vite.org/guide/debugging#v8-inspector-e-g-chrome-devtools)。
    
*   `--inspectBrk` 选项与 `--inspect` 选项类似，但会在 JavaScript 的第一行暂停执行。
    
*   `--remoteDebuggingPort` 选项用于 IDE 调试。
    
*   `--rendererOnly` 选项仅用于 `dev` 命令以跳过主进程和预加载脚本构建，并仅为渲染器启动开发服务。此选项将大大提高 dev 命令速度。

> 使用 `--rendererOnly` 选项时，electron-vite 命令必须至少运行过一次。此外，你需要在不更改主进程和预加载脚本源代码的情况下使用它。
>

#### Preview 选项

| 选项          | 描述     |
| ------------- | -------- |
| `--skipBuild` | 跳过构建 |

> `--skipBuild` 选项仅用于 `preview` 命令跳过构建并启动 Electron 应用程序进行预览



## 开发

### 项目结构

推荐使用如下项目结构：

```
.
├──src
│  ├──main
│  │  ├──index.ts
│  │  └──...
│  ├──preload
│  │  ├──index.ts
│  │  └──...
│  └──renderer    # with vue, react, etc.
│     ├──src
│     ├──index.html
│     └──...
├──electron.vite.config.ts
├──package.json
└──...
```

遵循此约定，electron-vite 可以用**最少的配置**进行工作

当运行 electron-vite 时，它会自动寻找主进程、渲染器和预加载脚本的入口文件。默认的入口配置：

*   **主进程：**  `<root>/src/main/{index|main}.{js|ts|mjs|cjs}`
*   **预加载脚本：**  `<root>/src/preload/{index|preload}.{js|ts|mjs|cjs}`
*   **渲染器：**  `<root>/src/renderer/index.html`

如果找不到入口点，它将抛出一个错误。你可以通过设置 `build.rollupOptions.input` 选项来修复它。

#### 自定义

尽管我们强烈推荐上面的项目结构，但这不是必需的。你可以对其进行配置以满足你的使用场景。

假设你有下面这样的项目文件结构：

```
.
├──electron
│  ├──main
│  │  ├──index.ts
│  │  └──...
│  └──preload
│     ├──index.ts
│     └──...
├──src   # with vue, react, etc.
├──index.html
├──electron.vite.config.ts
├──package.json
└──...
```

你的 `electron.vite.config.ts` 文件应该是这样：

```js
import { defineConfig } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/main/index.ts')
        }
      }
    }
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'electron/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    root: '.',
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        }
      }
    }
  }
})
```

> 默认情况下，渲染器的工作目录位于 `src/renderer` 中。在此示例中，渲染器的 `root` 选项应设置为 `.`。
>

### 使用预加载脚本

预加载脚本会在渲染器的网页加载之前注入。 如果你想向渲染器加入需要特殊权限的功能，你可以通过 [contextBridge](https://www.electronjs.org/docs/latest/api/context-bridge) 接口定义 [全局对象](https://developer.mozilla.org/en-US/docs/Glossary/Global_object)

预加载脚本的作用：

*   **增强渲染器**：预加载脚本运行在具有 HTML DOM APIs 和 Node.js、Electron APIs 的有限子集访问权限的环境中
*   **在主进程和渲染进程之间通信**：使用 Electron 的 `ipcMain` 和 `ipcRenderer` 模块进行进程间通信（IPC）

![](/backend-images/202310311612121.png)

#### 例子

创建一个预加载脚本并通过 `contextBridge.exposeInMainWorld` 将方法或变量暴露给渲染器

```js
import { contextBridge, ipcRenderer } from  'electron'
contextBridge.exposeInMainWorld('electron', {
  ping: () => ipcRenderer.invoke('ping')
})
```

1.  将脚本附在渲染进程上，在 `BrowserWindow` 构造器中使用 `webPreferences.preload` 传入脚本的路径。

```
import { app, BrowserWindow } from  'electron'
import path from  'path'
const  createWindow  = () => {
 const  win  =  new  BrowserWindow({
 webPreferences: {
 preload: path.join(__dirname, 'preload.js'),
 },
 })
 ipcMain.handle('ping', () =>  'pong')
 win.loadFile('index.html')
}
app.whenReady().then(() => {
 createWindow()
})
```

2.  在渲染器进程中使用暴露的函数和变量：

```
const  func  =  async () => {
 const  response  =  await window.electron.ping()
 console.log(response) // prints out 'pong'
}
func()
```

### 沙盒的限制
从 Electron 20 开始，预加载脚本默认沙盒化，不再拥有完整 Node.js 环境的访问权。实际上，这意味着你只拥有一个 polyfilled 的 require 函数（类似于 Node 的 require 模块），它只能访问一组有限的 API。

| 可用的 API            | 详细信息                                                     |
| --------------------- | ------------------------------------------------------------ |
| Electron 模块         | 仅 [渲染进程模块](https://www.electronjs.org/zh/docs/latest/api/context-bridge) |
| Node.js 模块          | `events`, `timers`, `url`                                    |
| Polyfilled 的全局模块 | `Buffer`, `process`, `clearImmediate`, `setImmediate`        |

**提示**

因为 `require` 函数是一个功能有限的 polyfill，你无法把 preload 脚本拆成多个文件并作为 CommonJS 模块来加载，除非指定了 `sandbox: false`。

在 Electron 中，可以使用 [BrowserWindow](https://www.electronjs.org/zh/docs/latest/api/browser-window) 构造函数中的 `sandbox: false` 选项在每个进程的基础上禁用渲染器沙盒。

```
const  win  =  new  BrowserWindow({
 webPreferences: {
 sandbox: false
 }
})
```

了解有关 [Electron 进程沙盒](https://www.electronjs.org/zh/docs/latest/tutorial/sandbox) 的更多信息。

### 高效
也许有些开发人员认为使用预加载脚本不方便且不灵活。但我们为什么要推荐：

*   这是安全的做法，大多数流行的 Electron 应用程序（slack、visual studio code 等）都这样做。
*   避免混合开发（nodejs 和浏览器），让渲染器成为一个常规的 web 应用程序，让 web 开发人员更容易上手。

基于效率考虑，推荐使用 [@electron-toolkit/preload](https://github.com/alex8088/electron-toolkit/tree/master/packages/preload)。非常容易将 Electron APIs（ipcRenderer、webFrame、process）暴露给渲染器。

首先，在启用上下文隔离的情况下，使用 `contextBridge` 将 Electron APIs 暴露给渲染器，否则将其添加到全局 DOM。

```
import { contextBridge } from  'electron'
import { electronAPI } from  '@electron-toolkit/preload'
if (process.contextIsolated) {
 try {
 contextBridge.exposeInMainWorld('electron', electronAPI)
 } catch (error) {
 console.error(error)
 }
} else {
 window.electron = electronAPI
}
```

然后，在渲染进程中直接使用 Electron APIs：

```
// Send a message to the main process with no response
window.electron.ipcRenderer.send('electron:say', 'hello')
// Send a message to the main process with the response asynchronously
window.electron.ipcRenderer.invoke('electron:doAThing', '').then(re  => {
 console.log(re)
})
// Receive messages from the main process
window.electron.ipcRenderer.on('electron:reply', (_, args) => {
 console.log(args)
})
```

了解更多有关 [@electron-toolkit/preload](https://github.com/alex8088/electron-toolkit/tree/master/packages/preload)。

**提示**

`@electron-toolkit/preload` 需要禁用 `sandbox`。

**IPC 安全问题**

最安全的方法是使用辅助函数来包装 `ipcRenderer` 调用，而不是直接通过 context bridge 暴露 ipcRenderer 模块。

### Webview
将预加载脚本附加到 webview 的最简单方法是通过 webContents 的 `will-attach-webview` 事件处理。

```
mainWindow.webContents.on('will-attach-webview', (e, webPreferences) => {
 webPreferences.preload =  join(__dirname, '../preload/index.js')
})
```

## nodeIntegration
目前，electorn-vite 不支持 `nodeIntegration`。其中一个重要的原因是 Vite 的 HMR 是基于原生 ESM 实现的。但是还有一种支持方式就是使用 `require` 导入 node 模块，不太优雅。或者你可以使用插件 [vite-plugin-commonjs-externals](https://github.com/xiaoxiangmoe/vite-plugin-commonjs-externals) 来处理。

也许将来会有更好的方法来支持。但需要注意的是，使用预加载脚本是一个更好、更安全的选择。

## dependencies vs devDependencies
*   **对于主进程和预加载脚本**，最佳实践是将依赖项外部化，只打包自己的代码。
    
    我们需要将应用程序需要的依赖安装到 `package.json` 的 `dependencies` 中。然后使用 `externalizeDepsPlugin` 将它们外部化而不打包它们。
    
    js
    
    ```
    import { defineConfig, externalizeDepsPlugin } from  'electron-vite'
    export  default  defineConfig({
     main: {
     plugins: [externalizeDepsPlugin()]
     },
     preload: {
     plugins: [externalizeDepsPlugin()]
     },
     // ...
    })
    ```
    
    ```
    import { defineConfig, externalizeDepsPlugin } from  'electron-vite'
    export  default  defineConfig({
     main: {
     plugins: [externalizeDepsPlugin()]
     },
     preload: {
     plugins: [externalizeDepsPlugin()]
     },
     // ...
    })
    ```
    
    在打包应用程序的时候，这些依赖也会一起打包，比如 `electron-builder`。不用担心他们会丢失。另一方面，`devDependencies` 则不会被打包。
    
    值得注意的是一些只支持 `ESM` 的模块（例如 `lowdb`、`execa`、`node-fetch`），我们不应该将其外部化。我们应该让 `electron-vite` 把它打包成一个 `CJS` 标准模块来支持 Electron。
    
    js
    
    ```
    import { defineConfig, externalizeDepsPlugin } from  'electron-vite'
    export  default  defineConfig({
     main: {
     plugins: [externalizeDepsPlugin({ exclude: ['lowdb'] })],
     build: {
     rollupOptions: {
     output: {
     manualChunks(id) {
     if (id.includes('lowdb')) {
     return  'lowdb'
     }
     }
     }
     }
     }
     },
     // ...
    })
    ```
    
    ```
    import { defineConfig, externalizeDepsPlugin } from  'electron-vite'
    export  default  defineConfig({
     main: {
     plugins: [externalizeDepsPlugin({ exclude: ['lowdb'] })],
     build: {
     rollupOptions: {
     output: {
     manualChunks(id) {
     if (id.includes('lowdb')) {
     return  'lowdb'
     }
     }
     }
     }
     }
     },
     // ...
    })
    ```
    
*   **对于渲染器**，它通常是完全打包的，所以依赖项最好安装在 `devDependencies` 中。这使得最终的分发包更小。
    

## 多窗口应用程序
当 Electron 应用程序具有多窗口时，这意味着可能有多个 html 页面和预加载脚本，你可以像下面一样修改你的配置文件：

```
// electron.vite.config.js
export  default {
 main: {},
 preload: {
 build: {
 rollupOptions: {
 input: {
 browser: resolve(__dirname, 'src/preload/browser.js'),
 webview: resolve(__dirname, 'src/preload/webview.js')
 }
 }
 }
 },
 renderer: {
 build: {
 rollupOptions: {
 input: {
 browser: resolve(__dirname, 'src/renderer/browser.html'),
 webview: resolve(__dirname, 'src/renderer/webview.html')
 }
 }
 }
 }
}
```

## 传递 CLI 参数给 Electron 应用程序
建议通过[环境变量和模式](https://cn.electron-vite.org/guide/env-and-mode)来处理命令行参数：

*   对于 Electron CLI 命令：

```
import { app } from  'electron'
if (import.meta.env.MAIN_VITE_LOG  ===  'true') {
 app.commandLine.appendSwitch('enable-logging', 'electron_debug.log')
}
```

在开发中，可以使用上面的方法来处理。分发后，你可以直接附加 Electron 支持的参数。例如 `.\app.exe --enable-logging`。

**提示**

electron-vite 已经支持 `inspect`、`inspect-brk` 和 `remote-debugging-port` 命令，所以你不需要为这些命令做这样的处理。有关更多详细信息，请参阅[命令行界面](https://cn.electron-vite.org/guide/cli#dev-%E9%80%89%E9%A1%B9)。

*   对于应用程序参数：

js

```
const  param  =  import.meta.env.MAIN_VITE_MY_PARAM  ===  'true'  ||  /--myparam/.test(process.argv[2])
```

```
const  param  =  import.meta.env.MAIN_VITE_MY_PARAM  ===  'true'  || /--myparam/.test(process.argv[2])
```

1.  在开发中，使用 `import.meta.env` 和 `Modes` 来决定是否使用。
2.  在生产中，使用 `process.argv` 来处理。