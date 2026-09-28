---
title: Docker 实战（Python）
description: Python 项目 Docker 实战指南：从基础概念到多阶段构建、Docker Compose 编排、镜像优化，面向需要容器化部署的 Python 开发者。
keywords: [Docker, Python, FastAPI, 多阶段构建, Docker Compose, 镜像优化]
category: Docker 容器
tags: [DevOps, Docker, Python]
---

# Docker 实战（Python）

## 概述

### 是什么

Docker 是一个开源的容器化平台，它允许开发者将应用程序及其依赖打包到一个轻量级、可移植的容器中。容器与宿主机共享操作系统内核，但拥有独立的文件系统、网络和进程空间，实现了"一次构建，到处运行"的目标。

### 为什么

Python 开发者日常会遇到三类部署问题：本地开发环境与生产环境不一致导致"在我机器上能跑"的尴尬、依赖版本冲突让项目难以维护、手动部署流程繁琐且容易出错。Docker 通过容器化技术解决了这些问题：每个容器都是独立的环境，依赖被完整封装，部署变成一条命令的事情。

### 怎么做

本文将从 Docker 的基础概念出发，逐步深入到 Dockerfile 编写最佳实践、Python 项目容器化实战、Docker Compose 多服务编排、镜像优化技巧，最后覆盖常见陷阱与排查方法。读完本文后，你应当能够独立完成 Python 项目的容器化部署。

### 知识定位

```mermaid
flowchart LR
  A[Python 基础] --> B[工程化]
  B --> C[Docker 实战]
  C --> D[CI/CD]
  C --> E[云部署]
  C --> F[监控运维]
```

::: info 阅读建议
本文假设你已熟悉 Python 的基本语法、pip 依赖管理、Web 框架（如 FastAPI）的基础用法。如果对 Mermaid 图中的前置节点不熟悉，建议先补全相关基础再进入正文。
:::

## 核心内容

### Docker 基础概念

#### 镜像、容器、仓库的关系

Docker 的核心概念可以类比为面向对象编程中的类与实例：

- **镜像（Image）**：类似于"类"，是一个只读的模板，包含运行应用所需的所有内容——代码、运行时、库、环境变量和配置文件。
- **容器（Container）**：类似于"实例"，是镜像的运行时实体。容器可以被创建、启动、停止、删除，且相互隔离。
- **仓库（Registry）**：类似于"代码仓库"，用于存储和分发镜像。Docker Hub 是最大的公共仓库，企业通常搭建私有仓库。

```mermaid
flowchart TD
  subgraph 开发者环境
    A[Dockerfile] -->|构建| B[镜像]
    B -->|推送| C[仓库]
  end

  subgraph 生产环境
    C -->|拉取| D[镜像副本]
    D -->|运行| E[容器 1]
    D -->|运行| F[容器 2]
    D -->|运行| G[容器 N]
  end

  subgraph 容器内部
    E --> H[应用代码]
    E --> I[运行时]
    E --> J[依赖库]
  end
```

#### Docker 架构

Docker 采用客户端-服务器（C/S）架构：

```mermaid
flowchart LR
  subgraph 客户端
    A[docker CLI]
    B[Docker Desktop]
  end

  subgraph 服务端
    C[Docker Daemon<br/>dockerd]
    D[containerd]
    E[runc]
  end

  subgraph 存储
    F[镜像层]
    G[容器层]
    H[数据卷]
  end

  A -->|REST API| C
  B -->|REST API| C
  C --> D
  D --> E
  C --> F
  C --> G
  C --> H
```

- **Docker Client**：用户与 Docker 交互的界面，包括 `docker` 命令行工具和 Docker Desktop。
- **Docker Daemon**：后台服务进程，负责构建、运行和分发容器。
- **containerd**：高级容器运行时，管理容器的生命周期。
- **runc**：底层容器运行时，真正创建和运行容器。

#### 核心命令速查

| 命令 | 说明 | 示例 |
| --- | --- | --- |
| `docker build` | 从 Dockerfile 构建镜像 | `docker build -t myapp:1.0 .` |
| `docker run` | 从镜像创建并启动容器 | `docker run -d -p 8000:80 myapp:1.0` |
| `docker ps` | 列出运行中的容器 | `docker ps -a`（包含已停止） |
| `docker stop` | 停止容器 | `docker stop container_id` |
| `docker rm` | 删除容器 | `docker rm container_id` |
| `docker rmi` | 删除镜像 | `docker rmi image_id` |
| `docker exec` | 在运行中的容器内执行命令 | `docker exec -it container_id bash` |
| `docker logs` | 查看容器日志 | `docker logs -f container_id` |
| `docker push` | 推送镜像到仓库 | `docker push registry/myapp:1.0` |
| `docker pull` | 从仓库拉取镜像 | `docker pull python:3.12-slim` |

### Dockerfile 编写最佳实践

#### 多阶段构建（Multi-stage Build）

多阶段构建是减小镜像体积的核心技术。它允许在一个 Dockerfile 中定义多个构建阶段，最终镜像只包含运行时必需的内容。

```dockerfile
# 语法版本
# syntax=docker/dockerfile:1

# ==================== 构建阶段 ====================
FROM python:3.12-slim AS builder

# 设置工作目录
WORKDIR /build

# 安装构建依赖
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# 复制源代码
COPY src/ ./src/

# ==================== 运行阶段 ====================
FROM python:3.12-slim AS runtime

# 创建非 root 用户
RUN groupadd -r appgroup && useradd -r -g appgroup appuser

# 设置工作目录
WORKDIR /app

# 从构建阶段复制依赖
COPY --from=builder /root/.local /home/appuser/.local

# 从构建阶段复制应用代码
COPY --from=builder /build/src ./src

# 设置 PATH 环境变量
ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 8000

# 启动命令
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**多阶段构建的优势：**

| 对比项 | 单阶段构建 | 多阶段构建 |
| --- | --- | --- |
| 镜像体积 | 800MB+（含编译工具） | 150MB（仅运行时） |
| 安全性 | 较低（含不必要的工具） | 较高（最小化攻击面） |
| 构建缓存 | 较差（每次全量构建） | 较好（分层缓存） |
| 部署速度 | 较慢（大镜像传输） | 较快（小镜像传输） |

#### 层缓存优化

Docker 镜像由多个只读层组成，每条 Dockerfile 指令都会创建一个新层。理解层缓存机制是优化构建速度的关键。

```dockerfile
# syntax=docker/dockerfile:1

FROM python:3.12-slim

WORKDIR /app

# ===== 第一层：系统依赖（变化频率低，放最前面） =====
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# ===== 第二层：Python 依赖（变化频率中等） =====
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ===== 第三层：应用代码（变化频率高，放最后） =====
COPY . .

# ===== 第四层：运行时配置 =====
ENV PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["python", "main.py"]
```

**层缓存原则：**

1. **变化频率低的指令放前面**：系统依赖、Python 基础镜像变化最少，应最先执行。
2. **变化频率高的指令放后面**：应用代码经常修改，应最后复制。
3. **合并相关指令**：`RUN apt-get update && apt-get install` 应合并为一条，避免缓存失效。
4. **清理临时文件**：在同一层中清理 apt 缓存、pip 缓存，避免它们被永久保留在镜像中。

```mermaid
flowchart TD
  A[Dockerfile] --> B[FROM 指令]
  B --> C[系统依赖层]
  C --> D[Python 依赖层]
  D --> E[应用代码层]
  E --> F[配置层]

  G[修改 requirements.txt] --> H[缓存命中: FROM + 系统依赖]
  H --> I[缓存失效: Python 依赖层及之后]

  J[修改源代码] --> K[缓存命中: FROM + 系统依赖 + Python 依赖]
  K --> L[缓存失效: 应用代码层及之后]
```

#### .dockerignore 文件

`.dockerignore` 文件用于排除不需要复制到镜像中的文件，减小构建上下文体积，加速构建过程。

```text
# .dockerignore 示例

# Git 相关
.git
.gitignore
.github

# Python 缓存
__pycache__
*.py[cod]
*$py.class
.pytest_cache
.mypy_cache
.ruff_cache

# 虚拟环境
.venv
venv
env
ENV

# IDE 配置
.vscode
.idea
*.swp
*.swo

# 构建产物
dist
build
*.egg-info

# 测试和文档
tests
docs
*.md
!README.md

# Docker 相关（避免递归）
Dockerfile
docker-compose*.yml
.docker

# 本地配置
.env
.env.local
*.log
```

::: tip 最佳实践
`.dockerignore` 应与 `Dockerfile` 放在同一目录。建议从"排除一切，只包含必需"的原则出发，逐步添加需要保留的文件。
:::

### Python 项目容器化实战

#### 场景一：FastAPI 项目 Docker 化

以下是一个完整的 FastAPI 项目容器化示例，包含多阶段构建、Gunicorn 生产服务器、健康检查等生产级配置。

**项目结构：**

```text
fastapi-project/
├── src/
│   ├── __init__.py
│   ├── main.py
│   ├── api/
│   │   ├── __init__.py
│   │   └── routes.py
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py
│   └── models/
│       ├── __init__.py
│       └── schemas.py
├── tests/
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
└── .dockerignore
```

**Dockerfile：**

```dockerfile
# syntax=docker/dockerfile:1

# ==================== 构建阶段 ====================
FROM python:3.12-slim AS builder

# 安装编译依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# 复制依赖文件并安装
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# ==================== 运行阶段 ====================
FROM python:3.12-slim AS runtime

# 安装运行时依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r appgroup \
    && useradd -r -g appgroup appuser

WORKDIR /app

# 复制依赖
COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH

# 复制应用代码
COPY --chown=appuser:appgroup src/ ./src/

# 环境变量
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

# 切换用户
USER appuser

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动命令：Gunicorn + Uvicorn workers
CMD ["gunicorn", "src.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
```

**requirements.txt：**

```text
fastapi==0.115.0
uvicorn[standard]==0.32.0
gunicorn==23.0.0
pydantic==2.10.0
pydantic-settings==2.6.0
sqlalchemy==2.0.36
asyncpg==0.30.0
redis==5.2.0
httpx==0.28.0
```

**src/main.py：**

```python
# src/main.py
"""FastAPI 应用入口"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from src.api.routes import router
from src.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时执行
    print("Application starting up...")
    yield
    # 关闭时执行
    print("Application shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health_check():
    """健康检查端点"""
    return JSONResponse(
        content={"status": "healthy", "version": settings.APP_VERSION}
    )
```

**构建和运行：**

```bash
# 构建镜像
docker build -t fastapi-app:1.0 .

# 运行容器
docker run -d \
  --name fastapi-container \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  fastapi-app:1.0

# 查看日志
docker logs -f fastapi-container

# 健康检查
curl http://localhost:8000/health
```

#### 场景二：CLI 工具容器化

对于命令行工具，容器化可以确保一致的运行环境，避免依赖冲突。

```dockerfile
# syntax=docker/dockerfile:1

FROM python:3.12-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制代码
COPY src/ ./src/

# 安装包（如果是可安装的 Python 包）
COPY pyproject.toml .
RUN pip install --no-cache-dir -e .

# 设置入口点
ENTRYPOINT ["python", "-m", "mycli"]

# 默认参数（可被 docker run 参数覆盖）
CMD ["--help"]
```

**使用方式：**

```bash
# 显示帮助
docker run --rm mycli-tool

# 执行具体命令
docker run --rm -v $(pwd)/data:/data mycli-tool process /data/input.csv

# 交互模式
docker run --rm -it mycli-tool interactive
```

#### 场景三：数据处理脚本容器化

数据处理脚本通常需要处理大量文件，容器化时需要考虑数据卷挂载和资源限制。

```dockerfile
# syntax=docker/dockerfile:1

FROM python:3.12-slim

# 安装数据处理依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir \
    pandas==2.2.0 \
    numpy==2.0.0 \
    pyarrow==18.0.0

# 复制脚本
COPY scripts/ ./scripts/

# 数据目录（建议通过卷挂载）
VOLUME ["/data/input", "/data/output"]

# 设置资源限制提示
ENV PYTHONMEMORYLIMIT=2G

# 入口脚本
ENTRYPOINT ["python", "scripts/process.py"]
CMD ["--input", "/data/input", "--output", "/data/output"]
```

**运行方式：**

```bash
# 基本运行
docker run --rm \
  -v /path/to/input:/data/input \
  -v /path/to/output:/data/output \
  data-processor:1.0

# 带资源限制
docker run --rm \
  --memory=4g \
  --cpus=2 \
  -v /path/to/input:/data/input \
  -v /path/to/output:/data/output \
  data-processor:1.0
```

### Docker Compose 多服务编排

#### 基础概念

Docker Compose 是定义和运行多容器应用的工具。通过 `docker-compose.yml` 文件，你可以用一条命令启动整个应用栈。

```mermaid
flowchart TD
  subgraph Docker Compose 应用栈
    A[Web 服务<br/>FastAPI] --> B[数据库<br/>PostgreSQL]
    A --> C[缓存<br/>Redis]
    A --> D[任务队列<br/>Celery Worker]
    D --> C
    D --> B
    E[反向代理<br/>Nginx] --> A
  end

  subgraph 数据持久化
    B --> F[(postgres_data)]
    C --> G[(redis_data)]
  end
```

#### 场景：FastAPI + PostgreSQL + Redis + Celery

以下是一个完整的全栈开发环境配置：

**docker-compose.yml：**

```yaml
# docker-compose.yml
# 注：Compose v2 已废弃顶层 version 字段，无需书写

# 服务定义
services:
  # ==================== Web 服务 ====================
  web:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime
    container_name: fastapi-web
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://appuser:apppass@postgres:5432/appdb
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/1
      - ENVIRONMENT=development
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app-network
    volumes:
      - ./src:/app/src:ro  # 开发模式：热重载
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

  # ==================== PostgreSQL 数据库 ====================
  postgres:
    image: postgres:16-alpine
    container_name: fastapi-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=apppass
      - POSTGRES_DB=appdb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5

  # ==================== Redis 缓存 ====================
  redis:
    image: redis:7-alpine
    container_name: fastapi-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes

  # ==================== Celery Worker ====================
  celery-worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime
    container_name: fastapi-celery
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://appuser:apppass@postgres:5432/appdb
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/1
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app-network
    command: celery -A src.celery_app worker --loglevel=info --concurrency=4

  # ==================== Celery Beat（定时任务调度器）====================
  celery-beat:
    build:
      context: .
      dockerfile: Dockerfile
      target: runtime
    container_name: fastapi-celery-beat
    restart: unless-stopped
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/1
    depends_on:
      - redis
    networks:
      - app-network
    command: celery -A src.celery_app beat --loglevel=info

# 网络定义
networks:
  app-network:
    driver: bridge

# 数据卷定义
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```

**常用命令：**

```bash
# 启动所有服务（后台运行）
docker compose up -d

# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f web

# 进入容器
docker compose exec web bash

# 重新构建并启动
docker compose up -d --build

# 停止所有服务
docker compose down

# 停止并删除数据卷
docker compose down -v

# 查看资源使用
docker compose top
```

#### 开发环境 vs 生产环境

建议使用多个 Compose 文件区分环境：

```yaml
# docker-compose.prod.yml
# 生产环境覆盖配置（Compose v2 已废弃顶层 version 字段）

services:
  web:
    build:
      target: production
    ports: !override []  # 不暴露端口，通过 Nginx 反向代理（!override 覆盖基础文件列表，需 Compose v2.24+）
    volumes: !override []  # 生产环境不挂载源代码
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: "1"
          memory: 1G
        reservations:
          cpus: "0.5"
          memory: 512M
    environment:
      - ENVIRONMENT=production

  11-Nginx基础概述:
    image: 11-Nginx基础概述:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./11-Nginx基础概述.conf:/etc/11-Nginx基础概述/11-Nginx基础概述.conf:ro
      - ./ssl:/etc/11-Nginx基础概述/ssl:ro
    depends_on:
      - web
    networks:
      - app-network
```

**启动生产环境：**

```bash
# 合并基础配置和生产配置
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 镜像优化

#### 减小镜像体积

**镜像体积对比：**

| 基础镜像 | 大小 | 适用场景 |
| --- | --- | --- |
| `python:3.12` | ~1GB | 需要完整开发环境 |
| `python:3.12-slim` | ~150MB | 生产环境推荐 |
| `python:3.12-alpine` | ~50MB | 极致体积优化（需注意兼容性） |
| `distroless/python3` | ~30MB | 安全敏感场景（无 shell） |

**优化技巧：**

```dockerfile
# 1. 使用 slim 镜像
FROM python:3.12-slim

# 2. 合并 RUN 指令，减少层数
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir -r requirements.txt

# 3. 使用 --no-install-recommends 避免安装推荐包
# 4. 清理 apt 缓存和 pip 缓存
# 5. 使用多阶段构建（见前文）

# 6. 排除不必要的文件（通过 .dockerignore）
```

**Alpine 镜像注意事项：**

```dockerfile
# Alpine 使用 musl libc 而非 glibc
# 某些 Python 包可能需要编译
FROM python:3.12-alpine

# 安装编译依赖
RUN apk add --no-cache \
    build-base \
    libffi-dev \
    postgresql-dev

# 安装 Python 依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 清理编译依赖（如果运行时不需要）
RUN apk del build-base
```

#### 安全扫描

使用 `docker scout` 或 `trivy` 扫描镜像漏洞：

```bash
# Docker Scout（Docker 内置）
docker scout quickview myapp:1.0
docker scout cves myapp:1.0

# Trivy（第三方工具）
trivy image myapp:1.0
trivy image --severity HIGH,CRITICAL myapp:1.0
```

**安全最佳实践：**

```dockerfile
# 1. 使用非 root 用户
RUN groupadd -r appgroup && useradd -r -g appgroup appuser
USER appuser

# 2. 只复制必需文件
COPY --from=builder /app/dist ./dist

# 3. 设置只读文件系统（运行时）
# docker run --read-only myapp:1.0

# 4. 禁用特权
# docker run --cap-drop=ALL --cap-add=NET_BIND_SERVICE myapp:1.0

# 5. 使用特定版本标签，避免 :latest
FROM python:3.12.7-slim  # 而非 python:3.12-slim 或 python:latest
```

## 代码示例

::: tip Python 版本要求
本文示例基于 **Python 3.12+** 和较新版本的 Docker Engine（截至 2026-09，稳定版本线为 29.x）。Docker Compose V2 已集成到 Docker CLI，使用 `docker compose` 命令（而非旧版 `docker-compose`）。
:::

### 示例 1：完整的 FastAPI 项目 Docker 化

```dockerfile
# 文件名: Dockerfile
# 完整的生产级 FastAPI 项目 Dockerfile

# syntax=docker/dockerfile:1

# ==================== 基础阶段：依赖安装 ====================
FROM python:3.12-slim AS builder

# 安装编译依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# 复制依赖文件
COPY requirements.txt .

# 安装依赖到用户目录
RUN pip install --no-cache-dir --user -r requirements.txt

# ==================== 生产阶段：运行时 ====================
FROM python:3.12-slim AS production

# 安装运行时依赖和安全更新
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r appgroup \
    && useradd -r -g appgroup appuser

WORKDIR /app

# 复制依赖
COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH

# 复制应用代码
COPY --chown=appuser:appgroup src/ ./src/

# 环境变量
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

# 切换用户
USER appuser

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动命令
CMD ["gunicorn", "src.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000"]
```

### 示例 2：Docker Compose 全栈开发环境

```yaml
# 文件名: docker-compose.yml
# FastAPI + PostgreSQL + Redis + Celery 全栈开发环境

services:
  web:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: fastapi-web
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://appuser:apppass@postgres:5432/appdb
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/1
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:16-alpine
    container_name: fastapi-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_USER=appuser
      - POSTGRES_PASSWORD=apppass
      - POSTGRES_DB=appdb
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: fastapi-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    command: redis-server --appendonly yes

  celery-worker:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: fastapi-celery
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://appuser:apppass@postgres:5432/appdb
      - CELERY_BROKER_URL=redis://redis:6379/1
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app-network
    command: celery -A src.celery_app worker --loglevel=info --concurrency=4

networks:
  app-network:
    driver: bridge

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
```

### 示例 3：镜像体积优化对比

```bash
# 文件名: optimize-image.sh
# 演示不同优化策略的镜像体积对比

#!/bin/bash

echo "=== 镜像体积优化对比 ==="

# 1. 未优化版本
cat > Dockerfile.unoptimized << 'EOF'
FROM python:3.12
WORKDIR /app
COPY . .
RUN pip install fastapi uvicorn
CMD ["python", "-m", "uvicorn", "main:app"]
EOF

docker build -t test:unoptimized -f Dockerfile.unoptimized .
echo "未优化版本大小:"
docker images test:unoptimized --format "{{.Size}}"

# 2. 使用 slim 镜像
cat > Dockerfile.slim << 'EOF'
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
CMD ["python", "-m", "uvicorn", "src.main:app"]
EOF

docker build -t test:slim -f Dockerfile.slim .
echo "Slim 版本大小:"
docker images test:slim --format "{{.Size}}"

# 3. 多阶段构建
cat > Dockerfile.multistage << 'EOF'
FROM python:3.12-slim AS builder
WORKDIR /build
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
COPY src/ ./src/
CMD ["python", "-m", "uvicorn", "src.main:app"]
EOF

docker build -t test:multistage -f Dockerfile.multistage .
echo "多阶段构建版本大小:"
docker images test:multistage --format "{{.Size}}"

# 清理
docker rmi test:unoptimized test:slim test:multistage
rm -f Dockerfile.unoptimized Dockerfile.slim Dockerfile.multistage
```

## 常见陷阱

| 常见错误 | 正确做法 |
| --- | --- |
| 使用 `:latest` 标签（版本不可控，生产环境可能突然崩溃） | 使用明确的版本标签，如 `python:3.12.7-slim` |
| 以 root 用户运行容器（安全风险大） | 创建非 root 用户并切换：`USER appuser` |
| 忘记清理 apt/pip 缓存（镜像体积膨胀） | 在同一 RUN 指令中清理：`rm -rf /var/lib/apt/lists/*` |
| 把应用代码放在依赖安装之前（缓存失效，构建变慢） | 先复制 `requirements.txt` 并安装依赖，再复制代码 |
| 使用 `ADD` 而非 `COPY`（`ADD` 有自动解压等额外行为，语义不清） | 优先使用 `COPY`，仅在需要自动解压 tar 或从 URL 获取时使用 `ADD` |
| 在 Dockerfile 中硬编码敏感信息（密码、密钥泄露） | 使用环境变量或 Docker Secrets：`ENV DB_PASSWORD` |
| 忘记设置 `HEALTHCHECK`（容器假死无法自动重启） | 添加健康检查：`HEALTHCHECK CMD curl -f http://localhost:8000/health` |
| 使用 `docker exec` 修改容器内文件（容器重建后丢失） | 使用数据卷持久化数据，或修改 Dockerfile 重新构建 |
| 忽略 `.dockerignore`（构建上下文过大，敏感文件泄露） | 创建 `.dockerignore` 排除不必要的文件 |
| 一个容器运行多个服务（违背单一职责，难以扩展） | 每个容器运行一个进程，使用 Docker Compose 编排多服务 |
| 在 Dockerfile 中使用 `VOLUME` 挂载主机路径（不可移植） | 在 `docker-compose.yml` 或 `docker run -v` 中定义卷挂载 |
| 忘记设置 `PYTHONUNBUFFERED=1`（日志延迟输出，调试困难） | 在 Dockerfile 中设置：`ENV PYTHONUNBUFFERED=1` |

::: danger 特别注意
**不要在生产环境使用 `:latest` 标签**。某天基础镜像更新后，你的应用可能因为依赖版本变化而突然崩溃，且无法复现问题（因为不知道之前用的是什么版本）。始终使用明确的版本标签，并在 `requirements.txt` 中锁定依赖版本。
:::

## 最佳实践速查表

### 要做的

::: tip
**使用多阶段构建**：将构建环境和运行环境分离，最终镜像只包含运行时必需的内容，体积可减少 50%-80%。
:::

::: tip
**使用非 root 用户**：创建专用用户和组，在 Dockerfile 末尾切换用户。即使容器被攻破，攻击者也只有有限权限。
:::

::: tip
**优化层缓存顺序**：变化频率低的指令（系统依赖、基础镜像）放前面，变化频率高的指令（应用代码）放后面。
:::

::: tip
**设置健康检查**：通过 `HEALTHCHECK` 指令让 Docker 自动检测容器健康状态，配合编排工具实现自动重启。
:::

::: tip
**使用明确的版本标签**：基础镜像和依赖包都应使用明确的版本号，确保构建的可重复性。
:::

::: tip
**创建 .dockerignore 文件**：排除不必要的文件，减小构建上下文，加速构建过程，避免敏感信息泄露。
:::

### 避免的

::: warning
**避免在 Dockerfile 中硬编码敏感信息**：密码、API 密钥等应通过环境变量或 Docker Secrets 传递。
:::

::: warning
**避免一个容器运行多个服务**：每个容器应只运行一个进程，使用 Docker Compose 编排多服务架构。
:::

::: warning
**避免使用 `ADD` 指令复制本地文件**：`ADD` 有自动解压和从 URL 获取的额外行为，语义不清。复制本地文件应使用 `COPY`。
:::

::: danger
**不要忽略镜像安全扫描**：定期使用 `docker scout` 或 `trivy` 扫描镜像漏洞，及时更新基础镜像和依赖。
:::

## 术语表

| 术语 | 定义 |
| --- | --- |
| **镜像（Image）** | Docker 容器的只读模板，包含运行应用所需的代码、运行时、库和配置。 |
| **容器（Container）** | 镜像的运行时实例，拥有独立的文件系统、网络和进程空间。 |
| **Dockerfile** | 定义如何构建 Docker 镜像的文本文件，包含一系列指令。 |
| **仓库（Registry）** | 存储和分发 Docker 镜像的服务，如 Docker Hub、阿里云容器镜像服务。 |
| **多阶段构建** | 在一个 Dockerfile 中定义多个构建阶段，最终镜像只包含必需内容。 |
| **层（Layer）** | Docker 镜像的组成单元，每条 Dockerfile 指令创建一个只读层。 |
| **数据卷（Volume）** | 独立于容器的持久化存储，容器删除后数据不丢失。 |
| **Docker Compose** | 定义和运行多容器 Docker 应用的工具，使用 YAML 文件配置。 |
| **健康检查（Healthcheck）** | Docker 定期执行的命令，用于判断容器是否健康运行。 |
| **构建缓存** | Docker 构建时复用之前构建的层，加速构建过程。 |

::: info 参考
更多通用术语定义请参见《全局术语说明》（治理文档，已移出正文区）。
:::

## 延伸阅读

### 站内相关

- [Docker 安装与核心概念详解](02-Docker安装与核心概念详解.md)
- [Docker Compose 多容器编排](05-Docker%20Compose多容器编排.md)
- [服务向 Kubernetes 容器平台迁移必须了解的事情](09-服务向%20Kubernetes%20容器平台迁移必须了解的事情.md)

### 外部权威资源

- [Docker 官方文档](https://docs.docker.com/)
- [Dockerfile 最佳实践指南](https://docs.docker.com/build/building/best-practices/)
- [Docker Compose 官方文档](https://docs.docker.com/compose/)
- [Python 官方 Docker 镜像](https://hub.docker.com/_/python)
- [FastAPI 官方部署指南](https://fastapi.tiangolo.com/deployment/docker/)
- [Docker 安全最佳实践](https://docs.docker.com/engine/security/)
- [OWASP Docker 安全备忘单](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
