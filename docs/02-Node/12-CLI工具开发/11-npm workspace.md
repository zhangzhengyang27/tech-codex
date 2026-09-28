---
title: npm workspace
description: npm workspaces 的单仓多包管理、依赖提升与命令透传
keywords: [Node.js, CLI, commander, npm, Workspace]
category: Node.js
tags: [Node.js, CLI工具开发]
---







# npm workspace

本教程将通过一个实战项目，带你一步步掌握如何使用 npm workspace 和 changeset 来构建、管理和发布一个 Monorepo 项目

## 项目初始化

首先，创建项目目录并初始化 `package.json`。

```bash
mkdir npm-monorepo-test
cd npm-monorepo-test
npm init -y
```

为了使用 npm workspace，需要将项目设置为私有，以防止根项目被意外发布。编辑 `package.json`，添加 `"private": true`：

```json
{
  "name": "npm-monorepo-test",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "ISC",
  "private": true
}
```

## 工作区搭建

### 创建 Packages

接下来，创建 `core` 和 `cli` 两个包。

使用 `npm init -w` 命令在 `packages` 目录下创建新的包：

```bash
npm init -w packages/core -y
npm init -w packages/cli -y
```

执行后，npm 会自动在根目录的 `package.json` 中添加 `workspaces` 配置：

```json
{
  "workspaces": ["packages/core", "packages/cli"]
}
```

### Package 间依赖

`cli` 包需要依赖 `core` 包。使用 `npm install <package-name> --workspace <workspace-name>` 命令来添加依赖：

```bash
npm install core --workspace cli
```

执行后，`packages/cli/package.json` 会增加对 `core` 的依赖。npm 会在根目录的 `node_modules` 中创建一个指向 `packages/core` 的软链接，方便本地开发。

### 为包添加 Scope 和命名

为了避免包名冲突，为包添加 `@guang-npm` scope。

**`packages/core/package.json`**

```json
{
  "name": "@guang-npm/core"
}
```

**`packages/cli/package.json`**

```json
{
  "name": "@guang-npm/cli",
  "dependencies": {
    "@guang-npm/core": "^1.0.0"
  }
}
```

修改包名后，需要重新执行 `npm install` 来更新 `node_modules` 中的软链接。

```bash
npm install
```

## 开发环境配置

### 安装与配置 TypeScript

在根目录安装 TypeScript 和相关的类型定义：

```bash
npm install --save-dev typescript @types/node
```

### 配置 tsconfig.json

为每个包创建 `tsconfig.json` 文件。可以使用 `npm exec --workspaces` 在所有包下执行命令：

```bash
npm exec --workspaces -- npx tsc --init
```

然后，修改 `tsconfig.json` 的配置，使其支持 Node.js 的 ES Module：

```json
{
  "compilerOptions": {
    "outDir": "dist",
    "types": ["node"],
    "target": "es2016",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

### 配置 package.json

在 `core` 和 `cli` 的 `package.json` 中添加 `"type": "module"`，并配置 `main` 和 `types` 字段：

```json
"type": "module",
"main": "dist/index.js",
"types": "dist/index.d.ts"
```

## 包开发

### `core` 包开发

在 `packages/core/src` 目录下创建 `index.ts` 文件，实现核心计算函数：

```typescript
function add(a: number, b: number): number {
  return a + b
}

function minus(a: number, b: number): number {
  return a - b
}

export { add, minus }
```

### `cli` 包开发

首先为 `cli` 包安装 `commander` 和 `chalk`：

```bash
npm install --workspace @guang-npm/cli chalk commander
```

在 `packages/cli/src` 目录下创建 `index.ts` 文件，实现命令行交互：

```typescript
#!/usr/bin/env node
import { Command } from "commander"
import chalk from "chalk"
import { add, minus } from "@guang-npm/core"

const program = new Command()

program.name("num-cli").description("一个简单的数字计算 CLI").version("0.0.1")

program
  .command("add")
  .description("计算两个数字的和")
  .argument("<a>", "第一个数字")
  .argument("<b>", "第二个数字")
  .action((a: string, b: string) => {
    console.log(chalk.green(add(+a, +b)))
  })

program
  .command("minus")
  .description("计算两个数字的差")
  .argument("<a>", "第一个数字")
  .argument("<b>", "第二个数字")
  .action((a: string, b: string) => {
    console.log(chalk.cyan(minus(+a, +b)))
  })

program.parse()
```

为让 `num-cli` 命令能够全局执行，还需要在 `packages/cli/package.json` 中配置 `bin` 字段：

```json
"bin": {
  "num-calc": "./dist/index.js"
}
```

## 构建与调试

### 编译代码

使用 `npm exec --workspaces` 在所有包下执行 `tsc` 命令来编译 TypeScript 代码：

```bash
npm exec --workspaces -- npx tsc
```

### 运行与调试

编译完成后，可以测试 `cli` 包的功能：

```bash
npm exec --workspace @guang-npm/cli -- node ./dist/index.js add 1 2
npm exec --workspace @guang-npm/cli -- node ./dist/index.js minus 1 2
```

## 版本管理与发布

### 初始化 Changesets

首先，安装 Changeset CLI 并初始化：

```bash
npm install --save-dev @changesets/cli
npx changeset init
```

这会在项目根目录创建一个 `.changeset` 目录。

### 初始化 Git 仓库

Changeset 基于 Git 工作，因此需要初始化 Git 仓库并进行首次提交。

创建一个 `.gitignore` 文件：

```bash
node_modules/
.DS_Store
dist/
```

然后执行：

```bash
git init
git add .
git commit -m "feat: initial commit"
```

### 创建变更集（Changeset）

对代码进行改动后（例如，在 `core` 和 `cli` 的 `index.ts` 中各加一个空行），使用 `changeset add` 命令创建变更集：

```bash
npx changeset add
```

根据提示选择需要更新版本的包、版本升级类型（major、minor、patch）并编写变更日志。

### 生成版本与 CHANGELOG

创建变更集后，执行 `changeset version` 命令：

```bash
npx changeset version
```

Changeset 会自动更新 `package.json` 中的版本号，并生成或更新 `CHANGELOG.md` 文件。

### 发布到 npm

在发布之前，需要确保包是公开的。在 `core` 和 `cli` 的 `package.json` 中添加 `publishConfig`：

```json
"publishConfig": {
  "access": "public"
}
```

然后登录 npm：

```bash
npm adduser
```

最后执行 `changeset publish` 命令：

```bash
npx changeset publish
```

Changeset 会将已更新版本的包发布到 npm，并为本次发布在 Git 中打上对应的 tag。

发布成功后，可以通过 `npx` 来测试发布的包：

```bash
npx @guang-npm/cli add 3 4
```

## 总结

本教程详细介绍了如何使用 `npm workspace` 和 `Changesets` 搭建、管理和发布一个 Monorepo 项目。

关键命令回顾：

- **`npm init -w <dir>`**: 在工作区内创建新包。
- **`npm install <pkg> --workspace <name>`**: 在指定工作区安装依赖。
- **`npm exec --workspace <name> -- <cmd>`**: 在指定工作区执行命令。
- **`npm exec --workspaces -- <cmd>`**: 在所有工作区执行命令。
- **`changeset add`**: 创建变更集。
- **`changeset version`**: 更新版本号和 `CHANGELOG.md`。
- **`changeset publish`**: 发布包到 npm。

## 常见问题（FAQ）

**Q1: `npm install` 在 `npm workspace` 中是如何工作的？**

**A:** 当你在 `npm workspace` 的根目录执行 `npm install` 时，npm 会将所有子包的依赖项提升（hoist）到根目录的 `node_modules` 文件夹中。这样做的好处是：

- **减少重复安装**：多个子包共享同一个依赖时，该依赖只会被下载和安装一次。
- **节省磁盘空间**：避免了在每个子包中都维护一份完整的 `node_modules`。

同时，npm 会在子包的 `node_modules` 目录中创建符号链接（symlink），这些链接会指向根目录 `node_modules` 中对应的依赖包。对于工作区内部的包（例如，`cli` 依赖 `core`），npm 也会在 `node_modules` 中创建指向其实际位置的符号链接，从而确保本地开发时能够引用到最新的代码。

**Q2: 如何在 `npm workspace` 中为所有子包执行同一个 `npm` 脚本？**

**A:** 你可以使用 `-ws`（`--workspaces` 的缩写）参数来在所有子包中执行同一个 `npm` 脚本。这在需要批量构建、测试或清理项目时非常有用。

例如，假设每个子包的 `package.json` 中都有一个 `build` 脚本，你可以通过以下命令在所有子包中执行它：

```bash
npm run build --ws
```

npm 会按照拓扑顺序（Topological Sorting）执行这些脚本，即先执行被依赖的包（如 `core`）的脚本，再执行依赖它的包（如 `cli`）的脚本，从而确保构建顺序的正确性。
