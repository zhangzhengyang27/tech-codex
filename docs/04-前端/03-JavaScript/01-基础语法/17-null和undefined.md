---
title: "null 和 undefined"
description: "null 与 undefined 都可以表示“没有”，含义非常相似。将一个变量赋值为 undefined 或 null，语法效果几乎没区别。"
keywords: [null 和 undefined]
category: JavaScript
tags: [JavaScript, 核心基础]
---


# null 和 undefined

## 基本用法

`null` 与 `undefined` 都可以表示“没有”，含义非常相似。将一个变量赋值为 `undefined` 或 `null`，语法效果几乎没区别。

```javascript
var a = undefined;
// 或者
var a = null;
```

在 `if` 语句中都会被自动转为 `false`，相等运算符 `==` 甚至直接报告两者相等

```javascript
if (!undefined) {
  console.log('undefined is false');
}
// undefined is false

if (!null) {
  console.log('null is false');
}
// null is false

undefined == null // true
```

> 谷歌公司开发的 JavaScript 语言的替代品 Dart 语言，就明确规定只有 `null`，没有 `undefined`

区别是这样的：`null` 是一个表示“空”的对象，转为数值时为`0`；`undefined` 是一个表示"此处无定义"的原始值，转为数值时为 `NaN`

```javascript
Number(null) // 0
5 + null // 5

Number(undefined) // NaN
5 + undefined // NaN
```

## 用法和含义

`null` 表示空值，即该处的值现在为空。调用函数时，某个参数未设置任何值，这时就可以传入 `null`，表示该参数为空。比如，某个函数接受引擎抛出的错误作为参数，如果运行过程中未出错，那么这个参数就会传入 `null`，表示未发生错误。

`undefined` 表示“未定义”，下面是返回 `undefined` 的典型场景。

```javascript
// 变量声明了，但没有赋值
var i;
i // undefined

// 调用函数时，应该提供的参数没有提供，该参数等于 undefined
function f(x) {
  return x;
}
f() // undefined

// 对象没有赋值的属性
var o = new Object();
o.p // undefined

// 函数没有返回值时，默认返回 undefined
function f() {}
f() // undefined
```
