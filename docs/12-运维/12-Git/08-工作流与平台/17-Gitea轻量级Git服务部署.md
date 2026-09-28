---
title: Gitea轻量级Git服务部署
description: 讲解 Gitea 轻量级 Git 服务的 rootless 部署：Docker Compose 配置与 UID 1000 权限设置、初始化向导、SSH 端口（SSH_PORT/SSH_LISTEN_PORT）配置、用户与仓库管理、app.ini 速查与自动备份策略
keywords: [Git, Gitea, Docker Compose, rootless, 部署]
category: Git 版本控制
tags: [DevOps, Git]
---

# Gitea轻量级Git服务部署

## 概述

Gitea 是中小团队自建 Git 服务的最优解——Go 语言开发、资源占用极低（约 50-100MB 内存）、10秒启动、功能完整。本文详解 Gitea 的 rootless 安全部署模式、Docker Compose 配置、初始化流程、SSH 端口配置、用户与仓库管理，以及自动化备份策略，帮助你在有限资源下快速搭建生产可用的代码托管平台。

## 前置知识

- Docker 与 Docker Compose 基础（参见 Docker入门）
- 开源 Git 服务选型认知（参见 13-开源Git服务对比与选型）
- Linux 文件权限基础（参见 Linux基础）

## 学习目标

- 理解 rootless 模式的安全优势与必要性
- 掌握 Gitea Docker Compose 配置及权限设置
- 完成从部署到初始化配置的全流程
- 正确配置 SSH 端口实现密钥克隆
- 建立自动化备份与恢复机制

---

## 一、Gitea核心优势

### 1.1 资源对比（Gitea vs GitLab）

| 指标 | Gitea | GitLab |
|------|-------|--------|
| 内存占用 | ~50-100MB | ~2-4GB |
| CPU 需求 | 1核即可 | 建议 2核+ |
| 磁盘空间 | ~1GB | ~10GB+ |
| 启动时间 | ~10秒 | 3-5分钟 |
| 数据库 | SQLite3 内置 | PostgreSQL |
| 适用场景 | 小团队/个人 | 中大型企业 |

> 参考：在 8GB 内存的服务器上，Gitea 的内存占用通常仅占总内存的 2% 左右（经验值，随仓库规模与并发变化）。

### 1.2 核心特点

- **极致轻量**：Go 语言开发，单二进制文件，资源占用极低
- **快速部署**：单容器启动，配置简单
- **内置数据库**：SQLite3 开箱即用，无需额外部署
- **功能完整**：仓库管理、Issue、Pull Request、Wiki、Actions（CI/CD）
- **中文友好**：官方文档有完整中文版本
- **界面清爽**：类 GitHub 风格，团队上手快

---

## 二、安装模式：Rootless vs Root

### 2.1 模式对比

| 维度 | Rootless（推荐） | Root |
|------|-----------------|------|
| 运行用户 | 容器内置普通用户（UID 1000） | root 用户 |
| 安全性 | 高，限制宿主机文件访问 | 低，容器被攻破则宿主机风险大 |
| 最佳实践 | 符合 Docker 安全规范 | 违反最小权限原则 |
| 生产推荐 | 是 | 否 |

### 2.2 为什么必须用 Rootless

Docker 虽然提供了逻辑隔离和网络隔离，但 root 模式下：
- 容器内 root 用户可直接访问映射的宿主机文件
- 一旦容器被攻破，攻击者获得宿主机 root 权限
- 违反安全领域的**最小权限原则**

Rootless 模式使用容器内普通用户运行进程，即使容器被攻破，权限也有限。

---

## 三、CPU架构与镜像选择

### 3.1 确认系统架构

```bash
uname -m
# x86_64   → Intel/AMD 64位
# aarch64  → ARM 64位（Apple Silicon、ARM服务器）
```

### 3.2 镜像标签格式

```
gitea/gitea:版本号-架构-rootless
```

| 架构 | 镜像标签 |
|------|----------|
| x86_64 | `gitea/gitea:1.20.1-rootless` |
| ARM64 | `gitea/gitea:1.20.1-rootless`（官方镜像为多架构清单，可直接拉取；Docker Hub 亦提供 `1.20.1-linux-arm64-rootless` 后缀标签） |
| 最新版 | `gitea/gitea:latest-rootless` |

> 官方镜像同时发布于 docker.gitea.com/gitea 与 Docker Hub（gitea/gitea）。务必选择带 `rootless` 后缀的镜像。Docker Hub 搜索技巧：Tags → Filter tags → 输入 "rootless"。

---

## 四、Docker Compose 配置

### 4.1 完整配置文件

```yaml
# docker-compose.yml - Gitea rootless 部署

networks:
  gitea:
    external: false

services:
  server:
    image: gitea/gitea:1.20.1-rootless
    container_name: gitea-server
    environment:
      - GITEA__database__DB_TYPE=sqlite3
      # 如需 MySQL/PostgreSQL：
      # - GITEA__database__DB_TYPE=mysql
      # - GITEA__database__HOST=db:3306
      # - GITEA__database__NAME=gitea
      # - GITEA__database__USER=gitea
      # - GITEA__database__PASSWD=gitea
    restart: always
    networks:
      - gitea
    volumes:
      - ./data:/var/lib/gitea
      - ./config:/etc/gitea
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    ports:
      - "11080:3000"   # HTTP 端口
      - "11081:22"     # SSH 端口
```

### 4.2 配置项说明

| 配置项 | 说明 |
|--------|------|
| `networks: gitea` | 内部网络隔离 |
| `./data → /var/lib/gitea` | 数据目录（仓库、数据库） |
| `./config → /etc/gitea` | 配置目录（app.ini） |
| `timezone/localtime` | 时区同步，保证日志时间正确 |
| `11080:3000` | HTTP 访问端口映射 |
| `11081:22` | SSH 克隆端口映射 |
| `GITEA__database__DB_TYPE` | 数据库类型，默认 SQLite3 |

---

## 五、部署完整流程

### 5.1 部署步骤

```bash
# 1. 创建项目目录
mkdir -p ~/gitea && cd ~/gitea

# 2. 创建 docker-compose.yml（粘贴上方配置）

# 3. 创建必要目录
mkdir -p data config

# 4. 设置目录权限（rootless 模式必需！）
# Gitea 容器内使用 UID 1000
sudo chown -R 1000:1000 data config

# 5. 启动服务
docker compose up -d

# 6. 验证运行状态
docker ps | grep gitea

# 7. 查看启动日志
docker logs -f gitea-server
# 看到 "starting new web server" 表示启动成功
```

### 5.2 常见启动问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 容器反复重启 | data/config 目录不存在或权限不足 | `mkdir -p data config && sudo chown -R 1000:1000 data config` |
| Permission denied | rootless 模式 UID 不匹配 | 确保目录属主为 UID 1000 |
| 端口被占用 | 端口冲突 | 修改 docker-compose.yml 中的端口映射 |

---

## 六、初始化配置

### 6.1 访问初始化页面

浏览器访问 `http://服务器IP:11080`，首次进入自动跳转到安装向导。

### 6.2 配置项说明

| 配置项 | 说明 | 建议 |
|--------|------|------|
| 数据库类型 | SQLite3 / MySQL / PostgreSQL | 小团队用 SQLite3 |
| 站点名称 | 显示在页面顶部 | 公司/团队名称 |
| 仓库根路径 | 代码存储位置 | 默认即可 |
| SSH 服务端口 | SSH 克隆使用的端口 | 填 `11081`（与映射一致） |
| HTTP 端口 | Web 访问端口 | 默认 3000 |
| 基础 URL | 外部访问地址 | 填实际 IP 或域名 |

### 6.3 管理员账号

在初始化页面底部设置管理员账号（用户名、邮箱、密码），点击"立即安装"完成。

---

## 七、SSH端口配置

### 7.1 配置文件位置

```bash
~/gitea/config/app.ini
```



### 7.2 SSH 配置详解

```ini
[server]
; SSH 对外暴露端口（用户克隆时看到的端口）
SSH_PORT = 11081

; SSH 容器内部监听端口（通常不变）
SSH_LISTEN_PORT = 22

; HTTP 配置
HTTP_PORT = 3000
ROOT_URL = http://192.168.1.100:11080
```

> `SSH_PORT` 是用户在 `git clone` 时看到的端口，必须与 docker-compose.yml 中的端口映射一致。

### 7.3 修改 SSH 端口

```bash
# 编辑配置
vi ~/gitea/config/app.ini
# 修改 SSH_PORT = 11081

# 重启容器生效
docker restart gitea-server
```

### 7.4 SSH 密钥配置流程

```bash
# 1. 本地生成密钥
ssh-keygen -t ed25519 -C "your@email.com"

# 2. 查看公钥
cat ~/.ssh/id_ed25519.pub

# 3. 添加到 Gitea
# 浏览器 → 右上角头像 → 设置 → SSH/GPG 密钥 → 添加密钥

# 4. 测试连接
ssh -T git@服务器IP -p 11081

# 5. 克隆仓库
git clone ssh://git@服务器IP:11081/用户名/仓库.git
```

### 7.5 SSH 安全机制

首次连接时系统会记录服务器指纹到 `~/.ssh/known_hosts`，后续连接自动验证：
- 指纹一致 → 正常连接
- 指纹不一致 → 警告可能存在中间人攻击

---

## 八、用户与仓库管理

### 8.1 用户管理

```
右上角头像 → 管理后台 → 用户账户管理 → 添加用户
```

可执行操作：创建用户、禁用账户、设为管理员、限制用户、删除用户。

### 8.2 仓库管理

**创建仓库：** 点击 "+" → 创建新仓库 → 设置名称/描述/可见性 → 选择 .gitignore 模板

**添加协作者：** 仓库 → 设置 → 协作者 → 搜索用户 → 选择权限（读/写）

### 8.3 权限对比（Gitea vs GitLab）

| 特性 | Gitea | GitLab |
|------|-------|--------|
| 权限粒度 | 较粗（读/写/管理员） | 精细（多级角色） |
| 权限范围 | 仓库级别 | 项目/组级别 |
| 保护分支 | 支持 | 支持更完善 |
| 审批流程 | 基础 PR 审批 | 完善的 MR 审批链 |
| 适用场景 | 小团队 | 大中型团队 |

---

## 九、备份与恢复

### 9.1 备份内容

| 必须备份 | 说明 |
|----------|------|
| `data/` | 仓库数据、数据库文件 |
| `config/` | 配置文件（app.ini） |
| `docker-compose.yml` | 部署配置 |

### 9.2 自动备份脚本

```bash
#!/bin/bash
# gitea-backup.sh - Gitea 自动备份脚本

BACKUP_DIR="./backup"
GITEA_DIR="$HOME/gitea"
RETENTION_DAYS=7

mkdir -p $BACKUP_DIR
BACKUP_FILE="gitea-backup-$(date +%Y%m%d-%H%M%S).tar.gz"

echo "开始备份 Gitea..."

# 停止容器确保数据一致性
cd $GITEA_DIR
docker compose down

# 创建备份
tar -czf $BACKUP_DIR/$BACKUP_FILE data/ config/ docker-compose.yml

# 重启服务
docker compose up -d

echo "备份完成：$BACKUP_DIR/$BACKUP_FILE"

# 清理旧备份
find $BACKUP_DIR -name "gitea-backup-*.tar.gz" -mtime +$RETENTION_DAYS -delete
echo "已清理 $RETENTION_DAYS 天前的旧备份"
```

### 9.3 定时备份（crontab）

```bash
crontab -e

# 每天凌晨2点执行备份
0 2 * * * /home/user/gitea/gitea-backup.sh >> /home/user/gitea/backup.log 2>&1
```

### 9.4 恢复操作

```bash
# 1. 停止服务
cd ~/gitea && docker compose down

# 2. 解压备份
tar -xzf backup/gitea-backup-YYYYMMDD-HHMMSS.tar.gz

# 3. 确认文件恢复
ls -la data/ config/

# 4. 启动服务
docker compose up -d

# 5. 浏览器验证数据完整
```

---

## 十、app.ini 配置文件速查

```ini
[server]
HTTP_PORT = 3000
ROOT_URL = http://192.168.1.100:11080
SSH_PORT = 11081
SSH_LISTEN_PORT = 22
DISABLE_SSH = false

[database]
DB_TYPE = sqlite3
PATH = data/gitea/gitea.db

[repository]
ROOT = /var/lib/gitea/data/gitea-repositories

[security]
INSTALL_LOCK = true

[service]
DISABLE_REGISTRATION = false    ; 是否禁止注册
REQUIRE_SIGNIN_VIEW = false     ; 是否需要登录才能查看

[mailer]
ENABLED = false
```

> 修改 app.ini 后需执行 `docker restart gitea-server` 生效。

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 容器反复重启 | 目录权限不足 | `chown -R 1000:1000 data config` |
| SSH 克隆失败 | SSH 端口配置错误 | 修改 app.ini 中的 `SSH_PORT` |
| Permission denied | rootless 权限问题 | 确保 UID 1000 有目录权限 |
| 无法访问 Web | 端口未开放 | 检查防火墙和端口映射 |
| 502 错误 | 服务未启动完成 | 等待几秒后刷新 |
| 内存占用偏高 | 使用了外部数据库 | 小团队改用 SQLite3 |

## 最佳实践

1. **必须用 rootless 模式**：安全性更高，符合 Docker 最佳实践
2. **架构匹配**：官方镜像为多架构清单，ARM 系统直接使用 `-rootless` 镜像即可
3. **权限先设后启动**：`mkdir` 后立即 `chown -R 1000:1000`，再 `docker compose up`
4. **SSH 端口一致**：app.ini 中 `SSH_PORT` 必须与 docker-compose 端口映射一致
5. **备份三件套**：data + config + docker-compose.yml，配合 crontab 每日自动执行
6. **小团队用 SQLite3**：零配置、零运维，性能完全够用

## 延伸阅读

- [Gitea 官方文档](https://docs.gitea.com)
- [Gitea 中文文档](https://docs.gitea.com/zh-cn/)
- [Docker 镜像](https://hub.docker.com/r/gitea/gitea)
- [配置 cheat sheet](https://docs.gitea.com/zh-cn/administration/config-cheat-sheet)
- [备份与恢复](https://docs.gitea.com/zh-cn/administration/backup-and-restore)

---


