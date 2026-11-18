---
title: Git commit 选项
description: 系统讲解 Git commit 常用选项（-a、-m、--amend 等）的含义、用法与工程实践
keywords: [Git, commit, 选项]
category: Git 版本控制
tags: [DevOps, Git]
---

# Git commit 选项
## Git commit 的选项配置和说明

### 1. -a, --all

**配置**: 自动暂存所有已跟踪文件的修改并提交。

**说明**: 此选项会将对**已跟踪文件**的修改与删除自动加入暂存区并一起提交。注意它不会包含未跟踪的新文件——新文件仍需先执行 `git add`

```bash
git commit -a -m "Update tracked files"
```

### 2. -m, --message 

**配置**: 指定提交信息

**说明**: 此选项用于指定提交信息。提交信息应该简明扼要地描述提交的内容

```bash
git commit -m "Fix bug in function X"
```

### 3. -v, --verbose

**配置**: 显示更详细的提交信息，包括每个文件的更改。

**说明**: 此选项用于显示更详细的提交信息，包括每个文件的更改。这对于调试或查看提交的具体内容非常有用。

```bash
git commit -v -m "Refactor code"
```

### 4. --no-verify

**配置**: 绕过提交前的钩子

**说明**: 此选项用于绕过提交前的钩子。提交前的钩子是一些脚本，可以在提交之前运行，以检查提交是否符合某些规则。例如，您可以使用提交前的钩子来确保提交信息符合一定的格式

```bash
git commit --no-verify -m "Skip pre-commit hooks"
```

### 5. --amend

**配置**: 修改上一次提交。

**说明**: 此选项用于修改上一次提交。这对于修改提交信息或添加忘记添加的文件非常有用

```bash
git commit --amend -m "Fix typo in commit message"
```

### 6. --date 

**配置**: 设置提交时间。

**说明**: 此选项用于设置提交时间。默认情况下，提交时间是当前时间。

```bash
git commit --date="2023-11-15" -m "Backdate commit"
```

### 7. --author 

**配置**: 设置提交作者

**说明**: 此选项用于设置提交作者。默认情况下，提交作者是当前用户

```bash
git commit --author="John Doe <john.doe@example.com>" -m "Fix bug"
```

### 8. --signoff

**配置**: 在提交信息中添加 "Signed-off-by" 行

**说明**: 此选项用于在提交信息中添加 "Signed-off-by" 行。这表明提交者已签署开发者证书协议 (DCO)

```bash
git commit --signoff -m "Add new feature"
```

### 9. --edit

**配置**: 打开文本编辑器编辑提交信息。

**说明**: 此选项用于打开文本编辑器编辑提交信息。这对于编辑提交信息或添加更多详细信息非常有用

```bash
git commit --edit -m "Initial commit"
```

### 10. --reset-author

**配置**: 将提交作者重置为当前用户。

**说明**: 此选项用于将提交作者重置为当前用户。这对于修改提交作者非常有用

```bash
git commit --reset-author -m "Fix typo in commit author"
```

### 11. --allow-empty

**配置**: 允许提交空提交。

**说明**: 此选项用于允许提交空提交。空提交是没有任何文件更改的提交

```bash
git commit --allow-empty -m "Fix typo in previous commit message"
```

### 12. -q, --quiet

**配置**: 抑制提交后的摘要输出。

**说明**: 此选项用于抑制提交成功后打印的摘要信息，适合在脚本中静默执行

```bash
git commit -q -m "Silent commit"
```

### 13. --no-edit

**配置**: 不打开编辑器，直接使用选定的提交消息。

**说明**: 此选项用于跳过编辑器，直接采用已确定的提交消息，常与 `--amend` 组合以保留原提交信息。注意：`-n` 是 `--no-verify` 的简写（见第 4 节），并不是 `--no-edit`

```bash
git commit --amend --no-edit
```



### 14. -p, --patch

**配置**: 使用交互式补丁选择界面提交部分更改

**说明**: 此选项会启动交互式补丁选择界面，逐块（hunk）决定哪些更改进入本次提交，适合将一次改动拆分成多个提交

```bash
git commit --patch -m "Commit selected changes"
```

### 15. --squash=<commit>

**配置**: 创建一个供 `git rebase --autosquash` 使用的压缩提交

**说明**: 此选项基于指定提交构造一条 "squash! ..." 消息的提交，后续执行 `git rebase -i --autosquash` 时会被自动合并到指定提交中

```bash
git commit --squash HEAD~1
```

### 16. --fixup=<commit>

**配置**: 创建一个待自动合并的修复提交

**说明**: 此选项基于指定提交构造一条 "fixup! ..." 消息的提交，在 `git rebase -i --autosquash` 时会被自动移到指定提交之后并合并，常用于修复历史提交的小错误。提交消息由 Git 自动构造，无需也不能用 `-m` 提供消息

```bash
git commit --fixup=HEAD~1
```

### 17. -F <file>, --file=<file>

**配置**: 从文件中读取提交信息

**说明**: 此选项用于从指定文件读取提交信息（`-F -` 表示从标准输入读取），适合在脚本或流水线中生成提交

```bash
git commit -F commit-message.txt
```

### 18. -C <commit>, --reuse-message=<commit>

**配置**: 复用指定提交的提交消息与作者信息

**说明**: 此选项会复用指定提交的日志消息和作者信息（包括时间戳）来创建新提交，且不打开编辑器。与之类似的 `-c`（--reedit-message）会打开编辑器允许修改

```bash
git commit -C HEAD~1
```

### 19. --gpg-sign

**配置**: 使用 GPG 签名提交

**说明**: 此选项用于使用 GPG 签名提交。这对于确保提交的完整性和真实性非常有用

```bash
git commit --gpg-sign -m "Sign commit with GPG"
```

### 20. --short

**配置**: 以简短格式显示试运行结果

**说明**: 此选项隐含 `--dry-run`，以 git status 的 short 格式显示"如果提交会发生什么"，并不真正提交

```bash
git commit --short
```

### 21. --branch

**配置**: 在简短格式的试运行输出中显示分支信息

**说明**: 此选项与 `--short`/`--dry-run` 配合使用，在输出中额外显示当前分支及其跟踪信息

```bash
git commit --dry-run --short --branch
```

### 22. -o, --only

**配置**: 只提交命令行中指定的路径

**说明**: 此选项只提交命令行指定路径的工作区内容，忽略暂存区中其他路径的暂存内容（这也是命令行给定路径时的默认模式）

```bash
git commit -o src/main.js -m "Fix main.js only"
```

### 23. --cleanup=<mode>

**配置**: 指定提交消息的清理模式

**说明**: 此选项决定提交前如何清理提交消息，`<mode>` 可取 strip、whitespace、verbatim、scissors、default

```bash
git commit --cleanup=verbatim -F commit-message.txt
```

### 24. -t <file>, --template=<file>

**配置**: 使用指定的提交消息模板启动编辑器

**说明**: 此选项在打开编辑器时以 `<file>` 的内容作为提交消息的初始模板，常用于团队提交规范（也可通过 `commit.template` 配置默认模板）

```bash
git commit -t ~/.git-commit-template.txt
```

### 25. --trailer <key=value>

**配置**: 添加一个提交预告

**说明**: 此选项用于添加一个提交预告。提交预告是添加到提交信息末尾的键值对。

```bash
git commit --trailer Issue=123 -m "Fix bug"
```

## 一些额外的技巧

- 使用 `git config` 命令配置默认的提交选项
- 使用 `git commit -h` 命令查看所有可用选项
- 使用 `git commit --help` 命令查看特定选项的帮助信息
- SSH 密钥签名需要先配置 `gpg.format=ssh`，再用 `-S`/`--gpg-sign` 提交（参见本系列《签名与安全》一篇）

