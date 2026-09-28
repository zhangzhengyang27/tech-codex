---
title: Electron应用上架Mac-App-Store、证书申请与构建配置
description: "把 Electron 应用送进 Mac App Store（MAS），和走 Developer ID 直接分发是两条完全不同的路径。前者要接受 Apple 审核、遵循沙盒规则、使用专用证书；后者自由度高，但需要自己处理签名与公证。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Electron 应用上架 Mac App Store：证书申请与构建配置

## 概述

把 Electron 应用送进 Mac App Store（MAS），和走 Developer ID 直接分发是两条完全不同的路径。前者要接受 Apple 审核、遵循沙盒规则、使用专用证书；后者自由度高，但需要自己处理签名与公证。本节聚焦 MAS 路径，把证书种类、App ID 与描述文件、两套构建配置、沙盒权限清单、上传与元数据这些容易混淆的环节一次性理顺，让你在动手前先建立完整的配置地图。

## 学习目标

- 区分 App Store 与非 App Store 两条分发路径的差异与适用场景
- 厘清五类 macOS 证书各自的职责，尤其是 Mac App Store Distribution 的手动申请
- 理解 Identifiers、App ID 与 Provisioning Profile 三者如何串起签名链路
- 掌握 DMG 配置与 MAS 配置分离的工程做法
- 正确编写 entitlements.mas.plist，满足沙盒等硬性要求
- 了解 Transporter 上传与 App Store Connect 元数据填写流程

---

## 一、两条分发路径：App Store 与非 App Store

macOS 桌面应用主要有两种落地方式。一种是 Mac App Store，用户从商店安装、自动更新、信任度高，但必须通过审核并遵循沙盒。另一种是通过 Developer ID 签名后直接分发（官网下载 dmg），自由度高、无审核等待，但你需要自己完成公证，且 Gatekeeper 会更严格地提示未知开发者。

这两条路径不能混用同一套证书和配置：非 App Store 用 Developer ID Application 签名，MAS 用 Mac App Store Distribution 签名；非 App Store 产物是 dmg 或 pkg，MAS 产物是 mas target 生成的 pkg。所以在工程里最稳妥的做法是准备两套构建配置，而不是试图用一份配置通吃两端。

选型时可以这样判断：走 MAS 的用户能获得商店信任与系统级更新入口，但要接受审核与沙盒约束；走 Developer ID 则分发自由、无等待，却要自己承担公证与 Gatekeeper 提示。一次正式发布通常只选其一，先把路径想清楚再动手配置。

## 二、五类证书，分别服务不同场景

开发者中心里和 macOS 分发相关的证书至少有五类，初学者最容易因为它们名字相近而配错：

- Development：本地调试、开发期运行使用
- Distribution（Mac App Store）：泛指 App Store 分发相关，常与专用证书并列
- Developer ID Application：非 App Store 直接分发的签名证书，对应前面章节的公证链路
- Mac Installer Distribution：给安装器（pkg）签名的证书
- Mac App Store Distribution：专门给 MAS 应用签名的证书，需要后台手动申请，不会随常规证书一起出现

其中最后一类最容易被忽略——它不是你创建开发者账号就自动拥有的，需要在开发者中心后台单独申请。申请前最好先确认你的团队角色和协议状态，否则可能在列表里根本看不到入口。

申请证书前先确认 Apple 开发者账号年费已缴纳、团队角色具备相应管理权限。否则即使进入证书页面，创建按钮也可能对你不可见，白白浪费排查时间。

## 三、Identifiers、App ID 与 Provisioning Profile

证书只解决“谁签的名”，真正把应用和签名绑定的还有 Identifiers。你需要为 MAS 应用创建一个明确的 App ID（通常是反向域名风格，与 electron-builder 的 appId 保持一致），并在它下面启用所需的能力（Capabilities）。

Provisioning Profile（描述文件）则是把 App ID、证书、设备/团队信息打包在一起的授权文件。MAS 构建时，electron-builder 通过 `provisioningProfile` 字段引用它，签名阶段会据此校验应用是否被允许以这种方式分发。如果 App ID、描述文件、证书三者不配套，构建会在签名或上传环节直接失败。

描述文件本身有有效期，且绑定具体证书与设备范围。证书续期或重建后，旧描述文件会失效，届时需重新生成并替换构建配置里的引用，这也是 MAS 构建“突然失败”的常见隐性原因。

## 四、两套构建配置：DMG 与 MAS 分离

实践上建议把配置拆成两个文件：一个给非 App Store（如 `electron-builder.config.js`，产出 dmg），一个给 MAS（如 `electron-builder.mas.config.js`）。MAS 配置的关键差异是：

```js
// electron-builder.mas.config.js
module.exports = {
  mac: {
    target: ['mas'],
    // MAS 路径不需要 afterSign 做公证，去掉它
  },
  // MAS 需要提供描述文件
  provisioningProfile: 'mas.provisionprofile',
}
```

注意 MAS target 下通常要移除非 App Store 路径里的 `afterSign` 公证钩子，因为 App Store 分发由 Apple 审核与签名流程接管，自行公证反而会导致冲突。两套配置共享同一份源码，只是入口和签名策略不同。

共享源码、分离配置的好处是：调试某条路径时不会意外影响另一条。例如本地临时改 DMG 背景，绝不应波及 MAS 的沙盒配置，二者通过不同配置文件天然隔离。

## 五、MAS 的 entitlements：沙盒是硬门槛

MAS 应用必须开启 App Sandbox，这是审核的硬性要求。对应的 `entitlements.mas.plist` 至少要包含：

```xml
<key>com.apple.security.app-sandbox</key>
<true/>
<key>com.apple.security.application-groups</key>
<array>
  <string>TEAMID.com.example.app</string>
</array>
```

其中 `application-groups` 的格式是 TeamID.BundleID，写错会导致授权不一致。如果你的应用需要加载某些无签名可执行内存（例如部分原生模块场景），可能还需要 `allow-unsigned-executable-memory` 之类的放宽项，但每一项放宽都会增加审核风险，应只在确实必要时添加，并准备好向审核方说明用途。

## 六、CSC_NAME 与签名身份

非 App Store 路径我们习惯用 `CSC_LINK` 注入证书；MAS 路径有时更简便的做法是直接在构建机上安装证书，然后用 `CSC_NAME` 环境变量指定签名身份（例如 `Developer ID Application: Your Name (TEAMID)`）。electron-builder 会据此在构建时定位钥匙串里的对应证书。

无论用哪种方式，核心都是让构建环境能唯一确定“用哪张证书签名”。CI 环境下通常配合 Secrets 注入；本地环境则要确认证书已经正确安装到登录钥匙串且未过期。签名身份字符串前后不要有空格，否则会出现“找不到证书”的报错。

## 七、Transporter 上传与自动公证

MAS 产物准备好后，通过 Apple 的 Transporter 工具（或 Xcode 的 Organizer）上传。与 Developer ID 路径不同，MAS 上传后由 Apple 在审核流程中完成签名与公证相关处理，开发者不需要自己跑 `electron-notarize` 这类步骤。

Transporter 会在上传时做基础校验，例如架构是否完整、是否包含不允许的私有 API 痕迹。校验失败会返回具体错误，按提示修正后重新上传即可。上传成功后，版本会出现在 App Store Connect 的“构建版本”区域，等待你提交审核。

Transporter 之外，早期还有基于命令行的上传路径，但新项目优先用 Transporter GUI 或 Xcode Organizer，旧接口已在逐步退役，没必要在新流程里额外引入。

## 八、App Store Connect 元数据与审核

上传只是第一步，真正上架还要在 App Store Connect 填写元数据：应用名称、截图、描述、分类、定价、隐私信息等。版本状态从“准备提交”到“等待审核”再到“已上架”，每一步都可能要求补充材料。

需要提醒的是，Electron 应用在 MAS 审核中常因沙盒限制、外部下载、私有框架等问题被拒。动手前先把 entitlements 收紧到刚好够用，并准备好对每项权限的说明。到此，MAS 上架从证书到配置、从构建到提交的主链路就完整了，下一节我们直接进入打包演示与常见问题排查。

值得一提的是，MAS 上架是“配置 + 审核”双线并行的工作：配置错了构建阶段就过不去，审核没过则上不了架。把配置地图先画清楚，能显著降低反复被拒后的返工成本。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 后台找不到 Mac App Store Distribution 证书入口 | 该证书需手动申请，并非默认拥有 | 在开发者中心证书区手动创建，并确认团队协议已生效 |
| MAS 构建报签名失败 | App ID、描述文件、证书三者不配套 | 核对三者配套关系，重新生成 Provisioning Profile |
| entitlements 报错 TeamID 不匹配 | application-groups 格式写错 | 使用 TeamID.BundleID 格式，与 appId 保持一致 |
| 上传 Transporter 提示包含不允许的 API | 依赖里混入私有框架 | 排查原生模块，移除非公开 API 调用 |
| MAS 和 DMG 用同一份配置打包冲突 | 两条路径证书与签名策略不同 | 拆成两套配置，MAS 移除 afterSign 公证钩子 |
| 审核被拒：未开启沙盒 | entitlements.mas.plist 缺少 app-sandbox | 显式开启 App Sandbox 并重新构建上传 |

## 延伸阅读

- 上一篇：[macOS 应用公证、electron-notarize 集成与分发警告去除](23-macOS应用公证、electron-notarize集成与分发警告去除.md)
- 下一篇：[Electron 应用上架 Mac App Store 打包演示与常见问题](25-Electron应用上架Mac-App-Store打包演示与常见问题.md)
- 相关：[Apple 开发者证书说明](https://developer.apple.com/support/certificates/)、[electron-builder MAS 配置](https://www.electron.build/)、[App Store Connect](https://appstoreconnect.apple.com/)
