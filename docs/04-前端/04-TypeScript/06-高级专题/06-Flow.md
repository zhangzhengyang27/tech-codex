---
title: "flow"
description: Flow 静态类型检查工具入门：类型推断与类型注解、常见类型注释（数组/类/对象/Null）、安装与去除注解的两种方式、mixed/any 与运行环境 API 类型支持
category: TypeScript
---

# flow

[Flow](https://flow.org/en/docs/getting-started/) 是 Facebook 出品的 JavaScript 静态类型检查工具。Vue2 的源码利用了 Flow 做了静态类型检查，所以了解 Flow 有助于我们阅读源码

JavaScript 是动态类型语言，它的灵活性有目共睹，但是过于灵活的副作用是很容易就写出非常隐蔽的隐患代码，在编译期甚至看上去都不会报错，但在运行阶段就可能出现各种奇怪的 bug

类型检查是当前动态类型语言的发展趋势，所谓类型检查，就是在编译期尽早发现（由类型错误引起的）bug，又不影响代码运行（不需要运行时动态检查类型），使编写 JavaScript 具有和编写 Java 等强类型语言相近的体验

## Flow 的工作方式

通常类型检查分成 2 种方式：

-  **类型推断**：通过变量的使用上下文来推断出变量类型，然后根据这些推断来检查类型

-  **类型注释**：事先注释好我们期待的类型，Flow 会基于这些注释来判断

### 类型推断

它不需要任何代码修改即可进行类型检查，最小化开发者的工作量。它不会强制你改变开发习惯，因为它会自动推断出变量的类型。这就是所谓的类型推断，Flow 最重要的特性之一

```javascript
/*@flow*/

function split(str) {
  return str.split(' ')
}

split(11)
```

Flow 检查上述代码后会报错，因为函数 `split`  期待的参数是字符串，而我们输入了数字

### 类型注释

类型推断是 Flow 最有用的特性之一，不需要编写类型注释就能获取有用的反馈。但在某些特定的场景下，添加类型注释可以提供更好更明确的检查依据

```javascript
/*@flow*/

function add(x, y){
  return x + y
}

add('Hello', 11)
```

Flow 检查上述代码时检查不出任何错误，因为从语法层面考虑， `+` 既可以用在字符串上，也可以用在数字上，我们并没有明确指出 `add()` 的参数必须为数字

在这种情况下，我们可以借助类型注释来指明期望的类型。类型注释是以冒号 `:` 开头，可以在函数参数，返回值，变量声明中使用。如果我们在上段代码中添加类型注释，就会变成如下：

```javascript
/*@flow*/

function add(x: number, y: number): number {
  return x + y
}

add('Hello', 11)
```

现在 Flow 就能检查出错误，因为函数参数的期待类型为数字，而我们提供了字符串

上面的例子是针对函数的类型注释。接下来我们来看看 Flow 能支持的一些常见的类型注释

#### 数组

```javascript
/*@flow*/

var arr: Array<number> = [1, 2, 3]

arr.push('Hello')
```

数组类型注释的格式是 `Array<T>`，`T` 表示数组中每项的数据类型。在上述代码中，arr 是每项均为数字的数组。如果我们给这个数组添加了一个字符串，Flow 能检查出错误

#### 类和对象

```javascript
/*@flow*/

class Bar {
  x: string;           // x 是字符串
  y: string | number;  // y 可以是字符串或者数字
  z: boolean;

  constructor(x: string, y: string | number) {
    this.x = x
    this.y = y
    this.z = false
  }
}

var bar: Bar = new Bar('hello', 4)

var obj: { a: string, b: number, c: Array<string>, d: Bar } = {
  a: 'hello',
  b: 11,
  c: ['hello', 'world'],
  d: new Bar('hello', 3)
}
```

类的类型注释格式如上，可以对类自身的属性做类型检查，也可以对构造函数的参数做类型检查。这里需要注意的是，属性 `y` 的类型中间用 `|` 做间隔，表示 `y` 的类型即可以是字符串也可以是数字

对象的注释类型类似于类，需要指定对象属性的类型

#### Null

若想任意类型 `T` 可以为 `null` 或者 `undefined`，只需类似如下写成 `?T` 的格式即可

```javascript
/*@flow*/

var foo: ?string = null
```

此时，`foo` 可以为字符串，也可以为 `null`

目前我们只列举了 Flow 的一些常见的类型注释。如果想了解所有类型注释，请移步 Flow 的 [官方文档](https://flow.org/en/docs/types/)

## 类型系统

强类型和弱类型、静态类型和动态类型

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202309211746803.png)

### JavaScript 弱类型产生的问题

异常需要等到运行时才能发现

```javascript
const obj = {}

obj.foo()

setTimeout(() => {
  obj.foo()
}, 1000000)
```

函数功能可能发生改变

```javascript
function sum (a, b) {
  return a + b
}

console.log(sum(100, 100))     // 200
console.log(sum(100, '100'))  // 100100
console.log('100'-50)  // 50
```

对象索引器的错误用法，变量对象的重复声明

```javascript
const obj = {}

obj[true] = 100 // 属性名会自动转换为字符串

console.log(obj['true'])

// 变量重复声明
const obj = {}
```

### 强类型的优势

```javascript
// 1. 强类型代码错误更早暴露

// 2. 强类型代码更智能，编码更准确

function render (element) {
  element.className = 'container'
  element.innerHtml = 'hello world'
}

// 3. 重构更可靠
const util = {
  aaa: () => {
    console.log('util func')
  }
}

// 4. 减少了代码层面的不必要的类型判断
function sum (a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('arguments must be a number')
  }

  return a + b
}
```

## Flow 安装与使用

并不需要给每一个参数添加注解，可以在需要的参数上添加注解

```bash
# 初始化package
yarn init --yes 

# 安装 flow 插件
yarn add flow-bin --dev

# 初始化 .flowconfig 的配置文件
yarn flow init  

# 开启一个服务,校验参数
yarn flow 

# 关闭服务
yarn flow stop

# 去除注解的第一种方法
yarn add flow-remove-types --dev

# 第一个参数是要转换的目录，第二个是要输出的目录
yarn flow-remove-types . -d dist 

# 去除注解的第二种方法
yarn add @babel/core @babel/cli @babel/preset-flow

# 要在目录上添加.babelrc
# 第一个参数是要转换的目录，第二个是要输出的目录
yarn babel src -d dist  
```

需要添加 babel 的配置文件

```javascript
{
  "presets": ["@babel/preset-flow"]
}
```

### 使用

Flow Language Support 是官方提供的插件，可以提示错误

```javascript
// @flow
function sum (a: number, b: number) {
  return a + b
}

sum(100, 100)

// 运行 yarn flow 会报错 
sum('100', '100')
sum('100', 100)
```

### 类型推断

```javascript
/**
 * 类型推断
 *
 * @flow
 */

function square (n) {
  return n * n
}

// 即使没有添加注解，也会报错
square('100')  

square(100)
```

### 类型注解

```javascript
// @flow

function square (n: number) {
  return n * n
}

let num: number = 100

// num = 'string' // error

function foo (): number {
  return 100 // ok
  // return 'string' // error
}

function bar (): void {
  // return undefined
}
```

### 注解类型

#### 原始类型

```javascript
// @flow

const a: string = 'foobar'

const b: number = Infinity // NaN // 100

const c: boolean = false // true

const d: null = null

const e: void = undefined

const f: symbol = Symbol()
```

#### 其他有结构的数据

注解 数组里面字段的类型

```javascript
// @flow

// 数组类型
const arr1: Array<number> = [1, 2, 3]

const arr2: number[] = [1, 2, 3]

// 元组
const foo: [string, number] = ['foo', 100]
```

注解 对象里面的类型

```javascript
/**
 * 对象类型
 *
 * @flow
 */

const obj1: { foo: string, bar: number } = { foo: 'string', bar: 100 }

const obj2: { foo?: string, bar: number } = { bar: 100 }

const obj3: { [string]: string } = {}

obj3.key1 = 'value1'
obj3.key2 = 'value2'
```

注解 函数类型

```javascript
/**
 * 函数类型
 *
 * @flow
 */

function foo (callback: (string, number) => void) {
  callback('string', 100)
}

foo(function (str, n) {
  // str => string
  // n => number
})
```

#### 特殊类型

注解 字面量类型、声明类型、Maybe 类型

```javascript
// @flow

// 字面量类型  a变量只能存'foo'
const a: 'foo' = 'foo'

// type 只能存放这三种值之一
const type: 'success' | 'warning' | 'danger' = 'success'


// 声明类型
type StringOrNumber = string | number
const b: StringOrNumber = 'string' // 100


// Maybe 类型
const gender: ?number = undefined
// 相当于
// const gender: number | null | void = undefined
```

#### Mixed&Any

注解 Mixed 和 Any ，可以传入任意类型

```javascript
// @flow

// string | number | boolean | ....
function passMixed (value: mixed) {
  if (typeof value === 'string') {
    value.substr(1)
  }

  if (typeof value === 'number') {
    value * value
  }
}

passMixed('string')

passMixed(100)

// ---------------------------------
function passAny (value: any) {
  value.substr(1)

  value * value
}

passAny('string')

passAny(100)
```

### 类型小结

[flow官网](https://flow.org/en/docs/types/)

[类型手册](https://www.saltycrane.com/cheat-sheets/flow-type/latest/)

### 运行环境 API 的支持

内置对象

```javascript
/**
 * 运行环境 API
 *
 * @flow
 */

// 在浏览器环境获取 DOM 的类型注解
const element: HTMLElement | null = document.getElementById('app')
```