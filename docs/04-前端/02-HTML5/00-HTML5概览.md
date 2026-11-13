---
title: "HTML5概览"
description: "本模块用于系统整理 HTML（含 HTML5 相关能力）与常用浏览器 API 的学习笔记，并以 MDN（mozilla）作为主要权威参考来源，方便你在\"概念理解 → 示例验证 → 规范查阅\"之间快速切换。"
keywords: [HTML5]
category: HTML5
tags: [HTML5, 语义化, Canvas, Web API]
---

# HTML5

本模块用于系统整理 HTML（含 HTML5 相关能力）与常用浏览器 API 的学习笔记，并以 MDN（mozilla）作为主要权威参考来源，方便你在"概念理解 → 示例验证 → 规范查阅"之间快速切换。

> **文档状态**：基础知识 27 篇 + 高级应用 9 篇，合计 36 篇，全部可路由访问。原《18-HTML 标签》（与《19-看不见的HTML标签》内容重合，已并入后者）与原《09-WebComponents原生组件化标准》（为《03-WebComponents》子集，已并入）不再单独成篇。

## 快速开始

- 推荐搭配：使用浏览器开发者工具（Elements/Console/Network）边读边验证
- 建议按章节顺序学习：HTML 基础 → 表单与多媒体 → 文件交互 → 绘图与存储 → 高级应用

## 章节导航

### 基础知识（27 篇）

#### HTML 入门与文档内容

- [01-HTML 基础](/docs/html5/01-基础知识/01-HTML%20基础) — HTML 文档结构、元素分类、语义化标签
- [02-设计网页文本内容](/docs/html5/01-基础知识/02-设计网页文本内容) — 标题、段落、格式化、引用、代码
- [03-列表](/docs/html5/01-基础知识/03-列表) — 有序/无序/定义列表、嵌套列表
- [04-超链接](/docs/html5/01-基础知识/04-超链接) — a 标签完整属性、响应式图片、安全防护、SEO 优化
- [05-图像（01）导读与基本语法至现代图像 API 深度解析](/docs/html5/01-基础知识/05-图像/01-导读与基本语法至现代图像%20API%20深度解析) — img 标签基本语法、响应式图片、现代 Image API
- [05-图像（02）图像格式详解至参考资料与更多阅读](/docs/html5/01-基础知识/05-图像/02-图像格式详解至参考资料与更多阅读) — 图像格式对比与选型、LQIP 渐进加载、图像安全
- [05-图像（03）补充示例](/docs/html5/01-基础知识/05-图像/03-补充示例) — 图像章节补充示例
- [06-表格](/docs/html5/01-基础知识/06-表格) — 表格结构、CSS Grid 替代表格、可访问性、大数据渲染
- [07-全局属性](/docs/html5/01-基础知识/07-全局属性) — 全局属性体系、data-*、ARIA、微数据
- [20-重识HTML](/docs/html5/01-基础知识/20-重识HTML) — 浏览器页面加载过程、HTML 与 DOM、事件委托

#### 表单与多媒体

- [08-表单](/docs/html5/01-基础知识/08-表单) — 表单元素、验证 API、自定义控件、无障碍设计
- [09-嵌入多媒体元素](/docs/html5/01-基础知识/09-嵌入多媒体元素) — video/audio/track、Media Session API

#### 文件与交互

- [10-文件操作](/docs/html5/01-基础知识/10-文件操作) — File/Blob/FileReader API、分片上传、Stream API、File System Access
- [11-拖放操作](/docs/html5/01-基础知识/11-拖放操作) — Drag and Drop API、DataTransfer、移动端触摸替代、性能优化
- [16-获取地理位置信息](/docs/html5/01-基础知识/16-获取地理位置信息) — Geolocation API、地理围栏、轨迹记录、隐私防护
- [17-HTML5其他应用](/docs/html5/01-基础知识/17-HTML5其他应用) — History/Notification/Page Visibility/Fullscreen/Wake Lock/Clipboard
- [19-看不见的HTML标签](/docs/html5/01-基础知识/19-看不见的HTML标签) — meta 自动刷新/跳转、script 加载顺序、link 预处理、canonical 与 OGP

#### 绘图：Canvas 与 SVG

- [12-Canvas（01）导读与概述至性能优化深度指南](/docs/html5/01-基础知识/12-Canvas/01-导读与1.%20概述至15.%20性能优化深度指南) — 2D 绑定上下文、图形绘制、动画、离屏 Canvas、性能优化
- [12-Canvas（02）实战案例集至参考资料](/docs/html5/01-基础知识/12-Canvas/02-16.%20实战案例集至22.%20参考资料（Resources）) — 粒子系统、数据可视化大屏、2D 游戏引擎等实战案例
- [12-Canvas（03）补充示例](/docs/html5/01-基础知识/12-Canvas/03-补充示例) — Canvas 章节补充示例
- [13-SVG（01）导读与基础知识至 JavaScript 交互](/docs/html5/01-基础知识/13-SVG/01-导读与基础知识至JavaScript%20交互) — 矢量图形、滤镜、SMIL 动画、JavaScript 交互
- [13-SVG（02）事件处理至补充示例](/docs/html5/01-基础知识/13-SVG/02-事件处理至补充示例) — 事件处理、可访问性与补充示例

#### 存储与多线程

- [14-数据存储（01）导读与存储方案概览至 IndexedDB](/docs/html5/01-基础知识/14-数据存储/01-导读与存储方案概览至IndexedDB) — Cookie/Web Storage/IndexedDB 方案概览
- [14-数据存储（02）常见问题解答至现代存储 API](/docs/html5/01-基础知识/14-数据存储/02-常见问题解答至现代存储%20API) — 存储配额与安全、Cache API、OPFS
- [14-数据存储（03）高级应用场景至补充示例](/docs/html5/01-基础知识/14-数据存储/03-高级应用场景至补充示例) — 存储高级应用场景与补充示例
- [15-WebWorkers处理线程（01）导读与概述至常见问题](/docs/html5/01-基础知识/15-WebWorkers处理线程/01-导读与概述至常见问题（FAQ）) — Dedicated/Shared Worker、OffscreenCanvas、FAQ
- [15-WebWorkers处理线程（02）总结至补充示例](/docs/html5/01-基础知识/15-WebWorkers处理线程/02-总结至补充示例) — Worker 实战与补充示例

### 高级应用（9 篇）

- [01-响应式网页设计](/docs/html5/02-高级应用/01-响应式网页设计) — Mobile First、断点策略、流体排版、Grid+Flexbox 混合布局
- [02-响应式技术](/docs/html5/02-高级应用/02-响应式技术) — 媒体查询、Container Queries、视口单位、移动端适配
- [03-WebComponents](/docs/html5/02-高级应用/03-WebComponents) — Custom Elements、Shadow DOM、Templates、框架集成
- [04-Dialog与Popover](/docs/html5/02-高级应用/04-Dialog与Popover) — 原生 dialog/popover API、焦点陷阱、焦点管理、企业级组件封装
- [05-现代浏览器API](/docs/html5/02-高级应用/05-现代浏览器API) — Performance API、Web Crypto、WebAuthn、BroadcastChannel、新兴 API 预览
- [06-Fetch API](/docs/html5/02-高级应用/06-Fetch%20API) — 现代网络请求核心接口、替代 XMLHttpRequest 的标准方案
- [07-Server-Sent Events](/docs/html5/02-高级应用/07-Server-Sent%20Events) — 基于 HTTP 的服务器单向推送技术、对比 WebSocket 的轻量方案
- [08-WebGL 进阶实战](/docs/html5/02-高级应用/08-WebGL%20进阶实战) — 矩阵变换、纹理、光照与渲染循环，从 Canvas 2D 迈向 3D
- [10-PWA渐进式Web应用](/docs/html5/02-高级应用/10-PWA渐进式Web应用) — Service Worker、Manifest、缓存策略与安装体验

## 参考资料（MDN / mozilla）

- Web 入门（从零创建第一个页面）：<https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Getting_started/Your_first_website>
- HTML（概览与参考入口）：<https://developer.mozilla.org/zh-CN/docs/Web/HTML>
- 构建文档结构（语义化布局思路）：<https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Structuring_content/Structuring_documents>
- “头”里有什么（HTML head 与元信息）：<https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Structuring_content/Webpage_metadata>
- 浏览器扩展开发文档（WebExtensions）：<https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions>
