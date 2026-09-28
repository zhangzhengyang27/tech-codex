---
title: GitHub-Pages自定义域名与DNS验证
description: "GitHub Pages 支持绑定自己的自定义域名，真正的门槛不在 GitHub 页面，而在 DNS 记录配置。本节讲清自定义域名接入链路、TXT 验证、子域名 CNAME 解析、自定义域名下 base 与 BASE_PATH 注入的回收，以及 HTTPS 自动启用的等待过程，强调“部署路径模型切换”要连带改对 CI 与构建配置。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# GitHub Pages 自定义域名与 DNS 验证

## 概述

GitHub Pages 支持绑定自己的自定义域名，真正的门槛不在 GitHub 页面，而在 DNS 记录配置。本节讲清自定义域名接入链路、TXT 验证、子域名 CNAME 解析、自定义域名下 `base` 与 `BASE_PATH` 注入的回收，以及 HTTPS 自动启用的等待过程，强调“部署路径模型切换”要连带改对 CI 与构建配置。

## 学习目标

- 理解自定义域名接入是“GitHub 页面配置 + DNS 平台配置”两条链路要对上。
- 掌握 TXT 验证记录与子域名 CNAME 解析各自的职责。
- 明白自定义域名启用后部署路径模型变化，需收回仓库子路径的 `base` / `BASE_PATH` 注入。
- 知道自定义域名模式下 workflow 里的动态注入逻辑要同步撤掉。
- 理解 HTTPS 自动启用依赖 DNS 与证书生效传播时间。

---

## 一、自定义域名接入的真正门槛在 DNS

把 Pages 部署从“默认域名可访问”推进到“绑定自己的域名”，核心思路是：域名去云服务商购买，页面托管仍用 GitHub Pages，通过 DNS 把自定义域名指向 Pages。

重点不是“GitHub 上再点一个按钮”，而是 GitHub 页面配置和 DNS 平台配置两边要对上。阿里云、腾讯云、Cloudflare 等都可以作为域名提供商，在哪买不重要，重要的是能否正确配置 TXT 和 CNAME 这类记录。

```text
自定义域名配置链路：
  购买域名
  GitHub Pages 里填域名
  DNS 平台补记录
  等待校验和生效
```

这一步和 Actions Workflow 本身是两条链路：一个管构建发布，一个管访问入口。

## 二、先用 TXT 验证域名归属

接入自定义域名前，最好先在 GitHub 里完成域名验证。做法：在 Pages 设置里添加待验证域名，GitHub 会给你一条 TXT 记录，你再去 DNS 提供商补这条记录，回到 GitHub 点 `Verify`。

这一步不只是流程要求，而是避免域名接管风险、误绑定、仓库与域名归属不清。当前官方文档口径仍然建议：先验证域名，再把它真正挂到仓库 Pages 上。TXT 记录加完通常需要等待 DNS 生效（几分钟到十几分钟），这是最容易被跳过却又最关键的一步。

```text
TXT 记录形式通常类似：
  _github-pages-challenge-USERNAME.example.com
```

## 三、子域名靠 CNAME 指向 GitHub Pages

域名验证通过后，让访问流量真正走到 Pages 的关键，是 CNAME 记录。对子域名场景（如 `view.example.com`），在 DNS 平台配置：记录类型 `CNAME`，目标 `USERNAME.github.io`。同时在仓库设置里填域名时不要带 `http://` 或 `https://`，直接填纯域名。

```text
DNS 平台示意：
  类型：CNAME
  主机记录：view
  记录值：your-username.github.io
```

子域名和顶级裸域的 DNS 配法不完全一样，这一节主要覆盖子域名方案。DNS 改完后不一定立刻生效，等待是正常流程的一部分。

## 四、自定义域名下要收回 base 注入

这一步最容易出问题：项目之前为仓库子路径部署做过一套 `base` 动态注入，切换到自定义域名后页面就空白了。根本原因很简单——

- 仓库子路径模式：`https://user.github.io/repo-name/`
- 自定义域名模式：`https://view.example.com/`

自定义域名模式下已经没有 `/repo-name/` 这一层前缀。如果还保留 `BASE_PATH=/${repo}/` 或 `base: "/repo-name/"`，所有资源路径就会继续错误地带着仓库名前缀，结果页面空白、JS/CSS 404。

```ts
// 自定义域名场景下，应回到根路径
base: "/"
```

## 五、workflow 里的 BASE_PATH 注入也要撤掉

上一节打通的链路是 `GITHUB_REPOSITORY -> 提取仓库名 -> 写入 GITHUB_ENV -> 构建步骤注入 BASE_PATH -> vite.config.ts 读取`。这套链路在仓库子路径模式下正确，但切换到自定义域名后，它仍在强制给构建产物加仓库名前缀，于是变成问题来源。

所以要把 workflow 里那段 `BASE_PATH` 注入逻辑一起注释掉。这说明部署策略一旦切换，不只是 `vite.config.ts` 要改，和它耦合的 CI 环境变量链路也要一起回收。`base` 路径策略必须保持一致，不能 Vite 改了而 workflow 还沿用旧逻辑。

```yaml
# 自定义域名模式下不再注入 BASE_PATH
# - name: Extract repository name
#   run: echo "BASE_PATH=/${GITHUB_REPOSITORY#*/}/" >> $GITHUB_ENV
```

## 六、HTTPS 自动启用需要等待

自定义域名配置成功后，GitHub Pages 会自动处理 DNS 检查和 HTTPS 证书配置，但通常不是瞬时的：先保存域名，再等待 DNS 生效，GitHub 再自动尝试启用 HTTPS。官方文档口径也类似——配置正确后可出现 `Enforce HTTPS`，有时需等待一段时间才会出现。

不急着立刻判断失败，先等 DNS 生效，再回来检查，这非常符合真实场景。

## 七、自定义域名模式下 workflow 与 vite.config 的配套收尾

切换自定义域名后，真正要收尾的是两条配置线一起归位。GitHub Actions 里原本为仓库子路径注入 `BASE_PATH` 的步骤直接去掉，构建步骤不再带 `env: BASE_PATH`：

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - uses: pnpm/action-setup@v3
        with:
          version: 8
      - run: pnpm install
      - run: pnpm build
```

`vite.config.ts` 则回到根路径，不再依赖仓库名前缀：

```ts
export default defineConfig(() => ({
  base: "/",
}))
```

这两处合起来才说明“部署路径模型已切换”：访问入口是自定义域，资源路径也回到根。建议再补一份“默认 GitHub 域名模式 / 自定义域名模式”的切换说明，明确什么场景保留 `BASE_PATH`、什么场景必须移除，后续换域名或换仓库就不会再踩空白页。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 自定义域名一直验证不过 | TXT 记录还没生效或填错域名 | 检查 DNS 记录内容，等待传播后再点 `Verify` |
| 访问还是空白页 | 资源路径还带仓库名前缀 | 撤回 `BASE_PATH` 注入，把 Vite `base` 切回根路径 |
| 默认域名好好的换成自定义域就坏 | 切换访问入口却没切换资源路径模型 | 把两种模式视为不同部署模型分别处理 |
| GitHub Pages 显示 DNS 检查中 | DNS 生效和 HTTPS 配置都需要时间 | 等待几分钟到十几分钟后再检查 |
| 还要保留动态仓库名注入吗 | 自定义域名下已不需要仓库名前缀 | 自定义域模式中把这条链路注释或移除 |
| 在线编辑 workflow 容易写坏 YAML | 页面编辑缺本地校验 | 小步提交，多看 Actions 日志，必要时拉回本地改 |

## 延伸阅读

- 上一篇：[GitHub Pages 官方工作流与动态 base 路径](02-GitHub-Pages官方工作流与动态base路径.md)
- 下一篇：[Dependabot 依赖更新与 Renovate 方案对比](04-Dependabot依赖更新与Renovate方案对比.md)
- 相关：[Managing a custom domain for GitHub Pages](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)、[Verifying your custom domain](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)、[Vite `base` 配置](https://cn.vite.dev/config/shared-options.html#base)
