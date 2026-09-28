---
title: GitHub-Pages官方工作流与动态base路径
description: "最小可发布工作流跑通之后，下一步是从“推 gh-pages 分支”升级到 GitHub Pages 官方推荐的工作流链路，并解决仓库子路径部署下的 base 问题。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# GitHub Pages 官方工作流与动态 base 路径

## 概述

最小可发布工作流跑通之后，下一步是从“推 `gh-pages` 分支”升级到 GitHub Pages 官方推荐的工作流链路，并解决仓库子路径部署下的 `base` 问题。本节讲清官方链路的结构差异、部署所需的 `permissions` / `concurrency` / `environment`，以及如何用 `GITHUB_REPOSITORY` 动态注入 `BASE_PATH`，让部署路径随仓库上下文自动适配。

## 学习目标

- 理解官方 Pages 工作流与传统 `gh-pages` 分支推送方案的结构差异（artifact 与 deploy 分离）。
- 掌握 `permissions`、`concurrency`、`environment` 在官方部署链路中的作用。
- 能用环境变量动态注入 `base`，避免把仓库名写死。
- 会用 `GITHUB_REPOSITORY` 提取仓库名并写入 `GITHUB_ENV` 供后续步骤复用。
- 理解“环境变量提取 -> 传递 -> 构建消费”三步全通才算真正生效。

---

## 一、从可用走向规范：官方 Pages 链路

上一节用较简单的 Action 把静态文件发到了 `gh-pages` 分支，已经说明 Actions 可以自动发布前端项目。这一节继续推进，比较两种做法：传统 `gh-pages` 分支推送方案，与 GitHub 官方 Pages 工作流方案。课程更偏向后者，因为官方维护链路把“上传构建产物”和“部署 Pages”拆得更清晰，和仓库 Pages 后台配置联动更直接。

这不是之前方案错了，而是在已经会发站点之后，开始转向更官方、更标准的发布链路。

```text
官方链路核心步骤：
  configure-pages
  upload-pages-artifact
  deploy-pages
```

## 二、官方方案：先上传 artifact，再部署

官方方案里有 `upload-pages-artifact`，后面还有单独的 `deploy-pages`。思路是：先把构建产物作为 artifact 上传，再由专门的部署 job 去消费这个 artifact。

```yaml
- uses: actions/upload-pages-artifact@v3
  with:
    path: ./dist

- uses: actions/deploy-pages@v4
```

相比“构建完直接推 `gh-pages` 分支”，官方方案在结构上更清晰：`build` 负责产物，`deploy` 负责发布，也更符合 GitHub Actions 的 job 分工思路，日志和职责划分更清楚。

## 三、部署型 workflow 的关键字段

切换到官方 Pages 工作流时，配置文件前面会多出 `permissions`、`concurrency`、`environment`，它们不是装饰项：

- `permissions`：决定 workflow 有没有权限发布 Pages，例如 `pages: write`、`id-token: write`；
- `concurrency`：决定 Pages 部署是否允许并发，避免同一环境被多个部署同时覆盖；
- `environment`：把部署结果和某个环境名绑定，还能把部署后生成的 URL 回填出来。

```yaml
permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true
```

真正的部署型 workflow，通常不只是几个 `run` 命令而已。

## 四、base 从写死升级为动态注入

GitHub Pages 最常见的 404 问题本质是 `base`。如果把它永久写死成当前仓库名，后续仓库改名或复制模板到另一个仓库，就要手动改配置。所以让 `base` 动态起来，让部署路径跟仓库上下文自动对齐。

```ts
export default defineConfig(({ mode }) => {
  const base = process.env.BASE_PATH

  return {
    base: mode === "production"
      ? base
      : "/",
  }
})
```

仓库名可能变、模板项目会复制，路径写死迟早变成负担。只要部署路径和仓库上下文有强绑定，就值得考虑动态化。

## 五、用 GITHUB_REPOSITORY 感知仓库上下文

课程没有手工填 `base`，而是利用 GitHub Actions 自带的 `GITHUB_REPOSITORY`（形如 `owner/repo-name`）。思路是：先在 workflow 里把仓库名解构出来，再写进 `GITHUB_ENV`，后续构建步骤直接从环境变量拿路径。

```yaml
- name: Extract repository name
  run: echo "BASE_PATH=/${GITHUB_REPOSITORY#*/}/" >> $GITHUB_ENV
```

`GITHUB_ENV` 是 Actions 给后续步骤共享环境变量的官方通道。这类做法特别适合模板仓库和会频繁改名的演示项目，意味着工作流开始主动感知仓库上下文，而不是依赖人手填硬编码路径。

## 六、环境变量三步全通才算生效

光提取变量不代表 Vite 构建就能读到。只有当构建步骤实际拿到了这个环境变量，`vite.config.ts` 里的 `process.env.BASE_PATH` 才会有值。

```yaml
- name: Build
  run: pnpm build
  env:
    BASE_PATH: ${{ env.BASE_PATH }}
```

课程还通过改仓库名做了一次回归验证：仓库名从 `template` 改到 `demo`，重新触发 workflow，页面资源仍然正常，证明动态 base 链路完整打通。环境变量要提取、传递、消费三步全通才算真正生效。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 发布成功但仓库改名后页面又 404 | `base` 仍写死成旧仓库名 | 把 `base` 改成 CI 里动态注入的环境变量 |
| `BASE_PATH` 设置了但 Vite 没生效 | 只提取未通过 `env` 传入 Build 步骤 | 在构建步骤显式注入环境变量 |
| 两种 Pages 方案都能用为什么要换 | 官方链路 artifact 与 deploy 分离更标准 | 优先官方 Pages workflow，第三方作过渡 |
| workflow 成功但 Pages 还是旧版 | 部署未完成或缓存仍在 | 等部署 job 完成并清缓存刷新验证 |
| 本地开发路径异常 | 生产 `base` 被直接写死 | 根据 `mode` 区分开发和生产路径 |
| YAML 改完报语法错 | 在线编辑容易缩进或表达式位置错 | 先看 Actions 报错，再校对缩进和表达式位置 |

## 延伸阅读

- 上一篇：[GitHub Actions 基础概念与工作流语法](01-GitHub-Actions基础概念与工作流语法.md)
- 下一篇：[GitHub Pages 自定义域名与 DNS 验证](03-GitHub-Pages自定义域名与DNS验证.md)
- 相关：[GitHub Pages 文档](https://docs.github.com/pages)、[actions/configure-pages](https://github.com/actions/configure-pages)、[actions/deploy-pages](https://github.com/actions/deploy-pages)、[Vite `base` 配置](https://cn.vite.dev/config/shared-options.html#base)
