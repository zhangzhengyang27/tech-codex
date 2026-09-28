---
title: "tapable源码实现"
description: 从源码层面剖析 tapable 内部实现
keywords: [Webpack, tapable, 源码]
category: 前端工程化
---


# tapable源码实现

## 一、概述

官方 tapable 通过 `new Function` 动态生成执行代码，直接阅读门槛较高。本文用最简的 TypeScript 从零实现 SyncHook 与 AsyncSeriesHook 的核心行为，帮助理解其设计思想，再回头阅读官方源码。

## 二、实现 SyncHook

### 2.1 设计思路

```
SyncHook 需要实现的功能：
├── constructor(args) - 接收参数名称列表
├── tap(name, fn) - 注册回调函数
├── call(...args) - 按注册顺序依次执行回调
└── 特点：同步执行，先注册先执行
```

### 2.2 完整实现

```typescript
// sync.ts

class SyncHook {
  // 存储参数名称列表
  private args: string[];
  
  // 存储注册的 tap 对象数组
  private taps: Array<{ name: string; fn: Function }> = [];

  constructor(args: string[]) {
    this.args = args;
  }

  /**
   * 注册回调函数
   * @param name - tap 名称（用于标识）
   * @param fn - 回调函数
   */
  tap(name: string, fn: Function) {
    // 按注册顺序推入数组
    this.taps.push({ name, fn });
  }

  /**
   * 调用所有注册的回调函数
   * @param args - 传递给回调函数的参数
   */
  call(...args: any[]) {
    // 可选：参数数量校验
    if (args.length < this.args.length) {
      throw new Error('Arguments length mismatch');
    }

    // 按注册顺序依次执行
    for (const tap of this.taps) {
      tap.fn(...args);
    }
  }
}
```

### 2.3 使用示例

```typescript
// 使用示例
const hook = new SyncHook(['arg1', 'arg2']);

// 注册回调 A
hook.tap('A', (arg1: string, arg2: string) => {
  console.log('A:', arg1, arg2);
});

// 注册回调 B
hook.tap('B', (arg1: string, arg2: string) => {
  console.log('B:', arg1, arg2);
});

// 注册回调 C
hook.tap('C', (arg1: string, arg2: string) => {
  console.log('C:', arg1, arg2);
});

// 调用
hook.call('tom', 'jerry');

// 输出：
// A: tom jerry
// B: tom jerry
// C: tom jerry
```

### 2.4 执行流程图

```
hook.call('tom', 'jerry')
         │
         ▼
    ┌─────────┐
    │ taps[0] │ ──► fn('tom', 'jerry') ──► console.log('A: ...')
    │   A     │
    └─────────┘
         │
         ▼
    ┌─────────┐
    │ taps[1] │ ──► fn('tom', 'jerry') ──► console.log('B: ...')
    │   B     │
    └─────────┘
         │
         ▼
    ┌─────────┐
    │ taps[2] │ ──► fn('tom', 'jerry') ──► console.log('C: ...')
    │   C     │
    └─────────┘
         │
         ▼
      执行完成
```

---

## 三、实现 AsyncSeriesHook

### 3.1 设计思路

```
AsyncSeriesHook 需要实现的功能：
├── constructor(args) - 接收参数名称列表
├── tapAsync(name, fn) - 注册异步回调（最后一个参数是 callback）
├── tapPromise(name, fn) - 注册 Promise 回调（返回 Promise）
├── callAsync(...args, callback) - 串行执行，最终回调
├── promise(...args) - 返回 Promise
└── 特点：异步串行执行，支持错误中断
```



### 3.2 完整实现

```typescript
// async.ts

// 定义 tap 类型
type TapType = 'async' | 'promise';

interface Tap {
  name: string;
  fn: Function;
  type: TapType;
}

class AsyncSeriesHook {
  private args: string[];
  private taps: Tap[] = [];

  constructor(args: string[]) {
    this.args = args;
  }

  /**
   * 注册异步回调（callback 方式）
   * @param name - tap 名称
   * @param fn - 回调函数，最后一个参数是 callback
   */
  tapAsync(name: string, fn: Function) {
    this.taps.push({ name, fn, type: 'async' });
  }

  /**
   * 注册异步回调（Promise 方式）
   * @param name - tap 名称
   * @param fn - 返回 Promise 的函数
   */
  tapPromise(name: string, fn: Function) {
    this.taps.push({ name, fn, type: 'promise' });
  }

  /**
   * 异步串行调用（callback 方式）
   * @param args - 参数 + 最后一个是回调函数
   */
  callAsync(...args: any[]) {
    // 参数数量校验
    if (args.length < this.args.length + 1) {
      throw new Error('Arguments length mismatch');
    }

    // 获取最终回调函数（最后一个参数）
    const finalCallback = args[args.length - 1];
    
    // 去掉最后的 callback，保留实际参数
    const actualArgs = args.slice(0, -1);

    // 当前执行索引
    let i = 0;

    // next 函数：控制串行执行流程
    const next = (error?: any) => {
      // 如果有错误，直接调用最终回调并终止
      if (error) {
        return finalCallback(error);
      }

      // 如果已执行完所有 tap，调用最终回调
      if (i >= this.taps.length) {
        return finalCallback();
      }

      // 获取当前 tap
      const tap = this.taps[i];
      i++; // 索引后移

      // 根据类型执行不同的调用方式
      if (tap.type === 'async') {
        // async 类型：最后一个参数传入 next 作为 callback
        tap.fn(...actualArgs, next);
      } else {
        // promise 类型：调用后通过 .then 控制流程
        tap.fn(...actualArgs)
          .then(() => next())
          .catch((err: any) => next(err));
      }
    };

    // 开始执行
    next();
  }

  /**
   * 异步串行调用（Promise 方式）
   * @param args - 参数
   * @returns Promise
   */
  promise(...args: any[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // 参数数量校验
      if (args.length < this.args.length) {
        throw new Error('Arguments length mismatch');
      }

      let i = 0;

      const next = (error?: any) => {
        if (error) {
          return reject(error);
        }

        if (i >= this.taps.length) {
          return resolve();
        }

        const tap = this.taps[i];
        i++;

        if (tap.type === 'async') {
          tap.fn(...args, next);
        } else {
          tap.fn(...args)
            .then(() => next())
            .catch((err: any) => next(err));
        }
      };

      next();
    });
  }
}
```

### 3.3 核心逻辑解析

#### next 函数的作用

```typescript
const next = (error?: any) => {
  // 1. 错误处理：有错误则立即终止
  if (error) {
    return finalCallback(error);
  }

  // 2. 完成检查：所有 tap 执行完毕
  if (i >= this.taps.length) {
    return finalCallback();
  }

  // 3. 获取并执行下一个 tap
  const tap = this.taps[i];
  i++;

  // 4. 根据类型执行
  if (tap.type === 'async') {
    tap.fn(...args, next);  // next 作为 callback 传入
  } else {
    tap.fn(...args)
      .then(() => next())   // resolve 后执行下一个
      .catch((err) => next(err));  // reject 后传递错误
  }
};
```

#### 串行执行原理

```
next() 调用链：

next()
  │
  ├── 执行 taps[0].fn(...args, next)
  │         │
  │         └── callback() 触发
  │                   │
  │                   ▼
  │              next()  ──► 执行 taps[1].fn(...args, next)
  │                                        │
  │                                        └── callback() 触发
  │                                                  │
  │                                                  ▼
  │                                             next() ──► ...
  │
  └── 最终 finalCallback()
```



### 3.4 使用示例

#### tapAsync + callAsync 方式

```typescript
const hook = new AsyncSeriesHook(['arg1', 'arg2']);

console.time('timer');

// 注册 A
hook.tapAsync('A', (arg1: string, arg2: string, callback: Function) => {
  setTimeout(() => {
    console.log('Async hook A:', arg1, arg2);
    callback(); // 必须调用 callback 表示完成
  }, 1000);
});

// 注册 B
hook.tapAsync('B', (arg1: string, arg2: string, callback: Function) => {
  setTimeout(() => {
    console.log('Async hook B:', arg1, arg2);
    callback();
  }, 500);
});

// 注册 C
hook.tapAsync('C', (arg1: string, arg2: string, callback: Function) => {
  setTimeout(() => {
    console.log('Async hook C:', arg1, arg2);
    callback();
  }, 2000);
});

// 调用
hook.callAsync('value1', 'value2', (error) => {
  console.timeEnd('timer');
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Callback is called');
  }
});

// 输出：
// Async hook A: value1 value2 (1秒后)
// Async hook B: value1 value2 (再0.5秒后)
// Async hook C: value1 value2 (再2秒后)
// timer: 3.5s
// Callback is called
```

#### 错误中断示例

```typescript
const hook = new AsyncSeriesHook(['arg1']);

hook.tapAsync('A', (arg1: string, callback: Function) => {
  setTimeout(() => {
    console.log('A');
    callback(); // 正常
  }, 1000);
});

hook.tapAsync('B', (arg1: string, callback: Function) => {
  setTimeout(() => {
    console.log('B');
    callback('error from B'); // 错误！
  }, 500);
});

hook.tapAsync('C', (arg1: string, callback: Function) => {
  setTimeout(() => {
    console.log('C'); // 不会执行
    callback();
  }, 2000);
});

hook.callAsync('test', (error) => {
  if (error) {
    console.log('Error:', error);
  }
});

// 输出：
// A (1秒后)
// B (再0.5秒后)
// Error: error from B (C 不执行)
```

#### tapPromise + promise 方式

```typescript
const hook = new AsyncSeriesHook(['arg1']);

console.time('timer');

hook.tapPromise('A', (arg1: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('A promise:', arg1);
      resolve();
    }, 1000);
  });
});

hook.tapPromise('B', (arg1: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('B promise:', arg1);
      resolve();
    }, 500);
  });
});

hook.tapPromise('C', (arg1: string) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('C promise:', arg1);
      resolve();
    }, 2000);
  });
});

hook.promise('test')
  .then(() => {
    console.timeEnd('timer');
    console.log('Promise is done');
  })
  .catch((error) => {
    console.log('Promise error:', error);
  });

// 输出：
// A promise: test (1秒后)
// B promise: test (再0.5秒后)
// C promise: test (再2秒后)
// timer: 3.5s
// Promise is done
```

---

## 四、关键实现对比

### 4.1 SyncHook vs AsyncSeriesHook

```
┌─────────────────────────────────────────────────────────────┐
│                    实现对比                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  SyncHook:                                                  │
│  ├── tap(name, fn) 注册                                     │
│  ├── call(...args) 同步调用                                 │
│  └── for 循环依次执行，无流程控制                           │
│                                                             │
│  AsyncSeriesHook:                                           │
│  ├── tapAsync(name, fn) 注册（callback 方式）               │
│  ├── tapPromise(name, fn) 注册（Promise 方式）              │
│  ├── callAsync(...args, cb) 异步调用                        │
│  ├── promise(...args) 异步调用（返回 Promise）              │
│  └── next 函数控制串行流程                                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 核心代码差异

| 特性 | SyncHook | AsyncSeriesHook |
|------|----------|-----------------|
| 数据结构 | `{ name, fn }` | `{ name, fn, type }` |
| 执行方式 | `for` 循环 | `next` 递归 |
| 流程控制 | 无 | 错误中断、串行等待 |
| 调用方法 | `call` | `callAsync` / `promise` |

---

## 五、扩展实现建议



### 5.1 可扩展的 Hook 类型

```
基于 SyncHook 扩展：
├── SyncBailHook
│   └── 返回非 undefined 时截断后续执行
│
├── SyncWaterfallHook
│   └── 上一个返回值传递给下一个
│
└── SyncLoopHook
    └── 返回非 undefined 时从头重新执行

基于 AsyncSeriesHook 扩展：
├── AsyncParallelHook
│   └── 并行执行，Promise.all 控制
│
└── AsyncSeriesWaterfallHook
    └── resolve 的值传递给下一个
```

### 5.2 Bail 实现思路

```typescript
// SyncBailHook 核心逻辑
call(...args: any[]) {
  for (const tap of this.taps) {
    const result = tap.fn(...args);
    // 非 undefined 则截断
    if (result !== undefined) {
      return result;
    }
  }
}
```

### 5.3 Waterfall 实现思路

```typescript
// SyncWaterfallHook 核心逻辑
call(...args: any[]) {
  let result = args[0]; // 初始值
  
  for (const tap of this.taps) {
    // 上一个返回值作为当前参数
    result = tap.fn(result);
  }
  
  return result;
}
```

### 5.4 Loop 实现思路

```typescript
// SyncLoopHook 核心逻辑
call(...args: any[]) {
  let i = 0;
  
  while (i < this.taps.length) {
    const result = this.taps[i].fn(...args);
    
    // 非 undefined 则从头开始
    if (result !== undefined) {
      i = 0;
    } else {
      i++;
    }
  }
}
```

---

## 六、源码学习建议

### 6.1 阅读官方源码

```
tapable 源码结构：
├── lib/
│   ├── Hook.js          - 基础 Hook 类
│   ├── HookCodeFactory.js - 代码生成工厂
│   ├── SyncHook.js      - 同步 Hook
│   ├── AsyncSeriesHook.js - 异步串行 Hook
│   └── ...              - 其他 Hook 类型
```

**GitHub 地址**：https://github.com/webpack/tapable

### 6.2 官方实现特点

1. **动态代码生成**：使用 `new Function()` 动态生成执行函数
2. **性能优化**：避免每次调用都遍历 taps
3. **拦截器支持**：完整的 intercept 机制
4. **类型安全**：完整的 TypeScript 支持

---

## 七、学习总结

### 7.1 核心收获

| 知识点 | 收获 |
|--------|------|
| SyncHook 原理 | 数组存储 + for 循环依次执行 |
| AsyncSeriesHook 原理 | next 函数控制串行流程 |
| 错误中断机制 | callback(error) 或 reject(error) |
| 设计模式 | 发布-订阅模式、责任链模式 |

### 7.2 实现要点

```
实现 Hook 的关键：
├── 数据结构设计（存储 taps）
├── 注册方法（tap/tapAsync/tapPromise）
├── 调用方法（call/callAsync/promise）
├── 流程控制（串行/并行/中断/循环）
└── 错误处理（传递错误、提前终止）
```

### 7.3 延伸学习

- 尝试实现 Waterfall、Bail、Loop 等 Hook
- 阅读官方 tapable 源码，理解动态代码生成
- 思考如何实现 intercept 拦截器机制
- 对比 Webpack 中 Hook 的实际使用场景

