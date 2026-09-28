---
title: SSR 项目部署实战
description: "SSR 项目部署实战：NVM 安装 Node.js、PM2 基础与 ecosystem.config.js 配置（env_production 环境变量、集群模式、开机自启），NestJS 与 Nuxt.js 构建产物部署步骤和常见问题排查。"
keywords: [SSR, 部署, NVM, Node.js, PM2, NestJS, Nuxt.js, 环境变量]
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# SSR 项目部署实战

> 学习目标：掌握 Node.js 环境安装、PM2 进程管理、NestJS 部署、Nuxt.js 部署、PM2 配置文件、环境变量配置。

## 一、SSR 部署概述

```
SSR 项目部署核心要点：
│
├── 1. 环境准备：安装 Node.js（推荐 NVM）、PM2、Nginx（反向代理）、配置数据库连接
├── 2. 项目构建：NestJS npm run build → dist；Nuxt.js npm run build → .output
├── 3. 文件上传：构建产物、package.json、依赖锁定文件、环境配置文件
├── 4. 依赖安装：安装生产依赖、配置国内镜像源
├── 5. 进程管理：PM2 启动、集群模式、配置文件、开机自启
└── 6. 反向代理：Nginx 配置、负载均衡、SSL、域名绑定
```

## 二、Node.js 环境安装（NVM）

### 2.1 NVM 简介

NVM（Node Version Manager）是 Node.js 版本管理工具，可以安装多个 Node.js 版本、随时切换版本，推荐生产环境使用。常用命令：

```
nvm install <version>    # 安装指定版本
nvm use <version>        # 使用指定版本
nvm ls                   # 查看已安装版本
nvm ls-remote            # 查看远程可用版本
nvm alias default <version>  # 设置默认版本
nvm current              # 查看当前使用版本
```

### 2.2 安装 NVM

```bash
# 方式一：官方脚本（国外服务器）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 方式二：国内镜像（国内服务器，推荐）
curl -o- https://gitee.com/mirrors/nvm/raw/master/install.sh | bash

# 使配置生效并验证
source ~/.bashrc
nvm --version
```

> NVM 安装脚本会将仓库克隆到 `~/.nvm` 目录，并在 `~/.bashrc` 中添加 `export NVM_DIR="$HOME/.nvm"` 等配置。

### 2.3 安装 Node.js

```bash
# 安装 Node.js 18.x LTS
nvm install 18.16.0
nvm use 18.16.0
nvm alias default 18.16.0

# 验证
node -v    # v18.16.0
npm -v     # 9.x.x

# 配置国内镜像源
export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node
npm config set registry https://registry.npmmirror.com
```

## 三、PM2 进程管理

### 3.1 PM2 安装与基础命令

```bash
# 全局安装
npm install -g pm2
# 或使用 cnpm（国内）
cnpm install -g pm2

# 验证
pm2 --version
```

**PM2 基础命令速查**：

```
├── 启动应用
│   ├── pm2 start app.js：启动应用
│   ├── pm2 start app.js --name my-app：启动并命名
│   ├── pm2 start app.js -i max：集群模式启动
│   ├── pm2 start ecosystem.config.js：使用配置文件启动
│   └── pm2 start app.js --env production：指定环境变量
├── 管理应用
│   ├── pm2 stop/restart/delete my-app
│   ├── pm2 reload my-app：重载应用（零停机）
│   └── pm2 kill：杀死所有进程
├── 查看应用
│   ├── pm2 list / pm2 show / pm2 describe
│   └── pm2 monit：监控面板
├── 查看日志
│   ├── pm2 logs / pm2 logs my-app
│   ├── pm2 flush：清空日志
│   └── pm2 reloadLogs：重载日志
└── 开机自启
    ├── pm2 startup：生成开机自启命令
    └── pm2 save：保存当前应用列表
```

### 3.2 PM2 启动模式

| 模式 | 命令 | 特点 | 适用 |
|------|------|------|------|
| Fork 模式（单进程） | `pm2 start app.js` | 单进程运行、无法利用多核 CPU | 简单应用、开发环境 |
| Cluster 模式（集群） | `pm2 start app.js -i max` | 多进程运行、自动负载均衡 | 生产环境、高并发场景 |

```bash
# 启动最大 CPU 核心数个进程
pm2 start app.js -i max
# 启动指定数量进程
pm2 start app.js -i 4
```

### 3.3 PM2 配置文件

**创建 ecosystem.config.js**：

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'my-app',                    // 应用名称
      script: './dist/main.js',          // 入口文件

      // 进程配置
      instances: 'max',                  // 进程数量：max | 数字
      exec_mode: 'cluster',              // 执行模式：fork | cluster
      watch: false,                      // 是否监听文件变化
      max_memory_restart: '1G',          // 内存达到 1G 自动重启

      // 环境变量
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        BASE_URL: 'http://192.168.31.77:3000',
      },

      // 日志配置
      error_file: './logs/err.log',      // 错误日志
      out_file: './logs/out.log',        // 输出日志
      log_date_format: 'YYYY-MM-DD HH:mm:ss', // 日志日期格式

      // 其他配置
      merge_logs: true,                  // 合并日志
      autorestart: true,                 // 自动重启
      max_restarts: 10,                  // 最大重启次数
      restart_delay: 1000,               // 重启延迟（毫秒）
    },
  ],
}
```

**使用配置文件**：

```bash
pm2 start ecosystem.config.js                    # 默认环境
pm2 start ecosystem.config.js --env production   # 生产环境
pm2 restart ecosystem.config.js
```

## 四、NestJS 项目部署

### 4.1 NestJS 构建配置

**修改 .swcrc 配置（生产环境优化）**：

```json
{
  "sourceMaps": false,    // 关闭 sourceMap
  "minify": true,         // 开启代码压缩
  "jsc": {
    "target": "es2017",
    "parser": {
      "syntax": "typescript",
      "decorators": true,
      "dynamicImport": true
    },
    "transform": {
      "decoratorMetadata": true
    }
  }
}
```

**构建项目**：

```bash
npm run build
# 构建产物：dist/main.js（入口文件）、dist/app.module.js、dist/modules/...
```

### 4.2 NestJS 部署文件清单

```
必须文件：dist/（构建产物）、package.json、pnpm-lock.yaml、.env（环境变量）、.npmrc（可选）
可选文件：ecosystem.config.js、11-Nginx基础概述.conf、README.md
不需要上传：src/（源代码）、test/、node_modules/、.git/
```

### 4.3 NestJS 部署步骤

**步骤一：上传文件**：

```bash
scp -r dist/* user@server:/home/server/project-backend-nestjs/
scp package.json user@server:/home/server/project-backend-nestjs/
scp pnpm-lock.yaml user@server:/home/server/project-backend-nestjs/
scp .env user@server:/home/server/project-backend-nestjs/
```

**步骤二：安装依赖**：

```bash
ssh user@server
cd /home/server/project-backend-nestjs

pnpm install --prod       # 或 npm install --omit=dev / cnpm install --prod
```

**步骤三：配置环境变量**：

```bash
vi .env
DATABASE_URL="mysql://user:password@localhost:3306/database"
PORT=3000
```

**步骤四：测试启动**：

```bash
node dist/main.js
# [Nest] 12345  - INFO [NestApplication] Nest application successfully started
```

**步骤五：PM2 启动**：

```bash
# 方式一：直接启动
pm2 start dist/main.js --name nestjs-app

# 方式二：使用配置文件
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'nestjs-app',
    script: './dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    }
  }]
}
pm2 start ecosystem.config.js --env production
```

**NestJS 生产日志配置**：

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],  // 生产环境只记录错误、警告、日志
  })
  await app.listen(3000)
  Logger.log(`Application is running on: ${await app.getUrl()}`)
}
bootstrap()
```

## 五、Nuxt.js 项目部署

### 5.1 Nuxt.js 构建配置

```json
// package.json
{
  "engines": {
    "pnpm": ">=8.6.0"
  }
}
```

```ini
# .npmrc
; 行内注释在 npm 配置文件中会并入值，注释要单独成行
shamefully-hoist=true
```

```bash
# 构建 Nuxt.js 项目
npm run build
# 构建产物：.output/server/index.mjs（入口）、.output/server/package.json、.output/public/
```

### 5.2 Nuxt.js 部署步骤

**步骤一：上传文件**：

```bash
scp -r .output user@server:/home/server/project-frontend-nuxt/
scp package.json user@server:/home/server/project-frontend-nuxt/
scp pnpm-lock.yaml user@server:/home/server/project-frontend-nuxt/
scp .npmrc user@server:/home/server/project-frontend-nuxt/
```

**步骤二：安装依赖**：

```bash
npm install -g pnpm

cd /home/server/project-frontend-nuxt
pnpm install --prod

# 进入 .output/server 安装服务端依赖
cd .output/server
pnpm install --prod
# 或使用国内镜像
pnpm install --prod --registry=https://registry.npmmirror.com
```

**步骤三：测试启动**：

```bash
cd /home/server/project-frontend-nuxt
node .output/server/index.mjs            # 默认端口 3000
PORT=3010 node .output/server/index.mjs  # 指定端口
# Listening on http://[::]:3010
```

**步骤四：PM2 启动**：

```bash
# 方式一：直接启动
PORT=3010 pm2 start .output/server/index.mjs --name nuxt-app

# 方式二：使用配置文件
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'nuxt-app',
    script: './.output/server/index.mjs',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3015,
      BASE_URL: 'http://192.168.31.77:3000',
    }
  }]
}
pm2 start ecosystem.config.js --env production
```

**Nuxt.js 环境变量在 ecosystem.config.js 中配置**（使用 `env_production`，运行时通过 `pm2 start ecosystem.config.js --env production`，用 `pm2 show nuxt-app` 验证是否生效）。

## 六、PM2 高级配置

### 6.1 多应用管理

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'nestjs-app',
      script: './backend/dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: { NODE_ENV: 'production', PORT: 3000 },
    },
    {
      name: 'nuxt-app',
      script: './frontend/.output/server/index.mjs',
      instances: 2,
      exec_mode: 'cluster',
      env_production: { NODE_ENV: 'production', PORT: 3015, BASE_URL: 'http://localhost:3000' },
    },
  ],
}
```

```bash
pm2 start ecosystem.config.js --env production
pm2 list
pm2 logs nestjs-app
```

### 6.2 开机自启

```bash
pm2 startup
# 执行输出的命令（示例）：
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username
pm2 save
systemctl status pm2-username
```

## 七、完整部署脚本

**NestJS 部署脚本**：

```bash
#!/bin/bash

# NestJS 部署脚本
SERVER_USER="user"
SERVER_IP="192.168.31.77"
SERVER_PATH="/home/server/project-backend-nestjs"

npm run build

rsync -avz --delete dist/ $SERVER_USER@$SERVER_IP:$SERVER_PATH/dist/
rsync -avz package.json $SERVER_USER@$SERVER_IP:$SERVER_PATH/
rsync -avz pnpm-lock.yaml $SERVER_USER@$SERVER_IP:$SERVER_PATH/
rsync -avz .env $SERVER_USER@$SERVER_IP:$SERVER_PATH/

ssh $SERVER_USER@$SERVER_IP << 'EOF'
cd /home/server/project-backend-nestjs
pnpm install --prod
EOF

ssh $SERVER_USER@$SERVER_IP "pm2 restart nestjs-app"
echo "Deployment completed!"
```

**Nuxt.js 部署脚本**：

```bash
#!/bin/bash

# Nuxt.js 部署脚本
SERVER_USER="user"
SERVER_IP="192.168.31.77"
SERVER_PATH="/home/server/project-frontend-nuxt"

npm run build

rsync -avz --delete .output/ $SERVER_USER@$SERVER_IP:$SERVER_PATH/.output/
rsync -avz package.json $SERVER_USER@$SERVER_IP:$SERVER_PATH/
rsync -avz pnpm-lock.yaml $SERVER_USER@$SERVER_IP:$SERVER_PATH/
rsync -avz .npmrc $SERVER_USER@$SERVER_IP:$SERVER_PATH/

ssh $SERVER_USER@$SERVER_IP << 'EOF'
cd /home/server/project-frontend-nuxt
pnpm install --prod
cd .output/server
pnpm install --prod
EOF

ssh $SERVER_USER@$SERVER_IP "pm2 restart nuxt-app"
echo "Deployment completed!"
```

## 八、常见问题与解决方案

**NVM 安装问题**：无法连接 GitHub → 使用国内镜像（gitee）；`nvm: command not found` → `source ~/.bashrc` 并检查 `~/.bashrc` 中是否有 nvm 配置。

**PM2 启动问题**：端口被占用（`EADDRINUSE: :::3000`）→ `lsof -i :3000` 后用 `kill -9 <PID>` 或换端口（`PORT=3001 pm2 start app.js`）；模块找不到 → `pnpm install --prod` 重新安装。

**依赖安装问题**：pnpm 依赖结构错误（`Cannot find module '../node_modules/xxx'`）→ 在 `.npmrc` 配置 `shamefully-hoist=true`；国内下载慢 → 配置镜像 `npm config set registry https://registry.npmmirror.com`。

## 九、最佳实践

```
SSR 部署最佳实践：
├── 环境准备：使用 NVM 管理 Node.js 版本、配置默认版本、配置国内镜像源、全局安装 PM2
├── 构建优化：关闭 sourceMap、开启代码压缩、配置生产环境变量
├── 文件上传：只上传必要文件，不上传 node_modules 和源代码
├── 依赖安装：使用 --prod 参数、配置国内镜像源
├── 进程管理：使用 PM2 配置文件、配置集群模式、环境变量、开机自启
└── 监控与日志：配置日志文件、定期清理、PM2 监控、告警通知
```

### PM2 最佳实践

- 使用配置文件（ecosystem.config.js）集中管理所有配置并纳入版本控制
- 生产环境使用集群模式，instances 设置为 max 或具体数字，充分利用多核 CPU
- 环境变量用 env_production 配置，不在代码中硬编码，区分不同环境
- 配置日志文件路径与格式，定期清理日志
- 使用 `pm2 startup` + `pm2 save` 配置开机自启

## 十、命令速查表

### NVM 命令速查

| 命令 | 说明 |
|------|------|
| `curl -o- https://gitee.com/mirrors/nvm/raw/master/install.sh \| bash` | 安装 NVM（国内镜像） |
| `nvm install 18.16.0` | 安装 Node.js |
| `nvm use 18.16.0` | 使用指定版本 |
| `nvm alias default 18.16.0` | 设置默认版本 |
| `nvm ls` / `nvm ls-remote` | 查看已安装/远程可用版本 |

### PM2 命令速查

| 命令 | 说明 |
|------|------|
| `pm2 start app.js --name my-app` | 启动应用并命名 |
| `pm2 start app.js -i max` | 集群模式启动 |
| `pm2 start ecosystem.config.js --env production` | 使用配置文件启动（生产环境） |
| `pm2 stop / restart / delete / reload my-app` | 管理应用 |
| `pm2 list / show / monit` | 查看应用/详情/监控 |
| `pm2 startup` + `pm2 save` | 开机自启 |

## 总结

SSR 项目部署是全栈开发的核心技能，掌握 NVM 安装 Node.js、PM2 进程管理、NestJS 部署、Nuxt.js 部署，对实际项目部署非常重要。推荐使用 PM2 配置文件管理应用，配置集群模式提高性能。