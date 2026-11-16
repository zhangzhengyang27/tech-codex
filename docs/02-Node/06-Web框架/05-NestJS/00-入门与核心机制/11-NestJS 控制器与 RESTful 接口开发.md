---
title: NestJS 控制器与 RESTful 接口开发
description: "NestJS 接口开发实战:start:dev 热更新、@Controller 路由映射、全局路由前缀与版本管理、CLI 生成模块、Postman 接口调试与环境管理,附 GET /range/:number 实战案例。"
keywords: [NestJS, Controller, RESTful, 路由前缀, 接口调试]
created: 2026-11-14
updated: 2026-11-14
status: 正式
category: Node.js
tags: [Node.js, NestJS, 接口开发]
---

# NestJS 控制器与 RESTful 接口开发

## 一、项目启动与热更新

### 1.1 `start:dev` 的作用

**概念说明**  
`start:dev` 用于开发环境启动，支持监听文件变化并自动重启服务，适合边写边调试。

**语法/用法**

```bash
pnpm run start:dev
# 或 npm run start:dev
```

**代码示例**

```json
{
  "scripts": {
    "start:dev": "nest start --watch"
  }
}
```

**注意事项**

- 课堂里“start DV”应为 `start:dev`。
- 自动重启只适合开发环境，生产环境应使用编译后产物运行。

---

## 二、Controller 路由映射机制

### 2.1 `@Controller` + `@Get`

**概念说明**  
控制器通过装饰器声明路由入口：`@Controller('api')` 定义控制器前缀，`@Get('app')` 定义具体路径。

**语法/用法**

- 路径拼接规则：`控制器前缀 + 方法路径`
- `@Get('hello')` 和 `@Get('/hello')` 效果一致（推荐不写前导 `/`）

**代码示例**

```ts
import { Controller, Get } from '@nestjs/common';

@Controller('api')
export class AppController {
  @Get('app')
  getApp(): string {
    return "hello, let's NestJS";
  }
}
```

**注意事项**

- 访问路径从 `/app` 变为 `/api/app`。
- 改动装饰器后出现 404 多数是路径没同步调整。

### 2.2 默认 JSON 响应

**概念说明**  
NestJS 会自动序列化对象/数组为 JSON，无需手动 `JSON.stringify`。

**语法/用法**

- 返回字符串：响应纯文本
- 返回对象：响应 JSON

**代码示例**

```ts
@Get('hello')
getHello(): { code: number; data: string; message: string } {
  return {
    code: 0,
    data: 'hello James',
    message: '请求成功',
  };
}
```

**注意事项**

- 课堂里用 `any` 只是教学简化，实际项目建议声明明确返回类型。

---

## 三、全局路由前缀与版本管理

### 3.1 `setGlobalPrefix` 实战

**概念说明**  
全局前缀用于统一接口命名、版本隔离和网关转发约定。

**语法/用法**

```ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  await app.listen(3000);
}
bootstrap();
```

**代码示例**

- 原路径：`GET /users`
- 设置后：`GET /api/v1/users`

**注意事项**

- 设置前缀后，老路径会 404，属于正常现象。
- 建议前缀语义统一：`api/v1`、`api/v2`。

---

## 四、CLI 生成模块与分层

### 4.1 生成模块、控制器、服务

**概念说明**  
Nest CLI 会自动生成标准文件结构，并在 `app.module.ts` / 对应模块中自动注册。

**语法/用法**

```bash
# 创建模块
nest g module user

# 创建控制器（不生成测试文件）
nest g controller user --no-spec

# 创建服务（不生成测试文件）
nest g service user --no-spec

# 预演模式（不落盘）
nest g controller user --no-spec -d
```

**代码示例**

```text
src/user/
├── user.module.ts
├── user.controller.ts
└── user.service.ts
```

**注意事项**

- 课堂里的“next g9”“no SPC”等均为口误，正确是 `nest g`、`--no-spec`。
- 建议先 `-d` 预览，再执行真实生成命令。

### 4.2 Controller 与 Service 分工

**概念说明**  
Controller 负责接收请求和返回响应；Service 负责业务逻辑。

**语法/用法**

- 通过构造器注入 Service（依赖注入）
- Controller 调用 Service 方法完成数据处理

**代码示例**

```ts
// user.controller.ts
import { Controller, Get, Post } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getUsers() {
    return this.userService.getUsers();
  }

  @Post()
  addUser() {
    return this.userService.addUser();
  }
}

// user.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  getUsers() {
    return {
      code: 0,
      data: [{ id: 1, name: 'Tom' }],
      message: '请求用户列表成功',
    };
  }

  addUser() {
    return {
      code: 0,
      data: { id: 2, name: 'Jerry' },
      message: '添加用户成功',
    };
  }
}
```

**注意事项**

- 构造器参数 `private readonly userService: UserService` 是 TS 参数属性语法，不是手动 `new`。
- 浏览器地址栏只能方便测试 GET，POST 建议用 Postman/Apifox。

---

## 五、接口调试与环境管理

### 5.1 Postman 环境变量

**概念说明**  
使用环境变量可在 DEV/PRO 间快速切换，避免手动改 URL。

**语法/用法**

- 环境变量：`baseUrl`
- 请求地址：`{{baseUrl}}/api/v1/user`

**代码示例**

```text
DEV: baseUrl = http://localhost:3000
PRO: baseUrl = https://api.example.com
```

**注意事项**

- 先选中正确环境，再发请求。
- 团队内建议把 Collection 与 Environment 一起管理。

---

## 六、实战案例：`GET /range/:number`

### 6.1 需求分析

**概念说明**  
传入 `number`，返回从 1 到 `number` 的**字符串数组**。例如：`50 -> ["1", "2", ..., "50"]`。

**语法/用法**

- 路由参数：`@Param('number')`
- 参数校验：`ParseIntPipe` + 自定义范围判断
- 返回类型：`string[]`（不是 `number[]`）

**代码示例**

```ts
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

@Controller('range')
export class RangeController {
  @Get(':number')
  getRange(@Param('number', ParseIntPipe) number: number) {
    if (number <= 0 || number > 10000) {
      throw new BadRequestException('number 必须在 1~10000 之间');
    }

    const data = Array.from({ length: number }, (_, index) => String(index + 1));

    return {
      code: 0,
      data,
      message: '请求成功',
    };
  }
}
```

**注意事项**

- 常见错误：路径写错、请求方法写错、`data` 返回成数字数组。
- 改进要点：边界值校验、返回结构统一、命名规范清晰。

---

## 代码实战案例

### 需求描述

实现一个 `user` 模块，提供：

1. `GET /api/v1/user`：查询用户列表
2. `POST /api/v1/user`：新增用户
3. 响应结构统一：`{ code, data, message }`

### 完整实现代码

```ts
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  await app.listen(3000);
}
bootstrap();

// src/user/user.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}

// src/user/user.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  private users = [{ id: 1, name: 'Tom' }];

  getUsers() {
    return {
      code: 0,
      data: this.users,
      message: '请求用户列表成功',
    };
  }

  addUser() {
    const newUser = { id: Date.now(), name: 'New User' };
    this.users.push(newUser);
    return {
      code: 0,
      data: newUser,
      message: '添加用户成功',
    };
  }
}

// src/user/user.controller.ts
import { Controller, Get, Post } from '@nestjs/common';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getUsers() {
    return this.userService.getUsers();
  }

  @Post()
  addUser() {
    return this.userService.addUser();
  }
}
```

### 代码逐行解析

| 代码位置 | 关键点 | 说明 |
|---|---|---|
| `main.ts` | `setGlobalPrefix('api/v1')` | 统一接口访问前缀，便于版本化管理 |
| `user.module.ts` | `controllers/providers` | 注册控制器与服务，建立依赖关系 |
| `user.controller.ts` | `@Get()` / `@Post()` | 映射 HTTP 方法到具体业务入口 |
| `user.controller.ts` | 构造器注入 `UserService` | 通过 DI 获取业务能力，不手动 new |
| `user.service.ts` | `getUsers/addUser` | 承载核心业务逻辑与数据处理 |
| 全部响应 | `{ code, data, message }` | 统一返回结构，便于前端消费与错误处理 |

---

## 常见问题与解决方案

| 问题 | 原因 | 解决方案 |
|---|---|---|
| 请求路径 404 | 忘记加 `api/v1` 前缀 | 检查 `main.ts` 的 `setGlobalPrefix` 设置 |
| `Post` 装饰器报未定义 | 未导入 `Post` | `import { Post } from '@nestjs/common'` |
| 浏览器无法测试 POST | 浏览器地址栏只适合 GET | 使用 Postman/Apifox 发 POST |
| CLI 命令生成了多余测试文件 | 没加 `--no-spec` | 命令追加 `--no-spec` |
| 返回结构不统一 | Controller 各自返回格式随意 | 统一为 `{ code, data, message }` 规范 |
| `range` 返回数字数组 | 忽略“字符串数组”要求 | `String(index + 1)` 做显式转换 |

---

## 学习要点总结

1. `@Controller` + `@Get/@Post` 是 NestJS 接口开发最核心入口。  
2. CLI 能大幅提升项目搭建与代码生成效率，建议先 `-d` 预演。  
3. `setGlobalPrefix('api/v1')` 是接口版本治理的关键基础动作。  
4. Controller 只做“请求/响应”，业务逻辑放 Service，分层必须坚持。  
5. 实战案例 `range` 的重点在“参数校验 + 字符串数组返回 + 路由准确性”。

---

## 延伸学习资源

- 官方文档：
  - [NestJS Controllers](https://docs.nestjs.com/controllers)
  - [NestJS Providers](https://docs.nestjs.com/providers)
  - [NestJS CLI Overview](https://docs.nestjs.com/cli/overview)
  - [NestJS Validation](https://docs.nestjs.com/techniques/validation)
- 练习建议：
  - 练习 1：给 `POST /user` 增加 DTO + `ValidationPipe` 校验
  - 练习 2：把 `range` 改造成 `GET /math/range/:number` 独立模块
  - 练习 3：新增 `DELETE /user/:id`，并返回统一错误结构
  - 练习 4：用 Postman 导出 Collection + Environment 形成团队调试基线
