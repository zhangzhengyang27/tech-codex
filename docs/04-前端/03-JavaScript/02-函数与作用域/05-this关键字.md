---
title: this关键字
description: "this 是 JavaScript 中最核心也是最令人困惑的概念之一。它的值不是在函数定义时确定的，而是在函数调用时确定的。理解 this 的工作原理对于编写可靠、可维护的 JavaScript 代码至关重要。"
keywords: [this关键字]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---


# this 关键字

`this` 是 JavaScript 中最核心也是最令人困惑的概念之一。它的值不是在函数定义时确定的，而是在函数调用时确定的。理解 `this` 的工作原理对于编写可靠、可维护的 JavaScript 代码至关重要。

## 概述

`this` 关键字是函数运行时自动生成的一个内部对象，只能在函数内部使用，指向调用该函数的对象。与大多数语言不同，JavaScript 的 `this` 是动态绑定的，其值取决于函数的调用方式。

### this 的特点

- **动态性**：`this` 的值在函数调用时确定，而非定义时
- **上下文依赖**：同一个函数在不同调用方式下，`this` 可能指向不同对象
- **不可变性**：一旦绑定，`this` 的值不能被重新赋值（箭头函数除外）

## this 的本质

### 执行上下文与 this

```javascript
// 执行上下文包含三个重要部分：
// 1. 变量对象（Variable Object）
// 2. 作用域链（Scope Chain）
// 3. this 值

function example() {
  console.log(this)  // this 是执行上下文的一部分
}

// 不同的调用方式创建不同的执行上下文
example()              // 全局执行上下文，this = window（非严格模式）
new example()          // 函数执行上下文，this = 新创建的对象
example.call({})       // 函数执行上下文，this = 指定的对象
```

### this 的数据类型

```javascript
function showThis() {
  'use strict'
  console.log(typeof this, this)
}

showThis()                    // 'undefined' undefined
showThis.call('string')       // 'object' String {'string'}（原始值被包装）
showThis.call(42)             // 'object' Number {42}
showThis.call(null)           // 'undefined' undefined（null/undefined 被忽略）
showThis.call(undefined)      // 'undefined' undefined
showThis.call({ name: 'obj' }) // 'object' { name: 'obj' }
```

## 绑定规则详解

### 1. 默认绑定

独立函数调用时，`this` 指向全局对象（严格模式下为 `undefined`）。

#### 基础示例

```javascript
// 非严格模式
function foo() {
  console.log(this === window)  // true
}

foo()

// 严格模式
function bar() {
  'use strict'
  console.log(this)  // undefined
}

bar()
```

#### 函数调用链

```javascript
function foo() {
  console.log(this.a)  // 2
}

function bar() {
  'use strict'
  console.log(this)    // undefined
  foo()                // 仍然是默认绑定
}

var a = 2
bar()  // 输出 2
```

#### 嵌套函数中的 this

```javascript
function outer() {
  console.log('outer:', this.name)
  
  function inner() {
    console.log('inner:', this.name)
  }
  
  inner()  // 默认绑定
}

var name = 'global'
const obj = { name: 'obj', outer }

obj.outer()
// 输出:
// outer: obj
// inner: global
```

### 2. 隐式绑定

当函数作为对象的方法调用时，`this` 指向调用该函数的对象。

#### 基础示例

```javascript
const obj = {
  name: 'obj',
  foo: function () {
    console.log(this.name)
  },
  bar() {
    console.log(this.name)
  }
}

obj.foo()  // 'obj'
obj.bar()  // 'obj'

// 只有最后一层调用位置起作用
const obj2 = {
  name: 'obj2',
  obj1: obj
}

obj2.obj1.foo()  // 'obj'（obj1 是调用位置）
```

#### 对象引用链

```javascript
function foo() {
  console.log(this.a)
}

const obj2 = { a: 42, foo }
const obj1 = { a: 2, obj2 }

obj1.obj2.foo()  // 42（obj2 是最近的引用）
```

#### 隐式丢失

这是最常见的 `this` 绑定问题：

```javascript
const obj = {
  name: 'obj',
  foo: function () {
    console.log(this.name)
  }
}

// 场景1：赋值给变量
const foo = obj.foo
foo()  // undefined（默认绑定）

// 场景2：作为参数传递
function callFn(fn) {
  fn()  // 函数被独立调用，this 丢失
}
callFn(obj.foo)  // undefined

// 场景3：作为回调函数
const arr = [1, 2, 3]
arr.forEach(obj.foo)  // undefined

// 场景4：作为事件处理函数
button.addEventListener('click', obj.foo)  // this 指向 button，而非 obj

// 场景5：setTimeout 中的回调
setTimeout(obj.foo, 1000)  // undefined（定时器回调在全局环境执行）

// 场景6：对象方法简写（容易误解）
const obj2 = {
  name: 'obj2',
  foo: obj.foo
}
obj2.foo()  // 'obj2'（正常工作，因为是通过 obj2 调用）
```

#### 隐式丢失的解决方案

```javascript
const obj = {
  name: 'obj',
  foo: function () {
    console.log(this.name)
  }
}

// 方案1：使用 bind
setTimeout(obj.foo.bind(obj), 100)  // 'obj'

// 方案2：使用箭头函数
setTimeout(() => obj.foo(), 100)  // 'obj'

// 方案3：使用闭包保存 this
const preservedFoo = function() {
  obj.foo()
}
setTimeout(preservedFoo, 100)  // 'obj'

// 方案4：包装函数
function doFoo(fn, context) {
  fn.call(context)
}
doFoo(obj.foo, obj)  // 'obj'
```

### 3. 显式绑定

使用 `call`、`apply`、`bind` 显式指定 `this`。

#### call 方法

**语法**：`func.call(thisArg, arg1, arg2, ...)`

```javascript
function greet(greeting, punctuation) {
  console.log(greeting + ', ' + this.name + punctuation)
}

const person = { name: 'John' }

greet.call(person, 'Hello', '!')  // 'Hello, John!'

// 实际应用：借用方法
const arrayLike = { 0: 'a', 1: 'b', 2: 'c', length: 3 }
const arr = Array.prototype.slice.call(arrayLike)
console.log(arr)  // ['a', 'b', 'c']

// 借用数组方法
const obj = {
  0: 10,
  1: 20,
  2: 30,
  length: 3
}

const max = Math.max.apply(null, Array.from(obj))
console.log(max)  // 30
```

#### apply 方法

**语法**：`func.apply(thisArg, [argsArray])`

```javascript
function greet(greeting, punctuation) {
  console.log(greeting + ', ' + this.name + punctuation)
}

const person = { name: 'John' }

greet.apply(person, ['Hello', '!'])  // 'Hello, John!'

// 实际应用：展开数组作为参数
const numbers = [5, 6, 2, 3, 7]
const max = Math.max.apply(null, numbers)
console.log(max)  // 7

// ES6 更好的方式
const maxES6 = Math.max(...numbers)
console.log(maxES6)  // 7
```

#### call vs apply 对比

```javascript
function example(a, b, c) {
  console.log(this.name, a, b, c)
}

const obj = { name: 'obj' }

// call：参数逐个传递
example.call(obj, 1, 2, 3)  // 'obj' 1 2 3

// apply：参数作为数组传递
example.apply(obj, [1, 2, 3])  // 'obj' 1 2 3

// 选择原则：
// - 已知参数数量时，使用 call
// - 参数是数组或动态生成时，使用 apply
```

#### bind 方法

**语法**：`func.bind(thisArg, arg1, arg2, ...)`

```javascript
function foo(a, b) {
  console.log(this.name, a, b)
}

const obj = { name: 'obj' }

// bind 返回一个新函数
const boundFoo = foo.bind(obj)

boundFoo(1, 2)  // 'obj' 1 2
console.log(boundFoo !== foo)  // true

// bind 的偏函数应用：预设部分参数
const boundFooPreset = foo.bind(obj, 10)
boundFooPreset(20)  // 'obj' 10 20

// bind 返回的函数 this 不可再被 call/apply 覆盖
console.log(boundFoo.call({ name: 'other' }))  // 仍输出 'obj'

// 场景：事件处理器使用 bind 绑定 this
const button = {
  text: 'Click Me',
  init() {
    // 绑定 this 为 button，避免回调中丢失
    document.addEventListener('click', this.handleClick.bind(this))
  },
  handleClick() {
    console.log('Button clicked:', this.text)
  }
}

button.init()  // 回调中的 this 正确绑定到 button
```

#### 硬绑定

```javascript
function foo() {
  console.log(this.name)
}

const obj = { name: 'obj' }

// 硬绑定，防止 this 被修改
const boundFoo = foo.bind(obj)
boundFoo()  // 'obj'

// 即使使用 call/apply 也无法改变
boundFoo.call({ name: 'other' })  // 'obj'

// 作为对象方法调用也无效
const anotherObj = { name: 'another', foo: boundFoo }
anotherObj.foo()  // 'obj'

// 手动实现 bind
function simpleBind(fn, obj) {
  return function() {
    return fn.apply(obj, arguments)
  }
}

const manualBound = simpleBind(foo, obj)
manualBound()  // 'obj'
```

#### null/undefined 的特殊处理

```javascript
function foo() {
  console.log(this)
}

// 非严格模式下，null/undefined 会被替换为全局对象
foo.call(null)       // window
foo.call(undefined)  // window

// 严格模式下，保持原值
function bar() {
  'use strict'
  console.log(this)
}
bar.call(null)       // null
bar.call(undefined)  // undefined

// 安全实践：使用空对象
const ø = Object.create(null)
foo.call(ø)  // ø（避免意外修改全局对象）
```

### 4. new 绑定

使用 `new` 关键字调用构造函数，`this` 指向新创建的对象。

#### new 的执行过程

```javascript
// new 操作符的四个步骤：
// 1. 创建一个全新的对象
// 2. 将对象的原型指向构造函数的 prototype
// 3. 将构造函数的 this 绑定到新对象，并执行代码
// 4. 如果构造函数返回对象，则返回该对象；否则返回新对象

function Person(name, age) {
  // this 指向新创建的对象
  this.name = name
  this.age = age
  this.greet = function() {
    console.log(`Hello, I'm ${this.name}`)
  }
  // 默认返回 this
}

const person = new Person('John', 30)
console.log(person.name)  // 'John'
console.log(person instanceof Person)  // true
```

#### 手动实现 new

```javascript
function myNew(Constructor, ...args) {
  // 1. 创建新对象，原型指向构造函数的 prototype
  const obj = Object.create(Constructor.prototype)
  
  // 2. 执行构造函数，绑定 this
  const result = Constructor.apply(obj, args)
  
  // 3. 如果返回对象，使用返回值；否则返回新对象
  return result instanceof Object ? result : obj
}

// 测试
function Person(name) {
  this.name = name
}

const person = myNew(Person, 'John')
console.log(person.name)  // 'John'
console.log(person instanceof Person)  // true
```

#### 构造函数返回值的影响

```javascript
// 返回对象
function Person1(name) {
  this.name = name
  return { name: 'returned' }
}

const p1 = new Person1('John')
console.log(p1.name)  // 'returned'
console.log(p1 instanceof Person1)  // false

// 返回原始值（被忽略）
function Person2(name) {
  this.name = name
  return 'primitive'
}

const p2 = new Person2('John')
console.log(p2.name)  // 'John'
console.log(p2 instanceof Person2)  // true

// 返回 null（同样被忽略——规范只将"返回值为对象"视为覆盖，null 不是对象）
function Person3(name) {
  this.name = name
  return null
}

const p3 = new Person3('John')
console.log(p3.name)  // 'John'
console.log(p3 instanceof Person3)  // true
```

#### 类中的 new 绑定

```javascript
class Person {
  constructor(name) {
    this.name = name
  }
  
  greet() {
    console.log(`Hello, I'm ${this.name}`)
  }
}

const person = new Person('John')
person.greet()  // "Hello, I'm John"

// 类必须使用 new 调用
try {
  Person('John')  // TypeError: Class constructor Person cannot be invoked without 'new'
} catch (e) {
  console.log(e.message)
}
```

## 绑定优先级

### 优先级顺序

从高到低：
1. **new 绑定** - 最高优先级
2. **显式绑定** - call/apply/bind
3. **隐式绑定** - 对象方法调用
4. **默认绑定** - 独立函数调用

### 优先级验证

```javascript
// 1. 显式绑定 vs 隐式绑定
function foo() {
  console.log(this.name)
}

const obj1 = { name: 'obj1', foo }
const obj2 = { name: 'obj2' }

obj1.foo()           // 'obj1'（隐式绑定）
obj1.foo.call(obj2)  // 'obj2'（显式绑定优先）

// 2. new 绑定 vs 隐式绑定
function Bar(name) {
  this.name = name
}

const obj = { name: 'obj', Bar }
const instance = new obj.Bar('instance')
console.log(instance.name)  // 'instance'（new 绑定优先）
console.log(obj.name)       // 'obj'（未被修改）

// 3. new 绑定 vs 显式绑定
function Baz(name) {
  this.name = name
}

const boundBaz = Baz.bind({ name: 'bound' })
const instance2 = new boundBaz('new')
console.log(instance2.name)  // 'new'（new 绑定优先）
```

### 优先级流程图

```
判断 this 绑定流程：

                    函数调用
                       |
                       ▼
              是否使用 new？
                /          \
              是            否
               |             |
               ▼             ▼
         新创建对象    是否使用 call/apply/bind？
                           /           \
                         是             否
                          |              |
                          ▼              ▼
                    指定的对象    是否作为对象方法调用？
                                   /           \
                                 是             否
                                  |              |
                                  ▼              ▼
                             该对象         默认绑定
                                          (严格模式: undefined)
                                          (非严格: window)
```

## 箭头函数的 this

### 箭头函数的特性

箭头函数没有自己的 `this`，它会捕获定义时外层作用域的 `this`，这是词法作用域的体现。

```javascript
const obj = {
  name: 'obj',
  
  // 传统函数
  foo: function () {
    console.log(this.name)  // 'obj'
  },
  
  // 箭头函数
  bar: () => {
    console.log(this.name)  // undefined（捕获全局作用域的 this）
  }
}

obj.foo()  // 'obj'
obj.bar()  // undefined
```

### 词法 this 的工作原理

```javascript
const obj = {
  name: 'obj',
  
  foo: function () {
    // 箭头函数捕获 foo 的 this
    const arrow = () => {
      console.log(this.name)
    }
    return arrow
  }
}

const fn = obj.foo()
fn()  // 'obj'（箭头函数捕获了 obj）

// 等价于
const obj2 = {
  name: 'obj2',
  
  foo: function () {
    const self = this  // 保存 this
    return function() {
      console.log(self.name)
    }
  }
}
```

### 箭头函数解决 this 问题

#### 回调函数中的 this

```javascript
const obj = {
  name: 'obj',
  
  // ❌ 传统函数的问题
  getNameWrong: function () {
    setTimeout(function () {
      console.log(this.name)  // undefined
    }, 100)
  },
  
  // ✅ 使用箭头函数
  getNameRight: function () {
    setTimeout(() => {
      console.log(this.name)  // 'obj'
    }, 100)
  },
  
  // ✅ 使用 bind
  getNameBind: function () {
    setTimeout(function () {
      console.log(this.name)
    }.bind(this), 100)
  }
}

obj.getNameWrong()   // undefined
obj.getNameRight()   // 'obj'
obj.getNameBind()    // 'obj'
```

#### 数组方法中的 this

```javascript
const obj = {
  name: 'obj',
  arr: [1, 2, 3],
  
  // ❌ 传统函数
  processWrong: function () {
    this.arr.forEach(function (item) {
      console.log(this.name, item)  // undefined 1, undefined 2, ...
    })
  },
  
  // ✅ 箭头函数
  processRight: function () {
    this.arr.forEach((item) => {
      console.log(this.name, item)  // 'obj' 1, 'obj' 2, ...
    })
  },
  
  // ✅ 使用 thisArg 参数
  processThisArg: function () {
    this.arr.forEach(function (item) {
      console.log(this.name, item)
    }, this)
  }
}
```

#### 事件处理中的 this

```javascript
class Button {
  constructor(text) {
    this.text = text
    
    // ❌ 传统函数，this 会指向 DOM 元素
    this.handleClick = function() {
      console.log(this.text)  // undefined
    }
  }
  
  // ✅ 使用箭头函数（类字段）
  handleClickArrow = () => {
    console.log(this.text)  // 正确
  }
  
  // ✅ 在构造函数中绑定
  setupListener() {
    document.querySelector('button').addEventListener('click', () => {
      console.log(this.text)  // 正确
    })
  }
}
```

### 箭头函数不能绑定 this

```javascript
const arrow = () => {
  console.log(this)
}

const obj = { name: 'obj' }

// 所有绑定方式都无效
arrow.call(obj)    // window
arrow.apply(obj)   // window
arrow.bind(obj)()  // window

// 原理：箭头函数没有 [[Construct]] 内部方法（因此不能用 new 调用），
// 也没有自己的 this 绑定机制
```

### 箭头函数的适用场景

```javascript
// ✅ 适合：需要保持外层 this 的场景
const obj = {
  name: 'obj',
  
  fetch: function () {
    return fetch('/api')
      .then(response => response.json())
      .then(data => {
        console.log(this.name, data)  // 'obj' + data
        return data
      })
  }
}

// 场景：使用闭包保存 this（ES6 之前的常用技巧）
const obj = {
  name: 'obj',
  clicked: false,
  init: function () {
    // 普通函数：this 为调用者，在回调中会丢失
    const self = this
    document.querySelector('button').addEventListener('click', function() {
      self.clicked = true  // 使用闭包保存 this
    })
  }
}
```

## 特殊情况与陷阱

### 1. 对象中的嵌套函数

```javascript
const obj = {
  name: 'obj',
  
  outer: function () {
    console.log('outer:', this.name)  // 'obj'
    
    function inner() {
      console.log('inner:', this.name)  // undefined（默认绑定）
    }
    
    inner()  // 独立调用
  }
}

// 解决方案：使用箭头函数继承外层 this
const objArrow = {
  name: 'objArrow',
  outer: function () {
    const inner = () => {
      console.log('inner:', this.name)  // 'objArrow'（继承外层 this）
    }
    inner()
  }
}

// 解决方案：使用 call/apply 显式绑定
const objBind = {
  name: 'objBind',
  outer: function () {
    function inner2() {
      console.log('inner2:', this.name)
    }
    inner2.call(this)  // 'objBind'（显式绑定外层 this）
  }
}

// 综合：嵌套函数中的 this 处理对比
const obj2 = {
  name: 'obj2',
  outer: function () {
    function inner3() {
      console.log('inner:', this.name)
    }
    inner3.call(this)  // 'obj2'（显式绑定）
  }
}
```

### 2. 数组方法中的 this

```javascript
const obj = {
  name: 'obj',
  arr: [1, 2, 3],
  
  // forEach, map, filter, reduce 等都支持 thisArg
  example: function () {
    // ❌ 错误
    this.arr.forEach(function (item) {
      console.log(this.name)  // undefined
    })
    
    // ✅ 使用 thisArg
    this.arr.forEach(function (item) {
      console.log(this.name)  // 'obj'
    }, this)
    
    // ✅ 使用箭头函数
    this.arr.forEach((item) => {
      console.log(this.name)  // 'obj'
    })
  }
}
```

### 3. 构造函数返回值

```javascript
// 返回对象
function Person1(name) {
  this.name = name
  return { name: 'returned' }
}

const p1 = new Person1('John')
console.log(p1.name)  // 'returned'
console.log(p1 instanceof Person1)  // false

// 返回原始值
function Person2(name) {
  this.name = name
  return 'primitive'
}

const p2 = new Person2('John')
console.log(p2.name)  // 'John'
console.log(p2 instanceof Person2)  // true

// 最佳实践：不要在构造函数中返回对象
```

### 4. DOM 事件处理

```javascript
const button = document.querySelector('button')

// 传统函数：this 指向 DOM 元素
button.addEventListener('click', function () {
  console.log(this === button)  // true
})

// 箭头函数：this 捕获外层作用域
button.addEventListener('click', () => {
  console.log(this === window)  // true（非严格模式）
})

// 如果需要访问 DOM 元素，使用事件对象
button.addEventListener('click', (event) => {
  console.log(event.target === button)  // true
  console.log(event.currentTarget === button)  // true
})
```

### 5. 类方法中的 this

```javascript
// ❌ 问题：作为回调时会丢失 this
class Counter {
  constructor() {
    this.count = 0
  }

  increment() {
    this.count++
  }
}

// ✅ 方案1：箭头函数（类字段）
class CounterArrow {
  count = 0

  increment = () => {
    this.count++
  }
}

// ✅ 方案2：构造函数中绑定
class CounterBound {
  constructor() {
    this.count = 0
    this.increment = this.increment.bind(this)
  }

  increment() {
    this.count++
  }
}

const counter = new CounterBound()

// 使用场景
const btn = document.querySelector('button')
btn.addEventListener('click', counter.increment)  // 正确：this 已绑定
```

### 6. Proxy 中的 this

```javascript
const target = {
  name: 'target',
  getName() {
    return this.name
  }
}

const proxy = new Proxy(target, {
  get(target, prop, receiver) {
    console.log('Getting:', prop)
    return Reflect.get(target, prop, receiver)  // receiver 保证 this 正确
  }
})

proxy.getName()  // 'target'，this 指向 proxy

// 如果使用 target 而不是 receiver
const proxy2 = new Proxy(target, {
  get(target, prop) {
    return target[prop]  // this 指向 target
  }
})
```

### 7. with 语句中的 this

```javascript
// with 语句（已废弃，但了解一下）
const obj = { name: 'obj' }

with (obj) {
  console.log(name)  // 'obj'
  
  function foo() {
    console.log(this.name)  // undefined（严格模式报错）
  }
  
  foo()  // this 指向全局对象
}
```

## 判断流程图

### 完整判断流程

```
┌─────────────────────────────────────────────────────────────┐
│                     判断 this 绑定流程                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ 是否是箭头函数？  │
                    └────────┬────────┘
                           /   \
                         是     否
                          |      |
                          ▼      ▼
                 ┌────────────┐  ┌──────────────┐
                 │ 继承外层this│  │ 是否 new 调用？│
                 └────────────┘  └──────┬───────┘
                                        /   \
                                      是     否
                                       |      |
                                       ▼      ▼
                               ┌────────────────┐  ┌──────────────────┐
                               │ this = 新对象   │  │ 显式绑定 call/apply│
                               └────────────────┘  └────────┬─────────┘
                                                            /   \
                                                          是     否
                                                           |      |
                                                           ▼      ▼
                                                  ┌────────────┐  ┌──────────────┐
                                                  │ this = 绑定对象│  │ 隐式绑定 obj.foo│
                                                  └────────────┘  └──────┬───────┘
                                                                         /   \
                                                                       是     否
                                                                        |      |
                                                                        ▼      ▼
                                                                 ┌──────────┐ ┌────────────┐
                                                                 │ this=调用对象│ │ 严格模式？  │
                                                                 └──────────┘ └─────┬──────┘
                                                                                     /   \
                                                                                   是     否
                                                                                    |      |
                                                                                    ▼      ▼
                                                                                undefined  window
```

### 快速判断口诀

```
箭头函数看外层，没有外层看规则。
new 绑定最高级，显式绑定次之。
隐式绑定看对象，默认绑定看模式。
```

## 最佳实践

### 1. 使用箭头函数避免 this 问题

```javascript
// ✅ 推荐：箭头函数
class Component {
  constructor() {
    this.state = { count: 0 }
  }
  
  // 类字段 + 箭头函数
  handleClick = () => {
    this.setState({ count: this.state.count + 1 })
  }
  
  fetchData() {
    fetch('/api')
      .then(res => res.json())
      .then(data => {
        // 箭头函数保持 this
        this.setState({ data })
      })
  }
}
```

### 2. 构造函数中使用 bind

```javascript
class EventEmitter {
  constructor() {
    this.events = {}
    // 在构造函数中一次性绑定
    this.emit = this.emit.bind(this)
    this.on = this.on.bind(this)
  }
  
  emit(event, data) {
    // this 已绑定
  }
  
  on(event, callback) {
    // this 已绑定
  }
}
```

### 3. 保存 this 引用

```javascript
const obj = {
  name: 'obj',
  
  method: function () {
    const self = this  // 或 const that = this
    
    setTimeout(function () {
      console.log(self.name)
    }, 100)
  }
}
```

### 4. 避免在构造函数中返回对象

```javascript
// ❌ 不推荐
function Person(name) {
  this.name = name
  return { name: 'other' }  // 令人困惑
}

// ✅ 推荐
function Person(name) {
  this.name = name
  // 不返回任何值，或返回 this
}
```

### 5. 使用严格模式

```javascript
// ✅ 推荐：使用严格模式
function foo() {
  'use strict'
  console.log(this)  // undefined，而不是意外地指向 window
}

// 严格模式的好处：
// 1. 避免意外的全局变量
// 2. this 默认绑定是 undefined，更容易发现错误
// 3. 禁止 with 语句
// 4. 只读属性赋值会报错
```

### 6. 类方法设计

```javascript
class Service {
  constructor() {
    this.data = []
    
    // 方案1：构造函数中绑定
    this.fetch = this.fetch.bind(this)
  }
  
  // 方案2：箭头函数类字段
  fetch = async () => {
    const response = await fetch('/api')
    this.data = await response.json()
    return this.data
  }
  
  // 方案3：普通方法（需要调用者绑定）
  process() {
    return this.data.map(item => item * 2)
  }
}
```

### 7. React 组件中的 this

```javascript
// ❌ 问题代码
class Counter extends React.Component {
  state = { count: 0 }
  
  increment() {
    this.setState({ count: this.state.count + 1 })
  }
  
  render() {
    return <button onClick={this.increment}>+1</button>  // this 丢失
  }
}

// ✅ 解决方案1：在构造函数中使用 bind 绑定 this
class CounterFixed extends React.Component {
  state = { count: 0 }

  constructor(props) {
    super(props)
    this.increment = this.increment.bind(this)
  }

  increment() {
    this.setState({ count: this.state.count + 1 })
  }
  
  render() {
    return <button onClick={this.increment}>+1</button>
  }
}

// ✅ 解决方案2：使用箭头函数类字段（推荐）
class CounterArrow extends React.Component {
  state = { count: 0 }

  increment = () => {
    this.setState({ count: this.state.count + 1 })
  }
  
  render() {
    return <button onClick={() => this.increment()}>+1</button>
  }
}
```

## 常见问题 FAQ

### Q1: 为什么我的 this 是 undefined？

```javascript
// 常见原因1：隐式丢失
const obj = {
  name: 'obj',
  getName() {
    return this.name
  }
}

const fn = obj.getName
fn()  // undefined，this 指向 window（非严格模式）或 undefined（严格模式）

// 解决方案
const fnBound = obj.getName.bind(obj)
fnBound()  // 'obj'
```

### Q2: 箭头函数和普通函数的 this 有什么区别？

```javascript
// 普通函数：动态 this
function normal() {
  console.log(this)
}
normal()           // window（非严格）
normal.call({})    // {}

// 箭头函数：词法 this
const arrow = () => {
  console.log(this)
}
arrow()            // 外层作用域的 this
arrow.call({})     // 外层作用域的 this（call 无效）
```

### Q3: 如何在回调函数中保持 this？

```javascript
// 方案1：箭头函数
obj.method(function() {
  // 使用箭头函数
}.bind(this))

// 方案2：bind
obj.method(this.callback.bind(this))

// 方案3：闭包
const self = this
obj.method(function() {
  self.callback()
})

// 方案4：箭头函数回调
obj.method(() => this.callback())
```

### Q4: call、apply、bind 有什么区别？

```javascript
function example(a, b, c) {
  console.log(this.name, a, b, c)
}

const obj = { name: 'obj' }

// call：立即调用，参数逐个传递
example.call(obj, 1, 2, 3)  // 'obj' 1 2 3

// apply：立即调用，参数数组传递
example.apply(obj, [1, 2, 3])  // 'obj' 1 2 3

// bind：返回新函数，稍后调用
const bound = example.bind(obj, 1)
bound(2, 3)  // 'obj' 1 2 3
```

### Q5: 为什么类方法作为回调时会丢失 this？

```javascript
class Counter {
  count = 0
  
  increment() {
    this.count++
  }
}

const counter = new Counter()

// 丢失 this
setTimeout(counter.increment, 100)  // 错误：this 是 undefined

// 解决方案1：箭头函数
setTimeout(() => counter.increment(), 100)

// 解决方案2：bind
setTimeout(counter.increment.bind(counter), 100)

// 解决方案3：箭头函数类字段
class Counter2 {
  count = 0
  increment = () => {
    this.count++
  }
}

const counter2 = new Counter2()
setTimeout(counter2.increment, 100)  // 正确
```

### Q6: 构造函数中 this 的指向是什么？

```javascript
function Person(name) {
  // this 指向新创建的对象
  console.log(this instanceof Person)  // true
  this.name = name
}

const person = new Person('John')
console.log(person.name)  // 'John'
```

### Q7: 如何判断一个函数应该如何调用？

```javascript
// 使用判断流程：
// 1. 是否是箭头函数？→ 检查外层作用域
// 2. 是否使用 new？→ 新对象
// 3. 是否使用 call/apply/bind？→ 指定对象
// 4. 是否作为对象方法？→ 该对象
// 5. 默认绑定 → window 或 undefined
```

### Q8: 严格模式对 this 有什么影响？

```javascript
// 非严格模式
function foo() {
  console.log(this)  // window
}
foo()

// 严格模式
function bar() {
  'use strict'
  console.log(this)  // undefined
}
bar()

// call/apply 传入 null/undefined
function baz() {
  console.log(this)
}

baz.call(null)       // 非严格：window，严格：null
baz.call(undefined)  // 非严格：window，严格：undefined
```

## 性能考量

### bind 的性能影响

```javascript
// bind 会创建新函数，有轻微性能开销
function heavyComputation() {
  // 大量计算
}

// ❌ 在循环中使用 bind
for (let i = 0; i < 10000; i++) {
  const bound = heavyComputation.bind(obj)  // 创建 10000 个函数
  bound()
}

// ✅ 在循环外创建绑定函数
const bound = heavyComputation.bind(obj)
for (let i = 0; i < 10000; i++) {
  bound()  // 只创建一个函数
}
```

### 箭头函数的性能

```javascript
// 箭头函数性能通常优于 bind
class Example {
  method() {
    // ✅ 推荐：箭头函数
    setTimeout(() => {
      this.doSomething()
    }, 100)
    
    // ❌ 不推荐：每次都创建新函数
    setTimeout(function() {
      this.doSomething()
    }.bind(this), 100)
  }
}
```

### 内存优化

```javascript
class EventEmitter {
  constructor() {
    this.events = {}
    
    // ❌ 每次都创建新函数
    this.on = (event, callback) => {
      // ...
    }
    
    // ✅ 使用原型方法 + 构造函数绑定
    // prototype.on = function(event, callback) { ... }
    // constructor() { this.on = this.on.bind(this) }
  }
}
```

## 调试技巧

### 1. 使用 console.log 调试 this

```javascript
function debugThis() {
  console.log('this:', this)
  console.log('this type:', typeof this)
  console.log('this constructor:', this?.constructor?.name)
  console.log('call stack:', new Error().stack)
}

const obj = { debugThis }
obj.debugThis()
```

### 2. 使用 debugger 语句

```javascript
function foo() {
  debugger  // 在开发者工具中暂停，查看 this
  console.log(this)
}
```

### 3. 使用 console.trace

```javascript
function foo() {
  console.trace('this:', this)
}

function bar() {
  foo()
}

bar()  // 查看调用栈，帮助理解 this 绑定
```

### 4. 检查函数类型

```javascript
// 判断是否是箭头函数
const isArrowFunction = (fn) => {
  return !fn.hasOwnProperty('prototype')
}

const normal = function() {}
const arrow = () => {}

console.log(isArrowFunction(normal))  // false
console.log(isArrowFunction(arrow))   // true
```

### 5. 使用 Proxy 监控 this

```javascript
function monitorThis(fn) {
  return new Proxy(fn, {
    apply(target, thisArg, argumentsList) {
      console.log('thisArg:', thisArg)
      console.log('arguments:', argumentsList)
      return Reflect.apply(target, thisArg, argumentsList)
    }
  })
}

const obj = {
  name: 'obj',
  greet: monitorThis(function(greeting) {
    return `${greeting}, ${this.name}`
  })
}

obj.greet('Hello')  // 输出 thisArg 和 arguments
```

## 总结

### 核心要点

| 概念 | 说明 | 示例 |
|------|------|------|
| 默认绑定 | 独立调用，指向全局对象或 undefined | `foo()` |
| 隐式绑定 | 对象方法调用，指向调用对象 | `obj.foo()` |
| 显式绑定 | call/apply/bind，指定对象 | `foo.call(obj)` |
| new 绑定 | 构造函数调用，指向新对象 | `new Foo()` |
| 箭头函数 | 词法 this，捕获外层作用域 | `() => this` |

### 绑定优先级

```
new 绑定 > 显式绑定 > 隐式绑定 > 默认绑定
```

### 关键记忆点

1. **this 的值在调用时确定，而非定义时**
2. **箭头函数没有自己的 this，捕获外层作用域的 this**
3. **bind 返回新函数，call/apply 立即执行**
4. **严格模式下默认绑定返回 undefined**
5. **new 绑定的优先级最高**
6. **使用严格模式避免意外错误**
7. **优先使用箭头函数解决 this 问题**

### this 判断速查表

```
函数调用形式                    this 指向
────────────────────────────────────────────
foo()                         全局对象/undefined
obj.foo()                     obj
foo.call(obj)                 obj
foo.apply(obj)                obj
foo.bind(obj)()               obj
new foo()                     新创建的对象
() => this                    外层作用域的 this
obj.foo = () => this          全局对象/undefined
```

## 参考资料

### 规范文档

- [ECMAScript 规范](https://tc39.es/ecma262/)
- [ECMAScript 规范 - Function.prototype.call](https://tc39.es/ecma262/#sec-function.prototype.call)
- [ECMAScript 规范 - Function.prototype.apply](https://tc39.es/ecma262/#sec-function.prototype.apply)
- [ECMAScript 规范 - Function.prototype.bind](https://tc39.es/ecma262/#sec-function.prototype.bind)

### MDN 文档

- [MDN - this](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/this)
- [MDN - 箭头函数](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [MDN - Function.prototype.call()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/call)
- [MDN - Function.prototype.apply()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/apply)
- [MDN - Function.prototype.bind()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/bind)

### 推荐书籍

- 《你不知道的 JavaScript（上卷）》- 第一部分：作用域和闭包
- 《JavaScript 高级程序设计》- 第 8 章：对象、类与面向对象编程
- 《JavaScript 权威指南》- 第 8 章：函数

### 相关文章

- [Understanding JavaScript's this keyword](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this)
- [ECMAScript 6 Arrow Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions)
- [JavaScript This Binding](https://github.com/getify/You-Dont-Know-JS/blob/1st-ed/this%20%26%20object%20prototypes/ch1.md)
