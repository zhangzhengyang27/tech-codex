---
title: "vscode 设置"
description: 介绍 VSCode 的安装与重置、主题风格、常用插件、Prettier 与用户代码片段配置，以及插件性能查看、Emmet 提示慢、CPU 占用高等常见问题的处理方法。
keywords: [VSCode, 设置, 插件]
category: 前端工程化
tags: [VSCode]
---

# vscode 设置

Microsoft 在 2015 年 4 月 29 日 Build 开发者大会上正式宣布了 Visual Studio Code 项目：一个运行于 Mac OS X、Windows 和 Linux 之上的，针对于编写现代 Web 和云应用的跨平台源代码编辑器。VSCode 是微软推出的跨平台、扩展组件丰富的文本编辑器
官方提供 [稳定的发行版本](https://code.visualstudio.com/) 与 [最新测试版本](https://code.visualstudio.com/insiders/) 两个版本

> 苹果M芯片电脑，记得选择 **Apple silicon** 版本，拥有更好的性能

## 彻底删除 
有时编辑器安装插件过多，造成异常时就需要重置 VSCODE。
> 重置前将安装的插件和热键备份，在下次重装时就省很多事情，具体操作方式请看下面的章节

### mac

1.  首先删除 vscode 软件（可以使用腾讯柠檬清理删除） 
2.  执行以下命令删除 vscode 本地数据 
```bash
rm -rf ~/Library/Application\ Support/Code
rm -rf ~/.vscode
```

3.  如果是 insider 版本执行以下命令删除本地数据 
```
rm -rf ~/Library/Application\ Support/Code\ -\ Insiders/
rm -rf ~/.vscode-insiders/
```
### Windows

1. 首先删除 vscode 软件
2. Windows 系统删除以下文件夹
```
C:\Users\用户名\.vscode
C:\Users\用户名\AppData\Roaming\Code
```
## 风格界面 
中文语言，扩展中搜索 `chinese` 即中文语言包。重启 vscode 工具完成 
### 设置风格 
下面的风格插件都不错，里面有多个主题

1. [Monokai Pro](https://marketplace.visualstudio.com/items?itemName=monokai.theme-monokai-pro-vscode)
2. [One Dark Pro](https://marketplace.visualstudio.com/items?itemName=zhuangtongfa.Material-theme)
3. [Ayu](https://marketplace.visualstudio.com/items?itemName=teabyii.ayu)
4. [Material Theme](https://marketplace.visualstudio.com/items?itemName=Equinusocio.vsc-material-theme)

推荐使用 Monokai Pro（Filter Octagon）
### 截屏模式 
该模式可以将按钮与鼠标操作在屏幕上显示，非常适合讲解使用
开启方式为 `Ctrl+Shift+P`（macOS 为 `Cmd+Shift+P`）后输入 `screen`，选择「切换截屏模式」
在 设置>工作台>截屏模式 中对截屏模式进行设置
![image.png](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202405171601553.png)

## 插件
### 文件创建 Dyno File Utils
安装插件然后定义热键
![image.png](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202405171601374.png)

### scss 转换 css
SCSS IntelliSense 插件是 scss 语法高亮插件
scss-to-css 插件 是 scss 转换为 css 的插件
### CodeGeeX
CodeGeeX 是一款基于大模型的智能编程助手，它可以实现代码的生成与补全，自动为代码添加注释，不同编程语言的代码间实现互译，针对技术和代码问题的智能问答，当然还包括代码解释，生成单元测试，实现代码审查，修复代码 bug 等非常丰富的功能
### Project Manager
项目管理器
## prettier 
代码格式化使用 [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) 处理，需要在项目根目录创建配置文件`.prettierrc`，记得将配置文件提交到版本库中，这样可以使项目成员使用统一的格式化配置
```json
{
  "arrowParens": "always",
  "bracketSameLine": true,
  "bracketSpacing": true,
  "embeddedLanguageFormatting": "auto",
  "htmlWhitespaceSensitivity": "css",
  "insertPragma": false,
  "jsxSingleQuote": false,
  "printWidth": 120,
  "proseWrap": "never",
  "quoteProps": "as-needed",
  "requirePragma": false,
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "all",
  "useTabs": false,
  "vueIndentScriptAndStyle": false,
  "singleAttributePerLine": false
}
```
更多配置请参考官方文档 [https://prettier.io/docs/en/options.html](https://prettier.io/docs/en/options.html)
## 用户代码片段 
`vscode` 提供自定义代码片段功能，使用还是很方便的。但是定义好的代码片段，只能在 vscode 中使用
```
prefix      :这个参数是使用代码段的快捷入口,比如这里的log在使用时输入log会有智能感知.
body        :这个是代码段的主体.需要设置的代码放在这里,字符串间换行的话使用\r\n换行符隔开.注意如果值里包含特殊字符需要进行转义.
　　　　　　　 多行语句的以,隔开
$1          :这个为光标的所在位置.
$2          :使用这个参数后会光标的下一位置将会另起一行,按tab键可进行快速切换,还可以有$3,$4,$5.....
description :代码段描述,在使用智能感知时的描述
```
下面自定义一个代码片段，当输入 `zzy` 并按 `tab` 键后自动输出 `zhangzhengyang.com`
```json
{
  "Print to console": {
    "prefix": "zzy",
    "body": [
      "zhangzhengyang.com",
    ],
    "description": "输出 zhangzhengyang.com"
  }
}
```
## 文件整理 
vscode 的资源管理器中文件特别多，但有些文件不是经常使用的，可以在 `.vscode/settings.json` 文件声明将文件编成一组。
```json
{
  ...
  "explorer.fileNesting.enabled": true,
  "explorer.fileNesting.expand": false,
  "explorer.fileNesting.patterns": {
    "tsconfig.json": "*.json, *.config.js, *.config.ts,*.cjs",
    "README.md": ".git*, .eslint*, .prettier*, .stylelint*, commitlint*, .editorconfig,LICENSE,pnpm*,.npm*"
  }
}
```
## 工作区 
有时希望开发时在一个 VS 编辑器中同时编辑多个文件，这时候可以使用工作区来管理

1. 创建文件 xiaoye 并用 VSCODE 打开
2. 然后选择 **将工作区另存为** 操作，保存到 xiaoye 目录即可
3. 再次打开 xiaoye/vue3 文件夹
4. 然后选择 **将文件夹添加到工作区**
## 其他常见问题
### 插件性能查看 
通过命令面板执行 `Show Running Extensions`（显示正在运行的扩展）可以查看运行中的插件，执行结果如下 
![image.png](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202405171601395.png)

### Emmet 提示慢
如果在 vue 等文件中出现输入 html 标签需要很长时间才出现代码提示，通过以下配置可以优化速度
```json
"emmet.includeLanguages": {
  "javascript": "javascriptreact",
  "vue-html": "html",
  "vue": "html"
},
"emmet.excludeLanguages": [
  "markdown"
]
```
### cpu 占用高 
vscode 会在后台监测文件，可能会出现以下进程 cpu 占用过高，造成电脑发热严重
在 vscode 配置中修改以下配置项，将 node_modules 等扩展包目录排除掉

- **files.exclude**
- **search.exclude**
- **files.watcherExclude**
```json
"intelephense.files.exclude": [
  "**/.git/**",
  "**/.svn/**",
  "**/.hg/**",
  "**/CVS/**",
  "**/.DS_Store/**",
  "**/node_modules/**",
  "**/bower_components/**",
  "**/vendor/**/{Tests,tests}/**",
  "**/.history/**",
  "**/vendor/**/vendor/**",
  "**/dist/**"
],
"files.exclude": {
  "*.code-workspace": true,
  "**/dist": true,
  "**/node_modules": true,
  "**/public/js/app.js": true,
  "**/unpackage": true,
  "**/vendor.js": true,
  ".github": true,
  ".vscode": true
},
"files.watcherExclude": {
  "**/dist/**": true,
  "**/node_modules/**": true,
  "**/node_modules/*/**": false,
  "**/vendor/**": true
},
"search.exclude": {
  "*.code-workspace": true,
  "**/dist": true,
  "**/vendor": true,
  "**/node_modules": true
}
```
### 移除不需要的 import 
希望在保存时移除不需要的 import ，提供两种方式

1. 热键定义

查找热键定义 `organizeImports`，然后设置为你想要的热键
![image.png](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202405171600666.png)

2. 全局配置定义
```json
"editor.codeActionsOnSave": {
  "source.organizeImports": true
}
```

