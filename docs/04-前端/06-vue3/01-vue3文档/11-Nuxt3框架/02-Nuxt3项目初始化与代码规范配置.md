---
title: Nuxt3项目初始化与代码规范配置
description: "使用 nuxi CLI 创建 Nuxt3 项目，配置 VS Code 保存自动格式化，集成 Prettier + ESLint（eslint-config-prettier 消除格式规则冲突）与 Sass 全局样式注入，建立团队统一的开发基线。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Nuxt3 项目初始化与代码规范配置

## 概述

本文讲解使用 Nuxt CLI 创建项目、配置 VS Code 开发环境、集成 Prettier + ESLint 代码规范体系的完整流程，建立团队统一的开发基线。

## 学习目标

- 掌握 nuxi CLI 创建 Nuxt3 项目的方法
- 配置 VS Code 扩展实现保存自动格式化
- 掌握 Prettier + ESLint 协作配置
- 理解 Sass 集成与 CSS 规范约定

---

## 一、项目初始化

### 1.1 环境要求

| 要求 | 版本 |
|------|------|
| Node.js | >= 18.0.0 |
| 包管理器 | pnpm（推荐）/ npm / yarn |

### 1.2 创建项目

```bash
pnpm dlx nuxi@latest init my-nuxt-app
cd my-nuxt-app
pnpm install
pnpm dev
```

### 1.3 初始项目结构

```
my-nuxt-app/
├── .nuxt/              # 构建生成目录（自动生成，勿手动修改）
├── .output/            # 生产构建输出
├── app.vue             # 根组件
├── nuxt.config.ts      # Nuxt 配置
├── tsconfig.json       # TypeScript 配置（继承 .nuxt/tsconfig.json）
└── package.json
```

---

## 二、VS Code 开发环境

### 2.1 必要扩展

| 扩展 | 作用 |
|------|------|
| Vue - Official | Vue SFC 语法支持、类型检查 |
| ESLint | 代码质量实时检查 |
| Prettier | 代码格式化 |

### 2.2 工作区配置

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "[vue]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### 2.3 扩展推荐

```json
// .vscode/extensions.json
{
  "recommendations": [
    "Vue.volar",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

团队成员打开项目时 VS Code 自动提示安装推荐扩展。

---

## 三、Prettier 配置

### 3.1 安装

```bash
pnpm add -D prettier eslint-config-prettier eslint-plugin-prettier
```

| 包 | 作用 |
|----|------|
| prettier | 格式化工具 |
| eslint-config-prettier | 关闭 ESLint 中与 Prettier 冲突的规则 |
| eslint-plugin-prettier | 将格式问题作为 ESLint 错误报告 |

### 3.2 配置文件

```javascript
// .prettierrc.js
module.exports = {
  printWidth: 100,        // 单行最大长度
  tabWidth: 2,            // 缩进空格数
  useTabs: false,
  semi: false,            // 不加分号
  singleQuote: true,      // 单引号
  trailingComma: 'es5',   // 尾逗号
  bracketSpacing: true,
  arrowParens: 'always',
  endOfLine: 'lf',
}
```

### 3.3 忽略文件

`.prettierignore`：

```
.nuxt
.output
node_modules
dist
pnpm-lock.yaml
```

---

## 四、ESLint 配置

### 4.1 安装

```bash
pnpm add -D eslint @nuxtjs/eslint-config-typescript
```

### 4.2 配置文件

```javascript
// .eslintrc.js
module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  extends: [
    'plugin:vue/vue3-recommended',
    '@nuxtjs/eslint-config-typescript',
    'plugin:prettier/recommended',   // 必须放最后
  ],
  rules: {
    'vue/multi-word-component-names': 'off',
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
  },
}
```

### 4.3 package.json 脚本

```json
{
  "scripts": {
    "lint": "eslint . --ext .vue,.js,.ts,.jsx,.tsx",
    "lint:fix": "eslint . --ext .vue,.js,.ts,.jsx,.tsx --fix",
    "format": "prettier --write \"**/*.{vue,ts,js,json,md}\""
  }
}
```

---

## 五、Sass 集成

### 5.1 安装

```bash
pnpm add -D sass
```

Nuxt3 内置 Sass 支持，安装后直接在 SFC 中使用：

```vue
<style lang="scss" scoped>
$primary: #3498db;

.card {
  border: 1px solid darken($primary, 10%);

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}
</style>
```

### 5.2 全局样式注入

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  css: ['~/assets/styles/main.scss'],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "~/assets/styles/variables" as *;',
        },
      },
    },
  },
})
```

---

## 常见问题

**Q: ESLint 和 Prettier 职责如何划分？**

Prettier 只管格式（缩进、引号、换行），ESLint 只管代码质量（未使用变量、潜在 bug）。通过 `eslint-config-prettier` 关闭 ESLint 的格式类规则，避免两者冲突。

**Q: .nuxt 目录需要提交到 Git 吗？**

不需要。`.nuxt` 是构建时自动生成的类型和中间文件，应加入 `.gitignore`。CI 环境执行 `nuxt prepare` 即可重新生成。

**Q: nuxi init 支持选择模板吗？**

支持。`nuxi init` 可指定 starter 模板（如 `nuxi init -t v3 my-app`），社区也有大量模板（含 Tailwind、Pinia、i18n 预配置）。

---

## 延伸阅读

- 上一篇：[Nuxt3 框架概览与核心概念](01-Nuxt3框架概览与核心概念.md) — 框架概览
- 下一篇：[ESLint 版本冲突问题排查与解决](03-ESLint版本冲突问题排查与解决.md) — 依赖冲突排查
- 相关：代码规范 — 工程规范体系
