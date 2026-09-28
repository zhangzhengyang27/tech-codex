---
title: Electron应用上架Mac-App-Store打包演示与常见问题
description: "配置就绪之后，真正的考验是“能不能稳定打出一个能被 Apple 接收的包”。这一节把 MAS 打包的实操步骤串起来：从清理旧产物、执行专用构建脚本，到理解 .app 与 .pkg 的区别、通过 Transporter 上传、处理版本号冲突，再到常见打包失败的系统排查。目标是让你在遇到报错时，能快速定位是配置问题、证书问题还是产物结构问题。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Electron 应用上架 Mac App Store：打包演示与常见问题

## 概述

配置就绪之后，真正的考验是“能不能稳定打出一个能被 Apple 接收的包”。这一节把 MAS 打包的实操步骤串起来：从清理旧产物、执行专用构建脚本，到理解 .app 与 .pkg 的区别、通过 Transporter 上传、处理版本号冲突，再到常见打包失败的系统排查。目标是让你在遇到报错时，能快速定位是配置问题、证书问题还是产物结构问题。

## 学习目标

- 掌握 MAS 构建前的清理与专用脚本执行顺序
- 理解 electron-builder 单证书自动签名，避免手动 electron-osx-sign 的坑
- 区分 .app 与 .pkg 两种产物及其用途
- 通过 Transporter 完成上传并理解自动验证与公证环节
- 规避 MAS 版本号冲突（CFBundleVersion 必须递增）
- 建立 MAS 与 DMG 分配置、分产物排查的思路

---

## 一、构建前先清理 dist

MAS 打包最常被低估的一步是清理。electron-builder 会在输出目录累积历史产物，如果上一次 DMG 构建的残留和本次 MAS 构建混在一起，可能出现签名范围错乱、产物混淆。

```bash
rm -rf dist
npm run compile:mas
```

`compile:mas` 这类脚本通常是“先编译前端资源，再调用 electron-builder 并加载 MAS 配置”的组合。执行前确认它指向的是 `electron-builder.mas.config.js`，而不是默认的非 App Store 配置，否则打出来的仍是 dmg 路线产物。

注意 `compile:mas` 中的 `mas` 后缀只是脚本命名习惯，真正决定产物路线的是它加载的配置文件。如果项目没有专用脚本，也可以直接运行 `electron-builder --config electron-builder.mas.config.js` 达到同等效果。

清理命令不必每次都手写，很多团队会把它写进 `prebuild` 或单独的 `clean` 脚本，避免遗漏。关键是保证每次 MAS 构建都从干净状态开始，而不是依赖上次残留。

## 二、electron-builder 的单证书自动签名

MAS 路径下，electron-builder 自身就能完成签名，前提是证书、描述文件、entitlements 都已就位。社区里偶有教程让你额外安装 `electron-osx-sign` 手动补签名，但在已用 electron-builder 管理签名的情况下，手动再签一次反而容易破坏链路。

正确的做法是让 electron-builder 在构建阶段统一处理：它读取 `CSC_NAME` 或 `CSC_LINK` 定位证书，结合 `provisioningProfile` 和 `entitlements.mas.plist` 完成签名。你只需要保证这些输入正确，不必在流程中插入额外的签名步骤。

统一由 electron-builder 签名的思想是“单一信任源”：构建工具知道该用哪张证书、哪个描述文件、哪份 entitlements，你只需保证输入正确。引入额外签名步骤只会制造重复与冲突。

如果你确实遇到 electron-builder 默认签名不满足需求的情况，优先查官方文档的 `mac` 配置项，而不是急着挂第三方补签脚本，多数场景都能在配置层解决。

## 三、.app 与 .pkg 的区别

MAS 构建会产出两类关键产物：

- `.app`：应用本体，是签名与沙盒校验的主要对象，双击可运行、调试
- `.pkg`：安装包，是最终上传到 App Store Connect 的载体

很多初学者误以为有了 .app 就完成了，实际上商店分发要求的是 .pkg。上传前务必确认 Transporter 加载的是 .pkg，而不是把 .app 直接拖进去。本地调试可以用 .app 验证运行行为，但提交审核必须走 .pkg。

本地验证 .app 时若启动崩溃，优先看是否缺动态库或签名无效，而不是怀疑业务代码。.app 能跑通，只代表应用本体可用，不代表 .pkg 上传与商店分发一定顺利。

pkg 与 app 的体量也不同，pkg 内含安装逻辑，体积通常更大，上传与审核耗时相应更长，排期时要预留余量。

## 四、Transporter 上传与自动验证

打开 Transporter，选择构建出的 .pkg 进行上传。上传过程本身包含 Apple 的基础验证：架构完整性、签名有效性、是否引用了不允许的内容等。验证失败会给出明确错误码，按提示修正后重新上传即可。

与 Developer ID 路径不同，MAS 上传后不需要你本地跑公证脚本——Apple 在后台的签名与审核流程会接管这部分。你看到的“已接收构建版本”意味着产物进入 App Store Connect 的待审核队列，而不是已经完成所有安全处理。

Transporter 的校验是“上传前最后一道关”，它能在你本地就拦下明显错误，比等 Apple 后台处理完再报错高效得多。养成上传前先本地验证 .pkg 完整性的习惯。

## 五、版本号冲突：CFBundleVersion 必须递增

MAS 对版本号极其严格。除了 `package.json` 里的 semver 版本，Apple 内部还看 `CFBundleVersion`（构建号）。如果新上传的构建号不高于已存在的版本，Apple 会直接拒绝，报类似“版本已存在”的错误。

每次上传前都要确保构建号递增，常见做法是在 CI 里基于提交次数或时间戳生成 `CFBundleVersion`。不要手动复用同一个构建号，也不要指望只改 semver 就能绕过——两个版本号维度都要单调上升。

构建号的管理最好自动化，而不是手动改。CI 里常见做法是取 git 提交次数或当前时间戳作为 `CFBundleVersion`，保证全局唯一且单调递增，避免人为漏改。

另外，`package.json` 的 semver 与 `CFBundleVersion` 要保持语义一致：前者给用户看，后者给 Apple 校验。两者都升，才不会出现“版本号变了却上传被拒”的困惑。

## 六、MAS 与 DMG 必须分配置

一个非常典型的坑是：明明想打 MAS 包，结果因为配置没切干净，打出了 DMG 或同时混入了 Developer ID 签名。根本原因是两套配置没有彻底分离，或者构建脚本默认加载了非 App Store 配置。

排查时先确认三点：构建命令加载的是 mas 配置、target 是 `['mas']`、没有残留的 `afterSign` 公证钩子。只要这三条成立，产物才会是纯 MAS 路线，后续上传和审核才不会因“签名类型不对”被拒。

配置分离还有一层好处：当 MAS 审核政策变化时，你只需调整 mas 配置，不必担心牵连 Developer ID 分发链路。两条路各自演进，互不干扰。

## 七、打包失败的系统排查思路

当构建报错时，不要盲目改配置，按层次排查更高效：

1. 证书层：是否安装/可访问，身份字符串是否精确
2. 描述文件层：是否与 App ID、证书配套
3. entitlements 层：沙盒是否开启，权限是否超出必要
4. 配置层：是否加载了正确的 mas 配置，target 是否正确
5. 产物层：dist 是否清理，输出是否是预期的 .pkg

多数失败都能映射到这五层之一。先看构建日志里报错发生在签名前还是签名后，再顺着对应层往下找，比全局乱改快得多。

日志里的阶段标记很关键：签名前报错多在 prepare 或依赖安装阶段，签名后报错多在 build-mac 阶段。看准报错发生在哪个阶段，再针对性排查，比全局搜索快得多。

## 八、从打包到提交的闭环

把前面几节串起来：清理 → 用 mas 配置编译 → electron-builder 自动签名 → 得到 .pkg → Transporter 上传 → 版本号递增避免冲突 → App Store Connect 提交审核。这条链路在本地和 CI 里都能复现，区别只是证书与描述文件通过 Secrets 注入。

把这套流程固化到 CI 后，本地基本不再需要手动打 MAS 包，只需保证 mas 配置与 Secrets 就绪。这也是自动化交付最直观的收益：把易错的人肉步骤交给可重复的执行环境。

到这一步，MAS 上架的“能打出来、能传上去”已经打通。下一节我们把视角拉到更通用的持续交付：用 GitHub Actions 把 Windows、macOS、Linux 三端构建自动化。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 上传报“版本已存在” | CFBundleVersion 未递增 | 每次上传前递增构建号，保证单调上升 |
| Transporter 加载 .app 报错 | 商店分发需要 .pkg | 上传构建出的 .pkg 而非 .app |
| 打出的是 dmg 不是 mas 包 | 构建未加载 mas 配置 | 确认脚本指向 electron-builder.mas.config.js |
| 手动 electron-osx-sign 后签名异常 | 与 electron-builder 自动签名冲突 | 移除手动签名，交给 electron-builder 统一处理 |
| 旧产物干扰新构建 | dist 未清理 | 构建前 rm -rf dist |
| 签名后仍然报权限问题 | entitlements 缺少沙盒或权限不对 | 检查 entitlements.mas.plist 的 app-sandbox 与 groups |

## 延伸阅读

- 上一篇：[Electron 应用上架 Mac App Store：证书申请与构建配置](24-Electron应用上架Mac-App-Store、证书申请与构建配置.md)
- 下一篇：[GitHub Actions CI/CD 集成与多平台自动化构建](26-GitHub-Actions-CI-CD集成与多平台自动化构建.md)
- 相关：[Transporter 帮助](https://developer.apple.com/help/app-store-connect/)、[electron-builder 配置](https://www.electron.build/)、[CFBundleVersion 文档](https://developer.apple.com/documentation/bundleresources/information_property_list/cfbundleversion)
