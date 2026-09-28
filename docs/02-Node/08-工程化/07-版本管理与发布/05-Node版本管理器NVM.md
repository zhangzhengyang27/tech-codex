---
title: Node 版本管理器 NVM
description: 使用 nvm/nvm-windows 管理与切换多个 Node.js 版本，解决新特性与项目兼容性冲突
keywords: [NVM, node版本管理, 多版本切换, 环境]
category: Node.js
tags: [Node.js, 工程化]
---

# Node 版本管理器 NVM

## 一、前言

`node`版本持续更新，一些`node`的新特性只有在`node`的较高版本中才可以使用。但是如果将`node`版本切换到较高版本，就会导致对现有项目的一些依赖造成环境不兼容。所以，需要一个工具对`node`版本进行管理，允许开发环境同时存在多个`node`版本，开发人员可以随意切换。

## 二、什么是nvm ?

`nvm`全称`Node Version Manager`是 `Nodejs` 版本管理器，它让我们能方便的对 `Nodejs` 的版本进行切换。 `nvm` 的官方版本只支持 `Linux` 和 `Mac`。 `Windows` 用户，可以用 `nvm-windows`。

## 三、nvm下载安装配置

### 1、下载

`nvm-windows` 最新下载地址：[github.com/coreybutler/nvm-windows/releases](https://github.com/coreybutler/nvm-windows/releases)
**以上标注的4个下载文件分别是指：**

`nvm-noinstall.zip`： 这个是绿色免安装版本，但是使用之前需要配置

`nvm-setup.zip`：这是一个安装包，下载之后点击安装，无需配置就可以使用，方便。

`Source code(zip)`：`zip`压缩的源码

`Source code(tar.gz)`：`tar.gz`的源码，一般用于`linux`系统

我们这里选择使用第一个`nvm-noinstall.zip`绿色免安装版本。



### 2、安装

（1）`nvm-noinstall.zip`下载完成后进行解压缩，得到解压后的文件列表（其中包含 `install.cmd` 等文件）：


（2）我们在E盘底下新建文件夹`E:/nvm`，将第（1）步解压缩得到的文件列表复制到该文件夹，新建文件夹`E:/nodejs`用于存放`node`的安装依赖

（3）双击 `install.cmd` 然后会让你输入"压缩文件解压或拷贝到的一个绝对路径" 先不用管它，直接回车，成功后，会在 C 盘的根目录生成一个`settings.txt`的文本文件，把这个文件剪切到`E:\nvm`目录中，然后我们把它的内容配置成以下所示：

```
root: E:\nvm
path: E:\nodejs
```


### 3、配置环境变量

（1）第2步点击`install.cmd`文件后，会在环境变量的系统变量中，生成两个环境变量：`NVM_HOME` 和 `NVM_SYMLINK` 我们开始修改这两个变量名的变量值：`NVM_HOME`的变量值为：`E:\nvm`； `NVM_SYMLINK`的变量值为：`E:\nodejs`，然后在`Path`的最前面输入：`;%NVM_HOME%;%NVM_SYMLINK%;`


（2）打开一个`cmd`窗口输入命令：`nvm v` ，那么我们会看到当前`nvm`的版本信息，说明`nvm`安装配置成功。


## 四、nvm常用命令

- `nvm install` // 安装指定版本，如：安装`v6.2.0`，可`nvm install v6.2.0`
- `nvm uninstall` //删除已安装的指定版本，语法与`install`类似
- `nvm use` //切换使用指定的版本`node`
- `nvm ls` //列出所有安装的版本
- `nvm ls-remote` //列出所以远程服务器的版本（官方`node version list`）
- `nvm current` //显示当前的版本
- `nvm alias` //给不同的版本号添加别名
- `nvm unalias` //删除已定义的别名
- `nvm reinstall-packages` //在当前版本`node`环境下，重新全局安装指定版本号的`npm`包

> 注意：`nvm`（nvm-sh，Linux/Mac）与 `nvm-windows` 的命令略有差异，如 `nvm ls-remote` 在 `nvm-windows` 中对应 `nvm list available`，`nvm use` 在 Windows 下需要管理员权限。



## 五、使用nvm管理node版本

### 1、配置`npm`全局路径

进入命令模式，输入`npm config set prefix "E:\nvm\npm"` 回车，然后新建变量名为：`NPM_HOME`，变量值为 ：`E:\nvm\npm`在`Path`的最前面添加;`%NPM_HOME%`，注意了，这个一定要添加在 `%NVM_SYMLINK%`之前，所以我们直接把它放到`Path`的最前面。



### 2、使用nvm管理node版本

使用`nvm`管理`node`版本时，常用的组合如：先 `nvm install 20.11.0` 安装、再 `nvm use 20.11.0` 切换、用 `nvm ls` 查看已装版本。




## 六、注意点

1、请用管理员身份运行命令管理器，否则可能出错。

2、先设置 `node` 和 `npm` 的淘宝镜像，这样成功率和下载速度会更高点。

3、`nvm`安装目录，最好不要存在空格。否则，`nvm`可以安装成功，但使用`nvm use x.y.z`（`nodejs`的切换）会有问题。