---
title: live-reload自动刷新
description: "虽然现在 Hot Module Replacement (HMR) 等技术更为流行，但 LiveReload 作为自动刷新技术的鼻祖，其原理简单且易于理解，非常适合在传统前端项目中引入，以提升开发效率。"
keywords: []
category: tools
tags: [npm scripts, 工程化, 自动化]
---


# live-reload自动刷新

在前端开发中，频繁手动刷新页面是最低效的操作之一。为了解决这个问题，社区推出了 `LiveReload`，它可以自动刷新页面，立即看到代码变更的效果。

虽然现在 `Hot Module Replacement (HMR)` 等技术更为流行，但 `LiveReload` 作为自动刷新技术的鼻祖，其原理简单且易于理解，非常适合在传统前端项目中引入，以提升开发效率。

本节将详细介绍如何在项目中接入 `LiveReload`。

## 1. 安装依赖

首先，安装 `livereload` 和 `http-server` 到项目的开发依赖中。`http-server` 用于启动一个静态文件服务器，而 `livereload` 则负责监听文件变化并通知浏览器刷新。

```bash
npm install livereload http-server --save-dev
```

## 2. 添加 npm script

接下来，在 `package.json` 中添加相应的 `scripts` 命令，以启动 `LiveReload` 服务和静态文件服务：

```json
{
  "scripts": {
    "client": "npm-run-all --parallel client:*",
    "client:reload-server": "livereload client/",
    "client:static-server": "http-server client/"
  }
}
```

`client` 命令会同时启动 `livereload` 服务和静态文件服务。前者监听 `client/` 目录下的文件变化，后者则将该目录作为 Web 根目录。

## 3. 在页面中嵌入 livereload 脚本

为了让浏览器与 `LiveReload` 服务建立连接，需要在 `client/index.html` 中嵌入一小段脚本：

```html
<!DOCTYPE html>
<html>
  <head>
    <title>LiveReload Demo</title>
    <link rel="stylesheet" href="main.css" />
  </head>
  <body>
    <h2>LiveReload Demo</h2>
    <script>
      document.write(
        '<script src="http://' +
          (location.host || "localhost").split(":")[0] +
          ':35729/livereload.js?snipver=1"></' +
          "script>"
      )
    </script>
  </body>
</html>
```

这段脚本会动态创建一个 `script` 标签，引入 `livereload.js`，从而实现浏览器与 `LiveReload` 服务的通信。默认端口是 `35729`，如果自定义了端口，需要相应修改。

## 4. 启动服务并测试

现在，运行 `npm run client` 命令。服务启动成功后，你将看到类似下面的输出：

```
[1] Starting Static Server for "client/" at http://127.0.0.1:8080
[0] Starting LiveReload server on 35729
```

然后，在浏览器中打开 `http://localhost:8080`。尝试修改 `client/main.css` 并保存，你会发现浏览器自动刷新了页面。

对于有代码洁癖的开发者，可以在生产环境中通过判断 `location.hostname` 来决定是否嵌入 `livereload` 脚本，或者在构建时将其移除。
