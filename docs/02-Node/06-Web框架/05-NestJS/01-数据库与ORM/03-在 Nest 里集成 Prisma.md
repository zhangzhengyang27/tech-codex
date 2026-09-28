---
title: 在 Nest 里集成 Prisma
description: "在 Nest 中集成 Prisma：schema 建模与 migrate 迁移，创建继承 PrismaClient 的 PrismaService 并在 onModuleInit 中 $connect，注入到业务 Service 后调用 client api 完成 CRUD。"
keywords: [NestJS, Prisma, ORM, PrismaClient]
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# 在 Nest 里集成 Prisma

学 Prisma，最终还是要和 Nest 结合用的，就像学 TypeORM 时那样。

其实也很简单，还是基于 schema 生成 client 的 api，然后调用这些 api 来 CRUD。

只不过 Nest 里的调用方式不大一样。

新建个 nest 项目：

```
nest new nest-prisma-test
```

进入项目，安装 prisma

```
npm install prisma --save-dev
```
然后执行 init 创建 schema 文件：

```
npx prisma init
```
改下 .env 的配置：

```
DATABASE_URL="mysql://root:guang@localhost:3306/prisma_test"
```
并且修改下 schema 里的 datasource 部分：

```
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

```

然后创建 model：

```
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Department {
  id        Int    @id @default(autoincrement())
  name      String  @db.VarChar(20)
  createTime DateTime @default(now())
  updateTime DateTime @updatedAt
  employees     Employee[]
}

model Employee {
  id         Int       @id @default(autoincrement())
  name      String     @db.VarChar(20)
  phone     String     @db.VarChar(30)

  departmentId Int
  department     Department      @relation(fields: [departmentId], references: [id])
}
```

这里就是 Department、Employee 两个 model，之间是一对多的关系。

然后先 migrate reset，重置下数据库：

```
npx prisma migrate reset
```
然后创建新的 migration:

```
npx prisma migrate dev --name init
```
这时候数据库就有了这两个表了：

外键约束也创建好了：

并且 migrate dev 还会生成 client 代码，接下来就可以直接来做 CRUD 了。

问题来了：之前都是直接 tsx 跑的一个脚本，里面调用 client 的 api 来做 CRUD，现在和 Nest 集成后怎么做呢？

很简单，创建个 Service 就好了。

```
nest g service prisma --flat --no-spec
```
改下 PrismaService，继承 PrismaClient，这样它就有 crud 的 api 了：

```javascript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {

    constructor() {
        super({
            log: [
                {
                    emit: 'stdout',
                    level: 'query'
                }
            ]
        })
    }

    async onModuleInit() {
        await this.$connect();
    }
}
```
在 constructor 里设置 PrismaClient 的 log 参数，也就是打印 sql 到控制台。

在 onModuleInit 的生命周期方法里调用 $connect 来连接数据库。

然后再创建两个 service：

```
nest g service department --flat --no-spec
```
```
nest g service employee --flat --no-spec
```

这俩 service 里注入 PrismaService，不就可以 CRUD 了么？

改下 DepartmentService：

```javascript
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentService {

    @Inject(PrismaService)
    private prisma: PrismaService;

    async create(data: Prisma.DepartmentCreateInput) {
        return await this.prisma.department.create({
            data,
            select: {
                id: true
            }
        });
    }
}
```
插入数据之后，再把 id 查询出来返回。

这里的 data 的 ts 类型不用自己定义，生成的 client 代码里有。

输入 Prisma.Department 就会提示出来。

还有 EmployeeService：

```javascript
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class EmployeeService {

    @Inject(PrismaService)
    private prisma: PrismaService;

    async create(data: Prisma.EmployeeCreateInput) {
        return await this.prisma.employee.create({
            data,
            select: {
                id: true
            }
        });
    }
}

```
也定义了 create 方法。

然后在 AppController 里注入这俩 service：

声明一个 create 的路由，里面创建一个 department，再创建一个 employee。

employee 通过 id 关联这个 department。

```javascript
import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { DepartmentService } from './department.service';
import { EmployeeService } from './employee.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Inject(DepartmentService)
  private departmentService: DepartmentService;

  @Inject(EmployeeService)
  private employeeService: EmployeeService;

  @Get('create')
  async create() {
    const department = await this.departmentService.create({
      name: '技术部'
    });

    await this.employeeService.create({
      name: '张三',
      phone: '13222222222',
      department: {
        connect: {
          id: department.id
        }
      }
    });

    return 'done';
  }
}
```
把 nest 项目跑起来：

```
npm run start:dev
```
浏览器访问下 http://localhost:3000/create

生成了 2 条 insert 语句：

在 mysql workbench 里也可以看到插入的 2 条记录：

这样，prisma 和 nest 的集成就完成了。

当然，只是测试了 create 方法，其余的 api 也是一样的，就不展开了。

## 总结

这节做了 Prisma 和 Nest 的集成。

其实还是先用 prisma init 创建 schema 文件，然后修改 model 后用 prisma migrate dev 同步到数据库和生成 client 代码。

只不过之后使用 client 代码的方式不同。

创建了个 Service 继承 PrismaClient，在 constructor 里设置初始化参数。

之后把这个 service 的实例注入到别的 service 里，就可以做 CRUD 了。

这样，Prisma 怎么和 Nest 集成，就学会了。
