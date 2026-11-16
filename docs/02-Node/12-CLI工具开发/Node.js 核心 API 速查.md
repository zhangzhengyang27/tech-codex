---
title: Node.js 核心 API 速查
description: "Node.js 内置模块一页速查:events、path、url、os、fs、stream、buffer、http、net、crypto、child_process、worker_threads 等 25 个常用模块的核心 API 用法。"
keywords: [Node.js, API, 速查, 内置模块]
created: 2026-11-14
updated: 2026-11-14
status: 正式
category: Node.js
tags: [Node.js, 标准库, API]
---

# Node.js 核心 API 速查

::: tip 分工声明：核心模块专题
本篇是一页式 API 速查，按模块罗列核心用法，便于随手翻查；需要逐模块的深入讲解（fs、path、http、events、stream、buffer 等各有详解篇），见 [03-核心模块](../03-核心模块/01-fs.md) 系列。
:::

本文将原「核心 API 速通」系列五篇合并为一页，按主题分组整理 Node.js 常用内置模块的核心 API。

## 速查目录

| 主题 | 模块 | 要点 |
|------|------|------|
| 事件与基础 | events | EventEmitter：on/once 注册监听器，emit 触发事件 |
| | path | 路径处理：dirname/basename/extname，join/resolve/relative/parse |
| | import.meta | ESM 中取目录/文件名：import.meta.dirname、import.meta.filename（Node 20+） |
| | url | URL 解析：new URL、URLSearchParams |
| | os | 系统信息：cpu、内存、homedir、网卡、EOL |
| | util | 工具方法：format、promisify、debug 等 |
| | querystring | 解析和生成 querystring |
| 文件与存储 | fs | 文件、目录的增删改查 |
| | zlib | deflate、gzip、br 等压缩算法 |
| | sqlite | 内置 SQLite（实验性），生产可用 sqlite 三方包 |
| 流与二进制 | stream | Readable/Writable/Duplex/Transform 四种流，pipeline 连接流 |
| | buffer | 二进制数据操作，对 ArrayBuffer 的扩展 |
| | string_decoder | 将 Buffer 解码为字符串 |
| 网络 | http | createServer 创建服务，request 发送请求，基于 stream |
| | net | TCP 服务与消息 |
| | dgram | UDP 服务与消息（DNS 协议基于 UDP） |
| | dns | 域名到 IP 的查询 |
| 加密 | crypto | md5/sha256 加密，randomInt/randomUUID 随机数 |
| 进程与线程 | child_process | exec/spawn/execFile/fork 创建子进程 |
| | cluster | 多进程扩展（一般直接用 pm2） |
| | worker_threads | 工作线程提升性能 |
| | readline | 按行读取输入流，可处理键盘事件 |
| 运行环境 | vm | 创建独立 JS 运行上下文（jest 等基于此） |
| | repl | 创建交互式 REPL 环境 |
| | v8 | v8 内存统计与 flags 设置 |


---

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

---

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

这里用 __filename 拿到当前文件路径，然后用 dirname、basename、extname 拿到目录名、文件名、后缀名。

跑一下：

```bash
node ./path.js
```


当然，__dirname、__filename 只在 commonjs 的模块里有，如果是 es module 就要用 import.meta.url

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

---

## import.meta

刚才用到了 import.meta.url，其实还有别的属性、方法可以用。

创建 meta.js

```javascript
console.log(__dirname);
console.log(__filename);
```


首先，在 commonjs 模块里，可以用 __dirname、__filename 来拿到目录名、文件名。

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

---

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

---

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


os.type() 是系统类型，有 Darwin（也就是 mac）、Windows_NT、Linux 等值。

os.userInfo() 是拿到当前用户相关的信息，比如 homedir、username 等。

os.freemem() 是可用内存、os.totalmem() 是总内存

os.homedir() 是 home 目录

os.networkInterfaces() 是网卡信息。

当然，你要是想拿到更丰富的系统信息，可以用 [systeminformation](https://www.npmjs.com/package/systeminformation)这个包，在写 cli 仪表盘的时候用过。


> 代码上传了[文档仓库](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/node-api-test)

---

## util

util 模块顾名思义就是一些工具方法。

用一下：

创建 util.mjs

```javascript
import util from 'node:util';

console.log(util.format(
`这是一个数字：%d
这是一个字符串：%s
这是一个 JSON：%j
这是一个 对象：%o`, 111, '神说要有光', {
    a: 1,
    b: {
        c: 2
    }
}, {
    a: 1,
    b: {
        c: 2
    }
}));
```

util.format 就是可以在字符串中加一些占位符，然后后面的参数传入这些占位符。

不同占位符含义不同：

* %s：字符串
* %d：数字
* %i：整数
* %f：浮点数
* %j：JSON
* %o：对象
* %%：%

跑一下：

```bash
node ./util.mjs
```


当然，如果你是要打印日志的话，console.log 自带了 format 的支持：


没必要调用 util.format。

但如果你想拿到 format 之后的字符串，就可以用它了。

util.getCallSites 可以拿到调用堆栈

创建 util2.mjs

```javascript
import util from 'node:util';

function bbb() {
  const callSites = util.getCallSites();

  callSites.forEach((callSite, index) => {
    console.log(`CallSite ${index + 1}:`);
    console.log(`Function Name: ${callSite.functionName}`);
    console.log(`Script Name: ${callSite.scriptName}`);
    console.log(`Line Number: ${callSite.lineNumber}`);
    console.log(`Column Number: ${callSite.columnNumber}`);
    console.log()
  });
}

function aaa() {
  bbb();
}

aaa();
```

跑一下：

```bash
node util2.mjs
```

这个 api 要 node 22.9 以上才有（目前仍是实验性 API）。


记得之前写过一个重写 error stack，换成 sourcemap 之后的文件名和行列号的过功能么？


那个是通过重写 Error.prepareStackTrace 才拿到的报错时的调用堆栈。

而如果代码没报错，就可以用 util.getCallSite 拿到调用堆栈。

util.debug 也挺常用：

创建 util3.mjs

```javascript
import util from 'util';

const flag = util.debug('flag');

if (flag.enabled) {
  console.log('这是一条 debug 日志 111');
}

const flag2 = util.debug('flag2');

if (flag2.enabled) {
  console.log('这是一条 debug 日志 222');
}
```

当你希望有环境变量 flag 的时候，才打印日志 111，有环境变量 flag2 的时候打印日志 222，就可以用 util.debug

跑一下：

```bash
node ./util3.mjs
export NODE_DEBUG=flag && node ./util3.mjs
export NODE_DEBUG=flag2 && node ./util3.mjs
```

直接跑没任何打印：


当你加上对应的环境变量的时候


但你加上环境变量之后，就会执行对应的逻辑了。

还有一个方法也比较常用，就是 promisify

创建 util4.mjs

```javascript
import util from 'node:util';
import cp from 'node:child_process';

cp.exec('ls -l', (err, stdout, stderr) => {
    console.log(stdout);
});
```

用 child_process 模块的 exec 跑 shell 命令的时候，通过第二个参数的回调函数拿到返回值。

跑一下：


这样写起来不方便，可以用 util.promisify 转成 promise 版本：

```javascript
import util from 'node:util';
import cp from 'node:child_process';

// cp.exec('ls -l', (err, stdout, stderr) => {
//     console.log(stdout);
// });

const exec = util.promisify(cp.exec);

async function main() {
  const { stdout, stderr } = await exec('ls -l');
  console.log('stdout:', stdout);
  console.error('stderr:', stderr);
}
main();
```

跑一下：

---

## querystring

这个模块也很简单，就是用于 query string 的解析和格式化的。

创建 query_string.mjs

```javascript
import queryString from 'node:querystring';

const res = queryString.parse('a=1&b=2&c=xxx');

console.log(res);

const res2 = queryString.stringify({ aaa: '111', bbb: ['222', '33'], ccc: '444' });

console.log(res2);
```

跑一下：

---

## fs

fs 算是最常用的 api 了，就是文件、目录的增删改查。

过一遍常用的：

首先是目录的增删改：

创建 fs.mjs

```javascript
import fs from 'node:fs';

fs.mkdirSync('aaa');

setTimeout(() => {
    fs.renameSync('aaa', 'bbb');
}, 1000);

setTimeout(() => {
    fs.rmSync('bbb');
}, 3000);
```

mkdirSync 创建目录、1s 后 renameSync 修改名字，3s 后 rmSync 删除目录。

跑一下：

```bash
node fs.mjs
```


然后是文件的增删改：

创建 fs2.mjs

```javascript
import fs from 'node:fs';
import { EOL } from 'node:os';

fs.writeFileSync('aaa.txt', 'hello' + EOL);

setTimeout(() => {
    fs.appendFileSync('aaa.txt', 'world' + EOL)
}, 2000);

setTimeout(() => {
    fs.unlinkSync('aaa.txt');
}, 4000)
```

前面讲过 fs.createWriteStream 的方式，如果文件内容不大，直接用 fs.writeFileSync 同步写就行，还可以用 fs.appendFileSync 同步追加内容。

最后用 fs.unlinkSync 删除文件

跑一下：

```bash
node fs2.mjs
```


再就是复制文件和目录：

创建 fs3.mjs

```javascript
import fs from 'node:fs';

fs.mkdirSync('aaa/bbb/ccc/ddd', {
    recursive: true
});

fs.writeFileSync('aaa/a.txt', '111');
fs.writeFileSync('aaa/bbb/b.txt', '222');
fs.writeFileSync('aaa/bbb/ccc/c.txt', '333');
fs.writeFileSync('aaa/bbb/ccc/ddd/d.txt', '444');
```

首先，递归创建目录，并写入 4 个文件。

```bash
node fs3.mjs
```


然后来复制下：

创建 fs4.mjs

```javascript
import fs from 'node:fs';
import path from 'node:path';

function copyDir(srcDir, destDir) {
    fs.mkdirSync(destDir, { recursive: true });

    for (const file of fs.readdirSync(srcDir)) {
      const srcFile = path.resolve(srcDir, file)
      const destFile = path.resolve(destDir, file)
      copy(srcFile, destFile)
    }
}

function copy(src, dest) {
    const stat = fs.statSync(src)
    if (stat.isDirectory()) {
        copyDir(src, dest)
    } else {
        fs.copyFileSync(src, dest)
    }
}

copy('aaa', 'aaa2');
```

用 fs.statSync 拿到文件的信息，如果是目录就递归复制目录，否则就 fs.copyFileSync 复制文件。

目录的复制就是用先用 fs.mkdirSync 创建目录，然后用 fs.readdirSync 读取目录的内容。

用 path.resolve 拼接下路径为绝对路径，之后继续递归 copy

跑一下：

```bash
node fs4.mjs
```


当然，其实 fs 有个 cpSync 的方法可以直接用，不用自己实现。


```javascript
fs.cpSync('aaa', 'aaa3', {
    recursive: true
});
```


不过 fs 这个 cpSync 方法直到 node 22 才不再是实验性的：


所以低版本 node 还是要自己实现，或者用 fs-extra：

---

## zlib

zlib 是压缩和解压的，但它不是用于常用的那种压缩包，而是用于 http 传输数据时的 gzip、deflate、brotli 等压缩格式

也就是这个：


http 请求的时候会带上 Accept-Encoding 表示自己支持的压缩格式。

服务端会通过 Content-Encoding 的 header 来标识响应使用的压缩格式。


前面单独用过 gzip 的压缩，是这样用的：

```javascript
import {
    createReadStream,
    createWriteStream,
} from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createGzip } from 'node:zlib';

const gzip = createGzip();
const source = createReadStream(import.meta.dirname + '/data.txt');
const destination = createWriteStream('data.txt.gz');

await pipeline(source, gzip, destination);
```


压缩成功了。

点击解压，就可以看到其中的文件。

但最常用的还是在 http 服务上。

创建 zlib-http-server.mjs

```javascript
import zlib from 'node:zlib';
import http from 'node:http';
import fs from 'node:fs';
import { pipeline } from 'node:stream/promises';

const server = http.createServer(async (request, response) => {
    const raw = fs.createReadStream('index.html');

    const acceptEncoding = request.headers['accept-encoding'] || '';

    try {
        if (/\bdeflate\b/.test(acceptEncoding)) {
            response.writeHead(200, { 'Content-Encoding': 'deflate' });
            await pipeline(raw, zlib.createDeflate(), response);
        } else if (/\bgzip\b/.test(acceptEncoding)) {
            response.writeHead(200, { 'Content-Encoding': 'gzip' });
            await pipeline(raw, zlib.createGzip(), response);
        } else if (/\bbr\b/.test(acceptEncoding)) {
            response.writeHead(200, { 'Content-Encoding': 'br' });
            await pipeline(raw, zlib.createBrotliCompress(), response);
        } else {
            response.writeHead(200, {});
            await pipeline(raw, response);
        }
    } catch(err) {
        response.end();
        console.error('An error occurred:', err);
    }
})

server.listen(8080);
```

用 http.createServer 创建一个 http 服务。

拿到请求的 accept-encoding 的 header。

根据支持的压缩格式，分别用 zlib.createDeflate、zlib.createGzip、zlib.createBrotliCompress 压缩

具体的用法就是 stream 的 pipeline

这里的 \\b 是正则表达式里的单词边界的语法，也就是逗号、空格这些。

然后创建 index.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    hello
</body>
</html>
```

跑一下：

```bash
node ./zlib-http-server.mjs
```

浏览器访问：


可以看到，返回的内容解析出来了，并且用的是 deflate 压缩格式。

用 curl 测试下：

```bash
curl -H "accept-encoding: gzip" --compressed -i http://localhost:8080
```


```bash
curl -H "accept-encoding: deflate" --compressed -i http://localhost:8080
```


没啥问题。

> 代码上传了[文档仓库](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/node-api-test)

---

## sqlite

[Node.js 22](https://nodejs.org/docs/latest/api/sqlite.html) 之后，内置了 sqlite 模块，可以用来存储一些复杂的关系型数据：


创建 sqlite.mjs

```javascript
import { DatabaseSync } from 'node:sqlite';
const database = new DatabaseSync('data.db');

database.exec(`
  CREATE TABLE student(
    id INTEGER PRIMARY KEY,
    name TEXT,
    age INT
  ) STRICT
`);

const insert = database.prepare('INSERT INTO student (id, name, age) VALUES (?, ?, ?)');
insert.run(1, '张三', 20);
insert.run(2, '李四', 21);
insert.run(3, '王五', 22);

const query = database.prepare('SELECT * FROM student ORDER BY id');
console.log(query.all());
```

创建 DatabaseSync 的实例，指定存储的文件位置。

exec 方法是执行 sql

prepare 方法也是准备 sql，其中 ? 是占位符，后面调用 run 方法传入具体的值才会执行。

先创建了 student 表，插入了三条数据，然后查询出来。

跑一下：

```bash
node --experimental-sqlite ./sqlite.mjs
```


记得要切换下 node 版本到 22 以上再跑，而且要加上 --experimental-sqlite 才行（Node 23.4、22.13 及以后的版本已默认启用，无需再加该 flag），目前仍处于实验状态。

执行后创建了表、并插入了几条数据，然后用 sql 查询了出来。

数据都存放在 data.db 这个文件里，二进制存储的：


还可以用一些 GUI 客户端来可视化的管理。

比如 DB Browser for SQLite


点击 open database，选择刚才的文件，就可以看到 db browser 把其中的表解析了出来：


可以看到所有的表的数据：


还可以执行 sql，按 cmd + enter 执行：

```sql
select * from student
select * from student WHERE name = '张三'
```


增删改数据后，点击 write changes 按钮，才会把改动写入文件。

当然，现在 node:sqlite 还不稳定，目前最好还是用 sqlite 这个包来写。

用法都差不多：


> 代码上传了[文档仓库](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/node-api-test)

---

## stream

stream 是流相关的 api，前面单独一节讲过，这里简单再过一遍：

Node.js 一共有 4 种 stream，也就是 Readable（可读流）、Writable（可写流）、Duplex（双工流）、Transform（转换流）

流和流可以组合，也就是这样：


这条 pipeline 的特点是 Readable 产生数据，然后经过任意多个 Duplex（包括 Transform），最后传入 Writable

其实经常会用到流：

比如用 http.request 发请求时，返回的 res 就是一个可读流：


读取文件用的 fs.createReadStream 也是一个可读流：


可写流 Writable 也用的非常多：

fs.createWriteStream 创建的就是可写流：


而 socket 这种可读可写的是双工流 Duplex：


而 Transform 转换流也是一种 Duplex，它会对内容做转换之后返回新的内容：


比如 zlib 的 createGzip。

这 4 种流都是可以自定义的：

Readable：


实现 _read 方法，通过 this.push 返回数据，this.push(null) 代表结束

Writable：


实现 _write(chunk, encoding, callback) 方法，写完后调用 callback() 表示本次写入完成。

Duplex：


同时实现 _read、_write 方法

Transform：


实现 _transform(chunk, encoding, callback) 方法，用 this.push 返回转换后的数据，最后调用 callback()

流和流之间可以 pipe 连接，也可以直接 pipeline 连接：


这些在 stream 那节讲过，只是简单复习一下。

---

## buffer

Buffer 是用来操作二进制数据的，前面单独一节写过。

来复习下：

JS 标准里有 ArrayBuffer 的 api 来保存字节数据，但它不能直接读写。

可以用 TypedArray 也就是 Uint8Array、Uint16Array 等以一个字节、两个字节为单位，通过下标读写。

也可以用 DataView 的 setUint16、getUint8 等来灵活读写。

ArrayBuffer 是存储可变数据的，可以读写，而 Blob 是用来不可变的二进制数据，用来传递一些参数之类的很合适，浏览器里的 File 就是 Blob 的子类，有 text、arrayBuffer 等方法来转换成别的格式。

ArrayBuffer、Blob、DataView、TypedArray 都是 JS 标准里的，不管是浏览器还是 Node.js 都有这些 api。

此外，Node.js 扩展了 Buffer 类，它是 Uint8Array 的子类（底层持有一块 ArrayBuffer），可以通过 alloc、from 创建 buffer，通过 readUint8、writeUint16LE 等来灵活读写。

Node.js 里很多 api 都是基于 Buffer 的，比如 fs.readFile。


当你指定字符集的时候，才会根据编码转为字符串：


创建 buffer.mjs

```javascript
import { Buffer } from 'node:buffer';

const buf1 = Buffer.alloc(10, 6);

const buf2 = Buffer.from('神说要有光', 'utf-8');

const buf3 = Buffer.from([1, 2, 3]);

console.log(buf1.toString('hex'))

console.log(buf2.toString('utf-8'))
console.log(buf2.toString('base64'))

console.log(buf3.toString('hex'))
```

分别用 Buffer.alloc 创建了长度为 10 用 6 填充的 buffer，用 Buffer.from 创建了用数组、字符串来填充的 buffer。

然后转为 hex、utf-8、base64 等编码格式。

跑一下：

```bash
node buffer.mjs
```


buffer 自带和 DataView 一样的灵活读写的 api：

创建 buffer2.mjs

```javascript
const { Buffer } = require('node:buffer');

const buffer = Buffer.alloc(10);

buffer.writeUint16LE(256, 0)

console.log(buffer.readUInt16LE(0));
console.log(buffer.readUint8(0), buffer.readUint8(1));
```

在下标 0 的位置写入占 2 个字节的 256、然后在 0 和 1 的位置分别读取两个字节的内容。

跑一下：

```bash
node buffer2.mjs
```


此外，这里的 LE、BE 也学过：


这是不同的数据存储顺序：


解析网络协议的时候都是大端的顺序（BE），而在处理本机数据的时候可能就要用小端的顺序（LE）了。

这些用到的时候再细看就行。

---

## string_decoder

这个模块是用来从 Buffer 根据编码解析成字符串的。

创建 string_decoder.mjs

```javascript
import { StringDecoder } from 'node:string_decoder';
import { Buffer } from 'node:buffer';

const decoder = new StringDecoder('utf8');

const buf = Buffer.from('神说要有光', 'utf-8');
console.log(decoder.write(buf));
```

学过 Buffer.from 是用来创建 buffer 的，然后用 StringDecoder 就可以把 Buffer 解析为字符串。

跑一下：

---

## http

http 常用的就两个功能，一个起 http 服务，另一个就是发送 http 请求：

发送 http 请求写过：


调用 http.request，传入 options。

这个 options 可以用 url.urlToHttpOptions 来解析产生。

返回的是一个可读流。

而创建 http 服务是这样的：

创建 http-server.mjs

```javascript
import http from 'node:http';
import fs from 'node:fs';

const server = http.createServer(async function (req, res) {
    const writeStream = fs.createWriteStream('aaa.txt', 'utf-8');
    req.pipe(writeStream);

    res.write('66666');
    res.end('done');
});

server.listen(8000);
```


它的 req 是可读流， pipe 到一个文件写入流。

它的 res 是可写流，通过 write 方法返回内容。

跑一下：

```bash
node ./http-server.mjs
```

通过 curl 访问：

```bash
curl -X POST -d "name=guang&age=20" http://localhost:8000
```


可以看到，req 的请求体写入了文件，res 返回的内容返回给了客户端。

此外，作为 http 服务，还可以读取 req.headers，设置 res.statusCode 等：


用到的时候再细看就行。

---

## net

http 模块是创建 http 服务器、发送 http 请求相关的。

而 net 则是处理 TCP 相关的。

我们知道，TCP 是双向通信的：

创建服务端 net-tcp-server.mjs

```javascript
import net from 'node:net';

const server = net.createServer(function(clientSocket){
    console.log('新的客户端 socket 连接');

    clientSocket.on('data', function(data){
        console.log(data.toString());

        clientSocket.write('hello');
    });

    clientSocket.on('end', function(){
        console.log('连接中断');
    });
});

server.listen(6666, 'localhost', function(){
    const address = server.address();

    console.log('被监听的地址为：%j', address);
});
```

跑一下：

```bash
node net-tcp-server.mjs
```


跑了一个 tcp 的服务。

然后再创建个 tcp 的客户端；

net-tcp-client.mjs

```javascript
import net from 'node:net';

const socket = net.createConnection({
    host: 'localhost',
    port: 6666
}, () => {
  console.log('连接到了服务端!');

  socket.write('world!\n');

  setTimeout(()=> {
    socket.end();
  }, 2000);
});

socket.on('data', (data) => {
  console.log(data.toString());
});

socket.on('end', () => {
  console.log('断开连接');
});
```

连上 tcp 服务端，发送条消息，然后 2s 后断开连接。

跑一下：

---

## dgram

TCP 是双向实时通信的，而 UDP 是单向的数据报。

dgram 就是用来处理 UDP 通信的。

DNS 协议就是基于 UDP 的，之前跑过一个 DNS 服务器


首先跑一个 udp 服务器，通过 Buffer 解析二进制的协议。

根据域名分别做转发、自己返回协议两种处理。

处理协议的过程就是用之前学的 Buffer 的 api 来读写：


转发的时候，这样发送数据报：


修改系统偏好设置里的本地 DNS 服务器地址指向本机（windows 下也有修改 DNS 的地方）：


然后用 nslookup 测试过：


返回的 ip 地址是自定义的。

这就是 UDP 相关 api 的应用场景。

> 代码上传了[文档仓库](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/node-api-test)

---

## dns

dns 模块，顾名思义就是用来查询域名对应的 IP 的。

试一下：

创建 dns.mjs

```javascript
import dns from 'node:dns/promises';

async function main() {
    const res = await dns.resolve('juejin.com');
    console.log(res);
}

main();
```

跑一下：

---

## crypto

crypto 模块是用来加密的，有很多加密的 api。

平时存入数据库的密码做加密，一般就会用这个模块：

创建 crypto.mjs

```javascript
import crypto from 'node:crypto';

export function md5(str) {
    const hash = crypto.createHash('md5');
    hash.update(str);
    return hash.digest('hex');
}

console.log(md5('123456'));
```

不会直接明文存储密码，而是会 md5 然后转为 16 进制字符串再存。

跑一下：

```bash
node ./crypto.mjs
```


你还可以用流的方式来处理：

创建 crypto2.mjs

```javascript
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';

const rs = new Readable();
rs._read = function() {
    this.push('123456');
    this.push(null);
}

const hash = createHash('md5');
rs.pipe(hash).setEncoding('hex').pipe(process.stdout);
```

创建一个 Readable，重写 _read 方法，通过 this.push 返回内容，this.push(null) 结束。

把这个可读流 pipe 到 crypto 的转换流，最后 pipe 到 process.stdout 标准输出流。


跑一下：

```bash
node crypto2.mjs
```


除了 md5 外，crypto 还支持 sha256 等加密算法，也很常用：


此外，你还可以用 crypto 产生随机数：

创建 crypto3.mjs

```javascript
import crypto from 'node:crypto';

console.log(crypto.randomInt(10));
console.log(crypto.randomInt(10));
console.log(crypto.randomInt(10));
console.log(crypto.randomInt(10));

console.log(crypto.randomUUID());
console.log(crypto.randomUUID());
```

产生 0 到 9 的随机数，或者产生唯一的 uuid：

---

## child_process

child_process 是用来跑子进程、和子进程通信的模块。

它有 4 个 api：

* spawn：执行 shell 命令，参数通过数组传入
* exec：执行 shell 命令，整个作为字符串传入
* execFile：执行可执行文件
* fork：跑 js 子进程

试一下：

创建 cp1.mjs

```javascript
import cp from "node:child_process";

const ls = cp.spawn('ls', ['-l', './']);

ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) => {
  console.log(`进程退出 ${code}`);
});
```

spawn 可以执行 shell 命令，参数通过数组传入。

每个进程都有标准输入流 stdin、标准输出流 stdout、标准错误流 stderr

stdout 和 stderr 都是可读流，监听 data 事件，拿到内容。

跑一下：

```bash
node ./cp1.mjs
```


exec 是基于 spawn 封装出来的，功能一样：

创建 cp2.mjs

```javascript
import cp from "node:child_process";

const ls = cp.exec('ls -l');

ls.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

ls.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

ls.on('close', (code) => {
  console.log(`进程退出 ${code}`);
});
```

它的参数不用单独数组传入了，可以整个作为字符串传入。

跑一下：


execFile 是跑可执行文件的：

比如这是我本地 chrome 浏览器的可执行文件路径：

```text
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
```

我指定一个 --user-data-dir=./aaa 它会跑一个新的浏览器，数据存在 aaa 目录下：


那如何通过 node 跑这个可执行文件呢？

就是用 execFile。

创建 cp3.mjs

```javascript
import cp from 'node:child_process';

const child = cp.execFile('/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome', ['--user-data-dir=./aaa']);
```

跑一下：


fork 是用来跑 js 进程的：

创建 cp4.mjs

```javascript
import cp from 'node:child_process';

cp.fork('./cp1.mjs');
```

跑一下：


child_process 创建子进程的方法就这 4 个。

---

## cluster

child_process 只是创建子进程，也支持父子进程之间的通信。

如果要一次性跑很多进程呢？

这种就要用 cluster 了。

比如 node.js 单线程，但是想利用多核 cpu 的能力，通过多进程来提升性能。

可以这样：

创建 cluster.mjs

```javascript
import cluster from 'node:cluster';
import http from 'node:http';
import { cpus } from 'node:os';

const numCPUs = cpus().length;

if (cluster.isPrimary) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('fork', (worker) => {
    console.log('worker 创建成功', worker.id);
  });

  cluster.on('exit', (worker, code, signal) => {
    console.log('worker 退出:', worker.id);
  });
} else {
  const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('hello world\n');
  })

  server.listen(8000);

  setTimeout(()=> {
    process.exit();
  }, 3000)
}
```

根据 cpu 个数来跑了 n 个进程，每个进程跑了一个服务器，这样请求会分配到多个服务器中去。

然后子进程里 3s 后退出进程。

父进程监听 fork、exit 事件在进程创建、退出时做处理。

跑一下：


不过一般不会自己调用 cluster 模块，而是用 pm2 这种进程管理器来做。

创建 cluster2.mjs

```javascript
import http from 'node:http';

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('hello guang\n');
})

server.listen(8000);
```

然后用 pm2 来跑多个进程：

```bash
npx pm2 start -i max ./cluster2.mjs
```

\-i max 就是按照 cpu 个数来跑多个进程：


可以看到，也是一次性跑了 8 个。

浏览器访问下：


没啥问题。

一般真要做多进程扩展，直接用 pm2 就行，没必要自己调用 cluster 模块。

---

## worker_threads

学过 child_process 是用来创建子进程的，其实 node 也支持创建工作线程。

就是 worker_threads 模块。

比如很大计算量的任务，放在主线程会很耗时，完全可以把它拆到工作线程中去，异步处理。

创建 worker_threads_main.mjs

```javascript
import { Worker, MessageChannel } from 'node:worker_threads';

const { port1, port2 } = new MessageChannel();

const worker = new Worker('./worker_threads_worker.mjs');
worker.postMessage(
    { value: 10*10000*10000, channel: port2 },
    [port2]
);

port1.on('message', (value) => {
    console.log('res', value);
})
```

创建主线程，用 new Worker 创建工作线程。

MessageChannel 是创建通信的通道，它有两个端口 port1 和 port2。

你在 port1 里 postMessage，在 port2 里就可以用 message 事件接收到消息，反过来也是。

很容易理解，就像一个管子的两个口：


其实和浏览器里的工作线程的 api 是差不多的：


然后创建工作线程 worker_threads_worker.mjs

```javascript
import { parentPort } from 'node:worker_threads';

function calc(num) {
    let total = 0;
    for(let i = 0; i< num; i++) {
        total += i;
    }
    return total
}

parentPort.on('message', (message) => {
    const res = calc(message.value);

    message.channel.postMessage(res);
});
```

工作线程通过 parentPort 和父线程通信。

跑一下：

```bash
node ./worker_threads_main.mjs
```


可以看到，工作线程计算出了结果，并且异步的返回了。

---

## readline

readline 字面意思来看是一行一行的读取，这确实是它的功能之一。

创建 readline.mjs

```javascript
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

const rl = createInterface({
  input: createReadStream('./repl.mjs')
});

rl.on('line', (line) => {
  console.log(`Line from file: ${line}`);
});
```

按照行来读取文件可读流里的内容。

跑一下：

```bash
node readline.mjs
```


当然，它的 input 也可以是标准输入 stdin，这样就变成了类似 repl 的效果：

创建 readline2.mjs

```javascript

import { createInterface } from 'node:readline';
import { exit, stdin, stdout } from 'node:process';

const rl = createInterface({
  input: stdin,
  output: stdout,
  prompt: 'guang> ',
});

rl.prompt();

rl.on('line', (line) => {
  switch (line.trim()) {
    case 'hello':
      console.log('world!');
      break;
    default:
      console.log(`你说啥？我听到的是 '${line.trim()}'`);
      break;
  }
  rl.prompt();
}).on('close', () => {
  console.log('bye!');
  exit(0);
});
```

跑一下：


同样是按行读取，只不过现在读取的是 stdin，也就是用户输入。

当用户按回车的时候来处理。

而且还支持输出 prompt，这样确实和 repl 效果一样了。

此外，readline 还可以支持键盘输入。

之前写过一个例子：

创建 readline3.mjs

```javascript
import readline from 'node:readline';

readline.emitKeypressEvents(process.stdin);

process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {

    console.log(str, key)

    if(key.sequence === '\u0003') {
        process.exit();
    }
});
```

readline 模块的 emitKeypressEvents 可以让输入流处理键盘事件。

然后 stdin.setRawMode(true) 是禁用掉内置的一些键盘事件处理，比如 ctrl + c 退出进程

监听 keypress 事件，打印下。

自己判断输入的是 ctrl + c 的时候，退出。


这就是 readline 模块的三个功能：按行读取文件、按行读取用户输入（类似 repl）、处理键盘事件

---

## vm

vm 模块可以创建一个 JS 执行环境。

比如写单测的时候，你会发现 test、describe 这些都是全局变量，但写其他 JS 代码的时候就没有这些。

很明显，test 脚本跑在一个单独的环境里。

那如何创建一个单独的 JS 运行环境呢？

就是用 vm 模块。

创建 vm.mjs

```javascript
import vm from 'node:vm';

const context = {
    console,
    guang: 111,
    dong: 222
}

vm.createContext(context);

vm.runInContext('console.log(guang + dong)', context);
```

用 vm.createContext 创建了一个上下文。

有 console、guang、dong 这三个全局变量。

然后用 runInContext 来跑了一段 JS 代码，传入 context。

跑一下：

```bash
node vm.mjs
```


其实你每天跑的单测，实现原理就是这个。

自定义了 context，所以才可以直接用 test、describe 等全局 api。

---

## repl

repl 是 Read-Eval-Print-Loop，也就是这个东西：


可以交互式的来执行一些脚本。

如果你也想创建这种 repl，直接用 repl 模块就行。

创建 repl.mjs

```javascript
import repl from 'node:repl';

const r = repl.start({ prompt: '> ', eval: myEval});

function myEval(cmd, context, filename, callback) {
    console.log('你输入的命令：' + cmd);
    callback();
}
```

创建一个 repl，指定 eval 的处理函数。

cmd 是用户输入的内容

context 是 node 的所有 api，比如 context.fs

最后调用 callback 才会结束处理，所以可以异步处理，处理完调用 callback

跑一下：

```bash
node ./repl.mjs
```


引入 cfonts 来做下艺术字：

```bash
npm install --save cfonts
```

改下代码：

```javascript
import repl from 'node:repl';
import cfonts from 'cfonts';

const r = repl.start({ prompt: '> ', eval: myEval});

function myEval(cmd, context, filename, callback) {
    cfonts.say(cmd, {
        font: '3D',
        colors: ['yellow', 'cyan']
    });
    callback();
}

```

跑一下：

---

## v8

我们知道，通过 os 模块可以拿到系统的 cpu、内存、网卡等信息。

那如果想知道 Node.js 的 v8 的内存等信息呢？

这种就要用 v8 模块了。

它提供了查询内存状况、设置运行参数等的 api。

创建 v8.mjs

```javascript
import v8 from 'node:v8';

console.log(v8.getHeapSpaceStatistics());

console.log(v8.getHeapStatistics());
```

getHeapSpaceStatistics 是拿到堆内存的每一部分的统计信息。

getHeapStatistics 是拿到堆内存整体的统计信息。

跑一下：

```bash
node v8.mjs
```


可以看到，v8 的堆内存划分了这些部分，并且给出了每一部分的 size 等信息。

而下面是整个堆内存的统计信息：


你还可以运行时给 v8 设置一些 flags，这样：


全部的 v8 flags 可以看这里：

[v8 flags 一览（gist）](https://gist.github.com/andrewiggins/68c3165d47769a39eb5ae16e3001d6c6)

> 代码上传了[文档仓库](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/node-api-test)
