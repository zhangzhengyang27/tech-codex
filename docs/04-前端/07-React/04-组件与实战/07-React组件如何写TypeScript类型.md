---
title: "React组件如何写TypeScript类型"
description: "React 组件的 TypeScript 类型写法：JSX.Element / ReactElement / ReactNode 的关系、FunctionComponent、各 hook 的类型参数，以及 PropsWithChildren、CSSProperties、HTMLAttributes、ComponentProps、EventHandler。"
keywords: [React组件如何写TypeScript类型]
category: React
tags: [React, 组件与实战]
---

# React组件如何写TypeScript类型

## 学习目标

- 掌握 JSX 的类型
- 掌握 函数组件的类型
- 掌握 hook 的类型

## JSX 的类型

在 App.tsx 里开始练习 TypeScript 类型：

```javascript
interface AaaProps {
  name: string;
}

function Aaa(props: AaaProps) {
  return <div>aaa, {props.name}</div>
}

function App() {
  return <div>
    <Aaa name="guang"></Aaa>
  </div>
}

export default App;
```

其实组件我们一般不写返回值类型，就用默认推导出来的。

React 函数组件默认返回值就是 JSX.Element。

我们看下 JSX.Element 的类型定义：

```javascript
const content: JSX.Element = <div>aaa</div>
```
可以看到它就是 React.ReactElement。

也就是说，如果你想描述一个 jsx 类型，就用 React.ReactElement 就好了。

比如 Aaa 组件有一个 content 的 props，类型为 ReactElement：

这样就只能传入 JSX。

跑一下：
```
npm run start
```

ReactElement 就是 jsx 类型，但如果你传入 null、number 等就报错了。

那如果有的时候就是 number、null 呢？

换成 ReactNode 就好了。

看下它的类型定义：ReactNode 包含 ReactElement、或者 number、string、null、boolean 等可以写在 JSX 里的类型。

这三个类型的关系 ReactNode > ReactElement > JSX.Element。

所以，一般情况下，如果你想描述一个参数接收 JSX 类型，就用 ReactNode 就行。

## 函数组件的类型

前面的函数组件，我们都没明确定义类型：

其实它的类型是 FunctionComponent：

```javascript
const Aaa: React.FunctionComponent<AaaProps> = (props) => {
  return <div>aaa, {props.name}</div>
}
```

看下它的类型定义：

可以看到，FC 和 FunctionComponent 等价，参数是 Props，返回值是 ReactNode（React 19 起还允许返回 Promise<ReactNode>，用于异步组件）。

而且函数组件还可以写几个可选属性，这些用到了再说。

## hook 的类型

接下来过一下 hook 的类型：

### useState

先从 useState 开始：

一般用推导出的类型就行：

```javascript
const [num, setNum] = useState(0); // 推导为 number
```

也可以手动声明类型：

```javascript
const [num, setNum] = useState<number>(0);
```

useEffect 和 useLayoutEffect 这种没有类型参数的就不说了。

### useRef

useRef 我们知道，可以保存 dom 引用或者其他内容。

它的类型在 React 18 和 React 19 的 @types/react 里有些区别，这里以 React 19 的类型为准。

保存 dom 引用的时候，参数需要传个 null；保存其他内容的时候，传入初始值即可（React 19 起 useRef 要求必须传入一个初始值参数，不传会直接报类型错误）：

```javascript
const inputRef = useRef<HTMLInputElement>(null); // 保存 dom 引用
const numRef = useRef(0);                       // 保存其他内容
```

看下类型就知道了：

在 @types/react 19 中，无论传 null 还是普通值，返回的都是 RefObject，它的 current 是可写的；MutableRefObject 已被标记为 deprecated，统一用 RefObject 就可以了。

> 注：React 18 的类型里，传入 null 返回的 RefObject 的 current 是只读的，用于保存 dom 引用；不传 null 返回的是 MutableRefObject，current 可以修改。React 19 的类型里取消了只读的区分，并要求 useRef 必须传入初始值参数。

所以，React 19 下直接用 useRef 传入初始值就行了，dom 引用传 null，其他内容传对应的初始值。

### useImperativeHandle

我们前面写过 forwardRef + useImperativeHandle 的例子，是这样的：
```javascript
import { useRef } from 'react';
import { useEffect } from 'react';
import React from 'react';
import { useImperativeHandle } from 'react';

interface GuangProps {
  name: string;
}

interface GuangRef {
  aaa: () => void;
}

const Guang: React.ForwardRefRenderFunction<GuangRef, GuangProps> = (props, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => {
    return {
      aaa() {
        inputRef.current?.focus();
      }
    }
  }, [inputRef]);

  return <div>
    <input ref={inputRef}></input>
    <div>{props.name}</div>
  </div>
}

const WrapedGuang = React.forwardRef(Guang);

function App() {
  const ref = useRef<GuangRef>(null);

  useEffect(()=> {
    console.log('ref', ref.current)
    ref.current?.aaa();
  }, []);

  return (
    <div className="App">
      <WrapedGuang name="guang" ref={ref}/>
    </div>
  );
}

export default App;
```

forwardRef 包裹的组件会额外传入 ref 参数，所以它不是 FunctionComponent 类型，而是专门的 ForwardRefRenderFunction 类型。

它有两个类型参数，第一个是 ref 内容的类型，第二个是 props 的类型：

其实 forwardRef 也是这两个类型参数，所以写在 forwardRef 上也行：

```javascript
import { useRef } from 'react';
import { useEffect } from 'react';
import React from 'react';
import { useImperativeHandle } from 'react';

interface GuangProps {
  name: string;
}

interface GuangRef {
  aaa: () => void;
}

const WrapedGuang = React.forwardRef<GuangRef, GuangProps>((props, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => {
    return {
      aaa() {
        inputRef.current?.focus();
      }
    }
  }, [inputRef]);

  return <div>
    <input ref={inputRef}></input>
    <div>{props.name}</div>
  </div>
});

```

useImperativeHandle 可以有两个类型参数，一个是 ref 内容的类型，一个是 ref 内容扩展后的类型。

useImperativeHandle 传入的函数的返回值就要求满足第二个类型参数的类型。

不过一般没必要写，因为传进来的 ref 就已经是有类型的了，直接用默认推导的就行。

### useReducer

useReducer 可以传一个类型参数也可以传两个：

当传一个的时候，是 Reducer<xx,yy> 类型，xx 是 state 的类型，yy 是 action 的类型。

当传了第二个的时候，就是传入的初始化函数参数的类型。

### 其余 hook

剩下的 hook 的类型比较简单，我们快速过一遍：

useCallback 的类型参数是传入的函数的类型。

useMemo 的类型参数是传入的函数的返回值类型。

useContext 的类型参数是 Context 内容的类型。

当然，这些都没必要手动声明，用默认推导的就行。

再就是 memo：

它可以直接用包裹的函数组件的参数类型，也可以在类型参数里声明。

## 参数类型

回过头来，我们再来看传入组件的 props 的类型。

### PropsWithChildren

前面讲过，jsx 类型用 ReactNode，比如这里的 content 参数：

如果你不想通过参数传入内容，可以在 children 里：

这时候就要声明 children 的类型为 ReactNode：

```javascript
import React, { ReactNode } from "react";

interface CccProps {
  content: ReactNode,
  children: ReactNode
}

function Ccc(props: CccProps) {
  return <div>ccc,{props.content}{props.children}</div>
}

function App() {

  return <div>
    <Ccc content={<div>666</div>}>
      <button>7777</button>
    </Ccc>
  </div>
}

export default App;
```

但其实没有必要自己写，传 children 这种情况太常见了，React 提供了相关类型：

```javascript
type CccProps = PropsWithChildren<{
  content: ReactNode,
}>
```

看下它的类型定义，就是给 Props 加了一个 children 属性。

### CSSProperties

有时候组件可以通过 props 传入一些 css 的值，这时候怎么写类型呢？

用 CSSProperties。

比如加一个 color 参数：

或者加一个 styles 参数。

可以看到，提示出了 css 的样式名，以及可用的值：

```javascript
import React, { CSSProperties, PropsWithChildren, ReactNode } from "react";

type CccProps = PropsWithChildren<{
  content: ReactNode,
  color: CSSProperties['color'],
  styles: CSSProperties
}>


function Ccc(props: CccProps) {
  return <div>ccc,{props.content}{props.children}</div>
}

function App() {

  return <div>
    <Ccc content={<div>666</div>} color="yellow" styles={{
      backgroundColor: 'blue'
    }}>
      <button>7777</button>
    </Ccc>
  </div>
}

export default App;
```

## HTMLAttributes

如果你写的组件希望可以当成普通 html 标签一样用，也就是可以传很多 html 的属性作为参数呢？

那可以继承 HTMLAttributes：

继承后编辑器就会提示很多 html 的属性。

```javascript
import React, { HTMLAttributes } from "react";

interface CccProps extends HTMLAttributes<HTMLDivElement>{

    } 

function Ccc(props: CccProps) {
  return <div>ccc</div>
}

function App() {

  return <div>
    <Ccc title="hello">
      <button>7777</button>
    </Ccc>
  </div>
}

export default App;
```

那 HTMLAttributes 的类型参数是干嘛的呢？

是其中一些 onClick、onMouseMove 等事件处理函数的类型参数：

当然，继承 HTMLAttributes 只有 html 通用属性，有些属性是某个标签特有的，这时候可以指定 FormHTMLAttributes、AnchorHTMLAttributes 等：

比如 a 标签的属性，会有 href。

### ComponentProps

继承 html 标签的属性，前面用的是 HTMLAttributes：

其实也可以用 ComponentProps，效果一样。

ComponentProps 的类型参数是标签名，比如 a、div、form 这些。

## EventHandler

很多时候，组件需要传入一些事件处理函数，比如 clickHandler：

```javascript
import React, { HTMLAttributes, MouseEventHandler } from "react";

interface CccProps {
  clickHandler: MouseEventHandler
} 

function Ccc(props: CccProps) {
  return <div onClick={props.clickHandler}>ccc</div>
}

function App() {

  return <div>
    <Ccc clickHandler={(e) => {
      console.log(e);
    }}></Ccc>
  </div>
}

export default App;
```
这种参数就要用 xxxEventHandler 的类型，比如 MouseEventHandler、ChangeEventHandler 等，它的类型参数是元素的类型。

或者不用 XxxEventHandler，自己声明一个函数类型也可以：

```javascript
interface CccProps {
  clickHandler: (e: MouseEvent<HTMLDivElement>) => void
} 
```
案例代码上传了[小册仓库](https://github.com/QuarkGluonPlasma/react-course-code/tree/main/react-ts)。

## 总结

我们过了一遍写 React 组件会用到的类型：

- **ReactNode**：JSX 的类型，一般用 ReactNode，但要知道 ReactNode、ReactElement、JSX.Element 的关系

- **FunctionComponent**：也可以写 FC，第一个类型参数是 props 的类型

- **useRef 的类型**：React 19 的类型里传入初始值即可，返回 RefObject，current 可读写，dom 引用传 null；React 18 类型里 RefObject（current 只读）与 MutableRefObject（可写）的区分在 React 19 中已取消，MutableRefObject 标记为 deprecated。

- **ForwardRefRenderFunction**：第一个类型参数是 ref 的类型，第二个类型参数是 props 的类型。forwardRef 和它类型参数一样，也可以写在 forwardRef 上

- **useReducer**：第一个类型参数是 Reducer<data 类型, action 类型>，第二个类型参数是初始化函数的参数类型。

- **PropsWithChildren**：可以用来写有 children 的 props

- **CSSProperties**： css 样式对象的类型

- **HTMLAttributes**：组件可以传入 html 标签的属性，也可以指定具体的 ButtonHTMLAttributes、AnchorHTMLAttributes。

- **ComponentProps**：类型参数传入标签名，效果和 HTMLAttributes 一样

- **EventHandler**：事件处理器的类型

后面写 React 组件的时候，会大量用到这些 typescript 的类型。

## 继续阅读

- 上一篇：[06-Hook的闭包陷阱的成因和解决方案](06-Hook的闭包陷阱的成因和解决方案)
- 下一篇：[08-React组件如何调试](08-React组件如何调试)
