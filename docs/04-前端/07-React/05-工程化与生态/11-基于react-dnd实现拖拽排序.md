---
title: "基于react-dnd实现拖拽排序"
description: "我们学了 react-dnd 并用它实现了拖拽排序。"
keywords: [基于react-dnd实现拖拽排序]
category: React
tags: [React, 工程化与生态]
---

# 基于react-dnd实现拖拽排序

## 学习目标

- 掌握 react-dnd 的 useDrag、useDrop、useDragLayer 三个 Hook 与 DndProvider
- 理解「hover/drop 时修改数据触发重渲染」的拖拽排序思路

## 总结

我们学了 react-dnd 并用它实现了拖拽排序。

react-dnd 主要就是 useDrag、useDrop、useDragLayer 这 3 个 API。

useDrag 是给元素添加拖拽，指定 item、type、collect 等参数。

useDrop 是给元素添加 drop，指定 accept、drop、hover、collect 等参数。

useDragLayer 用于自定义拖拽预览层，可以通过 monitor 拿到拖拽的实时位置。

此外，最外层还要加上 DndProvider，提供拖拽的上下文和 backend，让组件之间传递拖拽数据。

其实各种拖拽功能的实现思路比较固定：什么元素可以拖拽，什么元素可以 drop，drop 或者 hover 的时候修改数据触发重新渲染就好了。

比如拖拽排序就是 hover 的时候互换两个 index 的对应的数据，然后 setState 触发渲染。

用 react-dnd，我们能实现各种基于拖拽的功能。

## 继续阅读

- 上一篇：[10-组件库实战-构建umd产物，通过unpkg访问](10-组件库实战-构建umd产物，通过unpkg访问)
- 下一篇：[12-react-dnd实战-拖拽版TodoList](12-react-dnd实战-拖拽版TodoList)
