---
title: 脚手架 cli：generate 命令（AI 加持版）
description: 将 LLM 能力接入 generate 命令，按需生成模块与组件
keywords: [Node.js, CLI, commander, 脚手架：AI, generate]
category: Node.js
tags: [Node.js, CLI工具开发]
---







# 脚手架 cli：generate 命令（AI 加持版）

这节来实现脚手架的 generate 命令。

不知道大家有没有用过 nest 的 cli。

先用一下：

```bash
npm install -g @nestjs/cli
nest new hello-nest
```


进入项目，把它跑起来：

```bash
npm run start:dev
```


浏览器访问下：


然后用下它的 generate 命令：

```bash
nest g resource aaa
```


它就是选择生成的类型，然后就会创建这些文件，并且更新 AppModule


aaa 目录下的文件就是简单的写入文件就行，而修改 AppModule 这个是基于 AST。

因为 AppModule 的格式是规定的，所以通过 AST 能精准修改代码。

安装下依赖，再次跑：

```bash
npm install --save @nestjs/mapped-types

npm run start:dev
```


这样用 generate 能直接生成 aaa 的 CRUD 代码。

就很方便。

这也是 generate 命令的意义。

也可以实现这样一个 generate 命令。

但只是生成组件的基本结构意义不大，完全可以结合 AI 来生成符合需求的代码。

来写一下，创建 generate 包：

```bash
mkdir packages/generate

cd packages/generate

npm init -y
```


创建 generate 包，然后改下 package.json


```json
"name": "@guang-cli/generate",
"publishConfig": {
  "access": "public"
},
```

在 generate 包下创建 tsconfig.json

```bash
pnpm --filter generate exec npx tsc --init
```

改下内容：

```json
{
  "compilerOptions": {
    "outDir": "dist",
    "types": [ "node" ],
    "target": "es2016",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "declaration": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "skipLibCheck": true,
    "sourceMap": true
  },
  "include": [
    "src/**/*.ts"
  ]
}
```

修改 package.json 的 type 为 module


并且注册下代码入口 main 和 ts 类型 types

```json
"type": "module",
"main": "dist/index.js",
"types": "dist/index.d.ts",
```

然后开始写代码。

创建 src/index.ts

```javascript
import { select, input, confirm } from '@inquirer/prompts';
import os from 'node:os';
import path from 'node:path';

async function generate() {

    let componentDir = '';
    while(!componentDir) {
        componentDir = await input({ message: '生成组件的目录', default: 'src/components' });
    }

    let componentDesc = '';
    while(!componentDesc) {
        componentDesc = await input({ message: '组件描述（尽量详细一些）', default: '生成一个 Table 组件，有包含 name、age、email 属性的 data 数组参数' });
    }

    console.log(componentDir, componentDesc)
}

generate();

export default generate;
```

安装下依赖：

```bash
pnpm --filter generate add @inquirer/prompts
```

跑一下:

```bash
pnpm --filter generate exec npx tsc -w

pnpm --filter generate exec node ./dist/index.js
```

npx tsc -w 会监听文件变化实时编译，就不用每次手动 npx tsc 编译了。


然后引入 openai 来对接 AI 接口：

```bash
pnpm --filter generate add openai
```

上节是用的 tools （也就是 function call）实现的代码提取，这次通过正则提取。

改下 src/index.ts

```javascript
import { select, input, confirm } from '@inquirer/prompts';
import os from 'node:os';
import path from 'node:path';
import OpenAI from 'openai';
import fs from 'node:fs';

const client = new OpenAI({
    apiKey: '你的 API KEY',
    baseURL: '你的代理商的 BASE URL'
});

const systemContent = `
# Role: 前端工程师

## Profile

- author: 神光
- language: 中文
- description: 你非常擅长写 React 组件

## Goals

- 根据用户需求生成组件代码

## Skills

- 熟练掌握 typescript

- 会写高质量的 React 组件

## Constraints

- 用到的组件来源于 antd

- 样式用 scss 写

## Workflows

根据用户描述生成的组件，规范如下：

组件包含 4 类文件:

    1、index.ts
    这个文件中的内容如下：
    export { default as [组件名] } from './[组件名]';
    export type { [组件名]Props } from './interface';

    2、interface.ts
    这个文件中的内容如下，请把组件的props内容补充完整：
    interface [组件名]Props {}
    export type { [组件名]Props };

    3、[组件名].tsx
    这个文件中存放组件的真正业务逻辑，不能编写内联样式，如果需要样式必须在 4、styles.scss 中编写样式再导出给本文件用

    4、styles.scss
    这个文件中必须用 scss 给组件写样式，导出提供给 3、[组件名].tsx

    每个文件之间通过这样的方式分隔：

    # [目录名]/[文件名]

    目录名是用户给出的组件名

## Initialization

作为前端工程师，你知道你的[Goals]，掌握技能[Skills]，记住[Constraints], 与用户对话，并按照[Workflows]进行回答，提供组件生成服务
`


async function generate() {

    let componentDir = '';
    while(!componentDir) {
        componentDir = await input({ message: '生成组件的目录', default: 'src/components' });
    }

    let componentDesc = '';
    while(!componentDesc) {
        componentDesc = await input({ message: '组件描述', default: '生成一个 Table 的 React 组件，有包含 name、age、email 属性的 data 数组参数' });
    }

    const res = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {role: 'system', content: systemContent},
          {role: 'user', content: componentDesc}
        ]
    });

    console.log(res.choices[0].message.content || '')
}

generate();

export default generate;
```

在 system 的内容里指定返回内容的格式


```text
每个文件之间通过这样的方式分隔：

# [目录名]/[文件名]

目录名是用户给出的组件名
```

跑一下：

```bash
pnpm --filter generate exec node ./dist/index.js
```

可以看到，返回的格式就是指定的：


这样解析起来不就简单了么？

在 [astexplorer.net](https://astexplorer.net/#/gist/0c4fdbe3859ed0a78bd1de0eccf6b662/af7caa7a59502a2ce66cee2832d4f67bccaaf9bf) 里看下：

切换到 Markdown 的 remark 编译器，可以看到 parse 出的 AST：


通过 AST 非常容易就能拿到文件名和文件内容。

安装下 remark 还有 fs-extra

```bash
pnpm --filter generate add fs-extra remark

pnpm --filter generate add --save-dev @types/fs-extra
```

调用 remark 来解析 markdown，拿到文件路径和内容，写入即可：


这里要拼接上之前用户填入的组件目录，加上解析出的文件路径和文件内容，写入磁盘即可。

这里的 ast 结构就是从 astexplorer.net 上查看的。


```javascript
import fse from 'fs-extra';
import {remark} from 'remark'
```

```javascript
const markdown = res.choices[0].message.content || '';

await remark().use(function(...args) {
    return function(tree: any) {
        let curPath = '';

        for(let i = 0; i< tree.children.length; i++ ) {
            const node = tree.children[i];
            if(node.type === 'heading') {
                curPath = path.join(componentDir, node.children[0].value);
            } else {
                try {
                    fse.ensureFileSync(curPath);
                    fse.writeFileSync(curPath, node.value);

                    console.log('文件创建成功：', curPath)
                } catch(e) {
                }
            }
        }

    }
}).process(markdown);
```

跑一下：

```bash
pnpm --filter generate exec node ./dist/index.js
```


创建成功。

再加上 ora 来做下 loading：

```bash
pnpm --filter generate add ora
```


这样，我们的 AI 版 generate 命令就跑通了。

> 代码上传了[文档仓库](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/guang-cli)

## 总结

这节实现了 AI 版的 generate 命令。

输入生成组件的目录、组件描述，就会调用 AI 来生成代码，然后写入组件目录。

通过在 system 里设置组件规范来保证返回的代码是符合规范的。

并且通过 system 设置规定了返回内容的格式，然后用 remark 通过 AST 解析出文件名和文件内容、写入磁盘。

这样，就可以通过 AI 生成符合规范的代码了。

当然，现在的很多内容都是写死的，比如 system 设置、API KEY、BASE URL,这些都应该是在配置文件里配置的，下节加上配置文件。