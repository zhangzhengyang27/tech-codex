---
title: 用 Taro 实现一个简单的 Todo 项目
description: "使用 taro init 创建一个 Todolist 项目并了解其目录结构，逐步实现事项的添加与删除功能，最后补充样式并在微信小程序与 H5 端查看运行效果。"
keywords: [Taro, 实现一个简单的, Todo, 项目]
category: Taro
tags: [Taro, 小程序, 跨端, React]
---

::: warning 版本提示
Taro 4.x 已发布,本文基于 Taro 1.x/2.x,API 与编译机制已有重大变化,仅作架构与思路参考。
:::

# 用 Taro 实现一个简单的 Todo 项目

## 概念说明

按安装章节完成 Taro 安装后，可以通过实现一个简单的 Todo 项目完成首次实战。项目包含两个功能：

- 输入事项：点击「添加」按钮增加一个事项；
- 删除事项：点击事项列表里事项后面的「删除」按钮将删除该事项。

实现过程覆盖 Taro 项目创建、目录结构、组件引入（`View`/`Text`/`Input`）、事件绑定（`onInput`/`onClick`）、`state` 状态更新与 `rpx` 样式。

## 创建项目

首先进入存放本项目的目录，使用 Taro 创建一个 Todolist 项目，即输入命令 `taro init todoList`（todoList 为项目名称，也可指定其他名称）。

创建项目成功后，先看当前的项目结构。

 `src` 文件夹存放开发时的文件，包括一个根目录的全局配置文件 `app.js`，全局样式 `app.scss`，入口 HTML 文件 `index.html`。`index.html` 里内置了 `rem` 转换代码（这个不需要关注）。而 `src` 目录 `pages` 下则对应的是项目的每一个页面，这里默认只有一个 `index` 页面，每一个页面下又包含 JS 文件和样式文件两个文件，这里即 `index.js` 和 `index.scss`。
 
 如需创建组件，可以在 `src` 创建 `component` 目录来统一存放组件。

了解目录以后，找到 `src` 目录 `pages` 下的 `index.js`（即默认页面）。

``` JavaScript
import Taro, { Component } from '@tarojs/taro'
import { View, Text } from '@tarojs/components'
import './index.scss'

export default class Index extends Component {

  config = {
    navigationBarTitleText: '首页'
  }

  componentWillMount () { }

  componentDidMount () { }

  componentWillUnmount () { }

  componentDidShow () { }

  componentDidHide () { }

  render () {
    return (
      <View className='index'>
        <Text>Hello world!</Text>
      </View>
    )
  }
}

```
文件开始第 1 行默认引入 Taro 的 `Component` 组件，它主要用来做组件化，此处暂时不用了解它；接着第 2 行是引入要用到的 `View` 和 `Text`，下文用到的 `Input` 组件也将在这里引入；接下来第 3 行是引入样式对应的样式文件。

正式开始写代码前，先看看默认页面的效果。可以选择小程序的方式在微信开发者工具里查看（《微信小程序开发入门与技术选型》里有相关介绍）或 H5 的方式在浏览器里查看。在命令行进行项目构建：

``` bash
# 小程序构建
$ taro build --type weapp --watch
# H5构建
$ taro build --type h5 --watch
```

## 渲染事项列表

接下来正式开始编写 Todolist：把事项列表存在 `state` 里并给几个默认事项，最后把它渲染出来。

``` JavaScript
// ...
export default class Index extends Component {
  config = {
    navigationBarTitleText: '首页'
  }

  constructor (props) {
    super (props)
    this.state = {
      // 创建一个初始的 Todolist
      list: [
        'get up',
        'coding',
        'sleep',
      ],
      inputVal: ''
    }
  }
  
  render () {
    let { list, inputVal } = this.state

    return (
      <View className='index'>
        <View className='list_wrap'>
          <Text>Todo list</Text>
          {
            list.map((item, index) => {
              return <View>
                <Text>{index + 1}.{item}</Text>
              </View>
            })
          }
        </View>
      </View>
    )
  }
}
``` 

## 实现添加事项

实现添加事项的功能需要引入 `Input` 组件来输入事项：输入时触发 `onInput` 事件，把输入的值保存在 `this.inputVal`；同时使用 `Text` 组件把「添加」按钮展示出来，点击时触发 `onClick` 事件。点击发生时检查 `this.inputVal` 是否为空，不为空则添加到事项列表里，即在 `list` 列表里添加事项且更新 `state`。具体的代码如下：

``` JavaScript
// 这里多引入了 Input 组件
import { View, Text, Input } from '@tarojs/components'

export default class Index extends Component {

  // ... 生命周期函数，暂时不需要关注
  // 添加按钮 onClick 时，添加事项，然后更新 list
  addItem () {
    let { list } = this.state
    const inputVal = this.inputVal
    // 如果输入框的值为空，则返回，否则添加到事项列表里
    if (inputVal == '') return
    else {
      list.push(inputVal)
    }
    this.setState({
      list,
      inputVal: ''
    })
  }

  // 输入框 onInput 的时候，它的值暂存起来
  inputHandler (e) {
    this.inputVal = e.target.value
  }

  render () {
    let { list, inputVal } = this.state

    return (
      <View className='index'>
        <Input className='input' type='text' value={inputVal} onInput={this.inputHandler.bind(this)} />
        <Text className='add' onClick={this.addItem.bind(this)}>添加</Text>
        <View className='list_wrap'>
          <Text>Todo list</Text>
          {
            list.map((item, index) => {
              return <View>
                <Text>{index + 1}.{item}</Text>
              </View>
            })
          }
        </View>
      </View>
    )
  }
}

```

## 实现删除事项

添加事项功能完成后，接下来开发删除功能：点击事项后的「删除」按钮删除对应的事项，即从事项列表中移除该事项。首先在展示事项的列表后添加「删除」按钮，并把该事项的索引传入点击事件里；发生点击时即可根据索引删除对应的事项。

``` JavaScript
export default class Index extends Component {
  config = {
    navigationBarTitleText: '首页'
  }

  // ... 其他代码已略
  // 根据索引删除事项，然后更新 list
  delItem (index) {
    let { list } = this.state
    list.splice(index, 1)
    this.setState({
      list
    })
  }

  render () {
    let { list, inputVal } = this.state

    return (
      <View className='index'>
        <Input className='input' type='text' value={inputVal} onInput={this.inputHandler.bind(this)} />
        <Text className='add' onClick={this.addItem.bind(this)}>添加</Text>
        <View className='list_wrap'>
          <Text>Todo list</Text>
          {
            list.map((item, index) => {
              return <View>
                <Text>{index + 1}.{item}</Text>
                <Text className='del' onClick={this.delItem.bind(this, index)}>删除</Text>
              </View>
            })
          }
        </View>
      </View>
    )
  }
}

```

## 补充样式

至此实现了一个简单的可添加可删除的 Todolist。由于使用的是 `taro build --type weapp --watch` 或 `taro build --type h5 --watch` 命令，编写代码的同时可以不停地查看编写效果。再补充一些样式，样式写在 `index` 页面下的样式文件里，即 `index.scss`。

``` CSS
.input {
    display: inline-block;
    margin: 20rpx;
    border: 1rpx solid #666;
    width: 500rpx;
    vertical-align: middle;
}
.list_wrap {
    padding: 50rpx 20rpx;
}
.list {
    margin: 20rpx 0;
}
.add,
.del {
    display: inline-block;
    width: 120rpx;
    height: 60rpx;
    margin: 0 10px;
    padding: 0 10rpx;
    color: #333;
    font-size: 22rpx;
    line-height: 60rpx;
    text-align: center;
    border-radius: 10rpx;
    border: 1rpx solid #C5D9E8;
    box-sizing: border-box;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    justify-content: center;
    vertical-align: middle;
}
.add {
    background-color: #5c89e4;
    color: #fff;
    border: 1PX solid #5c89e4;
}
.del {
    background-color: #fff;
    color: #5c89e4;
    border: 1PX solid #5c89e4;
    margin-left: 100rpx;
}
```

## 完整代码

为便于实践，这里把 `index.js` 全部代码展示一下：

``` JavaScript

import Taro, { Component } from '@tarojs/taro'
import { View, Text, Input } from '@tarojs/components'
import './index.scss'

export default class Index extends Component {
  config = {
    navigationBarTitleText: '首页'
  }

  constructor (props) {
    super (props)
    this.state = {
      // 创建一个初始的 Todolist
      list: [
        'get up',
        'coding',
        'sleep',
      ],
      inputVal: ''
    }
  }

  // ... 生命周期函数，暂时不需要关注

  addItem () {
    let { list } = this.state
    const inputVal = this.inputVal
    if (inputVal == '') return
    else{
      list.push(inputVal)
    }
    this.setState({
      list,
      inputVal: ''
    })
  }

  delItem (index) {
    let { list } = this.state
    list.splice(index, 1)
    this.setState({
      list
    })
  }

  inputHandler (e) {
    // 不参与渲染的变量可不使用 state 储存，提高性能
    this.inputVal = e.target.value
  }

  render () {
    let { list, inputVal } = this.state

    return (
      <View className='index'>
        <Input className='input' type='text' value={inputVal} onInput={this.inputHandler.bind(this)} />
        <Text className='add' onClick={this.addItem.bind(this)}>添加</Text>
        <View className='list_wrap'>
          <Text>Todo list</Text>
          {
            list.map((item, index) => {
              return <View className='list'>
                <Text>{index + 1}.{item}</Text>
                <Text className='del' onClick={this.delItem.bind(this, index)}>删除</Text>
              </View>
            })
          }
        </View>
      </View>
    )
  }
}
```

## 实践要点

- 不参与渲染的变量（如输入框的暂存值 `this.inputVal`）可以不放入 `state`，避免多余渲染，提高性能。
- 类组件中事件处理器通过 `this.addItem.bind(this)` 传递，需要传参时用 `bind(this, index)` 形式（如删除事项）。
- 样式使用小程序的 `rpx` 尺寸单位，适配多端机型。
- 构建命令加 `--watch` 可在编码过程中实时查看小程序或 H5 端的效果。

## 小结

本文介绍了使用 Taro 创建应用目录并快速开发的过程：`taro init` 生成项目骨架，`src` 目录承载全局配置（`app.js`/`app.scss`/`index.html`）与页面（`pages/index` 下的 JS 与 SCSS 文件）；页面组件基于 `Component` 类，通过 `state` 保存事项列表并用 `map` 渲染，通过 `Input` 的 `onInput` 与 `Text` 的 `onClick` 分别完成输入暂存与添加/删除逻辑，最后以 `rpx` 补充样式。从未使用过 React 的读者可以参考《React 核心语法初识》。如何用 Redux 管理应用数据将在后续章节讲解。
