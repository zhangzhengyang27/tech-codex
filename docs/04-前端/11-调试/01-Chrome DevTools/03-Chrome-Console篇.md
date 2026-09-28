---
title: Chrome-Console篇
description: 系统讲解 Console 面板：日志级别与格式化占位符、console.time/assert 等调试 API、Console Utilities API 速查（$0、$$、copy、monitorEvents、queryObjects 等）、顶层 await 与 Live Expressions，以及 console.log 对象异步求值的陷阱与自定义 Formatter。
keywords: [Chrome DevTools, Chrome-Console]
category: 调试
tags: [Chrome DevTools, Console]
---

# Chrome-Console篇

Console 是 DevTools 中最容易被误解的面板。新手用它 `console.log('here')`；中级开发者用它格式化输出和快速验证；而专家把它当作**一个完整的浏览器内 REPL 环境**——与 DOM 交互、监控事件、探查对象、性能计时。

## 2.1 基础篇：日志的艺术

### 2.1.1 五个日志级别

```javascript
console.log('通用信息')     // 常规输出
console.info('提示信息')    // 带 i 图标，语义上的"通知"
console.warn('警告信息')    // 黄色背景，表示需要注意
console.error('错误信息')   // 红色背景 + 自动堆栈跟踪
console.debug('调试信息')   // 默认隐藏，需切换日志级别为 Verbose
```

**实战建议**：

- 日常开发用 `console.log` 和 `console.warn`
- 需要追踪错误来源时用 `console.error`（它的堆栈跟踪可以直接定位到调用行）
- 准备发布前，全局搜索 `console.log` 替换为 `console.debug`，然后将控制台日志级别切换为 `Info`，即可一键隐藏调试日志
- 🆕 **日志级别过滤**：Console 顶部的过滤栏现在支持按日志级别筛选（Verbose / Info / Warnings / Errors）

### 2.1.2 条件断言：`console.assert`

当你需要在特定条件下才输出日志时，`console.assert` 比 `if` 语句更优雅：

```javascript
// ❌ 不推荐：手动 if 检查
if (response.data.length === 0) {
  console.warn('返回数据为空', response)
}

// ✅ 推荐：使用 assert 自动携带堆栈信息
console.assert(response.data.length > 0, '返回数据为空', response)
```

当第一个参数为 `false` 时，`console.assert` 会打印后续参数并显示 Assertion 错误堆栈。这对定位调用来源非常有用。

### 2.1.3 格式化占位符

`console.log` 支持类 `printf` 的格式化语法：

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `%s` | 字符串 | `console.log('Hello %s', 'World')` |
| `%d` / `%i` | 整数 | `console.log('Count: %d', 42)` |
| `%f` | 浮点数 | `console.log('Pi: %f', 3.14159)` |
| `%o` | 可展开的对象 | `console.log('Object: %o', {a:1})` |
| `%O` | JavaScript 对象（官方文档中与 `%o` 等同，点击可进入 Inspector） | `console.log('Element: %O', document.body)` |
| `%c` | CSS 样式（下一个参数） | 见下文 |

### 2.1.4 自定义样式：`%c` 玩法

```javascript
console.log(
  '%c⚠️ Auth Failed %c[401] %cCheck your token',
  'color: red; font-size: 16px; font-weight: bold;',
  'background: #333; color: #ff0; padding: 2px 6px; border-radius: 3px;',
  'color: #999; font-style: italic;'
)
```

**实战技巧**：创建一个 mini 日志工具函数：

```javascript
const log = {
  success: (msg) => console.log(`%c✓ ${msg}`, 'color: green; font-weight: bold'),
  error:   (msg) => console.log(`%c✗ ${msg}`, 'color: red; font-weight: bold'),
  info:    (msg) => console.log(`%cℹ ${msg}`, 'color: blue'),
  api:     (method, url, status) =>
    console.log(`%c${method} %c${url} %c${status}`,
      'color: cyan; font-weight: bold',
      'color: #666',
      status < 400 ? 'color: green' : 'color: red'
    )
}

log.success('User created')
log.api('POST', '/api/users', 201)
```

### 2.1.5 让你的日志更可读

#### 对象包裹

```javascript
const name = 'Alice', age = 30, role = 'Developer'

// ❌ 输出 a 30 Developer —— 谁是谁？
console.log(name, age, role)

// ✅ 输出 {name: 'Alice', age: 30, role: 'Developer'}
console.log({ name, age, role })
```

#### `console.table` —— 表格化数据

```javascript
const users = [
  { name: 'Alice', age: 25, role: 'Developer' },
  { name: 'Bob',   age: 32, role: 'Designer'  },
  { name: 'Charlie', age: 28, role: 'Manager' }
]

console.table(users)                          // 全部列
console.table(users, ['name', 'role'])        // 只显示指定列
```

`console.table` 的表格列支持**点击排序**，在处理 API 返回的数组数据时非常直观。

#### `console.group` —— 组织相关日志

```javascript
console.group('User Profile')
console.log('Name: Alice')
console.group('Address')
console.log('City: Beijing')
console.log('Street: Main St.')
console.groupEnd()
console.groupEnd()
```

- `console.group()` — 默认展开分组
- `console.groupCollapsed()` — 默认折叠分组（数据量大时推荐）
- `console.groupEnd()` — 结束当前分组

### 2.1.6 `console.count` —— 函数调用计数

```javascript
function fibonacci(n) {
  console.count('fib called')  // 每次调用计数器 +1
  if (n <= 1) return n
  return fibonacci(n - 1) + fibonacci(n - 2)
}

fibonacci(10)
// fib called: 1
// fib called: 2
// ...
// fib called: 177

console.countReset('fib called')  // 重置计数器
```

这是发现"函数被调用次数远多于预期"这类性能问题的最快方法。

### 2.1.7 `console.trace` —— 随时打印调用栈

```javascript
function deepFunction() {
  console.trace('How did I get here?')
}

function middleFunction() { deepFunction() }
function topFunction() { middleFunction() }

topFunction()
// 输出完整的调用栈：
//   deepFunction  @ VM:2
//   middleFunction @ VM:5
//   topFunction    @ VM:6
```

---

## 2.2 进阶篇：性能与计时

### 2.2.1 计时器三板斧

```javascript
console.time('data-transform')

// 执行耗时操作
const result = largeArray.map(heavyTransform).filter(complexFilter)

console.timeLog('data-transform', 'Map+Filter done')  // 输出阶段计时

const sorted = result.sort(comparator)

console.timeEnd('data-transform')  // 输出总耗时
// data-transform: 234.56ms
```

与 `performance.now()` 相比，`console.time` 更直观且无需手动计算差值。

### 2.2.2 `console.timeStamp` —— 在性能录制中添加标记

```javascript
// 需要先在 Performance 面板开始录制
console.timeStamp('开始渲染列表')
renderList(data)
console.timeStamp('列表渲染完成，开始绑定事件')
bindEvents()
console.timeStamp('事件绑定完成')
```

这些时间戳会出现在 Performance 面板的录制时间线上，帮助你关联代码逻辑与浏览器渲染事件。

### 2.2.3 `console.profile` —— 编程式性能分析

```javascript
console.profile('Expensive Calc')
expensiveCalculation()
console.profileEnd('Expensive Calc')
// Performance 面板会自动生成一份分析报告
```

> ⚠️ 这是非标准 API，但在 Chrome 中工作良好。适合无法手动点击录制按钮的自动化场景。

---

## 2.3 高级篇：Console Utilities API

Console Utilities API 是 Chrome DevTools 在 Console 上下文中注入的一套**专属 API**，这些函数仅在 Console 中可用（不在页面脚本中）。

### 2.3.1 DOM 选择器：`$` 和 `$$`

```javascript
// $(selector) —— 等同于 document.querySelector
$('.header')                // 返回第一个匹配元素
$('#main .content > p')     // 支持复杂选择器

// $$(selector) —— 等同于 document.querySelectorAll，但返回数组！
$$('.item')                 // 返回数组，不是 NodeList
$$('.item').map(el => el.textContent)   // 直接使用数组方法
$$('img[data-src]').filter(img => !img.src)  // 找到未加载的懒加载图片
```

这是 Console 效率的核心——不需要写 `Array.from(document.querySelectorAll(...))`。

### 2.3.2 DOM 节点引用：`$0` ~ `$4`

在 Elements 面板中选中的 DOM 节点，会在 Console 中自动映射为：

- `$0` — 当前选中的节点
- `$1` — 上一次选中的节点
- `$2` ~ `$4` — 更早选中的节点

```javascript
// 在 Elements 面板选中一个表格行后
$0.closest('table')         // 找到最近的表格
$0.querySelector('.price')  // 查找价格元素
$0.getBoundingClientRect()  // 获取位置尺寸
$0.style.transform = 'rotate(5deg)'  // 直接修改样式（仅临时）

// 比较最新的两次选择
$0 === $1  // 比较两个元素是否相同
```

> 💡 **技巧**：当你需要在 Console 中反复操作某个元素时，先在 Elements 面板中选中它，然后在 Console 中用 `$0` 引用即可。这比手动写选择器快得多。

### 2.3.3 上次执行结果：`$_`

```javascript
2 + 2           // → 4
$_ * 5          // → 20

await fetch('/api/users')
$_              // → Response 对象
await $_.json() // → 解析后的数据

$$('.product')      // 返回产品列表
$_                      // → 产品元素数组
$_.length               // → 产品数量
```

`$_` 让你可以在 Console 中构建"管道式"的探索流程——每步基于上步结果继续操作。

### 2.3.4 `copy()` —— 任何东西到剪贴板

```javascript
copy($0)                  // 复制 HTML 元素
copy($_.map(u => u.name)) // 复制处理后的数据
copy(JSON.stringify($_, null, 2))  // 复制格式化的 JSON
copy(location.href)       // 复制当前 URL
```

### 2.3.5 `monitor` / `unmonitor` —— 函数调用追踪

```javascript
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0)
}

monitor(calculateTotal)
// 之后每次调用 calculateTotal，Console 都会打印：
// function calculateTotal called with arguments: [Array(5)]

// 停止监控
unmonitor(calculateTotal)
```

这对第三方库中的函数调用追踪特别有用——你不需要在源码中添加 `console.log`。

### 2.3.6 `monitorEvents` / `unmonitorEvents` —— 事件监控

```javascript
// 监控单个事件类型
monitorEvents(window, 'resize')

// 监控多个事件
monitorEvents($0, ['click', 'keydown', 'focus'])

// 事件类型映射
monitorEvents($0, 'mouse')    // mousedown, mouseup, click, dblclick 等
monitorEvents($0, 'key')      // keydown, keyup, keypress
monitorEvents($0, 'touch')    // touchstart, touchend 等

// 停止监控
unmonitorEvents($0)
```

每次目标事件触发时，Console 会输出事件对象的关键信息，而不用在源码中添加 `addEventListener`。

### 2.3.7 `queryObjects` —— 查找内存中的实例

```javascript
class User {
  constructor(name) { this.name = name }
}

const a = new User('Alice')
const b = new User('Bob')

queryObjects(User)    // → [User {name: 'Alice'}, User {name: 'Bob'}]

// 高级用法：检查是否泄漏了特定类型的对象
queryObjects(Promise)  // 所有存活的 Promise 实例
queryObjects(HTMLDivElement)  // 内存中所有 div 元素
```

这是排查"某个类实例数量异常增长"问题的首选工具。

### 2.3.8 完整 Utilities 速查表

| API | 用途 |
|-----|------|
| `$(selector)` | `document.querySelector` 别名 |
| `$$(selector)` | `document.querySelectorAll`（返回数组）|
| `$0` ~ `$4` | Elements 面板选中的历史节点 |
| `$_` | 上一次 Console 执行结果 |
| `copy(obj)` | 复制到剪贴板 |
| `debug(fn)` / `undebug(fn)` | 调用函数时自动暂停 / 取消暂停 |
| `monitor(fn)` / `unmonitor(fn)` | 追踪函数调用 |
| `monitorEvents(obj[, type])` | 追踪事件触发 |
| `unmonitorEvents(obj)` | 停止事件追踪 |
| `getEventListeners(obj)` | 获取元素上的所有事件监听器 |
| `keys(obj)` | 等价于 `Object.keys` |
| `values(obj)` | 等价于 `Object.values` |
| `queryObjects(Constructor)` | 查找内存中某构造函数的实例 |

---

## 2.4 Console 即 REPL：高级交互

### 2.4.1 直接使用 `await`

Console 原生支持顶层 `await`，无需包裹 async 函数：

```javascript
// 发起 API 请求
const resp = await fetch('https://api.github.com/users/google')
const data = await resp.json()
console.table(data)

// 探索浏览器 API
await navigator.storage.estimate()
// → {quota: ..., usage: ...}

await (await fetch('/api/health')).json()
// → {status: 'ok', uptime: 12345}
```

### 2.4.2 Live Expressions — 实时监控变量

点击 Console 顶部的 👁 图标，输入任意 JavaScript 表达式，DevTools 会实时更新显示其值：

```javascript
document.activeElement          // 当前焦点元素
document.querySelectorAll('.toast').length  // Toast 数量
document.visibilityState        // 页面可见状态
performance.memory.usedJSHeapSize  // 内存使用
```

这在调试动画、表单状态、滚动位置等动态变化的数据时非常强大。

### 2.4.3 Logpoint — 不暂停代码的"断点"

在 Sources 面板中右键行号 → `Add logpoint...` → 输入要打印的表达式。代码执行到该行时，表达式结果会输出到 Console，但**不暂停执行**。

```javascript
// 在循环中设置 Logpoint：`当前 i: ${i}, 当前值: ${arr[i]}`
// Console 输出每轮迭代的变量值，但代码不暂停
```

这是 `console.log` 的零代码侵入版本——不需要修改源码即可添加日志。

---

## 2.5 疑难杂症：`console.log` 的对象异步求值

### 2.5.1 问题现象

```javascript
const user = { name: 'Alice', age: 30 }

console.log(user)     // 你期望看到 {name: 'Alice', age: 30}
user.name = 'Bob'     // 修改属性
user.age = 31

// Console 中展开对象，你看到的是 {name: 'Bob', age: 31}
// 这看起来像 console.log 发生在修改之后！
```

### 2.5.2 根本原因

`console.log` 存储的是对象**引用**，而非快照。当你展开对象查看属性时，Console **实时读取**该对象当前在内存中的状态。这意味着你可能看到的是"未来"的值。

### 2.5.3 解决方案

```javascript
// 方案 1: 打印深拷贝
console.log(JSON.parse(JSON.stringify(user)))
// 局限性：丢失函数、Symbol、undefined、循环引用

// 方案 2: 使用断点
// 在目标行设置断点，在 Scope 面板中查看变量的精确快照

// 方案 3: 打印原始属性值
console.log(user.name, user.age)  // 原始类型不受此问题影响

// 方案 4: 使用 console.dir
console.dir(user)  // 同样是引用，但展示方式更结构化
```

---

## 2.6 自定义 Formatter：重新定义数据展示

当内置的输出格式无法满足需求时，你可以编写**自定义格式化转换器**来控制对象在 Console 中的显示。

### 2.6.1 启用条件

Settings → Preferences → Console → 勾选 `Enable custom formatters`

### 2.6.2 Formatter 结构

```javascript
window.devtoolsFormatters = [{
  header(obj, config) {
    // 返回 JsonML 数组作为折叠视图
    // 返回 null 表示不处理，交给下一个 formatter
  },
  hasBody(obj, config) {
    // 返回 true 表示对象可展开
  },
  body(obj, config) {
    // 返回 JsonML 数组作为展开内容
  }
}]
```

**JsonML 格式**：`["tag", {attributes}, ...children]`

### 2.6.3 实战：Immutable.js 数据结构格式化

假设你的项目中大量使用自定义状态对象：

```javascript
class AppState {
  constructor(initial = {}) {
    Object.assign(this, initial)
  }
}

window.devtoolsFormatters = [{
  header(obj) {
    if (!(obj instanceof AppState)) return null

    return ['div', {
      style: `
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4px 12px;
        border-radius: 6px;
        font-weight: bold;
      `
    },
      `📦 AppState { ${Object.keys(obj).join(', ')} }`
    ]
  },
  hasBody(obj) {
    return obj instanceof AppState
  },
  body(obj) {
    return ['ol',
      ...Object.entries(obj).map(([key, val]) =>
        ['li', {},
          ['strong', {}, `${key}: `],
          ['span', { style: 'color: #666;' }, JSON.stringify(val)]
        ]
      )
    ]
  }
}]
```

### 2.6.4 业界应用

- **Vue.js DevTools** 和 **React DevTools** 内部使用了 Custom Formatters 来自定义组件树展示
- **Immutable.js** 有独立的 formatter 插件来展示其数据结构
- **Moment.js** 等库可以通过 formatter 用更友好的方式展示对象

---

## 2.7 参考资料

- [Chrome DevTools Console API Reference](https://developer.chrome.com/docs/devtools/console/api/)
- [Chrome DevTools Console Utilities API Reference](https://developer.chrome.com/docs/devtools/console/utilities/)
