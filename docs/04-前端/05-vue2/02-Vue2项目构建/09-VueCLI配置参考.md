---
title: Vue CLI 配置参考
description: Vue CLI 完整配置速查：vue.config.js 全选项、CLI 服务命令、模式与环境变量、构建目标与部署
keywords: [Vue CLI, vue.config.js, 环境变量, 构建目标, webpack 配置, 部署]
category: Vue
tags: [Vue, 工程化, Vue CLI, webpack]
---

# Vue CLI 配置参考

本篇是 Vue CLI 的**配置速查手册**，覆盖 `vue.config.js` 全部选项、`vue-cli-service` 命令签名、模式与环境变量机制、构建目标与部署要点。

实战搭建流程请见 [Vue CLI 项目构建基础](01-Vue%20CLI项目构建基础.md)，多页应用见 [使用 pages 构建多页应用](03-使用%20pages%20构建多页应用.md)。

> **维护状态提醒**：Vue CLI 目前处于**维护模式**。新项目官方推荐使用 [create-vue](https://github.com/vuejs/create-vue)（基于 [Vite](https://vitejs.dev/)），详见 [Vue 3 工具链指南](https://cn.vuejs.org/guide/scaling-up/tooling.html)。本篇适用于维护存量 Vue CLI 项目。

## 体系构成

Vue CLI 由三个独立部分组成：

| 部分 | 包名 | 说明 |
| --- | --- | --- |
| CLI | `@vue/cli` | 全局安装，提供 `vue create` / `vue serve` / `vue ui` 命令 |
| CLI 服务 | `@vue/cli-service` | 局部安装于每个项目，构建于 webpack 与 webpack-dev-server 之上，提供 `serve` / `build` / `inspect` |
| CLI 插件 | `@vue/cli-plugin-*`（内建）<br>`vue-cli-plugin-*`（社区） | 提供 Babel/TypeScript 转译、ESLint 集成、单元测试等可选能力 |

运行 `vue-cli-service` 时会自动解析并加载 `package.json` 中列出的所有 CLI 插件。

### 安装与升级

```bash
# 安装
npm install -g @vue/cli

# 升级全局 CLI
npm update -g @vue/cli

# 升级项目内的 CLI 插件
vue upgrade [plugin-name] [--all] [--next]
```

### 拉取 2.x 模板（旧版本）

Vue CLI >= 3 与旧版使用相同的 `vue` 命令，`vue-cli@2.x` 被覆盖。仍需 `vue init` 时安装桥接工具：

```bash
npm install -g @vue/cli-init
vue init webpack my-project
```

## vue.config.js

项目根目录（与 `package.json` 同级）下的可选配置文件，会被 `@vue/cli-service` 自动加载。推荐用 `defineConfig` 帮手函数获得类型提示：

```javascript
// vue.config.js
const { defineConfig } = require('@vue/cli-service')

module.exports = defineConfig({
  // 选项...
})
```

### 基础路径与输出

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `publicPath` | `string` | `'/'` | 部署应用包时的基本 URL。**始终使用本项而非 webpack 的 `output.publicPath`** |
| `outputDir` | `string` | `'dist'` | 生产构建输出目录，构建前会被清除（`--no-clean` 可关闭）。**勿改 webpack `output.path`** |
| `assetsDir` | `string` | `''` | 静态资源（js/css/img/fonts）相对 `outputDir` 的目录 |
| `indexPath` | `string` | `'index.html'` | 生成的 `index.html` 输出路径（相对 `outputDir`），也可为绝对路径 |
| `filenameHashing` | `boolean` | `true` | 文件名是否包含 hash。要求 index HTML 由 Vue CLI 自动生成 |

> `baseUrl` 自 Vue CLI 3.3 起已弃用，请使用 `publicPath`。

**相对 publicPath 的限制**：设为 `''` 或 `'./'` 时所有资源链接为相对路径，可部署到任意路径。但以下场景应避免：

- 使用基于 HTML5 `history.pushState` 的路由时
- 使用 `pages` 选项构建多页面应用时

该值在开发环境同样生效，可用条件式写法：

```javascript
module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? '/production-sub-path/' : '/'
}
```

### pages（多页应用）

- 类型：`Object`，默认 `undefined`

每个 page 对应一个 JS 入口。value 可以是对象（`entry` 必填，`template`/`filename`/`title`/`chunks` 可选）或直接是入口字符串：

```javascript
module.exports = {
  pages: {
    index: {
      entry: 'src/index/main.js',
      template: 'public/index.html',
      filename: 'index.html',
      // 使用 title 选项时，template 中需写
      // <title><%= htmlWebpackPlugin.options.title %></title>
      title: 'Index Page',
      chunks: ['chunk-vendors', 'chunk-common', 'index']
    },
    // 字符串格式：模板推导为 public/subpage.html（找不到则回退 public/index.html）
    // 输出文件名推导为 subpage.html
    subpage: 'src/subpage/main.js'
  }
}
```

> 多页模式下 webpack 配置会包含多个 `html-webpack-plugin` 和 `preload-webpack-plugin` 实例，修改这些插件选项前先运行 `vue inspect` 确认。

### lintOnSave

- 类型：`boolean | 'warning' | 'default' | 'error'`，默认 `'default'`
- 需安装 `@vue/cli-plugin-eslint` 后生效

| 值 | 行为 |
| --- | --- |
| `true` / `'warning'` | lint 错误输出为**编译警告**，仅打印到命令行，不导致编译失败 |
| `'default'` | lint 错误输出为**编译错误**，会在浏览器中显示且导致编译失败 |
| `'error'` | 连 lint **警告**也输出为编译错误，同样导致编译失败 |

让浏览器 overlay 同时显示警告和错误（Vue CLI 5 / webpack-dev-server 4 中改为 `devServer.client.overlay`）：

```javascript
module.exports = {
  devServer: {
    overlay: { warnings: true, errors: true }
  }
}
```

`lintOnSave` 为 truthy 时开发和生产构建都会启用 `eslint-loader`。仅在开发时启用：

```javascript
module.exports = {
  lintOnSave: process.env.NODE_ENV !== 'production'
}
```

### 编译与产物

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `runtimeCompiler` | `boolean` | `false` | 是否使用含运行时编译器的 Vue 构建版本，开启后可用 `template` 选项，增加约 10kb |
| `transpileDependencies` | `boolean \| Array<string \| RegExp>` | `false` | `babel-loader` 默认忽略 `node_modules`。传数组可只转译特定依赖，避免全量转译拖慢构建 |
| `productionSourceMap` | `boolean` | `true` | 设为 `false` 可加速生产构建 |
| `parallel` | `boolean` | CPU 核数 > 1 | 是否为 Babel/TypeScript 启用 `thread-loader`，仅作用于生产构建 |
| `crossorigin` | `string` | `undefined` | 设置生成的 `<link>` / `<script>` 的 `crossorigin` 属性 |
| `integrity` | `boolean` | `false` | 启用 SRI（Subresource Integrity）。启用后 preload resource hints 会被禁用 |

> `crossorigin` 与 `integrity` 仅影响 `html-webpack-plugin` 在构建时注入的标签，直接写在 `public/index.html` 中的标签不受影响。

### webpack 配置

**configureWebpack**（`Object | Function`）：对象会通过 [webpack-merge](https://github.com/survivejs/webpack-merge) 合并入最终配置；函数接收已解析的配置，可直接修改或返回待合并对象。

```javascript
module.exports = {
  configureWebpack: config => {
    if (process.env.NODE_ENV === 'production') {
      // 为生产环境修改配置...
    }
  }
}
```

**chainWebpack**（`Function`）：接收基于 [webpack-chain](https://github.com/neutrinojs/webpack-chain) 的 `ChainableConfig` 实例，可对内部配置做细粒度修改。

```javascript
module.exports = {
  chainWebpack: config => {
    // 修改 loader 选项
    config.module.rule('vue').use('vue-loader').tap(options => options)

    // 添加新 loader
    config.module
      .rule('graphql')
      .test(/\.graphql$/)
      .use('graphql-tag/loader')
      .loader('graphql-tag/loader')
      .end()

    // 替换规则里的 loader（必须先 clear，否则会追加）
    const svgRule = config.module.rule('svg')
    svgRule.uses.clear()
    svgRule.use('vue-svg-loader').loader('vue-svg-loader')

    // 修改插件选项
    config.plugin('html').tap(args => {
      args[0].template = 'app/templates/index.html'
      return args
    })
  }
}
```

> 有些 webpack 选项基于 `vue.config.js` 的值设置，不能直接修改：应改 `outputDir` 而非 `output.path`，改 `publicPath` 而非 `output.publicPath`。

### CSS 相关

| 选项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `css.requireModuleExtension` | `boolean` | `true` | 为 `false` 时所有 `*.(css\|scss\|sass\|less\|styl(us)?)` 都视为 CSS Modules |
| `css.extract` | `boolean \| Object` | 生产 `true` / 开发 `false` | 是否提取 CSS 到独立文件。开发环境默认关闭（与 CSS 热重载不兼容） |
| `css.sourceMap` | `boolean` | `false` | 开启会影响构建性能 |
| `css.loaderOptions` | `Object` | `{}` | 向 CSS 相关 loader 传递选项 |

> `css.modules` 自 v4 起已弃用，请用 `css.requireModuleExtension`（v3 中两者含义相反）。
>
> 如果在 `css.loaderOptions.css` 里配置了自定义 CSS Module 选项，则 `css.requireModuleExtension` 必须显式指定为 `true` 或 `false`。

`loaderOptions` 支持 css-loader、postcss-loader、sass-loader、less-loader、stylus-loader。另可用 `scss` 键单独配置 scss 语法（区别于 `sass` 语法）：

```javascript
module.exports = {
  css: {
    loaderOptions: {
      sass: {
        // sass 语法要求语句结尾无分号
        additionalData: `@import "~@/variables.sass"`
      },
      scss: {
        // scss 语法要求语句结尾有分号
        additionalData: `@import "~@/variables.scss";`
      },
      less: {
        globalVars: { primary: '#fff' }
      }
    }
  }
}
```

> 比用 `chainWebpack` 手动指定 loader 更推荐，因为这些选项需应用在使用了相应 loader 的多个地方。

自定义 CSS Modules 类名：

```javascript
module.exports = {
  css: {
    loaderOptions: {
      css: {
        modules: { localIdentName: '[name]-[hash]' },
        localsConvention: 'camelCaseOnly'
      }
    }
  }
}
```

### devServer

- 类型：`Object`，支持[所有 webpack-dev-server 选项](https://webpack.js.org/configuration/dev-server/)

注意：`host`、`port`、`https` 可能被命令行参数覆写；`publicPath` 和 `historyApiFallback` 不应修改，它们需与开发服务器的 `publicPath` 同步。

**devServer.proxy**（`string | Object`）解决开发环境跨域：

```javascript
module.exports = {
  devServer: {
    // 简单形式：所有未匹配静态文件的请求都代理过去
    proxy: 'http://localhost:4000'
  }
}

// 精细控制，完整选项见 http-proxy-middleware
module.exports = {
  devServer: {
    proxy: {
      '/api': { target: '<url>', ws: true, changeOrigin: true },
      '/foo': { target: '<other_url>' }
    }
  }
}
```

### 其他

- `pwa`（`Object`）：向 [PWA 插件](https://github.com/vuejs/vue-cli/tree/dev/packages/@vue/cli-plugin-pwa)传递选项
- `pluginOptions`（`Object`）：不做 schema 验证，用于传递任意第三方插件选项，插件通过 `options.pluginOptions.foo` 访问

## CLI 服务命令

`@vue/cli-service` 安装了 `vue-cli-service` 命令，可在 npm scripts 中直接使用，或通过 `npx vue-cli-service` 调用。

### vue-cli-service serve

```bash
用法：vue-cli-service serve [options] [entry]

选项：
  --open    在服务器启动时打开浏览器
  --copy    在服务器启动时将 URL 复制到剪切板
  --mode    指定环境模式 (默认值：development)
  --host    指定 host (默认值：0.0.0.0)
  --port    指定 port (默认值：8080)
  --https   使用 https (默认值：false)
```

`[entry]` 会被指定为**唯一入口**（默认 `src/main.js`，TS 项目为 `src/main.ts`），而非额外追加入口。用它覆盖 `config.pages` 中的 `entry` 可能引发错误。

### vue-cli-service build

```bash
用法：vue-cli-service build [options] [entry|pattern]

选项：
  --mode        指定环境模式 (默认值：production)
  --dest        指定输出目录 (默认值：dist)
  --modern      面向现代浏览器带自动回退地构建应用
  --target      app | lib | wc | wc-async (默认值：app)
  --name        库或 Web Components 模式下的名字
  --no-clean    在构建项目之前不清除目标目录的内容
  --report      生成 report.html 以帮助分析包内容
  --report-json 生成 report.json 以帮助分析包内容
  --watch       监听文件变化
```

### vue-cli-service inspect

审查解析后的 webpack 配置。输出的**不是**有效的 webpack 配置文件，而是用于审查的序列化格式。

```bash
vue inspect > output.js          # 重定向到文件查阅
vue inspect module.rules.0       # 只审查第一条规则
vue inspect --rule vue           # 按规则名审查
vue inspect --plugin html        # 按插件名审查
vue inspect --rules              # 列出所有规则名
vue inspect --plugins            # 列出所有插件名
```

外部工具（IDE / CLI）需要文件形式的配置时可用：

```
<projectRoot>/node_modules/@vue/cli-service/webpack.config.js
```

### 缓存、并行与 Git Hook

- `cache-loader` 默认为 Vue/Babel/TypeScript 编译开启，缓存在 `node_modules/.cache`。遇到编译问题先删缓存目录再试
- `thread-loader` 在多核 CPU 上为 Babel/TypeScript 转译开启
- 安装时会一并安装 [yorkie](https://github.com/yyx990803/yorkie)，可在 `package.json` 的 `gitHooks` 字段指定 Git hook（`yorkie` fork 自 `husky` 且与后者不兼容）

```json
{
  "gitHooks": { "pre-commit": "lint-staged" },
  "lint-staged": { "*.{js,vue}": "vue-cli-service lint" }
}
```

## 模式与环境变量

### 模式

默认有三个模式，可通过 `--mode` 覆写：

| 模式 | 用于 |
| --- | --- |
| `development` | `vue-cli-service serve` |
| `test` | `vue-cli-service test:unit` |
| `production` | `vue-cli-service build` 和 `vue-cli-service test:e2e` |

`NODE_ENV` 决定应用运行的模式，进而决定创建哪种 webpack 配置。若环境文件内不包含 `NODE_ENV`，它的值取决于模式。

- `NODE_ENV=test`：创建面向单元测试优化的配置，不处理图片等非必需资源
- `NODE_ENV=development`：启用热更新，不对资源做 hash，不打 vendor bundle，追求快速重建
- 运行 `build` 时，无论部署到哪个环境，都应把 `NODE_ENV` 设为 `production`

> 如果环境中已有默认的 `NODE_ENV`，应移除它或在运行命令时明确设置。

### 环境文件

项目根目录下可放置：

```
.env                # 所有情况下都加载
.env.local          # 所有情况下都加载，但会被 git 忽略
.env.[mode]         # 只在指定模式下加载
.env.[mode].local   # 只在指定模式下加载，但会被 git 忽略
```

内容为键值对，支持变量扩展（Vue CLI 3.5+，通过 dotenv-expand）：

```bash
FOO=foo
BAR=bar
CONCAT=$FOO$BAR
```

**加载优先级**：指定模式的环境文件（如 `.env.production`）> 一般环境文件（`.env`）。Vue CLI 启动时已存在的环境变量优先级最高，不会被 `.env` 文件覆写。环境文件变化后需重启服务。

> 不要在环境文件中存储机密信息。环境变量会随构建打包嵌入输出代码，任何人都能看到。

### 在客户端代码中使用

只有 `NODE_ENV`、`BASE_URL` 和以 `VUE_APP_` 开头的变量会被 `webpack.DefinePlugin` 静态嵌入客户端代码：

```javascript
console.log(process.env.VUE_APP_SECRET)
```

- `NODE_ENV`：`"development"` / `"production"` / `"test"` 之一
- `BASE_URL`：与 `vue.config.js` 中的 `publicPath` 相符

也可在 `vue.config.js` 中计算环境变量（仍需 `VUE_APP_` 前缀），常用于注入版本信息：

```javascript
process.env.VUE_APP_VERSION = require('./package.json').version

module.exports = { /* config */ }
```

### 示例：Staging 模式

`.env`：

```bash
VUE_APP_TITLE=My App
```

`.env.staging`：

```bash
NODE_ENV=production
VUE_APP_TITLE=My App (staging)
```

- `vue-cli-service build` → 加载 `.env`、`.env.production`、`.env.production.local`
- `vue-cli-service build --mode staging` → 加载 `.env`、`.env.staging`、`.env.staging.local`

两种情况根据 `NODE_ENV` 都构建出生产环境应用，但 staging 版本中 `process.env.VUE_APP_TITLE` 被覆写。

## 浏览器兼容性

### browserslist

`package.json` 的 `browserslist` 字段（或 `.browserslistrc` 文件）指定目标浏览器范围，会被 `@babel/preset-env` 和 Autoprefixer 用来确定需转译的 JS 特性与需添加的 CSS 前缀。

### Polyfill

默认使用 `@vue/babel-preset-app`，它把 `useBuiltIns: 'usage'` 传给 `@babel/preset-env`，根据源码中出现的特性自动检测所需 polyfill。这意味着**依赖需要的特殊 polyfill 默认无法被检测出来**。三种应对方式：

1. **依赖基于目标环境不支持的 ES 版本撰写**：加入 `vue.config.js` 的 `transpileDependencies`
2. **依赖交付 ES5 代码并显式列出所需 polyfill**：用 `@vue/babel-preset-app` 的 `polyfills` 选项预包含（`es.promise` 默认已包含）

```javascript
// babel.config.js
module.exports = {
  presets: [
    ['@vue/app', { polyfills: ['es.promise', 'es.symbol'] }]
  ]
}
```

3. **依赖交付 ES5 但用了 ES6+ 特性且未列出 polyfill（如 Vuetify）**：使用 `useBuiltIns: 'entry'`，并在入口文件添加 `import 'core-js/stable'; import 'regenerator-runtime/runtime';`。会导入 browserslist 目标所需的**全部** polyfill，包体积可能增加

> 推荐用配置方式添加 polyfill 而非在源码中直接导入，因为不需要的 polyfill 会被自动排除。
>
> 构建**库或 Web Component** 时推荐传 `useBuiltIns: false`，打包 polyfill 应是最终使用方的责任。

### 现代模式

```bash
vue-cli-service build --modern
```

产生两个版本：现代版包通过 `<script type="module">` 加载（并用 `<link rel="modulepreload">` 预加载），旧版包通过 `<script nomodule>` 加载（支持 ES modules 的浏览器会忽略）。还会自动注入针对 Safari 10 `<script nomodule>` 的修复。

对 Hello World 应用现代版包小 16%，生产环境下解析与运算速度提升显著。

> `<script type="module">` 需配合始终开启的 CORS 加载，服务器必须返回有效的 CORS 头。需要认证获取脚本时将 `crossorigin` 设为 `use-credentials`。

## HTML 与静态资源

### 插值

`public/index.html` 被 [html-webpack-plugin](https://github.com/jantimon/html-webpack-plugin) 作为模板处理，支持 lodash template 语法：

- `<%= VALUE %>` 不转义插值
- `<%- VALUE %>` HTML 转义插值
- `<% expression %>` JavaScript 流程控制

所有客户端环境变量都可直接使用：

```html
<link rel="icon" href="<%= BASE_URL %>favicon.ico">
```

### Preload 与 Prefetch

- `<link rel="preload">`：默认为所有**初始化渲染需要**的文件自动生成
- `<link rel="prefetch">`：默认为所有**async chunk**（动态 `import()` 的产物）自动生成

两者都由 [@vue/preload-webpack-plugin](https://github.com/vuejs/preload-webpack-plugin) 注入，可通过 `chainWebpack` 修改或删除：

```javascript
module.exports = {
  chainWebpack: config => {
    config.plugins.delete('prefetch')
    // 或修改选项
    config.plugin('prefetch').tap(options => {
      options[0].fileBlacklist = options[0].fileBlacklist || []
      options[0].fileBlacklist.push(/myasyncRoute(.)+?\.js$/)
      return options
    })
  }
}
```

禁用 prefetch 插件后可用内联注释手动选定：

```javascript
import(/* webpackPrefetch: true */ './someAsyncComponent.vue')
```

> Prefetch 会消耗带宽。应用很大且有很多 async chunk、用户主要在移动端时，可考虑关掉并手动选择。

### 不生成 index

基于已有后端使用时可能不需要生成 `index.html`：

```javascript
module.exports = {
  filenameHashing: false,
  chainWebpack: config => {
    config.plugins.delete('html')
    config.plugins.delete('preload')
    config.plugins.delete('prefetch')
  }
}
```

但不推荐——硬编码文件名不利于缓存控制、无法很好地 code-splitting、无法在现代模式下工作。更好的做法是用 `indexPath` 把生成的 HTML 用作服务端框架的视图模板。

### URL 转换规则

| URL 形式 | 处理方式 |
| --- | --- |
| 绝对路径 `/images/foo.png` | 保留不变 |
| 以 `.` 开头 | 作为相对模块请求，基于文件系统目录结构解析 |
| 以 `~` 开头 | 其后内容作为模块请求解析，可引用 Node 模块中的资源 |
| 以 `@` 开头 | 作为模块请求解析，`@` 默认指向 `<projectRoot>/src`（**仅作用于模板中**） |

相对路径引用的资源会进入 webpack 依赖图，小于 8KiB 的资源会被内联。调整内联阈值：

```javascript
module.exports = {
  chainWebpack: config => {
    config.module.rule('images').set('parser', {
      dataUrlCondition: { maxSize: 4 * 1024 } // 4KiB
    })
  }
}
```

### public 文件夹

放在 `public` 的资源会被直接复制而不经过 webpack，需通过绝对路径引用。它是**应急手段**，适用场景：

- 需要在构建输出中指定确定的文件名
- 有上千个图片需要动态引用路径
- 某些库与 webpack 不兼容，只能用独立 `<script>` 引入

应用未部署在域名根部时需配置 `publicPath` 前缀：

```javascript
data () {
  return { publicPath: process.env.BASE_URL }
}
```

```html
<img :src="`${publicPath}my-image.png`">
```

## 构建目标

通过 `--target` 指定，同一份源码可生成不同用途的构建。

### app（默认）

`index.html` 带注入的资源和 resource hint；第三方库分到独立包便于缓存；小于 8KiB 的静态资源内联；`public` 中的资源复制到输出目录。

### lib

```bash
vue-cli-service build --target lib --name myLib [entry]
```

入口可以是 `.js` 或 `.vue` 文件（默认 `src/App.vue`）。输出：

- `dist/myLib.common.js`：给打包器用的 CommonJS 包
- `dist/myLib.umd.js`：给浏览器或 AMD loader 用的 UMD 包
- `dist/myLib.umd.min.js`：压缩后的 UMD 版本
- `dist/myLib.css`：提取的 CSS（可用 `css: { extract: false }` 强制内联）

**Vue 是外置的**——包中不含 Vue，会尝试通过打包器加载或回退到全局 `Vue` 变量。用 `--inline-vue` 可避免此行为。

**入口文件类型的差异**：用 `.vue` 作入口时库直接暴露该组件；用 `.js`/`.ts` 作入口时库暴露为模块，需通过 `window.yourLib.default` 或 `require('mylib').default` 访问。想直接暴露默认导出：

```javascript
module.exports = {
  configureWebpack: { output: { libraryExport: 'default' } }
}
```

> 开发库或 monorepo 时注意：导入 CSS **有副作用**，需从 `package.json` 中移除 `"sideEffects": false`，否则 CSS 代码块会在生产构建时被 webpack 丢掉。
>
> 库模式下 `publicPath` 依赖 `document.currentScript` 动态设置，IE 不支持。需支持 IE 时引入 [current-script-polyfill](https://www.npmjs.com/package/current-script-polyfill)。

### wc / wc-async（Web Components）

```bash
# 单个组件
vue-cli-service build --target wc --name my-element [entry]

# 多个组件（glob 表达式），--name 用作前缀
vue-cli-service build --target wc --name foo 'src/components/*.vue'

# 异步模式：code-split，按需获取组件实现
vue-cli-service build --target wc-async --name foo 'src/components/*.vue'
```

入口应为 `*.vue` 文件，Vue CLI 会自动用 `@vue/web-component-wrapper` 包裹并注册，自动代理属性、特性、事件和插槽。多组件时自定义元素名由文件名推导（`HelloWorld.vue` + `--name foo` → `<foo-hello-world>`）。

使用方式：

```html
<script src="https://unpkg.com/vue"></script>
<script src="path/to/my-element.js"></script>
<my-element></my-element>
```

> Web Components 模式不支持 IE11 及更低版本，且**依赖页面上全局可用的 `Vue`**。

**在 wc/lib 目标中使用 Vuex**：入口点不是 `main.js` 而是生成的 `entry-wc.js`，因此需要在 `App.vue` 中初始化 store：

```javascript
import store from './store'

export default {
  store,
  name: 'App'
}
```

## 部署

### 本地预览

`dist` 需要 HTTP 服务器访问（除非 `publicPath` 配为相对值），直接以 `file://` 打开不工作：

```bash
npm install -g serve
serve -s dist
```

### history 模式路由

`history` 模式下无法搭配简单的静态文件服务器——`/todos/42` 这样的路径在生产静态服务器上会返回 404。需要配置服务器把未匹配静态文件的请求**回退到 `index.html`**，常用服务器配置见 [Vue Router 文档](https://router.vuejs.org/zh/guide/essentials/history-mode.html)。

### 其他要点

- **CORS**：前端静态内容与后端 API 不同域时需正确配置 [CORS](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/CORS)
- **PWA**：使用 PWA 插件时应用必须架设在 HTTPS 上，Service Worker 才能正确注册

## 其他工具配置

| 工具 | 配置文件 | 说明 |
| --- | --- | --- |
| Babel | `babel.config.js` | Vue CLI 使用 Babel 7 新格式，会一致地作用于项目根目录以下所有文件（含 `node_modules`）。推荐始终使用此格式取代 `.babelrc` |
| ESLint | `.eslintrc` 或 `package.json` 的 `eslintConfig` | 详见 [@vue/cli-plugin-eslint](https://github.com/vuejs/vue-cli/tree/dev/packages/@vue/cli-plugin-eslint) |
| TypeScript | `tsconfig.json` | 详见 [@vue/cli-plugin-typescript](https://github.com/vuejs/vue-cli/tree/dev/packages/@vue/cli-plugin-typescript) |
| 单元测试 | — | [unit-jest](https://github.com/vuejs/vue-cli/tree/dev/packages/@vue/cli-plugin-unit-jest) / [unit-mocha](https://github.com/vuejs/vue-cli/tree/dev/packages/@vue/cli-plugin-unit-mocha) |
| E2E 测试 | — | [e2e-cypress](https://github.com/vuejs/vue-cli/tree/dev/packages/@vue/cli-plugin-e2e-cypress) / [e2e-nightwatch](https://github.com/vuejs/vue-cli/tree/dev/packages/@vue/cli-plugin-e2e-nightwatch) |

## Preset

Preset 是包含创建新项目所需预定义选项和插件的 JSON 对象，保存在 `~/.vuerc`：

```json
{
  "useConfigFiles": true,
  "cssPreprocessor": "sass",
  "plugins": {
    "@vue/cli-plugin-babel": {},
    "@vue/cli-plugin-eslint": {
      "config": "airbnb",
      "lintOn": ["save", "commit"]
    },
    "@vue/cli-plugin-router": {},
    "@vue/cli-plugin-vuex": {}
  }
}
```

`useConfigFiles: true` 时 `configs` 中的值会被合并到对应配置文件（如 `vue.config.js`）而非 `package.json`。

**版本管理**：官方插件可省略版本（自动用 registry 最新版），但**推荐为所有第三方插件提供显式的版本范围**。

**允许命令提示**：使用 preset 时插件的命令提示默认被跳过，可用 `"prompts": true` 重新允许注入。

**远程 Preset**：发布含 `preset.json`（必需）、`generator.js`、`prompts.js` 的 git repo 后：

```bash
vue create --preset username/repo my-project

# 私有 repo 需加 --clone
vue create --preset gitlab:username/repo --clone my-project
vue create --preset direct:ssh://git@my-server.com/group/proj.git --clone my-project

# 本地测试 preset
vue create --preset ./my-preset my-project
vue create --preset my-preset.json my-project
```

## 插件

```bash
vue add eslint          # 解析为 @vue/cli-plugin-eslint
vue add apollo          # 无 @vue 前缀则解析 unscoped 包 vue-cli-plugin-apollo
vue add @foo/bar        # 指定 scope：@foo/vue-cli-plugin-bar
vue add eslint --config airbnb --lintOn save   # 传递生成器选项，跳过提示
vue invoke eslint       # 插件已安装时，跳过安装只调用生成器
```

> `vue add` 用于安装和调用 Vue CLI 插件，不能替代普通 npm 包的安装。运行前建议先提交项目当前状态，因为它可能更改现有文件。

**项目本地插件**：无需创建完整插件即可访问插件 API：

```json
{
  "vuePlugins": {
    "service": ["my-commands.js"],
    "ui": ["my-ui.js"],
    "resolveFrom": ".config"
  }
}
```

每个文件需暴露一个接受插件 API 作为第一个参数的函数，详见[插件开发指南](https://cli.vuejs.org/zh/dev-guide/plugin-dev.html)。

## 相关阅读

- [Vue CLI 项目构建基础](01-Vue%20CLI项目构建基础.md)：脚手架实战、包管理与常用配置
- [使用 pages 构建多页应用](03-使用%20pages%20构建多页应用.md)：多页路由与模板解析
- [项目整合与优化](04-项目整合与优化.md)：alias、模块整合、Gzip 压缩
