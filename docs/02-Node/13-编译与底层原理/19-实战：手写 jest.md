---
title: 手写 Jest：从零实现一个简易版测试框架
description: 实现测试运行器的核心：描述/用例收集、断言、异步等待与覆盖率统计
keywords: [Node.js, AST, 编译, Jest]
category: Node.js
tags: [Node.js, 编译与底层原理]
---







# 手写 Jest：从零实现一个简易版测试框架

## 目录

- [前言](#前言)
- [实现背景与设计思路](#实现背景与设计思路)
- [Jest 核心概念回顾](#jest-核心概念回顾)
- [技术原理分析](#技术原理分析)
- [核心功能实现](#核心功能实现)
- [完整代码实现](#完整代码实现)

## 前言

Jest 是前端领域最流行的测试框架之一，它提供了简洁的 API、强大的 Mock 功能和完善的测试生命周期管理。然而，很多人使用了多年 Jest，却依然不了解它的内部实现原理。

本文将带你从零开始实现一个简易版的 Jest 测试框架，通过实际编码来深入理解 Jest 的核心机制。将基于 Node.js 的 VM 模块来实现代码的隔离执行，并通过模块缓存机制来实现 Mock 功能。

## 实现背景与设计思路

### 为什么要手写 Jest？

1. **理解测试框架本质**：测试框架并不神秘，它本质上就是代码执行器 + 断言库 + 报告生成器
2. **掌握 VM 模块应用**：Node.js 的 VM 模块提供了安全的代码执行环境，是构建测试框架的基础
3. **学习 Mock 实现原理**：通过操作 require.cache 来实现模块 Mock，理解其工作机制
4. **提升调试能力**：了解框架内部实现有助于更好地调试测试用例

### 设计目标

我们的简易版 Jest 将包含以下核心功能：

- ✅ 测试用例定义（test/it）
- ✅ 断言库（expect/matchers）
- ✅ 生命周期钩子（beforeAll/afterAll/beforeEach/afterEach）
- ✅ 函数 Mock（jest.fn）
- ✅ 模块 Mock（jest.mock）
- ✅ 测试结果报告

### 技术架构

```text
┌─────────────────────────────────────────┐
│           测试用例文件 (*.test.js)       │
├─────────────────────────────────────────┤
│           VM 执行环境                  │
│  ┌─────────────────────────────────────┐ │
│  │     全局 API 注入                  │ │
│  │  - test, expect, jest.fn, jest.mock │ │
│  │  - beforeAll, afterAll, beforeEach  │ │
│  │  - afterEach                        │ │
│  └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│           测试执行引擎                  │
│  ┌─────────────────────────────────────┐ │
│  │   1. 收集测试用例                  │ │
│  │   2. 执行生命周期钩子              │ │
│  │   3. 运行测试用例                  │ │
│  │   4. 收集测试结果                  │ │
│  └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│           结果报告生成                  │
└─────────────────────────────────────────┘
```

## Jest 核心概念回顾

### 基本使用示例

创建测试项目：

```bash
mkdir jest-test
cd jest-test
npm init -y
```

安装 Jest：

```bash
npm install --save-dev jest @types/jest
```

创建被测试的模块 `sum.js`：

```javascript
function sum(a, b) {
  return a + b
}

module.exports = sum
```

编写测试用例 `sum.test.js`：

```javascript
const sum = require("./sum")

test("sum test", () => {
  expect(sum(1, 2)).toBe(3)
})
```

运行测试：

```bash
npx jest
```

### 断言（Matchers）

Jest 提供了丰富的断言方法：

```javascript
expect(value).toBe(expected) // 严格相等
expect(value).toEqual(expected) // 深度相等
expect(value).toBeGreaterThan(number) // 大于
expect(value).toBeLessThan(number) // 小于
expect(value).toContain(item) // 包含
expect(value).toBeInstanceOf(Class) // 实例类型
expect(fn).toThrow(error) // 抛出异常
```

### Mock 功能

#### 函数 Mock

```javascript
const mockFn = jest.fn()
mockFn(1, 2, 3)

expect(mockFn).toHaveBeenCalled() // 是否被调用
expect(mockFn).toHaveBeenCalledTimes(1) // 调用次数
expect(mockFn).toHaveBeenCalledWith(1, 2, 3) // 调用参数
```

#### 模块 Mock

```javascript
jest.mock("fs")
const fs = require("fs")

fs.readFileSync.mockReturnValue("mocked content")
```

### 生命周期钩子

```javascript
beforeAll(() => {
  // 所有测试开始前执行一次
})

afterAll(() => {
  // 所有测试结束后执行一次
})

beforeEach(() => {
  // 每个测试开始前执行
})

afterEach(() => {
  // 每个测试结束后执行
})
```

## 技术原理分析

### VM 模块的作用

Node.js 的 VM 模块提供了在 V8 虚拟机中编译和运行代码的能力，它可以创建一个隔离的执行环境：

```javascript
const vm = require("vm")

const context = {
  console,
  globalVar: "Hello VM"
}

vm.createContext(context)

// 在隔离环境中执行代码
vm.runInContext("console.log(globalVar)", context)
```

### 模块缓存机制

Node.js 的 `require.cache` 存储了已加载模块的缓存：

```javascript
// 查看模块缓存
console.log(require.cache)

// 手动修改模块缓存
require.cache["/path/to/module.js"] = {
  id: "/path/to/module.js",
  filename: "/path/to/module.js",
  loaded: true,
  exports: {
    /* 自定义导出 */
  }
}
```

### 错误堆栈解析

当代码抛出异常时，可以通过错误堆栈获取出错位置：

```javascript
try {
  throw new Error("Test error")
} catch (error) {
  console.log(error.stack)
  // 输出类似：
  // Error: Test error
  //     at Object.<anonymous> (/path/to/file.js:3:9)
}
```

## 核心功能实现

### 1. 全局状态管理

首先实现一个全局状态管理器，用于存储测试用例和生命周期钩子：

```javascript
const createState = () => {
  global["STATE"] = {
    testBlock: [], // 测试用例数组
    beforeEachBlock: [], // beforeEach 钩子数组
    beforeAllBlock: [], // beforeAll 钩子数组
    afterEachBlock: [], // afterEach 钩子数组
    afterAllBlock: [], // afterAll 钩子数组
    reports: [] // 测试结果报告
  }
}

const dispatch = (event) => {
  const { fn, type, name, pass } = event
  const state = global["STATE"]

  switch (type) {
    case "ADD_TEST":
      state.testBlock.push({ fn, name })
      break
    case "BEFORE_EACH":
      state.beforeEachBlock.push(fn)
      break
    case "BEFORE_ALL":
      state.beforeAllBlock.push(fn)
      break
    case "AFTER_EACH":
      state.afterEachBlock.push(fn)
      break
    case "AFTER_ALL":
      state.afterAllBlock.push(fn)
      break
    case "COLLECT_REPORT":
      state.reports.push({ name, pass })
      break
  }
}
```

### 2. 测试 API 实现

实现 test、beforeAll、beforeEach 等 API：

```javascript
const test = (name, fn) => dispatch({ type: "ADD_TEST", fn, name })
const afterAll = (fn) => dispatch({ type: "AFTER_ALL", fn })
const afterEach = (fn) => dispatch({ type: "AFTER_EACH", fn })
const beforeAll = (fn) => dispatch({ type: "BEFORE_ALL", fn })
const beforeEach = (fn) => dispatch({ type: "BEFORE_EACH", fn })
```

### 3. 断言库实现

实现 expect 断言库，包含常用的 matcher：

```javascript
const expect = (actual) => ({
  toBe(expected) {
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`)
    }
  },

  toEqual(expected) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(
        `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`
      )
    }
  },

  toBeGreaterThan(expected) {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`)
    }
  },

  toBeLessThan(expected) {
    if (actual >= expected) {
      throw new Error(`Expected ${actual} to be less than ${expected}`)
    }
  },

  toContain(expected) {
    if (!actual.includes(expected)) {
      throw new Error(`Expected ${actual} to contain ${expected}`)
    }
  },

  toBeInstanceOf(expected) {
    if (!(actual instanceof expected)) {
      throw new Error(`Expected ${actual} to be instance of ${expected.name}`)
    }
  },

  toThrow(expected) {
    let thrown = false
    let error

    try {
      actual()
    } catch (e) {
      thrown = true
      error = e
    }

    if (!thrown) {
      throw new Error(`Expected function to throw, but it didn't`)
    }

    if (expected && !error.message.includes(expected)) {
      throw new Error(
        `Expected error message to include "${expected}", but got "${error.message}"`
      )
    }
  }
})
```

### 4. Mock 功能实现

#### 函数 Mock

```javascript
const jest = {
  fn(impl = () => {}) {
    const mockFn = (...args) => {
      mockFn.mock.calls.push(args)
      return impl(...args)
    }

    mockFn.originImpl = impl
    mockFn.mock = { calls: [] }

    // 添加 Mock 方法
    mockFn.mockReturnValue = (value) => {
      mockFn.originImpl = impl
      impl = () => value
      return mockFn
    }

    mockFn.mockImplementation = (newImpl) => {
      impl = newImpl
      return mockFn
    }

    return mockFn
  }
}
```

#### 模块 Mock

```javascript
const jest = {
  // ... 前面的代码

  mock(mockPath, mockExports = {}) {
    try {
      const path = require.resolve(mockPath, { paths: ["."] })
      require.cache[path] = {
        id: path,
        filename: path,
        loaded: true,
        exports: mockExports
      }
    } catch (error) {
      console.warn(`Warning: Could not resolve module ${mockPath}`)
    }
  }
}
```

### 5. 测试执行引擎

实现测试用例的执行逻辑：

```javascript
const executeTests = async () => {
  const state = global["STATE"]

  // 执行 beforeAll 钩子
  for (const beforeAllFn of state.beforeAllBlock) {
    try {
      await beforeAllFn()
    } catch (error) {
      console.error(`beforeAll hook failed:`, error)
      return
    }
  }

  // 执行测试用例
  for (const testCase of state.testBlock) {
    const { fn, name } = testCase

    try {
      // 执行 beforeEach 钩子
      for (const beforeEachFn of state.beforeEachBlock) {
        await beforeEachFn()
      }

      // 执行测试用例
      await fn()

      // 记录成功结果
      dispatch({ type: "COLLECT_REPORT", name, pass: 1 })
      console.log(`✓ ${name}`)

      // 执行 afterEach 钩子
      for (const afterEachFn of state.afterEachBlock) {
        await afterEachFn()
      }
    } catch (error) {
      // 记录失败结果
      dispatch({ type: "COLLECT_REPORT", name, pass: 0 })
      console.error(`✗ ${name}`)
      console.error(`  ${error.message}`)

      // 即使失败也要执行 afterEach
      for (const afterEachFn of state.afterEachBlock) {
        try {
          await afterEachFn()
        } catch (afterError) {
          console.error(`afterEach hook failed:`, afterError)
        }
      }
    }
  }

  // 执行 afterAll 钩子
  for (const afterAllFn of state.afterAllBlock) {
    try {
      await afterAllFn()
    } catch (error) {
      console.error(`afterAll hook failed:`, error)
    }
  }

  // 生成测试报告
  generateReport()
}

const generateReport = () => {
  const { reports } = global["STATE"]
  const passed = reports.filter((r) => r.pass === 1).length
  const total = reports.length

  console.log(`\nTest Results: ${passed}/${total} passed`)

  if (passed === total) {
    console.log("All tests passed! 🎉")
  } else {
    console.log(`${total - passed} tests failed ❌`)
    process.exit(1)
  }
}
```

## 完整代码实现

以下是完整的 `my-jest.js` 实现（把前面各部分组装起来，并加上注入全局 API 和加载测试文件的入口逻辑）：

```javascript
// my-jest.js
const path = require("path")

// ========== 1. 全局状态管理 ==========
const createState = () => {
  global["STATE"] = {
    testBlock: [], // 测试用例数组
    beforeEachBlock: [], // beforeEach 钩子数组
    beforeAllBlock: [], // beforeAll 钩子数组
    afterEachBlock: [], // afterEach 钩子数组
    afterAllBlock: [], // afterAll 钩子数组
    reports: [] // 测试结果报告
  }
}

const dispatch = (event) => {
  const { fn, type, name, pass } = event
  const state = global["STATE"]

  switch (type) {
    case "ADD_TEST":
      state.testBlock.push({ fn, name })
      break
    case "BEFORE_EACH":
      state.beforeEachBlock.push(fn)
      break
    case "BEFORE_ALL":
      state.beforeAllBlock.push(fn)
      break
    case "AFTER_EACH":
      state.afterEachBlock.push(fn)
      break
    case "AFTER_ALL":
      state.afterAllBlock.push(fn)
      break
    case "COLLECT_REPORT":
      state.reports.push({ name, pass })
      break
  }
}

// ========== 2. 测试 API ==========
const test = (name, fn) => dispatch({ type: "ADD_TEST", fn, name })
const it = test // it 是 test 的别名
const beforeAll = (fn) => dispatch({ type: "BEFORE_ALL", fn })
const afterAll = (fn) => dispatch({ type: "AFTER_ALL", fn })
const beforeEach = (fn) => dispatch({ type: "BEFORE_EACH", fn })
const afterEach = (fn) => dispatch({ type: "AFTER_EACH", fn })

// ========== 3. 断言库 ==========
const expect = (actual) => ({
  toBe(expected) {
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`)
    }
  },

  toEqual(expected) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(
        `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`
      )
    }
  },

  toBeGreaterThan(expected) {
    if (actual <= expected) {
      throw new Error(`Expected ${actual} to be greater than ${expected}`)
    }
  },

  toBeLessThan(expected) {
    if (actual >= expected) {
      throw new Error(`Expected ${actual} to be less than ${expected}`)
    }
  },

  toContain(expected) {
    if (!actual.includes(expected)) {
      throw new Error(`Expected ${actual} to contain ${expected}`)
    }
  },

  toBeInstanceOf(expected) {
    if (!(actual instanceof expected)) {
      throw new Error(`Expected ${actual} to be instance of ${expected.name}`)
    }
  },

  toThrow(expected) {
    let thrown = false
    let error

    try {
      actual()
    } catch (e) {
      thrown = true
      error = e
    }

    if (!thrown) {
      throw new Error(`Expected function to throw, but it didn't`)
    }

    if (expected && !error.message.includes(expected)) {
      throw new Error(
        `Expected error message to include "${expected}", but got "${error.message}"`
      )
    }
  }
})

// ========== 4. Mock ==========
const jest = {
  fn(impl = () => {}) {
    const mockFn = (...args) => {
      mockFn.mock.calls.push(args)
      return impl(...args)
    }

    mockFn.originImpl = impl
    mockFn.mock = { calls: [] }

    // 添加 Mock 方法
    mockFn.mockReturnValue = (value) => {
      mockFn.originImpl = impl
      impl = () => value
      return mockFn
    }

    mockFn.mockImplementation = (newImpl) => {
      impl = newImpl
      return mockFn
    }

    return mockFn
  },

  // 模块 Mock：提前把模块缓存替换成自定义的导出
  mock(mockPath, mockExports = {}) {
    try {
      const path = require.resolve(mockPath, { paths: ["."] })
      require.cache[path] = {
        id: path,
        filename: path,
        loaded: true,
        exports: mockExports
      }
    } catch (error) {
      console.warn(`Warning: Could not resolve module ${mockPath}`)
    }
  }
}

// ========== 5. 测试执行引擎 ==========
const executeTests = async () => {
  const state = global["STATE"]

  // 执行 beforeAll 钩子
  for (const beforeAllFn of state.beforeAllBlock) {
    try {
      await beforeAllFn()
    } catch (error) {
      console.error(`beforeAll hook failed:`, error)
      return
    }
  }

  // 执行测试用例
  for (const testCase of state.testBlock) {
    const { fn, name } = testCase

    try {
      // 执行 beforeEach 钩子
      for (const beforeEachFn of state.beforeEachBlock) {
        await beforeEachFn()
      }

      // 执行测试用例
      await fn()

      // 记录成功结果
      dispatch({ type: "COLLECT_REPORT", name, pass: 1 })
      console.log(`✓ ${name}`)

      // 执行 afterEach 钩子
      for (const afterEachFn of state.afterEachBlock) {
        await afterEachFn()
      }
    } catch (error) {
      // 记录失败结果
      dispatch({ type: "COLLECT_REPORT", name, pass: 0 })
      console.error(`✗ ${name}`)
      console.error(`  ${error.message}`)

      // 即使失败也要执行 afterEach
      for (const afterEachFn of state.afterEachBlock) {
        try {
          await afterEachFn()
        } catch (afterError) {
          console.error(`afterEach hook failed:`, afterError)
        }
      }
    }
  }

  // 执行 afterAll 钩子
  for (const afterAllFn of state.afterAllBlock) {
    try {
      await afterAllFn()
    } catch (error) {
      console.error(`afterAll hook failed:`, error)
    }
  }

  // 生成测试报告
  generateReport()
}

const generateReport = () => {
  const { reports } = global["STATE"]
  const passed = reports.filter((r) => r.pass === 1).length
  const total = reports.length

  console.log(`\nTest Results: ${passed}/${total} passed`)

  if (passed === total) {
    console.log("All tests passed! 🎉")
  } else {
    console.log(`${total - passed} tests failed ❌`)
    process.exit(1)
  }
}

// ========== 6. 入口：注入全局 API 并加载测试文件 ==========
const run = (testFilePath) => {
  createState()

  // 把测试 API 注入全局，这样测试文件里就可以直接使用
  global.test = test
  global.it = it
  global.expect = expect
  global.jest = jest
  global.beforeAll = beforeAll
  global.afterAll = afterAll
  global.beforeEach = beforeEach
  global.afterEach = afterEach

  // 加载测试文件，这一步会收集所有的测试用例和钩子
  require(path.resolve(testFilePath))

  // 收集完毕，开始执行
  executeTests()
}

// 从命令行参数取测试文件路径，默认为 sum.test.js
run(process.argv[2] || "./sum.test.js")
```

运行方式：

```bash
node my-jest.js ./sum.test.js
# 输出：
# ✓ sum test
#
# Test Results: 1/1 passed
# All tests passed! 🎉
```

真实 Jest 的实现要复杂得多（如基于 VM 的隔离执行、transform 管道、并发调度等），但核心思路就是这三步：**收集测试用例 → 注入全局 API 执行 → 汇总报告**。
