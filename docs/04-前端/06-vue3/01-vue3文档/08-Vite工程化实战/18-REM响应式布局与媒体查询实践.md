---
title: REM响应式布局与媒体查询实践
description: "REM 适配是移动端经典方案，通过动态设置根字体大小实现等比缩放。本文讲解 REM 原理、postcss-pxtorem 自动化转换，以及媒体查询断点设计。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# REM 响应式布局与媒体查询实践

## 概述

REM 适配是移动端经典方案，通过动态设置根字体大小实现等比缩放。本文讲解 REM 原理、postcss-pxtorem 自动化转换，以及媒体查询断点设计。

## 学习目标

- 理解 REM 适配的工作原理与计算公式
- 掌握 postcss-pxtorem 的自动化配置
- 学会设计合理的媒体查询断点体系

---

## 一、REM 适配原理

### 1.1 核心公式

```
根字体大小 = 屏幕宽度 / 设计稿份数

示例（750px 设计稿，分 10 份）：
iPhone 6 (375px)：html font-size = 375 / 10 = 37.5px
iPhone 12 (390px)：html font-size = 390 / 10 = 39px
```

### 1.2 动态设置根字体

```typescript
// utils/rem.ts
function setRemUnit() {
  const docEl = document.documentElement
  const clientWidth = docEl.clientWidth
  docEl.style.fontSize = clientWidth / 10 + 'px'
}

setRemUnit()
window.addEventListener('resize', setRemUnit)
```

### 1.3 换算关系

设计稿 750px 下：`1rem = 75px`（设计稿尺寸）

```
设计稿标注 150px → CSS 写 2rem（150 / 75）
设计稿标注 24px 字体 → CSS 写 0.32rem（24 / 75）
```

---

## 二、postcss-pxtorem 自动化

### 2.1 安装

```bash
pnpm add -D postcss-pxtorem
```

### 2.2 配置

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-pxtorem': {
      rootValue: 75,        // 设计稿宽度 / 10
      propList: ['*'],      // 转换所有属性
      selectorBlackList: ['.no-rem'],  // 排除的类名
      minPixelValue: 2,     // 最小转换值
    },
  },
}
```

### 2.3 使用效果

```css
/* 编写时直接写设计稿 px 值 */
.title {
  font-size: 32px;    /* → 0.42667rem */
  padding: 24px;      /* → 0.32rem */
}

/* 排除转换 */
.no-rem {
  font-size: 14px;    /* 保持 px */
}
```

---

## 三、媒体查询断点

### 3.1 常用断点

| 断点 | 范围 | 设备 |
|------|------|------|
| xs | < 576px | 手机竖屏 |
| sm | ≥ 576px | 手机横屏 |
| md | ≥ 768px | 平板 |
| lg | ≥ 992px | 笔记本 |
| xl | ≥ 1200px | 桌面 |
| xxl | ≥ 1400px | 大屏 |

### 3.2 使用方式

```scss
.container {
  width: 100%;
  padding: 0 16px;

  @media (min-width: 768px) {
    max-width: 720px;
    margin: 0 auto;
  }

  @media (min-width: 1200px) {
    max-width: 1140px;
  }
}
```

### 3.3 REM + 媒体查询组合

REM 处理等比缩放，媒体查询处理布局结构变化：

```scss
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: 1fr;  // 手机单列

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);  // 平板两列
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(4, 1fr);  // 桌面四列
  }
}
```

---

## 四、方案选型

| 方案 | 适用场景 | 优缺点 |
|------|---------|--------|
| REM | 移动端等比缩放 | 简单，但大屏可能过大 |
| vw/vh | 移动端 | 无需 JS，兼容性好 |
| 媒体查询 | 多端响应式 | 灵活，但断点间可能不连续 |
| REM + 媒体查询 | 混合场景 | 兼顾缩放和结构变化 |

---

## 常见问题

**Q: REM 和 vw 应该选哪个？**

现代项目推荐 vw（`postcss-px-to-viewport`），无需 JS 动态设置根字体，兼容性已足够好（iOS 8+、Android 4.4+）。REM 方案更适合需要兼容极老设备的项目。

**Q: 1px 边框问题如何处理？**

REM 缩放后 1px 可能变成 0.5px 导致显示异常。使用 `transform: scaleY(0.5)` 伪元素方案或 `border-image` 解决。

---

## 延伸阅读

- 上一篇：[User Agent 设备判断与移动端适配](17-User-Agent设备判断与移动端适配.md) — 设备判断
- 下一篇：[移动端适配 viewport 方案实践](19-移动端适配viewport方案实践.md) — viewport 方案
- 相关：[响应式设计](../../../01-CSS/07-响应式设计/03-响应式布局方案.md) — CSS 响应式完整方案
