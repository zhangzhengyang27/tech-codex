---
title: "HTML5概览"
description: "本模块用于系统整理 HTML（含 HTML5 相关能力）与常用浏览器 API 的学习笔记，并以 MDN（mozilla）作为主要权威参考来源，方便你在\"概念理解 → 示例验证 → 规范查阅\"之间快速切换。"
keywords: [HTML5]
category: HTML5
tags: [HTML5, 语义化, Canvas, Web API]
---

# HTML5

本模块用于系统整理 HTML（含 HTML5 相关能力）与常用浏览器 API 的学习笔记，并以 MDN（mozilla）作为主要权威参考来源，方便你在"概念理解 → 示例验证 → 规范查阅"之间快速切换。

> **文档状态**：基础知识 25 篇 + 高级应用 8 篇，合计 33 篇，全部可路由访问。历史整理：原《18-HTML 标签》并入《19-看不见的HTML标签》、原《09-WebComponents原生组件化标准》并入《03-WebComponents》；2026-11-14 治理：超链接/表格/表单/文件操作/地理位置 5 篇超长文按主题拆分为 14 篇；图像/Canvas/SVG/数据存储 4 组拆件合并为单篇规范命名；《WebWorkers 处理线程》迁移至 [JavaScript/16-Web Workers与Service Worker](/docs/javascript/16-Web%20Workers与Service%20Worker/01-Web%20Workers基础)，《重识HTML》迁移至 [JavaScript/18-浏览器原理](/docs/javascript/18-浏览器原理/15-页面加载与HTML-DOM辨析)，《Fetch API》并入 [JavaScript/09-网络请求](/docs/javascript/09-网络请求/02-Fetch%20API)，PWA 篇中 Service Worker 大段去重并留链接。

## 快速开始

- 推荐搭配：使用浏览器开发者工具（Elements/Console/Network）边读边验证
- 建议按章节顺序学习：HTML 基础 → 表单与多媒体 → 文件交互 → 绘图与存储 → 高级应用

## 章节导航

### 基础知识（25 篇）

#### HTML 入门与文档内容

- [01-HTML 基础](/docs/html5/01-基础知识/01-HTML%20基础) — HTML 文档结构、元素分类、语义化标签
- [02-设计网页文本内容](/docs/html5/01-基础知识/02-设计网页文本内容) — 标题、段落、格式化、引用、代码
- [03-列表](/docs/html5/01-基础知识/03-列表) — 有序/无序/定义列表、嵌套列表
- [04-超链接（1）链接基础与属性](/docs/html5/01-基础知识/04-超链接-1-链接基础与属性) — a 标签基本语法、链接类型（含页面锚点）、外部链接、协议链接（邮件/电话）、URL 编码
- [04-超链接（2）样式交互与进阶优化](/docs/html5/01-基础知识/04-超链接-2-样式交互与进阶优化) — 链接样式与状态、JavaScript 交互、性能优化、SPA 路由、链接审计、国际化链接、权限策略
- [04-超链接（3）安全可访问与最佳实践](/docs/html5/01-基础知识/04-超链接-3-安全可访问与最佳实践) — 安全与隐私、可访问性、实战案例、常见问题排查、兼容性
- [05-图像处理](/docs/html5/01-基础知识/05-图像处理) — img 属性体系、响应式图片、现代图像 API、格式选型、LQIP、图像安全
- [06-表格（1）表格基础与语义化](/docs/html5/01-基础知识/06-表格-1-表格基础与语义化) — 表格结构、单元格合并、列组样式、基础 CSS
- [06-表格（2）高级样式与交互](/docs/html5/01-基础知识/06-表格-2-高级样式与交互) — 响应式表格、CSS Grid 替代、编辑功能、拖拽排序
- [06-表格（3）可访问性与最佳实践](/docs/html5/01-基础知识/06-表格-3-可访问性与最佳实践) — 打印优化、JS 操作 API、大数据渲染、可访问性、性能与最佳实践
- [07-全局属性](/docs/html5/01-基础知识/07-全局属性) — 全局属性体系、data-*、ARIA、微数据
- [19-看不见的HTML标签](/docs/html5/01-基础知识/19-看不见的HTML标签) — meta 自动刷新/跳转、script 加载顺序、link 预处理、canonical 与 OGP

#### 表单与多媒体

- [08-表单（1）表单元素与输入类型](/docs/html5/01-基础知识/08-表单-1-表单元素与输入类型) — form/input/textarea/label/button/select 完整用法
- [08-表单（2）验证与高级特性](/docs/html5/01-基础知识/08-表单-2-验证与高级特性) — fieldset 分组、约束验证 API、radio/checkbox/datalist、无障碍设计
- [09-嵌入多媒体元素](/docs/html5/01-基础知识/09-嵌入多媒体元素) — video/audio/track、Media Session API

#### 文件与设备交互

- [10-文件操作（1）File API 与文件读取](/docs/html5/01-基础知识/10-文件操作-1-FileAPI与文件读取) — 文件选择与拖拽上传、类型/大小校验、File/Blob/FileReader 读取
- [10-文件操作（2）高级操作与流式处理](/docs/html5/01-基础知识/10-文件操作-2-高级操作与流式处理) — 分片与断点续传、Stream API、File System Access、FAQ 与最佳实践
- [11-拖放操作](/docs/html5/01-基础知识/11-拖放操作) — Drag and Drop API、DataTransfer、移动端触摸替代、性能优化
- [16-获取地理位置信息（1）地理定位 API 基础](/docs/html5/01-基础知识/16-获取地理位置信息-1-地理定位API基础) — Geolocation API、数据对象、错误处理、配置选项
- [16-获取地理位置信息（2）实战应用与地图集成](/docs/html5/01-基础知识/16-获取地理位置信息-2-实战应用与地图集成) — 调用流程、轨迹记录、地理围栏、主流地图 SDK 集成
- [16-获取地理位置信息（3）隐私防护与最佳实践](/docs/html5/01-基础知识/16-获取地理位置信息-3-隐私防护与最佳实践) — 隐私与安全深度防护、调试技巧、最佳实践
- [17-HTML5其他应用](/docs/html5/01-基础知识/17-HTML5其他应用) — History/Notification/Page Visibility/Fullscreen/Wake Lock/Clipboard

#### 绘图与存储

- [12-Canvas绘图](/docs/html5/01-基础知识/12-Canvas绘图) — 2D 上下文、图形绘制、动画、离屏 Canvas、性能优化与实战案例集
- [13-SVG](/docs/html5/01-基础知识/13-SVG) — 矢量图形、滤镜、SMIL 动画、JavaScript 交互、事件处理与可访问性
- [14-数据存储](/docs/html5/01-基础知识/14-数据存储) — Cookie/Web Storage/IndexedDB、Cache API、OPFS、现代存储 API

### 高级应用（8 篇）

- [01-响应式网页设计](/docs/html5/02-高级应用/01-响应式网页设计) — Mobile First、断点策略、流体排版、Grid+Flexbox 混合布局
- [02-响应式技术](/docs/html5/02-高级应用/02-响应式技术) — 媒体查询、Container Queries、视口单位、移动端适配
- [03-WebComponents](/docs/html5/02-高级应用/03-WebComponents) — Custom Elements、Shadow DOM、Templates、框架集成
- [04-Dialog与Popover](/docs/html5/02-高级应用/04-Dialog与Popover) — 原生 dialog/popover API、焦点陷阱、焦点管理、企业级组件封装
- [05-现代浏览器API](/docs/html5/02-高级应用/05-现代浏览器API) — Performance API、Web Crypto、WebAuthn、BroadcastChannel、新兴 API 预览
- [07-Server-Sent Events](/docs/html5/02-高级应用/07-Server-Sent%20Events) — 基于 HTTP 的服务器单向推送技术、对比 WebSocket 的轻量方案
- [08-WebGL 进阶实战](/docs/html5/02-高级应用/08-WebGL%20进阶实战) — 矩阵变换、纹理、光照与渲染循环，从 Canvas 2D 迈向 3D
- [10-PWA渐进式Web应用](/docs/html5/02-高级应用/10-PWA渐进式Web应用) — Manifest、安装体验与 2026 年 Web 应用新进展（Service Worker/推送详见 [JavaScript/16](/docs/javascript/16-Web%20Workers与Service%20Worker/02-Service%20Worker详解)）

### 已迁移至 JavaScript 模块的内容

- [Web Workers 处理线程](/docs/javascript/16-Web%20Workers与Service%20Worker/01-Web%20Workers基础) — 原《15-WebWorkers处理线程》并入 16-Web Workers与Service Worker（新增线程模型与通信、高级应用与工程化、OffscreenCanvas 渲染、安全调试与最佳实践 4 篇）
- [页面加载与 HTML/DOM 辨析](/docs/javascript/18-浏览器原理/15-页面加载与HTML-DOM辨析) — 原《20-重识HTML》（浏览器页面加载过程）并入 18-浏览器原理
- [Fetch API](/docs/javascript/09-网络请求/02-Fetch%20API) — 原《06-Fetch API》并入 09-网络请求/02（补充完整可运行示例）

## 参考资料（MDN / mozilla）

- Web 入门（从零创建第一个页面）：<https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Getting_started/Your_first_website>
- HTML（概览与参考入口）：<https://developer.mozilla.org/zh-CN/docs/Web/HTML>
- 构建文档结构（语义化布局思路）：<https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Structuring_content/Structuring_documents>
- “头”里有什么（HTML head 与元信息）：<https://developer.mozilla.org/zh-CN/docs/Learn_web_development/Core/Structuring_content/Webpage_metadata>
- 浏览器扩展开发文档（WebExtensions）：<https://developer.mozilla.org/zh-CN/docs/Mozilla/Add-ons/WebExtensions>
