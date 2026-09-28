---
title: vite-plugin-pwa集成实战
description: "vite-plugin-pwa 基于 Workbox 为 Vite 项目提供零配置的 PWA 支持，自动生成 Service Worker、Manifest 和资源预缓存。本文讲解其安装配置、缓存策略定制和开发调试方法。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# vite-plugin-pwa 集成实战

## 概述

vite-plugin-pwa 基于 Workbox 为 Vite 项目提供零配置的 PWA 支持，自动生成 Service Worker、Manifest 和资源预缓存。本文讲解其安装配置、缓存策略定制和开发调试方法。

## 学习目标

- 掌握 vite-plugin-pwa 的安装与基础配置
- 理解 Workbox 预缓存与运行时缓存的区别
- 学会自定义 Manifest 和缓存策略

---

## 一、安装与基础配置

### 1.1 安装

```bash
pnpm add -D vite-plugin-pwa
```

### 1.2 Vite 配置

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'My App',
        short_name: 'App',
        theme_color: '#3498db',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
```

### 1.3 registerType 选项

| 值 | 行为 |
|------|------|
| `autoUpdate` | SW 更新后自动激活（推荐） |
| `prompt` | 提示用户手动刷新更新 |

---

## 二、缓存策略

### 2.1 预缓存（Precache）

构建时自动将所有静态资源加入预缓存列表：

```typescript
VitePWA({
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
  },
})
```

### 2.2 运行时缓存（Runtime Caching）

```typescript
VitePWA({
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\./,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: { maxEntries: 50, maxAgeSeconds: 300 },
        },
      },
      {
        urlPattern: /\.(png|jpg|jpeg|svg|gif)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'image-cache',
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
        },
      },
    ],
  },
})
```

---

## 三、开发调试

### 3.1 开发模式启用

```typescript
VitePWA({
  devOptions: {
    enabled: true,  // 开发环境也注册 SW
  },
})
```

### 3.2 调试工具

- Chrome DevTools → Application → Service Workers
- Chrome DevTools → Application → Manifest
- Lighthouse PWA 审计

### 3.3 常见问题排查

| 问题 | 原因 | 解决 |
|------|------|------|
| SW 未注册 | 非 HTTPS（生产） | 使用 HTTPS 或 localhost |
| 更新不生效 | 旧 SW 缓存 | 清除缓存或 `skipWaiting` |
| 图标不显示 | 尺寸/路径错误 | 检查 192+512 图标 |

---

## 常见问题

**Q: autoUpdate 和 prompt 如何选择？**

内容型应用（博客、文档）用 `autoUpdate`，用户无感知更新；工具型应用（编辑器）用 `prompt`，避免用户操作中突然刷新。

**Q: 如何强制更新 Service Worker？**

在 `workbox` 配置中添加 `skipWaiting: true` 和 `clientsClaim: true`，新 SW 安装后立即激活并接管所有客户端。

---

## 延伸阅读

- 上一篇：[PWA 渐进式 Web 应用基础](14-PWA渐进式Web应用基础.md) — PWA 概念
- 下一篇：[vite-plugin-mock 数据模拟实践](16-vite-plugin-mock数据模拟实践.md) — Mock 数据
- 官方文档：[vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
