---
title: "React 发展历史"
description: 梳理 React 从 2013 年开源到 React 19 的版本演进脉络：0.x 到 15 走向稳定、16 引入 Fiber、16.8 推出 Hooks、17 承上启下、18 并发能力、19 Server Components 与 Actions。
keywords: [React, 发展历史]
category: React
tags: [React, 基础概念]
---

# React 发展历史

## 学习目标

- 掌握 版本演进脉络
- 掌握 各阶段说明
- 掌握 0.x 到 15.0：走向稳定

## 版本演进脉络

| 时间 | 版本 | 关键变化 |
| --- | --- | --- |
| 2013 年 5 月 | 0.1.0 开源 | 项目开源，长期处于非稳定阶段 |
| 2016 年 4 月 | 15.0.0 | 从 0.14.0 直接跳到大版本，标志可用于商业项目开发 |
| 2017 年 9 月 | 16.0.0 | 引入 Fiber 引擎，虚拟 DOM 支持增量式渲染 |
| — | 16.8.0 | 推出 Hooks，函数式组件成为主流写法 |
| 2020 年 10 月 | 17.0.0 | 全新 JSX 解析方式与合成事件处理方案 |
| 2022 年 3 月 | 18.0.0 | 并发模式、Suspense 与 transition、自动批量处理 |
| 2024 年 12 月 | 19.0.0 | `use` Hook、Server Components 增强、Actions（useActionState / useOptimistic / useFormStatus）、原生文档元数据（`<title>`/`<meta>` 自动提升） |

## 各阶段说明

### 0.x 到 15.0：走向稳定

发布 0.1.0 后 React 一直处于非稳定阶段。经过几年发展逐渐成熟，2016 年 4 月发布 15.0.0——从 0.14.0 直接跳到这样一个大版本，标志着 React 可以用于商业项目开发。

### 16.0：Fiber 引擎

2017 年 9 月发布的 16.0.0 提供了新的虚拟 DOM 引擎，即 Fiber 引擎，可以使虚拟 DOM 进行增量式渲染。简单来说就是性能更好、体验更好。

### 16.8：Hooks 带来范式转变

16.8.0 带来了全新编程体验 Hooks，即函数式组件，彻底改变了 React 的开发趋势，也让编写 React 代码变得更简单——此前只有类组件开发，学习成本比较高。

### 17.0：承上启下

2020 年 10 月发布，主要是全新的 JSX 解析方式和合成事件处理方案，让 React 操作起来更加简约，并修复了大量 BUG。

### 18.0：并发能力

2022 年 3 月发布，在 17 的基础上对底层做了很多优化，引入并发模式、新的 Hook（useTransition、useDeferredValue 等）、Suspense 与 transition、自动批量处理等内容。

## 生态热度

从全球趋势看 React 使用量更大；在国内 Vue 和 React 基本是两足鼎立的态势。具体数据可参考 [npmtrends 对比](https://npmtrends.com/react-vs-vue)。

## 继续阅读

- 下一篇：[01-JSX](01-JSX)
