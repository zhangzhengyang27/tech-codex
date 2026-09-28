---
title: Jenkins Docker 安装指南
description: 使用 Docker 安装 Jenkins：镜像选择、docker.sock 映射与 DooD 模式原理、DinD 对比、Docker Compose 编排持久化及宿主机 Docker CLI 版本冲突处理。
keywords: [Jenkins, Docker 安装, docker.sock, DooD, Docker Compose]
category: 部署与运维实践
tags: [DevOps, CI/CD]
---

# Jenkins Docker 安装指南

## 概述

本文详解使用 Docker 安装 Jenkins 的完整流程，包括镜像选择、docker.sock 映射原理、DinD vs DooD 方案对比、Docker Compose 编排及版本冲突问题处理。

## 学习目标

1. 掌握 Docker 安装 Jenkins 的标准流程
2. 理解 docker.sock 映射与 DooD 模式原理
3. 能够使用 Docker Compose 编排 Jenkins 环境

---

## 一、镜像选择

| 镜像 | 大小 | 更新频次 | 适用场景 |
|------|------|---------|---------|
| `jenkins/jenkins:lts` | ~90MB | 频繁（几天一次） | 推荐，轻量级 |
| `jenkinsci/blueocean` | ~600MB | 不频繁 | 需要 Blue Ocean 可视化 |

Blue Ocean 是 Jenkins 的 Pipeline 可视化插件，可在安装后按需添加，无需使用预装镜像。注意：Blue Ocean 已停止活跃开发，新项目建议直接使用 Jenkins 自带的 Pipeline Stage View。

---

## 二、docker.sock 与 DooD 模式

### docker.sock 原理

`/var/run/docker.sock` 是 Docker daemon 的 Unix Socket 文件，用于进程间通信。映射后容器内的 Docker Client 可直接调用宿主机 Docker Daemon。

```mermaid
graph LR
    A[Jenkins 容器] --> B[Docker Client]
    B --> C[docker.sock 映射]
    C --> D[宿主机 Docker Daemon]
    D --> E[创建构建容器]
```

### DinD vs DooD

| 对比项 | DinD（容器内 Docker） | DooD（使用宿主机 Docker） |
|--------|---------------------|-------------------------|
| 性能 | 差（多层虚拟化） | 好（直接使用宿主机） |
| 安全 | 需要 privileged 权限 | 普通权限即可 |
| 复杂度 | 高 | 低 |
| 资源占用 | 大 | 小 |
| 推荐程度 | 不推荐 | 推荐 |

---

## 三、基础安装

```bash
# 拉取镜像
docker pull jenkins/jenkins:lts

# 启动容器
docker run -d \
  --name jenkins \
  --restart=always \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  jenkins/jenkins:lts

# 查看初始密码
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

### 参数说明

| 参数 | 说明 |
|------|------|
| `-d` | 后台运行 |
| `--restart=always` | 异常退出/宿主机重启后自动启动 |
| `-p 8080:8080` | Web 界面端口 |
| `-p 50000:50000` | Agent 通信端口 |
| `-v jenkins_home:/var/jenkins_home` | 数据持久化 |

---

## 四、映射 Docker（DooD 模式）

```bash
docker run -d \
  --name jenkins \
  --restart=always \
  -p 8080:8080 \
  -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /usr/bin/docker:/usr/bin/docker \
  jenkins/jenkins:lts
```

新增映射：
- `/var/run/docker.sock` → 允许容器内调用宿主机 Docker
- `/usr/bin/docker` → 提供 docker CLI 命令

---

## 五、Docker Compose 编排

```yaml
services:
  jenkins:
    image: jenkins/jenkins:lts
    container_name: jenkins
    restart: always
    ports:
      - "8080:8080"
      - "50000:50000"
    volumes:
      - jenkins_home:/var/jenkins_home
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      - JAVA_OPTS=-Djenkins.install.runSetupWizard=true
      - TZ=Asia/Shanghai

volumes:
  jenkins_home:
```

---

## 六、版本冲突处理

### 问题描述

映射宿主机 Docker 时，容器内 Docker Client 版本可能与宿主机 Docker Daemon 版本不匹配。

### 解决方案

```bash
# 查看宿主机 Docker 版本
docker version

# 进入 Jenkins 容器查看内部版本
docker exec jenkins docker version
```

若版本冲突，将宿主机 Docker 二进制文件完整映射：

```bash
-v /usr/bin/docker:/usr/bin/docker
-v /usr/libexec/docker/cli-plugins:/usr/libexec/docker/cli-plugins
```

---

## 七、常用管理命令

```bash
# 查看容器状态
docker ps | grep jenkins

# 查看日志
docker logs -f jenkins

# 重启
docker restart jenkins

# 进入容器
docker exec -it jenkins bash

# 备份数据卷
docker run --rm -v jenkins_home:/data -v $(pwd):/backup alpine \
  tar czf /backup/jenkins-backup.tar.gz /data
```

---

## 常见问题

| 问题 | 解决方案 |
|------|---------|
| 容器启动后立即退出 | 查看 `docker logs jenkins`，检查端口冲突 |
| 权限被拒绝（docker.sock） | 将 jenkins 用户加入 docker 组 |
| 数据丢失 | 确保使用了 `-v` 数据卷映射 |
| 插件安装慢 | 配置国内镜像源 |

---

## 延伸阅读

- [Jenkins Docker 安装文档](https://www.jenkins.io/doc/book/installing/docker/)
- [Docker 官方文档 - Bind Mounts](https://docs.docker.com/storage/bind-mounts/)

---

