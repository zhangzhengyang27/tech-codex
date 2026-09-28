---
title: semantic-release
description: 基于 Conventional Commits 的全自动版本与发布流水线
keywords: [Node.js, 构建, 脚手架, semantic-release]
category: Node.js
tags: [Node.js, 工程化]
---







# semantic-release

## 介绍

semantic-release 是一个自动化版本管理和包发布工具，根据提交信息自动确定版本号、生成 CHANGELOG 并发布。

### 核心特性

- **全自动化发布流程**：从版本号确定到包发布无需人工干预
- **语义化版本控制**：基于 Conventional Commits 规范自动计算版本号
- **自动化 CHANGELOG**：根据提交信息自动生成变更日志
- **多平台支持**：支持 npm、GitHub、GitLab 等多个发布平台
- **插件化架构**：通过插件扩展功能，满足不同需求

## 系统架构

### 发布流程生命周期

```
提交代码 → 分析提交 → 确定版本 → 生成 Notes → 更新 CHANGELOG → 发布 → Git 提交
   ↓           ↓          ↓           ↓              ↓           ↓        ↓
Git Push  Analyze    Calc Ver   Generate Log    Update Log   Publish  Commit
```

### 核心概念

| 概念 | 说明 |
|------|------|
| **Commit Analyzer** | 分析提交信息，确定版本号变化 |
| **Release Notes Generator** | 生成发布说明文档 |
| **Changelog** | 更新 CHANGELOG.md 文件 |
| **NPM Plugin** | 发布包到 npm registry |
| **Git Plugin** | 提交版本变更到 Git 仓库 |
| **GitHub Plugin** | 创建 GitHub Release |

## 安装

```bash
pnpm add semantic-release -D
```

### 安装核心插件

```bash
# 核心插件
pnpm add @semantic-release/commit-analyzer -D
pnpm add @semantic-release/release-notes-generator -D
pnpm add @semantic-release/changelog -D
pnpm add @semantic-release/npm -D
pnpm add @semantic-release/git -D
pnpm add @semantic-release/github -D
```

## 配置

### .releaserc.js

```javascript
module.exports = {
  branches: ['main', { name: 'beta', prerelease: true }],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    '@semantic-release/npm',
    '@semantic-release/github',
    '@semantic-release/git'
  ]
}
```

## 提交信息规范

遵循 Conventional Commits 规范：

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型与版本对应

| 类型 | 版本变化 | 示例 |
|------|---------|------|
| `feat` | Minor (1.0.0 → 1.1.0) | feat: add login feature |
| `fix` | Patch (1.0.0 → 1.0.1) | fix: resolve login bug |
| `feat!` 或 `BREAKING CHANGE` | Major (1.0.0 → 2.0.0) | feat!: change API |

### 版本号计算规则详解

#### SemVer 规范

semantic-release 遵循 [Semantic Versioning](https://semver.org/) 规范：

```
MAJOR.MINOR.PATCH

MAJOR - 不兼容的 API 变更
MINOR - 向后兼容的新功能
PATCH - 向后兼容的问题修复
```

#### 版本计算逻辑

```javascript
// 版本计算示例
当前版本: 1.0.0

提交记录:
- feat: add feature A  → 1.1.0 (Minor)
- fix: fix bug B       → 1.1.1 (Patch)
- feat!: breaking change → 2.0.0 (Major)

最终版本: 2.0.0 (取最高级别变更)
```

#### 预发布版本

```javascript
// 分支配置
branches: [
  'main',                           // 正式版本: 1.0.0
  { name: 'beta', prerelease: true },  // 预发布: 1.0.0-beta.1
  { name: 'alpha', prerelease: true }  // 预发布: 1.0.0-alpha.1
]
```

## 常用插件

### @semantic-release/commit-analyzer

分析提交信息，确定版本号：

```javascript
{
  plugins: [
    ['@semantic-release/commit-analyzer', {
      preset: 'conventionalcommits',
      releaseRules: [
        { type: 'feat', release: 'minor' },
        { type: 'fix', release: 'patch' },
        { type: 'perf', release: 'patch' },
        { breaking: true, release: 'major' }
      ]
    }]
  ]
}
```

#### 配置参数详解

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `preset` | String | `angular` | 提交信息规范预设 |
| `presetConfig` | Object | `{}` | 预设配置 |
| `releaseRules` | Array | `[]` | 自定义版本规则 |
| `parserOpts` | Object | `{}` | 解析器选项 |

#### 自定义版本规则示例

```javascript
releaseRules: [
  { type: 'feat', release: 'minor' },
  { type: 'fix', release: 'patch' },
  { type: 'perf', release: 'patch' },
  { type: 'refactor', release: 'patch' },
  { type: 'docs', release: false },      // 不触发发布
  { type: 'style', release: false },
  { type: 'chore', release: false },
  { type: 'test', release: false },
  { breaking: true, release: 'major' }   // 破坏性变更
]
```

### @semantic-release/release-notes-generator

生成发布说明：

```javascript
{
  plugins: [
    ['@semantic-release/release-notes-generator', {
      preset: 'conventionalcommits',
      presetConfig: {
        types: [
          { type: 'feat', section: 'Features' },
          { type: 'fix', section: 'Bug Fixes' },
          { type: 'perf', section: 'Performance' }
        ]
      }
    }]
  ]
}
```

#### 配置参数详解

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `preset` | String | `angular` | 提交信息规范预设 |
| `presetConfig` | Object | `{}` | 预设配置 |
| `writerOpts` | Object | `{}` | 写入器选项 |
| `linkCompare` | Boolean | `true` | 是否包含版本比较链接 |
| `linkReferences` | Boolean | `false` | 是否链接提交引用 |

### @semantic-release/changelog

生成/更新 CHANGELOG.md：

```bash
pnpm add @semantic-release/changelog -D
```

```javascript
{
  plugins: [
    ['@semantic-release/changelog', {
      changelogFile: 'CHANGELOG.md',
      changelogTitle: '# Changelog'
    }]
  ]
}
```

#### 配置参数详解

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `changelogFile` | String | `'CHANGELOG.md'` | CHANGELOG 文件路径 |
| `changelogTitle` | String | `'# Changelog'` | CHANGELOG 标题 |

### @semantic-release/npm

发布到 npm：

```javascript
{
  plugins: [
    ['@semantic-release/npm', {
      npmPublish: true,
      tarballDir: 'dist'
    }]
  ]
}
```

#### 配置参数详解

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `npmPublish` | Boolean | `true` | 是否发布到 npm |
| `tarballDir` | String | `'.'` | tarball 文件存储目录 |
| `pkgRoot` | String | `'.'` | package.json 所在目录 |

### @semantic-release/git

提交更改：

```bash
pnpm add @semantic-release/git -D
```

```javascript
{
  plugins: [
    ['@semantic-release/git', {
      assets: ['package.json', 'CHANGELOG.md', 'dist/**'],
      message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'
    }]
  ]
}
```

#### 配置参数详解

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `assets` | Array | `['CHANGELOG.md', 'package.json']` | 要提交的文件列表 |
| `message` | String | `'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}'` | 提交信息模板 |

#### 模板变量

| 变量 | 说明 |
|------|------|
| `${nextRelease.version}` | 新版本号 |
| `${nextRelease.notes}` | 发布说明 |
| `${nextRelease.gitTag}` | Git 标签 |
| `${lastRelease.gitTag}` | 上一个版本的 Git 标签 |

### @semantic-release/github

创建 GitHub Release：

```javascript
{
  plugins: [
    ['@semantic-release/github', {
      assets: [
        { path: 'dist/*.tgz', label: 'Distribution' }
      ]
    }]
  ]
}
```

#### 配置参数详解

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `assets` | Array | `[]` | 要附加到 Release 的文件 |
| `successComment` | Boolean/String | `false` | PR 成功后添加的评论 |
| `failTitle` | Boolean/String | `'The automated release is failing 🚨'` | 失败 Issue 标题 |
| `labels` | Boolean/Array | `false` | 失败 Issue 标签 |

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
      
      - run: pnpm install
      
      - run: pnpm build
      
      - run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### GitLab CI

```yaml
release:
  stage: deploy
  script:
    - pnpm install
    - pnpm build
    - npx semantic-release
  only:
    - main
  variables:
    GITLAB_TOKEN: $CI_JOB_TOKEN
    NPM_TOKEN: $NPM_TOKEN
```

## 配置示例

```javascript
// .releaserc.js
module.exports = {
  branches: [
    'main',
    { name: 'beta', prerelease: true },
    { name: 'alpha', prerelease: true }
  ],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        preset: 'conventionalcommits',
        releaseRules: [
          { type: 'feat', release: 'minor' },
          { type: 'fix', release: 'patch' },
          { type: 'perf', release: 'patch' },
          { type: 'refactor', release: 'patch' },
          { type: 'docs', release: false },
          { type: 'style', release: false },
          { type: 'chore', release: false },
          { type: 'test', release: false }
        ]
      }
    ],
    [
      '@semantic-release/release-notes-generator',
      {
        preset: 'conventionalcommits',
        presetConfig: {
          types: [
            { type: 'feat', section: '✨ Features' },
            { type: 'fix', section: '🐛 Bug Fixes' },
            { type: 'perf', section: '⚡ Performance' },
            { type: 'refactor', section: '♻️ Code Refactoring' }
          ]
        }
      }
    ],
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md'
      }
    ],
    '@semantic-release/npm',
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'CHANGELOG.md'],
        message: 'chore(release): ${nextRelease.version} [skip ci]'
      }
    ],
    '@semantic-release/github'
  ]
}
```

## npm 配置

确保 `package.json` 中配置：

```json
{
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/user/repo.git"
  }
}
```

## 本地测试

```bash
# 模拟发布过程（不实际发布）
npx semantic-release --dry-run

# 指定分支
npx semantic-release --branch beta
```

## 最佳实践

1. **使用 Conventional Commits 规范提交信息**
2. **配置 CI/CD 自动发布**
3. **使用 dry-run 验证配置**
4. **保护 main 分支，通过 PR 合并**
5. **配置 GitHub/NPM Token**
6. **使用预发布分支测试功能**
7. **配置 Git 提交消息包含 `[skip ci]` 避免循环触发**
8. **定期检查和更新插件版本**

## 常见问题解答

### 1. 为什么 semantic-release 没有触发发布？

**可能原因：**
- 没有 feature 或 fix 类型的提交
- 所有提交类型都配置为 `release: false`
- CI 环境缺少必要的 Token（GITHUB_TOKEN、NPM_TOKEN）
- 分支不在 `branches` 配置中
- 提交信息不符合 Conventional Commits 规范

**解决方案：**
```bash
# 使用 dry-run 诊断
npx semantic-release --dry-run

# 检查提交信息
git log --oneline | grep -E '^(feat|fix|perf|refactor)'
```

### 2. 如何跳过某次发布？

```javascript
// 在提交信息中添加 [skip release] 或 [release skip]
git commit -m "feat: add feature [skip release]"
```

### 3. 如何发布预发布版本？

```javascript
// .releaserc.js
module.exports = {
  branches: [
    'main',
    { name: 'beta', prerelease: true },
    { name: 'alpha', prerelease: true }
  ]
}
```

```bash
# 推送到预发布分支
git push origin HEAD:beta
```

### 4. 如何处理发布失败？

**检查步骤：**
1. 查看 CI 日志定位错误
2. 使用 `--dry-run` 验证配置
3. 检查 Token 权限
4. 检查 npm registry 访问权限
5. 确认包名是否已存在

**回滚方案：**
```bash
# 删除远程标签
git push --delete origin v1.0.0

# 使用 npm deprecate 标记版本
npm deprecate package-name@1.0.0 "This version has issues"
```

### 5. 如何自定义版本号格式？

```javascript
// 使用 @semantic-release/exec 插件
module.exports = {
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/exec',
      {
        prepareCmd: 'echo ${nextRelease.version}'
      }
    ]
  ]
}
```

### 6. 多包仓库如何配置？

```javascript
// 使用 @semantic-release/exec + lerna
module.exports = {
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/exec',
      {
        prepareCmd: 'lerna version ${nextRelease.version} --yes --no-git-tag-version',
        publishCmd: 'lerna publish from-package --yes'
      }
    ]
  ]
}
```

## 错误处理与调试

### 调试模式

```bash
# 启用详细日志
DEBUG=semantic-release:* npx semantic-release

# 特定插件调试
DEBUG=semantic-release:commit-analyzer npx semantic-release --dry-run
```

### 常见错误及解决方案

#### ENOGHTOKEN

```
Error: ENOGHTOKEN - No GitHub token specified
```

**解决方案：**
```yaml
# GitHub Actions
env:
  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

#### ENONPMTOKEN

```
Error: ENONPMTOKEN - No npm token specified
```

**解决方案：**
1. 创建 npm access token
2. 添加到 GitHub Secrets: `NPM_TOKEN`
3. 配置 CI 环境变量

#### EINVALIDVERSION

```
Error: EINVALIDVERSION - Invalid version
```

**解决方案：**
```bash
# 检查当前版本
cat package.json | grep version

# 确保版本号符合 SemVer
# 合法: 1.0.0, 1.0.0-beta.1
# 非法: v1.0.0, 1.0, 1.0.0.0
```

#### ENOPKG

```
Error: ENOPKG - No package.json found
```

**解决方案：**
```javascript
// 指定 package.json 路径
module.exports = {
  plugins: [
    ['@semantic-release/npm', {
      pkgRoot: './packages/core'
    }]
  ]
}
```

## 性能优化

### 减少插件数量

```javascript
// 精简插件列表，只保留必要的
module.exports = {
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    '@semantic-release/npm',
    '@semantic-release/git'
  ]
}
```

### 并行执行

semantic-release 默认按插件顺序执行，某些插件可以合并：

```javascript
// 不推荐：多个插件分别配置
module.exports = {
  plugins: [
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    '@semantic-release/npm',
    '@semantic-release/git'
  ]
}

// 推荐：合并配置，减少 Git 操作
module.exports = {
  plugins: [
    '@semantic-release/changelog',
    '@semantic-release/npm',
    ['@semantic-release/git', {
      assets: ['package.json', 'package-lock.json', 'CHANGELOG.md']
    }]
  ]
}
```

## 与其他工具对比

| 特性 | semantic-release | standard-version | Changesets |
|------|------------------|------------------|------------|
| **自动化程度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |
| **学习曲线** | 中等 | 低 | 中等 |
| **Monorepo 支持** | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **手动控制** | 低 | 高 | 中 |
| **CI/CD 集成** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **变更跟踪** | 提交级别 | 提交级别 | 变更集级别 |
| **适用场景** | 开源项目、自动发布 | 小型项目、手动控制 | Monorepo、多包管理 |

### 选择建议

- **选择 semantic-release**：适合开源项目，需要全自动化发布流程
- **选择 standard-version**：适合小型项目，需要手动控制发布时机
- **选择 Changesets**：适合 Monorepo 项目，需要精细控制多包版本
