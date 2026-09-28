---
title: Chrome-Recorder篇
description: 介绍 Chrome 97 引入的 Recorder 面板：录制与回放用户流程、编辑步骤与添加断言、导出 Puppeteer/@puppeteer/replay 脚本接入 CI/CD，以及 Measure performance 的可复现性能分析。
keywords: [Chrome DevTools, Chrome-Recorder]
category: 调试
tags: [Chrome DevTools]
---

# Chrome-Recorder篇

Recorder 面板是 Chrome 97 引入的一个突破性功能——它可以**录制、回放和导出你在浏览器中的操作**。无需编写代码就能创建自动化测试脚本，还能导出为 Puppeteer 脚本进行 CI/CD 集成。

## 9.1 什么是 Recorder

```mermaid
flowchart LR
    A[开发者操作<br/>点击、输入、导航] -->|Recorder 录制| B[用户流程<br/>User Flow]
    B -->|回放验证| C[自动执行相同操作]
    B -->|导出| D[Puppeteer 脚本]
    B -->|导出| E[@puppeteer/replay 脚本]
    B -->|导出| F[Performance Profile]
    D & E --> G[CI/CD 集成]
```

Recorder 的核心价值是**将手动测试操作转化为可复现的自动化流程**。

---

## 9.2 录制你的第一个用户流程

### 9.2.1 基本步骤

1. 打开 Recorder 面板（通过面板顶部的 `>>` → `More panels` → `Recorder`）
2. 点击 `Create a new recording`
3. 为你的录制命名
4. 选择一个设备（Desktop / Mobile / Custom）
5. 点击 `Start recording`
6. 在页面中执行你的操作：点击按钮、填写表单、导航到其他页面
7. 点击 `End recording`

### 9.2.2 Recorder 支持的交互类型

| 交互类型 | 说明 | 自动捕获? |
|----------|------|-----------|
| **Click** | 点击元素 | ✅ 自动 |
| **Double click** | 双击元素 | ✅ 自动 |
| **Hover** | 鼠标悬停 | ✅ 自动 |
| **Change** | 修改 `<input>`/`<select>`/`<textarea>` 值 | ✅ 自动 |
| **KeyDown** | 按键事件 | ✅ 自动 |
| **Navigate** | 页面导航 | ✅ 自动 |
| **Scroll** | 页面滚动 | ✅ 自动 |
| **Wait for element** | 等待元素出现 | 🆕 手动添加 |
| **Wait for expression** | 等待 JS 表达式结果为真 | 🆕 手动添加 |
| **Assert element** | 断言元素存在/可见/文本 | 🆕 手动添加 |
| **Assert value** | 断言输入值 | 🆕 手动添加 |
| **Custom times** | 设置各步骤之间的等待时间 | 配置项 |

### 9.2.3 选择器优先级

Recorder 使用多种选择器来定位元素，按优先级排列：

| 选择器类型 | 示例 | 可靠性 |
|-----------|------|--------|
| **aria/** | `aria/Accessible Name` | ⭐⭐⭐ 最高 |
| **text/** | `text/提交订单` | ⭐⭐⭐ |
| **xpath/** | `xpath//*[@id="root"]/div[1]` | ⭐⭐ |
| **css** | `#submit-btn` | ⭐⭐ |
| **testid/** | `testid/submit-button` | ⭐⭐⭐ |
| **id** | `#submit` | ⭐⭐ |
| **pierce/** | `pierce/.shadow-btn` (穿透 Shadow DOM) | ⭐⭐ (🆕) |

> 💡 推荐在组件中使用 `data-testid` 属性，Recorder 会优先使用 `testid/` 选择器，这是最稳定可靠的元素定位方式。

---

## 9.3 回放与验证

### 9.3.1 回放流程

1. 选择已录制好的用户流程
2. 点击 `Replay` 按钮
3. Recorder 自动按录制时的操作顺序执行
4. 每一步执行后，检查点以绿色（✓）或红色（✗）标记

### 9.3.2 回放设置

- **Slow down**（减速播放）：降低执行速度，方便观察每一步的效果
- **循环回放**：🆕 设置重复次数，模拟连续使用场景
- **断点回放**：🆕 在特定步骤设置断点，回放暂停等待检查

### 9.3.3 🆕 断言与验证

Chrome 114+ 中，Recorder 支持添加断言步骤：

- **Assert element**：断言元素存在、不可见、或包含特定文本
- **Assert value**：断言输入框/选择器的值

这些断言在回放和导出脚本中都会生效，形成真正的自动化测试。

---

## 9.4 编辑录制内容

录制完成后，你可以手动编辑用户流程：

- **删除步骤**：移除非关键操作
- **添加步骤**：补充遗漏的交互
- **修改选择器**：如果原始选择器不够稳定，可以手动更换
- **调整等待时间**：为异步加载内容添加等待
- **插入断言**：在关键步骤后添加验证

---

## 9.5 导出自定义脚本

### 9.5.1 支持的导出格式

| 格式 | 用途 | 特点 |
|------|------|------|
| **Puppeteer** | Node.js 自动化测试 | 完整 API，支持无头 Chrome |
| **@puppeteer/replay** | 轻量回放 | 纯 JSON 格式，跨语言回放 |
| **Puppeteer (including Lighthouse)** | 性能测试脚本 | 导出带 Lighthouse 分析的脚本 |

### 9.5.2 Puppeteer 脚本集成

导出的 Puppeteer 脚本可以直接集成到 CI/CD 流程：

```javascript
// 导出的 Puppeteer 脚本示例
// 注意：Puppeteer v23+ 中 headless: 'new' 已移除，
// 使用 boolean 或 'shell'（对应旧版精简无头模式）
const puppeteer = require('puppeteer')
const { knownDevices } = puppeteer

;(async () => {
  const browser = await puppeteer.launch({ headless: true })
  const page = await browser.newPage()

  // 设置设备
  await page.emulate(knownDevices['iPhone 15'])

  const recorder = {
    async navigate(url) { await page.goto(url) },
    async click(selector) {
      await page.waitForSelector(selector)
      await page.click(selector)
    },
    async change(selector, value) {
      await page.waitForSelector(selector)
      await page.type(selector, value)
    }
  }

  await recorder.navigate('https://example.com')
  await recorder.click('text/登录')
  await recorder.change('input[name="email"]', 'test@example.com')
  // ... 更多步骤

  await browser.close()
})()
```

---

## 9.6 性能分析录制

Recorder 面板可以与 Performance 面板联动：

1. 录制用户流程
2. 点击 `Measure performance` 按钮
3. DevTools 自动回放流程并同时录制性能数据
4. 自动生成 Performance Profile

这提供了一种**可复现的性能分析**方式——每次用完全相同的用户操作测量性能，消除了手动操作引入的差异。

---

## 9.7 实战：创建登录流程自动化测试

### 场景

你要测试用户登录流程的稳定性和性能。

### 步骤

**1. 录制**

```text
Navigate: https://example.com/login
Click: text/登录按钮
Change: input[name="email"] → test@example.com
Change: input[name="password"] → ********
Click: text/确认登录
Assert element: text/欢迎回来 (等待登录成功后页面显示欢迎信息)
```

**2. 回放验证**

点击 Replay，逐步检查每个步骤是否成功。

**3. 性能测量**

点击 `Measure performance`，等待自动回放和性能数据收集。查看 Performance Insights 中是否有长任务影响登录响应速度。

**4. 导出 CI 脚本**

导出为 Puppeteer 脚本，加入项目的 e2e 测试套件。

---

## 9.8 🆕 Recorder 最新特性

| 特性 | 版本 | 说明 |
|------|------|------|
| **Assertion steps** | Chrome 114+ | 录制中支持断言验证 |
| **Conditional wait** | Chrome 128+ | `Wait for element` 和 `Wait for expression` |
| **Breakpoint replay** | Chrome 126+ | 回放时在特定步骤暂停 |
| **pierce selector** | Chrome 112+ | 穿透 Shadow DOM 定位 Web Component 内部元素 |
| **Lighthouse export** | Chrome 112+ | 导出含 Lighthouse 的性能测试脚本 |
| **JSON editing** | Chrome 118+ | 以 JSON 格式直接编辑录制内容 |
| **Step reordering** | Chrome 115+ | 拖拽重排录制步骤 |

---

## 9.9 最佳实践

- **使用 testid 属性**：在关键交互元素上添加 `data-testid` 属性，提高选择器稳定性
- **按功能模块录制**：一个用户流程对应一个功能测试场景，不要把所有操作录在一起
- **添加等待步骤**：在页面跳转或异步加载后添加 `Wait for element`
- **关键步骤加断言**：在核心交互后添加 Assert 步骤，确保状态正确
- **纳入 CI/CD**：将导出的 Puppeteer 脚本加入项目的自动化测试流水线

---

## 9.10 参考资料

- [Chrome DevTools Recorder Panel](https://developer.chrome.com/docs/devtools/recorder/)
- [Record, replay, and measure user flows](https://developer.chrome.com/docs/devtools/recorder/reference/)
- [Puppeteer](https://pptr.dev/)