---
title: "JSX"
description: 通过可控性 render 实践掌握 React.Children.toArray / isValidElement / cloneElement 对 JSX 编译产物的操作，并梳理 @babel 插件解析 JSX 的 Automatic 与 Classic 两种运行时。
keywords: [JSX]
category: React
tags: [React, 基础概念]
---

# JSX

## 学习目标

- 掌握 进阶实践-可控性 render
- 掌握 @babel/plugin-syntax-jsx 和 @babel/plugin-transform-react-jsx
- 掌握 api层面模拟实现

## 进阶实践-可控性 render

本节的实践 demo（完整代码见下文 `controlRender`）暴露出了如下问题：

1. 返回的 `children` 虽然是一个数组，但是数组里面的数据类型却是不确定的，有对象类型( 如`ReactElement` ) ，有数组类型(如 `map` 遍历返回的子节点)，还有字符串类型(如文本)；
2. 无法对 render 后的 React element 元素进行可控性操作。

针对上述问题，我们需要对demo项目进行改造处理，具体过程可以分为4步：

1. 将上述children扁平化处理，将数组类型的子节点打开 ； 
2. 干掉children中文本类型节点；
3. 向children最后插入<div className="last" > say goodbye</div>元素；
4. 克隆新的元素节点并渲染。


希望通过这个实践 demo ，大家可以**加深对 jsx 编译后结构的认识，学会对 jsx 编译后的 React.element 进行一系列操作，达到理想化的目的，以及熟悉 React API 的使用。**

由于，我们想要把 render 过程变成可控的，因此需要把上述代码进行改造。先看 demo 的原始代码：

````js
class Index extends React.Component{
    status = false /* 状态 */
    renderFoot=()=> <div> i am foot</div>
    /* 控制渲染 */
    controlRender=()=>{
        const reactElement = (
            <div style={{ marginTop:'100px' }} className="container"  >   
                 { /* element 元素类型 */ }
                <div>hello,world</div>  
                { /* fragment 类型 */ }
                <React.Fragment>      
                    <div> 👽👽 </div>
                </React.Fragment>
                { /* text 文本类型 */ }
                my name is alien       
                { /* 数组节点类型 */ }
                { toLearn.map(item=> <div key={item} >let us learn { item } </div> ) } 
                { /* 组件类型 */ }
                <TextComponent/>  
                { /* 三元运算 */  }
                { this.status ? <TextComponent /> :  <div>三元运算</div> }  
                { /* 函数执行 */ } 
                { this.renderFoot() }  
                <button onClick={ ()=> console.log( this.render() ) } >打印render后的内容</button>
            </div>
        )
        console.log(reactElement)
        const { children } = reactElement.props
        /* 第1步 ： 扁平化 children  */
        const flatChildren = React.Children.toArray(children)
        console.log(flatChildren)
        /* 第2步 ： 除去文本节点 */
        const newChildren :any= []
        React.Children.forEach(flatChildren,(item)=>{
            if(React.isValidElement(item)) newChildren.push(item)
        })
        /* 第3步，插入新的节点 */
        const lastChildren = React.createElement(`div`,{ className :'last' } ,`say goodbye`)
        newChildren.push(lastChildren)

        /* 第4步：修改容器节点 */
        const newReactElement =  React.cloneElement(reactElement,{} ,...newChildren )
        return newReactElement
    }
    render(){
        return this.controlRender()
    }
}
````
**第 1 步：`React.Children.toArray` 扁平化，规范化 children 数组。**

````js
const flatChildren = React.Children.toArray(children)
console.log(flatChildren)
````
React.Children.toArray 可以扁平化、规范化 React.element 的 children 组成的数组，只要 children 中的数组元素被打开，对遍历 children 很有帮助，而且 React.Children.toArray 还可以深层次 flat 。


**第 2 步：遍历 children ，验证 React.element 元素节点，除去文本节点。**

````js
const newChildren :any= []
React.Children.forEach(flatChildren,(item)=>{
    if(React.isValidElement(item)) newChildren.push(item)
})
````

用 React.Children.forEach 去遍历子节点，如果是 react Element 元素，就添加到新的 children 数组中，通过这种方式过滤掉非 React element 节点。React.isValidElement 这个方法可以用来检测是否为 React element 元素，接收一个参数——待验证对象，如果是返回 true ， 否则返回 false 。

这里可能会有一个疑问就是如下：<br/>

 难道用数组本身方法 filter 过滤不行么 ？ 为什么要用 React.Children.forEach 遍历？

这种情况下，是完全可以用数组方法过滤的，因为 React.Children.toArray 已经处理了 children ，使它变成了正常的数组结构 也就是说 `React.Children.forEach` =  `React.Children.toArray` + `Array.prototype.forEach`。

React.Children.forEach 本身就可以把 children 扁平化了，也就是上述第一步操作多此一举了。为什么要有第一步，主要是更多的学习一下 React api。


**第 3 步：用 React.createElement ，插入到 children 最后**

````js
 /* 第三步，插入新的节点 */
const lastChildren = React.createElement(`div`,{ className :'last' } ,`say goodbye`)
newChildren.push(lastChildren)
````
上述代码实际等于用 `JSX` 这么写：

````js
newChildren.push(<div className="last" >say goodbye</div>)
````
**第 4 步: 已经修改了 children，现在做的是，通过 cloneElement 创建新的容器元素。**

为什么要用 React.cloneElement ，createElement 把上面写的 jsx，变成 element 对象;  而 cloneElement 的作用是以 element 元素为样板克隆并返回新的 React element 元素。返回元素的 props 是将新的 props 与原始元素的 props 浅层合并后的结果。

这里 React.cloneElement 做的事情就是，把 reactElement 复制一份，再用新的 children 属性，从而达到改变 render 结果的目的。

````js
/* 第 4 步：修改容器节点 */
const newReactElement =  React.cloneElement(reactElement,{} ,...newChildren )
````

**效果验证**

验证 ：
* ① children 已经被扁平化。
* ② 文本节点 ` my name is alien ` 已经被删除。
* ③ `<div className="last" > say goodbye</div>` 元素成功插入。

**达到了预期效果。**

## 面试要点

问: React.createElement 和 React.cloneElement 到底有什么区别呢?

答: 可以完全理解为，一个是用来创建 element 。另一个是用来修改 element，并返回一个新的 React.element 对象。

## Babel 解析 JSX 流程

### 1 @babel/plugin-syntax-jsx 和 @babel/plugin-transform-react-jsx

JSX 语法实现来源于这两个 babel 插件：

* @babel/plugin-syntax-jsx ： 使用这个插件，能够让 Babel 有效的解析 JSX 语法。
* @babel/plugin-transform-react-jsx ：这个插件内部调用了 @babel/plugin-syntax-jsx，可以把 React JSX 转化成 JS 能够识别的 createElement 格式。

**Automatic Runtime**

新版本 React 已经不需要引入 createElement ，这种模式来源于 ` Automatic Runtime`，看一下是如何编译的。

业务代码中写的 JSX 文件：

````js
function Index(){
    return <div>
        <h1>hello,world</h1>
        <span>let us learn React</span>
    </div>
}
````

被编译后的文件：

````js
import { jsx as _jsx } from "react/jsx-runtime";
import { jsxs as _jsxs } from "react/jsx-runtime";
function Index() {
  return  _jsxs("div", {
            children: [
                _jsx("h1", {
                   children: "hello,world"
                }),
                _jsx("span", {
                    children:"let us learn React" ,
                }),
            ],
        });
}
````

@babel/plugin-transform-react-jsx 已经向文件中提前注入了 jsx-runtime 的 api。不过这种模式下需要我们在 .babelrc 设置 runtime: automatic 。

````json
"presets": [    
    ["@babel/preset-react",{
    "runtime": "automatic"
    }]     
],
````

**Classic Runtime**

还有一个就是经典模式，在经典模式下，使用 JSX 的文件需要引入 React ，不然就会报错。

业务代码中写的 JSX 文件：

````js
import React from 'react'
function Index(){
    return <div>
        <h1>hello,world</h1>
        <span>let us learn React</span>
    </div>
}
````

被编译后的文件：

````js
import React from 'react'
function Index(){
    return  React.createElement(
        "div",
        null,
        React.createElement("h1", null,"hello,world"),
        React.createElement("span", null, "let us learn React")
    );
}
````

### 2 api层面模拟实现

接下来我们通过 api 的方式来模拟一下 Babel 处理 JSX 的流程。 

第一步：创建 element.js，写下将测试的 JSX 代码。

````js
import React from 'react'

function TestComponent(){
    return <p> hello,React </p>
}
function Index(){
    return <div>
        <span>模拟 babel 处理 jsx 流程。</span>
        <TestComponent />
    </div>
}
export default Index
````

第二步：因为 babel 运行在 node 环境，所以同级目录下创建 jsx.js 文件。来模拟一下编译的效果。

````js
const fs = require('fs')
const babel = require("@babel/core")

/* 第一步：模拟读取文件内容。 */
fs.readFile('./element.js',(e,data)=>{ 
    const code = data.toString('utf-8')
    /* 第二步：转换 jsx 文件 */
    const result = babel.transformSync(code, {
        plugins: ["@babel/plugin-transform-react-jsx"],
    });
    /* 第三步：模拟重新写入内容。 */
    fs.writeFile('./element.js',result.code,function(){})
})
````
如上经过三步处理之后，再来看一下 element.js 变成了什么样子。

````js
import React from 'react';

function TestComponent() {
  return /*#__PURE__*/React.createElement("p", null, " hello,React ");
}

function Index() {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", null, "\u6A21\u62DF babel \u5904\u7406 jsx \u6D41\u7A0B\u3002"), /*#__PURE__*/React.createElement(TestComponent, null));
}
export default Index;
````

如上可以看到已经成功转成 React.createElement 形式，从根本上弄清楚了 Babel 解析 JSX 的大致流程。


## 总结

本章节主要讲到了两方面的知识。

一方面，我们写的 JSX 会先转换成 React.element，再转化成 React.fiber 的过程。这里要牢牢记住 jsx 转化成 element 的处理逻辑，还有就是 element 类型与转化成 fiber 的 tag 类型的对应关系。这对后续的学习会很有帮助。

另一方面，通过学习第一个实践 demo，我们掌握了如何控制经过 render 之后的 React element 对象。

同时也搞清楚了 Babel 解析 JSX 的大致流程。

下一章节，我们将从React组件角度出发，全方面认识React组件。


### [案例代码的 GitHub 地址](https://github.com/GoodLuckAlien/React-Advanced-Guide-Pro)（点击即可跳转）
## 继续阅读

- 上一篇：[00-React 发展历史](00-React%20发展历史)
- 下一篇：[02-Component组件](02-Component组件)
