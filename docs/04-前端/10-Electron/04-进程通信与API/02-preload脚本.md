---
title: preload脚本
description: "Preload 脚本是 Electron 安全架构的核心组件，它在渲染进程加载网页内容之前运行，作为主进程和渲染进程之间的安全桥梁，可以安全地暴露 Node.js 能力给渲染进程。"
keywords: [preload脚本]
category: Electron
tags: [Electron, 桌面应用, IPC, 打包]
---


# Preload 脚本

Preload 脚本是 Electron 安全架构的核心组件，它在渲染进程加载网页内容之前运行，作为主进程和渲染进程之间的安全桥梁，可以安全地暴露 Node.js 能力给渲染进程。

## 系统架构

### 渲染进程安全模型

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           渲染进程                                        │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                      隔离世界 (Isolated World)                      │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                     网页 JavaScript                          │  │  │
│  │  │  - 无法访问 Node.js API                                      │  │  │
│  │  │  - 无法访问 Electron API                                     │  │  │
│  │  │  - 只能使用 contextBridge 暴露的 API                          │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                              ▲                                     │  │
│  │                              │ contextBridge.exposeInMainWorld    │  │
│  │                              │                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                     Preload 脚本                              │  │  │
│  │  │  - 可访问 Node.js API                                        │  │  │
│  │  │  - 可访问 Electron API                                       │  │  │
│  │  │  - 可访问部分 DOM（contextIsolation 启用前）                   │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ IPC
                                    ▼
                         ┌─────────────────┐
                         │     主进程       │
                         └─────────────────┘
```

### contextIsolation 工作原理

```
┌────────────────────────────────────────────────────────────────────────┐
│                           渲染进程                                       │
│                                                                        │
│  contextIsolation: true                                               │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  主世界 (Main World)              │  隔离世界 (Isolated World)    │ │
│  │  ┌────────────────────────────┐   │  ┌────────────────────────┐  │ │
│  │  │ window.electronAPI        │   │  │ 网页 JavaScript         │  │ │
│  │  │ {                         │   │  │ - 独立的全局对象         │  │ │
│  │  │   send: Function,         │◄──┼──│ - 无法修改 preload       │  │ │
│  │  │   invoke: Function,       │   │  │   定义的属性             │  │ │
│  │  │   on: Function            │   │  │ - 原型链隔离             │  │ │
│  │  │ }                         │   │  └────────────────────────┘  │ │
│  │  └────────────────────────────┘   │                              │ │
│  │         ↑ contextBridge           │                              │ │
│  └───────────────────────────────────┼──────────────────────────────┘ │
│                                      │                                │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                        Preload 脚本                               │ │
│  │  - Node.js 环境                                                   │ │
│  │  - Electron API                                                   │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                           渲染进程                                       │
│                                                                        │
│  contextIsolation: false (不推荐)                                      │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │  共享世界 (Shared World)                                          │ │
│  │  ┌────────────────────────────────────────────────────────────┐  │ │
│  │  │ window.electronAPI + 网页 JavaScript                       │  │ │
│  │  │ - 共享全局对象                                              │  │ │
│  │  │ - 网页可以修改/删除暴露的 API                                │  │ │
│  │  │ - 网页可以直接访问 preload 的变量                           │  │ │
│  │  │ ⚠️ 安全风险高                                               │  │ │
│  │  └────────────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Preload 脚本特性

### 执行时机

```javascript
// 加载顺序
// 1. BrowserWindow 创建
// 2. Preload 脚本执行 ← 此时可以访问 Node.js/Electron API
// 3. DOMContentLoaded 事件
// 4. 网页 JavaScript 执行
// 5. window.onload 事件
```

### 运行环境

| 特性 | Preload 脚本 | 网页 JavaScript |
|------|-------------|----------------|
| Node.js API | ✅ 可访问 | ❌ 不可访问 |
| Electron API | ✅ 可访问 | ❌ 不可访问 |
| DOM API | ✅ 可访问* | ✅ 可访问 |
| window 对象 | ✅ 独立副本 | ✅ 主世界副本 |
| contextBridge | ✅ 可使用 | ❌ 不可使用 |

*contextIsolation 启用时，preload 访问的是隔离世界的 DOM

### 基本配置

```javascript
const { BrowserWindow } = require('electron')
const path = require('path')

const win = new BrowserWindow({
  webPreferences: {
    // preload 脚本路径（必须是绝对路径）
    preload: path.join(__dirname, 'preload.js'),
    
    // 安全配置
    contextIsolation: true,    // 启用上下文隔离（推荐）
    nodeIntegration: false,    // 禁用 Node.js 集成（推荐）
    sandbox: true,             // 启用沙箱（推荐）
    
    // 其他配置
    webSecurity: true,         // 启用同源策略
    allowRunningInsecureContent: false
  }
})
```

## contextBridge API

### 基本用法

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron')

// 暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 方法
  send: (channel, data) => ipcRenderer.send(channel, data),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  
  // 属性（值会被克隆）
  platform: process.platform,
  versions: process.versions,
  
  // 同步值
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32'
})
```

```javascript
// renderer.js
// 使用暴露的 API
console.log(window.electronAPI.platform)  // 'darwin', 'win32', 'linux'
console.log(window.electronAPI.isMac)     // true/false

// 调用方法
window.electronAPI.send('message', 'Hello')
const result = await window.electronAPI.invoke('getData')
```

### API 设计模式

#### 模式 1: 扁平 API

```javascript
// preload.js
contextBridge.exposeInMainWorld('api', {
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveFile: (path, content) => ipcRenderer.invoke('dialog:saveFile', path, content),
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close')
})

// renderer.js
await window.api.openFile()
window.api.minimize()
```

#### 模式 2: 分层 API

```javascript
// preload.js
contextBridge.exposeInMainWorld('electron', {
  // 文件操作
  file: {
    open: () => ipcRenderer.invoke('file:open'),
    save: (path, content) => ipcRenderer.invoke('file:save', path, content),
    read: (path) => ipcRenderer.invoke('file:read', path),
    delete: (path) => ipcRenderer.invoke('file:delete', path)
  },
  
  // 窗口控制
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    setSize: (width, height) => ipcRenderer.send('window:setSize', width, height)
  },
  
  // 存储
  store: {
    get: (key) => ipcRenderer.invoke('store:get', key),
    set: (key, value) => ipcRenderer.invoke('store:set', key, value),
    delete: (key) => ipcRenderer.invoke('store:delete', key)
  }
})

// renderer.js
await window.electron.file.open()
await window.electron.store.set('theme', 'dark')
window.electron.window.minimize()
```

#### 模式 3: 事件订阅

```javascript
// preload.js
contextBridge.exposeInMainWorld('electron', {
  // 订阅事件（返回取消订阅函数）
  onFileChanged: (callback) => {
    const handler = (event, ...args) => callback(...args)
    ipcRenderer.on('file:changed', handler)
    
    // 返回清理函数
    return () => ipcRenderer.removeListener('file:changed', handler)
  },
  
  // 一次性订阅
  onceReady: (callback) => {
    ipcRenderer.once('app:ready', (event, data) => callback(data))
  }
})

// renderer.js
const unsubscribe = window.electron.onFileChanged((path, changes) => {
  console.log('File changed:', path, changes)
})

// 取消订阅
unsubscribe()
```

### 数据类型限制

contextBridge 只能传递可序列化的数据：

```javascript
// preload.js
contextBridge.exposeInMainWorld('api', {
  // ✅ 支持
  string: 'hello',
  number: 123,
  boolean: true,
  null: null,
  array: [1, 2, 3],
  object: { a: 1, b: 2 },
  date: new Date(),          // 正确克隆（保持 Date 类型）
  buffer: Buffer.from('hi'), // 会被序列化为 Uint8Array
  func: () => {},            // 函数会被代理，可跨上下文调用
  promise: Promise.resolve(),// Promise 会被代理
  
  // ❌ 不支持
  symbol: Symbol('test'),    // 会被丢弃
  domElement: document.body  // 原型链丢失，仅保留自有属性
})
```

## 安全最佳实践

### 通道白名单

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron')

// 定义允许的通道
const ALLOWED_CHANNELS = {
  invoke: [
    'dialog:openFile',
    'dialog:saveFile',
    'file:read',
    'file:write',
    'store:get',
    'store:set'
  ],
  send: [
    'window:minimize',
    'window:maximize',
    'window:close'
  ],
  on: [
    'file:changed',
    'update:available',
    'notification:show'
  ]
}

function validateChannel(type, channel) {
  if (!ALLOWED_CHANNELS[type]?.includes(channel)) {
    throw new Error(`Invalid IPC channel: ${channel}`)
  }
  return true
}

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, ...args) => {
    validateChannel('invoke', channel)
    return ipcRenderer.invoke(channel, ...args)
  },
  
  send: (channel, ...args) => {
    validateChannel('send', channel)
    ipcRenderer.send(channel, ...args)
  },
  
  on: (channel, callback) => {
    validateChannel('on', channel)
    const handler = (event, ...args) => callback(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
})
```

### 参数验证

```javascript
// preload.js
contextBridge.exposeInMainWorld('fileAPI', {
  read: (filePath) => {
    // 类型验证
    if (typeof filePath !== 'string') {
      throw new TypeError('filePath must be a string')
    }
    
    // 路径安全验证
    if (filePath.includes('..')) {
      throw new Error('Path traversal not allowed')
    }
    
    // 长度限制
    if (filePath.length > 260) {
      throw new Error('Path too long')
    }
    
    return ipcRenderer.invoke('file:read', filePath)
  },
  
  write: (filePath, content) => {
    if (typeof filePath !== 'string') {
      throw new TypeError('filePath must be a string')
    }
    if (typeof content !== 'string') {
      throw new TypeError('content must be a string')
    }
    if (content.length > 10 * 1024 * 1024) { // 10MB
      throw new Error('Content too large')
    }
    
    return ipcRenderer.invoke('file:write', filePath, content)
  }
})
```

### 禁止暴露危险 API

```javascript
// ❌ 危险：暴露整个 ipcRenderer
contextBridge.exposeInMainWorld('ipc', ipcRenderer)

// ❌ 危险：暴露整个 electron 模块
contextBridge.exposeInMainWorld('electron', require('electron'))

// ❌ 危险：暴露 require
contextBridge.exposeInMainWorld('require', require)

// ❌ 危险：暴露 process
contextBridge.exposeInMainWorld('process', process)

// ✅ 安全：只暴露需要的方法
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    // 白名单验证
    if (ALLOWED_CHANNELS.send.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  }
})
```

## 常见使用场景

### 文件操作

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('fileAPI', {
  // 打开文件对话框
  open: (options = {}) => ipcRenderer.invoke('dialog:openFile', options),
  
  // 保存文件对话框
  save: (defaultPath, content) => ipcRenderer.invoke('dialog:saveFile', { defaultPath, content }),
  
  // 读取文件
  read: (path) => ipcRenderer.invoke('file:read', path),
  
  // 写入文件
  write: (path, content) => ipcRenderer.invoke('file:write', path, content),
  
  // 删除文件
  delete: (path) => ipcRenderer.invoke('file:delete', path),
  
  // 监听文件变化
  onFileChanged: (callback) => {
    ipcRenderer.on('file:changed', (event, path) => callback(path))
    return () => ipcRenderer.removeAllListeners('file:changed')
  }
})
```

```javascript
// main.js
const { ipcMain, dialog } = require('electron')
const fs = require('fs/promises')

ipcMain.handle('dialog:openFile', async (event, options) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    ...options
  })
  
  if (result.canceled) return null
  
  const content = await fs.readFile(result.filePaths[0], 'utf-8')
  return {
    path: result.filePaths[0],
    content
  }
})

ipcMain.handle('file:write', async (event, path, content) => {
  await fs.writeFile(path, content, 'utf-8')
  return true
})
```

```javascript
// renderer.js
async function handleOpenFile() {
  const result = await window.fileAPI.open({
    filters: [{ name: 'Text', extensions: ['txt', 'md'] }]
  })
  
  if (result) {
    document.getElementById('editor').value = result.content
    currentFilePath = result.path
  }
}

// 监听文件变化
window.fileAPI.onFileChanged((path) => {
  if (path === currentFilePath) {
    // 提示用户文件已更改
    showReloadPrompt()
  }
})
```

### 窗口控制

```javascript
// preload.js
contextBridge.exposeInMainWorld('windowAPI', {
  minimize: () => ipcRenderer.send('window:minimize'),
  maximize: () => ipcRenderer.send('window:maximize'),
  unmaximize: () => ipcRenderer.send('window:unmaximize'),
  close: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  
  // 窗口状态变化通知
  onMaximizeChange: (callback) => {
    ipcRenderer.on('window:maximizeChange', (event, isMaximized) => callback(isMaximized))
    return () => ipcRenderer.removeAllListeners('window:maximizeChange')
  }
})
```

```javascript
// main.js
ipcMain.on('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize()
})

ipcMain.on('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win?.isMaximized()) {
    win.unmaximize()
    event.reply('window:maximizeChange', false)
  } else {
    win?.maximize()
    event.reply('window:maximizeChange', true)
  }
})

ipcMain.handle('window:isMaximized', (event) => {
  return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
})
```

### 通知系统

```javascript
// preload.js
contextBridge.exposeInMainWorld('notifyAPI', {
  show: (title, body, options = {}) => 
    ipcRenderer.invoke('notification:show', { title, body, ...options }),
  
  onClick: (callback) => {
    ipcRenderer.on('notification:clicked', (event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('notification:clicked')
  },
  
  onClose: (callback) => {
    ipcRenderer.on('notification:closed', (event, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('notification:closed')
  }
})
```

```javascript
// main.js
const { Notification } = require('electron')

ipcMain.handle('notification:show', (event, options) => {
  const notification = new Notification({
    title: options.title,
    body: options.body,
    icon: options.icon
  })
  
  notification.on('click', () => {
    event.sender.send('notification:clicked', options)
  })
  
  notification.on('close', () => {
    event.sender.send('notification:closed', options)
  })
  
  notification.show()
  return true
})
```

### 本地存储

```javascript
// preload.js
const Store = require('electron-store')
const store = new Store()

contextBridge.exposeInMainWorld('storeAPI', {
  get: (key, defaultValue) => store.get(key, defaultValue),
  set: (key, value) => store.set(key, value),
  delete: (key) => store.delete(key),
  clear: () => store.clear(),
  has: (key) => store.has(key),
  
  // 获取所有数据
  getAll: () => store.store,
  
  // 监听变化
  onChange: (key, callback) => {
    store.onDidChange(key, (newValue, oldValue) => {
      callback(newValue, oldValue)
    })
  }
})
```

### 剪贴板操作

```javascript
// preload.js
const { clipboard, nativeImage } = require('electron')

contextBridge.exposeInMainWorld('clipboardAPI', {
  writeText: (text) => clipboard.writeText(text),
  readText: () => clipboard.readText(),
  writeImage: (dataUrl) => {
    const image = nativeImage.createFromDataURL(dataUrl)
    clipboard.writeImage(image)
  },
  readImage: () => clipboard.readImage().toDataURL(),
  clear: () => clipboard.clear()
})
```

## TypeScript 支持

### 类型定义文件

```typescript
// types/electron.d.ts
import { OpenDialogOptions, SaveDialogOptions } from 'electron'

export interface FileAPI {
  open: (options?: OpenDialogOptions) => Promise<{ path: string; content: string } | null>
  save: (defaultPath?: string, content?: string) => Promise<string | false>
  read: (path: string) => Promise<string>
  write: (path: string, content: string) => Promise<void>
}

export interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void
}

export interface StoreAPI {
  get: <T>(key: string, defaultValue?: T) => T
  set: <T>(key: string, value: T) => void
  delete: (key: string) => void
  has: (key: string) => boolean
}

export interface ElectronAPI {
  file: FileAPI
  window: WindowAPI
  store: StoreAPI
  platform: NodeJS.Platform
  versions: NodeJS.ProcessVersions
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
```

### Preload 脚本 TypeScript 实现

```typescript
// preload.ts
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import type { OpenDialogOptions } from 'electron'

const ALLOWED_CHANNELS = {
  invoke: ['dialog:openFile', 'file:read', 'file:write'],
  send: ['window:minimize', 'window:maximize', 'window:close'],
  on: ['file:changed', 'window:maximizeChange']
} as const

type InvokeChannel = typeof ALLOWED_CHANNELS.invoke[number]
type SendChannel = typeof ALLOWED_CHANNELS.send[number]
type OnChannel = typeof ALLOWED_CHANNELS.on[number]

contextBridge.exposeInMainWorld('electronAPI', {
  file: {
    open: (options?: OpenDialogOptions) => 
      ipcRenderer.invoke('dialog:openFile', options),
    read: (path: string) => 
      ipcRenderer.invoke('file:read', path),
    write: (path: string, content: string) => 
      ipcRenderer.invoke('file:write', path, content)
  },
  
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      const handler = (_event: IpcRendererEvent, isMaximized: boolean) => 
        callback(isMaximized)
      ipcRenderer.on('window:maximizeChange', handler)
      return () => ipcRenderer.removeListener('window:maximizeChange', handler)
    }
  },
  
  platform: process.platform,
  versions: process.versions
})
```

## 完整示例

### 项目结构

```
project/
├── src/
│   ├── main/
│   │   ├── index.ts          # 主进程入口
│   │   └── ipc/
│   │       ├── file.ts       # 文件相关 IPC 处理
│   │       └── window.ts     # 窗口相关 IPC 处理
│   ├── preload/
│   │   └── index.ts          # preload 脚本
│   └── renderer/
│       ├── index.html
│       └── index.ts
├── types/
│   └── electron.d.ts         # 类型定义
└── package.json
```

### preload/index.ts

```typescript
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// ============ 通道定义 ============
const CHANNELS = {
  invoke: [
    'dialog:openFile',
    'dialog:saveFile',
    'file:read',
    'file:write',
    'store:get',
    'store:set'
  ],
  send: [
    'window:minimize',
    'window:maximize',
    'window:close'
  ],
  on: [
    'file:changed',
    'update:available'
  ]
} as const

// ============ 验证函数 ============
function validateInvoke(channel: string): asserts channel is typeof CHANNELS.invoke[number] {
  if (!CHANNELS.invoke.includes(channel as any)) {
    throw new Error(`Invalid invoke channel: ${channel}`)
  }
}

function validateSend(channel: string): asserts channel is typeof CHANNELS.send[number] {
  if (!CHANNELS.send.includes(channel as any)) {
    throw new Error(`Invalid send channel: ${channel}`)
  }
}

function validateOn(channel: string): asserts channel is typeof CHANNELS.on[number] {
  if (!CHANNELS.on.includes(channel as any)) {
    throw new Error(`Invalid on channel: ${channel}`)
  }
}

// ============ 暴露 API ============
contextBridge.exposeInMainWorld('electronAPI', {
  // 系统信息
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },
  
  // 文件操作
  file: {
    open: (options = {}) => ipcRenderer.invoke('dialog:openFile', options),
    save: (defaultPath?: string) => ipcRenderer.invoke('dialog:saveFile', defaultPath),
    read: (path: string) => ipcRenderer.invoke('file:read', path),
    write: (path: string, content: string) => ipcRenderer.invoke('file:write', path, content)
  },
  
  // 窗口控制
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  },
  
  // 通用 IPC（带验证）
  invoke: (channel: string, ...args: any[]) => {
    validateInvoke(channel)
    return ipcRenderer.invoke(channel, ...args)
  },
  
  send: (channel: string, ...args: any[]) => {
    validateSend(channel)
    ipcRenderer.send(channel, ...args)
  },
  
  on: (channel: string, callback: (...args: any[]) => void) => {
    validateOn(channel)
    const handler = (_event: IpcRendererEvent, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
})
```

### renderer/index.ts

```typescript
import './styles.css'

let currentFilePath: string | null = null
let isModified = false

// 文件操作
document.getElementById('openBtn')?.addEventListener('click', async () => {
  try {
    const result = await window.electronAPI.file.open({
      filters: [{ name: 'Text Files', extensions: ['txt', 'md'] }]
    })
    
    if (result) {
      currentFilePath = result.path
      const editor = document.getElementById('editor') as HTMLTextAreaElement
      editor.value = result.content
      isModified = false
      updateTitle()
    }
  } catch (error) {
    showError('打开文件失败', error)
  }
})

document.getElementById('saveBtn')?.addEventListener('click', async () => {
  try {
    const editor = document.getElementById('editor') as HTMLTextAreaElement
    
    if (!currentFilePath) {
      const path = await window.electronAPI.file.save()
      if (!path) return
      currentFilePath = path
    }
    
    await window.electronAPI.file.write(currentFilePath, editor.value)
    isModified = false
    updateTitle()
  } catch (error) {
    showError('保存文件失败', error)
  }
})

// 窗口控制
document.getElementById('minimizeBtn')?.addEventListener('click', () => {
  window.electronAPI.window.minimize()
})

document.getElementById('maximizeBtn')?.addEventListener('click', () => {
  window.electronAPI.window.maximize()
})

document.getElementById('closeBtn')?.addEventListener('click', () => {
  if (isModified) {
    if (confirm('文件未保存，确定要关闭吗？')) {
      window.electronAPI.window.close()
    }
  } else {
    window.electronAPI.window.close()
  }
})

// 辅助函数
function updateTitle() {
  const title = currentFilePath 
    ? `${currentFilePath}${isModified ? ' *' : ''} - Editor`
    : 'Untitled - Editor'
  document.title = title
}

function showError(title: string, error: unknown) {
  alert(`${title}: ${error instanceof Error ? error.message : String(error)}`)
}
```

## 常见问题解答

### Q: preload 脚本中可以访问 DOM 吗？

A: 可以，但有限制：

```javascript
// contextIsolation: true 时
// preload 访问的是隔离世界的 DOM，与网页的 DOM 是分离的

// ✅ 可以访问 DOM API
document.addEventListener('DOMContentLoaded', () => {
  // 这里的 document 是隔离世界的
})

// ❌ 无法访问网页的 DOM 元素
// 因为网页的 DOM 在 preload 执行时还不存在

// ❌ 不要尝试在 preload 中操作网页 DOM
// 这违背了安全隔离的设计原则
```

### Q: 如何在 preload 中使用第三方 npm 包？

A: 大多数 npm 包可以在 preload 中使用，但有限制：

```javascript
// ✅ 可以使用纯 JavaScript 包
const _ = require('lodash')
const dayjs = require('dayjs')

// ✅ 可以使用 Node.js 原生模块
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

// ⚠️ 涉及原生编译的包需要特殊处理
// 需要为 Electron 重新编译
// npm rebuild --platform=darwin --arch=arm64

// ❌ 不能使用浏览器专有 API
// 如 window.fetch, localStorage 等（它们存在于隔离世界但通常不应使用）
```

### Q: contextBridge 传递的数据是深拷贝还是引用？

A: 是深拷贝（结构化克隆）：

```javascript
// preload.js
const data = { nested: { value: 1 } }

contextBridge.exposeInMainWorld('api', {
  data: data  // 会被深拷贝
})

// renderer.js
const data = window.api.data
data.nested.value = 2  // 修改不影响 preload 中的原始数据

// 如果需要共享状态，使用 IPC
contextBridge.exposeInMainWorld('api', {
  getData: () => ipcRenderer.invoke('getData'),
  setData: (value) => ipcRenderer.invoke('setData', value)
})
```

### Q: 如何处理 preload 中的异步初始化？

A: 使用 Promise 或事件模式：

```javascript
// preload.js
let initialized = false
const initPromise = ipcRenderer.invoke('init').then(() => {
  initialized = true
})

contextBridge.exposeInMainWorld('api', {
  // 方式 1: 返回 Promise
  ready: () => initPromise,
  
  // 方式 2: 检查状态
  isReady: () => initialized,
  
  // 方式 3: 等待就绪后执行
  whenReady: (callback) => {
    initPromise.then(callback)
  }
})

// renderer.js
async function init() {
  await window.api.ready()
  // 现在可以安全使用其他 API
}

// 或
window.api.whenReady(() => {
  // 初始化完成
})
```

### Q: 如何在多个窗口间共享 preload 逻辑？

A: 创建公共 preload 模块：

```javascript
// preload/common.js
const { contextBridge, ipcRenderer } = require('electron')

function createAPI(channels) {
  contextBridge.exposeInMainWorld('electronAPI', {
    invoke: (channel, ...args) => {
      if (!channels.invoke.includes(channel)) {
        throw new Error(`Invalid channel: ${channel}`)
      }
      return ipcRenderer.invoke(channel, ...args)
    }
  })
}

module.exports = { createAPI }

// preload/main.js
const { createAPI } = require('./common')

createAPI({
  invoke: ['file:read', 'file:write']
})

// preload/settings.js
const { createAPI } = require('./common')

createAPI({
  invoke: ['settings:get', 'settings:set']
})
```

### Q: preload 脚本中的错误如何传递到渲染进程？

A: 通过 IPC 或返回错误对象：

```javascript
// preload.js
contextBridge.exposeInMainWorld('api', {
  readFile: async (path) => {
    try {
      return await ipcRenderer.invoke('file:read', path)
    } catch (error) {
      // 错误会自动传递
      throw error
    }
  },
  
  // 或返回错误对象
  readFileSafe: async (path) => {
    try {
      const content = await ipcRenderer.invoke('file:read', path)
      return { success: true, data: content }
    } catch (error) {
      return { 
        success: false, 
        error: { 
          code: error.code, 
          message: error.message 
        } 
      }
    }
  }
})

// renderer.js
try {
  const content = await window.api.readFile(path)
} catch (error) {
  console.error(error.message)
}

// 或
const result = await window.api.readFileSafe(path)
if (result.success) {
  console.log(result.data)
} else {
  console.error(result.error.message)
}
```

## 参考链接

- [官方文档 - Preload Scripts](https://www.electronjs.org/docs/latest/tutorial/tutorial-preload)
- [官方文档 - contextBridge](https://www.electronjs.org/docs/latest/api/context-bridge)
- [官方文档 - 安全最佳实践](https://www.electronjs.org/docs/latest/tutorial/security)
- [IPC 基础](01-IPC基础.md)
- [通信最佳实践](03-通信最佳实践.md)
