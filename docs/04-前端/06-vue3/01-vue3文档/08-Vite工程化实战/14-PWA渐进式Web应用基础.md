---
title: PWA渐进式Web应用基础
description: "PWA（Progressive Web App）通过 Service Worker、Web App Manifest 和 HTTPS 三大技术，让 Web 应用具备离线访问、可安装、推送通知等原生应用能力。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# PWA 渐进式 Web 应用基础

## 概述

PWA（Progressive Web App）通过 Service Worker、Web App Manifest 和 HTTPS 三大技术，让 Web 应用具备离线访问、可安装、推送通知等原生应用能力。本文讲解 PWA 的核心概念与技术组成。

## 学习目标

- 理解 PWA 的三大技术支柱及其作用
- 掌握 Web App Manifest 的配置规范
- 理解 Service Worker 的生命周期与缓存策略

---

## 一、PWA 核心特征

| 特征 | 说明 |
|------|------|
| 可安装 | 用户可将网站添加到主屏幕 |
| 离线可用 | Service Worker 缓存资源 |
| 推送通知 | 服务端主动推送消息 |
| 后台同步 | 网络恢复后自动同步数据 |
| 渐进增强 | 不支持的浏览器降级为普通网页 |

---

## 二、Web App Manifest

### 2.1 配置文件

`public/manifest.json`：

```json
{
  "name": "My App",
  "short_name": "App",
  "description": "应用描述",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3498db",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### 2.2 关键字段

| 字段 | 说明 |
|------|------|
| `display` | 显示模式：`standalone` / `fullscreen` / `minimal-ui` |
| `start_url` | 启动时的入口 URL |
| `theme_color` | 状态栏/标题栏颜色 |
| `icons` | 至少需要 192px 和 512px 两个尺寸 |

### 2.3 HTML 引入

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#3498db" />
```

---

## 三、Service Worker

### 3.1 生命周期

```mermaid
flowchart LR
    A[注册] --> B[安装 install]
    B --> C[等待 waiting]
    C --> D[激活 activate]
    D --> E[运行中 running]
    E --> F[终止/更新]
```

### 3.2 缓存策略

| 策略 | 说明 | 适用资源 |
|------|------|---------|
| Cache First | 优先缓存，失败走网络 | 静态资源（JS/CSS/图片） |
| Network First | 优先网络，失败用缓存 | API 数据 |
| Stale While Revalidate | 返回缓存同时后台更新 | 频繁更新的资源 |
| Cache Only | 仅从缓存读取 | 离线页面 |

### 3.3 注册示例

```typescript
// main.ts
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
```

---

## 四、PWA 前提条件

| 条件 | 说明 |
|------|------|
| HTTPS | Service Worker 仅在安全上下文运行（localhost 除外） |
| Manifest | 有效的 Web App Manifest |
| Service Worker | 至少注册一个 SW 文件 |
| 图标 | 192px + 512px 图标 |

---

## 常见问题

**Q: 开发环境如何测试 PWA？**

localhost 被视为安全上下文，Service Worker 可正常注册。生产环境必须使用 HTTPS。

**Q: PWA 和原生 App 的区别？**

PWA 无法访问所有原生 API（如蓝牙、NFC 受限），但开发成本低、更新即时、无需应用商店审核。适合内容型应用和轻量工具。

---

## 延伸阅读

- 上一篇：[Vue Macros 宏与语法糖扩展实践](13-Vue-Macros宏与语法糖扩展实践.md) — 语法扩展
- 下一篇：[vite-plugin-pwa 集成实战](15-vite-plugin-pwa集成实战.md) — Vite PWA 集成
- 官方文档：[web.dev PWA](https://web.dev/progressive-web-apps/)
