---
title: Electron主进程菜单国际化、系统语言获取与i18n接入
description: "这一节解决一个容易被忽略的问题：Electron 应用的国际化至少有两层，渲染进程里的前端框架国际化，和主进程里原生菜单 / 系统交互的国际化，两者不能混为一谈。课程主张主进程侧直接用 Node 可运行的轻量 i18n 库，而不是把前端页面那套 i18n 搬过来。随后演示了 locales 语言包结构、i18n.configure() 初始化、setLocale() + __() 取文案，并用 app.getLocale() 从系统取语言、.toLowerCase() 与本地命名对齐。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Electron 主进程菜单国际化、系统语言获取与 i18n 接入

## 概述

这一节解决一个容易被忽略的问题：Electron 应用的国际化至少有两层，渲染进程里的前端框架国际化，和主进程里原生菜单 / 系统交互的国际化，两者不能混为一谈。课程主张主进程侧直接用 Node 可运行的轻量 `i18n` 库，而不是把前端页面那套 i18n 搬过来。随后演示了 `locales` 语言包结构、`i18n.configure()` 初始化、`setLocale() + __()` 取文案，并用 `app.getLocale()` 从系统取语言、`.toLowerCase()` 与本地命名对齐。最关键的一个提醒是：必须先 `setLocale` 再生成菜单模板，否则菜单会拿到旧语言。

## 学习目标

- 理解 Electron 国际化分两层：渲染进程页面 UI 和主进程菜单 / 原生文本，二者不能互相兜底。
- 知道主进程侧更适合直接用 Node 友好的轻量 i18n 库，而不是复用前端框架的 i18n 实例。
- 会用 `locales` 目录 + `zh-cn.json / en.json` 组织语言包，并用 `i18n.configure()` 完成初始化。
- 掌握 `setLocale()` + `__()` 的取值方式，并理解把 `__` 包一层 `t()` 是为了贴近前端调用习惯。
- 明白主进程最自然的语言来源是 `app.getLocale()`，且要 `.toLowerCase()` 与本地语言包命名对齐；菜单必须在 `setLocale` 之后创建。

---

## 一、国际化至少两层：页面层和主进程层

课程一开始就把 Electron 国际化拆成两个部分：渲染进程里的 Vue / React 页面国际化，和主进程里的菜单、系统交互文本国际化。前者大家通常已经比较熟悉，比如 `vue-i18n`、`react-intl`，这类方案处理的是页面层文本。但 Electron 应用还有很多内容其实不在页面里，例如顶部菜单、Dock 菜单、原生上下文菜单，以及其他主进程生成的系统级文本，这些内容不走渲染进程框架，所以不能直接指望页面里的 i18n 帮你兜住。

```ts
type ElectronI18nLayer = {
  renderer: "framework-i18n"
  main: "node-side-i18n"
}
```

只做页面国际化，不等于整个 Electron 应用已经国际化。主进程菜单是非常容易被忽略的一层，这节课真正想提醒大家的是“国际化边界感”。

## 二、主进程侧用 Node 友好的 i18n 库，而不是硬搬前端方案

课程里在主进程选的方案很务实：直接用一个 Node 侧的 `i18n` 库。这个选择很合理，因为主进程运行的本质仍然是 Node.js 环境，所以需要的是一个能在 CommonJS 下使用、配置简单、适合主进程脚本直接调用的国际化方案，而不是再把渲染进程框架的整套 i18n 工程搬过来。

```ts
const i18n = require("i18n")

i18n.configure({
  locales: ["en", "zh-cn"],
  directory: path.join(__dirname, "locales"),
})
```

主进程里优先选 Node 友好的国际化库，比强行套前端页面方案更自然。主进程国际化的目标通常不是复杂切换，而是把菜单和系统文本先翻译对。

## 三、语言包结构：locales 目录 + zh-cn.json / en.json

课程在接 `i18n` 之前，先做的是准备语言资源结构：`locales/`、`en.json`、`zh-cn.json`。这一步本质上和前端页面里的语言包组织方式并没有太大差别，只不过这里的消费方变成了主进程，而不是页面框架。也正因为这种结构和前端很像，前端同学在理解上不会有太大跳跃——课程这里其实是在利用你已经熟悉的 key-value 文案映射，只是把运行位置切到了主进程。

```json
// locales/zh-cn.json
{
  "menu.1": "菜单一"
}
```

```json
// locales/en.json
{
  "menu.1": "Menu 1"
}
```

语言包结构越规范，后面主进程和渲染进程之间的 key 风格也越容易统一。语言 key 最好从一开始就保持有语义，不要全靠临时字符串。

## 四、i18n.configure() 先配置资源边界，再使用

课程真正接入这个库时，第一步并不是立刻 `__("xxx")`，而是先做 `i18n.configure()`。这一步的重要性在于它先把资源边界和运行上下文配清楚，配置的关键点包括 `locales` 和 `directory`。然后后面才会继续 `setLocale()` 和 `__()`。这和大多数 i18n 库的思路都一致：先初始化，再选择语言，再取文案。

```ts
i18n.configure({
  locales: ["en", "zh-cn"],
  directory: path.join(__dirname, "locales"),
})
```

先配置，再使用，是这类主进程工具库最基本的顺序。目录路径最好明确写清楚，避免后面打包时找不到语言包。

## 五、setLocale + __，再包一层 t() 贴近前端习惯

课程配置完 i18n 之后，真正的使用链路非常清晰：先 `setLocale()`，再通过 `__()` 取文案。这条链已经足够完成主进程菜单国际化。但课程又顺手做了一层很前端友好的封装：再包一个 `t()`，这样后面使用时就更像大家熟悉的前端 i18n API 了，例如 `t("menu.1")`。

```ts
i18n.setLocale("zh-cn")

const t = (key: string) => i18n.__(key)

console.log(t("menu.1"))
```

`setLocale()` 是切换语言状态，`__()` 是取具体文本。`t()` 这种封装不是技术上必须，但会显著提升可读性和一致性，非常适合统一项目风格。

## 六、最自然的语言来源：app.getLocale() 并归一化

课程在演示时没有把语言写死，而是进一步利用了 Electron 自带的 `app.getLocale()`。这个方法非常适合桌面端，因为用户已经在系统层设置了自己的语言环境，所以最自然的策略就是读取系统 locale 再映射到我们的语言包。课程还做了一步很实用的小处理：`.toLowerCase()`，原因是系统返回的可能是 `zh-CN`，而你的语言文件命名可能是 `zh-cn`，这一层统一之后系统语言和本地资源文件就更容易对上。

```ts
const locale = app.getLocale().toLowerCase()
i18n.setLocale(locale)
```

系统语言是桌面端应用最自然的初始语言来源。返回值格式和你本地资源命名不一致时，记得做归一化处理。课程把这一步加进来，是在让主进程国际化更贴近真实产品行为。

## 七、最容易踩的坑：先 setLocale 再生成菜单模板

课程最后特意强调了一个非常实用但也非常容易忽略的点：菜单模板的创建时机。为什么这点重要？因为菜单和普通页面不一样，它不是一个响应式组件，你不会天然得到“语言变了自动重渲染”的能力。所以如果你先创建好了菜单模板，再去切换 locale，模板里那些 `label` 其实已经是旧值了。课程给出的正确顺序非常清楚：先 `i18n.configure()`、再 `setLocale()`、然后 `t("...")` 生成菜单模板、最后 `setApplicationMenu()`。

```ts
const locale = app.getLocale().toLowerCase()
i18n.setLocale(locale)

const t = (key: string) => i18n.__(key)

const template = [
  { label: t("menu.1") },
]

const menu = Menu.buildFromTemplate(template)
Menu.setApplicationMenu(menu)
```

主进程侧很多结构都不是响应式的，所以初始化顺序比前端页面更重要。这个“时机问题”，是主进程国际化最值得记住的坑点。

## 八、这一节给原生菜单接上了系统语言自动对齐能力

到这一节为止，Electron 应用的原生菜单已经具备了和系统语言自动对齐的能力。它真正交付的是：分清国际化页面层和主进程层两套问题、用 Node 侧 i18n 处理主进程文本、以 `app.getLocale()` 作为最自然语言来源、并牢记 `configure → setLocale → 生成模板 → 挂菜单` 的顺序。带着这套方法，后续再给上下文菜单、Dock 菜单、窗口标题统一接上国际化就会很顺畅。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 页面已经做了 i18n，为什么菜单还得单独做 | 页面和主进程不在同一层，菜单属于主进程侧 | 主进程单独接 Node 侧 i18n |
| 系统返回 `zh-CN`，本地文件却叫 `zh-cn.json` | 命名大小写不一致 | 对 `app.getLocale()` 结果做 `.toLowerCase()` |
| 菜单文案为什么还是旧语言 | 菜单模板创建早于 `setLocale()` | 先切语言，再建模板，再挂菜单 |
| 能不能直接把前端 i18n 实例拿到主进程用 | 技术上会很绕，也不符合分层 | 主进程优先使用 Node 侧轻量 i18n 工具 |

## 延伸阅读

- 上一篇：[Electron Dock 菜单、右键菜单与菜单事件回传](16-Electron-Dock菜单、右键菜单与菜单事件回传.md)
- 下一篇：[Electron 全局快捷键、按键映射与全屏控制](18-Electron全局快捷键、按键映射与全屏控制.md)
- 相关：[Electron `app.getLocale()`](https://www.electronjs.org/docs/latest/api/app#appgetlocale)、[Electron `Menu` API](https://www.electronjs.org/docs/latest/api/menu)、[npm i18n](https://www.npmjs.com/package/i18n)
