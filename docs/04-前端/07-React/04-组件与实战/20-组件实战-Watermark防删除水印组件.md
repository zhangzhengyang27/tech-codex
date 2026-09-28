---
title: "组件实战-Watermark防删除水印组件"
description: "这节我们实现了 Watermark 水印组件。"
keywords: [组件实战-Watermark防删除水印组件]
category: React
tags: [React, 组件与实战]
---

# 组件实战-Watermark防删除水印组件

## 学习目标

- 掌握 Watermark 的实现原理（canvas 水印图 + background repeat）
- 掌握 基于 MutationObserver 的防删除方案

## 总结

这节我们实现了 Watermark 水印组件。

水印的实现原理就是加一个和目标元素宽高一样的 div 覆盖在上面，设置 pointer-events:none 不响应鼠标事件。

然后背景用水印图片 repeat 实现。

这个水印图片是用 canvas 画的，传入文字或者图片，会计算 gap、文字宽高等，在正确的位置绘制出来。

之后转成 base64 之后设置为 background-image。

此外，还要支持防删除功能，也就是用 MutationObserver 监听水印节点的属性变动、节点删除等，有变化就重新绘制一个。

这样，我们就实现了有防删功能的 Watermark 水印组件。
## 继续阅读

- 上一篇：[19-浏览器的5种Observer](19-浏览器的5种Observer)
- 下一篇：[21-手写react-lazyload](21-手写react-lazyload)
