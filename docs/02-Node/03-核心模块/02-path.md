---
title: path 路径处理模块
description: path 模块的跨平台路径解析、normalize/join/resolve 语义差异与 POSIX-vs-Windows 行为
keywords: [Node.js, path]
category: Node.js
tags: [Node.js, 核心模块]
---







# path 路径处理模块

`path` 模块是 Node.js 中内置的路径处理模块，提供用于处理文件和目录路径的工具函数。使用 `path` 模块可以避免跨平台路径问题，确保代码在不同操作系统上都能正常工作。

## 模块特性

- **跨平台兼容**：自动处理不同操作系统的路径分隔符差异
- **零依赖**：Node.js 内置模块，无需额外安装
- **同步执行**：所有方法都是同步的，性能优异
- **类型安全**：提供完整的 TypeScript 类型定义

## 引入方式

```javascript
// CommonJS
const path = require("path")

// ES Modules
import path from "path"
```

## 跨平台路径差异

不同操作系统使用不同的路径分隔符：

| 操作系统 | 分隔符 | 示例 |
|---------|--------|------|
| Windows | `\` (反斜杠) | `C:\Users\username\file.txt` |
| Unix/Linux/macOS | `/` (正斜杠) | `/home/username/file.txt` |

:::: warning

直接拼接路径可能导致跨平台问题，强烈建议使用 `path` 模块提供的方法。

::::

```javascript
// ❌ 不推荐：直接拼接路径
const badPath = __dirname + "/data/file.txt" // Windows 上可能出错

// ✅ 推荐：使用 path.join
const filePath = path.join(__dirname, "data", "file.txt") // 跨平台兼容
```

## 模块架构

```
path 模块
├── 路径解析方法
│   ├── basename()   - 获取文件名
│   ├── dirname()    - 获取目录名
│   ├── extname()    - 获取扩展名
│   ├── parse()      - 解析路径对象
│   └── format()     - 序列化路径对象
├── 路径操作方法
│   ├── join()       - 拼接路径
│   ├── resolve()    - 解析绝对路径
│   ├── normalize()  - 规范化路径
│   └── relative()   - 计算相对路径
├── 路径判断方法
│   └── isAbsolute() - 判断是否绝对路径
├── 路径属性
│   ├── sep          - 路径分隔符
│   ├── delimiter    - 路径定界符
│   ├── win32        - Windows 风格 API
│   └── posix        - POSIX 风格 API
└── 全局变量（非模块方法）
    ├── __filename   - 当前文件绝对路径
    └── __dirname    - 当前目录绝对路径
```

## 全局变量

### \_\_filename

`__filename` 是 Node.js 的全局变量，表示当前执行文件的完整绝对路径。

```javascript
console.log(__filename)
// macOS/Linux: /Users/username/project/src/app.js
// Windows: C:\Users\username\project\src\app.js
```

### \_\_dirname

`__dirname` 是 Node.js 的全局变量，表示当前执行文件所在的目录的绝对路径。

```javascript
console.log(__dirname)
// macOS/Linux: /Users/username/project/src
// Windows: C:\Users\username\project\src
```

**使用示例**：

```javascript
const path = require("path")
const fs = require("fs")

// 读取当前目录下的文件
const filePath = path.join(__dirname, "data.txt")
fs.readFile(filePath, "utf8", (err, data) => {
  if (err) {
    console.error(err)
    return
  }
  console.log(data)
})

// 获取当前文件名
const fileName = path.basename(__filename)
console.log(`当前文件: ${fileName}`)

// 获取当前目录名
const dirName = path.basename(__dirname)
console.log(`当前目录: ${dirName}`)
```

::: warning

`__dirname` 和 `__filename` 在 ES Modules 中不可用。在 ES Modules 中需要使用 `import.meta.url` 来获取类似信息：

```javascript
// ES Modules 中
import { fileURLToPath } from "url"
import { dirname } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
```

:::

## path 模块常用 API

| API            | 作用                   |
| -------------- | ---------------------- |
| `basename()`   | 获取路径中基础名称     |
| `dirname()`    | 获取路径中目录名称     |
| `extname()`    | 获取路径中扩展名称     |
| `isAbsolute()` | 判断路径是否为绝对路径 |
| `join()`       | 拼接多个路径片段       |
| `resolve()`    | 返回绝对路径           |
| `parse()`      | 解析路径               |
| `format()`     | 序列化路径             |
| `normalize()`  | 规范化路径             |
| `relative()`   | 计算相对路径           |
| `sep`          | 路径分隔符             |
| `delimiter`    | 路径定界符             |

## 路径解析方法

### basename

获取路径中的基本名称（文件名）。

**语法**：

```javascript
path.basename(path[, ext])
```

**参数说明**：

- `path`：文件路径
- `ext`：可选，要移除的文件扩展名

**特点**：

1. 返回路径中的最后一部分（文件名）
2. 第二个参数表示后缀名，如果设置则返回不带后缀的文件名
3. 第二个参数作为后缀时，如果没有在当前路径中匹配到，则会被忽略
4. 处理目录路径时，如果结尾处有分隔符，则会被忽略

**示例**：

```javascript
const path = require("path")

console.log(__filename)
// /Users/username/project/src/app.js

console.log(path.basename(__filename)) // app.js
console.log(path.basename(__filename, ".js")) // app
console.log(path.basename(__filename, ".css")) // app.js（未匹配到，忽略）

console.log(path.basename("/a/b/c")) // c
console.log(path.basename("/a/b/c/")) // c（忽略结尾分隔符）

// Windows 示例
console.log(path.basename("C:\\Users\\file.txt")) // file.txt
```

### dirname

获取路径的目录名（父目录路径）。

**语法**：

```javascript
path.dirname(path)
```

**说明**：返回路径中最后一部分的上一层目录所在的路径。

**示例**：

```javascript
const path = require("path")

console.log(__filename)
// /Users/username/project/src/app.js

console.log(path.dirname(__filename))
// /Users/username/project/src

console.log(path.dirname("/a/b/c")) // /a/b
console.log(path.dirname("/a/b/c/")) // /a/b

// Windows 示例
console.log(path.dirname("C:\\Users\\file.txt")) // C:\Users
```

### extname

获取路径中的扩展名。

**语法**：

```javascript
path.extname(path)
```

**特点**：

- 返回路径中文件的后缀名（包括点号）
- 如果路径中存在多个点，它匹配的是最后一个点到结尾的内容
- 如果没有扩展名，返回空字符串

**示例**：

```javascript
const path = require("path")

console.log(path.extname(__filename)) // .js
console.log(path.extname("/a/b")) // （空字符串）
console.log(path.extname("/a/b/index.html.js.css")) // .css
console.log(path.extname("/a/b/index.html.js.")) // .
console.log(path.extname("/a/b/file")) // （空字符串）
```

### parse

解析路径，返回一个包含路径各部分信息的对象。

**语法**：

```javascript
path.parse(path)
```

**返回对象属性**：

- `root`：根目录
- `dir`：目录路径
- `base`：文件名（包含扩展名）
- `ext`：扩展名（包含点号）
- `name`：文件名（不包含扩展名）

**示例**：

```javascript
const path = require("path")

console.log(path.parse(__filename))
/*
{
  root: '/',
  dir: '/Users/username/project/src',
  base: 'app.js',
  ext: '.js',
  name: 'app'
}
*/

console.log(path.parse("/a/b/c/index.html"))
/*
{
  root: '/',
  dir: '/a/b/c',
  base: 'index.html',
  ext: '.html',
  name: 'index'
}
*/

console.log(path.parse("/a/b/c/"))
// { root: '/', dir: '/a/b', base: 'c', ext: '', name: 'c' }

console.log(path.parse("./a/b/c/"))
// { root: '', dir: './a/b', base: 'c', ext: '', name: 'c' }

// Windows 示例
console.log(path.parse("C:\\Users\\file.txt"))
/*
{
  root: 'C:\\',
  dir: 'C:\\Users',
  base: 'file.txt',
  ext: '.txt',
  name: 'file'
}
*/
```

### format

序列化路径，将路径对象转换为路径字符串。

**语法**：

```javascript
path.format(pathObject)
```

**参数说明**：

`pathObject` 对象可以包含以下属性：

- `root`：根目录
- `dir`：目录路径（如果提供，会忽略 `root`）
- `base`：文件名（如果提供，会忽略 `ext` 和 `name`）
- `ext`：扩展名
- `name`：文件名

**示例**：

```javascript
const path = require("path")

const obj = path.parse(__filename)
console.log(obj)
/*
{
  root: '/',
  dir: '/Users/username/project/src',
  base: 'app.js',
  ext: '.js',
  name: 'app'
}
*/

console.log(path.format(obj))
// /Users/username/project/src/app.js

// 使用不同的属性组合
console.log(
  path.format({
    root: "/",
    dir: "/Users/username",
    base: "file.txt"
  })
)
// /Users/username/file.txt

console.log(
  path.format({
    root: "/",
    name: "file",
    ext: ".txt"
  })
)
// /file.txt
```

## 路径操作方法

### join

拼接多个路径片段，使用平台特定的分隔符。

**语法**：

```javascript
path.join([...paths])
```

**特点**：

- 自动处理路径分隔符
- 自动处理 `.` 和 `..`
- 忽略空字符串
- 如果所有路径都是空字符串，返回 `.`

**示例**：

```javascript
const path = require("path")

console.log(path.join("a/b", "c", "index.html"))
// a/b/c/index.html

console.log(path.join("/a/b", "c", "index.html"))
// /a/b/c/index.html

console.log(path.join("/a/b", "c", "../", "index.html"))
// /a/b/index.html

console.log(path.join("/a/b", "c", "./", "index.html"))
// /a/b/c/index.html

console.log(path.join("/a/b", "c", "", "index.html"))
// /a/b/c/index.html

console.log(path.join("")) // .

// 实际应用
const filePath = path.join(__dirname, "src", "index.js")
console.log(filePath)
// /Users/username/project/src/index.js
```

### resolve

将路径或路径片段解析为绝对路径。

**语法**：

```javascript
path.resolve([...paths])
```

**特点**：

- 从右到左处理路径片段
- 如果路径片段是绝对路径，则之前的路径会被忽略
- 如果没有提供路径，返回当前工作目录的绝对路径
- 结果路径会被规范化

**示例**：

```javascript
const path = require("path")

console.log(__filename)
// /Users/username/project/src/app.js

console.log(path.resolve())
// /Users/username/project/src（当前工作目录）

console.log(path.resolve("/a", "../b"))
// /b

console.log(path.resolve("index.html"))
// /Users/username/project/src/index.html

console.log(path.resolve("src", "index.js"))
// /Users/username/project/src/src/index.js

console.log(path.resolve("/a", "b", "c"))
// /a/b/c

console.log(path.resolve("a", "b", "/c"))
// /c（绝对路径会忽略之前的路径）

// 实际应用
const absolutePath = path.resolve(__dirname, "config", "app.json")
console.log(absolutePath)
// /Users/username/project/src/config/app.json
```

### normalize

规范化路径，处理 `.`、`..` 和多余的分隔符。

**语法**：

```javascript
path.normalize(path)
```

**特点**：

- 解析 `.` 和 `..`
- 移除多余的分隔符
- 保留尾部的分隔符（如果是目录）

**示例**：

```javascript
const path = require("path")

console.log(path.normalize("")) // .

console.log(path.normalize("a/b/c/d"))
// a/b/c/d

console.log(path.normalize("a///b/c../d"))
// a/b/c../d

console.log(path.normalize("a//\\/b/c\\/d"))
// a/\\/b/c\\/d（POSIX 上反斜杠是合法文件名字符，不会被转换；需要按 Windows 风格处理时用 path.win32.normalize）

console.log(path.normalize("/a/b/../c"))
// /a/c

console.log(path.normalize("/a/b/./c"))
// /a/b/c

console.log(path.normalize("/a/b/c/"))
// /a/b/c/（保留尾部分隔符）
```

### relative

计算从 `from` 到 `to` 的相对路径。

**语法**：

```javascript
path.relative(from, to)
```

**说明**：返回从 `from` 路径到 `to` 路径的相对路径。

**示例**：

```javascript
const path = require("path")

console.log(path.relative("/a/b", "/a/b/c/d"))
// c/d

console.log(path.relative("/a/b/c", "/a/d"))
// ../../d

console.log(path.relative("/a/b", "/a/b"))
// （空字符串，相同路径）

console.log(path.relative("/a/b", "/c/d"))
// ../../c/d

// 实际应用
const from = path.join(__dirname, "src")
const to = path.join(__dirname, "dist", "index.js")
const relativePath = path.relative(from, to)
console.log(relativePath)
// ../dist/index.js
```

## 路径判断方法

### isAbsolute

判断路径是否为绝对路径。

**语法**：

```javascript
path.isAbsolute(path)
```

**说明**：

- Windows：以盘符（如 `C:\`）或 `\\` 开头的路径为绝对路径
- Unix/Linux/macOS：以 `/` 开头的路径为绝对路径

**示例**：

```javascript
const path = require("path")

// Unix/Linux/macOS
console.log(path.isAbsolute("foo")) // false
console.log(path.isAbsolute("/foo")) // true
console.log(path.isAbsolute("///foo")) // true
console.log(path.isAbsolute("")) // false
console.log(path.isAbsolute(".")) // false
console.log(path.isAbsolute("../bar")) // false

// Windows
console.log(path.isAbsolute("C:\\foo")) // true
console.log(path.isAbsolute("\\\\server\\share")) // true
console.log(path.isAbsolute("foo")) // false
```

## 路径分隔符和定界符

### sep

路径分隔符，根据操作系统自动选择。

```javascript
const path = require("path")

console.log(path.sep)
// macOS/Linux: /
// Windows: \

// 使用示例
const parts = "/a/b/c".split(path.sep)
console.log(parts) // ['', 'a', 'b', 'c']
```

### delimiter

路径定界符，用于分隔多个路径（如 PATH 环境变量）。

```javascript
const path = require("path")

console.log(path.delimiter)
// macOS/Linux: :
// Windows: ;

// 使用示例
const paths = process.env.PATH.split(path.delimiter)
console.log(paths)
```

## 跨平台路径处理

### path.win32 和 path.posix

path 模块提供了 `win32` 和 `posix` 属性，可以强制使用特定平台的路径处理方式。

**path.win32**：强制使用 Windows 风格的路径处理

```javascript
const path = require("path")

// 即使在 Unix 系统上，也使用 Windows 风格
console.log(path.win32.join("C:", "Users", "file.txt"))
// C:\Users\file.txt
```

**path.posix**：强制使用 POSIX（Unix/Linux/macOS）风格的路径处理

```javascript
const path = require("path")

// 即使在 Windows 系统上，也使用 POSIX 风格
console.log(path.posix.join("/a", "b", "file.txt"))
// /a/b/file.txt
```

**使用场景**：

- 处理跨平台路径时，可以使用 `path.win32` 或 `path.posix` 来统一路径格式
- 在构建工具中，可能需要将路径转换为特定格式

## 实用示例

### 示例 1：获取文件信息

```javascript
const path = require("path")

function getFileInfo(filePath) {
  return {
    fullPath: path.resolve(filePath),
    dirname: path.dirname(filePath),
    basename: path.basename(filePath),
    extname: path.extname(filePath),
    name: path.basename(filePath, path.extname(filePath)),
    isAbsolute: path.isAbsolute(filePath)
  }
}

const info = getFileInfo("./src/index.js")
console.log(info)
/*
{
  fullPath: '/Users/username/project/src/index.js',
  dirname: './src',
  basename: 'index.js',
  extname: '.js',
  name: 'index',
  isAbsolute: false
}
*/
```

### 示例 2：路径规范化工具

```javascript
const path = require("path")

function normalizePath(filePath) {
  // 解析为绝对路径
  const absolutePath = path.resolve(filePath)
  // 规范化路径
  return path.normalize(absolutePath)
}

console.log(normalizePath("./src/../dist/index.js"))
// /Users/username/project/dist/index.js
```

### 示例 3：构建文件路径

```javascript
const path = require("path")

function buildPath(...segments) {
  return path.join(...segments)
}

// 构建配置文件路径
const configPath = buildPath(__dirname, "config", "app.json")
console.log(configPath)
// /Users/username/project/src/config/app.json

// 构建输出文件路径
const outputPath = buildPath(process.cwd(), "dist", "bundle.js")
console.log(outputPath)
```

### 示例 4：处理文件扩展名

```javascript
const path = require("path")

function changeExtension(filePath, newExt) {
  const dir = path.dirname(filePath)
  const name = path.basename(filePath, path.extname(filePath))
  return path.join(dir, name + newExt)
}

console.log(changeExtension("src/index.js", ".ts"))
// src/index.ts

console.log(changeExtension("src/index.js", ".min.js"))
// src/index.min.js
```

### 示例 5：递归遍历目录（结合 fs 模块）

```javascript
const fs = require("fs")
const path = require("path")

function traverseDir(dirPath, callback) {
  const files = fs.readdirSync(dirPath)

  files.forEach((file) => {
    const filePath = path.join(dirPath, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      callback(filePath, true) // true 表示是目录
      traverseDir(filePath, callback) // 递归遍历
    } else {
      callback(filePath, false) // false 表示是文件
    }
  })
}

// 使用示例
traverseDir(".", (filePath, isDir) => {
  if (isDir) {
    console.log(`目录: ${filePath}`)
  } else {
    console.log(`文件: ${filePath}`)
  }
})
```

## 最佳实践

### 1. 始终使用 path.join 拼接路径

```javascript
// ✅ 推荐
const filePath = path.join(__dirname, "src", "index.js")

// ❌ 不推荐
const badFilePath = __dirname + "/src/index.js"
```

### 2. 使用 path.resolve 获取绝对路径

```javascript
// ✅ 推荐
const absolutePath = path.resolve(__dirname, "config", "app.json")

// ❌ 不推荐
const absolutePath = __dirname + "/config/app.json"
```

### 3. 使用 path.basename 和 path.extname 处理文件名

```javascript
// ✅ 推荐
const fileName = path.basename(filePath)
const ext = path.extname(filePath)

// ❌ 不推荐
const badFileName = filePath.split("/").pop()
const badExt = filePath.split(".").pop()
```

### 4. 使用 path.parse 和 path.format 处理复杂路径

```javascript
// ✅ 推荐
const pathObj = path.parse(filePath)
pathObj.name = "new-name"
const newPath = path.format(pathObj)

// ❌ 不推荐：手动字符串操作
```

### 5. 使用 path.relative 计算相对路径

```javascript
// ✅ 推荐
const relativePath = path.relative(fromDir, toFile)

// ❌ 不推荐：手动计算相对路径
```

## 常见问题

### Q: join 和 resolve 的区别？

**A**:

- `join()` 只是简单地拼接路径片段，可能返回相对路径
- `resolve()` 会解析为绝对路径，从右到左处理，遇到绝对路径会忽略之前的路径

```javascript
path.join("a", "b") // a/b（相对路径）
path.resolve("a", "b") // /current/working/dir/a/b（绝对路径）

path.join("/a", "b", "/c") // /a/b/c
path.resolve("/a", "b", "/c") // /c（/c 是绝对路径，忽略之前的）
```

### Q: 什么时候使用 normalize？

**A**: 当你需要清理路径中的 `.`、`..` 和多余的分隔符时使用：

```javascript
path.normalize("/a/b/../c") // /a/c
path.normalize("a//b/c") // a/b/c
```

### Q: Windows 和 Unix 路径如何统一处理？

**A**: 使用 `path.join()` 和 `path.resolve()` 会自动处理跨平台差异，无需手动判断操作系统

### Q: 如何处理路径中的特殊字符？

**A**: `path` 模块会保留路径中的特殊字符，如需编码请使用 `encodeURIComponent()`:

```javascript
const filePath = "/files/my document.pdf"
// path 模块不处理编码
console.log(path.basename(filePath)) // "my document.pdf"

// 如需用于 URL，需要手动编码
const encoded = encodeURIComponent(path.basename(filePath))
console.log(encoded) // "my%20document.pdf"
```

### Q: parse 和 format 是逆操作吗？

**A**: 是的，但有注意事项：

```javascript
const original = "/Users/test/file.txt"
const parsed = path.parse(original)
const formatted = path.format(parsed)

console.log(formatted === original) // true（大多数情况）

// 注意：尾部斜杠会丢失
const withSlash = "/Users/test/"
console.log(path.format(path.parse(withSlash))) // "/Users/test"
```

## 性能优化

### 1. 避免重复调用

```javascript
// ❌ 不推荐：多次调用相同方法
function processFile(filePath) {
  const dir = path.dirname(filePath)
  const name = path.basename(filePath)
  const ext = path.extname(filePath)
  const base = path.basename(filePath, ext)
  // ...
}

// ✅ 推荐：使用 parse() 一次获取所有信息
function processFile(filePath) {
  const { dir, name, ext, base } = path.parse(filePath)
  // ...
}
```

### 2. 缓存路径解析结果

```javascript
// ❌ 不推荐：每次都解析
function getConfig() {
  const configPath = path.resolve(__dirname, "config.json")
  return require(configPath)
}

// ✅ 推荐：缓存解析结果
const CONFIG_PATH = path.resolve(__dirname, "config.json")
function getConfig() {
  return require(CONFIG_PATH)
}
```

### 3. 合理选择方法

```javascript
// 如果只需要判断是否绝对路径
path.isAbsolute(filePath) // 比 resolve() 更快

// 如果只需要文件名
path.basename(filePath) // 比 parse() 更快

// 如果需要多个路径信息
path.parse(filePath) // 一次获取所有信息
```

### 4. 批量处理优化

```javascript
// ❌ 不推荐：循环中重复解析
const files = ["a.js", "b.js", "c.js"]
const results = files.map(file => ({
  dir: path.dirname(path.join(__dirname, file)),
  name: path.basename(file, path.extname(file))
}))

// ✅ 推荐：减少路径操作
const baseDir = __dirname
const results = files.map(file => {
  const ext = path.extname(file)
  return {
    dir: baseDir,
    name: path.basename(file, ext)
  }
})
```

## 路径安全注意事项

### 1. 路径遍历攻击防护

:::: danger

永远不要直接使用用户输入作为文件路径，这可能导致路径遍历攻击！

::::

```javascript
const fs = require("fs")
const path = require("path")

// ❌ 危险：直接使用用户输入
app.get("/files/:filename", (req, res) => {
  const filePath = path.join(__dirname, "files", req.params.filename)
  res.sendFile(filePath)
  // 攻击者可以请求 "/files/../../../etc/passwd" 访问敏感文件
})

// ✅ 安全：验证和规范化路径
const ALLOWED_DIR = path.resolve(__dirname, "files")

function safePath(userInput) {
  // 解析为绝对路径
  const resolved = path.resolve(ALLOWED_DIR, userInput)
  
  // 验证路径是否在允许的目录内
  if (!resolved.startsWith(ALLOWED_DIR + path.sep)) {
    throw new Error("非法路径访问")
  }
  
  return resolved
}

app.get("/files/:filename", (req, res) => {
  try {
    const filePath = safePath(req.params.filename)
    res.sendFile(filePath)
  } catch (err) {
    res.status(403).send("禁止访问")
  }
})
```

### 2. 验证文件类型

```javascript
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif"]

function validateFileType(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`不支持的文件类型: ${ext}`)
  }
  return true
}

// 使用
validateFileType("upload.jpg") // 通过
validateFileType("malware.exe") // 抛出错误
```

### 3. 处理空路径和特殊路径

```javascript
function sanitizePath(input) {
  if (!input || typeof input !== "string") {
    return null
  }
  
  // 移除 null 字节
  let sanitized = input.replace(/\0/g, "")
  
  // 规范化路径
  sanitized = path.normalize(sanitized)
  
  // 检查是否为空
  if (sanitized === "." || sanitized === "") {
    return null
  }
  
  return sanitized
}
```

### 4. 符号链接安全

```javascript
const fs = require("fs")

function checkSymlink(filePath, allowedDir) {
  // 解析符号链接的真实路径
  const realPath = fs.realpathSync(filePath)
  
  // 确保真实路径在允许的目录内
  const resolvedAllowed = path.resolve(allowedDir)
  if (!realPath.startsWith(resolvedAllowed + path.sep)) {
    throw new Error("符号链接指向不允许的位置")
  }
  
  return realPath
}
```

## TypeScript 类型定义

`path` 模块提供了完整的 TypeScript 类型定义：

```typescript
import path from "path"
import { ParsedPath, FormatInputPathObject } from "path"

// 路径解析返回的对象类型
interface ParsedPath {
  root: string
  dir: string
  base: string
  ext: string
  name: string
}

// format 方法的输入类型
interface FormatInputPathObject {
  root?: string
  dir?: string
  base?: string
  ext?: string
  name?: string
}

// 方法类型签名
declare function basename(path: string, ext?: string): string
declare function dirname(path: string): string
declare function extname(path: string): string
declare function isAbsolute(path: string): boolean
declare function join(...paths: string[]): string
declare function resolve(...pathSegments: string[]): string
declare function normalize(path: string): string
declare function relative(from: string, to: string): string
declare function parse(path: string): ParsedPath
declare function format(pathObject: FormatInputPathObject): string

// 属性类型
declare const sep: string
declare const delimiter: string
declare const win32: PlatformPath
declare const posix: PlatformPath
```

### 实际使用示例

```typescript
import path, { ParsedPath } from "path"

// 类型安全的路径操作
function getFileInfo(filePath: string): ParsedPath & { isAbsolute: boolean } {
  return {
    ...path.parse(filePath),
    isAbsolute: path.isAbsolute(filePath)
  }
}

// 类型安全的路径构建
function buildPath(baseDir: string, ...segments: string[]): string {
  return path.join(baseDir, ...segments)
}

// 使用泛型增强类型安全
interface PathInfo {
  absolute: string
  relative: string
  directory: string
  filename: string
  extension: string
}

function analyzePath<T extends string>(
  targetPath: T,
  basePath: string
): PathInfo {
  return {
    absolute: path.resolve(targetPath),
    relative: path.relative(basePath, targetPath),
    directory: path.dirname(targetPath),
    filename: path.basename(targetPath),
    extension: path.extname(targetPath)
  }
}
```

## 进阶应用示例

### 示例 1：路径匹配工具

```javascript
const path = require("path")

class PathMatcher {
  constructor(baseDir) {
    this.baseDir = path.resolve(baseDir)
  }

  // 检查路径是否匹配指定模式
  match(filePath, pattern) {
    const relative = path.relative(this.baseDir, filePath)
    const regex = this.patternToRegex(pattern)
    return regex.test(relative)
  }

  // 将通配符模式转换为正则表达式
  patternToRegex(pattern) {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".")
    return new RegExp(`^${escaped}$`)
  }

  // 获取相对于基准目录的路径
  getRelative(filePath) {
    const absolute = path.resolve(this.baseDir, filePath)
    if (!absolute.startsWith(this.baseDir)) {
      throw new Error("路径超出基准目录")
    }
    return path.relative(this.baseDir, absolute)
  }
}

// 使用
const matcher = new PathMatcher("/project/src")
console.log(matcher.match("/project/src/utils/helper.js", "utils/*.js")) // true
console.log(matcher.getRelative("/project/src/components/App.js")) // "components/App.js"
```

### 示例 2：路径别名解析器

```javascript
const path = require("path")

class PathAlias {
  constructor() {
    this.aliases = new Map()
  }

  // 设置别名
  set(alias, targetPath) {
    this.aliases.set(alias, path.resolve(targetPath))
  }

  // 解析路径
  resolve(importPath, fromDir) {
    // 检查是否有匹配的别名
    for (const [alias, target] of this.aliases) {
      if (importPath.startsWith(alias)) {
        const rest = importPath.slice(alias.length)
        return path.join(target, rest)
      }
    }
    
    // 普通相对路径解析
    return path.resolve(fromDir, importPath)
  }

  // 批量设置别名
  setAll(aliasMap) {
    for (const [alias, target] of Object.entries(aliasMap)) {
      this.set(alias, target)
    }
  }
}

// 使用
const alias = new PathAlias()
alias.setAll({
  "@": "/project/src",
  "@components": "/project/src/components",
  "@utils": "/project/src/utils"
})

console.log(alias.resolve("@/index.js")) // "/project/src/index.js"
console.log(alias.resolve("@components/Button.js")) // "/project/src/components/Button.js"
```

### 示例 3：文件路径变更追踪器

```javascript
const path = require("path")

class PathTracker {
  constructor(rootDir) {
    this.rootDir = path.resolve(rootDir)
    this.moves = []
  }

  // 记录文件移动
  recordMove(oldPath, newPath) {
    const from = path.resolve(oldPath)
    const to = path.resolve(newPath)
    
    if (!from.startsWith(this.rootDir) || !to.startsWith(this.rootDir)) {
      throw new Error("路径必须在根目录内")
    }

    this.moves.push({ from, to })
  }

  // 获取旧路径对应的新路径
  getNewPath(oldPath) {
    const resolved = path.resolve(oldPath)
    
    for (const move of this.moves) {
      if (resolved.startsWith(move.from)) {
        const rest = resolved.slice(move.from.length)
        return path.join(move.to, rest)
      }
    }
    
    return resolved
  }

  // 获取相对路径变化
  getRelativeChange(oldPath) {
    const oldRelative = path.relative(this.rootDir, oldPath)
    const newPath = this.getNewPath(oldPath)
    const newRelative = path.relative(this.rootDir, newPath)
    
    return { old: oldRelative, new: newRelative }
  }

  // 批量更新导入路径
  updateImports(content, fromDir) {
    const importRegex = /from\s+['"]([^'"]+)['"]/g
    
    return content.replace(importRegex, (match, importPath) => {
      const absolutePath = this.resolveImport(importPath, fromDir)
      const newPath = this.getNewPath(absolutePath)
      const newRelative = path.relative(fromDir, newPath)
      
      return `from '${this.normalizeImport(newRelative)}'`
    })
  }

  resolveImport(importPath, fromDir) {
    if (importPath.startsWith(".")) {
      return path.resolve(fromDir, importPath)
    }
    return importPath
  }

  normalizeImport(relativePath) {
    return relativePath.startsWith(".") ? relativePath : "./" + relativePath
  }
}
```

### 示例 4：路径缓存管理器

```javascript
const path = require("path")

class PathCache {
  constructor(maxSize = 1000) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  // 获取缓存或计算并缓存
  get(key, compute) {
    const cacheKey = this.normalizeKey(key)
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }
    
    const result = compute()
    
    // LRU 淘汰
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    
    this.cache.set(cacheKey, result)
    return result
  }

  // 规范化缓存键
  normalizeKey(key) {
    if (Array.isArray(key)) {
      return key.map(k => path.normalize(k)).join("|")
    }
    return path.normalize(key)
  }

  // 常用方法的缓存版本
  resolve(...paths) {
    return this.get(["resolve", ...paths], () => path.resolve(...paths))
  }

  join(...paths) {
    return this.get(["join", ...paths], () => path.join(...paths))
  }

  relative(from, to) {
    return this.get(["relative", from, to], () => path.relative(from, to))
  }

  parse(filePath) {
    return this.get(["parse", filePath], () => path.parse(filePath))
  }

  // 清空缓存
  clear() {
    this.cache.clear()
  }

  // 获取缓存统计
  stats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize
    }
  }
}

// 使用
const pathCache = new PathCache()
console.log(pathCache.resolve("src", "index.js"))
console.log(pathCache.stats())
```

## 与其他模块配合使用

### 与 fs 模块配合

```javascript
const fs = require("fs")
const path = require("path")

// 安全读取文件
function safeReadFile(baseDir, relativePath) {
  const filePath = path.resolve(baseDir, relativePath)
  
  // 确保路径在允许的目录内
  if (!filePath.startsWith(path.resolve(baseDir))) {
    throw new Error("非法路径")
  }
  
  return fs.readFileSync(filePath, "utf8")
}

// 递归创建目录
function mkdirp(dirPath) {
  const resolved = path.resolve(dirPath)
  const parts = resolved.split(path.sep)
  
  for (let i = 1; i < parts.length; i++) {
    const current = parts.slice(0, i + 1).join(path.sep)
    if (!fs.existsSync(current)) {
      fs.mkdirSync(current)
    }
  }
}
```

### 与 url 模块配合

```javascript
const url = require("url")
const path = require("path")

// URL 到文件路径转换
function urlToFilePath(baseUrl, requestUrl) {
  const parsed = new URL(requestUrl, baseUrl)
  const decoded = decodeURIComponent(parsed.pathname)
  return path.join(process.cwd(), decoded)
}

// 文件路径到 URL 转换
function filePathToUrl(baseDir, filePath) {
  const relative = path.relative(baseDir, filePath)
  const normalized = relative.split(path.sep).join("/")
  return "/" + normalized
}
```

### 与 child_process 配合

```javascript
const { exec } = require("child_process")
const path = require("path")

// 安全执行命令
function safeExec(baseDir, command, args) {
  const cwd = path.resolve(baseDir)
  
  // 验证命令路径
  if (command.includes("..")) {
    throw new Error("命令路径不能包含 ..")
  }
  
  return new Promise((resolve, reject) => {
    exec(`${command} ${args.join(" ")}`, { cwd }, (err, stdout, stderr) => {
      if (err) reject(err)
      else resolve({ stdout, stderr })
    })
  })
}
```

## 调试技巧

### 1. 路径可视化

```javascript
function debugPath(label, p) {
  console.log(`
[${label}]
  原始路径: ${p}
  规范化:   ${path.normalize(p)}
  绝对路径: ${path.resolve(p)}
  目录:     ${path.dirname(p)}
  文件名:   ${path.basename(p)}
  扩展名:   ${path.extname(p)}
  是否绝对: ${path.isAbsolute(p)}
`)
}

debugPath("测试路径", "./src/../dist/index.js")
```

### 2. 路径对比工具

```javascript
function comparePaths(path1, path2) {
  const resolve1 = path.resolve(path1)
  const resolve2 = path.resolve(path2)
  
  return {
    path1: { original: path1, resolved: resolve1 },
    path2: { original: path2, resolved: resolve2 },
    equal: resolve1 === resolve2,
    relative: path.relative(path1, path2),
    sameDir: path.dirname(resolve1) === path.dirname(resolve2)
  }
}

console.log(comparePaths("./src/index.js", "src/../src/index.js"))
```

### 3. 路径错误追踪

```javascript
function trackPathError(operation, ...args) {
  try {
    const result = path[operation](...args)
    console.log(`✓ ${operation}(${args.map(JSON.stringify).join(", ")}) => ${JSON.stringify(result)}`)
    return result
  } catch (err) {
    console.error(`✗ ${operation}(${args.map(JSON.stringify).join(", ")})`)
    console.error(`  Error: ${err.message}`)
    throw err
  }
}
```

## 版本兼容性

| 方法/属性 | Node.js 版本 | 说明 |
|----------|-------------|------|
| `basename()` | >= 0.1.25 | - |
| `dirname()` | >= 0.1.16 | - |
| `extname()` | >= 0.1.25 | - |
| `join()` | >= 0.1.16 | - |
| `resolve()` | >= 0.3.4 | - |
| `normalize()` | >= 0.1.23 | - |
| `relative()` | >= 0.5.0 | - |
| `parse()` | >= 0.11.15 | - |
| `format()` | >= 0.11.15 | - |
| `isAbsolute()` | >= 0.11.2 | - |
| `path.posix` | >= 0.11.15 | - |
| `path.win32` | >= 0.11.15 | - |

## 实战视角：Node 默认路径信息与绝对路径组成

### 模块包装函数中的路径变量

Node.js 中每个 JS 模块都会被包装在如下函数中：

```javascript
(function (exports, require, module, __filename, __dirname) {
  // 模块代码
});
```

其中与路径相关的变量包括 `__filename`、`__dirname` 以及全局的 `process.cwd()`：

| 变量 | 说明 | 示例 |
|------|------|------|
| `./` | 当前文件所在目录，相对路径 | `/Users/black/juejin/`（相对于 `/Users/black/juejin/index.js`） |
| `__dirname` | 当前文件所在目录的绝对路径 | `/Users/black/juejin/node/` |
| `__filename` | 当前文件的绝对路径（含文件名） | `/Users/black/juejin/node/package.json` |
| `process.cwd()` | 执行 Node 命令时的工作目录 | 取决于运行 `node` 命令时所处的目录 |

> `process.cwd()` 与 `__dirname` 的区别：`process.cwd()` 是运行程序时所处的目录，而 `__dirname` 是文件实际所在的目录。两者不一定相同。

### 绝对路径的组成结构

参考 [Node Path 文档](https://nodejs.org/api/path.html#path_path_parse_path)，一个绝对路径由以下层级组成：

```
Linux：/home/user/www/pack.json       Windows：C:\usr\www\pack.js
┌─────────────────────┬────────────┐ ┌─────────────────────┬────────────┐
│       dir           │    base    │ │          dir        │    base    │
├──────┬              ├──────┬─────┤ ├──────┬              ├──────┬─────┤
│ root │              │ name │ ext │ │ root │              │ name │ ext │
"  /    home/user/www  /pack .json " " C:\      usr\www    \ pack  .js  "
└──────┴──────────────┴──────┴─────┘ └──────┴──────────────┴──────┴─────┘
```

| 组成部分 | 说明 |
|---------|------|
| `root` | 文件所在的根目录 |
| `dir` | 文件所处的目录 |
| `base` | 由文件名和后缀名组成，路径的最后一部分 |
| `name` | 文件名（不含扩展名） |
| `ext` | 文件后缀名 |

> 路径操作的核心在于理解这五个层级的组织关系。`path.parse()` 将路径拆解为这五个部分，`path.format()` 则反向组装。

## 参考资源

- [Node.js path 模块官方文档](https://nodejs.org/api/path.html)
- [MDN Web Docs - File API](https://developer.mozilla.org/en-US/docs/Web/API/File)
- [OWASP Path Traversal 防护指南](https://owasp.org/www-community/attacks/Path_Traversal)
