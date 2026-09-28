---
title: 脚手架 CLI：版本号获取与 NPM 包下载
description: 从 registry 获取最新版本、下载并解压模板包的实现细节
keywords: [Node.js, CLI, commander]
category: Node.js
tags: [Node.js, CLI工具开发]
---







# 脚手架 CLI：版本号获取与 NPM 包下载

## 版本更新记录

| 版本  | 日期       | 更新内容                           | 作者             |
| ----- | ---------- | ---------------------------------- | ---------------- |
| 2.0.0 | 2024-12-04 | 文档结构优化、内容完善、格式规范化 | AI Assistant     |
| 1.0.0 | 2024-XX-XX | 初始版本                           | QuarkGluonPlasma |

## 概述

本章节将详细介绍如何在脚手架 CLI 工具中实现 NPM 包的版本号获取和下载功能。这是实现 `create` 命令的关键步骤，需要从 NPM 仓库获取模板包并支持版本更新。

### 学习目标

- 掌握 NPM Registry API 的使用方法
- 学会封装版本号获取工具函数
- 理解 NPM 包下载和缓存机制
- 掌握使用 npminstall 进行包管理
- 学会发布工具包到 NPM 仓库

### 技术栈

- **运行时**: Node.js with ES Modules
- **包管理**: pnpm workspaces
- **HTTP 客户端**: axios
- **包安装**: npminstall
- **发布工具**: changeset
- **编程语言**: TypeScript

## 项目结构

在继续实现 `create` 命令之前，需要先创建一个工具包来封装 NPM 包相关的操作逻辑。

```bash
packages/
├── utils/                    # 工具包
│   ├── src/
│   │   ├── versionUtils.ts   # 版本号获取工具
│   │   ├── NpmPackage.ts     # NPM 包管理类
│   │   └── index.ts         # 导出模块
│   ├── package.json
│   └── tsconfig.json
├── cli/                     # CLI 主包
└── core/                    # 核心逻辑包
```

## 创建 Utils 包

### 1. 初始化包结构

首先创建 utils 包并初始化：

```bash
# 创建 utils 包目录
mkdir packages/utils
cd packages/utils

# 初始化 package.json
npm init -y
```

### 2. 配置 package.json

修改生成的 `package.json` 文件，添加必要的配置：

```json
{
  "name": "@guang-cli/utils",
  "version": "1.0.0",
  "description": "CLI 工具函数集合",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "publishConfig": {
    "access": "public"
  },
  "keywords": ["cli", "utils", "npm", "scaffold"]
}
```

**配置说明**：

- `"type": "module"`：启用 ES Modules 支持
- `"main"` 和 `"types"`：指定编译后的入口文件和类型声明文件
- `"publishConfig.access": "public"`：设置为公开包，允许发布到 NPM

### 3. 配置 TypeScript

初始化 TypeScript 配置：

```bash
# 使用 pnpm filter 在 utils 包内执行命令
pnpm --filter utils exec npx tsc --init
```

修改 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "outDir": "dist",
    "types": ["node"],
    "target": "es2016",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "sourceMap": true,
    "removeComments": false,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## 版本号获取工具

### 1. 安装依赖

安装 HTTP 请求和 URL 处理相关的依赖：

```bash
pnpm --filter utils add axios url-join
pnpm --filter utils add -D @types/node
```

### 2. 创建版本工具函数

创建 `src/versionUtils.ts` 文件：

```typescript
import axios from "axios"
import urlJoin from "url-join"

/**
 * 获取 NPM Registry 地址
 * @returns NPM Registry URL
 */
export function getNpmRegistry(): string {
  return "https://registry.npmmirror.com"
}

/**
 * 获取 NPM 包信息
 * @param packageName - 包名
 * @returns NPM 包信息对象
 * @throws 当请求失败时抛出错误
 */
export async function getNpmInfo(packageName: string): Promise<any> {
  const registry = getNpmRegistry()
  const url = urlJoin(registry, packageName)

  try {
    const response = await axios.get(url, {
      timeout: 10000, // 10秒超时
      headers: {
        "User-Agent": "@guang-cli/utils"
      }
    })

    if (response.status === 200) {
      return response.data
    }

    throw new Error(`Failed to fetch package info: ${response.status}`)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(`Network error: ${error.message}`)
    }
    throw error
  }
}

/**
 * 获取最新版本号
 * @param packageName - 包名
 * @returns 最新版本号
 */
export async function getLatestVersion(packageName: string): Promise<string> {
  const data = await getNpmInfo(packageName)

  if (!data["dist-tags"]?.latest) {
    throw new Error(`Package ${packageName} has no latest version`)
  }

  return data["dist-tags"].latest
}

/**
 * 获取所有版本号列表
 * @param packageName - 包名
 * @returns 版本号数组，按发布时间排序
 */
export async function getVersions(packageName: string): Promise<string[]> {
  const data = await getNpmInfo(packageName)

  if (!data.versions) {
    throw new Error(`Package ${packageName} has no versions`)
  }

  return Object.keys(data.versions)
}
```

### 3. 工具函数详解

#### getNpmRegistry

- **功能**: 返回 NPM 镜像源地址
- **默认值**: 使用淘宝 NPM 镜像 (`https://registry.npmmirror.com`)
- **优势**: 国内访问速度快，稳定性好

#### getNpmInfo(packageName)

- **功能**: 获取指定包的完整信息
- **参数**: `packageName` - NPM 包名
- **返回值**: 包含包所有信息的 JSON 对象
- **错误处理**: 网络错误、包不存在等情况都会抛出详细错误

#### getLatestVersion(packageName)

- **功能**: 获取包的最新版本号
- **数据来源**: 从 `dist-tags.latest` 字段获取
- **典型返回值**: `"1.2.3"`

#### getVersions(packageName)

- **功能**: 获取包的所有版本号
- **数据来源**: 从 `versions` 对象获取所有键
- **返回值**: 字符串数组，如 `["1.0.0", "1.1.0", "2.0.0"]`

### 4. 测试版本工具

创建测试文件 `src/test.ts`：

```typescript
import { getNpmInfo, getLatestVersion, getVersions } from "./versionUtils.js"

async function testVersionUtils() {
  console.log("🧪 测试版本工具函数...\n")

  try {
    // 测试获取包信息
    console.log("📦 获取 create-vite 包信息:")
    const info = await getNpmInfo("create-vite")
    console.log(`包名: ${info.name}`)
    console.log(`最新版本: ${info["dist-tags"]?.latest}`)
    console.log(`总版本数: ${Object.keys(info.versions || {}).length}`)

    console.log("\n🏷️ 获取最新版本:")
    const latestVersion = await getLatestVersion("create-vite")
    console.log(`create-vite 最新版本: ${latestVersion}`)

    console.log("\n📋 获取所有版本:")
    const versions = await getVersions("create-vite")
    console.log(`create-vite 最近 5 个版本: ${versions.slice(-5).join(", ")}`)
  } catch (error) {
    console.error("❌ 测试失败:", error instanceof Error ? error.message : error)
  }
}

testVersionUtils()
```

运行测试：

```bash
# 编译 TypeScript
pnpm --filter utils exec npx tsc

# 运行测试
pnpm --filter utils exec node ./dist/test.js
```

## NPM 包管理类

### 1. 安装额外依赖

安装文件系统操作相关的依赖：

```bash
pnpm --filter utils add fs-extra npminstall
pnpm --filter utils add -D @types/fs-extra
```

### 2. 创建 NPM 包管理类

创建 `src/NpmPackage.ts`：

```typescript
import fs from "node:fs"
import path from "node:path"
import fse from "fs-extra"
// @ts-ignore - npminstall 没有 TypeScript 类型定义
import npminstall from "npminstall"
import { getLatestVersion, getNpmRegistry } from "./versionUtils.js"

export interface NpmPackageOptions {
  name: string
  targetPath: string
}

/**
 * NPM 包管理类
 * 提供包的安装、更新、检查存在等功能
 */
export class NpmPackage {
  public readonly name: string
  public readonly targetPath: string
  public readonly storePath: string
  private version: string = ""

  constructor(options: NpmPackageOptions) {
    this.name = options.name
    this.targetPath = options.targetPath
    this.storePath = path.resolve(options.targetPath, "node_modules")
  }

  /**
   * 准备工作：创建目标目录，获取最新版本号
   */
  private async prepare(): Promise<void> {
    // 确保目标目录存在
    if (!fs.existsSync(this.targetPath)) {
      await fse.ensureDir(this.targetPath)
    }

    // 如果还没有版本号，获取最新版本
    if (!this.version) {
      this.version = await getLatestVersion(this.name)
    }
  }

  /**
   * 安装包
   * @returns 安装结果
   */
  async install(): Promise<any> {
    await this.prepare()

    return npminstall({
      pkgs: [
        {
          name: this.name,
          version: this.version
        }
      ],
      registry: getNpmRegistry(),
      root: this.targetPath,
      // 其他配置选项
      cacheDir: path.join(this.targetPath, ".npm_cache"),
      timeout: 60000 // 60秒超时
    })
  }

  /**
   * 获取包在本地存储的路径
   * 处理 @scope/package 格式的包名
   */
  get npmFilePath(): string {
    const packageName = this.name.replace("/", "+")
    return path.resolve(
      this.storePath,
      `.store/${packageName}@${this.version}/node_modules/${this.name}`
    )
  }

  /**
   * 检查包是否已安装
   * @returns 是否已安装
   */
  async exists(): Promise<boolean> {
    await this.prepare()
    return fs.existsSync(this.npmFilePath)
  }

  /**
   * 获取包的 package.json 内容
   * @returns package.json 对象，如果包不存在则返回 null
   */
  async getPackageJSON(): Promise<any | null> {
    if (await this.exists()) {
      const packageJsonPath = path.resolve(this.npmFilePath, "package.json")
      return await fse.readJson(packageJsonPath)
    }
    return null
  }

  /**
   * 获取最新版本号
   * @returns 最新版本号
   */
  async getLatestVersion(): Promise<string> {
    return getLatestVersion(this.name)
  }

  /**
   * 更新包到最新版本
   * @returns 更新结果
   */
  async update(): Promise<any> {
    const latestVersion = await this.getLatestVersion()

    // 如果已经是最新版本，不需要更新
    if (latestVersion === this.version) {
      return { updated: false, version: this.version }
    }

    this.version = latestVersion

    return npminstall({
      root: this.targetPath,
      registry: getNpmRegistry(),
      pkgs: [
        {
          name: this.name,
          version: latestVersion
        }
      ],
      cacheDir: path.join(this.targetPath, ".npm_cache"),
      timeout: 60000
    })
  }

  /**
   * 获取当前版本号
   * @returns 当前版本号
   */
  get currentVersion(): string {
    return this.version
  }
}

export default NpmPackage
```

### 3. 核心方法详解

#### constructor(options)

- **功能**: 初始化包管理实例
- **参数**:
  - `name`: NPM 包名
  - `targetPath`: 目标安装路径
- **内部逻辑**: 计算存储路径 `storePath`

#### prepare

- **功能**: 安装前的准备工作
- **操作**:
  - 创建目标目录（如果不存在）
  - 获取最新版本号（如果未设置）
- **错误处理**: 目录创建失败会抛出错误

#### install

- **功能**: 安装指定版本的包
- **返回值**: npminstall 的返回结果
- **配置**: 使用淘宝镜像源，设置超时时间

#### npmFilePath (getter)

- **功能**: 计算包在本地存储的完整路径
- **特殊处理**: 将包名中的 `/` 替换为 `+`（处理 scoped packages）
- **路径格式**: `.store/package@version/node_modules/package`

#### exists

- **功能**: 检查包是否已安装
- **返回值**: `boolean`
- **实现**: 检查 `npmFilePath` 是否存在

#### getPackageJSON

- **功能**: 读取包的 package.json 文件
- **返回值**: package.json 对象或 `null`
- **错误处理**: 文件读取失败会抛出错误

#### update

- **功能**: 更新包到最新版本
- **优化**: 如果已经是最新版本，直接返回无需更新
- **返回值**: npminstall 的返回结果

### 4. 测试 NPM 包管理

创建测试文件：

```typescript
import NpmPackage from "./NpmPackage.js"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function testNpmPackage() {
  console.log("🧪 测试 NPM 包管理类...\n")

  const testPath = path.join(__dirname, "../test-packages")

  // 测试 create-vite 包
  const pkg = new NpmPackage({
    targetPath: testPath,
    name: "create-vite"
  })

  try {
    // 检查包是否存在
    const exists = await pkg.exists()
    console.log(`📦 create-vite 已安装: ${exists}`)

    if (exists) {
      // 如果已安装，获取包信息
      const packageJson = await pkg.getPackageJSON()
      console.log(`当前版本: ${packageJson?.version}`)

      // 更新到最新版本
      console.log("🔄 更新到最新版本...")
      const updateResult = await pkg.update()
      console.log("更新完成")
    } else {
      // 如果未安装，进行安装
      console.log("📥 安装 create-vite...")
      await pkg.install()
      console.log("安装完成")
    }

    // 获取最新版本信息
    const latestVersion = await pkg.getLatestVersion()
    console.log(`最新版本: ${latestVersion}`)
  } catch (error) {
    console.error("❌ 测试失败:", error instanceof Error ? error.message : error)
  }
}

testNpmPackage()
```

## 模块导出

创建 `src/index.ts` 统一导出模块：

```typescript
/**
 * @guang-cli/utils - CLI 工具函数集合
 *
 * 提供以下功能：
 * - NPM 包版本号获取
 * - NPM 包安装和管理
 * - 包存在性检查
 * - 包更新功能
 */

import NpmPackage from "./NpmPackage.js"
import * as versionUtils from "./versionUtils.js"

export { NpmPackage, versionUtils }
export type { NpmPackageOptions } from "./NpmPackage.js"

// 默认导出
export default {
  NpmPackage,
  versionUtils
}
```

## 发布到 NPM

### 1. 代码提交

在发布之前，先提交本地代码：

```bash
# 添加所有更改
git add .

# 提交更改
git commit -m "feat(utils): 添加 NPM 包版本获取和下载功能"
```

### 2. 使用 Changeset 管理版本

#### 添加 Changeset

```bash
# 创建新的 changeset
npx changeset add
```

执行命令后，会进入交互式界面：

1. **选择要发布的包**：使用空格键选择 `@guang-cli/utils`
2. **选择版本更新类型**：
   - `patch`: 修复 Bug，版本号第三位 +1
   - `minor`: 新增功能，版本号第二位 +1
   - `major`: 破坏性更新，版本号第一位 +1
3. **填写变更描述**：简要描述这次更新的内容

#### 生成版本和更新日志

```bash
# 根据 changeset 生成新版本号和更新日志
npx changeset version
```

这个命令会：

- 更新 `package.json` 中的版本号
- 生成 `CHANGELOG.md` 文件
- 删除 `.changeset` 目录下的临时文件

#### 发布到 NPM

```bash
# 构建项目
pnpm --filter utils build

# 发布到 NPM
npx changeset publish
```

发布成功后，changeset 会自动：

- 给当前 commit 打 tag，并推送 tag 到远程仓库（如果配置了 git remote）
- 发布包到 NPM 仓库

### 3. 验证发布

发布完成后，可以通过以下方式验证：

1. **查看 NPM 网站**：访问 [npmjs.com](https://www.npmjs.com/) 查看包是否发布成功
2. **本地安装测试**：
   ```bash
   npm install @guang-cli/utils
   ```
3. **查看版本信息**：
   ```bash
   npm view @guang-cli/utils
   ```

## 最佳实践

### 1. 错误处理

- 所有异步操作都使用 try-catch 包裹
- 提供详细的错误信息，便于调试
- 区分网络错误、文件系统错误等不同类型

### 2. 性能优化

- 设置合理的超时时间（10-60 秒）
- 使用缓存目录避免重复下载
- 检查包是否存在后再执行安装操作

### 3. 代码质量

- 使用 TypeScript 提供类型安全
- 添加详细的 JSDoc 注释
- 遵循单一职责原则，每个函数只做一件事

### 4. 版本管理

- 使用 changeset 管理版本变更
- 遵循语义化版本规范（SemVer）
- 维护详细的更新日志

## 常见问题

### Q: 为什么使用 npminstall 而不是 npm?

A: npminstall 是淘宝团队开发的 NPM 包安装工具，具有以下优势：

- 安装速度更快，支持并行下载
- 更好的缓存机制
- 更适合在程序中调用
- 对国内网络环境更友好

### Q: 如何处理 scoped packages（@scope/package）？

A: 在计算文件路径时，需要将包名中的 `/` 替换为 `+`，例如：

- `@babel/core` → `@babel+core`
- 路径格式：`.store/@babel+core@7.0.0/node_modules/@babel/core`

### Q: 安装失败如何处理？

A: 建议的处理流程：

1. 检查网络连接和镜像源可用性
2. 验证包名是否正确
3. 检查目标目录的写入权限
4. 清理缓存后重试
5. 提供详细的错误信息给用户

## 下一步

完成 NPM 包版本获取和下载功能后，可以继续实现：

1. **create 命令**：使用 utils 包下载项目模板
2. **模板解析**：解析下载的模板包结构
3. **项目生成**：根据模板生成新项目
4. **依赖安装**：自动安装项目依赖

## 总结

本章节完成了以下工作：

✅ **创建了 utils 工具包**，封装了 NPM 包相关的操作

✅ **实现了版本号获取功能**，包括：

- 获取包信息
- 获取最新版本号
- 获取所有版本列表

✅ **开发了 NPM 包管理类**，支持：

- 包的安装和更新
- 包存在性检查
- package.json 读取
- 缓存管理

✅ **发布了工具包到 NPM**，使用 changeset 进行版本管理

这些功能为后续实现 `create` 命令奠定了基础，使得脚手架工具能够从 NPM 仓库下载模板包并管理版本更新。

## 相关资源

- [NPM Registry API 文档](https://github.com/npm/registry/blob/master/docs/REGISTRY-API.md)
- [npminstall 文档](https://github.com/cnpm/npminstall)
- [changeset 文档](https://github.com/changesets/changesets)
- [淘宝 NPM 镜像](https://npmmirror.com/)
