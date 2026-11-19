---
title: Electron安全边界、preload脚本与contextBridge前置认知
description: "webPreferences.nodeIntegration 的默认值其实是 false，这不是“保守默认”，而是非常重要的安全设计。原因很简单：Node.js 拿到的权限太大了，它可以读写文件、操作数据库、调系统 API、接触更底层的运行时能力。如果渲染进程页面能直接 require(\"fs\")、require(\"path\")，那就意味着页面脚本拥有了远超普通浏览器页面的能力，安全边界会被瞬间打穿。"
keywords: []
category: Vue
tags: [Vue3, Electron, 安全]
---

# Electron 安全边界、preload 脚本与 contextBridge 前置认知

## 概述

Electron 安全模型最关键的点是：渲染进程默认不该拿到系统级能力。围绕这一点，可以按层次设计一组实验——先开 `nodeIntegration`、再调 `contextIsolation`、再引出 `preload`、再用 `contextBridge` 精细暴露——逐步观察危险在哪、官方为什么默认关掉它、更安全的替代方式是什么。这是后续学习 IPC 与系统 API 接入的安全前置认知。

## 一、nodeIntegration 为什么默认关闭：页面拿到系统能力等于打穿边界

`webPreferences.nodeIntegration` 的默认值是 `false`，这不是"保守默认"，而是非常重要的安全设计。原因：Node.js 拿到的权限太大，可以读写文件、操作数据库、调系统 API、接触更底层的运行时能力。如果渲染进程页面能直接 `require("fs")`、`require("path")`，就意味着页面脚本拥有了远超普通浏览器页面的能力，安全边界会被瞬间打穿。

一个直观的验证方式是在页面里 `require("path")`、`require("fs")` 演示。需要记住的关键结论：只要页面内容存在远程资源、第三方脚本或潜在注入风险，这个开关就尤其危险。

## 二、安全不是单开关：contextIsolation 是另一道闸

一个有价值的实验：把 `nodeIntegration` 打开，页面里的 `require` 仍然报 `not defined`。这说明 Electron 的安全边界不是只靠一个开关。真正拦住页面直接拿 Node 能力的另一个核心选项是 `contextIsolation`；把它关掉之后，页面里的 `require("path")` 才真正工作。这个实验说明：`nodeIntegration` 和 `contextIsolation` 是一起作用在渲染进程权限边界上的，而不是孤立存在。

```ts
webPreferences: {
  nodeIntegration: true,
  contextIsolation: false,
}
```

Electron 当前的默认安全策略是多层隔离，不是单一开关：把一个开关打开，不代表整条防线就全没了。后续理解 preload 和 contextBridge 时，这个多层隔离意识是关键前提。

## 三、preload 的定位：主进程能力与页面之间的受控桥梁

在明确 `nodeIntegration` 的风险之后，Electron 官方推荐的做法是 `preload`。它最重要的特征不是名字，而是执行时机和权限位置——它在页面脚本加载之前执行，拥有比普通渲染页面更高的能力，但它不直接把全部 Node 能力暴露给页面。

把 preload 理解成一个"中间层"很准确：页面侧想要一些能力，又不能直接放开 Node，就通过 preload 作为桥梁精细暴露。这是 Electron 安全模型里的关键转折点：从这里开始，问题不再是"能不能暴露"，而是"暴露多少、暴露哪些、怎么暴露"。

```ts
new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, "preload.js"),
  },
})
```

preload 不是普通业务脚本，它的角色是安全桥梁；后续所有 IPC 和系统能力接入，都和这层桥梁设计有关。只有先理解 preload 的定位，才不会一股脑往页面里暴露所有能力。

## 四、contextBridge：把"该给的那部分能力"精细挂到 window

`contextBridge` 最直观的用途是：在 preload 里准备一个对象，然后通过 `exposeInMainWorld()` 挂到页面的 `window` 上。一个相对安全的小例子是只把 `node`、`chrome`、`electron` 版本信息暴露出来，它体现了 `contextBridge` 的基本模式：不是直接让页面拿 `process`，而是只挑需要的值暴露出去。

与之相对的错误示范：直接把 `process` 或 `fs` 这类高权限对象整个暴露到页面里。

```ts
contextBridge.exposeInMainWorld("versions", {
  node: process.versions.node,
  chrome: process.versions.chrome,
  electron: process.versions.electron,
})
```

`contextBridge` 的本质是"受控暴露"，不是"开闸放水"。能暴露一个简单字符串或对象字段，就不要整包暴露高权限对象；在学习 IPC 之前，先要把安全边界立住。

## 五、Electron 20 之后 preload 也默认受限：把渲染进程当不可信边界

一个重要趋势：从 Electron 20 开始，preload 默认沙盒化更严格。Electron 新版本在不断强化渲染进程的安全隔离，意味着即使是 preload，也不能再当成"无限权限区"。

这种趋势传达的安全观：页面是不可信边界，preload 是桥，桥本身也要谨慎。这也是 IPC 通信被官方反复推荐的原因——真正更安全的做法通常是：页面发送意图 → 主进程执行高权限操作 → 页面只拿结果。

```ts
type ElectronSecurityBaseline = {
  nodeIntegration: false
  contextIsolation: true
  preloadBridgeOnly: true
}
```

新项目默认应顺着官方安全方向设计，而不是从一堆"图方便"的配置出发。这部分是 IPC 最佳实践在安全层面的铺垫：隔离不是麻烦，而是必要的设计。

## 六、sandbox 同样在控制能力边界：越放开风险越高

`sandbox` 与前面的 `contextIsolation`、`nodeIntegration` 一样，都在影响渲染层的能力边界。实验可以观察到：某些情况下把 `sandbox` 关掉，preload 里能更直接地接触一些高权限能力，例如再把 `fs` 暴露到页面。

从"能不能做出来"角度看似很方便，但这恰恰说明风险更大了——因为正在一步步削弱 Electron 本来提供的安全隔离。

```ts
webPreferences: {
  sandbox: false,
}
```

这类实验的价值是理解边界是怎么被打开的，而不是鼓励这样写。sandbox 相关配置越放松，渲染层风险越高；如果发现"这样写真方便"，恰恰说明更要克制。

## 七、把安全观落成一条最小暴露原则

把以上内容抽象成一句话，就是 Electron 的安全边界意识。完整的演示链路是：打开 `nodeIntegration` 看会发生什么 → 再调整 `contextIsolation` → 再引出 `preload` → 再通过 `contextBridge` 精细暴露 → 再警示不要把高权限对象整个甩出去。这条链路不是抽象讲安全，而是逐步展示什么叫危险、为什么危险、官方为什么默认关掉它、更安全的替代方式是什么。

```ts
type ElectronSecurityMindset = {
  rendererIsolated: true
  preloadBridged: true
  systemOpsInMain: true
}
```

更安全的思路可以记成四句话：页面拿最少能力、preload 做桥、主进程做重活、IPC 做通信。真正成熟的 Electron 开发，不是"怎么开更多权限"，而是"怎么只开够用的权限"。

## 八、安全观小结

桌面端篇章从架构认知进入安全设计认知后，真正有价值的不是某个 API 细节，而是安全边界感：渲染进程应该尽量被隔离，真正需要系统能力时应通过 preload 和 IPC 做最小暴露。带着这个认知去学习 IPC，就不会把它当成"麻烦的额外步骤"，而会理解成必要的隔离设计。本篇为后续 IPC 通信和系统 API 接入的安全前置认知打好基础。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 为什么页面里不能直接 `require("path")` | `nodeIntegration` 默认关闭且 `contextIsolation` 默认开启 | 这正是 Electron 的默认安全设计 |
| 关掉 `contextIsolation` 后功能能跑，是不是更好 | 只是边界被放开，不代表更安全或更合理 | 优先走 preload + `contextBridge` 的桥接方式 |
| 能不能直接把 `process` 或 `fs` 挂到 `window` | 技术上能做，但安全风险极高 | 只暴露最小必要能力，复杂操作后续经 IPC 去主进程执行 |
| 为什么还要学 IPC，直接暴露不是更方便吗 | 方便和安全有冲突 | IPC 让页面只传意图，高权限操作在主进程完成 |
| Electron 20 之后 preload 还有完整 Node 吗 | 默认沙盒化更严格，权限更受限 | 把渲染进程当不可信边界，能力按需经桥暴露 |
| 关掉 `sandbox` 能省事吗 | 能，但等于削弱官方安全隔离 | 除非明确必要，否则保持默认沙盒 |

## 延伸阅读

- 上一篇：[Electron 主进程 app 生命周期、平台差异与核心方法](07-Electron主进程app生命周期、平台差异与核心方法.md)
- 下一篇：[Electron IPC 通信模式、invoke-handle 与 webContents send 实战](09-Electron-IPC通信模式、invoke-handle与webContents-send实战.md)
- 相关：[Electron Security Tutorial](https://www.electronjs.org/docs/latest/tutorial/security)、[Electron Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)、[Electron Preload Scripts](https://www.electronjs.org/docs/latest/tutorial/tutorial-preload)、[Electron `contextBridge` API](https://www.electronjs.org/docs/latest/api/context-bridge)
