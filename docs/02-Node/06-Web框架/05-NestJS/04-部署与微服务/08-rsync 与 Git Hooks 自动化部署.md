---
title: rsync 与 Git Hooks 自动化部署
description: "rsync（remote sync）增量同步命令详解，配合 Git Hooks（Husky 管理 pre-commit）在提交时自动执行 deploy.sh 构建并用 rsync 上传服务器，含 SSH 免密登录、多环境部署与回滚方案。"
keywords: [rsync, Git Hooks, Husky, SSH, 自动化部署, deploy.sh]
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# rsync 与 Git Hooks 自动化部署

> 学习目标：掌握 rsync 文件同步、Git Hooks 自动化、Husky 工具使用、SSH 免密登录、自动化部署脚本编写。

## 一、自动化部署方案对比

### 1.1 个人开发者 vs 团队部署需求

```
├── 团队部署（CI/CD）
│   ├── GitHub Actions / GitLab CI
│   ├── 自动化流水线、复杂权限管理、多环境部署
│   └── 适用：团队协作、企业项目
│
└── 个人部署（Git Hooks）
    ├── 本地脚本自动化、无需第三方服务、代码不外泄
    ├── 快速迭代部署
    └── 适用：个人项目、小型站点
```

**rsync + Git Hooks 方案优势**：Git commit 自动触发、无需手动上传；代码无需上传第三方平台、SSH 加密传输；增量同步、压缩传输速度快；无需 CI/CD 服务、配置简单。

## 二、rsync 命令详解

**rsync**（remote sync）是一个高效的文件同步和传输工具。核心特性：增量同步（只传输变化文件，算法：滚动校验和）、保持文件属性（-p 权限、-t 时间戳）、压缩传输（-z）、安全传输（支持 SSH）、灵活过滤（--exclude/--include/--delete）。

### 2.1 rsync 安装

```bash
# macOS（默认自带但版本较老，推荐 brew 安装）
brew install rsync

# Ubuntu/Debian
sudo apt update && sudo apt install rsync -y

# CentOS/RHEL
sudo yum install rsync -y
```

Windows 解决方案：WSL2（推荐）、虚拟机、云服务器。

### 2.2 rsync 基础语法

```bash
# 基础语法
rsync [选项] 源路径 目标路径

# 本地同步
rsync -av /source/ /destination/

# 本地 → 远程（上传）
rsync -avz -e ssh /local/path/ user@remote:/remote/path/

# 远程 → 本地（下载）
rsync -avz -e ssh user@remote:/remote/path/ /local/path/
```

### 2.3 rsync 常用参数详解

| 参数 | 说明 | 示例 |
|------|------|------|
| `-a` | 归档模式（保留权限、时间戳等） | `rsync -a src/ dst/` |
| `-v` | 显示详细信息 | `rsync -av src/ dst/` |
| `-z` | 压缩传输 | `rsync -az src/ dst/` |
| `-e` | 指定远程 shell | `rsync -e ssh src/ user@host:/dst/` |
| `--delete` | 删除目标多余文件 | `rsync -av --delete src/ dst/` |
| `--exclude` | 排除文件 | `rsync -av --exclude '*.log' src/ dst/` |
| `--include` | 包含文件 | `rsync -av --include '*.js' src/ dst/` |
| `--dry-run` | 干运行（测试不实际执行） | `rsync -av --dry-run ./dist/ user@remote:/path/` |

### 2.4 rsync 实战示例

```bash
# 上传到远程服务器
rsync -avz \
  -e 'ssh -p 22' \
  --delete \
  ./dist/ \
  root@192.168.31.77:/home/website/project/

# 使用 SSH Config 别名（配置了 ~/.ssh/config 后）
rsync -avz --delete ./dist/ ubuntu:/var/www/project/

# 排除特定文件
rsync -avz \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '*.log' \
  ./project/ \
  user@remote:/var/www/project/
```

> 注意：源路径末尾的 `/` 表示同步目录内容（不包括目录本身）。

## 三、Git Hooks 与 Husky

### 3.1 Git Hooks 简介

Git Hooks 是 Git 提供的钩子机制，在特定事件触发时执行脚本，位置在 `.git/hooks/` 目录。常用 Hooks：pre-commit（提交前执行）、pre-push（推送前执行）、post-merge（合并后执行）、commit-msg（提交信息验证）。

**问题**：`.git/hooks/` 不纳入版本控制，团队共享困难、手动配置繁琐。

### 3.2 Husky 工具

**Husky** 是现代化的 Git Hooks 管理工具，配置纳入 Git（团队共享、一致性保证）、npm install 自动设置（无需手动创建钩子）、支持跨平台。

### 3.3 Husky 安装与配置

```bash
# 第一步：初始化/克隆 Git 仓库
git init

# 第二步：安装 Husky
npm install --save-dev husky   # 或 pnpm add -D husky

# 第三步：初始化 Husky
npx husky install   # 创建 .husky 目录

# 第四步：配置 package.json（prepare 脚本在 npm install 后自动执行）
# "scripts": { "prepare": "husky install" }

# 第五步：创建 Git Hook
npx husky add .husky/pre-commit "npm test"
# 或 echo "npm test" > .husky/pre-commit
```

**常用 Hooks 配置**：

```bash
npx husky add .husky/pre-commit "npm run lint"
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit "$1"'
npx husky add .husky/pre-push "npm run test"
npx husky add .husky/pre-commit "npm run lint && npm run test"
```

## 四、自动化部署脚本编写

### 4.1 完整部署流程

```
自动化部署流程：
├── 第一步：功能开发（编写代码、本地测试）
├── 第二步：Git 提交（git add、git commit，触发 pre-commit hook）
├── 第三步：自动构建（Husky 执行 deploy.sh、npm run build、生成 dist）
├── 第四步：自动上传（rsync 同步文件、增量传输、压缩传输）
└── 第五步：部署完成（服务器文件更新、站点自动更新）
```

### 4.2 deploy.sh 脚本详解

```bash
# 创建脚本文件并赋予执行权限
touch deploy.sh && chmod +x deploy.sh
```

**完整脚本内容**：

```bash
#!/bin/bash

# ==================== 自动化部署脚本 ====================

# 颜色输出
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置变量（根据实际情况修改）
REMOTE_HOST="ubuntu"              # 远程服务器别名（~/.ssh/config）
REMOTE_USER="root"                # 远程用户
REMOTE_PATH="/var/www/project"    # 远程部署路径
LOCAL_BUILD_DIR="./dist"          # 本地构建产物目录
SSH_PORT="22"                     # SSH 端口

# ==================== 第一步：构建项目 ====================
echo -e "${BLUE}[1/3] 开始构建项目...${NC}"
npm run build

# 检查构建是否成功
if [ $? -ne 0 ]; then
    echo -e "${RED}构建失败！${NC}"
    exit 1
fi

echo -e "${GREEN} 构建完成${NC}"

# ==================== 第二步：同步文件到服务器 ====================
echo -e "${BLUE}[2/3] 开始同步文件到服务器...${NC}"

rsync -avz \
  --delete \
  -e "ssh -p ${SSH_PORT}" \
  ${LOCAL_BUILD_DIR}/ \
  ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/

# 检查同步是否成功
if [ $? -ne 0 ]; then
    echo -e "${RED}文件同步失败！${NC}"
    exit 1
fi

echo -e "${GREEN} 文件同步完成${NC}"

# ==================== 第三步：执行远程命令（可选） ====================
echo -e "${BLUE}[3/3] 执行远程命令...${NC}"

ssh ${REMOTE_USER}@${REMOTE_HOST} << 'EOF'
  # 重启 Nginx（如果需要）
  # sudo systemctl restart 11-Nginx基础概述
  # 设置文件权限
  # chown -R www-data:www-data /var/www/project
  echo "远程命令执行完成"
EOF

echo -e "${GREEN} 部署完成！${NC}"
```

**脚本关键点**：`#!/bin/bash` Shebang 必须在第一行；`npm run build` 确保 package.json 中有 build 脚本；`rsync -avz --delete` 的 `--delete` 会删除服务器上多余文件；`${LOCAL_BUILD_DIR}/` 源路径末尾的 `/` 表示同步目录内容（不包括目录本身）。

### 4.3 配置 Husky 触发脚本

**方法一：直接执行脚本**：

```bash
# .husky/pre-commit
./deploy.sh
```

**方法二：获取当前目录（推荐）**：

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# 获取项目根目录
PROJECT_ROOT=$(git rev-parse --show-toplevel)

# 执行部署脚本
${PROJECT_ROOT}/deploy.sh
```

**方法三：添加条件判断（只在 main 分支部署）**：

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

current_branch=$(git symbolic-ref --short HEAD)

if [ "$current_branch" = "main" ]; then
  echo "部署到生产环境..."
  ./deploy.sh
else
  echo "当前分支：$current_branch，跳过部署"
fi
```

## 五、SSH 免密登录配置

### 5.1 为什么要 SSH 免密登录？

每次部署需要输入密码既繁琐又无法让脚本自动执行。SSH 密钥认证：一次配置永久使用、脚本自动执行、安全性高（密钥比密码更安全）。

### 5.2 SSH 密钥生成

```bash
# 生成 SSH 密钥对（推荐 ed25519）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 或使用 RSA 算法（兼容性更好）
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# -t: 指定密钥类型；-C: 添加注释（通常是邮箱）；-b: 指定密钥长度（仅 RSA）
```

### 5.3 上传公钥到服务器

**方法一：使用 ssh-copy-id（推荐）**：

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@192.168.31.77
```

**方法二：手动上传**：

```bash
cat ~/.ssh/id_ed25519.pub   # 查看本地公钥
ssh user@remote_host        # 登录远程服务器
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIB... your_email@example.com" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```

### 5.4 配置 SSH Config

```bash
vim ~/.ssh/config
```

```bash
# ~/.ssh/config
# 服务器别名配置
Host ubuntu
    HostName 192.168.31.77        # 服务器 IP 或域名
    User root                     # 登录用户
    Port 22                       # SSH 端口
    IdentityFile ~/.ssh/id_ed25519 # 私钥路径

# 多服务器配置示例
Host production
    HostName 123.45.67.89
    User deploy
    Port 22
    IdentityFile ~/.ssh/id_rsa_production

# 通配符配置
Host *
    AddKeysToAgent yes
    UseKeychain yes               # macOS Keychain
```

配置后即可简化命令：`ssh ubuntu` 替代 `ssh root@192.168.31.77`，rsync 也可以使用别名。

### 5.5 排查 SSH 连接问题

```bash
# 检查 SSH 服务与防火墙
ssh ubuntu "systemctl status sshd"
ssh ubuntu "ufw status"

# 测试密钥权限（预期 id_ed25519 为 600、pub 为 644、config 为 600）
ls -la ~/.ssh/

# 修复权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/config
```

## 六、完整实战案例

实现一个 Vue3 项目的自动化部署：Git commit 时自动构建、自动上传到远程服务器、无需手动操作、支持 SSH 免密登录。

**项目结构**：

```
my-project/
├── .husky/
│   └── pre-commit           # Git Hook
├── dist/                    # 构建产物（.gitignore）
├── src/                     # 源代码
├── deploy.sh                # 部署脚本
├── package.json
└── .gitignore
```

**package.json**：

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "prepare": "husky install"
  },
  "devDependencies": {
    "husky": "^8.0.0",
    "vite": "^4.0.0"
  }
}
```

**deploy.sh**：

```bash
#!/bin/bash

# 配置
REMOTE_HOST="ubuntu"
REMOTE_PATH="/var/www/my-project"
BUILD_DIR="./dist"

echo "开始构建..."
npm run build
if [ $? -ne 0 ]; then echo "构建失败！"; exit 1; fi

echo "开始上传..."
rsync -avz --delete ${BUILD_DIR}/ ${REMOTE_HOST}:${REMOTE_PATH}/
if [ $? -ne 0 ]; then echo "上传失败！"; exit 1; fi

echo "部署完成！"
```

**.husky/pre-commit**：

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"
./deploy.sh
```

**部署流程演示**：

```bash
# 第一步：配置 SSH 免密登录
ssh-keygen -t ed25519 -C "your_email@example.com"
ssh-copy-id -i ~/.ssh/id_ed25519.pub root@192.168.31.77
ssh ubuntu "echo '连接成功'"

# 第二步：安装依赖并初始化
pnpm install
git init
npx husky install
npx husky add .husky/pre-commit "./deploy.sh"
chmod +x deploy.sh .husky/pre-commit

# 第三步：提交代码（触发自动部署）
git add .
git commit -m "feat: update homepage"
# 输出示例：
#  开始构建... / 构建完成 / 开始上传...
# sending incremental file list ... speedup 是 2.23
#  部署完成！ / [main abc1234] feat: update homepage

# 第四步：验证部署
curl http://192.168.31.77
```

## 七、常见问题与解决方案

| 错误信息 | 原因分析 | 解决方案 |
|---------|---------|---------|
| `rsync: command not found` | rsync 未安装 | `brew install rsync` (macOS) |
| `Permission denied (publickey)` | SSH 密钥认证失败 | 检查公钥是否上传到服务器 |
| `rsync: failed to connect` | 网络不通或端口错误 | 检查防火墙和 SSH 端口 |
| `script not executable` | 脚本无执行权限 | `chmod +x deploy.sh` |
| `.husky/pre-commit: No such file` | Husky 未初始化 | `npx husky install` |

**调试技巧**：

```bash
./deploy.sh                    # 手动执行脚本
rsync -avz --dry-run ./dist/ ubuntu:/tmp/test/   # 测试 rsync 连接
ssh -v ubuntu                  # 测试 SSH 连接
git commit --no-verify -m "test"   # 跳过 hooks
bash -x deploy.sh              # 显示每条执行的命令
```

## 八、进阶应用

### 8.1 多环境部署

```bash
#!/bin/bash

# 根据分支选择部署环境
current_branch=$(git symbolic-ref --short HEAD)

if [ "$current_branch" = "main" ]; then
  REMOTE_HOST="production"
  REMOTE_PATH="/var/www/production"
elif [ "$current_branch" = "staging" ]; then
  REMOTE_HOST="staging"
  REMOTE_PATH="/var/www/staging"
else
  echo "当前分支：$current_branch，跳过部署"
  exit 0
fi

npm run build
rsync -avz --delete ./dist/ ${REMOTE_HOST}:${REMOTE_PATH}/
```

### 8.2 部署回滚

```bash
#!/bin/bash

# 备份当前版本
BACKUP_DIR="/var/www/backups/$(date +%Y%m%d_%H%M%S)"

ssh ubuntu << EOF
  mkdir -p ${BACKUP_DIR}
  cp -r /var/www/project ${BACKUP_DIR}/
EOF

# 部署新版本
npm run build
rsync -avz --delete ./dist/ ubuntu:/var/www/project/

# 如果失败，回滚
if [ $? -ne 0 ]; then
  echo "部署失败，开始回滚..."
  ssh ubuntu "cp -r ${BACKUP_DIR}/project/* /var/www/project/"
fi
```

### 8.3 部署通知（企业微信机器人）

```bash
#!/bin/bash

deploy_success() {
  curl -X POST "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" \
    -H 'Content-Type: application/json' \
    -d '{
      "msgtype": "text",
      "text": { "content": " 部署成功\n时间: '"$(date '+%Y-%m-%d %H:%M:%S')"'" }
    }'
}

if ./deploy.sh; then
  deploy_success
else
  exit 1
fi
```

## 九、核心要点总结

1. **rsync 是高效的文件同步工具**：增量同步只传输变化文件、支持压缩传输（-z）、支持删除目标多余文件（--delete）、支持排除文件（--exclude）
2. **Husky 简化 Git Hooks 管理**：配置文件纳入版本控制、团队共享、自动初始化（npm prepare）、跨平台
3. **SSH 免密登录是自动化基础**：密钥认证比密码更安全、一次配置永久使用、SSH Config 简化连接、脚本自动执行
4. **deploy.sh 是核心部署脚本**：构建项目、同步文件、执行远程命令、错误处理
5. **个人开发者的高效方案**：无需 CI/CD 服务、代码不外泄、快速迭代部署、低成本高效

## 附录：命令速查表

### rsync 命令

```bash
rsync -av /source/ /dest/                          # 本地同步
rsync -avz -e ssh /local/ user@remote:/remote/     # 上传到服务器
rsync -avz --delete ./dist/ ubuntu:/var/www/project/  # 使用 SSH Config 别名
rsync -avz --exclude '.git' ./project/ user@remote:/path/
rsync -avz --dry-run ./dist/ user@remote:/path/    # 干运行（测试）
```

### Husky 命令

```bash
pnpm add -D husky      # 安装
npx husky install      # 初始化
npx husky add .husky/pre-commit "npm test"   # 创建 hook
```

### SSH 命令

```bash
ssh-keygen -t ed25519 -C "email@example.com"      # 生成密钥
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@host    # 上传公钥
ssh user@host "ls -la"                            # 执行远程命令
ssh ubuntu                                        # 使用别名
```

## 总结

**rsync + Git Hooks + Husky + SSH 免密登录**构成了一套适合个人开发者和小型站点的低成本自动化部署方案：代码提交即自动构建、增量同步到服务器，无需第三方 CI/CD 服务且代码不外泄。