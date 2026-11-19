---
title: 多端统一开发框架 Taro 的安装与使用
description: "介绍 Taro 的安装与使用：准备 Node/NPM/Yarn 环境，全局安装 @tarojs/cli，用 taro init 创建模板项目，以及各端（微信/百度/支付宝小程序、H5、React Native）的编译预览、打包与 CLI 更新命令。"
keywords: [Taro, 多端统一开发框架, 安装与使用]
category: Taro
tags: [Taro, 小程序, 跨端, React]
---

::: warning 版本提示
Taro 4.x 已发布,本文基于 Taro 1.x/2.x,API 与编译机制已有重大变化,仅作架构与思路参考。
:::


# 多端统一开发框架 Taro 的安装与使用

> 注：本文基于 Taro 早期（1.x 时代）版本撰写，部分提示与命令与当前版本（截至 2026-09，最新稳定版为 4.x）存在差异，具体请以 [官方文档](https://docs.taro.zone) 为准。

## 概念说明

Taro 的使用流程分三步：准备 Node 环境（建议经 nvm 管理）、全局安装 `@tarojs/cli`、用 `taro init` 创建模板项目。项目创建后，通过统一的 `taro build --type <端>` 命令（或对应的 npm script）完成微信/百度/支付宝小程序、H5、React Native 各端的编译预览与打包；CLI 自身与项目依赖分别用 `taro update self` 与 `taro update project` 更新。

## 安装

### Node 环境

Taro 是一个基于 [NodeJS](https://nodejs.org) 的多端统一开发框架，在安装使用 Taro 之前需要确保已安装好 Node 环境。

可以直接从 NodeJS 官网下载 NodeJS 安装包来安装 Node 环境，但更推荐使用 Node 版本管理工具 [nvm](https://github.com/creationix/nvm) 来安装管理 Node，这样不仅可以在不同版本的 Node 之间自由切换，而且在全局安装的时候也不再需要加 `sudo` 了。

### NPM 与 Yarn

安装好 Node 之后就可以直接使用 [NPM](https://www.npmjs.com/get-npm) 来安装 Taro 的开发工具了，另一个选择是使用 [Yarn](https://yarnpkg.com)。Yarn 是由 Facebook、Google、Exponent 和 Tilde 联合推出的一个新 Node 包管理工具，相比于 NPM，它具有**速度更快**、**安装版本统一**、**更加清爽简洁**等特点。

可以从 [Yarn](https://yarnpkg.com) 官网获得相关的安装信息。

查看版本号测试是否已经成功安装：

``` bash
$ npm -v
$ yarn -v
```



### taro-cli

安装好 NPM 或 Yarn 后，就可以全局安装 Taro 开发工具 `@tarojs/cli` 了。

使用 NPM 安装时，命令如下：

``` bash
$ npm install -g @tarojs/cli@latest
```

使用 Yarn 安装时，命令如下：

``` bash
$ yarn global add @tarojs/cli@latest
```

安装完毕，测试一下是否安装成功：

``` bash
$ taro -V
```

版本号打印出来，说明已经安装成功。

## 使用

至此 Taro 安装完成，下面介绍使用方式，以创建一个叫做 **myApp** 的项目为例。

使用命令创建模板项目：

``` bash
$ taro init myApp
```

NPM 5.2+ 也可在不全局安装的情况下使用 `npx` 创建模板项目：

``` bash
$ npx @tarojs/cli init myApp
```

命令行上会提示 `Taro 即将创建一个新项目!`，接着 Taro 会提示输入项目介绍，此处输入 `我的第一个 Taro 项目`；而后选择是否使用 TypeScript，不使用则输入 `n`；接着提供 CSS 预处理器选择，有 Sass、Less、Stylus，此处选择 Sass；然后是选择模板，选择`默认模板`。完成后，Taro 开始创建项目，自动安装依赖，这里可能需要等待一会。



看到提示 `请进入项目目录 myApp 开始工作吧` 后，进入项目目录开始开发。目前 Taro 已经支持微信/百度/支付宝小程序、H5 以及 ReactNative 等端的代码转换，针对不同端的启动以及预览、打包方式并不一致。

### 微信小程序

选择微信小程序模式，需要自行下载并打开[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)，然后选择项目根目录进行预览。具体安装的方法和使用请参考《微信小程序开发入门与技术选型》里的 「微信小程序开发入门」。

微信小程序编译预览及打包：

```bash
# npm script
$ npm run dev:weapp
$ npm run build:weapp
# 仅限全局安装
$ taro build --type weapp --watch
$ taro build --type weapp
# npx 用户也可以使用
$ npx taro build --type weapp --watch
$ npx taro build --type weapp
```

### 百度小程序

选择百度小程序模式，需要自行下载并打开[百度开发者工具](https://smartprogram.baidu.com/docs/develop/devtools/show_sur/)，然后在项目编译完后选择项目根目录下 `dist` 目录进行预览。

百度小程序编译预览及打包：

```bash
# npm script
$ npm run dev:swan
$ npm run build:swan
# 仅限全局安装
$ taro build --type swan --watch
$ taro build --type swan
# npx 用户也可以使用
$ npx taro build --type swan --watch
$ npx taro build --type swan
```

### 支付宝小程序

选择支付宝小程序模式，需要自行下载并打开[支付宝小程序开发者工具](https://docs.alipay.com/mini/developer/getting-started/)，然后在项目编译完后选择项目根目录下 `dist` 目录进行预览。

支付宝小程序编译预览及打包：

```bash
# npm script
$ npm run dev:alipay
$ npm run build:alipay
# 仅限全局安装
$ taro build --type alipay --watch
$ taro build --type alipay
# npx 用户也可以使用
$ npx taro build --type alipay --watch
$ npx taro build --type alipay
```

### H5

H5 模式无需特定的开发者工具，在执行完下述命令之后即可通过浏览器进行预览。

H5 编译预览及打包：

```bash
# npm script
$ npm run dev:h5
# 仅限全局安装
$ taro build --type h5 --watch
# npx 用户也可以使用
$ npx taro build --type h5 --watch
```

### React Native

React Native 端运行需执行如下命令，React Native 端相关的运行说明请参见 [React Native 教程](https://docs.taro.zone/docs/react-native)。

```bash
# npm script
$ npm run dev:rn
# 仅限全局安装
$ taro build --type rn --watch
# npx 用户也可以使用
$ npx taro build --type rn --watch
```

## 更新 Taro

Taro 提供了更新命令来更新 CLI 工具自身和项目中 Taro 相关的依赖。

更新 taro-cli 工具：

``` bash
# taro
$ taro update self
# npm 
npm i -g @tarojs/cli@latest 
# yarn 
yarn global add @tarojs/cli@latest
```

更新项目中 Taro 相关的依赖，需要在项目目录下执行。

``` bash
$ taro update project
```

## 小结

Taro 的安装与使用要点：Node 环境推荐经 nvm 管理以支持多版本切换并免 `sudo`；`@tarojs/cli` 通过 npm/yarn 全局安装（或用 npx 免安装执行），`taro -V` 验证；`taro init myApp` 交互式创建项目（项目介绍、TypeScript、CSS 预处理器、模板）。各端构建命令遵循统一模式——npm script 为 `dev:<端>` / `build:<端>`，CLI 为 `taro build --type <端>`（加 `--watch` 进入监听）；小程序端需配合对应开发者工具预览（微信选项目根目录，百度/支付宝选 `dist` 目录），H5 直接浏览器预览，React Native 参考官方教程。升级时 `taro update self` 更新 CLI、`taro update project` 更新项目依赖。
