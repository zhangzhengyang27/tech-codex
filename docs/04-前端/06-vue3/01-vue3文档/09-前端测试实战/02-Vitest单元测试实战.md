---
title: Vitest单元测试实战
description: "Vitest 是 Vite 生态的原生测试框架，共享 Vite 配置（插件、别名、环境变量），具备极速冷启动和毫秒级 Watch 热更新。本文讲解 Vitest 的安装配置、测试用例编写、组件测试、Mock 机制与覆盖率报告。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Vitest 单元测试实战

## 概述

Vitest 是 Vite 生态的原生测试框架，共享 Vite 配置（插件、别名、环境变量），具备极速冷启动和毫秒级 Watch 热更新。本文讲解 Vitest 的安装配置、测试用例编写、组件测试、Mock 机制与覆盖率报告。

## 学习目标

- 掌握 Vitest 在 Vite 项目中的安装与配置
- 学会编写工具函数和 Vue 组件的单元测试
- 掌握 vi.fn / vi.mock 等 Mock 手段
- 理解覆盖率报告的含义与配置方式

---

## 一、安装与配置

### 1.1 安装依赖

```bash
pnpm add -D vitest @vue/test-utils happy-dom
```

| 包 | 作用 |
|----|------|
| vitest | 测试运行器 |
| @vue/test-utils | Vue 组件挂载与交互 |
| happy-dom | 轻量级 DOM 环境 |

### 1.2 Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',   // DOM 环境
    globals: true,              // 全局 describe/it/expect
    include: ['**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
    },
  },
})
```

### 1.3 脚本与类型

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

---

## 二、编写测试用例

### 2.1 工具函数测试

```typescript
// src/utils/format.ts
export function formatPrice(price: number): string {
  return `¥${price.toFixed(2)}`
}

// src/utils/format.test.ts
import { describe, it, expect } from 'vitest'
import { formatPrice } from './format'

describe('formatPrice', () => {
  it('格式化价格并保留两位小数', () => {
    expect(formatPrice(99)).toBe('¥99.00')
    expect(formatPrice(99.9)).toBe('¥99.90')
  })

  it('处理四舍五入', () => {
    expect(formatPrice(99.999)).toBe('¥100.00')
  })

  it('处理零值', () => {
    expect(formatPrice(0)).toBe('¥0.00')
  })
})
```

### 2.2 Vue 组件测试

```typescript
// src/components/__tests__/Button.test.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Button from '../Button.vue'

describe('Button', () => {
  it('渲染插槽内容并应用类型类名', () => {
    const wrapper = mount(Button, {
      props: { type: 'primary' },
      slots: { default: 'Click Me' },
    })

    expect(wrapper.text()).toBe('Click Me')
    expect(wrapper.classes()).toContain('btn-primary')
  })

  it('点击时触发 click 事件', async () => {
    const wrapper = mount(Button)
    await wrapper.trigger('click')

    expect(wrapper.emitted()).toHaveProperty('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })

  it('禁用状态不可点击', () => {
    const wrapper = mount(Button, { props: { disabled: true } })
    expect(wrapper.attributes('disabled')).toBeDefined()
  })
})
```

### 2.3 异步测试与 Mock

```typescript
// src/utils/api.test.ts
import { describe, it, expect, vi } from 'vitest'
import { fetchUser } from './api'

describe('fetchUser', () => {
  it('请求并解析用户数据', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ id: 1, name: 'John' }),
      })
    ) as any

    const user = await fetchUser(1)

    expect(user).toEqual({ id: 1, name: 'John' })
    expect(fetch).toHaveBeenCalledWith('/api/users/1')
  })
})
```

---

## 三、Mock 机制

### 3.1 vi.fn — Mock 函数

```typescript
import { vi } from 'vitest'

const callback = vi.fn()
callback('hello')

expect(callback).toHaveBeenCalledTimes(1)
expect(callback).toHaveBeenCalledWith('hello')

// 自定义实现
const mockFn = vi.fn((x: number) => x * 2)
expect(mockFn(5)).toBe(10)
```

### 3.2 vi.mock — Mock 模块

```typescript
import { vi, describe, it, expect } from 'vitest'

// Mock 整个模块
vi.mock('./userService', () => ({
  getUser: vi.fn(() => Promise.resolve({ id: 1, name: 'Mock User' })),
}))

import { getUser } from './userService'

describe('用户模块', () => {
  it('返回 Mock 数据', async () => {
    const user = await getUser(1)
    expect(user.name).toBe('Mock User')
  })
})
```

### 3.3 定时器与时间 Mock

```typescript
import { vi, afterEach } from 'vitest'

afterEach(() => {
  vi.useRealTimers()
})

it('延迟执行回调', () => {
  vi.useFakeTimers()
  const fn = vi.fn()

  setTimeout(fn, 1000)
  vi.advanceTimersByTime(1000)

  expect(fn).toHaveBeenCalledTimes(1)
})
```

---

## 四、运行与覆盖率

### 4.1 运行模式

| 命令 | 模式 | 场景 |
|------|------|------|
| `vitest` | Watch | 开发时实时反馈 |
| `vitest run` | 单次 | CI/CD 流水线 |
| `vitest --ui` | 可视化 | 调试复杂用例 |
| `vitest run --coverage` | 覆盖率 | 质量报告 |

Watch 模式快捷键：`a` 全部运行、`f` 只跑失败、`p` 文件名过滤、`t` 用例名过滤。

### 4.2 覆盖率配置

```typescript
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html', 'lcov'],
    reportsDirectory: './coverage',
    include: ['src/**/*.{ts,vue}'],
    exclude: ['src/**/*.d.ts', 'src/**/*.test.ts', 'src/**/__tests__/**'],
    thresholds: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
}
```

### 4.3 覆盖率指标含义

| 指标 | 含义 |
|------|------|
| Statements | 语句执行比例 |
| Branches | 条件分支覆盖比例 |
| Functions | 函数调用比例 |
| Lines | 代码行执行比例 |

---

## 常见问题

**Q: globals: true 和显式导入哪种更好？**

显式导入（`import { describe, it, expect } from 'vitest'`）对 IDE 跳转和 Tree Shaking 更友好；globals 模式减少样板代码。团队统一即可，二者不影响运行结果。

**Q: 组件测试中如何测试 Pinia Store？**

使用 `createTestingPinia` 或手动 `createPinia()` 并通过 `global.plugins` 注入：

```typescript
mount(Comp, {
  global: { plugins: [createPinia()] },
})
```

**Q: 测试文件放在源文件旁边还是 __tests__ 目录？**

两种约定均可。工具函数推荐就近放置（`format.test.ts`），组件推荐 `__tests__/` 目录集中管理，保持组件目录整洁。

---

## 延伸阅读

- 上一篇：[前端项目测试基础与工具选型](01-前端项目测试基础与工具选型.md) — 测试体系概览
- 下一篇：[Cypress 端到端测试基础](03-Cypress端到端测试基础.md) — E2E 测试入门
- 官方文档：[Vitest](https://vitest.dev/)
