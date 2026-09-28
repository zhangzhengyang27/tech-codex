---
title: "事件委托（Event Delegation）"
description: "利用 DOM 事件捕获→目标→冒泡的触发流程，在父元素上统一监听子元素事件，以事件委托替代逐项绑定，降低内存占用与绑定开销。"
keywords: [事件委托, 事件代理, Event Delegation]
category: JavaScript
tags: [JavaScript, DOM, 事件]
---

# 事件委托（Event Delegation）

> 注：本文件名为“15-代理Proxy”，但正文内容实为 DOM 事件委托/事件代理（疑为抓取时的错位文档），标题已按内容修正；Proxy 相关内容待补。

## 事件委托

下面的 `HTML` 代码是一个简单的无序列表，希望点击每个项目的时候调用 `getInfo()` 函数，当点击“编辑” 时，调用一个 `edit()` 函数，当点击 “删除” 时，调用一个 `del()` 函数

> 要实现这个功能并不难，只需要对列表中每一项，分别监听 3 个元素的 click 事件即可

```html
<ul class="list">
	<li id="item1" class="item">项目1<span class="edit">编辑</span><span class="delete">删除</span></li>
	<li id="item2" class="item">项目2<span class="edit">编辑</span><span class="delete">删除</span></li>
	<li id="item3" class="item">项目3<span class="edit">编辑</span><span class="delete">删除</span></li>
</ul>
```

但如果数据量一旦增大，事件绑定占用的内存以及执行时间将会成线性增加，而其实这些事件监听函数逻辑一致，只是参数不同而已。此时可以用 **事件代理** 或 **事件委托** 来进行优化。不过在此之前，我们必须先复习一下 DOM 事件的触发流程

事件触发流程主要分为 3 个阶段：

- 捕获：事件对象从 `Window` 传播到目标的父对象

- 目标：事件对象到达事件对象的事件目标

- 冒泡：事件对象从目标的父节点开始传播到 `Window`

事件代理的实现原理就是利用 `DOM` 事件的触发流程来对一类事件进行统一处理。比如对于上面的列表，在 `ul` 元素上绑定事件统一处理，通过得到的事件对象来获取参数，调用对应的函数

```javascript
const ul = document.querySelector('.list')
ul.addEventListener('click', e => {
  const t = e.target || e.srcElement
  if (t.classList.contains('item')) {
    getInfo(t.id)
  } else {
    const id = t.parentElement.id
    if (t.classList.contains('edit')) {
      edit(id)
    } else if (t.classList.contains('delete')) {
      del(id)
    }
  }
})
```

这里选择默认在冒泡阶段监听事件，但和捕获阶段监听并没有区别。对于其他情况还需要具体情况具体分析，比如有些列表项目需要在目标阶段进行一些预处理操作，那么可以选择冒泡阶段进行事件代理
