---
title: 用Node脚本替代复杂命令
description: "Node.js 拥有强大的生态系统，能为前端开发带来更多可能性。对于前端工程师而言，使用 Node.js 编写 npm script 有两大优势：学习成本极低，且 Node.js 本身跨平台，用其编写的脚本能有效避免兼容性问题。"
keywords: []
category: tools
tags: [npm scripts, 工程化, 自动化]
---


# 用Node脚本替代复杂命令

Node.js 拥有强大的生态系统，能为前端开发带来更多可能性。对于前端工程师而言，使用 Node.js 编写 npm script 有两大优势：首先，学习成本极低，几乎可以忽略不计；其次，Node.js 本身跨平台，用其编写的脚本能有效避免兼容性问题。

接下来，我们将探讨如何将上一节的 shell 脚本 `cover` 改写为 Node.js 脚本，并借助 [shelljs](https://www.npmjs.com/package/shelljs) 工具包简化操作。

## 1. 安装依赖

首先，安装 `shelljs` 和 `chalk`，前者用于执行 shell 命令，后者用于在控制台输出彩色文本，增强脚本可读性。

```bash
npm install shelljs chalk --save-dev
```

## 2. 创建 Node.js 脚本

在项目根目录的 `scripts` 文件夹下创建一个名为 `cover.js` 的文件。

## 3. 编写 Node.js 脚本

`shelljs` 提供了常见的 shell 命令的跨平台实现，如 `cp`、`mkdir`、`rm` 等。结合 `chalk`，我们可以编写功能强大且输出友好的脚本。

以下是 `scripts/cover.js` 的完整代码，实现了清理、测试、归档和预览覆盖率报告的功能：

```javascript
const { rm, cp, mkdir, exec, echo, set, exit } = require("shelljs")
const chalk = require("chalk")

// 增强-脚本健壮性
// 任何一条命令执行失败，则退出脚本
set("-e")

echo(chalk.green("1. 清理旧的覆盖率报告..."))
rm("-rf", "coverage", ".nyc_output")

echo(chalk.green("2. 运行测试并生成新的覆盖率报告..."))
// 增强-脚本健壮性
// 如果测试命令失败，则输出错误信息并退出
if (exec("nyc --reporter=html npm run test").code !== 0) {
  echo(chalk.red("测试执行失败"))
  exit(1)
}

const { version } = require("../package.json")
echo(chalk.green(`3. 按版本 ${version} 归档覆盖率报告...`))
mkdir("-p", `coverage_archive/${version}`)
cp("-r", "coverage/*", `coverage_archive/${version}`)

echo(chalk.green("4. 启动服务并预览覆盖率报告..."))
// 增强-脚本健壮性
// 如果预览命令失败，则输出错误信息并退出
if (exec("npm-run-all --parallel cover:serve cover:open").code !== 0) {
  echo(chalk.red("预览服务启动失败"))
  exit(1)
}
```

脚本说明：

- **错误处理**：`set('-e')` 确保脚本在任何命令执行失败时立即退出，增强了脚本的健壮性。
- **动态版本**：通过 `require('../package.json')` 读取项目版本号，实现动态归档。
- **清晰输出**：使用 `chalk` 输出彩色提示，清晰展示脚本执行的每个步骤。
- **命令执行**：`exec` 用于执行测试和启动服务等复杂命令，并通过检查返回码判断是否成功。

## 4. 更新 package.json

准备好 Node.js 脚本后，修改 `package.json` 中的 `cover` 命令，使其直接调用该脚本：

```json
{
  "name": "your-project-name",
  "version": "1.0.0",
  "scripts": {
    "test": "cross-env NODE_ENV=test mocha tests/",
    "cover": "node scripts/cover.js",
    "cover:serve": "http-server coverage/",
    "cover:open": "open-cli http://localhost:8080"
  },
  "devDependencies": {
    "chalk": "^4.1.2",
    "cross-env": "^7.0.3",
    "http-server": "^14.1.0",
    "mocha": "^9.2.2",
    "nyc": "^15.1.0",
    "open-cli": "^7.0.1",
    "shelljs": "^0.8.5"
  }
}
```

## 5. 测试 cover 命令

现在，重新运行 `npm run cover` 命令。如果一切顺利，你将看到类似下面的彩色输出，并且覆盖率报告会自动在浏览器中打开：

```
1. 清理旧的覆盖率报告...
2. 运行测试并生成新的覆盖率报告...
3. 按版本 1.0.0 归档覆盖率报告...
4. 启动服务并预览覆盖率报告...
```

通过将复杂的 shell 命令迁移到 Node.js 脚本，我们不仅解决了跨平台兼容性问题，还获得了更强的编程能力和更可靠的错误处理机制。
