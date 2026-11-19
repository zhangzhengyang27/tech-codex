---
title: Babel 的内置功能（上）
description: "讲解 babel 的内置功能：syntax/transform/proposal 三类插件与 preset 的关系、helper 的两种形态（注入 AST 的运行时函数与操作 AST 的工具函数）、runtime 包（corejs/regenerator/helper）的构成。"
keywords: [Babel, preset, helper, runtime]
category: tools
tags: [Babel, 编译, AST, 插件]
---


# Babel 的内置功能（上）

## 概念说明

babel 最开始的名字叫 6to5,主要做 es6 到 es5 语法的转换和 polyfill,后来在 4.0 时改名为 babel。虽然从 6to5 改名到了 babel,但做的事情并没有变:依然是从高版本语法和 API 转换成低版本的语法,并自动 polyfill 缺少的 API。

babel 实现这些功能依赖三类内置机制:插件与 preset 划定转换范围,helper 在插件间共享逻辑,runtime 提供运行时支撑。

## 核心要点

- 转换的第一步是明确"转换什么":划定一个集合放要转换的特性,再划定一个集合放转换到的目标特性,两者建立一一映射关系。
- 语法转换之外还有 API 的 polyfill(垫片):如 Array.prototype.find 这类 API 的兼容,不是转换语法,而是在环境中注入实现的 API。
- babel 插件需要转换的语法包括 es 标准语法、proposal 阶段的语法,以及 react(jsx)、flow、typescript 等特有语法。
- babel7 内置插件分为三类:@babel/plugin-syntax-xxx(让 parser 能解析对应语法)、@babel/plugin-transform-xxx(转换标准特性的 AST)、@babel/plugin-proposal-xxx(转换未加入标准的 proposal 特性)。
- preset 是插件的集合,可以动态确定包含的插件(如 preset-env 根据 targets 确定);babel6 的 preset-es2015/preset-es2016 在 babel7 统一为 @babel/preset-env。
- helper 分两种:注入到 AST 的运行时全局函数(在 @babel/helpers 包中,通过 this.addHelper 使用)与操作 AST 的工具函数(独立包如 @babel/helper-hoist-variables,需手动 require)。
- babel runtime 包含三部分:corejs(新 API 的 polyfill,分 2/3 两版,3 才实现实例方法的 polyfill)、regenerator(facebook 实现的 async 运行时库)、helper(语法转换用到的函数,如 _typeof、_extends)。

## 从插件到 preset

要实现转换,第一步要明确转换什么:划定一个集合放要转换的特性,再划定一个集合放转换到的目标特性,两者建立一一映射关系,就确定了要做哪些转换。

**示例:乘方运算符(exponentiation operator)**

乘方运算符用 Math.pow 来实现:

```javascript
let x = 10 ** 2;

x **= 3;
```

转换为:

```javascript
let x = Math.pow(10, 2);

x = Math.pow(x, 3);
```

**示例:class**

class 用 function、prototype 来实现:

```javascript
class Test {
  constructor(name) {
    this.name = name;
  }

  logger() {
    console.log("Hello", this.name);
  }
}
```

转换为:

```javascript
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var Test = (function() {
  function Test(name) {
    _classCallCheck(this, Test);

    this.name = name;
  }

  Test.prototype.logger = function logger() {
    console.log("Hello", this.name);
  };

  return Test;
})();
```

每一个语法都可以这样转换为低版本的语法;把所有这种高版本语法写的代码转换为低版本的,就实现了编译。

但只是转换并不能解决所有问题:涉及某个对象的 API,比如 Array.prototype.find,这种 API 的兼容需要的不是转换语法,而是在环境中注入实现的 API,也就是 polyfill(垫片)。所以 babel 做的事情除了语法转换外,还有 API 的 polyfill。

### 转换的语法范围

babel 插件需要转换的语法包括三类。

**es 标准语法**:[TC39](https://262.ecma-international.org/) 是制定 JavaScript 语言标准的组织,每年都会公布加入到语言标准的特性,如 [es2015](https://262.ecma-international.org/6.0)、es2016、es2017 等。这些是要转换的语言特性范围。babel6 时分别用 preset-es2015、preset-es2016 等来维护相应的 transform plugin,babel7 时改为 @babel/preset-env。

**proposal 阶段的语法**:语言特性从提出到标准会有一个过程,分为[几个阶段](https://tc39.es/process-document/):

- 阶段 0 - Strawman: 只是一个想法,可能用 babel plugin 实现
- 阶段 1 - Proposal: 值得继续的建议
- 阶段 2 - Draft: 建立 spec
- 阶段 3 - Candidate: 完成 spec 并且在浏览器实现
- 阶段 4 - Finished: 会加入到下一年的 es20xx spec

这些还未加入到语言标准的特性也需要支持。

**react、flow、typescript**:只转换 JavaScript 本身的 es spec 和 proposal 特性并不够,开发中还会用到 jsx、typescript、flow,babel 也需要支持。这些转换对应的 plugin 分别放在不同 preset 里:preset-jsx、preset-typescript、preset-flow。

### 三类内置插件

babel7 内置的实现上述特性的插件分为 syntax、transform、proposal 三类。

**syntax plugin**

syntax plugin 是在 parserOptions 中放入一个 flag,让 parser 知道要 parse 什么语法;最终的 parse 逻辑还是由 babel parser(babylon) 实现。一般 syntax plugin 都是这样的:

```javascript
import { declare } from "@babel/helper-plugin-utils";

export default declare(api => {
  api.assertVersion(7);

  return {
    name: "syntax-function-bind",

    manipulateOptions(opts, parserOpts) {
      parserOpts.plugins.push("functionBind");
    },
  };
});

```

这类插件的目的就是让 parser 能够正确地把对应语法解析成 AST。

**transform plugin**

transform plugin 是对 AST 的转换:各种 es20xx 语言特性、typescript、jsx 等的转换都在 transform plugin 里实现。

有时需要结合 syntax plugin 和 transform plugin:比如 typescript 语法的解析要使用 @babel/plugin-syntax-typescript 在 parserOptions 放入解析 typescript 语法的选项,然后使用 @babel/plugin-transform-typescript 来转换解析出的 typescript 对应的 AST。平时一般使用 @babel/preset-typescript,它对这两个插件做了封装。

**proposal plugin**

未加入语言标准的特性的 AST 转换插件叫 proposal plugin,其实它也是 transform plugin,为了和标准特性区分才这样命名。完成 proposal 特性的支持有时同样需要综合 syntax plugin 和 proposal plugin:比如 function bind(`::` 操作符)就需要同时使用 @babel/plugin-syntax-function-bind 和 @babel/plugin-proposal-function-bind。

总之,babel 内置的 plugin 就是 @babel/plugin-syntax-xxx、@babel/plugin-transform-xxx、@babel/plugin-proposal-xxx 三种。这样的 plugin 很多,所以又设计了 preset。

### preset

不同的目的需要不同的 babel 插件组合,preset 就是为此设计的:

- 不同版本的语言标准支持:preset-es2015、preset-es2016 等,babel7 后用 preset-env 代替
- 未加入标准的语言特性的支持:用于 stage0、stage1、stage2 的特性,babel7 后单独引入 proposal plugin
- react、jsx、flow 的支持:分别封装相应的插件为 preset-react、preset-jsx、preset-flow,直接使用对应 preset 即可

preset 是插件的集合,但它可以动态确定包含的插件,比如 preset-env 就是根据 targets 来确定插件。

## helper

每个特性的实现用一个 babel 插件实现;当 babel 插件多了,自然会有一些共同的逻辑。babel 为插件之间共享逻辑设计的机制就是 helper。

helper 分为两种:

- 一种是注入到 AST 的运行时用的全局函数
- 一种是操作 AST 的工具函数,比如变量提升这种通用逻辑

### 注入到 AST 的全局函数

注入到 AST 的运行时用的全局函数,例如:

```javascript
class Guang {}

```

会被转换成:

```javascript
function _classCallCheck(instance, Constructor) {
  //...
}

var Guang = function Guang() {
  _classCallCheck(this, Guang);
};
```

这里的 `_classCallCheck` 就是 helper。

这类 helper 数量比较多,babel7 有 80 多个,都在 @babel/helpers 里面。在插件里使用时,直接调用 `this.addHelper`,会在顶层作用域声明对应的 helper,然后返回对应的 identifier:

```javascript
var transformObjectSetPrototypeOfToAssign = declare(function (api) {
    api.assertVersion(7);
    return {
      name: "transform-object-set-prototype-of-to-assign",
      visitor: {
        CallExpression: function CallExpression(path) {
          if (path.get("callee").matchesPattern("Object.setPrototypeOf")) {
            path.node.callee = this.addHelper("defaults");
          }
        }
      }
    };
});
```

一般业务开发用不到这种 helper,主要是 babel 内部使用。这类 helper 用于"用低版本特性实现高版本特性",比如用 function 和 prototype 实现 class。

除了编译的时候注入 helper 以外,runtime 包里也要包含这些 helper——因为既可以把 helper 注入到 AST,也可以抽离成从 runtime 包引入的形式。

### 操作 AST 的工具函数

除了用于注入同样的 AST 的 helper,还有一些公共逻辑的 helper:操作 AST 的工具函数。比如变量提升,自己实现比较麻烦,这种通用逻辑封装到 helper 里,插件里直接使用:

```javascript
const hoistVariables = require('@babel/helper-hoist-variables').default;

const plugin = function () {
  return {
    visitor: {
      VariableDeclaration(path) {
        hoistVariables(path.parentPath, (id) => {
          path.scope.parent.push({
            id: path.scope.generateUidIdentifier(id.name)
          });
          return id;
        }, 'const');
      }
    }
  };
};
```

当输入为:

```javascript
function func(){
    const a = 1;
    const b = 2;
}
```

输出为:

```javascript
var _a, _b;

function func() {
  a = 1;
  b = 2;
}
```

借助 @babel/helper-hoist-variables 即可轻松实现变量提升的逻辑。

再举一个例子:

```javascript
const importModule = require('@babel/helper-module-imports');

const plugin = function ({ template }) {
  return {
    visitor: {
      Program(path) {
        importModule.addDefault(path, 'lodash', {
          nameHint: '_'
        });
        path.node.body.push(template.ast(`const get = _.get;`));
      }
    }
  };
};
```

它会在代码中加入模块引入和变量声明的代码:

```javascript
var _ = _interopRequireDefault(require("lodash")).default;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const get = _.get;
```

借助 @babel/helper-module-imports 可以很轻松地引入一个模块,支持 named import、default import 或 namespace import 方式。

这类 helper 的特点是:需要手动引入对应的包、调用 api,而不是直接 this.addHelper。

总结而言,babel helpers 是用于 babel plugin 逻辑复用的一些工具函数,分为两种:用于注入 runtime 代码的 helper 和用于简化 AST 操作的 helper。第一种都在 @babel/helpers 包里,直接 `this.addHelper(name)` 就可以引入;第二种需要手动引入包和调用 api。业务开发一般不会用到,知道它们的用途即可。

## babel runtime

babel runtime 里面放运行时加载的模块,会被打包工具打包到产物中,其中放着各种需要在 runtime 使用的函数,包括三部分:regenerator、corejs、helper。

- **corejs**:新 API 的 polyfill,分为 2 和 3 两个版本,3 才实现了实例方法的 polyfill
- **regenerator**:facebook 实现的 async 的 runtime 库,babel 使用 [regenerator-runtime](https://github.com/facebook/regenerator/tree/master/packages/runtime) 来支持 async await
- **helper**:babel 做语法转换时用到的函数,比如 _typeof、_extends 等

babel 做语法转换和 API 的 polyfill,需要自己实现一部分 runtime 的函数,就是 helper 部分;有的则没有自己实现,用的第三方的实现——比如 regenerator 用的是 facebook 的,API 的 polyfill 用的是 core-js 的,babel 对它们做了整合。因为 async await 这类特性的实现比较复杂,标准 API 的实现跟进也需要投入大量精力,babel 直接采用了社区的实现。

## 小结

babel 内置的 plugin 分为 transform、proposal、syntax 三种;preset 是插件的集合,可以按 targets 动态确定包含的插件。插件之间可复用的 AST 操作逻辑、需要注入的公共代码都放在 helper 里:注入 AST 的 helper 在 @babel/helpers 包中通过 `this.addHelper(name)` 使用,操作 AST 的 helper 则以独立包形式手动引入。除了注入到 AST 外,还有一部分运行时代码从 runtime 包引入;runtime 包分为 helper、regenerator、core-js 三部分,后两者都是社区的实现。preset、helper、runtime 三者共同支撑了 babel 的语法转换与 API polyfill 能力。
