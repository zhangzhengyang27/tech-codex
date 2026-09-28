---
title: CDN生产版资源与defer-async策略
description: "CDN external 不只是“把包丢到外面去”，还要继续优化到底加载哪个文件、以什么时序加载。本节在 external 基础上，把核心库替换成对应的生产版 CDN 文件，根据资源性质给不同脚本补 defer / async，并明确自动路由这类构建期生成能力不适合粗暴 external，把 external 策略从“粗粒度减包”推进到资源版本选择、加载时序优化与 external 边界控制。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# CDN 生产版资源与 defer-async 策略

## 概述

CDN external 不只是“把包丢到外面去”，还要继续优化到底加载哪个文件、以什么时序加载。本节在 external 基础上，把核心库替换成对应的生产版 CDN 文件，根据资源性质给不同脚本补 `defer` / `async`，并明确自动路由这类构建期生成能力不适合粗暴 external，把 external 策略从“粗粒度减包”推进到资源版本选择、加载时序优化与 external 边界控制。

## 学习目标

- 理解 external 之后还要选对 CDN 生产版 / 压缩版文件，节省首屏带宽。
- 会去 npm 包 `dist` 目录或 CDN 上确认可用文件名再写配置。
- 建立“external 不是越多越好”的取舍观：优先大而稳定的运行时库。
- 分清 `defer` 与 `async` 的加载时序差异，并能按脚本名称精细控制。
- 识别 external 的边界：构建期生成型模块（如自动路由）暂不适合 external。

---

## 一、external 之后还要选对生产版文件

external 只是把资源移出 bundle，但如果 CDN 引用的还是偏开发态或未压缩版本，实际网络传输成本仍然偏高。优化重点要转向选对 CDN 上对应包的生产版构建文件。

课程先拿 `vue` 做示例，把 `vue.global.js` 切成 `vue.global.prod.js`。这一步虽只换一个文件名，背后体现的是：资源 external 之后，依然需要继续做精细化资源选择。

```ts
{
  name: "vue",
  var: "Vue",
  relativeModule: "dist/vue.global.prod.js",
}
```

## 二、先确认可用文件名再写配置

想知道某个库该加载哪个生产版文件，最稳的办法不是猜，而是去看 npm 包页面、`node_modules` 或 CDN 上可见的 `dist` 文件列表，确认生产环境最合适的入口文件名。不同库的构建产物命名规则不统一，只有先确认文件结构，`relativeModule` 配置才可靠。

```ts
{
  name: "pinia",
  var: "Pinia",
  relativeModule: "dist/pinia.iife.prod.js",
}
```

生产版文件通常带 `prod`、`min`、`iife`、`global` 之类的命名特征，课程强调“先看文件名再配置”是非常稳的习惯。

## 三、external 不是越多越好

一个容易被忽略的误区：不是所有依赖都值得 external。external 一个库就多一个运行时请求，请求多了，握手成本、时序依赖和可用性复杂度也会增加。

优先 external 真正的大头依赖（如 `element-plus`、`echarts`）；对于像 `vue-i18n`、`@vueuse/core` 这类体积不算大的包，可以不急着 external。打包优化到后面是在做综合取舍：体积收益、请求数量、运行时依赖复杂度，而不是单纯比谁更小。

```text
优先 external：
  element-plus
  echarts

可以保留本地：
  vue-i18n
  @vueuse/core
```

## 四、defer 与 async 的加载时序差异

给 CDN 注入的脚本添加 `defer` 或 `async`，本质是在优化它们和 HTML 解析、页面渲染之间的时序关系。并不是所有脚本都应该一视同仁：

- `defer`：下载不阻塞 HTML 解析，执行会等到文档解析完成之后；
- `async`：下载和执行都更独立，下载完就执行，顺序不保证。

这意味着核心依赖和需要 DOM 的脚本更适合 `defer`；和首屏核心内容关系不大的脚本，可以考虑 `async`。

```html
<script defer src="..." />
<script async src="..." />
```

## 五、用 transform.script 按名称精细控制

课程继续走插件配置扩展，而不是手工改生成后的 HTML。它先打印脚本节点信息拿到 `tag`、`name` 等元数据，再根据不同脚本名称设置扩展属性：某些次要脚本加 `async`，`echarts` 这类可延后的资源加 `defer`。

```ts
transform({
  script: (scriptNode) => {
    const { tag, name } = scriptNode
    if (tag !== "script")
      return scriptNode

    if (name === "sort-js")
      scriptNode.attrs.async = true

    if (name === "echarts")
      scriptNode.attrs.defer = true

    return scriptNode
  },
})
```

先打印节点结构再写策略，比盲猜字段名靠谱；课程不是所有脚本统一加同一属性，而是按资源性质区分，这才是更有工程感的做法。

## 六、external 的边界：构建期生成能力暂不动

课程想把 `vue-router` 相关外部化，连 `vue-router/auto`、`vue-router/auto-routes` 一类路径也想排掉，但实际验证后发现：这么做最终生成的页面路由内容会严重缺失，很多页面直接不见了。

自动路由这套能力和构建期代码生成、路由文件分析、虚拟模块解析深度绑定，不是简单的运行时包依赖。课程最终务实处理：先把这部分 external 尝试注释掉，保持它走本地构建链，等方案更成熟再说。这不是所有理论上能 external 的东西都适合在当前阶段 external。

```ts
// 先不要 external 这类自动路由相关模块
// "vue-router/auto"
// "vue-router/auto-routes"
```

到这一节为止，external 策略已经从“减体积”走向“减体积 + 控时序 + 管边界”。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 已经走 CDN 了为什么还要换文件名 | CDN 默认文件不一定是最优生产版资源 | 去 `dist` 目录或 CDN 上确认真正的 `prod/min` 版本文件 |
| 所有脚本都统一加 `async` 可以吗 | `async` 会打乱执行顺序，不适合所有依赖 | 按资源性质分别选 `defer` 或 `async` |
| external 越多越好吗 | 请求会增加，且有些依赖是构建期能力 | 优先处理大而稳定的运行时库，对构建期模块保守处理 |
| 自动路由 external 后页面丢失 | `vue-router/auto` 依赖构建期生成 | 暂不要 external 这类模块，等方案成熟后再评估 |
| 资源路径写了但页面仍异常 | 可能写错 CDN 文件名，或脚本加载顺序不对 | 先手动验证 CDN 资源，再检查 `defer/async` 策略 |

## 延伸阅读

- 上一篇：[生产报错定位与 SourceMap 调试](05-生产报错定位与SourceMap调试.md)
- 下一篇：[GitHub-Actions 基础概念与工作流语法](../02-CI部署与依赖治理/01-GitHub-Actions基础概念与工作流语法.md)
- 相关：[MDN `defer`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/script#defer)、[MDN `async`](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/script#async)、[UNPKG](https://unpkg.com/)、[Vite 构建指南](https://cn.vite.dev/guide/build.html)
