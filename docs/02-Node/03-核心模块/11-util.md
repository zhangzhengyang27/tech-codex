---
title: util 工具模块
description: util 的 format/inspect、promisify、types 类型判断与调试辅助能力
keywords: [Node.js, util]
category: Node.js
tags: [Node.js, 核心模块]
---







# util 工具模块

`util` 模块是 Node.js 的内置工具集，为底层 API 提供通用能力，同时也适合在业务代码中复用。常用功能覆盖字符串格式化、对象调试、继承封装、回调与 Promise 转换、类型判断、命令行解析等。

```javascript
const util = require("util")
// 或使用 ES Module
import util from "node:util"
```

## 核心方法速览

| 方法/属性                      | 作用                                                  | 版本要求    |
| ------------------------------ | ----------------------------------------------------- | ----------- |
| `util.format()`                | 使用占位符格式化字符串，类似 `printf`                 | v0.0.1+     |
| `util.formatWithOptions()`     | 带 inspect 选项的格式化                               | v10.0.0+    |
| `util.inspect()`               | 将任意对象转换为字符串，常用于调试输出                | v0.1.99+    |
| `util.inherits()`              | 在 ES5 风格下快速建立原型继承（已废弃）               | v0.3.0+     |
| `util.callbackify()`           | 将 `async/Promise` 函数转换为错误优先风格的回调函数   | v8.2.0+     |
| `util.promisify()`             | 将错误优先回调函数转换成返回 Promise 的函数           | v8.0.0+     |
| `util.promisify.custom`        | 自定义 `promisify` 行为                               | v8.0.0+     |
| `util.deprecate()`             | 标记函数为废弃，在调用时输出警告                      | v0.3.0+     |
| `util.debuglog()`              | 创建按 `NODE_DEBUG` 环境变量控制的调试日志函数        | v0.11.3+    |
| `util.isDeepStrictEqual()`     | 深度严格比较两个值                                    | v9.0.0+     |
| `util.styleText()`             | 为终端输出添加 ANSI 颜色/样式                         | v20.12.0+   |
| `util.types`                   | 提供大量类型判断工具（如 `isPromise`、`isRegExp` 等） | v10.0.0+    |
| `util.parseArgs()`             | 解析命令行参数                                        | v18.3.0+    |
| `util.parseEnv()`              | 解析 .env 文件内容                                    | v21.7.0+    |
| `util.getSystemErrorName()`    | 根据错误代码（errno）返回系统错误名称                 | v9.7.0+     |
| `util.getSystemErrorMap()`     | 返回所有系统错误码的 Map 映射表                       | v16.0.0+    |
| `util.getSystemErrorMessage()` | 根据错误码返回系统错误消息                            | v23.1.0+    |
| `util.MIMEType`                | MIME 类型解析与操作类                                 | v19.1.0+    |
| `util.stripVTControlCharacters()` | 移除字符串中的 ANSI 转义码                         | v16.11.0+   |
| `util.TextEncoder/TextDecoder` | UTF-8 编解码工具，与 Web API 保持一致                 | v8.3.0+     |

## 版本兼容性说明

| 特性                       | Node.js 版本 |
| -------------------------- | ------------ |
| `util.parseArgs()`         | v18.3.0+     |
| `util.styleText()`         | v20.12.0+    |
| `util.getSystemErrorMap()` | v16.0.0+     |
| `util.parseEnv()`          | v21.7.0+     |
| `util.MIMEType`            | v19.1.0+     |
| `util.getSystemErrorMessage()` | v23.1.0+ |

> 提示：可通过 `node -v` 查看当前版本，或在代码中检查 `process.versions.node`。

## format 字符串格式化

### 基本用法

`util.format(format[, ...args])` 使用占位符格式化字符串，类似 C 语言的 `printf`。

**支持的占位符：**

| 占位符 | 说明                                     |
| ------ | ---------------------------------------- |
| `%s`   | 字符串（会调用 `String()` 转换）         |
| `%d`   | 数字（整数或浮点数）                     |
| `%i`   | 整数（会截断小数部分）                   |
| `%f`   | 浮点数                                   |
| `%j`   | JSON 字符串（循环引用时返回 `[Circular]`） |
| `%o`   | 对象（包含不可枚举属性，类似 `inspect`） |
| `%O`   | 对象（不包含不可枚举属性）               |
| `%c`   | CSS 样式（被忽略，用于与浏览器控制台兼容）|
| `%%`   | 字面量 `%`                               |

```javascript
const util = require("util")

const user = { name: "Alice", age: 28 }

// 基础格式化
console.log(util.format("%s 的年龄是 %d", user.name, user.age))
// 输出: Alice 的年龄是 28

// JSON 格式化
console.log(util.format("JSON: %j", user))
// 输出: JSON: {"name":"Alice","age":28}

// 错误对象处理
console.log(util.format("错误信息: %s", new Error("boom")))
// 输出: 错误信息: Error: boom

// 多余参数自动拼接
console.log(util.format("值:", 1, 2, 3))
// 输出: 值: 1 2 3

// 无占位符时，返回空格拼接的字符串
console.log(util.format(1, 2, 3))
// 输出: 1 2 3
```

### formatWithOptions 带选项格式化

`util.formatWithOptions(inspectOptions, format[, ...args])` 允许指定 `inspect` 选项。

```javascript
const util = require("util")

const obj = { a: 1, b: { c: 2 } }

// 启用颜色和无限深度
console.log(util.formatWithOptions({ colors: true, depth: null }, "对象: %O", obj))

// 显示隐藏属性
console.log(util.formatWithOptions({ showHidden: true }, "详情: %o", obj))
```

## inspect 对象调试输出

`util.inspect(object[, options])` 将对象转换为字符串，常用于日志和调试。

### 参数说明

| 参数            | 类型    | 默认值   | 说明                               |
| --------------- | ------- | -------- | ---------------------------------- |
| `showHidden`    | Boolean | `false`  | 是否显示不可枚举属性和 Symbol 属性 |
| `depth`         | Number  | `2`      | 递归深度，`null` 表示无限          |
| `colors`        | Boolean | `false`  | 是否输出 ANSI 颜色代码             |
| `customInspect` | Boolean | `true`   | 是否调用自定义 `inspect` 方法      |
| `showProxy`     | Boolean | `false`  | 是否显示 Proxy 对象的目标和处理器  |
| `maxArrayLength`| Number  | `100`    | 数组最大显示元素数，`null` 表示无限|
| `maxStringLength`| Number | `10000`  | 字符串最大显示长度，`null` 表示无限|
| `breakLength`   | Number  | `80`     | 换行的字符宽度，`Infinity` 禁用换行|
| `compact`       | Boolean | `true`   | 是否压缩输出                       |
| `sorted`        | Boolean | `false`  | 是否对对象属性排序                 |
| `getters`       | Boolean | `false`  | 是否显示 getter 的值               |
| `numericSeparator`| Boolean| `false`  | 是否在数字中添加分隔符             |

```javascript
const util = require("util")

const obj = {
  id: 1,
  nested: { foo: "bar", arr: [1, 2, 3] },
  [Symbol("secret")]: "隐藏信息"
}

// 默认输出
console.log(util.inspect(obj))
// 输出: { id: 1, nested: { foo: 'bar', arr: [ 1, 2, 3 ] } }

// 显示隐藏属性、无限深度、彩色输出
console.log(util.inspect(obj, { 
  showHidden: true, 
  depth: null, 
  colors: true,
  numericSeparator: true
}))
// 输出: { id: 1, nested: { foo: 'bar', arr: [ 1, 2, 3 ] }, [Symbol(secret)]: '隐藏信息' }

// 超大数组的截断处理
const bigArray = new Array(1000).fill(0).map((_, i) => i)
console.log(util.inspect(bigArray, { maxArrayLength: 5 }))
// 输出: [ 0, 1, 2, 3, 4, ... 995 more items ]
```

### 自定义 inspect 行为

通过 `[util.inspect.custom]` 符号自定义对象的输出格式：

```javascript
const { inspect } = require("util")

class User {
  constructor(name, age) {
    this.name = name
    this.age = age
    this.createdAt = new Date()
  }

  [inspect.custom](depth,%20options) {
    return `${options.stylize('User', 'name')}<${this.name}, ${this.age}>`
  }
}

const user = new User("Alice", 28)
console.log(user) // User<Alice, 28>
console.log(inspect(user, { colors: true })) // 带颜色输出
```

### inspect.defaultOptions

全局修改 `inspect` 的默认选项：

```javascript
const util = require("util")

// 设置全局默认选项
util.inspect.defaultOptions.colors = true
util.inspect.defaultOptions.depth = 4

// 之后所有 inspect 调用都会使用这些选项
console.log(util.inspect({ a: { b: { c: { d: { e: 1 } } } } }))
```

## inherits 原型继承

`util.inherits(constructor, superConstructor)` 用于 ES5 风格的构造函数继承。

> **注意**：此方法已废弃，现代代码推荐使用 ES6 `class` 和 `extends`。

```javascript
const util = require("util")

// 父类
function Parent(name) {
  this.name = name
}
Parent.prototype.sayHi = function () {
  console.log(`Hi, I'm ${this.name}`)
}
Parent.staticMethod = function() {
  console.log("静态方法")
}

// 子类
function Child(name, age) {
  Parent.call(this, name)  // 调用父类构造函数
  this.age = age
}

// 建立继承关系
util.inherits(Child, Parent)

const child = new Child("Tom", 18)
child.sayHi() // Hi, I'm Tom
console.log(child instanceof Parent) // true

// inherits 不会继承静态方法
console.log(Child.staticMethod) // undefined
```

**ES6 推荐写法：**

```javascript
class Parent {
  constructor(name) {
    this.name = name
  }
  sayHi() {
    console.log(`Hi, I'm ${this.name}`)
  }
  static staticMethod() {
    console.log("静态方法")
  }
}

class Child extends Parent {
  constructor(name, age) {
    super(name)
    this.age = age
  }
}

const child = new Child("Tom", 18)
child.sayHi() // Hi, I'm Tom
Child.staticMethod() // 静态方法
```

## callbackify 与 promisify

### promisify：回调转 Promise

`util.promisify(original)` 将错误优先回调风格的函数转换为返回 Promise 的函数。

**转换规则：**
- 回调函数签名为 `(err, result) => void`
- Promise 在 `err` 非空时拒绝，否则以 `result` 兑现
- 多返回值时，Promise 兑现为对象 `{ result1, result2, ... }`

```javascript
const fs = require("fs")
const util = require("util")

// 转换 fs 方法
const readFileAsync = util.promisify(fs.readFile)
const writeFileAsync = util.promisify(fs.writeFile)
const accessAsync = util.promisify(fs.access)

async function main() {
  try {
    // 检查文件是否存在
    await accessAsync("./test.txt", fs.constants.R_OK)
    
    // 读取文件
    const data = await readFileAsync("./test.txt", "utf8")
    console.log("文件内容:", data)
    
    // 写入文件
    await writeFileAsync("./output.txt", data.toUpperCase())
    console.log("写入完成")
  } catch (error) {
    console.error("操作失败:", error.message)
  }
}

main()
```

### promisify 多返回值处理

当回调函数有多个返回值时，Promise 兑现为一个对象：

```javascript
const util = require("util")

function multiCallback(path, callback) {
  // 模拟 fs.stat 的多返回值
  callback(null, { size: 1024, mode: 0o644 }, "extra")
}

const multiPromise = util.promisify(multiCallback)

multiPromise("./test.txt").then((result) => {
  console.log(result)
  // 输出: { '0': { size: 1024, mode: 0o644 }, '1': 'extra' }
})
```

### 自定义 promisify 行为

通过 `symbol` 自定义转换逻辑：

```javascript
const util = require("util")

function add(a, b, callback) {
  callback(null, a + b)
}

// 自定义 Promise 实现
add[util.promisify.custom] = async (a, b) => {
  return a + b + 100  // 自定义逻辑
}

const addPromise = util.promisify(add)

addPromise(1, 2).then(console.log) // 103 (而非 3)
```

### callbackify：Promise 转回调

`util.callbackify(original)` 将异步函数或 Promise 转换为回调风格。

```javascript
const util = require("util")

// 异步函数
async function fetchData(id) {
  if (id <= 0) throw new Error("id 必须大于 0")
  return { id, name: "data", timestamp: Date.now() }
}

// 转换为回调风格
const legacyFetch = util.callbackify(fetchData)

// 成功场景
legacyFetch(1, (err, result) => {
  if (err) {
    console.error("失败:", err.message)
    return
  }
  console.log("成功:", result)
  // 输出: 成功: { id: 1, name: 'data', timestamp: ... }
})

// 错误场景
legacyFetch(-1, (err) => {
  console.log("错误:", err.message) // 错误: id 必须大于 0
})
```

### callbackify 非错误拒绝处理

当 Promise 被拒绝时，拒绝原因会作为 `err` 原样传给回调——真值原因（如字符串）**不会**被包装为 `Error`；只有 falsy 值（如 `null`）才会被包装：

```javascript
const util = require("util")

async function rejectString() {
  throw "字符串错误原因"
}

const cb = util.callbackify(rejectString)

cb((err) => {
  console.log(err) // "字符串错误原因"（原始值，并非 Error 实例）
})
```

```javascript
const util = require("util")

async function rejectFalsy() {
  throw null
}

util.callbackify(rejectFalsy)((err) => {
  console.log(err instanceof Error) // true
  console.log(err.message)          // "Promise was rejected with falsy value"
  console.log(err.reason)           // null（原始值）
})
```

> 最佳实践：使用 `callbackify` 的异步函数只应 reject `Error` 对象，避免回调侧拿到非 Error 的 `err`。

### promisify 实战：从手动包装到自动转换

在没有 `promisify` 之前，将回调风格的函数转换为 Promise 需要手动包装：

```javascript
const { readFile } = require("fs")
const { join } = require("path")
const filePath = join(__dirname, "./package.json")

// 手动包装：为每个回调函数编写 Promise 包装器
const readFileAsync = (filePath) => {
  return new Promise((resolve, reject) => {
    readFile(filePath, "utf8", (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })
}

readFileAsync(filePath)
  .then(data => console.log(data.toString()))
```

使用 `promisify` 后，一行代码即可完成转换：

```javascript
const { readFile } = require("fs")
const { join } = require("path")
const { promisify } = require("util")
const filePath = join(__dirname, "./package.json")
const readFileAsync = promisify(readFile)

readFileAsync(filePath)
  .then(data => console.log(data.toString()))
```

> `promisify` 的核心价值在于：无需为每个回调函数重复编写 Promise 包装逻辑，一个调用即可自动完成转换。对于 `fs` 模块，更推荐直接使用 `fs/promises`（Node.js v10+），它提供了原生 Promise API。

## debuglog 条件调试输出

`util.debuglog(section[, callback])` 创建受 `NODE_DEBUG` 环境变量控制的调试日志函数。

### 基本用法

```javascript
// 运行: NODE_DEBUG=myapp node index.js
const util = require("util")
const debug = util.debuglog("myapp")

function processRequest(req) {
  debug("处理请求: %s %s", req.method, req.url)
  // 业务逻辑...
}

processRequest({ method: "GET", url: "/api/users" })
// 输出: MYAPP 12345: 处理请求: GET /api/users
```

### 多模块调试

```javascript
// 运行: NODE_DEBUG=http,db node index.js
const httpDebug = util.debuglog("http")
const dbDebug = util.debuglog("db")

httpDebug("HTTP 请求开始")
dbDebug("数据库查询执行")
```

### 使用回调函数

回调函数在首次调用时执行，用于初始化：

```javascript
const util = require("util")

let debugCounter = 0
const debug = util.debuglog("counter", (debugFn) => {
  debugCounter = 0
  console.log("调试计数器已初始化")
})

debug("计数: %d", ++debugCounter)
```

### 通配符匹配

```javascript
// 运行: NODE_DEBUG=myapp:* node index.js
const debug = util.debuglog("myapp:router")
debug("路由匹配") // 会被输出
```

## deprecate 标记废弃 API

`util.deprecate(fn, message[, code[, options]])` 包装函数，在首次调用时输出废弃警告。

### 基本用法

```javascript
const util = require("util")

function oldApi(data) {
  return data.toUpperCase()
}

const deprecatedOldApi = util.deprecate(
  oldApi, 
  "oldApi 已废弃，请使用 newApi",
  "DEP0001"  // 可选的废弃代码
)

deprecatedOldApi("hello")
// 输出: (node:12345) DeprecationWarning: oldApi 已废弃，请使用 newApi (Use `node --trace-deprecation ...` to show where the warning was created)

deprecatedOldApi("world") // 不会再次输出警告
```

### 控制警告行为

```javascript
// 通过环境变量控制
// NODE_OPTIONS=--no-deprecation  node index.js  // 禁用废弃警告
// NODE_OPTIONS=--trace-deprecation node index.js // 显示堆栈跟踪
// NODE_OPTIONS=--throw-deprecation node index.js  // 将警告转为异常

// 或在代码中设置
process.noDeprecation = true  // 禁用警告
process.traceDeprecation = true  // 显示堆栈
```

### options 参数

```javascript
const util = require("util")

const deprecated = util.deprecate(
  () => console.log("执行"),
  "此函数已废弃",
  "DEP0001",
  { 
    // 废弃代码会被添加到警告消息中
  }
)
```

## styleText 终端文本样式

`util.styleText(format, text[, options])` 为终端输出添加 ANSI 颜色和样式（Node.js v20.12.0+）。

### 支持的样式

| 颜色      | 背景色        | 样式         |
| --------- | ------------- | ------------ |
| `red`     | `bgRed`       | `bold`       |
| `green`   | `bgGreen`     | `italic`     |
| `yellow`  | `bgYellow`    | `underline`  |
| `blue`    | `bgBlue`      | `strikethrough` |
| `magenta` | `bgMagenta`   | `dim`        |
| `cyan`    | `bgCyan`      | `inverse`    |
| `white`   | `bgWhite`     | `hidden`     |
| `gray`/`grey` | `bgBlack` | `overline`   |
| `black`   |               | `blink`      |

### 基本用法

```javascript
const { styleText } = require("node:util")

// 单一样式
console.log(styleText("red", "错误信息"))
console.log(styleText("green", "成功信息"))
console.log(styleText("yellow", "警告信息"))

// 组合样式
console.log(styleText(["bold", "red"], "严重错误"))
console.log(styleText(["underline", "green"], "链接地址"))
console.log(styleText(["bgRed", "white"], "高亮警告"))
```

### 环境变量支持

自动检测 `NO_COLOR` 和 `FORCE_COLOR` 环境变量：

```javascript
const { styleText } = require("node:util")

// NO_COLOR=1 node script.js  → 不输出颜色
// FORCE_COLOR=1 node script.js → 强制输出颜色

console.log(styleText("red", "这段文本颜色受环境变量控制"))
```

### 流验证

验证目标流是否支持颜色：

```javascript
const { styleText } = require("node:util")

// 默认验证 process.stdout
console.log(styleText("green", "标准输出"))

// 指定不同的流
console.error(styleText("red", "错误输出", { stream: process.stderr }))

// 禁用验证（强制输出 ANSI 码）
const colored = styleText("blue", "文本", { validateStream: false })
console.log(colored)
```

### 与 stripVTControlCharacters 配合

移除 ANSI 转义码：

```javascript
const { styleText, stripVTControlCharacters } = require("node:util")

const colored = styleText(["bold", "red"], "错误信息")
console.log(colored) // 带颜色的输出

const plain = stripVTControlCharacters(colored)
console.log(plain) // 纯文本: 错误信息
```

## isDeepStrictEqual 深度比较

`util.isDeepStrictEqual(val1, val2)` 对两个值进行深度严格比较。

### 比较规则

- 原始类型使用严格相等（`===`）
- 对象递归比较所有可枚举属性
- 数组按索引逐一比较
- `Map` 和 `Set` 比较内容和顺序
- `RegExp` 比较 `source` 和 `flags`
- `Date` 比较时间戳
- `Buffer` 比较字节内容
- `Error` 比较 `name`、`message` 和 `cause`

```javascript
const util = require("util")

// 对象比较
console.log(util.isDeepStrictEqual({ a: 1 }, { a: 1 })) // true
console.log(util.isDeepStrictEqual({ a: 1 }, { a: "1" })) // false（严格比较）

// 数组比较
console.log(util.isDeepStrictEqual([1, 2, 3], [1, 2, 3])) // true
console.log(util.isDeepStrictEqual([1, 2, 3], [1, 2, "3"])) // false

// 嵌套对象
console.log(util.isDeepStrictEqual(
  { a: { b: { c: 1 } } },
  { a: { b: { c: 1 } } }
)) // true

// Map 比较
const map1 = new Map([["a", 1], ["b", 2]])
const map2 = new Map([["a", 1], ["b", 2]])
console.log(util.isDeepStrictEqual(map1, map2)) // true

// Set 比较
const set1 = new Set([1, 2, 3])
const set2 = new Set([1, 2, 3])
console.log(util.isDeepStrictEqual(set1, set2)) // true

// Date 比较
console.log(util.isDeepStrictEqual(
  new Date("2024-01-01"),
  new Date("2024-01-01")
)) // true

// RegExp 比较
console.log(util.isDeepStrictEqual(/abc/gi, /abc/gi)) // true
console.log(util.isDeepStrictEqual(/abc/gi, /abc/i)) // false
```

### 与 assert.deepStrictEqual 的关系

`util.isDeepStrictEqual` 是 `assert.deepStrictEqual` 的底层实现，返回布尔值而非抛出异常：

```javascript
const assert = require("assert")
const util = require("util")

// 使用 assert（失败时抛出异常）
try {
  assert.deepStrictEqual({ a: 1 }, { a: 2 })
} catch (e) {
  console.log("断言失败") // 会执行
}

// 使用 util（返回布尔值）
if (!util.isDeepStrictEqual({ a: 1 }, { a: 2 })) {
  console.log("值不相等") // 会执行
}
```

## types 类型检测工具

`util.types` 提供大量类型判断函数，适用于区分细粒度类型。

### 常用类型检测

```javascript
const { types } = require("util")

// Promise 与异步相关
console.log(types.isPromise(Promise.resolve())) // true
console.log(types.isPromise(new Promise(() => {}))) // true
console.log(types.isPromise({ then: () => {} })) // false

// 正则表达式
console.log(types.isRegExp(/abc/)) // true
console.log(types.isRegExp(new RegExp("abc"))) // true

// 类型数组
console.log(types.isTypedArray(new Uint8Array())) // true
console.log(types.isTypedArray(new Int32Array())) // true
console.log(types.isTypedArray(new Array())) // false

// 集合类型
console.log(types.isWeakMap(new WeakMap())) // true
console.log(types.isWeakSet(new WeakSet())) // true
console.log(types.isMap(new Map())) // true
console.log(types.isSet(new Set())) // true

// ArrayBuffer
console.log(types.isArrayBuffer(new ArrayBuffer(10))) // true
console.log(types.isSharedArrayBuffer(new SharedArrayBuffer(10))) // true

// Date
console.log(types.isDate(new Date())) // true

// 原生错误
console.log(types.isNativeError(new Error())) // true
console.log(types.isNativeError(new TypeError())) // true
console.log(types.isNativeError(new RangeError())) // true

// Proxy
const target = {}
const proxy = new Proxy(target, {})
console.log(types.isProxy(proxy)) // true
console.log(types.isProxy(target)) // false
```

### 完整方法列表

| 方法                          | 说明                               |
| ----------------------------- | ---------------------------------- |
| `isArrayBuffer(value)`        | 是否为 ArrayBuffer                 |
| `isAsyncFunction(value)`      | 是否为异步函数                     |
| `isBigInt64Array(value)`      | 是否为 BigInt64Array               |
| `isBigUint64Array(value)`     | 是否为 BigUint64Array              |
| `isBooleanObject(value)`      | 是否为 Boolean 对象                |
| `isBoxedPrimitive(value)`     | 是否为包装对象                     |
| `isDataView(value)`           | 是否为 DataView                    |
| `isDate(value)`               | 是否为 Date                        |
| `isFloat32Array(value)`       | 是否为 Float32Array                |
| `isFloat64Array(value)`       | 是否为 Float64Array                |
| `isGeneratorFunction(value)`  | 是否为生成器函数                   |
| `isGeneratorObject(value)`    | 是否为生成器对象                   |
| `isInt8Array(value)`          | 是否为 Int8Array                   |
| `isInt16Array(value)`         | 是否为 Int16Array                  |
| `isInt32Array(value)`         | 是否为 Int32Array                  |
| `isMap(value)`                | 是否为 Map                         |
| `isMapIterator(value)`        | 是否为 Map 迭代器                  |
| `isModuleNamespaceObject(value)` | 是否为 ES Module 命名空间对象   |
| `isNativeError(value)`        | 是否为原生错误                     |
| `isNumberObject(value)`       | 是否为 Number 对象                 |
| `isPromise(value)`            | 是否为 Promise                     |
| `isProxy(value)`              | 是否为 Proxy                       |
| `isRegExp(value)`             | 是否为 RegExp                      |
| `isSet(value)`                | 是否为 Set                         |
| `isSetIterator(value)`        | 是否为 Set 迭代器                  |
| `isSharedArrayBuffer(value)`  | 是否为 SharedArrayBuffer           |
| `isStringObject(value)`       | 是否为 String 对象                 |
| `isSymbolObject(value)`       | 是否为 Symbol 对象                 |
| `isTypedArray(value)`         | 是否为 TypedArray                  |
| `isUint8Array(value)`         | 是否为 Uint8Array                  |
| `isUint8ClampedArray(value)`  | 是否为 Uint8ClampedArray           |
| `isUint16Array(value)`        | 是否为 Uint16Array                 |
| `isUint32Array(value)`        | 是否为 Uint32Array                 |
| `isWeakMap(value)`            | 是否为 WeakMap                     |
| `isWeakSet(value)`            | 是否为 WeakSet                     |

### 与 typeof 的区别

```javascript
const { types } = require("util")

// typeof 只能区分基本类型
console.log(typeof new Date()) // "object"
console.log(typeof /abc/)      // "object"

// types 可以精确区分
console.log(types.isDate(new Date())) // true
console.log(types.isRegExp(/abc/))    // true

// 区分原始值和包装对象
console.log(typeof "hello")           // "string"
console.log(typeof new String("hello")) // "object"
console.log(types.isStringObject(new String("hello"))) // true
console.log(types.isStringObject("hello")) // false
```

## 系统错误处理

### getSystemErrorName

`util.getSystemErrorName(errno)` 根据系统错误码返回错误名称。

```javascript
const util = require("util")

console.log(util.getSystemErrorName(-2))  // 'ENOENT' (文件不存在)
console.log(util.getSystemErrorName(-13)) // 'EACCES' (权限不足)
console.log(util.getSystemErrorName(-17)) // 'EEXIST' (文件已存在)
```

### getSystemErrorMap

`util.getSystemErrorMap()` 返回所有系统错误码的 Map（Node.js v16.0.0+）。

```javascript
const util = require("util")

const errorMap = util.getSystemErrorMap()

// 获取特定错误
console.log(errorMap.get(-2))  // 'ENOENT'
console.log(errorMap.get(-13)) // 'EACCES'

// 遍历所有错误码
for (const [code, name] of errorMap) {
  console.log(`错误码 ${code}: ${name}`)
}
```

### getSystemErrorMessage

`util.getSystemErrorMessage(errno)` 根据错误码返回系统错误消息（Node.js v23.1.0+）。

```javascript
const util = require("util")

console.log(util.getSystemErrorMessage(-2))
// 输出: 'No such file or directory'

console.log(util.getSystemErrorMessage(-13))
// 输出: 'Permission denied'
```

### 实际应用示例

```javascript
const fs = require("fs")
const util = require("util")

function safeReadFile(path) {
  try {
    return fs.readFileSync(path, "utf8")
  } catch (error) {
    const errorName = util.getSystemErrorName(error.errno)
    const errorMap = util.getSystemErrorMap()
    
    console.error(`读取失败: [${errorName}] ${error.message}`)
    
    // 根据错误类型提供建议
    switch (errorName) {
      case "ENOENT":
        console.error("建议: 请检查文件路径是否正确")
        break
      case "EACCES":
        console.error("建议: 请检查文件权限")
        break
      case "EISDIR":
        console.error("建议: 路径是目录，不是文件")
        break
    }
    
    throw error
  }
}
```

## 命令行参数解析

`util.parseArgs([config])` 提供声明式命令行解析（Node.js v18.3.0+）。

### 参数配置

```javascript
const { parseArgs } = require("node:util")

const config = {
  // 选项定义
  options: {
    help: { type: "boolean", short: "h", default: false },
    version: { type: "boolean", short: "v", default: false },
    port: { type: "string", short: "p", default: "3000" },
    host: { type: "string", default: "localhost" },
    verbose: { type: "boolean", short: "V", default: false },
    config: { type: "string", short: "c" },
    output: { type: "string", short: "o", multiple: true }
  },
  
  // 是否严格模式（默认 true）
  strict: true,
  
  // 是否允许位置参数
  allowPositionals: true,
  
  // 是否返回解析令牌
  tokens: false,
  
  // 自定义参数数组（默认 process.argv.slice(2)）
  // args: ["--port", "8080", "file.txt"]
}

const { values, positionals } = parseArgs(config)

console.log("选项值:", values)
console.log("位置参数:", positionals)
```

### 使用示例

```javascript
// node cli.js --port=3000 --prod -V input.txt output.txt

const { parseArgs } = require("node:util")

const { values, positionals } = parseArgs({
  options: {
    port: { type: "string", short: "p", default: "3000" },
    prod: { type: "boolean", default: false },
    verbose: { type: "boolean", short: "V" },
    output: { type: "string", short: "o", multiple: true }
  },
  allowPositionals: true
})

console.log(values.port)     // "3000"
console.log(values.prod)     // true
console.log(values.verbose)  // true
console.log(values.output)   // []
console.log(positionals)     // ["input.txt", "output.txt"]
```

### 多值选项

```javascript
const { parseArgs } = require("node:util")

// node cli.js --include=a.txt --include=b.txt -o c.txt -o d.txt

const { values } = parseArgs({
  options: {
    include: { type: "string", short: "o", multiple: true }
  }
})

console.log(values.include) // ["a.txt", "b.txt", "c.txt", "d.txt"]
```

### 令牌模式

用于高级处理场景：

```javascript
const { parseArgs } = require("node:util")

const { values, tokens } = parseArgs({
  options: {
    port: { type: "string" },
    verbose: { type: "boolean" }
  },
  tokens: true,
  allowPositionals: true
})

// 令牌类型: 'option', 'positional', 'option-terminator'
tokens.forEach(token => {
  switch (token.kind) {
    case "option":
      console.log(`选项: ${token.name} = ${token.value}`)
      if (token.inlineValue) {
        console.log("  (内联值)")
      }
      break
    case "positional":
      console.log(`位置参数: ${token.value}`)
      break
    case "option-terminator":
      console.log("-- 之后的内容作为位置参数")
      break
  }
})
```

### 创建帮助信息

```javascript
const { parseArgs } = require("node:util")

const options = {
  help: { type: "boolean", short: "h", description: "显示帮助信息" },
  version: { type: "boolean", short: "v", description: "显示版本号" },
  port: { type: "string", short: "p", default: "3000", description: "服务端口" }
}

const { values } = parseArgs({ options, strict: false })

if (values.help) {
  console.log("用法: node server.js [选项]")
  console.log("\n选项:")
  Object.entries(options).forEach(([name, opt]) => {
    const short = opt.short ? `-${opt.short}, ` : "    "
    console.log(`  ${short}--${name}\t${opt.description || ""}`)
  })
  process.exit(0)
}
```

## MIME 类型处理

`util.MIMEType` 类用于解析和操作 MIME 类型（Node.js v19.1.0+）。

### 创建与解析

```javascript
const { MIMEType } = require("node:util")

// 从字符串创建
const mime = new MIMEType("text/html; charset=utf-8; boundary=----")

console.log(mime.type)     // "text"
console.log(mime.subtype)  // "html"
console.log(mime.essence)  // "text/html" (只读)

// 操作参数
console.log(mime.params.get("charset"))  // "utf-8"
console.log(mime.params.has("boundary")) // true

// 修改参数
mime.params.set("charset", "gbk")
console.log(mime.toString()) // "text/html;charset=gbk;boundary=----"

// 删除参数
mime.params.delete("boundary")
console.log(mime.toString()) // "text/html;charset=gbk"
```

### MIMEParams 操作

```javascript
const { MIMEType } = require("node:util")

const mime = new MIMEType("application/json")

// 添加参数
mime.params.set("charset", "utf-8")
mime.params.set("version", "1.0")

// 遍历参数
for (const [key, value] of mime.params) {
  console.log(`${key}: ${value}`)
}

// 转换为对象
console.log(Object.fromEntries(mime.params))
// { charset: "utf-8", version: "1.0" }
```

### 常见 MIME 类型

```javascript
const { MIMEType } = require("node:util")

const mimeTypes = {
  html: "text/html",
  json: "application/json",
  xml: "application/xml",
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  mp4: "video/mp4",
  mp3: "audio/mpeg"
}

Object.entries(mimeTypes).forEach(([ext, type]) => {
  const mime = new MIMEType(type)
  console.log(`.${ext}: ${mime.essence}`)
})
```

## 环境变量解析

`util.parseEnv(content)` 解析 `.env` 文件内容（Node.js v21.7.0+）。

```javascript
const { parseEnv } = require("node:util")
const fs = require("fs")

// 解析 .env 文件内容
const envContent = `
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydb

# 带引号的值
MESSAGE="Hello World"
PATH_VALUE='/usr/local/bin'

# 空值
EMPTY=

# 多行值
MULTI="line1
line2"
`

const env = parseEnv(envContent)

console.log(env.DB_HOST)    // "localhost"
console.log(env.DB_PORT)    // "5432"
console.log(env.MESSAGE)    // "Hello World"
console.log(env.EMPTY)      // ""
console.log(env.MULTI)      // "line1\nline2"
```

### 实际应用

```javascript
const { parseEnv } = require("node:util")
const fs = require("fs")
const path = require("path")

function loadEnv(filename = ".env") {
  const envPath = path.resolve(process.cwd(), filename)
  
  try {
    const content = fs.readFileSync(envPath, "utf8")
    const env = parseEnv(content)
    
    // 合并到 process.env
    Object.entries(env).forEach(([key, value]) => {
      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    })
    
    return env
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(`环境文件 ${filename} 不存在`)
      return {}
    }
    throw error
  }
}

// 使用
loadEnv()
console.log(process.env.DB_HOST)
```

## TextEncoder 与 TextDecoder

`util.TextEncoder` 与 `util.TextDecoder` 与 Web API 一致，用于处理 UTF-8 编码。

### TextEncoder 编码

```javascript
const { TextEncoder } = require("node:util")

const encoder = new TextEncoder()

// 编码字符串为 Uint8Array
const bytes = encoder.encode("你好 Node.js")
console.log(bytes)
// Uint8Array(14) [228, 189, 160, 229, 165, 189, 32, 78, 111, 100, 101, 46, 106, 115]

// 编码到现有缓冲区
const buffer = new Uint8Array(20)
const result = encoder.encodeInto("hello", buffer)
console.log(result) // { read: 5, written: 5 }
console.log(buffer.subarray(0, result.written))
// Uint8Array(5) [104, 101, 108, 108, 111]
```

### TextDecoder 解码

```javascript
const { TextDecoder } = require("node:util")

const decoder = new TextDecoder()

// 解码 Uint8Array 为字符串
const bytes = new Uint8Array([228, 189, 160, 229, 165, 189])
const text = decoder.decode(bytes)
console.log(text) // "你好"

// 解码部分缓冲区
const buffer = new Uint8Array([104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100])
console.log(decoder.decode(buffer.subarray(0, 5))) // "hello"

// 处理流式数据
const decoder2 = new TextDecoder("utf-8", { fatal: false })
console.log(decoder2.decode(new Uint8Array([0x80]), { stream: true }))
```

### 与 Buffer 的对比

```javascript
const { TextEncoder, TextDecoder } = require("node:util")

// 使用 TextEncoder/TextDecoder
const encoder = new TextEncoder()
const decoder = new TextDecoder()
const bytes1 = encoder.encode("你好")
const text1 = decoder.decode(bytes1)

// 使用 Buffer（Node.js 特有）
const bytes2 = Buffer.from("你好", "utf8")
const text2 = bytes2.toString("utf8")

console.log(bytes1 instanceof Uint8Array) // true
console.log(bytes2 instanceof Buffer)     // true
console.log(Buffer.from(bytes1).equals(bytes2)) // true
```

## 其他实用方法

### stripVTControlCharacters

移除字符串中的 ANSI 转义码：

```javascript
const { stripVTControlCharacters, styleText } = require("node:util")

const colored = "\x1b[31m红色文本\x1b[0m"
console.log(colored) // 带颜色的输出

const plain = stripVTControlCharacters(colored)
console.log(plain) // "红色文本"

// 与 styleText 配合
const styled = styleText(["bold", "red"], "警告信息")
console.log(stripVTControlCharacters(styled)) // "警告信息"
```

### toUSVString

将字符串转换为 Unicode 标量值：

```javascript
const { toUSVString } = require("node:util")

// 处理孤立代理对
const str = "abc\uD800def"  // \uD800 是孤立的高代理码点
console.log(toUSVString(str)) // "abc\uFFFDdef" (替换为替换字符)
```

### transferableAbortController

创建可跨线程传输的 AbortController：

```javascript
const { transferableAbortController } = require("node:util")

const ac = transferableAbortController()

// 在 Worker 线程中使用
const { port1, port2 } = new MessageChannel()
port1.postMessage(ac.signal, [ac.signal])

// 取消操作
ac.abort()
```

### transferableAbortSignal

使 AbortSignal 可转移：

```javascript
const { transferableAbortSignal } = require("node:util")

const controller = new AbortController()
const signal = transferableAbortSignal(controller.signal)

// 可以通过 postMessage 发送
worker.postMessage({ signal }, [signal])
```

### aborted

监听 AbortSignal 的中止事件：

```javascript
const { aborted } = require("node:util")
const fs = require("fs/promises")

// aborted(signal, resource) 返回一个 Promise,
// 当 signal 触发 abort 事件时兑现。常与 Promise.race 搭配实现"中止即中断等待":
async function readFileWithAbort(path, signal) {
  const handle = await fs.open(path)

  try {
    return await Promise.race([
      handle.readFile(), // 正常读取
      aborted(signal, handle).then(() => {
        throw new Error("The operation was aborted") // 中止即提前返回
      })
    ])
  } finally {
    await handle.close()
  }
}
```

### getCallSites

获取调用栈信息（Node.js v22+）：

```javascript
const { getCallSites } = require("node:util")

function debugTrace() {
  const sites = getCallSites(5)
  
  sites.forEach((site, i) => {
    console.log(`${i}: ${site.getFunctionName()} at ${site.getFileName()}:${site.getLineNumber()}`)
  })
}
```

### diff

比较两个数组或字符串的差异：

```javascript
const { diff } = require("node:util")

// 字符串差异
const strDiff = diff("abc", "abd")
console.log(strDiff) // 显示差异

// 数组差异
const arrDiff = diff([1, 2, 3], [1, 2, 4])
console.log(arrDiff)
```

## 最佳实践与常见问题

### 最佳实践

#### 1. 使用 promisify 替代手写 Promise 包装

```javascript
// 推荐
const fs = require("fs")
const { promisify } = require("node:util")

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

// 不推荐
function readFilePromise(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, (err, data) => {
      if (err) reject(err)
      else resolve(data)
    })
  })
}
```

#### 2. 使用 styleText 替代 console.log 加颜色库

```javascript
// 推荐（Node.js v20.12.0+）
const { styleText } = require("node:util")
console.log(styleText("green", "成功"))
console.log(styleText(["bold", "red"], "错误"))

// 不需要安装 chalk、colors 等库
```

#### 3. 使用 debuglog 实现条件调试

```javascript
// 推荐：通过环境变量控制
const { debuglog } = require("node:util")
const debug = debuglog("app")

function processItem(item) {
  debug("处理项目: %o", item)
  // ... 业务逻辑
}

// 生产环境不输出，开发时设置 NODE_DEBUG=app 即可看到日志
```

#### 4. 使用 parseArgs 替代手写参数解析

```javascript
// 推荐
const { parseArgs } = require("node:util")
const { values } = parseArgs({
  options: {
    port: { type: "string", short: "p", default: "3000" }
  }
})

// 不推荐
const args = process.argv.slice(2)
const port = args.includes("-p") ? args[args.indexOf("-p") + 1] : "3000"
```

#### 5. 自定义 inspect 优化调试输出

```javascript
const { inspect } = require("node:util")

class DatabaseConnection {
  constructor(host, port) {
    this.host = host
    this.port = port
    this.password = "secret123"  // 敏感信息
    this.pool = new Array(1000)  // 大量数据
  }

  [inspect.custom](depth,%20options) {
    // 隐藏敏感信息，简化输出
    return `${options.stylize("DatabaseConnection", "special")}<${this.host}:${this.port}>`
  }
}

const db = new DatabaseConnection("localhost", 5432)
console.log(db) // DatabaseConnection<localhost:5432>
```

### 常见问题

#### Q1: promisify 转换后 this 绑定丢失

```javascript
const fs = require("fs")
const { promisify } = require("node:util")

// 问题：this 绑定丢失
const stat = promisify(fs.stat)
stat("./test.txt") // 可能出错

// 解决方案 1：使用 bind
const statBound = promisify(fs.stat.bind(fs))

// 解决方案 2：使用 fs.promises（推荐）
const { stat: statAsync } = require("fs/promises")
```

#### Q2: debuglog 在 Windows 下不工作

```powershell
# PowerShell
$env:NODE_DEBUG="myapp"
node index.js

# CMD
set NODE_DEBUG=myapp
node index.js
```

#### Q3: styleText 在非 TTY 环境无颜色

```javascript
const { styleText } = require("node:util")

// 检查是否支持颜色
if (process.stdout.isTTY) {
  console.log(styleText("green", "成功"))
} else {
  // 禁用验证，强制输出 ANSI 码（可能产生乱码）
  console.log(styleText("green", "成功", { validateStream: false }))
}

// 或使用 FORCE_COLOR 环境变量
// FORCE_COLOR=1 node script.js
```

#### Q4: inspect 输出被截断

```javascript
const util = require("util")

const bigData = { arr: new Array(10000).fill(0) }

// 默认会截断
console.log(util.inspect(bigData))

// 不截断
console.log(util.inspect(bigData, {
  maxArrayLength: null,
  maxStringLength: null,
  depth: null
}))
```

#### Q5: isDeepStrictEqual 与 JSON.stringify 比较

```javascript
const util = require("util")

const obj1 = { a: 1, b: 2 }
const obj2 = { b: 2, a: 1 }

// JSON.stringify 无法正确比较（属性顺序影响）
console.log(JSON.stringify(obj1) === JSON.stringify(obj2)) // false

// isDeepStrictEqual 正确比较
console.log(util.isDeepStrictEqual(obj1, obj2)) // true

// 特殊对象比较
const date1 = new Date("2024-01-01")
const date2 = new Date("2024-01-01")
console.log(util.isDeepStrictEqual(date1, date2)) // true
console.log(JSON.stringify(date1) === JSON.stringify(date2)) // true
```

#### Q6: inherits 与 extends 的选择

```javascript
// 旧代码维护：继续使用 inherits
// 新代码开发：使用 ES6 class extends

// ES6 方式更清晰，支持静态方法继承
class Animal {
  constructor(name) {
    this.name = name
  }
  static create(name) {
    return new this(name)
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name)
    this.breed = breed
  }
}

const dog = Dog.create("Buddy")
```

### 版本检测与兼容性

```javascript
const util = require("util")
const semver = require("semver")

// 检测功能是否可用
const features = {
  styleText: typeof util.styleText === "function",
  parseArgs: typeof util.parseArgs === "function",
  getSystemErrorMap: typeof util.getSystemErrorMap === "function",
  MIMEType: typeof util.MIMEType === "function"
}

console.log("功能支持:", features)

// 根据版本选择实现
if (features.styleText) {
  const { styleText } = util
  module.exports.logError = (msg) => console.log(styleText("red", msg))
} else {
  // 回退方案
  module.exports.logError = (msg) => console.log(`[ERROR] ${msg}`)
}
```

## 总结

`util` 模块作为 Node.js 的核心工具集，提供了丰富的实用功能：

| 类别         | 核心方法                                        | 主要用途                     |
| ------------ | ----------------------------------------------- | ---------------------------- |
| 字符串处理   | `format`, `formatWithOptions`, `inspect`        | 调试输出、日志格式化         |
| 异步转换     | `promisify`, `callbackify`                      | 回调与 Promise 互转          |
| 开发辅助     | `debuglog`, `deprecate`                         | 条件日志、废弃标记           |
| 类型检测     | `types.*`, `isDeepStrictEqual`                  | 精确类型判断、深度比较       |
| 终端输出     | `styleText`, `stripVTControlCharacters`         | 彩色输出、ANSI 处理          |
| 错误处理     | `getSystemErrorName`, `getSystemErrorMap`       | 系统错误信息                 |
| 命令行       | `parseArgs`                                     | 参数解析                     |
| 编解码       | `TextEncoder`, `TextDecoder`                    | UTF-8 编解码                 |
| MIME 处理    | `MIMEType`, `MIMEParams`                        | MIME 类型操作                |
| 环境变量     | `parseEnv`                                      | .env 文件解析                |

**版本建议：**
- 新项目优先使用 Node.js 20+，可获得 `styleText`、`parseEnv` 等新特性
- 维护旧代码时注意 `inherits` 已废弃，推荐迁移到 ES6 class
- 使用 `promisify` 时优先考虑原生 Promise API（如 `fs/promises`）

**推荐阅读：**
- [Node.js 官方文档 - util 模块](https://nodejs.org/api/util.html)
- [MDN - TextEncoder](https://developer.mozilla.org/zh-CN/docs/Web/API/TextEncoder)
- [MDN - TextDecoder](https://developer.mozilla.org/zh-CN/docs/Web/API/TextDecoder)
