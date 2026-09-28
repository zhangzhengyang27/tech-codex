---
title: Symbol类型
description: "ES6 Symbol 详解：唯一性原始类型、作为属性名避免冲突、Symbol.for 全局注册表、内置 Well-known Symbols（iterator/toPrimitive/species 等）与类型转换规则。"
keywords: [Symbol类型]
category: JavaScript
tags: [JavaScript, ES6, Symbol]
---


# Symbol 类型

> Symbol 是 ES6 引入的一种新的原始数据类型，表示独一无二的值。

## 概述

### 为什么需要 Symbol？

在 ES6 之前，JavaScript 对象的属性名只能是字符串类型，这可能导致以下问题：

```javascript
// 问题1：属性名冲突
const obj = {};
obj.id = 'libraryA';  // 库A设置了id
obj.id = 'libraryB';  // 库B也设置了id，覆盖了之前的值

// 问题2：无法实现真正的私有属性
class Person {
  constructor(name) {
    this._name = name;  // 下划线只是约定，并非真正的私有
  }
}

const p = new Person('Alice');
console.log(p._name);  // 仍然可以访问
```

Symbol 的引入解决了这些问题：
- **唯一性保证**：每个 Symbol 值都是唯一的，不会发生属性名冲突
- **私有性保护**：Symbol 属性不会被常规方法枚举，具有一定的私有性
- **元编程能力**：内置 Symbol 可以修改对象的默认行为

### JavaScript 数据类型

JavaScript 共有 8 种数据类型，其中 7 种是原始类型：

```
┌─────────────────────────────────────────────────────────┐
│                  JavaScript 数据类型                      │
├─────────────────────────────────────────────────────────┤
│  原始类型（Primitive）                                    │
│  ├── undefined                                           │
│  ├── null                                                │
│  ├── boolean                                             │
│  ├── number                                              │
│  ├── string                                              │
│  ├── bigint (ES2020)                                     │
│  └── symbol (ES6) ← 本文档重点                           │
├─────────────────────────────────────────────────────────┤
│  引用类型（Reference）                                    │
│  └── Object（包括 Array、Function、Date、RegExp 等）     │
└─────────────────────────────────────────────────────────┘
```

### Symbol 的特点

| 特性 | 说明 |
|------|------|
| 唯一性 | 每个 Symbol 值都是独一无二的 |
| 不可变 | Symbol 值创建后不能被修改 |
| 原始类型 | typeof 返回 `'symbol'` |
| 不可枚举 | Symbol 属性不会被常规方法枚举 |
| 不可序列化 | JSON.stringify 会忽略 Symbol 属性 |

---

## 一、基本用法

### 1.1 创建 Symbol

```javascript
// 创建一个 Symbol
const sym1 = Symbol();
const sym2 = Symbol();

console.log(sym1 === sym2); // false（每个 Symbol 都是唯一的）

// 添加描述（可选，用于调试）
const sym3 = Symbol('description');
const sym4 = Symbol('description');

console.log(sym3 === sym4); // false（描述相同，但值不同）
console.log(sym3.description); // 'description'
```

> 💡 **提示**：Symbol 的描述（description）只是一个标签，不影响其唯一性。

### 1.2 Symbol 不能使用 new

```javascript
// ❌ 错误：Symbol 是原始类型，不能使用 new
const badSym = new Symbol(); // TypeError: Symbol is not a constructor

// ✅ 正确
const sym = Symbol();
```

**原因**：Symbol 是原始类型，不是对象，使用 `new` 会创建对象包装器，这与设计初衷矛盾。

### 1.3 类型检测

```javascript
const sym = Symbol('test');

// 使用 typeof 检测
console.log(typeof sym); // 'symbol'

// instanceof 返回 false（因为 Symbol 是原始类型）
console.log(sym instanceof Symbol); // false

// 使用 Object.prototype.toString 检测
console.log(Object.prototype.toString.call(sym)); // '[object Symbol]'
```

### 1.4 Symbol 包装对象

虽然 Symbol 不能使用 `new`，但可以创建 Symbol 包装对象：

```javascript
const sym = Symbol('test');
const symObj = Object(sym);

console.log(typeof sym);    // 'symbol'
console.log(typeof symObj); // 'object'
console.log(symObj instanceof Symbol); // true

// 包装对象在实际开发中很少使用
console.log(symObj.valueOf() === sym); // true
```

---

## 二、Symbol 作为属性名

Symbol 的主要用途是作为对象的属性名，避免属性名冲突。

### 2.1 定义属性

```javascript
const nameKey = Symbol('name');
const ageKey = Symbol('age');

const user = {
  [nameKey]: 'Alice',
  [ageKey]: 25,
  // 也可以混合使用字符串属性
  email: 'alice@example.com'
};

console.log(user[nameKey]); // 'Alice'
console.log(user[ageKey]);  // 25
```

### 2.2 动态添加属性

```javascript
const key = Symbol('dynamic');
const obj = {};

// 方式1：使用计算属性名
obj[key] = 'value';

// 方式2：使用 Object.defineProperty
const newKey = Symbol('new');
Object.defineProperty(obj, newKey, {
  value: 'new value',
  writable: true,
  enumerable: true,
  configurable: true
});

console.log(obj[key]);     // 'value'
console.log(obj[newKey]);  // 'new value'
```

### 2.3 类中使用 Symbol 属性

```javascript
const _privateField = Symbol('private');
const _privateMethod = Symbol('privateMethod');

class MyClass {
  constructor(value) {
    // 私有字段
    this[_privateField] = value;
  }
  
  // 私有方法
  [_privateMethod]() {
    return this[_privateField];
  }
  
  // 公共方法访问私有成员
  getValue() {
    return this[_privateMethod]();
  }
}

const instance = new MyClass('secret');
console.log(instance.getValue());        // 'secret'
console.log(Object.keys(instance));      // []（Object.keys 只返回字符串键，Symbol 键一律不出现）
console.log(Object.getOwnPropertySymbols(instance)); // [Symbol(private)]
```

---

## 三、Symbol 与枚举

### 3.1 枚举特性

Symbol 属性**不会**被常规方法枚举：

```javascript
const sym = Symbol('hidden');
const obj = {
  name: 'Alice',
  age: 25,
  [sym]: 'secret'
};

// 不会被枚举的方法
console.log(Object.keys(obj));       // ['name', 'age']
console.log(Object.values(obj));     // ['Alice', 25]
console.log(Object.entries(obj));    // [['name', 'Alice'], ['age', 25]]

// for...in 也不会枚举 Symbol 属性
for (const key in obj) {
  console.log(key); // 'name', 'age'
}

// 可以获取 Symbol 属性
console.log(Object.getOwnPropertySymbols(obj)); // [Symbol(hidden)]

// 获取所有属性（包括 Symbol）
console.log(Reflect.ownKeys(obj)); // ['name', 'age', Symbol(hidden)]
```

### 3.2 属性遍历方法对比

| 方法 | 字符串属性 | Symbol 属性 | 不可枚举属性 | 原型链属性 |
|------|-----------|-------------|-------------|-----------|
| `for...in` | ✅ | ❌ | ❌ | ✅ |
| `Object.keys()` | ✅ | ❌ | ❌ | ❌ |
| `Object.values()` | ✅ | ❌ | ❌ | ❌ |
| `Object.entries()` | ✅ | ❌ | ❌ | ❌ |
| `Object.getOwnPropertyNames()` | ✅ | ❌ | ✅ | ❌ |
| `Object.getOwnPropertySymbols()` | ❌ | ✅ | ✅ | ❌ |
| `Reflect.ownKeys()` | ✅ | ✅ | ✅ | ❌ |

### 3.3 JSON 序列化

```javascript
const obj = {
  name: 'Alice',
  [Symbol('secret')]: 'hidden',
  age: 25
};

// Symbol 属性不会被序列化
console.log(JSON.stringify(obj)); // '{"name":"Alice","age":25}'

// 注意：无法通过 replacer 函数找回 Symbol 属性——replacer 的 key 参数
// 只会是字符串，JSON.stringify 根本不会遍历 Symbol 键
const json = JSON.stringify(obj, (key, value) => {
  console.log('replacer 收到的 key:', key); // 只有 ''、'name'、'age'，不会有 Symbol
  return value;
});
console.log(json); // '{"name":"Alice","age":25}'
```

---

## 四、全局 Symbol 注册表

### 4.1 Symbol.for() 和 Symbol.keyFor()

使用 `Symbol.for()` 创建全局共享的 Symbol：

```javascript
// 创建全局 Symbol
const sym1 = Symbol.for('app.id');
const sym2 = Symbol.for('app.id');

console.log(sym1 === sym2); // true（同一个全局 Symbol）

// 获取 Symbol 的 key
console.log(Symbol.keyFor(sym1)); // 'app.id'

// 普通 Symbol 没有 key
const sym3 = Symbol('local');
console.log(Symbol.keyFor(sym3)); // undefined
```

### 4.2 Symbol() vs Symbol.for()

```javascript
// Symbol() 每次创建新的 Symbol
const a = Symbol('id');
const b = Symbol('id');
console.log(a === b); // false

// Symbol.for() 在全局注册表中查找或创建
const c = Symbol.for('id');
const d = Symbol.for('id');
console.log(c === d); // true
```

| 方法 | 作用域 | 唯一性 | 用途 |
|------|--------|--------|------|
| `Symbol()` | 当前作用域 | 始终唯一 | 私有属性、避免冲突 |
| `Symbol.for()` | 全局注册表 | 相同 key 共享 | 跨模块共享、全局标识 |

### 4.3 跨模块共享 Symbol

```javascript
// moduleA.js
export const APP_ID = Symbol.for('app.id');

// moduleB.js
import { APP_ID } from './moduleA';
const sameSymbol = Symbol.for('app.id');
console.log(APP_ID === sameSymbol); // true

// 可以用于跨模块通信
const obj = {
  [APP_ID]: 'unique-app-id'
};
```

---

## 五、内置 Symbol（Well-known Symbols）

JavaScript 内置了一些 Symbol 值，称为"知名 Symbol"（Well-known Symbols），用于定义对象的默认行为。

### 5.1 Symbol.iterator

定义对象的默认迭代器，使对象可被 `for...of` 遍历：

```javascript
const obj = {
  data: [1, 2, 3],
  [Symbol.iterator]() {
    let index = 0;
    const data = this.data;
    return {
      next() {
        if (index < data.length) {
          return { value: data[index++], done: false };
        }
        return { done: true };
      }
    };
  }
};

// 现在可以使用 for...of
for (const item of obj) {
  console.log(item); // 1, 2, 3
}

// 也可以使用展开运算符
console.log([...obj]); // [1, 2, 3]

// 使用 Array.from
console.log(Array.from(obj)); // [1, 2, 3]
```

### 5.2 Symbol.asyncIterator

定义对象的异步迭代器（ES2018）：

```javascript
const asyncIterable = {
  data: [1, 2, 3],
  async *[Symbol.asyncIterator]() {
    for (const item of this.data) {
      await new Promise(resolve => setTimeout(resolve, 100));
      yield item;
    }
  }
};

// 使用 for await...of
(async () => {
  for await (const item of asyncIterable) {
    console.log(item); // 1, 2, 3（每100ms输出一个）
  }
})();
```

### 5.3 Symbol.toStringTag

自定义 `Object.prototype.toString` 的输出：

```javascript
class CustomClass {
  [Symbol.toStringTag] = 'CustomClass';
}

const instance = new CustomClass();
console.log(Object.prototype.toString.call(instance)); // '[object CustomClass]'

// 实际应用：自定义集合类型
class Collection {
  constructor(items) {
    this.items = items;
  }
  
  get [Symbol.toStringTag]() {
    return `Collection(${this.items.length})`;
  }
}

console.log(Object.prototype.toString.call(new Collection([1, 2, 3]))); 
// '[object Collection(3)]'
```

### 5.4 Symbol.toPrimitive

自定义对象转换为原始值的行为：

```javascript
const obj = {
  value: 100,
  [Symbol.toPrimitive](hint) {
    // hint 可能是: 'number', 'string', 'default'
    switch (hint) {
      case 'number':
        return this.value;
      case 'string':
        return `value: ${this.value}`;
      default:
        return this.value;
    }
  }
};

console.log(obj + 10);       // 110 (hint: 'default')
console.log(String(obj));    // 'value: 100' (hint: 'string')
console.log(Number(obj));    // 100 (hint: 'number')
console.log(obj == 100);     // true
```

### 5.5 Symbol.hasInstance

自定义 `instanceof` 的行为：

```javascript
class MyArray {
  static [Symbol.hasInstance](instance) {
    return Array.isArray(instance);
  }
}

console.log([] instanceof MyArray); // true
console.log({} instanceof MyArray); // false

// 实际应用：类型检查
class PositiveNumber {
  static [Symbol.hasInstance](instance) {
    return typeof instance === 'number' && instance > 0;
  }
}

console.log(5 instanceof PositiveNumber);  // true
console.log(-1 instanceof PositiveNumber); // false
console.log('5' instanceof PositiveNumber); // false
```

### 5.6 Symbol.isConcatSpreadable

控制数组 `concat` 时的展开行为：

```javascript
// 数组默认展开
const arr1 = [1, 2];
console.log([0].concat(arr1)); // [0, 1, 2]

// 禁止展开
const arr2 = [1, 2];
arr2[Symbol.isConcatSpreadable] = false;
console.log([0].concat(arr2)); // [0, [1, 2]]

// 类数组对象默认不展开，设置为 true 可以展开
const arrayLike = {
  0: 'a',
  1: 'b',
  length: 2,
  [Symbol.isConcatSpreadable]: true
};
console.log([0].concat(arrayLike)); // [0, 'a', 'b']
```

### 5.7 Symbol.species

定义派生对象的构造函数：

```javascript
class MyArray extends Array {
  static get [Symbol.species]() {
    return Array; // 返回 Array，派生对象使用 Array 构造
  }
}

const arr = new MyArray(1, 2, 3);
const mapped = arr.map(x => x * 2);
const filtered = arr.filter(x => x > 1);

console.log(arr instanceof MyArray);       // true
console.log(mapped instanceof MyArray);    // false
console.log(filtered instanceof MyArray);  // false
console.log(mapped instanceof Array);      // true
```

### 5.8 Symbol.match、Symbol.replace、Symbol.search、Symbol.split

自定义字符串方法的行为：

```javascript
const matcher = {
  [Symbol.match](str) {
    return str.split('').reverse().join('');
  },
  [Symbol.replace](str,%20replacement) {
    return str + replacement;
  },
  [Symbol.search](str) {
    return str.indexOf('o');
  },
  [Symbol.split](str) {
    return str.split('l');
  }
};

// String.prototype 方法会优先调用参数对象上对应的 Symbol 方法
console.log('Hello'.match(matcher));    // 'olleH'
console.log('Hello'.replace(matcher, '!')); // 'Hello!'
console.log('Hello'.search(matcher));   // 4
console.log('Hello'.split(matcher));    // ['He', 'o']

// 实际应用：自定义匹配逻辑
class CaseInsensitiveMatcher {
  constructor(pattern) {
    this.pattern = pattern.toLowerCase();
  }

  [Symbol.match](str) {
    return str.toLowerCase().includes(this.pattern);
  }
}

console.log('Hello World'.match(new CaseInsensitiveMatcher('WORLD'))); // true
```

### 5.9 Symbol.unscopables

定义 `with` 语句中哪些属性会被排除：

```javascript
const obj = {
  foo: 1,
  bar: 2,
  [Symbol.unscopables]: {
    foo: true,  // foo 会被 with 排除
    bar: false
  }
};

with (obj) {
  // console.log(foo); // ReferenceError: foo is not defined
  console.log(bar);    // 2
}

// Array.prototype 有默认的 Symbol.unscopables
console.log(Array.prototype[Symbol.unscopables]);
// { copyWithin: true, entries: true, fill: true, find: true, ... }
```

### 5.10 内置 Symbol 总结

| Symbol | 用途 | 影响的操作 |
|--------|------|-----------|
| `Symbol.iterator` | 定义默认迭代器 | `for...of`、展开运算符 |
| `Symbol.asyncIterator` | 定义异步迭代器 | `for await...of` |
| `Symbol.toStringTag` | 自定义类型标签 | `Object.prototype.toString` |
| `Symbol.toPrimitive` | 自定义类型转换 | `String()`、`Number()`、运算符 |
| `Symbol.hasInstance` | 自定义 instanceof | `instanceof` |
| `Symbol.isConcatSpreadable` | 控制 concat 展开 | `Array.prototype.concat` |
| `Symbol.species` | 定义派生对象构造函数 | 数组方法返回值类型 |
| `Symbol.match` | 自定义匹配 | `String.prototype.match` |
| `Symbol.replace` | 自定义替换 | `String.prototype.replace` |
| `Symbol.search` | 自定义搜索 | `String.prototype.search` |
| `Symbol.split` | 自定义分割 | `String.prototype.split` |
| `Symbol.unscopables` | with 语句排除 | `with` |

---

## 六、实际应用场景

### 6.1 私有属性

Symbol 可以模拟私有属性（不完全私有，但具有一定程度的安全保护）：

```javascript
const _private = Symbol('private');

class Secret {
  constructor(secret) {
    this[_private] = secret;
  }
  
  getSecret() {
    return this[_private];
  }
  
  setSecret(value) {
    this[_private] = value;
  }
}

const s = new Secret('my secret');
console.log(s.getSecret());     // 'my secret'
console.log(Object.keys(s));    // []
console.log(JSON.stringify(s)); // '{}'

// 注意：并非真正的私有，仍可通过特定方法访问
console.log(Object.getOwnPropertySymbols(s)); // [Symbol(private)]
console.log(s[Object.getOwnPropertySymbols(s)[0]]); // 'my secret'
```

> ⚠️ **注意**：ES2022 引入了真正的私有字段（`#`前缀），Symbol 方式已不推荐用于真正的私有属性。

### 6.2 避免属性名冲突

```javascript
// 第三方库 A
const libraryA = {
  id: Symbol('libraryA.id'),
  init() {
    return { [this.id]: 'Library A' };
  }
};

// 第三方库 B
const libraryB = {
  id: Symbol('libraryB.id'),
  init() {
    return { [this.id]: 'Library B' };
  }
};

// 合并对象不会冲突
const merged = { ...libraryA.init(), ...libraryB.init() };
console.log(merged[libraryA.id]); // 'Library A'
console.log(merged[libraryB.id]); // 'Library B'
```

### 6.3 元编程

```javascript
// 自定义对象行为
const user = {
  name: 'Alice',
  age: 25,
  
  [Symbol.toStringTag]: 'User',
  
  [Symbol.toPrimitive](hint) {
    if (hint === 'string') return this.name;
    if (hint === 'number') return this.age;
    return `${this.name} (${this.age})`;
  }
};

console.log(Object.prototype.toString.call(user)); // '[object User]'
console.log(String(user)); // 'Alice'
console.log(Number(user)); // 25
console.log(user + '');    // 'Alice (25)'
```

### 6.4 实现迭代器

```javascript
// 数值范围迭代器
class Range {
  constructor(start, end, step = 1) {
    this.start = start;
    this.end = end;
    this.step = step;
  }
  
  [Symbol.iterator]() {
    let current = this.start;
    const end = this.end;
    const step = this.step;
    return {
      next() {
        if (current <= end) {
          const value = current;
          current += step;
          return { value, done: false };
        }
        return { done: true };
      }
    };
  }
}

for (const num of new Range(1, 10, 2)) {
  console.log(num); // 1, 3, 5, 7, 9
}

console.log([...new Range(1, 5)]); // [1, 2, 3, 4, 5]
```

### 6.5 实现观察者模式

```javascript
const observers = Symbol('observers');

class Observable {
  constructor() {
    this[observers] = new Set();
  }
  
  subscribe(callback) {
    this[observers].add(callback);
    return () => this[observers].delete(callback);
  }
  
  notify(data) {
    this[observers].forEach(callback => callback(data));
  }
}

const observable = new Observable();
const unsubscribe = observable.subscribe(data => {
  console.log('Received:', data);
});

observable.notify('Hello'); // Received: Hello
unsubscribe();
observable.notify('World'); // 无输出
```

### 6.6 常量定义

```javascript
// 使用 Symbol 定义常量，确保唯一性
const LOG_LEVEL = {
  DEBUG: Symbol('debug'),
  INFO: Symbol('info'),
  WARN: Symbol('warn'),
  ERROR: Symbol('error')
};

function log(level, message) {
  switch (level) {
    case LOG_LEVEL.DEBUG:
      console.log(`[DEBUG] ${message}`);
      break;
    case LOG_LEVEL.INFO:
      console.log(`[INFO] ${message}`);
      break;
    // ...
  }
}

log(LOG_LEVEL.INFO, 'Application started');
```

---

## 七、Symbol vs 字符串属性

### 7.1 对比表格

| 特性 | 字符串属性 | Symbol 属性 |
|------|-----------|-------------|
| 可枚举 | 是 | 否 |
| JSON 序列化 | 是 | 否 |
| 唯一性 | 不保证 | 保证 |
| 类型 | `string` | `symbol` |
| 用途 | 公共属性 | 私有属性/元编程 |
| `Object.keys()` | 可获取 | 不可获取 |
| `for...in` | 可枚举 | 不可枚举 |
| 属性访问 | `obj.prop` 或 `obj['prop']` | `obj[symbol]` |

### 7.2 选择建议

```javascript
// ✅ 使用字符串属性：公共 API
const api = {
  getData() { /* ... */ },
  setData() { /* ... */ }
};

// ✅ 使用 Symbol 属性：内部实现细节
const _data = Symbol('data');
const apiWithPrivate = {
  [_data]: [],
  getData() { return this[_data]; },
  setData(val) { this[_data] = val; }
};

// ✅ 使用 Symbol：元编程
const customObj = {
  [Symbol.toStringTag]: 'CustomObject',
  [Symbol.iterator]() { /* ... */ }
};
```

---

## 八、类型转换规则

### 8.1 转换为字符串

```javascript
const sym = Symbol('test');

// ❌ 隐式转换会报错
console.log('symbol: ' + sym);     // TypeError: Cannot convert a Symbol value to a string
console.log(`symbol: ${sym}`);      // TypeError

// ✅ 显式转换
console.log(sym.toString());         // 'Symbol(test)'
console.log(String(sym));            // 'Symbol(test)'
console.log(sym.description);        // 'test'（只获取描述部分）
```

### 8.2 转换为数字

```javascript
const sym = Symbol('test');

// ❌ 报错
console.log(Number(sym)); // TypeError: Cannot convert a Symbol value to a number
console.log(+sym);        // TypeError
console.log(sym - 0);     // TypeError
```

### 8.3 转换为布尔值

```javascript
const sym = Symbol('test');

// ✅ 可以转换为布尔值
console.log(Boolean(sym)); // true
console.log(!sym);         // false
console.log(!!sym);        // true

// 可用于条件判断
if (sym) {
  console.log('Symbol is truthy');
}
```

### 8.4 作为对象键

```javascript
const sym = Symbol('key');

// ✅ 可以作为对象键
const obj = { [sym]: 'value' };

// ✅ 可以用于 Map
const map = new Map();
map.set(sym, 'value');

// ✅ 从 ES2023 起（"Symbols as WeakMap keys" 提案转正），
//    非注册 Symbol 也可以作为 WeakMap/WeakSet 的键（Node 20+、现代浏览器均已支持）
const weakMap = new WeakMap();
weakMap.set(sym, 'value'); // OK
console.log(weakMap.get(sym)); // 'value'

// ⚠️ 但 Symbol('x') 每次都是新值，作为键时须持有同一个 Symbol 引用
const k1 = Symbol('k');
weakMap.set(k1, 1);
console.log(weakMap.get(Symbol('k'))); // undefined（不是同一个 Symbol）
```

### 8.5 类型转换总结

| 转换目标 | 是否支持 | 方法 |
|----------|---------|------|
| 字符串 | 仅显式 | `String(sym)`、`sym.toString()` |
| 数字 | 不支持 | - |
| 布尔值 | 支持 | `Boolean(sym)`（始终为 true） |
| 对象键 | 支持 | `{ [sym]: value }` |
| Map 键 | 支持 | `map.set(sym, value)` |
| WeakMap 键 | ES2023 起支持（非注册 Symbol） | `weakMap.set(sym, value)` |

---

## 九、常见问题解答（FAQ）

### Q1：Symbol 能实现真正的私有属性吗？

**不能**。Symbol 属性只是不可枚举，但可以通过以下方式访问：

```javascript
const _secret = Symbol('secret');
const obj = { [_secret]: 'hidden' };

// 方式1：Object.getOwnPropertySymbols
console.log(Object.getOwnPropertySymbols(obj)); // [Symbol(secret)]

// 方式2：Reflect.ownKeys
console.log(Reflect.ownKeys(obj)); // [Symbol(secret)]
```

如果需要真正的私有属性，请使用 ES2022 的 `#` 私有字段：

```javascript
class Secret {
  #secret; // 真正的私有字段
  
  constructor(value) {
    this.#secret = value;
  }
}
```

### Q2：Symbol 的描述有什么作用？

描述主要用于调试和日志输出，不影响 Symbol 的唯一性：

```javascript
const sym1 = Symbol('user-id');
const sym2 = Symbol('user-id');

console.log(sym1 === sym2); // false（描述相同但值不同）
console.log(sym1);          // Symbol(user-id)（便于调试）
```

### Q3：何时使用 Symbol() vs Symbol.for()？

```javascript
// Symbol()：创建唯一标识，适合私有属性、避免冲突
const private1 = Symbol('private');

// Symbol.for()：创建全局共享标识，适合跨模块通信
const global1 = Symbol.for('app.id');
const global2 = Symbol.for('app.id'); // 同一个 Symbol
```

**建议**：
- 优先使用 `Symbol()`
- 仅在需要跨模块共享时使用 `Symbol.for()`

### Q4：如何获取对象的所有 Symbol 属性？

```javascript
const obj = {
  name: 'Alice',
  [Symbol('age')]: 25,
  [Symbol('email')]: 'alice@example.com'
};

// 方式1：只获取 Symbol 属性
const symbols = Object.getOwnPropertySymbols(obj);
console.log(symbols); // [Symbol(age), Symbol(email)]

// 方式2：获取所有属性（包括 Symbol）
const allKeys = Reflect.ownKeys(obj);
console.log(allKeys); // ['name', Symbol(age), Symbol(email)]

// 方式3：分类获取
const stringKeys = Object.keys(obj);       // ['name']
const symbolKeys = Object.getOwnPropertySymbols(obj); // [Symbol(age), Symbol(email)]
```

### Q5：Symbol 可以被垃圾回收吗？

作为对象属性的 Symbol 会随对象一起被回收。但全局 Symbol（`Symbol.for()` 创建的）会一直存在于全局注册表中，直到页面关闭：

```javascript
// 普通 Symbol：无引用时可被回收
let sym = Symbol('temp');
sym = null; // 可被垃圾回收

// 全局 Symbol：不会被回收
const globalSym = Symbol.for('persistent');
// 即使删除变量，Symbol 仍在全局注册表中
```

### Q6：如何判断一个值是否为 Symbol？

```javascript
function isSymbol(value) {
  return typeof value === 'symbol';
}

console.log(isSymbol(Symbol()));     // true
console.log(isSymbol(Symbol('test'))); // true
console.log(isSymbol('symbol'));     // false
console.log(isSymbol({}));           // false
```

---

## 十、最佳实践

### 10.1 使用描述性的 Symbol 描述

```javascript
// ❌ 不好的做法
const sym1 = Symbol();

// ✅ 好的做法
const sym2 = Symbol('user.id');
const sym3 = Symbol('cache.key');
```

### 10.2 模块化使用 Symbol

```javascript
// symbols.js - 集中管理 Symbol
export const PRIVATE = {
  data: Symbol('private.data'),
  method: Symbol('private.method')
};

export const EVENTS = {
  click: Symbol.for('event.click'),
  change: Symbol.for('event.change')
};

// 使用
import { PRIVATE, EVENTS } from './symbols.js';
```

### 10.3 避免滥用全局 Symbol

```javascript
// ❌ 避免滥用 Symbol.for()
const sym = Symbol.for('my.app.everything'); // 可能导致命名冲突

// ✅ 使用命名空间
const sym = Symbol.for('my.app.module.feature');
```

### 10.4 配合 TypeScript 使用

```typescript
// 定义 Symbol 类型
const sym: unique symbol = Symbol('unique');

// 作为对象键
const obj: { [sym]: string } = {
  [sym]: 'value'
};

// 索引签名
type SymbolKeyed = {
  [key: symbol]: any;
};
```

---

## 十一、兼容性

### 11.1 浏览器支持

| 浏览器 | 最低版本 |
|--------|---------|
| Chrome | 38+ |
| Firefox | 36+ |
| Safari | 9+ |
| Edge | 12+ |
| IE | 不支持 |

### 11.2 Polyfill

对于不支持 Symbol 的环境，可以使用 polyfill（有限支持）：

```javascript
// 使用 core-js（v3）
require('core-js/features/symbol');

// 注意：polyfill 无法真正实现 Symbol 的唯一性
```

### 11.3 检测支持

```javascript
if (typeof Symbol !== 'undefined') {
  // 支持 Symbol
  const sym = Symbol('test');
} else {
  // 降级处理
  const sym = '__unique_id_' + Math.random();
}
```

---

## 小结

Symbol 是 JavaScript 中唯一可以保证唯一性的原始类型：

1. **唯一性**：每个 Symbol 都是独一无二的，即使描述相同
2. **私有性**：Symbol 属性不可枚举，具有一定程度的私有保护
3. **全局注册**：`Symbol.for()` 创建全局共享的 Symbol
4. **元编程**：内置 Symbol 可以修改对象的默认行为
5. **类型安全**：不能隐式转换为字符串或数字

---

> 💡 **提示**：Symbol 主要用于创建唯一标识符和实现元编程，日常业务开发中使用较少，但在库开发、框架设计中非常有用。对于私有属性需求，建议使用 ES2022 的 `#` 私有字段。

## 参考资料

- [MDN - Symbol](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Symbol)
- [ECMAScript 规范 - Symbol](https://tc39.es/ecma262/#sec-symbol-objects)
- [Exploring ES6 - Symbols](https://exploringjs.com/es6/ch_symbols.html)
