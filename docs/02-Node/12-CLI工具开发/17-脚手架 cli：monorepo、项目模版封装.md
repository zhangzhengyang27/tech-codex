---
title: 脚手架 cli：monorepo、项目模版封装
description: 在脚手架中封装 monorepo 模板、统一构建与发布配置
keywords: [Node.js, CLI, commander, 脚手架：Monorepo]
category: Node.js
tags: [Node.js, CLI工具开发]
---







# 脚手架 cli：monorepo、项目模版封装

这节开始正式进入脚手架 cli 的开发。

流程上节分析过了。


用 monorepo 的形式管理，分为 template-vue、template-react、cli、create 这四个包。

scope 就用 @guang-cli 吧（你创建的时候要自己换个名字）

登录 [npm 网站](https://www.npmjs.com/)，创建组织：


然后创建下 monorepo：

```bash
mkdir guang-cli
cd guang-cli
npm init -y
```


进入项目，修改 package.json


加上 private: true，也就是不发布这个 package.json 的包到 npm 仓库。

添加 pnpm-workspace.yaml 配置文件：

```yaml
packages:
  - 'packages/*'
```

用 pnpm workspace + changeset 来做 monorepo

首先创建 template-react 和 template-vue 包，直接复制 create-vite 的项目模版过来（当然，用别的模版也可以）。

安装下 create-vite

```bash
npm install --no-save create-vite
```

把 template-react-ts 和 template-vue-ts 复制出来，到项目的 packages 目录下：


分别放到 packages/template-vue/template 目录，packages/template-react/template 目录

把模版里的 \_gitignore 改为 .gitignore

然后在两个包下创建 package.json

```bash
cd packages/template-vue

npm init -y

cd ../template-react

npm init -y
```

改下 package.json


name 加上 scope，并且加上 publishConfig 指定这个是公开访问的包。

```json
"publishConfig": {
    "access": "public"
},
```

然后用 changeset 发到 npm 仓库：

登录下 npm

```bash
npm adduser
```

浏览器登录过 npm，会提示你打开浏览器，授权之后就登录成功了。


然后回到根目录，安装 changeset，执行 changeset init：

```bash
pnpm add --save-dev -w @changesets/cli prettier-plugin-organize-imports prettier-plugin-packagejson

npx changeset init
```

\-w 是在根目录安装依赖


会多一个 .changeset 目录：


changeset 会基于 git 来判断代码有没有变动。

初始化下 git

先在根目录创建 .gitignore

```bash
node_modules/
dist/
.DS_Store
```

执行 init

```bash
git init

git add .

git commit -m '初始化项目，创建 template-react template-vue'
```

changeset 会基于上次的 commit 来判断变更，所以先创建一个 commit，然后再做下改动：

分别在 template-vue、template-react 的 package.json 里加个换行。


然后执行 npx changeset add

```bash
npx changeset add
```


按住空格来选择


改 minor 版本号

在 .changeset 下多了一个临时文件记录着这次变更的信息：


然后执行 version 命令来生成最终的 CHANGELOG.md 还有更新版本信息：

```bash
npx changeset version
```


更改的包下都多了 CHANGELOG.md 文件：


并且都更新了版本号：


可以看到，变的是选择的 minor 版本号。

然后创建一个 commit，发布到 npm 仓库：

```bash
git add .
git commit -m '项目模版 1.1.0'

npx changeset publish
```

创建 commit 是因为 changeset 会给最新的 commit 打 tag。

执行 changeset publish 命令：


发布到了 npm，并在这个 commit 上打了两个 tag

去 [npm 网站](https://www.npmjs.com/~quark-gluon-plasma?activeTab=packages)看一下：


两个包都发布成功了。

[点进去](https://www.npmjs.com/package/@guang-cli/template-react?activeTab=code)看下：


没啥问题。

接下来创建 cli 和 create 包：

```bash
mkdir packages/cli packages/create

cd packages/cli

npm init -y

cd ../create

npm init -y
```

改下名字，加上 publishConfig：


```json
"publishConfig": {
    "access": "public"
},
```

回到根目录，在 cli 包添加 create 包为依赖：

```bash
pnpm --filter cli add @guang-cli/create --workspace
```

\--filter 指定在 cli 包下执行 add 命令

加上 --workspace 就是从本地查找


这时 node\_modules 下的 @guang-cli/create 包就是从 packages 下软链过来的。


可以看到，node\_modules 下的依赖也更新了。

然后安装 typescript：

```bash
pnpm add typescript @types/node -w --save-dev
```

加上 -w 才能在根目录安装依赖。

在 cli 包下创建 tsconfig.json

```bash
pnpm --filter cli exec npx tsc --init
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
  }
}
```

修改 package.json 的 type 为 module


并且注册下代码入口 main 和 ts 类型 types

```json
"type": "module",
"main": "dist/index.js",
"types": "dist/index.d.ts",
```

同样的方式也改下 create 包的：

```bash
pnpm --filter create exec npx tsc --init
```

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
  }
}
```


然后在 create 包下创建 src/index.ts

```javascript
async function create() {
    console.log('create 命令执行中...')
}

export default create;

```

编译下：

```bash
pnpm --filter create exec npx tsc
```


然后在 cli 包下也创建 src/index.ts

```javascript
#!/usr/bin/env node
import create from '@guang-cli/create';
import { Command } from 'commander';
import fse from 'fs-extra';
import path from 'node:path';

const pkgJson = fse.readJSONSync(path.join(import.meta.dirname, '../package.json'));

const program = new Command();

program
    .name('guang-cli')
    .description('脚手架 cli')
    .version(pkgJson.version);

program.command('create')
    .description('创建项目')
    .action(async () => {
        create();
    });

program.parse();
```

用 commander 解析命令行，注册 create 命令。

用 fs-extra 读取 package.json 里的 version

安装下这两个包：

```bash
pnpm --filter cli add commander fs-extra

pnpm --filter cli add --save-dev @types/fs-extra
```

跑一下：

```bash
pnpm --filter cli exec npx tsc

pnpm --filter cli exec node ./dist/index.js create
```


没啥问题。

这样，monorepo 的基本结构就搭建完成了。

改下 cli 包的 package.json


版本号改为 0.0.1，加上 bin 的配置：

```json
"bin": {
    "guang-cli": "./dist/index.js"
},
```

create 包的版本号也改下。


然后把这两个包发到 npm 仓库：

```bash
git add .
git commit -m 'cli 包、create 包初始化'
```

执行 npx changeset add

```bash
npx changeset add
```

选择 cli、create 两个包：


这里选择改 patch 版本号：


然后执行 npx changeset version 更新版本

```bash
npx changeset version
```


登录 npm：

```bash
npm adduser
```


然后执行 npx changeset publish 发布 npm 包：

```bash
git add .
git commit -m 'cli create 0.0.2'

npx changeset publish
```


在 npm 网站看下：


然后用 npx 执行下：

```bash
npx @guang-cli/cli create
```


没啥问题，流程跑通了。

> 代码上传了[文档仓库](https://github.com/QuarkGluonPlasma/nodejs-course-code/tree/main/guang-cli)

## 总结

这节搭建了 monorepo 的基本结构，用 pnpm workspace + changeset 的方案。

创建了 template-vue、template-react、cli、create 这 4 个包，并用 changeset 发到了 npm 仓库，创建了单独的 @guang-cli 的 scope。

安装了 commander 用来解析命令行，并且调用 create 包成功。

最后，本地 npx @guang-cli/cli create 试了下，整个流程是通的。

下节继续实现 create 命令的逻辑。