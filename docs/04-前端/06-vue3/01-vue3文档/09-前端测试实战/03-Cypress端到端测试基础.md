---
title: Cypress端到端测试基础
description: "Cypress 是运行在浏览器内部的 E2E 测试框架，提供时间旅行调试、实时重载、自动等待等开发体验优势。本文讲解 Cypress 的安装配置、断言语法、用户操作模拟与网络拦截。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Cypress 端到端测试基础

## 概述

Cypress 是运行在浏览器内部的 E2E 测试框架，提供时间旅行调试、实时重载、自动等待等开发体验优势。本文讲解 Cypress 的安装配置、断言语法、用户操作模拟与网络拦截。

## 学习目标

- 理解 E2E 测试与单元测试的定位差异
- 掌握 Cypress 的项目初始化与目录结构
- 学会使用 should 断言和 cy 命令链模拟用户操作
- 掌握 cy.intercept 网络拦截与 Mock API

---

## 一、Cypress 核心特点

| 特性 | 说明 |
|------|------|
| 实时重载 | 修改测试代码自动重新运行 |
| 时间旅行 | 快照回溯每一步操作的 DOM 状态 |
| 自动等待 | 无需手动 sleep/wait，元素就绪后自动继续 |
| 网络拦截 | Mock API 响应，前后端并行开发 |
| 截图录屏 | 失败自动截图，支持视频录制 |
| 可视化运行器 | 图形界面展示测试执行过程 |

Cypress 运行在浏览器进程内部（In-browser 架构），可直接访问 DOM、Window 和应用状态。

---

## 二、安装与配置

### 2.1 安装

```bash
pnpm add -D cypress

# 打开 Cypress 界面（首次运行自动初始化）
npx cypress open
```

### 2.2 目录结构

```
cypress/
├── e2e/              # 测试文件
│   ├── login.cy.js
│   └── home.cy.js
├── fixtures/         # 测试数据
│   └── users.json
├── support/
│   ├── commands.js   # 自定义命令
│   └── e2e.js        # 全局配置
└── downloads/        # 下载文件
cypress.config.js     # 配置文件
```

### 2.3 配置文件

```javascript
// cypress.config.js
const { defineConfig } = require('cypress')

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    supportFile: 'cypress/support/e2e.js',
  },
})
```

### 2.4 package.json 脚本

```json
{
  "scripts": {
    "cy:open": "cypress open",
    "cy:run": "cypress run"
  }
}
```

---

## 三、断言语法

### 3.1 should 断言模式

Cypress 使用 `cy.get().should()` 链式断言，与单元测试的 `expect()` 风格不同：

```javascript
// 文本
cy.get('.title').should('have.text', 'Hello')
cy.get('.title').should('contain', 'Hello')

// 属性与类名
cy.get('input').should('have.value', 'test')
cy.get('input').should('have.attr', 'placeholder', 'Enter name')
cy.get('.item').should('have.class', 'active')

// 数量
cy.get('.item').should('have.length', 3)

// 可见性
cy.get('.modal').should('be.visible')
cy.get('.modal').should('not.exist')

// 状态
cy.get('input').should('be.disabled')
cy.get('input').should('be.checked')
cy.get('input').should('be.focused')

// CSS
cy.get('.box').should('have.css', 'display', 'block')

// 数值比较（元素主题需先取出文本转为数字）
cy.get('.count').invoke('text').then(parseFloat).should('be.gt', 5)
cy.get('.count').invoke('text').then(parseFloat).should('be.lte', 10)
```

### 3.2 回调断言

```javascript
cy.get('.price').should(($el) => {
  const text = $el.text()
  expect(parseFloat(text)).to.be.greaterThan(0)
})
```

---

## 四、用户操作模拟

### 4.1 常用命令

```javascript
// 页面导航
cy.visit('/login')
cy.go('back')
cy.reload()

// 表单操作
cy.get('#username').type('admin')
cy.get('#password').type('123456{enter}')   // {enter} 模拟回车
cy.get('#agree').check()
cy.get('select').select('option2')

// 点击
cy.get('.btn').click()
cy.get('.menu').dblclick()
cy.contains('提交').click()                 // 按文本查找

// 滚动与悬停
cy.get('.footer').scrollIntoView()
cy.get('.dropdown').trigger('mouseenter')
```

### 4.2 完整登录流程示例

```javascript
// cypress/e2e/login.cy.js
describe('登录功能', () => {
  beforeEach(() => {
    cy.visit('/login')
  })

  it('输入正确凭据成功登录', () => {
    cy.get('[data-cy=username]').type('user@example.com')
    cy.get('[data-cy=password]').type('password123')
    cy.get('[data-cy=login-button]').click()

    cy.url().should('include', '/home')
    cy.contains('欢迎回来').should('be.visible')
  })

  it('密码错误显示提示', () => {
    cy.get('[data-cy=username]').type('user@example.com')
    cy.get('[data-cy=password]').type('wrong')
    cy.get('[data-cy=login-button]').click()

    cy.get('.error-msg').should('contain', '密码错误')
  })
})
```

---

## 五、网络拦截

### 5.1 cy.intercept Mock API

```javascript
it('展示用户列表', () => {
  cy.intercept('GET', '/api/users', {
    statusCode: 200,
    body: [
      { id: 1, name: '张三' },
      { id: 2, name: '李四' },
    ],
  }).as('getUsers')

  cy.visit('/users')
  cy.wait('@getUsers')
  cy.get('.user-item').should('have.length', 2)
})
```

### 5.2 模拟错误响应

```javascript
cy.intercept('POST', '/api/login', {
  statusCode: 401,
  body: { message: '认证失败' },
})

cy.get('[data-cy=login-button]').click()
cy.get('.error').should('contain', '认证失败')
```

---

## 六、自定义命令

```javascript
// cypress/support/commands.js
Cypress.Commands.add('login', (username, password) => {
  cy.session([username, password], () => {
    cy.visit('/login')
    cy.get('[data-cy=username]').type(username)
    cy.get('[data-cy=password]').type(password)
    cy.get('[data-cy=login-button]').click()
    cy.url().should('include', '/home')
  })
})

// 使用
beforeEach(() => {
  cy.login('admin', '123456')
})
```

`cy.session` 缓存登录状态，避免每个测试重复登录。

---

## 常见问题

**Q: Cypress 为什么不支持多标签页测试？**

Cypress 的 In-browser 架构将测试代码注入被测页面，无法控制多个浏览器上下文。需要多标签/多域测试时选择 Playwright。

**Q: 如何让测试不依赖后端服务？**

使用 `cy.intercept` 拦截所有 API 请求并返回 fixtures 数据，实现完全离线测试。将 Mock 数据放在 `cypress/fixtures/` 目录管理。

**Q: Cypress 可以在 CI 中运行吗？**

可以。`cypress run` 以无头模式执行，支持 Docker 镜像 `cypress/browsers`，可集成到 GitHub Actions / GitLab CI。

---

## 延伸阅读

- 上一篇：[Vitest 单元测试实战](02-Vitest单元测试实战.md) — 单元测试
- 下一篇：[Playwright 端到端测试框架](04-Playwright端到端测试框架.md) — 跨浏览器 E2E
- 官方文档：[Cypress](https://docs.cypress.io/)
