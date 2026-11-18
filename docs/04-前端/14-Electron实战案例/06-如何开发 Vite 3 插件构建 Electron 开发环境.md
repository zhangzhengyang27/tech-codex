---
title: 如何开发 Vite 3 插件构建 Electron 开发环境
description: "手写 Vite 3 插件构建 Vue3 + Electron 开发环境：用 esbuild 编译主进程、configureServer 钩子拉起 Electron 子进程，并借助 vite-plugin-optimizer 让渲染进程使用 Electron 与 Node.js 内置模块。"
keywords: [如何开发, Vite, 插件构建, Electron, 开发环境]
category: Electron
tags: [Electron, 桌面应用, IPC, 打包]
---


# 如何开发 Vite 3 插件构建 Electron 开发环境？

## 背景与问题

开发新版本 Vue 项目推荐使用 Vite 脚手架构建开发环境，然而 Vite 脚手架更倾向于构建纯 Web 页面，而不是桌面应用，因此`开发者要做很多额外的配置和开发工作才能把 Electron 引入到 Vue 项目中`，这也是很多开发者都基于开源工具来构建 Electron+Vue 的开发环境的原因。

但这样做有`两个问题`：第一个是这些开源工具封装了很多技术细节，导致开发者想要修改某项配置非常不方便；另一个是这些开源工具的实现方式也存在一定的局限。

因此，建议尽量**自己写代码构建 Electron+Vue 的开发环境**，这样可以更从容地控制整个项目。

可按如下几个步骤构建一个 Vite+Electron 的开发环境：



## 创建项目

首先通过命令行创建一个 Vue 项目：

```bash
npm create vite@latest electron-jue-jin -- --template vue-ts
```

接着安装 Electron 开发依赖：

```bash
npm install electron -D
```

安装完成后，项目根目录下的 package.json 文件应该与下面大体类似：

```json
{
  "name": "electron-jue-jin",
  "private": true,
  "version": "0.0.1",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview"
  },
  "dependencies": {},
  "devDependencies": {
    "vue": "^3.2.37",
    "@vitejs/plugin-vue": "^3.0.0",
    "electron": "^19.0.8",
    "typescript": "^4.6.4",
    "vite": "^3.0.0",
    "vue-tsc": "^0.38.4"
  }
}
```

注意：这里**把 vue 从 dependencies 配置节移至了 devDependencies 配置节**。这是因为在 Vite 编译项目的时候，Vue 库会被编译到输出目录下，输出目录下的内容是完整的，没必要把 Vue 标记为生产依赖；而且在将来制作安装包的时候，还要用到这个 package.json 文件，它的生产依赖里不应该有没用的东西，因此做了这些调整。

> 注意：如果 package.json 里有 type:module 的配置项，那么应该把它删掉。
> package.json 里的 type 定义了这个项目所有.js 文件的处理方式。如果 type 的值为 module，那么所有.js 文件将被当做 ES Modules 对待（不能让脚手架这么做）。如果 type 的值为 commonjs，那么所有.js 文件将被当做 CommonJS 模块对待。如果没有设置 type，那么它的默认值为 commonjs。不管 type 字段的值是什么，.mjs 文件总是会被当做 ES Modules 对待，.cjs 文件总是会当做 CommonJS 对待。

到这里，一个基本的 Vue+TypeScript 的项目就创建完成了，接下来为这个项目引入 Electron 模块。

## 创建主进程代码

创建好项目之后，创建主进程的入口程序：`src\main\mainEntry.ts`。

这个入口程序的代码很简单，如下所示：

```ts
//src\main\mainEntry.ts
import { app, BrowserWindow } from "electron";

let mainWindow: BrowserWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({});
  mainWindow.loadURL(process.argv[2]);
});
```

在这段代码里，app ready 之后创建了一个简单的 BrowserWindow 对象。app 是 Electron 的全局对象，用于控制整个应用程序的生命周期。在 Electron 初始化完成后，app 对象的 ready 事件被触发，这里使用 app.whenReady() 这个 Promise 方法来等待 ready 事件的发生。

**mainWindow 被设置成一个全局变量，这样可以避免主窗口被 JavaScript 的垃圾回收器回收掉**。另外，窗口的所有配置都使用了默认的配置。

这个窗口加载了一个 Url 路径，这个路径是以命令行参数的方式传递给应用程序的，而且是命令行的第三个参数。

app 和 BrowserWindow 都是 Electron 的内置模块，这些内置模块是通过 ES Module 的形式导入进来的。Electron 的内置模块都是通过 CJS Module 的形式导出的，这里之所以可以用 ES Module 导入，是因为主进程编译环节完成了相关的转化工作。

## 开发环境 Vite 插件

主进程的代码写好之后，只有编译过之后才能被 Electron 加载。编译工作和加载工作**通过 `Vite` 插件的形式来完成**，如下代码所示：

```ts
//plugins\devPlugin.ts
import { ViteDevServer } from "vite";
export let devPlugin = () => {
  return {
    name: "dev-plugin",
    configureServer(server: ViteDevServer) {
      require("esbuild").buildSync({
        entryPoints: ["./src/main/mainEntry.ts"],
        bundle: true,
        platform: "node",
        outfile: "./dist/mainEntry.js",
        external: ["electron"],
      });
      server.httpServer.once("listening", () => {
        let { spawn } = require("child_process");
        let addressInfo = server.httpServer.address();
        let httpAddress = `http://${addressInfo.address}:${addressInfo.port}`;
        let electronProcess = spawn(require("electron").toString(), ["./dist/mainEntry.js", httpAddress], {
          cwd: process.cwd(),
          stdio: "inherit",
        });
        electronProcess.on("close", () => {
          server.close();
          process.exit();
        });
      });
    },
  };
};
```

这是一个简单的 Vite 插件，在这个插件中注册了一个名为 `configureServer` 的钩子，**当 Vite 启动 Http 服务的时候，`configureServer` 钩子会被执行**。

这个钩子的输入参数为一个类型为 `ViteDevServer` 的对象 `server`，这个对象持有一个 `http.Server` 类型的属性 `httpServer`，这个属性就代表着调试 Vue 页面的 http 服务，一般情况下地址为：`http://127.0.0.1:5173/`。

**可以通过监听 `server.httpServer` 的 `listening` 事件来判断 httpServer 是否已经成功启动**。如果已经成功启动了，那么就启动 Electron 应用，并给它传递两个命令行参数，第一个参数是主进程代码编译后的文件路径，第二个参数是 Vue 页面的 http 地址，这里就是 `http://127.0.0.1:5173/`。

为什么这里传递了两个命令行参数，而主进程的代码接收第三个参数（`process.argv[2]`）当作 http 页面的地址呢？因为**默认情况下 electron.exe 的文件路径将作为第一个参数**，也就是通过 `require("electron")` 获得的字符串。

> 这个路径一般是：`node_modules\electron\dist\electron.exe`，如果这个路径下没有对应的文件，说明 Electron 模块没有安装好。

启动 `electron` 子进程使用的是 **`Node.js` `child_process` 模块的 `spawn` 方法**，除了两个命令行参数外，还传递了一个配置对象。

这个对象的 `cwd` 属性用于设置当前的工作目录，`process.cwd()` 返回的值就是当前项目的根目录。`stdio` 用于设置 electron 进程的控制台输出，这里设置 `inherit` 可以让 electron 子进程的控制台输出数据同步到主进程的控制台。这样主进程中 `console.log` 的内容就可以在 VSCode 的控制台上看到了。

当 electron 子进程退出的时候，要关闭 Vite 的 http 服务，并且控制父进程退出，准备下一次启动。

http 服务启动之前，**使用 `esbuild` 模块完成了主进程 TypeScript 代码的编译工作**，这个模块是 `Vite` 自带的，所以不需要额外安装，可以直接使用。

主进程的入口文件是通过 `entryPoints` 配置属性设置的，编译完成后的输出文件是通过 `outfile` 属性配置的。

编译平台 `platform` 设置为 `node`，排除的模块 `external` 设置为 `electron`，**正是这两个设置使主进程代码可以通过 `import` 的方式导入 electron 内置的模块**。非但如此，Node 的内置模块也可以通过 `import` 的方式引入。

这个 Vite 插件的代码编写好后，在 `vite.config.ts` 文件中引入一下就可以使用了，如下代码所示：

```ts
// vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { devPlugin } from "./plugins/devPlugin";

export default defineConfig({
  plugins: [devPlugin(), vue()],
});
```

现在执行命令 `npm run dev`，即可看到 Electron 应用加载了 Vue 的首页。

关闭窗口，主进程和子进程也会跟着退出。修改一下 Vue 组件里的内容，窗口内显示的内容也会跟着变化，说明热更新机制在起作用。



## 渲染进程集成内置模块

现在主进程内可以自由的使用 Electron 和 Node.js 的内置模块了，但渲染进程还不行，接下来为渲染进程集成这些内置模块。

首先修改主进程的代码，打开渲染进程的一些开关，允许渲染进程使用 Node.js 的内置模块，如下代码所示：

```ts
// src\main\mainEntry.ts
import { app, BrowserWindow } from "electron";
process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
let mainWindow: BrowserWindow;

app.whenReady().then(() => {
  let config = {
    webPreferences: {
      nodeIntegration: true,
      webSecurity: false,
      allowRunningInsecureContent: true,
      contextIsolation: false,
      webviewTag: true,
      spellcheck: false,
      disableHtmlFullscreenWindowResize: true,
    },
  };
  mainWindow = new BrowserWindow(config);
  mainWindow.webContents.openDevTools({ mode: "undocked" });
  mainWindow.loadURL(process.argv[2]);
});
```

在这段代码中，有以下几点需要注意：

1. `ELECTRON_DISABLE_SECURITY_WARNINGS` 用于设置渲染进程开发者调试工具的警告，这里设置为 true 就不会再显示任何警告了。

> **如果渲染进程的代码可以访问 Node.js 的内置模块，而且渲染进程加载的页面（或脚本）是第三方开发的，那么恶意第三方就有可能使用 Node.js 的内置模块伤害最终用户**。这就是为什么这里要有这些警告的原因。如果应用不会加载任何第三方的页面或脚本，那么就不用担心这些安全问题。

2. `nodeIntegration` 配置项的作用是把 Node.js 环境集成到渲染进程中，`contextIsolation` 配置项的作用是在同一个 JavaScript 上下文中使用 Electron API。其他配置项与本文主旨无关，感兴趣的可以自行翻阅官方文档。

3. `webContents` 的 `openDevTools` 方法用于打开开发者调试工具

完成这些工作后，就可以在开发者调试工具中访问 Node.js 和 Electron 的内置模块了。

## 设置 Vite 模块别名与模块解析钩子

虽然可以在开发者调试工具中使用 Node.js 和 Electron 的内置模块，但现在还不能在 Vue 的页面内使用这些模块。

这是因为 Vite 主动屏蔽了这些内置的模块，如果开发者强行引入它们，那么大概率会得到如下报错：

```text
Module "xxxx" has been externalized for browser compatibility and cannot be accessed in client code.
```

接下来介绍如何让 Vite 加载 Electron 的内置模块和 Node.js 的内置模块。

首先为工程安装一个 Vite 组件：[vite-plugin-optimizer](https://github.com/vite-plugin/vite-plugin-optimizer)。

```bash
npm i vite-plugin-optimizer -D
```

然后修改 vite.config.ts 的代码，让 Vite 加载这个插件，如下代码所示：

```ts
// vite.config.ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { devPlugin, getReplacer } from "./plugins/devPlugin";
import optimizer from "vite-plugin-optimizer";

export default defineConfig({
  plugins: [optimizer(getReplacer()), devPlugin(), vue()],
});
```

**vite-plugin-optimizer 插件会创建一个临时目录：node_modules\.vite-plugin-optimizer**。

然后把类似 `const fs = require('fs'); export { fs as default }` 这样的代码写入这个目录下的 fs.js 文件中。

渲染进程执行到：import fs from "fs" 时，就会请求这个目录下的 fs.js 文件，这样就达到了在渲染进程中引入 Node 内置模块的目的。

getReplacer 方法用于向 vite-plugin-optimizer 插件提供内置模块列表。代码如下所示：

```ts
// plugins\devPlugin.ts
export let getReplacer = () => {
  let externalModels = ["os", "fs", "path", "events", "child_process", "crypto", "http", "buffer", "url", "better-sqlite3", "knex"];
  let result = {};
  for (let item of externalModels) {
    result[item] = () => ({
      find: new RegExp(`^${item}$`),
      code: `const ${item} = require('${item}');export { ${item} as default }`,
    });
  }
  result["electron"] = () => {
    let electronModules = ["clipboard", "ipcRenderer", "nativeImage", "shell", "webFrame"].join(",");
    return {
      find: new RegExp(`^electron$`),
      code: `const {${electronModules}} = require('electron');export {${electronModules}}`,
    };
  };
  return result;
};
```

这个方法把一些常用的 Node 模块和 electron 的内置模块提供给了 vite-plugin-optimizer 插件，以后想要增加新的内置模块只要修改这个方法即可。而且 **vite-plugin-optimizer 插件不仅用于开发环境，编译 Vue 项目时，它也会参与工作**。

再次运行应用，通过如下代码在 Vue 组件中验证渲染进程能否正确加载内置模块：

```ts
//src\App.vue
import fs from "fs";
import { ipcRenderer } from "electron";
import { onMounted } from "vue";
onMounted(() => {
  console.log(fs.writeFileSync);
  console.log(ipcRenderer);
});
```

运行后，开发者调试工具中就能正确输出这两个内置模块的信息了。





## 总结

至此，**Vue3+Vite3+Electron 的开发环境就构建完成了**，而且完成这项工作并`不依赖于市面上任何一个现成的构建工具`。这个环境完全由自己动手搭建，后续想增加或者修改一项功能，都可以很从容地自行处理。

非但如此，本文还介绍了 Vite 插件的`开发技巧`和如何创建一个简单的 Electron 应用等知识。在此基础上，可以进一步使用 Vite 插件制作 Electron 应用的安装包，具体做法参见《如何开发 Vite 3 插件打包 Electron 应用》。

## 代码

示例代码请通过如下地址自行下载：

[源码仓储](https://gitee.com/horsejs_admin/electron-jue-jin/tree/dev)
