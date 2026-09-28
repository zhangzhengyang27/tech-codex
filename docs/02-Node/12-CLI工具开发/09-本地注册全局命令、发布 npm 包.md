---
title: 本地注册全局命令、发布 npm 包
description: bin 字段、prefix 链接与 npm publish 的包发布完整链路
keywords: [Node.js, CLI, commander, npm]
category: Node.js
tags: [Node.js, CLI工具开发]
---







# 本地注册全局命令、发布 npm 包

上节实现了基于 AST 的代码修改，是直接用 node 跑的。


而实际上 @nestjs/cli 是这样用的：

```bash
npx @nestjs/cli g module aaa
```


```bash
npx @nestjs/cli g controller aaa
```


需要进一步把它封装成命令。

可以注册为全局命令，这样到处都可以用。

那如何注册为全局命令呢？

有的同学可能会说，把它封装为 npm 包发到 npm 仓库，然后全局 npm install -g 安装就好了。

这样确实可以，但是本地测试的时候，代码还没完成，这时候发包不是很好。

可以用 npm link 来做。

先来写个 cli：

```bash
mkdir my-nest-cli
cd my-nest-cli
npm init -y
```


进入项目，安装 typescript：

```bash
npm install typescript @types/node --save-dev
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


创建 src/transform.ts

```javascript
import { PluginObj, transformFromAstSync } from '@babel/core';
import parser from '@babel/parser';
import template from '@babel/template';
import { isObjectExpression } from '@babel/types';
import prettier from 'prettier';
import { readFile } from 'node:fs/promises';

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


export async function transformFile(filePath: string) {
    const sourceCode = await readFile(filePath);

    const ast = parser.parse(sourceCode, {
        sourceType: 'module',
        plugins: ["decorators"]
    });

    const res = transformFromAstSync(ast, sourceCode, {
        plugins: [ myPlugin ],
        retainLines: true
    });

    const formatedCode = await prettier.format(res?.code!, {
        filepath: filePath
    });

    return formatedCode;
}
```

其实就是把上节的 src/index.ts 复制了过来封装了个方法：


安装用到的包：

```bash
npm install --save @babel/core
npm install --save @babel/parser
npm install --save @babel/template
npm install --save @babel/types

npm install --save-dev @types/babel__core

npm install --save prettier
```

先来测试下：

nest-project/aaa.module.ts

```javascript
//@ts-ignore
import { Module } from '@nestjs/common';

@Module({})
export class AaaModule {}
```

这个文件不需要编辑，在 tsconfig.json 里排除下：

创建 src/test.ts

```javascript
import path from "node:path";
import { transformFile } from "./transform.js";

(async function() {
    const filePath = path.join(process.cwd(), './nest-project/aaa.module.ts');

    const code = await transformFile(filePath);
    console.log(code);
})();

```

跑一下：

```bash
npx tsc -w
node ./dist/test.js
```


然后用 commander 封装个 cli

创建 src/cli.ts

```javascript
import { transformFile } from "./transform.js";
import { access, writeFile } from "node:fs/promises";
import path from "node:path";
import { Command } from 'commander';
import chalk from "chalk";

const program = new Command();

program
  .name('my-nest-cli')
  .description('自动添加 controller')
  .version('0.0.1');

program.command('transform')
  .description('修改 module 代码，添加 controller')
  .argument('path', '待转换的文件路径')
  .action(async (filePath: string) => {
    if(!filePath) {
        console.log(chalk.red('文件路径不能为空'))
    }

    const p = path.join(process.cwd(), filePath);

    try {
        await access(p);

        const formattedCode = await transformFile(filePath);
        writeFile(p, formattedCode);

        console.log(`${chalk.bgBlueBright('UPDATE')} ${filePath}`)
    } catch(e) {
        console.log(chalk.red('文件路径不存在'))
    }
  });

program.parse();

```

声明一个 transform 子命令，有一个 path 的参数，可以传入转换的文件路径。

通过 access 访问文件路径，如果抛异常，就说明文件路径不存在。

否则，转换文件后写入该路径。

安装下用到的包：

```bash
npm install --save commander
npm install --save chalk
```

跑一下：

```bash
node ./dist/cli.js transform ./nest-project/aaa.module.ts
```

是不是有 @nestjs/cli 的感觉了？


然后把它注册为全局命令：

package.json 添加 bin 字段，指定命令名和对应的文件路径：


```json
"bin": {
    "my-cli": "./dist/cli.js"
},
```

还要在文件开头加上这个：


```javascript
#!/usr/bin/env node
```

这行代码是告诉 shell 用 node 去执行这个文件，就和 node ./dist/cli.js 一样。

然后在项目根目录执行 npm link

```bash
npm link
```


之后神奇的事情发生了。

现在你在任何目录都可以执行 my-cli 了。


然后创建个 nest 项目：

```bash
npx @nestjs/cli new test-nest-app
```


然后进入项目，执行 my-cli transform

```bash
my-cli transform ./src/app.module.ts
```


可以看到，代码转换成功了。

然后用 nest cli 创建一个模块：

```bash
npx @nestjs/cli g module user
```


然后再用写的工具去修改下这个 module：

```bash
my-cli transform ./src/user/user.module.ts
```

可以看到，代码依然被正确的修改了。

这就是通过 AST 修改代码的魅力，可以精准的修改。

当然，通过 npm link 注册的全局包只是本地测试用。

最终还是要发到 npm 仓库，然后 npm install -g 来用的。

删除刚才注册的本地命令：

```bash
 npm uninstall -g my-nest-cli
```


然后把这个包发到 npm 仓库：

改下 package.json：

```json
{
  "name": "my-nest-cli",
  "version": "0.0.1",
  "type": "module",
  "bin": {
    "my-cli": "./dist/cli.js"
  },
  "main": "dist/transform.js",
  "module": "dist/transform.js",
  "files": ["dist"],
  "scripts": {
    "build": "tsc"
  }
}
```

bin 是配置命令的入口，main 和 module 分别是 commonjs 和 es module 的入口。

files 是要发布到 npm 仓库的文件。

然后先登录下：

```bash
npm adduser
```

执行 npm adduser 命令，会让你输入用户名、密码、邮箱、验证码，然后就可以登陆了。


如果你还没账号，就先去 [www.npmjs.com](https://www.npmjs.com) 注册一个。

执行 publish：

```bash
npm publish
```


这样就把他发到了 npm 仓库上。

（你发布的时候改一下 package.json 里的 name，不然会重名）

去搜一下：

[www.npmjs.com/package/my-nest-cli](https://www.npmjs.com/package/my-nest-cli)


现在可以在 npm 仓库搜到了，还没有 README.md

加一下：

```markdown
# my nest cli

掘金文档 《Node.js 工具链通关秘籍》案例代码

第一步，全局安装这个命令：

npm install -g my-nest-cli

第二步，进入 Nest 项目目录，执行 my-cli transform

my-cli transform ./src/app.module.ts

```

改下 package.json 里的版本号，再次发布：

```bash
npm publish
```


可以看到，README 有了，版本号也改了：


然后全局安装下：

```bash
npm install -g my-nest-cli
```


然后再次执行 my-cli：

```bash
my-cli transform ./src/app.module.ts
```

现在就不是跑的本地那个了，而是从 npm 仓库下载的。

再试下：


功能正常。

> 代码上传了[文档仓库](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/my-nest-cli)

## 总结

这节把上节实现的 AST 修改功能封装成了 cli，并 link 到全局在 Nest 项目里测试了一下。

和 nest cli 添加 controller 的功能一样。

然后把它发布到了 npm 仓库，全局安装这个命令，之后又测试了一遍。

开发一些 cli 命令的时候，就是这样的方式，本地用 npm link，然后发布 npm 仓库之后，就可以 npm install 来用了。