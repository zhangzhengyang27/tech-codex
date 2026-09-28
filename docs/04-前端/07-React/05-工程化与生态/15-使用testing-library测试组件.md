---
title: "使用 @testing-library/react 测试组件"
description: "Testing Library 以「用户行为」而非实现细节测试组件，鼓励查询可访问性语义。本章结合 React 18+ 的 RTL 写法讲清查询优先级与异步测试。"
keywords: [Testing Library, RTL, 组件测试, 查询, 异步测试]
category: React
tags: [React, 工程化与生态]
---

# 使用 @testing-library/react 测试组件

## 学习目标

- 掌握 RTL 的查询优先级（role > label > text > testid）
- 理解 `userEvent` 与 `fireEvent` 的区别
- 掌握异步渲染（Suspense / 请求）的测试写法

## 核心原则：测试行为而非实现

RTL 反对查询组件内部 state，鼓励用「用户可见的方式」查询：

```jsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

test('点击按钮计数加一', async () => {
  const user = userEvent.setup();
  render(<Counter />);
  await user.click(screen.getByRole('button', { name: /增加/i }));
  expect(screen.getByText('1')).toBeInTheDocument();
});
```

## 查询优先级

1. `getByRole` + `name`（最贴近读屏/键盘用户）
2. `getByLabelText`（表单）
3. `getByText`（文本）
4. `getByTestId`（万不得已）

优先 role/label 能顺带验证 [34-组件无障碍 a11y](../04-组件与实战/34-组件无障碍a11y) 是否达标。

## 异步与等待

对 Suspense / 请求驱动的 UI，用 `findBy*`（返回 Promise）或 `await waitFor`：

```jsx
const msg = await screen.findByText('加载完成'); // 自动重试直到出现或超时
```

注意 `act()` 警告：RTL 的 `render` / `userEvent` 已自动包裹 `act`，避免手动 `act` 嵌套。

## 与 Jest / Vitest

RTL 本身只管渲染与查询，断言库用 Jest 或 Vitest，`jsdom` / `happy-dom` 提供 DOM 环境。

## 总结

RTL 让测试从「验证内部实现」转向「验证用户行为」，查询优先级天然促进可访问性。它是 React 组件测试的事实标准。

## 继续阅读

- 上一篇：[14-Turbopack 与 Rspack](14-Turbopack与Rspack)
- 下一篇：[16-Monorepo 与组件库工程化](16-Monorepo与组件库工程化)
