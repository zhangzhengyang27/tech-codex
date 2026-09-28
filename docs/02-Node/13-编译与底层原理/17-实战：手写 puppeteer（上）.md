---
title: 实战：手写 puppeteer（上）
description: 从 CDP 协议与 WebSocket 通信入手，手写最小化的 Puppeteer 控制层（上）
keywords: [Node.js, AST, 编译, Puppeteer（上）]
category: Node.js
tags: [Node.js, 编译与底层原理]
---







# 实战：手写 puppeteer（上）

Puppeteer 是一个网页的自动化测试工具，它支持写一些 JS 脚本来控制浏览器执行一些行为，可以用来跑测试用例，或者用来做爬虫。

它的脚本类似这样：

```javascript
const puppeteer = require('puppeteer');
const fs = require('fs/promises');

(async () => {
  const browser = await puppeteer.launch({
    headless: false
  });

  const page = await browser.newPage();

  await page.goto('https://baidu.com');

  const $input = await page.$('#kw');
  await $input.type('guangguangguang');

  const $button = await page.$('#su');
  await $button.click();

  await page.waitForSelector('#container');
  const screenshot = await page.screenshot();
  await fs.writeFile('./screenshot.png', screenshot);

  await browser.close();
})();
```

启动脚本 launch 了一个浏览器，打开一个标签页，访问 baidu，在输入框输入一些内容，然后点击搜索按钮，等页面出现结果就截下图存到本地文件，然后关闭浏览器。

跑起来是这样的：


其实跑这种脚本不需要看到界面，所以 puppeteer 默认是 headless 的，也就是无界面的。（上面是我把 headless 给关掉了）

这种脚本写起来还是很简单的，就是按照你操作的步骤一步步写对应的脚本就好了，甚至还有录制你的行为来生成 puppeteer 脚本的工具。

这节不讲它的应用，而是来探究下它的实现原理。能不能自己实现一个呢？

**puppeteer 是基于 Chrome DevTools Protocol 实现的，会以调试模式跑一个 chromium 的实例，然后通过 WebSocket 连接上它，之后通过 CDP 协议来远程控制。**

**写的脚本最终都会转成 CDP 协议来发送给 Chrome 浏览器，这就是它的实现原理。**

接下来尝试自己实现一个简易版 puppeteer 来深入理解它。

要想控制 Chromium，总得先把他下下来吧，所以本篇来实现 Chromium 的自动下载（**这节不涉及 CDP，大家简单看下就行，重点在下一节**）。

google 有个网站存储了所有版本、所有平台的 chromium，它的 url 是这样的：

mac 的 url：

[storage.googleapis.com/chromium-br…](https://storage.googleapis.com/chromium-browser-snapshots/Mac/%E7%89%88%E6%9C%AC%E5%8F%B7/chrome-mac.zip)

linux 的 url：

[storage.googleapis.com/chromium-br…](https://storage.googleapis.com/chromium-browser-snapshots/Linux_x64/%E7%89%88%E6%9C%AC%E5%8F%B7/chrome-linux.zip)

win32 的 url：

[storage.googleapis.com/chromium-br…](https://storage.googleapis.com/chromium-browser-snapshots/Win/%E7%89%88%E6%9C%AC%E5%8F%B7/chrome-win32.zip)

win64 的 url：

[storage.googleapis.com/chromium-br…](https://storage.googleapis.com/chromium-browser-snapshots/Win_x64/%E7%89%88%E6%9C%AC%E5%8F%B7/chrome-win32.zip)

你可以把 url 换成具体的版本号试试，比如 468266、546920


所有的版本号可以在国内的一个镜像网站看到：

[registry.npmmirror.com/binary.html…](https://registry.npmmirror.com/binary.html?path=chromium-browser-snapshots/)


把下载下来的 zip 包解压，这个不就是要的 chromium 浏览器么？


流程是这么个流程，但肯定不能手动搞，要做成自动化的。

因为安装 puppeteer 之后是要下载这个 chromium 的，不能让开发者手动去下吧。

所以接下来就把这个流程给自动化了。

创建个项目：

```bash
mkdir mini-puppeteer
cd mini-puppeteer
npm init -y
```


一步步来，首先是下载 chromium 到本地的一个目录：

创建 src/lib/Downloader.mjs

```javascript
import os from 'node:os';
import path from 'node:path';
import util from 'node:util';
import fs from 'node:fs';

const CHROMIUM_PATH = path.join(import.meta.dirname, '..', '..', '.local-chromium');

const downloadURLs = {
    linux: 'https://storage.googleapis.com/chromium-browser-snapshots/Linux_x64/%d/chrome-linux.zip',
    darwin: 'https://storage.googleapis.com/chromium-browser-snapshots/Mac/%d/chrome-mac.zip',
    win32: 'https://storage.googleapis.com/chromium-browser-snapshots/Win/%d/chrome-win32.zip',
    win64: 'https://storage.googleapis.com/chromium-browser-snapshots/Win_x64/%d/chrome-win32.zip',
};

async function downloadChromium(revision, progressCallback) {
    let url = null;

    const platform = os.platform();
    if (platform === 'darwin')
        url = downloadURLs.darwin;
    else if (platform === 'linux')
        url = downloadURLs.linux;
    else if (platform === 'win32')
        url = os.arch() === 'x64' ? downloadURLs.win64 : downloadURLs.win32;

    console.assert(url, `Unsupported platform: ${platform}`);

    url = util.format(url, revision);

}
```

首先，下载到的本地目录是 .local-chromium，根据输入的版本号，以及从 os.platform() 拿到的系统信息来确定下载的 url。

有两个 node 的 api 要解释下：

console.assert 就是第一个参数的值为 false 的时候，才输出第二个参数的信息：


util.format 是格式化字符串用的，有一些占位符，%d 是数字、%s 是字符串、%j 是 JSON 等：


到了这里，就拿到了下载 chromium 的 url。

那么接下来就是用 https 访问这个 url，下载到本地的目录了。

接下来实现下载到本地的功能：


```javascript
import https from 'node:https';

function downloadFile(url, destinationPath, progressCallback) {
    let resolve , reject;
    const promise = new Promise((x, y) => { resolve = x; reject = y; });

    const request = https.get(url, response => {
        if (response.statusCode !== 200) {
            const error = new Error(`Download failed: server returned code ${response.statusCode}. URL: ${url}`);
            response.resume();
            reject(error);
            return;
        }

        const file = fs.createWriteStream(destinationPath);

        file.on('finish', () => resolve ());
        file.on('error', error => reject(error));

        response.pipe(file);
    });
    request.on('error', error => reject(error));
    return promise;
}
```

因为这个下载过程是异步的，希望返回一个 promise。

很多人写返回 promsie 的方法都是这么写：

```javascript
function func() {
    return new Promise((resolve, reject) => {

        // resolve();

        // reject()
    });
}
```

其实也可以这么写：

```javascript
function func() {
    let resolve , reject;
    const promise = new Promise((x, y) => { resolve = x; reject = y; });

    // resolve();
    // reject();

    return promise;
}
```

中间的部分就是用 https.get 下载 url 的数据了，不过这个回调函数的 response 参数是一个流。

为什么呢？

因为如果数据很多，需要等好久才能传完，那要等全部传完再处理么？

不用，可以每传一部分就处理一部分。这就是流的思想。

基本所有语言处理网络和文件 IO 的 api 都是基于流的，这个前面 stream 章节讲过。

创建了一个写入流，写入到本地的文件的，然后把响应流 pipe 到文件流，也就是直接写入到文件里了：


失败的时候，流中的数据就不需要了，所以要调用 response.resume() 来消费掉。


这样就实现了下载功能。


待会再跑，先来实现第二步，解压缩：

这个自己处理就比较麻烦了，直接用第三方的包就行，比如 extract-zip：


```javascript
import extract from 'extract-zip';
```

```javascript
function extractZip(zipPath, folderPath) {
    // extract-zip v2 起只支持 Promise API，不再接受回调参数
    return extract(zipPath, { dir: folderPath });
}
```

它会解压 zip 文件到目标目录。

安装下：

```bash
npm install --save extract-zip
```

在处理完下载的 url 之后，调用下这两步：


```javascript
const zipPath = path.join(CHROMIUM_PATH, `download-${revision}.zip`);
const folderPath = path.join(CHROMIUM_PATH, revision);

if (fs.existsSync(folderPath)) {
    return;
}

try {
    if (!fs.existsSync(CHROMIUM_PATH)) {
        fs.mkdirSync(CHROMIUM_PATH);
    }

    await downloadFile(url, zipPath, progressCallback);
    await extractZip(zipPath, folderPath);
} catch(e) {}
```

首先确定 zip 包的路径和解压到的目录的路径，如果目录已经存在了，那就不下载了。

否则调用刚才实现的两个方法来下载 zip 和解压缩。

chromium 下载还是比较慢的，给它加个进度条：

也就是给 response 流的 data 事件加个回调，把从 content-length 拿到的数据的总大小，还有当前 chunk 的数据大小传过去：


```javascript
const totalBytes = parseInt(response.headers['content-length'], 10);
if (progressCallback)
    response.on('data', onData.bind(null, totalBytes));
```

```javascript
function onData(totalBytes, chunk) {
    progressCallback(totalBytes, chunk.length);
}
```

导出 downloadChromium 和拿到下载后的 chrome 的可执行文件路径的方法：


```javascript
function executablePath(revision) {
    const platform = os.platform();
    if (platform === 'darwin')
        return path.join(CHROMIUM_PATH, revision, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
    if (platform === 'linux')
        return path.join(CHROMIUM_PATH, revision, 'chrome-linux', 'chrome');
    if (platform === 'win32')
        return path.join(CHROMIUM_PATH, revision, 'chrome-win32', 'chrome.exe');
    throw new Error(`Unsupported platform: ${platform}`);
}

export {
    executablePath,
    downloadChromium
}
```

创建 src/install.mjs

```javascript
import { downloadChromium } from './lib/Downloader.mjs';
import fs from 'node:fs';
import ProgressBar from 'progress';
import path from 'node:path';

const pkgJsonPath = path.join(import.meta.dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
const revision = pkg.puppeteer.chromium_revision;

downloadChromium(revision, onProgress)
    .catch(error => {
        console.error('Download failed: ' + error.message);
    });

let progressBar = null;
function onProgress(bytesTotal, delta) {
    if (!progressBar) {
        progressBar = new ProgressBar(`Downloading Chromium - ${toMegabytes(bytesTotal)} [:bar] :percent :etas `, {
            complete: '\u2588',
            incomplete: '\u2591',
            width: 20,
            total: bytesTotal,
        });
    }
    progressBar.tick(delta);
}

function toMegabytes(bytes) {
    const mb = bytes / 1024 / 1024;
    return (Math.round(mb * 10) / 10) + ' Mb';
}
```

Downloader 就是刚刚实现的下载解压的逻辑，revision 是版本号，这个在 package.json 里配置。

progress 是一个第三方的控制台进度条，传入宽度、总大小和显示的字符，每次调用 tick 更新下长度就可以了。

安装下用到的包：

```bash
npm install --save progress
```

在 package.json 声明 chromium 版本：


```javascript
"puppeteer": {
    "chromium_revision": "970501"
},
```

来整体试一下：

```bash
node ./src/install.mjs
```


下载、解压、进度条都没问题，下载下来的 chromium 也能正常跑起来：


至此，就实现了 chromium 的自动下载，只要在 package.json 里配一个版本号，就能自动下载。

当然，现在还不算完全自动，还要手动执行 node ./src/install.mjs

可以把它配在 postinstall 的 npm scripts 里，安装完这个 mini-puppeteer 的依赖之后触发下载：


> 代码上传了[文档仓库](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/mini-puppeteer)

## 总结

puppeteer 是一个基于 CDP 实现的网页自动化测试工具，可以用来跑测试用例，也可以用来做爬虫等。

会从 0 实现一个 mini puppeteer。

这节实现了自动下载 chromium：

chromium 所有平台和版本的 zip 包都在 google 的一个网站上存着，通过 os 模块拿到系统信息，再根据传入的版本号就能确定 url。

确定了 url 之后通过 https 模块就可以下载，通过流的方式写入本地文件，并且在每次有 data 的时候更新下进度条。

最后通过第三方的 extract-zip 包实现了解压缩。

并且把这个脚本配到了 postinstall 的 npm scripts 里，只要安装完依赖就会自动下载。

下载 Chromium 只是第一步，下一节把 Chromium 跑起来实现远程控制。