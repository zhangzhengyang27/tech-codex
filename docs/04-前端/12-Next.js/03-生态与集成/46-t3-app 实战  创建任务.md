---
title: t3-app 实战  创建任务
description: T3 Stack 实战：实现任务管理功能，包括乐观更新、表单验证和状态管理
keywords: [T3 Stack, 任务管理, 乐观更新, 表单验证, 状态管理]
category: Next.js
tags: [Next.js]
---

# t3-app 实战  创建任务

## 概念说明

本篇在清单功能的基础上，实现清单内任务的创建、展示与完成，并解决项目构建阶段的 TypeScript 报错问题。

任务功能与清单功能共用同一套技术链路（RHF + Zod 校验、Server Actions、Prisma），新增的知识点集中在三处：

- **关联模型**：Task 与 List 建立一对多关系，并通过 `onDelete: Cascade` 实现级联删除。
- **复合表单控件**：日期选择使用 Popover + Calendar + dayjs 组合。
- **状态更新**：任务完成状态通过 `setTaskDone` Server Action 更新并触发页面刷新。

## 核心要点

- Prisma 关联建模：`List` 侧声明 `tasks Task[]`，`Task` 侧声明外键 `ListId` 与 `@relation`；删除清单时任务随 `onDelete: Cascade` 一并删除。
- Server Action 写关联数据时使用 `list: { connect: { id: todoId } }`，而非直接写外键字段。
- 任务完成更新与清单删除一样，`where` 条件包含 `id + userId` 双重校验，保证数据权限。
- `expiresAt` 是可选字段（`DateTime?`），过期任务在 UI 上以红色日期标示，判断逻辑为 `Date.now() - task.expiresAt.getTime() > 0`。
- Shadcn UI 与 t3-app 的代码风格差异会在 `npm run build` 时产生 TypeScript 错误，处理方式包括删除未用组件、调整 ESLint 规则或放宽构建配置。
- ⚠️ 常见误区：新增 schema 后忘记运行 `npx prisma migrate dev`，导致 Prisma Client 类型与数据库不同步。

## 功能一：创建任务

### 1.1. 数据库 Schema 定义

首先定义任务相关的数据库字段，修改 `prisma/schema.prisma`，完整代码如下：

```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model List {
  id        Int      @id @default(autoincrement())
  name      String
  userId    String
  color     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tasks Task[]
}

model Task {
  id        Int       @id @default(autoincrement())
  content   String
  userId    String
  done      Boolean   @default(false)
  expiresAt DateTime?
  createdAt DateTime  @default(now())

  ListId Int
  list   List @relation(fields: [ListId], references: [id], onDelete: Cascade)
}
```

因为修改了 Schema，所以运行以下命令同步数据库：

```bash
npx prisma migrate dev
```

### 1.2. 表单与前端数据校验

修改 `src/components/CheckListFooter.tsx`，添加代码如下：

```diff
"use client";
// ...
+ import CreateTaskModal from "@/components/CreateTaskModal";
// ...
export default function CheckListFooter({ checkList }: Props) {

  // ...
  return (
    <>
      <Separator />
      <footer className="flex h-[60px] w-full items-center justify-between text-sm text-white">
        <p>创建于 {createdAt.toLocaleDateString("zh-CN")}</p>
        <div>
-          <Button size={"icon"} variant={"ghost"}>
-            <CirclePlus />
-          </Button>
+          <CreateTaskModal checkList={checkList} />
          // ...
        </div>
      </footer>
    </>
  );
}
```

在这段代码中，创建任务表单的代码被放到 `<CreateTaskModal>` 组件中。

新建 `src/components/CreateTaskModal.tsx`，代码如下：

```tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarDays, CirclePlus } from "lucide-react";

import { type List } from "@prisma/client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import dayjs from "dayjs";
import {
  createTaskZodSchema,
  type createTaskZodSchemaType,
} from "@/schema/createTask";
import { zodResolver } from "@hookform/resolvers/zod";

import { ListMap } from "@/lib/const";
import { cn } from "@/lib/utils";

interface Props {
  checkList: List;
}

export default function CreateTaskModal({ checkList }: Props) {
  const { id, name, color } = checkList;

  const [open, setOpen] = useState(false);

  const form = useForm<createTaskZodSchemaType>({
    resolver: zodResolver(createTaskZodSchema),
    defaultValues: {
      content: "",
      todoId: id,
    },
  });

  const onOpenChange = (open: boolean) => {
    form.reset();
    setOpen(open);
  };

  const onSubmit = async (data: createTaskZodSchemaType) => {
    try {
      console.log(data);
      toast({
        title: "操作成功",
        description: "任务已经添加！",
      });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "操作失败",
        description: "任务创建失败，请稍后重试",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size={"icon"} variant={"ghost"}>
          <CirclePlus />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>添加任务</DialogTitle>
          <DialogDescription>任务将添加到 「{name}」 清单</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Form {...form}>
            <form
              className="flex flex-col space-y-4"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>任务内容：</FormLabel>
                    <FormControl>
                      <Input className="col-span-3" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>截止日期：</FormLabel>
                    <FormControl>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            <CalendarDays className="mr-2 h-4 w-4" />
                            {field.value &&
                              dayjs(field.value).format("YYYY/MM/DD")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent>
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>
        <DialogFooter>
          <Button
            disabled={form.formState.isSubmitting}
            className={cn(
              "w-full text-white dark:text-white",
              ListMap.get(color),
            )}
            onClick={form.handleSubmit(onSubmit)}
          >
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

这段代码与创建清单的实现思路一致：React Hook Form 和 Zod 负责前端数据校验，提交的数据通过校验后使用 `toast()` 提示信息。区别在于增加了日期选择控件（Popover + Calendar），并引入清单 `id` 作为隐藏字段。

因为需要处理时间，安装 `dayjs`：

```bash
npm i dayjs
```

进行数据校验需要先定义 Zod Schema，新建 `src/schema/createTask.ts`，代码如下：

```typescript
import { z } from "zod";

export const createTaskZodSchema = z.object({
  todoId: z.number().nonnegative(),
  content: z.string().min(1, {
    message: "请填写任务内容",
  }),
  expiresAt: z.date().optional(),
});

export type createTaskZodSchemaType = z.infer<typeof createTaskZodSchema>;
```

### 1.3. 添加服务端逻辑

新建 `src/actions/task.ts`，代码如下：

```typescript
"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import {
  createTaskZodSchema,
  type createTaskZodSchemaType,
} from "@/schema/createTask";

export async function createTask(data: createTaskZodSchemaType) {
  const user = await currentUser();

  if (!user) {
    throw new Error("用户未登录，请先登录");
  }

  const result = createTaskZodSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      message: result.error.flatten().fieldErrors,
    };
  }

  const { content, expiresAt, todoId } = data;

  await prisma.task.create({
    data: {
      userId: user.id,
      content,
      expiresAt,
      list: {
        connect: {
          id: todoId,
        },
      },
    },
  });

  revalidatePath("/");
}
```

修改 `src/components/CreateTaskModal.tsx`，添加代码如下：

```diff
+ import { createTask } from "@/actions/task";

  const onSubmit = async (data: createTaskZodSchemaType) => {
    try {
-      console.log(data);
+      await createTask(data);
      toast({
        title: "操作成功",
        description: "任务已经添加！",
      });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "操作失败",
        description: "任务创建失败，请稍后重试",
        variant: "destructive",
      });
    }
  };
```

至此任务创建功能完成。

效果描述：在 prisma studio 中可以查看新增的数据。

## 功能二：展示任务

修改 `src/components/CheckLists.tsx`，完整代码如下：

```tsx
import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { type Task, type List } from "@prisma/client";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CheckListFooter from "@/components/CheckListFooter";

import { cn } from "@/lib/utils";
import { ListMap } from "@/lib/const";
import TaskItem from "@/components/TaskItem";

interface Props {
  checkList: List & {
    tasks: Task[];
  };
}

function CheckList({ checkList }: Props) {
  const { name, color, tasks } = checkList;

  return (
    <Card
      className={cn("w-full text-white sm:col-span-2", ListMap.get(color))}
      x-chunk="dashboard-05-chunk-0"
    >
      <CardHeader>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 && <p>目前没有任务</p>}
        {tasks.length > 0 && (
          <div>
            {tasks.map((task) => {
              return <TaskItem key={task.id} task={task} />;
            })}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col pb-2">
        <CheckListFooter checkList={checkList} />
      </CardFooter>
    </Card>
  );
}

export async function CheckLists() {
  const user = await currentUser();
  const checkLists = await prisma.list.findMany({
    include: {
      tasks: true,
    },
    where: {
      userId: user?.id,
    },
  });

  if (checkLists.length === 0) {
    return <div className="mt-4">尚未创建清单，赶紧创建一个吧!</div>;
  }

  return (
    <>
      <div className="mt-6 flex w-full flex-col gap-4">
        {checkLists.map((checkList) => (
          <CheckList key={checkList.id} checkList={checkList} />
        ))}
      </div>
    </>
  );
}
```

关键变化是 `prisma.list.findMany` 增加了 `include: { tasks: true }`，一次查询同时取回清单及其任务列表。

新建 `src/components/TaskItem.tsx`，代码如下：

```tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import dayjs from "dayjs";
import { type Task } from "@prisma/client";
import { cn } from "@/lib/utils";

function TaskItem({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={task.id.toString()}
        className="h-5 w-5 bg-white"
        checked={task.done}
        onCheckedChange={async (value) => {
          console.log(value);
        }}
        />
      <label
        htmlFor={task.id.toString()}
        className={cn(
          "flex flex-row items-center gap-2",
          task.done && "line-through",
        )}
        >
        {task.content}
        {task.expiresAt && (
          <p
            className={cn("text-xs text-white", {
              "text-red-800": Date.now() - task.expiresAt.getTime() > 0,
            })}
            >
            {dayjs(task.expiresAt).format("DD/MM/YYYY")}
          </p>
        )}
      </label>
    </div>
  );
}

export default TaskItem;
```

## 功能三：完成任务

修改 `src/actions/task.ts`，添加代码如下：

```typescript
// ...

export async function setTaskDone(id: number) {
  const user = await currentUser();

  if (!user) {
    throw new Error("用户未登录，请先登录");
  }

  await prisma.task.update({
    where: {
      id: id,
      userId: user.id,
    },
    data: {
      done: true,
    },
  });

  revalidatePath("/");
}
```

修改 `src/components/TaskItem.tsx`，添加代码如下：

```tsx
"use client";

import { Checkbox } from "@/components/ui/checkbox";
import dayjs from "dayjs";
import { type Task } from "@prisma/client";
import { cn } from "@/lib/utils";
import { setTaskDone } from "@/actions/task";

function TaskItem({ task }: { task: Task }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={task.id.toString()}
        className="h-5 w-5 bg-white"
        checked={task.done}
        onCheckedChange={async () => {
          await setTaskDone(task.id);
        }}
        />
      <label
        htmlFor={task.id.toString()}
        className={cn(
          "flex flex-row items-center gap-2",
          task.done && "line-through",
        )}
        >
        {task.content}
        {task.expiresAt && (
          <p
            className={cn("text-xs text-white", {
              "text-red-800": Date.now() - task.expiresAt.getTime() > 0,
            })}
            >
            {dayjs(task.expiresAt).format("DD/MM/YYYY")}
          </p>
        )}
      </label>
    </div>
  );
}

export default TaskItem;
```

## 修复：构建错误

项目开发完毕准备上线时，运行：

```bash
npm run build
```

会出现一些 TypeScript 错误，主要集中在 Shadcn UI 的组件代码中。这是 Shadcn UI 和 t3-app 代码风格不一样导致，暂时两边都没有解决。

为了避免这些错误导致构建失败，有两种处理方式：

1.  删除 `components/ui/chart.tsx` 和 `components/ui/input-otp.tsx`这两个没有用到的组件
2.  修改 `next-t3-todo/.eslintrc.cjs`，添加规则如下：

```javascript
/** @type {import("eslint").Linter.Config} */
const config = {
  // ...
  rules: {
    // ...
    "@typescript-eslint/no-empty-interface": [
      "error",
      { allowSingleExtends: true },
    ],
    "@typescript-eslint/prefer-nullish-coalescing": "warn",
  },
};
module.exports = config;

```

此时应该可以通过 TypeScript 校验。

此外，也可以禁用某些规则、或者设置 `next.config.ts` 的配置项，即使有错误也继续构建。

## 实践要点

- 关联查询用 `include: { tasks: true }` 一次取回嵌套数据，避免在组件中逐个清单再查任务造成 N+1 查询。
- Server Action 中建立关联使用 `connect` 语法，删除断言 `id + userId` 双条件，这是贯穿全项目的权限约定。
- 日期展示统一交给 dayjs 格式化，过期判断在渲染层完成，字段本身保持 `DateTime?` 可空。
- 构建失败先定位错误来源（第三方组件代码 vs 自身代码），对未使用的第三方组件优先删除，再考虑放宽 lint 规则。
- Shadcn UI 组件源码在项目内，遇到风格冲突可以按需修改或删除具体组件文件，而不必等待上游修复。

## 小结

本篇完成了任务维度的功能闭环：定义 Task 与 List 的一对多关联模型并级联删除；通过 Dialog + RHF + Zod + Popover/Calendar 创建任务（含可选截止日期）；清单查询用 `include` 带出任务并由 `TaskItem` 渲染；勾选任务触发 `setTaskDone` 更新状态并刷新页面。最后针对 Shadcn UI 与 t3-app 的代码风格差异给出了构建报错的两种处理路径。

当前 Next.js 社区最流行的技术选型即本项目所用这套：

1. Next.js App Router + Server Actions
2. TypeScript
3. Tailwind CSS
4. Prisma / Drizzle
5. Zod + Shadcn UI + React Hook Form
6. Clerk / Supabase / Next-Auth

熟悉这套技术选型可以更高效地开发 Next.js 项目。
