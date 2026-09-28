---
title: macOS应用公证、electron-notarize集成与分发警告去除
description: "这一节解决签名之后的下一关：应用公证（Notarization）。它专门针对非 App Store 分发的应用，目的是把应用上传到 Apple 进行安全扫描，通过后获得 Apple 的“分发许可”，让用户安装时不再看到“未经过 Apple 公证”的警告。公证有两种方式：手动用 xcrun notarytool 上传，或集成 electron-notarize 自动化完成（推荐，接入 afterSign 钩子）。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# macOS 应用公证、electron-notarize 集成与分发警告去除

## 概述

这一节解决签名之后的下一关：应用公证（Notarization）。它专门针对非 App Store 分发的应用，目的是把应用上传到 Apple 进行安全扫描，通过后获得 Apple 的“分发许可”，让用户安装时不再看到“未经过 Apple 公证”的警告。公证有两种方式：手动用 `xcrun notarytool` 上传，或集成 `electron-notarize` 自动化完成（推荐，接入 `afterSign` 钩子）。前置四要素缺一不可：Developer ID 证书、Apple ID、App 专用密码、appId。此外还要用 `entitlements.mac.plist` 声明系统权限，并把 `hardenedRuntime`、`gatekeeperAssess` 配好。

## 学习目标

- 理解公证是“签名之后、分发之前”的环节，且仅针对非 App Store 分发。
- 区分手动 `xcrun notarytool` 与自动 `electron-notarize` 两种公证方式。
- 掌握公证四大前置：Developer ID 证书、Apple ID、App 专用密码、appId。
- 会用 `entitlements.mac.plist` 声明权限，并把 `hardenedRuntime` / `gatekeeperAssess` 配好。
- 用 `afterSign` 钩子把公证接入 electron-builder 构建流程，敏感信息走环境变量。

---

## 一、公证是签名之后的下一关

macOS 的应用分发有两条路线：App Store 分发，苹果自动完成公证；非 App Store 分发（官网、第三方平台），需要手动进行公证。本节聚焦的是第二条路线。核心问题是：用户下载你的应用后，macOS 会提示“该软件未经过 Apple 公证”，这类似 Windows 上的“未识别的开发者”警告，会严重影响用户信任和安装意愿。公证的作用就是把应用上传到 Apple 进行安全扫描，通过后用户安装时不再显示警告。这是“签名”之后的下一步：签名证明“这是谁开发的”，公证证明“Apple 认为这可以安全分发”。

```ts
type MacDistributionChain = [
  "package",      // 打包成 dmg/app
  "signing",      // Developer ID 签名
  "notarization", // Apple 公证
  "distribution"  // 安全分发
]
```

## 二、两种公证方式：手动命令与自动集成

课程介绍了两种公证方式。方式一是手动公证：打包完成后使用 `xcrun notarytool submit` 命令上传 DMG，等待 Apple 扫描，查看状态。方式二是自动化公证：使用 `electron-notarize` 包，集成到构建流程的 `afterSign` 钩子，打包后自动完成公证。课程推荐第二种，因为它不需要每次手动执行命令、适合 CI/CD 流水线、团队协作更方便。两种方式都需要 Apple ID 和 App 专用密码；手动方式适合理解原理和一次性调试，自动化方式需要配置更多文件但一次配置长期受益。

```bash
# 手动公证命令
xcrun notarytool submit app.dmg \
  --apple-id "dev@example.com" \
  --password "xxxx-xxxx-xxxx-xxxx" \
  --team-id "XXXXXXXXXX" \
  --wait
```

## 三、公证四大前置缺一不可

课程详细列出了公证所需的四要素，缺少任何一个公证都会失败：

1. `Developer ID Application` 证书：专门用于非 App Store 分发，已导出为 `.p12` 并配置 `CSC_LINK` / `CSC_KEY_PASSWORD`。
2. `Apple ID`：开发者账号邮箱，用于登录 Apple 的公证服务。
3. `App 专用密码`（App-Specific Password）：不是 Apple ID 登录密码，需在 Apple ID 账户页面单独生成，格式类似 `xxxx-xxxx-xxxx-xxxx`。
4. `appId`：在 electron-builder 配置中添加，格式 `com.company.appname`，必须与签名时使用的一致。

```text
公证四要素：
  1. Developer ID Application 证书
  2. Apple ID（开发者账号邮箱）
  3. App 专用密码（不是登录密码）
  4. appId（与签名一致）
```

App 专用密码生成后无法再次查看，必须立即保存；这些信息都是敏感信息，不要硬编码到代码中。

## 四、electron-notarize 是官方推荐的自动工具

`electron-notarize` 是 Electron 生态中专门用于公证的包，作用是自动上传应用到 Apple、等待扫描完成、返回公证结果。安装方式：`npm install electron-notarize --save-dev`（新版包名已迁移为 `@electron/notarize`，底层改用 Apple 的 notarytool）。它的核心 API 只有一个方法 `notarize`，参数包括 `appPath`（应用的绝对路径，指向 `.app` 文件）、`appleId`、`appleIdPassword`（App 专用密码）、`teamId`（开发者团队 ID）。这个包不会单独运行，而是集成到 electron-builder 的构建流程中，且只能在 macOS 上运行。注意：旧版 v1 走 altool 通道、用 `ascProvider` 参数，该通道 Apple 已停用，新代码应以 `teamId` 为准。

```ts
import { notarize } from "electron-notarize"

await notarize({
  appPath: "/path/to/YourApp.app",
  appleId: "your@email.com",
  appleIdPassword: "xxxx-xxxx-xxxx-xxxx",
  teamId: "XXXXXXXXXX", // 开发者团队 ID
})
```

## 五、entitlements.mac.plist 声明系统权限

课程特别强调了一个关键配置文件：`entitlements.mac.plist`，用于声明应用所需的系统权限。macOS 的安全机制要求应用“申请权限”才能使用某些能力，公证时也会检查权限声明是否合理。最基础的权限是 `com.apple.security.cs.allow-unsigned-executable-memory`，几乎每个 Electron 应用都需要它，因为应用运行时会动态生成一些代码。在 electron-builder 配置中需要引用这个文件，并把 `hardenedRuntime` 设为 `true`、`gatekeeperAssess` 设为 `false`。只申请必要的权限，不要过度申请。

```xml
<!-- build/entitlements.mac.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.network.client</key>
    <true/>
  </dict>
</plist>
```

```json
{
  "build": {
    "mac": {
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist",
      "hardenedRuntime": true,
      "gatekeeperAssess": false
    }
  }
}
```

## 六、afterSign 钩子是集成公证的最佳时机

`electron-builder` 提供了一系列构建钩子：`beforeBuild`、`afterPack`、`afterSign`、`afterAllArtifactBuild`。课程选择 `afterSign` 的原因很充分——必须先完成签名，才能进行公证；此时应用已经打包成 `.app`，还未生成最终的 DMG/PKG，正好在分发前的最后一步。配置方式是在 `build` 里加 `"afterSign": "scripts/notarize.js"`，指向一个导出了 async 函数的 JS 脚本。

```js
// scripts/notarize.js
const { notarize } = require("electron-notarize")

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context

  // 只在 macOS 上进行公证
  if (electronPlatformName !== "darwin")
    return

  const appName = context.packager.appInfo.productName
  const appPath = `${appOutDir}/${appName}.app`

  await notarize({
    appPath,
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_ID_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  })
}
```

## 七、完整公证流程四层协作

课程总结了完整的公证步骤，涉及配置文件、权限声明、钩子脚本、环境变量四个层面的协作：创建 `build/entitlements.mac.plist` 声明权限；在 electron-builder 中设置 `hardenedRuntime: true`、`gatekeeperAssess: false`、引用 entitlements、配置 `afterSign`；安装 `electron-notarize`；编写 `scripts/notarize.js` 调用 `notarize`；配置环境变量（证书与 Apple 信息都建议走环境变量）；最后执行构建。每一步都不能跳过，必须按顺序完成。敏感信息建议使用环境变量，不要硬编码，也建议在 CI/CD 中同样配置。

```bash
export CSC_LINK=/path/to/certificate.p12
export CSC_KEY_PASSWORD=your-cert-password
export APPLE_ID=your@email.com
export APPLE_ID_PASSWORD=xxxx-xxxx-xxxx-xxxx
export APPLE_TEAM_ID=XXXXXXXXXX

npm run build:mac
```

## 八、公证成功才是 macOS 分发的最后关卡

公证成功的标志包括：构建日志显示公证完成、收到 Apple 的确认邮件（`Your app has been notarized`）、用户安装时不再显示警告。公证只针对当前版本，新版本更新时需要重新走流程；一次公证对当前版本长期有效。本节内容只适用于非 App Store 分发场景——如果应用上架 Mac App Store，公证由 Apple 自动完成，开发者无需配置 `electron-notarize`，但需要不同的证书类型并遵循审核指南。到这里，macOS 桌面端应用的全链路分发流程才真正闭合：打包 → 签名 → 公证 → 分发。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 公证失败：找不到证书 | `CSC_LINK` 未配置或路径错误 | 检查证书文件路径，确保证书文件可访问 |
| 公证失败：Authentication failed | Apple ID 或 App 专用密码错误 | 重新生成 App 专用密码，确认格式正确 |
| 公证失败：The signature of the binary is invalid | 签名过程有问题 | 检查 `hardenedRuntime`、`entitlements` 配置，确保证书有效 |
| 用户安装时仍显示警告 | 公证未完成或公证失败 | 检查构建日志，确认公证成功，查收 Apple 邮件 |
| 公证成功但用户仍有警告 | 只公证了 `.app`，DMG 未附票据 | 确认公证最终产物，必要时用 `staple` 附加公证票据 |
| 多团队时不知道用哪个 Team ID | 账号关联多个团队 | 登录开发者中心查看团队 ID，设置 `APPLE_TEAM_ID`（旧参数 `ASC_PROVIDER` 已随 altool 通道停用） |

## 延伸阅读

- 上一篇：[macOS 开发者证书、Electron Builder 签名与 CSC_LINK 接入](22-macOS开发者证书、Electron-Builder签名与CSC_LINK接入.md)
- 下一篇：[Electron 应用上架 Mac App Store、证书申请与构建配置](24-Electron应用上架Mac-App-Store、证书申请与构建配置.md)
- 相关：[Apple 官方公证文档](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)、[electron-notarize](https://github.com/electron/notarize)、[Hardened Runtime](https://developer.apple.com/documentation/security/hardened_runtime)
