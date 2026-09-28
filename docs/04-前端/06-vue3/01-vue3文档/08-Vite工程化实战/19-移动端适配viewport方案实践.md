---
title: 移动端适配viewport方案实践
description: "viewport 方案（vw/vh）是现代移动端适配的主流选择，通过 postcss-px-to-viewport 将设计稿 px 自动转换为 vw 单位，无需 JavaScript 干预。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# 移动端适配 viewport 方案实践

## 概述

viewport 方案（vw/vh）是现代移动端适配的主流选择，通过 `postcss-px-to-viewport` 将设计稿 px 自动转换为 vw 单位，无需 JavaScript 干预。本文讲解 viewport 原理、PostCSS 插件配置及与 REM 方案的对比。

## 学习目标

- 理解 viewport 单位（vw/vh/vmin/vmax）的含义
- 掌握 postcss-px-to-viewport 的配置与使用
- 学会处理转换排除和第三方库兼容问题

---

## 一、Viewport 单位

| 单位 | 含义 |
|------|------|
| `vw` | 视口宽度的 1%（100vw = 屏幕宽度） |
| `vh` | 视口高度的 1% |
| `vmin` | vw 和 vh 中的较小值 |
| `vmax` | vw 和 vh 中的较大值 |

换算公式（750px 设计稿）：

```
1px（设计稿）= 1 / 750 * 100 vw = 0.13333vw
150px（设计稿）= 150 / 750 * 100 vw = 20vw
```

---

## 二、postcss-px-to-viewport 配置

### 2.1 安装

```bash
pnpm add -D postcss-px-to-viewport-8-plugin
```

### 2.2 PostCSS 配置

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    'postcss-px-to-viewport-8-plugin': {
      viewportWidth: 750,       // 设计稿宽度
      unitPrecision: 5,         // 小数精度
      viewportUnit: 'vw',       // 转换目标单位
      selectorBlackList: ['.ignore-vw'],  // 排除选择器
      minPixelValue: 1,         // 最小转换值
      mediaQuery: false,        // 不转换媒体查询中的 px
      exclude: [/node_modules/],  // 排除第三方库
    },
  },
}
```

### 2.3 使用效果

```css
/* 编写时直接写设计稿 px */
.header {
  height: 88px;       /* → 11.73333vw */
  padding: 0 30px;    /* → 0 4vw */
  font-size: 32px;    /* → 4.26667vw */
}

/* 排除转换 */
.ignore-vw {
  border: 1px solid #eee;  /* 保持 1px */
}
```

---

## 三、高级配置

### 3.1 横屏适配

```javascript
{
  landscape: false,  // 是否添加横屏媒体查询
  landscapeUnit: 'vh',
  landscapeWidth: 1334,  // 横屏设计稿宽度
}
```

### 3.2 限制最大宽度

防止大屏设备上元素过大：

```css
.container {
  width: 100vw;
  max-width: 750px;  /* 限制最大宽度 */
  margin: 0 auto;
}
```

### 3.3 与 REM 共存

```javascript
// 部分文件用 vw，部分用 rem
exclude: [/src\/styles\/rem\//]  // 排除 rem 目录
```

---

## 四、方案对比

| 对比项 | REM | Viewport (vw) |
|--------|-----|---------------|
| 是否需要 JS | 是（动态设置根字体） | 否 |
| 精度 | 受根字体取整影响 | 更精确 |
| 兼容性 | iOS 6+ | iOS 8+ / Android 4.4+ |
| 第三方库冲突 | 少 | 需注意排除 |
| 维护成本 | 中 | 低 |

现代项目推荐 viewport 方案。

---

## 常见问题

**Q: 第三方 UI 库（如 Vant）的 px 会被转换吗？**

默认 `exclude: [/node_modules/]` 排除第三方库。Vant 的设计稿是 375px，如果项目设计稿是 750px，需要单独配置 Vant 的转换规则或使用 Vant 提供的 vw 版本。

**Q: 1px 边框如何处理？**

配置 `minPixelValue: 2`，1px 不会被转换。或使用 `transform: scaleY(0.5)` 伪元素方案实现真正的 0.5px 边框。

---

## 延伸阅读

- 上一篇：[REM 响应式布局与媒体查询实践](18-REM响应式布局与媒体查询实践.md) — REM 方案
- 下一篇：[Transition 动画与 UnoCSS 主题配置](20-Transition动画与UnoCSS主题配置.md) — 动画与主题
- 相关：[响应式设计](../../../01-CSS/07-响应式设计/02-移动端适配.md) — CSS 移动端适配
