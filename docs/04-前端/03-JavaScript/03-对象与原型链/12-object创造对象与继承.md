---
title: "创造对象与继承"
description: "系统讲解 JavaScript 创建对象的工厂模式、构造函数模式与原型模式，以及原型链、盗用构造函数、组合继承、原型式继承、寄生式继承与寄生式组合继承六种继承模式及其优缺点。"
category: JavaScript

---

# 创造对象与继承

## 创建对象

虽然使用 Object 构造函数或对象字面量可以方便地创建对象，但这些方式也有明显不足：创建具有同样接口的多个对象需要重复编写很多代码。

ECMAScript 6 开始正式支持类和继承。ES6 的类旨在完全涵盖之前规范设计的基于原型的继承模式。不过，无论从哪方面看，ES6 的类都仅仅是封装了 ES5.1 构造函数加原型继承的语法糖而已

### 工厂模式

工厂模式是一种众所周知的设计模式，广泛应用于软件工程领域，用于抽象创建特定对象的过程。下面的例子展示了一种按照特定接口创建对象的方式

```js
function createPerson(name, age, job) {
  let o = new Object();
  o.name = name;
  o.age = age;
  o.job = job;
  o.sayName = function() {
    console.log(this.name);
  };
  return o;
}

let person1 = createPerson("Nicholas", 29, "Software Engineer");
let person2 = createPerson("Greg", 27, "Doctor");
```

可以用不同的参数多次调用这个函数，每次都会返回包含 3 个属性和 1 个方法的对象。这种工厂模式虽然可以解决创建多个类似对象的问题，但没有解决对象标识问题 (即新创建的对象是什么类型)

### 构造函数模式

ECMAScript 中的构造函数是用于创建特定类型对象的。像 Object 和 Array 这样的原生构造函数，运行时可以直接在执行环境中使用。当然也可以自定义构造函数，以函数的形式为自己的对象类型定义属性和方法。比如，前面的例子使用构造函数模式可以这样写：

```js
function Person(name, age, job){ 
  this.name = name;
  this.age = age;
  this.job = job;
  this.sayName = function() {
    console.log(this.name);
  };
}

let person1 = new Person("Nicholas", 29, "Software Engineer"); 
let person2 = new Person("Greg", 27, "Doctor"); 
person1.sayName(); // Nicholas 
person2.sayName(); // Greg
```

在这个例子中，Person() 构造函数代替了 createPerson() 工厂函数。实际上，Person() 内部的代码跟 createPerson() 基本是一样的，只是有如下区别

1. 没有显式地创建对象
2. 属性和方法直接赋值给了 this
3. 没有 return

另外，要注意函数名 Person 的首字母大写了。按照惯例，构造函数名称的首字母都是要大写的，非构造函数则以小写字母开头。这是从面向对象编程语言那里借鉴的，有助于在 ECMAScript 中区分构造函数和普通函数。毕竟 ECMAScript 的构造函数就是能创建对象的函数。

要创建 Person 的实例，应使用 new 操作符。以这种方式调用构造函数会执行如下操作

1. 在内存中创建一个新对象
2. 这个新对象内部的 [[Prototype]] 特性被赋值为构造函数的 prototype 属性
3. 构造函数内部的 this 被赋值为这个新对象 (即 this 指向新对象)
4. 执行构造函数内部的代码 (给新对象添加属性)
5. 如果构造函数返回非空对象，则返回该对象；否则，返回刚创建的新对象

上一个例子的最后，person1 和 person2 分别保存着 Person 的不同实例。这两个对象都有一个 constructor 属性指向 Person

```js
console.log(person1.constructor == Person); // true
console.log(person2.constructor == Person); // true
```

对象的 constructor 属性最初是用来标识对象类型的。但是，提到检测对象类型，还是 instanceof 操作符要更可靠一些

```javascript
alert(person1 instanceof Object); // true
alert(person1 instanceof Person); // true
alert(person2 instanceof Object); // true
alert(person2 instanceof Person); // true
```

在实例化时，如果不想传参数，那么构造函数后面的括号可加可不加。只要有 new 操作符，就可以调用相应的构造函数：

```js
function Person() { 
  this.name = "Jake";
  this.sayName = function() { 
    console.log(this.name);
  };
}

let person1 = new Person(); 
let person2 = new Person;

person1.sayName(); // Jake 
person2.sayName(); // Jake 
console.log(person1 instanceof Object); // true 
console.log(person1 instanceof Person); // true 
console.log(person2 instanceof Object); // true 
console.log(person2 instanceof Person); // true
```

#### 构造函数也是函数

构造函数与其他函数的唯一区别，就在于调用它们的方式不同。不过，构造函数毕竟也是函数，不存在定义构造函数的特殊语法

- 任何函数，只要通过 new 操作符来调用，那它就可以作为构造函数；
- 而任何函数，如果不通过 new 操作符来调用，那它跟普通函数也不会有什么两样。

例如，前面例子中定义的 Person() 函数可以通过下列任何一种方式来调用。

```javascript
// 作为构造函数
let person = new Person("Nicholas", 29, "Software Engineer");
person.sayName(); // "Nicholas"

// 作为函数调用
Person("Greg", 27, "Doctor"); // 添加到 window 对象
window.sayName(); // "Greg"

// 在另一个对象的作用域中调用
let o = new Object(); 
Person.call(o, "Kristen", 25, "Nurse"); 
o.sayName(); // "Kristen"
```

使用 new 操作符创建一个新对象。然后是普通函数的调用方式，这时候没有使用 new 操作符调用 Person()，结果会将属性和方法添加到 window 对象。这里要记住，在调用一个函数而没有明确设置 this 值的情况下（即没有作为对象的方法调用，或者没有使用 call()/apply()调用），this 始终指向 Global 对象（在浏览器中就是 window 对象）

因此在上面的调用之后，window 对象上就有了一个 sayName()方法，调用它会返回"Greg"。最后展示的调用方式是通过 call()（或 apply()）调用函数，同时将特定对象指定为作用域。这里的调用将对象 o 指定为 Person()内部的 this 值，因此执行完函数代码后，所有属性和 sayName()方法都会添加到对象 o 上面

#### 构造函数的问题

构造函数模式虽然好用，但也并非没有缺点。使用构造函数的主要问题，就是每个方法都要在每个实例上重新创建一遍。

在前面的例子中，person1 和 person2 都有一个名为 sayName() 的方法，但那两个方法不是同一个 Function 的实例。但 ECMAScript 中的函数是对象，因此每定义一个函数，也就是实例化了一个对象。从逻辑角度讲，此时的构造函数也可以这样定义。

```javascript
function Person(name, age, job){ 
 		this.name = name; 
 		this.age = age; 
 		this.job = job; 
 		this.sayName = new Function("alert(this.name)"); // 与声明函数在逻辑上是等价的
}
```

这样理解这个构造函数可以更清楚地知道，每个 Person 实例都会有自己的 Function 实例用于显示 name 属性。当然了，以这种方式创建函数会带来不同的作用域链和标识符解析。但创建新 Function 实例的机制是一样的。因此不同实例上的函数虽然同名却不相等

```javascript
alert(person1.sayName == person2.sayName); //false
```

然而，创建两个完成同样任务的 Function 实例的确没有必要；况且有 this 对象在，根本不用在执行代码前就把函数绑定到特定对象上面。可以通过把函数定义转移到构造函数外部来解决这个问题

```javascript
function Person(name, age, job){ 
  this.name = name; 
  this.age = age; 
  this.job = job; 
  this.sayName = sayName; 
}

function sayName() { 
  console.log(this.name); 
}

let person1 = new Person("Nicholas", 29, "Software Engineer"); 
let person2 = new Person("Greg", 27, "Doctor"); 
person1.sayName(); // Nicholas 
person2.sayName(); // Greg
```

由于 sayName 包含的是一个指向函数的指针，因此 person1 和 person2 对象就共享了在全局作用域中定义的同一个 sayName() 函数

- 这样做确实解决了两个函数做同一件事的问题，可是新问题又来了：在全局作用域中定义的函数实际上只能被某个对象调用，这让全局作用域有点名不副实
- 而更让人无法接受的是：如果对象需要定义很多方法，那么就要定义很多个全局函数，于是我们这个自定义的引用类型就丝毫没有封装性可言了

好在，这些问题可以通过使用原型模式来解决

### 原型模式

我们创建的每个函数都有一个 prototype（原型）属性，这个属性是一个指针，指向一个对象，而这个对象的用途是包含可以由特定类型的所有实例共享的属性和方法。如果按照字面意思来理解，那么 prototype 就是通过调用构造函数而创建的那个对象实例的原型对象。

使用原型对象的好处是可以让所有对象实例共享它所包含的属性和方法。换句话说，不必在构造函数中定义对象实例的信息，而是可以将这些信息直接添加到原型对象中

```javascript
function Person() {}
Person.prototype.name = "Nicholas";
Person.prototype.age = 29;
Person.prototype.job = "Software Engineer";
Person.prototype.sayName = function() {
  console.log(this.name);
};

let person1 = new Person();
person1.sayName(); // "Nicholas"
let person2 = new Person();
person2.sayName(); // "Nicholas"
console.log(person1.sayName == person2.sayName); // true
```

也可以使用函数表达式

```js
let Person = function() {};

Person.prototype.name = "Nicholas";
Person.prototype.age = 29; 
Person.prototype.job = "Software Engineer"; 
Person.prototype.sayName = function() {
  console.log(this.name);
};

let person1 = new Person(); 
person1.sayName(); // "Nicholas" 
let person2 = new Person(); 
person2.sayName(); // "Nicholas" 
console.log(person1.sayName == person2.sayName); // true
```

这里，所有属性和 sayName() 方法都直接添加到了 Person 的 prototype 属性上，构造函数体中什么也没有。但这样定义之后，调用构造函数创建的新对象仍然拥有相应的属性和方法。与构造函数模式不同，使用这种原型模式定义的属性和方法是由所有实例共享的。因此 person1 和 person2 访问的都是相同的属性和相同的 sayName() 函数。要理解这个过程，就必须理解 ECMAScript 中原型的本质。

#### 理解原型

无论何时，只要创建一个函数，就会按照特定的规则为这个函数创建一个 prototype 属性( 指向原型对象) 。默认情况下，所有原型对象自动获得一个名为 constructor 的属性，指回与之关联的构造函数。对前面的例子而言，Person.prototype.constructor 指向 Person。然后，因构造函数而异，可能会给原型对象添加其他属性和方法。

在自定义构造函数时，原型对象默认只会获得 constructor 属性，其他的所有方法都继承自 Object。每次调用构造函数创建一个新实例，这个实例的内部 [[Prototype]] 指针就会被赋值为构造函数的原型对象。脚本中没有访问这个 [[Prototype]] 特性的标准方式，但 Firefox、Safari 和 Chrome 会在每个对象上暴露 `__proto__` 属性，通过这个属性可以访问对象的原型。在其他实现中，这个特性完全被隐藏了。关键在于理解这一点：实例与构造函数原型之间有直接的联系，但实例与构造函数之间没有。

这种关系不好可视化，但可以通过下面的代码来理解原型的行为：

```js
function Person() {} 

// 声明之后，构造函数就有了一个与之关联的原型对象
console.log(typeof Person.prototype); 
console.log(Person.prototype); 
// { 
// 		constructor: f Person(), 
// 		__proto__: Object
// }

// 如前所述，构造函数有一个 prototype 属性引用其原型对象，而这个原型对象也有一个 constructor 属性，
// 引用这个构造函数换句话说，两者循环引用：
console.log(Person.prototype.constructor === Person); // true

// 正常的原型链都会终止于 Object 的原型对象，Object 原型的原型是 null
console.log(Person.prototype.__proto__ === Object.prototype); // true
console.log(Person.prototype.__proto__.constructor === Object); // true
console.log(Person.prototype.__proto__.__proto__ === null); // true
console.log(Person.prototype.__proto__);
// { 
// 		constructor: f Object(), 
// 		toString: ... 
// 		hasOwnProperty: ... 
// 		isPrototypeOf: ... 
// ... 
// }

let person1 = new Person(), person2 = new Person(); 

// 构造函数、原型对象和实例是 3 个完全不同的对象
console.log(person1 !== Person); // true 
console.log(person1 !== Person.prototype); // true 
console.log(Person.prototype !== Person); // true

/** 
 * 实例通过__proto__链接到原型对象，它实际上指向隐藏特性[[Prototype]] 
 * 构造函数通过 prototype 属性链接到原型对象
 * 实例与构造函数没有直接联系，与原型对象有直接联系
 */ 
console.log(person1.__proto__ === Person.prototype); // true 
console.log(person1.__proto__.constructor === Person); // true 

// 同一个构造函数创建的两个实例共享同一个原型对象：
console.log(person1.__proto__ === person2.__proto__); // true

// instanceof 检查实例的原型链中,是否包含指定构造函数的原型
console.log(person1 instanceof Person); // true 
console.log(person1 instanceof Object); // true 
console.log(Person.prototype instanceof Object); // true
```

对于前面例子中的 Person 构造函数和 Person.prototype：

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202401241339038.png)

上图展示了 Person 构造函数、Person 的原型对象和 Person 现有两个实例之间的关系。注意，Person.prototype 指向原型对象，而 Person.prototype.constructor 指回 Person 构造函数。原型对象包含 constructor 属性和其他后来添加的属性。Person 的两个实例 person1 和 person2 都只有一个内部属性指回 Person.prototype，而且两者都与构造函数没有直接联系。

虽然不是所有实现都对外暴露了 [[Prototype]]，但可以使用 isPrototypeOf() 方法确定两个对象之间的这种关系。本质上，isPrototypeOf()会在传入参数的 [[Prototype]] 指向调用它的对象时返回 true，如下所示：

```js
console.log(Person.prototype.isPrototypeOf(person1)); // true 
console.log(Person.prototype.isPrototypeOf(person2)); // true 
```

通过原型对象调用 isPrototypeOf() 方法检查了 person1 和 person2。因为这两个例子内部都有链接指向 Person.prototype，所以结果都返回 true。

ECMAScript 的 Object 类型有一个方法叫 Object.getPrototypeOf()，返回参数的内部特性 [[Prototype]]的值。即获取实例的原型对象

```js
console.log(Object.getPrototypeOf(person1) == Person.prototype); // true 
console.log(Object.getPrototypeOf(person1).name); // "Nicholas" 
```

第一行代码简单确认了 Object.getPrototypeOf() 返回的对象就是传入对象的原型对象。第二行代码则取得了原型对象上 name 属性的值，即"Nicholas"。使用 Object.getPrototypeOf() 可以方便地取得一个对象的原型，而这在通过原型实现继承时显得尤为重要 (本章后面会介绍) 

Object 类型还有一个 setPrototypeOf() 方法，可以向实例的私有特性 [[Prototype]] 写入一个新值。这样就可以重写一个对象的原型继承关系：

```js
let biped = { 
  numLegs: 2 
};

let person = { 
  name: 'Matt' 
};

Object.setPrototypeOf(person, biped); 
console.log(person.name); // Matt 
console.log(person.numLegs); // 2 
console.log(Object.getPrototypeOf(person) === biped); // true
```

> 警告 Object.setPrototypeOf()可能会严重影响代码性能。Mozilla 文档说得很清楚：“在所有浏览器和 JavaScript 引擎中，修改继承关系的影响都是微妙且深远的。这种影响并不仅是执行 Object.setPrototypeOf() 语句那么简单，而是会涉及所有访问了那些修改过 [[Prototype]] 的对象的代码。”

为避免使用 Object.setPrototypeOf() 可能造成的性能下降，可以通过 Object.create() 来创建一个新对象，同时为其指定原型：

```js
let biped = { 
  numLegs: 2 
};

let person = Object.create(biped);
person.name = 'Matt';
console.log(person.name); // Matt
console.log(person.numLegs); // 2
console.log(Object.getPrototypeOf(person) === biped); // true
```

#### 原型层级

在通过对象访问属性时，会按照这个属性的名称开始搜索。搜索开始于对象实例本身。如果在这个实例上发现了给定的名称，则返回该名称对应的值。如果没有找到这个属性，则搜索会沿着指针进入原型对象，然后在原型对象上找到属性后，再返回对应的值。

> constructor 属性只存在于原型对象，因此通过实例对象也是可以访问到的

虽然可以通过实例读取原型对象上的值，但不可能通过实例重写这些值。如果在实例上添加了一个与原型对象中同名的属性，那就会在实例上创建这个属性，这个属性会遮住原型对象上的属性

```js
function Person() {}

Person.prototype.name = "Nicholas"; 
Person.prototype.age = 29; 
Person.prototype.job = "Software Engineer"; 
Person.prototype.sayName = function() { 
  console.log(this.name); 
};

let person1 = new Person(); 
let person2 = new Person(); 
person1.name = "Greg"; 
console.log(person1.name); // "Greg"，来自实例
console.log(person2.name); // "Nicholas"，来自原型
```

只要给对象实例添加一个属性，这个属性就会遮蔽 原型对象上的同名属性，也就是虽然不会修改它，但会屏蔽对它的访问。即使在实例上把这个属性设置为 null，也不会恢复它和原型的联系。不过，使用 delete 操作符可以完全删除实例上的这个属性，从而让标识符解析过程能够继续搜索原型对象

```js
function Person() {} 
Person.prototype.name = "Nicholas"; 
Person.prototype.age = 29; 
Person.prototype.job = "Software Engineer"; 
Person.prototype.sayName = function() { 
  console.log(this.name); 
};

let person1 = new Person(); 
let person2 = new Person(); 
person1.name = "Greg"; 
console.log(person1.name); // "Greg"，来自实例
console.log(person2.name); // "Nicholas"，来自原型
delete person1.name; 
console.log(person1.name); // "Nicholas"，来自原型
```

hasOwnProperty()方法用于确定某个属性是在实例上还是在原型对象上。这个方法是继承自 Object 的，会在属性存在于调用它的对象实例上时返回 true

```js
function Person() {} 
Person.prototype.name = "Nicholas";
Person.prototype.age = 29; 
Person.prototype.job = "Software Engineer"; 
Person.prototype.sayName = function() { 
  console.log(this.name); 
};

let person1 = new Person(); 
let person2 = new Person(); 
console.log(person1.hasOwnProperty("name")); // false 
person1.name = "Greg"; 
console.log(person1.name); // "Greg"，来自实例
console.log(person1.hasOwnProperty("name")); // true

console.log(person2.name); // "Nicholas"，来自原型
console.log(person2.hasOwnProperty("name")); // false 
delete person1.name; 
console.log(person1.name); // "Nicholas"，来自原型
console.log(person1.hasOwnProperty("name")); // false
```

<img src="https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202401241411241.png" alt="image-20240124141134869" style="zoom:67%;" />

> ECMAScript 的 Object.getOwnPropertyDescriptor()方法只对实例属性有效。要取得原型属性的描述符，就必须直接在原型对象上调用 Object.getOwnPropertyDescriptor()

#### 原型和 in 操作符

有两种方式使用 in 操作符：单独使用和在 for-in 循环中使用。在单独使用时，in 操作符会在可以通过对象访问指定属性时返回 true，无论该属性是在实例上还是在原型上。来看下面的例子：

```js
function Person() {} 
Person.prototype.name = "Nicholas"; 
Person.prototype.age = 29; 
Person.prototype.job = "Software Engineer"; 
Person.prototype.sayName = function() { 
  console.log(this.name); 
};

let person1 = new Person(); 
let person2 = new Person(); 
console.log(person1.hasOwnProperty("name")); // false 
console.log("name" in person1); // true

person1.name = "Greg"; 
console.log(person1.name); // "Greg"，来自实例
console.log(person1.hasOwnProperty("name")); // true 
console.log("name" in person1); // true

console.log(person2.name); // "Nicholas"，来自原型
console.log(person2.hasOwnProperty("name")); // false 
console.log("name" in person2); // true

delete person1.name;
console.log(person1.name); // "Nicholas"，来自原型
console.log(person1.hasOwnProperty("name")); // false
console.log("name" in person1); // true
```

如果要确定某个属性是否存在于原型上，则可以像下面这样同时使用 hasOwnProperty() 和 in 操作符：

```js
function hasPrototypeProperty(object, name){ 
  return !object.hasOwnProperty(name) && (name in object); 
}
```

只要通过对象可以访问，in 操作符就返回 true，而 hasOwnProperty() 只有属性存在于实例上时才返回 true。因此，只要 in 操作符返回 true 且 hasOwnProperty() 返回 false，就说明该属性是一个原型属性

for-in 循环中使用 in 操作符时，可以通过对象访问且可以被枚举的属性都会返回，包括实例属性和原型属性。遮蔽原型中不可枚举（[[Enumerable]]特性被设置为 false）属性的实例属性也会在 for-in 循环中返回，因为默认情况下开发者定义的属性都是可枚举的。

要获得对象上所有可枚举的实例属性，可以使用 Object.keys()方法。这个方法接收一个对象作为参数，返回包含该对象所有可枚举属性名称的字符串数组。比如：

```js
function Person() {}
Person.prototype.name = "Nicholas";
Person.prototype.age = 29;
Person.prototype.job = "Software Engineer";
Person.prototype.sayName = function() {
  console.log(this.name);
};

let keys = Object.keys(Person.prototype); 
console.log(keys); // "name,age,job,sayName" 
let p1 = new Person(); 
p1.name = "Rob"; 
p1.age = 31; 
let p1keys = Object.keys(p1); 
console.log(p1keys); // "[name,age]"
```

这是正常情况下通过 for-in 返回的顺序。而在 Person 的实例上调用时，Object.keys() 返回的数组中只包含 "name"和 "age" 两个属性。

如果想列出所有实例属性，无论是否可以枚举，都可以使用 Object.getOwnPropertyNames()：

```js
let keys = Object.getOwnPropertyNames(Person.prototype);
console.log(keys); // "[constructor,name,age,job,sayName]"
```

注意，返回的结果中包含了一个不可枚举的属性 constructor。Object.keys() 和 Object.getOwnPropertyNames() 在适当的时候都可用来代替 for-in 循环。

#### 属性枚举顺序

for-in 循环、Object.keys()、Object.getOwnPropertyNames()、Object.getOwnPropertySymbols() 以及 Object.assign() 在属性枚举顺序方面有区别。ES2015 规范已将对象自身属性的枚举顺序确定为：数值键按升序，字符串键和符号键按插入顺序——Object.keys()、Object.getOwnPropertyNames()、JSON.stringify() 等都遵循该顺序。for-in 因为要沿原型链枚举，规范未强制其顺序，但主流引擎在实践中同样按“数值键升序、字符串键按插入顺序”执行。

Object.getOwnPropertyNames()、Object.getOwnPropertySymbols() 和 Object.assign() 的枚举顺序是确定性的。先以升序枚举数值键，然后以插入顺序枚举字符串和符号键。在对象字面量中定义的键以它们逗号分隔的顺序插入

```js
let k1 = Symbol('k1'),k2 = Symbol('k2');

let o = { 
  1: 1, 
  first: 'first', 
  [k1]: 'sym2', 
  second: 'second', 
  0: 0 
}; 

o[k2] = 'sym2'; 
o[3] = 3; 
o.third = 'third'; 
o[2] = 2; 
console.log(Object.getOwnPropertyNames(o)); 
// ["0", "1", "2", "3", "first", "second", "third"]

console.log(Object.getOwnPropertySymbols(o)); 
// [Symbol(k1), Symbol(k2)]
```

## 继承

继承是面向对象编程中讨论最多的话题。很多面向对象语言都支持两种继承：接口继承和实现继承。前者只继承方法签名，后者继承实际的方法。接口继承在 ECMAScript 中是不可能的，因为函数没有签名。实现继承是 ECMAScript 唯一支持的继承方式，而这主要是通过原型链实现的

### 原型链

ECMA-262 把原型链定义为 ECMAScript 的主要继承方式。其基本思想就是通过原型继承多个引用类型的属性和方法。重温一下构造函数、原型和实例的关系：每个构造函数都有一个原型对象，原型有一个属性指回构造函数，而实例有一个内部指针指向原型。如果原型是另一个类型的实例呢？那就意味着这个原型本身有一个内部指针指向另一个原型，相应地另一个原型也有一个指针指向另一个构造函数。这样就在实例和原型之间构造了一条原型链。这就是原型链的基本构想。

实现原型链涉及如下代码模式：

```js
function SuperType() { 
  this.property = true; 
}

SuperType.prototype.getSuperValue = function() { 
  return this.property; 
};

function SubType() { 
  this.subproperty = false; 
}

// 继承 SuperType 
SubType.prototype = new SuperType(); 
SubType.prototype.getSubValue = function () {
  return this.subproperty; 
};

let instance = new SubType(); 
console.log(instance.getSuperValue()); // true
```

![image-20240124145447137](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202401241454704.png)

实现继承的关键，是 SubType 没有使用默认原型，而是将其替换成了一个新的对象。这个新的对象恰好是 SuperType 的实例。这样一来，SubType 的实例不仅能从 SuperType 的实例中继承属性和方法，而且还与 SuperType 的原型挂上了钩。于是 instance（通过内部的[[Prototype]]）指向 SubType.prototype，而 SubType.prototype（作为 SuperType 的实例又通过内部的[[Prototype]]）指向 SuperType.prototype。注意，getSuperValue() 方法还在 SuperType.prototype 对象上，而 property 属性则在 SubType.prototype 上。这是因为 getSuperValue() 是一个原型方法，而 property 是一个实例属性。SubType.prototype 现在是 SuperType 的一个实例，因此 property 才会存储在它上面。还要注意，由于 SubType.prototype 的 constructor 属性被重写为指向 SuperType，所以 instance.constructor 也指向 SuperType。

#### 默认原型

实际上，原型链中还有一环。默认情况下，所有引用类型都继承自 Object，这也是通过原型链实现的。任何函数的默认原型都是一个 Object 的实例，这意味着这个实例有一个内部指针指向 Object.prototype。这也是为什么自定义类型能够继承包括 toString()、valueOf()在内的所有默认方法的原因。因此前面的例子还有额外一层继承关系

![image-20240124145917839](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202401241459789.png)

SubType 继承 SuperType，而 SuperType 继承 Object。在调用 instance.toString()时，实际上调用的是保存在 Object.prototype 上的方法。

#### 原型与继承关系

原型与实例的关系可以通过两种方式来确定。第一种方式是使用 instanceof 操作符，如果一个实例的原型链中出现过相应的构造函数，则 instanceof 返回 true。如下例所示：

```js
console.log(instance instanceof Object); // true
console.log(instance instanceof SuperType); // true
console.log(instance instanceof SubType); // true
```

从技术上讲，instance 是 Object、SuperType 和 SubType 的实例，因为 instance 的原型链中包含这些构造函数的原型。结果就是 instanceof 对所有这些构造函数都返回 true

```js
console.log(Object.prototype.isPrototypeOf(instance)); // true
console.log(SuperType.prototype.isPrototypeOf(instance)); // true
console.log(SubType.prototype.isPrototypeOf(instance)); // true
```

#### 关于方法

子类有时候需要覆盖父类的方法，或者增加父类没有的方法。为此，这些方法必须在原型赋值之后再添加到原型上

```js
function SuperType() { 
  this.property = true;
}

SuperType.prototype.getSuperValue = function() { 
  return this.property;
};

function SubType() { 
  this.subproperty = false;
}

// 继承 SuperType 
SubType.prototype = new SuperType(); 
// 新方法
SubType.prototype.getSubValue = function () { 
  return this.subproperty; 
};

// 覆盖已有的方法
SubType.prototype.getSuperValue = function () { 
  return false;
}; 
let instance = new SubType();
console.log(instance.getSuperValue()); // false
```

另一个要理解的重点是，以对象字面量方式创建原型方法会破坏之前的原型链，因为这相当于重写了原型链

```js
function SuperType() { 
  this.property = true;
}

SuperType.prototype.getSuperValue = function() { 
  return this.property;
};

function SubType() {
  this.subproperty = false;
}

// 继承 SuperType 
SubType.prototype = new SuperType();

// 通过对象字面量添加新方法，这会导致上一行无效
SubType.prototype = { 
  getSubValue() { 
    return this.subproperty; 
  }, 
  someOtherMethod() { 
    return false; 
  } 
}; 
let instance = new SubType(); 
console.log(instance.getSuperValue()); // 出错！
```

子类的原型在被赋值为 SuperType 的实例后，又被一个对象字面量覆盖了。覆盖后的原型是一个 Object 的实例，而不再是 SuperType 的实例。因此之前的原型链就断了。SubType 和 SuperType 之间也没有关系了

#### 原型链问题

原型链虽然是实现继承的强大工具，但它也有问题。主要问题出现在原型中包含引用值的时候。前面在谈到原型的问题时也提到过，原型中包含的引用值会在所有实例间共享，这也是为什么属性通常会在构造函数中定义而不会定义在原型上的原因。在使用原型实现继承时，原型实际上变成了另一个类型的实例。这意味着原先的实例属性摇身一变成为了原型属性。下面的例子揭示了这个问题：

```js
function SuperType() { 
  this.colors = ["red", "blue", "green"]; 
}

function SubType() {}

// 继承 SuperType 
SubType.prototype = new SuperType();

let instance1 = new SubType();
instance1.colors.push("black");
console.log(instance1.colors); // "red,blue,green,black"

let instance2 = new SubType();
console.log(instance2.colors); // "red,blue,green,black"
```

原型链的第二个问题是，子类型在实例化时不能给父类型的构造函数传参。事实上，我们无法在不影响所有对象实例的情况下把参数传进父类的构造函数。再加上之前提到的原型中包含引用值的问题，就导致原型链基本不会被单独使用

### 盗用构造函数

为了解决原型包含引用值导致的继承问题，一种叫作“盗用构造函数”（constructor stealing）的技术在开发社区流行起来（这种技术有时也称作“对象伪装”或“经典继承”）。基本思路很简单：在子类构造函数中调用父类构造函数。因为毕竟函数就是在特定上下文中执行代码的简单对象，所以可以使用 apply() 和 call() 方法以新创建的对象为上下文执行构造函数。来看下面的例子：

```js
function SuperType() {
  this.colors = ["red", "blue", "green"];
}

function SubType() {
  // 继承 SuperType
  SuperType.call(this);
}

let instance1 = new SubType(); 
instance1.colors.push("black"); 
console.log(instance1.colors); // "red,blue,green,black"

let instance2 = new SubType();
console.log(instance2.colors); // "red,blue,green"
```

示例中加粗的代码展示了盗用构造函数的调用。通过使用 call()（或 apply()）方法，SuperType构造函数在为 SubType 的实例创建的新对象的上下文中执行了。这相当于新的 SubType 对象上运行了 SuperType() 函数中的所有初始化代码。结果就是每个实例都会有自己的 colors 属性

#### 传递参数

相比于使用原型链，盗用构造函数的一个优点就是可以在子类构造函数中向父类构造函数传参

```js
function SuperType(name){ 
  this.name = name; 
} 
function SubType() { 
  // 继承 SuperType 并传参
  SuperType.call(this, "Nicholas"); 
  // 实例属性
  this.age = 29; 
} 
let instance = new SubType(); 
console.log(instance.name); // "Nicholas"; 
console.log(instance.age); // 29
```

#### 盗用构造函数的问题

盗用构造函数的主要缺点，也是使用构造函数模式自定义类型的问题：必须在构造函数中定义方法，因此函数不能重用。此外，子类也不能访问父类原型上定义的方法，因此所有类型只能使用构造函数模式。由于存在这些问题，盗用构造函数基本上也不能单独使用

### 组合继承

组合继承（有时候也叫伪经典继承）综合了原型链和盗用构造函数，将两者的优点集中了起来。基本的思路是使用原型链继承原型上的属性和方法，而通过盗用构造函数继承实例属性。这样既可以把方法定义在原型上以实现重用，又可以让每个实例都有自己的属性

```js
function SuperType(name){ 
  this.name = name; 
  this.colors = ["red", "blue", "green"]; 
}

SuperType.prototype.sayName = function() { 
  console.log(this.name); 
};

function SubType(name, age){ 
  // 继承属性
  SuperType.call(this, name); 
  this.age = age; 
}

// 继承方法
SubType.prototype = new SuperType(); 
SubType.prototype.sayAge = function() { 
  console.log(this.age); 
}; 

let instance1 = new SubType("Nicholas", 29); 
instance1.colors.push("black"); 
console.log(instance1.colors); // "red,blue,green,black"

instance1.sayName(); // "Nicholas";
instance1.sayAge(); // 29

let instance2 = new SubType("Greg", 27); 
console.log(instance2.colors); // "red,blue,green"
instance2.sayName(); // "Greg"; 
instance2.sayAge(); // 27
```

组合继承弥补了原型链和盗用构造函数的不足，是 JavaScript 中使用最多的继承模式。而且组合继承也保留了 instanceof  操作符和 isPrototypeOf() 方法识别合成对象的能力

### 原型式继承

2006 年，Douglas Crockford 写了一篇文章：《JavaScript 中的原型式继承》（“Prototypal Inheritance in JavaScript”）。这篇文章介绍了一种不涉及严格意义上构造函数的继承方法。他的出发点是即使不自定义类型也可以通过原型实现对象之间的信息共享。文章最终给出了一个函数：

```js
function object(o) { 
  function F() {}
  F.prototype = o;
  return new F();
} 
```

这个 object() 函数会创建一个临时构造函数，将传入的对象赋值给这个构造函数的原型，然后返回这个临时类型的一个实例。本质上，object() 是对传入的对象执行了一次浅复制。来看下面的例子：

```js
let person = { 
  name: "Nicholas",
  friends: ["Shelby", "Court", "Van"]
};

let anotherPerson = object(person);
anotherPerson.name = "Greg";
anotherPerson.friends.push("Rob");

let yetAnotherPerson = object(person); 
yetAnotherPerson.name = "Linda"; 
yetAnotherPerson.friends.push("Barbie"); 
console.log(person.friends); // "Shelby,Court,Van,Rob,Barbie"
```

Crockford 推荐的原型式继承适用于这种情况：你有一个对象，想在它的基础上再创建一个新对象。你需要把这个对象先传给 object()，然后再对返回的对象进行适当修改。在这个例子中，person 对象定义了另一个对象也应该共享的信息，把它传给 object()之后会返回一个新对象。这个新对象的原型是 person，意味着它的原型上既有原始值属性又有引用值属性。这也意味着 person.friends 不仅是 person 的属性，也会跟 anotherPerson 和 yetAnotherPerson 共享。这里实际上克隆了两个 person。

ECMAScript 5 通过增加 Object.create() 方法将原型式继承的概念规范化了。这个方法接收两个参数：作为新对象原型的对象，以及给新对象定义额外属性的对象（第二个可选）。在只有一个参数时，Object.create() 与这里的 object() 方法效果相同：

```js
let person = { 
  name: "Nicholas", 
  friends: ["Shelby", "Court", "Van"] 
}; 
let anotherPerson = Object.create(person); 
anotherPerson.name = "Greg"; 
anotherPerson.friends.push("Rob"); 
let yetAnotherPerson = Object.create(person); 
yetAnotherPerson.name = "Linda"; 
yetAnotherPerson.friends.push("Barbie"); 
console.log(person.friends); // "Shelby,Court,Van,Rob,Barbie"
```

Object.create() 的第二个参数与 Object.defineProperties()的第二个参数一样：每个新增属性都通过各自的描述符来描述。以这种方式添加的属性会遮蔽原型对象上的同名属性。比如：

```js
let person = { 
  name: "Nicholas", 
  friends: ["Shelby", "Court", "Van"] 
}; 

let anotherPerson = Object.create(person, {
  name: {
    value: "Greg"
  }
});

console.log(anotherPerson.name); // "Greg" 
```

原型式继承非常适合不需要单独创建构造函数，但仍然需要在对象间共享信息的场合。但要记住，属性中包含的引用值始终会在相关对象间共享，跟使用原型模式是一样的

### 寄生式继承

与原型式继承比较接近的一种继承方式是寄生式继承（parasitic inheritance），也是 Crockford 首倡的一种模式。寄生式继承背后的思路类似于寄生构造函数和工厂模式：创建一个实现继承的函数，以某种方式增强对象，然后返回这个对象。基本的寄生继承模式如下：

```js
function createAnother(original){ 
  let clone = object(original); // 通过调用函数创建一个新对象
  clone.sayHi = function() { // 以某种方式增强这个对象
    console.log("hi"); 
  }; 
  return clone; // 返回这个对象
} 
```

在这段代码中，createAnother() 函数接收一个参数，就是新对象的基准对象。这个对象 original 会被传给 object()函数，然后将返回的新对象赋值给 clone。接着给 clone 对象添加一个新方法sayHi()。最后返回这个对象。可以像下面这样使用 createAnother() 函数：

```js
let person = {
  name: "Nicholas",
  friends: ["Shelby", "Court", "Van"]
};

let anotherPerson = createAnother(person);
anotherPerson.sayHi(); // "hi"
```

基于 person 对象返回了一个新对象。新返回的 anotherPerson 对象具有 person 的所有属性和方法，还有一个新方法叫 sayHi()。

寄生式继承同样适合主要关注对象，而不在乎类型和构造函数的场景。object() 函数不是寄生式继承所必需的，任何返回新对象的函数都可以在这里使用。

> 通过寄生式继承给对象添加函数会导致函数难以重用，与构造函数模式类似

### 寄生式组合继承

组合继承其实也存在效率问题。最主要的效率问题就是父类构造函数始终会被调用两次：一次是在创建子类原型时调用，另一次是在子类构造函数中调用。本质上，子类原型最终是要包含超类对象的所有实例属性，子类构造函数只要在执行时重写自己的原型就行了。再来看一看这个组合继承的例子：

```js
function SuperType(name) { 
  this.name = name;
  this.colors = ["red", "blue", "green"];
}

SuperType.prototype.sayName = function() { 
  console.log(this.name); 
};

function SubType(name, age){ 
  SuperType.call(this, name); // 第二次调用 SuperType() 
  this.age = age; 
}

SubType.prototype = new SuperType(); // 第一次调用 SuperType() 
SubType.prototype.constructor = SubType; 
SubType.prototype.sayAge = function() { 
  console.log(this.age); 
};
```

在上面的代码执行后，SubType.prototype 上会有两个属性：name 和 colors。它们都是 SuperType 的实例属性，但现在成为了 SubType 的原型属性。在调用 SubType 构造函数时，也会调用 SuperType 构造函数，这一次会在新对象上创建实例属性 name 和 colors。这两个实例属性会遮蔽原型上同名的属性。

![image-20240124155758247](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202401241557959.png)

![image-20240124160021066](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202401241600388.png)

如上图所示，有两组 name 和 colors 属性：一组在实例上，另一组在 SubType 的原型上。这是调用两次 SuperType 构造函数的结果。好在有办法解决这个问题。

寄生式组合继承通过盗用构造函数继承属性，但使用混合式原型链继承方法。基本思路是不通过调用父类构造函数给子类原型赋值，而是取得父类原型的一个副本。说到底就是使用寄生式继承来继承父类原型，然后将返回的新对象赋值给子类原型。寄生式组合继承的基本模式如下所示：

```js
function inheritPrototype(subType, superType) {
  let prototype = object(superType.prototype); // 创建对象
  prototype.constructor = subType; // 增强对象
  subType.prototype = prototype; // 赋值对象
}
```

这个 inheritPrototype() 函数实现了寄生式组合继承的核心逻辑。这个函数接收两个参数：子类构造函数和父类构造函数。在这个函数内部，第一步是创建父类原型的一个副本。然后，给返回的 prototype 对象设置 constructor 属性，解决由于重写原型导致默认 constructor 丢失的问题。最后将新创建的对象赋值给子类型的原型。如下例所示，调用 inheritPrototype()就可以实现前面例子中的子类型原型赋值：

```js
function SuperType(name) { 
  this.name = name; 
  this.colors = ["red", "blue", "green"]; 
} 

SuperType.prototype.sayName = function() { 
  console.log(this.name); 
}; 

function SubType(name, age) { 
  SuperType.call(this, name); 
  this.age = age; 
} 

inheritPrototype(SubType, SuperType);

SubType.prototype.sayAge = function() { 
  console.log(this.age); 
}; 
```

这里只调用了一次 SuperType 构造函数，避免了 SubType.prototype 上不必要也用不到的属性，因此可以说这个例子的效率更高。而且，原型链仍然保持不变，因此 instanceof 操作符和 isPrototypeOf() 方法正常有效。寄生式组合继承可以算是引用类型继承的最佳模式。
