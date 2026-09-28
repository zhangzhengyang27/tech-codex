---
title: Docker 入门与原理
description: "后端系统会部署很多服务，包括自己开发的服务，还有 mysql、redis 等中间件的服务，部署它们需要一系列依赖的安装、环境变量的设置等等。"
keywords: [Docker, Desktop, Dockerfile, 原理, Namespace]
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# Docker 入门与原理

后端系统会部署很多服务，包括自己开发的服务，还有 mysql、redis 等中间件的服务，部署它们需要一系列依赖的安装、环境变量的设置等等。

如果你要部署多台机器的话，同样的操作要重复多次，万一哪一步漏掉了，服务就跑不起来了。就很麻烦。

而 Docker 就能完美解决这个问题：它把系统的所有文件封装成一个镜像，镜像跑起来作为容器，它可以在一台机器上跑多个容器，每个容器都有独立的操作系统环境，比如文件系统、网络端口等，在容器内跑各种服务。

这样整个环境都保存在这个镜像里，部署多个实例只要通过这个镜像跑多个容器就行。

## 一、通过 Docker Desktop 入门

Docker 提供了 Docker Hub 镜像仓库，可以把本地镜像 push 到仓库或者从仓库 pull 镜像到本地。

### 1.1 安装 Docker Desktop

首先需要安装 Docker，直接从[官网](https://docker.com)下载 docker desktop 就行：

（windows 选择 windows 的安装包。m1 要注意芯片类型，选择 apple chip 那个包）

它内置了 docker 命令。把它安装到系统之后，可以在命令行看下 docker 命令是否可用。如果不可用，那要设置下：点击 Settings > Advanced，里面有两种安装路径，如果是 /usr/local/bin，那 docker 命令就是直接可用的，因为这个路径在 PATH 变量里。如果是第二种，那就需要手动把它加到 PATH 环境变量里。

然后来看看 docker desktop 的界面：images 是本地的所有镜像，containers 是镜像跑起来的容器。docker desktop 可以可视化的管理它们，很方便。

### 1.2 pull 一个 11-Nginx基础概述 镜像

搜索 11-Nginx基础概述 镜像，点击 pull（搜索这步需要翻墙，不然搜不到）。pull 下来之后，就可以在本地 images 看到了。如果搜不到，那直接在命令行用 docker search、docker pull 搜索和拉取镜像也可以。

点击 run 会让你填一些参数：

- **名字**：如果不填，docker desktop 会给你生成随机的容器名字
- **端口**：容器内跑的 11-Nginx基础概述 服务是在 80 端口，你要把宿主机的某个端口映射到容器的 80 端口才可以访问
- **数据卷 volume**：把宿主机某个目录挂到容器内。因为容器是镜像跑起来的，下次再用这个镜像跑的还是同样的容器，那你在容器内保存的数据就会消失。所以都是把某个宿主机目录，挂载到容器内的某个保存数据的目录，这样数据是保存在宿主机的
- **环境变量**：指定容器的环境变量

分别设置一下：挂载本地的 /tmp/aaa 到容器内的 /usr/share/11-Nginx基础概述/html 目录。这里的 /tmp/aaa 可以换成宿主机的任何目录，如果是 windows 系统，那就是类似 D:/tmp/aaa 这种。

**（注意，这里是 /usr 而不是 /user）**

点击 run，可以看到容器内的 11-Nginx基础概述 服务跑起来了。在 /tmp/aaa 目录下添加一个 index.html，浏览器访问 <http://localhost> 就可以访问到，这说明数据卷挂载成功了。

点击 files 标签就可以看到容器内的文件，可以看到 /usr/share/11-Nginx基础概述/html 被标识为 mounted，就是挂载目录的意思。再在本地添加一个文件，你会发现容器内这个目录内容也变了。这就是 volume 挂载的作用。

如果你挂载某些目录报错，是因为 docker desktop 挂载的目录是需要配置的，在 Settings > Resources > File Sharing 里加一下就行。

通过命令行 docker run 来跑镜像，-v 是指定挂载的数据卷，后面的 :ro 代表 readonly，也就是容器内这个目录只读，:rw 表示容器内可以读写这个目录。

### 1.3 Docker 常用命令

在服务器上没有 Docker Desktop 这种东西，还是要敲命令的。比如点击 pull 按钮，就相当于执行了 docker pull：

```
docker pull 11-Nginx基础概述:latest
```

latest 是标签。然后点击 run 按钮，填了个表单，就相当于执行了 docker run：

```
docker run --name 11-Nginx基础概述-test2 -p 80:80 -v /tmp/aaa:/usr/share/11-Nginx基础概述/html -e KEY1=VALUE1 -d 11-Nginx基础概述:latest
```

- **-p** 是端口映射
- **-v** 是指定数据卷挂载目录
- **-e** 是指定环境变量
- **-d** 是后台运行

docker run 会返回一个容器的 hash（就是这里的 id）。这个界面可以用 docker ps 来获取，它是显示容器列表的，默认是运行中的。想显示全部的，可以加个 -a。

除了 container 列表，image 镜像列表也可以通过 docker images 命令获取。

在容器的 terminal 里执行命令，对应的是 docker exec 命令：-i 是 terminal 交互的方式运行，-t 是 tty 终端类型，然后指定容器 id 和 shell 类型，就可以交互的方式在容器内执行命令了。

查看日志，对应 docker logs 命令；exit 退出。docker inspect 可以查看容器的详情，对应 desktop 里的 inspect 的 tab。docker volume 可以管理数据卷，对应 desktop 的这部分。

此外，还有这些常用命令：

- docker start：启动一个已经停止的容器
- docker rm：删除一个容器
- docker stop：停止一个容器

## 二、编写你的第一个 Dockerfile

上节通过 desktop 从 docker hub 拉取了 11-Nginx基础概述 的镜像，并把它跑了起来。那如果要自己制作一个这样的镜像，怎么做呢？

docker 容器内就是一个独立的系统环境，要安装 11-Nginx基础概述 服务，需要执行一些命令、复制一些文件进来，然后启动服务。制作镜像自然也要进行这样的过程，不过可以自动化。只要在 dockerfile 里声明要做哪些事情，docker build 的时候就会根据这个 dockerfile 来自动化构建出一个镜像来。

比如这样：

```docker
FROM node:latest

WORKDIR /app

COPY . .

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install -g http-server

EXPOSE 8080

CMD ["http-server", "-p", "8080"]
```

这些指令的含义如下：

- FROM：基于一个基础镜像来修改
- WORKDIR：指定当前工作目录
- COPY：把容器外的内容复制到容器内
- EXPOSE：声明当前容器要监听的网络端口，比如这里起服务会用到 8080
- RUN：在容器内执行命令
- CMD：容器启动的时候执行的命令

先通过 FROM 继承了 node 基础镜像，里面就有 npm、node 这些命令了。通过 WORKDIR 指定当前目录。然后通过 COPY 把 Dockerfile 同级目录下的内容复制到容器内，这里的 . 也就是 /app 目录。之后通过 RUN 执行 npm install，全局安装 http-server。通过 EXPOSE 指定要暴露的端口。CMD 指定容器跑起来之后执行的命令，这里就是执行 http-server 把服务跑起来。

把这个文件保存为 Dockerfile，然后在同级添加一个 index.html，然后通过 docker build 就可以根据这个 dockerfile 来生成镜像：

```
docker build -t aaa:ccc .
```

aaa 是镜像名，ccc 是镜像的标签。FROM 是继承一个基础镜像，看输出也可以看出来，前面都是 node 镜像的内容，会一层层下载下来。最后才是本地的添加的那些。

这时你在 desktop 的 images 列表里就可以看到这个镜像了，然后执行 docker run 把这个镜像跑起来（用 desktop 直接点击 run 按钮）。指定容器名、映射的端口、点击 run，可以看到容器内的日志，服务启动成功了。容器内打印的是 8080 端口，但在容器外要用映射的 8888 端口访问，访问 <http://localhost:8888> 就可以看到在 html 写的内容了。

在 files 里看看 /app 下是啥内容：双击 index.html，可以看到这就是 build 镜像的时候 COPY 进去的文件。

### 2.1 VOLUME 指令的作用

但是想修改静态文件怎么办呢？进入容器内改太麻烦，不如把这个 /app 目录设置为挂载点。这样改下 Dockerfile（把启动命令换成 `http-server ./html -p 8080` 等），然后重新 build 出一个镜像来：

```
docker build -t aaa:ddd -f 2.Dockerfile .
```

因为现在不是默认的 Dockerfile 了，需要用 -f 指定下 dockerfile 的文件名。构建完之后再 run 一下这个新镜像，这次把桌面目录作为数据卷挂载到 /app 目录了。容器跑起来后可以看到确实挂载上去了，也标识为了 mount，在 inspect 这里也可以看到挂载的目录。

那为啥还要指定 VOLUME？

在 dockerfile 里指定 VOLUME 之后，如果你 docker run 的时候没有带 -v，那会放在一个临时的目录里。如果你直接点击 run，不设置参数，docker 会随机给他生成一个名字，还会随机生成一个目录作为数据卷挂载上去。inspect 可以看到这时候的路径是一个临时的目录。这样就算你删了容器，数据也可以在这里找回。

设想下，如果你跑了个 mysql 容器，存了很多数据，但是跑容器的时候没指定数据卷。有一天，你把容器删了，所有数据都没了，可不可怕？为了避免这种情况，mysql 的 dockerfile 里是必须声明 volume 的，这样就算你没通过 -v 指定数据卷，将来也可以找回数据。这样就能保证数据不丢失。

## 三、Docker 是怎么实现的？

前面学习了 Docker 镜像、容器的各种操作和 dockerfile 的编写（dockerignore、镜像的多阶段构建这些优化手段下一篇再展开）。那它到底是怎么实现的呢？Docker 容器跑起来就像一个独立的系统一样，它是怎么做到的？

如果网页上有两份 aaa、bbb 变量，怎么保证它们不冲突呢？namespace 呀：变成 xxx.aaa、xxx.bbb 和 yyy.aaa、yyy.bbb 就不冲突了。Docker 在一个操作系统上实现多个独立的容器也是这种思路。

### 3.1 Namespace：实现资源隔离

linux 操作系统提供了 namespace 机制，可以给进程、用户、网络等分配一个命名空间，这个命名空间下的资源都是独立命名的。类似这样的 namespace 常见的有下面 6 种（此外较新的内核还提供了 cgroup、time 等 namespace）：

- PID namespace：进程 id 的命名空间
- IPC namespace：进程通信的命名空间
- Mount namespace：文件系统挂载的命名空间
- Network namespace：网络的命名空间
- User namespace：用户和用户组的命名空间
- UTS namespace：主机名和域名的命名空间

通过这 6 种命名空间，Docker 就实现了独立的容器，在容器内运行的代码就像在一个独立的系统里跑一样。

### 3.2 Control Group：资源访问限制

但是只有命名空间的隔离还不够，还得对资源做限制。比如一个容器占用了太多的资源，那就会导致别的容器受影响。这就需要 linux 操作系统的另一种机制：Control Group。

创建一个 Control Group 可以给它指定参数，比如 cpu 用多少、内存用多少、磁盘用多少，然后加到这个组里的进程就会受到这个限制。这样，创建容器的时候先创建一个 Control Group，指定资源的限制，然后把容器进程加到这个 Control Group 里，就不会有容器占用过多资源的问题了。

### 3.3 UnionFS：分层存储

那这样就完美了么？其实还有一个问题：每个容器都是独立的文件系统，相互独立，而这些文件系统之间可能很大部分都是一样的，同样的内容占据了很大的磁盘空间，会导致浪费。所以 Docker 设计了一种分层机制：

每一层都是不可修改的，也叫做镜像。要修改就创建个新的层，然后通过一种叫做 UnionFS 的机制把这些层合并起来，变成一个文件系统。这样如果有多个容器内做了文件修改，只要创建不同的层即可，底层的基础镜像是一样的。

写的这个 Dockerfile，每一行指令都会生成一层镜像。点开 docker 镜像的详情可以看到，就上面这个 dockerfile，它对应的镜像就有 20 层。当然，很多都是一层层通过 FROM 继承下来的。

Docker 通过这种分层的镜像存储，极大的减少了文件系统的磁盘占用。哪里看出来的呢？比如 nest 的镜像有 1g 多，但是很多都是它继承的 node 镜像里的，可以看到每一层用了多少存储空间。我本地两个 nest 镜像，它们都继承了 node 镜像，这两个合起来有 2g 的存储空间么？没有，因为下面的镜像层是公用的。如果有 10 个这种类似的镜像，之前需要 10g。现在呢？可能不到 2g 就够了。这就是分层存储的魅力。

而且还可以把这些镜像 push 到 registry 镜像仓库，别人拉下来也可以直接用。

但镜像是不可修改的，那为啥可以在容器内写文件呢？因为容器跑起来会给他多加一个可写层，或者叫容器层，这样容器就能在这里一层写文件了。当然，再跑一个容器会创建一个新的可写层，另一个容器的可写层的数据就丢了。

所以 Docker 设计了挂载机制，可以挂载数据卷到这个可写层上去。这个数据卷是可以持久化的，再跑个新容器，依然可以把这个 volume 挂上去。这就是数据卷的作用。

回顾一下 Docker 实现原理的三大基础技术：

- Namespace：实现各种资源的隔离
- Control Group：实现容器进程的资源访问限制
- UnionFS：实现容器文件系统的分层存储，镜像合并

都是缺一不可的。

## 总结

Docker 可以把环境封装成镜像，镜像跑起来是一个独立的容器。通过这种方式可以快速部署多个相同的实例。

docker 提供了一个 desktop 工具，可以可视化的操作 docker，包括容器、镜像、volume 等。这些可视化的操作都有对应的命令，当服务器上没有桌面的时候，就需要用命令行操作了。

docker 镜像是通过 dockerfile 构建出来的。写了第一个 dockerfile，通过 FROM、WORKDIR、COPY、RUN、EXPOSE、CMD 等指令声明了一个 http-server 提供静态服务的镜像。docker run 这个镜像就可以生成容器，指定映射的端口、挂载的数据卷、环境变量等。VOLUME 指令看起来没啥用，但能保证你容器内某个目录下的数据一定会被持久化，能保证没挂载数据卷的时候，数据不丢失。

Docker 的实现原理依赖 linux 的 Namespace、Control Group、UnionFS 这三种机制。Namespace 做资源隔离，Control Group 做容器的资源限制，UnionFS 做文件系统的分层镜像存储、镜像合并。通过 dockerfile 描述镜像构建的过程，每一条指令都是一个镜像层。镜像通过 docker run 就可以跑起来，对外提供服务，这时会添加一个可写层（容器层）。挂载一个 volume 数据卷到 Docker 容器，就可以实现数据的持久化。