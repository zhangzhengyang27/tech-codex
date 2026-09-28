---
title: pnpm workspace 实战指南
description: pnpm workspace 的软链接模型、依赖隔离与命令编排
keywords: [Node.js, 构建, 脚手架, pnpm, Workspace]
category: Node.js
tags: [Node.js, 工程化]
---







# pnpm workspace 实战指南

## 项目概述

本文将通过一个完整的实战案例，详细介绍如何使用 `pnpm workspace` 和 `Changesets` 构建、管理和发布一个 Monorepo 项目。将搭建一个包含 `core`（核心库）和 `cli`（命令行工具）两个包的项目，并最终将其发布到 npm。

### 技术栈

- **包管理器**：pnpm v8+
- **构建工具**：TypeScript
- **版本管理**：Changesets
- **CLI 框架**：Commander.js
- **终端美化**：Chalk

### 学习目标

- ✅ 掌握 pnpm workspace 的配置和使用
- ✅ 理解 Monorepo 中包之间的依赖管理
- ✅ 学会使用 Changesets 进行版本管理
- ✅ 掌握从开发到发布的完整流程

## 项目架构

### 目录结构

最终的项目结构如下：

```
pnpm-monorepo-test/
├── .changeset/                    # Changesets 配置
│   ├── config.json
│   └── README.md
├── packages/                      # 包目录
│   ├── core/                      # 核心库包
│   │   ├── src/
│   │   │   └── index.ts
│   │   ├── dist/                  # 编译产物
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── CHANGELOG.md
│   └── cli/                       # CLI 工具包
│       ├── src/
│       │   └── index.ts
│       ├── dist/
│       ├── package.json
│       ├── tsconfig.json
│       └── CHANGELOG.md
├── node_modules/                  # 根目录依赖
├── pnpm-workspace.yaml            # workspace 配置
├── package.json                   # 根配置
├── pnpm-lock.yaml                 # 锁文件
└── .gitignore
```

### 包依赖关系

```
┌─────────────┐
│     cli     │
│  (CLI Tool) │
└──────┬──────┘
       │ depends on
       ↓
┌─────────────┐
│    core     │
│ (Core Lib)  │
└─────────────┘
```

### 工作流程

```
开发 → 构建 → 测试 → 创建变更集 → 版本提升 → 发布
```

## 项目初始化

### 创建项目

创建名为 `pnpm-monorepo-test` 的项目，并初始化 `package.json` 文件：

```bash
mkdir pnpm-monorepo-test
cd pnpm-monorepo-test
npm init -y
```

### 配置根 package.json

编辑根目录的 `package.json`，添加 `"private": true`，以防止根项目被意外发布到 npm：

```json
{
  "name": "pnpm-monorepo-test",
  "version": "1.0.0",
  "description": "A monorepo project built with pnpm workspace",
  "private": true,
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "clean": "pnpm -r run clean",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "changeset publish"
  },
  "keywords": ["monorepo", "pnpm"],
  "author": "",
  "license": "MIT"
}
```

**关键字段说明**：

- `"private": true`：标记为私有包，防止意外发布
- `scripts`：定义常用脚本命令
  - `build`：构建所有包
  - `test`：运行所有测试
  - `clean`：清理构建产物
  - `changeset`：创建变更集
  - `version`：更新版本号
  - `release`：发布到 npm

### 配置 pnpm workspace

在项目根目录下创建 `pnpm-workspace.yaml` 文件，用于定义工作区的包（packages）所在的位置：

```yaml
packages:
  - "packages/*"          # 包目录
  - "apps/*"              # 应用目录（可选）
  - "!**/test/**"         # 排除测试目录
  - "!**/node_modules/**" # 排除 node_modules
```

**配置说明**：

- `packages`：定义工作区包的位置
- 支持 glob 模式匹配
- 可以使用 `!` 排除特定目录

**高级配置示例**：

```yaml
packages:
  # 包含所有 packages 下的项目
  - "packages/**"
  # 包含所有 apps 下的项目
  - "apps/**"
  # 排除示例项目
  - "!**/examples/**"
  # 排除测试项目
  - "!**/test/**"
```

## 工作区搭建

### 创建子包

在 `packages` 目录下创建 `core` 和 `cli` 两个子包，并分别初始化 `package.json`：

```bash
# 创建目录
mkdir -p packages/core packages/cli

# 初始化 core 包
cd packages/core
npm init -y

# 初始化 cli 包
cd ../cli
npm init -y
```

### 添加包之间的依赖关系

在 Monorepo 中，包之间经常存在依赖关系。例如：`cli` 包需要依赖 `core` 包。使用以下命令为 `cli` 添加对 `core` 的依赖：

```bash
# --filter <package_name>：指定在哪个包下执行命令
# --workspace：表示从当前工作区查找依赖
pnpm --filter @guang-pnpm/cli add @guang-pnpm/core --workspace
```

执行后，`cli/package.json` 的 `dependencies` 会增加：

```json
{
  "dependencies": {
    "@guang-pnpm/core": "workspace:^1.0.0"
  }
}
```

**workspace 协议说明**：

- `workspace:*`：使用工作区内的最新版本
- `workspace:^`：遵循 semver 版本范围（推荐）
- `workspace:~`：允许补丁版本更新
- `workspace:1.0.0`：精确版本匹配

### 为包添加 Scope

为更好地组织和区分包，为它们添加 `@guang-pnpm` 的 scope。

**`packages/core/package.json`**：

```json
{
  "name": "@guang-pnpm/core",
  "version": "1.0.0",
  "description": "Core calculation library",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "dev": "tsc -w",
    "clean": "rm -rf dist"
  },
  "keywords": ["core", "calculation"],
  "author": "",
  "license": "MIT"
}
```

**`packages/cli/package.json`**：

```json
{
  "name": "@guang-pnpm/cli",
  "version": "1.0.0",
  "description": "CLI tool for number calculations",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "type": "module",
  "bin": {
    "num-cli": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsc -w",
    "clean": "rm -rf dist"
  },
  "keywords": ["cli", "calculator"],
  "author": "",
  "license": "MIT",
  "dependencies": {
    "@guang-pnpm/core": "workspace:^1.0.0"
  }
}
```

修改后，在根目录执行 `pnpm install` 来更新依赖关系：

```bash
pnpm install
```

### 验证链接

安装完成后，检查 workspace 链接是否正确：

```bash
# 查看链接
ls -la node_modules/@guang-pnpm/

# 输出示例
# core -> ../../packages/core
# cli -> ../../packages/cli
```

## 开发环境配置

### 安装与配置 TypeScript

在根目录安装 `typescript` 和 `@types/node` 作为开发依赖：

```bash
# -w 或 --workspace-root：在根目录安装
pnpm add typescript @types/node -w -D
```

**为什么使用 `-w` 参数？**

在 pnpm workspace 中，直接在根目录执行 `pnpm add <package>` 会报错。使用 `-w` 参数明确告诉 pnpm 将依赖安装在根目录的 `node_modules` 中，这通常用于安装共享的开发工具。

### 配置 tsconfig.json

分别为 `core` 和 `cli` 包创建 `tsconfig.json` 文件：

```bash
# 在 cli 包下执行
pnpm --filter @guang-pnpm/cli exec npx tsc --init

# 在 core 包下执行
pnpm --filter @guang-pnpm/core exec npx tsc --init
```

然后修改 `tsconfig.json` 文件，以支持 Node.js 的 ES Module：

**`packages/core/tsconfig.json` 和 `packages/cli/tsconfig.json`**：

```json
{
  "compilerOptions": {
    /* 基础配置 */
    "target": "ES2020",                    /* 编译目标版本 */
    "module": "NodeNext",                  /* 模块系统 */
    "moduleResolution": "NodeNext",        /* 模块解析策略 */
    "lib": ["ES2020"],                     /* 包含的库 */

    /* 输出配置 */
    "outDir": "./dist",                    /* 输出目录 */
    "rootDir": "./src",                    /* 源码目录 */
    "declaration": true,                   /* 生成 .d.ts 文件 */
    "declarationMap": true,                /* 生成声明文件的 source map */
    "sourceMap": true,                     /* 生成 source map */

    /* 类型检查 */
    "strict": true,                        /* 启用严格模式 */
    "noImplicitAny": true,                 /* 禁止隐式 any */
    "strictNullChecks": true,              /* 严格的 null 检查 */
    "strictFunctionTypes": true,           /* 严格的函数类型检查 */

    /* 模块解析 */
    "esModuleInterop": true,               /* 允许 CommonJS 模块默认导入 */
    "allowSyntheticDefaultImports": true,  /* 允许合成默认导入 */
    "resolveJsonModule": true,             /* 解析 JSON 模块 */

    /* 其他 */
    "forceConsistentCasingInFileNames": true, /* 强制文件名大小写一致 */
    "skipLibCheck": true,                  /* 跳过库文件类型检查 */
    "types": ["node"]                      /* 包含的类型 */
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**配置参数详解**：

| 参数                      | 说明                                       |
| ------------------------- | ------------------------------------------ |
| `target`                  | 编译后的 JavaScript 版本                   |
| `module`                  | 模块系统，`NodeNext` 适合 Node.js 项目     |
| `moduleResolution`        | 模块解析策略，与 `module` 保持一致         |
| `outDir`                  | 编译输出目录                               |
| `declaration`             | 生成类型声明文件（.d.ts）                  |
| `strict`                  | 启用所有严格类型检查选项                   |
| `esModuleInterop`         | 允许 CommonJS 模块默认导入                 |
| `types`                   | 指定需要包含的类型声明                     |

### 共享 TypeScript 配置（可选）

在根目录创建共享配置：

**`tsconfig.base.json`**：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "types": ["node"]
  }
}
```

然后在各包中继承：

**`packages/core/tsconfig.json`**：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 包开发

### `core` 包开发

`core` 包提供核心的计算能力，在这里实现 `add` 和 `minus` 两个函数。

在 `packages/core/src` 目录下创建 `index.ts` 文件：

```typescript
/**
 * 计算两个数字的和
 * @param a 第一个数字
 * @param b 第二个数字
 * @returns 和
 * @example
 * ```ts
 * add(1, 2) // 3
 * add(-1, 1) // 0
 * ```
 */
export function add(a: number, b: number): number {
  return a + b
}

/**
 * 计算两个数字的差
 * @param a 第一个数字
 * @param b 第二个数字
 * @returns 差
 * @example
 * ```ts
 * minus(5, 3) // 2
 * minus(1, 5) // -4
 * ```
 */
export function minus(a: number, b: number): number {
  return a - b
}

/**
 * 计算两个数字的积
 * @param a 第一个数字
 * @param b 第二个数字
 * @returns 积
 */
export function multiply(a: number, b: number): number {
  return a * b
}

/**
 * 计算两个数字的商
 * @param a 第一个数字
 * @param b 第二个数字
 * @returns 商
 * @throws 当除数为 0 时抛出错误
 */
export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('除数不能为 0')
  }
  return a / b
}
```

**代码组织最佳实践**：

- 使用 JSDoc 注释提供详细的 API 文档
- 导出清晰的函数签名
- 提供使用示例
- 添加错误处理

### `cli` 包开发

`cli` 包负责提供命令行交互，它将调用 `core` 包的功能来执行计算。

#### 安装依赖

首先为 `cli` 包添加 `commander` 和 `chalk` 两个依赖：

```bash
# 添加生产依赖
pnpm --filter @guang-pnpm/cli add chalk commander

# 添加开发依赖
pnpm --filter @guang-pnpm/cli add -D @types/node
```

#### 创建 CLI 入口

在 `packages/cli/src` 目录下创建 `index.ts` 文件：

```typescript
#!/usr/bin/env node
import { Command } from 'commander'
import chalk from 'chalk'
import { add, minus, multiply, divide } from '@guang-pnpm/core'

const program = new Command()

program
  .name('num-cli')
  .description('一个简单的数字计算器')
  .version('1.0.0')

// 加法命令
program
  .command('add')
  .description('计算两个数字的和')
  .argument('<a>', '第一个数字')
  .argument('<b>', '第二个数字')
  .action((a: string, b: string) => {
    const numA = Number(a)
    const numB = Number(b)
    
    if (isNaN(numA) || isNaN(numB)) {
      console.error(chalk.red('错误: 请输入有效的数字'))
      process.exit(1)
    }
    
    const result = add(numA, numB)
    console.log(chalk.green(`结果: ${numA} + ${numB} = ${result}`))
  })

// 减法命令
program
  .command('minus')
  .description('计算两个数字的差')
  .argument('<a>', '第一个数字')
  .argument('<b>', '第二个数字')
  .action((a: string, b: string) => {
    const numA = Number(a)
    const numB = Number(b)
    
    if (isNaN(numA) || isNaN(numB)) {
      console.error(chalk.red('错误: 请输入有效的数字'))
      process.exit(1)
    }
    
    const result = minus(numA, numB)
    console.log(chalk.cyan(`结果: ${numA} - ${numB} = ${result}`))
  })

// 乘法命令
program
  .command('multiply')
  .description('计算两个数字的积')
  .argument('<a>', '第一个数字')
  .argument('<b>', '第二个数字')
  .action((a: string, b: string) => {
    const numA = Number(a)
    const numB = Number(b)
    
    if (isNaN(numA) || isNaN(numB)) {
      console.error(chalk.red('错误: 请输入有效的数字'))
      process.exit(1)
    }
    
    const result = multiply(numA, numB)
    console.log(chalk.yellow(`结果: ${numA} × ${numB} = ${result}`))
  })

// 除法命令
program
  .command('divide')
  .description('计算两个数字的商')
  .argument('<a>', '第一个数字')
  .argument('<b>', '第二个数字')
  .action((a: string, b: string) => {
    const numA = Number(a)
    const numB = Number(b)
    
    if (isNaN(numA) || isNaN(numB)) {
      console.error(chalk.red('错误: 请输入有效的数字'))
      process.exit(1)
    }
    
    try {
      const result = divide(numA, numB)
      console.log(chalk.magenta(`结果: ${numA} ÷ ${numB} = ${result}`))
    } catch (error) {
      console.error(chalk.red(`错误: ${(error as Error).message}`))
      process.exit(1)
    }
  })

// 解析命令行参数
program.parse()
```

#### 配置 bin 字段

为了让 `num-cli` 命令能够全局执行，需要在 `packages/cli/package.json` 中配置 `bin` 字段：

```json
{
  "name": "@guang-pnpm/cli",
  "version": "1.0.0",
  "bin": {
    "num-cli": "./dist/index.js"
  },
  "files": [
    "dist"
  ]
}
```

**字段说明**：

- `bin`：定义可执行命令及其入口文件
- `files`：指定发布时要包含的文件
- `#!/usr/bin/env node`：Shebang，指定使用 Node.js 执行

## 构建与调试

### 编译代码

使用 `pnpm` 的 `-r`（recursive）参数，可以在所有包下递归地执行 `tsc` 命令来编译 TypeScript 代码：

```bash
# 递归执行构建脚本
pnpm -r run build

# 或使用 exec 执行命令
pnpm -r exec tsc
```

**拓扑排序执行**：

`pnpm` 会自动按照拓扑顺序（Topological Sorting）执行命令：

```
执行顺序：
1. core (无依赖)
2. cli (依赖 core)
```

对于没有依赖关系的包，pnpm 会并行执行以提高效率。

### 增量构建

启用 TypeScript 增量编译：

```json
// tsconfig.json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  }
}
```

### 开发模式

使用监听模式进行开发：

```bash
# 在所有包中启动监听模式
pnpm -r run dev

# 在特定包中启动
pnpm --filter @guang-pnpm/core run dev
```

### 运行与调试

编译完成后可以测试 `cli` 包的功能是否正常：

```bash
# 测试加法
pnpm --filter @guang-pnpm/cli exec node ./dist/index.js add 10 5
# 输出: 结果: 10 + 5 = 15

# 测试减法
pnpm --filter @guang-pnpm/cli exec node ./dist/index.js minus 10 5
# 输出: 结果: 10 - 5 = 5

# 测试乘法
pnpm --filter @guang-pnpm/cli exec node ./dist/index.js multiply 10 5
# 输出: 结果: 10 × 5 = 50

# 测试除法
pnpm --filter @guang-pnpm/cli exec node ./dist/index.js divide 10 5
# 输出: 结果: 10 ÷ 5 = 2
```

### 本地测试 CLI 工具

使用 `pnpm link` 在本地测试 CLI 工具：

```bash
# 全局链接 cli 包
cd packages/cli
pnpm link --global

# 测试命令
num-cli add 3 4

# 取消链接
pnpm unlink --global
```

## 版本管理与发布

### 初始化 Changesets

Changesets 是强大的版本管理工具，首先在根目录安装并初始化它：

```bash
# 安装
pnpm add -D -w @changesets/cli

# 初始化
npx changeset init
```

初始化后会创建以下文件：

```
.changeset/
├── config.json    # 配置文件
└── README.md      # 说明文件
```

### 配置 Changesets

编辑 `.changeset/config.json`：

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

**配置项说明**：

| 配置项                        | 说明                                       |
| ----------------------------- | ------------------------------------------ |
| `access`                      | 发布权限（`public` 或 `restricted`）       |
| `baseBranch`                  | 基础分支名称                               |
| `updateInternalDependencies`  | 内部依赖更新策略（`patch` 或 `minor`）     |
| `fixed`                       | 版本号固定的包组                           |
| `linked`                      | 版本号关联的包组                           |
| `ignore`                      | 忽略版本管理的包                           |

### 创建变更集（Changeset）

在对代码进行改动后，使用 `changeset add` 命令创建一个变更集：

```bash
npx changeset add
```

交互式流程：

```bash
🦋  Which packages would you like to include?
│  ◉ @guang-pnpm/core
│  ◉ @guang-pnpm/cli
│  
└─◯ @guang-pnpm/utils (disabled)

🦋  Which packages should have a major bump?
│  ◯ @guang-pnpm/core
│  ◯ @guang-pnpm/cli

🦋  Which packages should have a minor bump?
│  ◯ @guang-pnpm/core
│  ◉ @guang-pnpm/cli

🦋  The following packages will be patch bumped:
│  @guang-pnpm/core

🦋  Please enter a summary for this change:
│  Add multiply and divide functions
```

生成的变更集文件 `.changeset/cold-animals-hug.md`：

```markdown
---
"@guang-pnpm/core": patch
"@guang-pnpm/cli": minor
---

Add multiply and divide functions
```

**版本类型说明**：

- `major`：重大更新，可能包含破坏性变更（1.0.0 → 2.0.0）
- `minor`：新功能，向后兼容（1.0.0 → 1.1.0）
- `patch`：Bug 修复，向后兼容（1.0.0 → 1.0.1）

### 生成版本与 CHANGELOG

创建变更集后，执行 `changeset version` 命令：

```bash
npx changeset version
```

`changeset` 会自动完成以下操作：

1. **更新版本号**：根据变更集更新 `package.json` 中的版本号
2. **生成 CHANGELOG**：为每个包生成或更新 `CHANGELOG.md` 文件
3. **更新依赖版本**：自动更新包之间的依赖版本
4. **删除变更集文件**：消耗已处理的变更集文件

生成的 `CHANGELOG.md` 示例：

```markdown
# @guang-pnpm/cli

## 1.1.0

### Minor Changes

- Add multiply and divide functions

### Patch Changes

- Updated dependencies
  - @guang-pnpm/core@1.0.1

## 1.0.0

### Major Changes

- Initial release
```

### 发布到 npm

#### 登录 npm 账号

在发布到 npm 之前需要先登录：

```bash
npm adduser
# 或
npm login
```

#### 配置发布权限

在 `core` 和 `cli` 的 `package.json` 中添加 `publishConfig`：

```json
{
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

**发布权限说明**：

- `public`：公开包，所有人可见
- `restricted`：私有包，需要付费账号

#### 执行发布

```bash
npx changeset publish
```

这个命令会：

1. 将已更新版本的包发布到 npm
2. 为本次发布在 Git 中打上对应的 tag（如 `@guang-pnpm/core@1.0.1`）

> **注意**：`changeset publish` 不会自动推送 tag，发布后需手动执行 `git push --follow-tags`。

#### 发布成功后的测试

```bash
# 使用 npx 直接运行
npx @guang-pnpm/cli add 3 4
# 输出: 结果: 3 + 4 = 7

npx @guang-pnpm/cli minus 10 3
# 输出: 结果: 10 - 3 = 7

# 全局安装
npm install -g @guang-pnpm/cli
num-cli multiply 5 6
# 输出: 结果: 5 × 6 = 30
```

### 发布流程总结

```
1. 修改代码
   ↓
2. 提交到 Git
   ↓
3. 创建 changeset (npx changeset add)
   ↓
4. 提交 changeset 文件
   ↓
5. 更新版本 (npx changeset version)
   ↓
6. 提交版本更新
   ↓
7. 发布到 npm (npx changeset publish)
```

## pnpm 命令详解

### 基础命令

| 命令                           | 说明                                       | 示例                                       |
| ------------------------------ | ------------------------------------------ | ------------------------------------------ |
| `pnpm install`                 | 安装所有依赖                               | `pnpm install`                             |
| `pnpm add <package>`           | 添加依赖                                   | `pnpm add lodash`                          |
| `pnpm add -D <package>`        | 添加开发依赖                               | `pnpm add -D typescript`                   |
| `pnpm remove <package>`        | 移除依赖                                   | `pnpm remove lodash`                       |
| `pnpm update`                  | 更新依赖                                   | `pnpm update`                              |
| `pnpm list`                    | 查看依赖列表                               | `pnpm list --depth=0`                      |

### Workspace 相关命令

#### 在特定包中执行命令

```bash
# --filter 指定包名
pnpm --filter <package-name> <command>

# 示例
pnpm --filter @guang-pnpm/core add lodash
pnpm --filter @guang-pnpm/cli run build

# 支持模式匹配
pnpm --filter "@guang-pnpm/*" run test
```

#### 在所有包中递归执行命令

```bash
# -r 或 --recursive
pnpm -r <command>

# 示例
pnpm -r run build          # 构建所有包
pnpm -r run test           # 测试所有包
pnpm -r exec tsc           # 在所有包中执行 tsc

# 并行执行
pnpm -r --parallel run dev

# 串行执行（将并发数设为 1，pnpm 无 --serial 选项）
pnpm -r --workspace-concurrency=1 run build
```

#### 过滤器高级用法

```bash
# 构建特定包及其所有依赖
pnpm --filter "...@guang-pnpm/cli" run build

# 构建依赖于特定包的所有包
pnpm --filter "@guang-pnpm/core..." run build

# 只构建有变化的包
pnpm --filter "[origin/main]" run build

# 排除特定包
pnpm --filter "!@guang-pnpm/docs" run build

# 组合过滤
pnpm --filter "@guang-pnpm/*" --filter "!@guang-pnpm/docs" run test
```

### 依赖管理命令

```bash
# 添加 workspace 依赖
pnpm --filter <package> add <workspace-package> --workspace

# 查看依赖图
pnpm list --depth=0 --json

# 检查过时的依赖
pnpm outdated

# 审计安全漏洞
pnpm audit

# 清理未使用的依赖
pnpm prune
```

### 根目录操作

```bash
# 在根目录安装依赖
pnpm add <package> -w
pnpm add <package> -w -D

# 在根目录执行脚本
pnpm -w run <script>
```

## workspace 协议详解

### 协议类型

#### 1. `workspace:*`

使用工作区内的最新版本，发布时替换为实际版本号。

```json
{
  "dependencies": {
    "@guang-pnpm/core": "workspace:*"
  }
}
```

**发布后**：

```json
{
  "dependencies": {
    "@guang-pnpm/core": "1.2.3"
  }
}
```

#### 2. `workspace:^`

遵循 semver 版本范围，发布时保留版本范围。

```json
{
  "dependencies": {
    "@guang-pnpm/core": "workspace:^"
  }
}
```

**发布后**：

```json
{
  "dependencies": {
    "@guang-pnpm/core": "^1.2.3"
  }
}
```

#### 3. `workspace:~`

允许补丁版本更新。

```json
{
  "dependencies": {
    "@guang-pnpm/core": "workspace:~"
  }
}
```

**发布后**：

```json
{
  "dependencies": {
    "@guang-pnpm/core": "~1.2.3"
  }
}
```

#### 4. 精确版本

指定精确版本号。

```json
{
  "dependencies": {
    "@guang-pnpm/core": "workspace:1.0.0"
  }
}
```

### 协议选择建议

| 场景                 | 推荐协议       | 原因                                       |
| -------------------- | -------------- | ------------------------------------------ |
| 应用项目             | `workspace:*`  | 总是使用最新版本                           |
| 库项目               | `workspace:^`  | 允许版本范围，更灵活                       |
| 严格版本控制         | `workspace:1.0.0` | 精确版本，避免意外更新                   |
| 开发环境             | `workspace:*`  | 实时同步最新代码                           |

## 依赖管理最佳实践

### 依赖分类

#### 生产依赖 (dependencies)

运行时必需的依赖：

```json
{
  "dependencies": {
    "lodash": "^4.17.21",
    "@guang-pnpm/core": "workspace:^"
  }
}
```

#### 开发依赖 (devDependencies)

开发和构建时需要的依赖：

```json
{
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "jest": "^29.0.0"
  }
}
```

#### peerDependencies

要求使用者提供的依赖：

```json
{
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-dom": ">=16.8.0"
  },
  "peerDependenciesMeta": {
    "react-dom": {
      "optional": true
    }
  }
}
```

### 依赖提升策略

pnpm 默认使用严格的依赖隔离，可以通过配置调整：

```ini
# .npmrc

# 提升所有依赖
shamefully-hoist=true

# 提升特定依赖
public-hoist-pattern[]=*eslint*
public-hoist-pattern[]=*prettier*

# 使用 npm 风格的提升
node-linker=hoisted
```

### 依赖版本管理

使用 `.npmrc` 控制版本范围：

```ini
# 保存时使用精确版本
save-exact=true

# 保存时使用 ^ 版本范围
save-prefix=^

# 保存时使用 ~ 版本范围
save-prefix=~
```

## CI/CD 配置

### GitHub Actions 配置

创建 `.github/workflows/ci.yml`：

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm -r run build

      - name: Test
        run: pnpm -r run test

      - name: Lint
        run: pnpm -r run lint
```

### 自动发布配置

创建 `.github/workflows/release.yml`：

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    if: github.repository == 'your-org/your-repo'

    steps:
      - uses: actions/checkout@v3

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
          registry-url: 'https://registry.npmjs.org'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm -r run build

      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 缓存优化

```yaml
- name: Cache pnpm store
  uses: actions/cache@v3
  with:
    path: ~/.local/share/pnpm/store  # Linux 默认路径（macOS 为 ~/Library/pnpm/store）
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-
```

## 性能优化

### 依赖安装优化

#### 使用 frozen lockfile

在 CI 环境中使用：

```bash
pnpm install --frozen-lockfile
```

#### 并行安装

```bash
# 默认就是并行的，可以调整并发数
pnpm install --network-concurrency=16
```

### 构建优化

#### 增量构建

```bash
# TypeScript 增量编译
tsc --incremental

# 只构建变化的包
pnpm --filter "[origin/main]" run build
```

#### 并行构建

```bash
# 并行构建（注意包之间的依赖关系）
pnpm -r --parallel run build
```

### 磁盘空间优化

pnpm 使用硬链接和符号链接，自动优化磁盘空间：

```bash
# 查看存储位置
pnpm store path

# 清理未使用的包
pnpm store prune

# 查看存储统计
pnpm store status
```

## 常见问题（FAQ）

### Q1: 为什么要在根目录使用 `-w` 参数安装依赖？

在 pnpm workspace 中，直接在根目录执行 `pnpm add <package>` 会报错：

```
ERR_PNPM_ADDING_TO_ROOT
```

使用 `-w` 或 `--workspace-root` 参数明确告诉 pnpm 将依赖安装在根目录的 `node_modules` 中，这通常用于安装共享的开发工具，如 `typescript`、`eslint`、`prettier` 等。

### Q2: workspace 协议在发布时会如何处理？

workspace 协议会在发布时被替换为实际版本号：

| 原始配置                    | 发布后配置          |
| --------------------------- | ------------------- |
| `"workspace:*"`             | `"1.2.3"`           |
| `"workspace:^"`             | `"^1.2.3"`          |
| `"workspace:~"`             | `"~1.2.3"`          |
| `"workspace:1.0.0"`         | `"1.0.0"`           |
| `"workspace:^1.0.0"`        | `"^1.0.0"`          |

### Q3: 如何查看包之间的依赖关系？

```bash
# 查看依赖树
pnpm list --depth=0

# 查看 workspace 依赖
pnpm list --depth=0 --json | jq

# 使用工具可视化
npx lerna graph
npx nx graph
```

### Q4: 如何在 Monorepo 中共享配置？

创建共享配置文件：

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext"
  }
}

// .eslintrc.base.js
module.exports = {
  extends: ['eslint:recommended'],
  rules: {
    'no-unused-vars': 'error'
  }
}
```

在各包中继承：

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist"
  }
}
```

### Q5: 如何处理幽灵依赖问题？

pnpm 默认使用严格的依赖隔离，避免幽灵依赖：

**问题示例**：

```typescript
// 包 A 没有声明 lodash 依赖
// 但包 B 安装了 lodash
import _ from 'lodash'  // ❌ 错误：找不到模块
```

**解决方案**：

1. **推荐**：显式声明所有依赖
2. **临时方案**：使用 `shamefully-hoist=true`

### Q6: changeset 如何知道哪些包需要更新版本？

changeset 通过 Git 检测自上次 commit 以来发生变更的文件：

```bash
# 查看未提交的变更
git status

# 查看与上次提交的差异
git diff
```

**注意**：在执行 `changeset add` 之前，确保代码已经提交或处于可提交状态。

### Q7: 如何只发布特定的包？

在 `.changeset/config.json` 中配置 `ignore` 字段：

```json
{
  "ignore": ["@guang-pnpm/docs", "@guang-pnpm/test"]
}
```

或在 `package.json` 中设置 `private`：

```json
{
  "name": "@guang-pnpm/internal",
  "private": true
}
```

### Q8: 如何处理循环依赖？

检测循环依赖：

```bash
# 使用 madge
npx madge --circular packages/

# 使用 dpdm
npx dpdm packages/core/src/index.ts --circular
```

解决方案：

1. 提取公共代码到新包
2. 使用依赖注入
3. 重构代码结构

## 故障排查

### 常见错误

#### 1. `ERR_PNPM_NO_MATCHING_VERSION`

**错误信息**：

```
ERR_PNPM_NO_MATCHING_VERSION  No matching version found for @guang-pnpm/core@workspace:*
```

**原因**：workspace 中找不到指定的包。

**解决方案**：

```bash
# 检查包名是否正确
cat packages/core/package.json | grep "name"

# 检查 workspace 配置
cat pnpm-workspace.yaml

# 重新安装依赖
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### 2. `ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY`

**错误信息**：

```
ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY
```

**解决方案**：

```bash
# 删除 lockfile 重新安装
rm pnpm-lock.yaml
pnpm install
```

#### 3. TypeScript 无法解析 workspace 包

**问题**：导入 workspace 包时 TypeScript 报错。

**解决方案**：

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@guang-pnpm/*": ["packages/*/src"]
    }
  },
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/cli" }
  ]
}
```

#### 4. 发布失败：权限错误

**错误信息**：

```
403 Forbidden - PUT https://registry.npmjs.org/@guang-pnpm%2fcore
```

**解决方案**：

```bash
# 检查登录状态
npm whoami

# 重新登录
npm login

# 检查包名是否已被占用
npm search @guang-pnpm/core

# 检查 publishConfig
cat packages/core/package.json | grep -A 3 "publishConfig"
```

#### 5. CLI 命令找不到

**问题**：全局安装后 `num-cli` 命令不存在。

**解决方案**：

```bash
# 检查 bin 字段
cat packages/cli/package.json | grep -A 3 "bin"

# 检查文件是否可执行
ls -la packages/cli/dist/index.js

# 添加 shebang
#!/usr/bin/env node

# 重新链接
cd packages/cli
pnpm link --global --force
```

### 调试技巧

#### 1. 查看实际链接

```bash
# macOS/Linux
ls -la node_modules/@guang-pnpm/

# 检查符号链接
readlink node_modules/@guang-pnpm/core
```

#### 2. 查看依赖图

```bash
# pnpm 内置命令
pnpm list --depth=0 --json

# 使用第三方工具
npx lerna graph
npx dependency-cruiser packages/
```

#### 3. 清理缓存

```bash
# 清理 pnpm 存储
pnpm store prune

# 清理项目依赖
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
find . -name "dist" -type d -prune -exec rm -rf '{}' +

# 重新安装
pnpm install
```

#### 4. 详细日志

```bash
# 使用详细模式
pnpm install --reporter=default

# 使用调试模式
npm_config_loglevel=debug pnpm install
```

## 最佳实践总结

### 项目结构

- ✅ 使用清晰的目录结构划分不同类型的包
- ✅ 共享配置文件放在根目录
- ✅ 使用 scope 组织包名（如 `@my-org/`）

### 依赖管理

- ✅ 显式声明所有依赖，避免幽灵依赖
- ✅ 区分生产依赖和开发依赖
- ✅ 使用 `workspace:^` 协议管理内部依赖
- ✅ 定期更新和审计依赖

### 版本管理

- ✅ 使用 Changesets 管理版本
- ✅ 及时创建变更集
- ✅ 编写清晰的 CHANGELOG
- ✅ 遵循语义化版本规范

### 构建发布

- ✅ 使用增量构建提高效率
- ✅ 配置 CI/CD 自动化流程
- ✅ 发布前充分测试
- ✅ 使用缓存优化性能

### 团队协作

- ✅ 统一开发环境配置
- ✅ 编写清晰的文档
- ✅ 使用 Git hooks 自动检查
- ✅ 定期同步和培训

### 常用命令速查

| 场景             | 命令                                       |
| ---------------- | ------------------------------------------ |
| 安装依赖         | `pnpm install`                             |
| 添加根依赖       | `pnpm add <package> -w -D`                 |
| 添加包依赖       | `pnpm --filter <pkg> add <dep>`            |
| 添加 workspace 依赖 | `pnpm --filter <pkg> add <dep> --workspace` |
| 构建所有包       | `pnpm -r run build`                        |
| 运行特定包脚本   | `pnpm --filter <pkg> run <script>`         |
| 创建变更集       | `npx changeset add`                        |
| 更新版本         | `npx changeset version`                    |
| 发布到 npm       | `npx changeset publish`                    |

---

## 总结

本文详细介绍了使用 `pnpm workspace` 和 `Changesets` 从零开始搭建、管理和发布一个 Monorepo 项目的完整流程：

### 核心知识点

- **pnpm workspace 配置**：通过 `pnpm-workspace.yaml` 定义工作区
- **依赖管理**：使用 `--filter` 和 `--workspace` 参数管理包依赖
- **workspace 协议**：灵活控制内部依赖的版本策略
- **版本管理**：通过 Changesets 实现自动化的版本管理和发布
- **CI/CD 集成**：配置自动化构建和发布流程

### 关键命令

- `pnpm --filter <package>`：在指定包下执行命令
- `pnpm -r`：在所有包下递归执行命令（支持拓扑排序）
- `pnpm add <package> --workspace`：添加工作区内部依赖
- `changeset add`：创建变更集，记录代码改动
- `changeset version`：消耗变更集，更新版本号和 CHANGELOG
- `changeset publish`：发布包到 npm 并自动打上 Git 标签

### 下一步学习

- 深入学习 Changesets 高级配置
- 探索 Turborepo 等构建工具
- 学习大型项目的 Monorepo 架构设计
- 实践 CI/CD 自动化流程优化
