---
title: NestJS 工程目录与代码规范
description: "NestJS 企业级工程化实践:目录结构从单文件到分层模块的演进、核心目录(src/common/config)职责、文件/类/变量命名规范、ESLint+Prettier 统一风格与最佳实践案例。"
keywords: [NestJS, 工程目录, 代码规范, ESLint, Prettier]
created: 2026-11-14
updated: 2026-11-14
status: 正式
category: Node.js
tags: [Node.js, NestJS, 工程化]
---

# NestJS 工程目录与代码规范

## 一、工程目录结构演进

### 1.1 三种典型目录结构对比

#### 项目一：基础项目结构（CLI 默认生成）

```
基础项目结构（适合小型项目）：
│
nest-project/
├── src/
│   ├── main.ts                    # 应用入口
│   ├── app.module.ts              # 根模块
│   ├── app.controller.ts          # 根控制器
│   ├── app.controller.spec.ts     # 测试文件
│   ├── app.service.ts             # 根服务
│   └── app.service.spec.ts        # 测试文件
├── test/                          # E2E 测试
├── nest-cli.json                  # CLI 配置
├── tsconfig.json                  # TS 配置
└── package.json                   # 依赖管理

 特点：
- 结构简单，适合入门
- CLI 自动生成
- 单模块应用

 适用场景：
- 小型项目
- 学习阶段
- 单体应用
```

#### 项目二：微服务项目结构（中大型项目）

```
微服务项目结构（适合中大型项目）：
│
nest-microservice/
├── apps/                          # 微服务应用
│   ├── user-service/              # 用户服务
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── user.module.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.entity.ts     # 实体类
│   │   │   └── user.dto.ts        # DTO
│   │   └── test/
│   │
│   ├── order-service/             # 订单服务
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── order.module.ts
│   │   │   ├── order.controller.ts
│   │   │   ├── order.service.ts
│   │   │   ├── order.entity.ts
│   │   │   └── order.dto.ts
│   │   └── test/
│   │
│   └── api-gateway/               # API 网关
│       ├── src/
│       └── test/
│
├── libs/                          # 共享库
│   ├── common/                    # 公共模块
│   │   ├── src/
│   │   │   ├── decorators/        # 装饰器
│   │   │   ├── filters/           # 过滤器
│   │   │   ├── guards/            # 守卫
│   │   │   ├── interceptors/      # 拦截器
│   │   │   ├── pipes/             # 管道
│   │   │   └── interfaces/        # 接口定义
│   │   └── index.ts
│   │
│   └── shared/                    # 共享模块
│       ├── src/
│       │   ├── database/          # 数据库配置
│       │   ├── config/            # 配置
│       │   └── utils/             # 工具函数
│       └── index.ts
│
├── nest-cli.json
├── tsconfig.json
└── package.json

 特点：
- 微服务架构
- 多服务独立部署
- 共享库复用
- 按服务划分

 适用场景：
- 中大型项目
- 微服务架构
- 团队协作
```

#### 项目三：完整企业级项目结构（推荐）必须掌握



```
企业级项目结构（适合复杂业务）：
│
nest-enterprise/
├── src/
│   ├── main.ts                    # 应用入口
│   ├── app.module.ts              # 根模块
│   │
│   ├── common/                    # 公共模块
│   │   ├── decorators/            # 装饰器
│   │   │   ├── current-user.decorator.ts
│   │   │   ├── is-unique.decorator.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── filters/               # 过滤器
│   │   │   ├── http-exception.filter.ts
│   │   │   ├── all-exceptions.filter.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── guards/                # 守卫
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── interceptors/          # 拦截器
│   │   │   ├── logging.interceptor.ts
│   │   │   ├── transform.interceptor.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── pipes/                 # 管道
│   │   │   ├── validation.pipe.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── dto/                   # 公共 DTO
│   │   │   ├── pagination.dto.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── interfaces/            # 接口定义
│   │   │   ├── user.interface.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── entities/              # 基础实体
│   │   │   ├── base.entity.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── exceptions/            # 自定义异常
│   │   │   ├── business.exception.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── constants/             # 常量定义
│   │   │   ├── error-code.constant.ts
│   │   │   └── index.ts
│   │   │
│   │   └── utils/                 # 工具函数
│   │       ├── date.util.ts
│   │       ├── string.util.ts
│   │       └── index.ts
│   │
│   ├── config/                    # 配置模块
│   │   ├── app.config.ts          # 应用配置
│   │   ├── database.config.ts     # 数据库配置
│   │   ├── jwt.config.ts          # JWT 配置
│   │   └── index.ts
│   │
│   ├── modules/                   # 业务模块（推荐）
│   │   ├── auth/                  # 认证模块
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   ├── register.dto.ts
│   │   │   │   └── index.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.strategy.ts   # JWT 策略
│   │   │   └── auth.spec.ts
│   │   │
│   │   ├── users/                 # 用户模块
│   │   │   ├── dto/
│   │   │   │   ├── create-user.dto.ts
│   │   │   │   ├── update-user.dto.ts
│   │   │   │   └── index.ts
│   │   │   ├── entities/
│   │   │   │   ├── user.entity.ts
│   │   │   │   └── index.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.module.ts
│   │   │   └── users.spec.ts
│   │   │
│   │   ├── posts/                 # 文章模块
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── posts.controller.ts
│   │   │   ├── posts.service.ts
│   │   │   ├── posts.module.ts
│   │   │   └── posts.spec.ts
│   │   │
│   │   ├── comments/              # 评论模块
│   │   │   ├── dto/
│   │   │   ├── entities/
│   │   │   ├── comments.controller.ts
│   │   │   ├── comments.service.ts
│   │   │   ├── comments.module.ts
│   │   │   └── comments.spec.ts
│   │   │
│   │   └── categories/            # 分类模块
│   │       ├── dto/
│   │       ├── entities/
│   │       ├── categories.controller.ts
│   │       ├── categories.service.ts
│   │       ├── categories.module.ts
│   │       └── categories.spec.ts
│   │
│   ├── database/                  # 数据库配置
│   │   ├── migrations/            # 迁移文件
│   │   ├── seeds/                 # 种子数据
│   │   └── database.module.ts
│   │
│   └── types/                     # 类型定义
│       ├── express.d.ts           # Express 类型扩展
│       └── index.d.ts
│
├── test/                          # E2E 测试
│   ├── app.e2e-spec.ts
│   ├── auth.e2e-spec.ts
│   └── users.e2e-spec.ts
│
├── .env                           # 环境变量
├── .env.example                   # 环境变量示例
├── .eslintrc.js                   # ESLint 配置
├── .prettierrc                    # Prettier 配置
├── nest-cli.json                  # NestJS CLI 配置
├── tsconfig.json                  # TypeScript 配置
├── tsconfig.build.json            # 构建配置
└── package.json                   # 项目依赖

 特点：
- 结构清晰，分层明确
- 公共模块提炼
- 业务模块独立
- 配置集中管理
- 易于维护和扩展

 适用场景：
- 中大型项目
- 企业级应用
- 复杂业务逻辑
- 长期维护项目
```

### 1.2 目录结构最佳实践总结

```
目录设计原则：
│
├──  原则一：按功能模块划分
│   ├── 每个模块独立成文件夹
│   ├── 模块内部包含：controller、service、dto、entity
│   └── 模块之间低耦合，高内聚
│
├──  原则二：公共代码提炼
│   ├── common 文件夹存放共享代码
│   ├── decorators、guards、filters、pipes 等
│   └── 避免重复代码，提高复用性
│
├──  原则三：分层清晰
│   ├── 表现层：Controller（控制器）
│   ├── 业务层：Service（服务）
│   ├── 数据层：Entity、Repository（实体、仓库）
│   └── 传输层：DTO（数据传输对象）
│
├──  原则四：目录层级不要太深
│   ├── 公共代码扁平化（直接放 src 根目录）
│   ├── 引用路径简洁
│   └── 避免嵌套过深（不超过 3-4 层）
│
└──  原则五：配置集中管理
    ├── config 文件夹统一管理配置
    ├── 数据库、JWT、应用配置分离
    └── 使用 @nestjs/config 管理
```

---

## 二、核心目录详解



### 2.1 common 目录（公共模块）

```
common/ 目录详解：
│
├── decorators/                    # 自定义装饰器
│   ├── current-user.decorator.ts  # 获取当前用户
│   ├── is-unique.decorator.ts     # 唯一性验证
│   └── index.ts                   # 统一导出
│
├── filters/                       # 异常过滤器
│   ├── http-exception.filter.ts   # HTTP 异常
│   ├── all-exceptions.filter.ts   # 全局异常
│   └── index.ts
│
├── guards/                        # 守卫
│   ├── jwt-auth.guard.ts          # JWT 认证
│   ├── roles.guard.ts             # 角色权限
│   └── index.ts
│
├── interceptors/                  # 拦截器
│   ├── logging.interceptor.ts     # 日志记录
│   ├── transform.interceptor.ts   # 响应转换
│   └── index.ts
│
├── pipes/                         # 管道
│   ├── validation.pipe.ts         # 验证管道
│   └── index.ts
│
├── dto/                           # 公共 DTO
│   ├── pagination.dto.ts          # 分页 DTO
│   └── index.ts
│
├── interfaces/                    # 接口定义
│   ├── user.interface.ts
│   └── index.ts
│
├── entities/                      # 基础实体
│   ├── base.entity.ts             # 基础实体类
│   └── index.ts
│
├── exceptions/                    # 自定义异常
│   ├── business.exception.ts
│   └── index.ts
│
├── constants/                     # 常量定义
│   ├── error-code.constant.ts
│   └── index.ts
│
└── utils/                         # 工具函数
    ├── date.util.ts
    ├── string.util.ts
    └── index.ts
```

#### common 代码示例

```typescript
// ===== src/common/decorators/current-user.decorator.ts =====
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    return data ? user?.[data] : user;
  },
);

// 使用示例：
@Controller('users')
export class UsersController {
  @Get('profile')
  getProfile(@CurrentUser() user: User) {
    return user;
  }
  
  @Get('profile/id')
  getUserId(@CurrentUser('id') id: number) {
    return { id };
  }
}

// ===== src/common/filters/http-exception.filter.ts =====
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
    });
  }
}

// ===== src/common/interceptors/transform.interceptor.ts =====
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  code: number;
  message: string;
  data: T;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => ({
        code: 200,
        message: 'Success',
        data,
      })),
    );
  }
}

// ===== src/common/entities/base.entity.ts =====
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Column,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'is_deleted', default: false })
  isDeleted: boolean;
}

// 使用示例：
@Entity('users')
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column()
  email: string;
}
```



### 2.2 modules 目录（业务模块）

```
modules/ 目录详解：
│
├── auth/                          # 认证模块
│   ├── dto/
│   │   ├── login.dto.ts           # 登录 DTO
│   │   ├── register.dto.ts        # 注册 DTO
│   │   └── index.ts
│   ├── auth.controller.ts         # 控制器
│   ├── auth.service.ts            # 服务
│   ├── auth.module.ts             # 模块定义
│   ├── auth.strategy.ts           # JWT 策略
│   └── auth.spec.ts               # 单元测试
│
├── users/                         # 用户模块
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   ├── update-user.dto.ts
│   │   └── index.ts
│   ├── entities/
│   │   ├── user.entity.ts
│   │   └── index.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.module.ts
│   └── users.spec.ts
│
└── posts/                         # 文章模块
    ├── dto/
    ├── entities/
    ├── posts.controller.ts
    ├── posts.service.ts
    ├── posts.module.ts
    └── posts.spec.ts
```

#### 模块标准结构示例

```typescript
// ===== src/modules/users/users.module.ts =====
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],  // 导出供其他模块使用
})
export class UsersModule {}

// ===== src/modules/users/users.controller.ts =====
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }
}

// ===== src/modules/users/users.service.ts =====
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }
}

// ===== src/modules/users/entities/user.entity.ts =====
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity';

@Entity('users')
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ select: false })  // 默认不查询密码
  password: string;
}

// ===== src/modules/users/dto/create-user.dto.ts =====
import { IsString, IsEmail, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2, { message: '姓名至少2个字符' })
  name: string;

  @IsEmail({}, { message: '邮箱格式不正确' })
  email: string;

  @IsString()
  @MinLength(6, { message: '密码至少6个字符' })
  password: string;
}
```



### 2.3 config 目录（配置管理）

```typescript
// ===== src/config/app.config.ts =====
export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
});

// ===== src/config/database.config.ts =====
export default () => ({
  type: process.env.DB_TYPE || 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'test',
  synchronize: process.env.NODE_ENV !== 'production',
});

// ===== src/config/jwt.config.ts =====
export default () => ({
  secret: process.env.JWT_SECRET || 'secret-key',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
});

// ===== src/app.module.ts - 使用配置 =====
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig],
      envFilePath: ['.env'],
    }),
    // ... 其他模块
  ],
})
export class AppModule {}
```

---

## 三、代码规范风格指南

### 3.1 代码组织原则

```
代码组织总则：
│
├──  文件原则
│   ├── 单一职责：每个文件只定义一样东西
│   ├── 文件大小：建议不超过 400 行代码
│   ├── 功能完整：一个文件包含一个完整功能
│   └── 职责清晰：文件名反映其功能
│
├──  函数原则
│   ├── 函数大小：建议不超过 75 行代码
│   ├── 单一功能：一个函数只做一件事
│   ├── 参数控制：参数不超过 3-4 个
│   └── 返回明确：有明确的返回值
│
├──  复用原则
│   ├── 公共代码：提炼到 common 文件夹
│   ├── 函数复用：通过函数形式复用
│   ├── 组件复用：通过模块形式复用
│   └── 避免重复：DRY（Don't Repeat Yourself）
│
└──  可读性原则
    ├── 命名清晰：变量名、函数名见名知意
    ├── 注释适度：复杂逻辑添加注释
    ├── 代码格式：统一缩进、换行
    └── 逻辑清晰：先定义变量、再处理逻辑、最后返回
```

### 3.2 文件命名规范

#### 文件命名规则

```
文件命名规范（小写 + 短横线）：
│
├──  正确示例
│   ├── user.controller.ts        # 控制器
│   ├── user.service.ts           # 服务
│   ├── user.module.ts            # 模块
│   ├── user.entity.ts            # 实体
│   ├── create-user.dto.ts        # DTO
│   ├── user.interface.ts         # 接口
│   ├── jwt-auth.guard.ts         # 守卫
│   ├── validation.pipe.ts        # 管道
│   ├── logging.interceptor.ts    # 拦截器
│   └── http-exception.filter.ts  # 过滤器
│
└──  错误示例
    ├── UserController.ts         #  不用大驼峰
    ├── userController.ts         #  不用小驼峰
    ├── user_controller.ts        #  不用下划线
    └── usercontroller.ts         #  单词未分隔
```

#### 后缀约定

```
文件后缀约定：
│
├── 控制器：*.controller.ts
│   └── 例：user.controller.ts
│
├── 服务：*.service.ts
│   └── 例：user.service.ts
│
├── 模块：*.module.ts
│   └── 例：user.module.ts
│
├── 实体：*.entity.ts
│   └── 例：user.entity.ts
│
├── DTO：*.dto.ts
│   └── 例：create-user.dto.ts
│
├── 接口：*.interface.ts
│   └── 例：user.interface.ts
│
├── 守卫：*.guard.ts
│   └── 例：jwt-auth.guard.ts
│
├── 管道：*.pipe.ts
│   └── 例：validation.pipe.ts
│
├── 拦截器：*.interceptor.ts
│   └── 例：logging.interceptor.ts
│
├── 过滤器：*.filter.ts
│   └── 例：http-exception.filter.ts
│
├── 装饰器：*.decorator.ts
│   └── 例：current-user.decorator.ts
│
└── 测试：*.spec.ts（单元测试）、*.e2e-spec.ts（E2E 测试）
    └── 例：user.service.spec.ts
```



### 3.3 类与函数命名规范

#### 类命名规范（大驼峰）

```typescript
// =====  正确示例：类名使用大驼峰 =====

// 控制器
@Controller('users')
export class UsersController {
  // ...
}

// 服务
@Injectable()
export class UsersService {
  // ...
}

// 模块
@Module({})
export class UsersModule {
  // ...
}

// 实体
@Entity('users')
export class User {
  // ...
}

// DTO
export class CreateUserDto {
  // ...
}

// 守卫
@Injectable()
export class JwtAuthGuard implements CanActivate {
  // ...
}

// 管道
@Injectable()
export class ValidationPipe implements PipeTransform {
  // ...
}

// 拦截器
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  // ...
}

// 过滤器
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  // ...
}
```

#### 函数命名规范（小驼峰）

```typescript
// =====  正确示例：函数名使用小驼峰 =====

export class UsersService {
  // 获取所有用户
  findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  // 获取单个用户
  findOne(id: number): Promise<User> {
    return this.usersRepository.findOne({ where: { id } });
  }

  // 创建用户
  create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.usersRepository.create(createUserDto);
    return this.usersRepository.save(user);
  }

  // 更新用户
  update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    return this.usersRepository.update(id, updateUserDto);
  }

  // 删除用户
  remove(id: number): Promise<void> {
    return this.usersRepository.delete(id);
  }

  // 检查邮箱是否存在
  checkEmailExists(email: string): Promise<boolean> {
    return this.usersRepository.exists({ where: { email } });
  }

  // 生成 JWT token
  generateJwtToken(user: User): string {
    return this.jwtService.sign({ id: user.id, email: user.email });
  }
}
```

#### 变量命名规范（小驼峰）

```typescript
// =====  正确示例：变量名使用小驼峰 =====

// 普通变量
const userName = '张三';
const userId = 123;
const isActive = true;

// 常量（全大写 + 下划线）
const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE = 1;
const JWT_SECRET = 'secret-key';

// 私有变量（下划线前缀）
export class UsersService {
  private readonly userRepository: Repository<User>;
  private _cache: Map<string, any>;
}

// 接口属性（小驼峰）
interface User {
  id: number;
  userName: string;
  emailAddress: string;
  createdAt: Date;
}

// 枚举（大驼峰 + 大驼峰值）
enum UserRole {
  Admin = 'Admin',
  User = 'User',
  Guest = 'Guest',
}

// 枚举（大驼峰 + 全大写下划线值）
enum HttpStatus {
  OK = 200,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}
```

### 3.4 前后端命名规范对比

```
前端 vs 后端命名规范对比：
│
├── 前端（Vue/React）
│   ├── 组件文件：大驼峰（UserCard.vue）
│   ├── 页面文件：小驼峰（userProfile.vue）
│   ├── 样式文件：小写短横线
│   └── 原因：组件类似类，使用大驼峰
│
└── 后端
    ├── 所有文件：小写短横线
    │   ├── user.controller.ts
    │   ├── user.service.ts
    │   └── user.module.ts
    ├── 类名：大驼峰
    │   ├── UsersController
    │   ├── UsersService
    │   └── UsersModule
    └── 原因：后端偏传统，文件名小写更规范
```



### 3.5 代码格式化工具

#### ESLint + Prettier 配置

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

`.prettierrc`：

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "tabWidth": 2,
  "semi": true,
  "printWidth": 100,
  "arrowParens": "always",
  "endOfLine": "auto"
}
```

`package.json` 中添加的 scripts：

```json
{
  "scripts": {
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix",
    "format": "prettier --write \"src/**/*.ts\" \"test/**/*.ts\""
  }
}
```

---

## 四、最佳实践案例

### 4.1 推荐项目结构（综合版）

```
完整项目结构（推荐）：
│
nest-project/
├── src/
│   ├── main.ts                    # 应用入口
│   ├── app.module.ts              # 根模块
│   │
│   ├── common/                    # 公共模块
│   │   ├── decorators/            # 装饰器
│   │   ├── filters/               # 过滤器
│   │   ├── guards/                # 守卫
│   │   ├── interceptors/          # 拦截器
│   │   ├── pipes/                 # 管道
│   │   ├── dto/                   # 公共 DTO
│   │   ├── interfaces/            # 接口
│   │   ├── entities/              # 基础实体
│   │   ├── exceptions/            # 异常
│   │   ├── constants/             # 常量
│   │   └── utils/                 # 工具函数
│   │
│   ├── config/                    # 配置
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   └── jwt.config.ts
│   │
│   ├── modules/                   # 业务模块
│   │   ├── auth/
│   │   ├── users/
│   │   ├── posts/
│   │   └── comments/
│   │
│   ├── database/                  # 数据库
│   │   ├── migrations/
│   │   ├── seeds/
│   │   └── database.module.ts
│   │
│   └── types/                     # 类型定义
│
├── test/                          # 测试
├── .env                           # 环境变量
├── .eslintrc.js                   # ESLint
├── .prettierrc                    # Prettier
└── package.json
```

### 4.2 模块创建最佳实践

```bash
# ===== 创建用户模块完整流程 =====

# 1. 创建模块
nest g module modules/users

# 2. 创建控制器
nest g controller modules/users --module=modules/users

# 3. 创建服务
nest g service modules/users --module=modules/users

# 4. 创建 DTO
nest g class modules/users/dto/create-user.dto --flat
nest g class modules/users/dto/update-user.dto --flat

# 5. 创建实体
nest g class modules/users/entities/user.entity --flat

# 6. 测试文件（*.spec.ts）在生成代码时自动创建（不加 --no-spec 时）

# 最终结构：
src/modules/users/
├── dto/
│   ├── create-user.dto.ts
│   └── update-user.dto.ts
├── entities/
│   └── user.entity.ts
├── users.controller.ts
├── users.controller.spec.ts
├── users.service.ts
├── users.service.spec.ts
└── users.module.ts
```

---

## 五、常见问题与解决方案

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 目录结构混乱 | 缺乏规划 | 参考推荐结构，按模块划分 |
| 文件命名不一致 | 未统一规范 | 使用小写+短横线，遵循后缀约定 |
| 类名命名不规范 | 混淆前后端规范 | 类名统一使用大驼峰 |
| 代码行数过多 | 单一职责不明确 | 拆分函数，提炼公共逻辑 |
| 公共代码重复 | 未提炼公共模块 | 创建 common 文件夹，统一管理 |
| 配置散乱 | 未集中管理 | 使用 config 文件夹 + @nestjs/config |
| 导入路径复杂 | 目录层级太深 | 扁平化公共代码，使用别名 |

---

## 六、学习要点总结

### 核心要点

1. **目录结构三原则**：按功能模块划分、公共代码提炼、分层清晰
2. **文件命名规范**：小写 + 短横线（user.controller.ts）
3. **类名命名规范**：大驼峰（UsersController）
4. **代码大小控制**：文件 ≤ 400 行，函数 ≤ 75 行
5. **公共模块管理**：common 文件夹统一管理共享代码

### 最佳实践清单

```
 目录结构检查清单：
│
├──  是否按功能模块划分？
├──  公共代码是否提炼到 common？
├──  配置是否集中管理？
├──  目录层级是否超过 3-4 层？
└──  测试文件是否齐全？
│
 命名规范检查清单：
│
├──  文件名是否使用小写+短横线？
├──  类名是否使用大驼峰？
├──  函数名是否使用小驼峰？
├──  常量是否使用全大写+下划线？
└──  后缀是否符合约定？
│
 代码质量检查清单：
│
├──  文件行数是否超过 400 行？
├──  函数行数是否超过 75 行？
├──  是否存在重复代码？
├──  函数职责是否单一？
└──  变量命名是否清晰？
```

---

## 七、延伸学习资源

### 官方资源

-  [Angular 风格指南](https://angular.io/guide/styleguide)（NestJS 遵循）
-  [NestJS 官方文档 - 项目结构](https://docs.nestjs.com/cli/monorepo)
-  [Clean Code TypeScript](https://github.com/labs42io/clean-code-typescript)
-  [TypeScript 最佳实践](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

### 代码规范工具

-  [ESLint](https://eslint.org/)
-  [Prettier](https://prettier.io/)
-  [Commitlint](https://commitlint.js.org/)（Git 提交规范）
-  [Husky](https://typicode.github.io/husky/)（Git Hooks）

### 优秀项目参考

-  [NestJS Realworld Example](https://github.com/lujakob/nestjs-realworld-example-app)
-  [NestJS TypeORM Starter](https://github.com/nestjs/typeorm-starter)
-  [NestJS Prisma Starter](https://github.com/nestjs/prisma-starter)
-  [Awesome NestJS](https://github.com/nestjs/awesome-nestjs)

---

## 附录：命名规范速查表

### 文件命名

| 类型 | 后缀 | 示例 |
|------|------|------|
| 控制器 | `*.controller.ts` | `user.controller.ts` |
| 服务 | `*.service.ts` | `user.service.ts` |
| 模块 | `*.module.ts` | `user.module.ts` |
| 实体 | `*.entity.ts` | `user.entity.ts` |
| DTO | `*.dto.ts` | `create-user.dto.ts` |
| 接口 | `*.interface.ts` | `user.interface.ts` |
| 守卫 | `*.guard.ts` | `jwt-auth.guard.ts` |
| 管道 | `*.pipe.ts` | `validation.pipe.ts` |
| 拦截器 | `*.interceptor.ts` | `logging.interceptor.ts` |
| 过滤器 | `*.filter.ts` | `http-exception.filter.ts` |
| 装饰器 | `*.decorator.ts` | `current-user.decorator.ts` |
| 单元测试 | `*.spec.ts` | `user.service.spec.ts` |
| E2E 测试 | `*.e2e-spec.ts` | `user.e2e-spec.ts` |

### 类命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 控制器 | 大驼峰 + Controller | `UsersController` |
| 服务 | 大驼峰 + Service | `UsersService` |
| 模块 | 大驼峰 + Module | `UsersModule` |
| 实体 | 大驼峰 | `User` |
| DTO | 大驼峰 + Dto | `CreateUserDto` |
| 接口 | 大驼峰 | `User` |
| 守卫 | 大驼峰 + Guard | `JwtAuthGuard` |
| 管道 | 大驼峰 + Pipe | `ValidationPipe` |
| 拦截器 | 大驼峰 + Interceptor | `LoggingInterceptor` |
| 过滤器 | 大驼峰 + Filter | `HttpExceptionFilter` |

### 变量命名

| 类型 | 规范 | 示例 |
|------|------|------|
| 普通变量 | 小驼峰 | `userName`, `userId` |
| 常量 | 全大写+下划线 | `MAX_PAGE_SIZE` |
| 私有变量 | 下划线前缀 | `_cache` |
| 函数 | 小驼峰 | `findAll`, `checkEmailExists` |
| 枚举 | 大驼峰 | `UserRole`, `HttpStatus` |
