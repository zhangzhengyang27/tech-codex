---
title: NestJS 快速上手
description: "从环境准备到博客 API 全流程实战：NestJS 核心概念（Controller/Service/Module、依赖注入）、Prisma ORM 集成与迁移、Heroku 部署，以及 SWC 编译器与 REPL 调试模式等开发工具。"
keywords: []
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# NestJS 快速上手


---


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

## 概述

本文档介绍使用 TypeScript 开发 Node.js API 所需的前置知识，技术选型包括：

- **框架**: [NestJS](https://docs.nestjs.com/) - 企业级 Node.js 框架
- **ORM**: [Prisma](https://www.prisma.io/) - 下一代数据库工具
- **部署**: [Heroku](https://dashboard.heroku.com/apps) - 云平台与数据库服务

> **前置要求**: 基本的 Node.js 使用经验，至少使用 Express/Koa 进行过基本的 API 开发，了解数据库、ORM 的基本概念。

> **代码示例**: [Blog API](https://github.com/linbudu599/tiny-book-blog-api)

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

## 总结

本文档介绍了 NestJS 和 Prisma 的核心概念及集成方法：

| 主题 | 关键要点 |
|------|----------|
| **NestJS** | 模块化架构、依赖注入、装饰器语法 |
| **Prisma** | Schema DSL、类型安全、自动迁移 |
| **集成** | 全局模块、生命周期管理、类型复用 |
| **最佳实践** | 目录结构、DTO 校验、异常处理、环境配置 |

---

下一节将进入实际的 API 开发与部署阶段。

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

---

## 常见问题解答

### Q1: NestJS 与 Express 的关系是什么？

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

### Q2: 如何在 NestJS 中使用中间件？

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

### Q3: 如何处理全局异常？

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

### Q4: 如何实现数据验证？

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

### Q5: 如何配置数据库连接池？

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

### Q6: 如何实现分页查询？

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

### Q7: 如何处理文件上传？

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

### Q8: 如何实现 API 版本控制？

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

### Q9: 如何配置 CORS？

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

### Q10: 如何使用 Swagger 生成 API 文档？

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

## 最佳实践

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

### 环境变量管理

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

## 扩展阅读

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

---


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

> 本节代码见：[Blog API](https://github.com/linbudu599/tiny-book-blog-api)

## 概述

本文档详细介绍了如何使用 NestJS 框架和 Prisma ORM 开发一个完整的博客 API，并将其部署到 Heroku 云平台。通过本节的学习，你将掌握：

- NestJS 框架的核心概念和最佳实践
- Prisma ORM 的使用方法
- 云平台部署流程
- RESTful API 设计规范
- 数据库设计与迁移

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

## 总结

通过本节的学习，我们完成了：

1. **系统架构设计** - NestJS + Prisma + PostgreSQL 的完整架构
2. **Heroku 平台部署** - 从注册到部署的完整流程
3. **数据库设计** - Prisma Schema 设计与迁移
4. **API 开发** - RESTful 接口的完整实现
5. **生产配置** - 环境变量、部署配置、错误处理

### 核心收获

- 掌握了 NestJS 框架的核心概念：Controller、Service、Module
- 学会了 Prisma ORM 的使用方法：Schema 设计、迁移、查询
- 理解了云平台部署流程：配置、构建、监控
- 实现了企业级的 API 设计模式：统一响应、错误处理、类型安全

### 后续拓展方向

1. **功能增强**
   - 添加用户认证（JWT）
   - 实现文件上传
   - 添加评论系统
   - 实现搜索功能

2. **性能优化**
   - Redis 缓存
   - 数据库索引优化
   - API 限流
   - 日志系统

3. **DevOps**
   - CI/CD 流程
   - 自动化测试
   - 监控告警
   - 日志分析

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

```11-Nginx基础概述
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

## 常见问题解答

### Q1: Heroku 部署后数据库迁移如何执行？

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

### Q2: 如何解决 Heroku 数据库连接超时问题？

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

### Q3: 如何处理 Heroku 的冷启动问题？

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

### Q4: 如何实现优雅关闭？

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

### Q5: 如何配置环境变量？

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

### Q6: 如何处理 CORS 问题？

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

### Q7: 如何实现请求限流？

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

### Q8: 如何调试生产环境问题？

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

### Q9: 如何处理数据库连接断开问题？

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

### Q10: 如何监控应用性能？

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

---


## NestJS开发工具扩展


> **学习目标**：掌握 SWC 编译器的使用和 REPL 开发模式，提升开发效率。

---

## 一、SWC 编译器

### 1.1 SWC 简介

**什么是 SWC？**

SWC（Speedy Web Compiler）是一个基于 Rust 语言编写的超快速 JavaScript/TypeScript 编译器。

**SWC 特点**：

```
SWC 优势：
│
├── 极快的编译速度
│   ├── 基于 Rust 语言开发
│   ├── 比 TSC 快 20 倍以上
│   └── 单线程性能强劲
│
├── 功能丰富
│   ├── 编译 TypeScript/JavaScript
│   ├── 代码压缩（Minification）
│   ├── 代码打包（Bundling）
│   └── 代码转换（Transpilation）
│
├── NestJS 10+ 原生支持
│   ├── 官方集成
│   ├── 配置简单
│   └── 无缝替换 TSC
│
└── 社区活跃
    ├── 持续更新
    ├── 问题修复快
    └── 生态完善
```

**性能对比**：

| 编译器 | 编译时间 | 性能提升 |
|--------|---------|---------|
| **TSC**（TypeScript Compiler） | 602ms | 基准 |
| **SWC** | 177ms | 速度约为 TSC 的 3.4 倍 |

### 1.2 安装依赖

```bash
# 安装 SWC 相关依赖
pnpm install @swc/cli @swc/core

# 或使用 npm
npm install @swc/cli @swc/core

# 或使用 yarn
yarn add @swc/cli @swc/core
```

**依赖说明**：

| 包名 | 作用 |
|------|------|
| `@swc/cli` | SWC 命令行工具 |
| `@swc/core` | SWC 核心编译器 |

### 1.3 性能测试

**测试代码**：

**`src/main.ts`**：

```typescript
const startTime = new Date().getTime();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);

  console.log(
    'First boot time:',
    new Date().getTime() - startTime,
    'ms'
  );
}
bootstrap();
```

**测试结果**：

```bash
# 使用默认 TSC 编译器
$ pnpm start:dev
First boot time: 602ms

# 使用 SWC 编译器
$ pnpm start:dev -b swc
First boot time: 177ms
```

**性能提升**：速度约为 TSC 的 3.4 倍

### 1.4 基础使用方式

**方式一：命令行参数**

**`package.json`**：

```json
{
  "scripts": {
    "start": "nest start -b swc",
    "start:dev": "nest start --watch -b swc",
    "start:debug": "nest start --debug --watch -b swc",
    "start:prod": "node dist/main"
  }
}
```

**参数说明**：
- `-b swc`：指定使用 SWC 编译器
- `--watch`：监听文件变化
- `--debug`：开启调试模式

### 1.5 配置 SWC 为默认编译器

**步骤一：创建 SWC 配置文件**

**`.swcrc`**：

```json
{
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "decorators": true,
      "dynamicImport": true
    },
    "transform": {
      "legacyDecorator": true,
      "decoratorMetadata": true
    },
    "target": "es2021",
    "keepClassNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "minify": true,
  "module": {
    "type": "commonjs"
  }
}
```

**配置项说明**：

| 配置项 | 作用 | 说明 |
|--------|------|------|
| `jsc.parser.syntax` | 语法类型 | `typescript` 支持装饰器 |
| `jsc.transform.legacyDecorator` | 装饰器模式 | `true` 启用旧版装饰器 |
| `jsc.transform.decoratorMetadata` | 装饰器元数据 | `true` 启用元数据支持 |
| `jsc.target` | 编译目标 | `es2021` 现代浏览器 |
| `minify` | 代码压缩 | `true` 启用压缩 |
| `module.type` | 模块类型 | `commonjs` Node.js 模块 |
| `paths` | 路径别名 | 类似 TypeScript 的 paths |

**步骤二：修改 nest-cli.json**

**`nest-cli.json`**：

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "builder": "swc",
    "typeCheck": true
  }
}
```

**配置说明**：
- `builder: "swc"`：设置 SWC 为默认编译器
- `typeCheck: true`：启用类型检查（可选）

**步骤三：验证配置**

```bash
# 构建项目
$ pnpm build

# 查看输出日志
SWC running...  # 出现此日志表示使用 SWC 编译器

# 启动开发服务器
$ pnpm start:dev
SWC running...  # 出现此日志表示使用 SWC 编译器
```

**构建产物**：

```bash
# 查看构建后的代码
$ cat dist/main.js

# SWC 构建的代码是压缩过的
!function(){"use strict";...}();
```



### 1.6 SWC vs TSC 对比

| 维度 | TSC | SWC |
|------|-----|-----|
| **编译速度** | 慢 | 快 3-4 倍 |
| **类型检查** |  完整支持 |  不支持（需额外配置） |
| **装饰器** |  完整支持 |  支持 |
| **路径别名** |  完整支持 |  部分支持（有问题） |
| **Source Map** |  完整支持 |  支持 |
| **代码压缩** |  不支持 |  支持 |
| **配置复杂度** | 简单 | 中等 |
| **稳定性** |  非常稳定 |  较稳定 |

### 1.7 SWC 已知问题

**问题一：路径别名（Path Aliases）不支持**

**问题描述**：
- SWC 对 TypeScript 的 `paths` 配置支持不完善
- 可能导致模块导入失败

**解决方案**：

```typescript
//  可能失败的路径别名导入
import { UserService } from '@user/user.service';

//  使用相对路径导入
import { UserService } from './user/user.service';
```

**问题二：装饰器元数据问题**

**问题描述**：
- 某些情况下装饰器元数据可能丢失

**解决方案**：

`.swcrc`：

```json
{
  "jsc": {
    "transform": {
      "legacyDecorator": true,
      "decoratorMetadata": true  // 确保开启
    }
  }
}
```

**问题三：类型检查缺失**

**问题描述**：
- SWC 不进行类型检查，只进行编译

**解决方案**：

```bash
# 方案 1：在 nest-cli.json 中启用类型检查
{
  "compilerOptions": {
    "builder": "swc",
    "typeCheck": true  // 启用类型检查
  }
}

# 方案 2：单独运行类型检查
$ pnpm tsc --noEmit
```

### 1.8 回退到 TSC

**如果 SWC 出现问题，可以回退到 TSC**：

**`nest-cli.json`**：

```json
{
  "compilerOptions": {
    "builder": "tsc"  // 改回 tsc
  }
}
```

**或使用命令行**：

```bash
# 临时使用 TSC
$ pnpm start:dev -b tsc

# 或使用 webpack
$ pnpm start:dev -b webpack
```

### 1.9 SWC 最佳实践

**开发环境推荐**：

```
开发环境配置建议：
│
├── 使用 SWC 编译器
│   ├── 编译速度快
│   ├── 开发体验好
│   └── 热重载快
│
├── 启用类型检查
│   ├── nest-cli.json 中设置 typeCheck: true
│   └── 或单独运行 tsc --noEmit
│
└── 注意路径别名
    ├── 优先使用相对路径
    └── 或等待官方修复
```

**生产环境推荐**：

```
生产环境配置建议：
│
├── 使用 TSC 编译器
│   ├── 类型检查完整
│   ├── 稳定性高
│   └── 兼容性好
│
└── 启用代码压缩
    ├── 使用 SWC 的 minify 功能
    └── 或使用其他压缩工具
```

---

## 二、REPL 模式

### 2.1 REPL 简介

**什么是 REPL？**

REPL（Read-Eval-Print Loop）即"读取-求值-输出-循环"，是一个交互式编程环境。

**REPL 功能**：

```
REPL 功能：
│
├── 检查依赖图
│   ├── 查看所有 Controllers
│   ├── 查看所有 Providers
│   └── 查看模块依赖关系
│
├── 调用控制器方法
│   ├── 直接调用 Controller 方法
│   ├── 测试接口逻辑
│   └── 快速验证功能
│
├── 调用服务方法
│   ├── 直接调用 Service 方法
│   ├── 测试业务逻辑
│   └── 调试数据处理
│
└── 实时交互
    ├── 命令行交互
    ├── 实时输出结果
    └── 快速原型开发
```



### 2.2 启用 REPL 模式

**方法一：在 main.ts 中集成**

**`src/main.ts`**：

```typescript
import { NestFactory } from '@nestjs/core';
import { repl } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}

// 启用 REPL 模式
repl(AppModule);

bootstrap();
```

**方法二：创建独立的 REPL 文件**

**`src/repl.ts`**：

```typescript
import { repl } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  await repl(AppModule);
}
bootstrap();
```

**`package.json`**：

```json
{
  "scripts": {
    "start:dev": "nest start --watch",
    "repl": "ts-node -r tsconfig-paths/register src/repl.ts"
  }
}
```

**运行 REPL**：

```bash
# 运行 REPL 模式
$ pnpm repl

# 或
$ npm run repl
```

### 2.3 REPL 常用命令

**基础命令**：

```bash
# 查看 debug 信息
> debug()
{
  controllers: [
    {
      name: 'AppController',
      dependencies: [ 'AppService' ]
    }
  ],
  providers: [
    {
      name: 'AppService',
      dependencies: []
    }
  ],
  modules: [
    {
      name: 'AppModule',
      imports: [],
      controllers: [ 'AppController' ],
      providers: [ 'AppService' ]
    }
  ]
}
```

**查看可用的方法**：

```bash
# 查看所有公共方法
> methods()
[
  'debug',
  'methods',
  'get',
  'select',
  'resolve',
  'watch'
]
```

**获取模块实例**：

```bash
# 获取 AppController 实例
> get(AppController)
AppController {}

# 获取 AppService 实例
> get(AppService)
AppService {}
```

**调用方法**：

```bash
# 调用 Controller 方法
> get(AppController).getHello()
'Hello World!'

# 调用 Service 方法
> get(AppService).findAll()
[ { id: 1, name: 'User 1' }, { id: 2, name: 'User 2' } ]
```

**选择特定模块**：

```bash
# 选择模块
> select(AppModule)
AppModule {}

# 选择后直接调用方法
> select(AppModule).get(AppController).getHello()
'Hello World!'
```

**解析依赖**：

```bash
# 解析提供者
> resolve(AppService)
AppService {}
```



### 2.4 REPL 实战示例

**示例一：测试 Controller**

```typescript
// src/app.controller.ts
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('users')
  getUsers() {
    return this.appService.getUsers();
  }
}
```

**REPL 测试**：

```bash
$ pnpm repl

# 查看 debug 信息
> debug()

# 获取 Controller 实例
> const appController = get(AppController)

# 调用方法
> appController.getHello()
'Hello World!'

> appController.getUsers()
[ { id: 1, name: 'User 1' } ]
```

**示例二：测试 Service**

```typescript
// src/user/user.service.ts
@Injectable()
export class UserService {
  private users = [
    { id: 1, name: 'User 1', email: 'user1@example.com' },
    { id: 2, name: 'User 2', email: 'user2@example.com' },
  ];

  findAll() {
    return this.users;
  }

  findOne(id: number) {
    return this.users.find(user => user.id === id);
  }

  create(userData: any) {
    const newUser = { id: this.users.length + 1, ...userData };
    this.users.push(newUser);
    return newUser;
  }
}
```

**REPL 测试**：

```bash
$ pnpm repl

# 获取 Service 实例
> const userService = get(UserService)

# 查询所有用户
> userService.findAll()
[ { id: 1, name: 'User 1' }, { id: 2, name: 'User 2' } ]

# 查询单个用户
> userService.findOne(1)
{ id: 1, name: 'User 1', email: 'user1@example.com' }

# 创建用户
> userService.create({ name: 'User 3', email: 'user3@example.com' })
{ id: 3, name: 'User 3', email: 'user3@example.com' }

# 再次查询
> userService.findAll()
[
  { id: 1, name: 'User 1' },
  { id: 2, name: 'User 2' },
  { id: 3, name: 'User 3' }
]
```

**示例三：测试数据库操作**

```typescript
// src/prisma/prisma.service.ts
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}

// src/user/user.service.ts
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany();
  }

  async create(data: CreateUserDto) {
    return this.prisma.user.create({ data });
  }
}
```

**REPL 测试**：

```bash
$ pnpm repl

# 获取 Service 实例
> const userService = get(UserService)

# 异步查询所有用户
> await userService.findAll()
[ { id: 1, name: 'User 1' }, { id: 2, name: 'User 2' } ]

# 异步创建用户
> await userService.create({ name: 'User 3', email: 'user3@example.com' })
{ id: 3, name: 'User 3', email: 'user3@example.com' }
```

### 2.5 REPL 命令详解

| 命令 | 作用 | 示例 |
|------|------|------|
| `debug()` | 查看依赖图和模块信息 | `debug()` |
| `methods()` | 查看所有可用方法 | `methods()` |
| `get(Class)` | 获取类实例 | `get(AppController)` |
| `select(Module)` | 选择模块 | `select(AppModule)` |
| `resolve(Provider)` | 解析提供者 | `resolve(AppService)` |
| `watch()` | 监听文件变化 | `watch()` |

### 2.6 REPL vs HTTP 请求对比

| 维度 | REPL | HTTP 请求 |
|------|------|----------|
| **启动速度** | 快 | 需要启动服务器 |
| **调试效率** | 高（直接调用） | 中（需要发送请求） |
| **测试范围** | 所有方法 | 仅 Controller 方法 |
| **使用场景** | 开发调试 | 接口测试 |
| **依赖注入** |  自动处理 |  需要手动处理 |
| **实时反馈** |  即时 |  需要工具 |

### 2.7 REPL 最佳实践

**适合 REPL 的场景**：

```
REPL 适用场景：
│
├── 快速原型开发
│   ├── 测试业务逻辑
│   ├── 验证数据处理
│   └── 调试算法实现
│
├── 调试依赖注入
│   ├── 检查依赖关系
│   ├── 验证实例化
│   └── 调试模块加载
│
├── 数据库操作测试
│   ├── 测试查询语句
│   ├── 验证数据映射
│   └── 调试事务处理
│
└── 快速验证功能
    ├── 测试 Service 方法
    ├── 验证工具函数
    └── 调试复杂逻辑
```

**不适合 REPL 的场景**：

```
不适合 REPL 的场景：
│
├── 性能测试
│   └── REPL 环境与生产环境不同
│
├── 集成测试
│   └── 需要完整的 HTTP 环境
│
└── 端到端测试
    └── 需要完整的应用流程
```

---

## 三、NestJS 社区资源



### 3.1 GitHub Issues

**查看和报告问题**：

- **地址**：https://github.com/nestjs/nest/issues
- **用途**：
  - 查看已知问题
  - 报告新问题
  - 参与讨论

**常见问题分类**：

```
NestJS Issues 分类：
│
├── Bug Reports
│   ├── 编译错误
│   ├── 运行时错误
│   └── 类型错误
│
├── Feature Requests
│   ├── 新功能建议
│   ├── API 改进
│   └── 性能优化
│
├── Questions
│   ├── 使用问题
│   ├── 配置问题
│   └── 最佳实践
│
└── Documentation
    ├── 文档错误
    ├── 文档改进
    └── 示例代码
```

### 3.2 Discord 社区

**加入 Discord**：

- **地址**：https://discord.gg/nestjs
- **用途**：
  - 实时交流
  - 快速获得帮助
  - 社区互动

**社区频道**：

```
Discord 频道：
│
├── #nestjs-help
│   ├── 使用问题
│   ├── 快速答疑
│   └── 新手入门
│
├── #nestjs-core
│   ├── 核心功能
│   ├── 架构讨论
│   └── 深度交流
│
├── #nestjs-orm
│   ├── TypeORM
│   ├── Prisma
│   └── 数据库相关
│
└── #nestjs-graphql
    ├── GraphQL 集成
    ├── Apollo
    └── 查询优化
```

**识别官方成员**：

-  狮子图标 = **Core Team 成员**
- 这些成员是 NestJS 核心团队成员，可以优先咨询

### 3.3 版本更新

**检查和更新依赖**：

```bash
# 检查过期依赖
$ pnpm outdated

# 交互式更新
$ pnpm update -i

# 或使用 npm
$ npm outdated
$ npm update
```

**更新 NestJS CLI**：

```bash
# 更新全局 CLI
$ pnpm update -g @nestjs/cli

# 或使用 npm
$ npm update -g @nestjs/cli
```

**版本更新策略**：

```
版本更新建议：
│
├── 小版本更新（1.0.0 → 1.0.1）
│   ├── Bug 修复
│   ├── 安全补丁
│   └── 可以直接更新
│
├── 中版本更新（1.0.0 → 1.1.0）
│   ├── 新功能
│   ├── 向后兼容
│   └── 可以直接更新
│
└── 大版本更新（1.0.0 → 2.0.0）
    ├── 破坏性变更
    ├── 需要迁移
    └── 谨慎更新
```

---

## 四、完整配置示例

### 4.1 项目结构

```
project/
├── src/
│   ├── main.ts
│   ├── repl.ts              # REPL 配置
│   ├── app.module.ts
│   └── ...
├── .swcrc                   # SWC 配置
├── nest-cli.json            # NestJS CLI 配置
├── tsconfig.json            # TypeScript 配置
└── package.json
```



### 4.2 完整配置文件

**`nest-cli.json`**：

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "builder": "swc",
    "typeCheck": true
  }
}
```

**`.swcrc`**：

```json
{
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "decorators": true,
      "dynamicImport": true
    },
    "transform": {
      "legacyDecorator": true,
      "decoratorMetadata": true
    },
    "target": "es2021",
    "keepClassNames": true
  },
  "minify": false,
  "module": {
    "type": "commonjs"
  }
}
```

**`package.json`**：

```json
{
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "repl": "ts-node -r tsconfig-paths/register src/repl.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "reflect-metadata": "^0.1.13",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.0.0",
    "@swc/cli": "^0.1.62",
    "@swc/core": "^1.3.68",
    "@types/node": "^20.3.1",
    "typescript": "^5.1.3"
  }
}
```

**`src/repl.ts`**：

```typescript
import { repl } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  await repl(AppModule);
}
bootstrap();
```

### 4.3 使用流程

```bash
# 1. 安装依赖
$ pnpm install

# 2. 开发模式启动（使用 SWC）
$ pnpm start:dev

# 3. 启动 REPL 模式
$ pnpm repl

# 4. 构建生产版本
$ pnpm build

# 5. 运行类型检查
$ pnpm typecheck
```

---

## 五、学习要点总结

### 5.1 核心概念速记

```
NestJS 开发工具扩展核心概念：
│
├── SWC 编译器
│   ├── 基于 Rust 开发
│   ├── 比 TSC 快 3-4 倍
│   ├── NestJS 10+ 原生支持
│   ├── 配置：nest-cli.json 中设置 builder: "swc"
│   ├── 已知问题：路径别名支持不完善
│   └── 建议：开发环境用 SWC，生产环境用 TSC
│
└── REPL 模式
    ├── Read-Eval-Print Loop
    ├── 交互式编程环境
    ├── 功能：查看依赖图、调用方法、调试代码
    ├── 命令：debug()、get()、methods()、select()
    └── 场景：快速原型开发、调试依赖注入
```

### 5.2 重点知识清单

| 知识点 | 重要程度 | 掌握程度 |
|--------|---------|---------|
| SWC 的作用和优势 |  |  未掌握 /  已掌握 |
| SWC 安装和配置 |  |  未掌握 /  已掌握 |
| SWC 性能对比 |  |  未掌握 /  已掌握 |
| SWC 已知问题 |  |  未掌握 /  已掌握 |
| REPL 的作用 |  |  未掌握 /  已掌握 |
| REPL 常用命令 |  |  未掌握 /  已掌握 |
| REPL 实战应用 |  |  未掌握 /  已掌握 |
| NestJS 社区资源 |  |  未掌握 /  已掌握 |

### 5.3 课后思考题

1. **SWC 相比 TSC 有什么优势？**
2. **如何在 NestJS 中配置 SWC 为默认编译器？**
3. **SWC 有哪些已知问题？如何解决？**
4. **REPL 模式有什么作用？适合什么场景？**
5. **如何在 REPL 中调用 Controller 和 Service 方法？**

---

## 参考资料

- [NestJS 官方文档 - SWC](https://docs.nestjs.com/recipes/swc)
- [NestJS 官方文档 - REPL](https://docs.nestjs.com/recipes/repl)
- [SWC 官方文档](https://swc.rs/)
- [NestJS GitHub Issues](https://github.com/nestjs/nest/issues)
- [NestJS Discord](https://discord.gg/nestjs)

---

