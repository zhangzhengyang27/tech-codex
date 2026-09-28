---
title: 宿主项目指令自动导入：directives导出扩展、unplugin-resolver接入与页面回归验证
description: "这一节在“导出组件库 Vite 接入配置”之后，继续把自动导入能力从组件和 hooks 扩展到 directives：在组件库里把每条指令单独导出，而不只保留统一的 setupDirectives(app) 入口；在宿主 unplugin-vue-components resolver 中增加 directive 分支，让页面里的指令也能按统一规则被自动解析。到这里，组件库的“自动接入能力”终于从组件、hooks 扩展到了指令，宿主接入协议开始更完整。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 宿主项目指令自动导入：directives 导出扩展、unplugin resolver 接入与页面回归验证

## 概述

这一节在“导出组件库 Vite 接入配置”之后，继续把自动导入能力从组件和 hooks 扩展到 directives：在组件库里把每条指令单独导出，而不只保留统一的 `setupDirectives(app)` 入口；在宿主 `unplugin-vue-components` resolver 中增加 `directive` 分支，让页面里的指令也能按统一规则被自动解析。到这里，组件库的“自动接入能力”终于从组件、hooks 扩展到了指令，宿主接入协议开始更完整。

## 学习目标

- 理解想做指令自动导入，必须先单独导出每条指令
- 指令自动导入用 `type: 'directive'` 单独 resolver，与组件区分
- 指令单独导出仍走自动化脚本，避免与真实目录漂移
- 给指令建立统一前缀 `VPDirectiveXxx`
- 脚本对指令文件名做规范化（去短横线、首字母大写）
- 理解 components resolver 与 directive resolver 职责严格分开
- 接齐后暴露的更多是组件库源码质量问题

---

## 一、directives 只靠 setupDirectives 无法接入自动导入

参考 `unplugin-vue-components` 官方对 UI 库 resolver 的实现，发现像 Element Plus 方案里 directive 也能 resolver。但组件库当前只有统一的 `setupDirectives(app)` 入口，没有把每条指令作为单独公共成员导出，会导致宿主能整体安装所有指令，却没法让工具按“单条指令名”去自动解析。所以第一步不是写宿主配置，而是先把组件库内部 directives 导出形态改造掉。

```text
统一入口
  setupDirectives(app)

自动导入前置要求
  需要单独导出 Copy / Flash / ...
```

## 二、指令自动导入用 type:'directive' 单独 resolver

参考 Element Plus resolver 写法后发现：resolver 不只处理组件，也能处理 directive。宿主侧自动导入配置不应沿用“组件那一套”硬套，而要给指令单独一段规则。它本质仍是判断名字、返回 `{ name, from }`，只是语义从“组件标签”切到“指令名字”。

```ts
Components({
  resolvers: [
    {
      type: 'directive',
      resolve: (name) => {
        // ...
      },
    },
  ],
})
```

## 三、指令单独导出仍走自动化脚本

没有去手动写每条 `export { default as Copy } from './directives/modules/copy'`，而是继续沿用已扩展的自动化脚本。脚本已掌握目录遍历、规则识别、统一入口写回，现在只是把扫描范围从 `components` 扩展到 `directives/modules`。组件库工程里最怕“组件、hooks 自动化了，directives 又回到手写”，统一走脚本才能保证未来扩展不漂移。

```text
脚本继续扩展：
  扫描 directives/modules
  识别 .ts
  生成 import
  生成 export
```

## 四、给指令建立统一前缀 VPDirectiveXxx

给 directive 建立清晰命名策略：`VPDirectiveCopy`、`VPDirectiveFlash`。意义类似组件前缀但更强：先表明属于当前组件库，再表明属于 directive，最后表明具体哪条指令。相比只叫 `Copy`、`Flash`，结构化命名更适合工具解析。指令命名比组件命名更容易和普通函数、变量撞上，所以结构化前缀更重要。

```js
const directiveName = `${componentPrefix}Directive${normalizedBaseName}`
```

## 五、脚本对指令文件名做规范化转换

指令文件名不一定天然适合作为 JS 导出名，可能是 `copy.ts`、`flash.ts`、`click-outside.ts`。直接拿文件名拼导出名，结果可能不符合可读性要求。脚本要做一层规范化：去掉短横线、做首字母大写、再拼统一前缀。这是“文件系统命名 -> 公共 API 命名”的转换层，规则建立后新增指令会很顺。

```js
const normalizedBaseName = baseName
  .replace(/-([a-z])/g, (_, c) => c.toUpperCase())
  .replace(/^[a-z]/, (c) => c.toUpperCase())
```

## 六、components resolver 与 directive resolver 职责分开

扩展宿主 `vite.config.ts` 时，不是推翻前面那套组件 resolver，而是在它旁边增加新的指令 resolver。自动导入体系到这时已形成三层：组件 `VP*`、hooks `use*`、directives `VPDirective*`。这三条线虽都服务“更少手写 import”，但本质是不同的命名和解析通道，不要混成一个模糊概念。

```text
自动接入体系
  组件      -> Components resolver
  hooks     -> AutoImport imports
  directives -> Components directive resolver
```

## 七、接齐后暴露的是组件库源码质量问题

接回后某些逻辑仍报错，恰恰说明好现象：接入协议已越来越完整，剩下的问题开始更多来自组件库源码自身，比如 `useMenu` 对 `route` 的判断、某些 composable 漏导入、指令或组件内部默认假设不成立。宿主接入链路越完善，暴露出的越像“真实源码质量问题”，这比一开始“配置都还没通”更有价值，已经进入组件库质量打磨阶段。

## 八、自动接入边界扩展到指令是这一节的核心价值

这一节真正的价值，不只是让复制和打字机指令页面回来，而是证明组件库的自动接入边界已从“组件和 hooks”进一步扩展到了“指令”。

课程最后验证的是复制指令页面、Flash / 打字机页面是否正常工作。如果这些页面回来了，就说明指令导出、指令命名、directive resolver、宿主自动接入这条链都基本通了。

这让组件、hooks、types、i18n、directives 这些能力到这里基本形成了一套统一接入协议。指令页面回归成功，本质上是在验证这套协议的完整性。到这一步，组件库已经不只是能不能导出，而是能不能像原模板一样自然使用。

这也是组件库从“可发布包”迈向“可复用平台模块”的最后一块拼图。指令自动导入接齐之后，宿主项目的接入协议才算真正完整。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 指令页面失效但组件页面正常 | 宿主没调用 setupDirectives(app)，或还没建自动解析链路 | 先补 setupDirectives(app)，再扩展 directive resolver |
| 组件 resolver 工作了，指令仍不会自动导入 | 只配了组件规则，没有单独的 directive 类型 resolver | 在 Components() 里补一个 type:'directive' 的 resolver |
| 指令文件能被扫描但导出名很怪或冲突 | 文件名没经过统一格式化，公共 API 命名不稳定 | 先做短横线去除和首字母大写，再统一拼前缀 |
| 页面还是报某些逻辑错误 | 暴露的更可能是组件库源码自己的问题 | 回到组件库修 composable / directive / route 判断逻辑，再重建验证 |
| 指令自动导入后仍有缓存问题 | 组件库 dist、宿主 .vite、自动生成 d.ts 不同步 | 重新 build、清理缓存、重启宿主 dev |

## 延伸阅读

- 上一篇：[组件库 Vite 插件配置导出](06-组件库Vite插件配置导出：setupDirectives补链、auto-import封装与components-resolver生成.md)
- 下一篇：[组件库 Vite 接入模块打包](08-组件库Vite接入模块打包：vite-plugin产物导出、NodeNext配置与宿主最终闭环.md)
- 相关：[unplugin-vue-components](https://github.com/unplugin/unplugin-vue-components)
- 相关：[Vue Custom Directives](https://vuejs.org/guide/reusability/custom-directives.html)
