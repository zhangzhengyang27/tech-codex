---
title: 文档部署-用 Vercel 部署你的线上文档
description: "这里面租用服务器和域名需要一笔花费。安装 Linux、Nginx，配置域名与 HTTPS 证书需要相应的服务器端知识。注册 HTTPS 证书和实名认证都需要准备和寄送材料，传统的部署方式可以说是费时费力。假设你只想简单的发布一个静态网页。"
keywords: [文档部署-用, Vercel, 部署你的线上文档]
category: tools
tags: [Vite, 构建工具, 工程化]
---


# 文档部署-用 Vercel 部署你的线上文档

## 概念说明

文档网站需要发布到互联网上才能被更多人访问。传统的发布流程需要准备：

-   Linux服务器；
-   网页服务软件 Nginx；
-   购买域名 + 实名认证；
-   HTTPS 证书；
-   Sftp 上传工具；
-   Github Action CI 自动发布最新文档。

租用服务器和域名需要一笔花费；安装 Linux、Nginx，配置域名与 HTTPS 证书需要相应的服务器端知识；注册 HTTPS 证书和实名认证需要准备和寄送材料。传统部署方式费时费力，对于只想发布一个静态网页的场景完全不必采用。

目前的主流方案是使用 **Serverless 页面托管云服务**：简单配置即可自动发布 Github 上的页面；图形化界面省去服务器端知识的学习成本；自动分配二级 HTTPS 域名，无需购买域名和实名认证。

该类托管服务中较常见的有 Github Pages、Vercel、Netlify 三款。

## 核心要点

- 传统部署 = 服务器 + Nginx + 域名 + HTTPS 证书 + CI；Serverless 托管将上述环节全部收归云服务，仓库推送即自动发布。
- Serverless 托管平台本质上充当 CI/CD 服务器：通过 Github API 监听仓库变化，拉取最新代码，按图形化配置执行构建并将产物发布上线。
- 三款服务中，Vercel 对前端工程最友好：可自动识别构建工具与框架、支持 Node 运行时、内置 CDN。
- 部署文档网站属于 **CD（持续交付）** 场景，托管服务的每次构建记录可在 Deployments 面板中核查。

## 托管方案对比

### Github Pages

Github Pages 是 Github 内置功能，使用最为方便，但有三个限制：

1. 每个 repo 只能发布一个网站。组件库通常是 monorepo 项目，后续还会放入 admin 演示网页等其他站点，此时存在冲突。
2. 只能发布根目录和 `docs` 文件夹，往往需要为此重构目录结构（后推出的自定义 Action 功能可解决，但配置成本更高）。
3. 访问速度较慢。

### Netlify

Netlify 总部位于旧金山，2021.11.17 完成 D 轮 1.05 亿美元融资，估值 20 亿美金。Netlify 的定位是解决 Github Pages 的部分问题，可以视为体验更好、速度更快的 Github Pages，付费后可承担企业级的 Web 访问业务。

限制：现阶段内置 CI 工具不支持 pnpm，需要自行编写第三方脚本解决。

### Vercel

Vercel 总部同样位于旧金山，2021.11.23 完成 D 轮 1.5 亿美金融资，估值 25 亿美金，由 GGV Capital 领投。创始人 Guillermo Rauch 也是 Next.js、 [http://socket.io ](http://socket.io)等开源项目的发起人。

Next.js 和 <http://socket.io> 都是明星级开源项目。这一背景带来两点优势：其一，公司资金充足，免费额度足够个人使用；其二，创始人出身前端，Vercel 对前端工程师非常友好，可以自动识别项目的构建工具和框架并完成自动配置。

基于创始人在 Web 应用开发上的经验，Vercel 帮前端开发者屏蔽了大量非业务问题（域名、DNS、SSL 证书），同时支持 Node 运行时环境、内置 CI/CD 与 CDN，页面访问速度有保证。

### 结论

三款服务都能完成静态页面发布，差异在于成本与体验：

- Github Pages：若采用，需将 docs 目录移到根目录重构代码结构，且更新时要手动 build 文档或学习 Github Action。
- Netlify：内置简单 CI，但不支持 pnpm，需自写脚本。
- Vercel：以上问题均不存在，基本通过 UI 界面即可完成，参数设定符合前端工程习惯。

三者都在持续演进、互相取长补短，实际选型时应以当时的最新特性为准。

## 用 Vercel 部署文档网站

### 部署文档网站

1. 登录 <https://vercel.com/>，使用 Github 账号第三方登录。登录时 Vercel 会要求提供 Github 数据读取授权——Vercel 此时充当 CI 服务器，需要随时调用 Github API 监听项目变化并获取最新代码。
2. 选择 New Project 添加一个项目，从 Github 列表中选择目标仓库（如 smarty-admin）。
3. 添加 Build 配置。这一步相当于 CI 过程的图形化：在 Vercel 的 CI 服务器上执行一遍文档编译流程，与 Github Action 的作用类似，区别在于后者用 Yaml 文件配置，前者用图形界面。

配置参数的依据是本地生成文档网站的完整过程。生成文档网站需要执行：

```bash
pnpm i
cd packages/smarty-ui-vite
pnpm docs:build
```

页面生成在 packages/smarty-ui-vite/docs/.vitepress/dist 中。据此对应填写三项参数：

-   BUILD COMMAND ： pnpm docs:build (vitepress 导出指令)；
-   OUTPUT DIRECTORY : docs/.vitepress/dist (vitepress 静态页面位置)；
-   INSTALL COMMAND： pnpm install 软件包安装。

4. 点击 Deploy 开始构建。Vercel 的 CI 服务会提取 Github 代码，执行安装和导出流程，并将页面发布上线。

几分钟等待后，访问 <https://smarty-admin.vercel.app/>，文档网站即发布完成。

### 实现 CI 自动更新

文档更新后的自动推送由 Vercel 默认提供：仓库代码变更后自动触发重新构建与发布，无需任何额外配置。工程化实践中需要关注的是核查这一链路是否正常——在 Deployments 面板中可以看到每次 Vercel 更新的记录，有记录即表明 CI 工作正常。

### 添加 HomePage 配置

将发布后的地址填写到 `package.json` 中，Github 页面会显示相应的主页链接；后续发布到 Npm 上也会有主页链接。

## 小结

为组件库部署文档网站，选用 Serverless 网站托管服务（Vercel）可以避免传统部署所需的服务端知识与繁琐搭建过程。Vercel 通过 Github 授权充当 CI 服务器，以图形化 Build 配置（BUILD COMMAND / OUTPUT DIRECTORY / INSTALL COMMAND）完成文档编译与发布，并在仓库更新时自动触发 CI/CD 重新部署。三款主流服务各有特点：Github Pages 免费方便但单 repo 限一站且目录受限，Netlify 不支持 pnpm，Vercel 对前端工程体验最完整，选型时按项目实际约束决定。
