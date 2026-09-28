---
title: GitHub-Actions接入macOS公证签名、Linux构建与打包问题修复
description: "基础发布闭环打通后，真正的工程难点才浮现：macOS 既要签名又要公证，认证凭证在云端无法直接读取本地钥匙串，Linux 虽简单但也有自己的坑。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# GitHub Actions 接入 macOS 公证签名、Linux 构建与打包问题修复

## 概述

基础发布闭环打通后，真正的工程难点才浮现：macOS 既要签名又要公证，认证凭证在云端无法直接读取本地钥匙串，Linux 虽简单但也有自己的坑。这一节把 macOS 自动化发布的两阶段拆开讲，对比课程旧方案与官方新方案在命名上的差异，说明证书与 API Key 如何安全注入，并给出矩阵构建和常见打包失败的系统排查。

## 学习目标

- 区分 macOS 的代码签名与公证两个阶段
- 对比 electron-builder-notarize + afterSign 与内置 @electron/notarize
- 厘清 Apple API Key 的课程旧命名与官方 APPLE_* 命名
- 掌握证书 .p12 导出、base64 与 CSC_LINK 注入
- 用矩阵构建扩展到 macOS 与 Linux
- 定位 files 配置遗漏与 CI 细节错误

---

## 一、签名与公证是两个独立阶段

对 macOS 而言，打包完成只是开始。代码签名（Code Signing）证明应用来自可信开发者；应用公证（Notarization）由 Apple 对产物做安全审核，消除“未知开发者”提示。两者面向的问题不同，凭证也不同。

GitHub Actions 只是执行者，复杂度集中在前置准备：证书、API Key、环境变量。只要这些名字或位置写错，整个流程就会失败。签名和公证缺任一，用户安装体验都不完整。

## 二、旧方案 afterSign 与新方案内置集成

课程视频常用 `electron-builder-notarize` 挂在 `afterSign` 钩子上，让签名完成后自动公证：

```js
module.exports = {
  afterSign: 'electron-builder-notarize',
  mac: { hardenedRuntime: true },
}
```

但当前官方文档更推荐直接用 electron-builder 内置的 `@electron/notarize` 集成，只要提供 `APPLE_*` 环境变量，构建链路就会自动触发公证，不必额外挂 afterSign。两种方式都能工作，但不要把旧插件的 Secrets 命名和新环境变量混用，否则极易出错。

## 三、Apple API Key 的两套命名

云端 runner 读不到你本地钥匙串，所以要在 App Store Connect 创建 API Key，把关键字段存进 Secrets。这里最容易混淆的是命名归属：课程第三方 Action 常用 `API_KEY`、`API_KEY_ID`、`API_ISSUER_ID`；而官方 `electron-builder` 标准变量是 `APPLE_API_KEY`、`APPLE_API_KEY_ID`、`APPLE_API_ISSUER`。

```yaml
# 官方推荐
env:
  APPLE_API_KEY: ${{ secrets.APPLE_API_KEY }}
  APPLE_API_KEY_ID: ${{ secrets.APPLE_API_KEY_ID }}
  APPLE_API_ISSUER: ${{ secrets.APPLE_API_ISSUER }}
```

两者表达同一类信息，但不能随意互换——要看你的 workflow 读的是哪一组。按官方文档走，就优先记 `APPLE_*` 这组。

## 四、证书 .p12 与 CSC_LINK

公证依赖 API Key，但**签名**依赖开发者证书。CI 远程构建读不到本地证书，需先从钥匙串导出 `.p12`，再转 base64 存入 Secrets：

```bash
base64 -i certs.p12
```

```yaml
env:
  CSC_LINK: ${{ secrets.CSC_LINK }}
  CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
```

`CSC_LINK` 是 electron-builder 读取证书内容的标准变量，值通常是 base64 字符串；`CSC_KEY_PASSWORD` 对应导出 .p12 时设的密码。证书里应包含有效的 `Developer ID Application`。`.p12` 密码必须与导出时一致，否则签名阶段直接失败。

## 五、矩阵构建扩展到多平台

Windows 跑通后，用矩阵一行就能扩展到 macOS 和 Linux：

```yaml
strategy:
  matrix:
    os: [windows-latest, macos-latest, ubuntu-latest]
```

增加矩阵只是“启动更多平台任务”，不代表每个平台一定成功。macOS 更依赖 Secrets，Linux 配置通常简单但仍要保证依赖与打包目标正确。出错时进 Actions 日志看具体失败步骤，不要盲改配置。生产项目建议把 `-latest` 固定到明确版本标签（如 `macos-15`），减少镜像漂移带来的不确定性。

## 六、files 配置遗漏导致运行期报错

一个典型问题是：安装后启动报错找不到 `main/locales` 之类资源。根因不是运行时代码，而是打包阶段没把资源带进去。一旦手动配置 `files`，只有被包含的路径才会进入产物。

```js
module.exports = {
  files: [
    'dist/**/*',
    'packages/main/locales/**/*',
  ],
}
```

“本地能跑、安装包运行报错”通常优先排查 `files`、`extraResources` 和资源路径解析，而不是先怀疑业务代码。

## 七、CI 配置问题多在细节

这类问题技术难度不高，难在繁琐。常见出错点：环境变量名与工作流引用名不一致、`.p8` 或 `.p12` 内容复制不完整、`afterSign` 挂载位置错误、`mac.hardenedRuntime` 层级错误、`files` 漏掉非构建目录资源、引入不兼容依赖。

最佳实践是：先保证本地构建成功再推云端；每改一个环节就提交一次，便于回滚定位；关键字段名优先查官方文档，不凭记忆手写。

## 八、把 macOS 与 Linux 纳入稳定交付

把前面几节合起来：用矩阵启动三端任务，macOS job 注入 `APPLE_*` 与 `CSC_LINK` 完成签名公证，Linux job 跑最简配置，所有产物上传到同一草稿。这样本地只需推代码，云端就产出带签名、带公证、三端齐备的发布物。

到这，macOS 公证与 Linux 构建已在 CI 中稳定。下一节我们转向交付的最后一公里：让已安装的应用自动检测到新版本。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| macOS 任务直接失败 | Secrets 缺失或命名不一致 | 确认 workflow 读的是旧命名还是官方 APPLE_*，逐项核对 |
| 公证失败 | 未开 hardenedRuntime 或 API Key 错 | 开启 mac.hardenedRuntime，重核 Apple Key |
| 签名失败 | .p12 内容或密码错 | 重新导出证书、base64 编码，确认密码 |
| 安装后找不到语言文件 | files 漏了 locales | 补 packages/main/locales/**/* |
| 只有 Windows 产物 | 矩阵只有 Windows | 在 matrix.os 加 macos 与 ubuntu |
| 发布后 macOS 仍弹提示 | 只签名未公证 | 检查 afterSign、Apple Key 与公证日志 |

## 延伸阅读

- 上一篇：[GitHub Actions 实操配置、前置准备与构建测试](27-GitHub-Actions实操配置、前置准备与构建测试.md)
- 下一篇：[Electron 自动更新集成、GitHub Releases 发布链路与手动检查更新](29-Electron自动更新集成、GitHub-Releases发布链路与手动检查更新.md)
- 相关：[@electron/notarize](https://github.com/electron/notarize)、[electron-builder 代码签名](https://www.electron.build/code-signing-mac)、[矩阵任务](https://docs.github.com/en/actions/using-jobs/using-a-matrix-for-your-jobs)
