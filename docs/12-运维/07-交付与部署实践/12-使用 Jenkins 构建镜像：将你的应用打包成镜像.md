---
title: 使用 Jenkins 构建镜像：将你的应用打包成镜像
description: 使用 Jenkins 构建前端 Docker 镜像：NodeJS 插件安装 Node 环境、SSH 密钥方式集成 Git 仓库、编写 Dockerfile 与 docker build 构建镜像的完整流程。
keywords: [Jenkins, Dockerfile, docker build, NodeJS 插件, SSH 密钥, Gitee]
category: 部署与运维实践
tags: [DevOps, CI/CD]
---

::: warning 版本提示
本系列环境基于 Kubernetes 1.23 与 CentOS 7 编写：K8s 1.23 已 EOL，Kubernetes 自 1.24 起移除 dockershim，CentOS 7 已于 2024-06 EOL。本文流程适用于对应年代环境，新环境请参照 K8s 官方文档与容器化方案。
:::

# 使用 Jenkins 构建镜像：将你的应用打包成镜像

## 概述


前文完成了 `Docker` 和 `Jenkins` 的安装与打通。本文使用 `Jenkins` 集成 `Git` 来构建 `Docker` 镜像，为后续部署准备镜像资源。


## 1. 安装 Nodejs 环境


前文的安装流程并没有在服务端安装 `Node` 环境。安装 `Node` 环境有以下两个办法：


- 源码编译：这种方式是将 `Node` 源码拉下来后，在服务器端编译完成后才可以使用。时间比较长，流程也略复杂
- 使用 `Jenkins Plugin` 中 `NodeJS` 插件自动配置安装


推荐选择第二种方式安装，既方便又省力。


打开 `Jenkins` 首页，找到左侧的 **系统管理 => 插件管理 => 可选插件**，搜索 `Node`。选中 `NodeJS` 后，点击左下角的 `直接安装` 开始安装插件
等待安装完毕后，返回 `Jenkins` 首页。找到 **Global Tool Configuration => NodeJS => 新增NodeJS**


接着回到 `Jenkins` 首页，找到左侧的 `系统管理`，选择 `全局工具配置`


找到下面的 `NodeJS` ，点击 `NodeJS` 安装，选择相应的版本填写信息保存即可。


### 如何使用


在任务中使用时，只需在任务的**配置**中，找到**构建环境**，选中 `Provide Node & npm bin/ folder to PATH` ，选择刚才配置好的 `NodeJS` 即可。


第一次执行会下载对应的 `Node` 版本，后续不会下载。


## 2. 使用 SSH 协议集成 Git 仓库源


这一步使用 `Jenkins` 集成外部 Git 仓库，实现对真实代码的拉取和构建。代码源选用 `Gitee` **（没有打广告，单纯觉得 Gitee 教学方便）。** 这里准备一个 `vue-cli` 项目来演示构建。


### 2.1 生成公钥私钥


首先配置公钥和私钥，这是 `Jenkins` 访问 `Git` 私有库的常用认证方式。使用 `ssh-keygen` 命令即可生成公钥私钥，在本地机器执行生成即可。这里的邮箱可以换成自己的邮箱：
```shell
ssh-keygen -t rsa -C "you@example.com"
```


执行后，会遇到第一步步骤： `Enter file in which to save the key` 。


这一步是询问公钥私钥文件要放在哪里。默认是放在 `~/.ssh/id_rsa` 下，也可以输入自定义路径。一路回车即可。
结束后，会得到两个文件，分别是 xxx 和 xxx.pub。


其中，xxx 是私钥文件，xxx.pub 是对应的公钥文件。**在 `Git` 端配置公钥，在 `Jenkins` 端使用私钥与 `Git` 进行身份校验。**


### 2.2 在 Gitee 配置公钥


在 `Gitee` 中，配置公钥有2种方式：仓库公钥 和 个人公钥。**其中，如果配置了仓库公钥，则该公钥只能对配置的仓库进行访问。如果配置了个人公钥，则账号下所有私有仓库都可以访问。**


这里以配置个人公钥为例子。首先打开右上角的**设置** ，点击下面的 **安全设置 => SSH公钥**
在下方有个添加公钥，填入信息即可。


其中的标题为公钥标题，这里可以自定义标题；公钥则为刚才生成的 xxx.pub 文件。使用 `cat` 命令查看下文件内容，将内容填入输入框并保存。接着去 `Jenkins`  端配置**私钥**
```shell
cat xxx.pub
```


### 2.3 在 Jenkins 配置私钥


回到 `Jenkins`。在 `Jenkins` 中，`私钥/密码` 等认证信息都是以 `凭证` 的方式管理的，所以可以做到全局都通用。
在配置任务时，可以添加一条凭证。点击项目的 配置，依次找到 **源码管理 => Git => Repositories**


这里的 `Repository URL` 则是仓库地址， `SSH` 地址格式为 `git@gitee.com:xxx/xxx.git` 。可以从仓库首页中的 克隆/下载 => SSH 中看到


重点是 **Credentials** 这一项，这里是选择认证凭证的地方。点击右侧 `添加 => Jenkins` 按钮添加一条新的凭证认证信息。


点击后会打开一个弹窗，这是 `Jenkins` 添加凭证的弹窗。选择类型中的 `SSH Username with private key` 这一项。接着填写信息即可：


- ID：这条认证凭证在 `Jenkins` 中的名称
- 描述：描述信息
- Username：用户名（邮箱）
- Private Key：这里则是填写私钥的地方。点击 **Add** 按钮，**将 xxx 私钥文件内所有文件内容全部复制过去（包含开头的 BEGIN OPENSSH PRIVATE KEY 和结尾的 END OPENSSH PRIVATE KEY）**


接着点击添加按钮，保存凭证。


保存后，在 `Credentials` 下拉列表中选择添加的凭证。


如果没有出现红色无权限提示，则代表身份校验成功，可以正常访问。


## 3. 构建镜像


环境准备就绪后，就可以开始构建镜像了。不过，需要先准备一个 `DockerFile` 才可以构建镜像。


### 3.1 编写 Dockerfile


#### 什么是 Dockerfile


`Dockerfile`  是一个 `Docker` 镜像的基础描述文件，里面描述了**生成一个镜像所需要的执行步骤**。自定义一份 `Dockerfile` 即可创建自己的镜像。


例如下面的步骤，使用 `Dockerfile` 可描述为：

1. 基于 `nginx:alpine` 镜像做底座。
1. 拷贝本地 `html` 文件夹内的文件，到镜像内 `/etc/nginx/html` 文件夹。
1. 拷贝本地 `conf` 文件夹内的文件，到镜像内 `/etc/nginx/`  文件夹。
```dockerfile
FROM nginx:alpine
COPY html /etc/nginx/html
COPY conf /etc/nginx/
WORKDIR /etc/nginx/html
```


编写完成后，只需要使用 `docker build` 命令就可以构建一个镜像了：
```dockerfile
docker build -t imagename:version .
```
> -t: 声明要打一个镜像的Tag标签，紧跟着的后面就是标签。标签格式为 镜像名:版本
> . ：声明要寻找dockerfile文件的路径，. 代表当前路径下寻找。默认文件名为 Dockerfile。
> 关于更多 DockerFile 的语法，详细可以看这里 [https://www.runoob.com/docker/docker-dockerfile.html](https://www.runoob.com/docker/docker-dockerfile.html)


---


本文的镜像只包含一个 `nginx`，所以 `dockerfile` 内容比较简单。只需在代码根目录下新建一个名为 `Dockerfile` 的文件，输入以下内容，并将其提交到代码库即可。
```shell
vi Dockerfile
```
```dockerfile
FROM nginx:alpine
COPY html /etc/nginx/html
COPY conf /etc/nginx/
WORKDIR /etc/nginx/html
```
```shell
git add ./Dockerfile
git commit -m "chore: add dockerfile"
git push
```


### 3.2 Jenkins 端配置


代码源和 `DockerFile` 准备就绪后，只需在 `Jenkins` 端配置要执行的 `Shell` 脚本即可。找到项目的配置，依次找到 **构建 => Execute shell**。输入以下脚本：
```shell
#!/bin/sh -l

npm install --registry=https://registry.npmmirror.com
npm run build
docker build -t jenkins-test .
```
这里脚本很简单，主要是**安装依赖 => 构建文件 => 构建镜像**。填写完毕后保存。


## 4. 执行任务


保存后手动触发执行任务。当未抛出错误时，代表任务执行成功。


## 小结


本文完成了使用 `Jenkins` 构建前端镜像的完整流程：

- **Node 环境**：通过 `NodeJS` 插件安装并在任务“构建环境”中启用 `Provide Node & npm bin/ folder to PATH`，首次执行自动下载对应版本。
- **Git 集成**：`ssh-keygen` 生成公私钥，公钥配置到 Gitee（仓库公钥限单仓库、个人公钥覆盖账号下全部私有仓库），私钥以 `SSH Username with private key` 凭证配置到 Jenkins。
- **镜像构建**：`Dockerfile` 描述镜像生成步骤，`docker build -t 名称:版本 .` 构建镜像；Jenkins 任务的 Shell 脚本串联“安装依赖 => 构建文件 => 构建镜像”。

后续章节将安装私有镜像库，把镜像上传到镜像库内。
