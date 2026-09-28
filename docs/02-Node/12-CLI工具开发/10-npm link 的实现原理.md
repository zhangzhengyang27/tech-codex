---
title: npm link 的实现原理
description: npm link 的符号链接机制、全局 prefix 与本地 node_modules 的关联
keywords: [Node.js, CLI, commander, npm, link]
category: Node.js
tags: [Node.js, CLI工具开发]
---







# npm link 的实现原理

上节测试 cli 的时候，通过 npm link 把这个包安装到了全局。

那 npm link 是怎么实现的呢？

答案就是软链接。

软链接类似 windows 下的快捷方式。

试一下就知道了：

```bash
cd ~/

mkdir aaa-lib

cd ./aaa-lib

echo "console.log('hello')" > test.js
```


首先创建个目录和文件。

然后随便找一个别的目录，把 aaa-lib 目录软链过去：

```bash
cd ~/

mkdir bbb

cd bbb

ln -s ../aaa-lib ./aaa-lib
```


打开这个目录看下：


可以看到，bbb 目录下多了 aaa-lib 这个目录。

但并不是复制，用 `ls -al` 看下：

```bash
ls -al ~/bbb
```

输出里 aaa-lib 后面有一个 `->` 箭头标记，这就是软链接的标记。

跑一下：

```bash
node ./aaa-lib/test.js
```


这和复制有区别么？

当然有，复制是两份内容，而软链是同一份内容的两个引用。

改下源文件，再跑下 bbb 目录下的那份：

```bash
echo "console.log('hello2')" > ~/aaa-lib/test.js

cd ~/bbb

node ./aaa-lib/test.js
```


可以看到，改了源文件，软链文件的内容也跟着改了。

这就是软链。


软链这种机制有非常多应用，npm link 就是用软链实现的。

之前在项目目录下执行了 npm link，其实就是把这个包注册到了全局仓库。

但用的是软链的方式。

不信看下。

首先找下全局仓库的位置：

```bash
npm get prefix
```


当然，你的可能和我的不一样。

然后进入 lib/node\_modules 目录，就是全局包的安装目录。

```bash
ls "$(npm get prefix)/lib/node_modules"
```


可以看到，这个 my-nest-cli 就是上节全局安装的包。

进入 bin 目录，就是全局命令的目录。

```bash
open "$(npm get prefix))/bin"
```


其中，可以看到 my-nest-cli 注册的 my-cli 这个命令。

它同样是一个软链，指向 lib/node\_modules 下对应包的入口文件。


也就是说全局安装包的时候做了两件事：

* 往 npm get prefix 下的 lib/node\_modules 安装了这个包
* 往 npm get prefix 下的 bin 里放了这个包里注册的命令

这样会把这个 bin 目录加到环境变量 $PATH 里。

自然就可以直接调用这些全局命令了。


其实你本地 npm install 的时候也差不多：

首先在 node\_modules 下安装这个 npm 包

然后在 node\_modules/.bin 下放这个包注册的命令

和全局安装的流程一样，只是位置不同。


npm link 的实现也是这两步。

先从全局仓库把 my-nest-cli 删除。

```bash
npm uninstall -g my-nest-cli
```

再看下那两个目录：

```bash
ls "$(npm get prefix)/lib/node_modules"
ls "$(npm get prefix)/bin"
```


确实都没 my-nest-cli 了。

然后进入上节的项目目录，执行 npm link：

```bash
npm link
```


再看下这两个目录：

```bash
open "$(npm get prefix))/lib/node_modules"
open "$(npm get prefix)/bin"
```


看到这个箭头标记了么，说明这个 my-nest-cli 是 link 过去的。

看下原位置。

这就是你执行 npm link 的那个目录位置。


然后 bin 下的这个 my-cli 的命令，也是从项目目录 link 过来的：


所以说，npm link 会做两件事：

* 往 npm get prefix 下的 lib/node\_modules 安装了这个包（用 ln -s 创建的软链）
* 往 npm get prefix 下的 bin 里放了这个包里注册的命令（用 ln -s 创建的软链）

用起来和 npm install -g 的包的命令没区别。

删除自然也是用 npm uninstall -g xxx 来删，删除软链不影响源文件。

所以说，npm link 就是用软链模拟了 npm install -g。

此外，npm link 还有一个作用。

创建个项目：

```bash
mkdir tmp-project
cd tmp-project
npm init -y
```


进入项目，执行

```bash
npm link my-nest-cli
```


打印和 npm install 一样，提示添加了一个包。

看下 node\_modules：

```bash
ls -al node_modules
```

看到这个软链没，它是从哪 link 过来的呢？


从全局仓库 link 过来的。

还有 .bin 下的命令，也是从全局仓库 link 过来的。

画个图就清楚了：

- `npm link`（在包目录下执行）：在全局 lib/node\_modules 下创建指向当前项目的软链，并在全局 bin 下创建命令的软链。
- `npm link xxx`（在其他项目目录下执行）：把全局 lib/node\_modules 里的包软链到当前项目的 node\_modules 下，并把命令软链到 node\_modules/.bin 下。


## 总结

上节通过 npm link 来把项目安装到了全局，并且注册了全局命令。

用起来很方便。

这节探究了下实现原理。

原理就是软链接。

npm link 会做两件事：

* 在 npm get prefix 下的 lib/node\_modules 安装了这个包（用 ln -s 创建的软链）
* 在 npm get prefix 下的 bin 里放了这个包里注册的命令（用 ln -s 创建的软链）

而 npm link xxx 则是再把这个包 link 到项目的 node\_modules 下，并且把命令 link 到项目的 node\_modules/.bin 下。

其实和 npm install 一样，就是用软链模拟的 npm install 的过程。

所以删除自然也是用 npm uninstall。

软链在 node 生态里有很多应用，之后会继续探究。