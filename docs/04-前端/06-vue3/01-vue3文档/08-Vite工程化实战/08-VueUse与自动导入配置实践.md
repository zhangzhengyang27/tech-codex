---
title: VueUse与自动导入配置实践
description: "VueUse 是 Vue Composition API 的工具函数集合，提供 200+ 个响应式工具函数。配合 unplugin-auto-import 实现零导入使用，大幅减少样板代码。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# VueUse 与自动导入配置实践

## 概述

VueUse 是 Vue Composition API 的工具函数集合，提供 200+ 个响应式工具函数。配合 unplugin-auto-import 实现零导入使用，大幅减少样板代码。本文讲解 VueUse 集成、自动导入配置及类型声明的协作机制。

## 学习目标

- 掌握 unplugin-auto-import 的配置与 VueUse 集成
- 理解自动导入的类型声明生成机制
- 熟练使用 VueUse 常用组合式函数

---

## 一、自动导入配置

### 1.1 安装

```bash
pnpm add -D unplugin-auto-import
pnpm add @vueuse/core
```

### 1.2 Vite 配置

```typescript
// vite.config.ts
import AutoImports from 'unplugin-auto-import/vite'

export default defineConfig({
  plugins: [
    vue(),
    AutoImports({
      imports: [
        'vue',
        'vue-router',
        '@vueuse/core',
      ],
      dts: 'auto-imports.d.ts',
      eslintrc: {
        enabled: true,
        filepath: '.eslintrc-auto-import.json',
      },
    }),
  ],
})
```

### 1.3 配置效果

```vue
<script setup lang="ts">
// 无需 import，直接使用
const count = ref(0)
const doubled = computed(() => count.value * 2)
const { x, y } = useMouse()
const isDark = useDark()
</script>
```

---

## 二、VueUse 核心函数

### 2.1 状态类

| 函数 | 用途 |
|------|------|
| `useStorage` | 响应式 localStorage/sessionStorage |
| `useDark` | 暗色模式切换 |
| `useToggle` | 布尔值切换 |
| `useCounter` | 计数器 |

### 2.2 浏览器类

| 函数 | 用途 |
|------|------|
| `useMouse` | 鼠标位置追踪 |
| `useWindowSize` | 窗口尺寸 |
| `useIntersectionObserver` | 元素可见性 |
| `useClipboard` | 剪贴板操作 |

### 2.3 网络类

| 函数 | 用途 |
|------|------|
| `useFetch` | 响应式 fetch |
| `useWebSocket` | WebSocket 连接 |
| `useOnline` | 网络在线状态 |

### 2.4 使用示例

```vue
<script setup lang="ts">
// 响应式本地存储
const settings = useStorage('app-settings', {
  theme: 'light',
  fontSize: 14,
})

// 元素可见性检测
const target = ref<HTMLElement>()
const { stop } = useIntersectionObserver(target, ([{ isIntersecting }]) => {
  if (isIntersecting) {
    console.log('元素进入视口')
    stop()
  }
})
</script>

<template>
  <div ref="target">监听此元素</div>
</template>
```

---

## 三、类型声明协作

### 3.1 auto-imports.d.ts

插件自动生成的类型声明文件，让 TypeScript 识别全局可用的 API：

```typescript
// auto-imports.d.ts（自动生成，勿手动修改）
declare const ref: typeof import('vue')['ref']
declare const computed: typeof import('vue')['computed']
declare const useMouse: typeof import('@vueuse/core')['useMouse']
```

### 3.2 tsconfig 引入

```json
{
  "include": [
    "auto-imports.d.ts",
    "components.d.ts"
  ]
}
```

### 3.3 ESLint 集成

自动导入的变量会被 ESLint 的 `no-undef` 规则报错。解决方案：

`.eslintrc-auto-import.json`（插件自动生成）：

```json
{
  "globals": {
    "ref": true,
    "computed": true,
    "useMouse": true
  }
}
```

在 ESLint 配置中引入：

```javascript
// eslint.config.js
import autoImportGlobals from './.eslintrc-auto-import.json'

export default [
  {
    languageOptions: {
      globals: autoImportGlobals.globals,
    },
  },
]
```

---

## 常见问题

**Q: 自动导入会影响 Tree-shaking 吗？**

不会。unplugin-auto-import 在编译时将未使用的导入移除，最终产物只包含实际使用的函数。

**Q: VueUse 和 lodash 可以共存吗？**

可以，但建议优先使用 VueUse 的响应式版本（如 `useDebounceFn` 替代 `lodash.debounce`），因为 VueUse 函数天然支持响应式和自动清理。

---

## 延伸阅读

- 上一篇：[UI 框架与 CSS 框架选型实践](07-UI框架与CSS框架选型实践.md) — UnoCSS
- 下一篇：[组件自动导入与 UI 库集成实践](09-组件自动导入与UI库集成实践.md) — 组件级自动导入
- 官方文档：[VueUse](https://vueuse.org/)
