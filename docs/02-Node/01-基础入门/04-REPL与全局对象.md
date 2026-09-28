---
title: REPL 与全局对象
description: Node.js 提供了丰富的全局对象和交互式运行环境，这些是构建 Node.js 应用的基础。本章将详细介绍 REPL 环境和各类全局对象的使用方法。
keywords: [Node.js, 基础入门, REPL]
category: Node.js
tags: [Node.js, 基础入门]
---







# REPL 与全局对象

## 概述

Node.js 提供了丰富的全局对象和交互式运行环境，这些是构建 Node.js 应用的基础。本章先介绍 REPL 的启动方式、快捷键与自定义配置，再逐个讲解 global、console、process、Buffer、定时器以及 URL、AbortController 等 Web 标准全局对象，最后给出浏览器与 Node.js 全局对象的对照表和常见问题解答。

## REPL 环境

REPL（Read-Eval-Print-Loop，读取-执行-打印-循环）是 Node.js 提供的交互式运行环境，可以快速测试 JavaScript 代码片段、调试程序或学习 Node.js API。

### 启动 REPL

```bash
# 在终端中输入
node

# 进入 REPL 环境
>
```

### REPL 基本使用

```javascript
// 简单计算
> 1 + 1
2

// 变量声明
> let name = 'Node.js'
undefined
> name
'Node.js'

// 函数定义
> function add(a, b) { return a + b }
undefined
> add(2, 3)
5

// 多行表达式
> function fibonacci(n) {
...   if (n <= 1) return n;
...   return fibonacci(n - 1) + fibonacci(n - 2);
... }
undefined
> fibonacci(10)
55

// 使用 const 和 let
> const PI = 3.14159
undefined
> PI
3.14159

// 箭头函数
> const multiply = (a, b) => a * b
undefined
> multiply(5, 6)
30
```

### REPL 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Tab` | 自动补全（变量、方法、文件路径） |
| `↑` / `↓` | 查看历史命令 |
| `Ctrl + C` | 退出当前命令 |
| `Ctrl + C` (两次) | 退出 REPL |
| `Ctrl + D` | 退出 REPL |
| `Ctrl + L` | 清屏 |
| `.break` | 中止当前输入的多行表达式 |
| `.clear` | 重置 REPL 上下文（清除所有变量） |
| `.exit` | 退出 REPL |
| `.help` | 显示帮助信息 |
| `.save filename` | 保存当前会话到文件 |
| `.load filename` | 加载文件到会话 |
| `.editor` | 进入编辑器模式（支持多行编辑） |

### REPL 特殊变量

```javascript
// _ 变量：存储上次执行结果
> 10 + 20
30
> _
30
> _ * 2
60
> _
60
```

### REPL 内置命令

```javascript
// .help - 显示帮助
> .help

// .editor - 多行编辑模式
> .editor
// Entering editor mode (Ctrl+D to finish, Ctrl+C to cancel)
function greet(name) {
  console.log(`Hello, ${name}!`);
}
// Ctrl+D 退出编辑模式
undefined

// .save - 保存会话
> .save ./session.js
Session saved to: ./session.js

// .load - 加载文件
> .load ./session.js
// 加载并执行文件内容
```

### 自定义 REPL

使用 `repl` 模块创建自定义 REPL 环境：

```javascript
const repl = require('repl');
const util = require('util');

// 创建自定义 REPL
const customRepl = repl.start({
  prompt: 'my-app> ',        // 自定义提示符
  input: process.stdin,      // 输入流
  output: process.stdout,    // 输出流
  useColors: true,           // 使用颜色
  terminal: true,            // 作为终端运行
  ignoreUndefined: true,     // 忽略 undefined 输出
  replMode: repl.REPL_MODE_STRICT  // 严格模式
});

// 添加自定义上下文变量
customRepl.context.myVar = 'Hello';
customRepl.context.config = { port: 3000 };

// 定义自定义命令
customRepl.defineCommand('hello', {
  help: 'Say hello',
  action(name) {
    this.clearBufferedCommand();
    console.log(`Hello, ${name || 'World'}!`);
    this.displayPrompt();
  }
});

// 自定义输出格式
customRepl.writer = (output) => {
  return util.inspect(output, { colors: true, depth: null });
};
```

### REPL 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| prompt | string | '> ' | 提示符 |
| input | Readable | process.stdin | 输入流 |
| output | Writable | process.stdout | 输出流 |
| terminal | boolean | 自动检测 | 是否作为终端运行 |
| eval | Function | 异步 eval | 自定义执行函数 |
| useColors | boolean | true | 使用颜色输出 |
| useGlobal | boolean | false | 使用全局上下文 |
| ignoreUndefined | boolean | false | 忽略 undefined 输出 |
| replMode | string | REPL_MODE_SLOPPY | REPL 模式 |

## 全局对象

Node.js 全局对象在所有模块中都可以直接使用，无需 `require` 引入。理解全局对象对于掌握 Node.js 至关重要。

### global 对象

`global` 是 Node.js 的全局命名空间对象，类似于浏览器的 `window`。

```javascript
// 在全局定义变量
global.myGlobalVar = '全局变量';
console.log(global.myGlobalVar); // '全局变量'

// 检查变量是否在全局
console.log('myGlobalVar' in global); // true

// 注意：直接声明变量不会成为全局变量
var localVar = '局部变量';
console.log(global.localVar); // undefined
console.log(globalThis === global); // true (Node.js 12+)
```

> ⚠️ **注意**：应避免向 `global` 对象添加属性，这可能导致命名冲突和内存泄漏。

### console 对象

`console` 对象用于输出信息到标准输出（stdout）和标准错误（stderr）。

#### 基础输出

```javascript
// 普通日志
console.log('普通日志');
console.log('多个', '参数', 123);
console.log('格式化输出: %s, %d', '字符串', 100);

// 信息输出（等同于 log）
console.info('信息日志');

// 警告输出（输出到 stderr）
console.warn('警告日志');

// 错误输出（输出到 stderr）
console.error('错误日志');
```

#### 计时与性能

```javascript
// 计时器
console.time('计时器名称');
for (let i = 0; i < 1000000; i++) {}
console.timeEnd('计时器名称'); // 计时器名称: 2.123ms

// 多个计时器
console.time('数据库查询');
// ... 查询操作
console.timeLog('数据库查询', '查询中...'); // 记录中间时间
console.timeEnd('数据库查询');

// 性能标记（Node.js 8+）
console.timeStamp('标记点');
```

#### 表格与分组

```javascript
// 表格输出
console.table([
  { name: 'Alice', age: 20, city: 'Beijing' },
  { name: 'Bob', age: 25, city: 'Shanghai' }
]);

// 表格输出特定列
console.table(
  [{ a: 1, b: 2, c: 3 }, { a: 4, b: 5, c: 6 }],
  ['a', 'b']
);

// 分组输出
console.group('用户信息');
console.log('姓名: Alice');
console.log('年龄: 20');
console.groupEnd();

// 折叠分组
console.groupCollapsed('折叠的信息');
console.log('详细信息');
console.groupEnd();
```

#### 调试工具

```javascript
// 堆栈追踪
console.trace('堆栈追踪');

// 断言（条件为 false 时输出错误）
console.assert(1 === 2, '1 不等于 2');
// Assertion failed: 1 不等于 2

console.assert(true, '这不会输出');

// 带格式化的断言
console.assert(
  typeof name === 'string',
  'name 应该是字符串类型，实际是: %s',
  typeof name
);

// 清屏
console.clear();

// 计数器
console.count('counter');  // counter: 1
console.count('counter');  // counter: 2
console.countReset('counter');
console.count('counter');  // counter: 1
```

#### 控制台输出格式化占位符

| 占位符 | 说明 | 示例 |
|--------|------|------|
| `%s` | 字符串 | `console.log('%s', 'hello')` |
| `%d` | 数字 | `console.log('%d', 123)` |
| `%i` | 整数 | `console.log('%i', 3.14)` |
| `%f` | 浮点数 | `console.log('%f', 3.14)` |
| `%j` | JSON | `console.log('%j', {a: 1})` |
| `%o` | 对象 | `console.log('%o', obj)` |
| `%%` | 百分号 | `console.log('100%%')` |

### process 对象

`process` 对象提供当前 Node.js 进程的信息和控制能力，是一个全局的 EventEmitter 实例。

#### 进程信息

```javascript
// 基本信息
console.log('进程 ID:', process.pid);           // 进程 ID
console.log('进程标题:', process.title);        // 进程标题
console.log('CPU 架构:', process.arch);         // 'x64' 或 'arm'
console.log('操作系统:', process.platform);     // 'darwin', 'linux', 'win32'
console.log('Node 版本:', process.version);     // 'v18.17.0'
console.log('版本信息:', process.versions);     // 依赖版本对象
console.log('执行路径:', process.execPath);     // Node 可执行文件路径
console.log('Node 命令:', process.execArgv);    // Node 命令行参数
console.log('工作目录:', process.cwd());        // 当前工作目录

// 详细的版本信息
console.log(process.versions);
// {
//   node: '18.17.0',
//   v8: '10.2.154.26-node.26',
//   uv: '1.44.2',
//   zlib: '1.2.11',
//   ...
// }
```

#### 命令行参数

```javascript
// process.argv 包含命令行参数数组
// [0]: node 可执行文件路径
// [1]: 当前执行的脚本文件路径
// [2+]: 实际传入的参数

// 运行: node app.js --port 3000 --env production
console.log(process.argv);
// [
//   '/usr/local/bin/node',
//   '/path/to/app.js',
//   '--port',
//   '3000',
//   '--env',
//   'production'
// ]

// 解析命令行参数
const args = process.argv.slice(2);
function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      const value = args[i + 1]?.startsWith('--') ? true : args[++i];
      result[key] = value;
    }
  }
  return result;
}
console.log(parseArgs(args));
// { port: '3000', env: 'production' }
```

#### 环境变量

```javascript
// 读取环境变量
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PATH:', process.env.PATH);
console.log('HOME:', process.env.HOME);

// 设置环境变量（仅在当前进程有效）
process.env.MY_VAR = 'my_value';

// 判断运行环境
const isDev = process.env.NODE_ENV === 'development';
const isProd = process.env.NODE_ENV === 'production';

// 跨平台环境变量设置
// package.json
// {
//   "scripts": {
//     "dev": "cross-env NODE_ENV=development node app.js"
//   }
// }
```

#### 内存与 CPU 监控

```javascript
// 内存使用情况
const memory = process.memoryUsage();
console.log(memory);
// {
//   rss: 35323904,        // 常驻内存大小
//   heapTotal: 7340032,   // V8 分配的堆内存总量
//   heapUsed: 4678240,    // 已使用的堆内存
//   external: 1077998,    // C++ 对象占用的内存
//   arrayBuffers: 9382    // ArrayBuffers 占用的内存
// }

// CPU 使用情况
const cpuStart = process.cpuUsage();
// 执行一些操作
for (let i = 0; i < 1000000; i++) {}
const cpuEnd = process.cpuUsage(cpuStart);
console.log(cpuEnd);
// { user: 12345, system: 678 }  // 微秒

// 资源限制（仅在某些系统上可用）
console.log(process.getuid());   // 用户 ID
console.log(process.getgid());   // 组 ID
console.log(process.geteuid());  // 有效用户 ID
console.log(process.getegid());  // 有效组 ID
```

#### 进程控制

```javascript
// 正常退出
process.exit(0);  // 退出码 0 表示成功
process.exit(1);  // 非零退出码表示失败

// 获取/设置退出码
process.exitCode = 1;  // 不立即退出，设置退出码
console.log('退出码:', process.exitCode);

// 监听退出事件
process.on('exit', (code) => {
  console.log(`进程即将退出，退出码：${code}`);
  // 注意：此时只能执行同步操作
});

// 监听警告
process.on('warning', (warning) => {
  console.warn(warning.name);    // 警告名称
  console.warn(warning.message); // 警告消息
  console.warn(warning.stack);   // 堆栈信息
});
```

#### 信号处理

```javascript
// 监听终止信号（优雅关闭）
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号');
  // 清理资源、关闭连接
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});

// 监听中断信号（Ctrl+C）
process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号（Ctrl+C）');
  process.exit(0);
});

// Windows 系统的信号处理
if (process.platform === 'win32') {
  const readline = require('readline');
  readline.createInterface({
    input: process.stdin,
    output: process.stdout
  }).on('SIGINT', () => {
    process.emit('SIGINT');
  });
}

// 常见信号
// SIGTERM - 终止信号
// SIGINT  - 中断信号（Ctrl+C）
// SIGHUP  - 挂起信号
// SIGKILL - 强制终止（无法捕获）
```

#### 异常处理

```javascript
// 未捕获异常
process.on('uncaughtException', (err, origin) => {
  console.error('未捕获异常：', err);
  console.error('来源：', origin);
  
  // 记录错误日志
  fs.writeFileSync('error.log', `${new Date().toISOString()}\n${err.stack}\n`);
  
  // 建议退出进程
  process.exit(1);
});

// 未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝：', reason);
  console.error('Promise：', promise);
});

// 多次 reject 警告
process.on('rejectionHandled', (promise) => {
  // 与 unhandledRejection 配对：被报告为未处理的拒绝，在稍后补上处理器时触发
  console.log('Promise 拒绝已被处理');
});

// 未捕获的异常监控
process.on('uncaughtExceptionMonitor', (err, origin) => {
  // 在 uncaughtException 之前触发
  console.log('监控到未捕获异常');
});
```

#### 标准输入输出

```javascript
// 标准输入
process.stdin.setEncoding('utf8');
process.stdin.on('readable', () => {
  const chunk = process.stdin.read();
  if (chunk !== null) {
    process.stdout.write(`收到: ${chunk}`);
  }
});

// 标准输出
process.stdout.write('输出到标准输出\n');

// 标准错误
process.stderr.write('输出到标准错误\n');

// 管道操作
process.stdin.pipe(process.stdout);

// 检查是否有 TTY
console.log('stdout 是 TTY:', process.stdout.isTTY);
console.log('终端颜色支持:', process.stdout.getColorDepth());
```

### Buffer 类

Buffer 是 Node.js 处理二进制数据的核心类，用于在 V8 堆内存外分配固定大小的内存。

#### 创建 Buffer

```javascript
// 方法一：分配指定大小
const buf1 = Buffer.alloc(10);           // 分配 10 字节，填充 0
const buf2 = Buffer.alloc(10, 1);        // 分配 10 字节，填充 1
const buf3 = Buffer.allocUnsafe(10);     // 分配 10 字节（不初始化，更快但可能含旧数据）
const buf4 = Buffer.allocUnsafeSlow(10); // 在堆外分配

// 方法二：从现有数据创建
const buf5 = Buffer.from('Hello World');           // 从字符串创建
const buf6 = Buffer.from('Hello World', 'utf8');   // 指定编码
const buf7 = Buffer.from([1, 2, 3, 4, 5]);         // 从数组创建
const buf8 = Buffer.from(buf5);                    // 复制另一个 Buffer
const buf9 = Buffer.from('Hello', 'base64');       // 从 Base64 创建

// 方法三：拼接 Buffer
const buf10 = Buffer.concat([buf5, buf7]);
```

#### 字符编码

```javascript
// Node.js 支持的编码
const buf = Buffer.from('Hello 世界');

// 转换为各种编码
console.log(buf.toString('utf8'));      // 'Hello 世界'
console.log(buf.toString('ascii'));     // 'Hello d8\u0016g\u0015\f'（ascii 只保留 7 位，非 ASCII 字节变乱码）
console.log(buf.toString('base64'));    // 'SGVsbG8g5LiW55WM'
console.log(buf.toString('hex'));       // '48656c6c6f20e4b896e7958c'
console.log(buf.toString('binary'));    // Latin-1 编码

// Base64 编码解码
const base64Str = buf.toString('base64');
const decoded = Buffer.from(base64Str, 'base64').toString();

// 编码转换
const utf8Buf = Buffer.from('中文', 'utf8');
const gbkBuf = iconv.encode('中文', 'gbk'); // 需要 iconv-lite 库
```

#### 读写操作

```javascript
const buf = Buffer.alloc(24);

// 写入数据
buf.write('Hello');                    // 写入字符串
buf.write('World', 5);                 // 从偏移量 5 开始写入
buf.write('A', 10, 'utf8');            // 指定编码

// 读取数据
console.log(buf.toString());           // 'HelloWorldA'
console.log(buf.toString('utf8', 0, 5)); // 'Hello'

// 字节级读写
buf[0] = 72;  // 'H' 的 ASCII 码
console.log(buf[0]);  // 72
console.log(String.fromCharCode(buf[0]));  // 'H'

// 写入数值（指定字节序）
buf.writeInt8(127, 0);              // 写入 8 位整数
buf.writeInt16BE(32767, 1);         // 大端序 16 位整数
buf.writeInt16LE(32767, 3);         // 小端序 16 位整数
buf.writeInt32BE(2147483647, 5);    // 大端序 32 位整数
buf.writeFloatBE(3.14, 9);          // 大端序浮点数
buf.writeDoubleBE(3.14159, 13);     // 大端序双精度浮点数

// 读取数值
console.log(buf.readInt8(0));
console.log(buf.readInt16BE(1));
console.log(buf.readInt32BE(5));
```

#### Buffer 操作方法

```javascript
const buf1 = Buffer.from('Hello');
const buf2 = Buffer.from('World');

// 比较
console.log(buf1.equals(buf2));              // false
console.log(buf1.compare(buf2));             // -1 (buf1 < buf2)

// 复制
const buf3 = Buffer.alloc(5);
buf1.copy(buf3);                             // 复制 buf1 到 buf3
buf1.copy(buf3, 0, 1, 3);                    // 复制部分内容

// 切片（返回新 Buffer）
const buf4 = buf1.slice(0, 3);               // 'Hel'（slice 已废弃，推荐 subarray）
const buf5 = buf1.subarray(0, 3);            // 'Hel'（与 slice 等价，共享内存不复制）

// 查找
console.log(buf1.indexOf('l'));              // 2
console.log(buf1.lastIndexOf('l'));          // 3
console.log(buf1.includes('el'));            // true

// 填充
const buf6 = Buffer.alloc(10);
buf6.fill('a');                              // 'aaaaaaaaaa'
buf6.fill('ab');                             // 'ababababab'
buf6.fill(0);                                // '\0\0\0\0\0\0\0\0\0\0'

// 交换字节序（要求长度为 2/4/8 的倍数）
const buf7 = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
buf7.swap16();  // 交换 16 位
buf7.swap32();  // 交换 32 位
buf7.swap64();  // 交换 64 位

// JSON 转换
console.log(buf1.toJSON());
// { type: 'Buffer', data: [ 72, 101, 108, 108, 111 ] }
```

#### Buffer 静态属性与方法

```javascript
// 静态常量
console.log(Buffer.poolSize);              // 8192 (池化大小)

// 静态方法
console.log(Buffer.byteLength('Hello'));   // 5
console.log(Buffer.byteLength('中文'));    // 6 (UTF-8 编码)
console.log(Buffer.isBuffer(buf1));        // true
console.log(Buffer.isEncoding('utf8'));    // true

// Buffer 比较数组
const arr = [Buffer.from('a'), Buffer.from('b'), Buffer.from('c')];
arr.sort(Buffer.compare);
```

#### Buffer 最佳实践

```javascript
// ✅ 推荐：使用 Buffer.from() 和 Buffer.alloc()
const good = Buffer.from('Hello');
const good2 = Buffer.alloc(10);

// ❌ 不推荐：使用已弃用的构造函数
// new Buffer(10)        // 已弃用
// new Buffer('Hello')   // 已弃用

// ✅ 推荐：检查长度
if (buf.length > 0) {
  // 处理数据
}

// ✅ 推荐：使用 Buffer.concat 拼接
const chunks = [Buffer.from('Hello'), Buffer.from('World')];
const result = Buffer.concat(chunks);

// ✅ 性能优化：复用 Buffer
const pool = Buffer.allocUnsafe(1024);
// 多次使用 pool...

// ✅ 安全地处理未知数据
function safeToString(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new TypeError('Expected a Buffer');
  }
  return buffer.toString('utf8');
}
```

### 定时器函数

Node.js 提供多种定时器函数，理解它们的执行顺序非常重要。

#### 定时器类型

```javascript
// setTimeout：延时执行
const timeoutId = setTimeout(() => {
  console.log('延时执行');
}, 1000);
clearTimeout(timeoutId);

// setInterval：定时重复执行
const intervalId = setInterval(() => {
  console.log('定时执行');
}, 1000);
clearInterval(intervalId);

// setImmediate：下一个检查点执行
const immediateId = setImmediate(() => {
  console.log('立即执行');
});
clearImmediate(immediateId);

// process.nextTick：当前操作完成后立即执行
process.nextTick(() => {
  console.log('nextTick 执行');
});
```

#### 执行顺序详解

```
┌─────────────────────────────────────┐
│           timers (定时器)            │
│   setTimeout / setInterval          │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│       pending callbacks             │
│    执行 I/O 回调（上一轮延迟的）       │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│       idle, prepare                 │
│         仅内部使用                    │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           poll (轮询)                │
│     检索新的 I/O 事件                 │
│     执行 I/O 相关回调                 │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│           check (检查)               │
│        setImmediate 回调             │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│       close callbacks               │
│     关闭回调（socket.on('close')）    │
└─────────────────────────────────────┘

nextTick 和 Promise 微任务在每个阶段之间执行
```

#### 执行顺序示例

```javascript
// 示例：演示执行顺序
const fs = require('fs');

// 设置定时器
setTimeout(() => console.log('setTimeout'), 0);

// 设置立即执行
setImmediate(() => console.log('setImmediate'));

// nextTick
process.nextTick(() => console.log('nextTick'));

// Promise 微任务
Promise.resolve().then(() => console.log('Promise'));

// I/O 回调中的执行顺序
fs.readFile(__filename, () => {
  setTimeout(() => console.log('I/O setTimeout'), 0);
  setImmediate(() => console.log('I/O setImmediate'));
  // 在 I/O 回调中，setImmediate 总是先于 setTimeout
});

// 输出顺序（主模块）：
// 1. nextTick
// 2. Promise
// 3. setTimeout 或 setImmediate（顺序不确定）
// 4. setTimeout 或 setImmediate
// 5. I/O setImmediate
// 6. I/O setTimeout
```

#### 定时器对比表

| 方法 | 执行时机 | 返回值 | 用途 |
|------|----------|--------|------|
| `setTimeout` | 指定毫秒后 | timeoutId | 延时执行 |
| `setInterval` | 每隔指定毫秒 | intervalId | 定时重复 |
| `setImmediate` | I/O 事件回调之后 | immediateId | 尽快执行 |
| `process.nextTick` | 当前操作完成后 | 无 | 最高优先级 |
| `Promise.then` | 微任务队列 | Promise | 异步操作 |
| `queueMicrotask` | 微任务队列 | 无 | 微任务 |

#### 定时器注意事项

```javascript
// 1. 定时器不保证精确时间
setTimeout(() => {
  console.log('可能超过 100ms');
}, 100);

// 2. 阻塞代码会影响定时器
setTimeout(() => console.log('延时'), 100);
// 阻塞操作
const start = Date.now();
while (Date.now() - start < 200) {} // 定时器会在 200ms 后执行

// 3. setInterval 可能被跳过
setInterval(() => {
  // 如果执行时间超过间隔，下次可能被跳过
}, 100);

// 4. 传递参数给定时器
setTimeout((a, b, c) => {
  console.log(a, b, c);
}, 1000, 1, 2, 3);

// 5. 取消所有定时器（不推荐使用）
// clearTimeout() / clearInterval() / clearImmediate()
```

#### 防抖与节流

```javascript
// 防抖：频繁触发只执行最后一次
function debounce(fn, delay) {
  let timer = null;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 节流：固定时间间隔执行
function throttle(fn, delay) {
  let last = 0;
  return function(...args) {
    const now = Date.now();
    if (now - last >= delay) {
      last = now;
      fn.apply(this, args);
    }
  };
}

// 使用示例
const debouncedSave = debounce(save, 300);
const throttledScroll = throttle(handleScroll, 100);
```

### 模块相关全局对象

```javascript
// __dirname：当前文件所在目录的绝对路径
console.log(__dirname);
// '/Users/name/project/src'

// __filename：当前文件的绝对路径
console.log(__filename);
// '/Users/name/project/src/app.js'

// module：当前模块对象
console.log(module);
// {
//   id: '.',
//   exports: {},
//   parent: null,
//   filename: '/path/to/file.js',
//   loaded: false,
//   children: [],
//   paths: [...]
// }

// exports：导出对象（module.exports 的引用）
exports.name = 'MyModule';
exports.func = () => {};

// 等同于
module.exports.name = 'MyModule';
module.exports.func = () => {};

// require：加载模块函数
const fs = require('fs');
const myModule = require('./myModule');

// require 的属性
console.log(require.resolve('./myModule')); // 解析模块路径
console.log(require.cache);                  // 缓存的模块
console.log(require.main);                   // 主模块
console.log(require.extensions);             // 支持的扩展名

// 清除模块缓存
delete require.cache[require.resolve('./myModule')];

// 条件加载
let config;
if (process.env.NODE_ENV === 'production') {
  config = require('./config.prod');
} else {
  config = require('./config.dev');
}
```

### URL 相关全局对象

#### URL 类

```javascript
// 创建 URL 对象
const url = new URL('https://example.com:443/path/name?query=1&sort=desc#hash');

// URL 属性
console.log(url.href);      // 完整 URL
console.log(url.origin);    // 'https://example.com:443'
console.log(url.protocol);  // 'https:'
console.log(url.host);      // 'example.com:443'
console.log(url.hostname);  // 'example.com'
console.log(url.port);      // '443'
console.log(url.pathname);  // '/path/name'
console.log(url.search);    // '?query=1&sort=desc'
console.log(url.hash);      // '#hash'

// 修改 URL
url.pathname = '/new/path';
url.searchParams.set('page', '2');
console.log(url.href);
// 'https://example.com:443/new/path?query=1&sort=desc&page=2#hash'

// URL 静态方法
console.log(URL.canParse('https://example.com')); // true
console.log(new URL('/path', 'https://example.com')); // 构造 URL
```

#### URLSearchParams

```javascript
// 创建 URLSearchParams
const params = new URLSearchParams('a=1&b=2&c=3');
const params2 = new URLSearchParams({ a: 1, b: 2 });
const params3 = new URLSearchParams([['a', 1], ['b', 2]]);

// 常用方法
params.append('d', '4');        // 追加参数
params.set('a', '100');         // 设置/覆盖参数
params.get('a');                // '100'
params.getAll('a');             // ['100']（如果有多个同名参数）
params.has('a');                // true
params.delete('a');             // 删除参数
params.sort();                  // 排序

// 遍历
for (const [key, value] of params) {
  console.log(key, value);
}

// 转换
console.log(params.toString());  // 'b=2&c=3&d=4'
console.log([...params.keys()]); // ['b', 'c', 'd']
console.log([...params.values()]); // ['2', '3', '4']

// 与 URL 配合
const url = new URL('https://example.com/api');
url.searchParams.set('q', 'nodejs');
url.searchParams.set('limit', '10');
console.log(url.toString());
// 'https://example.com/api?q=nodejs&limit=10'
```

### 其他全局对象

#### TextEncoder / TextDecoder

```javascript
// TextEncoder：字符串转 Uint8Array
const encoder = new TextEncoder();
const encoded = encoder.encode('Hello 世界');
console.log(encoded); // Uint8Array(12) [72, 101, 108, 108, 111, 32, 228, ...]

// TextDecoder：Uint8Array 转字符串
const decoder = new TextDecoder('utf-8');
const decoded = decoder.decode(encoded);
console.log(decoded); // 'Hello 世界'

// 指定编码
const gbkDecoder = new TextDecoder('gbk');
const utf16Decoder = new TextDecoder('utf-16');
```

#### queueMicrotask

```javascript
// queueMicrotask：添加微任务
queueMicrotask(() => {
  console.log('微任务执行');
});

// 等同于
Promise.resolve().then(() => {
  console.log('微任务执行');
});

// 使用场景
function doSomethingAsync(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Callback must be a function');
  }
  
  queueMicrotask(() => {
    callback('result');
  });
}
```

#### AbortController

```javascript
// AbortController：取消异步操作
const controller = new AbortController();
const signal = controller.signal;

// 取消操作
controller.abort();

// 检查是否已取消
console.log(signal.aborted); // true

// 监听取消事件
signal.addEventListener('abort', () => {
  console.log('操作已取消');
});

// 配合 fetch 使用
async function fetchData(url, signal) {
  try {
    const response = await fetch(url, { signal });
    return response.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('请求已取消');
    } else {
      throw err;
    }
  }
}

// 配合 setTimeout
function fetchWithTimeout(url, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  return fetch(url, { signal: controller.signal })
    .finally(() => clearTimeout(timeoutId));
}
```

#### Event / EventTarget

```javascript
// Node.js 15+ 支持全局 Event 和 EventTarget
const target = new EventTarget();

// 添加监听器
target.addEventListener('custom', (event) => {
  console.log('收到事件:', event.detail);
});

// 触发事件
const event = new Event('custom');
event.detail = { data: 'test' };
target.dispatchEvent(event);

// 移除监听器
const handler = (e) => console.log('handle');
target.addEventListener('event', handler);
target.removeEventListener('event', handler);
```

#### structuredClone

```javascript
// structuredClone：深拷贝
const original = {
  name: 'Alice',
  date: new Date(),
  regex: /test/g,
  map: new Map([['a', 1]]),
  set: new Set([1, 2, 3])
};

const cloned = structuredClone(original);
console.log(cloned);
// { name: 'Alice', date: Date, regex: /test/g, map: Map, set: Set }

// 与 JSON.parse(JSON.stringify()) 的区别
const obj = { date: new Date() };
const jsonClone = JSON.parse(JSON.stringify(obj)); // date 变成字符串
const deepClone = structuredClone(obj);            // date 保持为 Date 对象
```

## 全局对象对比：浏览器 vs Node.js

| 浏览器 | Node.js | 说明 |
|--------|---------|------|
| `window` | `global` | 全局对象 |
| `document` | - | DOM 文档对象 |
| `navigator` | - | 浏览器信息 |
| `location` | `URL` | URL 信息 |
| `history` | - | 浏览历史 |
| `localStorage` | - | 本地存储 |
| `sessionStorage` | - | 会话存储 |
| `alert/confirm/prompt` | - | 对话框 |
| `fetch` | `fetch` | 网络请求 |
| `WebSocket` | `WebSocket` | WebSocket |
| `setTimeout` | `setTimeout` | 定时器 |
| `setInterval` | `setInterval` | 定时器 |
| - | `process` | 进程对象 |
| - | `Buffer` | 二进制数据处理 |
| - | `global` | 全局命名空间 |
| - | `__dirname` | 当前目录路径 |
| - | `__filename` | 当前文件路径 |
| - | `module/exports/require` | 模块系统 |

## 最佳实践

### 1. 避免污染全局命名空间

```javascript
// ❌ 不推荐
global.myVar = 'value';
global.myFunc = () => {};

// ✅ 推荐：使用模块导出
// myModule.js
module.exports = {
  myVar: 'value',
  myFunc: () => {}
};

// app.js
const { myVar, myFunc } = require('./myModule');
```

### 2. 使用环境变量管理配置

```javascript
// ❌ 硬编码
const config = {
  dbHost: 'localhost',
  dbPort: 3306,
  dbUser: 'root',
  dbPass: 'password'
};

// ✅ 使用环境变量
const config = {
  dbHost: process.env.DB_HOST || 'localhost',
  dbPort: parseInt(process.env.DB_PORT) || 3306,
  dbUser: process.env.DB_USER || 'root',
  dbPass: process.env.DB_PASS
};

// ✅ 使用 dotenv 库管理环境变量
// npm install dotenv
require('dotenv').config();
```

### 3. 正确处理异常

```javascript
// 捕获未处理异常
process.on('uncaughtException', (err) => {
  console.error('未捕获异常：', err);
  // 记录日志
  logger.error('Uncaught Exception', err);
  // 优雅退出
  process.exit(1);
});

// 捕获未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝：', reason);
  logger.error('Unhandled Rejection', reason);
});

// 使用 domain 处理异步错误（已弃用，推荐使用 async/await + try-catch）
async function safeAsync() {
  try {
    await riskyOperation();
  } catch (err) {
    console.error('操作失败:', err);
  }
}
```

### 4. 优雅退出

```javascript
// 优雅退出模式
let isShuttingDown = false;

// 监听退出信号
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  
  console.log('开始优雅退出...');
  
  // 1. 停止接受新连接
  server.close(() => {
    console.log('HTTP 服务器已关闭');
  });
  
  // 2. 关闭数据库连接
  database.close(() => {
    console.log('数据库连接已关闭');
  });
  
  // 3. 关闭 Redis 连接
  redis.quit(() => {
    console.log('Redis 连接已关闭');
  });
  
  // 4. 强制退出超时
  setTimeout(() => {
    console.error('强制退出');
    process.exit(1);
  }, 30000);
  
  // 5. 完成退出
  Promise.all([
    closeServer(),
    closeDatabase(),
    closeRedis()
  ]).then(() => {
    console.log('优雅退出完成');
    process.exit(0);
  });
}
```

### 5. Buffer 安全使用

```javascript
// ✅ 推荐
const buf = Buffer.alloc(10);  // 初始化为 0
const buf2 = Buffer.from('data');

// ❌ 避免（除非性能关键）
const buf3 = Buffer.allocUnsafe(10);
// 如果使用，必须手动初始化
buf3.fill(0);

// ✅ 验证输入
function processBuffer(input) {
  if (!Buffer.isBuffer(input)) {
    throw new TypeError('Expected a Buffer');
  }
  // 处理 Buffer
}

// ✅ 处理大数据
function processLargeFile(fd) {
  const BUFFER_SIZE = 64 * 1024; // 64KB
  const buffer = Buffer.alloc(BUFFER_SIZE);
  
  let bytesRead;
  while ((bytesRead = fs.readSync(fd, buffer, 0, BUFFER_SIZE, null)) > 0) {
    processChunk(buffer.slice(0, bytesRead));
  }
}
```

### 6. 定时器管理

```javascript
// ✅ 使用 Set 管理定时器
const timers = new Set();

function addTimer(callback, delay) {
  const id = setTimeout(() => {
    timers.delete(id);
    callback();
  }, delay);
  timers.add(id);
  return id;
}

function clearAllTimers() {
  for (const id of timers) {
    clearTimeout(id);
    timers.delete(id);
  }
}

// ✅ 使用 ref/unref 控制进程退出
const timer = setInterval(() => {}, 1000);
timer.unref(); // 允许进程退出（即使定时器还在运行）
timer.ref();   // 阻止进程退出

// ✅ 使用 setTimeout 替代 setInterval
function reliableInterval(fn, delay) {
  function run() {
    fn().finally(() => {
      setTimeout(run, delay);
    });
  }
  run();
}
```

## 常见问题解答

### Q1: REPL 中如何处理异步代码？

```javascript
// Node.js 16.6+ 的 REPL 已默认支持顶层 await，无需任何标志
node

// 然后可以在 REPL 中直接使用 await
> const data = await fetch('https://api.example.com/data');
> console.log(data);

// 或者使用 .then()
> fetch('https://api.example.com/data').then(console.log)
```

### Q2: setTimeout 和 setImmediate 有什么区别？

在主模块中，执行顺序不确定；在 I/O 回调中，setImmediate 总是先执行。推荐在 I/O 回调中使用 setImmediate。

```javascript
// I/O 回调中的执行顺序是确定的
fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
});
// 输出: immediate, timeout
```

### Q3: process.nextTick 和 setImmediate 有什么区别？

- `process.nextTick` 在当前操作完成后立即执行，优先级最高
- `setImmediate` 在下一个事件循环的 check 阶段执行

```javascript
setImmediate(() => console.log('immediate'));
process.nextTick(() => console.log('nextTick'));
// 输出: nextTick, immediate
```

### Q4: 如何安全地处理大文件？

```javascript
// 使用流处理大文件
const fs = require('fs');
const crypto = require('crypto');

function hashLargeFile(filepath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filepath);
    
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}
```

### Q5: 如何检测内存泄漏？

```javascript
// 使用 process.memoryUsage() 监控
setInterval(() => {
  const { heapUsed, heapTotal } = process.memoryUsage();
  console.log(`Heap: ${heapUsed / 1024 / 1024} MB / ${heapTotal / 1024 / 1024} MB`);
}, 10000);

// 使用 --inspect 标志启动调试
node --inspect app.js

// 然后在 Chrome DevTools 中查看内存快照
```

### Q6: 如何正确获取命令行参数？

```javascript
// 使用 process.argv.slice(2)
const args = process.argv.slice(2);

// 或使用命令行参数解析库
// npm install commander yargs minimist

// 使用 minimist
const minimist = require('minimist');
const argv = minimist(process.argv.slice(2));
console.log(argv); // { _: [], port: 3000, env: 'production' }

// 使用 commander
const { program } = require('commander');
program
  .option('-p, --port <number>', '端口号', 3000)
  .option('-e, --env <string>', '环境', 'development')
  .parse();
console.log(program.opts());
```

### Q7: 如何正确处理 JSON 中的 Buffer？

```javascript
// Buffer 在 JSON.stringify 后变成对象
const buf = Buffer.from('Hello');
const json = JSON.stringify(buf);
console.log(json); // {"type":"Buffer","data":[72,101,108,108,111]}

// 反序列化
const parsed = JSON.parse(json);
const buf2 = Buffer.from(parsed.data);

// 或者使用 toJSON 的结果
const buf3 = Buffer.from(JSON.parse(json).data);
```

## 总结

本章详细介绍了 Node.js 的 REPL 环境和全局对象：

- **REPL 环境**：交互式调试工具，支持自定义配置
- **console**：日志输出和调试工具
- **process**：进程信息和控制
- **Buffer**：二进制数据处理
- **定时器**：setTimeout、setInterval、setImmediate、nextTick
- **模块相关**：__dirname、__filename、module、exports、require
- **URL 相关**：URL、URLSearchParams
- **其他全局对象**：TextEncoder、TextDecoder、AbortController 等

理解这些全局对象是掌握 Node.js 的基础，合理使用它们可以提高开发效率和程序质量。

---

## Node.js 22+ REPL 与全局对象新特性

### REPL 增强

Node.js 22+ 支持直接运行 TypeScript 文件（类型剥离不改变语义，仅删除类型注解）：

```bash
# Node.js 22.6 - 23.5：运行 .ts 文件需加标志
node --experimental-strip-types app.ts

# Node.js 23.6+：默认启用类型剥离
node app.ts
```

> 注意：类型剥离作用于 `.ts` 文件执行，REPL 交互环境中目前仍不支持 TS 类型语法（Node 24 实测）。

### 现代全局 API

Node.js 22+ 新增了多个 Web 标准全局 API，无需 `require` 即可使用：

```javascript
// 全局 fetch（替代 node-fetch）
const res = await fetch('https://api.example.com/data')

// 全局 WebSocket（替代 ws 库）
const ws = new WebSocket('ws://localhost:8080')

// structuredClone 深拷贝（替代 lodash.cloneDeep）
const cloned = structuredClone(original)

// Web Crypto API
crypto.randomUUID()  // 生成 UUID
await crypto.subtle.digest('SHA-256', data)  // 哈希计算

// Web Streams API
const stream = new ReadableStream({ ... })

// BroadcastChannel 跨线程通信
const channel = new BroadcastChannel('my-channel')
```

### process 对象新属性

```javascript
// Node.js 22+ 新增
process.constrainedMemory()  // 获取受约束的内存量
process.availableMemory()    // 获取可用内存量

// 权限模型相关
process.permission.has('fs.read')    // 检查文件读取权限
process.permission.has('net')        // 检查网络权限
```
