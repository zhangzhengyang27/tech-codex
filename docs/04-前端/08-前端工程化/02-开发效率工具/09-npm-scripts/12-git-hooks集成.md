---
title: git-hooks集成
description: "Git Hooks 是 Git 提供的一种钩子机制，允许我们在 commit、push 等操作之前或之后执行自定义脚本。在团队协作中，利用 Git Hooks 可以在代码提交前自动执行代码风格检查和单元测试，从而有效保障代码质量。"
keywords: [git-hooks集成, husky, lint-staged]
category: tools
tags: [npm scripts, 工程化, 自动化]
---


# git-hooks集成

Git Hooks 是 Git 提供的一种钩子机制，允许我们在 `commit`、`push` 等操作之前或之后执行自定义脚本。在团队协作中，利用 Git Hooks 可以在代码提交前自动执行代码风格检查和单元测试，从而有效保障代码质量。

虽然 IDE 内置的检查工具对个人开发者来说足够，但在团队项目中，强制性的代码检查能避免"破窗效应"，防止代码质量持续下降。

本节将介绍如何使用 `husky` 和 `lint-staged` 这两个工具，将 `npm script` 与 Git Hooks 结合，打造自动化的代码检查工作流。

## 为什么要把 Lint 放到本地？

代码风格检查（Code Linting）是保障代码规范一致性的重要手段，好处有：

1. 更少的 Bug
2. 更高的开发效率，Lint 很容易发现低级的、显而易见的错误
3. 更高的可读性

很多团队把 `lint` 校验放在持续集成（CI）阶段，流程是：`代码提交 --> 跑 CI 发现问题(远程) --> 本地修复 --> 重新提交 --> 通过检查`。

但 CI 往往不只是做 Lint，还有很多其它任务（如打包、上传 CDN 等），这导致发现问题往往需要几分钟，甚至有时你根本没发现 CI 没有跑通过。

**最有效的解决方案**：将 Lint 校验放到**本地**，使用 husky（或 pre-commit）在本地提交之前先做一次校验，这样能立刻收到反馈，避免反复等待远程 CI。

## 1. 安装与初始化（husky v9 推荐）

首先安装 `husky` 和 `lint-staged`：

```bash
npm install husky lint-staged --save-dev
npx husky init
```

`npx husky init` 会完成以下工作：

- 创建 `.husky/` 目录，并生成示例 `pre-commit` 钩子
- 在 `package.json` 中添加 `"prepare": "husky"` 脚本（确保团队成员 `npm install` 后自动启用钩子）

> **版本说明**：husky v9（2024+）使用 `.husky/` 目录管理钩子文件，不再在 `package.json` 的 `scripts` 中定义 `precommit`/`prepush`。如果你使用的是旧版 husky（v4），配置方式完全不同（见下文「旧版 husky v4 对比」），建议升级。

## 2. 配置 Git Hooks

### 创建 pre-commit 钩子

编辑 `.husky/pre-commit` 文件：

```bash
# .husky/pre-commit
npx lint-staged
```

### 创建 pre-push 钩子

```bash
# .husky/pre-push
npm test
```

这样，每次提交代码前都会自动执行 `lint-staged`，每次推送前都会运行单元测试。如果检查失败，对应的 Git 操作将被中止。

### 配置 lint-staged

在 `package.json` 中添加 `lint-staged` 配置（也可使用独立的 `.lintstagedrc` 文件）：

```json
{
  "lint-staged": {
    "*.js": "eslint --fix",
    "*.css": "stylelint --fix",
    "*.{json,md}": "prettier --write"
  }
}
```

`lint-staged` 仅对暂存区（staged）中匹配的文件执行命令，避免全量 lint 带来的耗时问题。

## 3. 测试 Git Hooks

故意在某个 `js` 文件中引入一个 `eslint` 错误，然后执行 `git commit`。终端会输出类似信息：

```text
✔ Preparing lint-staged...
✔ Running tasks for staged files...
✖ eslint --fix [FAILED]
↓ Skipped because of errors from tasks. [SKIPPED]
✔ Reverting to original state because of errors...
✔ Cleaning up temporary files...

✖ eslint --fix:
  error: 'foo' is defined but never used (no-unused-vars)

husky - pre-commit script failed (code 1)
```

修复错误后，再次提交即可成功。同样，如果 `pre-push` 钩子中的测试失败，`push` 操作也会被中止。

## 4. 常用技巧

| 场景 | 命令 |
|------|------|
| 临时跳过钩子（紧急情况） | `git commit --no-verify` |
| 新增钩子 | 在 `.husky/` 下创建同名文件并 `chmod +x` |
| 禁用 husky（CI 环境） | 设置环境变量 `HUSKY=0` |
| 调试钩子 | 在钩子脚本开头加 `set -x` |

## 旧版 husky v4 对比（了解即可）

> 旧版 husky v4 使用 `package.json` 的 `"husky": {"hooks": {...}}` 方式配置，且 `pre-commit` 通常直接指向 `eslint` 全量校验。

```json
"husky": {
  "hooks": {
    "pre-commit": "eslint --ext .js,.vue src"
  }
}
```

**这样会有一个问题**：即使只修改了一个文件，它仍会校验所有 `src` 目录下的 `.js` 文件。或者提交自己的代码时，还需要解决他人的代码问题才能顺利提交。

而 `lint-staged` 只会校验你提交（暂存区）的那部分内容：

```json
"husky": {
  "hooks": {
    "pre-commit": "lint-staged"
  }
},
"lint-staged": {
  "src/**/*.{js,vue}": [
    "eslint --fix",
    "git add"
  ]
}
```

如上配置只会在你本地 `commit` 之前，校验你提交的内容是否符合 eslint 规则（ESLint 集成详见《TypeScript 工程化实践 · ESLint 集成》篇）。如果符合规则则提交成功；如果不符合，会自动执行 `eslint --fix` 尝试自动修复，修复成功则提交，失败则提示错误，让你修好后才能提交。

通过这种方式，可以确保提交到代码库的每一行代码都符合团队规范，从而有效提升代码质量。
