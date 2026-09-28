---
title: 运行多个npm-script
description: "在前端项目中，我们通常需要编排多个 npm script。这些任务有时需要按顺序依次执行（串行），有时则需要同时运行以提升效率（并行）。"
keywords: []
category: tools
tags: [npm scripts, 工程化, 自动化]
---


# 运行多个npm-script

在前端项目中，我们通常需要编排多个 npm script。这些任务有时需要按顺序依次执行（串行），有时则需要同时运行以提升效率（并行）。本章将介绍如何使用原生 shell 操作符以及更强大的 `npm-run-all` 工具来高效管理和运行多个 npm script。

## 准备示例脚本

为了演示多命令编排，我们首先在 `package.json` 中定义一组常见的代码质量检查任务：

-   `lint:js`: 使用 ESLint 检查 JavaScript 文件。
-   `lint:css`: 使用 stylelint 检查样式文件。
-   `lint:json`: 使用 jsonlint 验证 JSON 文件。
-   `lint:markdown`: 使用 markdownlint 检查 Markdown 文件。
-   `test`: 使用 Mocha 运行单元测试。

一个包含这些脚本的 `package.json` 如下所示：

```json
{
  "name": "hello-npm-script",
  "version": "0.1.0",
  "scripts": {
    "lint:js": "eslint *.js",
    "lint:css": "stylelint *.less",
    "lint:json": "jsonlint --quiet *.json",
    "lint:markdown": "markdownlint *.md",
    "test": "mocha tests/"
  },
  "devDependencies": {
    "chai": "^4.1.2",
    "eslint": "^4.11.0",
    "jsonlint": "^1.6.2",
    "markdownlint-cli": "^0.5.0",
    "mocha": "^4.0.1",
    "stylelint": "^8.2.0",
    "stylelint-config-standard": "^17.0.0"
  }
}
```

> **说明**：像 [AVA](https://github.com/avajs/ava) 或 [Tap](http://www.node-tap.org) 这样的测试工具也提供命令行接口，可以无缝集成到 npm script 中。

## 串行执行

串行执行可确保任务按预定顺序完成。一个典型的场景是在运行测试前，先完成所有代码的 lint 检查。我们可以使用 `&&` 操作符将多个命令连接起来。

例如，我们可以修改 `test` 脚本，使其在运行 `mocha` 之前先执行所有的 `lint` 任务：

```json
"scripts": {
  "test": "npm run lint:js && npm run lint:css && npm run lint:json && npm run lint:markdown && mocha tests/"
}
```

当执行 `npm test` 时，这些命令会严格按照 `eslint -> stylelint -> jsonlint -> markdownlint -> mocha` 的顺序执行。

**重要特性**：在串行模式下，如果任何一个命令执行失败（即进程退出码非 0），后续的所有命令都将被终止。这保证了流程的健壮性，例如，只有在所有代码检查通过后，才会执行单元测试。

## 并行执行

有时，我们希望同时运行多个任务以缩短等待时间，比如同时进行代码检查和单元测试。这可以通过 `&` 操作符实现。

将 `test` 脚本修改如下：

```json
"scripts": {
  "test": "npm run lint:js & npm run lint:css & npm run lint:json & npm run lint:markdown & mocha tests/"
}
```

执行 `npm test` 时，所有 `lint` 任务和 `mocha` 测试会同时启动。

**注意**：使用 `&` 进行并行操作时，各个命令的输出可能会混杂在一起，导致结果难以阅读。此外，如果其中某个命令是长时间运行的进程（如使用了 `--watch` 模式），你可能无法通过 `Ctrl + C` 正常终止所有后台进程。一个简单的解决方法是在命令末尾追加 `& wait`，但这并非最佳实践。

## 更优的方案：`npm-run-all`

对于复杂的命令编排，社区提供了更优雅的解决方案：[`npm-run-all`](https://github.com/mysticatea/npm-run-all)。它不仅语法简洁，还解决了原生并行执行的诸多痛点。

首先，将其安装到项目中：

```bash
npm install npm-run-all --save-dev
```

### 使用 `npm-run-all` 串行执行

`npm-run-all` 默认以串行方式执行命令。我们可以将 `test` 脚本重写为：

```json
"scripts": {
  "test": "npm-run-all lint:js lint:css lint:json lint:markdown mocha"
}
```

`npm-run-all` 还支持通配符，这让命令更加简洁。我们可以使用 `lint:*` 来匹配所有以 `lint:` 开头的脚本：

```json
"scripts": {
  "test": "npm-run-all lint:* mocha"
}
```

### 使用 `npm-run-all` 并行执行

只需添加 `--parallel` 标志，即可让所有任务并行执行：

```json
"scripts": {
  "test": "npm-run-all --parallel lint:* mocha"
}
```

`npm-run-all` 会妥善处理并行任务的输出和进程管理，无需手动添加 `& wait`。

> **进阶用法**：`npm-run-all` 提供了丰富的配置项，可以实现更复杂的编排，例如将并行和串行任务组合。感兴趣的读者可以查阅其[官方文档](https://github.com/mysticatea/npm-run-all/blob/HEAD/docs/npm-run-all.md)。

---

> 本节的示例代码已上传至 [GitHub](https://github.com/wangshijun/automated-workflow-with-npm-script/tree/02-run-multiple-npm-scripts)。你可以克隆该仓库并切换到 `02-run-multiple-npm-scripts` 分支进行练习。在运行命令前，请确保已执行 `npm install` 安装所有依赖。