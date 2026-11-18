---
title: 安装 Docker 和 Jenkins：持续构建环境起步
description: 在 Linux 上安装 Docker 与 Jenkins 搭建持续构建环境：Yum 安装 Docker 并配置镜像加速、安装 OpenJDK 21 与 Jenkins LTS、初始化配置、防火墙放行及 jenkins 用户加入 docker 组解决 Unix Socket 权限。
keywords: [Docker, Jenkins, CentOS, 镜像加速, OpenJDK, docker 用户组]
category: 部署与运维实践
tags: [DevOps, CI/CD]
---

::: warning 版本提示
本系列环境基于 Kubernetes 1.23 与 CentOS 7 编写：K8s 1.23 已 EOL，Kubernetes 自 1.24 起移除 dockershim，CentOS 7 已于 2024-06 EOL。本文流程适用于对应年代环境，新环境请参照 K8s 官方文档与容器化方案。
:::

# 安装 Docker 和 Jenkins：持续构建环境起步

前文已大致介绍 `CI/CD` 的作用和历史。从本文起进入 `CI/CD` 流程的搭建实践，首先要学习并安装贯穿全流程的两个基础技术：`Docker 和 Jenkins`。


## 什么是 Docker

`Docker` 是一个开源的应用容器引擎。开发者可以将应用打包到自己的镜像里面，然后迁移到其他平台的 `Docker` 中。镜像中可以存放自定义的运行环境，文件，代码，设置等等内容，再也不用担心环境造成的运行问题。镜像共享运行机器的系统内核。

同样， `Docker` 也支持跨平台。镜像可以加载在 `Windows` 和 `Linux`，实现快速运行和部署。


`Docker` 的优势在于 快速，轻量，灵活。开发者可以制作自定义的镜像，也可以使用官方或者其他开发者的镜像来启动一个服务。通过将镜像创建为容器，容器之间相互隔离资源和进程不冲突。但硬件资源又是共享的。
创建的镜像也可以通过文件快速分享，也可以上传到镜像库进行存取和管理。同时 `Docker` 的镜像有 `分层策略` ，每次对镜像的更新操作，都会堆叠一个新层。拉取 / 推送新版本镜像时，只推送 / 拉取修改的部分。大大加快了镜像的传输效率


`Docker` 在 `CI/CD` 中的作用：


`Docker` 贯穿 `CI/CD` 中整个流程。作为应用服务的载体有着非常重要的地位。


可以使用 `Docker` 将应用打包成一个镜像，交给 `Kubernetes` 去部署在目标服务集群。并且可以将镜像上传到自己的镜像仓库，做好版本分类处理。 


## 安装 Docker


在开始安装之前，需要安装 `device-mapper-persistent-data` 和 `lvm2` 两个依赖。


`device-mapper-persistent-data` 是 `Linux` 下的一个存储驱动， `Linux` 上的高级存储技术。 `Lvm` 的作用则是创建逻辑磁盘分区。这里使用 `CentOS` 的 `Yum` 包管理器安装两个依赖：


```shell
yum install -y yum-utils device-mapper-persistent-data lvm2
```


依赖安装完毕后，将阿里云的 `Docker` 镜像源添加进去。可以加速 `Docker` 的安装。


```shell
sudo yum-config-manager --add-repo http://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
yum install docker-ce -y
```


安装完毕，就可以使用 `systemctl` 启动 `Docker` 了。`systemctl` 是 `Linux` 的进程管理服务命令，可以帮助完成 `docker` 的启动


```shell
systemctl start docker
systemctl enable docker
```


接着执行一下 `docker -v` ，这条命令可以用来查看 `Docker` 安装的版本信息，也可以用来确认 `docker` 安装状态。如果正常展示版本信息，代表 `Docker` 已经安装成功。


### 配置阿里云镜像源


`Docker` 安装完毕后，之后拉取 `docker` 镜像时，一般默认会去 `docker` 官方源拉取镜像。但是国内访问网速实在太慢，所以建议更换为 `阿里云镜像仓库` 源进行镜像下载加速。


登录阿里云官网，打开 [阿里云容器镜像服务](https://cr.console.aliyun.com)。点击左侧菜单最下面的 `镜像加速器` ，选择 `CentOS` 。按照官网的提示执行命令，即可更换 `docker` 镜像源地址。


## 安装 Jenkins


安装完 `Docker` 后，只是拥有了一个可以承载服务的载体。想实现自动化构建，还需要安装另一个构建工具 `Jenkins`。


`Jenkins` 是一个基于 `Java` 语言开发的持续构建工具平台，主要用于持续、自动的构建/测试软件和项目。它可以执行预先设定好的设置和构建脚本，也可以和 Git 代码库做集成，实现自动触发和定时触发构建。


### 1. 安装 OpenJDK


因为 `Jenkins` 是 `Java` 编写的持续构建平台，所以安装 `Java` 必不可少。


这里选择安装开源的 `OpenJDK` 即可。`OpenJDK` 是 `Sun JDK` 的一种**开源实现**，关于两者的具体区别可以看下面的文章了解下。注意：当前 Jenkins LTS（2.5xx.x）要求 Java 17 及以上版本（推荐 Java 21），Java 8 已不受支持，因此这里直接安装 `java-21-openjdk`：
```shell
yum install -y java-21-openjdk
```
> [https://www.zhihu.com/question/19646618](https://www.zhihu.com/question/19646618)


### 2. 使用 Yum 安装 Jenkins 


由于 `Yum` 源不自带 `Jenkins` 的安装源，需要自行导入一份 `Jenkins` 安装源进行安装。导入后，使用 `Yum` 命令安装即可。
```shell
sudo wget -O /etc/yum.repos.d/jenkins.repo https://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io.key
yum install jenkins
```


### 3. 启动 Jenkins


`Jenkins` 安装后，会将启动命令注册到系统 `Service` 命令中。所以直接使用系统 `service` 命令启动 `Jenkins` 即可。有三个命令可以使用，分别对应 启动 / 重启 / 停止 三个命令。


这里直接调用 `service jenkins start` 启动 Jenkins 即可
```shell
service jenkins start
# service jenkins restart  # 重启 Jenkins
# service jenkins stop     # 停止 Jenkins
```


### 4. 给 Jenkins 放行端口


在启动 `Jenkins` 后，此时 `Jenkins` 会开启它的默认端口 `8080` 。但由于防火墙限制，需要手动让防火墙放行 `8080` 端口才能对外访问到界面。


这里在 `CentOS` 下的 `firewall-cmd` 防火墙添加端口放行规则，添加完后重启防火墙。
```shell
firewall-cmd --zone=public --add-port=8080/tcp --permanent
firewall-cmd --zone=public --add-port=50000/tcp --permanent

systemctl reload firewalld
```


服务启动后，访问 `IP:8080`。如果页面提示 Jenkins 正在启动，请耐心等待。 `Jenkins` 第一次的启动时间一般比较长（视服务器性能而看）


### 5. 初始化 Jenkins 配置

#### 5.1 解锁 Jenkins


在 `Jenkins` 启动完成后，会自动跳转至 `Jenkins` 的解锁界面，此时需要输入存放在服务器的初始解锁密码才能进行下一步操作。


`Jenkins` 启动后，会生成一个**初始密码**。该密码在服务器的文件内存放，进入服务器查看密码内容，将密码填写在 `Jenkins` 的管理员密码输入框内：
```shell
cat /var/lib/jenkins/secrets/initialAdminPassword
```


点击 `继续` 按钮，解锁 Jenkins。


#### 5.2 下载插件


解锁后就来到了插件下载页面，这一步要下载一些 `Jenkins` 的功能插件。
因为 `Jenkins` 插件服务器在国外，所以速度不太理想。建议更换为清华大学的 `Jenkins` 插件源后，再安装插件，**所以先不要点安装插件。**


更换方法很简单。进入服务器，将 `/var/lib/jenkins/updates/default.json` 内的插件源地址替换成清华大学的源地址，将 google 替换为 baidu 即可（新旧版本插件源的域名都要覆盖）：
```shell
sed -i 's#https\?://updates.jenkins-ci.org/download#https://mirrors.tuna.tsinghua.edu.cn/jenkins#g; s#https\?://updates.jenkins.io/download#https://mirrors.tuna.tsinghua.edu.cn/jenkins#g; s#http://www.google.com#https://www.baidu.com#g' /var/lib/jenkins/updates/default.json
```


接着点击 `安装推荐的插件` 即可。稍等一会插件安装完毕


### 6. 完成安装


插件安装完毕后，接着是注册管理员账号。按照提示一路配置后，即完成安装


### 7. 测试安装


到这里，Jenkins 算是启动成功了。但是，还需要对 `Jenkins` 做一点点简单的配置，让它可以构建 `docker` 镜像。


点击 `Jenkins` 首页 -> 左侧导航 -> 新建任务 -> **Freestyle project**


新建完毕后，找到 `构建` 一项，选择 `增加构建步骤`，选择 `执行shell` ，输入以下命令：
```shell
docker -v
docker pull node:latest
```


该命令会拉取一个 `node` 的 `latest` 镜像，可以用它来测试 `Docker` 的可用性


保存后，点击左侧菜单的**立即构建**， `Jenkins` 就会开始构建。选择左侧历史记录第一项（最新的一项），点击控制台输出，查看构建日志。
执行后，提示无访问权限。这里就涉及 `Linux` 下的 `Unix Socket` 权限问题


### 8. Unix Socket 权限问题


`docker` 的架构是 `C/S` 架构。使用 `docker` 命令时，实际是命令使用 `socket` 与 `docker` 的守护进程进行通信，才能正常执行 `docker` 命令。


而在 `Linux` 中， `Unix socket` 属于 `root` 用户，因此需要 `root` 权限才能访问。官方是这么解释的：
> Manage Docker as a non-root user
> The docker daemon binds to a Unix socket instead of a TCP port. By default that Unix socket is owned by the user root and other users can only access it using sudo. The docker daemon always runs as the root user.
> If you don’t want to use sudo when you use the docker command, create a Unix group called docker and add users to it. When the docker daemon starts, it makes the ownership of the Unix socket read/writable by the docker group.


`docker` 提供了一个 `用户组` 的概念：将执行 `Shell` 的用户添加到名称为 `docker` 的用户组，则可以正常执行 `docker` 命令。


而在 `Jenkins` 中执行的终端用户是 `jenkins`，因此只需要将 `jenkins` 加入到 `docker` 用户组即可：
```shell
sudo groupadd docker          #新增docker用户组
sudo gpasswd -a jenkins docker  #将当前用户添加至docker用户组
newgrp docker                 #更新docker用户组
```


加入后，重启 `Jenkins` ：
```shell
sudo service jenkins restart
```


重启 `Jenkins` 后，再次执行脚本。此时执行成功：


## 小结


- `Docker` 是开源应用容器引擎，镜像分层策略使增量传输更高效；在 CI/CD 中作为应用服务载体贯穿全流程。
- `Docker` 安装三步：Yum 安装依赖与 docker-ce、`systemctl start/enable docker` 启动、`docker -v` 验证；国内环境建议配置阿里云镜像加速源。
- `Jenkins` 安装流程：安装 OpenJDK 21 → 导入官方 Yum 源安装 → `service jenkins start` 启动 → `firewall-cmd` 放行 `8080`/`50000` 端口。
- 初始化两步：用 `/var/lib/jenkins/secrets/initialAdminPassword` 解锁；换清华插件源后再安装推荐插件。
- Jenkins 中执行 `docker` 命令报无权限，源于 `Unix Socket` 归 `root` 所有；解决方法是将 `jenkins` 用户加入 `docker` 用户组并重启 Jenkins。
- 至此基础组件安装完毕，这只是持续构建的第一步；后续章节将安装 `Node` 环境并集成 `Git` 代码库，实现对代码的镜像构建。
