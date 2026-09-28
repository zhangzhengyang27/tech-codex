---
description: SvgIcon 自定义组件的设计与实现，支持 SVG 精灵与按需加载
keywords: [后台前端, SvgIcon, 自定义组件]
category: Vue
title: "自定义组件SvgIcon"
---
# 自定义组件SvgIcon
## 自定义组件 SvgIcon

### 处理外部 svg 图标

在项目中使用的 `icon` 图标共分为两类：

1. `element-plus` 的图标
2. 自定义的 `svg` 图标，它需要拥有两种能力：
   1. 显示外部 `svg` 图标
   2. 显示项目内的 `svg` 图标


基于以上概念创建出以下对应代码：创建 `components/SvgIcon/index.vue`：

```html
<template>
  <div
       v-if="isExternal"
       :style="styleExternalIcon"
       class="svg-external-icon svg-icon"
       :class="className"
       >
  </div>
  <svg v-else class="svg-icon" :class="className" aria-hidden="true">
    <use :xlink:href="iconName" />
  </svg>
</template>

<script setup>
  import { isExternal as external } from '@/utils/validate'
  import { computed } from 'vue'
  const props = defineProps({
    icon: {
      type: String,
      required: true
    },
    className: {
      type: String,
      default: ''
    }
  })

  // 判断是否为外部图标
  const isExternal = computed(() => external(props.icon))

  // 外部图标样式
  const styleExternalIcon = computed(() => ({
    mask: `url(${props.icon}) no-repeat 50% 50%`,
    '-webkit-mask': `url(${props.icon}) no-repeat 50% 50%`
  }))

  // 项目内图标
  const iconName = computed(() => `#icon-${props.icon}`)
</script>

<style scoped>
  .svg-icon {
    width: 1em;
    height: 1em;
    vertical-align: -0.15em;
    fill: currentColor;
    overflow: hidden;
  }

  .svg-external-icon {
    background-color: currentColor;
    mask-size: cover !important;
    display: inline-block;
  }
</style>
```

创建 `utils/validate.js`：

```js
/**
 * 判断是否为外部资源
 * @param {string} path 路径
 * @returns {Boolean} 是否为外部资源
 */
export function isExternal(path) {
  return /^(https?:|mailto:|tel:)/.test(path)
}
```

在 `views/login/index.vue` 中手动导入 `Svg-icon` 组件，使用 **外部 `svg`**

```html
<span class="svg-container">
	<svg-icon icon="https://XXX.svg"></svg-icon>
</span>
```

 `SvgIcon` 组件用来处理 **外部图标** 的展示，但是对于内部图标而言此时依然无法进行展示

### 处理内部 svg 图标显示

导入所有 `svg` 图标到 `src/icons/svg` 目录下。并在 `icons` 下创建 `index.js` 文件，该文件中需要完成两件事情：

1. 导入所有的 `svg` 图标
2. 完成 `SvgIcon` 的全局注册

通过 `require.context()`函数来创建自己的 context。这个函数传入三个参数：一个要搜索的目录，一个标记表示是否还搜索其子目录，以及一个匹配文件的正则表达式

``` js
import SvgIcon from '@/components/SvgIcon'

// https://webpack.docschina.org/guides/dependency-management/#requirecontext
const svgRequire = require.context('./svg', false, /\.svg$/)
// 此时返回一个 require 的函数，可以接受一个 request 的参数，用于 require 的导入。
// 该函数提供了三个属性，可以通过 require.keys() 获取到所有的 svg 图标
// 遍历图标，把图标作为 request 传入到 require 导入函数中，完成本地 svg 图标的导入
svgRequire.keys().forEach(svgIcon => svgRequire(svgIcon))

export default app => {
  app.component('svg-icon', SvgIcon)
}
```

在 `main.js` 中引入该文件

```js
// ...
// 导入 svgIcon
import installIcons from '@/icons'
installIcons(app)
```

删除 `views/login/index.vue` 下局部导入 `SvgIcon` 的代码。在 `login/index.vue` 中使用 `SvgIcon` 引入本地 `svg`

```html
<!-- 用户名 -->
<svg-icon icon="user" />
<!-- 密码 -->
<svg-icon icon="password" />
<!-- 眼睛 -->
<svg-icon icon="eye" />
```

此时 **处理内容 `svg` 图标的代码** 已经完成，但打开浏览器，发现 **图标依然无法展示！** 这又是因为什么原因呢？

### svg-sprite-loader 处理 svg 图标

插件 [svg-sprite-loader](https://www.npmjs.com/package/svg-sprite-loader) 是 `webpack` 中专门用来处理 `svg` 图标的一个 `loader` 

```
npm i --save-dev svg-sprite-loader@6.0.9
```

创建 `vue.config.js` 文件，新增如下配置：

```js
const path = require('path')
function resolve(dir) {
  return path.join(__dirname, dir)
}
// https://cli.vuejs.org/zh/guide/webpack.html#%E7%AE%80%E5%8D%95%E7%9A%84%E9%85%8D%E7%BD%AE%E6%96%B9%E5%BC%8F
module.exports = {
  chainWebpack(config) {
    // 设置 svg-sprite-loader
    // config 为 webpack 配置对象，config.module 表示创建一个具名规则，以后用来修改规则
    config.module
      .rule('svg') // 规则
      .exclude.add(resolve('src/icons')) // 忽略
      .end()
    // config.module 表示创建一个具名规则，以后用来修改规则
    config.module
      .rule('icons')
      .test(/\.svg$/) // 正则，解析 .svg 格式文件
      .include.add(resolve('src/icons')) // 解析的文件
      .end()
      .use('svg-sprite-loader') // 新增了一个解析的 loader
      .loader('svg-sprite-loader') // 具体的loader
    // loader 的配置
      .options({
      symbolId: 'icon-[name]'
    })
      .end()
  }
}
```

处理完以上配置之后，重新启动项目，图标即可显示！