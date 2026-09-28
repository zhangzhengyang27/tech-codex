---
title: let与const
description: "ES6 变量声明指南：let 的块级作用域与暂时性死区（TDZ）、const 的不可重新赋值语义，以及 var/let/const 的对比与使用原则。"
keywords: [let与const]
category: JavaScript
tags: [JavaScript, ES6, 变量声明]
---


# let 与 const

> ES6 引入了 `let` 和 `const` 两种新的变量声明方式，解决了 `var` 存在的变量提升、作用域混乱等问题。

## 概述

在 ES6 之前，JavaScript 只能使用 `var` 声明变量，存在以下问题：

- **变量提升**：变量可以在声明前使用
- **函数作用域**：没有块级作用域，容易造成变量污染
- **重复声明**：可以重复声明同名变量
- **全局污染**：全局变量会成为 `window` 对象的属性

`let` 和 `const` 的引入彻底解决了这些问题，带来了更严格的变量管理机制。

---

## 一、let 声明

### 1. 块级作用域

`let` 声明的变量具有块级作用域，只在当前代码块内有效。

```javascript
// 基本示例
if (true) {
  let a = 1;
  var b = 2;
}
console.log(a); // ReferenceError: a is not defined
console.log(b); // 2（var 声明的变量可以访问）

// 嵌套块级作用域
{
  let outer = 'outer';
  {
    let inner = 'inner';
    console.log(outer); // 'outer'（可访问外层）
  }
  console.log(inner); // ReferenceError（无法访问内层）
}
```

### 2. for 循环中的应用

这是块级作用域最实用的场景：

```javascript
// ✅ let：每次循环创建新的 i
for (let i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// 输出：0, 1, 2

// ❌ var：所有迭代共享同一个 i
for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 100);
}
// 输出：3, 3, 3

// 循环内多层作用域
for (let i = 0; i < 3; i++) {
  let i = 'inner'; // 可以重新声明（不同的作用域）
  console.log(i);  // 'inner', 'inner', 'inner'
}
```

### 3. 暂时性死区（TDZ）

在代码块内，使用 `let` 声明变量之前，该变量是不可用的：

```javascript
// var 的变量提升
console.log(a); // undefined（变量已提升，但未赋值）
var a = 1;

// let 的暂时性死区
console.log(b); // ReferenceError: Cannot access 'b' before initialization
let b = 2;

// TDZ 示例
{
  // TDZ 开始
  console.log(tmp); // ReferenceError
  
  // TDZ 结束
  let tmp = 'hello'; // 此时 tmp 才可用
  console.log(tmp);  // 'hello'
}

// 隐藏的死区问题
function bar(x = y, y = 2) {
  return [x, y];
}
bar(); // ReferenceError: Cannot access 'y' before initialization
// 因为 x 的默认值等于 y，此时 y 还在 TDZ 中
```

### 4. 不允许重复声明

`let` 不允许在相同作用域内重复声明同名变量：

```javascript
// ✅ var 允许重复声明
var a = 1;
var a = 2;
console.log(a); // 2

// ❌ let 不允许重复声明
let b = 1;
let b = 2; // SyntaxError: Identifier 'b' has already been declared

// 不同作用域可以声明同名变量
let c = 1;
{
  let c = 2; // OK（不同的作用域）
  console.log(c); // 2
}
console.log(c); // 1

// 函数参数也算声明
function func(arg) {
  let arg; // SyntaxError
}
```

### 5. 不绑定全局对象

`let` 声明的全局变量不会成为 `window` 对象的属性：

```javascript
var a = 1;
console.log(window.a); // 1
console.log(a); // 1

let b = 2;
console.log(window.b); // undefined
console.log(b); // 2（通过全局词法环境访问）
```

---

## 二、const 声明

`const` 声明一个只读的常量，一旦声明，常量的值就不能改变。

### 1. 基本用法

```javascript
const PI = 3.14159;
PI = 3.14; // TypeError: Assignment to constant variable

// 必须在声明时初始化
const a = 1; // ✅ OK
const b;     // ❌ SyntaxError: Missing initializer in const declaration
```

### 2. const 的本质

`const` 保证的是变量指向的内存地址不变，而不是值不变：

```javascript
// 对象：可以修改属性，但不能重新赋值
const obj = { a: 1 };
obj.a = 2;   // ✅ OK（修改属性）
obj.b = 3;   // ✅ OK（添加属性）
obj = {};    // ❌ TypeError（重新赋值）

// 数组：可以修改元素，但不能重新赋值
const arr = [1, 2, 3];
arr.push(4);  // ✅ OK
arr[0] = 0;   // ✅ OK
arr = [];     // ❌ TypeError
```

### 3. 冻结对象

如果需要完全冻结对象，使用 `Object.freeze()`：

```javascript
// 浅冻结
const frozenObj = Object.freeze({ a: 1 });
frozenObj.a = 2;  // 无效（严格模式下报错）
frozenObj.b = 3;  // 无效
console.log(frozenObj); // { a: 1 }

// 深冻结函数
function deepFreeze(obj) {
  Object.keys(obj).forEach(key => {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      deepFreeze(obj[key]);
    }
  });
  return Object.freeze(obj);
}

const deepObj = deepFreeze({ 
  a: 1, 
  b: { c: 2 } 
});
deepObj.b.c = 3; // 无效
```

### 4. const 与块级作用域

`const` 同样具有块级作用域：

```javascript
if (true) {
  const MAX = 100;
}
console.log(MAX); // ReferenceError

// 循环中使用 const
const arr = [];
for (const item of [1, 2, 3]) {
  arr.push(item); // ✅ 每次迭代创建新的 const
}

// for 循环中不能使用 const（需要重新赋值）
for (const i = 0; i < 3; i++) { // ❌ TypeError
  console.log(i);
}
```

---

## 三、var vs let vs const 对比

| 特性 | var | let | const |
|------|-----|-----|-------|
| 作用域 | 函数作用域 | 块级作用域 | 块级作用域 |
| 变量提升 | ✅ 提升 | ✅ 提升（但存在 TDZ） | ✅ 提升（但存在 TDZ） |
| 重复声明 | ✅ 允许 | ❌ 禁止 | ❌ 禁止 |
| 重新赋值 | ✅ 允许 | ✅ 允许 | ❌ 禁止 |
| 初始化 | 可选 | 可选 | 必须初始化 |
| 全局污染 | 成为 window 属性 | 不绑定 window | 不绑定 window |
| 暂时性死区 | ❌ 无 | ✅ 有 | ✅ 有 |

### 作用域对比图示

```javascript
// var 的函数作用域
function varDemo() {
  if (true) {
    var x = 1;
  }
  console.log(x); // 1（函数内都可访问）
}

// let/const 的块级作用域
function letDemo() {
  if (true) {
    let y = 1;
  }
  console.log(y); // ReferenceError（块外无法访问）
}
```

---

## 四、实际应用场景

### 1. 循环计数器

```javascript
// ✅ 推荐：使用 let
for (let i = 0; i < arr.length; i++) {
  // 每次迭代都有独立的 i
}

// ❌ 避免使用 var
for (var i = 0; i < arr.length; i++) {
  // 可能造成意外的闭包问题
}
```

### 2. 常量定义

```javascript
// 配置常量
const API_URL = 'https://api.example.com';
const MAX_RETRIES = 3;
const TIMEOUT = 5000;

// 模块导出常量
export const ENV = {
  DEV: 'development',
  PROD: 'production',
  TEST: 'test'
};
```

### 3. 不可变数据结构

```javascript
// 配置对象
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000
};

// React 的 useRef（引用不变，内容可变；state 应视为不可变数据，更新须用 setState 创建新对象）
const ref = useRef({ count: 0 });
```

### 4. 避免变量污染

```javascript
// 使用块级作用域隔离变量
{
  let temp = computeValue();
  // temp 只在这个块内有效
}
// 外部无法访问 temp

// 替代 IIFE
// 旧写法
(function() {
  var temp = 'old';
})();

// 新写法
{
  let temp = 'new';
}
```

---

## 五、常见问题解答（FAQ）

### Q1: const 声明的对象为什么可以修改属性？

`const` 保证的是变量绑定的内存地址不变。对象是引用类型，变量保存的是对象的引用地址，修改属性不会改变引用地址。

```javascript
const obj = { a: 1 };
// obj 指向的地址不变
obj.a = 2; // ✅ OK（修改的是地址指向的内容）

// 尝试改变 obj 指向的地址
obj = {}; // ❌ TypeError（改变地址）
```

### Q2: 什么时候用 let，什么时候用 const？

```javascript
// 规则：优先使用 const，需要重新赋值时使用 let

// ✅ 使用 const：值不会被重新赋值
const PI = 3.14159;
const config = { apiUrl: '/api' };
const calculate = (a, b) => a + b;

// ✅ 使用 let：需要重新赋值
let count = 0;
count++; // 需要重新赋值

let result;
if (condition) {
  result = 'A';
} else {
  result = 'B';
}
```

### Q3: 为什么 for 循环用 let 可以正确输出？

```javascript
// let 在每次循环创建一个新的词法环境
for (let i = 0; i < 3; i++) {
  // 每次迭代都有一个独立的 i
  setTimeout(() => console.log(i), 100);
}
// 等价于：
// i(0) -> setTimeout(() => console.log(0), 100)
// i(1) -> setTimeout(() => console.log(1), 100)
// i(2) -> setTimeout(() => console.log(2), 100)

// var 只有一个变量
for (var i = 0; i < 3; i++) {
  // 所有回调共享同一个 i
  setTimeout(() => console.log(i), 100);
}
// 循环结束后 i = 3，所以输出 3, 3, 3
```

### Q4: 如何在声明前安全地使用变量？

```javascript
// ❌ 不安全：变量提升可能造成问题
console.log(x); // undefined（可能不是预期行为）
var x = 1;

// ✅ 安全：TDZ 强制先声明后使用
// console.log(y); // 直接报错，避免意外
let y = 2;

// ✅ 最佳实践：在使用前声明
const z = 3;
console.log(z);
```

---

## 六、常见陷阱与注意事项

### 1. Switch 语句中的作用域

```javascript
// ❌ 错误：switch 内只有一个作用域
let x = 1;
switch (x) {
  case 1:
    let y = 'one';
    break;
  case 2:
    let y = 'two'; // SyntaxError: 重复声明
    break;
}

// ✅ 正确：使用代码块创建独立作用域
switch (x) {
  case 1: {
    let y = 'one';
    break;
  }
  case 2: {
    let y = 'two'; // OK
    break;
  }
}
```

### 2. typeof 不再安全

```javascript
// var 时代：typeof 可以安全检测未声明变量
typeof x; // 'undefined'（不报错）

// let/const 时代：在 TDZ 内会报错
{
  typeof y; // ReferenceError（y 在 TDZ 中）
  let y = 1;
}
```

### 3. 全局变量访问

```javascript
var globalVar = 1;
let globalLet = 2;

console.log(window.globalVar); // 1
console.log(window.globalLet); // undefined

// 获取 let 声明的全局变量
console.log(globalLet); // 2（直接访问）
```

---

## 七、最佳实践

### 1. 声明选择优先级

```javascript
// 优先级：const > let > var

// 1. 默认使用 const
const API_URL = 'https://api.example.com';
const config = { debug: true };

// 2. 需要重新赋值时使用 let
let count = 0;
let result = null;

// 3. 完全避免使用 var
// ❌ var x = 1;
```

### 2. 变量命名规范

```javascript
// 常量：全大写下划线
const MAX_SIZE = 100;
const API_BASE_URL = 'https://api.example.com';

// 普通变量：小驼峰
let userName = 'Alice';
let itemCount = 0;

// 私有变量：下划线前缀
let _privateVar = 'internal';
```

### 3. 合理使用块级作用域

```javascript
// 使用块级作用域组织代码
function processData(data) {
  // 数据验证
  {
    const isValid = validate(data);
    if (!isValid) return null;
  }
  
  // 数据转换
  {
    const transformed = transform(data);
    return transformed;
  }
}
```

---

## 小结

| 关键点 | 说明 |
|--------|------|
| 块级作用域 | `let` 和 `const` 都具有块级作用域 |
| 暂时性死区 | 声明前不可用，避免变量提升带来的问题 |
| const 本质 | 保证内存地址不变，不保证值不可变 |
| 使用原则 | 优先 `const`，需要重新赋值时用 `let`，避免 `var` |

---

## 参考资料

- [MDN - let](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/let)
- [MDN - const](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Statements/const)
- [ES6 入门 - let 和 const 命令](https://es6.ruanyifeng.com/#docs/let)

---

> 💡 提示：`let` 和 `const` 是 ES6 最基础也是最重要的特性之一，理解它们的作用域机制对编写高质量的 JavaScript 代码至关重要。
