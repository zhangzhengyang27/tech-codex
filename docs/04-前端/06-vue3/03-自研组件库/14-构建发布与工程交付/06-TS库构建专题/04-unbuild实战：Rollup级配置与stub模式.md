---
title: unbuild实战：Rollup级配置与stub模式
description: "这一节是上一节 tsup 实战的自然延伸，重点不是「换一个命令名」，而是理解为什么有些项目会从 tsup 转向 unbuild。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# unbuild 实战：Rollup 级配置与 stub 模式

## 概述

这一节是上一节 tsup 实战的自然延伸，重点不是「换一个命令名」，而是理解为什么有些项目会从 tsup 转向 unbuild。unbuild 明确强调自己是 Rollup-based bundler，对底层 Rollup 配置暴露更直接，同时提供 --stub 这种更偏开发调试的能力。关键校正有几处：unbuild --stub 本质是让 dist 产物改由 jiti 直接加载源码而非持续重打包；node --watch-path 不是「Node 18 以上都通用」，官方文档明确它从 v18.11.0 / v16.19.0 引入且只支持 macOS 和 Windows；官方推荐在 package.json 配 prepack: "unbuild" 作为发布前兜底。

## 学习目标

- 理解 unbuild 与 tsup 的差异在于底层控制力度，而非谁更高级
- 用 build.config.ts 承载可维护的工程化配置
- 掌握 entries / outDir / declaration 三项基础配置
- 通过 rollup 选项透传底层 esbuild minify、emitCJS 等能力
- 理解 --stub 借助 jiti 运行时加载源码、node --watch-path 的平台限制，以及 prepack 兜底

---

## 一、unbuild 与 tsup 不是谁更高级

课程拿 tsup 和 unbuild 做对比，核心不是跑分也不是功能堆叠，而是「控制层级」的差别。从官方定位看：tsup 更偏向零配置、快速起步，底层主要围绕 esbuild；unbuild 明确是 Rollup-based bundler，生成 ESM / CJS / 类型产物，同时提供 --stub 这类偏开发调试的能力。所以课程不是否定 tsup，而是在说：当你只需要快速出产物时 tsup 很顺手；当你需要更深入干预 Rollup、入口、产物行为时，unbuild 的可调空间通常更大。工具选择的第一优先级仍然是「是否匹配项目目标」。

## 二、配置写在 build.config.ts

官方 README 说明可以在 package.json 的 unbuild 字段写配置，也可以创建 build.config.{js,cjs,mjs,ts,...}。课程选择 build.config.ts 是合理的：结构更清晰、更适合多人协作、更自然书写复杂配置。

```ts
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['./src/index'],
  declaration: true,
  outDir: 'dist',
})
```

如果没有显式写 entries，unbuild 会尝试从 package.json 推断；对教学或模板项目，显式写出 entries 往往更适合学习和排错。build.config.ts 的价值不只是能写更多配置，更在于配置意图更清晰。

## 三、entries / outDir / declaration 三项基础配置

课程保留的最常用三项分别解决：从哪里开始构建、产物输出到哪里、是否生成类型声明文件。

```ts
export default defineBuildConfig({
  entries: ['./src/index'],
  outDir: 'dist',
  declaration: true,
})
```

outDir 默认就是 dist，显式写出来主要增强可读性；declaration: true 适合库项目，如果只是内部调试脚本不一定非开不可；入口一旦变成多入口就需要重新构建，不能只靠 stub 动态感知。

## 四、unbuild 对 Rollup 暴露更直接

unbuild 的配置思路允许你更自然把底层 bundler 配置透传进去，官方示例里就有 rollup.esbuild.minify。课程里的 emitCJS 也属于这类「更接近构建器底层行为」的选项。

```ts
export default defineBuildConfig({
  entries: ['./src/index'],
  declaration: true,
  outDir: 'dist',
  clean: true,
  rollup: {
    emitCJS: true,
    esbuild: {
      minify: true,
    },
  },
})
```

clean: true 每次构建前清理旧产物；rollup.emitCJS: true 输出 CommonJS 相关产物；rollup.esbuild.minify: true 用底层 esbuild 压缩代码。真正要掌握的不是记住某个字段，而是理解 unbuild 的 rollup 选项就是你的底层调优入口；压缩通常更适合正式构建，不一定适合调试态输出。

## 五、--stub 模式：用 jiti 运行时加载源码

--stub 的关键价值不在「更快构建」，而在「开发调试时不必频繁重新打包」。官方描述为：Stub dist once powered by jiti, without needing to watch and rebuild during development。它本质不是传统 watch build，而是先生成一份可用的 dist 外壳，这个外壳在运行时再去加载源码，源码变化时不需要每次都重新 build。

```json
{
  "scripts": {
    "build": "unbuild",
    "build:dev": "unbuild --stub"
  }
}
```

它之所以能工作，是因为 dist 里的入口不再是纯编译产物，而是通过 jiti 在运行时直接加载源码。这里「自动反映变化」不是文件系统魔法，而是运行时重新读取源码——jiti 不是打包器，而是运行时 loader / 执行辅助层。所以 --stub 解决的是「源码变了还要不要重打包」，不是「入口结构变了还要不要重构建」；多入口、类型产物变化、导出结构变化时，通常仍需重新执行正式构建。它更适合本地联调，不是正式发布产物的构建方式。

## 六、node --watch-path 有明确平台限制

课程把 unbuild --stub 和 Node watch 模式结合，形成更丝滑的本地调试命令。但 Node 官方 CLI 文档说明：--watch-path 从 v18.11.0 / v16.19.0 引入、使用它会隐式开启 --watch、且只支持 macOS 和 Windows，Linux 上会抛出 ERR_FEATURE_UNAVAILABLE_ON_PLATFORM。所以它不是「Node 18+ 通用能力」，而是带平台约束的能力。

```json
{
  "scripts": {
    "dev": "node --watch-path=src dist/index.mjs"
  },
  "engines": {
    "node": ">=18.11.0"
  }
}
```

如果真依赖 --watch-path，engines.node 更严谨的下限应是 >=18.11.0 而非笼统的 >=18.0.0；Linux 开发环境这条命令不一定可用，团队成员平台混杂时最好在 README 写清限制。

## 七、prepack 是发布前保障

官方 README 示例里有两个关键脚本：build: "unbuild" 和 prepack: "unbuild"。含义是平时可手工 pnpm build，真正准备打包 / 发布时 npm 生命周期会再执行一次构建，这比「人工记得先 build 再发包」更稳定。

```json
{
  "scripts": {
    "build": "unbuild",
    "prepack": "unbuild"
  }
}
```

正式发包建议走正式构建，不要把 --stub 产物当发布结果；prepack 很适合作为发布安全网。构建命令、包入口声明、发布前构建保障要一起设计，不能只盯着 bundler 本身。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 改了源码没重新 build，执行 dist/index.mjs 仍生效 | 跑的是 unbuild --stub 产物，dist 入口通过 jiti 读源码 | 这是 stub 的预期行为，不是构建没生效 |
| 新增入口文件但 dist 没有对应新入口 | stub 不会自动推导新入口结构 | 更新 entries 后重新正式构建或重跑 --stub |
| 用 node --watch-path 但 Linux 报错 | 官方说明 --watch-path 只支持 macOS 和 Windows | Linux 改用其他 watch 方案，或只在支持平台使用 |
| engines.node >=18.0.0 但 --watch-path 不可用 | 该能力从 v18.11.0 才引入 | 依赖这条能力就把下限提高到 >=18.11.0 |
| 用了 unbuild 还要配 exports / main / types | 构建工具只负责产物，包入口声明仍需自己提供 | 在 package.json 显式声明消费入口 |
| 想要更底层 CJS / Rollup 行为但 tsup 不顺手 | 项目对底层 bundler 控制要求更高 | 改用 unbuild 并在 rollup 选项里配置 |
| 正式发包用了 --stub 产物 | 把开发调试模式误当正式发布模式 | 正式发包用 unbuild，并结合 prepack 兜底 |

## 延伸阅读

- 上一篇：[package.json 脚本扩展与发包流程](03-package-json脚本扩展与发包流程.md)
- 下一篇：[组件库指令导出与依赖外置优化](../07-组件库接入与自动导入闭环/01-组件库指令导出与依赖外置优化：directives接入、peerDependencies收敛与bundle分析.md)
- 相关：[unbuild 官方仓库](https://github.com/unjs/unbuild)
- 相关：[Node.js CLI 文档：--watch-path](https://nodejs.org/download/release/v22.18.0/docs/api/cli.html#--watch-path)
