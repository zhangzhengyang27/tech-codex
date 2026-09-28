---
title: Node.js 核心面试题：深入理解 Stream（流）
description: Node.js Stream 的背压、pipe 机制与多种流类型的原理与高频面试题
keywords: [Node.js, AST, 编译, Stream]
category: Node.js
tags: [Node.js, 编译与底层原理]
---







# Node.js 核心面试题：深入理解 Stream（流）

## 1. 什么是 Stream（流）？

在 Node.js 中，**Stream（流）是一个用于处理流式数据的抽象接口**。它允许你以分段、有序的方式读取或写入数据，而不是一次性将所有数据加载到内存中。

想象一下你在观看一个很长的在线视频。你不需要等整个视频文件下载完毕才开始观看，而是边下载边播放。这就是流式处理的典型例子。

在 Node.js 中，很多内置模块都实现了 Stream 接口：

- HTTP 请求和响应 (`http.IncomingMessage`, `http.ServerResponse`)
- 文件 I/O (`fs.createReadStream`, `fs.createWriteStream`)
- TCP Sockets (`net.Socket`)
- 子进程的 `stdin`, `stdout`, `stderr`
- 数据压缩 (`zlib`)

**核心思想**：**流就是分段、有序地处理数据，以实现高效的 I/O 操作。**

## 2. 为什么要使用 Stream？

使用 Stream 主要有两大优势：

1.  **内存效率高**：你不需要将大量数据一次性加载到内存中。对于处理大文件或高流量网络请求等场景，这可以显著降低内存消耗。
2.  **时间效率高**：一旦开始接收数据，你就可以立即开始处理，而无需等待所有数据都传输完毕。这可以大大减少程序的初始响应时间。

### 场景：处理大文件

让通过一个具体的例子来对比传统方法和 Stream 方法的差异。

**项目初始化：**

```bash
mkdir stream-test
cd stream-test
npm init -y
# 安装 Node.js 类型定义，以获得更好的编码体验
npm install --save-dev @types/node
```

**传统方式：`fs.readFileSync`**

假设要读取一个 `index.html` 文件并将其内容作为 HTTP 响应返回。

`src/test-no-stream.mjs`:

```javascript
import http from "node:http"
import fs from "node:fs"
import path from "node:path"

const server = http.createServer(async function (req, res) {
  // 一次性读取整个文件到内存
  const data = fs.readFileSync(path.join(import.meta.dirname, "index.html"))
  res.end(data)
})

server.listen(8000, () => {
  console.log("Server is running on http://localhost:8000")
})
```

如果 `index.html` 文件非常大（例如几百 MB 或几 GB），`fs.readFileSync` 会将整个文件内容加载到内存中。这不仅会消耗大量内存，还可能导致进程因内存溢出而崩溃。同时，在文件完全读取之前，服务器无法向客户端发送任何数据，导致响应延迟。

**Stream 方式：`fs.createReadStream`**

现在，用 Stream 来重构上面的代码。

`src/test-with-stream.mjs`:

```javascript
import http from "node:http"
import fs from "node:fs"
import path from "node:path"

const server = http.createServer(async function (req, res) {
  // 创建一个可读流
  const readStream = fs.createReadStream(
    path.join(import.meta.dirname, "index.html")
  )

  // 将可读流通过 pipe 连接到可写流 (res)
  readStream.pipe(res)
})

server.listen(8000, () => {
  console.log("Server is running on http://localhost:8000")
})
```

在这个版本中，`fs.createReadStream` 创建了一个文件的可读流。数据会以小块（chunk）的形式从文件中读取，然后立即通过 `pipe` 方法写入到 HTTP 响应流 (`res`) 中。整个过程中，内存占用非常低，因为不需要在内存中缓冲整个文件。

### HTTP 传输中的流

当使用 Stream 返回 HTTP 响应时，HTTP 头部会发生一些变化。

- **`Content-Length`**：当使用 `fs.readFileSync` 时，Node.js 知道整个响应体的确切大小，因此它会在响应头中设置 `Content-Length`。浏览器根据这个长度来判断下载是否完成。

- **`Transfer-Encoding: chunked`**：当使用 Stream 时，Node.js 在开始发送数据时并不知道总长度。因此，它会使用分块传输编码。响应体会被分成多个块，每个块前面都有一个表示该块大小的十六进制数。当所有数据都发送完毕后，会发送一个大小为 0 的块来表示传输结束。

```text
  HTTP/1.1 200 OK
  Transfer-Encoding: chunked
  ...

  5
  Hello
  7
   World
  0

  ```

**面试题小结**：当被问及如何处理大文件下载时，可以回答使用 Stream，并解释其原理是基于 `Transfer-Encoding: chunked`，避免一次性加载内容到内存，从而实现高效传输。

## 3. Stream 的核心概念：`pipe`

`pipe()` 方法是 Stream 中最常用、最核心的功能之一。它就像一个管道，将一个可读流的输出连接到一个可写流的输入。

```javascript
readableStream.pipe(writableStream)
```

`pipe()` 会自动处理数据的流动和背压（backpressure）。例如，如果可写流的处理速度跟不上可读流的读取速度，`pipe()` 会自动暂停可读流，直到可写流准备好接收更多数据。（但注意：`pipe()` 并不能自动处理错误，详见后文“错误三”。）

**类比 Shell 命令：**

这与 Unix/Linux Shell 中的管道操作符 `|` 非常相似。

```bash
# ls 命令的输出流，作为 grep 命令的输入流
ls -l | grep "package"
```

在 Node.js 中，可以用 `pipe` 实现同样的效果：

`src/read-stdin.mjs`:

```javascript
// process.stdin 是一个可读流，代表进程的标准输入
process.stdin.on("data", function (chunk) {
  if (chunk) {
    // process.stdout 是一个可写流，代表进程的标准输出
    process.stdout.write(`Received: ${chunk.toString()}`)
  }
})
```

在终端中运行：

```bash
# "hello world" 作为输入，通过管道传给 node 脚本
echo "hello world" | node src/read-stdin.mjs
# 输出: Received: hello world
```

**总结**：`pipe()` 是连接 Stream 的胶水，它极大地简化了流式数据处理的编码。

## 4. Stream 的四种类型

Node.js 的 `stream` 模块提供了四种基本的 Stream 类型。所有其他的 Stream 都是基于这四种类型实现的。

### 类型对比表格

| 类型          | 描述                                                             | 典型实现                                                                     | 常用场景                                       |
| :------------ | :--------------------------------------------------------------- | :--------------------------------------------------------------------------- | :--------------------------------------------- |
| **Readable**  | **可读流**：作为数据源，可以从中读取数据。                       | `fs.createReadStream()`, `http.IncomingMessage` (request), `process.stdin`   | 读取文件、接收 HTTP 请求体、从标准输入读取数据 |
| **Writable**  | **可写流**：作为数据目标，可以向其中写入数据。                   | `fs.createWriteStream()`, `http.ServerResponse` (response), `process.stdout` | 写入文件、发送 HTTP 响应、向标准输出写入数据   |
| **Duplex**    | **双工流**：既可读又可写，读写操作相互独立。                     | `net.Socket` (TCP socket)                                                    | TCP/IP 套接字通信、进程间通信                  |
| **Transform** | **转换流**：一种特殊的 Duplex 流，其输出是其输入的某种计算结果。 | `zlib.createGzip()`, `crypto.createCipheriv()`                                 | 数据压缩、加密、格式转换                       |

---

### Readable (可读流)

可读流是数据的生产者。要实现一个自定义的可读流，你需要继承 `stream.Readable` 并实现 `_read()` 方法。

当流的内部缓冲区需要更多数据时，`_read()` 方法会被调用。在该方法内部，你可以通过 `this.push(data)` 来产生数据。当没有更多数据时，推送 `null` (`this.push(null)`) 来表示流的结束。

**示例：创建一个简单的可读流**

`src/readable-example.mjs`:

```javascript
import { Readable } from "node:stream"

// 继承 Readable 类
class SimpleReadable extends Readable {
  constructor(options) {
    super(options)
    this.source = [
      "阿门阿前一棵葡萄树，",
      "阿东阿东绿的刚发芽，",
      "蜗牛背着那重重的壳呀，",
      "一步一步地往上爬。"
    ]
  }

  // _read 方法是必须实现的
  _read() {
    const data = this.source.shift()
    if (data) {
      // 使用 push 将数据推入流中
      this.push(data)
    } else {
      // 推入 null 表示流结束
      this.push(null)
    }
  }
}

const readableStream = new SimpleReadable()

// 监听 'data' 事件来消费数据
readableStream.on("data", (chunk) => {
  console.log(chunk.toString())
})

// 监听 'end' 事件
readableStream.on("end", () => {
  console.log("--- 流结束 ---")
})
```

**实际应用场景**：`fs.createReadStream()` 就是一个典型的可读流，用于从文件中读取数据。HTTP 服务器中的 `request` 对象也是一个可读流，用于读取客户端发送的请求体。

### Writable (可写流)

可写流是数据的消费者。要实现一个自定义的可写流，你需要继承 `stream.Writable` 并实现 `_write()` 方法。

`_write(chunk, encoding, callback)` 方法接收要写入的数据块 (`chunk`)。处理完数据后，你**必须**调用 `callback()` 函数来通知流可以处理下一个数据块了。如果处理过程中发生错误，可以向 `callback` 传递一个 `Error` 对象。

**示例：创建一个简单的可写流**

`src/writable-example.mjs`:

```javascript
import { Writable } from "node:stream";
import fs from "node:fs";

// 继承 Writable 类
class SimpleWritable extends Writable {
  constructor(options) {
    super(options);
    // 为了演示，创建一个文件写入流
    // 在实际应用中，这里可能是任何数据目标，如数据库、网络套接字等
    this.fileStream = fs.createWriteStream("output.txt");
  }

  // _write 方法是必须实现的
  _write(chunk, encoding, callback) {
    console.log(`正在写入: ${chunk.toString()}`);
    // 实际写入到文件
    this.fileStream.write(chunk, (err) => {
      if (err) {
        // 如果发生错误，通过 callback 传递
        return callback(err);
      }
      // 写入成功，调用 callback 继续
      callback();
    });
  }
}

const writableStream = new SimpleWritable();

// 监听 'finish' 事件，表示所有数据都已写入
writableStream.on("finish", () => {
  console.log("--- 所有数据已写入完成 ---");
});

// 写入数据
writableStream.write("第一行\n");
writableStream.write("第二行\n");
writableStream.end("最后一行"); // end() 方法表示没有更多数据要写入
```

**实际应用场景**：`fs.createWriteStream()` 用于向文件写入数据。HTTP 服务器中的 `response` 对象是一个可写流，用于向客户端发送响应数据。

### Duplex (双工流)

双工流同时实现了可读和可写接口，并且读写操作是相互独立的。就像一个电话，你可以同时说话和听。

要实现一个自定义的双工流，你需要继承 `stream.Duplex` 并同时实现 `_read()` 和 `_write()` 方法。

**示例：模拟一个 Echo 服务**

`src/duplex-example.mjs`:

```javascript
import { Duplex } from "node:stream"

class EchoStream extends Duplex {
  _write(chunk, encoding, callback) {
    console.log(`接收到: ${chunk.toString()}`)
    // 将接收到的数据推入可读端
    this.push(chunk)
    callback()
  }

  _read() {
    // 因为数据是由 _write 动态推入的，所以 _read 无需做任何事
  }
}

const echoStream = new EchoStream()

// pipe 到自身，实现一个简单的 echo
// process.stdin -> echoStream (writable) -> echoStream (readable) -> process.stdout
process.stdin.pipe(echoStream).pipe(process.stdout)
```

**实际应用场景**：`net.Socket` 是最典型的双工流。在 TCP 连接中，客户端和服务器可以通过同一个 socket 双向通信。

### Transform (转换流)

转换流是一种特殊的双工流，它的读写操作是相关联的。它会对写入的数据进行某种转换，然后从可读端输出转换后的结果。

要实现一个自定义的转换流，你需要继承 `stream.Transform` 并实现 `_transform()` 方法。你也可以选择性地实现 `_flush()` 方法，用于在流结束时输出一些额外的数据。

**示例：创建一个将文本转换为大写的转换流**

`src/transform-example.mjs`:

```javascript
import { Transform } from "node:stream"

class ToUpperCaseStream extends Transform {
  // _transform 是必须实现的
  _transform(chunk, encoding, callback) {
    const upperCased = chunk.toString().toUpperCase()
    // 将转换后的数据推入可读端
    this.push(upperCased)
    // 调用 callback 继续
    callback()
  }
}

const toUpperCase = new ToUpperCaseStream()

console.log("请输入一些小写字母，然后按 Enter (输入 'exit' 退出):")

process.stdin.pipe(toUpperCase).pipe(process.stdout)
```

**实际应用场景**：`zlib.createGzip()` 是一个转换流，它接收原始数据，输出 Gzip 压缩后的数据。`crypto.createCipheriv()` 也是一个转换流，用于数据加密。

## 5. 高级概念与最佳实践

### Backpressure (背压)

**背压**是流系统中一个至关重要的概念。当可读流产生数据的速度快于可写流消费数据的速度时，就会出现问题。如果不加以控制，数据会在内存中堆积，最终可能导致内存耗尽。

`pipe()` 方法会自动处理背压。其工作原理如下：

1.  当可写流的内部缓冲区已满时，它的 `write()` 方法会返回 `false`。
2.  当 `pipe()` 检测到 `write()` 返回 `false` 时，它会暂停源可读流，停止从源头读取数据。
3.  当可写流的缓冲区清空并准备好接收更多数据时，它会触发一个 `'drain'` 事件。
4.  `pipe()` 监听到 `'drain'` 事件后，会恢复可读流，继续读取和传输数据。

**手动处理背压（不使用 `pipe()`）**

```javascript
// readable.on('data', (chunk) => {
//   const canWrite = writable.write(chunk);
//   if (!canWrite) {
//     // 如果缓冲区已满，暂停读取
//     readable.pause();
//     // 监听 drain 事件以恢复读取
//     writable.once('drain', () => {
//       readable.resume();
//     });
//   }
// });
```

**最佳实践**：**始终优先使用 `pipe()` 或 `pipeline()`**，因为它们能自动处理背压，使代码更简洁、更安全。

### 使用 `pipeline` 代替 `pipe`

虽然 `pipe()` 很方便，但它有一个主要缺点：**错误处理很麻烦**。如果管道中的任何一个流触发了错误，整个管道不会自动销毁，可能导致内存泄漏。

`stream.pipeline()` 是 `pipe()` 的一个更好的替代品，它提供了更好的错误处理机制。

`pipeline(source, ...transforms, destination, callback)`

- 它会将一系列流连接在一起。
- 当管道中任何一个流发生错误时，它会销毁所有流并调用一个统一的回调函数。

**示例：使用 `pipeline()` 进行文件压缩**

```javascript
import { pipeline } from "node:stream"
import { createReadStream, createWriteStream } from "node:fs"
import { createGzip } from "node:zlib"
import { promisify } from "node:util"

const pipe = promisify(pipeline)

async function compressFile(sourcePath, destPath) {
  try {
    const source = createReadStream(sourcePath)
    const gzip = createGzip()
    const destination = createWriteStream(destPath)

    await pipe(source, gzip, destination)
    console.log("文件压缩成功！")
  } catch (err) {
    console.error("管道处理失败:", err)
  }
}

// 确保存在 source.txt 文件
// compressFile("source.txt", "source.txt.gz");
```

**最佳实践**：对于由多个流组成的复杂管道，**强烈建议使用 `stream.pipeline()`** 来确保正确的错误处理和资源清理。

### Stream 错误处理

在处理 Stream 时，必须监听 `'error'` 事件。如果一个流触发了 `'error'` 事件而没有监听器，它会作为一个未捕获的异常抛出，导致 Node.js 进程崩溃。

```javascript
import fs from "node:fs"

const readStream = fs.createReadStream("non-existent-file.txt")

readStream.on("error", (err) => {
  console.error("发生了一个错误:", err.message)
})

// 如果没有上面的错误监听器，程序会崩溃
```

## 6. 实际业务场景代码示例

### 示例一：文件压缩

这个例子在 `pipeline()` 部分已经展示过，它是一个非常常见的场景：读取一个文件，通过一个转换流（Gzip），然后写入到另一个文件。

### 示例二：CSV 数据处理

假设有一个巨大的 CSV 文件，需要逐行读取、解析并处理其中的数据，而不想将整个文件加载到内存中。

**需要安装 `csv-parser`**: `npm install csv-parser`

`src/csv-processor.mjs`:

```javascript
import fs from "node:fs"
import csv from "csv-parser"

const results = []

fs.createReadStream("data.csv")
  .pipe(csv()) // csv-parser 是一个转换流
  .on("data", (data) => {
    // 每解析一行，就会触发一次 'data' 事件
    // 这里可以对每行数据进行处理
    if (parseInt(data.age, 10) > 30) {
      results.push(data)
    }
  })
  .on("end", () => {
    console.log("处理完成。年龄大于30的用户：")
    console.log(results)
  })
  .on("error", (err) => {
    console.error("处理CSV时出错:", err)
  })
```

### 示例三：实时日志转换

创建一个转换流，用于将 JSON 格式的日志字符串转换为更易读的格式。

`src/log-transformer.mjs`:

```javascript
import { Transform } from "node:stream"
import fs from "node:fs"

class LogTransformer extends Transform {
  _transform(chunk, encoding, callback) {
    try {
      const log = JSON.parse(chunk.toString())
      const formattedLog = `[${log.level.toUpperCase()}] ${new Date(
        log.timestamp
      ).toISOString()}: ${log.message}
`
      this.push(formattedLog)
      callback()
    } catch (err) {
      // 如果 JSON 解析失败，将错误传递给 callback
      callback(new Error("无效的日志格式"))
    }
  }
}

const logTransformer = new LogTransformer()
// 假设 app.log 包含 JSON 日志, e.g., {"level": "info", "message": "User logged in", "timestamp": 1678886400000}
const sourceLogStream = fs.createReadStream("app.log")

sourceLogStream.pipe(logTransformer).pipe(process.stdout)
```

### 示例四：流式处理 HTTP 请求体

在 Web 服务器中，当接收到大的文件上传时，使用流来处理请求体至关重要。

`src/http-upload-server.mjs`:

```javascript
import http from "node:http"
import fs from "node:fs"
import { pipeline } from "node:stream"

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/upload") {
    const destination = fs.createWriteStream("uploaded-file")

    pipeline(req, destination, (err) => {
      if (err) {
        console.error("上传失败:", err)
        res.statusCode = 500
        res.end("服务器内部错误")
        return
      }
      res.end("文件上传成功！")
    })
  } else {
    res.statusCode = 404
    res.end("未找到")
  }
})

server.listen(8000, () => console.log("服务器正在监听 8000 端口..."))
```

### 示例五：自定义双工流实现简单 RPC

可以使用双工流来模拟一个简单的远程过程调用（RPC）通道。

**需要安装 `uuid`**: `npm install uuid`

`src/rpc-stream.mjs`:

```javascript
import { Duplex } from "node:stream"
import { v4 as uuidv4 } from "uuid"

class RPCStream extends Duplex {
  constructor() {
    super({ objectMode: true }) // 使用对象模式
    this.pending_requests = new Map()
  }

  // 客户端调用
  call(method, params, callback) {
    const id = uuidv4()
    this.pending_requests.set(id, callback)
    this.write({ type: "request", id, method, params })
  }

  _write(chunk, encoding, callback) {
    // 服务器端处理请求或客户端处理响应
    if (chunk.type === "response") {
      const callback = this.pending_requests.get(chunk.id)
      if (callback) {
        callback(null, chunk.result)
        this.pending_requests.delete(chunk.id)
      }
    } else if (chunk.type === "request") {
      // 模拟服务器处理
      const result = `Result for ${chunk.method}`
      this.push({ type: "response", id: chunk.id, result })
    }
    callback()
  }

  _read() {}
}

// 模拟使用
const rpc = new RPCStream()
// 在真实场景中，这个流会连接到网络套接字
// 这里模拟网络通信，将自己的输出 pipe 回输入
rpc.on("data", (data) => rpc.write(data))

rpc.call("getUser", { id: 123 }, (err, result) => {
  if (err) {
    return console.error("RPC Error:", err)
  }
  console.log("RPC 响应:", result) // 输出: RPC 响应: Result for getUser
})
```

## 7. 常见错误与解决方案

### 错误一：未处理 'error' 事件导致进程崩溃

**问题描述**：任何 Stream 对象，如果触发了 `error` 事件但没有相应的监听器，该错误会作为未捕获的异常抛出，导致整个 Node.js 进程立即崩溃。

**错误示例**：

```javascript
import fs from "node:fs"

// 尝试读取一个不存在的文件
const readable = fs.createReadStream("non-existent-file.txt")

readable.on("data", (chunk) => {
  console.log(chunk)
})

// 缺少 .on('error', ...) 监听器
// 运行此代码将导致程序崩溃并抛出 ENOENT 错误
```

**解决方案**：**始终为所有类型的流（Readable, Writable, Duplex, Transform）添加 `error` 事件监听器。**

**正确示例**：

```javascript
import fs from "node:fs"

const readable = fs.createReadStream("non-existent-file.txt")

readable.on("data", (chunk) => {
  console.log(chunk)
})

// 正确添加错误监听器
readable.on("error", (err) => {
  console.error("读取文件时发生错误:", err.message)
  // 在这里可以进行优雅的错误处理，而不是让程序崩溃
})
```

**最佳实践**：使用 `stream.pipeline()`，它能集中处理管道中所有流的错误。

### 错误二：在 `_write` 或 `_transform` 中忘记调用 `callback`

**问题描述**：在自定义 Writable 或 Transform 流时，`_write()` 或 `_transform()` 方法的 `callback` 函数是通知流“当前数据块已处理完毕，可以接收下一个了”的信号。如果忘记调用它，流会永远等待，导致整个管道被“卡住”，不再处理任何数据。

**错误示例**：

```javascript
import { Transform } from "node:stream"

class HangingTransform extends Transform {
  _transform(chunk, encoding, callback) {
    console.log(`接收到数据: ${chunk}`)
    // 忘记调用 callback()，流将在此处挂起
  }
}

const hanging = new HangingTransform()
process.stdin.pipe(hanging).pipe(process.stdout) // 你会发现输入后没有任何输出
```

**解决方案**：确保在 `_write()` 或 `_transform()` 的所有逻辑分支中都调用了 `callback()`。如果发生错误，将错误作为第一个参数传递给 `callback(err)`。

**正确示例**：

```javascript
import { Transform } from "node:stream"

class WorkingTransform extends Transform {
  _transform(chunk, encoding, callback) {
    try {
      const processed = chunk.toString().toUpperCase()
      this.push(processed)
      // 成功处理后调用 callback
      callback()
    } catch (err) {
      // 发生错误时，将错误传递给 callback
      callback(err)
    }
  }
}
```

### 错误三：使用 `pipe` 时的内存泄漏

**问题描述**：当使用 `readable.pipe(writable)` 时，如果 `writable` 流出错并关闭，`readable` 流并不会被自动销毁。如果 `readable` 是一个长时间运行的流（例如，一个网络套接字），它将继续在内存中缓冲数据，最终导致内存泄漏。

**场景示例**：

```javascript
// readable.pipe(transform1).pipe(transform2).pipe(writable);
// 如果 transform2 或 writable 出错，readable 和 transform1 可能不会被关闭
```

**解决方案**：使用 `stream.pipeline()`。它能确保一旦管道中任何一个环节出错，所有参与的流都会被正确地清理和销毁。

```javascript
import { pipeline } from "node:stream"

pipeline(readable, transform1, transform2, writable, (err) => {
  if (err) {
    console.error("管道处理失败，所有流都已销毁。", err)
  } else {
    console.log("管道处理成功。")
  }
})
```

### 错误四：在 `push(null)` 后再次调用 `push`

**问题描述**：在实现 Readable 流时，`this.push(null)` 是一个明确的信号，表示流的数据已经全部产生完毕。在此之后再次调用 `this.push(data)` 会触发一个 `ERR_STREAM_PUSH_AFTER_EOF`（EOF: End-of-File）错误。

**错误示例**：

```javascript
import { Readable } from "node:stream"

class BadReadable extends Readable {
  _read() {
    this.push("some data")
    this.push(null) // 发送结束信号
    this.push("more data") // 错误！在结束后再次推送数据
  }
}

const badReadable = new BadReadable()
badReadable.on("error", (err) => console.error(err.message)) // 会捕获到错误
badReadable.pipe(process.stdout)
```

**解决方案**：精心设计你的 `_read` 方法的逻辑，确保在推送 `null` 之后不会再有任何 `push` 操作。通常需要使用一个状态变量来跟踪流是否已经结束。

```javascript
class GoodReadable extends Readable {
  constructor(options) {
    super(options)
    this.ended = false
  }
  _read() {
    if (this.ended) return

    this.push("some data")

    this.push(null) // 发送结束信号
    this.ended = true // 设置状态
  }
}
```

## 8. 性能优化与最佳实践

### 1. 优先使用 `pipeline` 或 `finished`

- **`pipeline()`**：如前所述，它是连接多个流的最安全方式，能妥善处理错误和资源清理。
- **`finished()`**：一个辅助函数，用于在一个流结束、完成或出错时获得通知。它比监听多个事件（`'end'`, `'finish'`, `'error'`）更可靠。

```javascript
import { finished } from "node:stream"
import fs from "node:fs"

const rs = fs.createReadStream("archive.tar")

finished(rs, (err) => {
  if (err) {
    console.error("流处理失败", err)
  } else {
    console.log("流处理成功")
  }
})
```

### 2. 理解和调整 `highWaterMark`

- **`highWaterMark`** 是一个阈值，定义了流内部缓冲区可以存储多少数据。单位是字节（对于普通流）或对象数量（对于 `objectMode` 流）。
- **Readable 流**：当缓冲区数据达到 `highWaterMark` 时，流会暂时停止从底层资源读取数据。
- **Writable 流**：当缓冲区数据达到 `highWaterMark` 时，`write()` 方法会返回 `false`，触发背压。
- **默认值**：对于普通流通常是 `16KB`，对于 `objectMode` 流是 `16`。

**调整场景**：

- 如果你处理的是大量小数据块，并且网络或磁盘 I/O 很快，可以适当**增大 `highWaterMark`** 来减少系统调用的频率，提高吞吐量。
- 如果内存非常宝贵，或者你希望更快地响应背压，可以**减小 `highWaterMark`**。

```javascript
// 创建一个具有 64KB 缓冲区的可读流
const readable = fs.createReadStream("large-file.txt", { highWaterMark: 64 * 1024 })

// 创建一个只能缓冲 10 个对象的可写流
const writable = new MyWritable({ objectMode: true, highWaterMark: 10 })
```

### 3. 明智地使用 `objectMode`

- **`objectMode: true`** 允许流传输任意的 JavaScript 对象（`null` 除外）。
- **性能**：对象模式下的流比处理字符串和 Buffer 的标准流要慢，因为它涉及更复杂的内部处理。
- **使用场景**：当你需要处理的是结构化数据而不是原始字节时，例如数据库查询结果、JSON 解析后的对象、RPC 消息等。

**最佳实践**：仅在必要时使用 `objectMode`。如果你的管道中有一部分可以处理原始 Buffer，请尽量保持标准模式，只在需要处理对象的环节使用转换流进入和退出对象模式。

### 4. 使用异步迭代器 (`for await...of`) 消费可读流

从 Node.js v10 开始，可读流实现了异步迭代器协议。这为消费流数据提供了一种更现代、更简洁的语法，可以与 `async/await` 完美结合。

**传统方式**：

```javascript
readable.on("data", (chunk) => {
  console.log(chunk)
})
readable.on("end", () => {
  console.log("Finished")
})
```

**现代方式 (`for await...of`)**：

```javascript
async function logChunks(readable) {
  try {
    for await (const chunk of readable) {
      console.log(chunk)
    }
    console.log("Finished")
  } catch (err) {
    console.error("异步迭代时出错:", err)
  }
}

logChunks(fs.createReadStream("my-file.txt"))
```

这种方式会自动处理 `error` 事件（通过 `try...catch`），并且代码结构更清晰，避免了回调地狱。

### 5. 不要重用已结束的流

一个流一旦发出 `end` (Readable) 或 `finish` (Writable) 事件，它的生命周期就结束了。你不能向一个已结束的可写流再次写入数据，也不能从一个已结束的可读流中再次 `pipe` 数据。任何这样的尝试都可能导致错误。如果需要重复一个操作，请创建新的流实例。

## 9. 相关 API 官方文档

为了更深入地学习，请参考 Node.js 官方文档：

- [Stream API](https://nodejs.org/api/stream.html)
- [File System API (fs)](https://nodejs.org/api/fs.html)
- [HTTP API](https://nodejs.org/api/http.html)
- [Zlib API](https://nodejs.org/api/zlib.html)
