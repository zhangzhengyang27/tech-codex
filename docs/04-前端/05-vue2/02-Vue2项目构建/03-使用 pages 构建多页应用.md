---
title: "多页面"
category: Vue

---

# 多页面

## pages 构建多页应用

在大部分实际场景中，都可以构建单页应用来进行项目的开发和迭代，然而对于项目复杂度过高或者页面模块之间差异化较大的项目，可以选择构建多页应用来实现。

既然多页应用拥有多个 html，那么同样也应该拥有多个独立的入口文件、组件、路由、vuex 等。简单一点就是**多页应用的每个单页都可以拥有单页应用 src 目录下的文件及功能**，来看下基础多页应用的目录结构：

```bash
├── node_modules               # 项目依赖包目录
├── build                      # 项目 webpack 功能目录
├── config                     # 项目配置项文件夹
├── src                        # 前端资源目录
│   ├── images                 # 图片目录
│   ├── components             # 公共组件目录
│   ├── pages                  # 页面目录
│   │   ├── page1              # page1 目录
│   │   │   ├── components     # page1 组件目录
│   │   │   ├── router         # page1 路由目录
│   │   │   ├── views          # page1 页面目录
│   │   │   ├── page1.html     # page1 html 模版
│   │   │   ├── page1.vue      # page1 vue 配置文件
│   │   │   └── page1.js       # page1 入口文件
│   │   ├── page2              # page2 目录
│   │   └── index              # index 目录
│   ├── common                 # 公共方法目录
│   └── store                  # 状态管理 store 目录
├── .gitignore                 # git 忽略文件
├── .env                       # 全局环境配置文件
├── .env.dev                   # 开发环境配置文件
├── .postcssrc.js              # postcss 配置文件
├── babel.config.js            # babel 配置文件
├── package.json               # 包管理文件
├── vue.config.js              # CLI 配置文件
```
除了目录结构的不同外，其实区别单页应用，多页应用在很多配置上都需要进行修改，比如单入口变为多入口、单模版变为多模版等

### 多入口

在单页应用中入口文件只有一个，默认配置的是 `main.js`。但是到多页应用，入口文件便包含了 `page1.js`、`page2.js`、`index.js` 等，数量取决于 pages 文件夹下目录的个数，这时为了项目的可拓展性，需要自动计算入口文件的数量并解析路径配置到 `webpack` 中的 `entry` 属性上，如：

```javascript
module.exports = {
  // ...
  entry: {
    page1: '/xxx/pages/page1/page1.js',
    page2: '/xxx/pages/page2/page2.js',
    index: '/xxx/pages/index/index.js',
  },
}
```

读取并解析这样的路径，就需要使用工具和函数来解决。在根目录新建 build 文件夹存放 utils.js 这样共用的 webpack 功能性文件，并加入多入口读取解析方法：

```javascript
/* utils.js */
const path = require('path');

// glob 是 webpack 安装时依赖的一个第三方模块，这模块允许你使用 * 等符号。例如 lib/*.js 就是获取 lib 文件夹下的所有 js 后缀名的文件
const glob = require('glob');

// 取得相应的页面路径
const PAGE_PATH = path.resolve(__dirname, '../src/pages');

/* 
* 多入口配置
* 通过 glob 模块读取 pages 文件夹下的所有对应文件夹下的 js * 后缀文件，如果该文件存在
* 那么就作为入口处理
*/
exports.getEntries = () => {
    let entryFiles = glob.sync(PAGE_PATH + '/*/*.js') // 同步读取所有入口文件
    let map = {}
    
    // 遍历所有入口文件，获取获取文件名 并存储
    entryFiles.forEach(filePath => {
        let filename = filePath.substring(filePath.lastIndexOf('\/') + 1, filePath.lastIndexOf('.'))
        map[filename] = filePath 
    })
    
    return map
}
```

上方使用了 [glob](https://github.com/isaacs/node-glob) 第三方模块读取所有 pages 文件夹下的入口文件，其需要进行安装：`yarn add glob --dev`。读取并存储完毕后，得到一个入口文件的对象集合，便可以将其设置到 webpack 的 entry 属性上

```javascript
/* vue.config.js */

const utils = require('./build/utils')

module.exports = {
  // ...
  configureWebpack: config => {
    config.entry = utils.getEntries()
  },
}
```

### 多模版

相对于多入口来说，多模版的配置也是大同小异，这里所说的模版便是每个 page 下的 html 模版文件，而模版文件的作用主要用于 webpack 中 `html-webpack-plugin` 插件的配置，其会根据模版文件生成一个编译后的 html 文件并自动加入携带 hash 的脚本和样式，基本配置如下：

```javascript
/* webpack 配置文件 */
const HtmlWebpackPlugin = require('html-webpack-plugin') // 安装并引用插件

module.exports = {
  // ...
  plugins: [
    new HtmlWebpackPlugin({
      title: 'My Page', // 生成 html 中的 title
      filename: 'demo.html', // 生成 html 的文件名
      template: 'xxx/xxx/demo.html', // 模版路径
      chunks: ['manifest', 'vendor', 'demo'], // 所要包含的模块
      inject: true, // 是否注入资源
    })
  ]
}
```

以上是单模版的配置，多模版只需继续往 plugins 数组中添加 `HtmlWebpackPlugin` 即可，但是为了和多入口一样能够灵活的获取 pages 目录下所有模版文件并进行配置，在 `utils.js` 中添加多模版的读取解析方法：

```javascript
/* utils.js */

const merge = require('webpack-merge')

// 多页面输出配置
// 与上面的多页面入口配置相同，读取 page 文件夹下的对应的 html 后缀文件，然后放入数组中
exports.htmlPlugin = configs => {
    let entryHtml = glob.sync(PAGE_PATH + '/*/*.html')
    let arr = []
    
    entryHtml.forEach(filePath => {
        let filename = filePath.substring(filePath.lastIndexOf('\/') + 1, filePath.lastIndexOf('.'))
        let conf = {
            template: filePath, // 模板路径
            filename: filename + '.html', // 生成 html 的文件名
            chunks: ['manifest', 'vendor', filename],
            inject: true,
        }
        
        // 如果有自定义配置可以进行 merge
        if (configs) {
            conf = merge(conf, configs)
        }
        
        // 针对生产环境配置
        if (process.env.NODE_ENV === 'production') {
            conf = merge(conf, {
                minify: {
                    removeComments: true, // 删除 html 中的注释代码
                    collapseWhitespace: true, // 删除 html 中的空白符
                    // removeAttributeQuotes: true // 删除 html 元素中属性的引号
                },
                chunksSortMode: 'manual' // 按 manual 的顺序引入
            })
        }
        
        arr.push(new HtmlWebpackPlugin(conf))
    })
    
    return arr
}
```

使用 glob 读取所有模版文件，然后将其遍历并设置每个模版的 config，同时针对一些自定义配置和生产环境的配置进行了 merge 处理。生产环境下 `minify` 配置的作用：**将 html-minifier 的选项作为对象来缩小输出**。

[html-minifier](https://github.com/kangax/html-minifier) 是一款用于缩小 html 文件大小的工具，其有很多配置项功能，包括上述所列举的常用的删除注释、空白、引号等。

当编写完多模版的方法后，在 `vue.config.js` 中进行配置，与多入口不同的是在 `configureWebpack` 中不能直接替换 `plugins` 的值，因为它还包含了其他插件

```javascript
/* vue.config.js */

const utils = require('./build/utils')

module.exports = {
  // ...

  configureWebpack: config => {
    config.entry = utils.getEntries() // 直接覆盖 entry 配置

    // 使用 return 一个对象会通过 webpack-merge 进行合并，plugins 不会置空
    return {
      plugins: [...utils.htmlPlugin()]
    }
  },
}
```
这时多页应用的多入口和多模版的配置就完成，运行命令 `yarn build` 后发现 dist 目录下生成了 3 个 html 文件，分别是 `index.html`、`page1.html` 和 `page2.html`

### 使用 pages 配置

在 `vue.config.js` 中有一个配置没有使用，便是 pages。pages 对象允许为应用配置多个入口及模版，这就为多页应用提供了开放的配置入口。官方示例代码如下：

```javascript
/* vue.config.js */
module.exports = {
  pages: {
    index: {
      // page 的入口
      entry: 'src/index/main.js',
      // 模板来源
      template: 'public/index.html',
      // 在 dist/index.html 的输出
      filename: 'index.html',
      // 当使用 title 选项时，
      // template 中的 title 标签需要是 <title><%= htmlWebpackPlugin.options.title %></title>
      title: 'Index Page',
      // 在这个页面中包含的块，默认情况下会包含
      // 提取出来的通用 chunk 和 vendor chunk。
      chunks: ['chunk-vendors', 'chunk-common', 'index']
    },
    // 当使用只有入口的字符串格式时，
    // 模板会被推导为 `public/subpage.html`
    // 并且如果找不到的话，就回退到 `public/index.html`。
    // 输出文件名会被推导为 `subpage.html`。
    subpage: 'src/subpage/main.js'
  }
}
```
pages 对象中的 key 就是入口的别名，而其 value 对象其实是入口 entry 和模版属性的合并，这样上述介绍的获取多入口和多模版的方法就可以合并成一个函数来进行多页的处理，合并后的 setPages 方法如下：

```javascript
// pages 多入口配置
exports.setPages = configs => {
  let entryFiles = glob.sync(PAGE_PATH + '/*/*.js')
  let map = {}

  entryFiles.forEach(filePath => {
    let filename = filePath.substring(filePath.lastIndexOf('\/') + 1, filePath.lastIndexOf('.'))
    let tmp = filePath.substring(0, filePath.lastIndexOf('\/'))

    let conf = {
      // page 的入口
      entry: filePath, 
      // 模板来源
      template: tmp + '.html', 
      // 在 dist/index.html 的输出
      filename: filename + '.html', 
      // 页面模板需要加对应的js脚本，如果不加这行则每个页面都会引入所有的js脚本
      chunks: ['manifest', 'vendor', filename], 
      inject: true,
    };

    if (configs) {
      conf = merge(conf, configs)
    }

    if (process.env.NODE_ENV === 'production') {
      conf = merge(conf, {
        minify: {
          removeComments: true, // 删除 html 中的注释代码
          collapseWhitespace: true, // 删除 html 中的空白符
          // removeAttributeQuotes: true // 删除 html 元素中属性的引号
        },
        chunksSortMode: 'manual' // 按 manual 的顺序引入
      })
    }

    map[filename] = conf
  })

  return map
}
```
上述代码返回的 map 对象就是 pages 所需要的配置项结构，只需在 vue.config.js 中引用即可：

```javascript
/* vue.config.js */
const utils = require('./build/utils')

module.exports = {
  // ...
  pages: utils.setPages(),
}
```

当你运行打包命令来查看输出结果的时候，和之前的方式相比并没有什么变化，这就说明这两种方式都适用于多页的构建，但是推荐大家使用更便捷的 pages 配置

本案例代码地址：[multi-page-project](https://github.com/luozhihao/vue-project-code/tree/master/multi-page-project)

## 多页路由与模版解析

### 路由配置

多页应用中的每个单页都是相互隔离的，如果想从 page1 下的路由跳到 page2 下的路由，无法使用 `vue-router` 中的方法进行跳转，需要使用原生方法：`location.href` 或 `location.replace`。

为了能够清晰的分辨路由属于哪个单页，需要给每个单页路由添加前缀：

* index 单页：`/vue/`
* page1 单页：`/vue/page1/`
* page2 单页：`/vue/page2/`

其中 `/vue/` 为项目的二级目录，其后的目录代表路由属于哪个单页。因此每个单页的路由配置可以像这样：

```javascript
/* page1 单页路由配置 */

import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)

let base = `${process.env.BASE_URL}` + 'page1'; // 添加单页前缀

export default new Router({
  mode: 'history',
  base: base,
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/home.vue')
    },
  ]
})
```

通过设置路由的 base 值来为每个单页添加路由前缀，如果是 `index` 单页无需拼接路由前缀，直接跳转至二级目录即可。在单页间跳转的地方，可以这样写：

```html
<template>
  <div id="app">
    <div id="nav">
      <a @click="goFn('')">Index</a> |
      <a @click="goFn('page1')">Page1</a> |
      <a @click="goFn('page2')">Page2</a> |
    </div>
    <router-view/>
  </div>
</template>

<script>
  export default {
    methods: {
      goFn(name) {
        location.href = `${process.env.BASE_URL}` + name
      }
    }
  }
</script>
```

但为保持和 Vue 路由跳转同样的风格，可以对单页之间的跳转做一下封装，实现一个 `Navigator` 类，封装完成后可以将跳转方法修改为：

```javascript
this.$openRouter({
  name: name, // 跳转地址
  query: {
    text: 'hello' // 可以进行参数传递
  },
})
```

使用上述 `$openRouter` 方法还需要一个前提条件，便是将其绑定到 Vue 的原型链上，在所有单页的入口文件中添加：

```javascript
import { Navigator } from '../../common' // 引入 Navigator

Vue.prototype.$openRouter = Navigator.openRouter; // 添加至 Vue 原型链
```

已经能够成功模仿 vue-router 进行单页间的跳转，但是需要注意的是因为其本质使用的是 location 跳转，所以必然会产生浏览器的刷新与重载

#### 重定向

当完成上述路由跳转的功能后，可以在本地服务器上来进行一下测试，会发现 Index 首页可以正常打开，但是跳转 Page1、Page2 却仍然处于 Index 父组件下，这是因为浏览器认为你所要跳转的页面还是在 Index 根路由下，同时又没有匹配到 Index 单页中对应的路由。这时候服务器需要做一次重定向，将下方路由指向对应的 html 文件即可：

```
/vue/page1 -> /vue/page1.html
/vue/page2 -> /vue/page2.html
```

在 `vue.config.js` 中需要对 devServer 进行配置，添加 `historyApiFallback` 配置项，该配置项主要用于解决 HTML5 History API 产生的问题，比如其 rewrites 选项用于重写路由：

```javascript
/* vue.config.js */

let baseUrl = '/vue/';

module.exports = {
  // ...

  devServer: {
    historyApiFallback: {
      rewrites: [
        { from: new RegExp(baseUrl + 'page1'), to: baseUrl + 'page1.html' },
        { from: new RegExp(baseUrl + 'page2'), to: baseUrl + 'page2.html' },
      ]
    }
  }
}
```

通过 rewrites 匹配正则表达式的方式将 `/vue/page1` 这样的路由替换为访问服务器下正确 html 文件的形式，如此不同单页间便可以进行正确跳转和访问了。最后需要注意的是如果你的应用发布到正式服务器上，同样需要让服务器或者中间层作出合理解析，参考：[HTML5 History 模式 # 后端配置例子](https://router.vuejs.org/zh/guide/essentials/history-mode.html#%E5%90%8E%E7%AB%AF%E9%85%8D%E7%BD%AE%E4%BE%8B%E5%AD%90)

而更多关于 historyApiFallback 的信息可以访问：[connect-history-api-fallback](https://github.com/bripkens/connect-history-api-fallback)

### 模版配置

在配置 html-webpack-plugin 的时候提到自定义配置，这里将结合模版渲染的功能来进行统一介绍。这里所说的模版渲染是在 html 模版文件中使用 `html-webpack-plugin` 提供的 [default template](https://github.com/jaketrent/html-webpack-template/blob/86f285d5c790a6c15263f5cc50fd666d51f974fd/index.html) 语法进行模版编写，比如：

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>模版</title>
    <% for (var chunk in htmlWebpackPlugin.files.css) { %>
        <% if(htmlWebpackPlugin.files.css[chunk]) {%>
            <link href="<%= htmlWebpackPlugin.files.css[chunk] %>" rel="stylesheet" />
        <%}%>
    <% } %>
  </head>
  <body>
    <div id="app"></div>
    <!-- built files will be auto injected -->

    <% for (var chunk in htmlWebpackPlugin.files.js) { %>
        <% if(htmlWebpackPlugin.files.js[chunk]) {%>
            <script type="text/javascript" src="<%= htmlWebpackPlugin.files.js[chunk] %>"></script>
        <%}%>
    <% } %>
  </body>
</html>
```

以上使用模版语法手动获取并遍历 htmlWebpackPlugin 打包后的文件并生成到模版中，其中的 `htmlWebpackPlugin` 变量是模版提供的可访问变量，其有以下特定数据：

```json
"htmlWebpackPlugin": {
  "files": {
    "css": [ "main.css" ],
    "js": [ "assets/head_bundle.js", "assets/main_bundle.js"],
    "chunks": {
      "head": {
        "entry": "assets/head_bundle.js",
        "css": [ "main.css" ]
      },
      "main": {
        "entry": "assets/main_bundle.js",
        "css": []
      },
    }
  }
}
```

通过 `htmlWebpackPlugin.files` 可以获取打包输出的 js 及 css 文件路径，包括入口文件路径等。需要注意的是如果在模版中编写了插入对应 js 及 css 的语法，你需要设置 `inject` 的值为 false 来关闭资源的自动注入：

```javascript
/* utils.js */

let conf = {
    entry: filePath, // page 的入口
    template: filePath, // 模板路径
    filename: filename + '.html', // 生成 html 的文件名
    chunks: ['manifest', 'vendor', filename],
    inject: false, // 关闭资源自动注入
}

// ... 其余配置
```

否则在页面会引入两次资源

#### 自定义配置

在模版渲染中，只能够使用 htmlWebpackPlugin 内部的一些属性和方法来进行模版的定制化开发。那么如果遇到需要根据不同环境来引入不同资源，同时不同模版间的配置还可能不一样的需求情况的话，使用自定义配置会比较方便。比如在生产环境模版中引入第三方统计脚本：

```javascript
/* vue.config.js */

module.exports = {
  // ...
  pages: utils.setPages({
    addScript() {
      if (process.env.NODE_ENV === 'production') {
        return `<script src="https://s95.cnzz.com/z_stat.php?id=xxx&web_id=xxx" language="JavaScript"></script>`
      }

      return ''
    }
  }),
}
```

然后在页面模版中通过 `htmlWebpackPlugin.options` 获取自定义配置对象并进行输出：

```html
<% if(htmlWebpackPlugin.options.addScript){ %>
    <%= htmlWebpackPlugin.options.addScript() %>
<%}%>
```

同时也可以针对个别模版进行配置，比如只想在 Index 单页中添加统计脚本，在 Page1 单页中添加其他脚本，那么你可以给 addScript 传入标识符来进行判断输出，比如：

```html
<% if(htmlWebpackPlugin.options.addScript){ %>
    <%= htmlWebpackPlugin.options.addScript('index') %>
<%}%>
```

同时为 addScript 方法添加参数 from：

```javascript
addScript(from) {
  if (process.env.NODE_ENV === 'production') {
    let url = "https://xxx";

    if (from === 'index') {
      url = "https://s95.cnzz.com/z_stat.php?id=xxx&web_id=xxx";
    }

    return `<script src=${url} language="JavaScript"></script>`
  }
  return ''
}
```

本案例代码地址：[multi-page-project](https://github.com/luozhihao/vue-project-code/tree/master/multi-page-project)

