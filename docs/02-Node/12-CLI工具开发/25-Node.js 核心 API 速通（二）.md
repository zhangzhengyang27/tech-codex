---
title: Node.js 核心 API 速通（二）
description: 核心 API 速通第二篇：文件系统与路径相关 API 速览
keywords: [Node.js, CLI, commander, API]
category: Node.js
tags: [Node.js, CLI工具开发]
---







# Node.js 核心 API 速通（二）

这节继续来过 node.js 的核心 API。

## stream

stream 是流相关的 api，前面单独一节讲过，这里简单再过一遍：

Node.js 一共有 4 种 stream，也就是 Readable（可读流）、Writable（可写流）、Duplex（双工流）、Transform（转换流）

流和流可以组合，也就是这样：


这条 pipeline 的特点是 Readable 产生数据，然后经过任意多个 Duplex（包括 Transform），最后传入 Writable

其实经常会用到流：

比如上节用 http.request 的时候，返回的 res 就是一个可读流：


读取文件用的 fs.createReadStream 也是一个可读流：


可写流 Writable 也用的非常多：

fs.createWriteStream 创建的就是可写流：


而 socket 这种可读可写的是双工流 Duplex：


而 Transform 转换流也是一种 Duplex，它会对内容做转换之后返回新的内容：


比如 zlib 的 createGzip。

这 4 种流都是可以自定义的：

Readable：


实现 \_read 方法，通过 this.push 返回数据，this.push(null) 代表结束

Writable：


实现 \_write(chunk, encoding, callback) 方法，写完后调用 callback() 表示本次写入完成。

Duplex：


同时实现 \_read、\_write 方法

Transform：


实现 \_transform(chunk, encoding, callback) 方法，用 this.push 返回转换后的数据，最后调用 callback()

流和流之间可以 pipe 连接，也可以直接 pipeline 连接：


这些在 stream 那节讲过，只是简单复习一下。

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

## 总结

这节又过了一些 node 内置模块的 api：

* **stream**：流相关的 api，主要有 Readable、Writable、Duplex、Transform 4 种流，以及可以通过 pipeline 把流连接起来，很多 node 的 api 都是基于流的
* **http**：主要是通过 http.createServer 创建 http 服务，通过 http.request 发送 http 请求，请求响应也是基于 stream 实现的
* **fs**：文件、目录的增删改查
* **zlib**：用于 http 服务的 deflate、gzip、br 等压缩算法

这些模块的 api 用的都很常用，有必要好好掌握。