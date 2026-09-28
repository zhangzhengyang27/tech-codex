---
title: 手写 create-vite：从零到一打造自己的脚手架
description: 从模板拉取、变量替换到依赖安装的脚手架最小实现，剖析 create-vite 原理
keywords: [Node.js, CLI, commander, create-vite]
category: Node.js
tags: [Node.js, CLI工具开发]
---







# 手写 create-vite：从零到一打造自己的脚手架

## 1. 引言

### 1.1 `create-vite` 简介

`create-vite` 是 Vite 官方提供的项目脚手架工具，能够帮助快速生成基于 Vite 的前端项目。通过简单的命令行交互，就可以选择不同的框架（如 React, Vue）和语言（如 TypeScript, JavaScript），从而在几秒钟内搭建好一个可运行的开发环境。


### 1.2 为什么要手写一个 `create-vite`？

作为前端开发者，每天都在使用各种 CLI 工具，但很少有人深入了解它们的工作原理。通过亲手实现一个简化版的 `create-vite`，不仅能深入理解脚手架的内部机制，还能学到如何：

- **解析命令行参数**：处理用户通过终端传入的 `flags` 和 `options`。
- **构建交互式界面**：在终端中通过提问和选择，引导用户完成配置。
- **动态生成文件**：根据用户选择，从预设的模板中复制并生成项目文件。
- **组织和管理项目结构**：学习如何设计一个可扩展、可维护的 CLI 工具。

### 1.3 本文目标

本文将带你从零开始，一步步实现一个功能完备的 `create-vite`。最终，你将得到一个与官方工具体验类似的 CLI，并掌握开发 Node.js 命令行应用的核心技能。

---

## 2. 项目初始化与环境搭建

在开始编码之前，需要先搭建好项目的基础环境。

### 2.1 创建项目目录

首先，创建一个项目文件夹并进入该目录。

```bash
mkdir my-create-vite
cd my-create-vite
npm init -y
```

`npm init -y` 会生成一个默认的 `package.json` 文件。

### 2.2 安装核心依赖

我们的 CLI 工具需要依赖以下几个核心库：

- `minimist`: 一个轻量级的命令行参数解析库。
- `prompts`: 一个功能强大且美观的交互式命令行提问库。
- `chalk`: 用于在终端中输出带颜色的文本，提升用户体验。

执行以下命令来安装它们：

```bash
npm install --save minimist prompts chalk
```

### 2.3 配置 TypeScript 环境

为了代码的健壮性和可维护性，将使用 TypeScript 进行开发。

**1. 安装 TypeScript 及相关类型定义：**

```bash
npm install --save-dev typescript @types/node @types/minimist @types/prompts
```

**2. 生成 `tsconfig.json` 文件：**

```bash
npx tsc --init
```

**3. 修改 `tsconfig.json` 配置：**

为了使其适用于 Node.js ES Module 项目，需要对默认配置进行一些调整。

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "exclude": ["template-**"]
}
```

**关键配置说明：**

- `"module": "NodeNext"` 和 `"moduleResolution": "NodeNext"`: 这是在现代 Node.js 项目中使用 ES Module 的关键。
- `"outDir": "dist"`: 指定 TypeScript 编译后的 JavaScript 文件输出目录。
- `"exclude": ["template-**"]`: 排除所有 `template-` 前缀的文件夹，因为这些是我们的项目模板，不需要被编译。

### 2.4 启用 ES Module

为了使用 `import/export` 语法，需要在 `package.json` 中声明项目类型为 `module`。

```json
{
  ...
  "type": "module",
  ...
}
```

至此，我们的项目基础环境已经搭建完毕。接下来，将开始编写核心的命令行解析逻辑。

---

## 3. 命令行参数解析

命令行参数是用户与 CLI 工具交互的第一入口。将使用 `minimist` 来解析这些参数。

### 3.1 创建入口文件

在 `src` 目录下创建一个 `index.ts` 文件，这是 CLI 的主入口。

```typescript
// src/index.ts
import minimist from "minimist"

const argv = minimist(process.argv.slice(2))

console.log(argv)
```

`process.argv.slice(2)` 用于获取用户在命令行中输入的所有参数（排除了 `node` 和脚本路径）。

### 3.2 实现参数解析与 `--help`

一个好的 CLI 工具应该提供详细的帮助信息。来扩展 `index.ts` 以支持 `--help` 和 `--template` 参数。

```typescript
// src/index.ts
import minimist from "minimist"
import chalk from "chalk"

// 定义帮助信息
const helpMessage = `
Usage: create-vite [OPTION]... [DIRECTORY]

Create a new Vite project in JavaScript or TypeScript.
With no arguments, start the CLI in interactive mode.

Options:
  -t, --template NAME        use a specific template

Available templates:
${chalk.yellow("vanilla-ts     vanilla")}
${chalk.green("vue-ts         vue")}
${chalk.cyan("react-ts       react")}
${chalk.cyan("react-swc-ts   react-swc")}
${chalk.magenta("preact-ts      preact")}
${chalk.redBright("lit-ts         lit")}
${chalk.red("svelte-ts      svelte")}
${chalk.blue("solid-ts       solid")}
${chalk.blueBright("qwik-ts        qwik")}
`

async function init() {
  const argv = minimist<{
    template?: string
    help?: boolean
  }>(process.argv.slice(2), {
    alias: { h: "help", t: "template" },
    string: ["_"] // 确保位置参数被解析为字符串
  })

  if (argv.help) {
    console.log(helpMessage)
    return
  }

  // ... 后续逻辑
}

init().catch((e) => {
  console.error(e)
})
```

**代码解析：**

- 为 `minimist` 提供了泛型类型，使其能正确推断 `argv` 的类型。
- `alias` 选项为 `--help` 和 `--template` 设置了简写 `-h` 和 `-t`。
- `string: ['_']` 确保了像 `my-project` 这样的位置参数被当作字符串处理，而不是数字。
- 如果用户传入了 `--help` 或 `-h`，则打印帮助信息并退出。

### 3.3 处理目标目录参数

用户可以通过 `create-vite my-app` 的形式指定项目目录。需要一个函数来格式化这个目录名，并提供一个默认值。

```typescript
// 在 init 函数上方添加
function formatTargetDir(targetDir: string | undefined) {
  return targetDir?.trim().replace(/\/+$/g, "")
}

const defaultTargetDir = "vite-project"

// 在 init 函数内部
async function init() {
  // ... argv 解析之后

  const argTargetDir = formatTargetDir(argv._[0])
  const argTemplate = argv.template || argv.t

  let targetDir = argTargetDir || defaultTargetDir
  console.log(`Scaffolding project in: ${targetDir}`)
}
```

`formatTargetDir` 函数会移除目录名末尾的斜杠，确保路径处理的一致性。

---

## 4. 交互式命令行界面

当用户没有通过参数直接指定所有选项时，需要一个交互式的界面来引导他们完成选择。

### 4.1 提问：项目名称

如果用户没有在命令行中提供项目目录，就提问项目名称。

```typescript
// src/index.ts
import prompts from "prompts"
// ...

async function init() {
  // ...

  let result: prompts.Answers<"projectName">

  try {
    result = await prompts(
      [
        {
          type: argTargetDir ? null : "text",
          name: "projectName",
          message: chalk.reset("Project name:"),
          initial: defaultTargetDir,
          onState: (state) => {
            targetDir = formatTargetDir(state.value) || defaultTargetDir
          }
        }
      ],
      {
        onCancel: () => {
          throw new Error(chalk.red("✖") + " Operation cancelled")
        }
      }
    )
  } catch (cancelled: any) {
    console.log(cancelled.message)
    return
  }

  const { projectName } = result
  // ...
}
```

**代码解析：**

- `type: argTargetDir ? null : 'text'`: 这是一个动态类型。如果 `argTargetDir` 存在，`type` 为 `null`，`prompts` 会跳过这个问题。
- `onState`: 当用户输入时，这个回调会实时更新 `targetDir` 变量。
- `onCancel`: 如果用户按下 `Ctrl+C` 取消操作，会捕获异常并优雅地退出。

### 4.2 提问：选择框架与变体

接下来，需要让用户选择框架（如 Vue, React）和变体（如 TypeScript, JavaScript）。为此，先设计一个配置来管理所有可用的模板。

---

## 5. 模版引擎设计

为了能够动态地展示选项并根据用户的选择找到对应的模板，需要一个良好设计的数据结构来管理所有模板信息。

### 5.1 设计模板数据结构

将定义 `Framework` 和 `FrameworkVariant` 两个类型，用于描述框架和其下的不同变体（例如，React 下有 `react-ts` 和 `react-js`）。

```typescript
// src/index.ts

type Framework = {
  name: string
  display: string
  color: (str: string | number) => string
  variants: FrameworkVariant[]
}

type FrameworkVariant = {
  name: string
  display: string
  color: (str: string | number) => string
  customCommand?: string
}
```

### 5.2 创建模板配置文件

基于以上类型，创建一个 `FRAMEWORKS` 数组来存放所有支持的框架和变体。

```typescript
// src/index.ts

const FRAMEWORKS: Framework[] = [
  {
    name: "vue",
    display: "Vue",
    color: chalk.green,
    variants: [
      {
        name: "vue-ts",
        display: "TypeScript",
        color: chalk.blue
      },
      {
        name: "vue",
        display: "JavaScript",
        color: chalk.yellow
      }
    ]
  },
  {
    name: "react",
    display: "React",
    color: chalk.cyan,
    variants: [
      {
        name: "react-ts",
        display: "TypeScript",
        color: chalk.blue
      },
      {
        name: "react-swc-ts",
        display: "TypeScript + SWC",
        color: chalk.blue
      },
      {
        name: "react",
        display: "JavaScript",
        color: chalk.yellow
      },
      {
        name: "react-swc",
        display: "JavaScript + SWC",
        color: chalk.yellow
      }
    ]
  }
]

// 从 FRAMEWORKS 派生出所有模板名称
const TEMPLATES = FRAMEWORKS.map(
  (f) => (f.variants && f.variants.map((v) => v.name)) || [f.name]
).reduce((a, b) => a.concat(b), [])
```

### 5.3 在交互式提问中使用配置

现在，可以使用 `FRAMEWORKS` 配置来动态生成 `prompts` 的问题选项。

```typescript
// src/index.ts -> in init() -> inside prompts array

// ... after projectName question
{
    type: argTemplate && TEMPLATES.includes(argTemplate) ? null : 'select',
    name: 'framework',
    message: chalk.reset('Select a framework:'),
    initial: 0,
    choices: FRAMEWORKS.map((framework) => {
        const frameworkColor = framework.color;
        return {
            title: frameworkColor(framework.display || framework.name),
            value: framework,
        };
    }),
},
{
    type: (framework: Framework) =>
        framework && framework.variants ? 'select' : null,
    name: 'variant',
    message: chalk.reset('Select a variant:'),
    choices: (framework: Framework) =>
        framework.variants.map((variant) => {
            const variantColor = variant.color;
            return {
                title: variantColor(variant.display || variant.name),
                value: variant.name,
            };
        }),
},
```

**代码解析：**

- **框架选择**：`choices` 通过遍历 `FRAMEWORKS` 数组生成，`title` 显示带颜色的框架名称，`value` 则是整个 `framework` 对象。
- **变体选择**：这是一个依赖于上一个答案的动态问题。`type` 是一个函数，只有当用户选择的框架包含 `variants` 时，这个问题才会被提出。

---

## 6. 核心功能：文件生成

当收集完所有用户输入后，就进入了最核心的环节：根据模板创建项目文件。

### 6.1 准备模板文件

首先，需要将 `create-vite` 的官方模板文件复制到我们的项目中。你可以从 Vite 的 GitHub 仓库下载，或者通过 `npm install create-vite` 后从 `node_modules` 中拷贝。

将模板文件夹（如 `template-react-ts`, `template-vue` 等）放置在项目的根目录下。

### 6.2 实现文件复制逻辑

需要一个函数来递归地复制模板目录到用户指定的目标目录。

```typescript
// src/index.ts
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

function copy(src: string, dest: string) {
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    copyDir(src, dest)
  } else {
    fs.copyFileSync(src, dest)
  }
}

function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  }
}
```

### 6.3 整合文件生成步骤

现在，在 `init` 函数的末尾来调用文件复制逻辑。

```typescript
// src/index.ts -> in init()

// ... after prompts
const { framework, variant } = result

const root = path.join(process.cwd(), targetDir)

if (fs.existsSync(root)) {
  // 如果目录已存在，可以添加逻辑提示用户
}

console.log(`\nScaffolding project in ${root}...`)

const template: string = variant || framework?.name || argTemplate

const templateDir = path.resolve(
  fileURLToPath(import.meta.url),
  "../..",
  `template-${template}`
)

const write = (file: string, content?: string) => {
  const targetPath = path.join(root, file)
  if (content) {
    fs.writeFileSync(targetPath, content)
  } else {
    copy(path.join(templateDir, file), targetPath)
  }
}

const files = fs.readdirSync(templateDir)
for (const file of files.filter((f) => f !== "package.json")) {
  write(file)
}

// 单独处理 package.json
const pkg = JSON.parse(
  fs.readFileSync(path.join(templateDir, `package.json`), "utf-8")
)
pkg.name = path.basename(root)
write("package.json", JSON.stringify(pkg, null, 2))

console.log(`\nDone. Now run:\n`)
console.log(`  cd ${targetDir}`)
console.log(`  npm install`)
console.log(`  npm run dev`);
```

**代码解析：**

- `templateDir` 的路径是通过 `import.meta.url` 计算得出的，这使得它在编译后也能正确找到模板目录。
- 遍历模板目录中的所有文件，并通过 `write` 函数将它们复制到目标目录。
- `package.json` 是一个特例。不能直接复制，而是需要读取它，修改其中的 `name` 字段为用户的项目名称，然后再写入目标目录。
- 最后，打印出后续操作的指引，引导用户进入项目并启动开发服务器。

---

## 7. 整合与测试

现在，我们的 `my-create-vite` 工具已经基本完成了。是时候对它进行一次完整的端到端测试了。

### 7.1 编译代码

首先，在 `package.json` 中添加一个 `build` 脚本：

```json
"scripts": {
  "build": "tsc"
}
```

然后运行编译命令：

```bash
npm run build
```

这会将 `src/index.ts` 编译到 `dist/index.js`。

### 7.2 本地测试

为了方便测试，可以使用 `npm link` 将本地的包链接到全局，这样就可以像真正的 CLI 工具一样使用它了。

**1. 在 `package.json` 中添加 `bin` 字段：**

```json
{
  "name": "my-create-vite",
  "version": "1.0.0",
  "bin": {
    "my-create-vite": "dist/index.js"
  },
  ...
}
```

这个字段告诉 npm，当这个包被安装时，需要创建一个名为 `my-create-vite` 的可执行命令，它指向 `dist/index.js`。

**2. 运行 `npm link`:**

```bash
npm link
```

现在，你可以在任何目录下运行 `my-create-vite` 命令了。

### 7.3 端到端测试

尝试用自己的工具创建一个新项目：

```bash
my-create-vite my-test-app --template react-ts
```

或者进入交互模式：

```bash
my-create-vite
```


如果一切顺利，项目将被成功创建。进入项目目录，安装依赖并启动开发服务器，验证项目是否能正常运行。

---

## 8. 总结与展望

通过本次实战，从零到一实现了一个功能虽简但五脏俱全的 `create-vite` 脚手架。回顾一下核心技术点：

- **`minimist`** 用于轻量级命令行参数解析。
- **`prompts`** 用于构建优雅的交互式提问界面。
- **`chalk`** 用于美化终端输出。
- **Node.js `fs` 和 `path` 模块** 用于核心的文件系统操作。
- **ES Module in Node.js** 的现代化配置与实践。

未来，你还可以基于当前版本进行功能扩展，例如：

- **支持更多模板**：轻松扩展 `FRAMEWORKS` 配置即可。
- **更智能的 `package.json` 处理**：例如，合并依赖而不是直接覆盖。
- **发布到 npm**：让全世界的开发者都能使用你的工具。

---

## 9. 附录

### 9.1 常见问题解答 (FAQ)

**Q: 为什么选择 `minimist` 而不是 `commander`？**

A: `create-vite` 的参数结构非常简单（只有 `--template` 和一个可选的目录参数），使用 `minimist` 更加轻量、直接。对于更复杂的 CLI，`commander` 提供了更完善的功能（如自动生成帮助信息、子命令等）。

**Q: `import.meta.url` 是什么？**

A: 在 ES Module 中，`__dirname` 和 `__filename` 这类 CommonJS 变量是不可用的。`import.meta.url` 提供了当前模块的 URL，结合 `fileURLToPath` 可以获取当前文件的绝对路径，这对于定位模板文件至关重要。

### 9.2 调试技巧

- 在 `init` 函数的 `catch` 块中打印完整的错误对象 `console.error(e)`，而不是仅仅 `e.message`，可以获得更详细的堆栈信息。
- 在文件操作部分，多使用 `console.log` 打印路径（如 `root`, `templateDir`, `targetPath`），确保路径拼接的正确性。

### 9.3 参考资料

- [Vite 官方仓库](https://github.com/vitejs/vite)
- [prompts - npm](https://www.npmjs.com/package/prompts)
- [minimist - npm](https://www.npmjs.com/package/minimist)
