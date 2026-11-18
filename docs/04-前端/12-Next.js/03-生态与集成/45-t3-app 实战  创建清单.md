---
title: t3-app 实战  创建清单
description: T3 Stack 实战：实现清单的增删查功能，涵盖 Server Actions、Prisma 数据操作和 UI 交互
keywords: [T3 Stack, CRUD, Server Actions, Prisma, 清单管理]
category: Next.js
tags: [Next.js]
---

# t3-app 实战  创建清单

## 概念说明

本篇在已完成的身份认证与主题切换基础上，实现清单的增删查功能，完整走通「表单校验 → Server Actions → Prisma 数据库操作 → 页面刷新展示」的全栈链路。

该链路涉及的核心机制：

- **前端校验**：React Hook Form（RHF）负责表单状态，Zod 负责 schema 校验，`@hookform/resolvers` 把二者衔接起来。
- **服务端逻辑**：Server Actions 文件以 `"use server"` 声明，内部对数据做二次校验（`safeParse`）后再写库，并调用 `revalidatePath` 刷新页面缓存。
- **数据操作**：Prisma Client 通过单例模式在开发环境复用连接，schema 变更后用 `prisma migrate dev` 同步数据库。
- **UI 反馈**：Shadcn UI 的 `<Toaster>` 提供操作结果提示，删除等危险操作用 `AlertDialog` 二次确认。

## 核心要点

- 表单校验在客户端和服务端各做一次：RHF + Zod 提供即时反馈，Server Action 内 `safeParse` 兜底，防止绕过前端直接调用。
- Server Action 写库成功后必须调用 `revalidatePath("/")`，否则首页的 Server Component 仍读取缓存，新清单不会出现。
- Shadcn UI 组件的默认行为可以改源码定制——Toast 的弹出位置与停留时长直接修改 `toast.tsx` 与 `toaster.tsx` 即可。
- Prisma Client 在 Next.js 开发模式的热重载下会反复实例化，需要挂在 `globalThis` 上做单例，生产环境则正常创建。
- 删除操作按 `id + userId` 双条件删除，保证用户只能删除自己的清单。
- ⚠️ 常见误区：依赖 `<SheetTrigger>`/`<SheetClose>` 自动关闭弹窗。校验通过才应关闭 Sheet，因此需要改为受控模式（`open` + `onOpenChange`）。
- ⚠️ 常见误区：修改 Prisma schema 后忘记运行 `npx prisma migrate dev`，导致 Client 类型与数据库结构不一致。

## 功能一：创建清单

### 实现前端校验（RHF + Zod）

表单处理使用 React Hook Form 和 Zod。安装依赖项：

```bash
npm i react-hook-form zod @hookform/resolvers
```

新建 `src/lib/const.ts`，代码如下：

```typescript
export const ListMap = new Map([
  ["rose", ["bg-rose-500", "玫瑰"]],
  ["amber", ["bg-amber-500", "琥珀"]],
  ["orange", ["bg-orange-500", "橘橙"]],
  ["green", ["bg-lime-500", "草绿"]],
  ["cyan", ["bg-sky-500", "天蓝"]],
  ["indigo", ["bg-indigo-500", "葡紫"]],
  ["pink", ["bg-pink-500", "粉粉"]],
  ["black", ["bg-black", "黑色"]],
]);
```

在这段代码中，使用 Map 建立颜色与色值、中文名的映射关系。

新建 `src/schema/createList.ts`，代码如下：

```typescript
import { z } from "zod";
import { ListMap } from "@/lib/const";

export const createListZodSchema = z.object({
  name: z.string().min(1, {
    message: "名称不能为空",
  }),
  color: z
    .string()
    .min(1, {
      message: "请选择一个颜色",
    })
    .refine((color) => [...ListMap.keys()].includes(color)),
});

export type createListZodSchemaType = z.infer<typeof createListZodSchema>;
```

修改 `src/components/CreateListModal.tsx`，完整代码如下：

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createListZodSchema,
  type createListZodSchemaType,
} from "@/schema/createList";
import { cn } from "@/lib/utils";
import { ListMap } from "@/lib/const";
import { useState } from "react";

export default function CreateListModal() {
  const form = useForm({
    resolver: zodResolver(createListZodSchema),
    defaultValues: {
      name: "",
      color: "",
    },
  });

  const [open, setOpen] = useState(false);

  const onSubmit = async (data: createListZodSchemaType) => {
    console.log(data);
    setOpen(false);
  };

  const onOpenChange = (open: boolean) => {
    form.reset();
    setOpen(open);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button>添加清单</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>添加清单</SheetTitle>
          <SheetDescription>
            清单是任务的集合，比如“工作”、“生活”、“副业”
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-8 p-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>设置清单的名称：</FormLabel>
                  <FormControl>
                    <Input placeholder="例如：工作" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>选择清单的背景色：</FormLabel>
                  <FormControl>
                    <Select onValueChange={(color) => field.onChange(color)}>
                      <SelectTrigger
                        className={cn("w-[180px]", ListMap.get(field.value), {
                          "text-white": !!field.value,
                        })}
                      >
                        <SelectValue placeholder="颜色" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {[...ListMap.entries()].map(
                            ([color, [className, name]]) => {
                              return (
                                <SelectItem
                                  key={color}
                                  value={color}
                                  className={cn(
                                    "my-1 w-full rounded-md text-white ring-black focus:font-bold focus:text-white focus:ring-2 dark:ring-white",
                                    className,
                                    `focus:${className}`,
                                  )}
                                >
                                  {name}
                                </SelectItem>
                              );
                            },
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>
        <SheetFooter>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            创建
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

在这段代码中，有几点需要注意：

1.  React Hook Form 的 useForm 和 zodResolver 完成了前端数据校验
2.  Shadcn UI 虽然提供了 `<SheetTrigger>` 和 `<SheetClose>`用于控制 Sheet 的打开和关闭，但是当用户提交数据、验证通过的时候才能关闭 Sheet，所以需要改为手动控制：

```javascript
const [open, setOpen] = useState(false);

return <Sheet open={open} onOpenChange={setOpen} />
```

> 注意：这些属性虽然在 Sheet 的[文档](https://ui.shadcn.com/docs/components/sheet)里找不到说明，但可以找到对应的 Radix 组件[文档](https://www.radix-ui.com/primitives/docs/components/dialog)链接。

效果描述：当点击“添加清单”按钮的时候，右侧弹出创建清单表单。当提交的时候，触发前端校验，数据校验通过后，浏览器控制台中打印了提交的数据，清单表单关闭。

### 实现服务端逻辑（Server Actions）

新建 `src/actions/list.ts`，代码如下：

```typescript
"use server";

import {
  createListZodSchema,
  type createListZodSchemaType,
} from "@/schema/createList";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function createList(data: createListZodSchemaType) {
  const user = await currentUser();

  if (!user) {
    throw new Error("用户未登录，请先登录");
  }

  const result = createListZodSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      message: result.error.flatten().fieldErrors,
    };
  }

  // Todo: 数据库处理
  console.log(data);

  revalidatePath("/");

  return {
    success: true,
    message: "清单创建成功",
  };
}
```

修改 `src/components/CreateListModal.tsx`，代码如下：

```tsx
"use client";

// ...
import { createList } from "@/actions/list";

export default function CreateListModal() {
  // ...

  const onSubmit = async (data: createListZodSchemaType) => {
    try {
      await createList(data);
      onOpenChange(false);
      console.log("success");
    } catch (e) {
      console.log(e);
    }
  };

  // ...

  return (
  // ...
  );
}
```

效果描述：当提交数据的时候，会触发请求，成功后，浏览器控制台打印了 success

### 添加 toast 效果（Shadcn UI）

创建时无论成功还是失败都应有消息提示，因此引入 Shadcn UI 的 `<Toaster>` 组件。

修改 `src/app/layout.tsx`，添加代码如下：

```tsx
// ...
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const localization = merge(zhCN, zhCNlocales);
  return (
    <ClerkProvider localization={localization}>
      <html
        lang="zh-CN"
        className={`${GeistSans.variable}`}
        suppressHydrationWarning
        >
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
            >
            <Header />
            <div className="flex w-full flex-col items-center">{children}</div>
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

```

修改 `src/components/CreateListModal.tsx`，代码如下：

```tsx
"use client";

// ...
import { toast } from "@/components/ui/use-toast";

export default function CreateListModal() {
  // ...

  const onSubmit = async (data: createListZodSchemaType) => {
    try {
      await createList(data);
      onOpenChange(false);
      toast({
        title: "恭喜您",
        description: "清单创建成功！",
      });
    } catch (e) {
      console.log(e);
      toast({
        title: "哎呦",
        description: "清单创建失败",
        variant: "destructive",
      });
    }
  };

  // ...

  return (
  // ...
  );
}
```

效果描述：当创建成功的时候，会有一个 Toast 提示。

默认的 Toast 有两处与预期不符：

1.  Toast 从下面弹出，如果是从上面弹出就好了……
2.  Toast 停留的时间太久了，如果时间短点就好了……

这正是 Shadcn UI 的优势所在：组件源码就在项目内，可以直接修改。

修改 `src/components/ui/toast.tsx` 第 19 行左右位置的样式代码，修改代码如下：

```diff
- fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:top-auto sm:bottom-0 sm:right-0 sm:flex-col md:max-w-[420px]
+ fixed top-0 left-[50%] z-[100] flex max-h-screen w-full translate-x-[-50%] flex-col-reverse p-4 sm:right-0 sm:flex-col md:max-w-[420px]
```

修改 `src/components/ui/toaster.tsx`，添加代码如下：

```tsx
// ...

export function Toaster() {
  // ...

  return (
    <ToastProvider duration={1000}>
      {/* ... */}
    </ToastProvider>
  );
}

```

### Prisma 与数据库操作（Prisma）

新建 `src/lib/prisma.ts`，代码如下：

```javascript
// 代码来源于官方文档：https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices

import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
```

修改 `prisma/schema.prisma`，代码如下：

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
}
```

因为修改了 Schema，所以运行：

```bash
npx prisma migrate dev
```

修改 `src/actions/list.ts`，完整代码如下：

```typescript
"use server";

import {
  createListZodSchema,
  type createListZodSchemaType,
} from "@/schema/createList";
import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

export async function createList(data: createListZodSchemaType) {
  const user = await currentUser();

  if (!user) {
    throw new Error("用户未登录，请先登录");
  }

  const result = createListZodSchema.safeParse(data);

  if (!result.success) {
    return {
      success: false,
      message: result.error.flatten().fieldErrors,
    };
  }

  await prisma.list.create({
    data: {
      userId: user.id,
      color: data.color,
      name: data.name,
    },
  });

  revalidatePath("/");

  return {
    success: true,
    message: "清单创建成功",
  };
}
```

数据是否真的写入数据库，可以用 Prisma 自带的可视化工具检查，运行：

```bash
npx prisma studio
```

效果描述：清单创建成功后，数据库的数据也确实发生了更新

## 功能二：展示清单

修改 `src/app/page.tsx`，添加代码如下：

```tsx
// ...
import { CheckLists } from "@/components/CheckLists";

// ...

export default function HomePage() {
  return (
    <main className="flex w-full flex-col items-center px-4">
      <Suspense fallback={<WelcomeFallback />}>
        <Welcome />
      </Suspense>
      <Suspense fallback={<WelcomeFallback />}>
        <CheckLists />
      </Suspense>
    </main>
  );
}

```

新建 `src/components/CheckLists.tsx`，代码如下：

```tsx
import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { type List } from "@prisma/client";
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

interface Props {
  checkList: List;
}

function CheckList({ checkList }: Props) {
  const { name, color } = checkList;

  return (
    <Card
      className={cn("w-full text-white sm:col-span-2", ListMap.get(color))}
      x-chunk="dashboard-05-chunk-0"
      >
      <CardHeader>
        <CardTitle>{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>任务列表</p>
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

新建 `src/components/CheckListFooter.tsx`，代码如下：

```tsx
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Trash2, CirclePlus } from "lucide-react";
import { type List } from "@prisma/client";

interface Props {
  checkList: List;
}

export default function CheckListFooter({ checkList }: Props) {
  const { createdAt } = checkList;

  const deleteCheckList = async () => {
    console.log(1);
  };

  return (
    <>
      <Separator />
      <footer className="flex h-[60px] w-full items-center justify-between text-sm text-white">
        <p>创建于 {createdAt.toLocaleDateString("zh-CN")}</p>
        <div>
          <Button size={"icon"} variant={"ghost"}>
            <CirclePlus />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size={"icon"} variant={"ghost"}>
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确定要删除吗？</AlertDialogTitle>
                <AlertDialogDescription>该操作无法撤回</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={deleteCheckList}>
                  确定
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </footer>
    </>
  );
}

```

效果描述：当创建清单后，首页会刷新出新建的任务列表，点击删除按钮，会出现删除弹窗。

## 功能三：删除清单

修改 `src/actions/list.ts`，添加代码如下：

```typescript
export async function deleteList(id: number) {
  const user = await currentUser();
  if (!user) {
    throw new Error("用户未登录，请先登录");
  }

  await prisma.list.delete({
    where: {
      id: id,
      userId: user.id,
    },
  });

  revalidatePath("/");
}
```

修改 `src/components/CheckListFooter.tsx`，完整代码如下：

```tsx
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Trash2, CirclePlus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { type List } from "@prisma/client";
import { deleteList } from "@/actions/list";

interface Props {
  checkList: List;
}

export default function CheckListFooter({ checkList }: Props) {
  const { id, createdAt } = checkList;

  const deleteCheckList = async () => {
    try {
      await deleteList(id);
      toast({
        title: "操作成功",
        description: "清单已经删除",
      });
    } catch (e) {
      toast({
        title: "操作失败",
        description: "清单删除失败，请稍后重试",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <Separator />
      <footer className="flex h-[60px] w-full items-center justify-between text-sm text-white">
        <p>创建于 {createdAt.toLocaleDateString("zh-CN")}</p>
        <div>
          <Button size={"icon"} variant={"ghost"}>
            <CirclePlus />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size={"icon"} variant={"ghost"}>
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确定要删除吗？</AlertDialogTitle>
                <AlertDialogDescription>该操作无法撤回</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={deleteCheckList}>
                  确定
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </footer>
    </>
  );
}

```

## 实践要点

- Sheet 弹窗改为受控模式（`useState` + `open` + `onOpenChange`），并在 `onOpenChange` 中调用 `form.reset()`，保证每次打开表单都是初始状态。
- Server Action 的返回结构统一为 `{ success, message }`，客户端据此分支处理成功与失败提示；登录态缺失则直接抛错。
- Toast 位置与时长这类「库默认值不合需求」的问题，直接改 Shadcn UI 生成的组件源码即可，这也是它区别于传统黑盒组件库的核心优势。
- `prisma.list.delete` 的 `where` 条件同时包含 `id` 与 `userId`，是数据权限的最后一道防线，不可省略。
- 展示类组件（`CheckLists`）是异步 Server Component，配合 `<Suspense>` 与骨架屏渲染，避免数据库查询阻塞首屏。

## 源码与小结

- 源码地址：<https://github.com/mqyqingfeng/next-app-demo/tree/next-t3-todo-2>
- 下载代码：`git clone -b next-t3-todo-2 git@github.com:mqyqingfeng/next-app-demo.git`

本篇实现了清单的增删查三个功能：创建清单走「RHF + Zod 前端校验 → Server Action 二次校验 → Prisma 写库 → revalidatePath 刷新」链路；展示清单由异步 Server Component 按当前用户查询并渲染；删除清单通过 AlertDialog 二次确认后按 `id + userId` 删除。清单的容器功能已经齐备，下一环节是实现清单内具体任务的新增与状态修改。
