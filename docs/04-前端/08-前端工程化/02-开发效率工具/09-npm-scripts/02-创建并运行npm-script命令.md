---
title: 创建并运行npm-script命令
description: "package.json 是 npm script 的基石。通过 npm init 命令，我们可以快速生成这个文件。执行该命令后，终端会引导你填写项目名称、版本、作者等基本信息，大部分选项都提供了合理的默认值。"
keywords: []
category: tools
tags: [npm scripts, 工程化, 自动化]
---


# 创建并运行npm-script命令

本章将引导你掌握创建和运行 npm script 的基本流程。我们将从初始化 `package.json` 文件开始，逐步深入到如何执行默认命令和自定义命令，并以集成 ESLint 为例，为你展示 npm script 在实际项目中的应用。

## 使用 `npm init` 创建项目

`package.json` 是 npm script 的基石。通过 `npm init` 命令，我们可以快速生成这个文件。执行该命令后，终端会引导你填写项目名称、版本、作者等基本信息，大部分选项都提供了合理的默认值。

```bash
$ npm init
package name: (hello-npm-script)
version: (1.0.0)
description: A demo project for npm script
entry point: (index.js)
test command:
git repository:
keywords: npm, script
author:
license: (ISC)
```

完成问答后，npm 会生成 `package.json` 文件。你随时可以通过编辑器直接修改，或重新运行 `npm init` 更新已有信息。

> **提示：** 若想跳过问答环节，可使用 `npm init -y` 或 `npm init --yes` 命令，npm 将使用默认值快速生成 `package.json` 文件。

此外，你还可以通过 `npm config set` 命令自定义 `npm init` 的默认值，例如：

```bash
npm config set init.author.name "Your Name"
npm config set init.license "MIT"
```

## 使用 `npm run` 执行命令

`package.json` 文件中包含一个 `scripts` 字段，用于定义各类脚本命令。例如，`npm init` 默认会创建一个 `test` 命令：

```json
"scripts": {
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

在终端运行 `npm run test`（或简写为 `npm test`、`npm t`），你将看到 `Error: no test specified` 的输出。`npm start` 也是一个常用的内置命令，但与 `test` 不同，如果未在 `scripts` 中定义 `start` 命令，执行 `npm start` 将会报错。

`npm run` 的执行流程如下：

1.  npm 从 `package.json` 的 `scripts` 对象中查找对应的命令。
2.  如果找到，npm 会在一个新的 shell 中执行该命令。
3.  在执行前，npm 会将 `./node_modules/.bin` 目录临时添加到环境变量 `PATH` 的最前面。这意味着，所有安装在项目本地的命令行工具，都可以在 npm script 中直接调用，无需指定完整路径（如 `./node_modules/.bin/eslint`）。

若不带任何参数执行 `npm run`，它将列出所有可用的脚本命令。

## 创建自定义 npm script

接下来，我们以集成 [ESLint](https://eslint.org) 为例，学习如何创建自定义脚本。ESLint 是一款流行的 JavaScript 代码检查工具，拥有丰富的规则集，如 [google](https://github.com/google/eslint-config-google) 和 [airbnb](https://www.npmjs.com/package/eslint-config-airbnb)。

### 1. 准备待检查的代码

首先，创建一个 `index.js` 文件，并添加以下内容：

```javascript
const str = "some value"

function fn() {
  console.log("some log")
}
```

### 2. 添加 ESLint 依赖

执行以下命令，将 ESLint 安装为项目的开发依赖（`devDependencies`）：

```bash
npm install eslint --save-dev
```

> **提示：** 将 ESLint 安装在项目本地而非全局，有助于保证项目在不同环境中的一致性和可移植性。

### 3. 初始化 ESLint 配置

ESLint 需要一个配置文件来定义检查规则。我们可以通过以下命令启动初始化向导：

```bash
./node_modules/.bin/eslint --init
```

在向导中，你可以选择回答关于代码风格的问题，ESLint 会据此生成 `.eslintrc.js` 配置文件。例如，你可以选择通用的 `eslint:recommended` 规则集，并自定义缩进、引号等规范。（注：ESLint 9 起初始化向导默认生成扁平化配置文件 `eslint.config.js`，`.eslintrc.*` 写法适用于 ESLint 8 及更早版本。）

### 4. 添加 `lint` 命令

在 `package.json` 的 `scripts` 字段中，添加一个新的 `lint` 命令，用于检查所有 `.js` 文件：

```json
"scripts": {
  "lint": "eslint *.js",
  "test": "echo \"Error: no test specified\" && exit 1"
}
```

### 5. 运行 `lint` 命令

现在，执行 `npm run lint`。ESLint 会根据 `.eslintrc.js` 中的规则检查代码，并报告不符合规范的地方。

## 扩展：检查 React 和 Vue.js 代码

ESLint 的生态系统非常强大，通过插件可以支持对各类框架的检查。

- **React**：使用 [eslint-plugin-react](https://github.com/yannickcr/eslint-plugin-react) 检查 React 代码。如果你使用 [eslint-config-airbnb](https://www.npmjs.com/package/eslint-config-airbnb)，它已内置了该插件。安装时，请参考其官方文档解决 `peerDependencies` 的问题。

- **Vue.js**：官方推荐使用 [eslint-plugin-vue](https://github.com/vuejs/eslint-plugin-vue) 来检查 `.vue` 文件。其配置方法在官方 README 中有详细说明。

你可以在 `.eslintrc.js` 文件的 `rules` 字段中覆盖或自定义任何规则，以满足团队的特定需求。
