---
title: 脚手架 cli：配置文件、整体测试
description: 脚手架配置文件设计与端到端测试、错误恢复策略
keywords: [Node.js, CLI, commander]
category: Node.js
tags: [Node.js, CLI工具开发]
---







# 脚手架 cli：配置文件、整体测试

上节跑通了 AI 生成代码的流程，这节加上配置文件。

babel 的[配置方式](https://babel.dev/docs/config-files)有很多种：


可以在 .babelrc、babel.config.json、babel.config.js 等文件里配置，还可以在 package.json 里配置。

如果也要支持这些配置方式，自己实现还是挺麻烦的。

但没必要自己实现，可以用 [cosmiconfig](https://www.npmjs.com/package/cosmiconfig) 这个包。


周下载量达数千万级别，用的挺多的。

先测试下：

在 generate 包下创建 test.ts

src/test.ts

```javascript
import { cosmiconfig, cosmiconfigSync } from 'cosmiconfig';
import path from 'node:path';

const explorer = cosmiconfig("xxx");

async function main() {
    const result = await explorer.search(path.join(import.meta.dirname, '../'));

    console.log(result?.config);

}

main();
```

安装下依赖：

```bash
pnpm --filter generate add cosmiconfig
```

在 generate 下创建 xxx.config.js

```javascript
export default {
    apiKey: '111',
    baseUrl: '222',
    systemContent: 'xxx'
}
```

跑一下：

```bash
pnpm --filter generate exec npx tsc -w
pnpm --filter generate exec node ./dist/test.js
```


当然，你也可以删掉 xxx.config.js，在 package.json 里配置：


再跑下：


你还可以试下 .xxxrc、xxx.config.json 等方式，都是能读取出来的。

然后再导出个类型：

创建 src/configType.ts

```javascript
export interface ConfigOptions {
    apiKey: string;
    baseUrl: string;
    systemSetting: string;
}
```

然后再配置 xxx.config.js，可以用 jsdoc 的方式来定义配置的类型：

```javascript
/** @type { import('./dist/configType').ConfigOptions} */
export default {

}
```


这样就有类型提示了。

测试完之后，在代码里引入下：


只是把这几个值抽离的配置文件里，其他都不变。

```javascript
import { select, input, confirm } from '@inquirer/prompts';
import os from 'node:os';
import path from 'node:path';
import OpenAI from 'openai';
import fs from 'node:fs';
import fse from 'fs-extra';
import {remark} from 'remark'
import ora from 'ora';
import { cosmiconfig } from 'cosmiconfig';
import { ConfigOptions } from './configType.js';

async function generate() {
    const explorer = cosmiconfig("generate");

    const result = await explorer.search(process.cwd());

    if(!result?.config) {
        console.error('没找到配置文件 generate.config.js');
        process.exit(1);
    }

    const config: ConfigOptions = result.config;

    const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl
    });

    const systemContent = config.systemSetting

    let componentDir = '';
    while(!componentDir) {
        componentDir = await input({ message: '生成组件的目录', default: 'src/components' });
    }

    let componentDesc = '';
    while(!componentDesc) {
        componentDesc = await input({ message: '组件描述', default: '生成一个 Table 的 React 组件，有包含 name、age、email 属性的 data 数组参数' });
    }

    const spinner = ora('AI 生成代码中...').start();

    const res = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          {role: 'system', content: systemContent},
          {role: 'user', content: componentDesc}
        ]
    });

    spinner.stop();

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
}

generate();

export default generate;
```

本地测试的话先在 generate 下创建 generate.config.js

```javascript
const systemSetting = `
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
/** @type { import('./dist/configType').ConfigOptions} */
export default {
    apiKey: '你的 API KEY',
    baseUrl: '你用的代理商的 BASE URL',
    systemSetting: systemSetting
}
```

跑一下：


没啥问题。

不过这个包不是直接调用的，把这行调用去掉：


然后在 cli 包里调用下：

```bash
pnpm --filter cli add @guang-cli/generate --workspace
```


首先安装这个包，然后添加个命令：


```javascript
program.command('generate')
    .description('生成组件（基于 AI）')
    .action(async () => {
        generate();
    });
```

跑一下：

```bash
pnpm --filter cli exec npx tsc
pnpm --filter cli exec node ./dist/index.js generate
```


通了。

这样，就可以发包了。

顺便改下项目模版，在 react 项目和 vue 项目里都内置一个配置文件。

template-react 里就把刚才的配置文件复制过来就行：


template-vue 里也是，不过要改下 system 设置：


我对 vue 不熟，这里就不写内置的 system 配置了，大家可以自己根据公司代码规范来规定 AI 返回的代码格式。

然后发个包：

你可以先把本地代码 commit 一下，然后用 changeset add 发包：

```bash
npx changeset add
```

发这四个包：


generate 和 cli 改 minor 版本号，两个 template 包改 patch 版本号：


在 .changeset 下多了这个临时文件：


然后生成版本号和 CHANGELOG.md

```bash
npx changeset version
```

可以看到，两个 template 都是改了 patch 版本号：

template-vue：


template-react：


generate 和 cli 改的是 minor 版本号：


同时 cli 包依赖的 generate 包版本变化也会更新一个 patch 版本。

都没啥问题之后，就可以发包了：

```bash
git add .

git commit -m 'feat: 实现 generate 命令'

npx changeset publish
```

commit 一下是为了自动打 tag 的时候打在这个 commit 上。


发包成功！

试一下：

```bash
npx @guang-cli/cli@latest
```


可以看到，多了这个命令。

用脚手架创建个 react 项目：


vscode 打开看看：


是有 generate.config.js 配置文件的。

（其实这里 jsdoc 的路径应该改一下，改成 @guang-cli/generate 下的类型，不过不重要）

填入 apiKey 和 baseUrl

执行下 generate 命令：

```bash
npx @guang-cli/cli@latest generate
```


跑一下：

```bash
npm install
npm install --save antd
npm install --save-dev sass
```

在 App.tsx 引入下：

```javascript
import { UserTable } from "./components/UserTable"

function App() {

  return (
    <UserTable data={[
      {
        name: 'guang',
        age: 20,
        email: 'guang@guang.com'
      },
      {
        name: 'guang222',
        age: 21,
        email: 'guang@guang.com'
      },
      {
        name: 'guang333',
        age: 23,
        email: 'guang22@guang.com'
      },
    ]}/>
  )
}

export default App
```

去掉 main.tsx 里的 index.css


跑起来：

```bash
npm run dev
```


浏览器看一下：


没啥问题。

这样，我们的 generate 命令就完成了。

相比 @nestjs/cli 的 generate 命令，用 AI 生成的代码显然更有价值一点。

> 代码上传了[文档仓库](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/guang-cli)

## 总结

这节加上了配置文件，用 cosmiconfig，它支持从 js、json 等文件里读取配置。

然后改了在 cli 里引入了 generate 命令，用 changeset 发了 npm 包的新版本。

之后在本地整体测试了下 create、generate 命令，都没啥问题。

这样，我们的脚手架就开发完成了。