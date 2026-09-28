---
title: "用react-intl实现国际化"
description: 用 react-intl 实现前端国际化：IntlProvider 配置 locale 与 messages，useIntl / FormattedMessage 取文案，defineMessages 定义消息，@formatjs/cli 批量提取资源包，以及 formatNumber / formatDate 等格式化 API。
keywords: [用react-intl实现国际化]
category: React
tags: [React, 状态管理与路由]
---

# 用react-intl实现国际化

## 学习目标

- 理解并掌握 用react-intl实现国际化 的核心原理与工程实践

## 总结

很多应用都要求支持多语言，也就是国际化，如果你在外企，那几乎天天都在做这个。

我们用 react-intl 包实现了国际化。

它支持在 IntlProvider 里传入 locale 和 messages，然后在组件里用 useIntl 的 formatMessage 的 api 或者用 FormattedMessage 组件来取资源包中的消息。

定义消息用 defineMessages，指定不同的 id。

在 en-US.json、zh-CN.json 资源包里定义 message id 的不同值。

这样，就实现了文案的国际化。

此外，message 支持占位符和富文本，资源包用 {name}、\<xxx>\</xxx>的方式来写，然后用的时候传入对应的文本、替换富文本标签就好了。

如果是在非组件里用，要用 createIntl 的 api。

当然，日期、数字等在不同语言环境会有不同的格式，react-intl 对原生 Intl 的 api 做了封装，可以用 formatNumber、formatDate 等 api 来做相应的国际化。

如果应用中有很多 defineMessages 的国际化消息，想要批量提取出来生成资源包，可以用 @formatjs/cli 的 extract、compile 命令来做。

掌握了这些功能，就足够实现前端应用中各种国际化的需求了。

## 继续阅读

- 上一篇：[09-原子化状态管理库Jotai](09-原子化状态管理库Jotai)
- 下一篇：[11-表单与ServerActions](11-表单与ServerActions)
