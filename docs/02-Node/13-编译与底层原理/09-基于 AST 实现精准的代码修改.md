---
title: 基于 AST 实现精准的代码修改
description: 使用 AST 解析与节点重写实现安全精准的代码转换，对比正则替换的局限
keywords: [Node.js, AST, 编译]
category: Node.js
tags: [Node.js, 编译与底层原理]
---







# 基于 AST 实现精准的代码修改

很多 Node.js 工具可以修改代码。

比如你用 @nestjs/cli 创建模块的时候：

首先创建个项目：

```bash
npx @nestjs/cli new test-app
```


创建 aaa 模块：

```bash
npx @nestjs/cli g module aaa
```


注意到代码的变化了没

AppModule 多了两行代码：

插入的很精准。

再来试下：

创建一个 Controller

```bash
npx @nestjs/cli g controller aaa
```


AaaModule 的代码也插入了两行代码：


这么精准的代码修改可太方便了，不然要创建完手动在这里引入。

那这种工具是怎么实现精准的代码修改的呢？

答案就是 AST。

写的代码不管是 Node 还是网页的，都是需要编译后再跑。

编译的过程是这样的：


源码首先会被解析成 AST（ Abstract Syntax Tree 抽象语法树），然后对 AST 做转换，也就是对这棵树的节点做增删改之后，递归打印，生成新的代码。

也就是 parse、transform、generate 这三个阶段。

只要在 transform 阶段对 AST 做一些自定义的修改，就能达到上面的效果。

来写一下：

```bash
mkdir ast-transform-test
cd ast-transform-test
npm init -y
```


进入项目，安装 typescript：

```bash
npm install typescript  @types/node --save-dev
```

创建 tsconfig.json

```bash
npx tsc --init
```


改一下：

```json
{
  "compilerOptions": {
    "outDir": "dist",
    "types": [ "node" ],
    "target": "es2016",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

在 package.json 设置 type 为 module：


来实现这个自动插入 controllers 的效果：


写下 src/index.ts

```javascript
import { PluginObj, transformFromAstSync } from '@babel/core';
import parser from '@babel/parser';
import template from '@babel/template';
import { isObjectExpression } from '@babel/types';
import prettier from 'prettier';

const sourceCode = `
import { Module } from '@nestjs/common';

@Module({})
export class AaaModule {}
`;


function myPlugin(): PluginObj {

    return {
        visitor: {
            Program(path) {
                let index = 0;

                while(path.node.body[index].type === 'ImportDeclaration') {
                    index ++;
                }

                const ast = template.statement("import { AaaController } from './aaa.controller';")()
                path.node.body.splice(index, 0, ast);
            },
            Decorator(path: any) {
                const decoratorName = path.node.expression.callee.name
                if(decoratorName !== 'Module') {
                    return;
                }

                const obj = path.node.expression.arguments[0];

                const controllers = obj.properties.find((item: any) => item.key.name === 'controllers');
                if (!controllers) {
                    const expression = template.expression('{controllers: [AaaController]}')();

                    if(isObjectExpression(expression)) {
                        obj.properties.push(expression.properties[0]);
                    }
                } else {
                    const property = template.expression('AaaController')();
                    controllers.value.elements.push(property);
                }
            }
        }
    }
}

const ast = parser.parse(sourceCode, {
    sourceType: 'module',
    plugins: ["decorators"]
});

const res = transformFromAstSync(ast, sourceCode, {
    plugins: [ myPlugin ]
});

console.log(res?.code);
```

首先用 parser.parse 把源码转为 AST：


设置 sourceType 为 module 就是按照 es module 来解析，这里要指定 decorators 的装饰器语法插件，不然解析不了装饰器。

然后调用 transformFromAstSync 对 AST 进行转换，这个过程中会调用 babel 插件。

之后就可以拿到生成的代码，然后打印。

目标是实现这个转换：


插件写法如下：


在 visitor 里声明要处理的节点，然后在回调函数里对节点做修改。

怎么知道修改啥节点呢？

用 [astexplorer.net](https://astexplorer.net/#/gist/ff98df80ff82521e7867662083bbf943/9cb1f591e6120615369241da70bc827af777f3be) 看下就知道了：

设置下 babel parser，勾选 decorators 这两个选项：


这样就能 parse 刚才这段代码了：

```javascript
import { Module } from '@nestjs/common';

@Module({})
export class AaaModule {}
```

最外层是 Program 节点：


import 语句对应 ImportDeclaration 节点：


@Module 装饰器对应 Decorator 节点：


而要修改的就是这个：


一层层找到 @Module 里的 controllers 数组，向其中添加一个元素就好了。

对应的代码就是这样的：


首先，从上到下找 ImportDeclaration，直到最后一个，然后在最后面插入一个 import 语句。

这里用 @babel/template 包的 api 来创建这个 ast。

然后就是在 controllers 数组插入一个元素。

这里层层找到 controllers 数组的 ast，找到之后在其中加入一个 AaaController 的 ast。


如果没有 controllers 数组，那就在对象里出入这个属性。

安装用到的包：

```bash
npm install --save @babel/core
npm install --save @babel/parser
npm install --save @babel/template
npm install --save @babel/types

npm install --save-dev @types/babel__core
```

测试下：

```bash
npx tsc -w

node ./dist/index.js
```


可以看到，代码被正确的修改了。

这就是基于 AST 来修改代码的好处，很精准。

用 @nestjs/cli 等工具生成代码的时候，为什么能那么精准呢？


就是基于 AST 做的。

当然，现在我们的格式还不太对。


转换完以后行数变了。

这时候在 transformFromAstSync 的配置里加一个 retainLines 就好了：

```javascript
const res = transformFromAstSync(ast, sourceCode, {
    plugins: [ myPlugin ],
    retainLines: true // 保留原本的行列号
});
```


它会保留原本的行列号。

但这样格式依然不对，再用 prettier 格式化就好了。

安装 prettier：

```bash
npm install --save prettier
```

用它格式化下编译后的代码：


这里指定文件名是为了让 prettier 自动推断用啥 parser。

```javascript
(async function() {
    const formatedCode = await prettier.format(res?.code!, {
        filepath: 'aaa.ts'
    });
    console.log(formatedCode);
})();
```

跑一下：

```bash
node ./dist/index.js
```


这样格式就对了。

然后封装个 cli，就是每天在用的这种效果了：

```bash
npx @nestjs/cli g module aaa
```


```bash
npx @nestjs/cli g controller aaa
```


最后，说明下为什么用了 any：


因为 AST 一层套一层的，并不能直接确定下一层的类型，需要你每层做下判断才能确定类型

比如这样：


但这样太麻烦了，any 就可以直接一层层取了：


> 代码上传了[文档仓库](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/ast-transform-test)

## 总结

这节实现了基于 AST 的精准代码修改。

用的很多 cli 为什么那么方便，可以精准的知道在哪里改？

就是基于 AST 做的。

基于 babel 插件实现了下 @nestjs/cli 生成 controller 时的代码修改功能。

然后用 prettier 做了下格式化。

如果你要做一个分析、修改代码的 CLI，那 AST 知识是必不可少的。