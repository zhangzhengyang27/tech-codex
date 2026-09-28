---
title: CLI
description: Node.js 构建命令行工具的整体图景：标准输入/输出、退出码、子进程与生态选型
keywords: [Node.js, CLI, commander]
category: Node.js
tags: [Node.js, CLI工具开发]
---







# CLI

## Node.js 工具链

创建项目的脚手架（`create-react-app`、 `create-vite`）、编译和打包代码的构建工具（`webpack`、`esbuild`）、保证代码质量的格式化与检查工具（`prettier`, `eslint`），以及管理 Node.js 版本的工具（`nvm`、 `n`）等等

这些工具共同构成强大的 **Node.js 工具链 (Toolchain)**，它贯穿于现代前端开发的整个生命周期

**开发提效工具，就是一个绝佳的突破口。**

- **场景一：自动化代码生成**

  基于后端的 Swagger 或 OpenAPI 文档自动读取 `swagger.json`，一键生成所有类型和请求代码

- **场景二：简化复杂流程**：构建一个 CLI 工具

### 简单脚本示例

示例：批量给文件名添加前缀的脚本

> 假设 `src/pages` 目录下有 `home.js`、`about.js`、 `contact.js` 等文件，希望将它们重命名为 `page-home.js`, `page-about.js` 等
>

```javascript
// rename.js
import fs from "node:fs/promises"
import path from "node:path"

const targetDir = "src/pages"
const prefix = "page-"

try {
  const files = await fs.readdir(targetDir)

  for (const file of files) {
    const oldPath = path.join(targetDir, file)
    const newPath = path.join(targetDir, `${prefix}${file}`)

    await fs.rename(oldPath, newPath)
    console.log(`Renamed: ${oldPath} -> ${newPath}`)
  }

  console.log("批量重命名完成！")
} catch (err) {
  console.error("出现错误:", err)
}
```

在 `package.json` 中配置 `"type": "module"` 后，只需在终端运行 `node rename.js`，任务瞬间完成。这就是 Node.js 提效工具最直观的魅力。

### node 工具的优势

1.  **生态系统优势**: Node.js 拥有全球最大的开源软件注册表 npm
2.  **开发效率**: 对于绝大多数前端工具场景（如自动化脚本、脚手架、代码生成器），Node.js 的性能绰绰有余
3.  **现实趋势**: 像 `swc` (Rust) 和 `esbuild` (Go) 这类对性能要求极致的编译/构建工具正在用编译型语言重写。但它们依然通过 Node.js 暴露配置和插件 API，整个工具生态仍然是构建在 Node.js 之上的。平时编写的绝大多数提效工具，远未达到需要用 Rust/Go 的性能瓶颈

### 收获

会深入学习开发 Node.js 工具时常用的核心包，并探究其实现原理，然后基于它们构建各种实用工具

- **CLI 系统监控仪表盘**: 学习如何利用终端特性构建一个动态更新的、信息丰富的监控面板
- **交互式脚手架**: 像 `create-vite` 一样，从零开始实现一个完整的、支持模板选择和交互式问答的项目创建工具
- **Monorepo 工程化实践**: 掌握 `pnpm workspace + changeset` 这一业界最佳实践，完成从 npm 包开发、版本管理到发布的全流程
- **AST 与编译技术**: 学习抽象语法树（AST），并基于它实现自动国际化、代码重构等强大的 CLI 工具
- **Git 的 Node.js 实现**: 为了深入理解 Git 的原理，会用 Node.js 实现一个兼容部分核心 `git` 命令的工具，一举两得

通过大量的实战，你将建立起对 Node.js 工具开发的深刻理解，并获得随心所欲地构建工具来解决实际问题的能力

### 最佳实践建议

当构建自己的第一个工具时，请牢记以下几点：

1.  **明确工具边界**: 专注于解决一个核心问题，并把它做好
2.  **提供清晰的帮助信息**: 好的 CLI 工具都应该有 `-h` 或 `--help` 标志，清晰地告诉用户如何使用
3.  **考虑跨平台兼容性**: 尽量使用 `path` 模块处理路径，避免硬编码 `\` 或 `/`。在执行 shell 命令时，注意 Windows 和 macOS/Linux 的差异
4.  **健壮的错误处理**: 为用户提供清晰、有用的错误信息，并使用 `process.exit(1)` 来表示命令执行失败
5.  **拥抱异步**: 对于文件读写等 I/O 密集型任务，多使用 `async/await`，避免阻塞事件循环

### 参考资料

- **[Node.js 官方文档](https://nodejs.org/docs/latest/api/)**: 你最可靠的信息来源
- **[Commander.js](https://github.com/tj/commander.js)**: 功能强大、社区活跃的 CLI 开发框架
- **[Inquirer.js](https://github.com/SBoudrias/Inquirer.js)**: 创建美观、强大的交互式命令行的不二之选
- **[Chalk](https://github.com/chalk/chalk)**: 让你的终端输出多姿多彩
- **[Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)**: 来自社区的 Node.js 最佳实践大全

## ANSI

在图形用户界面（GUI）普及之前，终端是人机交互的主要窗口。为了在纯文本环境中实现更丰富的表现力（如定位光标、修改文本颜色），美国国家标准协会（ANSI）制定了一套标准。定义一系列特殊的字符序列，当终端接收到这些序列时，不会将它们直接显示出来，而是会将其解释为**指令**并执行，从而实现对显示效果的控制

### 控制序列格式

大多数 ANSI 转义序列都以一个 `ESC` 字符（ASCII 码为 27，在 JavaScript 字符串中表示为 `\u001B`）开头。其中最常用的是**控制序列导入器 (Control Sequence Introducer, CSI)**，其格式如下：

`\u001B[` + `(若干参数，以分号;分隔)` + `指令字符`

| 指令 | 名称                       | 功能描述                             |
| :--- | :------------------------- | :----------------------------------- |
| `H`  | `Cursor Position`          | 移动光标到指定行和列                 |
| `A`  | `Cursor Up`                | 光标向上移动 N 行                    |
| `B`  | `Cursor Down`              | 光标向下移动 N 行                    |
| `C`  | `Cursor Forward`           | 光标向前移动 N 列                    |
| `D`  | `Cursor Back`              | 光标向后移动 N 列                    |
| `J`  | `Erase in Display`         | 清除屏幕的部分内容                   |
| `K`  | `Erase in Line`            | 清除行内的部分内容                   |
| `m`  | `Select Graphic Rendition` | 设置文本样式（如颜色、粗体、下划线） |

### 光标控制

可以通过拼接对应的控制字符来实现光标的移动和内容的擦除

#### 原生方法

尝试用原生 ANSI code 清除从光标到行首的内容 (`\u001B[1K`)：

```javascript
// index.js
console.log("123456\u001B[1K789")
```

运行 `node index.js`，你会看到 `123456` 被清除了，只剩下 `789`

#### 使用 `readline` 模块

Node.js 内置的 `readline` 模块对一些常用的光标操作进行了封装，使用起来更方便。例如：Vite 启动时清屏的效果就是这样实现的：

> `console.log` = `process.stdout.write` + `\n`。在需要精确光标定位时，请使用后者

```javascript
// clearScreen.js
import readline from "node:readline"

// 1. 打印足够多的换行，将旧内容推到屏幕上方
const blank = "\n".repeat(process.stdout.rows)
console.log(blank)

// 2. 移动光标到屏幕左上角 (0, 0)
readline.cursorTo(process.stdout, 0, 0)

// 3. 清除从光标位置到屏幕末尾的所有内容
readline.clearScreenDown(process.stdout)

console.log("Vite is ready!")
```

#### 使用 `ansi-escapes` 库

对于更复杂的光标操作，社区提供了功能更全面的库，如周下载量数千万的 `ansi-escapes`

```bash
pnpm install ansi-escapes
```

示例：在固定位置动态更新一个计数器：

```javascript
// dynamic-counter.js
import ansiEscapes from "ansi-escapes"

const write = process.stdout.write.bind(process.stdout)

write("Downloading file...\n")
// 保存光标位置
write(ansiEscapes.cursorSavePosition)

let count = 0
const timer = setInterval(() => {
  // 恢复光标位置
  write(ansiEscapes.cursorRestorePosition)
  // 清除从光标到行尾的内容
  write(ansiEscapes.eraseEndLine)

  write(`Progress: ${count}%`)
  count++

  if (count > 100) {
    clearInterval(timer)
    write("\nDownload complete!\n")
  }
}, 50)
```

**注意**: 这里使用 `process.stdout.write` 而不是 `console.log`，因为 `console.log` 会在每次输出后自动添加一个换行符，这会破坏光标定位

### 颜色与样式控制

颜色和样式是通过 `SGR (Select Graphic Rendition)` 指令（即 `m`）实现的，参数决定了具体的样式。例如：`\u001B[31m` 设置前景色为红色，`\u001B[1m` 设置为粗体，`\u001B[0m` 则重置所有样式

```javascript
console.log("\u001B[31mThis is red.\u001B[0m")
console.log("\u001B[1mThis is bold.\u001B[0m")
console.log("\u001B[31;1mThis is red and bold.\u001B[0m And this is normal.")
```

#### 使用 chalk 库

手动拼接这些代码非常繁琐且易读性差。因此 `chalk` 成为了社区的黄金标准，它提供了极其易用的链式 API

```bash
pnpm install chalk
```

> chalk 从 v5 版本开始是个纯 ESM 包。需要在 `package.json` 中设置 `"type": "module"`，并使用 `import` 语法
>

```javascript
// chalk-demo.js
import chalk from "chalk"

const log = console.log

log(chalk.blue("Hello") + " World" + chalk.red("!"))
log(chalk.blue.bgRed.bold("Hello world!"))
log(chalk.blue("Hello", "World!", "Foo", "bar", "biz", "baz"))
log(chalk.red("Hello", chalk.underline.bgBlue("world") + "!"))
log(chalk.green("I am a green line " + chalk.blue.underline.bold("with a blue substring") + " that becomes green again!"))

log(`
    CPU: ${chalk.red("90%")}
    RAM: ${chalk.green("40%")}
    DISK: ${chalk.yellow("70%")}
`)

log(chalk.rgb(123, 45, 67).underline("Underlined reddish color"))
log(chalk.hex("#DEADED").bold("Bold gray!"))
```

运行 `node chalk-demo.js` 将看到五彩斑斓的输出

## 实战：cli-progress

安装 TypeScript 及 Node.js 类型定义作为开发依赖：

```bash
pnpm install typescript @types/node -D
```

使用 `tsc` 命令初始化 `tsconfig.json` 文件：

```bash
npx tsc --init
```

为适应现代 Node.js 项目的开发，需要对生成的 `tsconfig.json` 进行一些调整，特别是模块相关的配置

```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

**配置解析**：

- `"module": "NodeNext"` 和 `"moduleResolution": "NodeNext"`：这两个选项让 TypeScript 编译器能够智能地根据上下文决定模块系统。它会检查 `package.json` 中的 `"type"` 字段，以及文件的扩展名（如 `.mts`, `.cts`），从而正确地处理 ES Modules 和 CommonJS 之间的互操作
- `"target": "es2020"`：将代码编译到较新的 ES2020 版本，以利用现代 JavaScript 的特性
- `"outDir": "./dist"`：指定编译后的 JavaScript 文件输出到 `dist` 目录

为让 Node.js 默认以 ES Module 模式运行代码，需要在 `package.json` 中添加 `"type": "module"` 字段

### cli-progress 模块

社区中成熟的解决方案：`cli-progress`。这是一个功能强大且易于使用的库

```bash
pnpm install cli-progress
```

在 `src/index.ts` 文件中尝试使用它

```typescript
// src/index.ts
import cliProgress from "cli-progress"

// 创建一个新的进度条实例
const bar = new cliProgress.SingleBar({
  format: "下载进度 | {bar} | {percentage}% || {value}/{total} Chunks || 速度: {speed}",
  barCompleteChar: "█",
  barIncompleteChar: "░",
  hideCursor: true
})

// 启动进度条，设置总值为 200
bar.start(200, 0, {
  speed: "N/A"
})

let value = 0

// 模拟一个定时任务来更新进度
const timer = setInterval(() => {
  value++

  // 更新进度条的值和 payload
  bar.update(value, {
    speed: (Math.random() * 20 + 10).toFixed(2) + " MB/s"
  })

  // 当进度完成时，停止定时器和进度条
  if (value >= bar.getTotal()) {
    clearInterval(timer)
    bar.stop()
  }
}, 80)
```

**代码解析**：

1.  通过 `new cliProgress.SingleBar()` 创建一个实例，并传入配置对象：
    - `format`: 定义进度条的显示模板。花括号 `{}` 内的变量（如 `bar` 、`percentage`、 `value`、 `total`、 `speed`）会在运行时被替换为实际数据
    - `barCompleteChar` / `barIncompleteChar`: 分别定义了已完成和未完成部分的进度条字符。
    - `hideCursor`: 在进度条运行时隐藏光标，避免闪烁。
2.  `bar.start(total, startValue, payload)`：启动进度条，设置总值、初始值和自定义的 payload 数据
3.  `bar.update(currentValue, payload)`：在定时器中不断更新当前值和 payload 数据
4.  `bar.stop()`：当任务完成时，停止进度条并换行，将光标恢复到下一行

运行这段代码：

```bash
node index.ts
```

### ANSI 转义序列的应用

要实现动态更新的进度条，核心在于**光标的控制**。需要在每次更新时，让光标回到行首，然后用新的内容覆盖旧的内容。

```bash
pnpm install ansi-escapes
```

在 `src/test.ts` 中做一个简单的实验：

```typescript
// src/test.ts
import ansiEscapes from 'ansi-escapes';

const write = process.stdout.write.bind(process.stdout);

// 1. 隐藏光标，避免闪烁
write(ansiEscapes.cursorHide);

// 2. 保存当前光标位置
write(ansiEscapes.cursorSavePosition);
write('░░░░░░░░░░░░░░░░░░░░');

setTimeout(() => {
    // 3. 恢复之前保存的光标位置
    write(ansiEscapes.cursorRestorePosition);
    write('█████░░░░░░░░░░░░░░');
}, 1000);

setTimeout(() => {
    write(ansiEscapes.cursorRestorePosition);
    write('██████████░░░░░░░░░');
}, 2000);

setTimeout(() => {
    write(ansiEscapes.cursorRestorePosition);
    write('███████████████████');
    // 4. 任务结束，换行并显示光标
    write('');
    write(ansiEscapes.cursorShow);
}, 3000);
```

**核心步骤**：

1.  **`cursorHide`**: 开始时隐藏光标，结束后用 `cursorShow` 恢复显示
2.  **`cursorSavePosition`**: 在第一次绘制进度条之前，保存当前光标的位置
3.  **`cursorRestorePosition`**: 在每次需要更新进度条时，先恢复到之前保存的位置
4.  **覆盖输出**: 恢复位置后，直接输出新的进度条内容，即可覆盖旧的显示

运行：

```bash
node test.ts
```

### 实现 ProgressBar 类

原理搞清楚后可以将其封装成可复用的 `ProgressBar` 类

创建 `src/ProgressBar.ts` 文件：

```typescript
// src/ProgressBar.ts
import ansiEscapes from "ansi-escapes"
import chalk from "chalk"
import { EOL } from "os"

const write = process.stdout.write.bind(process.stdout)

export class ProgressBar {
  private total: number = 0
  private current: number = 0
  private barSize: number = 40
  private barCompleteChar: string = "█"
  private barIncompleteChar: string = "░"

  constructor() {}

  /**
   * 启动进度条
   * @param total 总量
   * @param startValue 初始值
   */
  start(total: number, startValue: number): void {
    this.total = total
    this.current = startValue

    write(ansiEscapes.cursorHide)
    write(ansiEscapes.cursorSavePosition)

    this.render()
  }

  /**
   * 更新进度
   * @param value 当前值
   */
  update(value: number): void {
    this.current = value
    this.render()
  }

  /**
   * 停止进度条
   */
  stop(): void {
    write(ansiEscapes.cursorShow)
    write(EOL) // 换行
  }

  /**
   * 获取总大小
   */
  getTotalSize(): number {
    return this.total
  }

  /**
   * 核心渲染函数
   */
  private render(): void {
    let percentage = this.current / this.total
    percentage = Math.max(0, Math.min(1, percentage)) // 保证比例在 0-1 之间

    const completeSize = Math.round(percentage * this.barSize)
    const incompleteSize = this.barSize - completeSize

    const completePart = chalk.green(this.barCompleteChar.repeat(completeSize))
    const incompletePart = this.barIncompleteChar.repeat(incompleteSize)

    const bar = `${completePart}${incompletePart}`
    const percentageText = chalk.yellow(` ${(percentage * 100).toFixed(2)}%`)
    const progressText = ` ${this.current}/${this.total}`

    write(ansiEscapes.cursorRestorePosition)
    write(bar + percentageText + progressText)
  }
}
```

**`ProgressBar` 类解析**：

- **`start()`**: 初始化总值和当前值，隐藏并保存光标位置，然后调用 `render()` 进行首次绘制
- **`update()`**: 更新当前值，并重新调用 `render()` 绘制
- **`stop()`**: 恢复光标显示，并输出一个换行符，确保后续的命令行输出在新的一行
- **`render()` (私有方法)**: 这是最核心的部分
  1.  计算当前进度百分比
  2.  根据百分比和总长度（`barSize`），计算已完成和未完成部分的字符数
  3.  使用 `chalk` 为已完成部分添加颜色
  4.  拼接进度条、百分比和进度数值文本
  5.  **关键**：先用 `cursorRestorePosition` 回到行首，再输出拼接好的完整字符串，实现原地更新

在 `src/index2.ts` 中使用刚封装的 `ProgressBar`：

```typescript
// src/index2.ts
import { ProgressBar } from "./ProgressBar.js"

const bar = new ProgressBar()
bar.start(200, 0)

let value = 0

const timer = setInterval(() => {
  value++
  bar.update(value)

  if (value >= bar.getTotalSize()) {
    clearInterval(timer)
    bar.stop()
  }
}, 50)
```

运行 `node dist/index2.js`，你将看到一个带颜色的、亲手打造的进度条！

```bash
# 编译 ts 文件，默认是编译为 CommonJS 模块
npx tsc ProgressBar.ts

# 指定编译为 ES 模块
npx tsc ProgressBar.ts --module ESNext --moduleResolution node

node index2.ts
```

### 示例：集成文件下载进度

编写脚本用于下载一个文件，并使用封装的 `ProgressBar` 实时显示下载进度

```typescript
// src/index3.ts

import https from "node:https"
import fs from "node:fs"
import { ProgressBar } from "./ProgressBar.js"

const downloadURLs = {
  Trae: "https://lf-cdn.trae.com.cn/obj/trae-com-cn/pkg/app/releases/stable/1.0.24450/darwin/Trae-darwin-x64.dmg"
}

const bar = new ProgressBar()

let value = 0

https.get(downloadURLs.Trae, (response) => {
  const file = fs.createWriteStream("./Trae.zip")
  response.pipe(file)

  const totalBytes = parseInt(response.headers["content-length"]!, 10)

  bar.start(totalBytes, 0)

  response.on("data", function (chunk) {
    value += chunk.length

    bar.update(value)

    if (value > bar.getTotalSize()) {
      bar.stop()
    }
  })
})
```

### 最佳实践

- **考虑非 TTY 环境**：当脚本通过管道 (`|`) 或重定向 (`>`) 输出时，`process.stdout.isTTY` 会是 `false`。在这种非交互式环境下，应该禁用所有 ANSI 动画和颜色，只输出关键的文本信息
- **提供有意义的信息**：进度条不仅要好看，更要提供有价值的信息，如百分比、已处理/总量、预估剩余时间 (ETA) 等
- **优雅地开始和结束**：在进度条开始前，可以先打印一行提示信息。结束后，务必调用 `stop()` 方法，确保光标恢复正常并换行，以免影响后续的命令输出
- **性能考虑**：避免过于频繁地更新进度条（例如，每接收一个字节就更新），这会带来不必要的性能开销。可以设置一个更新频率的阈值，比如每 100ms 或每下载 1% 才更新一次界面
