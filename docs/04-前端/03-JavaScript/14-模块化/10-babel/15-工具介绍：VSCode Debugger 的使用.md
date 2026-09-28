---
title: 工具介绍：VSCode Debugger 的使用
description: "介绍 VSCode Debugger 的使用与配置：launch/attach 两种模式、.vscode/launch.json 配置、断点与单步调试，以及 debugger server/client 通过 v8 debug protocol 通信的原理。"
keywords: [VSCode, Debugger, 调试, launch.json]
category: tools
tags: [Babel, 编译, AST, 插件]
---


# 工具介绍：VSCode Debugger 的使用

> 想看懂复杂代码离不开 debugger，它是提升 Node.js 水平必备的能力。因为后面的案例代码都是有一定的复杂度的，建议同学们先学会使用 debugger 再去学后面的案例，结合 debugger 来看。

这一节，我们来学习下 vscode debugger 的使用。


在 VSCode 中打开调试（Run and Debug）窗口，就可以看到启动调试的按钮；在想断住的那一行左侧点一下打上断点，点击调试后会以 debug 模式运行，到断点处停住，此时可以查看堆栈信息、变量、断点等。

这就是 vscode debugger 的基本使用方式。

## vscode debugger 的配置

会了怎么使用之后，我们来深入讲下怎么配置，希望能够让同学们的 nodejs 调试能力有所提升。

编辑 .vscode/launch.json 可以写各种调试配置；点击右下角的按钮会有菜单来选择配置的模版。运行环境有很多，比如 chrome、node.js 等，这里我们只需要 node.js 的环境。

然后启动方式分为 launch 和 attach 两种。为什么是这两种呢？

那是因为调试分为客户端和服务端：启动 node.js 的调试模式需要加上 `--inspect` 或 `--inspect-brk`（在首行断住）参数，之后会启动一个 websocket server 等待客户端连接，两者之间通过 v8 debug protocol 通信。

比如：
设置断点：
```javascript
{
    "seq":117,
    "type":"request",
    "command":"setbreakpoint",
    "arguments":{
        "type":"function",
        "target":"f"
    }
}
```
去掉断点：
```javascript
{
    "seq":117,
    "type":"request",
    "command":"clearbreakpoint",
    "arguments": {
        "type":"function",
        "breakpoint":1
     }
}
```
手动连接的话可以打开 chrome://inspect 页面，可以用 chrome devtools 的 debugger client 连上来调试。


但是，用 vscode 不用这么麻烦，直接在 .vscode/launch.json 里面配置下就可以。

前面提到 vsocde 的 debug 配置分为 launch 和 attach 两种：

- launch： 把 nodejs 代码跑起来，启动 debugger server，然后用 client 来连接
- attach：已经有了 debugger server，只需要启动一个 debugger client 连接上就行

所以 launch 的配置要指定运行什么 js 代码，而 attach 则只需要指定连接到哪个端口。

当然，本文中的代码都通过 launch 的配置就可以，如果添加的话也是类似上面的方式添加调试配置，然后就可以调试了。


vscode 提供了这几个控制按键（底层会发送 debug 协议的消息），点击按钮就可以让代码继续运行：

1. 继续运行，到下一个断点停住
2. 运行下一步（单步运行）
3. 执行到某个函数调用时进入函数内部
4. 跳出当前函数调用，然后往下执行
5. 重新运行
6. 终止运行

学会了 debugger 以后，api 不用记，打个断点都能看到。

## 总结

debug 能力是一种很重要的能力，比起 console.log 来能精确的知道每一步的运行结果，更容易读懂代码。

小册代码中有 vscode debugger 的配置，但是很多读者不会使用，所以这节来介绍了一下，主要是在 .vscode/launch.json 里面添加配置，然后在 debug 窗口来启动调试，之后就可以打断点和单步运行了。

vscode debugger 的使用分为这几步：
1. 在 .vscode/launch.json 里面添加对应 js 文件的调试配置
2. 在要调试的那行左边打断点
3. 点击调试窗口的调试按钮启动调试
4. 点击下一步、下一个断点、进入函数内部等方式来部分执行代码

debugger 的实现原理是分为一个 debugger server 和一个 debugger client，debugger server 在 js 引擎里面，debugger client 包括 chrome devtools、vscode debugger 等，他们两者之间通过调试协议通信，比如 v8 debug protocol。

launch 的方式就是启动一个 debugger server（websocket），然后用 debugger client 连接上，发送消息来控制单步执行、打断点等。

而 attach 只是启动 client，连上已有的 debugger server，后续流程一样。

node --inspect xxx.js 就可以看到 ws://127.0.0.1:9229 这样的地址，这就是 websocket 的 debugger server 的地址。客户端用 chrome devtools 可以，用 vscode 或者其他 ide 都可以，因为他们都实现了 v8 debug protocol 的 websocket client，只是做了各自的 ui。（当然，原理做了解即可，了解原理的目的是为了更好的使用工具）。

希望同学们能掌握 vscode debugger 的使用，对更好的理解案例代码有很大的帮助。

扩展阅读（想更深入 debugger 的同学可以看下）：

用 VSCode 调试网页的 JS 代码有多香

如何让 Vue、React 代码的调试变得更爽


让你 nodejs 水平暴增的 debugger 技巧

