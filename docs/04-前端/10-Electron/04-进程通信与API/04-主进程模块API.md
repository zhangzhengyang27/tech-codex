---
title: "Electron App 模块"
description: "介绍 Electron 主进程核心模块：app 模块的生命周期事件、路径管理与应用控制方法，以及 BrowserWindow 的创建配置、窗口样式、安全特性与多窗口管理。"
keywords: [Electron App 模块]
category: Electron
tags: [Electron, 桌面应用, IPC, 打包]
---

# Electron App 模块

## 介绍

`app` 模块是 Electron 应用程序的核心，它负责管理整个应用程序的生命周期。该模块只能在 **主进程** 中使用

- **[Electron `app` 模块官方文档](https://www.electronjs.org/docs/latest/api/app)**

### 核心功能

- **生命周期管理**: 控制应用的启动、退出、以及在不同阶段触发的事件
- **系统集成**: 与操作系统进行交互，例如修改 Dock 栏、设置应用名称、处理协议链接等
- **路径管理**: 获取系统定义的各种路径，如用户数据目录、临时文件目录等
- **应用信息**: 获取应用名称、版本号等信息

### 主要功能和用途

- 创建和管理浏览器窗口 (`BrowserWindow`)
- 监听并响应应用的生命周期事件。
- 控制应用的菜单、Dock 栏、任务栏等
- 处理应用的启动参数和协议
- 管理应用的基本信息和设置

## 核心 API 详解

### 生命周期事件

`app` 模块通过触发一系列事件来让您有机会响应应用程序状态的变化

- **`ready`**: 当 Electron 完成初始化时触发。这是创建浏览器窗口等操作最安全的时机。也可以使用 `app.whenReady()`，它返回一个 Promise，在应用就绪时 resolve
- **`window-all-closed`**: 当所有的窗口都被关闭时触发
- **`before-quit`**: 在应用程序开始关闭窗口之前触发。可以通过 `event.preventDefault()` 来阻止应用退出
- **`will-quit`**: 在所有窗口都已关闭，应用即将退出时触发。同样可以通过 `event.preventDefault()` 阻止退出
- **`quit`**: 在应用退出时触发
- **`activate`** (macOS): 当应用被激活时触发，例如点击 Dock 图标

示例：

```js
const { app, BrowserWindow } = require("electron")

app.on("ready", () => {
  const win = new BrowserWindow()
  win.loadFile("index.html")
})

app.on("window-all-closed", () => {
  // 在 macOS 上，除非用户用 Cmd + Q 确定退出，
  // 否则应用在没有窗口的情况下仍会保持活跃。
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("before-quit", (event) => {
  // 在这里可以执行一些清理工作，例如保存用户数据
  // 如果有未完成的任务，可以阻止应用退出
  if (hasUnsavedChanges) {
    event.preventDefault()
    // 提示用户保存
  }
})

app.on("activate", () => {
  // 在 macOS 上，当点击 Dock 图标并且没有其他窗口打开时，
  // 通常在应用程序中重新创建一个窗口。
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
```

### 应用程序控制方法

- **`app.quit()`**: 尝试关闭所有窗口并退出应用程序

- **`app.exit(exitCode)`**: 强制退出应用，`exitCode` 默认为 0。这会立即终止应用，不会触发 `before-quit` 和 `will-quit` 事件

- **`app.relaunch()`**: 重新启动当前应用

- **`app.focus()`**: 在 Windows 和 macOS 上，将应用程序的第一个窗口置于前台

- **`app.hide()`** (macOS): 隐藏所有应用窗口

- **`app.show()`** (macOS): 显示所有被隐藏的应用窗口

### 路径管理

- **`app.getPath(name)`**: 获取与 `name` 关联的系统目录或文件的路径。常用的 `name` 包括：

  - `home`: 用户的主目录
  - `appData`: 当前用户的应用数据目录
  - `userData`: 存储应用配置文件的目录
  - `temp`: 临时文件夹
  - `desktop`: 当前用户的桌面目录
  - `documents`: "我的文档" 目录
  - `downloads`: 下载目录
  - `exe`: 当前可执行文件的路径
  - `module`: `libchromiumcontent` 库的路径

  ```javascript
  const path = require("path")
  const dbPath = path.join(app.getPath("userData"), "user-data.db")
  ```

- **`app.setPath(name, path)`**: 设置 `name` 对应的路径（注意：仅 `sessionData` 路径必须在 `ready` 事件触发前覆盖）

### 其他重要方法

- **`app.getName()`**: 获取当前应用的名称
- **`app.setName(name)`**: 设置当前应用的名称
- **`app.getVersion()`**: 获取应用的版本号
- **`app.getLocale()`**: 获取当前应用的语言环境
- **`app.isReady()`**: 返回一个布尔值，判断 `ready` 事件是否已触发
- **`app.addRecentDocument(path)`** (Windows & macOS): 将路径添加到最近使用的文档列表中
- **`app.clearRecentDocuments()`** (Windows & macOS): 清空最近使用的文档列表

## 使用示例

### 基础初始化代码

这是一个典型的 Electron 主进程文件 (`main.js`) 的结构：

```javascript
const { app, BrowserWindow } = require("electron")
const path = require("path")

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    }
  })

  mainWindow.loadFile("index.html")
}

app.whenReady().then(() => {
  createWindow()

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
```

### 处理单例应用

确保应用只有一个实例在运行

```javascript
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on("second-instance", (event, commandLine, workingDirectory) => {
    // 当运行第二个实例时，聚焦到主窗口
    if (myWindow) {
      if (myWindow.isMinimized()) myWindow.restore()
      myWindow.focus()
    }
  })

  // ... 创建窗口等
}
```

## 注意事项

### 平台差异

- **`window-all-closed`**: 在 macOS (`darwin`) 上，关闭所有窗口通常不会退出应用。应用会保持在 Dock 栏中，直到用户显式退出 (Cmd + Q)
- **`activate`**: 这个事件只在 macOS 上触发
- **菜单和 Dock/任务栏**: 不同平台有不同的 UI 约定，需要为不同平台编写特定的代码来处理

### 常见问题解决方案

- **API 在 `ready` 事件前调用**: 大多数 `app` 模块的 API 只能在 `ready` 事件触发后使用。如果过早调用，可能会导致错误或无效果
- **黑屏/白屏**: 如果在 `ready` 事件后没有正确创建窗口或加载内容，应用可能会显示一个空白窗口。确保窗口创建和内容加载逻辑正确

### 性能优化建议

- **延迟加载模块**: 只有在需要时才 `require` 模块，可以加快应用的启动速度
- **使用 `whenReady()`**: 相比于 `on('ready', ...)`，`app.whenReady()` 提供了更现代的 Promise-based API，代码更清晰

## 相关模块链接

- **[BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)**: 创建和控制应用窗口
- **[ipcMain](https://www.electronjs.org/docs/latest/api/ipc-main)**: 在主进程和渲染进程之间进行异步通信
- **[Menu](https://www.electronjs.org/docs/latest/api/menu)**: 创建原生应用菜单和上下文菜单
- **[dialog](https://www.electronjs.org/docs/latest/api/dialog)**: 显示用于打开/保存文件、警告等的原生系统对话框

## BrowserWindow

`BrowserWindow` 是 Electron 框架中用于创建和管理应用程序窗口的核心模块，它只能在主进程中使用。需要注意的是，在 `app` 模块的 `ready` 事件触发之前，该模块无法使用

### 1. 模块概述

- **核心角色**：每个 `BrowserWindow` 实例都创建一个由 Chromium 驱动的独立渲染进程，并在一个原生的桌面窗口中显示网页内容。这使得开发者可以使用 Web 技术（HTML, CSS, JavaScript）来构建桌面应用的图形用户界面。
- **跨平台性**：`BrowserWindow` 封装了不同操作系统（Windows, macOS, Linux）的窗口管理 API，提供了一套统一的接口，确保了应用在各个平台下拥有一致的窗口行为和外观

一个基础的窗口创建示例如下：

```javascript
const { BrowserWindow } = require("electron")

const win = new BrowserWindow({ width: 800, height: 600 })
win.loadURL("https://www.electronjs.org")
```

### 2. 主要功能特性

#### 窗口创建与控制

`BrowserWindow` 的构造函数接受一个配置对象，允许你精细地控制窗口的各个方面。

- **尺寸与位置**：
  - `width` / `height`：设置窗口的初始宽度和高度（单位：像素）。
  - `x` / `y`：设置窗口在屏幕上的初始位置。
  - `minWidth` / `minHeight` / `maxWidth` / `maxHeight`：限制窗口的最小和最大尺寸。
- **状态控制**：
  - `minimizable` / `maximizable` / `closable`：控制窗口是否可以最小化、最大化或关闭。
  - `fullscreen`：窗口是否以全屏模式启动。
  - `show: false`：创建一个初始不可见的窗口，常与 `ready-to-show` 事件配合使用，以避免加载过程中的白屏。

#### 窗口样式配置

你可以定制窗口的外观，使其更符合你的品牌或应用设计。

- **标题栏**：
  - `titleBarStyle`：在 macOS 上可设为 `hidden` 或 `customButtonsOnHover`，以隐藏标题栏或将红绿灯按钮嵌入窗口。
- **边框与背景**：
  - `frame: false`：创建无边框窗口，常用于实现完全自定义的窗口外观。
  - `transparent: true`：创建透明窗口，需要 `frame` 为 `false`。这允许你创建非矩形或有透明区域的窗口。
- **阴影**：
  - `hasShadow`：控制窗口是否应有阴影。

```javascript
const win = new BrowserWindow({
  width: 400,
  height: 300,
  frame: false,
  transparent: true,
  titleBarStyle: "hidden"
})
```

#### 优雅地显示窗口

当直接在窗口中加载页面时，用户可能会看到页面逐渐加载的过程，这对于原生应用来说不是一个好的体验。为了使窗口显示时没有视觉闪烁，可以采用以下两种策略：

##### 1. 使用 `ready-to-show` 事件

加载页面时，当渲染器进程第一次完成页面绘制，就会触发 `ready-to-show` 事件。在此事件后显示窗口可以确保流畅的视觉效果。

```javascript
const { BrowserWindow } = require("electron")

const win = new BrowserWindow({ show: false })

win.loadFile("index.html")

win.once("ready-to-show", () => {
  win.show()
})
```

这个事件通常在 `did-finish-load` 事件之后触发，但对于包含许多远程资源的大型页面，它可能会更早触发。

> **注意**：使用此事件意味着即使 `show` 为 `false`，渲染器也会被视作“可见”并进行绘制。如果设置了 `paintWhenInitiallyHidden: false`，此事件将永远不会触发。

##### 2. 设置 `backgroundColor` 属性

对于复杂的应用，`ready-to-show` 事件可能会触发得较晚，让应用感觉响应缓慢。在这种情况下，建议立即显示窗口，并设置一个与应用背景色接近的 `backgroundColor`。

```javascript
const { BrowserWindow } = require("electron")

const win = new BrowserWindow({ backgroundColor: "#2e2c29" })
win.loadURL("https://github.com")
```

即使用了 `ready-to-show` 事件，也推荐设置 `backgroundColor`，这能让应用感觉更原生。

#### 网页内容控制

`BrowserWindow` 实例通过其 `webContents` 属性来控制和交互窗口内加载的网页。

- **加载内容**：
  - `win.loadURL(url)`：加载远程 URL（如 `https://...`）或本地 HTML 文件（使用 `file://` 协议）。
  - `win.loadFile(filePath)`：加载本地 HTML 文件的推荐方式，比 `loadURL` 更简洁。
- **内容缩放**：
  - `win.webContents.setZoomFactor(factor)`：设置页面的缩放比例。
- **开发者工具**：
  - `win.webContents.openDevTools()`：打开 Chromium 开发者工具，用于调试网页内容。
  - `win.webContents.closeDevTools()`：关闭开发者工具。

### 3. 生命周期管理

`BrowserWindow` 实例会触发一系列事件，让你可以在窗口生命周期的关键节点执行操作。

- **`ready-to-show`**：当页面内容加载完成，但窗口尚未显示时触发。这是显示窗口的最佳时机，可以避免视觉上的闪烁。
  ```javascript
  const win = new BrowserWindow({ show: false })
  win.loadFile("index.html")
  win.once("ready-to-show", () => {
    win.show()
  })
  ```
- **`close`**：在窗口即将关闭时触发。你可以通过 `event.preventDefault()` 来阻止窗口关闭，例如在关闭前提示用户保存未完成的工作。
- **`closed`**：在窗口已经被关闭后触发。此时你应该解除对窗口对象的引用，以便垃圾回收器回收内存。
  ```javascript
  let win = new BrowserWindow()
  win.on("closed", () => {
    win = null // 解除引用
  })
  ```
- **`destroy()`**：调用 `win.destroy()` 会立即销毁窗口，绕过 `close` 事件。

### 4. 多窗口管理

Electron 应用可以同时管理多个 `BrowserWindow` 实例。

- **父子窗口**：通过 `parent` 选项可以创建一个子窗口。子窗口将始终显示在父窗口的顶部。
- **模态窗口**：通过 `modal: true` 选项可以创建一个模态窗口。模态窗口会禁用其父窗口，直到该窗口关闭。常用于对话框和偏好设置。
  ```javascript
  const parent = new BrowserWindow()
  const child = new BrowserWindow({ parent: parent, modal: true })
  ```
- **窗口间通信**：不同窗口的渲染进程是隔离的。它们之间的通信需要通过主进程作为中介，使用 `ipcMain` 和 `ipcRenderer` 模块来完成。

### 5. 安全特性

保护用户数据和应用安全至关重要。`BrowserWindow` 的 `webPreferences` 选项提供了强大的安全配置。

- **沙箱模式**：`sandbox: true` 会在一个受限的 Chromium 沙箱环境中渲染页面，限制其对系统资源的访问。
- **Node.js 集成**：`nodeIntegration: false` (默认) 和 `contextIsolation: true` (默认) 是推荐的安全实践。它们可以防止渲染进程中的第三方脚本滥用 Node.js API。当需要从渲染进程安全地调用主进程功能时，应使用 `contextBridge` 和 `preload` 脚本。
- **内容安全策略 (CSP)**：可以通过 `session` 模块配置 CSP，限制页面可以加载的资源来源，有效防止跨站脚本（XSS）攻击。

### 6. 高级功能

- **原生菜单**：可以为窗口创建和设置自定义的原生应用菜单或上下文菜单。
- **任务栏进度条**：在 Windows 和 macOS 上，可以使用 `win.setProgressBar(progress)` 在任务栏或 Dock 图标上显示进度条。
- **窗口截图**：`win.capturePage()` 可以捕获窗口当前内容的截图。
- **Kiosk 模式**：`kiosk: true` 使应用进入自助服务终端模式，即全屏且无法退出，适用于公共展示等场景。

### 7. 典型使用场景

- **主应用窗口**：应用启动时创建的主要界面
- **设置/偏好窗口**：通常实现为模态窗口，用于配置应用参数
- **辅助工具窗口**：如浮动的工具面板，可能会使用无边框和透明窗口
- **通知/弹窗界面**：在屏幕角落创建小型的、自动消失的无边框窗口，用于显示通知