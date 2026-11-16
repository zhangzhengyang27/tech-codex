---
title: Node 中的 TypeScript
description: "Node.js + TypeScript 实践:ts-node 与 tsx 的运行方式对比、@types/node 与内置模块类型、面向 Node 的 tsconfig 配置、Express 的类型集成,以及原生 TS 框架 NestJS 的类型体系。"
version: 1.0
author: 文档维护组
created: 2026-11-14
updated: 2026-11-14
status: 正式
category: TypeScript
---

# Node 中的 TypeScript

Node 没有浏览器那样的"打包编译"包袱,但运行环境仍是 JavaScript:TS 代码要么在运行时被即时转译(ts-node/tsx),要么先编译为 JS 再部署(tsc)。本章覆盖运行方式、类型声明、tsconfig、Express 与 NestJS 四个核心环节。

> 版本说明:以 Node 20+(LTS)与 TS 5.x 为基准,大方向适用于当前主流环境。Node 22+ 已支持 `--experimental-strip-types` 原生运行部分 TS 语法,尚未到生产默认推荐,了解即可。

## 运行方式:ts-node vs tsx

两者都做"即时转译",区别在转译引擎与体验:

| 维度 | ts-node | tsx |
| --- | --- | --- |
| 转译引擎 | TypeScript 编译器(tsc) | esbuild |
| 启动速度 | 慢,全量类型检查路径 | 快一个数量级,只转译不检查 |
| 配置成本 | 需处理 tsconfig-paths、CommonJS/ESM 兼容 | 开箱即用,自动处理 |
| REPL | 支持 | 支持(vite-node 生态兼容) |
| 定位 | 传统方案,兼容老项目 | 现代脚本与服务开发的默认选择 |

```bash
npm i -D tsx
tsx watch src/index.ts   # 开发:文件变化自动重启
tsx src/index.ts         # 运行单个文件
```

::: tip 运行时转译不等于类型检查
tsx/esbuild 只删除类型、不校验类型,写错类型照样运行。类型检查必须显式执行 `tsc --noEmit`(放进 CI),或交给编辑器实时提示。"能跑"和"类型正确"是两条独立流水线。
:::

生产部署仍推荐 `tsc` 预编译为 JS 后用 `node dist/index.js` 启动,省去运行时开销。

## @types/node 与内置模块类型

Node 的内置模块(`fs`、`path`、`http` 等)类型由 DefinitelyTyped 社区维护:

```bash
npm i -D @types/node
```

```ts
import { readFile } from 'node:fs/promises'; // 'node:' 前缀明确标识内置模块
import path from 'node:path';

const buf: Buffer = await readFile('./data.txt');
const ext: string = path.extname('./a/b.txt');
```

要点:

- **没有 `@types/node`,所有内置模块报"找不到声明"**,这是新项目报错的第一嫌疑。
- 导入内置模块建议加 `node:` 前缀,类型提示与运行时语义一致,且避免与 npm 同名包冲突。
- 第三方包同理:类型不在包内的(如 `express`),需额外安装 `@types/xxx`。

::: warning @types/node 版本要与 Node 大版本对齐
`@types/node@20` 对应 Node 20。类型包超前于运行时版本时,会提示使用运行时不存在的 API(如新参数),类型检查通过但运行报错。锁住与运行时一致的大版本。
:::

## 面向 Node 的 tsconfig 配置

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "sourceMap": true,
    "types": ["node"]
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

关键字段的取舍:

- `module: "NodeNext"`:跟随 `package.json` 的 `type` 字段决定 ESM/CJS 输出,是 Node 生态的标准答案;构建工具链是打包器(bundler)时才改用 `"moduleResolution": "bundler"`。
- `strict: true`:后端代码路径可控,没有理由不开。
- `esModuleInterop: true`:兼容 CJS 包的默认导入写法(`import express from 'express'`)。
- `types: ["node"]`:显式声明全局可用的类型包,避免把测试框架类型泄漏进业务代码。

## Express 的 TS 集成

Express 用 JS 编写,类型来自社区包 `@types/express`,重点是把 `Request` 补上业务字段:

```bash
npm i express
npm i -D @types/express
```

```ts
import express, { type Request, type Response, type NextFunction } from 'express';

// 扩展 Request:挂载业务字段(如鉴权后的用户)
interface AuthRequest extends Request {
  user?: { id: string; role: 'admin' | 'user' };
}

const app = express();

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

app.get('/me', requireAuth, (req: AuthRequest, res: Response) => {
  res.json({ id: req.user!.id }); // requireAuth 已收窄,业务层可用非空断言兜底
});

app.listen(3000);
```

更优雅的全局方案是通过**声明合并**给 `Request` 本身加字段,所有中间件共享:

```ts
// types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: 'admin' | 'user' };
    }
  }
}

export {};
```

::: warning 中间件与错误处理的类型分界
Express 的异步中间件抛出的 Promise rejection 不会进入错误处理中间件(Node 20 生态需自行 `try/catch` 或引入 `express-async-errors`),类型系统对此无感知——返回 `Promise` 的 handler 要么 `await` 全部,要么包一层 `asyncHandler` 工具函数,这是类型之外必须人工保证的部分。
:::

## NestJS:原生 TS 后端框架

NestJS 从零按 TS 设计,装饰器承载依赖注入,类型贯穿控制器、服务与 DTO:

```ts
import { Controller, Get, Post, Body, ParseIntPipe } from '@nestjs/common';
import { IsString, IsInt, Min } from 'class-validator';

// DTO:用 class + 装饰器声明校验规则(类型 + 运行时校验二合一)
export class CreateUserDto {
  @IsString()
  name: string;

  @IsInt()
  @Min(0)
  age: number;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {} // 注入类型即构造参数类型

  @Post()
  create(@Body() dto: CreateUserDto) {
    // dto 类型完整,校验由 ValidationPipe 在运行时完成
    return this.usersService.create(dto);
  }

  @Get(':id')
  findOne(@Body('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }
}
```

NestJS 的类型价值点:

- **构造函数注入**:依赖的类型与注入的服务类型自动对应,不存在 `any` 注入。
- **DTO 双重校验**:class 属性类型是编译期检查,`class-validator` 装饰器是运行时校验,两者写在同一处。
- **管道与拦截器**:泛型约束输入输出,如 `ValidationPipe` 产出类型化的请求体。

::: tip 装饰器依赖严格元数据
NestJS 的依赖注入依赖 `emitDecoratorMetadata: true` 生成设计期元数据,tsconfig 缺了它会在运行时报"无法解析依赖"。这是少数"必须写进 tsconfig 的框架开关",与前端项目无关,后端模板里已内置。
:::

## 小结

- 开发用 `tsx`(快、零配置),CI 用 `tsc --noEmit` 补类型检查,部署用 `tsc` 预编译,三者分工明确。
- `@types/node` 是内置模块类型的前提,版本对齐运行时大版本;导入加 `node:` 前缀。
- Node 侧 tsconfig 主线:`module: NodeNext` + `strict` + `esModuleInterop`。
- Express 靠 `@types/express` + 声明合并扩展 `Request`;NestJS 原生 TS,装饰器 + class-validator 让类型与运行时校验合一。

## 延伸阅读

- [02-Vue 中的 TypeScript](02-Vue 中的 TypeScript) — 前端框架接入 TS 的对照篇
- [01-React 中的 TypeScript](01-React 中的 TypeScript) — React 生态的类型实践
- [02-TSConfig配置-构建](../04-工程化实践/02-TSConfig配置-构建) — module/moduleResolution 等编译字段的完整展开
- [05-工具链与生态](../04-工程化实践/05-工具链与生态) — tsx/ts-node 所处的转译工具全景
- [tsx 官方文档](https://tsx.is/)
