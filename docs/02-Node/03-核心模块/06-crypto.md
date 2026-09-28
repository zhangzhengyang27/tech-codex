---
title: crypto 加密模块
description: crypto 模块的哈希、HMAC、对称/非对称加密、签名与密钥派生，含 WebCrypto 互操作
keywords: [Node.js, crypto, 加密]
category: Node.js
tags: [Node.js, 核心模块]
---







# crypto 加密模块

## 模块概述

`crypto` 模块是 Node.js 内置的密码学库，提供随机数、哈希、HMAC、对称加密、非对称加密、签名验证、密钥派生等能力，可用于保护数据安全、实现认证与完整性校验。自 Node.js v15 起还提供 Web Crypto API（`crypto.webcrypto`）。

```javascript
const crypto = require("crypto")
```

> **注意**：`crypto` 模块依赖于底层 OpenSSL 库。某些算法的可用性取决于系统安装的 OpenSSL 版本。可以通过 `crypto.getHashes()`、`crypto.getCiphers()` 查看支持的算法列表。

## 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                        crypto 模块架构                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  随机数生成  │  │  哈希摘要   │  │      消息认证码         │  │
│  │ randomBytes │  │ createHash  │  │      createHmac         │  │
│  │ randomInt   │  │             │  │                         │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                      对称加密体系                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │ createCipher │  │ createDecipher│  │   密钥派生   │    │   │
│  │  │      iv      │  │       iv     │  │  pbkdf2      │    │   │
│  │  └──────────────┘  └──────────────┘  │  scrypt      │    │   │
│  │                                      └──────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    非对称加密体系                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │generateKeyPair│  │  数字签名   │  │ 密钥交换     │    │   │
│  │  │              │  │ createSign  │  │ DH / ECDH    │    │   │
│  │  └──────────────┘  │ createVerify│  └──────────────┘    │   │
│  │                    └──────────────┘                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Web Crypto API                         │   │
│  │              crypto.webcrypto (SubtleCrypto)              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 核心功能模块

### 功能速览表

| 能力 | 对应 API | 典型用途 | 安全等级 |
| --- | --- | --- | --- |
| 随机数生成 | `randomBytes()`、`randomInt()` | 生成 token、IV、salt | ⭐⭐⭐⭐⭐ |
| 哈希摘要 | `createHash()` | 校验完整性、生成指纹 | ⭐⭐⭐ |
| 消息认证码（HMAC） | `createHmac()` | 带密钥的摘要 / 请求签名 | ⭐⭐⭐⭐ |
| 对称加解密 | `createCipheriv()` / `createDecipheriv()` | 加密小块数据、文件流 | ⭐⭐⭐⭐⭐ |
| 非对称密钥生成、签名、验签 | `generateKeyPair()`、`createSign()` 等 | 数字签名、密钥交换 | ⭐⭐⭐⭐⭐ |
| 密钥派生 | `pbkdf2()`、`scrypt()` | 从密码派生密钥 | ⭐⭐⭐⭐⭐ |
| 密钥包装、EC Diffie-Hellman | `createSecretKey()`、`createECDH()` | 安全传输对称密钥 | ⭐⭐⭐⭐⭐ |
| Web Crypto API | `crypto.webcrypto` | 与浏览器统一的现代接口 | ⭐⭐⭐⭐⭐ |

---

## 一、随机数与盐值

### 1.1 randomBytes - 安全随机字节

`crypto.randomBytes(size[, callback])` 返回安全伪随机字节序列，可用于生成 token、密钥、盐值。

**参数说明**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| size | number | 是 | 生成的字节数 |
| callback | function | 否 | 异步回调函数 (err, buf) |

**返回值**：`Buffer` 对象（同步）或通过回调返回（异步）

**使用示例**：

```javascript
const crypto = require("crypto")

// 同步生成 16 字节随机盐值
const salt = crypto.randomBytes(16).toString("hex")
console.log("随机盐:", salt) // 输出 32 位十六进制字符串

// 异步生成访问令牌
crypto.randomBytes(32, (err, buf) => {
  if (err) throw err
  console.log("访问令牌:", buf.toString("base64"))
})

// Promise 风格（Node.js 15+）
const { promisify } = require("util")
const randomBytes = promisify(crypto.randomBytes)

async function generateToken() {
  const buf = await randomBytes(32)
  return buf.toString("base64url") // URL 安全的 Base64
}
```

**应用场景**：
- 生成密码盐值（salt）
- 生成会话令牌（session token）
- 生成初始化向量（IV）
- 生成 API 密钥

### 1.2 randomInt - 安全随机整数

`crypto.randomInt([min, ]max[, callback])` 生成均匀分布的整数，包含 `min` 不包含 `max`。

**参数说明**：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| min | number | 否 | 最小值（默认为 0） |
| max | number | 是 | 最大值（不包含） |
| callback | function | 否 | 异步回调函数 |

**使用示例**：

```javascript
const crypto = require("crypto")

// 生成六位验证码
const otp = crypto.randomInt(100000, 1000000)
console.log("六位随机验证码:", otp)

// 生成随机索引
const items = ["a", "b", "c", "d", "e"]
const randomIndex = crypto.randomInt(0, items.length)
console.log("随机选择:", items[randomIndex])

// 异步生成
crypto.randomInt(1, 100, (err, n) => {
  if (err) throw err
  console.log("随机数:", n)
})
```

### 1.3 randomUUID - UUID 生成

`crypto.randomUUID([options])` 生成符合 RFC 4122 标准的 UUID v4。

```javascript
const crypto = require("crypto")

// 生成标准 UUID
const uuid = crypto.randomUUID()
console.log("UUID:", uuid) // 例如: '36b8f84d-df4e-4d49-b662-bcde71a8764f'

// 生成不带连字符的 UUID
const uuidNoDash = crypto.randomUUID({ disableEntropyCache: true })
console.log("UUID (无连字符):", uuidNoDash.replace(/-/g, ""))
```

---

## 二、哈希摘要 `createHash`

哈希函数将任意长度的数据映射为固定长度的摘要值，具有单向性和雪崩效应。

### 2.1 支持的算法

| 算法 | 摘要长度 | 安全性 | 推荐场景 |
| --- | --- | --- | --- |
| SHA-256 | 256 bit | ⭐⭐⭐⭐⭐ | 密码学应用、数字签名 |
| SHA-384 | 384 bit | ⭐⭐⭐⭐⭐ | 高安全需求场景 |
| SHA-512 | 512 bit | ⭐⭐⭐⭐⭐ | 高安全需求场景 |
| SHA-3 | 可变 | ⭐⭐⭐⭐⭐ | 新一代哈希标准 |
| BLAKE2b | 可变 | ⭐⭐⭐⭐⭐ | 高性能场景 |
| MD5 | 128 bit | ⭐ | 仅用于非安全场景（如校验和） |
| SHA-1 | 160 bit | ⭐⭐ | 已不推荐使用 |

```javascript
// 查看支持的哈希算法
console.log(crypto.getHashes())
```

### 2.2 基本用法

```javascript
const crypto = require("crypto")

// 计算字符串的哈希值
function hashString(data, algorithm = "sha256") {
  return crypto.createHash(algorithm).update(data).digest("hex")
}

const message = "hello world"
console.log("SHA-256:", hashString(message))
console.log("SHA-512:", hashString(message, "sha512"))

// 计算文件的哈希值
function hashFile(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex")
}

const data = Buffer.from("hello stream")
console.log("文件摘要:", hashFile(data))
```

### 2.3 流式哈希处理

对于大文件，应使用流式处理避免内存溢出：

```javascript
const fs = require("fs")
const crypto = require("crypto")
const { pipeline } = require("stream/promises")

// 方式一：事件监听
function hashLargeFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256")
    const stream = fs.createReadStream(filePath)

    stream.on("data", (chunk) => hash.update(chunk))
    stream.on("end", () => resolve(hash.digest("hex")))
    stream.on("error", reject)
  })
}

// 方式二：使用 pipeline（推荐）
async function hashLargeFileV2(filePath) {
  const hash = crypto.createHash("sha256")
  await pipeline(fs.createReadStream(filePath), hash)
  return hash.digest("hex")
}

// 使用示例
hashLargeFileV2("./large.bin").then((digest) => {
  console.log("文件 SHA-256:", digest)
})
```

### 2.4 实际应用示例

```javascript
// 文件完整性校验
async function verifyFileIntegrity(filePath, expectedHash) {
  const actualHash = await hashLargeFileV2(filePath)
  return actualHash === expectedHash
}

// 密码存储（应使用加盐哈希，此处仅为演示）
function storePassword(password) {
  const salt = crypto.randomBytes(16).toString("hex")
  const hash = crypto.createHash("sha256").update(password + salt).digest("hex")
  return { salt, hash }
}

function verifyPassword(password, salt, storedHash) {
  const hash = crypto.createHash("sha256").update(password + salt).digest("hex")
  return hash === storedHash
}
```

---

## 三、HMAC 消息认证码

HMAC（Hash-based Message Authentication Code）将密钥与消息结合生成摘要，适合 API 请求签名、消息认证等场景。

### 3.1 工作原理

```
HMAC(K, M) = H((K ⊕ opad) || H((K ⊕ ipad) || M))

其中：
- K: 密钥
- M: 消息
- H: 哈希函数（如 SHA-256）
- opad: 外部填充 (0x5c...)
- ipad: 内部填充 (0x36...)
```

### 3.2 基本用法

```javascript
const crypto = require("crypto")

const secret = "shared-secret-key"
const payload = JSON.stringify({ id: 1, role: "admin", timestamp: Date.now() })

// 生成 HMAC 签名
const signature = crypto
  .createHmac("sha256", secret)
  .update(payload)
  .digest("hex")

console.log("HMAC 签名:", signature)
```

### 3.3 API 请求签名

```javascript
const crypto = require("crypto")

class APIAuth {
  constructor(secretKey) {
    this.secretKey = secretKey
  }

  // 生成签名
  sign(method, path, body = "") {
    const timestamp = Date.now().toString()
    const content = `${method}\n${path}\n${timestamp}\n${body}`

    const signature = crypto.createHmac("sha256", this.secretKey).update(content).digest("hex")

    return {
      timestamp,
      signature,
    }
  }

  // 验证签名
  verify(method, path, body, timestamp, signature, tolerance = 300000) {
    // 检查时间戳是否在容忍范围内（默认 5 分钟）
    if (Math.abs(Date.now() - parseInt(timestamp)) > tolerance) {
      return false
    }

    const expected = this.sign(method, path, body)
    try {
      // timingSafeEqual 要求两个 Buffer 长度相同,长度不同会抛出异常
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected.signature))
    } catch {
      return false
    }
  }
}

// 使用示例
const auth = new APIAuth("my-secret-key")

// 客户端签名
const { timestamp, signature } = auth.sign("POST", "/api/users", '{"name":"John"}')
console.log("请求签名:", { timestamp, signature })

// 服务端验证
const isValid = auth.verify("POST", "/api/users", '{"name":"John"}', timestamp, signature)
console.log("签名验证:", isValid)
```

### 3.4 时间安全比较

使用 `crypto.timingSafeEqual()` 防止时序攻击：

```javascript
const crypto = require("crypto")

// 危险：普通比较可能遭受时序攻击
function unsafeCompare(a, b) {
  return a === b // 不安全！
}

// 安全：常量时间比较
function safeCompare(a, b) {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))
  } catch {
    return false
  }
}

// 使用示例
const request = { headers: { authorization: "expected-secret-token" } } // HTTP 请求对象（示意）
const userToken = request.headers.authorization
const expectedToken = "expected-secret-token"

if (safeCompare(userToken, expectedToken)) {
  // 验证通过
}
```

---

## 四、对称加密

对称加密使用相同密钥进行加密和解密，适合加密大块数据、文件等场景。

### 4.1 算法选择

| 算法模式 | 密钥长度 | 特点 | 推荐场景 |
| --- | --- | --- | --- |
| AES-256-GCM | 256 bit | 认证加密，内置完整性校验 | **首选**，通用场景 |
| AES-128-GCM | 128 bit | 认证加密，性能更好 | 性能敏感场景 |
| ChaCha20-Poly1305 | 256 bit | 软件实现高效 | 移动设备、无 AES 加速 |
| AES-256-CBC | 256 bit | 传统模式，需额外 MAC | 兼容旧系统 |
| AES-256-CTR | 256 bit | 流式加密 | 大文件流式处理 |

```javascript
// 查看支持的加密算法
console.log(crypto.getCiphers())
```

### 4.2 AES-GCM 加密（推荐）

GCM（Galois/Counter Mode）是认证加密模式，同时提供机密性和完整性保证。

```javascript
const crypto = require("crypto")

/**
 * AES-256-GCM 加密
 * @param {string|Buffer} plaintext - 明文
 * @param {Buffer} key - 32 字节密钥
 * @returns {Object} - { iv, encrypted, authTag }
 */
function encrypt(plaintext, key) {
  // GCM 推荐 12 字节 IV
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])

  // 获取认证标签（用于完整性校验）
  const authTag = cipher.getAuthTag()

  return { iv, encrypted, authTag }
}

/**
 * AES-256-GCM 解密
 * @param {Object} sealed - { iv, encrypted, authTag }
 * @param {Buffer} key - 32 字节密钥
 * @returns {string} - 明文
 */
function decrypt({ iv, encrypted, authTag }, key) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)

  // 设置认证标签（必须在解密前调用）
  decipher.setAuthTag(authTag)

  try {
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])
    return decrypted.toString("utf8")
  } catch (err) {
    throw new Error("解密失败：数据可能已被篡改或密钥错误")
  }
}

// 使用示例
const key = crypto.randomBytes(32) // 256-bit 密钥

const plaintext = "敏感信息：用户密码和身份证号"
const sealed = encrypt(plaintext, key)

console.log("密文:", sealed.encrypted.toString("base64"))
console.log("IV:", sealed.iv.toString("hex"))
console.log("AuthTag:", sealed.authTag.toString("hex"))

const decrypted = decrypt(sealed, key)
console.log("解密后:", decrypted)
```

### 4.3 完整的加密工具类

```javascript
const crypto = require("crypto")

class SymmetricCrypto {
  /**
   * 生成随机密钥
   * @param {number} bits - 密钥位数（128, 192, 256）
   */
  static generateKey(bits = 256) {
    return crypto.randomBytes(bits / 8)
  }

  /**
   * 加密数据
   */
  static encrypt(plaintext, key, algorithm = "aes-256-gcm") {
    const iv = crypto.randomBytes(12)

    let cipher
    let authTag = null

    if (algorithm.endsWith("-gcm")) {
      cipher = crypto.createCipheriv(algorithm, key, iv)
      const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
      authTag = cipher.getAuthTag()

      return {
        iv: iv.toString("base64"),
        data: encrypted.toString("base64"),
        authTag: authTag.toString("base64"),
        algorithm,
      }
    } else {
      cipher = crypto.createCipheriv(algorithm, key, iv)
      const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])

      return {
        iv: iv.toString("base64"),
        data: encrypted.toString("base64"),
        algorithm,
      }
    }
  }

  /**
   * 解密数据
   */
  static decrypt(encrypted, key) {
    const iv = Buffer.from(encrypted.iv, "base64")
    const data = Buffer.from(encrypted.data, "base64")

    const decipher = crypto.createDecipheriv(encrypted.algorithm, key, iv)

    if (encrypted.authTag) {
      decipher.setAuthTag(Buffer.from(encrypted.authTag, "base64"))
    }

    try {
      const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
      return decrypted.toString("utf8")
    } catch (err) {
      throw new Error("解密失败：" + err.message)
    }
  }

  /**
   * 序列化加密结果（用于存储或传输）
   */
  static serialize(encrypted) {
    return JSON.stringify(encrypted)
  }

  /**
   * 反序列化
   */
  static deserialize(str) {
    return JSON.parse(str)
  }
}

// 使用示例
const key = SymmetricCrypto.generateKey(256)

const original = "这是需要加密的敏感数据"
const encrypted = SymmetricCrypto.encrypt(original, key)

console.log("加密结果:", encrypted)

const decrypted = SymmetricCrypto.decrypt(encrypted, key)
console.log("解密结果:", decrypted)

// 存储格式
const stored = SymmetricCrypto.serialize(encrypted)
console.log("存储格式:", stored)
```

### 4.4 流式加密/解密

处理大文件时，使用流式加密避免内存溢出：

```javascript
const fs = require("fs")
const crypto = require("crypto")
const { pipeline } = require("stream/promises")

/**
 * 流式文件加密
 */
async function encryptFile(inputPath, outputPath, key, algorithm = "aes-256-ctr") {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(algorithm, key, iv)

  // 将 IV 写入文件开头
  const writeStream = fs.createWriteStream(outputPath)
  writeStream.write(iv)

  await pipeline(fs.createReadStream(inputPath), cipher, writeStream, { end: false })

  writeStream.end()

  return { algorithm }
}

/**
 * 流式文件解密
 */
async function decryptFile(inputPath, outputPath, key, algorithm = "aes-256-ctr") {
  const readStream = fs.createReadStream(inputPath, { start: 0, end: 15 })
  const iv = await new Promise((resolve) => {
    const chunks = []
    readStream.on("data", (chunk) => chunks.push(chunk))
    readStream.on("end", () => resolve(Buffer.concat(chunks)))
  })

  const decipher = crypto.createDecipheriv(algorithm, key, iv)

  await pipeline(
    fs.createReadStream(inputPath, { start: 16 }), // 跳过 IV
    decipher,
    fs.createWriteStream(outputPath)
  )
}

// 使用示例
const key = crypto.randomBytes(32)

;(async () => {
  await encryptFile("./input.txt", "./output.enc", key)
  console.log("加密完成")

  await decryptFile("./output.enc", "./output.txt", key)
  console.log("解密完成")
})()
```

---

## 五、非对称加密与签名

非对称加密使用公钥和私钥对，公钥加密、私钥解密（加密），或私钥签名、公钥验签（签名）。

### 5.1 密钥类型对比

| 类型 | 用途 | 推荐算法 | 密钥长度 |
| --- | --- | --- | --- |
| RSA | 加密、签名 | RSA-PSS（签名）、RSA-OAEP（加密） | 2048+ bit |
| ECDSA | 数字签名 | P-256、P-384、secp256k1 | 256+ bit |
| EdDSA | 数字签名 | Ed25519（推荐） | 256 bit |
| ECDH | 密钥交换 | X25519（推荐）、P-256 | 256 bit |

### 5.2 生成密钥对

#### RSA 密钥对

```javascript
const { generateKeyPairSync, generateKeyPair } = require("crypto")

// 同步生成 RSA 密钥对
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: {
    type: "spki",
    format: "pem",
  },
  privateKeyEncoding: {
    type: "pkcs8",
    format: "pem",
    // cipher: 'aes-256-cbc',
    // passphrase: 'top-secret'
  },
})

console.log("公钥:\n", publicKey)
console.log("私钥:\n", privateKey)

// 异步生成
generateKeyPair(
  "rsa",
  {
    modulusLength: 4096,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  },
  (err, publicKey, privateKey) => {
    if (err) throw err
    console.log("异步生成完成")
  }
)
```

#### Ed25519 密钥对（推荐用于签名）

```javascript
const { generateKeyPairSync } = require("crypto")

const { publicKey, privateKey } = generateKeyPairSync("ed25519", {
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
})

console.log("Ed25519 公钥:\n", publicKey)
```

### 5.3 数字签名与验签

数字签名保证消息的**真实性**（来源可信）和**不可否认性**（发送方无法抵赖）。

```javascript
const crypto = require("crypto")

/**
 * 私钥签名
 */
function sign(data, privateKey, algorithm = "sha256") {
  const signer = crypto.createSign(algorithm)
  signer.update(data)
  signer.end()

  return signer.sign(privateKey, "base64")
}

/**
 * 公钥验签
 */
function verify(data, signature, publicKey, algorithm = "sha256") {
  const verifier = crypto.createVerify(algorithm)
  verifier.update(data)
  verifier.end()

  return verifier.verify(publicKey, signature, "base64")
}

// 使用示例
const data = "重要消息：转账 10000 元"

// 签名
const signature = sign(data, privateKey)
console.log("数字签名:", signature)

// 验签
const isValid = verify(data, signature, publicKey)
console.log("验签结果:", isValid)

// 数据被篡改后的验签
const tamperedData = "重要消息：转账 100 元"
const isValid2 = verify(tamperedData, signature, publicKey)
console.log("篡改后验签:", isValid2) // false
```

### 5.4 RSA 加密/解密

RSA 用于加密小块数据（如对称密钥），加密数据长度不能超过密钥长度。

```javascript
const crypto = require("crypto")

/**
 * 公钥加密
 */
function publicKeyEncrypt(data, publicKey) {
  const buffer = Buffer.from(data, "utf8")
  return crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    buffer
  )
}

/**
 * 私钥解密
 */
function privateKeyDecrypt(encrypted, privateKey) {
  const buffer = Buffer.from(encrypted)
  return crypto
    .privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      buffer
    )
    .toString("utf8")
}

// 使用示例
const symmetricKey = crypto.randomBytes(32) // 生成对称密钥

// 用公钥加密对称密钥
const encryptedKey = publicKeyEncrypt(symmetricKey, publicKey)
console.log("加密后的密钥:", encryptedKey.toString("base64"))

// 用私钥解密
const decryptedKey = privateKeyDecrypt(encryptedKey, privateKey)
console.log("解密后的密钥:", decryptedKey)
```

### 5.5 混合加密方案

结合对称加密（高效）和非对称加密（安全密钥交换）的优势：

```javascript
const crypto = require("crypto")

/**
 * 混合加密：用对称密钥加密数据，用公钥加密对称密钥
 */
function hybridEncrypt(plaintext, publicKey) {
  // 1. 生成随机对称密钥
  const sessionKey = crypto.randomBytes(32)

  // 2. 用对称密钥加密数据
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", sessionKey, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  // 3. 用公钥加密对称密钥
  const encryptedKey = crypto.publicEncrypt(
    {
      key: publicKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    sessionKey
  )

  return {
    encryptedKey: encryptedKey.toString("base64"),
    iv: iv.toString("base64"),
    encrypted: encrypted.toString("base64"),
    authTag: authTag.toString("base64"),
  }
}

/**
 * 混合解密：用私钥解密对称密钥，再用对称密钥解密数据
 */
function hybridDecrypt(encrypted, privateKey) {
  // 1. 用私钥解密对称密钥
  const sessionKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encrypted.encryptedKey, "base64")
  )

  // 2. 用对称密钥解密数据
  const iv = Buffer.from(encrypted.iv, "base64")
  const data = Buffer.from(encrypted.encrypted, "base64")
  const authTag = Buffer.from(encrypted.authTag, "base64")

  const decipher = crypto.createDecipheriv("aes-256-gcm", sessionKey, iv)
  decipher.setAuthTag(authTag)

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])

  return decrypted.toString("utf8")
}

// 使用示例
const data = "这是一条需要加密传输的敏感消息"

const encrypted = hybridEncrypt(data, publicKey)
console.log("加密结果:", encrypted)

const decrypted = hybridDecrypt(encrypted, privateKey)
console.log("解密结果:", decrypted)
```

---

## 六、密钥派生

从密码等低熵输入派生高熵密钥，用于密码存储、密钥生成等场景。

### 6.1 算法对比

| 算法 | 特点 | 推荐场景 | 安全性 |
| --- | --- | --- | --- |
| PBKDF2 | 广泛支持，可调节迭代次数 | 密码存储、兼容旧系统 | ⭐⭐⭐⭐ |
| scrypt | 内存困难，抗 GPU/ASIC 攻击 | 高安全需求 | ⭐⭐⭐⭐⭐ |
| Argon2 | 抗侧信道攻击，可调节内存/时间 | 密码哈希竞赛冠军 | ⭐⭐⭐⭐⭐ |

### 6.2 PBKDF2

```javascript
const crypto = require("crypto")

/**
 * 使用 PBKDF2 派生密钥
 * @param {string} password - 密码
 * @param {Buffer|string} salt - 盐值
 * @param {number} iterations - 迭代次数（推荐 310000+）
 * @param {number} keyLength - 输出密钥长度（字节）
 * @param {string} digest - 哈希算法
 */
function deriveKeyPBKDF2(password, salt, iterations = 310000, keyLength = 32, digest = "sha256") {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, keyLength, digest, (err, derivedKey) => {
      if (err) return reject(err)
      resolve(derivedKey)
    })
  })
}

// 使用示例
;(async () => {
  const password = "user-password-123"
  const salt = crypto.randomBytes(16)

  const derivedKey = await deriveKeyPBKDF2(password, salt)
  console.log("派生密钥:", derivedKey.toString("hex"))
})()
```

### 6.3 scrypt

```javascript
const crypto = require("crypto")

/**
 * 使用 scrypt 派生密钥
 * @param {string} password - 密码
 * @param {Buffer|string} salt - 盐值
 * @param {number} keyLength - 输出密钥长度
 * @param {Object} options - 参数配置
 */
function deriveKeyScrypt(password, salt, keyLength = 32, options = {}) {
  const defaultOptions = {
    N: 16384, // CPU/内存成本因子（必须是 2 的幂）
    r: 8, // 块大小
    p: 1, // 并行化参数
    maxmem: 32 * 1024 * 1024, // 最大内存（字节）
  }

  const opts = { ...defaultOptions, ...options }

  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keyLength, opts, (err, derivedKey) => {
      if (err) return reject(err)
      resolve(derivedKey)
    })
  })
}

// 使用示例
;(async () => {
  const password = "user-password-123"
  const salt = crypto.randomBytes(16)

  const derivedKey = await deriveKeyScrypt(password, salt)
  console.log("scrypt 密钥:", derivedKey.toString("hex"))
})()
```

### 6.4 完整的密码存储方案

```javascript
const crypto = require("crypto")

class PasswordManager {
  constructor() {
    this.algorithm = "scrypt"
    this.keyLength = 64 // 32 字节密钥 + 32 字节用于校验
    this.saltLength = 16
  }

  /**
   * 哈希密码
   */
  async hash(password) {
    const salt = crypto.randomBytes(this.saltLength)

    const derivedKey = await new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, this.keyLength, { N: 16384 }, (err, key) => {
        if (err) reject(err)
        else resolve(key)
      })
    })

    return {
      algorithm: this.algorithm,
      salt: salt.toString("base64"),
      hash: derivedKey.toString("base64"),
      createdAt: Date.now(),
    }
  }

  /**
   * 验证密码
   */
  async verify(password, stored) {
    const salt = Buffer.from(stored.salt, "base64")
    const storedHash = Buffer.from(stored.hash, "base64")

    const derivedKey = await new Promise((resolve, reject) => {
      crypto.scrypt(password, salt, this.keyLength, { N: 16384 }, (err, key) => {
        if (err) reject(err)
        else resolve(key)
      })
    })

    return crypto.timingSafeEqual(derivedKey, storedHash)
  }
}

// 使用示例
;(async () => {
  const pm = new PasswordManager()

  const password = "MySecurePassword123!"

  // 存储密码
  const stored = await pm.hash(password)
  console.log("存储格式:", stored)

  // 验证密码
  const isValid = await pm.verify(password, stored)
  console.log("密码验证:", isValid) // true

  const isInvalid = await pm.verify("wrong-password", stored)
  console.log("错误密码验证:", isInvalid) // false
})()
```

---

## 七、Diffie-Hellman 密钥交换

允许双方在不安全的信道上协商出共享密钥，用于建立安全通信。

### 7.1 传统 DH

```javascript
const crypto = require("crypto")

// Alice 生成密钥对
const alice = crypto.createDiffieHellman(2048)
const aliceKey = alice.generateKeys()

// Bob 使用相同的素数和生成元生成密钥对
const bob = crypto.createDiffieHellman(alice.getPrime(), alice.getGenerator())
const bobKey = bob.generateKeys()

// 双方计算共享密钥
const aliceSecret = alice.computeSecret(bobKey)
const bobSecret = bob.computeSecret(aliceKey)

// 验证密钥一致
console.log("共享密钥一致:", aliceSecret.equals(bobSecret))
```

### 7.2 椭圆曲线 ECDH（推荐）

```javascript
const crypto = require("crypto")

// 支持的曲线：'secp256k1', 'prime256v1' (P-256), 'secp384r1', 'secp521r1'
const curveName = "secp256k1"

// Alice
const alice = crypto.createECDH(curveName)
const alicePublicKey = alice.generateKeys()

// Bob
const bob = crypto.createECDH(curveName)
const bobPublicKey = bob.generateKeys()

// 计算共享密钥
const aliceSharedSecret = alice.computeSecret(bobPublicKey)
const bobSharedSecret = bob.computeSecret(alicePublicKey)

console.log("共享密钥一致:", aliceSharedSecret.equals(bobSharedSecret))
console.log("共享密钥:", aliceSharedSecret.toString("hex"))
```

### 7.3 完整的密钥协商流程

```javascript
const crypto = require("crypto")

class KeyExchange {
  constructor(curve = "prime256v1") {
    this.curve = curve
    this.ecdh = crypto.createECDH(curve)
    this.publicKey = this.ecdh.generateKeys()
  }

  getPublicKey() {
    return this.publicKey.toString("base64")
  }

  computeSharedSecret(otherPublicKeyBase64) {
    const otherPublicKey = Buffer.from(otherPublicKeyBase64, "base64")
    return this.ecdh.computeSecret(otherPublicKey)
  }

  deriveKey(otherPublicKeyBase64, keyLength = 32) {
    const sharedSecret = this.computeSharedSecret(otherPublicKeyBase64)

    // 使用 HKDF 派生密钥（hkdfSync 返回 ArrayBuffer,转 Buffer 便于比较与展示）
    return Buffer.from(crypto.hkdfSync("sha256", sharedSecret, "", "key derivation", keyLength))
  }
}

// 模拟双方密钥协商
const alice = new KeyExchange()
const bob = new KeyExchange()

// 交换公钥
const alicePublicKey = alice.getPublicKey()
const bobPublicKey = bob.getPublicKey()

// 派生相同的加密密钥
const aliceKey = alice.deriveKey(bobPublicKey)
const bobKey = bob.deriveKey(alicePublicKey)

console.log("Alice 密钥:", aliceKey.toString("hex"))
console.log("Bob 密钥:", bobKey.toString("hex"))
console.log("密钥一致:", aliceKey.equals(bobKey))
```

---

## 八、Web Crypto API

Node.js v15+ 提供与浏览器兼容的 Web Crypto API，推荐用于跨平台应用。

### 8.1 基本用法

```javascript
const { subtle, getRandomValues } = require("crypto").webcrypto

async function main() {
  // 生成随机值
  const iv = getRandomValues(new Uint8Array(12))

  // 生成密钥
  const key = await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])

  // 加密
  const encoded = new TextEncoder().encode("hello world")
  const encrypted = await subtle.encrypt({ name: "AES-GCM", iv }, key, encoded)

  // 解密
  const decrypted = await subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted)
  const plaintext = new TextDecoder().decode(decrypted)

  console.log("解密结果:", plaintext)
}

main()
```

### 8.2 完整示例

```javascript
const { subtle, getRandomValues } = require("crypto").webcrypto

class WebCryptoEncryption {
  /**
   * 生成 AES 密钥
   */
  static async generateKey() {
    return await subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
  }

  /**
   * 导出密钥为 Base64
   */
  static async exportKey(key) {
    const exported = await subtle.exportKey("raw", key)
    return Buffer.from(exported).toString("base64")
  }

  /**
   * 从 Base64 导入密钥
   */
  static async importKey(base64Key) {
    const keyData = Buffer.from(base64Key, "base64")
    return await subtle.importKey("raw", keyData, { name: "AES-GCM" }, true, ["encrypt", "decrypt"])
  }

  /**
   * 加密
   */
  static async encrypt(plaintext, key) {
    const iv = getRandomValues(new Uint8Array(12))
    const encoded = new TextEncoder().encode(plaintext)

    const encrypted = await subtle.encrypt({ name: "AES-GCM", iv }, key, encoded)

    return {
      iv: Buffer.from(iv).toString("base64"),
      data: Buffer.from(encrypted).toString("base64"),
    }
  }

  /**
   * 解密
   */
  static async decrypt(encrypted, key) {
    const iv = Buffer.from(encrypted.iv, "base64")
    const data = Buffer.from(encrypted.data, "base64")

    const decrypted = await subtle.decrypt({ name: "AES-GCM", iv }, key, data)

    return new TextDecoder().decode(decrypted)
  }
}

// 使用示例
;(async () => {
  const key = await WebCryptoEncryption.generateKey()
  const keyBase64 = await WebCryptoEncryption.exportKey(key)

  console.log("密钥:", keyBase64)

  const plaintext = "使用 Web Crypto API 加密的数据"
  const encrypted = await WebCryptoEncryption.encrypt(plaintext, key)

  console.log("加密结果:", encrypted)

  const decrypted = await WebCryptoEncryption.decrypt(encrypted, key)
  console.log("解密结果:", decrypted)

  // 密钥导入导出
  const importedKey = await WebCryptoEncryption.importKey(keyBase64)
  const decrypted2 = await WebCryptoEncryption.decrypt(encrypted, importedKey)
  console.log("使用导入的密钥解密:", decrypted2)
})()
```

### 8.3 与浏览器兼容的密钥对

```javascript
const { subtle } = require("crypto").webcrypto

async function main() {
  // 生成 RSA 密钥对
  const rsaKeyPair = await subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  )

  // 生成 ECDSA 密钥对
  const ecdsaKeyPair = await subtle.generateKey(
    {
      name: "ECDSA",
      namedCurve: "P-256",
    },
    true,
    ["sign", "verify"]
  )

  // 导出为 JWK 格式
  const publicKeyJwk = await subtle.exportKey("jwk", rsaKeyPair.publicKey)
  console.log("公钥 JWK:", publicKeyJwk)
}

main()
```

---

## 九、证书与 X.509

### 9.1 证书操作

```javascript
const crypto = require("crypto")
const fs = require("fs")

// 解析 X.509 证书
const certPem = fs.readFileSync("./certificate.pem", "utf8")
const cert = new crypto.X509Certificate(certPem)

console.log("主题:", cert.subject)
console.log("颁发者:", cert.issuer)
console.log("有效期开始:", cert.validFrom)
console.log("有效期结束:", cert.validTo)
console.log("序列号:", cert.serialNumber)
console.log("指纹:", cert.fingerprint)

// 验证证书
const issuerCertPem = fs.readFileSync("./issuer.pem", "utf8")
const issuerCert = new crypto.X509Certificate(issuerCertPem)

console.log("证书有效:", cert.verify(issuerCert.publicKey))
```

---

## 十、最佳实践

### 10.1 算法选择建议

| 场景 | 推荐方案 | 不推荐 |
| --- | --- | --- |
| 对称加密 | AES-256-GCM、ChaCha20-Poly1305 | DES、3DES、RC4 |
| 非对称加密 | RSA-OAEP（2048+ bit） | RSA-PKCS1-v1_5 |
| 数字签名 | Ed25519、RSA-PSS、ECDSA P-256 | DSA、RSA-PKCS1-v1_5 |
| 哈希 | SHA-256、SHA-384、SHA-512、BLAKE2 | MD5、SHA-1 |
| 密码哈希 | scrypt、Argon2 | 明文、MD5、SHA-256 |
| 密钥交换 | X25519、ECDH P-256 | DH（传统） |
| 随机数 | crypto.randomBytes、crypto.randomInt | Math.random |

### 10.2 安全检查清单

- [ ] **密钥管理**
  - 密钥不硬编码在代码中
  - 使用环境变量或密钥管理服务
  - 密钥定期轮换
  - 私钥设置适当的文件权限

- [ ] **加密实施**
  - 使用现代算法（AES-GCM、ChaCha20-Poly1305）
  - 每次加密使用随机 IV
  - 保存并验证认证标签（authTag/MAC）
  - 实现完整性校验机制

- [ ] **随机数生成**
  - 安全场景使用 `crypto.randomBytes` / `crypto.randomInt`
  - 禁止使用 `Math.random`
  - Token、Salt 长度至少 16 字节

- [ ] **错误处理**
  - 捕获加密/解密错误
  - 错误信息不泄露敏感信息
  - 使用常量时间比较防止时序攻击

- [ ] **密钥派生**
  - 使用 `scrypt` 或高迭代次数 `pbkdf2`（310000+）
  - 每个密码使用唯一盐值
  - 存储完整的算法参数

### 10.3 常见错误

```javascript
// ❌ 错误：使用固定 IV
const cipher = crypto.createCipheriv("aes-256-gcm", key, Buffer.alloc(12)) // 不安全！

// ✅ 正确：使用随机 IV
const iv = crypto.randomBytes(12)
const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)

// ❌ 错误：忽略认证标签
const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
// 缺少 decipher.setAuthTag(authTag)

// ✅ 正确：验证认证标签
const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
decipher.setAuthTag(authTag)

// ❌ 错误：直接比较密钥/签名
if (signature === expectedSignature) {
} // 可能遭受时序攻击

// ✅ 正确：常量时间比较
if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
}

// ❌ 错误：使用弱哈希存储密码
const hash = crypto.createHash("md5").update(password).digest("hex")

// ✅ 正确：使用密钥派生函数
const derivedKey = await new Promise((resolve, reject) => {
  crypto.scrypt(password, salt, 64, { N: 16384 }, (err, key) => {
    if (err) reject(err)
    else resolve(key)
  })
})
```

### 10.4 性能优化

```javascript
// 以下为优化要点示意（fs/cipher/keyBuffer 等为上文示例中的对象）
const crypto = require("crypto")

// 1. 复用密钥对象（密钥对象创建开销大）
const keyObject = crypto.createSecretKey(keyBuffer)

// 2. 流式处理大文件
const { pipeline } = require("stream/promises")
await pipeline(fs.createReadStream("large.bin"), cipher, fs.createWriteStream("large.enc"))

// 3. 使用 crypto.constants 代替字符串
crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 })

// 4. 批量操作时并行处理
const hashes = await Promise.all(files.map((file) => hashFile(file)))
```

---

## 十一、常见问题 FAQ

### Q1: 如何选择加密算法？

**A**: 根据场景选择：
- **数据加密**：AES-256-GCM（首选）、ChaCha20-Poly1305
- **密码存储**：scrypt 或 Argon2
- **数字签名**：Ed25519（首选）、RSA-PSS
- **密钥交换**：X25519（首选）、ECDH P-256

### Q2: IV 和 Salt 有什么区别？

| 特性 | IV（初始化向量） | Salt（盐值） |
| --- | --- | --- |
| 用途 | 加密算法输入 | 密钥派生输入 |
| 唯一性要求 | 每次加密必须唯一 | 每个密码唯一即可 |
| 保密性 | 不需要保密 | 不需要保密 |
| 长度 | 由算法决定（AES-GCM: 12 字节） | 推荐 16+ 字节 |

### Q3: 对称加密和非对称加密如何选择？

| 类型 | 优点 | 缺点 | 适用场景 |
| --- | --- | --- | --- |
| 对称加密 | 速度快，适合大数据 | 密钥分发困难 | 数据加密、文件加密 |
| 非对称加密 | 密钥分发安全 | 速度慢，数据量限制 | 密钥交换、数字签名 |

**最佳实践**：使用混合加密 - 非对称加密传输对称密钥，对称加密传输数据。

### Q4: 如何安全存储密钥？

**推荐方案**：
1. **生产环境**：使用密钥管理服务（AWS KMS、Azure Key Vault、HashiCorp Vault）
2. **开发环境**：环境变量 + 文件权限控制
3. **数据库加密密钥**：使用主密钥加密后存储

```javascript
const fs = require("fs")

// 环境变量方式
const key = Buffer.from(process.env.ENCRYPTION_KEY, "base64")

// 文件方式（设置权限）
// chmod 600 key.pem
const keyPem = fs.readFileSync("./private-key.pem", "utf8")
```

### Q5: 如何检测加密是否成功？

```javascript
const crypto = require("crypto")

function testEncryption() {
  const key = crypto.randomBytes(32)
  const plaintext = "测试数据"

  const { iv, encrypted, authTag } = encrypt(plaintext, key)

  // 检查密文是否与明文不同
  console.log("密文长度正确:", encrypted.length > plaintext.length)

  // 检查解密是否成功
  const decrypted = decrypt({ iv, encrypted, authTag }, key)
  console.log("解密成功:", decrypted === plaintext)

  // 检查篡改检测
  try {
    const tampered = Buffer.from(encrypted)
    tampered[0] ^= 0x01 // 翻转一个位
    decrypt({ iv, encrypted: tampered, authTag }, key)
    console.log("篡改检测失败")
  } catch {
    console.log("篡改检测成功")
  }
}
```

### Q6: 为什么推荐 GCM 模式？

GCM（Galois/Counter Mode）优势：
1. **认证加密**：同时提供机密性和完整性保证
2. **高效并行**：支持并行计算，性能优异
3. **内置 MAC**：不需要额外的消息认证码
4. **标准化**：NIST 推荐标准

---

## 十二、API 参考

### 核心方法

| 方法 | 说明 | 返回值 |
| --- | --- | --- |
| `crypto.getHashes()` | 返回支持的哈希算法列表 | string[] |
| `crypto.getCiphers()` | 返回支持的加密算法列表 | string[] |
| `crypto.randomBytes(size)` | 生成安全随机字节 | Buffer |
| `crypto.randomInt(min, max)` | 生成安全随机整数 | number |
| `crypto.randomUUID()` | 生成 UUID v4 | string |
| `crypto.createHash(algorithm)` | 创建哈希对象 | Hash |
| `crypto.createHmac(algorithm, key)` | 创建 HMAC 对象 | Hmac |
| `crypto.createCipheriv(algorithm, key, iv)` | 创建加密对象 | Cipher |
| `crypto.createDecipheriv(algorithm, key, iv)` | 创建解密对象 | Decipher |
| `crypto.createSign(algorithm)` | 创建签名对象 | Sign |
| `crypto.createVerify(algorithm)` | 创建验签对象 | Verify |
| `crypto.generateKeyPair(type, options)` | 生成密钥对 | undefined（结果经回调返回） |
| `crypto.pbkdf2(password, salt, iterations, keylen, digest)` | PBKDF2 密钥派生 | undefined（结果经回调返回） |
| `crypto.scrypt(password, salt, keylen)` | scrypt 密钥派生 | undefined（结果经回调返回） |
| `crypto.timingSafeEqual(a, b)` | 常量时间比较 | boolean |

### Hash 对象方法

| 方法 | 说明 |
| --- | --- |
| `hash.update(data)` | 更新哈希内容 |
| `hash.digest(encoding)` | 计算最终摘要 |
| `hash.copy()` | 复制哈希对象 |

### Cipher 对象方法

| 方法 | 说明 |
| --- | --- |
| `cipher.update(data)` | 加密数据块 |
| `cipher.final()` | 完成加密 |
| `cipher.getAuthTag()` | 获取认证标签（GCM 模式） |
| `cipher.setAAD(buffer)` | 设置附加认证数据 |

### Decipher 对象方法

| 方法 | 说明 |
| --- | --- |
| `decipher.update(data)` | 解密数据块 |
| `decipher.final()` | 完成解密 |
| `decipher.setAuthTag(buffer)` | 设置认证标签（GCM 模式） |
| `decipher.setAAD(buffer)` | 设置附加认证数据 |

---

## 参考资料

- [Node.js crypto 官方文档](https://nodejs.org/api/crypto.html)
- [Web Crypto API 规范](https://www.w3.org/TR/WebCryptoAPI/)
- [OWASP 加密指南](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [NIST 加密标准](https://csrc.nist.gov/publications/detail/sp/800-175b/rev-1/final)

---

## Node.js 22+ crypto 模块新特性

### Web Crypto API 全局可用

Web Crypto API 自 Node.js 19 起全局可用且稳定，v22 中与浏览器 API 完全一致：

```javascript
// 全局 crypto.subtle（无需导入 node:crypto）
const encoder = new TextEncoder()

async function main() {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode('hello'))
  console.log(Buffer.from(hash).toString('hex'))

  // 生成 HMAC
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode('secret-key'),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode('message'))

  // AES-GCM 加密
  const aesKey = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, ['encrypt', 'decrypt']
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey, encoder.encode('secret data')
  )
}

main()
```

### crypto.randomUUID

Node.js 22+ 全局 `crypto.randomUUID()` 无需导入：

```javascript
// 无需 require('crypto')
const id = crypto.randomUUID()
console.log(id) // '550e8400-e29b-41d4-a716-446655440000'
```

### X509 证书链验证增强

```javascript
import { X509Certificate } from 'node:crypto'

// certPem / issuerCert 为 PEM 格式字符串（此处省略文件读取）
const cert = new X509Certificate(certPem)
console.log(cert.subject)        // 证书主题
console.log(cert.issuer)         // 颁发者
console.log(cert.validFrom)      // 有效期开始
console.log(cert.validTo)        // 有效期结束
console.log(cert.fingerprint256) // SHA-256 指纹

// 验证证书链
const isChainValid = cert.checkIssued(issuerCert)
```
