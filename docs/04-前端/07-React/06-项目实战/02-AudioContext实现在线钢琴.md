---
title: "AudioContext实现在线钢琴"
description: "上节学了 AudioContext 的振荡器调音，这节我们基于 AudioContext 实现了一个在线钢琴。"
keywords: [AudioContext实现在线钢琴]
category: React
tags: [React, 项目实战]
---

# AudioContext实现在线钢琴

## 学习目标

- 理解不同琴键对应不同振动频率的发声原理
- 掌握用 keydown 事件监听与 setTimeout 简谱实现自动播放

## 总结

上节学了 AudioContext 的振荡器调音，这节我们基于 AudioContext 实现了一个在线钢琴。

不同键只是振动频率不同，然后按下的时候设置音量有个从小到大再到小的变化就好了。

我们用 styled-components 写的样式，它是通过组件的方式来使用某段样式。

我们监听了 keydown 事件，触发不同键的按下的处理。

然后根据简谱，通过不同 setTimeout 实现了乐曲的自动播放。

做完这个案例，我们会对 AudioContext 有更深的理解。

## 继续阅读

- 上一篇：[01-ReactFlow振荡器调音](01-ReactFlow振荡器调音)
- 下一篇：[03-以史为鉴：前端开发的四个时代](03-以史为鉴：前端开发的四个时代)
