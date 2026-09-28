---
title: "渲染进程模块API"
description: "介绍渲染进程 IPC 模块 ipcRenderer 的 send/invoke/sendSync 方法、事件对象与 MessageChannel 通信，以及通过 preload 与 contextBridge 安全暴露 API 的做法与注意事项。"
keywords: [渲染进程模块API]
category: Electron
tags: [Electron, 桌面应用, IPC, 打包]
---


# 渲染进程模块API

`ipcRenderer` 是 Electron 渲染进程中用于与主进程通信的模块。

::: warning 注意
在现代 Electron 应用中，推荐通过 preload 脚本和 `contextBridge` 暴露安全的 IPC 接口，而不是直接在渲染进程中使用 `ipcRenderer`。
:::

## 基本用法

### 发送消息

```javascript
const { ipcRenderer } = require('electron')

// 发送异步消息（不等待返回）
ipcRenderer.send('channel-name', data)

// 发送同步消息（阻塞等待返回）
const result = ipcRenderer.sendSync('sync-channel', data)

// 发送消息并等待 Promise 返回
const response = await ipcRenderer.invoke('async-channel', data)
```

### 接收消息

```javascript
// 监听主进程消息
ipcRenderer.on('channel-name', (event, data) => {
  console.log('Received:', data)
})

// 只监听一次
ipcRenderer.once('channel-name', (event, data) => {
  console.log('Received once:', data)
})
```

## 主要方法

### send(channel, ...args)

向主进程发送异步消息：

```javascript
// 渲染进程
ipcRenderer.send('window:minimize')
ipcRenderer.send('file:save', { path: '/path/to/file', content: 'Hello' })

// 主进程
ipcMain.on('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize()
})

ipcMain.on('file:save', (event, { path, content }) => {
  fs.writeFileSync(path, content)
  // 发送回执
  event.reply('file:saved', { success: true })
})
```

### invoke(channel, ...args)

发送消息并返回 Promise（推荐使用）：

```javascript
// 渲染进程
const files = await ipcRenderer.invoke('dialog:open', {
  filters: [{ name: 'Images', extensions: ['png', 'jpg'] }]
})

// 主进程
ipcMain.handle('dialog:open', async (event, options) => {
  const result = await dialog.showOpenDialog(options)
  return result.filePaths
})
```

### sendSync(channel, ...args)

发送同步消息（不推荐，会阻塞渲染进程）：

```javascript
// 渲染进程
const isMaximized = ipcRenderer.sendSync('window:isMaximized')

// 主进程
ipcMain.on('window:isMaximized', (event) => {
  event.returnValue = BrowserWindow.fromWebContents(event.sender)?.isMaximized()
})
```

### on(channel, listener)

监听主进程发送的消息：

```javascript
ipcRenderer.on('update:progress', (event, progress) => {
  console.log(`Download progress: ${progress}%`)
})
```

### once(channel, listener)

只监听一次：

```javascript
ipcRenderer.once('app:ready', () => {
  console.log('App is ready')
})
```

### removeListener(channel, listener)

移除监听器：

```javascript
const handler = (event, data) => console.log(data)
ipcRenderer.on('channel', handler)

// 移除
ipcRenderer.removeListener('channel', handler)
```

### removeAllListeners(channel)

移除所有监听器：

```javascript
ipcRenderer.removeAllListeners('channel')
```

## 通过 Preload 使用（推荐）

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // invoke 方法
  openDialog: (options) => ipcRenderer.invoke('dialog:open', options),
  
  // send 方法
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  
  // on 方法（返回取消监听函数）
  onUpdateProgress: (callback) => {
    const handler = (event, progress) => callback(progress)
    ipcRenderer.on('update:progress', handler)
    return () => ipcRenderer.removeListener('update:progress', handler)
  }
})
```

```javascript
// renderer.js
// 使用暴露的 API
const files = await window.electronAPI.openDialog({ properties: ['openFile'] })
window.electronAPI.minimizeWindow()

const unsubscribe = window.electronAPI.onUpdateProgress((progress) => {
  console.log(progress)
})
// 取消监听
unsubscribe()
```

## 事件对象

IPC 回调中的 `event` 对象包含以下属性：

```javascript
ipcRenderer.on('channel', (event, data) => {
  event.senderId      // 发送者的 webContents.id（主进程发送时为 0）
  event.sender        // IpcRenderer 实例
  event.ports         // MessagePort 数组
})
```

注意：`event.reply` 与 `event.returnValue` 是主进程侧 IpcMainEvent 的属性（见上文 sendSync 的 `event.returnValue`），渲染进程侧的事件对象没有这两个成员。

## MessageChannel 通信

使用 `MessageChannel` 进行双向通信：

```javascript
// 渲染进程
const { port1, port2 } = new MessageChannel()

// 发送一个端口给主进程
ipcRenderer.postMessage('port', null, [port1])

// 使用另一个端口接收消息
port2.onmessage = (event) => {
  console.log('Received:', event.data)
}

// 发送消息
port2.postMessage('Hello from renderer')
```

```javascript
// 主进程
ipcMain.on('port', (event) => {
  const [port] = event.ports
  port.onmessage = (e) => {
    console.log('Received:', e.data)
    port.postMessage('Hello from main')
  }
  port.start()
})
```

## 完整示例

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron')

const ALLOWED_CHANNELS = {
  invoke: ['dialog:open', 'file:read', 'file:write'],
  send: ['window:minimize', 'window:maximize', 'window:close'],
  on: ['file:changed', 'update:available']
}

contextBridge.exposeInMainWorld('ipc', {
  invoke: (channel, ...args) => {
    if (!ALLOWED_CHANNELS.invoke.includes(channel)) {
      return Promise.reject(new Error(`Invalid channel: ${channel}`))
    }
    return ipcRenderer.invoke(channel, ...args)
  },
  
  send: (channel, ...args) => {
    if (!ALLOWED_CHANNELS.send.includes(channel)) {
      throw new Error(`Invalid channel: ${channel}`)
    }
    ipcRenderer.send(channel, ...args)
  },
  
  on: (channel, callback) => {
    if (!ALLOWED_CHANNELS.on.includes(channel)) {
      throw new Error(`Invalid channel: ${channel}`)
    }
    const handler = (event, ...args) => callback(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
})
```

## contextBridge

`contextBridge` 是 Electron 提供的安全 API，用于在隔离的上下文之间安全地暴露 API。

### 为什么需要 contextBridge

在启用 `contextIsolation` 后，渲染进程的 JavaScript 运行在隔离的上下文中，无法直接访问 preload 脚本中的变量。`contextBridge` 提供了一种安全的方式来暴露特定 API。

### 基本用法

```javascript
// preload.js
const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('myAPI', {
  doSomething: () => console.log('Hello from preload'),
  version: '1.0.0'
})
```

```javascript
// renderer.js
// 现在可以访问暴露的 API
window.myAPI.doSomething()  // 'Hello from preload'
console.log(window.myAPI.version)  // '1.0.0'
```

### API 详情

#### exposeInMainWorld(apiKey, api)

```javascript
contextBridge.exposeInMainWorld('apiKey', {
  // 字符串、数字、布尔值、数组、对象
  version: '1.0.0',
  count: 42,
  isActive: true,
  list: [1, 2, 3],
  config: { theme: 'dark' },
  
  // 函数
  ping: () => 'pong',
  
  // Promise
  asyncMethod: async () => {
    return await someAsyncOperation()
  },
  
  // 包含 DOM 类型（但有限制）
  // Date, ArrayBuffer, Error 等
  getDate: () => new Date()
})
```

### 数据类型支持

#### 支持的类型

| 类型 | 说明 |
|------|------|
| 基本类型 | string, number, boolean, null, undefined |
| 复杂类型 | Object, Array |
| 特殊类型 | Date, ArrayBuffer, Error, RegExp |
| 函数 | 普通函数和 async 函数 |
| Promise | 返回 Promise 的函数 |

#### 不支持的类型

| 类型 | 原因 |
|------|------|
| DOM 元素 | 支持有限：原型链丢弃，仅保留自有属性 |
| 函数返回的 DOM | 同上 |
| Class 实例 | 原型链会丢失 |
| Symbol | 无法序列化，会被丢弃 |

### 使用示例

#### 暴露 IPC 接口

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => {
    const validChannels = ['toMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },
  
  receive: (channel, func) => {
    const validChannels = ['fromMain']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args))
    }
  },
  
  invoke: async (channel, data) => {
    const validChannels = ['dialog:open', 'file:read']
    if (validChannels.includes(channel)) {
      return await ipcRenderer.invoke(channel, data)
    }
    throw new Error('Invalid channel')
  }
})
```

#### 暴露 Node.js 功能

```javascript
// preload.js
const { contextBridge } = require('electron')
const os = require('os')

contextBridge.exposeInMainWorld('systemAPI', {
  platform: process.platform,
  homedir: os.homedir(),
  hostname: os.hostname(),
  cpus: os.cpus().length,
  totalMemory: os.totalmem(),
  freeMemory: os.freemem()
})
```

#### 暴露存储 API

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('storeAPI', {
  get: (key) => ipcRenderer.invoke('store:get', key),
  set: (key, value) => ipcRenderer.invoke('store:set', key, value),
  delete: (key) => ipcRenderer.invoke('store:delete', key),
  clear: () => ipcRenderer.invoke('store:clear')
})
```

### 安全考虑

#### 1. 不要暴露整个模块

```javascript
// ❌ 危险！暴露了所有功能
contextBridge.exposeInMainWorld('electron', require('electron'))

// ❌ 危险！暴露了整个 ipcRenderer
contextBridge.exposeInMainWorld('ipc', ipcRenderer)

// ✅ 安全：只暴露需要的方法
contextBridge.exposeInMainWorld('api', {
  send: (channel, data) => {
    // 验证 channel
    ipcRenderer.send(channel, data)
  }
})
```

#### 2. 验证所有输入

```javascript
contextBridge.exposeInMainWorld('fileAPI', {
  read: (path) => {
    // 类型检查
    if (typeof path !== 'string') {
      throw new TypeError('Path must be a string')
    }
    // 路径安全检查
    if (path.includes('..') || path.startsWith('/etc/')) {
      throw new Error('Access denied')
    }
    return ipcRenderer.invoke('file:read', path)
  }
})
```

#### 3. 使用通道白名单

```javascript
const ALLOWED_CHANNELS = {
  invoke: ['dialog:open', 'file:read', 'store:get'],
  send: ['window:minimize', 'window:close'],
  on: ['update:progress', 'notification:show']
}

contextBridge.exposeInMainWorld('api', {
  invoke: (channel, ...args) => {
    if (!ALLOWED_CHANNELS.invoke.includes(channel)) {
      throw new Error(`Channel not allowed: ${channel}`)
    }
    return ipcRenderer.invoke(channel, ...args)
  }
})
```

### 函数的特殊处理

通过 `contextBridge` 暴露的函数有特殊行为：

```javascript
// preload.js
let counter = 0

contextBridge.exposeInMainWorld('counter', {
  increment: () => ++counter,
  get: () => counter
})

// renderer.js
window.counter.increment()  // 1
window.counter.increment()  // 2
window.counter.get()        // 2
```

函数在 preload 上下文中执行，可以访问该上下文的变量。

### TypeScript 支持

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron'

interface ElectronAPI {
  invoke: (channel: string, data?: unknown) => Promise<unknown>
  send: (channel: string, data?: unknown) => void
  on: (channel: string, callback: (data: unknown) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => {
    const handler = (_: unknown, data: unknown) => callback(data)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  }
})
```

### 完整示例

```javascript
// preload.js
const { contextBridge, ipcRenderer } = require('electron')

const CHANNELS = {
  invoke: ['dialog:open', 'file:read', 'file:write'],
  send: ['window:minimize', 'window:maximize', 'window:close'],
  on: ['file:changed', 'update:available']
}

contextBridge.exposeInMainWorld('electronAPI', {
  // 系统信息
  platform: process.platform,
  
  // IPC 通信
  invoke: (channel, ...args) => {
    if (!CHANNELS.invoke.includes(channel)) {
      return Promise.reject(new Error(`Invalid channel: ${channel}`))
    }
    return ipcRenderer.invoke(channel, ...args)
  },
  
  send: (channel, ...args) => {
    if (!CHANNELS.send.includes(channel)) {
      return
    }
    ipcRenderer.send(channel, ...args)
  },
  
  on: (channel, callback) => {
    if (!CHANNELS.on.includes(channel)) {
      return () => {}
    }
    const handler = (event, ...args) => callback(...args)
    ipcRenderer.on(channel, handler)
    return () => ipcRenderer.removeListener(channel, handler)
  },
  
  once: (channel, callback) => {
    if (!CHANNELS.on.includes(channel)) {
      return
    }
    ipcRenderer.once(channel, (event, ...args) => callback(...args))
  }
})
```

## 参考链接

- [官方文档 - ipcRenderer](https://www.electronjs.org/docs/latest/api/ipc-renderer)
- [官方文档 - contextBridge](https://www.electronjs.org/docs/latest/api/context-bridge)
- [IPC 基础](01-IPC基础.md)
- [Preload 脚本](02-preload脚本.md)