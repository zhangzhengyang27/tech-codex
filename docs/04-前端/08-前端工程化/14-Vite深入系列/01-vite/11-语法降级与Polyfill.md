---
title: "语法降级与Polyfill"
description: "低版本浏览器兼容的两类问题与解法：Babel @babel/preset-env 与 transform-runtime 的 Polyfill 注入策略对比，@vitejs/plugin-legacy 的使用及 Modern/Legacy 双产物构建原理。"
keywords: [语法降级与Polyfill]
category: tools
tags: [Vite, Babel, Polyfill, 构建工具, 工程化]
---

# 语法降级与Polyfill

谈到 Vite，可能很多人都觉得这是一个现代前端构建工具，应该在现代浏览器中使用，放到各种语法特性都缺失的低版本浏览器(如 `ie 11`)就不适用了。这种观念对不对呢？首先跟大家抛出结论:

> 通过 Vite 构建我们完全可以兼容各种低版本浏览器，打包出既支持现代(`Modern`)浏览器又支持旧版(`Legacy`)浏览器的产物。

某些低版本浏览器并没有提供 `Promise` 语法环境以及对象和数组的各种 API，甚至不支持箭头函数语法，代码直接报错，从而导致线上白屏事故的发生，尤其是需要兼容到`IE 11`、`iOS 9`以及`Android 4.4`的场景中很容易会遇到。

旧版浏览器的语法兼容问题主要分两类: **语法降级问题**和 **Polyfill 缺失问题**。前者比较好理解，比如某些浏览器不支持箭头函数，就需要将其转换为`function(){}`语法；而对后者来说，`Polyfill`本身可以翻译为`垫片`，也就是为浏览器提前注入一些 API 的实现代码，如`Object.entries`方法的实现，这样可以保证产物可以正常使用这些 API，防止报错。

这两类问题本质上是通过前端的编译工具链(如 `Babel` )及 JS 的基础 Polyfill 库(如 `corejs` )来解决的，不会跟具体的构建工具所绑定。也就是说，对于这些本质的解决方案，在其它的构建工具(如 Webpack)能使用，在 Vite 当中也完全可以使用

## 底层工具链

### 工具概览

解决上述提到的两类语法兼容问题，主要需要用到两方面的工具，分别包括:

*   **编译时工具**。代表工具有 `@babel/preset-env` 和 `@babel/plugin-transform-runtime`
    
*   **运行时基础库**。代表库包括`core-js`和`regenerator-runtime`。
    

**编译时工具**的作用是在代码编译阶段进行**语法降级**及**添加 `polyfill` 代码的引用语句**，如:

```javascript
import "core-js/modules/es6.set.js"
```

由于这些工具只是编译阶段用到，运行时并不需要，我们需要将其放入 `package.json` 中的 `devDependencies` 中

而**运行时基础库**是根据 `ESMAScript`官方语言规范提供各种`Polyfill`实现代码，主要包括`core-js`和`regenerator-runtime`两个基础库，不过在 babel 中也会有一些上层的封装，包括：

*   [@babel/polyfill](https://link.juejin.cn/?target=https%3A%2F%2Fbabeljs.io%2Fdocs%2Fen%2Fbabel-polyfill%20"https://babeljs.io/docs/en/babel-polyfill")
*   [@babel/runtime](https://link.juejin.cn/?target=https%3A%2F%2Fbabeljs.io%2Fdocs%2Fen%2Fbabel-runtime%20"https://babeljs.io/docs/en/babel-runtime")
*   [@babel/runtime-corejs2](https://link.juejin.cn/?target=https%3A%2F%2Fbabeljs.io%2Fdocs%2Fen%2Fbabel-runtime-corejs2%20"https://babeljs.io/docs/en/babel-runtime-corejs2")
*   [@babel/runtime-corejs3](https://link.juejin.cn/?target=https%3A%2F%2Fbabeljs.io%2Fdocs%2Fen%2Fbabel-runtime-corejs3%20"https://babeljs.io/docs/en/babel-runtime-corejs3")

看似各种运行时库眼花缭乱，其实都是 `core-js` 和 `regenerator-runtime` 不同版本的封装罢了(`@babel/runtime`是个特例，不包含 core-js 的 Polyfill)。这类库是项目运行时必须要使用到的，因此一定要放到 `package.json`中的 `dependencies` 中！

> 注：`@babel/polyfill` 已被 Babel 官方弃用，Babel 7.4+ 推荐直接使用 `core-js@3` 配合 `regenerator-runtime`。

### 实际使用

初始化项目:

```bash
mkdir babel-test
npm init -y

pnpm i @babel/cli @babel/core @babel/preset-env
```

各个依赖的作用:

*   `@babel/cli`: 为 babel 官方的脚手架工具，很适合我们练习用
*   `@babel/core`: babel 核心编译库
*   `@babel/preset-env`: babel 的预设工具集，基本为 babel 必装的库

接着新建 `src` 目录，在目录下增加`index.js`文件，示例代码中既包含了`高级语法`也包含现代浏览器的`API`，正好可以针对语法降级和 Polyfill 注入两个功能进行测试。

```javascript
const func = async () => {
  console.log(12123)
}

Promise.resolve().finally();
```

接下来新建 `.babelrc.json` 即 babel 的配置文件，内容如下:

```json
{
  "presets": [
    [
      "@babel/preset-env", 
      {
        // 指定兼容的浏览器版本
        "targets": {
          "ie": "11"
        },
        // 基础库 core-js 的版本，一般指定为最新的大版本
        "corejs": 3,
        // Polyfill 注入策略，后文详细介绍
        "useBuiltIns": "usage",
        // 不将 ES 模块语法转换为其他模块语法
        "modules": false
      }
    ]
  ]
}
```

可以通过 `targets` 参数指定要兼容的浏览器版本，你既可以填如上配置所示的一个对象:

```json
{
  "targets": {
    "ie": "11"
  }
}
```

也可以用 [Browserslist](https://github.com/browserslist/browserslist) 配置语法:

```json
{ 
  "targets": "ie >= 11, > 0.5%, not dead" // ie 不低于 11 版本，全球超过 0.5% 使用，且还在维护更新的浏览器
}
```

Browserslist 是一个设置目标浏览器的工具，不光是 Babel 用到，其他的编译工具如`postcss-preset-env`、`autoprefixer`中都有所应用。对于 `Browserslist` 的配置内容，你既可以放到 Babel 这种特定工具当中，也可以在 `package.json` 中通过 `browserslist` 声明:

```json
{ 
  "browserslist": "ie >= 11"
}
```

或者通过`.browserslistrc`进行声明:

```javascript
ie >= 11
```

在实际的项目中，一般可以将使用下面这些**最佳实践集合**来描述不同的浏览器类型，减轻配置负担:

```javascript
// 现代浏览器
last 2 versions and since 2018 and > 0.5%
// 兼容低版本 PC 浏览器
IE >= 11, > 0.5%, not dead
// 兼容低版本移动端浏览器
iOS >= 9, Android >= 4.4, last 2 versions, > 0.2%, not dead
```

对于这些配置对应的具体浏览器列表，大家可以去 [browserslist.dev](https://browserslist.dev) 站点查看:

![image-20240322123438316](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403221234422.png)

另外一个重要的配置——`useBuiltIns`，它决定了添加 Polyfill 策略，默认是 `false`，即不添加任何的 Polyfill。你可以手动将`useBuiltIns`配置为`entry`或者`usage`，

首先你可以将这个字段配置为  `entry`，需要注意的是，`entry` 配置规定你必须在入口文件手动添加一行这样的代码:

```javascript
// index.js 开头加上
import 'core-js';
```

接着在终端执行下面的命令进行 Babel 编译:

```bash
npx babel src --out-dir dist
```

产物输出在`dist`目录中，你可以去观察一下产物的代码:

![image-20240322123625663](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403221236980.png)

Babel 已经根据`目标浏览器`的配置为我们添加了大量的 Polyfill 代码，`index.js`文件简单的几行代码被编译成近 300 行。实际上，Babel 所做的事情就是将你的`import "core-js"` 代码替换成了产物中的这些具体模块的导入代码。

但这个配置有一个问题，即无法做到按需导入，上面的产物代码其实有大部分的 Polyfill 的代码我们并没有用到。接下来试试`useBuiltIns: usage`这个按需导入的配置，改动配置后执行编译命令:

```bash
npx babel src --out-dir dist
```

> Polyfill 代码主要来自 `corejs` 和 `regenerator-runtime`，因此如果要运行起来，必须要装这两个库。

可以发现 Polyfill 的代码精简了许多，真正地实现了按需 Polyfill 导入。因此，在实际的使用当中，还是推荐大家尽量使用`useBuiltIns: "usage"`，进行按需的 Polyfill 注入。

上面利用 `@babel/preset-env` 进行了目标浏览器语法的降级和 `Polyfill` 注入，同时用到了 `core-js` 和 `regenerator-runtime` 两个核心的运行时库。但 `@babel/preset-env`  的方案也存在一定局限性:

*   如果使用新特性，往往是通过基础库(如 core-js)往全局环境添加 Polyfill，如果是开发应用则没有任何问题，而如果是开发第三方工具库，则很可能会对**全局空间造成污染**。
*   很多工具函数的实现代码(如上面示例中的`_defineProperty`方法)，会在许多文件中重现出现，造成**文件体积冗余**。

### 更优的 Polyfill 注入方案: transform-runtime

接下来要介绍的`transform-runtime`方案，就是为了解决`@babel/preset-env`的种种局限性。

> 需要提前说明的是，`transform-runtime` 方案可以作为 `@babel/preset-env` 中 `useBuiltIns` 配置的替代品，也就是说，一旦使用 `transform-runtime` 方案，应该把 `useBuiltIns` 属性设为 `false`。

接下来我们来尝试一下这个方案，首先安装必要的依赖:

```bash
pnpm i @babel/plugin-transform-runtime -D
pnpm i @babel/runtime-corejs3 -S
```

两个依赖的作用: 前者是编译时工具，用来转换语法和添加 Polyfill，后者是运行时基础库，封装了`core-js`、`regenerator-runtime`和各种语法转换用到的`工具函数`。

> core-js 有三种产物，分别是`core-js`、`core-js-pure`和`core-js-bundle`。第一种是全局 Polyfill 的做法，@babel/preset-env 就是用的这种产物；第二种不会把 Polyfill 注入到全局环境，可以按需引入；第三种是打包好的版本，包含所有的 Polyfill，不太常用。`@babel/runtime-corejs3` 使用的是第二种产物。

接着对 `.babelrc.json` 作如下的配置:

```json
{
  "plugins": [
    // 添加 transform-runtime 插件
    [
      "@babel/plugin-transform-runtime", 
      {
        "corejs": 3
      }
    ]
  ],
  "presets": [
    [
      "@babel/preset-env", 
      {
        "targets": {
          "ie": "11"
        },
        "corejs": 3,
        // 关闭 @babel/preset-env 默认的 Polyfill 注入
        "useBuiltIns": false,
        "modules": false
      }
    ]
  ]
}
```

执行终端命令:

```bash
npx babel src --out-dir dist
```

对比一下 `@babel/preset-env` 下的产物结果:

![image-20240322124030367](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403221240918.png)

经过对比发现，`transform-runtime` 一方面能够让代码中使用`非全局版本`的 Polyfill，这样就避免全局空间的污染，这也得益于 `core-js` 的 pure 版本产物特性；另一方面对于`asyncToGenerator`这类的工具函数，它也将其转换成了一段引入语句，不再将完整的实现放到文件中，节省了编译后文件的体积。

另外，`transform-runtime`方案引用的基础库也发生了变化，不再是直接引入`core-js`和`regenerator-runtime`，而是引入`@babel/runtime-corejs3`。

看看如何在 Vite 中利用这些方案来解决低版本浏览器的兼容性问题

## Vite 语法降级与 Polyfill 注入

Vite 官方已经为我们封装好了一个开箱即用的方案: `@vitejs/plugin-legacy`，可以基于它来解决项目语法的浏览器兼容问题。这个插件内部同样使用 `@babel/preset-env` 以及 `core-js`等一系列基础库来进行语法降级和 Polyfill 注入，因此我觉得对于上文所介绍的底层工具链的掌握是必要的，否则无法理解插件内部所做的事情，真正遇到问题时往往会不知所措

### 插件使用

```bash
pnpm i @vitejs/plugin-legacy -D
```

随后在项目中使用它:

```ts
// vite.config.ts
import legacy from '@vitejs/plugin-legacy';
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    // 省略其它插件
    legacy({
      // 设置目标浏览器，browserslist 配置语法
      targets: ['ie >= 11'],
    })
  ]
})
```

通过 `targets` 指定目标浏览器，这个参数在插件内部会透传给 `@babel/preset-env` 。在引入插件后，可以尝试执行 `npm run build` 对项目进行打包，可以看到如下的产物信息:

![image-20240322124305481](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403221243976.png)

相比一般的打包过程，多出了`index-legacy.js`、`vendor-legacy.js`以及`polyfills-legacy.js`三份产物文件。让我们继续观察一下`index.html`的产物内容:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/assets/favicon.17e50649.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite App</title>
    <!-- 1. Modern 模式产物 -->
    <script type="module" crossorigin src="/assets/index.c1383506.js"></script>
    <link rel="modulepreload" href="/assets/vendor.0f99bfcc.js">
    <link rel="stylesheet" href="/assets/index.91183920.css">
  </head>
  <body>
    <div id="root"></div>
    <!-- 2. Legacy 模式产物 -->
    <script nomodule>兼容 iOS nomodule 特性的 polyfill，省略具体代码</script>
    <script nomodule id="vite-legacy-polyfill" src="/assets/polyfills-legacy.36fe2f9e.js"></script>
    <script nomodule id="vite-legacy-entry" data-src="/assets/index-legacy.c3d3f501.js">System.import(document.getElementById('vite-legacy-entry').getAttribute('data-src'))</script>
  </body>
</html>
```

通过官方的 `legacy` 插件， Vite 会分别打包出 `Modern` 模式和 `Legacy` 模式的产物，然后将两种产物插入同一个 HTML 里面，`Modern`产物被放到 `type="module"`的 script 标签中，而`Legacy`产物则被放到带有 [nomodule](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/script#attr-nomodule) 的 script 标签中。

现代浏览器加载 `<script type="module">` 忽略 ` <script nomodule>`

当然在具体的代码语法层面，插件还需要考虑语法降级和 Polyfill 按需注入的问题，接下来分析一下 Vite 的官方`legacy`插件是如何解决这些问题的

### 插件执行原理

官方的 `legacy` 插件是一个相对复杂度比较高的插件，直接看源码可能会很难理解，这里我梳理了一张简化后的流程图，接下来我们就根据这张流程图来一一拆解这个插件在各个钩子阶段到底做了些什么

![image-20240322124655188](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403221246064.png)

首先是在 `configResolved` 钩子中调整了 `output` 属性，这么做的目的是让 Vite 底层使用的打包引擎 Rollup 能另外打包出一份 `Legacy 模式` 的产物，实现代码如下:

```javascript
const createLegacyOutput = (options = {}) => {
  return {
    ...options,
    // system 格式产物
    format: 'system',
    // 转换效果: index.[hash].js -> index-legacy.[hash].js
    entryFileNames: getLegacyOutputFileName(options.entryFileNames),
    chunkFileNames: getLegacyOutputFileName(options.chunkFileNames)
  }
}

const { rollupOptions } = config.build
const { output } = rollupOptions
if (Array.isArray(output)) {
  rollupOptions.output = [...output.map(createLegacyOutput), ...output]
} else {
  rollupOptions.output = [createLegacyOutput(output), output || {}]
}
```

接着在 `renderChunk` 阶段，插件会对 Legacy 模式产物进行语法转译和 Polyfill 收集，值得注意的是，这里并不会真正注入 `Polyfill`，而仅仅只是收集`Polyfill`:

```javascript
{
  renderChunk(raw, chunk, opts) {
    // 1. 使用 babel + @babel/preset-env 进行语法转换与 Polyfill 注入
    // 2. 由于此时已经打包后的 Chunk 已经生成
    //   这里需要去掉 babel 注入的 import 语句，并记录所需的 Polyfill
    // 3. 最后的 Polyfill 代码将会在 generateBundle 阶段生成
  }
}
```

由于场景是应用打包，这里直接使用 @babel/preset-env 的`useBuiltIns: 'usage'`来进行全局 Polyfill 的收集是比较标准的做法。

回到 Vite 构建的主流程中，接下来会进入`generateBundle`钩子阶段，现在 Vite 会对之前收集到的`Polyfill`进行统一的打包，实现也比较精妙，主要逻辑集中在`buildPolyfillChunk`函数中:

```javascript
// 打包 Polyfill 代码
async function buildPolyfillChunk(
  name,
  imports,
  bundle,
  facadeToChunkMap,
  buildOptions,
  externalSystemJS
) {
  let { minify, assetsDir } = buildOptions
  minify = minify ? 'terser' : false
  // 调用 Vite 的 build API 进行打包
  const res = await build({
    // 根路径设置为插件所在目录
    // 由于插件的依赖包含`core-js`、`regenerator-runtime`这些运行时基础库
    // 因此这里 Vite 可以正常解析到基础 Polyfill 库的路径
    root: __dirname,
    write: false,
    // 这里的插件实现了一个虚拟模块
    // Vite 对于 polyfillId 会返回所有 Polyfill 的引入语句
    plugins: [polyfillsPlugin(imports, externalSystemJS)],
    build: {
      rollupOptions: {
        // 访问 polyfillId
        input: {
          // name 暂可视作`polyfills-legacy`
          // pofyfillId 为一个虚拟模块，经过插件处理后会拿到所有 Polyfill 的引入语句
          [name]: polyfillId
        },
      }
    }
  });
  // 拿到 polyfill 产物 chunk
  const _polyfillChunk = Array.isArray(res) ? res[0] : res
  if (!('output' in _polyfillChunk)) return
  const polyfillChunk = _polyfillChunk.output[0]
  // 后续做两件事情:
  // 1. 记录 polyfill chunk 的文件名，方便后续插入到 Modern 模式产物的 HTML 中；
  // 2. 在 bundle 对象上手动添加 polyfill 的 chunk，保证产物写到磁盘中
}
```

因此，你可以理解为这个函数的作用即通过 `vite build` 对`renderChunk`中收集到 polyfill 代码进行打包，生成一个单独的 chunk:

> 需要注意的是，polyfill chunk 中除了包含一些 core-js 和 regenerator-runtime 的相关代码，也包含了 `SystemJS` 的实现代码，你可以将其理解为 ESM 的加载器，实现了在旧版浏览器下的模块加载能力。

现在我们已经能够拿到 Legacy 模式的产物文件名及 Polyfill Chunk 的文件名，那么就可以通过`transformIndexHtml`钩子来将这些产物插入到 HTML 的结构中:

```javascript
{
  transformIndexHtml(html) {
    // 1. 插入 Polyfill chunk 对应的 <script nomodule> 标签
    // 2. 插入 Legacy 产物入口文件对应的 <script nomodule> 标签
  }
}
```

OK，Vite 官方的 legacy 插件的主要原理就介绍到这里，为了方便大家理解，讲解的过程中忽略了一些与主流程关联不大的细节，最后给大家补充一下，感兴趣的同学可以继续深入学习:

*   当插件参数中开启了`modernPolyfills`选项时，Vite 也会自动对 Modern 模式的产物进行 Polyfill 收集，并单独打包成`polyfills-modern.js`的 chunk，原理和 Legacy 模式下处理 Polyfill 一样。
    
*   Safari 10.1 版本不支持 `nomodule`，为此需要单独引入一些补丁代码，[点击查看](https://link.juejin.cn/?target=https%3A%2F%2Fgist.github.com%2Fsamthor%2F64b114e4a4f539915a95b91ffd340acc%20"https://gist.github.com/samthor/64b114e4a4f539915a95b91ffd340acc")。
    
*   部分低版本 Edge 浏览器虽然支持 type="module"，但不支持动态 import，为此也需要插入一些[补丁代码](https://link.juejin.cn/?target=https%3A%2F%2Fgithub.com%2Fvitejs%2Fvite%2Fpull%2F3885%20"https://github.com/vitejs/vite/pull/3885")，针对这种情况下降级使用 Legacy 模式的产物
    
