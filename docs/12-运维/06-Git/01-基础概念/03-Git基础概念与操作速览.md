---
title: Git 基础概念与操作速览
description: 系统讲解 Git 基础概念与操作速览在 Git 版本控制中的关键机制、典型用法与工程实践
keywords: [Git, 基础概念, 操作速览]
category: Git 版本控制
tags: [DevOps, Git]
---


# Git 基础概念与操作速览

本文系统梳理 Git 的核心概念与高频操作，覆盖版本控制模型、merge/add/log/diff/rebase/reset/checkout/git rm 等关键命令的语义与行为细节，重点聚焦 Git 学习与使用中既重要又困难的关键点。

## 目录结构

| 章节 | 内容 | 篇数 |
|------|------|------|
| 01-基础概念 | VCS 概念、分布式版本控制、Git 操作速览 | 3 |
| 02-对象模型与原理 | 对象模型、仓库目录结构、索引、存储与压缩 | 4 |
| 03-安装配置与仓库 | 安装配置、创建与克隆仓库、工作区暂存区、gitignore | 4 |
| 04-分支与合并 | 分支操作、merge/rebase、checkout/reset 的本质 | 6 |
| 05-撤销与恢复 | 撤销提交、丢弃提交、reflog、stash | 6 |
| 06-查看与调试 | 历史与差异、bisect 调试、冲突解决实战 | 3 |

## 学习路径

```mermaid
flowchart LR
    A[01 基础概念] --> B[02 对象模型与原理]
    B --> C[03 安装配置与仓库]
    C --> D[04 分支与合并]
    D --> E[05 撤销与恢复]
    E --> F[06 查看与调试]
```

---

## 版本控制系统

### 版本控制系统 VCS

版本控制系统（VCS）最基本的功能是版本控制。所谓版本控制，意思就是在文件的修改历程中保留修改历史，以便方便地撤销之前对文件的修改操作

> 最简化的版本控制模型，是大多数主流文本编辑器都有的 `撤销 Undo` 功能。

VCS 保存修改历史，使用的是**主动提交改动**的机制。在修改了代码之后，使用 `commit` 命令把改动和对改动的描述信息提交，这次改动就被记录到版本历史中了。如果希望回退到这个版本，就可以从 `VCS` 的历史日志中方便地找到它

#### 中央仓库

更多的时候会是多个人共同开发，就需要有中央仓库作为代码的存储中心。所有人的改动都会上传到这里，所有人都能看到和下载到别人上传的改动

**版本控制**、**主动提交**、**中央仓库** 这三个要素，共同构成了版本控制系统（VCS）的核心。开发团队中的每个人向中央仓库主动提交改动并同步别人的改动，并在需要的时候查看和操作历史版本，这就是版本控制系统。

### 中央式版本控制系统

最初的版本控制系统，是中央式版本控制系统 Centralized VCS。以一个决定使用中央式 VCS 管理代码的三人团队为例：

1. 主工程师独自一人花两天时间搭建了项目的框架；
2. 然后在公司的服务器上**创建了一个中央仓库，并把代码提交到了中央仓库上**；
3. 两个队友**从中央仓库取到初始代码**，从此刻开始，三人开始**并行开发**；
4. 在之后的开发过程中，每人独立负责开发一个功能，在这个功能开发完成后，这个人就把这些**新代码提交到中央仓库**；
5. 每次当有人把代码提交到中央仓库的时候，另外两个人就可以选择**把这些代码同步到自己的机器上**，保持自己的本地代码总是最新的

而对于团队中的每个成员而言，操作更简单一点：

1. 第一次加入团队时，把中央仓库的代码取下来；
2. 写完的新功能提交到中央仓库；
3. 同事提交到中央仓库的新代码，及时同步下来。

这就是中央式 VCS 最基本的工作模型，但实际的开发时常会需要处理代码冲突、查看版本历史、回退代码版本等

### 分布式版本控制系统

分布式版本控制系统（Distributed VCS / DVCS）和中央式的区别在于，分布式 VCS 除了中央仓库之外，还有本地仓库：团队中每一个成员的机器上都有一份本地仓库，这个仓库里包含了所有的版本历史，或者换句话说，每个人在自己的机器上就可以提交代码、查看历史，而无需联网和中央仓库交互——当然，取而代之的是与本地仓库交互。

中央式 VCS 的中央仓库有两个主要功能：**保存版本历史**、**同步团队代码**。而在分布式 VCS 中，保存版本历史的工作转交到了每个团队成员的本地仓库中，中央仓库就只剩下了同步团队代码这一个主要任务。它的中央仓库依然也保存了历史版本，但这份历史版本更多的是作为团队间的同步中转站。

#### 工作模型

依然以三人团队为例，分布式 VCS 的工作模型大致是这样：

1. 首先 主工程师独立搭建了项目架构，**并把这些代码提交到了本地仓库**；
2. 然后在服务器上创建了一个中央仓库，并把 1 中的提交**从本地仓库推送到了服务器的中央仓库**；
3. 其他同事**把中央仓库的所有内容克隆到本地，拥有了各自的本地仓库**，从此刻开始，三人开始并行开发；
4. 三人总是每人独立负责开发一个功能，在这个功能开发过程中，**一个人会把每一步改动提交到本地仓库**
5. 在一个人把某个功能开发完成之后，就可以把这个功能相关的所有提交**从本地仓库推送到中央仓库**；
6. 每次当有人把新的提交推送到中央仓库的时候，另外两个人就可以选择**把这些提交同步到自己的机器上，并把它们和自己的本地代码合并**

#### 优缺点

分布式 VCS 的优点：

1. 大多数的操作可以在本地进行，所以速度更快，而且由于无需联网，所以即使不在公司甚至没有在联网，也依然可以提交代码、查看历史，从而极大地减小了开发者的网络条件和物理位置的限制（例如可以在飞机上提交代码、切换分支等等）
2. 由于可以提交到本地，所以可以分步提交代码，把代码提交做得更细，而不是一个提交包含很多代码，难以 review 也难以回溯

分布式 VCS 的缺点：

1. 由于每一个机器都有完整的本地仓库，所以初次 `clone` 的时候会比较耗时；
2. 由于每个机器都有完整的本地仓库，所以本地占用的存储比中央式 VCS 要高。

> 对于一般的程序项目而言，由于项目的大多数内容都是文本形式的代码，所以工程的体积都并不是很大，再加上文本内容自身的特点，VCS 可以利用算法来把仓库的体积极大地压缩。这就导致，在实际中，Git 等分布式 VCS 的仓库体积并不大，初次获取项目的耗时和本地仓库的存储占用都很小。所以对于大多数的程序项目而言，分布式 VCS 「尺寸大、初次下载慢」的问题其实并不严重。

> 不过也有一些例外，比如游戏开发。游戏的开发中有大量的大尺寸数据和媒体文件，并且这些文件的格式也不容易压缩尺寸，如果用分布式 VCS 会导致仓库的体积非常庞大。所以一些大型游戏的开发会选择中央式的 VCS 来管理代码

#### Git 快速上手

通过 [git 官网](https://git-scm.com/) 安装 git

在 GitHub 上创建一个练习项目（下文以 `your-name/learn-git` 为例）。 `.git` 目录就是 **本地仓库**， `.git` 所在的这个根目录，称为 Git 的**工作目录**，它保存当前从仓库中签出（checkout）的内容

```bash
# 获取远程仓库
git clone https://github.com/your-name/learn-git.git

git log

# 创建 index.txt 文件
touch index.txt

git status

git add index.txt

git commit -a -m "新建 index.txt 文件"

vim index.txt

git add index.txt

git commit -a -m "修改 index.txt 文件"

git log

git push
```

---

## merge 合并 commits

### merge 含义

`merge` 的意思是合并，指定一个 `commit`，把它合并到当前的 `commit` 来。具体来讲，`merge` 做的事是：

**从目标 `commit` 和当前 `commit` （即 `HEAD` 所指向的 `commit`）分叉的位置起，把目标 `commit` 的路径上的所有 `commit` 的内容一并应用到当前 `commit`，然后自动生成一个新的 `commit`**

![image-20241012224833079](/git-images/202410122248297.png)

`HEAD` 指向 `master`，Git 会把 `5` 和 `6` 这两个 `commit` 的内容一并应用到 `4` 上，然后生成一个新的提交，并跳转到提交信息填写的界面

```bash
git merge branch1
```

`merge` 操作会自动填写简要的提交信息。在提交信息修改完成后，退出这个界面，这次 `merge` 就算完成

#### 适用场景

`merge` 最常用的场景有两处：

1. 合并分支，当一个 `branch` 的开发已经完成，需要把内容合并回去时，用 `merge` 来进行合并

2. `pull` 的内部操作，`pull` 的实际操作其实是把远端仓库的内容用 `fetch` 取下来之后，用 `merge` 来合并

### 特殊情况-冲突

`merge` 在做合并的时候，是有一定的自动合并能力的。

> 如果一个分支改了 A 文件，另一个分支改了 B 文件，那么合并后就是既改 A 也改 B，这个动作会自动完成；如果两个分支都改了同一个文件，但一个改的是第 1 行，另一个改的是第 2 行，那么合并后就是第 1 行和第 2 行都改，也是自动完成

但两个分支修改了同一部分内容，`merge` 的自动算法就无法处理了。这种情况称之为：冲突。如果在 `merge` 的时候发生了这种情况，Git 就会把问题交给开发者来决定。具体地，它会提示 `merge` 失败，以及失败的原因：

```shell
git merge feature1
```

#### 解决冲突

此时需要做两件事：

1. 解决掉冲突。Git 虽然没有完成自动 `merge`，但它对文件还是做了一些工作：它把两个分支冲突的内容放在了一起，并用符号标记出了它们的边界以及它们的出处
2. 手动 `commit` 一下

```shell
git add .
git commit -a -m "解决冲突"
```

被冲突中断的 `merge`，在手动 `commit` 的时候依然会自动填写提交信息。这是因为在发生冲突后，Git 仓库处于一个「merge 冲突待解决」的中间状态，在这种状态下 `commit`，Git 就会自动添加「这是一个 merge commit」的提交信息

#### 放弃解决冲突

由于现在 Git 仓库处于冲突待解决的中间状态，最终决定放弃这次 `merge`，需要执行一次 `git merge --abort` 来手动取消它。执行这行代码，Git 仓库就会回到 `merge` 前的状态

```shell
git merge --abort
```

### 特殊情况-HEAD 领先于目标 commit

如果 `merge` 时的目标 `commit` 和 `HEAD` 处的 `commit` 并不存在分叉，而是 `HEAD` 领先于目标 `commit`。

> 这里指的是目标 `commit` 已经包含在 `HEAD` 的历史中

那么 `merge` 就没必要再创建一个新的 `commit` 来进行合并操作。在这种情况下，Git 什么也不会做，`merge` 是一个空操作



### 特殊情况-HEAD 落后于目标 commit

如果 `HEAD` 和目标 `commit` 依然是不存在分叉，但 `HEAD` 不是领先于目标 `commit`，而是落后于目标 `commit`。那么 Git 会直接把 `HEAD`（以及它所指向的 `branch`，如果有的话）移动到目标 `commit`：

```shell
git merge feature1
```

> 这种操作有一个专有称谓，叫做 "fast-forward"（快速前移）
>

一般情况下，创建新的 `branch` 都是会和原 `branch` （例如上图中的 `master` ）并行开发的，不然没必要开 `branch` ，直接在原 `branch` 上开发就好。但事实上，上图中的情形其实很常见，因为这其实是 `pull` 操作的一种经典情形：本地的 `master` 没有新提交，而远端仓库中有同事提交了新内容到 `master`。

那么这时如果在本地执行一次 `pull` 操作，就会由于 `HEAD` 落后于目标 `commit` （也就是远端的 `master`）而造成 "fast-forward"：

```shell
git pull
```

而 `git pull` 的第二步操作 `merge` 的目标 `commit`，是当前分支对应的远端跟踪分支（例如在 `master` 上就是 `origin/master`），所以 `git pull` 的第二步的完整内容是：

```shell
git merge origin/master
```

因此 `HEAD` 就会带着 `master` 一起，指向最新的 `commit`

---

## add 操作

通过 `add` 来把改动的内容放进暂存区

`add` 指令除了 `git add 文件名` 之外，还可以使用 `add .` 来直接把工作目录下的所有改动全部放进暂存区：

```bash
git status

git add .
git status
```

### add 添加的是文件改动，而不是文件名

假如修改文件 `a.txt`，然后把它 `add` 进了暂存区：

```shell
git add a.txt
git status
```

然后又往 `a.txt` 里写了几行东西。这时候再 `status` 一下的话：

```shell
git status
```

会发现 `a.txt` 既在 "Changes to be committed" 的暂存区，又在 "Changes not staged for commit"。这是因为通过 `add` 添加进暂存区的不是文件名，而是具体的文件改动内容。`add` 时的改动都被添加进了暂存区，但在 `add` 之后的新改动并不会自动被添加进暂存区。

在这时若执行提交，那些新的改动是不会被提交的

```shell
git commit
```

---

## 查看操作

### log 操作

执行 `git log` 可以查看历史记录：

```shell
git log
```

#### log -p 查看详细历史

`-p` 是 `--patch` 的缩写，通过 `-p` 参数查看具体每个 `commit` 的改动细节，很适合用于代码 review

```shell
git log -p
```

#### log --stat 查看简要统计

如果只想大致看一下改动内容，但并不想深入每一行的细节（例如回顾是在哪个 `commit` 中修改了 `games.txt` 文件），那么可以把选项换成 `--stat`

```shell
git log --stat
```

### show 查看具体 commit

如果想看某个具体的 `commit` 的改动内容，可以用 `show`。直接输入就是查看当前 `commit` 改动内容

```shell
git show
```

在 `show` 后面加上这个 `commit` 的引用（`branch` 或 `HEAD` 标记）或它的 `SHA-1` 码：

```shell
git show 5e68b0d8
```

查看指定 commit 中的指定文件，在 `commit` 的引用后输入文件名：

```shell
git show 5e68b0d8 index.txt
```

### diff 查看未提交的内容

如果想看未提交的内容，可以用 `diff`

使用 `git diff --staged` 可以显示暂存区和上一条提交之间的不同。换句话说，这条指令展示的是「如果立即输入 `git commit`，将会提交什么」：

```shell
git diff --staged
```

`--staged` 有一个等价的选项叫做 `--cached`。这里所谓的「等价」，是真真正正的等价，它们的意思完全相同

#### 比对工作目录和暂存区

使用 `git diff` （不加选项参数）可以显示工作目录和暂存区之间的不同。这条指令展示的是「如果现在把所有文件都 `add`，将向暂存区中增加哪些内容」：

```shell
git diff
```

#### 比对工作目录和上一条提交

使用 `git diff HEAD` 可以显示工作目录和上一条提交之间的不同，它是上面这二者的内容相加。这条指令展示的是「如果现在把所有文件都 `add` 然后 `git commit`，将会提交什么」（不过需要注意，没有被 Git 记录在案的文件——即从来没有被 `add` 过的 untracked files——并不会显示出来，因为对 Git 来说它并不存在）

```shell
git diff HEAD
```

实质上如果把 `HEAD` 换成别的 `commit`，也可以显示当前工作目录和这条 `commit` 的区别

---

## rebase 操作

在 `merge` 之后，`commit` 历史就会出现分叉，这种分叉再汇合的结构会让有些人觉得混乱而难以管理。如果不希望 `commit` 历史出现分叉，可以用 `rebase` 来代替 `merge`

```bash
git rebase 目标基础点
```

### rebase——在新位置重新提交

`rebase` 的意思是，把 `commit` 序列重新设置基础点（也就是父 `commit`）。展开来说就是，把指定的 `commit` 以及它所在的 `commit` 串，以指定的目标 `commit` 为基础，依次重新提交一次。例如下面这个 `merge`：

```bash
git merge branch1
```

如果把 `merge` 换成 `rebase`，可以这样操作：

```shell
git checkout branch1
git rebase master
```

可以看出通过 `rebase`，`5` 和 `6` 两条 `commit` 把基础点从 `2` 换成了 `4` 。通过这样的方式，就让本来分叉了的提交历史重新回到了一条线。这种「重新设置基础点」的操作，就是 `rebase` 的含义

另外在 `rebase` 之后，需要切回 `master` 再 `merge` 一下，把 `master` 移到最新的 `commit`：

```bash
git checkout master
git merge branch1
```

之所以要从 `branch1` 来 `rebase`，然后再切回 `master` 再 `merge` 一下，而不是直接在 `master` 上执行 `rebase`，原因如下：

> 从图中可以看出，`rebase` 后的 `commit` 虽然内容和 `rebase` 之前相同，但它们已经是不同的 `commits` 了。如果直接从 `master` 执行 `rebase` 的话，就会是下面这样：
>
> <img src="https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202410132325395.png" alt="image-20241013232536222" style="zoom:50%;" />
>
> 这就导致 `master` 上之前的两个最新 `commit` 被剔除了。如果这两个 `commit` 之前已经在中央仓库存在，这就会导致没法 `push` 。所以，为了避免和远端仓库发生冲突，一般不要从 `master` 向其他 `branch` 执行 `rebase` 操作。而如果是 `master` 以外的 `branch` 之间的 `rebase`（比如 `branch1` 和 `branch2` 之间），就不必这么多费一步，直接 `rebase` 就好

---

## reset 本质

在最新的 `commit` 写错时，可以用 `reset --hard` 来把 `commit` 撤销：

```bash
git reset --hard HEAD^
```

### reset 的本质：移动 HEAD 以及它所指向的 branch

`reset` 实质是移动 `HEAD` ，并且带上 `HEAD` 所指向的 `branch`（如果有的话）。也就是说，`reset` 这个指令的行为其实和它的字面意思 "reset" 十分相符：它是用来重置 `HEAD` 以及它所指向的 `branch` 的位置的。

而 `reset --hard HEAD^` 之所以起到了撤销 `commit` 的效果，是因为它把 `HEAD` 和它所指向的 `branch` 一起移动到了当前 `commit` 的父 `commit` 上，从而起到了「撤销」的效果。

> Git 的历史只能往回看，不能向未来看，所以把 `HEAD` 和 `branch` 往回移动，就能起到撤回 `commit` 的效果

所以同理，`reset --hard` 不仅可以撤销提交，还可以用来把 `HEAD` 和 `branch` 移动到其他的任何地方。

```bash
git reset --hard branch2
```



### reset --hard：重置工作目录和暂存区

`reset --hard` 会在重置 `HEAD` 和 `branch` 的同时，重置工作目录里的内容。当在 `reset` 后面加了 `--hard` 参数时，工作目录里的内容会被完全重置为和 `HEAD` 的新位置相同的内容。换句话说，就是未提交的修改会被全部擦掉

例如在上次 `commit` 之后又对文件做了一些改动，然后执行 `reset` 并附上了 `--hard` 参数：

```bash
git status

git reset --hard HEAD^
```

`HEAD` 和当前 `branch` 切到上一条 `commit` 的同时，工作目录里的新改动也一起全都消失了，不管它们是否被放进暂存区：

```shell
git status
```

可以看到在 `reset --hard` 后，所有的改动都被擦掉

### reset --soft：保留工作目录和暂存区

`reset --soft` 会在重置 `HEAD` 和 `branch` 时，保留工作目录和暂存区中的内容，并把重置 `HEAD` 所带来的新的差异放进暂存区。

![image-20241014004055920](/git-images/202410140040609.png)

由于 `HEAD` 从 `4` 移动到了 `3`，而且在 `reset` 的过程中工作目录的内容没有被清理掉，所以 `4` 中的改动在 `reset` 后就也成了工作目录新增的「工作目录和 `HEAD` 的差异」。这就是上面一段中所说的「重置 `HEAD` 所带来的差异」

`--hard` 会清空工作目录的改动，而 `--soft` 则会保留工作目录的内容，并把因为保留工作目录内容所带来的新的文件差异放进暂存区

### reset 不加参数：保留工作目录，并清空暂存区

`reset` 如果不加参数，那么默认使用 `--mixed` 参数。它的行为是：保留工作目录，并且清空暂存区。也就是说，工作目录的修改、暂存区的内容以及由 `reset` 所导致的新的文件差异，都会被放进工作目录。简而言之，就是把所有差异都混合（mixed）放在工作目录中

```shell
git reset HEAD^
```

工作目录的内容和 `--soft` 一样会被保留，但和 `--soft` 的区别在于，它会把暂存区清空：

```shell
git status
```

---

## checkout 本质

`checkout` 并不止可以切换 `branch`。`checkout` 本质上的功能其实是：签出（ checkout ）指定的 `commit`。

`git checkout branch名` 的本质，其实是把 `HEAD` 指向指定的 `branch`，然后签出这个 `branch` 所对应的 `commit` 的工作目录。所以同样的 `checkout` 的目标也可以不是 `branch`，而直接指定某个 `commit`：

```shell
git checkout HEAD^^

git checkout master~5

git checkout 78a4bc

git checkout 78a4bc^
```

这些都是可以的，在 `git status` 的提示语中，Git 会提示可以用 `checkout -- 文件名` 的格式，通过「签出」的方式来撤销指定文件的修改

### checkout 和 reset 的不同

`checkout` 和 `reset` 都可以切换 `HEAD` 的位置，它们除了有许多细节的差异外，最大的区别在于：`reset` 在移动 `HEAD` 时会带着它所指向的 `branch` 一起移动，而 `checkout` 不会。当用 `checkout` 指向其他地方的时候，`HEAD` 和它所指向的 `branch` 就自动脱离了。

事实上，`checkout` 有一个专门用来只让 `HEAD` 和 `branch` 脱离而不移动 `HEAD` 的用法：

```shell
git checkout --detach
```

执行这行代码，Git 就会把 `HEAD` 和 `branch` 脱离，直接指向当前 `commit`

---

## git rm 的选项配置和说明

### 1. -f, --force

强制删除文件，即使它们与暂存区或工作目录中的内容冲突：

```bash
git rm -f file.txt
```

### 2. -r, --recursive

递归删除目录和它们包含的所有文件：

```bash
git rm -r directory
```

### 3. -n, --dry-run

模拟删除文件，但不实际删除它们，可用于预览删除操作将如何影响暂存区：

```bash
git rm -n file.txt
```

### 4. --cached

仅从暂存区中删除文件，保留工作目录中的文件：

```bash
git rm --cached file.txt
```

### 5. --ignore-unmatch

忽略不存在的文件：即使没有文件匹配也不报错，以 0 状态退出：

```bash
git rm --ignore-unmatch file.txt
```

### 6. -q, --quiet

静默模式，不显示每个被删除文件对应的 `rm` 命令行输出：

```bash
git rm -q file.txt
```

### 7. --pathspec-from-file

从指定的文件中读取要删除的文件的路径：

```bash
git rm --pathspec-from-file file.txt
```

## 辅助技巧

- 使用 `git rm -h` 命令查看所有可用选项
- 使用 `git rm --help` 命令查看特定选项的帮助信息

---

## 延伸知识点

以下 Git 相关知识实用性高、学习成本低，属于稍微研究一下就可以掌握的内容，值得在使用 Git 的过程中抽空学习。

### tag：不可移动的 branch

`tag` 是一个和 `branch` 非常相似的概念，它和 `branch` 最大的区别是：`tag` 不能移动。所以在很多团队中，`tag` 被用来在关键版本处打标记用。

更多关于 `tag`：https://git-scm.com/docs/git-tag

### cherry-pick：把选中的 commits 一个个合并进来

`cherry-pick` 是一种特殊的合并操作，使用它可以点选一批 `commit`，按序合并。

更多关于 `cherry-pick`：https://git-scm.com/docs/git-cherry-pick

### git config：Git 的设置

`git config` 可以对 Git 做出基础设置，例如用户名、用户邮箱，以及界面的展示形式。内容虽然多，但都不难，整体看一遍，将 Git 调整为顺手的状态后无需再频繁改动。属于「一次付出，长期受用」的高性价比内容。

更多关于 `config`：https://git-scm.com/docs/git-config

### Git Flow：复杂又高效的工作流

除 Feature Branching 之外，还有一个也很流行的工作流：Git Flow。Git Flow 的机制非常完善，很适合大型团队的代码管理。不过由于它的概念比较复杂（虽然难度并不高），所以并不适合新手直接学习，而更适合在实际使用与团队协作中逐渐熟悉和掌握。

更多关于 Git Flow：https://www.atlassian.com/git/tutorials/comparing-workflows/gitflow-workflow

### 官方文档

更多 Git 知识可查阅官方文档：

https://git-scm.com/

## 小结

Git 的知识体系庞大，本文重点覆盖其中既重要又困难的关键点：VCS 的三要素与中央式/分布式工作模型是理解一切 Git 行为的基础；`merge` 与 `rebase` 决定提交历史的形态；`add` 的粒度是「文件改动」而非文件名；`log/show/diff` 三类查看命令构成代码 review 与回溯的基本工具；`reset` 的三种模式与 `checkout` 的本质差异是撤销操作的核心原理；`git rm` 的各选项则规范了文件删除对暂存区与工作目录的影响。掌握这些原理与关键概念，比记忆零散命令更为重要。
