---
title: Node.js 核心 API 速通（四）
description: 核心 API 速通第四篇：流、Buffer 与加密相关 API 速览
keywords: [Node.js, CLI, commander, API]
category: Node.js
tags: [Node.js, CLI工具开发]
---







# Node.js 核心 API 速通（四）

这节继续来过 Node.js 内置模块。

## child\_process

child\_process 是用来跑子进程、和子进程通信的模块。

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


child\_process 创建子进程的方法就这 4 个。

## cluster

child\_process 只是创建子进程，也支持父子进程之间的通信。

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

## 总结

这节又学了 4 个 Node.js 内置模块。

* **child\_process**：创建子进程的，有 exec、spawn、execFile、fork 这 4 个 api，前两个是跑 shell 命令的，execFile 是跑可执行文件的，fork 是创建 js 进程的
* **cluster**：创建多个进程，比如服务器的多进程扩展，不过一般不用自己写，直接用 pm2 就行
* **net**：创建 TCP 服务，发送 TCP 消息
* **dgram**：创建 UDP 服务，发送 UDP 消息，比如 DNS 协议就是基于 UDP

这些模块可能不常用，但还是要过一遍。