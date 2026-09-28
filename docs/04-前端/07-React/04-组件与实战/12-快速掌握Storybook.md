---
title: "快速掌握Storybook"
description: "写组件文档，我们一般都是用 Storybook。"
keywords: [快速掌握Storybook]
category: React
tags: [React, 组件与实战]
---

# 快速掌握Storybook

## 学习目标

- 掌握 Storybook 的核心概念：story、args、loaders、render、play
- 掌握 npx storybook init 快速上手

## 总结

写组件文档，我们一般都是用 Storybook。

它把不同 props 的渲染结果叫做一个 story，一个组件有多个 story。

story 可以通过 args 指定传入组件的参数，通过 loaders 请求数据，通过 render 函数自定义渲染内容、通过 play 指定自动执行的脚本等。

而且还可以渲染完组件直接跑测试用例，就很方便。

storybook 还会自动生成组件文档，而且也可以把项目里的 mdx 文件加到文档里。

用起来也很简单，首先 npx storybook init 初始化，之后执行 npm run storybook 就可以了。

总之，用 storybook 可以轻松的创建组件文档，可以写多个 story，直观的看到组件不同场景下的渲染结果，还可以用来做测试。

如果想给你的组件加上文档，storybook 基本是最好的选择。
## 继续阅读

- 上一篇：[11-组件实战-Calendar日历组件](11-组件实战-Calendar日历组件)
- 下一篇：[13-React组件如何写单测](13-React组件如何写单测)
