---
title: "用react-spring做弹簧动画"
description: "我们学了用 react-spring 来做动画。"
keywords: [用react-spring做弹簧动画]
category: React
tags: [React, 工程化与生态]
---

# 用react-spring做弹簧动画

## 学习目标

- 理解弹簧动画的 mass、tension、friction 三个参数
- 掌握 react-spring 各动画 Hook（useSpring、useSprings、useTrail 等）的适用场景

## 总结

我们学了用 react-spring 来做动画。

react-spring 主打的是弹簧动画，就是类似弹簧那种回弹效果。

只要指定 mass（质量）、tension（张力）、friction（摩擦力）就可以了。

- mass 质量：决定回弹惯性，mass 越大，回弹的距离和次数越多。

- tension 张力：弹簧松紧程度，弹簧越紧，回弹速度越快。

- friction 摩擦力：可以抵消质量和张力的效果。

弹簧动画不需要指定时间。

当然，你也可以指定 duration 来做那种普通动画。

react-spring 有不少 api，分别用于单个、多个元素的动画：

- useSpringValue：指定单个属性的变化。
- useSpring：指定多个属性的变化
- useSprings：指定多个元素的多个属性的变化，动画并行执行
- useTrail：指定多个元素的多个属性的变化，动画依次执行
- useSpringRef：用来拿到每个动画的 ref，可以用来控制动画的开始、暂停等
- useChain：串行执行多个动画，每个动画可以指定不同的开始时间

掌握了这些，就足够基于 react-spring 做动画了。

## 继续阅读

- 上一篇：[00-快速掌握ReactFlow画流程图](00-快速掌握ReactFlow画流程图)
- 下一篇：[02-react-spring结合use-gesture手势库实现交互动画](02-react-spring结合use-gesture手势库实现交互动画)
