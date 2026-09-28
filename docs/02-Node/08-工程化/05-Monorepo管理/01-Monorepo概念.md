---
title: Monorepo
description: Monorepo 的动机、目录结构与依赖拓扑管理
keywords: [Node.js, 构建, 脚手架, Monorepo]
category: Node.js
tags: [Node.js, 工程化]
---







# Monorepo

## 介绍

Monorepo（Monolithic Repository）是指将多个项目的代码存储在同一个代码仓库中的开发策略。这些项目虽然在同一个仓库里，但依然可以作为独立的包（package）进行开发、测试和发布。

### 传统多仓库模式的痛点

以 Babel 项目为例。Babel 被拆分为 `@babel/core`、`@babel/cli`、`@babel/parser` 等数十个功能包。如果采用传统的多仓库（Multi-repo）模式，每个包都将拥有独立的 Git 仓库，这会带来一系列问题：

- **工程化配置冗余**：每个仓库都需要独立的构建、Lint、测试等工程化配置，导致大量重复工作
- **协作与依赖管理复杂**：当一个包的更新需要依赖另一个包时，开发者必须在多个仓库之间切换，协调不同版本的发布，流程繁琐且容易出错
- **代码共享困难**：公共工具函数、组件库需要在多个仓库间同步，容易出现版本不一致
- **重构成本高**：跨仓库的重构需要协调多个团队，操作复杂且容易遗漏

### Monorepo 的优势

Monorepo 通过将所有相关的包集中管理，有效地解决了这些痛点：

- **统一的工程化配置**：共享构建工具、Lint 规则、测试配置，减少重复工作
- **简化依赖管理**：本地包之间可以直接引用，无需发布到 npm
- **原子化提交**：跨包的修改可以在一个 commit 中完成
- **更好的代码复用**：公共代码更容易被发现和使用
- **统一版本管理**：更容易管理包之间的依赖关系

### 适用场景

Monorepo 特别适合以下场景：

- **组件库项目**：包含多个独立组件包，如 Ant Design、Element Plus
- **工具链项目**：包含核心库、CLI 工具、插件等，如 Babel、Webpack
- **微服务架构**：多个服务共享公共库和工具
- **多产品线项目**：多个产品共享基础架构和业务逻辑

### 不适用场景

以下情况可能不适合使用 Monorepo：

- **完全独立的项目**：项目之间没有代码共享或依赖关系
- **权限隔离需求**：不同项目需要严格的代码访问控制
- **小型团队**：维护成本可能超过收益
- **构建速度敏感**：项目规模过大可能导致 CI/CD 时间过长

## 核心挑战

尽管 Monorepo 优势显著，但它也带来了三大核心技术挑战。几乎所有 Monorepo 工具链（如 Lerna、pnpm、Yarn/NPM Workspaces）的设计初衷，都是为了解决这三个问题：

1.  **本地包依赖管理**：如何在开发环境中高效地链接和管理仓库内的多个包，避免手动 `npm link` 的繁琐操作
2.  **跨包任务执行**：如何自动化地执行跨越多个包的命令（如 `build`、`test`），并确保任务按照正确的依赖拓扑顺序执行
3.  **版本管理与发布**：如何简化多包的版本号管理、`CHANGELOG` 生成，并实现原子化的发布流程，确保依赖更新时相关包也能同步更新

## 快速开始

### 项目初始化

以 pnpm 为例，快速搭建一个 Monorepo 项目：

#### 1. 创建项目结构

```bash
mkdir my-monorepo
cd my-monorepo
```

创建基本目录结构：

```
my-monorepo/
├── packages/
│   ├── core/           # 核心库
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── ui/             # UI 组件库
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── utils/          # 工具库
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── pnpm-workspace.yaml
├── package.json
└── pnpm-lock.yaml
```

#### 2. 配置 workspace

创建 `pnpm-workspace.yaml`：

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

创建根目录 `package.json`：

```json
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "lint": "pnpm -r run lint"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

#### 3. 配置子包

`packages/core/package.json`：

```json
{
  "name": "@my-org/core",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc -w"
  },
  "dependencies": {
    "@my-org/utils": "workspace:*"
  }
}
```

`packages/utils/package.json`：

```json
{
  "name": "@my-org/utils",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc -w"
  }
}
```

`packages/ui/package.json`：

```json
{
  "name": "@my-org/ui",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc -w"
  },
  "dependencies": {
    "@my-org/core": "workspace:*",
    "@my-org/utils": "workspace:*"
  }
}
```

#### 4. 安装依赖

```bash
pnpm install
```

安装完成后，pnpm 会自动创建软链接：

```
node_modules/
├── @my-org/
│   ├── core -> ../../packages/core
│   ├── ui -> ../../packages/ui
│   └── utils -> ../../packages/utils
```

#### 5. 开发与构建

```bash
# 构建所有包（自动按依赖顺序）
pnpm build

# 只构建 core 及其依赖
pnpm --filter "@my-org/core..." run build

# 在开发模式下监听所有包
pnpm -r run dev
```

### 典型工作流程

```
开发阶段                    发布阶段
  │                          │
  ├─ 修改代码                 ├─ 创建 changeset
  │                          │
  ├─ 本地测试                 ├─ 版本提升
  │                          │
  ├─ 提交代码 ────────────────┤
  │                          │
  └─ CI 自动测试              ├─ 生成 CHANGELOG
                             │
                             └─ 发布到 npm
```

## 核心功能详解

### 本地包的高效链接与 workspace

在 Monorepo 环境中，一个包（如 `app`）常常需要依赖同一仓库中的其他包（如 `header` 和 `footer`）。为了让 `app` 在开发时能够实时使用 `header` 和 `footer` 的最新代码，需要一种机制来链接这些本地包。

#### 传统 `npm link` 的困境

在 Monorepo 出现之前，开发者通常使用 `npm link` 来解决本地包依赖问题。其工作流程如下：

1.  在 `header` 包的目录中，执行 `npm link` 注册到全局 `node_modules`
2.  在 `footer` 包的目录中，执行 `npm link` 注册到全局
3.  在 `app` 包的目录中，执行 `npm link header` 和 `npm link footer`，将全局链接的包引入到 `app` 的 `node_modules` 中

这个过程实际上创建了两层软链接（Symbolic Links）：

```
本地包 (packages/header)
    ↓ npm link
全局 node_modules
    ↓ npm link header
项目的 node_modules
```

**存在的问题**：

- **操作繁琐**：需要为每个包手动执行链接命令
- **容易出错**：忘记链接或链接错误的版本
- **难以维护**：新增包时需要重复操作
- **环境不一致**：不同开发者的全局环境可能不同

#### workspace：现代化的解决方案

为了解决 `npm link` 的痛点，现代包管理工具（npm、Yarn、pnpm）引入 `workspace`（工作区）的概念。`workspace` 是一种更高效、更自动化的本地包链接机制。

**核心思想**：在执行 `npm install` 或类似命令时，自动将 `workspace` 中声明的所有包通过软链接的方式链接到项目根目录的 `node_modules` 中。根据 Node.js 的模块解析规则（即逐级向上查找 `node_modules`），任何一个包都可以无缝地引用到 `workspace` 中的其他包。

##### 实际链接结构示例

在一个包含 `a`、`b`、`c` 三个包的 Monorepo 项目中，`workspace` 会创建如下的软链接结构：

```
/my-project
  /node_modules
    /a -> /my-project/packages/a    # 软链接
    /b -> /my-project/packages/b    # 软链接
    /c -> /my-project/packages/c    # 软链接
  /packages
    /a
      /src
        /index.ts
      package.json
    /b
      /src
        /index.ts
      package.json
    /c
      /src
        /index.ts
      package.json
```

**优势**：

- ✅ **自动化**：一次配置，自动链接
- ✅ **实时同步**：修改代码立即生效
- ✅ **环境一致**：所有开发者使用相同的链接方式
- ✅ **依赖管理清晰**：明确声明包之间的依赖关系

#### 主流工具的 workspace 实现

虽然 `workspace` 的理念一致，但不同工具的配置方式和特性略有差异。

##### npm Workspaces

npm 通过在根目录的 `package.json` 文件中添加 `workspaces` 字段来声明工作区。

```json
// package.json
{
  "name": "my-monorepo",
  "private": true,
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
}
```

**配置说明**：

- `"private": true`：根目录不需要发布，避免误操作
- `"workspaces"`：支持 glob 模式匹配多个目录

**常用命令**：

```bash
# 安装所有依赖
npm install

# 在特定包中执行命令
npm run build --workspace=@my-org/core

# 在所有包中执行命令
npm run build --workspaces
```

**注意事项**：

- npm 7+ 才支持 workspace 功能
- 不支持拓扑排序，需要手动管理构建顺序

##### pnpm Workspaces

pnpm 使用独立的 `pnpm-workspace.yaml` 文件来定义工作区。

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - '!**/test/**'  # 排除测试目录
```

**优势特性**：

```json
// packages/app/package.json
{
  "dependencies": {
    "@my-org/utils": "workspace:*",      // 使用最新版本
    "@my-org/core": "workspace:^1.0.0"   // 指定版本范围
  }
}
```

**workspace 协议**：

- `workspace:*`：始终使用工作区内的最新代码
- `workspace:^`：遵循 semver 版本范围
- `workspace:~`：允许补丁版本更新

**常用命令**：

```bash
# 安装依赖
pnpm install

# 递归执行命令（支持拓扑排序）
pnpm -r run build

# 过滤特定包执行
pnpm --filter "@my-org/core..." run build

# 只构建某个包及其依赖项
pnpm --filter "...@my-org/ui" run build
```

**性能优势**：

- 使用硬链接和符号链接节省磁盘空间
- 严格的依赖管理，避免幽灵依赖
- 原生支持拓扑排序

##### Yarn Workspaces

Yarn 的配置方式与 npm 类似：

```json
// package.json
{
  "private": true,
  "workspaces": {
    "packages": ["packages/*"],
    "nohoist": ["**/react-native", "**/react-native/**"]
  }
}
```

**nohoist 配置**：某些包需要保留在包内部的 node_modules 中（如 React Native）。

##### 工具对比

| 特性               | npm Workspaces | pnpm Workspaces | Yarn Workspaces |
| ------------------ | -------------- | --------------- | --------------- |
| 配置文件           | package.json   | .yaml 文件      | package.json    |
| 拓扑排序           | ❌             | ✅              | ✅              |
| 磁盘空间优化       | ❌             | ✅（硬链接）    | ✅（PnP）       |
| 依赖提升控制       | 有限           | ✅              | ✅              |
| workspace 协议     | ❌             | ✅              | ✅              |
| 过滤器支持         | 基础           | ✅（强大）      | 基础            |
| 幽灵依赖问题       | 存在           | ❌              | 可配置          |

**推荐**：对于新项目，推荐使用 pnpm Workspaces，它在性能、安全性和功能完整性方面表现最佳。

### 跨包任务的统一执行

在 Monorepo 中经常需要对多个包执行相同的命令，例如 `build`、`test` 或 `lint`。如果手动进入每个包的目录去执行这些命令，不仅效率低下，而且无法保证正确的执行顺序。

#### 拓扑排序的重要性

**什么是拓扑排序？**

拓扑排序是指根据依赖关系确定任务执行顺序的算法。在 Monorepo 中，如果包 A 依赖包 B，那么在构建时必须先构建 B，再构建 A。

**示例场景**：

```
依赖关系：
  app → header
  app → footer
  header → utils
  footer → utils

正确的构建顺序：
  1. utils（无依赖）
  2. header（依赖 utils）
  3. footer（依赖 utils）
  4. app（依赖 header 和 footer）
```

#### Lerna 的任务执行

Lerna 是最早解决这一问题的工具之一。它提供 `lerna run` 命令，可以按照包的依赖关系，智能地执行任务。

```bash
lerna run build
```

当执行上述命令时，Lerna 会：

1.  **解析依赖图**：分析所有包之间的依赖关系，构建出拓扑结构
2.  **按拓扑排序执行**：按照正确的顺序执行每个包中 `package.json` 里定义的 `build` 脚本
3.  **并行与缓存**：对于没有直接依赖关系的包，Lerna 会并行执行它们的任务以提高效率

**并行执行示例**：

```
时间线：
  0s  ─────────────────────────────────
       ├─ utils (开始)
  2s   └─ utils (完成)
       ├─ header (开始)  ├─ footer (开始)  ← 并行执行
  4s   └─ header (完成) └─ footer (完成)
       ├─ app (开始)
  6s   └─ app (完成)
```

#### pnpm 的递归执行

pnpm 通过 `-r`（recursive）标志来递归执行命令，并默认支持拓扑排序。

```bash
# 构建所有包
pnpm -r run build

# 并行构建（不等待依赖）
pnpm -r --parallel run build

# 串行构建（将并发数设为 1，pnpm 无 --serial 选项）
pnpm -r --workspace-concurrency=1 run build
```

**高级过滤功能**：

```bash
# 只构建特定包及其依赖
pnpm --filter "@my-org/ui..." run build

# 构建依赖于特定包的所有包
pnpm --filter "...@my-org/utils" run build

# 构建有变化的包（Git 支持）
pnpm --filter "[origin/main]" run build

# 排除某些包
pnpm --filter "!@my-org/docs" run build
```

#### npm 的命令执行

npm 提供 `--workspaces` 标志来在所有包中执行命令：

```bash
# 在所有包中执行
npm run build --workspaces

# 在特定包中执行
npm run build --workspace=@my-org/core --workspace=@my-org/utils
```

**注意**：npm 的 `workspace` 命令执行**不支持拓扑排序**，它会按照包在文件系统中的顺序执行，这在有依赖关系的项目中可能导致问题。

#### 命令执行对比

| 工具  | 拓扑排序 | 并行执行 | 过滤功能 | 缓存支持 |
| ----- | -------- | -------- | -------- | -------- |
| Lerna | ✅       | ✅       | ✅       | ✅       |
| pnpm  | ✅       | ✅       | ✅✅      | ❌       |
| npm   | ❌       | ❌       | 基础     | ❌       |
| Yarn  | ✅       | ✅       | 基础     | ✅       |

### 自动化的版本管理与发布

版本管理与发布是 Monorepo 工作流中最为复杂的一环。当一个包更新后，需要：

1.  **确定版本号**：根据 [Semantic Versioning](https://semver.org/)（语义化版本）规范，决定是升级主版本（Major）、次版本（Minor）还是补丁版本（Patch）
2.  **更新依赖**：找到所有依赖该包的其他包，并更新它们的 `package.json` 文件中的版本号
3.  **生成 `CHANGELOG`**：为每个更新的包生成变更日志，记录本次发布的新功能、修复的 Bug 等
4.  **创建 Git 标签**：为每个发布的包在 Git 中打上版本标签
5.  **发布到 npm**：将更新后的包发布到 npm 仓库

手动完成这些操作不仅耗时，而且极易出错。因此，自动化的版本管理与发布工具对 Monorepo 至关重要。

#### Changesets：分布式版本管理

[Changesets](https://github.com/changesets/changesets) 是专注于 Monorepo 版本管理的工具，它通过将"版本意图"与"版本发布"分离，提供一套非常优雅和灵活的工作流。

**核心思想**：开发者在提交代码时，随同代码一起提交一个描述变更的 "changeset" 文件。这个文件记录了本次变更将影响哪些包，以及每个包应该进行何种类型的版本升级（Major, Minor, 或 Patch）。

##### 工作流程

```
开发阶段                    发布阶段
  │                          │
  ├─ 修改代码                 ├─ npx changeset version
  │                          │  (更新版本号)
  ├─ npx changeset add ──────┤
  │  (创建变更集)             ├─ 生成 CHANGELOG
  │                          │
  └─ 提交到 Git               ├─ 删除变更集文件
                             │
                             └─ npx changeset publish
                                (发布到 npm)
```

##### 初始化配置

```bash
# 安装
pnpm add -Dw @changesets/cli

# 初始化
pnpm changeset init
```

创建的配置文件 `.changeset/config.json`：

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "restricted",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

**重要配置项说明**：

- `access`：发布访问权限（`restricted` 私有包，`public` 公开包）
- `baseBranch`：基础分支名称
- `updateInternalDependencies`：内部依赖更新策略（`patch` 或 `minor`）
- `fixed`：版本号固定在一起的包组
- `linked`：版本号关联的包组

##### 创建变更集

当完成一个功能或修复一个 Bug 后，运行：

```bash
npx changeset add
```

Changesets 会启动交互式命令行界面：

```bash
? Which packages would you like to include? (Press <space> to select)
❯◉ @my-org/core
 ◯ @my-org/utils
 ◉ @my-org/ui

? What kind of change is this for @my-org/core? (current version is 1.0.0)
❯ patch  (1.0.1)
  minor  (1.1.0) 
  major  (2.0.0)

? What kind of change is this for @my-org/ui? (current version is 1.0.0)
❯ patch  (1.0.1)
  minor  (1.1.0) 
  major  (2.0.0)

? Please enter a summary for this change:
│ Add new feature for core and ui components
```

生成的变更集文件 `.changeset/cold-animals-hug.md`：

```markdown
---
"@my-org/core": patch
"@my-org/ui": patch
---

Add new feature for core and ui components
```

##### 版本提升

当准备发布时，运行：

```bash
npx changeset version
```

Changesets 会：

1.  **聚合变更集**：读取 `.changeset` 目录下的所有变更集文件
2.  **更新版本号**：根据变更集中的信息，自动更新所有相关包的 `package.json` 中的版本号
3.  **生成 `CHANGELOG.md`**：为每个更新的包生成或更新 `CHANGELOG.md` 文件

生成的 `CHANGELOG.md` 示例：

```markdown
# @my-org/core

## 1.0.1

### Patch Changes

- Add new feature for core and ui components

## 1.0.0

### Major Changes

- Initial release
```

##### 发布

```bash
npx changeset publish
```

这个命令会：

- 将更新的包发布到 npm
- 为每个发布的包创建 Git 标签（如 `@my-org/core@1.0.1`）

##### CI/CD 集成

使用 GitHub Actions 自动化发布：

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install
      
      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm changeset publish
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

#### Lerna 的版本管理

Lerna 也内置了一套强大的版本管理系统。

##### 配置文件

```json
// lerna.json
{
  "version": "independent",  // 或 "fixed"
  "npmClient": "pnpm",
  "command": {
    "version": {
      "conventionalCommits": true,
      "message": "chore(release): publish"
    },
    "publish": {
      "registry": "https://registry.npmjs.org/"
    }
  }
}
```

**版本策略**：

- `fixed`：所有包使用相同版本号
- `independent`：每个包独立版本号

##### 常用命令

```bash
# 版本提升（交互式）
lerna version

# 自动根据 commit 提升版本
lerna version --conventional-commits

# 发布
lerna publish

# 发布到私有仓库
lerna publish --registry=https://my-private-registry.com
```

#### 工具对比

| 特性           | Changesets         | Lerna              |
| -------------- | ------------------ | ------------------ |
| 工作流模式     | 分布式             | 集中式             |
| CI/CD 集成     | ✅✅                 | ✅                  |
| 变更记录       | 变更集文件         | Git commits        |
| 版本策略       | 独立版本           | 独立/固定版本      |
| 学习曲线       | 中等               | 较低               |
| 社区活跃度     | 高                 | 中等               |
| 推荐场景       | 大型项目、团队协作 | 中小型项目、快速上手 |

**推荐**：Changesets 已成为社区中最受欢迎的 Monorepo 版本管理工具，特别适合团队协作和 CI/CD 流程。

## 工具链生态与最佳实践

### 工具抉择

在选择 Monorepo 工具链时，需要考虑项目规模、团队习惯、性能需求等因素。

#### 主流方案对比

**方案一：pnpm + Changesets**

```json
// package.json
{
  "devDependencies": {
    "@changesets/cli": "^2.26.0"
  }
}
```

**优势**：

- ✅ 现代化、高性能
- ✅ 严格的依赖管理
- ✅ 优秀的 CI/CD 集成
- ✅ 灵活的版本管理
- ✅ 节省磁盘空间

**适合**：新项目、中大型项目、注重性能的团队

**方案二：Lerna**

```bash
npm install -D lerna
npx lerna init
```

**优势**：

- ✅ 一体化解决方案
- ✅ 成熟的生态系统
- ✅ 强大的缓存机制
- ✅ 分布式任务执行

**适合**：大型企业级项目、需要极致性能优化的场景

**方案三：npm Workspaces**

```json
// package.json
{
  "workspaces": ["packages/*"]
}
```

**优势**：

- ✅ 无需额外工具
- ✅ 简单易用
- ✅ 官方支持

**劣势**：

- ❌ 功能有限
- ❌ 不支持拓扑排序
- ❌ 缺乏版本管理工具

**适合**：小型项目、快速原型开发

#### 功能对比矩阵

| 核心功能           | Lerna + pnpm      | pnpm + Changesets | npm Workspaces |
| ------------------ | ----------------- | ----------------- | -------------- |
| **本地包链接**     | ✅                | ✅                | ✅             |
| **跨包任务执行**   | ✅ (`lerna run`)  | ✅ (`pnpm -r`)    | ⚠️ (基础)      |
| **拓扑排序**       | ✅                | ✅                | ❌             |
| **版本管理**       | ✅ (`lerna`)      | ✅ (`changesets`) | ❌             |
| **任务缓存**       | ✅✅                | ❌                | ❌             |
| **分布式执行**     | ✅                | ❌                | ❌             |
| **磁盘空间优化**   | ✅                | ✅✅                | ❌             |
| **学习曲线**       | 中等              | 中等              | 低             |

### 选型建议

#### 按项目规模

```
项目规模     推荐方案
────────────────────────────
小型         npm Workspaces
中型         pnpm + Changesets
大型         Lerna + pnpm
超大型       Lerna + Nx Cloud
```

#### 按团队需求

- **快速上手**：npm Workspaces
- **严格依赖管理**：pnpm + Changesets
- **性能优先**：Lerna（启用缓存）
- **团队协作**：pnpm + Changesets
- **CI/CD 集成**：pnpm + Changesets + GitHub Actions

### 最佳实践案例

#### 目录结构最佳实践

```
my-monorepo/
├── .changeset/              # Changesets 配置
│   ├── config.json
│   └── README.md
├── .github/
│   └── workflows/
│       ├── ci.yml          # CI 流程
│       └── release.yml     # 发布流程
├── packages/               # 公共包
│   ├── core/
│   ├── utils/
│   └── ui/
├── apps/                   # 应用程序
│   ├── web/
│   ├── mobile/
│   └── docs/
├── tools/                  # 开发工具
│   ├── scripts/
│   └── config/
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json      # 共享 TypeScript 配置
├── .eslintrc.base.js       # 共享 ESLint 配置
└── README.md
```

#### 共享配置

**TypeScript 共享配置**：

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

```json
// packages/core/tsconfig.json
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

**ESLint 共享配置**：

```javascript
// .eslintrc.base.js
module.exports = {
  root: true,
  env: {
    node: true,
    es2020: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
}
```

#### 脚本管理

```json
// package.json（根目录）
{
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "lint": "pnpm -r run lint",
    "clean": "pnpm -r run clean",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "changeset publish"
  }
}
```

```json
// packages/core/package.json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc -w",
    "test": "jest",
    "lint": "eslint src --ext .ts",
    "clean": "rm -rf dist"
  }
}
```

## 性能优化

### 构建性能优化

#### 1. 增量构建

使用构建工具的增量构建功能：

```json
// packages/core/package.json
{
  "scripts": {
    "build": "tsc --incremental",
    "dev": "tsc -w"
  }
}
```

#### 2. 并行构建

```bash
# pnpm 并行构建
pnpm -r --parallel run build

# Lerna 并行构建
lerna run build --parallel
```

**注意**：只在包之间无依赖时使用并行构建。

#### 3. 构建缓存

使用 Lerna 的任务缓存：

```json
// lerna.json
{
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx",
      "options": {
        "cacheableOperations": ["build", "test", "lint"],
        "cacheDirectory": ".cache/nx"
      }
    }
  }
}
```

**效果**：

```
首次构建：  全部执行（3分钟）
二次构建（无修改）：命中缓存（5秒）
修改一个包：只构建受影响的包（30秒）
```

#### 4. 使用 Turborepo

对于大型项目，考虑使用 Turborepo：

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    }
  }
}
```

**优势**：

- 智能缓存
- 远程缓存
- 增量构建
- 并行执行

### 依赖安装优化

#### 1. 使用 pnpm 的优势

```
传统 npm：
  项目A: 1GB node_modules
  项目B: 1GB node_modules
  项目C: 1GB node_modules
  总计: 3GB

pnpm（硬链接）：
  全局存储: 500MB
  项目A -> 全局存储（硬链接）
  项目B -> 全局存储（硬链接）
  项目C -> 全局存储（硬链接）
  总计: 500MB + 少量元数据
```

#### 2. 依赖提升策略

```yaml
# .npmrc
shamefully-hoist=true           # 提升所有依赖
node-linker=hoisted             # 使用 npm 风格的提升
```

**权衡**：

- 严格模式（默认）：避免幽灵依赖，但可能需要调整代码
- 提升模式：兼容性更好，但可能隐藏依赖问题

#### 3. 忽略特定依赖

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - '!**/test/**'              # 排除测试目录
```

### CI/CD 优化

#### 1. 缓存依赖

```yaml
# .github/workflows/ci.yml
- name: Cache pnpm modules
  uses: actions/cache@v3
  with:
    path: ~/.local/share/pnpm/store  # Linux 默认路径（macOS 为 ~/Library/pnpm/store）
    key: ${{ runner.os }}-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-
```

#### 2. 只构建变化的包

```yaml
- name: Build affected packages
  run: pnpm --filter "[origin/main]" run build
```

#### 3. 使用矩阵构建

```yaml
strategy:
  matrix:
    package: [core, ui, utils]
steps:
  - name: Build ${{ matrix.package }}
    run: pnpm --filter "@my-org/${{ matrix.package }}" run build
```

### 性能监控

#### 构建时间分析

```bash
# 使用 time 命令
time pnpm build

# 使用 Nx 的分析工具
npx nx graph
```

#### 依赖图可视化

```bash
# Lerna
npx lerna graph

# pnpm
pnpm list --depth=0 --json | npx dependency-cruiser -

# Nx
npx nx graph
```

## 常见问题

### 1. 依赖版本冲突

**问题**：不同包依赖同一个第三方库的不同版本。

**解决方案**：

```json
// 根目录 package.json
{
  "pnpm": {
    "overrides": {
      "lodash": "^4.17.21"
    }
  }
}
```

或使用 workspace 协议统一版本：

```json
{
  "dependencies": {
    "lodash": "workspace:*"
  }
}
```

### 2. 循环依赖

**问题**：包 A 依赖 B，B 又依赖 A。

**检测**：

```bash
# 使用 madge 检测
npx madge --circular packages/
```

**解决方案**：

- 提取公共代码到第三个包
- 重构代码结构，消除循环依赖
- 使用依赖注入

### 3. 幽灵依赖

**问题**：包 A 能引用包 B 的依赖，但 A 的 `package.json` 中没有声明。

**在 pnpm 中的表现**：

```javascript
// 包 A 的代码
import 'lodash'  // ❌ 错误：找不到模块

// 即使 lodash 在包 B 中安装了，包 A 也无法访问
```

**解决方案**：

```json
// 在包 A 的 package.json 中显式声明
{
  "dependencies": {
    "lodash": "^4.17.21"
  }
}
```

**或者使用提升模式**：

```yaml
# .npmrc
shamefully-hoist=true
```

### 4. 发布失败

**问题**：`npm publish` 失败，提示权限错误。

**解决方案**：

```bash
# 1. 检查登录状态
npm whoami

# 2. 重新登录
npm login

# 3. 检查包名是否已被占用
npm search @my-org/core

# 4. 使用正确的 registry
npm config set registry https://registry.npmjs.org/
```

对于私有包：

```json
// package.json
{
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  }
}
```

### 5. 本地包引用不生效

**问题**：修改了本地包的代码，但引用的包没有更新。

**解决方案**：

```bash
# 方案1: 重新安装依赖
rm -rf node_modules
pnpm install

# 方案2: 使用开发模式监听变化
pnpm -r run dev

# 方案3: 手动构建受影响的包
pnpm --filter "...@my-org/utils" run build
```

### 6. 版本号混乱

**问题**：多个包的版本号不一致，难以管理。

**解决方案**：使用 Changesets 的固定版本策略。

```json
// .changeset/config.json
{
  "fixed": [["@my-org/core", "@my-org/ui", "@my-org/utils"]]
}
```

这样这些包会保持相同的版本号。

### 7. CI/CD 时间过长

**问题**：每次 CI 都要构建所有包，时间太长。

**解决方案**：

```yaml
# 只测试变化的包
- name: Test affected packages
  run: pnpm --filter "[origin/main]" run test

# 使用缓存
- uses: actions/cache@v3
  with:
    path: .cache
    key: ${{ hashFiles('**/pnpm-lock.yaml') }}
```

或使用 Turborepo 的远程缓存：

```yaml
- name: Turbo Remote Cache
  run: pnpm turbo build --token=${{ secrets.TURBO_TOKEN }}
```

### 8. TypeScript 路径映射问题

**问题**：TypeScript 无法正确解析 workspace 包。

**解决方案**：

```json
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@my-org/*": ["packages/*/src"]
    }
  },
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/ui" }
  ]
}
```

### 9. Git 忽略文件处理

**问题**：应该提交哪些文件到 Git？

**最佳实践**：

```gitignore
# .gitignore

# 依赖
node_modules/
.pnpm-store/

# 构建产物
dist/
*.tsbuildinfo

# 日志
*.log
npm-debug.log*

# 环境变量
.env
.env.local

# 编辑器
.vscode/
.idea/

# 操作系统
.DS_Store
Thumbs.db

# 测试覆盖率
coverage/

# 缓存
.cache/
.turbo/
```

**应该提交**：

- ✅ `pnpm-lock.yaml`
- ✅ `.changeset/` 目录下的变更集文件
- ✅ 共享配置文件

**不应该提交**：

- ❌ `node_modules/`
- ❌ 各包的 `dist/` 目录
- ❌ `.cache/` 缓存目录

### 10. 私有包管理

**问题**：如何在 Monorepo 中管理私有包？

**解决方案**：

```json
// package.json
{
  "name": "@my-org/private-package",
  "private": true,              // 标记为私有
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  }
}
```

或使用 `.npmrc`：

```ini
# .npmrc
@my-org:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

## 故障排查

### 常见错误及解决方案

#### 1. `ERR_PNPM_NO_MATCHING_VERSION`

**错误信息**：

```
ERR_PNPM_NO_MATCHING_VERSION  No matching version found for @my-org/core@workspace:*
```

**原因**：workspace 中找不到指定的包。

**排查步骤**：

```bash
# 1. 检查包名是否正确
cat packages/core/package.json | grep "name"

# 2. 检查 workspace 配置
cat pnpm-workspace.yaml

# 3. 重新安装依赖
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### 2. `ERESOLVE unable to resolve dependency tree`

**错误信息**：

```
ERESOLVE unable to resolve dependency tree
```

**原因**：依赖版本冲突。

**解决方案**：

```bash
# 方案1: 使用 --force 强制安装
pnpm install --force

# 方案2: 清理缓存后重装
pnpm store prune
pnpm install

# 方案3: 检查并修复 lockfile
pnpm install --no-frozen-lockfile
```

#### 3. `lerna ERR! EUNCOMMIT`

**错误信息**：

```
lerna ERR! EUNCOMMIT Working tree has uncommitted changes
```

**原因**：Lerna 发布时要求工作区干净。

**解决方案**：

```bash
# 1. 提交或暂存更改
git add .
git commit -m "chore: commit before release"

# 或暂存
git stash

# 2. 发布
lerna publish

# 3. 恢复暂存（如果需要）
git stash pop
```

#### 4. Changeset 版本号不更新

**问题**：运行 `changeset version` 后版本号没有变化。

**排查步骤**：

```bash
# 1. 检查是否有变更集文件
ls .changeset/*.md

# 2. 检查变更集内容
cat .changeset/*.md

# 3. 确认包名正确
cat packages/*/package.json | grep "name"
```

**注意**：变更集文件中列出的包名必须与 `package.json` 中的 `name` 完全一致。

#### 5. `Module not found` 错误

**错误信息**：

```
Error: Cannot find module '@my-org/core'
```

**排查步骤**：

```bash
# 1. 检查包是否已链接
ls -la node_modules/@my-org/core

# 2. 检查包是否已构建
ls packages/core/dist

# 3. 检查 package.json 的 main 字段
cat packages/core/package.json | grep "main"

# 4. 重新链接
pnpm install
```

#### 6. Git hooks 不生效

**问题**：配置了 husky 但 hooks 不执行。

**解决方案**：

```bash
# 1. 重新安装 husky
pnpm add -Dw husky

# 2. 初始化 husky（v9）
npx husky init

# 3. 编辑 hook 文件（v9 移除了 husky add，直接写入命令）
echo "pnpm lint-staged" > .husky/pre-commit

# 4. 确保 package.json 有 prepare 脚本（v9 用法）
# package.json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

### 调试技巧

#### 1. 查看依赖图

```bash
# pnpm
pnpm list --depth=0 --json | jq

# 使用依赖图可视化
npx lerna graph
```

#### 2. 查看实际执行的命令

```bash
# 使用 --dry-run 参数
lerna publish --dry-run

# changesets 可用 status 预览待发布的包（无 --dry-run 选项）
changeset status
```

#### 3. 详细日志输出

```bash
# Lerna 详细模式
lerna run build --loglevel verbose

# pnpm 详细模式
pnpm install --reporter=default
```

#### 4. 检查软链接

```bash
# macOS/Linux
ls -la node_modules/@my-org/

# Windows
dir node_modules\@my-org\ /AL
```

### 重置 Monorepo

如果遇到无法解决的问题，可以尝试完全重置：

```bash
#!/bin/bash
# reset-monorepo.sh

# 删除所有 node_modules
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +

# 删除所有构建产物
find . -name "dist" -type d -prune -exec rm -rf '{}' +
find . -name "*.tsbuildinfo" -type f -delete

# 删除 lockfile
rm -f pnpm-lock.yaml

# 删除缓存
rm -rf .cache
rm -rf .turbo
rm -rf .nx

# 重新安装
pnpm install

# 重新构建
pnpm build
```

---

## 总结

Monorepo 是一种强大的代码组织方式，特别适合需要管理多个相关包的项目。通过合理使用 workspace、版本管理工具和构建优化策略，可以显著提升开发效率和代码质量。

**关键要点**：

1.  **选择合适的工具链**：pnpm + Changesets 适合大多数项目
2.  **优化构建流程**：使用缓存、增量构建、并行执行
3.  **规范版本管理**：统一使用 Changesets 管理版本和发布
4.  **重视性能优化**：定期分析构建时间，优化 CI/CD 流程
5.  **保持良好的开发习惯**：及时提交变更集、规范提交信息、定期清理依赖

**学习资源**：

- [pnpm 官方文档](https://pnpm.io/)
- [Changesets 官方文档](https://github.com/changesets/changesets)
- [Lerna 官方文档](https://lerna.js.org/)
- [Turborepo 官方文档](https://turbo.build/)
- [Nx 官方文档](https://nx.dev/)
