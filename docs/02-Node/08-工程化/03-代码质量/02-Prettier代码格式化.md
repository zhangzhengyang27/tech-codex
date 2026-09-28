---
title: Prettier 代码格式化
description: Prettier 的格式化模型、与 ESLint 的分工及冲突消解
keywords: [Node.js, 构建, 脚手架, Prettier]
category: Node.js
tags: [Node.js, 工程化]
---







# Prettier 代码格式化

## 介绍

Prettier 是一个固执己见（Opinionated）的代码格式化工具，由 James Long 于 2017 年创建。它能够自动解析代码并按照统一的规则重新打印，支持 JavaScript、TypeScript、HTML、CSS、JSON、Markdown 等多种语言，有效解决团队代码风格不一致的问题。

### 核心特性

- **开箱即用**：内置合理的默认规则，无需复杂配置即可使用
- **多语言支持**：支持 JavaScript、TypeScript、HTML、CSS、SCSS、Less、JSON、Markdown、YAML、GraphQL 等
- **框架兼容**：完美支持 React、Vue、Angular 等主流框架的文件格式
- **编辑器集成**：与 VSCode、WebStorm、Sublime 等主流编辑器深度集成
- **自动格式化**：支持保存时自动格式化，提升开发效率
- **与 Linter 配合**：可与 ESLint 等工具协同工作，分别处理格式化和代码质量

### 设计理念

Prettier 采用"固执己见"的设计哲学，核心观点是：

1. **减少争论**：团队无需在代码风格上浪费精力讨论
2. **统一风格**：所有代码遵循相同的格式规则
3. **自动化处理**：开发者专注于逻辑，格式化交给工具
4. **AST 重构**：将代码解析为 AST 后重新打印，确保格式完全一致

### 与其他工具对比

| 工具 | 主要用途 | 特点 | 与 Prettier 关系 |
|------|---------|------|-----------------|
| ESLint | 代码质量 + 代码风格 | 高度可配置，规则丰富 | 可配合使用，关闭冲突规则 |
| Prettier | 代码格式化 | 开箱即用，格式统一 | 主力格式化工具 |
| EditorConfig | 编辑器配置 | 统一编辑器基础设置 | 可配合使用 |
| Stylelint | CSS 检查 | CSS/SCSS 规范检查 | 可配合使用 |

## 工作原理

```
源代码 → 解析器(AST) → 重新打印 → 格式化代码
```

1. **解析（Parse）**：解析器将源代码转换为抽象语法树（AST）
2. **遍历（Traverse）**：遍历 AST 提取语义信息
3. **重构（Reprint）**：按照规则重新打印代码，丢弃原有格式
4. **输出（Output）**：生成统一风格的代码

> **注意**：Prettier 会丢弃原有的所有格式信息，完全按照规则重新生成代码，这是其保证格式一致性的关键。

## 安装与配置

### 安装

```bash
# npm
npm install prettier --save-dev

# pnpm
pnpm add prettier -D

# yarn
yarn add prettier -D

# 全局安装（不推荐）
npm install -g prettier
```

### 版本要求

- Node.js >= 14
- 建议锁定具体版本号，避免不同版本格式化结果差异

## 配置文件详解

Prettier 支持多种配置文件格式，按优先级排序：

1. `package.json` 中的 `prettier` 字段
2. `.prettierrc`（JSON 或 YAML）
3. `.prettierrc.json`
4. `.prettierrc.yaml` / `.prettierrc.yml`
5. `.prettierrc.js` / `.prettierrc.cjs`
6. `.prettierrc.mjs`
7. `prettier.config.js` / `prettier.config.cjs`
8. `prettier.config.mjs`

### `.prettierrc.js` 完整配置

```javascript
/**
 * @type {import('prettier').Config}
 */
module.exports = {
  // ========== 核心格式化选项 ==========

  // 单行代码最大长度
  printWidth: 100,

  // 缩进空格数
  tabWidth: 2,

  // 是否使用 Tab 缩进
  useTabs: false,

  // 语句末尾是否添加分号
  // true: 总是添加
  // false: 不添加（ASI）
  semi: false,

  // 是否使用单引号
  // true: 使用单引号
  // false: 使用双引号
  singleQuote: true,

  // 对象属性是否添加引号
  // 'as-needed': 仅在需要时添加
  // 'consistent': 同一对象内保持一致
  // 'preserve': 保留原样
  quoteProps: 'as-needed',

  // JSX 中是否使用单引号
  jsxSingleQuote: false,

  // 多行时的尾随逗号
  // 'all': 尽可能添加（ES5+）
  // 'es5': 仅在 ES5 有效的地方添加
  // 'none': 不添加
  trailingComma: 'all',

  // 对象字面量大括号内是否添加空格
  // true: { foo: bar }
  // false: {foo: bar}
  bracketSpacing: true,

  // 多行 HTML/JSX 元素的 > 是否独占一行
  // true: <div (attrs) >text</div>
  // false: <div (attrs)\n  >text</div>
  bracketSameLine: false,

  // 箭头函数参数括号
  // 'always': 总是使用括号 (x) => x
  // 'avoid': 单参数时省略 x => x
  arrowParens: 'always',

  // 换行符类型
  // 'lf': Linux/macOS (\n)
  // 'crlf': Windows (\r\n)
  // 'cr': 旧版 Mac (\r)
  // 'auto': 根据文件内容推断
  endOfLine: 'lf',

  // ========== 其他选项 ==========

  // 是否格式化内嵌代码（如 Markdown 中的代码块）
  embeddedLanguageFormatting: 'auto',

  // 是否缩进 HTML/JSX 文本内容
  htmlWhitespaceSensitivity: 'css',

  // HTML/Vue/JSX 中是否强制每行一个属性
  singleAttributePerLine: false,

  // prose-wrap 选项（Markdown）
  // 'always': 折叠超过 printWidth 的行
  // 'never': 不折叠
  // 'preserve': 保持原样
  proseWrap: 'preserve',

  // Vue 文件缩进 <script> 和 <style>
  vueIndentScriptAndStyle: false
}
```

### `.prettierrc.json` 简洁配置

```json
{
  "printWidth": 100,
  "tabWidth": 2,
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "endOfLine": "lf"
}
```

### 配置优先级

当存在多个配置文件时，Prettier 按以下优先级查找：

1. **命令行参数**：最高优先级
2. **配置文件**：按上述顺序查找
3. **`.editorconfig`**：如果未找到 Prettier 配置，会读取 EditorConfig
4. **默认值**：Prettier 内置默认值

## 忽略文件

创建 `.prettierignore` 文件，指定不需要格式化的文件：

```text
# 依赖目录
node_modules

# 构建产物
dist
build
out
.next
.nuxt

# 缓存目录
.cache
.temp

# 压缩文件
*.min.js
*.min.css

# 第三方库
vendor
lib/**/*.js

# 文档和配置
CHANGELOG.md
LICENSE
package-lock.json
pnpm-lock.yaml
yarn.lock

# 特殊文件
*.svg
*.png
```

## 针对不同文件类型配置

使用 `overrides` 为不同文件类型设置特定规则：

```javascript
// .prettierrc.js
module.exports = {
  // 全局默认配置
  semi: false,
  singleQuote: true,
  printWidth: 100,

  overrides: [
    {
      files: '*.json',
      options: {
        parser: 'json',
        // JSON 不需要尾随逗号
        trailingComma: 'none'
      }
    },
    {
      files: '*.md',
      options: {
        parser: 'markdown',
        proseWrap: 'preserve',
        // Markdown 通常使用更长的行
        printWidth: 120
      }
    },
    {
      files: '*.css',
      options: {
        parser: 'css',
        singleQuote: true
      }
    },
    {
      files: '*.scss',
      options: {
        parser: 'scss'
      }
    },
    {
      files: '*.html',
      options: {
        parser: 'html',
        printWidth: 120
      }
    },
    {
      files: '*.vue',
      options: {
        parser: 'vue'
      }
    },
    {
      files: '*.graphql',
      options: {
        parser: 'graphql'
      }
    },
    {
      // 匹配多个文件类型
      files: ['*.yaml', '*.yml'],
      options: {
        parser: 'yaml'
      }
    },
    {
      // 使用 glob 匹配
      files: 'config/**/*.json',
      options: {
        printWidth: 200
      }
    }
  ]
}
```

## 命令行使用

### 基本命令

```bash
# 格式化所有支持的文件
prettier --write .

# 格式化指定文件
prettier --write src/**/*.js

# 格式化多种类型文件
prettier --write "src/**/*.{js,ts,vue,css,json,md}"

# 检查文件是否已格式化（不修改）
prettier --check "src/**/*.{js,ts,vue}"

# 输出到标准输出（不修改文件）
prettier src/index.js
```

### 常用参数

```bash
# 指定配置文件
prettier --config .prettierrc.custom --write .

# 忽略配置文件，使用默认配置
prettier --no-config --write .

# 指定忽略文件
prettier --ignore-path .prettierignore --write .

# 指定文件匹配模式
prettier --write . --ignore-pattern "dist/**"

# 仅格式化修改的文件（与 git 配合）
prettier --write $(git diff --name-only HEAD)

# 显示详细日志
prettier --write . --loglevel debug

# 使用缓存加速
prettier --write . --cache

# 指定缓存位置
prettier --write . --cache-location .prettiercache

# 指定缓存策略
prettier --write . --cache-strategy content

# 插件相关
prettier --write . --plugin prettier-plugin-tailwindcss
```

### 参数详解

| 参数 | 说明 | 示例 |
|------|------|------|
| `--write` | 直接修改文件 | `prettier --write .` |
| `--check` | 检查文件格式，返回非零退出码 | `prettier --check .` |
| `--find-config-path` | 查找使用的配置文件路径 | `prettier --find-config-path index.js` |
| `--config` | 指定配置文件 | `prettier --config .prettierrc --write .` |
| `--no-config` | 不使用配置文件 | `prettier --no-config --write .` |
| `--config-precedence` | 配置优先级策略 | `--config-precedence prefer-file` |
| `--ignore-path` | 指定忽略文件路径 | `--ignore-path .prettierignore` |
| `--stdin-filepath` | 指定通过管道传入文件（stdin）的文件路径 | `cat file.js \| prettier --stdin-filepath file.js` |
| `--list-different` | 列出格式不一致的文件 | `prettier --list-different .` |
| `--with-node-modules` | 包含 node_modules | `prettier --write . --with-node-modules` |

## npm 脚本配置

在 `package.json` 中配置常用脚本：

```json
{
  "scripts": {
    "format": "prettier --write \"src/**/*.{js,ts,vue,json,css,scss,md}\"",
    "format:check": "prettier --check \"src/**/*.{js,ts,vue,json,css,scss,md}\"",
    "format:all": "prettier --write .",
    "format:staged": "prettier --write $(git diff --name-only HEAD)"
  }
}
```

## 与 ESLint 配合使用

### 为什么需要配合使用？

- **ESLint**：负责代码质量检查（如未使用变量、语法错误）
- **Prettier**：负责代码格式化（如缩进、引号、分号）

两者配合可以同时保证代码质量和格式统一。

### 安装依赖

```bash
# npm
npm install --save-dev eslint-config-prettier eslint-plugin-prettier

# pnpm
pnpm add -D eslint-config-prettier eslint-plugin-prettier

# yarn
yarn add -D eslint-config-prettier eslint-plugin-prettier
```

### 依赖说明

- **eslint-config-prettier**：关闭 ESLint 中与 Prettier 冲突的规则
- **eslint-plugin-prettier**：将 Prettier 规则作为 ESLint 规则运行，在 ESLint 中显示格式错误

### ESLint 配置

#### 方式一：推荐配置

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    // 必须放在最后，关闭冲突规则
    'plugin:prettier/recommended'
  ],
  rules: {
    // 自定义规则
  }
}
```

#### 方式二：仅关闭冲突规则

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    // 关闭与 Prettier 冲突的规则
    'prettier'
  ]
}
```

#### 方式三：分别运行

```json
{
  "scripts": {
    "lint": "eslint src/",
    "format": "prettier --write src/",
    "lint:fix": "npm run lint -- --fix && npm run format"
  }
}
```

### 规则冲突解决

| 冲突规则 | ESLint 默认 | Prettier 默认 | 解决方式 |
|---------|------------|--------------|---------|
| `quotes` | `double` | `double` | 统一配置 |
| `semi` | `always` | `true` | 统一配置 |
| `comma-dangle` | `never` | `es5` | 统一配置 |
| `indent` | `4 spaces` | `2 spaces` | 统一配置 |

## VSCode 集成

### 安装插件

在 VSCode 中安装 **Prettier - Code formatter** 插件（ID: `esbenp.prettier-vscode`）

### 工作区配置

在 `.vscode/settings.json` 中配置：

```json
{
  // 设置 Prettier 为默认格式化工具
  "editor.defaultFormatter": "esbenp.prettier-vscode",

  // 保存时自动格式化
  "editor.formatOnSave": true,

  // 保存时自动修复 ESLint 问题
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },

  // 针对特定语言配置格式化工具
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[vue]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[html]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[css]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[scss]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[markdown]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },

  // Prettier 插件配置
  "prettier.requireConfig": true,
  "prettier.useEditorConfig": true,
  "prettier.resolveGlobalModules": false,

  // 禁用其他格式化工具避免冲突
  "typescript.format.enable": false,
  "javascript.format.enable": false
}
```

### 推荐扩展配置

在 `.vscode/extensions.json` 中配置推荐扩展：

```json
{
  "recommendations": ["esbenp.prettier-vscode", "dbaeumer.vscode-eslint"]
}
```

## 与 Git Hooks 集成

### 使用 Husky + lint-staged

#### 安装依赖

```bash
pnpm add -D husky lint-staged
```

#### 初始化 Husky

```bash
npx husky init
```

#### 配置 pre-commit Hook

```bash
# .husky/pre-commit
npx lint-staged
```

#### 配置 lint-staged

创建 `lint-staged.config.js`：

```javascript
module.exports = {
  // JavaScript/TypeScript/Vue 文件：先修复 ESLint 问题，再格式化
  '*.{js,jsx,ts,tsx,vue}': ['eslint --fix', 'prettier --write'],

  // JSON/CSS/SCSS/Markdown 文件：仅格式化
  '*.{json,css,scss,less,md}': ['prettier --write'],

  // HTML 文件
  '*.html': ['prettier --write'],

  // YAML 文件
  '*.{yaml,yml}': ['prettier --write']
}
```

或在 `package.json` 中配置：

```json
{
  "lint-staged": {
    "*.{js,jsx,ts,tsx,vue}": ["eslint --fix", "prettier --write"],
    "*.{json,css,scss,less,md}": ["prettier --write"]
  }
}
```

### 使用 simple-git-hooks

```bash
pnpm add -D simple-git-hooks lint-staged
```

在 `package.json` 中配置：

```json
{
  "simple-git-hooks": {
    "pre-commit": "npx lint-staged"
  },
  "lint-staged": {
    "*.{js,ts,vue}": ["eslint --fix", "prettier --write"],
    "*.{json,css,md}": ["prettier --write"]
  }
}
```

## 格式化效果示例

### JavaScript 示例

**格式化前：**

```javascript
const user={name:'John',age:30,email:'john@example.com',address:{city:'New York',country:'USA'}}
function getUserInfo(user){return`Name: ${user.name}, Age: ${user.age}`}
const numbers=[1,2,3,4,5].map(n=>n*2).filter(n=>n>5)
```

**格式化后：**

```javascript
const user = {
  name: 'John',
  age: 30,
  email: 'john@example.com',
  address: { city: 'New York', country: 'USA' },
}

function getUserInfo(user) {
  return `Name: ${user.name}, Age: ${user.age}`
}

const numbers = [1, 2, 3, 4, 5]
  .map((n) => n * 2)
  .filter((n) => n > 5)
```

### Vue 示例

**格式化前：**

```vue
<template>
<div class="container">
<h1>{{title}}</h1>
<p class="description">{{description}}</p>
</div>
</template>
<script>
export default{data(){return{title:'Hello World',description:'This is a description'}}}
</script>
<style scoped>
.container{padding:20px;}.description{color:#666;}
</style>
```

**格式化后：**

```vue
<template>
  <div class="container">
    <h1>{{ title }}</h1>
    <p class="description">{{ description }}</p>
  </div>
</template>

<script>
export default {
  data() {
    return {
      title: 'Hello World',
      description: 'This is a description',
    }
  },
}
</script>

<style scoped>
.container {
  padding: 20px;
}
.description {
  color: #666;
}
</style>
```

### TypeScript 示例

**格式化前：**

```typescript
interface User{id:number;name:string;email:string;createdAt:Date}
const fetchUser=async(id:number):Promise<User>=>{const response=await fetch(`/api/users/${id}`);return response.json()}
class UserService{private users:User[]=[];async loadUsers():Promise<void>{this.users=await Promise.all([fetchUser(1),fetchUser(2)])}}
```

**格式化后：**

```typescript
interface User {
  id: number
  name: string
  email: string
  createdAt: Date
}

const fetchUser = async (id: number): Promise<User> => {
  const response = await fetch(`/api/users/${id}`)
  return response.json()
}

class UserService {
  private users: User[] = []

  async loadUsers(): Promise<void> {
    this.users = await Promise.all([fetchUser(1), fetchUser(2)])
  }
}
```

## 高级用法

### 使用插件扩展

Prettier 支持插件来扩展功能：

```bash
# 安装插件（Vue 文件为内置支持，无需插件）
pnpm add -D prettier-plugin-tailwindcss

# 配置
```

```javascript
// .prettierrc.js
module.exports = {
  plugins: [
    'prettier-plugin-tailwindcss',
    // 插件执行顺序很重要
  ],
}
```

### 常用插件

| 插件名 | 用途 |
|--------|------|
| `prettier-plugin-tailwindcss` | Tailwind CSS 类名排序 |
| `prettier-plugin-svelte` | Svelte 文件格式化 |
| `prettier-plugin-astro` | Astro 文件格式化 |
| `prettier-plugin-prisma` | Prisma Schema 格式化 |
| `@prettier/plugin-php` | PHP 文件格式化 |
| `@prettier/plugin-ruby` | Ruby 文件格式化 |

### 使用 API 编程调用

```javascript
import * as prettier from 'prettier'

// 格式化代码
async function formatCode(code, filePath) {
  const options = await prettier.resolveConfig(filePath)
  const formatted = await prettier.format(code, {
    ...options,
    filepath: filePath,
  })
  return formatted
}

// 使用示例
const code = 'const x=1'
const formatted = await formatCode(code, 'test.js')
console.log(formatted) // 'const x = 1\n'

// 检查代码是否已格式化
async function checkFormatted(code, filePath) {
  const options = await prettier.resolveConfig(filePath)
  return prettier.check(code, {
    ...options,
    filepath: filePath,
  })
}

// 获取文件信息
async function getFileInfo(filePath) {
  const info = await prettier.getFileInfo(filePath)
  console.log(info)
  // { ignored: false, inferredParser: 'babel' }
  return info
}
```

### 与 EditorConfig 配合

创建 `.editorconfig` 文件：

```ini
# EditorConfig - 编辑器基础配置
root = true

[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

Prettier 会读取 `.editorconfig` 作为默认值（如果未找到 `.prettierrc`）。

## 常见问题

### Q1: Prettier 和 ESLint 规则冲突怎么办？

**A:** 使用 `eslint-config-prettier` 关闭 ESLint 中与 Prettier 冲突的规则：

```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended' // 放在最后
  ]
}
```

或者在 ESLint 配置中手动关闭冲突规则：

```javascript
module.exports = {
  rules: {
    // 关闭与 Prettier 冲突的规则
    'indent': 'off',
    'quotes': 'off',
    'semi': 'off',
    'comma-dangle': 'off',
    // 或使用 prettier 规则
    'prettier/prettier': 'error'
  }
}
```

### Q2: 如何只格式化修改的文件？

**A:** 配合 `lint-staged` 使用：

```javascript
// lint-staged.config.js
module.exports = {
  '*.{js,ts,vue}': ['eslint --fix', 'prettier --write'],
  '*.{json,css,md}': ['prettier --write']
}
```

或使用 `git diff`：

```bash
# 格式化最近提交修改的文件
prettier --write $(git diff --name-only HEAD~1)

# 格式化暂存区的文件
prettier --write $(git diff --cached --name-only)

# 格式化工作区修改的文件
prettier --write $(git diff --name-only)
```

### Q3: 为什么 Prettier 不格式化我的代码？

**A:** 检查以下几点：

1. **检查配置文件**：确认 `.prettierrc` 是否存在且语法正确
2. **检查文件类型**：确认文件类型是否被支持
3. **检查忽略文件**：确认 `.prettierignore` 未忽略该文件
4. **检查编辑器设置**：确认 VSCode 是否正确配置
5. **查看错误日志**：运行 `prettier --write . --loglevel debug` 查看详细日志

```bash
# 调试配置
prettier --find-config-path src/index.js
prettier --write src/index.js --loglevel debug
```

### Q4: 如何处理超大文件？

**A:** Prettier 对超大文件的格式化性能较差（受内存与运行时间限制），可以通过以下方式处理：

```javascript
// .prettierrc.js
module.exports = {
  // 没有专门的"文件大小上限"配置项，
  // 过大的文件建议直接在 .prettierignore 中忽略
}
```

或者在 `.prettierignore` 中忽略：

```text
# 忽略超大文件
large-file.json
dist/**/*.js
```

### Q5: 如何在 CI/CD 中使用 Prettier？

**A:** 在 CI 中检查代码格式：

```yaml
# GitHub Actions
name: Check Code Format
on: [push, pull_request]
jobs:
  format-check:
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
      - run: pnpm run format:check
```

```json
{
  "scripts": {
    "format:check": "prettier --check ."
  }
}
```

### Q6: Prettier 会改变代码逻辑吗？

**A:** 不会。Prettier 只改变代码格式，不改变 AST（抽象语法树），因此不会影响代码逻辑。但需要注意：

- 数组/对象末尾的尾随逗号会影响 JSON 文件的有效性
- 某些特殊的注释位置可能被调整

### Q7: 如何强制团队成员使用 Prettier？

**A:** 通过以下方式强制使用：

1. **Git Hooks**：提交前自动格式化
2. **CI 检查**：CI 中验证格式，不符合则拒绝合并
3. **编辑器配置**：团队共享 `.vscode/settings.json`
4. **文档规范**：在 README 和贡献指南中说明

### Q8: Prettier 支持哪些文件类型？

**A:** Prettier 原生支持以下文件类型：

| 语言/格式 | 文件扩展名 | 解析器名称 |
|----------|-----------|-----------|
| JavaScript | `.js`, `.jsx`, `.mjs`, `.cjs` | `babel`, `flow`, `typescript` |
| TypeScript | `.ts`, `.tsx` | `typescript` |
| CSS | `.css` | `css` |
| SCSS | `.scss` | `scss` |
| Less | `.less` | `less` |
| HTML | `.html` | `html` |
| Vue | `.vue` | `vue` |
| Angular | `.component.html` | `angular` |
| JSON | `.json` | `json` |
| Markdown | `.md`, `.markdown` | `markdown` |
| YAML | `.yaml`, `.yml` | `yaml` |
| GraphQL | `.graphql`, `.gql` | `graphql` |
| MDX | `.mdx` | `mdx` |

## 最佳实践

### 1. 配置文件规范

- **锁定版本**：在 `package.json` 中锁定 Prettier 版本
- **统一配置**：团队共享 `.prettierrc` 文件
- **简洁优先**：只配置必要的选项，使用合理默认值

### 2. 与团队协作

```json
{
  "scripts": {
    "prepare": "husky",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```

### 3. 项目初始化清单

- [ ] 安装 Prettier 依赖
- [ ] 创建 `.prettierrc` 配置文件
- [ ] 创建 `.prettierignore` 忽略文件
- [ ] 配置 npm 脚本
- [ ] 配置 VSCode 设置
- [ ] 配置 Git Hooks
- [ ] 配置 CI 检查

### 4. 性能优化

```javascript
// 使用缓存加速
{
  "scripts": {
    "format": "prettier --write . --cache"
  }
}
```

Prettier CLI 已默认按 CPU 核数并行处理文件，无需额外参数。

## 参考资源

- [Prettier 官方文档](https://prettier.io/)
- [Prettier GitHub](https://github.com/prettier/prettier)
- [Prettier Playground](https://prettier.io/playground/)
- [eslint-config-prettier](https://github.com/prettier/eslint-config-prettier)
- [eslint-plugin-prettier](https://github.com/prettier/eslint-plugin-prettier)
