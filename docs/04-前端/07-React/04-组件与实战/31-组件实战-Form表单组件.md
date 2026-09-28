---
title: "组件实战-Form表单组件"
description: "我们每天都在用 antd 的 Form 组件，今天自己实现了下。"
keywords: [组件实战-Form表单组件]
category: React
tags: [React, 组件与实战]
---

# 组件实战-Form表单组件

## 学习目标

- 掌握 Form 表单组件的实现思路（Store + Context + rules 校验）
- 理解 与 antd useForm 方式的差异

## 总结

我们每天都在用 antd 的 Form 组件，今天自己实现了下。

其实原理不复杂，就是把 Form 的表单项的值存储到 Store 中。

在 Form 组件里把 Store 放到 Context，在 Item 组件里取出来。

用 Item 组件包裹表单项，传入 value、onChange 参数用来同步表单值到 Store。

这样，表单项的值变化或者 submit 的时候，就可以根据 rules 用 async-validator 来校验。

此外，我们还通过 ref 暴露出了 setFieldsValue、getFieldsValue 等 store 的 api。

当然，在 antd 的 Form 里是通过 useForm 这个 hook 来创建 store，然后把它传入 Form 组件来用的。

两种实现方式都可以。

每天都用 antd 的 Form 组件，不如自己手写一个吧！
## 继续阅读

- 上一篇：[30-组件实战-Upload拖拽上传](30-组件实战-Upload拖拽上传)
- 下一篇：[32-基于ReactRouter实现keepalive](32-基于ReactRouter实现keepalive)
