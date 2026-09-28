---
title: Node原生模块
description: "Node 原生模块(Native Addons)是用 C/C++ 编写的模块,通过 Node.js 的 N-API 或 nan 接口与 JavaScript 交互。在 Electron 中使用原生模块需要特殊处理和重新编译。"
keywords: [Node原生模块]
category: Electron
tags: [Electron, 桌面应用, IPC, 打包]
---


# Node 原生模块

Node 原生模块(Native Addons)是用 C/C++ 编写的模块,通过 Node.js 的 N-API 或 nan 接口与 JavaScript 交互。在 Electron 中使用原生模块需要特殊处理和重新编译。

## 为什么需要原生模块

### 核心优势

1. **性能提升** - C/C++ 执行速度比 JavaScript 快 10-100 倍,适合计算密集型任务
2. **系统集成** - 直接访问操作系统底层 API,如硬件接口、系统调用等
3. **库复用** - 利用现有的成熟 C/C++ 库生态
4. **代码保护** - 编译后的二进制文件难以逆向,保护核心算法
5. **跨平台** - 一次编写,多平台编译运行

### 性能对比示例

| 操作类型 | JavaScript | C++ Addon | 性能提升 |
|---------|-----------|-----------|---------|
| 数学计算(斐波那契) | 1200ms | 15ms | 80x |
| 图像处理 | 3500ms | 180ms | 19x |
| 加密运算 | 890ms | 45ms | 20x |
| 文件压缩 | 2100ms | 120ms | 17x |

> 注: 以上数据基于相同硬件环境下的基准测试,实际性能因场景而异。

## 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────┐
│              Electron 应用层                         │
│  ┌──────────────┐          ┌──────────────┐       │
│  │  渲染进程     │          │  主进程       │       │
│  │  (Renderer)  │  IPC     │  (Main)      │       │
│  └──────────────┘  ◄────►  └──────────────┘       │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              Node.js 运行时                          │
│  ┌──────────────────────────────────────────────┐  │
│  │         N-API (Node API)                     │  │
│  │  - 稳定的 ABI 接口                            │  │
│  │  - 版本无关的二进制兼容                       │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│          原生模块层 (Native Addon)                   │
│  ┌──────────────────────────────────────────────┐  │
│  │  C/C++ 代码                                   │  │
│  │  - 业务逻辑实现                               │  │
│  │  - 调用系统 API                               │  │
│  │  - 第三方库集成                               │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────┐
│              操作系统层                              │
│  - Windows API                                      │
│  - macOS Core Framework                             │
│  - Linux System Libraries                           │
└─────────────────────────────────────────────────────┘
```

### 工作流程

```
JavaScript 调用
     │
     ▼
N-API 接口层
     │
     ▼
参数类型转换(JS → C++)
     │
     ▼
C++ 函数执行
     │
     ▼
返回值转换(C++ → JS)
     │
     ▼
JavaScript 接收结果
```

## 原生模块基础

### 项目结构

```
native-module/
├── binding.gyp          # node-gyp 构建配置文件
├── package.json         # NPM 包配置
├── src/
│   ├── addon.cc         # C++ 主入口
│   ├── worker.cc        # 异步工作线程(可选)
│   └── utils.cc         # 工具函数(可选)
├── lib/                 # JavaScript 封装层(可选)
│   └── index.js
├── test/                # 测试文件
│   └── addon.test.js
└── index.js             # 模块导出入口
```

### binding.gyp 配置详解

`binding.gyp` 是 node-gyp 的构建配置文件,采用 Python 字典格式:

```python
{
  "targets": [
    {
      "target_name": "addon",           # 编译目标名称,生成 addon.node
      "sources": [                      # 源文件列表
        "src/addon.cc",
        "src/worker.cc"
      ],
      "include_dirs": [                 # 头文件目录
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "dependencies": [                 # 依赖项
        "<!(node -p \"require('node-addon-api').gyp\")"
      ],
      "cflags!": ["-fno-exceptions"],   # 禁用 C 标志
      "cflags_cc!": ["-fno-exceptions"],
      "cflags_cc": ["-std=c++17"],      # 启用 C++17 标准
      "defines": [                      # 预定义宏
        "NAPI_DISABLE_CPP_EXCEPTIONS",
        "NODE_ADDON_API_ENABLE_MAYBE"
      ],
      "conditions": [                   # 平台特定配置
        ["OS=='win'", {
          "defines": ["WIN32_LEAN_AND_MEAN"],
          "libraries": ["ws2_32.lib"]
        }],
        ["OS=='mac'", {
          "xcode_settings": {
            "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
            "CLANG_CXX_LIBRARY": "libc++",
            "MACOSX_DEPLOYMENT_TARGET": "10.13",
            "GCC_OPTIMIZATION_LEVEL": "3"
          }
        }],
        ["OS=='linux'", {
          "libraries": ["-lpthread"]
        }]
      ]
    }
  ]
}
```

#### 配置参数说明

| 参数 | 类型 | 说明 | 示例 |
|------|------|------|------|
| `target_name` | string | 编译输出的模块名 | `"addon"` |
| `sources` | array | C/C++ 源文件路径 | `["src/addon.cc"]` |
| `include_dirs` | array | 头文件搜索路径 | `["include"]` |
| `libraries` | array | 链接的库文件 | `["-lpthread"]` |
| `defines` | array | 预处理宏定义 | `["NAPI_DISABLE_CPP_EXCEPTIONS"]` |
| `cflags` | array | C 编译选项 | `["-O2"]` |
| `cflags_cc` | array | C++ 编译选项 | `["-std=c++17"]` |
| `conditions` | array | 条件配置 | 平台特定设置 |

### C++ 实现 (N-API)

#### 基础示例

```cpp
// src/addon.cc
#include <node_api.h>
#include <string>
#include <cassert>

// 示例 1: 返回字符串
static napi_value Hello(napi_env env, napi_callback_info info) {
  napi_value result;
  napi_status status = napi_create_string_utf8(
    env, 
    "Hello from C++!", 
    NAPI_AUTO_LENGTH, 
    &result
  );
  
  // 检查 API 调用是否成功
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Failed to create string");
    return nullptr;
  }
  
  return result;
}

// 示例 2: 参数处理与计算
static napi_value Add(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  napi_status status = napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  
  if (status != napi_ok || argc < 2) {
    napi_throw_type_error(env, NULL, "Wrong number of arguments");
    return nullptr;
  }
  
  // 验证参数类型
  napi_valuetype valuetype0, valuetype1;
  napi_typeof(env, args[0], &valuetype0);
  napi_typeof(env, args[1], &valuetype1);
  
  if (valuetype0 != napi_number || valuetype1 != napi_number) {
    napi_throw_type_error(env, NULL, "Arguments must be numbers");
    return nullptr;
  }
  
  double a, b;
  napi_get_value_double(env, args[0], &a);
  napi_get_value_double(env, args[1], &b);
  
  napi_value result;
  napi_create_double(env, a + b, &result);
  return result;
}
```

#### 异步操作示例

```cpp
// 异步工作数据结构
struct AsyncWorkData {
  napi_async_work work;
  napi_ref callback;
  double input;
  double result;
  char* error_msg;
};

// 异步执行函数(在工作线程中运行)
static void ExecuteAsync(napi_env env, void* data) {
  AsyncWorkData* work_data = static_cast<AsyncWorkData*>(data);
  
  try {
    // 执行耗时计算
    work_data->result = work_data->input * 2;
    
    // 模拟耗时操作
    std::this_thread::sleep_for(std::chrono::milliseconds(100));
  } catch (const std::exception& e) {
    work_data->error_msg = strdup(e.what());
  }
}

// 异步完成函数(在主线程中运行)
static void CompleteAsync(napi_env env, napi_status status, void* data) {
  AsyncWorkData* work_data = static_cast<AsyncWorkData*>(data);
  
  napi_value callback, undefined, result;
  napi_get_reference_value(env, work_data->callback, &callback);
  napi_get_undefined(env, &undefined);
  
  if (work_data->error_msg != nullptr) {
    // 发生错误
    napi_value error;
    napi_create_string_utf8(env, work_data->error_msg, NAPI_AUTO_LENGTH, &error);
    napi_value error_obj;
    napi_create_error(env, NULL, error, &error_obj);
    
    napi_value argv[2] = { error_obj, undefined };
    napi_call_function(env, undefined, callback, 2, argv, nullptr);
    
    free(work_data->error_msg);
  } else {
    // 成功完成
    napi_create_double(env, work_data->result, &result);
    napi_value argv[2] = { undefined, result };
    napi_call_function(env, undefined, callback, 2, argv, nullptr);
  }
  
  // 清理资源
  napi_delete_reference(env, work_data->callback);
  napi_delete_async_work(env, work_data->work);
  delete work_data;
}

// 暴露给 JS 的函数
static napi_value ComputeAsync(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);
  
  if (argc < 2) {
    napi_throw_error(env, NULL, "Expected 2 arguments");
    return nullptr;
  }
  
  AsyncWorkData* work_data = new AsyncWorkData;
  work_data->error_msg = nullptr;
  napi_get_value_double(env, args[0], &work_data->input);
  napi_create_reference(env, args[1], 1, &work_data->callback);
  
  napi_value work_name;
  napi_create_string_utf8(env, "compute:async", NAPI_AUTO_LENGTH, &work_name);
  
  napi_create_async_work(
    env, 
    nullptr, 
    work_name, 
    ExecuteAsync, 
    CompleteAsync, 
    work_data, 
    &work_data->work
  );
  
  napi_queue_async_work(env, work_data->work);
  
  napi_value undefined;
  napi_get_undefined(env, &undefined);
  return undefined;
}
```

#### 模块初始化

```cpp
// 注册模块导出
static napi_value Init(napi_env env, napi_value exports) {
  napi_value fn;
  
  // 导出 hello 函数
  napi_create_function(env, "hello", NAPI_AUTO_LENGTH, Hello, nullptr, &fn);
  napi_set_named_property(env, exports, "hello", fn);
  
  // 导出 add 函数
  napi_create_function(env, "add", NAPI_AUTO_LENGTH, Add, nullptr, &fn);
  napi_set_named_property(env, exports, "add", fn);
  
  // 导出 computeAsync 函数
  napi_create_function(env, "computeAsync", NAPI_AUTO_LENGTH, ComputeAsync, nullptr, &fn);
  napi_set_named_property(env, exports, "computeAsync", fn);
  
  return exports;
}

// 定义模块
NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
```

### JavaScript 接口封装

```javascript
// index.js
const addon = require('./build/Release/addon.node')

/**
 * 原生模块封装
 */
class NativeAddon {
  /**
   * 获取问候语
   * @returns {string}
   */
  static hello() {
    return addon.hello()
  }
  
  /**
   * 计算两数之和
   * @param {number} a - 第一个数
   * @param {number} b - 第二个数
   * @returns {number}
   */
  static add(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new TypeError('Arguments must be numbers')
    }
    return addon.add(a, b)
  }
  
  /**
   * 异步计算(输入值 × 2)
   * @param {number} input - 输入值
   * @returns {Promise<number>}
   */
  static computeAsync(input) {
    return new Promise((resolve, reject) => {
      addon.computeAsync(input, (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result)
        }
      })
    })
  }
}

module.exports = NativeAddon
```

### TypeScript 类型定义

```typescript
// index.d.ts
export function hello(): string
export function add(a: number, b: number): number
export function computeAsync(input: number): Promise<number>
```

## 在 Electron 中使用

### 1. 环境准备

#### 安装依赖

```bash
# 安装 electron-rebuild(现已更名为 @electron/rebuild,用法不变,新项目建议安装新包)
npm install --save-dev electron-rebuild

# 或使用 pnpm
pnpm add -D electron-rebuild
```

#### package.json 配置

```json
{
  "name": "my-electron-app",
  "version": "1.0.0",
  "scripts": {
    "start": "electron .",
    "rebuild": "electron-rebuild",
    "postinstall": "electron-rebuild"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-rebuild": "^3.2.9"
  }
}
```

### 2. 重新编译原生模块

#### 基本用法

```bash
# 重新编译所有原生模块
npx electron-rebuild

# 编译指定模块
npx electron-rebuild -f -w better-sqlite3

# 指定 Electron 版本
npx electron-rebuild -v 28.0.0

# 指定模块路径
npx electron-rebuild -m ./node_modules
```

#### 自动编译配置

electron-rebuild 不支持单独的 config 配置块,需要指定选项时直接写入 postinstall 脚本参数:

```json
// package.json
{
  "scripts": {
    "postinstall": "electron-rebuild -f -o better-sqlite3,sharp"
  }
}
```

### 3. 在主进程中使用

```typescript
// main.ts
import { app, BrowserWindow, ipcMain } from 'electron'
import NativeAddon from './native-addon'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  })
  
  mainWindow.loadFile('index.html')
}

// 原生模块使用示例
console.log(NativeAddon.hello())  // 'Hello from C++!'
console.log(NativeAddon.add(10, 20))  // 30

// 异步调用
async function asyncExample() {
  try {
    const result = await NativeAddon.computeAsync(100)
    console.log('Async result:', result)  // 200
  } catch (error) {
    console.error('Error:', error)
  }
}

// IPC 通信示例
ipcMain.handle('native-compute', async (event, input) => {
  try {
    const result = await NativeAddon.computeAsync(input)
    return { success: true, data: result }
  } catch (error) {
    return { success: false, error: error.message }
  }
})

app.whenReady().then(() => {
  createWindow()
  asyncExample()
})
```

### 4. 在渲染进程中使用

```typescript
// preload.js
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('nativeAPI', {
  compute: (input) => ipcRenderer.invoke('native-compute', input)
})
```

```typescript
// renderer.ts
async function handleClick() {
  const result = await window.nativeAPI.compute(50)
  console.log('Result:', result)
}
```

## 使用现有的原生模块

### 常用原生模块列表

| 模块名 | 功能说明 | 使用场景 | 性能提升 |
|--------|---------|---------|---------|
| `better-sqlite3` | SQLite 数据库 | 本地数据存储 | 3-5x |
| `sharp` | 图像处理 | 图片压缩、格式转换 | 5-10x |
| `node-ffi-napi` | FFI 调用 | 调用动态链接库 | - |
| `keytar` | 系统密钥存储 | 安全存储密码 | - |
| `native-keymap` | 键盘映射 | 获取系统键盘布局 | - |
| `node-machine-id` | 机器标识 | 获取设备唯一 ID | - |
| `bcrypt` | 密码加密 | 用户密码哈希 | 10x |
| `cpu-features` | CPU 信息 | 获取 CPU 特性 | - |

### 安装与重建

```bash
# 安装原生模块
npm install better-sqlite3

# 为 Electron 重建
npx electron-rebuild -f -w better-sqlite3

# 验证模块可用
node -e "console.log(require('better-sqlite3'))"
```

### 使用示例: better-sqlite3

```typescript
import Database from 'better-sqlite3'

// 创建数据库连接
const db = new Database('mydb.sqlite')

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  )
`)

// 插入数据(预处理语句)
const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
insert.run('张三', 'zhangsan@example.com')

// 查询数据
const users = db.prepare('SELECT * FROM users').all()
console.log(users)

// 事务操作
const insertMany = db.transaction((users) => {
  for (const user of users) {
    insert.run(user.name, user.email)
  }
})

insertMany([
  { name: '李四', email: 'lisi@example.com' },
  { name: '王五', email: 'wangwu@example.com' }
])

// 关闭连接
db.close()
```

### electron-builder 配置

```yaml
# electron-builder.yml
build:
  npmRebuild: true
  nodeGypRebuild: true
  afterPack: ./scripts/rebuild-native.js
```

```javascript
// scripts/rebuild-native.js
const { execSync } = require('child_process')
const path = require('path')

module.exports = async function(context) {
  const { appOutDir, electronPlatformName, arch } = context
  
  console.log('Rebuilding native modules...')
  
  const env = {
    ...process.env,
    npm_config_runtime: 'electron',
    npm_config_target: context.electronVersion,
    npm_config_disturl: 'https://electronjs.org/headers',
    npm_config_build_from_source: true
  }
  
  try {
    execSync('npx electron-rebuild', {
      cwd: context.appOutDir,
      env,
      stdio: 'inherit'
    })
    console.log('Native modules rebuilt successfully')
  } catch (error) {
    console.error('Failed to rebuild native modules:', error)
    throw error
  }
}
```

## 进阶开发

### 使用 node-addon-api (C++ 封装)

`node-addon-api` 是 N-API 的 C++ 封装,提供更友好的 API。

#### 安装

```bash
npm install node-addon-api
```

#### binding.gyp 配置

```python
{
  "targets": [{
    "target_name": "addon",
    "sources": ["src/addon.cc"],
    "include_dirs": [
      "<!@(node -p \"require('node-addon-api').include\")"
    ],
    "dependencies": [
      "<!(node -p \"require('node-addon-api').gyp\")"
    ],
    "cflags!": ["-fno-exceptions"],
    "cflags_cc!": ["-fno-exceptions"],
    "defines": ["NAPI_DISABLE_CPP_EXCEPTIONS"],
    "conditions": [
      ["OS=='win'", {
        "defines": ["WIN32_LEAN_AND_MEAN"]
      }]
    ]
  }]
}
```

#### 类封装示例

```cpp
// src/addon.cc
#include <napi.h>

class Calculator : public Napi::ObjectWrap<Calculator> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  Calculator(const Napi::CallbackInfo& info);

private:
  Napi::Value GetValue(const Napi::CallbackInfo& info);
  Napi::Value Add(const Napi::CallbackInfo& info);
  Napi::Value Multiply(const Napi::CallbackInfo& info);
  Napi::Value Reset(const Napi::CallbackInfo& info);
  
  double value_;
  
  static Napi::FunctionReference constructor_;
};

Napi::FunctionReference Calculator::constructor_;

Napi::Object Calculator::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);
  
  Napi::Function func = DefineClass(env, "Calculator", {
    InstanceMethod("getValue", &Calculator::GetValue),
    InstanceMethod("add", &Calculator::Add),
    InstanceMethod("multiply", &Calculator::Multiply),
    InstanceMethod("reset", &Calculator::Reset),
    InstanceAccessor("value", &Calculator::GetValue, nullptr)
  });
  
  constructor_ = Napi::Persistent(func);
  constructor_.SuppressDestruct();
  
  exports.Set("Calculator", func);
  return exports;
}

Calculator::Calculator(const Napi::CallbackInfo& info) 
  : Napi::ObjectWrap<Calculator>(info) {
  Napi::Env env = info.Env();
  
  if (info.Length() > 0) {
    if (!info[0].IsNumber()) {
      Napi::TypeError::New(env, "Initial value must be a number").ThrowAsJavaScriptException();
      return;
    }
    value_ = info[0].As<Napi::Number>().DoubleValue();
  } else {
    value_ = 0;
  }
}

Napi::Value Calculator::GetValue(const Napi::CallbackInfo& info) {
  return Napi::Number::New(info.Env(), value_);
}

Napi::Value Calculator::Add(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  double other = info[0].As<Napi::Number>().DoubleValue();
  value_ += other;
  
  return Napi::Number::New(env, value_);
}

Napi::Value Calculator::Multiply(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  double other = info[0].As<Napi::Number>().DoubleValue();
  value_ *= other;
  
  return Napi::Number::New(env, value_);
}

Napi::Value Calculator::Reset(const Napi::CallbackInfo& info) {
  value_ = 0;
  return Napi::Number::New(info.Env(), value_);
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Calculator::Init)
```

#### JavaScript 使用

```javascript
const { Calculator } = require('./build/Release/addon.node')

const calc = new Calculator(10)
console.log(calc.getValue())     // 10
console.log(calc.add(5))         // 15
console.log(calc.multiply(2))    // 30
console.log(calc.reset())        // 0
```

### 使用 async worker

```cpp
#include <napi.h>
#include <thread>
#include <chrono>

class ComputeWorker : public Napi::AsyncWorker {
public:
  ComputeWorker(Napi::Env& env, double input, Napi::Promise::Deferred& deferred)
    : Napi::AsyncWorker(env), input_(input), deferred_(deferred) {}
  
  void Execute() override {
    // 在工作线程中执行
    std::this_thread::sleep_for(std::chrono::milliseconds(500));
    result_ = input_ * input_;
  }
  
  void OnOK() override {
    // 在主线程中执行
    deferred_.Resolve(Napi::Number::New(Env(), result_));
  }
  
  void OnError(const Napi::Error& e) override {
    deferred_.Reject(e.Value());
  }

private:
  double input_;
  double result_;
  Napi::Promise::Deferred deferred_;
};

Napi::Value ComputeAsync(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  
  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Number expected").ThrowAsJavaScriptException();
    return env.Null();
  }
  
  double input = info[0].As<Napi::Number>().DoubleValue();
  Napi::Promise::Deferred deferred = Napi::Promise::Deferred::New(env);
  
  ComputeWorker* worker = new ComputeWorker(env, input, deferred);
  worker->Queue();
  
  return deferred.Promise();
}
```

## 调试与测试

### 编译调试版本

```bash
# 编译 Debug 版本
node-gyp rebuild --debug

# 生成的文件位于 build/Debug/
```

### 使用调试器

#### macOS (lldb)

```bash
# 启动 lldb
lldb -- node your-app.js

# 在 lldb 中设置断点 break addon.cc:25 run continue
```

#### Linux (gdb)

```bash
# 启动 gdb
gdb --args node your-app.js

# 在 gdb 中 break addon.cc:25 run continue
```

#### Windows (Visual Studio)

1. 打开 Visual Studio
2. 选择 "调试" -> "附加到进程"
3. 选择 Node.js 进程
4. 设置断点并调试

### 日志调试

```cpp
#include <iostream>
#include <napi.h>

static napi_value DebugExample(napi_env env, napi_callback_info info) {
  std::cout << "[Native] Function called" << std::endl;
  
  // 调试变量
  double value = 42.0;
  std::cout << "[Native] Value: " << value << std::endl;
  
  return nullptr;
}
```

### 单元测试

```javascript
// test/addon.test.js
const assert = require('assert')
const NativeAddon = require('../index')

describe('NativeAddon', () => {
  describe('#hello()', () => {
    it('should return hello string', () => {
      assert.strictEqual(NativeAddon.hello(), 'Hello from C++!')
    })
  })
  
  describe('#add()', () => {
    it('should add two numbers', () => {
      assert.strictEqual(NativeAddon.add(1, 2), 3)
      assert.strictEqual(NativeAddon.add(-1, 1), 0)
    })
    
    it('should throw on invalid input', () => {
      assert.throws(() => NativeAddon.add('a', 'b'), TypeError)
    })
  })
  
  describe('#computeAsync()', () => {
    it('should compute asynchronously', async () => {
      const result = await NativeAddon.computeAsync(10)
      assert.strictEqual(result, 20)
    })
  })
})
```

## 常见问题解答

### Q1: 模块加载失败 "Error: The module was compiled against a different Node.js version"

**原因**: 原生模块的 Node.js 版本与 Electron 的 Node.js 版本不匹配。

**解决方案**:

```bash
# 清理缓存
npm cache clean --force
rm -rf node_modules

# 重新安装并编译
npm install
npx electron-rebuild
```

### Q2: 编译错误 "gyp ERR! find Python"

**原因**: 缺少 Python 环境。

**解决方案**:

```bash
# macOS
brew install python

# Windows - 下载安装 Python

# Linux
sudo apt-get install python3
```

### Q3: Windows 上编译失败

**解决方案**:

1. 安装 Visual Studio Build Tools
2. 安装 Windows SDK

```bash
# 以管理员权限运行(该包已停止维护,推荐按上面步骤安装 Visual Studio Build Tools)
npm install --global windows-build-tools
```

### Q4: 如何处理跨平台差异?

**解决方案**:

在 `binding.gyp` 中使用条件配置:

```python
"conditions": [
  ["OS=='win'", {
    "defines": ["WIN32"],
    "libraries": ["ws2_32.lib"]
  }],
  ["OS=='mac'", {
    "xcode_settings": {
      "MACOSX_DEPLOYMENT_TARGET": "10.13"
    }
  }],
  ["OS=='linux'", {
    "libraries": ["-lpthread"]
  }]
]
```

### Q5: 如何在打包后正常使用原生模块?

**解决方案**:

配置 `electron-builder` 自动重建:

```json
{
  "build": {
    "npmRebuild": true,
    "nodeGypRebuild": true
  }
}
```

### Q6: 原生模块内存泄漏如何排查?

**解决方案**:

1. 使用 Valgrind (Linux/macOS):

```bash
valgrind --leak-check=full node your-app.js
```

2. 使用 AddressSanitizer:

```python
# binding.gyp
"cflags_cc": ["-fsanitize=address", "-fno-omit-frame-pointer"]
```

### Q7: 如何优化原生模块性能?

**建议**:

1. 避免频繁的跨语言调用
2. 使用批量操作减少边界穿越
3. 异步处理耗时操作
4. 使用对象池减少内存分配
5. 启用编译器优化:

```python
# binding.gyp
"cflags_cc": ["-O3", "-march=native"]
```

## 最佳实践

### 1. 版本兼容性

```json
// package.json
{
  "peerDependencies": {
    "electron": "^28.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### 2. 错误处理

```cpp
// 使用异常或错误码
static napi_value SafeFunction(napi_env env, napi_callback_info info) {
  napi_status status;
  
  // ... 操作
  
  if (status != napi_ok) {
    napi_throw_error(env, NULL, "Operation failed");
    return nullptr;
  }
  
  return result;
}
```

### 3. 资源管理

```cpp
class Resource {
public:
  Resource() { /* 分配资源 */ }
  ~Resource() { /* 释放资源 */ }
  
  // 禁止拷贝
  Resource(const Resource&) = delete;
  Resource& operator=(const Resource&) = delete;
};
```

### 4. 跨平台宏

```cpp
#if defined(_WIN32)
  // Windows 代码
#elif defined(__APPLE__)
  // macOS 代码
#elif defined(__linux__)
  // Linux 代码
#endif
```

### 5. 类型安全

```javascript
// JavaScript 封装层进行类型检查
function safeAdd(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('Arguments must be numbers')
  }
  return addon.add(a, b)
}
```

### 6. 文档与注释

```cpp
/**
 * @brief 计算两个数的和
 * @param env N-API 环境
 * @param info 回调信息
 * @return 两数之和
 * 
 * @example
 * // JavaScript
 * addon.add(1, 2) // returns 3
 */
static napi_value Add(napi_env env, napi_callback_info info) {
  // ...
}
```

## 参考资源

- [05-使用Rust开发扩展](05-使用Rust开发扩展.md)
- [Node.js N-API 官方文档](https://nodejs.org/api/n-api.html)
- [node-addon-api GitHub](https://github.com/nodejs/node-addon-api)
- [electron-rebuild 文档](https://github.com/electron/electron-rebuild)
- [node-gyp 使用指南](https://github.com/nodejs/node-gyp)
