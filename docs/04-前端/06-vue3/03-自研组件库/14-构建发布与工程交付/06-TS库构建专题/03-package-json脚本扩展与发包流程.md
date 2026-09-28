---
title: package-json脚本扩展与发包流程
description: "这一节从 Electron 打包链路切回「TypeScript 库模板项目的工程脚本扩展」。课程主线包含四部分：给 package.json 增加 lint / lint:fix；用 simple-git-hooks + lint-staged 在提交前自动修复；用 tsx 增加 TypeScript 运行时脚本；增加发包脚本并切换 npm 源。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# package.json 脚本扩展与发包流程

## 概述

这一节从 Electron 打包链路切回「TypeScript 库模板项目的工程脚本扩展」。课程主线包含四部分：给 package.json 增加 lint / lint:fix；用 simple-git-hooks + lint-staged 在提交前自动修复；用 tsx 增加 TypeScript 运行时脚本；增加发包脚本并切换 npm 源。整理时对照当前官方资料做了几处关键修正：lint-staged 最适合直接执行「只针对 staged 文件」的命令；自定义脚本不要命名成 publish，因为它是 npm / pnpm 生命周期脚本名；正式发包比起 nrm 手动切源，更稳妥的是 publishConfig.registry、显式 --registry 或 CI 里用 Trusted Publishing。

## 学习目标

- 把 lint / lint:fix 作为可复用命令，统一团队校验入口
- 用 lint-staged 只处理暂存区文件，提升提交前校验的性能与可控性
- 用 simple-git-hooks 把校验挂到 pre-commit，理解它只是触发器
- 区分 .gitignore 与 ESLint 忽略规则服务的不同工具层
- 用 tsx 提供开发期运行入口，并规范 release 发包脚本与 registry 配置

---

## 一、lint / lint:fix：把质量校验变成可复用命令

课程第一步是在 package.json 补齐 lint 相关脚本。价值在于统一团队执行入口、让 IDE / Git Hooks / CI 复用同一套命令、把代码规范从「约定」变成「可执行规则」。最常见的两类脚本是 lint（只检查不改代码）和 lint:fix（自动修复可修复的问题）。

```json
{
  "scripts": {
    "lint": "eslint . --ext .js,.ts",
    "lint:fix": "eslint . --ext .js,.ts --fix"
  }
}
```

如果项目已切到 ESLint 9 的 Flat Config，很多时候直接写 `eslint .` 即可，不一定还要依赖 --ext。lint:fix 只能修复可自动修复的问题，类型设计错误、业务逻辑错误仍需人工处理。

## 二、lint-staged：只处理暂存区文件

lint-staged 的核心价值不只是「自动执行」，而是「只处理 Git 暂存区里的文件」。这和直接跑全量 lint:fix 差别很大：只修复当前提交涉及的文件、速度更快、不会顺手改动无关代码、能减少合并冲突。这也是它常和 Git Hooks 组合使用的根本原因。

```json
{
  "lint-staged": {
    "*.{js,ts}": "eslint --fix"
  }
}
```

lint-staged 会把 staged 文件路径追加到命令后面，所以最适合写成 `eslint --fix` 这种「接收文件列表」的命令。如果把它配置成 `pnpm lint:fix` 而 lint:fix 又是全项目扫描，就失去了 staged 优化的意义。lint-staged 现在会自动重新暂存修改过的文件，不需要再手动 git add。

## 三、simple-git-hooks：挂接 Git 生命周期的触发器

simple-git-hooks 配置轻量、可直接写进 package.json、不需要额外脚本目录就能挂钩 Git hooks。它负责「在什么时候执行」——pre-commit、commit-msg、pre-push；但它不负责「执行什么逻辑」，真正执行校验的仍是 lint-staged / eslint / test。通常用 prepare 脚本在安装依赖后自动初始化 hooks，但修改 package.json 中 hooks 配置后，仍应显式重新执行 npx simple-git-hooks 来应用变更。

```json
{
  "scripts": {
    "prepare": "simple-git-hooks"
  },
  "simple-git-hooks": {
    "pre-commit": "npx lint-staged"
  }
}
```

如果项目根本不是 Git 仓库，这套流程不会生效。

## 四、.gitignore 与 ESLint 忽略是两回事

课程同时提到 .gitignore 和 .eslintignore，这一步对初学者很重要。.gitignore 告诉 Git 哪些文件不纳入版本控制（如 node_modules、dist、系统缓存）；ESLint 忽略规则告诉 ESLint 哪些文件不参与 lint（如构建产物、依赖目录、自动生成代码）。两者都叫 ignore，但服务对象不是同一层。

```gitignore
node_modules
dist
.DS_Store
```

```js
// eslint.config.js（Flat Config）
import { globalIgnores } from 'eslint/config'

export default [
  globalIgnores(['dist/**', 'node_modules/**']),
]
```

如果项目已迁移到 ESLint Flat Config，新项目应优先用 eslint.config.js 里的 ignores 或 globalIgnores()；「Git 不提交」和「ESLint 不检查」没有必然关系，不能只配一个就以为另一个也生效。

## 五、tsx：开发期直接运行 TS 的入口

课程补充 tsx，目的是让 TypeScript 项目在不先构建的情况下直接运行入口文件，适合调试库的运行结果、验证 CLI 脚本、快速试跑 src/index.ts。相比「先编译再执行」体验更轻量。

```json
{
  "scripts": {
    "start": "tsx src/index.ts",
    "dev": "tsx watch src/index.ts"
  }
}
```

tsx 适合开发期执行，不等于发布构建工具；它解决的是「怎么跑起来」，不是「怎么产出 npm 包」。如果项目是库而不是 CLI，start 只是调试辅助，不一定是最终对外能力的一部分。

## 六、自定义发包脚本别叫 publish

课程演示过一个坑：自己在 scripts 里写了一个 publish，又执行 pnpm publish，结果触发了生命周期脚本导致行为冲突。npm 官方明确列出了 prepare、prepublishOnly、publish、postpublish 等生命周期脚本，所以自定义发包命令更适合叫 release，真正发布时再执行 npm publish / pnpm publish。

```json
{
  "scripts": {
    "release": "npm publish --registry=https://registry.npmjs.org/"
  }
}
```

更清晰的做法是：自定义脚本叫 release，生命周期脚本保持 npm 语义。如果已有 prepublishOnly 等生命周期校验脚本，再叠加自定义 publish，行为会更难读懂。

## 七、切源用 publishConfig / CI，以及脚本标准化的价值

课程里通过 nrm use npm 再 npm publish，这是能工作的历史方案，适合本地手动发包，但不是唯一也不一定是长期最稳妥的。当前更推荐：在 package.json 配置 publishConfig.registry、命令里直接 npm publish --registry=...、或在 CI 中使用 npm Trusted Publishing 减少长期持有 token 的风险。

```json
{
  "scripts": {
    "release": "npm publish --registry=https://registry.npmjs.org/"
  },
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

publishConfig.registry 是项目级声明，迁移和协作比全局 nrm 状态更稳。最后一节的本质是补齐「模板项目可直接使用」的工程入口：lint / lint:fix 做规范校验，start / dev 做本地执行与调试，prepare 初始化 hooks，release 做正式发包。脚本越清晰团队越容易形成共同约定，但也不要越写越重——高质量模板是「默认够用、扩展清晰」。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 提交前执行 lint 太慢 | pre-commit 直接绑全量 lint:fix | 改用 simple-git-hooks + lint-staged 只处理 staged 文件 |
| lint-staged 没达到性能优化 | 任务里又调用全量扫描脚本 | 在 lint-staged 中直接写 eslint --fix |
| 改了 simple-git-hooks 配置没生效 | 只改 package.json 没重新应用 | 重新执行 npx simple-git-hooks |
| .gitignore 配好但 ESLint 还扫 dist | Git 忽略和 ESLint 忽略不是一回事 | 在 ESLint 配置里单独加忽略规则 |
| 新项目 .eslintignore 不对劲 | 项目已用 Flat Config | 改用 eslint.config.js 的 ignores / globalIgnores |
| pnpm publish 时行为异常 | 自己定义了 publish 脚本与生命周期冲突 | 把自定义脚本改名 release |
| 本地发包失败提示未登录 | 当前机器没有 npm 登录态 | 先 npm login，或改用 CI 自动发包 |
| 发布还要手动切源很麻烦 | 依赖全局 nrm 状态 | 用 publishConfig.registry 或 --registry |

## 延伸阅读

- 上一篇：[tsup 实战：零配置打包与工程初始化](02-tsup实战：零配置打包与工程初始化.md)
- 下一篇：[unbuild 实战：Rollup 级配置与 stub 模式](04-unbuild实战：Rollup级配置与stub模式.md)
- 相关：[simple-git-hooks](https://github.com/toplenboren/simple-git-hooks)
- 相关：[lint-staged](https://github.com/lint-staged/lint-staged)
- 相关：[TSX](https://tsx.is/)
- 相关：[npm scripts 生命周期](https://docs.npmjs.com/cli/v10/using-npm/scripts/)
- 相关：[npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
