---
title: UnoCSS图标集成方案
description: "UnoCSS 通过 preset-icons 预设实现 CSS 类名形式的图标使用，无需注册组件即可在模板中通过 class=\"i-mdi-home\" 引用任意图标。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# UnoCSS 图标集成方案

## 概述

UnoCSS 通过 preset-icons 预设实现 CSS 类名形式的图标使用，无需注册组件即可在模板中通过 `class="i-mdi-home"` 引用任意图标。本文讲解 preset-icons 的配置、图标样式定制及与 unplugin-icons 的协作策略。

## 学习目标

- 掌握 UnoCSS preset-icons 的配置与使用
- 理解 CSS mask/background 两种图标渲染模式
- 学会图标样式定制与自定义图标集

---

## 一、配置

### 1.1 安装图标数据

```bash
pnpm add -D @iconify/json
```

### 1.2 UnoCSS 配置

```typescript
// uno.config.ts
import { defineConfig, presetIcons, presetWind } from 'unocss'

export default defineConfig({
  presets: [
    presetWind(),
    presetIcons({
      prefix: 'i-',
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
    }),
  ],
})
```

---

## 二、使用方式

### 2.1 类名引用

```vue
<template>
  <!-- 格式：i-{集合}-{图标名} -->
  <span class="i-mdi-home text-xl text-blue-500" />
  <span class="i-carbon-settings text-2xl" />
  <button class="btn">
    <span class="i-mdi-plus mr-1" />
    新增
  </button>
</template>
```

### 2.2 渲染模式

| 模式 | CSS 实现 | 颜色控制 | 适用场景 |
|------|---------|---------|---------|
| mask（默认） | `mask-image` + `background-color` | `color` / `background-color` | 单色图标 |
| background | `background-image: url(svg)` | 不可通过 CSS 修改 | 多色图标 |

配置渲染模式：

```typescript
presetIcons({
  mode: 'mask',  // 或 'background-img'
})
```

### 2.3 尺寸控制

```vue
<!-- 通过 font-size 或 width/height -->
<span class="i-mdi-home text-3xl" />
<span class="i-mdi-home w-8 h-8" />
```

---

## 三、自定义图标集

```typescript
// uno.config.ts
import fs from 'node:fs'

export default defineConfig({
  presets: [
    presetIcons({
      customCollections: {
        // 从本地 SVG 文件加载
        'my-icons': {
          logo: fs.readFileSync('./assets/logo.svg', 'utf-8'),
          banner: fs.readFileSync('./assets/banner.svg', 'utf-8'),
        },
      },
    }),
  ],
})
```

使用：`<span class="i-my-icons-logo" />`

---

## 四、与 unplugin-icons 的协作

| 场景 | 推荐方案 |
|------|---------|
| 纯装饰性图标（箭头、关闭） | UnoCSS preset-icons |
| 需要交互/动画的图标 | unplugin-icons（组件形式） |
| 图标按钮 | 两者均可 |
| 多色图标 | UnoCSS（background 模式） |

两者可共存于同一项目，按具体需求选择。

---

## 常见问题

**Q: 图标显示为方块或不显示？**

确认 `@iconify/json` 已安装，且类名前缀与配置的 `prefix` 一致。默认前缀为 `i-`，类名格式为 `i-{collection}-{icon}`。

**Q: 如何改变图标颜色？**

mask 模式下直接设置 `color` 或 `background-color`：`class="i-mdi-heart text-red-500"`。background 模式无法通过 CSS 修改颜色。

---

## 延伸阅读

- 上一篇：[unplugin-icons 图标集成实践](10-unplugin-icons图标集成实践.md) — 组件形式图标
- 下一篇：[vite-plugin-vue-layouts 布局系统实践](12-vite-plugin-vue-layouts布局系统实践.md) — 布局系统
- 官方文档：[UnoCSS Icons](https://unocss.dev/presets/icons)
