---
title: Electron-Builder打包资源目录buildResources、DMG背景与应用图标定制
description: "应用能跑起来不等于能交付。这一节集中在“交付外观与元信息”的定制：打包资源目录 buildResources、macOS 安装镜像背景、产品名与 appId、三端图标。这些配置大多不改变业务逻辑，却直接影响用户对产品专业度的判断。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Electron Builder 打包资源目录、DMG 背景与应用图标定制

## 概述

应用能跑起来不等于能交付。这一节集中在“交付外观与元信息”的定制：打包资源目录 buildResources、macOS 安装镜像背景、产品名与 appId、三端图标。这些配置大多不改变业务逻辑，却直接影响用户对产品专业度的判断。把它们分层理解，能避免“改了背景图应用首页没变”这类典型误解。

## 学习目标

- 理解 buildResources 是构建资源目录，默认不进运行时包
- 用 dmg.background 定制 macOS 安装镜像外观
- 区分 productName 与 name、appId 的职责
- 为 macOS、Windows、Linux 分别配置图标格式
- 厘清“安装镜像外观/应用图标/运行时 UI”的层级差异
- 识别模板脚本别名背后的真正构建命令

---

## 一、buildResources：构建资源目录而非运行时资源

electron-builder 通过 `directories.buildResources` 指定打包素材目录，默认值是 `build`。它服务于构建过程——图标、DMG 背景、安装器素材都放这里。

```js
module.exports = {
  directories: { buildResources: 'buildResources', output: 'dist' },
}
```

关键点是：这些素材**不会自动打进运行时应用包**。如果某个文件既要参与打包又要在运行时读取，还要通过 `files` 或 `extraResources` 显式包含。改了 buildResources 目录，不代表业务代码能直接读到里面的资源。

## 二、dmg.background 定制安装镜像

macOS 用户打开 .dmg 看到的带背景图安装窗口，由 `dmg.background` 控制，发生在安装镜像层而非应用页面：

```js
module.exports = {
  dmg: { background: 'buildResources/background.png' },
}
```

官方资料同时提到 `background.tiff` 和 `background.png`，新项目更推荐 PNG 方案，并准备 `background@2x.png` 适配 Retina。背景图定制的是 DMG 安装界面，不会影响应用启动后的业务页面。默认背景尺寸预期约 540x380，分辨率直接影响视觉。

## 三、productName 与 name 的分工

改应用展示名本质是改 `productName`，不是 `name`。`productName` 控制安装包文件名模板、可执行文件、应用展示名等用户侧可见名称，允许空格和特殊字符；`name` 是 npm 包名与工程标识，不要强行塞品牌前缀。

```json
{ "name": "tom-template", "productName": "Tom App Template" }
```

默认产物文件名通常用 `${productName}-${version}.${ext}`，所以改名后安装包文件名也会变。Linux 还有 `executableName` 的平台差异，三端不要简单等同理解。

## 四、appId：系统层标识而非展示名

`appId` 是应用的系统身份，用于 macOS 的 `CFBundleIdentifier` 和 Windows 的 Application User Model ID。官方强烈建议显式设置，默认是 `com.electron.${name}`，工程上更推荐反向域名风格：

```js
module.exports = { appId: 'com.tom.app-template' }
```

它不给用户看，所以别当 productName 用。应用发布后频繁改 appId 可能影响签名、更新、系统识别与数据隔离。一句话：`productName` 决定“看起来叫什么”，`appId` 决定“系统把它识别成谁”。

## 五、三端图标格式不同

electron-builder 对图标规则很明确：macOS 当前优先推荐 `.icon`，`.icns` 也广泛可用；Windows 最稳妥是 `.ico`；Linux 可从 icns 或公共 png 自动生成，也可自己提供多尺寸 PNG 目录。

```js
module.exports = {
  mac: { icon: 'buildResources/icon.icns' },
  win: { icon: 'buildResources/icon.ico' },
  linux: { icon: 'buildResources/icons' },
}
```

Windows 用 `.icns` 不合适，Linux 若无自定义图标集通常从已有图标推导但一致性未必最好。一套图标配置不能直接套三端，要按平台给格式。

## 六、区分四个层级

连续看到背景图、应用名、应用图标，容易误以为都在改“应用页面”。实际它们分属不同层级：

- `dmg.background`：安装镜像背景
- `dmg.icon`：挂载后的 DMG 卷图标
- `mac/win/linux.icon`：应用图标
- 前端页面里的 logo：运行时业务 UI

改 dmg.background 不会让应用首页出现背景图；改 productName 不会同步内部包名；改 buildResources 不会让业务代码读到资源。分层记住，排查外观问题才不混乱。

## 七、脚本别名背后是 electron-builder

课程或模板里常见 `npm run build electron only` 之类命令，那不是 electron-builder 的固定标准，而是项目 `package.json` 里的脚本别名。真正起作用的始终是 electron-builder 及其读取的配置、资源目录与平台选项。

```json
{ "scripts": { "dist": "electron-builder", "dist:mac": "electron-builder --mac" } }
```

看到陌生脚本名，别误以为是官方唯一命令。掌握“命令背后调了什么工具、读了哪些配置”，换模板也能迁移。

## 八、桌面壳带来的交付命题

Electron 给前端套上桌面壳，业务开发角度前端仍是核心，但交付角度会多出整套 Web 项目没有的要求：应用图标、安装器背景、应用名、appId、签名、公证、自动更新。Web 项目“能跑”不等于桌面项目“可交付”。

这一节的所有配置，本质都是“交付体验”层的能力补齐。模块 15 从导学、集成、打包、签名、公证、MAS 上架、CI/CD 到自动更新与外观定制，桌面端全链路已经闭合。下一站可以回到模块起点系统回顾，或进入更高级的跨平台方案对比。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 背景图放了 DMG 没变 | 没配 dmg.background 或路径错 | 核对 buildResources 与 dmg.background 一致性 |
| 资源进 buildResources 但运行读不到 | 默认不打进运行时 | 用 files/extraResources 显式包含 |
| 改 productName 内部包名没变 | 只影响展示层 | 区分 name 与 productName 职责 |
| macOS 图标好 Windows 不生效 | Windows 应优先 .ico | 为 Windows 单独准备 icon.ico |
| 课程用 background.tiff 现文档写 png | 两者可用但推荐不同 | 新项目优先 background.png 与 @2x |
| 改了名和图标 DMG 还是旧样 | 只改应用图标没改 dmg 层 | 区分应用图标、DMG 卷图标、DMG 背景 |

## 延伸阅读

- 上一篇：[Electron 自动更新集成、GitHub Releases 发布链路与手动检查更新](29-Electron自动更新集成、GitHub-Releases发布链路与手动检查更新.md)
- 下一篇：[桌面端导学、应用场景与 Electron-Tauri-Flutter 技术选型（模块回顾）](01-桌面端导学、应用场景与Electron-Tauri-Flutter技术选型.md)
- 相关：[Common Configuration](https://www.electron.build/configuration.html)、[DMG](https://www.electron.build/dmg.html)、[Icons](https://www.electron.build/icons.html)
