---
title: "ReactPlayground项目实战"
description: "从 0 到 1 实现 React Playground：用 allotment 做可拖拽布局、@monaco-editor/react 做编辑器、@babel/standalone 浏览器内编译、blob url 与 import maps 解决模块引入、iframe 实时预览，并完成文件增删改、错误提示、主题切换、链接分享与 Web Worker 性能优化。"
keywords: [ReactPlayground项目实战]
category: React
tags: [React, 原理与源码]
---

::: warning 配图说明
本教程原配图未随迁移入库，含 242 处图示引用已改为文字提示，阅读时以代码与文字描述为准。
:::

# ReactPlayground项目实战

## 思路分析：实现思路

本项目实现一个 React Playground，类似 [vue 的 playground](https://play.vuejs.org/)（原文此处有配图，未随迁移入库）：左边写代码，右边实时预览，右边还可以看到编译后的代码。

先分析实现思路。

### 编译：@babel/standalone

编译用的 [@babel/standalone](https://babeljs.io/docs/babel-standalone)（原文此处有配图，未随迁移入库），它是 babel 的浏览器版本，可以用它实时把 tsx 代码编译为 js。

试一下，创建项目：

```javascript
npx create-vite
```

进入项目安装 @babel/standalone 和它的 ts 类型：

```
npm install
npm i --save @babel/standalone
npm i --save-dev @types/babel__standalone
```

去掉 index.css 和 StrictMode（原文此处有配图，未随迁移入库），改下 App.tsx：

```javascript
import { useRef, useState } from 'react'
import { transform } from '@babel/standalone';

function App() {

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function onClick() {
    if(!textareaRef.current) {
      return ;
    }

    const res = transform(textareaRef.current.value, {
      presets: ['react', 'typescript'],
      filename: 'guang.tsx'
    });
    console.log(res.code);
  }

  const code = `import { useEffect, useState } from "react";

  function App() {
    const [num, setNum] = useState(() => {
      const num1 = 1 + 2;
      const num2 = 2 + 3;
      return num1 + num2
    });

    return (
      <div onClick={() => setNum((prevNum) => prevNum + 1)}>{num}</div>
    );
  }

  export default App;
  `
  return (
    <div>
      <textarea ref={textareaRef} style={{ width: '500px', height: '300px'}} defaultValue={code}></textarea>
      <button onClick={onClick}>编译</button>
    </div>
  )
}

export default App
```

在 textarea 输入内容，设置默认值 defaultValue，用 useRef 获取它的 value；点击编译按钮时拿到内容用 babel.transform 编译，指定 typescript 和 react 的 preset，打印 res.code。运行可以看到打印了编译后的代码（原文此处有配图，未随迁移入库）。

### 模块引入：blob url

编译后的代码还不能直接跑（原文此处有配图，未随迁移入库），主要是 import 语句这里（原文此处有配图，未随迁移入库）——运行代码时会引入 import 的模块，这时会找不到。

当然，可以像 vite 的 dev server 那样做一个根据 moduleId 返回编译后模块内容的服务，但这里是纯前端项目，显然不适合。其实 import 的 url 可以用 blob url。

在 public 目录下添加 test.html：

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>

<script>
    const code1 =`
    function add(a, b) {
        return a + b;
    }
    export { add };
    `;

    const url = URL.createObjectURL(new Blob([code1], { type: 'application/javascript' }));
    const code2 = `import { add } from "${url}";

    console.log(add(2, 3));`;

    const script = document.createElement('script');
    script.type="module";
    script.textContent = code2;
    document.body.appendChild(script);
</script>
</body>
</html>
```

浏览器访问下（原文此处有配图，未随迁移入库），这里用的就是 blob url（原文此处有配图，未随迁移入库）。可以把一段 JS 代码，用 URL.createObjectURL 和 new Blob 的方式变为一个 url：

```javascript
URL.createObjectURL(new Blob([code], { type: 'application/javascript' }))
```

接下来的问题就简单了：左侧写的所有代码都是有文件名的，只需要根据文件名替换下 import 的 url。比如 App.tsx 引入了 ./Aaa.tsx：

```javascript
import Aaa from './Aaa.tsx';

export default function App() {
    return <Aaa></Aaa>
}
```

拿到 Aaa.tsx 的内容，然后通过 Blob 和 URL.createObjectURL 的方式把 Aaa.tsx 内容变为一个 blob url，替换 import 的路径就好了，这样就可以直接跑。

怎么替换呢？用 babel 插件。babel 编译流程分为 parse、transform、generate 三个阶段，babel 插件就是在 transform 的阶段增删改 AST 的（原文此处有配图，未随迁移入库）。通过 [astexplorer.net](https://astexplorer.net/#/gist/6f01ee950445813f623214fb2c7abba9/b45fffd5a735f829d15098efa4f860438c3a070e) 看下对应的 AST（原文此处有配图，未随迁移入库）：只要对 ImportDeclaration 的 AST 做处理，把 source.value 替换为对应文件的 blob url 就行了。

比如这样写：

```javascript
import { transform } from '@babel/standalone';
import type { PluginObj } from '@babel/core';

function App() {

    const code1 =`
    function add(a, b) {
        return a + b;
    }
    export { add };
    `;

    const url = URL.createObjectURL(new Blob([code1], { type: 'application/javascript' }));

    const transformImportSourcePlugin: PluginObj = {
        visitor: {
            ImportDeclaration(path) {
                path.node.source.value = url;
            }
        },
    }

  const code = `import { add } from './add.ts'; console.log(add(2, 3));`

  function onClick() {
    const res = transform(code, {
      presets: ['react', 'typescript'],
      filename: 'guang.ts',
      plugins: [transformImportSourcePlugin]
    });
    console.log(res.code);
  }

  return (
    <div>
      <button onClick={onClick}>编译</button>
    </div>
  )
}

export default App
```

这里插件的类型用到了 @babel/core 包的类型，安装下：

```
npm i --save-dev @types/babel__core
```

用 babel 插件的方式对 import 的 source 做了替换——把 ImportDeclaration 的 source 的值改为 blob url，这样浏览器里就能直接跑这段代码。

那如果是引入 react 和 react-dom 的包呢？这些不是在左侧写的代码，可以用 import maps 的机制（原文此处有配图，未随迁移入库）。在 public 下新建 test2.html：

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <script type="importmap">
        {
            "imports": {
                "react": "https://esm.sh/react@18.2.0"
            }
        }
    </script>
    <script type="module">
        import React from "react";

        console.log(React);
    </script>
</body>
</html>
```

访问下（原文此处有配图，未随迁移入库），可以看到 import react 生效了。为什么生效？访问 [返回的内容](https://esm.sh/react@18.2.0) 可以看到，它也是 import url 的方式（原文此处有配图，未随迁移入库）。这里的 [esm.sh](https://esm.sh) 就是专门提供 esm 模块的 CDN 服务（原文此处有配图，未随迁移入库），它们也做了一个 [react playground](https://code.esm.sh/)（原文此处有配图，未随迁移入库）。

这样，如何引入编辑器里写的 ./Aaa.tsx 这种模块、如何引入 react、react-dom 这种模块就都清楚了：分别用 Blob + URL.createObjectURL 和 import maps + esm.sh 来做。

### 编辑器与预览

编辑器部分用 @monaco-editor/react，安装下：

```
npm install @monaco-editor/react
```

试一下：

```javascript
import Editor from '@monaco-editor/react';

function App() {

    const code =`import { useEffect, useState } from "react";

function App() {
    const [num, setNum] = useState(() => {
        const num1 = 1 + 2;
        const num2 = 2 + 3;
        return num1 + num2
    });

    return (
        <div onClick={() => setNum((prevNum) => prevNum + 1)}>{num}</div>
    );
}

export default App;
`;

    return <Editor height="500px" defaultLanguage="javascript" defaultValue={code} />;
}

export default App;
```

Editor 有很多[参数](https://github.com/suren-atoyan/monaco-react?tab=readme-ov-file#editor)，用到的时候再展开看。

接下来看预览部分（原文此处有配图，未随迁移入库）：就是 iframe 加一个通信机制，把左边编辑器的内容编译之后传到 iframe 里渲染。

```javascript
import React from 'react'

import iframeRaw from './iframe.html?raw';

const iframeUrl = URL.createObjectURL(new Blob([iframeRaw], { type: 'text/html' }));

const Preview: React.FC = () => {

  return (
    <iframe
        src={iframeUrl}
        style={{
            width: '100%',
            height: '100%',
            padding: 0,
            border: 'none'
        }}
    />
  )
}

export default Preview;
```

iframe.html：

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Preview</title>
  <style>
    * {
      padding: 0;
      margin: 0;
    }
  </style>
</head>
<body>
<script type="importmap">
  {
    "imports": {
      "react": "https://esm.sh/react@18.2.0",
      "react-dom/client": "https://esm.sh/react-dom@18.2.0"
    }
  }
</script>
<script>

</script>
<script type="module">
  import React, {useState, useEffect} from 'react';
  import ReactDOM from 'react-dom/client';

  const App = () => {
    return React.createElement('div', null, 'aaa');
  };

  window.addEventListener('load', () => {
    const root = document.getElementById('root')
    ReactDOM.createRoot(root).render(React.createElement(App, null))
  })
</script>

<div id="root">
  <div style="position:absolute;top: 0;left:0;width:100%;height:100%;display: flex;justify-content: center;align-items: center;">
    Loading...
  </div>
</div>

</body>
</html>

```

路径后面加个 `?raw` 是通过字符串引入（webpack 和 vite 都有这种功能），用 URL.createObjectURL + Blob 生成 blob url 设置到 iframe 的 src 就好了（原文此处有配图，未随迁移入库），渲染没有问题（原文此处有配图，未随迁移入库）。这样，只需要在内容变了之后生成新的 blob url。

至此，从编辑器到编译到预览的流程就理清了。

案例代码见 [GitHub 仓库](https://github.com/QuarkGluonPlasma/react-course-code/tree/main/playground-test)。

### 思路分析小结

- 编辑器部分用 @monaco-editor/react 实现，用 @babel/standalone 在浏览器里编译。
- 编译过程中用自己写的 babel 插件实现 import 的 source 的修改，变为 URL.createObjectURL + Blob 生成的 blob url，把模块内容内联进去。
- react、react-dom 这种包，用 import maps 配合 [esm.sh](https://esm.sh/) 网站来引入。
- 用 iframe 预览生成的内容，url 同样是把内容内联到 src 里生成 blob url。

## 开发：布局与代码编辑器

思路理清后开始开发，先写编辑器部分。布局和 [vue playground](https://play.vuejs.org/#eNp9kUFLwzAUx7/KM5cqzBXR0+gGKgP1oKKCl1xG99ZlpklIXuag9Lv7krK5w9it7//7v/SXthP3zo23EcVEVKH2yhEEpOhm0qjWWU/QgccV9LDytoWCq4U00tTWBII2NDBN/LJ4Qq0tfFuvlxfFlTRVORzHB/FA2Dq9IOQJoFrfzLouL/d9VfKUU2VcJNhet3aJeioFcymgZFiVR/tiJCjw61eqGW+CNWzepX0pats6pdG/OVKsJ8UEMklswXa/LzkjH3G0z+s11j8n8k3YpUyKd48B/RalODBa+AZpwPPPV9zx8wGyfdTcPgM/MFgdk+NQe4hmydpHvWz7nL+/Ms1XmO8ITdhfKommZp/7UvA/eTxz9X/d2/Fd3pOmF/0fEx+nNQ==) 一样（原文此处有配图，未随迁移入库）：左边 Editor 右边 Preview，上面还有 Header。

创建项目：

```
npx create-vite
```

改下 main.tsx：

```javascript
import ReactDOM from 'react-dom/client'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(<App />)
```

新建 ReactPlayground/index.tsx：

```javascript
export default function ReactPlayground() {
    return <div>ReactPlayground</div>
}
```

在 App.tsx 引入下：

```javascript
import ReactPlayground from './ReactPlayground';

function App() {

  return (
    <ReactPlayground/>
  )
}

export default App

```

跑起来：

```
npm install

npm run dev
```

### allotment 布局

[vue playground](https://play.vuejs.org/#eNp9kUFLwzAUx7/KM5cqzBXR0+gGKgP1oKKCl1xG99ZlpklIXuag9Lv7krK5w9it7//7v/SXthP3zo23EcVEVKH2yhEEpOhm0qjWWU/QgccV9LDytoWCq4U00tTWBII2NDBN/LJ4Qq0tfFuvlxfFlTRVORzHB/FA2Dq9IOQJoFrfzLouL/d9VfKUU2VcJNhet3aJeioFcymgZFiVR/tiJCjw61eqGW+CNWzepX0pats6pdG/OVKsJ8UEMklswXa/LzkjH3G0z+s11j8n8k3YpUyKd48B/RalODBa+AZpwPPPV9zx8wGyfdTcPgM/MFgdk+NQe4hmydpHvWz7nL+/Ms1XmO8ITdhfKommZp/7UvA/eTxz9X/d2/Fd3pOmF/0fEx+nNQ==) 的布局是可以拖拽改变 editor 和 preview 部分的宽度的（原文此处有配图，未随迁移入库）。原理是 position 设置 absolute 然后拖动改变 width（原文此处有配图，未随迁移入库），但不用自己写，有三方组件可以用：[allotment](https://www.npmjs.com/package/allotment)（原文此处有配图，未随迁移入库）。

安装并使用：

```
npm install --save allotment
```

改下 ReactPlayground：

```javascript
import { Allotment } from "allotment";
import 'allotment/dist/style.css';

export default function ReactPlayground() {
    return <div style={{height: '100vh'}}>
        <Allotment defaultSizes={[100, 100]}>
            <Allotment.Pane minSize={500}>
                <div>
                    111
                </div>
            </Allotment.Pane>
            <Allotment.Pane minSize={0}>
                <div>
                    222
                </div>
            </Allotment.Pane>
        </Allotment>
    </div>
}
```

引入 Allotment 组件和样式。defaultSizes 指定 100、100，也就是按照 1:1 的比例展示；minSize 是最小宽度。

测试下（原文此处有配图，未随迁移入库）：最开始是 1:1，可以拖动改变大小，但是左边最小是 500px。

然后补上 Header、CodeEditor、Preview 这三个组件：

```javascript
import { Allotment } from "allotment";
import 'allotment/dist/style.css';
import Header from "./components/Header";
import CodeEditor from "./components/CodeEditor";
import Preview from "./components/Preview";

export default function ReactPlayground() {
    return <div style={{height: '100vh'}}>
        <Header/>
        <Allotment defaultSizes={[100, 100]}>
            <Allotment.Pane minSize={0}>
                <CodeEditor />
            </Allotment.Pane>
            <Allotment.Pane minSize={0}>
                <Preview />
            </Allotment.Pane>
        </Allotment>
    </div>
}
```

新建 ReactPlayground/components/CodeEditor/index.tsx：

```javascript
export default function CodeEditor() {
    return <div>CodeEditor</div>
}
```

ReactPlayground/components/Header/index.tsx：

```javascript
export default function Header() {
    return <div style={{borderBottom: '1px solid #000'}}>Header</div>
}
```

ReactPlayground/components/Preview/index.tsx：

```javascript
export default function Preview() {
    return <div>Preview</div>
}
```

现在是这样的（原文此处有配图，未随迁移入库），内容没有靠边，在 App.scss 里重置下样式：

```css
* {
  margin: 0;
  padding: 0;
}
```

安装 sass：

```
npm install -D sass
```

在 App.tsx 引入（原文此处有配图，未随迁移入库）。

### Header 组件

```javascript
import logoSvg from './icons/logo.svg';

export default function Header() {
  return (
    <div>
      <div>
        <img alt='logo' src={logoSvg}/>
        <span>React Playground</span>
      </div>
    </div>
  )
}
```

vite 内部做了处理，引入 .svg 会返回它的路径。加一下 icons/logo.svg：

```html
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" role="img" class="iconify iconify--logos" width="35.93" height="32" preserveAspectRatio="xMidYMid meet" viewBox="0 0 256 228"><path fill="#00D8FF" d="M210.483 73.824a171.49 171.49 0 0 0-8.24-2.597c.465-1.9.893-3.777 1.273-5.621c6.238-30.281 2.16-54.676-11.769-62.708c-13.355-7.7-35.196.329-57.254 19.526a171.23 171.23 0 0 0-6.375 5.848a155.866 155.866 0 0 0-4.241-3.917C100.759 3.829 77.587-4.822 63.673 3.233C50.33 10.957 46.379 33.89 51.995 62.588a170.974 170.974 0 0 0 1.892 8.48c-3.28.932-6.445 1.924-9.474 2.98C17.309 83.498 0 98.307 0 113.668c0 15.865 18.582 31.778 46.812 41.427a145.52 145.52 0 0 0 6.921 2.165a167.467 167.467 0 0 0-2.01 9.138c-5.354 28.2-1.173 50.591 12.134 58.266c13.744 7.926 36.812-.22 59.273-19.855a145.567 145.567 0 0 0 5.342-4.923a168.064 168.064 0 0 0 6.92 6.314c21.758 18.722 43.246 26.282 56.54 18.586c13.731-7.949 18.194-32.003 12.4-61.268a145.016 145.016 0 0 0-1.535-6.842c1.62-.48 3.21-.974 4.76-1.488c29.348-9.723 48.443-25.443 48.443-41.52c0-15.417-17.868-30.326-45.517-39.844Zm-6.365 70.984c-1.4.463-2.836.91-4.3 1.345c-3.24-10.257-7.612-21.163-12.963-32.432c5.106-11 9.31-21.767 12.459-31.957c2.619.758 5.16 1.557 7.61 2.4c23.69 8.156 38.14 20.213 38.14 29.504c0 9.896-15.606 22.743-40.946 31.14Zm-10.514 20.834c2.562 12.94 2.927 24.64 1.23 33.787c-1.524 8.219-4.59 13.698-8.382 15.893c-8.067 4.67-25.32-1.4-43.927-17.412a156.726 156.726 0 0 1-6.437-5.87c7.214-7.889 14.423-17.06 21.459-27.246c12.376-1.098 24.068-2.894 34.671-5.345a134.17 134.17 0 0 1 1.386 6.193ZM87.276 214.515c-7.882 2.783-14.16 2.863-17.955.675c-8.075-4.657-11.432-22.636-6.853-46.752a156.923 156.923 0 0 1 1.869-8.499c10.486 2.32 22.093 3.988 34.498 4.994c7.084 9.967 14.501 19.128 21.976 27.15a134.668 134.668 0 0 1-4.877 4.492c-9.933 8.682-19.886 14.842-28.658 17.94ZM50.35 144.747c-12.483-4.267-22.792-9.812-29.858-15.863c-6.35-5.437-9.555-10.836-9.555-15.216c0-9.322 13.897-21.212 37.076-29.293c2.813-.98 5.757-1.905 8.812-2.773c3.204 10.42 7.406 21.315 12.477 32.332c-5.137 11.18-9.399 22.249-12.634 32.792a134.718 134.718 0 0 1-6.318-1.979Zm12.378-84.26c-4.811-24.587-1.616-43.134 6.425-47.789c8.564-4.958 27.502 2.111 47.463 19.835a144.318 144.318 0 0 1 3.841 3.545c-7.438 7.987-14.787 17.08-21.808 26.988c-12.04 1.116-23.565 2.908-34.161 5.309a160.342 160.342 0 0 1-1.76-7.887Zm110.427 27.268a347.8 347.8 0 0 0-7.785-12.803c8.168 1.033 15.994 2.404 23.343 4.08c-2.206 7.072-4.956 14.465-8.193 22.045a381.151 381.151 0 0 0-7.365-13.322Zm-45.032-43.861c5.044 5.465 10.096 11.566 15.065 18.186a322.04 322.04 0 0 0-30.257-.006c4.974-6.559 10.069-12.652 15.192-18.18ZM82.802 87.83a323.167 323.167 0 0 0-7.227 13.238c-3.184-7.553-5.909-14.98-8.134-22.152c7.304-1.634 15.093-2.97 23.209-3.984a321.524 321.524 0 0 0-7.848 12.897Zm8.081 65.352c-8.385-.936-16.291-2.203-23.593-3.793c2.26-7.3 5.045-14.885 8.298-22.6a321.187 321.187 0 0 0 7.257 13.246c2.594 4.48 5.28 8.868 8.038 13.147Zm37.542 31.03c-5.184-5.592-10.354-11.779-15.403-18.433c4.902.192 9.899.29 14.978.29c5.218 0 10.376-.117 15.453-.343c-4.985 6.774-10.018 12.97-15.028 18.486Zm52.198-57.817c3.422 7.8 6.306 15.345 8.596 22.52c-7.422 1.694-15.436 3.058-23.88 4.071a382.417 382.417 0 0 0 7.859-13.026a347.403 347.403 0 0 0 7.425-13.565Zm-16.898 8.101a358.557 358.557 0 0 1-12.281 19.815a329.4 329.4 0 0 1-23.444.823c-7.967 0-15.716-.248-23.178-.732a310.202 310.202 0 0 1-12.513-19.846h.001a307.41 307.41 0 0 1-10.923-20.627a310.278 310.278 0 0 1 10.89-20.637l-.001.001a307.318 307.318 0 0 1 12.413-19.761c7.613-.576 15.42-.876 23.31-.876H128c7.926 0 15.743.303 23.354.883a329.357 329.357 0 0 1 12.335 19.695a358.489 358.489 0 0 1 11.036 20.54a329.472 329.472 0 0 1-11 20.722Zm22.56-122.124c8.572 4.944 11.906 24.881 6.52 51.026c-.344 1.668-.73 3.367-1.15 5.09c-10.622-2.452-22.155-4.275-34.23-5.408c-7.034-10.017-14.323-19.124-21.64-27.008a160.789 160.789 0 0 1 5.888-5.4c18.9-16.447 36.564-22.941 44.612-18.3ZM128 90.808c12.625 0 22.86 10.235 22.86 22.86s-10.235 22.86-22.86 22.86s-22.86-10.235-22.86-22.86s10.235-22.86 22.86-22.86Z"></path></svg>
```

写下样式 index.module.scss：

```scss
.header {
    height: 50px;
    padding: 0 20px;
    box-sizing: border-box;
    border-bottom: 1px solid #000;

    display: flex;
    align-items: center;
    justify-content: space-between;

    .logo {
      display: flex;
      font-size: 20px;
      align-items: center;

      img {
        height: 24px;
        margin-right: 10px;
      }
    }
}
```

然后在 Header 组件里引入，用 css modules 的方式：

```javascript
import styles from './index.module.scss'

import logoSvg from './icons/logo.svg';

export default function Header() {
  return (
    <div className={styles.header}>
      <div className={styles.logo}>
        <img alt='logo' src={logoSvg}/>
        <span>React Playground</span>
      </div>
    </div>
  )
}
```

看下效果（原文此处有配图，未随迁移入库）没有问题。

### CodeEditor 编辑器组件

接下来写 CodeEditor 部分：

```javascript
import Editor from "./Editor";
import FileNameList from "./FileNameList";

export default function CodeEditor() {

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <FileNameList/>
        <Editor/>
    </div>
  )
}
```

设置高度 100%，flex 布局方向为 column。这部分可以细分为 FileNameList 和 Editor 两个组件（原文此处有配图，未随迁移入库）。

创建 ./Editor/index.tsx：

```javascript
export default function Editor() {
    return <div>editor</div>
}
```

./FileNameList/index.tsx：

```javascript
export default function FileNameList() {
    return <div>FileNameList</div>
}
```

先写 Editor 组件（原文此处有配图，未随迁移入库），引入 monaco editor：

```
npm install --save @monaco-editor/react
```

调用：

```javascript
import MonacoEditor from '@monaco-editor/react'

export default function Editor() {

    const code = `export default function App() {
    return <div>xxx</div>
}
    `;

    return <MonacoEditor
        height='100%'
        path={'guang.tsx'}
        language={"typescript"}
        value={code}
    />
}
```

看下效果（原文此处有配图，未随迁移入库）：代码渲染没问题，但是提示 jsx 不知道怎么处理，这是 tsconfig.json 配置的问题。改编辑器的 tsconfig：

```javascript
import MonacoEditor, { OnMount } from '@monaco-editor/react'

export default function Editor() {

    const code = `export default function App() {
    return <div>xxx</div>
}
    `;

    const handleEditorMount: OnMount = (editor, monaco) => {
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            jsx: monaco.languages.typescript.JsxEmit.Preserve,
            esModuleInterop: true,
        })
    }

    return <MonacoEditor
        height='100%'
        path={'guang.tsx'}
        language={"typescript"}
        onMount={handleEditorMount}
        value={code}
    />
}
```

onMount（编辑器加载完的回调）里设置 ts 的默认 compilerOptions：这里设置 jsx 为 preserve，也就是输入 \<div> 输出 \<div>，保留原样；如果设置为 react 会输出 React.createElement("div")。再就是 esModuleInterop，这也是 ts 常用配置——默认 fs 要这么引入，因为它是 commonjs 的包没有 default 属性：

```javascript
import * as fs from 'fs';
```

设置 esModuleInterop 会在编译的时候自动加上 default 属性，就可以这样引入了：

```javascript
import fs from 'fs';
```

再看下（原文此处有配图，未随迁移入库），错误消失了。

还可以添加快捷键的交互（原文此处有配图，未随迁移入库）：默认 cmd（windows 下是 ctrl）+ j 没有处理，可以让 cmd + j 的时候格式化代码：

```javascript
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ, () => {
    editor.getAction('editor.action.formatDocument')?.run()
});
```

试下效果（原文此处有配图，未随迁移入库）。monaco editor 还有哪些 action？打印下就知道了：

```javascript
editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ, () => {
    // editor.getAction('editor.action.formatDocument')?.run()
    let actions = editor.getSupportedActions().map((a) => a.id);
    console.log(actions);
});
```

有 131 个（原文此处有配图，未随迁移入库），用到再搜。

现在还一个比较大的问题（原文此处有配图，未随迁移入库）：缩略图用不到，而且没多少内容就出现滚动条了，滚动条宽度大了点。这些都可以通过修改 options 来解决：

```javascript
return <MonacoEditor
    height={'100%'}
    path={'guang.tsx'}
    language={"typescript"}
    onMount={handleEditorMount}
    value={code}
    options={
        {
            fontSize: 14,
            scrollBeyondLastLine: false,
            minimap: {
              enabled: false,
            },
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
        }
    }
/>
```

scrollBeyondLastLine 是到了最后一行之后依然可以滚动一屏，关闭后就不会了；minimap 就是缩略图，关掉就没了；scrollbar 是设置横向纵向滚动条宽度的。设置都生效了。

还有一个问题（原文此处有配图，未随迁移入库）：现在引入第三方包是没有提示的。用 @typescript/ata 这个包来支持（原文此处有配图，未随迁移入库）。ata 是 automatic type acquisition（自动类型获取）：它可以传入源码，自动分析出需要的 ts 类型包，然后自动下载。

新建 ./Editor/ata.ts，复制文档里的示例代码：

```javascript
import { setupTypeAcquisition } from '@typescript/ata'
import typescript from 'typescript';

export function createATA(onDownloadFile: (code: string, path: string) => void) {
  const ata = setupTypeAcquisition({
    projectName: 'my-ata',
    typescript: typescript,
    logger: console,
    delegate: {
      receivedFile: (code, path) => {
        console.log('自动下载的包', path);
        onDownloadFile(code, path);
      }
    },
  })

  return ata;
}
```

安装用到的包：

```
npm install --save @typescript/ata -f
```

这里用 ts 包去分析代码然后自动下载用到的类型包，receivedFile 回调函数里可以拿到下载的代码和路径。在 mount 的时候调用下：

```javascript
const ata = createATA((code, path) => {
    monaco.languages.typescript.typescriptDefaults.addExtraLib(code, `file://${path}`)
})

editor.onDidChangeModelContent(() => {
    ata(editor.getValue());
});

ata(editor.getValue());
```

最开始获取一次类型，内容改变之后再获取一次类型，获取到之后用 addExtraLib 添加到 ts 里。看下效果（原文此处有配图，未随迁移入库），有类型了。

最后把写死的部分抽离成 Editor 组件的参数：把文件的信息封装到 file 里，加上 onChange 的回调，支持传入编辑器的 options。

```javascript
import MonacoEditor, { OnMount, EditorProps } from '@monaco-editor/react'
import { createATA } from './ata';
import { editor } from 'monaco-editor'

export interface EditorFile {
    name: string
    value: string
    language: string
}

interface Props {
    file: EditorFile
    onChange?: EditorProps['onChange'],
    options?: editor.IStandaloneEditorConstructionOptions
}

export default function Editor(props: Props) {

    const {
        file,
        onChange,
        options
    } = props;

    const handleEditorMount: OnMount = (editor, monaco) => {

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyJ, () => {
            editor.getAction('editor.action.formatDocument')?.run()
            // let actions = editor.getSupportedActions().map((a) => a.id);
            // console.log(actions);
        });

        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            jsx: monaco.languages.typescript.JsxEmit.Preserve,
            esModuleInterop: true,
        })

        const ata = createATA((code, path) => {
            monaco.languages.typescript.typescriptDefaults.addExtraLib(code, `file://${path}`)
        })

        editor.onDidChangeModelContent(() => {
            ata(editor.getValue());
        });

        ata(editor.getValue());
    }

    return <MonacoEditor
        height={'100%'}
        path={file.name}
        language={file.language}
        onMount={handleEditorMount}
        onChange={onChange}
        value={file.value}
        options={
            {
                fontSize: 14,
                scrollBeyondLastLine: false,
                minimap: {
                  enabled: false,
                },
                scrollbar: {
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6,
                },
                ...options
            }
        }
    />
}
```

在 CodeEditor 里加上参数测试下：

```javascript
import Editor from "./Editor";
import FileNameList from "./FileNameList";

export default function CodeEditor() {

    const file = {
        name: 'guang.tsx',
        value: 'import lodash from "lodash";\n\nconst a = <div>guang</div>',
        language: 'typescript'
    }

    function onEditorChange() {
        console.log(...arguments);
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <FileNameList/>
            <Editor file={file} onChange={onEditorChange}/>
        </div>
    )
}
```

没有问题。onChange 可以拿到 content 和变化事件，里面包含具体改变的内容。代码编辑器部分就完成了。

案例代码见 [GitHub 仓库](https://github.com/QuarkGluonPlasma/react-course-code/tree/main/react-playground-project)，可以切换到这个 commit 查看：

```
git reset --hard 0aebeab1826edf35fefa1b4a6d5b9f44c4aa970f
```

### 布局与编辑器小结

- 布局用 allotment 实现了 split-pane，两边可以通过拖动改变大小。
- 集成 @monaco-editor/react 实现编辑器：onMount 时添加 cmd + j 的快捷键做格式化，并设置了 ts 的 compilerOptions。
- 用 @typescript/ata 包实现了代码改变时自动下载 dts 类型包的功能，编辑器里写代码就有 ts 类型提示了。

## 开发：多文件切换

本节做多文件的切换（原文此处有配图，未随迁移入库）：点击上面的 tab 可以切换当前选中的文件，下面展示对应文件的内容。

上面的 FileNameList 组件、下面的 Editor 组件，还有右边的 Preview 组件都需要拿到所有文件的信息（原文此处有配图，未随迁移入库）。跨多个组件共享同一份数据，很明显要用 Context。

### PlaygroundContext

创建 PlaygroundContext.tsx：

```javascript
import React, { createContext, useState } from 'react'

export interface File {
  name: string
  value: string
  language: string
}

export interface Files {
  [key: string]: File
}

export interface PlaygroundContext {
  files: Files
  selectedFileName: string
  setSelectedFileName: (fileName: string) => void
  setFiles: (files: Files) => void
  addFile: (fileName: string) => void
  removeFile: (fileName: string) => void
  updateFileName: (oldFieldName: string, newFieldName: string) => void
}

export const PlaygroundContext = createContext<PlaygroundContext>({
  selectedFileName: 'App.tsx',
} as PlaygroundContext)
```

context 里保存了 files 的信息和当前选中的文件 selectedFileName（原文此处有配图，未随迁移入库）。files 里以键值对方式保存文件信息：键是文件名，值是文件的信息（name、value、language）。context 里除了 files 和 selectedFileName 外，还有修改它们的 setXxx 方法，以及 addFile、removeFile、updateFileName 方法（增删改文件的时候用）。

然后提供一个 PlaygroundProvider 组件（原文此处有配图，未随迁移入库）：它是对 Context.Provider 的封装，注入了这些增删改文件的方法的实现。

```javascript
export const PlaygroundProvider = (props: PropsWithChildren) => {
  const { children } = props
  const [files, setFiles] = useState<Files>({})
  const [selectedFileName, setSelectedFileName] = useState('App.tsx');

  const addFile = (name: string) => {
    files[name] = {
      name,
      language: fileName2Language(name),
      value: '',
    }
    setFiles({ ...files })
  }

  const removeFile = (name: string) => {
    delete files[name]
    setFiles({ ...files })
  }

  const updateFileName = (oldFieldName: string, newFieldName: string) => {
    if (!files[oldFieldName] || newFieldName === undefined || newFieldName === null) return
    const { [oldFieldName]: value, ...rest } = files
    const newFile = {
      [newFieldName]: {
        ...value,
        language: fileName2Language(newFieldName),
        name: newFieldName,
      },
    }
    setFiles({
      ...rest,
      ...newFile,
    })
  }

  return (
    <PlaygroundContext.Provider
      value={{
        files,
        selectedFileName,
        setSelectedFileName,
        setFiles,
        addFile,
        removeFile,
        updateFileName,
      }}
    >
      {children}
    </PlaygroundContext.Provider>
  )
}
```

addFile、removeFile、updateFileName 的实现都比较容易看懂，就是修改 files 的内容。用到的 fileName2Language 在 utils.ts 里：

```javascript
export const fileName2Language = (name: string) => {
    const suffix = name.split('.').pop() || ''
    if (['js', 'jsx'].includes(suffix)) return 'javascript'
    if (['ts', 'tsx'].includes(suffix)) return 'typescript'
    if (['json'].includes(suffix)) return 'json'
    if (['css'].includes(suffix)) return 'css'
    return 'javascript'
}
```

根据不同的后缀名返回 language，monaco editor 会用到，用于不同语法的高亮（原文此处有配图，未随迁移入库）。

然后在 App.tsx 里包一层 Provider（原文此处有配图，未随迁移入库），这样就可以在任意组件用 useContext 读取 context 的值了。

在 FileNameList 里读取下：

```javascript
import { useContext } from "react"
import { PlaygroundContext } from "../../../PlaygroundContext"

export default function FileNameList() {
    const {
        files,
        removeFile,
        addFile,
        updateFileName,
        selectedFileName
    } = useContext(PlaygroundContext)

    return <div>FileNameList</div>
}
```

渲染下 tab：

```javascript
import { useContext, useEffect, useState } from "react"
import { PlaygroundContext } from "../../../PlaygroundContext"

export default function FileNameList() {
    const {
        files,
        removeFile,
        addFile,
        updateFileName,
        selectedFileName
    } = useContext(PlaygroundContext)

    const [tabs, setTabs] = useState([''])

    useEffect(() => {
        setTabs(Object.keys(files))
    }, [files])

    return <div>
        {
            tabs.map((item, index) => (
                <div>{item}</div>
            ))
        }
    </div>
}
```

用 useContext 读取 context 中的 files 用来渲染 tab。现在 context 里的 files 没有内容，初始化下数据：在 src/ReactPlayground 目录下创建个 files.ts。

```javascript
import { Files } from './PlaygroundContext'
import importMap from './template/import-map.json?raw'
import AppCss from './template/App.css?raw'
import App from './template/App.tsx?raw'
import main from './template/main.tsx?raw'
import { fileName2Language } from './utils'

// app 文件名
export const APP_COMPONENT_FILE_NAME = 'App.tsx'
// esm 模块映射文件名
export const IMPORT_MAP_FILE_NAME = 'import-map.json'
// app 入口文件名
export const ENTRY_FILE_NAME = 'main.tsx'

export const initFiles: Files = {
  [ENTRY_FILE_NAME]: {
    name: ENTRY_FILE_NAME,
    language: fileName2Language(ENTRY_FILE_NAME),
    value: main,
  },
  [APP_COMPONENT_FILE_NAME]: {
    name: APP_COMPONENT_FILE_NAME,
    language: fileName2Language(APP_COMPONENT_FILE_NAME),
    value: App,
  },
  'App.css': {
    name: 'App.css',
    language: 'css',
    value: AppCss,
  },
  [IMPORT_MAP_FILE_NAME]: {
    name: IMPORT_MAP_FILE_NAME,
    language: fileName2Language(IMPORT_MAP_FILE_NAME),
    value: importMap,
  },
}
```

导出的 initFiles 包含 App.tsx、main.tsx、App.css、import-map.json 这几个文件；import 模块的时候加一个 ?raw，就是直接以文本方式引入模块内容。在 template 目录下添加这四个文件（原文此处有配图，未随迁移入库）。

App.tsx：

```javascript
import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>Hello World</h1>
      <div className='card'>
        <button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
      </div>
    </>
  )
}

export default App
```

App.css：

```css
:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-weight: 400;
  line-height: 1.5;
  color: rgb(255 255 255 / 87%);
  text-rendering: optimizelegibility;
  text-size-adjust: 100%;
  background-color: #242424;
  color-scheme: light dark;
  font-synthesis: none;
}

#root {
  max-width: 1280px;
  padding: 2rem;
  margin: 0 auto;
  text-align: center;
}

body {
  display: flex;
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  place-items: center;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

button {
  padding: 0.6em 1.2em;
  font-family: inherit;
  font-size: 1em;
  font-weight: 500;
  cursor: pointer;
  background-color: #1a1a1a;
  border: 1px solid transparent;
  border-radius: 8px;
  transition: border-color 0.25s;
}

button:hover {
  border-color: #646cff;
}

button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background-color: #fff;
  }

  button {
    background-color: #f9f9f9;
  }
}
```

main.tsx：

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

import-map.json：

```json
{
  "imports": {
    "react": "https://esm.sh/react@18.2.0",
    "react-dom/client": "https://esm.sh/react-dom@18.2.0"
  }
}
```

然后在 Provider 里初始化 files（原文此处有配图，未随迁移入库）。看下效果（原文此处有配图，未随迁移入库）：上面的 tab 展示出来了，下面的 editor 还没有展示对应的文件内容。改一下：

```javascript
const {
    files,
    setFiles,
    selectedFileName,
    setSelectedFileName
} = useContext(PlaygroundContext)

const file = files[selectedFileName];
```

换成从 context 读取的当前选中的 file 就好。然后点击文件名的时候做下 selectedFileName 的切换（原文此处有配图，未随迁移入库）：现在点击 tab 就会切换编辑的文件，并且语法高亮也是对的。

### FileNameItem 样式细化

接下来完善下样式，单独抽个 FileNameItem 组件：

```javascript
import classnames from 'classnames'
import React, { useState, useRef, useEffect } from 'react'

import styles from './index.module.scss'

export interface FileNameItemProps {
    value: string
    actived: boolean
    onClick: () => void
}

export const FileNameItem: React.FC<FileNameItemProps> = (props) => {
  const {
    value,
    actived = false,
    onClick,
  } = props

  const [name, setName] = useState(value)

  return (
    <div
      className={classnames(styles['tab-item'], actived ? styles.actived : null)}
      onClick={onClick}
    >
        <span>{name}</span>
    </div>
  )
}
```

传入 value、actived、onClick 参数；actived（选中的）加上 actived 的 className。安装用到的包：

```
npm install --save classnames
```

这里用了 css modules 来做 css 模块化。写下 index.module.scss：

```css
.tabs {
    display: flex;
    align-items: center;

    height: 38px;
    overflow-x: auto;
    overflow-y: hidden;
    border-bottom: 1px solid #ddd;
    box-sizing: border-box;

    color: #444;
    background-color: #fff;

    .tab-item {
        display: inline-flex;
        padding: 8px 10px 6px;
        font-size: 13px;
        line-height: 20px;
        cursor: pointer;
        align-items: center;
        border-bottom: 3px solid transparent;

        &.actived {
            color: skyblue;
            border-bottom: 3px solid skyblue;
        }

        &:first-child {
            cursor: text;
        }
    }
}
```

写下整体 .tabs 的样式、.tab-item 的样式：用 flex 布局，设置 tab-item 的 padding；tab-item 可能很多，overflow-x 设置为 auto，也就是会有滚动条。

在 CodeEditor 里引入 FileNameItem 组件并加上 tabs 的 className：

```javascript
import { useContext, useEffect, useState } from "react"
import { PlaygroundContext } from "../../../PlaygroundContext"

import { FileNameItem } from "./FileNameItem"
import styles from './index.module.scss'

export default function FileNameList() {
    const {
        files,
        removeFile,
        addFile,
        updateFileName,
        selectedFileName,
        setSelectedFileName
    } = useContext(PlaygroundContext)

    const [tabs, setTabs] = useState([''])

    useEffect(() => {
        setTabs(Object.keys(files))
    }, [files])

    return <div className={styles.tabs}>
        {
            tabs.map((item, index) => (
                <FileNameItem
                    key={item + index}
                    value={item}
                    actived={selectedFileName === item}
                    onClick={() => setSelectedFileName(item)}>
                </FileNameItem>
            ))
        }
    </div>
}
```

selectedFileName 对应的 item 的 actived 为 true。看下效果（原文此处有配图，未随迁移入库），好看多了。

在 initFiles 里多加点文件测试下滚动条（原文此处有配图，未随迁移入库）：确实有滚动条，就是有点丑，改下滚动条样式：

```css
&::-webkit-scrollbar {
    height: 1px;
}

&::-webkit-scrollbar-track {
    background-color: #ddd;
}

&::-webkit-scrollbar-thumb {
    background-color: #ddd;
}
```

现在滚动条就不明显了。

现在编辑时并没有修改 context 的 files 内容，切换 tab 又会变回去（原文此处有配图，未随迁移入库）。在编辑器内容改变的时候修改下 files：

```javascript
function onEditorChange(value?: string) {
    files[file.name].value = value!
    setFiles({ ...files })
}
```

没有问题。不过编辑是频繁触发的事件，最好加一下防抖：

```
npm install --save lodash-es
npm install --save-dev @types/lodash-es
```

安装 lodash 然后调用 debounce（原文此处有配图，未随迁移入库），性能好一点。

案例代码见 [GitHub 仓库](https://github.com/QuarkGluonPlasma/react-course-code/tree/main/react-playground-project)，可以切换到这个 commit 查看：

```
git reset --hard 4621920c63b265b1c69865adbaabbba7babe66da
```

### 多文件切换小结

- 在 Context 中保存全局数据（files、selectedFileName）和对应的增删改方法；对 Context.Provider 封装一层来注入初始化数据和方法，提供 initFiles 信息。
- 在 FileNameList 里读取 context 里的 files 来渲染文件列表。
- 点击 tab 时切换 selectedFileName，从而切换编辑器的内容。

多文件的切换和编辑就完成了。

## 开发：编译与 iframe 预览

多文件的切换、文件内容编辑都已实现，左边部分告一段落。本节开始写右边部分：文件的编译和 iframe 预览。

### babel 编译

编译用 @babel/standalone 这个包，安装下：

```
npm install --save @babel/standalone

npm install --save-dev @types/babel__standalone
```

在 Preview 目录下新建 compiler.ts：

```javascript
import { transform } from '@babel/standalone'
import { Files } from '../../PlaygroundContext'
import { ENTRY_FILE_NAME } from '../../files'

export const babelTransform = (filename: string, code: string, files: Files) => {
  let result = ''
  try {
    result = transform(code, {
      presets: ['react', 'typescript'],
      filename,
      plugins: [],
      retainLines: true
    }).code!
  } catch (e) {
    console.error('编译出错', e);
  }
  return result
}

export const compile = (files: Files) => {
  const main = files[ENTRY_FILE_NAME]
  return babelTransform(ENTRY_FILE_NAME, main.value, files)
}
```

调用 babel 的 transform 方法进行编译：presets 指定 react 和 typescript，即对 jsx 和 ts 语法做处理；retainLines 是编译后保持原有行列号不变。在 compile 方法里对 main.tsx 的内容做编译，返回编译后的代码。

在 Preview 组件里调用下：

```javascript
import { useContext, useEffect, useState } from "react"
import { PlaygroundContext } from "../../PlaygroundContext"
import Editor from "../CodeEditor/Editor";
import { compile } from "./compiler";

export default function Preview() {

    const { files} = useContext(PlaygroundContext)
    const [compiledCode, setCompiledCode] = useState('')

    useEffect(() => {
        const res = compile(files);
        setCompiledCode(res);
    }, [files]);

    return <div style={{height: '100%'}}>
        <Editor file={{
            name: 'dist.js',
            value: compiledCode,
            language: 'javascript'
        }}/>
    </div>
}
```

在 files 变化时对 main.tsx 内容做编译，然后展示编译后的代码。看下效果（原文此处有配图，未随迁移入库）：右边展示了编译后的代码，左边编辑的时候右边会实时展示编译的结果。

### babel 插件处理模块引入

编译后的代码不能直接放到 iframe 里跑：只编译了 main.tsx，它引入的模块没有做处理。前面讲过可以通过 babel 插件来处理 import 语句，转换成 blob url 的方式。写下这个插件：

```javascript
function customResolver(files: Files): PluginObj {
    return {
      visitor: {
        ImportDeclaration(path) {
           path.node.source.value = '23333';
        },
      },
    }
}
```

babel 的编译流程分为 parse、transform、generate 三个阶段（原文此处有配图，未随迁移入库）。通过 [astexplorer.net](https://astexplorer.net/#/gist/6f01ee950445813f623214fb2c7abba9/b45fffd5a735f829d15098efa4f860438c3a070e) 看下对应的 AST（原文此处有配图，未随迁移入库）：要改的就是 ImportDeclaration 节点的 source.value 的内容。可以看到确实被替换了，那替换成什么就由具体实现决定。

分别对 css、json、tsx、ts 等后缀名的 import 做替换（原文此处有配图，未随迁移入库）：

- 首先对路径做处理，比如 ./App.css 这种路径提取出 App.css 部分。万一输入的是 ./App 这种路径，也要能查找到对应的 App.tsx 模块（原文此处有配图，未随迁移入库）：如果去掉 ./ 之后剩下的不包含 .，就要补全 App 为 App.tsx 等。过滤 files 里的 js、jsx、ts、tsx 文件，如果包含这个名字的模块，就按照补全后的模块名来查找 file。
- 之后把 file.value（文件内容）转成对应的 blob url（原文此处有配图，未随迁移入库）。ts 文件的处理就是用 babel 编译下，然后用 URL.createObjectURL 把编译后的文件内容作为 url。
- css 和 json 文件要再做一下处理（原文此处有配图，未随迁移入库）：json 文件比较简单，把 export 一下这个 json 然后作为 blob url 即可（原文此处有配图，未随迁移入库）；css 文件则是要通过 js 代码把它添加到 head 里的 style 标签里（原文此处有配图，未随迁移入库）。

全部代码如下：

```javascript
import { transform } from '@babel/standalone'
import { File, Files } from '../../PlaygroundContext'
import { ENTRY_FILE_NAME } from '../../files'
import { PluginObj } from '@babel/core';

export const babelTransform = (filename: string, code: string, files: Files) => {
  let result = ''
  try {
    result = transform(code, {
      presets: ['react', 'typescript'],
      filename,
      plugins: [customResolver(files)],
      retainLines: true
    }).code!
  } catch (e) {
    console.error('编译出错', e);
  }
  return result
}

const getModuleFile = (files: Files, modulePath: string) => {
    let moduleName = modulePath.split('./').pop() || ''
    if (!moduleName.includes('.')) {
        const realModuleName = Object.keys(files).filter(key => {
            return key.endsWith('.ts')
                || key.endsWith('.tsx')
                || key.endsWith('.js')
                || key.endsWith('.jsx')
        }).find((key) => {
            return key.split('.').includes(moduleName)
        })
        if (realModuleName) {
            moduleName = realModuleName
        }
      }
    return files[moduleName]
}

const json2Js = (file: File) => {
    const js = `export default ${file.value}`
    return URL.createObjectURL(new Blob([js], { type: 'application/javascript' }))
}

const css2Js = (file: File) => {
    const randomId = new Date().getTime()
    const js = `
(() => {
    const stylesheet = document.createElement('style')
    stylesheet.setAttribute('id', 'style_${randomId}_${file.name}')
    document.head.appendChild(stylesheet)

    const styles = document.createTextNode(\`${file.value}\`)
    stylesheet.innerHTML = ''
    stylesheet.appendChild(styles)
})()
    `
    return URL.createObjectURL(new Blob([js], { type: 'application/javascript' }))
}

function customResolver(files: Files): PluginObj {
    return {
        visitor: {
            ImportDeclaration(path) {
                const modulePath = path.node.source.value
                if(modulePath.startsWith('.')) {
                    const file = getModuleFile(files, modulePath)
                    if(!file)
                        return

                    if (file.name.endsWith('.css')) {
                        path.node.source.value = css2Js(file)
                    } else if (file.name.endsWith('.json')) {
                        path.node.source.value = json2Js(file)
                    } else {
                        path.node.source.value = URL.createObjectURL(
                            new Blob([babelTransform(file.name, file.value, files)], {
                                type: 'application/javascript',
                            })
                        )
                    }
                }
            }
        }
    }
}

export const compile = (files: Files) => {
  const main = files[ENTRY_FILE_NAME]
  return babelTransform(ENTRY_FILE_NAME, main.value, files)
}
```

看下效果（原文此处有配图，未随迁移入库）：./App 的模块内容编译之后变为了 blob url。引入 ./App.css 试下（原文此处有配图，未随迁移入库），css 模块也变为了 blob url。

在 devtools 里 fetch 下 blob url 可以看到它的内容：

```javascript
fetch("blob:http://localhost:5173/xxxx")
  .then(response => response.text())
  .then(text => {
    console.log(text);
  });
```

./App.tsx 的内容是 babel 编译过后的，./App.css 的内容也是转换后的结果。而上面的 react、react-dom/client 的包是通过 import maps 引入（原文此处有配图，未随迁移入库）。

其实还有一个问题要处理（原文此处有配图，未随迁移入库）：App.tsx 的 jsx 内容编译后变成了 React.createElement，但并没有引入 React，运行会报错。处理下（原文此处有配图，未随迁移入库）：babel 编译之前，判断下文件内容有没有 import React，没有就 import 一下：

```javascript
export const beforeTransformCode = (filename: string, code: string) => {
    let _code = code
    const regexReact = /import\s+React/g
    if ((filename.endsWith('.jsx') || filename.endsWith('.tsx')) && !regexReact.test(code)) {
      _code = `import React from 'react';\n${code}`
    }
    return _code
}

export const babelTransform = (filename: string, code: string, files: Files) => {
    let _code = beforeTransformCode(filename, code);
    let result = ''
    try {
        result = transform(_code, {
        presets: ['react', 'typescript'],
        filename,
        plugins: [customResolver(files)],
        retainLines: true
        }).code!
    } catch (e) {
        console.error('编译出错', e);
    }
    return result
}

```

现在，如果没引入 React 就会自动引入（原文此处有配图，未随迁移入库）。

至此，main.tsx 的所有依赖都引入了：

- react、react-dom/client 的包通过 import maps 引入。
- ./App.tsx、./App.css 或者 xx.json 之类的依赖通过 blob url 引入。

编译过后的代码可以直接在浏览器里跑了（原文此处有配图，未随迁移入库）。

### iframe 预览

加个 iframe 来跑下（原文此处有配图，未随迁移入库）：加一个 iframe 标签，src url 同样用 blob url 的方式。

用 ?raw 的 import 引入 iframe.html 的文件内容：

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Preview</title>
</head>
<body>
<script type="importmap"></script>
<script type="module" id="appSrc"></script>
<div id="root"></div>
</body>
</html>
```

替换其中的 import maps 和 src 的内容，之后创建 blob url 设置到 iframe 的 src；当 import maps 的内容或者 compiledCode 的内容变化时，重新生成 blob url。

```javascript
import { useContext, useEffect, useState } from "react"
import { PlaygroundContext } from "../../PlaygroundContext"
import Editor from "../CodeEditor/Editor";
import { compile } from "./compiler";
import iframeRaw from './iframe.html?raw'
import { IMPORT_MAP_FILE_NAME } from "../../files";

export default function Preview() {

    const { files} = useContext(PlaygroundContext)
    const [compiledCode, setCompiledCode] = useState('')
    const [iframeUrl, setIframeUrl] = useState(getIframeUrl());

    useEffect(() => {
        const res = compile(files);
        setCompiledCode(res);
    }, [files]);

    const getIframeUrl = () => {
        const res = iframeRaw.replace(
            '<script type="importmap"></script>',
            `<script type="importmap">${
                files[IMPORT_MAP_FILE_NAME].value
            }</script>`
        ).replace(
            '<script type="module" id="appSrc"></script>',
            `<script type="module" id="appSrc">${compiledCode}</script>`,
        )
        return URL.createObjectURL(new Blob([res], { type: 'text/html' }))
    }

    useEffect(() => {
        setIframeUrl(getIframeUrl())
    }, [files[IMPORT_MAP_FILE_NAME].value, compiledCode]);

    return <div style={{height: '100%'}}>
        <iframe
            src={iframeUrl}
            style={{
                width: '100%',
                height: '100%',
                padding: 0,
                border: 'none',
            }}
        />
        {/* <Editor file={{
            name: 'dist.js',
            value: compiledCode,
            language: 'javascript'
        }}/> */}
    </div>
}
```

看下效果（原文此处有配图，未随迁移入库）。看下 iframe 的内容（原文此处有配图，未随迁移入库），没有问题，预览功能完成。

案例代码见 [GitHub 仓库](https://github.com/QuarkGluonPlasma/react-course-code/tree/main/react-playground-project)，可以切换到这个 commit 查看：

```
git reset --hard a02195cfa12948e969bb9dc9cf01cdbe79331ab4
```

### 编译与预览小结

- 使用 @babel/standalone 做 tsx 代码的编译；编译过程中对 .tsx、.css、.json 等模块的 import 做处理，变成 blob url 的方式：tsx 模块直接用 babel 编译，css 模块包一层代码加到 head 的 style 标签里，json 包一层代码直接 export。
- react、react-dom/client 这种，用浏览器的 import maps 来引入。
- 把 iframe.html 的内容替换 import maps 和 src 部分后，同样用 blob url 设置为 iframe 的 src。

这样就实现了浏览器里的编译和预览。

## 开发：文件增删改

多个文件的编辑、编译、预览已经实现，整体流程跑通了。本节实现文件的新增、删除、文件名修改（原文此处有配图，未随迁移入库）。

### 文件重命名

改下 FileNameItem（原文此处有配图，未随迁移入库）：创建一个 editing 的 state 记录编辑状态，用 ref 保存 input 的引用。双击文件名时切换到编辑状态并聚焦输入框。

```javascript
import classnames from 'classnames'
import React, { useState, useRef, useEffect } from 'react'

import styles from './index.module.scss'

export interface FileNameItemProps {
    value: string
    actived: boolean
    onClick: () => void
}

export const FileNameItem: React.FC<FileNameItemProps> = (props) => {
  const {
    value,
    actived = false,
    onClick,
  } = props

  const [name, setName] = useState(value);
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDoubleClick = () => {
    setEditing(true)
    setTimeout(() => {
      inputRef?.current?.focus()
    }, 0)
  }

  return (
    <div
      className={classnames(styles['tab-item'], actived ? styles.actived : null)}
      onClick={onClick}
    >
        {
            editing ? (
                <input
                    ref={inputRef}
                    className={styles['tabs-item-input']}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            ) : (
                <span onDoubleClick={handleDoubleClick}>{name}</span>
            )
        }
    </div>
  )
}
```

试下效果（原文此处有配图，未随迁移入库）。然后 blur 的时候切换为非编辑状态：

```javascript
const hanldeInputBlur = () => {
    setEditing(false);
}
```

当然，这里应该去修改 files 里的文件名。在 FileNameList 组件里做这个，加一个回调函数（原文此处有配图，未随迁移入库），然后在 FileNameList 组件传入（原文此处有配图，未随迁移入库），修改文件名并切换 selectedFileName 为新的文件名。

```javascript
import { useContext, useEffect, useState } from "react"
import { PlaygroundContext } from "../../../PlaygroundContext"

import { FileNameItem } from "./FileNameItem"
import styles from './index.module.scss'

export default function FileNameList() {
    const {
        files,
        removeFile,
        addFile,
        updateFileName,
        selectedFileName,
        setSelectedFileName
    } = useContext(PlaygroundContext)

    const [tabs, setTabs] = useState([''])

    useEffect(() => {
        setTabs(Object.keys(files))
    }, [files])

    const handleEditComplete = (name: string, prevName: string) => {
        updateFileName(prevName, name);
        setSelectedFileName(name);
    }

    return <div className={styles.tabs}>
        {
            tabs.map((item, index) => (
                <FileNameItem
                    key={item + index}
                    value={item}
                    actived={selectedFileName === item}
                    onClick={() => setSelectedFileName(item)}
                    onEditComplete={(name: string) => handleEditComplete(name, item)}
                >
                </FileNameItem>
            ))
        }
    </div>
}
```

之前在 context.Provider 里注入了这个方法（原文此处有配图，未随迁移入库）：它会在 files 里查找旧的 file 信息，去掉后换成新的。可以看到修改完之后文件跑到后面去了，因为插入新 file 的时候就是往后面插入的。

修改完右边白屏了，打开 devtools 可以看到报错（原文此处有配图，未随迁移入库）：App.tsx 文件改名了，main.tsx 里引用的路径也得改下（原文此处有配图，未随迁移入库）。改完后，修改文件名的功能就完成了。

写下输入框的样式：

```css
.tabs-item-input {
    width: 90px;
    padding: 4px 0 4px 10px;
    font-size: 13px;

    color: #444;
    background-color: #ddd;
    border: 1px solid #ddd;
    border-radius: 4px;
    outline: none;
}
```

设置 width、padding、背景色、border，好看多了。

### 新增文件

接下来实现新增 file 功能（原文此处有配图，未随迁移入库）。新增和修改差不多，完全可以复用之前的逻辑：加一个 creating 参数（原文此处有配图，未随迁移入库），由父组件来控制哪个 tab 是编辑状态。

props.creating 为 true 的时候让 input 聚焦：

```javascript
useEffect(() => {
    if(creating) {
        inputRef?.current?.focus()
    }
}, [creating]);
```

比如让最后一个 tab 是编辑状态（原文此处有配图，未随迁移入库）：现在不用双击也是编辑文件名的状态（原文此处有配图，未随迁移入库）。

添加一个 + 按钮：创建一个 creating 的 state 来保存创建状态。点击 + 按钮时进入创建状态，添加一个 file（文件名随机），把最后一个 tab 变为编辑状态；编辑完把 creating 变为 false。

```javascript
import { useContext, useEffect, useState } from "react"
import { PlaygroundContext } from "../../../PlaygroundContext"

import { FileNameItem } from "./FileNameItem"
import styles from './index.module.scss'

export default function FileNameList() {
    const {
        files,
        removeFile,
        addFile,
        updateFileName,
        selectedFileName,
        setSelectedFileName
    } = useContext(PlaygroundContext)

    const [tabs, setTabs] = useState([''])

    useEffect(() => {
        setTabs(Object.keys(files))
    }, [files])

    const handleEditComplete = (name: string, prevName: string) => {
        updateFileName(prevName, name);
        setSelectedFileName(name);

        setCreating(false);
    }

    const [creating, setCreating] = useState(false);

    const addTab = () => {
        const newFileName = 'Comp' + Math.random().toString().slice(2,8) + '.tsx';
        addFile(newFileName);
        setSelectedFileName(newFileName);
        setCreating(true)
    }

    return <div className={styles.tabs}>
        {
            tabs.map((item, index, arr) => (
                <FileNameItem
                    key={item + index}
                    value={item}
                    creating={creating && index === arr.length - 1}
                    actived={selectedFileName === item}
                    onClick={() => setSelectedFileName(item)}
                    onEditComplete={(name: string) => handleEditComplete(name, item)}
                >
                </FileNameItem>
            ))
        }
        <div className={styles.add} onClick={addTab}>
            +
        </div>
    </div>
}
```

没有问题。tsx、css 等语法都能正确高亮和提示（原文此处有配图，未随迁移入库），因为 addFile 的时候已经做了处理（原文此处有配图，未随迁移入库）。

### 删除文件与 readonly

最后是删除功能：在 FileNameItem 组件文件名的右边用 svg 画一个 x，点击时回调 onRemove 参数。

```javascript
import classnames from 'classnames'
import React, { useState, useRef, useEffect } from 'react'

import styles from './index.module.scss'

export interface FileNameItemProps {
    value: string
    actived: boolean
    creating: boolean
    onEditComplete: (name: string) => void
    onRemove: MouseEventHandler
    onClick: () => void
}

export const FileNameItem: React.FC<FileNameItemProps> = (props) => {
  const {
    value,
    actived = false,
    creating,
    onClick,
    onRemove,
    onEditComplete,
  } = props

  const [name, setName] = useState(value);
  const [editing, setEditing] = useState(creating)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDoubleClick = () => {
    setEditing(true)
    setTimeout(() => {
      inputRef?.current?.focus()
    }, 0)
  }

  useEffect(() => {
    if(creating) {
        inputRef?.current?.focus()
    }
  }, [creating]);

  const hanldeInputBlur = () => {
    setEditing(false);
    onEditComplete(name);
  }

  return (
    <div
      className={classnames(styles['tab-item'], actived ? styles.actived : null)}
      onClick={onClick}
    >
        {
            editing ? (
                <input
                    ref={inputRef}
                    className={styles['tabs-item-input']}
                    value={name}
                    onBlur={hanldeInputBlur}
                    onChange={(e) => setName(e.target.value)}
                />
            ) : (
                <>
                    <span onDoubleClick={handleDoubleClick}>{name}</span>
                    <span style={{ marginLeft: 5, display: 'flex' }} onClick={onRemove}>
                        <svg width='12' height='12' viewBox='0 0 24 24'>
                            <line stroke='#999' x1='18' y1='6' x2='6' y2='18'></line>
                            <line stroke='#999' x1='6' y1='6' x2='18' y2='18'></line>
                        </svg>
                    </span>
                </>
            )
        }
    </div>
  )
}
```

在 FileNameList 组件里处理下（原文此处有配图，未随迁移入库）：删除文件并把选中的文件名换成 main.tsx。注意要阻止事件冒泡，否则会触发 item 的点击事件，切换 tab 到已删除的文件。

```javascript
onRemove={(e) => {
    e.stopPropagation();
    handleRemove(item)
}}
```

```javascript
const handleRemove = (name: string) => {
    removeFile(name)
    setSelectedFileName(ENTRY_FILE_NAME)
}
```

没有问题。main.tsx 是入口模块不能被删除，import-map.json 也不能删除，加一个 readonly 参数（原文此处有配图，未随迁移入库）：非 readonly 状态才展示删除按钮；同理，非 readonly 状态才可以双击编辑。

```javascript
import classnames from 'classnames'
import React, { useState, useRef, useEffect, MouseEventHandler } from 'react'

import styles from './index.module.scss'

export interface FileNameItemProps {
    value: string
    actived: boolean
    creating: boolean
    readonly: boolean
    onEditComplete: (name: string) => void
    onRemove: MouseEventHandler
    onClick: () => void
}

export const FileNameItem: React.FC<FileNameItemProps> = (props) => {
  const {
    value,
    actived = false,
    readonly,
    creating,
    onClick,
    onRemove,
    onEditComplete,
  } = props

  const [name, setName] = useState(value);
  const [editing, setEditing] = useState(creating)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDoubleClick = () => {
    setEditing(true)
    setTimeout(() => {
      inputRef?.current?.focus()
    }, 0)
  }

  useEffect(() => {
    if(creating) {
        inputRef?.current?.focus()
    }
  }, [creating]);

  const hanldeInputBlur = () => {
    setEditing(false);
    onEditComplete(name);
  }

  return (
    <div
      className={classnames(styles['tab-item'], actived ? styles.actived : null)}
      onClick={onClick}
    >
        {
            editing ? (
                <input
                    ref={inputRef}
                    className={styles['tabs-item-input']}
                    value={name}
                    onBlur={hanldeInputBlur}
                    onChange={(e) => setName(e.target.value)}
                />
            ) : (
                <>
                    <span onDoubleClick={!readonly ? handleDoubleClick : () => {}}>{name}</span>
                    {
                        !readonly ? <span style={{ marginLeft: 5, display: 'flex' }} onClick={onRemove}>
                            <svg width='12' height='12' viewBox='0 0 24 24'>
                                <line stroke='#999' x1='18' y1='6' x2='6' y2='18'></line>
                                <line stroke='#999' x1='6' y1='6' x2='18' y2='18'></line>
                            </svg>
                        </span> : null
                    }
                </>
            )
        }
    </div>
  )
}
```

然后 main.tsx、App.tsx、import-map.json 都设为 readonly：

```javascript
const readonlyFileNames = [ENTRY_FILE_NAME, IMPORT_MAP_FILE_NAME, APP_COMPONENT_FILE_NAME];
```

试下效果（原文此处有配图，未随迁移入库）：除了这三个文件外，其余文件名都是可以编辑和删除的。

再给删除加一个二次确认，用 antd 的 Popconfirm 组件：

```
npm install --save antd
```

```javascript
{
    !readonly ? (
        <Popconfirm
            title="确认删除该文件吗？"
            okText="确定"
            cancelText="取消"
            onConfirm={(e) => {
                e?.stopPropagation();
                onRemove();
            }}
        >
            <span style={{ marginLeft: 5, display: 'flex' }}>
                <svg width='12' height='12' viewBox='0 0 24 24'>
                    <line stroke='#999' x1='18' y1='6' x2='6' y2='18'></line>
                    <line stroke='#999' x1='6' y1='6' x2='18' y2='18'></line>
                </svg>
            </span>
        </Popconfirm>
    ) : null
}
```

e.stopPropagation 在这里调用，父组件那里就不需要了。（其实之前调用 e.stopPropagation 的位置就不对：应该是组件内处理完 stopPropagation 后再调用回调函数，而不是在父组件里 stopPropagation。）测试下（原文此处有配图，未随迁移入库）没有问题。

至此文件增删改的功能都完成了。和前面实现的编译预览串联测试下（原文此处有配图，未随迁移入库）：新建一个 Aaa.tsx 组件：

```javascript
import './Aaa.css';

function Aaa() {

  return (
    <>
      <h1 id="guang" onClick={() => alert(666)}>神说要有光</h1>
    </>
  )
}

export default Aaa
```

创建用到的 Aaa.css：

```css
#guang {
    background: pink;
    font-size: 50px;
}
```

在 App.tsx 里引入（原文此处有配图，未随迁移入库）。看下效果（原文此处有配图，未随迁移入库）没有问题，和之前的编译、预览功能配合得很好。

案例代码见 [GitHub 仓库](https://github.com/QuarkGluonPlasma/react-course-code/tree/main/react-playground-project)，可以切换到这个 commit 查看：

```
git reset --hard 1674a8f0021a06dd54dfdc56386928544ce609e5
```

### 文件增删改小结

- 在 FileNameItem 组件里添加了 editing 的 state 来切换编辑状态：编辑状态下可以在 input 里修改名字，然后同步到 files 里。
- 添加了 creating 的 props 来控制 editing 状态：新增的时候添加一个 file，设置 creating 参数为 true 就可以了。
- 删除就是从 files 里把对应文件名删除，然后切换到 main.tsx。这些都基于 context 里的 api 来实现。
- main.tsx、App.tsx、import-map.json 设置为 readonly，不可编辑和删除。

## 开发：错误显示与主题切换

### 错误显示

预览出错时 iframe 会白屏，并不会显示错误。比如当依赖的模块找不到的时候（原文此处有配图，未随迁移入库），在 devtools 可以看到错误信息（原文此处有配图，未随迁移入库），但总不能让开发者自己打开 devtools 看，要在页面做错误显示。

新增 components/Message/index.tsx 组件：

```javascript
import classnames from 'classnames'
import React, { useEffect, useState } from 'react'

import styles from './index.module.scss'

export interface MessageProps {
    type: 'error' | 'warn'
    content: string
}

export const Message: React.FC<MessageProps> = (props) => {
  const { type, content } = props
  const [visible, setVisible] = useState(false)

  useEffect(() => {
      setVisible(!!content)
  }, [content])

  return visible ? (
    <div className={classnames(styles.msg, styles[type])}>
      <pre dangerouslySetInnerHTML={{ __html: content }}></pre>
      <button className={styles.dismiss} onClick={() => setVisible(false)}>
        ✕
      </button>
    </div>
  ) : null
}
```

传入两个参数：type 是 error 还是 warn，content 是错误内容。content 要作为 html 的方式设置到 pre 标签的标签体，React 里设置 html 要用 dangerouslySetInnerHTML={{__html: "xxx"}} 的方式。用 visible 的 state 控制显示隐藏，当传入内容时设置 visible 为 true。

写下样式（原文此处有配图，未随迁移入库）。index.module.scss：

```scss
.msg {
    position: absolute;
    right: 8px;
    bottom: 0;
    left: 8px;
    z-index: 10;

    display: flex;
    max-height: calc(100% - 300px);
    min-height: 40px;
    margin-bottom: 8px;
    color: var(--color);

    background-color: var(--bg-color);
    border: 2px solid #fff;
    border-radius: 6px;

    border-color: var(--color);

    &.error {
      --color: #f56c6c;
      --bg-color: #fef0f0;
    }

    &.warn {
      --color: #e6a23c;
      --bg-color: #fdf6ec;
    }
}

pre {
    padding: 12px 20px;
    margin: 0;
    overflow: auto;
    white-space: break-spaces;
}

.dismiss {
    position: absolute;
    top: 2px;
    right: 2px;

    display: block;
    width: 18px;
    height: 18px;
    padding: 0;

    font-size: 9px;
    line-height: 18px;
    color: var(--bg-color);

    text-align: center;
    cursor: pointer;
    background-color: var(--color);
    border: none;
    border-radius: 9px;
}
```

.msg 绝对定位在底部，设置宽高；.dismiss 绝对定位在 .msg 的右上角。注意 .error 和 .warn 的 color 和 background-color 都不同，声明了两个 css 变量：css 变量可以在它元素和子元素 css 里生效，切换了 .error 和 .warn 就切换了整体的颜色（原文此处有配图，未随迁移入库）。

在 Preview 组件引入试试：

```javascript
<Message type='warn' content={new Error().stack!.toString()} />
```

看下效果（原文此处有配图，未随迁移入库）。把 type 换成 error，再缩小下窗口试试（原文此处有配图，未随迁移入库），没有问题。

那展示的错误内容从哪里来？从 iframe 里传出来：

```html
<script>
    window.addEventListener('error', (e) => {
        window.parent.postMessage({type: 'ERROR', message: e.message})
    })
</script>
```

通过 postMessage 传递消息给父窗口。然后在 Preview 组件里监听下：

```javascript
import { useContext, useEffect, useState } from "react"
import { PlaygroundContext } from "../../PlaygroundContext"
import Editor from "../CodeEditor/Editor";
import { compile } from "./compiler";
import iframeRaw from './iframe.html?raw'
import { IMPORT_MAP_FILE_NAME } from "../../files";
import { Message } from "../Message";

interface MessageData {
    data: {
      type: string
      message: string
    }
}

export default function Preview() {

    const { files} = useContext(PlaygroundContext)
    const [compiledCode, setCompiledCode] = useState('')

    useEffect(() => {
        const res = compile(files);
        setCompiledCode(res);
    }, [files]);

    const getIframeUrl = () => {
        const res = iframeRaw.replace(
            '<script type="importmap"></script>',
            `<script type="importmap">${
                files[IMPORT_MAP_FILE_NAME].value
            }</script>`
        ).replace(
            '<script type="module" id="appSrc"></script>',
            `<script type="module" id="appSrc">${compiledCode}</script>`,
        )
        return URL.createObjectURL(new Blob([res], { type: 'text/html' }))
    }

    useEffect(() => {
        setIframeUrl(getIframeUrl())
    }, [files[IMPORT_MAP_FILE_NAME].value, compiledCode]);

    const [iframeUrl, setIframeUrl] = useState(getIframeUrl());

    const [error, setError] = useState('')

    const handleMessage = (msg: MessageData) => {
        const { type, message } = msg.data
        if (type === 'ERROR') {
          setError(message)
        }
    }

    useEffect(() => {
        window.addEventListener('message', handleMessage)
        return () => {
          window.removeEventListener('message', handleMessage)
        }
    }, [])

    return <div style={{height: '100%'}}>
        <iframe
            src={iframeUrl}
            style={{
                width: '100%',
                height: '100%',
                padding: 0,
                border: 'none',
            }}
        />
        <Message type='error' content={error} />

        {/* <Editor file={{
            name: 'dist.js',
            value: compiledCode,
            language: 'javascript'
        }}/> */}
    </div>
}
```

试下效果（原文此处有配图，未随迁移入库）：错误展示出来了，就是控制台那个报错（原文此处有配图，未随迁移入库）。这里暂时用不到 warn，后面用到 warn 再切换 type。

### 主题切换

再做主题切换（原文此处有配图，未随迁移入库）。同样要在 context 里保存配置（原文此处有配图，未随迁移入库），然后加一个 theme 对应的 className（原文此处有配图，未随迁移入库）。写下用到的样式：

```css
.light {
    --text: #444;
    --bg: #fff;
}

.dark {
    --text: #fff;
    --bg: #1a1a1a;
}
```

前面讲过 css 变量的生效范围：在元素和它的所有子元素里生效。所以只要把之前 css 的样式值改成这些变量就可以了，比如在 Header 组件里用下（原文此处有配图，未随迁移入库）。

把 theme 初始值改为 dark，Header 就切换为暗色主题了（原文此处有配图，未随迁移入库）；改为 light 就会变回来（原文此处有配图，未随迁移入库）。这就是主题切换的原理（原文此处有配图，未随迁移入库）：声明一些全局的 css 变量，写样式的时候用这些变量；切换主题时切换不同的全局变量值即可。

切成暗色主题后周边有点间距，加下重置样式（原文此处有配图，未随迁移入库）。然后在 Header 加一个切换主题的按钮：

```javascript
import styles from './index.module.scss'

import logoSvg from './icons/logo.svg';
import { useContext } from 'react';
import { PlaygroundContext } from '../../PlaygroundContext';
import { MoonOutlined, SunOutlined } from '@ant-design/icons';

export default function Header() {
  const { theme, setTheme} = useContext(PlaygroundContext)

  return (
    <div className={styles.header}>
      <div className={styles.logo}>
        <img alt='logo' src={logoSvg}/>
        <span>React Playground</span>
      </div>
      <div className={styles.links}>
        {theme === 'light' && (
          <MoonOutlined
            title='切换暗色主题'
            className={styles.theme}
            onClick={() => setTheme('dark')}
          />
        )}
        {theme === 'dark' && (
          <SunOutlined
            title='切换亮色主题'
            className={styles.theme}
            onClick={() => setTheme('light')}
          />
        )}
      </div>
    </div>
  )
}
```

安装用到的 icon 包：

```javascript
npm install @ant-design/icons --save
```

试下效果（原文此处有配图，未随迁移入库）：确实能切换了，再完善下暗色主题的样式（其余地方同理），再改下 FileNameList 的样式（原文此处有配图，未随迁移入库）。编辑器同样也可以切换主题，这是 monaco editor 自带的。主题切换功能就完成了。

案例代码见 [GitHub 仓库](https://github.com/QuarkGluonPlasma/react-course-code/tree/main/react-playground-project)，可以切换到这个 commit 查看：

```
git reset --hard 4a77f1bf3dc8be9e270cc346145fde6a6a896b89
```

### 错误显示与主题切换小结

- Message 组件显示错误：iframe 里监听 error 事件，发生错误时通过 postMessage 传递给父窗口；父窗口里监听 message 事件传过来的错误，用 Message 组件显示。
- 主题切换：在根元素加一个 .light、.dark 的 className，里面声明 css 变量。因为 css 变量可以在子元素里生效，子元素写样式基于这些变量，切换了 className 也就切换了这些变量的值，从而实现主题切换。

实现这两个功能后，playground 就更完善了。

## 开发：链接分享与代码下载

### 链接分享

代码写完后希望能通过链接分享出去，别人访问链接就可以看到这段代码。vue playground 有这个功能（原文此处有配图，未随迁移入库）：点击分享按钮，链接会复制到剪贴板；然后在新的浏览器窗口打开，可以看到分享的代码（原文此处有配图，未随迁移入库）。

实现思路：要分享或者说保存的是哪部分数据？其实就是 context 里的 files——files 包含所有文件的信息，编辑、编译、预览都是围绕 files 来的。files 是一个对象，JSON.stringify 一下就变为字符串了；把它放到 url 后面，初始化的时候读取出来 JSON.parse 一下，作为 files 的初始数据即可。

在 Context.Provider 里设置下 JSON.stringify(files) 到 location.hash：

```javascript
useEffect(() => {
    const hash = JSON.stringify(files)
    window.location.hash = encodeURIComponent(hash)
}, [files])
```

当 files 内容变化时会同步修改。这里还要对字符串 encodeURIComponent 下，把 url 里不支持的字符做下转换（原文此处有配图，未随迁移入库）。可以看到，确实会把 files 内容保存到 hash。

把这个 url 分享出去后，初始化时用 hash 中的 files 就好：

```javascript
const getFilesFromUrl = () => {
  let files: Files | undefined
  try {
      const hash = decodeURIComponent(window.location.hash.slice(1))
      files = JSON.parse(hash)
  } catch (error) {
    console.error(error)
  }
  return files
}
```

对 hash decodeURIComponent 一下，然后 JSON.parse 作为 files 的内容。试下效果（原文此处有配图，未随迁移入库）：在 chrome 里改一下代码内容、新建一个 Aaa.tsx 组件，在别的浏览器打开这个链接试下（原文此处有配图，未随迁移入库），App.tsx、Aaa.tsx 组件都是改动的内容。分享 url 功能完成。

不过直接把文件内容放到 hash 上不大好，太长了，要压缩下，用 [fflate](https://www.npmjs.com/package/fflate) 这个包（原文此处有配图，未随迁移入库）。安装下：

```
npm install --save fflate
```

在 utils.ts 添加两个方法：

```javascript
import { strFromU8, strToU8, unzlibSync, zlibSync } from "fflate"

export function compress(data: string): string {
    const buffer = strToU8(data)
    const zipped = zlibSync(buffer, { level: 9 })
    const str = strFromU8(zipped, true)
    return btoa(str)
}

export function uncompress(base64: string): string {
    const binary = atob(base64)

    const buffer = strToU8(binary, true)
    const unzipped = unzlibSync(buffer)
    return strFromU8(unzipped)
}
```

这里的 atob、btoa 是二进制字符串（Latin-1 字符串）和 base64 字符串之间的转换（原文此处有配图，未随迁移入库）。

- compress 方法：先调用 fflate 包的 strToU8 把字符串转为字节数组，然后 zlibSync 压缩，之后 strFromU8 转为字符串，最后用 btoa 把这个二进制字符串编码为 base64 字符串。
- uncompress 方法正好反过来。

调用试试效果：

```javascript
useEffect(() => {
    const hash = compress(JSON.stringify(files))
    window.location.hash = hash
}, [files])
```

```javascript
const getFilesFromUrl = () => {
  let files: Files | undefined
  try {
      const hash = uncompress(window.location.hash.slice(1))
      files = JSON.parse(hash)
  } catch (error) {
    console.error(error)
  }
  return files
}
```

现在代码内容会压缩后以 base64 字符串的方式保存在 url 里。在另一个窗口打开这个 url（原文此处有配图，未随迁移入库），内容同样能恢复。代码分享功能完成。

在 Header 里加个按钮：

```javascript
<ShareAltOutlined
  style={{marginLeft: '10px'}}
  onClick={() => {
    copy(window.location.href);
    message.success('分享链接已复制。')
  }}
/>
```

这里用到了 copy-to-clipboard 包，安装下：

```
npm install --save copy-to-clipboard
```

点击分享按钮会把 url 复制到剪贴板，可以直接粘贴。

### 代码下载

实现代码下载功能（原文此处有配图，未随迁移入库）。需要在浏览器里把多个文件打成 zip 包，用 jszip：

```
npm install --save jszip
```

触发代码下载用 file-saver：

```
npm install --save file-saver
npm install --save-dev @types/file-saver
```

在 utils.ts 加一个 downloadFiles 方法：

```javascript
export async function downloadFiles(files: Files) {
    const zip = new JSZip()

    Object.keys(files).forEach((name) => {
        zip.file(name, files[name].value)
    })

    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, `code${Math.random().toString().slice(2, 8)}.zip`)
}
```

然后在 Header 加一个按钮：

```javascript
<DownloadOutlined
  style={{marginLeft: '10px'}}
  onClick={async () => {
    await downloadFiles(files);
    message.success('下载完成')
  }}
/>
```

试一下（原文此处有配图，未随迁移入库），下载成功。

案例代码见 [GitHub 仓库](https://github.com/QuarkGluonPlasma/react-course-code/tree/main/react-playground-project)，可以切换到这个 commit 查看：

```
git reset --hard ea67b94f512f023779077dfedca02e87c6d59b4f
```

### 分享与下载小结

- 链接分享：把 files 信息 JSON.stringify 之后保存到 location.hash；初始化时从 location.hash 读取出来 JSON.parse 之后设置到 files。为避免内容过长，用 fflate 对字符串压缩，再用 btoa 编码为 base64 字符串。
- 代码下载基于 jszip 和 file-saver 包实现。

playground 里写的代码内容就可以通过 url 分享出去，并且可以下载了。

## 优化：Web Worker 性能优化

功能实现得差不多后，做代码优化。

### 用 Performance 定位性能问题

用 Performance 跑一下就知道 playground 有没有性能瓶颈（原文此处有配图，未随迁移入库）。用无痕模式打开页面（无痕模式下不会跑浏览器插件，比较准确），打开 devtools 点击 reload 重新加载页面（原文此处有配图，未随迁移入库），等页面渲染完点击停止就可以看到录制的性能数据。图可以按住上下左右拖动，按住上下滑动可以放大缩小（原文此处有配图，未随迁移入库）。

- main 就是主线程（原文此处有配图，未随迁移入库），主线程会通过 event loop 的方式跑一个个宏任务，也就是这里的 task。
- 超过 50ms 的被称为长任务 long task（原文此处有配图，未随迁移入库）。long task 会导致主线程一直被占据，阻塞渲染，表现出来的就是页面卡顿。**性能优化的目标就是消除这种 long task。**
- 图中的宽度代表耗时，可以看到 babelTransform 这个方法耗费了 24 ms。点击火焰图中的 babelTransform，下面会展示它的代码位置，点击可以跳到 Sources 面板的代码（原文此处有配图，未随迁移入库）。

### Web Worker 拆分编译逻辑

babel 内部代码怎么优化？这段代码计算量比较大，把它放到单独的 worker 线程来跑就好了，这样就不会占用主线程的时间。

vite 项目用 web worker 的方式（原文此处有配图，未随迁移入库）：把 compiler.ts 改名为 compiler.worker.ts，然后在 worker 线程向主线程 postMessage：

```javascript
self.postMessage({
    type: 'COMPILED_CODE',
    data: 'xx'
})
```

主线程里创建这个 worker 线程，监听 message 消息：

```javascript
import CompilerWorker from './compiler.worker?worker'
```

```javascript
const compilerWorkerRef = useRef<Worker>();

useEffect(() => {
    if(!compilerWorkerRef.current) {
        compilerWorkerRef.current = new CompilerWorker();
        compilerWorkerRef.current.addEventListener('message', (data) => {
            console.log('worker', data)
        })
    }
}, []);
```

跑一下（原文此处有配图，未随迁移入库）：主线程接收到了 worker 线程传过来的消息。反过来通信也是一样的 postMessage 和监听 message 事件。

主线程给 worker 线程传递 files，然后拿到 worker 线程传回来的编译后的代码：

```javascript
import { useContext, useEffect, useRef, useState } from "react"
import { PlaygroundContext } from "../../PlaygroundContext"
import Editor from "../CodeEditor/Editor";
import iframeRaw from './iframe.html?raw'
import { IMPORT_MAP_FILE_NAME } from "../../files";
import { Message } from "../Message";
import CompilerWorker from './compiler.worker?worker'

interface MessageData {
    data: {
      type: string
      message: string
    }
}

export default function Preview() {

    const { files} = useContext(PlaygroundContext)
    const [compiledCode, setCompiledCode] = useState('')
    const [error, setError] = useState('')

    const compilerWorkerRef = useRef<Worker>();

    useEffect(() => {
        if(!compilerWorkerRef.current) {
            compilerWorkerRef.current = new CompilerWorker();
            compilerWorkerRef.current.addEventListener('message', ({data}) => {
                console.log('worker', data);
                if(data.type === 'COMPILED_CODE') {
                    setCompiledCode(data.data);
                } else {
                    //console.log('error', data);
                }
            })
        }
    }, []);

    useEffect(() => {
        compilerWorkerRef.current?.postMessage(files)
    }, [files]);

    const getIframeUrl = () => {
        const res = iframeRaw.replace(
            '<script type="importmap"></script>',
            `<script type="importmap">${
                files[IMPORT_MAP_FILE_NAME].value
            }</script>`
        ).replace(
            '<script type="module" id="appSrc"></script>',
            `<script type="module" id="appSrc">${compiledCode}</script>`,
        )
        return URL.createObjectURL(new Blob([res], { type: 'text/html' }))
    }

    useEffect(() => {
        setIframeUrl(getIframeUrl())
    }, [files[IMPORT_MAP_FILE_NAME].value, compiledCode]);

    const [iframeUrl, setIframeUrl] = useState(getIframeUrl());

    const handleMessage = (msg: MessageData) => {
        const { type, message } = msg.data
        if (type === 'ERROR') {
          setError(message)
        }
    }

    useEffect(() => {
        window.addEventListener('message', handleMessage)
        return () => {
          window.removeEventListener('message', handleMessage)
        }
    }, [])

    return <div style={{height: '100%'}}>
        <iframe
            src={iframeUrl}
            style={{
                width: '100%',
                height: '100%',
                padding: 0,
                border: 'none',
            }}
        />
        <Message type='error' content={error} />

        {/* <Editor file={{
            name: 'dist.js',
            value: compiledCode,
            language: 'javascript'
        }}/> */}
    </div>
}
```

而 worker 线程这边则是监听主线程的 message，传递 files 编译后的代码给主线程：

```javascript
self.addEventListener('message', async ({ data }) => {
    try {
        self.postMessage({
            type: 'COMPILED_CODE',
            data: compile(data)
        })
    } catch (e) {
         self.postMessage({ type: 'ERROR', error: e })
    }
})
```

可以看到拿到了 worker 线程传过来的编译后的代码（原文此处有配图，未随迁移入库），预览也正常。

其实 files 变化没必要那么频繁触发编译，加个防抖：

```javascript
useEffect(debounce(() => {
    compilerWorkerRef.current?.postMessage(files)
}, 500), [files]);
```

再用 performance 看下优化后的效果（原文此处有配图，未随迁移入库）：编译代码的耗时没有了，被转移到了 worker 线程（原文此处有配图，未随迁移入库）——还是 24ms，但不占据主线程了。文件内容少时编译耗时少，文件多了编译耗时自然增加，拆分就很有必要。性能优化就完成了。

再优化两处代码（原文此处有配图，未随迁移入库）：main.tsx 有个编辑器错误说 StrictMode 不是一个 jsx，这种不用解决也不影响运行，改下模版把它去掉就行（原文此处有配图，未随迁移入库）；上面那个只要编辑文件就会触发类型下载，也不用解决（原文此处有配图，未随迁移入库）；生成的文件名没必要 6 位随机数，改为 4 位正好（原文此处有配图，未随迁移入库）。

案例代码见 [GitHub 仓库](https://github.com/QuarkGluonPlasma/react-course-code/tree/main/react-playground-project)。

### 性能优化小结

- 用 Performance 分析了页面的 Event Loop，发现有 long task，**性能优化的目标就是消除 long task**。
- 分析发现是 babel 编译的逻辑导致的，通过 Web Worker 把 babel 编译的逻辑放到 worker 线程跑，通过 message 事件和 postMessage 与主线程通信。
- 拆分后功能正常，再用 Performance 分析：耗时逻辑被转移到了 worker 线程，主线程的 long task 没有了，达到性能优化的目的。需要编译的文件多了之后，这种性能优化更有意义。

## 整体回顾

从 0 到 1 实现了和 [vue playground](https://play.vuejs.org/) 功能一样的项目。整体测试下 react playground 的功能（原文此处有配图，未随迁移入库）。

用 create-vite 创建的项目，进入项目把开发服务跑起来：

```
npm run dev
```

浏览器访问下（原文此处有配图，未随迁移入库）：

- 可以在左侧编辑器写组件和样式，右边实时预览（原文此处有配图，未随迁移入库）；css 和 ts 代码都有提示（原文此处有配图，未随迁移入库），后面引入的 npm 包也会有类型提示（原文此处有配图，未随迁移入库）。但额外引入的 npm 包不能直接用（原文此处有配图，未随迁移入库），需要在 import-map.json 里配置下才行（原文此处有配图，未随迁移入库）。
- 文件可以新增、删除、修改（原文此处有配图，未随迁移入库）：比如新增一个 Aaa.tsx 组件还有它的样式 Aaa.css，在 App.tsx 里引入后就可以使用（原文此处有配图，未随迁移入库）。
- 通过 url 分享代码也是 playground 的功能：点击右上角的分享按钮可以复制分享链接（原文此处有配图，未随迁移入库）。
- 此外还可以下载代码到本地（原文此处有配图，未随迁移入库）、切换亮色暗色主题（原文此处有配图，未随迁移入库）。
- 可以直接打开 [这个 url](http://localhost:5173/#eNqNVV9v2zYQ/yqcgsI2ZsmyEreZlgTtugHrwzage9jDtAdapCQ2FCmQlGPX8HffkdQ/O97QKLapu9/9P94dgxozERm9D9JjIHBNg3QkLQOORdni0lLNoaE6V6wxQN9h3loiqxupDPpMcW5QoWSNZsqeZ5mYsn7+47cpNySyXuWcUWGBA/RD03SoaAVnx+rFoxwkDf0spZkTmbc1yEYlNb9wao8/HT6R+UwBd7b4bhEpKghV80wg+HuweldPmVhkIjgtA3i9CLinfHO8R9Rq+qcBh5b2hE7XY/dxRLnWI41LgnXV4f1LSPXsxzELGI9ZwNhyMlG0IjdMCpuj+QIdbWS5FNqgv3PZCrNEmpqP9vQPehycm8cQMkL2o6hplUB9SiAb9tcmB2Obm+6tWj/9SjmX6C+pODl6/yJMyPz29naJkiRZnB5WgBokCNuhnGOtf4dcPs5yrMhs4AJ/2xoDfkvxkbP8+fEI3j8+Dd7O5859R3Mn9D1aL05P/sw0OroT2PR6RrsrMNy9PfgAINaTzRXduzwSWuCWu64a6w6luKi7pZzV3RP6gqe2p3y+CylMWOCa8UOKPglDFWT9oA2tw5Yt0YcdFQxIkL8dNSzHQFIMcwBhoUNNFSuglgiFL3T7zECV1adr0F8xUaYICwNwhjUlHlfLr6HU+1fAUuGDzjGnDua4L5SVlUnRXRw7ImeChlVHXEcbR8wllypFqtzOk80G9Z8Vun/3ZuEQhu5N6C+PsyQbw2r2lXJasi3jzBxGmAZ6iMmXVlsTcfzGsbY4fy4V1IyEnbmb5M4+owehziu4tCk4Ce4hgtXzGIg+CFNRzXSKhBQ2QlfTm7EMNd6HL4yYCqwm93Gzd8IN9KhzOVG0dpQaq5KJFMUIt0aOfkOKSyDnMDWo6vVvJTl49YTphmOocMGpV10z0Ru8TXp7ljjkN4531blN7xPHOQ0ZNAhEc26vWk96ymYSdEdJ5/lF8daDk/4qOcEh3jh6S2tA9cJnXcpEBZU0k/Q6U+sptm+dTdc6eau0rVsjWefx1aqusX08VypoGFDb7JGWnBFkFLR8g6GTvG2PCBUmrIVc3HdJdDBm51raQ5x6CCrZ6POw00ruqPLBT7Hgytu7t3lh79YUXsCS0Mvz13DHNNty6rXI1thMw6UBv22PTG6mBdsr4G30qt/XlDCM5o2iBVXaM8/buZvNk7Ex3LubZH27uXvnIr+a0sIFgZCzBYhJua/jf7BPLwL/dsr5LRLWuIm+aCkm0+6Sczb1Oko/9pzRrBPRWZD2bmSB23GWkgWVMY1OVyuq60hXK8d5v76PkijOAsj9RGCy8v9b1oJeyw9L8qrghHueCFhsl2u+o3zzmvcb2O3viy2Msd3CZ6vVbUJGHrMAY5wFT/DdL6mrawlAg58Xa6mj/M9augHtfUkmF3vTj6eh6baAf9VxMNjh5pVuugan0796w1lP) 试试，通过 url 分享代码也是 playground 的功能。

这些就是 React Playground 的全部功能，最终实现的效果不错。

### 开发过程回顾

**布局与编辑器**：用 [allotment](https://www.npmjs.com/package/allotment) 实现了 split-pane，两边可以通过拖动改变大小；集成 @monaco-editor/react 实现编辑器；还用 @typescript/ata 包实现了代码改变时自动下载 dts 类型包的功能，编辑器里写代码就有 ts 类型提示。

**多文件切换**：在 Context 中保存全局数据（files、selectedFileName）和对应的增删改方法；对 Context.Provider 封装一层来注入初始化数据和方法，提供 initFiles 信息；在 FileNameList 里读取 context 里的 files 渲染文件列表；点击 tab 时切换 selectedFileName，从而切换编辑器的内容。

**编译与预览**：使用 @babel/standalone 做 tsx 代码的编译，编译过程中对 .tsx、.css、.json 等模块的 import 做处理变成 blob url；通过 babel 插件实现了对 import 语句的修改（原文此处有配图，未随迁移入库）——css 模块包一层代码加到 head 的 style 标签里，json 包一层代码直接 export，tsx 模块直接 babel 编译；react、react-dom/client 这种用浏览器的 import maps 来引入；然后通过 iframe 实现预览（原文此处有配图，未随迁移入库）——替换 html 模版里 import maps 和 src 部分的 script 标签后，同样用 blob url 设置为 iframe 的 src。iframe 里正是替换了 importmap 和 src 部分的 html，css 也被添加到了 head 里的 style 标签下（原文此处有配图，未随迁移入库）。

**文件增删改**：实现了文件的新增、删除、修改（原文此处有配图，未随迁移入库），main.tsx、App.tsx、import-map.json 设置为 readonly 不可编辑和删除。

**错误显示**：在 iframe 里监听 error 事件，发生错误时通过 postMessage 传递给父窗口；父窗口里监听 message 事件传过来的错误，用 Message 组件显示。

**主题切换**（原文此处有配图，未随迁移入库）：在根元素加一个 .light、.dark 的 className，里面声明 css 变量。因为 css 变量可以在子元素里生效，子元素写样式基于这些变量，切换了 className 也就切换了这些变量的值，从而实现主题切换。

**链接分享与下载**（原文此处有配图，未随迁移入库）：把 files 信息 JSON.stringify 之后保存到 location.hash，初始化时从 location.hash 读取出来 JSON.parse 之后设置到 files；这个过程中用 fflate 对字符串压缩，然后用 btoa 编码为 base64 字符串；代码下载基于 jszip 和 file-saver 包实现。这样 playground 里写的代码内容就可以通过 url 分享出去，并且可以下载了。

**性能优化**（原文此处有配图，未随迁移入库）：用 Performance 分析页面的 Event Loop 发现有 long task，性能优化的目标是消除 long task；分析发现是 babel 编译的逻辑导致的，通过 Web Worker 把 babel 编译的逻辑放到 worker 线程跑，通过 message 事件和 postMessage 与主线程通信；拆分后功能正常，再用 Performance 分析发现耗时逻辑被转移到了 worker 线程，主线程的 long task 没有了。

### 技术亮点

- 用 @monaco-editor/react 实现了网页版 typescript 编辑器，并且实现了自动类型导入。
- 通过 @babel/standalone 实现了文件编译，并且写了一个 babel 插件实现了 import 的 source 的修改。
- 通过 blob url 来内联引入其他模块的代码，通过 import maps 来引入 react、react-dom 等第三方包的代码。
- 通过 iframe 实现了预览功能，并且通过 postMessage 和父窗口通信来显示代码运行时的错误。
- 基于 css 变量 + context 实现了主题切换功能。
- 通过 fflate + btoa 实现了文件内容的编码、解码，可以通过链接分享代码。
- 通过 Performance 分析性能问题，并通过 Web Worker 拆分编译逻辑到 worker 线程来进行性能优化，消除了 long task。

这些技术点都有较高复用价值：掌握之后在组件在线预览、代码分享等场景都能用到。

## 继续阅读

- 上一篇：[13-Commit全流程](../02-原理与源码/13-Commit全流程)
- 下一篇：[15-手写MiniReact](../02-原理与源码/15-手写MiniReact)
