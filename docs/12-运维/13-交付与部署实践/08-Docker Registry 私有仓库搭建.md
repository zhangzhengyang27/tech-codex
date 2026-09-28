---
title: Docker Registry 私有仓库搭建
description: 使用官方 registry:2 镜像搭建 Docker 私有仓库：容器启动与数据持久化、镜像 tag/push/pull 操作、_catalog API、insecure-registries 非 HTTPS 信任及 htpasswd 认证配置。
keywords: [Docker Registry, registry:2, 私有仓库, htpasswd, insecure-registries]
category: 部署与运维实践
tags: [DevOps, CI/CD]
---

# Docker Registry 私有仓库搭建

## 概述

Docker Registry 是 Docker 官方提供的镜像存储和分发系统。本文详解私有 Registry 的搭建流程、镜像推送/拉取操作、认证配置及镜像代理缓存。

## 学习目标

1. 理解私有 Registry 的使用场景
2. 掌握 Docker Registry 的搭建和基本操作
3. 了解认证配置和 HTTPS 安全访问

---

## 一、为什么需要私有 Registry

| 原因 | 说明 |
|------|------|
| 安全性 | 敏感镜像不应推送到公有仓库 |
| 经济性 | 云服务商个人版配额有限 |
| 网络限制 | 内网环境无法访问公网 |

### 方案对比

| 方案 | 优点 | 缺点 | 适用 |
|------|------|------|------|
| Docker Hub | 免费、官方 | 国内慢 | 开源项目 |
| 阿里云 ACR | 国内快 | 配额有限 | 中小项目 |
| 私有 Registry | 无限制、内网 | 需自己维护 | 企业推荐 |

---

## 二、搭建 Registry

### 启动容器

```bash
docker run -d \
  -p 5000:5000 \
  --name registry \
  --restart=always \
  -v registry-data:/var/lib/registry \
  registry:2
```

### 验证运行

```bash
# 查看仓库列表（初始为空）
curl http://127.0.0.1:5000/v2/_catalog
# {"repositories":[]}
```

---

## 三、基本操作

### 推送镜像

```bash
# 1. 打标签
docker tag 11-Nginx基础概述:latest 192.168.1.100:5000/11-Nginx基础概述:latest

# 2. 推送
docker push 192.168.1.100:5000/11-Nginx基础概述:latest

# 3. 验证
curl http://192.168.1.100:5000/v2/_catalog
# {"repositories":["11-Nginx基础概述"]}
```

### 拉取镜像

```bash
docker pull 192.168.1.100:5000/11-Nginx基础概述:latest
```

### API 接口

| API | 说明 |
|-----|------|
| `GET /v2/_catalog` | 所有仓库列表 |
| `GET /v2/<name>/tags/list` | 镜像标签列表 |
| `DELETE /v2/<name>/manifests/<digest>` | 删除镜像 |

---

## 四、配置非 HTTPS 访问

Docker 默认要求 HTTPS，私有 Registry 使用 HTTP 时需配置信任：

```bash
# 编辑 Docker daemon 配置
sudo vi /etc/docker/daemon.json
```

```json
{
  "insecure-registries": ["192.168.1.100:5000"]
}
```

```bash
# 重启 Docker
sudo systemctl restart docker
```

---

## 五、认证配置

### 使用 htpasswd 认证

```bash
# 创建认证文件
mkdir -p auth
docker run --rm --entrypoint htpasswd httpd:2 -Bbn user password > auth/htpasswd

# 启动带认证的 Registry
docker run -d \
  -p 5000:5000 \
  --name registry \
  --restart=always \
  -v registry-data:/var/lib/registry \
  -v $(pwd)/auth:/auth \
  -e "REGISTRY_AUTH=htpasswd" \
  -e "REGISTRY_AUTH_HTPASSWD_REALM=Registry Realm" \
  -e "REGISTRY_AUTH_HTPASSWD_PATH=/auth/htpasswd" \
  registry:2
```

### 登录使用

```bash
docker login 192.168.1.100:5000
# 输入用户名和密码
```

---

## 六、数据持久化

```bash
# 使用数据卷持久化镜像数据
docker run -d \
  -p 5000:5000 \
  --name registry \
  --restart=always \
  -v /data/registry:/var/lib/registry \
  registry:2
```

| 目录 | 说明 |
|------|------|
| `/var/lib/registry/docker/registry/v2/` | 镜像存储路径 |
| `repositories/` | 各仓库目录 |
| `blobs/` | 镜像层数据 |

---

## 常见问题

| 问题 | 解决方案 |
|------|---------|
| push 报 HTTP 错误 | 配置 `insecure-registries` |
| 认证失败 | 检查 htpasswd 文件路径和权限 |
| 磁盘空间不足 | 定期执行垃圾回收 |
| 容器重启数据丢失 | 使用 `-v` 数据卷持久化 |

---

## 延伸阅读

- [Docker Registry 官方文档](https://docs.docker.com/registry/)
- [Registry API 参考](https://docs.docker.com/registry/spec/api/)

---

