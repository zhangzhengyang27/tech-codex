---
title: 手写 Git：亲手实现 `init` 命令
description: 实现 git init 的目录结构与对象数据库初始化，理解 Git 的底层存储
keywords: [Node.js, AST, 编译, Git, init]
category: Node.js
tags: [Node.js, 编译与底层原理]
---







# 手写 Git：亲手实现 `init` 命令

在本章节中，将从零开始，亲手实现 Git 的 `init` 命令。通过这个过程，你不仅能学会如何用 Node.js 操作文件系统，更能深入理解 Git 的核心工作原理——一切皆文件的哲学。

## 1. `git init` 的背后

在开始编写代码之前，让我们先探究一下 `git init` 命令究竟做了什么。

当你在一个项目目录中执行 `git init` 时，Git 会创建一个名为 `.git` 的隐藏目录。这个目录是 Git 仓库的核心，它包含了所有版本控制所需的对象、引用、配置等信息。

可以通过一个简单的实验来观察：

1.  创建一个新目录并进入：

    ```bash
    mkdir my-git-demo
    cd my-git-demo
    ```

2.  执行 `git init`：

    ```bash
    git init
    ```

    你会看到输出 `Initialized empty Git repository in .../my-git-demo/.git/`。

3.  查看 `.git` 目录的结构：
    ```bash
    ls -la .git
    ```
    你会发现 `.git` 目录下已经包含了一些默认的文件和子目录，如 `HEAD`、`config`、`objects`、`refs` 等。

正是这些文件和目录构成了 Git 仓库的基础骨架。我们的任务，就是用代码来生成这个骨架。

## 2. 核心实现：用 Node.js 构建 `.git` 目录

现在，让我们开始编码。将使用 Node.js 的 `fs` 和 `path` 模块来创建所需的目录和文件。

### 2.1. 项目初始化

首先，创建一个用于开发自己的 Git 命令的项目：

```bash
mkdir my-git
cd my-git
npm init -y
```

### 2.2. 编写 `init` 函数

在项目根目录下创建 `src/init.mjs` 文件，并添加以下代码：

```javascript
import fs from 'node:fs';
import path from 'node:path';

/**
 * 初始化一个新的 Git 仓库。
 */
export function init() {
    // Git 仓库的根目录，通常是 .git
    const gitDir = '.git';

    // 检查 .git/config 文件是否存在，如果存在，则说明已经初始化过了
    if (fs.existsSync(path.join(gitDir, 'config'))) {
        console.log('Git repository already initialized.');
        return;
    }

    console.log(`Initializing empty Git repository in ${path.resolve(gitDir)}`);

    // 1. 创建核心目录结构
    const dirs = [
        'hooks',        // 存放客户端或服务端钩子脚本
        'info',         // 包含仓库的附加信息
        'objects/info', // 存放对象的附加信息
        'objects/pack', // 存放打包后的对象
        'refs/heads',   // 存放分支的引用
        'refs/tags',    // 存放标签的引用
    ].map(dir => path.join(gitDir, dir));

    for (const dir of dirs) {
        fs.mkdirSync(dir, { recursive: true });
    }

    // 2. 写入 HEAD 文件
    // HEAD 文件是一个符号引用，指向当前所在的分支。
    // 默认情况下，它指向 master 或 main 分支。
    const defaultBranch = 'main';
    fs.writeFileSync(
        path.join(gitDir, 'HEAD'),
        `ref: refs/heads/${defaultBranch}
`
    );

    // 3. 写入 config 文件
    // config 文件包含了仓库的本地配置。
    fs.writeFileSync(
        path.join(gitDir, 'config'),
        `[core]
    repositoryformatversion = 0
    filemode = false
    bare = false
    logallrefupdates = true
`
    );

    // 4. 写入 description 文件
    // 这个文件仅供 GitWeb 程序使用，为了完整性也创建它。
    fs.writeFileSync(
        path.join(gitDir, 'description'),
        "Unnamed repository; edit this file 'description' to name the repository.
"
    );
}
```

**代码解析：**

- **`path.join()`**: 使用 `path.join()` 来拼接路径，这比手动拼接字符串更安全、更具跨平台兼容性。
- **目录结构**: 创建了 Git 所需的一系列标准目录。每个目录都有其特定的用途，例如 `objects` 用于存储所有的数据对象，`refs` 用于存储指向这些对象的指针（引用）。
- **`HEAD` 文件**: 这是 Git 中最重要的文件之一。它通常指向当前活动的分支。将其初始化为指向 `refs/heads/main`，意味着默认的主分支是 `main`。
- **`config` 文件**: 这个文件存储了本地仓库的特定配置，例如是否区分文件名大小写、是否使用稀疏检出等。
- **`description` 文件**: 主要用于 `GitWeb` 等旧的工具，现代 Git 工作流中较少使用，但创建一个标准的 `.git` 目录时通常会包含它。

### 2.3. 创建测试脚本

为了验证我们的 `init` 函数是否能正常工作，创建一个测试文件 `src/test.mjs`：

```javascript
import { init } from "./init.mjs"

// 执行初始化
init()
```

然后，在终端中运行它：

```bash
node src/test.mjs
```

执行后，你会看到项目根目录下成功创建了 `.git` 目录以及其中的所有文件和子目录。

## 3. 验证我们的成果

我们的 `init` 命令真的成功了吗？让我们用真正的 Git 命令来验证一下。

首先，确保你已经通过 `node src/test.mjs` 创建了 `.git` 目录。然后执行以下操作：

1.  **查看状态**：

    ```bash
    git status
    ```

    Git 会告诉你正处于 `main` 分支，并且没有提交。

2.  **添加文件并提交**：

    ```bash
    # 创建一个新文件
    echo "Hello, my-git!" > README.md

    # 添加到暂存区
    git add .

    # 提交
    git commit -m "Initial commit"
    ```

3.  **查看日志**：
    ```bash
    git log
    ```
    你会看到刚刚的提交记录。


如果以上命令都能顺利执行，那么恭喜你，你已经成功地用几十行代码实现了 `git init` 的核心功能！

## 4. 常见问题 (Q&A)

**Q1: 为什么 `config` 文件里的 `filemode` 设置为 `false`？**

A1: `filemode` 配置项用于控制 Git 是否跟踪文件在文件系统中的执行权限位。在多平台（如 Windows 和 \*nix 系统）协作时，文件权限的处理方式不同，可能会导致不必要的提交。将其设置为 `false` 可以忽略这些权限变化，从而获得更一致的跨平台体验。

**Q2: `HEAD` 文件除了指向一个分支，还能指向别的东西吗？**

A2: 可以。当 `HEAD` 文件包含一个 40 位的 SHA-1 哈希值时，仓库就处于“分离头指针”（detached HEAD）状态。这通常发生在直接检出某个提交（`git checkout <commit-hash>`）而不是分支时。

**Q3: `objects` 目录为什么是空的？**

A3: `objects` 目录用于存储 Git 的所有数据对象，包括提交（commit）、树（tree）、和文件内容（blob）。在执行 `git add` 和 `git commit` 之后，Git 会根据文件内容和目录结构生成相应的对象，并以其内容的 SHA-1 哈希值为文件名，存储在这个目录中。

## 5. 总结与延伸阅读

通过本章的学习，揭开了 `git init` 的神秘面纱。它并非什么魔法，而仅仅是在文件系统上创建了一套预定义的目录和文件。这个过程也让我们对 Git 的底层设计有了更直观的认识。

接下来，将继续探索，实现 `git add` 和 `git commit`，一步步构建出自己的 Git。

**参考资料：**

- [Git Internals - The .git directory](https://git-scm.com/book/en/v2/Git-Internals-Plumbing-and-Porcelain)
- [Node.js File System Module Documentation](https://nodejs.org/api/fs.html)
