---
title: unplugin-icons图标集成实践
description: "unplugin-icons 基于 Iconify 生态实现图标的按需自动导入，支持 150+ 图标集、200,000+ 图标，以 Vue 组件形式使用且只打包实际用到的图标。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# unplugin-icons 图标集成实践

## 概述

unplugin-icons 基于 Iconify 生态实现图标的按需自动导入，支持 150+ 图标集、200,000+ 图标，以 Vue 组件形式使用且只打包实际用到的图标。本文讲解其安装配置、与 unplugin-vue-components 的协作及图标使用方式。

## 学习目标

- 掌握 unplugin-icons 的安装与 Vite 配置
- 理解 Iconify 图标集的命名规则与按需加载
- 学会通过组件方式使用图标并控制样式

---

## 一、Iconify 生态

### 1.1 图标集资源

| 图标集 | 前缀 | 风格 |
|--------|------|------|
| Material Design Icons | `mdi` | Google 风格 |
| Carbon | `carbon` | IBM 风格 |
| Font Awesome | `fa` | 经典通用 |
| Heroicons | `heroicons` | Tailwind 风格 |
| Tabler | `tabler` | 线性简洁 |

图标搜索：[icones.js.org](https://icones.js.org/)

### 1.2 安装图标数据

```bash
# 方式一：全部图标集（~60MB，推荐开发机）
pnpm add -D @iconify/json

# 方式二：按需安装特定图标集
pnpm add -D @iconify-json/mdi
pnpm add -D @iconify-json/carbon
```

---

## 二、安装与配置

### 2.1 安装插件

```bash
pnpm add -D unplugin-icons
```

### 2.2 Vite 配置

```typescript
// vite.config.ts
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'

export default defineConfig({
  plugins: [
    vue(),
    Icons({
      compiler: 'vue3',
      autoInstall: true,
    }),
    Components({
      resolvers: [
        IconsResolver({
          prefix: 'i',
          enabledCollections: ['mdi', 'carbon'],
        }),
      ],
    }),
  ],
})
```

### 2.3 配置说明

| 配置项 | 说明 |
|--------|------|
| `compiler: 'vue3'` | 编译为 Vue3 组件 |
| `autoInstall` | 自动安装缺失的图标集 |
| `prefix: 'i'` | 组件名前缀，`<i-mdi-home />` |
| `enabledCollections` | 限制可用图标集 |

---

## 三、使用方式

### 3.1 组件形式（自动导入）

```vue
<template>
  <!-- 格式：i-{集合名}-{图标名} -->
  <i-mdi-home />
  <i-carbon-settings />
  <i-mdi-account-circle class="text-2xl text-blue-500" />
</template>
```

### 3.2 手动导入形式

```vue
<script setup>
import HomeIcon from '~icons/mdi/home'
import SettingsIcon from '~icons/carbon/settings'
</script>

<template>
  <HomeIcon width="24" height="24" />
  <SettingsIcon class="text-gray-600" />
</template>
```

### 3.3 样式控制

图标编译为 SVG 组件，可通过 CSS 控制：

```vue
<i-mdi-heart class="text-red-500 text-xl" />

<!-- 或内联样式 -->
<i-mdi-heart style="color: red; font-size: 20px;" />
```

---

## 四、与 UnoCSS 图标方案对比

| 对比项 | unplugin-icons | UnoCSS preset-icons |
|--------|---------------|---------------------|
| 使用方式 | 组件 `<i-mdi-home />` | 类名 `class="i-mdi-home"` |
| 实现原理 | 编译为 Vue 组件 | 生成 CSS background/mask |
| 动态颜色 | 通过 props/CSS | 通过 CSS 变量 |
| 适用场景 | 需要组件级控制 | 纯装饰性图标 |

两种方案可以共存，按场景选择。

---

## 常见问题

**Q: 图标不显示怎么办？**

1) 确认图标集已安装（`@iconify/json` 或特定集合）；2) 确认组件名前缀正确；3) 检查 `enabledCollections` 是否包含目标集合。

**Q: 如何查看可用的图标名称？**

访问 [icones.js.org](https://icones.js.org/)，搜索图标后复制名称。名称格式为 `{collection}:{icon}`，在组件中转换为 `{collection}-{icon}`。

---

## 延伸阅读

- 上一篇：[组件自动导入与 UI 库集成实践](09-组件自动导入与UI库集成实践.md) — 组件 Resolver
- 下一篇：[UnoCSS 图标集成方案](11-UnoCSS图标集成方案.md) — CSS 类名图标
- 官方仓库：[unplugin-icons](https://github.com/unplugin/unplugin-icons)
