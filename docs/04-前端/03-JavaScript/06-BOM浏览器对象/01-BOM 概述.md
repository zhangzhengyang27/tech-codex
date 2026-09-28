---
title: BOM 概述
description: "浏览器对象模型（BOM）提供了与浏览器窗口交互的对象和方法。BOM 的核心是 window 对象，它既是访问浏览器窗口的接口，又是 ECMAScript 规定的 Global 对象。本文概述 window、location、navigator、screen、history 各对象的职责与学习路径。"
keywords: [BOM, 概述]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---


# BOM 概述

浏览器对象模型（Browser Object Model，BOM）提供了与浏览器窗口交互的对象和方法。BOM 的核心是 `window` 对象，它表示浏览器的一个实例。在浏览器中，`window` 对象有双重角色，既是通过 JavaScript 访问浏览器窗口的一个接口，又是 ECMAScript 规定的 Global 对象。

> ℹ️ **BOM 与 DOM 的区别：**
> - **DOM**：文档对象模型，用于操作 HTML 文档的内容和结构
> - **BOM**：浏览器对象模型，用于操作浏览器窗口和浏览器本身的功能

## BOM 的核心组成

BOM 主要包含以下对象，它们都作为 `window` 对象的属性存在：

```
window
├── document     → 文档对象（DOM 的入口）
├── location     → URL 信息与导航
├── navigator    → 浏览器与设备信息
├── screen       → 屏幕信息
├── history      → 历史记录管理
├── frames       → 框架集合
├── localStorage → 本地存储
├── sessionStorage → 会话存储
└── ...其他属性和方法
```

## 各对象简介

### window 对象

`window` 对象是 BOM 的核心，代表浏览器窗口。它既是全局对象，又提供了窗口操作、定时器、对话框等功能。

**主要功能**：
- 全局作用域与全局变量访问
- 窗口大小、位置控制
- 定时器（setTimeout、setInterval）
- 系统对话框（alert、confirm、prompt）
- 窗口事件（load、resize、scroll 等）

👉 详细内容请参阅 [window 对象](02-window%20对象.md)

### screen 对象

`screen` 对象提供显示屏幕的信息：

- `screen.width` / `screen.height`：屏幕的宽高（像素）
- `screen.availWidth` / `screen.availHeight`：去掉任务栏等系统部件后的可用宽高
- `screen.orientation`：屏幕方向信息

👉 详细内容请参阅 [screen 对象](05-screen%20对象.md)

### navigator 对象

`navigator` 对象提供浏览器与设备信息：

- `navigator.userAgent`：用户代理字符串
- `navigator.language`：浏览器语言
- `navigator.onLine`：网络连接状态
- `navigator.clipboard`：剪贴板访问

👉 详细内容请参阅 [navigator 对象](04-navigator%20对象.md)

### history 对象

`history` 对象用于管理会话历史记录：

- `history.back()` / `history.forward()`：后退 / 前进
- `history.go(n)`：跳转到任意历史记录
- `history.pushState()` / `history.replaceState()`：修改历史记录（SPA 路由核心）
- 滚动恢复控制（scrollRestoration）

👉 详细内容请参阅 [history 对象](06-history%20对象.md)

## BOM 对象关系图

```
┌─────────────────────────────────────────────────────────────┐
│                        window                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    Global Scope                       │   │
│  │         所有全局变量和函数都挂载于此                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ location │ │navigator │ │  screen  │ │ history  │       │
│  │          │ │          │ │          │ │          │       │
│  │ URL信息  │ │浏览器信息│ │ 屏幕信息 │ │ 历史记录 │       │
│  │ 导航功能 │ │ 设备能力 │ │ 显示属性 │ │ 路由控制 │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    document (DOM)                     │  │
│  │                 文档对象模型的入口                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 常见应用场景

| 场景 | 涉及对象 | 典型用法 |
|------|----------|----------|
| 页面跳转与重定向 | `location` | `location.href = '/new-page'` |
| 获取查询参数 | `location` + `URLSearchParams` | `new URLSearchParams(location.search)` |
| 检测设备类型 | `navigator` | `navigator.userAgent` / `navigator.maxTouchPoints` |
| 网络状态监控 | `navigator` | `navigator.onLine` + online/offline 事件 |
| 响应式布局辅助 | `screen` | `screen.width` / `screen.orientation` |
| SPA 路由实现 | `history` | `history.pushState()` + `popstate` 事件 |
| 定时任务 | `window` | `setTimeout()` / `setInterval()` |
| 弹窗通信 | `window` | `window.open()` + `postMessage()` |

## 浏览器兼容性注意事项

> ⚠️ **BOM 没有正式的标准规范，不同浏览器的实现可能存在差异：**
> 1. **属性差异**：某些属性在不同浏览器中可能返回不同的值或不存在
> 2. **方法限制**：出于安全考虑，某些方法（如 `moveTo`、`resizeTo`）可能被浏览器禁用
> 3. **移动端差异**：移动设备的 BOM 行为可能与桌面端有显著不同
> 4. **隐私限制**：某些 API（如 `geolocation`）需要用户授权，或仅限 HTTPS 环境
>
> **最佳实践**：
> - 使用前进行特性检测（`'geolocation' in navigator`）
> - 提供合理的降级方案
> - 遵循渐进增强原则

## 学习建议

1. **window 对象**是 BOM 的核心，建议优先掌握
2. **location** 和 **history** 是前端路由的基础，SPA 开发必备
3. **navigator** 提供丰富的设备能力检测，按需学习
4. **screen** 对象使用场景相对较少，了解即可

## 相关资源

- [MDN - Window 对象](https://developer.mozilla.org/zh-CN/docs/Web/API/Window)
- [MDN - Location 对象](https://developer.mozilla.org/zh-CN/docs/Web/API/Location)
- [MDN - Navigator 对象](https://developer.mozilla.org/zh-CN/docs/Web/API/Navigator)
- [MDN - History API](https://developer.mozilla.org/zh-CN/docs/Web/API/History_API)
