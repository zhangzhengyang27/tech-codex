---
title: IPC基础
description: "进程间通信（Inter-Process Communication, IPC）是 Electron 多进程架构的核心机制。Electron 继承了 Chromium 的多进程模型，主进程与渲染进程相互隔离，必须通过 IPC 进行通信。"
keywords: [IPC基础]
category: Electron
tags: [Electron, 桌面应用, IPC, 打包]
---


# 进程间通信

进程间通信（Inter-Process Communication, IPC）是 Electron 多进程架构的核心机制。Electron 继承了 Chromium 的多进程模型，主进程与渲染进程相互隔离，必须通过 IPC 进行通信。

## 系统架构

### 多进程模型

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Electron 应用                                  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                        主进程 (Main Process)                        │  │
│  │  - Node.js 环境                                                    │  │
│  │  - 创建/管理 BrowserWindow                                         │  │
│  │  - 访问原生 API                                                    │  │
│  │  - ipcMain 监听消息                                                │  │
│  └───────────────────────────┬───────────────────────────────────────┘  │
│                              │                                           │
│                              │ IPC 通信                                   │
│                              │ (结构化克隆算法序列化)                      │
│                              │                                           │
│         ┌────────────────────┼────────────────────┐                     │
│         ▼                    ▼                    ▼                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │  渲染进程 1   │    │  渲染进程 2   │    │  渲染进程 N   │              │
│  │              │    │              │    │              │              │
│  │ - Web 环境   │    │ - Web 环境   │    │ - Web 环境   │              │
│  │ - ipcRenderer│    │ - ipcRenderer│    │ - ipcRenderer│              │
│  │ - preload.js │    │ - preload.js │    │ - preload.js │              │
│  │ - contextIso │    │ - contextIso │    │ - contextIso │              │
│  └──────────────┘    └──────────────┘    └──────────────┘              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### IPC 通信流向

```
渲染进程                                主进程
┌──────────────┐                      ┌──────────────┐
│              │   send/invoke        │              │
│ ipcRenderer  │ ──────────────────→ │   ipcMain    │
│              │                      │              │
│              │   event.reply/       │              │
│              │ ←────────────────── │ webContents  │
│              │   webContents.send   │    .send    │
└──────────────┘                      └──────────────┘

通信方式：
┌─────────────┬──────────────┬───────────────────────────────┐
│   方法       │   方向        │         说明                  │
├─────────────┼──────────────┼───────────────────────────────┤
│ send        │ 渲染 → 主     │ 单向异步                       │
│ invoke      │ 渲染 ⇄ 主     │ 双向异步 (Promise)             │
│ sendSync    │ 渲染 ⇄ 主     │ 双向同步 (阻塞)                │
│ webContents │ 主 → 渲染     │ 主动推送                       │
│ .send       │              │                               │
└─────────────┴──────────────┴───────────────────────────────┘
```

## IPC 核心概念

### ipcMain 与 ipcRenderer

| 模块 | 运行环境 | 继承自 | 职责 |
|------|---------|--------|------|
| `ipcMain` | 主进程 | EventEmitter | 监听渲染进程消息，处理请求 |
| `ipcRenderer` | 渲染进程 | EventEmitter | 向主进程发送消息，接收回复 |

### 通信通道 Channel

`channel` 是一个字符串标识符，用于区分不同类型的消息。命名建议采用 `模块:操作` 格式：

```javascript
// 推荐的命名规范
'dialog:open'      // 对话框模块 - 打开操作
'file:read'        // 文件模块 - 读取操作
'window:minimize'  // 窗口模块 - 最小化操作
'store:get'        // 存储模块 - 获取操作
'notification:show' // 通知模块 - 显示操作
```

### 消息序列化

通过 IPC 传递的数据使用[结构化克隆算法](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)进行序列化。

#### 支持的数据类型

| 类型 | 支持 | 说明 |
|------|------|------|
| 基本类型 | ✅ | String, Number, Boolean, null, undefined |
| Array | ✅ | 支持嵌套 |
| Object | ✅ | 支持嵌套，支持循环引用 |
| Date | ✅ | 正确克隆 |
| RegExp | ✅ | 正确克隆 |
| Blob | ✅ | 正确克隆 |
| File | ✅ | 正确克隆 |
| FileList | ✅ | 正确克隆 |
| ArrayBuffer | ✅ | 正确克隆 |
| TypedArray | ✅ | 正确克隆 |
| Map, Set | ✅ | 正确克隆 |
| Error | ✅ | Electron 扩展支持 |

#### 不支持的数据类型

| 类型 | 原因 |
|------|------|
| Function | 无法序列化 |
| Symbol | 无法序列化 |
| WeakMap, WeakSet | 无法序列化 |
| DOM 节点 | 无法序列化 |
| Promise | 需要先 await |
| Class 实例 | 只有可枚举属性被克隆 |

#### 序列化示例

```javascript
// ✅ 正确：传递可序列化数据
ipcRenderer.send('data', {
  name: 'test',
  count: 100,
  items: [1, 2, 3],
  date: new Date()
})

// ❌ 错误：传递函数
ipcRenderer.send('callback', {
  onClick: () => console.log('click') // 函数无法传递
})

// ✅ 正确：先 resolve Promise
const data = await fetchData()
ipcRenderer.send('data', data)

// ❌ 错误：直接传递 Promise
ipcRenderer.send('data', fetchData()) // Promise 无法传递

// ✅ 正确：传递 Error
ipcRenderer.send('error', new Error('Something went wrong'))

// ✅ 正确：传递 Buffer/ArrayBuffer
ipcRenderer.send('binary', Buffer.from('hello'))
ipcRenderer.send('binary', new ArrayBuffer(10))
```

## API 接口说明

### ipcRenderer API

#### ipcRenderer.send(channel, ...args)

发送异步消息到主进程，不等待返回值。

```javascript
// 渲染进程
ipcRenderer.send('channel-name', arg1, arg2, arg3)

// 发送对象
ipcRenderer.send('user:update', {
  id: 1,
  name: 'John',
  action: 'update'
})
```

#### ipcRenderer.invoke(channel, ...args)

发送异步消息并返回 Promise，等待主进程处理结果。

```javascript
// 渲染进程
async function openFile() {
  try {
    const result = await ipcRenderer.invoke('dialog:open', {
      filters: [{ name: 'Images', extensions: ['jpg', 'png'] }]
    })
    console.log('Selected file:', result)
    return result
  } catch (error) {
    console.error('Failed to open file:', error)
    throw error
  }
}
```

#### ipcRenderer.sendSync(channel, ...args)

发送同步消息，**阻塞渲染进程**直到主进程返回。应尽量避免使用。

```javascript
// 渲染进程 - 会阻塞 UI
const result = ipcRenderer.sendSync('config:get', 'theme')
console.log(result) // 主进程返回后才执行
```

#### ipcRenderer.on(channel, listener)

监听来自主进程的消息。

```javascript
// 渲染进程
ipcRenderer.on('file:changed', (event, filePath, changes) => {
  console.log(`File ${filePath} changed:`, changes)
})

// 返回清理函数
const unsubscribe = (channel, listener) => {
  ipcRenderer.removeListener(channel, listener)
}
```

#### ipcRenderer.once(channel, listener)

监听一次消息后自动移除监听器。

```javascript
ipcRenderer.once('app:ready', (event, data) => {
  console.log('App is ready:', data)
})
```

#### ipcRenderer.removeListener(channel, listener)

移除指定监听器。

```javascript
const handler = (event, data) => console.log(data)
ipcRenderer.on('update', handler)

// 移除监听
ipcRenderer.removeListener('update', handler)
```

#### ipcRenderer.removeAllListeners(channel)

移除指定通道的所有监听器。

```javascript
ipcRenderer.removeAllListeners('update')
```

### ipcMain API

#### ipcMain.on(channel, listener)

监听渲染进程消息。

```javascript
// 主进程
ipcMain.on('message', (event, arg1, arg2) => {
  console.log('Received:', arg1, arg2)
  
  // event 对象属性
  console.log(event.sender)      // 发送消息的 webContents
  console.log(event.processId)   // 进程 ID
  console.log(event.frameId)     // 帧 ID
})
```

#### ipcMain.handle(channel, listener)

处理 invoke 请求，返回值会作为 Promise resolve。

```javascript
// 主进程
ipcMain.handle('dialog:open', async (event, options) => {
  const result = await dialog.showOpenDialog(options)
  return result.filePaths
})

// 返回错误
ipcMain.handle('file:read', async (event, path) => {
  try {
    return await fs.promises.readFile(path, 'utf-8')
  } catch (error) {
    throw error // 会作为 Promise reject
  }
})
```

#### ipcMain.handleOnce(channel, listener)

处理一次 invoke 请求后自动移除。

```javascript
ipcMain.handleOnce('app:init', async () => {
  return await initializeApp()
})
```

#### ipcMain.removeListener(channel, listener)

移除指定监听器。

```javascript
const handler = (event, data) => console.log(data)
ipcMain.on('message', handler)
ipcMain.removeListener('message', handler)
```

#### ipcMain.removeAllListeners(channel)

移除指定通道的所有监听器。

```javascript
ipcMain.removeAllListeners('message')
```

### event 对象

#### 渲染进程 event 对象

```javascript
ipcRenderer.on('message', (event, data) => {
  // event 对象属性较少
  console.log(event.sender)    // IpcRenderer 实例
  console.log(event.senderId)  // 发送者的 webContents.id（主进程发送时为 0）
})
```

#### 主进程 event 对象

```javascript
ipcMain.on('message', (event, ...args) => {
  // event 对象属性
  event.sender        // 发送消息的 webContents
  event.processId     // 渲染进程 ID
  event.frameId       // 帧 ID
  event.ports         // MessagePort 数组（如有）
  
  // 回复方法
  event.reply('reply-channel', responseData)  // 异步回复
  event.returnValue = data                     // 同步返回（用于 sendSync）
})
```

## 渲染进程 → 主进程通信

### 单向通信：send

适用于不需要返回值的场景。

```javascript
// 渲染进程 (renderer.js)
import { ipcRenderer } from 'electron'

// 发送日志
ipcRenderer.send('log:write', {
  level: 'info',
  message: 'User clicked button',
  timestamp: Date.now()
})

// 窗口控制
ipcRenderer.send('window:minimize')
```

```javascript
// 主进程 (main.js)
import { ipcMain } from 'electron'

ipcMain.on('log:write', (event, logData) => {
  console.log(`[${logData.level}] ${logData.message}`)
})

ipcMain.on('window:minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.minimize()
})
```

### 双向异步通信：invoke

推荐用于需要返回值的场景。

```javascript
// 渲染进程 (renderer.js)
import { ipcRenderer } from 'electron'

async function openFileDialog() {
  const result = await ipcRenderer.invoke('dialog:open', {
    title: '选择文件',
    filters: [
      { name: '文本文件', extensions: ['txt', 'md'] },
      { name: '所有文件', extensions: ['*'] }
    ],
    properties: ['openFile', 'multiSelections']
  })
  
  return result // { canceled: false, filePaths: [...] }
}

async function readFile(path) {
  try {
    const content = await ipcRenderer.invoke('file:read', path)
    return content
  } catch (error) {
    console.error('读取失败:', error)
    throw error
  }
}
```

```javascript
// 主进程 (main.js)
import { ipcMain, dialog } from 'electron'
import fs from 'fs/promises'

ipcMain.handle('dialog:open', async (event, options) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  return await dialog.showOpenDialog(win, options)
})

ipcMain.handle('file:read', async (event, path) => {
  // 验证路径
  if (!path || typeof path !== 'string') {
    throw new Error('Invalid path')
  }
  
  return await fs.readFile(path, 'utf-8')
})
```

### 同步通信：sendSync

**应尽量避免使用**，会阻塞渲染进程 UI。

```javascript
// 渲染进程 - 会阻塞
const config = ipcRenderer.sendSync('config:getAll')
console.log(config) // 等待主进程返回后才执行
```

```javascript
// 主进程
ipcMain.on('config:getAll', (event) => {
  event.returnValue = configStore.getAll()
})
```

### 方法对比

| 方法 | 异步/同步 | 阻塞渲染进程 | 返回值类型 | 推荐程度 |
|------|----------|-------------|-----------|---------|
| `send` | 异步 | 否 | 无 | ⭐⭐⭐ 推荐 |
| `invoke` | 异步 | 否 | Promise | ⭐⭐⭐ 推荐 |
| `sendSync` | 同步 | **是** | 直接返回 | ⚠️ 避免 |

## 主进程 → 渲染进程通信

### 回复渲染进程

```javascript
// 方式 1: event.reply (用于 send)
ipcMain.on('request:data', (event, query) => {
  const data = fetchData(query)
  event.reply('response:data', data)
})

// 方式 2: return (用于 invoke)
ipcMain.handle('request:data', async (event, query) => {
  return await fetchData(query)
})

// 方式 3: returnValue (用于 sendSync)
ipcMain.on('request:data', (event, query) => {
  event.returnValue = fetchData(query)
})
```

### 主动推送消息

```javascript
// 主进程 (main.js)
import { BrowserWindow, ipcMain } from 'electron'

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
}

// 向特定窗口发送消息
function sendToWindow(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data)
  }
}

// 向所有窗口发送消息
function broadcast(channel, data) {
  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data)
    }
  })
}

// 使用示例
ipcMain.on('file:watch', (event, filePath) => {
  fs.watch(filePath, (eventType) => {
    if (eventType === 'change') {
      event.sender.send('file:changed', filePath)
    }
  })
})
```

```javascript
// 渲染进程 (renderer.js)
ipcRenderer.on('file:changed', (event, filePath) => {
  console.log(`File changed: ${filePath}`)
  // 更新 UI
  reloadFile(filePath)
})
```

## 渲染进程 ↔ 渲染进程通信

Electron 安全模型不允许渲染进程直接通信，需要通过主进程中转或使用 MessagePort。

### 方案一：主进程中转

```javascript
// 主进程 - 作为消息路由器
const windows = new Map()

ipcMain.on('register-window', (event, windowId) => {
  windows.set(windowId, event.sender)
})

ipcMain.on('send-to-window', (event, targetId, channel, data) => {
  const targetWindow = windows.get(targetId)
  if (targetWindow) {
    targetWindow.send(channel, data)
  }
})
```

```javascript
// 渲染进程 1 - 发送消息
ipcRenderer.send('send-to-window', 'window-2', 'message', {
  from: 'window-1',
  content: 'Hello!'
})

// 渲染进程 2 - 接收消息
ipcRenderer.on('message', (event, data) => {
  console.log('Received:', data)
})
```

### 方案二：MessagePort

MessagePort 允许建立渲染进程间的直接通信管道。

```javascript
// 主进程 (main.js)
import { app, BrowserWindow, MessageChannelMain } from 'electron'

let window1, window2

app.whenReady().then(() => {
  window1 = new BrowserWindow({
    webPreferences: { preload: 'preload.js' }
  })
  
  window2 = new BrowserWindow({
    webPreferences: { preload: 'preload.js' }
  })
  
  // 创建消息通道
  const { port1, port2 } = new MessageChannelMain()
  
  // 分配端口给两个窗口
  window1.webContents.postMessage('setup-port', null, [port1])
  window2.webContents.postMessage('setup-port', null, [port2])
})
```

```javascript
// preload.js
const { ipcRenderer, contextBridge } = require('electron')

let messagePort = null

ipcRenderer.on('setup-port', (event) => {
  messagePort = event.ports[0]
  messagePort.onmessage = (event) => {
    // 分发消息
    window.dispatchEvent(new CustomEvent('port-message', {
      detail: event.data
    }))
  }
})

contextBridge.exposeInMainWorld('messagePort', {
  send: (data) => messagePort?.postMessage(data),
  onMessage: (callback) => {
    window.addEventListener('port-message', (event) => {
      callback(event.detail)
    })
  }
})
```

```javascript
// 渲染进程 1
window.messagePort.send({ type: 'greeting', text: 'Hello from Window 1' })

window.messagePort.onMessage((data) => {
  console.log('Received:', data)
})

// 渲染进程 2
window.messagePort.onMessage((data) => {
  console.log('Received:', data)
  window.messagePort.send({ type: 'reply', text: 'Hello from Window 2' })
})
```

## 错误处理

### 主进程错误处理

```javascript
// main.js
import { ipcMain } from 'electron'

// 自定义错误类
class IPCError extends Error {
  constructor(code, message, details = {}) {
    super(message)
    this.name = 'IPCError'
    this.code = code
    this.details = details
  }
}

// 错误代码定义
const ErrorCodes = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  INVALID_PATH: 'INVALID_PATH',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  UNKNOWN: 'UNKNOWN'
}

ipcMain.handle('file:read', async (event, filePath) => {
  // 参数验证
  if (!filePath || typeof filePath !== 'string') {
    throw new IPCError(ErrorCodes.INVALID_PATH, 'Invalid file path')
  }
  
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return { success: true, data: content }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new IPCError(ErrorCodes.FILE_NOT_FOUND, 'File not found', { path: filePath })
    }
    if (error.code === 'EACCES') {
      throw new IPCError(ErrorCodes.PERMISSION_DENIED, 'Permission denied', { path: filePath })
    }
    throw new IPCError(ErrorCodes.UNKNOWN, error.message, { originalError: error.message })
  }
})
```

### 渲染进程错误处理

```javascript
// renderer.js
async function readFileSafely(filePath) {
  try {
    const result = await ipcRenderer.invoke('file:read', filePath)
    return result
  } catch (error) {
    // 根据错误代码处理
    switch (error.code) {
      case 'FILE_NOT_FOUND':
        showNotification('文件不存在，请检查路径')
        break
      case 'PERMISSION_DENIED':
        showNotification('没有权限访问该文件')
        break
      case 'INVALID_PATH':
        showNotification('文件路径无效')
        break
      default:
        console.error('Unknown error:', error)
        showNotification('发生未知错误')
    }
    throw error
  }
}
```

### 超时处理

```javascript
// renderer.js
function invokeWithTimeout(channel, args, timeout = 5000) {
  return Promise.race([
    ipcRenderer.invoke(channel, args),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('IPC_TIMEOUT')), timeout)
    )
  ])
}

// 使用
try {
  const result = await invokeWithTimeout('file:read', path, 3000)
} catch (error) {
  if (error.message === 'IPC_TIMEOUT') {
    console.error('请求超时')
  }
}
```

## 完整示例

### 项目结构

```
project/
├── main.js
├── preload.js
├── renderer.js
└── index.html
```

### main.js

```javascript
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs/promises')

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })
  
  mainWindow.loadFile('index.html')
}

// 文件操作
ipcMain.handle('file:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  
  if (result.canceled) return null
  
  const content = await fs.readFile(result.filePaths[0], 'utf-8')
  return {
    path: result.filePaths[0],
    content
  }
})

ipcMain.handle('file:save', async (event, filePath, content) => {
  if (!filePath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: 'untitled.txt',
      filters: [{ name: 'Text Files', extensions: ['txt'] }]
    })
    
    if (result.canceled) return false
    filePath = result.filePath
  }
  
  await fs.writeFile(filePath, content, 'utf-8')
  return filePath
})

// 窗口控制
ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.on('window:close', () => mainWindow?.close())

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
```

### preload.js

```javascript
const { contextBridge, ipcRenderer } = require('electron')

const VALID_CHANNELS = {
  invoke: ['file:open', 'file:save'],
  send: ['window:minimize', 'window:maximize', 'window:close']
}

contextBridge.exposeInMainWorld('electronAPI', {
  file: {
    open: () => ipcRenderer.invoke('file:open'),
    save: (path, content) => ipcRenderer.invoke('file:save', path, content)
  },
  
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close')
  }
})
```

### renderer.js

```javascript
let currentFilePath = null

document.getElementById('openBtn').addEventListener('click', async () => {
  try {
    const result = await window.electronAPI.file.open()
    if (result) {
      currentFilePath = result.path
      document.getElementById('editor').value = result.content
    }
  } catch (error) {
    alert('打开文件失败: ' + error.message)
  }
})

document.getElementById('saveBtn').addEventListener('click', async () => {
  const content = document.getElementById('editor').value
  try {
    const savedPath = await window.electronAPI.file.save(currentFilePath, content)
    if (savedPath) {
      currentFilePath = savedPath
      alert('保存成功!')
    }
  } catch (error) {
    alert('保存失败: ' + error.message)
  }
})
```

## 常见问题解答

### Q: invoke 和 send 有什么区别？

A: 主要区别在于返回值处理：

| 特性 | send | invoke |
|------|------|--------|
| 返回值 | 无（需要监听 reply） | Promise |
| 主进程处理 | `ipcMain.on` | `ipcMain.handle` |
| 代码结构 | 回调式 | async/await |
| 错误处理 | 手动 | 自动 reject |

```javascript
// send 方式
ipcRenderer.send('get-data', query)
ipcRenderer.on('get-data-reply', (event, data) => {
  // 处理数据
})

// invoke 方式（推荐）
const data = await ipcRenderer.invoke('get-data', query)
```

### Q: 为什么不能直接传递函数？

A: IPC 使用结构化克隆算法序列化数据，函数无法序列化。解决方案：

```javascript
// ❌ 错误
ipcRenderer.send('action', {
  callback: () => console.log('done')
})

// ✅ 方案 1: 使用 channel 名称代替
ipcRenderer.send('action', {
  callbackChannel: 'action-complete'
})
ipcRenderer.on('action-complete', () => console.log('done'))

// ✅ 方案 2: 返回值后手动调用
const result = await ipcRenderer.invoke('action')
handleResult(result) // 本地调用
```

### Q: 如何处理大量数据的传输？

A: 对于大数据，建议使用流式传输或分片：

```javascript
// 主进程 - 流式传输
ipcMain.handle('file:stream', async (event, filePath, chunkSize = 65536) => {
  const stream = fs.createReadStream(filePath, { highWaterMark: chunkSize })
  
  stream.on('data', (chunk) => {
    event.sender.send('file:chunk', chunk.toString('base64'))
  })
  
  stream.on('end', () => {
    event.sender.send('file:end')
  })
  
  stream.on('error', (error) => {
    event.sender.send('file:error', error.message)
  })
})

// 渲染进程 - 接收流
let fileData = []

ipcRenderer.on('file:chunk', (event, chunk) => {
  fileData.push(chunk)
  updateProgress()
})

ipcRenderer.on('file:end', () => {
  const complete = Buffer.concat(fileData.map(c => Buffer.from(c, 'base64')))
  processData(complete)
})
```

### Q: 如何调试 IPC 通信？

A: 可以使用日志中间件：

```javascript
// main.js
function logIPC(channel, handler) {
  return async (event, ...args) => {
    console.log(`[IPC IN] ${channel}`, args)
    const start = Date.now()
    try {
      const result = await handler(event, ...args)
      console.log(`[IPC OUT] ${channel} (${Date.now() - start}ms)`, result)
      return result
    } catch (error) {
      console.error(`[IPC ERR] ${channel}`, error)
      throw error
    }
  }
}

ipcMain.handle('file:read', logIPC('file:read', async (event, path) => {
  return fs.promises.readFile(path, 'utf-8')
}))
```

### Q: IPC 通信会影响性能吗？

A: 是的，IPC 通信有开销：

```javascript
// ❌ 避免：循环中多次 IPC
for (const file of files) {
  await ipcRenderer.invoke('file:read', file)
}

// ✅ 优化：批量处理
const contents = await ipcRenderer.invoke('file:readMultiple', files)

// ✅ 优化：减少数据量
ipcRenderer.invoke('file:info', path) // 只返回元信息
// 而不是
ipcRenderer.invoke('file:read', path) // 返回完整内容
```

### Q: 如何实现 IPC 的类型安全？

A: 使用 TypeScript 定义类型：

```typescript
// types/ipc.d.ts
export interface IPCChannels {
  invoke: {
    'file:read': (path: string) => Promise<string>
    'file:write': (path: string, content: string) => Promise<void>
    'dialog:open': (options: OpenDialogOptions) => Promise<string[]>
  }
  send: {
    'window:minimize': () => void
    'window:close': () => void
  }
}

declare global {
  interface Window {
    electronAPI: {
      invoke: <K extends keyof IPCChannels['invoke']>(
        channel: K,
        ...args: Parameters<IPCChannels['invoke'][K]>
      ) => ReturnType<IPCChannels['invoke'][K]>
      
      send: <K extends keyof IPCChannels['send']>(
        channel: K,
        ...args: Parameters<IPCChannels['send'][K]>
      ) => void
    }
  }
}
```

## 参考链接

- [官方文档 - IPC](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [官方文档 - ipcMain](https://www.electronjs.org/docs/latest/api/ipc-main)
- [官方文档 - ipcRenderer](https://www.electronjs.org/docs/latest/api/ipc-renderer)
- [Preload 脚本](02-preload脚本.md)
- [通信最佳实践](03-通信最佳实践.md)
