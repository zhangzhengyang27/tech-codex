---
title: "HMR的API及原理"
description: "Vite HMR API 详解：import.meta.hot 的 accept/dispose/data/invalidate 等核心能力，HMR 边界的确定方式与状态保存原理，以及 vite:beforeUpdate 等自定义事件。"
keywords: [HMR]
category: tools
tags: [Vite, HMR, 构建工具, 工程化]
---

# HMR的API及原理

在 HMR 出现之前，页面代码的更新是通过 live reload（也就是自动刷新页面）的方式来解决的。不过随着前端工程的日益庞大，live reload 的方式在诸多的场景下却显得十分鸡肋，简单来说就是 模块局部更新 + 状态保存 的需求在 live reload 的方案没有得到满足，从而导致开发体验欠佳。当然，针对部分场景也有一些临时的解决方案，比如状态存储到浏览器的本地缓存(localStorage 对象)中，或者直接 mock 一些数据。但这些方式未免过于粗糙，无法满足通用的开发场景，且实现上也不够优雅。

一般使用 HMR 技术来解决这个问题，像 Webpack、Parcel 这些传统的打包工具底层都实现了一套 HMR API，Vite 所实现的 HMR API，相比于传统的打包工具，Vite 的 HMR API 基于 ESM 模块规范来实现，可以达到毫秒级别的更新速度，性能非常强悍。

## HMR 简介

HMR 的全称叫做 Hot Module Replacement ，即 模块热替换 或者 模块热更新。HMR 就是在页面模块更新的时候，直接把**页面中发生变化的模块替换为新的模块**，同时不会影响其它模块的正常运作。

通过 HMR 的技术我们就可以实现 局部刷新 和 状态保存 ，从而解决之前提到的种种问题

## 深入 HMR API

Vite 的 HMR 系统基于原生的 ESM 模块规范来实现，在文件发生改变时 Vite 会侦测到相应 ES 模块的变化，从而触发相应的 API，实现局部的更新。

Vite 的 HMR API 设计也并非空穴来风，它基于一套完整的 ESM HMR 规范来实现，这个规范由同时期的 no-bundle 构建工具Snowpack、WMR 与 Vite 一起制定，是一个比较通用的规范。

我们可以直观地来看一看 HMR API 的类型定义:

```ts
interface ImportMeta {
  readonly hot?: {
    readonly data: any
    accept(): void
    accept(cb: (mod: any) => void): void
    accept(dep: string, cb: (mod: any) => void): void
    accept(deps: string[], cb: (mods: any[]) => void): void
    prune(cb: () => void): void
    dispose(cb: (data: any) => void): void
    decline(): void
    invalidate(): void
    on(event: string, cb: (...args: any[]) => void): void
  }
}
```

 import.meta 对象为现代浏览器原生的一个内置对象，Vite 所做的事情就是在这个对象上的 hot 属性中定义了一套完整的属性和方法。因此，在 Vite 当中，你就可以通过 import.meta.hot 来访问关于 HMR 的这些属性和方法，比如 import.meta.hot.accept() 

### 模块更新时逻辑 hot.accept

在 import.meta.hot 对象上有一个非常关键的方法 accept ，因为它决定了 Vite 进行热更新的边界。accept 就是用来**接受模块更新**的。 一旦 Vite 接受了这个更新，当前模块就会被认为是 HMR 的边界。那么，Vite 接受的更新会有三种情况：

- 接受**自身模块**的更新
- 接受**某个子模块**的更新
- 接受**多个子模块**的更新

这三种情况分别对应 accept 方法三种不同的使用方式，下面我们就一起来分析一下。

#### 接受自身更新

当模块接受自身的更新时，则当前模块会被认为 HMR 的边界。也就是说，除了当前模块，其他的模块均未受到任何影响

![image-20240322111359222](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403221114352.png)

以一个实际的例子来操练一下，展示一下整体的目录结构:

```javascript
.
├── favicon.svg
├── index.html
├── node_modules
│ └── ...
├── package.json
├── src
│ ├── main.ts
│ ├── render.ts
│ ├── state.ts
│ ├── style.css
│ └── vite-env.d.ts
└── tsconfig.json
```

这里我放出一些关键文件的内容，如下面的 index.html ：

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Vite App</title>
  </head>
  <body>
    <div id="app"></div>
    <p>
      count: <span id="count">0</span>
    </p>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

里面的 DOM 结构比较简单，同时引入了 /src/main.ts 这个文件，内容如下:

```javascript
import { render } from './render';
import { initState } from './state';
render();
initState();
```

文件依赖了 render.ts 和 state.ts ，前者负责渲染文本内容，而后者负责记录当前的页面状态:

```ts
// src/render.ts
// 负责渲染文本内容
import './style.css'
export const render = () => {
  const app = document.querySelector<HTMLDivElement>('#app')!
        app.innerHTML = `
 <h1>Hello Vite!</h1>
 <p target="_blank">This is hmr test.123</p>
 `
}

// src/state.ts
// 负责记录当前的页面状态
export function initState() {
  let count = 0;
  setInterval(() => {
    let countEle = document.getElementById('count');
    countEle!.innerText = ++count + '';
  }, 1000);
}
```

仓库当中关键的代码就目前这些。然后 `npm run dev`  启动项目，每隔一秒钟 count 值会加一。试着改动一下 render.ts 的渲染内容，比如增加一些文本:

```javascript
// render.ts
export const render = () => {
  const app = document.querySelector<HTMLDivElement>('#app')!
        app.innerHTML = `
 <h1>Hello Vite!</h1>
 <p target="_blank">This is hmr test.123 这是增加的文本</p>
 `
  }
```

页面的渲染内容是更新了，但 count 值瞬间被置零了，并且查看控制台，也有这样的 log：

```javascript
[vite] page reload src/render.ts
```

当 render.ts 模块发生变更时，Vite 发现并没有 HMR 相关的处理，然后直接刷新页面了。

现在让我们在 render.ts 中加上如下的代码:

```javascript
// 条件守卫
if (import.meta.hot) {
  import.meta.hot.accept((mod) => mod.render())
}
```

import.meta.hot 对象只有在开发阶段才会被注入到全局，生产环境是访问不到的，另外增加条件守卫之后，打包时识别到 if 条件不成立，会自动把这部分代码从打包产物中移除，来优化资源体积。因此，我们需要增加这个条件守卫语句。

`import.meta.hot.accept((mod) => mod.render())`  这里传入了一个回调函数作为参数，入参即为 Vite 提供的更新后的模块内容，在浏览器中打印 mod 内容如下，正好是 render 模块最新的内容:

![image-20240322112109374](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403221121022.png)

在回调中调用了一下 mod.render 方法，也就是当模块变动后，每次都重新渲染一遍内容。但 count 并没有被重新置零，而是保留了原有的状态。

没错，现在 render 模块更新后，只会重新渲染这个模块的内容，而对于 state 模块的内容并没有影响，并且控制台的 log 也发生了变化:

```javascript
[vite] hmr update /src/render.ts
```

传入了一个回调函数来手动调用 render 逻辑，但事实上也可以什么参数都不传。这样 Vite 只会把 render 模块的最新内容执行一遍。但 render 模块内部只声明了一个函数，因此直接调用 import.meta.hot.accept() 并不会重新渲染页面。

#### 接受依赖模块的更新

比如 main 模块依赖 render 模块，也就是说 main 模块是 render 父模块，也可以在 main 模块中接受 render 模块的更新，此时 HMR 边界就是 main 模块了

将 render 模块的 accept 相关代码先删除:

```javascript
// render.ts
- if (import.meta.hot) {
- import.meta.hot.accept((mod) => mod.render())
- }
```

然后再 main 模块增加如下代码:

```javascript
// main.ts
import { render } from './render';
import './state';
render();

if (import.meta.hot) {
  import.meta.hot.accept('./render.ts', (newModule) => {
    newModule.render();
  })
}
```

同样是调用 accept 方法，第一个参数传入一个依赖的路径，相当于告诉 Vite: 监听了 render 模块的更新，当它的内容更新的时候，请把最新的内容传给我。同样的，第二个参数中定义了模块变化后的回调函数，这里拿到了 render 模块最新的内容，然后执行其中的渲染逻辑，让页面展示最新的内容。

通过接受一个依赖模块的更新，同样又实现了 HMR 功能，改动 render 模块的内容，可以发现页面内容正常更新，并且状态依然保持着原样

#### 接受多个子模块的更新

**父模块可以接受多个子模块的更新，当其中任何一个子模块更新之后，父模块会成为 HMR 边界**。还是拿之前的例子来演示，现在更改 main 模块代码:

```javascript
// main.ts
import { render } from './render';
import { initState } from './state';
render();
initState();

if (import.meta.hot) {
  import.meta.hot.accept(['./render.ts', './state.ts'], (modules) => {
    console.log(modules);
  })
}
```

在代码中通过 accept 方法接受了 render 和 state 两个模块的更新，接着手动改动一下某一个模块的代码，观察一下回调中 modules 的打印内容。例如当我改动 state 模块的内容时，回调中拿到的 modules 是这样的:

![image-20240322112945040](https://zhangzhengyang.oss-cn-beijing.aliyuncs.com/images/202403221129703.png)

可以看到 Vite 回调传来的参数 modules 其实是一个数组，和第一个参数声明的子模块数组一一对应。因此 modules 数组第一个元素是 undefined ，表示 render 模块并没有发生变化，第二个元素为一个 Module 对象，也就是经过变动后 state 模块的最新内容。

于是在这里，根据 modules 进行自定义的更新，修改 main.ts :

```javascript
// main.ts
import { render } from './render';
import { initState } from './state';
render();
initState();

if (import.meta.hot) {
  import.meta.hot.accept(['./render.ts', './state.ts'], (modules) => {
    // 自定义更新
    const [renderModule, stateModule] = modules;
    if (renderModule) {
      renderModule.render();
    }
    if (stateModule) {
      stateModule.initState();
    }
  })
}
```

现在改动两个模块的内容，页面的相应模块会更新，并且对其它的模块没有影响。但实际上你会发现另外一个问题，当改动了 state 模块的内容之后，页面的内容会变得错乱:

```javascript
// state.ts
export function initState() {
  let count = 0;
  setInterval(() => {
    let countEle = document.getElementById('count');
    countEle!.innerText = ++count + '';
  }, 1000);
}
```

`state.ts`  中设置了一个定时器，但当模块更改之后，这个定时器并没有被销毁，紧接着在 accept 方法调用 initState 方法又创建了一个新的定时器，导致 count 的值错乱。解决这个问题就涉及到新的 HMR 方法—— dispose 方法了

### 模块销毁时逻辑 hot.dispose

hot.dispose 代表在模块更新、旧模块需要销毁时需要做的一些事情，拿刚刚的场景来说，可以通过在 state 模块中调用 dispose 方法来轻松解决定时器共存的问题，代码改动如下:

```javascript
// state.ts
let timer: number | undefined;

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    if (timer) {
      clearInterval(timer);
    }
  })
}

export function initState() {
  let count = 0;
  timer = setInterval(() => {
    let countEle = document.getElementById('count');
    countEle!.innerText = ++count + '';
  }, 1000);
}
```

当我改动一下 state 模块的内容页面确实会更新，而且也没有状态错乱的问题，说明在模块销毁前清除定时器的操作是生效的。

但是原来的状态丢失了， count 的内容从 64 突然变成 1 。 main 模块接受更新，执行 accept 方法中的回调，接着会执行 state 模块的 initState 方法。注意了，此时新建的 initState 方法的确会初始化定时器，但同时也会初始化 count 变量，也就是 count 从 0 开始计数了！

这显然是不符合预期的，我们期望的是每次改动 state 模块，之前的状态都保存下来。需要使用到 hot.data 属性

### 共享数据 hot.data 属性

hot.data 属性用来在不同的模块实例间共享一些数据。使用上也非常简单，让我们来重构一下 state 模块:

```javascript
let timer: number | undefined;

if (import.meta.hot) {
  // 初始化 count
  if (!import.meta.hot.data.count) {
    import.meta.hot.data.count = 0;
  }
  import.meta.hot.dispose(() => {
    if (timer) {
      clearInterval(timer);
    }
  })
}

export function initState() {
  const getAndIncCount = () => {
    const data = import.meta.hot?.data || {
      count: 0
    };
    data.count = data.count + 1;
    return data.count;
  };
  timer = setInterval(() => {
    let countEle = document.getElementById('count');
    countEle!.innerText = getAndIncCount() + '';
  }, 1000);
}
```

在 import.meta.hot.data 对象上挂载了一个 count 属性，在二次执行 initState的时候便会复用 import.meta.hot.data 上记录的 count 值，从而实现状态的保存。

基本实现了这个示例应用的 HMR 的功能。在这个过程中，用到了核心的 accept 、 dispose 和 data 属性和方法。当然还有一些方法将会给大家进行介绍，但相较而言就比较简单了，而且用的也不多，大家只需要留下初步的印象，知道这些方法的用途是什么，需要用到的时候再来查阅即可。

### 其它方法

#### hot.decline()

这个方法调用之后，相当于表示此模块不可热更新，当模块更新时会强制进行页面刷新。感兴趣的同学可以继续拿上面的例子来尝试一下

#### hot.invalidate()

这个方法用来通知 Vite 当前模块无法接受本次更新，更新会沿着依赖链向上冒泡寻找 HMR 边界；如果最终没有模块能够接受这次更新，就会进行整页刷新。

#### 自定义事件

还可以通过 import.meta.hot.on 来监听 HMR 的自定义事件，内部有这么几个事件会自动触发:

- vite:beforeUpdate 当模块更新时触发；
- vite:beforeFullReload 当即将重新刷新页面时触发；
- vite:beforePrune 当不再需要的模块即将被剔除时触发
- vite:error 当发生错误时（例如，语法错误）触发

如果想自定义事件，可以通过插件 Hook handleHotUpdate 来进行触发:

```javascript
// 插件 Hook
handleHotUpdate({ server }) {
  server.ws.send({
    type: 'custom',
    event: 'custom-update',
    data: {}
  })
  return []
}
// 前端代码
import.meta.hot.on('custom-update', (data) => {
  // 自定义更新逻辑
})
```