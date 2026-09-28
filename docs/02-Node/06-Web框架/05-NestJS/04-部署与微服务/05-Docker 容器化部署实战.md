---
title: Docker 容器化部署实战
description: "Nuxt3 的 .output 目录通过 bundleDependencies 自动打包所有运行时依赖，生产阶段无需 npm install。"
keywords: [Docker, 容器化部署, 前端, NestJS, Prisma, Docker Compose]
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# Docker 容器化部署实战

本文讲解前端项目与 NestJS 后端项目的容器化部署实战方案，包括前端两种容器化方式（Volume 映射和构建镜像）、NestJS 的 Prisma 处理与多服务编排。

## 一、前端项目容器化部署

### 1.1 两种容器化方式对比

| 维度 | Volume 映射 | 构建镜像（推荐） |
|------|------------|----------------|
| 原理 | Nginx 官方镜像 + 宿主机目录映射 | 编写 Dockerfile，代码打包进镜像 |
| 环境独立性 | 依赖宿主机目录 | 完全独立 |
| 部署速度 | 快（无需构建） | 首次慢，后续秒级 |
| 版本管理 | 无 | 镜像版本控制 |
| CI/CD 友好 | 差 | 好 |
| 适用场景 | 快速测试、开发环境 | 生产环境、多环境部署 |

### 1.2 方式一：Docker + Nginx + Volume 映射

**Docker Compose 配置**：

```yaml
services:
  11-Nginx基础概述:
    restart: always
    image: 11-Nginx基础概述
    container_name: frontend-11-Nginx基础概述
    environment:
      - TZ=Asia/Shanghai
    ports:
      - "4080:80"       # 宿主机端口:容器端口
    volumes:
      - /home/website:/usr/share/11-Nginx基础概述/html      # 网站目录
      - /etc/11-Nginx基础概述/conf.d:/etc/11-Nginx基础概述/conf.d      # Nginx 配置
      - /var/log/11-Nginx基础概述:/var/log/11-Nginx基础概述            # 日志目录
```

**端口映射原理**：

```
浏览器 → http://server-ip:4080
       → Docker 映射到容器 80 端口
       → Nginx 监听 80 端口，响应请求
```

关键规则：
- 宿主机端口不能冲突
- 容器端口必须与 Nginx `listen` 配置一致
- 修改 Nginx 配置后需重启容器：`docker restart frontend-11-Nginx基础概述`

**Nginx 配置示例**：

```11-Nginx基础概述
# /etc/11-Nginx基础概述/conf.d/site.conf
server {
    listen 80;
    server_name example.com;

    location / {
        root /usr/share/11-Nginx基础概述/html/my-app;
        index index.html;
        try_files $uri $uri/ /index.html;  # SPA 路由支持
    }
}
```

**部署流程**：

```bash
# 1. 构建前端项目
npm run build

# 2. 上传产物到服务器
rsync -avz dist/ user@server:/home/website/my-app/

# 3. 启动容器
docker compose up -d

# 4. 更新部署（无需重建容器）
rsync -avz dist/ user@server:/home/website/my-app/
docker exec frontend-11-Nginx基础概述 11-Nginx基础概述 -s reload
```

### 1.3 方式二：构建 Docker 镜像（推荐）

**.dockerignore**：

```plaintext
node_modules
dist
.git
.github
.DS_Store
*.log
.env*
```

**多阶段构建 Dockerfile（Vue/React SPA）**：

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 生产阶段
FROM 11-Nginx基础概述:alpine
COPY --from=builder /app/dist /usr/share/11-Nginx基础概述/html
COPY 11-Nginx基础概述.conf /etc/11-Nginx基础概述/conf.d/default.conf
EXPOSE 80
CMD ["11-Nginx基础概述", "-g", "daemon off;"]
```

**多阶段构建 Dockerfile（Nuxt3 SSR）**：

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder
WORKDIR /app
RUN npm config set registry https://registry.npmmirror.com
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 生产阶段
FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/.output ./.output
EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", ".output/server/index.mjs"]
```

Nuxt3 的 `.output` 目录通过 `bundleDependencies` 自动打包所有运行时依赖，生产阶段无需 `npm install`。

### 1.4 前端镜像构建与运行

```bash
# 构建镜像
docker build -t my-frontend:1.0 .

# 运行容器
docker run -d --name frontend -p 8080:80 my-frontend:1.0

# 查看日志
docker logs -f frontend

# 停止/删除
docker stop frontend && docker rm frontend

# 强制重新构建（清除缓存）
docker build --no-cache -t my-frontend:1.0 .
```

### 1.5 前端环境变量配置

**命令行传递**：

```bash
docker run -d -p 3000:3000 \
  -e BASE_URL=http://api.example.com \
  -e API_KEY=xxx \
  my-nuxt-app:1.0
```

**Docker Compose + .env 文件（推荐）**：

```yaml
services:
  nuxt-app:
    image: nuxt-app:1.0
    container_name: nuxt-app-prod
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - .env.production
```

```bash
# .env.production
BASE_URL=http://api.example.com
API_KEY=your_api_key
NODE_ENV=production
```

### 1.6 前端常见问题与最佳实践

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| 端口被占用 | 宿主机端口冲突 | 修改 ports 映射或停止占用进程 |
| 页面 404 | SPA 路由未配置 try_files | Nginx 添加 `try_files $uri /index.html` |
| 容器启动即退出 | 启动命令错误 | `docker logs` 查看错误日志 |
| 构建缓存导致旧代码 | Docker 层缓存 | `docker build --no-cache` |
| node_modules 兼容问题 | 跨平台 native 模块 | .dockerignore 排除，容器内重新安装 |

**最佳实践**：生产环境优先使用构建镜像方式，确保环境一致性；使用 `.dockerignore` 排除 node_modules；容器构建使用 npm（而非 pnpm）避免软链接路径问题；镜像标签使用语义化版本号便于回滚；敏感配置通过 `.env` 文件或 Docker Secret 注入。

## 二、NestJS 后端容器化部署

NestJS 后端服务的容器化与前端 SSR 项目有显著差异：需要处理 Prisma Client 生成、生产依赖安装、数据库连接配置和日志持久化。

### 2.1 NestJS vs Nuxt3 容器化差异

| 维度 | NestJS（后端 API） | Nuxt3（SSR 前端） |
|------|-------------------|------------------|
| 构建产物 | `dist/` 目录 | `.output/` 目录 |
| 运行时依赖 | 需要 `npm install --omit=dev` | 已打包在 .output 中 |
| Prisma | 需要生成 + 拷贝 Client | 通常不需要 |
| 数据库 | 必须配置连接 | 通常通过 API 间接访问 |
| 端口 | 3000（API 服务） | 3000（Web 服务） |
| 日志 | 需要持久化映射 | 相对轻量 |

**NestJS 容器化流程**：

```mermaid
graph TB
    A[构建阶段] --> B[npm install 全量依赖]
    B --> C[prisma generate 生成 Client]
    C --> D[npm run build 编译 TypeScript]
    D --> E[生产阶段]
    E --> F[npm install --omit=dev]
    F --> G[拷贝 Prisma Client]
    G --> H[拷贝 dist 构建产物]
    H --> I[拷贝 prisma schema]
```

### 2.2 含 Prisma 的 Dockerfile

**package.json 调整**：将 `preinstall: "prisma generate"` 改为手动脚本 `"generate": "prisma generate"`，避免构建阶段自动执行导致失败。

**完整 Dockerfile**：

```dockerfile
# ==================== 构建阶段 ====================
FROM node:18-alpine AS builder

USER node
WORKDIR /home/node/app

RUN npm config set registry https://registry.npmmirror.com

# 复制依赖配置和 Prisma Schema
COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma/

# 安装全量依赖
RUN npm install

# 生成 Prisma Client
RUN npx prisma generate

# 复制源码并构建
COPY --chown=node:node . .
RUN npm run build

# ==================== 生产阶段 ====================
FROM node:18-alpine AS production

USER node
WORKDIR /home/node/app

# 安装生产依赖
COPY --from=builder --chown=node:node /home/node/app/package*.json ./
RUN npm install --omit=dev

# 拷贝 Prisma Client（关键步骤）
COPY --from=builder --chown=node:node /home/node/app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /home/node/app/node_modules/@prisma ./node_modules/@prisma

# 拷贝构建产物
COPY --from=builder --chown=node:node /home/node/app/dist ./dist

# 拷贝 Prisma Schema（运行迁移时需要）
COPY --from=builder --chown=node:node /home/node/app/prisma ./prisma

EXPOSE 3000
ENV NODE_ENV=production
CMD ["node", "dist/main.js"]
```

**关键步骤解析**：

为什么必须手动拷贝 Prisma Client？

- `npm install --omit=dev` 不安装 Prisma CLI（开发依赖）
- 但运行时需要 `@prisma/client` 和 `.prisma/client`（生成的类型）
- 必须从构建阶段拷贝这两个目录

文件拷贝顺序的重要性：

1. `package.json` → 定义依赖
2. `npm install --omit=dev` → 安装生产依赖
3. Prisma Client → 覆盖/补充到 node_modules
4. `dist/` → 最后拷贝构建产物

**.dockerignore**：

```plaintext
node_modules
dist
.git
.github
.env*
*.log
.DS_Store
logs
```

### 2.3 环境变量与数据库配置（NestJS）

**Docker Compose + .env（推荐）**：

```bash
# .env
DATABASE_URL="postgresql://postgres:password@postgres:5432/mydb"
JWT_SECRET="your-secret-key"
PORT=3000
NODE_ENV=production
```

注意：`DATABASE_URL` 中的 host 使用 Docker 服务名 `postgres`（而非 localhost），Docker 内部 DNS 会自动解析。

**命令行传递**：

```bash
docker run -d --name nest-app -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e JWT_SECRET="secret" \
  nest-app:1.0
```

### 2.4 日志映射与持久化（NestJS）

容器删除后内部文件丢失，日志必须通过 Volume 持久化到宿主机：

```yaml
services:
  nest-app:
    image: nest-app:1.0
    volumes:
      - ./logs:/home/node/app/logs    # 日志目录映射
```

NestJS 日志配置（Winston 示例）：

```typescript
// 确保日志输出到文件
const logger = winston.createLogger({
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});
```

### 2.5 Docker Compose 多服务编排（NestJS）

**完整生产配置**：

```yaml
services:
  # PostgreSQL 数据库
  postgres:
    image: postgres:15-alpine
    container_name: postgres-db
    restart: always
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: mydb
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - app-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis 缓存
  redis:
    image: redis:7-alpine
    container_name: redis-cache
    restart: always
    ports:
      - "6379:6379"
    networks:
      - app-network

  # NestJS 应用
  nest-app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: nest-app-prod
    restart: always
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./logs:/home/node/app/logs
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - app-network

volumes:
  postgres-data:

networks:
  app-network:
    driver: bridge
```

**depends_on 与健康检查**：

```yaml
depends_on:
  postgres:
    condition: service_healthy   # 等待数据库健康检查通过
  redis:
    condition: service_started   # 只需启动即可
```

这确保 NestJS 应用不会在数据库就绪前启动，避免连接失败。

### 2.6 NestJS 完整部署流程

```bash
# 1. 构建镜像
docker compose build

# 2. 启动所有服务
docker compose up -d

# 3. 执行数据库迁移
docker compose exec nest-app npx prisma migrate deploy

# 4. 填充初始数据（可选）
docker compose exec nest-app npx prisma db seed

# 5. 查看运行状态
docker compose ps
docker compose logs -f nest-app

# 6. 更新部署
git pull
docker compose build
docker compose up -d
docker compose exec nest-app npx prisma migrate deploy
```

注意：按上面的 Dockerfile，生产镜像里没有 Prisma CLI（在 devDependencies），`npx prisma` 首次执行会临时联网下载；对网络受限的环境，可以在生产阶段保留 prisma CLI，或改为在 CI/宿主机执行迁移。

**常用运维命令**：

```bash
docker compose ps                         # 服务状态
docker compose logs -f nest-app           # 实时日志
docker compose exec nest-app sh           # 进入容器
docker compose restart nest-app           # 重启应用
docker compose down                       # 停止所有
docker compose down -v                    # 停止并删除数据卷
docker compose exec postgres psql -U postgres -d mydb  # 连接数据库
```

### 2.7 常见问题与最佳实践（NestJS）

**数据库连接失败**：

| 原因 | 解决方案 |
|------|---------|
| host 使用 localhost | 改为 Docker 服务名（如 `postgres`） |
| 数据库未就绪 | 配置 `depends_on` + `healthcheck` |
| 密码/端口错误 | 检查 .env 与 postgres 服务配置一致 |
| 网络不通 | 确保在同一 `networks` 下 |

**Prisma Client 找不到**：

```bash
# 确认构建阶段执行了 prisma generate
# 确认生产阶段拷贝了 .prisma 和 @prisma 目录
docker compose exec nest-app ls node_modules/.prisma/client
```

**安全配置清单**：

| 项目 | 要求 |
|------|------|
| 用户 | 非 root（USER node） |
| 文件权限 | COPY --chown=node:node |
| 敏感配置 | env_file 注入，.env 加入 .gitignore |
| 数据库密码 | 不使用默认密码，生产用 Docker Secret |
| 网络 | 内部服务不暴露不必要端口 |

**性能优化**：使用 alpine 镜像减小体积；多阶段构建排除开发依赖；PostgreSQL 数据使用 named volume 持久化；配置 `restart: always` 确保异常自动恢复；日志文件定期轮转避免磁盘占满。

## 三、前端容器化常见问题排查流程

```bash
docker ps -a                           # 查看容器状态
docker logs -f <container>             # 查看日志
docker exec -it <container> sh         # 进入容器调试
netstat -tlnp | grep <port>           # 检查端口占用
docker build --no-cache -t app:1.0 .   # 重新构建
```

## 总结

前端项目容器化有两种方式：Volume 映射适合快速测试和开发环境，构建镜像（推荐）适合生产环境，通过 Nginx 官方镜像 + 多阶段构建 Dockerfile 打包静态资源或 Nuxt3 SSR 产物。

NestJS 后端容器化需要特别处理 Prisma Client：构建阶段生成、生产阶段手动拷贝 `.prisma` 和 `@prisma` 目录；数据库连接使用 Docker 服务名而非 localhost；日志通过 Volume 持久化；通过 Docker Compose 编排 PostgreSQL、Redis、NestJS 多服务，并用 `depends_on` + `healthcheck` 保证容器启动顺序。