---
title: NestJS MVC、DTO 与 DAO 分层架构
description: "NestJS 分层架构详解:MVC 模式在 Nest 中的落地、DTO(class-validator 校验)与 DAO(TypeORM Repository)的职责边界、DTO vs DAO 对比、ORM 库选型与最佳实践。"
keywords: [NestJS, MVC, DTO, DAO, ORM, TypeORM]
created: 2026-11-14
updated: 2026-11-14
status: 正式
category: Node.js
tags: [Node.js, NestJS, 架构分层]
---

# NestJS MVC、DTO 与 DAO 分层架构

## 一、MVC 架构模式

### 1.1 什么是 MVC

**概念说明**

MVC（Model-View-Controller）是一种软件架构模式，用于将应用程序分离为三个核心组件。

**三大组成部分**

```
MVC 三层架构：
│
├──  Model（模型）
│   ├── 核心业务逻辑
│   ├── 数据处理
│   ├── 数据库操作
│   └── 数据状态管理
│
├──  View（视图）
│   ├── 用户界面
│   ├── 数据展示
│   └── 用户交互入口
│
└──  Controller（控制器）
    ├── 请求解析
    ├── 路由分发
    ├── 调用 Model
    └── 返回 View
```

### 1.2 MVC 工作流程

**传统 MVC 流程**

```
传统 MVC 工作流程：

┌──────────┐
│   用户   │
└────┬─────┘
     │ 操作
     ▼
┌──────────┐      1. 用户操作      ┌──────────┐
│   View   │ ───────────────────> │Controller│
│  视图层   │                      │  控制器   │
└────┬─────┘                      └─────┬────┘
     │                                  │
     │ 4. 数据变化通知                   │ 2. 调用业务逻辑
     │                                  │
     ▼                                  ▼
┌──────────┐                      ┌──────────┐
│   用户   │                      │  Model   │
│ 看到更新  │ <─────────────────── │   模型   │
└──────────┘   3. 数据处理完成      └──────────┘

流程说明：
1. 用户在 View 层进行操作（点击按钮、提交表单）
2. Controller 接收请求，调用对应的 Model
3. Model 处理业务逻辑，操作数据库
4. Model 处理完成后，通知 View 更新
```

**现代前后端分离 MVC**

```
现代前后端分离 MVC：

前端（View 层）：
│
├── React / Vue / Angular
├── 用户界面
├── 用户交互
└── 发送 HTTP 请求

         │ HTTP 请求
         ▼

后端（Controller + Model）：
│
├── Controller（控制器）
│   ├── 接收请求
│   ├── 解析参数
│   ├── 调用 Service
│   └── 返回响应
│
└── Model（模型）
    ├── Service 业务逻辑
    ├── Repository 数据访问
    └── Entity 数据实体

         │ SQL 查询
         ▼

数据库：
└── MySQL / PostgreSQL / MongoDB

流程说明：
1. 前端发送 HTTP 请求到后端
2. Controller 接收请求并解析
3. Controller 调用 Model 处理业务
4. Model 操作数据库并返回数据
5. Controller 将数据返回给前端
6. 前端 View 层渲染数据
```

### 1.3 MVC 的优势

```
MVC 架构优势：
│
├──  分层清晰
│   ├── 职责分离
│   ├── 代码组织清晰
│   └── 易于理解
│
├──  可复用性
│   ├── Model 可被多个 View 使用
│   ├── Controller 可复用
│   └── 减少重复代码
│
├──  可测试性
│   ├── 各层独立测试
│   ├── 易于模拟依赖
│   └── 提高测试覆盖率
│
├──  可维护性
│   ├── 修改不影响其他层
│   ├── 易于扩展
│   └── 降低维护成本
│
└──  团队协作
    ├── 前后端分离开发
    ├── 并行开发
    └── 提高开发效率
```

---

## 二、NestJS 中的 MVC

### 2.1 NestJS MVC 架构

**NestJS 三层对应关系**

```
NestJS 中的 MVC 实现：

MVC 概念              NestJS 实现
│                       │
├── View（视图）  ────> ├── 前端项目（React/Vue）
│                      ├── 模板引擎（Handlebars/EJS）
│                      └── 或不实现（前后端分离）
│
├── Controller ───────> ├── @Controller 装饰器
│                      ├── 处理 HTTP 请求
│                      └── 调用 Service
│
└── Model（模型） ────> ├── Service（业务逻辑）
                       ├── Repository（数据访问）
                       ├── Entity（数据实体）
                       └── ORM（TypeORM/Prisma）
```



### 2.2 NestJS 作为 View 层

**模板引擎集成**

```typescript
// ========== 安装模板引擎 ==========

// npm install hbs

// ========== 配置模板引擎 ==========

// src/main.ts
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 配置模板引擎
  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs'); // 使用 Handlebars 模板引擎

  await app.listen(3000);
}
bootstrap();

// ========== 控制器渲染视图 ==========

// src/app.controller.ts
import { Controller, Get, Render } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  @Render('index') // 渲染 index.hbs 模板
  root() {
    return { message: 'Hello World!' }; // 传递数据给模板
  }

  @Get('users')
  @Render('users')
  getUsers() {
    return {
      users: [
        { id: 1, name: '张三' },
        { id: 2, name: '李四' },
      ],
    };
  }
}

// ========== 模板文件 ==========

<!-- views/index.hbs -->
<!DOCTYPE html>
<html>
<head>
  <title>NestJS MVC</title>
</head>
<body>
  <h1>{{ message }}</h1>
</body>
</html>

<!-- views/users.hbs -->
<!DOCTYPE html>
<html>
<head>
  <title>用户列表</title>
</head>
<body>
  <h1>用户列表</h1>
  <ul>
    {{#each users}}
      <li>{{this.id}} - {{this.name}}</li>
    {{/each}}
  </ul>
</body>
</html>
```

**常用模板引擎**

| 模板引擎 | 说明 | 适用场景 |
|---------|------|---------|
| **Handlebars (hbs)** | 简单、轻量 | 传统服务端渲染 |
| **EJS** | 嵌入式 JavaScript | 简单项目 |
| **Pug (Jade)** | 缩进语法 | 追求简洁 |
| **Nunjucks** | 功能强大 | 复杂模板 |

### 2.3 前后端分离模式

**现代推荐方式**

```
前后端分离架构：

前端项目（独立）：
│
├── React / Vue / Angular
├── 单独部署（静态资源服务器）
├── 调用后端 API
└── 用户界面渲染

         │ RESTful API / GraphQL
         ▼

后端项目（NestJS）：
│
├── Controller（API 接口）
├── Service（业务逻辑）
├── Repository（数据访问）
└── Entity（数据实体）

         │ SQL
         ▼

数据库

优势：
• 前后端独立开发
• 前端可使用现代化框架
• 后端只提供 API
• 部署灵活
```

---

## 三、DTO（Data Transfer Object）

### 3.1 DTO 概念

**概念说明**

DTO（Data Transfer Object，数据传输对象）用于在不同层之间传输数据，重点在于"传输"过程。

**核心特点**

```
DTO 核心特点：
│
├──  数据传输
│   ├── 前端 → 后端（请求 DTO）
│   ├── 后端 → 前端（响应 DTO）
│   └── 服务层 → 数据层
│
├──  数据筛选
│   ├── 只接收部分字段
│   ├── 过滤敏感字段
│   └── 控制数据暴露
│
├──  数据校验
│   ├── 字段类型验证
│   ├── 字段格式验证
│   └── 字段约束验证
│
└──  属性约束
    └── 属性 ≤ 实体属性（部分数据）
```

### 3.2 DTO 的作用

**三大核心作用**

```
DTO 三大核心作用：

1⃣ 接收部分数据
│
├── 场景：创建用户
│   ├── 实体字段：id, name, email, password, createdAt, updatedAt
│   ├── DTO 字段：name, email, password
│   └── 说明：id、时间戳由后端生成，不需要前端传

2⃣ 数据筛选
│
├── 场景：更新用户
│   ├──  危险：允许前端传 id
│   │   └── A 用户可以修改 B 用户数据（传 B 的 id）
│   ├──  安全：DTO 不包含 id
│   │   └── 从 Token 获取当前用户 id
│   └── 说明：敏感字段不能通过 DTO 传递

3⃣ 数据校验
│
├── 场景：创建用户
│   ├── name：必填，长度 2-100
│   ├── email：必填，邮箱格式
│   └── password：必填，长度 ≥ 6
│   └── 说明：在 DTO 中定义校验规则
```



### 3.3 DTO vs Entity 对比

| 维度 | DTO（数据传输对象） | Entity（实体类） |
|------|-------------------|-----------------|
| **用途** | 层间数据传输 | 数据库映射 |
| **字段** | 部分字段 | 完整字段 |
| **包含敏感信息** |  不包含 |  包含 |
| **数据校验** |  强校验 |  可选 |
| **对应关系** | API 接口 | 数据库表 |
| **示例** | CreateUserDto | User Entity |

**代码示例对比**

```typescript
// ========== Entity（实体类）==========

// src/users/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number; //  数据库自动生成

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string; //  敏感字段

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date; //  数据库自动生成

  @UpdateDateColumn()
  updatedAt: Date; //  数据库自动生成
}

// ========== DTO（数据传输对象）==========

// src/users/dto/create-user.dto.ts
import { IsString, IsEmail, MinLength, MaxLength, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2, { message: '用户名至少 2 个字符' })
  @MaxLength(100, { message: '用户名最多 100 个字符' })
  name: string;

  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 个字符' })
  password: string;

  //  不包含 id（数据库自动生成）
  //  不包含 createdAt（数据库自动生成）
  //  不包含 updatedAt（数据库自动生成）
}

// src/users/dto/update-user.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// PartialType：所有字段变为可选
// OmitType：排除某些字段
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ['password'] as const),
) {
  // 更新时不允许修改密码
  // 密码修改应该有专门的接口
}

// src/users/dto/response-user.dto.ts
import { Exclude, Expose } from 'class-transformer';

export class ResponseUserDto {
  id: number;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: Date;

  @Exclude() //  响应时不返回密码
  password: string;

  constructor(partial: Partial<ResponseUserDto>) {
    Object.assign(this, partial);
  }
}

// ========== 使用示例 ==========

// src/users/users.controller.ts
import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResponseUserDto } from './dto/response-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() createUserDto: CreateUserDto): Promise<ResponseUserDto> {
    //  DTO 自动验证字段
    //  只接收 name, email, password
    const user = await this.usersService.create(createUserDto);
    
    //  响应 DTO 过滤敏感字段
    return new ResponseUserDto(user);
  }
}
```



### 3.4 NestJS DTO 完整示例

**安装依赖**

```bash
npm install class-validator class-transformer
```

**完整 DTO 示例**

```typescript
// src/users/dto/create-user.dto.ts
import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';

export class CreateUserDto {
  // 用户名：必填，2-100 字符
  @IsString({ message: '用户名必须是字符串' })
  @MinLength(2, { message: '用户名至少 2 个字符' })
  @MaxLength(100, { message: '用户名最多 100 个字符' })
  name: string;

  // 邮箱：必填，邮箱格式
  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  // 密码：必填，至少 6 位，包含数字和字母
  @IsString()
  @MinLength(6, { message: '密码至少 6 个字符' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/, {
    message: '密码必须包含数字和字母',
  })
  password: string;

  // 年龄：可选，0-150
  @IsOptional()
  @IsInt({ message: '年龄必须是整数' })
  @Min(0, { message: '年龄不能小于 0' })
  @Max(150, { message: '年龄不能大于 150' })
  age?: number;

  // 是否激活：可选，布尔值
  @IsOptional()
  @IsBoolean({ message: 'isActive 必须是布尔值' })
  isActive?: boolean;
}

// ========== 启用全局验证 ==========

// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 全局启用验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 过滤未定义的属性
      forbidNonWhitelisted: true, // 如果有未定义属性，抛出错误
      transform: true, // 自动转换类型
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  
  await app.listen(3000);
}
bootstrap();

// ========== 验证效果 ==========

// 请求示例（验证失败）
POST /users
{
  "name": "A",              //  至少 2 个字符
  "email": "invalid-email", //  邮箱格式不正确
  "password": "123456",     //  必须包含数字和字母
  "age": -5,                //  年龄不能小于 0
  "hobby": "coding"         //  未定义的字段
}

// 响应
{
  "statusCode": 400,
  "message": [
    "用户名至少 2 个字符",
    "邮箱格式不正确",
    "密码必须包含数字和字母",
    "年龄不能小于 0",
    "property hobby should not exist"
  ],
  "error": "Bad Request"
}
```

---

## 四、DAO（Data Access Object）

### 4.1 DAO 概念

**概念说明**

DAO（Data Access Object，数据访问对象）用于封装数据库访问逻辑，重点在于"访问"数据库。

**核心特点**

```
DAO 核心特点：
│
├──  数据库访问
│   ├── 封装数据库操作
│   ├── 隐藏 SQL 细节
│   └── 提供统一接口
│
├──  封装性
│   ├── 不暴露数据库内部信息
│   ├── 对外提供方法
│   └── 降低耦合度
│
├──  单一职责
│   ├── 只负责数据访问
│   ├── 不包含业务逻辑
│   └── 可复用性强
│
└──  可替换性
    ├── 更换数据库只需修改 DAO
    ├── 不影响上层业务
    └── 灵活切换实现
```

### 4.2 DAO 的作用

**DAO 层的职责**

```
DAO 层职责：

┌──────────────────────────────────────┐
│           Service 层（业务逻辑）        │
│    调用 DAO 方法，不关心数据库细节      │
└──────────────┬───────────────────────┘
               │ 调用
               ▼
┌──────────────────────────────────────┐
│            DAO 层（数据访问）           │
│  ┌────────────────────────────────┐  │
│  │ • 实体类（Entity）               │  │
│  │ • 数据库操作（CRUD）             │  │
│  │ • 数据校验                      │  │
│  │ • 错误处理                      │  │
│  └────────────────────────────────┘  │
└──────────────┬───────────────────────┘
               │ SQL 查询
               ▼
         ┌──────────┐
         │  数据库   │
         └──────────┘

DAO 层包含：
│
├──  Entity（实体类）
│   └── 对应数据库表
│
├──  Repository（仓库）
│   └── 数据库 CRUD 操作
│
├──  Validation（校验）
│   └── 数据库约束校验
│
└──  Error Handling（错误处理）
    └── 数据库异常处理
```

### 4.3 DAO 在 NestJS 中的实现

**DAO 层的多种实现方式**

```
NestJS 中 DAO 层的实现：

1⃣ TypeORM（推荐）
│
├── Entity：实体类
├── Repository：数据访问
└── 支持：MySQL, PostgreSQL, MongoDB, SQLite

2⃣ Prisma
│
├── Schema：数据模型
├── Client：数据访问
└── 支持：MySQL, PostgreSQL, MongoDB, SQLite

3⃣ Mongoose（MongoDB）
│
├── Schema：数据模型
├── Model：数据访问
└── 支持：MongoDB

4⃣ Sequelize
│
├── Model：数据模型
├── 支持：MySQL, PostgreSQL, SQLite
└── 传统的 ORM 库
```



### 4.4 TypeORM 实现 DAO 层

**完整示例**

```typescript
// ========== 安装依赖 ==========

// npm install @nestjs/typeorm typeorm mysql2

// ========== 配置数据库连接 ==========

// src/app.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: 'password',
      database: 'test',
      entities: [], // 需在此列出实体类；配合 forFeature 时可改用 autoLoadEntities: true 自动加载
      synchronize: true, // 自动同步表结构（生产环境设为 false）
    }),
    UsersModule,
  ],
})
export class AppModule {}

// ========== Entity（实体类）==========

// src/users/entities/user.entity.ts
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('users') // 对应数据库表名
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Index() // 添加索引
  @Column({ unique: true }) // 唯一约束
  email: string;

  @Column()
  password: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// ========== Repository（数据访问层）==========

// src/users/users.repository.ts（可选，使用 TypeORM Repository）
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

// 注意：@EntityRepository 装饰器是 TypeORM 0.2.x 的旧写法，0.3+ 已废弃，
// 现行写法是继承 Repository 并通过 DataSource 构造（见下方注释）
export class UsersRepository extends Repository<User> {
  constructor(dataSource: import('typeorm').DataSource) {
    super(User, dataSource.manager);
  }

  // 自定义查询方法
  async findActiveUsers(): Promise<User[]> {
    return this.createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .getMany();
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return this.findOne({ where: { email } });
  }

  async findWithPagination(page: number, limit: number): Promise<[User[], number]> {
    return this.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }
}

// ========== Service（业务逻辑层）==========

// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 创建用户
  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  // 查询所有用户
  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  // 查询单个用户
  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`用户 #${id} 不存在`);
    }
    return user;
  }

  // 更新用户
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  // 删除用户
  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }
}

// ========== Module（模块注册）==========

// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])], // 注册实体
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

### 4.5 DAO 层的优势

```
DAO 层优势：

1⃣ 封装数据库细节
│
├── 上层不知道数据库类型
├── 上层不知道 SQL 语句
└── 更换数据库只需修改 DAO

2⃣ 提高可测试性
│
├── 可以模拟 DAO 层
├── Service 层独立测试
└── 不需要真实数据库

3⃣ 代码复用
│
├── 多个 Service 可复用 DAO
├── 统一的数据访问接口
└── 减少重复代码

4⃣ 易于维护
│
├── 数据库操作集中管理
├── 修改影响范围小
└── 降低维护成本
```

---

## 五、DTO vs DAO 对比



### 5.1 核心区别

```
DTO vs DAO 核心区别：

┌──────────────────────────────────────────┐
│              HTTP 请求                    │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│          DTO（数据传输对象）               │
│  ┌────────────────────────────────────┐  │
│  │ • 接收请求数据                      │  │
│  │ • 数据校验                          │  │
│  │ • 数据筛选                          │  │
│  │ • 部分字段                          │  │
│  └────────────────────────────────────┘  │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│            Controller 控制器              │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│            Service 业务逻辑               │
└────────────────┬─────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│          DAO（数据访问对象）               │
│  ┌────────────────────────────────────┐  │
│  │ • 数据库访问                        │  │
│  │ • CRUD 操作                         │  │
│  │ • 实体类映射                        │  │
│  │ • 完整字段                          │  │
│  └────────────────────────────────────┘  │
└────────────────┬─────────────────────────┘
                 │
                 ▼
           ┌──────────┐
           │  数据库   │
           └──────────┘
```

### 5.2 对比表

| 维度 | DTO | DAO |
|------|-----|-----|
| **全称** | Data Transfer Object | Data Access Object |
| **关键词** | Transfer（传输） | Access（访问） |
| **位置** | Controller 层 | Service → 数据库层 |
| **作用** | 数据传输、校验、筛选 | 数据库访问、CRUD |
| **字段** | 部分字段 | 完整字段 |
| **对应关系** | API 接口 | 数据库表 |
| **包含敏感信息** |  不包含 |  包含 |
| **NestJS 实现** | class-validator | TypeORM/Prisma |
| **示例** | CreateUserDto | User Entity + Repository |

### 5.3 完整流程示例

**从请求到数据库的完整流程**

```typescript
// ========== 1. HTTP 请求 ==========

// 前端发送请求
POST /users
{
  "name": "张三",
  "email": "zhangsan@example.com",
  "password": "abc123"
}

// ========== 2. DTO 验证 ==========

// src/users/dto/create-user.dto.ts
export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string; //  接收

  @IsEmail()
  email: string; //  接收

  @IsString()
  @MinLength(6)
  password: string; //  接收

  //  不接收 id、createdAt、updatedAt
}

// ========== 3. Controller 处理 ==========

@Post()
async create(@Body() createUserDto: CreateUserDto) {
  // DTO 已验证，调用 Service
  return this.usersService.create(createUserDto);
}

// ========== 4. Service 业务逻辑 ==========

async create(createUserDto: CreateUserDto): Promise<User> {
  // 业务逻辑：密码加密
  const hashedPassword = await this.hashPassword(createUserDto.password);
  
  // 调用 DAO 层
  const user = this.userRepository.create({
    ...createUserDto,
    password: hashedPassword,
  });
  
  return this.userRepository.save(user);
}

// ========== 5. DAO 数据访问 ==========

// Entity 映射到数据库表
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number; //  数据库生成

  @Column()
  name: string; //  完整字段

  @Column()
  email: string; //  完整字段

  @Column()
  password: string; //  完整字段

  @CreateDateColumn()
  createdAt: Date; //  数据库生成

  @UpdateDateColumn()
  updatedAt: Date; //  数据库生成
}

// Repository 执行 SQL
INSERT INTO users (name, email, password, createdAt, updatedAt)
VALUES ('张三', 'zhangsan@example.com', 'hashed_password', NOW(), NOW());

// ========== 6. 数据库存储 ==========

// users 表
+----+------+---------------------------+----------------+-----------+---------------------+---------------------+
| id | name | email                     | password       | isActive  | createdAt           | updatedAt           |
+----+------+---------------------------+----------------+-----------+---------------------+---------------------+
| 1  | 张三 | zhangsan@example.com      | hashed_******  | 1         | 2026-03-07 10:00:00 | 2026-03-07 10:00:00 |
+----+------+---------------------------+----------------+-----------+---------------------+---------------------+
```

---

## 六、ORM 库详解

### 6.1 ORM 概念

**概念说明**

ORM（Object-Relational Mapping，对象关系映射）是一种技术，用于在面向对象编程语言和关系型数据库之间建立映射关系。

**ORM 的作用**

```
ORM 的作用：

传统方式（SQL）：
│
├── 编写 SQL 语句
│   └── INSERT INTO users (name, email) VALUES ('张三', '...')
│
├── 手动映射结果
│   └── const user = { id: result[0].id, name: result[0].name }
│
└── 数据库差异
    └── MySQL、PostgreSQL 语法不同

ORM 方式：
│
├── 操作对象
│   └── const user = await userRepository.save({ name: '张三', email: '...' })
│
├── 自动映射
│   └── 返回 User 对象
│
└── 数据库无关
    └── 切换数据库无需修改代码

优势：
• 不用写 SQL
• 代码可读性强
• 类型安全
• 数据库无关
```

### 6.2 主流 ORM 库对比

| ORM 库 | 支持数据库 | 特点 | 适用场景 |
|--------|-----------|------|---------|
| **TypeORM** | MySQL, PostgreSQL, MongoDB, SQLite | TypeScript 优先，装饰器语法 | NestJS 官方推荐 |
| **Prisma** | MySQL, PostgreSQL, MongoDB, SQLite | 类型安全，自动生成客户端 | 现代项目 |
| **Sequelize** | MySQL, PostgreSQL, SQLite | 成熟稳定，社区活跃 | 传统项目 |
| **Mongoose** | MongoDB | MongoDB 专用 | MongoDB 项目 |



### 6.3 TypeORM vs Prisma

**TypeORM 示例**

```typescript
// ========== TypeORM ==========

// 定义实体
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;
}

// 使用
const user = await this.userRepository.findOne({ where: { id: 1 } });
```

**Prisma 示例**

```typescript
// ========== Prisma ==========

// 定义 Schema（schema.prisma）
model User {
  id   Int    @id @default(autoincrement())
  name String
}

// 使用
const user = await prisma.user.findUnique({ where: { id: 1 } });
```

---

## 七、最佳实践

### 7.1 DTO 最佳实践

```typescript
//  推荐：DTO 与 Entity 分离

// Entity：数据库映射
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  password: string; // 敏感字段
}

// DTO：API 接口
export class CreateUserDto {
  @IsString()
  name: string;

  @IsString()
  @MinLength(6)
  password: string;

  //  不包含 id
}

// Response DTO：响应过滤
export class ResponseUserDto {
  id: number;
  name: string;

  @Exclude()
  password: string; // 过滤敏感字段
}
```

### 7.2 DAO 最佳实践

```typescript
//  推荐：Repository 模式

// 自定义 Repository 方法（TypeORM 0.3+ 写法：继承 Repository 并通过 DataSource 构造；
// 0.2.x 的 @EntityRepository 装饰器已废弃）
import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class UsersRepository extends Repository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource.manager);
  }

  async findActiveUsers(): Promise<User[]> {
    return this.createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .getMany();
  }
}

// Service 调用 Repository
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getActiveUsers() {
    return this.userRepository.find({ where: { isActive: true } });
  }
}
```

### 7.3 分层设计原则

```
分层设计原则：
│
├── Controller 层
│   ├── 只处理 HTTP 请求/响应
│   ├── 不包含业务逻辑
│   └── 调用 Service
│
├── Service 层
│   ├── 业务逻辑
│   ├── 数据处理
│   └── 调用 Repository
│
├── Repository 层（DAO）
│   ├── 数据库操作
│   ├── 不包含业务逻辑
│   └── 返回 Entity
│
└── DTO 层
    ├── 数据传输
    ├── 数据校验
    └── 数据过滤
```

---

## 八、常见问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| DTO 验证不生效 | 未启用 ValidationPipe | 在 main.ts 中启用全局管道 |
| DTO 字段过多 | 未区分创建和更新 | 创建 CreateUserDto 和 UpdateUserDto |
| 密码泄露 | 响应返回敏感字段 | 使用 Response DTO 过滤字段 |
| 数据库操作重复 | 未使用 Repository | 提取公共方法到 Repository |
| SQL 注入 | 直接拼接 SQL | 使用 ORM 或参数化查询 |
| 类型不匹配 | DTO 与 Entity 字段不一致 | 明确区分 DTO 和 Entity |
| 循环依赖 | DTO 相互引用 | 使用 OmitType 或 PartialType |
| 更新覆盖字段 | 更新 DTO 包含所有字段 | 使用 PartialType 使字段可选 |

---

## 九、学习要点总结

### 核心要点

1. **MVC 架构**：Model-View-Controller，分层架构模式
2. **DTO 本质**：数据传输对象，重点在"传输"，用于数据校验和筛选
3. **DAO 本质**：数据访问对象，重点在"访问"，封装数据库操作
4. **DTO vs DAO**：DTO 对应 API 接口，DAO 对应数据库表
5. **ORM 库**：TypeORM、Prisma 等，简化数据库操作

### 记忆技巧

```
快速记忆：

MVC：
• Model = 业务逻辑 + 数据
• View = 用户界面
• Controller = 路由分发

DTO vs DAO：
• DTO = Transfer = 传输 = API 接口
• DAO = Access = 访问 = 数据库

关键词：
• DTO → 传输 → Controller 层
• DAO → 访问 → 数据库层
```

### 行动建议

```
学习路径：
│
├──  第一阶段：理解概念（1 天）
│   ├── 理解 MVC 架构
│   ├── 理解 DTO 和 DAO 区别
│   └── 理解 ORM 库的作用
│
├──  第二阶段：实践练习（3 天）
│   ├── 创建 Entity 和 DTO
│   ├── 实现数据验证
│   └── 实现 CRUD 操作
│
└──  第三阶段：深入应用（持续）
    ├── 学习 TypeORM 高级特性
    ├── 学习 Prisma
    └── 性能优化
```

---

## 十、延伸学习资源

### 官方资源

-  [NestJS Controllers](https://docs.nestjs.com/controllers)
-  [NestJS Providers](https://docs.nestjs.com/providers)
-  [TypeORM Documentation](https://typeorm.io/)
-  [Prisma Documentation](https://www.prisma.io/)
-  [class-validator](https://github.com/typestack/class-validator)

### 练习建议

1. **练习 1**：创建一个完整的 CRUD 模块，包含 DTO 和 Entity
2. **练习 2**：实现数据验证，包含各种验证规则
3. **练习 3**：使用 Response DTO 过滤敏感字段
4. **练习 4**：对比 TypeORM 和 Prisma 的使用方式
5. **练习 5**：实现分页查询功能

### 延伸思考

### 延伸思考

DTO 与 Entity 的区分本质是「接口契约」与「存储结构」的解耦:两者字段可能暂时一致,但演进节奏不同;实践中还应理解 DTO 与 VO 的差异,以及 TypeORM/Prisma 在分层架构中的取舍。

---

## 附录：概念速查表

| 概念 | 全称 | 说明 | NestJS 实现 |
|------|------|------|------------|
| **MVC** | Model-View-Controller | 架构模式 | Controller + Service + Entity |
| **DTO** | Data Transfer Object | 数据传输对象 | class-validator |
| **DAO** | Data Access Object | 数据访问对象 | TypeORM/Prisma |
| **Entity** | - | 数据库实体 | @Entity() |
| **Repository** | - | 数据仓库 | 继承 Repository（配合 DataSource） |
| **ORM** | Object-Relational Mapping | 对象关系映射 | TypeORM/Prisma |
