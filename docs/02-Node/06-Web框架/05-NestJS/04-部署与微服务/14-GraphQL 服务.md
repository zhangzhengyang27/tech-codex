---
title: GraphQL 服务
description: "作为前端开发，想必经常做的事情就是调接口、画页面。调用的接口大概率是 restful 的，url 代表资源，GET、POST、PUT、DELETE 请求代表对资源的增删改查。这种接口返回什么信息是服务端那边决定的，客户端只是传一下参数。"
keywords: [GraphQL, Nest, Apollo, Prisma, React, schema, resolver, CRUD]
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# GraphQL 服务

作为前端开发，想必经常做的事情就是调接口、画页面。调用的接口大概率是 restful 的，url 代表资源，GET、POST、PUT、DELETE 请求代表对资源的增删改查。这种接口返回什么信息是服务端那边决定的，客户端只是传一下参数。而不同场景下需要的数据不同，这时候可能就得新开发一个接口，特别是在版本更新的时候，很容易导致一大堆类似的接口。

facebook 当时也遇到了这个问题，于是他们创造了一种新的接口实现方案：GraphQL。用了 GraphQL 之后，返回什么数据不再是服务端说了算，而是客户端自己决定。服务端只需要提供一个接口，客户端通过这个接口就可以取任意格式的数据，实现 CRUD。**一个 http 接口就能实现所有的 CRUD！**

本文从 GraphQL 快速入门开始，讲清 schema 与 resolver 的原理，再到 Nest 里集成 GraphQL 实现 CRUD，最后用 GraphQL + Prisma + React 实现一个完整的 TodoList 全栈项目。

## 一、GraphQL 快速入门

要感受 GraphQL 的强大，先写个 demo 快速入门一下。facebook 提供了 graphql 的 npm 包，但那个封装的不够好，一般会用基于 graphql 包的 @apollo/server 和 @apollo/client 的包来实现 graphql。

```
mkdir graphql-crud-demo
cd graphql-crud-demo
npm init -y
```

安装用到的包：

```
npm install @apollo/server
```

然后在 index.js 写一下这段代码：

```javascript
import { ApolloServer } from '@apollo/server';

const typeDefs = `
  type Student {
    id: String,
    name: String,
    sex: Boolean
    age: Int
  }

  type Teacher {
    id: String,
    name: String,
    age: Int,
    subject: [String],
    students: [Student]
  }

  type Query {
    students: [Student],
    teachers: [Teacher],
  }

  schema {
    query: Query
  }
`;
```

比较容易看懂，定义了一个 Student 的对象类型，有 id、name、sex、age 这几个字段。又定义了一个 Teacher 的对象类型，有 id、name、age、subject、students 这几个字段，students 字段是他教的学生的信息。然后定义了查询的入口，可以查 students 和 teachers 的信息。这样就是一个 schema。

对象类型和对象类型之间有关联关系，老师关联了学生、学生也可以关联老师，关联来关联去这不就是一个图么，也就是 graph。GraphQL 全称是 graph query language，就是从这个对象的 graph 中查询数据的。

现在声明的只是对象类型的关系，还要知道这些类型的具体数据，取数据的这部分叫做 resolver：

```javascript
const students = [
    {
      id: '1',
      name: async () => {
        await '取数据';
        return '光光'
      },
      sex: true,
      age: 12
    },
    {
      id: '2',
      name:'东东',
      sex: true,
      age: 13
    },
    {
      id: '3',
      name:'小红',
      sex: false,
      age: 11
    },
];

const teachers = [
  {
    id: '1',
    name: '神光',
    sex: true,
    subject: ['体育', '数学'],
    age: 28,
    students: students
  }
]

const resolvers = {
    Query: {
      students: () => students,
      teachers: () => teachers
    }
};
```

resolver 是取对象类型对应的数据的，每个字段都可以写一个 async 函数，里面执行 sql、访问接口等都可以，最终返回取到的数据。当然，直接写具体的数据也是可以的。

这样有了 schema 类型定义，有了取数据的 resolver，就可以跑起 graphql 服务了。也就是这样：

```javascript
import { startStandaloneServer } from '@apollo/server/standalone'

const server = new ApolloServer({
    typeDefs,
    resolvers,
});

const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
});

console.log(`🚀  Server ready at: ${url}`);
```

传入 schema 类型定义和取数据的 resolver，就可以用 node 把服务跑起来。有同学可能问了，node 可以直接解析 esm 模块么？可以的。只需要在 package.json 中声明 type 为 module，那所有的 .js 就都会作为 esm 模块解析。

跑起来之后，浏览器访问一下，就可以看到这样的 sandbox，这里可以执行 graphql 的查询（graphql 接口是监听 POST 请求的，用 get 请求这个 url 才会跑这个调试的工具）。查询所有学生的 id、name、age 就可以这样：

```graphql
query Query {
    students {
        name,
        id
    }
}
```

这里 "光光" 那个学生是异步取的数据，resolver 会执行对应的异步函数，拿到最终数据。

感觉到什么叫客户端决定取什么数据了么？当然，这里是在 sandbox 里测的，用 @apollo/client 包也很简单。比如 react 的 graphql 客户端是这样的：一个 gql 的 api 来写查询语言，一个 useQuery 的 api 来执行查询。

### 1.1 带参数的查询

有的同学可能会说，如果我想查询某个名字的老师的信息呢？graphql 当然是支持的，这样写：

```
type Query {
    students: [Student],
    teachers: [Teacher],
    studentsbyTeacherName(name: String!): [Student]
}
```

新加一个 query 入口，声明一个 name 的参数（String 后的 ! 代表不能为空）。然后它对应的 resolver 就是这样的：

```javascript
const resolvers = {
    Query: {
      students: () => students,
      teachers: () => teachers,
      studentsbyTeacherName: async (...args) => {
        console.log(args);

        await '执行了一个异步查询'
        return students
      }
    }
};
```

studentsbyTeacherName 字段的 resolver 是一个异步函数，里面执行了查询，然后返回了查到的学生信息。在 sandbox 里传入老师的 name 参数为 111，返回查到的学生的 id、name 信息。而服务端的 resolver 接收到的参数是这样的，其余的几个参数不用管，只要知道第二个参数就是客户端传过来的查询参数就好了。这样就可以根据这个 name 参数实现异步的查询，然后返回数据。

### 1.2 增删改（Mutation）

不是说 graphql 能取代 restful 做 CRUD 么？那增删改怎么做呢？其实看到上面的有参数的查询应该就能想到了，其实写起来差不多。

在 schema 里添加这样一段类型定义：

```graphql
type Res {
    success: Boolean
    id: String
}

type Mutation {
    addStudent(name:String! age:Int! sex:Boolean!): Res

    updateStudent(id: String! name:String! age:Int! sex:Boolean!): Res

    deleteStudent(id: String!): Res
}

schema {
    mutation: Mutation
    query: Query
}
```

和有参数的查询差不多，只不过这部分增删改的类型要定义在 mutation 部分。然后 resolver 也要有对应的实现：

```javascript
async function addStudent (_, { name, age, sex }) {
    students.push({
        id: '一个随机 id',
        name,
        age,
        sex
    });
    return {
      success: true,
      id: 'xxx'
    }
}

async function updateStudent (_, { id, name, age, sex }) {

    return {
      success: true,
      id: 'xxx'
    }
}

async function deleteStudent (_, { id }) {
    return {
      success: true,
      id: 'xxx'
    }
}

const resolvers = {
    Query: {
      students: () => students,
      teachers: () => teachers,
      studentsbyTeacherName: async (...args) => {
        console.log(args);

        await '执行了一个异步查询'
        return students
      }
    },
    Mutation: {
        addStudent: addStudent,
        updateStudent: updateStudent,
        deleteStudent: deleteStudent
    }
};
```

和 query 部分差不多，只不过这里实现的是增删改。执行 addStudent，添加一个学生，然后再次查询所有的学生，就可以查到刚来的小刚同学。这样，就可以在一个 graphql 的 POST 接口里完成所有的 CRUD！

全部代码如下，大家可以跑一跑（注意要在 package.json 里加个 type: "module"）：

```javascript
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone'

const typeDefs = `
  type Student {
    id: String,
    name: String,
    sex: Boolean
    age: Int
  }

  type Teacher {
    id: String,
    name: String,
    age: Int,
    subject: [String],
    students: [Student]
  }

  type Query {
    students: [Student],
    teachers: [Teacher],
    studentsbyTeacherName(name: String!): [Student]
  }

  type Res {
    success: Boolean
    id: String
  }

  type Mutation {
    addStudent(name:String! age:Int! sex:Boolean!): Res

    updateStudent(id: String! name:String! age:Int! sex:Boolean!): Res

    deleteStudent(id: String!): Res
  }

  schema {
    mutation: Mutation
    query: Query
  }
`;

const students = [
    {
      id: '1',
      name: async () => {
        await '取数据';
        return '光光'
      },
      sex: true,
      age: 12
    },
    {
      id: '2',
      name:'东东',
      sex: true,
      age: 13
    },
    {
      id: '3',
      name:'小红',
      sex: false,
      age: 11
    },
];

const teachers = [
  {
    id: '1',
    name: '神光',
    sex: true,
    subject: ['体育', '数学'],
    age: 28,
    students: students
  }
]

async function addStudent (_, { name, age, sex }) {
    students.push({
        id: '一个随机 id',
        name,
        age,
        sex
    });
    return {
      success: true,
      id: 'xxx'
    }
}

async function updateStudent (_, { id, name, age, sex }) {

    return {
      success: true,
      id: 'xxx'
    }
}

async function deleteStudent (_, { id }) {
    return {
      success: true,
      id: 'xxx'
    }
}

const resolvers = {
    Query: {
      students: () => students,
      teachers: () => teachers,
      studentsbyTeacherName: async (...args) => {
        console.log(args);

        await '执行了一个异步查询'
        return students
      }
    },
    Mutation: {
        addStudent: addStudent,
        updateStudent: updateStudent,
        deleteStudent: deleteStudent
    }
};

const server = new ApolloServer({
    typeDefs,
    resolvers,
});

const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
});

console.log(`🚀  Server ready at: ${url}`);
```

### 1.3 简单原理

再稍微思考下它的原理——graphql 是怎么实现的呢？回顾整个流程，发现涉及到两种 DSL（领域特定语言），一个是 schema 定义的 DSL，一个是查询的 DSL。服务端通过 schema 定义的 DSL 来声明 graph 图，通过 resolver 来接受参数，执行查询和增删改。客户端通过查询的 DSL 来定义如何查询和如何增删改，再发给服务端来解析执行。通过这种 DSL 实现了动态的查询。

确实很方便很灵活，但也有缺点：parse DSL 为 AST 性能肯定是不如 restful 那种直接执行增删改查高的。具体要不要用 graphql 还是要根据具体场景来做判断。

## 二、Nest 开发 GraphQL 服务：实现 CRUD

在 Nest 里集成下 graphql。新建个项目：

```bash
nest new nest-graphql
```

进入项目，安装 graphql 和 apollo 的包：

```bash
npm i @nestjs/graphql @nestjs/apollo @apollo/server graphql
```

在 AppModule 引入 GraphQLModule：

```javascript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';

@Module({
  imports: [
    GraphQLModule.forRoot({
      driver: ApolloDriver,
      typePaths: ['./**/*.graphql'],
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

创建 schema 文件 schema.graphql：

```graphql
type Student {
  id: String,
  name: String,
  sex: Boolean
  age: Int
}

type Teacher {
  id: String,
  name: String,
  age: Int,
  subject: [String],
  students: [Student]
}

type Query {
  students: [Student],
  teachers: [Teacher],
}

type Mutation {
  addStudent(name:String! age:Int! sex:Boolean!): Res

  updateStudent(id: String! name:String! age:Int! sex:Boolean!): Res

  deleteStudent(id: String!): Res
}
```

这里直接复制的上节的 schema 定义。语法高亮需要安装下 graphql 插件。

然后定义它的 resolver：

```
nest g resolver student
```

实现下 Query、Mutation 对应的逻辑：

```javascript
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';

const students = [
    { id: 1, name: '光光', sex: true, age: 20},
    { id: 2, name: '东东', sex: true, age: 21},
    { id: 3, name: '小红', sex: false, age: 20},
];

const teachers = [
    {
        id: 1,
        name: "小刚",
        age: 30,
        subject: ['体育', '英语'],
        students: students
    },
]

@Resolver()
export class StudentResolver {

    @Query("students")
    students() {
        return students;
    }


    @Query("teachers")
    teachers() {
        return teachers;
    }

    @Mutation()
    addStudent(
        @Args('name') name: string,
        @Args('age') age: number,
        @Args('sex') sex: boolean
    ) {
        const id = Math.floor(Math.random() * 1000);
        students.push({
            id,
            name,
            age,
            sex
        });
        return {
            id,
            success: true
        }
    }

    @Mutation()
    updateStudent(
        @Args('id') id,
        @Args('name') name: string,
        @Args('age') age: number,
        @Args('sex') sex: boolean
    ) {
        const index = students.findIndex(item => {
            return item.id === parseInt(id)
        });

        if(index ===-1) {
            return {
                id: null,
                success: true
            }
        }

        students[index].name = name;
        students[index].age = age;
        students[index].sex = sex;
        return {
            id,
            success: true
        }
    }

    @Mutation()
    deleteStudent(@Args('id') id) {
        const index = students.findIndex(item => {
            return item.id === parseInt(id)
        });

        if(index ===-1) {
            return {
                id: null,
                success: true
            }
        }

        students.splice(index, 1);
        return {
            id,
            success: true
        }
    }

}
```

比较容易看懂，用 @Query 和 @Mutation 分别实现 Query 和 Mutation 对应的方法。

把服务跑起来：

```
npm run start:dev
```

浏览器访问下 http://localhost:3000/graphql

右侧可以看到 schema 定义还有文档，这个东西就是 graphql 的接口文档了。在左侧输入下查询语法：

```graphql
query Xxx {
  students {
    id
    name
    age
  }
}
```

对新手来说，写 query language 还是有点难度的，因为不熟悉。上节那个 playground 就好很多，可以直接生成。换上节的 playground：

```javascript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { StudentResolver } from './student/student.resolver';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

@Module({
  imports: [
    GraphQLModule.forRoot({
      driver: ApolloDriver,
      typePaths: ['./**/*.graphql'],
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
    })
  ],
  controllers: [AppController],
  providers: [AppService, StudentResolver],
})
export class AppModule {}
```

刷新就可以看到换成 apollo 的 playground 的了，点击加号就可以生成查询。试一下添加：

```graphql
mutation Mutation($name: String!, $age: Int!, $sex: Boolean!) {
  addStudent(name: $name, age: $age, sex: $sex) {
    id
    success
  }
}
```

再查一下，可以看到，添加成功了。然后再来试下修改、删除，都成功了。

其实还少了个根据 id 查询的方法。在 schema 的 Query 里加一下（! 代表必填）：

```graphql
studentById(id: String!): Student
```

然后在 resolver 里加一下它的实现：

```javascript
@Query("studentById")
studentById(@Args('id') id) {
    return students.find(item => {
        return item.id === parseInt(id)
    });
}
```

查询成功！至此，Nest + GraphQL 的 CRUD 就完成了。

## 三、GraphQL + Prisma + React 实现 TodoList

数据存在 mysql 里，用 Prisma 作为 ORM 框架。

```bash
npm install -g @nestjs/cli

nest new graphql-todolist
```

创建个项目，然后首先来实现 restful 接口的增删改查。

用 docker 把 mysql 跑起来：搜索 mysql 镜像（这步需要科学上网），点击 run。输入容器名、端口映射、以及挂载的数据卷，还要指定一个环境变量。端口映射就是把宿主机的 3306 端口映射到容器里的 3306 端口，这样就可以在宿主机访问了。数据卷挂载就是把宿主机的某个目录映射到容器里的 /var/lib/mysql 目录，这样数据是保存在本地的，不会丢失。而 MYSQL_ROOT_PASSWORD 的密码则是 mysql 连接时候的密码。

跑起来后，用 mysql workbench（mysql 官方提供的免费客户端）连上，点击创建 database，指定名字、字符集为 utf8mb4，然后点击 apply。创建成功之后在左侧就可以看到这个 database 了，现在还没有表。

在 Nest 里用 Prisma 连接 mysql。进入项目，安装 prisma：

```bash
npm install prisma --save-dev
```

执行 prisma init 创建 schema 文件：

```bash
npx prisma init
```

生成了 schema 文件（用来定义 model 的），和 .env 文件。改下 .env 的配置：

```env
DATABASE_URL="mysql://root:你的密码@localhost:3306/todolist"
```

并且修改下 schema 里的 datasource 部分：

```javascript
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

然后创建 model：

```javascript
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model TodoItem {
  id        Int    @id @default(autoincrement())
  content    String  @db.VarChar(50)
  createTime DateTime @default(now())
  updateTime DateTime @updatedAt
}
```

id 自增，content 是长度为 50 的字符串，还有创建时间 createTime、更新时间 updateTime。

执行 prisma migrate dev，它会根据定义的 model 去创建表：

```
npx prisma migrate dev --name init
```

它会生成 sql 文件，里面是这次执行的 sql 建表语句，然后还会生成 client 代码，用来连接数据库操作这个表。

接下来就可以在代码里做 CRUD 了。生成一个 service：

```
nest g service prisma --flat --no-spec
```

改下生成的 PrismaService，继承 PrismaClient，这样它就有 crud 的 api 了：

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

在 constructor 里设置 PrismaClient 的 log 参数，也就是打印 sql 到控制台。在 onModuleInit 的生命周期方法里调用 $connect 来连接数据库。

然后在 AppService 里注入 PrismaService，实现 CRUD：

```javascript
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { CreateTodoList } from './todolist-create.dto';
import { UpdateTodoList } from './todolist-update.dto';

@Injectable()
export class AppService {

  getHello(): string {
    return 'Hello World!';
  }

  @Inject(PrismaService)
  private prismaService: PrismaService;

  async query() {
    return this.prismaService.todoItem.findMany({
      select: {
        id: true,
        content: true,
        createTime: true
      }
    });
  }

  async create(todoItem: CreateTodoList) {
    return this.prismaService.todoItem.create({
      data: todoItem,
      select: {
        id: true,
        content: true,
        createTime: true
      }
    });
  }

  async update(todoItem: UpdateTodoList) {
    return this.prismaService.todoItem.update({
      where: {
        id: todoItem.id
      },
      data: todoItem,
      select: {
        id: true,
        content: true,
        createTime: true
      }
    });
  }

  async remove(id: number) {
    return this.prismaService.todoItem.delete({
      where: {
        id
      }
    })
  }
}
```

@Inject 注入 PrismaService，用它来做 CRUD，where 是条件、data 是数据，select 是回显的字段。然后创建用到的两个 dto 的 class：

todolist-create.dto.ts：

```javascript
export class CreateTodoList {
    content: string;
}
```

todolist-update.dto.ts：

```
export class UpdateTodoList {
    id: number;
    content: string;
}
```

在 AppController 里引入下，添加几个路由：

```javascript
import { Body, Controller, Delete, Get, Post, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { CreateTodoList } from './todolist-create.dto';
import { UpdateTodoList } from './todolist-update.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Post('create')
  async create(@Body() todoItem: CreateTodoList) {
    return this.appService.create(todoItem);
  }

  @Post('update')
  async update(@Body() todoItem: UpdateTodoList) {
    return this.appService.update(todoItem);
  }

  @Get('delete')
  async delete(@Query('id') id: number) {
    return this.appService.remove(+id);
  }

  @Get('list')
  async list() {
    return this.appService.query();
  }

}
```

添加增删改查 4 个路由，post 请求用 @Body() 注入请求体，@Query 拿查询字符串参数（delete 路由的 id 就是通过 ?id=xxx 传的）。把服务跑起来试一下：

```
npm run start:dev
```

首先是 list，现在没有数据；然后添加一个，服务端打印了 insert into 的 sql，数据库也有了这条记录。再试下修改、删除，查一下都没啥问题。这样，todolist 的 restful 版接口就完成了。

### 3.1 实现 GraphQL 版本

接下来实现 graphql 版本。安装用到的包：

```bash
npm i @nestjs/graphql @nestjs/apollo @apollo/server graphql
```

然后在 AppModule 里引入下：

```javascript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';

@Module({
  imports: [
    GraphQLModule.forRoot({
      driver: ApolloDriver,
      typePaths: ['./**/*.graphql'],
    })
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService],
})
export class AppModule {}
```

typePaths 就是 schema 文件的路径。添加一个 todolist.graphql：

```graphql
type TodoItem {
    id: Int
    content: String
}

input CreateTodoItemInput {
  content: String
}

input UpdateTodoItemInput {
  id: Int!
  content: String
}

type Query {
  todolist: [TodoItem]!
  queryById(id: Int!): TodoItem
}


type Mutation {
  createTodoItem(todoItem: CreateTodoItemInput!): TodoItem!
  updateTodoItem(todoItem: UpdateTodoItemInput!): TodoItem!
  removeTodoItem(id: Int!): Int
}
```

语法比较容易看懂，就是定义数据的结构。在 Query 下定义查询的接口，在 Mutation 下定义增删改的接口。

然后实现 resolver，也就是这些接口的实现：

```bash
nest g resolver todolist --no-spec --flat
```

```javascript
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { PrismaService } from './prisma.service';
import { Inject } from '@nestjs/common';
import { CreateTodoList } from './todolist-create.dto';
import { UpdateTodoList } from './todolist-update.dto';

@Resolver()
export class TodolistResolver {

    @Inject(PrismaService)
    private prismaService: PrismaService;

    @Query("todolist")
    async todolist() {
        return this.prismaService.todoItem.findMany();
    }

    @Query("queryById")
    async queryById(@Args('id') id) {
        return this.prismaService.todoItem.findUnique({
            where: {
                id
            }
        })
    }

    @Mutation("createTodoItem")
    async createTodoItem(@Args("todoItem") todoItem: CreateTodoList) {
        return this.prismaService.todoItem.create({
            data: todoItem,
            select: {
              id: true,
              content: true,
              createTime: true
            }
          });
    }


    @Mutation("updateTodoItem")
    async updateTodoItem(@Args('todoItem') todoItem: UpdateTodoList) {
        return this.prismaService.todoItem.update({
            where: {
              id: todoItem.id
            },
            data: todoItem,
            select: {
              id: true,
              content: true,
              createTime: true
            }
          });
    }

    @Mutation("removeTodoItem")
    async removeTodoItem(@Args('id') id: number) {
        await this.prismaService.todoItem.delete({
            where: {
              id
            }
        })
        return id;
    }
}
```

用 @Resolver 声明 resolver，用 @Query 声明查询接口，@Mutation 声明增删改接口，@Args 取传入的参数。具体增删改查的实现和之前一样。

浏览器访问 http://localhost:3000/graphql 就是 playground，可以在这里查询。左边输入查询语法，右边是执行后返回的结果。对新手来说这个 playground 不够友好，没有提示，换一个：

```javascript
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { TodolistResolver } from './todolist.resolver';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

@Module({
  imports: [
    GraphQLModule.forRoot({
      driver: ApolloDriver,
      typePaths: ['./**/*.graphql'],
      playground: false,
      plugins: [ApolloServerPluginLandingPageLocalDefault()],
    })
  ],
  controllers: [AppController],
  providers: [AppService, PrismaService, TodolistResolver],
})
export class AppModule {}
```

试一下新增、查询、修改、单个查询、删除，基于 GraphQL 的增删改查都成功了！

### 3.2 在 React 里调用 GraphQL

然后在 react 项目里调用下。

```bash
npx create-vite
```

进入项目，安装 @apollo/client：

```bash
npm install

npm install @apollo/client
```

改下 main.tsx：

```javascript
import * as ReactDOM from 'react-dom/client';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import App from './App';

const client = new ApolloClient({
  uri: 'http://localhost:3000/graphql',
  cache: new InMemoryCache(),
});

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <ApolloProvider client={client}>
    <App />
  </ApolloProvider>,
);
```

创建 ApolloClient 并设置到 ApolloProvider。然后在 App.tsx 里用 useQuery 发请求：

```javascript
import { gql, useQuery } from '@apollo/client';

const getTodoList = gql`
  query Query {
    todolist {
      content
      id
    }
  }
`;

type TodoItem = {
  id: number;
  content: string;
}

type TodoList = {
  todolist: Array<TodoItem>;
}

export default function App() {
  const { loading, error, data } = useQuery<TodoList>(getTodoList);

  if (loading) return 'Loading...';
  if (error) return `Error! ${error.message}`;

  return (
    <ul>
      {
        data?.todolist?.map(item => {
          return <li key={item.id}>{item.content}</li>
        })
      }
    </ul>
  );
}
```

把服务跑起来：

```
npm run dev
```

这里涉及到的跨域，在后端服务里开启下跨域支持，可以看到返回了查询结果。

然后加一下新增。用 useMutation 的 hook，指定 refetchQueries 也就是修改完之后重新获取数据，调用的时候传入 content 数据：

```javascript
import { gql, useMutation, useQuery } from '@apollo/client';

const getTodoList = gql`
  query Query {
    todolist {
      content
      id
    }
  }
`;

const createTodoItem = gql`
  mutation Mutation($todoItem: CreateTodoItemInput!) {
    createTodoItem(todoItem: $todoItem) {
      id
      content
    }
  }
`;

type TodoItem = {
  id: number;
  content: string;
}

type TodoList = {
  todolist: Array<TodoItem>;
}

export default function App() {
  const { loading, error, data } = useQuery<TodoList>(getTodoList);

  const [createTodo] = useMutation(createTodoItem, {
    refetchQueries: [getTodoList]
  });

  async function onClick() {
    await createTodo({
      variables: {
        todoItem: {
          content: Math.random().toString().slice(2, 10)
        }
      }
    })
  }

  if (loading) return 'Loading...';
  if (error) return `Error! ${error.message}`;

  return (
    <div>
      <button onClick={onClick}>新增</button>
      <ul>
        {
          data?.todolist?.map(item => {
            return <li key={item.id}>{item.content}</li>
          })
        }
      </ul>
    </div>
  );
}
```

测试下，数据库里也可能看到新增的数据。这样，就能在 react 项目里用 graphql 做 CRUD 了。

## 总结

本次整理了 GraphQL 相关知识：

**快速入门与原理**：restful 接口是 url 代表资源，GET、POST、PUT、DELETE 请求代表对资源的增删改查，返回什么数据完全由服务端决定。为了解决这种问题，facebook 创造了 graphql，这种接口返回什么数据完全由客户端决定，增删改查通过这一个接口就可以搞定。graphql 需要在服务端定义 schema（定义对象类型和它的字段，对象类型之间会有关联，也就是一个 graph），还需要有 resolver，它负责接受客户端的参数，完成具体数据的增删改查。graphql 会暴露一个 post 接口，通过查询语言的语法就可以通过这个接口完成所有增删改查。本地测试的时候，get 请求会跑一个 sandbox。

**Nest 集成 GraphQL**：在 Nest 里集成了 GraphQL，并做了 CRUD。graphql 主要是分为 schema、resolver 两部分。GraphQLModule.forRoot 指定 typePaths 也就是 schema 文件的位置，然后用 nest g resolver 生成 resolver 文件，实现 Query、Mutation 的方法，并且还可以切换 playground 为 apollo 的。

**全栈实践**：实现了 Restful 和 GraphQL 版的 CRUD。前端用 React + @apollo/client，后端用 Nest + GraphQL + Prisma + MySQL。GraphQL 主要是定义 schema 和 resolver 两部分，schema 是 Query、Mutation 的结构，resolver 是它的实现。可以在 playground 里调用接口，也可以在 react 里用 @apollo/client 调用。相比 restful 的版本，graphql 只需要一个接口，然后用查询语言来查，需要什么数据取什么数据，更加灵活。