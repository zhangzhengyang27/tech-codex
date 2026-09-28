---
title: Buffer 二进制缓冲区
description: Buffer 在 V8 堆外的内存模型、内存池、编码转换与二进制协议解析，含零拷贝视角
keywords: [Node.js, Buffer, 二进制]
category: Node.js
tags: [Node.js, 核心模块]
---







# Buffer 二进制缓冲区

`Buffer` 是 Node.js 在 V8 堆内存之外分配的一段原始二进制数据缓冲区,是 Node.js 处理二进制数据的核心模块。它在文件 I/O、网络传输、加解密、图像与音视频处理、二进制协议解析等场景中发挥关键作用。

```javascript
// Buffer 是全局对象,无需 require
console.log(Buffer.poolSize) // 8192 (8KB 内存池大小)
```

## 为什么需要 Buffer

### 核心痛点

1. **JavaScript 字符串限制**
   - JavaScript 原生字符串基于 UTF-16 编码
   - 无法直接表示原始二进制数据(如图片、视频、加密数据)
   - 字符串操作会引入编码转换开销

2. **I/O 场景需求**
   - 文件系统:读取图片、视频、压缩包等二进制文件
   - 网络传输:TCP/UDP 数据包、HTTP 请求体、WebSocket 消息
   - 加密解密:处理哈希值、签名、密文等二进制数据
   - 压缩解压:处理压缩后的二进制流

3. **性能要求**
   - 避免数据在字符串与二进制间反复转换
   - 支持流式处理和零拷贝技术
   - 减少 V8 垃圾回收压力

### Buffer vs 字符串

```javascript
// ❌ 错误:字符串处理二进制数据
const binaryData = "\x00\x01\x02\x03" // 可能丢失或转换某些字节
console.log(binaryData.length) // 可能不是预期的 4

// ✅ 正确:使用 Buffer
const buf = Buffer.from([0x00, 0x01, 0x02, 0x03])
console.log(buf.length) // 4,精确的字节长度
```

## 编码基础知识

### 计算机数据的本质

计算机世界的一切数据——文字、图片、视频、程序——最终都由 0 和 1 组成。互联网上的信息交换,本质上是二进制数据的传输与解析。将二进制数据正确映射为字符,需要遵循统一的规则,即**编码**。发送方使用某种编码将字符串转为二进制,接收方使用同一种编码解码,才能避免乱码。

### 字节与字符

| 概念 | 说明 |
|------|------|
| **Bit(比特)** | 最小数据单位,值为 0 或 1 |
| **Byte(字节)** | 8 个比特组成,即 8 位二进制(如 `10011001`),取值范围 0-255 |
| **字符** | 文字的基本单位,1 个英文字母占 1 字节,1 个汉字占 2-3 字节(视编码而定) |

```
1 GB = 1024 MB = 1,048,576 KB = 1,073,741,824 B (字节)
1 字节 = 8 bit (比特)
```

### Node.js 支持的编码格式对照

| 编码 | 别名 | 说明 | 示例 |
|------|------|------|------|
| **latin1** | `binary` | 单字节二进制编码,每个字节直接映射到 0-255 | 适合原始二进制兼容处理 |
| **hex** | - | 十六进制表示,2 个字符表示 1 个字节 | `0100 0001`(二进制) → `41`(hex) → 字母 `A` |
| **ascii** | - | 7 位编码(首 bit 为 0),定义 128 个字符,其中 95 个可显示 | `A` → 十进制 65 → 十六进制 41 |
| **unicode** | - | 万国码/国际码,为全世界字符提供唯一编码点 | 覆盖超过 13 万字符(截至 Unicode 11) |
| **utf8** | `utf-8` | Unicode 的变长实现,1-4 字节,首字节与 ASCII 兼容,Node Buffer 默认编码 | 范围 U+0000 ~ U+10FFFF |
| **utf16le** | `ucs-2` | 2 或 4 字节编码,有大小端序(FF FE 为小端,FE FF 为大端) | Windows API、JavaScript 内部使用 |
| **base64** | - | 基于 64 个可打印字符表示二进制数据,4 字符编码 3 字节 | `Hello` → `SGVsbG8=` |

### 进制转换示例

以英文字母 `A` 为例,展示不同进制的表示关系:

```
字符: A
二进制(binary): 0100 0001
十进制(decimal): 65
十六进制(hex):   41
```

以中文字符 `掘` 为例(UTF-8 编码):

```
字符: 掘
UTF-8 二进制: 11100110 10001110 10011000
十六进制:     E6 8E 98
```

### 编码选择要点

- **utf8** 是 Node Buffer 的默认编码,也是互联网应用优先采用的编码
- **base64** 常用于将二进制数据嵌入文本协议(如邮件、Data URL)
- **hex** 常用于调试和哈希值展示
- **latin1/binary** 用于需要逐字节处理的原始二进制场景
- Node.js 原生不支持 GBK/GB2312 等编码,需借助 `iconv-lite` 等第三方库

## 架构概览

### Buffer 在 Node.js 中的位置

```
┌─────────────────────────────────────────┐
│            Node.js 应用层                │
├─────────────────────────────────────────┤
│   fs  │  net  │  http  │  crypto  │ ... │
├─────────────────────────────────────────┤
│              Buffer 模块                 │ ← 二进制数据处理层
├─────────────────────────────────────────┤
│         V8 引擎 + libuv                 │
├─────────────────────────────────────────┤
│            操作系统层                    │
└─────────────────────────────────────────┘
```

### Buffer 内存模型

```
┌──────────────────────────────────────┐
│         V8 堆内存 (Heap)              │ ← JavaScript 对象
├──────────────────────────────────────┤
│    Buffer 内存池 (Slab Allocation)    │ ← Node.js 管理
│  ┌──────────┐  ┌──────────┐          │
│  │  Pool 1  │  │  Pool 2  │  ...     │
│  │  (8KB)   │  │  (8KB)   │          │
│  └──────────┘  └──────────┘          │
├──────────────────────────────────────┤
│     ArrayBuffer (底层存储)            │ ← 原始二进制内存
│  ┌──────────────────────────────┐    │
│  │  TypedArray 视图 (Uint8Array)│    │
│  └──────────────────────────────┘    │
└──────────────────────────────────────┘
```

### 关键概念

- **ArrayBuffer**: 底层的二进制数据缓冲区,固定长度,无法直接操作
- **TypedArray**: 类型化数组视图,提供对 ArrayBuffer 的结构化访问
- **DataView**: 提供更灵活的二进制数据读写接口,支持字节序控制
- **Buffer**: 继承自 Uint8Array,增加了 Node.js 特有的 API

## 创建方式与内存特点

### 创建方法对比

| 方法 | 内存初始化 | 性能 | 内存池 | 安全性 | 适用场景 |
|------|-----------|------|--------|--------|---------|
| `Buffer.alloc(size)` | 清零 | 中等 | 使用 | ⭐⭐⭐ | 安全优先,通用场景 |
| `Buffer.allocUnsafe(size)` | 不清零 | 快 | 使用 | ⭐ | 性能优先,立即填充 |
| `Buffer.allocUnsafeSlow(size)` | 不清零 | 慢 | 不使用 | ⭐ | 大块临时内存 |
| `Buffer.from(array)` | 拷贝 | 中等 | 使用 | ⭐⭐⭐ | 从数组创建 |
| `Buffer.from(string)` | 拷贝 | 中等 | 使用 | ⭐⭐⭐ | 文本转换 |
| `Buffer.from(buffer)` | 深拷贝 | 中等 | 使用 | ⭐⭐⭐ | 克隆 Buffer |

### 详细示例

#### 1. 安全分配 (推荐)

```javascript
// 分配并清零,安全可靠
const safe = Buffer.alloc(10)
console.log(safe) // <Buffer 00 00 00 00 00 00 00 00 00 00>

// 指定填充值
const filled = Buffer.alloc(10, 'a')
console.log(filled) // <Buffer 61 61 61 61 61 61 61 61 61 61>

// 使用字符串填充
const pattern = Buffer.alloc(10, 'AB')
console.log(pattern) // <Buffer 41 42 41 42 41 42 41 42 41 42>
```

#### 2. 高性能分配 (需谨慎)

```javascript
// 不清零,包含旧数据
const unsafe = Buffer.allocUnsafe(10)
console.log(unsafe) // <Buffer ?? ?? ?? ?? ?? ?? ?? ?? ?? ??> (随机数据)

// 必须立即填充
unsafe.fill(0)
// 或
unsafe.write('Hello')

// ⚠️ 安全风险示例
const secret = Buffer.from('密码123456')
const leaked = Buffer.allocUnsafe(6)
// leaked 可能包含 secret 的部分数据!
```

#### 3. 从不同数据源创建

```javascript
// 从数组创建
const fromArray = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f])
console.log(fromArray.toString()) // "Hello"

// 从字符串创建
const fromString = Buffer.from('你好世界', 'utf8')
console.log(fromString.length) // 12 (每个中文 3 字节)

// 从 Buffer 克隆 (深拷贝)
const original = Buffer.from('original')
const clone = Buffer.from(original)
original[0] = 0x4f // 修改原 Buffer
console.log(clone.toString()) // "original" (克隆不受影响)

// 从 ArrayBuffer 创建 (共享内存)
const ab = new ArrayBuffer(10)
const view = new Uint8Array(ab)
view[0] = 65
const fromAB = Buffer.from(ab) // 共享底层内存
console.log(fromAB[0]) // 65
```

#### 4. 大块内存分配

```javascript
// 分配大块内存但不使用内存池
const bigData = Buffer.allocUnsafeSlow(1024 * 1024) // 1MB
// 适用场景:一次性使用的大块临时缓冲区

// 性能对比
console.time('alloc')
for (let i = 0; i < 100000; i++) {
  Buffer.alloc(100)
}
console.timeEnd('alloc') // ~50ms

console.time('allocUnsafe')
for (let i = 0; i < 100000; i++) {
  Buffer.allocUnsafe(100).fill(0)
}
console.timeEnd('allocUnsafe') // ~80ms (包含填充时间)
```

> 注：以上耗时为示意数据，具体数值因机器与 Node 版本而异。

## 内存管理机制

### 内存池策略

Node.js 使用 **slab allocation** 策略管理 Buffer 内存:

```javascript
// 内存池工作原理
const poolSize = Buffer.poolSize // 8192 bytes (8KB)

// 示例:小块 Buffer 复用内存池
const a = Buffer.allocUnsafe(100)
const b = Buffer.allocUnsafe(200)
const c = Buffer.allocUnsafe(300)

console.log(a.buffer === b.buffer) // true,共享同一 ArrayBuffer
console.log(b.buffer === c.buffer) // true

// 内存池状态
// [Pool 1: 8KB]
// ├── a: 100 bytes (offset: 0-99)
// ├── b: 200 bytes (offset: 100-299)
// └── c: 300 bytes (offset: 300-599)
// 剩余: 7592 bytes
```

### 8KB 内存池源码级分析

Buffer 的内存管理核心在于 `poolSize = 8192`(8KB)的内存池机制。Node.js 在 C++ 层申请 Buffer 内存，绕过 V8 的堆内存限制（V8 堆远小于系统可用内存），单个 Buffer 实例的长度上限可经 `require('buffer').constants.MAX_LENGTH` 查看（Node.js 15+ 为 4GB，新版本已进一步提升）。

#### 底层数据结构

```javascript
// FastBuffer 实际上就是继承了 Uint8Array 的类
class FastBuffer extends Uint8Array {}

// Node.js 内部维护的全局变量
let poolSize = 8192       // 内存池大小,即 Buffer.poolSize
let poolOffset = 0        // 当前池的偏移量
let allocPool             // 当前使用的内存池(ArrayBuffer)
```

#### Buffer.from 源码分发逻辑

`Buffer.from` 根据入参类型分发到不同的创建策略:

```javascript
Buffer.from = function from(value, encodingOrOffset, length) {
  // 1. 基于 string 创建 → fromString()
  if (typeof value === 'string') return fromString(value, encodingOrOffset)

  // 2. 基于 ArrayBuffer 创建 → fromArrayBuffer()
  if (isAnyArrayBuffer(value)) return fromArrayBuffer(value, encodingOrOffset, length)

  // 3. valueOf 不等于自身的对象,递归调用 from
  const valueOf = value.valueOf && value.valueOf()
  if (valueOf !== null && valueOf !== undefined && valueOf !== value)
    return Buffer.from(valueOf, encodingOrOffset, length)

  // 4. 基于 Object 创建 → fromObject()
  var b = fromObject(value)
  if (b) return b

  // 5. 支持 Symbol.toPrimitive 的对象
  if (typeof value[Symbol.toPrimitive] === 'function')
    return Buffer.from(value[Symbol.toPrimitive]('string'), encodingOrOffset, length)
}
```

#### fromString 的 8KB 池分配策略

`fromString` 是最常用的创建路径,其内存分配策略如下:

```javascript
function fromString(string, encoding = 'utf8') {
  // 1. 空字符串:直接通过 FastBuffer 创建
  if (string.length === 0) return new FastBuffer()

  // 2. 计算字符串的字节长度(默认 utf8)
  var length = byteLengthUtf8(string)
  if (encoding !== 'utf8')
    length = byteLength(string, encoding, true)

  // 3. 字节数 >= 4KB(poolSize >>> 1):绕过内存池,直接调用 C++ 层 createFromString
  if (length >= (Buffer.poolSize >>> 1))
    return binding.createFromString(string, encoding)

  // 4. 字节数 < 4KB 但剩余空间不足:重新申请 8KB 内存池
  if (length > (poolSize - poolOffset)) createPool()

  // 5. 在当前池中分配 FastBuffer,写入数据
  var b = new FastBuffer(allocPool, poolOffset, length)
  const actual = b.write(string, encoding)
  if (actual !== length) {
    b = new FastBuffer(allocPool, poolOffset, actual)
  }

  // 6. 修正偏移量,调用 alignPool 校准
  poolOffset += actual
  alignPool()
  return b
}
```

#### fromObject 的分配逻辑

```javascript
function fromObject(obj) {
  // 如果是 Uint8Array,按数组长度分配内存
  if (isUint8Array(obj)) {
    const b = allocate(obj.length)
    if (b.length === 0) return b
    _copy(obj, b, 0, 0, obj.length)
    return b
  }

  // 如果是类数组或 Buffer,通过 fromArrayLike 包装
  if (obj.length !== undefined || isAnyArrayBuffer(obj.buffer)) {
    if (typeof obj.length !== 'number') return new FastBuffer()
    return fromArrayLike(obj)
  }

  // 兼容旧版 Buffer 的 JSON 格式
  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}
```

#### 8KB 池分配策略总结

| 创建方式 | 数据大小 < 4KB | 数据大小 >= 4KB |
|----------|---------------|----------------|
| `Buffer.from(string)` | 使用 8KB 池(剩余不足则重新申请) | `binding.createFromString()`(C++ 层直接分配) |
| `Buffer.from(ArrayBuffer)` | `FastBuffer`(继承 Uint8Array) | 同左 |
| `Buffer.from(Object)` | 使用 8KB 池(剩余不足则重新申请) | `createUnsafeBuffer()` |
| `Buffer.alloc()` | 使用 8KB 池,用 0 或指定值填充 | 同左 |
| `Buffer.allocUnsafe()` | 使用 8KB 池 | `createUnsafeBuffer()` |
| `Buffer.allocUnsafeSlow()` | `createUnsafeBuffer()`(不使用池) | `createUnsafeBuffer()` |

核心逻辑:Node.js 预先申请 8KB 内存池,每次创建小 Buffer 时尽量复用池中空闲内存以减少系统调用开销。当所需空间 >= 4KB 时绕过内存池直接分配,避免池空间浪费。

### 内存池阈值

```javascript
// 小于 4KB(poolSize >>> 1) 的分配会使用内存池
const small = Buffer.allocUnsafe(4095) // 使用内存池

// >= 4KB 的分配绕过内存池、独立申请
const large = Buffer.allocUnsafe(4096) // 独立分配

console.log(small.buffer !== large.buffer) // true

// 查看内存池使用情况
function showPoolInfo(buf) {
  console.log({
    byteLength: buf.byteLength,
    byteOffset: buf.byteOffset,
    poolSize: Buffer.poolSize,
    isPooled: buf.buffer.byteLength === Buffer.poolSize
  })
}
```

### 内存释放

```javascript
// Buffer 的内存由 V8 管理,但建议及时释放引用
function processLargeFile() {
  let buffer = fs.readFileSync('large-file.bin')
  // 处理数据...
  const result = process(buffer)
  
  // 释放大 Buffer 的引用
  buffer = null
  
  return result
}

// 监控内存使用
const used = process.memoryUsage()
console.log({
  rss: `${(used.rss / 1024 / 1024).toFixed(2)} MB`, // 常驻内存
  heapTotal: `${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`,
  heapUsed: `${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`,
  external: `${(used.external / 1024 / 1024).toFixed(2)} MB` // Buffer 在这里
})
```

### 与 TypedArray 的关系

```javascript
// Buffer 继承自 Uint8Array
const buf = Buffer.from([1, 2, 3, 4])
console.log(buf instanceof Uint8Array) // true

// 访问底层 ArrayBuffer
const ab = buf.buffer
console.log(ab instanceof ArrayBuffer) // true

// 创建不同类型的视图
const view = new DataView(ab, buf.byteOffset, buf.byteLength)
console.log(view.getUint32(0, true)) // 67305985 (小端)

// 共享内存示例
const buffer = Buffer.from([1, 2, 3, 4])
const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
uint8[0] = 99
console.log(buffer[0]) // 99,修改共享内存会影响原 Buffer
```

## 常用实例方法

### 写入方法

#### 1. 字符串写入

```javascript
const buf = Buffer.alloc(20)

// 基础写入
const written = buf.write('Hello', 0, 'utf8')
console.log(written) // 5,返回写入的字节数

// 写入到指定位置
buf.write(' World', 5, 'utf8')
console.log(buf.toString('utf8', 0, 11)) // "Hello World"

// 不同编码写入
buf.write('中文', 11, 'utf8')
console.log(buf.toString('utf8', 0, 17)) // "Hello World中文"
```

#### 2. 数值写入

```javascript
const buf = Buffer.alloc(16)

// 8 位整数
buf.writeInt8(-128, 0)  // -128 ~ 127
buf.writeUInt8(255, 1)  // 0 ~ 255

// 16 位整数 (大端/小端)
buf.writeInt16BE(-32768, 2)  // 大端:高位在前
buf.writeInt16LE(-32768, 4)  // 小端:低位在前

// 32 位整数
buf.writeInt32BE(0x12345678, 6)
console.log(buf.toString('hex', 6, 10)) // "12345678"

// 64 位大整数 (Node.js v12+)
buf.writeBigInt64BE(BigInt('9223372036854775807'), 8)

// 浮点数
buf.writeFloatLE(3.14, 0)  // 32 位浮点
buf.writeDoubleLE(Math.PI, 4)  // 64 位双精度
```

#### 3. 批量填充

```javascript
const buf = Buffer.alloc(10)

// 用数值填充
buf.fill(0xff)
console.log(buf) // <Buffer ff ff ff ff ff ff ff ff ff ff>

// 用字符串填充
buf.fill('AB')
console.log(buf.toString()) // "ABABABABAB"

// 限定范围填充
buf.fill('XYZ', 2, 8)
console.log(buf.toString()) // "ABXYZXYZAB"

// 循环填充示例
const pattern = Buffer.alloc(20, 'AB')
console.log(pattern.toString()) // "ABABABABABABABABABAB"
```

### 读取方法

#### 1. 字符串读取

```javascript
const buf = Buffer.from('你好世界', 'utf8')

// 转换为字符串
console.log(buf.toString('utf8')) // "你好世界"

// 指定范围
console.log(buf.toString('utf8', 0, 6)) // "你好"

// 不同编码
const base64 = buf.toString('base64')
console.log(base64) // "5L2g5aW95LiW55WM"
console.log(Buffer.from(base64, 'base64').toString('utf8')) // "你好世界"
```

#### 2. 数值读取

```javascript
const buf = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0])

// 8 位
console.log(buf.readUInt8(0)) // 18 (0x12)
console.log(buf.readInt8(0))  // 18

// 16 位 (注意字节序)
console.log(buf.readUInt16BE(0)) // 0x1234 (4660)
console.log(buf.readUInt16LE(0)) // 0x3412 (13330)

// 32 位
console.log(buf.readUInt32BE(0)) // 0x12345678
console.log(buf.readUInt32LE(0)) // 0x78563412

// 64 位大整数
const big = Buffer.alloc(8)
big.writeBigInt64BE(BigInt('123456789012345'), 0)
console.log(big.readBigInt64BE(0)) // 123456789012345n

// 浮点数
const floatBuf = Buffer.alloc(8)
floatBuf.writeFloatLE(3.14, 0)
floatBuf.writeDoubleLE(Math.PI, 0)
console.log(floatBuf.readFloatLE(0))  // ~3.14
console.log(floatBuf.readDoubleLE(0)) // 3.141592653589793
```

### 切片与截取

::: warning
Node.js 官方文档已将 `buf.slice()` 标注为废弃别名（Deprecation DEP0094），推荐统一使用 `buf.subarray()`——两者行为完全一致，均共享底层内存。
:::

```javascript
const buf = Buffer.from('Hello World')

// slice:返回新 Buffer,共享内存
const slice1 = buf.slice(0, 5)
slice1[0] = 0x68 // 修改会影响原 Buffer
console.log(buf.toString()) // "hello World"

// subarray:返回共享内存的视图 (v3.4.0+,Node 官方推荐用它替代 slice)
const sub = buf.subarray(6, 11)
console.log(sub.toString()) // "World"

// 注意中文字节边界
const chinese = Buffer.from('你好世界')
console.log(chinese.length) // 12 bytes

// 正确切片中文
const char1 = chinese.slice(0, 3)
console.log(char1.toString()) // "你"

// 错误切片会导致乱码
const bad = chinese.slice(1, 4)
console.log(bad.toString()) // "�好"
```

### Buffer.slice 与 Array.slice 的关键差异

Buffer 的 `slice` 方法与 JavaScript 数组的 `slice` 方法有本质区别:

| 特性 | Buffer.slice() | Array.slice() |
|------|---------------|---------------|
| **内存关系** | 共享底层内存(指针指向同一区域) | 创建新数组,拷贝元素 |
| **修改影响** | 修改切片会影响原 Buffer | 修改切片不影响原数组 |
| **性能** | 零拷贝,极快 | 需要拷贝,有开销 |

#### 行为对比示例

```javascript
// ========== Array.slice ==========
const arr = [1, 2, 3, 4, 5]
const arrSlice = arr.slice(0, 3)
arrSlice[0] = 99
console.log(arr)       // [1, 2, 3, 4, 5] - 原数组不变
console.log(arrSlice)  // [99, 2, 3]      - 切片独立

// ========== Buffer.slice ==========
const buf = Buffer.from([1, 2, 3, 4, 5])
const bufSlice = buf.slice(0, 3)
bufSlice[0] = 99
console.log(buf)       // <Buffer 63 02 03 04 05> - 原Buffer被修改!
console.log(bufSlice)  // <Buffer 63 02 03>      - 切片共享内存
```

#### 原理解释

Buffer 本质上是 C++ 层分配的原始二进制内存的视图。`slice` 返回的新 Buffer 对象只是创建了一个新的"指针"或"视图",指向同一段底层存储空间。无论通过哪个变量访问或修改,操作的都是同一块内存区域。

```javascript
// 验证共享内存
const original = Buffer.from('Hello')
const sliced = original.slice(0, 3)

// 检查底层 ArrayBuffer
console.log(original.buffer === sliced.buffer)  // true - 共享同一 ArrayBuffer
console.log(original.byteOffset)  // 0
console.log(sliced.byteOffset)    // 0 (相对于同一 ArrayBuffer)

// 修改任意一个都会影响另一个
sliced.write('abc')
console.log(original.toString())  // "abclo" - 原Buffer被修改
```

#### 需要独立副本时

如果需要独立的 Buffer 副本而非共享视图,应使用 `Buffer.from`:

```javascript
const original = Buffer.from('Hello')
const independent = Buffer.from(original.slice(0, 3))

independent.write('abc')
console.log(original.toString())    // "Hello" - 原Buffer不受影响
console.log(independent.toString()) // "abc"
```

### 搜索与比较

```javascript
// indexOf:查找子串位置
const buf = Buffer.from('Hello World, Welcome to Node.js')
console.log(buf.indexOf('World')) // 6
console.log(buf.indexOf('o', 8)) // 17,从位置 8 开始查找（8 是 'r'，下一个 'o' 在 "Welcome" 中）
console.log(buf.indexOf(Buffer.from('Node'))) // 24

// includes:判断是否包含
console.log(buf.includes('Welcome')) // true
console.log(buf.includes('Python')) // false

// lastIndexOf:从后向前查找
console.log(buf.lastIndexOf('o')) // 25

// compare:比较两个 Buffer
const a = Buffer.from('abc')
const b = Buffer.from('abd')
const c = Buffer.from('abc')

console.log(a.compare(b)) // -1 (a < b)
console.log(a.compare(c)) // 0 (a == c)
console.log(b.compare(a)) // 1 (b > a)

// equals:判断是否相等
console.log(a.equals(c)) // true
console.log(a.equals(b)) // false
```

### 复制与合并

```javascript
// copy:复制数据
const source = Buffer.from('源数据')
const target = Buffer.alloc(20)

const copied = source.copy(target, 0)
console.log(target.toString('utf8', 0, copied)) // "源数据"

// 部分复制
const src = Buffer.from('Hello World')
const dst = Buffer.alloc(5)
src.copy(dst, 0, 6, 11) // 复制 "World"
console.log(dst.toString()) // "World"

// concat:合并多个 Buffer
const buf1 = Buffer.from('Hello ')
const buf2 = Buffer.from('World')
const buf3 = Buffer.from('!')

const merged = Buffer.concat([buf1, buf2, buf3])
console.log(merged.toString()) // "Hello World!"

// 指定总长度 (不足补零,超出截断)
const padded = Buffer.concat([buf1, buf2], 20)
console.log(padded.toString()) // "Hello World\x00\x00\x00\x00\x00\x00\x00\x00\x00"
```

### 字节序转换

```javascript
const buf = Buffer.from([0x12, 0x34, 0x56, 0x78])

// swap16:交换每 2 个字节
const swap16 = Buffer.from(buf)
swap16.swap16()
console.log(swap16) // <Buffer 34 12 78 56>

// swap32:交换每 4 个字节
const swap32 = Buffer.from([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0])
swap32.swap32()
console.log(swap32) // <Buffer 78 56 34 12 f0 de bc 9a>

// swap64:交换每 8 个字节
const swap64 = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08])
swap64.swap64()
console.log(swap64) // <Buffer 08 07 06 05 04 03 02 01>
```

### 遍历与迭代

```javascript
const buf = Buffer.from([1, 2, 3, 4, 5])

// for...of 遍历值
for (const byte of buf) {
  console.log(byte) // 1, 2, 3, 4, 5
}

// entries():遍历索引和值
for (const [index, value] of buf.entries()) {
  console.log(`buf[${index}] = ${value}`)
}

// keys():遍历索引
for (const index of buf.keys()) {
  console.log(index)
}

// values():遍历值
for (const value of buf.values()) {
  console.log(value)
}

// at():支持负索引 (Node.js v16+)
console.log(buf.at(0))  // 1
console.log(buf.at(-1)) // 5

// 转换为数组
const arr = Array.from(buf)
console.log(arr) // [1, 2, 3, 4, 5]
```

## 静态方法详解

### Buffer.isBuffer

```javascript
// 判断对象是否为 Buffer
const buf = Buffer.from('test')
const arr = [1, 2, 3]

console.log(Buffer.isBuffer(buf)) // true
console.log(Buffer.isBuffer(arr)) // false
console.log(Buffer.isBuffer(new Uint8Array(10))) // false

// 实用示例
function processData(data) {
  if (Buffer.isBuffer(data)) {
    return data.toString('utf8')
  } else if (typeof data === 'string') {
    return data
  } else {
    throw new TypeError('Expected Buffer or string')
  }
}
```

### Buffer.byteLength

```javascript
// 计算字符串的字节长度
console.log(Buffer.byteLength('Hello')) // 5
console.log(Buffer.byteLength('你好')) // 6 (UTF-8 编码,每个中文 3 字节)
console.log(Buffer.byteLength('Hello', 'ascii')) // 5

// 不同编码的字节长度
console.log(Buffer.byteLength('A', 'utf8'))   // 1
console.log(Buffer.byteLength('A', 'utf16le')) // 2
console.log(Buffer.byteLength('A', 'base64')) // 0

// 实用示例:限制文本长度
function truncateByBytes(text, maxBytes) {
  const buf = Buffer.from(text, 'utf8')
  if (buf.length <= maxBytes) {
    return text
  }
  
  // 找到合适的截断位置
  let end = maxBytes
  while (end > 0 && (buf[end] & 0xc0) === 0x80) {
    end--
  }
  
  return buf.slice(0, end).toString('utf8')
}

console.log(truncateByBytes('你好世界', 5)) // "你"
```

### Buffer.concat

```javascript
// 合并多个 Buffer
const buffers = [
  Buffer.from('Hello '),
  Buffer.from('World'),
  Buffer.from('!')
]

const result = Buffer.concat(buffers)
console.log(result.toString()) // "Hello World!"

// 指定总长度
const padded = Buffer.concat(buffers, 20)
console.log(padded.length) // 20
console.log(padded.toString()) // "Hello World!\x00\x00\x00\x00\x00\x00\x00\x00"

// 实用示例:合并流数据
function readStreamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}
```

### Buffer.compare

```javascript
// 比较两个 Buffer
const a = Buffer.from('abc')
const b = Buffer.from('abd')
const c = Buffer.from('abb')

console.log(Buffer.compare(a, b)) // -1 (a < b)
console.log(Buffer.compare(a, c)) // 1 (a > c)
console.log(Buffer.compare(a, a)) // 0 (a == a)

// 排序 Buffer 数组
const buffers = [
  Buffer.from('charlie'),
  Buffer.from('alpha'),
  Buffer.from('bravo')
]

buffers.sort(Buffer.compare)
console.log(buffers.map(b => b.toString())) // ['alpha', 'bravo', 'charlie']
```

### 其他静态方法

```javascript
// Buffer.isEncoding():检查是否支持该编码
console.log(Buffer.isEncoding('utf8'))   // true
console.log(Buffer.isEncoding('utf-8'))  // true
console.log(Buffer.isEncoding('gbk'))    // false
console.log(Buffer.isEncoding('binary')) // true (latin1 的别名)

// Buffer.of():创建包含指定字节的 Buffer (Node.js v22.9.0+,与 Uint8Array.of 行为一致)
const buf = Buffer.of(1, 2, 3, 4)
console.log(buf) // <Buffer 01 02 03 04>

// Buffer.from():从对象创建(对象需实现 valueOf() 或 Symbol.toPrimitive)
class Bytes {
  [Symbol.toPrimitive](hint) {
    return 'custom'
  }
}
console.log(Buffer.from(new Bytes()).toString()) // "custom"
```

## 编解码详解

### 支持的字符编码

| 编码 | 别名 | 说明 | 字节范围 | 使用场景 |
|------|------|------|---------|---------|
| `utf8` | `utf-8` | 变长编码,兼容 ASCII | 1-4 字节 | 默认编码,多语言文本 |
| `utf16le` | `ucs-2` | UTF-16 小端序 | 2 或 4 字节 | Windows API,JavaScript 内部 |
| `latin1` | `binary` | 单字节编码 | 1 字节 | 二进制兼容,兼容性处理 |
| `ascii` | - | 7 位 ASCII | 1 字节 | 纯英文协议 |
| `base64` | - | Base64 编码 | 4 字符/3 字节 | 数据内嵌文本,邮件附件 |
| `base64url` | - | URL 安全的 Base64 | 4 字符/3 字节 | URL 参数,文件名 |
| `hex` | - | 十六进制字符串 | 2 字符/字节 | 调试,哈希展示 |

### UTF-8 编码详解

```javascript
// UTF-8 变长编码规则
// ASCII 字符:  0xxxxxxx                     (1 字节)
// 中文等:      1110xxxx 10xxxxxx 10xxxxxx  (3 字节)
// Emoji:      11110xxx 10xxxxxx 10xxxxxx 10xxxxxx (4 字节)

const text = 'A中😀'
const buf = Buffer.from(text, 'utf8')

console.log(buf.length) // 8 (1 + 3 + 4)
console.log(text.length) // 3 (字符数)

// 查看编码细节
for (let i = 0; i < buf.length; i++) {
  console.log(`字节 ${i}: 0x${buf[i].toString(16).padStart(2, '0')}`)
}
// 字节 0: 0x41  (A)
// 字节 1: 0xe4  (中 - 第 1 字节)
// 字节 2: 0xb8
// 字节 3: 0xad
// 字节 4: 0xf0  (😀 - 第 1 字节)
// 字节 5: 0x9f
// 字节 6: 0x98
// 字节 7: 0x80

// 处理代理对
const emoji = '👍'
console.log(emoji.length) // 2 (代理对)
const emojiBuf = Buffer.from(emoji)
console.log(emojiBuf.length) // 4 (UTF-8 字节)
```

### Base64 编码

```javascript
// Base64 编码原理:每 3 字节转换为 4 个 ASCII 字符
const text = 'Hello World'
const buf = Buffer.from(text, 'utf8')

// 编码
const base64 = buf.toString('base64')
console.log(base64) // "SGVsbG8gV29ybGQ="

// 解码
const decoded = Buffer.from(base64, 'base64')
console.log(decoded.toString('utf8')) // "Hello World"

// Base64URL (URL 安全版本)
const url = 'https://example.com?data=abc123'
const bufUrl = Buffer.from(url, 'utf8')
const base64Url = bufUrl.toString('base64url')
console.log(base64Url) // 无 + 和 / 字符,适合 URL

// 实用示例:图片 Base64 编码
const fs = require('fs')
const imageBuf = fs.readFileSync('logo.png')
const dataUrl = `data:image/png;base64,${imageBuf.toString('base64')}`
console.log(dataUrl.substring(0, 50)) // "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA..."
```

### Hex 编码

```javascript
// 十六进制表示
const buf = Buffer.from([0x48, 0x65, 0x6c, 0x6c, 0x6f])
const hex = buf.toString('hex')
console.log(hex) // "48656c6c6f"

// 从十六进制创建
const fromHex = Buffer.from(hex, 'hex')
console.log(fromHex.toString('utf8')) // "Hello"

// 实用示例:哈希值展示
const crypto = require('crypto')
const hash = crypto.createHash('sha256').update('password').digest('hex')
console.log(hash) // "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8"
```

### 编码转换工具

```javascript
const fs = require('fs')

// 编码检测与转换
function detectEncoding(buf) {
  // 简单的 UTF-8 BOM 检测
  if (buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return 'utf8-bom'
  }
  
  // UTF-16 LE BOM
  if (buf[0] === 0xff && buf[1] === 0xfe) {
    return 'utf16le'
  }
  
  // UTF-16 BE BOM
  if (buf[0] === 0xfe && buf[1] === 0xff) {
    return 'utf16be'
  }
  
  return 'utf8' // 默认
}

// 编码转换示例
function convertEncoding(buf, fromEncoding, toEncoding) {
  const text = buf.toString(fromEncoding)
  return Buffer.from(text, toEncoding)
}

// GBK 转 UTF-8 (需要 iconv-lite 库)
// npm install iconv-lite
const iconv = require('iconv-lite')
const gbkBuf = fs.readFileSync('gbk-file.txt')
const utf8Text = iconv.decode(gbkBuf, 'gbk')
const utf8Buf = iconv.encode(utf8Text, 'utf8')
```

## Buffer 与其他模块集成

### 与 Stream 模块集成

```javascript
const fs = require('fs')
const zlib = require('zlib')
const crypto = require('crypto')

// 流式处理:压缩 + 加密
function compressAndEncrypt(inputPath, outputPath, password) {
  return new Promise((resolve, reject) => {
    const key = crypto.scryptSync(password, 'salt', 24)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-192-cbc', key, iv)
    
    const writeStream = fs.createWriteStream(outputPath)
    
    // 写入 IV
    writeStream.write(iv)
    
    fs.createReadStream(inputPath)
      .pipe(zlib.createGzip())
      .pipe(cipher)
      .pipe(writeStream)
      .on('finish', resolve)
      .on('error', reject)
  })
}

// 读取流到 Buffer
function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
  })
}

// 使用示例
async function processLargeFile() {
  const stream = fs.createReadStream('large-file.bin', { highWaterMark: 64 * 1024 })
  const buffer = await streamToBuffer(stream)
  console.log(`读取了 ${buffer.length} 字节`)
}
```

### 与 Net 模块集成

```javascript
const net = require('net')

// TCP 客户端
const client = new net.Socket()

client.connect(8080, 'localhost', () => {
  console.log('已连接到服务器')
  
  // 发送 Buffer 数据
  const message = Buffer.from('Hello Server')
  client.write(message)
  
  // 发送二进制协议
  const packet = Buffer.alloc(12)
  packet.writeUInt32BE(1, 0)        // 版本号
  packet.writeUInt32BE(0x01, 4)     // 命令类型
  packet.writeUInt32BE(4, 8)        // 数据长度
  client.write(packet)
})

// 接收 Buffer 数据
let buffer = Buffer.alloc(0)

client.on('data', (data) => {
  // 拼接接收到的数据
  buffer = Buffer.concat([buffer, data])
  
  // 解析完整消息
  while (buffer.length >= 4) {
    const length = buffer.readUInt32BE(0)
    if (buffer.length >= 4 + length) {
      const message = buffer.slice(4, 4 + length)
      console.log('收到消息:', message.toString())
      buffer = buffer.slice(4 + length)
    } else {
      break
    }
  }
})

// TCP 服务器
const server = net.createServer((socket) => {
  console.log('客户端连接:', socket.remoteAddress)
  
  socket.on('data', (data) => {
    console.log('收到数据:', data.toString())
    socket.write(Buffer.from('ACK'))
  })
})

server.listen(8080)
```

### 与 HTTP 模块集成

```javascript
const http = require('http')
const https = require('https')
const fs = require('fs')

// HTTP 请求处理 Buffer
const server = http.createServer((req, res) => {
  const chunks = []
  
  req.on('data', (chunk) => {
    chunks.push(chunk)
  })
  
  req.on('end', () => {
    const body = Buffer.concat(chunks)
    
    console.log('请求体大小:', body.length)
    console.log('请求体内容:', body.toString('utf8'))
    
    // 返回 Buffer 响应
    const responseData = Buffer.from('Hello Client')
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'Content-Length': responseData.length
    })
    res.end(responseData)
  })
})

// 使用 fetch 下载文件 (Node.js 18+)
async function downloadFile(url, outputPath) {
  const response = await fetch(url)
  const arrayBuffer = await response.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  
  fs.writeFileSync(outputPath, buffer)
  console.log(`下载完成: ${buffer.length} 字节`)
}

// 文件上传示例
async function uploadFile(url, filePath) {
  const fileBuffer = fs.readFileSync(filePath)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': fileBuffer.length
    },
    body: fileBuffer
  })
  
  return response
}
```

### 与 Crypto 模块集成

```javascript
const crypto = require('crypto')

// 文件哈希计算
function hashFile(filePath, algorithm = 'sha256') {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(algorithm)
    const stream = fs.createReadStream(filePath)
    
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

// Buffer 加密
function encryptBuffer(buffer, password) {
  const key = crypto.scryptSync(password, 'salt', 32)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  
  const encrypted = Buffer.concat([
    iv,
    cipher.update(buffer),
    cipher.final()
  ])
  
  return encrypted
}

// Buffer 解密
function decryptBuffer(encrypted, password) {
  const key = crypto.scryptSync(password, 'salt', 32)
  const iv = encrypted.slice(0, 16)
  const data = encrypted.slice(16)
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  
  return Buffer.concat([
    decipher.update(data),
    decipher.final()
  ])
}

// 使用示例
const secret = Buffer.from('机密信息')
const encrypted = encryptBuffer(secret, 'password123')
const decrypted = decryptBuffer(encrypted, 'password123')
console.log(decrypted.toString()) // "机密信息"
```

### 与 Zlib 模块集成

```javascript
const zlib = require('zlib')

// Buffer 压缩
async function compressBuffer(buffer) {
  return new Promise((resolve, reject) => {
    zlib.gzip(buffer, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

// Buffer 解压
async function decompressBuffer(buffer) {
  return new Promise((resolve, reject) => {
    zlib.gunzip(buffer, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

// 使用示例
async function demo() {
  const original = Buffer.from('Hello World! '.repeat(100))
  const compressed = await compressBuffer(original)
  const decompressed = await decompressBuffer(compressed)
  
  console.log('原始大小:', original.length)       // 1300
  console.log('压缩后:', compressed.length)      // ~50
  console.log('压缩比:', (compressed.length / original.length * 100).toFixed(1) + '%')
  console.log('解压后:', decompressed.toString()) // "Hello World! ..."
}

// 流式压缩
function compressFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(inputPath)
      .pipe(zlib.createGzip())
      .pipe(fs.createWriteStream(outputPath))
      .on('finish', resolve)
      .on('error', reject)
  })
}
```

## 性能优化

### 创建方法性能对比

```javascript
// 性能测试函数
function benchmark(name, fn, iterations = 100000) {
  const start = process.hrtime.bigint()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = process.hrtime.bigint()
  const ms = Number(end - start) / 1e6
  console.log(`${name}: ${ms.toFixed(2)}ms (${(ms / iterations * 1000).toFixed(3)}μs/op)`)
}

// 测试不同创建方式
const size = 1024

benchmark('Buffer.alloc', () => Buffer.alloc(size))
benchmark('Buffer.allocUnsafe', () => Buffer.allocUnsafe(size))
benchmark('Buffer.allocUnsafe + fill', () => Buffer.allocUnsafe(size).fill(0))
benchmark('Buffer.from(array)', () => Buffer.from(new Array(size)))
benchmark('Buffer.from(string)', () => Buffer.from('a'.repeat(size)))

// 结果示例 (可能因环境不同):
// Buffer.alloc: 45.23ms (0.452μs/op)
// Buffer.allocUnsafe: 12.87ms (0.129μs/op)
// Buffer.allocUnsafe + fill: 38.91ms (0.389μs/op)
// Buffer.from(array): 156.42ms (1.564μs/op)
// Buffer.from(string): 67.31ms (0.673μs/op)
```

### 内存池优化

```javascript
// 复用 Buffer 减少分配
class BufferPool {
  constructor(size) {
    this.buffer = Buffer.allocUnsafe(size)
    this.offset = 0
  }
  
  alloc(size) {
    if (this.offset + size > this.buffer.length) {
      this.offset = 0 // 重置或抛出错误
    }
    const buf = this.buffer.slice(this.offset, this.offset + size)
    this.offset += size
    return buf
  }
  
  reset() {
    this.offset = 0
  }
}

// 使用示例
const pool = new BufferPool(1024 * 1024) // 1MB 池

function processMessage(data) {
  const buf = pool.alloc(1024)
  buf.write(data)
  // 处理数据...
  pool.reset() // 重置供下次使用
}
```

### 零拷贝技术

```javascript
const fs = require('fs')

// 流式文件传输:无需整块载入内存
// (注意:这是应用层流式处理,并非内核级 sendfile 零拷贝)
function zeroCopyFile(src, dst, callback) {
  const reader = fs.createReadStream(src)
  const writer = fs.createWriteStream(dst)
  
  reader.pipe(writer)
  writer.on('finish', callback)
}

// Buffer.slice 共享内存
const original = Buffer.alloc(1024)
const slice = original.slice(0, 512)

// 修改 slice 会影响 original (共享内存)
slice[0] = 0xff
console.log(original[0]) // 255

// 如果需要独立副本,使用 Buffer.from
const copy = Buffer.from(original.slice(0, 512))
copy[0] = 0x00
console.log(original[0]) // 255 (不受影响)
```

### 大文件处理

```javascript
// ❌ 错误:一次性读取大文件
function badReadFile(path) {
  const buffer = fs.readFileSync(path) // 可能导致内存溢出
  return processBuffer(buffer)
}

// ✅ 正确:流式处理
async function goodReadFile(path) {
  const stream = fs.createReadStream(path, {
    highWaterMark: 64 * 1024 // 64KB 块大小
  })
  
  let result = 0
  for await (const chunk of stream) {
    result += processChunk(chunk)
  }
  return result
}

// 分批处理大 Buffer
async function processLargeBuffer(buffer, chunkSize = 1024 * 1024) {
  const results = []
  
  for (let offset = 0; offset < buffer.length; offset += chunkSize) {
    const chunk = buffer.slice(offset, Math.min(offset + chunkSize, buffer.length))
    results.push(processChunk(chunk))
    
    // 允许事件循环处理其他任务
    if (offset % (chunkSize * 10) === 0) {
      await new Promise(resolve => setImmediate(resolve))
    }
  }
  
  return results
}
```

## 安全考虑

### 敏感数据处理

```javascript
// ❌ 错误:敏感数据可能泄漏
const password = Buffer.from('my-password')
const unsafe = Buffer.allocUnsafe(10)
// unsafe 可能包含旧数据,包括 password 的部分内容

// ✅ 正确:使用安全分配(初始化为零)
const safe = Buffer.alloc(10)

// ✅ 最佳实践:及时清除敏感数据
function processPassword(pwd) {
  const buf = Buffer.from(pwd)
  
  try {
    // 处理密码...
    return hashPassword(buf)
  } finally {
    // 清除内存中的密码
    buf.fill(0)
  }
}
```

### 输入验证

```javascript
// 验证 Buffer 输入
function safeProcess(buffer) {
  // 检查是否为 Buffer
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Expected Buffer')
  }
  
  // 检查大小限制
  if (buffer.length > 10 * 1024 * 1024) { // 10MB
    throw new Error('Buffer too large')
  }
  
  // 检查内容有效性
  if (buffer.length === 0) {
    return Buffer.alloc(0)
  }
  
  return process(buffer)
}

// 防止整数溢出
function safeAlloc(size) {
  if (!Number.isSafeInteger(size) || size < 0 || size > kMaxLength) {
    throw new RangeError('Invalid buffer size')
  }
  return Buffer.alloc(size)
}

const kMaxLength = require('buffer').constants.MAX_LENGTH
console.log(kMaxLength) // 不同平台不同,64 位系统 Node.js 15+ 为 4GB,新版本已进一步提升
```

### 编码安全

```javascript
// 避免编码转换导致的数据损坏
function safeEncode(text) {
  try {
    const buf = Buffer.from(text, 'utf8')
    
    // 验证编码正确性
    const decoded = buf.toString('utf8')
    if (decoded !== text) {
      throw new Error('Encoding failed')
    }
    
    return buf
  } catch (err) {
    console.error('编码错误:', err)
    throw err
  }
}

// 处理不完整的 UTF-8 序列
function safeSlice(buffer, start, end) {
  const slice = buffer.slice(start, end)
  
  // 检查是否在多字节字符中间截断
  const text = slice.toString('utf8')
  const reconstructed = Buffer.from(text, 'utf8')
  
  if (!reconstructed.equals(slice)) {
    console.warn('警告:截断位置可能在多字节字符中间')
  }
  
  return text
}
```

### 防止时序攻击

```javascript
const crypto = require('crypto')

// ❌ 错误:可能遭受时序攻击
function unsafeCompare(a, b) {
  return a.equals(b) // 不同长度返回快,相同长度逐字节比较
}

// ✅ 正确:使用时间恒定的比较
function safeCompare(a, b) {
  return crypto.timingSafeEqual(a, b)
}

// 使用示例
const token1 = Buffer.from('secret-token-123')   // 16 字节
const token2 = Buffer.from('secret-token-123')   // 16 字节
const token3 = Buffer.from('wrong-token-9999')   // 16 字节(长度必须相同,否则抛出 ERR_CRYPTO_TIMING_SAFE_EQUAL_LENGTH)

console.log(safeCompare(token1, token2)) // true
console.log(safeCompare(token1, token3)) // false
```

## 实战案例

### 案例一:图片拷贝与 Base64 编解码

图片文件是典型的二进制数据,通过 Buffer 可以完成图片的读取、拷贝和编解码操作。

```javascript
const fs = require('fs')

// 1. 读取图片文件,得到 Buffer 数据
fs.readFile('img.png', (err, buffer) => {
  if (err) throw err

  // 验证读取结果为 Buffer
  console.log(Buffer.isBuffer(buffer))  // true

  // 2. 拷贝图片:将 Buffer 数据写入新文件
  fs.writeFile('logo.png', buffer, (err) => {
    if (err) throw err
    console.log('图片拷贝完成')
  })

  // 3. Base64 编码:Buffer → base64 字符串
  const base64Image = Buffer.from(buffer).toString('base64')
  console.log('Base64 编码结果(前100字符):', base64Image.substring(0, 100))

  // 4. Base64 解码:base64 字符串 → Buffer
  const decodedImage = Buffer.from(base64Image, 'base64')

  // 5. 验证编解码的一致性
  console.log(Buffer.compare(buffer, decodedImage))  // 0,表示数据完全一致

  // 6. 将解码后的 Buffer 写入新文件
  fs.writeFile('img_decoded.png', decodedImage, (err) => {
    if (err) throw err
    console.log('解码图片写入完成')
  })
})
```

#### 生成 Data URL 内嵌图片

将图片编码为 Base64 后可直接嵌入 HTML/CSS:

```javascript
const fs = require('fs')

function imageToDataURL(imagePath, mimeType = 'image/png') {
  const buffer = fs.readFileSync(imagePath)
  const base64 = buffer.toString('base64')
  return `data:${mimeType};base64,${base64}`
}

// 使用示例
const dataUrl = imageToDataURL('logo.png')
console.log(dataUrl.substring(0, 60)) // "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgA..."
```

#### Base64 编解码流程图

```
原始图片文件 → fs.readFile → Buffer (二进制数据)
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
              fs.writeFile   .toString('base64') │
                    │             │             │
              拷贝图片文件   Base64 字符串    Buffer.from(str, 'base64')
                                  │             │
                                  │         解码后的 Buffer
                                  │             │
                                  │        fs.writeFile
                                  │             │
                                  │        还原图片文件
                                  │
                         可用于 Data URL、邮件附件、API 传输
```

### 案例二:二进制协议解析器

```javascript
/**
 * 自定义二进制协议
 * 格式:
 * ┌────────┬────────┬────────┬──────────┬────────┐
 * │ 魔数   │ 版本   │ 类型   │ 数据长度 │ 数据   │
 * │ 2字节  │ 1字节  │ 1字节  │ 4字节    │ N字节  │
 * └────────┴────────┴────────┴──────────┴────────┘
 */
class BinaryProtocol {
  static MAGIC = 0xabcd
  static VERSION = 0x01
  
  // 编码消息
  static encode(type, payload) {
    const body = Buffer.from(payload, 'utf8')
    const buffer = Buffer.alloc(8 + body.length)
    
    buffer.writeUInt16BE(this.MAGIC, 0)      // 魔数
    buffer.writeUInt8(this.VERSION, 2)       // 版本
    buffer.writeUInt8(type, 3)               // 类型
    buffer.writeUInt32BE(body.length, 4)     // 数据长度
    body.copy(buffer, 8)                     // 数据
    
    return buffer
  }
  
  // 解码消息
  static decode(buffer) {
    // 验证最小长度
    if (buffer.length < 8) {
      throw new Error('Buffer too short')
    }
    
    // 解析头部
    const magic = buffer.readUInt16BE(0)
    const version = buffer.readUInt8(1)
    const type = buffer.readUInt8(3)
    const length = buffer.readUInt32BE(4)
    
    // 验证魔数
    if (magic !== this.MAGIC) {
      throw new Error('Invalid magic number')
    }
    
    // 验证版本
    if (version !== this.VERSION) {
      throw new Error('Unsupported version')
    }
    
    // 验证长度
    if (buffer.length < 8 + length) {
      throw new Error('Incomplete message')
    }
    
    // 提取数据
    const payload = buffer.slice(8, 8 + length).toString('utf8')
    
    return { version, type, length, payload }
  }
}

// 使用示例
const message = BinaryProtocol.encode(0x01, 'Hello World')
console.log(message.toString('hex'))
// "abcd01010000000b48656c6c6f20576f726c64" ('Hello World' 共 11 字节)

const parsed = BinaryProtocol.decode(message)
console.log(parsed)
// { version: 1, type: 1, length: 11, payload: 'Hello World' }
```

### 案例三:图片元数据提取器

```javascript
/**
 * PNG 图片元数据提取
 * PNG 格式:
 * ┌─────────┬──────────┬──────────┬──────────┐
 * │ 签名    │ IHDR块   │ 其他块   │ IEND块   │
 * │ 8字节   │ 25字节   │ 变长     │ 12字节   │
 * └─────────┴──────────┴──────────┴──────────┘
 */
class PNGMetadata {
  static SIGNATURE = Buffer.from([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a
  ])
  
  static extract(buffer) {
    // 验证 PNG 签名
    if (!buffer.slice(0, 8).equals(this.SIGNATURE)) {
      throw new Error('Not a valid PNG file')
    }
    
    let offset = 8
    const chunks = []
    
    // 解析数据块
    while (offset < buffer.length) {
      const length = buffer.readUInt32BE(offset)
      const type = buffer.slice(offset + 4, offset + 8).toString('ascii')
      const data = buffer.slice(offset + 8, offset + 8 + length)
      const crc = buffer.readUInt32BE(offset + 8 + length)
      
      chunks.push({ type, length, data, crc })
      offset += 12 + length
      
      // IEND 标志结束
      if (type === 'IEND') break
    }
    
    // 提取 IHDR 信息
    const ihdr = chunks.find(c => c.type === 'IHDR')
    if (ihdr) {
      return {
        width: ihdr.data.readUInt32BE(0),
        height: ihdr.data.readUInt32BE(4),
        bitDepth: ihdr.data.readUInt8(8),
        colorType: ihdr.data.readUInt8(9),
        compression: ihdr.data.readUInt8(10),
        filter: ihdr.data.readUInt8(11),
        interlace: ihdr.data.readUInt8(12)
      }
    }
    
    return null
  }
}

// 使用示例
const fs = require('fs')
const pngBuffer = fs.readFileSync('image.png')
const metadata = PNGMetadata.extract(pngBuffer)
console.log(metadata)
// {
//   width: 1920,
//   height: 1080,
//   bitDepth: 8,
//   colorType: 2,
//   compression: 0,
//   filter: 0,
//   interlace: 0
// }
```

### 案例四:高性能日志系统

```javascript
const fs = require('fs')

/**
 * 基于 Buffer 的高性能日志系统
 * 特点:
 * - 预分配 Buffer 池
 * - 二进制格式存储
 * - 批量写入文件
 */
class BufferLogger {
  constructor(options = {}) {
    this.bufferSize = options.bufferSize || 1024 * 1024 // 1MB
    this.buffer = Buffer.allocUnsafe(this.bufferSize)
    this.offset = 0
    this.stream = fs.createWriteStream(options.logFile, { flags: 'a' })
  }
  
  // 写入日志
  log(level, message, metadata = {}) {
    const timestamp = Date.now()
    const levelCode = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 }[level] || 2
    
    const msgBuf = Buffer.from(message, 'utf8')
    const metaBuf = Buffer.from(JSON.stringify(metadata), 'utf8')
    
    // 日志头: 时间戳(8) + 级别(1) + 消息长度(2) + 元数据长度(2)
    const headerSize = 13
    
    // 检查缓冲区空间
    if (this.offset + headerSize + msgBuf.length + metaBuf.length > this.bufferSize) {
      this.flush()
    }
    
    // 写入日志头
    this.buffer.writeBigInt64BE(BigInt(timestamp), this.offset)
    this.buffer.writeUInt8(levelCode, this.offset + 8)
    this.buffer.writeUInt16BE(msgBuf.length, this.offset + 9)
    this.buffer.writeUInt16BE(metaBuf.length, this.offset + 11)
    
    // 写入数据
    msgBuf.copy(this.buffer, this.offset + headerSize)
    metaBuf.copy(this.buffer, this.offset + headerSize + msgBuf.length)
    
    this.offset += headerSize + msgBuf.length + metaBuf.length
  }
  
  // 刷新缓冲区
  flush() {
    if (this.offset === 0) return
    
    const toWrite = this.buffer.slice(0, this.offset)
    this.stream.write(toWrite)
    this.offset = 0
    
    console.log(`Flushed ${toWrite.length} bytes`)
  }
  
  // 关闭日志
  close() {
    this.flush()
    this.stream.end()
  }
}

// 使用示例
const logger = new BufferLogger({ logFile: 'app.log' })

for (let i = 0; i < 10000; i++) {
  logger.log('INFO', `Log message ${i}`, { userId: i, action: 'test' })
}

logger.close()
```

### 案例五:WebSocket 帧解析器

```javascript
/**
 * WebSocket 帧解析器
 * RFC 6455 协议格式:
 * ┌──────┬──────┬──────────┬─────────┬──────────┬─────────┐
 * │ FIN  │ RSV  │ Opcode   │ Mask    │ Payload  │ Masking │
 * │ 1bit │ 3bit │ 4bit     │ 1bit    │ Length   │ Key     │
 * └──────┴──────┴──────────┴──────────┴──────────┴─────────┘
 */
class WebSocketFrame {
  static OPCODES = {
    0x0: 'continuation',
    0x1: 'text',
    0x2: 'binary',
    0x8: 'close',
    0x9: 'ping',
    0xa: 'pong'
  }
  
  // 解析帧
  static parse(buffer) {
    let offset = 0
    
    // 第一个字节: FIN + RSV + Opcode
    const byte1 = buffer.readUInt8(offset++)
    const fin = (byte1 & 0x80) !== 0
    const rsv1 = (byte1 & 0x40) !== 0
    const rsv2 = (byte1 & 0x20) !== 0
    const rsv3 = (byte1 & 0x10) !== 0
    const opcode = byte1 & 0x0f
    
    // 第二个字节: Mask + Payload length
    const byte2 = buffer.readUInt8(offset++)
    const masked = (byte2 & 0x80) !== 0
    let payloadLength = byte2 & 0x7f
    
    // 扩展长度
    if (payloadLength === 126) {
      payloadLength = buffer.readUInt16BE(offset)
      offset += 2
    } else if (payloadLength === 127) {
      payloadLength = Number(buffer.readBigUInt64BE(offset))
      offset += 8
    }
    
    // Masking key
    let maskingKey = null
    if (masked) {
      maskingKey = buffer.slice(offset, offset + 4)
      offset += 4
    }
    
    // Payload
    let payload = buffer.slice(offset, offset + payloadLength)
    
    // 解码掩码
    if (masked && maskingKey) {
      payload = this.unmask(payload, maskingKey)
    }
    
    return {
      fin,
      opcode,
      opcodeName: this.OPCODES[opcode],
      masked,
      payloadLength,
      payload
    }
  }
  
  // 解码掩码
  static unmask(payload, maskingKey) {
    const result = Buffer.alloc(payload.length)
    for (let i = 0; i < payload.length; i++) {
      result[i] = payload[i] ^ maskingKey[i % 4]
    }
    return result
  }
  
  // 创建帧
  static create(opcode, payload, masked = true) {
    const payloadBuf = Buffer.isBuffer(payload) ? payload : Buffer.from(payload)
    let headerSize = 2
    const maskedBit = masked ? 0x80 : 0x00
    
    // 计算长度字段大小
    let lengthField
    if (payloadBuf.length < 126) {
      lengthField = payloadBuf.length
    } else if (payloadBuf.length < 65536) {
      lengthField = 126
      headerSize += 2
    } else {
      lengthField = 127
      headerSize += 8
    }
    
    // 生成掩码
    let maskingKey = null
    if (masked) {
      maskingKey = crypto.randomBytes(4)
      headerSize += 4
    }
    
    const buffer = Buffer.alloc(headerSize + payloadBuf.length)
    let offset = 0
    
    // 写入头部
    buffer.writeUInt8(0x80 | opcode, offset++) // FIN=1
    buffer.writeUInt8(maskedBit | lengthField, offset++)
    
    // 写入扩展长度
    if (lengthField === 126) {
      buffer.writeUInt16BE(payloadBuf.length, offset)
      offset += 2
    } else if (lengthField === 127) {
      buffer.writeBigUInt64BE(BigInt(payloadBuf.length), offset)
      offset += 8
    }
    
    // 写入掩码
    if (masked && maskingKey) {
      maskingKey.copy(buffer, offset)
      offset += 4
    }
    
    // 写入 payload
    if (masked && maskingKey) {
      for (let i = 0; i < payloadBuf.length; i++) {
        buffer[offset + i] = payloadBuf[i] ^ maskingKey[i % 4]
      }
    } else {
      payloadBuf.copy(buffer, offset)
    }
    
    return buffer
  }
}

// 使用示例
const textFrame = WebSocketFrame.create(0x1, 'Hello WebSocket')
const parsed = WebSocketFrame.parse(textFrame)
console.log(parsed)
// {
//   fin: true,
//   opcode: 1,
//   opcodeName: 'text',
//   masked: true,
//   payloadLength: 15,
//   payload: <Buffer 48 65 6c 6c 6f 20 57 65 62 53 6f 63 6b 65 74>
// }
```

### 案例六:Buffer 池管理器

```javascript
/**
 * 高性能 Buffer 池管理器
 * 特点:
 * - 自动扩容
 * - 内存复用
 * - 线程安全 (单线程环境)
 */
class BufferPoolManager {
  constructor(options = {}) {
    this.poolSize = options.poolSize || Buffer.poolSize
    this.maxPools = options.maxPools || 10
    this.pools = []
    this.currentPool = 0
    this.currentOffset = 0
    
    // 初始化第一个池
    this.addPool()
  }
  
  // 添加新池
  addPool() {
    if (this.pools.length >= this.maxPools) {
      throw new Error('Maximum number of pools reached')
    }
    
    const pool = {
      buffer: Buffer.allocUnsafe(this.poolSize),
      used: 0
    }
    
    this.pools.push(pool)
    this.currentPool = this.pools.length - 1
    this.currentOffset = 0
    
    return pool
  }
  
  // 分配 Buffer
  alloc(size) {
    if (size > this.poolSize) {
      // 大于池大小,单独分配
      return Buffer.allocUnsafe(size)
    }
    
    // 检查当前池是否有足够空间
    if (this.currentOffset + size > this.poolSize) {
      // 尝试使用下一个池或创建新池
      this.currentPool++
      if (this.currentPool >= this.pools.length) {
        this.addPool()
      }
      this.currentOffset = 0
    }
    
    const pool = this.pools[this.currentPool]
    const buffer = pool.buffer.slice(this.currentOffset, this.currentOffset + size)
    
    this.currentOffset += size
    pool.used = Math.max(pool.used, this.currentOffset)
    
    return buffer
  }
  
  // 获取统计信息
  getStats() {
    return {
      totalPools: this.pools.length,
      poolSize: this.poolSize,
      totalMemory: this.pools.length * this.poolSize,
      usedMemory: this.pools.reduce((sum, p) => sum + p.used, 0),
      utilization: (this.pools.reduce((sum, p) => sum + p.used, 0) / 
                   (this.pools.length * this.poolSize) * 100).toFixed(2) + '%'
    }
  }
  
  // 重置池
  reset() {
    for (const pool of this.pools) {
      pool.used = 0
    }
    this.currentPool = 0
    this.currentOffset = 0
  }
  
  // 清空所有池
  clear() {
    this.pools = []
    this.currentPool = 0
    this.currentOffset = 0
    this.addPool()
  }
}

// 使用示例
const pool = new BufferPoolManager({ poolSize: 1024 * 1024 })

// 分配多个 Buffer
const buffers = []
for (let i = 0; i < 100; i++) {
  buffers.push(pool.alloc(10240)) // 每个 10KB
}

console.log(pool.getStats())
// {
//   totalPools: 1,
//   poolSize: 1048576,
//   totalMemory: 1048576,
//   usedMemory: 1024000,
//   utilization: '97.66%'
// }

pool.reset() // 重置后可复用
```

## 常见问题与排查

### 问题一:内存泄漏

**症状**: 内存占用持续增长,长时间运行后崩溃

**排查步骤**:

```javascript
// 1. 监控内存使用
function monitorMemory() {
  const used = process.memoryUsage()
  console.log({
    rss: `${(used.rss / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    external: `${(used.external / 1024 / 1024).toFixed(2)} MB`,
    arrayBuffers: `${(used.arrayBuffers / 1024 / 1024).toFixed(2)} MB`
  })
}

setInterval(monitorMemory, 5000)

// 2. 检查 Buffer 引用
const buffers = []

function processData() {
  const buf = Buffer.alloc(1024)
  buffers.push(buf) // ❌ 泄漏:一直持有引用
}

// ✅ 修复:及时释放
function processDataFixed() {
  let buf = Buffer.alloc(1024)
  // 使用完立即置空
  process(buf)
  buf = null
}

// 3. 使用 heapdump 分析
// npm install heapdump
const heapdump = require('heapdump')
heapdump.writeSnapshot('/tmp/heapdump-' + Date.now() + '.heapsnapshot')
```

### 问题二:中文乱码

**症状**: 截取或拼接 Buffer 时出现乱码

**原因**: UTF-8 中文字符占用 3 字节,截取位置不当

**解决方案**:

```javascript
// ❌ 错误:按字符位置截取
const text = '你好世界'
const buf = Buffer.from(text)
const bad = buf.slice(1, 7) // 可能截断字符
console.log(bad.toString()) // 乱码

// ✅ 正确:使用字符串截取后再转 Buffer
const good = Buffer.from(text.substring(1, 3))
console.log(good.toString()) // "好世"

// ✅ 正确:精确计算字节位置
function safeSliceUTF8(buffer, charStart, charEnd) {
  const text = buffer.toString('utf8')
  const substring = text.substring(charStart, charEnd)
  return Buffer.from(substring, 'utf8')
}

// ✅ 最佳:使用 TextDecoder 的 stream 模式
const decoder = new TextDecoder('utf-8', { fatal: true })
const chunks = []
let pending = Buffer.alloc(0)

function decodeChunk(chunk) {
  pending = Buffer.concat([pending, chunk])
  
  // 尝试解码
  try {
    const text = decoder.decode(pending, { stream: true })
    chunks.push(text)
    pending = Buffer.alloc(0)
  } catch (err) {
    // 保留不完整的字节序列
    // pending 会保留,等待下一个 chunk
  }
}
```

### 问题三:性能瓶颈

**症状**: Buffer 操作 CPU 占用高

**排查**:

```javascript
// 1. 使用 console.time
console.time('buffer-ops')
for (let i = 0; i < 100000; i++) {
  const buf = Buffer.alloc(1024)
  buf.fill(0)
}
console.timeEnd('buffer-ops')

// 2. 使用性能分析工具
// node --prof app.js
// node --prof-process isolate-*.log > profile.txt

// 常见性能问题:

// ❌ 问题:频繁创建小 Buffer
for (let i = 0; i < 10000; i++) {
  const buf = Buffer.from(i.toString())
}

// ✅ 优化:复用 Buffer
const buf = Buffer.alloc(10)
for (let i = 0; i < 10000; i++) {
  buf.fill(0)
  buf.write(i.toString())
}

// ❌ 问题:反复转换编码
const text = 'Hello'
for (let i = 0; i < 10000; i++) {
  const buf = Buffer.from(text, 'utf8')
  const hex = buf.toString('hex')
}

// ✅ 优化:缓存结果
const cachedBuf = Buffer.from('Hello', 'utf8')
const cachedHex = cachedBuf.toString('hex')
for (let i = 0; i < 10000; i++) {
  // 直接使用 cachedHex
}
```

### 问题四:Buffer 大小限制

**症状**: 创建大 Buffer 时报错

**解决方案**:

```javascript
const { constants } = require('buffer')

console.log(constants.MAX_LENGTH)
// 32 位系统: ~1GB (2^30 - 1)
// 64 位系统: 4GB (2^32 - 1,Node.js 15+;新版本已进一步提升)

// ❌ 错误:超过最大限制(旧版本 Node.js 会抛出 RangeError;
// 新版本上限已提升,但超大分配仍可能因物理内存不足触发 OOM)
try {
  const huge = Buffer.alloc(3 * 1024 * 1024 * 1024) // 3GB
} catch (err) {
  console.error('Buffer 太大:', err.message)
}

// ✅ 解决:使用流式处理
const fs = require('fs')

async function processLargeFile(path) {
  const stream = fs.createReadStream(path, {
    highWaterMark: 1024 * 1024 // 1MB 块
  })
  
  for await (const chunk of stream) {
    // 处理每个块
    process(chunk)
  }
}

// ✅ 或:分块创建
function createLargeBuffer(totalSize, chunkSize = 1024 * 1024) {
  const chunks = []
  
  for (let offset = 0; offset < totalSize; offset += chunkSize) {
    const size = Math.min(chunkSize, totalSize - offset)
    chunks.push(Buffer.alloc(size))
  }
  
  return chunks
}
```

### 问题五:编码转换错误

**症状**: 不同编码转换时数据损坏

**解决方案**:

```javascript
const fs = require('fs')
const iconv = require('iconv-lite')

// ❌ 问题:不支持的编码
try {
  const buf = Buffer.from('测试', 'gbk') // Node.js 原生不支持 GBK
} catch (err) {
  console.error(err.message) // Unknown encoding: gbk (ERR_UNKNOWN_ENCODING)
}

// GBK 转 UTF-8
const gbkBuffer = fs.readFileSync('gbk-file.txt')
const utf8String = iconv.decode(gbkBuffer, 'gbk')
console.log(utf8String)

// UTF-8 转 GBK
const utf8Text = '测试文本'
const gbkBuffer2 = iconv.encode(utf8Text, 'gbk')
fs.writeFileSync('gbk-output.txt', gbkBuffer2)

// ✅ 验证编码转换
function safeConvert(buffer, fromEncoding, toEncoding) {
  const text = iconv.decode(buffer, fromEncoding)
  const converted = iconv.encode(text, toEncoding)
  const verified = iconv.decode(converted, toEncoding)
  
  if (text !== verified) {
    throw new Error('Encoding conversion failed')
  }
  
  return converted
}
```

## 最佳实践

### 创建与初始化

```javascript
// ✅ 推荐:安全优先
const safeBuf = Buffer.alloc(1024)

// ✅ 性能优先时:立即填充
const fastBuf = Buffer.allocUnsafe(1024)
fastBuf.fill(0) // 必须立即填充

// ✅ 从已知数据创建
const fromArrayBuf = Buffer.from([0x01, 0x02, 0x03])
const fromStringBuf = Buffer.from('text', 'utf8')

// ❌ 避免:长时间持有未填充的 allocUnsafe
const pendingBuf = Buffer.allocUnsafe(1024)
// ... 大量代码 ...
pendingBuf.write('data') // 之前的时间窗口可能泄漏数据
```

### 内存管理

```javascript
// ✅ 及时释放大 Buffer
function processFile(path) {
  let buffer = fs.readFileSync(path)
  const result = process(buffer)
  // 及时释放
  buffer = null
  return result
}

// ✅ 使用流处理大文件
function processLargeFile(path) {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(path)
    const chunks = []
    
    stream.on('data', chunk => {
      // 及时处理,不要累积太多
      if (chunks.length > 100) {
        processBatch(chunks)
        chunks.length = 0
      }
      chunks.push(chunk)
    })
    
    stream.on('end', () => {
      if (chunks.length > 0) {
        processBatch(chunks)
      }
      resolve()
    })
    
    stream.on('error', reject)
  })
}

// ✅ 监控内存使用
function checkMemory() {
  const used = process.memoryUsage()
  const externalMB = used.external / 1024 / 1024
  
  if (externalMB > 100) {
    console.warn(`Buffer 内存占用过高: ${externalMB.toFixed(2)} MB`)
  }
}

setInterval(checkMemory, 10000)
```

### 编码处理

```javascript
// ✅ 明确指定编码
const buf = Buffer.from('text', 'utf8')
const text = buf.toString('utf8')

// ✅ 验证编码正确性
function encodeText(text, encoding = 'utf8') {
  if (!Buffer.isEncoding(encoding)) {
    throw new Error(`Unsupported encoding: ${encoding}`)
  }
  
  const buf = Buffer.from(text, encoding)
  const decoded = buf.toString(encoding)
  
  if (decoded !== text) {
    throw new Error('Encoding/decoding mismatch')
  }
  
  return buf
}

// ✅ 处理多字节字符
function splitByBytes(text, maxBytes) {
  const buf = Buffer.from(text, 'utf8')
  const result = []
  let offset = 0
  
  while (offset < buf.length) {
    let end = offset + maxBytes
    
    // 确保不在多字节字符中间截断
    if (end < buf.length) {
      while (end > offset && (buf[end] & 0xc0) === 0x80) {
        end--
      }
    }
    
    result.push(buf.slice(offset, end).toString('utf8'))
    offset = end
  }
  
  return result
}

console.log(splitByBytes('你好世界', 4))
// ['你', '好', '世', '界']
```

### 性能优化

```javascript
// ✅ 复用 Buffer
const bufferPool = {
  buffers: [],
  get(size) {
    const cached = this.buffers.find(b => b.length >= size)
    if (cached) {
      this.buffers = this.buffers.filter(b => b !== cached)
      cached.fill(0)
      return cached
    }
    return Buffer.alloc(size)
  },
  release(buffer) {
    if (buffer.length > 1024) {
      this.buffers.push(buffer)
    }
  }
}

// ✅ 批量操作
function batchWrite(items) {
  // 先计算总大小
  const totalSize = items.reduce((sum, item) => sum + Buffer.byteLength(item), 0)
  
  // 一次性分配
  const buffer = Buffer.alloc(totalSize)
  let offset = 0
  
  for (const item of items) {
    const itemBuf = Buffer.from(item)
    itemBuf.copy(buffer, offset)
    offset += itemBuf.length
  }
  
  return buffer
}

// ✅ 避免不必要的拷贝
// ❌ 错误
function bad(data) {
  const buf1 = Buffer.from(data)
  const buf2 = Buffer.from(buf1.toString())
  return buf2
}

// ✅ 正确
function good(data) {
  return Buffer.isBuffer(data) ? data : Buffer.from(data)
}
```

### 安全实践

```javascript
// ✅ 敏感数据处理
function processPassword(password) {
  const buf = Buffer.from(password)
  
  try {
    const hash = crypto.createHash('sha256').update(buf).digest()
    return hash
  } finally {
    // 清除明文密码
    buf.fill(0)
  }
}

// ✅ 输入验证
function safeBuffer(input) {
  if (!Buffer.isBuffer(input) && typeof input !== 'string') {
    throw new TypeError('Expected Buffer or string')
  }
  
  const buf = Buffer.from(input)
  
  if (buf.length > 10 * 1024 * 1024) {
    throw new Error('Input too large (max 10MB)')
  }
  
  return buf
}

// ✅ 时间安全比较
function compareToken(a, b) {
  if (a.length !== b.length) {
    return false
  }
  
  return crypto.timingSafeEqual(a, b)
}
```

## API 速查表

### 实例属性

| 属性 | 类型 | 说明 |
|------|------|------|
| `buffer.length` | Number | Buffer 的字节长度 |
| `buffer.byteLength` | Number | 同 `length` |
| `buffer.byteOffset` | Number | 底层 ArrayBuffer 的偏移量 |
| `buffer.buffer` | ArrayBuffer | 底层 ArrayBuffer |

### 静态方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `Buffer.alloc(size, fill?, encoding?)` | Buffer | 分配并清零 |
| `Buffer.allocUnsafe(size)` | Buffer | 分配但不清零 |
| `Buffer.allocUnsafeSlow(size)` | Buffer | 分配大块内存 |
| `Buffer.from(array)` | Buffer | 从数组创建 |
| `Buffer.from(buffer)` | Buffer | 深拷贝 Buffer |
| `Buffer.from(string, encoding?)` | Buffer | 从字符串创建 |
| `Buffer.from(arrayBuffer, byteOffset?, length?)` | Buffer | 从 ArrayBuffer 创建 |
| `Buffer.concat(list, totalLength?)` | Buffer | 合并多个 Buffer |
| `Buffer.isBuffer(obj)` | Boolean | 判断是否为 Buffer |
| `Buffer.isEncoding(encoding)` | Boolean | 判断是否支持编码 |
| `Buffer.byteLength(string, encoding?)` | Number | 计算字节长度 |
| `Buffer.compare(buf1, buf2)` | Number | 比较两个 Buffer |
| `Buffer.of(...bytes)` | Buffer | 创建包含指定字节的 Buffer (v22.9.0+) |

### 实例方法

#### 写入方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `write(string, offset?, length?, encoding?)` | - | Number | 写入字符串 |
| `writeInt8(value, offset)` | - | offset | 写入 8 位整数 |
| `writeUInt8(value, offset)` | - | offset | 写入 8 位无符号整数 |
| `writeInt16BE(value, offset)` | - | offset | 写入 16 位大端整数 |
| `writeInt16LE(value, offset)` | - | offset | 写入 16 位小端整数 |
| `writeUInt16BE(value, offset)` | - | offset | 写入 16 位大端无符号整数 |
| `writeUInt16LE(value, offset)` | - | offset | 写入 16 位小端无符号整数 |
| `writeInt32BE(value, offset)` | - | offset | 写入 32 位大端整数 |
| `writeInt32LE(value, offset)` | - | offset | 写入 32 位小端整数 |
| `writeUInt32BE(value, offset)` | - | offset | 写入 32 位大端无符号整数 |
| `writeUInt32LE(value, offset)` | - | offset | 写入 32 位小端无符号整数 |
| `writeBigInt64BE(value, offset)` | - | offset | 写入 64 位大端大整数 (v12+) |
| `writeBigInt64LE(value, offset)` | - | offset | 写入 64 位小端大整数 (v12+) |
| `writeFloatBE(value, offset)` | - | offset | 写入 32 位大端浮点数 |
| `writeFloatLE(value, offset)` | - | offset | 写入 32 位小端浮点数 |
| `writeDoubleBE(value, offset)` | - | offset | 写入 64 位大端双精度数 |
| `writeDoubleLE(value, offset)` | - | offset | 写入 64 位小端双精度数 |
| `fill(value, offset?, end?, encoding?)` | - | this | 填充 Buffer |

#### 读取方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `toString(encoding?, start?, end?)` | - | String | 转换为字符串 |
| `toJSON()` | - | Object | 转换为 JSON |
| `readInt8(offset)` | - | Number | 读取 8 位整数 |
| `readUInt8(offset)` | - | Number | 读取 8 位无符号整数 |
| `readInt16BE(offset)` | - | Number | 读取 16 位大端整数 |
| `readInt16LE(offset)` | - | Number | 读取 16 位小端整数 |
| `readUInt16BE(offset)` | - | Number | 读取 16 位大端无符号整数 |
| `readUInt16LE(offset)` | - | Number | 读取 16 位小端无符号整数 |
| `readInt32BE(offset)` | - | Number | 读取 32 位大端整数 |
| `readInt32LE(offset)` | - | Number | 读取 32 位小端整数 |
| `readUInt32BE(offset)` | - | Number | 读取 32 位大端无符号整数 |
| `readUInt32LE(offset)` | - | Number | 读取 32 位小端无符号整数 |
| `readBigInt64BE(offset)` | - | BigInt | 读取 64 位大端大整数 (v12+) |
| `readBigInt64LE(offset)` | - | BigInt | 读取 64 位小端大整数 (v12+) |
| `readFloatBE(offset)` | - | Number | 读取 32 位大端浮点数 |
| `readFloatLE(offset)` | - | Number | 读取 32 位小端浮点数 |
| `readDoubleBE(offset)` | - | Number | 读取 64 位大端双精度数 |
| `readDoubleLE(offset)` | - | Number | 读取 64 位小端双精度数 |

#### 操作方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `slice(start?, end?)` | Buffer | 返回视图 (共享内存;官方已标注废弃别名,推荐 `subarray`) |
| `subarray(start?, end?)` | Buffer | 返回共享内存的视图 (v3.4.0+,推荐) |
| `copy(target, targetStart?, sourceStart?, sourceEnd?)` | Number | 复制到目标 Buffer |
| `equals(otherBuffer)` | Boolean | 判断是否相等 |
| `compare(otherBuffer)` | Number | 比较两个 Buffer |
| `indexOf(value, byteOffset?, encoding?)` | Number | 查找子串位置 |
| `lastIndexOf(value, byteOffset?, encoding?)` | Number | 从后查找子串位置 |
| `includes(value, byteOffset?, encoding?)` | Boolean | 判断是否包含 |
| `swap16()` | Buffer | 交换 16 位字节序 |
| `swap32()` | Buffer | 交换 32 位字节序 |
| `swap64()` | Buffer | 交换 64 位字节序 |
| `at(index)` | Number? | 获取指定位置字节 (v16+) |

#### 迭代方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `entries()` | Iterator | 返回 [index, byte] 迭代器 |
| `keys()` | Iterator | 返回索引迭代器 |
| `values()` | Iterator | 返回值迭代器 |
| `[Symbol.iterator]()` | Iterator | 默认迭代器 (同 values) |

## 总结

Buffer 是 Node.js 处理二进制数据的核心模块,掌握其使用对于构建高性能应用至关重要:

### 核心要点

1. **内存管理**: 理解 Buffer 的内存池机制,合理选择创建方式
2. **编码处理**: 熟悉各种字符编码,正确处理多字节字符
3. **性能优化**: 使用流式处理、复用 Buffer、避免不必要的拷贝
4. **安全实践**: 及时清理敏感数据、验证输入、防止时序攻击

### 应用场景

- 文件 I/O: 读写二进制文件、图片处理
- 网络传输: TCP/UDP 数据包、HTTP 请求体、WebSocket 消息
- 加密解密: 哈希计算、签名验证、数据加密
- 二进制协议: 自定义协议解析、数据序列化
- 压缩解压: Gzip/Deflate 处理
- 图像处理: 像素操作、格式转换

### 学习建议

1. 从基础的创建和读写开始,逐步掌握各种数值操作方法
2. 理解字节序(大端/小端)的概念,在跨平台开发中尤为重要
3. 实践流式处理,避免内存溢出问题
4. 多参考 Node.js 官方文档和源码实现

Buffer 与 Stream、Net、Crypto、Zlib 等模块紧密配合,共同构成 Node.js 高性能 I/O 系统的基础。深入理解 Buffer,将帮助你编写更高效、更可靠的 Node.js 应用程序。
