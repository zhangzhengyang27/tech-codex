---
title: Map与Set
description: "ES6 引入了 Map 和 Set 两种新的数据结构，弥补了传统对象和数组在某些场景下的不足。"
keywords: [Map与Set]
category: JavaScript
tags: [JavaScript, ES6, 异步, DOM]
---


# Map 与 Set

ES6 引入了 `Map` 和 `Set` 两种新的数据结构，弥补了传统对象和数组在某些场景下的不足。

## 概述

### 什么是 Map？

Map 是一种键值对集合，类似于对象，但有以下关键区别：
- **键的类型**：Map 的键可以是任意类型（对象、函数、NaN 等），而对象的键只能是字符串或 Symbol
- **有序性**：Map 会记住键值对的插入顺序
- **可迭代性**：Map 直接支持迭代，无需先转换

### 什么是 Set？

Set 是一种值的集合，类似于数组，但有以下关键区别：
- **值的唯一性**：Set 中的值是唯一的，不会出现重复值
- **无索引访问**：Set 不支持通过索引访问值
- **有序性**：Set 会记住值的插入顺序

### 核心特性对比

| 特性 | Map | Set | Object | Array |
|------|-----|-----|--------|-------|
| 键/值类型 | 任意类型 | 任意类型 | 字符串/Symbol | 数字索引 |
| 是否有序 | ✓ | ✓ | 部分 | ✓ |
| 可迭代 | ✓ | ✓ | 需转换 | ✓ |
| 去重功能 | ✗ | ✓ | ✗ | 需手动实现 |
| 性能（频繁增删） | 优 | 优 | 差 | 差 |

## Map 基础

### 基本用法

```javascript
const map = new Map()

// 添加键值对
map.set('name', 'John')
map.set('age', 30)
map.set(1, 'one')
map.set(true, 'yes')

// 获取值
console.log(map.get('name'))  // 'John'
console.log(map.get(1))       // 'one'

// 检查键
console.log(map.has('name'))  // true
console.log(map.has('email')) // false

// 删除键值对
map.delete('age')
console.log(map.has('age'))   // false

// 清空 Map
map.clear()
console.log(map.size)         // 0
```

### 键的类型

```javascript
const map = new Map()

// 键可以是任意类型
const obj = { name: 'John' }
const arr = [1, 2, 3]
const func = () => 'hello'

map.set(obj, 'object')
map.set(arr, 'array')
map.set(func, 'function')

console.log(map.get(obj))   // 'object'
console.log(map.get(arr))   // 'array'
console.log(map.get(func))  // 'function'

// NaN 作为键
map.set(NaN, 'not a number')
console.log(map.get(NaN))  // 'not a number'
console.log(map.has(NaN))  // true
```

### 初始化 Map

```javascript
// 从数组创建
const map = new Map([
  ['name', 'John'],
  ['age', 30]
])

console.log(map.size)  // 2

// 从对象创建
const obj = { name: 'John', age: 30 }
const mapFromObj = new Map(Object.entries(obj))

console.log(mapFromObj.get('name'))  // 'John'
```

### 遍历 Map

```javascript
const map = new Map([
  ['name', 'John'],
  ['age', 30],
  ['city', 'New York']
])

// forEach
map.forEach((value, key) => {
  console.log(`${key}: ${value}`)
})

// for...of
for (const [key, value] of map) {
  console.log(`${key}: ${value}`)
}

// keys()
for (const key of map.keys()) {
  console.log(key)
}

// values()
for (const value of map.values()) {
  console.log(value)
}

// entries()
for (const entry of map.entries()) {
  console.log(entry)
}
```

### Map 与 Object 的区别

| 特性 | Map | Object |
|------|-----|--------|
| 键的类型 | 任意类型 | 字符串或 Symbol |
| 键的顺序 | 有序 | 无序（ES6 后部分有序） |
| size 属性 | 有 | 无 |
| 遍历 | 可直接遍历 | 需要转换 |
| 性能 | 频繁增删更优 | 稍差 |

### Map 转换

```javascript
const map = new Map([
  ['name', 'John'],
  ['age', 30]
])

// Map 转数组
const arr = [...map]
console.log(arr)  // [['name', 'John'], ['age', 30]]

// Map 转对象
const obj = Object.fromEntries(map)
console.log(obj)  // { name: 'John', age: 30 }

// 对象转 Map
const obj2 = { name: 'Jane', age: 25 }
const mapFromObj = new Map(Object.entries(obj2))
console.log(mapFromObj.get('name'))  // 'Jane'
```

### Map API 详解

#### 构造函数

```javascript
// 创建空 Map
const map1 = new Map()

// 从可迭代对象创建（数组、Map、Set 等）
const map2 = new Map([
  ['key1', 'value1'],
  ['key2', 'value2']
])

// 从另一个 Map 创建
const map3 = new Map(map2)

// 从对象创建
const obj = { a: 1, b: 2 }
const map4 = new Map(Object.entries(obj))
```

**参数说明**：
- `iterable`（可选）：可迭代对象，其元素为键值对数组 `[key, value]`

#### 实例方法

##### set(key, value)

添加或更新键值对。

```javascript
const map = new Map()

// 添加新键值对
map.set('name', 'John')

// 更新已有键
map.set('name', 'Jane')

// 链式调用
map.set('a', 1).set('b', 2).set('c', 3)

// 返回 Map 对象本身
console.log(map.set('d', 4) === map)  // true
```

**参数**：
- `key`：要设置的键，可以是任意类型
- `value`：要设置的值，可以是任意类型

**返回值**：Map 对象本身

**注意事项**：
- 如果键已存在，会覆盖原有值
- 支持链式调用

##### get(key)

获取键对应的值。

```javascript
const map = new Map([['name', 'John'], ['age', 30]])

console.log(map.get('name'))  // 'John'
console.log(map.get('age'))   // 30
console.log(map.get('email')) // undefined
```

**参数**：
- `key`：要查找的键

**返回值**：键对应的值，如果键不存在则返回 `undefined`

##### has(key)

检查是否存在指定键。

```javascript
const map = new Map([['name', 'John']])

console.log(map.has('name'))  // true
console.log(map.has('age'))   // false

// NaN 的特殊情况
map.set(NaN, 'not a number')
console.log(map.has(NaN))     // true
```

**参数**：
- `key`：要检查的键

**返回值**：布尔值，表示键是否存在

**注意事项**：
- Map 使用 `SameValueZero` 算法比较键
- `NaN` 等于 `NaN`

##### delete(key)

删除指定键值对。

```javascript
const map = new Map([['name', 'John'], ['age', 30]])

console.log(map.delete('name'))  // true
console.log(map.delete('email')) // false（键不存在）
console.log(map.size)            // 1
```

**参数**：
- `key`：要删除的键

**返回值**：布尔值，表示是否删除成功

##### clear()

清空所有键值对。

```javascript
const map = new Map([['name', 'John'], ['age', 30]])

map.clear()
console.log(map.size)  // 0
```

**返回值**：`undefined`

#### 迭代方法

##### keys()

返回所有键的迭代器。

```javascript
const map = new Map([['a', 1], ['b', 2], ['c', 3]])

for (const key of map.keys()) {
  console.log(key)  // 'a', 'b', 'c'
}

// 转换为数组
const keys = [...map.keys()]
console.log(keys)  // ['a', 'b', 'c']
```

##### values()

返回所有值的迭代器。

```javascript
const map = new Map([['a', 1], ['b', 2], ['c', 3]])

for (const value of map.values()) {
  console.log(value)  // 1, 2, 3
}

// 转换为数组
const values = [...map.values()]
console.log(values)  // [1, 2, 3]
```

##### entries()

返回所有键值对的迭代器。

```javascript
const map = new Map([['a', 1], ['b', 2]])

for (const [key, value] of map.entries()) {
  console.log(`${key}: ${value}`)  // 'a: 1', 'b: 2'
}

// 等价于直接遍历 Map
for (const [key, value] of map) {
  console.log(`${key}: ${value}`)  // 'a: 1', 'b: 2'
}
```

##### forEach(callback, thisArg)

遍历所有键值对。

```javascript
const map = new Map([['a', 1], ['b', 2]])

map.forEach((value, key, map) => {
  console.log(`${key}: ${value}`)
})

// 使用 thisArg
const obj = {
  multiplier: 10,
  print(key, value) {
    console.log(`${key}: ${value * this.multiplier}`)
  }
}

map.forEach(function(value, key) {
  this.print(key, value)
}, obj)
```

**参数**：
- `callback(value, key, map)`：回调函数
  - `value`：当前值
  - `key`：当前键
  - `map`：正在遍历的 Map
- `thisArg`（可选）：回调函数中 `this` 的值

#### 实例属性

##### size

返回键值对的数量。

```javascript
const map = new Map([['a', 1], ['b', 2]])
console.log(map.size)  // 2

map.set('c', 3)
console.log(map.size)  // 3

map.delete('a')
console.log(map.size)  // 2
```

**返回值**：数字，表示键值对数量

## Set 基础

### 基本用法

```javascript
const set = new Set()

// 添加值
set.add(1)
set.add(2)
set.add(2)  // 重复值会被忽略
set.add('2') // 类型不同，不会忽略

console.log(set.size)  // 3

// 检查值
console.log(set.has(1))    // true
console.log(set.has(3))    // false

// 删除值
set.delete(1)
console.log(set.has(1))    // false

// 清空 Set
set.clear()
console.log(set.size)      // 0
```

### 数组去重

```javascript
const arr = [1, 2, 2, 3, 3, 3, 4, 4, 4, 4]

// 使用 Set 去重
const unique = [...new Set(arr)]
console.log(unique)  // [1, 2, 3, 4]

// 或者使用 Array.from
const unique2 = Array.from(new Set(arr))
console.log(unique2)  // [1, 2, 3, 4]
```

### 初始化 Set

```javascript
// 从数组创建
const set = new Set([1, 2, 3, 3, 3])
console.log(set.size)  // 3

// 从字符串创建
const setFromStr = new Set('hello')
console.log(setFromStr)  // Set { 'h', 'e', 'l', 'o' }
```

### 遍历 Set

```javascript
const set = new Set([1, 2, 3])

// forEach
set.forEach(value => {
  console.log(value)
})

// for...of
for (const value of set) {
  console.log(value)
}

// keys() 和 values() 相同
for (const value of set.values()) {
  console.log(value)
}

// entries()
for (const entry of set.entries()) {
  console.log(entry)  // [1, 1], [2, 2], [3, 3]
}
```

### Set 操作

```javascript
const set1 = new Set([1, 2, 3])
const set2 = new Set([2, 3, 4])

// 并集
const union = new Set([...set1, ...set2])
console.log([...union])  // [1, 2, 3, 4]

// 交集
const intersection = new Set([...set1].filter(x => set2.has(x)))
console.log([...intersection])  // [2, 3]

// 差集
const difference = new Set([...set1].filter(x => !set2.has(x)))
console.log([...difference])  // [1]

// 子集
const isSubset = [...set1].every(x => set2.has(x))
console.log(isSubset)  // false
```

#### ES2025 原生 Set 方法

ES2025 为 `Set.prototype` 新增了 7 个集合操作方法，无需再手动实现：

```javascript
const setA = new Set([1, 2, 3, 4])
const setB = new Set([3, 4, 5, 6])

// 并集
setA.union(setB)                    // Set {1, 2, 3, 4, 5, 6}

// 交集
setA.intersection(setB)             // Set {3, 4}

// 差集（A 中有但 B 中没有）
setA.difference(setB)               // Set {1, 2}

// 对称差集（并集减交集）
setA.symmetricDifference(setB)      // Set {1, 2, 5, 6}

// 子集判断
new Set([1, 2]).isSubsetOf(setA)    // true

// 超集判断
setA.isSupersetOf(new Set([1, 2]))  // true

// 是否不相交
new Set([1, 2]).isDisjointFrom(new Set([3, 4]))  // true
```

> **注意**：ES2025 原生方法返回新的 `Set` 实例，不会修改原始 Set。旧的手动实现方式仍可在不支持 ES2025 的环境中使用。

### Set 转换

```javascript
const set = new Set([1, 2, 3])

// Set 转数组
const arr = [...set]
console.log(arr)  // [1, 2, 3]

// Set 转数组（方法二）
const arr2 = Array.from(set)
console.log(arr2)  // [1, 2, 3]
```

### Set API 详解

#### 构造函数

```javascript
// 创建空 Set
const set1 = new Set()

// 从数组创建
const set2 = new Set([1, 2, 3, 3, 3])
console.log(set2)  // Set { 1, 2, 3 }

// 从字符串创建
const set3 = new Set('hello')
console.log(set3)  // Set { 'h', 'e', 'l', 'o' }

// 从另一个 Set 创建
const set4 = new Set(set2)

// 从 arguments 创建
function example() {
  const argsSet = new Set(arguments)
  console.log(argsSet)
}
example(1, 2, 3)  // Set { 1, 2, 3 }
```

**参数说明**：
- `iterable`（可选）：可迭代对象，重复值会被忽略

#### 实例方法

##### add(value)

添加值到 Set。

```javascript
const set = new Set()

// 添加值
set.add(1)
set.add(2)

// 添加重复值会被忽略
set.add(2)
console.log(set.size)  // 2

// 链式调用
set.add(3).add(4).add(5)

// 返回 Set 对象本身
console.log(set.add(6) === set)  // true

// 添加不同类型的值
set.add('1')     // 字符串 '1' 和数字 1 不同
set.add(true)    // 布尔值
set.add({})      // 对象
set.add([1, 2])  // 数组
set.add(null)
set.add(undefined)
set.add(NaN)     // NaN 等于 NaN
```

**参数**：
- `value`：要添加的值，可以是任意类型

**返回值**：Set 对象本身

**注意事项**：
- 重复值会被忽略
- 支持链式调用
- 使用 `SameValueZero` 算法比较值

##### has(value)

检查值是否存在。

```javascript
const set = new Set([1, 2, 3])

console.log(set.has(1))  // true
console.log(set.has(4))  // false

// NaN 的特殊情况
set.add(NaN)
console.log(set.has(NaN))  // true

// 对象引用
const obj = { name: 'John' }
set.add(obj)
console.log(set.has(obj))        // true
console.log(set.has({ name: 'John' }))  // false（不同引用）
```

**参数**：
- `value`：要检查的值

**返回值**：布尔值，表示值是否存在

##### delete(value)

删除指定值。

```javascript
const set = new Set([1, 2, 3])

console.log(set.delete(2))  // true
console.log(set.delete(4))  // false（值不存在）
console.log(set.size)       // 2
```

**参数**：
- `value`：要删除的值

**返回值**：布尔值，表示是否删除成功

##### clear()

清空所有值。

```javascript
const set = new Set([1, 2, 3])

set.clear()
console.log(set.size)  // 0
```

**返回值**：`undefined`

#### 迭代方法

##### keys() 和 values()

Set 中 `keys()` 和 `values()` 行为相同，都返回值的迭代器。

```javascript
const set = new Set([1, 2, 3])

// keys()
for (const key of set.keys()) {
  console.log(key)  // 1, 2, 3
}

// values()
for (const value of set.values()) {
  console.log(value)  // 1, 2, 3
}

// 两者等价
console.log([...set.keys()])    // [1, 2, 3]
console.log([...set.values()])  // [1, 2, 3]
```

##### entries()

返回 `[value, value]` 形式的迭代器。

```javascript
const set = new Set([1, 2, 3])

for (const entry of set.entries()) {
  console.log(entry)  // [1, 1], [2, 2], [3, 3]
}

// 这是为了与 Map API 保持一致
```

##### forEach(callback, thisArg)

遍历所有值。

```javascript
const set = new Set([1, 2, 3])

// forEach 遍历
set.forEach((value, key, set) => {
  console.log(value)  // 1, 2, 3
  // 注意：Set 中 key 和 value 相同
})

// 使用 thisArg
const obj = {
  multiplier: 10,
  print(value) {
    console.log(value * this.multiplier)
  }
}

set.forEach(function(value) {
  this.print(value)
}, obj)  // 10, 20, 30
```

**参数**：
- `callback(value, key, set)`：回调函数
  - `value`：当前值
  - `key`：当前值（Set 中 key 和 value 相同）
  - `set`：正在遍历的 Set
- `thisArg`（可选）：回调函数中 `this` 的值

#### 实例属性

##### size

返回值的数量。

```javascript
const set = new Set([1, 2, 3])
console.log(set.size)  // 3

set.add(4)
console.log(set.size)  // 4

set.delete(1)
console.log(set.size)  // 3
```

**返回值**：数字，表示值的数量

## 使用场景与最佳实践

### Map 使用场景

#### 1. 需要非字符串键

```javascript
// ❌ 使用 Object：键会被转换为字符串
const obj = {}
const key1 = { id: 1 }
const key2 = [1, 2, 3]
obj[key1] = 'value1'  // 键变成 "[object Object]"
obj[key2] = 'value2'  // 键变成 "1,2,3"
console.log(obj['[object Object]'])  // 'value2'（被覆盖了）

// ✅ 使用 Map：保持原始类型
const map = new Map()
const user = { id: 1, name: 'John' }
const role = ['admin', 'user']
map.set(user, { permissions: ['read', 'write'] })
map.set(role, 'roles')
console.log(map.get(user))  // { permissions: ['read', 'write'] }
console.log(map.get(role))  // 'roles'
```

#### 2. 需要频繁增删键值对

```javascript
// 场景：缓存系统
class Cache {
  constructor() {
    this.data = new Map()
    this.accessCount = new Map()
  }

  set(key, value) {
    this.data.set(key, value)
    this.accessCount.set(key, 0)
  }

  get(key) {
    if (!this.data.has(key)) return undefined
    // 更新访问计数
    this.accessCount.set(key, this.accessCount.get(key) + 1)
    return this.data.get(key)
  }

  has(key) {
    return this.data.has(key)
  }

  delete(key) {
    this.data.delete(key)
    this.accessCount.delete(key)
  }

  clear() {
    this.data.clear()
    this.accessCount.clear()
  }
}
```

#### 3. 需要有序的键值对集合

```javascript
// 场景：构建有序的配置系统
class ConfigManager {
  constructor() {
    this.configs = new Map()
  }

  // 按添加顺序设置配置
  setConfig(key, value, priority = 0) {
    this.configs.set(key, { value, priority })
  }

  // 按优先级获取配置
  getSortedConfigs() {
    return [...this.configs.entries()]
      .sort((a, b) => b[1].priority - a[1].priority)
      .map(([key, { value }]) => ({ key, value }))
  }
}

const manager = new ConfigManager()
manager.setConfig('database', 'mysql', 2)
manager.setConfig('cache', 'redis', 3)
manager.setConfig('logging', 'winston', 1)

console.log(manager.getSortedConfigs())
// [{ key: 'cache', value: 'redis' }, ...]
```

#### 4. 需要精确的键值对数量

```javascript
// 场景：限制缓存大小
class LRUCache {
  constructor(maxSize = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key) {
    if (!this.cache.has(key)) return undefined

    // 移到最后（最近使用）
    const value = this.cache.get(key)
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // 淘汰最久未使用的键（Map 的第一个键）
      this.cache.delete(this.cache.keys().next().value)
    }
    this.cache.set(key, value)
  }

  get size() {
    return this.cache.size
  }
}
```

### Set 使用场景

#### 1. 数组去重

```javascript
// ❌ 传统方法
const arr = [1, 2, 2, 3, 3, 3]
const unique = arr.filter((item, index) => arr.indexOf(item) === index)

// ✅ 使用 Set
const unique = [...new Set(arr)]

// 对象数组去重（基于某个属性）
const users = [
  { id: 1, name: 'John' },
  { id: 2, name: 'Jane' },
  { id: 1, name: 'John' }
]

const uniqueUsers = [...new Map(users.map(user => [user.id, user])).values()]
console.log(uniqueUsers)
```

#### 2. 判断值是否存在（高性能）

```javascript
// ❌ 使用数组
const arr = [1, 2, 3, 4, 5]
console.log(arr.includes(3))  // O(n)

// ✅ 使用 Set
const set = new Set([1, 2, 3, 4, 5])
console.log(set.has(3))  // O(1)

// 性能对比
const largeArray = Array.from({ length: 100000 }, (_, i) => i)
const largeSet = new Set(largeArray)

console.time('Array.includes')
for (let i = 0; i < 1000; i++) {
  largeArray.includes(50000)
}
console.timeEnd('Array.includes')  // ~50ms

console.time('Set.has')
for (let i = 0; i < 1000; i++) {
  largeSet.has(50000)
}
console.timeEnd('Set.has')  // ~0.1ms
```

#### 3. 集合运算

```javascript
class SetOperations {
  // 并集
  static union(setA, setB) {
    return new Set([...setA, ...setB])
  }

  // 交集
  static intersection(setA, setB) {
    return new Set([...setA].filter(x => setB.has(x)))
  }

  // 差集（A 中有但 B 中没有）
  static difference(setA, setB) {
    return new Set([...setA].filter(x => !setB.has(x)))
  }

  // 对称差集
  static symmetricDifference(setA, setB) {
    return new Set([
      ...[...setA].filter(x => !setB.has(x)),
      ...[...setB].filter(x => !setA.has(x))
    ])
  }

  // 子集判断（setA 是否为 setB 的子集）
  static isSubset(setA, setB) {
    return [...setA].every(x => setB.has(x))
  }
}

const setA = new Set([1, 2, 3])
const setB = new Set([2, 3, 4, 5])

console.log(SetOperations.union(setA, setB))              // Set {1, 2, 3, 4, 5}
console.log(SetOperations.intersection(setA, setB))       // Set {2, 3}
console.log(SetOperations.difference(setA, setB))         // Set {1}
console.log(SetOperations.symmetricDifference(setA, setB)) // Set {1, 4, 5}
console.log(SetOperations.isSubset(new Set([2, 3]), setA)) // true
```

#### 4. 跟踪唯一项

```javascript
// 场景：跟踪在线用户
class OnlineUsers {
  constructor() {
    this.users = new Set()
  }

  join(userId) {
    this.users.add(userId)
    console.log(`User ${userId} joined. Total: ${this.users.size}`)
  }

  leave(userId) {
    this.users.delete(userId)
    console.log(`User ${userId} left. Total: ${this.users.size}`)
  }

  isOnline(userId) {
    return this.users.has(userId)
  }
}

const onlineUsers = new OnlineUsers()
onlineUsers.join(1)   // User 1 joined. Total: 1
onlineUsers.join(2)   // User 2 joined. Total: 2
onlineUsers.join(1)   // User 1 joined. Total: 2（重复，不会增加）
onlineUsers.leave(1)  // User 1 left. Total: 1
```

### 最佳实践

#### 1. 选择合适的数据结构

```javascript
// ✅ 使用 Map 的场景
// - 需要非字符串键
// - 需要频繁增删
// - 需要保证插入顺序
// - 需要精确的 size

// ❌ 不推荐使用 Map 的场景
// - 键只需要字符串或 Symbol
// - 需要序列化为 JSON
// - 需要使用对象字面量语法

// ✅ 使用 Set 的场景
// - 需要去重
// - 需要频繁判断值是否存在
// - 需要集合运算

// ❌ 不推荐使用 Set 的场景
// - 需要通过索引访问
// - 需要存储重复值
// - 需要排序
```

#### 2. 避免内存泄漏

```javascript
// ❌ 错误：使用普通对象作为缓存可能导致内存泄漏
const cache = {}
function addToCache(obj, value) {
  cache[obj.id] = value  // 对象引用被永久保存
}

// ✅ 正确：使用 WeakMap 避免内存泄漏
const cache = new WeakMap()
function addToCache(obj, value) {
  cache.set(obj, value)  // 当 obj 被垃圾回收时，缓存会自动清理
}

// ❌ 错误：使用 Set 存储对象引用可能导致内存泄漏
const listeners = new Set()
element.addListener(listener => {
  listeners.add(listener)  // 永远不会被清理
})

// ✅ 正确：使用 WeakSet 或手动清理
const listeners = new WeakSet()
// 或
element.removeListener(listener => {
  listeners.delete(listener)
})
```

#### 3. 性能优化

```javascript
// ✅ 批量操作优于多次单个操作
const map = new Map()

// ❌ 多次单个操作
data.forEach(item => map.set(item.id, item))

// ✅ 使用构造函数初始化
const map = new Map(data.map(item => [item.id, item]))

// ✅ 避免频繁的类型转换
const set = new Set([1, 2, 3])

// ❌ 频繁转换
for (let i = 0; i < 1000; i++) {
  const arr = [...set]
  console.log(arr.includes(2))
}

// ✅ 直接使用 Set 方法
for (let i = 0; i < 1000; i++) {
  console.log(set.has(2))
}
```

#### 4. 正确处理对象作为键

```javascript
// ❌ 错误：每次创建新对象
const map = new Map()
map.set({ id: 1 }, 'value1')
console.log(map.get({ id: 1 }))  // undefined（不同引用）

// ✅ 正确：使用同一个引用
const key = { id: 1 }
map.set(key, 'value1')
console.log(map.get(key))  // 'value1'

// ✅ 使用唯一标识符
const userMap = new Map()
function getUserKey(user) {
  return `user_${user.id}`
}
userMap.set(getUserKey({ id: 1 }), { name: 'John' })
```

## 实际应用

### 使用 Map 缓存计算结果

```javascript
const cache = new Map()

function expensiveCalculation(n) {
  if (cache.has(n)) {
    return cache.get(n)
  }
  
  // 模拟耗时计算
  const result = n * n
  cache.set(n, result)
  return result
}

console.log(expensiveCalculation(5))  // 计算
console.log(expensiveCalculation(5))  // 从缓存读取
```

### 使用 Set 跟踪唯一值

```javascript
class UniqueTracker {
  constructor() {
    this.items = new Set()
  }
  
  add(item) {
    if (this.items.has(item)) {
      console.log(`${item} already exists`)
      return false
    }
    this.items.add(item)
    return true
  }

  remove(item) {
    return this.items.delete(item)
  }

  has(item) {
    return this.items.has(item)
  }

  get size() {
    return this.items.size
  }
}

const tracker = new UniqueTracker()
tracker.add('item1')
tracker.add('item2')
tracker.add('item1')  // 'item1 already exists'
```

### 使用 Map 存储对象关联数据

```javascript
const userActions = new Map()

const user1 = { id: 1, name: 'John' }
const user2 = { id: 2, name: 'Jane' }

userActions.set(user1, ['login', 'view'])
userActions.set(user2, ['login', 'purchase'])

console.log(userActions.get(user1))  // ['login', 'view']

// 对象作为键，不会被转换为字符串
```

### 进阶应用示例

#### 1. 使用 Map 实现简单的路由系统

```javascript
class Router {
  constructor() {
    this.routes = new Map()
    this.middlewares = new Set()
  }

  // 添加路由
  add(path, handler) {
    this.routes.set(path, handler)
    return this
  }

  // 添加中间件
  use(middleware) {
    this.middlewares.add(middleware)
    return this
  }

  // 处理请求
  handle(path) {
    this.middlewares.forEach((mw) => mw(path))
    return this.routes.get(path)
  }

  // 列出所有已注册路由
  listRoutes() {
    return [...this.routes.keys()]
  }
}

const router = new Router()
router
  .add('/', () => 'Home Page')
  .add('/about', () => 'About Page')
  .add('/contact', () => 'Contact Page')
  .use((path) => console.log(`Request: ${path}`))

console.log(router.handle('/'))      // 'Home Page'
console.log(router.handle('/about')) // 'About Page'
console.log(router.listRoutes())     // ['/', '/about', '/contact']
```

#### 2. 使用 Set 实现标签系统

```javascript
class TagSystem {
  constructor() {
    this.tagMap = new Map()  // itemId -> Set of tags
    this.itemMap = new Map() // tag -> Set of itemIds
  }

  // 添加标签
  addTag(itemId, tag) {
    // 为项目添加标签
    if (!this.tagMap.has(itemId)) {
      this.tagMap.set(itemId, new Set())
    }
    this.tagMap.get(itemId).add(tag)

    // 为标签添加项目
    if (!this.itemMap.has(tag)) {
      this.itemMap.set(tag, new Set())
    }
    this.itemMap.get(tag).add(itemId)
  }

  // 获取项目的所有标签
  getTags(itemId) {
    return [...(this.tagMap.get(itemId) || [])]
  }

  // 获取标签下的所有项目
  getItems(tag) {
    return [...(this.itemMap.get(tag) || [])]
  }

  // 查找拥有所有指定标签的项目
  findByTags(...tags) {
    if (tags.length === 0) return []
    return [...(this.itemMap.get(tags[0]) || [])].filter((itemId) =>
      tags.every((tag) => this.itemMap.get(tag)?.has(itemId))
    )
  }
}

const tagSystem = new TagSystem()
tagSystem.addTag(1, 'javascript')
tagSystem.addTag(1, 'frontend')
tagSystem.addTag(2, 'javascript')
tagSystem.addTag(2, 'backend')

console.log(tagSystem.getTags(1))           // ['javascript', 'frontend']
console.log(tagSystem.getItems('javascript')) // [1, 2]
console.log(tagSystem.findByTags('javascript', 'frontend')) // [1]
```

#### 3. 使用 Map 实现依赖注入容器

```javascript
class DIContainer {
  constructor() {
    this.registrations = new Map()
    this.instances = new Map()
    this.resolving = new Set()  // 防止循环依赖
  }

  // 注册服务
  register(name, factory, dependencies = []) {
    this.registrations.set(name, { factory, dependencies })
  }

  // 解析并创建服务实例（带循环依赖检测）
  resolve(name) {
    if (this.instances.has(name)) {
      return this.instances.get(name)
    }
    if (this.resolving.has(name)) {
      throw new Error(`Circular dependency detected: ${name}`)
    }

    const registration = this.registrations.get(name)
    if (!registration) {
      throw new Error(`Service not found: ${name}`)
    }

    this.resolving.add(name)
    // 先解析依赖，再创建实例
    const dependencies = registration.dependencies.map((dep) => this.resolve(dep))
    const instance = registration.factory(...dependencies)
    this.resolving.delete(name)
    this.instances.set(name, instance)
    return instance
  }

  // 列出所有已注册的服务
  getAllServices() {
    return [...this.registrations.keys()]
  }
}

const container = new DIContainer()

container.register('config', () => ({
  apiUrl: 'https://api.example.com'
}))

container.register('httpClient', (config) => ({
  get(path) {
    return fetch(`${config.apiUrl}${path}`)
  }
}), ['config'])

container.register('userService', (httpClient) => ({
  getUser(id) {
    return httpClient.get(`/users/${id}`).then((response) => {
      return response.json()
    })
  }
}), ['httpClient'])

const userService = container.resolve('userService')
console.log(container.getAllServices())  // ['config', 'httpClient', 'userService']
```

#### 4. 使用 Set 和 Map 实现简单的权限系统

```javascript
class PermissionSystem {
  constructor() {
    this.roles = new Map()        // role -> Set of permissions
    this.users = new Map()        // userId -> Set of roles
    this.resources = new Set()    // all resources
  }

  // 添加资源
  addResource(resource) {
    this.resources.add(resource)
  }

  // 添加角色及其权限
  addRole(role, permissions) {
    this.roles.set(role, new Set(permissions))
  }

  // 为用户分配角色
  assignRole(userId, role) {
    if (!this.users.has(userId)) {
      this.users.set(userId, new Set())
    }
    this.users.get(userId).add(role)
  }

  // 检查用户是否拥有某权限
  hasPermission(userId, permission) {
    const userRoles = this.users.get(userId) || []
    return [...userRoles].some((role) => this.roles.get(role)?.has(permission))
  }

  // 获取用户的所有权限
  getUserPermissions(userId) {
    const userRoles = this.users.get(userId) || []
    const permissions = new Set()
    for (const role of userRoles) {
      for (const permission of this.roles.get(role) || []) {
        permissions.add(permission)
      }
    }
    return [...permissions]
  }
}

const perm = new PermissionSystem()

perm.addResource('document')
perm.addRole('admin', ['read', 'write', 'delete', 'manage'])
perm.addRole('editor', ['read', 'write'])
perm.addRole('viewer', ['read'])

perm.assignRole('user1', 'admin')
perm.assignRole('user2', 'editor')
perm.assignRole('user3', 'viewer')

console.log(perm.hasPermission('user1', 'delete'))  // true
console.log(perm.hasPermission('user2', 'delete'))  // false
console.log(perm.getUserPermissions('user1'))       // ['read', 'write', 'delete', 'manage']
```

#### 5. 使用 Map 实现事件发射器

```javascript
class EventEmitter {
  constructor() {
    this.events = new Map()
    this.onceEvents = new Map()
  }

  // 订阅事件
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event).add(callback)
    return this
  }

  // 订阅一次性事件
  once(event, callback) {
    this.onceEvents.set(callback, event)
    this.on(event, callback)
    return this
  }

  // 取消订阅
  off(event, callback) {
    this.events.get(event)?.delete(callback)
    this.onceEvents.delete(callback)
    return this
  }

  // 触发事件
  emit(event, ...args) {
    const callbacks = this.events.get(event)
    if (!callbacks) return false

    for (const callback of [...callbacks]) {
      callback(...args)
      if (this.onceEvents.has(callback)) {
        this.off(event, callback)
      }
    }
    return true
  }
}

const emitter = new EventEmitter()

emitter.once('connect', () => console.log('Connected!'))

const onMessage = (message) => console.log(`Received: ${message}`)
emitter.on('message', onMessage)

emitter.emit('connect')  // 'Connected!'
emitter.emit('connect')  // 不会触发（一次性事件）
emitter.emit('message', 'Hello')  // 'Received: Hello'
const unsubscribe = () => emitter.off('message', onMessage)
unsubscribe()  // 取消订阅
emitter.emit('message', 'World')  // 不会触发
```

#### 6. 使用 Map 实现简单的状态管理

```javascript
class Store {
  constructor(initialState = {}) {
    this.state = new Map(Object.entries(initialState))
    this.listeners = new Set()
    this.middleware = new Set()
  }

  // 获取状态
  getState() {
    return Object.fromEntries(this.state)
  }

  // 设置状态
  set(key, value) {
    const oldValue = this.state.get(key)

    // 执行中间件
    for (const middleware of this.middleware) {
      value = middleware(key, value, oldValue)
    }

    this.state.set(key, value)

    // 通知监听器
    if (oldValue !== value) {
      for (const listener of this.listeners) {
        listener(key, value, oldValue)
      }
    }
    return this
  }

  // 订阅状态变化
  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // 添加中间件
  use(middleware) {
    this.middleware.add(middleware)
    return this
  }
}

const store = new Store({ count: 0, user: null })

store.use((key, value, oldValue) => {
  console.log(`[Middleware] ${key}:`, oldValue, '->', value)
  return value
})

store.subscribe((key, value, oldValue) => {
  console.log(`Listener: ${key} changed from`, oldValue, 'to', value)
})

store.set('count', 1)  // 触发中间件和监听器
store.set('count', 2)
console.log(store.getState())  // { count: 2, user: null }
```

## 性能对比

### Map vs Object 性能对比

#### 1. 添加操作

```javascript
const iterations = 100000

// Map 添加
console.time('Map.set')
const map = new Map()
for (let i = 0; i < iterations; i++) {
  map.set(`key${i}`, i)
}
console.timeEnd('Map.set')  // ~5-10ms

// Object 添加
console.time('Object property')
const obj = {}
for (let i = 0; i < iterations; i++) {
  obj[`key${i}`] = i
}
console.timeEnd('Object property')  // ~5-15ms
```

#### 2. 查找操作

```javascript
const map = new Map()
const obj = {}

// 初始化
for (let i = 0; i < iterations; i++) {
  map.set(`key${i}`, i)
  obj[`key${i}`] = i
}

// Map 查找
console.time('Map.get')
for (let i = 0; i < iterations; i++) {
  map.get(`key${i}`)
}
console.timeEnd('Map.get')  // ~2-5ms

// Object 查找
console.time('Object access')
for (let i = 0; i < iterations; i++) {
  obj[`key${i}`]
}
console.timeEnd('Object access')  // ~2-5ms
```

#### 3. 删除操作

```javascript
const map = new Map()
const obj = {}

// 初始化
for (let i = 0; i < iterations; i++) {
  map.set(`key${i}`, i)
  obj[`key${i}`] = i
}

// Map 删除
console.time('Map.delete')
for (let i = 0; i < iterations; i++) {
  map.delete(`key${i}`)
}
console.timeEnd('Map.delete')  // ~3-8ms

// Object 删除
console.time('delete operator')
for (let i = 0; i < iterations; i++) {
  delete obj[`key${i}`]
}
console.timeEnd('delete operator')  // ~8-15ms

// Map 在删除操作上性能更优
```

#### 4. 频繁增删场景

```javascript
// Map 频繁增删
console.time('Map frequent operations')
const map = new Map()
for (let i = 0; i < iterations; i++) {
  map.set(i, i)
  if (i % 2 === 0) {
    map.delete(i)
  }
}
console.timeEnd('Map frequent operations')  // ~5-10ms

// Object 频繁增删
console.time('Object frequent operations')
const obj = {}
for (let i = 0; i < iterations; i++) {
  obj[i] = i
  if (i % 2 === 0) {
    delete obj[i]
  }
}
console.timeEnd('Object frequent operations')  // ~15-25ms

// Map 在频繁增删场景下性能显著优于 Object
```

### Set vs Array 性能对比

#### 1. 查找操作

```javascript
const iterations = 100000

// 初始化
const set = new Set()
const arr = []
for (let i = 0; i < iterations; i++) {
  set.add(i)
  arr.push(i)
}

// Set 查找
console.time('Set.has')
for (let i = 0; i < 10000; i++) {
  set.has(Math.floor(Math.random() * iterations))
}
console.timeEnd('Set.has')  // ~0.5-1ms

// Array 查找
console.time('Array.includes')
for (let i = 0; i < 10000; i++) {
  arr.includes(Math.floor(Math.random() * iterations))
}
console.timeEnd('Array.includes')  // ~150-300ms

// Set.has() 性能远优于 Array.includes()
// Set: O(1) vs Array: O(n)
```

#### 2. 去重操作

```javascript
const data = Array.from({ length: 10000 }, () =>
  Math.floor(Math.random() * 5000)
)

// Set 去重
console.time('Set deduplication')
const unique1 = [...new Set(data)]
console.timeEnd('Set deduplication')  // ~1-3ms

// Array.filter 去重
console.time('Array.filter deduplication')
const unique2 = data.filter((item, index) =>
  data.indexOf(item) === index
)
console.timeEnd('Array.filter deduplication')  // ~50-100ms

// Set 去重性能远优于传统方法
```

#### 3. 添加操作

```javascript
const iterations = 100000

// Set 添加
console.time('Set.add')
const set = new Set()
for (let i = 0; i < iterations; i++) {
  set.add(i)
}
console.timeEnd('Set.add')  // ~5-10ms

// Array 添加
console.time('Array.push')
const arr = []
for (let i = 0; i < iterations; i++) {
  arr.push(i)
}
console.timeEnd('Array.push')  // ~3-8ms

// Array.push 略快于 Set.add，但 Set 会自动去重
```

### 性能对比总结

| 操作 | Map | Object | Set | Array | 说明 |
|------|-----|--------|-----|-------|------|
| 添加 | 快 | 快 | 快 | 最快 | 性能相近 |
| 查找 | O(1) | O(1) | O(1) | O(n) | Map/Set 查找更快 |
| 删除 | 快 | 慢 | 快 | - | Map 删除更快 |
| 频繁增删 | 优 | 差 | - | - | Map 性能优势明显 |
| 去重 | - | - | 快 | 慢 | Set 去重最快 |

### 性能优化建议

```javascript
// ✅ 需要频繁判断值是否存在时，使用 Set
const validIds = new Set([1, 2, 3, 4, 5])
if (validIds.has(userId)) {
  // ...
}

// ✅ 需要频繁增删键值对时，使用 Map
const cache = new Map()
cache.set(key, value)
cache.delete(key)

// ✅ 需要大量去重时，使用 Set
const uniqueValues = [...new Set(array)]

// ✅ 需要非字符串键时，使用 Map
const elementData = new Map()
elementData.set(domElement, data)

// ⚠️ 性能不是唯一考虑因素
// 根据具体场景选择合适的数据结构
// - Object：JSON 序列化、字面量语法、原型链
// - Map：非字符串键、有序、频繁增删
// - Set：去重、集合运算、快速查找
// - Array：索引访问、排序、多维数据
```

## 总结

- `Map` 是键值对集合，键可以是任意类型
- `Set` 是值的集合，值唯一不重复
- `Map` 和 `Set` 都是有序的
- `Map` 适合需要非字符串键的场景
- `Set` 适合去重和集合运算
- 频繁增删数据的场景，`Map` 性能优于 `Object`

## 常见问题解答（FAQ）

### 1. Map 和 Object 应该怎么选择？

**选择建议**：

- 使用 `Map`：
  - 键需要是对象、函数等非字符串类型
  - 需要频繁增删键值对
  - 需要保证插入顺序
  - 需要直接获取键值对数量（size）

- 使用 `Object`：
  - 键只需要字符串或 Symbol
  - 需要序列化为 JSON
  - 需要使用对象字面量语法
  - 需要原型链或方法

```
// 示例：选择合适的数据结构
// ✅ 使用 Map
const userMetadata = new Map()
const user = { id: 1 }
userMetadata.set(user, { lastLogin: Date.now() })

// ✅ 使用 Object
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
  retryAttempts: 3
}
const json = JSON.stringify(config)  // Object 可以直接序列化
```

### 2. Set 和 Array 有什么区别？应该选择哪一个？

**主要区别**：

| 特性 | Set | Array |
|------|-----|-------|
| 值的唯一性 | 唯一 | 可重复 |
| 索引访问 | ✗ | ✓ |
| 有序性 | ✓ | ✓ |
| 查找性能（has/includes） | O(1) | O(n) |
| 去重 | 自动 | 需手动实现 |

**选择建议**：
- 使用 `Set`：
  - 需要唯一值
  - 需要频繁判断值是否存在
  - 需要进行集合运算
  - 不需要索引访问
  
- 使用 `Array`：
  - 需要通过索引访问元素
  - 需要存储重复值
  - 需要排序或过滤
  - 需要使用数组的各种方法

```javascript
// 示例：选择合适的数据结构
// ✅ 使用 Set
const uniqueTags = new Set(['javascript', 'typescript', 'javascript'])
console.log(uniqueTags.has('javascript'))  // O(1)

// ✅ 使用 Array
const sortedScores = [95, 87, 92, 88]
sortedScores.sort((a, b) => b - a)  // 需要排序
console.log(sortedScores[0])  // 需要索引访问
```

### 3. 如何判断一个对象是 Map 还是 Set？

```javascript
// 方法 1：使用 instanceof
const map = new Map()
const set = new Set()

console.log(map instanceof Map)  // true
console.log(set instanceof Set)  // true

// 方法 2：使用 constructor.name
console.log(map.constructor.name)  // 'Map'
console.log(set.constructor.name)  // 'Set'

// 方法 3：使用 Object.prototype.toString
console.log(Object.prototype.toString.call(map))  // '[object Map]'
console.log(Object.prototype.toString.call(set))  // '[object Set]'

// 检测函数
function isMap(value) {
  return value instanceof Map || 
         Object.prototype.toString.call(value) === '[object Map]'
}

function isSet(value) {
  return value instanceof Set || 
         Object.prototype.toString.call(value) === '[object Set]'
}
```

### 4. 如何克隆 Map 或 Set？

```javascript
// Map 克隆
const originalMap = new Map([['a', 1], ['b', 2]])

// 方法 1：使用构造函数（浅拷贝）
const clonedMap1 = new Map(originalMap)

// 方法 2：使用展开运算符（浅拷贝）
const clonedMap2 = new Map([...originalMap])

// 深拷贝
const deepClonedMap = new Map(
  JSON.parse(JSON.stringify([...originalMap]))
)

// Set 克隆
const originalSet = new Set([1, 2, 3])

// 方法 1：使用构造函数
const clonedSet1 = new Set(originalSet)

// 方法 2：使用展开运算符
const clonedSet2 = new Set([...originalSet])
```

### 5. 如何合并多个 Map 或 Set？

```javascript
// 合并 Map
const map1 = new Map([['a', 1], ['b', 2]])
const map2 = new Map([['b', 3], ['c', 4]])
const map3 = new Map([['d', 5]])

// 方法 1：展开运算符（后面的会覆盖前面的）
const mergedMap1 = new Map([...map1, ...map2, ...map3])
console.log(mergedMap1.get('b'))  // 3（map2 覆盖了 map1）

// 方法 2：逐个添加
const mergedMap2 = new Map(map1)
map2.forEach((value, key) => mergedMap2.set(key, value))
map3.forEach((value, key) => mergedMap2.set(key, value))

// 合并 Set
const set1 = new Set([1, 2, 3])
const set2 = new Set([3, 4, 5])
const set3 = new Set([5, 6, 7])

const mergedSet = new Set([...set1, ...set2, ...set3])
console.log([...mergedSet])  // [1, 2, 3, 4, 5, 6, 7]
```

### 6. 如何序列化和反序列化 Map？

Map 不能直接序列化为 JSON，需要先转换。

```javascript
const map = new Map([
  ['name', 'John'],
  ['age', 30],
  ['hobbies', ['reading', 'coding']]
])

// 序列化
// 方法 1：转换为对象
const jsonObj = Object.fromEntries(map)
const jsonStr = JSON.stringify(jsonObj)

// 方法 2：转换为数组
const jsonStr2 = JSON.stringify([...map])

// 保留 Map 结构的序列化/反序列化工具函数
function mapToJson(map) {
  return JSON.stringify([...map])
}

function jsonToMap(jsonStr) {
  return new Map(JSON.parse(jsonStr))
}
```

### 7. Map 和 Set 的性能如何？

**查找性能**：

```javascript
// Map vs Object 查找性能
const map = new Map()
const obj = {}

// 添加 100000 个键值对
for (let i = 0; i < 100000; i++) {
  map.set(`key${i}`, i)
  obj[`key${i}`] = i
}

// 查找性能测试
console.time('Map.get')
for (let i = 0; i < 10000; i++) {
  map.get(`key${Math.floor(Math.random() * 100000)}`)
}
console.timeEnd('Map.get')  // ~1-3ms

// Set vs Array 查找
const arr = Array.from({ length: 100000 }, (_, i) => i)
const numberSet = new Set(arr)

console.time('Set.has')
for (let i = 0; i < 10000; i++) {
  numberSet.has(Math.floor(Math.random() * 100000))
}
console.timeEnd('Set.has')  // ~0.5-1ms

console.time('Array.includes')
for (let i = 0; i < 10000; i++) {
  arr.includes(Math.floor(Math.random() * 100000))
}
console.timeEnd('Array.includes')  // ~200ms
```

**性能总结**：
- `Map` 和 `Object` 的查找性能相近（都是 O(1)）
- `Set.has()` 明显快于 `Array.includes()`（O(1) vs O(n)）
- `Map` 在频繁增删场景下性能优于 `Object`
- `Set` 适合需要频繁判断值是否存在的场景

### 8. 如何实现 Map 或 Set 的子类？

```javascript
// 继承 Map
class ExtendedMap extends Map {
  // 添加过滤方法
  filter(callback) {
    const filtered = new ExtendedMap()
    for (const [key, value] of this) {
      if (callback(value, key, this)) {
        filtered.set(key, value)
      }
    }
    return filtered
  }

  // 添加映射方法（返回新的 Map）
  map(callback) {
    const mapped = new ExtendedMap()
    for (const [key, value] of this) {
      mapped.set(key, callback(value, key, this))
    }
    return mapped
  }
}

// 继承 Set
class ExtendedSet extends Set {
  // 添加交集方法
  intersection(otherSet) {
    return new ExtendedSet([...this].filter(x => otherSet.has(x)))
  }
}
```

### 9. NaN 在 Map 和 Set 中是如何处理的？

```javascript
// Map 中的 NaN
const map = new Map()
map.set(NaN, 'not a number')
map.set(NaN, 'still not a number')  // 覆盖之前的值
map.set(0/0, 'another NaN')  // 也覆盖

console.log(map.size)        // 1
console.log(map.has(NaN))    // true
console.log(map.get(NaN))    // 'another NaN'
console.log(map.get(0/0))    // 'another NaN'
console.log(map.get(Number('foo')))  // 'another NaN'

// Set 中的 NaN
const set = new Set()
set.add(NaN)
set.add(NaN)  // 被忽略
set.add(0/0)  // 被忽略
set.add(Number('foo'))  // 被忽略

console.log(set.size)     // 1
console.log(set.has(NaN)) // true

// 原因：Map 和 Set 使用 SameValueZero 算法
// SameValueZero 认为 NaN === NaN
```

### 10. 为什么 Map 和 Set 没有 map、filter 等数组方法？

Map 和 Set 没有内置的 `map`、`filter` 等方法，原因如下：

1. **语义不同**：Map 是键值对集合，Set 是值集合，与数组的使用场景不同
2. **API 设计哲学**：ES6 设计者希望保持 API 简洁，避免过度复杂
3. **可扩展性**：开发者可以根据需要自己扩展

**解决方案**：

```javascript
// Map 的 map 和 filter
const map = new Map([['a', 1], ['b', 2], ['c', 3]])

// 使用数组方法转换
const filtered = new Map(
  [...map].filter(([key, value]) => value > 1)
)

const mapped = new Map(
  [...map].map(([key, value]) => [key, value * 2])
)

// Set 的 map 和 filter
const set = new Set([1, 2, 3, 4, 5])

const filteredSet = new Set([...set].filter(x => x > 2))
const mappedSet = new Set([...set].map(x => x * 2))

// 或使用工具函数
function mapMap(map, callback) {
  return new Map(
    [...map].map(([key, value]) => [key, callback(value, key, map)])
  )
}

function filterMap(map, callback) {
  return new Map(
    [...map].filter(([key, value]) => callback(value, key, map))
  )
}
```

## 参考资料

- [ECMAScript 规范 - Map](https://tc39.es/ecma262/#sec-map-objects)
- [ECMAScript 规范 - Set](https://tc39.es/ecma262/#sec-set-objects)
- [MDN - Map](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Map)
- [MDN - Set](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Set)
