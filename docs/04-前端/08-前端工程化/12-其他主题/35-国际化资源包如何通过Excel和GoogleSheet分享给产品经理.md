---
title: "国际化资源包如何通过Excel和GoogleSheet分享给产品经理"
description: "国际化资源包需要交给产品经理去翻译，我们会把 json 转成 excel 交给他。"
keywords: [国际化, Excel, Google Sheet, csv, json]
category: 前端工程化
tags: [国际化, Excel, Google Sheet]
---

# 国际化资源包如何通过Excel和GoogleSheet分享给产品经理

## 学习目标

- 理解并掌握 国际化资源包如何通过Excel和GoogleSheet分享给产品经理 的核心原理与工程实践

## 总结

国际化资源包需要交给产品经理去翻译，我们会把 json 转成 excel 交给他。

我们先用 exceljs 实现了 excel 的解析和生成，编辑完之后再转成 en-US.json、zh-CN.json 的资源包。

然后用 google sheet 实现了在线编辑和分享，编辑完之后下载并解析 csv，然后转成 en-US.json、zh-CN.json 的资源包。

用到了 csv-parse、csv-stringify。

这两种方案都可以，确定好方案之后把这些脚本内置到项目里就可以了。
## 继续阅读

- 上一篇：[10-用react-intl实现国际化](../../07-React/03-状态管理与路由/10-用react-intl实现国际化)
