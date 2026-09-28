---
title: Electron全局快捷键、按键映射与全屏控制
description: "这一节开始讲比菜单项 accelerator 更强一层的能力：globalShortcut。课程先把快捷键体系分成两层——菜单内快捷键和应用级全局快捷键，并强调官方文档里那张“可配置按键映射表”才是查字符串写法的标准字典。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Electron 全局快捷键、按键映射与全屏控制

## 概述

这一节开始讲比菜单项 `accelerator` 更强一层的能力：`globalShortcut`。课程先把快捷键体系分成两层——菜单内快捷键和应用级全局快捷键，并强调官方文档里那张“可配置按键映射表”才是查字符串写法的标准字典。接着围绕 `CommandOrControl` 的跨平台价值、避免误用系统常见快捷键、注册 / 注销必须成对设计展开，最后用“切换全屏”示例收尾，并指出全屏与普通窗口最大化在系统语义上不是同一回事。这一节把桌面端“效率动作”和“交互礼仪”讲得很到位。

## 学习目标

- 区分菜单项 `accelerator` 和 `globalShortcut`：后者是应用级全局注册，不依赖你先点菜单。
- 知道写快捷键字符串前先查官方按键映射表，别靠猜平台名和组合键。
- 理解 `CommandOrControl` 这类 token 的价值：一套配置同时兼容 macOS 与 Windows / Linux 键位习惯。
- 警惕误用系统常见快捷键（`Ctrl/Cmd + C / V / X` 等），并做到注册与注销成对设计。
- 掌握用 `BrowserWindow.getFocusedWindow()` + `isFullScreen()` 实现全屏切换，并分清全屏与最大化的系统语义差异。

---

## 一、菜单快捷键和全局快捷键不是一回事

上一节已经带大家看过菜单项上的 `accelerator`，它更多是菜单项的快捷键展示与绑定。而这一节讲的是 `globalShortcut`，这是另一个层级的能力：它不再依赖你必须先点菜单，而是应用层直接注册快捷键，后续只要按到对应组合键就能触发回调。所以课程一开始就切到这个点，是在补“快捷键体系”的第二层：菜单内快捷键、应用级全局快捷键。

```ts
app.whenReady().then(() => {
  globalShortcut.register("CommandOrControl+Shift+1", () => {
    console.log("快捷键触发")
  })
})
```

课程这里不是推翻前面的 `accelerator`，而是在补更强的一层能力。真正全局快捷键的使用场景通常比菜单项更偏“效率动作”，这也说明桌面端的交互层开始往更专业的使用习惯靠拢了。

## 二、最重要的是官方那张按键映射表

课程里先没有马上继续写代码，而是带大家看官方的快捷键章节。这一点非常有价值，因为全局快捷键最容易出错的往往不是逻辑，而是字符串写错、平台名写错、按键组合记不住。所以课程强调：不知道能配哪些键、不知道某个平台怎么映射，就回到官方文档查。

```ts
type AcceleratorToken =
  | "CommandOrControl"
  | "Shift"
  | "Alt"
  | "Option"
  | "Super"
  | "Meta"
```

例如功能键有哪些、普通按键有哪些、`Alt` 在 macOS 下对应关系是什么、`Super / Meta` 在不同系统上的含义是什么。写快捷键时，官方文档是一个“按键字典”，而不是纯参考书；平台映射是桌面端快捷键最容易忽视的地方。

## 三、CommandOrControl 的价值是跨平台兼容

课程在讲快捷键时反复提到 `CommandOrControl`，这不是 Electron 随便起的别名，它真正解决的是跨平台桌面端最现实的问题：macOS 用户习惯 `Command`、Windows / Linux 用户习惯 `Control`。如果你分别写两套，配置和维护都会复杂很多。

```ts
globalShortcut.register("CommandOrControl+Shift+1", () => {
  console.log("fullscreen toggle")
})
```

所以课程一直推荐用这种跨平台兼容 token，这样你写一套逻辑，Electron 自己就会在不同系统上映射到对应键位。这类 token 是桌面端跨平台快捷键设计里非常好用的抽象；如果后面快捷键越来越多，这种统一写法的价值会更明显。

## 四、最大的坑不是注册失败，而是误用系统常见快捷键

课程在示例里故意拿了一个不好的例子：`CommandOrControl+X`。这个组合为什么不好？因为它在绝大多数应用里已经天然意味着“剪切”。所以课程后面立刻把它改成了 `CommandOrControl+Shift+1`。这里真正想提醒大家的是：快捷键的难点不在 API，而在于你是否尊重桌面端用户已经形成的肌肉记忆。

```ts
app.whenReady().then(() => {
  globalShortcut.register("CommandOrControl+Shift+1", () => {
    console.log("safe shortcut")
  })
})
```

`Ctrl/Cmd + C / V / X / Z / S / P` 这类常见系统快捷键要格外谨慎，全局快捷键一旦冲突，用户体验会比网页热键冲突更糟。课程这里的重点其实是在讲“桌面端交互礼仪”——快捷键设计本质是效率设计，不是程序员自己爱怎么配就怎么配。

## 五、注册与注销必须成对设计

课程除了讲怎么注册，还特别强调了怎么收尾。Electron 的 `globalShortcut` 是应用级能力，所以它和普通页面事件不一样：不是页面销毁了就自然没了。这意味着你在应用生命周期里注册过的快捷键，退出前最好显式注销。课程给出的最简单做法是 `unregisterAll()`，更精细时也可以用 `unregister("...")`。

```ts
app.whenReady().then(() => {
  globalShortcut.register("CommandOrControl+Shift+1", onToggleFullScreen)
})

app.on("will-quit", () => {
  globalShortcut.unregisterAll()
})
```

注册和注销最好成对设计，不要只写前半截。课程推荐把注销放到应用退出生命周期里，非常合理。这一步也是桌面端开发里“资源清理意识”的体现——桌面应用的全局能力通常都要自己收尾。

## 六、全局快捷键最适合绑定应用级动作

课程最后把快捷键接到了一个具体动作：切换全屏。这个示例很合适，因为它具备典型的应用级特征：不依赖页面里某个组件、作用于当前窗口本身。真正的写法重点有两步：先拿当前窗口 `BrowserWindow.getFocusedWindow()`，再判断 `win.isFullScreen()`，然后取反传给 `win.setFullScreen(...)`。

```ts
function toggleFullScreen() {
  const win = BrowserWindow.getFocusedWindow()
  if (!win)
    return

  win.setFullScreen(!win.isFullScreen())
}

globalShortcut.register("CommandOrControl+Shift+1", toggleFullScreen)
```

全局快捷键不一定等于“全局随便改状态”，最好还是围绕当前窗口或当前应用上下文。`getFocusedWindow()` 这种 API 的使用也再次说明主进程才是真正管理窗口状态的地方。

## 七、全屏和窗口最大化不是同一回事

课程最后专门解释了一个很容易被混淆的点：普通窗口占满屏幕和真正的全屏不是同一回事。判断标准很直观：真正全屏时，标题栏不会一直可见，有些平台上只有鼠标移到顶部才会显示出来。这说明桌面端很多行为都不是“视觉上差不多就算一样”，而是底层窗口状态语义真的不同。

```ts
function lockFullScreen(win) {
  win.setFullScreen(true)
  win.setFullScreenable(false)
  win.setResizable(false)
}
```

课程顺带提到一些更强控制：禁止退出全屏、禁止缩放。虽然只是示例，但它已经说明 Electron 窗口控制不仅能改 UI，还能改系统级行为约束。这类系统级状态切换特别适合用主进程统一管理。

## 八、这一节给菜单系统补上了全局效率层

到这一节为止，Electron 的菜单系统和快捷键系统已经能够共同支撑更接近专业桌面工具的交互体验。它真正交付的是：分清菜单内快捷键和全局快捷键两层能力、把官方按键映射表当字典查、用 `CommandOrControl` 做跨平台兼容、避免抢占系统常用键、注册注销成对设计、并用聚焦窗口状态承载全屏切换。把这套记牢，后续再做命令面板、窗口状态控制等会更稳。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 为什么我配的快捷键没反应 | 可能还没到 `app.whenReady()` 就注册了，或字符串写错 | 先确认 ready 时机，再回官方文档查按键字符串 |
| 为什么不要直接用 `CommandOrControl+X` | 它和系统常用操作冲突严重 | 优先选更少冲突的组合，例如加 `Shift` 的组合 |
| 快捷键为什么退出应用后还要手动注销 | 这是应用级注册资源，不是页面事件 | 在 `will-quit` 中 `unregisterAll()` |
| 为什么按了之后是窗口最大化，不像全屏 | 可能调用的不是 `setFullScreen()`，或混淆了平台语义 | 明确使用全屏 API，并观察标题栏行为差异 |
| Dock 菜单和这里的快捷键有什么关系 | Dock 菜单属于菜单入口，全局快捷键是另一层能力 | 不要把菜单里的 `accelerator` 和 `globalShortcut` 混为一谈 |

## 延伸阅读

- 上一篇：[Electron 主进程菜单国际化、系统语言获取与 i18n 接入](17-Electron主进程菜单国际化、系统语言获取与i18n接入.md)
- 下一篇：[Electron 与 Vite 两种集成方案对比、工程接入与版本取舍](19-Electron与Vite两种集成方案对比、工程接入与版本取舍.md)
- 相关：[Electron `globalShortcut` API](https://www.electronjs.org/docs/latest/api/global-shortcut)、[Electron Accelerators](https://www.electronjs.org/docs/latest/api/accelerator)、[Electron `BrowserWindow` API](https://www.electronjs.org/docs/latest/api/browser-window)、[Electron Keyboard Shortcuts](https://www.electronjs.org/docs/latest/tutorial/keyboard-shortcuts)
