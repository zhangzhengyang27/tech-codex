---
title: "Vue CLI 项目构建"
category: Vue

---

# Vue CLI 项目构建

需要在本地安装 `Node` 环境以及包管理工具 `npm`，打开终端运行：

```shell
# 查看 node 版本
node -v

# 查看 npm 版本
npm -v
```
## 脚手架

在终端全局安装 `@vue/cli`：

```bash
npm install -g @vue/cli
# OR
yarn global add @vue/cli

# 升级
npm update -g @vue/cli

# 查看版本
vue --version
```

创建项目，这里使用到的版本是 vue2，使用 `Babel`、`Router`、`Vuex`、`CSS Pre-processors` 就足够。

```shell
# my-project 是项目名称
vue create my-project

# 打开项目目录
cd my-project

npm run serve
```

> 需要注意的是如果启动的时候出现报错或者包丢失等情况，最好将 node 或者 yarn 的版本更新到最新重新构建
>

最后脚手架生成的目录结构如下：

```bash
├── node_modules     # 项目依赖包目录
├── public
│   ├── favicon.ico  # ico图标
│   └── index.html   # 首页模板
├── src 
│   ├── assets       # 样式图片目录
│   ├── components   # 组件目录
│   ├── views        # 页面目录
│   ├── App.vue      # 根组件
│   ├── main.js      # 入口文件
│   ├── router.js    # 路由配置文件
│   └── store.js     # vuex状态管理文件
├── .gitignore       # git忽略文件
├── .postcssrc.js    # postcss配置文件
├── babel.config.js  # babel配置文件
├── package.json     # 包管理文件
```

根据安装时选择的依赖不同，最后生成的目录结构也会有所差异

### vue ui 可视化界面

除使用命令行构建外，`vue-cli` 还提供可视化的操作界面，在项目目录运行如下命令开启图形化界面：

```shell
vue ui
```

如果还没有任何项目，可以点击创建或者直接导入现有的项目。创建项目和使用命令行的步骤基本相同，完全可视化操作，一定程度上降低了构建和使用的难度。项目创建或导入成功后，便可以进入项目进行可视化管理

在整个管理界面中，可以为项目安装 CLI 提供的插件，比如安装 `@vue/cli-plugin-babel` 插件，同时也可以配置相应插件的配置项，进行代码的编译、热更新、检查等

### vue add

`vue-cli` 还提供专属的 `vue add` 命令，但是需要注意的是该命令安装的包是以 `@vue/cli-plugin` 或者 `vue-cli-plugin` 开头，即只能安装 Vue 集成的包

```bash
# 运行命令
vue add jquery
```

其会安装 `vue-cli-plugin-jquery`，很显然这个插件不存在便会安装失败。又或者你运行：

```bash
vue add @vue/eslint
```

其会解析为完整的包名 `@vue/cli-plugin-eslint`，因为该包存在所以会安装成功。

不同于 npm 或 yarn 的安装， `vue add` 不仅会将包安装到你的项目中，其还会改变项目的代码或文件结构，所以安装前最好提交代码至仓库。

另外 vue add 中还有两个特例：

```bash
# 安装 vue-router
vue add router

# 安装 vuex
vue add vuex
```

这两个命令会直接安装 vue-router 和 vuex 并改变你的代码结构，使你的项目集成这两个配置，并不会去安装添加 `vue-cli-plugin` 或 `@vue/cli-plugin` 前缀的包

## 包管理工具与配置项

### package.json

`package.json` 文件便是包管理文件

```json
{
  "name": "my-project", 
  "version": "0.1.0", 
  "private": true, 
  "scripts": {
    "serve": "vue-cli-service serve",
    "build": "vue-cli-service build",
    "lint": "vue-cli-service lint"
  },
  "dependencies": {
    "vue": "^2.5.16",
    "vue-router": "^3.0.1",
    "vuex": "^3.0.1"
  },
  "devDependencies": {
    "@vue/cli-plugin-babel": "^3.0.0-beta.15",
    "@vue/cli-service": "^3.0.0-beta.15",
    "less": "^3.0.4",
    "less-loader": "^4.1.0",
    "vue-template-compiler": "^2.5.16"
  },
  "browserslist": [
    "> 1%",
    "last 2 versions",
    "not ie <= 8"
  ]
}
```

而 `dependencies` 和 `devDependencies` 分别为项目生产环境和开发环境的依赖包配置，也就是说像 `@vue/cli-service` 这样只用于项目开发时的包可以放在 `devDependencies` 下，但像 `vue-router` 这样结合在项目上线代码中的包应该放在 dependencies

详细的 package.json文件配置项介绍可以参考：[package.json](https://docs.npmjs.com/files/package.json)

### browserslist 配置

browserslist 配置项主要作用是用于在不同的前端工具之间共享目标浏览器和 Node.js 的版本：

```json
"browserslist": [
    "> 1%", // 表示包含所有使用率 > 1% 的浏览器
    "last 2 versions", // 表示包含浏览器最新的两个版本
    "not ie <= 8" // 表示不包含 ie8 及以下版本
]
```

比如像 [autoprefixer](https://www.npmjs.com/package/autoprefixer) 这样的插件需要把你写的 css 样式适配不同的浏览器，那么这里要针对哪些浏览器，就是上面配置中所包含的。

而如果写在 `autoprefixer` 的配置中，那么会存在一个问题，万一其他第三方插件也需要浏览器的包含范围用于实现其特定的功能，那么就又得在其配置中设置一遍，这样就无法得以共用。所以在 package.json 中配置 browserslist 的属性使得所有工具都会自动找到目标浏览器

当然也可以单独写在  `.browserslistrc`  的文件中：

```bash
# Browsers that we support 

> 1%
last 2 versions
not ie <= 8
```

至于它是如何去衡量浏览器的使用率和版本的，数据都是来源于 [Can I Use](https://caniuse.com/)。可以访问 [http://browserl.ist/](http://browserl.ist/) 去搜索配置项所包含的浏览器列表，比如搜索 `last 2 versions` 会得到你想要的结果，或者在项目终端运行如下命令查看：

```bash
npx browserslist
```

## vue.config.js 配置

如果使用过 `vue-cli 2.x`，其构建出的目录会包含相应的 webpack 配置文件，但是在 `vue-cli` 较高版本中没有关于 webpack 的配置文件。即无需配置 webpack 就可以运行项目，并且它提供 `vue.config.js` 文件来满足开发者对其封装的 webpack 默认配置的修改

### publicPath

vue-cli 成功构建并在浏览器中打开 `http://localhost:8080/` 展示了项目首页。如果现在想要将项目地址加一个二级目录，比如：`http://localhost:8080/vue/`，需要在 `vue.config.js` 里配置 `publicPath` 这项：

这个值在开发环境下同样生效。如果想把开发服务器架设在根路径，你可以使用一个条件式的值：

```javascript
// vue.config.js
module.exports = {
  publicPath: process.env.NODE_ENV === 'production'? '/production-sub-path/': '/'
}
```

### outputDir

如果想将构建好的文件打包输出到 output 文件夹下（默认是 dist 文件夹），你可以配置：

```javascript
// vue.config.js
module.exports = {
  // 文件打包输出路径
  outputDir: 'output',
}
```

> 当运行 `vue-cli-service build` 时生成的生产环境构建文件的目录。注意目标目录的内容在构建之前会被清除 (构建时传入 `--no-clean` 可关闭该行为)
>

### productionSourceMap

该配置项用于设置是否为生产环境构建生成 `source map`，一般在生产环境下为了快速定位错误信息，都会开启 source map：

```javascript
// vue.config.js
module.exports = {
  productionSourceMap: true,
}
```

该配置会修改 webpack 中 `devtool` 项的值为 `source-map`。开启 `source map` 后，打包输出的文件中会包含 js 对应的 `.map` 文件

### chainWebpack

chainWebpack 配置项允许更细粒度的控制 webpack 的内部配置，其集成的是 [webpack-chain](https://github.com/mozilla-neutrino/webpack-chain) 这一插件，该插件能够使用链式操作来修改配置，比如：

```javascript
// 用于做相应的合并处理
const merge = require('webpack-merge');

module.exports = {

    // config 参数为已经解析好的 webpack 配置
    chainWebpack: config => {
        config.module
            .rule('images')
            .use('url-loader')
            .tap(options =>
                merge(options, {
                  limit: 5120,
                })
             )
    } 
}
```

以上操作可以成功修改 webpack 中 module 项里配置 rules 规则为图片下的 url-loader 值，将其 limit 限制改为 5KB（5120 字节），修改后的 webpack 配置代码如下：

```javascript
{
  module: {
    rules: [
      {   
        /* config.module.rule('images') */
        test: /\.(png|jpe?g|gif|webp)(\?.*)?$/,
        use: [
          /* config.module.rule('images').use('url-loader') */
          {
            loader: 'url-loader',
            options: {
              limit: 5120,
              name: 'img/[name].[hash:8].[ext]'
            }
          }
        ]
      }
    ]
  }
}
```

### configureWebpack

除了上述使用 chainWebpack 来改变 webpack 内部配置外，还可以使用 configureWebpack 来进行修改，两者的不同点在于 chainWebpack 是链式修改，而 configureWebpack 更倾向于整体替换和修改。示例代码如下：

```javascript
// vue.config.js
module.exports = {

  // config 参数为已经解析好的 webpack 配置
  configureWebpack: config => {
    // config.plugins = []; // 这样会直接将 plugins 置空

    // 使用 return 一个对象会通过 webpack-merge 进行合并，plugins 不会置空
    return {
      plugins: []
    }
  }
}
```

configureWebpack 可以直接是一个对象，也可以是一个函数，如果是对象它会直接使用 webpack-merge 对其进行合并处理，如果是函数，你可以直接使用其 config 参数来修改 webpack 中的配置，或者返回一个对象来进行 merge 处理。

在项目目录下运行 `vue inspect` 来查看你修改后的 webpack 完整配置，当然你也可以缩小审查范围，比如：

```bash
# 只查看 plugins 的内容
vue inspect plugins
```

### devServer

`vue.config.js` 还提供 devServer 项用于配置 `webpack-dev-server` 的行为，使得可以对本地服务器进行相应配置，在命令行中运行的 `yarn serve` 对应的命令 `vue-cli-service serve` 其实便是基于 webpack-dev-server 开启的一个本地服务器，其常用配置参数如下：

```javascript
// vue.config.js
module.exports = {

  devServer: {
    open: true, // 是否自动打开浏览器页面
    host: '0.0.0.0', // 指定使用一个 host。默认是 localhost
    port: 8080, // 端口地址
    https: false, // 使用 https 提供服务
    proxy: null, // string | Object 代理设置

    // 提供在服务器内部的其他中间件之前执行自定义中间件的能力
    before: app => {
      // app 是一个 express 实例
    }
  }
}
```

当然除了以上参数，其支持所有的 `webpack-dev-server` 中的选项，比如 `historyApiFallback` 用于重写路由、`progress` 将运行进度输出到控制台等，具体可参考：[devServer](https://www.webpackjs.com/configuration/dev-server/)

以上讲解了 vue.config.js 中一些常用的配置项功能，具体的配置实现需要结合实际项目进行，完整的配置项可以查看：[vue.config.js](https://github.com/vuejs/vue-cli/blob/ce3e2d475d63895cbb40f62425bb6b3237469bcd/docs/zh/config/README.md)

### 默认插件简介

通过对 vue.config.js 的了解，知道 vue-cli 默认封装了项目运行的常用 webpack 配置。想查看 vue-cli 提供哪些默认插件，每一个 plugin 又有着怎样的用途。除了使用 `vue inspect plugins` 还可以通过运行 `vue ui` 进入可视化页面查看，步骤如下：

*   打开可视化页面，点击对应项目进入管理页面（如果没有对应项目，需要导入或新建）
*   点击侧边栏 Tasks 选项，再点击二级栏 inspect 选项
*   点击 Run task 按钮执行审查命令

最后从输出的内容中找到 plugins 数组，其包含了如下插件（配置项已经省略，增加了定义插件的代码）：

```javascript
// vue-loader是 webpack 的加载器，允许你以单文件组件的格式编写 Vue 组件
const VueLoaderPlugin = require('vue-loader/lib/plugin');

// webpack 内置插件，用于创建在编译时可以配置的全局常量
const { DefinePlugin } = require('webpack');

// 用于强制所有模块的完整路径必需与磁盘上实际路径的确切大小写相匹配
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

// 识别某些类型的 webpack 错误并整理，以提供开发人员更好的体验。
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');

// 将 CSS 提取到单独的文件中，为每个包含 CSS 的 JS 文件创建一个 CSS 文件
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

// 用于在 webpack 构建期间优化、最小化 CSS文件
const OptimizeCssnanoPlugin = require('optimize-css-assets-webpack-plugin');

// webpack 内置插件，用于根据模块的相对路径生成 hash 作为模块 id, 一般用于生产环境
const { HashedModuleIdsPlugin } = require('webpack');

// 用于根据模板或使用加载器生成 HTML 文件
const HtmlWebpackPlugin = require('html-webpack-plugin');

// 用于在使用 html-webpack-plugin 生成的 html 中添加 <link rel ='preload'> 或 <link rel ='prefetch'>，有助于异步加载
const PreloadPlugin = require('preload-webpack-plugin');

// 用于将单个文件或整个目录复制到构建目录
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
    plugins: [
        /* config.plugin('vue-loader') */
        new VueLoaderPlugin(), 
        
        /* config.plugin('define') */
        new DefinePlugin(),
        
        /* config.plugin('case-sensitive-paths') */
        new CaseSensitivePathsPlugin(),
        
        /* config.plugin('friendly-errors') */
        new FriendlyErrorsWebpackPlugin(),
        
        /* config.plugin('extract-css') */
        new MiniCssExtractPlugin(),
        
        /* config.plugin('optimize-css') */
        new OptimizeCssnanoPlugin(),
        
        /* config.plugin('hash-module-ids') */
        new HashedModuleIdsPlugin(),
        
        /* config.plugin('html') */
        new HtmlWebpackPlugin(),
        
        /* config.plugin('preload') */
        new PreloadPlugin(),
        
        /* config.plugin('copy') */
        new CopyWebpackPlugin()
    ]
}
```

可以看到每个插件上方都添加了使用 chainWebpack 访问的方式，同时也添加了每个插件相应的用途注释，需要注意的是要区分 webpack 内置插件和第三方插件的区别，如果是内置插件则无需安装下载，而外部插件大家可以直接访问：[https://www.npmjs.com/](https://www.npmjs.com/) 搜索对应的插件，了解其详细的 api 设置

## env 文件与环境设置

一般一个项目都会有以下 3 种环境：

*   开发环境（开发阶段，本地开发版本，一般会使用一些调试工具或额外的辅助功能）
*   测试环境（测试阶段，上线前版本，除了一些 bug 的修复，基本不会和上线版本有很大差别）
*   生产环境（上线阶段，正式对外发布的版本，一般会进行优化，关掉错误报告）

需要针对每一种环境编写一些不同的代码并且保证这些代码运行在正确的环境中，那么应该如何在代码中判断项目所处的环境同时执行不同的代码

### 配置文件

正确的配置环境首先需要认识不同环境配置之间的关系，在根目录下创建以下形式的文件进行不同环境下变量的配置：

```bash
.env                # 在所有的环境中被载入
.env.local          # 在所有的环境中被载入，但会被 git 忽略
.env.[mode]         # 只在指定的模式中被载入
.env.[mode].local   # 只在指定的模式中被载入，但会被 git 忽略
```

比如创建一个名为 `.env.stage` 的文件，该文件表明其只在 stage 环境下被加载，在这个文件中可以配置如下键值对的变量：

```bash
NODE_ENV=stage
VUE_APP_TITLE=stage mode
```

在 vue.config.js 中使用 `process.env.[name]` 访问这些变量：

```javascript
// vue.config.js
console.log(process.env.NODE_ENV); // development（在终端输出）
```

当运行 `yarn serve` 命令后会发现输出的是 `development`，因为 `vue-cli-service serve` 命令默认设置的环境是 `development`，需要修改 `package.json` 中的 `serve` 脚本的命令为：

```javascript
"scripts": {
    "serve": "vue-cli-service serve --mode stage",
}
```

读取对应 `.env.[mode]` 文件下的配置，如果没找到对应配置文件，其会使用默认环境 `development`，同样 `vue-cli-service build` 会使用默认环境 `production`

这时候如果再创建一个 `.env`  的文件，再次配置重复的变量，但是值不同，如：

```bash
NODE_ENV=staging
VUE_APP_TITLE=staging mode
VUE_APP_NAME=project
```

因为 `.env`  文件会被所有环境加载，即公共配置，那么最终运行 `vue-cli-service serve` 打印出来的是 **stage**，但是如果是 `.env.stage.local` 文件中配置成上方这样，打印出来的便是 **staging**，所以 `.env.[mode].local` 会覆盖 `.env.[mode]` 下的相同配置。同理 `.env.local` 会覆盖 `.env` 下的相同配置

由此可以得出结论，相同配置项的权重：

```bash
.env.[mode].local > .env.[mode] > .env.local > .env 
```

但是需要注意的是，除了相同配置项权重大的覆盖小的，不同配置项它们会进行合并操作，类似于 Javascript 中的 `Object.assign`  的用法

### 环境注入

需要注意的是在 Vue 的前端代码中打印出的 `process.env` 与 `vue.config.js` 中输出的可能是不一样的，这需要普及一个知识点：webpack 通过 DefinePlugin 内置插件将 `process.env` 注入到客户端代码中。

```javascript
// webpack 配置
{
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV)
      }
    }),
  ],
}
```

由于 vue-cli 封装的 webpack 配置中已经完成了这个功能，所以可以直接在客户端代码中打印出 `process.env` 的值，该对象可以包含多个键值对，也就是说可以注入多个值。

但经过 CLI 封装后仅支持注入环境配置文件中以 `VUE_APP_` 开头的变量，而 `NODE_ENV` 和 `BASE_URL` 这两个特殊变量除外。比如在权重最高的 `.env.stage.local` 文件中写入：

```bash
NODE_ENV=stage2
VUE_APP_TITLE=stage mode2
NAME=vue
```

然后尝试在 vue.config.js 中打印 `process.env`，终端输出：

```bash
{
    ...
    
    npm_config_ignore_scripts: '',
    npm_config_version_git_sign: '',
    npm_config_ignore_optional: '',
    npm_config_init_version: '1.0.0',
    npm_package_dependencies_vue_router: '^3.0.1',
    npm_config_version_tag_prefix: 'v',
    npm_node_execpath: '/usr/local/bin/node',
    NODE_ENV: 'stage2',
    VUE_APP_TITLE: 'stage mode2',
    NAME: 'vue',
    BABEL_ENV: 'development',
    
    ...
}
```

可以看到输出内容除了环境配置中的变量外还包含了很多 npm 的信息，但是在入口文件 main.js 中打印会发现输出：

```
{
    "BASE_URL": "/vue/",
    "NODE_ENV": "stage2",
    "VUE_APP_TITLE": "stage mode2"
}
```

可见注入时过滤掉了非 `VUE_APP_` 开头的变量，其中多出的 `BASE_URL` 为你在 vue.config.js 设置的值，默认为 `/`，其在环境配置文件中设置无效

### 额外配置

通过新建配置文件的方式为项目不同环境配置不同的变量值，能够实现项目基本的环境管理，但是 `.env`  这样的配置文件中的参数目前只支持静态值，无法使用动态参数，在某些情况下无法实现特定需求，这时可以在根目录下新建 `config` 文件夹用于存放一些额外的配置文件

```javascript
/* 配置文件 index.js */

// 公共变量
const com = {
  IP: JSON.stringify('xxx')
};

module.exports = {
  // 开发环境变量
  dev: {
    env: {
      TYPE: JSON.stringify('dev'),
      ...com
    }
  },

  // 生产环境变量
  build: {
    env: {
      TYPE: JSON.stringify('prod'),
      ...com
    }
  }
}

```

上方代码把环境变量分为了公共变量、开发环境变量和生产环境变量，当然这些变量可能是动态的，比如用户的 ip 等。现在要在 `vue.config.js` 里注入这些变量，可以使用 chainWebpack 修改 DefinePlugin 中的值：

```javascript
/* vue.config.js */
const configs = require('./config');

// 用于做相应的 merge 处理
const merge = require('webpack-merge');

// 根据环境判断使用哪份配置
const cfg = process.env.NODE_ENV === 'production' ? configs.build.env : configs.dev.env;

module.exports = {
  // ...
  chainWebpack: config => {
    config.plugin('define')
      .tap(args => {
      let name = 'process.env';

      // 使用 merge 保证原始值不变
      args[0][name] = merge(args[0][name], cfg);

      return args
    })
  },
  // ...
}
```

最后可以在客户端成功打印出包含动态配置的对象：

```javascript
{
    "NODE_ENV": "stage2",
    "VUE_APP_TITLE": "stage mode2",
    "BASE_URL": "/vue/",
    "TYPE": "dev",
    "IP": "xxx"
}
```

### 实际场景

结合以上环境变量的配置，项目中一般会遇到一些实际场景： 比如在非线上环境可以给自己的移动端项目开启 [vConsole](https://github.com/Tencent/vConsole) 调试，但是在线上环境肯定不需要开启这一功能，可以在入口文件中进行设置，代码如下：

```javascript
/* main.js */
import Vue from 'vue'
import App from './App.vue'
import router from './router'
import store from './store'

Vue.config.productionTip = false

// 如果是非线上环境，加载 VConsole
if (process.env.NODE_ENV !== 'production') {
    var VConsole = require('vconsole/dist/vconsole.min.js');
    var vConsole = new VConsole();
}

new Vue({
  router,
  store,
  render: h => h(App)
}).$mount('#app')
```

另外还可以使用配置中的 BASE\_URL 来设置路由的 base 参数：

```javascript
/* router.js */

import Vue from 'vue'
import Router from 'vue-router'
import Home from './views/Home.vue'
import About from './views/About.vue'

Vue.use(Router)

// 获取二级目录
let base = `${process.env.BASE_URL}`; 

export default new Router({
  mode: 'history',
  base: base, // 设置 base 值
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/about',
      name: 'about',
      component: About
    }
  ]
})

```

每一个环境变量都可以用于项目的一些地方，它提供给一种全局的可访问形式，也是基于 Node 开发的特性所在
