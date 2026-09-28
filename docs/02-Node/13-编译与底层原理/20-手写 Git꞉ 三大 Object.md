---
title: Git 核心揭秘：深入理解三大对象 Blob、Tree 与 Commit
description: 剖析 Git 的 blob/tree/commit 对象结构与 SHA-1 寻址，手写对象存储
keywords: [Node.js, AST, 编译, Git]
category: Node.js
tags: [Node.js, 编译与底层原理]
---







# Git 核心揭秘：深入理解三大对象 Blob、Tree 与 Commit

> **导读**：
> Git，作为现代软件开发的基石，其强大之处远不止 `git commit`、`git push` 这么简单。它的核心是一个精巧的内容寻址文件系统，由三个基本对象——**Blob**、**Tree** 和 **Commit**——构成。理解这三大对象，是揭开 Git 神秘面纱、从“使用者”进阶为“掌控者”的关键一步。
>
> 本文将彻底告别高层命令的舒适区，带你深入 Git 的“引擎室”，通过底层的 Plumbing 命令，亲手创建、检查和链接这些核心对象。你将学到：
>
> - **Git 如何存储你的文件内容？** (Blob 对象)
> - **Git 如何组织目录结构？** (Tree 对象)
> - **Git 如何记录版本历史？** (Commit 对象)
> - **SHA-1 哈希在 Git 中的核心作用及其计算原理。**
>
> 准备好了吗？让我们开始这场深入 Git 内部的探索之旅，真正理解版本控制的本质。


---

## 1. 万物皆对象：Git 的对象数据库

在 Git 的世界里，一切皆为对象。你的每一次代码提交，每一个文件，每一个目录结构，都被 Git 精心打包成一个“对象”，并存储在 `.git/objects` 目录下。这个目录就是 Git 的对象数据库。

Git 通过一个简单的 **SHA-1 哈希算法** 来索引和校验所有对象。这个 40 个字符的十六进制字符串（例如 `670a245535fe6316eb2316c1103b1a88bb519334`）是根据对象的内容计算得出的。这意味着：

- **内容决定 ID**：相同的内容总会生成相同的 SHA-1 哈希。
- **不可变性**：一旦对象被创建，其内容和 ID 就永远不会改变。任何微小的修改都会导致一个全新的对象和全新的 ID。

这种机制保证了 Git 仓库历史的完整性和不可篡改性。

---

## 2. 存储内容：Blob 对象 (文件)

`Blob` (Binary Large Object) 是 Git 中最基础的对象类型，它只做一件事：**存储文件的原始二进制内容**。

你可以把 Blob 想象成一个文件的“快照”，但它不包含任何元数据，比如文件名、路径或时间戳。它只关心内容本身。

### 2.1. Blob 对象的哈希计算原理

Git 并非直接对文件内容进行 SHA-1 哈希。为了区分不同类型的对象，它会在内容前加上一个头部信息。对于 Blob 对象，其哈希的计算源于以下格式的字符串：

`"blob " + content.length + "\0" + content`

- `"blob "`：对象的类型。
- `content.length`：文件内容的字节数。
- `"\0"`：一个空字节，作为头部和内容的分隔符。
- `content`：文件的实际内容。

**可以用 Node.js 来验证这一点：**

```javascript
const crypto = require("crypto")

// 准备 Git 对象的内容和头部
const type = "blob"
const content = "Hello, Git!\n"
const header = `${type} ${content.length}\0`
const store = header + content

// 创建 SHA-1 哈希
const sha1 = crypto.createHash("sha1")
sha1.update(store)
const hash = sha1.digest("hex")

console.log(hash)
// 输出: 670a245535fe6316eb2316c1103b1a88bb519334
```

### 2.2. 手动创建 Blob 对象

现在，让我们进入实战。将使用 Git 的底层命令 `git hash-object` 来手动创建一个 Blob 对象。

**实验步骤：**

1.  **初始化一个实验仓库**

    为了不影响现有项目，创建一个新的目录并初始化一个 Git 仓库。

    ```bash
    mkdir git-internals-lab && cd git-internals-lab && git init
    ```

2.  **创建文件并生成 Blob**

    创建一个简单的文本文件，然后使用 `git hash-object -w` 命令。`-w` 选项会将该文件内容作为一个 Blob 对象写入到 Git 的对象数据库中。

    ```bash
    $ echo 'Hello, Git!' > hello.txt
    $ git hash-object -w hello.txt
    670a245535fe6316eb2316c1103b1a88bb519334
    ```

    看，这个哈希值和用 Node.js 计算出的完全一致！

3.  **检查 Blob 对象**

    可以使用 `git cat-file` 命令来检查刚刚创建的对象。

    - `-t` 选项用于查看对象类型。
    - `-p` 选项用于查看对象内容 (p for "pretty-print")。

    ```bash
    $ git cat-file -t 670a245535fe6316eb2316c1103b1a88bb519334
    blob

    $ git cat-file -p 670a245535fe6316eb2316c1103b1a88bb519334
    Hello, Git!
    ```

    这证明已成功将 `hello.txt` 的内容存储为了一个 Blob 对象。

---

## 3. 组织内容：Tree 对象 (目录结构)

如果只有 Blob，Git 只能存储一堆无组织的文件内容。为了重现项目在某个时刻的完整目录结构，Git 使用了 `Tree` 对象。

**Tree 对象就像一个目录**，它存储了：

- 一个或多个条目（entry）。
- 每个条目包含：文件模式（mode）、对象类型（blob 或 tree）、SHA-1 哈希和文件名。

简单来说，一个 Tree 对象就是一张列表，记录了它所代表的那个目录里，有哪些文件（指向 Blob 对象）和哪些子目录（指向其他 Tree 对象）。


### 3.1. 手动创建 Tree 对象

直接创建 Tree 对象比 Blob 要复杂一些，因为它依赖于一个叫做“暂存区”（Staging Area 或 Index）的中间区域。暂存区本质上是一个准备写入下一次提交的 Tree 对象的“构建器”。

将使用 `git update-index` 和 `git write-tree` 这两个命令。

**实验步骤：**

1.  **将 Blob 添加到暂存区**

    `git update-index` 命令用于管理暂存区。使用它来声明：“嘿，Git，我希望在下个版本中包含这个文件。”

    ```bash
    # 语法: git update-index --add --cacheinfo <mode> <blob-hash> <filename>
    $ git update-index --add --cacheinfo 100644 670a245535fe6316eb2316c1103b1a88bb519334 hello.txt
    ```

    - `--add`：因为这是第一次添加，所以需要这个标志。
    - `--cacheinfo`：表示直接提供 Blob 的哈希，而不是从工作目录的文件中计算。
    - `100644`：这是一个文件模式，表示它是一个普通的、不可执行的文件。

2.  **从暂存区创建 Tree 对象**

    一旦暂存区准备就绪，`git write-tree` 命令就会读取暂存区的当前状态，并创建一个代表该状态的 Tree 对象。

    ```bash
    $ git write-tree
    d3ec8a0f5950fb1f73ce0d1ed55cd6fa7afcdeb9
    ```

    这个命令会返回新创建的 Tree 对象的 SHA-1 哈希。

3.  **检查 Tree 对象**

    同样，使用 `git cat-file` 来一探究竟。

    ```bash
    $ git cat-file -t d3ec8a0f5950fb1f73ce0d1ed55cd6fa7afcdeb9
    tree

    $ git cat-file -p d3ec8a0f5950fb1f73ce0d1ed55cd6fa7afcdeb9
    100644 blob 670a245535fe6316eb2316c1103b1a88bb519334    hello.txt
    ```

    输出清晰地显示了这个 Tree 对象包含一个条目：一个名为 `hello.txt` 的普通文件，其内容由 Blob `fde429a...` 指定。通过这种方式，文件名和文件内容终于被关联起来了！

---

## 4. 记录历史：Commit 对象

已经了解了 Git 如何存储文件内容（Blob）和组织目录结构（Tree）。现在，来到了 Git 对象世界的核心——Commit 对象。如果说 Blob 和 Tree 是构建项目的“积木”，那么 Commit 就是将这些“积木”在特定时间点“固化”下来的快照，并为这个快照打上时间戳、作者信息和一段描述，从而构成了所熟知的版本历史。

**Commit 对象的本质是一个版本快照，它包含了：**

- **一个指向顶层 Tree 对象的指针**：代表了该版本中项目根目录的完整结构。
- **一个或多个指向父 Commit 对象的指针**：除了初始提交，每个 Commit 都至少有一个父提交，这正是将历史链接成线（或图）的关键。合并提交（Merge Commit）会有两个或多个父提交。
- **作者（Author）信息**：记录了最初创建该变更的人员信息和时间戳。
- **提交者（Committer）信息**：记录了将此提交应用到仓库的人员信息和时间戳。在简单的线性历史中，两者通常是相同的。
- **提交信息（Commit Message）**：一段描述该版本变更内容的文字。

### 4.1. 手动创建 Commit 对象

现在，让我们利用上一章节创建的 Tree 对象 (`d3ec8a0f5950fb1f73ce0d1ed55cd6fa7afcdeb9`) 来手动创建我们的第一个 Commit。

将使用 `git commit-tree` 命令。这个底层命令的作用就是：接收一个 Tree 对象的哈希，附加上作者、提交信息等元数据，然后生成一个全新的 Commit 对象。

**实验步骤：**

1.  **创建 Commit 对象**

    将一条提交信息通过管道传递给 `git commit-tree` 命令，并指定想要提交的 Tree 哈希。

    ```bash
    # 语法: echo "<commit-message>" | git commit-tree <tree-hash>
    $ echo 'Initial commit' | git commit-tree d3ec8a0f5950fb1f73ce0d1ed55cd6fa7afcdeb9
    3c3f87799565392854b09c311c5a3501b52d8c3e
    ```

    这个命令执行后，会返回新创建的 Commit 对象的 SHA-1 哈希。

2.  **验证 Commit 对象**

    和之前一样，使用 `git cat-file -p` 来查看这个 Commit 对象的内部构造。

    ```bash
    $ git cat-file -p 3c3f87799565392854b09c311c5a3501b52d8c3e
    tree d3ec8a0f5950fb1f73ce0d1ed55cd6fa7afcdeb9
    author zhangzhengyang <zzy9953@163.com> 1733897971 +0800
    committer zhangzhengyang <zzy9953@163.com> 1733897971 +0800

    Initial commit
    ```

    看！输出结果清晰地展示了 Commit 对象的结构：

    - 它指向了我们的 Tree 对象 `d3ec8a0f5950fb1f73ce0d1ed55cd6fa7afcdeb9`。
    - 它自动捕获了我的 Git 配置中的作者和提交者信息，并附上了时间戳。
    - 它包含了提供的提交信息 "Initial commit"。

    **但是，这个 Commit 目前是“孤儿”**。它存在于 Git 的对象数据库中，但没有任何分支或标签指向它。如果你此时运行 `git log`，你是看不到这个提交的。它像一个幽灵一样漂浮在 `.git/objects` 目录里，如果 Git 的垃圾回收机制（`git gc`）运行，它最终可能会被清理掉。

    为了让它成为历史的一部分，需要一个指针——也就是分支（Branch）或引用（Ref）。这部分将在后续章节深入探讨。

    在下一节，将学习如何创建第二个提交，并将其链接到第一个提交上，从而形成一条真正的提交链。

### 4.2. 链接历史：创建父子关系的 Commit

一个孤立的 Commit 意义不大，Git 的威力在于将这些 Commit 串联起来，形成一部可追溯的“历史影片”。这是通过在创建新 Commit 时指定其“父提交”（Parent Commit）来实现的。

将基于第一个 Commit (`3c3f877...`) 创建一个新的版本。

**实验步骤：**

1.  **创建一个新的文件状态**

    首先，需要对项目做一些改动。让我们创建一个新文件，并为它生成一个新的 Blob 和一个新的 Tree。

    ```bash
    # 1. 创建新内容和新 Blob
    $ echo 'Another file' > another.txt
    $ git hash-object -w another.txt
    b0b9fc8f6cc2f8f110306ed7f6d1ce079541b41f

    # 2. 更新暂存区，加入新文件
    # 注意：需要重新添加旧文件，因为暂存区是临时的
    $ git update-index --add --cacheinfo 100644 670a245535fe6316eb2316c1103b1a88bb519334 hello.txt
    $ git update-index --add --cacheinfo 100644 b0b9fc8f6cc2f8f110306ed7f6d1ce079541b41f another.txt

    # 3. 创建代表新目录结构的 Tree
    $ git write-tree
    5324f4fe022a1bf9604f26d6ca5fb3ca5e1a7846
    ```

    现在有了一个新的 Tree (`194dd75...`)，它代表了包含 `hello.txt` 和 `another.txt` 这两个文件的目录结构。

2.  **创建第二个 Commit 并指定父提交**

    现在是最关键的一步。再次使用 `git commit-tree`，但这次使用 `-p` 参数来指定它的父提交，也就是之前创建的第一个 Commit。

    ```bash
    # 语法: echo "<msg>" | git commit-tree <new-tree-hash> -p <parent-commit-hash>
    $ echo "Add another file" | git commit-tree 5324f4fe022a1bf9604f26d6ca5fb3ca5e1a7846 -p 3c3f87799565392854b09c311c5a3501b52d8c3e
    c16645a8d164553b45c3f3431856779b12a89a03
    ```

3.  **验证新的 Commit 及其历史链**

    让我们看看这个新创建的 Commit (`c16645a...`) 内部有什么不同。

    ```bash
    $ git cat-file -p c16645a8d164553b45c3f3431856779b12a89a03
    tree 5324f4fe022a1bf9604f26d6ca5fb3ca5e1a7846
    parent 3c3f87799565392854b09c311c5a3501b52d8c3e
    author zhangzhengyang <zzy9953@163.com> 1733898421 +0800
    committer zhangzhengyang <zzy9953@163.com> 1733898421 +0800

    Add another file
    ```

    太棒了！和第一个 Commit 相比，这个 Commit 对象内部多了一行 `parent 3c3f877...`。这行信息就像一条无形的线，将我们的第二个提交指向了第一个提交，从而形成了一条从子到父的链条。

    通过不断重复这个过程，Git 构建起了一个由 Commit 节点组成的、可追溯的有向无环图（DAG），这便是 Git 版本历史的本质。

---

## 5. 分支与引用（Ref）：为 Commit 命名

到目前为止，创建的所有对象都只能通过它们冗长的 SHA-1 哈希来访问。这显然非常不便，而且正如提到的，没有被任何东西引用的 Commit 最终会被当作垃圾回收掉。为了解决这个问题，Git 引入了“引用”（References，或简称 Refs）。

**引用（Ref）就是一个给人看的、友好的指针，它指向一个 Commit 哈希。** 最常见的两种引用就是 **分支（Branch）** 和 **标签（Tag）**。

- **分支（Branch）**：一个指向特定 Commit 的、**可移动的**指针。当你创建一个新的 Commit 时，当前所在的分支会自动向前移动，指向这个新的 Commit。这就是为什么分支代表了“开发中的一条线”。
- **标签（Tag）**：一个指向特定 Commit 的、**通常是不可移动的**指针。它常用于标记重要的版本发布点，例如 `v1.0.0`。

这些引用都以普通文本文件的形式存储在 `.git/refs` 目录下。

- 分支位于 `.git/refs/heads/`
- 标签位于 `.git/refs/tags/`

### 5.1. 手动创建分支

让我们为之前创建的第二个 Commit (`c16645a...`) 创建一个名为 `master` 的分支，让它正式成为仓库历史的一部分。

将使用底层命令 `git update-ref`。

**实验步骤：**

1.  **创建分支指针**

    `git update-ref` 命令可以创建、更新或删除一个引用。

    ```bash
    # 语法: git update-ref <ref-path> <commit-hash>
    $ git update-ref refs/heads/master c16645a8d164553b45c3f3431856779b12a89a03
    ```

    这个命令的意思是：“创建一个名为 `refs/heads/master` 的引用，让它指向 Commit `c16645a...`”。

2.  **验证分支**

    首先，可以直接查看这个文件，你会发现它的内容就是那个 Commit 哈希。

    ```bash
    $ cat .git/refs/heads/master
    c16645a8d164553b45c3f3431856779b12a89a03
    ```

    更重要的是，现在可以使用 `git log` 命令了！Git 会自动查找所有在 `refs/heads/` 下的分支，并从它们指向的 Commit 开始回溯历史。

    ```bash
    $ git log master
    commit c16645a8d164553b45c3f3431856779b12a89a03
    Author: zhangzhengyang <zzy9953@163.com>
    Date:   Thu Dec 11 17:07:01 2025 +0800

        Add another file

    commit 3c3f87799565392854b09c311c5a3501b52d8c3e
    Author: zhangzhengyang <zzy9953@163.com>
    Date:   Thu Dec 11 17:06:11 2025 +0800

        Initial commit
    ```

    看！手动创建的两个 Commit 现在都出现在了提交历史中。成功地从最底层的对象一步步构建起了一个功能虽小但完整的 Git 历史记录。

---

## 6. 常见问题（Q&A）

本章节整理了一些在理解 Git 底层对象时常见的问题，希望能帮助你扫清障碍。

### Q1: Blob 和工作目录中的文件有什么区别？

**A:** 这是个非常核心的问题。它们的主要区别在于：

- **Blob 是内容，文件是容器**：Blob 只存储文件的**内容**，它是一个纯粹的二进制数据块。而工作目录中的文件，除了内容，还包含了**文件名、路径、权限**等元数据。
- **Blob 在对象数据库中，文件在工作区**：Blob 存储在 `.git/objects` 目录中，是 Git 仓库的永久组成部分。文件则存在于你的工作目录，是你可以直接编辑的实体。
- **Blob 是不可变的，文件是可变的**：一旦一个 Blob 被创建，它的内容和哈希就永远不会改变。而你可以随时修改工作目录中的文件。当你修改文件后，`git add` 会根据新内容生成一个**全新的 Blob 对象**。

简单来说，你可以把工作目录中的文件看作是“当前版本”的实体，而 Blob 则是构成所有版本历史的、不可变的“内容积木”。

### Q2: `.git/index` 文件（暂存区）和 Tree 对象是什么关系？

**A:** `.git/index` 文件，也就是常说的“暂存区”（Staging Area），是连接工作目录和 Git 仓库历史的桥梁。它和 Tree 对象的关系可以概括为：**暂存区是下一个 Tree 对象的“构建器”或“预演版”**。

- 当你运行 `git add <file>` 时，Git 会：
  1.  根据文件内容创建一个 Blob 对象。
  2.  将这个 Blob 的信息（哈希、文件名、模式）更新到 `.git/index` 文件中。
- 当你运行 `git commit` 时，Git 内部实际上会先执行类似 `git write-tree` 的操作。这个操作会读取 `.git/index` 文件的当前状态，并据此创建一个**新的 Tree 对象**。
- 然后，`git commit` 再创建一个 Commit 对象，让它指向这个新生成的 Tree 对象。

所以，暂存区是一个动态的、二进制的清单，它精确地描述了**下一次提交**时根目录的结构应该是怎样的。`git write-tree` 命令的作用就是将这个清单“固化”成一个永久的、不可变的 Tree 对象。

### Q3: `git gc`（垃圾回收）会删除哪些对象？

**A:** `git gc` (Garbage Collection) 的主要职责是清理 Git 仓库中不再需要的“悬空”对象（dangling objects），以节省空间。一个对象是否被回收，取决于它是否**可达**（reachable）。

- **可达的对象**：从任何一个**引用**（即分支 `refs/heads/...`、标签 `refs/tags/...` 或特殊引用如 `HEAD`）出发，能够通过 Commit 的 `parent` 指针或 Tree 的条目最终访问到的所有对象（Commit、Tree、Blob），都是可达的。
- **悬空的对象**：反之，任何无法从任何引用追溯到的对象，就是悬空的。

`git gc` 会删除那些**悬空**的对象。典型的悬空对象包括：

- 你用 `git hash-object -w` 创建了但从未使用过的 Blob。
- 你创建了但没有被任何引用指向的“孤儿” Commit（就像实验中那样）。
- 被 `git rebase`、`git commit --amend` 等命令抛弃的旧 Commit。

Git 并不会立即删除这些对象，而是会保留一段时间（默认为两周），以防你意外丢失数据需要恢复。`git gc` 会清理掉这些过了“宽限期”的悬空对象。

### Q4: `HEAD` 是什么？它和分支有什么关系？

**A:** `HEAD` 是 Git 中一个至关重要的特殊指针，它代表了你**当前所在的位置**。你可以把它想象成一个“你在这里”的指示牌。

`HEAD` 通常指向一个**分支**。当你 `checkout` 一个分支时，比如 `git checkout master`，`HEAD` 就会指向 `master`。

- **`HEAD` 是一个符号引用（Symbolic Ref）**：在大多数情况下，`.git/HEAD` 是一个文本文件，其内容不是一个 SHA-1 哈希，而是指向另一个引用的路径。例如：`ref: refs/heads/master`。这意味着 `HEAD` 正通过 `master` 分支间接地指向一个 Commit。

---

## 7. 相关参考资料和扩展阅读

为了更深入地探索 Git 的内部工作原理，以下资源是极好的起点：

- **书籍**
  - [**Pro Git**](https://git-scm.com/book/en/v2) - Scott Chacon 和 Ben Straub 的经典之作，尤其是第 10 章“Git Internals”，是本文内容的重要参考。
- **文章与教程**
  - [**Git from the Bottom Up**](https://jwiegley.github.io/git-from-the-bottom-up/) - 一篇经典的、自底向上解释 Git 的文章。
  - [**Build Your Own Git**](https://wyag.thb.lt/) - 一个非常有趣的项目，指导你用 Python 从零开始实现一个迷你版的 Git。
- **官方文档**
  - [**Git 官方文档**](https://git-scm.com/docs) - 当你需要查询某个特定命令最精确的解释时，官方文档永远是最好的选择。

---

## 8. 版本历史记录

- **v1.0.0** (2025-12-11)
  - **feat**: 完成对 Git 三大核心对象（Blob, Tree, Commit）的深入解析。
  - **feat**: 补充了手动创建和验证对象的底层命令实践指南。
  - **feat**: 新增了分支与引用（Ref）的核心概念说明。
  - **docs**: 增加了常见问题（Q&A）、参考资料和版本历史章节。
  - **style**: 全面优化和统一了文档的 Markdown 格式。
