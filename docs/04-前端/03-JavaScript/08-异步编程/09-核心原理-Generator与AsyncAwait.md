---
title: Generator 与 async/await 原理
description: 深入理解 Generator、yield、thunk、co 函数库，以及 async/await 作为协程语法糖的原理
keywords: [Generator, yield, thunk, co, async/await, 协程]
category: JavaScript
tags: [JavaScript, Generator, async/await, 协程, 异步]
---

# Generator 与 async/await 原理

## Generator 基本介绍

Generator（生成器）是 ES2015 引入的关键词，是一个带星号的「函数」。它并不是普通函数，可配合 `yield` 关键字暂停或恢复执行。

```javascript
function* gen() {
  console.log('enter');
  let a = yield 1;
  let b = yield (function () {
    return 2;
  })();
  return 3;
}

var g = gen(); // 调用 gen() 不会执行任何语句
console.log(g.next()); // { value: 1, done: false }
console.log(g.next()); // { value: 2, done: false }
console.log(g.next()); // { value: 3, done: true }
console.log(g.next()); // { value: undefined, done: true }
```

Generator 的执行关键点：

- 调用 `gen()` 后函数体不会执行任何语句，而是返回一个迭代器对象（生成器处于挂起状态）。
- 调用 `g.next()` 后函数体开始执行，直到遇到 `yield` 时暂停。
- `next()` 返回一个对象，包含 `value` 和 `done` 两个属性，`done` 表示是否执行完毕。

## yield 基本介绍

`yield` 配合 Generator 使用，用于暂停函数执行。Generator 嵌套时，可通过 `yield*` 将执行权委托给另一个 Generator。

```javascript
function* gen1() {
  yield 1;
  yield* gen2();
  yield 4;
}
function* gen2() {
  yield 2;
  yield 3;
}

var g = gen1();
console.log(g.next()); // { value: 1, done: false }
console.log(g.next()); // { value: 2, done: false }
console.log(g.next()); // { value: 3, done: false }
console.log(g.next()); // { value: 4, done: false }
console.log(g.next()); // { value: undefined, done: true }
```

## thunk 函数

thunk 函数接收一定参数，生产出定制化的函数，再用该函数完成具体功能。以类型判断为例：

```javascript
// 大量重复的逻辑
let isString = (obj) =>
  Object.prototype.toString.call(obj) === '[object String]';
let isArray = (obj) =>
  Object.prototype.toString.call(obj) === '[object Array]';

// 封装为 thunk 函数
let isType = (type) => {
  return (obj) => {
    return Object.prototype.toString.call(obj) === `[object ${type}]`;
  };
};

let isString2 = isType('String');
let isArray2 = isType('Array');
isString2('123'); // true
isArray2([1, 2, 3]); // true
```

## Generator 与异步的结合

### 与 thunk 结合

将 thunk 函数与 Generator 结合，即可用同步风格编写异步代码。

```javascript
const readFileThunk = (filename) => {
  return (callback) => {
    fs.readFile(filename, callback);
  };
};

const gen = function* () {
  const data1 = yield readFileThunk('1.txt');
  console.log(data1.toString());
  const data2 = yield readFileThunk('2.txt');
  console.log(data2.toString());
};

// 手动执行，任务多了会产生嵌套
let g = gen();
g.next().value((err, data1) => {
  g.next(data1).value((err, data2) => {
    g.next(data2);
  });
});
```

通过封装 `run` 函数，利用递归自动执行 Generator，解决多层嵌套问题：

```javascript
function run(gen) {
  const next = (err, data) => {
    let res = gen.next(data);
    if (res.done) return;
    res.value(next);
  };
  next();
}

// 重新创建生成器实例并自动执行（替代上面的手动嵌套调用）
run(gen());
```

### 与 Promise 结合

Generator 也可以与 Promise 结合实现同样的异步效果：

```javascript
const readFilePromise = (filename) => {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  }).then((res) => res);
};

const gen = function* () {
  const data1 = yield readFilePromise('1.txt');
  console.log(data1.toString());
  const data2 = yield readFilePromise('2.txt');
  console.log(data2.toString());
};

function run(gen) {
  const next = (err, data) => {
    let res = gen.next(data);
    if (res.done) return;
    res.value.then(next);
  };
  next();
}

run(gen());
```

## co 函数库

co 函数库由 TJ 发布，用于自动执行 Generator 函数。其核心原理是：将 Generator 的 `next` 方法包装为 `onFulfilled`，并在其中反复调用自身，从而自动推进异步流程，最终返回一个 Promise 对象。

```javascript
const co = require('co');
let g = gen();
co(g).then((res) => console.log(res));
```

co 的关键处理逻辑：

- 接受 Generator 函数作为参数，最终返回 Promise 对象。
- 若参数是 Generator 函数则执行，否则直接返回并将 Promise 状态改为 resolved。
- 将 `next` 方法包装为 `onFulfilled`，用于捕获抛出的错误。
- 核心的 `next` 函数反复调用自身，驱动整个异步流程。

## async/await 介绍

async/await 被称为 JS 异步的**终极解决方案**。它既像 co + Generator 一样用同步方式书写异步代码，又获得底层语法支持，无需借助第三方库。

将 Generator 的 `*` 换成 `async`、`yield` 换成 `await`，即可改造为 async/await：

```javascript
const gen = async function () {
  const data1 = await readFilePromise('1.txt');
  console.log(data1.toString());
  const data2 = await readFilePromise('2.txt');
  console.log(data2.toString());
};
```

async 函数对 Generator 函数的改进主要体现在三点：

- **内置执行器**：async 函数像普通函数一样执行，自带执行器，无需 co 或手动调用 `next`。
- **适用性更好**：`await` 后面可以是任意值，不局限于 thunk 或 Promise。
- **可读性更好**：`async` / `await` 相比 `*` / `yield` 语义更清晰。

async 函数的返回值始终是一个 Promise 对象：

```javascript
async function func() {
  return 100;
}
console.log(func()); // Promise { <fulfilled>: 100 }
```

### async 的实现逻辑

async/await 做的事情本质上是将 Generator 函数转换成 Promise。下面是一个将 Generator 包装为 Promise 的核心逻辑（`generator2promise`）：

```javascript
function generator2promise(generatorFn) {
  return function () {
    const gen = generatorFn.apply(this, arguments);
    return new Promise(function (resolve, reject) {
      function step(key, arg) {
        let info;
        try {
          info = gen[key](arg);
        } catch (error) {
          reject(error);
          return;
        }
        if (info.done) {
          resolve(info.value);
        } else {
          return Promise.resolve(info.value).then(
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

其核心思想是：在 Promise 内部创建一个递归的 `step` 函数，不断调用 Generator 迭代器的 `next` / `throw`，直至迭代完成时 resolve，出错时 reject。

## 总结

- Generator 通过 `yield` 实现暂停与恢复，是协程在 JS 中的体现。
- thunk 与 Promise 均可与 Generator 结合，通过 `run` 函数或 co 实现自动执行。
- async/await 是 Generator + Promise 的语法糖，内置执行器、可读性最佳，是主流的异步方案。
- 理解 Generator 与 async/await 的底层关系，有助于写出优雅且高性能的异步代码。
