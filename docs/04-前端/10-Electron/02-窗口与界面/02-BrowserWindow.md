---
title: BrowserWindow
description: "BrowserWindow 是 Electron 中用于创建和控制浏览器窗口的核心模块。每个 Electron 应用至少会有一个主窗口。"
keywords: [BrowserWindow]
category: Electron
tags: [Electron, 桌面应用, IPC, 打包]
---


# BrowserWindow

`BrowserWindow` 是 Electron 中用于创建和控制浏览器窗口的核心模块。每个 Electron 应用至少会有一个主窗口。

## 系统架构

### 进程模型

Electron 采用多进程架构，每个 `BrowserWindow` 实例都在独立的渲染进程中运行：

```
┌─────────────────────────────────────────────────────────────┐
│                      主进程 (Main Process)                    │
│  - 创建和管理 BrowserWindow 实例                              │
│  - 处理原生 API 调用                                          │
│  - 管理应用生命周期                                           │
└───────────────────────┬─────────────────────────────────────┘
                        │ IPC 通信
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ 渲染进程 1     │ │ 渲染进程 2     │ │ 渲染进程 N     │
│ BrowserWindow │ │ BrowserWindow │ │ BrowserWindow │
│ - 运行 Web 内容│ │ - 运行 Web 内容│ │ - 运行 Web 内容│
│ - 独立上下文   │ │ - 独立上下文   │ │ - 独立上下文   │
└───────────────┘ └───────────────┘ └───────────────┘
```

### 核心组件

| 组件 | 职责 | 所在进程 |
|------|------|---------|
| BrowserWindow | 窗口创建与控制 | 主进程 |
| webContents | 网页内容管理 | 主进程/渲染进程 |
| preload.js | 安全桥接脚本 | 渲染进程 |
| IPC | 进程间通信 | 主进程/渲染进程 |

## 基本用法

### 创建窗口

```javascript
const { BrowserWindow } = require('electron')
const path = require('path')

const win = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    preload: path.join(__dirname, 'preload.js')
  }
})

// 加载内容
win.loadFile('index.html')
// 或加载远程 URL
win.loadURL('https://example.com')
```

## 窗口选项

### 尺寸与位置

```javascript
const win = new BrowserWindow({
  width: 800,              // 窗口宽度（像素）
  height: 600,             // 窗口高度（像素）
  minWidth: 400,           // 最小宽度
  minHeight: 300,          // 最小高度
  maxWidth: 1920,          // 最大宽度
  maxHeight: 1080,         // 最大高度
  x: 100,                  // 窗口 X 坐标
  y: 100,                  // 窗口 Y 坐标
  center: true,            // 居中显示（当 x/y 未指定时有效）
  resizable: true,         // 是否可调整大小
  movable: true,           // 是否可移动
  minimizable: true,       // 是否可最小化
  maximizable: true,       // 是否可最大化
  closable: true           // 是否可关闭
})
```

### 外观样式

```javascript
const win = new BrowserWindow({
  title: 'My App',         // 窗口标题
  icon: '/path/to/icon.png', // 窗口图标
  frame: true,             // 是否显示边框
  transparent: false,      // 是否透明
  backgroundColor: '#fff', // 背景色（未加载内容时显示）
  titleBarStyle: 'default', // 标题栏样式（macOS）
  trafficLightPosition: { x: 10, y: 10 }, // macOS 红绿灯位置
  hasShadow: true,         // macOS 窗口阴影
  opacity: 1.0,            // 窗口透明度（Windows/macOS）
  vibrancy: 'appearance-based' // macOS 毛玻璃效果
})
```

**titleBarStyle 选项（仅 macOS）：**

| 值 | 说明 |
|----|------|
| `default` | 标准标题栏 |
| `hidden` | 隐藏标题栏，保留红绿灯按钮 |
| `hiddenInset` | 红绿灯按钮内嵌显示 |
| `customButtonsOnHover` | 鼠标悬停时显示红绿灯 |

### Web 安全选项

```javascript
const win = new BrowserWindow({
  webPreferences: {
    // 安全相关
    nodeIntegration: false,        // 禁用 Node.js 集成（推荐）
    contextIsolation: true,        // 启用上下文隔离（推荐）
    sandbox: true,                 // 启用沙箱
    webSecurity: true,             // 启用同源策略
    allowRunningInsecureContent: false, // 禁止加载不安全内容
    
    // 功能相关
    preload: path.join(__dirname, 'preload.js'),
    plugins: true,                 // 启用插件
    experimentalFeatures: false,   // 禁用实验性功能
    spellcheck: true,              // 拼写检查
    devTools: true,                // 开发者工具
    
    // 已弃用
    enableRemoteModule: false,     // 禁用 remote 模块（已弃用）
    nodeIntegrationInWorker: false // Worker 中禁用 Node.js
  }
})
```

## 预加载脚本（Preload Script）

### 概述

预加载脚本是在渲染进程加载网页内容之前执行的脚本，它运行在渲染进程中但拥有访问 Node.js API 的权限。通过预加载脚本可以安全地暴露特定 API 给渲染进程。

### 安全架构

```
┌─────────────────────────────────────────────────────────────┐
│                       渲染进程                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              隔离上下文 (Isolated Context)              │  │
│  │  - 无法访问 Node.js API                                │  │
│  │  - 只能使用 contextBridge 暴露的 API                    │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ▲                                   │
│                          │ contextBridge                     │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              预加载脚本 (Preload Script)                │  │
│  │  - 可访问 Node.js API                                  │  │
│  │  - 可访问 DOM                                          │  │
│  │  - 负责安全地暴露 API                                   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 基本实现

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron')

// 安全地暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 文件操作
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  writeFile: (path, data) => ipcRenderer.invoke('write-file', path, data),
  
  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // 事件监听
  onUpdate: (callback) => {
    ipcRenderer.on('update', (event, data) => callback(data))
  },
  
  // 移除监听
  removeUpdateListener: (callback) => {
    ipcRenderer.removeListener('update', callback)
  }
})
```

```javascript
// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const fs = require('fs')
const path = require('path')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  
  mainWindow.loadFile('index.html')
}

// 处理文件读取
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Text Files', extensions: ['txt', 'md'] }]
    })
    
    if (result.canceled) return null
    
    const content = fs.readFileSync(result.filePaths[0], 'utf-8')
    return { path: result.filePaths[0], content }
  } catch (error) {
    return { error: error.message }
  }
})

// 处理文件写入
ipcMain.handle('write-file', async (event, filePath, data) => {
  try {
    const result = await dialog.showSaveDialog({
      defaultPath: 'untitled.txt',
      filters: [{ name: 'Text Files', extensions: ['txt'] }]
    })
    
    if (result.canceled) return false
    
    fs.writeFileSync(result.filePath, data)
    return true
  } catch (error) {
    console.error(error)
    return false
  }
})

app.whenReady().then(createWindow)
```

```javascript
// renderer.js - 使用暴露的 API
async function openFile() {
  const result = await window.electronAPI.readFile()
  if (result && !result.error) {
    console.log('File content:', result.content)
  }
}

async function saveFile(content) {
  const success = await window.electronAPI.writeFile(null, content)
  if (success) {
    console.log('File saved!')
  }
}
```

### 最佳实践

1. **最小权限原则**：只暴露必要的 API
2. **使用 IPC invoke**：对于需要返回值的操作，使用 `invoke/handle` 而非 `send/on`
3. **验证输入**：在主进程中验证所有来自渲染进程的数据
4. **避免暴露整个对象**：只暴露必要的函数，避免暴露整个 `ipcRenderer` 或 `fs` 模块

```javascript
// ❌ 不安全：暴露整个模块
contextBridge.exposeInMainWorld('fs', fs)
contextBridge.exposeInMainWorld('ipcRenderer', ipcRenderer)

// ✅ 安全：只暴露特定功能
contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (path) => ipcRenderer.invoke('read-file', path)
})
```

## 常用方法

### 窗口控制

```javascript
// 显示/隐藏
win.show()                    // 显示窗口
win.hide()                    // 隐藏窗口（不销毁）
win.close()                   // 关闭窗口
win.destroy()                 // 强制销毁窗口（不触发 close 事件）

// 最小化/最大化/还原
win.minimize()                // 最小化
win.maximize()                // 最大化
win.unmaximize()              // 取消最大化
win.isMaximized()             // 检查是否最大化

// 全屏
win.setFullScreen(true)       // 设置全屏
win.isFullScreen()            // 检查是否全屏
win.setSimpleFullScreen(true) // macOS 简单全屏模式

// 置顶
win.setAlwaysOnTop(true, 'floating')  // 置顶
win.isAlwaysOnTop()                   // 检查是否置顶

// 焦点
win.focus()                   // 获取焦点
win.blur()                    // 失去焦点
win.isFocused()               // 检查是否获得焦点
```

### 内容加载

```javascript
// 加载本地文件
win.loadFile('index.html')
win.loadFile('pages/about.html', { hash: 'section1' })

// 加载 URL
win.loadURL('https://example.com')
win.loadURL('https://example.com', { userAgent: 'Custom UA' })

// 加载 HTML 字符串
win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

// 重新加载
win.reload()                  // 刷新页面
win.webContents.reloadIgnoringCache() // 忽略缓存刷新
```

### 尺寸与位置

```javascript
// 获取尺寸
const [width, height] = win.getSize()
const [minWidth, minHeight] = win.getMinimumSize()
const [maxWidth, maxHeight] = win.getMaximumSize()

// 设置尺寸
win.setSize(1024, 768)
win.setMinimumSize(800, 600)
win.setMaximumSize(1920, 1080)

// 获取位置
const [x, y] = win.getPosition()

// 设置位置
win.setPosition(100, 100)

// 获取边界（位置和尺寸）
const bounds = win.getBounds() // { x, y, width, height }
win.setBounds({ x: 100, y: 100, width: 800, height: 600 })

// 居中显示
win.center()
```

### 开发者工具

```javascript
// 打开开发者工具
win.webContents.openDevTools()
win.webContents.openDevTools({ mode: 'detach' }) // 独立窗口

// 关闭开发者工具
win.webContents.closeDevTools()

// 切换开发者工具
win.webContents.toggleDevTools()

// 检查是否打开
win.webContents.isDevToolsOpened()
```

## 事件监听

### 窗口生命周期事件

```javascript
// 窗口即将关闭（可阻止）
win.on('close', (event) => {
  event.preventDefault() // 阻止关闭，可用于确认对话框
})

// 窗口已关闭
win.on('closed', () => {
  win = null // 解除引用，允许垃圾回收
})

// 窗口显示
win.on('show', () => console.log('Window shown'))

// 窗口隐藏
win.on('hide', () => console.log('Window hidden'))
```

### 窗口状态事件

```javascript
// 窗口大小改变
win.on('resize', () => {
  const [width, height] = win.getSize()
  console.log(`Window size: ${width}x${height}`)
})

// 窗口移动
win.on('move', () => {
  const [x, y] = win.getPosition()
  console.log(`Window position: (${x}, ${y})`)
})

// 最大化/取消最大化
win.on('maximize', () => console.log('Maximized'))
win.on('unmaximize', () => console.log('Unmaximized'))

// 最小化/还原
win.on('minimize', () => console.log('Minimized'))
win.on('restore', () => console.log('Restored'))

// 全屏切换
win.on('enter-full-screen', () => console.log('Entered full screen'))
win.on('leave-full-screen', () => console.log('Left full screen'))
```

### 焦点事件

```javascript
// 获得焦点
win.on('focus', () => console.log('Focused'))

// 失去焦点
win.on('blur', () => console.log('Blurred'))
```

### 页面加载事件

```javascript
// 页面加载完成
win.webContents.on('did-finish-load', () => {
  console.log('Page loaded')
})

// 页面加载失败
win.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
  console.error(`Load failed: ${errorDescription}`)
})

// 页面标题更新
win.on('page-title-updated', (event, title) => {
  console.log(`Title: ${title}`)
})
```

## 窗口状态管理

### 保存和恢复窗口状态

```javascript
const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

const statePath = path.join(app.getPath('userData'), 'window-state.json')

// 读取窗口状态
function loadWindowState() {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf-8'))
  } catch {
    return null
  }
}

// 保存窗口状态
function saveWindowState(win) {
  const state = {
    bounds: win.getBounds(),
    isMaximized: win.isMaximized(),
    isFullScreen: win.isFullScreen()
  }
  fs.writeFileSync(statePath, JSON.stringify(state))
}

let mainWindow

function createWindow() {
  const savedState = loadWindowState()
  
  mainWindow = new BrowserWindow({
    width: savedState?.bounds?.width || 1200,
    height: savedState?.bounds?.height || 800,
    x: savedState?.bounds?.x,
    y: savedState?.bounds?.y,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true
    }
  })
  
  // 恢复最大化状态
  if (savedState?.isMaximized) {
    mainWindow.maximize()
  }
  
  // 恢复全屏状态
  if (savedState?.isFullScreen) {
    mainWindow.setFullScreen(true)
  }
  
  mainWindow.loadFile('index.html')
  
  // 窗口关闭时保存状态
  mainWindow.on('close', () => {
    saveWindowState(mainWindow)
  })
}

app.whenReady().then(createWindow)
```

## 多窗口管理

### 窗口管理器实现

```javascript
// windowManager.js
const { BrowserWindow } = require('electron')
const path = require('path')

class WindowManager {
  constructor() {
    this.windows = new Map()
  }
  
  // 创建窗口
  create(id, options) {
    const win = new BrowserWindow({
      ...options,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        ...options.webPreferences
      }
    })
    
    this.windows.set(id, win)
    
    win.on('closed', () => {
      this.windows.delete(id)
    })
    
    return win
  }
  
  // 获取窗口
  get(id) {
    return this.windows.get(id)
  }
  
  // 获取所有窗口
  getAll() {
    return Array.from(this.windows.values())
  }
  
  // 关闭指定窗口
  close(id) {
    const win = this.windows.get(id)
    if (win) win.close()
  }
  
  // 关闭所有窗口
  closeAll() {
    this.windows.forEach(win => win.close())
  }
  
  // 获取窗口数量
  get count() {
    return this.windows.size
  }
}

module.exports = WindowManager
```

### 使用示例

```javascript
// main.js
const { app, ipcMain } = require('electron')
const WindowManager = require('./windowManager')

const manager = new WindowManager()

function createMainWindow() {
  const win = manager.create('main', {
    width: 1200,
    height: 800,
    title: 'Main Window'
  })
  
  win.loadFile('index.html')
  return win
}

function createSettingsWindow() {
  // 如果窗口已存在，聚焦它
  if (manager.get('settings')) {
    manager.get('settings').focus()
    return
  }
  
  const win = manager.create('settings', {
    width: 600,
    height: 400,
    parent: manager.get('main'),
    modal: false,
    title: 'Settings'
  })
  
  win.loadFile('settings.html')
  return win
}

// IPC 处理
ipcMain.on('open-settings', createSettingsWindow)
ipcMain.on('close-settings', () => manager.close('settings'))

app.whenReady().then(createMainWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

## 父子窗口与模态窗口

```javascript
const parent = new BrowserWindow({ width: 800, height: 600 })

// 子窗口
const child = new BrowserWindow({
  width: 400,
  height: 300,
  parent: parent    // 设置父窗口
})

// 模态窗口
const modal = new BrowserWindow({
  width: 400,
  height: 300,
  parent: parent,
  modal: true       // 模态窗口（阻止与父窗口交互）
})

// 子窗口行为
// - 关闭父窗口时，子窗口也会关闭
// - 最小化父窗口时，子窗口也会最小化
// - 子窗口始终显示在父窗口上方
```

## 完整示例

```javascript
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1a1a2e',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
      webSecurity: true
    }
  })

  mainWindow.loadFile('index.html')

  // 开发模式下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  // 窗口关闭处理
  mainWindow.on('close', (event) => {
    // 可以在这里添加确认对话框逻辑
    // event.preventDefault() // 阻止关闭
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// 应用就绪
app.whenReady().then(createWindow)

// 所有窗口关闭时退出（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// macOS 点击 Dock 图标时重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// IPC 处理示例
ipcMain.handle('show-open-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})

ipcMain.handle('show-save-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options)
  return result
})
```

## 常见问题解答

### Q: 如何在窗口之间共享数据？

A: 推荐使用以下方法：

```javascript
// 方法 1: 通过 IPC 通信
// 窗口 A 发送数据
winA.webContents.send('data-update', data)

// 窗口 B 接收数据
// 在 preload.js 中暴露监听器
contextBridge.exposeInMainWorld('electronAPI', {
  onDataUpdate: (callback) => ipcRenderer.on('data-update', callback)
})

// 方法 2: 使用共享存储（如 electron-store）
const Store = require('electron-store')
const store = new Store()

// 主进程设置
store.set('sharedData', data)

// 渲染进程读取（通过 preload）
contextBridge.exposeInMainWorld('store', {
  get: (key) => store.get(key),
  set: (key, value) => store.set(key, value)
})
```

### Q: 如何防止窗口被意外关闭？

```javascript
let forceQuit = false

mainWindow.on('close', (event) => {
  if (!forceQuit) {
    event.preventDefault()
    
    dialog.showMessageBox(mainWindow, {
      type: 'question',
      buttons: ['取消', '确定退出'],
      title: '确认退出',
      message: '确定要退出应用吗？未保存的更改将丢失。'
    }).then(result => {
      if (result.response === 1) {
        forceQuit = true
        mainWindow.close()
      }
    })
  }
})
```

### Q: 如何实现单实例应用（只允许运行一个实例）？

```javascript
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // 当运行第二个实例时，聚焦到已有窗口
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
  
  app.whenReady().then(createWindow)
}
```

### Q: 如何获取当前聚焦的窗口？

```javascript
const { BrowserWindow } = require('electron')

// 方法 1: 使用静态方法
const focusedWindow = BrowserWindow.getFocusedWindow()

// 方法 2: 从 webContents 获取
const focusedWindow = BrowserWindow.fromWebContents(webContents)

// 方法 3: 遍历所有窗口
const allWindows = BrowserWindow.getAllWindows()
const focusedWindow = allWindows.find(win => win.isFocused())
```

### Q: 如何实现窗口截图？

```javascript
// 捕获整个窗口
async function captureWindow(win) {
  const image = await win.webContents.capturePage()
  const buffer = image.toPNG()
  
  // 保存到文件
  fs.writeFileSync('screenshot.png', buffer)
  
  // 或返回 base64
  return image.toDataURL()
}

// 捕获指定区域
async function captureRegion(win, rect) {
  const image = await win.webContents.capturePage(rect)
  return image.toDataURL()
}
```

### Q: 如何设置窗口图标（跨平台）？

```javascript
const path = require('path')

const win = new BrowserWindow({
  icon: path.join(__dirname, 'assets', 'icon.png')
})

// 推荐的图标文件结构
// assets/
// ├── icon.ico        (Windows，推荐 256x256)
// ├── icon.icns       (macOS，包含多种尺寸)
// └── icon.png        (Linux，推荐 512x512)

// 自动选择正确格式
function getIconPath() {
  switch (process.platform) {
    case 'win32':
      return path.join(__dirname, 'assets', 'icon.ico')
    case 'darwin':
      return path.join(__dirname, 'assets', 'icon.icns')
    default:
      return path.join(__dirname, 'assets', 'icon.png')
  }
}
```

### Q: 如何解决窗口白屏问题？

```javascript
// 方法 1: 设置背景色
const win = new BrowserWindow({
  backgroundColor: '#1a1a2e', // 匹配应用主题
  show: false // 先不显示
})

// 方法 2: 等待页面加载完成后再显示
win.once('ready-to-show', () => {
  win.show()
})

// 方法 3: 添加加载页面
win.loadFile('loading.html')
// 然后重定向到主页面
setTimeout(() => {
  win.loadFile('index.html')
}, 100)
```

## 参考链接

- [官方文档 - BrowserWindow](https://www.electronjs.org/docs/latest/api/browser-window)
- [官方文档 - 安全最佳实践](https://www.electronjs.org/docs/latest/tutorial/security)
- [03-无边框窗口](03-无边框窗口.md)
- [05-窗口拖拽与缩放](05-窗口拖拽与缩放.md)
