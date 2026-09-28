---
title: 前端私有化 NPM 仓库管理
description: 使用 Verdaccio 搭建前端私有 NPM 仓库：方案对比、安装启动、NRM 源管理、包发布与撤回、代理缓存配置及 Docker 部署。
keywords: [NPM, Verdaccio, 私有仓库, npm publish, nrm]
category: 部署与运维实践
tags: [DevOps, CI/CD]
---

# 前端私有化 NPM 仓库管理

## 概述

Verdaccio 是一个轻量级 Node.js 私有 NPM Registry，零配置启动、支持用户认证和代理缓存。本文详解 Verdaccio 的搭建、NRM 源管理工具使用、包发布流程及权限配置。

## 学习目标

1. 了解私有 NPM 仓库的需求场景和方案对比
2. 掌握 Verdaccio 的安装、配置和使用
3. 能够发布和管理内部 NPM 包

---

## 一、方案对比

| 工具 | 类型 | 特点 | 适用场景 |
|------|------|------|---------|
| Verdaccio | 轻量级 Node.js | 零配置、轻量、易用 | 纯前端项目 |
| Nexus | Java 通用 | 支持 NPM/Maven/Docker | 前后端都有 |
| CNPMJS | 淘宝系 | 功能强大 | 大型前端团队 |
| JFrog Artifactory | 大一统 | 所有类型制品 | 企业级统一管理 |

### 为什么需要私有 NPM 仓库

| 场景 | 说明 |
|------|------|
| 安全性 | 企业内部模块不希望公开发布 |
| 稳定性 | 避免公共 registry 网络问题 |
| 速度 | 内部网络访问更快 |
| 版本控制 | 精确控制内部依赖版本 |

---

## 二、Verdaccio 安装与启动

### 安装

```bash
# 全局安装
npm install -g verdaccio
# 或
pnpm add -g verdaccio

# 安装 NRM（Registry 管理工具）
npm install -g nrm
```

### 启动

```bash
verdaccio
# 默认端口: 4873
# 配置文件: ~/.config/verdaccio/config.yaml
# Web 界面: http://localhost:4873
```

---

## 三、NRM 源管理

### 常用命令

| 命令 | 说明 |
|------|------|
| `nrm ls` | 列出所有 registry |
| `nrm use <name>` | 切换 registry |
| `nrm add <name> <url>` | 添加自定义源 |
| `nrm del <name>` | 删除源 |
| `nrm test` | 测试响应时间 |

### 添加私有源

```bash
# 添加
nrm add private http://localhost:4873

# 切换
nrm use private

# 验证
nrm ls
# * private ---- http://localhost:4873/
```

---

## 四、用户管理

### 注册与登录

```bash
# 切换到私有 registry
nrm use private

# 首次使用：注册用户
npm adduser
# 输入: 用户名、密码、邮箱

# 后续使用：登录
npm login
```

### 查看当前用户

```bash
npm whoami
```

---

## 五、发布包

### 发布流程

```bash
# 1. 确保 package.json 中 name 字段正确
# 2. 确保 registry 指向私有仓库
npm config get registry
# http://localhost:4873/

# 3. 发布
npm publish

# 4. 查看已发布的包
npm info <package-name>
```

### 版本管理

```bash
# 升级补丁版本 (1.0.0 → 1.0.1)
npm version patch

# 升级次版本 (1.0.0 → 1.1.0)
npm version minor

# 升级主版本 (1.0.0 → 2.0.0)
npm version major

# 发布新版本
npm publish
```

### 撤回发布

```bash
# 撤回某个版本
npm unpublish <package-name>@<version>

# 撤回整个包（24小时内）
npm unpublish <package-name> --force
```

---

## 六、代理缓存配置

Verdaccio 默认代理 npmjs，本地没有的包会自动从上游下载并缓存：

```yaml
# ~/.config/verdaccio/config.yaml
uplinks:
  npmjs:
    url: https://registry.npmmirror.com/

packages:
  '@mycompany/*':
    access: $authenticated
    publish: $authenticated
  '**':
    access: $all
    publish: $authenticated
    proxy: npmjs
```

### 配置说明

| 配置 | 说明 |
|------|------|
| `@mycompany/*` | 内部作用域包，仅认证用户可访问和发布 |
| `**` | 其他所有包，任何人可访问，认证用户可发布 |
| `proxy: npmjs` | 本地没有时从上游代理下载 |

---

## 七、Docker 部署 Verdaccio

```bash
docker run -d \
  --name verdaccio \
  --restart=always \
  -p 4873:4873 \
  -v verdaccio-storage:/verdaccio/storage \
  -v verdaccio-conf:/verdaccio/conf \
  verdaccio/verdaccio
```

---

## 常见问题

| 问题 | 解决方案 |
|------|---------|
| publish 报 403 | 确认已登录且有发布权限 |
| 包名冲突 | 使用作用域 `@company/pkg` |
| 安装私有包失败 | 确认 registry 指向正确 |
| 缓存未生效 | 检查 uplinks 配置和网络 |

---

## 延伸阅读

- [Verdaccio 官方文档](https://verdaccio.org/)
- [NRM GitHub](https://github.com/Pana/nrm)

---

