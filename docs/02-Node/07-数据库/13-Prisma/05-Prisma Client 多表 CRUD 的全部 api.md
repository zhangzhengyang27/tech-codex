---
title: Prisma Client 多表 CRUD 的全部 api
description: Prisma Client 多表 CRUD：include 关联查询、create/createMany、connect/connectOrCreate 关联插入与关联删除，以及 $queryRaw 执行原生 SQL
keywords: [Prisma, Client, 多表, CRUD, 的全部]
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# Prisma Client 多表 CRUD 的全部 api

上节过了一遍 Prisma Client 做 CRUD 的 api，但那只是针对单表的，这节把涉及到多表的 CRUD 的 api 过一遍。

创建个新项目：

```bash
mkdir prisma-client-api2
cd prisma-client-api2
npm init -y
```

进入项目，执行 init 命令：

```shell
npx prisma init
```

生成了 .env 和 schema 文件。

然后改下 .env 文件的数据库连接信息：

```ini
DATABASE_URL="mysql://root:guang@localhost:3306/prisma_test"
```

改一下 datasource 的 provider 为 mysql，并且添加 model。

```prisma
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

之后执行 migrate reset 重置下：

```shell
npx prisma migrate reset
```

然后用 migrate dev 创建新的迁移：

```shell
npx prisma migrate dev --name aaa
```

生成了 client 代码，还有 sql 文件。

数据库中也多了这 2 个表。

然后来写下 client 的 crud 代码。

首先安装 ts、tsx 包：

```shell
npm install typescript tsx @types/node --save-dev
```

创建 tsconfig.json

```shell
npx tsc --init
```

把注释删掉，保留这些配置就行：

```json
{
  "compilerOptions": {
    "target": "es2016",
    "module": "commonjs",
    "types": ["node"],
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

创建 src/index.ts

```javascript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: [
    {
      emit: 'stdout',
      level: 'query'
    },
  ],
});

async function main() {
}

main();
```

然后分别做下 CRUD。

首先是插入数据：

```javascript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: [
    {
      emit: 'stdout',
      level: 'query'
    },
  ],
});

async function test1() {
   await prisma.department.create({
        data: {
            name: '技术部',
            employees: {
                create: [
                    {
                        name: '小张',
                        phone: '13333333333'
                    },
                    {
                        name: '小李',
                        phone: '13222222222'
                    }
                ]
            }
        }
   })
}

test1();
```

插入关联 model 的数据的时候，也是用 create 指定。

测试下：

```bash
npx tsx ./src/index.ts
```

在 mysql workbench 里看下结果。

确实，数据都被正确插入了。

当然，你也可以用这种写法：

```javascript
async function test2() {
    await prisma.department.create({
         data: {
             name: '技术部',
             employees: {
                 createMany: {
                    data: [
                        {
                            name: '小王',
                            phone: '13333333333'
                        },
                        {
                            name: '小周',
                            phone: '13222222222'
                        }
                    ],

                 }
             }
         }
    })
}

test2();
```

跑一下。

效果一样。

那如何关联查询呢？

可以这样写：

```javascript
async function test3() {
    const res1 = await prisma.department.findUnique({
        where: {
            id: 1
        },
        include: {
            employees: true
        }
    });
    console.log(res1);

    const res2 = await prisma.department.findUnique({
        where: {
            id: 1
        },
        include: {
            employees: {
                where: {
                    name: '小张'
                },
                select: {
                    name: true
                }
            }
        }
    });
    console.log(res2);

    const res3 = await prisma.department.findUnique({
        where: {
            id: 1
        }
    }).employees();
    console.log(res3);
}

test3();
```

查询 department 的时候，通过 include 指定关联查询出 employees。

include 还可以指定 where 等查询的参数，进一步过滤。

此外，你也可以在查出 department 后调用 employees() 方法来查询。

可以看到，都能正确查出关联数据。

再就是关联更新：

```javascript
async function test4() {
    const res1 = await prisma.department.update({
        where: {
            id: 1
        },
        data: {
            name: '销售部',
            employees: {
                create: [
                    {
                        name: '小刘',
                        phone: '13266666666'
                    }
                ]
            }
        }
    });
    console.log(res1);
}

test4();
```

比如我在更新 department 的时候关联插入了一条 employee 的记录。

跑一下。

在 mysql workbench 里可以看到，id 为 1 的 department 更新了。

关联插入了一条 employee 的记录。

更新 department 的时候，除了可以插入 employee 的数据，也可以和别的 employee 建立关联。

比如 id 为 4 的 employee。

现在它关联的是 id 为 2 的 department。

 update 的时候使用 connect 和它关联：

```javascript
async function test5() {
    const res1 = await prisma.department.update({
        where: {
            id: 1
        },
        data: {
            name: '销售部',
            employees: {
                connect: [
                    {
                        id: 4
                    }
                ]
            }
        }
    });
    console.log(res1);
}
test5();
```

跑一下。

刷新可以看到，id 为 4 的 employee 关联的 department 就变了。

如果是某个 id 的数据存在就 connect，不存在就 create 呢？

可以这样写：

```javascript
async function test6() {
    const res1 = await prisma.department.update({
        where: {
            id: 1
        },
        data: {
            name: '销售部',
            employees: {
                connectOrCreate: {
                    where: {
                        id: 6
                    },
                    create: {
                        id: 6,
                        name: '小张',
                        phone: '13256665555'
                    }
                }
            }
        }
    });
    console.log(res1);
}
test6();
```

第一次跑，执行的是 insert。

第二次跑，就是 update 了。

也就是说，update 的时候可以通过 create、connect、connectOrCreate 来插入新的关联 model 的记录或者关联已有的记录。

当然，create 的时候也可以这样。

效果一样，就不一个个测试了。

再就是删除。

如果想删除 id 为 1 的 department 的所有 employee，可以这样写：

```javascript
async function test7() {
    await prisma.employee.deleteMany({
        where: {
            department: {
                id: 1
            }
        },
    });
}
test7();
```

这就是多个 model 关联时的 CRUD。

此外，Prisma 还可以直接执行 sql：

```javascript
async function test8() {
    await prisma.$executeRaw`TRUNCATE TABLE Employee`;

    const res = await prisma.$queryRaw`select * from Department`;
    console.log(res);
}
test8();
```

这样，当上面的 api 都不能满足需求的时候，你就可以直接执行 sql。

## 总结

这节过了一遍多 model 关联的时候涉及到多个表的 CRUD 方法。

还是 findXxx、updateXxx、deleteXxx、createXxx 那些方法，只不过查询的时候可以通过 include 包含关联记录，新增修改的时候可以通过 create、connect、connectOrCreate 来关联或者插入记录。

此外，你还可以直接执行 sql。

通过这些 api，就能完成各种 CRUD 需求了。