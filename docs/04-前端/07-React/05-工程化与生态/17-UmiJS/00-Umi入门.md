---
title: "Umi 入门"
description: "Umi 是蚂蚁开源的可扩展企业级前端应用框架，以路由为基础、插件化架构；本文介绍其定位、设计思路与适用场景。"
keywords: [Umi, UmiJS, 企业级前端框架]
category: React
tags: [React, 工程化与生态, UmiJS]
---

# Umi 入门

## Umi 概述

Umi，中文发音为「乌米」，是可扩展的企业级前端应用框架。Umi 以路由为基础的，同时支持配置式路由和约定式路由，保证路由的功能完备，并以此进行功能扩展。然后配以生命周期完善的插件体系，覆盖从源码到构建产物的每个生命周期，支持各种功能扩展和业务需求。

Umi 是蚂蚁集团的底层前端框架，已直接或间接地服务了 10000+ 应用，包括 Java、Node、H5 无线、离线（Hybrid）应用、纯前端 assets 应用、CMS 应用、Electron 应用、Serverless 应用等。他已经很好地服务了我们的内部用户，同时也服务了不少外部用户，包括淘系、飞猪、阿里云、字节、腾讯、口碑、美团等。在 2021 年字节的[调研报告](https://zhuanlan.zhihu.com/p/403206195)中，Umi 是其中 25.33% 开发者的选择

Umi 有很多非常有意思的特性，比如：

1. **企业级**，在安全性、稳定性、最佳实践、约束能力方面会考虑更多
2. **插件化**，啥都能改，Umi 本身也是由插件构成
3. **MFSU**，比 Vite 还快的 Webpack 打包方案
4. 基于 React Router 6 的完备路由
5. 默认最快的请求
6. SSR & SSG
7. 稳定白盒性能好的 ESLint 和 Jest
8. React 18 的框架级接入
9. Monorepo 最佳实践
10. ...

## 不用 Umi

如果你的项目

1. 需要支持 IE 8 或更低版本的浏览器
2. 需要支持 React 16.8.0 以下的 React
3. 需要跑在 Node 14 以下的环境中
4. 有很强的 webpack 自定义需求和主观意愿
5. 需要选择不同的路由方案
6. ...

Umi 可能不适合你。

## 与其他框架比较

### create-react-app

create-react-app 是脚手架，和 Umi、next.js、remix、ice、modern.js 等元框架不是同一类型。脚手架可以让我们快速启动项目，对于单一的项目够用，但对于团队而言却不够。因为使用脚手架像泼出去的水，一旦启动，无法迭代。同时脚手架所能做的封装和抽象都非常有限

### next.js

如果要做 SSR，next.js 是非常好的选择（当然，Umi 也支持 SSR）；而如果只做 CSR，Umi 会是更好的选择。相比之下，Umi 的扩展性会更好；并且 Umi 做了很多更贴地气的功能，比如配置式路由、补丁方案、antd 的接入、微前端、国际化、权限等；同时 Umi 会更稳定，因为他锁了能锁的全部依赖，定期主动更新，某一个子版本的 Umi，不会因为重装依赖之后而跑不起来

### remix

Remix 是我非常喜欢的框架，Umi 4 从中~~抄~~（学）了不少东西。但 Remix 是 Server 框架，其内置的 loader 和 action 都是跑在 server 端的，所以会对部署环境会有一定要求。Umi 将 loader、action 以及 remix 的请求机制同时运用到 client 和 server 侧，不仅 server 请求快，纯 CSR 的项目请求也可达到理论的最快值。同时 Remix 基于 esbuild 做打包，可能不适用于对兼容性有要求或者依赖尺寸特别大的项目

## 设计思路

设计思路包括，

1. 技术收敛
2. 插件和插件集
3. 最佳实践
4. 企业级
5. import all from umi
6. 编译时框架
7. 依赖预打包
8. 默认快
9. 约束与开放

剩下 6-9 的 4 点详见[《SEE Conf: Umi 4 设计思路文字稿》](https://mp.weixin.qq.com/s?__biz=MjM5NDgyODI4MQ%3D%3D&mid=2247484533&idx=1&sn=9b15a67b88ebc95476fce1798eb49146)。

### 技术收敛

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202311032241441.png)

技术收敛对团队而言尤其重要，他包含两层含义，

1）技术栈收敛 

2）依赖收敛

技术栈收敛指社区那么多技术栈，每个技术方向都有非常多选择，比如数据流应该就不下 100 种，开发者应该如何选择；收敛了技术栈之后还需要收敛依赖，团队中，开发者的项目不应该有很多细碎的依赖，每一个依赖都附带着升级成本

我们希望开发者依赖 Umi 之后就无需关心 babel、webpack、postcss、react、react-router 等依赖，而依赖 @umijs/max 之后无需再关心开发中台项目的依赖和技术栈

### 插件和插件集

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202311032241470.png)

Umi 通过提供插件和插件集的机制来满足不同场景和业务的需求。插件是为了扩展一个功能，而插件集是为了扩展一类业务。比如要支持 vue，我们可以有 `@umijs/preset-vue`，包含 vue 相关的构建和运行时；比如要支持 h5 的应用类型，可以有 `@umijs/preset-h5`，把 h5 相关的功能集合到一起。

如果要类比，插件集和 babel 的 preset，以及 eslint 的 config 都类似

### 最佳实践

最佳实践是我们认为做某件事当下最好的方式，主语是我们，所以会相对比较主观。

比如路由、补丁方案、数据流、请求、权限、国际化、微前端、icons 使用、编辑器使用、图表、表单等方面，Umi 都会给出我们的最佳实践。这些最佳实践大部分来自蚂蚁集团内部的实践和讨论，也有部分来自社区。他们是主观和时间敏感的，所以可能会有相对比较频繁的迭代。

之所以需要最佳实践，1）是社区太多方案选择，2）是很多人没有选择的精力和经验甚至意愿。尤其是针对非专业的前端，有选择比没选择好，不管这个选择如何

### 企业级

npm 社区「世风日下」，涉政包、恶意包、广告求职包频出，所以如何确保不会「睡一觉醒来项目挂了」是面向企业生产环境提供服务的框架绕不开的一个点。

Umi 通过写死版本、依赖预打包、通过 eslint hack 锁定 eslint 依赖，通过配置锁定 babel 补丁依赖等方式，让 Umi 不会在你重装 node_modules 之后就挂掉，并以此来实现「十年后依旧可用」

### import all from umi

很多人可能都第一次听到。import all from umi 意思是所有 import 都来自 `umi`。比如 dva 不是 `import { connect } from 'dva'`，而是 `import { connect } from 'umi'`，从 umi 中导出。导出的方法不仅来自 umi 自身，还来自 umi 插件。

这是两年前 Umi 3 加的功能，最近发现 Remix、prisma、vitekit 等框架和工具都有类似实现。

```ts
// 大量插件为 umi 提供额外导出内容

import { connect, useModel, useIntl, useRequest, MicroApp, ... } from 'umi';
```

这带来的好处是。通过 Umi 将大量依赖管理起来，用户无需手动安装；同时开发者在代码中也会少很多 import 语句

## 参与贡献

https://umijs.org/docs/introduce/contributing

## 升级到 Umi 4

https://umijs.org/docs/introduce/upgrade-to-umi-4

## FAQ

https://umijs.org/docs/introduce/faq

## 开发插件

https://umijs.org/docs/guides/plugins

## 使用 Vue

https://umijs.org/docs/guides/use-vue

## MPA 模式

https://umijs.org/docs/guides/mpa

## API

https://umijs.org/docs/api/api

