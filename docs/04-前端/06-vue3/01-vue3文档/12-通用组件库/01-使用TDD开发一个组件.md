---
title: "使用 TDD 开发一个组件"
description: "以 TDD（测试驱动开发）方式实现 Button 组件：Jest + @vue/test-utils 环境配置、先写测试再写实现、size 属性与全局默认配置、测试覆盖率与 husky 提交检查。"
category: Vue

---

# 使用 TDD 开发一个组件

TDD 开发模式 使用测试驱动开发的方式实现一个组件

## 组件库引入 Jest

选择 Facebook 的 Jest 作为组件库的测试代码，Jest 是现在做测试的最佳选择了，它内置了断言、测试覆盖率等功能。

因为组件库使用 TypeScript 开发，需要安装一些插件。 `vue-jest` 和 `@vue/test-utils` 是测试 Vue 组件必备的库，然后安装 babel 相关的库，最后安装 Jest 适配 TypeScript 的库

```bash
pnpm install -D jest@26 vue-jest@next @vue/test-utils@next 
pnpm install -D babel-jest@26 @babel/core @babel/preset-env 
pnpm install -D ts-jest@26 @babel/preset-typescript @types/jest
```

> 注：以上是课程编写时的版本组合（Vue 3 早期常用 `vue-jest@next` / `@vue/test-utils@next`）。新项目建议直接使用 Vitest + 现行版 `@vue/test-utils`；若坚持使用 Jest，Vue 3 对应的转换器为 `@vue/vue3-jest`。

根目录新建 `.babel.config.js`，让 babel 解析到 Node 和 TypeScript 环境下

```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-typescript',
  ],
}
```

需要新建 jest.config.js 配置 jest 的测试行为

```javascript
module.exports = {
  transform: {
    // .vue文件用 vue-jest 处理
    '^.+\\.vue$': 'vue-jest',
    // .js或者.jsx用 babel-jest处理
    '^.+\\.jsx?$': 'babel-jest', 
    //.ts文件用ts-jest处理
    '^.+\\.ts$': 'ts-jest'
  },
  testMatch: ['**/?(*.)+(spec).[jt]s?(x)']
}
```

在 package.json 中的 `scripts` 配置新增 test 命令，即可启动 Jest

```json
"scripts": {
  "dev": "vite",
  "build": "vue-tsc --noEmit && vite build",
  "serve": "vite preview",
  "lint": "eslint --fix --ext .js,vue src/",
  "test": "jest",
}
```

完成上面的操作之后，配置工作就告一段落了，可以开始输入代码做测试了

增加 `src/test.spec.js`，更多的断言函数你可以去 [官网](https://www.jestjs.cn/docs/expect) 查看，这些函数可以覆盖我们测试场景的方方面面。

```javascript
function sayHello(name, fn) {
  if (name === 'xiaoye') {
    fn()
  }
}

test('测试加法', () => {
  expect(1 + 2).toBe(3)
})

test('测试函数', () => {
  const fn = jest.fn()
  sayHello('xiaoye', fn)
  expect(fn).toHaveBeenCalled()
})
```

## TDD 开发组件

借助 Vue 官方推荐的 `@vue/test-utils` 库来测试组件的渲染，新建 `src/components/button` 文件夹，新建 `Button.spec.ts` 。

参考 element-plus 的 button 组件，`xy-button` 组件可以通过传递 size 来配置按钮的大小。现在先根据需求去写测试代码。因为`Button.vue`  还不存在，可以先根据 Button 的行为去书写测试案例 `src/components/button/Button.spec.ts` 。

从 `@vue/test-utils`  库中导入 mount 函数，这个函数可以在命令行里模拟 Vue 的组件渲染

```javascript
import Button from './Button.vue'
import { mount } from '@vue/test-utils'

describe('按钮测试', () => {
  it('按钮能够显示文本', () => {
    const content = '程序员小叶'
    const wrapper = mount(Button, {
      slots: {
        default: content
      }
    })
    expect(wrapper.text()).toBe(content)
  })
  
  it('通过size属性控制大小', () => {
    const size = 'small'
    const wrapper = mount(Button, {
      props: {
        size
      }
    })
    // size 内部通过 class 控制
    expect(wrapper.classes()).toContain('xy-button--small')
  })  

})
```

> 在 Button 的 slot 传递了文本之后，wrapper.text() 就能获取到文本内容，然后对 Button 渲染结果进行判断。之后利用 size 参数，即可通过渲染不同的 class 来实现按钮的大小

`npm run test` 执行所有的测试代码。期望 button 上含有 `xy-button--small` 的 class，但是实际上并没有这个 class，就会报错

之后再通过实现 Button 组件的逻辑，去处理这个错误信息，这就是 TDD 测试驱动开发的方法

`button.vue` 通过接收 size 去渲染 button 的 class

```vue
<template>
  <button class="xy-button" :class="[size ? `xy-button--${size}` : '',]">
    <slot />
  </button>
</template>
<script setup lang="ts">

  import {computed, withDefaults} from 'vue'
  
  interface Props {
    size?:""|'small'|'medium'|'large'
  }
  
  const props = withDefaults(defineProps<Props>(),{
    size:""
  })

</script>
```

class 还要通过 Sass 去修改浏览器页面内的大小，这里的 Sass 代码只是几个核心逻辑

```scss
@include b(button){
  display: inline-block;
  cursor: pointer;
  background: $--button-default-background-color;
  color: $--button-default-font-color;
  @include button-size(
    $--button-padding-vertical,
    $--button-padding-horizontal,
    $--button-font-size,
    $--button-border-radius
  );
  @include m(small) {
    @include button-size(
      $--button-medium-padding-vertical,
      $--button-medium-padding-horizontal,
      $--button-medium-font-size,
      $--button-medium-border-radius
    );
  }
  @include m(large) {
    @include button-size(
      $--button-large-padding-vertical,
      $--button-large-padding-horizontal,
      $--button-large-font-size,
      $--button-large-border-radius
    );
  }
}
```

前面的代码中通过 b(button) 渲染 xy-button 的样式（Mixin 沿用 Element Plus 的写法，前缀可按组件库自行调整），内部使用变量都可以在 mixin 中找到。通过 b 和 button-size 的嵌套，就能实现按钮大小的控制。button 渲染的结果，你可以参考下方的截图

![img](https://cdn.nlark.com/yuque/0/2023/png/28081210/1675411456379-48c3db1b-8639-471f-b32a-38dbd89e6a18.png)

设置按钮的大小除了通过 props 传递，还可以通过全局配置的方式设置默认大小。进入到代码文件 `src/main.ts` 中，设置全局变量 `$AILEMENTE`  中的 size 为 large，并且还可以通过 `type="primary"` 或者 `type="success"`的方式，设置按钮的主体颜色

```javascript
const app = createApp(App)
app.config.globalProperties.$AILEMENTE = {
  size:'large'
}
app.use(ElContainer).use(ElButton).mount('#app')
```

要支持全局的 size 配置，新建 `src/util.ts`  通过 vue 提供的 getCurrentInstance 获取当前的实例，然后返回全局配置的 `$AILEMENTE` 

```typescript
import { getCurrentInstance,ComponentInternalInstance } from 'vue'

export function useGlobalConfig(){
  const instance:ComponentInternalInstance|null =getCurrentInstance()
    if(!instance){
      console.log('useGlobalConfig 必须得在setup里面整')
      return
  }
  return instance.appContext.config.globalProperties.$AILEMENTE || {}
}
```

再回到 Button.vue 中，通过 computed 返回计算后的按钮的 size。如果 props.size 没传值，就使用全局的 globalConfig.size；如果全局设置中也没有 size 配置，按钮就使用 Sass 中的默认大小

```vue
<template>
  <button class="xy-button" :class="[buttonSize ? `xy-button--${buttonSize}` : '',type ? `xy-button--${type}` : '']">
    <slot />
  </button>
</template>

<script lang="ts">
  export default{
    name:'XyButton'
  }
</script>

<script setup lang="ts">
  import {computed, withDefaults} from 'vue'
  import { useGlobalConfig } from '../../util';

  interface Props {
    size?:""|'small'|'medium'|'large',
    type?:""|'primary'|'success'|'danger'
  }
  const props = withDefaults(defineProps<Props>(),{
    size:"",
    type:""
  })
  const globalConfig = useGlobalConfig()
  
  const buttonSize = computed(()=>{
    return props.size||globalConfig.size
  })
</script>
```

`src/App.vue` 中，就可以直接使用 `xy-button` 来显示不同样式的按钮

```html
<xy-button type="primary">
  按钮
</xy-button>
<xy-button type="success">
  按钮
</xy-button>
<xy-button>按钮</xy-button>
<xy-button size="small">
  按钮
</xy-button>
```

进入 jest.config.js 中新增下面的配置，collectCoverage 标记的意思是需要收集代码测试覆盖率

```javascript
module.exports = {
  transform: {
    //  用 `vue-jest` 处理 `*.vue` 文件
    '^.+\\.vue$': 'vue-jest', //vuejest 处理.vue
    '^.+\\.jsx?$': 'babel-jest',  // babel jest处理js or jsx
    '^.+\\.tsx?$': 'ts-jest', // ts-jest 处理.ts .tsx
  },
  testMatch: ['**/?(*.)+(spec).[jt]s?(x)'],
  collectCoverage: true,
  coverageReporters: ["json", "html"],
}
```

然后在执行 `npm run test` 后，项目的根目录下就会出现一个 coverage 目录

打开下面的 `index.html` 可以看到测试覆盖率的报告。对照下图我们可以看到，button 组件的测试覆盖率 100%，util 下面有两行代码飘红，也就是没有测试的逻辑。

在一定程度上，测试覆盖率也能够体现出代码的可维护性，希望你可以用好这个指标

最后进入 `.husky/pre-commit` 文件，新增 npm run test 命令 确保测试通过的代码才能进入 git 管理代码，这会进一步提高代码的规范和可维护性

```javascript
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run test
```