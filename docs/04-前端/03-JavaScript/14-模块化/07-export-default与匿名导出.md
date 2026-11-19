---
title: export-default与匿名导出
description: "从语言设计层面解析 export：导出的本质是“名字和值”、export default 导出的是值并以特殊名字 default 登记、匿名函数定义与匿名函数表达式的区别（f.name 为 default）。"
keywords: [export, export default, ESM, 匿名函数]
category: JavaScript
tags: [JavaScript, 模块化, ESM, export-default]
---


# export-default与匿名导出

## 概念说明

从 ECMAScript 6 开始，JavaScript 中出现了原生的模块技术。它对许多开发者来说曾经比较陌生，原因有两方面：一是出现较晚；二是普遍使用的 Node.js 环境带有自己内置的模块加载技术——ECMAScript 6 模块需要通过特定的命令行参数才能开启，应用一直不够广泛。

根本原因在于：**ECMAScript 6 模块是静态装配的，而传统的 Node.js 模块是动态加载的**。两种模块的实现效果与处理逻辑大相径庭，Node.js 无法在短期内提供有效手段帮助开发者将既有代码迁移到新的模块规范下。阻碍 ECMAScript 6 模块推广的是这些现实原因，而非模块技术本身是否成熟或设计好坏。

即便如此，ECMAScript 6 模块仍在 JavaScript 的大型应用库、包，以及对新规范更友好的项目中得到了不错的运用，尤其在使用转译器（例如 Babel）的项目中，开发者通常首选 ECMAScript 6 模块语法，因此它有着非常好的应用环境与前景。

## 导出的内容

JavaScript 中有且仅有六种声明语法，本质上 export 只能导出这六种声明语法所声明的标识符，并在导出时将它们统一称为"**名字**"。

语言设计中，"标识符"与"名字"是有语义差别的：export 将之称为名字，意味着这是一个标识符的子集。类似的子集还存在，例如"保留字是标识符名，但不能用作标识符（A reserved word is an IdentifierName that cannot be used as an Identifier）"。

在 JavaScript 语言设计上，除了预设的标点符号（大括号、运算符等）以及部分保留字和关键字之外，用户代码可以书写的只有三种东西：

- **标识符**：（通常是）一个名字
- **字面量**：表明由它的字面含义所决定的一个值
- **模板**：一个可计算结果的字符串值

在这个层面上解构一份 JavaScript 代码，能书写/声明的只有"**名字和值**"。这个结论非常关键：export 事实上就只能导出"名字和值"——而一旦它能导出"名字和值"，就意味着它能导出一个模块中的"全部内容"，因为"名字和值"正是所书写代码的全部。

## 静态代码与模块

上述结论针对的是纯粹的"语言设计"层面：在语言设计层面，代码就是文本，是没有应用逻辑的。所写的代码绝大多数是应用逻辑；去掉这些应用逻辑之后，剩下的纯粹的符号才是语言层面的"代码文本"。去掉执行逻辑所表达的行为、动作、结果和用户操作后的代码，就是**静态代码**。

ECMAScript 6 中的模块用来理解程序中的静态代码，也就是那些没有任何"生气"的字符和符号。因此它只能理解上述 6 种声明，以及它们声明出来的"名字和值"，再无其它。

## 解析 export

将所有 export 语法分类，只有两个大类：导出"名字"和导出"值"：

```javascript
// 导出“（声明的）名字”
export <let/const/var> x ...;
export function x() ...
export class x ...
export {x, y, z, ...};

// 导出“（重命名的）名字”
export { x as y, ...};
export { x as default, ... };

// 导出“（其它模块的）名字”
export ... from ...;

// 导出“值”
export default <expression>
```

导出声明的、重命名的和其它模块的名字这三种情况都比较容易理解：形成一个名字表，让外部模块能够查看即可。

最后一种"导出值"的形式则非常特殊：要导出一个模块的全部内容就必须导出"全部的名字和值"，然而纯粹的值没有名字，也就没法访问——这与"导出点什么东西"的概念矛盾。因此 ECMAScript 6 模块约定了一个称为 `default` 的名字，用于导出当前模块中的一个"值"。"值"是表达式的运算结果，所以语法形式是 `export default <expression>`：其中的 expression 用于求值，得到一个结果（Result）并导出为缺省的名字 `default`。

两个便利的情况：

其一，JavaScript 中一般的字面量也是值、也是单值表达式，导出字面量是合法的：

```javascript

export default 2; // as state of the module, etc.
export default "some messages"; // data or information...

```

其二，对象也是字面量、也是值、也是单值表达式，而对象成员可以组合其它任何数据，因此通过该语法几乎可以导出当前模块中全部的"值"（即任何可以导出的数据）：

```javascript

var varName = 100;
export default {
  varName,              // 直接导出名字
  propName: 123,        // 导出值
  funcName: function() { }, // 导出函数
  foo() {               // 或导出与主对象相关联的方法
    // method
  }
}

```

所以 `export default ...` 虽然简单，却是对"导出名字"的必要补充：用户既可以导出有名字的数据，也可以导出没有名字的数据——一个模块中所有的数据都可以被导出了。接下来是标题中的语法：

```javascript

export default function() {}

```

这个语法中 export 到底导出了什么？是名字，还是值？

## 导出语句的处理逻辑

讨论这个问题之前，需要先理解更关键的问题："export 如何导出名字"。关键之处在于：如果只是导出一个名字，它在"某个名字表"中做一个登记项就可以了——JavaScript 也确实是这样处理的。但实际使用时，名字还要绑定一个具体的值才可以使用。因此一个 export 必须理解为两个步骤：**导出一个名字**，以及**为上述名字绑定一个值**。这两个步骤与使用 `var x = 100` 声明变量的过程一致（六种声明在名字处理上是类似的）：

```javascript

export var x = 100;

```

导出时，先在"某个名字表"中登记一个"名字 x"——这是 JavaScript 在模块装载之前对 export 所做的全部工作。

从另一端（import 语句）的角度看，则多出来一个步骤。import 语句（例如 `import {x} from ...`）会：

1. （与 export 类似地）按照语法在当前模块中声明名字，例如上面的 `x`
2. 添加一个当前模块对目标模块的依赖项

有了第二步操作，JavaScript 就可以依据所有它在静态文本中发现的 `import` 语句形成模块依赖树，找到依赖树最顶端的根模块并尝试加载。

关键点：**在"模块 export/import"语法中，JavaScript 依赖 import 来形成依赖树，与 export 无关**。而且直到找到所有导入导出的名字、完成所有模块装配为止，没有任何一行用户的 JavaScript 代码被执行过——因为 export/import 过程中，源代码只被理解为静态的、没有逻辑的"代码文本"。既然"没有逻辑"，就不可能执行类似 `export default <expression>` 中的 expression（表达式就是程序的计算逻辑）。

由此得到第一个关键结论：**在处理 export/import 语句的全程，没有表达式被执行**。

## 导出名字与导出值的差异

回到这行语句：

```javascript

export default <expression>;

```

如果其中的 expression 在导入导出中完全不起作用（不执行），这行语句能做什么？事实上，它与直接"导出一个名字"没有任何区别，等同于：

```javascript

export var x = 100;

```

两者都只是导出一个名字：前者导出的是 `default` 这个特殊名字，后者导出的是变量名 `x`。它们都是确定的、符合语法规则的标识符，也可以表示为字符串的字面文本；作用完全一致——在"某个名字表"中添加一个登记项。

所以，**导出名字与导出值本质上并没有差异：在静态装配阶段，它们都只是表达为一个名字**。正如 `var x = 100;` 在执行阶段需要一个将"值 100"绑定给"变量 x（的引用）"的过程，`export default ...;` 语句也需要完全相同的过程：将它后面的表达式的结果值绑定给 `default` 这个名字。如果不这么做，"export default" 在语义上就无法实现导出名字 `default`——在静态装配阶段，名字 `default` 只是被初始化为一个"单次绑定的、未初始化的标识符"。

在语义上可以模拟这样一个过程：

```javascript

export default function() {}
// 类似于如下代码
//（但并不在当前模块中声明名字 "default"）
export var default = function() {}

```

进一步模拟 JavaScript 后续的装配过程，其实非常简单：找到并遍历模块依赖树的所有模块（这棵树是排序的），然后执行这些模块最顶层的代码（Top Level Module Evaluation）。执行到上述 `var default = ...`（或对应的 `export default ...`）语句时，执行后面的表达式，并将执行结果（Result）绑定给左侧的变量。直到所有模块的顶层代码执行完毕，所有的导出名字和它们的值也就必然绑定完成。同样，由于 import 的名字与 export 的名字只是映射关系，import 的名字所对应的值也就初始化完成。

由此得到第二个关键结论：**所谓模块的装配过程，就是执行一次顶层代码而已**。

## 匿名函数表达式的执行结果

接下来讨论语句中的 `function() {}` 这个匿名函数表达式。按照 JavaScript 的约定，匿名函数表达式可以理解为一个函数的"字面量（值）"。理解"字面量值"这个说法很有意义——它意味着**它没有名字**。"字面量（值）没有名字"意味着执行这个"单值表达式"不会在当前作用域中产生一个名字——即使这个函数是具名的，也必然如此。由此带来 JavaScript 中的经典示例：具名函数作为表达式时，名字在块级作用域中无意义：

```javascript

// 具名函数作为表达式
var x1 = function x2() { ... }
// 具名函数（声明）
function x3() { ... }

```

例子中 x1~x3 具有不同的语义：x2 不会在当前作用域（示例中是全局）中登记为名字。

回到本文主题，使用下面的语法导出一个匿名函数或一个具名函数：

```javascript

export default function() { }
export default function x() { }

```

这两种情况是不同的，但无论函数是否具名，都不可能在当前作用域中绑定给 `default` 这个名字、作为这个名字对应的值。这段处理逻辑被添加在语法 `ExportDeclaration : export default AnonymousFunctionDefinition ;` 的执行（Evaluation）处理过程中。

::: info 语法说明
ECMAScript 将这里导出的对象称为 _Expression_/AssignmentExpression，所谓 _AnonymousFunctionDefinition_ 是其中 _AssignmentExpression_ 的一个具体实例。
:::

也就是说：当执行这行声明时，如果后面的表达式是匿名函数声明，它将强制在当前作用域中登记为 `default` 这样一个特殊的名字，并在执行时绑定该匿名函数。因此，尽管语义上应将它登记为类似 `var default = ...` 所声明的名字，但事实上它被处理成了一个不可访问的中间名字，然后映射给该模块的"某个名字表"。

需要注意的是，这是一个**匿名函数定义（AnonymousFunctionDefinition）**，而不是一个**匿名函数表达式（Anonymous FunctionExpression）**。一般函数的语句被称为声明（或更严谨地称为宣告，Function Declarations）。匿名函数定义表述为 `aName = FunctionExpression` 或类似的语法风格——它可以用在一般的赋值表达式、变量声明的右操作数、对象声明的成员初始值等位置。在这些位置上，该函数表达式总是被关联给一个名字：一方面，这种关联不是严格意义上的"名字 -> 值"绑定语义；另一方面，当该函数关联给名字（`aName`）时，JavaScript 会反向处理该函数（作为对象 `f`）的属性 `f.name`，使该名字指向 `aName`。

由此得到第三个关键结论：**`export default function() {}` 在严格意义上并不是导出了一个匿名函数表达式，而是导出了一个匿名函数定义（Anonymous Function Definition）**。该匿名函数初始化时会绑定给左侧的名字 `default`，导致 `import f from ...` 之后访问 `f.name` 得到 "default" 这个名字。类似地，下面的代码也会得到 "default"：

```javascript

var obj = { "default": function() {}};console.log(obj.default.name); // "default"

```

## 知识补充

关于 export，还有一些补充的知识点：

- `export ...` 语句通常按它的词法声明来创建标识符，例如 `export var x = ...` 意味着在当前模块环境中创建的是一个变量，可以修改；但被导入时，在 `import` 语句所在的模块中它是一个常量，总是不可写的
- `export default ...` 没有显式约定名字 `default` 按 `let/const/var` 的哪一种创建，JavaScript 缺省将它创建成一个普通变量（var）。但即使在当前模块环境中，它事实上也不可写——因为无法访问一个命名为 "default" 的变量（它不是一个合法的标识符）
- 所谓匿名函数，仅仅是当它直接作为操作数（而不是具有"匿名函数定义"的语法结构）时，才是真正匿名的：

```javascript

console.log((function(){}).name); // ""

```

- 类表达式（包括匿名类表达式）在本质上就是函数，作为 default 导出时的性质与上面所讨论的一致
- 导出项（的名字）总是作为词法声明被声明在当前模块作用域中的，这意味着它不可删除，且不可重复导出——即使是用 `var x ...` 来声明，这个 `x` 也是在 _lexicalNames_ 中，而不是在 _varNames_ 中
- 所谓"某个名字表"，对 export 来说是模块的导出表；对 import 来说就是名字空间（名字空间是用户代码可以操作的组件，它映射自内部的模块导入名字表）。如果用户代码不使用 `import * as …` 语法创建名字空间，该名字表就只存在于 JavaScript 的词法分析过程中，而不会（并不必要）创建运行期的实例——它并不总是以实体形式存在
- 上述名字表简化了 ECMAScript 中对导入导出记录（ImportEntry/ExportEntry Record Fields）的理解，深入了解可阅读 ECMAScript 规范的相关章节
- 没有模块会导出（传统意义上的）main()：ECMAScript 为了维护模块的静态语义，把执行过程及其入口的定义交还给了引擎或宿主本身

## 思考题

本文需要重点复习三个关键结论的得出过程：

1. 在处理 export/import 语句的全程，没有表达式被执行
2. 所谓模块的装配过程，就是执行一次顶层代码而已
3. `export default function() {}` 导出的是匿名函数定义而非匿名函数表达式

在此基础上，建议思考：**为什么在 import 语句中会出现"变量提升"的效果？**

 ![img](https://static001.geekbang.org/resource/image/63/5d/63ad143f0298c68e25373a1e79e9ee5d.jpg)
