---
title: 使用Rust开发扩展
description: "Rust 作为一门现代系统编程语言,为 Node.js 原生扩展开发提供了更安全、更高效的选择。通过 NAPI-RS,开发者可以充分利用 Rust 的内存安全特性和出色性能,同时无缝集成到 Node.js 生态系统中。"
keywords: [使用Rust开发扩展]
category: Electron
tags: [Electron, 桌面应用, IPC, 打包]
---

# 使用Rust开发扩展

Rust 作为一门现代系统编程语言,为 Node.js 原生扩展开发提供了更安全、更高效的选择。通过 NAPI-RS,开发者可以充分利用 Rust 的内存安全特性和出色性能,同时无缝集成到 Node.js 生态系统中。

## Rust vs C++

### 技术对比

| 特性 | Rust | C++ |
|------|------|-----|
| **内存安全** | ✅ 编译时保证,无 GC | ⚠️ 需手动管理,易出错 |
| **性能** | ✅ 零成本抽象,媲美 C++ | ✅ 高性能 |
| **学习曲线** | ⚠️ 较陡峭 | ⚠️ 较陡峭 |
| **生态系统** | ✅ Cargo 包管理,现代化 | ⚠️ 分散的依赖管理 |
| **并发安全** | ✅ 类型系统保证 | ⚠️ 易发生数据竞争 |
| **错误处理** | ✅ Result<T, E> 强制处理 | ⚠️ 异常或错误码 |
| **编译速度** | ⚠️ 较慢 | ✅ 较快 |
| **社区支持** | ✅ 快速增长 | ✅ 成熟庞大 |
| **开发体验** | ✅ 现代化工具链 | ⚠️ 工具分散 |

### 核心优势

#### 1. 内存安全

```rust
// Rust: 编译时防止空指针
fn safe_access(data: &Option<String>) -> &str {
    data.as_ref().map(|s| s.as_str()).unwrap_or("default")
}

// C++: 运行时可能崩溃
std::string* unsafe_access(std::string* data) {
    if (data == nullptr) {
        // 未处理导致崩溃
    }
    return data;
}
```

#### 2. 错误处理

```rust
// Rust: 强制处理错误
fn read_file(path: &str) -> Result<String, std::io::Error> {
    std::fs::read_to_string(path)  // 必须处理可能的错误
}

// 使用时
match read_file("config.txt") {
    Ok(content) => println!("{}", content),
    Err(e) => eprintln!("Error: {}", e),
}
```

#### 3. 并发安全

```rust
use std::sync::{Arc, Mutex};

// Rust: 类型系统保证线程安全
let counter = Arc::new(Mutex::new(0));
let counter_clone = counter.clone();

std::thread::spawn(move || {
    let mut num = counter_clone.lock().unwrap();
    *num += 1;  // 编译器确保安全访问
});
```

### 性能对比

| 操作 | Rust | C++ | JavaScript | Rust 性能提升 |
|------|------|-----|------------|--------------|
| 数值计算 | 15ms | 15ms | 1200ms | 80x vs JS |
| 字符串处理 | 45ms | 42ms | 890ms | 20x vs JS |
| JSON 解析 | 120ms | 115ms | 1800ms | 15x vs JS |
| 文件读写 | 200ms | 195ms | 3500ms | 17x vs JS |

> 注: 数据基于相同硬件环境基准测试,实际性能因场景而异。

## 系统架构

### 整体架构图

```
┌──────────────────────────────────────────────────────┐
│                Electron 应用层                        │
│  ┌────────────────┐          ┌────────────────┐    │
│  │   渲染进程      │          │    主进程       │    │
│  │   (Renderer)   │   IPC    │    (Main)      │    │
│  └────────────────┘   ◄──►   └────────────────┘    │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│                Node.js 运行时                         │
│  ┌────────────────────────────────────────────────┐ │
│  │         N-API (Node API)                       │ │
│  │  - 稳定的 ABI 接口                              │ │
│  │  - 版本无关的二进制兼容                         │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│           NAPI-RS 绑定层                             │
│  ┌────────────────────────────────────────────────┐ │
│  │  - 自动类型转换                                 │ │
│  │  - 异常处理桥接                                 │ │
│  │  - 异步任务支持                                 │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│             Rust 业务逻辑层                          │
│  ┌────────────────────────────────────────────────┐ │
│  │  - 安全的内存管理                               │ │
│  │  - 高效的并发模型                               │ │
│  │  - 丰富的 Crate 生态                            │ │
│  └────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────┐
│               操作系统层                             │
│  - Windows API                                       │
│  - macOS Core Framework                              │
│  - Linux System Libraries                            │
└──────────────────────────────────────────────────────┘
```

### NAPI-RS 工作流程

```
┌─────────────┐
│  JavaScript │
│   调用      │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  NAPI-RS 宏展开  │
│  #[napi]         │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  类型自动转换    │
│  JS ↔ Rust       │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  Rust 函数执行   │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  结果返回/异常   │
└──────┬───────────┘
       │
       ▼
┌─────────────┐
│  JavaScript │
│   接收结果  │
└─────────────┘
```

## 环境搭建

### 前置要求

- Node.js >= 16.0.0
- pnpm 或 npm
- Rust 工具链

### 1. 安装 Rust 工具链

#### macOS/Linux

```bash
# 安装 rustup (Rust 版本管理器)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 配置环境变量
source $HOME/.cargo/env

# 验证安装
rustc --version
cargo --version
```

#### Windows

1. 下载 [rustup-init.exe](https://rustup.rs/)
2. 运行安装程序
3. 安装 Visual Studio Build Tools (C++ 工作负载)

```powershell
# 验证安装
rustc --version
cargo --version
```

### 2. 配置 Rust 环境

```bash
# 安装 stable 工具链
rustup install stable
rustup default stable

# 添加常用组件
rustup component add clippy      # 代码检查工具
rustup component add rustfmt     # 代码格式化
rustup component add rust-analyzer  # IDE 支持

# 更新到最新版本
rustup update
```

### 3. 安装 NAPI-RS CLI

```bash
# 使用 pnpm
pnpm add -g @napi-rs/cli

# 或使用 npm
npm install -g @napi-rs/cli

# 验证安装
napi --version
```

### 4. IDE 配置 (推荐)

#### VS Code 扩展

```json
// .vscode/extensions.json
{
  "recommendations": [
    "rust-lang.rust-analyzer",  // Rust 语言服务器
    "vadimcn.vscode-lldb",      // 调试支持
    "serayuzgur.crates",        // Cargo.toml 辅助
    "usernamehw.errorlens"      // 错误提示增强
  ]
}
```

#### Rust Analyzer 配置

```json
// .vscode/settings.json
{
  "rust-analyzer.cargo.features": "all",
  "rust-analyzer.checkOnSave.command": "clippy",
  "rust-analyzer.inlayHints.enable": true
}
```

## 快速开始

### 创建项目

```bash
# 交互式创建项目
napi new

# 或直接指定项目名
napi new my-native-addon
```

创建过程会提示:
- 项目名称
- 支持的目标平台
- 是否启用 GitHub Actions

### 项目结构

```
my-native-addon/
├── Cargo.toml              # Rust 项目配置
├── package.json            # NPM 包配置
├── napi.config.js          # NAPI-RS 配置
├── src/
│   └── lib.rs              # Rust 源代码
├── __tests__/
│   └── index.spec.ts       # 测试文件
├── npm/                    # 多平台二进制文件
│   ├── darwin-x64/
│   ├── win32-x64-msvc/
│   └── linux-x64-gnu/
└── index.d.ts              # 自动生成的类型定义
```

### 基础示例

#### Rust 代码

```rust
// src/lib.rs

/// 简单的加法函数
#[napi]
pub fn sum(a: i32, b: i32) -> i32 {
    a + b
}

/// 返回问候语
#[napi]
pub fn greet(name: String) -> String {
    format!("Hello, {}!", name)
}

/// 计算斐波那契数列
#[napi]
pub fn fibonacci(n: u32) -> u32 {
    if n <= 1 {
        return n;
    }
    
    let mut a = 0;
    let mut b = 1;
    
    for _ in 2..=n {
        let temp = a + b;
        a = b;
        b = temp;
    }
    
    b
}
```

#### 构建与使用

```bash
# 开发模式构建
pnpm build

# 生产模式构建
pnpm build --release

# 监听模式(自动重新编译)
pnpm build --watch
```

#### JavaScript 调用

```typescript
import { sum, greet, fibonacci } from 'my-native-addon'

console.log(sum(10, 20))           // 30
console.log(greet('World'))         // "Hello, World!"
console.log(fibonacci(10))          // 55
```

### 自动类型生成

NAPI-RS 会自动生成 TypeScript 类型定义:

```typescript
// index.d.ts (自动生成)
export function sum(a: number, b: number): number
export function greet(name: string): string
export function fibonacci(n: number): number
```

## 进阶开发

### 数据类型映射

#### 基础类型

| Rust 类型 | JavaScript 类型 | 说明 |
|-----------|----------------|------|
| `i32` | `number` | 32位整数 |
| `i64` | `number` | 64位整数 |
| `f64` | `number` | 64位浮点数 |
| `bool` | `boolean` | 布尔值 |
| `String` | `string` | 字符串 |
| `Vec<u8>` | `Buffer` | 字节数组 |
| `Vec<T>` | `T[]` | 数组 |

#### 对象映射

```rust
use napi::bindgen_prelude::*;

/// 用户信息结构体
#[napi(object)]
pub struct User {
    pub id: u32,
    pub name: String,
    pub email: String,
    pub age: Option<u32>,  // 可选字段
}

/// 创建用户
#[napi]
pub fn create_user(id: u32, name: String) -> User {
    User {
        id,
        name,
        email: format!("{}@example.com", name.to_lowercase()),
        age: None,
    }
}

/// 处理用户数据
#[napi]
pub fn process_users(users: Vec<User>) -> u32 {
    users.len() as u32
}
```

```typescript
// TypeScript 使用
interface User {
  id: number
  name: string
  email: string
  age?: number
}

const user = createUser(1, '张三')
console.log(user.email)  // "zhangsan@example.com"
```

### 异步操作

#### Promise 支持

```rust
use napi::bindgen_prelude::*;
use std::time::Duration;
use tokio::time::sleep;

/// 异步延迟
#[napi]
pub async fn delay(ms: u32) -> String {
    sleep(Duration::from_millis(ms as u64)).await;
    format!("Delayed {}ms", ms)
}

/// 异步文件读取
#[napi]
pub async fn read_file_async(path: String) -> Result<String> {
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| Error::from_reason(e.to_string()))
}

/// 异步网络请求示例
#[napi]
pub async fn fetch_data(url: String) -> Result<String> {
    // 使用 reqwest 等 crate
    let body = reqwest::get(&url)
        .await
        .map_err(|e| Error::from_reason(e.to_string()))?
        .text()
        .await
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    Ok(body)
}
```

```typescript
// JavaScript 调用
await delay(1000)
const content = await readFileAsync('./config.json')
const data = await fetchData('https://api.example.com/data')
```

#### 回调函数

```rust
use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ErrorStrategy, ThreadsafeFunctionCallMode};

/// 事件监听器
#[napi]
pub fn on_event(callback: ThreadsafeFunction<String, ErrorStrategy::Fatal>) {
    std::thread::spawn(move || {
        for i in 0..5 {
            let msg = format!("Event {}", i);
            callback.call(msg, ThreadsafeFunctionCallMode::NonBlocking);
            std::thread::sleep(std::time::Duration::from_millis(100));
        }
    });
}
```

```typescript
// JavaScript 使用
onEvent((event) => {
  console.log(event)  // "Event 0", "Event 1", ...
})
```

### 错误处理

```rust
use napi::bindgen_prelude::*;

/// 自定义错误类型
#[napi]
pub enum AppError {
    NotFound,
    InvalidInput,
    PermissionDenied,
}

/// 返回结果或错误
#[napi]
pub fn divide(a: f64, b: f64) -> Result<f64> {
    if b == 0.0 {
        return Err(Error::from_reason("Division by zero"));
    }
    Ok(a / b)
}

/// 使用自定义错误
#[napi]
pub fn check_value(value: i32) -> Result<String> {
    match value {
        0 => Err(Error::from_reason("Value cannot be zero")),
        v if v < 0 => Err(Error::from_reason("Value must be positive")),
        _ => Ok(format!("Value is {}", value)),
    }
}
```

### 类和对象

```rust
use napi::bindgen_prelude::*;

/// 计算器类
#[napi]
pub struct Calculator {
    value: f64,
}

#[napi]
impl Calculator {
    /// 创建新实例
    #[napi(constructor)]
    pub fn new(initial: Option<f64>) -> Self {
        Calculator {
            value: initial.unwrap_or(0.0),
        }
    }
    
    /// 获取当前值
    #[napi(getter)]
    pub fn value(&self) -> f64 {
        self.value
    }
    
    /// 设置值
    #[napi(setter)]
    pub fn set_value(&mut self, val: f64) {
        self.value = val;
    }
    
    /// 加法
    #[napi]
    pub fn add(&mut self, n: f64) -> f64 {
        self.value += n;
        self.value
    }
    
    /// 减法
    #[napi]
    pub fn subtract(&mut self, n: f64) -> f64 {
        self.value -= n;
        self.value
    }
    
    /// 乘法
    #[napi]
    pub fn multiply(&mut self, n: f64) -> f64 {
        self.value *= n;
        self.value
    }
    
    /// 重置
    #[napi]
    pub fn reset(&mut self) {
        self.value = 0.0;
    }
}
```

```typescript
// TypeScript 使用
const calc = new Calculator(10)
console.log(calc.value)          // 10
calc.add(5)
console.log(calc.value)          // 15
calc.multiply(2)
console.log(calc.value)          // 30
calc.value = 100                 // 使用 setter
```

## 实战案例

### 案例 1: 剪贴板管理器

```rust
use napi::bindgen_prelude::*;
use clipboard_master::{ClipboardHandler, Master, CallbackResult};
use clipboard_win::{get_clipboard_string, set_clipboard_string};

/// 剪贴板内容类型
#[napi(object)]
pub struct ClipboardContent {
    #[napi(ts_type = "'text' | 'file' | 'image'")]
    pub content_type: String,
    pub data: String,
}

/// 读取剪贴板
#[napi]
pub fn read_clipboard() -> Result<ClipboardContent> {
    let text = get_clipboard_string()
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    Ok(ClipboardContent {
        content_type: "text".to_string(),
        data: text,
    })
}

/// 写入剪贴板
#[napi]
pub fn write_clipboard(text: String) -> Result<()> {
    set_clipboard_string(&text)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    Ok(())
}
```

### 案例 2: 文件系统监控

```rust
use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ErrorStrategy, ThreadsafeFunctionCallMode};
use notify::{Watcher, RecursiveMode, watcher};
use std::sync::mpsc::channel;
use std::time::Duration;

/// 文件变更事件
#[napi(object)]
pub struct FileEvent {
    pub path: String,
    #[napi(ts_type = "'create' | 'modify' | 'remove'")]
    pub event_type: String,
}

/// 监控文件变化
#[napi]
pub fn watch_path(
    path: String,
    callback: ThreadsafeFunction<FileEvent, ErrorStrategy::Fatal>,
) -> Result<()> {
    std::thread::spawn(move || {
        let (tx, rx) = channel();
        
        let mut watcher = watcher(tx, Duration::from_millis(200))
            .expect("Failed to create watcher");
        
        watcher.watch(&path, RecursiveMode::Recursive)
            .expect("Failed to watch path");
        
        while let Ok(event) = rx.recv() {
            use notify::DebouncedEvent::*;
            
            let (event_type, path) = match event {
                Create(p) => ("create", p),
                Write(p) => ("modify", p),
                Remove(p) => ("remove", p),
                _ => continue,
            };
            
            callback.call(
                FileEvent {
                    path: path.to_string_lossy().to_string(),
                    event_type: event_type.to_string(),
                },
                ThreadsafeFunctionCallMode::NonBlocking,
            );
        }
    });
    
    Ok(())
}
```

```typescript
// JavaScript 使用
watchPath('./src', (event) => {
  console.log(`${event.eventType}: ${event.path}`)
})
```

### 案例 3: 图像处理

```rust
use napi::bindgen_prelude::*;
use image::{ImageBuffer, Rgba, DynamicImage};

/// 图像尺寸
#[napi(object)]
pub struct ImageSize {
    pub width: u32,
    pub height: u32,
}

/// 获取图像尺寸
#[napi]
pub fn get_image_size(path: String) -> Result<ImageSize> {
    let img = image::open(&path)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    Ok(ImageSize {
        width: img.width(),
        height: img.height(),
    })
}

/// 调整图像大小
#[napi]
pub fn resize_image(
    input_path: String,
    output_path: String,
    width: u32,
    height: u32,
) -> Result<()> {
    let img = image::open(&input_path)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    let resized = img.resize(width, height, image::imageops::FilterType::Lanczos3);
    
    resized.save(&output_path)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    Ok(())
}

/// 图像灰度化
#[napi]
pub fn grayscale_image(input_path: String, output_path: String) -> Result<()> {
    let img = image::open(&input_path)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    let gray = img.grayscale();
    
    gray.save(&output_path)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    Ok(())
}
```

### 案例 4: 加密工具

```rust
use napi::bindgen_prelude::*;
use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::RngCore;

/// 加密数据
#[napi]
pub fn encrypt(data: String, key: String) -> Result<String> {
    let key_bytes = hex::decode(&key)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let ciphertext = cipher.encrypt(nonce, data.as_bytes())
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    let mut result = nonce_bytes.to_vec();
    result.extend(ciphertext);
    
    Ok(BASE64.encode(&result))
}

/// 解密数据
#[napi]
pub fn decrypt(encrypted: String, key: String) -> Result<String> {
    let key_bytes = hex::decode(&key)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    let data = BASE64.decode(&encrypted)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    let cipher = Aes256Gcm::new_from_slice(&key_bytes)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    let nonce = Nonce::from_slice(&data[..12]);
    let plaintext = cipher.decrypt(nonce, &data[12..])
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    String::from_utf8(plaintext)
        .map_err(|e| Error::from_reason(e.to_string()))
}
```

### 案例 5: 系统信息

```rust
use napi::bindgen_prelude::*;
use sysinfo::{System, SystemExt, ProcessorExt};

/// 系统信息
#[napi(object)]
pub struct SystemInfo {
    pub os_name: String,
    pub os_version: String,
    pub cpu_usage: f32,
    pub total_memory: u64,
    pub used_memory: u64,
    pub free_memory: u64,
}

/// 获取系统信息
#[napi]
pub fn get_system_info() -> SystemInfo {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    let cpu_usage = sys.global_processor_info().cpu_usage();
    
    SystemInfo {
        os_name: sys.name().unwrap_or_default(),
        os_version: sys.os_version().unwrap_or_default(),
        cpu_usage,
        total_memory: sys.total_memory(),
        used_memory: sys.used_memory(),
        free_memory: sys.free_memory(),
    }
}
```

## 调试与测试

### 调试配置

#### VS Code launch.json

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug Rust",
      "cargo": {
        "args": ["build", "--lib"],
        "filter": {
          "name": "my-native-addon",
          "kind": "lib"
        }
      },
      "preLaunchTask": "npm: build",
      "program": "${workspaceFolder}/index.js"
    }
  ]
}
```

### 单元测试

#### Rust 测试

```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_sum() {
        assert_eq!(sum(1, 2), 3);
        assert_eq!(sum(-1, 1), 0);
    }
    
    #[test]
    fn test_fibonacci() {
        assert_eq!(fibonacci(0), 0);
        assert_eq!(fibonacci(1), 1);
        assert_eq!(fibonacci(10), 55);
    }
}
```

```bash
# 运行 Rust 测试
cargo test
```

#### JavaScript 测试

```typescript
// __tests__/index.spec.ts
import { sum, greet, fibonacci, Calculator } from '..'

describe('Native Module', () => {
  test('sum should add two numbers', () => {
    expect(sum(1, 2)).toBe(3)
    expect(sum(-1, 1)).toBe(0)
  })
  
  test('greet should return greeting', () => {
    expect(greet('World')).toBe('Hello, World!')
  })
  
  test('fibonacci should calculate correctly', () => {
    expect(fibonacci(0)).toBe(0)
    expect(fibonacci(1)).toBe(1)
    expect(fibonacci(10)).toBe(55)
  })
  
  test('Calculator should work correctly', () => {
    const calc = new Calculator(10)
    expect(calc.value).toBe(10)
    
    calc.add(5)
    expect(calc.value).toBe(15)
    
    calc.multiply(2)
    expect(calc.value).toBe(30)
  })
})
```

```bash
# 运行 JavaScript 测试
pnpm test
```

### 性能测试

```typescript
// benchmarks/performance.ts
import { sum, fibonacci } from '..'

function benchmark(name: string, fn: () => void, iterations: number = 10000) {
  const start = Date.now()
  for (let i = 0; i < iterations; i++) {
    fn()
  }
  const end = Date.now()
  console.log(`${name}: ${end - start}ms`)
}

benchmark('sum', () => sum(100, 200))
benchmark('fibonacci', () => fibonacci(20))
```

## 性能优化

### 1. 减少边界穿越

```rust
// ❌ 频繁调用
#[napi]
pub fn process_array(arr: Vec<i32>) -> i32 {
    arr.iter().sum()
}

// ✅ 批量处理
#[napi]
pub fn process_batch(items: Vec<WorkItem>) -> Vec<Result> {
    items.into_iter().map(process_one).collect()
}
```

### 2. 使用零拷贝

```rust
use napi::bindgen_prelude::Buffer;

#[napi]
pub fn process_buffer(data: Buffer) -> Buffer {
    // 直接操作 Buffer,避免复制
    let mut vec: Vec<u8> = data.into();
    
    // 处理数据
    for byte in &mut vec {
        *byte = byte.wrapping_add(1);
    }
    
    Buffer::from(vec)
}
```

### 3. 异步并发

```rust
use tokio::join;

#[napi]
pub async fn parallel_tasks() -> Result<(String, String)> {
    let task1 = async_task1();
    let task2 = async_task2();
    
    let (result1, result2) = join!(task1, task2);
    
    Ok((result1?, result2?))
}
```

### 4. 编译优化

```toml
# Cargo.toml
[profile.release]
lto = true              # 链接时优化
codegen-units = 1       # 单个代码生成单元
panic = "abort"         # 减小二进制大小
strip = true            # 移除符号信息
```

### 5. 内存池

```rust
use std::sync::Arc;
use parking_lot::Mutex;

struct Pool<T> {
    items: Arc<Mutex<Vec<T>>>,
}

impl<T: Clone> Pool<T> {
    pub fn new(initial: Vec<T>) -> Self {
        Pool {
            items: Arc::new(Mutex::new(initial)),
        }
    }
    
    pub fn get(&self) -> Option<T> {
        self.items.lock().pop()
    }
    
    pub fn put(&self, item: T) {
        self.items.lock().push(item);
    }
}
```

## 常见问题解答

### Q1: 如何处理跨平台路径?

**解决方案**:

```rust
use std::path::PathBuf;

#[napi]
pub fn resolve_path(base: String, relative: String) -> String {
    PathBuf::from(&base)
        .join(&relative)
        .to_string_lossy()
        .to_string()
}
```

### Q2: 如何处理大文件?

**解决方案**:

使用流式处理:

```rust
use std::fs::File;
use std::io::{BufReader, BufRead};

#[napi]
pub fn process_large_file(path: String) -> Result<u64> {
    let file = File::open(&path)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    let reader = BufReader::new(file);
    let mut line_count = 0;
    
    for _ in reader.lines() {
        line_count += 1;
    }
    
    Ok(line_count)
}
```

### Q3: 如何在 Electron 中自动重建?

**解决方案**:

```json
// package.json
{
  "scripts": {
    "postinstall": "electron-rebuild -f -w my-native-addon"
  }
}
```

### Q4: 编译速度慢怎么办?

**解决方案**:

1. 使用增量编译

```toml
# Cargo.toml
[profile.dev]
incremental = true
```

2. 使用 sccache 缓存

```bash
cargo install sccache
export RUSTC_WRAPPER=sccache
```

### Q5: 如何减小二进制文件大小?

**解决方案**:

```toml
# Cargo.toml
[profile.release]
opt-level = "z"     # 优化大小
lto = true
panic = "abort"
strip = true

[dependencies]
# 只启用需要的功能
serde = { version = "1.0", default-features = false, features = ["derive"] }
```

### Q6: 如何处理线程安全?

**解决方案**:

```rust
use std::sync::Arc;
use parking_lot::RwLock;

#[napi]
pub struct SharedState {
    data: Arc<RwLock<Vec<String>>>,
}

#[napi]
impl SharedState {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            data: Arc::new(RwLock::new(Vec::new())),
        }
    }
    
    #[napi]
    pub fn add(&self, item: String) {
        self.data.write().push(item);
    }
    
    #[napi]
    pub fn get_all(&self) -> Vec<String> {
        self.data.read().clone()
    }
}
```

### Q7: 如何发布多平台二进制文件?

**解决方案**:

使用 GitHub Actions 自动构建:

```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
          - os: macos-latest
            target: x86_64-apple-darwin
          - os: macos-latest
            target: aarch64-apple-darwin
          - os: windows-latest
            target: x86_64-pc-windows-msvc
    
    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: ${{ matrix.target }}
      
      - run: npm install
      - run: npx napi build --platform --release
      
      - uses: softprops/action-gh-release@v1
        with:
          files: |
            *.node
```

## 最佳实践

### 1. 错误处理

```rust
// ✅ 使用 Result 和清晰的错误信息
#[napi]
pub fn safe_operation(input: i32) -> Result<String> {
    if input < 0 {
        return Err(Error::from_reason("Input must be non-negative"));
    }
    Ok(format!("Processed: {}", input))
}
```

### 2. 类型安全

```rust
// ✅ 使用强类型
#[napi(object)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub timeout_ms: Option<u32>,
}

#[napi]
pub fn create_server(config: Config) -> Result<String> {
    // 类型安全的配置访问
    let timeout = config.timeout_ms.unwrap_or(5000);
    Ok(format!("Server at {}:{}", config.host, config.port))
}
```

### 3. 文档注释

```rust
/// 计算两个数的最大公约数
/// 
/// # Arguments
/// * `a` - 第一个数
/// * `b` - 第二个数
/// 
/// # Returns
/// 最大公约数
/// 
/// # Example
/// ```javascript
/// gcd(12, 8) // returns 4
/// ```
#[napi]
pub fn gcd(a: u64, b: u64) -> u64 {
    if b == 0 {
        a
    } else {
        gcd(b, a % b)
    }
}
```

### 4. 资源管理

```rust
use std::fs::File;

#[napi]
pub struct FileHandle {
    file: File,
}

#[napi]
impl FileHandle {
    #[napi(constructor)]
    pub fn open(path: String) -> Result<Self> {
        let file = File::open(&path)
            .map_err(|e| Error::from_reason(e.to_string()))?;
        Ok(Self { file })
    }
}

// 自动实现 Drop trait,资源会被自动释放
impl Drop for FileHandle {
    fn drop(&mut self) {
        // 清理资源
    }
}
```

### 5. 并发安全

```rust
use std::sync::Arc;
use tokio::sync::Mutex;

#[napi]
pub struct AsyncState {
    data: Arc<Mutex<Vec<String>>>,
}

#[napi]
impl AsyncState {
    #[napi(constructor)]
    pub fn new() -> Self {
        Self {
            data: Arc::new(Mutex::new(Vec::new())),
        }
    }
    
    #[napi]
    pub async fn add(&self, item: String) {
        let mut data = self.data.lock().await;
        data.push(item);
    }
}
```

### 6. 性能监控

```rust
use std::time::Instant;

#[napi]
pub fn performance_example() -> String {
    let start = Instant::now();
    
    // 执行操作
    let result = expensive_operation();
    
    let duration = start.elapsed();
    println!("Operation took: {:?}", duration);
    
    result
}
```

### 7. 配置管理

```rust
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[napi(object)]
pub struct AppConfig {
    pub debug: bool,
    pub max_connections: u32,
    pub log_level: String,
}

#[napi]
pub fn load_config(path: String) -> Result<AppConfig> {
    let content = std::fs::read_to_string(&path)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    let config: AppConfig = toml::from_str(&content)
        .map_err(|e| Error::from_reason(e.to_string()))?;
    
    Ok(config)
}
```

## 参考资源

- [03-Node原生模块](03-Node原生模块.md)
- [NAPI-RS 官方文档](https://napi.rs/)
- [Rust 官方文档](https://doc.rust-lang.org/)
- [Tokio 异步运行时](https://tokio.rs/)
- [Rust Cookbook](https://rust-lang-nursery.github.io/rust-cookbook/)
- [Awesome Rust](https://github.com/rust-unofficial/awesome-rust)
