---
title: Promise
description: Node.js 完整支持 ES6 Promise，并在 Node.js 10+ 版本后逐步为核心模块补齐了 Promise 风格的 API，使得编写异步逻辑更加直观。
keywords: [Node.js, 异步编程, Promise]
category: Node.js
tags: [Node.js, 异步编程]
---







# Promise

Node.js 完整支持 ES6 Promise，并在 Node.js 10+ 版本后逐步为核心模块补齐了 Promise 风格的 API，使得编写异步逻辑更加直观。

## Node.js 的 Promise API

### fs/promises 模块

Node.js 提供了原生的 Promise 风格文件系统 API：

```javascript
const fs = require("fs/promises")

// 读取文件
async function readFile() {
  const data = await fs.readFile("data.txt", "utf8")
  return data
}

// 写入文件
async function writeFile() {
  await fs.writeFile("output.txt", "Hello Node.js")
}

// 目录操作
async function dirOperations() {
  // 创建目录
  await fs.mkdir("new-dir", { recursive: true })
  
  // 读取目录
  const files = await fs.readdir("./")
  console.log("文件列表:", files)
  
  // 获取文件信息
  const stats = await fs.stat("data.txt")
  console.log("文件大小:", stats.size)
}
```

### dns/promises 模块

```javascript
const dns = require("dns/promises")

async function resolveDomain() {
  const addresses = await dns.resolve4("example.com")
  console.log("IPv4 地址:", addresses)
  
  const mxRecords = await dns.resolveMx("example.com")
  console.log("MX 记录:", mxRecords)
}
```

### timers/promises 模块

```javascript
const { setTimeout, setImmediate } = require("timers/promises")

async function delays() {
  // 延迟执行
  await setTimeout(1000)
  console.log("1 秒后执行")
  
  // 立即执行（返回 Promise 版本）
  await setImmediate()
  console.log("下一个事件循环周期")
}
```

### stream/promises 模块

```javascript
const { pipeline } = require("stream/promises")
const fs = require("fs")
const zlib = require("zlib")

async function compressFile() {
  await pipeline(
    fs.createReadStream("input.txt"),
    zlib.createGzip(),
    fs.createWriteStream("input.txt.gz")
  )
  console.log("压缩完成")
}
```

## 从回调迁移到 Promise

### 使用 util.promisify

将错误优先回调风格的函数转换为 Promise：

```javascript
const util = require("util")
const fs = require("fs")

// 转换单个函数
const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

// 使用
async function example() {
  const data = await readFile("config.json", "utf8")
  await writeFile("output.txt", data.toUpperCase())
}
```

### 批量转换

```javascript
const util = require("util")
const fs = require("fs")

// 批量转换
const fsAsync = {
  readFile: util.promisify(fs.readFile),
  writeFile: util.promisify(fs.writeFile),
  stat: util.promisify(fs.stat),
  readdir: util.promisify(fs.readdir),
  unlink: util.promisify(fs.unlink),
}
```

### 自定义 Promise 封装

对于复杂场景，可以手动封装：

```javascript
function promisify(fn, context) {
  return function(...args) {
    return new Promise((resolve, reject) => {
      fn.call(context, ...args, (err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      })
    })
  }
}

// 使用示例
const redis = require("redis")
const client = redis.createClient()

const getAsync = promisify(client.get, client)
const setAsync = promisify(client.set, client)

async function cacheExample() {
  await setAsync("key", "value")
  const value = await getAsync("key")
  console.log(value)
}
```

## Promise 组合方法在 Node.js 中的应用

### Promise.all - 并发执行

```javascript
const fs = require("fs/promises")

async function readMultipleFiles() {
  const files = ["a.txt", "b.txt", "c.txt"]
  
  const contents = await Promise.all(
    files.map(file => fs.readFile(file, "utf8"))
  )
  
  console.log("所有文件内容:", contents)
}
```

### Promise.race - 超时控制

```javascript
const { setTimeout } = require("timers/promises")

async function fetchWithTimeout(url, ms) {
  const response = await Promise.race([
    fetch(url),
    setTimeout(ms).then(() => {
      throw new Error("请求超时")
    })
  ])
  
  return response
}
```

### Promise.allSettled - 收集所有结果

```javascript
async function sendEmails(recipients) {
  const results = await Promise.allSettled(
    recipients.map(email => sendEmail(email))
  )
  
  const successful = results.filter(r => r.status === "fulfilled")
  const failed = results.filter(r => r.status === "rejected")
  
  console.log(`成功: ${successful.length}, 失败: ${failed.length}`)
}
```

### Promise.any - 快速失败恢复

```javascript
async function fetchWithFallback(urls) {
  try {
    const response = await Promise.any(
      urls.map(url => fetch(url))
    )
    return response
  } catch (error) {
    throw new Error("所有请求都失败")
  }
}
```

## 实战示例

### 数据库查询流水线

```javascript
const fs = require("fs/promises")

async function loadDashboard() {
  try {
    const [users, orders, metrics] = await Promise.all([
      fetchUsers(),
      fetchOrders(),
      fetchMetrics()
    ])
    
    return { users, orders, metrics }
  } catch (error) {
    console.error("加载失败:", error)
    throw error
  }
}
```

### 文件批量处理

```javascript
const fs = require("fs/promises")
const path = require("path")

async function processDirectory(dir) {
  const files = await fs.readdir(dir)
  
  const results = await Promise.allSettled(
    files.map(async (file) => {
      const filePath = path.join(dir, file)
      const content = await fs.readFile(filePath, "utf8")
      return { file, content: content.toUpperCase() }
    })
  )
  
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      console.log(`${files[index]}: 处理成功`)
    } else {
      console.log(`${files[index]}: 处理失败 - ${result.reason.message}`)
    }
  })
}
```

### 重试机制

```javascript
async function retry(fn, maxRetries = 3, delay = 1000) {
  let lastError
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      console.log(`第 ${i + 1} 次尝试失败，等待 ${delay}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2 // 指数退避
    }
  }
  
  throw lastError
}

// 使用
const data = await retry(
  () => fetch("https://api.example.com/data").then(r => r.json()),
  5,
  500
)
```

## Node.js 特有的 Promise 注意事项

### 环境变量与配置

```javascript
const fs = require("fs/promises")

async function loadConfig() {
  try {
    const configPath = process.env.CONFIG_PATH || "./config.json"
    const data = await fs.readFile(configPath, "utf8")
    return JSON.parse(data)
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn("配置文件不存在，使用默认配置")
      return { default: true }
    }
    throw error
  }
}
```

### 与 EventEmitter 结合

```javascript
const { once } = require("events")

async function waitForEvent(emitter, event) {
  const [result] = await once(emitter, event)
  return result
}

// 使用示例
const server = http.createServer()
server.listen(3000)

await once(server, "listening")
console.log("服务器已启动")
```

### 流的 Promise 封装

```javascript
const { finished } = require("stream/promises")
const fs = require("fs")

async function processStream() {
  const stream = fs.createReadStream("large-file.txt")
  
  stream.on("data", (chunk) => {
    // 处理数据
  })
  
  await finished(stream)
  console.log("流处理完成")
}
```

## 错误处理最佳实践

### 全局错误处理

```javascript
// 处理未捕获的 Promise 拒绝
process.on("unhandledRejection", (reason, promise) => {
  console.error("未处理的 Promise 拒绝:", reason)
  process.exit(1)
})
```

### 链式错误处理

```javascript
async function safeOperation() {
  try {
    const result = await riskyOperation()
    return result
  } catch (error) {
    console.error("操作失败:", error)
    // 返回默认值或重新抛出
    throw new Error(`操作失败: ${error.message}`)
  }
}
```

### 错误边界

```javascript
function withErrorHandling(fn, defaultValue = null) {
  return async function(...args) {
    try {
      return await fn.apply(this, args)
    } catch (error) {
      console.error(`函数 ${fn.name} 执行失败:`, error.message)
      return defaultValue
    }
  }
}

// 使用
const safeReadFile = withErrorHandling(
  async (path) => await fs.readFile(path, "utf8"),
  ""
)
```

## 小结

- 优先使用 `fs/promises`、`dns/promises` 等原生 Promise API
- 使用 `util.promisify` 将回调风格的函数转换为 Promise
- 合理使用 Promise 组合方法处理并发场景
- 实现全局错误处理和重试机制
- 注意 Node.js 特有的 API，如 `process.env`、`events.once` 等
