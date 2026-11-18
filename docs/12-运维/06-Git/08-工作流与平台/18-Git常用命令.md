---
title: Git 常用命令
description: Git 常用命令速查：仓库初始化与克隆、暂存与提交（add/commit/log/reset/rm）、远程协作（remote/clone/push/pull 与合并冲突解决）、分支操作与标签操作
keywords: [Git, 常用命令, 分支, 标签, 远程仓库]
category: Git 版本控制
tags: [DevOps, Git]
---

# Git 常用命令

## 本地初始化仓库

创建一个空目录并进入，执行 git init 命令

```bash
git init
```

## 从远程仓库 clone

### 创建新版本库

```bash
git clone http://git.example.com:8099/your-username/user-center-backend.git 

cd user-center-backend 

touch README.md 

git add README.md 

git commit -m "add README" 

git push -u origin master 
```

### 已存在的文件夹或 Git 仓库

```bash
cd existing_folder 

git init 

git remote add origin http://git.example.com:8099/your-username/user-center-backend.git 

git add . 

git commit 

git push -u origin master
```

## 本地仓库操作

### git status

```bash
git status
```

### git add

git add 命令的作用是将文件的修改加入暂存区，命令格式 `git add fileName` 或者 `git add .` 添加全部。加入暂存区后再执行 git status 命令，可以发现文件的状态已经发生变化

```bash
git add .
git status
```

### git reset

git reset 命令的作用是将暂存区的文件**取消暂存**或者是**切换到指定版本**

取消暂存命令格式：`git reset 文件名`

![img](/git-images/202309211811045.png)

切换到指定版本命令格式：`git reset --hard 版本号`

![img](/git-images/202309211811082.png)

> 注意：每次 Git 提交都会产生新的版本号，通过版本号就可以回到历史版本
>

当退回到某个提交的版本以后，git log 是无法显示在这之后的提交信息的

git reflog 可以获取到操作命令的历史。想要回到未来的某个提交，通过 git reflog 从历史命令中找到想要回到的提交版本的 ID，通过 `git reset --hard` 来切换

```bash
git reflog 
git reset --hard 'commit_id'
```

### git commit

git commit 命令的作用是将暂存区的文件修改提交到版本库，命令格式：`git commit -m msg 文件名`

- -m：代表 message，每次提交时需要设置，会记录到日志中

```bash
git commit -m "add README" 
```

### git log

git log 命令的作用是查看提交日志，每次提交都会产生一个版本号，提交时设置的 message、提交人、邮箱、提交时间等信息都会记录到日志中

```bash
git log
```

### git rm

在文件未添加到暂存区之前，对想删除文件可以直接物理删除。如果文件已经被提交，则需要`git rm`来删除

```bash
# 删除已经被提交过的 Readme.md
git rm Readme.md
```

注意： git rm 只能删除已经提交到版本库中的文件。其他状态的文件直接用这个命令操作是出错的

## 远程仓库操作

前面执行的命令操作都是针对的本地仓库，本节我们会学习关于远程仓库的一些操作，具体包括：

- git remote  查看远程仓库
- git remote add 添加远程仓库
- git clone 从远程仓库克隆
- git pull 从远程仓库拉取
- git push 推送到远程仓库

### git remote

如果要查看已经配置的远程仓库服务器，可以执行`git remote`命令，它会列出每一个远程服务器的简称

如果已经克隆了远程仓库，那么至少应该能看到 origin ，这是 Git 克隆的仓库服务器的默认名字

- 可以通过`-v`参数查看远程仓库更加详细的信息
- 本地仓库配置的远程仓库都需要一个简称，后续在和远程仓库交互时会使用到这个简称

### git remote add

添加远程仓库命令格式：git remote add 简称 远程仓库地址

```bash
git remote add origin http://git.example.com:8099/your-username/user-center-backend.git 
```

**注意：一个本地仓库可以关联多个远程仓库**

### git clone

如果你想获得一份已经存在了的 Git 远程仓库的拷贝，这时就要用到 git clone 命令。 Git 克隆的是该 Git 仓库服务器上的几乎所有数据（包括日志信息、历史记录等）

### git push

将本地仓库内容推送到远程仓库，命令格式：git push 远程仓库简称 分支名称

**推送之前，需要先pull远端仓库，如果发现提交版本不一致，出现错误**

注意： git push -u origin master ，第一次使用时，带上 -u 参数，在将本地的 master 分支推送到远程新的 master 分支的同时，还会把本地的 master 分支和远程的 master 分支关联起来

```bash
# 第一次推送时使用，可以简化后面的推送或者拉取命令使用 
git push -u origin master 

# 将本地 master 分支推送到 origin 远程分支 
git push origin master
```

在使用 git push 命令将本地文件推送至码云远程仓库时，如果是第一次操作，需要进行身份认证，认证通过才可以推送

![img](/git-images/202309211811500.png)

### git pull

**git** **pull** 命令的作用是从远程仓库获取最新版本并合并到本地仓库。命令格式：git pull 远程仓库简称 分支名称

**在多人协作过程中，当自己完成了本地仓库中的提交，想要向远程仓库推送前，需要先获取到远程仓库的最新内容**

```bash
# git pull【远程仓库名称】【分支名称】
git fetch origin master 
git pull origin master
```

`git fetch`和`git pull`之间的区别

- git fetch 是仅仅获取远程仓库的更新内容，并不会自动做合并。
- git pull 在获取远程仓库的内容后，会自动做合并，可以看成 git fetch 之后 git merge 。

**注意**：如果当前本地仓库不是从远程仓库克隆，而是本地创建的仓库，并且仓库中存在文件，此时再从远程仓库拉取文件的时候会报错（fatal: refusing to merge unrelated histories）

解决此问题可以在git pull命令后加入参数`--allow-unrelated-histories`

### git remote rm

如果因为一些原因想要移除一个远程仓库

```bash
# 命令形式： 
git remote rm <shortname>
git remote rm origin
```

**注意：此命令只是从本地移除远程仓库的记录，并不会真正影响到远程仓库**



### 解决合并冲突

在同一时间，A、B用户修改了同一个文件，且修改了同一行位置的代码，此时会发生合并冲突。

A用户在本地修改代码后优先推送到远程仓库，此时B用户在本地修订代码，提交到本地仓库后，也需要推送到远程仓库，此时B用户晚于A用户推送，故需要先拉取远程仓库代码，经过合并后才能推送代码。在B用户拉取代码时，因为A、B用户同一段时间修改了同一个文件的相同位置代码，故会发生合并冲突。

A用户：修改a.java代码推送到远程仓库

B用户：修改a.java同一行代码，提交之后，合并时出现冲突

解决方法：

1. 先拉取代码
2. 然后打开代码解决冲突
3. 再提交

## 分支操作

分支是 Git 使用过程中非常重要的概念。使用分支意味着你可以把你的工作从开发主线上分离开来，以免影响开发主线

本地仓库和远程仓库中都有分支，同一个仓库可以有多个分支，各个分支相互独立，互不干扰

通过git init 命令创建本地仓库时默认会创建一个 master 分支

- git branch                   查看分支
- git branch [name]            创建分支
- git checkout [name]           切换分支
- git push [shortName] [name]  推送至远程仓库分支
- git merge [name]             合并分支

### 查看分支

查看分支命令：git branch

- git branch 		列出所有本地分支
- git branch -r 	列出所有远程分支
- git branch -a 	列出所有本地分支和远程分支

注意：在 git branch 的输出内容中，前面带有 `*` 号标识当前所在的分支

### 创建分支

创建分支命令格式：git branch 分支名称

```bash
# 新建一个名称为 dev 的分支 
git branch dev
```

### 切换分支

一个仓库中可以有多个分支，切换分支命令格式：git checkout 分支名称

```bash
# 新建完 dev 分支以后，通过该命令切换到 dev 分支 
git checkout dev

# 新建 dev 分支，并切换到该分支上 
git checkout -b dev
```

### 合并分支

当我们修复完成一个 Bug，或者开发完成一个新特性，我们就会把相关的 Bug 或者 特性的上修改合并回原来的主分支上，这时候就需要 git merge 来做分支的合并

首先需要切换回最终要合并到的分支，如 master

```bash
# 切换回 master 分支 
git checkout master 

# 将 dev 分支中的修改合并回 master 分支 
git merge dev
```

合并回主分支的时候，后面可能会面临到冲突的问题

### 删除分支

当之前创建的分支，完成了它的使命，如 Bug 修复完，分支合并以后，这个分支就不再需要了，就可以删除它

```bash
# 删除 dev 分支 
git branch -d dev
```

## 标签操作

Git 中的标签，指的是某个分支某个特定时间点的状态。通过标签，可以很方便的切换到标记时的状态。

比较有代表性的是人们会使用这个功能来标记发布结点（v1.0 、v1.2等）。下面是 mybatis-plus 的标签

![img](/git-images/202309211811714.png)

在本节中，我们将学习如下和标签相关的命令：

- git tag                   查看标签
- git tag [name]              创建标签
- git push [shortName] [name]    将标签推送至远程仓库
- git checkout -b [branch] [name]  检出标签

### 查看标签

查看标签命令`git tag`

### 创建标签

创建标签命令`git tag 标签名`

```
git tag v0.3
```

### 将标签推送至远程仓库

将标签推送至远程仓库命令`git push 远程仓库简称 标签名`

```
git push origin v0.3
```

### 检出标签

检出标签时需要新建一个分支来指向某个标签，检出标签的命令格式`git checkout -b 分支名 标签名`

```
git checkout -b b3 v0.3
```

