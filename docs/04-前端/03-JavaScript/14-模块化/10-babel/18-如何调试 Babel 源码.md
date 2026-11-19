---
title: 如何调试 Babel 源码
description: "讲解如何用 VSCode Debugger 调试 Babel 源码：launch.json 配置、resolveSourceMapLocations 对 node_modules sourcemap 的默认排除、映射到 TS 源码目录并在源码中打断点。"
keywords: [如何调试, Babel, 源码]
category: tools
tags: [Babel, 编译, AST, 插件]
---


# 如何调试 Babel 源码？

## 概念说明

遇到对 Babel 内部行为的疑问时，可以通过 VSCode Debugger 直接调试 Babel 源码来寻找答案。本文以调试 `@babel/parser` 包为例，讲解从配置调试环境到映射 TS 源码的完整流程；其余包的调试方式相同。

## Babel api 的基本用法

Babel 的 API 按以下方式使用：

```javascript
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

const source = `
    (async function() {
        console.log('hello guangguang');
    })();
`;

const ast = parser.parse(source);

traverse(ast, {
    StringLiteral(path) {
        path.node.value = path.node.value.replace('guangguang', 'dongdong')
    }
});

const { code, map} = generate(ast, {
    sourceMaps: true
});

console.log(code);
console.log(JSON.stringify(map));
```

流程分为 parse、traverse、generate 三个步骤。traverse 过程中要声明对什么 AST 做什么修改，AST 可以在 [astexplorer.net](https://www.astexplorer.net/#/gist/228d4ae6991065e13d9efe353ade9e6c/2772707aa4a88cf45ffa2a5cf24ad4db8bca1451) 查看——例如上面这部分是 StringLiteral（字符串字面量），修改它的 value 即可。

安装依赖并运行，可以看到打印了修改后的代码和 sourcemap。

目标不是学怎么用 Babel 的 api，而是学怎么调试它的源码。

## 配置 VSCode 调试

在 VSCode 中快速创建 launch.json 调试配置文件，通过 add configuration 创建一个 nodejs 的调试配置，并设置 console 为内置的 terminal：

```json
{
    "type": "node",
    "request": "launch",
    "name": "Launch Program",
    "skipFiles": [
        "<node_internals>/**"
    ],
    "console": "integratedTerminal",
    "program": "${workspaceFolder}/index.js"
}
```

`"console": "integratedTerminal"` 使日志输出在集成的 Terminal 里；否则输出在 Debug Console，颜色之类的信息都会丢失。

打好断点后运行调试，可以看到 parse 之后的 AST、遍历修改时的节点、生成的目标代码。

## 为什么调试到的是编译后的代码

进入这几个包内部调试时会发现，调试到的是这些包**编译之后的代码**。如果代码中有 generator、async/await 之类的语法，调试编译后的代码很难理清逻辑。

怎么调试最初的源码？答案是 sourcemap。

查看 node_modules 下这些包，会发现它们已经有 sourcemap，而且也已关联。但调试时调试到的仍不是源码——这是因为 VSCode 的一个默认配置导致 sourcemap 不生效。

`resolveSourceMapLocations` 配置指定去哪里查找 sourcemap，VSCode Node Debugger 默认不会查找 node_modules 下的 sourcemap，所以就算 babel 的包里带了 sourcemap 也不会生效。

把该配置去掉之后再运行调试，就会发现现在调试的是 babel 的 ts 源码。直接调试可读性更强的 ts 源码，理清实现逻辑就简单很多。

## 让 VSCode 直接定位到源码目录

更进一步，可以在调试 babel 源码时让 VSCode 直接定位到源码的目录。这只要 sourcemap 指向的文件路径在当前 workspace 下即可。

查看当前的路径会发现：虽然调试的已经是源码的 ts 文件，但路径仍在 node_modules 包下。

处理方式：

- 把 babel 项目下载下来，与测试项目放在同一个 workspace 下；
- 到 node_modules 下手动替换 sourcemap 的 sources 路径，例如把 `../src/` 替换为 `/Users/guang/code/babel-debug/babel/packages/babel-parser/src/`；
- 在新的 workspace 创建调试配置，由于目录变了，需要指定 cwd。

再运行调试，sourcemap 指向的路径就直接是 babel 源码下的文件路径，调试时 VSCode 也会直接打开对应文件。

更重要的是，现在可以直接在 babel 源码里打断点，代码执行到相应位置就会断住。

至此就可以顺利调试 babel 源码了。这里调试的是 @babel/parser 包的源码，其余的包也是一样的方式。

## 小结

Babel 分为 parse、traverse（或者叫 transform）、generate 三个阶段，分别对应 @babel/parser、@babel/traverse、@babel/generator 包。

用 VSCode Debugger 调试时，直接断点调试会发现调试的是编译后的代码，但 node_modules 下这几个包都带有 sourcemap。由于默认的 resolveSourceMapLocations 排除了 node_modules 下的 sourcemap，去掉该配置重新跑调试，就可以直接调试 ts 源码。

如果希望调试时直接定位 babel 源码目录的文件，可以把测试项目和 babel 项目放到同一个 workspace，并修改 sourcemap 文件里的 sources 路径；这样就可以直接在 babel 源码里打断点。对 babel 某部分功能的实现感兴趣时，用这个方法即可自行调试源码。
