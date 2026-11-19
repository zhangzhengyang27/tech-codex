---
title: "手写MiniReact-思路分析"
description: "拆解 React 渲染流程（JSX → React Element → fiber → reconcile → render/commit），实现一个支持 useState、useEffect 与时间分片调度的 Mini React，并调试 React 源码对比两者的异同。"
keywords: [手写MiniReact-思路分析]
category: React
tags: [React, 原理与源码]
---

# 手写MiniReact-思路分析

## 思路分析：React 渲染流程

React 渲染流程可以概括如下：

- JSX 通过 babel、tsc 等编译器编译成 render function，执行后产生 React Element 的树。
- React Element 的树会转成 fiber 链表，这个过程叫做 reconcile，由 React 的 Scheduler 调度。
- reconcile 每次只处理一个 fiber 节点，通过时间分片把 reconcile 的过程分到多个任务跑，这样 fiber 树再大也不会阻塞渲染。
- reconcile + schedule 这个过程叫做 render 阶段，之后会进入 commit 阶段。
- commit 阶段会遍历构建好的 fiber 链表，执行 dom 操作，还有函数组件的 effect 等。
- commit 阶段按照更新 dom 前后，分了 before mutation、mutation、layout 三个小阶段。

这就是 React 的 fiber 架构的好处和渲染流程。下面按照这个流程实现 Mini React。

## 实现：手写 Mini React

### 第一步：从 JSX 到 React Element

从 JSX 到 render function 这一步是 babel 或者 tsc 做的，实现 render function 并返回对应的 React Element 即可。

新建项目：

```
mkdir mini-react
cd mini-react
npm init -y
```

安装 typescript：

```
npm install --save-dev typescript
```

创建 tsconfig.json 配置文件：

```
npx tsc --init
```

修改生成的 tsconfig.json：

```json
{
  "compilerOptions": {
    "outDir": "dist",
    "target": "es2016",                                  /* Set the JavaScript language version for emitted JavaScript and include compatible library declarations. */
    "jsx": "react",                                /* Specify what JSX code is generated. */
    "allowJs": true,                                  /* Allow JavaScript files to be a part of your program. Use the 'checkJS' option to get errors from these files. */
    "strict": true,                                      /* Enable all strict type-checking options. */
    "skipLibCheck": true                                 /* Skip type checking all .d.ts files. */
  }
}
```

添加 src/index.jsx：

```javascript
const content = <div>
    <Guang>guang</Guang>
    <a href="xxx">link</a>
</div>
```

执行编译：

```
npx tsc
```

编译产物中，React.createElement 第一个参数是类型，第二个参数是 props，第三个参数是 children。

render function 的名字也可以指定：

```json
"jsx": "react",
"jsxFactory": "MiniReact.createElement"
```

再次执行编译，生成的就是以 MiniReact.createElement 调用形式存在的代码。

这就是从 jsx 到 render function 这一步，由 babel、tsc 等编译器来做。实现这些 render function，返回对应的 React Element 即可。

创建 src/mini-react.js：

```javascript
function createElement(type, props, ...children) {
    return {
        type,
        props: {
            ...props,
            children: children.map((child) => {
                const isTextNode = typeof child === "string" || typeof child === "number";
                return isTextNode ? createTextNode(child) : child;
            }),
        },
    };
}

function createTextNode(nodeValue) {
    return {
        type: "TEXT_ELEMENT",
        props: {
        nodeValue,
            children: []
        },
    };
}

const MiniReact = {
    createElement
};

window.MiniReact = MiniReact;
```

MiniReact.createElement 就是实现的 render function。

文本节点要单独处理的原因：div 的 type 是 div，可以有 props 和 children；而文本节点没有 type、children、props。给它加一个固定的 type TEXT_ELEMENT，并设置 nodeValue 的 props，这样结构统一，方便后面处理。

修改 index.jsx：

```javascript
const content = <div>
    <a href="xxx">link</a>
</div>

console.log(JSON.stringify(content, null, 2));
```

编译：

```
npx tsc -w
```

在 dist 下生成了目标代码。加一个 index.html 引入 dist 的代码：

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    <div id="root"></div>
    <script src="./dist/mini-react.js"></script>
    <script src="./dist/index.js"></script>
</body>
</html>
```

跑一个静态服务：

```
npx http-server .
```

浏览器访问后可以看到 React Element 的树，也就是常说的 vdom。

### 第二步：React Element 转 fiber（reconcile）

接下来把 React Element 树转成 fiber 结构，这个过程叫做 reconcile。它并不是一次性完成的，而是通过调度器调度，根据时间分片放到多个任务里完成，这里用 requestIdleCallback 来调度。

```javascript
let nextUnitOfWork = null
let wipRoot = null
let currentRoot = null

function render(element, container) {
    wipRoot = {
        dom: container,
        props: {
            children: [element],
        },
        alternate: currentRoot,
    }
    nextUnitOfWork = wipRoot
}

function workLoop(deadline) {
    let shouldYield = false
    while (nextUnitOfWork && !shouldYield) {
        nextUnitOfWork = performUnitOfWork(
            nextUnitOfWork
        )
        shouldYield = deadline.timeRemaining() < 1
    }
    requestIdleCallback(workLoop)
}

requestIdleCallback(workLoop)

function performUnitOfWork(fiber) {

    if (fiber.child) {
        return fiber.child
    }
    let nextFiber = fiber
    while (nextFiber) {
        if (nextFiber.sibling) {
            return nextFiber.sibling
        }
        nextFiber = nextFiber.return
    }
}
```

这里用 requestIdleCallback 代替 React 的时间分片，把 React Element 树转 fiber 的 reconcile 过程放到不同的任务里跑。

- 用 nextUnitOfWork 指向下一个要处理的 fiber 节点。
- 每次执行时判断 timeRemaining 是否接近 0，是的话就中断循环，等下次 requestIdleCallback 的回调再继续处理 nextUnitOfWork 指向的 fiber 节点。deadline.timeRemaining 是 requestIdleCallback 提供的，详见 [MDN 的文档](https://developer.mozilla.org/zh-CN/docs/Web/API/Background_Tasks_API#%E7%A4%BA%E4%BE%8B)。
- render 方法里设置初始 nextUnitOfWork。

这里有两个 root：一个是当前正在处理的 fiber 链表的根 wipRoot，一个是之前的历史 fiber 链表的根 currentRoot。为什么需要两个 root？因为初始渲染会生成一个 fiber 链表，后面 setState 更新会再生成一个新的 fiber 链表，两个 fiber 链表要做对比来决定对 dom 节点的增删改，所以都要保存。

performUnitOfWork 处理每个 fiber 节点之后，会按照 child、sibling、return 的顺序返回下一个要处理的 fiber 节点，通过这种顺序把 fiber 树变为链表。

处理每个 fiber 节点时，要根据类型做不同的处理：

```javascript
function performUnitOfWork(fiber) {
    const isFunctionComponent = fiber.type instanceof Function
    if (isFunctionComponent) {
        updateFunctionComponent(fiber)
    } else {
        updateHostComponent(fiber)
    }
    if (fiber.child) {
        return fiber.child
    }
    let nextFiber = fiber
    while (nextFiber) {
        if (nextFiber.sibling) {
            return nextFiber.sibling
        }
        nextFiber = nextFiber.return
    }
}

let wipFiber = null
let stateHookIndex = null

function updateFunctionComponent(fiber) {
  wipFiber = fiber
  stateHookIndex = 0
  wipFiber.stateHooks = []
  wipFiber.effectHooks = []

  const children = [fiber.type(fiber.props)]
  reconcileChildren(fiber, children)
}

function updateHostComponent(fiber) {
    if (!fiber.dom) {
        fiber.dom = createDom(fiber)
    }
    reconcileChildren(fiber, fiber.props.children)

}
```

函数组件（FunctionComponent）和原生标签（HostComponent）分别处理：

- 函数组件：传入 props 调用它，函数组件的返回值就是要继续 reconcile 的节点。这里用 wipFiber 指向当前处理的 fiber（nextUnitOfWork 指向的是下一个要处理的 fiber 节点），并用 stateHooks 数组存储 useState 的 hook 值、effectHooks 数组存储 useEffect 的 hook 值。
- 原生标签：创建它对应的 dom 节点。

创建 dom 的过程如下：

```javascript
function createDom(fiber) {
    const dom =
      fiber.type == "TEXT_ELEMENT"
        ? document.createTextNode("")
        : document.createElement(fiber.type)

    updateDom(dom, {}, fiber.props)

    return dom
}

const isEvent = key => key.startsWith("on")
const isProperty = key => key !== "children" && !isEvent(key)
const isNew = (prev, next) => key => prev[key] !== next[key]
const isGone = (prev, next) => key => !(key in next)

function updateDom(dom, prevProps, nextProps) {
  //Remove old or changed event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter(
      key => !(key in nextProps) || isNew(prevProps, nextProps)(key)
    )
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.removeEventListener(eventType, prevProps[name])
    })

  // Remove old properties
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach(name => {
      dom[name] = ""
    })

  // Set new or changed properties
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      dom[name] = nextProps[name]
    })

  // Add event listeners
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach(name => {
      const eventType = name.toLowerCase().substring(2)
      dom.addEventListener(eventType, nextProps[name])
    })
}
```

- 首先根据是文本节点还是元素节点，用 document.createTextNode 或 document.createElement 来创建。
- 然后更新 props：先删除旧的事件监听器、旧的属性，再添加新的属性、新的事件监听器。

### 第三步：diff 与 fiber 链表构建

继续处理子节点：

```javascript
function reconcileChildren(wipFiber, elements) {
    let index = 0
    let oldFiber = wipFiber.alternate?.child
    let prevSibling = null

    while ( index < elements.length || oldFiber != null) {
        const element = elements[index]
        let newFiber = null

        const sameType = element?.type == oldFiber?.type

        if (sameType) {
            newFiber = {
                type: oldFiber.type,
                props: element.props,
                dom: oldFiber.dom,
                return: wipFiber,
                alternate: oldFiber,
                effectTag: "UPDATE",
            }
        }
        if (element && !sameType) {
            newFiber = {
                type: element.type,
                props: element.props,
                dom: null,
                return: wipFiber,
                alternate: null,
                effectTag: "PLACEMENT",
            }
        }
        if (oldFiber && !sameType) {
            oldFiber.effectTag = "DELETION"
            deletions.push(oldFiber)
        }

        if (oldFiber) {
            oldFiber = oldFiber.sibling
        }

        if (index === 0) {
            wipFiber.child = newFiber
        } else if (element) {
            prevSibling.sibling = newFiber
        }

        prevSibling = newFiber
        index++
    }
}
```

在 wipRoot 上指定了 alternate（之前的 fiber 树），reconcile 创建新的 fiber 树时就可以和之前的做 diff，判断是新增、修改还是删除，打上对应的标记。

- 首先拿到 alternate 的 child，依次取 sibling，逐一和新的 fiber 节点对比。
- 然后根据对比结果创建新的 fiber 节点，也是先 child 后 sibling 的方式。这样遍历之前的 fiber 链表和生成新的 fiber 链表，新旧节点就能通过 alternate 一一对应起来。
- diff 两个 fiber 链表的做法：判断节点 type 是否一样。一样就是修改，不一样就是删除或者新增，打上对应的标记。

fiber 节点的字段含义：type、props 是类型和参数；dom 是对应的 dom 节点；alternate 是对应的旧 fiber 节点；effectTag 是增删改的标记。

deletions 数组保存要删除的节点，在 render 的时候初始化：

```javascript
let nextUnitOfWork = null
let wipRoot = null
let currentRoot = null
let deletions = null

function render(element, container) {
    wipRoot = {
        dom: container,
        props: {
            children: [element],
        },
        alternate: currentRoot,
    }

    deletions = []

    nextUnitOfWork = wipRoot
}
```

这样，从 wipRoot 开始逐渐 reconcile 构建新的 fiber 节点：根据 FunctionComponent 还是原生标签（HostComponent）分别执行函数和创建 dom，并对新旧 fiber 节点做 diff 打上增删改标记。reconcile 结束后，新的 fiber 链表就创建好了。

### 第四步：实现 useState 和 useEffect

函数组件可能会调用 useState 或者 useEffect，这两个 api 也要实现。state 和 effect 存在哪里？答案是在 fiber 上，用两个数组 stateHooks 和 effectHooks 分别存储。

先实现 useState：

```javascript
function useState(initialState) {
    const currentFiber = wipFiber;

    const oldHook = wipFiber.alternate?.stateHooks[stateHookIndex];

    const stateHook = {
      state: oldHook ? oldHook.state : initialState,
      queue: oldHook ? oldHook.queue : [],
    };

    stateHook.queue.forEach((action) => {
      stateHook.state = action(stateHook.state);
    });

    stateHook.queue = [];

    stateHookIndex++;
    wipFiber.stateHooks.push(stateHook);

    function setState(action) {
      const isFunction = typeof action === "function";

      stateHook.queue.push(isFunction ? action : () => action);

      wipRoot = {
        ...currentFiber,
        alternate: currentFiber,
      };
      nextUnitOfWork = wipRoot;
    }

    return [stateHook.state, setState];
}
```

在 fiber 节点上用 stateHooks 数组来存储 state，以及多次调用 setState 的回调函数。

- 比如连续调用三次 setState，state 是 0，queue 里就存了三个修改 state 的函数。
- 每次调用 useState 时会在 stateHooks 添加一个元素来保存 state。state 的初始值是上一次渲染的 state 值，也就是取 alternate 同一位置的 state。
- 对初始 state 执行多个 action（也就是 setState）之后，就拿到了最终的 state 值，修改完 state 之后清空 queue。比如初始 state 是 0，调用三次 action 之后，state 变为 3。
- setState 就是在 action 数组里添加新的 action，并且让 nextUnitOfWork 指向新的 wipRoot，从而开始新的一轮渲染。

然后是 useEffect：

```javascript
function useEffect(callback, deps) {
  const effectHook = {
    callback,
    deps,
    cleanup: undefined,
  };
  wipFiber.effectHooks.push(effectHook);
}
```

它就是在 fiber.effectHooks 上添加一个元素。这样，等 reconcile 结束，fiber 链表就构建好了，在 fiber 上打上了增删改的标记，并且也保存了要执行的 effect。

### 第五步：commit 阶段

接下来只要遍历构建好的 fiber 链表，执行增删改和 effect 函数即可，这个阶段是 commit。

requestIdleCallback 在不断执行，每次处理一部分 fiber 的 reconcile。只要在 reconcile 结束（没有 nextUnitOfWork）的时候执行 commit 就行了：

```javascript
if (!nextUnitOfWork && wipRoot) {
    commitRoot()
}
```

在 commitRoot 里，先把需要删除的节点都删掉，然后遍历 fiber 链表处理其它节点：

```javascript
function commitRoot() {
    deletions.forEach(commitWork)
    commitWork(wipRoot.child)
    currentRoot = wipRoot
    wipRoot = null
    deletions = []
}
```

这里要把当前 wipRoot 设置为 currentRoot，然后把它置空，代表这次 reconcile 结束；处理完之后把 deletions 数组里保存的要删除的节点置空。

commitWork 按照 child、sibling 的顺序递归遍历 fiber 链表：

```javascript
function commitWork(fiber) {
    if (!fiber) {
        return
    }

    commitWork(fiber.child)
    commitWork(fiber.sibling)
}
```

```javascript
function commitWork(fiber) {
    if (!fiber) {
        return
    }

    let domParentFiber = fiber.return
    while (!domParentFiber.dom) {
        domParentFiber = domParentFiber.return
    }
    const domParent = domParentFiber.dom

    if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
        domParent.appendChild(fiber.dom)
    } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
        updateDom(fiber.dom, fiber.alternate.props, fiber.props)
    } else if (fiber.effectTag === "DELETION") {
        commitDeletion(fiber, domParent)
    }

    commitWork(fiber.child)
    commitWork(fiber.sibling)
}
```

- 首先，不断向上找到可以挂载的 dom 节点。
- 然后按照增删改的 effectTag 分别处理。

```javascript
function commitDeletion(fiber, domParent) {
    if (fiber.dom) {
        domParent.removeChild(fiber.dom)
    } else {
        commitDeletion(fiber.child, domParent)
    }
}
```

删除时，如果当前 fiber 节点没有对应的 dom，就不断 child 向下找。遍历完一遍之后，dom 的增删改就完成了。

此外还需要处理 effect。它同样要遍历 fiber 链表：先遍历一遍执行所有的 cleanup 函数，然后再次遍历执行 effect 函数。

```javascript
function commitEffectHooks() {
    function runCleanup(fiber){
        if (!fiber) return;

        fiber.alternate?.effectHooks?.forEach((hook, index)=>{
            const deps = fiber.effectHooks[index].deps;

            if (!hook.deps || !isDepsEqual(hook.deps, deps)) {
                hook.cleanup?.();
            }
        })

        runCleanup(fiber.child);
        runCleanup(fiber.sibling);
    }

    function run(fiber) {
        if (!fiber) return;

        fiber.effectHooks?.forEach((newHook, index) => {
            if(!fiber.alternate) {
                newHook.cleanup = newHook.callback();
                return;
            }

            if(!newHook.deps) {
                newHook.cleanup = newHook.callback();
            }

            if (newHook.deps.length > 0) {
                const oldHook = fiber.alternate?.effectHooks[index];

                if(!isDepsEqual(oldHook.deps, newHook.deps)) {
                    newHook.cleanup = newHook.callback()
                }
            }
        });

        run(fiber.child);
        run(fiber.sibling);
    }

    runCleanup(wipRoot);
    run(wipRoot);
}

function isDepsEqual(deps, newDeps) {
    if(deps.length !== newDeps.length) {
        return false;
    }

    for(let i = 0; i < deps.length; i++) {
        if(deps[i] !== newDeps[i]) {
            return false;
        }
    }
    return true;
}

```

这里遍历 fiber 链表也是递归处理每个节点，每个节点递归处理 child、sibling。

- 当没有传入 deps 数组，或者 deps 数组和上次不一致时，先执行 cleanup 函数。比如：

```javascript
useEffect(() => {
    const timer = setTimeout(() => {

    }, 1000);
    return () => clearTimeout(timer);
})
```

  没有传入 deps 或者 deps 数组变化的时候，会先执行上次的 cleanup 函数（也就是 clearTimeout），之后才重新执行 effect。
- 当没有 alternate 的时候（首次渲染），直接执行所有的 effect；否则，没传入 deps 或者 deps 数组变化时才执行 effect 函数。

这样，commit 阶段遍历 fiber 链表完成了 dom 的增删改并执行了 effect 函数。至此，渲染流程的两大阶段 render 和 commit 都完成了。

### 整体测试

导出 render、useState、useEffect 的 api，挂到 MiniReact 上：

```javascript
const MiniReact = {
    createElement,
    render,
    useState,
    useEffect,
};
window.MiniReact = MiniReact;
```

然后把实现包在一个立即执行函数里，只把 MiniReact 挂到 window 上，避免污染全局变量。

整体测试如下。修改 index.jsx：

```javascript
const { render, useState, useEffect } = window.MiniReact;

function App() {
  const [count,setCount] = useState(0)

  function handleClick(){
    setCount((count)=> count + 1)
  }

  return <div>
    <p>{count}</p>
    <button onClick={handleClick}>加一</button>
  </div>;
}

render(<App/>, document.getElementById('root'));
```

运行正常。再测试 useEffect：

```javascript
const { render, useState, useEffect } = window.MiniReact;

function App() {
  const [count,setCount] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
        setCount((count)=> count + 1)
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return <div>
    <p>{count}</p>
  </div>;
}

render(<App/>, document.getElementById('root'));
```

同样正常。然后抽离一个组件，传入初始值和定时器的时间间隔：

```javascript
const { render, useState, useEffect } = window.MiniReact;

function Counter(props) {
  const {
    initialNum,
    interval
  } = props;

  const [count, setCount] = useState(initialNum)

  useEffect(() => {
    const timer = setInterval(() => {
        setCount((count)=> count + 1)
    }, interval);
    return () => clearInterval(timer);
  }, []);

  return <div>
    <p>{count}</p>
  </div>;
}

function App() {
  return <Counter interval={1000} initialNum={10}></Counter>
}

render(<App/>, document.getElementById('root'));
```

Counter 组件有 interval 和 initialNum 两个参数，运行同样没有问题。

Mini React 到此完成。案例代码见 [GitHub 仓库](https://github.com/QuarkGluonPlasma/react-course-code/tree/main/mini-react)。

### 实现小结

- JSX 转 render function 这一步由 babel 或 tsc 等编译器完成。
- 实现 React.createElement 函数，执行后返回 React Element 树（vdom）。
- 通过 requestIdleCallback 在空闲时执行 React Element 转 fiber 的 reconcile 流程，按函数组件 FunctionComponent 或原生标签 HostComponent 分别执行函数或创建 dom。
- reconcile 子节点时和 alternate 对比，判断新增、修改、删除并打上标记；过程中调用的 useState、useEffect 会写入对应 fiber 节点的 hooks 数组。
- commit 阶段从根节点遍历 fiber 链表，根据标记执行 dom 增删改并执行 effect 函数；useState 的 setState 设置新的 nextUnitOfWork，触发新一轮渲染。

## 调试：对比 React 源码

Mini React 和真实的 React 渲染流程是否一致？可以调试 react 源码对比差别。

用 cra 创建一个 react 项目：

```
npx create-react-app --template=typescript react-source-debug
```

> 注：create-react-app 已被 React 官方弃用（2025 年起），新项目建议使用 Vite 等脚手架。这里仅作为当时的调试示例保留。

把开发服务跑起来：

```
npm run start
```

浏览器访问确认无误后，点击 create a launch.json file 创建调试配置：

```json
{
    "type": "chrome",
    "request": "launch",
    "name": "Launch Chrome against localhost",
    "url": "http://localhost:3000",
    "webRoot": "${workspaceFolder}"
}
```

### 对比 render function

在 App.tsx 打断点并点击调试启动，代码会断住。

jsx 会编译成 render function，执行后产生 React Element。关掉 sourcemap 重新调试，可以看到 jsxDEV 就是 render function，它是从 react 包引入的，与在 babel playground 里看到的结果一致。点击跳断点执行并进入函数内部，在返回值处打断点，可以看到 render function 返回的是一个 React Element，有 type、props 等属性。Mini React 中实现的 render function 与之对应。

### 对比 schedule 和 reconcile

打开 sourcemap 重新调试，在调用栈可以看到 workLoop。这个是 scheduler 包里的，该包是 react 实现的类似 requestIdleCallback 的功能。

- 每次取一个任务的回调来跑，回调里判断是否要用时间分片。
- 时间分片就是把 reconcile 过程分散到多个宏任务中跑。在 scheduler 里搜索可以看到，时间分片是 5ms，也就是说超过 5ms 就会放到下个任务里跑。
- 这也是 performance 里看到的 event loop 的形态：react 并发渲染时，通过时间片是否到了来判断是否继续 reconcile。

Mini React 实现时没有自己实现 scheduler 的时间分片，而是直接用浏览器的 requestIdleCallback api，效果一样。

接下来看 reconcile 的过程。react 源码里处理每个 fiber 节点时会先调用 beginWork，等 fiber 节点全部处理完（没有 next 的 fiber 节点）再调用 completeWork。

- beginWork 根据 fiber 节点的类型走不同分支（Mini React 只处理了 FunctionComponent 和 HostComponent 类型）。FunctionComponent 的处理同样是调用函数组件，拿到 children 后继续 reconcileChildren；reconcileChildren 对比新旧 fiber 做 diff，打上增删改标记，分别打上 Placement、ChildDeletion 等标记。这部分和 Mini React 实现的 reconcile 逻辑基本一致。
- completeWork 处理到 HostComponent 时会创建对应的 dom，保存在 fiber.stateNode 属性上——注意 HostComponent 的 beginWork 里并没有创建 dom，这部分逻辑在 completeWork 里（Mini React 是在 updateHostComponent 里创建的）。

为什么要分为 beginWork 和 completeWork 两个阶段？以创建 dom 为例：需要先把所有子节点的 dom 都创建好，然后 appendChild 才行，所以需要 beginWork 处理完所有 fiber 之后，再递归从下往上处理。

### 对比 commit 阶段

react 源码的 commit 阶段分为 before mutation、mutation、layout 三个小阶段：

- mutation 阶段负责更新 dom，把 reconcile 阶段创建好的 dom 更新到 dom 树。
- 刚进入 commitRoot 的时候，就会调度所有的 useEffect 的回调异步执行。

### 对比 hooks 实现

fiber 上有一个 memoizedState 的链表，每个节点保存一个 hook 的信息。调用 useState、useRef、useEffect 等 hook 的时候，会往对应的链表节点上存取内容。

hook 链表的创建分为 mount、update 两个阶段：第一次创建链表节点，第二次更新链表节点。

- useRef：在对应 hook 节点的 memoizedState 属性保存一个有 current 属性的对象，第二次调用返回这个对象。
- useCallback：在对应 hook 节点的 memoizedState 属性保存一个数组，再次调用判断 deps 是否一样，一样就返回之前数组的第一个元素，否则更新。
- useMemo：实现与 useCallback 差不多，只不过保存的是函数执行后的返回值。

### 源码对比小结

与 Mini React 对应的 react 源码实现理清之后，对比结果如下：

- 相同点：实现 render function 返回 React Element；React Element 树经过 reconcile 变成 fiber 树，reconcile 时根据不同类型做不同处理；commit 阶段执行 dom 增删改和 effect。
- 不同点：
  - react 源码的 render 阶段 reconcile 分成 beginWork、completeWork 两个小阶段，dom 的创建和组装在 completeWork 里做。
  - commit 阶段分成 before mutation、mutation、layout 三个小阶段。
  - react 的调度用自己实现的 scheduler 完成，实现了时间分片；Mini React 用 requestIdleCallback 做调度。
  - react 的 hook 值存放在 fiber.memoizedState 链表上，每个 hook 对应一个节点；Mini React 用 fiber 上的其他属性存储。保存 dom 的节点在 react 里用 fiber.stateNode 属性。

总体来说流程一致，通过 Mini React 可以很好地理解 react 的实现原理。

## 继续阅读

- 上一篇：[14-ReactPlayground项目实战](../08-项目实战/14-ReactPlayground项目实战)
- 下一篇：[16-React18的并发机制是怎么实现的](16-React18的并发机制是怎么实现的)
