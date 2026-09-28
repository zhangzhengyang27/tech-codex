---
title: standard-version
description: standard-version 的本地化 CHANGELOG 与版本号生成
keywords: [Node.js, 构建, 脚手架, standard-version]
category: Node.js
tags: [Node.js, 工程化]
---







# standard-version

> **注意**：standard-version 已被作者标记为废弃（维护模式），官方建议迁移到 [release-please](https://github.com/googleapis/release-please)，或按需改用 semantic-release / Changesets。本文内容仍适用于存量项目。

## 介绍

standard-version 是一个遵循 Conventional Commits 规范的版本管理工具，自动生成 CHANGELOG 并更新版本号。

### 核心特性

- **自动化版本管理**：根据提交信息自动计算版本号
- **CHANGELOG 自动生成**：生成格式统一的变更日志
- **手动触发发布**：完全控制发布时机和流程
- **轻量级配置**：开箱即用，配置简单
- **兼容性好**：支持多种 Conventional Commits 预设

### 系统架构

#### 工作流程

```
执行命令 → 读取配置 → 分析提交 → 计算版本 → 更新文件 → 生成 CHANGELOG → Git 提交 → 创建标签
    ↓         ↓          ↓          ↓          ↓          ↓              ↓         ↓
 Command   Config     Analyze    Calc Ver   Update     Generate        Commit    Tag
```

#### 核心模块

| 模块 | 说明 |
|------|------|
| **Commit Parser** | 解析提交信息,提取类型和范围 |
| **Version Calculator** | 根据提交类型计算新版本号 |
| **Changelog Generator** | 生成/更新 CHANGELOG.md |
| **File Updater** | 更新 package.json 等文件 |
| **Git Handler** | 创建 Git 提交和标签 |

## 安装

```bash
pnpm add standard-version -D
```

### 安装可选依赖

```bash
# 可选：commitlint 集成
pnpm add @commitlint/cli @commitlint/config-conventional -D

# 可选：husky 钩子
pnpm add husky -D
```

## 基础使用

```bash
# 首次发布
npx standard-version --first-release

# 常规发布
npx standard-version

# 指定版本类型
npx standard-version --release-as major   # 1.0.0 → 2.0.0
npx standard-version --release-as minor   # 1.0.0 → 1.1.0
npx standard-version --release-as patch   # 1.0.0 → 1.0.1

# 预发布
npx standard-version --prerelease alpha   # 1.0.0 → 1.0.1-alpha.0
```

### 命令行参数详解

| 参数 | 简写 | 说明 | 示例 |
|------|------|------|------|
| `--release-as` | `-r` | 指定版本类型 | `--release-as major` |
| `--prerelease` | `-p` | 创建预发布版本 | `--prerelease beta` |
| `--first-release` | | 首次发布,不提升版本 | `--first-release` |
| `--dry-run` | | 模拟运行,不修改文件 | `--dry-run` |
| `--skip` | `-s` | 跳过指定步骤 | `--skip.changelog` |
| `--tag-prefix` | `-t` | 标签前缀 | `--tag-prefix v` |
| `--infile` | `-i` | CHANGELOG 文件路径 | `--infile CHANGELOG.md` |
| `--message` | `-m` | 自定义提交信息 | `--message "chore: release %s"` |

### 跳过特定步骤

```bash
# 跳过 CHANGELOG 生成
npx standard-version --skip.changelog

# 跳过 Git 提交
npx standard-version --skip.commit

# 跳过 Git 标签
npx standard-version --skip.tag

# 跳过多个步骤
npx standard-version --skip.changelog --skip.tag
```

## 配置文件

创建 `.versionrc.js`：

```javascript
module.exports = {
  // 跳过步骤
  skip: {
    changelog: false,  // 不跳过 CHANGELOG 生成
    commit: false,     // 不跳过 Git 提交
    tag: false         // 不跳过 Git 标签
  },

  // 提交信息类型
  types: [
    { type: 'feat', section: '✨ Features' },
    { type: 'fix', section: '🐛 Bug Fixes' },
    { type: 'perf', section: '⚡ Performance' },
    { type: 'refactor', section: '♻️ Code Refactoring' },
    { type: 'docs', section: '📝 Documentation', hidden: true },
    { type: 'style', hidden: true },
    { type: 'chore', hidden: true },
    { type: 'test', hidden: true }
  ],

  // 提交信息格式
  headerFormat: '## {{previousTag}}...{{currentTag}}',
  commitUrlFormat: '{{host}}/{{owner}}/{{repository}}/commit/{{hash}}',
  compareUrlFormat: '{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}',

  // 预发布配置
  prerelease: 'beta'
}
```

### 配置参数详解

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `skip` | Object | `{}` | 跳过特定步骤 |
| `types` | Array | 见下表 | 提交类型配置 |
| `preMajor` | Boolean | `false` | 生成 CHANGELOG 时是否包含此前主版本的提交 |
| `commitUrlFormat` | String | `{{host}}/{{owner}}/{{repository}}/commit/{{hash}}` | 提交链接格式 |
| `compareUrlFormat` | String | `{{host}}/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}` | 版本比较链接格式 |
| `issueUrlFormat` | String | `{{host}}/{{owner}}/{{repository}}/issues/{{id}}` | Issue 链接格式 |
| `userUrlFormat` | String | `{{host}}/{{user}}` | 用户链接格式 |
| `releaseCommitMessageFormat` | String | `chore(release): {{currentTag}}` | 发布提交信息格式 |
| `issuePrefixes` | Array | `['#']` | Issue 前缀 |
| `tagPrefix` | String | `'v'` | Git 标签前缀 |

### 提交类型配置

```javascript
types: [
  { type: 'feat', section: '✨ Features', hidden: false },
  { type: 'fix', section: '🐛 Bug Fixes', hidden: false },
  { type: 'perf', section: '⚡ Performance Improvements', hidden: false },
  { type: 'refactor', section: '♻️ Code Refactoring', hidden: false },
  { type: 'docs', section: '📝 Documentation', hidden: true },
  { type: 'style', section: '💄 Styles', hidden: true },
  { type: 'chore', section: '🎫 Chores', hidden: true },
  { type: 'test', section: '✅ Tests', hidden: true },
  { type: 'build', section: '📦 Build System', hidden: true },
  { type: 'ci', section: '👷 CI', hidden: true }
]
```

#### 类型参数说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `type` | String | 提交类型标识 |
| `section` | String | CHANGELOG 中的章节名称 |
| `hidden` | Boolean | 是否在 CHANGELOG 中隐藏 |

## package.json 配置

```json
{
  "scripts": {
    "release": "standard-version",
    "release:alpha": "standard-version --prerelease alpha",
    "release:beta": "standard-version --prerelease beta",
    "release:major": "standard-version --release-as major",
    "release:minor": "standard-version --release-as minor"
  }
}
```

## 版本号规则

根据提交信息类型自动决定版本号：

| 提交类型 | 版本变化 |
|---------|---------|
| `feat` | Minor (1.0.0 → 1.1.0) |
| `fix` | Patch (1.0.0 → 1.0.1) |
| `BREAKING CHANGE` | Major (1.0.0 → 2.0.0) |

### 版本计算逻辑详解

#### 提交类型权重

```javascript
// 版本计算优先级（从高到低）
1. BREAKING CHANGE → Major
2. feat → Minor
3. fix/perf → Patch
4. refactor/style/docs/test/chore → 不触发版本更新
```

#### 版本计算示例

```bash
# 示例 1：多个提交的版本计算
当前版本: 1.0.0
提交记录:
- docs: update README        → 不影响版本
- fix: fix login bug         → Patch 提升
- feat: add user profile     → Minor 提升

最终版本: 1.1.0 (取最高优先级变更)

# 示例 2：破坏性变更
当前版本: 1.2.3
提交记录:
- feat!: remove deprecated API  → Major 提升

最终版本: 2.0.0

# 示例 3：无相关提交
当前版本: 1.0.0
提交记录:
- docs: update docs
- chore: update dependencies

结果: 无版本变更，跳过发布
```

#### 预发布版本规则

```bash
# 当前版本: 1.0.0
npx standard-version --prerelease alpha
# 结果: 1.0.1-alpha.0

# 再次运行
npx standard-version --prerelease alpha
# 结果: 1.0.1-alpha.1

# 正式发布
npx standard-version
# 结果: 1.0.1
```

## CHANGELOG 生成

生成的 `CHANGELOG.md` 示例：

```markdown
# Changelog

## [1.1.0](https://github.com/user/repo/compare/v1.0.0...v1.1.0) (2024-01-15)

### ✨ Features

* add user authentication ([a1b2c3d](https://github.com/user/repo/commit/a1b2c3d))
* implement dashboard ([e4f5g6h](https://github.com/user/repo/commit/e4f5g6h))

### 🐛 Bug Fixes

* resolve login issue ([i7j8k9l](https://github.com/user/repo/commit/i7j8k9l))

## [1.0.0](https://github.com/user/repo/compare/v0.1.0...v1.0.0) (2024-01-01)

### ⚠ BREAKING CHANGES

* API endpoints have changed

### ✨ Features

* initial release ([m1n2o3p](https://github.com/user/repo/commit/m1n2o3p))
```

## 工作流程

```bash
# 1. 开发功能
git add .
git commit -m "feat: add new feature"

# 2. 创建发布
npm run release

# 3. 推送代码和标签
git push --follow-tags origin main

# 4. 发布到 npm
npm publish
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
    if: "!contains(github.event.head_commit.message, 'chore(release)')"
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0
      
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'
      
      - run: pnpm install
      
      - name: Create Release
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          npx standard-version
          git push --follow-tags origin main
      
      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 高级配置

### 自定义预设

```javascript
// .versionrc.js
module.exports = {
  preset: 'conventionalcommits',
  presetConfig: {
    types: [
      { type: 'feat', section: 'Features' },
      { type: 'fix', section: 'Bug Fixes' },
      { type: 'perf', section: 'Performance' }
    ]
  }
}
```

### 跳过自动提交

```bash
npx standard-version --skip.commit --skip.tag
```

### 干运行模式

```bash
npx standard-version --dry-run
```

## 与 semantic-release 对比

| 特性 | standard-version | semantic-release |
|------|------------------|------------------|
| 自动发布 | ❌ 需手动 | ✅ 全自动 |
| CI/CD 集成 | 需配置 | 原生支持 |
| 学习曲线 | 低 | 中 |
| 灵活性 | 高 | 中 |
| CHANGELOG | ✅ | ✅ |
| npm 发布 | ❌ 需手动 | ✅ |

## 最佳实践

1. **使用 Conventional Commits 规范**
2. **配置 `.versionrc.js` 自定义格式**
3. **配合 CI/CD 自动化发布**
4. **使用 `--dry-run` 验证**
5. **保护主分支，通过 PR 合并**
6. **配合 commitlint 强制规范提交信息**
7. **使用 husky 自动检查提交信息**
8. **定期备份 CHANGELOG 文件**

## 与 commitlint 集成

### 安装 commitlint

```bash
pnpm add @commitlint/cli @commitlint/config-conventional -D
```

### 配置 commitlint

创建 `commitlint.config.js`：

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'perf', 'refactor', 'docs', 'style', 'test', 'chore', 'revert']
    ],
    'subject-case': [0],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'header-max-length': [2, 'always', 100]
  }
}
```

### 配置 husky 钩子

```bash
# 初始化 husky
npx husky init

# 添加 commitlint 钩子
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

### package.json 脚本

```json
{
  "scripts": {
    "prepare": "husky",
    "release": "standard-version",
    "release:alpha": "standard-version --prerelease alpha",
    "release:beta": "standard-version --prerelease beta",
    "release:major": "standard-version --release-as major",
    "release:minor": "standard-version --release-as minor",
    "release:dry": "standard-version --dry-run"
  }
}
```

## 自定义 CHANGELOG 模板

### 使用自定义模板

创建 `changelog-template.hbs`：

```handlebars
# Changelog

All notable changes to this project will be documented in this file.

{{#each releases}}
  ## [{{title}}]({{href}}) - {{niceDate}}

  {{! Features }}
  {{#if merges}}
  ### ✨ Features

  {{#each merges}}
  - {{message}} ([{{id}}]({{href}}))
  {{/each}}
  {{/if}}

  {{! Bug Fixes }}
  {{#if fixes}}
  ### 🐛 Bug Fixes

  {{#each fixes}}
  - {{commit.subject}} ([{{commit.shortHash}}]({{commit.href}}))
  {{/each}}
  {{/if}}

  {{! Breaking Changes }}
  {{#if breaking}}
  ### ⚠️ Breaking Changes

  {{#each breaking}}
  - {{message}}
  {{/each}}
  {{/if}}

{{/each}}
```

### 配置自定义模板

```javascript
// .versionrc.js
module.exports = {
  // 指定模板文件
  writerOpts: {
    transform: (commit, context) => {
      // 自定义转换逻辑
      if (commit.type === 'feat') {
        commit.type = '✨ Features'
      } else if (commit.type === 'fix') {
        commit.type = '🐛 Bug Fixes'
      }
      return commit
    }
  }
}
```

## 常见问题解答

### 1. 如何处理没有提交记录的情况？

```bash
# standard-version 会检测是否有相关提交
# 如果没有 feat/fix 类型的提交，会提示：
# "No relevant changes detected, skipping release."

# 强制发布
npx standard-version --release-as patch
```

### 2. 如何更改 CHANGELOG 格式？

```javascript
// .versionrc.js
module.exports = {
  // 自定义提交 URL 格式
  commitUrlFormat: 'https://gitee.com/{{owner}}/{{repository}}/commit/{{hash}}',

  // 自定义版本比较 URL
  compareUrlFormat: 'https://gitee.com/{{owner}}/{{repository}}/compare/{{previousTag}}...{{currentTag}}',

  // 自定义 Issue URL
  issueUrlFormat: 'https://gitee.com/{{owner}}/{{repository}}/issues/{{id}}'
}
```

### 3. 如何跳过某些提交？

在提交信息中添加 `[skip release]`：

```bash
git commit -m "docs: update README [skip release]"
```

### 4. 如何修改 CHANGELOG 文件位置？

```bash
# 方法 1：命令行参数
npx standard-version --infile docs/CHANGELOG.md

# 方法 2：配置文件
module.exports = {
  infile: 'docs/CHANGELOG.md'
}
```

### 5. 如何保留旧的 CHANGELOG 内容？

standard-version 会自动保留现有 CHANGELOG 的内容，只在顶部追加新版本。

### 6. 如何自定义版本标签？

```bash
# 方法 1：命令行参数
npx standard-version --tag-prefix 'release-'
# 结果: release-1.0.0

# 方法 2：配置文件
module.exports = {
  tagPrefix: 'v'
}
```

### 7. 如何在 Monorepo 中使用？

```javascript
// 根目录 .versionrc.js
module.exports = {
  // 只处理根目录提交
  path: '.',

  // 或指定包目录
  // path: 'packages/core'
}

// 在子包中运行
cd packages/core
npx standard-version
```

## 错误处理与调试

### 调试模式

```bash
# 启用详细日志
DEBUG=conventional-changelog:* npx standard-version

# 查看具体步骤
npx standard-version --dry-run --verbose
```

### 常见错误及解决方案

#### ENOGIT

```
Error: No git remote found
```

**解决方案：**
```bash
# 添加远程仓库
git remote add origin https://github.com/user/repo.git

# 或跳过 Git 相关检查
npx standard-version --skip.commit --skip.tag
```

#### ENOREPOURL

```
Error: Cannot find repository URL in package.json
```

**解决方案：**
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/user/repo.git"
  }
}
```

#### EINVALIDTAG

```
Error: Invalid tag format
```

**解决方案：**
```bash
# 清理错误的标签
git tag -d v1.0.0
git push --delete origin v1.0.0

# 重新创建发布
npx standard-version
```

#### ENOCHANGE

```
No relevant changes detected, skipping release.
```

**解决方案：**
- 确认是否有 feat/fix/perf 类型的提交
- 检查提交信息是否符合规范
- 使用 `--release-as` 强制发布

### 回滚发布

```bash
# 1. 删除本地标签
git tag -d v1.0.0

# 2. 删除远程标签
git push --delete origin v1.0.0

# 3. 重置提交
git reset --hard HEAD~1

# 4. 强制推送
git push --force origin main

# 5. 重新发布
npx standard-version
```

## 高级用法

### 自动化发布脚本

创建 `release.sh`：

```bash
#!/bin/bash

# 检查是否在主分支
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
  echo "Error: Please switch to main branch"
  exit 1
fi

# 检查是否有未提交的更改
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: Working directory is not clean"
  exit 1
fi

# 拉取最新代码
git pull origin main

# 运行测试
npm test || exit 1

# 创建发布
npx standard-version "$@"

# 推送代码和标签
git push --follow-tags origin main

# 发布到 npm
npm publish

echo "✅ Release completed successfully!"
```

使用：
```bash
chmod +x release.sh
./release.sh --release-as minor
```

### 多包发布策略

对于 Monorepo 项目：

```bash
# 1. 为每个包创建配置
packages/
  ├── core/
  │   └── .versionrc.js
  ├── cli/
  │   └── .versionrc.js
  └── utils/
      └── .versionrc.js

# 2. 根据包分别发布
cd packages/core && npx standard-version
cd packages/cli && npx standard-version
cd packages/utils && npx standard-version
```

### 配合 GitHub Actions 自动化

```yaml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    if: "!contains(github.event.head_commit.message, 'chore(release)')"
    steps:
      - uses: actions/checkout@v4
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://registry.npmjs.org'

      - run: pnpm install

      - name: Run tests
        run: npm test

      - name: Create Release
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          npx standard-version
          git push --follow-tags origin main

      - name: Publish to npm
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
