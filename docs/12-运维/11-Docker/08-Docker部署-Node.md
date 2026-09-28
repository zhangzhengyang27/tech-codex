---
title: Docker 容器化部署（Node.js）
description: Node.js 项目 Docker 容器化部署全流程：Dockerfile 编写（多阶段构建、TypeScript/NestJS/Next.js）、Compose 编排、数据卷与网络、日志监控、资源限制与 CI/CD 集成
keywords: [Node.js, Docker, Dockerfile, Docker Compose, 部署运维, 多阶段构建]
category: Docker 容器
tags: [Node.js, Docker, 部署运维]
---

# Docker 容器化部署（Node.js）

## 什么是 Docker？

Docker 是一个开源的容器化平台，它允许开发者将应用及其依赖打包到一个可移植的容器中，从而实现应用程序在任何环境下的快速部署和运行。

### Docker 与虚拟机的区别

| 特性 | Docker 容器 | 虚拟机 |
|------|------------|--------|
| 启动时间 | 秒级 | 分钟级 |
| 资源占用 | MB 级别 | GB 级别 |
| 性能 | 接近原生 | 有损耗 |
| 隔离性 | 进程级别 | 操作系统级别 |
| 操作系统 | 共享宿主机内核 | 独立内核 |

### Docker 的优势

1. **一致性**：确保开发、测试、生产环境一致
2. **轻量级**：容器共享宿主机内核，资源利用率高
3. **快速部署**：秒级启动，快速扩展
4. **版本管理**：镜像可版本化，便于回滚
5. **可移植性**：一次构建，到处运行

## Docker 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                        Docker Client                         │
│                    (docker CLI / API)                        │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Docker Daemon (dockerd)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Images    │  │ Containers  │  │  Networks   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│  ┌─────────────┐                                            │
│  │   Volumes   │                                            │
│  └─────────────┘                                            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Container Runtime                         │
│                    (containerd / runc)                       │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                      Host OS Kernel                          │
└─────────────────────────────────────────────────────────────┘
```

### 核心组件说明

| 组件 | 说明 |
|------|------|
| Docker Client | 命令行工具或 API，用于与 Docker Daemon 通信 |
| Docker Daemon | 后台服务，负责构建、运行、分发容器 |
| containerd | 高级容器运行时，管理容器生命周期 |
| runc | 底层容器运行时，创建和运行容器 |

## Docker 核心概念

### 镜像（Image）

镜像是只读模板，包含创建容器的指令。由多个只读层组成，每层代表 Dockerfile 中的一个指令。

**镜像层次结构：**
```
┌─────────────────────┐
│   应用代码层 (RW)    │  ← 最上层，可写
├─────────────────────┤
│   依赖包层 (R)       │
├─────────────────────┤
│   系统库层 (R)       │
├─────────────────────┤
│   基础镜像层 (R)     │  ← 基础层
└─────────────────────┘
```

### 容器（Container）

容器是镜像的运行实例，是独立、轻量级的可执行软件包。容器在镜像顶层添加一个可写层。

```bash
# 容器状态流转
Created → Running → Paused → Stopped → Deleted
              ↓
           Restarting
```

### 仓库（Registry）

仓库用于存储和分发镜像。

| 仓库类型 | 说明 | 示例 |
|----------|------|------|
| 公共仓库 | 对外公开的镜像仓库 | Docker Hub、GitHub Container Registry |
| 私有仓库 | 企业内部镜像仓库 | Harbor、Nexus、AWS ECR |
| 官方镜像 | 经过 Docker 验证的镜像 | `node:22-alpine`、`11-Nginx基础概述:alpine` |

## 安装 Docker

### macOS

```bash
# 使用 Homebrew 安装
brew install --cask docker

# 或者下载 Docker Desktop
# https://www.docker.com/products/docker-desktop
```

### Linux

```bash
# Ubuntu/Debian - 官方脚本安装
curl -fsSL https://get.docker.com | sh

# Ubuntu/Debian - 手动安装
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# CentOS/RHEL
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

### 配置 Docker 用户组

```bash
# 将当前用户添加到 docker 组（避免每次使用 sudo）
sudo usermod -aG docker $USER

# 重新登录或执行
newgrp docker
```

### 配置 Docker Daemon

```bash
# /etc/docker/daemon.json
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "live-restore": true,
  "default-ulimits": {
    "nofile": {
      "Name": "nofile",
      "Hard": 65535,
      "Soft": 65535
    }
  }
}

# 重启 Docker 服务
sudo systemctl daemon-reload
sudo systemctl restart docker
```

> 加速地址可用性随服务商策略变化：Docker 中国官方镜像（registry.docker-cn.com）早已停止服务；腾讯云内网地址仅腾讯云服务器可用。云上环境优先使用云厂商专属加速地址，其余场景参考本目录《04-Docker Hub与镜像加速配置》。

### 验证安装

```bash
# 查看版本
docker --version
docker compose version

# 运行测试镜像
docker run hello-world

# 查看 Docker 信息
docker info
```

## Dockerfile 编写

### Dockerfile 指令详解

| 指令 | 说明 | 示例 |
|------|------|------|
| `FROM` | 指定基础镜像 | `FROM node:22-alpine` |
| `WORKDIR` | 设置工作目录 | `WORKDIR /app` |
| `COPY` | 复制文件/目录 | `COPY . .` |
| `ADD` | 添加文件（支持 URL 和解压） | `ADD app.tar.gz /app` |
| `RUN` | 执行命令 | `RUN npm install` |
| `CMD` | 容器启动默认命令 | `CMD ["node", "index.js"]` |
| `ENTRYPOINT` | 容器启动入口点 | `ENTRYPOINT ["node"]` |
| `ENV` | 设置环境变量 | `ENV NODE_ENV=production` |
| `ARG` | 构建时参数 | `ARG VERSION=1.0` |
| `EXPOSE` | 声明端口 | `EXPOSE 3000` |
| `VOLUME` | 创建挂载点 | `VOLUME /data` |
| `USER` | 指定运行用户 | `USER nodejs` |
| `HEALTHCHECK` | 健康检查 | `HEALTHCHECK CMD curl -f http://localhost/` |
| `LABEL` | 添加元数据 | `LABEL version="1.0"` |
| `ONBUILD` | 触发器指令 | `ONBUILD COPY . /app` |

### CMD 与 ENTRYPOINT 区别

```dockerfile
# CMD - 可被 docker run 参数覆盖
CMD ["node", "index.js"]
# docker run myapp npm start  → 实际执行 npm start

# ENTRYPOINT - docker run 参数追加
ENTRYPOINT ["node"]
CMD ["index.js"]
# docker run myapp server.js  → 实际执行 node server.js
```

### 基础 Dockerfile 示例

```dockerfile
# 指定基础镜像
FROM node:22-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 lock 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --omit=dev

# 复制应用代码
COPY . .

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "src/index.js"]
```

### 多阶段构建 Dockerfile

多阶段构建可以显著减小最终镜像大小，将构建环境和运行环境分离。

```dockerfile
# ============================================
# 构建阶段
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./
RUN npm ci

# 复制源代码并构建
COPY . .
RUN npm run build

# ============================================
# 生产阶段
# ============================================
FROM node:22-alpine AS production

WORKDIR /app

# 安装生产依赖
COPY package*.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

# 从构建阶段复制产物
COPY --from=builder /app/dist ./dist

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置文件权限
COPY --chown=nodejs:nodejs --from=builder /app/dist ./dist

USER nodejs

EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "dist/index.js"]
```

### TypeScript 项目 Dockerfile

```dockerfile
# ============================================
# 构建阶段
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# 安装构建工具（某些 native 模块需要）
RUN apk add --no-cache python3 make g++

# 复制依赖文件
COPY package*.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

# 安装所有依赖（包括 devDependencies）
RUN npm ci

# 复制源代码
COPY src ./src

# 构建
RUN npm run build

# ============================================
# 生产阶段
# ============================================
FROM node:22-alpine AS production

WORKDIR /app

# 设置 Node.js 生产环境变量
ENV NODE_ENV=production

# 复制依赖文件并安装生产依赖
COPY package*.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

# 从构建阶段复制产物
COPY --from=builder /app/dist ./dist

# 创建非 root 用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### NestJS 项目 Dockerfile

```dockerfile
# ============================================
# 构建阶段
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY nest-cli.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./

RUN npm ci

COPY libs ./libs
COPY apps ./apps

RUN npm run build

# ============================================
# 生产阶段
# ============================================
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && \
    npm cache clean --force

COPY --from=builder /app/dist ./dist

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

EXPOSE 3000

CMD ["node", "dist/apps/api/main.js"]
```

### Next.js 项目 Dockerfile

```dockerfile
# ============================================
# 依赖阶段
# ============================================
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ============================================
# 构建阶段
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# ============================================
# 运行阶段
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# 自动利用输出跟踪来减小镜像大小
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### 使用 BuildKit 构建缓存

```dockerfile
# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder

WORKDIR /app

# 利用 BuildKit 缓存挂载
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    npm ci

COPY . .

RUN --mount=type=cache,target=/app/.next/cache \
    npm run build
```

```bash
# 启用 BuildKit 构建
DOCKER_BUILDKIT=1 docker build -t myapp .
```

## Docker Compose

::: info 关于 version 字段
Compose v2 已废弃 docker-compose.yml 顶层的 `version:` 字段（书写会产生告警），下文示例均不再包含该字段。
:::

### 基础 docker-compose.yml

```yaml

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped

  mongodb:
    image: mongo:6
    ports:
      - '27017:27017'
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  mongodb_data:
  redis_data:
```

### 完整项目配置示例

```yaml

services:
  # Node.js 应用
  api:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
      args:
        - NODE_ENV=production
    container_name: myapp-api
    restart: unless-stopped
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=mongodb://mongodb:27017/myapp
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=7d
    depends_on:
      mongodb:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - app-network
    healthcheck:
      test: ['CMD', 'wget', '--no-verbose', '--tries=1', '--spider', 'http://localhost:3000/health']
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'

  # MongoDB 数据库
  mongodb:
    image: mongo:6
    container_name: myapp-mongodb
    restart: unless-stopped
    ports:
      - '27017:27017'
    volumes:
      - mongodb_data:/data/db
      - ./init/mongo-init.js:/docker-entrypoint-initdb.d/mongo-init.js:ro
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
    networks:
      - app-network
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh localhost:27017/test --quiet
      interval: 10s
      timeout: 10s
      retries: 5
      start_period: 40s

  # Redis 缓存
  redis:
    image: redis:7-alpine
    container_name: myapp-redis
    restart: unless-stopped
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    networks:
      - app-network
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 3

  # Nginx 反向代理
  11-Nginx基础概述:
    image: 11-Nginx基础概述:alpine
    container_name: myapp-11-Nginx基础概述
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./11-Nginx基础概述/11-Nginx基础概述.conf:/etc/11-Nginx基础概述/11-Nginx基础概述.conf:ro
      - ./11-Nginx基础概述/ssl:/etc/11-Nginx基础概述/ssl:ro
      - 11-Nginx基础概述_logs:/var/log/11-Nginx基础概述
    depends_on:
      api:
        condition: service_healthy
    networks:
      - app-network

volumes:
  mongodb_data:
    driver: local
  redis_data:
    driver: local
  11-Nginx基础概述_logs:
    driver: local

networks:
  app-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### 开发环境配置

```yaml
# docker-compose.dev.yml

services:
  api:
    build:
      target: development
    volumes:
      - .:/app
      - /app/node_modules
      - ~/.ssh:/root/.ssh:ro
    environment:
      - NODE_ENV=development
      - DEBUG=app:*
    ports:
      - '3000:3000'
      - '9229:9229'  # 调试端口
    command: npm run dev
    depends_on:
      - mongodb
      - redis

  mongodb:
    ports:
      - '27017:27017'
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=admin

  redis:
    ports:
      - '6379:6379'
```

### 使用方式

```bash
# 开发环境
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 生产环境
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Docker 网络管理

### 网络类型

| 网络类型 | 说明 | 使用场景 |
|----------|------|----------|
| bridge | 默认网络，容器间可通过 IP 通信 | 单机容器通信 |
| host | 容器共享宿主机网络 | 高性能网络应用 |
| none | 无网络 | 完全隔离的容器 |
| overlay | 跨主机网络 | Docker Swarm 集群 |
| macvlan | 容器拥有独立 MAC 地址 | 需要直接接入物理网络 |

### 网络配置示例

```bash
# 创建自定义网络
docker network create --driver bridge --subnet 172.25.0.0/16 my-network

# 查看网络
docker network ls
docker network inspect my-network

# 连接容器到网络
docker run -d --name app --network my-network myapp:latest
docker network connect my-network existing-container

# 断开网络连接
docker network disconnect my-network existing-container

# 删除网络
docker network rm my-network
```

### Docker Compose 网络配置

```yaml

services:
  api:
    networks:
      - frontend
      - backend

  db:
    networks:
      - backend

  11-Nginx基础概述:
    networks:
      - frontend

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # 内部网络，无法访问外网
```

## 数据卷管理

### 数据卷类型

| 类型 | 说明 | 生命周期 |
|------|------|----------|
| Volume | Docker 管理的存储 | 独立于容器 |
| Bind Mount | 宿主机目录挂载 | 依赖宿主机目录 |
| tmpfs | 内存存储 | 容器停止后消失 |

### 数据卷操作

```bash
# 创建数据卷
docker volume create mydata

# 查看数据卷
docker volume ls
docker volume inspect mydata

# 使用数据卷
docker run -d -v mydata:/app/data myapp

# 挂载到指定位置
docker run -d --mount source=mydata,target=/app/data myapp

# 删除数据卷
docker volume rm mydata

# 清理未使用的数据卷
docker volume prune
```

### Bind Mount 示例

```bash
# 挂载宿主机目录
docker run -d -v /host/path:/container/path myapp

# 只读挂载
docker run -d -v /host/path:/container/path:ro myapp

# 使用 --mount 语法（推荐）
docker run -d --mount type=bind,source=/host/path,target=/container/path,readonly myapp
```

### Docker Compose 数据卷配置

```yaml

services:
  app:
    volumes:
      # 命名卷
      - app_data:/app/data
      # 绑定挂载
      - ./config:/app/config:ro
      # 匿名卷
      - /app/node_modules
      # tmpfs
      - type: tmpfs
        target: /tmp
        tmpfs:
          size: 10000000  # 10MB

volumes:
  app_data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: /data/app
```

### 数据备份与恢复

```bash
# 备份数据卷
docker run --rm \
  -v mydata:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/mydata-backup.tar.gz -C /data .

# 恢复数据卷
docker run --rm \
  -v mydata:/data \
  -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/mydata-backup.tar.gz"
```

## 常用 Docker 命令

### 镜像管理

```bash
# 构建镜像
docker build -t myapp:latest .
docker build -t myapp:1.0.0 --target production .
docker build --no-cache -t myapp:latest .  # 不使用缓存
docker build --build-arg VERSION=1.0 -t myapp:latest .

# 查看本地镜像
docker images
docker images --filter "dangling=true"  # 查看悬空镜像

# 拉取/推送镜像
docker pull node:22-alpine
docker pull myrepo/myapp:latest
docker push myrepo/myapp:latest

# 标记镜像
docker tag myapp:latest myrepo/myapp:1.0.0

# 删除镜像
docker rmi myapp:latest
docker image prune          # 删除悬空镜像
docker image prune -a       # 删除所有未使用的镜像

# 导出/导入镜像
docker save -o myapp.tar myapp:latest
docker load -i myapp.tar

# 查看镜像历史
docker history myapp:latest
```

### 容器管理

```bash
# 运行容器
docker run -d -p 3000:3000 --name myapp myapp:latest
docker run -it --rm node:22-alpine sh  # 交互模式，退出后删除
docker run -d --restart unless-stopped myapp  # 自动重启策略

# 查看容器
docker ps                    # 运行中的容器
docker ps -a                 # 所有容器
docker ps --filter "status=exited"
docker ps --format "table {{.Names}}\t{{.Status}}"

# 容器操作
docker start myapp
docker stop myapp            # 发送 SIGTERM，等待 10 秒
docker stop -t 30 myapp      # 等待 30 秒
docker kill myapp            # 发送 SIGKILL
docker restart myapp
docker pause myapp           # 暂停容器
docker unpause myapp

# 删除容器
docker rm myapp
docker rm -f myapp           # 强制删除运行中的容器
docker container prune       # 删除所有已停止的容器

# 查看日志
docker logs myapp
docker logs -f --tail 100 myapp
docker logs --since 2h myapp
docker logs --until 2024-01-01T00:00:00 myapp
```

### 容器交互

```bash
# 进入容器
docker exec -it myapp sh
docker exec -it myapp /bin/bash

# 在容器中执行命令
docker exec myapp npm test
docker exec myapp ls -la /app

# 复制文件
docker cp ./local-file.txt myapp:/app/file.txt
docker cp myapp:/app/file.txt ./local-file.txt

# 查看容器资源使用
docker stats
docker stats --no-stream myapp

# 查看容器进程
docker top myapp

# 查看容器详情
docker inspect myapp
docker inspect --format '{{.State.Status}}' myapp

# 查看容器端口映射
docker port myapp
```

### Docker Compose 命令

```bash
# 启动服务
docker compose up -d
docker compose up -d --build      # 构建后启动
docker compose up -d --force-recreate

# 停止服务
docker compose down
docker compose down -v            # 同时删除数据卷
docker compose down --rmi all     # 同时删除镜像

# 服务管理
docker compose start api
docker compose stop api
docker compose restart api
docker compose pause api
docker compose unpause api

# 查看状态
docker compose ps
docker compose logs -f api
docker compose logs --tail 100 api

# 进入容器
docker compose exec api sh

# 扩展服务
docker compose up -d --scale api=3

# 拉取/推送镜像
docker compose pull
docker compose push
```

### 清理命令

```bash
# 清理所有未使用的资源
docker system prune

# 清理包括镜像
docker system prune -a

# 清理包括数据卷
docker system prune -a --volumes

# 查看磁盘使用情况
docker system df
docker system df -v
```

## 生产环境最佳实践

### 1. 使用 .dockerignore

```
# Dependencies
node_modules
npm-debug.log
yarn-error.log
yarn.lock
package-lock.json

# Build outputs
dist
build
.next
out
coverage
.nyc_output

# Development files
.git
.gitignore
.gitattributes
.github
.vscode
.idea

# Environment files
.env
.env.*
!.env.example

# Docker files
Dockerfile
Dockerfile.*
docker-compose*.yml
.dockerignore

# Documentation
*.md
!README.md
docs

# Tests
tests
test
__tests__
*.test.js
*.spec.js
*.test.ts
*.spec.ts

# Misc
.DS_Store
*.log
*.tmp
*.swp
```

### 2. 安全配置

```dockerfile
# 使用非 root 用户运行
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 设置文件权限
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs dist ./dist

USER nodejs

# 禁止 root 登录
RUN sed -i 's/root:!/root:*/' /etc/shadow
```

### 3. 健康检查

```dockerfile
# Dockerfile 中的健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# 或使用 curl
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
```

### 4. 环境变量管理

```dockerfile
# 设置默认环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 支持构建时参数
ARG VERSION=latest
ENV APP_VERSION=$VERSION

# 使用 .env 文件（docker-compose）
# .env
DATABASE_URL=mongodb://localhost:27017/myapp
JWT_SECRET=your-secret-key
```

```yaml
# docker-compose.yml
services:
  api:
    env_file:
      - .env
      - .env.production
    environment:
      - NODE_ENV=production
```

### 5. 多环境配置

```yaml
# docker-compose.yml - 基础配置

services:
  api:
    build: .
    networks:
      - app-network

networks:
  app-network:
```

```yaml
# docker-compose.override.yml - 开发环境（自动加载）

services:
  api:
    build:
      target: development
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    ports:
      - '3000:3000'
      - '9229:9229'
    command: npm run dev
```

```yaml
# docker-compose.prod.yml - 生产环境

services:
  api:
    build:
      target: production
    environment:
      - NODE_ENV=production
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '1'
          memory: 512M
```

```bash
# 启动命令
docker compose up -d                           # 开发环境（自动加载 override）
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d  # 生产环境
```

## 镜像优化技巧

### 1. 选择合适的基础镜像

```dockerfile
# 推荐：使用 alpine 版本（约 50MB）
FROM node:22-alpine

# 不推荐：默认镜像（约 900MB）
FROM node:22

# 更小：distroless 镜像（约 20MB，无 shell）
FROM gcr.io/distroless/nodejs22-debian12
```

### 2. 利用构建缓存

```dockerfile
# 正确：先复制依赖文件，利用 Docker 缓存
COPY package*.json ./
RUN npm ci --omit=dev

# 再复制源代码
COPY . .

# 错误：每次代码变更都会重新安装依赖
COPY . .
RUN npm ci --omit=dev
```

### 3. 减少镜像层数

```dockerfile
# 推荐：合并 RUN 命令
RUN apk add --no-cache python3 make g++ && \
    npm ci --omit=dev && \
    npm cache clean --force && \
    apk del python3 make g++

# 不推荐：多个 RUN 命令
RUN apk add --no-cache python3 make g++
RUN npm ci --omit=dev
RUN npm cache clean --force
RUN apk del python3 make g++
```

### 4. 多阶段构建

```dockerfile
# 构建阶段（包含构建工具）
FROM node:22-alpine AS builder
RUN apk add --no-cache python3 make g++
COPY . .
RUN npm ci && npm run build

# 运行阶段（只包含必要文件）
FROM node:22-alpine
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

### 5. 使用 .dockerignore

```dockerfile
# 忽略不需要的文件，减小构建上下文
```

### 6. 镜像分析工具

```bash
# 使用 dive 分析镜像
dive myapp:latest

# 使用 docker history 查看层信息
docker history myapp:latest

# 查看镜像大小
docker images myapp:latest
```

## 资源限制配置

### CPU 限制

```bash
# 限制 CPU 使用
docker run -d --cpus="1.5" myapp          # 最多使用 1.5 个 CPU
docker run -d --cpuset-cpus="0,1" myapp   # 使用 CPU 0 和 1
docker run -d --cpu-shares=512 myapp      # CPU 权重（相对值）
```

### 内存限制

```bash
# 限制内存使用
docker run -d --memory="512m" myapp           # 最大内存 512MB
docker run -d --memory="1g" --memory-swap="2g" myapp  # 内存 1GB，交换空间 2GB
docker run -d --memory-reservation="256m" myapp  # 内存软限制
```

### Docker Compose 资源配置

```yaml

services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 128M
```

### 查看资源使用

```bash
# 实时查看资源使用
docker stats

# 查看特定容器
docker stats myapp --no-stream
```

## 日志管理

### 日志驱动配置

```bash
# json-file 驱动（默认）
docker run -d \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  myapp

# syslog 驱动
docker run -d \
  --log-driver syslog \
  --log-opt syslog-address=tcp://192.168.0.42:514 \
  myapp

# journald 驱动（Linux）
docker run -d --log-driver journald myapp

# none 驱动（禁用日志）
docker run -d --log-driver none myapp
```

### Docker Compose 日志配置

```yaml

services:
  api:
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
        labels: 'app,environment'
```

### 日志查看命令

```bash
# 查看日志
docker logs myapp
docker logs -f --tail 100 myapp
docker logs --since 2h myapp
docker logs --until 2024-01-01T00:00:00 myapp

# 导出日志
docker logs myapp > app.log 2>&1

# 查看日志文件位置
docker inspect --format='{{.LogPath}}' myapp
```

### 日志轮转配置

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3",
    "compress": "true"
  }
}
```

## 监控和调试

### 容器监控

```bash
# 实时资源监控
docker stats

# 查看容器进程
docker top myapp

# 查看容器事件
docker events --filter container=myapp

# 查看容器资源使用历史
docker container stats myapp --no-stream
```

### 调试命令

```bash
# 进入容器
docker exec -it myapp sh
docker exec -it myapp /bin/bash

# 执行单条命令
docker exec myapp cat /etc/os-release
docker exec myapp env

# 复制文件进行调试
docker cp myapp:/app/logs ./debug-logs

# 查看容器详情
docker inspect myapp

# 查看容器网络
docker network inspect bridge

# 查看容器挂载
docker inspect --format='{{json .Mounts}}' myapp | jq
```

### 使用 docker debug

```bash
# Docker Desktop 的新调试功能
docker debug myapp
```

### 性能分析

```bash
# 进入容器使用 Node.js 调试
docker exec -it myapp node --inspect=0.0.0.0:9229

# 在 Docker Compose 中暴露调试端口
ports:
  - '9229:9229'
command: node --inspect=0.0.0.0:9229 dist/index.js
```

## 安全最佳实践

### 1. 镜像安全

```dockerfile
# 使用官方镜像
FROM node:22-alpine

# 指定镜像版本（避免 :latest）
# 正确
FROM node:22.11.0-alpine
# 不正确
FROM node:latest

# 使用最小化镜像
FROM gcr.io/distroless/nodejs22-debian12

# 定期更新基础镜像
docker pull node:22-alpine
```

### 2. 容器安全

```dockerfile
# 使用非 root 用户
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

# 设置只读文件系统
# docker run --read-only myapp

# 限制能力
# docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE myapp
```

### 3. 网络安全

```bash
# 不暴露不必要的端口
docker run -d --expose 3000 myapp  # 仅容器内部

# 使用内部网络
docker network create --internal internal-net

# 限制容器间通信
docker run -d --icc=false myapp
```

### 4. 敏感信息管理

```bash
# 使用 Docker Secrets（Swarm 模式）
echo "my_secret_password" | docker secret create db_password -

# 使用文件挂载
docker run -d -v /run/secrets/db_password:/run/secrets/db_password:ro myapp

# 使用环境变量文件
# .env（不要提交到版本控制）
DB_PASSWORD=your_secret_password
```

```yaml
# docker-compose.yml
services:
  api:
    secrets:
      - db_password
    environment:
      - DB_PASSWORD_FILE=/run/secrets/db_password

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### 5. 安全扫描

```bash
# 使用 docker scout 扫描镜像
docker scout cves myapp:latest

# 使用 Trivy 扫描
trivy image myapp:latest

# 使用 Snyk 扫描
snyk container test myapp:latest
```

## CI/CD 集成

### GitHub Actions

```yaml
# .github/workflows/docker.yml
name: Docker Build and Push

on:
  push:
    branches: [main]
    tags: ['v*']
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Registry
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Scan image
        uses: docker/scout-action@v1
        with:
          command: cves
          image: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ steps.meta.outputs.version }}
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - deploy

variables:
  DOCKER_TLS_CERTDIR: ''
  DOCKER_HOST: tcp://docker:2375

build:
  stage: build
  image: docker:28
  services:
    - docker:28-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  only:
    - main
    - tags

test:
  stage: test
  image: docker:28
  services:
    - docker:28-dind
  script:
    - docker pull $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker run --rm $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA npm test
  only:
    - main
    - tags

deploy:
  stage: deploy
  image: docker:28
  services:
    - docker:28-dind
  before_script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
  script:
    - docker pull $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
    - docker tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:latest
    - docker push $CI_REGISTRY_IMAGE:latest
  only:
    - main
```

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
  agent {
    docker {
      image 'docker:28'
      args '-v /var/run/docker.sock:/var/run/docker.sock'
    }
  }

  environment {
    REGISTRY = 'registry.example.com'
    IMAGE = "${REGISTRY}/myapp"
  }

  stages {
    stage('Build') {
      steps {
        sh 'docker build -t ${IMAGE}:${BUILD_NUMBER} .'
      }
    }

    stage('Test') {
      steps {
        sh 'docker run --rm ${IMAGE}:${BUILD_NUMBER} npm test'
      }
    }

    stage('Scan') {
      steps {
        sh 'trivy image ${IMAGE}:${BUILD_NUMBER}'
      }
    }

    stage('Push') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'docker-registry', usernameVariable: 'USERNAME', passwordVariable: 'PASSWORD')]) {
          sh 'docker login -u ${USERNAME} -p ${PASSWORD} ${REGISTRY}'
          sh 'docker push ${IMAGE}:${BUILD_NUMBER}'
          sh 'docker tag ${IMAGE}:${BUILD_NUMBER} ${IMAGE}:latest'
          sh 'docker push ${IMAGE}:latest'
        }
      }
    }

    stage('Deploy') {
      steps {
        sh 'docker compose -f docker-compose.prod.yml pull'
        sh 'docker compose -f docker-compose.prod.yml up -d'
      }
    }
  }

  post {
    always {
      sh 'docker image prune -f'
    }
  }
}
```

## 故障排查指南

### 常见问题排查流程

```
┌─────────────────┐
│  容器无法启动？  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  docker logs    │
└────────┬────────┘
         │
    ┌────┴────┐
    │有错误？ │
    └────┬────┘
         │
    ┌────┴────┐
    │是       │否
    ▼         ▼
┌────────┐ ┌────────────┐
│ 分析   │ │docker ps -a│
│ 错误   │ └──────┬─────┘
└────────┘        │
            ┌─────┴─────┐
            │检查退出码 │
            └─────┬─────┘
                  │
            ┌─────┴─────┐
            │docker inspect│
            └───────────┘
```

### 容器无法启动

```bash
# 查看容器状态
docker ps -a --filter "name=myapp"

# 查看退出码
docker inspect --format='{{.State.ExitCode}}' myapp

# 查看错误日志
docker logs myapp

# 交互式启动调试
docker run -it --entrypoint sh myapp:latest

# 查看容器事件
docker events --filter container=myapp --since 1h
```

### 网络问题排查

```bash
# 检查容器网络
docker network inspect bridge

# 进入容器测试网络
docker exec -it myapp sh
ping google.com
curl -v http://localhost:3000/health

# 查看端口映射
docker port myapp

# 检查容器 IP
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' myapp

# 从宿主机测试
curl http://localhost:3000/health
```

### 存储问题排查

```bash
# 检查挂载点
docker inspect --format='{{json .Mounts}}' myapp | jq

# 检查数据卷
docker volume ls
docker volume inspect mydata

# 检查磁盘使用
docker system df -v

# 清理未使用资源
docker system prune -a --volumes
```

### 性能问题排查

```bash
# 查看资源使用
docker stats myapp --no-stream

# 查看进程
docker top myapp

# 检查容器资源限制
docker inspect --format='{{.HostConfig.Memory}}' myapp
docker inspect --format='{{.HostConfig.CpuQuota}}' myapp

# 查看容器日志大小
du -sh $(docker inspect --format='{{.LogPath}}' myapp)
```

### 常见错误及解决方案

| 错误信息 | 原因 | 解决方案 |
|----------|------|----------|
| `Bind for 0.0.0.0:3000 failed: port is already allocated` | 端口被占用 | 更换端口或停止占用进程 |
| `no space left on device` | 磁盘空间不足 | 清理镜像和容器 `docker system prune -a` |
| `Cannot connect to the Docker daemon` | Docker 未启动 | 启动 Docker 服务 |
| `network bridge not found` | 网络不存在 | 创建网络 `docker network create bridge` |
| `permission denied` | 权限不足 | 添加用户到 docker 组 |
| `exec user process caused: exec format error` | 架构不匹配 | 使用正确架构的镜像 |

## 常见问题解答

### Q1: 如何在容器中使用宿主机的服务？

```bash
# 方法 1：使用 host.docker.internal（Docker Desktop）
curl http://host.docker.internal:8080/api

# 方法 2：使用宿主机 IP
# Linux 上需要在容器内获取宿主机 IP
ip route show default | awk '/default/ {print $3}'

# 方法 3：使用 host 网络模式
docker run -d --network host myapp
```

### Q2: 如何设置容器时区？

```dockerfile
# Dockerfile
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
```

```bash
# 运行时设置
docker run -d -e TZ=Asia/Shanghai myapp
docker run -d -v /etc/localtime:/etc/localtime:ro myapp
```

### Q3: 如何减小镜像大小？

1. 使用 alpine 基础镜像
2. 使用多阶段构建
3. 合并 RUN 指令
4. 使用 .dockerignore
5. 清理缓存：`npm cache clean --force`
6. 使用 distroless 镜像

### Q4: 如何查看容器内的文件？

```bash
# 进入容器
docker exec -it myapp sh

# 不进入容器查看
docker exec myapp ls -la /app
docker exec myapp cat /app/config.json

# 复制文件出来
docker cp myapp:/app/config.json ./config.json
```

### Q5: 如何实现容器间通信？

```yaml
# 使用 Docker Compose 网络
services:
  api:
    networks:
      - app-network
  db:
    networks:
      - app-network

networks:
  app-network:
```

```bash
# 通过服务名访问
# 在 api 容器中可以直接使用 db 作为主机名
mongodb://db:27017/myapp
```

### Q6: 如何处理容器日志过大？

```bash
# 方法 1：设置日志轮转（推荐）
docker run -d --log-opt max-size=10m --log-opt max-file=3 myapp

# 方法 2：使用外部日志系统
docker run -d --log-driver syslog myapp

# 方法 3：定期清理
truncate -s 0 $(docker inspect --format='{{.LogPath}}' myapp)
```

### Q7: 如何调试容器启动失败？

```bash
# 查看详细错误信息
docker logs myapp

# 使用交互模式启动
docker run -it --entrypoint sh myapp:latest

# 查看容器状态
docker inspect myapp

# 查看容器事件
docker events --filter container=myapp
```

### Q8: 如何实现零停机部署？

```bash
# 使用 Docker Compose
docker compose up -d --no-deps --build api

# 使用滚动更新（需要 Swarm 或 Kubernetes）
docker service update --update-parallelism 1 --update-delay 10s myservice
```

### Q9: 如何管理敏感配置？

```bash
# Docker Secrets（Swarm 模式）
echo "secret_value" | docker secret create my_secret -

# 环境变量（适合开发环境）
docker run -d -e API_KEY=xxx myapp

# 挂载配置文件（推荐生产环境）
docker run -d -v /etc/secrets/api-key:/run/secrets/api-key:ro myapp
```

### Q10: 如何监控容器健康状态？

```dockerfile
# Dockerfile 中定义健康检查
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1
```

```bash
# 查看健康状态
docker inspect --format='{{.State.Health.Status}}' myapp

# 查看健康检查历史
docker inspect --format='{{json .State.Health}}' myapp | jq
```

## 参考资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Hub](https://hub.docker.com/)
- [Dockerfile 最佳实践](https://docs.docker.com/build/building/best-practices/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Docker 安全最佳实践](https://docs.docker.com/engine/security/)
