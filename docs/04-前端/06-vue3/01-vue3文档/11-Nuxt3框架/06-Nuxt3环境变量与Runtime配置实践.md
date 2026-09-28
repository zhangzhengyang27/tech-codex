---
title: Nuxt3环境变量与Runtime配置实践
description: "Nuxt3 通过 runtimeConfig 统一管理运行时配置，配合 .env 文件实现环境差异化。本文讲解环境变量命名约定、公开/私有配置的边界、多环境管理方案。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# Nuxt3 环境变量与 Runtime 配置实践

## 概述

Nuxt3 通过 runtimeConfig 统一管理运行时配置，配合 `.env` 文件实现环境差异化。本文讲解环境变量命名约定、公开/私有配置的边界、多环境管理方案。

## 学习目标

- 掌握 runtimeConfig 的配置与使用方式
- 理解 NUXT_PUBLIC_* 与 NUXT_* 的访问边界
- 学会 .env 多环境文件管理
- 掌握 useRuntimeConfig 在组件和服务端的使用

---

## 一、配置体系概览

| 方式 | 文件 | 适用场景 |
|------|------|---------|
| .env 文件 | 项目根目录 | 本地开发、敏感信息 |
| runtimeConfig | nuxt.config.ts | 默认值定义、公开配置 |
| 运行时环境变量 | CI/CD 注入 | 部署时覆盖 |

优先级：运行时环境变量 > .env 文件 > nuxt.config.ts 默认值。

---

## 二、runtimeConfig 配置

### 2.1 定义配置

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    // 服务端私有配置（客户端不可访问）
    apiSecretKey: '',
    databaseUrl: '',

    // 公开配置（客户端可访问）
    public: {
      baseUrl: 'http://localhost:3000',
      appName: 'My Nuxt App',
      version: '1.0.0',
    },
  },
})
```

### 2.2 安全边界

```mermaid
graph TB
    A[runtimeConfig] --> B[私有配置]
    A --> C[public 配置]
    B --> D[仅服务端代码可访问]
    B --> E[不会注入到客户端 HTML]
    C --> F[客户端和服务端均可访问]
    C --> G[序列化注入到页面]
```

数据库密钥、API Secret 等敏感信息**必须**放在私有区域，绝不放入 `public`。

### 2.3 使用方式

```vue
<!-- 组件中 -->
<script setup lang="ts">
const config = useRuntimeConfig()

// 公开配置 — 客户端/服务端均可
const baseUrl = config.public.baseUrl

// 私有配置 — 仅在服务端渲染阶段可用
// const secret = config.apiSecretKey  // 客户端访问为空
</script>
```

```typescript
// server/api/data.get.ts — 服务端完整访问
export default defineEventHandler(() => {
  const config = useRuntimeConfig()
  const secret = config.apiSecretKey   // 正常访问
  return fetchData(secret)
})
```

---

## 三、.env 环境变量

### 3.1 命名约定

| 环境变量 | 映射到 | 访问方式 |
|---------|--------|---------|
| `NUXT_PUBLIC_BASE_URL` | runtimeConfig.public.baseUrl | config.public.baseUrl |
| `NUXT_API_SECRET_KEY` | runtimeConfig.apiSecretKey | config.apiSecretKey |

转换规则：`NUXT_` 前缀 + 下划线转 camelCase。

### 3.2 .env 文件

```bash
# .env
NUXT_PUBLIC_BASE_URL=http://localhost:3000
NUXT_API_SECRET_KEY=dev-secret-key
NUXT_DATABASE_URL=mysql://user:pass@localhost:3306/mydb
```

### 3.3 多环境管理

```bash
# .env.development
NUXT_PUBLIC_BASE_URL=http://localhost:3000

# .env.production
NUXT_PUBLIC_BASE_URL=https://api.example.com

# .env.staging
NUXT_PUBLIC_BASE_URL=https://api.staging.example.com
```

### 3.4 CI/CD 注入

```yaml
# GitLab CI 示例
deploy:
  script:
    - NUXT_API_SECRET_KEY=$PROD_SECRET pnpm build
```

部署时通过环境变量覆盖，无需修改代码或配置文件。

---

## 四、实践模式

### 4.1 API 请求封装

```typescript
// composables/useApi.ts
export function useApi() {
  const config = useRuntimeConfig()

  return {
    get: (path: string) => $fetch(`${config.public.baseUrl}${path}`),
    post: (path: string, body: any) =>
      $fetch(`${config.public.baseUrl}${path}`, { method: 'POST', body }),
  }
}
```

### 4.2 功能开关

```typescript
// nuxt.config.ts
runtimeConfig: {
  public: {
    enableAnalytics: false,
    maintenanceMode: false,
  },
}
```

```bash
# 运维通过环境变量控制，无需重新部署
NUXT_PUBLIC_MAINTENANCE_MODE=true node .output/server/index.mjs
```

runtimeConfig 的核心优势：**构建产物不变，运行时注入配置**。同一份构建可部署到多个环境。

---

## 常见问题

**Q: runtimeConfig 和 Vite 的 import.meta.env 有什么区别？**

Vite 环境变量在**构建时**静态替换进代码，修改需重新构建。runtimeConfig 在**运行时**读取，构建一次可部署多环境。Nuxt 中优先使用 runtimeConfig。

**Q: 为什么客户端访问私有配置不报错而是空值？**

安全设计。Nuxt 不会将私有配置序列化到 HTML，客户端读取时得到空字符串/undefined，避免敏感信息意外泄漏。

**Q: .env 文件需要提交到 Git 吗？**

不提交。`.env` 应加入 `.gitignore`，仓库中提供 `.env.example` 作为模板说明所需变量。CI/CD 通过平台变量注入。

---

## 延伸阅读

- 上一篇：[Nuxt3 自动导入与 Mock Server 配置实践](05-Nuxt3自动导入与Mock-Server配置实践.md) — 自动导入
- 下一篇：[SSR 与 CSR 性能对比测试实践](07-SSR与CSR性能对比测试实践.md) — 性能测试
- 官方文档：[Nuxt Runtime Config](https://nuxt.com/docs/guide/going-further/runtime-config)
