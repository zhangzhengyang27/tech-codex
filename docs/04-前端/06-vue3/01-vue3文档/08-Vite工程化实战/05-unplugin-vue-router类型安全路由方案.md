---
title: unplugin-vue-router类型安全路由方案
description: "unplugin-vue-router 是 Vue Router 官方推荐的下一代文件系统路由方案，核心优势是自动生成完整的 TypeScript 类型定义，实现路由路径和参数的编译时类型检查。"
keywords: []
category: Vue
tags: [Vue, 组件化, 响应式, 路由]
---


# unplugin-vue-router 类型安全路由方案

## 概述

unplugin-vue-router 是 Vue Router 官方推荐的下一代文件系统路由方案，核心优势是自动生成完整的 TypeScript 类型定义，实现路由路径和参数的编译时类型检查。本文讲解其安装配置、类型生成机制和与 vite-plugin-pages 的对比选型。

## 学习目标

- 掌握 unplugin-vue-router 的安装与插件顺序要求
- 理解 `vue-router/auto` 导入路径的类型安全机制
- 掌握 VS Code 配置优化与类型声明文件的协作

---

## 一、与 vite-plugin-pages 对比

| 对比项 | unplugin-vue-router | vite-plugin-pages |
|--------|---------------------|-------------------|
| 类型安全 | 自动生成完整类型 | 需额外配置 |
| SSR 支持 | 开箱即用 | 需额外配置 |
| 官方推荐 | Vue Router 官方 | 社区维护 |
| 学习曲线 | 中等 | 较低 |
| 智能提示 | 路径 + 参数完整提示 | 有限 |

---

## 二、安装与配置

### 2.1 安装

```bash
pnpm add -D unplugin-vue-router
```

### 2.2 Vite 配置

```typescript
// vite.config.ts
import VueRouter from 'unplugin-vue-router/vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    // 必须在 vue() 之前
    VueRouter({
      /* 配置选项 */
    }),
    vue(),
  ],
})
```

插件顺序要求：VueRouter 需要先扫描 pages 目录生成类型定义，vue 插件才能正确处理。

### 2.3 路由入口配置

```typescript
// src/router/index.ts
// 关键：从 'vue-router/auto' 导入
import { createRouter, createWebHistory } from 'vue-router/auto'

const router = createRouter({
  history: createWebHistory(),
  // 无需手动定义 routes，插件自动生成
})

export default router
```

`vue-router/auto` 与 `vue-router` 的区别：

| 导入路径 | 说明 |
|---------|------|
| `vue-router` | 标准导入，需手动定义路由 |
| `vue-router/auto` | 自动模式，路由由插件生成，附带类型 |

---

## 三、类型安全机制

### 3.1 类型生成

插件自动生成 `typed-router.d.ts` 文件，包含：

- 所有路由路径的字面量类型
- 每个路由的参数类型
- `useRoute` / `useRouter` 的类型增强

### 3.2 类型提示效果

```typescript
// 路径自动补全
router.push('/user/123')  // 类型检查通过
router.push('/invalid')   // 类型报错

// 参数类型检查
const route = useRoute('/user/[id]')
route.params.id  // 类型为 string
```

### 3.3 tsconfig 配置

```json
{
  "compilerOptions": {
    "moduleResolution": "bundler"
  },
  "include": [
    "typed-router.d.ts",
    "auto-imports.d.ts"
  ]
}
```

---

## 四、VS Code 配置优化

### 4.1 启用完整提示

`.vscode/settings.json`：

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "vue.server.hybridMode": true
}
```

### 4.2 类型声明文件

项目根目录会生成以下文件（应加入 .gitignore 或提交均可）：

| 文件 | 作用 |
|------|------|
| `typed-router.d.ts` | 路由类型定义 |
| `auto-imports.d.ts` | 自动导入 API 类型 |
| `components.d.ts` | 组件自动导入类型 |

---

## 五、与自动导入协作

```typescript
// vite.config.ts
import AutoImports from 'unplugin-auto-import/vite'

AutoImports({
  imports: [
    'vue',
    {
      // 使用 vue-router/auto-imports 而非 vue-router
      'vue-router/auto-imports': ['useRouter', 'useRoute'],
    },
  ],
  dts: 'auto-imports.d.ts',
})
```

使用 `vue-router/auto-imports` 确保生成的类型声明指向正确的类型定义路径。

---

## 常见问题

**Q: 为什么插件必须放在 vue() 之前？**

VueRouter 插件在 `configResolved` 阶段扫描文件系统并生成类型。如果 vue() 先执行，SFC 编译时还无法获取路由类型信息，导致类型推断失败。

**Q: 从 vite-plugin-pages 迁移需要注意什么？**

1) 移除 vite-plugin-pages 依赖；2) 将 `import routes from '~pages'` 改为 `from 'vue-router/auto'`；3) 删除手动 routes 数组；4) 启动一次 dev/build，插件会自动生成 `typed-router.d.ts`（也可用 `npx unvue-routes` 打印生成的路由）。

**Q: TypeScript 报 "Cannot find module 'vue-router/auto'" 怎么办？**

确认 `tsconfig.json` 中 `moduleResolution` 设为 `"bundler"`（TS 5.0+）或 `"node16"`。旧版 `"node"` 模式无法正确解析 package.json 的 `exports` 字段。

---

## 延伸阅读

- 上一篇：[vite-plugin-pages 自动路由方案](04-vite-plugin-pages自动路由方案.md) — 文件系统路由
- 下一篇：[第三方库 TypeScript 集成问题排查](06-第三方库TypeScript集成问题排查.md) — 模块解析
- 官方文档：[unplugin-vue-router](https://uvr.esm.is/)
