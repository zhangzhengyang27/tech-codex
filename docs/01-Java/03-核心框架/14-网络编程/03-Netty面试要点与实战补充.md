---
title: "Netty 面试要点与实战补充"
description: "Netty 高频面试问答、常见误区、生产参数调优与实战代码案例汇总:线程模型、ByteBuf、零拷贝、心跳检测、IM/文件服务器/WebSocket 实战与常见故障排查。"
keywords: [Netty, 面试, 性能调优, 实战案例, 内存泄漏]
category: "Java"
tags: [Java, 网络编程]
---

# Netty 面试要点与实战补充

本篇汇总 Netty 的高频面试问答、常见误区、生产参数调优与实战代码案例。核心概念、组件模型与线程模型见 [Netty 核心](01-Netty核心.md)，长连接心跳的工程实践见 [HTTP 长连接与心跳机制](02-HTTP长连接与心跳机制.md)。

## 面试要点

### 1. Netty 核心概念类

**Q1: Netty 是什么？为什么使用 Netty？**

**A:**
- Netty 是一个异步的、基于事件驱动的网络应用框架，用于快速开发可维护、高性能的网络服务器和客户端
- 使用 Netty 的原因：
  1. **API 简单**：封装了 NIO 的复杂细节，提供简洁的 API
  2. **性能高**：零拷贝、内存池、多路复用等技术
  3. **功能完善**：提供编解码器、粘包拆包、心跳检测等开箱即用的组件
  4. **稳定可靠**：解决了 NIO 的 Epoll Bug，经过大规模生产验证
  5. **社区活跃**：文档丰富，生态完善

**Q2: Netty 的线程模型是什么？**

**A:**
- Netty 基于 Reactor 模型，采用主从 Reactor 多线程模型
- **bossGroup**：负责 Accept 连接，通常 1 个线程
- **workerGroup**：负责 IO 读写和编解码，默认 CPU 核心数 * 2
- **业务线程池**：处理耗时业务逻辑，避免阻塞 IO 线程
- 每个 Channel 绑定一个 EventLoop，保证同一个 Channel 的事件串行执行

**Q3: Netty 如何解决粘包半包问题？**

**A:**
- 粘包半包本质是 TCP 字节流没有边界
- 解决方案：
  1. **固定长度**：`FixedLengthFrameDecoder`
  2. **分隔符**：`LineBasedFrameDecoder`、`DelimiterBasedFrameDecoder`
  3. **长度字段**：`LengthFieldBasedFrameDecoder`（最常用）
- 长度字段协议格式：`[长度字段][消息体]`

### 2. 技术实现类

**Q4: ByteBuf 和 ByteBuffer 有什么区别？**

**A:**
| 特性 | ByteBuffer | ByteBuf |
|---|---|---|
| 读写索引 | 单指针,需 flip() | 双指针,无需切换 |
| 动态扩容 | 不支持 | 支持 |
| 内存池 | 不支持 | 支持 |
| 引用计数 | 不支持 | 支持 |
| 零拷贝 | 不支持 | 支持 |

**Q5: Netty 的零拷贝体现在哪里？**

**A:**
1. **CompositeByteBuf**：多个缓冲区逻辑组合，无内存复制
2. **slice() / duplicate()**：共享底层数组，无复制
3. **FileRegion**：使用 sendfile 系统调用，零拷贝传输文件
4. **DirectByteBuf**：使用堆外内存，避免 JVM 堆与内核态之间的复制

**Q6: Netty 的内存池是如何实现的？**

**A:**
- **Arena**：内存区域，分为 HeapArena 和 DirectArena
- **PoolThreadCache**：线程本地缓存，减少锁竞争
- **Page**：内存页，默认 8KB
- **SubPage**：小于 Page 的内存分配
- **Chunk**：内存块，早期默认 16MB（maxOrder=11），Netty 4.1.52+ 默认 maxOrder 调整为 9，即 4MB
- 内存池通过复用 ByteBuf 对象，大幅降低 GC 压力

### 3. 实战应用类

**Q7: 如何避免 EventLoop 阻塞？**

**A:**
1. **不要在 Handler 中执行耗时操作**：
   - 同步数据库查询
   - 同步 RPC 调用
   - 大文件 IO
   - 复杂计算
2. **使用业务线程池**：
   ```java
   BUSINESS_POOL.submit(() -> {
       // 耗时操作
       String result = process();
       // 回到 EventLoop 发送响应
       ctx.channel().eventLoop().execute(() -> {
           ctx.writeAndFlush(result);
       });
   });
   ```
3. **使用 DefaultEventExecutorGroup**：
   ```java
   EventExecutorGroup businessGroup = new DefaultEventExecutorGroup(16);
   pipeline.addLast(businessGroup, "business", new BusinessHandler());
   ```

**Q8: Netty 如何实现心跳检测？**

**A:**
```java
// 服务端
pipeline.addLast(new IdleStateHandler(60, 0, 0));  // 60秒读空闲
pipeline.addLast(new HeartbeatHandler());

public class HeartbeatHandler extends ChannelInboundHandlerAdapter {
    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) {
        if (evt instanceof IdleStateEvent) {
            IdleStateEvent event = (IdleStateEvent) evt;
            if (event.state() == IdleState.READER_IDLE) {
                // 读空闲超时,关闭连接
                ctx.close();
            }
        }
    }
}
```

长连接心跳的完整工程实践（服务端/客户端示例、断线重连、IM 心跳设计）见 [HTTP 长连接与心跳机制](02-HTTP长连接与心跳机制.md)。

**Q9: Netty 如何处理内存泄漏？**

**A:**
1. **使用 SimpleChannelInboundHandler**：自动释放消息
2. **手动释放**：在 finally 块中调用 `ReferenceCountUtil.release(msg)`
3. **启用泄漏检测**：`-Dio.netty.leakDetection.level=PARANOID`
4. **监控日志**：检查 `LEAK: ByteBuf.release() was not called`

**Q10: Netty 的高性能体现在哪些方面？**

**A:**
1. **IO 模型**：非阻塞 IO + 多路复用
2. **线程模型**：Reactor 模型，线程复用，减少切换
3. **零拷贝**：FileRegion、CompositeByteBuf、slice
4. **内存池**：ByteBuf 对象复用，降低 GC 压力
5. **参数优化**：TCP_NODELAY、SO_BACKLOG、缓冲区大小
6. **原生支持**：Linux epoll，性能更好
7. **无锁设计**：每个 Channel 绑定一个 EventLoop，串行执行

### 4. 架构设计类

**Q11: 如何设计一个高性能的 Netty 服务器？**

**A:**
1. **线程模型**：
   - bossGroup: 1 个线程
   - workerGroup: CPU 核心数 * 2
   - 业务线程池: 根据业务类型配置
2. **内存管理**：
   - 使用池化 ByteBuf
   - 合理配置内存大小
   - 避免内存泄漏
3. **协议设计**：
   - 使用长度字段协议
   - 合理设置最大帧长度
   - 编解码器优化
4. **参数优化**：
   - SO_BACKLOG: 1024+
   - TCP_NODELAY: true
   - SO_KEEPALIVE: true
   - 合理的缓冲区大小
5. **监控运维**：
   - 连接数监控
   - 消息堆积监控
   - 内存使用监控
   - 异常日志记录

**Q12: Netty 在生产环境中有哪些注意事项？**

**A:**
1. **资源释放**：确保 ByteBuf 正确释放，避免内存泄漏
2. **异常处理**：实现完整的异常处理链，区分异常类型
3. **线程隔离**：耗时操作使用业务线程池，避免阻塞 IO 线程
4. **心跳机制**：及时检测失效连接，释放资源
5. **流量控制**：使用写缓冲区水位控制，避免 OOM
6. **监控告警**：监控连接数、消息堆积、内存使用
7. **优雅关闭**：正确处理 shutdownGracefully
8. **参数调优**：根据业务场景调整参数

## 高频追问与要点补充

### Netty 和原生 NIO 的关系

- `NIO` 提供非阻塞 IO 和多路复用能力
- Netty 在此基础上封装出更完整的事件驱动网络开发模型

### 为什么同一个 Channel 上的事件通常是串行的

因为一个 `Channel` 会绑定到某个固定的 `EventLoop`，而 `EventLoop` 本质上对应一个固定线程，因此同一连接上的 IO 事件通常按顺序执行。

### 为什么说阻塞 EventLoop 是大问题

因为一个 `EventLoop` 往往不只服务一个连接。一旦线程被耗时任务卡住，它负责的多个连接都会一起受影响。

### LengthFieldBasedFrameDecoder 解决了什么问题

它通过"先读取长度字段，再按长度读取完整消息"的方式，为 TCP 字节流建立应用层消息边界，从而解决粘包半包问题。

## 常见误区

### 误区一：Netty 等于高性能，多线程越多越快

错误。Netty 的优势来自事件驱动和线程复用，而不是简单地增加线程。线程过多反而会增加切换成本，降低整体稳定性。

### 误区二：使用了 Netty 就不需要关心协议设计

错误。Netty 帮你提供了拆包器和编解码框架，但消息边界、字段设计、兼容性策略仍然需要你自己定义。

### 误区三：Handler 中写任何逻辑都没问题

错误。`Handler` 里可以写业务代码，但不能把 IO 线程当通用线程池使用。耗时逻辑必须明确隔离。

### 误区四：只要能跑通，ByteBuf 就不会出问题

错误。引用计数与直接内存泄漏在压测场景下才更容易暴露，一旦出问题通常比普通堆内存泄漏更难排查。

## 生产参数优化与高性能调优

Netty 提供了丰富的参数配置选项，合理配置可以显著提升性能。

### ChannelOption 核心参数

```java
// 服务端配置
ServerBootstrap serverBootstrap = new ServerBootstrap();
serverBootstrap
    .group(bossGroup, workerGroup)
    .channel(NioServerSocketChannel.class)

    // ===== 服务端 Socket 参数 =====
    .option(ChannelOption.SO_BACKLOG, 1024)  // 等待连接队列最大长度
    .option(ChannelOption.SO_REUSEADDR, true)  // 允许重用本地地址

    // ===== 客户端 Socket 参数 =====
    .childOption(ChannelOption.SO_KEEPALIVE, true)  // 启用心跳检测
    .childOption(ChannelOption.TCP_NODELAY, true)  // 禁用 Nagle 算法
    .childOption(ChannelOption.SO_SNDBUF, 32 * 1024)  // 发送缓冲区 32KB
    .childOption(ChannelOption.SO_RCVBUF, 32 * 1024)  // 接收缓冲区 32KB

    // ===== Netty 特有参数 =====
    .childOption(ChannelOption.ALLOCATOR, PooledByteBufAllocator.DEFAULT)  // 池化分配器
    .childOption(ChannelOption.WRITE_BUFFER_WATER_MARK,
        new WriteBufferWaterMark(32 * 1024, 64 * 1024))  // 写缓冲区水位
    .childOption(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000);  // 连接超时 5 秒
```

### 关键参数详解

**1. SO_BACKLOG (等待连接队列长度)**

```java
// TCP 三次握手过程中有两个队列:
// 1. SYN 队列: 存放已收到 SYN 包但未完成三次握手的连接
// 2. Accept 队列: 存放已完成三次握手但未被应用 accept() 的连接

// SO_BACKLOG 在 Linux 中定义了 Accept 队列的最大长度
// 如果队列满了,客户端会收到 ECONNREFUSED 错误

// 推荐配置:
.option(ChannelOption.SO_BACKLOG, 1024)  // 高并发场景

// Linux 默认值:
// /proc/sys/net/ipv4/tcp_max_syn_backlog  (SYN 队列长度,默认 128)
// /proc/sys/net/core/somaxconn  (Accept 队列最大长度,默认 128)
```

**2. TCP_NODELAY (禁用 Nagle 算法)**

```java
// Nagle 算法: 将多个小包合并成一个大包发送,减少网络负载,但会增加延迟
// 禁用后每次写入都会立即发送,减少延迟

// 推荐配置:
.childOption(ChannelOption.TCP_NODELAY, true)  // 低延迟场景 (推荐)
.childOption(ChannelOption.TCP_NODELAY, false)  // 大数据传输场景
```

**3. WRITE_BUFFER_WATER_MARK (写缓冲区水位)**

```java
// 当写缓冲区中的字节数超过高水位时,channel.isWritable() 返回 false
// 当写缓冲区中的字节数低于低水位时,channel.isWritable() 返回 true

WriteBufferWaterMark waterMark = new WriteBufferWaterMark(
    32 * 1024,  // 低水位 32KB
    64 * 1024   // 高水位 64KB
);
.childOption(ChannelOption.WRITE_BUFFER_WATER_MARK, waterMark);

// 使用示例
if (ctx.channel().isWritable()) {
    ctx.writeAndFlush(message);
} else {
    // 写缓冲区满,等待或丢弃消息
    System.out.println("Write buffer is full");
}
```

**4. SO_SNDBUF 和 SO_RCVBUF (发送/接收缓冲区)**

```java
// 缓冲区大小影响吞吐量和延迟
// 太小: 频繁阻塞,降低吞吐量
// 太大: 占用过多内存,增加 GC 压力

// 推荐配置 (根据业务场景调整):
.childOption(ChannelOption.SO_SNDBUF, 32 * 1024)  // 发送缓冲区 32KB
.childOption(ChannelOption.SO_RCVBUF, 32 * 1024)  // 接收缓冲区 32KB

// 高吞吐量场景:
.childOption(ChannelOption.SO_SNDBUF, 256 * 1024)  // 发送缓冲区 256KB
.childOption(ChannelOption.SO_RCVBUF, 256 * 1024)  // 接收缓冲区 256KB
```

**5. SO_KEEPALIVE (TCP 心跳)**

```java
// 启用 TCP 层面的心跳检测
// 如果连接空闲超过一定时间,TCP 会发送心跳包检测连接是否存活

.childOption(ChannelOption.SO_KEEPALIVE, true)

// 注意: TCP Keepalive 默认 2 小时才探测,Netty 的 IdleStateHandler 是应用层心跳,更灵活
```

### Epoll 原生支持

在 Linux 环境下，Netty 提供了基于 epoll 的原生实现，性能比 NIO 更好。

```java
// 检测是否支持 epoll
if (Epoll.isAvailable()) {
    // 使用 epoll
    EventLoopGroup bossGroup = new EpollEventLoopGroup(1);
    EventLoopGroup workerGroup = new EpollEventLoopGroup();

    ServerBootstrap serverBootstrap = new ServerBootstrap();
    serverBootstrap
        .group(bossGroup, workerGroup)
        .channel(EpollServerSocketChannel.class)
        .option(ChannelOption.SO_BACKLOG, 1024)
        .childOption(ChannelOption.EPOLL_MODE, EpollMode.LEVEL_TRIGGERED);
} else {
    // 回退到 NIO
    EventLoopGroup bossGroup = new NioEventLoopGroup(1);
    EventLoopGroup workerGroup = new NioEventLoopGroup();

    ServerBootstrap serverBootstrap = new ServerBootstrap();
    serverBootstrap
        .group(bossGroup, workerGroup)
        .channel(NioServerSocketChannel.class);
}
```

**Epoll vs NIO 性能对比：**

| 特性 | NIO (Selector) | Epoll |
|---|---|---|
| 触发方式 | 水平触发 (LT) | 水平触发 (LT) / 边缘触发 (ET) |
| 性能 | 中等 | 高 (无系统调用开销) |
| 连接数支持 | 数万 | 百万级 |
| CPU 占用 | 中等 | 低 |
| 平台支持 | 跨平台 | 仅 Linux |

### 性能优化最佳实践

**1. 减少 GC 压力**：使用池化 ByteBuf，复用对象，避免在 Handler 中创建大量临时对象。

```java
.childOption(ChannelOption.ALLOCATOR, PooledByteBufAllocator.DEFAULT);

public class OptimizedHandler extends ChannelInboundHandlerAdapter {
    private final ByteBuf buffer = Unpooled.buffer(1024);  // 复用缓冲区

    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        buffer.clear();
        // ... 处理逻辑
    }
}
```

**2. 减少锁竞争**：使用 `@Sharable` 共享无状态的 Handler。

```java
@Sharable
public class StatelessHandler extends ChannelInboundHandlerAdapter {
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        ctx.fireChannelRead(msg);  // 无状态处理,线程安全
    }
}

public class ServerInitializer extends ChannelInitializer<SocketChannel> {
    private static final StatelessHandler SHARED_HANDLER = new StatelessHandler();

    @Override
    protected void initChannel(SocketChannel ch) {
        ch.pipeline().addLast(SHARED_HANDLER);  // 共享同一个实例
    }
}
```

**3. 异步处理耗时操作**：提交到业务线程池，完成后回到 EventLoop 写响应。

```java
public class AsyncBusinessHandler extends SimpleChannelInboundHandler<String> {
    private static final ExecutorService BUSINESS_POOL = Executors.newFixedThreadPool(16);

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, String request) {
        BUSINESS_POOL.submit(() -> {
            String result = processBusiness(request);
            // 回到 EventLoop 发送响应
            ctx.channel().eventLoop().execute(() -> {
                ctx.writeAndFlush(result);
            });
        });
    }

    private String processBusiness(String request) {
        // 耗时业务逻辑
        return "Processed: " + request;
    }
}
```

**4. 批量写入优化**：攒批 + `channelReadComplete` 时统一刷新。

```java
public class BatchWriteHandler extends ChannelInboundHandlerAdapter {
    private final List<String> batch = new ArrayList<>();
    private final int batchSize = 100;

    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        batch.add((String) msg);
        if (batch.size() >= batchSize) {
            ctx.writeAndFlush(new ArrayList<>(batch));
            batch.clear();
        }
    }

    @Override
    public void channelReadComplete(ChannelHandlerContext ctx) {
        if (!batch.isEmpty()) {
            ctx.writeAndFlush(new ArrayList<>(batch));
            batch.clear();
        }
        ctx.flush();
    }
}
```

**5. 内存泄漏检测**：生产环境 `-Dio.netty.leakDetection.level=SIMPLE`，开发环境 `PARANOID`。

```java
ByteBuf buf = ctx.alloc().buffer();
try {
    // ... 使用 buf
} finally {
    int refCnt = buf.refCnt();
    if (refCnt > 0) {
        buf.release(refCnt);  // 释放所有引用
    }
}
```

## 实战案例

基础的服务端骨架（拆包 + 编解码 + 业务处理的最小可用写法）见 [Netty 核心](01-Netty核心.md)的最小服务端示例，下面是三个更完整的场景化案例。

### 案例 1: IM 即时通讯系统

实现一个简单的 IM 系统，支持用户登录、私聊、群聊。

#### 消息协议设计

```java
// 消息类型
public enum MessageType {
    LOGIN_REQUEST(1),      // 登录请求
    LOGIN_RESPONSE(2),     // 登录响应
    PRIVATE_MESSAGE(3),    // 私聊消息
    GROUP_MESSAGE(4),      // 群聊消息
    HEARTBEAT(5);          // 心跳包

    private final int type;

    MessageType(int type) {
        this.type = type;
    }

    public int getType() {
        return type;
    }

    public static MessageType valueOf(int type) {
        for (MessageType mt : values()) {
            if (mt.type == type) {
                return mt;
            }
        }
        return null;
    }
}

// 消息头
public class MessageHeader {
    private int magic;           // 魔数 0xCAFE
    private short version;       // 版本号
    private int type;            // 消息类型
    private long sequenceId;     // 序列号
    private int length;          // 消息体长度
}

// 消息体
public class Message {
    private MessageHeader header;
    private Object body;         // JSON 字符串或二进制数据
}
```

#### 编解码器实现

```java
// 消息编码器
public class MessageEncoder extends MessageToByteEncoder<Message> {
    @Override
    protected void encode(ChannelHandlerContext ctx, Message msg, ByteBuf out) {
        // 1. 写魔数
        out.writeInt(0xCAFE);

        // 2. 写版本号
        out.writeShort(1);

        // 3. 写消息类型
        out.writeInt(msg.getHeader().getType());

        // 4. 写序列号
        out.writeLong(msg.getHeader().getSequenceId());

        // 5. 写消息体
        byte[] bodyBytes = serialize(msg.getBody());
        out.writeInt(bodyBytes.length);
        out.writeBytes(bodyBytes);
    }

    private byte[] serialize(Object obj) {
        // JSON 序列化
        return JSON.toJSONString(obj).getBytes(StandardCharsets.UTF_8);
    }
}

// 消息解码器
public class MessageDecoder extends ByteToMessageDecoder {
    @Override
    protected void decode(ChannelHandlerContext ctx, ByteBuf in, List<Object> out) {
        // 检查魔数
        if (in.readableBytes() < 22) {  // 最小头部大小
            return;
        }

        in.markReaderIndex();

        int magic = in.readInt();
        if (magic != 0xCAFE) {
            ctx.close();
            return;
        }

        short version = in.readShort();
        int type = in.readInt();
        long sequenceId = in.readLong();
        int length = in.readInt();

        if (length < 0 || length > 1024 * 1024) {  // 最大 1MB
            ctx.close();
            return;
        }

        if (in.readableBytes() < length) {
            in.resetReaderIndex();
            return;
        }

        byte[] bodyBytes = new byte[length];
        in.readBytes(bodyBytes);

        MessageHeader header = new MessageHeader(magic, version, type, sequenceId, length);
        Object body = deserialize(bodyBytes, MessageType.valueOf(type));

        out.add(new Message(header, body));
    }

    private Object deserialize(byte[] bytes, MessageType type) {
        String json = new String(bytes, StandardCharsets.UTF_8);
        switch (type) {
            case LOGIN_REQUEST:
                return JSON.parseObject(json, LoginRequest.class);
            case PRIVATE_MESSAGE:
                return JSON.parseObject(json, PrivateMessage.class);
            case GROUP_MESSAGE:
                return JSON.parseObject(json, GroupMessage.class);
            default:
                return json;
        }
    }
}
```

#### IM 服务端实现

```java
public class IMServer {
    private final EventLoopGroup bossGroup;
    private final EventLoopGroup workerGroup;
    private final Map<String, Channel> userChannels = new ConcurrentHashMap<>();

    public IMServer() {
        bossGroup = new NioEventLoopGroup(1);
        workerGroup = new NioEventLoopGroup();
    }

    public void start(int port) throws InterruptedException {
        ServerBootstrap bootstrap = new ServerBootstrap();
        bootstrap.group(bossGroup, workerGroup)
            .channel(NioServerSocketChannel.class)
            .option(ChannelOption.SO_BACKLOG, 1024)
            .childOption(ChannelOption.SO_KEEPALIVE, true)
            .childOption(ChannelOption.TCP_NODELAY, true)
            .childHandler(new ChannelInitializer<SocketChannel>() {
                @Override
                protected void initChannel(SocketChannel ch) {
                    ch.pipeline()
                        // 空闲检测
                        .addLast(new IdleStateHandler(60, 0, 0))
                        // 编解码器
                        .addLast(new MessageDecoder())
                        .addLast(new MessageEncoder())
                        // 业务处理器
                        .addLast(new LoginHandler(userChannels))
                        .addLast(new PrivateMessageHandler(userChannels))
                        .addLast(new GroupMessageHandler(userChannels))
                        .addLast(new HeartbeatHandler())
                        // 异常处理
                        .addLast(new ExceptionHandler());
                }
            });

        ChannelFuture future = bootstrap.bind(port).sync();
        System.out.println("IM Server started on port " + port);
        future.channel().closeFuture().sync();
    }

    public void shutdown() {
        bossGroup.shutdownGracefully();
        workerGroup.shutdownGracefully();
    }
}

// 登录处理器
public class LoginHandler extends SimpleChannelInboundHandler<LoginRequest> {
    private final Map<String, Channel> userChannels;

    public LoginHandler(Map<String, Channel> userChannels) {
        this.userChannels = userChannels;
    }

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, LoginRequest request) {
        String userId = request.getUserId();

        // 保存用户连接
        userChannels.put(userId, ctx.channel());

        // 绑定用户ID到 Channel
        ctx.channel().attr(AttributeKey.valueOf("userId")).set(userId);

        // 发送登录成功响应
        LoginResponse response = new LoginResponse(true, "Login success");
        ctx.writeAndFlush(new Message(
            new MessageHeader(0xCAFE, (short) 1, MessageType.LOGIN_RESPONSE.getType(),
                System.currentTimeMillis(), 0),
            response
        ));

        System.out.println("User " + userId + " logged in");
    }
}

// 私聊处理器
public class PrivateMessageHandler extends SimpleChannelInboundHandler<PrivateMessage> {
    private final Map<String, Channel> userChannels;

    public PrivateMessageHandler(Map<String, Channel> userChannels) {
        this.userChannels = userChannels;
    }

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, PrivateMessage msg) {
        String toUserId = msg.getToUserId();
        Channel targetChannel = userChannels.get(toUserId);

        if (targetChannel != null && targetChannel.isActive()) {
            // 转发消息
            targetChannel.writeAndFlush(new Message(
                new MessageHeader(0xCAFE, (short) 1, MessageType.PRIVATE_MESSAGE.getType(),
                    System.currentTimeMillis(), 0),
                msg
            ));
        } else {
            // 用户不在线
            ctx.writeAndFlush(new Message(
                new MessageHeader(0xCAFE, (short) 1, MessageType.PRIVATE_MESSAGE.getType(),
                    System.currentTimeMillis(), 0),
                new PrivateMessage("system", msg.getFromUserId(),
                    "User " + toUserId + " is offline")
            ));
        }
    }
}
```

### 案例 2: 文件服务器

实现一个高性能文件上传下载服务器。

#### 文件上传实现

```java
public class FileServerHandler extends SimpleChannelInboundHandler<FileUploadRequest> {
    private final String baseDir = "/data/uploads";

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, FileUploadRequest request) {
        String fileName = request.getFileName();
        long fileSize = request.getFileSize();
        String fileMd5 = request.getFileMd5();

        // 创建临时文件
        Path tempFile = Paths.get(baseDir, fileName + ".tmp");

        // 保存文件信息到 Channel 属性
        ctx.channel().attr(AttributeKey.valueOf("tempFile")).set(tempFile);
        ctx.channel().attr(AttributeKey.valueOf("fileMd5")).set(fileMd5);
        ctx.channel().attr(AttributeKey.valueOf("receivedBytes")).set(0L);
        ctx.channel().attr(AttributeKey.valueOf("fileSize")).set(fileSize);

        // 发送准备接收响应
        ctx.writeAndFlush(new FileUploadResponse(true, "Ready to receive"));
    }

    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        if (msg instanceof FileChunk) {
            FileChunk chunk = (FileChunk) msg;
            handleFileChunk(ctx, chunk);
        } else {
            // 交给父类按泛型类型分发到 channelRead0(否则 channelRead0 永远不会被调用)
            super.channelRead(ctx, msg);
        }
    }

    private void handleFileChunk(ChannelHandlerContext ctx, FileChunk chunk) {
        Path tempFile = (Path) ctx.channel().attr(AttributeKey.valueOf("tempFile")).get();
        long receivedBytes = (Long) ctx.channel().attr(AttributeKey.valueOf("receivedBytes")).get();
        long fileSize = (Long) ctx.channel().attr(AttributeKey.valueOf("fileSize")).get();

        try {
            // 写入文件块
            Files.write(tempFile, chunk.getData(),
                StandardOpenOption.CREATE, StandardOpenOption.APPEND);

            receivedBytes += chunk.getData().length;
            ctx.channel().attr(AttributeKey.valueOf("receivedBytes")).set(receivedBytes);

            // 发送进度
            double progress = (double) receivedBytes / fileSize * 100;
            ctx.writeAndFlush(new FileProgress(progress));

            // 检查是否接收完成
            if (receivedBytes >= fileSize) {
                verifyAndRenameFile(ctx, tempFile);
            }
        } catch (IOException e) {
            ctx.writeAndFlush(new FileUploadResponse(false, "Upload failed: " + e.getMessage()));
        }
    }

    private void verifyAndRenameFile(ChannelHandlerContext ctx, Path tempFile) {
        try {
            // 计算 MD5
            String md5 = calculateMD5(tempFile);
            String expectedMd5 = (String) ctx.channel().attr(AttributeKey.valueOf("fileMd5")).get();

            if (md5.equals(expectedMd5)) {
                // 重命名为正式文件
                String fileName = tempFile.getFileName().toString().replace(".tmp", "");
                Path finalFile = tempFile.resolveSibling(fileName);
                Files.move(tempFile, finalFile, StandardCopyOption.REPLACE_EXISTING);

                ctx.writeAndFlush(new FileUploadResponse(true, "Upload completed"));
            } else {
                Files.delete(tempFile);
                ctx.writeAndFlush(new FileUploadResponse(false, "MD5 verification failed"));
            }
        } catch (Exception e) {
            ctx.writeAndFlush(new FileUploadResponse(false, "Verification failed: " + e.getMessage()));
        }
    }

    private String calculateMD5(Path file) throws IOException {
        MessageDigest md = MessageDigest.getInstance("MD5");
        try (InputStream is = Files.newInputStream(file)) {
            byte[] buffer = new byte[8192];
            int read;
            while ((read = is.read(buffer)) != -1) {
                md.update(buffer, 0, read);
            }
        }
        return Hex.encodeHexString(md.digest());
    }
}
```

#### 文件下载实现 (零拷贝)

```java
public class FileDownloadHandler extends SimpleChannelInboundHandler<FileDownloadRequest> {
    private final String baseDir = "/data/files";

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, FileDownloadRequest request) {
        String fileName = request.getFileName();
        Path file = Paths.get(baseDir, fileName);

        if (!Files.exists(file)) {
            ctx.writeAndFlush(new FileDownloadResponse(false, "File not found"));
            return;
        }

        try {
            long fileSize = Files.size(file);

            // 发送文件信息
            ctx.writeAndFlush(new FileDownloadResponse(true, fileName, fileSize));

            // 使用 FileRegion 零拷贝传输
            RandomAccessFile raf = new RandomAccessFile(file.toFile(), "r");
            FileRegion region = new DefaultFileRegion(raf.getChannel(), 0, fileSize);

            ctx.writeAndFlush(region).addListener((ChannelFutureListener) future -> {
                raf.close();
                if (!future.isSuccess()) {
                    future.cause().printStackTrace();
                }
            });
        } catch (IOException e) {
            ctx.writeAndFlush(new FileDownloadResponse(false, "Download failed: " + e.getMessage()));
        }
    }
}
```

### 案例 3: WebSocket 聊天室

实现一个基于 WebSocket 的实时聊天室。

#### WebSocket 服务端配置

```java
public class WebSocketChatServer {
    public static void main(String[] args) throws InterruptedException {
        EventLoopGroup bossGroup = new NioEventLoopGroup(1);
        EventLoopGroup workerGroup = new NioEventLoopGroup();

        try {
            ServerBootstrap bootstrap = new ServerBootstrap();
            bootstrap.group(bossGroup, workerGroup)
                .channel(NioServerSocketChannel.class)
                .childHandler(new ChannelInitializer<SocketChannel>() {
                    @Override
                    protected void initChannel(SocketChannel ch) {
                        ch.pipeline()
                            // HTTP 编解码器
                            .addLast(new HttpServerCodec())
                            .addLast(new HttpObjectAggregator(65536))
                            // WebSocket 协议升级
                            .addLast(new WebSocketServerProtocolHandler("/chat"))
                            // 心跳检测
                            .addLast(new IdleStateHandler(60, 0, 0))
                            // WebSocket 消息处理
                            .addLast(new WebSocketChatHandler())
                            .addLast(new WebSocketHeartbeatHandler());
                    }
                });

            ChannelFuture future = bootstrap.bind(8080).sync();
            System.out.println("WebSocket Chat Server started on port 8080");
            future.channel().closeFuture().sync();
        } finally {
            bossGroup.shutdownGracefully();
            workerGroup.shutdownGracefully();
        }
    }
}

// WebSocket 消息处理器
public class WebSocketChatHandler extends SimpleChannelInboundHandler<TextWebSocketFrame> {
    private static final ChannelGroup channels = new DefaultChannelGroup(GlobalEventExecutor.INSTANCE);

    @Override
    public void handlerAdded(ChannelHandlerContext ctx) {
        // 新用户加入
        channels.add(ctx.channel());
        channels.writeAndFlush(new TextWebSocketFrame(
            "User " + ctx.channel().id().asShortText() + " joined"
        ));
    }

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, TextWebSocketFrame frame) {
        String message = frame.text();

        // 广播消息给所有用户
        channels.writeAndFlush(new TextWebSocketFrame(
            "[" + ctx.channel().id().asShortText() + "] " + message
        ));
    }

    @Override
    public void handlerRemoved(ChannelHandlerContext ctx) {
        // 用户离开
        channels.writeAndFlush(new TextWebSocketFrame(
            "User " + ctx.channel().id().asShortText() + " left"
        ));
    }

    @Override
    public void userEventTriggered(ChannelHandlerContext ctx, Object evt) {
        if (evt instanceof IdleStateEvent) {
            // 空闲超时,关闭连接
            ctx.close();
        }
    }
}
```

WebSocket 心跳与服务端/客户端完整代码见 [HTTP 长连接与心跳机制](02-HTTP长连接与心跳机制.md)的"长连接场景下的心跳示例"一节。

#### WebSocket 客户端示例 (JavaScript)

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>WebSocket Chat</title>
</head>
<body>
    <div id="messages"></div>
    <input type="text" id="messageInput">
    <button onclick="sendMessage()">Send</button>

    <script>
        const ws = new WebSocket('ws://localhost:8080/chat');
        const messagesDiv = document.getElementById('messages');
        const messageInput = document.getElementById('messageInput');

        ws.onopen = () => {
            addMessage('Connected to server');
        };

        ws.onmessage = (event) => {
            addMessage(event.data);
        };

        ws.onclose = () => {
            addMessage('Disconnected from server');
        };

        function sendMessage() {
            const message = messageInput.value;
            if (message) {
                ws.send(message);
                messageInput.value = '';
            }
        }

        function addMessage(message) {
            const div = document.createElement('div');
            div.textContent = message;
            messagesDiv.appendChild(div);
        }

        // 支持回车发送
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    </script>
</body>
</html>
```

## 常见问题与解决方案

### 问题 1: 内存泄漏

**现象:**
- 服务运行一段时间后内存持续增长
- 日志中出现 `LEAK: ByteBuf.release() was not called`

**原因分析:**
```java
// × 错误示例
public class LeakyHandler extends ChannelInboundHandlerAdapter {
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        ByteBuf buf = (ByteBuf) msg;
        String data = buf.toString(StandardCharsets.UTF_8);
        // 忘记释放 buf
        process(data);
    }
}
```

**解决方案:**
```java
// √ 方案 1: 使用 SimpleChannelInboundHandler
public class SafeHandler extends SimpleChannelInboundHandler<ByteBuf> {
    @Override
    protected void channelRead0(ChannelHandlerContext ctx, ByteBuf msg) {
        String data = msg.toString(StandardCharsets.UTF_8);
        process(data);
        // SimpleChannelInboundHandler 会自动释放 msg
    }
}

// √ 方案 2: 手动释放
public class ManualReleaseHandler extends ChannelInboundHandlerAdapter {
    @Override
    public void channelRead(ChannelHandlerContext ctx, Object msg) {
        try {
            ByteBuf buf = (ByteBuf) msg;
            String data = buf.toString(StandardCharsets.UTF_8);
            process(data);
        } finally {
            ReferenceCountUtil.release(msg);
        }
    }
}

// √ 方案 3: 启用内存泄漏检测
// 启动参数: -Dio.netty.leakDetection.level=PARANOID
```

### 问题 2: 连接超时

**现象:**
- 客户端连接服务端时超时
- 日志中出现 `ConnectTimeoutException`

**原因分析:**
```java
// × 错误示例
Bootstrap bootstrap = new Bootstrap();
bootstrap.group(group)
    .channel(NioSocketChannel.class)
    .handler(new ChannelInitializer<SocketChannel>() {
        @Override
        protected void initChannel(SocketChannel ch) {
            // 没有配置连接超时
        }
    });

ChannelFuture future = bootstrap.connect("example.com", 8080);
future.sync();  // 无限等待
```

**解决方案:**
```java
// √ 配置连接超时
Bootstrap bootstrap = new Bootstrap();
bootstrap.group(group)
    .channel(NioSocketChannel.class)
    .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)  // 5 秒超时
    .handler(new ChannelInitializer<SocketChannel>() {
        @Override
        protected void initChannel(SocketChannel ch) {
            // 配置处理器
        }
    });

ChannelFuture future = bootstrap.connect("example.com", 8080);
future.addListener((ChannelFutureListener) f -> {
    if (f.isSuccess()) {
        System.out.println("Connected");
    } else {
        System.out.println("Connect failed: " + f.cause().getMessage());
    }
});
```

### 问题 3: 消息拆包失败

**现象:**
- 日志中出现 `TooLongFrameException`
- 消息解析异常

**原因分析:**
```java
// × 错误示例:最大帧长度设置过小
pipeline.addLast(new LengthFieldBasedFrameDecoder(
    100,   // 最大帧长度 100 字节
    0, 4, 0, 4
));
```

**解决方案:**
```java
// √ 调整最大帧长度
pipeline.addLast(new LengthFieldBasedFrameDecoder(
    1024 * 1024,   // 最大帧长度 1MB
    0, 4, 0, 4
));

// √ 自定义异常处理
public class FrameExceptionHandler extends ChannelInboundHandlerAdapter {
    @Override
    public void exceptionCaught(ChannelHandlerContext ctx, Throwable cause) {
        if (cause instanceof TooLongFrameException) {
            // 记录日志
            logger.warn("Frame too long from {}", ctx.channel().remoteAddress());
            // 关闭连接
            ctx.close();
        } else {
            ctx.fireExceptionCaught(cause);
        }
    }
}
```

### 问题 4: EventLoop 阻塞

**现象:**
- 服务响应缓慢
- 心跳超时
- CPU 使用率低

**原因分析:**
```java
// × 错误示例:在 EventLoop 中执行耗时操作
public class BlockingHandler extends SimpleChannelInboundHandler<String> {
    @Override
    protected void channelRead0(ChannelHandlerContext ctx, String msg) {
        // 阻塞 EventLoop 线程
        try {
            Thread.sleep(5000);  // 模拟耗时操作
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
        ctx.writeAndFlush("Response");
    }
}
```

**解决方案:**
```java
// √ 方案 1: 使用业务线程池
public class AsyncHandler extends SimpleChannelInboundHandler<String> {
    private static final ExecutorService BUSINESS_POOL = Executors.newFixedThreadPool(16);

    @Override
    protected void channelRead0(ChannelHandlerContext ctx, String msg) {
        BUSINESS_POOL.submit(() -> {
            // 耗时操作
            String result = processBusiness(msg);

            // 回到 EventLoop 发送响应
            ctx.channel().eventLoop().execute(() -> {
                ctx.writeAndFlush(result);
            });
        });
    }
}

// √ 方案 2: 使用 DefaultEventExecutorGroup
EventExecutorGroup businessGroup = new DefaultEventExecutorGroup(16);

pipeline.addLast(businessGroup, "businessHandler", new BusinessHandler());
```

### 问题 5: 高并发下连接拒绝

**现象:**
- 日志中出现 `Connection reset by peer`
- 客户端连接失败

**原因分析:**
- SO_BACKLOG 设置过小
- 文件描述符限制
- 线程数不足

**解决方案:**
```java
// √ 调整系统参数
// Linux:
// echo 65535 > /proc/sys/net/core/somaxconn
// echo 65535 > /proc/sys/net/ipv4/tcp_max_syn_backlog
// ulimit -n 65535

// √ 调整 Netty 参数
ServerBootstrap bootstrap = new ServerBootstrap();
bootstrap.group(bossGroup, workerGroup)
    .channel(NioServerSocketChannel.class)
    .option(ChannelOption.SO_BACKLOG, 65535)  // 加大队列
    .option(ChannelOption.SO_REUSEADDR, true);  // 允许重用端口
```

## 小结

本篇是 [Netty 核心](01-Netty核心.md)的面试与实战补充：面试高频题集中在线程模型、ByteBuf、零拷贝、心跳与内存泄漏；实战中最容易出问题的是 EventLoop 阻塞、资源释放和参数配置，遇到故障时优先对照"常见问题与解决方案"排查。

## 版本差异(旧版 → 当前)

| 特性 | 旧版（本文编写时） | 当前 |
|------|-------------------|------|
| Java NIO | JDK 8 | JDK 21 NIO 不变；虚拟线程可简化 IO 密集编程 |
| Netty | 4.1.x | 4.1.x 持续维护（最主流高性能网络框架） |
| HTTP | HTTP/1.1 | HTTP/2、HTTP/3（QUIC）逐步普及 |
| 心跳机制 | 自定义 | 不变；可结合 HTTP/2 PING 帧 |

> 网络编程基础（TCP/UDP、NIO、事件驱动）原理不变；Java 21 虚拟线程为 IO 密集场景提供新选择，Netty 4.1 仍是最主流的高性能网络框架选择。
