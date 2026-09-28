---
title: 手写 Promise 与 async/await
description: 从 Promise/A+ 规范出发，逐步实现 Promise 的构造函数、then 方法、resolvePromise，并理解 async/await 的封装原理
keywords: [手写Promise, Promise实现, async/await, 手写async]
category: JavaScript
tags: [JavaScript, Promise, async/await, 手写实现]
---

# 手写 Promise 与 async/await

Promise、async/await 已成为主流的异步处理方式，了解其实现原理非常重要。本节从 Promise/A+ 规范出发，逐步实现一个 Promise，并剖析 async/await 的封装原理。

## Promise 状态

Promise 有 3 个状态，定义常量以消除魔术字符串：

```javascript
var PENDING = 'pending';
var FULFILLED = 'fulfilled';
var REJECTED = 'rejected';
```

状态流转规则：

- **pending**：等待状态，可转移到 fulfilled 或 rejected。
- **fulfilled**：执行成功，是最终态，不可再改变。
- **rejected**：执行失败，是最终态，不可再改变。

## Promise/A+ 规范

Promise/A+ 是社区制定的 Promise 实现规范，官方地址为 [https://promisesaplus.com/](https://promisesaplus.com/)。只有在充分理解规范的基础上，才能写出符合标准的 Promise。

### 术语

- **promise**：具有 `then` 方法且行为符合规范的对象或函数。
- **thenable**：定义了 `then` 方法的对象或函数。
- **value**：任意合法的 JavaScript 值（包括 `undefined`、thenable 或 promise）。
- **exception**：使用 `throw` 语句抛出的值。
- **reason**：Promise 被 reject 后返回的拒绝原因。

### 状态描述

一个 Promise 必须处于 `pending`、`fulfilled`、`rejected` 三种状态之一：

- `pending` 状态可转换为 `fulfilled` 或 `rejected`。
- `fulfilled` 状态不可再转换，必须有一个不再改变的值。
- `rejected` 状态不可再转换，必须有一个不再改变的原因。

这里的「不再改变」指同一性（`===`）不变，不要求深不可变。

### then 方法约束

一个 Promise 必须拥有 `then` 方法来访问其值或拒绝原因。关键约束：

- `onFulfilled` 与 `onRejected` 均为可选参数，非函数时应被忽略。
- 回调函数必须是**异步执行**的，即放入事件队列等待下一轮 tick。
- `then` 方法可被一个 Promise 调用多次，且必须返回一个新的 Promise（支持链式调用）。

```javascript
promise2 = promise1.then(onFulfilled, onRejected);
```

### Promise 解决过程

解决过程（Promise Resolution Procedure）接收 `promise` 和值 `x`，需考虑四种情况：

| 情况 | x 的类型 | 处理方式 |
|------|---------|---------|
| 1 | `x === promise` | 抛出 `TypeError`，拒绝 promise |
| 2 | x 为 Promise 实例 | 按 x 的状态决定 promise 状态 |
| 3 | x 为对象或函数 | 取出 `x.then` 并调用（将 `this` 指向 x），递归进入解决过程 |
| 4 | 其他 | 以 x 作为值，resolve promise |

情况 3 中，x 只需拥有 `then` 方法即可（thenable），不一定是 Promise 实例。为避免 thenable 的 `then` 被重复调用，需用标志位加以保护。

## 构造函数

创建 Promise 时传入一个 executor 回调，其接收 `resolve` 和 `reject` 两个参数。同时需捕获 executor 执行过程中的异常。Promise 是单次执行的，因此状态只在 `pending` 时改变。

```javascript
function Promise(execute) {
  var self = this;
  self.state = PENDING;

  function resolve(value) {
    if (self.state === PENDING) {
      self.state = FULFILLED;
      self.value = value;
    }
  }

  function reject(reason) {
    if (self.state === PENDING) {
      self.state = REJECTED;
      self.reason = reason;
    }
  }

  try {
    execute(resolve, reject);
  } catch (e) {
    reject(e);
  }
}
```

## then 方法

每个 Promise 实例都有一个 `then()` 方法，用于访问内部的值或拒绝原因。根据规范：

1. 可选参数若非函数应被忽略。
2. 回调函数应异步执行（通过 `setTimeout` 模拟）。
3. 根据状态调用对应的回调：fulfilled 调用 `onFulfilled(value)`，rejected 调用 `onRejected(reason)`。
4. `then()` 应返回一个新的 Promise，以支持链式调用。

```javascript
Promise.prototype.then = function (onFulfilled, onRejected) {
  // 规则 1：参数非函数时忽略
  onFulfilled =
    typeof onFulfilled === 'function'
      ? onFulfilled
      : function (x) {
          return x;
        };
  onRejected =
    typeof onRejected === 'function'
      ? onRejected
      : function (e) {
          throw e;
        };

  var self = this;
  var promise;

  switch (self.state) {
    case FULFILLED:
      promise = new Promise(function (resolve, reject) {
        setTimeout(function () {
          try {
            onFulfilled(self.value);
          } catch (e) {
            reject(e);
          }
        });
      });
      break;
    case REJECTED:
      promise = new Promise(function (resolve, reject) {
        setTimeout(function () {
          try {
            onRejected(self.reason);
          } catch (e) {
            reject(e);
          }
        });
      });
      break;
    case PENDING:
      // 等待状态，需在状态改变时再调用，故将回调暂存
      promise = new Promise(function (resolve, reject) {
        self.onFulfilledFn.push(function () {
          try {
            onFulfilled(self.value);
          } catch (e) {
            reject(e);
          }
        });
        self.onRejectedFn.push(function () {
          try {
            onRejected(self.reason);
          } catch (e) {
            reject(e);
          }
        });
      });
      break;
  }
  return promise;
};
```

等待状态下，由于无法确定状态何时改变，需将回调暂存。因此构造函数中应初始化 `onFulfilledFn` 和 `onRejectedFn` 为数组，并在 `resolve` / `reject` 改变状态时异步调用它们：

```javascript
function Promise(execute) {
  var self = this;
  self.state = PENDING;
  self.onFulfilledFn = [];
  self.onRejectedFn = [];

  function resolve(value) {
    setTimeout(function () {
      if (self.state === PENDING) {
        self.state = FULFILLED;
        self.value = value;
        self.onFulfilledFn.forEach(function (f) {
          f(self.value);
        });
      }
    });
  }

  function reject(reason) {
    setTimeout(function () {
      if (self.state === PENDING) {
        self.state = REJECTED;
        self.reason = reason;
        self.onRejectedFn.forEach(function (f) {
          f(self.reason);
        });
      }
    });
  }

  try {
    execute(resolve, reject);
  } catch (e) {
    reject(e);
  }
}
```

将暂存的回调设计为数组，是为了支持链式调用时保存多个 `resolve` / `reject` 函数。

## resolvePromise 函数

`resolvePromise(promise, x, resolve, reject)` 处理 Promise 解决过程，需考虑三种情况：

**情况 1：`promise === x`**，抛出 `TypeError`：

```javascript
function resolvePromise(promise, x, resolve, reject) {
  if (promise === x) {
    return reject(new TypeError('x 不能与 promise 相等'));
  }
}
```

**情况 2：x 为 Promise 实例**，根据其状态决定 promise 状态：

```javascript
  if (x instanceof Promise) {
    if (x.state === FULFILLED) {
      resolve(x.value);
    } else if (x.state === REJECTED) {
      reject(x.reason);
    } else {
      x.then(function (y) {
        resolvePromise(promise, y, resolve, reject);
      }, reject);
    }
    return;
  }
```

**情况 3：x 为对象或函数（thenable）**，取出 `x.then` 执行，用 `executed` 标志避免重复调用，并捕获异常：

```javascript
  if (x !== null && (typeof x === 'object' || typeof x === 'function')) {
    var executed;
    try {
      var then = x.then;
      if (typeof then === 'function') {
        then.call(
          x,
          function (y) {
            if (executed) return;
            executed = true;
            return resolvePromise(promise, y, resolve, reject);
          },
          function (e) {
            if (executed) return;
            executed = true;
            reject(e);
          }
        );
      } else {
        resolve(x);
      }
    } catch (e) {
      if (executed) return;
      executed = true;
      reject(e);
    }
  } else {
    resolve(x);
  }
```

**情况 4**：x 既不是 Promise 也不是对象/函数，直接 `resolve(x)`。

## async/await 原理

async 是 ES2017 标准推出的异步处理关键字，本质上是 **Generator 函数的语法糖**。

### Generator 基础

Generator 函数在 `function` 与函数名之间加星号，调用后返回迭代器对象而非立即执行；函数体内部使用 `yield` 定义不同状态；调用迭代器的 `next()` 时执行到下一个 `yield`，返回 `{ value, done }` 对象。

```javascript
function asyncFn(cb) {
  setTimeout(cb, 1000, 1);
}

function* fn() {
  var result = yield asyncFn(function (data) {
    it.next(data);
  });
  console.log(result); // 1
}

var it = fn();
it.next();
```

### async/await 的原理

async/await 做的事情是将 Generator 函数转换成 Promise。通过 `generator2promise` 包装，将 Generator 的迭代器逐步推进，最终返回 Promise：

```javascript
function generator2promise(generatorFn) {
  return function () {
    var gen = generatorFn.apply(this, arguments);
    return new Promise(function (resolve, reject) {
      function step(key, arg) {
        try {
          var info = gen[key](arg);
          var value = info.value;
        } catch (error) {
          reject(error);
          return;
        }
        if (info.done) {
          resolve(value);
        } else {
          return Promise.resolve(value).then(
            function (value) {
              step('next', value);
            },
            function (err) {
              step('throw', err);
            }
          );
        }
      }
      return step('next');
    });
  };
}
```

该函数将 Generator 包装成新的匿名函数，调用时返回 Promise；内部创建递归的 `step` 函数，负责推进迭代器，迭代完成时 resolve，出错时 reject。

## Promise 测试

为验证手写 Promise 的正确性，可引用 [promises-aplus-tests](https://github.com/promises-aplus/promises-tests) 模块，它内置数百个测试用例，支持命令行一键测试。

导出时需遵循 CommonJS 规范并导出 `deferred` 方法：

```bash
npm i -g promises-aplus-tests
promises-aplus-tests Promise.js
```

`deferred` 的实现方式：

```javascript
Promise.deferred = Promise.defer = function () {
  const dfd = {};
  dfd.promise = new Promise(function (resolve, reject) {
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
};

module.exports = Promise;
```

## 总结

- 手写 Promise 的重点在于理解规范并根据规范逐步实现与优化：状态管理、`then` 方法、`resolvePromise` 解决过程。
- async/await 本质是 Generator + Promise 的语法糖，理解 `generator2promise` 的封装即可掌握其原理。
- 建议亲手实现一个 Promise 并通过测试用例，以加深理解。
