---
title: Playwright端到端测试框架
description: "Playwright 是 Microsoft 开发的现代 E2E 测试框架，支持 Chromium / Firefox / WebKit 三大引擎，具备自动等待、多上下文隔离、代码生成器和执行追踪等能力。本文讲解 Playwright 的安装配置、核心 API 与 CI 集成。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Playwright 端到端测试框架

## 概述

Playwright 是 Microsoft 开发的现代 E2E 测试框架，支持 Chromium / Firefox / WebKit 三大引擎，具备自动等待、多上下文隔离、代码生成器（Codegen）和执行追踪（Trace Viewer）等能力。本文讲解 Playwright 的安装配置、核心 API 与 CI 集成。

## 学习目标

- 掌握 Playwright 项目初始化与配置文件编写
- 学会使用 page 对象模拟用户操作和断言
- 掌握 Codegen 录制、Trace Viewer 调试工作流
- 理解多浏览器并行测试与 CI 集成方案

---

## 一、Playwright 核心优势

| 特性 | 说明 |
|------|------|
| 跨浏览器 | Chromium、Firefox、WebKit 一套代码 |
| 跨平台 | Windows / Linux / macOS，有头或无头模式 |
| 自动等待 | 元素可操作前自动等待，减少超时错误 |
| 强断言 | 断言自动重试，适配动态页面 |
| 多上下文隔离 | 每个测试独立浏览器上下文，无状态污染 |
| 移动端模拟 | 内置 Android Chrome / iOS Safari 设备描述符 |
| Codegen | 录制操作自动生成测试代码 |
| Trace Viewer | 可视化回放执行过程（截图 + DOM + 网络 + 控制台） |

### Playwright vs Cypress vs Selenium

| 特性 | Playwright | Cypress | Selenium |
|------|------------|---------|----------|
| 浏览器支持 | 三大引擎 | Chromium 系为主 | 所有主流浏览器 |
| 架构 | Out-of-process (CDP) | In-browser | WebDriver |
| 多标签/多域 | 原生支持 | 不支持 | 受限 |
| 执行速度 | 快 | 快 | 较慢 |
| 录制代码 | 内置 Codegen | 内置 | 需第三方 |
| 并行测试 | 内置 workers | 需分片 | 需配置 |
| 语言支持 | JS/TS、Python、.NET、Java | 仅 JS/TS | 多语言 |

---

## 二、安装与配置

### 2.1 初始化项目

```bash
# 推荐：交互式初始化
npm init playwright@latest

# 或手动安装
pnpm add -D @playwright/test
npx playwright install          # 下载浏览器
npx playwright install chromium # 只装 Chromium
```

### 2.2 项目结构

```
my-project/
├── playwright.config.ts    # 配置文件
├── tests/                  # 测试文件
│   └── login.spec.ts
├── test-results/           # 测试结果输出
└── playwright-report/      # HTML 报告
```

### 2.3 配置文件

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',       // 失败重试时记录追踪
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],

  // 自动启动开发服务器
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 三、核心 API

### 3.1 页面操作

```typescript
import { test, expect } from '@playwright/test'

test('用户登录流程', async ({ page }) => {
  await page.goto('/login')

  // 填写表单
  await page.getByLabel('用户名').fill('admin')
  await page.getByLabel('密码').fill('123456')
  await page.getByRole('button', { name: '登录' }).click()

  // 断言（自动重试）
  await expect(page).toHaveURL(/.*home/)
  await expect(page.getByText('欢迎回来')).toBeVisible()
})
```

### 3.2 定位器策略

| 方法 | 说明 | 推荐度 |
|------|------|--------|
| `getByRole()` | 按 ARIA 角色定位 | 首选 |
| `getByLabel()` | 按表单 label 定位 | 表单场景 |
| `getByText()` | 按文本内容定位 | 次选 |
| `getByTestId()` | 按 data-testid 定位 | 无角色时 |
| `locator('.css')` | CSS 选择器 | 兜底 |

### 3.3 常用断言

```typescript
// 页面级
await expect(page).toHaveURL('/dashboard')
await expect(page).toHaveTitle('首页')

// 元素级
await expect(locator).toBeVisible()
await expect(locator).toHaveText('精确文本')
await expect(locator).toContainText('部分文本')
await expect(locator).toHaveValue('input value')
await expect(locator).toHaveCount(3)
await expect(locator).toBeEnabled()
await expect(locator).toHaveClass(/active/)

// 取反
await expect(locator).not.toBeVisible()
```

### 3.4 网络拦截

```typescript
test('Mock 用户列表', async ({ page }) => {
  await page.route('**/api/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: '张三' },
        { id: 2, name: '李四' },
      ]),
    })
  })

  await page.goto('/users')
  await expect(page.locator('.user-item')).toHaveCount(2)
})
```

---

## 四、调试工作流

### 4.1 Codegen 录制

```bash
npx playwright codegen http://localhost:5173
```

打开浏览器和录制面板，操作页面自动生成测试代码，支持复制定位器。

### 4.2 UI 模式

```bash
npx playwright test --ui
```

图形界面选择用例、逐步执行、查看每步快照。

### 4.3 Trace Viewer

```bash
# 运行并记录追踪
npx playwright test --trace on

# 查看追踪文件
npx playwright show-trace test-results/xxx/trace.zip
```

Trace 包含：操作时间线、每步 DOM 快照、网络请求、控制台日志，可离线分享。

---

## 五、CI 集成

### 5.1 GitHub Actions

```yaml
name: E2E Tests
on: [push]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### 5.2 与 Vitest 协作

```json
{
  "scripts": {
    "test": "vitest run",
    "test:e2e": "playwright test",
    "test:all": "vitest run && playwright test"
  }
}
```

---

## 常见问题

**Q: Playwright 下载的浏览器占用空间大吗？**

三个引擎约 400MB。可以只安装需要的引擎（`npx playwright install chromium`），CI 中使用官方 Docker 镜像 `mcr.microsoft.com/playwright`。

**Q: 测试之间如何共享登录状态？**

使用 `storageState`：先在全局 setup 中登录并保存 Cookie/LocalStorage 到 JSON 文件，其他测试通过 `use: { storageState: 'auth.json' }` 复用。

**Q: Playwright 能测试 Electron 应用吗？**

可以。Playwright 提供 `_electron` API，可启动 Electron 应用并操作其 BrowserWindow。

---

## 延伸阅读

- 上一篇：[Cypress 端到端测试基础](03-Cypress端到端测试基础.md) — Cypress E2E
- 下一篇：[服务端渲染 SSR 基础概念](../10-SSR服务端渲染/01-服务端渲染SSR基础概念.md) — SSR 入门
- 官方文档：[Playwright](https://playwright.dev/)
