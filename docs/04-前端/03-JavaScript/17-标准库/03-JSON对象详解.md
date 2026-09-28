---
title: "JSON 对象"
description: "JSON 语法与 JavaScript 对象的差异、JSON.stringify 的过滤/缩进/toJSON 用法、JSON.parse 与还原函数，以及常用 JSON 工具。"
keywords: [JSON, stringify, parse, 序列化]
category: JavaScript
tags: [JavaScript, 标准库, JSON]
---

# JSON 对象

曾经有一段时间，XML 是互联网上传输结构化数据的事实标准。Web 服务的第一次浪潮很大程度上都是建立在 XML 之上的，突出的特点是服务器与服务器间通信。但是 XML 过于烦琐、冗长

2006 年，Douglas Crockford 把 JSON（JavaScript Object Notation，JavaScript 对象表示法）作为 IETF RFC 4627 提交给 IETF，而 JSON 的应用早在 2001 年就已经开始了。

JSON 是 JavaScript 的一个严格的子集，利用了 JavaScript 中的一些模式来表示结构化数据。与 XML 相比，JSON 是在 JavaScript 中读写结构化数据的更好的方式。因为可以把 JSON 直接传给 eval()，而且不必创建 DOM 对象

**关于 JSON，最重要的是要理解它是一种数据格式，不是一种编程语言。虽然具有相同的语法形式，但 JSON 并不从属于 JavaScript而且，并不是只有 JavaScript 才使用 JSON，毕竟 JSON 只是一种数据格式。很多编程语言都有针对 JSON 的解析器和序列化器**

## 语法

JSON 的语法支持表示 3 种类型的值

- 简单值：字符串、数值、布尔值和 null 可以在 JSON 中出现，就像在 JavaScript 中一样。特殊值 undefined 不可以
- 对象：第一种复杂数据类型，对象表示有序键/值对。每个值可以是简单值，也可以是复杂类型
- 数组：第二种复杂数据类型，数组表示可以通过数值索引访问的值的有序列表。数组的值可以是任意类型，包括简单值、对象，甚至其他数组

JSON 不支持变量、函数或对象实例，它就是一种表示结构化数据的格式，虽然与 JavaScript 中表示数据的某些语法相同，但它并不局限于 JavaScript 的范畴

### 简单值

JavaScript 字符串与 JSON 字符串的最大区别在于，**JSON 字符串必须使用双引号**（单引号会导致语法错误）

```js
"Hello world!"  // 有效的 json 值
```

布尔值和 null 也是有效的 JSON 形式。但是，在实际应用中，JSON 更多地用来表示更复杂的数据结构，而简单值只是整个数据结构中的一部分

### 对象

JSON 中的对象与 JavaScript 字面量稍微有一些不同。下面是一个 JavaScript 中的对象字面量：

```javascript
var person = { 
 name: "Nicholas", 
 age: 29 
};
```

JSON 中的对象要求给属性加引号。实际上，在 JavaScript 中，前面的对象字面量完全可以写成下面这样

```javascript
var object = { 
	"name": "Nicholas", 
	"age": 29 
};
```

JSON 表示上述对象的方式如下：

```javascript
{ 
 "name": "Nicholas", 
 "age": 29 
}
```

JS 对象与 JSON 对象的对比

1. 首先，没有声明变量（JSON 中没有变量的概念）
2. 其次，没有末尾的分号（因为这不是 JavaScript 语句，所以不需要分号）

```json
{ 
 "name": "Nicholas", 
 "age": 29, 
 "school": { 
 		"name": "Merrimack College", 
 		"location": "North Andover, MA" 
 	} 
}
```

### 数组

JSON 中的第二种复杂数据类型是数组。JSON 数组采用的就是 JavaScript 中的数组字面量形式

例如，下面是 JavaScript 中的数组字面量

```javascript
var values = [25, "hi", true];
```

在 JSON 中，可以采用同样的语法表示同一个数组

```javascript
[25, "hi", true]
```

同样要注意，JSON 数组也没有变量和分号。把数组和对象结合起来，可以构成更复杂的数据集合

```json
[ 
  { 
    "title": "Professional JavaScript", 
    "authors": [ "Nicholas C. Zakas" ], 
    "edition": 3, 
    "year": 2011 
  }, 
  { 
    "title": "Professional JavaScript", 
    "authors": [ "Nicholas C. Zakas" ], 
    "edition": 2, 
    "year": 2009 
  } 
]
```

## 解析与序列化

**JSON 之所以流行，拥有与 JavaScript 类似的语法并不是全部原因。更重要的一个原因是，可以把 JSON 数据结构解析为有用的 JavaScript 对象**

与 XML 数据结构要解析成 DOM 文档而且从中提取数据极为麻烦相比，JSON 可以解析为 JavaScript 对象的优势极其明显。在解析为 JavaScript 对象后，只需要下面一行简单的代码就可以取得第三本书的书名

```javascript
books[2].title
```

当然，这里是假设把解析 JSON 数据结构后得到的对象保存到了变量 books 中。再看看下面在 DOM结构中查找数据的代码

```javascript
doc.getElementsByTagName("book")[2].getAttribute("title")
```

看看这些多余的方法调用，就不难理解为什么 JSON 能得到 JavaScript 开发人员的热烈欢迎了。从此以后，JSON 就成了 Web 服务开发中交换数据的事实标准

早期的 JSON 解析器基本上就是使用 JavaScript 的 eval() 函数。由于 JSON 是 JavaScript 语法的子集，因此 eval() 函数可以解析、解释并返回 JavaScript 对象和数组

ECMAScript 5 对解析 JSON 的行为进行规范，定义了全局对象 JSON。在旧版本的浏览器中，使用 eval() 对 JSON 数据结构求值存在风险，因为可能会执行一些恶意代码

JSON 对象有两个方法：stringify() 和 parse()。**使用 JSON.stringify()把一个 JavaScript 对象序列化为一个 JSON 字符串**

默认情况下，JSON.stringify() 输出的 JSON 字符串不包含任何空格字符或缩进。

```json
{
  "title":"Professional JavaScript",
  "authors":["Nicholas C. Zakas"],
  "edition":3,
  "year":2011
}
```

在序列化 JavaScript 对象时，所有函数及原型成员都会被有意忽略，不体现在结果中。此外，**值为 undefined 的任何属性也都会被跳过。结果中最终都是值为有效 JSON 数据类型的实例属性**

将 JSON 字符串直接传递给 JSON.parse() 就可以得到相应的 JavaScript 值

```javascript
var bookCopy = JSON.parse(jsonText);
```

如果传给 JSON.parse() 的字符串不是有效的 JSON，该方法会抛出错误

### 序列化 JSON.stringify()

实际上，JSON.stringify() 除了要序列化的 JavaScript 对象外，还可以接收另外两个参数

1. 第一个参数是个过滤器，可以是一个数组，也可以是一个函数
2. 第二个参数是一个选项，表示是否在 JSON 字符串中保留缩进。单独或组合使用这两个参数，可以更全面深入地控制 JSON 的序列化

#### 过滤结果

##### 参数是数组

如果过滤器参数是数组，那么 JSON.stringify() 的结果中将只包含数组中列出的属性

```javascript
var book = { 
 "title": "Professional JavaScript", 
 "authors": [ "Nicholas C. Zakas" ], 
 	edition: 3,
 	year: 2011 
 }; 

var jsonText = JSON.stringify(book, ["title", "edition"]);

console.log(jsonText)  
// {"title":"Professional JavaScript","edition":3}
```

##### 参数是函数

如果第二个参数是函数，行为会稍有不同。传入的函数接收两个参数，属性（键）名和属性值。根据属性（键）名可以知道应该如何处理要序列化的对象中的属性。属性名只能是字符串，而在值并非键值对儿结构的值时，键名可以是空字符串。

为了改变序列化对象的结果，函数返回的值就是相应键的值。不过要注意，如果函数返回了undefined，那么相应的属性会被忽略

```javascript
var book = { 
 "title": "Professional JavaScript", 
 "authors": [ "Nicholas C. Zakas" ], 
 	edition: 3, 
 	year: 2011 
}; 

var jsonText = JSON.stringify(book, function(key, value){ 
 switch(key){ 
 		case "authors": 
 				return value.join(",") 
 		case "year": 
 				return 5000; 
 		case "edition": 
 				return undefined; 
 		default: 
 			return value; 
 	} 
});
```

最后，一定要提供 default 项，此时返回传入的值，以便其他值都能正常出现在结果中。实际上，第一次调用这个函数过滤器，传入的键是一个空字符串，而值就是 book 对象。序列化后的 JSON 字符串如下所示

```json
{"title":"Professional JavaScript","authors":"Nicholas C. Zakas","year":5000}
```

要序列化的对象中的每一个对象都要经过过滤器，因此数组中的每个带有这些属性的对象经过过滤之后，每个对象都只会包含"title"、"authors" 和 "year" 属性

可以将第二个参数抽离出一个函数

```javascript
function stripKeys(...keys) {
    return (key, value) => {
        if (keys.includes(key)) {
           return;
        }
        return value;
    };
}

const user = {
  "name": "John",
  "password": "12345",
  "age": 30,
  "gender": "male"
};

console.log(JSON.stringify(user, stripKeys('password', 'gender')))
// 输出结果：{"name":"John","age":30}
```

#### 字符串缩进

JSON.stringify() 方法的第三个参数用于控制结果中的缩进和空白符。如果这个参数是一个数值，那它表示的是每个级别缩进的空格数。

```javascript
var book = { 
 "title": "Professional JavaScript", 
 "authors": ["Nicholas C. Zakas"], 
 	edition: 3, 
 	year: 2011 
}; 

// 要在每个级别缩进 4 个空格
var jsonText = JSON.stringify(book, null, 4);
```

不知道读者注意到没有，JSON.stringify() 也在结果字符串中插入了换行符以提高可读性。只要传入有效的控制缩进的参数值，结果字符串就会包含换行符。（只缩进而不换行意义不大。）

如果缩进参数是一个字符串而非数值，则这个字符串将在 JSON 字符串中被用作缩进字符（不再使用空格）。在使用字符串的情况下，可以将缩进字符设置为制表符，或者两个短划线之类的任意字符

```javascript
var book = { 
 "title": "Professional JavaScript", 
 "authors": ["Nicholas C. Zakas"], 
 	edition: 3, 
 	year: 2011 
}; 
var jsonText = JSON.stringify(book, null, "--"); 

// 这样，jsonText 中的字符串将变成如下所示：

{ 
--"title": "Professional JavaScript", 
--"authors": [ 
----"Nicholas C. Zakas" 
--], 
--"edition": 3, 
--"year": 2011 
}
```

缩进字符串最长不能超过 10 个字符长。如果字符串长度超过了 10 个，结果中将只出现前 10 个字符

#### toJSON() 方法

有时候，JSON.stringify() 还是不能满足对某些对象进行自定义序列化的需求。在这些情况下，可以给对象定义 toJSON() 方法，返回其自身的 JSON 数据格式。原生 Date 对象有一个 toJSON() 方法，能够将 JavaScript的Date 对象自动转换成 ISO 8601日期字符串（与在 Date 对象上调用 toISOString() 的结果完全一样）。

可以为任何对象添加 toJSON()方法

```javascript
var book = { 
  "title": "Professional JavaScript", 
  "authors": [ 
    "Nicholas C. Zakas" 
  ], 
  edition: 3, 
  year: 2011, 
  toJSON: function(){ 
    return this.title; 
  } 
}; 

var jsonText = JSON.stringify(book);  

// "Professional JavaScript"
```

toJSON() 可以作为函数过滤器的补充，因此理解序列化的内部顺序十分重要。假设把一个对象传入 JSON.stringify()，序列化该对象的顺序如下

1. 如果存在 toJSON() 方法而且能通过它取得有效的值，则调用该方法。否则，返回对象本身。
2. 如果提供了第二个参数，应用这个函数过滤器。传入函数过滤器的值是第(1)步返回的值。
3. 对第(2)步返回的每个值进行相应的序列化。
4. 如果提供了第三个参数，执行相应的格式化。

无论是考虑定义 toJSON() 方法，还是考虑使用函数过滤器，亦或需要同时使用两者，理解这个顺序都是至关重要的

### 解析 JSON.parse()

JSON.parse() 方法也可以接收另一个参数，该参数是一个函数，将在每个键值对上调用。为了区别 JSON.stringify() 接收的替换（过滤）函数（replacer），这个函数被称为还原函数（reviver），但实际上这两个函数的签名是相同的——它们都接收两个参数，一个键和一个值，而且都需要返回一个值

如果还原函数返回 undefined，则表示要从结果中删除相应的键；如果返回其他值，则将该值插入到结果中。在将日期字符串转换为 Date 对象时，经常要用到还原函数

```javascript
var book = { 
  "title": "Professional JavaScript", 
  "authors": [ "Nicholas C. Zakas" ], 
  edition: 3, 
  year: 2011, 
  releaseDate: new Date(2011, 11, 1) 
}; 

var jsonText = JSON.stringify(book); 

var bookCopy = JSON.parse(jsonText, function(key, value){ 
  if (key == "releaseDate"){ 
    return new Date(value); 
  } else { 
    return value; 
  } 
}); 
console.log(bookCopy.releaseDate.getFullYear());  // 2011
```

以上代码先是为 book 对象新增了一个 releaseDate 属性，该属性保存着一个 Date 对象。这个对象在经过序列化之后变成了有效的 JSON 字符串，然后经过解析又在 bookCopy 中还原为一个 Date对象。

还原函数在遇到 "releaseDate" 键时，会基于相应的值创建一个新的 Date 对象。结果就是 bookCopy.releaseDate 属性中会保存一个 Date 对象。正因为如此，才能基于这个对象调用 getFullYear() 方法

### 异常操作

那如果 JSON 无效怎么办呢？比如缺少了逗号引号等，上面的两种方法都会抛出异常。建议在使用这两个方法时使用 try...catch 来包裹，也可以将其封装成一个函数

```javascript
let myJSON = {}
const json = '{"name": "zhangsan", "age": 18, "city": "beijing"}';

try {
  myJSON = JSON.parse(json);
} catch (e){
  console.error(e.message)
}
console.log(myJSON.name, myJSON.age);  // zhangsan 18
```

如果 JSON 操作时出现问题，这将确保应用程序不会因此中断

### 删除键值对

可以使用 delete 运算符来删除键值对

```javascript
const json = {"name": "zhangsan", "age": 18, "city": "beijing"};

delete json.city;
 
console.log(json);  // {name: 'zhangsan', age: 18}
```

## JSON 工具

推荐几个好用的 JSON 查看器

### JSON Hero

JSON Hero 是一个开源的、漂亮的 JSON 查看器，它提供了包含额外功能的干净美观的 UI，使阅读和理解 JSON 文件变得容易

- 以任何方式查看 JSON：列视图、树视图、编辑器视图等
- 自动推断字符串的内容并提供有用的预览
- 创建可用于验证 JSON 的推断 JSON 模式
- 快速扫描相关值以检查边缘情况
- 搜索您的 JSON 文件（键和值）
- 可使用键盘
- 具有路径支持的可轻松共享的 URL

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310070235626.png)

**Github**：https://github.com/jsonhero-io/jsonhero-web

### JSON Visio

JSON Visio 是一个 JSON 数据的可视化工具，它可以无缝地在图表上展示数据，而无需重组任何内容、直接粘贴或导入文件。

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310070235642.png)

**Github**：https://github.com/AykutSarac/jsonvisio.com

### JSON Viewer Pro

JSON Viewer Pro也是一个 Chrome 扩展程序，主要用于可视化 JSON 文件。其核心功能包括：

- 支持将 JSON 数据进行格式化，并使用属性或者图表进行展示；
- 使用面包屑深入遍历 JSON 属性； 
- 在输入区写入自定义 JSON； 
- 导入本地 JSON 文件；
- 使用上下文菜单下载 JSON 文件； 
- 网址过滤器； 
- 改变主题； 
- 自定义 CSS ；
- 复制属性和值；

输入界面如下：

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310070235728.png)

格式化之后：

![img](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202310070235758.png)

### 其他工具

- [JSONLint](https://jsonlint.com/)：JSON 数据的验证器
- [JSONedit](https://mb21.github.io/JSONedit/)：一个可视化 JSON 构建器，可以轻松构建具有不同数据类型的复杂 JSON 结构
- [JSON API](https://jsonapi.org/)：用于在 JSON 中构建 API 的规范
- [JSON Formatter](https://jsonformatter.org/)：用于验证、美化、缩小和转换 JSON 数据的在线工具
- [JSON Generator](https://extendsclass.com/json-generator.html)：生成随机 JSON 数据的在线工具
