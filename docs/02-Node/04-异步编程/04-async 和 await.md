---
title: async/await
description: async/await 在 Node.js 中自 Node 8 起全面可用，并在后续版本中加入了顶层 await、原生模块 Promise 版本等配套能力，是处理异步操作的首选方式。本篇涵盖 fs/promises 等核心模块配合、顶层 await、并发控制、超时与取消、错误处理与性能优化。
keywords: [Node.js, 异步编程, Async, await]
category: Node.js
tags: [Node.js, 异步编程]
---







# async/await

`async/await` 在 Node.js 中自 Node 8 起全面可用，并在后续版本中加入了顶层 `await`、原生模块 Promise 版本等配套能力，是处理异步操作的首选方式。

## Node.js 中的应用

### 与核心模块配合

Node.js 提供了 Promise 版本的核心模块 API：

```javascript
const fs = require("fs/promises")

async function loadConfig() {
  try {
    const content = await fs.readFile("config.json", "utf8")
    const config = JSON.parse(content)
    return config
  } catch (error) {
    console.error("加载配置失败:", error)
    return null
  }
}
```

### 常用 Promise API 模块

```javascript
// 文件系统
const fs = require("fs/promises")
await fs.readFile("data.txt", "utf8")

// DNS 解析
const dns = require("dns/promises")
await dns.resolve4("example.com")

// 定时器
const { setTimeout } = require("timers/promises")
await setTimeout(1000)

// 流处理
const { pipeline } = require("stream/promises")
await pipeline(source, transform, destination)
```

### 封装回调接口

对于使用回调风格的旧 API，可以通过 `util.promisify` 封装后使用：

```javascript
const { promisify } = require("util")
const redis = require("redis")

const client = redis.createClient()
const getAsync = promisify(client.get).bind(client)

async function getCache(key) {
  const value = await getAsync(key)
  return value ? JSON.parse(value) : null
}
```

## 顶层 await（ESM）

自 Node.js 14 起，ESM 模块支持在顶层直接使用 `await`：

```javascript
// config.mjs
import { readFile } from "fs/promises"

// 顶层 await，无需包装在 async 函数中
const config = JSON.parse(
  await readFile(new URL("./config.json", import.meta.url))
)

console.log(config)
export default config
```

**特点：**
- 顶层 `await` 会阻塞当前模块的执行
- 不会阻塞整个事件循环
- 仅在 ESM 中生效，CommonJS 仍需使用异步函数

### 在 CommonJS 中的替代方案

```javascript
// CommonJS 中无法使用顶层 await
const fs = require("fs/promises")

// 方案一：使用 IIFE
;(async () => {
  const config = await fs.readFile("config.json", "utf8")
  console.log(config)
})()

// 方案二：导出 Promise
module.exports = fs.readFile("config.json", "utf8")
  .then(JSON.parse)
```

## Node.js 特有的异步模式

### 环境变量异步加载

```javascript
// load-env.mjs —— 顶层 await 需要 ESM（.mjs 或 "type": "module"）
import { readFile } from "fs/promises"

async function loadEnvFile(path) {
  try {
    const content = await readFile(path, "utf8")
    const lines = content.split("\n")
    
    for (const line of lines) {
      const [key, value] = line.split("=")
      if (key && value) {
        process.env[key.trim()] = value.trim()
      }
    }
  } catch (error) {
    console.warn("环境文件加载失败:", error.message)
  }
}

await loadEnvFile(".env.local")
```

### 与 EventEmitter 配合

```javascript
const { once } = require("events")
const http = require("http")

async function startServer(port) {
  const server = http.createServer((req, res) => {
    res.end("Hello")
  })
  
  server.listen(port)
  
  // 等待服务器启动
  await once(server, "listening")
  console.log(`服务器运行在端口 ${port}`)
  
  return server
}

async function stopServer(server) {
  server.close()
  await once(server, "close")
  console.log("服务器已关闭")
}
```

### 流的异步处理

```javascript
const { finished } = require("stream/promises")
const fs = require("fs")

async function processLargeFile() {
  const stream = fs.createReadStream("large-file.txt", "utf8")
  
  let lineCount = 0
  
  stream.on("data", (chunk) => {
    lineCount += chunk.split("\n").length - 1
  })
  
  await finished(stream)
  console.log(`总行数: ${lineCount}`)
}
```

### Worker Threads 异步通信

```javascript
const { Worker, isMainThread, parentPort } = require("worker_threads")

async function runWorker(workerPath, data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, { workerData: data })
    
    worker.on("message", resolve)
    worker.on("error", reject)
    worker.on("exit", (code) => {
      if (code !== 0) {
        reject(new Error(`Worker 停止，退出码: ${code}`))
      }
    })
  })
}

// 使用
const result = await runWorker("./heavy-compute.js", { n: 1000000 })
```

## 并发控制

### 使用 Promise.all

```javascript
const fs = require("fs/promises")

async function readMultipleFiles(paths) {
  const promises = paths.map(path => fs.readFile(path, "utf8"))
  const contents = await Promise.all(promises)
  return contents
}
```

### 限制并发数量

```javascript
const fs = require("fs/promises")

async function processWithLimit(tasks, limit = 5) {
  const results = []
  const executing = new Set()
  
  for (const task of tasks) {
    const promise = task().then(result => {
      executing.delete(promise)
      return result
    })
    
    executing.add(promise)
    results.push(promise)
    
    if (executing.size >= limit) {
      await Promise.race(executing)
    }
  }
  
  return Promise.all(results)
}

// 使用示例
const files = ["file1.txt", "file2.txt", "file3.txt" /* ... */]
const contents = await processWithLimit(
  files.map(f => () => fs.readFile(f, "utf8")),
  3 // 最多 3 个并发
)
```

### 使用 p-limit 风格的控制

```javascript
function pLimit(concurrency) {
  const queue = []
  let activeCount = 0
  
  const next = () => {
    activeCount--
    if (queue.length > 0) {
      queue.shift()()
    }
  }
  
  return (fn) => {
    return new Promise((resolve, reject) => {
      const run = () => {
        activeCount++
        fn().then(resolve, reject).finally(next)
      }
      
      if (activeCount < concurrency) {
        run()
      } else {
        queue.push(run)
      }
    })
  }
}

// 使用
const limit = pLimit(5)

async function downloadAll(urls) {
  return Promise.all(
    urls.map(url => limit(() => fetch(url)))
  )
}
```

## 错误处理

### try/catch 模式

```javascript
const fs = require("fs/promises")

async function safeRead(path) {
  try {
    const content = await fs.readFile(path, "utf8")
    return content
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(`文件不存在: ${path}`)
      return null
    }
    throw error
  }
}
```

### 局部错误处理

```javascript
async function processOrder(orderId) {
  const order = await fetchOrder(orderId)
  
  // 支付可能失败，但不应阻断整个流程
  try {
    await processPayment(order)
  } catch (error) {
    await logPaymentError(order, error)
    await sendRetryNotification(order)
  }
  
  // 继续后续流程
  await updateOrderStatus(order)
}
```

### 超时控制

```javascript
const { setTimeout } = require("timers/promises")

async function withTimeout(promise, ms) {
  const timeout = setTimeout(ms).then(() => {
    throw new Error(`操作超时 (${ms}ms)`)
  })
  
  return Promise.race([promise, timeout])
}

// 使用
const response = await withTimeout(
  fetch("https://api.example.com/data"),
  5000
)
```

### AbortController 取消

```javascript
async function fetchWithAbort(url, signal) {
  const response = await fetch(url, { signal })
  return response.json()
}

const controller = new AbortController()

// 5 秒后取消
setTimeout(() => controller.abort(), 5000)

try {
  const data = await fetchWithAbort(
    "https://api.example.com/data",
    controller.signal
  )
} catch (error) {
  if (error.name === "AbortError") {
    console.log("请求已取消")
  }
}
```

## 性能优化

### 避免阻塞事件循环

```javascript
// ❌ 错误：长时间同步计算
async function bad() {
  let sum = 0
  for (let i = 0; i < 1e9; i++) {
    sum += i
  }
  return sum
}

// ✅ 正确：分块处理
async function good() {
  const chunkSize = 1e6
  let sum = 0
  
  for (let i = 0; i < 1e9; i += chunkSize) {
    const end = Math.min(i + chunkSize, 1e9)
    for (let j = i; j < end; j++) {
      sum += j
    }
    // 让出控制权
    await new Promise(resolve => setImmediate(resolve))
  }
  
  return sum
}
```

### 缓存异步结果

```javascript
const fs = require("fs/promises")

const cache = new Map()

async function readWithCache(path) {
  if (cache.has(path)) {
    return cache.get(path)
  }
  
  const content = await fs.readFile(path, "utf8")
  cache.set(path, content)
  return content
}
```

### 并行化独立操作

```javascript
// ❌ 串行执行
const users = await fetchUsers()
const orders = await fetchOrders()
const products = await fetchProducts()

// ✅ 并行执行
const [users, orders, products] = await Promise.all([
  fetchUsers(),
  fetchOrders(),
  fetchProducts()
])
```

## 最佳实践

### 1. 循环中的 await

```javascript
// ❌ forEach 无法等待
items.forEach(async (item) => {
  await process(item)
})

// ✅ 使用 for...of
for (const item of items) {
  await process(item)
}

// ✅ 并行处理
await Promise.all(items.map(item => process(item)))
```

### 2. 正确处理返回值

```javascript
// ❌ 忘记 return
async function bad() {
  await doSomething()
  // 返回 undefined
}

// ✅ 明确返回
async function good() {
  return await doSomething()
}
```

### 3. 避免过度使用 await

```javascript
// ❌ 不必要的 await
const value = await Promise.resolve(42)

// ✅ 直接使用
const value = 42
```

### 4. 全局错误处理

```javascript
process.on("unhandledRejection", (reason, promise) => {
  console.error("未处理的 Promise 拒绝:", reason)
  process.exit(1)
})
```

## 小结

- 优先使用 `fs/promises` 等原生 Promise API
- ESM 模块支持顶层 `await`
- 使用 `events.once` 等待事件触发
- 实现并发控制避免资源耗尽
- 使用 `AbortController` 支持取消操作
- 避免阻塞事件循环，长时间计算应分块处理
