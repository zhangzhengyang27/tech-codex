---
title: User-Agent设备判断与移动端适配
description: "移动端适配的第一步是准确判断设备类型。本文讲解 User Agent 解析方法、VueUse 的 useMediaQuery 等检测工具，以及基于设备判断的路由分发策略。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# User Agent 设备判断与移动端适配

## 概述

移动端适配的第一步是准确判断设备类型。本文讲解 User Agent 解析方法、VueUse 的 useMediaQuery 等检测工具，以及基于设备判断的路由分发策略。

## 学习目标

- 理解 User Agent 字符串的结构与解析方式
- 掌握 UA 解析封装与 VueUse useMediaQuery 的使用
- 学会基于设备类型的响应式路由分发

---

## 一、User Agent 基础

### 1.1 UA 字符串结构

```
Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)
AppleWebKit/605.1.15 (KHTML, like Gecko)
Version/16.0 Mobile/15E148 Safari/604.1
```

关键标识：

| 设备 | UA 特征 |
|------|---------|
| iOS | `iPhone` / `iPad` / `iPod` |
| Android | `Android` |
| Windows | `Windows NT` |
| macOS | `Macintosh` / `Mac OS X` |

### 1.2 判断方式

```typescript
// 简单判断
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

// 更精确的判断
const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
const isAndroid = /Android/i.test(navigator.userAgent)
const isWeChat = /MicroMessenger/i.test(navigator.userAgent)
```

---

## 二、VueUse 设备检测

### 2.1 UA 解析封装

> 注意：`@vueuse/core` 并没有内置 `useUserAgent` 这样的 UA 解析函数（官方曾明确拒绝该提议，推荐使用 bowser 或 ua-parser-js）。UA 解析可自行封装：

```typescript
// composables/useDevice.ts
import { computed } from 'vue'

export const userAgent = navigator.userAgent

export const isMobile = computed(() =>
  /Android|iPhone|iPad|iPod/i.test(userAgent)
)
```

### 2.2 useMediaQuery

```typescript
const isSmallScreen = useMediaQuery('(max-width: 768px)')
const isDark = useMediaQuery('(prefers-color-scheme: dark)')
```

---

## 三、路由分发策略

### 3.1 入口判断跳转

```typescript
// router/index.ts
router.beforeEach((to) => {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)

  if (isMobile && !to.path.startsWith('/m')) {
    return `/m${to.path}`
  }
  if (!isMobile && to.path.startsWith('/m')) {
    return to.path.replace('/m', '') || '/'
  }
})
```

### 3.2 独立移动端应用

大型项目建议 PC 和移动端独立部署：

| 方案 | 适用场景 |
|------|---------|
| 同项目路由分发 | 小型项目、共享逻辑多 |
| 独立项目独立部署 | 大型项目、差异大 |
| 响应式一套代码 | 内容展示型网站 |

---

## 常见问题

**Q: UA 判断可靠吗？**

UA 可以被伪造，不适合用于安全判断。但对于 UI 适配场景足够可靠。更精确的方式是结合 `navigator.maxTouchPoints` 和媒体查询。

**Q: iPad 的 UA 为什么显示为 Mac？**

iPadOS 13+ 默认请求桌面版网站，UA 中显示 `Macintosh`。需通过 `navigator.maxTouchPoints > 1` 辅助判断。

---

## 延伸阅读

- 上一篇：[vite-plugin-mock 数据模拟实践](16-vite-plugin-mock数据模拟实践.md) — Mock 数据
- 下一篇：[REM 响应式布局与媒体查询实践](18-REM响应式布局与媒体查询实践.md) — REM 适配
- 相关：[响应式设计](../../../01-CSS/07-响应式设计/01-媒体查询.md) — CSS 响应式方案
