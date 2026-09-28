---
title: 打包体积分析与CDN外部化
description: "打包优化不能靠猜，第一步永远是先看“到底是谁把包撑大了”。本节先用可视化分析插件把 bundle 展开成 treemap，明确优化优先级，再把体积最大的通用依赖（如 element-plus、echarts）通过 vite-plugin-cdn2 外部化到 CDN，并深入处理 external 后仍被子路径或解析器拉回来的典型坑，最终把分析与外部化做成按环境启用的配置。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 打包体积分析与 CDN 外部化

## 概述

打包优化不能靠猜，第一步永远是先看“到底是谁把包撑大了”。本节先用可视化分析插件把 bundle 展开成 treemap，明确优化优先级，再把体积最大的通用依赖（如 `element-plus`、`echarts`）通过 `vite-plugin-cdn2` 外部化到 CDN，并深入处理 external 后仍被子路径或解析器拉回来的典型坑，最终把分析与外部化做成按环境启用的配置。

## 学习目标

- 掌握用 `rollup-plugin-visualizer` 做打包体积分析，从 treemap 读出优化优先级。
- 理解最终打包体积受业务 import、自动导入插件、组件解析插件与构建配置共同影响。
- 能用 `vite-plugin-cdn2` 完成 CDN external，并理解它相比手写 `external + globals` 的价值。
- 能排查 external 后体积仍不降的根因：`ElementPlusResolver` 与 `echarts/*` 子路径导入。
- 会把分析插件、resolver 与 CDN external 按环境（`mode` / 环境变量）条件启用。

---

## 一、先分析后优化：可视化体积分布

Vite 构建日志会提示“某些产物超过多少 KB、建议动态导入或代码分割”，但这个提示只告诉你结果太大，没有告诉你具体哪一块大、哪个依赖占比最高。课程先接一个可视化分析插件，把构建后的 bundle 展开成 treemap。

```ts
import { visualizer } from "rollup-plugin-visualizer"

visualizer({ open: true })
```

打开分析图后往往能看到：`element-plus` 占比很高，`echarts` 也不小，而自己写的业务模块其实都很小。这一步会直接决定后面的优化方向——优先动刀大依赖，而不是拆本来就不大的本地模块。

## 二、最终体积由多层机制共同决定

一个常见疑问是：“我已经在写 ESModule、也在按需引入组件，为什么产物还是这么大？”关键在于打包结果不只取决于你在业务代码里怎么 `import`，还取决于构建工具、自动导入插件和组件解析插件如何处理第三方依赖。

```ts
AutoImport({
  imports: ["vue"],
})

Components({
  resolvers: [ElementPlusResolver()],
})
```

最终 bundle 其实是业务 import、自动导入插件（`AutoImport`）、组件自动注册插件（`unplugin-vue-components`）、构建配置与 external 配置共同作用的结果。这也解释了为什么 external `element-plus` 时，不能只看业务代码有没有写 `import`，还要看插件层有没有继续把它拉进来。

## 三、优化优先级：先看高占比第三方库

treemap 最大价值不是告诉你“项目很大”，而是明确指出先后顺序：先看 `element-plus`、`echarts` 这类高占比依赖，再看自己的业务块。如果误以为是页面写太多，可能会去拆半天业务代码，但分析图告诉你真正值得优先动刀的是大依赖。这一步非常典型地说明了“数据驱动优化”的价值。

## 四、CDN external 的核心思路

把大依赖做成 CDN external，原理只有两步：

1. 构建时告诉打包器：这些包不要再打进产物。
2. 运行时通过 CDN 链接去加载这些资源。

它能显著减小 bundle，但代价是引入网络可用性、缓存、地域性能差异等问题。所以这不是“绝对更好”，而是某些场景下非常值得做（尤其是内网或自有 CDN 环境）。

```ts
import cdn from "vite-plugin-cdn2"

cdn({
  modules: ["vue", "vue-router"],
})
```

## 五、vite-plugin-cdn2 的价值与 external 失效排查

`vite-plugin-cdn2` 不只是往 HTML 塞一段 CDN 链接，还会同时处理 external 和全局变量映射，比手写 `external + globals` 更省事，也更容易和自动导入、自动组件注册插件协作。

但 external 后体积没明显下降，根本原因往往不是插件失效，而是还有别的链路继续把依赖拉进来。两类典型来源：

- `ElementPlusResolver()` 这类组件解析器；
- `echarts/core`、`echarts/components`、`echarts/renderers` 这类子路径导入。

external 的是包名，但项目里实际导入的可能是各种子模块路径，所以 `echarts` external 后仍可能被打包进产物。

## 六、真实的 external 优化应按环境启用

分析插件、resolver 和 CDN external 都不该永久写死在同一套构建链里：

- `visualizer({ open: true })` 只在分析体积时需要，不能每次构建都弹开；
- 生产已 external `element-plus` 后，`ElementPlusResolver` 不必再开着，否则又把包拉回 bundle；
- CDN external 更适合在生产环境开关。

最终走向是用环境变量或 `mode` 判断，把这些插件条件化启用。

```ts
export default defineConfig(({ mode }) => {
  const isProd = mode === "production"
  const isAnalyze = process.env.ANALYZE === "true"

  return {
    plugins: [
      Components({
        resolvers: isProd ? [] : [ElementPlusResolver()],
      }),
      isProd && cdn({
        modules: ["vue", "vue-demi", "vue-router", "element-plus", "echarts"],
      }),
      isAnalyze && visualizer({ open: true }),
    ].filter(Boolean),
    resolve: {
      alias: isProd
        ? {
            "echarts/core": "echarts",
            "echarts/components": "echarts",
            "echarts/renderers": "echarts",
          }
        : {},
    },
  }
})
```

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 打包提示包太大但不知是谁导致 | 只有体积警告，没有依赖分布图 | 先接 `rollup-plugin-visualizer` 看 treemap |
| external 了 `element-plus` / `echarts` 后体积仍很大 | 子路径导入或 resolver 仍在拉依赖 | 检查 `ElementPlusResolver` 和 `echarts/*` 子路径导入 |
| 生产预览能看到 CDN 资源却加载未压缩版 | CDN 默认解析没指向压缩文件 | 检查 CDN 模块配置和生成的 HTML 引用，必要时自定义 URL |
| 每次构建都自动弹分析页 | `visualizer` 永久 `open: true` | 用环境变量把分析模式单独开关 |
| external 在开发环境也生效导致本地不便 | 没按环境区分插件和 resolver | 通过 `mode` 或环境变量做条件启用 |
| 外链资源加载失败页面异常 | external 依赖运行时完全依赖 CDN | 评估网络/自有 CDN/内网部署，必要时保留本地方案 |
| `echarts` external 后仍被打包 | 业务用了 `echarts/core` 等子路径 | 用 alias 或统一导入策略把这些路径收口 |

## 延伸阅读

- 上一篇：[生产构建预览与 PWA 离线验证](01-生产构建预览与PWA离线验证.md)
- 下一篇：[按环境切换构建配置与暗黑模式修复](03-按环境切换构建配置与暗黑模式修复.md)
- 相关：[rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer)、[vite-plugin-cdn2](https://www.npmjs.com/package/vite-plugin-cdn2)、[Vite 构建指南](https://cn.vite.dev/guide/build.html)
