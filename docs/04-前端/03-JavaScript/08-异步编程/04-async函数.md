---
title: async/await 详解
description: 系统讲解 async/await 的用法、错误处理、并行执行、常见陷阱与最佳实践
keywords: [async, await, async函数, 异步, try/catch, Promise]
category: JavaScript
tags: [JavaScript, async/await, 异步, Promise]
---

# async/await 详解

async/await 是 ES2017 引入的异步编程方案，本质上是基于 Promise 和 Generator 的语法糖。它让异步代码看起来像同步代码，极大提升了可读性。本节系统讲解 async/await 的用法、错误处理与最佳实践。

## 什么是 async/await

async/await 是处理 Promise 的语法糖，用于以同步的方式书写异步代码。在 async 函数中使用 `await` 等待 Promise 的结果，代码结构与同步代码一致，逻辑更清晰。

```javascript
// Promise 链式调用
getUserInfo(userId)
  .then((user) => getPosts(user.id))
  .then((posts) => console.log(posts))
  .catch((error) => console.error(error));

// async/await 写法
async function loadPosts(userId) {
  try {
    const user = await getUserInfo(userId);
    const posts = await getPosts(user.id);
    console.log(posts);
  } catch (error) {
    console.error(error);
  }
}
```

### async/await 与 Promise 的关系

- `await` 等待的对象通常是 Promise，也可以是任意值（会被自动包装为 Promise）。
- async 函数**总是返回一个 Promise 对象**，即使 return 的是普通值也会被包装。
- async/await 无法脱离 Promise 单独存在，二者互补。

```javascript
async function getValue() {
  return 100; // 会被自动包装为 Promise.resolve(100)
}
console.log(getValue()); // Promise { <fulfilled>: 100 }
```

## async 函数

### 声明方式

```javascript
// 函数声明
async function foo() {}

// 函数表达式
const foo = async function () {};

// 箭头函数
const foo = async () => {};

// 对象方法
const obj = {
  async foo() {},
};

// 类方法
class Foo {
  async bar() {}
}
```

### async 函数的返回值

async 函数返回 Promise。无论函数体内部 return 什么，最终都以 Promise 形式返回：

```javascript
async function fn() {
  return 'hello';
}
fn().then((value) => console.log(value)); // hello

async function fn2() {
  throw new Error('出错了');
}
fn2().catch((error) => console.error(error)); // 出错了
```

## await 表达式

`await` 关键字只能出现在 async 函数内部，用于等待 Promise 完成并取出其结果：

```javascript
async function fetchData() {
  const data = await fetch('/api/data').then((res) => res.json());
  console.log(data); // 直接拿到结果
}
```

`await` 的语义：

- 若 `await` 后面是 Promise，则暂停执行直到该 Promise settle，取出 fulfilled 的值；若 rejected 则抛出异常。
- 若 `await` 后面是普通值，则直接返回该值（相当于 `Promise.resolve(value)`）。
- `await` 暂停的是当前 async 函数，不会阻塞其他代码。

## 错误处理

### try/catch 方式

```javascript
async function loadData() {
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    console.error('加载失败:', error);
    return null;
  }
}
```

### Promise.catch() 方式

```javascript
async function loadData() {
  const data = await fetchData().catch((error) => {
    console.error('加载失败:', error);
    return null;
  });
  return data;
}
```

### 捕获多个 await 的错误

多个 `await` 可以使用同一个 `try/catch` 集中处理：

```javascript
async function loadAll() {
  try {
    const user = await fetchUser();
    const posts = await fetchPosts();
    const comments = await fetchComments();
    return { user, posts, comments };
  } catch (error) {
    // 任意一个 await 失败都会进入这里
    console.error('任意请求失败:', error);
  }
}
```

**注意**：`try/catch` 只能捕获 `await` 抛出的错误。若多个 `await` 之间需要各自独立处理错误，应分别使用 `try/catch` 或 `.catch()`。

### 错误处理最佳实践

- **不要遗漏错误**：async 函数中的异常若未捕获，会返回 rejected 的 Promise。
- **在调用处处理**：在调用 async 函数时使用 `.catch()` 或 `try/catch` 兜底。
- **结合 finally**：在加载态、清理等场景使用 `finally`。

## 并行与顺序执行

### 顺序执行 vs 并行执行

```javascript
// ❌ 错误：串行等待，两个请求耗时叠加
async function loadData() {
  const user = await fetchUser(); // 等待完成
  const posts = await fetchPosts(); // 再等待另一个
}

// ✅ 正确：并行发起，总耗时取最大值
async function loadData() {
  const userPromise = fetchUser();
  const postsPromise = fetchPosts();
  const user = await userPromise;
  const posts = await postsPromise;
}
```

**关键原则**：先并行「发起」异步操作（获取 Promise），再 `await` 其结果；而不是先 `await` 一个再发起下一个。

### 使用 Promise.all()

```javascript
async function loadAll() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchComments(),
  ]);
  return { user, posts, comments };
}
```

### 使用 Promise.allSettled()

当需要统计每个请求结果、且单个失败不应中断整体时使用：

```javascript
async function loadAll() {
  const results = await Promise.allSettled([
    fetchUser(),
    fetchPosts(),
    fetchComments(),
  ]);
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      console.log('成功:', result.value);
    } else {
      console.log('失败:', result.reason);
    }
  });
}
```

### 使用 Promise.race()

用于超时控制或竞速：

```javascript
async function withTimeout(fn, ms) {
  return Promise.race([
    fn(),
    new Promise((_, reject) => setTimeout(() => reject(new Error('超时')), ms)),
  ]);
}

const data = await withTimeout(fetchData, 5000);
```

## 实际应用场景

### 串行异步操作

```javascript
// 依次处理，前一步结果作为后一步输入
async function processInOrder(items) {
  const results = [];
  for (const item of items) {
    results.push(await processItem(item)); // 逐个串行
  }
  return results;
}
```

### 重试机制

```javascript
async function fetchWithRetry(fn, { retries = 3, delay = 1000 } = {}) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

### 并发控制

```javascript
// 限制并发数量
async function mapLimit(tasks, limit, fn) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await fn(tasks[current]);
    }
  }

  await Promise.all(Array.from({ length: limit }, () => worker()));
  return results;
}
```

### 异步迭代器

使用 `for await...of` 处理异步迭代器（如 `ReadableStream`）：

```javascript
async function readLines(stream) {
  const lines = [];
  for await (const chunk of stream) {
    lines.push(chunk);
  }
  return lines;
}
```

## 高级用法

### async 函数中的 this

`async` 函数作为普通函数，`this` 的绑定规则与其他函数一致；但在对象方法中建议使用箭头函数或 `bind` 保持 `this`。

```javascript
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const obj = {
  count: 0,
  // 作为对象方法调用时，this 指向 obj
  async increment() {
    this.count++;
    await delay(100);
    console.log(this.count);
  },
};
```

### 顶层 await（ES2022）

在模块顶层（不包裹在 async 函数中）可以使用 `await`，便于模块加载时异步初始化：

```javascript
// module.mjs
const data = await fetchData();
export default data;
```

## 常见陷阱与最佳实践

### 常见陷阱

**陷阱 1：忘记 await**

```javascript
// ❌ 错误：data 是 Promise，不是结果
async function load() {
  const data = fetchData();
  return data; // 返回 Promise
}

// ✅ 正确
async function load() {
  const data = await fetchData();
  return data;
}
```

**陷阱 2：在 forEach 中使用 await**

`forEach` 不会等待 `await`，应使用 `for...of`：

```javascript
// ❌ 错误：forEach 不等待
async function loadAll(items) {
  items.forEach(async (item) => {
    await fetchItem(item); // 不会被等待，可能并发乱序
  });
}

// ✅ 正确：for...of 串行等待
async function loadAll(items) {
  for (const item of items) {
    await fetchItem(item);
  }
}
```

**陷阱 3：串行等待不依赖的操作**

```javascript
// ❌ 错误：两个不相关的请求被串行化
const a = await fetchA();
const b = await fetchB(); // 应并行

// ✅ 正确：并行发起
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```

**陷阱 4：未捕获的错误静默失败**

```javascript
// ❌ 错误：异常未被捕获，返回 rejected Promise
async function load() {
  const data = await fetchData(); // 失败则函数抛错
}

// ✅ 正确：try/catch 捕获
async function load() {
  try {
    const data = await fetchData();
  } catch (error) {
    console.error(error);
  }
}
```

### 最佳实践

- **优先使用 try/catch** 处理异步错误，保证逻辑清晰。
- **并行操作使用 Promise.all**，不要串行等待不依赖的任务。
- **避免在 forEach 中 await**，改用 `for...of` 或 `Promise.all`。
- **async 函数总是返回 Promise**，在调用处留意处理返回值。
- **结合顶层 await** 简化模块初始化（ES2022）。

## 与其他异步方案的对比

| 特性 | 回调函数 | Promise | async/await |
|------|---------|---------|-------------|
| 可读性 | 差 | 中 | 好 |
| 错误处理 | 分散 | 统一 catch | try/catch |
| 嵌套深度 | 深 | 链式 | 扁平 |
| 条件/循环 | 复杂 | 中等 | 简单 |

```javascript
// 回调
fetchData(function (data) {
  processData(data, function (result) {
    console.log(result);
  });
});

// Promise
fetchData()
  .then((data) => processData(data))
  .then((result) => console.log(result));

// async/await
async function main() {
  const data = await fetchData();
  const result = await processData(data);
  console.log(result);
}
```

## 常见问题解答

### Q1: async 函数可以返回普通值吗？

可以。普通值会被自动包装为 fulfilled 状态的 Promise，如 `async () => 100` 等价于 `Promise.resolve(100)`。

### Q2: await 可以用在普通函数中吗？

不可以。`await` 只能出现在 async 函数或模块顶层。在普通函数中使用会抛出语法错误。

### Q3: 如何在 forEach 中使用 async/await？

`forEach` 不会等待 `await`。应改用 `for...of`（串行）或 `Promise.all`（并行）。

### Q4: async 函数的性能如何？

与 Promise 相比开销很小，可忽略不计。真正影响性能的是串行等待不依赖的操作，应使用并行。

### Q5: 如何中断 async 函数？

可以通过 `AbortController` 取消底层请求，或用 `Promise.race` 实现超时「中断」效果。async 函数本身没有内置的中断机制。

### Q6: async/await 可以和 Promise 混用吗？

可以。`await` 后可以是 Promise，也可以对 async 函数调用 `.then()` / `.catch()`。

### Q7: 如何实现 async 函数的超时控制？

使用 `Promise.race` 将 async 函数与一个超时 Promise 竞争即可。

### Q8: async 函数的 this 指向是什么？

async 函数作为普通函数遵循同样的 `this` 规则；作为对象方法调用时，`this` 指向对象。

## 总结

- async/await 是 Promise 的语法糖，让异步代码像同步代码一样清晰易读。
- 掌握错误处理（try/catch）、并行执行（Promise.all）与常见陷阱，是写出健壮异步代码的关键。
- async 函数总是返回 Promise，`await` 只能在 async 函数或模块顶层使用。
- 与 Promise 互补使用，可应对绝大多数异步场景。
