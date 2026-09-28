---
title: WeakMap与WeakSet
description: "WeakMap 和 WeakSet 是 ES6（ECMAScript 2015）引入的两种弱引用集合类型。它们与 Map 和 Set 类似，但具有独特的弱引用特性，使其在特定场景下能够有效避免内存泄漏问题。"
keywords: []
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---


# WeakMap 与 WeakSet

## 概述

`WeakMap` 和 `WeakSet` 是 ES6（ECMAScript 2015）引入的两种弱引用集合类型。它们与 `Map` 和 `Set` 类似，但具有独特的弱引用特性，使其在特定场景下能够有效避免内存泄漏问题。

### 核心价值

```
┌─────────────────────────────────────────────────────────┐
│                   弱引用集合的价值                        │
├─────────────────────────────────────────────────────────┤
│  ✓ 自动内存管理：不阻止垃圾回收，避免内存泄漏              │
│  ✓ 安全的数据关联：为对象关联额外数据而不影响其生命周期     │
│  ✓ 私有属性实现：实现真正的私有属性存储                    │
│  ✓ 性能优化：适用于缓存、标记等临时性数据存储              │
└─────────────────────────────────────────────────────────┘
```

### 设计理念

弱引用集合的设计初衷是为了解决以下问题：
- **内存泄漏风险**：传统集合持有的强引用会阻止对象被回收
- **数据关联需求**：需要为对象关联额外数据，但不希望影响对象生命周期
- **封装性要求**：实现真正的私有属性，而非约定式的"私有"

## WeakMap

### 基本概念

`WeakMap` 是一种键值对集合，其中**键必须是对象**，且键的引用是弱引用。当键对象在其他地方没有被引用时，该键值对会被自动清除。

```javascript
const weakMap = new WeakMap()

let obj = { name: 'John' }

weakMap.set(obj, 'some value')

console.log(weakMap.get(obj))  // 'some value'

// 当 obj 被垃圾回收，weakMap 中的条目也会被自动清除
obj = null
```

### 核心特点

| 特性 | 说明 | 原因 |
|------|------|------|
| 键必须是对象 | 只接受对象作为键名 | 弱引用只能作用于对象 |
| 弱引用键 | 键不会阻止垃圾回收 | 弱引用不计入引用计数 |
| 不可遍历 | 无 `keys()`、`values()`、`entries()` | 键可能随时被回收 |
| 无 size 属性 | 无法获取集合大小 | 大小可能随时变化 |
| 无 clear() 方法 | 不支持清空操作 | 键会被自动清理 |

### API 方法详解

#### 构造函数

```javascript
// 创建空的 WeakMap
const wm1 = new WeakMap()

// 从可迭代对象创建（ES10+）
const key1 = { id: 1 }
const key2 = { id: 2 }
const wm2 = new WeakMap([
  [key1, 'value1'],
  [key2, 'value2']
])

console.log(wm2.get(key1))  // 'value1'
```

#### 实例方法

| 方法 | 语法 | 返回值 | 说明 |
|------|------|--------|------|
| `set()` | `weakMap.set(key, value)` | WeakMap 对象 | 添加或更新键值对 |
| `get()` | `weakMap.get(key)` | 键对应的值或 undefined | 获取键对应的值 |
| `has()` | `weakMap.has(key)` | 布尔值 | 检查键是否存在 |
| `delete()` | `weakMap.delete(key)` | 布尔值 | 删除键值对 |

#### 方法详细说明

```javascript
const weakMap = new WeakMap()

const obj1 = { id: 1 }
const obj2 = { id: 2 }
const obj3 = { id: 3 }

// ===== set() 方法 =====
// 添加键值对，返回 WeakMap 本身，支持链式调用
weakMap.set(obj1, 'value1')
weakMap.set(obj2, 'value2').set(obj3, 'value3')  // 链式调用

// ===== get() 方法 =====
// 获取值，不存在则返回 undefined
console.log(weakMap.get(obj1))     // 'value1'
console.log(weakMap.get(obj2))     // 'value2'
console.log(weakMap.get({ id: 4 })) // undefined（新对象）

// ===== has() 方法 =====
// 检查键是否存在
console.log(weakMap.has(obj1))  // true
console.log(weakMap.has(obj3))  // true

// ===== delete() 方法 =====
// 删除键值对，返回是否删除成功
console.log(weakMap.delete(obj1))  // true
console.log(weakMap.has(obj1))     // false
console.log(weakMap.delete(obj1))  // false（已不存在）
```

### 与 Map 的区别

```
┌──────────────────────────────────────────────────────────────────┐
│                     WeakMap vs Map 对比                          │
├─────────────────┬──────────────────┬──────────────────────────────┤
│      特性       │     WeakMap      │            Map               │
├─────────────────┼──────────────────┼──────────────────────────────┤
│ 键的类型        │ 只能是对象        │ 任意类型（对象、原始值等）     │
│ 键的引用        │ 弱引用            │ 强引用                       │
│ 可遍历          │ 否               │ 是（keys/values/entries）     │
│ size 属性       │ 无               │ 有                           │
│ clear() 方法    │ 无               │ 有                           │
│ 垃圾回收影响    │ 键可被回收        │ 键不会被回收                  │
│ 内存泄漏风险    │ 低               │ 需要手动管理                  │
│ 适用场景        │ 临时数据、缓存    │ 常规数据存储                  │
└─────────────────┴──────────────────┴──────────────────────────────┘
```

#### 详细对比示例

```javascript
// ===== Map：强引用保持对象存活 =====
const map = new Map()
let keyMap = { data: 'important' }
map.set(keyMap, 'value')

keyMap = null  // 解除外层引用
console.log(map.size)  // 1（对象仍存在于 Map 中，无法被回收）

// ===== WeakMap：弱引用允许对象被回收 =====
const weakMap = new WeakMap()
let keyWeak = { data: 'important' }
weakMap.set(keyWeak, 'value')

keyWeak = null  // 解除引用后，对象可被垃圾回收
// WeakMap 中的条目将在下次垃圾回收时自动清除
```

### 典型应用场景

#### 1. 私有数据存储

实现真正的私有属性，外部无法直接访问：

```javascript
const privateData = new WeakMap()

class Person {
  constructor(name, age) {
    // 将私有数据存储在 WeakMap 中
    privateData.set(this, { name, age })
  }
  
  getName() {
    return privateData.get(this)?.name
  }

  getAge() {
    return privateData.get(this)?.age
  }

  setAge(age) {
    const data = privateData.get(this)
    if (data) data.age = age
  }
}

const person = new Person('John', 30)

console.log(person.getName())  // 'John'
console.log(person.getAge())   // 30
console.log(person.name)       // undefined（真正的私有）

person.setAge(31)
console.log(person.getAge())   // 31
```

**优势说明**：
- 外部无法通过 `person.name` 访问私有属性
- 当 `person` 实例被销毁，私有数据也会被自动回收
- 比 Symbol 私有属性更安全

#### 2. 缓存计算结果

自动清理不再使用的缓存，避免内存泄漏：

```javascript
const cache = new WeakMap()

function calculate(obj) {
  // 检查缓存
  if (cache.has(obj)) {
    console.log('From cache')
    return cache.get(obj)
  }
  
  // 执行计算
  const result = Object.keys(obj).length
  cache.set(obj, result)
  
  console.log('Calculated')
  return result
}

const data = { a: 1, b: 2, c: 3 }
console.log(calculate(data))  // Calculated  3
console.log(calculate(data))  // From cache  3

// 当 data 不再被引用，缓存会自动清除
```

**更复杂的缓存示例**：

```javascript
class ObjectCache {
  constructor() {
    this.cache = new WeakMap()
  }
  
  // 获取缓存或计算新值
  get(key, calculator) {
    if (this.cache.has(key)) {
      return {
        value: this.cache.get(key),
        fromCache: true
      }
    }

    const value = calculator(key)
    this.cache.set(key, value)
    return { value, fromCache: false }
  }
}

const styleCache = new ObjectCache()

function getComputedStyleCached(el) {
  const { value, cached: fromCache } = styleCache.get(el, (el) => {
    console.log('Computing style...')
    return window.getComputedStyle(el)
  })

  return { style: value, cached: fromCache }
}
```

#### 3. DOM 元素关联数据

安全地为 DOM 元素存储额外数据：

```javascript
const elementData = new WeakMap()

// 存储数据
function attachData(element, data) {
  elementData.set(element, data)
}

// 获取数据
function getData(element) {
  return elementData.get(element)
}

// 使用示例
const button = document.querySelector('button')
attachData(button, { 
  clickCount: 0, 
  lastClickTime: null,
  config: { debounce: 300 }
})

button.addEventListener('click', function() {
  const data = getData(button)
  data.clickCount++
  data.lastClickTime = new Date()
  console.log(`Clicked ${data.clickCount} times`)
})

// 当按钮从 DOM 中移除，关联数据会自动清除，不会造成内存泄漏
button.remove()
```

**对比传统方法**：

```javascript
// ❌ 传统方法：可能导致内存泄漏
const elementDataOld = new Map()
const element = document.getElementById('myElement')
elementDataOld.set(element, { data: 'value' })

element.remove()  // DOM 元素被移除
// 但 Map 中仍持有对元素的引用，导致元素无法被回收！

// ✅ WeakMap 方法：自动清理
const elementDataNew = new WeakMap()
const element2 = document.getElementById('myElement2')
elementDataNew.set(element2, { data: 'value' })

element2.remove()  // DOM 元素被移除
// WeakMap 不会阻止元素被回收，数据会自动清除
```

#### 4. 实现类属性验证

```javascript
const validators = new WeakMap()

class FormField {
  constructor(name, rules = []) {
    this.name = name
    this.value = ''
    validators.set(this, rules)
  }
  
  validate() {
    const rules = validators.get(this) || []
    const errors = []

    for (const rule of rules) {
      const result = rule(this.value)
      if (result !== true) {
        errors.push(result)
      }
    }

    return errors.length === 0
      ? { valid: true, errors: [] }
      : { valid: false, errors }
  }
}

const emailField = new FormField('email', [
  value => value.length > 0 || 'Email is required',
  value => value.includes('@') || 'Invalid email format'
])

emailField.value = 'test@example.com'
console.log(emailField.validate())  // { valid: true }
```

## WeakSet

### 基本概念

`WeakSet` 是一种值的集合，其中**值必须是对象**，且值的引用是弱引用。当对象在其他地方没有被引用时，它会自动从 WeakSet 中清除。

```javascript
const weakSet = new WeakSet()

let obj = { name: 'John' }

weakSet.add(obj)

console.log(weakSet.has(obj))  // true

// 当 obj 被垃圾回收，weakSet 中的条目也会被自动清除
obj = null
```

### 核心特点

| 特性 | 说明 | 原因 |
|------|------|------|
| 值必须是对象 | 只接受对象作为值 | 弱引用只能作用于对象 |
| 弱引用值 | 值不会阻止垃圾回收 | 弱引用不计入引用计数 |
| 不可遍历 | 无 `values()`、`entries()` | 值可能随时被回收 |
| 无 size 属性 | 无法获取集合大小 | 大小可能随时变化 |
| 无 clear() 方法 | 不支持清空操作 | 值会被自动清理 |

### API 方法详解

#### 构造函数

```javascript
// 创建空的 WeakSet
const ws1 = new WeakSet()

// 从可迭代对象创建（ES10+）
const obj1 = { id: 1 }
const obj2 = { id: 2 }
const ws2 = new WeakSet([obj1, obj2])

console.log(ws2.has(obj1))  // true
```

#### 实例方法

| 方法 | 语法 | 返回值 | 说明 |
|------|------|--------|------|
| `add()` | `weakSet.add(value)` | WeakSet 对象 | 添加值 |
| `has()` | `weakSet.has(value)` | 布尔值 | 检查值是否存在 |
| `delete()` | `weakSet.delete(value)` | 布尔值 | 删除值 |

#### 方法详细说明

```javascript
const weakSet = new WeakSet()

const obj1 = { id: 1 }
const obj2 = { id: 2 }
const obj3 = { id: 3 }

// ===== add() 方法 =====
// 添加值，返回 WeakSet 本身，支持链式调用
weakSet.add(obj1)
weakSet.add(obj2).add(obj3)  // 链式调用

// ===== has() 方法 =====
// 检查值是否存在
console.log(weakSet.has(obj1))  // true
console.log(weakSet.has(obj2))  // true
console.log(weakSet.has({ id: 4 }))  // false（新对象）

// ===== delete() 方法 =====
// 删除值，返回是否删除成功
console.log(weakSet.delete(obj1))  // true
console.log(weakSet.has(obj1))     // false
console.log(weakSet.delete(obj1))  // false（已不存在）
```

### 与 Set 的区别

```
┌──────────────────────────────────────────────────────────────────┐
│                     WeakSet vs Set 对比                          │
├─────────────────┬──────────────────┬──────────────────────────────┤
│      特性       │     WeakSet      │            Set               │
├─────────────────┼──────────────────┼──────────────────────────────┤
│ 值的类型        │ 只能是对象        │ 任意类型（对象、原始值等）     │
│ 值的引用        │ 弱引用            │ 强引用                       │
│ 可遍历          │ 否               │ 是（values/entries）          │
│ size 属性       │ 无               │ 有                           │
│ clear() 方法    │ 无               │ 有                           │
│ 垃圾回收影响    │ 值可被回收        │ 值不会被回收                  │
│ 内存泄漏风险    │ 低               │ 需要手动管理                  │
│ 适用场景        │ 对象标记、状态跟踪│ 数据去重、集合运算            │
└─────────────────┴──────────────────┴──────────────────────────────┘
```

### 典型应用场景

#### 1. 对象标记

标记对象是否已处理，避免重复操作：

```javascript
const processed = new WeakSet()

function process(obj) {
  // 检查是否已处理
  if (processed.has(obj)) {
    console.log('Already processed')
    return
  }
  
  // 执行处理逻辑
  console.log('Processing:', obj)
  processed.add(obj)
}

const data = { id: 1 }
process(data)  // Processing: { id: 1 }
process(data)  // Already processed
```

**实际应用：防止重复初始化**

```javascript
const initialized = new WeakSet()

function initializeComponent(element) {
  if (initialized.has(element)) {
    console.warn('Component already initialized')
    return false
  }
  
  // 执行初始化
  element.classList.add('initialized')
  element.addEventListener('click', handleClick)
  
  initialized.add(element)
  return true
}

function destroyComponent(element) {
  if (!initialized.has(element)) {
    return
  }
  
  element.classList.remove('initialized')
  element.removeEventListener('click', handleClick)
  
  initialized.delete(element)
}
```

#### 2. 防止循环引用

检测对象图中的循环引用：

```javascript
const seen = new WeakSet()

function jsonStringify(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return JSON.stringify(obj)
  }
  
  // 检测循环引用
  if (seen.has(obj)) {
    throw new Error('Circular reference detected')
  }

  // 标记当前对象，递归结束后移除标记
  seen.add(obj)
  const pairs = Object.entries(obj).map(([key, value]) => {
    return `"${key}":${jsonStringify(value)}`
  })
  seen.delete(obj)

  return '{' + pairs.join(',') + '}'
}

// 存在循环引用
const circular = { name: 'circular' }
circular.self = circular
try {
  jsonStringify(circular)
} catch (e) {
  console.error(e.message)  // Circular reference detected
}

// 正常情况
const normal = { x: 1, y: { z: 2 } }
console.log(jsonStringify(normal))  // {"x":1,"y":{"z":2}}
```

#### 3. 跟踪对象状态

管理对象的激活、禁用等状态：

```javascript
class Tracker {
  constructor() {
    this.active = new WeakSet()
    this.locked = new WeakSet()
  }
  
  activate(obj) {
    if (this.locked.has(obj)) {
      throw new Error('Object is locked')
    }
    this.active.add(obj)
  }

  deactivate(obj) {
    this.active.delete(obj)
  }

  lock(obj) {
    this.locked.add(obj)
    this.active.delete(obj)
  }

  isActive(obj) {
    return this.active.has(obj)
  }

  isLocked(obj) {
    return this.locked.has(obj)
  }
}

const tracker = new Tracker()
const task1 = { id: 1 }
const task2 = { id: 2 }

tracker.activate(task1)

console.log(tracker.isActive(task1))  // true
console.log(tracker.isActive(task2))  // false

tracker.lock(task1)
console.log(tracker.isLocked(task1))  // true
console.log(tracker.isActive(task1))  // false
```

#### 4. 实现一次性操作

```javascript
const executed = new WeakSet()

function executeOnce(obj, fn) {
  if (executed.has(obj)) {
    console.log('Already executed')
    return null
  }
  
  const result = fn(obj)
  executed.add(obj)
  return result
}

// 使用示例
const config = { debug: true }

executeOnce(config, (cfg) => {
  console.log('Initializing with config:', cfg)
  return 'initialized'
})
// Initializing with config: { debug: true }

executeOnce(config, (cfg) => {
  console.log('This will not run')
  return 'will not return'
})
// Already executed
```

## 弱引用机制详解

### 强引用 vs 弱引用

理解强引用和弱引用的区别是掌握 WeakMap/WeakSet 的关键。

```javascript
// ===== 强引用示例 =====
const map = new Map()
let obj = { name: 'John' }
map.set(obj, 'value')

obj = null  // 解除外层引用
// 但 obj 对象仍然存在于 map 中，不会被垃圾回收
// 这是强引用的特点：只要 Map 存在，键对象就不会被回收

// ===== 弱引用示例 =====
const weakMap = new WeakMap()
let obj2 = { name: 'Jane' }
weakMap.set(obj2, 'value')

obj2 = null  // 解除引用
// obj2 对象可以被垃圾回收
// WeakMap 中的条目会在下次垃圾回收时被清除
```

### 垃圾回收原理

```
┌─────────────────────────────────────────────────────────────┐
│                    垃圾回收流程示意                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  强引用（Map）:                                              │
│  ┌───────┐        ┌─────────┐                              │
│  │  Map  │───────>│ Key Obj │ <─────── 外部引用（已断开）    │
│  └───────┘        └─────────┘                              │
│       │                  ↑                                  │
│       └──────────────────┘                                  │
│        强引用阻止回收                                         │
│                                                             │
│  弱引用（WeakMap）:                                          │
│  ┌──────────┐      ┌─────────┐                              │
│  │ WeakMap  │- - ->│ Key Obj │ <─────── 外部引用（已断开）    │
│  └──────────┘      └─────────┘                              │
│       │                  ↓                                  │
│       └──────────────> [GC 回收]                            │
│        弱引用不阻止回收                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 引用计数机制

```javascript
// 强引用：引用计数 +1
const strongRef = new Map()
let obj = { data: 'important' }
strongRef.set(obj, 'value')
// obj 的引用计数：2（变量 obj + Map 中的引用）

obj = null
// obj 的引用计数：1（仅 Map 中存在引用）
// 对象不会被回收

// 弱引用：不影响引用计数
const weakRef = new WeakMap()
let obj2 = { data: 'important' }
weakRef.set(obj2, 'value')
// obj2 的引用计数：1（仅变量 obj2）

obj2 = null
// obj2 的引用计数：0
// 对象可以被垃圾回收
```

### 内存管理优势

#### 自动清理示例

```javascript
class Cache {
  constructor() {
    this.cache = new WeakMap()
  }
  
  get(key, factory) {
    if (this.cache.has(key)) {
      return this.cache.get(key)
    }
    
    const value = factory()
    this.cache.set(key, value)
    return value
  }
}

function createHeavyObject(id) {
  console.log('Creating heavy object...')
  return { id, payload: new Array(1000).fill(id) }
}

const cache = new Cache()
let obj = { id: 1 }

const result1 = cache.get(obj, () => createHeavyObject(1))
// 输出：Creating heavy object...

const result2 = cache.get(obj, () => createHeavyObject(1))
// 无输出，直接返回缓存

// 当 obj 不再被引用
obj = null
// 缓存会在垃圾回收时自动清理
```

#### 内存占用对比

```javascript
// ❌ 使用 Map：内存持续增长
const mapCache = new Map()

for (let i = 0; i < 10000; i++) {
  const key = { id: i }
  mapCache.set(key, new Array(1000).fill(i))
  // key 对象永远不会被回收
}
console.log(mapCache.size)  // 10000（内存持续占用）

// ✅ 使用 WeakMap：自动释放
const weakCache = new WeakMap()

for (let i = 0; i < 10000; i++) {
  const key = { id: i }
  weakCache.set(key, new Array(1000).fill(i))
  // 当 key 离开作用域，可以被回收
}
// 内存会自动释放
```

## 进阶主题

### WeakRef 与 FinalizationRegistry

ES2021 引入了 `WeakRef` 和 `FinalizationRegistry`，与 WeakMap 配合使用可以实现更精细的控制。

#### WeakRef：获取弱引用

```javascript
// 创建弱引用
let obj = { data: 'important' }
const weakRef = new WeakRef(obj)

// 获取引用对象
console.log(weakRef.deref())  // { data: 'important' }

// 解除强引用
obj = null

// 对象可能已被回收
// deref() 返回对象或 undefined
setTimeout(() => {
  console.log(weakRef.deref())  // undefined 或对象
}, 1000)
```

#### FinalizationRegistry：注册清理回调

```javascript
const registry = new FinalizationRegistry((heldValue) => {
  console.log(`${heldValue} has been garbage collected`)
})

let obj = { data: 'important' }

// 注册清理回调
registry.register(obj, 'My Object')

obj = null
// 当对象被回收时，回调会被调用
// 输出: My Object has been garbage collected
```

#### 完整示例：智能缓存

```javascript
class SmartCache {
  constructor() {
    this.cache = new WeakMap()
    this.registry = new FinalizationRegistry((key) => {
      console.log(`Cache entry for ${key.id} has been cleared`)
    })
  }
  
  set(key, value) {
    this.cache.set(key, value)
    this.registry.register(key, { id: key.id || 'unknown' })
  }

  get(key) {
    return this.cache.get(key)
  }
}

// 使用
let data = { id: 'user-1' }
const cache = new SmartCache()

cache.set(data, { profile: { name: 'John', age: 30 } })
console.log(cache.get(data))  // { profile: { name: 'John', age: 30 } }

data = null
// 当 data 被回收时，会输出清理日志
```

### 性能考量

#### 何时使用 WeakMap/WeakSet

```
┌────────────────────────────────────────────────────────────┐
│              WeakMap/WeakSet 适用场景判断                    │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ✅ 适合使用：                                               │
│  ├─ 需要为对象关联临时数据                                    │
│  ├─ 不希望影响对象的生命周期                                  │
│  ├─ 担心内存泄漏问题                                         │
│  ├─ 数据的键/值是动态创建的对象                               │
│  └─ 不需要遍历或获取集合大小                                  │
│                                                            │
│  ❌ 不适合使用：                                             │
│  ├─ 需要使用原始值（字符串、数字）作为键                       │
│  ├─ 需要遍历集合内容                                         │
│  ├─ 需要知道集合大小                                         │
│  ├─ 键/值需要长期存储且不会动态变化                           │
│  └─ 需要手动清空整个集合                                     │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### 性能对比

```javascript
// 性能测试：WeakMap vs Map
console.time('Map set')
const map = new Map()
for (let i = 0; i < 100000; i++) {
  map.set({ id: i }, i)
}
console.timeEnd('Map set')

console.time('WeakMap set')
const weakMap = new WeakMap()
for (let i = 0; i < 100000; i++) {
  weakMap.set({ id: i }, i)
}
console.timeEnd('WeakMap set')

// 读取性能
console.time('Map get')
for (let i = 0; i < 1000; i++) {
  map.get({ id: i })  // 会返回 undefined（不同的对象引用）
}
console.timeEnd('Map get')

console.time('WeakMap get')
for (let i = 0; i < 1000; i++) {
  weakMap.get({ id: i })  // 会返回 undefined（不同的对象引用）
}
console.timeEnd('WeakMap get')
```

**注意事项**：
- WeakMap/WeakSet 的性能通常与 Map/Set 相近
- 主要开销在于弱引用的管理机制
- 垃圾回收的时机不可预测，不应依赖特定的清理时间

### 最佳实践

#### 1. 正确的键对象选择

```javascript
// ✅ 正确：使用稳定的对象引用
const cache = new WeakMap()
const config = { theme: 'dark' }

cache.set(config, { settings: { theme: 'dark' } })
console.log(cache.get(config))  // 正确获取

// ❌ 错误：每次创建新对象
cache.set({ id: 1 }, 'value')
console.log(cache.get({ id: 1 }))  // undefined（不同的对象引用）
```

#### 2. 避免期望稳定的结果

```javascript
// ❌ 错误：依赖具体的清理时机
const wm = new WeakMap()
let obj = { data: 'test' }
wm.set(obj, 'value')

obj = null
// 不能期望立即被清理
console.log(wm.get(obj))  // undefined，但清理时机不确定
```

#### 3. 合理的数据结构组合

```javascript
// 组合使用 WeakMap 和其他数据结构
class DataStore {
  constructor() {
    this.metadata = new WeakMap()  // 存储对象元数据
    this.index = new Map()         // 存储索引（需要遍历）
  }
  
  add(obj, meta) {
    this.metadata.set(obj, meta)
    this.index.set(obj.id, obj)
  }
  
  getMeta(obj) {
    return this.metadata.get(obj)
  }
  
  getById(id) {
    return this.index.get(id)
  }
}
```

#### 4. 私有属性的完整实现

```javascript
const privateProps = new WeakMap()

class SecureContainer {
  constructor(secret) {
    privateProps.set(this, {
      secret,
      createdAt: Date.now(),
      accessCount: 0
    })
  }
  
  getSecret() {
    const props = privateProps.get(this)
    props.accessCount++
    return props.secret
  }
  
  getAccessCount() {
    return privateProps.get(this)?.accessCount || 0
  }
  
  // 安全的销毁方法
  destroy() {
    privateProps.delete(this)
  }
}
```

## 实战案例

### 案例 1：实现简单观察者模式

```javascript
class Observable {
  constructor() {
    this.observers = new WeakMap()
  }
  
  addObserver(obj, callback) {
    if (!this.observers.has(obj)) {
      this.observers.set(obj, new Set())
    }
    this.observers.get(obj).add(callback)
  }

  notify(obj, event) {
    const observers = this.observers.get(obj)
    if (!observers) return
    for (const callback of [...observers]) {
      callback(event)
    }
  }

  removeObserver(obj, callback) {
    this.observers.get(obj)?.delete(callback)
  }
}

const observable = new Observable()

const subject = { id: 1 }

observable.addObserver(subject, (event) => console.log('Observer 1:', event))
observable.addObserver(subject, (event) => console.log('Observer 2:', event))

observable.notify(subject, { event: 'update' })
// Observer 1: { event: 'update' }
// Observer 2: { event: 'update' }

// 当 subject 被回收，观察者列表也会自动清除
```

### 案例 2：实现元数据存储系统

```javascript
const metadata = new WeakMap()

function setMetadata(obj, data) {
  metadata.set(obj, {
    ...data,
    __metaId: Symbol('meta')
  })
}

function getMetadata(obj) {
  return metadata.get(obj)
}

function updateMetadata(obj, updates) {
  const current = metadata.get(obj) || {}
  metadata.set(obj, {
    ...current,
    ...updates,
    version: (current.version || 0) + 1
  })
}

class User {
  constructor(name) {
    this.name = name
    setMetadata(this, {
      createdAt: new Date(),
      permissions: ['read', 'write']
    })
  }

  getMetadata() {
    return getMetadata(this)
  }

  updatePermission(permission) {
    const meta = getMetadata(this)
    updateMetadata(this, {
      permissions: [...meta.permissions, permission]
    })
  }
}

const user = new User('John')

console.log(user.getMetadata())
// { createdAt: Date, permissions: ['read', 'write'], version: 1, __metaId: Symbol }

user.updatePermission('admin')
console.log(user.getMetadata())
// { createdAt: Date, permissions: ['read', 'write', 'admin'], version: 2, __metaId: Symbol }
```

### 案例 3：实现对象池

```javascript
class ObjectPool {
  constructor(factory) {
    this.factory = factory
    this.available = []
    this.inUse = new WeakSet()
  }
  
  acquire() {
    let obj

    if (this.available.length > 0) {
      obj = this.available.pop()
    } else {
      obj = this.factory()
    }

    this.inUse.add(obj)
    return obj
  }

  release(obj) {
    if (!this.inUse.has(obj)) return
    this.inUse.delete(obj)
    this.available.push(obj)
  }

  isInUse(obj) {
    return this.inUse.has(obj)
  }
}

// 使用：数据库连接池
const connectionPool = new ObjectPool(() => ({
  id: Math.random().toString(36).slice(2, 8),
  connect() {
    console.log(`Connection ${this.id} established`)
  }
}))

const conn1 = connectionPool.acquire()
conn1.connect()  // Connection abc123 established

console.log(connectionPool.isInUse(conn1))  // true

connectionPool.release(conn1)
console.log(connectionPool.isInUse(conn1))  // false
```

### 案例 4：实现事件委托管理器

```javascript
class EventDelegation {
  constructor() {
    this.handlers = new WeakMap()
  }
  
  on(element, eventType, selector, handler) {
    if (!this.handlers.has(element)) {
      this.handlers.set(element, new Map())
    }
    
    const elementHandlers = this.handlers.get(element)

    // 每种事件类型只在元素上绑定一次监听器
    if (!elementHandlers.has(eventType)) {
      elementHandlers.set(eventType, new Map())

      element.addEventListener(eventType, (event) => {
        const typeHandlers = this.handlers.get(element)?.get(event.type)
        if (!typeHandlers) return

        // 事件委托：检查目标元素是否匹配某个选择器
        for (const [selector, handlerList] of typeHandlers) {
          if (event.target.matches(selector)) {
            for (const handler of handlerList) {
              handler.call(event.target, event)
            }
          }
        }
      })
    }

    if (!elementHandlers.get(eventType).has(selector)) {
      elementHandlers.get(eventType).set(selector, [])
    }
    elementHandlers.get(eventType).get(selector).push(handler)
  }
}

const container = document.querySelector('.container')
const delegator = new EventDelegation()

delegator.on(container, 'click', 'button', function (event) {
  console.log('Button clicked:', this)
})

delegator.on(container, 'click', '.link', (event) => {
  console.log('Link clicked:', this)
})
```

## 常见问题

### Q1: 为什么 WeakMap/WeakSet 不能遍历？

**答**：因为弱引用的特性，集合中的键/值可能随时被垃圾回收，导致集合内容不稳定。提供遍历功能可能会返回不一致的结果。

```javascript
const wm = new WeakMap()
let obj = { id: 1 }
wm.set(obj, 'value')

obj = null
// 此刻，obj 可能已被回收，也可能还未被回收
// 如果允许遍历，结果将不可预测
```

### Q2: WeakMap 的键可以是原始值吗？

**答**：不可以。弱引用只能作用于对象，原始值（字符串、数字、布尔值等）不能作为 WeakMap 的键。

```javascript
const wm = new WeakMap()

// ❌ 错误：原始值作为键
try {
  wm.set('string', 'value')  // TypeError: Invalid value used in weak map
} catch (e) {
  console.error(e.message)
}

// ❌ 错误：数字作为键
try {
  wm.set(123, 'value')  // TypeError: Invalid value used in weak map
} catch (e) {
  console.error(e.message)
}

// ✅ 正确：对象作为键
wm.set({}, 'value')
wm.set([], 'value')
wm.set(() => {}, 'value')
```

### Q3: 如何判断 WeakMap 中键的数量？

**答**：WeakMap 没有 `size` 属性，无法直接获取键的数量。这是设计上的限制，因为键的数量可能随时因垃圾回收而变化。

```javascript
const wm = new WeakMap()
let obj1 = { id: 1 }
let obj2 = { id: 2 }

wm.set(obj1, 'value1')
wm.set(obj2, 'value2')

// ❌ 无法获取大小
console.log(wm.size)  // undefined

// 如果需要跟踪数量，需要额外的计数器
let count = 0
function addToWeakMap(wm, key, value) {
  if (!wm.has(key)) {
    count++
  }
  wm.set(key, value)
}
```

### Q4: WeakMap 何时清理键值对？

**答**：清理时机取决于 JavaScript 引擎的垃圾回收机制，不可预测。通常在对象失去所有外部引用后的下次垃圾回收时清理。

```javascript
const wm = new WeakMap()
let obj = { id: 1 }
wm.set(obj, 'value')

obj = null
// 此时无法确定 wm 中的条目何时被清理
// 可能立即清理，也可能延迟到内存紧张时
```

### Q5: WeakMap 与闭包实现私有属性的区别？

**答**：

```javascript
// 方法 1：闭包实现
function createPersonClosure(name, age) {
  return {
    getName() { return name },
    getAge() { return age }
  }
}

const person1 = createPersonClosure('John', 30)
// 优点：简单直观
// 缺点：每个实例都会创建新的方法副本

// 方法 2：WeakMap 实现
const privateData = new WeakMap()

class PersonWeakMap {
  constructor(name, age) {
    privateData.set(this, { name, age })
  }
  
  getName() { return privateData.get(this)?.name }
  getAge() { return privateData.get(this)?.age }
}

const person2 = new PersonWeakMap('Jane', 25)
// 优点：方法在原型上共享，内存效率高
// 缺点：外部仍可通过访问 WeakMap 变量来获取数据（如果暴露了）
```

### Q6: 可以使用 Symbol 作为 WeakMap 的键吗？

**答**：从 ES2023 开始，可以使用非注册 Symbol 作为 WeakMap 的键。

```javascript
const wm = new WeakMap()

// ES2023+ 支持
const sym = Symbol('mySymbol')
wm.set(sym, 'value')  // ✅ 在支持的浏览器中有效

console.log(wm.get(sym))  // 'value'

// 但注册的 Symbol（Symbol.for）不能作为键
const registeredSym = Symbol.for('shared')
try {
  wm.set(registeredSym, 'value')  // ❌ TypeError
} catch (e) {
  console.error(e.message)
}
```

## 浏览器兼容性

### WeakMap 和 WeakSet 支持

| 浏览器 | 版本 |
|--------|------|
| Chrome | 36+ |
| Firefox | 6+ |
| Safari | 8+ |
| Edge | 12+ |
| IE | 11+ |

### WeakRef 和 FinalizationRegistry 支持

| 浏览器 | 版本 |
|--------|------|
| Chrome | 84+ |
| Firefox | 79+ |
| Safari | 14.1+ |
| Edge | 84+ |
| IE | 不支持 |

### Polyfill 建议

```javascript
// 对于不支持 WeakMap 的环境，可以降级使用 Map（但会失去弱引用特性）
if (typeof WeakMap === 'undefined') {
  console.warn('WeakMap not supported, falling back to Map')
  // 使用 Map 作为降级方案
}
```

## 总结

### 核心要点

```
┌─────────────────────────────────────────────────────────────┐
│                  WeakMap 与 WeakSet 核心特性                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ✓ 弱引用机制：不阻止垃圾回收，自动清理无用条目                │
│  ✓ 类型限制：键（WeakMap）/值（WeakSet）必须是对象            │
│  ✓ 操作限制：不可遍历，无 size 属性，无 clear() 方法          │
│  ✓ 内存安全：适合临时数据存储，有效避免内存泄漏                │
│  ✓ 典型场景：私有属性、缓存、对象标记、状态跟踪                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 使用建议

| 场景 | 推荐方案 |
|------|----------|
| 为对象关联临时数据 | WeakMap |
| 对象标记/状态跟踪 | WeakSet |
| 缓存计算结果 | WeakMap |
| 私有属性实现 | WeakMap |
| 防止循环引用 | WeakSet |
| 需要遍历或获取大小 | Map / Set |
| 使用原始值作为键 | Map |
| 长期存储数据 | Map / Set |

### 注意事项

1. **键/值必须是对象**：原始值会导致 TypeError
2. **清理时机不可预测**：不依赖具体的垃圾回收时机
3. **不可遍历**：无法使用 `for...of` 或获取 `size`
4. **性能考虑**：与普通 Map/Set 性能相近，但有额外的弱引用管理开销
5. **兼容性**：现代浏览器广泛支持，IE11+ 部分支持

## 参考资料

### 规范文档

- [ECMAScript 规范 - WeakMap](https://tc39.es/ecma262/#sec-weakmap-objects)
- [ECMAScript 规范 - WeakSet](https://tc39.es/ecma262/#sec-weakset-objects)
- [ECMAScript 规范 - WeakRef](https://tc39.es/ecma262/#sec-weak-ref-objects)
- [ECMAScript 规范 - FinalizationRegistry](https://tc39.es/ecma262/#sec-finalization-registry-objects)

### MDN 文档

- [MDN - WeakMap](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/WeakMap)
- [MDN - WeakSet](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/WeakSet)
- [MDN - WeakRef](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/WeakRef)
- [MDN - FinalizationRegistry](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry)

### 相关文章

- [JavaScript 中的内存管理](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Memory_Management)
- [ES6 In Depth: WeakMap 和 WeakSet](https://hacks.mozilla.org/2015/06/es6-in-depth-collections/)
- [理解 JavaScript 的弱引用](https://v8.dev/features/weak-references)
