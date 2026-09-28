---
title: Puppeteer与VSCode-Debugger融合调试
description: 讲解 Puppeteer 与 VSCode Debugger 作为两个 CDP Client 协同调试的三种方式（attach、connect、JavaScript Debug Terminal），并在 E2E 失败场景中演示断点与调试辅助手段。
keywords: [浏览器自动化, Puppeteer, VSCode-Debugger]
category: 调试
tags: [自动化调试, VSCode, Puppeteer]
---

# Puppeteer与VSCode-Debugger融合调试

本节学习如何将 Puppeteer 与 VSCode Debugger 结合，实现自动化调试。

> **2024-2026 更新**：VSCode js-debug 已内置支持，Puppeteer 调试配置更简单。Playwright 也提供了类似的调试体验。

## 融合调试的原理

Puppeteer 通过 CDP 控制浏览器，VSCode js-debug 也通过 CDP 调试代码。它们本质上是两个 CDP Client，连接到同一个 Chrome 实例。

```mermaid
graph TB
    subgraph VSCode["VSCode"]
        JSDebug["js-debug<br/>（CDP Client #1）"]
        Editor2["编辑器<br/>（断点、变量查看）"]
    end

    subgraph Puppeteer_Instance["Puppeteer"]
        PupAPI["Puppeteer API<br/>（CDP Client #2）"]
    end

    subgraph Chrome2["Chrome"]
        CDPBackend["CDP Backend"]
        Target2["Target（页面）"]
    end

    JSDebug <-->|"CDP（Debugger Domain）"| CDPBackend
    PupAPI <-->|"CDP（Page / Runtime / DOM 等）"| CDPBackend
    CDPBackend <--> Target2

    Editor2 <-->|"显示源码 + 断点"| JSDebug

```

**关键**：两个 CDP Client 可以同时连接到同一个 Chrome 实例，互不干扰。js-debug 使用 Debugger Domain 设置断点，Puppeteer 使用 Page/Network/DOM 等 Domain 控制页面。

## 方式一：Puppeteer 启动 Chrome + VSCode 附加

### 步骤

1. 在 Puppeteer 脚本中启动 Chrome 并暴露调试端口
2. VSCode 通过 attach 配置连接到该端口

```javascript
// test.js
const puppeteer = require('puppeteer');

(async () => {
    // 启动 Chrome，暴露调试端口
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--remote-debugging-port=9222'],
    });

    const page = await browser.newPage();
    await page.goto('http://localhost:5173');

    // 在此处可以设置 debugger 语句
    // 或在 VSCode 中设置断点
    await page.click('#submit');

    await browser.close();
})();
```

VSCode 调试配置：

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Attach to Puppeteer",
            "type": "chrome",
            "request": "attach",
            "port": 9222,
            "webRoot": "${workspaceFolder}",
            "sourceMaps": true
        }
    ]
}
```

### 执行流程

```mermaid
sequenceDiagram
    participant Dev as 开发者
    participant VSCode2 as VSCode
    participant Node as Node.js（Puppeteer）
    participant Chrome3 as Chrome

    Note over Node: 运行 test.js
    Node->>Chrome3: puppeteer.launch()<br/>--remote-debugging-port=9222
    Chrome3-->>Node: 启动完成

    Note over Dev: 在 VSCode 中点击"附加"
    VSCode2->>Chrome3: 连接 9222 端口
    VSCode2->>Chrome3: 设置断点（Debugger Domain）

    Node->>Chrome3: page.click('#submit')
    Chrome3->>VSCode2: 断点命中
    VSCode2->>Dev: 显示源码、变量、调用栈

    Note over Dev: 继续执行
    VSCode2->>Chrome3: resume
    Chrome3-->>Node: 操作完成
```

## 方式二：VSCode 启动 Chrome + Puppeteer 附加

### 步骤

1. VSCode 启动 Chrome 并打开页面
2. Puppeteer 通过 `puppeteer.connect()` 连接到已有的 Chrome

VSCode 调试配置：

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch Chrome",
            "type": "chrome",
            "request": "launch",
            "url": "http://localhost:5173",
            "webRoot": "${workspaceFolder}",
            "runtimeArgs": ["--remote-debugging-port=9222"]
        }
    ]
}
```

Puppeteer 脚本：

```javascript
const puppeteer = require('puppeteer-core');

(async () => {
    // 连接到 VSCode 启动的 Chrome
    const browser = await puppeteer.connect({
        browserURL: 'http://127.0.0.1:9222',
    });

    const pages = await browser.pages();
    const page = pages[0];

    // 执行自动化操作
    await page.click('#submit');
    await page.type('#search', 'hello');
})();
```

## 方式三：使用 JavaScript Debug Terminal

> **2024-2026 更新**：最简单的方式是使用 VSCode 的 JavaScript Debug Terminal：

### 步骤

1. 在 VSCode 中打开 JavaScript Debug Terminal（`Cmd+Shift+P` → Debug: JavaScript Debug Terminal）
2. 在终端中运行 Puppeteer 脚本：`node test.js`
3. VSCode 会自动检测到 Chrome 实例并附加调试

```javascript
// test.js - 使用 debugger 语句触发调试
const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch({
        headless: false,
    });

    const page = await browser.newPage();
    await page.goto('http://localhost:5173');

    // 方式一：在 Puppeteer 脚本中设置断点
    debugger;  // VSCode 会在这一行断住

    // 方式二：在页面中注入 debugger
    await page.evaluate(() => {
        debugger;  // 浏览器中会断住，VSCode 也会捕获
    });

    await browser.close();
})();
```

### JavaScript Debug Terminal 的原理

```mermaid
sequenceDiagram
    participant User as 用户
    participant JDT as JS Debug Terminal
    participant Node2 as Node.js
    participant Chrome4 as Chrome

    User->>JDT: node test.js
    JDT->>Node2: 启动 Node.js（注入 js-debug）
    Node2->>Chrome4: puppeteer.launch()
    Chrome4-->>Node2: Chrome 启动

    Note over JDT: 自动检测 Chrome 实例
    JDT->>Chrome4: 附加调试（CDP）

    Note over Node2: 执行到 debugger
    Node2->>JDT: 断住
    JDT->>User: 显示源码、变量、调用栈
```

> **2024-2026 新增**：Playwright 的调试模式与 Trace Viewer 见《Playwright 调试模式与 Trace Viewer》篇。

## 调试实战：自动化测试中定位问题

### 场景：E2E 测试失败

```javascript
// test.spec.js
const puppeteer = require('puppeteer');

describe('Login Flow', () => {
    it('should login successfully', async () => {
        const browser = await puppeteer.launch({ headless: false });
        const page = await browser.newPage();

        await page.goto('http://localhost:5173/login');

        // 测试断住在这里
        await page.type('#username', 'admin');
        await page.type('#password', 'password');
        await page.click('#login-button');

        // 期望跳转到首页，但实际没跳转
        await page.waitForNavigation({ timeout: 5000 });
        expect(page.url()).toContain('/dashboard');

        await browser.close();
    });
});
```

### 调试步骤

```mermaid
graph TD
    Fail["测试失败"] --> AddScreenshot["添加截图<br/>await page.screenshot()"]
    AddScreenshot --> AddConsole["监听 Console<br/>page.on('console', ...)"]
    AddConsole --> AddNetwork["监听网络请求<br/>page.on('response', ...)"]
    AddNetwork --> Debug2["添加 debugger 语句<br/>在关键操作前暂停"]
    Debug2 --> VSCodeDebug["使用 VSCode 附加调试<br/>查看源码、变量、调用栈"]

```

### 调试辅助代码

```javascript
// 截图
await page.screenshot({ path: 'debug.png' });

// 监听 Console
page.on('console', msg => console.log('PAGE LOG:', msg.text()));

// 监听错误
page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

// 监听网络请求失败
page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
});

// 监听响应
page.on('response', response => {
    if (response.status() >= 400) {
        console.log('RESPONSE ERROR:', response.url(), response.status());
    }
});

// 暂停执行，等待手动操作
// 注意：page.waitForTimeout() 已在 Puppeteer v22 中移除
await new Promise(r => setTimeout(r, 5000));  // 等待 5 秒

// 注意：page.pause() 是 Playwright 的 API，Puppeteer 中不可用
// Playwright 的调试模式见下一篇《Playwright调试模式与Trace-Viewer》
```
