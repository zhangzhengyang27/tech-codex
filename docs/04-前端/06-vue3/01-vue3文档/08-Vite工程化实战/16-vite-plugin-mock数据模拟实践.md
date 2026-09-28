---
title: vite-plugin-mock数据模拟实践
description: "vite-plugin-mock 为 Vite 项目提供本地和生产环境的 Mock 数据服务，支持 TypeScript、热更新和自定义响应延迟。本文讲解其安装配置、Mock 文件编写规范及与前端请求层的集成方式。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# vite-plugin-mock 数据模拟实践

## 概述

vite-plugin-mock 为 Vite 项目提供本地和生产环境的 Mock 数据服务，支持 TypeScript、热更新和自定义响应延迟。本文讲解其安装配置、Mock 文件编写规范及与前端请求层的集成方式。

## 学习目标

- 掌握 vite-plugin-mock 的安装与配置
- 学会编写 Mock 接口文件（支持 GET/POST/延迟）
- 理解 Mock 数据在开发流程中的定位

---

## 一、安装与配置

### 1.1 安装

```bash
pnpm add -D vite-plugin-mock mockjs
```

### 1.2 Vite 配置

```typescript
// vite.config.ts
import { viteMockServe } from 'vite-plugin-mock'

export default defineConfig({
  plugins: [
    vue(),
    viteMockServe({
      mockPath: 'mock',
      enable: true,
    }),
  ],
})
```

---

## 二、Mock 文件编写

### 2.1 目录结构

```
mock/
├── user.ts
├── product.ts
└── common.ts
```

### 2.2 接口定义

```typescript
// mock/user.ts
import { MockMethod } from 'vite-plugin-mock'

export default [
  {
    url: '/api/user/list',
    method: 'get',
    response: ({ query }) => {
      return {
        code: 200,
        message: 'success',
        data: [
          { id: 1, name: 'Alice', role: 'admin' },
          { id: 2, name: 'Bob', role: 'user' },
        ],
      }
    },
  },
  {
    url: '/api/user/login',
    method: 'post',
    timeout: 1000,  // 模拟延迟
    response: ({ body }) => {
      if (body.username === 'admin' && body.password === '123456') {
        return { code: 200, data: { token: 'mock-token-xxx' } }
      }
      return { code: 401, message: '用户名或密码错误' }
    },
  },
] as MockMethod[]
```

### 2.3 配合 Mock.js 生成随机数据

```typescript
import Mock from 'mockjs'

export default [
  {
    url: '/api/articles',
    method: 'get',
    response: () => ({
      code: 200,
      data: Mock.mock({
        'list|10-20': [{
          'id|+1': 1,
          'title': '@ctitle(5, 20)',
          'author': '@cname',
          'date': '@datetime',
        }],
      }),
    }),
  },
]
```

---

## 三、环境控制

### 3.1 仅开发环境启用

```typescript
viteMockServe({
  mockPath: 'mock',
  enable: process.env.NODE_ENV === 'development',
})
```

### 3.2 生产环境 Mock（可选）

> 注：`prodEnabled`/`injectCode` 是 v2 的生产 Mock 方案，v3 起已建议改用作者维护的 `vite-plugin-mock-dev-server`。`vite-plugin-mock` 本身已基本停止维护，新项目可优先考虑该替代插件。

```typescript
viteMockServe({
  mockPath: 'mock',
  enable: true,
  prodEnabled: true,  // 生产环境也启用
  injectCode: `
    import { setupProdMockServer } from './mockProdServer'
    setupProdMockServer()
  `,
})
```

---

## 四、与请求层集成

Mock 拦截的是 HTTP 请求，前端代码无需任何特殊处理：

```typescript
// api/user.ts
import request from '@/utils/request'

export function getUserList() {
  return request.get('/api/user/list')
}

export function login(data: { username: string; password: string }) {
  return request.post('/api/user/login', data)
}
```

切换真实接口时，只需关闭 Mock 插件或修改请求 baseURL。

---

## 常见问题

**Q: Mock 接口和真实接口如何平滑切换？**

通过环境变量控制：开发时用 Mock（`VITE_API_BASE=/`），联调时切换到真实服务（`VITE_API_BASE=http://dev-server:3000`）。Mock 文件保留不删除，随时可回退。

**Q: 支持 WebSocket Mock 吗？**

vite-plugin-mock 不支持 WebSocket。需要 WebSocket Mock 可使用 `mock-socket` 库。

---

## 延伸阅读

- 上一篇：[vite-plugin-pwa 集成实战](15-vite-plugin-pwa集成实战.md) — PWA 集成
- 下一篇：[User Agent 设备判断与移动端适配](17-User-Agent设备判断与移动端适配.md) — 移动端适配
- 相关：[Mock 接口与接口测试工具](../../../11-调试/05-mock与接口测试/00-Mock接口与接口测试工具-章节导学.md) — 接口测试体系
