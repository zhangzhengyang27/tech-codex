---
title: TypeScript 集成
description: 在工程化链路中集成 TypeScript：tsconfig、类型检查与构建
keywords: [Node.js, 构建, 脚手架, TypeScript]
category: Node.js
tags: [Node.js, 工程化]
---







# TypeScript 集成

## 介绍

TypeScript 是由 Microsoft 开发的开源编程语言，是 JavaScript 的超集，添加了可选的静态类型和基于类的面向对象编程。TypeScript 由 Anders Hejlsberg（C# 之父）于 2012 年创建，现已成为前端开发的主流语言之一。

### 核心特性

- **静态类型系统**：在编译时捕获类型错误，提高代码可靠性
- **类型推断**：智能推断变量类型，减少显式类型注解
- **接口和泛型**：强大的抽象能力，提升代码复用性
- **高级类型**：联合类型、交叉类型、条件类型等高级特性
- **IDE 支持**：出色的代码补全、重构和导航功能
- **渐进式采用**：可以逐步将 JavaScript 项目迁移到 TypeScript
- **编译到 JavaScript**：兼容所有 JavaScript 运行环境

### TypeScript vs JavaScript

| 特性 | TypeScript | JavaScript |
|------|-----------|-----------|
| 类型系统 | 静态类型 | 动态类型 |
| 编译时检查 | ✅ 支持 | ❌ 不支持 |
| 类型推断 | ✅ 强大 | ❌ 无 |
| 接口 | ✅ 支持 | ❌ 不支持 |
| 泛型 | ✅ 支持 | ❌ 不支持 |
| 枚举 | ✅ 支持 | ❌ 不支持 |
| 装饰器 | ✅ 支持 | 🔄 提案阶段 |
| 运行时 | 需编译 | 直接运行 |
| 学习曲线 | 较陡 | 平缓 |

### 工作流程

```
TypeScript 源码 (.ts)
      ↓
   编译器 (tsc)
      ↓
类型检查 + 转换
      ↓
JavaScript 代码 (.js)
      ↓
   运行时执行
```

## 安装与配置

### 安装

```bash
# npm
npm install typescript --save-dev

# pnpm
pnpm add typescript -D

# yarn
yarn add typescript -D

# 全局安装（可选，不推荐）
npm install -g typescript

# 验证安装
npx tsc --version
```

### Node.js 类型定义

```bash
# 安装 Node.js 类型定义
pnpm add @types/node -D

# 安装特定版本的 Node.js 类型
pnpm add @types/node@18 -D
```

### 初始化配置

```bash
# 生成默认 tsconfig.json
npx tsc --init

# 生成详细的配置文件（带注释）
npx tsc --init --pretty

# 指定配置文件
npx tsc --init --target ES2022 --module NodeNext
```

### 项目结构

```
my-project/
├── src/
│   ├── index.ts          # 入口文件
│   ├── app.ts
│   ├── utils/
│   │   ├── helper.ts
│   │   └── logger.ts
│   └── types/
│       ├── custom.d.ts   # 自定义类型声明
│       └── global.d.ts   # 全局类型声明
├── dist/                  # 编译输出目录
├── tsconfig.json          # TypeScript 配置
├── package.json
└── node_modules/
```

## tsconfig.json 详解

### 配置文件优先级

TypeScript 在命令行与编辑器中都会就近查找配置文件（编辑器会沿目录树向上找到最近的）：

1. `tsconfig.json`（当前目录）
2. `jsconfig.json`（当前目录）
3. 父级目录中的 `tsconfig.json` / `jsconfig.json`

### 完整配置详解

```json
{
  "compilerOptions": {
    /* ==================== 基础选项 ==================== */

    // 编译目标 JavaScript 版本
    // 可选：ES3, ES5, ES6/ES2015, ES2016-ES2023, ESNext
    "target": "ES2022",

    // 指定生成代码的模块系统
    // 可选：CommonJS, AMD, System, UMD, ES6/ES2015, ESNext, NodeNext, Node16
    "module": "NodeNext",

    // 指定库文件，包含运行环境的类型定义
    // 常见：ES2022, DOM, DOM.Iterable, ES2022.Promise, ES2022.String
    "lib": ["ES2022"],

    // 输出目录
    "outDir": "./dist",

    // 源码根目录
    "rootDir": "./src",

    // 输出文件路径（单文件输出）
    // "outFile": "./dist/bundle.js",

    // 是否生成编译后的 JavaScript 文件
    "noEmit": false,

    // 是否生成 source map 文件
    "sourceMap": true,

    // 是否生成声明文件 (.d.ts)
    "declaration": true,

    // 声明文件的 source map
    "declarationMap": true,

    // 生成声明文件的输出目录
    // "declarationDir": "./types",

    /* ==================== 严格类型检查选项 ==================== */

    // 启用所有严格类型检查选项
    "strict": true,

    // 禁止隐式 any 类型
    "noImplicitAny": true,

    // 严格的 null 检查
    "strictNullChecks": true,

    // 严格的函数类型检查
    "strictFunctionTypes": true,

    // 严格的 bind/call/apply 检查
    "strictBindCallApply": true,

    // 严格的属性初始化检查
    "strictPropertyInitialization": true,

    // 隐式 any 类型情况下也检查 this
    "noImplicitThis": true,

    // 将每个文件作为可独立转译的模块处理
    "isolatedModules": true,

    // 确保函数中所有代码路径都有返回值
    "noImplicitReturns": true,

    // 未使用的变量报错
    "noUnusedLocals": true,

    // 未使用的参数报错
    "noUnusedParameters": true,

    // 禁止 switch case 穿透（fallthrough）
    "noFallthroughCasesInSwitch": true,

    // 检查索引类型
    "noUncheckedIndexedAccess": true,

    /* ==================== 模块解析选项 ==================== */

    // 模块解析策略
    // 可选：node, classic, node16, nodenext
    "moduleResolution": "NodeNext",

    // 是否允许从没有默认导出的模块中导入
    "allowSyntheticDefaultImports": true,

    // ES 模块互操作性
    "esModuleInterop": true,

    // 保留 JSX 元素
    // 可选：preserve, react, react-native, react-jsx, react-jsxdev
    // "jsx": "react-jsx",

    // 是否解析 JSON 模块
    "resolveJsonModule": true,

    // 项目根目录
    "baseUrl": ".",

    // 路径别名映射
    "paths": {
      "@/*": ["src/*"],
      "@utils/*": ["src/utils/*"],
      "@types/*": ["src/types/*"]
    },

    // 根目录列表
    "rootDirs": ["src"],

    // 类型声明文件的根目录
    "typeRoots": ["./node_modules/@types", "./src/types"],

    // 指定需要包含的类型声明文件
    "types": ["node", "jest"],

    // 允许 UMD 全局变量的导入
    "allowUmdGlobalAccess": true,

    /* ==================== 其他选项 ==================== */

    // 跳过库文件的类型检查
    "skipLibCheck": true,

    // 强制文件名大小写一致
    "forceConsistentCasingInFileNames": true,

    // 移除注释
    "removeComments": false,

    // 禁止发出 JavaScript 文件（仅类型检查）
    // "emitDeclarationOnly": true,

    // 导入辅助函数
    "importHelpers": true,

    // 将每个文件作为单独的模块处理
    // "isolatedModules": true,

    // 允许编译 JavaScript 文件
    "allowJs": true,

    // 检查 JavaScript 文件中的类型
    "checkJs": true,

    // 检查 node_modules 下 JS 文件的最大深度（配合 allowJs）
    // "maxNodeModuleJsDepth": 1
  },

  /* ==================== 文件包含/排除 ==================== */

  // 包含的文件
  "include": ["src/**/*", "tests/**/*"],

  // 排除的文件
  "exclude": ["node_modules", "dist", "**/*.test.ts"],

  // 指定文件列表（优先级最高）
  // "files": ["src/index.ts"]
}
```

### 不同场景配置

#### Node.js 项目（CommonJS）

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

#### Node.js 项目（ES Modules）

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**注意**：需要在 `package.json` 中设置 `"type": "module"`

#### React 项目

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
```

#### 库开发

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "skipLibCheck": true,
    "importHelpers": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### 配置继承

#### extends 配置

```json
// tsconfig.base.json
{
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}

// tsconfig.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext"
  }
}
```

#### 多项目配置

```
project/
├── tsconfig.base.json      # 基础配置
├── tsconfig.json           # 主项目配置
├── packages/
│   ├── core/
│   │   └── tsconfig.json   # 继承基础配置
│   └── utils/
│       └── tsconfig.json   # 继承基础配置
└── tsconfig.project.json   # 项目引用配置
```

```json
// tsconfig.project.json
{
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/utils" }
  ]
}
```

## package.json 配置

### CommonJS 模块项目

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "build:watch": "tsc --watch",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "clean": "rm -rf dist",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0"
  }
}
```

### ES Modules 项目

```json
{
  "name": "my-project",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "default": "./dist/index.js"
    },
    "./utils": {
      "types": "./dist/utils/index.d.ts",
      "import": "./dist/utils/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node dist/index.js",
    "type-check": "tsc --noEmit"
  }
}
```

## 开发工具

### ts-node

直接运行 TypeScript 代码，无需预编译。

#### 安装

```bash
pnpm add ts-node -D
```

#### 使用

```bash
# 直接运行
npx ts-node src/index.ts

# 使用 ESM 模式
npx ts-node --esm src/index.ts

# 指定配置文件
npx ts-node --project tsconfig.node.json src/index.ts

# REPL 模式
npx ts-node
```

#### tsconfig 配置

```json
{
  "ts-node": {
    "compilerOptions": {
      "module": "CommonJS"
    },
    "transpileOnly": true,      // 仅转译，不进行类型检查
    "files": true,              // 加载 files、include、exclude
    "ignore": ["node_modules"],
    "require": ["tsconfig-paths/register"]  // 支持路径别名
  }
}
```

#### 性能优化

```bash
# 使用 transpileOnly 模式（跳过类型检查，更快）
npx ts-node --transpileOnly src/index.ts

# 使用 SWC 编译（更快）
pnpm add @swc/core @swc/helpers -D
npx ts-node --swc src/index.ts
```

### tsx

基于 esbuild 的快速 TypeScript 执行器。

#### 安装

```bash
pnpm add tsx -D
```

#### 使用

```bash
# 运行文件
npx tsx src/index.ts

# 监听模式
npx tsx watch src/index.ts

# 运行 ESM 文件
npx tsx src/index.mts

# 交互式 REPL
npx tsx

# 缓存模式
npx tsx --cache src/index.ts
```

#### package.json 脚本

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "tsx src/index.ts",
    "build": "tsc",
    "type-check": "tsc --noEmit"
  }
}
```

### nodemon + ts-node

开发时自动重启。

#### 安装

```bash
pnpm add nodemon ts-node -D
```

#### nodemon.json

```json
{
  "watch": ["src"],
  "ext": "ts,json",
  "ignore": ["src/**/*.spec.ts"],
  "exec": "ts-node src/index.ts"
}
```

#### package.json

```json
{
  "scripts": {
    "dev": "nodemon",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### 工具对比

| 工具 | 编译器 | 速度 | 类型检查 | ESM 支持 | 适用场景 |
|------|--------|------|---------|---------|---------|
| `ts-node` | tsc | 慢 | ✅ | ✅ | 开发、测试 |
| `ts-node + SWC` | SWC | 快 | ❌ | ✅ | 开发（快速） |
| `tsx` | esbuild | 很快 | ❌ | ✅ | 开发（最快） |
| `tsc` | tsc | 慢 | ✅ | ✅ | 生产构建 |

## 类型定义

### 安装第三方类型

```bash
# 带类型的包（推荐）
pnpm add express
# 类型已包含在包中

# DefinitelyTyped 类型定义
pnpm add lodash
pnpm add @types/lodash -D

# 测试框架类型
pnpm add jest @types/jest -D

# 开发工具类型
pnpm add eslint @types/eslint -D
```

### 查找类型定义

```bash
# 在 npm 上搜索类型包
npm search @types/包名

# 使用 TypeSearch
# https://microsoft.github.io/TypeSearch/
```

### 自定义类型声明文件

#### 基本结构

```typescript
// types/custom.d.ts

// 声明模块
declare module 'my-untyped-module' {
  export function doSomething(value: string): number
  export const version: string
  export interface Config {
    apiKey: string
    timeout?: number
  }
  export default function init(config: Config): void
}

// 声明文件模块
declare module '*.json' {
  const value: any
  export default value
}

declare module '*.svg' {
  const content: string
  export default content
}

declare module '*.png' {
  const content: string
  export default content
}
```

#### 扩展全局类型

```typescript
// types/global.d.ts

// 扩展 NodeJS 全局变量
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      DATABASE_URL: string
      API_KEY: string
      PORT?: string
    }
  }

  // 扩展 Window
  interface Window {
    customConfig: {
      apiUrl: string
      version: string
    }
  }

  // 扩展 Array
  interface Array<T> {
    first(): T | undefined
    last(): T | undefined
  }
}

// 扩展模块
declare module 'express' {
  interface Request {
    user?: {
      id: string
      name: string
    }
  }
}

export {}  // 确保文件被视为模块
```

#### 类型声明最佳实践

```typescript
// types/utility.d.ts

// 工具类型
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P]
}

type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}

// 导出类型供使用
export type { DeepPartial, DeepRequired, DeepReadonly }
```

## 类型系统详解

### 基础类型

```typescript
// 基本类型
let str: string = 'hello'
let num: number = 123
let bool: boolean = true
let nullValue: null = null
let undefinedValue: undefined = undefined

// 数组
let arr: number[] = [1, 2, 3]
let arr2: Array<number> = [1, 2, 3]
let tuple: [string, number] = ['hello', 123]

// 对象
let obj: object = {}
let obj2: { name: string; age: number } = { name: 'John', age: 30 }

// 函数
let func: (x: number, y: number) => number = (x, y) => x + y

// any 和 unknown
let anyValue: any = 'anything'
let unknownValue: unknown = 'safe'

// void 和 never
function log(message: string): void {
  console.log(message)
}

function error(message: string): never {
  throw new Error(message)
}
```

### 接口

```typescript
// 基本接口
interface User {
  id: number
  name: string
  email: string
  age?: number  // 可选属性
  readonly createdAt: Date  // 只读属性
}

// 函数类型
interface SearchFunc {
  (source: string, subString: string): boolean
}

// 可索引类型
interface StringArray {
  [index: number]: string
}

interface StringMap {
  [key: string]: string
}

// 接口继承
interface Admin extends User {
  permissions: string[]
}

interface SuperAdmin extends Admin {
  level: number
}

// 多重继承
interface Manager extends User, Admin {
  department: string
}
```

### 类型别名

```typescript
// 基本类型别名
type ID = string | number
type Name = string
type Age = number

// 对象类型别名
type User = {
  id: ID
  name: Name
  age: Age
}

// 联合类型
type Status = 'pending' | 'approved' | 'rejected'
type Result = Success | Error

// 交叉类型
type Employee = User & {
  employeeId: string
  department: string
}

// 元组类型
type Point = [number, number]
type ThreeDCoordinate = [x: number, y: number, z: number]

// 模板字面量类型
type EventName = `on${Capitalize<string>}`  // 'onClick', 'onChange'...
type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'
type APIEndpoint = `/api/${string}`
```

### 泛型

```typescript
// 基本泛型
function identity<T>(arg: T): T {
  return arg
}

// 使用
let output = identity<string>('myString')
let output2 = identity('myString')  // 类型推断

// 泛型接口
interface GenericIdentity<T> {
  (arg: T): T
}

// 泛型类
class GenericNumber<T> {
  zeroValue: T
  add: (x: T, y: T) => T
}

// 泛型约束
interface Lengthwise {
  length: number
}

function logLength<T extends Lengthwise>(arg: T): T {
  console.log(arg.length)
  return arg
}

// 多类型参数
function pair<K, V>(key: K, value: V): [K, V] {
  return [key, value]
}

// 泛型默认值
interface ApiResponse<T = any> {
  data: T
  status: number
  message: string
}

// 条件类型
type NonNullable<T> = T extends null | undefined ? never : T
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any
type Parameters<T> = T extends (...args: infer P) => any ? P : never
```

### 高级类型

```typescript
// 联合类型
type StringOrNumber = string | number

// 交叉类型
type Employee = User & { employeeId: string }

// 类型守卫
function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function process(value: string | number) {
  if (isString(value)) {
    // value 是 string
    return value.toUpperCase()
  } else {
    // value 是 number
    return value.toFixed(2)
  }
}

// 可辨识联合
interface Success {
  status: 'success'
  data: string
}

interface Error {
  status: 'error'
  error: string
}

type Result = Success | Error

function handleResult(result: Result) {
  if (result.status === 'success') {
    console.log(result.data)
  } else {
    console.error(result.error)
  }
}

// 映射类型
type Readonly<T> = {
  readonly [P in keyof T]: T[P]
}

type Partial<T> = {
  [P in keyof T]?: T[P]
}

type Required<T> = {
  [P in keyof T]-?: T[P]
}

type Pick<T, K extends keyof T> = {
  [P in K]: T[P]
}

type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>

type Record<K extends keyof any, T> = {
  [P in K]: T
}

// 条件类型
type Exclude<T, U> = T extends U ? never : T
type Extract<T, U> = T extends U ? T : never
type NonNullable<T> = T extends null | undefined ? never : T
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : any
type InstanceType<T> = T extends new (...args: any[]) => infer R ? R : any

// 模板字面量类型（TypeScript 4.1+）
type EventName<T extends string> = `on${Capitalize<T>}`
type GetEventName = EventName<'click'>  // 'onClick'

type PropEventSource<T> = {
  [K in keyof T as `on${Capitalize<string & K>}Change`]: (newValue: T[K]) => void
}

interface User {
  name: string
  age: number
}

type UserEvents = PropEventSource<User>
// {
//   onNameChange: (newValue: string) => void
//   onAgeChange: (newValue: number) => void
// }
```

## 路径别名

### tsconfig.json 配置

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@utils/*": ["src/utils/*"],
      "@components/*": ["src/components/*"],
      "@types/*": ["src/types/*"],
      "@config": ["src/config/index"]
    }
  }
}
```

### 使用示例

```typescript
// 不使用别名
import { helper } from '../../../utils/helper'
import { User } from '../../../types/user'

// 使用别名
import { helper } from '@utils/helper'
import { User } from '@types/user'
import { config } from '@config'
```

### 运行时支持

#### 方式一：tsc-alias

```bash
pnpm add tsc-alias -D
```

```json
{
  "scripts": {
    "build": "tsc && tsc-alias"
  }
}
```

#### 方式二：tsconfig-paths

```bash
pnpm add tsconfig-paths -D
```

```typescript
// src/index.ts
import 'tsconfig-paths/register'

// 或者在使用 ts-node 时
npx ts-node -r tsconfig-paths/register src/index.ts
```

#### 方式三：module-alias

```bash
pnpm add module-alias
```

```json
// package.json
{
  "_moduleAliases": {
    "@": "dist",
    "@utils": "dist/utils"
  }
}
```

```typescript
// src/index.ts
import 'module-alias/register'
import { helper } from '@utils/helper'
```

## 与框架集成

### Express 集成

#### 安装

```bash
pnpm add express
pnpm add @types/express -D
```

#### 基础使用

```typescript
import express, { Request, Response, NextFunction, Application } from 'express'

const app: Application = express()

// 中间件
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 路由
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello TypeScript!' })
})

// 带参数的路由
app.get('/users/:id', (req: Request<{ id: string }>, res: Response) => {
  const { id } = req.params
  res.json({ userId: id })
})

// POST 请求
interface CreateUserBody {
  name: string
  email: string
  age?: number
}

app.post('/users', (req: Request<{}, {}, CreateUserBody>, res: Response) => {
  const { name, email, age } = req.body
  res.status(201).json({ name, email, age })
})

// 错误处理中间件
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message })
})

app.listen(3000, () => {
  console.log('Server running on port 3000')
})
```

#### 类型扩展

```typescript
// types/express.d.ts
declare module 'express' {
  interface Request {
    user?: {
      id: string
      name: string
      email: string
    }
  }
}

export {}
```

```typescript
// 使用扩展类型
import { Request, Response, NextFunction } from 'express'

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  req.user = { id: '1', name: 'John', email: 'john@example.com' }
  next()
}
```

### NestJS 集成

NestJS 原生支持 TypeScript。

#### 安装

```bash
npm install -g @nestjs/cli
nest new my-project
```

#### 控制器

```typescript
import { Controller, Get, Post, Body } from '@nestjs/common'

interface CreateUserDto {
  name: string
  email: string
}

@Controller('users')
export class UsersController {
  @Get()
  findAll(): string {
    return 'This action returns all users'
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return 'This action adds a new user'
  }
}
```

### Fastify 集成

#### 安装

```bash
pnpm add fastify
pnpm add @types/node -D
```

#### 使用

```typescript
import Fastify, { FastifyInstance, RouteShorthandOptions } from 'fastify'

const server: FastifyInstance = Fastify({})

const opts: RouteShorthandOptions = {
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          pong: { type: 'boolean' }
        }
      }
    }
  }
}

server.get('/ping', opts, async (request, reply) => {
  return { pong: true }
})

const start = async () => {
  try {
    await server.listen({ port: 3000 })
    console.log('Server running on port 3000')
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()
```

## 调试技巧

### VSCode 调试配置

#### launch.json

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug TypeScript",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "node",
      "runtimeArgs": ["--loader", "ts-node/esm"],
      "args": ["${workspaceFolder}/src/index.ts"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Current TS File",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "node",
      "runtimeArgs": ["--loader", "ts-node/esm"],
      "args": ["${file}"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    },
    {
      "name": "Debug Compiled JS",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/dist/index.js",
      "preLaunchTask": "npm: build",
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    }
  ]
}
```

#### tasks.json

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "build",
      "problemMatcher": ["$tsc"],
      "label": "npm: build"
    }
  ]
}
```

### 类型调试工具

```typescript
// 类型断言
const value = something as string

// 类型守卫
function isString(val: unknown): val is string {
  return typeof val === 'string'
}

// 类型推断调试
type Debug<T> = { [K in keyof T]: T[K] }

// 查看类型
type Result = Debug<SomeComplexType>

// never 类型检测
type NeverCheck = string extends number ? true : false  // false

// 类型断言函数
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error('Value is not a string')
  }
}
```

## 与 ESLint 集成

### 安装依赖

```bash
pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### ESLint 配置

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier'
  ],
  rules: {
    // TypeScript 规则
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-non-null-assertion': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',

    // 禁用与 TypeScript 冲突的规则
    'no-unused-vars': 'off'
  }
}
```

### package.json 脚本

```json
{
  "scripts": {
    "lint": "eslint src --ext .ts,.tsx",
    "lint:fix": "eslint src --ext .ts,.tsx --fix",
    "type-check": "tsc --noEmit",
    "build": "tsc"
  }
}
```

## 常见问题

### Q1: 如何调试 TypeScript 代码？

**A:** 配置 VSCode 调试：

1. 确保 `tsconfig.json` 中启用 `sourceMap: true`
2. 配置 `.vscode/launch.json`
3. 设置断点并按 F5 开始调试

**快速调试：**

```bash
# 使用 ts-node 直接调试
node --loader ts-node/esm --inspect src/index.ts

# 使用 tsx（透传 --inspect 给 Node）
npx tsx --inspect src/index.ts
```

### Q2: 编译后路径别名失效怎么办？

**A:** 使用以下方案之一：

**方案一：tsc-alias（推荐）**

```bash
pnpm add tsc-alias -D
```

```json
{
  "scripts": {
    "build": "tsc && tsc-alias"
  }
}
```

**方案二：tsconfig-paths**

```typescript
import 'tsconfig-paths/register'
```

**方案三：module-alias**

```json
{
  "_moduleAliases": {
    "@": "dist"
  }
}
```

```typescript
import 'module-alias/register'
```

### Q3: 如何处理第三方库没有类型定义？

**A:** 三种方案：

**方案一：安装 @types 包**

```bash
pnpm add @types/库名 -D
```

**方案二：创建声明文件**

```typescript
// types/库名.d.ts
declare module '库名' {
  export function someFunction(param: string): number
  export default function init(options: any): void
}
```

**方案三：使用 any（临时方案）**

```typescript
// @ts-ignore
import library from 'untyped-library'

// 或者
const library = require('untyped-library') as any
```

### Q4: 如何在 TypeScript 中使用 JavaScript 文件？

**A:** 配置 `allowJs` 选项：

```json
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true  // 可选，检查 JS 文件类型
  }
}
```

**JSDoc 注释：**

```javascript
// utils.js

/**
 * @param {string} name
 * @param {number} age
 * @returns {string}
 */
function formatUser(name, age) {
  return `${name} (${age})`
}

module.exports = { formatUser }
```

```typescript
// app.ts
import { formatUser } from './utils'

const result = formatUser('John', 30)  // 类型安全
```

### Q5: 如何解决 "Cannot find name" 错误？

**A:** 检查以下几点：

1. **确保安装了类型定义**

```bash
pnpm add @types/node -D
```

2. **配置 typeRoots**

```json
{
  "compilerOptions": {
    "typeRoots": ["./node_modules/@types", "./src/types"]
  }
}
```

3. **在 tsconfig.json 中包含类型文件**

```json
{
  "include": ["src/**/*", "types/**/*"]
}
```

4. **使用三斜线指令**

```typescript
/// <reference types="node" />
/// <reference path="./types/custom.d.ts" />
```

### Q6: 如何优化 TypeScript 编译速度？

**A:** 多种优化方案：

**方案一：使用增量编译**

```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./.tsbuildinfo"
  }
}
```

**方案二：跳过类型检查**

```json
{
  "compilerOptions": {
    "skipLibCheck": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}
```

**方案三：使用项目引用**

```json
// tsconfig.json
{
  "references": [
    { "path": "./src/core" },
    { "path": "./src/utils" }
  ],
  "compilerOptions": {
    "composite": true
  }
}
```

**方案四：使用更快的工具**

```bash
# 开发环境使用 tsx（基于 esbuild）
pnpm add tsx -D

# 生产环境使用 tsc
pnpm build
```

### Q7: 如何处理循环依赖？

**A:** 三种解决方案：

**方案一：重构代码结构**

```typescript
// ❌ 循环依赖
// a.ts
import { b } from './b'
export const a = { value: 1, ref: b }

// b.ts
import { a } from './a'
export const b = { value: 2, ref: a }

// ✅ 提取共享类型
// types.ts
export interface Shared {
  value: number
}

// a.ts
import type { Shared } from './types'
export const a: Shared = { value: 1 }
```

**方案二：使用 import type**

```typescript
import type { SomeType } from './module'

export function process(value: SomeType) {
  // ...
}
```

**方案三：延迟导入**

```typescript
export function getModule() {
  return import('./module')
}
```

### Q8: 如何在不同环境使用不同的 tsconfig？

**A:** 使用配置继承：

```
tsconfig.base.json       # 基础配置
tsconfig.json            # 开发环境
tsconfig.build.json      # 生产构建
tsconfig.test.json       # 测试环境
```

```json
// tsconfig.build.json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "declaration": true,
    "sourceMap": false,
    "removeComments": true
  },
  "exclude": ["**/*.test.ts", "**/*.spec.ts"]
}
```

```json
{
  "scripts": {
    "build": "tsc --project tsconfig.build.json"
  }
}
```

### Q9: 如何处理动态导入？

**A:** 使用动态导入语法：

```typescript
// 动态导入
async function loadModule() {
  const module = await import('./utils')
  return module.someFunction()
}

// 条件导入
if (condition) {
  const { feature } = await import('./features/feature')
  feature()
}

// 类型安全的动态导入
type ModuleType = typeof import('./utils')

async function getUtils(): Promise<ModuleType> {
  return import('./utils')
}
```

### Q10: 如何迁移现有 JavaScript 项目？

**A:** 渐进式迁移步骤：

**步骤一：初始化配置**

```bash
pnpm add typescript @types/node -D
npx tsc --init --allowJs
```

**步骤二：修改文件扩展名**

```bash
# 逐个文件重命名
mv src/index.js src/index.ts
```

**步骤三：添加类型注解**

```typescript
// 逐步添加类型
// function add(a, b) {  // ❌
function add(a: number, b: number): number {  // ✅
  return a + b
}
```

**步骤四：启用严格模式**

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

## 最佳实践

### 1. 严格模式配置

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 2. 类型设计原则

- **优先使用 interface**：可扩展、可继承
- **使用 type 做联合/交叉类型**：更灵活
- **避免 any**：使用 unknown 替代
- **使用字面量类型**：更精确的类型约束

```typescript
// ✅ 推荐
interface User {
  id: string
  name: string
  role: 'admin' | 'user' | 'guest'
}

type Status = 'pending' | 'approved' | 'rejected'

// ❌ 避免
interface User {
  id: any
  name: any
  role: string
}
```

### 3. 项目组织结构

```
src/
├── index.ts              # 入口文件
├── app.ts                # 应用配置
├── types/                # 类型定义
│   ├── index.ts
│   ├── user.d.ts
│   └── express.d.ts      # 模块扩展
├── utils/                # 工具函数
│   ├── index.ts
│   ├── logger.ts
│   └── validator.ts
├── services/             # 服务层
│   ├── index.ts
│   └── user.service.ts
├── models/               # 数据模型
│   ├── index.ts
│   └── user.model.ts
└── middlewares/          # 中间件
    ├── auth.ts
    └── error.ts
```

### 4. 类型导出规范

```typescript
// types/index.ts

// 导出类型
export type { User, Role, Status }

// 导出接口（在定义处 export，或使用 export type 再导出）
export type { ApiResponse }

// 导出常量
export const ROLES = ['admin', 'user', 'guest'] as const
export type Role = typeof ROLES[number]

// 导出泛型工具类型
export type { DeepPartial, DeepRequired }
```

### 5. 性能优化清单

- [ ] 启用 `incremental` 编译
- [ ] 使用 `skipLibCheck`
- [ ] 配置项目引用
- [ ] 使用 `import type` 减少编译输出
- [ ] 开发环境使用 `tsx` 或 `ts-node --transpileOnly`
- [ ] 生产环境使用 `tsc`
- [ ] 避免过度使用复杂类型
- [ ] 合理使用 `any`（仅在必要时）

## 参考资源

- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [TypeScript Playground](https://www.typescriptlang.org/play)
- [tsconfig.json 文档](https://www.typescriptlang.org/tsconfig)
- [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [Node.js TypeScript Guide](https://nodejs.org/en/learn/getting-started/nodejs-with-typescript)
