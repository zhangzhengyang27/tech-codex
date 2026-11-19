---
title: "new-apply-call-bind实现"
description: "深入剖析 new、apply、call、bind 的实现原理：new 的执行步骤与构造函数返回值规则、三者的区别与联系、借用方法的应用场景（类型检测、类数组、获取最值、继承），并动手实现这四个方法。"
category: JavaScript

---


# new-apply-call-bind实现

## 概念说明

JavaScript 中的 `apply`、`call` 和 `bind` 方法是前端代码开发中相当重要的概念，并且与 `this` 的指向密切相关。在继承的实现中（如组合继承），new、apply、call 被综合使用。本文围绕这几个核心方法展开，回答三个关键问题：

- 用什么样的思路可以实现 new 关键词？
- apply、call、bind 这三个方法之间有什么区别？
- 怎样实现一个 apply 或者 call 的方法？

理解这些方法的底层逻辑，是掌握 JavaScript 继承原理和扎实编程基础的重要一环。

## 原理与机制

### new 原理介绍

new 关键词的主要作用是执行一个构造函数、返回一个实例对象。在 new 的过程中，根据构造函数的情况，确定是否可以接受参数的传递：

```javascript
function Person(){
   this.name = 'Jack';
}
var p = new Person(); 
console.log(p.name)  // Jack
```

`p` 是通过 `Person` 构造函数生成的实例对象。new 在生成实例的过程中大致分为以下几个步骤：

- 创建一个新对象；
- 将构造函数的作用域赋给新对象（this 指向新对象）；
- 执行构造函数中的代码（为这个新对象添加属性）；
- 返回新对象。

如果不用 new 关键词，直接调用构造函数，行为会发生变化：

```javascript
function Person(){
  this.name = 'Jack';
}
var p = Person();
console.log(p) // undefined
console.log(name) // Jack
console.log(p.name) // TypeError: Cannot read properties of undefined (reading 'name')
```

不使用 new 时返回结果是 `undefined`。由于 JavaScript 代码在默认情况下 `this` 指向 window，`name` 的输出结果为 `Jack`——`this.name = 'Jack'` 实际上挂到了全局对象上。

当构造函数中有 `return` 一个对象的操作时，结果又不一样：

```javascript
function Person(){
   this.name = 'Jack'; 
   return {age: 18}
}
var p = new Person(); 
console.log(p)  // {age: 18}
console.log(p.name) // undefined
console.log(p.age) // 18
```

当构造函数最后 return 出来的是一个和 this 无关的对象时，new 命令会直接返回这个新对象，而不是通过 new 执行步骤生成的 this 对象。

但这里要求构造函数必须返回一个对象；如果返回的不是对象，则仍按 new 的实现步骤返回新生成的对象：

```javascript
function Person(){
   this.name = 'Jack'; 
   return 'tom';
}
var p = new Person(); 
console.log(p)  // {name: 'Jack'}
console.log(p.name) // Jack
```

当构造函数中 return 的不是一个对象时，仍会根据 new 关键词的执行逻辑生成一个新的对象（绑定了最新 this）并返回。

**结论：new 关键词执行之后总是会返回一个对象，要么是实例对象，要么是 return 语句指定的对象。**

![](/js-core-images/688a63d4418c.png)

### apply & call & bind 原理介绍

call、apply 和 bind 是挂在 `Function` 对象上的三个方法，调用这三个方法的必须是一个函数。基本语法：

```javascript
func.call(thisArg, param1, param2, ...)
func.apply(thisArg, [param1,param2,...])
func.bind(thisArg, param1, param2, ...)
```

其中 `func` 是要调用的函数，`thisArg` 一般为 this 所指向的对象，后面的 `param1`、`param2` 为函数 func 的多个参数；如果 func 不需要参数，则后面的参数可以不写。

三个方法共有的、明显的作用是**都可以改变函数 func 的 this 指向**，区别在于：

- `call` 和 `apply` 的区别是传参写法不同：`apply` 的第 2 个参数为数组；`call` 则是从第 2 个至第 N 个都是给 func 的传参
- `bind` 与 call、apply 不同：bind 虽然改变了 func 的 this 指向，但不是马上执行；而 call、apply 在改变 this 指向后立马执行

这三个方法背后的共同理念是"借用方法"。生活中的类比：家里没有锅，向邻居借一个锅来做饭——既达到了目的，又节省了开销。对应到程序中：A 对象有一个 `getName` 方法，B 对象需要临时使用同样的方法，此时不必为 B 单独扩展一个方法，而是借用 A 对象的方法——既达到目的，又避免重复定义、节约内存空间。

```javascript
let a = {
  name: 'jack',
  getName: function(msg) {
    return msg + this.name;
  } 
}
let b = {
  name: 'lily'
}
console.log(a.getName('hello~'));  // hello~jack
console.log(a.getName.call(b, 'hi~'));  // hi~lily
console.log(a.getName.apply(b, ['hi~']))  // hi~lily
let name = a.getName.bind(b, 'hello~');
console.log(name());  // hello~lily
```

三种方式都能达成目标：通过改变 this 的指向，让 b 对象直接使用 a 对象中的 `getName` 方法。后三个调用输出的都是与 `lily` 相关的结果，符合预期。

## 应用场景

以下几个应用场景的共同理念都是"借用"方法。

### 判断数据类型

用 `Object.prototype.toString` 来判断类型是最合适的，借用它几乎可以判断所有类型的数据：

```javascript
function getType(obj){
  let type  = typeof obj;
  if (type !== "object") {
    return type;
  }
  return Object.prototype.toString.call(obj).replace(/^\[object (\S+)\]$/, '$1');
}
```

判断数据类型就是借用了 Object 原型链上的 `toString` 方法，返回用于判断传入 `obj` 的字符串，从而确定最终的数据类型。

### 类数组借用方法

类数组不是真正的数组，因此没有数组类型上自带的方法，可以利用 call/apply 借用数组的方法。例如借用数组的 `push` 方法：

```javascript
var arrayLike = { 
  0: 'java',
  1: 'script',
  length: 2
} 
Array.prototype.push.call(arrayLike, 'jack', 'lily'); 
console.log(typeof arrayLike); // 'object'
console.log(arrayLike);
// {0: "java", 1: "script", 2: "jack", 3: "lily", length: 4}
```

`arrayLike` 是一个模拟数组的类数组对象，用 `typeof` 判断输出的是 `'object'`，自身没有数组的 `push` 方法。这里用 call 借用 Array 原型链上的 `push` 方法，实现了类数组的 push，给 `arrayLike` 添加了新元素。

### 获取数组的最大 / 最小值

用 `apply` 可以实现数组中判断最大 / 最小值：apply 直接传递数组作为调用方法的参数，省去一步展开数组，配合 `Math.max`、`Math.min` 使用：

```javascript
let arr = [13, 6, 10, 11, 16];
const max = Math.max.apply(Math, arr); 
const min = Math.min.apply(Math, arr);
 
console.log(max);  // 16
console.log(min);  // 6
```

### 继承

继承与 new、call 共同实现了各种各样的继承方式。以组合继承为例：

```javascript
function Parent3 () {
  this.name = 'parent3';
  this.play = [1, 2, 3];
}

Parent3.prototype.getName = function () {
  return this.name;
}
function Child3() {
  Parent3.call(this);
  this.type = 'child3';
}

Child3.prototype = new Parent3();
Child3.prototype.constructor = Child3;
var s3 = new Child3();
console.log(s3.getName());  // 'parent3'
```

类似的应用场景还有很多，关键在于"借用方法"的理念。

## 手写实现

手写实现 new、call、apply、bind 是常见的手写考查题目。实现要点如下。

### new 的实现

根据 new 的执行过程，new 被调用后大致做了三件事：

- 让实例可以访问到私有属性；
- 让实例可以访问构造函数原型（constructor.prototype）所在原型链上的属性；
- 构造函数返回的最后结果是引用数据类型。

实现思路如下：

```javascript
function _new(ctor, ...args) {
    if(typeof ctor !== 'function') {
      throw 'ctor must be a function';
    }
    let obj = new Object();
    obj.__proto__ = ctor.prototype;  // 实例的隐式原型直接指向构造函数的显式原型
    let res = ctor.apply(obj,  [...args]);

    let isObject = typeof res === 'object' && res !== null;
    let isFunction = typeof res === 'function';
    return isObject || isFunction ? res : obj;
};
```

### apply 和 call 的实现

apply 和 call 的基本原理差不多，只是参数存在区别，因此放在一起实现。依然是结合方法"借用"的原理：

```javascript
Function.prototype.call = function (context, ...args) {
  var context = context || window;
  context.fn = this;
  var result = eval('context.fn(...args)');
  delete context.fn
  return result;
}
Function.prototype.apply = function (context, args) {
  let context = context || window;
  context.fn = this;
  let result = eval('context.fn(...args)');
  delete context.fn
  return result;
}
```

实现 call 和 apply 的关键在 `eval` 这行代码：用 `context` 这个临时变量来指定上下文，然后通过执行 eval 来执行 `context.fn` 这个函数，最后返回 result。

要注意这两个方法和 bind 的区别：call/apply 直接返回执行结果，而 bind 方法返回一个函数——因此这里直接用 eval 执行得到结果。

### bind 的实现

bind 的实现思路和 apply 基本一样，差异在返回结果的处理上：bind 不需要直接执行，因此不再需要用 eval，而是通过返回一个函数的方式将结果返回，之后再执行这个函数得到想要的执行效果：

```javascript
Function.prototype.bind = function (context, ...args) {
    if (typeof this !== "function") {
      throw new Error("this must be a function");
    }
    var self = this;
    var fbound = function () {
        self.apply(this instanceof self ? this : context, args.concat(Array.prototype.slice.call(arguments)));
    }
    if(this.prototype) {
      fbound.prototype = Object.create(this.prototype);
    }
    return fbound;
}
```

实现 bind 的核心在于返回一个函数：`fbound` 需要被返回，且返回过程中原型链对象上的属性不能丢失。因此用 `Object.create` 方法将 `this.prototype` 上的属性挂到 `fbound` 的原型上，最后返回 `fbound`。这样调用 bind 方法接收到函数的对象，再通过执行接收的函数，即可得到想要的结果。

## 对比总结

new、apply、call、bind 这几个方法有区别也有联系，梳理如下：

| 方法 | this 指向 | 参数形式 | 执行时机 | 返回值 |
|---|---|---|---|---|
| new | 新创建的对象 | 构造函数参数 | 立即执行 | 对象（实例或 return 的引用类型值） |
| call | 第一个参数 thisArg | 逐个传参 | 立即执行 | 函数执行结果 |
| apply | 第一个参数 thisArg | 数组传参 | 立即执行 | 函数执行结果 |
| bind | 第一个参数 thisArg | 逐个传参（可预置） | 不立即执行 | 返回新函数 |

![](/js-core-images/10a1a43ff603.png)

在日常的前端开发中，这些方法在高级 JavaScript 编程中经常出现：优秀的开源项目经常通过"借用"的方式复用已有的方法，以节约内存、优化代码。同时，这些方法的底层逻辑实现细节比较零散，值得系统性地学习并动手实践，在遇到手写底层 API 类问题时才能从容应对。
