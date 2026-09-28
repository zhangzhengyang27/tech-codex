---
title: Transition动画与UnoCSS主题配置
description: "Vue 的 Transition 组件为路由切换和元素显隐提供声明式动画能力，配合 UnoCSS 的主题系统可以实现一致的设计令牌管理。本文讲解路由过渡动画配置和 UnoCSS 主题变量定制。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Transition 动画与 UnoCSS 主题配置

## 概述

Vue 的 Transition 组件为路由切换和元素显隐提供声明式动画能力，配合 UnoCSS 的主题系统可以实现一致的设计令牌管理。本文讲解路由过渡动画配置和 UnoCSS 主题变量定制。

## 学习目标

- 掌握 Vue Transition 在路由切换中的应用
- 理解 UnoCSS theme 配置与设计令牌的关系
- 学会定义全局主题变量并在组件中引用

---

## 一、路由过渡动画

### 1.1 基础配置

```vue
<!-- App.vue -->
<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
```

### 1.2 常用过渡效果

| 名称 | 效果 | 适用场景 |
|------|------|---------|
| fade | 淡入淡出 | 通用页面切换 |
| slide-left | 左滑进入 | 前进导航 |
| slide-right | 右滑进入 | 后退导航 |
| zoom | 缩放 | 弹窗/模态框 |

### 1.3 滑动方向动画

```vue
<template>
  <router-view v-slot="{ Component }">
    <transition :name="transitionName" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const transitionName = ref('slide-left')

router.beforeEach((to, from) => {
  const toDepth = to.path.split('/').length
  const fromDepth = from.path.split('/').length
  transitionName.value = toDepth > fromDepth ? 'slide-left' : 'slide-right'
})
</script>

<style>
.slide-left-enter-active, .slide-left-leave-active,
.slide-right-enter-active, .slide-right-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-left-enter-from { transform: translateX(100%); opacity: 0; }
.slide-left-leave-to { transform: translateX(-100%); opacity: 0; }
.slide-right-enter-from { transform: translateX(-100%); opacity: 0; }
.slide-right-leave-to { transform: translateX(100%); opacity: 0; }
</style>
```

---

## 二、UnoCSS 主题配置

### 2.1 设计令牌定义

```typescript
// uno.config.ts
import { defineConfig, presetWind } from 'unocss'

export default defineConfig({
  presets: [presetWind()],
  theme: {
    colors: {
      primary: '#3498db',
      secondary: '#2ecc71',
      danger: '#e74c3c',
      warning: '#f39c12',
      dark: '#2c3e50',
      light: '#ecf0f1',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
    },
    borderRadius: {
      sm: '4px',
      DEFAULT: '8px',
      lg: '12px',
      full: '9999px',
    },
    boxShadow: {
      card: '0 2px 8px rgba(0,0,0,0.1)',
      dropdown: '0 4px 16px rgba(0,0,0,0.15)',
    },
  },
})
```

### 2.2 使用主题变量

```vue
<template>
  <div class="bg-light text-dark p-4 rounded shadow-card">
    <h1 class="text-2xl text-primary font-bold">标题</h1>
    <button class="btn bg-primary text-white rounded-full">
      按钮
    </button>
  </div>
</template>
```

### 2.3 CSS 变量模式

```typescript
// uno.config.ts
theme: {
  colors: {
    primary: 'var(--color-primary)',
  },
}
```

```css
/* styles/variables.css */
:root {
  --color-primary: #3498db;
}
[data-theme='dark'] {
  --color-primary: #5dade2;
}
```

---

## 常见问题

**Q: Transition 动画在首次加载时也会触发吗？**

默认不会。如需首次加载也播放动画，添加 `appear` 属性：`<transition appear>`。

**Q: UnoCSS 主题变量和 CSS 变量如何配合暗色模式？**

使用 CSS 变量作为主题值，通过 `data-theme` 属性或 `prefers-color-scheme` 媒体查询切换变量值，UnoCSS 类名无需修改。

---

## 延伸阅读

- 上一篇：[移动端适配 viewport 方案实践](19-移动端适配viewport方案实践.md) — viewport 适配
- 下一篇：[unplugin-vue-markdown Markdown 组件化实践](21-unplugin-vue-markdown-Markdown组件化实践.md) — Markdown 渲染
- 相关：[Transition 动画系统](../03-进阶模式/01-Transition动画系统.md) — Vue 动画完整教程
