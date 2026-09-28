---
title: GitHub-Actions实操配置、前置准备与构建测试
description: "上一节建立了 CI/CD 的认知框架，这一节落地到具体动作。我们会从推送代码前的本地准备讲起，依次覆盖 Personal Access Token 的申请与 Secrets 配置、代码推送到远程、工作流文件的修改、构建流程的执行，以及最后如何把草稿 Release 发布出去。目标是在你第一次跑通自动化发布前，知道每一步在防什么坑。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# GitHub Actions 实操配置：前置准备与构建测试

## 概述

上一节建立了 CI/CD 的认知框架，这一节落地到具体动作。我们会从推送代码前的本地准备讲起，依次覆盖 Personal Access Token 的申请与 Secrets 配置、代码推送到远程、工作流文件的修改、构建流程的执行，以及最后如何把草稿 Release 发布出去。目标是在你第一次跑通自动化发布前，知道每一步在防什么坑。

## 学习目标

- 完成推送前的本地准备工作：构建测试、锁定依赖、确认 Node 版本
- 申请 GitHub Personal Access Token 并配置到仓库 Secrets
- 正确推送代码并管理远程仓库与分支
- 修改 release.yml：加入手动触发、替换 Token 变量、补充 release-notes
- 理解准备阶段与构建阶段的分工
- 手动编辑并发布 Draft Release

---

## 一、推送前的本地准备

CI 会复刻你的本地环境，本地能跑线上才可能跑通。推送前至少完成三件事：

```bash
npm run compile
rm package-lock.json
npm install --package-lock-only
node -v
```

`npm run compile` 验证前端资源与打包脚本无错；`npm install --package-lock-only` 只更新锁文件、不装全部依赖，确保 CI 用的 `package-lock.json` 是最新的；`node -v` 确认本地 Node 版本与 workflow 里配置的版本一致。任何一项在本地失败，都应先修好再推送，而不是把问题带到云端调试。

## 二、申请 Personal Access Token

GitHub Actions 需要凭证访问 GitHub API 来创建 Release、上传文件。这个凭证就是 Personal Access Token（PAT）。在开发者设置里生成 classic token，至少授予 `repo` 与 `workflow` 权限。

Token 只会显示一次，生成后立即复制保存。它等价于密码，绝不能写进代码或提交到仓库。拿到后，到仓库的 Settings → Secrets and variables → Actions 里新建一个名为 `GH_TOKEN` 的 repository secret，值粘贴 token。工作流里通过 `${{ secrets.GH_TOKEN }}` 引用，日志中不会明文显示。

## 三、推送代码到远程

本地准备好后，把代码推到 GitHub：

```bash
git remote add github https://github.com/your-name/your-repo.git
git add .
git commit -m "添加 CI 配置"
git push github main
```

注意分支名要与 workflow 里 `on.push.branches` 配置一致（常见是 main 或 master）。如果远程已存在同名 remote，先 `git remote remove` 再添加；若推送被拒，先 `git pull` 再推。首次推送可能需要用 token 作为密码认证。

## 四、修改工作流文件

`.github/workflows/release.yml` 通常需要三处调整。第一，加 `workflow_dispatch` 允许手动触发：

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
```

第二，把自动生成的 `GITHUB_TOKEN` 统一替换为自己的 `GH_TOKEN`，因为 PAT 权限更完整、更适合发布场景。第三，准备一份 `buildResources/release-notes.md` 作为发布说明模板，构建时由 `body_path` 引用。这三步让工作流既能自动跑，也能手动调试。

## 五、构建流程的两个阶段

工作流跑起来后，逻辑上分准备阶段和构建阶段。准备阶段（prepare job）负责检查凭证、拉代码、配 Node、读取 release-notes、创建 Draft Release；构建阶段（各平台 job）依赖 prepare，分别在不同 runner 上打包并上传产物到草稿。

```text
prepare 创建草稿
→ build-windows 上传 exe
→ build-mac 签名 + 公证后上传 dmg
→ build-linux 上传 AppImage
→ 所有平台完成，草稿聚齐
```

这种分工让“草稿先行、产物后补”成为现实，也方便你单独重跑某个失败的平台 job，而不必从头再来。

## 六、手动触发与查看日志

加了 `workflow_dispatch` 后，进入仓库 Actions 面板，选择 Release 工作流，点 Run workflow 并选分支即可手动启动。适合不想推代码就测试构建的场景。

构建日志按 job、step 展开，每步成功显示对勾，失败标红。失败时优先展开报错步骤看具体信息，而不是全局猜测。Windows 约 3–5 分钟，macOS 因签名公证更久，耐心等待所有平台完成。

## 七、发布 Draft Release

所有平台构建完成后，草稿里会聚齐各端安装包（.exe、.dmg、.AppImage）以及 `latest.yml`。进入 Releases 面板找到该草稿，点 Edit：

- 确认版本标签与标题
- 补充发布说明
- 取消 “Save as draft”
- 勾选 “Set as the latest release”
- 点 Publish release

发布后对所有用户可见，并会成为自动更新的有效源。发布前务必确认三端产物都在，版本号正确，避免发布不完整版本。

## 八、从本地到发布的完整闭环

把这一节串起来：本地构建测试 → 锁定依赖 → 申请并配置 GH_TOKEN → 推送代码 → 改 release.yml（手动触发 + Token 替换 + notes）→ 手动或自动触发 → 查看日志 → 发布草稿。每一步都是为了防止“线上才暴露问题”。

到这，GitHub Actions 的基础闭环已经打通。下一节我们补上 macOS 公证签名与 Linux 构建这些更进阶的云端配置，以及常见的打包问题修复。

一个值得养成的习惯是把 release-notes.md 也纳入版本管理，并在每次发版前更新内容。这样草稿里的发布说明永远和代码同步，避免发布时才临时补写、遗漏重要变更。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| npm run compile 本地失败 | 项目代码有错 | 本地修好再推送，别把问题带到 CI |
| package-lock 未更新 | 没跑 --package-lock-only | 删除旧锁文件后重新生成 |
| Token 认证失败 | 权限不足或未配置 | 重申请 token，确保 repo 与 workflow 权限 |
| workflow_dispatch 不显示 | 缩进错误 | 确保与 push 同级，YAML 缩进正确 |
| 构建找不到 GH_TOKEN | Secret 名称不一致 | 确认 Secret 名为 GH_TOKEN 且已配置 |
| 草稿里缺某平台产物 | 该平台 job 失败 | 展开失败步骤日志，单独修复重跑 |

## 延伸阅读

- 上一篇：[GitHub Actions CI/CD 集成与多平台自动化构建](26-GitHub-Actions-CI-CD集成与多平台自动化构建.md)
- 下一篇：[GitHub Actions 接入 macOS 公证签名、Linux 构建与打包问题修复](28-GitHub-Actions接入macOS公证签名、Linux构建与打包问题修复.md)
- 相关：[创建 PAT](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)、[Encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
