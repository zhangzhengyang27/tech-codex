---
title: "HTML5概览"
description: "本模块用于系统整理 HTML（含 HTML5 相关能力）与常用浏览器 API 的学习笔记，并以 MDN（mozilla）作为主要权威参考来源，方便你在\"概念理解 → 示例验证 → 规范查阅\"之间快速切换。"
keywords: [HTML5]
category: HTML5
tags: [HTML5, 语义化, Canvas, Web API]
---



# HTML5

本模块用于系统整理 HTML（含 HTML5 相关能力）与常用浏览器 API 的学习笔记，并以 MDN（mozilla）作为主要权威参考来源，方便你在"概念理解 → 示例验证 → 规范查阅"之间快速切换。

> **文档状态**：全部 23 篇基础知识 + 5 篇高级应用文档已完成**专业化增强**，每篇均包含 Mermaid 图表、深度技术解析、实战案例、最佳实践与 FAQ。

## 快速开始

- 推荐搭配：使用浏览器开发者工具（Elements/Console/Network）边读边验证

## 章节导航

### 基础知识（23 篇）

#### HTML 基础入门

- [1-HTML 基础](/docs/html5/01-基础知识/1-HTML%20基础) — HTML 文档结构、元素分类、语义化标签
- [2-设计网页文本内容](/docs/html5/01-基础知识/2-设计网页文本内容) — 标题、段落、格式化、引用、代码
- [3-列表](/docs/html5/01-基础知识/3-列表) — 有序/无序/定义列表、嵌套列表
- [4-超链接](/docs/html5/01-基础知识/4-超链接) — a 标签完整属性、响应式图片、安全防护、SEO 优化
- [5-图像](/docs/html5/01-基础知识/5-图像) — img 标签、现代 Image API、图像安全、LQIP 渐进加载
- [6-表格](/docs/html5/01-基础知识/6-表格) — 表格结构、CSS Grid 替代表格、可访问性、大数据渲染

#### 表单与多媒体

- [7-全局属性](/docs/html5/01-基础知识/7-全局属性) — 全局属性体系、data-*、ARIA、微数据
- [8-表单](/docs/html5/01-基础知识/8-表单) — 表单元素、验证 API、自定义控件、无障碍设计
- [9-嵌入多媒体元素](/docs/html5/01-基础知识/9-嵌入多媒体元素) — video/audio/track、Media Session API

#### 文件与交互

- [10-文件操作](/docs/html5/01-基础知识/10-文件操作) — File/Blob/FileReader API、分片上传、Stream API、File System Access
- [11-拖放操作](/docs/html5/01-基础知识/11-拖放操作) — Drag and Drop API、DataTransfer、移动端触摸替代、性能优化
- [12-Canvas](/docs/html5/01-基础知识/12-Canvas) — 2D 绑定上下文、图形绘制、动画、离屏 Canvas
- [13-SVG](/docs/html5/01-基础知识/13-SVG) — 矢量图形、滤镜、SMIL 动画、JavaScript 交互、a11y 深度指南

#### 存储与服务端通信

- [14-数据存储](/docs/html5/01-基础知识/14-数据存储) — Cookie/Web Storage/IndexedDB/Cache API/OPFS/存储安全
- [15-WebWorkers 处理线程](/docs/html5/01-基础知识/15-WebWorkers处理线程) — Dedicated/Shared Worker、OffscreenCanvas、调试与性能分析
- [16-获取地理位置信息](/docs/html5/01-基础知识/16-获取地理位置信息) — Geolocation API、地理围栏、轨迹记录、隐私防护
- [17-HTML5 其他应用](/docs/html5/01-基础知识/17-HTML5其他应用) — History/Notification/Page Visibility/Fullscreen/Wake Lock/Clipboard

### 高级应用（5 篇）

- [1-响应式网页设计](/docs/html5/02-高级应用/1-响应式网页设计) — Mobile First、断点策略、流体排版、Grid+Flexbox 混合布局
- [2-响应式技术](/docs/html5/02-高级应用/2-响应式技术) — 媒体查询、Container Queries、视口单位、移动端适配
- [3-Web Components](/docs/html5/02-高级应用/3-WebComponents) — Custom Elements、Shadow DOM、Templates、框架集成
- [4-Dialog 与 Popover](/docs/html5/02-高级应用/4-Dialog与Popover) — 原生 dialog/popover API、焦点陷阱、焦点管理、企业级组件封装
- [5-现代浏览器 API](/docs/html5/02-高级应用/5-现代浏览器API) — Performance API、Web Crypto、WebAuthn、BroadcastChannel、新兴 API 预览

## 参考资料（MDN / mozilla）

- Web 入门（从零创建第一个页面）：<https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Getting_started/Your_first_website>
- HTML（概览与参考入口）：<https://developer.mozilla.org/zh-CN/docs/Web/HTML>
- 构建文档结构（语义化布局思路）：<https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Structuring_content/Structuring_documents>
- “头”里有什么（HTML head 与元信息）：<https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Structuring_content/Webpage_metadata>
- 浏览器扩展开发文档（WebExtensions）：<https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions>
