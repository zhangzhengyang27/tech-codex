---
title: Electron与Vite两种集成方案对比、工程接入与版本取舍
description: "这一节开始把 Electron 和前端工程真正接到一起。课程里重点对比了两条和 Vite 相关的主流路线：一条是 electron-vite 这类“桌面端脚手架”，另一条是 vite-plugin-electron 这类“Vite 插件”。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Electron 与 Vite 两种集成方案对比、工程接入与版本取舍

## 概述

这一节开始把 Electron 和前端工程真正接到一起。课程里重点对比了两条和 Vite 相关的主流路线：一条是 `electron-vite` 这类“桌面端脚手架”，另一条是 `vite-plugin-electron` 这类“Vite 插件”。它们的核心差异不是 API 写法，而是工程形态——前者从初始化就按 Electron 项目组织目录，后者把 Electron 能力嵌入你已有的 Vite 工程。课程最后反复强调一个工程判断：选型要看你当前项目处于什么阶段，而不是按个人喜好站队。

## 学习目标

- 区分 `electron-vite`（脚手架式）与 `vite-plugin-electron`（插件式）两条接入路线。
- 理解前者自带主进程 / preload / renderer 分层约定，后者尽量保留原 Vite 工程结构。
- 意识到脚手架默认值（如 `sandbox:false`、preload 暴露过多 API）仍需按安全意识复查。
- 注意插件方案更依赖 Electron 大版本、Vite 版本与插件链的兼容性。
- 形成“按项目状态选方案”的工程判断，而不是盲目追新或工具站队。

---

## 一、Electron 接入前端工程至少两条主路径

课程一上来就把和 Vite 相关的集成方案收敛成两类：

- `electron-vite`：更像一套桌面端项目脚手架 / 工具链，从初始化就按 Electron 思路组织目录。
- `vite-plugin-electron`：Vite 生态下的插件，把 Electron 能力嵌入现有项目。

这说明两者并不是“名字不同但做同一件事”，而是一个偏从零起项目、一个偏已有项目接入。课程在这一点上做得很克制——不是做“谁绝对更强”的比较，而是做“场景匹配”的比较。对前端同学来说，这种“工程形态差异”往往比 API 差异更重要。

```ts
type ElectronViteIntegrationMode =
  | "electron-vite"
  | "vite-plugin-electron"
```

## 二、electron-vite：从零起的桌面端脚手架

`electron-vite` 给人的第一感觉是 CLI / 脚手架。初始化后直接得到一套分层目录：

- `src/main`：主进程
- `src/preload`：预加载脚本
- `src/renderer`：渲染层

这些结构本身就在替你做分层，所以如果你还没写任何业务、想快速起一个 Electron 项目，这条路最省事。它和插件式方案最大的区别在于：它不是在“嵌入现有工程”，而是在“从一开始就给你一个 Electron 工程骨架”。

```bash
pnpm create electron-vite
```

脚手架路线最适合从零开始，而不是大幅改造现有项目。它的核心价值在于“组织好了工程结构”，不只是帮你装依赖。

## 三、vite-plugin-electron：已有 Vite 项目插件式接入

`vite-plugin-electron` 的定位是 Vite 插件，意味着你不必放弃原来的 Vite 项目。你可以在现有的 Vue / React 项目里继续加 `electron/` 目录，再通过插件把主进程构建链和渲染层构建链接起来。所以它最适合的场景是：你已经有一个现成 Web 项目，现在想把它桌面化。

```ts
// vite.config.ts
import electron from "vite-plugin-electron"

export default {
  plugins: [
    electron({
      entry: "electron/main.ts",
    }),
  ],
}
```

插件路线的最大优势是“尽量不破坏原来的 Vite 工程”。如果项目已经写了一大半，再换脚手架的迁移成本通常更高。课程这里推荐按项目阶段选，而不是按喜好硬选。

## 四、脚手架默认值不等于安全最佳实践

课程在跑起 `electron-vite` 之后，没有一味夸它，而是顺手看了它生成的代码。这一步很关键：脚手架再方便也只是“起点”，不是“最终最佳实践”。课程里提到的典型例子包括某些 `webPreferences` 配置（如 `sandbox:false`）以及 preload 里暴露出来的一些 Electron API——这些默认值让项目更容易启动，但从安全视角看未必是上线想保留的状态。

```ts
webPreferences: {
  sandbox: false,
}
```

你前面学过的 `nodeIntegration / contextIsolation / sandbox / preload / contextBridge`，现在都要带回来看模板。真正成熟的工程能力是：脚手架拿来即用，但不会盲目信任。

## 五、插件方案最大的坑是版本兼容

课程在演示 `vite-plugin-electron` 时碰到一个非常真实的坑：Electron 升到较新大版本后，插件链和产物格式可能暂时没完全跟上，于是出现运行时报错。课程给出的工程判断很务实——不要硬刚最新版本，先退回一个仍受支持但更稳定的 Electron 版本，等插件和生态补齐后再升级。

```ts
type IntegrationVersionPolicy = {
  preferStableCombo: true
  avoidBlindLatest: true
}
```

桌面端工程里，运行时版本和插件链兼容性是强耦合的。“先把项目做出来”往往比“先用最新版本”更重要。这条经验和前面学的 Electron 版本策略是同一条线：优先用“稳定 + 受支持 + 插件链兼容”的组合。

## 六、两条路线不是二选一阵营，取决于项目状态

把两个方案都跑一遍后，课程给了一个清晰的总结：`electron-vite` 更适合从零开始，`vite-plugin-electron` 更适合已有项目接入。这个结论不是从“喜不喜欢工具”出发，而是从“你现在的工程状态是什么”出发。

```text
项目状态决定方案：
  空白项目 -> electron-vite
  已有 Vite 项目 -> vite-plugin-electron
```

如果你什么都还没写、只想快速起步，直接用脚手架最省事；如果你已有 Vue / Vite 项目、页面和业务写了不少，继续保留现有工程走插件接入就更自然。

## 七、建立“工程整合视角”而非死记包名

如果把这一节抽象一下，它其实在给前端同学建立一个工程整合视角：第一条路径是先想“我要做桌面端”，再选完整桌面端脚手架；第二条路径是“我已经有一个 Web 项目”，现在再给它加桌面端能力。这两条路径背后的工具自然就不同。

```ts
type IntegrationMindset = {
  desktopFirst: "electron-vite"
  webFirst: "vite-plugin-electron"
}
```

课程真正打通的不是某个插件的 API，而是“以后再看到新的 Electron + Vite 方案时，你知道该从哪个维度判断它更适合哪类项目”。这比死记包名重要得多。

## 八、把技术选型从框架层推进到工程接入层

到这一节为止，桌面端篇章已经把技术选型从“框架层”推进到了“工程接入层”。前面讲的是选 Electron 还是 Tauri 这类框架级问题，这一节讲的是：当确定用 Electron 之后，怎么和现有前端工程整合。这种分层思维是后面打包、分发、更新等章节的共同底色——你后面遇到的每个工具，都要先问清楚它服务于项目生命周期的哪个阶段。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 我有一个现成的 Vite 项目，要不要重建成 electron-vite | 从零脚手架会增加迁移成本 | 优先评估 `vite-plugin-electron` 这类插件式接入 |
| electron-vite 模板跑起来了就能直接上线吗 | 模板只是起点，安全配置和 API 暴露仍需审查 | 带着前面学过的安全意识回头看模板默认值 |
| 为什么插件方案一上来就可能踩版本坑 | 它更依赖 Electron 版本、Vite 版本、插件链兼容性 | 优先选稳定组合，不盲追最新 Electron 大版本 |
| 这两个方案哪个“更高级” | 它们解决的是不同项目阶段的问题 | 不要按“高级”选，按当前工程状态选 |

## 延伸阅读

- 上一篇：[Electron 全局快捷键、按键映射与全屏控制](18-Electron全局快捷键、按键映射与全屏控制.md)
- 下一篇：[Electron 打包工具选型、Forge 与 Builder 对比及跨平台构建策略](20-Electron打包工具选型、Forge与Builder对比及跨平台构建策略.md)
- 相关：[electron-vite](https://electron-vite.org/)、[vite-plugin-electron](https://github.com/electron-vite/vite-plugin-electron)、[Electron 官方文档](https://www.electronjs.org/docs/latest/)
