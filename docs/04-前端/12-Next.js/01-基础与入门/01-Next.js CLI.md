---
title: Next.js CLI
description: Next.js 命令行工具的完整使用指南，涵盖 dev、build、start、lint、info 等全部命令及参数
keywords: [CLI, dev, build, start, lint, 命令行]
category: Next.js
tags: [Next.js]
---

# Next.js CLI

Next.js 提供了开箱即用的 `create-next-app` 脚手架，内置支持 TypeScript、ESLint 等功能，零配置即可实现自动编译和打包。

创建 Next.js 项目有自动创建和手动创建两种方式，日常开发依赖一组脚本命令，这些脚本背后的执行者是 `next` 命令，即 Next.js CLI。

## 1. 自动创建项目

### 1.1. 环境要求

Next.js 14 需要 [Node.js 18.17](https://nodejs.org/en) 及以后版本，支持 macOS、Windows、Linux 系统。

### 1.2. 创建项目

最快捷的创建 Next.js 项目的方式是使用 `create-next-app` 脚手架，只需运行：

```bash
npx create-next-app@latest
```

执行后会出现一系列操作提示，比如设置项目名称、是否使用 TypeScript、是否开启 ESLint、是否使用 Tailwind CSS 等，按实际需求选择即可。不确定如何选择时，遵循默认选择即可，这些选项的作用会在后续开发中逐步体现。

注：为降低上手成本，Next.js 入门示例通常不使用 TypeScript。（TypeScript 学习可参考 [TypeScript 官方文档](https://juejin.cn/column/7029490086710345742)）

完成选择之后，`create-next-app` 会自动创建项目文件并安装依赖。

如果不使用 `npx`，也支持使用 `yarn`、`pnpm`、`bunx`：

```javascript
yarn create next-app
```

```javascript
pnpm create next-app
```

```javascript
bunx create-next-app
```

### 1.3. 运行项目

查看项目根目录 `package.json` 文件的代码：

```javascript
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
```

脚本命令有 `dev`、`build`、`start`、`lint`，分别对应开发、构建、运行、代码检查。

开发时使用 `npm run dev`。部署时先使用 `npm run build` 构建生产代码，再执行 `npm run start` 运行生产项目。运行 `npm run lint` 则会执行 ESLint 语法检查。

执行 `npm run dev` 后，命令行会提示运行在 `3000` 端口，在浏览器打开页面 [http://localhost:3000/](http://localhost:3000/)，看到 Next.js 欢迎页面即表示项目成功运行。

**注：为了避免浏览器插件带来的影响，建议在无痕模式下测试页面。**

### 1.4. 示例代码

Next.js 提供了丰富的示例代码，比如 `with-redux`、`api-routes-cors`、`with-electron`、`with-jest`、`with-markdown`、`with-material-ui`、`with-mobx`。从这些名字中可以看出，这些示例代码演示了 Next.js 的各种使用场景，比如 `with-redux` 就演示了 Next.js 如何与 redux 搭配使用。

示例代码列表可在 <https://github.com/vercel/next.js/tree/canary/examples> 查看。如果要直接使用某个示例代码，比如 `with-redux`，无须手动 clone 代码，在创建项目的时候使用 `--example` 参数即可直接创建：

```bash
npx create-next-app --example with-redux your-app-name
```

注：使用示例代码创建项目时，并不会像执行 `npx create-next-app` 时那样提示是否使用 TypeScript、ESLint 等，而是会直接进入项目创建和依赖安装阶段。

## 2. 手动创建项目

大多数场景并不需要手动创建 Next.js 项目，但了解这个过程有助于认识一个最基础的 Next.js 项目依赖哪些东西。

### 2.1. 创建文件夹并安装依赖

创建一个文件夹，假设名为 `next-app-manual`，`cd` 进入该目录，安装依赖：

```bash
npm install next@latest react@latest react-dom@latest
```

npm 会自动创建 `package.json` 并安装依赖项。

### 2.2. 添加 scripts

打开 `package.json`，添加以下内容：

```javascript
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

### 2.3. 创建目录

在 `next-app-manual` 下新建 `app` 文件夹，`app` 下新建 `layout.js` 和 `page.js` 文件，代码如下：

```javascript
// app/layout.js
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
```

```javascript
// app/page.js
export default function Page() {
  return <h1>Hello, Next.js!</h1>
}
```

### 2.4. 运行项目

运行 `npm run dev`，页面正常渲染出 `Hello, Next.js!` 则表示运行成功。

## 3. Next.js CLI

从 `package.json` 中的脚本定义可以看出：运行 `npm run dev` 的时候，实际执行的是 `next dev`。`next` 命令来自 Next.js CLI，Next.js CLI 用于启动、构建和导出项目。

完整的 CLI 命令可通过 `npx next -h` 查看（`-h` 是 `--help` 的简写）。

`next` 可以执行的命令有多个，以下介绍最常用的一些。

注：使用 `npx` 创建项目的方式避免了全局安装 `create-next-app`，本地全局并无 `next` 命令。执行 `next` 命令时，可在 `next` 前加一个 `npx`，例如 `npx next -h`。

### 3.1. next build

执行 `next build` 将会创建项目的生产优化版本：

```bash
npx next build
```

从构建输出可以看到，构建时会输出每条路由的信息，比如 Size 和 First Load JS。这些值指的都是 gzip 压缩后的大小。其中 First Load JS 会用绿色、黄色、红色表示，绿色表示高性能，黄色或红色表示需要优化。

这里需要解释 Size 和 First Load JS 的含义。Next.js 项目的页面表现类似于单页应用，即路由跳转（称为“导航”）的时候，页面不会刷新，而是加载目标路由所需的资源然后展示，所以：

```md
加载目标路由一共所需的 JS 大小 = 每个路由都需要依赖的 JS 大小 + 目标路由单独依赖的 JS 大小
```

其中：
* 加载目标路由一共所需的 JS 大小就是 `First Load JS`
* 目标路由单独依赖的 JS 大小就是 `Size`
* 每个路由都需要依赖的 JS 大小就是构建输出中单独列出来的 `First load JS shared by all`

也就是说：

```md
First Load JS = Size + First load JS shared by all
```

以构建输出中的 `/` 路由地址为例，89 kB（First Load JS）= 5.16 kB（Size） + 83.9 kB（First load JS shared by all）

官方文档中的介绍是：

*   `Size`：导航到该路由时下载的资源大小，每个路由的大小只包括它自己的依赖项
*   `First Load JS`：加载该页面时下载的资源大小
*   `First load JS shared by all`：所有路由共享的 JS 大小会被单独列出来

访问生产版本的 [http://localhost:3000/](http://localhost:3000/)，通过浏览器 DevTools 的 Network 面板可以印证上面的数据：

每个页面都要加载的共享 JS，根据命令行中的输出，总共大小为 `83.9` kB，`413-dd2d1e77cac135ea.js` 和 `page-9a9638f75b922b0c.js` 是这个页面单独的 JS，总共大小为 `5.16` kB，页面加载的所有 JS 资源大小为 `89 kB`。（注：与构建输出中的数字没有完全一致，是因为本地没有开启 gzip 压缩）

#### next build --profile

该命令参数用于开启 React 的生产性能分析（需要 Next.js v9.5 以上）。

```bash
npx next build --profile
```

开启后即可像在开发环境中一样使用 React 的 `profiler` 功能。

> 注：实际执行的命令应是 `npx next build --profile`，而不是 `npm run build --profile`。实际上有三种方式可以开启：
> 1. 运行 `npx next build --profile`
> 2. 先修改 `package.json` 中的 `build` 脚本命令为：
> ```json
> {
>  "scripts": {
>     "build": "next build --profile"
>   }
> }
> ```
> 然后再运行 `npm run build`
> 
> 3. 运行 `npm run build -- --profile`，将 `--profile` 添加到 `--` 分隔符后，会将 `--profile` 作为参数传递给实际执行的命令，最终的命令还是 `next build --profile`
> 
> 后文的 `--debug` 参数使用也是同理

要使用该功能，首先[浏览器要装有 React 插件](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)，其次要对 React 的 [Profiler API](https://legacy.reactjs.org/docs/profiler.html) 有一定了解（其作用是测量组件渲染性能）。例如将 `page.js` 的代码改为：

```jsx
// app/page.js
import React from 'react'

export default function Page() {
  return (
    <React.Profiler id="hello">
      <p>hello app server</p>
    </React.Profiler>
  )
}
```

执行 `npm run dev`，在控制台里可以看到 Profiler 打印的组件渲染耗时信息。

通常执行 `npm run build` 和 `npm run start` 后，打开控制台会发现在生产环境中不支持性能测量。

但执行 `npx next build --profile` 再执行 `npm run start`，尽管 React 插件会显示当前在生产环境，Profiler 仍可以使用。

**该功能可用于排查线上的性能问题。**

#### next build --debug

该命令参数用于开启更详细的构建输出：

```bash
npx next build --debug
```

开启后，将输出额外的构建输出信息如 `rewrites`、`redirects`、`headers`。

举例说明，修改 `next.config.mjs` 文件：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/index',
        destination: '/',
        permanent: true,
      },
    ]
  },
  async rewrites() {
    return [
      {
        source: '/about',
        destination: '/',
      },
    ]
  }
}

export default nextConfig

```

再执行 `npx next build --debug`。

相比之前的构建输出信息，此时多了 `rewrites`、`redirects` 等信息。rewrites 与 redirects 分别用于请求改写与请求重定向，具体配置方式见 `next.config.js` 的 `redirects` 与 `rewrites` 配置项。

### 3.2. next dev

开发模式下，使用 `next dev` 运行程序（如需使用 Turbopack，可运行 `next dev --turbo`），会自动具有热加载、错误报告等功能。默认情况下，程序将在 `http://localhost:3000` 开启。更改端口号：

```bash
npx next dev -p 4000
```

更改主机名（hostname，以便其他主机访问）：

```bash
npx next dev -H 192.168.1.2
```

### 3.3. next start

生产模式下，使用 `next start` 运行程序，不过要先执行 `next build` 构建出生产代码。运行的时候，跟开发模式相同，程序默认开启在 `http://localhost:3000`。更改端口号：

```bash
npx next start -p 4000
```

### 3.4. next lint

执行 `next lint` 会为 `pages/`、`app/`、`components/`、`lib/`、`src/` 目录下的所有文件执行 ESLint 语法检查。如果没有安装 ESLint，该命令会提供一个安装指导。指定检查的目录：

```bash
npx next lint --dir utils
```

### 3.5. next info

`next info` 会打印当前系统相关的信息，可用于报告 Next.js 程序的 bug。在项目的根目录中执行：

```bash
npx next info
```

打印信息类似于：

```bash
Operating System:
  Platform: linux
  Arch: x64
  Version: #22-Ubuntu SMP Fri Nov 5 13:21:36 UTC 2021
Binaries:
  Node: 16.13.0
  npm: 8.1.0
  Yarn: 1.22.17
  pnpm: 6.24.2
Relevant packages:
  next: 12.0.8
  react: 17.0.2
  react-dom: 17.0.2
```

这些信息可以贴到 GitHub Issues 中方便 Next.js 官方人员排查问题。

## 实践要点

- 全新项目优先使用 `create-next-app` 自动创建；向已有项目引入 Next.js 时，参考手动创建流程，按需安装 `next`、`react`、`react-dom` 三个依赖。
- 疑难问题优先用最小 demo 复现验证，再对照构建输出与 DevTools 的 Network 面板确认资源加载是否符合预期。
- 报告 Next.js 相关 bug 时，附上 `next info` 的输出便于官方定位环境问题。

## 小结

本篇介绍了**自动创建**和**手动创建**两种创建项目的方式：全新的项目推荐使用自动创建方式；向已有项目引入 Next.js 时，可以参考手动创建项目的方式。

Next.js 项目常用的脚本有三个：
1. `npm run dev` 用于开发时使用
2. `npm run build` 用于构建生产版本
3. `npm run start` 用于运行生产版本

从 `package.json` 中可以看出，这些脚本背后用的是 Next.js CLI 的 `next` 命令。常用的 `next` 命令及相关参数（`next dev`、`next build` 及 `--profile`、`--debug`、`next start`、`next lint`、`next info`）在必要时可用于自定义 npm 脚本。


## 参考链接

1.  [Getting Started: Installation](https://nextjs.org/docs/getting-started/installation)
2.  [API Reference: create-next-app](https://nextjs.org/docs/app/api-reference/create-next-app)
3.  [API Reference: Next.js CLI](https://nextjs.org/docs/pages/api-reference/next-cli#next-info)
4.  [npm-run-script](https://docs.npmjs.com/cli/v10/commands/npm-run-script)
