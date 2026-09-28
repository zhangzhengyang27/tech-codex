---
description: Sass 预处理器核心语法与工程化使用
keywords: [Sass, CSS 预处理器, 工程化]
category: CSS
title: "Sass"
---
# Sass

## 集成 Sass 样式预处理器

```bash
pnpm install sass -D
```

**vite** 中配置 **sass**，需要在 **vite.config.ts** 文件中做如下配置：

```typescript
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import {ElementPlusResolver} from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
  css: {
    // css 预处理器,路径后面要添加分号;
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/assets/scss/variable.scss";'
      }
    }
  }
})
```

> 注：Dart Sass 已将 `@import` 标记为废弃特性（会输出 deprecation 警告），新项目建议改用 `@use` 引入变量与混入。
