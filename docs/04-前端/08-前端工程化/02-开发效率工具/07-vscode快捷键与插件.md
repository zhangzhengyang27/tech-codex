---
title: "vscode 快捷键与插件"
description: 整理 VSCode 常用快捷键速查表（以 Windows/Linux 默认键位为主）与前端开发常用插件清单。
keywords: [VSCode, 快捷键, 插件]
category: 前端工程化
tags: [VSCode]
---

# vscode 快捷键与插件

## vscode 快捷键

> 注：以下快捷键为 Windows/Linux 默认键位，macOS 上一般将 `Ctrl` 对应 `Cmd`、`Alt` 对应 `Option`。

| 按键                 | 功能 Function                       |
| -------------------- | ----------------------------------- |
| Ctrl + Shift + P，F1 | 显示命令面板 Show Command Palette   |
| Ctrl + P             | 快速打开 Quick Open                 |
| Ctrl + Shift + N     | 新窗口/实例 New window/instance     |
| Ctrl + Shift + W     | 关闭窗口/实例 Close window/instance |

### 基础编辑

| 按键              | 功能 Function                                               |
| -------------------- | ----------------------------------------------------------- |
| Ctrl+X            | 剪切行（空选定） Cut line (empty selection)                 |
| Ctrl+C            | 复制行（空选定）Copy line (empty selection)                 |
| Alt+ ↑ / ↓        | 向上/向下移动行 Move line up/down                           |
| Shift+Alt + ↓ / ↑ | 向上/向下复制行 Copy line up/down                           |
| Ctrl+Shift+K      | 删除行 Delete line                                          |
| Ctrl+Enter        | 在下面插入行 Insert line below                              |
| Ctrl+Shift+Enter  | 在上面插入行 Insert line above                              |
| Ctrl+Shift+\      | 跳到匹配的括号 Jump to matching bracket                     |
| Ctrl+] / [        | 缩进/缩进行 Indent/outdent line                             |
| Home              | 转到行首 Go to beginning of line                            |
| End               | 转到行尾 Go to end of line                                  |
| Ctrl+Home         | 转到文件开头 Go to beginning of file                        |
| Ctrl+End          | 转到文件末尾 Go to end of file                              |
| Ctrl+↑ / ↓        | 向上/向下滚动行 Scroll line up/down                         |
| Alt+PgUp / PgDown | 向上/向下滚动页面 Scroll page up/down                       |
| Ctrl+Shift+[      | 折叠（折叠）区域 Fold (collapse) region                     |
| Ctrl+Shift+]      | 展开（未折叠）区域 Unfold (uncollapse) region               |
| Ctrl+K Ctrl+[     | 折叠（未折叠）所有子区域 Fold (collapse) all subregions     |
| Ctrl+K Ctrl+]     | 展开（未折叠）所有子区域 Unfold (uncollapse) all subregions |
| Ctrl+K Ctrl+0     | 折叠（折叠）所有区域 Fold (collapse) all regions            |
| Ctrl+K Ctrl+J     | 展开（未折叠）所有区域 Unfold (uncollapse) all regions      |
| Ctrl+K Ctrl+C     | 添加行注释 Add line comment                                 |
| Ctrl+K Ctrl+U     | 删除行注释 Remove line comment                              |
| Ctrl+/            | 切换行注释 Toggle line comment                              |
| Shift+Alt+A       | 切换块注释 Toggle block comment                             |
| Alt+Z             | 切换换行 Toggle word wrap                                   |

### 导航

| 按键               | 功能 Function                                        |
| -------------------- | ---------------------------------------------------- |
| Ctrl + T           | 显示所有符号 Show all Symbols                        |
| Ctrl + G           | 转到行... Go to Line...                              |
| Ctrl + P           | 转到文件... Go to File...                            |
| Ctrl + Shift + O   | 转到符号... Go to Symbol...                          |
| Ctrl + Shift + M   | 显示问题面板 Show Problems panel                     |
| F8                 | 转到下一个错误或警告 Go to next error or warning     |
| Shift + F8         | 转到上一个错误或警告 Go to previous error or warning |
| Ctrl + Shift + Tab | 导航编辑器组历史记录 Navigate editor group history   |
| Alt + ←/→          | 返回/前进 Go back / forward                          |
| Ctrl + M           | 切换选项卡移动焦点 Toggle Tab moves focus            |

### 搜索和替换 Search and replace

| 按键              | 功能 Function                                                |
| -------------------- | ------------------------------------------------------------ |
| Ctrl + F          | 查找 Find                                                    |
| Ctrl + H          | 替换 Replace                                                 |
| F3 / Shift + F3   | 查找下一个/上一个 Find next/previous                         |
| Alt + Enter       | 选择查找匹配的所有出现 Select all occurences of Find match   |
| Ctrl + D          | 将选择添加到下一个查找匹配 Add selection to next Find match  |
| Ctrl + K Ctrl + D | 将最后一个选择移至下一个查找匹配项 Move last selection to next Find match |
| Alt + C / R / W   | 切换区分大小写/正则表达式/整个词 Toggle case-sensitive / regex / whole word |

### 多光标和选择

| 按键                               | 功能 Function                                                |
| -------------------- | ------------------------------------------------------------ |
| Alt +单击                          | 插入光标 Insert cursor                                       |
| Ctrl + Alt +↑/↓                    | 在上/下插入光标 Insert cursor above / below                  |
| Ctrl + U                           | 撤消上一个光标操作 Undo last cursor operation                |
| Shift + Alt + I                    | 在选定的每一行的末尾插入光标 Insert cursor at end of each line selected |
| Ctrl + I                           | 选择当前行 Select current line                               |
| Ctrl + Shift + L                   | 选择当前选择的所有出现 Select all occurrences of current selection |
| Ctrl + F2                          | 选择当前字的所有出现 Select all occurrences of current word  |
| Shift + Alt + →                    | 展开选择 Expand selection                                    |
| Shift + Alt + ←                    | 缩小选择 Shrink selection                                    |
| Shift + Alt + （拖动鼠标）         | 列（框）选择 Column (box) selection                          |
| Ctrl + Shift + Alt +（箭头键）     | 列（框）选择 Column (box) selection                          |
| Ctrl + Shift + Alt + PgUp / PgDown | 列（框）选择页上/下 Column (box) selection page up/down      |

### 丰富的语言编辑

| 按键                 | 功能 Function                                          |
| -------------------- | ------------------------------------------------------ |
| Ctrl + 空格          | 触发建议 Trigger suggestion                            |
| Ctrl + Shift + Space | 触发器参数提示 Trigger parameter hints                 |
| Tab                  | Emmet 展开缩写 Emmet expand abbreviation               |
| Shift + Alt + F      | 格式化文档 Format document                             |
| Ctrl + K Ctrl + F    | 格式选定区域 Format selection                          |
| F12                  | 转到定义 Go to Definition                              |
| Alt + F12            | Peek定义 Peek Definition                               |
| Ctrl + K F12         | 打开定义到边 Open Definition to the side               |
| Ctrl + .             | 快速解决 Quick Fix                                     |
| Shift + F12          | 显示引用 Show References                               |
| F2                   | 重命名符号 Rename Symbol                               |
| Ctrl + Shift + . /， | 替换为下一个/上一个值 Replace with next/previous value |
| Ctrl + K Ctrl + X    | 修剪尾随空格 Trim trailing whitespace                  |
| Ctrl + K M           | 更改文件语言 Change file language                      |

### 编辑器管理 Editor management

| 按键                     | 功能 Function                                                |
| -------------------- | ------------------------------------------------------------ |
| Ctrl+F4, Ctrl+W          | 关闭编辑器 Close editor                                      |
| Ctrl+K F                 | 关闭文件夹 Close folder                                      |
| Ctrl+\                   | 拆分编辑器 Split editor                                      |
| Ctrl+ 1 / 2 / 3          | 聚焦到第1，第2或第3编辑器组 Focus into 1st, 2nd or 3rd editor group |
| Ctrl+K Ctrl+ ←/→         | 聚焦到上一个/下一个编辑器组 Focus into previous/next editor group |
| Ctrl+Shift+PgUp / PgDown | 向左/向右移动编辑器 Move editor left/right                   |
| Ctrl+K ← / →             | 移动活动编辑器组 Move active editor group                    |

### 文件管理

| 按键           | 功能 Function                                                |
| -------------------- | ------------------------------------------------------------ |
| Ctrl+N         | 新文件 New File                                              |
| Ctrl+O         | 打开文件... Open File...                                     |
| Ctrl+S         | 保存 Save                                                    |
| Ctrl+Shift+S   | 另存为... Save As...                                         |
| Ctrl+K S       | 全部保存 Save All                                            |
| Ctrl+F4        | 关闭 Close                                                   |
| Ctrl+K Ctrl+W  | 关闭所有 Close All                                           |
| Ctrl+Shift+T   | 重新打开关闭的编辑器 Reopen closed editor                    |
| Ctrl+K Enter   | 保持打开 Keep Open                                           |
| Ctrl+Tab       | 打开下一个 Open next                                         |
| Ctrl+Shift+Tab | 打开上一个 Open previous                                     |
| Ctrl+K P       | 复制活动文件的路径 Copy path of active file                  |
| Ctrl+K R       | 显示资源管理器中的活动文件 Reveal active file in Explorer    |
| Ctrl+K O       | 显示新窗口/实例中的活动文件 Show active file in new window/instance |

### 显示

| 按键         | 功能 Function                                            |
| -------------------- | -------------------------------------------------------- |
| F11          | 切换全屏 Toggle full screen                              |
| Shift+Alt+1  | 切换编辑器布局 Toggle editor layout                      |
| Ctrl+ = / -  | 放大/缩小 Zoom in/out                                    |
| Ctrl+B       | 切换侧栏可见性 Toggle Sidebar visibility                 |
| Ctrl+Shift+E | 显示浏览器/切换焦点 Show Explorer / Toggle focus         |
| Ctrl+Shift+F | 显示搜索 Show Search                                     |
| Ctrl+Shift+G | 显示Git Show Git                                         |
| Ctrl+Shift+D | 显示调试 Show Debug                                      |
| Ctrl+Shift+X | 显示扩展 Show Extensions                                 |
| Ctrl+Shift+H | 替换文件 Replace in files                                |
| Ctrl+Shift+J | 切换搜索详细信息 Toggle Search details                   |
| Ctrl+Shift+C | 打开新命令提示符/终端 Open new command prompt/terminal   |
| Ctrl+Shift+U | 显示输出面板 Show Output panel                           |
| Ctrl+Shift+V | 切换Markdown预览 Toggle Markdown preview                 |
| Ctrl+K V     | 从旁边打开Markdown预览 Open Markdown preview to the side |

### 调试

| 按键            | 功能 Function               |
| -------------------- | --------------------------- |
| F9              | 切换断点 Toggle breakpoint  |
| F5              | 开始/继续 Start/Continue    |
| Shift+F5        | 停止 Stop                   |
| F11 / Shift+F11 | 下一步/上一步 Step into/out |
| F10             | 跳过 Step over              |
| Ctrl+K Ctrl+I   | 显示悬停 Show hover         |

### 集成终端

| 按键                | 功能 Function                             |
| -------------------- | ----------------------------------------- |
| Ctrl+`              | 显示集成终端 Show integrated terminal     |
| Ctrl+Shift+`        | 创建新终端 Create new terminal            |
| Ctrl+Shift+C        | 复制选定 Copy selection                   |
| Ctrl+Shift+V        | 粘贴到活动端子 Paste into active terminal |
| Ctrl+↑ / ↓          | 向上/向下滚动 Scroll up/down              |
| Shift+PgUp / PgDown | 向上/向下滚动页面 Scroll page up/down     |
| Ctrl+Home / End     | 滚动到顶部/底部 Scroll to top/bottom      |

## 插件

| **名称**                                                     | **简述**                                            |
| ------------------------------------------------------------ | --------------------------------------------------- |
| [Auto Close Tag](https://marketplace.visualstudio.com/items?itemName=formulahendry.auto-close-tag) | 自动闭合HTML标签                                    |
| [Auto Import](https://marketplace.visualstudio.com/items?itemName=steoates.autoimport) | import 提示                                         |
| [Auto Rename Tag](https://marketplace.visualstudio.com/items?itemName=formulahendry.auto-rename-tag) | 修改 HTML 标签时，自动修改匹配的标签                |
| [Babel JavaScript](https://marketplace.visualstudio.com/items?itemName=mgmcdermott.vscode-language-babel) | babel 插件，语法高亮                                |
| [Babelrc](https://marketplace.visualstudio.com/items?itemName=waderyan.babelrc) | .babelrc文件高亮提示                                |
| [Beautify css/sass/scss/less](https://marketplace.visualstudio.com/items?itemName=michelemelluso.code-beautifier) | css/sass/less格式化                                 |
| [Better Align](https://marketplace.visualstudio.com/items?itemName=wwm.better-align) | 对齐赋值符号和注释                                  |
| [Better Comments](https://marketplace.visualstudio.com/items?itemName=aaron-bond.better-comments) | 编写更加人性化的注释                                |
| [Bookmarks](https://marketplace.visualstudio.com/items?itemName=alefragnani.Bookmarks) | 添加行书签                                          |
| [Bracket Lens](https://marketplace.visualstudio.com/items?itemName=wraith13.bracket-lens) | 在闭合的括号处提示括号头部的代码                    |
| [Bracket Pair Colorizer 2](https://marketplace.visualstudio.com/items?itemName=CoenraadS.bracket-pair-colorizer-2) | 用不同颜色高亮显示匹配的括号                        |
| [Can I Use](https://marketplace.visualstudio.com/items?itemName=akamud.vscode-caniuse) | HTML5、CSS3、SVG 的浏览器兼容性检查                 |
| [Code Outline](https://marketplace.visualstudio.com/items?itemName=patrys.vscode-code-outline) | 展示代码结构树                                      |
| [Code Runner](https://marketplace.visualstudio.com/items?itemName=formulahendry.code-runner) | 运行选中代码段（支持多数语言）                      |
| [Code Spell checker](https://marketplace.visualstudio.com/items?itemName=streetsidesoftware.code-spell-checker) | 单词拼写检查                                        |
| [Color Highlight](https://marketplace.visualstudio.com/items?itemName=naumovs.color-highlight) | 颜色值在代码中高亮显示                              |
| [Color Info](https://marketplace.visualstudio.com/items?itemName=bierner.color-info) | 小窗口显示颜色值，rgb,hsl,cmyk,hex等等              |
| [Color Picker](https://marketplace.visualstudio.com/items?itemName=anseki.vscode-color) | 拾色器                                              |
| [CSS-in-JS](https://marketplace.visualstudio.com/items?itemName=paulmolluzzo.convert-css-in-js) | CSS-in-JS 高亮提示和转换                            |
| [Debugger for Chrome](https://marketplace.visualstudio.com/items?itemName=msjsdiag.debugger-for-chrome) | 调试Chrome（已废弃，VSCode 内置 js-debug 已替代）   |
| [Document This](https://marketplace.visualstudio.com/items?itemName=joelday.docthis) | 注释文档生成                                        |
| [DotENV](https://marketplace.visualstudio.com/items?itemName=mikestead.dotenv) | .env文件高亮                                        |
| [Edit csv](https://marketplace.visualstudio.com/items?itemName=janisdd.vscode-edit-csv) | 编辑CSV文件                                         |
| [EditorConfig for VS Code](https://marketplace.visualstudio.com/items?itemName=EditorConfig.EditorConfig) | EditorConfig插件                                    |
| [Emoji](https://marketplace.visualstudio.com/items?itemName=Perkovec.emoji) | 在代码中输入emoji                                   |
| [endy](https://marketplace.visualstudio.com/items?itemName=c75.endy) | 将输入光标跳转到当前行最后面                        |
| [Error Gutters](https://marketplace.visualstudio.com/items?itemName=IgorSbitnev.error-gutters) | 在行号处提示错误代码                                |
| [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) | ESLint插件，高亮提示                                |
| [File Peek](https://marketplace.visualstudio.com/items?itemName=abierbaum.vscode-file-peek) | 根据路径字符串，快速定位到文件                      |
| [File Size](https://marketplace.visualstudio.com/items?itemName=mkxml.vscode-filesize) | 状态栏显示当前文件大小                              |
| [Find-Jump](https://marketplace.visualstudio.com/items?itemName=mksafi.find-jump) | 快速跳转到指定单词位置                              |
| [Font-awesome codes for html](https://marketplace.visualstudio.com/items?itemName=medzhidov.font-awesome-codes-html) | Font Awesome 类名/代码提示                          |
| [ftp-sync](https://marketplace.visualstudio.com/items?itemName=lukasz-wronski.ftp-sync) | 同步文件到ftp                                       |
| [Git Blame](https://marketplace.visualstudio.com/items?itemName=waderyan.gitblame) | 在状态栏显示当前行的Git信息                         |
| [Git File History](https://marketplace.visualstudio.com/items?itemName=pomber.git-file-history) | 快速浏览单文件历史提交变动                          |
| [Git Graph](https://marketplace.visualstudio.com/items?itemName=mhutchie.git-graph) | Git图形化视图，方便浏览和操作                       |
| [Git History(git log)](https://marketplace.visualstudio.com/items?itemName=donjayamanne.githistory) | 查看git log                                         |
| [Git Tree Compare](https://marketplace.visualstudio.com/items?itemName=letmaik.git-tree-compare) | Git树形比对，查看不同分支的差异                     |
| [gitignore](https://marketplace.visualstudio.com/items?itemName=codezombiech.gitignore) | .gitignore文件语法                                  |
| [GitLens](https://marketplace.visualstudio.com/items?itemName=eamodio.gitlens) | 显示文件最近的commit和作者，显示当前行commit信息    |
| [GraphQL for VSCode](https://marketplace.visualstudio.com/items?itemName=kumar-harsh.graphql-for-vscode) | graphql高亮和提示                                   |
| [Guides](https://marketplace.visualstudio.com/items?itemName=spywhere.guides) | 高亮缩进基准线                                      |
| [Gulp Snippets](https://marketplace.visualstudio.com/items?itemName=tanato.vscode-gulp) | Gulp代码段                                          |
| [Highlight Matching Tag](https://marketplace.visualstudio.com/items?itemName=vincaslt.highlight-matching-tag) | 高亮匹配选中的标签                                  |
| [HTML CSS Support](https://marketplace.visualstudio.com/items?itemName=ecmel.vscode-html-css) | css提示（支持vue）                                  |
| [HTMLHint](https://marketplace.visualstudio.com/items?itemName=mkaufman.HTMLHint) | HTML格式提示                                        |
| [htmltagwrap](https://marketplace.visualstudio.com/items?itemName=bradgashler.htmltagwrap) | 快捷包裹html标签                                    |
| [Import Beautify](https://marketplace.visualstudio.com/items?itemName=varharrie.import-beautify) | import分组、排序、格式化                            |
| [Import Cost](https://marketplace.visualstudio.com/items?itemName=wix.vscode-import-cost) | 行内显示导入（import/require）的包的大小            |
| [Indenticator](https://marketplace.visualstudio.com/items?itemName=SirTori.indenticator) | 缩进高亮                                            |
| [IntelliSense for css class names](https://marketplace.visualstudio.com/items?itemName=Zignd.html-css-class-completion) | css class输入提示                                   |
| [JavaScript (ES6) code snippets](https://marketplace.visualstudio.com/items?itemName=xabikos.JavaScriptSnippets) | ES6语法代码段                                       |
| [Jest Runner](https://marketplace.visualstudio.com/items?itemName=firsttris.vscode-jest-runner) | 支持执行Jest单个测试文件或单个用例                  |
| [JS Refactor](https://marketplace.visualstudio.com/items?itemName=cmstead.jsrefactor) | 代码重构工具，提取函数、变量重命名等等              |
| [JSON to TS](https://marketplace.visualstudio.com/items?itemName=MariusAlchimavicius.json-to-ts) | JSON 结构转化为 typescript 的 interface             |
| [JSON Tools](https://marketplace.visualstudio.com/items?itemName=eriklynd.json-tools) | 格式化和压缩 JSON                                   |
| [jumpy](https://marketplace.visualstudio.com/items?itemName=wmaurer.vscode-jumpy) | 快速跳转到指定单词位置                              |
| [language-stylus](https://marketplace.visualstudio.com/items?itemName=sysoev.language-stylus) | Stylus语法高亮和提示                                |
| [Less IntelliSense](https://marketplace.visualstudio.com/items?itemName=mrmlnc.vscode-less) | less变量与混合提示                                  |
| [Lodash](https://marketplace.visualstudio.com/items?itemName=oysun.Lodash) | Lodash代码段                                        |
| [Log Wrapper](https://marketplace.visualstudio.com/items?itemName=chrisvltn.log-wrapper-for-vscode) | 生产打印选中变量的代码                              |
| [markdownlint](https://marketplace.visualstudio.com/items?itemName=DavidAnson.vscode-markdownlint) | Markdown格式提示                                    |
| [MochaSnippets](https://marketplace.visualstudio.com/items?itemName=Alan.MochaSnippets) | Mocha 代码段                                        |
| [Node modules resolve](https://marketplace.visualstudio.com/items?itemName=naumovs.node-modules-resolve) | 快速导航到 Node 模块                                |
| [npm Intellisense](https://marketplace.visualstudio.com/items?itemName=christian-kohler.npm-intellisense) | 导入模块时，提示已安装模块名称                      |
| [Output Colorizer](https://marketplace.visualstudio.com/items?itemName=IBM.output-colorizer) | 彩色输出信息                                        |
| [Partial Diff](https://marketplace.visualstudio.com/items?itemName=ryu1kn.partial-diff) | 对比两段代码或文件                                  |
| [Parameter Hints](https://marketplace.visualstudio.com/items?itemName=DominicVonk.parameter-hints) | 在函数调用处指示参数名称                            |
| [Path Autocomplete](https://marketplace.visualstudio.com/items?itemName=ionutvmi.path-autocomplete) | 路径完成提示                                        |
| [Path Intellisense](https://marketplace.visualstudio.com/items?itemName=christian-kohler.path-intellisense) | 另一个路径完成提示                                  |
| [Polacode](https://marketplace.visualstudio.com/items?itemName=pnp.polacode) | 将代码生成图片                                      |
| [PostCss Sorting](https://marketplace.visualstudio.com/items?itemName=mrmlnc.vscode-postcss-sorting) | css排序                                             |
| [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) | prettier 官方插件                                   |
| [Prettify JSON](https://marketplace.visualstudio.com/items?itemName=mohsen1.prettify-json) | 格式化 JSON                                         |
| [Project Manager](https://marketplace.visualstudio.com/items?itemName=alefragnani.project-manager) | 快速切换项目                                        |
| [Quokka.js](https://marketplace.visualstudio.com/items?itemName=WallabyJs.quokka-vscode) | 不需要手动运行，行内显示变量结果                    |
| [Rainbow CSV](https://marketplace.visualstudio.com/items?itemName=mechatroner.rainbow-csv) | CSV文件使用彩虹色渲染不同列                         |
| [React Native Storybooks](https://marketplace.visualstudio.com/items?itemName=Orta.vscode-react-native-storybooks) | storybook预览插件，支持react                        |
| [React Playground](https://marketplace.visualstudio.com/items?itemName=wmira.react-playground-vscode) | 为编辑器提供一个react组件运行环境，方便调试         |
| [React Standard Style code snippets](https://marketplace.visualstudio.com/items?itemName=TimonVS.ReactSnippetsStandard) | react standard 风格代码块                             |
| [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) | 发送REST风格的HTTP请求                              |
| [Sass](https://marketplace.visualstudio.com/items?itemName=robinbentley.sass-indented) | sass插件                                            |
| [Settings Sync](https://marketplace.visualstudio.com/items?itemName=Shan.code-settings-sync) | VSCode设置同步到Gist                                |
| [Sort lines](https://marketplace.visualstudio.com/items?itemName=Tyriar.sort-lines) | 排序选中行                                          |
| [Sort Typescript Imports](https://marketplace.visualstudio.com/items?itemName=miclo.sort-typescript-imports) | typescript的import排序                              |
| [String Manipulation](https://marketplace.visualstudio.com/items?itemName=marclipovsky.string-manipulation) | 字符串转换处理（驼峰、大写开头、下划线等等）        |
| [stylelint](https://marketplace.visualstudio.com/items?itemName=shinnn.stylelint) | css/sass/less代码风格                               |
| [SVG Viewer](https://marketplace.visualstudio.com/items?itemName=cssho.vscode-svgviewer) | SVG查看器                                           |
| [Test Spec Generator](https://marketplace.visualstudio.com/items?itemName=rintoj.chai-spec-generator) | 测试用例生成（支持chai、should、jasmine）           |
| [TODO Parser](https://marketplace.visualstudio.com/items?itemName=minhthai.vscode-todo-parser) | Todo 管理                                           |
| [Todo Todo Tree](https://marketplace.visualstudio.com/items?itemName=Gruntfuggly.todo-tree) | 收集代码中的TODO注释，支持快速搜索                  |
| [Toggle Quotes](https://marketplace.visualstudio.com/items?itemName=BriteSnow.vscode-toggle-quotes) | 切换JS中的引号，" -> ' -> `                         |
| [TS/JS postfix completion](https://marketplace.visualstudio.com/items?itemName=ipatalas.vscode-postfix-ts) | ts/js后缀提示                                       |
| [TSLint](https://marketplace.visualstudio.com/items?itemName=eg2.tslint) | TypeScript语法检查                                  |
| [Types auto installer](https://marketplace.visualstudio.com/items?itemName=jvitor83.types-autoinstaller) | 自动安装[@types](https://github.com/types) 声明依赖 |
| [TypeScript Hero](https://marketplace.visualstudio.com/items?itemName=rbbit.typescript-hero) | TypeScript辅助插件，管理import、outline等等         |
| [TypeScript Import](https://marketplace.visualstudio.com/items?itemName=kevinmcgowan.TypeScriptImport) | TS自动import                                        |
| [TypeScript Import Sorter](https://marketplace.visualstudio.com/items?itemName=mike-co.import-sorter) | import整理排序                                      |
| [Typescript React code snippets](https://marketplace.visualstudio.com/items?itemName=infeng.vscode-react-typescript) | React Typescript代码段                              |
| [TypeSearch](https://marketplace.visualstudio.com/items?itemName=lucasschejtman.vscode-typesearch) | TS声明文件搜索                                      |
| [Version Lens](https://marketplace.visualstudio.com/items?itemName=pflannery.vscode-versionlens) | package.json文件显示模块当前版本和最新版本          |
| [Wallaby.js](https://marketplace.visualstudio.com/items?itemName=WallabyJs.wallaby-vscode) | 实时测试插件                                        |
| [Volar](https://marketplace.visualstudio.com/items?itemName=johnsoncodehk.volar) | Vue 插件，支持Vue3                                  |
| [View Node Package](https://marketplace.visualstudio.com/items?itemName=dkundel.vscode-npm-source) | 快速打开选中模块的主页和代码仓库                    |
| [Visual Studio IntelliCode](https://marketplace.visualstudio.com/items?itemName=VisualStudioExptTeam.vscodeintellicode) | 基于AI的代码提示                                    |
| [VS Live Share](https://marketplace.visualstudio.com/items?itemName=ms-vsliveshare.vsliveshare) | 实时多人协助                                        |
| [VSCode Great Icons](https://marketplace.visualstudio.com/items?itemName=emmanuelbeziat.vscode-great-icons) | 文件图标拓展                                        |
| [vscode-database](https://marketplace.visualstudio.com/items?itemName=bajdzis.vscode-database) | 操作数据库，支持mysql和postgres                     |
| [vscode-icons](https://marketplace.visualstudio.com/items?itemName=robertohuertasm.vscode-icons) | 文件图标，方便定位文件                              |
| [vscode-random](https://marketplace.visualstudio.com/items?itemName=jrebocho.vscode-random) | 随机字符串生成器                                    |
| [vscode-spotify](https://marketplace.visualstudio.com/items?itemName=shyykoserhiy.vscode-spotify) | 集成 spotify，播放音乐                              |
| [vscode-styled-components](https://marketplace.visualstudio.com/items?itemName=jpoissonnier.vscode-styled-components) | styled-components高亮支持                           |
| [vscode-styled-jsx](https://marketplace.visualstudio.com/items?itemName=blanu.vscode-styled-jsx) | styled-jsx高亮支持                                  |
| [Vue Peek](https://marketplace.visualstudio.com/items?itemName=dariofuzinato.vue-peek) | 支持跳转到Vue组件定义文件                           |
| [Vue TypeScript Snippets](https://marketplace.visualstudio.com/items?itemName=ducksoupdev.Vue2) | Vue Typescript代码段                                |
| [Wrap Console Log Lite](https://marketplace.visualstudio.com/items?itemName=ergenekonyigit.vscode-wrap-console-log-lite) | 对选中代码快速console.log                           |                                



