---
title: NestJS 部署与 Heroku
description: "NestJS 博客 API 项目从开发到上线的完整部署实战:系统架构与项目结构、Heroku 平台部署、Prisma 数据库设计与迁移、RESTful API 开发与文档、环境变量与部署配置、监控日志、部署进阶与常见问题排查。"
keywords: [NestJS, Heroku, Prisma, 部署, 环境变量]
created: 2026-11-14
updated: 2026-11-14
status: 正式
category: Node.js
tags: [Node.js, NestJS, 部署, Heroku]
---

# NestJS 部署与 Heroku

## 知识架构

```mermaid
mindmap
  root((NestJS项目开发))
    系统架构
      Controller路由层
      Service业务层
      Prisma ORM数据层
      PostgreSQL数据库
    API接口开发
      RESTful设计规范
      CRUD操作实现
      数据验证管道
      异常过滤器
    数据库设计
      Prisma Schema
      数据模型关联
      自动迁移管理
    部署配置
      Heroku云平台
      环境变量管理
      CI/CD流程
```

> 示例代码：[Blog API](https://github.com/linbudu599/tiny-book-blog-api)

---

## 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                    客户端应用层                          │
│            (Web/Mobile/API Client)                      │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP/HTTPS
┌────────────────────▼────────────────────────────────────┐
│                  NestJS 应用层                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Controllers │  │   Services   │  │   Modules    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ Prisma Client
┌────────────────────▼────────────────────────────────────┐
│                Prisma ORM 层                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Schema     │  │   Client     │  │  Migrations  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │ PostgreSQL Protocol
┌────────────────────▼────────────────────────────────────┐
│              Heroku PostgreSQL 数据库                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Articles   │  │   Tags       │  │  Categories  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 请求处理流程

```
请求 → Middleware → Guard → Interceptor → Pipe → Controller
    ↓
Service → Prisma Client → Database
    ↓
响应 ← Interceptor ← Controller
```

---

## 技术栈

### 核心技术

| 技术 | 版本 | 用途 |
|------|------|------|
| NestJS | ^9.0.0 | 企业级 Node.js 框架 |
| Prisma | ^4.0.0 | 下一代 ORM 工具 |
| TypeScript | ^4.9.0 | 类型安全的 JavaScript 超集 |
| PostgreSQL | 14+ | 关系型数据库 |
| Heroku | - | 云应用平台 |

> 以上为示例项目编写时锁定的版本。截至审校时点（2026-09），NestJS 已迭代至 v10/v11，Prisma 已迭代至 v5/v6，核心用法与本文一致，新项目建议使用最新稳定版。

### 开发工具

| 工具 | 用途 |
|------|------|
| @nestjs/cli | NestJS 脚手架工具 |
| prisma | Prisma CLI 工具 |
| Heroku CLI | Heroku 命令行工具 |
| Apifox/Postman | API 测试工具 |

---

## 项目结构

```
blog-api/
├── src/
│   ├── controllers/          # 控制器层
│   │   ├── article.controller.ts
│   │   ├── category.controller.ts
│   │   └── seed.controller.ts
│   ├── services/             # 服务层
│   │   ├── article.service.ts
│   │   ├── category.service.ts
│   │   └── tag.service.ts
│   ├── data/                 # 数据访问层
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   ├── utils/                # 工具函数
│   │   └── response-wrapper.provider.ts
│   ├── types/                # 类型定义
│   │   └── index.ts
│   ├── app.module.ts         # 应用模块
│   └── main.ts               # 应用入口
├── prisma/
│   └── schema.prisma         # Prisma Schema
├── .env                      # 环境变量
├── package.json              # 项目配置
└── Procfile                  # Heroku 配置
```

---

## Heroku 平台部署

### 云服务对比

| 平台 | 特点 | 适用场景 | 免费额度 |
|------|------|----------|----------|
| **Heroku** | 支持 API 部署，提供数据库 | Node/Python/Go API | 有 |
| Vercel | 静态页面 + Serverless | 前端应用 | 有 |
| Netlify | 静态页面部署 | JAMstack 应用 | 有 |
| Surge | 快速静态部署 | 简单静态页面 | 有 |

### Heroku 初始化

#### 1. 注册与创建应用

1. 访问 [Heroku 官网](https://www.heroku.com/) 注册账号
2. 登录后点击右上角 "New" → "Create new app"
3. 输入唯一的应用名称（如：`my-blog-api-2024`）
4. 选择地区（建议选择离用户最近的区域）

#### 2. GitHub 集成

在应用设置页面：

1. 点击 "Deploy" 标签
2. 选择 "Connect to GitHub"
3. 授权并选择对应仓库
4. 点击 "Enable Automatic Deploys"

这样每次推送代码到 GitHub，Heroku 会自动触发部署。

#### 3. CLI 登录配置

由于需要通过代理访问，使用 Auth Token 登录：

```bash
# 方式一：交互式登录（推荐）
heroku login -i
# 输入邮箱作为账号
# 输入 Auth Token 作为密码

# 方式二：使用 API Key
heroku login -i
# Email: your-email@example.com
# Password: <your-auth-token>
```

**获取 Auth Token：**

1. 访问 [Account Settings](https://dashboard.heroku.com/account/applications)
2. 找到 "API Key" 部分
3. 点击 "Reveal" 或 "Generate new token"
4. 复制 Token 用于登录

#### 4. 配置远程仓库

```bash
# 添加 Heroku 远程仓库
heroku git:remote -a <你的应用名>

# 查看远程仓库配置
git remote -v
# 输出示例：
# heroku  https://git.heroku.com/your-app-name.git (fetch)
# heroku  https://git.heroku.com/your-app-name.git (push)
# origin  https://github.com/username/repo.git (fetch)
# origin  https://github.com/username/repo.git (push)
```

### 数据库配置

#### 安装 PostgreSQL Add-on

1. 访问 [Heroku PostgreSQL](https://elements.heroku.com/addons/heroku-postgresql)
2. 点击 "Install heroku-postgresql"
3. 选择目标应用并确认安装
4. 数据库连接字符串会自动注入到环境变量 `DATABASE_URL`

#### 查看环境变量

在应用页面点击 "Settings" → "Config Vars" → "Reveal Config Vars"，可以看到：

```
DATABASE_URL: postgres://user:password@host:port/database
```

---

## 数据库设计与配置

### 数据模型设计

#### Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 文章标签：TS / Node / React / SSR 等
model Tag {
  id          String    @id @default(cuid())
  name        String
  description String?
  articles    Article[]
  
  @@map("tags")
}

// 文章分类：技术 / 感想 / 总结 等
model Category {
  id          String    @id @default(cuid())
  name        String
  description String?
  articles    Article[]
  
  @@map("categories")
}

// 文章主表
model Article {
  id          Int       @id @default(autoincrement())
  title       String?
  description String    @default("这篇文章还没有介绍...")
  content     String
  visible     Boolean   @default(true)
  
  // 关联关系
  tags        Tag[]
  categories  Category[]
  
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  
  @@map("articles")
}
```

#### 数据关系图

```
┌──────────────┐         ┌──────────────┐
│   Category   │         │     Tag      │
├──────────────┤         ├──────────────┤
│ id (String)  │         │ id (String)  │
│ name         │         │ name         │
│ description  │         │ description  │
└──────┬───────┘         └──────┬───────┘
       │                        │
       │                        │
       └──────────┬─────────────┘
                  │
                  │ 多对多关系
          ┌───────▼────────┐
          │    Article     │
          ├────────────────┤
          │ id (Int)       │
          │ title          │
          │ description    │
          │ content        │
          │ visible        │
          │ createdAt      │
          │ updatedAt      │
          └────────────────┘
```

### 数据库初始化

#### 本地环境配置

创建 `.env` 文件：

```env
# 本地开发环境
DATABASE_URL="postgresql://user:password@localhost:5432/blog_dev?schema=public"

# Heroku 生产环境（从 Heroku 复制）
# DATABASE_URL="postgres://..."
```

#### 数据库迁移命令

```bash
# 1. 推送 Schema 到数据库（开发阶段）
prisma db push

# 2. 生成 Prisma Client
prisma generate

# 3. 查看数据库数据（可视化工具）
prisma studio

# 4. 创建迁移文件（生产环境推荐）
prisma migrate dev --name init

# 5. 应用迁移到生产环境
prisma migrate deploy
```

#### 数据库同步流程

```bash
# 步骤 1: 配置环境变量
echo 'DATABASE_URL="postgres://..."' > .env

# 步骤 2: 同步数据库结构
prisma db push

# 输出示例：
# Environment variables loaded from .env
# Prisma schema loaded from prisma/schema.prisma
# Datasource "db": PostgreSQL database "blog-db", schema "public" at "host:5432"
#
# Your database is now in sync with your Prisma schema.

# 步骤 3: 生成客户端
prisma generate
```

---

## API 接口开发

### 响应格式设计

#### 统一响应包装器

```typescript
// src/utils/response-wrapper.provider.ts

import { MaybeNull } from '../types';

/**
 * 状态码枚举
 */
export enum StatusCode {
  RESOLVED = 10000,  // 成功
  REJECTED = 10001,  // 失败
}

/**
 * 基础响应包装器
 */
export class ResponseWrapper<TData = any> {
  constructor(
    public statusCode: StatusCode,
    public data: TData,
    public message?: string,
  ) {
    this.statusCode = statusCode;
    this.data = data;
    // 注意括号：?? 优先级低于三元运算符的条件判断，需显式分组
    this.message =
      message ?? (statusCode === StatusCode.RESOLVED ? 'Success' : 'Failed');
  }
}

/**
 * 成功响应
 */
export class ResolvedResponse<TData = any> extends ResponseWrapper<TData> {
  constructor(public data: TData, public message?: string) {
    super(StatusCode.RESOLVED, data, message);
  }
}

/**
 * 失败响应
 */
export class RejectedResponse<TData = any> extends ResponseWrapper<TData> {
  constructor(public data: MaybeNull<TData>, public message?: string) {
    super(StatusCode.REJECTED, data, message);
  }
}

/**
 * 响应联合类型
 */
export type ResponseUnion<TData> = Promise<
  ResolvedResponse<MaybeNull<TData>> | RejectedResponse<MaybeNull<TData>>
>;
```

#### 响应示例

**成功响应：**

```json
{
  "statusCode": 10000,
  "data": {
    "id": 1,
    "title": "文章标题",
    "content": "文章内容"
  },
  "message": "Success"
}
```

**失败响应：**

```json
{
  "statusCode": 10001,
  "data": null,
  "message": "Failed"
}
```

### Service 层实现

#### Article Service

```typescript
// src/services/article.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../data/prisma.service';
import {
  ResolvedResponse,
  RejectedResponse,
  ResponseUnion,
} from '../utils/response-wrapper.provider';
import { Article, ArticleCreateInput, ArticleUpdateInput } from '../types';

@Injectable()
export class ArticleService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建文章
   */
  async create(createInput: ArticleCreateInput): ResponseUnion<Article> {
    try {
      const res = await this.prisma.article.create({
        data: createInput,
        include: {
          categories: true,
          tags: true,
        },
      });
      return new ResolvedResponse(res);
    } catch (error) {
      return new RejectedResponse(null, error.message);
    }
  }

  /**
   * 更新文章
   */
  async update(updateInput: ArticleUpdateInput): ResponseUnion<Article> {
    const { id } = updateInput;
    try {
      // 检查记录是否存在
      const record = await this.prisma.article.findUnique({
        where: { id },
        include: {
          categories: true,
          tags: true,
        },
      });

      if (!record) {
        return new RejectedResponse(null, 'Article not found');
      }

      // 更新记录
      const res = await this.prisma.article.update({
        where: { id },
        data: updateInput,
        include: {
          categories: true,
          tags: true,
        },
      });

      return new ResolvedResponse(res);
    } catch (error) {
      return new RejectedResponse(null, error.message);
    }
  }

  /**
   * 查询文章列表
   */
  async queryRecords(
    includeInvisible: boolean = false,
  ): ResponseUnion<Article[]> {
    try {
      const res = await this.prisma.article.findMany({
        where: includeInvisible
          ? {}
          : {
              visible: true,
            },
        include: {
          categories: true,
          tags: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      return new ResolvedResponse(res);
    } catch (error) {
      return new RejectedResponse(null, error.message);
    }
  }

  /**
   * 查询单篇文章
   */
  async querySingleRecord(id: number): ResponseUnion<Article> {
    try {
      const res = await this.prisma.article.findUnique({
        where: { id },
        include: {
          categories: true,
          tags: true,
        },
      });
      return new ResolvedResponse(res);
    } catch (error) {
      return new RejectedResponse(null, error.message);
    }
  }

  /**
   * 删除文章
   */
  async delete(id: number): ResponseUnion<Article> {
    try {
      const res = await this.prisma.article.delete({
        where: { id },
      });
      return new ResolvedResponse(res);
    } catch (error) {
      return new RejectedResponse(null, error.message);
    }
  }
}
```

### Controller 层实现

#### Article Controller

```typescript
// src/controllers/article.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { ArticleService } from '../services/article.service';
import { ArticleCreateInput, ArticleUpdateInput } from '../types';
import { ResponseUnion } from '../utils/response-wrapper.provider';
import { Article } from '@prisma/client';

@Controller('/article')
export class ArticleController {
  constructor(private readonly articleService: ArticleService) {}

  /**
   * 创建文章
   * POST /article/create
   */
  @Post('/create')
  async create(
    @Body() createInput: ArticleCreateInput,
  ): ResponseUnion<Article> {
    return await this.articleService.create(createInput);
  }

  /**
   * 更新文章
   * POST /article/update
   */
  @Post('/update')
  async update(
    @Body() updateInput: ArticleUpdateInput,
  ): ResponseUnion<Article> {
    return await this.articleService.update(updateInput);
  }

  /**
   * 查询文章列表
   * GET /article
   */
  @Get('/')
  async query(): ResponseUnion<Article[]> {
    return await this.articleService.queryRecords();
  }

  /**
   * 查询单篇文章
   * GET /article/:id
   */
  @Get('/:id')
  async queryById(
    @Param('id', ParseIntPipe) id: number,
  ): ResponseUnion<Article> {
    return await this.articleService.querySingleRecord(id);
  }

  /**
   * 删除文章
   * DELETE /article/:id
   */
  @Delete('/:id')
  async delete(
    @Param('id', ParseIntPipe) id: number,
  ): ResponseUnion<Article> {
    return await this.articleService.delete(id);
  }
}
```

---

## API 接口文档

### 接口列表

| 接口路径 | 方法 | 描述 | 参数 |
|---------|------|------|------|
| `/article` | GET | 获取文章列表 | - |
| `/article/:id` | GET | 获取单篇文章 | id: number |
| `/article/create` | POST | 创建文章 | ArticleCreateInput |
| `/article/update` | POST | 更新文章 | ArticleUpdateInput |
| `/article/:id` | DELETE | 删除文章 | id: number |

### 详细接口说明

#### 1. 获取文章列表

**请求：**

```http
GET /article HTTP/1.1
Host: your-api.herokuapp.com
```

**响应：**

```json
{
  "statusCode": 10000,
  "data": [
    {
      "id": 1,
      "title": "文章标题",
      "description": "文章描述",
      "content": "文章内容",
      "visible": true,
      "tags": [
        {
          "id": "clxxx...",
          "name": "TypeScript"
        }
      ],
      "categories": [
        {
          "id": "clxxx...",
          "name": "技术"
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "message": "Success"
}
```

#### 2. 创建文章

**请求：**

```http
POST /article/create HTTP/1.1
Host: your-api.herokuapp.com
Content-Type: application/json

{
  "title": "我的第一篇文章",
  "content": "这是文章内容",
  "description": "文章简介",
  "tagIds": ["clxxx..."],
  "categoryIds": ["clxxx..."]
}
```

**响应：**

```json
{
  "statusCode": 10000,
  "data": {
    "id": 1,
    "title": "我的第一篇文章",
    "content": "这是文章内容",
    "description": "文章简介",
    "visible": true,
    "tags": [...],
    "categories": [...],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  "message": "Success"
}
```

#### 3. 更新文章

**请求：**

```http
POST /article/update HTTP/1.1
Host: your-api.herokuapp.com
Content-Type: application/json

{
  "id": 1,
  "title": "更新后的标题",
  "content": "更新后的内容",
  "visible": false
}
```

#### 4. 删除文章

**请求：**

```http
DELETE /article/1 HTTP/1.1
Host: your-api.herokuapp.com
```

---

## 配置参数详解

### 环境变量配置

#### 本地开发环境 (.env)

```env
# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/blog_dev?schema=public"

# 应用配置
PORT=3000
NODE_ENV=development

# 可选：JWT 密钥（如需认证功能）
JWT_SECRET=your-secret-key-here
```

#### 生产环境 (Heroku Config Vars)

在 Heroku Dashboard → Settings → Config Vars 中配置：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `DATABASE_URL` | 数据库连接（自动注入） | `postgres://...` |
| `NODE_ENV` | 运行环境 | `production` |
| `JWT_SECRET` | JWT 密钥 | `random-string` |

### 应用配置文件

#### main.ts 配置

```typescript
// src/main.ts

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  // CORS 配置
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // 端口配置（Heroku 动态端口）
  const PORT = process.env.PORT ?? 3000;
  await app.listen(PORT);

  console.log(`Application is running on: http://localhost:${PORT}`);
}

bootstrap();
```

#### package.json 配置

```json
{
  "name": "blog-api",
  "version": "1.0.0",
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main",
    "prisma:gen": "prisma generate",
    "postinstall": "npm run prisma:gen"
  },
  "dependencies": {
    "@nestjs/common": "^9.0.0",
    "@nestjs/core": "^9.0.0",
    "@nestjs/platform-express": "^9.0.0",
    "@prisma/client": "^4.0.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.2.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^9.0.0",
    "@types/node": "^18.0.0",
    "prisma": "^4.0.0",
    "typescript": "^4.9.0"
  }
}
```

---

## 部署配置

### Heroku 配置文件

#### Procfile

创建 `Procfile` 文件（无扩展名）：

```ini
web: npm run start:prod
```

**说明：**
- `web`: 进程类型，表示 Web 应用
- `npm run start:prod`: 生产环境启动命令

### 部署流程

#### 完整部署步骤

```bash
# 1. 确保代码已提交
git add .
git commit -m "准备部署"

# 2. 推送到 Heroku（首次部署或测试）
git push heroku main

# 3. 查看构建日志
heroku logs --tail

# 4. 打开应用
heroku open

# 5. 查看应用状态
heroku ps
```

#### 自动部署流程

配置 GitHub 集成后：

```
代码推送到 GitHub
      ↓
Heroku 自动检测
      ↓
拉取最新代码
      ↓
安装依赖 (npm install)
      ↓
执行 postinstall (prisma generate)
      ↓
构建应用 (npm run build)
      ↓
启动应用 (npm run start:prod)
      ↓
应用就绪
```

### 数据库迁移

#### 生产环境数据库操作

```bash
# 方式一：通过 Heroku CLI
heroku run prisma migrate deploy

# 方式二：连接到生产数据库
heroku pg:psql

# 方式三：本地连接生产数据库
DATABASE_URL=$(heroku config:get DATABASE_URL) prisma migrate deploy
```

---

## 常见问题

### 1. Heroku 登录失败

**问题：** 运行 `heroku login` 时提示 IP 地址不匹配

**解决方案：** 使用 Auth Token 登录

```bash
# 1. 生成 Token
# 访问 https://dashboard.heroku.com/account/applications
# 点击 "Generate new token"

# 2. 使用 Token 登录
heroku login -i
# Email: your-email@example.com
# Password: <paste-your-token-here>
```

### 2. 数据库连接失败

**问题：** 本地连接 Heroku 数据库失败

**原因：** Heroku 应用休眠导致数据库资源被回收

**解决方案：**

```bash
# 唤醒应用
heroku ps:scale web=1

# 或访问应用 URL
heroku open

# 或使用 keep-alive 服务（如 UptimeRobot）
```

### 3. Prisma Client 未生成

**问题：** 部署后提示找不到 Prisma Client

**解决方案：** 确保 `postinstall` 脚本配置正确

```json
{
  "scripts": {
    "postinstall": "npm run prisma:gen",
    "prisma:gen": "prisma generate"
  }
}
```

### 4. 端口绑定失败

**问题：** 应用无法启动，提示端口被占用

**解决方案：** 使用环境变量 PORT

```typescript
// src/main.ts
const PORT = process.env.PORT ?? 3000;
await app.listen(PORT);
```

### 5. TypeScript 类型错误

**问题：** Prisma 类型推导报错

**解决方案：**

```typescript
// 方式一：显式声明返回类型
async create(data: ArticleCreateInput): Promise<Article> {
  return this.prisma.article.create({ data });
}

// 方式二：使用类型导入
import { Article } from '@prisma/client';
```

### 6. 部署超时

**问题：** 部署过程中构建超时

**解决方案：**

```bash
# 增加构建超时时间
heroku config:set BUILD_TIMEOUT=1800

# 清理缓存重新部署
heroku repo:purge_cache -a your-app-name
git push heroku main
```

### 7. Heroku 部署后数据库迁移如何执行？

```bash
# 方式一：使用 Heroku CLI
heroku run npx prisma migrate deploy -a your-app-name
```

方式二：在 package.json 中配置 postinstall

```json
{
  "scripts": {
    "postinstall": "prisma generate",
    "heroku-postbuild": "prisma migrate deploy"
  }
}
```

### 8. 如何解决 Heroku 数据库连接超时问题？

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['query', 'info', 'warn', 'error'],
});

// Heroku PostgreSQL 连接池配置
// 在 DATABASE_URL 后添加参数
// postgres://user:pass@host:port/db?pgbouncer=true&connect_timeout=10
```

### 9. 如何处理 Heroku 的冷启动问题？

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 预热数据库连接
  try {
    await app.get(PrismaService).$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
  }

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

### 10. 如何实现优雅关闭？

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 启用优雅关闭
  app.enableShutdownHooks();

  await app.listen(3000);
}
bootstrap();

// 在服务中处理关闭事件
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy() {
    await this.$disconnect();
    console.log('Database connection closed');
  }
}
```

### 11. 如何配置环境变量？

```typescript
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
  ],
})
export class AppModule {}

// 使用环境变量
constructor(private configService: ConfigService) {
  const dbUrl = this.configService.get<string>('DATABASE_URL');
}
```

### 12. 如何处理 CORS 问题？

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 开发环境
  if (process.env.NODE_ENV === 'development') {
    app.enableCors({
      origin: 'http://localhost:3000',
      credentials: true,
    });
  }

  // 生产环境
  if (process.env.NODE_ENV === 'production') {
    app.enableCors({
      origin: ['https://example.com', 'https://www.example.com'],
      credentials: true,
    });
  }

  await app.listen(3000);
}
```

### 13. 如何实现请求限流？

```typescript
import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

@Injectable()
export class RateLimiterMiddleware implements NestMiddleware {
  private limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 100, // 每个 IP 最多 100 次请求
    message: {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      message: 'Too many requests, please try again later.',
    },
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.limiter(req, res, next);
  }
}

// 在模块中配置
consumer.apply(RateLimiterMiddleware).forRoutes('*');
```

### 14. 如何调试生产环境问题？

```typescript
import { Logger, Injectable } from '@nestjs/common';

@Injectable()
export class DebugService {
  private readonly logger = new Logger(DebugService.name);

  logRequest(req: Request, res: Response, duration: number) {
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (process.env.NODE_ENV === 'production') {
      this.logger.log(JSON.stringify(logData));
    } else {
      this.logger.debug(logData);
    }
  }
}
```

### 15. 如何处理数据库连接断开问题？

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private retryAttempts = 5;
  private retryDelay = 3000;

  async onModuleInit() {
    await this.connectWithRetry();
  }

  private async connectWithRetry(attempt = 1): Promise<void> {
    try {
      await this.$connect();
      console.log('Database connected successfully');
    } catch (error) {
      console.error(`Database connection attempt ${attempt} failed:`, error.message);

      if (attempt < this.retryAttempts) {
        console.log(`Retrying in ${this.retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.connectWithRetry(attempt + 1);
      }

      throw error;
    }
  }
}
```

### 16. 如何监控应用性能？

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = process.hrtime();

    return next.handle().pipe(
      tap(() => {
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds * 1000 + nanoseconds / 1000000;

        if (duration > 1000) {
          console.warn(`Slow request detected: ${duration.toFixed(2)}ms`);
        }

        // 发送到监控系统
        // this.metricsService.recordDuration('request_duration', duration);
      }),
    );
  }
}
```

---

## 测试接口

### 使用 Apifox/Postman 测试

#### 1. 创建文章

**URL:** `POST https://your-app.herokuapp.com/article/create`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "title": "测试文章",
  "content": "这是测试内容",
  "description": "测试描述",
  "tagIds": [],
  "categoryIds": []
}
```

#### 2. 查询文章列表

**URL:** `GET https://your-app.herokuapp.com/article`

#### 3. 查询单篇文章

**URL:** `GET https://your-app.herokuapp.com/article/1`

#### 4. 更新文章

**URL:** `POST https://your-app.herokuapp.com/article/update`

**Body:**
```json
{
  "id": 1,
  "title": "更新后的标题"
}
```

#### 5. 删除文章

**URL:** `DELETE https://your-app.herokuapp.com/article/1`

---

## 进阶优化建议

### 1. 添加验证

```typescript
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  visible?: boolean;
}
```

### 2. 添加日志

```typescript
import { Logger } from '@nestjs/common';

export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);

  async create(data: CreateArticleDto) {
    this.logger.log(`Creating article: ${data.title}`);
    // ...
  }
}
```

### 3. 添加缓存

```typescript
import { CacheModule, CacheService } from '@nestjs/cache-manager';

@Module({
  imports: [
    CacheModule.register({
      ttl: 900, // 15分钟
      max: 100, // 最大缓存数
    }),
  ],
})
export class AppModule {}
```

### 4. 添加限流

```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,    // 时间窗口（秒）
      limit: 10,  // 最大请求数
    }),
  ],
})
export class AppModule {}
```

### 5. API 文档

```typescript
// 安装依赖
// npm install @nestjs/swagger

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Blog API')
    .setDescription('博客 API 文档')
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
```

访问 `http://localhost:3000/api` 查看文档。

---

## 监控与日志

### 应用日志配置

NestJS 内置了日志系统，也支持自定义日志实现：

```typescript
import { LoggerService, Injectable } from '@nestjs/common';

@Injectable()
export class CustomLogger implements LoggerService {
  log(message: string, context?: string) {
    this.printMessage('LOG', message, context);
  }

  error(message: string, trace?: string, context?: string) {
    this.printMessage('ERROR', message, context);
    if (trace) console.error(trace);
  }

  warn(message: string, context?: string) {
    this.printMessage('WARN', message, context);
  }

  debug(message: string, context?: string) {
    this.printMessage('DEBUG', message, context);
  }

  verbose(message: string, context?: string) {
    this.printMessage('VERBOSE', message, context);
  }

  private printMessage(level: string, message: string, context?: string) {
    const timestamp = new Date().toISOString();
    const ctx = context ? ` [${context}]` : '';
    console.log(`[${timestamp}] ${level}${ctx}: ${message}`);
  }
}

// 在 main.ts 中使用
const app = await NestFactory.create(AppModule, {
  logger: new CustomLogger(),
});
```

### 结构化日志

使用 winston 实现结构化日志：

```typescript
import { Injectable } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class WinstonLoggerService {
  private logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'blog-api' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, context }) => {
              return `${timestamp} [${context || 'App'}] ${level}: ${message}`;
            })
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
        }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }
}
```

### 健康检查

使用 `@nestjs/terminus` 实现健康检查：

```typescript
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 150 * 1024 * 1024),
    ]);
  }
}
```

### 性能监控

使用拦截器记录请求耗时：

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const contentLength = response.get('content-length');

        this.logger.log(
          `${method} ${url} ${statusCode} ${contentLength || 0}bytes - ${Date.now() - now}ms - ${ip} - ${userAgent}`
        );
      }),
    );
  }
}

// 全局注册
app.useGlobalInterceptors(new LoggingInterceptor());
```

---

## 部署进阶

### Docker 容器化部署

#### Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

USER nestjs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "dist/main.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  api:
    build: .
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/blog
      - NODE_ENV=production
    depends_on:
      - db
    restart: unless-stopped

  db:
    image: postgres:14-alpine
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=blog
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'

volumes:
  postgres_data:
```

### PM2 进程管理

#### ecosystem.config.js

```javascript
module.exports = {
  apps: [
    {
      name: 'blog-api',
      script: 'dist/main.js',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

#### PM2 常用命令

```bash
# 启动应用
pm2 start ecosystem.config.js --env production

# 查看状态
pm2 status

# 查看日志
pm2 logs blog-api

# 重启应用
pm2 restart blog-api

# 停止应用
pm2 stop blog-api

# 保存进程列表
pm2 save

# 设置开机自启
pm2 startup
```

### Nginx 反向代理

```nginx
upstream blog_api {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name api.example.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://blog_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 总结

### 关键知识点回顾

| 主题 | 要点 |
|------|------|
| **项目架构** | 模块化设计、分层架构、依赖注入 |
| **数据库** | Prisma Schema 定义、迁移管理、类型安全 |
| **API 设计** | RESTful 规范、统一响应格式、错误处理 |
| **部署** | Heroku 配置、环境变量、数据库连接 |
| **监控** | 日志系统、健康检查、性能监控 |

### 最佳实践清单

- [ ] 使用环境变量管理配置
- [ ] 实现统一的错误处理机制
- [ ] 配置请求日志记录
- [ ] 启用 CORS 安全配置
- [ ] 实现优雅关闭机制
- [ ] 配置健康检查端点
- [ ] 使用 HTTPS 加密传输
- [ ] 实现请求限流保护
- [ ] 配置数据库连接池
- [ ] 定期备份数据库

### 下一步学习方向

1. **认证授权**：JWT、OAuth2、RBAC 权限控制
2. **微服务**：消息队列、服务发现、分布式追踪
3. **GraphQL**：Schema 定义、Resolver 实现、订阅功能
4. **测试**：单元测试、E2E 测试、测试覆盖率
5. **CI/CD**：GitHub Actions、自动化部署、版本管理
