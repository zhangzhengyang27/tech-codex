---
title: "Electron 基础"
description: "Electron 基础入门：配置国内镜像、创建第一个应用、窗口管理与 BrowserView、Shell 模块、上下文隔离与沙盒、菜单、对话框与通知消息。"
keywords: [Electron 基础]
category: Electron
tags: [Electron, 桌面应用, IPC, 打包]
---

# Electron 基础

## 设置国内镜像

将 Electron 设置国内镜像后，可以加快文件的下载速度，下面是 electron 的国内镜像设置

```bash
npm config set electron_mirror=https://npm.taobao.org/mirrors/electron/
npm config set electron_builder_binaries_mirror=https://npm.taobao.org/mirrors/electron-builder-binaries/
```

上面的镜像不行就试试下面的

```bash
npm config set electron_mirror https://mirrors.huaweicloud.com/electron/
npm config set electron_builder_binaries_mirror https://mirrors.huaweicloud.com/electron-builder-binaries/
```

## 创建应用

首先安装 [node.js](https://nodejs.org/zh-cn/)，因为 Electron 将 Node.js 嵌入到其二进制文件中，你应用运行时的 Node.js 版本与你系统中运行的 Node.js 版本无关

```bash
npm init
npm i -D electron
```

创建的 package.json 内容如下

```json
{
  "name": "camera",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "electron": "^25.5.0"
  }
}
```

修改 package.json 文件中的 main 与 scripts 配置段

- name 字段会做为 app.name 的默认值
- productName 字段会做为 app.name 的默认值，优先级高于 name
- main 主进程脚本
- dev 运行electron项目命令

```json
{
  "name": "camera",
  "productName": "camera",
  "version": "1.0.0",
  "description": "",
  "main": "main.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1",
    "dev": "electron ."
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "electron": "^25.5.0"
  }
}
```

### 模板文件 index.html

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
  </head>
  <body>
    <h1>hello world!</h1>
  </body>
</html>
```

### 主进程 main.js

```javascript
const { app, BrowserWindow } = require("electron")

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
  })
  win.loadFile("index.html")
}

// 应用准备好后创建窗口
app.whenReady().then(() => {
  createWindow()
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 非苹果系统当关闭所有窗口时退出应用
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
```

### 自动重启 nodemon

有时需要当文件修改后，自动重启项目，这时需要安装 nodemon 模块

```bash
npm i -g nodemon
```

修改 package.json

```json
"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1",
  "dev": "nodemon --exec electron ."
},
```

然后添加 nodemon.json 配置文件

```json
{
  "ignore": ["node_modules", "dist"],
  "colours": true,
  "verbose": true,
  "watch": ["*.*"],
  "ext": "html,js"
}
```

主进程设置窗口的位置，并且让窗口置顶，这样不会遮挡 vscode 编辑器

```javascript
const { app, BrowserWindow } = require("electron")

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 400,
    x: 1400,
    y: 100,
    alwaysOnTop: true,
  })
  win.loadFile("index.html")
}

// 应用准备好后创建窗口
app.whenReady().then(() => {
  createWindow()
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 非苹果系统当关闭所有窗口时退出应用
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})
```

### 安全策略

因为 Electron 项目可以执行 javascript 代码，也可以访问用户电脑的文件系统，所以访问任何不受信任的内容都可能带来安全隐患

当没有配置安全策略时，Electron 会报出警告，你可以在渲染进程的开发者工具中查看到

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310070310427.png)

内容安全策略(CSP) 是应对跨站脚本攻击和数据注入攻击的又一层保护措施。 我们建议任何载入到 Electron 的站点都要开启

```javascript
<meta http-equiv="Content-Security-Policy" content="default-src 'self' *.trusted.com; script-src '*.baidu.com'" />
```

## 基于框架

平时项目开发我们都会使用到 vue、react 等框架开发渲染进程的代码，所以要配置 electron 与常用框架的整合。下面我们先自己配置个electron+vite+vue3 的脚手架，然后再介绍成熟的开源脚手架

```bash
npm create vite
npm i -D electron

# 因为我们要跑两个进程所以要安装 concurrently，它可以控制同时启动多个进程
npm add -D concurrently
```

然后修改 package.json

- `"main": "electron/main.cjs"` 定义 electron 主进程脚本
- `"dev": "concurrently \"nodemon --exec electron .\" \"vite\""` 定义同时启动 vue 与 electron 脚本

```json
{
  "name": "test",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "main": "electron/main.cjs",
  "scripts": {
    "dev": "concurrently \"nodemon --exec electron . \" \"vite\"",
    "build": "vue-tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.2.45"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^4.0.0",
    "concurrently": "^7.6.0",
    "electron": "^22.0.3",
    "typescript": "^4.9.3",
    "vite": "^4.0.0",
    "vue-tsc": "^1.0.11"
  }
}
```

然后定义 electron/main.cjs 主进程脚本

```javascript
const { ipcMain, BrowserWindow, app } = require('electron')
const path = require('path')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 600,
    height: 600,
    alwaysOnTop: true,
  })
  win.webContents.openDevTools()
  win.loadURL('http://localhost:5173')

  return win
}

app.whenReady().then(() => {
  createWindow()
  app.on('window-all-closed', () => {
    if (process.platform != 'darwin') app.quit()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length == 0) {
      createWindow()
    }
  })
})
```

## 成熟的脚手架

日常开发可以使用 electron-vite 或 electron-vite-vue、electron-react-boilerplate 等脚手架快速创建项目，脚手架已经为我们完成了基本的配置，并支持使用 Vue 与 React 等技术开发 Electron 项目

下面使用 electron-vite 脚手架创建项目

```shell
pnpm create @quick-start/electron
pnpm install
pnpm run dev
```

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310070310393.png)

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310070310750.png)

## 配置调试

微软有一个仓库 [vscode-recipes](https://github.com/microsoft/vscode-recipes) 提供了vscode的 launch.json 常用开发语言的配置

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Electron: Main",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "runtimeArgs": [
        "--remote-debugging-port=9223",
        "."
      ],
      "windows": {
        "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron.cmd"
      }
    },
    {
      "name": "Electron: Renderer",
      "type": "chrome",
      "request": "attach",
      "port": 9223,
      "webRoot": "${workspaceFolder}",
      "timeout": 30000
    }
  ],
  "compounds": [
    {
      "name": "Electron: All",
      "configurations": [
        "Electron: Main",
        "Electron: Renderer"
      ]
    }
  ]
}
```

### 主进程调试

下面介绍主进程的调试。其实做的工作很少，在主进程代码中设置断点，然后运行调试就可以了

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310070315276.png)

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310070315569.png)

### 渲染进程调试

因为渲染进程是由主进程打开的，所以在进行渲染进程调试时，需要先启动主进程调试 **Electron:Main**

#### 分别启动

首先启动主进程的调试，然后再启动渲染进程 **Electron:Renderer**

#### 同时启动

因为渲染进程是由主进程打开的，所以在进行渲染进程调试时，需要先启动主进程 debug

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310070315801.png)

## 窗口管理

每一个窗口可以简单理解成一个chrome浏览器标签，需要在 electron 主文件`electron/main/index.ts`中定义

- 窗口可以定义尺寸
- 窗口可以加载本地文件或一个链接

下面我们创建窗口并加载 百度 网站链接

```javascript
function createWindow() {
  ...
  const hdWin = new BrowserWindow({
    title: 'xiaoyekeji',
    width: 390,
    height: 844,
  })
  hdWin.loadURL('https://www.baidu.com')
  ...
}
```

### 常用的方法

下面介绍窗口实例常用的方法

| 方法                           | 说明                 |
| ------------------------------ | -------------------- |
| win.loadFile()                 | 加载文件             |
| win.loadURL()                  | 加载链接             |
| win.webContents.openDevTools() | 打开开发者工具       |
| win.setContentBounds()         | 控制窗口尺寸与位置   |
| win.center()                   | 将窗口移动到屏幕中心 |

### 常用属性

| 属性            | 说明                                                         |
| --------------- | ------------------------------------------------------------ |
| title           | 标题，也可以修改 html 模板的 title 标签，模板的 title 标签优先级高 |
| icon            | window 系统窗口图标                                          |
| frame           | 是否显示边框                                                 |
| transparent     | 窗口是否透明                                                 |
| x               | x 坐标                                                       |
| y               | y 坐标                                                       |
| width           | 宽度                                                         |
| height          | 高度                                                         |
| movable         | 是否可以移动窗口                                             |
| minHeight       | 最小高度，不能缩放小于此高度                                 |
| minWidth        | 最小宽度，不能缩放小于此宽度                                 |
| resizable       | 是否允许缩放窗口                                             |
| alwaysOnTop     | 窗口是否置顶                                                 |
| autoHideMenuBar | 是否自动隐藏窗口菜单栏。 一旦设置，菜单栏将只在用户单击 Alt 键时显示 |
| fullscreen      | 是否全屏幕                                                   |

### 属性举例

#### ready-to-show

如果应用过于复杂，在加载本地资源时出现白屏，这时可以监测窗口的 ready-to-show 事件

- 设置 show 属性为 false，让窗口不显示
- 可以通过设置 backgroundColor 属性指定应用背景颜色，使界面不显示突兀
- ready-to-show 事件检测，当渲染进程绘制完成时，显示窗口

```javascript
...
const createWindow = () => {
  const win = new BrowserWindow({
    width: 600,
    height: 500,
    show: false,
    backgroundColor: 'red',
  })
  win.loadFile(path.resolve(__dirname, 'index.html'))
  win.once('ready-to-show', () => {
    win.show()
  })
}
...
```

#### 窗口定位

下面将窗口定位到屏幕右侧顶部，需要使用到 electron 库的 screen 对象

```javascript
const { app, BrowserWindow, shell, ipcMain, screen } = require('electron')
function createWindow() {
  win = new BrowserWindow({
    title: 'Main window',
    x: screen.getPrimaryDisplay().workAreaSize.width - 414,
    y: 0,
    width: 414,
    height: 736
  })
  ...
}
```

### 窗口居中

我们有多种方式实现窗口居中，首先使用 win.center() 方法操作

```javascript
...
mainWindow.webContents.openDevTools()
mainWindow.loadFile(path.resolve(__dirname, 'index.html'))
mainWindow.center()
...
```

也可以通过 screen 模块获取屏幕尺寸，经过计算后设置窗口居中

- screen.getPrimaryDisplay().workAreaSize 获取窗口尺寸
- mainWindow.setContentBounds() 设置窗口尺寸与坐标，第二个参数用于定义是否使用过渡动画

```javascript
...
const mainWindow = new BrowserWindow({
  width: 300,
  height: 300,
  x: 1500,
  y: 100,
  alwaysOnTop: true,
  webPreferences: {
    preload: path.resolve(__dirname, 'preload.js'),
  },
})

mainWindow.webContents.openDevTools()
mainWindow.loadFile(path.resolve(__dirname, 'index.html'))

setTimeout(() => {
  mainWindow.setContentBounds(
    {
      width: 300,
      height: 300,
      x: screen.getPrimaryDisplay().workAreaSize.width / 2 - 150,
      y: 100,
    },
    true,
  )
}, 1000)
  ...
```

### 动态修改窗口大小

#### main.js

```javascript
const { app, ipcMain, BrowserWindow, screen } = require('electron')
const { createWindow } = require('./window')

app.whenReady().then(() => {
  createWindow()
})

ipcMain.on('setPostion', (event, options) => {
  //获取窗口
  const win = BrowserWindow.fromWebContents(event.sender)
  //根据屏幕尺寸获取窗口的x坐标，使其居中显示
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize
  const x = width / 2 - options.width / 2
  //设置窗口坐标
  win.setContentBounds({ ...options, x, y: 100 }, true)
})
```

#### window.js

```javascript
const { BrowserWindow } = require('electron')
const path = require('path')

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 300,
    height: 300,
    x: 1500,
    y: 100,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.js'),
    },
  })

  mainWindow.webContents.openDevTools()
  mainWindow.loadFile(path.resolve(__dirname, 'index.html'))
  return mainWindow
}
module.exports = {
  createWindow,
}
```

#### preload.js

预加载脚本用于IPC通信

```javascript
const { ipcRenderer, contextBridge } = require('electron')

contextBridge.exposeInMainWorld('api', {
  changeWindowPos: (options) => {
    ipcRenderer.send('setPostion', options)
  },
})
```

#### renderer.js

渲染进程用于接收按钮事件，然后通过 preload.js 调用 main.js 的事件，改变窗口大小

```javascript
window.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('button')

  btn.addEventListener('click', () => {
    window.api.changeWindowPos({
      width: Number(document.querySelector('[name="width"]').value),
      height: Number(document.querySelector('[name="height"]').value),
    })
  })
})
```

#### index.html

模板文件定义改变窗口的表单

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <!-- https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'" />
    <title>改变窗口</title>
  </head>
  <body>
    宽度:<input type="text" name="width" value="500" /> <br />
    高度:<input type="text" name="height" value="500" />
    <button>改变位置</button>
    <script src="renderer.js"></script>
  </body>
</html>
```

## BrowserView

BrowserView 被用来让 [BrowserWindow](https://www.electronjs.org/zh/docs/latest/api/browser-window) 嵌入更多的 web 内容。 它就像一个子窗口，除了它的位置是相对于父窗口

> 注：BrowserView 自 Electron 30 起已废弃，新项目建议改用 `BaseWindow` + `WebContentsView`（`win.contentView.addChildView(view)`）。

下面演示使用 BrowserView 在主窗口中嵌入网页

```javascript
const win = new BrowserWindow({
  width: 1024,
  height: 500,
  frame: false,
  webPreferences: {
    preload: path.resolve(__dirname, 'preload.js')
  },
})
win.webContents.openDevTools()
win.loadFile(path.resolve(__dirname, 'index.html'))

const view = new BrowserView()
win.setBrowserView(view)

view.setBounds({
  x: 0,
  y: 0,
  width: win.getBounds().width,
  height: 300,
})
view.webContents.loadURL('https://www.baidu.com')
```

## Shell

electron的 shell 模块是使用操作系统的默认应用程序打开文件或 url

可以在 [Main](https://www.electronjs.org/zh/docs/latest/glossary#main-process), [Renderer](https://www.electronjs.org/zh/docs/latest/glossary#renderer-process) (只能在非沙盒下使用) 进程中使用

下面演示使用 shell 模块，用操作系统的默认浏览器打开网页链接。

### index.html

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'" />
    <meta http-equiv="X-Content-Security-Policy" content="default-src 'self'; script-src 'self'" />
    <title></title>
  </head>
  <body>
    <a href="https://www.baidu.com" target="_blank">百度</a>
    <script src="renderer.js"></script>
  </body>
</html>
```

### main.js

```javascript
const { app, shell } = require('electron')
const { BrowserWindow } = require('electron/main')
const path = require('path')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 500,
    height: 500,
  })

  win.loadFile(path.resolve(__dirname, 'index.html'))
  //捕获 a 标签的打开事件，使用系统浏览器打开，并阻止新窗口打开
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    //action:deny 拒绝 electron 新建窗口打开
    //action:allow 允许 electron 新建窗口打开
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  createWindow()
})
```

## 隔离进程

### 上下文隔离

上下文隔离是从安全角度考量的，即不允许 [webcontent](https://www.electronjs.org/zh/docs/latest/api/web-contents) 网页使用 electron 内部组件与 node 等权限 。 默认情况下 electron 是开启上下文隔离的。

因为使用 Electron 开发的桌面应用，是比较特殊的。他是使用网页开发的，所以会引用第三方的应用，如果不进行隔离，这些应用是有机会调用 node.js api 的，如果应用是恶意的，就会对用户电脑带来安全隐患。

使用上下文隔离对团队开发好处也是明显的，可以让熟悉 vue、react 的前端工程师专门编写前端页面逻辑，让熟悉 nodejs 与 electron 的开发者负责 node.js 程序编写

关闭上下文隔离后，网页脚本可以使用 electron 与 node api 等部分高级 api

下面是在 main.js 中禁用上下文隔离的方法

```javascript
...
webPreferences: {
    preload: path.resolve(__dirname, 'preload.js'),
    contextIsolation: false,
    nodeIntegration: true,
},
...
```

禁用上下文隔离后 preload.js 与 renderer.js 没有隔离机制，在 preload.js 中定义的变量可以在 renderer.js 中直接使用

在 preload.js 定义全局变量

```javascript
window.hd = 'abc'
```

现在可以在 renderer.js 网页脚本中访问了

```javascript
console.log(window.hd)
```

### exposeInMainWorld

禁用上下文隔离后`contextIsolation: false`，在 preload.js 中则不需要使用 contextBridge.exposeInMainWorld 向 renderer.js 中提供接口了

#### main.js 

主进程定义 IPC 事件

```javascript
const { app, shell } = require('electron')
const { BrowserWindow, ipcMain } = require('electron/main')
const path = require('path')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 500,
    height: 500,
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.js'),
      contextIsolation: false
    },
  })
  win.webContents.openDevTools()
  win.loadFile(path.resolve(__dirname, 'index.html'))
}

app.whenReady().then(() => {
  createWindow()
  //定义IPC事件处理程序
  ipcMain.handle('show', () => {
    return 'houdunren.com'
  })
})
```

#### preload.js 

直接定义接口

```javascript
const { ipcRenderer } = require('electron')
const { contextBridge } = require('electron/renderer')

window.api = {
  show: () => ipcRenderer.invoke('show'),
}
```

#### renderer.js 

渲染脚本使用

```javascript
window.api.show().then((res) => {
  console.log(res)
})
```

### nodeIntegration

可以通过修改 main.js 中的 nodeIntegration 配置，来开启 node 支持，这时就可以在 preload.js 或 renderer.js 中使用 fs 等高级模块

```javascript
...
const win = new BrowserWindow({
  width: 500,
  height: 500,
  webPreferences: {
    preload: path.resolve(__dirname, 'preload.js'),
    nodeIntegration: true,
  },
})
  ...
```

preload.js 默认只能使用有限的 node.js api，不能使用 fs 等高级模块，但开启 nodeIntegration 后，就可以使用了

```javascript
const { readFileSync } = require('fs')

const res = readFileSync('package.json', {
  encoding: 'utf-8',
})
console.log(res)
```

如果想在 renderer.js 中使用 node.js 高级模块也是可以的，需要在 main.js 文件中关闭上下文隔离 contextIsolation: false 和开启 node 支持 nodeIntegration: true

```javascript
...
const win = new BrowserWindow({
  width: 300,
  height: 300,
  x: 1500,
  y: 100,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: false,
    nodeIntegration: true,
  },
})
  ...
```

### 进程沙盒

当 Electron 中的渲染进程被沙盒化时，它们的行为与常规 Chrome 渲染器一样。 一个沙盒化的渲染器不会有 Node.js 环境

在沙盒中，渲染进程只能通过进程间通讯 (inter-process communication, IPC) 委派任务给主进程的方式，来执行需权限的任务 (例如：文件系统交互，对系统进行更改或生成子进程) 



如果我们想在 preload.js 中使用 node.js 与 electron 高级应用，如 shell、fs 等，可以通过关闭沙盒完成。当然通过开启 nodeIntegration 也可以实现该功能，但这会让 renderer.js 也可以使用 node.js 高级 api，这是不安全的

所以，开启沙盒，可以赋予 preload.js 高级权限，但不影响 renderer.js

- electron 默认是开启沙盒模式的
- **nodeIntegration:true 时会自动关闭沙盒**
- sandbox: false 时 preload.js 可以使用 nodejs、electron 的高级 api，如 fs 模块

下面演示在关闭沙盒后，可以在 preload.js 中使用 electron 的shell模块

main.js 主进程中禁用沙盒模式

```javascript
const { app, shell } = require('electron')
const { BrowserWindow } = require('electron/main')
const path = require('path')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 500,
    height: 500,
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.js'),
      //关闭沙盒模式
      sandbox: false,
    },
  })
  win.webContents.openDevTools()
  win.loadFile(path.resolve(__dirname, 'index.html'))
}

app.whenReady().then(() => {
  createWindow()
})
```

关闭沙盒模式后 preload.js 中可以使用 shell 模块打开链接了

```javascript
const { shell } = require('electron')

shell.openExternal('https://www.baidu.com')
```

**设置了 nodeIntegration:true 也会关闭沙盒**

## 菜单管理

### 菜单栏

下面先来学习不显示默认菜单，在主进程 main.js 中定义以下代码

```javascript
const { BrowserWindow, app, Menu } = require('electron')
Menu.setApplicationMenu(null)
```

我们需要用到 [Menu](https://www.electronjs.org/zh/docs/latest/api/menu) 模块、[MenuItem](https://www.electronjs.org/zh/docs/latest/api/menu-item#new-menuitemoptions) 菜单项与 [accelerator](https://www.electronjs.org/zh/docs/latest/api/accelerator) 快捷键知识

```javascript
const { app, Menu } = require('electron')

//是否是苹果系统
const isMac = process.platform === 'darwin'

const template = [
  {
    label: '百度',
    submenu: [
      {
        label: '打开新窗口',
        click: () => {
          const win = new BrowserWindow({
            width: 300,
            height: 300,
          })
          win.loadURL('https://www.baidu.com')
        },
      },
      //分隔线
      {
        type: 'separator',
      },
      {
        label: '退出',
        click: async () => app.quit(),
        //定义快捷键
        accelerator: 'CommandOrControl+q',
      },
      //渲染进程触发主进程通信
      {
        click: () => mainWindow.webContents.send('update-counter', 1),
        label: 'Increment',
      },
      isMac
      ? { label: '关闭', role: 'close' }
      : { role: 'quit' },
    ],
  },
  {
    label: 'github',
    submenu: [
      {
        label: 'www.github.com',
      },
    ],
  },
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
```

### 右键菜单

electron 可以定义快捷右键菜单，需要预加载脚本与主进程结合使用

main.js 主进程定义 ipc 事件，当 preload.js 触发事件时显示右键菜单

```javascript
ipcMain.on('show-context-menu', (event) => {
  const popupMenuTemplate = [
    { label: '退出', click: () => app.quit() },
  ]

  const menu = Menu.buildFromTemplate(
    popupMenuTemplate,
  )
  menu.popup(
    BrowserWindow.fromWebContents(event.sender),
  )
})
```

preload.js 预加载脚本定义，用于触发右键事件，然后通过IPC调用主进程显示右键菜单

```javascript
window.addEventListener('contextmenu', (e) => {
  e.preventDefault()
  ipcRenderer.send('show-context-menu')
})
```

## 对话框

[dialog](https://www.electronjs.org/zh/docs/latest/api/dialog) 模块用于打开和保存文件、显示警告或确认消息框等功能，dialog 运行于主进程中

### 错误消息

使用 [showErrorBox](https://www.electronjs.org/zh/docs/latest/api/dialog#dialogshowerrorboxtitle-content) 可以控制显示错误消息，两个参数第一个参数是标题，第二个参数是显示内容

```javascript
dialog.showErrorBox('通知', '你没有接收协议')
```

### 消息框

使用 [showMessageBox](https://www.electronjs.org/zh/docs/latest/api/dialog#dialogshowmessageboxbrowserwindow-options) 或 [showMessageBoxSync](https://www.electronjs.org/zh/docs/latest/api/dialog#dialogshowmessageboxsyncbrowserwindow-options) 显示消息框，返回结果是点击的按钮索引，然后你可以根据不同点击的按钮实现不同的业务。

建议使用 **showMessageBox** 异步方法处理消息框

```javascript
app.whenReady().then(async () => {
  createWindow()
	const res = await dialog.showMessageBox({
    type: 'warning',
    title: '你要退出吗？',
    detail: '有问题吗？',
    buttons: ['取消', '退出'],
    //取消按钮的索引，使用esc根据索引调用取消按钮，默认为0，所以建议在buttons中将取消设置为第一个
    cancelId: 0,
    checkboxLabel: '接收协议',
    checkboxChecked: false,
  })
  
  if (!res.checkboxChecked) return dialog.showErrorBox('通知', '你没有接收协议')
  if (res.response == 1) app.quit()
})
```

### 选择文件

main.js 主进程，定义 IPC 通信事件 fileDialog 用于被渲染进程调用

```javascript
...
app.whenReady().then(() => {
  createWindow()
  ipcMain.handle('fileDialog', () => {
    return dialog.showOpenDialog({
	    //对话框窗口的标题
      title: '选择文件',
      //选择文件、目录，并支持多选
      properties: [
        'openFile',
        'openDirectory',
        'multiSelections',
      ],
      //文件类型限制
      filters: [
        {
          name: 'Images',
          extensions: ['jpg', 'png', 'gif'],
        },
      ],
    })
  })
})
...
```

preload.js 预加载脚本，用于向主进程 main.js 发送 IPC 通信，调用 dialog 模块选择文件

```javascript
const {
  contextBridge,
  ipcRenderer,
} = require('electron/renderer')

contextBridge.exposeInMainWorld('api', {
  selectFiles: () => {
    return ipcRenderer.invoke('fileDialog')
  },
})
```

renderer.js 渲染脚本，使用 IPC 通信通过 preload.js 调用主进程任务，并将dialog获取到的文件路径放入DOM `#files` 标签中

```javascript
const bt = document.querySelector('#btn')
bt.addEventListener('click', async () => {
  const res = await api.selectFiles()
  document.querySelector('#files').innerHTML =
    res.filePaths.join('<br/>')
})
```

index.html 模板

- `#btn` 按钮用于触发IPC通信
- `#files` 标签用于显示 dialog 获取的文件列表

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'" />
    <meta
      http-equiv="X-Content-Security-Policy"
      content="default-src 'self'; script-src 'self'" />
    <title>houdunren</title>
  </head>
  <body>
    <button id="btn">选择文件</button>
    <div id="files"></div>
    <script src="renderer.js"></script>
  </body>
</html>
```

### 保存文件

使用 [showSaveDialogSync](https://www.electronjs.org/zh/docs/latest/api/dialog#dialogshowsavedialogsyncbrowserwindow-options) 与 [showSaveDialog](https://www.electronjs.org/zh/docs/latest/api/dialog#dialogshowsavedialogbrowserwindow-options) 接口用于保存文件

下面是使用 dialog 保存文件的示例

main.js 主进程，使用 dialog 模块选择文件保存位置，并调用 node 的 fs 模块写入文件

```javascript
app.whenReady().then(() => {
  createWindow()
  ipcMain.handle('saveFileDialog', async () => {
    const res = await dialog.showSaveDialog({
      //默认文件名
      defaultPath: fileName,
      //对话框窗口的标题
      title: '保存壁纸图片',
      message: '',
      //允许创建目录
      properties: ['createDirectory']
    })
    writeFileSync(res.filePath, 'wenjianming')
    return res
  })
})
```

preload.js 预加载脚本，用于向主进程main.js发送IPC通信，调用 dialog 模块保存文件

```javascript
const {
  contextBridge,
  ipcRenderer,
} = require('electron/renderer')

contextBridge.exposeInMainWorld('api', {
  saveFile: () => {
    return ipcRenderer.invoke('saveFileDialog')
  },
})
```

renderer.js 渲染脚本，使用 IPC 通信通过 preload.js 调用主进程任务，并将 dialog 保存文件

```javascript
const bt = document.querySelector('#btn')
bt.addEventListener('click', async () => {
  const res = await api.saveFile()
})
```

index.html 模板，定义`#btn`按钮用于触发保存文件的 IPC 通信

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta
          http-equiv="Content-Security-Policy"
          content="default-src 'self'; script-src 'self'" />
    <meta
          http-equiv="X-Content-Security-Policy"
          content="default-src 'self'; script-src 'self'" />
    <title>houdunren</title>
  </head>
  <body>
    <button id="btn">保存文件</button>
    <div id="files"></div>
    <script src="renderer.js"></script>
  </body>
</html>
```

## 通知消息

Mac、Windows、Linux 三个操作系统都为应用程序向用户发送通知提供了手段。 在主进程和渲染进程中，显示通知的技术是不同的

对于渲染进程，Electron 方便地允许开发者使用 [HTML5 通知 API](https://developer.mozilla.org/zh-CN/docs/Web/API/notification/Notification) 发送通知，要在主进程中显示通知，您需要使用 [Notification](https://www.electronjs.org/zh/docs/latest/api/notification) 模块

### 渲染进程

渲染进程可以使用 [HTML5 通知 API](https://developer.mozilla.org/zh-CN/docs/Web/API/notification/Notification) 发送通知

renderer.js

```javascript
const bt = document.querySelector('#btn')
bt.addEventListener('click', async () => {
  new Notification('通知', {
    body: '记得每天多喝水',
  })
})
```

index.html

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'" />
    <meta
      http-equiv="X-Content-Security-Policy"
      content="default-src 'self'; script-src 'self'" />
    <title>houdunren</title>
  </head>
  <body>
    <button id="btn">发送通知</button>
    <div id="files"></div>
    <script src="renderer.js"></script>
  </body>
</html>
```

### 主进程

主进程发送通知需要使用 [Notification](https://www.electronjs.org/zh/docs/latest/api/notification) 模块

下面是`main.js`主进程发送通知示例

```javascript
app.whenReady().then(() => {
  createWindow()
  new Notification({
    title: '通知',
    body: '记得每天多喝水',
  }).show()
})
```