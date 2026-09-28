---
title: 用VSCode-Snippets快速创建调试配置
description: 介绍 VSCode Snippets 的语法（光标、placeholder、多选值、变量与正则替换），并用 Snippets 快速封装 Chrome / Node 的调试配置。
keywords: [VSCode调试, VSCode-Snippets, 快速创建调试配置]
category: 调试
tags: [调试原理, VSCode]
---

# 用VSCode-Snippets快速创建调试配置

VSCode Debugger 调试的时候需要创建调试配置，默认生成的配置往往不是符合需求的，需要做一些修改。

比如调试 Vue 项目时，默认生成的调试配置是这样的：

```json
{
  "type": "chrome",
  "request": "launch",
  "name": "Launch Chrome against localhost",
  "url": "http://localhost:8080",
  "webRoot": "${workspaceFolder}"
}
```

而我们最终用的是这样：

```json
{
  "type": "chrome",
  "request": "launch",
  "name": "调试 Vue 项目",
  "url": "http://localhost:5173",
  "webRoot": "${workspaceFolder}/_debug_placeholder",
  "userDataDir": false,
  "runtimeArgs": ["--auto-open-devtools-for-tabs"]
}
```

要快速生成所需的调试配置，需要用到 VSCode 的 Snippets 功能。

## 什么是 Snippets

Snippets 是代码片段的意思，输入前缀就可以快速填入代码片段。

编写一个 Snippet 的步骤如下：

按住 `Cmd+Shift+P`（macOS）或 `Ctrl+Shift+P`（Windows）调出 VSCode 命令面板，输入 `snippets`，选择 **Configure User Snippets**：

创建一个项目级别的 Snippets。

在 `.vscode` 下就会多出一个 `xx.code-snippets` 的文件。

注释的部分就是 demo 配置，将其打开：

- **prefix**：Snippet 生效的前缀（输入这个前缀就会触发补全）
- **body**：插入的内容
- **description**：描述
- **scope**：指定 Snippet 生效的语言

这个 Snippet 的作用就是在这个项目目录下的 js、ts 文件里，输入 `log` 的时候会提示，选中之后就会插入 body 部分的内容。

## Snippets 的语法

body 部分是待插入的代码，支持很多语法，也是一种 DSL（领域特定语言）：

### 指定光标位置

```
"$1  xxxx",
"yyyy $2"
```

光标会先停在 `$1`，按 Tab 后跳到 `$2`。

### 多光标编辑

```
"$1  xxxx $1"
```

同一编号 `$1` 出现多次时，光标会在所有位置同时出现，可以同时编辑。

### 指定 placeholder 文本

```
"${1:aaa}  xxxx",
"yyyy ${2:bbb}"
```

光标停在这个位置时，会显示默认文本 `aaa`，按 Tab 跳到下一个位置。

### 指定多选值

```
"你好${1|光光,东东|}"
```

光标停在这个位置时，会显示一个下拉选择框，提供 `光光` 和 `东东` 两个选项。

### 取变量

```
"当前文件： $TM_FILENAME",
"当前日期： $CURRENT_YEAR/$CURRENT_MONTH/$CURRENT_DATE"
```

所有可用变量可以在 [VSCode 文档](https://code.visualstudio.com/docs/editor/userdefinedsnippets#_variables)里查看。

常用变量：

| 变量 | 含义 |
|------|------|
| `TM_FILENAME` | 当前文件名 |
| `TM_FILENAME_BASE` | 当前文件名（不含扩展名） |
| `TM_DIRECTORY` | 当前文件所在目录 |
| `TM_LINE_INDEX` | 当前行号（0-based） |
| `TM_LINE_NUMBER` | 当前行号（1-based） |
| `CURRENT_YEAR` | 当前年份 |
| `CURRENT_MONTH` | 当前月份 |
| `CURRENT_DATE` | 当前日期 |
| `WORKSPACE_NAME` | 当前 workspace 名称 |

### 对变量做正则替换

```
"${TM_FILENAME/(.*)\\.[a-z]+/${1:/upcase}/i}"
```

语法汇总如下：

| 语法 | 功能 | 示例 |
|------|------|------|
| `$x` | 指定光标位置 | `$1` |
| `$x $x` | 多光标编辑 | `$1 $1` |
| `${x:placeholder}` | 指定默认文本 | `${1:5173}` |
| `${x|a,b|}` | 指定多选值 | `${1|5173,8080,3000|}` |
| `$VariableName` | 取变量 | `$TM_FILENAME` |
| `${VariableName/regex/replace/flags}` | 对变量做转换 | `${TM_FILENAME/(.*)\\..+/$1/}` |

综合运用这些语法，就可以实现很多方便的 Snippets。

## 封装调试配置的 Snippets

比如 Vue 的 Vite 项目调试配置可以封装成 Snippets：

```json
{
  "Vue Vite Debug Config": {
    "prefix": "vue-vite-debug",
    "scope": "json,jsonc",
    "body": [
      "{",
      "  \"type\": \"chrome\",",
      "  \"request\": \"launch\",",
      "  \"name\": \"调试 Vue Vite 项目\",",
      "  \"url\": \"http://localhost:${1:5173}\",",
      "  \"webRoot\": \"\\${workspaceFolder}/_debug_placeholder\",",
      "  \"userDataDir\": false,",
      "  \"runtimeArgs\": [\"--auto-open-devtools-for-tabs\"]",
      "}"
    ],
    "description": "创建 Vue Vite 项目的 Chrome 调试配置"
  }
}
```

React 的 Vite 项目调试配置：

```json
{
  "React Vite Debug Config": {
    "prefix": "react-vite-debug",
    "scope": "json,jsonc",
    "body": [
      "{",
      "  \"type\": \"chrome\",",
      "  \"request\": \"launch\",",
      "  \"name\": \"调试 React Vite 项目\",",
      "  \"url\": \"http://localhost:${1:5173}\",",
      "  \"webRoot\": \"\\${workspaceFolder}/_debug_placeholder\",",
      "  \"userDataDir\": false,",
      "  \"runtimeArgs\": [\"--auto-open-devtools-for-tabs\"]",
      "}"
    ],
    "description": "创建 React Vite 项目的 Chrome 调试配置"
  }
}
```

Node.js 调试配置：

```json
{
  "Node Debug Config": {
    "prefix": "node-debug",
    "scope": "json,jsonc",
    "body": [
      "{",
      "  \"type\": \"node\",",
      "  \"request\": \"launch\",",
      "  \"name\": \"调试 Node.js\",",
      "  \"program\": \"\\${workspaceFolder}/${1:index.js}\",",
      "  \"stopOnEntry\": ${2|false,true|}",
      "}"
    ],
    "description": "创建 Node.js 的调试配置"
  }
}
```

注意 `${workspaceFolder}` 这部分和 Snippets 的语法有冲突，所以需要加上 `\\` 来转义。

scope 指定为 `json` 和 `jsonc`，这是因为 json 文件对应两种语言：json 是标准 JSON（不支持注释），jsonc 是 JSON with Comments（支持注释）。launch.json 实际上是 jsonc 类型。

> **如何制作 Snippets**：有工具网站 [snippet-generator.app](https://snippet-generator.app/) 可以把普通文本转换为 Snippets 的 body 格式。只需把内容贴在左边，右边就会展示转换后的配置。

## Snippets 的生效范围

Snippets 一共三种范围：

| 范围 | 保存位置 | 生效范围 |
|------|---------|---------|
| **全局** | VSCode 用户目录下的 `snippets/` | 所有项目 |
| **项目** | `.vscode/xx.code-snippets` | 当前项目 |
| **语言** | VSCode 用户目录下的 `语言.code-snippets` | 指定语言的所有文件 |

把调试配置的 Snippets 放到**全局** snippets，这样每个项目都能使用。
