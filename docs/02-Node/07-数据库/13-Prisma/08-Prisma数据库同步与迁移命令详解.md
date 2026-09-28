---
title: Prisma 数据库同步与迁移命令详解
description: Prisma 数据库同步与迁移命令详解：db pull/db push/db seed/db execute 与 migrate dev/deploy 的方向差异、适用场景和团队协作工作流
keywords: []
category: Node.js
tags: [Node.js, Express, Koa, 服务端]
---


# Prisma 数据库同步与迁移命令详解

## 概述

Prisma 提供了一套完整的数据库操作命令：`db pull`（从数据库同步 Schema）、`db push`（推送 Schema 到数据库）、`db seed`（填充数据）、`db execute`（执行原生 SQL）以及 `migrate` 系列（迁移管理）。本文详解各命令的用法、场景与最佳实践。

## 前置知识

- [Prisma 的全部命令](02-Prisma%20的全部命令.md)
- [Prisma 版本升级指南](07-Prisma版本升级指南.md)
- SQL 基础与数据库管理工具使用

## 学习目标

1. 理解 db pull / db push / migrate 的方向差异与适用场景
2. 掌握 db seed 数据填充的配置与幂等性设计
3. 能够使用 db execute 执行原生 SQL 操作
4. 建立团队协作下的数据库迁移工作流

---

## 一、命令全景对比

| 命令 | 方向 | 用途 | 适用场景 |
|------|------|------|---------|
| `db pull` | Database → Schema | 从数据库反向生成 Schema | 已有数据库初始化项目 |
| `db push` | Schema → Database | 快速同步 Schema 到数据库 | 原型开发、快速迭代 |
| `db seed` | Script → Database | 填充初始/测试数据 | 数据库初始化 |
| `db execute` | SQL → Database | 执行原生 SQL | 存储过程、批量操作 |
| `migrate dev` | Schema + Migrations → Database | 生成并执行迁移文件 | 开发环境、团队协作 |
| `migrate deploy` | Migrations → Database | 只执行已有迁移 | 生产环境 |

---

## 二、db pull：从数据库同步 Schema

### 基本用法

```bash
npx prisma db pull                    # 同步到 schema.prisma
npx prisma db pull --print            # 打印但不写入文件
npx prisma db pull --force            # 强制覆盖现有 Schema
npx prisma db pull --schema=./custom/path.prisma
```

### 工作流程

```mermaid
graph LR
    A[连接数据库] --> B[读取表结构/索引/外键]
    B --> C[转换为 Prisma 类型]
    C --> D[写入 schema.prisma]
```

### SQL 类型映射

| SQL 类型 | Prisma 类型 |
|---------|------------|
| INT | Int |
| BIGINT | BigInt |
| VARCHAR(n) / TEXT | String |
| BOOLEAN | Boolean |
| DATETIME / TIMESTAMP | DateTime |
| DECIMAL(p,s) | Decimal |
| FLOAT / DOUBLE | Float |
| JSON | Json |

### 典型场景：已有数据库初始化

```bash
# 1. 初始化项目
npx prisma init

# 2. 配置 .env
# DATABASE_URL="mysql://user:password@localhost:3306/mydb"

# 3. 拉取 Schema
npx prisma db pull

# 4. 生成 Client
npx prisma generate

# 5. 建立迁移基线
npx prisma migrate dev --name init
```

---

## 三、db seed：数据填充

### 配置 seed 脚本

```json
// package.json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

### TypeScript seed 脚本示例

```typescript
// prisma/seed.ts
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const userData: Prisma.UserCreateInput[] = [
  { username: 'admin', email: 'admin@example.com', name: 'Admin' },
  { username: 'editor', email: 'editor@example.com', name: 'Editor' },
];

async function main() {
  // 清空（注意外键约束顺序）
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();

  // 创建数据
  const users = await Promise.all(
    userData.map(data => prisma.user.create({ data })),
  );

  const categories = await Promise.all(
    ['技术', '前端', '后端'].map(name => prisma.category.create({ data: { name } })),
  );

  // 创建关联数据
  await prisma.post.create({
    data: {
      title: 'Prisma 入门',
      content: '...',
      published: true,
      author: { connect: { id: users[0].id } },
      categories: { connect: [{ id: categories[0].id }] },
    },
  });

  console.log('数据填充完成');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

### 幂等性设计

```typescript
// 使用 upsert 代替 create，确保可重复执行
await prisma.user.upsert({
  where: { email: 'admin@example.com' },
  update: {},
  create: { username: 'admin', email: 'admin@example.com', name: 'Admin' },
});
```

---

## 四、db execute：执行原生 SQL

```bash
# 执行 SQL 文件
npx prisma db execute --file=./scripts/init.sql

# 执行单条 SQL
npx prisma db execute --stdin <<< "CREATE INDEX idx_users_email ON users(email)"

# 指定数据库 URL
npx prisma db execute --file=./scripts/init.sql --url="postgresql://..."
```

适用场景：创建存储过程、触发器、视图；批量数据更新；数据库初始化配置。

```sql
-- scripts/init.sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_posts_author ON posts(author_id);

CREATE VIEW active_users AS
SELECT id, username, email FROM users WHERE deleted_at IS NULL;
```

---

## 五、migrate 迁移管理

### 开发环境工作流

```bash
# 修改 schema.prisma 后
npx prisma migrate dev --name add_user_avatar

# 只生成迁移文件不执行
npx prisma migrate dev --create-only --name add_field

# 查看迁移状态
npx prisma migrate status

# 解决迁移冲突
npx prisma migrate resolve --applied "migration_name"
```

### 生产环境部署

```bash
# 只执行未应用的迁移（不生成新迁移）
npx prisma migrate deploy
```

### 团队协作流程

```mermaid
graph LR
    A[开发者A修改Schema] --> B[执行 migrate dev]
    B --> C[提交迁移文件到Git]
    C --> D[开发者B拉取代码]
    D --> E[执行 migrate dev]
    E --> F[自动应用新迁移]
```

---

## 六、命令选择决策

```mermaid
graph TD
    A{已有数据库?} -->|是| B[db pull + migrate dev]
    A -->|否| C{团队协作?}
    C -->|是| D[migrate dev]
    C -->|否| E[db push 快速迭代]
    B --> F{需要填充数据?}
    D --> F
    E --> F
    F -->|是| G[db seed]
    F -->|否| H[完成]
    G --> H
```

---

## 常见问题

### db pull 无法识别某些类型

手动调整 Schema，将识别为 String 的枚举字段改为 enum 定义：

```prisma
enum Status {
  ACTIVE
  INACTIVE
  PENDING
}
```

### seed 脚本报错

```bash
# 检查配置
cat package.json | grep -A 2 "prisma"
# 确保 Prisma Client 已生成
npx prisma generate
# 手动执行排查
node prisma/seed.js
```

### 迁移冲突

```bash
npx prisma migrate status
npx prisma migrate resolve --applied "migration_name"
# 最后手段（会清空数据）
npx prisma migrate reset
```

---

## 最佳实践

### package.json 脚本配置

```json
{
  "scripts": {
    "db:pull": "prisma db pull",
    "db:push": "prisma db push",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "migrate:dev": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "migrate:reset": "prisma migrate reset",
    "generate": "prisma generate"
  }
}
```

### 核心原则

- 生产环境必须使用 `migrate deploy`，确保迁移可追溯、可回滚
- 开发环境使用 `migrate dev`，生成迁移文件纳入版本控制
- `db push` 仅用于原型阶段，不生成迁移历史
- seed 脚本设计为幂等（使用 upsert），支持重复执行
- 清理数据时注意外键约束顺序（先删子表，再删主表）

---

## 延伸阅读

- [Prisma 官方文档 - db pull](https://www.prisma.io/docs/reference/api-reference/command-reference#db-pull)
- [Prisma 官方文档 - Seed Database](https://www.prisma.io/docs/guides/database/seed-database)
- [Prisma 官方文档 - Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

> 上一篇：[Prisma 版本升级指南](07-Prisma版本升级指南.md)
