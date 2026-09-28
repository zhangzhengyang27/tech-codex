---
title: 生产构建预览与PWA离线验证
description: "组件和功能开发完成后，项目是否“能交付”并不由开发环境决定。真正的交付验证，是在生产构建产物上做一次完整预览与回归。本节从“构建 + 预览”脚本入手，处理生产模式下典型的页面切换异常，建立依赖升级闭环，并完整走通 PWA 的注册、浏览器安装入口与离线访问验证。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 生产构建预览与 PWA 离线验证

## 概述

组件和功能开发完成后，项目是否“能交付”并不由开发环境决定。真正的交付验证，是在生产构建产物上做一次完整预览与回归。本节从“构建 + 预览”脚本入手，处理生产模式下典型的页面切换异常，建立依赖升级闭环，并完整走通 PWA 的注册、浏览器安装入口与离线访问验证。

## 学习目标

- 理解为什么开发环境通过不等于生产构建通过，掌握 `build-only` 与 `preview` 的配合。
- 能把“构建 + 预览”封装成稳定的团队脚本，降低重复验证成本。
- 能对生产模式下“链接变了但视图不动”的异常，定位到布局壳层而非业务页。
- 建立“检查 -> 升级 -> 重新构建预览”的依赖升级闭环意识。
- 掌握 PWA 的三层验证（注册、安装入口、离线访问）与 `useRegisterSW()` 的落地方式。

---

## 一、从开发完成到可交付：先在生产构建结果上预览

开发模式能跑，不等于生产构建没问题。很多只在生产构建、资源压缩、路由缓存或 PWA 注册后才暴露的问题，必须在产物启动后逐页回归才能发现。

第一步不是继续改代码，而是：

- 先 `build`
- 再 `preview`
- 然后把页面挨个点一遍

```bash
pnpm build-only
pnpm preview
```

这一步是上线前最基本的验证动作，不能省。课程里强调“把所有页面都点一遍”，是非常务实的回归策略。

## 二、把构建与预览串成稳定脚本

如果终端里不方便写命令连接符，可以把“构建 + 预览”收进脚本顺序执行。Vite 初始化项目里常见的 `run-p`（并行）与 `run-s`（串行）来自 `npm-run-all`：构建和预览是严格串行关系，必须先构建完才能预览，因此更适合 `run-s`。

```json
{
  "scripts": {
    "p": "run-s build-only preview"
  }
}
```

这类脚本本身也是团队协作的一部分，能降低后续重复验证成本。

## 三、生产模式页面切换异常的排查重心

生产预览里常遇到一类典型现象：左侧菜单点击时 URL 在变，但页面突然不刷新，刷新浏览器后又正常。这通常说明路由本身是通的，问题出在路由视图承载层。

优先回到承载 `router-view` / `KeepAlive` / `Transition` 的布局壳层（例如 `src/layouts/DefaultLayout.vue`），而不是先盯某个具体业务页。经验法则：路径在变但视图不变，先查布局壳层。

## 四、替换法 / 注释法定位 router-view 多余 key

排查壳层问题时，不要只靠“盯代码看”，先做最小化回退验证更快：

1. 暂时去掉 `KeepAlive` 或动态组件包装，直接改成最普通的 `<router-view />`。
2. 重新构建和预览，观察现象是否消失。
3. 回退并逐步恢复代码，缩小范围。

最终定位到的问题是：`router-view` 上不需要额外挂那个 `key`。去掉之后动画仍然可用、`KeepAlive` 缓存也还在，但页面切换卡死的现象消失。这说明很多“看起来像必需”的属性，在复杂组合里反而可能是触发 bug 的来源。

```vue
<!-- 更简单的回退验证 -->
<router-view />
```

## 五、依赖升级要形成闭环

打包验证通过后，紧接着做的一件工程化动作是检查依赖是否需要升级。这不是“可做可不做”，因为刚建立的生产验证流程，正是升级后再验证的最好时机。

做法：跑依赖检查工具 -> 更新能安全升级的小版本 -> 构建预览再跑一遍。同时要谨慎对待版本升级：某些包（如 `UnoCSS` 这类生态插件链很长的依赖）不能随意升，大版本和生态兼容项要格外小心。核心是“升级之后必须重新构建验证”，而不是“全部升到最新”。

```bash
npm-check -u
# 或使用 ncu -u / npm-check-updates
```

## 六、PWA 验证三层与 useRegisterSW 落地

PWA 不是只写一个注册脚本就结束，要完整走三轮验证：

1. 代码层：注册写法是否调整到新文档推荐方式。
2. 浏览器层：是否出现安装应用入口。
3. 功能层：切到 offline 后页面是否还能访问。

课程把 PWA 注册从入口页移到了 `App.vue`，改用 `useRegisterSW()` 这套组合式写法。当前官方 `vite-plugin-pwa` 针对 Vue 3 仍提供 `virtual:pwa-register/vue` 与 `useRegisterSW()`，方向一致。注意：无痕模式不一定能看到安装入口，普通浏览模式更容易看到“安装应用”按钮；Offline 测试时外网图标可能不可见，这不代表整个 PWA 失效。

```ts
import { useRegisterSW } from "virtual:pwa-register/vue"

const intervalMS = 60 * 60 * 1000

const updateServiceWorker = useRegisterSW({
  onRegistered(r) {
    r && setInterval(() => {
      r.update()
    }, intervalMS)
  },
})
```

若使用 TypeScript，记得补上 `vite-plugin-pwa/client` 或 `vite-plugin-pwa/vue` 的类型声明。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 开发环境正常，生产预览页面切不动 | 路由地址变了，但视图承载层组合出问题 | 优先排查 `DefaultLayout`、`router-view`、`KeepAlive`、`Transition` |
| 不同系统命令连接符不方便 | 直接串命令不够稳 | 用脚本统一封装，如 `run-s build-only preview` |
| 依赖升级后看起来正常但有隐患 | 只升版本没回归验证 | 每次升级后重新 `build + preview` 再做页面回归 |
| 某些依赖升不到最新 | 生态兼容或版本不存在 | 不要硬升，先核对可用版本并保留稳定版 |
| PWA 代码写了但没看到安装入口 | 可能在无痕模式验证，或 Service Worker 未激活 | 普通模式下检查浏览器安装入口，并查看 Application 面板 |
| 切到 Offline 后图标丢失 | 图标资源仍走外网，未被缓存 | 区分“资源缺失”和“PWA 失效”，继续验证核心页面是否可访问 |
| `useRegisterSW()` 导入报类型错误 | TypeScript 未补 PWA 客户端类型声明 | 补 `vite-plugin-pwa/client` 或 `vite-plugin-pwa/vue` 类型 |

## 延伸阅读

- 上一篇：[滚动文本指令配置化、无反向模式与初始抖动修复](../../13-音视频与媒体编排/15-滚动文本指令配置化、无反向模式与初始抖动修复.md)
- 下一篇：[打包体积分析与 CDN 外部化](02-打包体积分析与CDN外部化.md)
- 相关：[Vite Plugin PWA Vue 文档](https://vite-pwa-org.netlify.app/frameworks/vue)、[MDN Service Worker](https://developer.mozilla.org/zh-CN/docs/Web/API/Service_Worker_API)
