---
title: "手写 JSON.stringify"
description: 基于 JSON 数据类型的转换规则，手写实现 JSON.stringify 并处理各种边界情况
keywords: [手写JSON.stringify, JSON对象, 序列化, 边界情况]
category: JavaScript
tags: [JavaScript, JSON, 序列化, 底层原理]
---
# 手写 JSON.stringify

手写 `JSON.stringify` 能够从全局考察对 JS 各种数据类型理解的深度、对极端边界情况的处理能力以及编码能力。在大厂前端面试中这是高频考题，本文带你从原理出发完整实现它。

## 方法基本介绍

`JSON` 对象包含两个方法：`parse()` 用于解析 JSON 字符串，`stringify()` 用于将对象转换为 JSON 字符串。

### JSON.parse

`JSON.parse` 用来解析 JSON 字符串，构造由字符串描述的 JavaScript 值或对象。语法为 `JSON.parse(text[, reviver])`，第二个可选参数 `reviver` 在返回之前对结果执行变换操作。

```javascript
const json = '{"result":true, "count":2}';
const obj = JSON.parse(json);
console.log(obj.count);   // 2
console.log(obj.result);  // true

// 带第二个参数 reviver：将属性值变为原来的 2 倍
JSON.parse('{"p": 5}', function(k, v) {
  if (k === '') return v;
  return v * 2;
});  // { p: 10 }
```

### JSON.stringify

`JSON.stringify` 将一个 JavaScript 对象或值转换为 JSON 字符串。语法为 `JSON.stringify(value[, replacer[, space]])`：
- `value`：必选，要转换的对象
- `replacer`：可选，函数或数组，用于过滤属性
- `space`：可选，控制结果字符串中的间距

```javascript
JSON.stringify({ x: 1, y: 2 });
// "{"x":1,"y":2}"

// 特殊值在序列化时的表现
JSON.stringify({ x: [10, undefined, function(){}, Symbol('')] })
// "{"x":[10,null,null,null]}"

// 第二个参数 replacer：过滤掉字符串类型的属性
function replacer(key, value) {
  if (typeof value === "string") return undefined;
  return value;
}
var foo = {foundation: "Mozilla", model: "box", week: 4, transport: "car", month: 7};
console.log(JSON.stringify(foo, replacer));
// "{"week":4,"month":7}"

// 第三个参数 space：控制缩进
JSON.stringify({ a: 2 }, null, " ");
/* "{
 "a": 2
}" */
```

## 手写实现

### 分析各种数据类型及边界情况

不同数据类型通过 `JSON.stringify` 后的返回规则大致如下：

| 数据类型 | JSON.stringify 返回 |
|---------|-------------------|
| undefined / 函数 / Symbol | 作为对象属性时省略，作为数组项时为 `null`，单独序列化为 `undefined` |
| NaN / Infinity | `"null"` |
| null | `"null"` |
| 字符串 | 加引号序列化 |
| 数字 / 布尔 | 直接序列化 |
| 数组 | 逐项处理，空项/特殊值转 `null` |
| 普通对象 | 忽略值为 `undefined`/函数/Symbol 的属性 |
| 带 `toJSON` 的对象 | 调用 `toJSON()` 后序列化 |
| 循环引用 | 抛出 `TypeError` |

根据上述规则，可以先利用 `typeof` 把基础数据类型和引用数据类型分开，再分情况处理。

### 代码逻辑实现

```javascript
function jsonStringify(data) {
  let type = typeof data;

  if (type !== 'object') {
    let result = data;
    // data 可能是基础数据类型的情况在这里处理
    if (Number.isNaN(data) || data === Infinity || data === -Infinity) {
      // NaN、Infinity、-Infinity 序列化返回 "null"
      result = "null";
    } else if (type === 'function' || type === 'undefined' || type === 'symbol') {
      // function/undefined/symbol 序列化返回 undefined
      return undefined;
    } else if (type === 'string') {
      result = '"' + data + '"';
    }
    return String(result);
  } else if (type === 'object') {
    if (data === null) {
      // typeof null 为 'object' 的特殊情况
      return "null";
    } else if (data.toJSON && typeof data.toJSON === 'function') {
      return jsonStringify(data.toJSON());
    } else if (data instanceof Array) {
      let result = [];
      data.forEach((item, index) => {
        if (typeof item === 'undefined' || typeof item === 'function' || typeof item === 'symbol') {
          result[index] = "null";
        } else {
          result[index] = jsonStringify(item);
        }
      });
      result = "[" + result + "]";
      return result.replace(/'/g, '"');
    } else {
      // 处理普通对象
      let result = [];
      Object.keys(data).forEach((item) => {
        if (typeof item !== 'symbol') {
          // 键值为 undefined/函数/symbol 的属性被忽略
          if (data[item] !== undefined && typeof data[item] !== 'function' && typeof data[item] !== 'symbol') {
            result.push('"' + item + '"' + ":" + jsonStringify(data[item]));
          }
        }
      });
      return ("{" + result + "}").replace(/'/g, '"');
    }
  }
}
```

实现中有几个要点需要注意：

- 由于 `function` 序列化返回 `null`，且 `typeof function` 能直接精确判断，因此处理基础数据类型时与 `undefined`、`symbol` 一起处理。
- 由于 `typeof null` 返回 `'object'`，因此 `null` 的判断放在引用数据类型的逻辑中。
- 处理数组时，数组每项的数据类型可能多样，需要对 `undefined`、`symbol`、`function` 作为数组项的情况做特殊处理（转为 `null`）。
- 处理普通对象时，键名 `key` 与键值都存在和数组类似的问题，需要针对 `undefined`、`symbol`、`function` 做特殊处理。
- 对于循环引用的对象，本实现暂未做检测，实际需抛出 `Error`。
- 官方 `JSON.stringify` 的 `replacer` 与 `space` 两个可选参数，本模拟实现未覆盖，有兴趣可自行尝试。

### 实现效果测试

用上面实现的 `jsonStringify` 与原生 `JSON.stringify` 对比测试：

```javascript
let nl = null;
console.log(jsonStringify(nl) === JSON.stringify(nl));       // true
let und = undefined;
console.log(jsonStringify(undefined) === JSON.stringify(undefined)); // true
let boo = false;
console.log(jsonStringify(boo) === JSON.stringify(boo));     // true
let nan = NaN;
console.log(jsonStringify(nan) === JSON.stringify(nan));     // true
let inf = Infinity;
console.log(jsonStringify(Infinity) === JSON.stringify(Infinity)); // true
let str = "jack";
console.log(jsonStringify(str) === JSON.stringify(str));     // true
let reg = new RegExp("\\w");
console.log(jsonStringify(reg) === JSON.stringify(reg));     // true
let date = new Date();
console.log(jsonStringify(date) === JSON.stringify(date));   // true
let sym = Symbol(1);
console.log(jsonStringify(sym) === JSON.stringify(sym));     // true
let array = [1, 2, 3];
console.log(jsonStringify(array) === JSON.stringify(array)); // true

let obj = {
  name: 'jack',
  age: 18,
  attr: ['coding', 123],
  date: new Date(),
  uni: Symbol(2),
  sayHi: function() { console.log("hi"); },
  info: {
    sister: 'lily',
    age: 16,
    intro: { money: undefined, job: null }
  }
};
console.log(jsonStringify(obj) === JSON.stringify(obj));     // true
```

从测试结果可以看出，自己实现的 `jsonStringify` 基本与原生 `JSON.stringify` 的结果一致，满足了预期。

## 总结

手写 `JSON.stringify` 看似简单，实际依赖很多数据类型相关的知识点，并需要处理各种边界情况，是全面考察 JS 编码能力的经典面试题。核心在于：按 `typeof` 区分基础/引用类型，分别处理 `NaN`、`Infinity`、`undefined`、`function`、`symbol`、`null`、数组项和对象属性键值等特殊场景。
