---
description: Element Plus 组件库基础使用与按需引入
keywords: [Element Plus, 组件库, Vue]
category: Vue
title: "Element-plus"
---
# Element-plus

## 集成 Element-plus

### 全局导入

使用 Element-plus 时 node 版本最好 16 以上

```bash
pnpm install element-plus
```

对打包后的文件大小不是很在乎，使用完整导入会更方便

```tsx
// main.ts
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

const app = createApp(App)

app.use(ElementPlus)
app.mount('#app')
```

如果使用 Volar，在 tsconfig.json 中通过 compilerOptions.types 指定全局组件类型

```json
// tsconfig.json
{
  "compilerOptions": {
    // ...
    "types": ["element-plus/global"]
  }
}
```

### 按需导入

```bash
pnpm install -D unplugin-vue-components unplugin-auto-import
```

在 **vite.config.ts** 中做如下配置：

```typescript
// vite.config.ts
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

export default {
  plugins: [
    // ...
    AutoImport({
      resolvers: [ElementPlusResolver()],
    }),
    Components({
      resolvers: [ElementPlusResolver()],
    }),
  ],
}
```

不需要在 main.ts 导入。在需要用到组件的地方直接使用就可以，**auto-imports.d.ts** 文件会自动记录所使用到的 element-plus 组件

### 注册组件库样式

在 **main.ts** 中引入 **element-plus** 组件样式

```typescript
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

import ElementPlus, { ElMessage } from 'element-plus'
import 'element-plus/dist/index.css'

const app = createApp(App)
app.config.globalProperties.$message = ElMessage
app.use(ElementPlus)
app.mount('#app')
```

> ts 报错 `TS2792: Cannot find module 'element-plus'. Did you mean to set the 'moduleResolution' option to 'nodenext', or to add aliases to the 'paths' option?`

解决办法

```json
{
  "compilerOptions": {
    // 同时加上这一句
    "types": ["element-plus/global"]
  }
}
```

### 组件使用

反馈组件不需要使用 **import** 从 **element-plus** 中引入，但是 **volar** 会提示报错，为了避免报错提示，还是使用 **import** 这种方式引入以免报错。

另外常常将一些反馈组件放置在全局来使用，比如 **Toast、Message** 等。在 main.ts 中设置 `app.config.globalProperties.$message = ElMessage`

```typescript
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus, { ElMessage } from 'element-plus'
import 'element-plus/dist/index.css'

const app = createApp(App)
app.config.globalProperties.$message = ElMessage
app.use(router)
app.use(ElementPlus)
app.mount('#app')
```

在使用 ElMessage 的视图中以 `proxy.$message` 的方式来使用

```typescript
import { useRouter, useRoute } from 'vue-router'
import { h, getCurrentInstance } from 'vue'
const router = useRouter()
const route = useRoute()

console.log(route.params)
const { proxy }: any = getCurrentInstance()
proxy.$message({
  message: h('p', null, [
    h('span', null, 'Message can be '),
    h('i', { style: 'color: teal' }, 'VNode')
  ])
})
```

**vite** 启动成功后，在浏览器中，可以看到 **element-plus.js** 的 size 也只有 10.0kB，非常小，这个就是按需加载产生的效果。

将之前 **vite.config.ts** 中按需引入的相关配置先注释掉，重新刷新页面，在浏览器中，则 **element-plus** 加载的**js**的size会很大，有6.5MB

## Icon 图标

```bash
# pnpm
pnpm install @element-plus/icons-vue
```

从 `@element-plus/icons-vue` 中导入所有图标并进行全局注册

```typescript
// main.ts
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

const app = createApp(App)
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
```

## 快速使用

```bash
pnpm i element-plus @element-plus/icons-vue
```

全局导入 element-plus 与 icon 图标库

```javascript
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const app = createApp(App)

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}
app.use(ElementPlus, { locale: zhCn }).use(store).use(router).mount('#app')
```

