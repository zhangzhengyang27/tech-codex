---
title: Electron双窗口IPC中转通信与preload安全暴露
description: "这一节正式进入“渲染进程与渲染进程之间怎么通信”的实践。课程没有直接上更复杂的 MessagePort，而是先带大家用最容易理解的方式做出来：让主进程充当消息中转站。通过一个双窗口互发消息的示例，它把几个关键能力串在了一起：主进程里真正持有多个 BrowserWindow 实例、用两组 ipcMain.on 做消息路由、再用目标窗口的 webContents.send 把消息转发出去，最后还演示了 preload 层如何从“通用 send/receive”收口到“点对点 API”。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Electron 双窗口 IPC 中转通信与 preload 安全暴露

## 概述

这一节正式进入“渲染进程与渲染进程之间怎么通信”的实践。课程没有直接上更复杂的 `MessagePort`，而是先带大家用最容易理解的方式做出来：让主进程充当消息中转站。通过一个双窗口互发消息的示例，它把几个关键能力串在了一起：主进程里真正持有多个 `BrowserWindow` 实例、用两组 `ipcMain.on` 做消息路由、再用目标窗口的 `webContents.send` 把消息转发出去，最后还演示了 preload 层如何从“通用 send/receive”收口到“点对点 API”。这套做法最大的价值，是帮你在进入更复杂方案前先建立多窗口通信的第一层心智。

## 学习目标

- 理解渲染进程之间通信的第一种方案：主进程中转（win1 → main → win2）。
- 知道多窗口通信的前提是主进程里真的持有多个 `BrowserWindow` 实例，并能分清谁是 win1、谁是 win2。
- 会用两组 `ipcMain.on` + 目标窗口 `webContents.send` 实现消息路由。
- 认识到 preload 暴露“通用 send(channel, data) / receive(channel, fn)”的安全风险，并改造成受控的点对点 API。
- 明确主进程中转只是渲染进程互通的第一种方案，更专门的 `MessagePort` 留到后面展开。

---

## 一、渲染进程互通，最直观的方式是主进程中转

这一节一上来没有直接讲复杂模型，而是先切入最好理解的路径：窗口 1 把消息发给主进程，主进程收到后再转发给窗口 2，反过来窗口 2 也一样。这种方式的优点很明显——逻辑直观、和前一节刚学完的基础 IPC 完全衔接，更容易帮大家建立多窗口通信的第一层理解。

```text
窗口 1 -> 主进程 -> 窗口 2
窗口 2 -> 主进程 -> 窗口 1
```

所以这一节其实在传递一个很重要的认知：渲染进程之间通信，并不一定意味着它们要直接互相连接，完全可以先通过主进程做总线中转。先把“主进程做中转”想清楚，再学后面 `MessagePort` 这类更专门的方案会容易很多。

## 二、多窗口的本质：主进程真正创建多个 BrowserWindow

课程在动手实现之前，先做了一个非常关键的结构准备：把原来的单窗口复制成两个页面（例如 `index.html` 和 `index1.html`），然后在主进程里创建两个 `BrowserWindow`。这一步看起来只是复制页面，但真正重要的是——你现在开始明确区分不同窗口实例，主进程后面转发消息时，必须知道发给哪一个窗口。

```ts
function createWindows() {
  const win1 = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  })

  const win2 = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  })

  win1.loadFile("index.html")
  win2.loadFile("index1.html")

  return { win1, win2 }
}
```

双窗口通信的前提，是主进程里真的持有这两个窗口实例。页面文件复制只是表象，关键是窗口实例引用要清晰；课程里把窗口宽度故意设得不一样，也是为了调试时更容易区分两个窗口。

## 三、主进程做路由：两组 ipcMain.on + 目标窗口 webContents.send

主进程这一侧的实现非常典型。思路是：监听窗口 1 发来的频道，然后把数据通过窗口 2 的 `webContents.send()` 转发出去；反过来再写一组监听窗口 2、再转发给窗口 1 的逻辑。主进程这里没有做复杂计算，它更像是一个消息路由器。

```ts
ipcMain.on("win1-send-to-win2", (_event, data) => {
  win2.webContents.send("win2-receive-from-win1", data)
})

ipcMain.on("win2-send-to-win1", (_event, data) => {
  win1.webContents.send("win1-receive-from-win2", data)
})
```

频道命名最好把方向写清楚，不然后面非常容易混。这里用箭头式命名只是风格问题，核心是“看到名字就知道谁发给谁”。课程训练的就是多窗口消息路由的清晰命名习惯——这点比记住某几行代码更重要。

## 四、preload 暴露通用 send/receive：功能能跑但不安全

课程先演示了一种“很自然但不够安全”的写法：preload 里暴露一个通用的 `send` 和一个通用的 `receive`。这样页面侧想往哪个 channel 发就往哪个发，想监听哪个 channel 就监听哪个。从功能角度说最省事，但问题也随之而来：这相当于把 IPC 通道的自由度整个交给了渲染进程，安全边界一下就模糊了。

```ts
// 不够安全的通用写法
contextBridge.exposeInMainWorld("channel", {
  send: (channel, data) => ipcRenderer.send(channel, data),
  receive: (channel, callback) => {
    ipcRenderer.on(channel, (_event, data) => callback(data))
  },
})
```

这和前一节讲“不要直接把高权限 API 暴露给页面”是一脉相承的。只不过这次的危险不是 `fs`，而是“任意频道消息发送能力”。这类通用封装在 demo 阶段方便，但不适合作为长期设计——只要页面能任意指定频道，安全控制就会明显变弱。

## 五、更稳的做法：点对点 API 收口

课程后半段做了安全改造：不再暴露通用 `send / receive`，而是直接暴露点对点方法，例如 `sendToWin2(message)` 和 `onMessageFromWin2(callback)`。这一步把原本开放的“任意频道”能力，收缩成只能发定义好的那几个消息、只能监听定义好的那几个回调。

```ts
// preload.js
contextBridge.exposeInMainWorld("electronAPI", {
  sendToWin2: (message) => ipcRenderer.send("win1-send-to-win2", message),
  onMessageFromWin2: (callback) => {
    ipcRenderer.on("win1-receive-from-win2", (_event, data) => callback(data))
  },
})
```

点对点暴露比通用暴露更啰嗦，但也更安全。这一步其实就是把前一节讲的 `contextBridge` 思路落实到了 IPC 场景里：渲染进程只拿最小必要能力。后面如果通信场景继续变复杂，也应该优先在 preload 层继续做能力收口，而不是把底层对象直接裸露给页面。

## 六、这节只是第一种方案，本质仍是主进程中转

课程最后专门提醒：这一节做出来的双窗口聊天效果，并不是唯一的渲染进程通信方案，因为它本质上仍然是“渲染进程 A → 主进程 → 渲染进程 B”。真正的消息控制中心仍然在主进程，优点是容易理解、复用前面已经学过的 IPC 模型，但边界也很明显——所有消息都得绕主进程一圈。

```ts
type RendererCommunicationMode = {
  current: "relay-via-main"
  next: "message-port"
}
```

所以课程把下一种方案单独留到后面：`MessagePort`，那一套更像 Electron 里专门面向渲染进程间通信的模型。先易后难的节奏是对的——先把多窗口通信做出雏形，再谈更底层的优化。

## 七、多窗口消息流的心智：受控暴露 + 清晰频道 + 方向明确

把这一节抽象成一句话，它真正建立起来的是“多窗口消息流思维”。课程通过一个具体的双窗口示例，实际上串起了前面几节所有的东西：主进程和渲染进程分工、preload 的桥梁作用、`contextBridge` 的受控暴露、`ipcMain.on`、`webContents.send`。

```ts
type SafeIpcDesign = {
  explicitChannels: true
  explicitDirection: true
  noGenericRendererApi: true
}
```

真正稳定的 Electron 通信，关键不在“API 会不会用”，而是在边界和命名上：频道命名是不是清楚、方向是不是明确、页面到底被暴露了多少能力。到这一节，后续再学 `MessagePort` 就会更容易理解它到底解决了什么问题。

## 八、这一节打通的是“受控多窗口通信”的最小闭环

到这一节为止，渲染进程之间通信的第一层实践已经建立起来了。它真正交付的不是某几行转发代码，而是三件事：主进程持有多个窗口实例是中转的基础；`ipcMain.on` 接、目标窗口 `webContents.send` 发是路由的核心；preload 暴露受控的点对点 API 是安全收口的方式。记住“频道清晰、方向清晰、权限最小、中转明确”这四条，后面无论通信模型怎么升级，这条主线都不会变。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 两个页面之间通信为什么还要经过主进程 | 这是当前最容易理解也最好实现的第一层方案 | 先走主进程中转，后面再学 `MessagePort` |
| `ipcMain` 为什么不能直接 `send` 给渲染进程 | `ipcMain` 主要是接收端，不是主动下发通道 | 通过目标窗口的 `webContents.send()` 发送 |
| 页面里为什么不直接暴露通用 `send(channel, data)` | 会让渲染进程拥有任意频道通信能力，安全边界太松 | 改成 preload 点对点暴露具体方法 |
| 频道名字太多太乱，很容易写错 | 没有提前规划命名方向 | 把方向写进频道名，例如 `win1-send-to-win2` |
| 双窗口功能做出来了，下一步怎么更专业 | 当前方案仍依赖主进程每次转发 | 后续学习 `MessagePort` 这类更专门的通信方案 |
| 多窗口通信的关键到底是什么 | 容易只盯着页面复制，忽略窗口实例持有 | 主进程必须真正持有并分清 win1 / win2 引用 |

## 延伸阅读

- 上一篇：[Electron IPC 通信模式、invoke-handle 与 webContents send 实战](09-Electron-IPC通信模式、invoke-handle与webContents-send实战.md)
- 下一篇：[Electron MessagePort 通信模型、后台任务场景与 IPC 区别](11-Electron-MessagePort通信模型、后台任务场景与IPC区别.md)
- 相关：[Electron IPC Tutorial](https://www.electronjs.org/docs/latest/tutorial/ipc)、[Electron `ipcMain` API](https://www.electronjs.org/docs/latest/api/ipc-main)、[Electron `webContents` API](https://www.electronjs.org/docs/latest/api/web-contents)、[Electron `contextBridge` API](https://www.electronjs.org/docs/latest/api/context-bridge)
