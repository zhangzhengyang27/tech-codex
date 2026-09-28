---
title: ESLint 代码检查
description: ESLint 的规则、插件、解析器与可共享配置的工程化落地
keywords: [Node.js, 构建, 脚手架, ESLint]
category: Node.js
tags: [Node.js, 工程化]
---







# ESLint 代码检查

## 介绍

ESLint 是一个开源的 JavaScript 代码检查工具，用于识别和报告代码中的问题，并强制执行一致的编码风格。由 Nicholas C. Zakas 于 2013 年创建，现已成为 JavaScript 生态系统中最流行的代码质量工具之一。

### 核心特性

- **代码质量检查**：识别潜在的错误、不规范的写法和反模式
- **代码风格统一**：强制执行一致的编码风格，提高代码可读性
- **高度可配置**：支持自定义规则、插件和配置共享
- **多语言支持**：原生支持 JavaScript，通过插件支持 TypeScript、Vue、React 等
- **编辑器集成**：与主流编辑器深度集成，实时提示问题
- **自动修复**：部分问题支持自动修复

### 与其他工具对比

| 工具 | 主要用途 | 特点 |
|------|---------|------|
| ESLint | 代码质量 + 代码风格 | 高度可配置，插件生态丰富 |
| Prettier | 代码格式化 | 开箱即用，格式化能力强 |
| TSLint | TypeScript 检查 | 已弃用，推荐使用 ESLint |

## 工作原理

```
源代码 → 解析器(AST) → 遍历节点 → 规则检查 → 输出结果
```

1. **解析（Parse）**：解析器将源代码转换为抽象语法树（AST）
2. **遍历（Traverse）**：遍历 AST 的每个节点
3. **检查（Lint）**：对每个节点应用配置的规则进行检查
4. **输出（Report）**：收集并输出检查结果

## 安装与配置

### 安装

```bash
# npm
npm install eslint --save-dev

# pnpm
pnpm add eslint -D

# yarn
yarn add eslint -D
```

### 初始化配置

```bash
# 交互式配置向导
npx eslint --init

# 快速创建基础配置
echo '{}' > .eslintrc.json
```

初始化时会询问：
- 使用场景（仅检查语法/检查语法和问题/检查语法、问题和代码风格）
- 模块类型（ES Modules / CommonJS）
- 使用的框架（React / Vue / None）
- 使用 TypeScript（Yes / No）
- 代码运行环境（Browser / Node）
- 配置文件格式（JavaScript / YAML / JSON）

## 配置文件详解

ESLint 支持多种配置文件格式，按优先级排序：

1. `.eslintrc.js`
2. `.eslintrc.cjs`
3. `.eslintrc.yaml`
4. `.eslintrc.yml`
5. `.eslintrc.json`
6. `package.json` 中的 `eslintConfig` 字段

### 传统配置格式（`.eslintrc.js`）

```javascript
module.exports = {
  // 运行环境
  env: {
    browser: true,    // 浏览器全局变量
    es2021: true,     // ES2021 语法
    node: true,       // Node.js 全局变量
    jest: true        // Jest 测试框架
  },

  // 继承配置
  extends: [
    'eslint:recommended',                      // ESLint 推荐规则
    'plugin:@typescript-eslint/recommended',   // TS 推荐规则
    'plugin:vue/vue3-recommended'              // Vue3 推荐规则
  ],

  // 解析器
  parser: '@typescript-eslint/parser',

  // 解析器选项
  parserOptions: {
    ecmaVersion: 'latest',  // ECMAScript 版本
    sourceType: 'module',   // 模块类型
    ecmaFeatures: {
      jsx: true             // 支持 JSX
    }
  },

  // 插件
  plugins: [
    '@typescript-eslint',
    'import'
  ],

  // 规则配置
  rules: {
    // 规则配置
  },

  // 全局变量
  globals: {
    MyGlobal: 'readonly'
  },

  // 覆盖配置
  overrides: [
    {
      files: ['*.test.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ],

  // 忽略模式
  ignorePatterns: ['dist/', 'node_modules/']
}
```

### 扁平配置格式（`eslint.config.js`）

ESLint 8.21+ 引入、9.0 起成为默认的新配置格式，更加灵活：

```javascript
import js from '@eslint/js'
import ts from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import importPlugin from 'eslint-plugin-import'

export default [
  // 忽略文件
  {
    ignores: ['dist/**', 'node_modules/**', '*.min.js']
  },

  // 基础推荐配置
  js.configs.recommended,

  // TypeScript 文件配置
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      },
      globals: {
        console: 'readonly',
        process: 'readonly'
      }
    },
    plugins: {
      '@typescript-eslint': ts,
      'import': importPlugin
    },
    rules: {
      ...ts.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      'import/order': 'error'
    }
  },

  // 测试文件配置
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
]
```

### 配置项说明

#### `env` - 环境配置

```javascript
env: {
  browser: true,      // window, document 等
  node: true,         // global, process 等
  es2021: true,       // Promise, Symbol 等
  es2022: true,       // Array.at() 等
  worker: true,       // WebWorker 环境
  serviceworker: true,// Service Worker 环境
  jest: true,         // Jest 全局变量
  mocha: true,        // Mocha 全局变量
  jquery: true        // jQuery 全局变量
}
```

#### `extends` - 继承配置

```javascript
extends: [
  // ESLint 内置
  'eslint:recommended',        // 推荐规则
  'eslint:all',                // 所有规则

  // TypeScript
  'plugin:@typescript-eslint/recommended',
  'plugin:@typescript-eslint/recommended-requiring-type-checking',

  // Vue
  'plugin:vue/vue3-essential',     // 基础规则
  'plugin:vue/vue3-strongly-recommended',  // 强烈推荐
  'plugin:vue/vue3-recommended',   // 推荐

  // React
  'plugin:react/recommended',
  'plugin:react-hooks/recommended',

  // Prettier（必须放最后）
  'plugin:prettier/recommended'
]
```

#### `plugins` - 插件配置

```javascript
plugins: [
  '@typescript-eslint',  // TypeScript 支持
  'vue',                 // Vue 支持
  'react',               // React 支持
  'react-hooks',         // React Hooks 规则
  'import',              // ES6 import/export 规则
  'promise',             // Promise 最佳实践
  'unicorn',             // 更严格的规则
  'jsdoc'                // JSDoc 注释规则
]
```

## 常用规则配置

规则严重级别：
- `"off"` 或 `0`：关闭规则
- `"warn"` 或 `1`：警告（不影响退出码）
- `"error"` 或 `2`：错误（退出码为 1）

### 错误预防规则

```javascript
rules: {
  // 禁止未使用的变量
  'no-unused-vars': ['error', {
    vars: 'all',           // 检查全局变量
    args: 'after-used',    // 只检查使用的参数之后的参数
    ignoreRestSiblings: true
  }],

  // 禁止 console
  'no-console': ['warn', {
    allow: ['warn', 'error', 'info']  // 允许的方法
  }],

  // 禁止 debugger
  'no-debugger': 'error',

  // 禁止重复导入
  'no-duplicate-imports': 'error',

  // 禁止空块语句
  'no-empty': 'error',

  // 禁止将变量初始化为 undefined
  'no-undef-init': 'error',

  // 禁止不必要的布尔转换
  'no-extra-boolean-cast': 'error',

  // 禁止不必要的 return
  'no-useless-return': 'error',

  // 要求使用 === 和 !==
  'eqeqeq': ['error', 'always', {
    null: 'ignore'  // 允许 == null
  }],

  // 禁止意外的多行表达式
  'no-unexpected-multiline': 'error',

  // 禁止在 return 语句中使用赋值语句
  'no-return-assign': 'error',

  // 禁止对 function 声明重新赋值
  'no-func-assign': 'error'
}
```

### 代码风格规则

```javascript
rules: {
  // 缩进
  'indent': ['error', 2, {
    SwitchCase: 1,           // switch case 缩进
    VariableDeclarator: 1,   // 变量声明缩进
    outerIIFEBody: 1
  }],

  // 引号类型
  'quotes': ['error', 'single', {
    avoidEscape: true,       // 允许字符串内使用双引号
    allowTemplateLiterals: true
  }],

  // 分号
  'semi': ['error', 'always', {
    omitLastInOneLineBlock: true
  }],

  // 尾随逗号
  'comma-dangle': ['error', {
    arrays: 'never',
    objects: 'never',
    imports: 'never',
    exports: 'never',
    functions: 'never'
  }],

  // 空格
  'keyword-spacing': 'error',
  'space-before-blocks': 'error',
  'space-infix-ops': 'error',
  'comma-spacing': 'error',
  'key-spacing': 'error',

  // 大括号风格
  'brace-style': ['error', '1tbs', {
    allowSingleLine: true
  }],

  // 块内空行
  'padded-blocks': ['error', 'never'],

  // 函数括号前空格
  'space-before-function-paren': ['error', {
    anonymous: 'always',
    named: 'never',
    asyncArrow: 'always'
  }],

  // 对象字面量缩进
  'object-curly-spacing': ['error', 'always'],

  // 数组元素换行
  'array-element-newline': ['error', 'consistent'],

  // 函数参数换行
  'function-paren-newline': ['error', 'consistent']
}
```

### 最佳实践规则

```javascript
rules: {
  // 要求使用 const 声明不会被重新赋值的变量
  'prefer-const': 'error',

  // 禁止使用 var
  'no-var': 'error',

  // 要求使用箭头函数
  'prefer-arrow-callback': 'error',

  // 要求使用模板字面量
  'prefer-template': 'error',

  // 禁止使用 new Symbol
  'no-new-symbol': 'error',

  // 要求 Symbol 有描述
  'symbol-description': 'error',

  // 禁止对 const 重新赋值
  'no-const-assign': 'error',

  // 要求块级注释
  'spaced-comment': ['error', 'always', {
    markers: ['/', '*']  // 允许的标记
  }],

  // 禁止多行字符串
  'no-multi-str': 'error',

  // 要求构造函数首字母大写
  'new-cap': 'error'
}
```

### TypeScript 专用规则

```javascript
rules: {
  // 禁止使用 any
  '@typescript-eslint/no-explicit-any': 'warn',

  // 要求函数返回类型
  '@typescript-eslint/explicit-function-return-type': ['error', {
    allowExpressions: true,
    allowTypedFunctionExpressions: true
  }],

  // 禁止未使用的变量
  '@typescript-eslint/no-unused-vars': ['error', {
    argsIgnorePattern: '^_',
    varsIgnorePattern: '^_'
  }],

  // 要求成员有明确的可访问性修饰符
  '@typescript-eslint/explicit-member-accessibility': 'error',

  // 禁止使用 require
  '@typescript-eslint/no-require-imports': 'error',

  // 要求使用 import type
  '@typescript-eslint/consistent-type-imports': 'error',

  // 数组类型使用 T[]
  '@typescript-eslint/array-type': ['error', 'array'],

  // 禁止不必要的命名空间限定
  '@typescript-eslint/no-unnecessary-qualifier': 'error',

  // 要求枚举值全大写
  '@typescript-eslint/naming-convention': [
    'error',
    {
      selector: 'enumMember',
      format: ['UPPER_CASE']
    }
  ]
}
```

### Vue 专用规则

```javascript
rules: {
  // 组件名称多词
  'vue/multi-word-component-names': 'error',

  // v-for 必须有 v-bind:key
  'vue/require-v-for-key': 'error',

  // 禁止 v-if 和 v-for 同时使用
  'vue/no-use-v-if-with-v-for': 'error',

  // 要求组件名称大写
  'vue/component-name-in-template-casing': ['error', 'PascalCase'],

  // 要求 Prop 有类型定义
  'vue/require-prop-types': 'error',

  // 禁止在模板中使用 this
  'vue/this-in-template': 'error',

  // 属性顺序
  'vue/attributes-order': 'error',

  // 要求 v-bind 指令样式
  'vue/v-bind-style': 'error'
}
```

### Import 规则

```javascript
rules: {
  // 导入顺序
  'import/order': ['error', {
    groups: [
      'builtin',   // Node 内置模块
      'external',  // 外部模块
      'internal',  // 内部模块
      'parent',    // 父级目录
      'sibling',   // 同级目录
      'index',     // 当前目录
      'type'       // 类型导入
    ],
    'newlines-between': 'always',
    alphabetize: {
      order: 'asc',
      caseInsensitive: true
    }
  }],

  // 禁止重复导出
  'import/export': 'error',

  // 禁止默认导出
  'import/no-default-export': 'off',

  // 要求导出在文件末尾
  'import/exports-last': 'error',

  // 禁止循环依赖
  'import/no-cycle': 'error',

  // 禁止绝对路径导入
  'import/no-absolute-path': 'error',

  // 首选命名导出
  'import/prefer-default-export': 'off'
}
```

## 命令行使用

### 基本命令

```bash
# 检查文件
eslint file.js

# 检查目录
eslint src/

# 检查指定类型文件
eslint src --ext .js,.ts,.vue

# 自动修复
eslint src --fix

# 只修复指定规则
eslint src --fix --fix-type suggestion

# 指定配置文件
eslint src -c .eslintrc.custom.js

# 输出到文件
eslint src -o report.json -f json

# 忽略警告
eslint src --quiet
```

### 输出格式

```bash
# JSON 格式
eslint src -f json

# HTML 格式
eslint src -f html -o report.html

# Unix 格式
eslint src -f unix

# 紧凑格式
eslint src -f compact

# stylish 格式（默认）
eslint src -f stylish
```

### 配置缓存

```bash
# 启用缓存
eslint src --cache --cache-location .eslintcache

# 只检查修改的文件
eslint src --cache --cache-strategy content
```

## 与 TypeScript 集成

### 安装依赖

```bash
pnpm add -D @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### 基础配置

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json'  // 启用类型检查规则
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_'
    }]
  }
}
```

### 类型检查规则

启用需要类型信息的规则：

```javascript
rules: {
  // 禁止不必要的类型断言
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',

  // 禁止不必要的条件判断
  '@typescript-eslint/no-unnecessary-condition': 'error',

  // 要求 Promise 有 await 或 return
  '@typescript-eslint/no-floating-promises': 'error',

  // 要求 await 后面是 Promise
  '@typescript-eslint/await-thenable': 'error',

  // 要求使用空值合并运算符 ?? 替代 ||
  '@typescript-eslint/prefer-nullish-coalescing': 'error'
}
```

## 与框架集成

### Vue 项目

```bash
# 安装依赖
pnpm add -D eslint-plugin-vue
```

```javascript
module.exports = {
  extends: [
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parserOptions: {
    parser: '@typescript-eslint/parser'
  },
  rules: {
    'vue/multi-word-component-names': 'error',
    'vue/component-name-in-template-casing': ['error', 'kebab-case']
  }
}
```

### React 项目

```bash
# 安装依赖
pnpm add -D eslint-plugin-react eslint-plugin-react-hooks
```

```javascript
module.exports = {
  extends: [
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  settings: {
    react: {
      version: 'detect'  // 自动检测 React 版本
    }
  },
  rules: {
    'react/react-in-jsx-scope': 'off',  // React 17+ 不需要
    'react/prop-types': 'off',          // 使用 TypeScript
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  }
}
```

### Next.js 项目

```bash
pnpm add -D eslint-config-next
```

```javascript
module.exports = {
  extends: ['next/core-web-vitals']
}
```

## 与 Prettier 配合

### 安装依赖

```bash
pnpm add -D eslint-config-prettier eslint-plugin-prettier
```

### 配置

```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended'  // 必须放最后
  ]
}
```

`eslint-config-prettier` 会关闭所有与 Prettier 冲突的 ESLint 规则。

## 忽略文件

### `.eslintignore`

```
# 目录
node_modules/
dist/
build/
coverage/

# 文件类型
*.min.js
*.bundle.js

# 特定文件
src/legacy/
**/__tests__/
```

### 配置文件中忽略

```javascript
module.exports = {
  ignorePatterns: [
    'dist/**',
    'node_modules/**',
    '*.min.js',
    '!.env.example'
  ]
}
```

### 覆盖配置

```javascript
module.exports = {
  overrides: [
    // 测试文件
    {
      files: ['**/*.test.ts', '**/*.spec.ts'],
      env: {
        jest: true
      },
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        'max-len': 'off'
      }
    },

    // 配置文件
    {
      files: ['*.config.js', '*.config.ts'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off'
      }
    },

    // 脚本文件
    {
      files: ['scripts/**'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
}
```

## VSCode 集成

### 安装插件

安装 ESLint 扩展：`dbaeumer.vscode-eslint`

### 工作区配置

在 `.vscode/settings.json` 中配置：

```json
{
  // 保存时自动修复
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },

  // 验证的文件类型
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "vue"
  ],

  // 工作目录
  "eslint.workingDirectories": ["./client", "./server"],

  // 使用扁平配置
  "eslint.useFlatConfig": true,

  // 显示规则 ID
  "eslint.showRuleIdInStatusBar": true,

  // 问题装饰器
  "eslint.codeAction.showDocumentation": {
    "enable": true
  },

  // 格式化配置
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### 推荐扩展

在 `.vscode/extensions.json` 中配置：

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

## npm 脚本

在 `package.json` 中添加：

```json
{
  "scripts": {
    "lint": "eslint src --ext .js,.ts,.vue",
    "lint:fix": "eslint src --ext .js,.ts,.vue --fix",
    "lint:cache": "eslint src --cache",
    "lint:report": "eslint src -f json -o eslint-report.json"
  }
}
```

## 性能优化

### 使用缓存

```bash
eslint src --cache --cache-location node_modules/.cache/eslint
```

### 使用 FlatCompat 兼容旧格式配置

扁平配置迁移期间，可用 `@eslint/eslintrc` 提供的 `FlatCompat` 继续使用旧版 `.eslintrc` 格式的共享配置：

```javascript
// eslint.config.js
import { FlatCompat } from '@eslint/eslintrc'

const compat = new FlatCompat()

export default [
  // 将旧版 .eslintrc 格式的配置转换为扁平配置
  ...compat.extends('eslint-config-mycompany')
]
```

### 减少检查范围

```javascript
module.exports = {
  // 只检查 src 目录
  // 使用 overrides 而不是检查整个项目
  overrides: [
    {
      files: ['src/**/*.ts'],
      // ...
    }
  ]
}
```

### 延迟类型检查

只在 CI 或 pre-commit 中运行需要类型检查的规则（单独提供一份启用 `parserOptions.project` 的严格配置）：

```json
{
  "scripts": {
    "lint": "eslint src",
    "lint:strict": "eslint src -c eslint.strict.config.js"
  }
}
```

## 自定义规则

### 创建本地规则

```javascript
// eslint-rules/no-console-log.js
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow console.log'
    },
    schema: []
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.object?.name === 'console' &&
          node.callee.property?.name === 'log'
        ) {
          context.report({
            node,
            message: '请使用 logger 替代 console.log'
          })
        }
      }
    }
  }
}
```

### 使用本地规则

```javascript
module.exports = {
  plugins: ['local'],
  rules: {
    'local/no-console-log': 'error'
  }
}
```

## 常见问题

### Q: 如何忽略特定行？

```javascript
// eslint-disable-next-line no-console
console.log('debug')

/* eslint-disable-next-line no-console, no-unused-vars */
const a = 1
console.log(a)

// eslint-disable-next-line
console.log('debug') // 整行忽略

// 或者使用行内注释
console.log('debug') // eslint-disable-line no-console
```

### Q: 如何忽略整个文件？

```javascript
/* eslint-disable */

// 或在文件顶部
/* eslint-disable no-console, no-unused-vars */
```

### Q: 如何在 CI 中使用？

```yaml
# GitHub Actions
- name: Lint
  run: npm run lint

# 或使用 eslint-action
- name: ESLint
  uses: reviewdog/action-eslint@v1
```

### Q: 规则冲突怎么解决？

```javascript
// 关闭冲突规则
rules: {
  'no-unused-vars': 'off',
  '@typescript-eslint/no-unused-vars': 'error'
}
```

### Q: 如何处理大型项目？

1. 使用缓存 `--cache`
2. 分模块配置 `overrides`
3. CI 中增量检查
4. 考虑使用 Turborepo 或 Nx 进行任务编排

### Q: 如何调试配置？

```bash
# 查看使用的配置
npx eslint --print-config src/index.ts

# 查看规则应用情况
DEBUG=eslint:* eslint src
```

### Q: 配置文件不生效？

1. 检查文件位置（应在项目根目录）
2. 检查 `parser` 配置是否正确
3. 检查 `overrides` 是否覆盖了配置
4. 使用 `--print-config` 调试

## 最佳实践

### 1. 渐进式引入

```javascript
// 初期：宽松配置
rules: {
  'no-unused-vars': 'warn',
  'no-console': 'off'
}

// 成熟期：严格配置
rules: {
  'no-unused-vars': 'error',
  'no-console': 'warn'
}
```

### 2. 区分开发环境

```javascript
overrides: [
  {
    files: ['**/*.ts'],
    rules: {
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn'
    }
  }
]
```

### 3. 合理使用 extends

```javascript
extends: [
  // 基础规则
  'eslint:recommended',

  // 框架规则
  'plugin:vue/vue3-recommended',

  // TypeScript 规则
  'plugin:@typescript-eslint/recommended',

  // Prettier 兼容（必须最后）
  'prettier'
]
```

### 4. 配置共享

创建共享配置包：

```javascript
// eslint-config-mycompany/index.js
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  rules: {
    // 公司自定义规则
    'no-console': 'error'
  }
}
```

发布后使用：

```javascript
module.exports = {
  extends: ['mycompany']
}
```

### 5. 与 Git Hooks 集成

参考 [Git Hooks 与自动化](03-GitHooks与自动化.md) 章节，在提交前自动检查代码。

## 相关资源

- [ESLint 官方文档](https://eslint.org/)
- [TypeScript ESLint](https://typescript-eslint.io/)
- [ESLint 插件市场](https://www.npmjs.com/search?q=eslint-plugin)
- [Awesome ESLint](https://github.com/dustinspecker/awesome-eslint)
