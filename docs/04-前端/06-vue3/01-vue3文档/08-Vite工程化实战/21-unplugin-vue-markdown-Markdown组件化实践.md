---
title: unplugin-vue-markdown-Markdown组件化实践
description: "unplugin-vue-markdown 将 .md 文件编译为 Vue 组件，支持在路由中直接使用 Markdown 文件作为页面，并可在 Markdown 中嵌入 Vue 组件。本文讲解其配置方式和实际应用场景。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# unplugin-vue-markdown Markdown 组件化实践

## 概述

unplugin-vue-markdown 将 `.md` 文件编译为 Vue 组件，支持在路由中直接使用 Markdown 文件作为页面，并可在 Markdown 中嵌入 Vue 组件。本文讲解其配置方式和实际应用场景。

## 学习目标

- 掌握 unplugin-vue-markdown 的安装与 Vite 配置
- 理解 Markdown 文件作为 Vue 组件的编译机制
- 学会在 Markdown 中嵌入 Vue 组件和交互逻辑

---

## 一、安装与配置

### 1.1 安装

```bash
pnpm add -D unplugin-vue-markdown markdown-it
```

### 1.2 Vite 配置

```typescript
// vite.config.ts
import Markdown from 'unplugin-vue-markdown/vite'

export default defineConfig({
  plugins: [
    vue(),
    Markdown({
      // markdown-it 配置
      markdownItOptions: {
        html: true,
        linkify: true,
        typographer: true,
      },
    }),
  ],
})
```

### 1.3 TypeScript 声明

```typescript
// src/types/shims.d.ts
declare module '*.md' {
  import type { ComponentOptions } from 'vue'
  const component: ComponentOptions
  export default component
}
```

---

## 二、使用方式

### 2.1 作为页面组件

```vue
<script setup lang="ts">
import Readme from '../README.md'
</script>

<template>
  <Readme />
</template>
```

### 2.2 配合文件系统路由

将 `.md` 文件放入 pages 目录，自动生成路由：

```typescript
// vite.config.ts
Pages({
  extensions: ['vue', 'md'],  // 支持 md 文件
})
```

```
src/pages/
├── index.vue
├── about.md        → /about
└── docs/
    └── guide.md    → /docs/guide
```

### 2.3 在 Markdown 中使用 Vue 组件

````markdown
# 文档标题

这是一段 Markdown 内容。

<!-- 直接使用 Vue 组件 -->
<DemoCounter />

<Alert type="warning">
  这是一条警告信息
</Alert>

## 代码示例

```vue
<script setup>
const msg = ref('Hello')
</script>
```
````

---

## 三、自定义渲染

### 3.1 markdown-it 插件

```typescript
import MarkdownIt from 'markdown-it'
import anchor from 'markdown-it-anchor'
import toc from 'markdown-it-toc-done-right'

Markdown({
  markdownItSetup(md: MarkdownIt) {
    md.use(anchor, { permalink: true })
    md.use(toc)
  },
})
```

### 3.2 代码高亮

```bash
pnpm add -D shiki
```

```typescript
import Shiki from '@shikijs/markdown-it'

Markdown({
  markdownItSetup(md) {
    md.use(Shiki({ theme: 'github-dark' }))
  },
})
```

---

## 四、应用场景

| 场景 | 说明 |
|------|------|
| 文档站点 | Markdown 写文档，Vue 组件做交互演示 |
| 博客系统 | Markdown 写文章，支持自定义组件 |
| 项目 README 展示 | 将 README.md 渲染为页面 |
| 变更日志 | CHANGELOG.md 作为页面展示 |

---

## 常见问题

**Q: Markdown 中的 Vue 组件需要注册吗？**

如果配置了 unplugin-vue-components 自动导入，则无需手动注册。否则需要在 Markdown 文件的 `<script>` 块中手动导入。

**Q: 支持 MDX 语法吗？**

unplugin-vue-markdown 使用 markdown-it 引擎，语法与 MDX（基于 remark）不同。如需 MDX 生态，考虑使用 `@mdx-js/vue`。

---

## 延伸阅读

- 上一篇：[Transition 动画与 UnoCSS 主题配置](20-Transition动画与UnoCSS主题配置.md) — 动画与主题
- 下一篇：[前端项目测试基础与工具选型](../09-前端测试实战/01-前端项目测试基础与工具选型.md) — 测试入门
- 官方仓库：[unplugin-vue-markdown](https://github.com/unplugin/unplugin-vue-markdown)
