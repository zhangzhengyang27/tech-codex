---
title: 如何升级 Electron 应用
description: "对比 Electron 应用两种升级方案：基于 electron-updater 与 latest.yml 版本比对、sha512 校验的全量升级，以及只替换asar 文件、按大版本号+小版本号命名规则管理升级目录、兼容版本降级的增量升级实现思路。"
keywords: [Electron, 应用升级, electron-updater, asar]
category: Electron
tags: [Electron, 桌面应用, IPC, 打包]
---


# 如何升级 Electron 应用？

## 背景与问题

产品分发给用户之后即进入迭代周期：开发者会持续为产品增加新功能、修复用户反馈的 Bug，并随之推出新版本。如何把新版本分发给已经安装产品的用户，是产品经理和开发人员都要面对的问题。

市面上常见的产品升级方式有两种。

一种是**全量升级**，这种升级方式要求用户重新安装新版本的产品，在安装新版本产品前，安装程序会把老版本的产品卸载掉，以达到升级的目的。这种方式最大的优点就是**升级得比较彻底**，不会受老版本产品的任何影响。可是如果开发者仅仅修改了一两个文件，就要让用户重新安装一遍产品，用户体验并不好——下载安装过程都很慢，而且会打断用户使用产品的操作。

另一种升级方式是**增量升级**，顾名思义，这种升级方式只升级开发者修改过的内容，升级内容少，过程迅速；如果升级内容不涉及关键业务，还可以做到**用户无感升级**。

## 全量升级：原理与机制

为了不让用户手动下载、安装新版本的产品，升级逻辑必须在一开始就做到应用中去，如下代码所示：

```ts
//src\main\Updater.ts
import { dialog } from "electron";
import { autoUpdater } from "electron-updater";
export class Updater {
  static check() {
    autoUpdater.checkForUpdates();
    autoUpdater.on("update-downloaded", async () => {
      await dialog.showMessageBox({
        message: "有可用的升级",
      });
      autoUpdater.quitAndInstall();
    });
  }
}
```

这段代码使用了一个名为 [electron-updater](https://www.npmjs.com/package/electron-updater) 的模块来完成升级功能，安装指令为：`npm install electron-updater -D`。

实际上 Electron 内置了一个自动升级模块 [autoUpdater](https://www.electronjs.org/zh/docs/latest/api/auto-updater)，上述方案没有使用 Electron 内置的模块，原因是打包工具链选用的是 electron-builder，而 electron-updater 与 electron-builder 结合得更紧密，更容易使用（electron-updater 的源码就在 electron-builder 工程下）。

上述 Updater 类只提供了一个方法 check，在这个方法中，autoUpdater 对象检查服务端是否存在新版本的安装包，并监听 update-downloaded 事件。

一旦 autoUpdater 发现服务端存在更新的安装包，则会把安装包下载到用户本地电脑内。当新版本安装包下载完成后，`update-downloaded` 事件被触发，此时应用提醒用户"有可用的升级"，用户确认后就退出当前应用并安装新的安装包。

### latest.yml 与版本校验机制

latest.yml 文件内包含如下几个信息：新版本安装文件的版本号、文件名、文件的 sha512 值、文件大小、文件生成时间、执行新版本安装文件时是否需要管理员权限。

**当 autoUpdater.checkForUpdates() 方法执行时，应用会先请求这个 yml 文件，得到文件里的内容后，再拿此文件中的版本号与当前版本号对比，如果此文件中的版本号比当前版本号新，则下载新版本，否则就退出更新逻辑**。

当新版本安装包下载完成后，electron-updater 会验证文件的 sha512 值是否合法：yml 文件中包含新版本安装包的 sha512 值，electron-updater 首先计算出下载到的新版本安装包的 sha512 值，然后再与 yml 文件中的 sha512 值对比，两个值相等则验证通过，不相等则验证不通过。

验证通过后，Electron 使用 Node.js 的 child-process 模块启动这个新的安装文件，以完成应用程序升级工作。

## 全量升级：实践要点

在升级过程中有以下几点需要注意。

1. **升级服务的地址是制作安装包时通过 config.publish.url 指定的**，这个路径指向新版本安装包所在的服务器目录。如下代码所示：

```ts
plugins\buildPlugin.ts
publish: [{ provider: "generic", url: "http://localhost:5500/" }],
```

2. 完成新版本的开发工作后，要把 release 目录下的 [your_project_name] Setup [your_project_version].exe 和 latest.yml 两个文件上传到第 1 点中指定的服务器地址下（这是 Windows 平台下的工作）。Mac 平台下要把 release 目录下的 [your_project_name]-[your_project_version]-mac.zip、[your_project_name]-[your_project_version].dmg 和 latest-mac.yml 三个文件上传到指定的服务器地址下。

3. 产品版本是通过 package.json 中的 `version` 属性指定的，产品安装包的版本也是在这里指定的。

4. 通过 `dialog.showMessageBox` 提醒用户升级在界面上并不美观，更好的做法是发消息给渲染进程，让渲染进程弹出一个更漂亮的升级提醒窗口；用户做出选择后，再由渲染进程发消息给主进程，执行 `autoUpdater.quitAndInstall` 逻辑。

5. 应该在 `app ready` 事件发生之后再调用 `Updater.check()` 方法，而且应该在生产环境下调用——在开发环境下调用没有任何意义，`electron-updater` 库会给出如下错误提示：

```text
Skip checkForUpdatesAndNotify because application is not packed
```

6. 升级服务地址下应始终保留一个安装包和相应的配置文件，否则 checkForUpdates 方法会报错。

## 增量升级：原理与机制

一般情况下，应用都会使用 asar 文件存储业务逻辑代码，所以**增量升级只要考虑更新这个文件即可**。

Electron 应用启动时，会首先加载主进程的入口文件，这个文件是在打包 Electron 应用时指定的，如下代码所示：

```ts
//plugins\buildPlugin.ts
localPkgJson.main = "mainEntry.js";
```

可以假设这个文件（mainEntry.js）没有具体的业务功能逻辑，而是只完成这样的逻辑：**判断当前用户环境中是否存在一个新版本的 asar 文件，如果有，就直接加载新版本 asar 文件中的业务代码（假设叫 mainLogic.js）；如果没有，就加载当前 asar 文件中的业务代码 mainLogic.js**。注意：mainEntry.js 和 mainLogic.js 都存在于 asar 文件中。

一个 asar 文件中的 js 代码可以调用另一个 asar 中的 js 代码，如下代码可以正常执行——**只要把 asar 当作一个目录即可**，Electron 会完成具体的加载工作。

```ts
let mainLogicPath = path.join(`c://yourNewVersion.asar`, "mainLogic.js");
let mainLogic = require(mainLogicPath);
mainLogic.start();
```

按照这个逻辑，每次升级就可以只升级 asar 文件，而不必升级整个应用。

### 升级流程与职责划分

整个升级流程中，用户只负责启动应用；检查是否存在新版本 asar、下载新版本 asar 的逻辑都在 mainEntry.js 中实现；mainLogic.js 则承载具体业务逻辑——它不单单有业务逻辑，还包括整个应用的其他主进程业务逻辑。

可以认为安装目录下的 asar 文件是一个完整应用的 asar 文件，它包括 mainEntry.js、mainLogic.js 和渲染进程的所有代码文件。

升级目录下的 asar 文件也是一个完整应用的 asar 文件，它同样包括 mainEntry.js、mainLogic.js 和渲染进程的所有代码文件，只不过 mainEntry.js 文件对于它来说是可有可无的。

### 升级目录与命名规则

升级目录可以由开发者自己指定，推荐把这个目录指定为用户的 appData 目录下的一个子目录。下载保存时，要注意 asar 文件的`命名规则`。比如：main.2.3.6.18.asar，其中 2.3.6 是产品的版本号，称为大版本号；18 是 asar 文件的版本号，称为小版本号。这样做有以下两个目的。

1. 第一个目的是**当用户多次增量升级应用程序后，升级目录下就会有多个 asar 文件，以这种规则命名，mainEntry.js 就可以方便地找到哪个文件是最新的**。假设安装目录下的 asar 文件的版本号是 0，那么升级目录下的 asar 文件的版本号应该从版本号 1 开始。

2. 第二个目的是应对**用户自己重新安装了一个老旧安装包的情况**：当升级目录下既有 main.2.3.7.1.asar 文件、也有 main.2.3.6.1.asar 文件，而当前用户安装的产品版本号是 2.3.6 时，不应该加载 main.2.3.7.1.asar，而应该加载 main.2.3.6.1.asar，这主要是为了兼容。

### 版本降级与体验优化

如果要考虑版本降级的逻辑，以应对版本发布后才发现了重大问题的场景，可以通过服务器给客户端发送一个指令，迫使客户端删除指定版本的 asar 文件，然后提示用户重启应用即可。

用户启动应用后，发现服务端有新的 asar 文件，下载成功后又马上要求重启，如果担心这会影响用户体验，可以把检查并下载新版本 asar 的逻辑放在主窗口显示之前，只有在服务端没有新 asar 文件或服务端无法访问时才显示主窗口。这样重启应用的逻辑也不需要用户确认，即使客户端在没有网络的环境中也可以正常运行。但这样做会增加应用首屏加载的时间，开发者还可以加一个 splash window 以提升用户体验。

一般来说 asar 文件不会太大，也就几兆大小，不像全量升级应用程序一样动辄大几十兆，所以增量升级带给用户的负担更小，用户体验更好。

> 由于产品的业务逻辑都是放置在 asar 文件中的，这种方案对于业务逻辑来说还是全量升级，并不是改了哪个代码文件就只升级哪个代码文件的增量升级。

## 小结

Electron 应用有两种升级方式。业界经常使用的升级方式为全量升级，这种升级方式依托 electron-builder 的内置模块 electron-updater 完成，升级比较彻底，但由于需要重新安装整个应用，用户体验不是特别好。

增量升级是依托 asar 文件特性实现的自研升级方式，技巧性比较强。由于升级内容比较少、更加可控，这种升级方式用户体验比较好，但涉及多版本控制、升级异常处理等逻辑，需要开发者仔细处理。

## 源码

示例代码请通过如下地址自行下载：

[源码仓库（仅包括全量升级的示例性代码）](https://gitee.com/horsejs_admin/electron-jue-jin/tree/release)
