---
title: Vite 构建
description: Vite 的 pre-bundle、dev server 与 Rollup 生产构建的差异
keywords: [Node.js, 构建, 脚手架, Vite]
category: Node.js
tags: [Node.js, 工程化]
---







# Vite 构建

## 介绍

Vite 是新一代前端构建工具，利用浏览器原生 ES Module 支持，提供极速的开发体验。

## 创建项目

```bash
# npm
npm create vite@latest my-project

# pnpm
pnpm create vite my-project

# 选择框架
# vanilla / vue / react / preact / lit / svelte
```

## 配置文件

创建 `vite.config.ts`：

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
  // 插件
  plugins: [vue()],
  
  // 开发服务器
  server: {
    port: 3000,
    open: true,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  },
  
  // 构建
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild', // 'terser' | 'esbuild'
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router']
        }
      }
    }
  },
  
  // 路径别名
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  
  // 环境变量
  envPrefix: 'VITE_'
})
```

> **注**：若项目使用 ESM（`package.json` 中 `"type": "module"`），vite.config.ts 中没有 `__dirname`，别名应改写为 `fileURLToPath(new URL('./src', import.meta.url))`。

## 环境变量

### .env 文件

```bash
# .env
VITE_API_URL=http://localhost:8080

# .env.development
VITE_API_URL=http://dev-api.example.com

# .env.production
VITE_API_URL=https://api.example.com
```

### 使用环境变量

```typescript
const apiUrl = import.meta.env.VITE_API_URL

// 类型定义
interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

## 常用插件

### @vitejs/plugin-vue

```typescript
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()]
})
```

### @vitejs/plugin-react

```typescript
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()]
})
```

### vite-plugin-compression

```bash
pnpm add vite-plugin-compression -D
```

```typescript
import compression from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    compression({
      algorithm: 'gzip',
      threshold: 10240 // 大于 10KB 才压缩
    })
  ]
})
```

### vite-plugin-svg-icons

```typescript
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons'

export default defineConfig({
  plugins: [
    createSvgIconsPlugin({
      iconDirs: [path.resolve(__dirname, 'src/icons')],
      symbolId: 'icon-[name]'
    })
  ]
})
```

## CSS 处理

### CSS Modules

```css
/* example.module.css */
.container {
  color: red;
}
```

```typescript
import styles from './example.module.css'

document.querySelector('#app').className = styles.container
```

### 预处理器

```bash
# Sass
pnpm add sass -D

# Less
pnpm add less -D

# Stylus
pnpm add stylus -D
```

## 构建优化

### 分包策略

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'ui-vendor': ['element-plus']
        }
      }
    }
  }
})
```

### CDN 外部化

```typescript
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['vue', 'vue-router'],
      output: {
        globals: {
          vue: 'Vue',
          'vue-router': 'VueRouter'
        }
      }
    }
  }
})
```

## Node.js 项目支持

Vite 也可用于构建 Node.js 库：

```typescript
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'MyLib',
      formats: ['es', 'cjs'],
      fileName: format => `index.${format === 'es' ? 'mjs' : 'js'}`
    },
    rollupOptions: {
      external: ['fs', 'path'],
      output: {
        globals: {}
      }
    }
  },
  plugins: [dts()] // 生成类型声明文件
})
```

## 常见问题

**Q: 开发环境请求跨域？**

配置 `server.proxy` 代理 API 请求。

**Q: 构建后资源路径错误？**

设置 `base` 配置项：

```typescript
export default defineConfig({
  base: '/my-app/'
})
```
