---
title: 手写 DNS 服务：从入门到实践
description: 从 UDP 报文解析到域名递归查询，手写一个最小可用的 DNS 解析服务
keywords: [Node.js, DNS, UDP, Buffer]
category: Node.js
tags: [Node.js, 编译与底层原理]
---

# 手写 DNS 服务：从入门到实践

## 概念说明与项目目标

DNS（Domain Name System）作为互联网的基石，负责将人类易于记忆的域名（如 `juejin.cn`）解析为机器能够识别的 IP 地址。日常 Web 开发频繁地与域名和 IP 地址打交道，但很少深入其背后的域名系统。理解 DNS 的工作原理，不仅有助于排查网络问题，也是网络编程的入门钥匙。

本项目通过 Node.js 从零构建一个功能完备的 DNS 服务器，目标覆盖四个层面：

- **深入理解 DNS 工作原理**：从理论层面剖析 DNS 的分布式架构和查询流程。
- **掌握网络协议的二进制处理**：学习如何使用 `Buffer` 处理和解析 DNS 协议的二进制数据包。
- **提升 Node.js 网络编程能力**：熟练运用 `dgram` 模块进行 UDP 通信，实现一个健壮的网络服务。
- **获得实际应用开发经验**：构建一个可用于域名过滤、访问控制或独立解析系统的自定义 DNS 服务器。

## DNS 原理剖析

### 域名的演进：从 hosts 文件到分布式系统

互联网早期主机数量有限，计算机之间主要通过 IP 地址直接通信。随着网络规模扩大，记忆繁琐的 IP 地址变得不切实际，域名应运而生——它允许使用易于记忆的名称（如 `juejin.cn`）访问网络资源。

最初，域名与 IP 的映射关系记录在一个名为 `hosts` 的本地文件中。每当有新主机加入网络，管理员都需要手动更新 `hosts` 文件，并通过分发确保所有主机获取最新映射。随着主机数量激增，这种集中式管理方式暴露了两个致命缺陷：

1. **单点压力**：所有主机都从同一台服务器同步 `hosts` 文件，导致该服务器负载过高，成为性能瓶颈。
2. **命名冲突**：由于缺乏统一的管理机制，域名数量增多，命名冲突的风险随之增加。

为克服这些挑战，DNS 被设计成一个**分布式、层次化**的系统：域名空间被划分为不同的"域"（如 `.com`、`.org`），每个域下又可以划分次级域（如 `juejin.cn`），有效避免命名冲突；DNS 服务器相应地分散到全球各地，共同承担解析任务，确保系统的可扩展性和可靠性。

### DNS 的查询过程：一次完整的域名解析之旅

在浏览器中输入一个域名后，DNS 解析通常经历以下步骤，这是一个从本地到全球的递归查询过程：

1. **本地 `hosts` 文件查询**：计算机首先检查本地的 `hosts` 文件——一个存储域名与 IP 地址映射关系的本地数据库。若找到对应记录，解析过程就此结束。
2. **本地域名服务器（Local DNS Server）**：若 `hosts` 文件中未找到记录，计算机会向互联网服务提供商（ISP）提供的本地域名服务器发送查询请求。该服务器通常位于所在城市或地区，并缓存了大量域名解析结果，可以快速响应常见域名的查询。
3. **根域名服务器（Root Domain Name Server）**：若本地域名服务器也没有缓存该记录，它将向全球 13 组根域名服务器之一发送请求。根服务器不直接解析域名，而是根据域名的顶级域（如 `.com`）返回对应的顶级域名服务器（TLD Server）的地址。
4. **顶级域名服务器（Top-Level Domain Server）**：本地域名服务器接着向 TLD 服务器发送请求。TLD 服务器负责管理特定类型的顶级域（如 `.com`、`.org`、`.net`），返回负责该二级域（如 `juejin.cn`）的权威域名服务器（Authoritative Name Server）的地址。
5. **权威域名服务器（Authoritative Name Server）**：最后，本地域名服务器向权威域名服务器发送请求，获取该域名对应的最终 IP 地址。权威域名服务器是该域名的"官方"服务器，拥有最准确、最完整的记录。

为了提高效率，每一级查询的结果都会被缓存一段时间，缓存时间由 **TTL（Time-To-Live）** 值控制。通过这种分层查询和缓存机制，DNS 在保证分布式和可扩展性的同时兼顾了查询效率。

理解了 DNS 的工作原理后，即可着手实现自定义 DNS 服务器——通过它可以实现域名过滤、访问控制，甚至构建一个完全独立的域名解析系统。

## DNS 协议解析

DNS 是一个基于 UDP 或 TCP 的应用层协议。由于查询请求通常较小且独立，主要使用 UDP 以获得更高效率。实现 DNS 服务器需要深入理解其二进制协议格式，以便正确解析和构造 DNS 报文。

### DNS 报文结构

DNS 报文由头部（Header）、问题（Question）、回答（Answer）、授权（Authority）和附加信息（Additional）组成，关键字段包括：

- **Transaction ID**：16 位标识符，用于匹配请求和响应。客户端发送请求时生成一个随机 ID，服务器响应时原样返回。
- **Flags**：一组 16 位标志位，用于控制 DNS 查询和响应的行为。其中最重要的标志包括：
  - **QR**（Query/Response）：`0` 表示查询报文，`1` 表示响应报文。
  - **OPCODE**：定义查询类型，`0` 表示标准查询（域名到 IP），`1` 表示反向查询（IP 到域名）。
- **Counts**：四个 16 位字段，分别表示问题、回答、授权和附加信息部分的数量。

### DNS 记录类型

DNS 服务器上存储着域名和 IP 的对应关系，这些记录有多种类型，常见的有：

| 记录类型 | 含义 |
|---------|------|
| **A (Address)** | 将域名解析为 IPv4 地址 |
| **AAAA (IPv6 Address)** | 将域名解析为 IPv6 地址 |
| **CNAME (Canonical Name)** | 将一个域名指向另一个域名（别名） |
| **NS (Name Server)** | 指定负责解析该域名的权威域名服务器 |
| **MX (Mail Exchange)** | 指定负责接收该域名邮件的邮件服务器 |
| **PTR (Pointer)** | 用于反向 DNS 查询，将 IP 地址解析为域名 |

**问题部分**的格式：首先是查询的名字（如 `baidu.com`），然后是查询的类型（即 A、NS、CNAME、PTR 等类型），最后一个查询类一般都是 1，表示 internet 数据。

**回答部分**的格式：

- Name 是查询的域名，Type 是 A、NS、CNAME、PTR 等，Class 与问题部分一样都是 1。
- 接着是 Time to live，即这条解析记录要缓存多长时间——DNS 就是通过它来控制客户端、本地 DNS 服务器的缓存过期时间。
- 最后是数据的长度和内容。

这就是 DNS 协议的格式。知道了如何启动 UDP 服务、知道了接收到的 DNS 协议数据是什么格式，就可以动手实现 DNS 服务器了：解析出问题部分的域名，自行实现解析，并返回对应的响应数据。

## 手写 DNS 服务器

### 1. 项目初始化

创建并初始化项目：

```bash
mkdir my-dns-server
cd my-dns-server
npm init -y
```

这会创建一个名为 `my-dns-server` 的目录，并生成一个默认的 `package.json` 文件。

### 2. 创建 UDP 服务器

在项目根目录下创建 `index.js` 文件，启动一个 UDP 服务器，监听 DNS 默认的 53 端口：

```javascript
const dgram = require("node:dgram")

// 创建一个 UDP socket，用于 DNS 通信
const server = dgram.createSocket("udp4")

// 当接收到 DNS 查询时触发
server.on("message", (msg, rinfo) => {
  console.log(`收到来自 ${rinfo.address}:${rinfo.port} 的查询`)
  // 在这里处理 DNS 查询报文
  console.log(msg)
})

// 当服务器发生错误时触发
server.on("error", (err) => {
  console.error(`服务器异常：
${err.stack}`)
  server.close()
})

// 当服务器开始监听时触发
server.on("listening", () => {
  const address = server.address()
  console.log(`DNS 服务器已启动，正在监听 ${address.address}:${address.port}`)
})

// 绑定到 53 端口
server.bind(53)
```

**代码解析**：

- `dgram.createSocket("udp4")`: 创建一个用于 IPv4 的 UDP socket。
- `server.on("message", ...)`: 监听 `message` 事件，当接收到 UDP 数据包时回调函数被执行。`msg` 是一个包含查询报文的 `Buffer` 对象，`rinfo` 包含客户端的地址信息。
- `server.on("error", ...)`: 监听 `error` 事件，处理可能发生的异常。
- `server.on("listening", ...)`: 监听 `listening` 事件，当服务器成功绑定端口后触发。
- `server.bind(53)`: 将服务器绑定到 53 端口。在类 Unix 系统上，监听 1024 以下的端口需要 `root` 权限，因此需要使用 `sudo` 运行此脚本。

### 3. 解析 DNS 查询

DNS 查询报文的核心是"问题"部分，其中包含了要查询的域名。需要从 `msg` 这个 `Buffer` 对象中解析出域名：

```javascript
server.on("message", (msg, rinfo) => {
  // DNS 报文的前 12 个字节是头部，问题部分从第 13 个字节开始
  const host = parseHost(msg.subarray(12))
  console.log(`查询域名: ${host}`)
})

/**
 * 从 DNS 查询报文的问题部分解析出域名
 * @param {Buffer} msg - DNS 查询报文的问题部分
 * @returns {string} 解析出的域名
 */
function parseHost(msg) {
  let offset = 0
  let host = ""
  while (offset < msg.length) {
    const len = msg.readUInt8(offset)
    if (len === 0) {
      break
    }
    offset += 1
    host += msg.subarray(offset, offset + len).toString()
    offset += len
    if (msg.readUInt8(offset) !== 0) {
      host += "."
    }
  }
  return host
}
```

**域名编码格式**：在 DNS 协议中，域名不是以点（`.`）分隔的字符串存储的，而是采用一种分段编码的格式：`[长度][内容][长度][内容]...[0]`。例如 `www.baidu.com` 会被编码为 `3www5baidu3com0`。

**`parseHost` 函数解析**：

- `msg.readUInt8(offset)`: 读取一个字节，表示当前分段的长度。
- `msg.subarray(offset, offset + len).toString()`: 根据长度截取对应的 `Buffer`，并转换为字符串。
- 循环读取，直到遇到长度为 `0` 的字节，表示域名结束。
- 在分段之间添加点（`.`）来重构域名。

重启服务器后测试，即可成功从 DNS 协议数据中把 query 的域名解析出来。

### 4. 实现请求转发与自定义解析

一个功能完备的 DNS 服务器不仅能转发不认识的域名查询，还应能对特定域名进行自定义解析——这可用于域名过滤、广告拦截或内部服务映射等功能：

```javascript
server.on("message", (msg, rinfo) => {
  const host = parseHost(msg.subarray(12))
  console.log(`查询域名: ${host}`)

  // 如果域名匹配特定规则，则进行自定义解析
  if (/guangguangguang/.test(host)) {
    resolve(msg, rinfo)
  } else {
    // 否则，将请求转发到上游 DNS 服务器
    forward(msg, rinfo)
  }
})

/**
 * 将 DNS 查询转发到上游服务器
 * @param {Buffer} msg - 原始 DNS 查询报文
 * @param {object} rinfo - 客户端地址信息
 */
function forward(msg, rinfo) {
  const client = dgram.createSocket("udp4")

  // 监听上游服务器的响应
  client.on("message", (fbMsg, fbRinfo) => {
    // 将响应报文原样转发给客户端
    server.send(fbMsg, rinfo.port, rinfo.address)
    client.close()
  })

  // 将查询报文发送到上游 DNS 服务器（例如：114.114.114.114）
  client.send(msg, 53, "114.114.114.114", (err) => {
    if (err) {
      console.error(`转发失败: ${err}`)
      client.close()
    }
  })
}

/**
 * 对特定域名进行自定义解析
 * @param {Buffer} msg - 原始 DNS 查询报文
 * @param {object} rinfo - 客户端地址信息
 */
function resolve(msg, rinfo) {
  // 在这里构造一个自定义的 DNS 响应报文
  // ...
}
```

**代码解析**：

- **`forward` 函数**：
  - 创建一个新的 UDP 客户端 `client`，用于与上游 DNS 服务器通信。
  - `client.send(...)`: 将原始的 DNS 查询报文 `msg` 发送到指定的上游 DNS 服务器（这里以 `114.114.114.114` 为例）。
  - `client.on("message", ...)`: 监听上游服务器的响应 `fbMsg`，并使用 `server.send(...)` 将其原样转发给原始的客户端。
- **`resolve` 函数**：实现自定义解析的核心，需要自行构造一个合法的 DNS 响应报文。

使用 `nslookup` 命令查询域名可以验证：查询 `baidu.com` 能拿到对应的 IP 地址，浏览器里可以访问；而 `guangguangguang.ddd.com` 没有查找到对应的 IP。接下来实现 `resolve` 方法，自行构造一个 DNS 协议的消息返回。

### 5. 构造 DNS 响应报文

响应报文沿用 DNS 协议格式：会话 ID 从传过来的 `msg` 取，flags 需要设置，问题数、回答数都是 1，授权数、附加数都是 0；问题区域和回答区域按照对应的格式设置。

构造过程使用 `Buffer.alloc` 创建 buffer 对象，并使用 `buffer.writeUInt16BE` 写入无符号双字节整数。

**大端序（BE）知识**：这里的 BE 是 Big Endian，大端序，即高位字节放在低地址（前面）。大端序的双字节无符号整数 1，两个字节是 `00000000 00000001`；而小端序（LE）则相反，低位字节放在前面，1 就是 `00000001 00000000`。

拼装 DNS 协议消息的完整实现如下（对照协议格式逐段写入）：

```javascript
function copyBuffer(src, offset, dst) {
    for (let i = 0; i < src.length; ++i) {
      dst.writeUInt8(src.readUInt8(i), offset + i)
    }
  }

function resolve(msg, rinfo) {
    const queryInfo = msg.subarray(12)
    const response = Buffer.alloc(28 + queryInfo.length)
    let offset = 0


    // Transaction ID
    const id  = msg.subarray(0, 2)
    copyBuffer(id, 0, response)
    offset += id.length

    // Flags
    response.writeUInt16BE(0x8180, offset)
    offset += 2

    // Questions
    response.writeUInt16BE(1, offset)
    offset += 2

    // Answer RRs
    response.writeUInt16BE(1, offset)
    offset += 2

    // Authority RRs & Additional RRs
    response.writeUInt32BE(0, offset)
    offset += 4
    copyBuffer(queryInfo, offset, response)
    offset += queryInfo.length

     // offset to domain name
    response.writeUInt16BE(0xC00C, offset)
    offset += 2
    const typeAndClass = msg.subarray(msg.length - 4)
    copyBuffer(typeAndClass, offset, response)
    offset += typeAndClass.length

    // TTL, in seconds
    response.writeUInt32BE(600, offset)
    offset += 4

    // Length of IP
    response.writeUInt16BE(4, offset)
    offset += 2

    // Write IP address
    const ip = '11.22.33.44'.split('.').map(str => parseInt(str))
    ip.forEach(num => {
        response.writeUInt8(num, offset)
        offset += 1
    })

    server.send(response, rinfo.port, rinfo.address)
}

```

最后把拼接好的 DNS 协议消息发送给对方，即完成了对 `guangguangguang` 域名的解析——上述代码将其解析到 `11.22.33.44` 这个 IP。用 `nslookup` 测试可以看到对应的域名解析成功。至此，通过 Node.js 实现了 DNS 服务器。

## 测试与验证

完成 DNS 服务器编码后，需要通过一系列测试验证其功能是否正常，包括配置本地环境和使用专业工具测试。

### 1. 修改本地 DNS 设置

将操作系统的 DNS 服务器地址指向本地运行的 DNS 服务器（`127.0.0.1`），这样所有 DNS 查询都会优先发送到该服务器：

- **macOS**: 前往 `系统偏好设置` > `网络` > 选择正在使用的网络连接（如 Wi-Fi） > `高级` > `DNS`，点击左下角的 `+` 号，添加 `127.0.0.1` 作为首选 DNS 服务器。为确保稳定，建议保留原有的 DNS 服务器作为备用。
- **Windows**: 前往 `控制面板` > `网络和 Internet` > `网络和共享中心`，点击当前连接的 `属性` > `Internet 协议版本 4 (TCP/IPv4)` > `属性`，选择 `使用下面的 DNS 服务器地址`，并将首选 DNS 服务器设置为 `127.0.0.1`。

### 2. 使用 `nslookup` 进行验证

`nslookup` 是一个强大的命令行工具，用于查询 DNS 信息。启动 DNS 服务器后，在终端执行以下命令测试服务器的转发和自定义解析功能。

**测试转发功能**：

```bash
nslookup baidu.com
```

如果转发功能正常，将看到 `baidu.com` 的 IP 地址列表；同时服务器控制台会打印出相应的查询日志，表明请求已成功处理。

**测试自定义解析**：

```bash
nslookup guangguangguang.com
```

如果 `resolve` 函数实现正确，`nslookup` 将返回为 `guangguangguang.com` 硬编码的 IP 地址（例如 `11.22.33.44`），证明自定义解析逻辑已生效。

### 3. 浏览器测试

最后可以在浏览器中直接访问网站，验证 DNS 服务器在真实场景下的表现。尝试访问一个常用网站（如 `juejin.cn`），如果页面加载正常，说明 DNS 服务器已成功融入网络请求链路，能够正确处理浏览器的 DNS 查询。

## 常见问题 (FAQ)

**Q1: 启动服务器时，为什么提示 `EACCES` 错误或端口 `53` 被占用？**

**A1:** 53 端口是 DNS 服务的标准端口，在类 Unix 系统（如 macOS、Linux）上，监听 1024 以下的端口需要 `root` 权限，因此需要使用 `sudo` 启动服务器：`sudo node index.js`。如果端口仍被占用，说明系统中可能已存在其他 DNS 服务（如 `dnsmasq` 或其他网络软件），需要先找到并停止该服务，再启动服务器。

**Q2: `nslookup` 查询超时或失败是什么原因？**

**A2:** 这通常由以下几个原因导致：

- **服务器未运行**：确保 DNS 服务器已成功运行在 `127.0.0.1:53`。
- **DNS 设置错误**：确认操作系统的 DNS 设置已正确修改为 `127.0.0.1`。
- **防火墙拦截**：检查系统防火墙或安全软件是否阻止了 UDP 53 端口的通信。
- **网络代理**：某些情况下，网络代理或 VPN 也可能干扰本地 DNS 解析，可尝试暂时禁用。

**Q3: 这个 DNS 服务器可以用于生产环境吗？**

**A3:** 本项目主要用于教学和演示，其性能和健壮性无法与成熟的 DNS 软件（如 BIND、CoreDNS）相比。要在生产环境中使用，至少需要考虑：

- **性能优化**：使用 `cluster` 或 `worker_threads` 模块处理高并发查询，并实现高效的缓存策略。
- **安全性**：增加对 DNS 欺骗、DDoS 攻击等常见网络攻击的防护措施。
- **功能完备性**：完整支持所有常见的 DNS 记录类型和更复杂的查询逻辑。

**Q4: 如何扩展这个 DNS 服务器的功能？**

**A4:** 可以从以下几个方面扩展：

- **支持更多记录类型**：在 `resolve` 函数中实现对 `CNAME`、`MX`、`NS` 等记录的解析和响应构造。
- **动态域名解析**：将硬编码的解析规则改为从配置文件、数据库或 API 读取，实现动态的域名到 IP 的映射。
- **域名黑白名单**：基于自定义规则构建域名过滤系统，用于广告拦截或访问控制。

## 性能优化

虽然实现的 DNS 服务器功能完备，但在高并发场景下性能仍有较大提升空间。以下是几种行之有效的优化策略。

### 1. 利用 `cluster` 模块实现多进程

Node.js 是单线程的，默认只能利用单个 CPU 核心。为充分发挥多核 CPU 的优势，可以使用 `cluster` 模块创建多个工作进程，并将网络请求分发给它们处理，从而显著提升并发处理能力：

```javascript
const cluster = require("cluster")
const os = require("os")

const numCPUs = os.cpus().length

if (cluster.isMaster) {
  console.log(`主进程 ${process.pid} 正在运行`)

  // 根据 CPU 核心数衍生工作进程
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork()
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`工作进程 ${worker.process.pid} 已退出`)
  })
} else {
  // 工作进程共享同一个 UDP 端口
  require("./index.js") // 在这里启动你的 DNS 服务器逻辑
  console.log(`工作进程 ${process.pid} 已启动`)
}
```

**工作原理**：主进程（`isMaster`）不处理任何业务逻辑，只负责创建和管理工作进程。所有工作进程共享同一个 UDP 端口（53），共同处理接收到的 DNS 查询，实现负载均衡。

### 2. 实现 DNS 缓存

每次都向上游 DNS 服务器转发请求会带来不必要的延迟。通过在本地缓存 DNS 解析结果，可以大幅提升对重复查询的响应速度。下面是一个简单的内存缓存实现：

```javascript
const cache = new Map()

function forward(msg, rinfo) {
  const host = parseHost(msg.subarray(12))

  // 1. 检查缓存
  if (cache.has(host)) {
    const cachedResponse = cache.get(host)
    // 注意：需要更新响应报文的 Transaction ID
    // ...
    server.send(cachedResponse, rinfo.port, rinfo.address)
    return
  }

  const client = dgram.createSocket("udp4")

  client.on("message", (fbMsg, fbRinfo) => {
    // 2. 缓存响应
    cache.set(host, fbMsg)
    // 可以为缓存设置过期时间，例如使用 setTimeout

    server.send(fbMsg, rinfo.port, rinfo.address)
    client.close()
  })

  // ...
}
```

**优化建议**：一个更完善的缓存策略应该考虑 TTL（Time-To-Live）——在缓存响应时解析 `fbMsg` 中的 TTL 值，并使用 `setTimeout` 在 TTL 过期后从缓存中移除该条目。

### 3. 优化 Buffer 操作

在高并发场景下，频繁地创建和销毁 `Buffer` 对象会给垃圾回收（GC）带来压力。可以通过预分配和重用 `Buffer` 来优化性能，例如为每个工作进程维护一个 `Buffer` 池，每次需要时从池中获取、使用完毕后归还，而不是直接创建新的 `Buffer`。这会增加代码复杂性，但在极端性能要求下是值得的。

## 完整代码

报文处理入口的 message 监听如下：

```javascript
server.on("message", (msg, rinfo) => {
  const host = parseHost(msg.subarray(12))
  console.log(`query: ${host}`)
})
```

完整可运行的代码如下，可将其跑起来后把电脑的本地 DNS 服务器指向它进行测试：

```javascript
const dgram = require("node:dgram")

const server = dgram.createSocket("udp4")

function parseHost(msg) {
  let num = msg.readUInt8(0)
  let offset = 1
  let host = ""
  while (num !== 0) {
    host += msg.subarray(offset, offset + num).toString()
    offset += num

    num = msg.readUInt8(offset)
    offset += 1

    if (num !== 0) {
      host += "."
    }
  }
  return host
}

function copyBuffer(src, offset, dst) {
  for (let i = 0; i < src.length; ++i) {
    dst.writeUInt8(src.readUInt8(i), offset + i)
  }
}

function resolve(msg, rinfo) {
  const queryInfo = msg.subarray(12)
  const response = Buffer.alloc(28 + queryInfo.length)
  let offset = 0

  // Transaction ID
  const id = msg.subarray(0, 2)
  copyBuffer(id, 0, response)
  offset += id.length

  // Flags
  response.writeUInt16BE(0x8180, offset)
  offset += 2

  // Questions
  response.writeUInt16BE(1, offset)
  offset += 2

  // Answer RRs
  response.writeUInt16BE(1, offset)
  offset += 2

  // Authority RRs & Additional RRs
  response.writeUInt32BE(0, offset)
  offset += 4
  copyBuffer(queryInfo, offset, response)
  offset += queryInfo.length

  // offset to domain name
  response.writeUInt16BE(0xc00c, offset)
  offset += 2
  const typeAndClass = msg.subarray(msg.length - 4)
  copyBuffer(typeAndClass, offset, response)
  offset += typeAndClass.length

  // TTL, in seconds
  response.writeUInt32BE(600, offset)
  offset += 4

  // Length of IP
  response.writeUInt16BE(4, offset)
  offset += 2
  "11.22.33.44".split(".").forEach((value) => {
    response.writeUInt8(parseInt(value), offset)
    offset += 1
  })
  server.send(response, rinfo.port, rinfo.address, (err) => {
    if (err) {
      console.log(err)
      server.close()
    }
  })
}

function forward(msg, rinfo) {
  const client = dgram.createSocket("udp4")
  client.on("error", (err) => {
    console.log(`client error:
${err.stack}`)
    client.close()
  })
  client.on("message", (fbMsg, fbRinfo) => {
    server.send(fbMsg, rinfo.port, rinfo.address, (err) => {
      err && console.log(err)
    })
    client.close()
  })
  client.send(msg, 53, "202.102.152.3", (err) => {
    if (err) {
      console.log(err)
      client.close()
    }
  })
}

server.on("message", (msg, rinfo) => {
  const host = parseHost(msg.subarray(12))
  console.log(`query: ${host}`)

  if (/guangguangguang/.test(host)) {
    resolve(msg, rinfo)
  } else {
    forward(msg, rinfo)
  }
})

server.on("error", (err) => {
  console.log(`server error:
${err.stack}`)
  server.close()
})

server.on("listening", () => {
  const address = server.address()
  console.log(`server listening ${address.address}:${address.port}`)
})

server.bind(53)
```

> 代码上传了[文档仓库](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/my-dns-server)

注意：练习完成后记得把 DNS 服务器地址改回原值，具体 IP 可搜索所在城市的公共 DNS。

## 参考资料

- [RFC 1034: DOMAIN NAMES - CONCEPTS AND FACILITIES](https://datatracker.ietf.org/doc/html/rfc1034)
- [RFC 1035: DOMAIN NAMES - IMPLEMENTATION AND SPECIFICATION](https://datatracker.ietf.org/doc/html/rfc1035)
- [Node.js `dgram` (UDP/Datagram) Documentation](https://nodejs.org/api/dgram.html)
- [Node.js `Buffer` Documentation](https://nodejs.org/api/buffer.html)
- [CoreDNS](https://coredns.io/)
- [Dnsmasq](http://www.thekelleys.org.uk/dnsmasq/doc.html)

## 总结

- DNS 域名解析先查询 `hosts` 文件；未命中则请求本地域名服务器（由 ISP 提供，一般每个城市都有一个）。
- 本地域名服务器负责解析域名对应的 IP：依次请求根域名服务器、顶级域名服务器、权威域名服务器，拿到最终 IP 返回给客户端。
- 电脑可以设置本地域名服务器的地址，将其指向 Node.js 实现的本地 DNS 服务器。
- DNS 协议基于 UDP 传输，因此通过 `dgram` 模块启动 UDP 服务并监听 53 端口；再根据 DNS 协议格式解析出域名，对目标域名构造 DNS 协议消息返回，其他域名则转发给上游本地 DNS 服务器解析并把响应传给客户端。
- Buffer API 的典型用武之地正是读写二进制协议数据——本项目即为完整示例。
