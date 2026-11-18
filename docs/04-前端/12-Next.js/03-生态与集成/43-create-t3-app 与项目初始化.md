---
title: create-t3-app 与项目初始化
description: create-t3-app 脚手架的使用方法与 T3 Stack 技术选型解析
keywords: [create-t3-app, T3 Stack, 项目初始化, 脚手架, 技术选型]
category: Next.js
tags: [Next.js]
---

# create-t3-app 与项目初始化

## 概念说明

[create-t3-app](https://github.com/t3-oss/create-t3-app) 是一个交互式 CLI 脚手架，用于创建类型安全的全栈 Next.js 应用。

截至统计时该工具在 GitHub 上获得 24k Stars，位列 2023 年 React 生态 Star 增长数[第 7 名](https://risingstars.js.org/2023/zh#section-react)。排在前面的 shadcn/ui、Next.js、Zustand 等均为功能型库，单论脚手架，T3 排名第一。

T3 的命名来源常被误解为 Tailwind CSS + TypeScript + tRPC 的技术栈简写，实际上它是作者 Theo 名字的简写。

T3 技术栈包括：Next.js、tRPC、Tailwind CSS、TypeScript、Prisma、Drizzle、NextAuth.js。

与 [Next-js-Boilerplate](https://github.com/ixartz/Next-js-Boilerplate) 这类固定模板不同，create-t3-app CLI 会先让开发者选择使用的技术栈，再生成脚手架代码。这一「先选型、后生成」的设计使脚手架产出与团队实际需求保持一致，避免生成大量用不到的样板代码。

## 核心要点

- create-t3-app 是**交互式**脚手架：技术栈选择发生在代码生成之前，而非生成后再裁剪。
- 必选组合为 TypeScript + Tailwind CSS + App Router，其余组件按项目需要取舍。
- tRPC 对初学者上手成本较高，入门项目建议暂不引入（原因见《tRPC 与类型安全》）。
- 鉴权（NextAuth.js）、ORM（Prisma / Drizzle）、数据库均为可选项，选型取决于项目是否需要以及团队熟悉度。
- 生成后的初始化链路是固定的：数据库（Docker 或现有实例）→ `.env` 连接串 → Prisma/Drizzle schema 同步 → 重启 TS Server。
- ⚠️ 常见误区：执行 Prisma 类型生成后不重启 TS Server，导致 IDE 无法识别生成的类型，误以为代码报错。
- ⚠️ 常见误区：删除 `start-database.sh` 改用现有数据库后忘记同步修改 `.env` 中的 `DATABASE_URL`，造成连接失败。

## 项目初始化流程

### 命令与技术栈选择

运行以下命令进入交互式技术栈选择环节：

```bash
npm create t3-app@latest
```

各选型的决策依据：

1.  必选的是：TypeScript + Tailwind CSS + App Router
2.  tRPC 初学者不建议使用，参考《tRPC 与类型安全》中给出的原因
3.  鉴权：视项目需求决定是否启用 NextAuth
4.  数据库 ORM：Prisma 和 Drizzle 都很不错，Prisma 发展成熟，Drizzle 冉冉新星
5.  数据库：选择团队最熟悉的
6.  alias：取决于个人习惯，该配置项会写入到 `tsconfig.json`

选择完成后，即得到一个 Next.js + TypeScript + Tailwind CSS + Prisma + MySQL 的项目。CLI 会提示下一步要做的工作，核心是数据库和 ORM 的设置。

### 数据库设置

**使用 Docker**：如果选择了 MySQL 或 PostgreSQL 作为数据库，项目根目录会有一个 `start-database.sh` 脚本文件，用于创建一个数据库 Docker 容器供本地开发。已安装 Docker 的情况下运行 `./start-database.sh`，Docker 会拉取对应的数据库镜像并开启一个容器。

**使用现有数据库**：如果不用 Docker 而使用现有的数据库，可以直接删除此文件。数据库地址配置在 `.env` 文件中，按实际地址填写即可，比如：

```bash
DATABASE_URL="mysql://root:admin@localhost:3306/next-t3"
```

### Prisma 设置

如果选择了 Prisma，t3 会创建一个初始的 `schema.prisma` 文件。为了保持 Prisma schema 和数据库一致，需要运行：

```bash
npx prisma db push
```

这个命令在同步数据库结构的同时，会为 Prisma Client 生成 TypeScript 类型，所以执行后需要重启 TS Server 才能被 IDE 识别：`Cmd + Shift + P`，输入 `restart`，选择 `Restart TS Server`。

> 如果没有看到 Restart TS Server 命令，点进一个 ts 文件，并保证没有分屏，或者分屏里也是 ts 文件，然后再试一次

如果使用的是 Drizzle，流程类似：`.env` 文件中有具体说明，配置 `.env` 文件后，运行 `npm run db:push`。

## 实践要点

- `prisma db push` 适合脚手架初始阶段快速对齐 schema 与数据库；进入正式迭代后再引入迁移（migration）流程更稳妥。
- 每次执行生成类型的命令后都要重启 TS Server，否则 IDE 中会出现「类型不存在」的假报错。
- `.env` 中的 `DATABASE_URL` 包含数据库账号密码，该文件不应提交到版本控制。

## 配套实战项目

以 t3-app 为项目脚手架，使用 **TypeScript + Tailwind + Prisma + MySQL + Zod + Shadcn UI + React Hook Form + Clerk** 可以开发一个典型的清单（TodoList）应用，服务端逻辑使用 **Server Actions** 实现。这套组合覆盖了类型校验、UI 组件、表单、鉴权与数据库的完整链路，是社区中常见的一套推荐选型。

绝大部分应用的本质是增删改查，TodoList 因此是熟悉这套技术选型的典型例子。该清单应用的行为设计如下：

- 用户进入首页时，由于路由保护，页面重定向到登录页面；登录后才能查看自己创建的清单和任务。
- 用户可以创建多个清单，每个清单又可添加多个任务；清单可以删除，任务可以点击完成。
- 页面支持暗黑模式，同时支持响应式布局。

## 小结

create-t3-app 通过「先选型、后生成」的交互模式，把 Next.js 全栈项目常用的 TypeScript、Tailwind CSS、tRPC、Prisma/Drizzle、NextAuth.js 整合为一套开箱即用的脚手架。初始化阶段的关键动作有三步：运行 `npm create t3-app@latest` 完成选型；用 `start-database.sh` 或 `.env` 打通数据库连接；执行 `npx prisma db push` 同步 schema 并生成类型。完成这三步后，项目即具备正式开发条件，后续可按清单应用的路径实践完整技术栈。
