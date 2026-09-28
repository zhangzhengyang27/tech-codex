---
title: "Rollup"
description: "Rollup 快速上手与核心机制：多产物/多入口配置、external、插件接入、rollup.rollup 与 rollup.watch API，Build/Output 两阶段插件工作流与 resolveId/load/transform/renderChunk/generateBundle 常用钩子实战。"
keywords: [Rollup]
category: tools
tags: [Vite, Rollup, 构建工具, 插件开发, 工程化]
---

# Rollup

Rollup 是一款基于 ES Module 模块规范实现的 JavaScript 打包工具，在前端社区中赫赫有名，同时也在 Vite 的架构体系中发挥着重要作用。不仅是 Vite 生产环境下的打包工具，其插件机制也被 Vite 所兼容，可以说是 Vite 的构建基石

## 快速上手

用 `pnpm init -y` 新建一个项目，然后安装 rollup 依赖:

```bash
pnpm i rollup
```

接着新增 `src/index.js` 和 `src/util.js` 和 `rollup.config.js` 三个文件

```javascript
// src/index.js
import { add } from "./util";
console.log(add(1, 2));
```

```javascript
// src/util.js
export const add = (a, b) => a + b;
export const multi = (a, b) => a * b;
```

```javascript
// rollup.config.js

// 以下注释是为了能使用 VSCode 的类型提示
/**
 * @type { import('rollup').RollupOptions }
 */
const buildOptions = {
  input: ["src/index.js"],
  output: {
    dir: "dist/es",
    format: "esm",
  },
};
export default buildOptions;
```

在 package.json 中加入如下的构建脚本,在终端执行一下 `npm run build`

```javascript
{
  // rollup 打包命令，`-c` 表示使用配置文件中的配置
  "build": "rollup -c"
}
```

可以去 dist/es 目录查看一下产物的内容，代码已经打包到一起

```javascript
// dist/es/index.js

const add = (a, b) => a + b;
console.log(add(1, 2));
```

可以发现， util.js 中的 multi 方法并没有被打包到产物中，这是因为 Rollup 具有天然的 Tree Shaking 功能，可以分析出未使用到的模块并自动擦除。由于 ES 模块依赖关系是确定的，和运行时状态无关。因此 Rollup 可以在编译阶段分析出依赖关系，对 AST 语法树中没有使用到的节点进行删除，从而实现 Tree Shaking

### 常用配置解读

#### 多产物配置

将 output 属性配置成一个数组，数组中每个元素都是一个描述对象，决定了不同产物的输出行为

```javascript
// rollup.config.js
/**
 * @type { import('rollup').RollupOptions }
 */
const buildOptions = {
  input: ["src/index.js"],
  // 将 output 改造成一个数组
  output: [
    {
      dir: "dist/es",
      format: "esm",
    },
    {
      dir: "dist/cjs",
      format: "cjs",
    },
  ],
};
export default buildOptions;
```

#### 多入口配置

Rollup 中也支持多入口配置，而且通常情况下两者会被结合起来使用。将 input 设置为一个数组或者一个对象，如下所示:

```javascript
{
  input: ["src/index.js", "src/util.js"]
}
// 或者
{
  input: {
    index: "src/index.js",
    util: "src/util.js",
  },
}
```

```javascript
// rollup.config.js

// 以下注释是为了能使用 VSCode 的类型提示
/**
 * @type { import('rollup').RollupOptions }
 */
const buildOptions = {
  input: ["src/index.js", "src/util.js"],
  output: [
    {
      dir: "dist/es",
      format: "esm"
    },
    {
      dir: "dist/cjs",
      format: "cjs"
    }
  ]
}
export default buildOptions
```

通过执行 npm run build 可以发现，所有入口的不同格式产物已经成功输出:

![image-20240320171742675](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403201717033.png)

如果不同入口对应的打包配置不一样，也可以默认导出一个 配置数组 ，如下所示:

```javascript
// rollup.config.js
/**
 * @type { import('rollup').RollupOptions }
 */
const buildIndexOptions = {
  input: ["src/index.js"],
  output: [
    // 省略 output 配置
  ],
};

/**
 * @type { import('rollup').RollupOptions }
 */
const buildUtilOptions = {
  input: ["src/util.js"],
  output: [
    // 省略 output 配置
  ],
};
export default [buildIndexOptions, buildUtilOptions];
```

如果是比较复杂的打包场景(如 Vite 源码本身的打包)，需要将项目的代码分成几个部分，用不同的 Rollup 配置分别打包，这种配置就很有用了

#### 自定义 output 配置

刚才提到了 input 的使用，主要用来声明入口，可以配置成字符串、数组或者对象，使用比较简单。而 output 与之相对，用来配置输出的相关信息，常用的配置项如下:

```javascript
output: {
 // 产物输出目录
 dir: path.resolve(__dirname, 'dist'),
 // 以下三个配置项都可以使用这些占位符:
 // 1. [name]: 去除文件后缀后的文件名
 // 2. [hash]: 根据文件名和文件内容生成的 hash 值
 // 3. [format]: 产物模块格式，如 es、cjs
 // 4. [extname]: 产物后缀名(带`.`)
 // 入口模块的输出文件名
 entryFileNames: `[name].js`,
 // 非入口模块(如动态 import)的输出文件名
 chunkFileNames: 'chunk-[hash].js',
 // 静态资源文件输出文件名
 assetFileNames: 'assets/[name]-[hash][extname]',
 format: 'cjs', // 产物输出格式，包括`amd`、`cjs`、`es`、`iife`、`umd`、`system`
 sourcemap: true, // 是否生成 sourcemap 文件
 // 如果是打包出 iife/umd 格式，需要对外暴露出一个全局变量，通过 name 配置变量名
 name: 'MyBundle',
 // 全局变量声明
 globals: {
 jquery: '$'  // 项目中可以直接用`$`代替`jquery`
 }
}
```

#### 依赖 external

对于某些第三方包，有时候不想让 Rollup 进行打包，也可以通过 external 进行外部化，在 SSR 构建或者使用 ESM CDN 的场景中，这个配置将非常有用

```javascript
{
 external: ['react', 'react-dom']
}
```

#### 接入插件能力

在 Rollup 的日常使用中，难免会遇到一些 Rollup 本身不支持的场景，比如 兼容 CommonJS 打包、注入环境变量、配置路径别名、压缩产物代码 等等。这个时候就需要引入相应的 Rollup 插件了。

虽然 Rollup 能够打包 输出 CommonJS 格式的产物，但对于输入给 Rollup 的代码并不支持 CommonJS，仅仅支持 ESM。你可能会说，那我们直接在项目中统一使用 ESM规范就可以了啊，这有什么问题呢？需要注意的是不光要考虑项目本身的代码，还要考虑第三方依赖。目前为止，还是有不少第三方依赖只有 CommonJS 格式产物而并未提供 ESM 产物，比如项目中用到 lodash 时。

因此需要引入额外的插件去解决这个问题。首先需要安装两个核心的插件包:

```javascript
pnpm i @rollup/plugin-node-resolve @rollup/plugin-commonjs 
```

- `@rollup/plugin-node-resolve` 是为了允许加载第三方依赖，否则像 `import React from 'react'`  的依赖导入语句将不会被 Rollup 识别

- `@rollup/plugin-commonjs`  的作用是将 CommonJS 格式的代码转换为 ESM 格式

然后在配置文件中导入这些插件:

```javascript
// rollup.config.js
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

/**
 * @type { import('rollup').RollupOptions }
 */
export default {
  input: ["src/index.js"],
  output: [
    {
      dir: "dist/es",
      format: "esm",
    },
    {
      dir: "dist/cjs",
      format: "cjs",
    },
  ],
  // 通过 plugins 参数添加插件
  plugins: [resolve(), commonjs()],
};
```

以 lodash 这个只有 CommonJS 产物的第三方包为例测试一下:

```javascript
pnpm i lodash
```

在 `src/index.js` 加入如下的代码，然后执行 npm run build ，你可以发现产物已经正常生成了

```javascript
import { merge } from "lodash";
console.log(merge);
```

在 Rollup 配置文件中， plugins 除了可以与 output 配置在同一级，也可以配置在 output 参数里面，当然也可以将上述的 terser 插件放到最外层的 plugins 配置中

```javascript
// rollup.config.js
// 注：rollup-plugin-terser 已停止维护，Rollup 3+ 请改用官方的 @rollup/plugin-terser（用法相同）
import { terser } from 'rollup-plugin-terser'
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  output: {
    // 加入 terser 插件，用来压缩代码
    plugins: [terser()]
  },
  plugins: [resolve(), commonjs()]
}
```

需要注意的是， output.plugins 中配置的插件是有一定限制的，只有使用 Output 阶段相关钩子(具体内容将在下一节展开)的插件才能够放到这个配置中，大家可以去这个站点 https://github.com/rollup/awesome#output 查看 Rollup 的 Output 插件列表。

另外，这里也给大家分享其它一些比较常用的 Rollup 插件库:

- @rollup/plugin-json： 支持 `.json` 的加载，并配合 rollup 的 Tree Shaking 机制去掉未使用的部分，进行按需打包
- @rollup/plugin-babel：在 Rollup 中使用 Babel 进行 JS 代码的语法转译
- @rollup/plugin-typescript: 支持使用 TypeScript 开发
- @rollup/plugin-alias：支持别名配置
- @rollup/plugin-replace：在 Rollup 进行变量字符串的替换
- rollup-plugin-visualizer: 对 Rollup 打包产物进行分析，自动生成产物体积可视化分析图

### API 方式调用

有些场景下需要基于 Rollup 定制一些打包过程，配置文件就不够灵活了，这时候需要用到对应 API 来调用 Rollup，主要分为 rollup.rollup 和 rollup.watch 两个API

#### rollup.rollup

首先是 rollup.rollup 用来一次性地进行 Rollup 打包，你可以新建 build.js ，内容如下:

```javascript
const rollup = require("rollup")

const inputOptions = {
  input: "./src/index.js"
}

const outputOptionsList = [
  {
    dir: "dist/es",
    format: "esm"
  },
  {
    dir: "dist/cjs",
    format: "cjs"
  }
]

build()

async function build() {
  let bundle
  let buildFailed = false
  try {
    // 1. 调用 rollup.rollup 生成 bundle 对象（注意赋值给外层变量，不要用 const 重新声明）
    bundle = await rollup.rollup(inputOptions)
    // 2. 拿到 bundle 对象，根据每一份输出配置，调用 generate 和 write 方法分别生成和写入产物
    await generateOutputs(bundle)
  } catch (error) {
    buildFailed = true
    console.error(error)
  }
  if (bundle) {
    // 最后调用 bundle.close 方法结束打包
    await bundle.close()
  }
  process.exit(buildFailed ? 1 : 0)
}

async function generateOutputs(bundle) {
  for (const outputOptions of outputOptionsList) {
    const { output } = await bundle.generate(outputOptions)

    for (const chunkOrAsset of output) {
      if (chunkOrAsset.type === "asset") {
        console.log("Asset", chunkOrAsset)
      } else {
        console.log("Chunk", chunkOrAsset.modules)
      }
    }
    await bundle.write(outputOptions)
  }
}
```

主要的执行步骤如下:

- 通过 rollup.rollup 方法，传入 inputOptions ，生成 bundle 对象
- 调用 bundle 对象的 generate 和 write 方法，传入 outputOptions ，分别完成产物的生成和磁盘写入
- 调用 bundle 对象的 close 方法来结束打包

接着你可以执行 `node build.js`  完成了以编程的方式来调用 Rollup打包的过程

#### rollup.watch

除了通过 rollup.rollup 完成一次性打包，也可以通过 rollup.watch 来完成 watch 模式下的打包，即每次源文件变动后自动进行重新打包。你可以新建 watch.js 文件，内容如下:

```javascript
// watch.js
const rollup = require("rollup");
const watcher = rollup.watch({
  // 和 rollup 配置文件中的属性基本一致，只不过多了 watch 配置
  input: "./src/index.js",
  output: [
    {
      dir: "dist/es",
      format: "esm",
    },
    {
      dir: "dist/cjs",
      format: "cjs",
    },
  ],
  watch: {
    exclude: ["node_modules/**"],
    include: ["src/**"],
  },
});

// 监听 watch 各种事件
watcher.on("restart", () => {
  console.log("重新构建...");
});

watcher.on("change", (id) => {
  console.log("发生变动的模块id: ", id);
});

watcher.on("event", (e) => {
  if (e.code === "BUNDLE_END") {
    console.log("打包信息:", e);
  }
});
```

现在可以通过执行 `node watch.js`  开启 Rollup 的 watch 打包模式，当你改动一个文件后可以看到如下的日志，说明 Rollup 自动进行了重新打包，并触发相应的事件回调函数:

![image-20240407154027051](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202404071540566.png)

基于如上的两个 JavaScript API 可以很方便地在代码中调用 Rollup 的打包流程，相比于配置文件有了更多的操作空间，你可以在代码中通过这些 API 对 Rollup 打包过程进行定制，甚至是二次开发

## Rollup 插件机制

仅仅使用 Rollup 内置的打包能力很难满足项目日益复杂的构建需求。对于一个真实的项目构建场景来说，还需要考虑到模块打包之外的问题，比如**路径别名(alias)** 、**全局变量注入**和**代码压缩**等等。

把这些场景的处理逻辑与核心的打包逻辑都写到一起，一来打包器本身的代码会变得十分臃肿，二来也会对原有的核心代码产生一定的侵入性，混入很多与核心流程无关的代码，不易于后期的维护。

因此 ，Rollup 设计出了一套完整的**插件机制**，将自身的核心逻辑与插件逻辑分离，让你能按需引入插件功能，提高了 Rollup 自身的可扩展性。

Rollup 的打包过程中，会定义一套完整的构建生命周期，从开始打包到产物输出，中途会经历一些**标志性的阶段**，并且在不同阶段会自动执行对应的插件钩子函数(Hook)。对 Rollup 插件来讲，最重要的部分是钩子函数，一方面它定义了插件的执行逻辑，另一方面也声明了插件的作用阶段，这与 Rollup 本身的构建生命周期息息相关

### Rollup 整体构建阶段

在执行 rollup 命令之后，在 cli 内部的主要逻辑简化如下，Rollup 内部主要经历了 Build 和 Output 两大阶段：

```javascript
// Build 阶段
const bundle = await rollup.rollup(inputOptions);

// Output 阶段
await Promise.all(outputOptions.map(bundle.write));

// 构建结束
await bundle.close();
```

首先，Build 阶段主要负责创建模块依赖图，初始化各个模块的 AST 以及模块之间的依赖关系。下面用一个简单的例子来感受一下:

```javascript
// src/index.js
import { a } from './module-a';
console.log(a);

// src/module-a.js
export const a = 1;
```

然后执行如下的构建脚本:

```javascript
const rollup = require('rollup');
const util = require('util');

async function build() {
  const bundle = await rollup.rollup({
    input: ['./src/index.js'],
  });
  console.log(util.inspect(bundle));
}

build();
```

可以看到这样的 bundle 对象信息:

```javascript
{
  cache: {
    modules: [ [Object], [Object] ],
    plugins: [Object: null prototype] {}
  },
  close: [AsyncFunction: close],
  closed: false,
  generate: [AsyncFunction: generate],
  watchFiles: [Getter],
  write: [AsyncFunction: write]
}
```

从上面的信息中可以看出，目前经过 Build 阶段的 bundle 对象其实并没有进行模块的打包，这个对象的作用在于存储各个模块的内容及依赖关系，同时暴露 generate 和 write 方法，以进入到后续的 Output 阶段（ write 和 generate 方法唯一的区别在于前者打包完产物会写入磁盘，而后者不会）。

所以，真正进行打包的过程会在 Output 阶段进行，即在 bundle 对象的 generate 或者 write 方法中进行。还是以上面的 demo 为例，稍稍改动一下构建逻辑:

```javascript
const rollup = require('rollup');

async function build() {
  const bundle = await rollup.rollup({
    input: ['./src/index.js'],
  });
  const result = await bundle.generate({
    format: 'es',
  });
  console.log('result:', result);
}

build();
```

执行后可以得到如下的输出:

```javascript
{
  output: [
    {
      exports: [],
      facadeModuleId: '/Users/code/rollup-demo/src/index.js',
      isEntry: true,
      isImplicitEntry: false,
      type: 'chunk',
      code: 'const a = 1;\n\nconsole.log(a);\n',
      dynamicImports: [],
      fileName: 'index.js',
      // 其余属性省略
    }
  ]
}
```

生成的 output 数组即为打包完成的结果。当然，如果使用 bundle.write 会根据配置将最后的产物写入到指定的磁盘目录中。

因此，**对于一次完整的构建过程而言， Rollup 会先进入到 Build 阶段，解析各模块的内容及依赖关系，然后进入** Output **阶段，完成打包及输出的过程**。

对于不同的阶段，Rollup 插件会有不同的插件工作流程，接下来就来拆解一下 Rollup 插件在 Build 和 Output 两个阶段的详细工作流程

### 插件 Hook 的类型

在具体讲述 Rollup 插件工作流之前，介绍一下不同插件 Hook 的类型。插件的各种 Hook 可以根据这两个构建阶段分为两类: Build Hook 与 Output Hook 。

- Build Hook 即在 Build 阶段执行的钩子函数，在这个阶段主要进行模块代码的转换、AST 解析以及模块依赖的解析，那么这个阶段的 Hook 对于代码的操作粒度一般为 模块 级别，也就是单文件级别。
- Output Hook (官方称为 Output Generation Hook )，则主要进行代码的打包，对于代码而言，操作粒度一般为 chunk 级别(一个 chunk 通常指很多文件打包到一起的产物)。

除了根据构建阶段可以将 Rollup 插件进行分类，根据不同的 Hook 执行方式也会有不同的分类，主要包括 Async 、 Sync 、 Parallel 、 Sequential 、 First 这五种

**1. Async & Sync**

首先是 Async 和 Sync 钩子函数，两者其实是相对的，分别代表 异步 和 同步 的钩子函数，两者最大的区别在于同步钩子里面不能有异步逻辑，而异步钩子可以有

**2. Parallel 并行** 

并行的钩子函数。如果有多个插件实现了这个钩子的逻辑，一旦有钩子函数是异步逻辑，则并发执行钩子函数，不会等待当前钩子完成(底层使用 Promise.all )。

比如对于 Build 阶段的 buildStart 钩子，它的执行时机其实是在构建刚开始的时候，各个插件可以在这个钩子当中做一些状态的初始化操作，但其实插件之间的操作并不是相互依赖的，也就是可以并发执行，从而提升构建性能。反之，对于需要**依赖其他插件处理结果**的情况就不适合用 Parallel 钩子了，比如 transform

**3. Sequential 串行**

**Sequential** 指串行的钩子函数。这种 Hook 往往适用于插件间处理结果相互依赖的情况，前一个插件 Hook 的返回值作为后续插件的入参，这种情况就需要等待前一个插件执行完 Hook，获得其执行结果，然后才能进行下一个插件相应 Hook 的调用，如 transform

**4. First**

如果有多个插件实现了这个 Hook，那么 Hook 将依次运行，直到返回一个非 null 或非 undefined 的值为止。比较典型的 Hook 是 resolveId ，一旦有插件的 resolveId 返回了一个路径，将停止执行后续插件的 resolveId 逻辑

实际上不同的类型是可以叠加的， Async/Sync 可以搭配后面三种类型中的任意一种，比如一个 Hook 既可以是 Async 也可以是 First 类型，接着我们将来具体分析 Rollup 当中的插件工作流程，

### 拆解插件工作流

#### Build 阶段工作流

首先分析 Build 阶段的插件工作流程。对于 Build 阶段，插件 Hook 的调用流程如下图所示。流程图的最上面声明了不同 Hook 的类型，也就是上面总结的 5 种 Hook 分类，每个方块代表了一个 Hook

<img src="https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403212259272.png" alt="image-20240321225936121" style="zoom:50%;" />

1. 首先经历 options 钩子进行配置的转换，得到处理后的配置对象
2. 随之 Rollup 会调用 buildStart 钩子，正式开始构建流程
3. Rollup 先进入到 resolveId 钩子中解析文件路径。(从 input 配置指定的入口文件开始)
4. Rollup 通过调用 load 钩子加载模块内容
5. 紧接着 Rollup 执行所有的 transform 钩子来对模块内容进行进行自定义的转换，比如 babel 转译
6. 现在 Rollup 拿到最后的模块内容，进行 AST 分析，得到所有的 import 内容，调用 moduleParsed 钩子:
   1. 如果是普通的 import，则执行 resolveId 钩子，继续回到步骤 3 
   2. 如果是动态 import，则执行 resolveDynamicImport 钩子解析路径，如果解析成功，则回到步骤 4 加载模块，否则回到步骤 3 通过 resolveId 解析路径
7. 直到所有的 import 都解析完毕，Rollup 执行 buildEnd 钩子，Build 阶段结束

当然，在 Rollup 解析路径的时候，即执行 resolveId 或者 resolveDynamicImport 的时候，有些路径可能会被标记为 external (翻译为 排除 )，也就是说不参加 Rollup 打包过程，这个时候就不会进行 load 、 transform 等等后续的处理了。

watchChange 和 closeWatcher 这两个 Hook，是对应了 rollup 的 watch 模式。当你使用 `rollup --watch`   指令或者在配置文件配有 `watch: true` 的属性时，代表开启了 Rollup 的 watch 打包模式，这个时候 Rollup 内部会初始化一个 watcher 对象，当文件内容发生变化时，watcher 对象会自动触发 watchChange 钩子执行并对项目进行重新构建

在当前**打包过程结束**时，Rollup 会自动清除 watcher 对象调用 closeWatcher 钩子。

#### Output 阶段工作流

Output 阶段阶段的 Hook 相比于 Build 阶段稍微多一些，流程上也更加复杂。需要注意的是，其中会涉及的 Hook 函数比较多，可能会给你理解整个流程带来一些困扰，因此在 Hook 执行的阶段解释其大致的作用和意义，关于具体的使用可以去 Rollup 的官网自行查阅，毕竟这里的主线还是分析插件的执行流程，掺杂太多的使用细节反而不易于理解

<img src="https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403212313080.png" alt="image-20240321231335745" style="zoom:50%;" />

1. 执行所有插件的 outputOptions 钩子函数，对 output 配置进行转换
2. 并发执行 renderStart 钩子，正式开始打包
3. 并发执行所有插件的 banner 、 footer 、 intro 、 outro 钩子(底层用 Promise.all 包裹所有的这四种钩子函数)，这四个钩子功能很简单，就是往打包产物的固定位置 (比如头部和尾部)插入一些自定义的内容，比如协议声明内容、项目介绍等等
4. 从入口模块开始扫描，针对动态 import 语句执行 renderDynamicImport 钩子，来自定义动态 import 的内容
5. 对每个即将生成的 chunk ，执行 augmentChunkHash 钩子，来决定是否更改 chunk 的哈希值，在 watch 模式下即可能会多次打包的场景下，这个钩子会比较适用。
6. 如果没有遇到 import.meta 语句，则进入下一步，否则:
   1. 对于 import.meta.url 语句调用 resolveFileUrl 来自定义 url 解析逻辑
   2. 对于其他 import.meta 属性，则调用 resolveImportMeta 来进行自定义的解析

7. 接着 Rollup 会生成所有 chunk 的内容，针对每个 chunk 会依次调用插件的 renderChunk 方法进行自定义操作，也就是说，在这里时候你可以直接操作打包产物了

8. 随后会调用 generateBundle 钩子，这个钩子的入参里面会包含所有的打包产物信息，包括 chunk (打包后的代码)、 asset (最终的静态资源文件)。可以在这里删除一些 chunk 或者 asset，最终这些内容将不会作为产物输出

前面提到了 rollup.rollup 方法会返回一个 bundle 对象，这个对象是包含 generate 和 write 两个方法，两个方法唯一的区别在于后者会将代码写入到磁盘中，同时会触发 writeBundle 钩子，传入所有的打包产物信息，包括 chunk 和 asset，和 generateBundle 钩子非常相似。不过值得注意的是，这个钩子执行的时候，产物已经输出了，而 generateBundle 执行的时候产物还并没有输出。顺序如下所示:

```javascript
generateBundle --> 输出产物到磁盘--> writeBundle
```

当上述的 bundle 的 close 方法被调用时，会触发 closeBundle 钩子，到这里Output 阶段正式结束

> 注意: 当打包过程中任何阶段出现错误，会触发 renderError 钩子，然后执行 closeBundle钩子结束打包

## 常用 Hook 实战

20% 的 API 应对 80% 的场景，这放在 Rollup 当中仍然是适用的。经常使用到的 Hook 也并不多，况且 Rollup 插件的写法也非常简单，至少比 Webpack 插件要容易的多，因此掌握 Rollup 的插件开发难度并不大。其次，**学会模仿**也特别重要。观察和模仿别人优秀的实现不失为一种高效的学习方法

### 路径解析 resolveId

resolveId 钩子一般用来解析模块路径，为 Async + First 类型即 异步优先 的钩子。拿官方的 alias 插件来说明，这个插件用法演示如下:

```javascript
// rollup.config.js
import alias from '@rollup/plugin-alias';

export default {
  input: 'src/index.js',
  output: {
    dir: 'output',
    format: 'cjs'
  },
  plugins: [
    alias({
      entries: [
        // 将把 import xxx from module-a 转换为 import xxx from './module-a'
        { find: 'module-a', replacement: './module-a.js' },
      ]
    })
  ]
};
```

插件的代码简化后如下:

```javascript
export default function alias(options) {
  // 获取 entries 配置
  const entries = getEntries(options);
  return {
    // 传入三个参数，当前模块路径、引用当前模块的模块路径、其余参数
    resolveId(importee, importer, resolveOptions) {
      // 先检查能不能匹配别名规则
      const matchedEntry = entries.find((entry) => matches(entry.find, importee));
      // 如果不能匹配替换规则，或者当前模块是入口模块，则不会继续后面的别名替换流程
      if (!matchedEntry || !importer) {
        // return null 后，当前的模块路径会交给下一个插件处理
        return null;
      }
      // 正式替换路径
      const updatedId = normalizeId(
        importee.replace(matchedEntry.find, matchedEntry.replacement)
      );
      // 每个插件执行时都会绑定一个上下文对象作为 this
      // 这里的 this.resolve 会执行所有插件(除当前插件外)的 resolveId 钩子
      return this.resolve(
        updatedId,
        importer,
        Object.assign({ skipSelf: true }, resolveOptions)
      ).then((resolved) => {
        // 替换后的路径即 updateId 会经过别的插件进行处理
        let finalResult: PartialResolvedId | null = resolved;
        if (!finalResult) {
          // 如果其它插件没有处理这个路径，则直接返回 updateId
          finalResult = { id: updatedId };
        }
        return finalResult;
      });
    }
  }
}
```

从这里你可以看到 resolveId 钩子函数的一些常用使用方式，它的入参分别是当前模块路径、引用当前模块的模块路径、解析参数，返回值可以是 null、string 或者一个对象

- 返回值为 null 时，会默认交给下一个插件的 resolveId 钩子处理
- 返回值为 string 时，则停止后续插件的处理。这里为了让替换后的路径能被其他插件处理，特意调用了 this.resolve 来交给其它插件处理，否则将不会进入到其它插件的处理
- 返回值为一个对象，也会停止后续插件的处理，不过这个对象就可以包含更多的信息了，包括解析后的路径、是否被 external、是否需要 tree-shaking 等等，不过大部分情况下返回一个 string 就够用了

### load

load 为 Async + First 类型，即**异步优先**的钩子，和 resolveId 类似。它的作用是通过 resolveId 解析后的路径来加载模块内容。以官方的 image 插件 为例来介绍一下 load 钩子的使用。源码简化后如下所示:

```javascript
const mimeTypes = {
  '.jpg': 'image/jpeg',
  // 后面图片类型省略
};

export default function image(opts = {}) {
  const options = Object.assign({}, defaults, opts);
  return {
    name: 'image',
    load(id) {
      const mime = mimeTypes[extname(id)];
      if (!mime) {
        // 如果不是图片类型，返回 null，交给下一个插件处理
        return null;
      }
      // 加载图片具体内容
      const isSvg = mime === mimeTypes['.svg'];
      const format = isSvg ? 'utf-8' : 'base64';
      const source = readFileSync(id, format).replace(/[\r\n]+/gm, '');
      const dataUri = getDataUri({ format, isSvg, mime, source });
      const code = options.dom ? domTemplate({ dataUri }) : constTemplate({ dataUri });
      return code.trim();
    }
  };
}
```

load 钩子的入参是模块 id，返回值一般是 null、string 或者一个对象：

- 如果返回值为 null，则交给下一个插件处理
- 如果返回值为 string 或者对象，则终止后续插件的处理
- 如果是对象可以包含SourceMap、AST 等更详细的信息

### 代码转换: transform

transform 钩子也是非常常见的一个钩子函数，为 Async + Sequential 类型，也就是 异步串行 钩子，作用是对加载后的模块内容进行自定义的转换。以官方的 replace 插件为例，这个插件的使用方式如下:

```javascript
// rollup.config.js
import replace from '@rollup/plugin-replace';
module.exports = {
  input: 'src/index.js',
  output: {
    dir: 'output',
    format: 'cjs'
  },
  plugins: [
    // 将会把代码中所有的 __TEST__ 替换为 1
    replace({
      __TEST__: 1
    })
  ]
};
```

内部实现也并不复杂，主要通过字符串替换来实现，核心逻辑简化如下:

```javascript
import MagicString from 'magic-string';
export default function replace(options = {}) {
  return {
    name: 'replace',
    transform(code, id) {
      // 省略一些边界情况的处理
      // 执行代码替换的逻辑，并生成最后的代码和 SourceMap
      return executeReplacement(code, id);
    }
  }
}

function executeReplacement(code, id) {
  const magicString = new MagicString(code);
  // 通过 magicString.overwrite 方法实现字符串替换
  if (!codeHasReplacements(code, id, magicString)) {
    return null;
  }
  const result = { code: magicString.toString() };
  if (isSourceMapEnabled()) {
    result.map = magicString.generateMap({ hires: true });
  }
  // 返回一个带有 code 和 map 属性的对象
  return result;
}
```

transform 钩子的入参分别为 模块代码 、 模块 ID ，返回一个包含 code (代码内容) 和 map (SourceMap 内容) 属性的对象，当然也可以返回 null 来跳过当前插件的 transform 处理。需要注意的是，**当前插件返回的代码会作为下一个插件 transform 钩子的第一个入参**，实现类似于瀑布流的处理

### Chunk 级代码修改: renderChunk

继续以 replace 插件举例，在这个插件中，也同样实现了 renderChunk 钩子函数:

```javascript
export default function replace(options = {}) {
  return {
    name: 'replace',
    transform(code, id) {
      // transform 代码省略
    },
    renderChunk(code, chunk) {
      const id = chunk.fileName;
      // 省略一些边界情况的处理
      // 拿到 chunk 的代码及文件名，执行替换逻辑
      return executeReplacement(code, id);
    },
  }
}
```

可以看到这里 replace 插件为了替换结果更加准确，在 renderChunk 钩子中又进行了一次替换，因为后续的插件仍然可能在 transform 中进行模块内容转换，进而可能出现符合替换规则的字符串。

这里我们把关注点放到 renderChunk 函数本身，可以看到有两个入参，分别为 chunk 代码内容 、chunk 元信息，返回值跟 transform 钩子类似，既可以返回包含 code 和 map 属性的对象，也可以通过返回 null 来跳过当前钩子的处理。

### 产物生成 generateBundle

generateBundle 也是 异步串行 的钩子，可以在这个钩子里面自定义删除一些无用的 chunk 或者静态资源，或者自己添加一些文件。

以 Rollup 官方的 html 插件来具体说明，这个插件的作用是通过拿到 Rollup 打包后的资源来生成包含这些资源的 HTML 文件，源码简化后如下所示:

```javascript
export default function html(opts: RollupHtmlOptions = {}): Plugin {
  // 初始化配置
  return {
    name: 'html',
    async generateBundle(output: NormalizedOutputOptions, bundle: OutputBundle) {
      // 省略一些边界情况的处理
      // 1. 获取打包后的文件
      const files = getFiles(bundle);
      // 2. 组装 HTML，插入相应 meta、link 和 script 标签
      const source = await template({ attributes, bundle, files, meta, publicPath, title});
      // 3. 通过上下文对象的 emitFile 方法，输出 html 文件
      const htmlFile: EmittedAsset = {
        type: 'asset',
        source,
        name: 'Rollup HTML Asset',
        fileName
      };
      this.emitFile(htmlFile);
    }
  }
}
```

入参分别为 output 配置 、所有打包产物的元信息对象，通过操作元信息对象你可以删除一些不需要的 chunk 或者静态资源，也可以通过 插件上下文对象的 emitFile 方法输出自定义文件。

Vite 的插件机制也是基于 Rollup 来实现的，像上面介绍的这些常用钩子在 Vite 当中也随处可见，因此，掌握了这些常用钩子，也相当于给 Vite 插件的学习做下了很好的铺垫