---
title: Harbor 企业级私有仓库
description: 使用 CNCF 毕业项目 Harbor 搭建企业级镜像仓库：与 Docker Registry 对比、Docker Compose 部署（截至 2026-09 最新为 v2.15.x）、项目管理与角色权限、镜像推拉及垃圾回收。
keywords: [Harbor, 镜像仓库, Docker Compose, RBAC, 垃圾回收]
category: 部署与运维实践
tags: [DevOps, CI/CD]
---

# Harbor 企业级私有仓库

## 概述

Harbor 是 CNCF 毕业项目，提供企业级容器镜像仓库能力，内置 RBAC 权限、Web UI、漏洞扫描、镜像签名和垃圾回收。本文详解 Harbor 与 Docker Registry 的对比、部署流程及基本使用。

## 学习目标

1. 理解 Harbor 相比 Docker Registry 的企业级优势
2. 掌握 Docker Compose 部署 Harbor 的流程
3. 熟悉 Harbor 项目管理和镜像操作

---

## 一、Harbor vs Docker Registry

| 特性 | Docker Registry | Harbor |
|------|----------------|--------|
| 权限控制 | 需额外配置 Nginx | 内置 RBAC |
| Web 界面 | 无 | 完整 GUI |
| 镜像扫描 | 无 | 漏洞扫描 |
| 镜像签名 | 无 | Notary 支持 |
| 垃圾回收 | 无 | 自动 GC |
| 镜像复制 | 无 | 多仓库同步 |
| LDAP 集成 | 无 | 支持 |
| K8s 集成 | 手动配置 | Helm Chart |
| 部署难度 | 简单 | 中等 |

---

## 二、安装部署

### 安装方式

| 方式 | 适用场景 |
|------|---------|
| Docker Compose | 单机部署、测试和小规模 |
| Helm Chart | K8s 集群生产环境 |
| 离线安装包 | 内网无网络环境 |

### Docker Compose 安装

```bash
# 下载安装包
# 版本以 GitHub Releases 页面为准，截至 2026-09 最新为 v2.15.2
wget https://github.com/goharbor/harbor/releases/download/v2.15.2/harbor-online-installer-v2.15.2.tgz
tar xvf harbor-online-installer-v2.15.2.tgz
cd harbor

# 修改配置
cp harbor.yml.tmpl harbor.yml
vi harbor.yml
```

### 关键配置

| 配置项 | 说明 | 示例 |
|--------|------|------|
| hostname | 访问地址 | `192.168.1.100` |
| harbor_admin_password | 管理员密码 | `Harbor12345` |
| http.port | HTTP 端口 | `80` |
| data_volume | 数据存储路径 | `/data/harbor` |

### 启动

```bash
# 执行安装脚本
./install.sh

# 或使用 Docker Compose
docker compose up -d

# 查看状态
docker compose ps
```

### 访问

```
浏览器: http://192.168.1.100
用户名: admin
密码: Harbor12345
```

---

## 三、核心功能

### 项目管理

| 功能 | 说明 |
|------|------|
| 创建项目 | 公开/私有项目 |
| 成员管理 | 添加用户并分配角色 |
| Webhooks | 镜像推送时触发通知 |
| 机器人账户 | CI/CD 自动化访问 |

### 角色权限

| 角色 | 权限 |
|------|------|
| 管理员 | 全部权限 |
| 开发者 | 推送/拉取镜像 |
| 访客 | 只读，可拉取、重新打标镜像 |
| 维护人员 | 扫描、复制、删除镜像等运维操作 |

---

## 四、镜像操作

### 推送镜像

```bash
# 登录 Harbor
docker login 192.168.1.100

# 打标签（格式：harbor地址/项目名/镜像名:标签）
docker tag 11-Nginx基础概述:latest 192.168.1.100/myproject/11-Nginx基础概述:v1.0

# 推送
docker push 192.168.1.100/myproject/11-Nginx基础概述:v1.0
```

### 拉取镜像

```bash
docker pull 192.168.1.100/myproject/11-Nginx基础概述:v1.0
```

### 配置非 HTTPS

```json
// /etc/docker/daemon.json
{
  "insecure-registries": ["192.168.1.100"]
}
```

---

## 五、垃圾回收

Harbor 删除镜像后，底层 blob 数据不会立即释放，需要手动触发 GC：

```
管理 → 垃圾回收 → 立即回收
```

建议配置定时 GC 任务，避免磁盘空间持续增长。

---

## 常见问题

| 问题 | 解决方案 |
|------|---------|
| 安装失败 | 检查端口占用（80/443/5000） |
| 登录失败 | 确认 admin 密码和 hostname 配置 |
| push 被拒绝 | 检查项目是否存在、用户是否有权限 |
| HTTP 访问报错 | 配置 `insecure-registries` |
| 磁盘空间不足 | 执行垃圾回收 |

---

## 延伸阅读

- [Harbor 官方文档](https://goharbor.io/docs/)
- [Harbor GitHub](https://github.com/goharbor/harbor)

---

