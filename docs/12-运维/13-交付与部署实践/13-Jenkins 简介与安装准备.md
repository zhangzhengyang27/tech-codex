---
title: Jenkins 简介与安装准备
description: Jenkins 简介与安装准备：核心特点、直接安装与 Docker 安装对比、系统要求（当前 LTS 2.568.x 要求 Java 17+）、apt/Docker/Homebrew 安装命令与插件体系。
keywords: [Jenkins, LTS, 安装, 插件系统, OpenJDK 17]
category: 部署与运维实践
tags: [DevOps, CI/CD]
---

# Jenkins 简介与安装准备

## 概述

Jenkins 是一个开源的自动化服务器，用于自动化构建、测试和部署软件，是目前最流行的 CI/CD 工具之一。本文介绍 Jenkins 核心特点、安装方式对比、系统要求及插件体系。

## 学习目标

1. 了解 Jenkins 六大特点及适用场景
2. 掌握直接安装与 Docker 安装的对比与选择
3. 熟悉 Jenkins 插件系统及前端项目必备插件

---

## 一、Jenkins 核心特点

| 特点 | 说明 | 价值 |
|------|------|------|
| 持续集成 | 支持频繁的代码集成和自动构建 | 尽早发现集成问题 |
| 持续交付 | 自动化部署到各种环境 | 快速交付价值 |
| 安装配置简单 | 提供 war 包、Docker 等多种安装方式 | 快速上手 |
| 插件丰富 | 拥有 2000+ 插件，覆盖几乎所有 CI/CD 工具 | 高度可定制 |
| 可扩展 | 可基于插件体系扩展功能 | 满足定制需求 |
| 分布式 | 支持在多台机器上分配工作负载 | 提升构建效率 |

国内不少 CI/CD 云平台（如腾讯 CODING）也基于或兼容 Jenkins 生态。

---

## 二、安装方式对比

| 维度 | 直接安装 | Docker 安装 |
|------|---------|------------|
| 前提条件 | 需要安装 JDK | 需要安装 Docker |
| 资源占用 | 较少 | Docker 占用额外资源 |
| 安装复杂度 | 中等 | 简单 |
| 环境隔离 | 无隔离 | 容器隔离 |
| 可移植性 | 中等 | 高 |
| 适用场景 | 生产环境、资源有限 | 开发测试、快速部署 |

选择建议：
- 老旧系统/资源有限/生产环境 → 直接安装
- 现代 Linux/Mac/快速部署/环境隔离 → Docker 安装

---

## 三、系统要求

### 硬件要求

| 类型 | 最低要求 | 推荐配置 |
|------|---------|---------|
| 内存 | 512 MB | 2 GB+ |
| 硬盘 | 10 GB | 50 GB+ |
| CPU | 1 核 | 2 核+ |

### 软件要求

| 安装方式 | 软件依赖 | 检查命令 |
|---------|---------|---------|
| 直接安装 | JDK 17 或 21（当前 LTS 2.568.x 最低要求 Java 17） | `java -version` |
| Docker 安装 | Docker 19.03+ | `docker --version` |

---

## 四、安装方法概览

### war 包运行（测试用）

```bash
java -jar jenkins.war
java -jar jenkins.war --httpPort=8081
```

### Linux apt-get 安装（推荐）

```bash
# 添加仓库密钥
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null

# 添加仓库
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

# 安装并启动
sudo apt-get update
sudo apt-get install jenkins -y
sudo systemctl start jenkins
sudo systemctl enable jenkins
```

### Docker 安装

```bash
docker pull jenkins/jenkins:lts
docker run -d \
  --name jenkins \
  -p 8080:8080 \
  -p 50000:50000 \
  -v /var/jenkins_home:/var/jenkins_home \
  jenkins/jenkins:lts
```

### macOS Homebrew

```bash
brew install jenkins-lts
brew services start jenkins-lts
```

---

## 五、初始化配置流程

```mermaid
graph LR
    A[访问 localhost:8080] --> B[输入初始密码]
    B --> C[安装插件]
    C --> D[创建管理员用户]
    D --> E[配置 Jenkins URL]
    E --> F[开始使用]
```

获取初始密码：

```bash
# 直接安装
cat /var/lib/jenkins/secrets/initialAdminPassword

# Docker 安装
docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword
```

---

## 六、插件系统

### 前端项目必备插件

| 插件 | 用途 | 优先级 |
|------|------|--------|
| NodeJS Plugin | Node.js 环境 | 必须 |
| Git Plugin | Git 版本控制 | 必须 |
| Pipeline | Pipeline 流水线 | 必须 |
| Docker | Docker 部署 | 重要 |
| Publish Over SSH | 远程部署 | 重要 |
| Email Extension | 邮件通知 | 可选 |

### 插件安装方式

| 方式 | 适用场景 |
|------|---------|
| GUI 安装 | 系统管理 → 插件管理 → 可选插件 |
| CLI 安装 | `java -jar jenkins-cli.jar install-plugin <name>` |
| 离线安装 | 下载 .hpi 文件 → 插件管理 → 高级 → 上传 |

---

## 七、目录结构

```
/var/lib/jenkins/
├── config.xml              # 主配置文件
├── credentials.xml         # 凭证配置
├── jobs/                   # 任务目录
│   └── <job-name>/
│       ├── config.xml      # 任务配置
│       └── builds/         # 构建历史
├── plugins/                # 插件目录
├── secrets/                # 密钥目录
├── users/                  # 用户目录
└── workspace/              # 工作空间
```

---

## 常见问题

| 问题 | 解决方案 |
|------|---------|
| 无法访问 Jenkins | 检查端口、开放防火墙 |
| 忘记管理员密码 | 修改 config.xml 关闭安全验证 |
| 插件安装失败 | 使用离线安装或更新 Jenkins |
| 构建卡住 | 安装 Build Timeout 插件 |
| 磁盘空间不足 | 定期清理旧构建 |

---

## 延伸阅读

- [Jenkins 中文官网](https://www.jenkins.io/zh/)
- [Jenkins 插件市场](https://plugins.jenkins.io/)
- [Pipeline 语法参考](https://www.jenkins.io/zh/doc/book/pipeline/)

---

