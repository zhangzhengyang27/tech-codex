---
title: Changesets
description: Changesets 的变更集模型与 Monorepo 渐进式发布
keywords: [Node.js, 构建, 脚手架, Changesets]
category: Node.js
tags: [Node.js, 工程化]
---







# Changesets

## 介绍

Changesets 是一个管理版本和发布的工具，通过变更集（changeset）文件记录变更，然后批量处理这些变更来更新版本和 CHANGELOG。

### 核心特性

- **变更集驱动**：每个变更都有独立的文档记录
- **批量版本管理**：支持多包同时更新版本
- **Monorepo 优先**：专为多包仓库设计
- **灵活的发布策略**：支持独立版本和固定版本
- **自动化工作流**：可集成 GitHub Actions 自动发布

## 系统架构

### 工作流程

```
开发功能 → 创建变更集 → 提交变更集 → 合并 PR → Version PR 自动创建 → 合并 Version PR → 自动发布
    ↓           ↓            ↓          ↓              ↓                    ↓              ↓
 Develop   Add Changeset  Commit     Merge PR      Create Version PR    Merge Version   Publish
```

### 核心概念

| 概念 | 说明 |
|------|------|
| **Changeset** | 记录单个变更的 Markdown 文件 |
| **Version PR** | Changesets Bot 自动创建的版本更新 PR |
| **Snapshot** | 用于测试的临时发布版本 |
| **Linked Packages** | 版本号联动的包组 |
| **Fixed Packages** | 版本号固定的包组 |

### 目录结构

```
project/
├── .changeset/
│   ├── config.json          # 配置文件
│   ├── README.md            # 说明文档
│   ├── cool-feature.md      # 变更集文件
│   └── another-change.md    # 变更集文件
├── packages/
│   ├── core/
│   ├── cli/
│   └── utils/
└── package.json
```

## 安装

```bash
pnpm add @changesets/cli -D
```

### 安装可选依赖

```bash
# 可选：用于生成更好的 CHANGELOG
pnpm add @changesets/changelog-github -D

# 可选：用于 GitHub Actions
pnpm add @changesets/action -D
```

## 初始化

```bash
npx changeset init
```

创建的目录结构：

```
.changeset/
├── config.json
└── README.md
```

## 配置文件

### .changeset/config.json

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
  "ignore": [],
  "snapshot": {
    "useCalculatedVersion": true,
    "prereleaseTemplate": null
  }
}
```

### 配置参数详解

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `changelog` | String/Boolean | `false` | CHANGELOG 生成方式 |
| `commit` | Boolean | `false` | 是否使用 commit 方式 |
| `fixed` | Array | `[]` | 版本号固定的包组 |
| `linked` | Array | `[]` | 版本号联动的包组 |
| `access` | String | `'restricted'` | npm 发布访问权限（`'public'` 或 `'restricted'`） |
| `baseBranch` | String | `'main'` | 主分支名称 |
| `updateInternalDependencies` | String | `'patch'` | 内部依赖更新策略 |
| `ignore` | Array | `[]` | 忽略的包列表 |
| `snapshot` | Object | `{}` | 快照发布配置 |

#### changelog 配置选项

```json
{
  // 选项 1：默认 CHANGELOG
  "changelog": "@changesets/cli/changelog",

  // 选项 2：使用 GitHub 增强的 CHANGELOG
  "changelog": "@changesets/changelog-github",

  // 选项 3：自定义 CHANGELOG 生成器
  "changelog": "./.changeset/custom-changelog.cjs",

  // 选项 4：禁用 CHANGELOG
  "changelog": false
}
```

#### updateInternalDependencies 选项

```json
{
  // 只更新 patch 版本的内部依赖
  "updateInternalDependencies": "patch",

  // 总是更新内部依赖
  "updateInternalDependencies": "minor",

  // 实验性选项
  "___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH": {
    "updateInternalDependencies": "always"
  }
}
```

#### snapshot 配置

```json
{
  "snapshot": {
    // 使用计算的版本号
    "useCalculatedVersion": true,

    // 自定义预发布模板
    "prereleaseTemplate": null
  }
}
```

## 基础工作流

### 1. 创建变更集

```bash
npx changeset
```

交互式选择：
- 受影响的包
- 版本类型（major/minor/patch）
- 变更描述

生成的文件 `.changeset/cute-cats-march.md`：

```markdown
---
"@myorg/core": minor
"@myorg/cli": patch
---

Add new authentication module
```

#### 变更集文件格式

```markdown
---
"package-name": version-type
"another-package": version-type
---

描述信息（支持多行）

可以包含详细的变更说明、使用示例等
```

#### 版本类型说明

| 类型 | 版本变化 | 示例 |
|------|----------|------|
| `major` | Major (1.0.0 → 2.0.0) | 破坏性变更 |
| `minor` | Minor (1.0.0 → 1.1.0) | 新功能 |
| `patch` | Patch (1.0.0 → 1.0.1) | Bug 修复 |

### 2. 更新版本

```bash
npx changeset version
```

这会：
- 更新 `package.json` 版本号
- 更新 `CHANGELOG.md`
- 删除已处理的变更集文件
- 更新依赖包的版本号

#### 版本更新命令选项

```bash
# 跳过指定包
npx changeset version --ignore @myorg/docs

# 快照版本
npx changeset version --snapshot
```

> `version` 子命令只支持 `--ignore` 与 `--snapshot` 选项；`--since` 属于 `add`/`status` 子命令。

### 3. 发布

```bash
npx changeset publish
```

这会：
- 发布包到 npm
- 创建 Git 标签

#### 发布命令选项

```bash
# 发布到指定 tag
npx changeset publish --tag beta

# 发布快照版本
npx changeset publish --tag snapshot
```

> `publish` 只支持 `--otp` 与 `--tag` 选项，没有 `--filter` 与 `--dry-run`；发布前可用 `npx changeset status` 预览待发布的包。

## npm 脚本

```json
{
  "scripts": {
    "changeset": "changeset",
    "version": "changeset version",
    "release": "changeset publish",
    "release:beta": "changeset publish --tag beta"
  }
}
```

## Monorepo 配置

### 链接包版本

```json
{
  "linked": [["@myorg/core", "@myorg/cli"]]
}
```

当 `@myorg/core` 更新时，`@myorg/cli` 也会更新版本。

#### 工作原理

```
@myorg/core: 1.0.0 → 1.1.0
@myorg/cli:  1.0.0 → 1.1.0 (自动同步)

两个包的版本号保持一致
```

### 固定包版本

```json
{
  "fixed": [["@myorg/ui", "@myorg/theme"]]
}
```

这些包始终使用相同版本号。

#### 工作原理

```
@myorg/ui:    1.0.0 → 1.0.1 (其中一个变更)
@myorg/theme: 1.0.0 → 1.0.1 (即使没有变更也更新)

两个包的版本号完全相同
```

#### linked vs fixed 对比

| 特性 | Linked | Fixed |
|------|--------|-------|
| 版本号 | 可能不同 | 完全相同 |
| 适用场景 | 相关联的包 | 必须一起发布的包 |
| 灵活性 | 高 | 低 |
| 发布控制 | 独立发布 | 统一发布 |

### 忽略包

```json
{
  "ignore": ["@myorg/internal-*", "@myorg/docs"]
}
```

被忽略的包不会自动发布。

### Monorepo 最佳实践

#### 1. 包结构规划

```
packages/
├── core/           # 核心包
├── utils/          # 工具包
├── cli/            # CLI 工具
├── ui/             # UI 组件库
└── theme/          # 主题包
```

#### 2. 版本策略

```json
{
  "fixed": [
    ["@myorg/ui", "@myorg/theme"]  // UI 相关包固定版本
  ],
  "linked": [
    ["@myorg/core", "@myorg/utils"]  // 核心包联动版本
  ],
  "ignore": [
    "@myorg/docs",         // 文档不发布
    "@myorg/examples"      // 示例不发布
  ]
}
```

#### 3. 依赖管理

```json
// packages/cli/package.json
{
  "dependencies": {
    "@myorg/core": "^1.0.0",      // 使用 ^ 范围
    "@myorg/utils": "workspace:*" // workspace 协议
  }
}
```

#### 4. 自动更新内部依赖

```json
{
  // 配置内部依赖更新策略
  "updateInternalDependencies": "patch",

  "___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH": {
    "onlyUpdatePeerDependentsWhenOutOfRange": true,
    "updateInternalDependencies": "always"
  }
}
```

## CI/CD 集成

### GitHub Actions

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - run: pnpm install
      
      - name: Create Release Pull Request or Publish
        uses: changesets/action@v1
        with:
          publish: pnpm release
          version: pnpm version
          commit: "chore: update versions"
          title: "chore: update versions"
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### 自动化工作流

1. **开发者提交代码时**
   - 创建变更集：`npx changeset`
   - 提交变更集文件

2. **Changesets GitHub Action 自动**
   - 收集变更集
   - 创建/更新 Version Pull Request

3. **合并 Version PR 后**
   - 自动发布到 npm
   - 创建 Git 标签
   - 发布 GitHub Release

## 自定义 CHANGELOG

### 使用自定义生成器

```javascript
// .changeset/changelog-github-custom.cjs
const { getInfo } = require("@changesets/get-github-info")

module.exports = {
  getDependencyReleaseLine: async (changesets, dependenciesUpdated) => {
    const changesetLink = `- Updated dependencies`
    return changesetLink
  },
  getReleaseLine: async (changeset, type) => {
    const [firstLine, ...futureLines] = changeset.summary
      .split("\n")
      .map(l => l.trimRight())
    
    return `- ${firstLine}`
  }
}
```

### 配置

```json
{
  "changelog": "./.changeset/changelog-github-custom.cjs"
}
```

## 快照发布

用于测试和预发布：

```bash
# 创建快照版本
npx changeset version --snapshot

# 发布快照
npx changeset publish --tag snapshot
```

生成版本如：`0.0.0-20240115123456-a1b2c3d`

### 快照版本命名规则

```
格式: 0.0.0-YYYYMMDDHHMMSS-COMMITHASH

示例:
- 0.0.0-20240115120530-a1b2c3d
- 0.0.0-20240115120530-a1b2c3d (带计算版本)
```

### 自定义快照配置

```json
{
  "snapshot": {
    // 使用计算的版本号
    "useCalculatedVersion": true,

    // 自定义预发布模板
    "prereleaseTemplate": "${version}-${date}-${commit}"
  }
}
```

### 快照发布流程

```bash
# 1. 创建快照版本
npx changeset version --snapshot

# 2. 发布到 npm（snapshot tag）
npx changeset publish --tag snapshot

# 3. 用户安装测试版本
npm install package-name@snapshot
# 或
pnpm add package-name@snapshot

# 4. 发布正式版本
npx changeset version
npx changeset publish --tag latest
```

### 快照发布示例

```bash
# 开发分支快照
git checkout feat/new-feature
npx changeset add --empty
npx changeset version --snapshot
npx changeset publish --tag snapshot

# 结果：@myorg/core@0.0.0-20240115120530-a1b2c3d
```

### 预发布版本管理

```bash
# Alpha 版本
npx changeset pre enter alpha
npx changeset version
npx changeset publish --tag alpha
npx changeset pre exit

# Beta 版本
npx changeset pre enter beta
npx changeset version
npx changeset publish --tag beta
npx changeset pre exit

# RC 版本
npx changeset pre enter rc
npx changeset version
npx changeset publish --tag rc
npx changeset pre exit
```

## 配置示例

```json
{
  "$schema": "https://unpkg.com/@changesets/config@3.0.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [["@myorg/core", "@myorg/utils"]],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": ["@myorg/docs", "@myorg/examples"],
  "___experimentalUnsafeOptions_WILL_CHANGE_IN_PATCH": {
    "updateInternalDependencies": "always"
  }
}
```

## 与其他工具对比

| 特性 | Changesets | semantic-release | standard-version |
|------|------------|------------------|------------------|
| Monorepo 支持 | ✅ 优秀 | ✅ | ⚠️ 有限 |
| 版本控制 | 细粒度 | 自动 | 自动 |
| CI/CD 集成 | ✅ | ✅ | 需配置 |
| 学习曲线 | 中 | 中 | 低 |
| 变更集文件 | ✅ | ❌ | ❌ |
| 多包协调 | ✅ | ✅ | ⚠️ |

## 最佳实践

1. **每个 PR 创建一个变更集**
2. **使用 GitHub Action 自动化**
3. **配置 access 为 public（公开包）**
4. **使用 linked 关联相关包版本**
5. **保护主分支，通过 PR 合并**
6. **为重大变更添加详细描述**
7. **定期清理已发布的快照版本**
8. **使用 Version PR 审查版本变更**

## 常见问题解答

### 1. 如何处理依赖关系？

Changesets 会自动处理包之间的依赖关系：

```json
// packages/cli/package.json
{
  "dependencies": {
    "@myorg/core": "workspace:*"
  }
}
```

当 `@myorg/core` 版本更新时，`@myorg/cli` 的依赖版本也会自动更新。

### 2. 如何跳过某些包的发布？

```json
// .changeset/config.json
{
  "ignore": ["@myorg/docs", "@myorg/examples"]
}
```

或在 `package.json` 中设置：

```json
{
  "private": true  // 设置为私有包
}
```

### 3. 如何自定义 CHANGELOG 格式？

创建自定义生成器：

```javascript
// .changeset/changelog-custom.cjs
const { getInfo } = require("@changesets/get-github-info")

module.exports = {
  getDependencyReleaseLine: async (changesets, dependenciesUpdated) => {
    if (dependenciesUpdated.length === 0) return ""

    const changesetLink = `- Updated dependencies [${dependenciesUpdated
      .map(d => d.version)
      .join(", ")}]:`

    const updatedDependenciesList = dependenciesUpdated.map(
      d => `  - ${d.name}@${d.version}`
    )

    return [changesetLink, ...updatedDependenciesList].join("\n")
  },
  getReleaseLine: async (changeset, type) => {
    const [firstLine, ...futureLines] = changeset.summary
      .split("\n")
      .map(l => l.trimRight())

    const links = changeset.commit ? ` ([${changeset.commit.slice(0, 7)}](https://github.com/user/repo/commit/${changeset.commit}))` : ""

    return `\n- ${firstLine}${links}\n${futureLines.map(l => `  ${l}`).join("\n")}`
  }
}
```

配置使用：

```json
{
  "changelog": "./.changeset/changelog-custom.cjs"
}
```

### 4. 如何处理 breaking changes？

在变更集中明确标注：

```markdown
---
"@myorg/core": major
---

BREAKING CHANGE: 完全重构了 API

**迁移指南：**
- 旧: `core.init()`
- 新: `core.initialize()`

**影响范围：**
- 所有使用 `init()` 方法的代码都需要更新
```

### 5. 如何强制使用变更集？

使用 GitHub Actions 检查：

```yaml
name: Check Changeset

on:
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v2
        id: filter
        with:
          filters: |
            src:
              - 'packages/**/src/**'
      - name: Check for changeset
        if: steps.filter.outputs.src == 'true'
        run: |
          if [ -z "$(find .changeset -name '*.md' ! -name 'README.md' ! -name 'config.json')" ]; then
            echo "Error: No changeset found"
            echo "Please add a changeset by running: npx changeset"
            exit 1
          fi
```

### 6. 如何处理大型 Monorepo？

优化策略：

```bash
# 1. 查看待发布状态
npx changeset status

# 2. 配置忽略不必要的包
{
  "ignore": [
    "@myorg/docs",
    "@myorg/examples",
    "@myorg/playground-*"
  ]
}
```

### 7. 如何回滚发布？

```bash
# 1. 删除 npm 版本（需要权限）
npm deprecate @myorg/core@1.0.0 "This version has critical bugs"

# 2. 删除 Git 标签
git tag -d @myorg/core@1.0.0
git push --delete origin @myorg/core@1.0.0

# 3. 重置版本
# 手动修改 package.json 版本号

# 4. 重新发布
npx changeset publish
```

### 8. 如何在私有仓库使用？

```json
{
  "access": "restricted",  // 私有包
  "changelog": false       // 可选：禁用 GitHub 增强的 CHANGELOG
}
```

## 错误处理与调试

### 调试模式

```bash
# 启用详细日志
DEBUG=@changesets/* npx changeset version

# 特定模块调试
DEBUG=@changesets/apply-release-plan npx changeset version
```

### 常见错误及解决方案

#### ENOENT: no such file or directory

```
Error: ENOENT: no such file or directory, open '.changeset/config.json'
```

**解决方案：**
```bash
# 初始化 Changesets
npx changeset init
```

#### ENOPKG

```
Error: Cannot find package.json for @myorg/core
```

**解决方案：**
```bash
# 检查包结构
ls packages/core/package.json

# 确保每个包都有 package.json
```

#### EINVALIDVERSION

```
Error: Invalid version: 1.0
```

**解决方案：**
```bash
# 检查版本号格式
# 正确: 1.0.0
# 错误: 1.0, v1.0.0

# 修复版本号
npm pkg set version=1.0.0
```

#### ENOCHANGESET

```
Error: No changeset found
```

**解决方案：**
```bash
# 添加变更集
npx changeset

# 或创建空变更集
npx changeset add --empty
```

#### EACCESS

```
Error: You do not have permission to publish
```

**解决方案：**
1. 检查 npm 账号权限
2. 检查包名是否已被占用
3. 配置 `access` 参数：

```json
{
  "access": "public"  // 公开包
}
```

### Version PR 常见问题

#### 1. Version PR 未自动创建

检查：
- GitHub Actions 是否正常运行
- 是否有变更集文件
- `baseBranch` 配置是否正确

#### 2. Version PR 内容不完整

```bash
# 检查变更集文件
ls .changeset/*.md

# 手动触发版本更新
npx changeset version

# 手动创建 Version PR
git checkout -b version/update
npx changeset version
git add .
git commit -m "chore: update versions"
git push origin version/update
```

## 高级配置

### 使用 GitHub 增强的 CHANGELOG

```bash
pnpm add @changesets/changelog-github -D
```

```json
{
  "changelog": [
    "@changesets/changelog-github",
    { "repo": "user/repo" }
  ]
}
```

### 自动化脚本

创建 `release.sh`：

```bash
#!/bin/bash

set -e

echo "🚀 Starting release process..."

# 1. 检查分支
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo "Error: Please run this script on main branch"
  exit 1
fi

# 2. 检查工作目录
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working directory is not clean"
  exit 1
fi

# 3. 拉取最新代码
git pull origin main

# 4. 运行测试
pnpm test

# 5. 更新版本
echo "📦 Updating versions..."
npx changeset version

# 6. 提交变更
git add .
git commit -m "chore: update versions"

# 7. 发布
echo "📦 Publishing packages..."
npx changeset publish

# 8. 推送标签
git push --follow-tags origin main

echo "✅ Release completed successfully!"
```

### 配合 Lerna 使用

```json
// package.json
{
  "scripts": {
    "version": "changeset version && lerna version --no-git-tag-version --no-push",
    "release": "lerna publish from-package"
  }
}
```

### 多环境发布

```bash
# 开发环境（快照）
npx changeset version --snapshot
npx changeset publish --tag dev

# 测试环境（beta）
npx changeset pre enter beta
npx changeset version
npx changeset publish --tag beta

# 生产环境（latest）
npx changeset pre exit
npx changeset version
npx changeset publish --tag latest
```

## 完整工作流示例

```bash
# 1. 创建功能分支
git checkout -b feat/new-feature

# 2. 开发并提交
git add .
git commit -m "feat: add new feature"

# 3. 创建变更集
npx changeset
# 选择版本类型和描述

# 4. 提交变更集
git add .changeset/*.md
git commit -m "chore: add changeset"

# 5. 推送并创建 PR
git push origin feat/new-feature

# 6. 合并 PR 后，Changesets Bot 创建 Version PR

# 7. 合并 Version PR，自动发布
```
