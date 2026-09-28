---
title: Lerna 与 Turborepo 实战指南
description: Lerna 的包版本管理与 Turbo 的任务编排/远程缓存对比
keywords: [Node.js, 构建, 脚手架, Lerna, Turbo]
category: Node.js
tags: [Node.js, 工程化]
---







# Lerna 与 Turborepo 实战指南

## 概述

在现代前端开发中，Monorepo（单一代码仓库）已成为管理大型项目的流行方式。Lerna、Turborepo 和 Nx 是三个主流的 Monorepo 管理工具，它们各有侧重：

- **Lerna**：专注于版本管理和发布流程
- **Turborepo**：专注于构建性能和任务调度
- **Nx**：全功能的构建系统，包含代码生成和项目迁移

### 工具定位

```
┌─────────────────────────────────────────────┐
│           Monorepo 工具生态                   │
├─────────────────────────────────────────────┤
│                                             │
│  Lerna          Turborepo         Nx       │
│  ↓              ↓                 ↓         │
│  版本管理       构建性能          全栈开发    │
│  发布流程       任务调度          代码生成    │
│  依赖管理       增量构建          项目迁移    │
│                                             │
└─────────────────────────────────────────────┘
```

### 使用场景

| 工具 | 最适合的场景 |
|------|------------|
| Lerna | 需要强大的版本管理和发布功能的库项目 |
| Turborepo | 需要极致构建性能的前端应用项目 |
| Nx | 需要代码生成和项目模板的全栈项目 |
| Lerna + Turborepo | 既需要版本管理又需要高性能构建的大型项目 |

---

## Lerna 详解

### 介绍

Lerna 是一个用于管理 JavaScript 多包项目的工具，优化使用 Git 和 npm 管理多包仓库的工作流。它特别适合需要管理多个独立包并统一发布的项目。

#### 核心优势

- **版本管理**：支持固定模式和独立模式两种版本策略
- **发布自动化**：自动更新依赖、生成 CHANGELOG、创建 Git 标签
- **依赖管理**：简化包之间的依赖关系管理
- **工作流优化**：统一的构建、测试、发布流程

#### 适用场景

- ✅ 组件库项目（如 Ant Design）
- ✅ 工具链项目（如 Babel）
- ✅ 需要独立版本管理的多包项目
- ✅ 需要自动化发布流程的团队

### 核心功能

#### 1. 版本管理

```
Fixed Mode (固定模式)
├── 所有包使用相同版本号
├── 适合高度耦合的项目
└── 示例：1.0.0 → 1.1.0 (所有包)

Independent Mode (独立模式)
├── 每个包独立版本号
├── 适合松散耦合的项目
└── 示例：
    ├── @myorg/core: 1.0.0
    ├── @myorg/cli: 2.1.0
    └── @myorg/utils: 0.5.0
```

#### 2. 依赖管理

```bash
# 内部依赖自动链接
packages/
├── core/
│   └── node_modules/
│       └── @myorg/utils → ../../utils
└── cli/
    └── node_modules/
        └── @myorg/core → ../../core
```

#### 3. 发布流程

```
代码修改
  ↓
lerna version
  ├─ 更新版本号
  ├─ 更新依赖
  ├─ 生成 CHANGELOG
  └─ 创建 Git 标签
  ↓
lerna publish
  └─ 发布到 npm
```

### 安装与初始化

#### 安装

```bash
# 使用 pnpm 安装
pnpm add lerna -D -w

# 使用 npm 安装
npm install lerna --save-dev

# 全局安装（可选）
npm install -g lerna
```

#### 初始化

```bash
# 创建新的 Lerna 项目
npx lerna init

# 使用独立版本模式
npx lerna init --independent

# 使用 pnpm 作为包管理器
npx lerna init --npm-client=pnpm
```

#### 项目结构

初始化后的目录结构：

```
my-lerna-repo/
├── packages/              # 包目录
│   ├── core/             # 核心包
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── cli/              # CLI 包
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── utils/            # 工具包
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
├── lerna.json            # Lerna 配置
├── package.json          # 根配置
├── pnpm-workspace.yaml   # pnpm workspace 配置（如果使用 pnpm）
└── .gitignore
```

### 配置详解

#### lerna.json 完整配置

```json
{
  "$schema": "node_modules/lerna/schemas/lerna-schema.json",
  "version": "independent",
  "npmClient": "pnpm",
  "packages": ["packages/*"],
  "useWorkspaces": true,
  "command": {
    "version": {
      "allowBranch": "main",
      "conventionalCommits": true,
      "exact": true,
      "message": "chore(release): publish",
      "push": true,
      "tagVersionPrefix": "v"
    },
    "publish": {
      "conventionalCommits": true,
      "registry": "https://registry.npmjs.org/",
      "access": "public"
    }
  },
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    }
  }
}
```

#### 配置参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `version` | string | "0.0.0" | 版本模式：<br>- `independent`：独立版本<br>- `x.x.x`：固定版本号 |
| `npmClient` | string | "npm" | 包管理器（npm、yarn、pnpm） |
| `packages` | string[] | ["packages/*"] | 包的位置 |
| `useWorkspaces` | boolean | false | 是否使用 workspaces |
| `command.version.allowBranch` | string | "*" | 允许执行 version 的分支 |
| `command.version.conventionalCommits` | boolean | false | 使用 conventional commits 自动确定版本 |
| `command.publish.registry` | string | "https://registry.npmjs.org/" | npm 仓库地址 |
| `command.publish.access` | string | "restricted" | 发布权限（public/restricted） |

#### 版本策略对比

##### 固定模式（Fixed Mode）

```json
{
  "version": "1.0.0"
}
```

**特点**：
- 所有包使用相同版本号
- 一次发布更新所有包版本
- 适合高度耦合的项目

**示例**：

```
初始状态：
├── @myorg/core@1.0.0
├── @myorg/cli@1.0.0
└── @myorg/utils@1.0.0

修改 core 后发布：
├── @myorg/core@1.1.0  (修改)
├── @myorg/cli@1.1.0   (未修改，但版本号同步更新)
└── @myorg/utils@1.1.0 (未修改，但版本号同步更新)
```

##### 独立模式（Independent Mode）

```json
{
  "version": "independent"
}
```

**特点**：
- 每个包独立版本号
- 只更新有变化的包
- 适合松散耦合的项目

**示例**：

```
初始状态：
├── @myorg/core@1.0.0
├── @myorg/cli@2.0.0
└── @myorg/utils@0.5.0

修改 core 后发布：
├── @myorg/core@1.1.0  (修改)
├── @myorg/cli@2.0.0   (未修改，版本号不变)
└── @myorg/utils@0.5.0 (未修改，版本号不变)
```

### 常用命令

#### 创建包

```bash
# 创建新包
npx lerna create @myorg/core

# 创建包并指定位置
npx lerna create @myorg/core packages/libs

# 创建包时指定依赖
npx lerna create @myorg/cli --dependencies lodash,commander

# 创建私有包
npx lerna create @myorg/internal --private
```

#### 安装依赖

> **注**：`lerna add` 与 `lerna bootstrap` 已在 Lerna 8 中移除，Lerna 官方建议直接使用包管理器的 workspace 命令管理依赖（如 `pnpm --filter @myorg/cli add @myorg/core --workspace`）。以下命令适用于 Lerna 7 及更早版本。

```bash
# 为所有包安装依赖
lerna add lodash

# 为特定包安装依赖
lerna add lodash --scope=@myorg/core

# 安装开发依赖
lerna add typescript --scope=@myorg/core --dev

# 添加内部依赖
lerna add @myorg/core --scope=@myorg/cli

# 安装特定版本
lerna add lodash@4.17.21 --scope=@myorg/core
```

#### 运行脚本

```bash
# 在所有包中运行脚本
lerna run build

# 并行运行（提高速度）
lerna run build --parallel

# 指定包运行
lerna run build --scope=@myorg/core

# 排除特定包
lerna run build --ignore=@myorg/docs

# 流式输出（查看执行顺序）
lerna run build --stream

# 查看详细日志
lerna run build --verbose

# 运行 npm script 并传参
lerna run test -- --coverage

# 只运行有变化的包
lerna run build --since origin/main
```

#### 其他命令

```bash
# 清理所有包的 node_modules
lerna clean

# 引导项目（安装依赖和链接内部包，Lerna 8 已移除，用包管理器安装代替）
lerna bootstrap

# 查看包列表
lerna list
lerna list --long
lerna list --json

# 查看包之间的依赖关系
lerna graph

# 执行 shell 命令
lerna exec -- rm -rf node_modules
lerna exec --scope=@myorg/core -- ls dist

# 查看有变化的包
lerna changed
lerna changed --json
```

### 版本管理

#### 交互式版本更新

```bash
# 交互式选择版本号
lerna version

# 自动根据 commit 确定版本
lerna version --conventional-commits

# 强制指定版本类型
lerna version major      # 主版本
lerna version minor      # 次版本
lerna version patch      # 补丁版本

# 预发布版本
lerna version prerelease
lerna version prepatch
lerna version preminor
lerna version premajor
```

#### 版本更新流程

```
1. 检测变化的包
   lerna changed
   ↓
2. 选择版本类型
   Major/Minor/Patch
   ↓
3. 更新版本号
   - package.json
   - 依赖关系
   ↓
4. 生成 CHANGELOG
   - CHANGELOG.md
   ↓
5. 创建 Git 提交
   - git commit
   - git tag
   ↓
6. 推送到远程
   git push
```

#### Conventional Commits 配置

```json
// lerna.json
{
  "command": {
    "version": {
      "conventionalCommits": true,
      "conventionalCommitsConfig": {
        "preset": "angular",
        "message": "chore(release): publish"
      }
    }
  }
}
```

**Commit 格式**：

```
feat: 新功能          → Minor 版本
fix: 修复 bug         → Patch 版本
feat!: 破坏性变更     → Major 版本
docs: 文档更新        → 不发布
chore: 其他修改       → 不发布
```

### 发布管理

#### 发布命令

```bash
# 发布所有有变化的包
lerna publish

# 发布特定版本
lerna publish 1.0.1

# 发布到 npm
lerna publish from-package

# 发布到私有仓库
lerna publish --registry=https://my-registry.com

# 发布预发布版本
lerna publish --dist-tag=beta

# 发布时跳过 Git 操作
lerna publish --no-git-tag-version
lerna publish --no-push

# 发布前确认
lerna publish --yes=false
```

#### 发布配置

```json
// packages/core/package.json
{
  "name": "@myorg/core",
  "version": "1.0.0",
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/",
    "tag": "latest"
  },
  "files": [
    "dist",
    "README.md"
  ]
}
```

#### 发布流程图

```
本地代码
  ↓
lerna version
  ↓
Git Commit & Tag
  ↓
lerna publish
  ├─ 检查 package.json
  ├─ 检查 Git 状态
  ├─ 构建产物
  ├─ 发布到 npm
  └─ 创建 Git 标签
  ↓
npm 发布成功
```

### 任务缓存

Lerna 6.6+ 集成了 Nx 的任务调度能力，支持任务缓存。

#### 配置任务缓存

```json
// lerna.json
{
  "version": "independent",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"],
      "cache": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "cache": true
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

#### 任务依赖说明

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],  // ^ 表示先构建依赖的包
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],   // 当前包先构建
      "outputs": []
    }
  }
}
```

**依赖符号说明**：

- `^build`：拓扑依赖，先执行依赖包的 build
- `build`：当前包的 build 任务

#### 缓存效果

```bash
# 首次构建
lerna run build
# 执行所有包的 build，耗时 3 分钟

# 无修改，再次构建
lerna run build
# 命中缓存，耗时 5 秒

# 修改一个包
# 只重新构建受影响的包
```

---

## Turborepo 详解

### 介绍

Turborepo 是一个用于 JavaScript/TypeScript monorepo 的高性能构建系统，具有智能任务调度和远程缓存功能。它专注于提升构建性能，特别适合大型前端项目。

#### 核心优势

- **极快的构建速度**：智能任务调度和并行执行
- **远程缓存**：团队共享构建缓存，避免重复工作
- **增量构建**：只构建有变化的部分
- **零配置**：自动检测项目结构

#### 适用场景

- ✅ 大型前端应用项目
- ✅ 需要优化 CI/CD 构建时间
- ✅ 多团队协作的大型 Monorepo
- ✅ 需要远程缓存共享的项目

### 核心特性

#### 1. 智能任务调度

```
传统构建：
Package A: ████████ (8s)
Package B:          ████████ (8s)
Package C:                  ████████ (8s)
总时间: 24s

Turborepo 并行构建：
Package A: ████████ (8s)
Package B: ████████ (8s)  ← 并行
Package C: ████████ (8s)  ← 并行
总时间: 8s
```

#### 2. 增量构建

```bash
# 只构建有变化的包及其依赖者
turbo run build --filter=[origin/main]

# 文件变化检测
packages/
├── core/     (修改)  → 重新构建
├── cli/      (未修改，依赖 core) → 重新构建
└── utils/    (未修改) → 跳过
```

#### 3. 远程缓存

```
开发者 A 构建项目
  ↓
上传构建缓存到云端
  ↓
开发者 B 拉取代码
  ↓
从云端下载缓存
  ↓
直接使用缓存，无需重新构建
```

### 安装与初始化

#### 安装

```bash
# 使用 pnpm
pnpm add turbo -D -w

# 使用 npm
npm install turbo --save-dev

# 全局安装（可选）
npm install -g turbo
```

#### 初始化

```bash
# 创建新的 Turborepo 项目
npx create-turbo@latest

# 指定包管理器
npx create-turbo@latest --pnpm
npx create-turbo@latest --npm
npx create-turbo@latest --yarn
```

#### 项目结构

```
my-turbo-repo/
├── apps/                  # 应用目录
│   ├── web/              # Web 应用
│   │   ├── src/
│   │   ├── package.json
│   │   └── next.config.js
│   └── docs/             # 文档站点
│       ├── src/
│       └── package.json
├── packages/             # 共享包
│   ├── ui/              # UI 组件库
│   │   ├── src/
│   │   └── package.json
│   ├── tsconfig/        # 共享 TypeScript 配置
│   │   ├── base.json
│   │   └── package.json
│   └── eslint-config/   # 共享 ESLint 配置
│       ├── index.js
│       └── package.json
├── turbo.json           # Turborepo 配置
├── package.json         # 根配置
└── pnpm-workspace.yaml  # pnpm workspace 配置
```

### 配置详解

#### turbo.json 完整配置

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "globalEnv": ["NODE_ENV"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"],
      "outputMode": "new-only"
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "test/**/*.ts"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

#### 配置参数详解

| 参数 | 说明 | 示例 |
|------|------|------|
| `dependsOn` | 任务依赖 | `["^build"]` 表示先执行依赖包的 build |
| `outputs` | 输出目录（用于缓存） | `["dist/**"]` |
| `inputs` | 输入文件（用于判断是否需要重建） | `["src/**/*.ts"]` |
| `outputMode` | 输出模式 | `"new-only"` 只显示新输出 |
| `cache` | 是否启用缓存 | `true` / `false` |
| `persistent` | 是否为持久任务 | `true` / `false` |
| `globalDependencies` | 全局依赖文件 | `["**/.env.*"]` |
| `globalEnv` | 全局环境变量 | `["NODE_ENV"]` |

#### 任务配置详解

##### 构建任务

```json
{
  "build": {
    "dependsOn": ["^build"],           // 拓扑依赖
    "outputs": ["dist/**", ".next/**"], // 缓存输出
    "outputMode": "new-only",          // 只显示新输出
    "inputs": [
      "src/**/*",
      "!src/**/*.test.ts"              // 排除测试文件
    ]
  }
}
```

##### 测试任务

```json
{
  "test": {
    "dependsOn": ["build"],            // 当前包先构建
    "outputs": ["coverage/**"],        // 缓存覆盖率报告
    "inputs": [
      "src/**/*.ts",
      "test/**/*.ts",
      "jest.config.js"
    ]
  }
}
```

##### 开发任务

```json
{
  "dev": {
    "cache": false,                    // 不缓存
    "persistent": true                 // 持久运行
  }
}
```

### 常用命令

#### 基础命令

```bash
# 运行单个任务
turbo run build

# 运行多个任务
turbo run build lint test

# 并行运行
turbo run build lint test --parallel

# 查看任务图
turbo run build --dry=json

# 强制执行（忽略缓存）
turbo run build --force

# 查看详细日志
turbo run build --verbosity=4
```

#### 过滤器命令

```bash
# 过滤特定包
turbo run build --filter=@myorg/core

# 过滤包目录
turbo run build --filter='./packages/*'

# 过滤依赖的包
turbo run build --filter='...@myorg/ui'

# 过滤依赖于某包的包
turbo run build --filter='@myorg/core...'

# 过滤有变化的包
turbo run build --filter='[origin/main]'

# 排除特定包
turbo run build --filter='!@myorg/docs'

# 组合过滤
turbo run build --filter='@myorg/*' --filter='!@myorg/docs'
```

#### 缓存命令

```bash
# 查看缓存信息
turbo run build --summarize

# 清理缓存
turbo run build --force --no-cache

# 使用远程缓存（需先配置 TURBO_TOKEN / TURBO_TEAM 环境变量或 turbo link）
turbo run build --token=$TURBO_TOKEN

# 远程缓存的上传与下载由 turbo 在构建时自动完成，无需手动上传/下载命令
```

#### 调试命令

```bash
# 查看依赖图
turbo run build --dry=json | jq

# 只输出任务图不执行
turbo run build --dry

# 查看执行计划
turbo run build --dry-run

# 详细输出
turbo run build --verbosity=4
```

### 任务编排

#### 任务依赖图

```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],  // 拓扑依赖
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],   // 当前包依赖
      "outputs": []
    },
    "lint": {
      "outputs": []
    }
  }
}
```

**执行顺序**：

```
packages/
├── utils/     (无依赖)
│   └─ build
├── core/      (依赖 utils)
│   └─ build (等待 utils)
└── cli/       (依赖 core)
    └─ build (等待 core)
```

#### 任务类型

##### 拓扑任务

```json
{
  "build": {
    "dependsOn": ["^build"]  // ^ 表示依赖包先构建
  }
}
```

执行顺序：
1. 先构建所有依赖包
2. 再构建当前包

##### 局部任务

```json
{
  "test": {
    "dependsOn": ["build"]  // 无 ^ 表示当前包先构建
  }
}
```

执行顺序：
1. 先执行当前包的 build
2. 再执行当前包的 test

##### 持久任务

```json
{
  "dev": {
    "cache": false,
    "persistent": true  // 长期运行的任务
  }
}
```

特点：
- 不会结束
- 不缓存输出
- 如 dev server、watch 模式

### 远程缓存

#### 配置远程缓存

##### 使用 Vercel

```bash
# 登录 Vercel
turbo login

# 链接项目
turbo link

# 构建时自动使用远程缓存
turbo run build
```

##### 使用自定义缓存服务器

```json
// turbo.json
{
  "remoteCache": {
    "signature": true
  }
}
```

```bash
# 设置远程缓存 URL
export TURBO_API=https://my-cache-server.com

# 设置访问令牌
export TURBO_TOKEN=your-token

# 使用远程缓存
turbo run build
```

#### 远程缓存流程

```
开发者 A:
  ├─ turbo run build
  ├─ 本地缓存构建结果
  └─ 上传缓存到远程服务器

开发者 B:
  ├─ turbo run build
  ├─ 检查远程缓存
  ├─ 发现缓存命中
  ├─ 下载缓存
  └─ 直接使用缓存结果
```

#### CI/CD 集成

```yaml
# .github/workflows/ci.yml
name: CI

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build with remote cache
        run: pnpm turbo run build
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
```

### 性能优化

#### 1. 合理配置输出

```json
{
  "build": {
    "outputs": [
      "dist/**",
      ".next/**",
      "!.next/cache/**"  // 排除缓存目录
    ]
  }
}
```

#### 2. 精确输入配置

```json
{
  "test": {
    "inputs": [
      "src/**/*.ts",
      "test/**/*.ts",
      "jest.config.js",
      "!**/*.test.ts"  // 排除
    ]
  }
}
```

#### 3. 环境变量配置

```json
{
  "globalEnv": ["NODE_ENV", "API_URL"],
  "build": {
    "env": ["NEXT_PUBLIC_*"]
  }
}
```

#### 4. 任务并行化

```bash
# 最大化并行度
turbo run build test lint --parallel --concurrency=100

# 限制并发数
turbo run build --concurrency=4
```

---

## Lerna + Turborepo 集成

### 集成优势

Lerna 与 Turborepo 可以配合使用——Lerna 负责版本管理与发布，Turborepo 负责高性能任务编排与缓存（注意：Lerna 内置的任务缓存来自其集成的 Nx 引擎，而非 Turborepo）：

```
Lerna              +        Turborepo
  ↓                           ↓
版本管理                    高性能构建
发布流程                    任务缓存
依赖管理                    远程缓存
  ↓                           ↓
        Lerna + Turborepo
              ↓
    完整的 Monorepo 解决方案
```

**核心优势**：
- ✅ Lerna 的强大版本管理能力
- ✅ Turborepo 的极致构建性能
- ✅ 统一的命令行接口
- ✅ 无缝集成，无需额外配置

### 安装配置

#### 安装

```bash
# 同时安装 Lerna 和 Turborepo
pnpm add lerna turbo -D -w
```

#### 配置文件

**lerna.json**：

```json
{
  "$schema": "node_modules/lerna/schemas/lerna-schema.json",
  "version": "independent",
  "packages": ["packages/*"],
  "npmClient": "pnpm",
  "useWorkspaces": true,
  "command": {
    "version": {
      "allowBranch": "main",
      "conventionalCommits": true,
      "message": "chore(release): publish"
    },
    "publish": {
      "registry": "https://registry.npmjs.org/"
    }
  }
}
```

**turbo.json**：

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "outputs": []
    }
  }
}
```

#### package.json 脚本

```json
{
  "scripts": {
    "build": "lerna run build",
    "test": "lerna run test",
    "lint": "lerna run lint",
    "version": "lerna version",
    "publish": "lerna publish from-package"
  }
}
```

### 使用示例

#### 开发流程

```bash
# 1. 安装依赖
pnpm install

# 2. 开发模式（利用 Turborepo 的并行能力）
lerna run dev --parallel

# 3. 构建（利用 Turborepo 的缓存）
lerna run build

# 4. 测试
lerna run test

# 5. 版本管理（使用 Lerna）
lerna version

# 6. 发布（使用 Lerna）
lerna publish
```

#### CI/CD 配置

```yaml
# .github/workflows/ci.yml
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
        with:
          fetch-depth: 0
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Build
        run: pnpm lerna run build
      
      - name: Test
        run: pnpm lerna run test
      
      - name: Lint
        run: pnpm lerna run lint
```

---

## Nx 概述

> **注**：Nx 16 起，插件包名已从 `@nrwl/*` 更名为 `@nx/*`，`workspace.json` 也已并入项目级配置（integrated setup）。以下为 Nx 15 时代的典型配置，理解思路即可。

### 介绍

Nx 是一个功能强大的构建系统，支持 Monorepo 管理、代码生成和任务编排。它不仅是一个构建工具，更是一个完整的开发平台。

#### 核心特性

- **代码生成**：内置丰富的代码模板和生成器
- **项目迁移**：支持从其他工具迁移
- **依赖图可视化**：直观的项目依赖关系
- **任务编排**：智能的任务调度和缓存
- **插件生态**：丰富的插件支持

### 核心特性

#### 1. 代码生成

```bash
# 生成 React 组件
nx g @nrwl/react:component my-component

# 生成 Next.js 应用
nx g @nrwl/next:app my-app

# 生成库
nx g @nrwl/node:lib my-lib

# 生成 ESLint 配置
nx g @nrwl/linter:workspace-rule my-rule
```

#### 2. 依赖图可视化

```bash
# 打开依赖图界面
nx graph

# 生成静态依赖图
nx graph --export
```

#### 3. 项目迁移

```bash
# 从 Create React App 迁移
nx g @nrwl/cra-to-nx

# 从 Next.js 迁移
nx g @nrwl/next-to-nx
```

### 配置示例

#### nx.json 配置

```json
{
  "extends": "nx/presets/npm.json",
  "npmScope": "myorg",
  "tasksRunnerOptions": {
    "default": {
      "runner": "nx/tasks-runners/default",
      "options": {
        "cacheableOperations": ["build", "lint", "test"],
        "parallel": 3
      }
    }
  },
  "targetDefaults": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["{projectRoot}/dist"]
    }
  },
  "generators": {
    "@nrwl/react": {
      "application": {
        "style": "css",
        "linter": "eslint",
        "bundler": "webpack"
      }
    }
  }
}
```

#### workspace.json 配置

```json
{
  "version": 2,
  "projects": {
    "web": {
      "root": "apps/web",
      "projectType": "application",
      "targets": {
        "build": {
          "executor": "@nrwl/next:build",
          "outputs": ["{workspaceRoot}/dist/apps/web"]
        },
        "serve": {
          "executor": "@nrwl/next:server"
        }
      }
    },
    "ui": {
      "root": "packages/ui",
      "projectType": "library",
      "targets": {
        "build": {
          "executor": "@nrwl/js:tsc",
          "outputs": ["{workspaceRoot}/dist/packages/ui"]
        }
      }
    }
  }
}
```

---

## 工具对比与选型

### 功能对比

| 特性 | Lerna | Turborepo | Nx | Lerna + Turborepo |
|------|-------|-----------|-----|-------------------|
| **版本管理** | ✅ 强大 | ❌ | ❌ | ✅ |
| **发布管理** | ✅ | ❌ | ❌ | ✅ |
| **任务缓存** | ✅ (v6+) | ✅ | ✅ | ✅ |
| **远程缓存** | ✅ | ✅ | ✅ | ✅ |
| **增量构建** | ✅ | ✅ | ✅ | ✅ |
| **代码生成** | ❌ | ❌ | ✅ | ❌ |
| **依赖图可视化** | ✅ | ✅ | ✅ | ✅ |
| **项目迁移** | ❌ | ❌ | ✅ | ❌ |
| **学习曲线** | 低 | 低 | 中 | 低 |
| **配置复杂度** | 低 | 低 | 中 | 低 |

### 性能对比

#### 构建速度

```
项目规模：20 个包

无缓存构建：
  Lerna (传统)     ████████████████ (120s)
  Turborepo        ████████ (60s)
  Nx               ████████ (58s)
  Lerna + Turbo    ████████ (60s)

有缓存构建（无变化）：
  Lerna (传统)     ████████████████ (120s)
  Turborepo        █ (5s)
  Nx               █ (5s)
  Lerna + Turbo    █ (5s)

有缓存构建（修改1个包）：
  Lerna (传统)     ████████████████ (120s)
  Turborepo        ██ (15s)
  Nx               ██ (14s)
  Lerna + Turbo    ██ (15s)
```

#### CI/CD 时间优化

```
传统 Lerna：
  总构建时间: 15 分钟
  
Turborepo（远程缓存）：
  首次构建: 15 分钟
  二次构建: 30 秒
  优化率: 96.7%
```

### 选型建议

#### 使用 Lerna 的场景

- ✅ 需要强大的版本管理和发布功能
- ✅ 库项目（组件库、工具库）
- ✅ 需要独立的包版本管理
- ✅ 团队对 Lerna 已有经验

**示例项目**：
- Babel
- Jest
- Create React App

#### 使用 Turborepo 的场景

- ✅ 需要极致的构建性能
- ✅ 大型前端应用项目
- ✅ 需要远程缓存共享
- ✅ CI/CD 时间优化

**示例项目**：
- Vercel 内部项目
- 大型 SaaS 应用

#### 使用 Nx 的场景

- ✅ 需要代码生成和项目模板
- ✅ 从其他框架迁移项目
- ✅ 全栈开发项目
- ✅ 需要丰富的插件生态

**示例项目**：
- 大型企业应用
- 全栈 Monorepo

#### 使用 Lerna + Turborepo 的场景

- ✅ 既需要版本管理又需要高性能构建
- ✅ 大型库项目
- ✅ 需要完整 Monorepo 解决方案
- ✅ 现代化的最佳实践

---

## 常见问题

### Q1: Lerna 和 pnpm workspace 如何配合使用？

**配置示例**：

```json
// lerna.json
{
  "npmClient": "pnpm",
  "useWorkspaces": true
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
```

Lerna 会使用 pnpm 的 workspace 功能管理依赖。

### Q2: Turborepo 的缓存存在哪里？

**本地缓存位置**：

```bash
# 默认位置
node_modules/.cache/turbo

# 查看缓存
ls node_modules/.cache/turbo
```

**远程缓存**：

```bash
# Vercel
turbo login
turbo link

# 自定义
export TURBO_API=https://your-cache-server.com
```

### Q3: 如何在 CI 中使用 Turborepo 远程缓存？

**GitHub Actions 配置**：

```yaml
- name: Build with remote cache
  run: pnpm turbo run build
  env:
    TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
```

### Q4: Lerna version 和 lerna publish 有什么区别？

| 命令 | 功能 |
|------|------|
| `lerna version` | 更新版本号、CHANGELOG、创建 Git 标签 |
| `lerna publish` | 发布到 npm（包含 version 的功能） |

### Q5: 如何选择固定模式还是独立模式？

**固定模式**：
- 包之间高度耦合
- 需要统一版本管理
- 适合组件库

**独立模式**：
- 包之间松散耦合
- 需要独立版本控制
- 适合工具集合

### Q6: Turborepo 如何处理环境变量？

**配置环境变量**：

```json
// turbo.json
{
  "globalEnv": ["NODE_ENV"],
  "tasks": {
    "build": {
      "env": ["API_URL", "NEXT_PUBLIC_*"]
    }
  }
}
```

### Q7: 如何调试 Turborepo 任务执行？

```bash
# 查看执行计划
turbo run build --dry=json

# 详细日志
turbo run build --verbosity=4

# 查看缓存信息
turbo run build --summarize
```

### Q8: Lerna 如何处理私有包？

```json
// packages/internal/package.json
{
  "name": "@myorg/internal",
  "private": true  // 不会被发布
}
```

或配置忽略：

```json
// lerna.json
{
  "command": {
    "publish": {
      "ignoreChanges": ["packages/internal/**"]
    }
  }
}
```

---

## 故障排查

### 常见错误

#### 1. Lerna 版本冲突

**错误信息**：

```
lerna ERR! EVERSIONOVERLAP
```

**解决方案**：

```bash
# 强制更新版本
lerna version --force-publish

# 或检查包之间的版本约束
lerna changed --json
```

#### 2. Turborepo 缓存失效

**问题**：修改代码后缓存仍然被使用。

**解决方案**：

```bash
# 强制重新构建
turbo run build --force

# 清理缓存
rm -rf node_modules/.cache/turbo
```

#### 3. Git 状态错误

**错误信息**：

```
lerna ERR! EUNCOMMIT
```

**解决方案**：

```bash
# 提交更改
git add .
git commit -m "chore: update"

# 或跳过 Git 检查
lerna version --no-git-tag-version
```

#### 4. 发布权限错误

**错误信息**：

```
403 Forbidden
```

**解决方案**：

```bash
# 检查登录状态
npm whoami

# 重新登录
npm login

# 检查 publishConfig
cat packages/*/package.json | grep -A 3 "publishConfig"
```

#### 5. Turborepo 任务找不到

**错误信息**：

```
turbo could not find the following tasks
```

**解决方案**：

```bash
# 检查 package.json 中是否有对应的 script
cat packages/*/package.json | grep "scripts"

# 确保任务在 turbo.json 中配置
cat turbo.json | grep "tasks"
```

### 调试技巧

#### 1. 查看依赖图

```bash
# Lerna
lerna graph

# Turborepo
turbo run build --dry=json | jq

# Nx
nx graph
```

#### 2. 查看任务执行顺序

```bash
# Turborepo
turbo run build --dry

# Lerna
lerna run build --stream --verbose
```

#### 3. 清理项目

```bash
# Lerna 清理
lerna clean
rm -rf node_modules

# Turborepo 清理缓存
rm -rf node_modules/.cache/turbo

# 完全重置
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
find . -name "dist" -type d -prune -exec rm -rf '{}' +
pnpm install
```

---

## 最佳实践

### 项目结构

```
monorepo/
├── apps/                  # 应用
│   ├── web/
│   └── docs/
├── packages/             # 共享包
│   ├── ui/
│   ├── core/
│   └── utils/
├── tools/                # 开发工具
│   └── scripts/
├── lerna.json
├── turbo.json
├── package.json
└── pnpm-workspace.yaml
```

### 版本管理策略

1. **使用 Conventional Commits**

```bash
# feat: 新功能 → minor
# fix: 修复 → patch
# feat!: 破坏性 → major

git commit -m "feat: add new feature"
lerna version --conventional-commits
```

2. **自动化发布流程**

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install
        run: pnpm install
      
      - name: Build
        run: pnpm lerna run build
      
      - name: Version
        run: pnpm lerna version --yes
      
      - name: Publish
        run: pnpm lerna publish from-package --yes
        env:
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 构建优化

1. **合理配置缓存**

```json
// turbo.json
{
  "tasks": {
    "build": {
      "outputs": ["dist/**"],
      "inputs": ["src/**/*", "!**/*.test.ts"]
    }
  }
}
```

2. **使用远程缓存**

```bash
# CI 中使用
turbo run build --token=$TURBO_TOKEN
```

3. **增量构建**

```bash
# 只构建变化的包
turbo run build --filter=[origin/main]
```

### 团队协作

1. **统一开发环境**

```json
// package.json
{
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

2. **Git Hooks**

```json
// package.json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

3. **代码质量**

```json
// package.json
{
  "scripts": {
    "lint": "lerna run lint",
    "test": "lerna run test",
    "build": "lerna run build"
  }
}
```

---

## 总结

### 快速决策树

```
是否需要版本管理？
  ├─ 是 → Lerna 或 Lerna + Turborepo
  │        ├─ 需要高性能构建？
  │        │   └─ 是 → Lerna + Turborepo
  │        │   └─ 否 → Lerna
  │
  └─ 否 → 是否需要代码生成？
           ├─ 是 → Nx
           └─ 否 → Turborepo
```

### 学习路径

1. **入门**：Lerna → 掌握版本管理和发布
2. **进阶**：Turborepo → 学习高性能构建
3. **高级**：Lerna + Turborepo → 完整解决方案
4. **专家**：Nx → 全栈开发和项目迁移

### 核心要点

- **Lerna**：版本管理和发布的最佳选择
- **Turborepo**：构建性能优化的最佳选择
- **Nx**：全栈开发和代码生成的最佳选择
- **Lerna + Turborepo**：现代化 Monorepo 的最佳实践

选择合适的工具组合，能够显著提升开发效率和项目质量。
