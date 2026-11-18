---
title: Docker 入门与原理
description: "后端系统会部署很多服务，包括自己开发的服务，还有 mysql、redis 等中间件的服务，部署它们需要一系列依赖的安装、环境变量的设置等等。"
keywords: [Docker, Desktop, Dockerfile, 原理, Namespace]
category: Node.js
tags: [Node.js, Docker, 部署]
---


# Docker 入门与原理

后端系统会部署很多服务，包括自己开发的服务，还有 mysql、redis 等中间件的服务，部署它们需要一系列依赖的安装、环境变量的设置等。部署多台机器时，同样的操作要重复多次，任何一步遗漏都会导致服务跑不起来。

Docker 能解决这个问题：它把系统的所有文件封装成一个镜像，镜像跑起来作为容器。一台机器上可以跑多个容器，每个容器都有独立的操作系统环境（文件系统、网络端口等），在容器内跑各种服务。

整个环境都保存在镜像里，部署多个实例只要通过这个镜像跑多个容器即可。

## 一、通过 Docker Desktop 入门

Docker 提供了 Docker Hub 镜像仓库，可以把本地镜像 push 到仓库，或者从仓库 pull 镜像到本地。

### 1.1 安装 Docker Desktop

首先需要安装 Docker，直接从[官网](https://docker.com)下载 docker desktop 就行。

（windows 选择 windows 的安装包。m1 要注意芯片类型，选择 apple chip 那个包。）

它内置了 docker 命令。安装到系统之后，可以在命令行确认 docker 命令是否可用。如果不可用，需要进行设置：点击 Settings > Advanced，里面有两种安装路径。如果是 /usr/local/bin，docker 命令直接可用，因为这个路径在 PATH 变量里；如果是第二种，就需要手动把它加到 PATH 环境变量里。

docker desktop 界面中：images 是本地所有镜像，containers 是镜像跑起来的容器，docker desktop 可以可视化管理它们。

### 1.2 pull 一个 nginx 镜像

搜索 nginx 镜像，点击 pull（搜索这步需要翻墙，不然搜不到）。pull 下来之后，本地 images 里就能看到。如果搜不到，直接在命令行用 docker search、docker pull 搜索和拉取镜像也可以。

点击 run 会要求填一些参数：

- **名字**：不填时 docker desktop 会生成随机的容器名字。
- **端口**：容器内跑的 nginx 服务在 80 端口，需要把宿主机的某个端口映射到容器的 80 端口才可以访问。
- **数据卷 volume**：把宿主机某个目录挂到容器内。容器是镜像跑起来的，下次用这个镜像跑的还是同样的容器，容器内保存的数据会消失。所以要把宿主机某个目录挂载到容器内保存数据的目录，数据就保存在宿主机上。
- **环境变量**：指定容器的环境变量。

示例配置：挂载本地的 /tmp/aaa 到容器内的 /usr/share/nginx/html 目录。/tmp/aaa 可以换成宿主机的任何目录；windows 系统下类似 D:/tmp/aaa。

**（注意，这里是 /usr 而不是 /user）**

点击 run，容器内的 nginx 服务就跑起来了。在 /tmp/aaa 目录下添加一个 index.html，浏览器访问 <http://localhost> 就可以访问到，说明数据卷挂载成功。

点击 files 标签可以看到容器内的文件，/usr/share/nginx/html 被标识为 mounted（挂载目录）。在本地添加一个文件，容器内这个目录内容也会同步变化，这就是 volume 挂载的作用。

如果挂载某些目录报错，是因为 docker desktop 挂载的目录需要配置，在 Settings > Resources > File Sharing 里添加即可。

命令行 docker run 跑镜像时，-v 指定挂载的数据卷，后面的 :ro 代表 readonly（容器内该目录只读），:rw 表示容器内可以读写该目录。

### 1.3 Docker 常用命令

服务器上没有 Docker Desktop，需要使用命令行。点击 pull 按钮相当于执行 docker pull：

```
docker pull nginx:latest
```

latest 是标签。点击 run 按钮填表单相当于执行 docker run：

```
docker run --name nginx-test2 -p 80:80 -v /tmp/aaa:/usr/share/nginx/html -e KEY1=VALUE1 -d nginx:latest
```

- **-p** 是端口映射
- **-v** 是指定数据卷挂载目录
- **-e** 是指定环境变量
- **-d** 是后台运行

docker run 会返回一个容器的 hash（即 id）。容器列表用 docker ps 获取，默认显示运行中的容器，加 -a 显示全部。

除了 container 列表，image 镜像列表通过 docker images 命令获取。

在容器的 terminal 里执行命令对应 docker exec 命令：-i 是 terminal 交互的方式运行，-t 是 tty 终端类型，指定容器 id 和 shell 类型后，就可以交互方式在容器内执行命令。

查看日志对应 docker logs 命令；exit 退出。docker inspect 查看容器详情，对应 desktop 里的 inspect 标签。docker volume 管理数据卷，对应 desktop 的这部分。

此外还有这些常用命令：

- docker start：启动一个已经停止的容器
- docker rm：删除一个容器
- docker stop：停止一个容器

## 二、编写第一个 Dockerfile

通过 desktop 从 docker hub 拉取了 nginx 的镜像并跑了起来。如果要自己制作镜像：docker 容器内是一个独立的系统环境，安装 nginx 服务需要执行一些命令、复制一些文件进来，然后启动服务。制作镜像也要进行这样的过程，不过可以自动化——只要在 dockerfile 里声明要做哪些事情，docker build 时就会根据这个 dockerfile 自动构建出一个镜像。

例如：

```docker
FROM node:latest

WORKDIR /app

COPY . .

RUN npm config set registry https://registry.npmmirror.com/

RUN npm install -g http-server

EXPOSE 8080

CMD ["http-server", "-p", "8080"]
```

指令含义如下：

- FROM：基于一个基础镜像来修改
- WORKDIR：指定当前工作目录
- COPY：把容器外的内容复制到容器内
- EXPOSE：声明当前容器要监听的网络端口，比如这里起服务会用到 8080
- RUN：在容器内执行命令
- CMD：容器启动的时候执行的命令

先通过 FROM 继承 node 基础镜像（里面已有 npm、node 命令），通过 WORKDIR 指定当前目录，再通过 COPY 把 Dockerfile 同级目录下的内容复制到容器内的 /app 目录，然后通过 RUN 执行 npm install 全局安装 http-server，通过 EXPOSE 指定要暴露的端口，CMD 指定容器跑起来之后执行的命令（执行 http-server 把服务跑起来）。

把这个文件保存为 Dockerfile，在同级添加一个 index.html，然后通过 docker build 生成镜像：

```
docker build -t aaa:ccc .
```

aaa 是镜像名，ccc 是镜像的标签。FROM 继承一个基础镜像，从输出可以看到，前面都是 node 镜像的内容，会一层层下载下来，最后才是本地添加的内容。

此时 desktop 的 images 列表里就能看到这个镜像，执行 docker run 把镜像跑起来（或用 desktop 点击 run 按钮），指定容器名、映射的端口后可以看到容器内的日志，服务启动成功。容器内打印的是 8080 端口，容器外要用映射的 8888 端口访问，访问 <http://localhost:8888> 就可以看到 html 里写的内容。

在 files 里查看 /app 下：双击 index.html，就是 build 镜像时 COPY 进去的文件。

### 2.1 VOLUME 指令的作用

想修改静态文件时，进容器内改太麻烦，不如把 /app 目录设置为挂载点：改下 Dockerfile（把启动命令换成 `http-server ./html -p 8080` 等），然后重新 build 出一个镜像：

```
docker build -t aaa:ddd -f 2.Dockerfile .
```

因为不是默认的 Dockerfile，需要用 -f 指定 dockerfile 的文件名。构建完再 run 这个新镜像，把桌面目录作为数据卷挂载到 /app 目录。容器跑起来后可以看到挂载成功并标识为 mount，inspect 里也能看到挂载的目录。

在 dockerfile 里指定 VOLUME 的意义：docker run 时如果没带 -v，数据会放在一个临时目录里。直接点击 run 不设置参数时，docker 会随机生成一个名字，还会随机生成一个目录作为数据卷挂载上去，inspect 可以看到此时的路径是一个临时目录——就算删了容器，数据也可以在这里找回。

设想跑了一个 mysql 容器，存了很多数据，但跑容器时没指定数据卷，某天把容器删了，所有数据都会丢失。为了避免这种情况，mysql 的 dockerfile 里必须声明 volume：即使没通过 -v 指定数据卷，将来也可以找回数据，保证数据不丢失。

## 三、Docker 是怎么实现的

Docker 容器跑起来就像一个独立的系统，这一节说明它的实现原理。（dockerignore、镜像的多阶段构建等优化手段另篇展开。）

如果网页上有两份 aaa、bbb 变量，要保证它们不冲突，用 namespace 即可：变成 xxx.aaa、xxx.bbb 和 yyy.aaa、yyy.bbb 就不冲突了。Docker 在一个操作系统上实现多个独立的容器也是这种思路。

### 3.1 Namespace：实现资源隔离

linux 操作系统提供了 namespace 机制，可以给进程、用户、网络等分配一个命名空间，这个命名空间下的资源都是独立命名的。常见的 namespace 有下面 6 种（此外较新的内核还提供了 cgroup、time 等 namespace）：

- PID namespace：进程 id 的命名空间
- IPC namespace：进程通信的命名空间
- Mount namespace：文件系统挂载的命名空间
- Network namespace：网络的命名空间
- User namespace：用户和用户组的命名空间
- UTS namespace：主机名和域名的命名空间

通过这 6 种命名空间，Docker 实现了独立的容器，容器内运行的代码就像在一个独立的系统里跑一样。

### 3.2 Control Group：资源访问限制

只有命名空间的隔离还不够，还需要对资源做限制：一个容器占用太多资源会导致别的容器受影响。这需要 linux 操作系统的另一种机制：Control Group。

创建一个 Control Group 时可以指定参数，比如 cpu 用多少、内存用多少、磁盘用多少，加到这个组里的进程就会受到限制。创建容器时先创建一个 Control Group 并指定资源限制，再把容器进程加到这个 Control Group 里，就不会有容器占用过多资源的问题。

### 3.3 UnionFS：分层存储

还有一个问题：每个容器都是独立的文件系统，相互独立，而这些文件系统之间很大部分内容是一样的，同样的内容占据很大的磁盘空间，造成浪费。Docker 为此设计了一种分层机制：

每一层都是不可修改的，也叫镜像。要修改就创建新的层，然后通过一种叫做 UnionFS 的机制把这些层合并起来，变成一个文件系统。多个容器内做文件修改时，只要创建不同的层即可，底层的基础镜像是一样的。

Dockerfile 里每一行指令都会生成一层镜像。点开 docker 镜像的详情可以看到，前文的 dockerfile 对应的镜像有 20 层，其中很多是一层层通过 FROM 继承下来的。

Docker 通过这种分层的镜像存储，极大减少了文件系统的磁盘占用：比如 nest 的镜像有 1g 多，但很多都是它继承的 node 镜像里的内容。本地两个 nest 镜像都继承了 node 镜像，两者合起来并不是 2g 的存储空间，因为下面的镜像层是公用的。如果有 10 个这种类似的镜像，之前需要 10g，现在可能不到 2g 就够了。这就是分层存储的作用。

镜像还可以 push 到 registry 镜像仓库，别人拉下来可以直接用。

镜像是不可修改的，但容器内可以写文件：容器跑起来会多加一个可写层（容器层），容器就在这一层写文件。再跑一个容器会创建一个新的可写层，另一个容器的可写层数据不受影响。

Docker 还设计了挂载机制，可以挂载数据卷到可写层上。数据卷可以持久化，再跑个新容器依然可以把这个 volume 挂上去，这就是数据卷的作用。

回顾 Docker 实现原理的三大基础技术：

- Namespace：实现各种资源的隔离
- Control Group：实现容器进程的资源访问限制
- UnionFS：实现容器文件系统的分层存储，镜像合并

三者缺一不可。

## 四、小结

- Docker 把环境封装成镜像，镜像跑起来是独立的容器，可以快速部署多个相同实例。
- Docker Desktop 可视化管理容器、镜像、volume，所有操作都有对应命令行命令；服务器环境使用命令行操作（docker pull/run/ps/exec/inspect 等）。
- 镜像通过 Dockerfile 构建，常用指令包括 FROM、WORKDIR、COPY、RUN、EXPOSE、CMD；VOLUME 指令保证未显式挂载数据卷时数据仍可找回。
- 实现原理依赖 Linux 三种机制：Namespace（资源隔离）、Control Group（资源限制）、UnionFS（分层镜像存储与合并）；容器运行时在镜像之上增加可写层（容器层），挂载 volume 数据卷实现数据持久化。
