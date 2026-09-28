---
title: SSG静态站点生成方案扩展
description: "SSG（Static Site Generation）在构建时将页面预渲染为静态 HTML，部署到 CDN 即可获得极致访问速度。本文对比 SSG 与 SSR 的差异，并介绍 VitePress、Hexo、Astro 三种主流 SSG 工具的定位与选型。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# SSG 静态站点生成方案扩展

## 概述

SSG（Static Site Generation）在构建时将所有页面预渲染为静态 HTML，部署到 CDN 即可获得极致访问速度。本文对比 SSG 与 SSR 的差异，并介绍 Vue 生态主流 SSG 工具：VitePress、Hexo、Astro。

## 学习目标

- 理解 SSG 的构建时渲染机制与适用边界
- 掌握 SSG vs SSR 的选型依据
- 了解 VitePress 的核心功能与项目搭建
- 了解 Hexo 和 Astro 的定位与特点

---

## 一、SSG 核心概念

### 1.1 工作原理

```mermaid
graph LR
    A[Markdown/Vue 源文件] --> B[构建时渲染]
    B --> C[生成静态 HTML/CSS/JS]
    C --> D[部署到 CDN/静态服务器]
    D --> E[用户直接获取完整 HTML]
```

与 SSR 的本质区别：渲染发生在**构建时**而非**请求时**。

### 1.2 SSG vs SSR

| 特性 | SSG | SSR |
|------|-----|-----|
| 渲染时机 | 构建时 | 每次请求时 |
| 服务器要求 | 静态服务器 / CDN | Node.js 服务器 |
| 服务器压力 | 极低 | 高 |
| 响应速度 | 极快（CDN 边缘节点） | 快（需实时渲染） |
| 内容更新 | 需重新构建部署 | 实时 |
| 部署成本 | 低 | 高 |
| SEO | 友好 | 友好 |
| 动态内容 | 不支持（需配合客户端请求） | 支持 |

### 1.3 适用场景

| 场景 | 说明 |
|------|------|
| 技术文档 | API 文档、产品手册、知识库 |
| 博客系统 | 个人博客、团队技术博客 |
| 企业官网 | 产品展示、公司介绍 |
| 作品集 | 个人简历、项目展示 |
| 营销落地页 | 活动页面、产品介绍页 |

**不适用**：内容频繁变化（电商库存、社交 Feed）、需要个性化渲染的场景。

---

## 二、VitePress

### 2.1 定位

Vue 官方静态站点生成器，基于 Vite + Vue3，Vue / Vite / Pinia 等官方文档均使用 VitePress 构建。

核心特点：

| 特性 | 说明 |
|------|------|
| Markdown 增强 | 支持 Vue 组件、自定义容器、代码组 |
| 主题系统 | 默认主题开箱即用，支持完全自定义 |
| 文件路由 | 目录结构即路由结构 |
| 极速开发 | Vite 驱动的毫秒级热更新 |
| 构建优化 | 首页 SSG + 后续页面 SPA 导航 |

### 2.2 快速搭建

```bash
mkdir docs-site && cd docs-site
pnpm add -D vitepress

# 初始化向导
npx vitepress init
```

```
docs/
├── .vitepress/
│   └── config.ts        # 站点配置
├── index.md             # 首页
├── guide/
│   ├── getting-started.md
│   └── configuration.md
└── api/
    └── index.md
```

### 2.3 站点配置

```typescript
// docs/.vitepress/config.ts
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '我的文档站',
  description: '基于 VitePress 的技术文档',

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: [
      {
        text: '指南',
        items: [
          { text: '快速开始', link: '/guide/getting-started' },
          { text: '配置', link: '/guide/configuration' },
        ],
      },
    ],
    outline: { level: [2, 3], label: '目录' },
    search: { provider: 'local' },
  },
})
```

### 2.4 Markdown 中使用 Vue

```markdown
# 交互演示

VitePress 支持在 Markdown 中直接使用 Vue 组件：

<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<button @click="count++">点击次数：{{ count }}</button>
```

---

## 三、Hexo

### 3.1 定位

Node.js 博客框架，专注博客场景，主题和插件生态丰富。

```bash
npm install -g hexo-cli
hexo init my-blog && cd my-blog
npm install
hexo server    # 本地预览
hexo generate  # 生成静态文件
hexo deploy    # 部署
```

| 特点 | 说明 |
|------|------|
| 主题生态 | 数百款社区主题（NexT、Butterfly 等） |
| 写作流程 | Markdown 写作 → hexo new → hexo deploy |
| 插件系统 | RSS、sitemap、搜索、评论等 |
| 局限 | 非 Vue 生态，定制需学习其模板引擎 |

适合：纯写作型博客，不需要复杂交互。

---

## 四、Astro

### 4.1 定位

现代内容驱动框架，核心理念是"默认零 JS"：

| 特点 | 说明 |
|------|------|
| Islands 架构 | 页面默认静态 HTML，仅交互组件加载 JS |
| 多框架支持 | 可在同一项目混用 Vue、React、Svelte 组件 |
| 内容集合 | 内置 Markdown/MDX 内容管理 |
| 性能极致 | 默认不发送 JS 到客户端 |

### 4.2 与 VitePress 对比

| 维度 | VitePress | Astro |
|------|-----------|-------|
| 定位 | 文档站专用 | 通用内容站点 |
| 框架 | Vue 专属 | 多框架 |
| 主题 | 简洁统一 | 社区主题丰富 |
| 灵活度 | 中 | 高 |
| 适合 | 技术文档 | 博客、营销站、内容平台 |

---

## 五、SSG 工具选型

| 需求 | 推荐 |
|------|------|
| Vue 项目技术文档 | VitePress |
| 纯写作博客 | Hexo / Astro |
| 需要交互组件的内容站 | Astro（Islands） |
| Vue 生态 + 自定义设计 | Astro + Vue 组件 |
| 快速搭建、零配置 | VitePress 默认主题 |

---

## 常见问题

**Q: SSG 站点如何实现搜索功能？**

两种方案：构建时生成搜索索引（VitePress 内置本地搜索），或使用第三方服务（Algolia DocSearch）。无需服务端支持。

**Q: SSG 站点的内容更新流程是什么？**

修改 Markdown → 触发 CI 构建（GitHub Actions / GitLab CI）→ 生成新的静态文件 → 部署到 CDN。全流程可自动化，通常 1-2 分钟完成。

**Q: SSG 能处理动态数据吗？**

可以混合使用：页面框架 SSG 生成，动态数据（评论、点赞数）通过客户端 API 请求获取。Astro 的 Islands 架构天然支持这种模式。

---

## 延伸阅读

- 上一篇：[vite-plugin-ssr 实战集成](04-vite-plugin-ssr实战集成.md) — SSR 状态管理
- 下一篇：[Nuxt3 框架概览与核心概念](../11-Nuxt3框架/01-Nuxt3框架概览与核心概念.md) — Nuxt3 入门
- 官方文档：[VitePress](https://vitepress.dev/) / [Astro](https://astro.build/)
