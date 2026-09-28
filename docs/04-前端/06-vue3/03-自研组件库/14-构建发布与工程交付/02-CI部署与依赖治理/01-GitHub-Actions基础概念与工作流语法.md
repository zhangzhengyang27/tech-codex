---
title: GitHub-Actions基础概念与工作流语法
description: "项目能本地构建之后，下一步是把“拉代码、装依赖、跑构建、发产物”这套流程交给云端 CI/CD 平台自动执行。本节从 GitHub Actions 的本质讲起，读懂 YAML 的层级结构，掌握 `on` / `jobs` / `steps` 三大概念，写一个最小可运行的前端工作流，并学会在 GitHub 页面里手动触发与查看日志。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# GitHub Actions 基础概念与工作流语法

## 概述

项目能本地构建之后，下一步是把“拉代码、装依赖、跑构建、发产物”这套流程交给云端 CI/CD 平台自动执行。本节从 GitHub Actions 的本质讲起，读懂 YAML 的层级结构，掌握 `on` / `jobs` / `steps` 三大概念，写一个最小可运行的前端工作流，并学会在 GitHub 页面里手动触发与查看日志。

## 学习目标

- 理解 GitHub Actions 是云端 CI/CD 运行环境与工作流编排能力，而非“替你写代码的按钮”。
- 能读懂 workflow YAML 的层级结构：顶层元信息、触发器、`jobs`、`steps`。
- 掌握三类最常见触发器：`push`、`pull_request`、`workflow_dispatch`。
- 区分 `steps` 串行与 `jobs` 可并行，理解它们对上下文共享与耗时的影响。
- 能写出 `checkout + setup-node + npm ci + build` 的最小前端工作流，并手动触发查看日志。

---

## 一、GitHub Actions 的本质：云端执行环境

GitHub Actions 不是在替你写代码，而是在帮你准备环境、拉代码、执行脚本、发布产物。用一句话概括它做的事：在 GitHub 提供的 runner 机器上，按你的 YAML 配置，依次执行构建、测试、发布等步骤。

学会一个云平台的 CI/CD 工具，其他平台基本就打通了。GitHub Actions、GitLab CI、Travis CI 在抽象层面都很像：有触发器、有运行环境、有任务、有步骤。你在本地能执行的构建脚本，通常都可以迁移到 Actions 里执行。

```text
GitHub Actions = 事件触发
               + 运行环境
               + 任务编排
               + 构建发布脚本
```

## 二、先读 YAML 结构，再记单行命令

工作流是用 YAML 描述的，读懂层级结构比记住某一行命令更重要。大致理解：顶层是 workflow 元信息，中间是触发器，再往下是 `jobs`，每个 `job` 下面是 `steps`。

以后看任何配置，先看：顶层有哪几个块、每一块控制什么、谁嵌套在谁里面。课程里强调“越靠前的顶层属性越重要”，很有用。

```yaml
name: Demo Action
on:
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo "hello"
```

YAML 里最容易出错的是缩进层级，而不是语义。看配置时先看结构，再看单个 action 细节，会容易很多。

## 三、on：工作流的触发器

`on` 决定“什么情况下启动这条工作流”。最常见三类：`push`（代码推送触发）、`pull_request`（PR 创建或更新触发）、`workflow_dispatch`（在 GitHub 页面手动点按钮触发）。它们可以同时存在，并不冲突。

```yaml
on:
  workflow_dispatch:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
```

手动触发很适合做部署或临时调试，`workflow_dispatch` 对应的就是 GitHub 页面里的 `Run workflow` 按钮。

## 四、jobs 与 steps：任务与步骤

`steps` 是顺序执行的，`jobs` 是可以并行的。一个 `job` 内部适合放共享同一执行上下文的步骤（checkout、install、build、publish）；多个 `job` 之间适合放可拆开的独立任务（多平台测试、并行构建）。

- step 串行的优点：共享上下文、共享产物；缺点是链条长了整体耗时增加。
- job 并行的优点：快；但彼此默认不共享中间文件。

设计工作流前，先想清楚哪些步骤必须共享上下文，哪些任务可以拆出去。

```yaml
jobs:
  build:
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
```

## 五、前端工作流的最小骨架

一个最基础的前端工作流，本质上只需要几个步骤：`actions/checkout` 拉代码、`actions/setup-node` 准备 Node 环境、`npm ci` 按锁文件装依赖、最后跑你项目已有的构建命令。

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
  - run: npm ci
  - run: npm run build
```

`npm ci` 更适合 CI 环境，因为它严格依赖锁文件。这套骨架后面要发布到 Pages、服务器或其他平台，都是在这上面往后加步骤。

## 六、从页面上运行并读日志

GitHub Actions 不是只写完 `.yml` 就结束，真正使用时还要会在 GitHub 页面上找到它、跑它、读它的日志：进入 `Actions` 页面、选择 workflow、点 `Run workflow`、进入某次执行记录、看每个 job 和 step 的日志。

真正的学习不是记住语法，而是能把“配置文件”和“后台运行结果”对应起来。日志能力是后面排查工作流失败的核心手段，从手动触发入门是最直观也最容易建立信心的方式。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 写完 YAML 但页面找不到工作流 | 文件路径或提交步骤不对 | 确保放在 `.github/workflows/*.yml` 下并已推送到仓库 |
| `Run workflow` 按钮不出现 | 没写 `workflow_dispatch` | 在 `on` 里补上 `workflow_dispatch:` |
| 工作流能触发但某步骤失败 | 只写了流程没看 step 日志 | 进入 `Actions` 页面逐层展开 job 和 step 查看日志 |
| 想把所有步骤拆成多 job | job 间默认不共享上下文和产物 | 先用一个 job 跑通最小流程，再考虑并行拆分 |
| CI 里为什么推荐 `npm ci` 而非 `npm install` | CI 强调锁文件一致性和可重复性 | 优先使用 `npm ci` |
| 课程里讲的额度数字还准吗 | 官方额度和计划可能调整 | 以 GitHub 官方 `usage limits` 页面最新为准 |

## 延伸阅读

- 上一篇：[CDN 生产版资源与 defer-async 策略](../01-构建优化专题/06-CDN生产版资源与defer-async策略.md)
- 下一篇：[GitHub Pages 官方工作流与动态 base 路径](02-GitHub-Pages官方工作流与动态base路径.md)
- 相关：[GitHub Actions Workflow 语法](https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions)、[GitHub-Hosted Runners](https://docs.github.com/actions/using-github-hosted-runners/about-github-hosted-runners)、[Usage Limits & Billing](https://docs.github.com/en/actions/learn-github-actions/usage-limits-billing-and-administration)
