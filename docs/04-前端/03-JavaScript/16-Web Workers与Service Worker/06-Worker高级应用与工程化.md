---
title: Worker 高级应用与工程化
description: "Inline Worker 与 Blob Worker、图像处理 Worker 实战、加密解密/数据压缩/WebAssembly 集成/大文件分片等高级应用场景，以及 Vite 与 Webpack 的 Worker 构建配置与对比。"
keywords: [Web Workers, 工程化]
category: JavaScript
tags: [JavaScript, Web Workers, 工程化]
created: 2026-11-14
updated: 2026-11-14
status: 正式
---

# Worker 高级应用与工程化

本篇覆盖 Worker 在复杂业务与工程化体系中的用法：免文件的 Inline/Blob Worker、图像处理 Worker、加密压缩与 WebAssembly 等高级场景，以及 Vite/Webpack 构建集成。

> 本文由 HTML5 模块《Web Workers 处理线程》专题内容整理并入本目录。

## Inline Worker 与 Blob Worker

除了从外部文件加载 Worker,还可以使用 Blob URL 或 Data URL 创建内联 Worker。这种方式适用于:

- 单文件应用
- 动态生成 Worker 代码
- 避免额外的网络请求

### Blob Worker

:::: code-group

```javascript [创建 Blob Worker]
// 将 Worker 代码作为字符串
const workerCode = `
  self.onmessage = function(event) {
    const result = event.data * 2;
    self.postMessage(result);
  };
`

// 创建 Blob 对象
const blob = new Blob([workerCode], { type: "application/javascript" })

// 生成 Blob URL
const workerURL = URL.createObjectURL(blob)

// 创建 Worker
const worker = new Worker(workerURL)

// 使用 Worker
worker.postMessage(10)
worker.onmessage = function (event) {
  console.log("结果:", event.data) // 输出: 20
}

// 清理 Blob URL (Worker 仍可继续使用)
URL.revokeObjectURL(workerURL)
```

```javascript [函数式创建 Worker]
// 封装为工具函数
function createInlineWorker(workerFunction) {
  // 将函数转换为字符串
  const workerCode = `
    (${workerFunction.toString())})();
  `

  const blob = new Blob([workerCode], { type: "application/javascript" })
  const workerURL = URL.createObjectURL(blob)
  const worker = new Worker(workerURL)

  // 立即释放 Blob URL
  URL.revokeObjectURL(workerURL)

  return worker
}

// 使用示例
const worker = createInlineWorker(function () {
  self.onmessage = function (event) {
    // 执行复杂计算
    const result = heavyCalculation(event.data)
    self.postMessage(result)
  }

  function heavyCalculation(data) {
    // 计算逻辑...
    return data * 2
  }
})
```

```javascript [动态生成 Worker]
// 根据配置动态生成 Worker
function createDynamicWorker(config) {
  const workerCode = `
    // 配置参数
    const config = ${JSON.stringify(config)};
    
    self.onmessage = function(event) {
      const { action, data } = event.data;
      
      switch(action) {
        case 'process':
          const result = processData(data, config);
          self.postMessage({ type: 'result', data: result });
          break;
        case 'terminate':
          self.close();
          break;
      }
    };
    
    function processData(data, config) {
      // 根据配置处理数据
      return data.map(item => item * config.multiplier);
    }
  `

  const blob = new Blob([workerCode], { type: "application/javascript" })
  return new Worker(URL.createObjectURL(blob))
}

// 使用示例
const worker = createDynamicWorker({ multiplier: 10 })
worker.postMessage({ action: "process", data: [1, 2, 3, 4, 5] })
worker.onmessage = function (event) {
  console.log("处理结果:", event.data) // [10, 20, 30, 40, 50]
}
```

::::

### Data URL Worker

```javascript
// 使用 Data URL (不推荐,有大小限制)
const workerCode = "self.onmessage = e => self.postMessage(e.data * 2);"
const dataURL = `data:application/javascript,${encodeURIComponent(workerCode)}`

const worker = new Worker(dataURL)

// 注意: Data URL 在某些浏览器中可能有长度限制
```

### 使用场景对比

| 创建方式     | 优点                         | 缺点                  | 适用场景          |
| ------------ | ---------------------------- | --------------------- | ----------------- |
| **外部文件** | 代码分离,易于维护,支持模块化 | 需要额外 HTTP 请求    | 生产环境,大型项目 |
| **Blob URL** | 无需额外请求,可动态生成      | 代码管理复杂,调试困难 | 动态配置,小型应用 |
| **Data URL** | 简单直接                     | 有长度限制,编码开销   | 极简单场景        |

### 最佳实践

```javascript
// ✅ 推荐: 使用外部文件 + 模块模式
const worker = new Worker("worker.js", { type: "module" })

// ✅ 推荐: Blob Worker 用于动态场景
function createConfigurableWorker(options) {
  const code = generateWorkerCode(options)
  const blob = new Blob([code], { type: "application/javascript" })
  return new Worker(URL.createObjectURL(blob))
}

// ❌ 避免: 在生产环境中过度使用内联 Worker
// 原因: 代码管理困难,不利于缓存和优化
```

## 示例：图像处理 Worker

<img src="https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202505280313176.gif" alt="iShot_2025-05-28_03.12.46" style="zoom:50%;" />

::: code-group

```html [主线程]
<!DOCTYPE html>
<html>
  <head>
    <title>图像处理 Worker</title>
    <style>
      body {
        padding: 30px;
      }

      canvas {
        border: 1px solid #ccc;
      }
    </style>
  </head>

  <body>
    <h1>图像处理示例</h1>
    <input type="file" id="imageInput" accept="image/*" />
    <canvas id="canvas" width="800" height="800"></canvas>
    <button id="grayscale">转换为灰度</button>
    <button id="invert">反色</button>

    <script>
      const canvas = document.getElementById("canvas")
      const ctx = canvas.getContext("2d")
      const imageInput = document.getElementById("imageInput")
      const grayscaleBtn = document.getElementById("grayscale")
      const invertBtn = document.getElementById("invert")

      let originalImageData = null
      let worker = new Worker("image-worker.js")

      // 加载图像
      imageInput.addEventListener("change", function (e) {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = function (event) {
          const img = new Image()
          img.onload = function () {
            // 保持宽高比适应800x800 canvas
            const canvasAspect = canvas.width / canvas.height
            const imgAspect = img.width / img.height

            let drawWidth,
              drawHeight,
              offsetX = 0,
              offsetY = 0

            if (imgAspect > canvasAspect) {
              // 图片更宽，宽度适应
              drawWidth = canvas.width
              drawHeight = canvas.width / imgAspect
              offsetY = (canvas.height - drawHeight) / 2
            } else {
              // 图片更高，高度适应
              drawHeight = canvas.height
              drawWidth = canvas.height * imgAspect
              offsetX = (canvas.width - drawWidth) / 2
            }

            // 绘制图片居中显示，保持宽高比
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
            originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          }
          img.src = event.target.result
        }
        reader.readAsDataURL(file)
      })

      // 转换为灰度
      grayscaleBtn.addEventListener("click", function () {
        if (!originalImageData) return

        // 重新获取当前canvas的图像数据
        const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        worker.postMessage(
          {
            type: "grayscale",
            imageData: currentImageData
          },
          [currentImageData.data.buffer]
        )

        worker.onmessage = function (e) {
          if (e.data.type === "processed") {
            ctx.putImageData(e.data.imageData, 0, 0)
            // 更新原始图像数据引用
            originalImageData = e.data.imageData
          }
        }
      })

      // 反色
      invertBtn.addEventListener("click", function () {
        if (!originalImageData) return

        // 重新获取当前canvas的图像数据
        const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        worker.postMessage(
          {
            type: "invert",
            imageData: currentImageData
          },
          [currentImageData.data.buffer]
        )

        worker.onmessage = function (e) {
          if (e.data.type === "processed") {
            ctx.putImageData(e.data.imageData, 0, 0)
            // 更新原始图像数据引用
            originalImageData = e.data.imageData
          }
        }
      })
    </script>
  </body>
</html>
```

```JavaScript [worker 进程]
self.onmessage = function (e) {
  const { type, imageData } = e.data

  // 创建图像数据的副本以避免修改原始数据
  const data = new Uint8ClampedArray(imageData.data)
  const processedImageData = new ImageData(data, imageData.width, imageData.height)

  switch (type) {
    case "grayscale":
      applyGrayscale(processedImageData.data, imageData.width, imageData.height)
      break
    case "invert":
      applyInvert(processedImageData.data, imageData.width, imageData.height)
      break
  }

  // 发送处理后的图像数据回主线程
  self.postMessage(
    {
      type: "processed",
      imageData: processedImageData
    },
    [processedImageData.data.buffer]
  )
}

// 应用灰度滤镜
function applyGrayscale(data, width, height) {
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3
    data[i] = avg // R
    data[i + 1] = avg // G
    data[i + 2] = avg // B
    // Alpha 通道保持不变
  }
}

// 应用反色滤镜
function applyInvert(data, width, height) {
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 255 - data[i] // R
    data[i + 1] = 255 - data[i + 1] // G
    data[i + 2] = 255 - data[i + 2] // B
    // Alpha 通道保持不变
  }
}
```

:::

## 高级应用场景

### 1. 加密解密操作

Web Worker 非常适合执行加密解密等计算密集型任务:

:::: code-group

```javascript [主线程]
const cryptoWorker = new Worker("crypto-worker.js")

// 加密数据
async function encryptData(data) {
  return new Promise((resolve, reject) => {
    cryptoWorker.postMessage({
      action: "encrypt",
      data: data
    })

    cryptoWorker.onmessage = (event) => {
      if (event.data.error) {
        reject(new Error(event.data.error))
      } else {
        resolve(event.data.result)
      }
    }
  })
}

// 使用示例
const sensitiveData = { message: "Hello, World!" }
const encrypted = await encryptData(sensitiveData)
console.log("加密结果:", encrypted)
```

```javascript [crypto-worker.js]
// 使用 Web Crypto API 进行加密
self.onmessage = async function (event) {
  const { action, data } = event.data

  try {
    let result

    switch (action) {
      case "encrypt":
        result = await encrypt(data)
        break
      case "decrypt":
        result = await decrypt(data)
        break
      default:
        throw new Error("Unknown action")
    }

    self.postMessage({ result })
  } catch (error) {
    self.postMessage({ error: error.message })
  }
}

async function encrypt(data) {
  // 生成密钥
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt"
  ])

  // 加密数据
  const encoder = new TextEncoder()
  const encodedData = encoder.encode(JSON.stringify(data))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encodedData)

  return {
    encrypted: Array.from(new Uint8Array(encrypted)),
    iv: Array.from(iv)
  }
}

async function decrypt(encryptedData) {
  // 解密实现...
}
```

::::

### 2. 数据压缩与解压

:::: code-group

```javascript [主线程]
const compressionWorker = new Worker("compression-worker.js")

// 压缩大数据
async function compressLargeData(data) {
  return new Promise((resolve, reject) => {
    // 转换为 ArrayBuffer
    const jsonString = JSON.stringify(data)
    const encoder = new TextEncoder()
    const buffer = encoder.encode(jsonString).buffer

    compressionWorker.postMessage(
      {
        action: "compress",
        data: buffer
      },
      [buffer]
    ) // 转移所有权

    compressionWorker.onmessage = (event) => {
      resolve(event.data.compressed)
    }

    compressionWorker.onerror = reject
  })
}

// 使用示例
const largeDataset = generateLargeDataset() // 生成大数据
const compressed = await compressLargeData(largeDataset)
console.log(`压缩率: ${((1 - compressed.byteLength / largeDataset.length) * 100).toFixed(2)}%`)
```

```javascript [compression-worker.js]
importScripts("pako.min.js") // 使用 pako 库

self.onmessage = function (event) {
  const { action, data } = event.data

  try {
    let result

    switch (action) {
      case "compress":
        result = pako.deflate(new Uint8Array(data))
        break
      case "decompress":
        result = pako.inflate(new Uint8Array(data))
        break
    }

    self.postMessage(
      {
        compressed: result.buffer
      },
      [result.buffer]
    ) // 转移所有权
  } catch (error) {
    self.postMessage({ error: error.message })
  }
}
```

::::

### 3. WebAssembly 集成

Web Worker 可以与 WebAssembly 结合,获得接近原生的性能:

:::: code-group

```javascript [主线程]
const wasmWorker = new Worker("wasm-worker.js")

// 使用 WebAssembly 进行高性能计算
async function performHeavyCalculation(data) {
  return new Promise((resolve) => {
    wasmWorker.postMessage({
      type: "init",
      wasmUrl: "/wasm/calculator.wasm"
    })

    wasmWorker.onmessage = (event) => {
      if (event.data.type === "ready") {
        // WASM 已加载,发送计算任务
        wasmWorker.postMessage({
          type: "calculate",
          data: data
        })
      } else if (event.data.type === "result") {
        resolve(event.data.result)
      }
    }
  })
}
```

```javascript [wasm-worker.js]
let wasmModule = null

self.onmessage = async function (event) {
  const { type, data } = event.data

  switch (type) {
    case "init":
      // 加载 WebAssembly 模块
      const response = await fetch(event.data.wasmUrl)
      const bytes = await response.arrayBuffer()
      wasmModule = await WebAssembly.instantiate(bytes)

      self.postMessage({ type: "ready" })
      break

    case "calculate":
      if (wasmModule) {
        // 调用 WASM 函数
        const result = wasmModule.instance.exports.heavyCalculation(data)
        self.postMessage({ type: "result", result })
      }
      break
  }
}
```

::::

### 4. 大文件分片处理

:::: code-group

```javascript [主线程]
class FileProcessor {
  constructor(file, chunkSize = 1024 * 1024) {
    // 默认 1MB
    this.file = file
    this.chunkSize = chunkSize
    this.workers = []
    this.chunks = Math.ceil(file.size / chunkSize)
  }

  async process(workerCount = navigator.hardwareConcurrency || 4) {
    // 创建 Worker 池
    for (let i = 0; i < workerCount; i++) {
      this.workers.push(new Worker("file-chunk-worker.js"))
    }

    // 分配任务
    const results = await Promise.all(
      this.workers.map((worker, index) => {
        return this.processChunk(worker, index)
      })
    )

    // 清理 Worker
    this.workers.forEach((w) => w.terminate())

    return results
  }

  processChunk(worker, workerIndex) {
    return new Promise((resolve, reject) => {
      // 计算该 Worker 负责的分片
      const chunksForWorker = []

      for (let i = workerIndex; i < this.chunks; i += this.workers.length) {
        const start = i * this.chunkSize
        const end = Math.min(start + this.chunkSize, this.file.size)
        chunksForWorker.push({
          index: i,
          start,
          end,
          blob: this.file.slice(start, end)
        })
      }

      worker.postMessage({
        chunks: chunksForWorker,
        totalSize: this.file.size
      })

      worker.onmessage = (event) => {
        resolve(event.data.results)
      }

      worker.onerror = reject
    })
  }
}

// 使用示例
const fileInput = document.getElementById("fileInput")
fileInput.addEventListener("change", async (e) => {
  const file = e.target.files[0]
  const processor = new FileProcessor(file)

  const results = await processor.process()
  console.log("处理完成:", results)
})
```

```javascript [file-chunk-worker.js]
self.onmessage = async function (event) {
  const { chunks, totalSize } = event.data
  const results = []

  for (const chunk of chunks) {
    try {
      // 读取分片
      const buffer = await chunk.blob.arrayBuffer()

      // 处理分片 (例如: 计算哈希、解析数据等)
      const processed = await processChunk(buffer, chunk.index)

      results.push({
        index: chunk.index,
        result: processed,
        size: buffer.byteLength
      })

      // 发送进度
      self.postMessage({
        type: "progress",
        chunk: chunk.index,
        total: chunks.length
      })
    } catch (error) {
      results.push({
        index: chunk.index,
        error: error.message
      })
    }
  }

  self.postMessage({ type: "complete", results })
}

async function processChunk(buffer, index) {
  // 实现具体的处理逻辑
  // 例如: 计算哈希、解析数据等
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
  return Array.from(new Uint8Array(hashBuffer))
}
```

::::

## 构建工具集成：Vite / Webpack Worker 配置

在现代前端工程中，通常使用构建工具（Vite 或 Webpack）来打包项目，Worker 脚本的配置方式与原生开发有所不同。以下介绍主流构建工具中的 Worker 配置方案。

### Vite 中的 Worker 配置

Vite 对 Web Workers 提供了开箱即用的支持，推荐使用以下几种方式：

#### 方式一：`?worker&inline` 查询参数（推荐）

Vite 支持通过查询参数导入 Worker 脚本，这是最简洁的方式：

```javascript
// 导入 Worker 脚本（返回 Worker 构造函数）
import MyWorker from './worker.js?worker'

const worker = new MyWorker()
worker.postMessage({ data: [1, 2, 3] })
worker.onmessage = (e) => {
  console.log('结果:', e.data)
}
```

**查询参数说明：**

| 参数 | 说明 |
| ---- | ---- |
| `?worker` | 将文件作为 Worker 入口打包，导出 Worker 构造函数 |
| `?worker&inline` | 将 Worker 代码内联为 Blob URL，不产生额外请求 |
| `?worker&url` | 返回 Worker 文件的 URL 字符串 |
| `?sharedworker` | 作为 SharedWorker 导入（同理支持 inline/url） |

#### 方式二：`new Worker()` with `{ type: 'module' }`

如果不想使用导入语法，可以在 Vite 中使用标准的 `new Worker()` 配合 ES Module 类型：

```javascript
// vite.config.js 中无需特殊配置即可使用
const worker = new Worker(
  new URL('./worker.js', import.meta.url),
  { type: 'module' }
)

worker.onmessage = (e) => console.log(e.data)
worker.postMessage({ action: 'start' })
```

> **注意**：`new URL(..., import.meta.url)` 是 Vite/现代打包器的标准写法，确保开发环境和生产环境中路径都能正确解析。

#### 方式三：Vite 配置项

在 `vite.config.js` 中可以对 Worker 行为进行更精细的控制：

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',           // Worker 输出格式: 'es' | 'iife' | 'umd'
    plugins: [],            // Worker 专用的 Vite 插件
    rollupOptions: {         // Rollup 打包选项
      output: {
        // Worker chunk 文件命名
        entryFileNames: 'assets/workers/[name]-[hash].js'
      }
    }
  }
})
```

### Webpack 中的 Worker 配置

Webpack 5 对 Worker 有内置支持，也支持通过插件扩展。

#### 方式一：Webpack 5 内置 Worker（推荐）

Webpack 5 原生支持 `new Worker()` / `new SharedWorker()` 构造函数：

```javascript
// webpack.config.js
module.exports = {
  // 开启 Worker 支持（Webpack 5 默认开启）
  // 无需额外配置
}

// 源码中使用
const worker = new Worker(
  new URL('./worker.js', import.meta.url),
  { type: 'module' }
)
```

#### 方式二：`worker-loader`（Webpack 4 兼容）

对于旧版 Webpack 或需要更细粒度控制的场景：

```javascript
// 安装: npm install -D worker-loader

// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: {
          loader: 'worker-loader',
          options: {
            inline: 'fallback',  // 'no-fallback' | 'fallback' | true
            publicPath: '/workers/',
            filename: '[name].[hash].worker.js',
            esModule: true        // 启用 ES Module 导出
          }
        }
      }
    ]
  }
}
```

```javascript
// 源码中使用
import MyWorker from './my.worker.js'

const worker = new MyWorker()
worker.postMessage('hello')
```

#### 方式三：`comlink-loader`（基于 RPC 的 Worker 通信）

[Comlink](https://github.com/GoogleChromeLabs/comlink) 是 Google Chrome Labs 出品的库，可以让 Worker 通信像调用本地函数一样自然：

```javascript
// 安装: npm install comlink comlink-loader

// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: ['comlink-loader']
      }
    ]
  }
}
```

```javascript
// worker.js
import * as Comlink from 'comlink'

const obj = {
  counter: 0,
  async increment(amount) {
    this.counter += amount
    return this.counter
  }
}

export default Comlink.expose(obj)
```

```javascript
// main.js
import Worker from './worker.js'
import * as Comlink from 'comlink'

const instance = Comlink.wrap(new Worker())
const result = await instance.increment(5)
console.log(result) // 5
```

### 构建工具对比总结

| 特性 | Vite | Webpack 5 | worker-loader | comlink-loader |
| ---- | ---- | --------- | ------------- | -------------- |
| **导入语法** | `import w from './w?worker'` | `new URL()` + `new Worker()` | `import w from './w.worker'` | `import w from './w.worker'` |
| **ES Module** | ✅ 原生支持 | ✅ 原生支持 | 需配置 | ✅ 支持 |
| **HMR** | ✅ 支持 | ⚠️ 有限支持 | ❌ 不支持 | ❌ 不支持 |
| **内联选项** | `?inline` | 需插件 | `inline: true` | ❌ |
| **SharedWorker** | `?sharedworker` | ✅ 原生支持 | 需单独配置 | ❌ |
| **TypeScript** | ✅ 原生支持 | ✅ 原生支持 | 需声明文件 | 需声明文件 |
| **推荐指数** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ |

::: tip 选择建议
- **Vite 项目**：优先使用 `?worker` 查询参数，简洁且功能完善
- **Webpack 5 项目**：使用 `new URL() + new Worker()` 标准写法，无需额外依赖
- **需要 RPC 风格通信**：考虑 comlink-loader，大幅简化 Worker 通信代码
:::
