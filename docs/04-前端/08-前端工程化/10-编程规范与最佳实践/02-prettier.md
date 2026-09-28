---
description: Prettier 代码格式化工具的配置与团队集成
keywords: [Prettier, 代码格式化, 编程规范]
category: 前端工程化
title: "prettier"
---
# prettier

prettier 官方文档

- https://prettier.io/
- https://prettier.io/docs/en/install.html

```bash
npm install --save-dev --save-exact prettier

yarn add --dev --exact prettier

pnpm add --save-dev --save-exact prettier
```

创建 .prettierignore 文件

```bash
# .prettierignore 文件配置
/dist
/.vscode
node_modules
.eslintrc.js
package.json
package-lock.json
components.d.ts
```

创建 .prettierrc 文件，在线配置 https://prettier.io/playground/

```jsonc
{
   "arrowParens": "always", // 箭头函数，只有一个参数的时候，也需要括号
   "bracketSameLine": true,
   "bracketSpacing": false, // 对象是否有空格,值true `{ name: 'zhongyi' }` false {name: 'zhongyi'}
   "embeddedLanguageFormatting": "auto",
   "htmlWhitespaceSensitivity": "css", // 根据显示样式决定 html 要不要折行
   "jsxSingleQuote": false, // jsx属性值是否为单引号，不为单引号
   "printWidth": 120, // 超出120个字符就换行
   "proseWrap": "preserve", // 使用默认的折行标准
   "quoteProps": "as-needed", // 对象的 key 仅在必要时用引号
   "insertPragma": false, // 不在文件开头自动插入 @prettier 标记
   "requirePragma": false, // 不要求文件包含 @prettier 标记才会被格式化
   "semi": true, // 末尾增加分号";"
   "singleQuote": true,// 使用单引号
   "tabWidth": 2, // 缩进字符（两个）
   "trailingComma": "none",// 对象后面 不需要逗号","
   "useTabs": false, // 不使用tab缩进
   "vueIndentScriptAndStyle": false
 }
```

检查有哪些文件还没有格式化

```bash
npx prettier --check .
```

使用 prettier 格式化所有的文件

```bash
npx prettier --write .
```