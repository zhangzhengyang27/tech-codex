---
title: "React服务端渲染-从SSR到hydrate"
description: "SSR 是 JSP、PHP 时代就存在的古老的技术，只不过之前是通过模版引擎，而现在是通过 node 服务渲染组件成字符串，客户端再次渲染，这种叫做同构渲染的模式。"
keywords: [React服务端渲染-从SSR到hydrate]
category: React
tags: [React, 原理与源码]
---

# React服务端渲染-从SSR到hydrate

## 学习目标

- 理解并掌握 React服务端渲染-从SSR到hydrate 的核心原理与工程实践

## 总结

SSR 是 JSP、PHP 时代就存在的古老的技术，只不过之前是通过模版引擎，而现在是通过 node 服务渲染组件成字符串，客户端再次渲染，这种叫做同构渲染的模式。

React SSR 是服务端通过 renderToString 把组件树渲染成 html 字符串，浏览器通过 hydrate 把已有的 dom 关联到 fiber 树，加上交互逻辑和再次渲染。

服务端 renderToString 就是递归拼接字符串的过程，遇到组件会传入参数执行，遇到标签会拼接对应的字符串，最终返回一段 html 给浏览器。

浏览器端 hydrate 是在 reconcile 的 beginWork 阶段，依次判断 dom 是否可以复用到当前 fiber，可以的话就设置到 fiber.stateNode，然后在 completeWork 阶段就可以跳过节点的创建。

这就是 React SSR 从服务端的 renderToString 到浏览器端的 hydrate 的全流程的原理。

## 继续阅读

- 上一篇：[01-低代码编辑器项目实战](01-低代码编辑器项目实战)
- 下一篇：[03-虚拟DOM设计动机与实现机制](03-虚拟DOM设计动机与实现机制)
