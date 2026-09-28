---
title: "组件实战-迷你Calendar"
description: "Calendar 或者 DatePicker 组件我们经常会用到，今天自己实现了一下。"
keywords: [组件实战-迷你Calendar]
category: React
tags: [React, 组件与实战]
---

# 组件实战-迷你Calendar

## 学习目标

- 掌握 迷你 Calendar 的实现原理（Date 的 api）
- 掌握 通过 forwardRef + useImperativeHandle 提供 ref api
- 掌握 基于 useControllableValue 同时支持受控与非受控

## 总结

Calendar 或者 DatePicker 组件我们经常会用到，今天自己实现了一下。

其实原理也很简单，就是 Date 的 api。

new Date 的时候 date 传 0 就能拿到上个月最后一天的日期，然后 getDate 就可以知道那个月有多少天。

然后再通过 getDay 取到这个月第一天是星期几，就知道怎么渲染这个月的日期了。

我们用 react 实现了这个 Calendar 组件，支持传入 defaultValue 指定初始日期，传入 onChange 作为日期改变的回调。

除了 props 之外，还额外提供 ref 的 api，通过 forwardRef + useImperativeHandle 的方式。

最开始只是非受控组件，后来我们又基于 ahooks 的 useControllableValue 同时支持了受控和非受控的用法。

整天用 Calendar 组件，不如自己手写一个吧！
## 继续阅读

- 上一篇：[09-受控模式VS非受控模式](09-受控模式VS非受控模式)
- 下一篇：[11-组件实战-Calendar日历组件](11-组件实战-Calendar日历组件)
