---
title: 在 Git 项目中管理子项目
description: git submodule 与 subtree 在大型项目中的嵌套版本控制实践
keywords: [Node.js, CLI, commander, Git]
category: Node.js
tags: [Node.js, CLI工具开发]
---







# 在 Git 项目中管理子项目

当一个项目需要复用另一个独立项目的代码时，如何优雅地将一个 Git 仓库嵌入到另一个之中，同时保持两者都能独立发展和维护？

虽然 `npm` 包和 `monorepo` 仓库是常见的解决方案，但它们并不适用于所有场景。例如：当需要频繁修改被依赖项目的源码，并且希望它保持独立的 Git 历史时，`git submodule` 和 `git subtree` 就成了更合适的选择

> 这两种工具都能实现“在一个 Git 项目中引入另一个 Git 项目”的功能，但它们的设计哲学和工作流程却截然不同
>

## Git Submodule：独立的项目引用

`git submodule` 的核心思想是“项目引用”。允许将一个外部 Git 仓库作为主项目的子目录，但子模块本身仍然是一个完全独立的 Git 仓库。父项目只存储对子模块特定提交（commit）的引用，而不关心其内部的具体内容

### 使用方法

#### 添加子模块

通过 `git submodule add` 命令，可以将外部仓库添加为子模块：

```bash
# 语法: git submodule add <仓库地址> <本地路径>
git submodule add git@github.com:QuarkGluonPlasma/git-research-child.git child
```

执行后 Git 会：

1.  在项目根目录下创建 `.gitmodules` 文件，记录子模块的仓库地址和本地路径
2.  将子模块仓库克隆到指定的 `child` 目录
3.  创建一个新的提交，记录子模块的引用

`.gitmodules` 文件内容如下：

```ini
[submodule "child"]
    path = child
    url = git@github.com:QuarkGluonPlasma/git-research-child.git
```

#### 克隆带子模块的项目

当其他人克隆包含子模块的项目时，默认情况下，子模块目录是空的。需要执行额外步骤来初始化并拉取子模块的代码

**方法一：分步初始化**

```bash
# 1. 初始化子模块（注册 .gitmodules 中的信息）
git submodule init

# 2. 更新子模块（拉取代码）
git submodule update
```

如果子模块还嵌套其他子模块，可以使用 `--recursive` 选项进行递归操作：

```bash
git submodule update --init --recursive
```

**方法二：克隆时直接拉取**

更推荐在 `git clone` 时使用 `--recurse-submodules` 选项，一步到位：

```bash
git clone --recurse-submodules <项目仓库地址>
```

#### 在子模块中工作

子模块是一个功能齐全的 Git 仓库，拥有自己独立的 `.git` 目录（通常存储在父项目的 `.git/modules/` 目录下）。可以在子模块目录内执行所有标准的 Git 操作，如 `add`、`commit`、`push` 和 `pull`

当在子模块中创建新的提交并推送到其远程仓库后，父项目会检测到子模块的引用发生了变化。`git status` 会提示 "new commits"：

```bash
modified:   child (new commits)
```

此时需要在父项目中创建一个新的提交，以更新对子模块的引用：

```bash
git add child
git commit -m "Update submodule to the latest version"
```

### 优缺点

**优点：**

- **清晰隔离**：父项目和子模块是完全独立的仓库，职责清晰，互不干扰
- **精确的版本控制**：父项目可以精确锁定子模块的某个版本，确保依赖的稳定性
- **独立的 Git 历史**：子模块保留了自己完整的提交历史，不会污染父项目的历史记录

**缺点：**

- **工作流相对复杂**：开发者需要学习额外的 `submodule` 命令，并且在克隆和更新时需要执行额外步骤
- **容易出错**：新手容易忘记更新子模块引用，导致其他人拉取的代码不是最新的

## Git Subtree：代码的完全集成

与 `submodule` 不同，`git subtree` 的核心思想是“代码集成”。它将外部仓库的代码直接合并到主项目中，使其成为项目的一部分。子树目录与普通目录无异，没有独立的 `.git` 目录

### 使用方法

#### 添加子树

使用 `git subtree add` 命令添加一个子树。这个命令会将外部仓库的历史记录合并到主项目中

```bash
# 语法: git subtree add --prefix=<本地路径> <仓库地址> <分支>
git subtree add --prefix=child git@github.com:QuarkGluonPlasma/git-research-child.git main
```

`--prefix` 参数指定了子树代码存放的目录。执行后，`child` 目录看起来就像一个普通文件夹，你可以像对待项目中的其他文件一样，对其进行修改、提交。

#### 从子树拉取更新

如果子树的远程仓库有了新的更新，可以使用 `git subtree pull` 将其拉取到主项目中：

```bash
git subtree pull --prefix=child git@github.com:QuarkGluonPlasma/git-research-child.git main
```

为了简化命令，可以先将子树的远程仓库添加为一个 `remote`：

```bash
git remote add child_remote git@github.com:QuarkGluonPlasma/git-research-child.git
git subtree pull --prefix=child child_remote main
```

默认情况下，`pull` 操作会保留子树的提交历史。如果希望将所有更新合并成一个提交，可以使用 `--squash` 选项：

```bash
git subtree pull --prefix=child child_remote main --squash
```

#### 将本地变更推送到子树

如果在主项目中修改了子树目录下的代码，并希望将这些变更推送回子树的远程仓库，可以使用 `git subtree push`：

```bash
git subtree push --prefix=child child_remote main
```

Git 会智能地找出属于子树目录的变更，并将它们推送到指定的远程仓库

### 优缺点

**优点：**

- **工作流简单**：对于不熟悉 `submodule` 的开发者来说，上手非常容易。克隆项目后无需额外步骤，代码立即可用
- **管理方便**：所有代码都在一个仓库中，无需在不同仓库间切换
- **对协作者透明**：其他人甚至不需要知道 `subtree` 的存在

**缺点：**

- **历史记录混合**：子树的提交历史会与主项目的历史混合在一起，可能导致主项目的 `git log` 变得复杂和混乱
- **推送和拉取相对较慢**：`subtree` 在推送或拉取时需要遍历和计算相关的提交历史，性能上不如 `submodule`
- **责任边界模糊**：由于代码完全集成，开发者可能会无意中修改子树的代码，导致项目边界不清

## 对比与选择

| 特性         | Git Submodule              | Git Subtree            |
| :----------- | :------------------------- | :--------------------- |
| **核心思想** | 仓库引用，保持独立         | 代码集成，融为一体     |
| **项目结构** | 子目录是独立的 Git 仓库    | 子目录是普通文件夹     |
| **Git 历史** | 父子项目历史完全分离       | 子项目历史合并到父项目 |
| **工作流**   | 相对复杂，需专门命令       | 简单直观，对新手友好   |
| **克隆项目** | 需额外步骤 (`--recursive`) | `git clone` 即可       |
| **更新依赖** | `git submodule update`     | `git subtree pull`     |
| **耦合度**   | 低，边界清晰               | 高，代码混合           |

如何选择：

- **选择 `git submodule` 的场景**：

  - 希望严格区分主项目和依赖项目的代码，保持清晰的责任边界
  - 项目依赖一个不经常变动的第三方库，并且希望锁定其特定版本
  - 团队成员都熟悉 Git，能够处理 `submodule` 的工作流

- **选择 `git subtree` 的场景**：
  - 希望简化项目的工作流，让协作者可以快速上手，无需关心依赖管理的细节
  - 项目结构简单，或者只是想快速地将一小段代码集成进来
  - 你不介意主项目的 Git 历史变得稍微复杂
