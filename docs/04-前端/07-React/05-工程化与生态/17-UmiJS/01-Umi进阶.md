---
title: "Umi 进阶"
description: "Umi 进阶特性：Mock 数据模拟、代理解决跨域、CSS Modules 等样式方案、路由数据懒加载 clientLoader、环境变量配置。"
keywords: [Umi, Mock, proxy, clientLoader, 环境变量]
category: React
tags: [React, 工程化与生态, UmiJS]
---

# Umi 进阶

## Mock

Umi 提供了开箱即用的 Mock 功能，能够用方便简单的方式来完成 Mock 数据的设置

什么是 Mock 数据：在前后端约定好 API 接口以后，前端可以使用 Mock 数据来在本地模拟出 API 应该要返回的数据，这样一来前后端开发就可以同时进行，不会因为后端 API 还在开发而导致前端的工作被阻塞

### 目录约定

Umi 约定 `/mock` 目录下的所有文件为 Mock 文件，例如这样的目录结构

```text
.
├── mock
    ├── todos.ts
    ├── items.ts
    └── users.ts
└── src
    └── pages
        └── index.tsx
```

则 `/mock` 目录中的 `todos.ts`, `items.ts` 和 `users.ts` 就会被 Umi 视为 Mock 文件来处理

### Mock 文件

Mock 文件默认导出一个对象，而对象的每个 Key 对应了一个 Mock 接口，值则是这个接口所对应的返回数据，例如这样的 Mock 文件：

```ts
// ./mock/users.ts

export default {

  // 返回值可以是数组形式
  'GET /api/users': [
    { id: 1, name: 'foo' },
    { id: 2, name: 'bar' }
  ],

  // 返回值也可以是对象形式
  'GET /api/users/1': { id: 1, name: 'foo' },
}
```

就声明了两个 Mock 接口，透过 `GET /api/users` 可以拿到一个带有两个用户数据的数组，透过 `GET /api/users/1` 可以拿到某个用户的模拟数据

#### 请求方法

当 Http 的请求方法是 GET 时，可以省略方法部分，只需要路径即可，例如：

```ts
// ./mock/users.ts

export default {
  '/api/users': [
    { id: 1, name: 'foo' },
    { id: 2, name: 'bar' }
  ],

  '/api/users/1': { id: 1, name: 'foo' },
}
```

也可以用不同的请求方法，例如 `POST`，`PUT`，`DELETE`：

```ts
// ./mock/users.ts

export default {
  'POST /api/users': { result: 'true' },
  'PUT /api/users/1': { id: 1, name: 'new-foo' },
}
```

#### 自定义函数

除了直接静态声明返回值，也可以用函数的方式来声明如何计算返回值，例如：

```ts
export default {

  'POST /api/users/create': (req, res) => {
    // 添加跨域请求头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end('ok');
  }
}
```

关于 `req` 和 `res` 的 API 可参考 [Express@4 官方文档](https://expressjs.com/en/api.html) 来进一步了解

#### defineMock

另外，也可以使用 `defineMock` 类型帮助函数来提供编写 mock 对象的代码提示

```ts
import { defineMock } from "umi";

export default defineMock({

  "/api/users": [
    { id: 1, name: "foo" },
    { id: 2, name: "bar" },
  ],

  "/api/users/1": { id: 1, name: "foo" },

  "GET /api/users/2": (req, res) => {
    res.status(200).json({ id: 2, name: "bar" });
  },

});
```

`defineMock` 仅仅提供类型提示，入参与出参完全一致。

### 关闭 Mock

Umi 默认开启 Mock 功能，如果不需要的话可以从配置文件关闭：

```ts
// .umirc.ts

export default {
  mock: false,
};
```

或是用环境变量的方式关闭：

```bash
MOCK=none umi dev
```

### 引入 Mock.js

在 Mock 中我们经常使用 [Mock.js](http://mockjs.com/) 来帮我们方便的生成随机的模拟数据，如果你使用了 Umi 的 Mock 功能，建议你搭配这个库来提升模拟数据的真实性：

```ts
import mockjs from 'mockjs';


export default {

  // 使用 mockjs 等三方库
  'GET /api/tags': mockjs.mock({
    'list|100': [{ name: '@city', 'value|1-100': 50, 'type|0-2': 1 }],
  }),
};
```

### 其他配置

mock

- 类型：`{ exclude: string[], include: string[] }`
- 默认值：`{}`

关于参数：`exclude` 用于排除不需要的 mock 文件；`include` 用于额外添加 mock 目录之外的 mock 文件。

```js
// 让所有 pages 下的 _mock.ts 文件成为 mock 文件

mock: {
  include: ['src/pages/**/_mock.ts'],
}
```

注意：此功能默认开。配置 `mock: false` 关闭

## 代理

在项目开发（dev）中，所有的网络请求（包括资源请求）都会通过本地的 server 做响应分发，我们通过使用 [http-proxy-middleware](https://github.com/chimurai/http-proxy-middleware) 中间件，来代理指定的请求到另一个目标服务器上。如请求 `fetch('/api')` 来取到远程 `http://jsonplaceholder.typicode.com/` 的数据

要实现上述的需求我们只需要在配置文件中使用 proxy 配置：

```ts
export default {

  proxy: {
    '/api': {
      'target': 'http://jsonplaceholder.typicode.com/',
      'changeOrigin': true,
      'pathRewrite': { '^/api' : '' },
    },
  },
}
```

上述配置表示，将 `/api` 前缀的请求，代理到 `http://jsonplaceholder.typicode.com/`，替换请求地址中的 `/api` 为 `''`，并且将请求来源修改为目标url。如请求 `/api/a`，实际上是请求 `http://jsonplaceholder.typicode.com/a`

一般我们使用这个能力来解开发中的跨域访问问题。由于浏览器（或者 webview）存在同源策略，之前我们会让服务端配合使用 Cross-Origin Resource Sharing (CORS) 策略来绕过跨域访问问题。现在有了本地的 node 服务，我们就可以使用代理来解决这个问题。

> XMLHttpRequest cannot load [https://api.example.com](https://api.example.com/). No 'Access-Control-Allow-Origin' header is present on the requested resource. Origin '[http://localhost:8000](http://localhost:8000/)' is therefore not allowed access.

原理其实很简单，就是浏览器上有跨域问题，但是服务端没有跨域问题。我们请求同源的本地服务，然后让本地服务去请求非同源的远程服务。

需要注意的是，请求代理，代理的是请求的服务，不会直接修改发起的请求 url。它只是将目标服务器返回的数据传递到前端。所以你在浏览器上看到的请求地址还是 `http://localhost:8000/api/a`。

值得注意的是 proxy 暂时只能解开发时（dev）的跨域访问问题，可以在部署时使用同源部署。如果在生产上（build）的发生跨域问题的话，可以将类似的配置转移到 Nginx 容器上

## 样式

本文介绍各种在 Umi 项目中使用样式的方式。

### 使用 CSS 样式

在 Umi 项目中使用 `.css` 文件声明各种样式，然后在 `.js` 文件中引入即可生效

例如，在 `src/pages/index.css` 文件按照以下代码声明 `.title` 类的样式为红色：

```css
.title {
  color: red;
}
```

然后在 `src/pages/index.tsx` 文件中引入即可生效。

```jsx
// src/pages/index.tsx

import './index.css';

export default function () {
  return <div className="title">Hello World</div>;
}
```

按照这种引入方式的样式会在整个 Umi 项目中生效，即无论你从哪个 `.js` 文件引入，他声明的样式可以在任何页面和组件中使用。如果你想要避免这种情况，可以使用 [CSS Modules](https://umijs.org/docs/guides/styling#使用-css-modules) 的功能来限制样式的作用域

### 使用 CSS Modules

在 `js` 文件中引入样式时，如果赋予他一个变量名，就可以将样式以 CSS Module 的形式引入

```jsx
// src/pages/index.tsx
import styles from './index.css';

export default function () {
  return <div className={styles.title}>
    Hello World
  </div>;
}
```

上面的示例中，`index.css` 文件中声明的样式不会对全局样式造成影响，只会对从 `styles` 变量中使用的样式生效

### 使用 CSS 预处理器

Umi 默认支持 LESS (推荐)，SASS 和 SCSS 样式的导入，你可以直接按照引入 CSS 文件的方式引入并使用这些由 CSS 预处理器处理的样式。

> 在 Umi 中使用 Sass(Scss) 需要额外安装预处理依赖 如: `npm add -D sass`

```jsx
// src/pages/index.tsx

import './index.less';
import './index.sass';
import './index.scss';

export default function () {
  return <div className="title">Hello World</div>;
}
```

同样也支持 CSS Module 的用法：

```jsx
// src/pages/index.tsx
import lessStyles from './index.less';
import sassStyles from './index.sass';
import scssStyles from './index.scss';

export default function () {
  return <div className={lessStyles.title}>
    Hello World
    <p className={sassStyles.blue}>I am blue</p>
    <p className={scssStyles.red}>I am red</p>
  </div>;
}
```

Umi 也同时提供了对 `.styl` 和 `.stylus` 文件的内置支持。使用必须安装 `stylus` 相应的预处理器依赖, 其他用法用上面的例子

```bash
# .styl and .stylus
npm add -D stylus
```

### 进阶设置

如果你需要使用除了常见的 LESS, SASS 或 SCSS 以外的其他样式预处理器，你可以透过 Umi 插件提供的 [chainWebpack 接口](https://umijs.org/docs/api/config#chainwebpack)来加入自己需要的 Loader

### 使用 Tailwindcss

Umi 提供了内置的 [Tailwindcss](https://tailwindcss.com/) 插件，并且可以直接方便地使用 [微生成器](https://umijs.org/docs/guides/generator#tailwind-css-配置生成器) 来启用

### 使用 UnoCSS

与 Tailwindcss 相同，Umi 也提供了内置的 [UnoCSS](https://github.com/unocss/unocss) 插件，可以按照相同方式开启

1. 安装 `plugin-unocss`

2. 安装 `unocss` 及 `@unocss/cli`

```bash
pnpm i unocss @unocss/cli
```

3. 在 Umi 设置中启用插件，并声明会用到 `unocss` 的文件目录

```js
// .umirc.ts
export default {
  plugins: [
    require.resolve('@umijs/plugins/dist/unocss')
  ],
  unocss: {
    // 检测 className 的文件范围，若项目不包含 src 目录，可使用 `pages/**/*.tsx`
    watch: ['src/**/*.tsx']
  },
};
```

4. 在项目目录下加入 `unocss.config.ts` 配置文件，并加入项目需要的 [UnoCSS Presets](https://github.com/unocss/unocss#presets)

```js
// unocss.config.ts
import {defineConfig, presetAttributify, presetUno} from 'unocss';

export function createConfig({strict = true, dev = true} = {}) {
  return defineConfig({
    envMode: dev ? 'dev' : 'build', presets: [presetAttributify({strict}), presetUno()],
  });
}
export default createConfig();
```

5. 启动项目进行开发，插件会监听设置文件中的 `unocss.watch` 字段，动态生成样式文件并自动套用

## 路由数据懒加载

Umi 提供了开箱即用的数据预加载方案，能够解决在多层嵌套路由下，页面组件和数据依赖的瀑布流请求。Umi 会自动根据当前路由或准备跳转的路由，并行地发起他们的数据请求，因此当路由组件加载完成后，已经有马上可以使用的数据了。

### 启用方式

配置开启：

```ts
// .umirc.ts

export default {
  clientLoader: {}
}
```

### 使用方式

在路由文件中，除了默认导出的页面组件外，再导出一个 `clientLoader` 函数，并且在该函数内完成路由数据加载的逻辑。

```tsx
// pages/.../some_page.tsx
import { useClientLoaderData } from 'umi';

export default function SomePage() {
  const { data } = useClientLoaderData();
  return <div>{data}</div>;
}

export async function clientLoader() {
  const data = await fetch('/api/data');
  return data;
}
```

如上代码，在 `clientLoader` 函数返回的数据，可以在组件内调用 `useClientLoaderData` 获取

### 优化效果

考虑一个三层嵌套路由的场景：

1. 我们需要先等第一层路由的组件加载完成，然后第一层路由的组件发起数据请求
2. 第一层路由的数据请求完成后，开始请求第二层路由的组件，第二层路由的组件加载好以后请求第二层路由需要的数据
3. 第二层路由的数据请求完成后，开始请求第三层路由的组件，第三层路由的组件加载好以后请求第三层路由需要的数据
4. 第三层路由的数据请求完成后，整个页面才完成渲染

这样的瀑布流请求会严重影响用户的体验，如下图所示：

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202311061151054.gif)

如果将组件请求数据的程序提取到 `clientLoader` 中，则 Umi 可以并行地请求这些数据：

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202311061151627.gif)



## 开启TypeScript

Umi 默认开启 TypeScript，如果是使用官方脚手架创建项目，内置的文件是以 `xx.(ts|tsx)` 为主的

如果想要在配置时拥有 TypeScript 语法提示，可以在配置的地方包一层 `defineConfig()`：

```ts
// .umirc.ts
import { defineConfig } from 'umi';

export default defineConfig({
  routes: [
    { path: '/', component: '@/pages/index' },
  ],
});
```

![defineConfig](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202311061154649.png)

## 环境变量

Umi 可以通过环境变量来完成一些特殊的配置和功能

### 如何设置环境变量

#### 执行命令时设置

例如需要改变 `umi dev` 开发服务器的端口，即可以通过如下命令实现

```bash
# OS X, Linux
$ PORT=3000 umi dev

# Windows (cmd.exe)
$ set PORT=3000&&umi dev
```

如果需要同时在不同的操作系统中使用环境变量，推荐使用工具 [cross-env](https://github.com/kentcdodds/cross-env)

```bash
$ pnpm install cross-env -D

$ cross-env PORT=3000 umi dev
```

#### 设置在 .env 文件中

如果你的环境变量需要在开发者之间共享，推荐你设置在项目根目录的 `.env` 文件中，例如:

```bash
# .env

PORT=3000
BABEL_CACHE=none
```

然后执行

```bash
$ umi dev
```

`umi` 会以 3000 端口启动 dev server，并且禁用 babel 的缓存

如果你有部分环境变量的配置在本地要做特殊配置，可以配置在 `.env.local` 文件中去覆盖 `.env` 的配置。比如在之前的 `.env` 的基础上, 你想本地开发覆盖之前 3000 端口, 而使用 4000 端口

```bash
# .env.local

PORT=4000
```

`umi` 会以 4000 端口启动 dev server，同时保持禁用 babel 的缓存。

此外 `umi` `.env` 文件中还支持变量的方式来配置环境变量。例如：

```bash
# .env.local

FOO=foo
BAR=bar

# CONCAT=foobar
CONCAT=$FOO$BAR 
```

> 不建议将 `.env.local` 加入版本管理中

### 环境变量列表

按字母顺序排列

#### APP_ROOT

指定项目根目录。

> APP_ROOT 不能配在 `.env`  中，只能在命令行里添加

#### ANALYZE

用于分析 bundle 构成，默认关闭。

```bash
$ ANALYZE=1 umi dev

# 或者
$ ANALYZE=1 umi build
```

可以通过 `ANALYZE_PORT` 环境变量自定义端口或 [`analyze`](https://umijs.org/docs/api/config#analyze) 选项自定义配置

#### BABEL_POLYFILL

默认会根据 targets 配置打目标浏览器的全量补丁，设置为 `none` 禁用内置的补丁方案

#### COMPRESS

默认压缩 CSS 和 JS，值为 none 时不压缩，build 时有效。

#### DID_YOU_KNOW

设置为 `none` 会禁用「你知道吗」提示。

#### ERROR_OVERLAY

设置为 `none` 会禁用「Error Overlay」，在调试 Error Boundary 时会有用。

#### FS_LOGGER

默认会开启保存物理日志，值为 none 时不保存，同时针对 webcontainer 场景（比如 stackblitz）暂不保存。

#### HMR

默认开启 HMR 功能，值为 none 时关闭。

#### HOST

默认是 `0.0.0.0`

#### PORT

指定端口号，默认是 `8000`

#### SOCKET_SERVER

指定用于 HMR 的 socket 服务器

```bash
SOCKET_SERVER=http://localhost:8000/ umi dev
```

#### SPEED_MEASURE

分析 Webpack 编译时间，支持 `CONSOLE` 和 `JSON` 两种格式，默认是 `CONSOLE`

```bash
$ SPEED_MEASURE=JSON umi dev
```

#### UMI_ENV

当指定 `UMI_ENV` 时，会额外加载指定值的配置文件，优先级为：

- `config.ts`
- `config.${UMI_ENV}.ts`
- `config.${dev | prod | test}.ts`
- `config.${dev | prod | test}.${UMI_ENV}.ts`
- `config.local.ts`

若不指定 `UMI_ENV` ，则只会加载当前环境对应的配置文件，越向下的越具体，优先级更高，高优的配置可以往下移动

> 注：根据当前环境的不同，`dev`, `prod`, `test` 配置文件会自动加载，不能将 `UMI_ENV` 的值设定成他们

#### UMI_PLUGINS

指定 `umi` 命令执行时额外加载的插件的路径，使用 `,` 隔开

```bash
$ UMI_PLUGINS=./path/to/plugin1,./path/to/plugin2  umi dev
```

#### UMI_PRESETS

指定 `umi` 命令执行时额外加载插件集的路径，使用 `,` 隔开

```bash
$ UMI_PRESETS=./path/to/preset1,./path/to/preset2  umi dev
```

#### WEBPACK_FS_CACHE_DEBUG

开启 webpack 的物理缓存 debug 日志

```bash
$ WEBPACK_FS_CACHE_DEBUG=1 umi dev
```