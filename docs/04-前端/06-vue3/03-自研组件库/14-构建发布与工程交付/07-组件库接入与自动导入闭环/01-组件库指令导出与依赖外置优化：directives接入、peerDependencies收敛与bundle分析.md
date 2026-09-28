---
title: 组件库指令导出与依赖外置优化：directives接入、peerDependencies收敛与bundle分析
description: "组件、hooks、types、i18n 这些主链路打通之后，组件库的“公共能力面”还需要继续扩展。这一节把 directives 作为正式公共能力导出、把 video.js / vditor / vue-echarts 等大依赖从产物里 external 掉并收进 peerDependencies、用 bundle 可视化工具实际验证 external 是否生效。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 组件库指令导出与依赖外置优化：directives 接入、peerDependencies 收敛与 bundle 分析

## 概述

组件、hooks、types、i18n 这些主链路打通之后，组件库的“公共能力面”还需要继续扩展。这一节做三件事：把 `directives` 作为正式公共能力导出、把 `video.js`/`vditor`/`vue-echarts` 这类大依赖从产物里 external 掉并收进 `peerDependencies`、用 bundle 可视化工具实际验证 external 是否生效。真正要建立的工程意识是：组件库不只是组件集合，还包括指令、插件能力，以及一套能持续收敛体积的依赖边界策略。

## 学习目标

- 把 `directives` 与 components、hooks、types 一样当作组件库正式对外暴露的能力
- 用统一的 `setupDirectives(app)` 入口暴露指令，而不是让使用者逐条手动安装
- 协同调整 `package.json`（peer 归属）、`rollupOptions.external`、Playground（补齐依赖）完成大依赖外置
- 用 `rollup-plugin-visualizer` 看清谁在变大、谁已被剥离，验证 external 成效
- 按真实使用场景选择 external 粒度，而不是盲目追求最小包体积

---

## 一、directives 与组件一样，是可被正式对外暴露的公共能力

组件库的公共 API 不止 `.vue` 组件、hooks、types、i18n，还应该包含可复用指令：权限指令、点击外部、复制、滚动、懒加载等。一旦决定对外暴露，指令就应作为正式 API 来维护。不是所有内部指令都值得公开，但值得公开的那部分应明确挂进入口。这一节本质是在扩大组件库的“可复用能力面”。

```text
组件库公共 API
  -> components
  -> hooks
  -> types
  -> i18n
  -> directives
```

## 二、用 setupDirectives(app) 统一暴露指令入口

与其把每条指令单独导出、让用户逐个注册，不如沿用指令目录原有的统一入口 `setupDirectives(app)`。这与组件库插件的“统一安装”思路一致，消费方接入更简单，指令内部如何组织也不暴露给外部。

```ts
import { setupDirectives } from './directives'

export { setupDirectives }
```

指令系统和组件系统不同，不一定非要被纳入默认的全局组件插件。把它和组件注册逻辑分开，是清晰的边界设计。

## 三、utils 是否导出，取决于是否值得成为公共 API

很多 `utils` 技术上可以导出，但它们往往是为当前组件内部定制的辅助函数，并不具备稳定、通用、可长期维护的公共语义。组件库公共 API 要尽量克制，导出越多，后续兼容性负担越大。保留 `utils` 为内部实现，是成熟的边界选择。

```text
可以导出
  !=
值得成为公共 API
```

## 四、外置大依赖要 package.json、external、Playground 三者协同

把大依赖从组件库包里挪出去、让宿主项目安装，关键不是“把包名移动到另一个字段”，而是三件事必须配套：`package.json` 依赖归属调整、`rollupOptions.external` 配置 external、Playground/宿主项目补齐 peer 依赖。少一步都不行——只改 `peerDependencies` 不 external，产物仍会被打进去；只 external 不让宿主安装，运行时就会缺模块。

```text
外置依赖链路
  -> 调整 package.json
  -> 调整 external
  -> Playground/宿主补齐依赖
```

## 五、优先评估 external 的偏场景化大依赖

`vditor`、`video.js`、`vue-echarts`、`echarts` 这类库的共同特点是体积大、不是所有使用者都会用到、往往只有单个组件才依赖它们。从组件库设计角度，它们通常都值得优先审视是否 external。

```ts
build: {
  rollupOptions: {
    external: [
      'element-plus',
      'echarts',
      'vue-echarts',
      'video.js',
      'vditor',
    ],
  },
}
```

“大依赖一定 external”并不是金科玉律。若组件库主要服务某个固定桌面端项目，内置依赖反而更省心。external 策略要跟真实使用场景匹配。

## 六、用 Playground 验证 external 后的真实消费链路

external 完依赖后，紧接着回到 Playground 安装这些 peer 依赖，并实际验证图表、音视频、富文本等组件是否还能工作。external 策略的正确性不能只靠看 `dist` 体积判断，真正标准是：宿主项目补齐依赖后能否稳定使用。Playground 在这里是“peer 依赖补齐后的真实消费方验证器”，不是简单预览页。

## 七、用 bundle 可视化看清体积来源，按场景定 external 粒度

`rollup-plugin-visualizer` 的价值不是出一张好看的图，而是帮你判断哪些依赖值得 external、哪些模块是包体积主要来源。注意当前官方主线已是 ESM-only 并要求 Node >= 22，本地环境较低时需要锁定兼容版本或升级 Node。

```ts
import { visualizer } from 'rollup-plugin-visualizer'

const isAnalyze = process.env.ANALYZE === 'true'

export default defineConfig({
  plugins: [
    isAnalyze && visualizer(),
  ].filter(Boolean),
})
```

包体积越小不一定越好，关键看 external 粒度是否匹配真实使用场景：宿主接入成本、运行环境一致性同样重要。最复杂、依赖最重的组件（echarts、audio、video、editor）都能在 Playground 跑通，依赖边界才算基本成立。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 组件、hooks、types 都能用，但指令系统完全没反应 | 入口没导出 `setupDirectives` 这类统一指令入口 | 在主入口显式导出指令安装函数 |
| 把依赖挪到 peerDependencies 后 Playground 直接跑不起来 | 只改了组件库，没在宿主补齐 peer 依赖 | 在 Playground 安装对应依赖再验证 |
| external 之后包变小了，但某些复杂组件失效 | external 链路没闭环，宿主缺依赖或运行时条件没补上 | 回到 Playground 用真实组件逐个验证 |
| rollup-plugin-visualizer 装完跑不起来 | 当前版本要求 ESM-only 和 Node >= 22，与本地环境不兼容 | 锁定兼容版本或升级 Node 环境 |
| 想把所有依赖都 external 掉 | 包体积最小但宿主接入成本显著上升 | 按项目场景决定 external 粒度，不要一刀切 |

## 延伸阅读

- 上一篇：[unbuild 实战：Rollup 级配置与 stub 模式](../06-TS库构建专题/04-unbuild实战：Rollup级配置与stub模式.md)
- 下一篇：[模板项目回切组件库包](02-模板项目回切组件库包：pnpm-link联调、入口替换与auto-import缺失排查.md)
- 相关：[Vue Plugins 官方文档](https://vuejs.org/guide/reusability/plugins)
- 相关：[Vite Library Mode](https://vite.dev/guide/build.html)
- 相关：[rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer)
