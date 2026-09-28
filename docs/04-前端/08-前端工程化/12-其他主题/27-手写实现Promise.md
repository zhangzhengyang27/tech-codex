---
title: "手写实现 Promise"
description: 以面试视角实现一个简化版 MyPromise：异步执行、then/catch 链式调用、resolve/reject 与 all/race 静态方法，并附浏览器测试页面
category: 前端工程化
keywords: [Promise, 手写实现, 异步, JavaScript]
---

# 手写实现 Promise

要从 0 实现一个 Promise/A+ 的所有功能，是非常复杂的。面试一共 1h，不可能考这么详细。再者，绝大部分程序员也无法短时间、高质量地写出一个完整的 Promise。因为日常不写，只用。

所以，面试考察“手写 Promise”考察的就是一个设计思路，编码能力。并不是真让你写出来使用。

Promise 基本功能（面试时能写出这些，就足够了）

- 初始化
- 异步执行
- then、catch 和链式调用
- `.resolve`、`.reject`
- `.all`、`.race`

写代码……

## 测试

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MyPromise</title>
  </head>
  <body>
    <h1>MyPromise</h1>

    <script src="./MyPromise.js"></script>
    <script>
      const p1 = new MyPromise((resolve, reject) => {
        // resolve(100)
        // reject('错误信息...')
        setTimeout(() => {
          resolve(100);
        }, 1000);
      });

      // const p11 = p1.then(data1 => {
      //     console.log('data1', data1)
      //     return data1 + 1
      // })
      // const p12 = p11.then(data2 => {
      //     console.log('data2', data2)
      //     return data2 + 2
      // })
      // const p13 = p12.catch(err => console.error(err))

      const p2 = MyPromise.resolve(200);
      const p3 = MyPromise.resolve(300);
      const p4 = MyPromise.reject("错误信息...");
      // 传入 promise 数组，等待所有的都 fulfilled 之后，返回新 promise ，包含前面所有的结果
      // const p5 = MyPromise.all([p1, p2, p3]) 
      // p5.then(result => console.log('all result', result))
      const p6 = MyPromise.race([p1, p2, p3]); // 传入 promise 数组，只要有一个最先完成（fulfilled 或 rejected）即可返回
      p6.then((result) => console.log("race result", result));
    </script>
  </body>
</html>
```

## MyPromise.js

```javascript
class MyPromise {
  state = 'pending' // 状态，'pending' 'fulfilled' 'rejected'
  value = undefined // 成功后的值
  reason = undefined // 失败后的原因

  resolveCallbacks = [] // pending 状态下，存储成功的回调
  rejectCallbacks = [] // pending 状态下，存储失败的回调

  constructor(fn) {
    const resolveHandler = (value) => {
      // 加 setTimeout ，参考 https://coding.imooc.com/learn/questiondetail/257287.html (2022.01.21)
      setTimeout(() => {
        if (this.state === 'pending') {
          this.state = 'fulfilled'
          this.value = value
          this.resolveCallbacks.forEach(fn => fn(value))
        }
      })
    }

    const rejectHandler = (reason) => {
      // 加 setTimeout ，参考 https://coding.imooc.com/learn/questiondetail/257287.html (2022.01.21)
      setTimeout(() => {
        if (this.state === 'pending') {
          this.state = 'rejected'
          this.reason = reason
          this.rejectCallbacks.forEach(fn => fn(reason))
        }
      })
    }

    try {
      fn(resolveHandler, rejectHandler)
    } catch (err) {
      rejectHandler(err)
    }
  }

  then(fn1, fn2) {
    fn1 = typeof fn1 === 'function' ? fn1 : (v) => v
    // 默认 fn2 抛出错误，保证未处理的 rejection 继续向后传递（符合 Promise 语义）
    fn2 = typeof fn2 === 'function' ? fn2 : (e) => { throw e }

    if (this.state === 'pending') {
      const p1 = new MyPromise((resolve, reject) => {
        this.resolveCallbacks.push(() => {
          try {
            const newValue = fn1(this.value)
            resolve(newValue)
          } catch (err) {
            reject(err)
          }
        })

        this.rejectCallbacks.push(() => {
          try {
            const newReason = fn2(this.reason)
            // onRejected 正常返回时，新 promise 应变为 fulfilled（如 catch 捕获后恢复）
            resolve(newReason)
          } catch (err) {
            reject(err)
          }
        })
      })
      return p1
    }

    if (this.state === 'fulfilled') {
      const p1 = new MyPromise((resolve, reject) => {
        try {
          const newValue = fn1(this.value)
          resolve(newValue)
        } catch (err) {
          reject(err)
        }
      })
      return p1
    }

    if (this.state === 'rejected') {
      const p1 = new MyPromise((resolve, reject) => {
        try {
          const newReason = fn2(this.reason)
          // onRejected 正常返回时，新 promise 应变为 fulfilled（如 catch 捕获后恢复）
          resolve(newReason)
        } catch (err) {
          reject(err)
        }
      })
      return p1
    }
  }

  // 就是 then 的一个语法糖，简单模式
  catch(fn) {
    return this.then(null, fn)
  }
}

MyPromise.resolve = function (value) {
  return new MyPromise((resolve, reject) => resolve(value))
}
MyPromise.reject = function (reason) {
  return new MyPromise((resolve, reject) => reject(reason))
}

MyPromise.all = function (promiseList = []) {
  const p1 = new MyPromise((resolve, reject) => {
    const result = [] // 存储 promiseList 所有的结果
    const length = promiseList.length
    let resolvedCount = 0

    promiseList.forEach((p, i) => {
      p.then(data => {
        // 按传入顺序存储结果，与原生 Promise.all 一致
        result[i] = data

        // resolvedCount 必须在 then 里面做 ++
        // 不能用 index
        resolvedCount++
        if (resolvedCount === length) {
          // 已经遍历到了最后一个 promise
          resolve(result)
        }
      }).catch(err => {
        reject(err)
      })
    })
  })
  return p1
}

MyPromise.race = function (promiseList = []) {
  let resolved = false // 标记
  const p1 = new Promise((resolve, reject) => {
    promiseList.forEach(p => {
      p.then(data => {
        if (!resolved) {
          resolve(data)
          resolved = true
        }
      }).catch((err) => {
        reject(err)
      })
    })
  })
  return p1
}
```