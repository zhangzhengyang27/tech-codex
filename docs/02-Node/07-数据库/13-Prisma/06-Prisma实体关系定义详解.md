---
title: Prisma 实体关系定义详解
description: "Prisma Schema 通过声明式语法定义数据库实体间的关系。本文覆盖一对一、一对多、多对多三种关系类型的定义方式、查询 API 及与 TypeORM 的对比。"
keywords: []
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# Prisma 实体关系定义详解

## 概述

Prisma Schema 通过声明式语法定义数据库实体间的关系。本文覆盖一对一、一对多、多对多三种关系类型的定义方式、查询 API 及与 TypeORM 的对比。

## 前置知识

- [在 Nest 里集成 Prisma](../../06-Web框架/05-NestJS/01-数据库与ORM/03-在%20Nest%20里集成%20Prisma)
- [Prisma 的全部 schema 语法](03-Prisma%20的全部%20schema%20语法.md)
- 关系型数据库外键与 JOIN 基础

## 学习目标

1. 掌握三种关系类型的 Schema 定义规则
2. 熟练使用 include/select 进行关系查询
3. 理解多对多关系的中间表机制
4. 对比 Prisma 与 TypeORM 的关系定义差异

---

## 一、关系类型总览

| 关系类型 | 示例 | 外键位置 | 关键约束 |
|---------|------|---------|---------|
| One-to-One | 用户 ↔ 个人资料 | 从表 | 外键必须 `@unique` |
| One-to-Many | 用户 → 文章 | 从表 | 外键可重复 |
| Many-to-Many | 文章 ↔ 分类 | 中间表 | 联合主键 `@@id` |

核心装饰器：`@relation(fields: [外键字段], references: [关联主键])`

---

## 二、一对一关系

```prisma
model User {
  id      Int       @id @default(autoincrement())
  email   String    @unique
  name    String?
  profile Profile?          // 主表：可选关联，不存储外键
  @@map("users")
}

model Profile {
  id     Int     @id @default(autoincrement())
  bio    String?
  userId Int     @unique    // 从表外键：必须 @unique
  user   User    @relation(fields: [userId], references: [id])
  @@map("profiles")
}
```

要点：
- 主表关联字段类型为 `Profile?`（可选），不存储外键
- 从表外键字段必须添加 `@unique` 约束（保证一对一）
- 联合主键场景使用 `@@id([firstName, lastName])` + 对应联合外键

---

## 三、一对多关系

```prisma
model User {
  id    Int    @id @default(autoincrement())
  email String @unique
  posts Post[]              // 主表：数组类型
  @@map("users")
}

model Post {
  id       Int     @id @default(autoincrement())
  title    String
  authorId Int              // 从表外键：不需要 @unique
  author   User    @relation(fields: [authorId], references: [id])
  @@map("posts")
}
```

要点：
- 主表关联字段为数组类型 `Post[]`
- 从表外键不需要 `@unique`（允许多条记录指向同一用户）

---

## 四、多对多关系

```prisma
model Post {
  id         Int        @id @default(autoincrement())
  title      String
  categories Category[] @relation("PostToCategory")
  @@map("posts")
}

model Category {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[] @relation("PostToCategory")
  @@map("categories")
}

// 显式中间表（可选，Prisma 也可自动创建隐式中间表）
model PostToCategory {
  postId     Int
  categoryId Int
  post       Post     @relation("PostToCategory", fields: [postId], references: [id], onDelete: Cascade)
  category   Category @relation("PostToCategory", fields: [categoryId], references: [id], onDelete: Cascade)
  @@id([postId, categoryId])
  @@map("_PostToCategory")
}
```

查询路径：主表 → 中间表（外键映射） → 关联表

MongoDB 差异：MongoDB 连接器不支持把标量数组（`String[]`）声明为 `@relation` 的外键，多对多可以通过隐式多对多（不写中间表 model，Prisma 自动创建关联集合）实现，也可以用普通 ObjectId 数组字段由应用层维护关联：

```prisma
model Post {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  categoryIds String[] @db.ObjectId  // 普通 ObjectId 数组字段，不走 @relation，由应用层关联查询
}
```

---

## 五、关系查询 API

### 嵌套查询（include）

```typescript
// 深度嵌套：用户 → 文章 → 分类
const result = await prisma.user.findUnique({
  where: { id: 1 },
  include: {
    posts: {
      where: { published: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { categories: true },
    },
  },
});
```

### 字段选择（select）

```typescript
const result = await prisma.user.findUnique({
  where: { id: 1 },
  select: {
    id: true,
    name: true,
    posts: { select: { id: true, title: true } },
  },
});
```

### 关联操作速查

| 操作 | API | 说明 |
|------|-----|------|
| 创建关联 | `create: { bio: '...' }` | 创建新关联记录 |
| 连接关联 | `connect: { id: 1 }` | 关联已存在记录 |
| 断开关联 | `disconnect: { id: 1 }` | 解除关联 |
| 替换关联 | `set: [{ id: 1 }, { id: 2 }]` | 替换所有关联 |
| 更新关联 | `update: { bio: '...' }` | 更新关联记录 |

---

## 六、Prisma vs TypeORM 对比

| 维度 | Prisma | TypeORM |
|------|--------|---------|
| 定义语法 | 声明式 Schema（.prisma 文件） | 装饰器 + TypeScript 类 |
| 可读性 | 非常清晰，一目了然 | 需要熟悉装饰器体系 |
| 类型安全 | 自动生成 Prisma Client 类型 | 手动定义或依赖推断 |
| 关系定义 | `@relation(fields, references)` | `@OneToMany` + `@ManyToOne` 双向 |
| 迁移工具 | 内置 `prisma migrate` | 需要额外配置 |
| 学习曲线 | 平缓 | 陡峭 |

---

## 七、NestJS 集成实战

```typescript
// post.service.ts
@Injectable()
export class PostService {
  constructor(private prisma: PrismaService) {}

  async create(title: string, content: string, authorId: number, categoryIds: number[]) {
    return this.prisma.post.create({
      data: {
        title,
        content,
        author: { connect: { id: authorId } },
        categories: { connect: categoryIds.map(id => ({ id })) },
      },
      include: { author: true, categories: true },
    });
  }

  async findAll(page = 1, size = 10) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        skip: (page - 1) * size,
        take: size,
        include: {
          author: { select: { id: true, name: true } },
          categories: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.post.count(),
    ]);
    return { data, total };
  }

  async updateCategories(postId: number, categoryIds: number[]) {
    return this.prisma.post.update({
      where: { id: postId },
      data: { categories: { set: categoryIds.map(id => ({ id })) } },
      include: { categories: true },
    });
  }
}
```

---

## 常见问题

### 外键约束导致删除失败

```prisma
// 三种级联策略
user User @relation(fields: [userId], references: [id], onDelete: Cascade)   // 级联删除
user User @relation(fields: [userId], references: [id], onDelete: SetNull)   // 设为 NULL
user User @relation(fields: [userId], references: [id], onDelete: Restrict)  // 阻止删除
```

### N+1 查询问题

```typescript
// 错误：循环中逐条查询
const users = await prisma.user.findMany();
for (const user of users) {
  await prisma.post.findMany({ where: { authorId: user.id } });
}

// 正确：使用 include 一次性加载
const users = await prisma.user.findMany({ include: { posts: true } });
```

---

## 最佳实践

- 外键命名：`<关联表名>Id`（如 `authorId`、`categoryId`）
- 关系字段：单数表示一对一（`profile`），复数表示一对多/多对多（`posts`）
- 性能优化：优先使用 `select` 代替 `include`；限制嵌套深度；外键字段添加索引
- 使用 `@relation(name)` 命名关系，避免同一对模型间多关系时的歧义

---

## 延伸阅读

- [Prisma 官方文档 - Relations](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [Prisma Client 多表 CRUD 的全部 api](05-Prisma%20Client%20多表%20CRUD%20的全部%20api.md)

---

> 上一篇：[在 Nest 里集成 Prisma](../../06-Web框架/05-NestJS/01-数据库与ORM/03-在%20Nest%20里集成%20Prisma)
> 下一篇：[Prisma 版本升级指南](07-Prisma版本升级指南.md)
