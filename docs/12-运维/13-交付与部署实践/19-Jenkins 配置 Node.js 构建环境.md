---
title: Jenkins 配置 Node.js 构建环境
description: 使用 NodeJS Plugin 为 Jenkins 配置 Node.js 构建环境：全局工具配置、npmmirror 镜像加速、多版本管理（22 LTS 与老项目 16）、Pipeline tools 用法及 .npmrc 统一配置。
keywords: [Jenkins, NodeJS Plugin, npmmirror, 多版本管理, npmrc]
category: 部署与运维实践
tags: [DevOps, CI/CD]
---

# Jenkins 配置 Node.js 构建环境

## 概述

NodeJS Plugin 为 Jenkins 提供类似 NVM 的多版本 Node.js 管理能力，支持自动安装、镜像加速和全局包预装。本文详解配置流程及多版本管理方案。

## 学习目标

1. 掌握 NodeJS Plugin 的安装与全局工具配置
2. 配置国内镜像加速 Node.js 和 NPM 包下载
3. 实现多版本 Node.js 环境管理

---

## 一、NodeJS Plugin 功能

| 功能 | 说明 |
|------|------|
| 多版本管理 | 类似 NVM，配置多个 Node.js 版本 |
| 自动安装 | 从镜像源自动下载安装 |
| 全局包管理 | 预装 cnpm、yarn、pnpm |
| 环境隔离 | 每个任务可选择不同版本 |

安装路径：`系统管理 → 插件管理 → 搜索 NodeJS → Install`

---

## 二、全局工具配置

路径：`系统管理 → 全局工具配置 → NodeJS 安装`

### 配置项说明

| 配置项 | 说明 | 示例 |
|--------|------|------|
| 别名（Name） | 环境标识名 | `node-22` |
| 安装方式 | 安装源 | Install from nodejs.org mirror |
| 镜像地址 | 下载镜像 | `https://npmmirror.com/mirrors/node` |
| 版本 | Node.js 版本号 | `22.14.0` |
| 自动安装 | 勾选 |  |
| 全局 NPM 包 | 预装包 | `pnpm yarn` |
| 工具目录 | 安装路径 | `node/22` |

### 镜像加速

| 镜像源 | 速度 | 推荐 |
|--------|------|------|
| nodejs.org（官方） | 慢 | 海外服务器 |
| npmmirror.com（淘宝） | 快 | 国内推荐 |

NPM Registry 配置：

```
https://registry.npmmirror.com
```

---

## 三、多版本配置示例

### Node.js 22（当前 LTS）

```
别名: node-22
镜像地址: https://npmmirror.com/mirrors/node
版本: 22.14.0
全局 NPM 包: pnpm yarn --registry=https://registry.npmmirror.com
工具目录: node/22
```

### Node.js 16

```
别名: node-16
镜像地址: https://npmmirror.com/mirrors/node
版本: 16.20.0
全局 NPM 包: pnpm yarn --registry=https://registry.npmmirror.com
工具目录: node/16
```

### 版本选择建议

| 项目类型 | 推荐版本 |
|---------|---------|
| Vue 3 / Vite | Node.js 20+（推荐 22 LTS） |
| React 18 / Next.js | Node.js 20+（推荐 22 LTS） |
| 老项目（Webpack 4） | Node.js 16 |
| Nuxt 3 | Node.js 18+ |

---

## 四、在任务中使用

### 自由风格项目

```
构建环境 → 勾选 "Provide Node & npm bin/ folder to PATH"
         → 选择 NodeJS 版本（如 node-22）
```

### Pipeline 项目

```groovy
pipeline {
    agent any
    tools {
        nodejs 'node-22'
    }
    stages {
        stage('Install') {
            steps {
                sh 'npm install'
            }
        }
        stage('Build') {
            steps {
                sh 'npm run build'
            }
        }
    }
}
```

---

## 五、NPMRC 配置（推荐）

通过 NPMRC 文件统一管理 NPM 配置：

```ini
# .npmrc
registry=https://registry.npmmirror.com
disturl=https://npmmirror.com/mirrors/node
sass_binary_site=https://npmmirror.com/mirrors/node-sass
puppeteer_download_host=https://npmmirror.com/mirrors
```

在 Jenkins 全局工具配置中指定 NPMRC 文件路径，确保所有任务使用统一配置。

---

## 常见问题

| 问题 | 解决方案 |
|------|---------|
| Node.js 下载失败 | 切换淘宝镜像源 |
| 全局包安装失败 | 添加 `--registry` 参数 |
| 版本切换不生效 | 检查任务中是否正确选择了 NodeJS 版本 |
| Docker 环境找不到 node | 确认 NodeJS Plugin 安装在正确的节点 |

---

## 延伸阅读

- [NodeJS Plugin 文档](https://plugins.jenkins.io/nodejs/)
- [npmmirror 镜像站](https://npmmirror.com/)

---

