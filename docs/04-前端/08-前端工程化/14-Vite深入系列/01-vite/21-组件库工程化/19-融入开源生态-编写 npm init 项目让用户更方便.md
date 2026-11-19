---
title: 融入开源生态-编写 npm init 项目让用户更方便
description: "早期组件库常通过编写 vue-cli 插件让用户使用 vue add 方便地加载组件库；随着脚手架工具的变革，npm init/npm create 成为创建项目的主流方式。本文介绍如何让组件库脚手架通过 npm create 使用，以及如何参与 Vite 生态。"
keywords: [融入开源生态-编写, npm, init, 项目让用户更方便]
category: tools
tags: [Vite, 构建工具, 工程化]
---


# 融入开源生态-编写 npm init 项目让用户更方便

本篇原计划的题目是【编写 vue-cli 插件让用户找到你】，后随脚手架工具的变革调整为 npm init 方案。以前的组件库都会使用 vue-cli 插件这样的方案，编写一个 vue-cli 插件，这样就可以使用 vue add 方便地加载组件库了。

https://github.com/hug-sun/vue-cli-plugin-element3


这个技巧可以参考下面的文章。

Element3开发内幕 - Vue CLI插件开发 - 掘金

随着时代的发展，脚手架也不断地变革。更多的脚手架会使用 npm init 或者 npm create 来创建项目。其实这两个命令没什么区别。

以常用的 vue-cli 工具为例。


目前 vue 的脚手架已经进行版本分化。首先原来的 vue-cli 工具进入了维护状态。目前只支持使用 Webpack 项目的创建。新的脚手架工具全部转为 create-vue，使用 vite 构建。

- @vue/cli :  https://github.com/vuejs/vue-cli

- Create-vue：https://github.com/vuejs/create-vue

哪种构建工具好，不在讨论范围内。这里主要通过这个案例分析一下脚手架工具的流行趋势。

从 vue-cli 到 create-vue 脚手架工具命令行界面的变革。

```Bash
# 用 @vue/cli 创建项目
sudo npm i @vue/cli
vue create my-app

# 用 create-vue 创建项目
npm create vue my-app
```

很显然后者更加的简单，只需要一条语句而且无需提前安装，体验更好。

## 用户故事(UserStory)

让组件库脚手架可以通过 npm create 使用， 让用户使用更方便。

## 任务分解(Task)

- 支持 npm init 功能；

- 测试 npm init 功能。

### 支持 npm init

其实这个功能实现起来比较简单，不需要修改代码。这个属于一种约定，了解即可。

https://docs.npmjs.com/cli/v8/commands/npm-init


查阅 npm 的官方文档，里面对 npm init 功能有以下描述。

`npm init <initializer>` 可以被用于安装一个新的或已经存在的 npm 软件包。

Initializer 是一个被命名为 create-<initializer> 的软件包。它会通过 npm-exec 运行。

以 smarty-ui 的 cli 为例，只需要将软件包名称命名为  create-smarty-app，这样就可以通过 npm init 使用。

```Bash
npm init smarty-app

# 也可以使用 执行的两者的功能是一致的。
npm create smarty-app
```

这个库正好是按照这样的命名规约命名的，所以不需要修改。

下面测试一下。


果然这种方法是可以生效的。

### 参与 Vite 生态

根据 [Vite 官方文档 ](https://vitejs.dev/guide/#scaffolding-your-first-vite-project)，Vite 的脚手架目前分为官方脚手架和第三方脚手架。


第三方脚手架全部使用 degit 安装。


degit 是一个简洁版的脚手架工具。它的特点是可以只需要创建项目模版而无需自己编写脚手架 CLI。 只需要使用 degit 就可以克隆模版项目创建自己的项目了。

https://github.com/Rich-Harris/degit

首先全局安装 degit。

```Bash
sudo npm install -g degit
```

下面测试一下这个项目是否可以这样使用， 根据规则 degit 的后面参数应该是模版软件的 github 地址。所以按照描述运行。

```Bash
degit smarty-team/smarty-ui-app-js-template my-app
```


经过测试，这个软件是可以创建的，只是没有自己 cli 的加持。连 package.json 中的软件包名字都没有改。不过假设模版比较简单，只是为了克隆项目也可以使用这个软件。


第三方脚手架全部汇总在 awesome-vite 的网站上，如果后期希望推广组件库，可以考虑给这个项目 PR。

https://github.com/vitejs/awesome-vite#templates


这样项目就可以得到更多的曝光机会。

## 复盘

本篇的主要内容是介绍如何实现 npm init 功能。

本篇内容很少，甚至不需要修改代码，只是阅读了一段简短的英文文档、遵循了某个约定，就让 npm init 支持了 组件库的安装。其实这就是本篇的意义。 开源社区和 Npm 软件生态像一部庞大的机器，它需要的是开发者为其添加新的零件。**这个时候就需要不断地了解规则，遵循规则才能收到效果**。这就好像一个开发团队内部，作为一个开发者，与团队的沟通甚至比开发能力更为重要。

可扩展的思考：

- 思考如何更好的参与 Vite 生态。
