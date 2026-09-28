---
title: Process 进程对象
description: process 对象的环境变量、信号、退出码、stdin/stdout 与未捕获异常处理
keywords: [Node.js, process, child_process, cluster]
category: Node.js
tags: [Node.js, 核心模块]
---







# Process 进程对象

Node.js 提供了多个与进程相关的模块，用于管理和控制进程、创建子进程以及实现多进程架构。主要包括 `process`、`child_process` 和 `cluster` 三个核心模块。

## 系统架构概述

### 进程模块架构图

```
┌─────────────────────────────────────────────────────────────┐
│                       Node.js 进程管理                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │   process 模块   │  │ child_process   │  │ cluster 模块 │ │
│  │                 │  │      模块        │  │             │ │
│  │  - 进程信息      │  │                 │  │  - 多进程架构 │ │
│  │  - 环境变量      │  │  - spawn        │  │  - 负载均衡   │ │
│  │  - 信号处理      │  │  - exec         │  │  - 进程通信   │ │
│  │  - 标准I/O      │  │  - execFile     │  │  - 自动重启   │ │
│  └─────────────────┘  │  - fork         │  └─────────────┘ │
│                       └──────────────────┘                   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    主进程 (Master)                       │  │
│  │  - 监听端口                                              │  │
│  │  - 管理工作进程                                          │  │
│  │  - 负载分发                                              │  │
│  └────────────────────────────────────────────────────────┘  │
│                          │                                    │
│         ┌────────────────┼────────────────┐                  │
│         ▼                ▼                ▼                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Worker 进程1 │  │ Worker 进程2 │  │ Worker 进程N │          │
│  │             │  │             │  │             │          │
│  │ - 处理请求   │  │ - 处理请求   │  │ - 处理请求   │          │
│  │ - 业务逻辑   │  │ - 业务逻辑   │  │ - 业务逻辑   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 进程通信方式对比

| 通信方式 | 适用场景 | 性能 | 复杂度 | 说明 |
|---------|---------|------|--------|------|
| **stdin/stdout** | 简单数据传输 | 中 | 低 | 通过标准输入输出流通信 |
| **IPC 消息** | Node.js 进程间 | 高 | 中 | 通过 `process.send()` 通信 |
| **共享内存** | 高性能需求 | 最高 | 高 | 需要额外模块支持 |
| **TCP/UDP** | 跨机器通信 | 中 | 中 | 网络套接字通信 |
| **文件/数据库** | 持久化数据 | 低 | 低 | 通过文件系统或数据库 |

## process 模块

`process` 模块是一个全局对象，提供有关当前 Node.js 进程的信息并对其进行控制。它不需要使用 `require()` 引入，可以直接使用。

### API 速查表

#### 进程信息属性

| 属性/方法 | 返回值类型 | 功能描述 |
|----------|-----------|---------|
| `process.pid` | Number | 当前进程 ID |
| `process.cwd()` | String | 当前工作目录 |
| `process.chdir(dir)` | void | 改变工作目录 |
| `process.version` | String | Node.js 版本 |
| `process.versions` | Object | Node.js 及依赖版本 |
| `process.platform` | String | 操作系统平台 |
| `process.arch` | String | CPU 架构 |
| `process.env` | Object | 环境变量对象 |
| `process.argv` | Array | 命令行参数数组 |
| `process.argv0` | String | 启动时的进程名 |
| `process.execPath` | String | Node.js 可执行文件路径 |
| `process.execArgv` | Array | Node.js 命令行选项 |
| `process.title` | String | 进程名称（可读写） |
| `process.hrtime()` | Array | 高精度时间 |
| `process.uptime()` | Number | 进程运行时间（秒） |

#### 内存相关方法

| 方法 | 返回值类型 | 功能描述 |
|------|-----------|---------|
| `process.memoryUsage()` | Object | 内存使用情况 |
| `process.memoryUsage.rss()` | Number | RSS 内存使用量 |
| `process.cpuUsage([prevValue])` | Object | CPU 使用情况 |
| `process.resourceUsage()` | Object | 资源使用情况（v12.6.0+） |

#### 进程控制方法

| 方法 | 返回值类型 | 功能描述 |
|------|-----------|---------|
| `process.exit([code])` | void | 退出进程 |
| `process.exitCode` | Number | 退出码（可读写） |
| `process.kill(pid[, signal])` | boolean | 发送信号给进程 |
| `process.abort()` | void | 立即终止进程 |
| `process.nextTick(callback)` | void | 下个事件循环执行 |
| `process.emitWarning(warning)` | void | 发出警告 |

#### 标准流属性

| 属性 | 类型 | 功能描述 |
|------|------|---------|
| `process.stdin` | Stream | 标准输入流 |
| `process.stdout` | Stream | 标准输出流 |
| `process.stderr` | Stream | 标准错误流 |

### 模块特性

#### 核心功能

- **进程信息管理**：获取进程 ID、工作目录、运行时间等信息
- **环境变量访问**：读写环境变量，配置应用运行环境
- **进程控制**：退出进程、发送信号、管理进程生命周期
- **标准 I/O 流**：处理标准输入、输出和错误流
- **信号处理**：捕获和处理系统信号（如 SIGINT、SIGTERM）
- **命令行参数**：解析和处理命令行参数
- **性能监控**：获取内存使用、CPU 使用等性能指标

#### 全局特性

`process` 对象是全局的，可以在任何模块中直接访问：

```javascript
// ❌ 不需要这样
const process = require('process')

// ✅ 直接使用
console.log(process.pid)
```

### 进程信息

#### 获取进程 ID `pid`

`process.pid` 返回当前进程的进程 ID。

**语法：**

```javascript
process.pid
```

**返回值：** Number - 当前进程的进程 ID

**示例：**

```javascript
console.log("当前进程 ID:", process.pid)
// 输出：当前进程 ID: 12345
```

**使用场景：**
- 日志记录中标识进程
- 进程管理和监控
- 创建唯一的临时文件名

#### 获取进程工作目录 `cwd`

`process.cwd()` 返回当前进程的工作目录。

**语法：**

```javascript
process.cwd()
```

**返回值：** String - 当前工作目录的绝对路径

**示例：**

```javascript
console.log("当前工作目录:", process.cwd())
// 输出：当前工作目录: /Users/username/project
```

**注意事项：**
- 工作目录是执行 `node` 命令时所在的目录
- 与 `__dirname` 不同，`__dirname` 是当前文件所在目录

#### 改变工作目录 `chdir`

`process.chdir(directory)` 改变当前进程的工作目录。

**语法：**

```javascript
process.chdir(directory)
```

**参数：**
- `directory` (String): 要切换到的目录路径

**异常：** 如果目录不存在或无权限访问，会抛出异常

**示例：**

```javascript
console.log("当前目录:", process.cwd())
// 输出：当前目录: /Users/username/project

try {
  process.chdir("/tmp")
  console.log("新目录:", process.cwd())
  // 输出：新目录: /tmp
} catch (err) {
  console.error("切换目录失败:", err.message)
}
```

#### 获取 Node.js 版本信息

**语法：**

```javascript
process.version      // Node.js 版本
process.versions     // 所有依赖版本
process.platform     // 操作系统平台
process.arch         // CPU 架构
```

**返回值说明：**

| 属性 | 返回值类型 | 示例 | 说明 |
|------|-----------|------|------|
| `version` | String | `v18.17.0` | Node.js 版本 |
| `versions` | Object | `{ node: '18.17.0', v8: '10.2.154...' }` | 包含所有依赖版本 |
| `platform` | String | `darwin`, `win32`, `linux` | 操作系统平台 |
| `arch` | String | `x64`, `arm64`, `ia32` | CPU 架构 |

**示例：**

```javascript
console.log("Node.js 版本:", process.version)
// 输出：Node.js 版本: v18.17.0

console.log("平台信息:", process.platform)
// 输出：平台信息: darwin

console.log("架构信息:", process.arch)
// 输出：架构信息: x64

// 获取详细版本信息
console.log("V8 版本:", process.versions.v8)
console.log("OpenSSL 版本:", process.versions.openssl)
console.log("所有版本:", process.versions)
```

#### 获取环境变量 `env`

`process.env` 包含用户环境的对象。

**语法：**

```javascript
process.env
```

**返回值：** Object - 环境变量对象

**示例：**

```javascript
// 获取所有环境变量
console.log(process.env)

// 获取特定环境变量
console.log("PATH:", process.env.PATH)
console.log("HOME:", process.env.HOME)
console.log("USER:", process.env.USER)

// 设置环境变量（仅对当前进程及其子进程有效）
process.env.NODE_ENV = "production"
process.env.MY_VARIABLE = "my_value"
console.log("NODE_ENV:", process.env.NODE_ENV)

// 删除环境变量
delete process.env.MY_VARIABLE
```

**常见环境变量：**

| 变量名 | 说明 | 示例 |
|-------|------|------|
| `NODE_ENV` | 应用运行环境 | `development`, `production`, `test` |
| `PORT` | 应用监听端口 | `3000`, `8080` |
| `PATH` | 可执行文件搜索路径 | `/usr/local/bin:/usr/bin` |
| `HOME` | 用户主目录 | `/Users/username` |
| `PWD` | 当前工作目录 | `/Users/username/project` |
| `USER` | 当前用户名 | `username` |

**最佳实践：**

```javascript
// ✅ 使用默认值
const port = process.env.PORT || 3000
const env = process.env.NODE_ENV || 'development'

// ✅ 验证必需的环境变量
function validateEnv() {
  const required = ['DATABASE_URL', 'SECRET_KEY']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`缺少必需的环境变量: ${missing.join(', ')}`)
  }
}

// ✅ 使用 dotenv 模块加载 .env 文件
// npm install dotenv
require('dotenv').config()
```

#### 获取内存使用情况 `memoryUsage`

**语法：**

```javascript
process.memoryUsage()
```

**返回值：** Object - 包含内存使用信息的对象

**返回值字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `rss` | Number | 常驻集大小（Resident Set Size），进程占用的物理内存总量 |
| `heapTotal` | Number | V8 分配的堆内存总量 |
| `heapUsed` | Number | V8 已使用的堆内存量 |
| `external` | Number | V8 管理的 JavaScript 对象占用的内存（如 ArrayBuffer） |
| `arrayBuffers` | Number | ArrayBuffer 和 SharedArrayBuffer 占用的内存 |

**示例：**

```javascript
const usage = process.memoryUsage()

console.log("内存使用情况:")
console.log("  rss:", (usage.rss / 1024 / 1024).toFixed(2), "MB")
console.log("  heapTotal:", (usage.heapTotal / 1024 / 1024).toFixed(2), "MB")
console.log("  heapUsed:", (usage.heapUsed / 1024 / 1024).toFixed(2), "MB")
console.log("  external:", (usage.external / 1024 / 1024).toFixed(2), "MB")
console.log("  arrayBuffers:", (usage.arrayBuffers / 1024 / 1024).toFixed(2), "MB")

// 输出示例：
// 内存使用情况:
//   rss: 45.23 MB
//   heapTotal: 8.19 MB
//   heapUsed: 6.12 MB
//   external: 2.34 MB
//   arrayBuffers: 0.12 MB
```

**内存监控工具：**

```javascript
// 内存监控类
class MemoryMonitor {
  constructor(interval = 5000) {
    this.interval = interval
    this.timer = null
  }

  start() {
    this.timer = setInterval(() => {
      const usage = process.memoryUsage()
      const heapUsedMB = (usage.heapUsed / 1024 / 1024).toFixed(2)
      const rssMB = (usage.rss / 1024 / 1024).toFixed(2)
      
      console.log(`[${new Date().toISOString()}]`)
      console.log(`  堆内存使用: ${heapUsedMB} MB`)
      console.log(`  RSS 内存: ${rssMB} MB`)
    }, this.interval)
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}

// 使用示例
const monitor = new MemoryMonitor(3000)
monitor.start()

// 应用结束时停止监控
process.on('SIGTERM', () => {
  monitor.stop()
})
```

### 进程控制

#### 退出进程 `exit`

**语法：**

```javascript
process.exit([code])
```

**参数：**
- `code` (Number, 可选): 退出码，默认为 0

**退出码约定：**

| 退出码 | 说明 |
|-------|------|
| 0 | 成功退出 |
| 1 | 未捕获的致命异常 |
| 2 | 未使用（保留给 Bash） |
| 3 | 内部 JavaScript 解析错误 |
| 4 | 内部 JavaScript 执行失败 |
| 5 | 致命错误 |
| 6 | 未捕获的异常处理函数异常 |
| 7 | 内部异常处理函数运行时失败 |
| 8 | 未使用 |
| 9 | 无效参数 |
| 10 | 内部 JavaScript 运行时失败 |
| 12 | 无效调试参数 |
| >128 | 信号退出（128 + 信号值） |

**示例：**

```javascript
// 正常退出
process.exit(0)

// 异常退出
process.exit(1)

// 带清理操作的退出
function gracefulExit() {
  console.log("正在清理资源...")
  // 执行清理操作
  setTimeout(() => {
    console.log("退出进程")
    process.exit(0)
  }, 1000)
}

gracefulExit()
```

**注意事项：**
- 调用 `process.exit()` 会强制进程立即退出
- 不会等待任何异步操作完成
- 会触发 `exit` 事件，但不会触发 `beforeExit` 事件
- 建议设置 `process.exitCode` 而不是直接调用 `process.exit()`

#### 设置退出码 `exitCode`

**语法：**

```javascript
process.exitCode = code
```

**示例：**

```javascript
// 设置退出码，但不立即退出
process.exitCode = 1

// 进程自然结束后使用此退出码
// 允许异步操作完成
```

**优点：**
- 允许进程自然结束
- 等待所有异步操作完成
- 触发 `beforeExit` 事件

#### 监听退出事件

**事件类型：**

| 事件名 | 触发时机 | 是否可执行异步操作 |
|-------|---------|------------------|
| `beforeExit` | 事件循环空闲，没有待处理的工作时 | ✅ 可以 |
| `exit` | 进程即将退出时 | ❌ 只能执行同步操作 |

**示例：**

```javascript
// beforeExit 事件：可以安排异步工作
process.on("beforeExit", (code) => {
  console.log("进程即将退出，退出码:", code)
  
  // 可以安排异步工作，进程会继续运行
  setTimeout(() => {
    console.log("异步清理完成")
  }, 1000)
})

// exit 事件：只能执行同步操作
process.on("exit", (code) => {
  console.log("进程退出，退出码:", code)
  
  // ❌ 错误：异步操作不会被执行
  // setTimeout(() => console.log('不会执行'), 1000)
  
  // ✅ 正确：只执行同步操作
  console.log("同步清理完成")
})

// 注意：process.exit() 不会触发 beforeExit 事件
// process.exit(0)
```

#### 发送信号给进程 `kill`

**语法：**

```javascript
process.kill(pid[, signal])
```

**参数：**
- `pid` (Number): 进程 ID
- `signal` (String|Number, 可选): 要发送的信号，默认为 `'SIGTERM'`

**常用信号：**

| 信号 | 说明 |
|------|------|
| `SIGTERM` | 终止信号（优雅退出） |
| `SIGINT` | 中断信号（Ctrl+C） |
| `SIGHUP` | 挂起信号 |
| `SIGKILL` | 强制终止（无法捕获） |
| `SIGSTOP` | 暂停进程（无法捕获） |
| `SIGCONT` | 继续执行暂停的进程 |

**示例：**

```javascript
// 发送 SIGTERM 信号给进程 12345
process.kill(12345, 'SIGTERM')

// 检查进程是否存在
try {
  process.kill(12345, 0) // 信号 0 用于检测进程是否存在
  console.log('进程存在')
} catch (err) {
  console.log('进程不存在')
}
```

#### 进程标题 `title`

**语法：**

```javascript
process.title // 获取进程标题
process.title = '新标题' // 设置进程标题
```

**示例：**

```javascript
console.log('当前进程标题:', process.title)
// 输出：当前进程标题: node

// 设置进程标题（在 ps、top 等命令中显示）
process.title = 'my-awesome-app'
console.log('新进程标题:', process.title)
// 输出：新进程标题: my-awesome-app
```

#### 高精度时间 `hrtime`

**语法：**

```javascript
process.hrtime([time])
process.hrtime.bigint()
```

**返回值：**
- `hrtime()`: [秒, 纳秒] 数组
- `hrtime.bigint()`: BigInt 纳秒数

**示例：**

```javascript
// 获取当前时间
const start = process.hrtime()

// 执行一些操作
for (let i = 0; i < 1000000; i++) {}

// 计算耗时
const end = process.hrtime(start)
console.log(`耗时: ${end[0]} 秒 ${end[1]} 纳秒`)
// 输出：耗时: 0 秒 1234567 纳秒

// 使用 BigInt 方式（更精确）
const startBig = process.hrtime.bigint()
for (let i = 0; i < 1000000; i++) {}
const endBig = process.hrtime.bigint()
console.log(`耗时: ${endBig - startBig} 纳秒`)
```

#### 下一个事件循环 `nextTick`

**语法：**

```javascript
process.nextTick(callback[, ...args])
```

**参数：**
- `callback` (Function): 要执行的回调函数
- `...args`: 传递给回调函数的参数

**示例：**

```javascript
console.log('1. 开始')

process.nextTick(() => {
  console.log('3. nextTick 回调')
})

Promise.resolve().then(() => {
  console.log('4. Promise 回调')
})

setTimeout(() => {
  console.log('5. setTimeout 回调')
}, 0)

console.log('2. 结束')

// 输出顺序：
// 1. 开始
// 2. 结束
// 3. nextTick 回调
// 4. Promise 回调
// 5. setTimeout 回调
```

**执行顺序：**
1. 同步代码
2. `process.nextTick` 队列
3. Promise 微任务队列
4. 定时器（setTimeout/setInterval）
5. I/O 回调
6. setImmediate

**注意事项：**
- `process.nextTick` 优先级高于 Promise
- 不要递归调用 `nextTick`，会导致 I/O 饥饿
- 对于 I/O 密集型应用，推荐使用 `setImmediate`

### 标准输入输出

#### 标准输入 `stdin`

`process.stdin` 是一个可读流（Readable Stream），用于从标准输入读取数据。

**语法：**

```javascript
process.stdin
```

**常用方法：**

| 方法 | 说明 |
|------|------|
| `setEncoding(encoding)` | 设置编码格式 |
| `resume()` | 恢复流 |
| `pause()` | 暂停流 |
| `on('data', callback)` | 监听数据事件 |
| `on('end', callback)` | 监听结束事件 |

**示例：**

```javascript
// 从标准输入读取数据
process.stdin.setEncoding('utf8')

process.stdin.on('data', (chunk) => {
  console.log('接收到输入:', chunk)
  if (chunk.trim() === 'exit') {
    process.exit(0)
  }
})

process.stdin.on('end', () => {
  console.log('输入流结束')
})

// 暂停和恢复输入
process.stdin.pause()
setTimeout(() => {
  console.log('恢复输入...')
  process.stdin.resume()
}, 3000)
```

**交互式命令行示例：**

```javascript
const readline = require('readline')

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

rl.question('请输入你的名字: ', (answer) => {
  console.log(`你好, ${answer}!`)
  rl.close()
})
```

#### 标准输出 `stdout`

`process.stdout` 是一个可写流（Writable Stream），用于向标准输出写入数据。

**语法：**

```javascript
process.stdout.write(data[, encoding][, callback])
```

**参数：**
- `data` (String|Buffer): 要写入的数据
- `encoding` (String, 可选): 编码格式，默认为 'utf8'
- `callback` (Function, 可选): 写入完成后的回调函数

**示例：**

```javascript
// 标准输出
process.stdout.write('这是标准输出\n')

// 输出进度条
function showProgress(percent) {
  const width = 50
  const completed = Math.floor(width * percent / 100)
  const bar = '█'.repeat(completed) + '░'.repeat(width - completed)
  
  // \r 回到行首覆盖输出
  process.stdout.write(`\r进度: [${bar}] ${percent}%`)
  
  if (percent === 100) {
    process.stdout.write('\n完成!\n')
  }
}

// 模拟进度
let progress = 0
const timer = setInterval(() => {
  progress += 10
  showProgress(progress)
  if (progress >= 100) {
    clearInterval(timer)
  }
}, 500)
```

#### 标准错误 `stderr`

`process.stderr` 是一个可写流，用于向标准错误输出写入数据。

**示例：**

```javascript
// 标准错误输出
process.stderr.write('这是错误输出\n')

// 使用 console.error（内部使用 process.stderr）
console.error('错误信息')

// 错误处理
function logError(message) {
  const timestamp = new Date().toISOString()
  process.stderr.write(`[${timestamp}] ERROR: ${message}\n`)
}

logError('数据库连接失败')
```

#### console 与 process.stdio 的关系

```javascript
// console.log 内部使用 process.stdout
console.log('Hello')
// 等价于
process.stdout.write('Hello\n')

// console.error 内部使用 process.stderr
console.error('Error')
// 等价于
process.stderr.write('Error\n')
```

### 信号处理

#### 常用信号列表

| 信号 | 说明 | 触发方式 | 默认行为 |
|------|------|---------|---------|
| `SIGINT` | 中断信号 | Ctrl+C | 终止进程 |
| `SIGTERM` | 终止信号 | `kill` 命令 | 终止进程 |
| `SIGHUP` | 挂起信号 | 终端关闭 | 终止进程 |
| `SIGUSR1` | 用户自定义信号1 | `kill -USR1` | 启动调试器 |
| `SIGUSR2` | 用户自定义信号2 | `kill -USR2` | 无默认行为 |
| `SIGKILL` | 强制终止 | `kill -9` | 立即终止（无法捕获） |
| `SIGSTOP` | 暂停进程 | `kill -STOP` | 暂停（无法捕获） |

#### 捕获信号示例

**示例：**

```javascript
// 监听 SIGINT 信号（Ctrl+C）
process.on('SIGINT', () => {
  console.log('\n收到 SIGINT 信号，正在优雅退出...')
  // 执行清理操作
  cleanup()
  process.exit(0)
})

// 监听 SIGTERM 信号（终止信号）
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在优雅退出...')
  cleanup()
  process.exit(0)
})

// 清理函数
function cleanup() {
  console.log('正在关闭数据库连接...')
  console.log('正在保存数据...')
  console.log('清理完成')
}

// 监听未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err)
  // 执行清理操作后退出
  cleanup()
  process.exit(1)
})

// 监听未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason)
  // 可以选择退出或记录错误
})

// 用户自定义信号
process.on('SIGUSR1', () => {
  console.log('收到 SIGUSR1 信号')
  // 可以用于触发某些操作，如重新加载配置
})

process.on('SIGUSR2', () => {
  console.log('收到 SIGUSR2 信号')
  // 可以用于生成性能报告
})
```

**优雅退出实现：**

```javascript
class GracefulShutdown {
  constructor() {
    this.isShuttingDown = false
    this.connections = new Set()
    this.setupSignals()
  }

  setupSignals() {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'))
    process.on('SIGINT', () => this.shutdown('SIGINT'))
    process.on('uncaughtException', (err) => {
      console.error('未捕获的异常:', err)
      this.shutdown('uncaughtException', 1)
    })
    process.on('unhandledRejection', (reason) => {
      console.error('未处理的 Promise 拒绝:', reason)
      this.shutdown('unhandledRejection', 1)
    })
  }

  async shutdown(signal, exitCode = 0) {
    if (this.isShuttingDown) return
    this.isShuttingDown = true

    console.log(`\n收到 ${signal} 信号，开始优雅退出...`)

    // 设置强制退出超时
    const forceExit = setTimeout(() => {
      console.error('强制退出')
      process.exit(1)
    }, 10000)

    try {
      // 关闭所有连接
      await this.closeConnections()
      console.log('所有连接已关闭')
      
      clearTimeout(forceExit)
      console.log('优雅退出完成')
      process.exit(exitCode)
    } catch (err) {
      console.error('退出过程中出错:', err)
      process.exit(1)
    }
  }

  async closeConnections() {
    const closePromises = Array.from(this.connections).map(conn => {
      return new Promise((resolve) => {
        conn.close(resolve)
      })
    })
    await Promise.all(closePromises)
  }

  addConnection(connection) {
    this.connections.add(connection)
    connection.on('close', () => {
      this.connections.delete(connection)
    })
  }
}

// 使用示例
const shutdown = new GracefulShutdown()
// shutdown.addConnection(server)
```

### 命令行参数

#### 获取命令行参数 `argv`

`process.argv` 返回一个数组，包含启动 Node.js 进程时的命令行参数。

**语法：**

```javascript
process.argv
```

**返回值：** Array - 命令行参数数组

**数组结构：**

```
process.argv[0]  -> Node.js 可执行文件路径
process.argv[1]  -> 正在执行的 JavaScript 文件路径
process.argv[2]  -> 第一个命令行参数
process.argv[3]  -> 第二个命令行参数
...
```

**示例：**

```bash
# 执行命令
node app.js --port 3000 --env production

# process.argv 值
[
  '/usr/local/bin/node',  // Node.js 路径
  '/path/to/app.js',      // 脚本路径
  '--port',               // 参数1
  '3000',                 // 参数2
  '--env',                // 参数3
  'production'            // 参数4
]
```

**解析命令行参数：**

```javascript
// 简单参数解析
function parseArgs() {
  const args = process.argv.slice(2)
  const result = {}
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const value = args[i + 1]
      
      if (value && !value.startsWith('--')) {
        result[key] = value
        i++
      } else {
        result[key] = true
      }
    }
  }
  
  return result
}

const args = parseArgs()
console.log('解析后的参数:', args)
// 输出：{ port: '3000', env: 'production' }
```

**使用 commander 库（推荐）：**

```javascript
const { program } = require('commander')

program
  .version('1.0.0')
  .option('-p, --port <port>', '端口号', '3000')
  .option('-e, --env <environment>', '运行环境', 'development')
  .parse(process.argv)

console.log('端口:', program.opts().port)
console.log('环境:', program.opts().env)
```

#### Node.js 启动参数 `execArgv`

`process.execArgv` 包含启动 Node.js 进程时的 Node.js 特定命令行选项。

**示例：**

```bash
# 执行命令
node --harmony --require ./setup.js app.js

# process.execArgv 值
['--harmony', '--require', './setup.js']
```

```javascript
console.log('Node.js 启动参数:', process.execArgv)
```

### 进程性能监控

#### CPU 使用情况 `cpuUsage`

**语法：**

```javascript
process.cpuUsage([previousValue])
```

**返回值：** Object - CPU 使用情况

```javascript
{
  user: Number,   // 用户态 CPU 时间（微秒）
  system: Number  // 内核态 CPU 时间（微秒）
}
```

**示例：**

```javascript
// 获取当前 CPU 使用情况
const startUsage = process.cpuUsage()

// 执行一些操作
for (let i = 0; i < 10000000; i++) {
  Math.random()
}

// 计算增量
const endUsage = process.cpuUsage(startUsage)

console.log('CPU 使用情况:')
console.log('  用户态:', (endUsage.user / 1000).toFixed(2), 'ms')
console.log('  内核态:', (endUsage.system / 1000).toFixed(2), 'ms')
console.log('  总计:', ((endUsage.user + endUsage.system) / 1000).toFixed(2), 'ms')
```

#### 进程运行时间 `uptime`

**语法：**

```javascript
process.uptime()
```

**返回值：** Number - 进程运行时间（秒）

**示例：**

```javascript
console.log('进程已运行:', process.uptime().toFixed(2), '秒')

// 定期输出运行时间
setInterval(() => {
  const uptime = process.uptime()
  const hours = Math.floor(uptime / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  const seconds = Math.floor(uptime % 60)
  
  console.log(`运行时间: ${hours}时 ${minutes}分 ${seconds}秒`)
}, 10000)
```

#### 资源使用情况 `resourceUsage` (v12.6.0+)

**语法：**

```javascript
process.resourceUsage()
```

**返回值：** Object - 资源使用情况

**示例：**

```javascript
const usage = process.resourceUsage()

console.log('资源使用情况:')
console.log('  用户态 CPU 时间:', (usage.userCPUTime / 1000000).toFixed(2), 'ms')
console.log('  内核态 CPU 时间:', (usage.systemCPUTime / 1000000).toFixed(2), 'ms')
console.log('  最大常驻集大小:', (usage.maxRSS / 1024).toFixed(2), 'KB')
console.log('  共享内存大小:', (usage.sharedMemorySize / 1024).toFixed(2), 'KB')
console.log('  未共享数据大小:', (usage.unsharedDataSize / 1024).toFixed(2), 'KB')
console.log('  页面错误（软）:', usage.softPageFaults)
console.log('  页面错误（硬）:', usage.hardPageFaults)
console.log('  文件系统输入:', usage.fsRead, '次')
console.log('  文件系统输出:', usage.fsWrite, '次')
console.log('  IPC 消息发送:', usage.ipcSent, '次')
console.log('  IPC 消息接收:', usage.ipcReceived, '次')
```

### 综合示例：进程监控工具

```javascript
// 进程监控工具
class ProcessMonitor {
  constructor(options = {}) {
    this.interval = options.interval || 5000
    this.timer = null
    this.startCpuUsage = process.cpuUsage()
    this.startTime = Date.now()
  }

  start() {
    this.timer = setInterval(() => {
      this.report()
    }, this.interval)
    
    console.log('进程监控已启动')
    this.report()
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    console.log('进程监控已停止')
  }

  report() {
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage(this.startCpuUsage)
    const uptime = process.uptime()
    
    console.log('\n=== 进程状态报告 ===')
    console.log(`时间: ${new Date().toLocaleString()}`)
    console.log(`进程 ID: ${process.pid}`)
    console.log(`运行时长: ${this.formatUptime(uptime)}`)
    
    console.log('\n内存使用:')
    console.log(`  RSS: ${this.formatBytes(memUsage.rss)}`)
    console.log(`  堆总量: ${this.formatBytes(memUsage.heapTotal)}`)
    console.log(`  堆使用: ${this.formatBytes(memUsage.heapUsed)}`)
    console.log(`  外部内存: ${this.formatBytes(memUsage.external)}`)
    
    console.log('\nCPU 使用:')
    console.log(`  用户态: ${(cpuUsage.user / 1000).toFixed(2)} ms`)
    console.log(`  内核态: ${(cpuUsage.system / 1000).toFixed(2)} ms`)
    
    console.log('\n系统信息:')
    console.log(`  平台: ${process.platform}`)
    console.log(`  架构: ${process.arch}`)
    console.log(`  Node.js 版本: ${process.version}`)
  }

  formatBytes(bytes) {
    const mb = bytes / 1024 / 1024
    return `${mb.toFixed(2)} MB`
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours}时 ${minutes}分 ${secs}秒`
  }
}

// 使用示例
const monitor = new ProcessMonitor({ interval: 10000 })
monitor.start()

// 优雅退出
process.on('SIGINT', () => {
  monitor.stop()
  process.exit(0)
})
```

## child_process 模块

`child_process` 模块用于创建子进程，可以执行系统命令或运行其他脚本。它提供了多种方法来创建和管理子进程。

### 引入模块

```javascript
const { spawn, exec, execFile, fork, execSync, spawnSync, execFileSync } = require('child_process')

// Promise 版本（Node.js v12+）
const { promisify } = require('util')
const execAsync = promisify(exec)

// 或使用 child_process/promises 风格（Node.js v12+）
// const { exec: execPromise } = require('child_process').promises
```

### API 速查表

| 方法 | 说明 | 返回值 | 适用场景 |
|------|------|--------|---------|
| `spawn` | 启动子进程（流式） | ChildProcess | 大量数据输出、长时间运行 |
| `exec` | 执行命令（缓冲） | ChildProcess | 简单命令、输出数据量小 |
| `execFile` | 执行可执行文件 | ChildProcess | 执行外部程序 |
| `fork` | 创建 Node.js 子进程 | ChildProcess | Node.js 进程间通信 |
| `spawnSync` | 同步启动子进程 | Object | 需要同步执行的脚本 |
| `execSync` | 同步执行命令 | Buffer/String | CLI 工具、初始化脚本 |
| `execFileSync` | 同步执行文件 | Buffer/String | 同步执行外部程序 |

### 方法对比

#### 功能对比表

| 特性 | spawn | exec | execFile | fork |
|------|-------|------|----------|------|
| **输出方式** | 流式 | 缓冲 | 缓冲 | 流式 + IPC |
| **Shell 执行** | 可选 | 是 | 否 | 否 |
| **大量数据** | ✅ 适合 | ❌ 不适合 | ❌ 不适合 | ✅ 适合 |
| **IPC 通信** | ❌ 无 | ❌ 无 | ❌ 无 | ✅ 自动 |
| **性能** | 最高 | 中等 | 较高 | 高 |
| **适用场景** | 流处理、大输出 | 简单命令 | 执行程序 | Node.js 子进程 |

#### 选择指南

```
                    需要创建子进程
                         │
                         ▼
              ┌─────────────────────┐
              │  是 Node.js 进程？   │
              └─────────────────────┘
                    │         │
                   是         否
                    │         │
                    ▼         ▼
              ┌─────────┐  ┌──────────────┐
              │  fork   │  │ 输出数据量大？ │
              └─────────┘  └──────────────┘
                               │        │
                              是        否
                               │        │
                               ▼        ▼
                          ┌────────┐ ┌──────────────┐
                          │ spawn  │ │ 需要 Shell？  │
                          └────────┘ └──────────────┘
                                        │        │
                                       是        否
                                        │        │
                                        ▼        ▼
                                    ┌────────┐ ┌───────────┐
                                    │  exec  │ │ execFile  │
                                    └────────┘ └───────────┘
```

### spawn - 启动子进程（流式）

`spawn` 方法使用流式方式启动子进程，适合处理大量数据输出和长时间运行的进程。

**语法：**

```javascript
child_process.spawn(command[, args][, options])
```

**参数说明：**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `command` | String | 是 | 要运行的命令 |
| `args` | Array | 否 | 字符串参数数组 |
| `options` | Object | 否 | 配置选项 |

**options 配置项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `cwd` | String | null | 子进程的工作目录 |
| `env` | Object | process.env | 环境变量 |
| `argv0` | String | command | 设置进程名 |
| `stdio` | Array/String | 'pipe' | 标准输入输出配置 |
| `detached` | Boolean | false | 子进程是否独立于父进程 |
| `uid` | Number | null | 设置进程的用户 ID |
| `gid` | Number | null | 设置进程的组 ID |
| `shell` | Boolean/String | false | 是否使用 shell |
| `windowsVerbatimArguments` | Boolean | false | Windows 参数引用 |
| `windowsHide` | Boolean | false | 隐藏窗口（Windows） |

**返回值：** ChildProcess 实例

**ChildProcess 事件：**

| 事件 | 说明 |
|------|------|
| `close` | 子进程的 stdio 流关闭时触发 |
| `disconnect` | 父进程调用 `disconnect()` 时触发 |
| `error` | 无法生成进程或进程无法被杀死时触发 |
| `exit` | 子进程结束时触发 |
| `message` | 子进程使用 `process.send()` 发送消息时触发 |

**示例：**

```javascript
const { spawn } = require('child_process')

// 执行 ls 命令
const ls = spawn('ls', ['-lh', '/usr'])

ls.stdout.on('data', (data) => {
  console.log(`标准输出: ${data}`)
})

ls.stderr.on('data', (data) => {
  console.error(`错误输出: ${data}`)
})

ls.on('close', (code) => {
  console.log(`子进程退出，退出码: ${code}`)
})

// 监听错误
ls.on('error', (err) => {
  console.error('启动子进程失败:', err)
})
```

**执行带管道的命令：**

```javascript
const { spawn } = require('child_process')

// 执行 find 命令
const find = spawn('find', ['.', '-name', '*.js'])

find.stdout.on('data', (data) => {
  console.log(`找到文件: ${data}`)
})

find.stderr.on('data', (data) => {
  console.error(`错误: ${data}`)
})

find.on('close', (code) => {
  if (code !== 0) {
    console.log(`find 进程退出，退出码: ${code}`)
  }
})
```

**使用 spawn 执行 Node.js 脚本：**

```javascript
const { spawn } = require('child_process')

// 执行另一个 Node.js 脚本
const child = spawn('node', ['child.js'], {
  cwd: __dirname,
  env: { ...process.env, NODE_ENV: 'development' }
})

child.stdout.on('data', (data) => {
  console.log(`子进程输出: ${data}`)
})

child.stderr.on('data', (data) => {
  console.error(`子进程错误: ${data}`)
})

child.on('close', (code) => {
  console.log(`子进程退出，退出码: ${code}`)
})

// 向子进程发送数据（如果 stdin 是管道）
if (child.stdin.writable) {
  child.stdin.write('Hello from parent\n')
  child.stdin.end()
}
```

**使用 Shell：**

```javascript
const { spawn } = require('child_process')

// 在 shell 中执行命令（支持管道等 shell 特性）
const child = spawn('find . -name "*.js" | wc -l', {
  shell: true
})

child.stdout.on('data', (data) => {
  console.log(`文件数量: ${data}`)
})

// 或显式指定 shell
const child2 = spawn('echo $HOME', {
  shell: '/bin/bash'
})
```

**继承父进程的 stdio：**

```javascript
const { spawn } = require('child_process')

// 子进程使用父进程的输入输出
const child = spawn('npm', ['install'], {
  stdio: 'inherit'
})

child.on('close', (code) => {
  console.log(`npm install 完成，退出码: ${code}`)
})
```

### exec - 执行命令（缓冲）

`exec` 方法使用缓冲区执行命令，适合执行简单命令并获取完整输出。输出会被缓冲，适合输出数据量小的场景。

**语法：**

```javascript
child_process.exec(command[, options][, callback])
```

**参数说明：**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `command` | String | 是 | 要执行的命令（会在 shell 中执行） |
| `options` | Object | 否 | 配置选项 |
| `callback` | Function | 否 | 回调函数 |

**options 配置项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `cwd` | String | null | 子进程的工作目录 |
| `env` | Object | process.env | 环境变量 |
| `encoding` | String | 'utf8' | 输出编码 |
| `shell` | String | '/bin/sh' | 要使用的 shell |
| `timeout` | Number | 0 | 超时时间（毫秒） |
| `maxBuffer` | Number | 1024*1024 | 输出缓冲区最大大小（字节，1MB） |
| `killSignal` | String | 'SIGTERM' | 超时时发送的信号 |
| `uid` | Number | null | 进程用户 ID |
| `gid` | Number | null | 进程组 ID |
| `windowsHide` | Boolean | false | 隐藏窗口（Windows） |

**回调函数签名：**

```javascript
(error, stdout, stderr) => {
  // error: 错误对象（如果命令执行失败）
  // stdout: 标准输出
  // stderr: 标准错误输出
}
```

**示例：**

```javascript
const { exec } = require('child_process')

// 执行命令并获取输出
exec('ls -la', (error, stdout, stderr) => {
  if (error) {
    console.error(`执行错误: ${error.message}`)
    return
  }
  if (stderr) {
    console.error(`错误输出: ${stderr}`)
    return
  }
  console.log(`标准输出:\n${stdout}`)
})

// 带选项的执行
exec('git status', { cwd: '/path/to/repo' }, (error, stdout, stderr) => {
  if (error) {
    console.error(`执行错误: ${error.message}`)
    return
  }
  console.log(stdout)
})

// 设置超时
exec('sleep 10', { timeout: 5000 }, (error) => {
  if (error && error.killed) {
    console.error('命令超时，已终止')
  }
})
```

**使用 Promise：**

```javascript
const { promisify } = require('util')
const execAsync = promisify(exec)

async function runCommand() {
  try {
    const { stdout, stderr } = await execAsync('pwd')
    console.log('当前目录:', stdout.trim())
    
    const { stdout: files } = await execAsync('ls -la')
    console.log('文件列表:', files)
  } catch (error) {
    console.error('执行失败:', error.message)
  }
}

runCommand()
```

**Node.js v12+ Promise API：**

```javascript
const { exec: execPromise } = require('child_process').promises

async function runCommands() {
  try {
    // 执行多个命令
    const { stdout: pwd } = await execPromise('pwd')
    console.log('当前目录:', pwd.trim())
    
    const { stdout: date } = await execPromise('date')
    console.log('当前时间:', date.trim())
  } catch (error) {
    console.error('命令执行失败:', error)
  }
}

runCommands()
```

**注意事项：**
- 输出会被缓冲在内存中，不适合输出量大的命令
- 默认最大缓冲区为 1MB（`1024 * 1024` 字节，Node.js 12+；旧版本为 200KB），可通过 `maxBuffer` 调整
- 超出 `maxBuffer` 会终止进程并返回错误
- 命令在 shell 中执行，注意安全性（避免命令注入）

### execFile - 执行可执行文件

`execFile` 类似于 `exec`，但直接执行可执行文件，不通过 shell。性能更好，更安全。

**语法：**

```javascript
child_process.execFile(file[, args][, options][, callback])
```

**参数说明：**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `file` | String | 是 | 可执行文件名或路径 |
| `args` | Array | 否 | 参数数组 |
| `options` | Object | 否 | 配置选项 |
| `callback` | Function | 否 | 回调函数 |

**options 配置项：**

与 `exec` 相同，但 `shell` 选项默认为 `false`。

**示例：**

```javascript
const { execFile } = require('child_process')

// 执行可执行文件
execFile('node', ['--version'], (error, stdout, stderr) => {
  if (error) {
    console.error(`执行错误: ${error}`)
    return
  }
  console.log(`Node.js 版本: ${stdout.trim()}`)
})

// 执行带参数的可执行文件
execFile('echo', ['Hello', 'World'], (error, stdout, stderr) => {
  if (error) {
    console.error(`执行错误: ${error}`)
    return
  }
  console.log(stdout) // 输出: Hello World
})

// 执行 Python 脚本
execFile('python', ['script.py', 'arg1', 'arg2'], (error, stdout, stderr) => {
  if (error) {
    console.error(`执行错误: ${error}`)
    return
  }
  console.log('输出:', stdout)
})
```

**使用 Promise：**

```javascript
const { promisify } = require('util')
const execFileAsync = promisify(execFile)

async function runExecutable() {
  try {
    const { stdout } = await execFileAsync('node', ['--version'])
    console.log('Node.js 版本:', stdout.trim())
  } catch (error) {
    console.error('执行失败:', error)
  }
}

runExecutable()
```

**与 exec 的区别：**

```javascript
const { exec, execFile } = require('child_process')

// exec - 通过 shell 执行
exec('echo $HOME', (err, stdout) => {
  console.log('exec:', stdout.trim()) // 输出用户主目录
})

// execFile - 不通过 shell
execFile('echo', ['$HOME'], (err, stdout) => {
  console.log('execFile:', stdout.trim()) // 输出: $HOME
})

// execFile 需要 shell 才能解析环境变量
execFile('echo', ['$HOME'], { shell: true }, (err, stdout) => {
  console.log('execFile with shell:', stdout.trim())
})
```

**安全性对比：**

```javascript
const { exec, execFile } = require('child_process')

// ❌ 危险：命令注入风险
const userInput = 'file.txt; rm -rf /'
exec(`cat ${userInput}`, (err, stdout) => {
  // 会执行 rm -rf /，非常危险！
})

// ✅ 安全：参数不会被解释为命令
execFile('cat', [userInput], (err, stdout) => {
  // 只会尝试打开名为 "file.txt; rm -rf /" 的文件
  // 不会执行删除命令
})
```

### fork - 创建 Node.js 子进程

`fork` 是 `spawn` 的特殊形式，专门用于创建 Node.js 子进程，并自动建立 IPC（进程间通信）通道。

**语法：**

```javascript
child_process.fork(modulePath[, args][, options])
```

**参数说明：**

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `modulePath` | String | 是 | 要运行的模块路径 |
| `args` | Array | 否 | 参数数组 |
| `options` | Object | 否 | 配置选项 |

**options 配置项：**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `cwd` | String | null | 子进程的工作目录 |
| `env` | Object | process.env | 环境变量 |
| `execPath` | String | process.execPath | Node.js 可执行文件路径 |
| `execArgv` | Array | process.execArgv | Node.js 执行参数 |
| `silent` | Boolean | false | 是否静默模式（子进程的 stdio 不继承父进程） |
| `stdio` | Array/String | 'pipe' | 子进程的 stdio 配置 |
| `detached` | Boolean | false | 子进程是否独立 |
| `uid` | Number | null | 进程用户 ID |
| `gid` | Number | null | 进程组 ID |

**特点：**
- 自动建立 IPC 通信通道
- 子进程可以通过 `process.send()` 发送消息
- 父进程可以通过 `child.send()` 发送消息
- 默认情况下，子进程的 stdio 继承父进程

**示例：**

**主进程 (parent.js)：**

```javascript
const { fork } = require('child_process')

// 创建子进程
const child = fork('child.js')

console.log('主进程 PID:', process.pid)
console.log('子进程 PID:', child.pid)

// 向子进程发送消息
child.send({ message: 'Hello from parent', timestamp: Date.now() })

// 接收子进程消息
child.on('message', (msg) => {
  console.log('收到子进程消息:', msg)
})

// 监听子进程退出
child.on('exit', (code, signal) => {
  console.log(`子进程退出，退出码: ${code}, 信号: ${signal}`)
})

// 监听错误
child.on('error', (err) => {
  console.error('子进程错误:', err)
})

// 监听关闭
child.on('close', (code, signal) => {
  console.log(`子进程关闭，退出码: ${code}, 信号: ${signal}`)
})
```

**子进程 (child.js)：**

```javascript
console.log('子进程启动，PID:', process.pid)

// 接收父进程消息
process.on('message', (msg) => {
  console.log('收到父进程消息:', msg)
  
  // 向父进程发送消息
  process.send({
    message: 'Hello from child',
    received: msg,
    timestamp: Date.now()
  })
})

// 模拟一些工作
setTimeout(() => {
  process.send({ message: '工作完成' })
  process.exit(0)
}, 2000)

// 监听断开连接
process.on('disconnect', () => {
  console.log('与父进程的连接已断开')
})
```

**进程间通信示例：**

```javascript
// 主进程
const { fork } = require('child_process')

// 创建多个子进程
const workers = []
for (let i = 0; i < 4; i++) {
  const worker = fork('worker.js')
  
  workers.push(worker)
  
  // 发送任务
  worker.send({ taskId: i, data: `Task ${i}` })
  
  // 接收结果
  worker.on('message', (msg) => {
    console.log(`任务 ${msg.taskId} 完成:`, msg.result)
  })
}

// 所有任务完成后关闭
let completed = 0
workers.forEach(worker => {
  worker.on('exit', () => {
    completed++
    if (completed === workers.length) {
      console.log('所有任务完成')
    }
  })
})

// 子进程 (worker.js)
process.on('message', (msg) => {
  // 处理任务
  const result = processData(msg.data)
  
  // 发送结果
  process.send({
    taskId: msg.taskId,
    result: result
  })
  
  // 退出
  process.exit(0)
})

function processData(data) {
  // 模拟处理
  return `Processed: ${data}`
}
```

**断开连接：**

```javascript
const { fork } = require('child_process')

const child = fork('child.js')

child.send({ message: 'Hello' })

// 断开与子进程的 IPC 连接
setTimeout(() => {
  child.disconnect()
  console.log('已断开与子进程的连接')
}, 5000)

// 子进程
process.on('disconnect', () => {
  console.log('与父进程的连接已断开')
  process.exit(0)
})
```

### 子进程选项详解

#### stdio 配置

`stdio` 选项用于配置子进程的标准输入、输出和错误流。

**字符串简写：**

| 值 | 说明 | 等价数组 |
|------|------|---------|
| `'pipe'` | 创建管道（默认） | `['pipe', 'pipe', 'pipe']` |
| `'ignore'` | 忽略流 | `['ignore', 'ignore', 'ignore']` |
| `'inherit'` | 继承父进程的流 | `[0, 1, 2]` 或 `[process.stdin, process.stdout, process.stderr]` |
| `'overlapped'` | 重叠模式（Windows） | `['overlapped', 'overlapped', 'overlapped']` |

**数组形式：**

`[stdin, stdout, stderr, ...]`

每个元素可以是：
- `'pipe'` - 创建管道
- `'ignore'` - 忽略
- `'inherit'` - 继承父进程
- `Stream` - 使用指定的流对象
- `Number` - 使用父进程的文件描述符
- `null` / `undefined` - 使用默认值

**示例：**

```javascript
const { spawn } = require('child_process')
const fs = require('fs')

// 继承父进程的 stdio
const child1 = spawn('node', ['script.js'], {
  stdio: 'inherit'
})

// 忽略 stdin，管道 stdout 和 stderr
const child2 = spawn('node', ['script.js'], {
  stdio: ['ignore', 'pipe', 'pipe']
})

// 只捕获 stdout，忽略其他
const child3 = spawn('node', ['script.js'], {
  stdio: ['ignore', 'pipe', 'ignore']
})

// 将输出重定向到文件
const outFile = fs.openSync('output.txt', 'w')
const errFile = fs.openSync('error.txt', 'w')
const child4 = spawn('node', ['script.js'], {
  stdio: ['ignore', outFile, errFile]
})

// 使用第四个文件描述符
const child5 = spawn('node', ['script.js'], {
  stdio: ['pipe', 1, 2, 'pipe'] // stdin, stdout, stderr, fd4
})

// 使用自定义流
const { Writable } = require('stream')
class MyWritable extends Writable {
  _write(chunk, encoding, callback) {
    console.log('自定义输出:', chunk.toString())
    callback()
  }
}
const customStream = new MyWritable()
const child6 = spawn('node', ['script.js'], {
  stdio: ['ignore', customStream, 'pipe']
})
```

#### detached 选项

`detached` 选项使子进程独立于父进程运行。

**示例：**

```javascript
const { spawn } = require('child_process')

// 创建独立进程
const child = spawn('node', ['long-running-task.js'], {
  detached: true,
  stdio: 'ignore'
})

// 父进程可以退出，子进程继续运行
child.unref()

console.log('父进程可以退出，子进程 PID:', child.pid)
```

**注意事项：**
- 设置 `detached: true` 后，子进程会成为新的进程组领导者
- 需要调用 `child.unref()` 让父进程可以退出
- 通常配合 `stdio: 'ignore'` 使用

#### 环境变量配置

```javascript
const { spawn } = require('child_process')

// 继承并扩展环境变量
const child = spawn('node', ['app.js'], {
  env: {
    ...process.env,
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://localhost:5432/mydb',
    API_KEY: 'your-api-key'
  }
})

// 只使用特定环境变量
const child2 = spawn('node', ['app.js'], {
  env: {
    NODE_ENV: 'production',
    PATH: process.env.PATH
  }
})
```

#### 工作目录配置

```javascript
const { spawn } = require('child_process')
const path = require('path')

// 指定工作目录
const child = spawn('npm', ['install'], {
  cwd: path.join(__dirname, 'my-project')
})

// 动态切换工作目录
const child2 = spawn('git', ['status'], {
  cwd: '/path/to/repository'
})
```

### 同步执行方法

Node.js 还提供了同步版本的子进程方法。

#### execSync - 同步执行命令

```javascript
const { execSync } = require('child_process')

try {
  // 执行命令并获取输出
  const output = execSync('ls -la')
  console.log(output.toString())
  
  // 指定编码
  const output2 = execSync('echo "Hello"', { encoding: 'utf8' })
  console.log(output2)
  
  // 设置工作目录
  execSync('git status', { cwd: '/path/to/repo' })
  
  // 设置超时
  execSync('sleep 10', { timeout: 5000 })
} catch (error) {
  console.error('执行失败:', error.message)
}
```

#### spawnSync - 同步启动子进程

```javascript
const { spawnSync } = require('child_process')

const result = spawnSync('node', ['script.js'], {
  encoding: 'utf8'
})

console.log('状态:', result.status)
console.log('输出:', result.stdout)
console.log('错误:', result.stderr)
console.log('错误对象:', result.error)
```

#### execFileSync - 同步执行文件

```javascript
const { execFileSync } = require('child_process')

const output = execFileSync('node', ['--version'], { encoding: 'utf8' })
console.log('Node.js 版本:', output.trim())
```

### 综合示例：任务执行器

```javascript
const { spawn, exec, fork } = require('child_process')
const { promisify } = require('util')
const execAsync = promisify(exec)

// 使用 spawn 执行长时间运行的任务
function runLongTask(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit'
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`进程退出，退出码: ${code}`))
      }
    })

    child.on('error', (err) => {
      reject(err)
    })
  })
}

// 使用 exec 执行简单命令
async function runSimpleCommand(command) {
  try {
    const { stdout, stderr } = await execAsync(command)
    return { stdout, stderr }
  } catch (error) {
    throw error
  }
}

// 使用 fork 执行 CPU 密集型任务
function runCpuIntensiveTask(taskData) {
  return new Promise((resolve, reject) => {
    const worker = fork('worker.js')
    
    worker.send(taskData)
    
    worker.on('message', (result) => {
      worker.kill()
      resolve(result)
    })
    
    worker.on('error', (err) => {
      reject(err)
    })
    
    // 设置超时
    setTimeout(() => {
      worker.kill()
      reject(new Error('任务超时'))
    }, 30000)
  })
}

// 使用示例
async function main() {
  try {
    // 执行简单命令
    const result = await runSimpleCommand('echo "Hello World"')
    console.log('输出:', result.stdout.trim())

    // 执行长时间任务
    await runLongTask('npm', ['install'])
    console.log('安装完成')
    
    // 执行 CPU 密集型任务
    const taskResult = await runCpuIntensiveTask({ data: [1, 2, 3, 4, 5] })
    console.log('任务结果:', taskResult)
  } catch (error) {
    console.error('执行失败:', error)
  }
}

main()
```

## cluster 模块

`cluster` 模块允许轻松创建共享服务器端口的子进程，充分利用多核 CPU 性能。它基于 `child_process.fork()` 实现。

### 引入模块

```javascript
const cluster = require('cluster')
const http = require('http')
const os = require('os')
```

### 工作原理

#### 进程架构图

```
                    主进程 (Master)
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
      ┌─────────┐  ┌─────────┐  ┌─────────┐
      │ Worker1 │  │ Worker2 │  │ WorkerN │
      │  PID:1  │  │  PID:2  │  │  PID:N  │
      └─────────┘  └─────────┘  └─────────┘
            │            │            │
            └────────────┼────────────┘
                         │
                    共享端口 8000
```

#### 负载均衡机制

```
客户端请求 ──> 主进程 ──> 负载均衡器 ──> 选择空闲 Worker
                                            │
                 ┌──────────────────────────┼──────────────────────────┐
                 │                          │                          │
                 ▼                          ▼                          ▼
            Worker1                    Worker2                    Worker3
         (处理请求)                  (处理请求)                  (处理请求)
```

**轮询调度（Round-Robin）：**
- 主进程接收所有连接
- 按顺序分配给各个 Worker
- 确保负载均衡

### API 速查表

#### 主进程属性和方法

| 属性/方法 | 类型 | 说明 |
|----------|------|------|
| `cluster.isMaster` | Boolean | 是否是主进程（已废弃，使用 isPrimary） |
| `cluster.isPrimary` | Boolean | 是否是主进程 |
| `cluster.workers` | Object | 所有活跃的工作进程对象 |
| `cluster.settings` | Object | 集群配置设置 |
| `cluster.schedulingPolicy` | Number | 调度策略 |
| `cluster.fork([env])` | Function | 创建新的工作进程 |
| `cluster.disconnect([callback])` | Function | 断开所有工作进程 |

#### 工作进程属性和方法

| 属性/方法 | 类型 | 说明 |
|----------|------|------|
| `cluster.isWorker` | Boolean | 是否是工作进程 |
| `cluster.worker` | Object | 当前工作进程对象 |
| `worker.id` | Number | 工作进程 ID |
| `worker.process` | ChildProcess | 子进程对象 |
| `worker.send(message)` | Function | 发送消息给主进程 |
| `worker.kill([signal])` | Function | 终止工作进程 |
| `worker.disconnect()` | Function | 断开工作进程 |
| `worker.isConnected()` | Function | 检查是否已连接 |
| `worker.isDead()` | Function | 检查进程是否已终止 |

### 基本使用

**主进程（Master）：**

```javascript
const cluster = require('cluster')
const http = require('http')
const os = require('os')

const numCPUs = os.cpus().length

if (cluster.isPrimary) {
  console.log(`主进程 ${process.pid} 正在运行`)

  // 衍生工作进程
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  // 监听工作进程退出
  cluster.on('exit', (worker, code, signal) => {
    console.log(`工作进程 ${worker.process.pid} 已退出`)
    // 可以重新启动工作进程
    console.log('正在启动新的工作进程...')
    cluster.fork()
  })

  // 监听工作进程上线
  cluster.on('online', (worker) => {
    console.log(`工作进程 ${worker.process.pid} 已上线`)
  })

  // 监听工作进程监听
  cluster.on('listening', (worker, address) => {
    console.log(`工作进程 ${worker.process.pid} 正在监听 ${address.port}`)
  })
} else {
  // 工作进程可以共享任何 TCP 连接
  // 在本例中，它是一个 HTTP 服务器
  http
    .createServer((req, res) => {
      res.writeHead(200)
      res.end(`进程 ${process.pid} 处理了请求\n`)
    })
    .listen(8000)

  console.log(`工作进程 ${process.pid} 已启动`)
}
```

### 进程间通信

#### 主进程向工作进程发送消息

```javascript
const cluster = require('cluster')
const os = require('os')

if (cluster.isPrimary) {
  const workers = []
  const numCPUs = os.cpus().length

  // 创建工作进程
  for (let i = 0; i < numCPUs; i++) {
    const worker = cluster.fork()
    workers.push(worker)

    // 向工作进程发送消息
    worker.send({ type: 'greeting', message: `Hello Worker ${i}` })

    // 接收工作进程消息
    worker.on('message', (msg) => {
      console.log(`主进程收到来自 ${worker.process.pid} 的消息:`, msg)
    })
  }
  
  // 广播消息给所有工作进程
  function broadcast(message) {
    for (const id in cluster.workers) {
      cluster.workers[id].send(message)
    }
  }
  
  // 使用示例
  setTimeout(() => {
    broadcast({ type: 'broadcast', message: 'Hello All Workers' })
  }, 2000)
} else {
  // 工作进程接收消息
  process.on('message', (msg) => {
    console.log(`工作进程 ${process.pid} 收到消息:`, msg)

    // 向主进程发送消息
    process.send({
      type: 'response',
      pid: process.pid,
      message: '消息已收到'
    })
  })
}
```

#### 工作进程间通信

工作进程之间不能直接通信，需要通过主进程中转：

```javascript
const cluster = require('cluster')

if (cluster.isPrimary) {
  const workers = []
  
  // 创建工作进程
  for (let i = 0; i < 4; i++) {
    const worker = cluster.fork()
    
    worker.on('message', (msg) => {
      if (msg.type === 'broadcast') {
        // 广播给所有工作进程
        for (const id in cluster.workers) {
          if (cluster.workers[id] !== worker) {
            cluster.workers[id].send(msg)
          }
        }
      }
      
      if (msg.type === 'sendTo') {
        // 发送给特定工作进程
        const targetWorker = cluster.workers[msg.targetId]
        if (targetWorker) {
          targetWorker.send(msg)
        }
      }
    })
    
    workers.push(worker)
  }
} else {
  // 工作进程代码
  process.on('message', (msg) => {
    console.log(`Worker ${process.pid} 收到消息:`, msg)
  })
  
  // 广播消息
  setTimeout(() => {
    process.send({
      type: 'broadcast',
      from: process.pid,
      message: 'Hello from ' + process.pid
    })
  }, 1000)
}
```

### 负载均衡

#### 调度策略

Node.js 支持两种调度策略：

| 策略 | 常量 | 说明 | 适用场景 |
|------|------|------|---------|
| 轮询 | `cluster.SCHED_RR` | 主进程接收连接，轮询分配给 Worker | 默认策略，适合所有场景 |
| 操作系统调度 | `cluster.SCHED_NONE` | 操作系统决定哪个进程接收连接 | 特定性能优化场景 |

**设置调度策略：**

```javascript
const cluster = require('cluster')

// 设置调度策略
cluster.schedulingPolicy = cluster.SCHED_RR // 轮询
// cluster.schedulingPolicy = cluster.SCHED_NONE // 操作系统调度

// 或通过环境变量设置
// export NODE_CLUSTER_SCHED_POLICY=rr
// export NODE_CLUSTER_SCHED_POLICY=none
```

#### Round-Robin 调度源码分析

cluster 默认采用 Round-Robin（RR）轮询调度，其核心逻辑位于 `lib/internal/cluster/child.js` 的 `cluster._getServer` 方法中。当子进程调用 `listen()` 时，并不会真正绑定端口，而是通过 IPC 向主进程发送 `queryServer` 消息，由主进程统一接收连接后按轮询策略分配给各 Worker。

**源码关键路径（Node.js v10.x `lib/internal/cluster/child.js`）：**

```javascript
cluster._getServer = function(obj, options, cb) {
  let address = options.address;

  // 将 Unix socket 路径解析为绝对路径
  address = path.resolve(address);

  // 构建索引键，用于标识同一监听地址
  const indexesKey = [address,
                      options.port,
                      options.addressType,
                      options.fd ].join(':');

  if (indexes[indexesKey] === undefined)
    indexes[indexesKey] = 0;
  else
    indexes[indexesKey]++;

  // 向主进程发送 queryServer 消息
  const message = util._extend({
    act: 'queryServer',
    index: indexes[indexesKey],
    data: null
  }, options);

  message.address = address;

  if (obj._getServerData)
    message.data = obj._getServerData();

  // 等待主进程回复，根据回复决定调度方式
  send(message, (reply, handle) => {
    if (typeof obj._setServerData === 'function')
      obj._setServerData(reply.data);

    if (handle)
      shared(reply, handle, indexesKey, cb);  // 共享监听套接字（SCHED_NONE）
    else
      rr(reply, indexesKey, cb);               // Round-Robin 轮询（SCHED_RR）
  });

  obj.once('listening', () => {
    cluster.worker.state = 'listening';
    const address = obj.address();
    message.act = 'listening';
    message.port = address && address.port || options.port;
    send(message);
  });
};
```

**调度流程解析：**

1. 子进程调用 `server.listen()` 时，触发 `cluster._getServer`
2. 构造 `queryServer` 消息通过 IPC 发送给主进程
3. 主进程根据 `schedulingPolicy` 决定调度方式：
   - `SCHED_RR`：主进程持有监听套接字，接收新连接后按轮询顺序分发给 Worker（`reply.handle` 为空，走 `rr()` 分支）
   - `SCHED_NONE`：将监听套接字句柄直接分发给 Worker（`reply.handle` 非空，走 `shared()` 分支），由操作系统内核决定哪个 Worker 接收连接
4. Worker 收到分配的连接后执行业务逻辑

> 在 Windows 上默认使用 `SCHED_NONE`（共享套接字），在非 Windows 平台默认使用 `SCHED_RR`（轮询）。RR 模式下请求分配大致符合 1:1 均匀分布，但不会严格保证绝对均衡。

#### 负载均衡示例

```javascript
const cluster = require('cluster')
const http = require('http')
const os = require('os')

if (cluster.isPrimary) {
  console.log(`主进程 ${process.pid} 正在运行`)
  console.log(`启动 ${os.cpus().length} 个工作进程`)

  // 创建工作进程
  for (let i = 0; i < os.cpus().length; i++) {
    cluster.fork()
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`工作进程 ${worker.process.pid} 已退出`)
    console.log('正在重新启动...')
    cluster.fork()
  })
  
  // 统计每个工作进程处理的请求数
  const requestCounts = {}
  
  for (const id in cluster.workers) {
    requestCounts[id] = 0
    cluster.workers[id].on('message', (msg) => {
      if (msg.type === 'request') {
        requestCounts[id]++
        console.log(`Worker ${id}: ${requestCounts[id]} 请求`)
      }
    })
  }
  
  // 定期输出统计
  setInterval(() => {
    console.log('\n=== 请求统计 ===')
    for (const id in requestCounts) {
      console.log(`Worker ${id}: ${requestCounts[id]} 请求`)
    }
    console.log('===============\n')
  }, 10000)
} else {
  // 工作进程创建 HTTP 服务器
  const server = http.createServer((req, res) => {
    // 模拟一些处理时间
    const start = Date.now()
    while (Date.now() - start < 100) {
      // 模拟 CPU 密集型任务
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end(`请求由进程 ${process.pid} 处理\n`)
    
    // 报告请求处理
    process.send({ type: 'request' })
  })

  server.listen(8000, () => {
    console.log(`工作进程 ${process.pid} 正在监听端口 8000`)
  })
}
```

#### 性能对比

```javascript
const cluster = require('cluster')
const http = require('http')
const os = require('os')

if (cluster.isPrimary) {
  console.log('=== 性能测试 ===')
  console.log(`CPU 核心数: ${os.cpus().length}`)
  
  const startMemory = process.memoryUsage().rss
  
  // 创建工作进程
  const workers = []
  for (let i = 0; i < os.cpus().length; i++) {
    workers.push(cluster.fork())
  }
  
  // 监控内存使用
  setInterval(() => {
    const currentMemory = process.memoryUsage()
    const memoryDiff = (currentMemory.rss - startMemory) / 1024 / 1024
    console.log(`主进程内存增量: ${memoryDiff.toFixed(2)} MB`)
  }, 5000)
} else {
  // 工作进程
  let requestCount = 0
  
  http.createServer((req, res) => {
    requestCount++
    res.writeHead(200)
    res.end(`PID: ${process.pid}, Requests: ${requestCount}`)
  }).listen(8000)
  
  console.log(`工作进程 ${process.pid} 已启动`)
}
```

#### autocannon 压测数据对比

使用 [autocannon](https://github.com/mcollina/autocannon) 对单核服务与 cluster 多核服务进行压测对比，直观展示 cluster 的并发性能提升。

**安装 autocannon：**

```bash
npm i autocannon -g
```

**压测命令：**

```bash
# -c 并发连接数（默认 10），-p 每个连接的流水线请求数（默认 1）
autocannon -c 1000 -p 10 http://127.0.0.1:5000
```

**单核服务压测结果（3 次取典型值）：**

```
Stat    2.5% 50%  97.5%   99%     Avg       Stdev      Max
Latency 0 ms 0 ms 4729 ms 4748 ms 370.43 ms 1208.29 ms 5539.08 ms
Stat      1%     2.5%   50%    97.5%  Avg    Stdev   Min
Req/Sec   1631   1631   1961   1980   1928.1 101.4   1631
Bytes/Sec 295 kB 295 kB 355 kB 358 kB 349 kB 18.3 kB 295 kB

19k requests in 10.14s, 3.49 MB read
600 errors (590 timeouts)
```

**cluster 多核服务压测结果（3 次取典型值）：**

```
Stat    2.5% 50%  97.5%   99%     Avg       Stdev     Max
Latency 0 ms 0 ms 1355 ms 1443 ms 119.83 ms 396.95 ms 9926.91 ms
Stat      1%      2.5%    50%     97.5%   Avg    Stdev   Min
Req/Sec   6359    6359    7259    7371    7176.8 280.34  6358
Bytes/Sec 1.15 MB 1.15 MB 1.31 MB 1.33 MB 1.3 MB 50.9 kB 1.15 MB

72k requests in 10.19s, 13 MB read
800 errors (800 timeouts)
```

**关键指标对比：**

| 指标 | 单核服务 | cluster 多核 | 提升幅度 |
|------|---------|-------------|---------|
| 平均延迟 | 370 ms | 120 ms | 降低约 68% |
| P50 延迟 | 4729 ms | 1355 ms | 降低约 71% |
| 吞吐量 (Req/Sec) | ~1928 | ~7177 | 提升约 272% |
| 10 秒响应请求数 | ~19k | ~72k | 提升约 279% |
| 吞吐字节 (Bytes/Sec) | ~349 kB | ~1.3 MB | 提升约 281% |

> 压测结论：cluster 多核模式下吞吐量提升约 3 倍，延迟降低约 70%，整体服务性能改善显著。超时错误数无明显变化，说明瓶颈在于单次请求的计算耗时而非连接调度。（以上为作者特定环境下的实测数据，绝对数值因机器与版本而异，仅供参考。）

### 优雅关闭

#### 完整的优雅关闭实现

```javascript
const cluster = require('cluster')
const http = require('http')
const os = require('os')

if (cluster.isPrimary) {
  const workers = []
  const numCPUs = os.cpus().length

  // 创建工作进程
  for (let i = 0; i < numCPUs; i++) {
    workers.push(cluster.fork())
  }

  console.log(`主进程 ${process.pid} 已启动 ${numCPUs} 个工作进程`)

  // 优雅关闭函数
  function gracefulShutdown() {
    console.log('\n主进程收到关闭信号，正在关闭工作进程...')
    
    let closedWorkers = 0
    
    workers.forEach((worker) => {
      // 发送关闭消息给工作进程
      worker.send({ type: 'shutdown' })
      
      // 设置超时强制关闭
      const timeout = setTimeout(() => {
        console.log(`工作进程 ${worker.process.pid} 强制关闭`)
        worker.kill('SIGKILL')
      }, 10000)
      
      worker.on('exit', () => {
        clearTimeout(timeout)
        closedWorkers++
        console.log(`工作进程已关闭: ${closedWorkers}/${numCPUs}`)
        
        if (closedWorkers === numCPUs) {
          console.log('所有工作进程已关闭，主进程退出')
          process.exit(0)
        }
      })
    })
  }

  // 监听退出信号
  process.on('SIGTERM', gracefulShutdown)
  process.on('SIGINT', gracefulShutdown)

  // 监听工作进程异常退出
  cluster.on('exit', (worker, code, signal) => {
    console.log(`工作进程 ${worker.process.pid} 异常退出 (code: ${code}, signal: ${signal})`)
    // 重启工作进程
    const newWorker = cluster.fork()
    const index = workers.indexOf(worker)
    if (index !== -1) {
      workers[index] = newWorker
    }
  })
} else {
  // 工作进程
  let isShuttingDown = false
  let activeRequests = 0

  const server = http.createServer((req, res) => {
    // 检查是否正在关闭
    if (isShuttingDown) {
      res.writeHead(503, { 'Connection': 'close' })
      res.end('Server is shutting down')
      return
    }

    activeRequests++
    console.log(`[Worker ${process.pid}] 处理请求，活跃请求数: ${activeRequests}`)

    // 模拟处理
    setTimeout(() => {
      res.writeHead(200)
      res.end(`进程 ${process.pid} 处理了请求\n`)
      activeRequests--
      console.log(`[Worker ${process.pid}] 请求完成，剩余: ${activeRequests}`)
    }, 1000)
  })

  server.listen(8000)
  console.log(`工作进程 ${process.pid} 已启动`)

  // 监听关闭消息
  process.on('message', (msg) => {
    if (msg.type === 'shutdown') {
      console.log(`[Worker ${process.pid}] 收到关闭信号`)
      isShuttingDown = true

      // 停止接收新连接
      server.close(() => {
        console.log(`[Worker ${process.pid}] 服务器已关闭`)
        
        // 等待所有请求完成
        const checkInterval = setInterval(() => {
          if (activeRequests === 0) {
            clearInterval(checkInterval)
            console.log(`[Worker ${process.pid}] 所有请求已处理，退出`)
            process.exit(0)
          }
        }, 100)
      })
    }
  })

  // 直接监听 SIGTERM（如果主进程直接发送信号）
  process.on('SIGTERM', () => {
    console.log(`[Worker ${process.pid}] 收到 SIGTERM`)
    isShuttingDown = true
    server.close(() => {
      console.log(`[Worker ${process.pid}] 已关闭服务器`)
      process.exit(0)
    })
  })
}
```

### HTTP 服务器集群完整示例

```javascript
const cluster = require('cluster')
const http = require('http')
const os = require('os')

if (cluster.isPrimary) {
  console.log(`主进程 ${process.pid} 正在运行`)
  console.log(`检测到 ${os.cpus().length} 个 CPU 核心`)
  console.log(`正在启动 ${os.cpus().length} 个工作进程...\n`)

  // 创建工作进程
  for (let i = 0; i < os.cpus().length; i++) {
    const worker = cluster.fork()

    worker.on('message', (msg) => {
      if (msg.type === 'request') {
        console.log(`[主进程] 工作进程 ${worker.process.pid} 处理了 ${msg.count} 个请求`)
      }
      
      if (msg.type === 'error') {
        console.error(`[主进程] 工作进程 ${worker.process.pid} 错误:`, msg.error)
      }
      
      if (msg.type === 'metrics') {
        console.log(`[主进程] 工作进程 ${worker.process.pid} 指标:`, msg.metrics)
      }
    })
  }

  // 监听工作进程退出
  cluster.on('exit', (worker, code, signal) => {
    console.log(`\n工作进程 ${worker.process.pid} 已退出 (code: ${code}, signal: ${signal})`)
    console.log('正在启动新的工作进程...')
    
    const newWorker = cluster.fork()
    
    newWorker.on('message', (msg) => {
      if (msg.type === 'request') {
        console.log(`[主进程] 工作进程 ${newWorker.process.pid} 处理了 ${msg.count} 个请求`)
      }
    })
  })

  // 优雅关闭
  process.on('SIGTERM', () => {
    console.log('\n主进程收到 SIGTERM 信号')
    for (const id in cluster.workers) {
      cluster.workers[id].send({ type: 'shutdown' })
    }
  })

  process.on('SIGINT', () => {
    console.log('\n主进程收到 SIGINT 信号')
    for (const id in cluster.workers) {
      cluster.workers[id].send({ type: 'shutdown' })
    }
  })
  
} else {
  // 工作进程代码
  let requestCount = 0
  let errorCount = 0

  const server = http.createServer((req, res) => {
    requestCount++

    try {
      // 模拟一些处理
      const start = Date.now()
      while (Date.now() - start < 10) {}

      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(
        JSON.stringify({
          pid: process.pid,
          requestCount: requestCount,
          message: '请求处理成功'
        })
      )

      // 每处理 10 个请求，向主进程报告一次
      if (requestCount % 10 === 0) {
        process.send({ type: 'request', count: requestCount })
      }
      
      // 定期发送指标
      if (requestCount % 100 === 0) {
        const memUsage = process.memoryUsage()
        process.send({
          type: 'metrics',
          metrics: {
            pid: process.pid,
            requests: requestCount,
            errors: errorCount,
            memory: {
              heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
              rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
            }
          }
        })
      }
    } catch (error) {
      errorCount++
      process.send({
        type: 'error',
        error: error.message
      })
      res.writeHead(500)
      res.end('Internal Server Error')
    }
  })

  server.listen(8000, () => {
    console.log(`工作进程 ${process.pid} 正在监听端口 8000`)
  })

  // 优雅关闭
  let isShuttingDown = false

  process.on('message', (msg) => {
    if (msg.type === 'shutdown') {
      console.log(`工作进程 ${process.pid} 收到关闭信号`)
      isShuttingDown = true
      
      server.close(() => {
        console.log(`工作进程 ${process.pid} 已关闭服务器`)
        process.exit(0)
      })
    }
  })

  process.on('SIGTERM', () => {
    console.log(`工作进程 ${process.pid} 收到 SIGTERM 信号`)
    server.close(() => {
      console.log(`工作进程 ${process.pid} 已关闭服务器`)
      process.exit(0)
    })
  })
}
```

### 进程异常自动重启

当 Worker 进程因未捕获异常而崩溃时，可通过监听 `cluster.on('exit')` 事件自动重启新的 Worker，实现服务的自动恢复。

**异常崩溃场景：**

```javascript
const cluster = require('cluster')
const http = require('http')

if (cluster.isPrimary) masterProcess()
else childProcess()

function masterProcess () {
  cluster.fork()
  cluster.on('exit', (worker, code, signal) => {
    console.log(`子进程 ${worker.process.pid} 退出 (code: ${code})`)
  })
}

function childProcess () {
  http.Server((req, res) => {
    console.log('子进程 ' + cluster.worker.id + ' 在响应')
    // 模拟未捕获异常导致进程崩溃
    throw new Error('模拟异常')
    res.end('Hello')
  }).listen(5000, () => {
    console.log('子进程 ' + process.pid + ' 监听中')
  })
}
```

访问服务后，进程崩溃退出，但无自动恢复：

```
子进程 20739 监听中
子进程 1 在响应
Error: 模拟异常
    at Server.http.Server (server.js:18:11)
    ...
子进程 20739 退出
```

**自动重启实现：**

在 `exit` 事件回调中判断退出原因，非主动退出（`worker.suicide` 为 false 且退出码非 0）时自动 fork 新进程：

```javascript
const cluster = require('cluster')
const http = require('http')

if (cluster.isPrimary) masterProcess()
else childProcess()

function masterProcess () {
  cluster.fork()
  cluster.on('exit', (worker, code, signal) => {
    console.log(`子进程 ${worker.process.pid} 退出 (code: ${code})`)
    // 非主动退出时自动重启（旧版本用 worker.suicide）
    if (code != 0 && !worker.exitedAfterDisconnect) {
      cluster.fork()
      console.log('已自动重启新的子进程')
    }
  })
}

function childProcess () {
  http.Server((req, res) => {
    console.log('子进程 ' + cluster.worker.id + ' 在响应')
    throw new Error('模拟异常')
    res.end('Hello')
  }).listen(5000, () => {
    console.log('子进程 ' + process.pid + ' 监听中')
  })
}
```

重启后的日志输出：

```
子进程 20956 监听中
子进程 1 在响应
Error: 模拟异常
    at Server.http.Server (server.js:22:11)
    ...
子进程 20956 退出
已自动重启新的子进程
子进程 20960 监听中
```

> `worker.suicide` 属性在 Node.js v12+ 中已废弃，已更名为 `worker.exitedAfterDisconnect`。当 Worker 通过 `worker.disconnect()` 主动断开时 `exitedAfterDisconnect` 为 `true`，表示属于计划内退出，无需重启。

**生产级自动重启策略：**

```javascript
if (cluster.isPrimary) {
  const restartDelay = 1000  // 重启间隔，避免频繁重启
  const maxRestarts = 10     // 最大重启次数
  let restartCount = 0
  let lastRestartTime = 0

  cluster.on('exit', (worker, code, signal) => {
    const now = Date.now()
    const isPlanned = worker.exitedAfterDisconnect

    console.log(`Worker ${worker.process.pid} 退出 (code: ${code}, planned: ${isPlanned})`)

    if (!isPlanned && code !== 0) {
      // 防止短时间内频繁重启（崩溃风暴保护）
      if (now - lastRestartTime < restartDelay) {
        restartCount++
        if (restartCount >= maxRestarts) {
          console.error('重启次数超过上限，停止自动重启')
          process.exit(1)
        }
      } else {
        restartCount = 0
      }

      lastRestartTime = now
      setTimeout(() => {
        console.log('正在重启 Worker...')
        cluster.fork()
      }, restartDelay)
    }
  })
}
```

### cluster 模块常用属性和方法

**主进程属性：**

```javascript
if (cluster.isPrimary) {
  console.log('工作进程数量:', Object.keys(cluster.workers).length)
  console.log('工作进程对象:', cluster.workers)
  console.log('集群设置:', cluster.settings)
}
```

**工作进程属性：**

```javascript
if (cluster.isWorker) {
  console.log('工作进程 ID:', cluster.worker.id)
  console.log('工作进程对象:', cluster.worker)
  console.log('进程对象:', cluster.worker.process)
}
```

**常用方法：**

```javascript
// 断开工作进程
cluster.worker.disconnect()

// 检查工作进程是否已断开
cluster.worker.isDead()

// 检查工作进程是否已连接
cluster.worker.isConnected()

// 杀死工作进程
cluster.worker.kill()
// 或
cluster.worker.process.kill()
```

**cluster 设置：**

```javascript
const cluster = require('cluster')

// 在 fork 之前设置
cluster.setupPrimary({
  exec: 'worker.js',        // 工作进程脚本
  args: ['--use', 'https'], // 传递给工作进程的参数
  cwd: './app',             // 工作目录
  silent: false             // 是否静默
})

// 创建工作进程
cluster.fork()
```

### PM2 生产环境进程管理

[PM2](https://github.com/Unitech/pm2) 是 Node.js 生产环境进程管理器，内置 cluster 集群、自动重启、日志管理、监控等功能，无需修改代码即可实现多进程部署。

**安装：**

```bash
npm i pm2 -g
```

#### 常用命令速查

| 命令 | 说明 |
|------|------|
| `pm2 start app.js -i <n>` | 启动应用，`-i` 指定实例数，`0` 或 `max` 表示 CPU 核心数 |
| `pm2 start app.js -i 2` | 启动 2 个实例 |
| `pm2 start app.js -i max` | 按 CPU 核心数启动实例 |
| `pm2 ls` | 列出所有进程 |
| `pm2 scale <app> +1` | 扩容 1 个实例 |
| `pm2 scale <app> 4` | 将实例数调整为 4 |
| `pm2 stop <id/name>` | 停止指定进程 |
| `pm2 stop all` | 停止所有进程 |
| `pm2 restart <id/name>` | 重启指定进程 |
| `pm2 reload <app>` | 平滑重启（零停机） |
| `pm2 gracefulReload <app>` | 优雅重启（等待连接处理完成） |
| `pm2 delete <id/name>` | 删除指定进程 |
| `pm2 delete all` | 删除所有进程 |
| `pm2 logs` | 查看日志 |
| `pm2 logs <app>` | 查看指定应用日志 |
| `pm2 monit` | 实时监控面板 |
| `pm2 show <app>` | 查看应用详情 |
| `pm2 save` | 保存当前进程列表 |
| `pm2 startup` | 生成开机自启动脚本 |

#### 启动服务器

```bash
# 启动 2 个实例
pm2 start app.js -i 2

# 按 CPU 核心数启动
pm2 start app.js -i 0
pm2 start app.js -i max
```

启动后查看进程列表：

```
pm2 ls
┌────┬──┬────┬───────┬──────┬───┬──────┬───────┐
│Name│id│mode│status │↺     │cpu│memory│       │
├────┼──┼────┼───────┼──────┼───┼──────┼───────┤
│app │0 │fork│online │0     │0% │28.4 MB│       │
│app │1 │fork│online │0     │0% │20.3 MB│       │
└────┴──┴────┴───────┴──────┴───┴──────┴───────┘
```

#### 实时扩容集群

当线上服务响应吃力而 CPU 未吃满时，可实时扩容：

```bash
pm2 scale app +1
# 扩容后
┌─────┬──┬────┬───────┬──────┬───┬──────┬───────┐
│ Name│id│mode│status │↺     │cpu│memory│       │
├─────┼──┼────┼───────┼──────┼───┼──────┼───────┤
│ app │0 │fork│online │0     │0% │33.6 MB│      │
│ app │1 │fork│online │0     │0% │34.2 MB│      │
│ app │2 │fork│online │0     │0% │19.9 MB│      │
└─────┴──┴────┴───────┴──────┴───┴──────┴───────┘
```

#### 终止进程

```bash
# 停止指定 ID 的进程
pm2 stop 1
┌────┬──┬────┬───────┬───────┬───┬──────┬───────┐
│Name│id│mode│status │↺      │cpu│memory│       │
├────┼──┼────┼───────┼───────┼───┼──────┼───────┤
│app │0 │fork│online │0      │0% │33.6 MB│      │
│app │1 │fork│stopped│0      │0% │0 B    │      │
│app │2 │fork│online │0      │0% │33.6 MB│      │
└────┴──┴────┴───────┴───────┴───┴──────┴───────┘
```

#### 平滑重启（零停机部署）

`reload` 命令实现零停机重启，逐个重启 Worker，确保服务不中断：

```bash
pm2 reload app
Use --update-env to update environment variables
[PM2] Applying action reloadProcessId on app [app](ids:%200,1,2)
[PM2] [app](1) ✓
[PM2] [app](0) ✓
[PM2] [app](2) ✓
```

#### 优雅重启（SIGINT 信号处理）

当 Worker 有未处理完的连接时，可在代码中监听 SIGINT 信号完成清理后再退出：

```javascript
// 应用代码中监听 PM2 发出的 SIGINT 信号
process.on('SIGINT', function() {
  // 关闭数据库连接、保存状态等清理工作
  db.stop(function(err) {
    process.exit(err ? 1 : 0)
  })
})
```

PM2 发送 `SIGINT` 后会等待进程主动退出，若超时则强制杀死。可通过 `--kill-timeout` 设置超时时间：

```bash
pm2 start app.js --kill-timeout 5000  # 等待 5 秒后强制杀死
```

#### 配置文件启动（推荐）

使用 `ecosystem.config.js` 配置文件管理多应用部署：

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'web-app',
    script: './app.js',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080
    }
  }]
}
```

```bash
# 使用配置文件启动
pm2 start ecosystem.config.js

# 指定生产环境变量
pm2 start ecosystem.config.js --env production
```

> PM2 内置 cluster 模式（`exec_mode: 'cluster'`），无需修改应用代码即可实现多进程负载均衡。相比手动使用 cluster 模块，PM2 提供了自动重启、日志收集、性能监控、开机自启等生产级特性。

## 最佳实践

### 进程管理最佳实践

#### 1. 优雅退出

```javascript
// ✅ 推荐：优雅退出模式
class GracefulExit {
  constructor() {
    this.connections = new Set()
    this.isShuttingDown = false
    this.setupSignalHandlers()
  }

  setupSignalHandlers() {
    process.on('SIGTERM', () => this.shutdown('SIGTERM'))
    process.on('SIGINT', () => this.shutdown('SIGINT'))
    process.on('uncaughtException', (err) => {
      console.error('未捕获的异常:', err)
      this.shutdown('uncaughtException', 1)
    })
  }

  async shutdown(signal, exitCode = 0) {
    if (this.isShuttingDown) return
    this.isShuttingDown = true

    console.log(`\n收到 ${signal} 信号，开始优雅退出...`)

    const forceExit = setTimeout(() => {
      console.error('强制退出')
      process.exit(1)
    }, 10000)

    try {
      await this.closeConnections()
      clearTimeout(forceExit)
      console.log('优雅退出完成')
      process.exit(exitCode)
    } catch (err) {
      console.error('退出过程中出错:', err)
      process.exit(1)
    }
  }

  async closeConnections() {
    const promises = Array.from(this.connections).map(conn => {
      return new Promise(resolve => conn.close(resolve))
    })
    await Promise.all(promises)
  }
}
```

#### 2. 环境变量管理

```javascript
// ✅ 推荐：使用配置文件管理环境变量
const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432
  }
}

// ✅ 推荐：验证必需的环境变量
function validateEnv() {
  const required = ['DATABASE_URL', 'SECRET_KEY']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`缺少必需的环境变量: ${missing.join(', ')}`)
  }
}
```

#### 3. 子进程安全实践

```javascript
// ❌ 危险：命令注入风险
const badInput = getUserInput()
exec(`cat ${badInput}`, callback)

// ✅ 安全：使用 execFile 避免命令注入
const userInput = getUserInput()
execFile('cat', [userInput], callback)

// ✅ 安全：验证用户输入
if (!/^[a-zA-Z0-9._-]+$/.test(userInput)) {
  throw new Error('无效的文件名')
}
```

### Cluster 最佳实践

#### 1. Worker 数量配置

```javascript
const cluster = require('cluster')
const os = require('os')

const numCPUs = os.cpus().length

// ✅ 推荐：根据 CPU 核心数设置（支持环境变量覆盖）
const numWorkers = process.env.WORKERS || numCPUs

// ✅ 备选：留一个核心给主进程
const numWorkersReserve = numCPUs - 1 > 0 ? numCPUs - 1 : 1

// ✅ 备选：生产环境可以设置更多
const numWorkersProd = process.env.NODE_ENV === 'production'
  ? numCPUs * 2
  : numCPUs
```

#### 2. 健康检查

```javascript
if (cluster.isPrimary) {
  const healthCheckInterval = setInterval(() => {
    for (const id in cluster.workers) {
      const worker = cluster.workers[id]
      worker.send({ type: 'health_check' })
      
      const timeout = setTimeout(() => {
        if (!worker.isDead()) {
          console.log(`Worker ${id} 无响应，正在重启...`)
          worker.kill()
        }
      }, 5000)
      
      worker.once('message', (msg) => {
        if (msg.type === 'health_response') {
          clearTimeout(timeout)
        }
      })
    }
  }, 30000)
} else {
  process.on('message', (msg) => {
    if (msg.type === 'health_check') {
      process.send({ type: 'health_response' })
    }
  })
}
```

## 常见问题解答

### 1. process.nextTick 和 setImmediate 的区别？

**解答：**

```javascript
console.log('1. 开始')

process.nextTick(() => {
  console.log('2. nextTick')
})

setImmediate(() => {
  console.log('4. setImmediate')
})

Promise.resolve().then(() => {
  console.log('3. Promise')
})

console.log('5. 结束')

// 输出顺序：
// 1. 开始
// 5. 结束
// 2. nextTick
// 3. Promise
// 4. setImmediate
```

**执行顺序：**
1. 同步代码
2. `process.nextTick` 队列
3. Promise 微任务队列
4. I/O 事件回调
5. `setImmediate` 队列

### 2. spawn、exec、execFile、fork 如何选择？

**解答：**

| 方法 | 使用场景 | 特点 |
|------|---------|------|
| `spawn` | 大量输出、流式处理 | 流式输出，性能最好 |
| `exec` | 简单命令、输出少 | 缓冲输出，有大小限制 |
| `execFile` | 执行外部程序 | 不通过 shell，更安全 |
| `fork` | Node.js 子进程 | 自动 IPC 通信 |

**选择决策：**
1. 需要创建 Node.js 子进程？→ `fork`
2. 输出数据量大？→ `spawn`
3. 需要使用 shell 特性？→ `exec`
4. 执行外部程序？→ `execFile`

### 3. 如何避免子进程僵尸进程？

**解答：**

```javascript
const { spawn } = require('child_process')

// ✅ 正确：监听 exit 事件
const child = spawn('some-command')
child.on('exit', (code, signal) => {
  console.log(`子进程退出: ${code}`)
})

// ✅ 正确：使用 detached 和 unref
const childDetached = spawn('long-running-task', [], {
  detached: true,
  stdio: 'ignore'
})
childDetached.unref()
```

### 4. cluster 和 PM2 的关系？

**解答：**

| 功能 | cluster | PM2 |
|------|---------|-----|
| 多进程 | ✅ | ✅ |
| 自动重启 | 手动实现 | ✅ 内置 |
| 日志管理 | ❌ | ✅ |
| 监控 | ❌ | ✅ |
| 零代码改动 | ❌ | ✅ |

**建议：**
- 开发环境：使用 cluster 学习和理解
- 生产环境：推荐使用 PM2

### 5. 如何处理子进程超时？

**解答：**

```javascript
const { spawn } = require('child_process')

function runWithTimeout(command, args, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args)
    
    let output = ''
    child.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`进程超时 (${timeout}ms)`))
    }, timeout)
    
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve(output)
      } else {
        reject(new Error(`进程退出码: ${code}`))
      }
    })
  })
}
```

## 注意事项

### 性能注意事项

1. **避免同步操作阻塞事件循环**
   ```javascript
   // ❌ 避免
   const result = execSync('some-command')
   
   // ✅ 推荐
   const result = await execAsync('some-command')
   ```

2. **不要递归调用 process.nextTick**
   ```javascript
   // ❌ 危险：无限递归
   function recurse() {
     process.nextTick(recurse)
   }
   ```

3. **合理设置子进程数量**
   ```javascript
   // ❌ 避免：创建过多子进程
   for (let i = 0; i < 100; i++) {
     spawn('some-command')
   }
   
   // ✅ 正确：根据 CPU 核心数设置
   const numCPUs = os.cpus().length
   for (let i = 0; i < numCPUs; i++) {
     spawn('some-command')
   }
   ```

### 安全注意事项

1. **防止命令注入**
   ```javascript
   // ❌ 危险
   const userInput = req.query.file
   exec(`cat ${userInput}`)
   
   // ✅ 安全
   execFile('cat', [userInput])
   ```

2. **验证环境变量**
   ```javascript
   // ✅ 安全：验证后使用
   const port = parseInt(process.env.PORT, 10)
   if (isNaN(port) || port < 0 || port > 65535) {
     throw new Error('无效的端口号')
   }
   ```

### 跨平台注意事项

1. **Shell 差异**
   ```javascript
   const shell = process.platform === 'win32' ? true : '/bin/bash'
   const child = spawn(command, { shell })
   ```

2. **路径分隔符**
   ```javascript
   const path = require('path')
   const filePath = path.join(__dirname, 'script.js')
   ```

## 相关模块

| 模块 | 说明 | 文档链接 |
|------|------|---------|
| `os` | 操作系统信息 | [os 模块](08-os.md) |
| `events` | 事件处理 | [events 模块](10-events.md) |
| `stream` | 流处理 | [stream 模块](12-stream.md) |
| `http` | HTTP 服务 | [http 模块](03-http.md) |

---

## Node.js 22+ process 模块新特性

### process.permission 权限查询

Node.js 22.13+ 权限模型稳定后，可通过 `process.permission` 查询权限：

```javascript
// 检查文件系统权限
process.permission.has('fs.read')                    // 是否有文件读取权限
process.permission.has('fs.read', '/etc/passwd')     // 是否有特定文件读取权限
process.permission.has('fs.write', './data')         // 是否有特定目录写入权限

// 检查网络权限
process.permission.has('net')                        // 是否有网络权限
process.permission.has('net', 'api.example.com:443') // 是否有特定主机访问权限

// 检查子进程权限
process.permission.has('child')                      // 是否允许创建子进程
```

### process.constrainedMemory / availableMemory

```javascript
// 获取系统内存约束（适用于容器环境）
const constrained = process.constrainedMemory()
console.log(`受约束内存: ${constrained / 1024 / 1024} MB`)

// 获取可用内存
const available = process.availableMemory()
console.log(`可用内存: ${available / 1024 / 1024} MB`)

// 容器环境下的内存监控
function checkMemoryPressure() {
  const available = process.availableMemory()
  const rss = process.memoryUsage().rss
  const ratio = rss / available

  if (ratio > 0.9) {
    console.warn('内存压力过高，建议释放缓存')
  }
}
```

### node:sqlite 内置数据库

Node.js 22.5+ 实验性内置 SQLite 数据库（无需安装 better-sqlite3）：

```javascript
import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync(':memory:')  // 内存数据库
// const db = new DatabaseSync('./data.db')  // 文件数据库

db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  )
`)

const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
insert.run('Alice', 'alice@example.com')
insert.run('Bob', 'bob@example.com')

const query = db.prepare('SELECT * FROM users')
console.log(query.all())

db.close()
```
