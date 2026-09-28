---
title: "Webpack CLI build 命令执行流程"
description: Webpack CLI build 命令的完整执行链路：参数解析、命令分发、配置加载与 Compiler 创建
keywords: [Webpack, CLI, build 命令]
category: 前端工程化
---

# Webpack CLI build 命令执行流程

## 一、概述

本文沿着 `webpack build` 的执行链路自顶向下分析：CLI 侧完成参数解析、命令分发与配置整合后，通过 loadWebpack 导入 webpack 核心库并创建 Compiler 实例，随后进入核心的编译流程。

## 二、build 命令执行流程详解

### 2.1 第一次 parseAsync

**执行过程：**

```
run() → parseAsync(args)
    │
    ▼
parseCommand()
    │
    ▼
第一次调用 chainOrCall
    │
    ▼
返回结果：build 命令
```

**关键代码：**
```typescript
// 第一次进入 parseCommand
parseCommand() {
  // 第一次 options 为空
  if (!options) {
    // 返回 build 命令
    return this.getBuiltInCommand('build');
  }
}
```

### 2.2 第二次 parseCommand

**执行过程：**

```
第一次返回 build 命令
    │
    ▼
进入 action handler
    │
    ▼
第二次 parseAsync
    │
    ▼
这次 options 不为空
    │
    ▼
分发（dispatch）build 命令
```

**关键代码：**
```typescript
// 第二次进入 parseCommand
parseCommand() {
  // 这次 options 有值
  if (options) {
    // 查找第一个参数，进行命令分发
    const commandName = options[0];
    this.dispatchCommand(commandName);
  }
}
```

### 2.3 命令分发流程

**dispatch 方法：**

```typescript
dispatch(command) {
  // 1. 检查是否有子命令
  const subCommand = this.getSubCommand(command);
  
  if (subCommand) {
    // 执行子命令
    return this.executeSubCommand(subCommand);
  }
  
  // 2. 执行钩子
  await this.chainOrCallSubCommandHooks();
  
  // 3. 执行 action handler
  await this.actionHandler(options, program);
}
```

---

## 三、compiler 创建过程

### 3.1 创建 compiler 的时机

**调用链：**
```
actionHandler()
    │
    ▼
runWebpack()
    │
    ▼
createCompiler()
    │
    ▼
this.webpack(config, callback)
```

### 3.2 runWebpack 方法

**webpack-cli.ts 第 1213 行：**

```typescript
async runWebpack() {
  // 1. 初始化变量
  let compiler;
  let callback;
  
  // 2. 获取环境变量
  const webpackBuildEnv = process.env.WEBPACK_BUILD;
  const webpackBundleEnv = process.env.WEBPACK_BUNDLE;
  
  // 3. 准备 options
  const options = {
    config: configPath,
    env: envOptions
  };
  
  // 4. 检查是否是 watch 模式
  if (!isWatch) {
    // 创建 compiler 实例
    compiler = await this.createCompiler(options);
  }
  
  return compiler;
}
```

### 3.3 createCompiler 方法

**核心流程：**

```typescript
createCompiler(options) {
  // 1. 加载配置文件
  const config = loadConfig(options.config);
  
  // 2. 构建配置
  const builtConfig = buildConfig(config);
  
  // 3. 调用 webpack 核心库
  const compiler = this.webpack(builtConfig, callback);
  
  return compiler;
}
```

---

## 四、配置文件加载与构建

### 4.1 loadConfig 方法

**作用：**
> 加载配置文件并取其导出的配置对象。

```typescript
loadConfig(configPath) {
  // 简化示意：配置文件需要被当作模块求值（require/import），
  // 仅以 fs.readFileSync 读出文本是拿不到配置对象的
  const config = require(configPath);

  return config;
}
```

> 注：webpack-cli 实际实现中会借助 interpret 等模块识别配置文件类型（ts/js/…）后 require 或 import，并对 ESM/CJS 配置分别处理。

**读取结果：**
```javascript
// webpack.config.js 内容
{
  mode: 'development',
  entry: './src/index.js'
}
```



### 4.2 buildConfig 方法

**webpack-cli.ts 第 2184 行：**

```typescript
buildConfig(config) {
  // 1. 检查是否是 watch 模式
  const isWatchMode = config.watch;
  
  // 2. 获取 build options
  const buildOptions = this.getBuildOptions(config);
  
  // 3. 处理参数（使用 reduce）
  const processedArgs = processArguments.reduce((acc, arg) => {
    // 解析参数
    return { ...acc, ...arg };
  }, {});
  
  // 4. 返回整合好的配置
  return {
    ...buildOptions,
    ...processedArgs,
    mode: config.mode,
    entry: config.entry
  };
}
```

### 4.3 配置整合流程

```
┌─────────────────────────────────────────────────────────┐
│              配置文件构建流程                            │
└─────────────────────────────────────────────────────────┘

原始配置文件（webpack.config.js）
    │
    ▼
┌─────────────────────────────────────────┐
│ loadConfig()                            │
│ - 读取文件内容                           │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ buildConfig()                           │
│ - 解析参数                               │
│ - 整合选项                               │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 最终配置对象                             │
│ {                                       │
│   mode: 'development',                  │
│   entry: './src/index.js',              │
│   ...其他配置                            │
│ }                                       │
└─────────────────────────────────────────┘
```

---

## 五、Webpack 核心库导入

### 5.1 loadWebpack 方法

**webpack-cli.ts：**

```typescript
loadWebpack() {
  // 尝试 require webpack
  try {
    return require('webpack');
  } catch (e) {
    // 如果失败，尝试动态 import
    return import('webpack');
  }
}
```

### 5.2 Webpack 包的入口

**webpack/package.json：**
```json
{
  "main": "lib/index.js"
}
```

**webpack/lib/index.js：**
```javascript
// Webpack 核心库导出内容
module.exports = {
  // webpack 方法
  webpack: webpack,
  
  // 编译器
  Compiler: Compiler,
  
  // 优化相关
  optimize: {
    // ...
  },
  
  // 库相关
  library: {
    // ...
  },
  
  // 其他方法和类
  // ...
};
```

### 5.3 Webpack 实例创建

**webpack/lib/webpack.js 第 110 行：**

```javascript
// Webpack 核心函数
const webpack = (options, callback) => {
  // 1. 验证配置
  validateOptions(options);
  
  // 2. 创建 Compiler 实例
  const compiler = new Compiler(options);
  
  // 3. 执行回调
  if (callback) {
    compiler.run(callback);
  }
  
  return compiler;
};
```

### 5.4 导入关系图

```
┌─────────────────────────────────────────────────────────┐
│          Webpack 核心库导入关系                          │
└─────────────────────────────────────────────────────────┘

webpack-cli
    │
    │ this.webpack(config, callback)
    ▼
┌─────────────────────────────────────────┐
│ loadWebpack()                           │
│ - require('webpack')                    │
│ - 或 import('webpack')                  │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ webpack/package.json                    │
│ - main: "lib/index.js"                  │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ webpack/lib/index.js                    │
│ - 导出 webpack 对象                      │
│ - 包含 Compiler、optimize 等            │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ webpack/lib/webpack.js                  │
│ - webpack 函数（第 110 行）              │
│ - 创建 Compiler 实例                     │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ webpack/lib/Compiler.js                 │
│ - Compiler 类                           │
│ - 编译器核心                             │
└─────────────────────────────────────────┘
```

---

## 六、完整执行流程总结



### 6.1 流程图

```
┌─────────────────────────────────────────────────────────┐
│        Webpack CLI build 命令完整执行流程               │
└─────────────────────────────────────────────────────────┘

用户执行：webpack --config webpack.config.js
    │
    ▼
┌─────────────────────────────────────────┐
│ 1. bin/cli.js                           │
│    入口文件                              │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 2. run() 方法                           │
│    第一次 parseAsync                    │
│    ↓                                    │
│    返回 build 命令                       │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 3. actionHandler()                      │
│    第二次 parseAsync                    │
│    ↓                                    │
│    options 不为空                        │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 4. dispatch('build')                    │
│    命令分发                              │
│    ↓                                    │
│    执行钩子和回调                        │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 5. runWebpack()                         │
│    运行 Webpack                         │
│    ↓                                    │
│    准备环境变量和参数                    │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 6. createCompiler()                     │
│    创建编译器                            │
│    ├─ loadConfig() 加载配置             │
│    └─ buildConfig() 构建配置            │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 7. this.webpack(config, callback)       │
│    调用 Webpack 核心库                  │
│    ↓                                    │
│    loadWebpack() 导入 webpack           │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 8. webpack/lib/webpack.js               │
│    webpack 函数                         │
│    ↓                                    │
│    new Compiler(options)                │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 9. Compiler 实例创建完成                │
│    开始编译                              │
│    ↓                                    │
│    compiler.run(callback)               │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│ 10. 编译完成                            │
│     回调函数执行                         │
│     ↓                                   │
│     printStatus() 打印状态              │
└─────────────────────────────────────────┘
```

### 6.2 关键方法对照表

| 方法 | 位置 | 作用 |
|------|------|------|
| `run()` | 1092 行 | CLI 主入口 |
| `parseAsync()` | - | 解析参数（两次调用） |
| `dispatch()` | - | 命令分发 |
| `runWebpack()` | 1213 行 | 运行 Webpack |
| `createCompiler()` | 2387 行 | 创建编译器 |
| `loadConfig()` | - | 加载配置文件 |
| `buildConfig()` | 2184 行 | 构建配置 |
| `this.webpack()` | - | 调用 Webpack 核心库 |
| `webpack()` | webpack.js 110 行 | 创建 Compiler 实例 |

---

## 七、调试技巧总结

### 7.1 关键断点位置

```typescript
// 1. 回调函数入口
webpack-cli.ts 第 1213 行

// 2. 创建 compiler
webpack-cli.ts 第 2387 行

// 3. Webpack 核心函数
webpack/lib/webpack.js 第 110 行

// 4. Compiler 创建
webpack/lib/webpack.js 第 116 行
```



### 7.2 调试流程

```
┌─────────────────────────────────────────────────────────┐
│              调试 Webpack CLI 的建议流程                 │
└─────────────────────────────────────────────────────────┘

步骤 1：在 webpack-cli.ts 第 2387 行打断点
    ↓
步骤 2：运行调试，停在此处
    ↓
步骤 3：单步进入（F11）createCompiler
    ↓
步骤 4：观察 loadConfig 和 buildConfig
    ↓
步骤 5：进入 this.webpack 调用
    ↓
步骤 6：观察 webpack 核心库的执行
    ↓
步骤 7：查看 Compiler 实例创建过程
```

---

## 八、Webpack CLI 与 Webpack 核心库的关系

### 8.1 职责划分

```
┌─────────────────────────────────────────────────────────┐
│              职责划分                                    │
└─────────────────────────────────────────────────────────┘

Webpack CLI：
├─ 解析命令行参数
├─ 加载配置文件
├─ 构建配置对象
├─ 创建 Compiler 实例
└─ 打印构建状态

Webpack 核心库：
├─ 验证配置
├─ 创建 Compiler
├─ 执行编译流程
├─ 生成构建产物
└─ 触发钩子事件
```

### 8.2 调用关系

```
CLI 层：
webpack-cli
    ↓ 调用
核心层：
webpack (lib/index.js)
    ↓ 创建
编译层：
Compiler
    ↓ 执行
构建层：
Compilation
```

---

## 九、学习要点总结

1. **build 命令执行两次 parseAsync**  
   第一次返回 build 命令，第二次执行具体逻辑

2. **配置加载使用 fs 模块**  
   loadConfig 读取文件，buildConfig 整合配置

3. **Compiler 是 Webpack 的核心**  
   通过 webpack() 函数创建，负责整个编译流程

4. **Webpack CLI 只是入口和配置处理器**  
   真正的编译逻辑在 Webpack 核心库中

5. **通过调试可以深入理解执行流程**  
   在关键位置打断点，逐步分析代码逻辑

---

## 十、延伸学习资源

### 源码位置

- **Webpack CLI**: `webpack-cli/packages/webpack-cli/src/webpack-cli.ts`
- **Webpack 核心**: `webpack/lib/webpack.js`
- **Compiler**: `webpack/lib/Compiler.js`

## 十一、思考题

1. **为什么 build 命令需要执行两次 parseAsync？**

2. **loadConfig 和 buildConfig 的区别是什么？**

3. **Webpack CLI 如何找到并加载 Webpack 核心库？**

4. **Compiler 实例是在哪里创建的？创建过程做了什么？**

5. **如何通过调试深入理解 Webpack 的执行流程？**

---

**笔记整理时间：** 2026-03-16  
**参考源码版本：** Webpack CLI 5.1.4 / Webpack 5.88.2  
**下一步学习：** Webpack Compiler 核心原理

