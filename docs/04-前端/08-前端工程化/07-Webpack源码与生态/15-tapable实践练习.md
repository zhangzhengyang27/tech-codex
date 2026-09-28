---
title: "tapable实践练习"
description: 通过实战练习掌握 tapable 的 SyncHook/AsyncHook 用法
keywords: [Webpack, tapable, 实践]
category: 前端工程化
---


# tapable实践练习

## 一、环境准备

以下练习均基于 tapable 库（Webpack 的核心依赖，也可独立安装使用）：

```bash
npm install tapable
```

示例文件统一命名为 `index.js`，使用 `node index.js` 运行并对照注释中的输出。

## 二、SyncHook 同步钩子实践

### 2.1 基础示例

```javascript
// index.js
const { SyncHook } = require('tapable');

// 创建 Hook，定义参数名称
const hook = new SyncHook(['name']);

// 注册插件 A
hook.tap('A', (name) => {
  console.log('A:', name);
});

// 注册插件 B
hook.tap('B', (name) => {
  console.log('B:', name);
});

// 调用 Hook
hook.call('tom');

// 输出：
// A: tom
// B: tom
```

### 2.2 关键点说明

```
SyncHook 使用要点：
├── 创建：new SyncHook(['参数名1', '参数名2', ...])
├── 注册：hook.tap('名称', callback)
├── 调用：hook.call(参数1, 参数2, ...)
└── 特点：先注册先执行，依次调用
```

### 2.3 多参数示例

```javascript
const { SyncHook } = require('tapable');

// 定义两个参数
const hook = new SyncHook(['arg1', 'arg2']);

// 注册 - 接收两个参数
hook.tap('A', (arg1, arg2) => {
  console.log('A:', arg1, arg2);
});

hook.tap('B', (arg1, arg2) => {
  console.log('B:', arg1, arg2);
});

// 调用 - 传递两个参数
hook.call('value1', 'value2');

// 输出：
// A: value1 value2
// B: value1 value2
```

### 2.4 参数传递注意事项

```javascript
// ❌ 错误写法：用数组传递
hook.call(['value1', 'value2']);  // 只有一个参数被接收

// ✅ 正确写法：分开传递
hook.call('value1', 'value2');    // 两个参数都被接收
```

> **重要**：`call` 方法的参数数量必须与回调函数定义的参数数量一致，形参与实参一一对应。

---

## 三、AsyncSeriesHook 异步串行钩子

### 3.1 tapAsync 方式

```javascript
const { AsyncSeriesHook } = require('tapable');

// 创建 Hook
const hook = new AsyncSeriesHook(['arg1', 'arg2']);

// 注册 - 使用 tapAsync
hook.tapAsync('A', (arg1, arg2, callback) => {
  setTimeout(() => {
    console.log('A async hook:', arg1, arg2);
    callback(); // 必须调用 callback 表示完成
  }, 1000);
});

hook.tapAsync('B', (arg1, arg2, callback) => {
  setTimeout(() => {
    console.log('B async hook:', arg1, arg2);
    callback();
  }, 2000);
});

// 调用 - 使用 callAsync
console.time('timer');
hook.callAsync('value1', 'value2', (err) => {
  console.timeEnd('timer');
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('callback is called');
  }
});

// 输出：
// A async hook: value1 value2  (1秒后)
// B async hook: value1 value2  (再2秒后)
// timer: 3s                     (总共约3秒)
// callback is called
```

### 3.2 错误中断机制

```javascript
const { AsyncSeriesHook } = require('tapable');

const hook = new AsyncSeriesHook(['arg1']);

hook.tapAsync('A', (arg1, callback) => {
  setTimeout(() => {
    console.log('A');
    callback(); // 正常完成
  }, 1000);
});

hook.tapAsync('B', (arg1, callback) => {
  setTimeout(() => {
    console.log('B');
    callback('error occurred'); // 传入非空值 = 错误
  }, 2000);
});

hook.tapAsync('C', (arg1, callback) => {
  setTimeout(() => {
    console.log('C'); // 不会执行！
    callback();
  }, 500);
});

hook.callAsync('test', (err) => {
  if (err) {
    console.log('Error:', err);
  }
});

// 输出：
// A (1秒后)
// B (再2秒后)
// Error: error occurred (C 不会执行)
```

### 3.3 执行流程图

```
AsyncSeriesHook 执行流程：

[A] ──等待──► callback() ──► [B] ──等待──► callback() ──► [C] ──等待──► callback()
 │                              │                              │
 1秒                            2秒                            0.5秒
 │                              │                              │
 └──────────────────────────────┴──────────────────────────────┘
                            总时间 ≈ 3.5秒（串行累加）

如果中间 callback(error)：
[A] ──► callback() ──► [B] ──► callback(err) ──►  中断
                                               [C] 不执行
```

---

## 四、AsyncParallelHook 异步并行钩子



### 4.1 基础示例

```javascript
const { AsyncParallelHook } = require('tapable');

const hook = new AsyncParallelHook(['arg1']);

console.time('timer');

hook.tapAsync('A', (arg1, callback) => {
  setTimeout(() => {
    console.log('A async hook:', arg1);
    callback();
  }, 1000);
});

hook.tapAsync('B', (arg1, callback) => {
  setTimeout(() => {
    console.log('B async hook:', arg1);
    callback();
  }, 500);
});

hook.tapAsync('C', (arg1, callback) => {
  setTimeout(() => {
    console.log('C async hook:', arg1);
    callback();
  }, 2000);
});

hook.callAsync('test', (err) => {
  console.timeEnd('timer');
  console.log('callback is called');
});

// 输出：
// B async hook: test (0.5秒后，最先完成)
// A async hook: test (1秒后)
// C async hook: test (2秒后)
// timer: 2s       (总时间 = 最长的那个)
// callback is called
```

### 4.2 执行流程图

```
AsyncParallelHook 执行流程：

    ┌── [A] ── 1秒 ──► callback()
    │
────┼── [B] ── 0.5秒 ─► callback()
    │
    └── [C] ── 2秒 ──► callback()
    
    所有同时开始，等待全部完成
    总时间 = max(1, 0.5, 2) = 2秒
```

### 4.3 错误中断机制

```javascript
const { AsyncParallelHook } = require('tapable');

const hook = new AsyncParallelHook(['arg1']);

hook.tapAsync('A', (arg1, callback) => {
  setTimeout(() => {
    console.log('a callback');
    callback();
  }, 1000);
});

hook.tapAsync('B', (arg1, callback) => {
  setTimeout(() => {
    console.log('b callback');
    callback('error'); // 返回错误
  }, 500);
});

hook.tapAsync('C', (arg1, callback) => {
  setTimeout(() => {
    console.log('c callback');
    callback();
  }, 2000);
});

console.time('timer');
hook.callAsync('test', (err) => {
  console.timeEnd('timer');
  console.log('callback is called, err:', err);
});

// 输出：
// b callback (0.5秒后)
// timer: 508ms
// callback is called, err: error  (B 最先返回错误，立即触发回调)
// a callback (1秒后，setTimeout 仍执行，但回调被忽略)
// c callback (2秒后，setTimeout 仍执行，但回调被忽略)
```

> **注意**：异步并行中，即使某个任务返回错误立即触发最终回调，其他 `setTimeout` 等异步操作仍会执行，只是它们的 callback 结果被忽略。

---

## 五、tapPromise 方式

### 5.1 基础示例

```javascript
const { AsyncSeriesHook } = require('tapable');

const hook = new AsyncSeriesHook(['arg1']);

// 使用 tapPromise 注册
hook.tapPromise('A', (arg1) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('A promise:', arg1);
      resolve(); // 相当于 callback()
    }, 1000);
  });
});

hook.tapPromise('B', (arg1) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('B promise:', arg1);
      resolve();
    }, 500);
  });
});

hook.tapPromise('C', (arg1) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('C promise:', arg1);
      resolve();
    }, 2000);
  });
});

// 使用 promise() 调用
console.time('timer');
hook.promise('test')
  .then(() => {
    console.timeEnd('timer');
    console.log('promise is done');
  })
  .catch((err) => {
    console.log('promise error:', err);
  });

// 输出：
// A promise: test (1秒后)
// B promise: test (再0.5秒后)
// C promise: test (再2秒后)
// timer: 3.5s (串行)
// promise is done
```

### 5.2 tapAsync vs tapPromise 对照

| tapAsync | tapPromise |
|----------|------------|
| `callback()` | `resolve()` |
| `callback(err)` | `reject(err)` |
| `hook.callAsync(args, cb)` | `hook.promise(args).then().catch()` |

### 5.3 错误处理

```javascript
const { AsyncSeriesHook } = require('tapable');

const hook = new AsyncSeriesHook(['arg1']);

hook.tapPromise('A', (arg1) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('A promise');
      resolve();
    }, 1000);
  });
});

hook.tapPromise('B', (arg1) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log('B promise');
      reject('error from B'); // 使用 reject
    }, 500);
  });
});

hook.tapPromise('C', (arg1) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('C promise'); // 不会执行
      resolve();
    }, 2000);
  });
});

hook.promise('test')
  .then(() => {
    console.log('promise is done');
  })
  .catch((err) => {
    console.log('promise error:', err);
  });

// 输出：
// A promise (1秒后)
// B promise (再0.5秒后)
// promise error: error from B (C 不执行)
```

---

## 六、AsyncSeriesWaterfallHook 实践



### 6.1 瀑布流传递值

```javascript
const { AsyncSeriesWaterfallHook } = require('tapable');

const hook = new AsyncSeriesWaterfallHook(['arg1']);

hook.tapPromise('A', (arg1) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('A promise:', arg1);
      resolve('A result'); // 返回值传递给下一个
    }, 1000);
  });
});

hook.tapPromise('B', (arg1) => {
  // arg1 接收上一个的返回值
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('B promise, received:', arg1); // 'A result'
      resolve('B result');
    }, 500);
  });
});

hook.tapPromise('C', (arg1) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('C promise, received:', arg1); // 'B result'
      resolve('C result');
    }, 2000);
  });
});

hook.promise('initial')
  .then((result) => {
    console.log('Final result:', result); // 'C result'
  });

// 输出：
// A promise: initial (1秒后)
// B promise, received: A result (再0.5秒后)
// C promise, received: B result (再2秒后)
// Final result: C result
```

### 6.2 执行流程图

```
AsyncSeriesWaterfallHook：

[initial] ──► [A] ──resolve('A result')──► [B] ──resolve('B result')──► [C] ──resolve('C result')
                │                           │                           │
                └────── 值传递 ──────────────┴────── 值传递 ────────────┘

最终结果 = 最后一个 resolve 的值
```

---

## 七、SyncBailHook 实践

### 7.1 截断执行

```javascript
const { SyncBailHook } = require('tapable');

const hook = new SyncBailHook(['arg1']);

hook.tap('A', (arg1) => {
  console.log('A:', arg1);
  return undefined; // 继续
});

hook.tap('B', (arg1) => {
  console.log('B:', arg1);
  return 'stop'; // 非 undefined，截断！
});

hook.tap('C', (arg1) => {
  console.log('C:', arg1); // 不会执行
});

hook.call('test');

// 输出：
// A: test
// B: test
// (C 不执行)
```

---

## 八、SyncLoopHook 实践

### 8.1 循环执行

```javascript
const { SyncLoopHook } = require('tapable');

let count = 0;

const hook = new SyncLoopHook(['arg1']);

hook.tap('A', (arg1) => {
  console.log('A:', arg1, 'count:', count);
  
  // 模拟随机条件
  const value = Math.random();
  if (value > 0.5) {
    console.log('A returns undefined, continue');
    return undefined;
  } else {
    count++;
    console.log('A returns non-undefined, restart');
    return 'continue'; // 触发重新开始
  }
});

hook.tap('B', (arg1) => {
  console.log('B:', arg1);
  return undefined;
});

hook.tap('C', (arg1) => {
  console.log('C:', arg1);
  return undefined;
});

hook.call('test');

// 可能的输出（假设 A 第2次才返回 undefined）：
// A: test count: 0
// A returns non-undefined, restart
// A: test count: 1
// A returns undefined, continue
// B: test
// C: test
```

---

## 九、注册与调用方法速查表

| Hook 类型 | 注册方法 | 调用方法 | 特点 |
|-----------|----------|----------|------|
| SyncHook | `tap` | `call` | 同步依次执行 |
| SyncBailHook | `tap` | `call` | 非 undefined 截断 |
| SyncWaterfallHook | `tap` | `call` | 返回值传递 |
| SyncLoopHook | `tap` | `call` | 非 undefined 重新开始 |
| AsyncSeriesHook | `tapAsync` | `callAsync` | 异步串行 |
| AsyncSeriesHook | `tapPromise` | `promise` | 异步串行 Promise |
| AsyncParallelHook | `tapAsync` | `callAsync` | 异步并行 |
| AsyncParallelHook | `tapPromise` | `promise` | 异步并行 Promise |
| AsyncSeriesWaterfallHook | `tapPromise` | `promise` | 异步串行值传递 |

---

## 十、核心要点总结

### 10.1 参数传递规则

```
┌─────────────────────────────────────────────────────────┐
│                    参数传递规则                          │
├─────────────────────────────────────────────────────────┤
│  1. new Hook(['参数名']) - 定义参数列表                 │
│  2. tap(name, (参数列表) => {}) - 回调接收参数         │
│  3. call(参数值...) - 按顺序传递，非数组形式           │
│  4. 形参与实参必须一一对应                              │
└─────────────────────────────────────────────────────────┘
```

### 10.2 异步回调约定

```
tapAsync 回调：
├── callback() - 正常完成
├── callback(undefined) - 正常完成
└── callback(error) - 错误，中断后续执行

tapPromise 回调：
├── resolve() - 正常完成
├── resolve(value) - 正常完成（Waterfall 传递值）
└── reject(error) - 错误，中断后续执行
```

### 10.3 串行 vs 并行对比

```
串行（Series）：
[A: 1s] ──► [B: 2s] ──► [C: 0.5s]
总时间 = 1 + 2 + 0.5 = 3.5秒

并行（Parallel）：
[A: 1s]
[B: 2s]  ──► 全部完成后 callback
[C: 0.5s]
总时间 = max(1, 2, 0.5) = 2秒
```

---

## 十一、常见问题

| 问题 | 答案 |
|------|------|
| tap 和 tapAsync 区别？ | tap 同步注册，tapAsync 异步注册需要 callback |
| call 和 callAsync 区别？ | call 同步调用，callAsync 异步调用需要回调 |
| 异步并行中错误会怎样？ | 第一个错误立即触发最终回调，其他异步操作仍执行但回调被忽略 |
| Waterfall 如何传值？ | resolve(value) 的值传递给下一个 tap 的参数 |
| Bail 如何中断？ | 返回非 undefined 值即可中断 |

---

## 十二、延伸学习

- [tapable GitHub 仓库](https://github.com/webpack/tapable)
- 下一步：深入 Webpack 插件开发
- 实践：尝试实现一个简单的 Webpack 插件

