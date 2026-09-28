---
title: Git Hooks 与自动化
description: husky/lint-staged 在提交前校验中的集成与性能考量
keywords: [Node.js, 构建, 脚手架, Git, Hooks]
category: Node.js
tags: [Node.js, 工程化]
---







# Git Hooks 与自动化

## 介绍

Git Hooks 是 Git 提供的钩子机制，可以在 Git 操作的特定阶段（如提交、推送、合并等）自动执行自定义脚本，广泛用于代码检查、测试运行、部署发布等自动化任务，是保障代码质量和开发规范的重要工具。

### 核心特性

- **自动化执行**：在 Git 操作的关键节点自动触发，无需人工干预
- **可定制性强**：支持 Shell 脚本、Node.js 等多种脚本语言
- **质量保障**：提交前检查代码质量，推送前运行测试
- **规范统一**：强制执行提交信息规范、代码风格等
- **流程可控**：可以在关键操作前后插入自定义逻辑

### Git Hooks 架构

```
Git 操作流程与 Hooks 触发点
├── 提交流程 (Commit)
│   ├── pre-commit        → git commit 前（检查代码）
│   ├── prepare-commit-msg → 生成提交信息前（自动生成消息）
│   ├── commit-msg        → 提交信息编辑后（验证格式）
│   └── post-commit       → commit 完成后（通知）
├── 推送流程 (Push)
│   ├── pre-push          → git push 前（运行测试）
│   └── （Git 无客户端 post-push，推送后的动作需在服务端 post-receive 处理）
├── 合并流程 (Merge/Rebase)
│   ├── pre-merge-commit  → merge 前
│   └── post-merge        → merge 后
├── 检出流程 (Checkout)
│   ├── post-checkout     → 切换分支后
│   └── post-rewrite      → rebase/commit --amend 后
└── 其他操作
    ├── pre-rebase        → rebase 前
    ├── pre-auto-gc       → 自动垃圾回收前
    └── post-receive      → 远程仓库接收推送后
```

## Git Hooks 类型详解

### 客户端 Hooks

| Hook | 触发时机 | 常见用途 | 是否可阻止操作 |
|------|---------|---------|--------------|
| `pre-commit` | `git commit` 前 | 代码检查、格式化、测试 | ✅ 是 |
| `prepare-commit-msg` | 生成提交信息前 | 自动生成提交信息模板 | ❌ 否 |
| `commit-msg` | 提交信息编辑后 | 验证提交信息格式 | ✅ 是 |
| `post-commit` | commit 完成后 | 发送通知、触发构建 | ❌ 否 |
| `pre-push` | `git push` 前 | 运行测试、检查分支 | ✅ 是 |
| `post-checkout` | 切换分支后 | 清理缓存、安装依赖 | ❌ 否 |
| `pre-rebase` | `git rebase` 前 | 检查 rebase 安全性 | ✅ 是 |
| `post-merge` | merge 完成后 | 安装依赖、清理缓存 | ❌ 否 |
| `post-rewrite` | rebase/amend 后 | 更新工作区 | ❌ 否 |

### 服务端 Hooks

| Hook | 触发时机 | 常见用途 |
|------|---------|---------|
| `pre-receive` | 接收推送前 | 权限验证、代码检查 |
| `update` | 更新每个引用前 | 细粒度权限控制 |
| `post-receive` | 接收推送后 | 触发 CI/CD、通知 |

### Hooks 执行顺序

**提交流程：**
```
git commit → pre-commit → prepare-commit-msg → 编辑提交信息 → commit-msg → post-commit
```

**推送流程：**
```
git push → pre-push → 推送到远程 → post-receive (服务端)
```

## Husky

Husky 是最流行的 Git Hooks 管理工具，简化了 Hooks 的配置和管理流程。

### 核心特性

- **零配置初始化**：`npx husky init` 一键配置
- **跨平台支持**：Windows、macOS、Linux 统一行为
- **自动安装**：`prepare` 脚本自动配置 Hooks
- **版本管理**：支持 Husky v8/v9 不同版本

### 安装

```bash
# npm
npm install husky --save-dev

# pnpm
pnpm add husky -D

# yarn
yarn add husky -D
```

### 初始化

#### Husky v9 (最新版)

```bash
# 初始化 Husky
npx husky init

# 手动初始化
pnpm exec husky init
```

这会创建：
- `.husky/` 目录
- `.husky/pre-commit` 文件（默认执行 `npm test`）
- 在 `package.json` 中添加 `prepare` 脚本

#### Husky v8

```bash
# 安装
pnpm add husky -D

# 初始化（v8 用法）
npx husky install

# 添加 prepare 脚本
npm pkg set scripts.prepare="husky install"
```

### 目录结构

```
项目根目录/
├── .husky/
│   ├── _/                 # Husky 核心脚本（勿修改）
│   │   ├── .gitignore
│   │   └── husky.sh
│   ├── pre-commit         # 提交前 hook
│   ├── commit-msg         # 提交信息验证 hook
│   ├── pre-push           # 推送前 hook
│   └── post-merge         # 合并后 hook
├── package.json
└── .git/
    └── hooks/             # Git 原生 hooks（由 Husky 管理）
```

### 配置 Hooks

> **注**：以下示例为 Husky v8 风格（需要 shebang 与 `husky.sh` 引导行）。Husky v9 的 hook 文件可直接写命令，无需这两行。

#### pre-commit

提交前检查代码质量：

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 运行 lint-staged
npx lint-staged

# 或者直接运行 lint
# pnpm run lint
```

#### commit-msg

验证提交信息格式：

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 使用 commitlint 验证
npx --no -- commitlint --edit $1

# 或者自定义验证
# message=$(cat $1)
# if ! echo "$message" | grep -qE "^(feat|fix|docs|style|refactor|test|chore)(\(.+\))?: .{1,}"; then
#   echo "提交信息格式错误！"
#   echo "格式: type(scope): subject"
#   exit 1
# fi
```

#### pre-push

推送前运行测试：

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 运行测试
pnpm test

# 或者检查是否合并到主分支
# current_branch=$(git branch --show-current)
# if [ "$current_branch" = "main" ]; then
#   echo "禁止直接推送到 main 分支"
#   exit 1
# fi
```

#### post-merge

合并后自动安装依赖：

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 检查 package.json 是否有变化
changed_files=$(git diff-tree -r --name-only --no-commit-id ORIG_HEAD HEAD)

if echo "$changed_files" | grep -q "package.json\|pnpm-lock.yaml"; then
  echo "检测到依赖变化，正在安装..."
  pnpm install
fi

# 其他自动化操作
# - 重新构建
# - 清理缓存
# - 重启开发服务器
```

#### post-checkout

切换分支后清理缓存：

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 获取切换前后的分支
prev_head=$1
new_head=$2
branch_switch=$3

# 如果是切换分支（不是检出文件）
if [ "$branch_switch" -eq 1 ]; then
  echo "切换分支，清理缓存..."
  rm -rf node_modules/.cache
  rm -rf dist
  rm -rf .next
fi
```

### 手动创建 Hook

```bash
# 创建新的 hook
npx husky add .husky/pre-commit "pnpm test"

# 或手动创建
echo 'pnpm test' > .husky/pre-commit
chmod +x .husky/pre-commit
```

### Husky 配置选项

Husky v4 及更早版本支持在 `package.json` 的 `husky` 字段或 `.huskyrc` 文件中集中配置 hooks：

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  }
}
```

> **注意**：Husky v5 起已移除这种集中式配置（`"husky"` 字段与 `.huskyrc` 均不再生效），统一改用 `.husky/` 目录下的独立 hook 文件（见上文"配置 Hooks"）。

### 禁用 Husky

```bash
# 临时禁用（当前会话）
export HUSKY=0

# 单次提交跳过
HUSKY=0 git commit -m "message"

# 或使用 --no-verify
git commit --no-verify -m "message"
git push --no-verify
```

### 版本差异

| 特性 | Husky v8 | Husky v9 |
|------|---------|---------|
| 初始化命令 | `npx husky install` | `npx husky init` |
| 配置位置 | `.husky/` 目录 | `.husky/` 目录 |
| Git 配置 | 需要设置 `core.hooksPath` | 自动设置 |
| Node 版本 | >= 14 | >= 18 |
| 脚本语法 | 需要 `. "$(dirname "$0")/_/husky.sh"` | 可直接写命令 |

## lint-staged

lint-staged 只对暂存区（staged）的文件执行操作，避免对整个项目运行检查，大幅提升效率。

### 核心特性

- **增量检查**：仅检查暂存的文件，而非整个项目
- **自动格式化**：提交前自动修复代码格式
- **灵活配置**：支持文件匹配、任务列表
- **并行执行**：提高执行效率

### 安装

```bash
# npm
npm install lint-staged --save-dev

# pnpm
pnpm add lint-staged -D

# yarn
yarn add lint-staged -D
```

### 配置方式

#### 方式一：lint-staged.config.js（推荐）

```javascript
// lint-staged.config.js
module.exports = {
  // JavaScript/TypeScript 文件：先修复 ESLint，再格式化
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],

  // Vue 文件
  '*.vue': ['eslint --fix', 'prettier --write'],

  // JSON/CSS/SCSS/Markdown：仅格式化
  '*.{json,css,scss,less,md}': ['prettier --write'],

  // HTML 文件
  '*.html': ['prettier --write'],

  // YAML 文件
  '*.{yaml,yml}': ['prettier --write'],

  // 图片文件：可选优化
  '*.{png,jpg,jpeg,gif,svg}': ['imagemin-lint-staged']
}
```

#### 方式二：package.json

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,css,md}": ["prettier --write"]
  }
}
```

#### 方式三：.lintstagedrc.json

```json
{
  "*.{js,ts}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

### 高级配置

#### 使用函数动态生成命令

```javascript
// lint-staged.config.js
module.exports = {
  '**/*.ts': (filenames) => {
    // 对所有 TypeScript 文件运行类型检查
    return filenames.map((filename) => `tsc --noEmit ${filename}`)
  },

  '**/*.{js,ts}': (filenames) => {
    // 限制最大文件数
    if (filenames.length > 10) {
      console.log('文件数量过多，跳过单独检查')
      return 'eslint --fix .'
    }
    return filenames.map((filename) => `eslint --fix ${filename}`)
  }
}
```

#### 按文件类型分组执行

```javascript
// lint-staged.config.js
module.exports = {
  // 第一组：代码质量检查
  '*.{js,jsx,ts,tsx}': [
    () => 'eslint --fix',  // 对整个项目运行
    'prettier --write'
  ],

  // 第二组：样式文件
  '*.{css,scss}': [
    'stylelint --fix',
    'prettier --write'
  ],

  // 第三组：测试
  '*.{test,spec}.{js,ts}': [
    'jest --bail --findRelatedTests'
  ]
}
```

#### 并发控制

```javascript
// lint-staged.config.js
module.exports = {
  '*.{js,ts}': ['eslint --fix', 'prettier --write']
}

// package.json
{
  "scripts": {
    "lint-staged": "lint-staged --concurrent false"  // 串行执行
  }
}
```

#### 添加文件到暂存区

```javascript
// lint-staged.config.js
module.exports = {
  '*.{js,ts}': [
    'eslint --fix',
    'prettier --write'
    // lint-staged v10+ 会自动把修复后的文件重新加入暂存区，无需手动执行 'git add'
  ]
}
```

### 与 Husky 配合

```bash
# .husky/pre-commit
npx lint-staged
```

或在 `package.json` 中：

```json
{
  "scripts": {
    "prepare": "husky",
    "lint-staged": "lint-staged"
  }
}
```

```bash
# .husky/pre-commit
pnpm run lint-staged
```

### 命令行参数

```bash
# 运行 lint-staged
npx lint-staged

# 指定配置文件
npx lint-staged --config .lintstagedrc.json

# 相对路径
npx lint-staged --relative

# 允许空暂存区
npx lint-staged --allow-empty

# 并发控制
npx lint-staged --concurrent 5

# 详细输出
npx lint-staged --verbose

# 静默模式
npx lint-staged --quiet

# 通过 shell 执行命令（默认直接 spawn，不经过 shell）
npx lint-staged --shell
```

### 配置优先级

lint-staged 按以下顺序查找配置：

1. `lint-staged.config.js`
2. `.lintstagedrc`
3. `.lintstagedrc.json`
4. `.lintstagedrc.yaml`
5. `.lintstagedrc.yml`
6. `package.json` 中的 `lint-staged` 字段

## Commitlint

Commitlint 用于规范 Git 提交信息格式，确保提交历史清晰可追溯。

### 核心特性

- **格式验证**：强制执行提交信息规范
- **多种规则**：支持 Conventional Commits、Angular 等规范
- **自定义规则**：灵活配置提交类型、范围等
- **自动提示**：配合工具生成交互式提交信息

### 安装

```bash
# npm
npm install @commitlint/cli @commitlint/config-conventional --save-dev

# pnpm
pnpm add @commitlint/cli @commitlint/config-conventional -D

# yarn
yarn add @commitlint/cli @commitlint/config-conventional -D
```

### 配置

创建 `commitlint.config.js`：

```javascript
// commitlint.config.js
module.exports = {
  // 继承预设规则
  extends: ['@commitlint/config-conventional'],

  // 自定义规则
  rules: {
    // 类型枚举（type 必须是以下之一）
    'type-enum': [
      2,        // 规则级别：0-禁用, 1-警告, 2-错误
      'always', // 应用方式：always-总是, never-从不
      [
        'feat',     // 新功能
        'fix',      // 修复 bug
        'docs',     // 文档变更
        'style',    // 代码格式（不影响代码运行）
        'refactor', // 重构（既不是新功能也不是修复）
        'perf',     // 性能优化
        'test',     // 增加测试
        'chore',    // 构建过程或辅助工具变动
        'revert',   // 回滚
        'build',    // 构建系统或外部依赖变更
        'ci'        // CI 配置文件和脚本变更
      ]
    ],

    // 主题大小写（关闭检查）
    'subject-case': [0],

    // 主题不能为空
    'subject-empty': [2, 'never'],

    // 主题不能以句号结尾
    'subject-full-stop': [2, 'never', '.'],

    // 类型不能为空
    'type-empty': [2, 'never'],

    // 类型大小写
    'type-case': [2, 'always', 'lower-case'],

    // 主题最小长度
    'subject-min-length': [2, 'always', 5],

    // 主题最大长度
    'subject-max-length': [2, 'always', 50],

    // 正文每行最大长度
    'body-max-line-length': [2, 'always', 100],

    // 页脚最大行长度
    'footer-max-line-length': [2, 'always', 100]
  },

  // 自定义解析器
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/,
      headerCorrespondence: ['type', 'scope', 'subject']
    }
  }
}
```

### 提交信息格式

#### 基本格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### 完整示例

```
feat(user): 添加用户登录功能

- 实现邮箱登录
- 添加验证码校验
- 集成第三方登录（微信、GitHub）

Closes #123
BREAKING CHANGE: 登录接口从 /api/login 改为 /api/auth/login
```

#### 各部分说明

| 部分 | 必需 | 说明 | 示例 |
|------|------|------|------|
| `type` | ✅ | 提交类型 | `feat`, `fix`, `docs` |
| `scope` | ❌ | 影响范围 | `user`, `api`, `ui` |
| `subject` | ✅ | 简短描述 | `添加用户登录功能` |
| `body` | ❌ | 详细描述 | 多行详细说明 |
| `footer` | ❌ | 页脚信息 | `Closes #123` |

### 常见提交类型

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(user): 添加用户注册功能` |
| `fix` | 修复 bug | `fix(api): 修复登录接口超时问题` |
| `docs` | 文档变更 | `docs: 更新 README 安装说明` |
| `style` | 代码格式 | `style: 格式化代码缩进` |
| `refactor` | 重构 | `refactor(auth): 重构登录逻辑` |
| `perf` | 性能优化 | `perf(list): 优化列表渲染性能` |
| `test` | 测试 | `test(user): 添加登录单元测试` |
| `chore` | 构建/工具 | `chore: 更新构建配置` |
| `ci` | CI/CD | `ci: 添加 GitHub Actions 配置` |
| `revert` | 回滚 | `revert: 回滚登录功能` |
| `build` | 构建 | `build: 升级 webpack 版本` |

### 与 Husky 配合

```bash
# .husky/commit-msg
npx --no -- commitlint --edit $1
```

### 命令行使用

```bash
# 检查提交信息文件
echo "feat: test" | npx commitlint

# 检查最近一次提交
npx commitlint --from HEAD~1 --to HEAD

# 检查指定范围
npx commitlint --from origin/main --to HEAD

# 使用配置文件
npx commitlint --config commitlint.config.js

# 打印帮助
npx commitlint --help
```

### 共享配置

#### @commitlint/config-conventional

遵循 Conventional Commits 规范。

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional']
}
```

#### @commitlint/config-angular

遵循 Angular 提交规范。

```javascript
module.exports = {
  extends: ['@commitlint/config-angular']
}
```

#### @commitlint/config-lerna-scopes

Lerna 项目专用。

```javascript
module.exports = {
  extends: ['@commitlint/config-lerna-scopes']
}
```

## Commitizen

Commitizen 提供交互式命令行界面，帮助生成规范的提交信息。

### 安装

```bash
# 全局安装（可选）
npm install -g commitizen

# 项目本地安装
pnpm add commitizen cz-conventional-changelog -D
```

### 配置

在 `package.json` 中配置：

```json
{
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  },
  "scripts": {
    "commit": "cz"
  }
}
```

### 使用

```bash
# 使用交互式提交
pnpm run commit

# 或使用 git cz（需全局安装）
git cz
```

### 自定义适配器

#### cz-customizable

```bash
pnpm add cz-customizable -D
```

```json
{
  "config": {
    "commitizen": {
      "path": "node_modules/cz-customizable"
    },
    "cz-customizable": {
      "config": ".cz-config.js"
    }
  }
}
```

创建 `.cz-config.js`：

```javascript
module.exports = {
  types: [
    { value: 'feat', name: 'feat:     新功能' },
    { value: 'fix', name: 'fix:      修复 bug' },
    { value: 'docs', name: 'docs:     文档变更' },
    { value: 'style', name: 'style:    代码格式' },
    { value: 'refactor', name: 'refactor: 重构' },
    { value: 'perf', name: 'perf:     性能优化' },
    { value: 'test', name: 'test:     测试' },
    { value: 'chore', name: 'chore:    构建/工具' },
    { value: 'revert', name: 'revert:   回滚' }
  ],

  scopes: [
    { name: 'user' },
    { name: 'order' },
    { name: 'product' },
    { name: 'api' },
    { name: 'ui' }
  ],

  allowTicketNumber: false,
  isTicketNumberRequired: false,
  ticketNumberPrefix: '#',
  ticketNumberRegExp: '\\d{1,5}',

  messages: {
    type: '选择提交类型:',
    scope: '选择影响范围（可选）:',
    customScope: '输入影响范围:',
    subject: '输入简短描述:',
    body: '输入详细描述（可选）:',
    breaking: '是否有破坏性变更（可选）:',
    footer: '关联的 issue（可选）:',
    confirmCommit: '确认提交?'
  },

  allowCustomScopes: true,
  allowBreakingChanges: ['feat', 'fix'],
  skipQuestions: ['body', 'footer'],

  subjectLimit: 100
}
```

#### cz-git

现代化的 Commitizen 适配器，支持 emoji 和智能提示。

```bash
pnpm add cz-git -D
```

```json
{
  "config": {
    "commitizen": {
      "path": "node_modules/cz-git"
    }
  }
}
```

## 其他工具

### simple-git-hooks

轻量级 Git Hooks 管理工具，比 Husky 更简单。

#### 安装

```bash
pnpm add simple-git-hooks -D
```

#### 配置

在 `package.json` 中：

```json
{
  "scripts": {
    "postinstall": "simple-git-hooks"
  },
  "simple-git-hooks": {
    "pre-commit": "npx lint-staged",
    "commit-msg": "npx commitlint --edit $1",
    "pre-push": "pnpm test"
  }
}
```

#### 优缺点对比

| 特性 | Husky | simple-git-hooks |
|------|-------|------------------|
| 配置复杂度 | 中等 | 简单 |
| 功能丰富度 | 高 | 中 |
| 社区支持 | 广泛 | 较少 |
| 包大小 | ~30KB | ~2KB |
| 学习曲线 | 平缓 | 很平缓 |

### nano-staged

轻量级 lint-staged 替代品。

#### 安装

```bash
pnpm add nano-staged -D
```

#### 配置

```json
{
  "nano-staged": {
    "*.js": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

#### 优缺点对比

| 特性 | lint-staged | nano-staged |
|------|-------------|-------------|
| 包大小 | ~80KB | ~7KB |
| 功能 | 丰富 | 基础 |
| 速度 | 快 | 更快 |
| 配置灵活性 | 高 | 中 |

## 完整工作流程

### 工作流程图

```
┌─────────────────────────────────────────────────────────────┐
│                     Git 提交工作流程                          │
└─────────────────────────────────────────────────────────────┘

开发者执行 git commit
        │
        ▼
┌──────────────────┐
│  pre-commit hook │
└──────────────────┘
        │
        ▼
┌──────────────────┐     失败     ┌─────────────┐
│   lint-staged    │─────────────→│  阻止提交    │
│  - ESLint 检查   │              │  显示错误    │
│  - Prettier 格式化│              └─────────────┘
└──────────────────┘
        │ 成功
        ▼
┌──────────────────┐
│ 准备提交信息      │
│(prepare-commit-msg)│
└──────────────────┘
        │
        ▼
┌──────────────────┐     失败     ┌─────────────┐
│ commit-msg hook  │─────────────→│  阻止提交    │
└──────────────────┘              │  提示格式错误│
        │                         └─────────────┘
        ▼ 成功
┌──────────────────┐
│  创建提交记录     │
│  (post-commit)   │
└──────────────────┘
        │
        ▼
   提交完成
```

### 完整配置示例

#### package.json

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint src --ext .js,.ts,.vue",
    "lint:fix": "eslint src --ext .js,.ts,.vue --fix",
    "format": "prettier --write \"src/**/*.{js,ts,vue,json,css}\"",
    "test": "jest",
    "test:coverage": "jest --coverage",
    "commit": "cz",
    "prepare": "husky"
  },
  "devDependencies": {
    "@commitlint/cli": "^18.0.0",
    "@commitlint/config-conventional": "^18.0.0",
    "commitizen": "^4.3.0",
    "cz-conventional-changelog": "^3.3.0",
    "eslint": "^8.55.0",
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "prettier": "^3.1.0"
  },
  "lint-staged": {
    "*.{js,ts,vue}": ["eslint --fix", "prettier --write"],
    "*.{json,css,md}": ["prettier --write"]
  },
  "config": {
    "commitizen": {
      "path": "cz-conventional-changelog"
    }
  }
}
```

#### .husky/pre-commit

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 正在检查代码质量..."
npx lint-staged

echo "✅ 代码检查通过"
```

#### .husky/commit-msg

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "📝 正在验证提交信息格式..."
npx --no -- commitlint --edit $1

echo "✅ 提交信息格式正确"
```

#### .husky/pre-push

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🧪 正在运行测试..."
pnpm test

if [ $? -ne 0 ]; then
  echo "❌ 测试失败，请修复后再推送"
  exit 1
fi

echo "✅ 测试通过"
```

#### commitlint.config.js

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'revert', 'build', 'ci']
    ],
    'subject-case': [0]
  }
}
```

## VSCode 集成

### 推荐插件

在 `.vscode/extensions.json` 中配置：

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "vivaxy.vscode-conventional-commits",
    "knisterpeter.vscode-commitizen"
  ]
}
```

### Conventional Commits 插件

自动生成规范的提交信息，支持自动补全和模板。

使用方式：
1. 按 `Cmd+Shift+P` 打开命令面板
2. 输入 `Conventional Commits`
3. 选择类型、范围、输入描述
4. 自动生成规范提交信息

### VSCode 设置

在 `.vscode/settings.json` 中配置：

```json
{
  // 启用自动保存
  "editor.formatOnSave": true,

  // Git 自动拉取
  "git.autofetch": true,

  // 提交信息自动换行
  "git.inputValidation": "enabled",
  "git.inputValidationLength": 72,
  "git.inputValidationSubjectLength": 50
}
```

## CI/CD 集成

### GitHub Actions

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install

      - name: 检查代码格式
        run: pnpm format:check

      - name: 运行 ESLint
        run: pnpm lint

  commitlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install

      - name: 验证提交信息
        run: npx commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.sha }}

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - run: pnpm install

      - name: 运行测试
        run: pnpm test
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - lint
  - test

lint:
  stage: lint
  image: node:20
  before_script:
    - npm install -g pnpm
    - pnpm install
  script:
    - pnpm lint
    - pnpm format:check

commitlint:
  stage: lint
  image: node:20
  before_script:
    - npm install -g pnpm
    - pnpm install
  script:
    - npx commitlint --from $CI_COMMIT_BEFORE_SHA --to $CI_COMMIT_SHA

test:
  stage: test
  image: node:20
  before_script:
    - npm install -g pnpm
    - pnpm install
  script:
    - pnpm test
```

## 常见问题

### Q1: 如何跳过 Git Hooks？

```bash
# 方式一：使用 --no-verify 参数
git commit --no-verify -m "message"
git push --no-verify

# 方式二：设置环境变量
HUSKY=0 git commit -m "message"

# 方式三：全局禁用 Husky
export HUSKY=0
git commit -m "message"
```

> **注意**：跳过 Hooks 应仅在紧急情况下使用，不建议常规操作。

### Q2: Hooks 不生效怎么办？

**排查步骤：**

1. **检查 Husky 安装**

```bash
# 查看是否安装
pnpm list husky

# 重新初始化（v9；v8 使用 npx husky install）
npx husky init
```

2. **检查 .husky 目录**

```bash
# 确保存在 _ 目录
ls -la .husky/

# 应该看到：
# .husky/
# ├── _/
# │   ├── .gitignore
# │   └── husky.sh
# ├── pre-commit
# └── commit-msg
```

3. **检查 Git 配置**

```bash
# 查看 core.hooksPath
git config --get core.hooksPath

# 应该输出：.husky

# 手动设置（如果未设置）
git config core.hooksPath .husky
```

4. **检查文件权限**

```bash
# 确保脚本可执行
chmod +x .husky/pre-commit
chmod +x .husky/commit-msg
```

5. **检查脚本内容**

```bash
# 查看脚本
cat .husky/pre-commit

# 确保包含：
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
```

### Q3: lint-staged 运行很慢怎么办？

**优化方案：**

1. **减少检查范围**

```javascript
// lint-staged.config.js
module.exports = {
  // 只检查源代码，忽略测试文件
  'src/**/*.{js,ts}': ['eslint --fix', 'prettier --write'],
  // 不检查配置文件
  // '*.{json,md}': ['prettier --write']
}
```

2. **并行执行**

```bash
# 使用 --concurrent 参数
npx lint-staged --concurrent 5
```

3. **使用缓存**

```json
{
  "scripts": {
    "lint": "eslint src --cache --cache-location .eslintcache"
  }
}
```

4. **跳过不必要的任务**

```javascript
// lint-staged.config.js
module.exports = {
  '*.{js,ts}': [
    // 先检查语法，失败则跳过格式化
    'eslint --fix',
    // 仅在 ESLint 通过时格式化
    'prettier --write'
  ]
}
```

### Q4: commitlint 验证失败但没有提示？

**解决方法：**

1. **检查配置文件**

```bash
# 验证配置
npx commitlint --from HEAD~1 --verbose
```

2. **确保 hook 正确**

```bash
# .husky/commit-msg
npx --no -- commitlint --edit $1
```

3. **手动测试**

```bash
# 测试提交信息
echo "feat: test message" | npx commitlint
```

### Q5: 如何在不同分支使用不同的 Hooks？

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 获取当前分支
branch=$(git branch --show-current)

if [ "$branch" = "main" ]; then
  echo "主分支提交，运行完整检查..."
  pnpm lint
  pnpm test
else
  echo "开发分支提交，运行 lint-staged..."
  npx lint-staged
fi
```

### Q6: 如何让团队成员自动配置 Hooks？

**方案一：使用 prepare 脚本**

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

`prepare` 脚本会在 `npm install` 后自动执行。

**方案二：使用 postinstall**

```json
{
  "scripts": {
    "postinstall": "husky"
  }
}
```

**方案三：在 README 中说明**

```markdown
## 开发环境设置

1. 克隆项目
2. 安装依赖：`pnpm install`
3. 初始化 Git Hooks：`pnpm run prepare`
```

### Q7: Windows 环境下 Hooks 不工作？

**解决方案：**

1. **使用 Git Bash**

在 Git Bash 中执行 Git 命令，而非 PowerShell。

2. **检查行尾符**

```bash
# 转换为 Unix 行尾
dos2unix .husky/pre-commit

# 或在 Git 中设置
git config --global core.autocrlf false
```

3. **确保 shebang 正确**

```bash
# 使用通用的 shebang
#!/usr/bin/env sh
```

### Q8: 如何在 monorepo 中使用？

**使用 Lerna/Nx/Turborepo：**

```
monorepo/
├── packages/
│   ├── web/
│   │   └── package.json
│   └── api/
│       └── package.json
├── package.json          # 根 package.json
├── .husky/
│   ├── pre-commit
│   └── commit-msg
└── lint-staged.config.js # 根配置
```

**lint-staged.config.js：**

```javascript
module.exports = {
  'packages/**/*.{js,ts}': ['eslint --fix', 'prettier --write'],
  '*.{json,md}': ['prettier --write']
}
```

**package.json：**

```json
{
  "scripts": {
    "lint": "lerna run lint",
    "test": "lerna run test",
    "prepare": "husky"
  }
}
```

### Q9: 如何在提交前自动运行类型检查？

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 运行 lint-staged
npx lint-staged

# 运行类型检查（仅对 TypeScript 文件）
staged_ts_files=$(git diff --cached --name-only --diff-filter=ACM | grep '\.tsx\?$')

if [ -n "$staged_ts_files" ]; then
  echo "运行类型检查..."
  pnpm exec tsc --noEmit
fi
```

### Q10: 如何在 CI 中跳过 Hooks？

```bash
# GitHub Actions
- name: 跳过 Hooks 提交
  run: git commit --no-verify -m "message"

# 或设置环境变量
- name: 设置环境变量
  run: echo "HUSKY=0" >> $GITHUB_ENV
```

## 最佳实践

### 1. Hooks 配置原则

- **快速反馈**：pre-commit 只做快速检查（格式化、lint）
- **全面检查**：pre-push 运行完整测试
- **合理跳过**：提供跳过机制，但需要明确文档说明

### 2. 提交信息规范

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // 允许的提交类型
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'revert', 'build', 'ci']
    ],
    // 主题最大长度
    'subject-max-length': [2, 'always', 50],
    // 允许空范围
    'scope-empty': [1, 'never']
  }
}
```

### 3. lint-staged 配置

```javascript
// lint-staged.config.js
module.exports = {
  // 按优先级排序
  '*.{js,ts,tsx}': [
    'eslint --fix --cache',  // 先修复代码问题
    'prettier --write'       // 再格式化
  ],
  '*.{css,scss}': [
    'stylelint --fix',       // CSS 检查
    'prettier --write'
  ],
  '*.{json,md}': [
    'prettier --write'
  ]
}
```

### 4. 团队协作清单

- [ ] 统一安装依赖版本（锁定 package-lock.json/pnpm-lock.yaml）
- [ ] 统一 Husky 版本和配置
- [ ] 统一 Commitlint 规则
- [ ] 统一 lint-staged 配置
- [ ] 文档说明如何跳过 Hooks（仅紧急情况）
- [ ] CI/CD 中添加提交信息验证
- [ ] 定期审查提交历史质量

### 5. 性能优化建议

| 优化项 | 说明 | 效果 |
|--------|------|------|
| 使用缓存 | ESLint/Prettier 启用缓存 | 明显提升 |
| 并行执行 | lint-staged 并发运行 | 有提升 |
| 增量检查 | 只检查暂存文件 | 大幅提升 |
| 跳过测试 | pre-commit 不运行测试 | 快速反馈 |

> 效果为定性经验判断，具体收益因项目规模与硬件而异。

### 6. 错误处理

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

set -e  # 任何命令失败立即退出

echo "🔍 运行代码检查..."

# 运行 lint-staged
if ! npx lint-staged; then
  echo "❌ 代码检查失败"
  echo "💡 提示：运行 'pnpm lint:fix' 自动修复"
  exit 1
fi

echo "✅ 代码检查通过"
```

## 参考资源

- [Git Hooks 官方文档](https://git-scm.com/docs/githooks)
- [Husky 官方文档](https://typicode.github.io/husky/)
- [lint-staged GitHub](https://github.com/okonet/lint-staged)
- [Commitlint 官方文档](https://commitlint.js.org/)
- [Conventional Commits 规范](https://www.conventionalcommits.org/)
- [Commitizen GitHub](https://github.com/commitizen/cz-cli)
- [simple-git-hooks GitHub](https://github.com/toplenboren/simple-git-hooks)
- [Angular 提交规范](https://github.com/angular/angular/blob/master/CONTRIBUTING.md#commit)
