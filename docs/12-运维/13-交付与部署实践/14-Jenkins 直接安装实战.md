---
title: Jenkins 直接安装实战
description: 在 Ubuntu/Debian 上通过 apt 安装 Jenkins 实战：仓库密钥配置、OpenJDK 21 与 Jenkins LTS 安装、systemctl 服务管理、8080 端口冲突排查与 systemctl edit 修改端口。
keywords: [Jenkins, apt 安装, Ubuntu, systemctl, 端口冲突]
category: 部署与运维实践
tags: [DevOps, CI/CD]
---

# Jenkins 直接安装实战

## 概述

本文详解在 Ubuntu/Debian 系统上通过 apt-get 安装 Jenkins 的完整流程，包括环境准备、服务管理、端口冲突排查与修改、初始化配置及常见问题处理。

## 学习目标

1. 掌握 Ubuntu/Debian 上 apt-get 安装 Jenkins 的完整步骤
2. 熟练使用 systemctl 管理 Jenkins 服务
3. 掌握端口冲突排查与修改方法

---

## 一、安装前准备

### 环境要求

| 软件 | 要求 | 检查命令 |
|------|------|---------|
| JDK | Java 17 或 21（当前 LTS 2.568.x 最低要求 Java 17） | `java -version` |
| 内存 | 512MB+ | `free -h` |
| 磁盘 | 10GB+ | `df -h` |

### 版本选择

| 版本类型 | 说明 | 推荐 |
|---------|------|------|
| LTS（长期支持版） | 稳定，每 12 周发布 | 生产环境推荐 |
| Weekly（每周版） | 最新功能，每周发布 | 测试环境可选 |

---

## 二、完整安装步骤

```bash
# 1. 添加 Jenkins 仓库密钥
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc > /dev/null

# 2. 添加 Jenkins 仓库
echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
  /etc/apt/sources.list.d/jenkins.list > /dev/null

# 3. 更新软件包列表
sudo apt-get update

# 4. 安装 JDK 21（Jenkins 2.5xx LTS 要求 Java 17 及以上）
sudo apt-get install openjdk-21-jdk -y

# 5. 安装 Jenkins
sudo apt-get install jenkins -y
```

安装后自动创建系统服务并启动：

```bash
sudo systemctl status jenkins
```

### 重要目录

| 目录 | 说明 |
|------|------|
| `/var/lib/jenkins` | Jenkins 主目录 |
| `/var/log/jenkins` | 日志目录 |
| `/etc/default/jenkins` | 配置文件 |

---

## 三、服务管理命令

| 操作 | 命令 |
|------|------|
| 启动 | `sudo systemctl start jenkins` |
| 停止 | `sudo systemctl stop jenkins` |
| 重启 | `sudo systemctl restart jenkins` |
| 查看状态 | `sudo systemctl status jenkins` |
| 开机自启 | `sudo systemctl enable jenkins` |
| 取消自启 | `sudo systemctl disable jenkins` |
| 查看日志 | `sudo journalctl -u jenkins -f` |

---

## 四、端口冲突排查

### 错误现象

```
java.io.IOException: Failed to bind to 0.0.0.0/0.0.0.0:8080
Caused by: java.net.BindException: Address already in use
```

### 排查方法

```bash
# 方法一：netstat
sudo netstat -tulpn | grep 8080

# 方法二：lsof
sudo lsof -i :8080

# 方法三：ss
sudo ss -tulpn | grep 8080
```

### 解决方案

| 方案 | 操作 | 适用场景 |
|------|------|---------|
| 停止占用服务 | `sudo systemctl stop <service>` | 占用服务不重要 |
| 修改 Jenkins 端口 | 见下节 | 需保留占用服务 |

---

## 五、修改 Jenkins 端口

### 推荐方法：systemctl edit

```bash
# 1. 创建覆盖配置
sudo systemctl edit jenkins
```

在编辑器中添加：

```ini
[Service]
Environment="JENKINS_PORT=8081"
```

```bash
# 2. 重载配置
sudo systemctl daemon-reload

# 3. 重启 Jenkins
sudo systemctl restart jenkins

# 4. 验证端口
sudo netstat -tulpn | grep 8081
```

### 方法对比

| 方法 | 配置文件 | 可靠性 |
|------|---------|--------|
| 修改 `/etc/default/jenkins` | 直接修改 | 部分系统不生效 |
| `systemctl edit`（推荐） | override.conf | 可靠 |

---

## 六、初始化配置

### 获取初始密码

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

### 初始化流程

```mermaid
graph LR
    A[输入初始密码] --> B[安装推荐插件]
    B --> C[创建管理员用户]
    C --> D[配置 Jenkins URL]
    D --> E[开始使用]
```

---

## 七、安全配置建议

```bash
# 防火墙开放端口
sudo ufw allow 8081/tcp

# 定期备份
sudo tar -czf jenkins-backup-$(date +%Y%m%d).tar.gz /var/lib/jenkins
```

生产环境建议：
- 修改默认端口 8080，避免被扫描攻击
- 配置 HTTPS 反向代理
- 定期备份主目录

---

## 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 端口被占用 | 8080 被其他服务占用 | 修改 Jenkins 端口 |
| JDK 未安装 | 缺少 Java 环境 | 安装 JDK 17/21 |
| 权限不足 | 目录权限问题 | 检查 `/var/lib/jenkins` 权限 |
| 防火墙阻止 | 端口未开放 | `sudo ufw allow 8081` |
| 密码文件不存在 | 首次启动未完成 | 重启 Jenkins |

---

## 延伸阅读

- [Jenkins Linux 安装指南](https://www.jenkins.io/zh/doc/book/installing/linux/)
- [Jenkins 系统属性配置](https://www.jenkins.io/zh/doc/book/managing/system-properties/)

---

