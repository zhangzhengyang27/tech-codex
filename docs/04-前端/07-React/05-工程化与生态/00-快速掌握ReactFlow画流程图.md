---
title: "快速掌握ReactFlow画流程图"
description: "这节我们学会了基于 React Flow 画流程图。"
keywords: [快速掌握ReactFlow画流程图]
category: React
tags: [React, 工程化与生态]
---

# 快速掌握ReactFlow画流程图

## 学习目标

- 理解 React Flow 的 node（节点）、edge（边）数据模型
- 掌握 onNodesChange、onEdgesChange、onConnect 三个事件回调与自定义节点/边的写法

## 总结

这节我们学会了基于 React Flow 画流程图。

它有很多有价值的应用，比如 AI 工具的工作流编辑、低代码的逻辑编排等。

但它学起来并不难，核心就是 node（节点） 和 edge（边）。

对应三个事件回调： onNodesChange（节点变化）、onEdgesChange（边变化）、onConnect（连接节点和节点）

每个节点可以通过 type 指定绘制用的组件，我们可以自定义节点的内容，通过 data 指定传给组件的参数。

然后通过 nodeTypes 来指定 type 和组件的映射。

同样，边也可以自定义，通过 edgeTypes 来指定映射。

在自定义 node 里，通过 Handle 来声明黑点位置。

在自定义 edge 里，通过 BaseEdge 来画线，通过 EdgeLabelRenderer 来画其他内容。

画边的时候计算贝塞尔曲线的路径、直线的路径用 React Flow 提供的 hook（getBezierPath、getStraightPath）就行。

> 注：React Flow v12 起包名由 `reactflow` 改为 `@xyflow/react`，本节基于 v11 的 `reactflow` 包，API 基本一致。

此外，还可以通过 Controls、MiniMap、Background 来实现控制条、缩略图、背景等功能。通过 Panel 组件在画布上放置一些按钮之类的。

学完了这个案例，React Flow 就算入门了。

## 继续阅读

- 下一篇：[01-用react-spring做弹簧动画](01-用react-spring做弹簧动画)
