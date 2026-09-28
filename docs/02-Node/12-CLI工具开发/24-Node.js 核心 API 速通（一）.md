---
title: Node.js 核心 API 速通（一）
description: 核心 API 速通第一篇：全局对象、process 与常用工具方法速览
keywords: [Node.js, CLI, commander, API]
category: Node.js
tags: [Node.js, CLI工具开发]
---







# Node.js 核心 API 速通（一）

这节开始整体过一遍 Node.js 的 api。

其实前面用到了很多的 api，但是没有整体梳理一遍，这节开始，整体过一遍。

只学习核心的 api，其余的用到查文档就行。

创建个项目：

```bash
mkdir node-api-test
cd node-api-test
npm init -y
```


## events

首先是 events 模块：

创建 events.js

```javascript
const EventEmitter = require('node:events');

class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter();

myEmitter.on('aaa', (data) => {
  console.log('aaa 事件触发', data);
});

myEmitter.once('bbb', (data) => {
    console.log('bbb 事件触发', data);
});

myEmitter.emit('aaa', 1);
myEmitter.emit('aaa', 2);
myEmitter.emit('bbb', 3);
myEmitter.emit('bbb', 4);
```

创建一个 class 继承 EventEmitter，之后 new 一个实例。

on 注册的事件可以多次触发，而 once 注册的只会触发一次。

跑一下：

```bash
node ./events.js
```


可以看到 aaa 事件触发了两次，而 bbb 事件只触发了一次。

EventEmitter 虽然比较简单，但是用的很多。

你可以安装下 @types/node，会有 node api 的类型提示：

```bash
npm install --save-dev @types/node
```

## path

然后是 path 模块，它是用来做文件路径处理的：

创建 path.js

```javascript
const path = require('node:path');

const filePath = __filename;

console.log(filePath)
console.log(path.dirname(filePath));
console.log(path.basename(filePath));
console.log(path.extname(filePath));
```

这里用 \_\_filename 拿到当前文件路径，然后用 dirname、basename、extname 拿到目录名、文件名、后缀名。

跑一下：

```bash
node ./path.js
```


当然，\_\_dirname、\_\_filename 只在 commonjs 的模块里有，如果是 es module 就要用 import.meta.url

改下文件后缀名为 path.mjs

```javascript
import path from 'node:path';
import { fileURLToPath } from 'node:url'

const filePath = fileURLToPath(import.meta.url)

console.log(filePath)
console.log(path.dirname(filePath));
console.log(path.basename(filePath));
console.log(path.extname(filePath));
```

再跑下：

```bash
node ./path.mjs
```


可以通过改 package.json 里的 type 为 module 或者 commonjs 来告诉 node 这些 js 文件是什么模块规范。

或者也可以通过后缀名改为 mjs 告诉 node 这个文件是 es module 的模块规范。

继续来测试其他 api：

path2.js

```javascript
const path = require('node:path');

const filePath = path.join('../', 'node-api-test', './', 'path2.js');

console.log(filePath);

const filePath2 = path.resolve('../', 'node-api-test', './', 'path2.js');

console.log(filePath2);

console.log(path.relative('/a/b/c', '/a/d'));

console.log(path.parse(__filename));
```

path.join 可以把多个路径连接起来，解析其中的 ../ ./，合并成一个路径。

path.resolve 也是连接多个路径，但最后会返回一个绝对路径。

path.relative 是 a 路径到 b 路径的相对路径。

path.parse 是解析路径。

跑一下：

```bash
node path2.js
```


## import.meta

刚才用到了 import.meta.url，其实还有别的属性、方法可以用。

创建 meta.js

```javascript
console.log(__dirname);
console.log(__filename);
```


首先，在 commonjs 模块里，可以用 \_\_dirname、\_\_filename 来拿到目录名、文件名。

而在 es module 模块里，是用 import.meta

创建 meta2.mjs

```javascript
import url from 'node:url';

console.log(import.meta.url);
console.log(import.meta.resolve('./a.js'))

console.log(import.meta.dirname);
console.log(import.meta.filename);

console.log(url.fileURLToPath(import.meta.url))
```

import.meta.url 是拿到当前文件以 file:// 开头的路径。

import.meta.resolve 是基于当前目录和传入的路径来解析路径。

这里的 import.meta.dirname 要 node 版本 20.11 以上才有。


文档里也写了，和 url.fileURLToPath(import.meta.url) 等价。

跑一下：


## url

刚才用到了 url.fileURLToPath，再来过一下其他 api：

创建 url.mjs

```javascript
import url from 'node:url';

const myURL =
  new url.URL('https://user:pass@sub.example.com:8080/xxx/yyy?a=1&b=2#hash');

console.log(myURL.hash, myURL.host, myURL.searchParams);

console.log(myURL.searchParams.get('a'));

myURL.searchParams.set('b', 222);
myURL.searchParams.append('c', 333);

console.log(myURL.searchParams.toString())
```

创建一个 URL 实例，传入 url 字符串。

它会解析出 url 中各部分的内容，并且会把 query string 封装成 URLSearchParams 的实例。

URLSearchParams 有 get、set、append、toString 等方法。

跑一下：


当然，你也可以直接 new URLSearchParams

```javascript
const params = new url.URLSearchParams('?aa=1&bb=2');
console.log(params);
for (const [name, value] of params) {
    console.log(name, value);
}
```


还有一个 api 也比较常用，就是 url.urlToHttpOptions

```javascript
console.log(url.urlToHttpOptions(myURL));
```


当你使用 http.request 或者 https.request 的时候，需要传递对象形式的 options。

这时候就可以用 url.urlToHttpOptions 来解析 url 字符串来生成：

创建 url2.mjs

```javascript
import http from 'node:http';
import url from 'node:url';

const options = {
    method: 'GET',
    host: 'www.baidu.com',
    port: 80,
    path: '/'
};

const req = http.request(options, res => {
    res.on('data', (chunk) => {
        console.log(chunk.toString());
    });
    res.on('end', () => {
        console.log('done');
    });
});

req.end();
```

调用 http.request 发请求，返回的 res 是个可读流，监听 data 事件，打印返回的内容。

跑一下：

```bash
node url2.mjs
```


当然，你也可以用刚才的 url.urlToHttpOptions 方法来写：

```javascript
const options = url.urlToHttpOptions(new URL('http://www.baidu.com:80/'));

console.log(options);
```


## os

os 模块可以拿到很多系统的信息，比如 cpu、内存、home 目录等。

创建 os.mjs

```javascript
import os from 'node:os';

console.log('aaa' + os.EOL + 'bbb' + os.EOL);
```

跑一下：

```bash
node os.mjs
```


os.EOL 是换行符，在 windows 上是 `\r\n`，在其他系统上是 `\n`，所以直接用 os.EOL 更好


os.cpus() 返回的是 cpu 内核的信息：


model 是型号。

speed 是频率。

times.user 是在用户模式下运行的毫秒数，times.sys 是在系统模式下运行的毫秒数，times.idle 是空闲的毫秒数

具体是啥意思用到的时候再看就行。

其它的常用 api 也都比较简单，快速过一遍：

```javascript
console.log(os.type());
console.log(os.userInfo())
console.log(os.freemem(), os.totalmem());

console.log(os.homedir());
console.log(os.networkInterfaces())
```


os.type() 是系统类型，有 Darwin（也就是 mac）、Windows\_NT、Linux 等值。

os.userInfo() 是拿到当前用户相关的信息，比如 homedir、username 等。

os.freemem() 是可用内存、os.totalmem() 是总内存

os.homedir() 是 home 目录

os.networkInterfaces() 是网卡信息。

当然，你要是想拿到更丰富的系统信息，可以用 [systeminformation](https://www.npmjs.com/package/systeminformation)这个包，在写 cli 仪表盘的时候用过。


> 代码上传了[文档仓库](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/node-api-test)

## 总结

这节过了一些 node 常用的 api。

有这些模块：

* **events**：提供了 EventEmitter 类，可以用 on、once 注册监听器，用 emit 触发事件
* **path**：用来处理文件路径的，dirname、basename、extname 方法分别拿到目录名、文件名、后缀名，而 join、resolve、relative、parse 等方法是用来连接、解析路径的
* **import.meta**：在 commonjs 里用 \_\_dirname、\_\_filename 等变量来拿到当前文件名、当前目录，而在 es module 里是用 import.meta.dirname、import.meta.filename，这要 node 20 以上才有，低版本可以用 url.fileURLToPath(import.meta.url)
* **url**：用来解析 URL 的，可以 new URL 来拿到各部分的内容，还可以 new URLSearchParams 来处理 query string
* **os**：拿到系统信息，比如 cpu、内存、homedir、网卡信息、EOL 等。

这些 api 虽然简单，但都是很常用到的。