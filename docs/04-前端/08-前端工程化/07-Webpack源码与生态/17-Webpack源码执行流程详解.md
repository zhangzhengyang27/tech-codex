---
title: "Webpack源码执行流程详解"
description: Webpack 整体源码执行流程详解，从启动到产物输出
keywords: [Webpack, 源码, 执行流程]
category: 前端工程化
---


# Webpack源码执行流程详解

## 一、概述

本文从插件开发者视角梳理 Webpack 的源码执行流程：先概览 Plugin API（Compiler/Compilation Hooks），再深入 Loader 的两阶段执行机制，最后沿 run → compile → make → seal → emit → done 的主线分析关键源码。

## 二、Plugin API 概览

### 2.1 官方文档结构

```
Webpack Plugin API 文档：
├── tapable            - 核心钩子库
├── 编译器钩子          - Compiler Hooks
├── 编译钩子            - Compilation Hooks
├── JavascriptParser   - JS 解析钩子
├── NormalModuleFactory - 模块工厂钩子
├── 插件类型            - TypeScript 类型定义
├── 自定义钩子          - 如何创建自定义钩子
└── 日志               - Logging API
```

### 2.2 Compiler 核心 Hooks

| Hook | 类型 | 说明 |
|------|------|------|
| `initialize` | SyncHook | 编译器初始化 |
| `beforeRun` | AsyncSeriesHook | 运行前 |
| `run` | AsyncSeriesHook | 开始运行 |
| `compile` | SyncHook | 编译开始 |
| `make` | AsyncParallelHook | 模块编译 |
| `afterCompile` | AsyncSeriesHook | 编译完成 |
| `emit` | AsyncSeriesHook | 输出文件前 |
| `done` | AsyncSeriesHook | 构建完成 |

---

## 三、Loader Interface 详解

### 3.1 Loader 调用机制

```
Loader 调用使用 loader-runner 库：
├── 位置：NormalModule.js
├── 方法：runLoaders()
└── 作用：执行配置的 loader 链
```

### 3.2 Loader 执行阶段

**两个阶段：Pitch 阶段 + Normal 阶段**

```
Loader 配置：
module: {
  rules: [
    {
      test: /\.ts$/,
      use: ['a-loader', 'b-loader', 'c-loader']
    }
  ]
}

执行顺序：

┌─────────────────────────────────────────────────────────────┐
│                    Pitch 阶段（从左到右）                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   a-loader pitch ──► b-loader pitch ──► c-loader pitch     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Normal 阶段（从右到左）                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   c-loader normal ──► b-loader normal ──► a-loader normal   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 Pitch 阶段截断机制

```
如果 b-loader.pitch 返回值：

┌─────────────────────────────────────────────────────────────┐
│  a-loader pitch ──► b-loader pitch (返回值)                 │
│                              │                              │
│                              ▼ 截断！                       │
│  c-loader pitch  跳过                                      │
│  c-loader normal  跳过                                     │
│  b-loader normal  跳过                                     │
│  a-loader normal ◄── 执行                                    │
└─────────────────────────────────────────────────────────────┘

返回值直接传递给前一个 loader 的 normal 阶段
```

### 3.4 执行流程图

```
资源文件
    │
    ▼
┌─────────────────┐
│ Pitch 阶段      │
│ a → b → c       │
└────────┬────────┘
         │
         ▼ 没有返回值
┌─────────────────┐
│ 读取资源内容     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Normal 阶段     │
│ c → b → a       │
│ 依次转换内容     │
└────────┬────────┘
         │
         ▼
   转换后的结果
```

---

## 四、Webpack 执行流程源码分析



### 4.1 整体流程概览

```
┌─────────────────────────────────────────────────────────────┐
│                    Webpack 执行流程                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. webpack-cli/runCLI()                                    │
│         │                                                   │
│         ▼                                                   │
│  2. runWebpack() → createCompiler()                        │
│         │                                                   │
│         ▼                                                   │
│  3. new Compiler() → 初始化所有 Hooks                       │
│         │                                                   │
│         ▼                                                   │
│  4. compiler.run()                                          │
│         │                                                   │
│         ▼                                                   │
│  5. hooks.beforeRun.callAsync()                            │
│         │                                                   │
│         ▼                                                   │
│  6. compiler.compile()                                      │
│         │                                                   │
│         ├──► hooks.make.callAsync() → 编译模块             │
│         │                                                   │
│         ├──► compilation.seal() → 优化依赖关系             │
│         │                                                   │
│         └──► hooks.afterCompile.callAsync()                │
│                   │                                         │
│                   ▼                                         │
│  7. onCompiled() → 输出文件                                 │
│         │                                                   │
│         ├──► hooks.emit.callAsync()                        │
│         │                                                   │
│         └──► emitAssets() → 写入文件系统                   │
│                   │                                         │
│                   ▼                                         │
│  8. hooks.done.callAsync() → 构建完成                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Compiler 类创建

**源码位置：** `webpack/lib/Compiler.js`

```javascript
class Compiler {
  constructor() {
    // 初始化所有钩子
    this.hooks = {
      initialize: new SyncHook([]),
      shouldEmit: new SyncBailHook(['compilation']),
      done: new AsyncSeriesHook(['stats']),
      beforeRun: new AsyncSeriesHook(['compiler']),
      run: new AsyncSeriesHook(['compiler']),
      emit: new AsyncSeriesHook(['compilation']),
      afterEmit: new AsyncSeriesHook(['compilation']),
      compile: new SyncHook(['params']),
      make: new AsyncParallelHook(['compilation']),
      afterCompile: new AsyncSeriesHook(['compilation']),
      // ... 更多钩子
    };
  }
}
```

### 4.3 run 方法

**源码位置：** `webpack/lib/Compiler.js` 第 424 行左右

```javascript
run(callback) {
  // ... 省略部分代码

  const onCompiled = (err, compilation) => {
    // 输出文件的回调
    if (err) return finalCallback(err);

    // emit 阶段：输出文件
    this.hooks.emit.callAsync(compilation, (err) => {
      if (err) return finalCallback(err);
      
      // 实际写入文件
      emitAssets(compilation, (err) => {
        if (err) return finalCallback(err);
        
        // done 钩子
        this.hooks.done.callAsync(stats, finalCallback);
      });
    });
  };

  // 触发 beforeRun 和 run 钩子
  this.hooks.beforeRun.callAsync(this, (err) => {
    if (err) return finalCallback(err);

    this.hooks.run.callAsync(this, (err) => {
      if (err) return finalCallback(err);

      // 进入 compile 方法
      this.compile(onCompiled);
    });
  });
}
```

### 4.4 compile 方法

**源码位置：** `webpack/lib/Compiler.js` 第 1163 行左右

```javascript
compile(callback) {
  const params = {
    normalModuleFactory: this.createNormalModuleFactory(),
    contextModuleFactory: this.createContextModuleFactory(),
  };

  // 触发 beforeCompile 和 compile 钩子
  this.hooks.beforeCompile.callAsync(params, (err) => {
    if (err) return callback(err);

    this.hooks.compile.call(params);

    // 创建 compilation 实例
    const compilation = new Compilation(this);

    this.hooks.thisCompilation.call(compilation, params);
    this.hooks.compilation.call(compilation, params);

    // make 阶段：编译模块
    this.hooks.make.callAsync(compilation, (err) => {
      if (err) return callback(err);

      // finish 阶段
      compilation.finish((err) => {
        if (err) return callback(err);

        // seal 阶段：优化依赖关系
        compilation.seal((err) => {
          if (err) return callback(err);

          // afterCompile 钩子
          this.hooks.afterCompile.callAsync(compilation, callback);
        });
      });
    });
  });
}
```

### 4.5 make 阶段

**作用：** 启动模块编译

```javascript
// make 钩子的注册位置（搜索 hooks.make.tap）
// 主要注册位置：
// ├── DynamicEntryPlugin
// ├── EntryPlugin
// └── PrefetchPlugin

// EntryPlugin 示例
compiler.hooks.make.tapAsync('EntryPlugin', (compilation, callback) => {
  // 添加入口模块
  compilation.addEntry(context, entry, name, callback);
});
```

### 4.6 seal 阶段

**作用：** 优化依赖关系，代码分割

```javascript
// seal 方法主要工作：
// 1. 优化模块依赖图
// 2. 代码分割（Code Splitting）
// 3. 生成 chunk
// 4. 优化 chunk
// 5. 生成最终代码
```

### 4.7 emit 阶段

**作用：** 输出文件到文件系统

```javascript
// emitAssets 核心逻辑
const emitAssets = (compilation, callback) => {
  // 遍历所有 assets
  for (const filename in compilation.assets) {
    const source = compilation.assets[filename];
    // 写入文件
    fs.writeFile(path.join(outputPath, filename), source, callback);
  }
};
```

---

## 五、Loader 执行源码分析

### 5.1 Loader Runner 位置

```
Loader 执行相关文件：
├── webpack/lib/NormalModule.js
│   └── runLoaders() 方法（第 825 行左右）
│
└── node_modules/loader-runner
    └── 实际的 loader 执行逻辑
```



### 5.2 runLoaders 调用

```javascript
// NormalModule.js
runLoaders(callback) {
  const loaderContext = {
    // loader 上下文信息
    resource: this.resource,      // 资源路径
    loaders: this.loaders,        // loader 数组
    // ...
  };

  // 调用 loader-runner
  runLoaders(loaderContext, (err, result) => {
    if (err) return callback(err);
    
    // result 包含转换后的源码
    callback(null, result);
  });
}
```

### 5.3 Loader 执行标志位

```javascript
// loader-runner 中的关键标志
const loaderObject = {
  path: loaderPath,
  pitchExecuted: false,    // pitch 是否已执行
  normalExecuted: false,   // normal 是否已执行
};

// pitchExecuted 在第 188 行设置为 true
// normalExecuted 在第 244 行设置为 true
```

### 5.4 执行流程代码示意

```javascript
// 简化的 loader 执行逻辑
function iteratePitchingLoaders(processOptions, loaderContext, callback) {
  // 从左到右执行 pitch
  if (loaderIndex < loaders.length) {
    const currentLoader = loaders[loaderIndex];
    
    // 执行 pitch 函数
    const pitchResult = currentLoader.pitch.apply(loaderContext, args);
    
    if (pitchResult !== undefined) {
      // pitch 有返回值，跳过后续 pitch 和 normal
      loaderIndex--; // 回退
      iterateNormalLoaders(processOptions, loaderContext, [pitchResult], callback);
    } else {
      loaderIndex++;
      iteratePitchingLoaders(processOptions, loaderContext, callback);
    }
  } else {
    // pitch 阶段结束，开始 normal 阶段
    processResource(processOptions, loaderContext, callback);
  }
}

function iterateNormalLoaders(processOptions, loaderContext, args, callback) {
  // 从右到左执行 normal
  if (loaderIndex < 0) {
    return callback(null, args);
  }
  
  const currentLoader = loaders[loaderIndex];
  
  // 执行 normal 函数
  const result = currentLoader.normal.apply(loaderContext, args);
  
  loaderIndex--;
  iterateNormalLoaders(processOptions, loaderContext, [result], callback);
}
```

---

## 六、核心方法总结

### 6.1 Compiler 核心方法

| 方法 | 作用 | 关键 Hooks |
|------|------|------------|
| `run()` | 启动构建 | beforeRun, run |
| `compile()` | 编译入口 | compile, make, afterCompile |
| `emitAssets()` | 输出文件 | emit, afterEmit |
| `close()` | 关闭编译器 | |

### 6.2 Compilation 核心方法

| 方法 | 作用 |
|------|------|
| `addEntry()` | 添加入口模块 |
| `buildModule()` | 构建单个模块 |
| `finish()` | 完成模块构建 |
| `seal()` | 封装优化 |
| `createChunkAssets()` | 生成 chunk 资源 |

### 6.3 执行阶段对照表

```
┌──────────────────────────────────────────────────────────────┐
│                      执行阶段对照                             │
├──────────────────┬───────────────────────────────────────────┤
│  阶段            │  关键 Hooks / 方法                        │
├──────────────────┼───────────────────────────────────────────┤
│  初始化          │  initialize                               │
├──────────────────┼───────────────────────────────────────────┤
│  运行前          │  beforeRun → run                          │
├──────────────────┼───────────────────────────────────────────┤
│  编译            │  compile → make                           │
├──────────────────┼───────────────────────────────────────────┤
│  模块构建        │  buildModule → runLoaders (loader-runner) │
├──────────────────┼───────────────────────────────────────────┤
│  完成模块        │  finishModules                            │
├──────────────────┼───────────────────────────────────────────┤
│  封装优化        │  seal → optimize                          │
├──────────────────┼───────────────────────────────────────────┤
│  编译完成        │  afterCompile                             │
├──────────────────┼───────────────────────────────────────────┤
│  输出            │  emit → emitAssets                        │
├──────────────────┼───────────────────────────────────────────┤
│  完成            │  done                                     │
└──────────────────┴───────────────────────────────────────────┘
```

---

## 七、调试技巧总结

### 7.1 断点位置推荐

```
推荐断点位置：
├── webpack/lib/webpack.js
│   └── webpack() 函数入口（lib/index.js 为重导出入口）
│
├── webpack/lib/Compiler.js
│   ├── constructor() - 查看所有 Hooks
│   ├── run() - 第 424 行
│   └── compile() - 第 1163 行
│
├── webpack/lib/Compilation.js
│   ├── seal() - 优化阶段
│   └── createChunkAssets() - 生成资源
│
└── webpack/lib/NormalModule.js
    └── runLoaders() - 第 825 行
```

### 7.2 搜索技巧

```
查找 Hook 注册位置：
├── 搜索 hooks.xxx.tap
│   例如：hooks.make.tap
│
├── 搜索 hooks.xxx.tapAsync
│   例如：hooks.emit.tapAsync
│
└── 搜索 hooks.xxx.tapPromise
    例如：hooks.run.tapPromise
```

---

## 八、学习总结

### 8.1 知识架构

```
┌─────────────────────────────────────────────────────────────┐
│                   Webpack 源码知识架构                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. tapable 核心库                                          │
│     ├── Hook 类型：Sync / Async (Series/Parallel)          │
│     ├── 注册方法：tap / tapAsync / tapPromise              │
│     └── 调用方法：call / callAsync / promise               │
│                                                             │
│  2. Plugin API                                              │
│     ├── Compiler Hooks（编译器级别）                        │
│     ├── Compilation Hooks（编译过程级别）                   │
│     └── 其他 Hooks                                          │
│                                                             │
│  3. Loader Interface                                        │
│     ├── Pitch 阶段（从左到右）                              │
│     ├── Normal 阶段（从右到左）                             │
│     └── loader-runner 执行                                  │
│                                                             │
│  4. 执行流程                                                │
│     ├── run → compile → make                               │
│     ├── seal → optimize                                    │
│     └── emit → done                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 延伸学习

- 深入阅读 Webpack 源码：`webpack/lib/` 目录
- 学习 Webpack 插件开发实战
- 研究具体 Hook 的注册和调用时机
- 尝试开发自定义 Loader 和 Plugin

