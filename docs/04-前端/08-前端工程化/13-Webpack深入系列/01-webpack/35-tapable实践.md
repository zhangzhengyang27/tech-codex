---
title: Tapable 实践练习
description: Tapable 的实践练习，通过实际案例掌握各种 Hook 的使用方式
keywords: [Tapable, 实践, Hook使用, 插件模式, 事件驱动]
category: tools
tags: [Webpack, 构建工具]
---

# tapable 实践练习

## 概述

通过动手实践掌握 tapable 各类 Hook 的使用方法。本文覆盖 SyncHook、AsyncSeriesHook、AsyncParallelHook、tapPromise、Waterfall、Bail、Loop 的完整代码示例，并总结参数传递规则与异步回调约定。

## 前置知识

- tapable 核心库详解（Hook 类型与执行机制）
- Node.js 异步编程（setTimeout、callback、Promise）
- 参见：[tapable 核心库详解](34-tapable核心库.md)

## 学习目标

- 独立完成 SyncHook 多参数注册与调用
- 掌握 AsyncSeriesHook 的 tapAsync/callAsync 与错误中断
- 掌握 AsyncParallelHook 的并行执行与错误处理
- 理解 tapPromise 与 tapAsync 的对应关系
- 实践 Waterfall 值传递、Bail 截断、Loop 循环

## 一、项目初始化

```bash
mkdir tapable-demo && cd tapable-demo
npm init -y
npm install tapable
npm install nodemon -D
```

```json
// package.json
{
  "scripts": {
    "start": "nodemon index.js"
  }
}
```

## 二、SyncHook 同步钩子

### 2.1 基础用法

```javascript
const { SyncHook } = require('tapable');

const hook = new SyncHook(['name']);

hook.tap('A', (name) => console.log('A:', name));
hook.tap('B', (name) => console.log('B:', name));

hook.call('tom');
// A: tom
// B: tom
```

### 2.2 多参数

```javascript
const hook = new SyncHook(['arg1', 'arg2']);

hook.tap('A', (arg1, arg2) => console.log('A:', arg1, arg2));
hook.tap('B', (arg1, arg2) => console.log('B:', arg1, arg2));

hook.call('value1', 'value2');
// A: value1 value2
// B: value1 value2
```

### 2.3 参数传递注意事项

```javascript
// 错误：用数组传递（只有一个参数被接收）
hook.call(['value1', 'value2']);

// 正确：分开传递
hook.call('value1', 'value2');
```

> `call` 的参数数量必须与构造时定义的参数名数量一致，形参与实参一一对应。

## 三、AsyncSeriesHook 异步串行

### 3.1 tapAsync + callAsync

```javascript
const { AsyncSeriesHook } = require('tapable');
const hook = new AsyncSeriesHook(['arg1', 'arg2']);

hook.tapAsync('A', (arg1, arg2, callback) => {
  setTimeout(() => {
    console.log('A:', arg1, arg2);
    callback();  // 必须调用，表示完成
  }, 1000);
});

hook.tapAsync('B', (arg1, arg2, callback) => {
  setTimeout(() => {
    console.log('B:', arg1, arg2);
    callback();
  }, 2000);
});

console.time('total');
hook.callAsync('v1', 'v2', (err) => {
  console.timeEnd('total');  // total: ~3s（串行累加）
  console.log(err ? `Error: ${err}` : 'Done');
});
```

### 3.2 错误中断

```javascript
hook.tapAsync('A', (arg1, callback) => {
  setTimeout(() => { callback(); }, 1000);        // 正常
});

hook.tapAsync('B', (arg1, callback) => {
  setTimeout(() => { callback('error from B'); }, 500);  // 错误！
});

hook.tapAsync('C', (arg1, callback) => {
  console.log('C 不会执行');
  callback();
});

hook.callAsync('test', (err) => {
  console.log('Final:', err);  // Final: error from B
});
// A（1s）→ B（0.5s）→ 中断，C 不执行
```

### 3.3 执行时序

```
串行：[A: 1s] → [B: 2s] → [C: 0.5s]
总时间 = 1 + 2 + 0.5 = 3.5s

错误中断：[A] → [B: callback(err)] → ✗ 后续不执行
```

## 四、AsyncParallelHook 异步并行

### 4.1 基础示例

```javascript
const { AsyncParallelHook } = require('tapable');
const hook = new AsyncParallelHook(['arg1']);

console.time('total');

hook.tapAsync('A', (arg1, cb) => setTimeout(() => { console.log('A'); cb(); }, 1000));
hook.tapAsync('B', (arg1, cb) => setTimeout(() => { console.log('B'); cb(); }, 500));
hook.tapAsync('C', (arg1, cb) => setTimeout(() => { console.log('C'); cb(); }, 2000));

hook.callAsync('test', () => {
  console.timeEnd('total');  // total: ~2s（取最长）
});
// 输出顺序：B(0.5s) → A(1s) → C(2s) → Done
```

### 4.2 错误处理

```javascript
hook.tapAsync('A', (arg1, cb) => setTimeout(() => { console.log('a'); cb(); }, 1000));
hook.tapAsync('B', (arg1, cb) => setTimeout(() => { console.log('b'); cb('error'); }, 500));
hook.tapAsync('C', (arg1, cb) => setTimeout(() => { console.log('c'); cb(); }, 2000));

hook.callAsync('test', (err) => {
  console.log('callback:', err);  // 0.5s 后立即触发
});
// b(0.5s) → callback: error → a(1s, 仍执行但结果忽略) → c(2s, 同上)
```

> 异步并行中，第一个错误立即触发最终回调，但其他已启动的异步操作（如 setTimeout）仍会执行，只是结果被忽略。

## 五、tapPromise 方式

### 5.1 基础用法

```javascript
const { AsyncSeriesHook } = require('tapable');
const hook = new AsyncSeriesHook(['arg1']);

hook.tapPromise('A', (arg1) => {
  return new Promise((resolve) => {
    setTimeout(() => { console.log('A:', arg1); resolve(); }, 1000);
  });
});

hook.tapPromise('B', (arg1) => {
  return new Promise((resolve) => {
    setTimeout(() => { console.log('B:', arg1); resolve(); }, 500);
  });
});

hook.promise('test')
  .then(() => console.log('All done'))
  .catch((err) => console.log('Error:', err));
```

### 5.2 错误处理

```javascript
hook.tapPromise('B', (arg1) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => reject('error from B'), 500);
  });
});

hook.promise('test').catch((err) => console.log(err));
// 后续 tap 不执行
```

### 5.3 对照表

| tapAsync | tapPromise |
|----------|------------|
| `callback()` | `resolve()` |
| `callback(err)` | `reject(err)` |
| `hook.callAsync(args, cb)` | `hook.promise(args).then().catch()` |

## 六、Waterfall / Bail / Loop 实践

### 6.1 AsyncSeriesWaterfallHook

```javascript
const { AsyncSeriesWaterfallHook } = require('tapable');
const hook = new AsyncSeriesWaterfallHook(['value']);

hook.tapPromise('A', (val) => {
  return new Promise((resolve) => setTimeout(() => resolve(val + ' → A'), 100));
});

hook.tapPromise('B', (val) => {
  console.log('B received:', val);  // "start → A"
  return new Promise((resolve) => setTimeout(() => resolve(val + ' → B'), 100));
});

hook.promise('start').then((result) => console.log('Final:', result));
// Final: start → A → B
```

### 6.2 SyncBailHook

```javascript
const { SyncBailHook } = require('tapable');
const hook = new SyncBailHook(['arg']);

hook.tap('A', () => undefined);       // 继续
hook.tap('B', () => 'intercepted');   // 截断
hook.tap('C', () => console.log('C')); // 不执行

const result = hook.call('test');
console.log(result); // 'intercepted'
```

### 6.3 SyncLoopHook

```javascript
const { SyncLoopHook } = require('tapable');
let attempts = 0;
const hook = new SyncLoopHook([]);

hook.tap('Check', () => {
  attempts++;
  if (attempts < 3) return 'retry';
  return undefined;  // 第 3 次通过
});

hook.tap('Done', () => console.log('Completed'));

hook.call();
// Completed（循环 3 次后执行 Done）
```

## 七、注册与调用方法速查

| Hook 类型 | 注册 | 调用 | 特点 |
|-----------|------|------|------|
| SyncHook | tap | call | 同步依次执行 |
| SyncBailHook | tap | call | 非 undefined 截断 |
| SyncWaterfallHook | tap | call | 返回值传递 |
| SyncLoopHook | tap | call | 非 undefined 时当前回调循环重试 |
| AsyncSeriesHook | tapAsync / tapPromise | callAsync / promise | 异步串行 |
| AsyncParallelHook | tapAsync / tapPromise | callAsync / promise | 异步并行 |
| AsyncSeriesWaterfallHook | tapPromise | promise | 异步串行值传递 |

## 常见问题

| 问题 | 解答 |
|------|------|
| call 参数用数组传可以吗？ | 不可以，必须逐个传递，与构造参数名一一对应 |
| tapAsync 忘记调用 callback 会怎样？ | 构建挂起，后续 tap 永远不执行 |
| 并行 Hook 中错误后其他任务还执行吗？ | setTimeout 等已调度的异步操作仍执行，但回调结果被忽略 |
| Waterfall 中间返回 undefined 会怎样？ | 下一个 tap 收到 undefined 作为参数 |

## 最佳实践

1. **使用 console.time/timeEnd 验证串行/并行时序**：直观感受执行差异
2. **错误处理必须覆盖**：callAsync 的最终回调和 promise 的 catch 都要处理
3. **从简单 Hook 开始**：先掌握 SyncHook，再进阶到异步类型
4. **关注 callback 调用时机**：确保在异步操作完成后才调用

## 延伸阅读

- [tapable GitHub 仓库](https://github.com/webpack/tapable)
- [tapable 单元测试（学习用例）](https://github.com/webpack/tapable/tree/main/__tests__)

---

**上一篇：** [tapable 核心库详解](34-tapable核心库.md)
**下一篇：** [tapable 源码实现](36-tapable源码实现.md) — 手动实现 SyncHook 与 AsyncSeriesHook
