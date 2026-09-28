---
title: Node.js 线程池
description: libuv 线程池的工作机制、任务队列与 I/O 密集型任务的底层调度
keywords: [Node.js, AST, 编译]
category: Node.js
tags: [Node.js, 编译与底层原理]
---







# Node.js 线程池

在单线程环境中，JavaScript 语言的事件循环机制虽然能高效处理 I/O 密集型任务，但一旦遇到 CPU 密集型计算（如大规模数据处理、复杂算法执行），主线程就会被长时间阻塞。这会导致应用程序失去响应，用户体验急剧下降。为了解决这一痛点，引入多线程技术势在必行

浏览器环境提供 Web Worker，允许将耗时计算转移到后台线程。同样，Node.js 作为服务端语言，也通过 `worker_threads` 模块提供了强大的多线程能力。利用多核 CPU 并行处理任务，是提升应用性能的关键手段

## 浏览器 Web Worker

### 主线程阻塞问题

需要在网页上进行一个非常耗时的计算。在传统单线程模型下，这会导致页面冻结

```bash
mkdir worker-test
cd worker-test
npm init -y
```

创建 `index.html` 并使用浏览器打开：

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>worker performance optimization</title>
  </head>
  <body>
    <script>
      function calc() {
        let total = 0
        for (let i = 0; i < 10 * 10000 * 10000; i++) {
          total += i
        }
        return total
      }

      document.write(calc())
    </script>
  </body>
</html>
```

打开 chrome devtools 的 Performance 面板，点击 reload 按钮，会重新加载页面并开始记录耗时。过几秒点击结束。

这里的 main 就是主线程，其余的 Frames、Network 等是浏览器的其他线程。执行 calc 这个宏任务被标为了 long task，也就是需要优化的长任务。超过 50ms 就是长任务了，这都执行了 1s 多


### 使用 Web Worker 优化性能

创建 `index2.html`。封装 runWorker 的方法，通过 new Worker 来起一个工作线程

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>worker performance optimization</title>
  </head>
  <body>
    <script>
      function runWorker(url, num) {
        return new Promise((resolve, reject) => {
          const worker = new Worker(url)
          worker.postMessage(num)
          worker.addEventListener("message", function (evt) {
            resolve(evt.data)
          })
          worker.onerror = reject
        })
      }

      runWorker("./worker.js", 10 * 10000 * 10000).then((res) => {
        document.write(res)
      })
    </script>
  </body>
</html>
```

创建 `worker.js`。通过 postMessage 向主线程发消息，监听 message 事件接收主线程发来的消息

```javascript
function calc(num) {
  let total = 0
  for (let i = 0; i < num; i++) {
    total += i
  }
  return total
}

addEventListener("message", function (evt) {
  postMessage(calc(evt.data))
})
```

耗时逻辑转移到了工作线程。再次测试下性能，主线程的 long task 消失并转移到了 worker 线程


## Node 中的 worker_threads

与浏览器类似，Node.js 提供了 `worker_threads` 模块，允许创建新的线程来执行 JavaScript 代码。这对于 CPU 密集型操作尤其有用，因为它可以避免阻塞主线程的事件循环

- `Worker` 类代表一个独立的线程。通过 `new Worker(filename, [options])` 来实例化，其中 `filename` 是一个指向要在工作线程中执行的文件的绝对或相对路径
- `MessageChannel` 用于在不同的线程之间创建一个异步、双向的通信通道。它有两个属性 `port1` 和 `port2`，分别代表通道的两端
- 在工作线程内部，可以通过 `parentPort` 对象与主线程进行通信。它提供 `on('message', ...)` 和 `postMessage(...)` 等方法。其实和浏览器里的 api 是差不多的：

示例：

```javascript
const { Worker, MessageChannel } = require("node:worker_threads")

const { port1, port2 } = new MessageChannel()

const worker = new Worker("./node-worker.js")
worker.postMessage({ value: 10 * 10000 * 10000, channel: port2 }, [port2])

port1.on("message", (value) => {
  console.log("res", value)
})
```

node-worker.js

```javascript
const { parentPort } = require("node:worker_threads")

function calc(num) {
  let total = 0
  for (let i = 0; i < num; i++) {
    total += i
  }
  return total
}

parentPort.on("message", (message) => {
  const res = calc(message.value)

  message.channel.postMessage(res)
})
```

## 构建 Node.js 线程池

单个工作线程在处理大量并发任务时仍然会成为瓶颈。为了充分利用多核 CPU 的性能，可以创建一个线程池

### 进阶实现：更健壮的线程池

一个直观的思路是：创建 n 个 worker，然后用轮询（Round-Robin）的方式把任务依次分给它们。但这种实现虽然简单，却存在一些问题：

- **轮询分配不高效**：如果某个线程的任务耗时很长，而其他线程已经空闲，新的任务仍然会按照顺序等待，造成资源浪费
- **缺乏任务队列**：当任务数超过线程数时，没有一个合适的队列来缓存等待执行的任务

实现更健壮的线程池，它包含任务队列和空闲线程管理。为了方便演示，将 Worker 脚本作为字符串内联在主文件中，通过 `{ eval: true }` 选项来执行。

**`advanced-pool.js`**

```javascript
const { Worker, isMainThread } = require("node:worker_threads")
const os = require("node:os")

// Worker 线程的执行脚本
const WORKER_SCRIPT = `
    const { parentPort } = require('node:worker_threads');

    function calc(num) {
        let total = 0;
        // 执行一个计算密集型任务
        for(let i = 0; i < num; i++) {
            total += i;
        }
        return total;
    }

    parentPort.on('message', (task) => {
        const { id, data } = task;
        const result = calc(data.value);
        // 将结果连同任务 ID 一起返回主线程
        parentPort.postMessage({ id, result });
    });
`

class ThreadPool {
  constructor(size = os.cpus().length) {
    this.workers = []
    this.freeWorkers = []
    this.tasks = [] // { id, data, resolve, reject }
    this.nextTaskId = 0

    for (let i = 0; i < size; i++) {
      this.addNewWorker()
    }
  }

  addNewWorker() {
    const worker = new Worker(WORKER_SCRIPT, { eval: true })

    worker.on("message", (message) => {
      // 任务完成，查找对应的 Promise 并 resolve
      const task = this.tasks.find((t) => t.id === message.id)
      if (task) {
        task.resolve(message.result)
        this.tasks = this.tasks.filter((t) => t.id !== message.id)
      }

      // 将 Worker 标记为空闲并尝试执行下一个任务
      this.freeWorkers.push(worker)
      this.dispatchTasks()
    })

    worker.on("error", (err) => {
      // 查找与失败的 Worker 关联的任务
      const taskIndex = this.tasks.findIndex((t) => t.worker === worker)
      if (taskIndex > -1) {
        this.tasks[taskIndex].reject(err)
        this.tasks.splice(taskIndex, 1)
      }

      // 移除失败的 Worker 并创建一个新的来维持线程池大小
      this.workers.splice(this.workers.indexOf(worker), 1)
      this.addNewWorker()
    })

    this.workers.push(worker)
    this.freeWorkers.push(worker)
  }

  run(data) {
    return new Promise((resolve, reject) => {
      const id = this.nextTaskId++
      // 将任务存入队列
      this.tasks.push({ id, data, resolve, reject, worker: null })
      this.dispatchTasks()
    })
  }

  dispatchTasks() {
    // 当有空闲 Worker 和待处理任务时，进行调度
    while (
      this.freeWorkers.length > 0 &&
      this.tasks.some((t) => t.worker === null)
    ) {
      const worker = this.freeWorkers.pop()
      const task = this.tasks.find((t) => t.worker === null)
      if (task) {
        task.worker = worker // 标记任务正在被哪个 Worker 执行
        worker.postMessage({ id: task.id, data: task.data })
      }
    }
  }
}

if (isMainThread) {
  const pool = new ThreadPool()

  console.log("启动100个计算任务...")

  const jobs = Array.from({ length: 100 }, (_, i) => {
    return pool
      .run({ value: Math.floor(Math.random() * 10000000) })
      .then(
        (result) => `任务 ${i} 完成，结果的数字位数: ${result.toString().length}`
      )
  })

  Promise.all(jobs)
    .then((results) => {
      console.log("所有任务执行完毕。")
      results.forEach((r) => console.log(r))
    })
    .catch((err) => {
      console.error("某个任务执行失败:", err)
    })
}
```

这个进阶版的线程池更加健壮和高效，它动态地将任务分配给任何一个可用的线程，确保了 CPU 资源的最大化利用

### 线程池参数调优

一个设计良好的线程池需要考虑以下参数：

- **线程数量 (Pool Size)**：通常设置为 CPU 核心数，可以通过 `os.cpus().length` 获取。对于 I/O 密集型任务，可以适当增加线程数。
- **任务队列 (Task Queue)**：当所有线程都在忙碌时，新任务需要进入队列等待。一个无界队列可能导致内存耗尽，而有界队列则需要制定拒绝策略（如抛出错误、记录日志等）。

## 性能测试与分析

为了验证线程池的优化效果，可以设计一个基准测试：

1.  **单线程测试**：在主线程中连续执行大量计算任务，记录总耗时。
2.  **线程池测试**：使用线程池并发执行相同数量的计算任务，记录总耗时。

通过对比两者的性能数据，可以清晰地看到线程池带来的性能提升。建议使用 `console.time` 和 `console.timeEnd` 来进行简单的耗时测量。

## 最佳实践与注意事项

- **适用场景**：线程池主要适用于 CPU 密集型任务。对于 I/O 密集型任务，Node.js 内置的异步非阻塞 I/O 模型通常更高效
- **线程安全**：避免在多个线程之间共享状态。如果必须共享，请使用 `Atomics` 和 `SharedArrayBuffer` 等同步机制来保证线程安全
- **通信开销**：线程间通信（`postMessage`）涉及数据序列化和反序列化，会产生性能开销。避免频繁传递大量数据
- **错误处理**：为主线程和工作线程都添加健壮的错误处理逻辑，防止因单个线程崩溃而导致整个应用失败
