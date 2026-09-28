---
title: Docker 图形化管理工具
description: Portainer 与 lazydocker 两大图形化管理工具对比、部署步骤、容器/镜像/网络管理功能、数据卷备份恢复与生产选型建议
keywords: [Portainer, lazydocker, Docker, 容器管理, 可视化]
category: Docker 容器
tags: [DevOps, Docker, 运维工具]
---

# Docker 图形化管理工具

## 0. 引言

命令行（CLI）是 Docker 的"母语"，但在多容器、多主机场景下，纯命令行管理效率低下且不直观：谁在占用资源、哪个容器反复重启、镜像堆积了多少垃圾，一眼看不出来。**图形化管理工具把 Docker 的状态与操作可视化**，让排查与运维从"背命令"变成"看面板"。本章介绍两大主流方案：面向团队的 Web 管理平台 Portainer 与面向终端极客的 TUI 工具 lazydocker。

---

## 1. Portainer：Web 图形化管理平台

### 1.1 为什么选 Portainer

- **Web 访问**：浏览器即用，团队成员共享管理入口；
- **兼容性好**：可管理 Docker 引擎、Swarm 集群，甚至对接 Kubernetes；
- **权限体系**：支持用户/团队/角色，适合多人协作环境；
- **界面友好**：容器启停、镜像管理、日志查看、网络与卷管理全部可视化。

### 1.2 快速部署

```bash
docker volume create portainer_data

# -p 9443:9443：HTTPS 管理端口
docker run -d \
  --name portainer \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  --restart=always \
  portainer/portainer-ce:latest
```

两个关键挂载：

| 挂载 | 作用 |
|------|------|
| `/var/run/docker.sock` | 让 Portainer 通过 Docker API 管理宿主机引擎 |
| `portainer_data:/data` | 持久化 Portainer 自身配置与用户数据 |

部署完成后浏览器访问 `https://<服务器IP>:9443`，首次访问设置管理员密码即可使用。

### 1.3 核心功能面板

| 面板 | 功能 |
|------|------|
| Dashboard | 引擎概览：容器/镜像/卷/网络数量与资源占用 |
| Containers | 容器启停、重启、删除、日志与终端 |
| Images | 镜像浏览、拉取、删除与清理 |
| Networks / Volumes | 网络与数据卷的可视化管理 |
| Stacks | 基于 Compose 文件一键部署应用栈 |

---

## 2. lazydocker：终端下的 Docker UI

### 2.1 简介与安装

lazydocker 是运行在终端里的 TUI 工具，风格类似 lazygit，适合习惯终端的开发者：

```bash
# macOS
brew install jesseduffield/lazydocker/lazydocker

# Linux（下载二进制）
curl -sSL https://raw.githubusercontent.com/jesseduffield/lazydocker/master/scripts/install_update_linux.sh | bash
```

### 2.2 常用快捷键

| 按键 | 功能 |
|------|------|
| 方向键 / Tab | 在容器、镜像、日志面板间切换 |
| `e` | 进入容器执行 Shell |
| `l` | 查看容器日志 |
| `r` | 重启容器 |
| `s` | 停止容器 |
| `d` | 删除容器/镜像 |
| `[` / `]` | 上一屏 / 下一屏日志 |

lazydocker 的优势在于**轻量零依赖**：不占用端口、不引入 Web 服务，随开随用，特别适合服务器终端会话。

---

## 3. 选型对比

| 维度 | Portainer | lazydocker |
|------|-----------|------------|
| 形态 | Web 管理平台 | 终端 TUI |
| 部署成本 | 一个容器 + 两个挂载 | 单一二进制 |
| 多人协作 | 支持（账号/角色） | 不支持 |
| 管理边界 | 引擎/Swarm/K8s | 单机 Docker |
| 适合场景 | 团队共享、生产环境 | 个人开发、SSH 终端 |

> 实践建议：**本地开发用 lazydocker，团队环境部署 Portainer**，两者互补而不冲突。

---

## 4. 管理工具的备份与恢复

### 4.1 备份 Portainer 数据卷

```bash
# 备份
docker run --rm -v portainer_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/portainer_backup.tar.gz -C /data .

# 恢复
docker run --rm -v portainer_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/portainer_backup.tar.gz -C /data
```

### 4.2 运维注意事项

- **docker.sock 权限**：挂载 docker.sock 即获得宿主机 Docker 完全控制权，Portainer 部署在受信网络，避免暴露公网；
- **端口安全**：9443 是 HTTPS 端口，不要图省事改用 9000（HTTP），生产务必配置反向代理 + TLS；
- **版本升级**：升级前先备份 `portainer_data` 卷，Portainer 大版本升级偶有不兼容；
- **资源占用**：Portainer 本体很轻（数十 MB 内存），但管理多集群时注意其自身日志增长。

---

## 5. 小结

- **Portainer**：Web 化、多用户、可管 Swarm/K8s，一个容器即可部署，是团队运维首选；
- **lazydocker**：终端 TUI、零依赖、快捷键流畅，是个人开发的效率利器；
- **选型原则**：按"个人/团队"与"单机/集群"两个维度决定，两者可共存；
- **运维要点**：数据卷定期备份、docker.sock 权限最小化、管理端口避免裸奔公网。

下一章讲解 Docker Hub 与镜像加速配置——如何识别官方镜像、规范镜像标签，并配置国内加速源。