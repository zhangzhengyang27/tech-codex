---
title: NestJS 快速上手
description: "NestJS 核心教学:环境准备、Controller/Service/Module、依赖注入、管道与异常过滤器,以及 Prisma ORM 的 Schema 设计、迁移与 NestJS 集成实战。"
keywords: [NestJS, Prisma, TypeScript, 依赖注入, ORM]
created: 2026-11-14
updated: 2026-11-14
status: 正式
category: Node.js
tags: [Node.js, NestJS, Prisma]
---

# NestJS 快速上手

## 知识架构

```mermaid
mindmap
  root((NestJS前置知识))
    NestJS核心
      装饰器驱动的架构
      Controller路由层
      Service业务层
      Module模块系统
      依赖注入IoC
    Prisma ORM
      Schema定义DSL
      自动类型生成
      客户端查询API
      关联关系映射
    NestJS集成Prisma
      服务层实现
      模块配置
      类型定义复用
    环境准备
      Heroku平台
      PostgreSQL数据库
```

---

## 概述

本文档介绍使用 TypeScript 开发 Node.js API 所需的前置知识，技术选型包括：

- **框架**: [NestJS](https://docs.nestjs.com/) - 企业级 Node.js 框架
- **ORM**: [Prisma](https://www.prisma.io/) - 下一代数据库工具
- **部署**: [Heroku](https://dashboard.heroku.com/apps) - 云平台与数据库服务

> **前置要求**: 基本的 Node.js 使用经验，至少使用 Express/Koa 进行过基本的 API 开发，了解数据库、ORM 的基本概念。

> **代码示例**: [Blog API](https://github.com/linbudu599/tiny-book-blog-api)

---

## 技术栈介绍

### NestJS 特点

| 特性 | 说明 |
|------|------|
| **架构风格** | 使用装饰器和依赖注入（IoC & DI），受 Angular 启发 |
| **框架能力** | 内置路由、ORM 集成、消息队列、Open API、鉴权、GraphQL 等 |
| **模块化** | 清晰的模块划分，适合大型项目 |
| **TypeScript 原生** | 完整的类型支持 |

### Prisma 特点

| 特性 | 说明 |
|------|------|
| **类型安全** | 基于 Schema 自动生成 TypeScript 类型 |
| **Schema 优先** | 使用专门的 DSL 定义数据模型 |
| **自动迁移** | 支持数据库迁移管理 |
| **多数据库支持** | PostgreSQL、MySQL、SQLite、SQL Server 等 |

---

## 环境准备

### Heroku 环境配置

在正式开始前，建议先配置 Heroku 环境（安装时间较长，可后台运行）。

**macOS 安装方式:**

```bash
# 方式一: HomeBrew
brew tap heroku/brew && brew install heroku

# 方式二: 官方脚本
curl https://cli-assets.heroku.com/install.sh | sh
```

**其他系统安装方式:**

参考官方文档 [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)。

**验证安装:**

```bash
heroku --version
# heroku/8.x.x darwin-x64 node-v16.x.x

# 登录 Heroku
heroku login
```

---

## NestJS 基础

### 核心概念

NestJS 与 Express、Koa 的主要区别在于**应用风格**与**框架能力**：

**应用风格:**

- 大量使用装饰器和依赖注入
- 模块间引用关系清晰解耦
- 适合大型项目开发

**框架能力:**

NestJS 提供完整的生态系统：

| 功能模块 | 官方包 | 说明 |
|----------|--------|------|
| ORM 集成 | `@nestjs/typeorm`, `@nestjs/mongoose` | 数据库操作 |
| 消息队列 | `@nestjs/bull` | 基于 Redis 的队列 |
| Open API | `@nestjs/swagger` | 自动生成 API 文档 |
| 鉴权 | `@nestjs/passport` | 身份认证 |
| GraphQL | `@nestjs/graphql`, `@nestjs/apollo` | GraphQL 支持 |

### 项目结构

**创建项目:**

```bash
# 全局安装 NestJS CLI
npm install -g @nestjs/cli

# 创建新项目
nest new blog-api

# 进入项目目录
cd blog-api
```

**初始目录结构:**

```
blog-api/
├── src/
│   ├── app.controller.ts    # 路由控制器
│   ├── app.module.ts        # 根模块
│   ├── app.service.ts       # 业务服务
│   └── main.ts              # 应用入口
├── test/                    # 测试目录
├── package.json             # 依赖配置
├── nest-cli.json            # Nest CLI 配置
└── tsconfig.json            # TypeScript 配置
```

### 核心组件详解

#### Controller（控制器）

控制器负责处理 HTTP 请求，进行参数校验和响应包装。业务逻辑应委托给 Service 层处理。

```typescript
import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query('page') page: number, @Query('limit') limit: number) {
    return this.usersService.findAll({ page, limit });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }
}
```

**常用装饰器:**

| 装饰器 | 用途 | 示例 |
|--------|------|------|
| `@Controller()` | 定义控制器路由前缀 | `@Controller('users')` |
| `@Get()`, `@Post()`, `@Put()`, `@Delete()` | HTTP 方法装饰器 | `@Get('profile')` |
| `@Param()` | 路由参数 | `@Param('id')` |
| `@Query()` | 查询参数 | `@Query('page')` |
| `@Body()` | 请求体 | `@Body() dto: CreateUserDto` |
| `@Headers()` | 请求头 | `@Headers('authorization')` |

#### Service（服务）

服务层处理具体的业务逻辑、数据库交互、第三方 API 调用等。

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findAll(options: { page: number; limit: number }): Promise<User[]> {
    const { page = 1, limit = 10 } = options;
    return this.usersRepository.find({
      skip: (page - 1) * limit,
      take: limit,
    });
  }

  async findOne(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }
}
```

**最佳实践 - 细粒度服务拆分:**

不要在 Service 中创建与 Controller 1:1 对应的方法，而是拆分为更细粒度的服务：

```typescript
// ❌ 不推荐: 粗粒度服务
async updateUser(updateUserDto: UpdateUserDto) {
  // 所有逻辑都写在这里
}

// ✅ 推荐: 细粒度服务组合
async updateUser(updateUserDto: UpdateUserDto) {
  await this.usersService.checkExists(updateUserDto.id);
  await this.permissionService.checkMutationAvailable(updateUserDto.id);
  const user = await this.usersService.update(updateUserDto);
  await this.notificationService.notifyFollowers(user);
  return user;
}
```

#### Module（模块）

模块是组织应用结构的核心，用于封装相关功能。

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [],           // 导入其他模块
  controllers: [UsersController],  // 注册控制器
  providers: [UsersService],       // 注册服务
  exports: [UsersService],         // 导出服务供其他模块使用
})
export class UsersModule {}
```

#### Main（入口）

应用启动入口，配置全局设置。

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));
  
  // 启用 CORS
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });
  
  // 设置全局前缀
  app.setGlobalPrefix('api/v1');
  
  await app.listen(3000);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
```

### 依赖注入

NestJS 内置依赖注入容器，自动管理服务的创建和注入。

```typescript
// 定义服务
@Injectable()
export class LoggerService {
  log(message: string) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

// 在控制器中注入
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly loggerService: LoggerService, // 自动注入
  ) {}

  @Get()
  findAll() {
    this.loggerService.log('Fetching all users');
    return this.usersService.findAll();
  }
}
```

### 模块系统

**模块类型:**

| 类型 | 装饰器 | 说明 |
|------|--------|------|
| 普通模块 | `@Module()` | 功能模块 |
| 全局模块 | `@Global()` | 全局可用，无需重复导入 |
| 动态模块 | `register()` / `forRoot()` | 可配置模块 |

```typescript
// 全局模块示例
@Global()
@Module({
  providers: [LoggerService, ConfigService],
  exports: [LoggerService, ConfigService],
})
export class SharedModule {}
```

---

## Prisma 基础

### Prisma 简介

Prisma 是现代 Node.js ORM，与传统 ORM 的区别：

| 对比项 | 传统 ORM (TypeORM/Sequelize) | Prisma |
|--------|------------------------------|--------|
| 定义方式 | 类装饰器 | Schema DSL |
| 类型安全 | 手动维护 | 自动生成 |
| 迁移管理 | 手动 | 自动 |
| 查询构建 | 链式调用 | 类型安全 API |

**工作流程:**

```
Schema 定义 → prisma generate → Prisma Client → 类型安全的数据库操作
```

### Schema 定义

**初始化 Prisma:**

```bash
# 安装 Prisma CLI
npm install prisma --save-dev

# 初始化 Prisma
npx prisma init
```

生成的文件:

```
prisma/
└── schema.prisma    # Schema 定义文件
.env                 # 环境变量（数据库连接）
```

**Schema 基础语法:**

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  // 可选: 自定义输出路径
  // output   = "./generated/client"
}

datasource db {
  provider = "postgresql"  // 数据库类型
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  password  String
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")  // 映射到数据库表名
}

model Post {
  id          Int       @id @default(autoincrement())
  title       String
  content     String?
  published   Boolean   @default(false)
  author      User      @relation(fields: [authorId], references: [id])
  authorId    Int
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@map("posts")
}
```

**常用字段属性:**

| 属性 | 说明 | 示例 |
|------|------|------|
| `@id` | 主键 | `id Int @id` |
| `@default()` | 默认值 | `@default(autoincrement())`, `@default(now())`, `@default(cuid())` |
| `@unique` | 唯一约束 | `email String @unique` |
| `@relation` | 关联关系 | `@relation(fields: [authorId], references: [id])` |
| `?` | 可选字段 | `name String?` |
| `[]` | 数组/多对多 | `posts Post[]` |

**常用模型属性:**

| 属性 | 说明 | 示例 |
|------|------|------|
| `@@map()` | 映射表名 | `@@map("users")` |
| `@@unique()` | 复合唯一约束 | `@@unique([email, username])` |
| `@@index()` | 索引 | `@@index([email])` |

### 客户端使用

**生成 Prisma Client:**

```bash
npx prisma generate
```

**基本使用:**

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 查询所有用户
const users = await prisma.user.findMany();

// 条件查询
const user = await prisma.user.findFirst({
  where: { email: 'user@example.com' },
});

// 创建用户
const newUser = await prisma.user.create({
  data: {
    email: 'new@example.com',
    name: 'New User',
    password: 'hashed_password',
  },
});

// 更新用户
const updatedUser = await prisma.user.update({
  where: { id: 1 },
  data: { name: 'Updated Name' },
});

// 删除用户
await prisma.user.delete({
  where: { id: 1 },
});
```

**高级查询:**

```typescript
// 分页查询
const users = await prisma.user.findMany({
  skip: 0,      // 偏移量
  take: 10,     // 每页数量
  orderBy: {
    createdAt: 'desc',
  },
});

// 关联查询
const usersWithPosts = await prisma.user.findMany({
  include: {
    posts: true,
  },
});

// 选择特定字段
const userNames = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    email: true,
  },
});

// 复杂条件查询
const posts = await prisma.post.findMany({
  where: {
    OR: [
      { title: { contains: 'NestJS' } },
      { content: { contains: 'TypeScript' } },
    ],
    AND: [
      { published: true },
    ],
  },
});

// 聚合查询
const result = await prisma.post.aggregate({
  where: { published: true },
  _count: { id: true },
  _avg: { views: true },
});
```

**事务处理:**

```typescript
// 交互式事务
const result = await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({
    data: { email: 'test@example.com', name: 'Test' },
  });
  
  const post = await tx.post.create({
    data: { title: 'First Post', authorId: user.id },
  });
  
  return { user, post };
});

// 批量操作
const result = await prisma.$transaction([
  prisma.user.create({ data: { email: 'user1@example.com' } }),
  prisma.user.create({ data: { email: 'user2@example.com' } }),
]);
```

### 关联关系

**一对一关系:**

```prisma
model User {
  id      Int      @id @default(autoincrement())
  profile Profile?
}

model Profile {
  id     Int  @id @default(autoincrement())
  userId Int  @unique
  user   User @relation(fields: [userId], references: [id])
}
```

**一对多关系:**

```prisma
model User {
  id    Int    @id @default(autoincrement())
  posts Post[]
}

model Post {
  id       Int  @id @default(autoincrement())
  authorId Int
  author   User @relation(fields: [authorId], references: [id])
}
```

**多对多关系:**

```prisma
model Article {
  id        Int        @id @default(autoincrement())
  title     String
  tags      Tag[]
  categories Category[]
}

model Tag {
  id       Int       @id @default(autoincrement())
  name     String
  articles Article[]
}

model Category {
  id       Int       @id @default(autoincrement())
  name     String
  articles Article[]
}
```

**关联查询示例:**

```typescript
// 创建带关联的数据
const article = await prisma.article.create({
  data: {
    title: 'NestJS 实战',
    content: '...',
    tags: {
      connect: [
        { id: 1 },  // 连接已存在的 Tag
        { id: 2 },
      ],
    },
    categories: {
      create: [  // 创建新的 Category
        { name: '后端开发' },
      ],
    },
  },
});

// 查询关联数据
const articleWithRelations = await prisma.article.findUnique({
  where: { id: 1 },
  include: {
    tags: true,
    categories: true,
  },
});
```

---

## NestJS 集成 Prisma

### 服务层实现

创建 Prisma 服务，封装数据库连接生命周期。

**创建 `prisma.service.ts`:**

```typescript
import {
  Injectable,
  OnApplicationShutdown,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'info' },
        { emit: 'stdout', level: 'warn' },
        { emit: 'stdout', level: 'error' },
      ],
    });
  }

  async onApplicationBootstrap() {
    await this.$connect();
    console.log('Database connected');
  }

  async onApplicationShutdown() {
    await this.$disconnect();
    console.log('Database disconnected');
  }
}
```

### 模块配置

**创建 `prisma.module.ts`:**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()  // 全局模块，其他模块无需显式导入
@Module({
  providers: [PrismaService],
  exports: [PrismaService],  // 导出供其他模块使用
})
export class PrismaModule {}
```

**在 AppModule 中导入:**

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,   // 全局模块，只需导入一次
    UsersModule,
  ],
})
export class AppModule {}
```

### 类型定义复用

Prisma 自动生成类型定义，可以直接复用。

**创建类型定义文件 `types/index.ts`:**

```typescript
import type { Prisma } from '@prisma/client';

// 复用 Prisma 生成的类型
export type UserCreateInput = Prisma.UserCreateInput;
export type UserUpdateInput = Prisma.UserUpdateInput;
export type UserWhereUniqueInput = Prisma.UserWhereUniqueInput;
export type PostCreateInput = Prisma.PostCreateInput;

// 导出模型类型
export type { User, Post, Profile } from '@prisma/client';

// 自定义类型组合
export type UserWithPosts = Prisma.UserGetPayload<{
  include: { posts: true };
}>;

// 分页参数类型
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

**在 Service 中使用类型:**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  User,
  UserCreateInput,
  UserUpdateInput,
  UserWithPosts,
  PaginationParams,
  PaginatedResult,
} from '../types';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findAll(params: PaginationParams): Promise<PaginatedResult<User>> {
    const { page = 1, limit = 10 } = params;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async update(id: number, data: UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async remove(id: number): Promise<User> {
    return this.prisma.user.delete({
      where: { id },
    });
  }

  async findWithPosts(id: number): Promise<UserWithPosts | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: { posts: true },
    });
  }
}
```

---

## 配置参数详解

### NestJS 配置

**nest-cli.json:**

```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "deleteOutDir": true,
    "assets": ["templates/**/*"],  // 复制非 TS 文件
    "watchAssets": true
  }
}
```

**tsconfig.json (关键配置):**

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,   // 必须: 装饰器元数据
    "experimentalDecorators": true,  // 必须: 装饰器支持
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "strictBindCallApply": true,
    "forceConsistentCasingInFileNames": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### Prisma 配置

**Schema 配置选项:**

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch"]  // 预览功能
  binaryTargets   = ["native", "rhel-openssl-1.1.x"]  // 跨平台编译
}

datasource db {
  provider          = "postgresql"
  url               = env("DATABASE_URL")
  shadowDatabaseUrl = env("SHADOW_DATABASE_URL")  // 用于迁移
}

// 环境变量示例 (.env)
// DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
```

**Prisma Client 配置:**

```typescript
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' },
  ],
  errorFormat: 'colorless',
  // 自定义日志
  __internal: {
    engine: {
      cwd: '/custom/path',
    },
  },
});

// 监听查询日志
prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

---

## 最佳实践

### 目录结构推荐

**按功能模块拆分（适合小型项目）:**

```
src/
├── controllers/
│   ├── users.controller.ts
│   └── posts.controller.ts
├── services/
│   ├── users.service.ts
│   └── posts.service.ts
├── entities/
│   ├── user.entity.ts
│   └── post.entity.ts
├── dto/
│   ├── create-user.dto.ts
│   └── create-post.dto.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── app.module.ts
└── main.ts
```

**按业务模块拆分（适合大型项目）:**

```
src/
├── modules/
│   ├── users/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   └── posts/
│       ├── posts.controller.ts
│       ├── posts.service.ts
│       └── posts.module.ts
├── common/
│   ├── filters/        # 异常过滤器
│   ├── guards/         # 守卫
│   ├── interceptors/   # 拦截器
│   ├── pipes/          # 管道
│   └── decorators/     # 自定义装饰器
├── config/             # 配置文件
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── types/              # 类型定义
├── app.module.ts
└── main.ts
```

### DTO 数据传输对象

使用 class-validator 进行参数校验：

```typescript
// dto/create-user.dto.ts
import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

// dto/update-user.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### 异常处理

```typescript
import { 
  Controller, 
  Get, 
  Param, 
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  async findOne(@Param('id') id: string) {
    if (isNaN(+id)) {
      throw new BadRequestException('Invalid ID format');
    }

    const user = await this.usersService.findOne(+id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }
}
```

### 环境变量管理

使用 `@nestjs/config` 管理配置：

```typescript
// config/configuration.ts
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
  },
});

// app.module.ts
import { ConfigModule, ConfigService } from '@nestjs/config';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
  ],
})
export class AppModule {}

// 使用配置
@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}
  
  getDatabaseConfig() {
    return {
      host: this.configService.get<string>('database.host'),
      port: this.configService.get<number>('database.port'),
    };
  }
}
```

### 数据库迁移

```bash
# 创建迁移
npx prisma migrate dev --name init

# 部署迁移（生产环境）
npx prisma migrate deploy

# 重置数据库
npx prisma migrate reset

# 查看迁移状态
npx prisma migrate status

# 生成 Prisma Client
npx prisma generate
```

### 项目分层架构

```
src/
├── modules/              # 功能模块
│   ├── users/
│   │   ├── dto/         # 数据传输对象
│   │   ├── entities/    # 实体定义
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   └── users.module.ts
│   └── auth/
├── common/              # 公共模块
│   ├── decorators/      # 自定义装饰器
│   ├── filters/         # 异常过滤器
│   ├── guards/          # 守卫
│   ├── interceptors/    # 拦截器
│   ├── pipes/           # 管道
│   └── interfaces/      # 公共接口
├── config/              # 配置文件
├── prisma/              # Prisma 相关
│   ├── schema.prisma
│   └── prisma.service.ts
└── main.ts
```

### 多环境配置与 TypeORM 集成

```typescript
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        autoLoadEntities: true,
        synchronize: false,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

### 日志最佳实践

```typescript
import { Injectable, LoggerService } from '@nestjs/common';
import { Logger } from 'winston';
import * as winston from 'winston';

@Injectable()
export class CustomLogger implements LoggerService {
  private logger: Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
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

---

## 常见问题解答

### Q1: NestJS 与 Express/Koa 如何选择？

**选择 NestJS 的场景:**

- 大型团队协作项目
- 需要完整的技术栈解决方案
- 重视代码结构和可维护性
- 需要微服务、GraphQL 等高级功能

**选择 Express/Koa 的场景:**

- 小型项目或原型开发
- 团队对 NestJS 学习成本敏感
- 需要极致的灵活性

### Q2: Prisma 与 TypeORM 如何选择？

| 对比项 | Prisma | TypeORM |
|--------|--------|---------|
| 学习曲线 | 较低（Schema 语法简单） | 较高（装饰器语法复杂） |
| 类型安全 | 自动生成，100% 安全 | 需要手动维护 |
| 性能 | 较好 | 一般 |
| 迁移 | 自动管理 | 手动管理 |
| 社区生态 | 快速增长 | 成熟稳定 |

**推荐选择 Prisma 的场景:**

- 新项目，重视类型安全
- TypeScript 项目
- 需要快速原型开发

**推荐选择 TypeORM 的场景:**

- 现有项目迁移
- 需要 Active Record 模式
- 复杂的关联查询场景

### Q3: 如何处理 Prisma 连接问题？

**问题:** `Can't reach database server at ...`

**解决方案:**

1. 检查 `.env` 文件中的 `DATABASE_URL` 是否正确
2. 确保数据库服务已启动
3. 检查网络连接和防火墙设置
4. 使用连接池优化连接：

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});
```

### Q4: 如何优化 Prisma 查询性能？

**使用 `select` 代替 `include`:**

```typescript
// ❌ 不推荐: 获取所有字段
const user = await prisma.user.findMany({
  include: { posts: true },
});

// ✅ 推荐: 只获取需要的字段
const user = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    posts: {
      select: { id: true, title: true },
    },
  },
});
```

**使用索引:**

```prisma
model User {
  email String @unique
  
  @@index([email])  // 添加索引
  @@index([createdAt])
}
```

### Q5: 如何实现软删除？

**使用中间件实现软删除:**

```typescript
// prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super();
    
    // 添加软删除中间件
    this.$use(async (params, next) => {
      if (params.model === 'User') {
        if (params.action === 'delete') {
          // 将 delete 改为 update
          params.action = 'update';
          params.args['data'] = { deletedAt: new Date() };
        }
        if (params.action === 'findMany' || params.action === 'findFirst') {
          // 过滤已删除数据
          params.args.where = params.args.where || {};
          params.args.where.deletedAt = null;
        }
      }
      return next(params);
    });
  }
}
```

**Schema 定义:**

```prisma
model User {
  id        Int       @id @default(autoincrement())
  email     String
  name      String
  deletedAt DateTime?
}
```

### Q6: 如何进行数据库事务处理？

```typescript
// 方式一: $transaction
const result = await this.prisma.$transaction([
  this.prisma.user.update({
    where: { id: 1 },
    data: { balance: { decrement: 100 } },
  }),
  this.prisma.user.update({
    where: { id: 2 },
    data: { balance: { increment: 100 } },
  }),
]);

// 方式二: 交互式事务
const result = await this.prisma.$transaction(async (tx) => {
  const sender = await tx.user.update({
    where: { id: 1 },
    data: { balance: { decrement: 100 } },
  });
  
  if (sender.balance < 0) {
    throw new Error('Insufficient balance');
  }
  
  const receiver = await tx.user.update({
    where: { id: 2 },
    data: { balance: { increment: 100 } },
  });
  
  return { sender, receiver };
});
```

### Q7: 生产环境部署注意事项？

**环境变量配置:**

```bash
# .env.production
DATABASE_URL="postgresql://user:password@host:5432/db?schema=public"
NODE_ENV=production
PORT=3000
```

**Dockerfile 示例:**

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma/
RUN npx prisma generate

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

**健康检查:**

```typescript
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch (error) {
      return { status: 'error', database: 'disconnected' };
    }
  }
}
```

### Q8: NestJS 与 Express 的关系是什么？

NestJS 底层默认使用 Express 作为 HTTP 服务器，但也可以配置为使用 Fastify：

```typescript
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter()
  );
  await app.listen(3000);
}
bootstrap();
```

### Q9: 如何在 NestJS 中使用中间件？

```typescript
import {
  Injectable,
  MiddlewareConsumer,
  Module,
  NestMiddleware,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  }
}

// 在模块中配置
@Module({
  // ...
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: 'users', method: RequestMethod.ALL });
  }
}
```

### Q10: 如何处理全局异常？

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'string' ? message : (message as any).message,
    });
  }
}

// 在 main.ts 中注册
app.useGlobalFilters(new GlobalExceptionFilter());
```

### Q11: 如何实现数据验证？

使用 `class-validator` 和 `class-transformer` 进行 DTO 验证：

```typescript
import { IsString, IsInt, IsEmail, Min, Max, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsEmail()
  email: string;

  @IsInt()
  @Min(0)
  @Max(120)
  @Type(() => Number)
  age: number;

  @IsOptional()
  @IsString()
  bio?: string;
}

// 在 main.ts 中启用全局验证
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

### Q12: 如何配置数据库连接池？

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### Q13: 如何实现分页查询？

```typescript
interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

async findAll(params: PaginationParams): Promise<PaginatedResult<User>> {
  const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    this.prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
    }),
    this.prisma.user.count(),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
}
```

### Q14: 如何处理文件上传？

```typescript
import { Controller, Post, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('upload')
export class UploadController {
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `avatar-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
          return callback(new Error('Only image files are allowed'), false);
        }
        callback(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    })
  )
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    return {
      filename: file.filename,
      path: `/uploads/${file.filename}`,
      size: file.size,
    };
  }
}
```

### Q15: 如何实现 API 版本控制？

```typescript
import { Controller, Get, Version } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  @Version('1')
  findAllV1() {
    return 'This is version 1';
  }

  @Get()
  @Version('2')
  findAllV2() {
    return 'This is version 2';
  }
}

// 在 main.ts 中启用版本控制
app.enableVersioning({
  type: VersioningType.URI,
});
```

### Q16: 如何配置 CORS？

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000', 'https://example.com'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization',
  });

  await app.listen(3000);
}
```

### Q17: 如何使用 Swagger 生成 API 文档？

```typescript
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Blog API')
    .setDescription('The blog API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3000);
}

// 在 Controller 中添加装饰器
@ApiTags('users')
@Controller('users')
export class UsersController {
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Return all users' })
  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
```

---

## 总结

本文档介绍了 NestJS 和 Prisma 的核心概念及集成方法：

| 主题 | 关键要点 |
|------|----------|
| **NestJS** | 模块化架构、依赖注入、装饰器语法 |
| **Prisma** | Schema DSL、类型安全、自动迁移 |
| **集成** | 全局模块、生命周期管理、类型复用 |
| **最佳实践** | 目录结构、DTO 校验、异常处理、环境配置 |

---

## 扩展阅读

### NestJS 应用目录结构的不同组织方式

#### 按功能拆分（Feature-based）

适用于项目规模较小的情况：

```
project/
├── src/
│   ├── controllers/
│   ├── services/
│   ├── providers/
│   ├── app.module.ts
│   └── main.ts
├── package.json
└── tsconfig.json
```

#### 按逻辑拆分（Domain-based）

适用于存在一定规模的项目：

```
project/
├── src/
│   ├── user/
│   │   ├── user.controller.ts
│   │   ├── user.service.ts
│   │   └── user.module.ts
│   ├── post/
│   │   ├── post.controller.ts
│   │   ├── post.service.ts
│   │   └── post.module.ts
│   ├── app.module.ts
│   └── main.ts
├── package.json
└── tsconfig.json
```

### Data Mapper 与 Active Record

#### Active Record 模式

实体类直接拥有 CRUD 方法：

```typescript
// TypeORM Active Record 示例
@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}

// 使用方式
const user = new User();
user.name = 'John';
await user.save();  // 实体自己保存

const users = await User.find({ isActive: true });  // 静态方法查询
```

**优点:** 简单直接，代码量少  
**缺点:** 测试困难，耦合度高

#### Data Mapper 模式

通过 Repository 进行操作：

```typescript
// TypeORM Data Mapper 示例
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}

// 使用方式
const userRepository = connection.getRepository(User);

const user = new User();
user.name = 'John';
await userRepository.save(user);  // 通过 Repository 保存

const users = await userRepository.find({ isActive: true });
```

**优点:** 职责分离，测试友好  
**缺点:** 代码量较多

**Prisma 使用的是 Data Mapper 模式:**

```typescript
const prisma = new PrismaClient();

const user = await prisma.user.create({
  data: { name: 'John' },
});
```

### ORM 与 QueryBuilder 对比

#### ORM

通过实体类映射数据库表：

```typescript
// TypeORM ORM 方式
const users = await userRepository.find({
  where: { isActive: true },
  relations: ['posts'],
});
```

**优点:** 面向对象，开发效率高  
**缺点:** 复杂查询性能较差，灵活性不足

#### QueryBuilder

通过链式调用构建 SQL：

```typescript
// TypeORM Query Builder
const users = await getConnection()
  .createQueryBuilder()
  .select('user')
  .from(User, 'user')
  .leftJoinAndSelect('user.posts', 'post')
  .where('user.isActive = :isActive', { isActive: true })
  .orderBy('user.createdAt', 'DESC')
  .getMany();
```

**优点:** 灵活，贴近原生 SQL，性能可控  
**缺点:** 代码量多，没有类型安全

**常用 QueryBuilder 工具:**

| 工具 | 特点 |
|------|------|
| [Knex.js](https://github.com/knex/knex) | 简单灵活，无类型 |
| [Kysely](https://github.com/koskimas/kysely) | TypeScript 原生，类型安全 |
| TypeORM QueryBuilder | 集成在 ORM 中 |

**技术选型建议:**

```
简单 CRUD → ORM (Prisma/TypeORM)
复杂查询 → QueryBuilder (Kysely)
混合使用 → ORM + QueryBuilder
```

### 参考资源

**NestJS:**

- [官方文档](https://docs.nestjs.com/)
- [GitHub 仓库](https://github.com/nestjs/nest)
- [NestJS 中文文档](https://nestjs.bootcss.com/)

**Prisma:**

- [官方文档](https://www.prisma.io/docs/)
- [GitHub 仓库](https://github.com/prisma/prisma)
- [Prisma 实战系列](https://juejin.cn/post/6973277530996342798)

**部署:**

- [Heroku 部署指南](https://devcenter.heroku.com/articles/deploying-nodejs)
- [Docker 部署 NestJS](https://docs.docker.com/samples/nestjs/)

### 官方资源

- [NestJS 官方文档](https://docs.nestjs.com/)
- [Prisma 官方文档](https://www.prisma.io/docs/)
- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)

### 进阶主题

- [NestJS 认证与授权](https://docs.nestjs.com/security/authentication)
- [NestJS 微服务架构](https://docs.nestjs.com/microservices/basics)
- [NestJS GraphQL 集成](https://docs.nestjs.com/graphql/quick-start)
- [NestJS WebSockets](https://docs.nestjs.com/websockets/gateways)
- [Prisma 数据库迁移](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma 性能优化](https://www.prisma.io/docs/guides/performance-and-optimization)

### 社区资源

- [NestJS GitHub](https://github.com/nestjs/nest)
- [Prisma GitHub](https://github.com/prisma/prisma)
- [NestJS Awesome](https://github.com/nestjs/awesome-nestjs)
- [Prisma Examples](https://github.com/prisma/prisma-examples)

### 部署相关

- [Heroku Node.js 最佳实践](https://devcenter.heroku.com/articles/node-best-practices)
- [Docker 部署 NestJS](https://docs.docker.com/samples/nestjs/)
- [AWS 部署 NestJS](https://docs.nestjs.com/deployment)
- [PM2 进程管理](https://pm2.keymetrics.io/docs/usage/quick-start/)
