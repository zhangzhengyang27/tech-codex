---
title: Electron官方安全准则、默认防护与可落地最佳实践
description: "这一节回到 Electron 官方文档的安全章节，把那 17 条准则提炼成真正有落地价值的部分。课程先立起一个前提：Electron 不是普通浏览器，它同时拥有 Chromium 渲染能力和 Node.js / 系统级能力，所以风险面天然更大。接着把安全项分成两类——一类已随新版默认值较安全，一类必须由开发者主动配置——并最终收束成一条主线：只加载可信内容、保持渲染层低权限、严控页面跳转 / 开新窗 / 外部访问。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Electron 官方安全准则、默认防护与可落地最佳实践

## 概述

这一节回到 Electron 官方文档的安全章节，把那 17 条准则提炼成真正有落地价值的部分。课程先立起一个前提：Electron 不是普通浏览器，它同时拥有 Chromium 渲染能力和 Node.js / 系统级能力，所以风险面天然更大。接着把安全项分成两类——一类已随新版默认值较安全，一类必须由开发者主动配置——并最终收束成一条主线：只加载可信内容、保持渲染层低权限、严控页面跳转 / 开新窗 / 外部访问。这一节真正建立起来的是一套“默认值保留 + 高风险边界主动治理”的优先级视角。

## 学习目标

- 理解为什么 Electron 不能简单当浏览器来对待：浏览器风险 + 系统能力风险叠加，风险面更大。
- 区分哪些安全项是现在的默认防护（`nodeIntegration`、`contextIsolation`、`sandbox`），哪些需要开发者主动补充。
- 记住官方安全主线：可信内容、低权限渲染层、受控导航与外部访问。
- 知道最该自己补的几条规则：CSP、导航控制、新窗口控制、`shell.openExternal` 控制、IPC 发送者校验。
- 建立落地方法：先保留官方安全默认值，再把官方给出的边界控制示例有选择地直接落进项目。

---

## 一、核心前提：Electron 不是浏览器，风险面是叠加的

课程先带大家回到官方安全文档开头那层前提：Electron 不是普通浏览器。这句话很关键，因为 Electron 同时拥有 Chromium 的渲染能力和 Node.js / 系统级能力。它既继承了 Web 世界的风险（XSS、远程资源注入），又额外叠加了桌面端风险（文件系统读写、系统 API 调用、原生窗口和外部协议能力）。

```ts
type ElectronSecurityPremise = {
  chromiumSurface: true
  nodeSurface: true
  systemApiSurface: true
}
```

所以课程才会说：你想享受 Electron 的高能力，就必须在安全上多投入一些心思。一旦你把 Electron 当成“只是个网页容器”，后面很多风险判断都会失真。安全问题不是附属话题，而是基础能力的一部分。

## 二、“默认安全”不等于“你可以不用看文档”

课程很务实地提醒大家：官方 17 条里有些现在默认就比较安全了，例如默认关闭 `nodeIntegration`、默认开启 `contextIsolation`、新版本还默认更强调 `sandbox`。所以这些项你不主动改坏它，就已经比以前安全了。但课程马上指出一个误区：默认安全不代表你就可以不看文档，因为还有很多项必须开发者自己主动处理。

```ts
type SecurityRuleType =
  | "default-safe-enough"
  | "developer-must-configure"
```

例如是否加载远程内容、CSP 怎么配、页面跳转怎么限制、新窗口怎么控制、IPC 发送者怎么校验。这节课真正想让大家学会的是：哪些是“别乱动默认值”，哪些是“你自己要补”。这两者不是一回事，后面真正项目落地时这个分类会非常有用。

## 三、官方安全主线可以收束成一句话

课程虽然把 17 条扫了一遍，但真正主线非常清晰，可以概括成三层。第一层远程内容风险：尽量不要加载不可信远程内容，如果加载优先 HTTPS / WSS。第二层渲染进程权限风险：不要开 `nodeIntegration`、保持 `contextIsolation`、保持 `sandbox`。第三层页面行为控制风险：限制页面跳转、限制新窗口创建、不要轻易 `shell.openExternal`、不要乱暴露 IPC 能力。

```ts
type ElectronSecurityCore = {
  trustedContentOnly: true
  leastPrivilegeRenderer: true
  controlledNavigation: true
}
```

这 17 条规则本质上是在帮你守住几个大门：代码从哪来、页面能干什么、页面能跳去哪、页面能调谁的能力。你后面如果只记住“可信内容 + 低权限 + 控制跳转”，已经能避开很多坑。

## 四、最该自己补的规则：CSP、导航、新窗口、外链、IPC 校验

课程后半段把重心放在那些“你要自己动手补”的规则上，最值得单独记住的几类：内容安全策略 `CSP`、禁止或限制页面导航、禁止或限制新窗口创建、谨慎使用 `shell.openExternal`、校验 IPC 发送者。这几类之所以重要，是因为它们都不属于“你不配置就自动安全”，而往往取决于你业务代码怎么写。

```ts
type MustConfigureSecurity =
  | "content-security-policy"
  | "navigation-control"
  | "window-open-control"
  | "shell-open-external-control"
  | "ipc-sender-validation"
```

课程给了一个很实用的建议：这些官方示例可以直接抄到自己项目里做起点。这不是偷懒，而是因为它们本来就是最佳实践模版。如果你只想记几条最实用的，这几类优先记。

## 五、CSP 和“只加载安全内容”是一组配套规则

课程反复提到：只加载安全内容、尽量走 HTTPS / WSS、不要关闭 `webSecurity`、不要乱放开 insecure content，还要配 `CSP`。这些看起来像很多散点，但其实是一组：`CSP` 的作用在于把“允许加载的来源”收紧。所以课程提醒不要把 `CSP` 写成 `*`，不要让所有来源都被允许。

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; script-src 'self'; connect-src 'self' https://api.example.com"
/>
```

和普通浏览器里的 CSP 思路一致，但放到 Electron 里后果更大，因为一旦恶意内容进来，渲染层可能离系统能力更近。在 Electron 里，`*` 这种过宽策略风险更高。

## 六、跳转、新窗口、外链之所以危险：受控上下文会失控

课程连续讲了“不要随便导航、不要随便开新窗口、不要对不可信内容用 `shell.openExternal`”。它们表面看是三件事，实际上风险逻辑连在一起：一旦页面能任意跳转或开新窗，你就失去了对当前应用上下文的可控性、对内容来源的约束、对后续用户动作的安全预期。

```ts
contents.on("will-navigate", (event, url) => {
  // 校验 url，不允许就 event.preventDefault()
})

contents.setWindowOpenHandler(({ url }) => {
  return { action: "deny" }
})
```

这些 API 的共同目标是把页面从“想跳哪就跳哪”收回到“必须先经过主进程判断”。这是把浏览器安全思维继续往桌面应用里延伸，在 Electron 里尤其重要，因为页面后面可能连着系统能力。

## 七、最值得记住的不是 17 条，而是落地优先级

如果把这一节收束成一句工程建议：默认安全项别乱改，需要自己补的高价值规则优先照着官方示例落地。课程已经把策略讲得很清楚：默认值能帮你挡掉一部分风险，你自己最该补的是导航、新窗口、外链、IPC 发送者这些边界。

```ts
type ElectronSecurityAdoptionOrder = [
  "keep-safe-defaults",
  "restrict-content",
  "restrict-navigation",
  "validate-ipc"
]
```

这样做的好处是：不需要一开始就设计一整套复杂安全框架，但也不会因为“先不管”而裸奔。到这一节为止，Electron 篇章已经把“架构感、通信感、安全感”三条主线都立起来了。

## 八、这一节给 Electron 篇章补上了安全主线

到这一节为止，Electron 的安全问题不再是一堆散点规则，而是一套可执行的优先级。它真正交付的是：理解 Electron 风险面是浏览器 + 系统能力叠加；分清默认防护和开发者必须补的边界；记住 CSP、导航控制、新窗口控制、外链控制和 IPC 校验这几条高风险项。把这些作为边界决策，安全设计就从抽象概念变成了具体的工程动作。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 我已经开了 `contextIsolation`，是不是应用就安全了 | 这只是默认边界的一部分 | 还需补内容来源限制、导航控制、新窗口限制、IPC 校验等 |
| 为什么官方说不要随便 `shell.openExternal` | 外部链接不受控可能带来任意跳转或命令执行风险 | 只允许可信 URL，通过白名单判断 |
| `CSP` 真的有必要吗 | Electron 不是普通网页，渲染层被注入风险更大 | 仍要像 Web 一样认真配 CSP，甚至更严 |
| 为什么官方 17 条里有些几乎用不到 | 有些是默认值、有些是边界场景 | 先分“默认防护”和“手动补齐”的优先级，再逐条看 |
| 看官方文档太多容易乱 | 直接背 17 条效果很差 | 先抓主线：可信内容、低权限渲染层、受控导航与 IPC 校验 |

## 延伸阅读

- 上一篇：[Electron MessagePort 隔离环境实践、window.postMessage 桥接与安全取舍](13-Electron-MessagePort隔离环境实践、window-postMessage桥接与安全取舍.md)
- 下一篇：[Electron 菜单系统、角色菜单、快捷键与动态菜单项更新](15-Electron菜单系统、角色菜单、快捷键与动态菜单项更新.md)
- 相关：[Electron Security Tutorial](https://www.electronjs.org/docs/latest/tutorial/security)、[Electron Context Isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)、[Electron `webContents` API](https://www.electronjs.org/docs/latest/api/web-contents)、[OWASP Top 10](https://owasp.org/www-project-top-ten/)
