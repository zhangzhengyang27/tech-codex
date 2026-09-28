---
title: "Object"
description: "Object 引用类型详解：数据属性与访问器属性的 4 个特性、defineProperty/defineProperties、Object.assign 浅合并与错误中断、Object.is 相等判断、Object() 转换规则及静态方法与实例方法（valueOf/toString/toLocaleString/hasOwnProperty）。"
category: JavaScript

---

# Object

到目前为止，大多数引用值的示例使用的是 Object 类型。Object 是 ECMAScript 中最常用的类型之一。虽然 Object 的实例没有多少功能，但很适合存储和在应用程序间交换数据。

## 理解对象

### 属性类型

ECMAScript 中有两种属性：数据属性和访问器属性

#### 数据属性

数据属性包含一个数据值的位置。在这个位置可以读取和写入值。数据属性有 4 个描述其行为的特性：

- Configurable：表示能否通过 delete 删除属性从而重新定义属性，能否修改属性的特性，或者能否把属性修改为访问器属性
- Enumerable：表示能否通过 for-in 循环返回属性
- Writable：表示能否修改属性的值
- Value：包含这个属性的数据值。读取属性值的时候，从这个位置读；写入属性值的时候，把新值保存在这个位置。这个特性的默认值为undefined。

直接在对象上定义的属性，它们的 Configurable、Enumerable 和 Writable 特性都被设置为 true，而 Value 特性被设置为指定的值。

```javascript
var person = { 
 		name: "Nicholas" 
};
```

要修改属性默认的特性，必须使用 Object.defineProperty() 方法。这个方法接收三个参数：属性所在的对象、属性的名字和一个描述符对象。其中，描述符（descriptor）对象的属性必须是：configurable、enumerable、writable 和 value。设置其中的一或多个值，可以修改对应的特性值。

```javascript
let person = {}; 

Object.defineProperty(person, "name", { 
  writable: false, 
  value: "Nicholas" 
}); 

console.log(person.name); // "Nicholas" 
person.name = "Greg"; 
console.log(person.name); // "Nicholas"
```

类似的规则也适用于不可配置的属性。

```javascript
let person = {}; 

Object.defineProperty(person, "name", { 
  configurable: false, 
  value: "Nicholas" 
}); 

console.log(person.name); // "Nicholas" 
delete person.name; 
console.log(person.name); // "Nicholas"
```

把 configurable 设置为 false，表示不能从对象中删除属性。如果对这个属性调用 delete，则在非严格模式下什么也不会发生，而在严格模式下会导致错误。而且，一旦把属性定义为不可配置的，就不能再把它变回可配置了。此时，再调用 Object.defineProperty() 方法修改除 writable 之外的特性，都会导致错误：

```javascript
let person = {}; 
Object.defineProperty(person, "name", { 
  configurable: false, 
  value: "Nicholas" 
});

// 抛出错误
Object.defineProperty(person, "name", { 
  configurable: true, 
  value: "Nicholas" 
});
```

也就是说，可以多次调用 Object.defineProperty() 方法修改同一个属性，但在把 configurable 特性设置为 false 之后就会有限制了。

在调用 Object.defineProperty()方法时，如果不指定，configurable、enumerable 和writable 特性的默认值都是 false。多数情况下，可能都没有必要利用 Object.defineProperty() 方法提供的这些高级功能。不过，理解这些概念对理解 JavaScript 对象却非常有用。

#### 访问器属性

访问器属性不包含数据值；它们包含一对儿 getter 和 setter 函数( 不过，这两个函数都不是必需的) 。在读取访问器属性时，会调用 getter 函数，这个函数负责返回有效的值；在写入访问器属性时，会调用setter 函数并传入新值，这个函数负责决定如何处理数据。访问器属性有如下 4 个特性

- Configurable：表示能否通过 delete 删除属性从而重新定义属性，能否修改属性的特性，或者能否把属性修改为数据属性。对于直接在对象上定义的属性，这个特性的默认值为 true
- Enumerable：表示能否通过 for-in 循环返回属性。对于直接在对象上定义的属性，这个特性的默认值为 true
- Get：在读取属性时调用的函数。默认值为 undefined
- Set：在写入属性时调用的函数。默认值为 undefined

访问器属性不能直接定义，必须使用 Object.defineProperty() 来定义

```javascript
// 定义一个对象，包含伪私有成员 year_和公共成员 edition
let book = { 
  _year: 2017, 
  edition: 1 
}; 

Object.defineProperty(book, "year", { 
  get: function(){ 
    return this._year; 
  }, 
  set: function(newValue){ 
    if (newValue > 2004) { 
      this._year = newValue; 
      this.edition += newValue - 2004; 
    } 
  } 
}); 

book.year = 2005; 
alert(book.edition); //2
```

不一定非要同时指定 getter 和 setter。只指定 getter 意味着属性是不能写，尝试写入属性会被忽略。在严格模式下，尝试写入只指定了 getter 函数的属性会抛出错误。类似地，只指定 setter 函数的属性也不能读，否则在非严格模式下会返回 undefined，而在严格模式下会抛出错误。

在不支持 Object.defineProperty() 方法的浏览器中不能修改 Configurable 和Enumerable。

### 定义多个属性

由于为对象定义多个属性的可能性很大，ECMAScript 又定义了一个 Object.defineProperties() 方法。利用这个方法可以通过描述符一次定义多个属性。这个方法接收两个对象参数：第一个对象是要添加和修改其属性的对象，第二个对象的属性与第一个对象中要添加或修改的属性一一对应

```javascript
let book = {};

Object.defineProperties(book, { 
  year_: { 
    value: 2017 
  }, 
  edition: { 
    value: 1 
  }, 
  year: { 
    get() { 
      return this.year_; 
    },
    set(newValue) { 
      if (newValue > 2017) { 
        this.year_ = newValue; 
        this.edition += newValue - 2017; 
      } 
    } 
  } 
});
```

这段代码在 book 对象上定义了两个数据属性 year_ 和 edition，还有一个访问器属性 year。最终的对象跟上一节示例中的一样。唯一的区别是所有属性都是同时定义的，并且数据属性的 configurable、enumerable 和 writable 特性值都是 false

### 读取属性的特性

使用 ECMAScript的 Object.getOwnPropertyDescriptor()方法，可以取得给定属性的描述符。这个方法接收两个参数：属性所在的对象和要读取其描述符的属性名称。

返回值是一个对象，如果是访问器属性，这个对象的属性有 configurable、enumerable、get 和 set；

如果是数据属性，这个对象的属性有 configurable、enumerable、writable 和 value

```javascript
let book = {};

Object.defineProperties(book, {
  year_: {
    value: 2017
  },
  edition: { 
    value: 1
  },
  year: {
    get: function() {
      return this.year_;
    },
    set: function(newValue){
      if (newValue > 2017) {
        this.year_ = newValue;
        this.edition += newValue - 2017;
      }
    }
  }
});

let descriptor = Object.getOwnPropertyDescriptor(book, "year_");
console.log(descriptor.value); // 2017
console.log(descriptor.configurable); // false
console.log(typeof descriptor.get); // "undefined"

descriptor = Object.getOwnPropertyDescriptor(book, "year");
console.log(descriptor.value); // undefined（访问器属性没有 value 特性）
console.log(descriptor.enumerable); // false
console.log(typeof descriptor.get); // "function"
```

ECMAScript 2017 新增了 Object.getOwnPropertyDescriptors() 静态方法。这个方法实际上会在每个自有属性上调用 Object.getOwnPropertyDescriptor()并在一个新对象中返回它们。对于前面的例子，使用这个静态方法会返回如下对象：

```js
let book = {}; 
Object.defineProperties(book, { 
  year_: { 
    value: 2017 
  }, 
  edition: { 
    value: 1 
  }, 
  year: { 
    get: function() { 
      return this.year_; 
    }, 
    set: function(newValue){ 
      if (newValue > 2017) { 
        this.year_ = newValue; 
        this.edition += newValue - 2017; 
      } 
    } 
  } 
}); 
console.log(Object.getOwnPropertyDescriptors(book)); 
// { 
// edition: { 
// configurable: false, 
// enumerable: false, 
// value: 1, 
// writable: false 
// }, 
// year: { 
// configurable: false, 
// enumerable: false, 
// get: f(), 
// set: f(newValue), 
// }, 
// year_: { 
// configurable: false, 
// enumerable: false, 
// value: 2017, 
// writable: false 
// } 
// }
```

### 合并对象 Object.assign

JavaScript 开发者经常觉得“合并”（merge）两个对象很有用。更具体地说，就是把源对象所有的本地属性一起复制到目标对象上。有时候这种操作也被称为“混入”（mixin），因为目标对象通过混入源对象的属性得到了增强。

ECMAScript 6 专门为合并对象提供了 Object.assign()方法。这个方法接收一个目标对象和一个或多个源对象作为参数，然后将每个源对象中可枚举（Object.propertyIsEnumerable()返回 true）和自有（Object.hasOwnProperty()返回 true）属性复制到目标对象。以字符串和符号为键的属性会被复制。对每个符合条件的属性，这个方法会使用源对象上的[[Get]]取得属性的值，然后使用目标对象上的[[Set]]设置属性的值

```js
let dest, src, result; 

/** 
 * 简单复制
 */ 
dest = {}; 
src = { id: 'src' }; 
result = Object.assign(dest, src); 

// Object.assign 修改目标对象，也会返回修改后的目标对象
console.log(dest === result); // true 
console.log(dest !== src); // true 
console.log(result); // { id: src } 
console.log(dest); // { id: src } 

/** 
 * 多个源对象
 */ 
dest = {}; 
result = Object.assign(dest, { a: 'foo' }, { b: 'bar' }); 
console.log(result); // { a: foo, b: bar } 

/** 
 * 获取函数与设置函数
 */ 
dest = { 
  set a(val) { 
    console.log(`Invoked dest setter with param ${val}`); 
  } 
}; 
src = { 
  get a() { 
    console.log('Invoked src getter'); 
    return 'foo'; 
  } 
}; 
Object.assign(dest, src); 

// 调用 src 的获取方法
// 调用 dest 的设置方法并传入参数"foo" 
// 因为这里的设置函数不执行赋值操作，所以实际上并没有把值转移过来
console.log(dest); // { set a(val) {...} }
```

Object.assign() 实际上对每个源对象执行的是浅复制。如果多个源对象都有相同的属性，则使用最后一个复制的值。此外，从源对象访问器属性取得的值，比如获取函数，会作为一个静态值赋给目标对象。换句话说，不能在两个对象间转移获取函数和设置函数

```js
let dest, src, result;

/** 
 * 覆盖属性
 */ 
dest = { id: 'dest' }; 
result = Object.assign(dest, { id: 'src1', a: 'foo' }, { id: 'src2', b: 'bar' });

// Object.assign 会覆盖重复的属性
console.log(result); // { id: src2, a: foo, b: bar }

// 可以通过目标对象上的设置函数观察到覆盖的过程：
dest = { 
  set id(x) { 
    console.log(x); 
  } 
}; 
Object.assign(dest, { id: 'first' }, { id: 'second' }, { id: 'third' }); 
// first 
// second 
// third

/** 
 * 对象引用
 */ 
dest = {}; 
src = { a: {} }; 
Object.assign(dest, src);

// 浅复制意味着只会复制对象的引用
console.log(dest); // { a :{} } 
console.log(dest.a === src.a); // true
```

如果赋值期间出错，则操作会中止并退出，同时抛出错误。Object.assign()没有“回滚”之前赋值的概念，因此它是一个尽力而为、可能只会完成部分复制的方法

```js
let dest, src, result;

/** 
 * 错误处理
 */ 
dest = {}; 
src = { 
  a: 'foo', 
  get b() { 
    // Object.assign()在调用这个获取函数时会抛出错误
    throw new Error(); 
  },
  c: 'bar' 
}; 

try { 
  Object.assign(dest, src); 
} catch(e) {}

// Object.assign()没办法回滚已经完成的修改，因此在抛出错误之前，目标对象上已经完成的修改会继续存在：
console.log(dest); // { a: foo }
```

### 对象标识及相等判断 Object.is

 ECMAScript 6 之前，有些特殊情况即使是===操作符也无能为力：

```js
// 这些是===符合预期的情况
console.log(true === 1); // false
console.log({} === {}); // false
console.log("2" === 2); // false

// 这些情况在不同 JavaScript 引擎中表现不同，但仍被认为相等
console.log(+0 === -0); // true
console.log(+0 === 0); // true
console.log(-0 === 0); // true

// 要确定 NaN 的相等性，必须使用极为讨厌的 isNaN() 
console.log(NaN === NaN); // false 
console.log(isNaN(NaN)); // true
```

为改善这类情况，ECMAScript 6 规范新增了 Object.is()，这个方法与===很像，但同时也考虑到了上述边界情形。这个方法必须接收两个参数：

```js
console.log(Object.is(true, 1)); // false
console.log(Object.is({}, {})); // false
console.log(Object.is("2", 2)); // false

// 正确的 0、-0、+0 相等/不等判定
console.log(Object.is(+0, -0)); // false
console.log(Object.is(+0, 0)); // true
console.log(Object.is(-0, 0)); // false

// 正确的 NaN 相等判定
console.log(Object.is(NaN, NaN)); // true
```

要检查超过两个值，递归地利用相等性传递即可：

```js
function recursivelyCheckEqual(x, ...rest) { 
  return Object.is(x, rest[0]) && (rest.length < 2 || recursivelyCheckEqual(...rest)); 
}
```

## 创建 Object

显式地创建 Object 的实例有两种方式。第一种是使用 new 操作符和 Object 构造函数，如下所示：

```js
let person = new Object(); 
person.name = "Nicholas"; 
person.age = 29; 
```

另一种方式是使用对象字面量表示法。对象字面量是对象定义的简写形式，目的是为了简化包含大量属性的对象的创建。比如，下面的代码定义了与前面示例相同的 person 对象，但使用的是对象字面量表示法：

```js
let person = { 
  name: "Nicholas", 
  age: 29 
}; 
```

在 ECMAScript 中，表达式上下文指的是期待返回值的上下文。赋值操作符表示后面要期待一个值，因此左大括号表示一个表达式的开始。同样是左大括号，如果出现在语句上下文（statement context）中，比如 if 语句的条件后面，则表示一个语句块的开始。

最后一个属性后面加上逗号在非常老的浏览器中会导致报错，但所有现代浏览器都支持这种写法。

### 访问对象属性

虽然使用哪种方式创建 Object 实例都可以，但实际上开发者更倾向于使用对象字面量表示法。这是因为对象字面量代码更少，看起来也更有封装所有相关数据的感觉。事实上，对象字面量已经成为给函数传递大量可选参数的主要方式

```js
function displayInfo(args) { 
  let output = ""; 
  if (typeof args.name == "string"){ 
    output += "Name: " + args.name + "\n"; 
  } 
  if (typeof args.age == "number") { 
    output += "Age: " + args.age + "\n"; 
  } 
  alert(output); 
}

displayInfo({ 
  name: "Nicholas", 
  age: 29 
});

displayInfo({ 
  name: "Greg" 
});
```

虽然属性一般是通过点语法来存取的，这也是面向对象语言的惯例，但也可以使用中括号来存取属性。在使用中括号时，要在括号内使用属性名的字符串形式，比如：

```js
console.log(person["name"]); // "Nicholas" 
console.log(person.name); // "Nicholas" 
```

从功能上讲，这两种存取属性的方式没有区别。使用中括号的主要优势就是可以通过变量访问属性，就像下面这个例子中一样：

```js
let propertyName = "name"; 
console.log(person[propertyName]); // "Nicholas" 
```

另外，如果属性名中包含可能会导致语法错误的字符，或者包含关键字/保留字时，也可以使用中括号语法。比如：

```js
person["first name"] = "Nicholas"; 
```

因为"first name"中包含一个空格，所以不能使用点语法来访问。不过，属性名中是可以包含非字母数字字符的，这时候只要用中括号语法存取它们就行了

> 通常，点语法是首选的属性存取方式，除非访问属性时必须使用变量

## Object() 函数

Object 本身是一个函数，可以当作工具方法使用，将任意值转为对象。这个方法常用于保证某个值一定是对象。如果参数为空 (或者为 undefined 和 null ) ，Object() 返回一个空对象

```javascript
var obj = Object();

// 等同于
var obj = Object(undefined);
var obj = Object(null);

obj instanceof Object // true
```

如果参数是原始类型的值，Object 方法将其转为对应的包装对象的实例

```javascript
var obj = Object(1);
obj instanceof Object // true
obj instanceof Number // true

var obj = Object('foo');
obj instanceof Object // true
obj instanceof String // true

var obj = Object(true);
obj instanceof Object // true
obj instanceof Boolean // true
```

如果 Object 方法的参数是一个对象，它总是返回该对象，即不用转换

```javascript
var arr = [];
var obj = Object(arr); // 返回原数组
obj === arr // true

var value = {};
var obj = Object(value) // 返回原对象
obj === value // true

var fn = function () {};
var obj = Object(fn); // 返回原函数
obj === fn // true
```

利用这一点，可以写一个判断变量是否为对象的函数

```javascript
function isObject(value) {
  return value === Object(value);
}

isObject([]) // true
isObject(true) // false
```

## 静态方法

所谓“静态方法”，是指部署在 Object 对象自身的方法

### keys 和 getOwnPropertyNames

- Object.keys 方法和 Object.getOwnPropertyNames 方法都用来遍历对象的属性
- Object.keys 方法的参数是一个对象，返回一个数组。包含了该对象自身的（而不是继承的）所有可枚举属性名
- Object.getOwnPropertyNames 方法也接受一个对象作为参数，返回一个数组，包含了该对象自身的所有属性名

```javascript
var obj = {
  p1: 123,
  p2: 456
};

Object.keys(obj) // ["p1", "p2"]
var obj = {
  p1: 123,
  p2: 456
};

Object.getOwnPropertyNames(obj) // ["p1", "p2"]
```

**对于一般的对象来说，Object.keys() 和 Object.getOwnPropertyNames() 返回的结果是一样的。只有涉及不可枚举属性时，才会有不一样的结果。Object.keys 方法只返回可枚举的属性，Object.getOwnPropertyNames 方法还返回不可枚举的属性名**

```javascript
var a = ['Hello', 'World'];

Object.keys(a) // ["0", "1"]
Object.getOwnPropertyNames(a) // ["0", "1", "length"]
```

由于 JavaScript 没有提供计算对象属性个数的方法，所以可以用这两个方法代替

```javascript
var obj = {
  p1: 123,
  p2: 456
};

Object.keys(obj).length // 2
Object.getOwnPropertyNames(obj).length // 2
```

> 一般情况下，几乎总是使用 Object.keys 方法，遍历对象的属性

### 其他方法

除了上面提到的两个方法，Object 还有不少其他静态方法，将在后文逐一详细介绍

对象属性模型的相关方法

- Object.getOwnPropertyDescriptor()  获取某个属性的描述对象

- Object.defineProperty()  通过描述对象，定义某个属性

- Object.defineProperties()  通过描述对象，定义多个属性

控制对象状态的方法

- Object.preventExtensions()  防止对象扩展

- Object.isExtensible()  判断对象是否可扩展

- Object.seal()  禁止对象配置

- Object.isSealed()  判断一个对象是否可配置

- Object.freeze()  冻结一个对象

- Object.isFrozen()  判断一个对象是否被冻结

原型链相关方法

- Object.create()  该方法可以指定原型对象和属性，返回一个新的对象

- Object.getPrototypeOf()  获取对象的 Prototype 对象

## 实例方法

除了静态方法，还有不少方法定义在 Object.prototype 对象。它们称为实例方法，所有 Object 的实例对象都继承了这些方法

Object 实例对象的方法，主要有以下六个

- Object.prototype.valueOf()  返回当前对象对应的值

- Object.prototype.toString()  返回当前对象对应的字符串形式

- Object.prototype.toLocaleString()  返回当前对象对应的本地字符串形式

- Object.prototype.hasOwnProperty()  判断某个属性是否为当前对象自身的属性，还是继承自原型对象的属性

- Object.prototype.isPrototypeOf()  判断当前对象是否为另一个对象的原型

- Object.prototype.propertyIsEnumerable()  判断某个属性是否可枚举

### valueOf

valueOf 方法的作用是返回一个对象的“值”，默认情况下返回对象本身

```javascript
var obj = new Object();
obj.valueOf() === obj // true
```

**valueOf 方法的主要用途是，JavaScript 自动类型转换时会默认调用这个方法**

```javascript
var obj = new Object();
1 + obj // "1[object Object]"
```

上面代码将对象 obj 与数字 1 相加，这时 JavaScript 就会默认调用 valueOf() 方法，求出 obj 的值再与 1 相加。所以，如果自定义 valueOf 方法，就可以得到想要的结果

```javascript
var obj = new Object();
obj.valueOf = function () {
  return 2;
};

1 + obj // 3
```

自定义 obj 对象的 valueOf 方法，于是 1 + obj 就得到了 3。这种方法就相当于用自定义的 obj.valueOf 覆盖 `Object.prototype.valueOf`

### toString

toString 方法的作用是返回一个对象的字符串形式，默认情况下返回类型字符串

```javascript
var o1 = new Object();
o1.toString() // "[object Object]"

var o2 = {a:1};
o2.toString() // "[object Object]"
```

字符串 [object Object] 本身没有太大的用处，但是通过自定义 toString 方法，可以让对象在自动类型转换时，得到想要的字符串形式

```javascript
var obj = new Object();

obj.toString = function () {
  return 'hello';
};

obj + ' ' + 'world' // "hello world"
```

**上面代码表示，当对象用于字符串加法时，会自动调用 toString 方法。由于自定义了 toString 方法，所以返回字符串 hello world**

数组、字符串、函数、Date 对象都分别部署了自定义的 toString 方法，覆盖了 Object.prototype.toString 方法

```javascript
[1, 2, 3].toString() // "1,2,3"

'123'.toString() // "123"

(function () {
  return 123;
}).toString()
// 输出结果 
// "function () {
//   return 123;
// }"

(new Date()).toString()
// "Tue May 10 2016 09:11:31 GMT+0800 (CST)"
```

Object.prototype.toString 方法返回对象的类型字符串，因此可以用来判断一个值的类型

调用空对象的 toString 方法，结果返回一个字符串 object Object，其中第二个 Object 表示该值的构造函数

```javascript
var obj = {};
obj.toString() // "[object Object]"
```

**由于实例对象可能会自定义 toString 方法，覆盖掉 Object.prototype.toString 方法，所以为了得到类型字符串，最好直接使用 Object.prototype.toString 方法。通过函数的 call 方法，可以在任意值上调用这个方法，帮助我们判断这个值的类型**

```javascript
Object.prototype.toString.call(value)
```

不同数据类型的 Object.prototype.toString 方法返回值如下

- 数值：返回 [object Number]

- 字符串：返回 [object String]

- 布尔值：返回 [object Boolean]

- undefined：返回 [object Undefined]

- null：返回 [object Null]

- 数组：返回 [object Array]

- arguments 对象：返回 [object Arguments]

- 函数：返回 [object Function]

- Error 对象：返回 [object Error]

- Date 对象：返回 [object Date]

- RegExp 对象：返回 [object RegExp]

- 其他对象：返回 [object Object]

这就是说，Object.prototype.toString 可以看出一个值到底是什么类型。

```javascript
Object.prototype.toString.call(2) // "[object Number]"
Object.prototype.toString.call('') // "[object String]"
Object.prototype.toString.call(true) // "[object Boolean]"
Object.prototype.toString.call(undefined) // "[object Undefined]"
Object.prototype.toString.call(null) // "[object Null]"
Object.prototype.toString.call(Math) // "[object Math]"
Object.prototype.toString.call({}) // "[object Object]"
Object.prototype.toString.call([]) // "[object Array]"
```

利用这个特性，可以写出一个比 `typeof` 运算符更准确的类型判断函数

```javascript
var type = function (o){
  var s = Object.prototype.toString.call(o);
  return s.match(/\[object (.*?)\]/)[1].toLowerCase();
};

type({}); // "object"
type([]); // "array"
type(5); // "number"
type(null); // "null"
type(); // "undefined"
type(/abcd/); // "regexp"
type(new Date()); // "date"
```

在上面这个 `type` 函数的基础上，还可以加上专门判断某种类型数据的方法

```javascript
var type = function (o){
  var s = Object.prototype.toString.call(o);
  return s.match(/\[object (.*?)\]/)[1].toLowerCase();
};

['Null',
 'Undefined',
 'Object',
 'Array',
 'String',
 'Number',
 'Boolean',
 'Function',
 'RegExp'
].forEach(function (t) {
  type['is' + t] = function (o) {
    return type(o) === t.toLowerCase();
  };
});

type.isObject({}) // true
type.isNumber(NaN) // true
type.isRegExp(/abc/) // true
```

### toLocaleString

Object.prototype.toLocaleString 方法与 toString 的返回结果相同，也是返回一个值的字符串形式

```javascript
var obj = {};
obj.toString(obj) // "[object Object]"
obj.toLocaleString(obj) // "[object Object]"
```

这个方法的主要作用是留出一个接口，让各种不同的对象实现自己版本的 toLocaleString，用来返回针对某些地域的特定的值

```javascript
var person = {
  toString: function () {
    return 'Henry Norman Bethune';
  },
  toLocaleString: function () {
    return '白求恩';
  }
};

person.toString() // Henry Norman Bethune
person.toLocaleString() // 白求恩
```

目前，主要有三个对象自定义了 toLocaleString 方法

- Array.prototype.toLocaleString()

- Number.prototype.toLocaleString()

- Date.prototype.toLocaleString()

举例来说，日期的实例对象的 toString 和 toLocaleString 返回值就不一样，而且 toLocaleString 的返回值跟用户设定的所在地域相关

```javascript
var date = new Date();
date.toString() // "Tue Jan 01 2018 12:01:33 GMT+0800 (CST)"
date.toLocaleString() // "1/01/2018, 12:01:33 PM"
```

### hasOwnProperty()

接受一个字符串作为参数，返回一个布尔值，**表示该实例对象自身是否具有该属性**

```javascript
var obj = {
  p: 123
};

obj.hasOwnProperty('p') // true
obj.hasOwnProperty('toString') // false
```

上面代码中，对象 obj 自身具有 p 属性，所以返回 true。toString 属性是继承的，所以返回 false
