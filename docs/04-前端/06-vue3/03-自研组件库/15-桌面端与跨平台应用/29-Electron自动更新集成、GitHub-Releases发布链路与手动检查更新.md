---
title: Electron自动更新集成、GitHub-Releases发布链路与手动检查更新
description: "electron-updater 不是简单比较本地 `package.json` 的版本号，而是去读取发布服务器上的更新元数据。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Electron 自动更新集成、GitHub Releases 发布链路与手动检查更新

## 概述

应用交付出去只是开始，如何让用户无痛拿到新版本才是桌面端的长期命题。electron-updater 把“检查更新、下载安装包、安装”标准化，但它依赖构建时生成的元数据文件，而不是简单比较版本号。这一节从自动更新的本质讲起，覆盖发布链路配置、最小接线、事件监听、手动检查入口，以及开发环境调试与私有场景的取舍。

## 学习目标

- 理解自动更新的本质是“读取发布元数据并下载对应安装包”
- 正确安装并接入 electron-updater
- 配置 publish、repository、GH_TOKEN 形成稳定更新源
- 用 checkForUpdatesAndNotify 完成最小可用接线
- 通过事件监听把更新状态呈现给用户
- 处理开发环境 dev-app-update.yml 与私有/自建更新源

---

## 一、自动更新的本质：读元数据而非查版本

electron-updater 不是简单比较本地 `package.json` 的版本号，而是去读取发布服务器上的更新元数据。这些文件由 electron-builder 在构建时生成：Windows 是 `latest.yml`，macOS 是 `latest-mac.yml`，Linux 是 `latest-linux.yml`。

```yaml
version: 1.2.0
path: MyApp Setup 1.2.0.exe
sha512: xxxxxxxxxxxxxxxx
releaseDate: '2026-03-20T08:00:00.000Z'
```

元数据里记录可更新版本号、安装包文件名与 sha512 校验。客户端先读元数据再决定要不要下载。版本号没递增、Release 仍是草稿，客户端都未必认为有新版本。

## 二、electron-updater 的安装与导入

官方把 electron-updater 作为自动更新标准包，它支持 Linux，并自动处理大多数元数据与发布文件。因为它运行在应用期，应作为**应用依赖**安装，而非开发依赖：

```bash
npm install electron-updater
```

官方文档给出的 TypeScript 解构写法可规避某些 ESM 组合下的兼容问题：

```ts
import electronUpdater from 'electron-updater'
const { autoUpdater } = electronUpdater
```

如果你的项目稳定使用 CommonJS，直接命名导入也能工作，但笔记里优先记官方推荐写法。

## 三、publish、repository 与 GH_TOKEN 的分工

发布链路靠三者协作：`publish` 告诉 electron-builder 产物发到哪、自动更新从哪读元数据；`repository` 帮它识别仓库地址；`GH_TOKEN` 解决上传 Release 与元数据的权限。

```js
module.exports = {
  publish: { provider: 'github', releaseType: 'draft' },
}
```

虽然设置 `GH_TOKEN` 后 provider 能推断为 github，但工程上仍建议显式写 `publish` 和 `repository`，减少隐式推断带来的不确定性。多个 provider 时，第一个作为默认更新源。发布权限和客户端检查更新是两个阶段，配了 token 没调 autoUpdater，客户端照样不更新。

## 四、最小可用接线

主进程里最小接入通常只有两步：配日志，然后调用 `checkForUpdatesAndNotify()`：

```ts
import log from 'electron-log'
import electronUpdater from 'electron-updater'
const { autoUpdater } = electronUpdater

log.transports.file.level = 'info'
autoUpdater.logger = log

if (app.isPackaged) {
  autoUpdater.checkForUpdatesAndNotify()
}
```

`checkForUpdatesAndNotify()` 适合“启动后自动检查并通知”。若想完全自定义提示与下载时机，可改用 `checkForUpdates()` 配合事件监听。开发环境直接运行通常拿不到有效元数据，本地点检查更新报错是正常现象。

## 五、事件监听让更新可观测

真正有价值的不是“悄悄下载”，而是把过程告诉用户。autoUpdater 常用事件有 `checking-for-update`、`update-available`、`update-not-available`、`error`、`download-progress`、`update-downloaded`。这些事件可以打日志，也可以通过 `webContents.send()` 发给渲染进程展示进度。

```ts
autoUpdater.on('download-progress', (p) => {
  mainWindow?.webContents.send('message', `Download ${p.percent.toFixed(2)}%`)
})
```

只打印主进程日志，用户线上看不到；要面向用户展示就必须转发到渲染进程。默认通常自动下载，想做友好体验，建议把“检查中/下载中/下载完成下次启动安装”做成完整状态流。

## 六、手动“检查更新”菜单

自动检查在启动时跑，但显式入口仍有价值：用户能主动确认、调试时易复现、线上排障时能区分“检查失败”还是“下载失败”。典型做法是在帮助菜单加一项：

```ts
const checkUpdate = (shouldNotify = true) =>
  shouldNotify ? autoUpdater.checkForUpdatesAndNotify()
               : autoUpdater.checkForUpdates()
```

启动时用 `checkForUpdatesAndNotify()`，菜单手动检查用 `checkForUpdates()` 避免频繁打系统通知。用布尔开关拆开自动与手动流程，是清晰的工程化写法。

## 七、开发环境调试与 dev-app-update.yml

开发态直接测更新常报“缺少更新配置文件”，这本质是开发模式限制而非业务错误。生产环境读打包后的 `app-update.yml`，开发环境若要模拟，需准备根目录 `dev-app-update.yml` 并开启 `forceDevUpdateConfig`：

```ts
if (!app.isPackaged) autoUpdater.forceDevUpdateConfig = true
```

官方仍更推荐在已安装应用上测更新，Windows 尤其要用真实安装包验证。开发态模拟只是辅助，不能完全替代真实分发链路验证。

## 八、私有仓库与自建更新源

私有 GitHub 仓库更新需要 `private: true` 并在用户机器提供 `GH_TOKEN`，还受 rate limit 限制，官方视为特殊场景。更通用的替代是 `generic` provider，把安装包和 `latest*.yml` 托管到你自己的 HTTP(S) 服务：

```js
module.exports = { publish: { provider: 'generic', url: 'https://example.com/updates' } }
```

国内访问 GitHub 慢，是很多团队转向 OSS、CDN 或自建更新源的现实原因。选方案时权衡分发速度、访问稳定性与维护复杂度。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 本地点检查更新报错 | 缺 dev-app-update.yml 或未开开发配置 | 补 dev-app-update.yml 并设 forceDevUpdateConfig |
| 始终检测不到新版本 | Release 草稿/版本未递增/元数据缺失 | 发布正式 Release，确认 latest*.yml 已生成 |
| 日志找不到更新配置 | 误以为要 setFeedURL | 先查 publish 与 app-update.yml，不默认 setFeedURL |
| 菜单检查无前端反馈 | 没转发到渲染进程 | 增加 webContents.send 并在前端监听 |
| macOS 更新异常 | 未签名或签名公证不全 | 先完成签名公证再测更新 |
| 私有仓库更新失败 | private/GH_TOKEN/认证策略不全 | 评估是否真需私有，多数用公开或 generic |

## 延伸阅读

- 上一篇：[GitHub Actions 接入 macOS 公证签名、Linux 构建与打包问题修复](28-GitHub-Actions接入macOS公证签名、Linux构建与打包问题修复.md)
- 下一篇：[Electron Builder 打包资源目录 buildResources、DMG 背景与应用图标定制](30-Electron-Builder打包资源目录buildResources、DMG背景与应用图标定制.md)
- 相关：[electron-updater 文档](https://www.electron.build/electron-updater/index.html)、[Auto Update](https://www.electron.build/auto-update.html)、[Publish](https://www.electron.build/publish.html)
