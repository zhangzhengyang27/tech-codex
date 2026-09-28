---
title: Electron打包工具选型、Forge与Builder对比及跨平台构建策略
description: "这一节把关注点从“Electron 怎么集成到前端工程”转到了“应用最终怎么打包和分发”。这一步非常关键，因为桌面端项目和 Web 项目不一样：Web 项目多数时候只打一个 dist 部署到服务器即可，但 Electron 应用后面通常还要面对 Windows 安装包、macOS .dmg、Linux 产物、自动更新、代码签名。到这一步，技术问题已经从“写代码”变成了“把产品交付出去”。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Electron 打包工具选型、Forge 与 Builder 对比及跨平台构建策略

## 概述

当 Electron 应用“能跑起来”之后，下一步绕不开的不是页面开发，而是“怎么打包、怎么分发、怎么更新”。这一节把关注点从工程集成转到了产品交付，并收敛到两个主流打包方案：`Electron Forge`（更贴近官方路线、结构统一、新特性跟进积极）与 `electron-builder`（跨平台制品与分发更成熟、CI/CD 友好）。课程的核心结论很务实——选型看项目阶段：全新桌面项目看官方路线，真实跨平台交付更偏向 builder，已有 Web 项目接入桌面端则优先看插件方案。

## 学习目标

- 理解桌面端交付问题与 Web 部署问题的本质差异。
- 区分 `Electron Forge`（官方路线）与 `electron-builder`（跨平台成熟）的定位。
- 知道打包复杂度来自代码签名、自动更新与平台差异，不只是跑一条命令。
- 理解本地机器不是万能跨平台打包机，真实发布应交给 CI/CD 矩阵构建。
- 形成“按项目阶段选工具”的判断框架，而不是工具站队。

---

## 一、能跑起来之后绕不开的是打包分发

这一节把关注点从“Electron 怎么集成到前端工程”转到了“应用最终怎么打包和分发”。这一步非常关键，因为桌面端项目和 Web 项目不一样：Web 项目多数时候只打一个 `dist` 部署到服务器即可，但 Electron 应用后面通常还要面对 Windows 安装包、macOS `.dmg`、Linux 产物、自动更新、代码签名。到这一步，技术问题已经从“写代码”变成了“把产品交付出去”。这层差异很容易被低估：Web 项目交付的是一份静态资源，运维或平台帮你承担了大量信任与分发基础设施；而桌面端应用交付的是一份要在用户操作系统上直接运行的可执行体，系统会替用户追问“它是谁、可信吗、怎么装”。

```ts
type DesktopPackagingConcern =
  | "installer"
  | "artifact"
  | "distribution"
  | "code-signing"
  | "auto-update"
```

## 二、主流两方案：Electron Forge 与 electron-builder

课程在打包方案上没有把历史工具全部平均展开，而是很快收敛到两个主流选择：`Electron Forge` 和 `electron-builder`。它们之所以重要，是因为目前都足够主流、都能覆盖前端桌面端项目的实际打包需求。更早的 `electron-packager` 之类虽然存在，但从实际项目角度看，今天前端同学最值得重点评估的还是前面两个——因为它们才是和当前 Electron 主流工程链绑得最紧的。

```ts
type ElectronPackagerChoice =
  | "electron-forge"
  | "electron-builder"
```

## 三、Electron Forge：更贴近官方路线

`Electron Forge` 现在已经成为 Electron 官方默认更推荐的一条打包路线。它的主要优势可以概括成：跟 Electron 新版本和新特性联动更积极、生态组合更统一、文档和项目结构更贴近官方路线。课程还提到一个关键词“多包架构”——你可以把它理解成 Forge 本身更像一套组织得更好的工具集合。对从零起步的新项目来说，这类优势通常会更明显，也天然降低“我是不是走偏了”的心理成本。

```json
{
  "scripts": {
    "package": "electron-forge package",
    "make": "electron-forge make"
  }
}
```

## 四、electron-builder：跨平台交付更成熟

课程虽然先看 Forge，但最后给出的判断是：真正项目里仍然更偏向 `electron-builder`。原因不是情绪化的“旧工具更顺手”，而是非常现实的——`electron-builder` 在跨平台制品生成和发布分发上更成熟，尤其适合结合 CI/CD 做多平台构建。本地调试时当然可以只关心当前平台，但真正交付时你经常需要同时拿出 Windows、macOS、Linux 的安装制品，在这个视角下 builder 的优势就会更明显。

```json
{
  "scripts": {
    "build:electron": "electron-builder"
  }
}
```

## 五、真正复杂度来自签名、更新与平台差异

课程在介绍打包工具时，没有只讲 `forge make` 或 `builder build`，而是顺手把几个现实问题一起拎出来：自动更新、代码签名、macOS / Windows / Linux 差异、商店分发。这一步特别重要，因为对桌面端来说，打包只是中间动作，你最终是要把应用交付给用户。而真正决定交付是否顺利的，经常恰恰是“证书有没有、安装器平台行为对不对、自动更新链路通不通”，而不是“打包命令能不能跑”。

```ts
type DesktopDistributionConcern = {
  packaging: true
  signing: true
  updating: true
  publishing: true
}
```

## 六、本地机器不是万能跨平台打包机

课程后面提到一个很容易被忽略但非常现实的边界：你自己的当前机器，并不一定能直接打出所有目标平台的所有产物。限制主要来自操作系统、CPU 架构和本地打包链——例如 Windows 不适合直接打 macOS 制品，Apple Silicon 也不能随意当成能打所有老架构产物。所以课程给出的更成熟路线是：真正跨平台的构建，交给 CI/CD 的矩阵环境去做，这也是它前面反复提到 GitHub Actions、多 runner 的原因。

```ts
type PackagingConstraint = {
  os: "windows | macos | linux"
  cpuArch: "x64 | arm64"
}
```

本地打包并非毫无价值——它最适合做调试和验证：你改完配置立刻能在自己机器上看到产物和安装器行为。但它不适合承担全部正式发布任务，尤其是当你需要同时交付三个操作系统、还要叠加签名和发布流程时，矩阵构建几乎是唯一稳妥的解法。

## 七、选型逻辑取决于项目阶段

把前面几节关于工程接入和这一节的打包工具串起来，课程其实已经给出了一套完整的工程选型逻辑：从零起 Electron 项目，更适合 `electron-vite`；已有 Vite / Vue / React 项目接桌面端，更适合 `vite-plugin-electron`；真正需要跨平台出安装包、做分发、做自动更新，更值得优先考虑 `electron-builder`。这不是在给一个绝对答案，而是在给一套可迁移的判断框架。

```ts
type ElectronToolSelection =
  | "greenfield-electron-vite"
  | "existing-vite-vite-plugin-electron"
  | "cross-platform-release-electron-builder"
```

## 八、把框架 / 架构 / 安全 / 通信 / 打包串起来

到这一节为止，桌面端篇章已经把框架层、架构层、安全层、通信层和打包层基本串起来了。课程里最成熟的地方在于它不是给“哪个工具永远最好”，而是按阶段匹配：全新桌面项目更适合官方路线，真实跨平台交付更偏向 builder，现有 Web 项目接入桌面端则更应该优先看插件方案。真正的桌面端工程化，就是不断按当前阶段和目标重新取舍工具。下一节会从 builder 的配置写法入手，把这里的“跨平台交付”落到具体的 `mac / win / linux` 配置上，到时你会更直观地看到每个平台交付形态的差异。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| electron-vite 和 electron-builder 到底哪个好 | 两者根本不是同一层工具，一个偏脚手架，一个偏打包器 | 先分清工具层级，再谈优劣 |
| 为什么官方推荐 Forge，但课程又更偏 builder | 官方路线更统一，但实战交付和多平台打包维度上 builder 更成熟 | 按项目目标选，不按名气选 |
| 为什么插件式方案更容易被版本坑住 | 它要同时兼顾 Vite、Electron、插件链三层兼容 | 优先使用稳定版本组合，而不是无脑追最新 |
| 本地能打包是不是就说明跨平台发布没问题 | 本地环境还受系统和 CPU 架构限制 | 真正多平台制品建议交给 CI/CD 矩阵构建 |

## 延伸阅读

- 上一篇：[Electron 与 Vite 两种集成方案对比、工程接入与版本取舍](19-Electron与Vite两种集成方案对比、工程接入与版本取舍.md)
- 下一篇：[Electron Builder 快速配置、多平台配置与 NSIS 安装器打包策略](21-Electron-Builder快速配置、多平台配置与NSIS安装器打包策略.md)
- 相关：[Electron Forge](https://www.electronforge.io/)、[electron-builder](https://www.electron.build/)、[Electron 应用分发指南](https://www.electronjs.org/docs/latest/tutorial/application-distribution)
