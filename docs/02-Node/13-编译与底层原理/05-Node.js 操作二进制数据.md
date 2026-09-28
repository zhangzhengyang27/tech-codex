---
title: Node.js 如何操作二进制数据？
description: Buffer、TypedArray 与二进制协议的编解码，含大小端序与内存视图
keywords: [Node.js, AST, 编译]
category: Node.js
tags: [Node.js, 编译与底层原理]
---







# Node.js 如何操作二进制数据？

在软件开发中，**二进制数据**是所有信息的基础。无论是存储在硬盘上的文件、通过网络传输的数据包，还是内存中的图像像素，其本质都是一串由 0 和 1 组成的序列。

在 Node.js 中，高效、准确地操作这些二进制数据是开发者必须掌握的核心技能之一。本篇文章将带你从基础概念出发，深入理解 Node.js 提供的强大工具，并通过实际案例掌握其应用精髓。

---

## 1. 理解二进制数据

### 1.1 什么是二进制数据？

在计算机世界中，**二进制数据**是信息的最基本表示形式。与日常阅读和编写的文本（如 "Hello, World!"）不同，二进制数据直接对应于计算机内存中的原始字节。一个**字节（Byte）**由 8 个**位（Bit）**组成，每一位的值要么是 0，要么是 1。

想象一下，当你有一张图片、一段音频或一个可执行文件时，它们并非以字符的形式存储，而是以这种底层的字节序列存在。例如，一个英文字符 `'A'` 在 UTF-8 编码下，会被表示为十进制的 `65`，也就是二进制的 `01000001`，这正是 1 个字节。

当需要处理图像的像素信息、解析网络协议中的特定字段，或者读取一个结构复杂的文件时，仅仅将其视为普通字符串是远远不够的。必须能够深入到字节层面，对这些原始数据进行**精确到字节的读写、修改和转换**。这就是操作二进制数据的核心意义。

### 1.2 为何在 Node.js 中操作二进制数据很重要？

Node.js 以其事件驱动、非阻塞 I/O 的特性，在处理 I/O 密集型任务时表现出色，这使得它成为构建高性能网络应用、微服务和数据处理管道的理想选择。而这些应用场景，无一例外地都涉及到大量的二进制数据流。

- **文件系统操作**：当你使用 `fs.readFile` 读取一张图片、一个视频或任何非文本文件时，Node.js 返回的默认就是 `Buffer` 对象。你需要理解如何解析和处理这些 `Buffer` 才能进一步操作文件内容。
- **网络通信**：HTTP 请求和响应的 body、WebSocket 帧、TCP/UDP 数据包，在网络上传输的都是二进制流。解析协议、构建响应，都需要对二进制数据进行精确操作。
- **数据转换与处理**：在处理图像（如调整大小、添加水印）、音频（如格式转换）、或者进行数据压缩/解压缩时，你都是在直接操纵二进制数据。
- **数据库交互**：与数据库交互时，特别是存储和读取 BLOB（Binary Large Object）类型的数据，同样离不开二进制处理。

因此，掌握 Node.js 中的二进制数据操作，不仅是深入理解其底层机制的关键，更是构建高效、健壮应用的基石。

---

## 2. JavaScript 原生二进制处理

在 ES6 之前，JavaScript 语言本身缺乏对二进制数据的原生支持，这限制了其在浏览器端处理复杂数据的能力。为了解决这个问题，W3C 和 Khronos 等组织联合制定了 **JavaScript Typed Array** 规范，引入了一套全新的 API，为 Web 开发者打开了直接操作内存的大门。这套规范后来被 Node.js 完整采纳，成为其处理二进制数据的基础。

### 2.1 `ArrayBuffer`：内存的容器

`ArrayBuffer` 是所有 JavaScript 二进制操作的基础。你可以把它看作一块**固定大小、连续且初始为空的原始内存区域**。重要的是，你不能直接读写 `ArrayBuffer` 中的内容。它只是一个**容器**，一个**“黑盒”**。为了访问它，你需要一个“钥匙”或“视图”。

```javascript
// 创建一个长度为 16 字节的 ArrayBuffer
const buffer = new ArrayBuffer(16)
console.log(buffer.byteLength) // 输出: 16
```

### 2.2 `TypedArray`：解读内存的视图

**TypedArray** 是一类数组的统称，它们为 `ArrayBuffer` 提供了具体的“视角”。通过指定一个类型（如 `Uint8`、`Int16`、`Float32` 等），`TypedArray` 告诉 JavaScript 引擎应该如何解析 `ArrayBuffer` 中的字节。

例如，`Uint8Array` 将每个字节视为一个无符号的 8 位整数（范围 0-255），而 `Int16Array` 则将每两个字节视为一个有符号的 16 位整数（范围 -32768 到 32767）。

```javascript
// 创建一个 8 字节的 ArrayBuffer
const buffer = new ArrayBuffer(8)

// 创建一个视图，将 buffer 视为一个包含 2 个 32 位有符号整数的数组
const int32View = new Int32Array(buffer)
console.log(int32View.length) // 输出: 2 (8 字节 / 4 字节每元素)

// 创建一个视图，将同一个 buffer 视为一个包含 8 个 8 位无符号整数的数组
const uint8View = new Uint8Array(buffer)
console.log(uint8View.length) // 输出: 8 (8 字节 / 1 字节每元素)

// 通过视图写入数据
int32View[0] = 256
console.log(int32View) // 输出: Int32Array(2) [256, 0]

// 通过另一个视图观察数据的变化
// 256 的二进制是 100000000，需要两个字节存储 (1, 0)
console.log(uint8View) // 输出: Uint8Array(8) [0, 1, 0, 0, 0, 0, 0, 0]
```

### 2.3 `DataView`：精细化读写控制

虽然 `TypedArray` 提供了便捷的方式来按元素类型访问数据，但它有一个限制：**整个数组的视角必须是统一的**。如果你需要在一个混合结构的数据中，先读取一个字节，再读取一个 32 位浮点数，接着再读取两个字节，`TypedArray` 就显得力不从心了。

`DataView` 正是为了解决这个问题而生的。它提供了一个**低层级的接口**，允许你**忽略字节边界**，在 `ArrayBuffer` 的任意偏移位置，以任意类型读写数据。

```javascript
const buffer = new ArrayBuffer(12) // 创建一个 12 字节的 buffer
const view = new DataView(buffer)

// 在偏移量 0 处写入一个 16 位无符号整数 (256)
view.setUint16(0, 256)
// 在偏移量 4 处写入一个 32 位浮点数 (3.14)
view.setFloat32(4, 3.14)
// 在偏移量 9 处写入一个 8 位有符号整数 (-1)
view.setInt8(9, -1)

// 读取数据
console.log(view.getUint16(0)) // 输出: 256
console.log(view.getFloat32(4)) // 输出: 3.140000104904175 (浮点精度)
console.log(view.getInt8(9)) // 输出: -1
```

`DataView` 的 `set` 和 `get` 方法（如 `setUint16`, `getFloat32`）都接受一个**字节偏移量**作为参数，这使得它成为解析和构建复杂二进制协议（如网络包、文件格式）的理想工具。

### 2.4 字节序：大端与小端 (Big-Endian vs. Little-Endian)

在操作多字节数据（如 16 位、32 位整数）时，一个核心问题是：**这些字节在内存中的排列顺序是什么？**

想象一下，一个 16 位整数 `0x1234`（十进制为 4660），它由两个字节组成：`0x12` 和 `0x34`。

- **大端序 (Big-Endian)**：最高有效字节（`0x12`）存储在最低的内存地址。对人类来说，这更直观，就像写数字一样，从左到右，高位在前。
- **小端序 (Little-Endian)**：最低有效字节（`0x34`）存储在最低的内存地址。这是现代 Intel 和 AMD 处理器（x86, x64）的标准模式。

网络协议（如 TCP/IP）通常规定使用**大端序**，因此也被称为**网络字节序**。而大多数个人电脑的内部处理则使用**小端序**。

`DataView` 允许你显式地指定字节序，而 `TypedArray` 则**总是使用运行代码的计算机的本机字节序**。

```javascript
const buffer = new ArrayBuffer(2)
const view = new DataView(buffer)

// 使用大端序写入
view.setUint16(0, 0x1234, false) // false 代表大端序
console.log(view.getUint8(0).toString(16)) // 输出: "12"
console.log(view.getUint8(1).toString(16)) // 输出: "34"

// 使用小端序写入
view.setUint16(0, 0x1234, true) // true 代表小端序
console.log(view.getUint8(0).toString(16)) // 输出: "34"
console.log(view.getUint8(1).toString(16)) // 输出: "12"
```

理解字节序对于编写跨平台或进行网络通信的代码至关重要，否则你可能会遇到数据被“颠倒”的诡异 bug。

---

## 3. Node.js 的核心：Buffer

`Buffer` 是 Node.js 对 `ArrayBuffer` 的扩展和封装，专为服务器端的高性能二进制数据处理而设计。`Buffer` 在 Node.js 中还是一个全局对象（如今官方也推荐显式地从 `node:buffer` 导入），足见其重要性。它提供了比原生 `ArrayBuffer` 和 `DataView` 更为丰富、便捷和高效的 API，是 Node.js 开发者日常工作中最亲密的伙伴。

### 3.1 Buffer 简介 (与 `ArrayBuffer` 的关系)

`Buffer` 类的实例，其底层本质上就是一个 `ArrayBuffer` 的**视图**。你可以通过 `.buffer` 属性访问到它背后的 `ArrayBuffer`。

```javascript
const buf = Buffer.from("Hello")
console.log(buf instanceof Uint8Array) // true! Buffer 是 Uint8Array 的子类
console.log(buf.buffer instanceof ArrayBuffer) // true
```

这意味着 `Buffer` 继承了 `TypedArray`（具体来说是 `Uint8Array`）的所有特性，并在此基础上，针对 Node.js 的常用场景（如字符串转换、网络流处理）进行了大量的功能增强和性能优化。

### 3.2 创建 Buffer

Node.js 提供了几种创建 `Buffer` 实例的方法，以满足不同的需求和安全考量。

#### 3.2.1 `Buffer.from`

这是最常用、最安全的创建方式，它会**复制**传入的数据，生成一个新的 `Buffer` 实例。

```javascript
// 1. 从字符串创建（默认 UTF-8 编码）
const buf1 = Buffer.from("Node.js 二进制")
console.log(buf1) // <Buffer 4e 6f 64 65 2e 6a 73 20 e4 ba 8c e8 bf 9b e5 88 b6>

// 2. 从字符串创建，并指定编码
const buf2 = Buffer.from("SGVsbG8gV29ybGQ=", "base64") // Base64 解码
console.log(buf2.toString()) // 输出: Hello World

// 3. 从字节数组创建
const buf3 = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f])
console.log(buf3.toString()) // 输出: Hello

// 4. 从另一个 Buffer 或 TypedArray 创建（复制数据）
const buf4 = Buffer.from(buf3)
buf4[0] = 0x68 // 修改 buf4
console.log(buf3.toString()) // 原 buf3 不受影响，输出: Hello
```

#### 3.2.2 `Buffer.alloc`

此方法创建一个**已初始化**的 `Buffer`，其所有字节都被预先填充为 0（或你指定的值）。这保证了创建的 `Buffer` 不会包含任何旧的、敏感的数据，是处理敏感信息时的安全选择。

```javascript
// 创建一个长度为 10 字节，并用 0 填充的 Buffer
const buf1 = Buffer.alloc(10)
console.log(buf1) // <Buffer 00 00 00 00 00 00 00 00 00 00>

// 创建一个长度为 10 字节，并用 'A' (0x41) 填充的 Buffer
const buf2 = Buffer.alloc(10, "A")
console.log(buf2) // <Buffer 41 41 41 41 41 41 41 41 41 41>

// 创建一个长度为 10 字节，并用 0x42 填充的 Buffer
const buf3 = Buffer.alloc(10, 0x42)
console.log(buf3) // <Buffer 42 42 42 42 42 42 42 42 42 42>
```

#### 3.2.3 `Buffer.allocUnsafe` (及安全警告)

此方法创建一个**未初始化**的 `Buffer`。它的速度比 `Buffer.alloc()` 更快，因为它跳过了内存清零的步骤。但请注意，新创建的 `Buffer` 可能包含**旧的数据**，这些数据可能来自之前被释放的内存。如果这些旧数据包含密码、密钥等敏感信息，就可能造成泄露。

```javascript
// 创建一个长度为 10 字节的未初始化 Buffer
const buf = Buffer.allocUnsafe(10)
console.log(buf) // 输出可能类似于: <Buffer 00 00 00 00 00 00 00 00 00 00>
// 注意: 虽然这里看起来是 0，但请不要依赖这个行为！

// 安全使用场景：当你**立即**用新数据完全覆盖它时
const unsafeBuf = Buffer.allocUnsafe(1024)
// 立即用 fs.read 填充它，或立即用新数据覆盖
// fs.readSync(fd, unsafeBuf, 0, unsafeBuf.length, 0);
```

**最佳实践**：除非你非常确定性能瓶颈在这里，并且你**立即**用新数据覆盖了整个 `Buffer`，否则请优先使用 `Buffer.from()` 和 `Buffer.alloc()`。

### 3.3 读写 Buffer

`Buffer` 提供了丰富的 API 来读写各种类型的数据，其功能远比 `DataView` 更强大。

#### 3.3.1 读写整数 (`readInt*`, `writeInt*`)

你可以直接在 `Buffer` 的指定偏移位置读写各种位宽和符号的整数，并显式指定字节序。

```javascript
const buf = Buffer.alloc(8)

// 写入数据
buf.writeUInt32BE(0x12345678, 0) // 大端序写入 32 位无符号整数
buf.writeInt16LE(-1234, 4) // 小端序写入 16 位有符号整数

// 读取数据
console.log(buf.readUInt32BE(0).toString(16)) // 输出: 12345678
console.log(buf.readInt16LE(4)) // 输出: -1234

// 尝试读取超出 Buffer 边界会抛出异常
// console.log(buf.readUInt32BE(5)); // RangeError [ERR_OUT_OF_RANGE]
```

#### 3.3.2 读写字符串 (`toString`, `write`)

`Buffer` 与字符串的互转是其最常用的功能之一。

```javascript
const buf = Buffer.alloc(256)

// 将字符串写入 Buffer (默认 UTF-8 编码)
const len = buf.write("Hello, 世界!", "utf8")
console.log(`写入了 ${len} 个字节`) // 输出: 写入了 14 个字节

// 将 Buffer 转换为字符串
console.log(buf.toString("utf8", 0, len)) // 输出: Hello, 世界!

// 只转换一部分
console.log(buf.toString("utf8", 0, 5)) // 输出: Hello

// 使用不同的编码
console.log(buf.toString("hex", 0, len)) // 输出: 48656c6c6f2c20e4b896e7958c21
console.log(buf.toString("base64", 0, len)) // 输出: SGVsbG8sIOS4lueVjCE=
```

### 3.4 操作 Buffer

`Buffer` 提供了多种方法来切片、拼接和拷贝数据，这些操作对于处理网络流和文件数据至关重要。

#### 3.4.1 `slice` (零拷贝切片)

`slice()` 方法返回一个新的 `Buffer`，它与原 Buffer **共享底层内存**。这意味着修改切片后的 `Buffer` 会**直接影响**到原 `Buffer`，反之亦然。由于没有数据拷贝，这个操作非常高效。

```javascript
const buf1 = Buffer.from("Buffer is a powerful tool!")
const buf2 = buf1.slice(0, 6) // 从索引 0 开始，截取 6 个字节

console.log(buf2.toString()) // 输出: Buffer

// 修改 buf2 会影响 buf1
buf2.write("MODIFY")
console.log(buf1.toString()) // 输出: MODIFY is a powerful tool!
```

#### 3.4.2 `copy`

`copy()` 方法将当前 `Buffer` 中的一部分数据**拷贝**到另一个 `Buffer` 中。这是一个**数据复制**操作，会占用额外的内存，但两个 `Buffer` 之间互不影响。

```javascript
const buf1 = Buffer.from("ABCDEFG")
const buf2 = Buffer.alloc(7)

// 将 buf1 的全部内容拷贝到 buf2
buf1.copy(buf2)
console.log(buf2.toString()) // 输出: ABCDEFG

// 修改 buf2 不会影响 buf1
buf2.write("abcdefg")
console.log(buf1.toString()) // 输出: ABCDEFG (原 buf1 未变)
```

#### 3.4.3 `concat`

`concat()` 是一个静态方法，用于将多个 `Buffer` 拼接成一个新的 `Buffer`。在处理网络数据流时，由于数据可能分多次到达，这个方法非常有用。

```javascript
const buf1 = Buffer.from("Hello, ")
const buf2 = Buffer.from("World!")
const buf3 = Buffer.from(" How are you?")

// 拼接多个 Buffer
const combined = Buffer.concat([buf1, buf2, buf3])
console.log(combined.toString()) // 输出: Hello, World! How are you?

// 可以指定总长度，如果计算错误可能导致数据截断或填充
const combined2 = Buffer.concat([buf1, buf2], 10)
console.log(combined2.toString()) // 输出: Hello, Wo (只取了前10个字节)
```

### 3.5 Buffer 与字符编码

`Buffer` 支持多种字符编码，如 `utf8`, `ascii`, `base64`, `hex`, `latin1` 等。在处理不同来源的数据时，正确的编码选择至关重要。

```javascript
const text = "你好，Node.js!"

// UTF-8 编码 (默认, 可变长, 支持全球字符)
const utf8Buf = Buffer.from(text, "utf8")
console.log("UTF-8 长度:", utf8Buf.length) // 每个中文字符通常占3字节

// Base64 编码 (用于二进制数据文本化)
const base64Text = utf8Buf.toString("base64")
console.log("Base64:", base64Text)

// 从 Base64 解码回 Buffer
const decodedBuf = Buffer.from(base64Text, "base64")
console.log("解码后:", decodedBuf.toString("utf8"))

// Hex 编码 (每个字节用两个十六进制字符表示)
const hexText = utf8Buf.toString("hex")
console.log("Hex:", hexText)
```

---

## 4. 不可变二进制对象：Blob

在 JavaScript 和 Node.js 的世界中，`Blob`（Binary Large Object）代表了一个**不可变**的、原始的二进制数据对象。与 `Buffer` 的可变性形成鲜明对比，`Blob` 的设计哲学是**一旦创建，就不能被修改**。这种特性在多线程和跨上下文通信（如 Web Workers）中显得尤为宝贵，因为它从根本上避免了数据竞争和状态同步的问题。

### 4.1 什么是 Blob？

`Blob` 对象本身并不直接存储数据，它更像是一个**指向底层二进制数据的引用**，并携带着关于这些数据的大小和 MIME 类型的元信息。浏览器中的 `File` 对象就是 `Blob` 的一个特殊子类，它额外包含了文件名和最后修改时间等信息。

在 Node.js v18 及更高版本中，`Blob` 得到了原生支持，使得同构的 JavaScript 代码（同时运行在浏览器和服务器）在处理二进制数据时更加统一。

### 4.2 何时使用 Blob？(不可变性与多线程)

- **数据不可变性**：当你需要确保一段二进制数据在传递过程中**绝对不被修改**时，`Blob` 是最佳选择。例如，将用户上传的文件缓存起来，供多个处理流程读取，但又不希望任何一个流程意外或恶意地修改原始数据。
- **跨线程/进程通信**：在使用 `worker_threads` 或 `child_process` 进行多线程/进程编程时，传递 `Blob` 比传递 `Buffer` 更安全。因为 `Buffer` 是可变的，如果多个线程同时操作同一个 `Buffer`，就可能引发竞态条件。而 `Blob` 的不可变性天然避免了这种风险。
- **流式处理**：`Blob` 对象可以很容易地转换为一个 `ReadableStream`，这对于处理大型文件或进行流式上传/下载非常有用。

### 4.3 Blob 的使用

```javascript
const { Blob } = require("node:buffer")

// 1. 从字符串创建 Blob
const blob1 = new Blob(["Hello, ", "Node.js Blob!"], { type: "text/plain" })
console.log(blob1.size) // 输出: 20 (字节大小)
console.log(blob1.type) // 输出: text/plain

// 2. 从 Buffer 创建 Blob
const buf = Buffer.from("This is from a Buffer")
const blob2 = new Blob([buf])
console.log(blob2.size) // 输出: 21

// 3. 将 Blob 转换为文本 (异步操作)
blob1.text().then((text) => {
  console.log("Blob content:", text) // 输出: Hello, Node.js Blob!
})

// 4. 将 Blob 转换为 ArrayBuffer (异步操作)
blob2.arrayBuffer().then((ab) => {
  const view = new Uint8Array(ab)
  console.log("As Uint8Array:", view)
})

// 5. 创建 Blob 的切片 (同样返回新的 Blob，不拷贝数据)
const slice = blob1.slice(0, 5, "text/plain")
slice.text().then(console.log) // 输出: Hello

// 6. 使用 async/await 语法
async function readBlob(blob) {
  const text = await blob.text()
  console.log("Async read:", text)
}
readBlob(blob1)
```

---

## 5. 实战应用场景

理论知识是基础，但真正的掌握来自于实践。下面，将通过三个具体的案例，展示如何在实际开发中运用 `Buffer` 和二进制数据操作来解决真实问题。

### 5.1 场景一：处理文件上传

在 Web 应用中，用户上传文件是基本功能。服务器端需要接收这些文件数据，并将其保存到磁盘或云存储中。

```javascript
const http = require("node:http")
const fs = require("node:fs")
const path = require("node:path")

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/upload") {
    const filename = `upload_${Date.now()}.bin`
    const filePath = path.join(__dirname, "uploads", filename)
    const writeStream = fs.createWriteStream(filePath)

    // req 是一个可读流，数据以 Buffer 块的形式到达
    req.on("data", (chunk) => {
      // 'chunk' 就是一个 Buffer
      console.log(`Received ${chunk.length} bytes of data.`)
      writeStream.write(chunk)
    })

    req.on("end", () => {
      writeStream.end()
      res.writeHead(200, { "Content-Type": "text/plain" })
      res.end("File uploaded successfully!")
    })

    req.on("error", (err) => {
      console.error("Upload error:", err)
      res.writeHead(500)
      res.end("Upload failed!")
    })
  } else {
    res.writeHead(404)
    res.end("Not Found")
  }
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
```

在这个例子中，`req` 对象是一个 `ReadableStream`，它会以 `Buffer` 的形式分块（chunk）接收上传的文件数据。无需手动解析这些数据，只需将它们通过 `WritableStream` 写入到文件中即可。

### 5.2 场景二：解析网络协议

许多网络协议的结构都非常精确，例如一个简单的自定义协议，其数据包头部可能包含一个魔数（Magic Number）和一个长度字段。

```javascript
const net = require("node:net")

// 假设协议格式：
// [4 bytes Magic Number: 0xDEADBEEF] [4 bytes Payload Length] [N bytes Payload]
const MAGIC_NUMBER = 0xdeadbeef

function parsePacket(socket) {
  let buffer = Buffer.alloc(0)

  socket.on("data", (data) => {
    // 将新接收到的数据拼接到缓冲区
    buffer = Buffer.concat([buffer, data])

    // 尝试解析一个完整的数据包
    while (buffer.length >= 8) {
      // 至少需要 8 字节头部
      const magic = buffer.readUInt32BE(0)
      const payloadLength = buffer.readUInt32BE(4)
      const totalLength = 8 + payloadLength

      // 检查魔数是否匹配
      if (magic !== MAGIC_NUMBER) {
        console.error("Invalid magic number:", magic.toString(16))
        socket.destroy()
        return
      }

      // 检查是否收到了足够的数据
      if (buffer.length < totalLength) {
        console.log("Packet incomplete, waiting for more data...")
        break // 跳出循环，等待更多数据
      }

      // 提取 Payload
      const payload = buffer.slice(8, totalLength)
      console.log("Received payload:", payload.toString())

      // 处理完一个包后，从缓冲区中移除它
      buffer = buffer.slice(totalLength)
    }
  })
}

const server = net.createServer((socket) => {
  console.log("Client connected")
  parsePacket(socket)

  socket.on("end", () => {
    console.log("Client disconnected")
  })
})

server.listen(8080, () => {
  console.log("Protocol parser server listening on port 8080")
})
```

这个例子展示了如何使用 `Buffer` 的 `readUInt32BE` 方法来精确地按协议格式读取数据，以及如何通过动态地拼接和切片 `Buffer` 来处理**粘包**问题（即多个数据包一次性到达或一个数据包分多次到达）。

### 5.3 场景三：图像处理

虽然 Node.js 不是进行复杂图像处理的首选平台（通常会用 C++ 或 GPU），但对于一些简单的任务，如读取图像的基本信息（如 PNG 文件的宽度和高度），完全可以通过解析其二进制格式来实现。

```javascript
const fs = require("node:fs/promises")

/**
 * 读取 PNG 文件的宽度和高度
 * PNG 文件格式以 8 字节签名开头，然后是 IHDR chunk，其中包含宽高信息。
 * IHDR chunk 结构: [Length: 4 bytes] [Type: "IHDR"] [Width: 4 bytes] [Height: 4 bytes] ...
 */
async function getPngDimensions(filePath) {
  try {
    // 只需要读取文件的前几十个字节即可找到 IHDR chunk
    const handle = await fs.open(filePath, "r")
    const buffer = Buffer.alloc(32) // 通常 IHDR chunk 很靠前
    await handle.read(buffer, 0, buffer.length, 0)
    await handle.close()

    // 检查 PNG 签名
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a
    ])
    if (!buffer.slice(0, 8).equals(pngSignature)) {
      throw new Error("Not a valid PNG file")
    }

    let offset = 8 // 跳过签名
    while (offset < buffer.length - 4) {
      const length = buffer.readUInt32BE(offset)
      const type = buffer.slice(offset + 4, offset + 8).toString()

      if (type === "IHDR") {
        const width = buffer.readUInt32BE(offset + 8)
        const height = buffer.readUInt32BE(offset + 12)
        return { width, height }
      }
      offset += 12 + length // 移动到下一个 chunk
    }
    throw new Error("IHDR chunk not found in the first 32 bytes")
  } catch (error) {
    console.error("Error reading PNG:", error)
    return null
  }
}

// --- 使用示例 ---
;(async () => {
  const dimensions = await getPngDimensions("./example.png")
  if (dimensions) {
    console.log(`PNG image dimensions: ${dimensions.width} x ${dimensions.height}`)
  }
})()
```

这个例子展示了如何结合 `fs.read` 和 `Buffer` 来读取文件的特定部分，并根据文件格式的规范（如 PNG 的 chunk 结构）来提取所需信息。这是处理任何自定义或标准二进制文件格式的通用方法。

---

## 6. 性能最佳实践

在处理大量或高频的二进制数据时，性能优化至关重要。以下是一些经过实践验证的最佳建议，能帮助你避免常见的性能陷阱。

### 6.1 明智地选择 Buffer 创建方式

- **优先使用 `Buffer.from()`**：当你需要从现有数据（字符串、数组、另一个 Buffer）创建时，这是最安全和直观的方式。它会**复制**数据，确保原始数据不会被意外修改。
- **谨慎使用 `Buffer.allocUnsafe()`**：虽然它避免了内存清零的开销，速度更快，但只有在**你立即用新数据完全覆盖它**的情况下才安全。例如，当你从文件系统或网络流中读取数据时，可以使用 `allocUnsafe` 创建一个缓冲区，然后立即用 `fs.read` 或 `socket.read` 填充它。
- **避免在热路径（Hot Path）上频繁创建和销毁小 Buffer**：频繁的内存分配和垃圾回收会带来性能损耗。考虑使用对象池（Object Pooling）模式来复用 `Buffer` 实例。

### 6.2 避免不必要的 Buffer 拷贝

- **理解 `slice()` 的行为**：`buf.slice()` 返回的是**原 Buffer 的视图**，不会复制数据。这是它的强大之处，可以利用它实现高效的数据处理。但请记住，修改切片会影响原 Buffer。
- **利用 `Buffer.poolSize`**：Node.js 内部为 `Buffer.alloc()` 维护了一个内存池。当你申请一个小于 `Buffer.poolSize`（默认 8KB）的 `Buffer` 时，它可能会从池中分配，从而减少垃圾回收压力。你可以通过 `Buffer.poolSize` 查看或修改这个值，但通常不建议修改，除非你有非常充分的理由和测试数据支撑。

### 6.3 使用 `Buffer.poolSize`

```javascript
console.log("Default pool size:", Buffer.poolSize) // 默认是 8 * 1024 (8KB)

// 当你使用 Buffer.alloc() 分配小于 poolSize 的 Buffer 时，
// Node.js 会尝试从预分配的内存池中获取，而不是每次都向 V8 申请。
// 这可以减少内存碎片和垃圾回收的频率。

// 示例：连续分配多个小 Buffer，它们可能来自同一个池
const buf1 = Buffer.alloc(1024)
const buf2 = Buffer.alloc(1024)
// buf1 和 buf2 的底层内存可能相邻，这有助于 CPU 缓存效率
```

**总结**：性能优化的核心是**减少不必要的内存分配和数据拷贝**。在编写代码时，时刻思考你的 `Buffer` 是从哪里来的，数据是否被复制了，以及是否有更高效的方法来达到目的。

---

## 7. API 快速参考

为了方便开发者快速查阅，这里整理了 `Buffer` 和 `Blob` 最常用的 API。

### 7.1 Buffer 常用 API

| 类别     | 方法                                                       | 描述                                                            |
| :------- | :--------------------------------------------------------- | :-------------------------------------------------------------- |
| **创建** | `Buffer.from(data, encoding?)`                             | 从字符串、数组或 Buffer **复制**数据创建新实例。                |
|          | `Buffer.alloc(size, fill?)`                                | 创建并初始化一个指定大小、已清零（或填充）的 Buffer。           |
|          | `Buffer.allocUnsafe(size)`                                 | 创建一个**未初始化**的 Buffer，速度更快但可能包含旧数据。       |
|          | `Buffer.concat(list, totalLength?)`                        | 拼接多个 Buffer 实例。                                          |
| **读取** | `buf.readInt8/16/32BE/LE(offset)`                          | 在指定偏移处读取有符号整数。                                    |
|          | `buf.readUInt8/16/32BE/LE(offset)`                         | 在指定偏移处读取无符号整数。                                    |
|          | `buf.readFloatBE/LE(offset)`                               | 在指定偏移处读取 32 位浮点数。                                  |
|          | `buf.readDoubleBE/LE(offset)`                              | 在指定偏移处读取 64 位浮点数。                                  |
| **写入** | `buf.writeInt8/16/32BE/LE(value, offset)`                  | 在指定偏移处写入有符号整数。                                    |
|          | `buf.writeUInt8/16/32BE/LE(value, offset)`                 | 在指定偏移处写入无符号整数。                                    |
|          | `buf.writeFloatBE/LE(value, offset)`                       | 在指定偏移处写入 32 位浮点数。                                  |
|          | `buf.writeDoubleBE/LE(value, offset)`                      | 在指定偏移处写入 64 位浮点数。                                  |
|          | `buf.write(string, offset?, length?, encoding?)`           | 将字符串写入 Buffer。                                           |
| **转换** | `buf.toString(encoding?, start?, end?)`                    | 将 Buffer 转换为字符串。                                        |
|          | `buf.toJSON()`                                             | 返回 Buffer 的 JSON 表示（`{ type: 'Buffer', data: [...] }`）。 |
| **操作** | `buf.slice(start?, end?)`                                  | 返回一个新的 Buffer，它与原 Buffer**共享内存**（零拷贝）。      |
|          | `buf.copy(target, targetStart?, sourceStart?, sourceEnd?)` | 将数据从当前 Buffer **拷贝**到目标 Buffer。                     |
| **属性** | `buf.length`                                               | Buffer 的字节长度。                                             |
|          | `Buffer.poolSize`                                          | 指定用于 `Buffer.alloc()` 的内存池大小。                        |

### 7.2 Blob 常用 API

| 方法/属性                                | 描述                                                                                                            |
| :--------------------------------------- | :-------------------------------------------------------------------------------------------------------------- |
| `new Blob(array, options?)`              | 构造函数，从一组数据创建一个新的 Blob 对象。`options` 可指定 `type` (MIME type) 和 `endings` (行尾符处理方式)。 |
| `blob.size`                              | 只读属性，返回 Blob 对象中所包含数据的大小（字节）。                                                            |
| `blob.type`                              | 只读属性，返回 Blob 对象的 MIME 类型。                                                                          |
| `blob.text()`                            | 返回一个 Promise，其 resolve 的结果是一个包含 Blob 中所有内容的 UTF-8 格式的字符串。                            |
| `blob.arrayBuffer()`                     | 返回一个 Promise，其 resolve 的结果是一个包含 Blob 中所有内容的 `ArrayBuffer`。                                 |
| `blob.stream()`                          | 返回一个 `ReadableStream`，用于读取 Blob 中的数据。                                                             |
| `blob.slice(start?, end?, contentType?)` | 返回一个新的 Blob 对象，包含了源 Blob 中指定范围内的数据。                                                      |

---

## 8. 常见问题 (Q&A)

**Q1: 我应该何时使用 `Buffer`，何时使用 `Blob`？**

- **使用 `Buffer`**：当你需要在**单一 Node.js 进程内**对二进制数据进行**频繁的读写、修改、解析或构建**时。`Buffer` 提供了最丰富和高效的 API，是 Node.js 内部 I/O 的核心。
- **使用 `Blob`**：当你需要确保数据的**不可变性**，或者在**多线程 (`worker_threads`)**、**跨上下文**（如主线程与 Worker 线程之间）传递二进制数据时。`Blob` 的不可变特性天然避免了数据竞争，是安全的跨线程通信选择。此外，当你需要与浏览器端的 `File` 或 `Blob` API 保持一致时，也应使用 `Blob`。

**Q2: `Buffer.allocUnsafe()` 听起来很危险，我什么时候才真的需要它？**

`Buffer.allocUnsafe()` 确实是一把双刃剑。它的性能优势来自于**跳过了内存初始化（清零）的步骤**。你**几乎不需要**在日常开发中使用它。只有在以下极端场景下，才考虑使用：

1.  你正在进行**性能基准测试**，并且已经确定 `Buffer` 的创建是瓶颈。
2.  你**立即**会用从文件系统、网络或其他来源读取的新数据，**完全覆盖**掉 `allocUnsafe` 分配的整个 `Buffer`。

**否则，请始终优先使用 `Buffer.alloc()` 或 `Buffer.from()`**，它们更安全，不易引入难以调试的 bug 或安全漏洞。

**Q3: 我在处理一个网络流，数据被分成很多小块到达，我该如何高效地拼接它们？**

网络流（如 `socket` 或 `http.IncomingMessage`）的 `'data'` 事件每次收到的 `chunk` 都是一个 `Buffer`，并且它们的大小是不确定的。高效拼接的关键是**避免频繁的 `Buffer.concat` 调用**，因为每次 `concat` 都可能涉及内存分配和数据拷贝。

一个经典的模式是**使用一个“累加器”数组来收集所有的 `chunk`，然后只在收到完整消息后才进行一次性的拼接**。例如，你可以根据自定义协议中的“长度”字段来判断消息是否完整。

```javascript
let chunks = []
let totalLength = 0

socket.on("data", (chunk) => {
  chunks.push(chunk)
  totalLength += chunk.length

  // 假设已经知道一个完整消息的长度是 messageLength
  if (totalLength >= messageLength) {
    const fullMessage = Buffer.concat(chunks, messageLength)
    // 处理 fullMessage...

    // 处理完一个消息后，重置累加器
    const remainingData =
      totalLength > messageLength
        ? fullMessage.slice(messageLength) // 处理粘包
        : Buffer.alloc(0)
    chunks = remainingData.length > 0 ? [remainingData] : []
    totalLength = remainingData.length
  }
})
```

**Q4: 为什么 `buf.slice()` 修改后会影响原 Buffer？我如何得到一个真正的副本？**

这是因为 `buf.slice()` 的设计初衷就是为了**零拷贝**的性能优化。它返回的 `Buffer` 与原 Buffer **共享底层内存**。

如果你需要一个**完全独立、互不影响**的副本，你应该使用 `Buffer.from()` 来创建：

```javascript
const original = Buffer.from("Hello World")
const realCopy = Buffer.from(original) // 这会创建一个新的、拥有独立内存的 Buffer

realCopy.write("Hi")
console.log(original.toString()) // 输出: Hello World (原 Buffer 未受影响)
```

**Q5: 我遇到了一个错误：`RangeError [ERR_OUT_OF_RANGE]: The value of "offset" is out of range.` 这是为什么？**

这个错误意味着你尝试在 `Buffer` 的某个偏移位置（`offset`）读取或写入数据，但这个偏移量超出了 `Buffer` 的有效范围。例如，在一个长度为 5 的 `Buffer` 上调用 `buf.readUInt32BE(4)` 就会失败，因为 `readUInt32BE` 需要 4 个字节，而 `offset` 为 4 意味着它试图访问第 4、5、6、7 个字节，但 `Buffer` 只有 5 个字节（索引 0-4）。

**解决方法**：在进行任何读写操作前，**始终检查偏移量和数据长度**。确保 `offset + dataSize` 不会超出 `buf.length`。

```javascript
const valueSize = 4 // 例如，一个 32 位整数
const offset = 10

if (offset + valueSize <= buffer.length) {
  const value = buffer.readUInt32BE(offset)
  // 处理 value
} else {
  // 数据不完整，等待更多数据或报告错误
}
```

---

## 9. 总结与延伸学习

恭喜你完成了对 Node.js 二进制数据操作的深入学习！从最基础的 `ArrayBuffer` 和 `TypedArray` 出发，理解了 JavaScript 如何原生地处理二进制数据。随后，深入探讨了 Node.js 的核心——`Buffer`，学习了如何创建、读写、操作它，并掌握了它与字符编码的转换技巧。最后，认识了不可变的 `Blob`，它在多线程和跨上下文通信中扮演着安全卫士的角色。

通过实战场景和性能最佳实践的学习，你现在应该具备了在 Node.js 中高效处理文件、网络协议和进行数据转换的能力。

然而，技术的探索永无止境。以下是一些推荐的资源，供你继续深化理解：

- **Node.js 官方文档 - Buffer**：

  - [https://nodejs.org/api/buffer.html](https://nodejs.org/api/buffer.html)
  - 这是学习 `Buffer` 最权威、最全面的资料，包含了所有 API 的详细说明和示例。

- **MDN - JavaScript Typed Arrays**：

  - [https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Typed_arrays)
  - 深入了解 `ArrayBuffer`, `TypedArray`, `DataView` 等浏览器端标准，对理解 Node.js 的实现大有裨益。

- **MDN - Blob**：

  - [https://developer.mozilla.org/en-US/docs/Web/API/Blob](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
  - 了解 `Blob` 在 Web 平台上的标准定义和行为，与 Node.js 的实现进行对比学习。

- **《深入浅出 Node.js》**：

  - 一本系统讲解 Node.js 底层原理的经典书籍，其中对 `Buffer` 和内存管理有深入的剖析。

- **《网络协议与网络安全》相关书籍**：
  - 理解 TCP/IP、HTTP 等协议的底层二进制格式，能让你更深刻地体会到二进制数据操作的重要性。

掌握二进制数据处理，是成为 Node.js 高阶开发者的必经之路。希望这份指南能成为你技术旅程中的一盏明灯，助你在构建高性能、高可靠性应用的道路上走得更远。现在，打开你的编辑器，开始用代码探索这个由 0 和 1 构成的奇妙世界吧！
