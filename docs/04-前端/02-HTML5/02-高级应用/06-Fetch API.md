---
title: Fetch API
description: 现代网络请求的核心接口，替代 XMLHttpRequest 的标准方案
keywords: [Fetch, 网络请求, HTTP, AJAX]
category: HTML5
tags: [HTML5, Web API, 网络请求]
---

# Fetch API

`fetch()` 是现代浏览器提供的网络请求接口，基于 `Promise` 设计，用于替代传统的 `XMLHttpRequest`。它语法简洁、链式清晰，是 Web 端与服务器通信的标准方式。

## 基本用法

```js
fetch('https://api.example.com/data')
  .then((response) => response.json())
  .then((data) => console.log(data))
  .catch((error) => console.error('请求失败:', error));
```

使用 `async/await` 更直观：

```js
async function loadData() {
  try {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error('请求失败:', error);
  }
}
```

## Request 配置

第二个参数用于配置请求方法、请求头、请求体等：

```js
const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ name: 'Alice', age: 30 }),
});
```

常用配置项：

| 配置项 | 说明 | 示例 |
| ------ | ---- | ---- |
| `method` | 请求方法 | `GET` / `POST` / `PUT` / `DELETE` |
| `headers` | 请求头对象 | `{ 'Content-Type': 'application/json' }` |
| `body` | 请求体 | `JSON.stringify(data)` / `FormData` |
| `mode` | 跨域模式 | `cors` / `no-cors` / `same-origin` |
| `credentials` | 凭证策略 | `same-origin` / `include` / `omit` |
| `cache` | 缓存模式 | `default` / `no-store` / `reload` |
| `signal` | 中断信号 | `AbortSignal`（见下文） |

## 处理响应

`fetch()` 不会因 HTTP 错误状态码（如 404、500）而 reject，需要手动检查 `response.ok`：

```js
async function getData() {
  const response = await fetch('https://api.example.com/data');
  if (!response.ok) {
    throw new Error(`HTTP 错误：${response.status}`);
  }
  return await response.json();
}
```

响应体提供了多种解析方法：

| 方法 | 返回类型 | 适用场景 |
| ---- | -------- | -------- |
| `response.json()` | `Promise<any>` | JSON 接口 |
| `response.text()` | `Promise<string>` | 纯文本、HTML |
| `response.blob()` | `Promise<Blob>` | 二进制文件、图片 |
| `response.arrayBuffer()` | `Promise<ArrayBuffer>` | 底层二进制处理 |
| `response.formData()` | `Promise<FormData>` | 表单提交响应 |

## 请求中断（AbortController）

通过 `AbortController` 可主动取消请求，常用于组件卸载或超时控制：

```js
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 5000);

try {
  const response = await fetch('https://api.example.com/data', {
    signal: controller.signal,
  });
  clearTimeout(timeoutId);
  const data = await response.json();
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('请求已取消或超时');
  }
}
```

## 上传文件

结合 `FormData` 实现文件上传：

```js
const formData = new FormData();
formData.append('avatar', fileInput.files[0]);

const response = await fetch('https://api.example.com/upload', {
  method: 'POST',
  body: formData,
});
```

注意：使用 `FormData` 时不要手动设置 `Content-Type`，浏览器会自动添加 `boundary`。

## 与 XMLHttpRequest 的对比

| 维度 | Fetch API | XMLHttpRequest |
| ---- | --------- | -------------- |
| 回调模型 | `Promise` 链式 | 事件回调 |
| 流式读取 | 支持 `ReadableStream` | 有限支持 |
| 请求中断 | `AbortController` | `.abort()` |
| 进度上报 | 需结合 `ReadableStream` | 原生 `onprogress` |
| 语法简洁度 | 高 | 低 |

:::: tip 提示
对于需要精细上传/下载进度条的场景，`XMLHttpRequest` 仍比 `fetch` 更直接；其余绝大多数场景推荐使用 `fetch`。
::::

## 完整可运行示例

以下 HTML 文件可直接保存为 `.html` 后在浏览器打开，向公开测试 API 发起 GET/POST 请求：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>Fetch API 实战</title>
</head>
<body>
  <button id="getBtn">GET 请求</button>
  <button id="postBtn">POST 请求</button>
  <pre id="output">// 结果将显示在这里</pre>

  <script>
    const output = document.getElementById('output');

    document.getElementById('getBtn').onclick = async () => {
      try {
        const res = await fetch('https://jsonplaceholder.typicode.com/posts/1');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        output.textContent = JSON.stringify(await res.json(), null, 2);
      } catch (e) {
        output.textContent = '请求失败: ' + e.message;
      }
    };

    document.getElementById('postBtn').onclick = async () => {
      try {
        const res = await fetch('https://jsonplaceholder.typicode.com/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'hello', body: 'world', userId: 1 })
        });
        output.textContent = JSON.stringify(await res.json(), null, 2);
      } catch (e) {
        output.textContent = '请求失败: ' + e.message;
      }
    };
  </script>
</body>
</html>
```

### 浏览器兼容性

所有现代浏览器（Chrome、Firefox、Safari、Edge）均完整支持 `fetch`。生产环境如需兼容旧版浏览器（如 IE11），应引入 `whatwg-fetch` polyfill。
